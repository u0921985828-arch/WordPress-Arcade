/* Niveles a mano de barrel-climb (plan Friv, tanda 7). Nada se sortea.
 *
 * Cada nivel es { n: nombre, tip: consejo, t: [fácil, normal, difícil] segundos objetivo de la
 * 2ª estrella, st: [etapas] }. Cada ETAPA es una torre completa y hace de punto de control:
 * morir repite la etapa, no el nivel. Piezas de cada etapa:
 *
 *   lad   escaleras (lad[i] = columnas que suben del piso i al i+1; rejilla de 24 columnas)
 *   co    monedas por piso (0 = suelo … 4); «12+» = moneda alta, hay que saltar
 *   riv   REMACHES por piso: hay que recoger todos para que la bandera se abra
 *   rate  segundos entre barriles     spd  velocidad del barril
 *   blue  proporción de barriles azules (más rápidos, siempre bajan escaleras)
 *   hop   probabilidad de que un barril normal baje por una escalera
 *   fire  charcos de fuego que deja el bidón (máximo simultáneo) — pisan el suelo, matan
 *   ham   [piso, columna] del MARTILLO: 6 s rompiendo barriles y trepadores
 *   oil   pisos con ACEITE: se patina, el control tarda en responder
 *   clm   TREPADORES [piso, columna, sentido]: suben por las escaleras a buscarte
 *   brk   VIGAS AGRIETADAS [piso, columna, ancho]: se caen si te paras encima
 *   boss  etapa de EL CAPATAZ: tres martillazos y la torre es tuya
 */
