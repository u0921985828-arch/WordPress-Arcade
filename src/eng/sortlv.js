/* Estanterías a mano de color-sort (plan Friv). 20 niveles escritos uno a uno: ninguno se
 * genera al azar y todos están verificados con un resolutor propio (A* con cota admisible,
 * óptimo en VERTIDOS, que es lo que cuenta el marcador). El resolutor vive en
 * scripts/check_sortlv.js y usa EXACTAMENTE las reglas de este fichero (SORTLV.parse/pour/won),
 * las mismas que ejecuta el motor: no hay dos verdades.
 *
 * TUBOS — cada tubo es una cadena, de abajo arriba, con opciones tras «|»:
 *   R B Y G P O K N L   bolas de color (rojo, azul, amarillo, verde, morado, naranja, rosa,
 *                       añil, lima)
 *   r b y g p o k n l   la misma bola, pero OCULTA («?»): se descubre al quedar arriba
 *   *                   COMODÍN: se pone encima de cualquier bola y cualquier bola se pone
 *                       encima de él; al final los comodines van juntos en su propio tubo
 *   |3  |5              CAPACIDAD distinta de la normal (4)
 *   |xR                 CANDADO del color R: el tubo no se toca (ni dar ni recibir) hasta que
 *                       el rojo esté completo en otro tubo
 *   |u                  TUBO DE UN SOLO USO: recibe un único vertido y después solo da
 *
 * REGLAS
 *   - Un vertido coge las bolas de arriba que sean del mismo color (o los comodines seguidos de
 *     arriba) y las pasa a otro tubo, todas las que quepan. Solo se vierte sobre el mismo color,
 *     sobre un comodín, con un comodín, o en un tubo vacío. Un vertido = un movimiento.
 *   - Un tubo está COMPLETO cuando guarda TODAS las bolas de un color y solo esas: se tapa con
 *     un corcho y ya no se toca. El nivel se gana con todos los colores completos.
 *
 * CAMPOS de cada nivel:
 *   n  nombre (HUD)            i  la idea que enseña (tarjeta de los primeros segundos)
 *   t  tubos                   m  MÍNIMO de vertidos (resolutor; check_sortlv.js lo comprueba)
 *   s2 objetivo de 2★ [fácil, normal, difícil] (vertidos)
 *   lim LÍMITE de vertidos [f, n, d] (presión: al pasarlo se pierde) — opcional
 *   tm  RELOJ en segundos [f, n, d] (presión: al acabarse se pierde) — opcional
 *
 * s2 = m + 50/30/15 % + 6/3/1 (fácil, normal, difícil). lim = s2 + 40/25/12 % + 4/2/1.
 * tm = 9/7/5,5 s por vertido mínimo + 25/18/12 s. Mismo criterio en los 20 niveles; cambiar
 * un tubo obliga a volver a pasar el resolutor.
 *
 * Estrellas: 1★ terminar · 2★ terminar en s2[dif] vertidos o menos · 3★ eso MÁS sin deshacer y
 * sin pedir pista. La dificultad cambia los márgenes (deshaceres, pistas, s2, límite y reloj),
 * nunca los tubos.
 */
const SORTLV = {};

/* =============================================================================================
 * REGLAS PURAS (zona verificable desde Node). El motor y el resolutor llaman a lo mismo.
 * Estado: { t: [cadenas de abajo arriba], u: máscara de tubos de un uso ya usados }.
 * ============================================================================================= */
SORTLV.COLS = 'RBYGPOKNL*';
SORTLV.CAP = 4;

SORTLV.parse = function (lv) {
  const tubes = [], st = { t: [], u: 0 }, hid = [], cnt = {};
  for (let i = 0; i < lv.t.length; i++) {
    const raw = lv.t[i], bar = raw.indexOf('|'), body = bar < 0 ? raw : raw.slice(0, bar), opt = bar < 0 ? '' : raw.slice(bar + 1);
    const tb = { cap: SORTLV.CAP, lock: '', one: false };
    for (let j = 0; j < opt.length; j++) {
      const ch = opt[j];
      if (ch >= '1' && ch <= '9') tb.cap = +ch;
      else if (ch === 'x') { tb.lock = opt[j + 1]; j++; }
      else if (ch === 'u') tb.one = true;
    }
    let s = ''; const h = [];
    for (let j = 0; j < body.length; j++) { const ch = body[j], up = ch.toUpperCase(); s += up; h.push(ch !== up); cnt[up] = (cnt[up] || 0) + 1; }
    tubes.push(tb); st.t.push(s); hid.push(h);
  }
  const map = { tubes: tubes, cnt: cnt, cols: Object.keys(cnt).sort(), sig: tubes.map((q) => q.cap + (q.lock || '-') + (q.one ? 'u' : '')) };
  return { map: map, st: st, hid: hid };
};

