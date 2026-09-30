/* Salas a mano de dungeon-micro (plan Friv, tanda 7). Nada de azar: lo escrito es lo que se juega.
 *
 * Cada sala es una rejilla de 19 × 7 casillas de 32 px que cubre la pista entera. El héroe entra
 * siempre por la izquierda (fila 3) y la puerta está a la derecha, en el centro: la última columna
 * de las filas 2, 3 y 4 se deja libre para poder salir.
 *
 *   .  suelo libre                     #  muro de piedra (no se rompe)
 *   x  caja rompible (4 impactos)      T  torreta de piedra que dispara en cruz (nueva en la 11)
 *   ^  losa de pinchos que sube y baja (nueva en la 5)
 *   ~  brasas: queman mientras estés encima (nuevas en la 13)
 *   $  cofre de 3 impactos: suelta dos monedas y una gema (nuevo en la 2)
 *   *  gema suelta (cuenta para el botín completo, 3ª estrella)
 *   _  placa de presión    |  reja: se abre mientras alguien pisa la placa (nuevas en la 4)
 *   >  sierra que recorre su FILA de pared a pared (nueva en la 6)
 *   v  sierra que recorre su COLUMNA (nueva en la 12)
 *   A  generador: suelta murciélagos hasta que lo rompes (6 impactos); la sala no se
 *      despeja mientras quede uno en pie (nuevo en la 8)
 *   b  murciélago (rápido, va a por ti)     o  ojo volador (dispara de lejos)
 *   e  esqueleto (persigue)                 f  fantasma (atraviesa los muros)
 *   s  slime (al morir se parte en dos)     B  bruto (mucha vida, golpe doble)
 *   J  jefe, con barra de vida (salas 10 y 20)
 *   c  moneda en el suelo               h  corazón en el suelo
 *
 *   m2   segunda oleada: solo letras de enemigo; entra al despejar la primera.
 *   tip  texto que se enseña al empezar la sala (lo nuevo se explica antes de exigirlo).
 *   tg   [fácil, normal, difícil] segundos para la 2ª estrella. SOLO en las salas cuyo tiempo
 *        está medido con bot (1-4). Sin tg, la 2ª estrella es «salir con 2/1/0 golpes o menos»
 *        según dificultad; se pondrá el reloj en cuanto se midan las salas 5-20.
 *   vig  segundos hasta que despierta EL VIGÍA: un espectro invulnerable y lento que cruza
 *        los muros y te empuja a acabar. Avisa 3 s antes. Desde la sala 11 (último tercio).
 *
 * ESTRELLAS (docs/VARA.md §5): ★ terminar · ★★ el objetivo de la sala (tiempo de tg, o golpes
 * recibidos si aún no hay tg) · ★★★ ese objetivo y además TODO el botín (monedas, gemas y
 * cofres). Se guardan por dificultad (kit.js).
 * Desde la sala 11 hay punto de control: la primera caída te levanta con 3 de vida.
 *
 * Los muros se escriben como rectángulos (el motor funde las casillas contiguas en un bloque).
 */
