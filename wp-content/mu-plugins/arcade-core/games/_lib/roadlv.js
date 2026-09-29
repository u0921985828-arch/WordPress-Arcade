/* ROADLV — los 20 circuitos escritos a mano de «low-poly-rally» (motor road.js).
 * Solo lo lee road.js cuando CFG.id === 'low-poly-rally'; los otros juegos del motor no lo tocan.
 *
 * Campos de cada circuito:
 *   n    nombre del trazado
 *   req  qué exige (se enseña en el menú y en la salida)
 *   seg  trazado: [largo en tramos, curva, cuesta]. curva > 0 gira a la derecha; cuesta sube.
 *   laps vueltas · riv rivales (4 a 7)
 *   ai   {sp, err, def} velocidad base de los rivales (fracción del máximo del coche),
 *        cuánto se equivocan (0 = nunca) y cuánto defienden la trazada (0 a 1)
 *   tt   tiempo objetivo de carrera por dificultad [fácil, normal, difícil] → 2.ª estrella
 *        (1.39.1: medido con bot dirigido; margen 16 % en fácil, 11 % en normal y 7 % en difícil)
 *   fl   vuelta rápida de referencia por dificultad: se enseña al terminar, no da estrella
 *   ice  [[a, b], …] tramos resbaladizos (fracción del circuito)
 *   nar  [[a, b, ancho], …] estrechamientos (1 = ancho normal)
 *   jmp  [a, …] saltos
 *   cut  [[a, b, lado], …] atajo de tierra fuera de la pista (lado −1 izquierda, 1 derecha)
 *   trf  coches lentos de tráfico · wx clima ('' | 'niebla' | 'noche')
 *   drf  rebufo anunciado · wear desgaste de neumáticos
 * Elementos nuevos, de uno en uno: 6 charcos · 7 estrechamiento · 8 salto · 11 tráfico ·
 * 12 atajo · 13 niebla · 16 noche · 17 rebufo · 18 desgaste.
 */
