/* Tableros a mano de flow-lines (plan Friv, vara de docs/VARA.md).
 * 20 tableros fijos: ninguno se genera al azar al jugar. Cada uno tiene SOLUCIÓN ÚNICA que llena el
 * tablero, demostrada por el resolutor de scripts/check_flowlv.js, que usa EXACTAMENTE las reglas
 * de este fichero (FLOWLV.parse / FLOWLV.canStep / FLOWLV.solved): el motor y el resolutor no
 * tienen dos verdades.
 *
 * Cómo se hicieron: la forma de cada tablero (tamaño, huecos, sitio de puentes y portales) se
 * dibujó a mano; los puntos y las marcas (gemas, señales) se colocaron con ayuda de una búsqueda
 * que reparte el tablero en tuberías y, mientras el resolutor encuentre dos soluciones, añade una
 * marca donde difieren. Por eso cada gema y cada señal hace falta. Quedan fijos aquí: al jugar no
 * se genera nada. Cambiar una planta obliga a volver a pasar el resolutor (y a regenerar `s`).
 *
 * PLANTA — filas de la misma anchura:
 *   .  casilla libre                 #  hueco: no es tablero (formas no rectangulares)
 *   A–J  punto de color (dos por color; A rojo, B azul, C amarillo, D verde, E morado,
 *        F naranja, G rosa, H añil, I lima, J blanco)
 *   +  PUENTE: dos tuberías se cruzan, una en horizontal y otra en vertical; las dos mitades
 *        hay que llenarlas y por el puente no se gira
 *   a–j  GEMA de color: esa casilla solo la puede cruzar la tubería de ese color
 *   1–3  PORTAL (dos casillas con el mismo número): la tubería que entra en uno sale por el
 *        otro; no se puede pasar por encima de un portal sin cruzarlo
 *   =  SEÑAL RECTA: la tubería pasa sin girar      %  SEÑAL CODO: la tubería gira aquí
 *
 * CAMPOS de cada nivel:
 *   n  nombre           i  la idea que enseña (cartel de los primeros segundos)
 *   t  reloj en segundos [fácil, normal, difícil]; 0 = sin reloj (la presión de la tabla)
 *   s2 trazos para 2★ [fácil, normal, difícil]; s3 trazos para 3★ (además sin pista)
 *   p  pistas disponibles [fácil, normal, difícil]
 *   g  la planta
 *   s  la solución única (la usa el botón Pista): pasos R D L U desde el primer punto de cada
 *      color, P = salto de portal. El resolutor comprueba que coincide con la que él encuentra.
 *
 * Un TRAZO es cada vez que se apoya el dedo y se cambia algo. El mínimo es un trazo por color,
 * así que s3 = colores + 2/1/0 y s2 = colores + 6/4/2 (fácil, normal, difícil), más un trazo por
 * cada portal (soltar en la entrada y seguir desde la salida no se castiga). La dificultad
 * cambia márgenes (reloj, pistas, trazos), nunca el tablero.
 */
const FLOWLV = {};

/* =============================================================================================
 * REGLAS PURAS (zona verificable desde Node). El motor y el resolutor llaman a lo mismo.
 * ============================================================================================= */
/* Direcciones: 0 derecha, 1 abajo, 2 izquierda, 3 arriba; 4 = salto de portal. */
const FL_D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
FLOWLV.D = FL_D;

/* parse(lv) → grafo de nodos. Un puente da DOS nodos (mitad horizontal p=1 y vertical p=2); el
   resto de casillas, uno (p=0). Cada nodo: {x, y, p, nb:[[id, dir]], end, req, sign, tw}. */
