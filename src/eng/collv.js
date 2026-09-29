/* Niveles a mano de Columnas de Joyas (plan Friv, F3 · tanda 4). 20 pozos escritos uno a uno:
 * ninguno se genera al azar y todos están verificados con el simulador de Node (reglas puras del
 * propio motor, marcas <LV>/</LV> en src/eng/columnas.js): el montón inicial nunca trae
 * combinaciones hechas y el objetivo se cumple con holgura dentro del límite de columnas.
 *
 * POZO — 7 columnas × 14 filas. `pre` son las filas del montón inicial, pegadas al SUELO
 * (la última cadena es la fila de abajo del todo). Un pozo vacío se deja sin `pre`.
 *
 *   .  hueco            1-6  joya del color 1..6 (rosa, azul, verde, ámbar, lila, coral)
 *   #  piedra (solo se rompe si una combinación estalla a su lado)
 *   @  piedra dura (aguanta dos estallidos)
 *   D  cristal marcado (no combina; hay que bajarlo hasta el suelo)
 *
 * PARÁMETROS de cada nivel:
 *   name  rótulo · tip  la idea que enseña (se lee al empezar)
 *   cols  colores en juego (3 a 6)      spd   segundos por fila de caída
 *   rain  probabilidad de joya arcoíris (limpia todo el color donde cae)
 *   bomb  probabilidad de bomba (revienta las 8 casillas de alrededor, piedras incluidas)
 *   lim   columnas disponibles (0 = sin límite)
 *   go    objetivo, se pueden combinar varios:
 *           clear n  joyas limpiadas          gems n + col i  joyas de ese color
 *           combo n  cadenas de 2 o más       cry n  cristales bajados al suelo
 *           rock n   piedras rotas            surv n  columnas que hay que aguantar
 *
 * La dificultad elegida (k.D) ajusta velocidad, límite y ayudas; los colores y el montón no cambian.
 */
