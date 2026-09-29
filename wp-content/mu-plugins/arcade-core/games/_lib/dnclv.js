/* Coreografías escritas a mano de Flechas de Baile (plan Friv · la vara).
 * 20 canciones con su tempo, su música y su paso a paso. Ninguna se genera al azar.
 * Solo se usan en el juego de un jugador: en el modo tele (k.party) manda la tele y el
 * motor sigue con la coreografía procedimental de siempre.
 *
 * ---- CÓMO SE ESCRIBE UN COMPÁS -------------------------------------------------------
 * Cada cadena es un compás de 4/4. Cada carácter es un paso; `d` dice cuántos tiempos
 * dura un paso (0.5 = corchea → 8 caracteres por compás; 0.25 = semicorchea → 16).
 *
 *   -   nada
 *   l d u r   flecha suelta  (izquierda, abajo, arriba, derecha)
 *   L D U R   cabeza de flecha LARGA: hay que mantenerla
 *   >         alarga la última larga un paso más
 *   j  ←+→    k  ↓+↑    q  ←+↓    w  ←+↑    e  ↓+→    t  ↑+→     (dobles: dos a la vez)
 *
 * ---- SECCIONES -----------------------------------------------------------------------
 *   b      pulsaciones por minuto de la sección (si falta, las de la canción)
 *   d      tiempos por paso (0.5 por defecto)
 *   x      veces que se repite la sección
 *   blind  1 = tramo A CIEGAS: las flechas se desvanecen antes de llegar al hueco
 *
 * ---- CANCIÓN -------------------------------------------------------------------------
 *   name tip   rótulo y la idea nueva que enseña el nivel
 *   bpm        tempo base            root/prog/mel   la música (bajo y melodía, en semitonos)
 *   a2         precisión mínima para la 2.ª estrella en [fácil, normal, difícil]. Una pasada
 *              entera acertando sin PERFECTOS (todo GENIAL) vale 70 %: los 20 niveles dan la
 *              2.ª estrella con margen a quien llega a tiempo, aunque no afine al milisegundo.
 *              3 estrellas = esa misma precisión SIN ningún fallo (ni flecha perdida ni larga soltada)
 *
 * Verbos nuevos, de uno en uno: 1-2 pisadas · 3 largas · 5 dobles · 7 cambios de tempo ·
 * 9 ráfagas de semicorcheas · 11 tramos a ciegas. Del 12 al 20 se combinan de dos en dos
 * y de tres en tres, y el 20 los usa todos y remata.
 */
