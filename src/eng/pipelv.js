/* Tableros a mano de pipe-connect (plan Friv, vara de docs/VARA.md).
 * 20 tableros fijos: nada se genera al azar al jugar. Cada uno tiene SOLUCIÓN ÚNICA, demostrada
 * por el resolutor de scripts/check_pipelv.js, que usa EXACTAMENTE las reglas de este fichero
 * (PIPELV.rules): el motor y el resolutor no tienen dos verdades.
 *
 * Cómo se hicieron: la planta de cada tablero (tamaño, rocas, fuentes, casas, puentes y válvulas)
 * se dibujó a mano; la red de tuberías se trazó con ayuda de una búsqueda con semilla fija y,
 * mientras el resolutor encontraba dos soluciones, se atornilló una pieza donde diferían. Por eso
 * cada pieza atornillada hace falta. Al jugar no se genera nada: cambiar una planta obliga a volver
 * a pasar el resolutor.
 *
 * REGLA DEL JUEGO (la misma en el motor y en el resolutor): el tablero está resuelto cuando
 *   - ninguna boca de tubería da al vacío (ni al borde, ni a una roca, ni a una pieza que no le
 *     devuelve la boca): sin fugas;
 *   - cada red de tuberías tiene exactamente UNA fuente (todo lleva agua y no se mezclan colores);
 *   - cada casa recibe el agua de su color;
 *   - (con reloj) todas las válvulas están abiertas.
 *
 * PLANTA (g) — una cadena por fila:
 *   .  pieza que se gira          x  pieza atornillada (no gira)        #  roca (no hay pieza)
 *   A B C  fuente azul / roja / verde (gira)
 *   a b c  casa que pide agua azul / roja / verde (gira; siempre es un final de tubería)
 *   +  puente: dos tuberías se cruzan sin tocarse (una en horizontal y otra en vertical)
 *   v  válvula: tubo recto atornillado con llave; con reloj empieza CERRADA y frena el agua
 * SOLUCIÓN (p): bocas de cada casilla en hexadecimal (arriba 1, derecha 2, abajo 4, izquierda 8).
 * GIROS (r): cuántos giros a la derecha se le dieron a cada pieza para desordenarla (fijos).
 * CAMPOS: n nombre · i la idea (cartel de los primeros segundos) ·
 *   w [espera, paso] del reloj en segundos en normal (0 = sin reloj): el agua sale de las fuentes
 *     a los `espera` segundos y avanza una casilla cada `paso`; lo mojado ya no gira ·
 *   vh segundos que aguanta una válvula cerrada con agua detrás antes de reventar.
 * La dificultad estira o aprieta el reloj (TS) y los objetivos de giros (S2, S3): nunca el tablero.
 */
const PIPELV = {};

