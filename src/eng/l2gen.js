/* L2GEN — generadores puros de los puzles lógicos de logica2.js.
 *
 * Cada generador devuelve un puzle con **solución única verificada por fuerza bruta**
 * (puentes, estrellas, tiendas, gatos), o con **solución garantizada por construcción**
 * (suma: la rejilla se teja entera en dominós que suman 10, así que siempre se puede vaciar).
 *
 * No depende de Kit ni de ART: se prueba en Node igual que las reglas de `baraja` o `domino`.
 *   node -e "eval(require('fs').readFileSync('src/eng/l2gen.js','utf8')); ..."
 */
var L2GEN = (function () {
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /* ================= PUENTES (hashi) ================= */
  /* Aristas candidatas: parejas de islas alineadas sin ninguna isla en medio. */
  function pzCand(isl) {
    const cand = [];
    for (let i = 0; i < isl.length; i++) for (let j = i + 1; j < isl.length; j++) {
      const A = isl[i], B = isl[j];
      if (A.x === B.x) {
        const lo = Math.min(A.y, B.y), hi = Math.max(A.y, B.y);
        if (hi - lo < 2 || isl.some((q) => q.x === A.x && q.y > lo && q.y < hi)) continue;
        cand.push({ i, j, v: 1, lo, hi, p: A.x });
      } else if (A.y === B.y) {
        const lo = Math.min(A.x, B.x), hi = Math.max(A.x, B.x);
        if (hi - lo < 2 || isl.some((q) => q.y === A.y && q.x > lo && q.x < hi)) continue;
        cand.push({ i, j, v: 0, lo, hi, p: A.y });
      }
    }
    return cand;
  }
  const pzCross = (a, b) => a.v !== b.v && (a.v ? (b.lo < a.p && a.p < b.hi && a.lo < b.p && b.p < a.hi) : (a.lo < b.p && b.p < a.hi && b.lo < a.p && a.p < b.hi));

  /* Cuenta soluciones (hasta `limit`): grados exactos, sin cruces y todo conectado. */
  let pzSol = null;
  function puentesCount(isl, limit) {
    const cand = pzCand(isl), E = cand.length, n = isl.length;
    const cross = cand.map((a, i) => cand.map((b, j) => i !== j && pzCross(a, b)).map((v, j) => (v ? j : -1)).filter((j) => j >= 0));
    /* capacidad que queda por detrás de cada arista, por isla (poda) */
    const cap = []; { const cur = Array(n).fill(0); cap[E] = cur.slice(); for (let e = E - 1; e >= 0; e--) { cur[cand[e].i] += 2; cur[cand[e].j] += 2; cap[e] = cur.slice(); } }
    const deg = Array(n).fill(0), val = Array(E).fill(0);
    let count = 0, nodes = 0;
    function ok() {
      for (let i = 0; i < n; i++) if (deg[i] !== isl[i].n) return false;
      const seen = new Uint8Array(n); const st = [0]; seen[0] = 1; let m = 1;
      const adj = Array.from({ length: n }, () => []);
      for (let e = 0; e < E; e++) if (val[e]) { adj[cand[e].i].push(cand[e].j); adj[cand[e].j].push(cand[e].i); }
      while (st.length) { const u = st.pop(); for (const w of adj[u]) if (!seen[w]) { seen[w] = 1; m++; st.push(w); } }
      return m === n;
    }
    function rec(e) {
      if (count >= limit || ++nodes > 400000) return;
      if (e === E) { if (ok()) { count++; if (count === 1) pzSol = cand.map((q, i) => ({ i: q.i, j: q.j, c: val[i] })).filter((q) => q.c); } return; }
      for (let i = 0; i < n; i++) if (deg[i] + cap[e][i] < isl[i].n) return;
      const a = cand[e].i, b = cand[e].j;
      const blocked = cross[e].some((j) => j < e && val[j] > 0);
      const max = blocked ? 0 : Math.min(2, isl[a].n - deg[a], isl[b].n - deg[b]);
      for (let v = 0; v <= max; v++) { val[e] = v; deg[a] += v; deg[b] += v; rec(e + 1); deg[a] -= v; deg[b] -= v; }
      val[e] = 0;
    }
    pzSol = null;
    rec(0);
    return nodes > 400000 ? 99 : count;
  }

  function puentes(N, want) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const occ = new Map(), isl = [];
      const key = (x, y) => x + ',' + y;
      const add = (x, y) => { const o = { x, y, n: 0 }; isl.push(o); occ.set(key(x, y), 1); return o; };
      add(ri(0, N - 1), ri(0, N - 1));
      let guard = 0;
      while (isl.length < want && guard++ < 600) {
        const a = pick(isl), d4 = pick(D4), d = ri(2, Math.min(4, N - 1));
        const tx = a.x + d4[0] * d, ty = a.y + d4[1] * d;
        if (tx < 0 || ty < 0 || tx >= N || ty >= N || occ.has(key(tx, ty))) continue;
        if (D4.some((q) => occ.get(key(tx + q[0], ty + q[1])) === 1)) continue;
        let clear = true;
        for (let s = 1; s < d; s++) if (occ.has(key(a.x + d4[0] * s, a.y + d4[1] * s))) { clear = false; break; }
        if (!clear) continue;
        const cnt = Math.random() < 0.4 ? 2 : 1;
        if (a.n + cnt > 8) continue;
        const b = add(tx, ty);
        for (let s = 1; s < d; s++) occ.set(key(a.x + d4[0] * s, a.y + d4[1] * s), 2);
        a.n += cnt; b.n += cnt;
      }
      if (isl.length < want) continue;
      /* aristas extra entre islas ya colocadas: dan más pistas y evitan el árbol puro */
      for (let t = 0; t < want * 3; t++) {
        const a = pick(isl), d4 = pick(D4);
        let b = null;
        for (let d = 2; d < N; d++) {
          const tx = a.x + d4[0] * d, ty = a.y + d4[1] * d;
          if (tx < 0 || ty < 0 || tx >= N || ty >= N) break;
          const o = occ.get(key(tx, ty));
          if (o === 2) break;
          if (o === 1) { b = isl.find((q) => q.x === tx && q.y === ty); break; }
        }
        if (!b || a.n >= 8 || b.n >= 8) continue;
        let free = true;
        for (let s = 1; s < Math.abs(b.x - a.x) + Math.abs(b.y - a.y); s++) if (occ.has(key(a.x + d4[0] * s, a.y + d4[1] * s))) { free = false; break; }
        if (!free) continue;
        for (let s = 1; s < Math.abs(b.x - a.x) + Math.abs(b.y - a.y); s++) occ.set(key(a.x + d4[0] * s, a.y + d4[1] * s), 2);
        a.n++; b.n++;
      }
      if (isl.some((q) => q.n < 1)) continue;
      const plain = isl.map((q) => ({ x: q.x, y: q.y, n: q.n }));
      if (puentesCount(plain, 2) === 1) return { mode: 'puentes', N, isl: plain };
    }
    return null;
  }

  /* ================= ESTRELLAS (star battle, 1 por fila/columna/región) ================= */
  function estrellasCount(N, reg, limit) {
    const col = Array(N).fill(false), rg = Array(N).fill(false);
    let count = 0, prev = -9;
    const stack = [];
    function rec(r, last) {
      if (count >= limit) return;
      if (r === N) { count++; return; }
      for (let x = 0; x < N; x++) {
        if (col[x] || rg[reg[r * N + x]]) continue;
        if (Math.abs(x - last) <= 1) continue;
        col[x] = true; rg[reg[r * N + x]] = true;
        rec(r + 1, x);
        col[x] = false; rg[reg[r * N + x]] = false;
      }
    }
    rec(0, -9);
    return count;
  }
  function estrellas(N) {
    for (let a = 0; a < 200; a++) {
      /* solución: una estrella por fila y columna, sin tocarse ni en diagonal */
      const p = [];
      let okp = true;
      const used = Array(N).fill(false);
      for (let r = 0; r < N; r++) {
        const opts = [];
        for (let x = 0; x < N; x++) if (!used[x] && (r === 0 || Math.abs(x - p[r - 1]) > 1)) opts.push(x);
        if (!opts.length) { okp = false; break; }
        const x = pick(opts); p.push(x); used[x] = true;
      }
      if (!okp) continue;
      for (let tries = 0; tries < 14; tries++) {
        /* regiones: crecimiento aleatorio desde cada estrella hasta cubrir el tablero */
        const reg = Array(N * N).fill(-1), front = [];
        for (let r = 0; r < N; r++) { reg[r * N + p[r]] = r; front.push([r]); }
        let left = N * N - N;
        let guard = 0;
        while (left > 0 && guard++ < N * N * 40) {
          const i = ri(0, N - 1), f = front[i];
          if (!f.length) continue;
          const cells = [];
          for (const c of f) { const x = c % N, y = (c / N) | 0; for (const d of D4) { const nx = x + d[0], ny = y + d[1]; if (nx >= 0 && ny >= 0 && nx < N && ny < N && reg[ny * N + nx] < 0) cells.push(ny * N + nx); } }
          if (!cells.length) continue;
          const c2 = pick(cells); reg[c2] = i; f.push(c2); left--;
        }
        if (left > 0) continue;
        for (let r = 0; r < N; r++) reg[r * N + p[r]] = r;
        if (estrellasCount(N, reg, 2) === 1) return { mode: 'estrellas', N, reg, sol: p.slice() };
      }
    }
    return null;
  }

  /* ================= TIENDAS Y ÁRBOLES ================= */
  function match(tents, trees, N) {
    /* emparejamiento perfecto tienda↔árbol ortogonalmente vecino (caminos aumentantes) */
    if (tents.length !== trees.length) return false;
    const ti = new Map(); trees.forEach((t, i) => ti.set(t, i));
    const adj = tents.map((c) => { const x = c % N, y = (c / N) | 0, r = []; for (const d of D4) { const j = ti.get((y + d[1]) * N + x + d[0]); if (j !== undefined && x + d[0] >= 0 && x + d[0] < N && y + d[1] >= 0 && y + d[1] < N) r.push(j); } return r; });
    const mt = Array(trees.length).fill(-1);
    const aug = (u, seen) => { for (const v of adj[u]) { if (seen[v]) continue; seen[v] = 1; if (mt[v] < 0 || aug(mt[v], seen)) { mt[v] = u; return true; } } return false; };
    for (let u = 0; u < tents.length; u++) if (!aug(u, Array(trees.length).fill(0))) return false;
    return true;
  }
  function tiendasCount(N, trees, rows, cols, limit) {
    const isTree = new Set(trees);
    const rl = rows.slice(), cl = cols.slice(), placed = [];
    const set = new Set();
    let count = 0, nodes = 0;
    const adjTree = (x, y) => D4.some((d) => { const nx = x + d[0], ny = y + d[1]; return nx >= 0 && nx < N && ny >= 0 && ny < N && isTree.has(ny * N + nx); });
    const nearTent = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && set.has((y + dy) * N + x + dx)) return true; return false; };
    function rec(idx) {
      if (count >= limit || ++nodes > 900000) return;
      if (idx === N * N) { if (rl.every((v) => !v) && cl.every((v) => !v) && match(placed.slice(), trees, N)) count++; return; }
      const x = idx % N, y = (idx / N) | 0;
      if (!isTree.has(idx) && rl[y] > 0 && cl[x] > 0 && adjTree(x, y) && !nearTent(x, y)) {
        set.add(idx); placed.push(idx); rl[y]--; cl[x]--;
        rec(idx + 1);
        set.delete(idx); placed.pop(); rl[y]++; cl[x]++;
      }
      if (rl[y] <= N - x - 1 && cl[x] <= N - y - 1) rec(idx + 1);
    }
    rec(0);
    return nodes > 900000 ? 99 : count;
  }
  function tiendas(N, want) {
    for (let a = 0; a < 120; a++) {
      const tents = [], trees = [], set = new Set(), tset = new Set();
      const cells = shuffle([...Array(N * N).keys()]);
      for (const idx of cells) {
        if (tents.length >= want) break;
        const x = idx % N, y = (idx / N) | 0;
        if (set.has(idx) || tset.has(idx)) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && set.has((y + dy) * N + x + dx)) { near = true; break; }
        if (near) continue;
        const opts = shuffle(D4.slice()).map((d) => [x + d[0], y + d[1]]).filter(([nx, ny]) => nx >= 0 && nx < N && ny >= 0 && ny < N && !set.has(ny * N + nx) && !tset.has(ny * N + nx));
        if (!opts.length) continue;
        const [tx, ty] = opts[0];
        set.add(idx); tents.push(idx); tset.add(ty * N + tx); trees.push(ty * N + tx);
      }
      if (tents.length < want) continue;
      const rows = Array(N).fill(0), cols = Array(N).fill(0);
      for (const idx of tents) { rows[(idx / N) | 0]++; cols[idx % N]++; }
      if (tiendasCount(N, trees, rows, cols, 2) === 1) return { mode: 'tiendas', N, trees: trees.slice(), rows, cols, sol: tents.slice() };
    }
    return null;
  }

  /* ================= SUMA DIEZ ================= */
  /* Teja la rejilla entera en dominós (emparejamiento perfecto) y asigna a / 10-a:
     así siempre existe un orden que la vacía por completo. */
  function suma(R, C) {
    if ((R * C) % 2) C++;
    for (let a = 0; a < 200; a++) {
      const free = new Set([...Array(R * C).keys()]), pairs = [];
      let ok = true;
      while (free.size) {
        let best = -1, bn = 9, bopt = null;
        for (const idx of free) {
          const x = idx % C, y = (idx / C) | 0;
          const o = D4.map((d) => [x + d[0], y + d[1]]).filter(([nx, ny]) => nx >= 0 && nx < C && ny >= 0 && ny < R && free.has(ny * C + nx)).map(([nx, ny]) => ny * C + nx);
          if (o.length < bn) { bn = o.length; best = idx; bopt = o; if (!bn) break; }
        }
        if (!bopt || !bopt.length) { ok = false; break; }
        const j = pick(bopt);
        free.delete(best); free.delete(j); pairs.push([best, j]);
      }
      if (!ok) continue;
      const g = Array(R * C).fill(0);
      for (const [p, q] of pairs) { const v = ri(1, 9); g[p] = v; g[q] = 10 - v; }
      return { mode: 'suma', R, C, g, pairs };
    }
    return null;
  }
  /* ¿Queda alguna jugada? (para avisar de atasco, como en color sort) */
  function sumaMove(R, C, g) {
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const v = g[y * C + x]; if (!v) continue;
      if (x + 1 < C && g[y * C + x + 1] && v + g[y * C + x + 1] === 10) return [y * C + x, y * C + x + 1];
      if (y + 1 < R && g[(y + 1) * C + x] && v + g[(y + 1) * C + x] === 10) return [y * C + x, (y + 1) * C + x];
    }
    return null;
  }

  /* ================= GATOS EN CAJAS (deducción) ================= */
  const CL = {
    pos: (p, c) => p[c.a] === c.k,
    no: (p, c) => p[c.a] !== c.k,
    izq: (p, c) => p[c.a] < p[c.b],
    jun: (p, c) => Math.abs(p[c.a] - p[c.b]) === 1,
    sep: (p, c) => Math.abs(p[c.a] - p[c.b]) === c.d,
    ext: (p, c) => p[c.a] === 0 || p[c.a] === c.n - 1,
  };
  function gatosCount(n, clues, limit) {
    const p = [], used = Array(n).fill(false);
    let count = 0;
    const fits = () => clues.every((c) => { const ids = c.b === undefined ? [c.a] : [c.a, c.b]; return ids.some((i) => p[i] === undefined) || CL[c.t](p, c); });
    function rec(i) {
      if (count >= limit) return;
      if (i === n) { count++; return; }
      for (let k = 0; k < n; k++) { if (used[k]) continue; used[k] = true; p[i] = k; if (fits()) rec(i + 1); p[i] = undefined; used[k] = false; }
    }
    rec(0);
    return count;
  }
  function gatos(n) {
    const sol = shuffle([...Array(n).keys()]);
    const cand = [];
    for (let a = 0; a < n; a++) {
      cand.push({ t: 'pos', a, k: sol[a] });
      for (let k = 0; k < n; k++) if (sol[a] !== k) cand.push({ t: 'no', a, k });
      if (sol[a] === 0 || sol[a] === n - 1) cand.push({ t: 'ext', a, n });
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        if (sol[a] < sol[b]) cand.push({ t: 'izq', a, b });
        if (Math.abs(sol[a] - sol[b]) === 1) cand.push({ t: 'jun', a, b });
        const d = Math.abs(sol[a] - sol[b]);
        if (d >= 2 && a < b) cand.push({ t: 'sep', a, b, d });
      }
    }
    shuffle(cand);
    /* menos pistas de posición directa: se prefiere deducir */
    cand.sort((x, y) => (x.t === 'pos' ? 1 : 0) - (y.t === 'pos' ? 1 : 0));
    const use = [];
    for (const c of cand) { use.push(c); if (gatosCount(n, use, 2) === 1) break; }
    if (gatosCount(n, use, 2) !== 1) return null;
    /* poda: quita las pistas que sobran */
    for (let i = use.length - 1; i >= 0; i--) { const q = use.splice(i, 1)[0]; if (gatosCount(n, use, 2) !== 1) use.splice(i, 0, q); }
    return { mode: 'gatos', n, sol, clues: use };
  }

  /* Solución única de un tablero de puentes (para la pista). */
  function puentesSol(isl) { puentesCount(isl, 1); return pzSol || []; }
  return { puentes, estrellas, tiendas, suma, gatos, sumaMove, puentesCount, puentesSol, pzCand, pzCross, estrellasCount, tiendasCount, gatosCount };
})();
if (typeof module !== 'undefined') module.exports = L2GEN;
