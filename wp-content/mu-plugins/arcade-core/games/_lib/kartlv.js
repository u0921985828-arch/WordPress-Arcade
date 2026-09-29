/* KARTLV — los 20 circuitos escritos a mano de «karts-de-patio» (motor racer2d.js).
 * Solo lo lee racer2d.js cuando CFG.id === 'karts-de-patio' y no hay modo tele;
 * Rally de Mesa y Circuito Garaje no tocan nada de esto.
 *
 * Campos de cada circuito:
 *   n    nombre · req qué exige (se enseña en la salida)
 *   pts  puntos de control de la spline, en unidades de 140 px
 *   hw   medio ancho de la pista (54 por defecto) · laps vueltas
 *   ai   {sp, err, def} velocidad base de la CPU (fracción), cuánto se equivoca y
 *        cuánto defiende la trazada cuando la tienes pegada detrás
 *   tt   tiempo objetivo de carrera [fácil, normal, difícil] → 2.ª estrella
 *   fl   vuelta rápida objetivo [fácil, normal, difícil] → hace falta para la 3.ª
 *   haz  [[fracción, desvío −1..1, tipo], …] charcos de agua, barro y aceite
 *   obs  [[fracción, lado, distancia extra, tipo], …] obstáculos junto a la pista
 *   box  [fracción, …] tríos de cajas de objetos
 *   nar  [[f0, f1, ancho], …] estrechamientos (1 = ancho normal)
 *   jmp  [fracción, …] rampas de salto
 *   trf  karts lentos de tráfico (no puntúan) · wx '' | 'niebla' | 'noche'
 *   drf  rebufo · wear desgaste de ruedas · pit [f0, f1] zona de boxes
 * Elementos nuevos, de uno en uno: 6 charcos · 7 estrechamientos · 8 saltos ·
 * 11 tráfico · 13 niebla · 16 noche · 17 rebufo · 18 desgaste y boxes.
 */