PIPELV.rules = (() => {
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const rot = (m) => ((m << 1) | (m >> 3)) & 15; /* un giro a la derecha */
  const rotN = (m, n) => { for (let i = 0; i < (n & 3); i++) m = rot(m); return m; };
  const period = (m) => (m === 0 || m === 15 ? 1 : m === 5 || m === 10 ? 2 : 4);
  const COL = { A: 0, B: 1, C: 2, a: 0, b: 1, c: 2 };
  /* Márgenes por dificultad (fácil, normal, difícil): reloj ×TS, giros para 2★ = ⌈mín×S2⌉,
     giros para 3★ = mín + S3 (y sin pistas), pistas disponibles HN. */
  const TS = [1.4, 1, 0.85], S2 = [1.6, 1.35, 1.2], S3 = [4, 2, 0], HN = [3, 2, 1];

  function parse(lv) {
    const h = lv.g.length, w = lv.g[0].length, n = w * h, B = { w, h, n, kind: [], sol: [], rot: [], col: [], fixed: [], rock: [], cross: [], valve: [], house: [], src: [] };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = lv.g[y][x], i = y * w + x, sol = parseInt(lv.p[y][x], 16), r = lv.r ? +lv.r[y][x] : 0;
      B.kind.push(ch); B.sol.push(sol); B.rot.push(r);
      B.rock.push(ch === '#'); B.cross.push(ch === '+'); B.valve.push(ch === 'v');
      B.fixed.push(ch === 'x' || ch === '#' || ch === '+' || ch === 'v');
      B.col.push(ch in COL ? COL[ch] : -1);
      B.house.push(ch === 'a' || ch === 'b' || ch === 'c');
      if (ch === 'A' || ch === 'B' || ch === 'C') B.src.push(i);
    }
    return B;
  }
  /* Posición de partida: la solución girada lo que diga r (a la derecha). */
  function start(B) { return B.sol.map((m, i) => (B.fixed[i] ? m : rotN(m, B.rot[i]))); }
  const nb = (B, i, d) => { const x = i % B.w + DX[d], y = Math.floor(i / B.w) + DY[d]; return x < 0 || y < 0 || x >= B.w || y >= B.h ? -1 : y * B.w + x; };
  const node = (B, i, d) => (B.cross[i] && (d & 1) === 0 ? 2 * i + 1 : 2 * i); /* puente: arriba/abajo es otro nodo */
  /* Giros mínimos de una casilla (se puede girar a los dos lados) y del tablero. */
  function need(B, m, i) {
    if (B.fixed[i]) return 0; const p = period(B.sol[i]); let r = 0;
    while (r < 4 && rotN(m[i], r) !== B.sol[i]) r++;
    r %= p; return Math.min(r, p - r);
  }
  const minTaps = (B, m) => { let s = 0; for (let i = 0; i < B.n; i++) s += need(B, m, i); return s; };
  const goals = (B, dif) => { const mn = minTaps(B, start(B)); const s2 = Math.ceil(mn * S2[dif]); return { min: mn, s2, s3: Math.min(s2, mn + S3[dif]), hints: HN[dif] }; };

  /* Agua «quieta» (sin reloj): desde cada fuente por las bocas emparejadas. Devuelve por nodo
     el color (-1 seco, -2 mezclado), las fugas y si el tablero está resuelto. `shut(i)` dice si
     la válvula i está cerrada (corta el paso). */
  function evalB(B, m, shut) {
    const N2 = B.n * 2, col = new Int8Array(N2).fill(-1), q = [];
    for (const s of B.src) { col[2 * s] = B.col[s]; q.push(2 * s); }
    const mixed = new Uint8Array(N2);
    while (q.length) {
      const v = q.shift(), i = v >> 1, cc = col[v];
      if (shut && B.valve[i] && shut(i)) continue;
      for (let d = 0; d < 4; d++) {
        if (!(m[i] & (1 << d)) || node(B, i, d) !== v) continue;
        const j = nb(B, i, d), od = (d + 2) & 3; if (j < 0 || B.rock[j] || !(m[j] & (1 << od))) continue;
        const u = node(B, j, od);
        if (col[u] === -1) { col[u] = cc; q.push(u); }
        else if (col[u] !== cc && col[u] !== -2) { col[u] = -2; mixed[u] = 1; q.push(u); }
      }
    }
    /* el mezclado se propaga por toda la red */
    for (let pass = 0; pass < 2; pass++) for (let v = 0; v < N2; v++) if (col[v] === -2) { const i = v >> 1; for (let d = 0; d < 4; d++) { if (!(m[i] & (1 << d)) || node(B, i, d) !== v) continue; const j = nb(B, i, d), od = (d + 2) & 3; if (j < 0 || B.rock[j] || !(m[j] & (1 << od))) continue; const u = node(B, j, od); if (col[u] !== -2) { col[u] = -2; } } }
    const leaks = []; let ok = true, dry = 0, wrongHouse = 0;
    for (let i = 0; i < B.n; i++) {
      if (B.rock[i]) continue;
      for (let d = 0; d < 4; d++) if (m[i] & (1 << d)) { const j = nb(B, i, d); if (j < 0 || B.rock[j] || !(m[j] & (1 << ((d + 2) & 3)))) { leaks.push([i, d]); ok = false; } }
      const nodes = B.cross[i] ? [2 * i, 2 * i + 1] : [2 * i];
      for (const v of nodes) { if (col[v] < 0) { ok = false; if (col[v] === -1) dry++; } }
      if (B.house[i] && col[2 * i] !== B.col[i]) { ok = false; if (col[2 * i] >= 0) wrongHouse++; }
      if (B.valve[i] && shut && shut(i)) ok = false;
    }
    return { ok, col, leaks, dry, wrongHouse };
  }

  /* ---------- Agua con reloj: un paso de avance (lo usan el motor y el bot del verificador) ----------
     S = { wet: Int8Array(2n) color o -1, drip: Set de 'i,d' del paso anterior, open: Uint8Array por casilla (válvulas),
           hold: Float32Array por casilla (segundos de agua parada en una válvula cerrada) }
     Devuelve { fresh: [nodos recién mojados], fail: null | {why, i, d}, drips: [[i,d]], held: [i] } */
  function wetStart(B) { const wet = new Int8Array(B.n * 2).fill(-1); return { wet, drip: new Set(), open: new Uint8Array(B.n), hold: new Float32Array(B.n) }; }
  /* el agua sale: las fuentes se mojan (y ya no giran) */
  function release(B, S) { for (const s of B.src) S.wet[2 * s] = B.col[s]; }
  function wetCell(S, i) { return S.wet[2 * i] >= 0 || S.wet[2 * i + 1] >= 0; }
  function step(B, m, S) {
    const fresh = [], drips = [], held = []; let fail = null; const nd = new Set(), cur = [];
    for (let v = 0; v < B.n * 2; v++) if (S.wet[v] >= 0) cur.push(v); /* solo avanza lo que ya estaba mojado: una casilla por paso */
    for (let k2 = 0; k2 < cur.length && !fail; k2++) {
      const v = cur[k2], cc = S.wet[v], i = v >> 1;
      if (B.valve[i] && !S.open[i]) continue; /* el agua llegó a la válvula cerrada: se queda ahí */
      for (let d = 0; d < 4 && !fail; d++) {
        if (!(m[i] & (1 << d)) || node(B, i, d) !== v) continue;
        const j = nb(B, i, d), od = (d + 2) & 3, key = i + ',' + d;
        if (j < 0 || B.rock[j] || !(m[j] & (1 << od))) {
          if (S.drip.has(key)) fail = { why: 'fuga', i, d };
          else { nd.add(key); drips.push([i, d]); }
          continue;
        }
        const u = node(B, j, od);
        if (S.wet[u] >= 0) { if (S.wet[u] !== cc) fail = { why: 'mezcla', i: j, d: od }; continue; }
        if (B.house[j] && B.col[j] !== cc) { fail = { why: 'casa', i: j, d: od }; continue; }
        if (B.valve[j] && !S.open[j]) { held.push(j); }
        if (fresh.indexOf(u) < 0) { S.wet[u] = cc; fresh.push(u); }
      }
    }
    S.drip = nd;
    /* atasco: el agua ya no puede ir a ningún sitio (ni avanza, ni gotea, ni espera en una válvula)
       y el tablero no está resuelto → lo seco ya no podrá recibir agua nunca */
    if (!fail && !fresh.length && !nd.size) {
      let wait = false, any = -1;
      for (let i = 0; i < B.n; i++) { if (wetCell(S, i) && any < 0) any = i; if (B.valve[i] && !S.open[i] && S.wet[2 * i] >= 0) wait = true; }
      if (!wait && !evalB(B, m, (i) => !S.open[i]).ok) fail = { why: 'atasco', i: any };
    }
    return { fresh, fail, drips, held };
  }

  /* ---------- Resolutor: cuenta soluciones (hasta `cap`) con unión-búsqueda con vuelta atrás ---------- */
  function solve(B, cap, maxNodes) {
    cap = cap || 2; maxNodes = maxNodes || 5e7;
    const n = B.n, N2 = n * 2, m = new Int8Array(n).fill(-1);
    const par = new Int32Array(N2), src = new Int8Array(N2), sc = new Int8Array(N2).fill(-1), hm = new Int8Array(N2), stub = new Int32Array(N2);
    for (let v = 0; v < N2; v++) par[v] = v;
    const log = []; /* [array, index, oldValue] */
    const set = (a, i, v) => { log.push(a, i, a[i]); a[i] = v; };
    const find = (v) => { while (par[v] !== v) v = par[v]; return v; };
    const opts = [];
    for (let i = 0; i < n; i++) {
      if (B.rock[i]) { opts.push([0]); continue; }
      if (B.fixed[i]) { opts.push([B.sol[i]]); continue; }
      const o = []; let q = B.sol[i]; for (let r = 0; r < 4; r++) { if (o.indexOf(q) < 0) o.push(q); q = rot(q); } opts.push(o);
    }
    const sols = []; let nodes = 0, aborted = false;
    const bad = (r) => src[r] > 1 || (hm[r] & (hm[r] - 1)) !== 0 || (src[r] === 1 && hm[r] && hm[r] !== (1 << sc[r]));
    function union(a, b) {
      a = find(a); b = find(b); if (a === b) return a;
      set(par, b, a); set(stub, a, stub[a] + stub[b]);
      if (src[b]) { set(src, a, src[a] + src[b]); if (sc[a] < 0) set(sc, a, sc[b]); }
      set(hm, a, hm[a] | hm[b]); return a;
    }
    function rec(i) {
      if (aborted) return; if (++nodes > maxNodes) { aborted = true; return; }
      if (i === n) { sols.push(Array.from(m)); return; }
      const x = i % B.w, y = (i / B.w) | 0;
      for (const q of opts[i]) {
        if (B.rock[i]) { m[i] = 0; rec(i + 1); m[i] = -1; return; }
        const up = i - B.w, lf = i - 1;
        const wantUp = y > 0 && !B.rock[up] ? (m[up] >> 2) & 1 : 0, wantLf = x > 0 && !B.rock[lf] ? (m[lf] >> 1) & 1 : 0;
        if (((q & 1) ? 1 : 0) !== wantUp || ((q & 8) ? 1 : 0) !== wantLf) continue;
        if ((q & 2) && (x === B.w - 1 || B.rock[i + 1])) continue;
        if ((q & 4) && (y === B.h - 1 || B.rock[i + B.w])) continue;
        const mark = log.length; m[i] = q;
        const vs = B.cross[i] ? [2 * i, 2 * i + 1] : [2 * i];
        for (const v of vs) { let s = 0; for (const d of [1, 2]) if ((q & (1 << d)) && node(B, i, d) === v) s++; set(stub, v, s); }
        if (B.src.indexOf(i) >= 0) { set(src, 2 * i, 1); set(sc, 2 * i, B.col[i]); }
        if (B.house[i]) set(hm, 2 * i, 1 << B.col[i]);
        let ok = true; const touched = [];
        for (const d of [0, 3]) if (q & (1 << d)) {
          const j = d === 0 ? up : lf, u = node(B, j, (d + 2) & 3), ru = find(u); set(stub, ru, stub[ru] - 1);
          const r = union(u, node(B, i, d)); touched.push(r);
        }
        for (const v of vs) touched.push(find(v));
        for (const r0 of touched) { const r = find(r0); if (bad(r) || (stub[r] === 0 && src[r] !== 1)) { ok = false; break; } }
        if (ok) rec(i + 1);
        while (log.length > mark) { const old = log.pop(), idx = log.pop(), a = log.pop(); a[idx] = old; }
        m[i] = -1;
        if (sols.length >= cap || aborted) return;
      }
    }
    rec(0);
    return { count: sols.length, sols, nodes, aborted };
  }
  return { DX, DY, rot, rotN, period, parse, start, nb, node, need, minTaps, goals, evalB, wetStart, release, wetCell, step, solve, TS, S2, S3, HN };
})();

