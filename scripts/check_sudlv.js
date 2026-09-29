/* Resolutor propio de sudoku por técnicas + verificador de los 20 niveles de sudoku-zen.
 *
 * Comprueba, para cada nivel de src/eng/sudlv.js:
 *   1. las pistas son coherentes y la solución es ÚNICA (fuerza bruta con retroceso)
 *   2. se termina SOLO con lógica, sin adivinar, usando técnicas hasta la del nivel
 *   3. la técnica del nivel hace falta de verdad: con el juego de técnicas del nivel
 *      anterior el puzle NO se termina
 *
 * Sirve para 4×4 (cajas 2×2), 6×6 (cajas 3×2) y 9×9 (cajas 3×3).
 * Uso: node scripts/check_sudlv.js
 */

/* ---------- motor genérico ---------- */
function mk(n, bw, bh) {
  const units = [], uof = Array.from({ length: n * n }, () => []);
  for (let r = 0; r < n; r++) units.push([...Array(n).keys()].map((j) => r * n + j));
  for (let cc = 0; cc < n; cc++) units.push([...Array(n).keys()].map((j) => j * n + cc));
  for (let br = 0; br < n / bh; br++) for (let bc = 0; bc < n / bw; bc++) {
    const u = []; for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) u.push((br * bh + y) * n + bc * bw + x);
    units.push(u);
  }
  units.forEach((u, i) => u.forEach((c) => uof[c].push(i)));
  const peers = Array.from({ length: n * n }, (_, i) => { const s = new Set(); uof[i].forEach((ui) => units[ui].forEach((c) => c !== i && s.add(c))); return [...s]; });
  const ROW = (i) => Math.floor(i / n), COL = (i) => i % n, BOX = (i) => Math.floor(ROW(i) / bh) * (n / bw) + Math.floor(COL(i) / bw);
  return { n, bw, bh, units, uof, peers, ROW, COL, BOX, ALL: (1 << n) - 1 };
}
const bits = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const low = (m) => Math.log2(m & -m) | 0;

/* candidatos a partir de las pistas; null si hay contradicción */
function cands(E, g) {
  const c = new Array(E.n * E.n).fill(E.ALL);
  for (let i = 0; i < g.length; i++) if (g[i]) {
    c[i] = 1 << (g[i] - 1);
    for (const p of E.peers[i]) { c[p] &= ~(1 << (g[i] - 1)); if (!c[p]) return null; }
  }
  return c;
}

