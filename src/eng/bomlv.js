/* Petardo Plaza — 20 retos de un jugador escritos a mano (plan Friv / docs/VARA.md).
 * Solo los usa el juego «petardo-plaza» FUERA del modo tele: en la tele manda el mando y el
 * equilibrio de la fiesta (rondas al último en pie) no se toca. Los demás modos de bomber.js
 * (hielo, pintura, parejas, fantasma, única) ni se enteran.
 *
 * CAMPOS de cada reto
 *   n    nombre del reto
 *   i    la idea NUEVA que estrena (se enseña antes de castigar)
 *   tip  consejo corto
 *   obj  'foes'   dejar fuera a todos los vecinos
 *        'crates' reventar todas las cajas de fiesta (o)
 *        'exit'   llegar a la puerta una vez abierta
 *   map  plaza de 15x11 dibujada a mano. Los bolardos fijos van en las filas pares.
 *        .  suelo            #  bolardo             x  caja de mercado
 *        V  barril de polvora (estalla en cruz de 3 y encadena)
 *        F  brasero (suelta fuego en cruz cada pocos segundos, avisa antes)
 *        o  caja de fiesta (objetivo de 'crates')
 *        K  llave            D  puerta de salida    P  placa    G  reja
 *        ~  hielo (el petardo que sueltas encima resbala hasta chocar)
 *        g  regalo (hace falta cogerlos TODOS para la 3.a estrella)
 *        r  +alcance   b  +petardo   s  +velocidad   k  patada
 *        @  tu sitio   1 vecino   2 artificiero   3 guardia   B  El Petardero
 *   sk   pericia de los vecinos, 0..1
 *   bc   segundos de ciclo de los braseros (por defecto 3.2)
 *   hp   chamuscones que aguantas en el reto (por defecto 3; facil +1, dificil -1)
 *   lim  segundos de limite (se acaba la verbena)
 *   t2   segundos para la 2.a estrella     t3  para la 3.a (ademas, todos los regalos)
 *
 * La dificultad (k.dif) mueve la pericia de los vecinos, el aviso del brasero y el margen de las
 * estrellas, nunca la plaza: facil x0,78 y +12 s / +8 s; dificil x1,16 y -6 s / -4 s.
 */
