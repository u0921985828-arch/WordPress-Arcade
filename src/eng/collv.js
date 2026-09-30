/* Niveles a mano de Columnas de Joyas (plan Friv · tanda 7 de los 40, sobre la tanda 4).
 * 20 pozos escritos uno a uno: ninguno se genera al azar y todos están verificados con el
 * simulador de Node (scripts/check_collv.js), que juega con las reglas puras del propio motor
 * (marcas <LV>/</LV> en src/eng/columnas.js) en las tres dificultades.
 *
 * POZO — 7 columnas × 14 filas. `pre` son las filas del montón inicial, pegadas al SUELO
 * (la última cadena es la fila de abajo del todo). Un pozo vacío se deja sin `pre`.
 *
 *   .  hueco            1-6  joya del color 1..6 (rosa, azul, verde, ámbar, lila, coral)
 *   a-f  joya HELADA del mismo color: no combina hasta que algo estalla pegado a ella
 *   #  piedra (solo se rompe si una combinación estalla a su lado)
 *   @  piedra dura (aguanta dos estallidos)
 *   D  cristal marcado (no combina; hay que bajarlo hasta el suelo)
 *
 * PARÁMETROS de cada nivel:
 *   name  rótulo · tip  la idea que enseña (se lee al empezar)
 *   cols  colores en juego (3 a 6)      spd   segundos por fila de caída
 *   rain  probabilidad de joya arcoíris (limpia todo el color donde cae)
 *   bomb  probabilidad de bomba (revienta las 8 casillas de alrededor, piedras incluidas)
 *   ray   probabilidad de rayo (limpia la fila y la columna donde aterriza)
 *   rise  columnas entre subidas del suelo (entra una fila nueva por abajo con un hueco)
 *   time  segundos de cuenta atrás del nivel (0 = sin reloj)
 *   lim   columnas disponibles (0 = sin límite)
 *   go    objetivo, se pueden combinar varios:
 *           clear n  joyas limpiadas          gems n + col i  joyas de ese color
 *           combo n  cadenas de 2 o más       big n   estallidos de 5 joyas o más
 *           cry n    cristales bajados        rock n  piedras rotas
 *           ice n    joyas descongeladas      surv n  columnas que hay que aguantar
 *   par   [★★, ★★★]. En los niveles de aguante se miden JOYAS limpiadas (más es mejor);
 *         en el resto, COLUMNAS soltadas (menos es mejor). Los dos márgenes se escalan con la
 *         dificultad igual que el límite.
 *   mast  cadenas de 2 o más necesarias para la maestría de la tercera estrella (con el
 *         salvavidas gastado no hay ★★★, pase lo que pase).
 *
 * Mecánicas nuevas de la tanda 7, una por nivel: hielo (6), rayo (11), suelo que sube (12),
 * cuenta atrás (13) y racimos de cinco (14). Después se combinan de dos en dos y de tres en tres.
 * Presión real (reloj, suelo que sube o caída rápida) en 9, 12, 13, 15, 16, 17, 19 y 20.
 */