/* Tubo completo (sellado): guarda todas las bolas de su color y solo esas. */
SORTLV.sealed = function (map, s) {
  if (!s.length) return false;
  const c = s[0];
  if (s.length !== map.cnt[c]) return false;
  for (let i = 1; i < s.length; i++) if (s[i] !== c) return false;
  return true;
};
SORTLV.colorDone = function (map, st, c) {
  for (let i = 0; i < st.t.length; i++) if (st.t[i][0] === c && SORTLV.sealed(map, st.t[i])) return true;
  return false;
};
SORTLV.locked = function (map, st, i) { const L = map.tubes[i].lock; return !!L && !SORTLV.colorDone(map, st, L); };
/* Bolas que se moverían de a a b (0 = no se puede). */
SORTLV.amount = function (map, st, a, b) {
  if (a === b) return 0;
  const A = st.t[a], B = st.t[b], tb = map.tubes[b];
  if (!A.length || B.length >= tb.cap) return 0;
  if (tb.one && (st.u & (1 << b))) return 0;
  if (SORTLV.sealed(map, A) || SORTLV.sealed(map, B)) return 0;
  if (SORTLV.locked(map, st, a) || SORTLV.locked(map, st, b)) return 0;
  const x = A[A.length - 1];
  if (B.length) { const y = B[B.length - 1]; if (x !== y && x !== '*' && y !== '*') return 0; }
  let run = 0; for (let i = A.length - 1; i >= 0 && A[i] === x; i--) run++;
  return Math.min(run, tb.cap - B.length);
};
SORTLV.pour = function (map, st, a, b) {
  const n = SORTLV.amount(map, st, a, b);
  if (!n) return null;
  const t = st.t.slice(), A = t[a], x = A[A.length - 1];
  t[a] = A.slice(0, A.length - n); t[b] = t[b] + x.repeat(n);
  return { st: { t: t, u: map.tubes[b].one ? (st.u | (1 << b)) : st.u }, n: n, c: x };
};
SORTLV.won = function (map, st) {
  for (let i = 0; i < st.t.length; i++) if (st.t[i].length && !SORTLV.sealed(map, st.t[i])) return false;
  return true;
};
SORTLV.doneCount = function (map, st) { let n = 0; for (let i = 0; i < st.t.length; i++) if (SORTLV.sealed(map, st.t[i])) n++; return n; };
/* Clave canónica: tubos del mismo tipo (capacidad, candado, un uso y si ya se usó) son
   intercambiables, así que se ordenan dentro de su grupo. */
SORTLV.key = function (map, st) {
  const a = new Array(st.t.length);
  for (let i = 0; i < st.t.length; i++) a[i] = map.sig[i] + ((st.u >> i) & 1) + ':' + st.t[i];
  a.sort(); return a.join('|');
};
/* Cota admisible: cada vertido quita como mucho un tramo de color del total, y al final queda
   un tramo por color. */
