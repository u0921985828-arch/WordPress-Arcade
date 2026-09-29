/* Niveles a mano de Burbujas Arcoíris (plan Friv, F3 · tanda 4).
 * Solo los usa el juego 'burbujas-arcoiris'; Fusión de Frutas y Fusión Solar no miran esta tabla.
 *
 * REJILLA — hexagonal, 9 casillas en las filas pares y 8 en las impares (van medio hueco a la
 * derecha). Cada fila del mapa `m` se escribe con esa longitud exacta; la fila 0 va pegada al
 * techo y es la que sujeta todo lo demás.
 *
 *   .        hueco
 *   1-6      burbuja normal (1 rosa · 2 azul · 3 verde · 4 amarilla · 5 morada · 6 naranja)
 *   a-f      hielo del mismo color (el primer trío rompe la capa, el segundo la revienta)
 *   A-F      burbuja atrapada del mismo color (cuenta para el objetivo «rescatar»)
 *   #        piedra (no estalla nunca; solo cae si se queda sin sujeción)
 *   ?        arcoíris (comodín: hace juego con cualquier color)
 *   *        bomba (revienta a sus seis vecinas cuando estalla algo a su lado)
 *   o        objeto (no estalla; cuenta para el objetivo «bajar» cuando cae)
 *
 * NIVEL:
 *   goal  'clear'  limpiar el tubo (piedras y objetos no cuentan)
 *         'rescue' rescatar `need` burbujas atrapadas (al reventarlas o al hacerlas caer)
 *         'drop'   bajar `need` objetos (hay que descolgarlos)
 *         'hold'   aguantar `need` bajadas del techo sin que nada cruce la línea rosa
 *   cols  colores en juego (1..cols)
 *   shots disparos disponibles
 *   push  disparos entre bajada y bajada del techo (0 = el techo no baja)
 *   par   [★★, ★★★] tiros usados como mucho para dos y tres estrellas (se escalan con la
 *         dificultad igual que la munición; superar el nivel siempre da al menos una estrella)
 *   spec  probabilidad de disparo especial: b bomba · r arcoíris
 *   tip   la idea que enseña el nivel (se lee bajo el objetivo)
 *
 * La dificultad elegida ajusta disparos, colores y ritmo del techo (ver burbujas.js).
 * Los 20 están verificados con un simulador que juega con las reglas puras del motor.
 */
