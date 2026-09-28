/* Salas a mano de dungeon-micro (plan Friv, F3). Nada de azar: lo escrito es lo que se juega.
 *
 * Cada sala es una rejilla de 19 × 7 casillas de 32 px que cubre la pista entera. El héroe entra
 * siempre por la izquierda (fila 3) y la puerta está a la derecha, en el centro: la última columna
 * de las filas 2, 3 y 4 se deja libre para poder salir.
 *
 *   .  suelo libre                     #  muro de piedra (no se rompe)
 *   x  caja rompible (4 impactos)      T  torreta de piedra que dispara en cruz (nueva en la 11)
 *   ^  losa de pinchos que sube y baja (nueva en la 5)
 *   ~  brasas: queman mientras estés encima (nuevas en la 15)
 *   b  murciélago (rápido, va a por ti)     o  ojo volador (dispara de lejos)
 *   e  esqueleto (persigue)                 f  fantasma (atraviesa los muros)
 *   s  slime (al morir se parte en dos)     B  bruto (mucha vida, golpe doble)
 *   J  jefe, con barra de vida (salas 10 y 20)
 *   c  moneda en el suelo               h  corazón en el suelo
 *
 *   m2  segunda oleada: solo letras de enemigo; entra al despejar la primera.
 *   tip texto que se enseña al empezar la sala (lo nuevo se explica antes de exigirlo).
 *
 * Los muros se escriben como rectángulos (el motor funde las casillas contiguas en un bloque).
 */