const KARTLV = {
  PTS: [10, 6, 3, 1],
  CUPS: [
    { n: 'Copa Recreo', d: 'Cinco circuitos sueltos para coger el ritmo.' },
    { n: 'Copa Arenero', d: 'Charcos, vallas y el salto del banco.' },
    { n: 'Copa Merienda', d: 'Tráfico de patio y niebla de la mañana.' },
    { n: 'Copa Campeón', d: 'De noche, a rebufo y con las ruedas gastadas.' },
  ],
  RIV: [
    { n: 'Pipa', c: '#ff6b6b' }, { n: 'Tuerca', c: '#5ce1e6' }, { n: 'Chicle', c: '#ffa94d' },
  ],
  T: [
    { n: 'Vuelta del Recreo', req: 'Curvas abiertas: aprende a soltar el gas al entrar.',
      pts: [[2, 2], [6, 1.6], [9, 2.2], [10, 4.5], [8, 6.6], [4, 7], [1.6, 5.6], [1, 3.6]],
      hw: 58, laps: 4, ai: { sp: 0.80, err: 0.5, def: 0.1 }, tt: [68, 65, 63], fl: [15.7, 15, 14.5],
      obs: [[0.12, 1, 40, 'arbusto'], [0.55, -1, 46, 'pelota']], box: [0.34] },
    { n: 'Curva del Columpio', req: 'Una curva larga que se cierra: entra por fuera.',
      pts: [[1.2, 1.2], [5, 1], [6.2, 3.4], [9.8, 4], [10.4, 7], [7, 8.2], [2.2, 7.8], [0.8, 4.4]],
      hw: 56, laps: 3, ai: { sp: 0.815, err: 0.46, def: 0.14 }, tt: [60, 57, 55], fl: [18.1, 17.4, 16.8],
      obs: [[0.3, 1, 44, 'piedra'], [0.72, -1, 40, 'arbusto']], box: [0.28, 0.66] },
    { n: 'Horquilla del Tobogán', req: 'Horquilla de verdad: frena antes y sal abierto.',
      pts: [[1, 1.2], [5, 1], [9, 1.2], [10, 3], [8, 4.4], [5, 3.6], [3.8, 5.2], [8, 6.2], [9, 8], [6, 9.2], [2, 8.5], [0.6, 6], [1.4, 3.4]],
      hw: 54, laps: 2, ai: { sp: 0.825, err: 0.44, def: 0.18 }, tt: [52, 50, 48], fl: [25, 24, 23.1],
      obs: [[0.22, -1, 36, 'piedra'], [0.62, 1, 38, 'arbusto']], box: [0.45] },
    { n: 'Zigzag de Tiza', req: 'Izquierda-derecha encadenadas: no te pases de frenada.',
      pts: [[1, 2], [3.5, 0.9], [6, 2.2], [8.5, 1], [10.6, 2.6], [9.6, 5], [10.8, 7], [8, 8.6], [5, 7.4], [2.6, 8.6], [0.8, 6.4], [2, 4]],
      hw: 54, laps: 3, ai: { sp: 0.83, err: 0.42, def: 0.22 }, tt: [66, 63, 61], fl: [20.4, 19.5, 18.8],
      obs: [[0.4, 1, 40, 'pelota'], [0.86, -1, 42, 'piedra']], box: [0.18, 0.62] },
    { n: 'Gran Premio del Patio', req: 'Todo lo aprendido, y a tres vueltas.',
      pts: [[4, 0.5], [7, 1.5], [10, 1], [11.5, 3.5], [9.5, 5], [11, 7.5], [8, 8.8], [5.5, 7], [3, 8.5], [0.8, 6.5], [2.5, 4.5], [1, 2]],
      hw: 54, laps: 3, ai: { sp: 0.845, err: 0.38, def: 0.26 }, tt: [71, 68, 65], fl: [22.6, 21.6, 20.9],
      obs: [[0.15, -1, 38, 'arbusto'], [0.52, 1, 40, 'piedra'], [0.8, -1, 44, 'pelota']], box: [0.3, 0.72] },

    { n: 'Charcos de la Fuente', req: 'NUEVO: charcos. Sobre el agua el volante no manda.',
      pts: [[5, 0.8], [9, 2.5], [10, 6], [7, 8.5], [3, 8], [1, 5], [2, 2.5]],
      hw: 56, laps: 3, ai: { sp: 0.83, err: 0.42, def: 0.2 }, tt: [52, 50, 48], fl: [16.6, 15.9, 15.3],
      haz: [[0.18, -0.3, 'agua'], [0.46, 0.35, 'agua'], [0.74, 0, 'barro']], box: [0.6] },
    { n: 'Paso de las Vallas', req: 'NUEVO: estrechamientos. Entra colocado o te comes el borde.',
      pts: [[1, 1], [6, 1], [6.5, 4], [10, 4.5], [10.5, 7.5], [6, 8.5], [1.5, 8], [0.5, 4.5]],
      hw: 56, laps: 3, ai: { sp: 0.835, err: 0.4, def: 0.24 }, tt: [61, 59, 56], fl: [19.7, 18.9, 18.2],
      nar: [[0.2, 0.3, 0.58], [0.56, 0.66, 0.54], [0.85, 0.93, 0.6]], box: [0.42] },
    { n: 'Salto del Banco', req: 'NUEVO: rampas. En el aire no se gira: aterriza recto.',
      pts: [[1, 2], [4, 0.8], [7, 2], [9, 1], [11, 2.5], [10.5, 5.5], [8, 7], [6, 5.3], [4, 7], [1.5, 6.5], [0.5, 4.5]],
      hw: 56, laps: 3, ai: { sp: 0.84, err: 0.38, def: 0.24 }, tt: [60, 57, 55], fl: [18.7, 17.9, 17.3],
      jmp: [0.22, 0.58, 0.84], box: [0.4] },
    { n: 'Arenero Profundo', req: 'Barro dentro de los pasos estrechos.',
      pts: [[1.2, 1.2], [5, 1], [6.2, 3.4], [9.8, 4], [10.4, 7], [7, 8.2], [2.2, 7.8], [0.8, 4.4]],
      hw: 54, laps: 3, ai: { sp: 0.85, err: 0.34, def: 0.3 }, tt: [57, 54, 52], fl: [18.1, 17.4, 16.8],
      haz: [[0.28, 0.3, 'barro'], [0.68, -0.3, 'agua']], nar: [[0.24, 0.36, 0.56], [0.62, 0.74, 0.56]], box: [0.5] },
    { n: 'Final del Arenero', req: 'Charcos, vallas y salto a tres vueltas.',
      pts: [[1, 1.2], [5, 1], [9, 1.2], [10, 3], [8, 4.4], [5, 3.6], [3.8, 5.2], [8, 6.2], [9, 8], [6, 9.2], [2, 8.5], [0.6, 6], [1.4, 3.4]],
      hw: 54, laps: 3, ai: { sp: 0.855, err: 0.32, def: 0.32 }, tt: [77, 74, 71], fl: [24.9, 23.9, 23],
      haz: [[0.3, 0, 'agua'], [0.7, 0.3, 'barro']], nar: [[0.48, 0.58, 0.56]], jmp: [0.2, 0.64], box: [0.36, 0.82] },

    { n: 'Hora del Patio', req: 'NUEVO: tráfico lento. Míralos venir y ábrete a tiempo.',
      pts: [[2, 2], [6, 1.4], [9.5, 2], [11, 4.5], [9, 7], [5, 7.6], [2, 6.4], [0.8, 4]],
      hw: 58, laps: 3, ai: { sp: 0.84, err: 0.36, def: 0.28 }, tt: [60, 57, 55], fl: [16.8, 16.1, 15.5],
      trf: 4, box: [0.3, 0.7] },
    { n: 'Pasillo de Recreo', req: 'Tráfico metido justo en los pasos estrechos.',
      pts: [[1, 1], [6, 1], [6.5, 4], [10, 4.5], [10.5, 7.5], [6, 8.5], [1.5, 8], [0.5, 4.5]],
      hw: 56, laps: 3, ai: { sp: 0.85, err: 0.34, def: 0.32 }, tt: [61, 59, 56], fl: [19.7, 18.8, 18.2],
      trf: 4, nar: [[0.3, 0.4, 0.56], [0.7, 0.8, 0.58]], box: [0.55] },
    { n: 'Niebla de la Mañana', req: 'NUEVO: niebla. Se ve poco: memoriza las curvas.',
      pts: [[1, 2], [3.5, 0.9], [6, 2.2], [8.5, 1], [10.6, 2.6], [9.6, 5], [10.8, 7], [8, 8.6], [5, 7.4], [2.6, 8.6], [0.8, 6.4], [2, 4]],
      hw: 56, laps: 3, ai: { sp: 0.845, err: 0.36, def: 0.3 }, tt: [64, 61, 59], fl: [20.6, 19.7, 19],
      wx: 'niebla', haz: [[0.42, 0, 'agua']], box: [0.24, 0.68] },
    { n: 'Cruce con Monitores', req: 'Más tráfico, y encima con aceite en el suelo.',
      pts: [[4, 0.5], [7, 1.5], [10, 1], [11.5, 3.5], [9.5, 5], [11, 7.5], [8, 8.8], [5.5, 7], [3, 8.5], [0.8, 6.5], [2.5, 4.5], [1, 2]],
      hw: 54, laps: 2, ai: { sp: 0.855, err: 0.32, def: 0.34 }, tt: [51, 49, 47], fl: [24.5, 23.4, 22.6],
      trf: 5, haz: [[0.36, 0.25, 'aceite'], [0.78, -0.25, 'barro']], box: [0.6] },
    { n: 'Final de Merienda', req: 'Niebla, tráfico y salto, a tres vueltas.',
      pts: [[1, 1.2], [5, 1], [6.2, 3.2], [9.8, 3.6], [10.6, 6.6], [8, 8.4], [4, 8.6], [1.4, 7], [0.6, 4]],
      hw: 54, laps: 3, ai: { sp: 0.865, err: 0.3, def: 0.36 }, tt: [64, 61, 59], fl: [18.7, 17.9, 17.3],
      wx: 'niebla', trf: 4, jmp: [0.5], haz: [[0.24, 0, 'agua']], box: [0.34, 0.76] },

    { n: 'Patio de Noche', req: 'NUEVO: de noche. Solo alumbra lo que tienes delante.',
      pts: [[1, 2], [4, 0.8], [7, 2], [9, 1], [11, 2.5], [10.5, 5.5], [8, 7], [6, 5.3], [4, 7], [1.5, 6.5], [0.5, 4.5]],
      hw: 56, laps: 3, ai: { sp: 0.855, err: 0.32, def: 0.34 }, tt: [62, 59, 57], fl: [18.7, 17.9, 17.3],
      wx: 'noche', box: [0.3, 0.72] },
    { n: 'Recta del Rebufo', req: 'NUEVO: rebufo. Pégate al de delante y sal disparado.',
      pts: [[1, 1], [5.5, 0.7], [10.5, 1], [11.5, 4], [10.5, 7.5], [5.5, 8.2], [1, 7.6], [0.2, 4]],
      hw: 58, laps: 3, ai: { sp: 0.87, err: 0.3, def: 0.4 }, tt: [67, 64, 62], fl: [21.1, 20.2, 19.5],
      drf: 1, box: [0.26, 0.74] },
    { n: 'Ruedas Gastadas', req: 'NUEVO: desgaste. Pasa despacio por boxes para cambiarlas.',
      pts: [[1.2, 1.2], [5, 1], [6.2, 3.4], [9.8, 4], [10.4, 7], [7, 8.2], [2.2, 7.8], [0.8, 4.4]],
      hw: 56, laps: 3, ai: { sp: 0.865, err: 0.3, def: 0.36 }, tt: [58, 55, 53], fl: [18.5, 17.7, 17.1],
      wear: 1, pit: [0.9, 0.99], box: [0.44] },
    { n: 'Medianoche en el Arenero', req: 'Noche, charcos y vallas a la vez.',
      pts: [[1, 1.2], [5, 1], [9, 1.2], [10, 3], [8, 4.4], [5, 3.6], [3.8, 5.2], [8, 6.2], [9, 8], [6, 9.2], [2, 8.5], [0.6, 6], [1.4, 3.4]],
      hw: 54, laps: 3, ai: { sp: 0.875, err: 0.28, def: 0.4 }, tt: [83, 79, 76], fl: [26.1, 25, 24.1],
      wx: 'noche', haz: [[0.22, -0.3, 'agua'], [0.6, 0.3, 'barro']], nar: [[0.44, 0.54, 0.56]],
      wear: 1, pit: [0.9, 0.99], box: [0.34, 0.78] },
    { n: 'Gran Final del Campeón', req: 'Todo junto y los mejores rivales. Aquí se decide la copa.',
      pts: [[4, 0.5], [7, 1.5], [10, 1], [11.5, 3.5], [9.5, 5], [11, 7.5], [8, 8.8], [5.5, 7], [3, 8.5], [0.8, 6.5], [2.5, 4.5], [1, 2]],
      hw: 54, laps: 3, ai: { sp: 0.885, err: 0.24, def: 0.46 }, tt: [77, 74, 71], fl: [24.8, 23.8, 22.9],
      wx: 'noche', haz: [[0.28, 0.25, 'aceite'], [0.66, -0.3, 'agua']], nar: [[0.52, 0.62, 0.56]],
      jmp: [0.18, 0.78], trf: 3, drf: 1, wear: 1, pit: [0.9, 0.99], box: [0.4, 0.86] },
  ],
};
if (typeof module !== 'undefined') module.exports = KARTLV;