SORTLV.h = function (map, st) {
  let runs = 0;
  for (let i = 0; i < st.t.length; i++) { const s = st.t[i]; if (!s.length) continue; runs++; for (let j = 1; j < s.length; j++) if (s[j] !== s[j - 1]) runs++; }
  return Math.max(0, runs - map.cols.length);
};
/* A* (w = 1: óptimo; w > 1: rápido, para la pista). Devuelve { d, path: [[a,b],…], n } o null. */
SORTLV.solve = function (map, st0, opt) {
  opt = opt || {};
  const w = opt.w || 1, cap = opt.cap || 3e6;
  const k0 = SORTLV.key(map, st0), g = new Map([[k0, 0]]), par = new Map([[k0, null]]);
  const buckets = []; let fmin = 0, n = 0;
  const push = (f, item) => { (buckets[f] || (buckets[f] = [])).push(item); if (f < fmin) fmin = f; };
  push(Math.ceil(w * SORTLV.h(map, st0)), [st0, k0, 0]);
  const N = st0.t.length;
  while (true) {
    while (fmin < buckets.length && !(buckets[fmin] && buckets[fmin].length)) fmin++;
    if (fmin >= buckets.length) return null;
    const [st, key, gs] = buckets[fmin].pop();
    if (g.get(key) !== gs) continue;
    if (SORTLV.won(map, st)) {
      const path = []; let q = key;
      while (par.get(q)) { const p = par.get(q); path.push([p[1], p[2]]); q = p[0]; }
      return { d: gs, path: path.reverse(), n: n };
    }
    if (++n > cap) return null;
    for (let a = 0; a < N; a++) {
      if (!st.t[a].length) continue;
      for (let b = 0; b < N; b++) {
        const r = SORTLV.pour(map, st, a, b);
        if (!r) continue;
        /* volcar un tubo entero de un solo color en uno vacío del mismo tipo no cambia nada */
        if (!st.t[b].length && r.n === st.t[a].length && map.sig[a] === map.sig[b] && !map.tubes[b].one) continue;
        const kk = SORTLV.key(map, r.st), ng = gs + 1, old = g.get(kk);
        if (old !== undefined && old <= ng) continue;
        g.set(kk, ng); par.set(kk, [key, a, b]);
        push(ng + Math.ceil(w * SORTLV.h(map, r.st)), [r.st, kk, ng]);
      }
    }
  }
};
/* Objetivos de la dificultad d (0 fácil, 1 normal, 2 difícil). */
SORTLV.goal = function (lv, d) {
  return { s2: lv.s2[d], lim: lv.lim ? lv.lim[d] : 0, tm: lv.tm ? lv.tm[d] : 0 };
};
/* Deshaceres y pistas por dificultad (el recurso que aprieta; los tubos no cambian). */
SORTLV.UNDO = [12, 5, 2];
SORTLV.HINT = [3, 2, 1];

/* =============================================================================================
 * LOS 20 NIVELES
 * ============================================================================================= */