const DUNLV = {
  /* Mejoras que ya lleva puestas quien entra directo a una sala desde el menú de niveles: las
   * (n−1) primeras de esta lista. Quien encadena salas elige las suyas al salir de cada una. */
  eq: ['dmg', 'rate', 'hp', 'speed', 'dmg', 'multi', 'rate', 'hp', 'dmg', 'pierce',
       'rate', 'speed', 'dmg', 'hp', 'multi', 'rate', 'dmg', 'pierce', 'hp'],

  'dungeon-micro': [
    /* --- 1. Moverse y disparar. Dos murciélagos lentos, nada más. --- */
    { tip: 'muévete y dispara solo', m: [
      '...................',
      '......c.....c......',
      '...................',
      '.....b.......b.....',
      '...................',
      '......c.....c......',
      '...................'] },

    /* --- 2. Los muros tapan los disparos: hay que salir a campo abierto. --- */
    { tip: 'los muros paran tus balas', m: [
      '...................',
      '....##.......##....',
      '....##.......##....',
      '...b.....b......b..',
      '....##.......##....',
      '....##.......##....',
      '.........c.........'] },

    /* --- 3. Cajas rompibles y el primer ojo, que dispara de lejos. --- */
    { tip: 'rompe las cajas, esquiva al ojo', m: [
      '...................',
      '.......x...x.......',
      '....b.........o....',
      '.........c.........',
      '....o.........b....',
      '.......x...x.......',
      '...................'] },

    /* --- 4. Pasillos: rodear para llegar. --- */
    { tip: 'rodea los pasillos', m: [
      '...................',
      '..#########....o...',
      '...................',
      '......b.....b......',
      '...................',
      '..#########....c...',
      '...................'] },

    /* --- 5. NUEVO: losas de pinchos, suben y bajan. --- */
    { tip: 'los pinchos suben y bajan', m: [
      '...................',
      '....##.......##....',
      '.......^...^.......',
      '...b.....o.....b...',
      '.......^...^.......',
      '....##.......##....',
      '.....c.......h.....'] },

    /* --- 6. Esqueletos: más vida, te siguen sin descanso. --- */
    { tip: 'los esqueletos no se rinden', m: [
      '...................',
      '..^.....c.....^....',
      '....###...###......',
      '...e.....e.....e...',
      '....###...###......',
      '..^...........^....',
      '.........c.........'] },

    /* --- 7. Fantasmas: los muros no les frenan. --- */
    { tip: 'los fantasmas cruzan los muros', m: [
      '.......###.........',
      '.......###.........',
      '...f.......c.......',
      '.......###.........',
      '...e.......f.......',
      '.......###.........',
      '.....c.......h.....'] },

    /* --- 8. Slimes: al morir se parten en dos. --- */
    { tip: 'los slimes se parten al morir', m: [
      '...................',
      '....x.........x....',
      '.......s...s.......',
      '.........c.........',
      '.........s.........',
      '....x.........x....',
      '...................'] },

    /* --- 9. Bruto: aguanta mucho y pega doble. --- */
    { tip: 'el bruto pega doble: no lo toques', m: [
      '..##...........##..',
      '..##.....c.....##..',
      '.....e.......o.....',
      '.........B.........',
      '.....b.......e.....',
      '..##...........##..',
      '..##.....h.....##..'] },

    /* --- 10. JEFE: el Ojo Guardián. Ráfagas en abanico y en círculo. --- */
    { tip: '¡el Ojo Guardián!', boss: 'eye', m: [
      '...................',
      '..^.............^..',
      '.........J.........',
      '...................',
      '...h...........h...',
      '..^.............^..',
      '.........c.........'] },

    /* --- 11. NUEVO: torretas de piedra, disparan en cruz cada pocos segundos. --- */
    { tip: 'las torretas disparan en cruz', m: [
      '...................',
      '....T.........T....',
      '.........c.........',
      '...b.....b.....b...',
      '.........c.........',
      '....T.........T....',
      '...................'] },

    /* --- 12. Torretas encajonadas entre muros. --- */
    { tip: 'usa los muros contra las torretas', m: [
      '...................',
      '..####...T...####..',
      '.....e.......e.....',
      '.........c.........',
      '.....o.......o.....',
      '..####...T...####..',
      '...........h.......'] },

    /* --- 13. Bosque de columnas con fantasmas dentro. --- */
    { tip: 'nadie está a salvo tras una columna', m: [
      '....#....#....#....',
      '....#....#....#....',
      '.....f...e....f....',
      '.........c.........',
      '.....e...o....e....',
      '....#....#....#....',
      '.c...........c.....'] },

    /* --- 14. Dos oleadas: limpia y prepárate, llegan más. --- */
    { tip: 'aguanta: vienen en dos oleadas', m: [
      '...................',
      '..x.....s.....x....',
      '...................',
      '....B.......B......',
      '.........c.........',
      '..x.....s.....x....',
      '...................'],
      m2: [
      '...................',
      '...................',
      '....b.......b......',
      '...................',
      '....o.......o......',
      '...................',
      '...................'] },

    /* --- 15. NUEVO: brasas, queman mientras estés encima. --- */
    { tip: 'las brasas queman: no te pares', m: [
      '...................',
      '..~~~.......~~~....',
      '.....o.....o.......',
      '.........c.........',
      '.....e.....e.......',
      '..~~~.......~~~....',
      '.........h.........'] },

    /* --- 16. Brasas y torretas a la vez. --- */
    { tip: 'brasas y torretas juntas', m: [
      '...................',
      '....T...~~~........',
      '.....b.......b.....',
      '...~~~.....~~~.....',
      '.....e.......e.....',
      '....T...~~~........',
      '.........c.........'] },

    /* --- 17. Pinchos, fantasmas y un bruto; luego, refuerzos. --- */
    { tip: 'pisa donde los pinchos ya bajaron', m: [
      '........c.c........',
      '..^..##.....##..^..',
      '....f.........f....',
      '.........B.........',
      '....e.........o....',
      '..^..##.....##..^..',
      '.........h.........'],
      m2: [
      '...................',
      '...................',
      '.....f.......f.....',
      '...................',
      '.....e.......e.....',
      '...................',
      '...................'] },

    /* --- 18. Sala de slimes: todo se multiplica. --- */
    { tip: 'no dejes que te rodeen', m: [
      '..~~~.........~~~..',
      '....s.......s......',
      '.......x...x.......',
      '.........c.........',
      '.......x...x.......',
      '....s.......s......',
      '..~~~....h....~~~..'] },

    /* --- 19. Antesala: todo lo aprendido, en dos oleadas. --- */
    { tip: 'la antesala del jefe', m: [
      '...................',
      '..T..##..^..##..T..',
      '....e.........e....',
      '...~~~...c...~~~...',
      '....o.........o....',
      '..^..##.....##..^..',
      '.........h.........'],
      m2: [
      '...................',
      '...................',
      '....B.......f......',
      '...................',
      '....f.......B......',
      '...................',
      '...................'] },

    /* --- 20. JEFE FINAL: el Corazón del Prisma, tres fases y barra de vida. --- */
    { tip: '¡el Corazón del Prisma!', boss: 'eye', fin: true, m: [
      '..~~~.........~~~..',
      '...................',
      '.........J.........',
      '...................',
      '...h...........h...',
      '...................',
      '..~~~....c....~~~..'] },
  ],
};