const COLLV = {
  'columnas-de-joyas': [
    /* ---- 1-5: la línea, la diagonal, la cadena, el color señalado y el arcoíris ---- */
    { /*  1 */ name: 'Primeras joyas', tip: 'Tres iguales en línea desaparecen.',
      cols: 3, spd: 1.05, lim: 30, go: { clear: 12 } },
    { /*  2 */ name: 'También en diagonal', tip: 'Las diagonales cuentan igual que las filas.',
      cols: 3, spd: 1.0, lim: 34, go: { clear: 24 }, pre: [
        '.1.2.3.',
        '2312123'] },
    { /*  3 */ name: 'Encadena', tip: 'Al caer, lo de arriba puede volver a combinar: eso es una cadena.',
      cols: 3, spd: 0.95, lim: 32, go: { combo: 2 }, pre: [
        '..1.2..',
        '.221312',
        '3313211',
        '1312133'] },
    { /*  4 */ name: 'Color señalado', tip: 'Ahora solo cuentan las joyas rosas.',
      cols: 4, spd: 0.9, lim: 36, go: { gems: 12, col: 0 }, pre: [
        '.1.4.1.',
        '2341234',
        '4123412'] },
    { /*  5 */ name: 'Joya arcoíris', tip: 'La joya arcoíris limpia todas las del color donde cae.',
      cols: 4, spd: 0.88, rain: 0.14, lim: 36, go: { gems: 14, col: 1 }, pre: [
        '..2.2..',
        '1234123',
        '3412341'] },
    /* ---- 6-10: cristales, piedras, aguante, bomba y mina ---- */
    { /*  6 */ name: 'Cristales al suelo', tip: 'Los cristales no combinan: vacía lo que tienen debajo.',
      cols: 4, spd: 0.85, lim: 52, go: { cry: 2 }, pre: [
        '..D.D..',
        '1234123',
        '3412341',
        '2143214'] },
    { /*  7 */ name: 'Piedra dura', tip: 'La piedra solo se rompe si estalla algo pegado a ella.',
      cols: 4, spd: 0.85, lim: 34, go: { rock: 4 }, pre: [
        '.#...#.',
        '1234123',
        '4123412',
        '.#...#.'] },
    { /*  8 */ name: 'Aguanta el chaparrón', tip: 'Aquí solo hay que sobrevivir: no dejes que el pozo se llene.',
      cols: 4, spd: 0.7, lim: 0, go: { surv: 26 }, pre: [
        '1234123',
        '3412341'] },
    { /*  9 */ name: 'Bomba de color', tip: 'La bomba revienta las ocho casillas de alrededor, piedras incluidas.',
      cols: 4, spd: 0.8, bomb: 0.13, lim: 36, go: { rock: 6 }, pre: [
        '.#.#.#.',
        '1234123',
        '4123412',
        '#.#.#.#'] },
    { /* 10 */ name: 'Mina de cristal', tip: 'Tres cristales, y el montón ya viene cargado.',
      cols: 5, spd: 0.78, rain: 0.08, lim: 62, go: { cry: 3 }, pre: [
        '.D.D.D.',
        '1234512',
        '4512345',
        '5123451'] },
    /* ---- 11-15: cadenas largas, color a fondo, cantera, vértigo y cristal enterrado ---- */
    { /* 11 */ name: 'Doble cadena', tip: 'Deja escaleras de color: una sola columna puede disparar tres estallidos.',
      cols: 5, spd: 0.74, lim: 42, go: { combo: 3 }, pre: [
        '..1.2..',
        '.1344.5',
        '4211435',
        '2533512',
        '1345123'] },
    { /* 12 */ name: 'Azul a fondo', tip: 'Dieciocho joyas azules. La arcoíris ayuda si cae sobre azul.',
      cols: 5, spd: 0.72, rain: 0.08, lim: 44, go: { gems: 18, col: 1 }, pre: [
        '.2.2.2.',
        '4355234',
        '2141345',
        '4512552'] },
    { /* 13 */ name: 'Cantera', tip: 'Ocho piedras. Combina pegado a ellas o suelta una bomba.',
      cols: 5, spd: 0.7, bomb: 0.11, lim: 40, go: { rock: 8 }, pre: [
        '#.#.#.#',
        '1234512',
        '.#...#.',
        '4512345',
        '#.#.#.#'] },
    { /* 14 */ name: 'Vértigo', tip: 'Caen mucho más rápido: treinta columnas de aguante.',
      cols: 5, spd: 0.56, lim: 0, go: { surv: 30 }, pre: [
        '1234512',
        '3451234',
        '5123451'] },
    { /* 15 */ name: 'Cristal y piedra', tip: 'Dos tareas a la vez: bajar los cristales y romper las piedras del fondo.',
      cols: 5, spd: 0.66, bomb: 0.14, lim: 110, go: { cry: 2, rock: 2 }, pre: [
        '.D.D.D.',
        '1234512',
        '4512345',
        '..#.#..'] },
    /* ---- 16-20: seis colores, maestría y el remate ---- */
    { /* 16 */ name: 'Cadena maestra', tip: 'Seis colores y cuatro cadenas: paciencia y escaleras.',
      cols: 6, spd: 0.62, rain: 0.06, lim: 50, go: { combo: 4 }, pre: [
        '..1.2..',
        '.234.56',
        '6123456',
        '4561234',
        '2345612'] },
    { /* 17 */ name: 'Verde total', tip: 'Veintidós joyas verdes con el pozo a seis colores.',
      cols: 6, spd: 0.6, rain: 0.06, lim: 52, go: { gems: 18, col: 2 }, pre: [
        '.3.3.3.',
        '1245612',
        '5612456',
        '4561245'] },
    { /* 18 */ name: 'Roca viva', tip: 'Las piedras oscuras aguantan dos estallidos.',
      cols: 6, spd: 0.58, bomb: 0.12, lim: 62, go: { rock: 8 }, pre: [
        '@.@.@.@',
        '1234561',
        '.#.#.#.',
        '4561234',
        '@.@.@.@',
        '2345612'] },
    { /* 19 */ name: 'Tormenta de joyas', tip: 'Treinta y cuatro columnas a toda velocidad. Respira y coloca.',
      cols: 6, spd: 0.44, lim: 0, go: { surv: 34 }, pre: [
        '1234561',
        '4561234',
        '2345612'] },
    { /* 20 */ name: 'Corazón del pozo', tip: 'El remate: tres cristales, ocho piedras y tres cadenas.',
      cols: 6, spd: 0.5, rain: 0.08, bomb: 0.1, lim: 86, go: { cry: 2, rock: 6, combo: 3 }, pre: [
        '.D.D.D.',
        '@.#.#.@',
        '1234561',
        '5612345',
        '.#...#.',
        '3456123',
        '6123456',
        '@.....@'] },
  ],
};