const BURBLV = {
  'burbujas-arcoiris': [
    /* ---- 1-3: la regla básica, el techo y las caídas ---- */
    { /*  1 */ goal: 'clear', cols: 3, par: [7, 4], shots: 20, push: 0, tip: 'Tres burbujas iguales que se tocan estallan.', m: [
      '11.22.33.',
      '.1.2.3..',
    ] },
    { /*  2 */ goal: 'clear', cols: 3, par: [13, 8], shots: 22, push: 14, tip: 'Cada 14 disparos baja el techo una fila.', m: [
      '111222333',
      '11122233',
      '332211332',
    ] },
    { /*  3 */ goal: 'clear', cols: 3, par: [5, 3], shots: 14, push: 12, tip: 'Lo que se queda colgando cae solo… y vale el doble.', m: [
      '111111111',
      '.2.3.2.3',
      '.2.3.2.3.',
    ] },
    /* ---- 4-5: los objetos ---- */
    { /*  4 */ goal: 'clear', cols: 4, par: [20, 13], shots: 26, push: 16, tip: 'El objeto dorado no estalla: hay que descolgarlo.', m: [
      '112233444',
      '.1.2.3.4',
      '..o.o....',
    ] },
    { /*  5 */ goal: 'drop', need: 2, cols: 4, par: [23, 21], shots: 24, push: 11, tip: 'Revienta lo que sujeta el objeto y déjalo caer.', m: [
      '112233441',
      '2.1.3.4.',
      '.o.....o.',
    ] },
    /* ---- 6-7: la piedra ---- */
    { /*  6 */ goal: 'clear', cols: 4, par: [20, 13], shots: 26, push: 18, tip: 'La piedra no estalla, pero cae con lo que la sujeta.', m: [
      '112233444',
      '#1#2#3#4',
      '4.3.2.1.4',
    ] },
    { /*  7 */ goal: 'rescue', need: 3, cols: 4, par: [21, 14], shots: 28, push: 10, tip: 'Tira la piedra de arriba y la atrapada cae con ella.', m: [
      '1112223##',
      '.#.#.#.#',
      '.A.B.C...',
    ] },
    /* ---- 8-9: el hielo ---- */
    { /*  8 */ goal: 'clear', cols: 4, par: [14, 9], shots: 30, push: 18, tip: 'El hielo aguanta dos tríos: el primero rompe la capa.', m: [
      '111222333',
      'aaabbbcc',
    ] },
    { /*  9 */ goal: 'rescue', need: 4, cols: 4, par: [33, 21], shots: 34, push: 11, tip: 'Hielo y piedra juntos: pica primero por los lados.', m: [
      '111222333',
      'a#b#c#a#',
      '.A.B.C.D.',
    ] },
    /* ---- 10: primera prueba de resistencia ---- */
    { /* 10 */ goal: 'hold', need: 6, cols: 5, par: [45, 43], shots: 46, push: 6, tip: 'Aguanta seis bajadas del techo: limpia hacia arriba.', m: [
      '112233445',
      '21435241',
      '345112233',
      '54321543',
    ] },
    /* ---- 11-12: la bomba ---- */
    { /* 11 */ goal: 'clear', cols: 5, par: [25, 17], shots: 32, push: 20, spec: { b: 0.18 }, tip: 'La bomba revienta a sus seis vecinas.', m: [
      '1122*3344',
      '.1.2.3.4',
      '.5.4.3.2.',
    ] },
    { /* 12 */ goal: 'drop', need: 3, cols: 5, par: [13, 8], shots: 30, push: 10, spec: { b: 0.2 }, tip: 'Una bomba bien puesta descuelga media pared.', m: [
      '115522334',
      '1*2*3*4*',
      '.o.o.o...',
    ] },
    /* ---- 13-14: el arcoíris ---- */
    { /* 13 */ goal: 'clear', cols: 5, par: [21, 13], shots: 30, push: 16, spec: { r: 0.16 }, tip: 'El arcoíris hace juego con cualquier color.', m: [
      '1122?3344',
      '.1.2.3.4',
      '.5.?.3.?.',
    ] },
    { /* 14 */ goal: 'rescue', need: 5, cols: 5, par: [14, 9], shots: 34, push: 9, spec: { b: 0.14, r: 0.12 }, tip: 'Cinco atrapadas tras el muro: busca sus clavos.', m: [
      '112233445',
      '#?#?#?#?',
      'A.B.C.D.E',
      '.#.#.#.#',
    ] },
    /* ---- 15: segunda prueba de resistencia ---- */
    { /* 15 */ goal: 'hold', need: 8, cols: 5, par: [51, 49], shots: 52, push: 5, spec: { b: 0.12 }, tip: 'Ocho bajadas y el techo aprieta cada cinco disparos.', m: [
      '123451234',
      '54321543',
      '112233445',
      '32154321',
    ] },
    /* ---- 16-19: todo junto, seis colores ---- */
    { /* 16 */ goal: 'clear', cols: 6, par: [30, 20], shots: 38, push: 20, spec: { b: 0.12, r: 0.1 }, tip: 'Seis colores: cambia de burbuja antes de malgastar el tiro.', m: [
      '112233444',
      'a#b#c#d#',
      '665544332',
      '.6.5.4.3',
    ] },
    { /* 17 */ goal: 'drop', need: 4, cols: 6, par: [16, 10], shots: 36, push: 8, spec: { b: 0.16, r: 0.1 }, tip: 'Cuatro objetos dentro de un muro de piedra.', m: [
      '112233445',
      '#5#6#5#6',
      '6.5.4.3.6',
      '.o.o.o.o',
    ] },
    { /* 18 */ goal: 'rescue', need: 6, cols: 6, par: [16, 10], shots: 40, push: 8, spec: { b: 0.14, r: 0.12 }, tip: 'Seis atrapadas en hielo: dos tríos para cada capa.', m: [
      '112233445',
      'a.b.c.d.',
      'A#B#C#D#E',
      '.6.5.6.5',
      '.F.......',
    ] },
    { /* 19 */ goal: 'clear', cols: 6, par: [18, 11], shots: 46, push: 18, spec: { b: 0.14, r: 0.12 }, tip: 'El tubo entero: pica el techo y que caiga todo.', m: [
      '112233444',
      'a1b2c3d4',
      '556655665',
      '65566556',
      '.5.6.5.6.',
    ] },
    /* ---- 20: el remate ---- */
    { /* 20 */ goal: 'drop', need: 3, cols: 6, par: [24, 15], shots: 58, push: 9, spec: { b: 0.18, r: 0.14 }, tip: 'Las tres coronas del Prisma. Descuélgalas y se acabó.', m: [
      '112233445',
      '#a#b#c#d',
      '6?5*4?3*6',
      '#e#f#e#f',
      '5.4.?.6.5',
      '.#.#.#.#',
      '..o.o.o..',
    ] },
  ],
};
