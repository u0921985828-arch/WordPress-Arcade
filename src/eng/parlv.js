/* Campaña de «parchis-de-la-plaza» (plan Friv / docs/VARA.md): 20 retos de 1 jugador.
 * Solo la usa parchis-de-la-plaza; los otros 3 juegos de tablero.js (Parchís Exprés, La Oca
 * Viajera y Serpientes y Escaleras) siguen exactamente igual, porque todo cuelga de PC.
 * En el modo tele tampoco se usa: allí manda el mando y la partida es la de siempre.
 *
 * Tablero: 68 casillas de recorrido (índice ABSOLUTO 0–67; la salida del jugador 0 es la 4 y
 * cada jugador sale 17 casillas más allá), pasillo 64–70 y meta 71. En la campaña llevas
 * siempre al jugador 0 (rojo) y los rivales son la CPU.
 *
 * CAMPOS de cada reto:
 *   n    nombre · i  lo que enseña · tip  consejo de la tarjeta
 *   np   rivales (1–3) · ai  nivel de la CPU (0 despistada … 3 fina)
 *   me   posición de salida de tus 4 fichas · foes  la de cada rival
 *        (-1 casa · 0–63 recorrido propio · 64–70 pasillo · 71 meta)
 *   obj  objetivo: {t:'meta', n} n fichas tuyas en meta · {t:'come', n} comer n fichas ·
 *        {t:'escolta', i} llevar a meta esa ficha tuya (si te la comen, se pierde el reto)
 *   lim  límite de turnos tuyos (0 = sin límite). Se acaban los turnos, se pierde el reto.
 *   trap casillas absolutas TRAMPA: quien cae en ellas vuelve a casa
 *   jump casillas absolutas ATAJO: {casilla: casillas que adelanta}
 *   turbo casillas absolutas que regalan otra tirada
 *   block casillas absolutas CERRADAS: no se pisan ni se cruzan (ni tú ni la CPU)
 *   s2   turnos tuyos para la 2.ª estrella
 * ESTRELLAS: 1★ cumplir el objetivo · 2★ hacerlo en s2 turnos o menos ·
 *            3★ eso y además sin que te coman ninguna ficha.
 */