/* ---------- técnicas ---------- */
function nakedSingle(E, c) { let ch = false; for (let i = 0; i < c.length; i++) if (bits(c[i]) === 1) { const b = c[i]; for (const p of E.peers[i]) if (c[p] & b) { c[p] &= ~b; if (!c[p]) return null; ch = true; } } return ch; }
function hiddenSingle(E, c) {
  let ch = false;
  for (const u of E.units) for (let d = 0; d < E.n; d++) { const b = 1 << d; let cnt = 0, at = -1;
    for (const i of u) if (c[i] & b) { cnt++; at = i; }
    if (cnt === 0) return null;
    if (cnt === 1 && c[at] !== b) { c[at] = b; ch = true; } }
  return ch;
}
function nakedSub(E, c, K) {
  let ch = false;
  for (const u of E.units) {
    const cells = u.filter((i) => bits(c[i]) > 1 && bits(c[i]) <= K);
    const combo = (start, pick, mask) => {
      if (pick.length === K) { if (bits(mask) !== K) return;
        for (const i of u) if (!pick.includes(i) && (c[i] & mask)) { c[i] &= ~mask; if (!c[i]) throw 0; ch = true; }
        return; }
      for (let i = start; i < cells.length; i++) { const m = mask | c[cells[i]]; if (bits(m) > K) continue; combo(i + 1, pick.concat(cells[i]), m); }
    };
    try { combo(0, [], 0); } catch (e) { return null; }
  }
  return ch;
}
function hiddenSub(E, c, K) {
  let ch = false;
  for (const u of E.units) {
    const ds = []; for (let d = 0; d < E.n; d++) { const b = 1 << d, pos = u.filter((i) => c[i] & b); if (pos.length > 1 && pos.length <= K) ds.push([b, pos]); }
    const combo = (start, pick, mask, cellSet) => {
      if (pick === K) { if (cellSet.size !== K) return;
        for (const i of cellSet) if (c[i] & ~mask) { c[i] &= mask; if (!c[i]) throw 0; ch = true; }
        return; }
      for (let i = start; i < ds.length; i++) { const s2 = new Set(cellSet); ds[i][1].forEach((x) => s2.add(x)); if (s2.size > K) continue; combo(i + 1, pick + 1, mask | ds[i][0], s2); }
    };
    try { combo(0, 0, 0, new Set()); } catch (e) { return null; }
  }
  return ch;
}
function pointing(E, c) {  // caja que apunta: el dígito solo cabe en una fila/columna de la caja
  let ch = false; const nb = E.n / E.bw * (E.n / E.bh);
  for (let b = 0; b < nb; b++) { const u = E.units[2 * E.n + b];
    for (let d = 0; d < E.n; d++) { const bt = 1 << d, pos = u.filter((i) => c[i] & bt); if (pos.length < 2) continue;
      const rs = new Set(pos.map(E.ROW)), cs = new Set(pos.map(E.COL));
      if (rs.size === 1) { const r = [...rs][0]; for (const i of E.units[r]) if (!pos.includes(i) && (c[i] & bt)) { c[i] &= ~bt; if (!c[i]) return null; ch = true; } }
      if (cs.size === 1) { const cc = [...cs][0]; for (const i of E.units[E.n + cc]) if (!pos.includes(i) && (c[i] & bt)) { c[i] &= ~bt; if (!c[i]) return null; ch = true; } } } }
  return ch;
}
function claiming(E, c) {  // línea que reclama: el dígito de la fila/columna solo cabe en una caja
  let ch = false;
  for (let u = 0; u < 2 * E.n; u++) { const cells = E.units[u];
    for (let d = 0; d < E.n; d++) { const bt = 1 << d, pos = cells.filter((i) => c[i] & bt); if (pos.length < 2) continue;
      const bs = new Set(pos.map(E.BOX)); if (bs.size !== 1) continue;
      for (const i of E.units[2 * E.n + [...bs][0]]) if (!pos.includes(i) && (c[i] & bt)) { c[i] &= ~bt; if (!c[i]) return null; ch = true; } } }
  return ch;
}
function fish(E, c, K) {  // X-wing (K=2) y sable (K=3), en filas y columnas
  let ch = false;
  for (const dir of [0, 1]) {
    const lines = [...Array(E.n).keys()].map((i) => E.units[dir ? E.n + i : i]);
    for (let d = 0; d < E.n; d++) { const bt = 1 << d;
      const sets = lines.map((L) => L.filter((i) => c[i] & bt).map((i) => (dir ? E.ROW(i) : E.COL(i))));
      const idx = [...Array(E.n).keys()].filter((i) => sets[i].length >= 2 && sets[i].length <= K);
      const combo = (start, pick, cover) => {
        if (pick.length === K) { if (cover.size !== K) return;
          for (const j of cover) { const L = dir ? E.units[j] : E.units[E.n + j];
            for (const i of L) { const li = dir ? E.COL(i) : E.ROW(i); if (pick.includes(li)) continue;
              if (c[i] & bt) { c[i] &= ~bt; if (!c[i]) throw 0; ch = true; } } }
          return; }
        for (let i = start; i < idx.length; i++) { const s2 = new Set(cover); sets[idx[i]].forEach((x) => s2.add(x)); if (s2.size > K) continue; combo(i + 1, pick.concat(idx[i]), s2); }
      };
      try { combo(0, [], new Set()); } catch (e) { return null; } }
  }
  return ch;
}
function xywing(E, c) {
  let ch = false;
  const two = [...Array(E.n * E.n).keys()].filter((i) => bits(c[i]) === 2);
  const see = (a, b) => E.peers[a].includes(b);
  for (const p of two) for (const a of two) { if (a === p || !see(p, a)) continue;
    for (const b of two) { if (b === p || b === a || !see(p, b)) continue;
      const m = c[p] | c[a] | c[b]; if (bits(m) !== 3) continue;
      if (c[a] === c[b] || (c[a] & c[b]) === 0) continue;
      if ((c[p] & c[a]) === 0 || (c[p] & c[b]) === 0) continue;
      const z = c[a] & c[b]; if (bits(z) !== 1 || (c[p] & z)) continue;
      for (let i = 0; i < c.length; i++) if (i !== a && i !== b && see(i, a) && see(i, b) && (c[i] & z)) { c[i] &= ~z; if (!c[i]) return null; ch = true; } } }
  return ch;
}