FLOWLV.parse = function (lv) {
  const g = lv.g, NH = g.length; let NW = 0;
  for (let i = 0; i < NH; i++) NW = Math.max(NW, g[i].length);
  const nodes = [], cell = {}, ends = [], portals = {};
  for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) {
    const ch = g[y][x] || '#';
    if (ch === '#' || ch === ' ') continue;
    const mk = (p) => { const n = { id: nodes.length, x: x, y: y, p: p, nb: [], end: -1, req: -1, sign: 0, tw: -1 }; nodes.push(n); return n.id; };
    if (ch === '+') { cell[x + ',' + y] = { ch: ch, ids: [mk(1), mk(2)] }; continue; }
    const id = mk(0); cell[x + ',' + y] = { ch: ch, ids: [id] };
    const n = nodes[id];
    if (ch >= 'A' && ch <= 'J') { const c = ch.charCodeAt(0) - 65; n.end = c; (ends[c] = ends[c] || []).push(id); }
    else if (ch >= 'a' && ch <= 'j') n.req = ch.charCodeAt(0) - 97;
    else if (ch >= '1' && ch <= '9') (portals[ch] = portals[ch] || []).push(id);
    else if (ch === '=') n.sign = 1;
    else if (ch === '%') n.sign = 2;
  }
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    for (let d = 0; d < 4; d++) {
      if (n.p === 1 && d % 2) continue; if (n.p === 2 && !(d % 2)) continue;
      const q = cell[(n.x + FL_D[d][0]) + ',' + (n.y + FL_D[d][1])]; if (!q) continue;
      n.nb.push([q.ch === '+' ? q.ids[d % 2 ? 1 : 0] : q.ids[0], d]);
    }
  }
  for (const k in portals) { const pr = portals[k]; if (pr.length !== 2) continue; nodes[pr[0]].tw = pr[1]; nodes[pr[1]].tw = pr[0]; nodes[pr[0]].nb.push([pr[1], 4]); nodes[pr[1]].nb.push([pr[0], 4]); }
  return { NW: NW, NH: NH, nodes: nodes, cell: cell, ends: ends, nc: ends.length };
};
FLOWLV.dirOf = function (M, a, b) { const A = M.nodes[a]; for (let i = 0; i < A.nb.length; i++) if (A.nb[i][0] === b) return A.nb[i][1]; return -1; };

/* ¿Puede la tubería de color col que viene de prev (o -1) y está en cur dar un paso a nxt?
   Solo mira la geometría y las marcas (no quién ocupa nxt: eso lo decide quien llama). */
FLOWLV.canStep = function (M, col, prev, cur, nxt) {
  const C = M.nodes[cur], N = M.nodes[nxt];
  const d = FLOWLV.dirOf(M, cur, nxt); if (d < 0) return false;
  if (nxt === prev) return false;
  if (N.end >= 0 && N.end !== col) return false;
  if (N.req >= 0 && N.req !== col) return false;
  if (C.tw >= 0) { const entered = prev !== C.tw; if (entered && nxt !== C.tw) return false; if (!entered && nxt === C.tw) return false; }
  else if (d === 4) return false;
  if (C.sign && prev >= 0) { const di = FLOWLV.dirOf(M, prev, cur); if (di < 4 && d < 4) { if (C.sign === 1 && d !== di) return false; if (C.sign === 2 && d % 2 === di % 2) return false; } }
  /* no se termina encima de una señal ni de un portal: un paso que entra y no puede seguir es legal
     mientras se dibuja; la comprobación final la hace solved() */
  return true;
};

/* ¿Está resuelto? paths[c] = lista de nodos de un extremo al otro del color c. */
FLOWLV.solved = function (M, paths) {
  const own = new Int16Array(M.nodes.length).fill(-1);
  for (let c = 0; c < M.nc; c++) {
    const pa = paths[c]; if (!pa || pa.length < 2) return false;
    const e = M.ends[c];
    if (!((pa[0] === e[0] && pa[pa.length - 1] === e[1]) || (pa[0] === e[1] && pa[pa.length - 1] === e[0]))) return false;
    for (let i = 0; i < pa.length; i++) {
      if (own[pa[i]] >= 0) return false; own[pa[i]] = c;
      if (i > 0 && !FLOWLV.canStep(M, c, i > 1 ? pa[i - 2] : -1, pa[i - 1], pa[i])) return false;
    }
  }
  for (let i = 0; i < own.length; i++) if (own[i] < 0) return false;
  return true;
};

/* Objetivos de estrella y márgenes de cada nivel según la dificultad. */
FLOWLV.goals = function (lv, dif) {
  const M = FLOWLV.parse(lv), nc = M.nc;
  let np = 0; for (const n of M.nodes) if (n.tw >= 0) np++;
  np /= 2;   /* cada portal concede un trazo: soltar en la entrada y seguir desde la salida es legítimo */
  return {
    s2: lv.s2 ? lv.s2[dif] : nc + np + [6, 4, 2][dif],
    s3: lv.s3 ? lv.s3[dif] : nc + np + [2, 1, 0][dif],
    t: lv.t ? lv.t[dif] : 0,
    p: lv.p ? lv.p[dif] : [3, 2, 1][dif]
  };
};