const DUNLV = {
  /* --- Formaciones de oleada escritas a mano (7 × 19). La 'X' es una plaza de enemigo y el
   * tipo se elige en cada sala: 'pinza:b' pone murciélagos en pinza, 'cruz:e' esqueletos en
   * cruz. Así cada oleada tiene una forma reconocible sin repetir rejillas enteras. --- */
  F: {
    fila:    ['...................', '...................', '...................', '..X..X..X..X..X..X.', '...................', '...................', '...................'],
    esquinas:['..X..X.......X..X..', '...................', '...................', '...................', '...................', '...................', '..X..X.......X..X..'],
    pinza:   ['...................', '...................', '.X.X...........X.X.', '...................', '.X.X...........X.X.', '...................', '...................'],
    centro:  ['...................', '...................', '.......X.X.X.......', '.......X...X.......', '.......X.X.X.......', '...................', '...................'],
    flancos: ['...................', '..X.............X..', '..X.............X..', '..X.............X..', '..X.............X..', '..X.............X..', '...................'],
    lluvia:  ['..X...X...X...X...X', '....X...X...X...X..', '...................', '...................', '...................', '....X...X...X...X..', '..X...X...X...X...X'],
    cruz:    ['...................', '...X...........X...', '....X.........X....', '.........X.........', '....X.........X....', '...X...........X...', '...................'],
    muro:    ['...................', '...............X.X.', '...............X.X.', '...............X.X.', '...............X.X.', '...............X.X.', '...................'],
    cuatro:  ['...................', '.....X.......X.....', '...................', '...................', '...................', '.....X.......X.....', '...................'],
    dos:     ['...................', '...................', '...................', '......X.....X......', '...................', '...................', '...................'],
    jefe:    ['...................', '...................', '...................', '.........X.........', '...................', '...................', '...................'],
  },
  /* 'formación:tipo' → rejilla de esa oleada. */
  wave(sp) { const [f, ch] = String(sp).split(':'); const g = this.F[f]; return g ? g.map((r) => r.split('X').join(ch || 'b')) : null; },
  /* Mejoras que ya lleva puestas quien entra directo a una sala desde el menú de niveles: las
   * (n−1) primeras de esta lista. Quien encadena salas elige las suyas al salir de cada una. */
  eq: ['dmg', 'rate', 'hp', 'speed', 'dmg', 'multi', 'rate', 'hp', 'dmg', 'pierce',
       'rate', 'speed', 'dmg', 'hp', 'multi', 'rate', 'dmg', 'pierce', 'hp'],

  'dungeon-micro': [
    /* --- 1. Moverse y disparar. Murciélagos lentos y monedas en las esquinas. --- */
    { tip: 'te disparas solo al más cercano', tg: [58, 50, 45], w: ['fila:b','esquinas:b','centro:b','lluvia:b'], m: [
      '..c.............c..',
      '...................',
      '.....b.......b.....',
      '...................',
      '.....b.......b.....',
      '...................',
      '..c.............c..'],
      m2: [
      '...................',
      '.......b...b.......',
      '...................',
      '.........b.........',
      '...................',
      '.......b...b.......',
      '...................'] },

    /* --- 2. NUEVO: el cofre. Tres impactos y suelta dos monedas y una gema. --- */
    { tip: 'rompe el cofre: guarda un tesoro', tg: [66, 57, 51], w: ['pinza:b','cuatro:o','fila:b','flancos:b','centro:b'], m: [
      '.##.............##.',
      '.#$.............$#.',
      '...................',
      '.....b.......b.....',
      '...................',
      '.#c.............c#.',
      '.##.............##.'],
      m2: [
      '...................',
      '....b.........b....',
      '...................',
      '.......b...b.......',
      '...................',
      '....b.........b....',
      '...................'] },

    /* --- 3. Las cajas tapan los disparos; el ojo dispara de lejos. --- */
    { tip: 'las cajas paran tus balas', tg: [64, 56, 50], w: ['muro:o','fila:b','cruz:e','esquinas:b'], m: [
      '...................',
      '....xx.......xx....',
      '....x*.......*x....',
      '...b.....o.....b...',
      '....x............c.',
      '....xx.......xx....',
      '..c................'],
      m2: [
      '...................',
      '.....o.......o.....',
      '...................',
      '....b.........b....',
      '...................',
      '.......b...b.......',
      '...................'] },

    /* --- 4. NUEVO: placa y reja. La gema está encerrada: písala y corre. --- */
    { tip: 'pisa la placa y corre a la reja', tg: [54, 47, 42], w: ['flancos:b','centro:e','fila:o','pinza:b'], m: [
      '.####........####..',
      '.#**#........#**#..',
      '.#||#........#||#..',
      '...................',
      '.....e.......e.....',
      '......_....._......',
      '..c.............c..'],
      m2: [
      '...................',
      '....b.........b....',
      '...................',
      '.......e...e.......',
      '...................',
      '....b.........b....',
      '...................'] },

    /* --- 5. NUEVO: losas de pinchos, suben y bajan por turnos. --- */
    { tip: 'los pinchos suben y bajan', w: ['esquinas:e','fila:b','cruz:b','centro:o'], m: [
      '..c.............c..',
      '....##.......##....',
      '.......^...^.......',
      '...b.....o.....b...',
      '.......^...^.......',
      '....##.......##....',
      '.....h.......$.....'],
      m2: [
      '...................',
      '.....o.......o.....',
      '...................',
      '....e.........e....',
      '...................',
      '.......b...b.......',
      '...................'] },

    /* --- 6. NUEVO: la sierra recorre su fila de pared a pared. --- */
    { tip: 'la sierra recorre el pasillo', w: ['pinza:e','muro:b','fila:s','lluvia:b'], m: [
      '.##.............##.',
      '.#c.............c#.',
      '..>..............>.',
      '...e.....o.....e...',
      '...................',
      '.##....*....*...##.',
      '.#$.............$#.'],
      m2: [
      '...................',
      '....b.........b....',
      '...................',
      '.......e...e.......',
      '...................',
      '....b.........b....',
      '...................'] },

    /* --- 7. Fantasmas: los muros no les frenan. --- */
    { tip: 'los fantasmas cruzan los muros', w: ['centro:f','fila:e','esquinas:f','cruz:b'], m: [
      '.......###.........',
      '..c....###....c....',
      '...f.......*.......',
      '.......###.........',
      '...e.......f.......',
      '.......###....$....',
      '.....c.......h.....'],
      m2: [
      '...................',
      '.....f.......f.....',
      '...................',
      '.......o...o.......',
      '...................',
      '.....e.......e.....',
      '...................'] },

    /* --- 8. NUEVO: el generador. No paran de salir hasta que lo rompes. --- */
    { tip: 'rompe el generador o no paran', w: ['fila:b','pinza:o','cruz:e','centro:b'], m: [
      '...................',
      '....##.......##....',
      '....#A.......A#....',
      '...b.....e.....b...',
      '....#c.......c#....',
      '....##.......##....',
      '.....*.......*.....'],
      m2: [
      '...................',
      '.....e.......e.....',
      '...................',
      '.......b...b.......',
      '...................',
      '.....e.......e.....',
      '...................'] },

    /* --- 9. Slimes y el bruto: aguantan mucho y el bruto pega doble. --- */
    { tip: 'el bruto pega doble: no lo toques', w: ['cuatro:B','fila:s','pinza:e','esquinas:s'], m: [
      '..##...........##..',
      '..#$.....c.....$#..',
      '.....s.......s.....',
      '.........B.........',
      '.....s.......s.....',
      '..#*...........*#..',
      '..##.....h.....##..'],
      m2: [
      '...................',
      '....s.........s....',
      '...................',
      '.......e...e.......',
      '...................',
      '....b.........b....',
      '...................'] },

    /* --- 10. JEFE: el Ojo Guardián. Ráfagas en abanico y en círculo. --- */
    { tip: '¡el Ojo Guardián!', boss: 'eye', w: ['fila:b','pinza:o','cuatro:e','jefe:J'], m: [
      '..c.............c..',
      '..^.............^..',
      '...................',
      '...................',
      '...h...........h...',
      '..^.............^..',
      '..*......c......*..'],
      m2: [
      '...................',
      '.....b.......b.....',
      '...................',
      '...................',
      '...................',
      '.....b.......b.....',
      '...................'] },

    /* --- 11. NUEVO: torretas en cruz. Y despierta EL VIGÍA: no te entretengas. --- */
    { tip: 'torretas en cruz; el Vigía viene', w: ['cruz:e','fila:o','flancos:b','centro:e'], vig: 58, m: [
      '..c.............c..',
      '....T.........T....',
      '.........*.........',
      '...b.....e.....b...',
      '.........c.........',
      '....T.........T....',
      '..$.............$..'],
      m2: [
      '...................',
      '.....o.......o.....',
      '...................',
      '.......e...e.......',
      '...................',
      '.....o.......o.....',
      '...................'] },

    /* --- 12. NUEVO: sierras verticales, entre torretas. --- */
    { tip: 'esta sierra sube y baja', w: ['pinza:s','fila:e','muro:o','esquinas:b'], vig: 60, m: [
      '.....v.......v.....',
      '..####...T...####..',
      '..#c.........c#....',
      '...e.....o.....e...',
      '..#*.........*#....',
      '..####...T...####..',
      '.....h.......$.....'],
      m2: [
      '...................',
      '.....e.......e.....',
      '...................',
      '.......f...f.......',
      '...................',
      '.....e.......e.....',
      '...................'] },

    /* --- 13. NUEVO: brasas. Queman mientras estés encima. --- */
    { tip: 'las brasas queman: no te pares', w: ['centro:f','cruz:s','fila:e','lluvia:b'], vig: 60, m: [
      '..c.............c..',
      '..~~~.......~~~....',
      '.....o.....o.......',
      '.........*.........',
      '.....e.....e.......',
      '..~~~.......~~~....',
      '..$......h......$..'],
      m2: [
      '...................',
      '.....b.......b.....',
      '...................',
      '.......b...b.......',
      '...................',
      '.....e.......e.....',
      '...................'] },

    /* --- 14. Generador, sierra y dos oleadas juntas. --- */
    { tip: 'primero el generador, luego el resto', w: ['fila:o','pinza:e','cuatro:B','centro:s'], vig: 64, m: [
      '..##...........##..',
      '..#A.....c.....A#..',
      '..#*...........*#..',
      '..>..............>.',
      '.....s.......s.....',
      '..##.....c.....##..',
      '..$.............$..'],
      m2: [
      '...................',
      '....e.........e....',
      '...................',
      '.......B...........',
      '...................',
      '....e.........e....',
      '...................'] },

    /* --- 15. Placa, reja y brasas: el botín cuesta caro. --- */
    { tip: 'la placa abre las dos rejas', w: ['esquinas:f','fila:s','cruz:e','muro:o'], vig: 62, m: [
      '.####........####..',
      '.#*$#..~~~...#$*#..',
      '.#||#........#||#..',
      '.....f.......f.....',
      '.......~~~.........',
      '......_....._......',
      '..c......o......c..'],
      m2: [
      '...................',
      '.....f.......f.....',
      '...................',
      '.......B...........',
      '...................',
      '.....e.......e.....',
      '...................'] },

    /* --- 16. Torretas, brasas y sierra en la misma sala. --- */
    { tip: 'brasas, torretas y sierra', w: ['pinza:e','centro:o','fila:s','cruz:f'], vig: 60, m: [
      '..c.............c..',
      '....T...~~~...T....',
      '..>..............>.',
      '...b.....e.....b...',
      '...~~~.......~~~...',
      '....T....*....T....',
      '..$......h......$..'],
      m2: [
      '...................',
      '.....e.......e.....',
      '...................',
      '.......o...o.......',
      '...................',
      '.....e.......e.....',
      '...................'] },

    /* --- 17. Dos generadores, fantasmas y un bruto. --- */
    { tip: 'dos generadores: reparte los tiros', w: ['fila:e','cuatro:B','pinza:s','centro:f'], vig: 62, m: [
      '..^..###.....###..^',
      '.....#A.......A#...',
      '....f.....*.....f..',
      '.........B.........',
      '....c...........c..',
      '..^..###.....###..^',
      '..$......h......$..'],
      m2: [
      '...................',
      '.....f.......f.....',
      '...................',
      '.......e...e.......',
      '...................',
      '.....f.......f.....',
      '...................'] },

    /* --- 18. Sala de slimes: todo se multiplica y la sierra no perdona. --- */
    { tip: 'no dejes que te rodeen', w: ['cruz:s','fila:s','esquinas:e','pinza:s'], vig: 60, m: [
      '..~~~.........~~~..',
      '....s.......s......',
      '..>....x...x.....>.',
      '.........*.........',
      '.......x...x.......',
      '....s.......s......',
      '..~~~..$..h..$..~~~'],
      m2: [
      '...................',
      '.....s.......s.....',
      '...................',
      '.......B...........',
      '...................',
      '.....e.......e.....',
      '...................'] },

    /* --- 19. Antesala del jefe: todo lo aprendido, en dos oleadas. --- */
    { tip: 'la antesala del jefe', w: ['muro:o','pinza:B','cruz:e','centro:f','fila:s'], vig: 58, m: [
      '..v..###..^..###..v',
      '..T..#A.....A#..T..',
      '....e....*....e....',
      '...~~~...c...~~~...',
      '....o..........o...',
      '..^..###....###..^.',
      '..$......h......$..'],
      m2: [
      '...................',
      '....B.........f....',
      '...................',
      '.......f...f.......',
      '...................',
      '....f.........B....',
      '...................'] },

    /* --- 20. JEFE FINAL: el Corazón del Prisma, tres fases y barra de vida. --- */
    { tip: '¡el Corazón del Prisma!', boss: 'eye', fin: true, w: ['fila:s','cruz:e','pinza:o','cuatro:B','jefe:J'], m: [
      '..~~~.........~~~..',
      '....T.........T....',
      '...................',
      '...................',
      '...h...........h...',
      '....T....c....T....',
      '..~~~..*..h..*..~~~'],
      m2: [
      '...................',
      '.....b.......b.....',
      '...................',
      '.......e...e.......',
      '...................',
      '.....b.......b.....',
      '...................'] },
  ],
};