const DNCLV = {
  'flechas-de-baile': [
    { /*  1 */ name: 'Primeros pasos', tip: 'Pulsa la flecha justo cuando llega a su hueco.', bpm: 92,
      root: 55, prog: [0, 0, 5, 5, 7, 7, 5, 3], mel: [12, -9, 15, -9, 17, -9, 15, -9, 12, -9, 10, -9, 12, -9, -9, -9], a2: [68, 66, 64],
      sec: [
        { x: 2, s: ['l-l-r-r-', 'u-u-d-d-', 'l-r-l-r-', 'u-d-u-d-'] },
        { x: 2, s: ['l-u-r-d-', 'l-l-u-u-', 'r-r-d-d-', 'l-u-r-d-'] },
        { x: 1, s: ['l-r-u-d-', 'l-l-r-r-', 'u-u-d-d-', 'l---r---'] }] },

    { /*  2 */ name: 'Ocho por ocho', tip: 'Ahora caben dos flechas por tiempo: escucha el charles.', bpm: 96,
      root: 58, prog: [0, 0, 3, 3, 5, 5, 3, -2], mel: [12, 14, 15, -9, 17, -9, 15, 14, 12, -9, 10, 12, 14, -9, -9, -9], a2: [67, 65, 63],
      sec: [
        { x: 2, s: ['l-l-r-r-', 'ludr----', 'u-u-d-d-', 'rdul----'] },
        { x: 2, s: ['llrr----', 'uudd----', 'l-r-u-d-', 'ludrludr'] },
        { x: 1, s: ['l-l-r-r-', 'ludrludr', 'u-u-d-d-', 'l---r---'] }] },

    { /*  3 */ name: 'Aguanta', tip: 'Las flechas largas hay que mantenerlas hasta el final de la cola.', bpm: 96,
      root: 55, prog: [0, 0, 7, 7, 5, 5, 3, 0], mel: [12, -9, -9, -9, 15, -9, -9, -9, 17, -9, 15, -9, 12, -9, -9, -9], a2: [66, 65, 63],
      sec: [
        { x: 2, s: ['L>>>----', 'R>>>----', 'U>>>u-u-', 'D>>>d-d-'] },
        { x: 2, s: ['l-l-L>>>', 'r-r-R>>>', 'U>>>>>>>', 'd-d-D>>>'] },
        { x: 1, s: ['L>>>R>>>', 'U>>>D>>>', 'l-r-u-d-', 'L>>>>>>>'] }] },

    { /*  4 */ name: 'Cuerdas y pasos', tip: 'Suelta la larga y sigue: las corcheas no esperan.', bpm: 104,
      root: 62, prog: [0, 0, -2, -2, 3, 3, 5, 3], mel: [12, 15, 17, -9, 19, 17, 15, -9, 12, 15, 17, 19, 17, -9, -9, -9], a2: [66, 64, 62],
      sec: [
        { x: 2, s: ['L>>>ludr', 'R>>>rdul', 'u-u-U>>>', 'llrrD>>>'] },
        { x: 2, s: ['ludrL>>>', 'rdulR>>>', 'U>>>d-d-', 'lrlrU>>>'] },
        { x: 2, s: ['L>>>R>>>', 'ludrludr', 'U>>>D>>>', 'l---r---'] }] },

    { /*  5 */ name: 'Salto doble', tip: 'Las dobles piden dos direcciones a la vez: usa la diagonal.', bpm: 100,
      root: 49, prog: [0, 0, 5, 5, 8, 8, 5, 3], mel: [12, -9, 16, -9, 19, -9, 16, -9, 12, -9, 15, -9, 12, -9, -9, -9], a2: [66, 63, 61],
      sec: [
        { x: 2, s: ['j---j---', 'k---k---', 'l-r-j---', 'u-d-k---'] },
        { x: 2, s: ['q---w---', 'e---t---', 'j-k-j-k-', 'l-r-u-d-'] },
        { x: 2, s: ['j---k---', 'ludrj---', 'q-w-e-t-', 'j-------'] }] },

    { /*  6 */ name: 'Manos y pies', tip: 'Dobles y largas en el mismo compás.', bpm: 104,
      root: 55, prog: [0, 0, 3, 5, 7, 7, 5, 3], mel: [12, 14, 15, 17, 19, -9, 17, 15, 14, -9, 12, -9, 10, -9, -9, -9], a2: [66, 63, 61],
      sec: [
        { x: 2, s: ['j---L>>>', 'k---R>>>', 'U>>>j---', 'D>>>k---'] },
        { x: 2, s: ['j-k-L>>>', 'q-e-R>>>', 'ludrj---', 'U>>>>>>>'] },
        { x: 2, s: ['j---k---', 'L>>>j---', 'R>>>k---', 'j-------'] }] },

    { /*  7 */ name: 'Cambio de marcha', tip: 'La canción cambia de tempo: las flechas se juntan y se separan.', bpm: 100,
      root: 58, prog: [0, 0, 5, 5, 3, 3, -2, 0], mel: [12, -9, 15, -9, 17, 19, 17, 15, 12, -9, 15, -9, 10, -9, -9, -9], a2: [65, 62, 61],
      sec: [
        { b: 100, x: 2, s: ['l-l-r-r-', 'ludr----', 'u-u-d-d-', 'l-r-u-d-'] },
        { b: 126, x: 2, s: ['l-r-l-r-', 'ludrludr', 'u-d-u-d-', 'j---k---'] },
        { b: 88, x: 1, s: ['L>>>R>>>', 'U>>>D>>>', 'l---r---', 'l-r-u-d-'] },
        { b: 132, x: 1, s: ['ludrludr', 'rdulrdul', 'j-k-j-k-', 'l-------'] }] },

    { /*  8 */ name: 'Tres en uno', tip: 'Largas, dobles y cambio de tempo, todo junto.', bpm: 112,
      root: 49, prog: [0, 0, 7, 7, 5, 5, 8, 5], mel: [12, 16, 19, -9, 16, -9, 12, -9, 15, 19, 22, -9, 19, -9, -9, -9], a2: [64, 62, 60],
      sec: [
        { b: 112, x: 2, s: ['L>>>j---', 'R>>>k---', 'ludrludr', 'j---k---'] },
        { b: 96, x: 2, s: ['U>>>>>>>', 'D>>>d-d-', 'q-w-e-t-', 'L>>>R>>>'] },
        { b: 128, x: 2, s: ['ludrj---', 'rdulk---', 'j-k-j-k-', 'l-r-u-d-'] }] },

    { /*  9 */ name: 'Ráfaga', tip: 'Semicorcheas: cuatro pasos por tiempo. Toca suelto, no fuerte.', bpm: 104,
      root: 62, prog: [0, 0, 3, 3, 5, 7, 5, 3], mel: [12, 14, 15, 14, 12, -9, 15, -9, 17, 15, 14, 12, 10, -9, -9, -9], a2: [64, 62, 60],
      sec: [
        { x: 2, s: ['l-l-r-r-', 'ludr----', 'u-u-d-d-', 'l-r-u-d-'] },
        { d: 0.25, x: 2, s: ['lr--lr--ud--ud--', 'ludrludr--------', 'l-r-u-d-ludr----', 'llrruudd--------'] },
        { x: 2, s: ['L>>>j---', 'ludrludr', 'R>>>k---', 'l---r---'] }] },

    { /* 10 */ name: 'Media noche', tip: 'Mitad del baile: todo lo aprendido, sin respiros largos.', bpm: 120,
      root: 55, prog: [0, 0, 5, 3, 7, 7, 5, 0], mel: [12, 15, 19, 15, 12, -9, 10, -9, 12, 15, 17, 19, 22, -9, -9, -9], a2: [63, 61, 59],
      sec: [
        { x: 3, s: ['L>>>j---', 'ludrludr', 'R>>>k---', 'rdulrdul'] },
        { d: 0.25, x: 2, s: ['ludrludrrdulrdul', 'lr--ud--lr--ud--', 'llrruudd--------', 'l-r-u-d-j-------'] },
        { b: 100, x: 1, s: ['L>>>>>>>', 'q-w-e-t-', 'R>>>>>>>', 'j---k---'] },
        { b: 138, x: 1, s: ['ludrj---', 'rdulk---', 'j-k-j-k-', 'j-------'] }] },

    { /* 11 */ name: 'A ciegas', tip: 'En los tramos oscuros la flecha se apaga antes de llegar: cuenta el compás.', bpm: 104,
      root: 58, prog: [0, 0, -2, -2, 3, 3, 5, 3], mel: [12, -9, 15, -9, 12, -9, 10, -9, 8, -9, 10, -9, 12, -9, -9, -9], a2: [63, 61, 59],
      sec: [
        { x: 2, s: ['l-l-r-r-', 'ludr----', 'u-u-d-d-', 'l-r-u-d-'] },
        { blind: 1, x: 2, s: ['l-l-r-r-', 'u-u-d-d-', 'l-r-l-r-', 'u-d-u-d-'] },
        { x: 2, s: ['L>>>R>>>', 'ludrludr', 'j---k---', 'l---r---'] },
        { blind: 1, x: 1, s: ['l-r-u-d-', 'ludr----', 'u-d-l-r-', 'l-------'] }] },

    { /* 12 */ name: 'Ciego y doble', tip: 'A ciegas con dobles: el compás manda más que los ojos.', bpm: 110,
      root: 49, prog: [0, 0, 5, 5, 3, 3, 7, 5], mel: [12, 16, 19, 16, 12, -9, 15, -9, 12, -9, 8, -9, 5, -9, -9, -9], a2: [62, 60, 58],
      sec: [
        { x: 2, s: ['j---k---', 'ludrj---', 'q-w-e-t-', 'l-r-u-d-'] },
        { blind: 1, x: 2, s: ['j---k---', 'l-r-u-d-', 'j-k-j-k-', 'u-d-l-r-'] },
        { x: 2, s: ['L>>>j---', 'R>>>k---', 'ludrludr', 'j-------'] }] },

    { /* 13 */ name: 'Cuerda rápida', tip: 'Ráfagas encadenadas con largas: no sueltes antes de tiempo.', bpm: 116,
      root: 62, prog: [0, 0, 3, 5, 7, 5, 3, 0], mel: [12, 14, 17, 14, 12, -9, 19, -9, 17, 15, 14, 12, 10, -9, -9, -9], a2: [62, 60, 58],
      sec: [
        { x: 2, s: ['L>>>ludr', 'R>>>rdul', 'U>>>>>>>', 'D>>>d-d-'] },
        { d: 0.25, x: 2, s: ['ludrludr--------', 'lr--ud--lr--ud--', 'llrruudd--------', 'l-r-u-d-l-r-u-d-'] },
        { x: 2, s: ['L>>>j---', 'R>>>k---', 'ludrj---', 'l---r---'] }] },

    { /* 14 */ name: 'Cuesta arriba', tip: 'El tempo sube tres veces y el último tramo va a ciegas.', bpm: 96,
      root: 55, prog: [0, 0, 5, 7, 8, 7, 5, 3], mel: [12, -9, 15, 17, 19, -9, 17, 15, 12, 15, 19, -9, 22, -9, -9, -9], a2: [61, 60, 57],
      sec: [
        { b: 96, x: 2, s: ['l-l-r-r-', 'ludr----', 'u-u-d-d-', 'l-r-u-d-'] },
        { b: 110, x: 2, s: ['ludrludr', 'j---k---', 'L>>>R>>>', 'l-r-u-d-'] },
        { b: 124, blind: 1, x: 2, s: ['l-r-u-d-', 'ludr----', 'j---k---', 'u-d-l-r-'] },
        { b: 138, x: 1, s: ['ludrj---', 'rdulk---', 'j-k-j-k-', 'j-------'] }] },

    { /* 15 */ name: 'Tormenta', tip: 'Densidad máxima: apóyate en el bombo y no mires el marcador.', bpm: 128,
      root: 49, prog: [0, 0, 3, 3, 7, 7, 10, 7], mel: [12, 15, 19, 22, 19, 15, 12, -9, 10, 15, 19, 15, 10, -9, -9, -9], a2: [61, 59, 57],
      sec: [
        { x: 2, s: ['ludrludr', 'rdulrdul', 'j-k-j-k-', 'l-r-u-d-'] },
        { x: 2, s: ['L>>>j---', 'R>>>k---', 'q-w-e-t-', 'ludrj---'] },
        { d: 0.25, x: 2, s: ['ludrludrrdulrdul', 'llrruudd--------', 'lr--ud--lr--ud--', 'l-r-u-d-j-------'] },
        { x: 1, s: ['j---k---', 'L>>>R>>>', 'ludrludr', 'j-------'] }] },

    { /* 16 */ name: 'Cruce', tip: 'Dobles, oscuridad y ráfaga, una detrás de otra.', bpm: 118,
      root: 58, prog: [0, 0, 5, 3, 5, 7, 3, 0], mel: [12, 17, 15, 12, 10, -9, 15, -9, 12, 17, 19, 17, 15, -9, -9, -9], a2: [60, 59, 57],
      sec: [
        { x: 2, s: ['j---L>>>', 'k---R>>>', 'ludrj---', 'rdulk---'] },
        { blind: 1, x: 2, s: ['l-r-u-d-', 'j---k---', 'ludr----', 'u-d-l-r-'] },
        { d: 0.25, x: 2, s: ['lr--ud--lr--ud--', 'ludrludr--------', 'llrruudd--------', 'j-------k-------'] },
        { x: 1, s: ['L>>>>>>>', 'j-k-j-k-', 'ludrludr', 'j-------'] }] },

    { /* 17 */ name: 'Relevo', tip: 'Cuatro tempos distintos: rápido, lento a ciegas y remate.', bpm: 104,
      root: 62, prog: [0, 0, -2, 3, 5, 3, -2, 0], mel: [12, 14, 12, 10, 8, -9, 10, -9, 12, 14, 15, 14, 12, -9, -9, -9], a2: [60, 58, 56],
      sec: [
        { b: 104, x: 2, s: ['L>>>j---', 'ludrludr', 'R>>>k---', 'l-r-u-d-'] },
        { b: 132, x: 2, s: ['ludrludr', 'j-k-j-k-', 'rdulrdul', 'l-r-u-d-'] },
        { b: 92, blind: 1, x: 2, s: ['l-r-u-d-', 'L>>>R>>>', 'ludr----', 'j---k---'] },
        { b: 140, x: 1, s: ['ludrj---', 'rdulk---', 'j-k-j-k-', 'j-------'] }] },

    { /* 18 */ name: 'Doble ciego', tip: 'Los dobles también se apagan. Mantén el pulso en los pies.', bpm: 124,
      root: 55, prog: [0, 0, 7, 5, 3, 5, 7, 0], mel: [12, 19, 15, 12, 19, -9, 15, -9, 12, 10, 12, 15, 19, -9, -9, -9], a2: [60, 57, 55],
      sec: [
        { x: 2, s: ['j---k---', 'ludrj---', 'q-w-e-t-', 'L>>>R>>>'] },
        { blind: 1, x: 2, s: ['j---k---', 'ludrludr', 'l-r-u-d-', 'j-k-j-k-'] },
        { d: 0.25, x: 2, s: ['ludrludrrdulrdul', 'lr--ud--lr--ud--', 'llrruudd--------', 'j-------k-------'] },
        { x: 1, s: ['L>>>j---', 'R>>>k---', 'ludrj---', 'j-------'] }] },

    { /* 19 */ name: 'Vértigo', tip: 'La penúltima: ráfagas, ciegas y dobles sin bajar el ritmo.', bpm: 134,
      root: 49, prog: [0, 0, 3, 7, 10, 7, 3, 0], mel: [12, 15, 19, 22, 24, 22, 19, 15, 12, 15, 19, 15, 12, -9, -9, -9], a2: [59, 57, 55],
      sec: [
        { x: 2, s: ['ludrludr', 'j-k-j-k-', 'L>>>R>>>', 'rdulrdul'] },
        { d: 0.25, x: 2, s: ['ludrludr--------', 'lr--ud--lr--ud--', 'llrruudd--------', 'l-r-u-d-j-------'] },
        { blind: 1, x: 2, s: ['j---k---', 'ludrludr', 'l-r-u-d-', 'q-w-e-t-'] },
        { x: 2, s: ['L>>>j---', 'R>>>k---', 'ludrj---', 'j-------'] }] },

    { /* 20 */ name: 'Gran final', tip: 'Todo el baile en una canción. El último compás es tuyo.', bpm: 112,
      root: 55, prog: [0, 0, 5, 7, 8, 7, 5, 3], mel: [12, 15, 19, 24, 22, 19, 15, 12, 10, 15, 19, 22, 24, -9, -9, -9], a2: [58, 56, 54],
      sec: [
        { b: 112, x: 2, s: ['L>>>j---', 'ludrludr', 'R>>>k---', 'rdulrdul'] },
        { b: 128, d: 0.25, x: 2, s: ['ludrludrrdulrdul', 'lr--ud--lr--ud--', 'llrruudd--------', 'j-------k-------'] },
        { b: 96, blind: 1, x: 1, s: ['l-r-u-d-', 'L>>>R>>>', 'j---k---', 'ludr----'] },
        { b: 144, x: 2, s: ['ludrj---', 'rdulk---', 'j-k-j-k-', 'q-w-e-t-'] },
        { b: 144, x: 1, s: ['L>>>>>>>', 'ludrludr', 'j-k-j-k-', 'j-------'] }] },
  ],
};
if (typeof module !== 'undefined' && module.exports) module.exports = DNCLV;