const BOMLV = [
  /* ---- 1-3: la escuela: la cruz del petardo, no encerrarse, las cajas ---- */
  { n: 'La primera mecha', i: 'El petardo estalla en CRUZ. Suelta y apártate por un lado.', tip: 'Nunca te quedes en la misma fila ni en la misma columna que tu petardo.', obj: 'foes', sk: 0.10, lim: 188, t2: 45, t3: 30, map: [
    '###############',
    '#@...x...x...1#',
    '#.#.#.#.#.#.#.#',
    '#..x.......x..#',
    '#.#.#.#.#.#.#.#',
    '#...x..g..x...#',
    '#.#.#.#.#.#.#.#',
    '#..x.......x..#',
    '#.#.#.#.#.#.#.#',
    '#r...x...x....#',
    '###############'] },
  { n: 'Dos vecinos', i: 'Ahora son dos y se mueven. Un petardo bien puesto puede pillar a los dos.', tip: 'Espera a que doblen una esquina: el pasillo no perdona.', obj: 'foes', sk: 0.14, lim: 200, t2: 55, t3: 38, map: [
    '###############',
    '#@..x.....x..1#',
    '#.#x#.#.#.#x#.#',
    '#...x..g..x...#',
    '#.#.#x#.#x#.#.#',
    '#b.....r.....s#',
    '#.#.#x#.#x#.#.#',
    '#...x.....x...#',
    '#.#x#.#.#.#x#.#',
    '#g..x.....x..1#',
    '###############'] },
  { n: 'Callejones', i: 'La plaza se llena de cajas: cada una que revientas te abre una salida.', tip: 'Ábrete camino ANTES de ir a por ellos, o te quedarás sin escapatoria.', obj: 'foes', sk: 0.18, lim: 212, t2: 62, t3: 44, map: [
    '###############',
    '#@x.xxx.xxx.x1#',
    '#.#x#.#x#.#x#.#',
    '#x..x..g..x..x#',
    '#x#.#x#.#x#.#x#',
    '#r.x.....x..b.#',
    '#x#.#x#.#x#.#x#',
    '#x..x..g..x..x#',
    '#.#x#.#x#.#x#.#',
    '#1x.xxx.xxx.x2#',
    '###############'] },
  /* ---- 4-6: barriles de polvora ---- */
  { n: 'Barriles', i: 'NUEVO: barriles de pólvora. El fuego los enciende y estallan en cruz de tres.', tip: 'Usa el barril como si fuera tu petardo: enciéndelo de lejos.', obj: 'foes', sk: 0.20, lim: 206, t2: 55, t3: 38, map: [
    '###############',
    '#@..x..V..x..1#',
    '#.#.#.#x#.#.#.#',
    '#..V..g.g..V..#',
    '#.#x#.#.#.#x#.#',
    '#r..x..V..x..b#',
    '#.#x#.#.#.#x#.#',
    '#..V.......V..#',
    '#.#.#.#x#.#.#.#',
    '#1..x..V..x...#',
    '###############'] },
  { n: 'Cadena de pólvora', i: 'Un barril enciende al de al lado: una chispa puede recorrer media plaza.', tip: 'Una cadena larga limpia el nivel… y también te pilla a ti si no corres.', obj: 'foes', sk: 0.24, lim: 206, t2: 52, t3: 36, map: [
    '###############',
    '#@..VVV...VVV.#',
    '#.#.#.#.#.#.#.#',
    '#..x..g.g..x.1#',
    '#.#V#.#.#.#V#.#',
    '#s..V..x..V..r#',
    '#.#V#.#.#.#V#.#',
    '#2.x.......x..#',
    '#.#.#.#.#.#.#.#',
    '#.VVV...VVV..1#',
    '###############'] },
  { n: 'Almacén', i: 'Barriles y cajas mezclados. Antes de tirar, mira qué hay detrás.', tip: 'El artificiero suelta dos petardos seguidos: no le sigas por el mismo pasillo.', obj: 'foes', sk: 0.27, lim: 219, t2: 65, t3: 46, map: [
    '###############',
    '#@xx.V.g.V.xx2#',
    '#.#x#.#x#.#x#.#',
    '#Vx..x...x..xV#',
    '#.#.#V#.#V#.#.#',
    '#..x..b.r..x..#',
    '#.#.#V#.#V#.#.#',
    '#Vx..x...x..xV#',
    '#.#x#.#x#.#x#.#',
    '#1xx.V.g.V.xx1#',
    '###############'] },
  /* ---- 7-9: braseros ---- */
  { n: 'Braseros', i: 'NUEVO: braseros. Cada pocos segundos escupen fuego en cruz; antes chisporrotean.', tip: 'El brasero avisa: cuenta su ritmo y pasa justo después de que suelte el fuego.', obj: 'foes', sk: 0.26, bc: 3.4, lim: 212, t2: 58, t3: 40, map: [
    '###############',
    '#@..x..F..x..1#',
    '#.#.#.#.#.#.#.#',
    '#..x..g.g..x..#',
    '#.#.#.#.#.#.#.#',
    '#F.....r.....F#',
    '#.#.#.#.#.#.#.#',
    '#..x.......x..#',
    '#.#.#.#.#.#.#.#',
    '#1..x..F..x..1#',
    '###############'] },
  { n: 'Callejón caliente', i: 'Brasero y barril en el mismo pasillo: el fuego enciende la pólvora solo.', tip: 'Deja que el brasero haga el trabajo sucio y tú quédate mirando de lejos.', obj: 'foes', sk: 0.30, bc: 3.1, lim: 212, t2: 58, t3: 40, map: [
    '###############',
    '#@x.F.V.V.F.x1#',
    '#.#x#.#.#.#x#.#',
    '#..x..g.g..x..#',
    '#.#V#.#F#.#V#.#',
    '#r.....x.....b#',
    '#.#V#.#F#.#V#.#',
    '#..x.......x..#',
    '#.#x#.#.#.#x#.#',
    '#2x.F.V.V.F.x1#',
    '###############'] },
  { n: 'Fuegos cruzados', i: 'Braseros a compás distinto. Ya no hay ritmo único que valga para todos.', tip: 'Cuando dudes, quédate en las filas de bolardos: ahí el fuego no llega lejos.', obj: 'foes', sk: 0.33, bc: 2.8, lim: 225, t2: 66, t3: 46, map: [
    '###############',
    '#@.F.x.g.x.F..#',
    '#.#.#x#.#x#.#.#',
    '#F..x..V..x..F#',
    '#.#.#.#.#.#.#.#',
    '#..x..s.r..x.3#',
    '#.#.#.#.#.#.#.#',
    '#F..x..V..x..F#',
    '#.#.#x#.#x#.#.#',
    '#1.F.x.g.x.F.2#',
    '###############'] },
  /* ---- 10-12: cajas de fiesta y la llave ---- */
  { n: 'Cajas de fiesta', i: 'NUEVO: hay que reventar TODAS las cajas de fiesta (las de farolillos).', tip: 'Ya no hace falta cazar a nadie: esquiva y ve a lo tuyo.', obj: 'crates', sk: 0.26, lim: 188, t2: 50, t3: 34, map: [
    '###############',
    '#@..o..x..o..1#',
    '#.#.#.#.#.#.#.#',
    '#..x..g.g..x..#',
    '#.#.#.#o#.#.#.#',
    '#o..x..r..x..o#',
    '#.#.#.#o#.#.#.#',
    '#..x.......x..#',
    '#.#.#.#.#.#.#.#',
    '#1..o..x..o...#',
    '###############'] },
  { n: 'Reparto exprés', i: 'Cajas de fiesta repartidas entre braseros y barriles, con reloj corto.', tip: 'Un barril bien encendido revienta dos cajas de fiesta de una vez.', obj: 'crates', sk: 0.30, bc: 3.0, lim: 162, t2: 52, t3: 36, map: [
    '###############',
    '#@o.F.o.o.F.o1#',
    '#.#x#.#.#.#x#.#',
    '#..V..g.g..V..#',
    '#.#.#.#F#.#.#.#',
    '#o.x..s.b..x.o#',
    '#.#.#.#F#.#.#.#',
    '#..V.......V..#',
    '#.#x#.#.#.#x#.#',
    '#2o.F.o.o.F.o1#',
    '###############'] },
  { n: 'Llave y puerta', i: 'NUEVO: coge la llave y escápate por la puerta. Ya no hay que limpiar la plaza.', tip: 'La llave está donde más duele: mira el camino de vuelta antes de ir a por ella.', obj: 'exit', sk: 0.32, bc: 3.0, lim: 175, t2: 48, t3: 32, map: [
    '###############',
    '#@x.x.F.x.x..D#',
    '#.#x#.#.#.#x#.#',
    '#..V..g.g..V..#',
    '#.#.#x#x#x#.#.#',
    '#1.x...K...x.2#',
    '#.#.#x#x#x#.#.#',
    '#..V..x.x..V..#',
    '#.#x#.#.#.#x#.#',
    '#r.x.x.F.x.x.b#',
    '###############'] },
  /* ---- 13-15: placas y rejas ---- */
  { n: 'Placas y rejas', i: 'NUEVO: pisa TODAS las placas y las rejas se levantan.', tip: 'Las placas se quedan pisadas: no hace falta volver a pasar por ellas.', obj: 'exit', sk: 0.34, bc: 3.0, lim: 188, t2: 52, t3: 36, map: [
    '###############',
    '#@..x.P.x..G.D#',
    '#.#.#.#.#.#G#.#',
    '#..V..g.g..G..#',
    '#.#.#x#x#x#.#.#',
    '#P.x.......x.P#',
    '#.#.#x#x#x#.#.#',
    '#1.V..x.x..V.2#',
    '#.#.#.#.#.#.#.#',
    '#r..x.F.x..x.b#',
    '###############'] },
  { n: 'Doble cerrojo', i: 'Las placas están detrás del fuego: cada una cuesta un susto.', tip: 'Deja para el final la placa que está más cerca de la puerta.', obj: 'exit', sk: 0.36, bc: 2.8, lim: 200, t2: 60, t3: 42, map: [
    '###############',
    '#@x.V.F.V.x.GD#',
    '#.#x#.#.#x#.#G#',
    '#P.x..g.g..x.P#',
    '#.#.#V#x#V#.#.#',
    '#..x...s...x..#',
    '#.#.#V#x#V#.#.#',
    '#3.x..g.g..x.P#',
    '#.#x#.#.#x#.#.#',
    '#P..V.F.V..x.2#',
    '###############'] },
  { n: 'Contrarreloj', i: 'Cajas de fiesta con el reloj apretado: aquí se viene corrido.', tip: 'Coge la velocidad del principio: sin ella no llegas.', obj: 'crates', sk: 0.36, bc: 2.8, lim: 144, t2: 48, t3: 34, map: [
    '###############',
    '#@s.o.V.o.V.o1#',
    '#.#.#x#.#x#.#.#',
    '#o.V..g.g..V.o#',
    '#.#.#.#F#.#.#.#',
    '#..x..o.o..x..#',
    '#.#.#.#F#.#.#.#',
    '#o.V..g.g..V.o#',
    '#.#.#x#.#x#.#.#',
    '#2o.V.o.V.o.s.#',
    '###############'] },
  /* ---- 16-19: hielo ---- */
  { n: 'Charco helado', i: 'NUEVO: hielo. El petardo que sueltas encima del hielo SALE RESBALANDO.', tip: 'Apunta con el rumbo: el petardo se va hacia donde estás mirando.', obj: 'foes', sk: 0.34, lim: 212, t2: 58, t3: 40, map: [
    '###############',
    '#@~~~~.g.~~~~1#',
    '#.#.#.#.#.#.#.#',
    '#~~~x..r..x~~~#',
    '#.#.#.#.#.#.#.#',
    '#..~..V.V..~..#',
    '#.#.#.#.#.#.#.#',
    '#~~~x..b..x~~~#',
    '#.#.#.#.#.#.#.#',
    '#1~~~~.g.~~~~2#',
    '###############'] },
  { n: 'Patinaje', i: 'Casi toda la plaza es hielo: cada petardo viaja hasta chocar.', tip: 'Un petardo lanzado por un pasillo largo llega antes que tú.', obj: 'foes', sk: 0.38, lim: 219, t2: 62, t3: 44, map: [
    '###############',
    '#@~~~~~g~~~~~1#',
    '#.#~#.#~#.#~#.#',
    '#~~~V~~.~~V~~~#',
    '#~#.#~#.#~#.#~#',
    '#~~x~~s.r~~x~~#',
    '#~#.#~#.#~#.#~#',
    '#~~~V~~.~~V~~~#',
    '#.#~#.#~#.#~#.#',
    '#2~~~~~g~~~~~1#',
    '###############'] },
  { n: 'Verbena helada', i: 'Hielo, braseros y guardias: los guardias no tiran, pero no paran de correr.', tip: 'Al guardia se le caza con un petardo deslizado: no se lo espera.', obj: 'foes', sk: 0.40, bc: 2.8, lim: 225, t2: 70, t3: 50, map: [
    '###############',
    '#@~~~F.g.F~~~3#',
    '#.#~#.#.#.#~#.#',
    '#~~~x..V..x~~~#',
    '#.#.#~#.#~#.#.#',
    '#F.~..s.r..~.F#',
    '#.#.#~#.#~#.#.#',
    '#~~~x..V..x~~~#',
    '#.#~#.#.#.#~#.#',
    '#3~~~F.g.F~~~2#',
    '###############'] },
  { n: 'Última vuelta', i: 'Todo junto menos el jefe: llave, puerta, hielo, braseros y barriles.', tip: 'No hay prisa por la puerta: primero despeja el camino de vuelta.', obj: 'exit', sk: 0.42, bc: 2.7, lim: 238, t2: 72, t3: 52, map: [
    '###############',
    '#@x.V.F.V.x.GD#',
    '#.#x#~#~#x#.#G#',
    '#P~~x..g..x~~P#',
    '#.#.#V#K#V#.#.#',
    '#..x..~.~..x..#',
    '#.#.#V#g#V#.#.#',
    '#3~~x..s..x~~2#',
    '#.#x#~#~#x#.#.#',
    '#1x.V.F.V.x.r.#',
    '###############'] },
  /* ---- 20: la final ---- */
  { n: 'El Petardero', i: 'LA FINAL: El Petardero aguanta cuatro petardazos, tira lejos y llama a los suyos.', tip: 'Acorrálalo contra los bolardos: en campo abierto siempre te gana la carrera.', obj: 'foes', sk: 0.48, bc: 2.6, lim: 262, t2: 95, t3: 70, map: [
    '###############',
    '#@x.V.F.F.V.x1#',
    '#.#x#~#.#~#x#.#',
    '#P~~x..g..x~~P#',
    '#.#.#V#B#V#.#.#',
    '#..x..~.~..x..#',
    '#.#.#V#.#V#.#.#',
    '#1~~x..g..x~~2#',
    '#.#x#~#.#~#x#.#',
    '#r..V.F.F.V..s#',
    '###############'] },
];
if (typeof module !== 'undefined' && module.exports) module.exports = BOMLV;