/* =============================================================================================
 * LOS 20 TABLEROS
 * ============================================================================================= */
FLOWLV['flow-lines'] = [
  { n: 'Primeros flujos', i: 'Arrastra de un punto a su pareja y llena todo el tablero', g: [
    '..A..',
    '..BC.',
    '.B...',
    '.D.C.',
    '...DA'],
    s: ['RRDDDD', 'LULDDR', 'DLDR', 'LDRRR'] },
  { n: 'Cinco colores', i: 'Si una tubería estorba, pasa por encima: la cortas', g: [
    '..A.BC',
    '.B....',
    '.D....',
    '......',
    '.D.EC.',
    'AE....'],
    s: ['LLDDDDD', 'LDRDDLULUL', 'DDDDDLU', 'DRDL', 'DLL'] },
  { n: 'Caminos largos', i: 'Pocos colores, tuberías largas: piensa antes de trazar', g: [
    'A.....',
    '....B.',
    '......',
    '..CD..',
    'B.....',
    'D..CA.'],
    s: ['RRRRRDDDDDL', 'LLLLDDD', 'DDR', 'DRUULLLDDDL'] },
  { n: 'Tablero con huecos', i: 'Los huecos no son tablero: no hay que llenarlos', g: [
    'A.###.B',
    '..A....',
    '......B',
    '#..CDC#',
    '.......',
    '...E...',
    '.E###D.'],
    s: ['RDLDRDRUU', 'LDRD', 'UURDRD', 'DDRURDDL', 'ULDLULDDR'] },
  { n: 'Contrarreloj', i: 'Primer reloj: únelo todo antes de que se acabe', t: [150, 95, 70], g: [
    '...A...',
    '.#...#.',
    '.B.C...',
    'AD.#C.E',
    '.......',
    '.#..F#F',
    'DB.E...'],
    s: ['DLULLDDD', 'RDDDDL', 'RUURRDDLDL', 'DLDD', 'DLLLDD', 'DRRU'] },
  { n: 'El primer puente', i: 'Puente: por él se cruzan dos tuberías, una en cada sentido', g: [
    'A.....',
    'BC..CA',
    '..+.D.',
    '......',
    'EBED..',
    '......'],
    s: ['RRRRRD', 'DDRD', 'DRRDLUURR', 'RDLDRDLLU', 'DRRU'] },
  { n: 'Dos puentes', i: 'Las dos mitades de cada puente hay que llenarlas', g: [
    'A......',
    '.....BA',
    'C.+.#..',
    'DBC..E.',
    '.F#.+F.',
    '.....E.',
    '......D'],
    s: ['RRRRRRD', 'LLDLLD', 'URRDD', 'DDDRRRRRR', 'URDDDL', 'DRRRUULDRR'] },
  { n: 'Gemas de color', i: 'Gema: solo la cruza la tubería de su color', g: [
    'A....B',
    'B.....',
    '.AC...',
    '......',
    '.bCa..',
    '......'],
    s: ['RRRRDDDDLUUULLD', 'DDDDDLLLLLURULUU', 'DD'] },
  { n: 'Gemas con prisa', i: 'Huecos, gemas y reloj: empieza por lo que es seguro', t: [135, 85, 65], g: [
    '#A....#',
    '..B....',
    '...#A..',
    '..###a.',
    '..C#D..',
    '.B....D',
    '#C...c#'],
    s: ['RRDRURDRDDLUL', 'DLULDDRDLDR', 'DRRRDLLLL', 'RRD'] },
  { n: 'El gran cruce', i: 'Puentes y gemas a la vez, con reloj. Mitad del camino', t: [225, 140, 105], g: [
    'A......A',
    'B.....BC',
    'D.+.E...',
    '........',
    '.d....E.',
    '.f.D.+F.',
    '..F.....',
    '...f..fC'],
    s: ['RRRRRRR', 'RRDDLURRURRR', 'DDDDDD', 'DDRRDR', 'RRDD', 'LLULURRDDDRDLLULDLLLUURDR'] },
  { n: 'El primer portal', i: 'Portal: entras por uno y sigues desde el otro', g: [
    '1A....',
    '...BC.',
    '.....A',
    '......',
    '....D.',
    'EBCDE1'],
    s: ['RRRRDD', 'LLDDDD', 'DLLDDD', 'RULLDD', 'UUUUUPL'] },
  { n: 'Dos portales', i: 'Cada portal tiene su pareja del mismo color', t: [175, 110, 85], g: [
    'A.B#...',
    '.1C..2C',
    '..D...E',
    '#A....#',
    'F...G.G',
    '.2...1B',
    '.FE#D..'],
    s: ['DDRD', 'LDPDRU', 'RDRUURRD', 'DRDDRD', 'LUPURDD', 'DDR', 'URDR'] },
  { n: 'Señal recta', i: 'Señal recta: la tubería pasa por ella sin girar', g: [
    'A...B=.',
    '....=..',
    '.C.....',
    '.......',
    '..=..=.',
    '.C=BD..',
    '.....AD'],
    s: ['RRRDRRDDLULDLDDDRRR', 'RRDDDDLLLD', 'RULLDDRDLDDRU', 'RRD'] },
  { n: 'Señal codo', i: 'Señal codo: la tubería gira justo ahí', t: [170, 105, 80], g: [
    '..A....',
    '.B...%.',
    '.C..D%.',
    '.....%D',
    '...A%.C',
    '..%....',
    '......B'],
    s: ['RRRRDDLULLLDRDD', 'ULDDDDRDLDRRRRRR', 'DRDDRRRRU', 'DDRUR'] },
  { n: 'Rectas y codos', i: 'Señales y puentes juntos: las señales mandan', g: [
    'A.B.B..C',
    '........',
    '...=D...',
    '.E.+....',
    '....+...',
    '...%....',
    '.A..F.DC',
    '..F=...E'],
    s: ['RDLDDDRRURRDDLDLULLDDRU', 'RR', 'DDDDDD', 'URURDDLDRDDD', 'URURDDDRRDDDRR', 'DLL'] },
  { n: 'Portales y gemas', i: 'Una gema al otro lado de un portal: busca por dónde llega', t: [210, 130, 100], g: [
    '1AB.....',
    '.....d.B',
    '.c.##..C',
    '..2D....',
    '.....2..',
    '..E##...',
    '.....DE.',
    'C..A...1'],
    s: ['DRDDPLLLLDDDRR', 'RDRURRRD', 'DDDDDPDDRDLDDDD', 'RRUURDDDDLD', 'DRRDRRU'] },
  { n: 'La fortaleza', i: 'Huecos, puentes y señales: ve de las esquinas al centro', g: [
    '##...A##',
    '#B.....#',
    'C.+.=...',
    '..A..D..',
    '.....%.B',
    '.....+.E',
    '#.....D#',
    '##.C.E##'],
    s: ['LDLULDDD', 'DRRRRURDRDD', 'DRDLDRDRDR', 'RDLDDR', 'LLLUULDLDRDRDR'] },
  { n: 'Laberinto de portales', i: 'Portales, puentes y gemas con reloj', t: [270, 170, 130], g: [
    '........A',
    '.1..bB.CD',
    '..BE.....',
    '...+a....',
    'AF....C..',
    'F....+...',
    '..G......',
    '.....g.1.',
    '...fG..ED'],
    s: ['LLDDDLULDLLDDRRRRRDDPULDDRDLD', 'ULDLULDD', 'DDDL', 'DDDDDDD', 'DDRRDDRDDR', 'DDDRRDLLLUUU', 'RRDRDL'] },
  { n: 'Todo junto', i: 'Todo lo aprendido en un solo tablero', t: [265, 165, 125], g: [
    '#......A#',
    'A........',
    '..1B..+..',
    '.a..b.CD.',
    '.E..#DB.=',
    '.......%.',
    '..+...1..',
    'E..F...bC',
    '#..=...F#'],
    s: ['LLDLULDLULDDDLUU', 'RDLDLUUPRDLLUURRUL', 'UURRDDDDDD', 'ULLDD', 'LDDD', 'RUULDLLURDDLDRRRRRR'] },
  { n: 'El gran tablero', i: 'El último: todas las ideas a la vez. Llénalo y has terminado', t: [290, 180, 135], g: [
    '#A....%.#',
    'B1.C...2A',
    '....cD.a.',
    '...+.C...',
    '....#E...',
    '.cF..+...',
    '....=..D.',
    'F2..%..1.',
    '#BEG.=.G#'],
    s: ['DPRUUUULURU', 'DRRUURRRDRURDPD', 'RDLDDLLDLUURRRRR', 'RDDRDD', 'DDDRUULLDDLLD', 'RDLLLD', 'RRRR'] }
];

if (typeof module !== 'undefined' && module.exports) module.exports = FLOWLV; /* para el resolutor en Node */
