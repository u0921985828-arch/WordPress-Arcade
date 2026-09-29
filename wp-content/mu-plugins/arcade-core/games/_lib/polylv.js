/* Siluetas a mano de tangram-studio (plan Friv / la vara).
 *
 * 20 figuras DIBUJADAS UNA A UNA (casa, barco, árbol, pez…): la silueta de cada nivel se
 * escribió a mano casilla a casilla y luego se partió UNA SOLA VEZ en piezas de 3 a 6
 * casillas con un resolutor exhaustivo; la partición queda congelada aquí, así que en el
 * juego no hay nada al azar: el mismo nivel es siempre el mismo reto.
 *
 * Cada nivel es una rejilla de texto donde cada LETRA es una pieza y el '.' es fuera de la
 * figura. La unión de todas las letras es la silueta; la partición por letras ES la
 * solución (por eso siempre se puede terminar).
 *
 * CAMPOS de cada nivel:
 *   n  nombre de la figura (se lee en el HUD y en la tarjeta)
 *   i  la idea nueva que enseña
 *   g  la rejilla (filas de la misma anchura)
 *   m2 movimientos para la 2ª estrella en normal (una colocación buena = 1 movimiento)
 *   f  letra de la pieza que empieza YA COLOCADA y no se puede mover   — desde el 10
 *   x  letras de las piezas que hay que VOLTEAR (espejo obligatorio)   — desde el 8
 *   d  piezas SEÑUELO que sobran (no caben en la figura), rejillas de '#' — desde el 13
 *
 * Verificado en Node: cada letra forma un poliminó conexo de 3 a 6 casillas, el área de las
 * piezas es exactamente el área de la silueta, las piezas van de 5 a 12, las marcadas en `x`
 * son de verdad quirales (su espejo no se consigue girando) y ningún señuelo es congruente
 * con ninguna pieza de la solución.
 */