const COLLV = {
  'columnas-de-joyas': [
    /* ---- 1-5: la línea, la diagonal, la cadena, el color señalado y el arcoíris ---- */
    { /*  1 */ name: 'Primeras joyas', tip: 'Tres iguales en línea desaparecen.',
      cols: 3, spd: 1.05, lim: 38, par: [30, 25], mast: 1, go: { clear: 66 }, pre: [
        '.1.2.3.',
        '2.3.1.2'] },
    { /*  2 */ name: 'También en diagonal', tip: 'Las diagonales cuentan igual que las filas.',
      cols: 3, spd: 1.0, lim: 40, par: [31, 25], mast: 2, go: { clear: 74 }, pre: [
        '.1.2.3.',
        '2.1.3.1',
        '1.3.2.3'] },
    { /*  3 */ name: 'Encadena', tip: 'Al caer, lo de arriba puede volver a combinar: eso es una cadena.',
      cols: 3, spd: 0.95, lim: 44, par: [30, 22], mast: 3, go: { combo: 3, clear: 66 }, pre: [
        '..1.2..',
        '.221312',
        '3313211',
        '1312133'] },
    { /*  4 */ name: 'Color señalado', tip: 'Ahora solo cuentan las joyas rosas.',
      cols: 4, spd: 0.92, lim: 38, par: [28, 22], mast: 2, go: { gems: 20, col: 0 }, pre: [
        '.1.4.1.',
        '1234123',
        '3412341'] },
    { /*  5 */ name: 'Joya arcoíris', tip: 'La joya arcoíris limpia todas las del color donde cae.',
      cols: 4, spd: 0.9, rain: 0.13, lim: 38, par: [28, 22], mast: 2, go: { gems: 20, col: 1 }, pre: [
        '..2.2..',
        '1234123',
        '3412341',
        '1234123'] },
    /* ---- 6-10: hielo, cristales, cantera, aguante y bomba ---- */
    { /*  6 */ name: 'Joyas heladas', tip: 'El hielo no combina: haz estallar algo pegado a él y se descongela.',
      cols: 4, spd: 0.88, lim: 40, par: [30, 23], mast: 2, go: { ice: 9, clear: 76 }, pre: [
        'a.b.c.d',
        '1234123',
        '3412341',
        'c.d.a.b',
        '1234123',
        '.b.c.d.'] },
    { /*  7 */ name: 'Cristales al suelo', tip: 'Los cristales no combinan: vacía lo que tienen debajo.',
      cols: 4, spd: 0.85, lim: 58, par: [33, 26], mast: 2, go: { cry: 2, clear: 62 }, pre: [
        'D.D.D.D',
        '1234123',
        '3412341'] },
    { /*  8 */ name: 'Cantera', tip: 'La piedra solo se rompe si estalla algo pegado a ella.',
      cols: 4, spd: 0.85, lim: 40, par: [30, 23], mast: 2, go: { rock: 9, clear: 62 }, pre: [
        '#.#.#.#',
        '1234123',
        '.#.#.#.',
        '3412341',
        '#.#.#.#'] },
    { /*  9 */ name: 'Aguanta el chaparrón', tip: 'Aquí solo hay que sobrevivir: no dejes que el pozo se llene.',
      cols: 4, spd: 0.62, lim: 0, par: [64, 74], mast: 2, go: { surv: 26 }, pre: [
        '1234123',
        '3412341'] },
    { /* 10 */ name: 'Bomba de color', tip: 'La bomba revienta las ocho casillas de alrededor, piedras incluidas.',
      cols: 5, spd: 0.82, bomb: 0.13, lim: 42, par: [32, 27], mast: 3, go: { rock: 9, clear: 70 }, pre: [
        '#.#.#.#',
        '1234512',
        '.#.#.#.',
        '3451234',
        '#.#.#.#',
        '5123451'] },
    /* ---- 11-14: el rayo, el suelo que sube, el reloj y los racimos ---- */
    { /* 11 */ name: 'El rayo', tip: 'El rayo limpia de golpe la fila y la columna donde aterriza.',
      cols: 5, spd: 0.8, ray: 0.12, lim: 42, par: [32, 28], mast: 3, go: { clear: 74 }, pre: [
        '.1.2.3.',
        '1234512',
        '3451234',
        '5123451'] },
    { /* 12 */ name: 'Sube el suelo', tip: 'Cada pocas columnas entra una fila nueva por abajo. No te duermas.',
      cols: 5, spd: 0.78, rise: 7, lim: 40, par: [30, 23], mast: 3, go: { clear: 72 }, pre: [
        '1234512',
        '3451234'] },
    { /* 13 */ name: 'Contrarreloj', tip: 'Hay reloj: lo que no limpies a tiempo no cuenta.',
      cols: 5, spd: 0.76, time: 85, lim: 40, par: [30, 23], mast: 3, go: { clear: 68 }, pre: [
        '.1.3.5.',
        '1234512',
        '3451234',
        '5123451'] },
    { /* 14 */ name: 'Racimos de cinco', tip: 'Ahora no bastan tres: hacen falta estallidos de cinco joyas o más.',
      cols: 4, spd: 0.74, lim: 76, par: [35, 27], mast: 3, go: { big: 2, clear: 62 }, pre: [
        '..1.2..',
        '.1344.5',
        '4211435',
        '2533512',
        '1345123'] },
    /* ---- 15-19: todo combinado, seis colores y presión ---- */
    { /* 15 */ name: 'Vértigo', tip: 'Caen mucho más rápido: treinta columnas de aguante.',
      cols: 5, spd: 0.5, lim: 0, par: [76, 86], mast: 3, go: { surv: 30 }, pre: [
        '1234512',
        '3451234',
        '5123451'] },
    { /* 16 */ name: 'Mina de cristal', tip: 'Cuatro cristales mientras el suelo sube: baja primero los del medio.',
      cols: 5, spd: 0.72, rise: 9, rain: 0.08, lim: 72, par: [37, 29], mast: 3, go: { cry: 2, clear: 60 }, pre: [
        'D.D.D.D',
        '1234512',
        '3451234'] },
    { /* 17 */ name: 'Cantera a reloj', tip: 'Doce piedras y un reloj corriendo. La bomba es tu amiga.',
      cols: 6, spd: 0.68, bomb: 0.12, time: 100, lim: 44, par: [34, 32], mast: 3, go: { rock: 9, clear: 68 }, pre: [
        '#.#.#.#',
        '1234561',
        '.#.#.#.',
        '3456123',
        '#.#.#.#',
        '5612345'] },
    { /* 18 */ name: 'Roca viva', tip: 'Las piedras oscuras aguantan dos estallidos: pícalas dos veces.',
      cols: 6, spd: 0.66, bomb: 0.11, ray: 0.08, lim: 50, par: [38, 36], mast: 3, go: { rock: 9, big: 2, clear: 72 }, pre: [
        '@.@.@.@',
        '1234561',
        '.#.#.#.',
        '3456123',
        '@.@.@.@',
        '5612345'] },
    { /* 19 */ name: 'Tormenta de joyas', tip: 'Treinta y cuatro columnas a toda velocidad y con el suelo subiendo.',
      cols: 6, spd: 0.42, rise: 11, lim: 0, par: [80, 98], mast: 3, go: { surv: 34 }, pre: [
        '1234561',
        '3456123',
        '5612345'] },
    /* ---- 20: el remate ---- */
    { /* 20 */ name: 'Corazón del pozo', tip: 'El remate: cristales, piedras y racimos, con reloj y el suelo subiendo.',
      cols: 6, spd: 0.6, rain: 0.08, bomb: 0.1, ray: 0.07, rise: 10, time: 170, lim: 66, par: [44, 42], mast: 4,
      go: { cry: 2, rock: 9, big: 2, clear: 64 }, pre: [
        'D.....D',
        '1234561',
        '@.#.#.@',
        '3456123',
        '.#.#.#.',
        '5612345',
        'a.b.c.d',
        '@.#.#.@'] },
  ],
};