/* orden de las técnicas: cada nivel usa las suyas y todas las anteriores */
const TECH = [
  ['único candidato', nakedSingle],
  ['único sitio', hiddenSingle],
  ['par desnudo', (E, c) => nakedSub(E, c, 2)],
  ['pareja oculta', (E, c) => hiddenSub(E, c, 2)],
  ['caja que apunta', pointing],
  ['línea que reclama', claiming],
  ['trío desnudo', (E, c) => nakedSub(E, c, 3)],
  ['trío oculto', (E, c) => hiddenSub(E, c, 3)],
  ['X-wing', (E, c) => fish(E, c, 2)],
  ['cuarteto desnudo', (E, c) => nakedSub(E, c, 4)],
  ['XY-wing', xywing],
  ['sable', (E, c) => fish(E, c, 3)]
];
/* Resuelve con las técnicas 0..lim. Devuelve {ok, used} (used = índice más alto usado). */
function logicSolve(E, g, lim) {
  let c = cands(E, g); if (!c) return { ok: false, used: -1 };
  let used = -1;
  for (;;) {
    let did = -1;
    for (let t = 0; t <= lim; t++) { const r = TECH[t][1](E, c); if (r === null) return { ok: false, used }; if (r) { did = t; break; } }
    if (did < 0) break;
    used = Math.max(used, did);
  }
  const ok = c.every((m) => bits(m) === 1);
  return { ok, used, c };
}
/* Clase del puzle: el juego de técnicas más pequeño que lo termina (-1 si ninguno). */
function classify(E, g) { for (let t = 0; t < TECH.length; t++) if (logicSolve(E, g, t).ok) return t; return -1; }

/* fuerza bruta: cuenta soluciones (hasta 2) */
function countSol(E, g) {
  const c = cands(E, g); if (!c) return 0;
  let n = 0;
  (function rec(c) {
    if (n >= 2) return;
    let best = -1, bn = 99;
    for (let i = 0; i < c.length; i++) { const b = bits(c[i]); if (b === 0) return; if (b > 1 && b < bn) { bn = b; best = i; } }
    if (best < 0) { n++; return; }
    let m = c[best];
    while (m) { const b = m & -m; m ^= b;
      const c2 = c.slice(); c2[best] = b; let bad = false;
      const st = [best];
      while (st.length && !bad) { const i = st.pop(), bb = c2[i];
        for (const p of E.peers[i]) if (c2[p] & bb) { c2[p] &= ~bb; if (!c2[p]) { bad = true; break; } if (bits(c2[p]) === 1) st.push(p); } }
      if (!bad) rec(c2);
      if (n >= 2) return; }
  })(c);
  return n;
}

const eng = {};
const engineOf = (n) => eng[n] || (eng[n] = mk(n, n === 4 ? 2 : 3, n === 4 ? 2 : n === 6 ? 2 : 3));
const parse = (n, s) => [...s.replace(/[^0-9.]/g, '')].map((ch) => (ch === '.' ? 0 : +ch));

function main() {
  const SUDLV = require('../src/eng/sudlv.js');
  let bad = 0;
  for (const slug in SUDLV) {
    console.log('== ' + slug + ' ==');
    SUDLV[slug].forEach((L, i) => {
      const E = engineOf(L.n), g = parse(L.n, L.g);
      const errs = [];
      if (g.length !== L.n * L.n) errs.push(`${g.length} casillas, esperaba ${L.n * L.n}`);
      if (!errs.length) {
        const ns = countSol(E, g);
        if (ns !== 1) errs.push(ns === 0 ? 'sin solución' : 'más de una solución');
      }
      if (!errs.length) {
        const cl = classify(E, g);
        if (cl < 0) errs.push('no se termina con lógica (haría falta adivinar)');
        else if (cl !== L.k) errs.push(`clase real ${cl} (${TECH[cl][0]}) ≠ declarada ${L.k} (${TECH[L.k] ? TECH[L.k][0] : '?'})`);
      }
      const given = g.filter(Boolean).length;
      if (errs.length) { console.log(`  ${String(i + 1).padStart(2)} ${L.t}: ERROR ${errs.join('; ')}`); bad++; }
      else console.log(`  ${String(i + 1).padStart(2)} ${L.t.padEnd(22)} ${L.n}×${L.n} ${String(given).padStart(2)} pistas · única · sin adivinar · exige «${TECH[L.k][0]}»`);
    });
  }
  console.log(bad ? `\n${bad} NIVELES MAL` : '\nTodos los niveles correctos');
  process.exit(bad ? 1 : 0);
}
module.exports = { mk, engineOf, parse, cands, logicSolve, classify, countSol, TECH, bits, low, main };
if (require.main === module) main();