const POLYLV = (function () {
/* <LV> ---- zona pura (se puede requerir desde Node) ---- */
const G = {
  'tangram-studio': [
    { n: 'La casa', i: 'Arrastra cada pieza a su hueco. Tócala para girarla.', m2: 7, g: [
      '..AB..',
      '.CABD.',
      'CCABDD',
      '.CABB.',
      '.EEEE.',
      '.E..E.'] },
    { n: 'El barco', i: 'Empieza por las piezas grandes: dejan menos huecos raros.', m2: 7, g: [
      '...A..',
      '...AB.',
      '...ABB',
      'CCCADD',
      '.CEDD.',
      '..EE..'] },
    { n: 'El árbol', i: 'Una pieza solo entra en una postura: gírala antes de soltarla.', m2: 7, g: [
      '..AA..',
      '.BACD.',
      'BBACDD',
      '.BECD.',
      '..EC..',
      '..EE..'] },
    { n: 'El pez', i: 'Las puntas son piezas pequeñas: guárdalas para el final.', m2: 8, g: [
      '..AAB...',
      '.CAABB.D',
      'CCEEBDDD',
      '.CFEEE.D',
      '..FFF...'] },
    { n: 'La llave', i: 'Figuras con agujero: el hueco del centro tambien hay que dejarlo libre.', m2: 8, g: [
      '.AAB.',
      'CABBD',
      'CA.BD',
      'CCEBD',
      '.CEE.',
      '..E..',
      '..E..',
      '..F..',
      '.FFF.',
      '..F..'] },
    { n: 'El gato', i: 'Cabeza, cuerpo y patas se resuelven por separado.', m2: 8, g: [
      'A....B',
      'AC..BB',
      'ACCDDB',
      'AACDEB',
      '.FCDE.',
      '.FFFE.',
      '.F..E.'] },
    { n: 'El cohete', i: 'Simetría: lo que va a un lado va igual al otro, pero al revés.', m2: 9, g: [
      '..AB..',
      '..AB..',
      '.CABB.',
      '.CADD.',
      'CCEFDD',
      'GGEFFF',
      'G.EE.F'] },
    { n: 'La bandera', i: 'La pieza marcada con espejo está del revés: VOLTEAR, girar no basta.', m2: 9, x: 'B', g: [
      'AABCCC',
      'AABBBC',
      'DDDDEE',
      'FFDEEE',
      'FF....',
      'GG....',
      'GG....'] },
    { n: 'El molino', i: 'Dos piezas del revés a la vez: mira bien la forma antes de soltar.', m2: 9, x: 'AB', g: [
      '.AA.BC.',
      '.DA.BC.',
      'DDABBCC',
      '.DE.FF.',
      '.EE.FF.',
      '..EGF..',
      '..GGG..'] },
    { n: 'La tortuga', i: 'La pieza gris ya está puesta y no se mueve: construye alrededor.', m2: 11, f: 'C', g: [
      '..ABBBB..',
      '.CAADDEE.',
      'CCCAFDDEE',
      '.GCFFHHH.',
      'GG.FFH.HH'] },
    { n: 'El castillo', i: 'Con una pieza fija y otra del revés, el orden importa.', m2: 11, f: 'E', x: 'A', g: [
      'A.B.C.D.E',
      'AABBCCDDE',
      'FAGBCCDEE',
      'FFG...HHE',
      'FGG...HHH'] },
    { n: 'El faro', i: 'Torres altas: las piezas largas se colocan de pie.', m2: 11, f: 'A', g: [
      '..ABB..',
      '..ABB..',
      '.AACDD.',
      '..CCD..',
      '..ECD..',
      '..EFF..',
      '.GEHFF.',
      'GGEHHHH'] },
    { n: 'El pingüino', i: 'En la bandeja sobra una pieza: NO cabe. Averigua cuál.', m2: 12, f: 'B', d: [['####']], g: [
      '..AABC..',
      '.DAABCC.',
      'EDDDBBCF',
      'EEEGGFFF',
      '.HHGGII.',
      'HH....II'] },
    { n: 'La mariposa', i: 'Señuelo y espejo juntos: comprueba la forma antes de arrastrar.', m2: 12, f: 'I', x: 'B', d: [['###', '.#.']], g: [
      'AA.....BB',
      'AAC...DBE',
      'FCCGDDDBE',
      'FCHGGGGEE',
      'FHH...III',
      'FH.....II'] },
    { n: 'La corona', i: 'Tres puntas iguales, tres piezas distintas.', m2: 12, f: 'A', d: [['##', '##']], g: [
      'A...B...C',
      'AD.BBE.CC',
      'ADDFBEEEC',
      'AGDFFHIII',
      'GGGFHHHII'] },
    { n: 'El caracol', i: 'Figura grande: divide la silueta en zonas y ve por partes.', m2: 13, f: 'B', d: [['##', '##']], g: [
      '..ABBBB...',
      '.CADDBEE..',
      'CCAADDDEE.',
      'CCFAGGGGE.',
      '.HFFFFGI.I',
      'HHHJJJJIII'] },
    { n: 'El dragón pequeño', i: 'Diez piezas: reserva las pequeñas para las puntas.', m2: 13, f: 'A', x: 'C', d: [['##', '##']], g: [
      '...AB...CC.',
      '..DABB.ECF.',
      'GGDABHHECFF',
      '.GDAHHEEIF.',
      '.JD.....II.',
      'JJ.......II'] },
    { n: 'El reloj de arena', i: 'La cintura del centro solo admite una pieza: encuéntrala pronto.', m2: 15, f: 'B', d: [['##', '##']], g: [
      'AABBBCDD',
      'AAABCCCD',
      '.EEBFGC.',
      '..EFFG..',
      '..EEFG..',
      '.HHHFGG.',
      'IIHHJJKK',
      'IIIJJKKK'] },
    { n: 'El elefante', i: 'Figura ancha con patas: las patas son tiras de tres.', m2: 15, f: 'B', x: 'A', d: [['##', '##']], g: [
      '..ABBC......',
      '.DAABCC.....',
      'DDEABCFFF...',
      'GDEEBHFFIJJJ',
      'GDEKHHHHIIJJ',
      'G..KK..II..J'] },
    { n: 'El gran dragón', i: 'El reto grande: doce piezas, dos del revés, una fija y un señuelo.', m2: 16, f: 'K', x: 'CD', d: [['##', '##']], g: [
      '..ABB....CDD.',
      '.EAABB..CCDDD',
      'EEEAABFGHCCII',
      'JJEKFFFGHHHII',
      '.JKKKKFGGGHI.',
      '.JK.......LL.',
      'JJ.........LL'] }
  ]
};

/* ---- utilidades puras ---- */
function cellsOf(lv) {
  const map = {}; let area = 0;
  for (let y = 0; y < lv.g.length; y++) { const row = lv.g[y];
    for (let x = 0; x < row.length; x++) { const ch = row.charAt(x); if (ch === '.' || ch === ' ') continue;
      (map[ch] = map[ch] || []).push([x, y]); area++; } }
  return { map: map, area: area, w: Math.max.apply(null, lv.g.map(function (r) { return r.length; })), h: lv.g.length };
}
function norm(sh) {
  const mx = Math.min.apply(null, sh.map(function (q) { return q[0]; }));
  const my = Math.min.apply(null, sh.map(function (q) { return q[1]; }));
  return sh.map(function (q) { return [q[0] - mx, q[1] - my]; }).sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
}
const rot90 = function (sh) { return norm(sh.map(function (q) { return [-q[1], q[0]]; })); };
const mirror = function (sh) { return norm(sh.map(function (q) { return [-q[0], q[1]]; })); };
const key = function (sh) { return norm(sh).map(function (q) { return q.join(); }).join(';'); };
/* Las 4 posturas por giro. Si el espejo no está entre ellas, la pieza es quiral. */
function rots(sh) { const out = [], seen = {}; let s = norm(sh);
  for (let i = 0; i < 4; i++) { const k2 = key(s); if (!seen[k2]) { seen[k2] = 1; out.push(s); } s = rot90(s); }
  return out; }
function chiral(sh) { const m = key(mirror(sh)); return !rots(sh).some(function (r) { return key(r) === m; }); }
/* Todas las posturas jugables: 4 giros, y 4 más con el espejo. */
function poses(sh, flipOK) {
  const out = [], seen = {};
  const add = function (s) { const k2 = key(s); if (!seen[k2]) { seen[k2] = 1; out.push(norm(s)); } };
  rots(sh).forEach(add); if (flipOK) rots(mirror(sh)).forEach(add);
  return out;
}
function levels(slug) { return G[slug] || null; }
/* </LV> */
return { G: G, cellsOf: cellsOf, norm: norm, rot90: rot90, mirror: mirror, key: key,
  rots: rots, chiral: chiral, poses: poses, levels: levels };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = POLYLV; /* para el verificador en Node */