/* <NIVELES> */
PIPELV['pipe-connect'] = [
  { /*  1 */ n: 'Gira y conecta', i: 'Toca una pieza para girarla. Lleva el agua de la fuente a todas las tuberías.',
    g: ['....', '.A..', '....', '....'],
    p: ['2eec', '6915', '7a85', '3a81'],
    r: ['2233', '2221', '3111', '1113'] },
  { /*  2 */ n: 'Sin fugas', i: 'Ninguna boca puede quedar al aire: cada tubo tiene que encajar con su vecino.',
    g: ['.....', '.....', '..A..', '.....', '.....'],
    p: ['6aae8', '52abc', '52aed', '146d1', '2b938'],
    r: ['31132', '12121', '12112', '21133', '33132'] },
  { /*  3 */ n: 'Atornilladas', i: 'Las piezas con tornillos no giran: úsalas de pista para empezar.',
    g: ['.....', '...x.', '.A.x.', '.x...', '.....', '.....'],
    p: ['6ac2c', '12d45', '2ad7d', '6ebd5', '55295', '13a81'],
    r: ['21322', '22301', '21202', '30121', '11331', '12113'] },
  { /*  4 */ n: 'Rocas en medio', i: 'Las rocas no llevan tubería: ninguna boca puede dar a una roca.',
    g: ['......', '.#....', '...A..', '......', '....#.', '#.....'],
    p: ['2aaaac', '4042ad', '3e96ed', '454511', '3bbd04', '02aba9'],
    r: ['111112', '302113', '212131', '212122', '112302', '011113'] },
  { /*  5 */ n: 'El patio', i: 'Un patio con esquinas de roca. Empieza por los bordes: ahí hay menos opciones.',
    g: ['#x....#', '.......', '..#....', 'x..A...', '....#..', '.......', '#.....#'],
    p: ['02ae840', '6c2bc54', '5102d55', '7eeabbd', '1578045', '297a851', '02baa90'],
    r: ['0011210', '1322113', '1203211', '0221133', '1131031', '3121311', '0121110'] },
  { /*  6 */ n: 'Dos fuentes', i: 'Dos fuentes: cada red lleva agua de un solo color. Si se tocan, se mezclan.',
    g: ['......', '.A....', '......', '......', '....B.', '......'],
    p: ['42eaa8', '56b844', '7d42d5', '557eb9', '5113c4', '12aab9'],
    r: ['123113', '122223', '132111', '111231', '133222', '211122'] },
  { /*  7 */ n: 'Casas de colores', i: 'Cada casa pide el agua de su color. Llévasela sin mezclar.',
    g: ['a.....', '......', '..A...', '...B..', '......', '.....b'],
    p: ['446e84', '551785', '3baba9', '6aeaec', '52d451', '1293b8'],
    r: ['223132', '112211', '321211', '111123', '132312', '223231'] },
  { /*  8 */ n: 'El puente', i: 'Puente: dos tuberías se cruzan sin tocarse, una en horizontal y otra en vertical.',
    g: ['......', '.A....', '..+...', '...+..', '....B.', '......'],
    p: ['2eaaa8', '43ea84', '3efc2d', '293fa9', '6eabac', '112aa9'],
    r: ['311113', '332122', '120222', '321012', '131111', '131112'] },
  { /*  9 */ n: 'El agua corre', i: '¡Con reloj! Cuando acaba la cuenta atrás, el agua sale y avanza sola. Lo mojado ya no gira.', w: [35, 3.2],
    g: ['......', '......', '..A...', '......', '...#..', '......'],
    p: ['6aac2c', '7a8145', '3eaeb9', '6d2bec', '554055', '13b811'],
    r: ['311212', '313211', '121122', '323211', '113011', '231312'] },
  { /* 10 */ n: 'La depuradora', i: 'La depuradora: dos colores, dos casas y el agua corriendo. Ve por delante del agua.', w: [51, 3.2],
    g: ['a......', '...#...', '.A.....', '.......', '.....B.', '...#...', '......b'],
    p: ['2c6aa84', '47d0445', '795693d', '7c13c6d', '556ab95', '5150445', '12bab91'],
    r: ['3321131', '3120221', '2312121', '2212232', '1131121', '1110231', '3221322'] },
  { /* 11 */ n: 'La válvula', i: 'Válvula: frena el agua. Tócala para abrirla cuando lo de detrás esté listo; si esperas demasiado, revienta.', w: [35, 3.2], vh: 10,
    g: ['......', '.A....', '......', '...v..', '......', '......'],
    p: ['6a842c', '7c6b85', '57beed', '57c551', '51557c', '381111'],
    r: ['313223', '223111', '113211', '112011', '111123', '111232'] },
  { /* 12 */ n: 'Tres colores', i: 'Tres fuentes y tres casas: azul, roja y verde, cada una por su camino.',
    g: ['a.....x', '...#.xc', '.A.....', '...B...', '.....C.', '.#.....', 'b......'],
    p: ['2c42aec', '6d506d1', '13b8514', '2aac785', '6ae93c5', '1056abd', '2a912a9'],
    r: ['3222130', '3110202', '2113131', '2113311', '3121121', '3012122', '1132312'] },
  { /* 13 */ n: 'Puentes y casas', i: 'Cuatro puentes. Por un puente pasan dos colores sin mezclarse.',
    g: ['.......', '.A...a.', '..+.+..', '.......', '..+.+..', '.b...B.', '.......'],
    p: ['2eac2ac', '694142d', '7afefad', '7c51529', '53faf84', '547a969', '13baab8'],
    r: ['1213311', '1221123', '3103013', '1113122', '1201021', '1331331', '2231111'] },
  { /* 14 */ n: 'Carrera de colores', i: 'Dos colores contra el reloj. Arregla primero lo que está cerca de cada fuente.', w: [46, 3.2],
    g: ['a.....', '......', '.A....', '..#...', '....B.', '......', '.....b'],
    p: ['42c468', '7abb94', '7c2aad', '550445', '53ad55', '7c4179', '113ab8'],
    r: ['222231', '212232', '213112', '110321', '111211', '233222', '113113'] },
  { /* 15 */ n: 'Laberinto de roca', i: 'Un laberinto de rocas con un puente en el centro. Mira bien qué boca da a cada lado.',
    g: ['..#.x..', '.Ax.#.x', '......a', '#..+..#', 'b......', '..#..B.', '....#..'],
    p: ['4406844', '794507d', '3ed52d1', '053fa90', '452d2ac', '5107aad', '3aa9029'],
    r: ['3202023', '2101010', '1121311', '0110130', '2123112', '1101111', '3112031'] },
  { /* 16 */ n: 'Dos válvulas', i: 'Dos válvulas: aguanta el agua en una mientras preparas el otro tramo.', w: [47, 3.2], vh: 12,
    g: ['a......', '.A.....', '...v...', '.......', '...v...', '.....B.', '......b'],
    p: ['46c6844', '3917ebd', '2ec5545', '6d113d5', '13aaad5', '2ac2c51', '2ababb8'],
    r: ['3322112', '2332132', '2220131', '1213211', '2110121', '1132313', '2111223'] },
  { /* 17 */ n: 'Cruce de barrios', i: 'Tres colores, dos puentes y tres casas. Sin reloj: piensa antes de girar.',
    g: ['a......', '.A...#.', '..+....', '...C..c', '....+..', '.#...B.', '.......', 'b......'],
    p: ['42c6aa8', '7ad7c04', '52fd169', '5293eb8', '52aefec', '502d555', '1469115', '2b92aa9'],
    r: ['2132112', '3131202', '1103212', '1312323', '1213022', '1012111', '1321131', '2311113'] },
  { /* 18 */ n: 'Hora punta', i: 'Hora punta: puentes, casas y el agua corriendo a la vez.', w: [57, 3.2],
    g: ['a.....b', '.......', '.A.+...', '.......', '...+.B.', '.......', '..#....', '.......'],
    p: ['2aac2e8', '42ed454', '7abfd79', '7a85578', '56ef93c', '55112c5', '5502ebd', '13a8129'],
    r: ['2113322', '2111113', '2120113', '2121122', '1330223', '1132231', '1102333', '2312112'] },
  { /* 19 */ n: 'La red', i: 'La red: tres fuentes, dos válvulas y poco tiempo. Abre cada válvula a tiempo.', w: [74, 3.2], vh: 12,
    g: ['a.......', '.A......', '...v....', '......c.', '..#..C..', '....v...', '.....B..', 'b.......'],
    p: ['2aeaa844', '46beaa95', '7d456ac5', '15397815', '4102bc45', '3ac2a93d', '6ebeaaed', '112b8291'],
    r: ['21311112', '33311131', '31302131', '11222231', '23031221', '21230131', '23121122', '13213313'] },
  { /* 20 */ n: 'La Gran Fuente', i: 'La Gran Fuente: todo lo aprendido. Tres colores, puentes, válvulas, rocas y el agua corriendo.', w: [64, 3.2], vh: 12,
    g: ['a.......', '.A.x#...', '...+....', '..v.x.c.', '....C...', '.#..+x#.', '...v..B.', '........', 'b......#'],
    p: ['42ac2c2c', '56ad0785', '7d6fe92d', '11557e85', '6a91512d', '5042fc05', '387ab969', '2a92aeb8', '2aaaab80'],
    r: ['23131313', '12100211', '11201313', '22010221', '31131232', '10220001', '22303331', '21121123', '11111210'] },
];
/* </NIVELES> */

if (typeof module !== 'undefined' && module.exports) module.exports = PIPELV;