const PARLV = {
  'parchis-de-la-plaza': [
    { n: 'Sal de casa', i: 'Lo básico: mueve con el dado y mete UNA ficha en meta. A la meta se entra con la cuenta exacta.', tip: 'Deja la ficha a 5 o 6 de la meta, no a 1: así entras con casi cualquier dado.',
      np: 1, ai: 0, me: [45, -1, -1, -1], foes: [[20, -1, -1, -1]], obj: { t: 'meta', n: 1 }, lim: 33, s2: 17 },
    { n: 'Entrada justa', i: 'Ahora DOS fichas. Si el dado te pasa de meta, esa ficha no puede mover.', tip: 'Sube las dos a la vez: la que se queda atrás nunca llega a tiempo.',
      np: 1, ai: 0, me: [50, 56, -1, -1], foes: [[28, 10, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 34, s2: 20 },
    { n: 'A comer', i: 'NUEVO: caer donde hay UNA ficha rival la manda a casa y te da 20 de premio. Come DOS.', tip: 'Cuenta antes de tirar: si el rival está a 6 o menos, ya sabes qué quieres sacar.',
      np: 1, ai: 1, me: [6, 10, 16, 22], foes: [[42, 48, 54, -1]], obj: { t: 'come', n: 2 }, lim: 32, s2: 16 },
    { n: 'Los seguros', i: 'En las casillas con estrella no te pueden comer, y dos fichas tuyas juntas forman barrera.', tip: 'Salta de seguro en seguro cuando el rival venga pisándote los talones.',
      np: 2, ai: 1, me: [40, 46, -1, -1], foes: [[25, -1, -1, -1], [8, 30, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 38, s2: 26 },
    { n: 'Casillas trampa', i: 'NUEVO: las calaveras. Quien cae en una vuelve a casa, tú o el rival.', tip: 'Antes de mover mira dónde caes: vale más quedarse corto que pisar calavera.',
      np: 2, ai: 1, me: [46, 54, -1, -1], foes: [[20, -1, -1, -1], [10, 24, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 40, s2: 30,
      trap: [58, 64] },
    { n: 'Atajos', i: 'NUEVO: las flechas verdes adelantan varias casillas de golpe.', tip: 'Calcula para caer justo en la flecha: son el mejor dado del tablero.',
      np: 2, ai: 1, me: [34, 42, -1, -1], foes: [[18, -1, -1, -1], [6, 28, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 38, s2: 27,
      jump: { 41: 8, 52: 6, 60: 5 } },
    { n: 'Casillas turbo', i: 'NUEVO: los rayos. Caer en uno te da otra tirada.', tip: 'Encadena turbo y atajo en la misma jugada: se cruza medio tablero.',
      np: 2, ai: 2, me: [36, 44, -1, -1], foes: [[22, 6, -1, -1], [34, -1, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 38, s2: 28,
      turbo: [47, 57, 63], jump: { 41: 7 } },
    { n: 'La calle cortada', i: 'NUEVO: las vallas. En esas casillas no se puede PARAR: la jugada que acaba ahí no vale.', tip: 'Si el dado te deja justo en una valla, esa ficha no mueve: ten siempre otra a mano.',
      np: 2, ai: 2, me: [40, 48, 12, -1], foes: [[24, 8, -1, -1], [38, -1, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 34, s2: 27,
      block: [20, 26] },
    { n: 'Contrarreloj', i: 'El reloj aprieta: pocos turnos para meter dos fichas.', tip: 'Olvídate de comer: aquí solo cuenta avanzar con las dos fichas de delante.',
      np: 2, ai: 2, me: [52, 58, -1, -1], foes: [[30, 14, -1, -1], [46, -1, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 34, s2: 20,
      turbo: [60, 66] },
    { n: 'El Tío de la Plaza', i: 'JEFE: el veterano del barrio juega fino y el tablero está minado.', tip: 'No le dejes dos fichas seguidas: si forma barrera delante de ti, estás vendido.',
      np: 2, ai: 3, me: [32, 40, 50, -1], foes: [[18, 4, 36, -1], [34, 50, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 34, s2: 22,
      trap: [43, 59], jump: { 47: 9 }, turbo: [53] },
    { n: 'Escolta', i: 'NUEVO: hay que llevar a meta la ficha marcada. Si te la comen o cae en calavera, se acabó.', tip: 'Muévela de seguro en seguro y usa las otras fichas de escudo por detrás.',
      np: 2, ai: 2, me: [42, 8, 20, -1], foes: [[26, 12, -1, -1], [44, -1, -1, -1]], obj: { t: 'escolta', i: 0 }, lim: 33, s2: 17,
      trap: [63] },
    { n: 'Trampas y atajos', i: 'Calaveras y flechas en el mismo camino: cada tirada hay que elegir.', tip: 'Un atajo que acaba en calavera no es un atajo: cuenta las dos cosas.',
      np: 2, ai: 2, me: [40, 48, 24, -1], foes: [[20, 32, -1, -1], [28, 18, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 34, s2: 21,
      trap: [51, 60], jump: { 44: 8, 56: 6 } },
    { n: 'Tres contra ti', i: 'Tres rivales a la vez. Hay más peligro, pero también más que comer.', tip: 'En medio del tablero se come mucho: pásalo rápido y no te quedes a tiro.',
      np: 3, ai: 2, me: [38, 46, -1, -1], foes: [[10, -1, -1, -1], [28, 14, -1, -1], [30, 16, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 40, s2: 25,
      turbo: [49, 59] },
    { n: 'Caza mayor', i: 'Objetivo: comer TRES fichas rivales. A correr detrás de ellas.', tip: 'Persigue a la ficha más adelantada: vale lo mismo y le duele más.',
      np: 3, ai: 2, me: [10, 16, 22, 28], foes: [[2, 8, -1, -1], [5, 12, -1, -1], [30, 35, 42, 47]], obj: { t: 'come', n: 3 }, lim: 38, s2: 16,
      jump: { 30: 7 } },
    { n: 'Callejón sin salida', i: 'Vallas y calaveras juntas: cada dado deja menos jugadas buenas.', tip: 'Cuenta antes de mover: la valla te quita una opción y la calavera te quita la ficha.',
      np: 2, ai: 3, me: [40, 48, 14, -1], foes: [[22, 10, 40, -1], [46, 30, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 42, s2: 30,
      block: [22, 30], trap: [57] },
    { n: 'Escolta con prisa', i: 'La ficha marcada otra vez, pero con reloj, trampas y un atajo que la salva.', tip: 'Guarda el atajo para el final: te ahorra dos turnos justo cuando faltan.',
      np: 2, ai: 3, me: [40, 16, 26, -1], foes: [[28, 16, -1, -1], [42, 34, -1, -1]], obj: { t: 'escolta', i: 0 }, lim: 34, s2: 20,
      trap: [61], jump: { 53: 9 }, turbo: [57] },
    { n: 'La carrera larga', i: 'Tres fichas a meta y tres rivales estorbando.', tip: 'Sube las tres juntas: la que se queda sola siempre acaba comida.',
      np: 3, ai: 2, me: [48, 54, 60, -1], foes: [[24, 10, -1, -1], [30, 8, -1, -1], [16, 34, -1, -1]], obj: { t: 'meta', n: 3 }, lim: 40, s2: 30,
      turbo: [58, 64], trap: [53] },
    { n: 'Campo minado', i: 'Cinco calaveras, una valla y una CPU que no perdona.', tip: 'Cuando dudes, mueve la ficha de atrás: si cae en calavera, pierdes menos.',
      np: 3, ai: 3, me: [44, 52, 20, -1], foes: [[18, 26, -1, -1], [30, 24, -1, -1], [12, 8, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 46, s2: 30,
      trap: [56, 60, 66], block: [24], jump: { 53: 8 } },
    { n: 'La víspera', i: 'Todo lo aprendido a la vez y tres rivales con ventaja.', tip: 'Prioriza: primero la que está en el pasillo, luego la que puede comer.',
      np: 3, ai: 3, me: [34, 42, 52, -1], foes: [[30, 20, 16, -1], [24, 26, -1, -1], [18, 6, -1, -1]], obj: { t: 'meta', n: 2 }, lim: 38, s2: 24,
      trap: [47, 60], block: [26], jump: { 44: 9, 57: 7 }, turbo: [51, 63] },
    { n: 'La final de la plaza', i: 'RETO FINAL: tres fichas a meta, tres rivales finos, reloj corto y el tablero entero en contra.', tip: 'Usa los turbo para encadenar tiradas y no sueltes nunca la ficha del pasillo.',
      np: 3, ai: 3, me: [46, 54, 60, 30], foes: [[32, 24, 30, -1], [28, 36, 22, -1], [20, 34, -1, -1]], obj: { t: 'meta', n: 3 }, lim: 38, s2: 21,
      trap: [51, 58], block: [28], jump: { 49: 8 }, turbo: [55, 63, 66] },
  ],
};
if (typeof module !== 'undefined' && module.exports) module.exports = { PARLV };