const ROADLV = {
  PTS: [10, 8, 6, 5, 4, 3, 2, 1],
  CUPS: [
    { n: 'Copa Pradera', d: 'Cinco trazados abiertos para coger el ritmo.' },
    { n: 'Copa Cantera', d: 'Charcos, pasos estrechos y saltos.' },
    { n: 'Copa Tormenta', d: 'Tráfico, atajos y niebla del valle.' },
    { n: 'Copa Corona', d: 'De noche, a rebufo y con los neumáticos al límite.' },
  ],
  RIV: [
    { n: 'Nube', c: '#ff6b6b' }, { n: 'Chispa', c: '#f2d15c' }, { n: 'Tuerca', c: '#5ce1e6' },
    { n: 'Bruma', c: '#b98cff' }, { n: 'Rayo', c: '#ffa94d' }, { n: 'Musgo', c: '#7cf7a0' }, { n: 'Hollín', c: '#ff9fd0' },
  ],
  T: [
    { n: 'Vuelta del Prado', req: 'Curvas abiertas: coge el ritmo sin soltar el gas.',
      seg: [[90, 0, 0], [110, 2, 0], [70, 0, 0], [110, -2, 0], [80, 0, 0], [100, 2.2, 0], [60, 0, 0], [90, -2.2, 0], [70, 0, 0], [100, 2.4, 0], [60, 0, 0], [90, -2.4, 0], [70, 0, 0]],
      laps: 2, riv: 4, ai: { sp: 0.58, err: 0.5, def: 0.1 }, tt: [46, 44, 42.5], fl: [21.9, 21, 20.2] },
    { n: 'Dos Colinas', req: 'Cuestas: al coronar el coche se aligera.',
      seg: [[90, 0, 0], [90, 0, 1500], [80, 2.5, 0], [80, 0, -1500], [100, -2.5, 0], [70, 0, 1200], [90, 2.2, -1200], [70, 0, 0], [90, -2, 0], [80, 0, 1400], [90, 2.6, -1400], [70, 0, 0], [90, -2.6, 0], [60, 0, 0]],
      laps: 2, riv: 5, ai: { sp: 0.6, err: 0.45, def: 0.14 }, tt: [49.5, 47, 45.5], fl: [22.9, 21.9, 21.1] },
    { n: 'La Herradura', req: 'Una horquilla de verdad: frena antes y sal abierto.',
      seg: [[100, 0, 0], [70, 2, 0], [60, 0, 0], [80, 5, 0], [70, 0, 0], [90, -2.4, 0], [70, 0, 800], [80, -4.6, -800], [70, 0, 0], [60, 1.6, 0], [90, 0, 0], [80, 4.8, 0], [60, 0, 0], [80, -2.6, 0], [60, 0, 0]],
      laps: 2, riv: 5, ai: { sp: 0.61, err: 0.42, def: 0.18 }, tt: [49, 47, 45.5], fl: [23.5, 22.5, 21.6] },
    { n: 'Rompepiernas', req: 'Izquierda-derecha encadenadas: no te pases de frenada.',
      seg: [[80, 0, 0], [60, 3.4, 0], [45, -3.4, 0], [60, 3.2, 0], [45, -3.2, 0], [80, 0, 900], [60, -3.6, 0], [45, 3.6, -900], [80, 0, 0], [90, 2.2, 0], [60, 0, 0], [60, -3.4, 0], [45, 3.4, 0], [60, -3.2, 0], [45, 3.2, 0], [80, 0, 0], [60, 0, 0]],
      laps: 2, riv: 5, ai: { sp: 0.62, err: 0.4, def: 0.22 }, tt: [44, 42, 40.5], fl: [21.3, 20.3, 19.6] },
    { n: 'Final de Pradera', req: 'Todo lo aprendido y tres vueltas.',
      seg: [[70, 0, 0], [80, 2.4, 0], [50, 0, 1200], [70, -3.6, 0], [50, 0, -1200], [70, 4.6, 0], [45, 0, 0], [60, -2.8, 900], [45, 2.8, -900], [70, 0, 0], [60, -2.2, 0], [50, 0, 0], [65, 3.2, 0], [45, 0, 0], [60, -3, 0]],
      laps: 3, riv: 6, ai: { sp: 0.635, err: 0.36, def: 0.26 }, tt: [56.5, 54, 52], fl: [18.2, 17.4, 16.8] },

    { n: 'Charcos de la Cantera', req: 'NUEVO: charcos. Sobre el agua el volante no manda.',
      seg: [[90, 0, 0], [100, 2.6, 0], [70, 0, 0], [100, -2.8, 0], [70, 0, 800], [90, 3.2, -800], [70, 0, 0], [90, -2.6, 0], [70, 0, 0], [90, 3, 0], [60, 0, 0], [90, -3, 0], [70, 0, 0], [70, 2.2, 0]],
      ice: [[0.16, 0.24], [0.45, 0.52], [0.72, 0.79]],
      laps: 2, riv: 5, ai: { sp: 0.615, err: 0.4, def: 0.2 }, tt: [47.5, 45.5, 44], fl: [23, 22, 21.2] },
    { n: 'Paso Estrecho', req: 'NUEVO: estrechamientos. Entra colocado o te comes el borde.',
      seg: [[90, 0, 0], [90, 2.2, 0], [70, 0, 0], [90, -2.8, 0], [70, 0, 0], [100, 3.6, 0], [60, 0, 0], [90, -2.2, 900], [70, 0, -900], [70, 0, 0], [90, 2.8, 0], [60, 0, 0], [90, -3.4, 0], [90, 0, 0]],
      nar: [[0.2, 0.3, 0.6], [0.55, 0.64, 0.55], [0.84, 0.92, 0.62]],
      laps: 2, riv: 5, ai: { sp: 0.62, err: 0.38, def: 0.24 }, tt: [50, 48, 46], fl: [24, 22.9, 22.1] },
    { n: 'Salto del Zorro', req: 'NUEVO: saltos. En el aire no se gira: aterriza recto.',
      seg: [[90, 0, 0], [90, 0, 1400], [70, 2.4, -1400], [90, 0, 0], [90, -2.8, 0], [70, 0, 1300], [90, 3, -1300], [70, 0, 0], [80, -2.2, 0], [80, 0, 1200], [80, 2.6, -1200], [70, 0, 0], [80, -2.6, 0], [70, 0, 0]],
      jmp: [0.18, 0.5, 0.78],
      laps: 2, riv: 5, ai: { sp: 0.625, err: 0.36, def: 0.24 }, tt: [48.5, 46, 44.5], fl: [22.4, 21.4, 20.6] },
    { n: 'Cantera Alta', req: 'Charcos dentro de los pasos estrechos.',
      seg: [[80, 0, 0], [90, 3.2, 0], [60, 0, 900], [90, -3.4, -900], [70, 0, 0], [100, 4.2, 0], [60, 0, 0], [90, -2.6, 0], [70, 2.2, 0], [70, 0, 0], [90, 3.6, 0], [60, 0, 0], [90, -3.2, 0], [80, 0, 0]],
      ice: [[0.24, 0.31], [0.62, 0.7]], nar: [[0.22, 0.34, 0.58], [0.6, 0.72, 0.56]],
      laps: 2, riv: 6, ai: { sp: 0.64, err: 0.33, def: 0.3 }, tt: [49.5, 47.5, 45.5], fl: [24, 22.9, 22.1] },
    { n: 'Final de Cantera', req: 'Charcos, estrechos y saltos a tres vueltas.',
      seg: [[70, 0, 0], [75, 2.8, 0], [50, 0, 1300], [70, -3.2, -1300], [60, 0, 0], [80, 4.6, 0], [50, 0, 1200], [60, -3, -1200], [60, 0, 0], [60, 2.4, 0], [50, 0, 0], [70, -3.4, 0], [60, 0, 0], [55, 3, 0]],
      ice: [[0.3, 0.37], [0.68, 0.75]], nar: [[0.47, 0.57, 0.58]], jmp: [0.2, 0.62],
      laps: 3, riv: 6, ai: { sp: 0.655, err: 0.3, def: 0.32 }, tt: [62, 59.5, 57.5], fl: [19.5, 18.7, 18] },

    { n: 'Carretera Vecinal', req: 'NUEVO: tráfico lento. Míralos venir y ábrete a tiempo.',
      seg: [[110, 0, 0], [100, 2.4, 0], [80, 0, 0], [100, -2.6, 0], [80, 0, 900], [90, 2.8, -900], [70, 0, 0], [90, -2.2, 0], [80, 0, 0], [90, 2.6, 0], [70, 0, 0], [90, -2.8, 0], [100, 0, 0]],
      trf: 4,
      laps: 2, riv: 5, ai: { sp: 0.63, err: 0.34, def: 0.28 }, tt: [48, 46, 44.5], fl: [22.9, 21.9, 21.1] },
    { n: 'Atajo del Molino', req: 'NUEVO: atajo de tierra. Ahorra tiempo… si lo cazas limpio.',
      seg: [[90, 0, 0], [100, 4.2, 0], [70, 0, 0], [90, -2.8, 0], [70, 0, 1000], [100, 4.6, -1000], [70, 0, 0], [90, -2.4, 0], [80, 0, 0], [90, 3.8, 0], [60, 0, 0], [90, -3, 0], [80, 0, 0], [40, 0, 0]],
      cut: [[0.14, 0.26, -1], [0.55, 0.66, -1]],
      laps: 2, riv: 6, ai: { sp: 0.645, err: 0.32, def: 0.3 }, tt: [48, 46, 44], fl: [23.1, 22.1, 21.3] },
    { n: 'Niebla del Valle', req: 'NUEVO: niebla. Se ve poco: memoriza las curvas.',
      seg: [[90, 0, 0], [90, 3, 0], [70, 0, 800], [90, -3.6, -800], [70, 0, 0], [90, 3.8, 0], [70, 0, 0], [90, -2.8, 0], [70, 2.2, 0], [70, 0, 0], [90, 3.4, 0], [60, 0, 0], [90, -3.4, 0], [80, 0, 0]],
      wx: 'niebla', ice: [[0.4, 0.47]],
      laps: 2, riv: 6, ai: { sp: 0.64, err: 0.34, def: 0.3 }, tt: [48.5, 46.5, 44.5], fl: [23.3, 22.3, 21.5] },
    { n: 'Cruce de Camiones', req: 'Tráfico metido en los pasos estrechos.',
      seg: [[90, 0, 0], [90, 2.6, 0], [70, 0, 0], [100, -3.6, 0], [70, 0, 1100], [90, 3.2, -1100], [70, 0, 0], [90, -2.6, 0], [80, 0, 0], [90, 2.8, 0], [70, 0, 0], [90, -3.2, 0], [70, 0, 0], [60, 0, 0]],
      trf: 5, nar: [[0.3, 0.4, 0.58], [0.7, 0.8, 0.6]],
      laps: 2, riv: 6, ai: { sp: 0.65, err: 0.3, def: 0.34 }, tt: [50, 48, 46], fl: [24.5, 23.5, 22.6] },
    { n: 'Final de Tormenta', req: 'Niebla, tráfico y atajo, a tres vueltas.',
      seg: [[70, 0, 0], [80, 3, 0], [50, 0, 1200], [70, -3.4, -1200], [60, 0, 0], [80, 4.4, 0], [60, 0, 0], [70, -2.8, 900], [55, 2.4, -900], [60, 0, 0], [70, 3.6, 0], [50, 0, 0], [75, -3, 0], [30, 0, 0]],
      wx: 'niebla', trf: 4, cut: [[0.5, 0.62, -1]], ice: [[0.24, 0.3]],
      laps: 3, riv: 7, ai: { sp: 0.665, err: 0.28, def: 0.36 }, tt: [60, 57.5, 55.5], fl: [19.2, 18.3, 17.7] },

    { n: 'Nocturno del Puerto', req: 'NUEVO: de noche. Solo alumbra lo que tienes delante.',
      seg: [[90, 0, 0], [90, 2.8, 0], [70, 0, 900], [90, -3.2, -900], [70, 0, 0], [100, 4.2, 0], [60, 0, 0], [90, -2.6, 0], [70, 2.2, 0], [70, 0, 0], [90, 3.4, 0], [60, 0, 0], [90, -3.6, 0], [80, 0, 0]],
      wx: 'noche',
      laps: 2, riv: 6, ai: { sp: 0.655, err: 0.3, def: 0.34 }, tt: [47, 45, 43.5], fl: [22.7, 21.7, 20.9] },
    { n: 'Rebufo de la Recta', req: 'NUEVO: rebufo. Pégate al de delante y sal disparado.',
      seg: [[170, 0, 0], [60, 3.6, 0], [150, 0, 0], [60, -3.8, 0], [140, 0, 800], [60, 3.2, -800], [130, 0, 0], [60, -2.8, 0], [70, 0, 0]],
      drf: 1,
      laps: 3, riv: 7, ai: { sp: 0.67, err: 0.28, def: 0.4 }, tt: [58, 55.5, 53.5], fl: [18.2, 17.4, 16.8] },
    { n: 'Desgaste del Desierto', req: 'NUEVO: desgaste. Cada derrape te come los neumáticos.',
      seg: [[70, 0, 0], [80, 3.4, 0], [60, 0, 0], [80, -3.6, 0], [60, 0, 1000], [85, 4.2, -1000], [60, 0, 0], [75, -3, 0], [60, 2.4, 0], [60, 0, 0], [80, 3.8, 0], [50, 0, 0], [80, -3.4, 0], [30, 0, 0]],
      wear: 1,
      laps: 3, riv: 6, ai: { sp: 0.665, err: 0.28, def: 0.36 }, tt: [61, 58.5, 56.5], fl: [19.9, 19, 18.4] },
    { n: 'Curvas de Medianoche', req: 'Noche, charcos y estrechos a la vez.',
      seg: [[65, 0, 0], [75, 3.6, 0], [50, 0, 900], [75, -3.8, -900], [55, 0, 0], [85, 4.8, 0], [50, 0, 0], [75, -3.2, 0], [60, 2.6, 0], [55, 0, 0], [75, 4, 0], [50, 0, 0], [75, -3.6, 0], [35, 0, 0]],
      wx: 'noche', ice: [[0.2, 0.27], [0.58, 0.65]], nar: [[0.42, 0.52, 0.56]], wear: 1,
      laps: 3, riv: 7, ai: { sp: 0.675, err: 0.26, def: 0.4 }, tt: [64, 61, 59], fl: [20.8, 19.9, 19.2] },
    { n: 'Gran Final Corona', req: 'Todo junto y los mejores rivales. Aquí se decide la copa.',
      seg: [[80, 0, 0], [80, 3.2, 0], [50, 0, 1300], [75, -3.8, -1300], [60, 0, 0], [95, 5, 0], [50, 0, 1100], [75, -3.2, -1100], [60, 0, 0], [75, 2.8, 0], [55, 0, 0], [75, -2.6, 0], [60, 0, 0], [80, 4.2, 0], [50, 0, 0], [30, 0, 0]],
      wx: 'noche', ice: [[0.26, 0.33]], nar: [[0.55, 0.64, 0.56]], jmp: [0.18, 0.66], trf: 3, cut: [[0.76, 0.86, -1]], drf: 1, wear: 1,
      laps: 3, riv: 7, ai: { sp: 0.69, err: 0.22, def: 0.46 }, tt: [75, 71.5, 69], fl: [24.7, 23.7, 22.8] },
  ],
};
if (typeof module !== 'undefined') module.exports = ROADLV;