const BARLV = {
  'barrel-climb': [
    { n: 'La obra', tip: 'Recoge todos los remaches: la bandera no se abre hasta el último.', t: [36, 32, 28], st: [
      { lad: [[7, 16], [6, 15], [7, 16], [6, 15], [12, 18]], co: [[6], [8], [10], [9], [12]], riv: [[12], [14], [6], [16], [15]], rate: 4.4, spd: 62, blue: 0, hop: 0 },
      { lad: [[8, 17], [7, 16], [8, 17], [7, 16], [11, 19]], co: [[5, 14], [7], [11], [8], [13]], riv: [[4, 18], [12], [18], [10], [16]], rate: 4.2, spd: 66, blue: 0, hop: 0 }] },
    { n: 'Andamio doble', tip: 'Los barriles siempre ruedan hacia el lado libre del piso.', t: [42, 37, 33], st: [
      { lad: [[6, 18], [5, 17], [6, 18], [5, 17], [10, 19]], co: [[6, 15], [8, 16], [9], [10], [14]], riv: [[10, 20], [13], [5, 17], [15], [14]], rate: 4.0, spd: 68, blue: 0, hop: 0.08 },
      { lad: [[9, 19], [4, 16], [9, 19], [4, 16], [12, 20]], co: [[7], [6, 14], [11, 19], [9], [13]], riv: [[5, 19], [10, 18], [8], [13], [17]], rate: 3.8, spd: 72, blue: 0, hop: 0.12 }] },
    { n: 'El bidón', tip: 'Los barriles que llegan al bidón dejan fuego en el suelo.', t: [49, 43, 39], st: [
      { lad: [[5, 20], [5, 19], [5, 20], [5, 19], [10, 20]], co: [[4, 16], [7, 17], [8, 18], [6, 15], [12, 18]], riv: [[9, 19], [12], [6, 18], [14], [16]], rate: 3.7, spd: 74, blue: 0.06, hop: 0.14 },
      { lad: [[10, 21], [4, 18], [10, 21], [4, 18], [11, 19]], co: [[6, '16+'], [9], [12], [10], [14]], riv: [[5, 17], [11, 19], [9], [16], [13]], rate: 3.6, spd: 76, blue: 0.08, hop: 0.16, fire: 1 }] },
    { n: 'Suelo caliente', tip: 'El fuego no se mueve deprisa, pero no se apaga: sube pronto.', t: [61, 55, 50], st: [
      { lad: [[7, 22], [6, 20], [7, 22], [6, 20], [10, 20]], co: [['7+', 17], [8, 15], [10, 20], [7, 16], [13, 19]], riv: [[11, 21], [9, 17], [7, 19], [12], [15]], rate: 3.5, spd: 78, blue: 0.1, hop: 0.18, fire: 1 },
      { lad: [[12, 21], [4, 19], [12, 21], [4, 19], [12, 20]], co: [[5, 18], ['9+'], [11], ['9+'], [15]], riv: [[6, 20], [13], [5, 17], [10, 18], [14]], rate: 3.4, spd: 82, blue: 0.12, hop: 0.2, fire: 2 }] },
    { n: 'El martillo', tip: 'Coge el martillo y los barriles se rompen solos: seis segundos.', t: [55, 50, 45], st: [
      { lad: [[6, 22], [5, 20], [6, 22], [5, 20], [11, 20]], co: [[8, '18+'], [7, 16], [9, 19], [8, 17], [12, 19]], riv: [[10, 20], [12], [7, 19], [15], [13]], rate: 3.3, spd: 84, blue: 0.12, hop: 0.2, ham: [1, 12] },
      { lad: [[14, 22], [4, 20], [14, 22], [4, 20], [10, 19]], co: [['6+', 17], [10], [13], [10], [14, 20]], riv: [[5, 21], [9, 18], [11], [13, 19], [16]], rate: 3.2, spd: 86, blue: 0.14, hop: 0.22, fire: 2, ham: [0, 9] }] },
    { n: 'Turno de noche', tip: 'Con el martillo también caen los remaches más difíciles.', t: [54, 49, 44], st: [
      { lad: [[5, 21], [6, 19], [5, 21], [6, 19], [12, 20]], co: [[7, 19], ['8+', 16], [8, 18], ['7+', 16], [13, 19]], riv: [[4, 12, 20], [10, 18], [6, 16], [14], [17]], rate: 3.1, spd: 88, blue: 0.16, hop: 0.24, ham: [2, 14] },
      { lad: [[15, 22], [4, 17], [15, 22], [4, 17], [11, 20]], co: [[6, 20], [9, 18], [12, 20], [9, 18], [15]], riv: [[8, 18], [5, 15], [9, 19], [11], [12, 18]], rate: 3.0, spd: 92, blue: 0.18, hop: 0.26, fire: 2, ham: [1, 8] }] },
    { n: 'Aceite en la viga', tip: 'En las vigas con aceite se patina: suelta antes de frenar.', t: [66, 59, 55], st: [
      { lad: [[8, 22], [5, 20], [8, 22], [5, 20], [10, 20]], co: [['5+', 18], [7, '17+'], [10, 21], [7, '17+'], [12, 20]], riv: [[9, 19], [11], [6, 18], [13], [15]], rate: 3.0, spd: 92, blue: 0.18, hop: 0.26, oil: [2] },
      { lad: [[16, 22], [4, 20], [16, 22], [4, 20], [13, 20]], co: [[8, 19], [11], [14], [11], [16]], riv: [[6, 20], [12, 18], [8], [14, 20], [17]], rate: 2.9, spd: 96, blue: 0.2, hop: 0.28, oil: [1, 3], fire: 2 }] },
    { n: 'Resbalón', tip: 'Con el martillo en la mano el aceite da menos miedo.', t: [67, 62, 57], st: [
      { lad: [[6, 21], [7, 20], [6, 21], [7, 20], [10, 19]], co: [[7, '19+'], [9, 17], [9, 19], [9, 17], [13, 19]], riv: [[5, 15, 21], [10, 18], [7, 17], [12], [16]], rate: 2.8, spd: 98, blue: 0.2, hop: 0.3, oil: [1, 4], ham: [2, 10] },
      { lad: [[17, 22], [4, 19], [17, 22], [4, 19], [12, 20]], co: [['6+', 20], [10, 18], [13, 21], [10, 18], [14, 20]], riv: [[9, 19], [6, 16], [11, 19], [13], [12, 18]], rate: 2.7, spd: 100, blue: 0.22, hop: 0.32, oil: [2, 3], fire: 2, ham: [0, 16] }] },
    { n: 'El trepador', tip: 'El trepador sube a buscarte: pisotón, martillo o quítate.', t: [68, 61, 57], st: [
      { lad: [[5, 22], [5, 20], [5, 22], [5, 20], [11, 20]], co: [[8, 21], ['8+', 17], [8, 20], ['8+', 17], [12, 19]], riv: [[10, 20], [12], [6, 18], [14], [15]], rate: 2.8, spd: 96, blue: 0.2, hop: 0.28, clm: [[1, 12, -1]] },
      { lad: [[18, 22], [4, 20], [18, 22], [4, 20], [14, 20]], co: [[7, '19+'], [11, 19], [15, 21], [11, 19], [16, 20]], riv: [[5, 19], [9, 17], [8, 20], [12], [13, 19]], rate: 2.7, spd: 100, blue: 0.22, hop: 0.3, clm: [[1, 14, -1]], fire: 2 }] },
    { n: 'Dos sombras', tip: 'Dos trepadores: sepáralos usando escaleras distintas.', t: [74, 68, 63], st: [
      { lad: [[9, 21], [6, 19], [9, 21], [6, 19], [10, 20]], co: [['6+', 20], [8, '18+'], [10, 20], [8, '18+'], [13, 19]], riv: [[11, 21], [10], [7, 17], [15], [14]], rate: 2.7, spd: 100, blue: 0.22, hop: 0.3, clm: [[1, 10, -1], [3, 16, -1]], ham: [1, 18] },
      { lad: [[19, 22], [4, 20], [19, 22], [4, 20], [13, 20]], co: [[8, 21], [10, 18], [12, 20], [10, 18], [15, 19]], riv: [[6, 16, 20], [12, 18], [9, 19], [11], [16]], rate: 2.6, spd: 104, blue: 0.24, hop: 0.32, clm: [[1, 12, 1], [2, 18, -1]], fire: 2, ham: [0, 6] }] },
    { n: 'Aceite y sombra', tip: 'El trepador patina igual que tú: úsalo a tu favor.', t: [78, 73, 68], st: [
      { lad: [[7, 21], [5, 18], [7, 21], [5, 18], [11, 19]], co: [[6, 18], [9, 17], [8, 19], [10, 16], [13, 20]], riv: [[10, 20], [11, 19], [6, 16], [13], [15]], rate: 2.6, spd: 104, blue: 0.24, hop: 0.32, oil: [1, 3], clm: [[1, 14, -1]] },
      { lad: [[13, 22], [4, 19], [13, 22], [4, 19], [12, 20]], co: [['7+', 19], [10, 18], [12, 20], [9, 17], [14, 19]], riv: [[5, 15, 21], [9, 17], [10, 20], [12, 18], [17]], rate: 2.5, spd: 108, blue: 0.26, hop: 0.34, oil: [2, 4], clm: [[2, 16, -1]], fire: 3, ham: [1, 10] }] },
    { n: 'Viga carcomida', tip: 'Las vigas amarillas se caen si te paras: pásalas corriendo.', t: [65, 59, 55], st: [
      { lad: [[6, 20], [6, 18], [6, 20], [6, 18], [10, 19]], co: [[8, 18], [11, 17], [9, 19], [11, 16], [13, 18]], riv: [[9, 19], [12], [7, 17], [14], [16]], rate: 2.6, spd: 104, blue: 0.24, hop: 0.3, brk: [[1, 12, 2], [3, 10, 2]] },
      { lad: [[14, 21], [4, 18], [14, 21], [4, 18], [11, 20]], co: [[7, 19], [9, 17], [12, 20], [10, 16], [15, 19]], riv: [[6, 16, 20], [10, 18], [8, 18], [13], [12, 18]], rate: 2.5, spd: 108, blue: 0.26, hop: 0.34, brk: [[1, 9, 2], [2, 14, 3], [4, 15, 2]], fire: 2, ham: [0, 12] }] },
    { n: 'Sin apoyo', tip: 'Si la viga se cae, el remache de arriba pide otra escalera.', t: [83, 77, 72], st: [
      { lad: [[8, 21], [5, 19], [8, 21], [5, 19], [12, 20]], co: [[6, 20], [10, 18], [8, 20], [9, 17], [14, 19]], riv: [[10, 20], [11, 19], [7, 17], [15], [13]], rate: 2.5, spd: 108, blue: 0.26, hop: 0.34, brk: [[2, 12, 3], [4, 13, 2]], clm: [[1, 16, -1]] },
      { lad: [[16, 22], [4, 20], [16, 22], [4, 20], [13, 19]], co: [['8+', 20], [11, 19], [13, 21], [10, 18], [15, 20]], riv: [[5, 15, 21], [9, 17], [9, 19], [12, 18], [16]], rate: 2.4, spd: 112, blue: 0.28, hop: 0.36, brk: [[1, 10, 2], [3, 15, 3]], clm: [[1, 12, 1], [3, 18, -1]], fire: 3 }] },
    { n: 'Toda la obra', tip: 'Fuego, aceite y vigas flojas: una cosa a la vez.', t: [78, 72, 68], st: [
      { lad: [[7, 20], [6, 18], [7, 20], [6, 18], [11, 19]], co: [[7, 19], [10, 16], [9, 19], [11, 17], [13, 18]], riv: [[9, 19], [12], [6, 18], [14], [15]], rate: 2.4, spd: 112, blue: 0.28, hop: 0.34, oil: [2], brk: [[1, 13, 2]], fire: 2 },
      { lad: [[15, 22], [4, 19], [15, 22], [4, 19], [12, 20]], co: [[6, 20], [9, 18], [12, 20], [10, 17], [14, 19]], riv: [[6, 14, 20], [10, 18], [8, 18], [13, 19], [17]], rate: 2.3, spd: 116, blue: 0.3, hop: 0.38, oil: [1, 3], brk: [[2, 11, 3], [4, 14, 2]], fire: 3, ham: [1, 8] }] },
    { n: 'Remaches altos', tip: 'Las monedas y remaches altos piden salto: mide la carrera.', t: [74, 67, 63], st: [
      { lad: [[6, 21], [5, 18], [6, 21], [5, 18], [10, 20]], co: [['6+', '18+'], [9, 17], ['9+', 19], [10, 16], [13, 19]], riv: [[10, 20], [11, 19], [7, 17], [14], [16]], rate: 2.4, spd: 112, blue: 0.28, hop: 0.34, clm: [[2, 14, -1]], ham: [2, 18] },
      { lad: [[17, 22], [4, 20], [17, 22], [4, 20], [13, 20]], co: [['7+', 21], [10, 18], ['12+', 20], [11, 17], [15, 19]], riv: [[5, 15, 21], [9, 17], [10, 20], [12, 18], [14, 19]], rate: 2.3, spd: 116, blue: 0.3, hop: 0.38, oil: [3], brk: [[1, 12, 2]], fire: 3, clm: [[1, 16, -1]] }] },
    { n: 'Doble trepador', tip: 'Con el martillo, dos trepadores son doscientos puntos cada uno.', t: [82, 76, 72], st: [
      { lad: [[8, 21], [6, 19], [8, 21], [6, 19], [11, 20]], co: [[7, 19], [10, 18], [9, 19], [11, 16], [14, 19]], riv: [[9, 19], [12, 18], [7, 17], [15], [13]], rate: 2.3, spd: 116, blue: 0.3, hop: 0.36, clm: [[1, 12, -1], [3, 16, -1]], brk: [[2, 13, 2]], ham: [1, 16] },
      { lad: [[14, 22], [4, 18], [14, 22], [4, 18], [12, 19]], co: [[8, 20], [11, 19], [13, 21], [10, 17], [15, 20]], riv: [[6, 16, 20], [10, 18], [9, 19], [13, 19], [16]], rate: 2.2, spd: 120, blue: 0.32, hop: 0.4, clm: [[1, 14, 1], [2, 18, -1]], brk: [[1, 10, 2], [4, 14, 2]], fire: 3 }] },
    { n: 'Turno de tarde', tip: 'Aceite, vigas flojas y martillo: el orden lo decides tú.', t: [79, 73, 68], st: [
      { lad: [[6, 20], [5, 19], [6, 20], [5, 19], [10, 19]], co: [[7, 20], [9, 17], [10, 20], [10, 16], [13, 18]], riv: [[10, 20], [11], [6, 18], [14], [16]], rate: 2.3, spd: 116, blue: 0.3, hop: 0.36, oil: [1, 3], brk: [[2, 12, 3]], ham: [0, 14] },
      { lad: [[16, 22], [4, 20], [16, 22], [4, 20], [13, 20]], co: [['6+', 20], [10, 18], [12, 20], [11, 17], [15, 19]], riv: [[5, 15, 21], [9, 17], [10, 20], [12, 18], [14, 19]], rate: 2.2, spd: 122, blue: 0.32, hop: 0.4, oil: [2, 4], brk: [[1, 11, 2], [3, 14, 3]], fire: 3, ham: [1, 6] }] },
    { n: 'La última grúa', tip: 'Tres trepadores y fuego: sube por el lado que no vigilan.', t: [88, 83, 78], st: [
      { lad: [[7, 21], [6, 18], [7, 21], [6, 18], [11, 20]], co: [[8, 19], [10, 17], [9, 19], [11, 16], [14, 18]], riv: [[9, 19], [12, 18], [7, 17], [15], [13]], rate: 2.2, spd: 120, blue: 0.32, hop: 0.38, clm: [[1, 12, -1], [2, 16, 1]], fire: 3, ham: [2, 10] },
      { lad: [[15, 22], [4, 19], [15, 22], [4, 19], [12, 20]], co: [[7, 21], [11, 19], [13, 20], [10, 17], [15, 19]], riv: [[6, 16, 20], [10, 18], [9, 19], [13, 19], [16]], rate: 2.1, spd: 126, blue: 0.34, hop: 0.42, clm: [[1, 10, 1], [2, 18, -1], [3, 14, -1]], brk: [[1, 13, 2]], fire: 3 }] },
    { n: 'Horas extra', tip: 'Todo lo aprendido, sin descanso. La etapa 2 guarda el martillo.', t: [100, 94, 89], st: [
      { lad: [[6, 21], [5, 19], [6, 21], [5, 19], [10, 20]], co: [['7+', 20], [10, 18], ['10+', 20], [11, 16], [14, 19]], riv: [[10, 20], [11, 19], [6, 18], [14], [16]], rate: 2.1, spd: 124, blue: 0.34, hop: 0.4, oil: [2], brk: [[1, 12, 2], [3, 15, 2]], clm: [[1, 14, -1]], fire: 3 },
      { lad: [[17, 22], [4, 20], [17, 22], [4, 20], [13, 20]], co: [[8, 21], [11, 19], [13, 21], [10, 18], [15, 20]], riv: [[5, 15, 21], [9, 17], [10, 20], [12, 18], [14, 19]], rate: 2.0, spd: 130, blue: 0.36, hop: 0.44, oil: [1, 3], brk: [[2, 11, 3], [4, 14, 2]], clm: [[1, 12, 1], [3, 18, -1]], fire: 3, ham: [0, 8] }] },
    { n: 'El Capataz', tip: 'En la última etapa el martillo vuelve cada nueve segundos: tres golpes.', t: [145, 138, 133], st: [
      { lad: [[7, 21], [6, 19], [7, 21], [6, 19], [11, 20]], co: [[7, 19], [10, 18], [9, 19], [11, 17], [14, 19]], riv: [[9, 19], [12, 18], [7, 17], [15], [13]], rate: 2.1, spd: 126, blue: 0.34, hop: 0.4, oil: [2], brk: [[1, 13, 2]], clm: [[1, 12, -1]], fire: 3 },
      { lad: [[15, 22], [4, 19], [15, 22], [4, 19], [12, 20]], co: [[8, 20], [11, 19], [12, 20], [10, 17], [15, 19]], riv: [[6, 16, 20], [10, 18], [9, 19], [13, 19], [16]], rate: 2.0, spd: 130, blue: 0.36, hop: 0.44, oil: [1, 3], brk: [[2, 12, 3]], clm: [[1, 14, 1], [3, 18, -1]], fire: 3, ham: [1, 10] },
      { lad: [[8, 20], [5, 18], [8, 20], [5, 18], [12, 19]], co: [[9, 19], [11, 17], [10, 20], [12, 16], [15, 18]], riv: [[]], rate: 1.9, spd: 136, blue: 0.4, hop: 0.48, oil: [2], clm: [[1, 12, -1]], fire: 3, ham: [4, 14], boss: 1 }] }
  ]
};