SORTLV['color-sort'] = [
  { n: "Primer reparto", m: 10, s2: [21,16,13],
    t: ['RYBR', 'BYRY', 'YBRB', '', ''],
    i: "Toca un tubo para levantar la bola de arriba y otro para soltarla. Solo cae sobre su mismo color o en un tubo vacío." },
  { n: "Cuatro colores", m: 14, s2: [27,22,18],
    t: ['RBGY', 'YGRB', 'BRYG', 'GYBR', '', ''],
    i: "Si arriba hay varias bolas del mismo color, se vierten juntas: un solo movimiento." },
  { n: "La cadena", m: 16, s2: [30,24,20],
    t: ['RPGY', 'BGRP', 'YBPG', 'PYBR', 'GRYB', '', ''],
    i: "Junta color sobre color sin parar: cada acierto seguido suena más alto." },
  { n: "Bolas tapadas", m: 13, s2: [26,20,16],
    t: ['rbGY', 'gyRB', 'byGR', 'ygBR', '', ''],
    i: "NUEVO: las bolas «?» esconden su color. Se descubren al quedar arriba." },
  { n: "A ciegas", m: 17, s2: [32,26,21],
    t: ['yrBP', 'gpRY', 'bgYG', 'prBR', 'GBPY', '', ''],
    i: "Más «?»: destapa primero los tubos que más esconden." },
  { n: "Tubos cortos", m: 14, s2: [27,22,18],
    t: ['RBGY', 'GYRB', 'YRBG', 'BGYR', '|2', '|2'],
    i: "NUEVO: no todos los tubos son iguales. En los de dos no cabe un color entero: úsalos de apoyo." },
  { n: "Vertidos contados", m: 15, s2: [29,23,19], lim: [45,31,23],
    t: ['GRRB', 'PYBG', 'YPGR', 'BBYP', 'RGPY', '', ''],
    i: "NUEVO: hay un límite de vertidos arriba a la derecha. Si se acaba, se pierde." },
  { n: "El candado", m: 13, s2: [26,20,16],
    t: ['RGBY', 'GRYG', 'BRGY', 'RB', 'YB|xR', '', ''],
    i: "NUEVO: el tubo con candado no se toca hasta que completes su color en otro tubo." },
  { n: "Llave verde", m: 16, s2: [30,24,20], lim: [46,32,24],
    t: ['rgBP', 'ypGR', 'bRYG', 'pbYB', 'GR', 'PY|xG', '', ''],
    i: "Candado y bolas tapadas, con los vertidos contados." },
  { n: "Contra el reloj", m: 19, s2: [35,28,23], tm: [196,151,117],
    t: ['rbOG', 'ygPB', 'opRY', 'gyBO', 'brGP', 'YO', 'PR|xB', '', ''],
    i: "NUEVO: la barra de arriba es un reloj. Ordénalo antes de que se vacíe." },
  { n: "Un solo uso", m: 14, s2: [27,22,18],
    t: ['RBYG', 'YGBR', 'GRYB', 'BYRG', '|u', '|2'],
    i: "NUEVO: el tubo naranja con un 1 recibe un único vertido. Después solo da." },
  { n: "Cristal fino", m: 17, s2: [32,26,21], lim: [49,35,25],
    t: ['RPYB', 'GBPR', 'YGRP', 'BYGR', 'PBYG', '|u', '|2'],
    i: "Tubo de un uso, tubo pequeño y vertidos contados: piensa cuándo gastarlo." },
  { n: "El comodín", m: 15, s2: [29,23,19],
    t: ['RB*G', 'GYRB', 'BGY*', 'YRGB', 'YR', ''],
    i: "NUEVO: la bola de la estrella va sobre cualquier color y cualquier color va sobre ella. Al final, los comodines juntos." },
  { n: "Estrellas tapadas", m: 17, s2: [32,26,21], tm: [178,137,106],
    t: ['rb*Y', 'pgRB', 'yrGP', 'gp*R', 'bYBG', 'PY', ''],
    i: "Comodines y «?» con reloj: el comodín te saca de un apuro." },
  { n: "La llave roja", m: 21, s2: [38,31,26], lim: [58,41,31],
    t: ['RO*B', 'GPYR', 'BYOG', 'PB*Y', 'OGRP', 'YRBG', 'OP|xR', '', ''],
    i: "Comodines, candado y vertidos contados." },
  { n: "Hueco de una", m: 21, s2: [38,31,26],
    t: ['roGB', 'pyRO', 'gbYP', 'ygBR', 'obPG', 'RY', 'PO|xY', '|u', '|1'],
    i: "Candado, un solo uso, tapadas y un tubo de una sola bola." },
  { n: "Ocho colores", m: 26, s2: [45,37,31], lim: [67,49,36],
    t: ['ROGK', 'PBY*', 'KYRB', 'GOPY', 'BKO*', 'YRGP', 'NNKB', 'ONPG', 'RN', '|5', '|3'],
    i: "Un tubo grande de cinco y uno de tres. Muchos colores y vertidos contados." },
  { n: "Doble cerrojo", m: 23, s2: [41,33,28], tm: [232,179,139],
    t: ['rbPK', 'ogYR', 'kpBG', 'yrOB', 'gkPY', 'GO', 'BR|xK', 'KP|xY', 'OY', '', ''],
    i: "Dos candados: completa el rosa y el amarillo para abrirlos. Con reloj." },
  { n: "Todo junto", m: 28, s2: [48,40,34], lim: [72,52,40],
    t: ['ROGK', 'pbY*', 'kyRN', 'gOPB', 'nKo*', 'YRGP', 'BNKY', 'ONPG', 'BR|xN', '', '|u', '|3'],
    i: "Tapadas, comodines, candado, un solo uso y un tubo corto. Vertidos contados." },
  { n: "El gran almacén", m: 31, s2: [53,44,37], lim: [79,57,43], tm: [304,235,183],
    t: ['rogK', 'pbY*', 'kyRN', 'gOlB', 'nKo*', 'yRGL', 'bNKP', 'oLPG', 'BR|xN', 'LY|xG', 'PN', '|u', '|3'],
    i: "FINAL: nueve colores y comodines, dos candados, reloj y vertidos contados. Todo lo aprendido." },
];

if (typeof module !== 'undefined' && module.exports) module.exports = SORTLV;
