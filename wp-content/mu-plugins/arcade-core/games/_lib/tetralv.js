/* Tabla de niveles a mano de Tetra Drop (tanda 3 del plan Friv).
 * Solo la usa el modo «classic»; Tetra Drop Marathon no la mira.
 *
 * Cada nivel es un objeto:
 *   o     objetivo, exactamente una clave:
 *           lines n  borrar n líneas          dbl n  hacer n dobles (2 de golpe)
 *           tri n    hacer n triples          tet n  hacer n tetris (4 de golpe)
 *           tsp n    hacer n T-giros          clean 1  dejar el tablero sin basura
 *   spd   segundos que tarda la pieza en bajar una fila (se divide por k.D.spd)
 *   g     basura inicial: filas de 10 casillas, de arriba abajo, apoyadas en el suelo.
 *           '#' bloque de basura · '.' hueco. Ninguna fila puede estar llena.
 *   bag   letras de las piezas que salen (bolsa de esas piezas). Por defecto las 7.
 *   rise  solo el 20: {every: segundos entre subidas, n: subidas totales}
 *   tip   una línea que se enseña sobre el tablero al empezar el nivel.
 *
 * Progresión pensada: 1-3 se aprende a colocar, 4 y 6 enseñan la basura con huecos
 * alineados (una barra los limpia), 5-9 piden jugadas concretas (doble, triple, tetris),
 * 10-15 mezclan basura y bolsas incompletas, 13 monta un hueco de T-giro servido,
 * 16-19 suben el ritmo y el 20 es el remate: la basura sube sola hasta que se limpia entera.
 */
const TETRALV = {
  'tetra-drop': [
    { /*  1 */ o: { lines: 2 }, spd: 1.50, bag: 'IOLJ', tip: 'Completa 2 líneas. Arrastra para mover y toca para girar.' },
    { /*  2 */ o: { lines: 4 }, spd: 1.30, bag: 'IOLJ', tip: 'La sombra clara enseña dónde va a caer la pieza.' },
    { /*  3 */ o: { lines: 6 }, spd: 1.15, bag: 'IOLJT', tip: 'Llega la T: su punta rellena los huecos de una casilla.' },
    { /*  4 */ o: { clean: 1 }, spd: 1.10, bag: 'IOLJT', tip: 'Basura abajo. Los dos huecos están en la misma columna: una barra los limpia.',
      g: ['#######.##', '#######.##'] },
    { /*  5 */ o: { dbl: 2 }, spd: 1.05, tip: 'Llegan la S y la Z. Haz 2 dobles: dos líneas de una vez.' },
    { /*  6 */ o: { clean: 1 }, spd: 1.00, tip: 'Cuatro filas de basura en dos parejas de huecos.',
      g: ['####.#####', '####.#####', '##.#######', '##.#######'] },
    { /*  7 */ o: { tri: 2 }, spd: 0.95, tip: 'Deja un pozo de una columna y suelta la barra: 3 líneas de golpe.' },
    { /*  8 */ o: { lines: 10 }, spd: 0.90, tip: 'Desliza hacia arriba (o el botón Reserva) para guardar una pieza y usarla luego.' },
    { /*  9 */ o: { tet: 1 }, spd: 0.90, tip: 'Un tetris: cuatro líneas a la vez. Reserva las barras hasta tener el pozo.' },
    { /* 10 */ o: { clean: 1 }, spd: 0.85, tip: 'Seis filas y tres parejas de huecos. Vacía el tablero.',
      g: ['#.########', '#.########', '######.###', '######.###', '###.######', '###.######'] },
    { /* 11 */ o: { lines: 12 }, spd: 0.80, bag: 'SZLJT', tip: 'Sin barras ni cuadrados: apáñate con S, Z, L, J y T.' },
    { /* 12 */ o: { dbl: 4 }, spd: 0.78, tip: 'Cuatro dobles. Sube la pila a pares y no dejes huecos tapados.' },
    /* 13: hueco de T-giro servido (comprobado por fuerza bruta: entrando de canto por la columna 6
       y girando en sentido horario sale un T-giro doble completo; el escalón de la izquierda impide
       meter la T de plano, así que hay que girarla dentro). */
    { /* 13 */ o: { tsp: 1 }, spd: 0.85, tip: 'Hay un hueco con techo: mete la T de canto por la derecha y gírala dentro. Eso es un T-giro.',
      g: ['#####.....', '####...###', '#####.####', '#########.'] },
    { /* 14 */ o: { tet: 2 }, spd: 0.75, tip: 'Dos tetris. Encadenados valen más: el back-to-back multiplica.' },
    { /* 15 */ o: { clean: 1 }, spd: 0.75, tip: 'Ocho filas de basura. Empieza por arriba y ve bajando.',
      g: ['#####.####', '#####.####', '###.######', '###.######', '#######.##', '#######.##', '#.########', '#.########'] },
    { /* 16 */ o: { tri: 3 }, spd: 0.70, tip: 'Tres triples seguidos. El pozo de tres se rellena con L y J.' },
    { /* 17 */ o: { lines: 20 }, spd: 0.62, tip: 'Veinte líneas al ritmo bueno. Mantén la pila baja y plana.' },
    { /* 18 */ o: { clean: 1 }, spd: 0.68, bag: 'SZLJT', tip: 'Los huecos van en escalera y no hay barras: las S y las Z encajan de canto.',
      g: ['#.########', '##.#######', '#####.####', '######.###'] },
    { /* 19 */ o: { tet: 3 }, spd: 0.60, tip: 'Tres tetris. Guarda una columna libre y aguanta.' },
    { /* 20 */ o: { clean: 1 }, spd: 0.55, rise: { every: 13, n: 8 },
      tip: 'Último nivel: la basura sube sola. Limpia hasta la última fila.',
      g: ['###.######', '###.######', '######.###', '######.###'] }
  ]
};
