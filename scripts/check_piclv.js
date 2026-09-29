/* Verificador de los 20 dibujos de pixel-picross-xl (src/eng/piclv.js).
 * Comprueba, para cada nivel:
 *   1. el tablero es cuadrado y del lado declarado
 *   2. se resuelve SOLO con lógica de línea (sin adivinar ni una casilla)
 *   3. la solución es única (la lógica de línea lo demuestra al llenar el tablero)
 * Uso: node scripts/check_piclv.js
 */
const PICLV = require('../src/eng/piclv.js');

const clue = (line) => { const r = []; let n = 0; for (const v of line) { if (v) n++; else if (n) { r.push(n); n = 0; } } if (n) r.push(n); return r.length ? r : [0]; };

/* Todas las colocaciones de los bloques de una línea compatibles con lo ya sabido
   (st: 0 desconocido, 1 pintado, 2 vacío). Devuelve la intersección o null si no hay ninguna. */
function lineSolve(st, cl) {
  const n = st.length, blocks = cl[0] === 0 ? [] : cl;
  const and1 = new Array(n).fill(true), and2 = new Array(n).fill(true);
  let any = false;
  const cand = new Array(n).fill(0);
  (function place(bi, pos) {
    if (any && !and1.some(Boolean) && !and2.some(Boolean)) return;   // nada más que aprender
    if (bi === blocks.length) {
      for (let i = pos; i < n; i++) { if (st[i] === 1) return; cand[i] = 2; }
      any = true;
      for (let i = 0; i < n; i++) { if (cand[i] !== 1) and1[i] = false; if (cand[i] !== 2) and2[i] = false; }
      return;
    }
    const b = blocks[bi], rest = blocks.slice(bi + 1).reduce((a, v) => a + v + 1, 0);
    for (let s = pos; s + b + rest <= n; s++) {
      let ok = true;
      for (let i = pos; i < s; i++) if (st[i] === 1) { ok = false; break; }
      if (!ok) break;                                   // dejar atrás una pintada es imposible
      for (let i = s; i < s + b; i++) if (st[i] === 2) { ok = false; break; }
      if (!ok) continue;
      const gap = s + b < n ? 1 : 0;
      if (gap && st[s + b] === 1) continue;
      for (let i = pos; i < s; i++) cand[i] = 2;
      for (let i = s; i < s + b; i++) cand[i] = 1;
      if (gap) cand[s + b] = 2;
      place(bi + 1, s + b + gap);
    }
  })(0, 0);
  if (!any) return null;
  const out = st.slice();
  for (let i = 0; i < n; i++) { if (and1[i]) out[i] = 1; else if (and2[i]) out[i] = 2; }
  return out;
}

function solve(n, rows, cols) {
  const g = Array.from({ length: n }, () => new Array(n).fill(0));
  let pass = 0, changed = true;
  while (changed) {
    changed = false; pass++;
    for (let y = 0; y < n; y++) {
      const r = lineSolve(g[y], rows[y]); if (!r) return { ok: false, why: 'fila ' + y + ' sin solución' };
      for (let x = 0; x < n; x++) if (r[x] !== g[y][x]) { g[y][x] = r[x]; changed = true; }
    }
    for (let x = 0; x < n; x++) {
      const col = g.map((r) => r[x]);
      const r = lineSolve(col, cols[x]); if (!r) return { ok: false, why: 'columna ' + x + ' sin solución' };
      for (let y = 0; y < n; y++) if (r[y] !== g[y][x]) { g[y][x] = r[y]; changed = true; }
    }
    if (pass > 200) break;
  }
  const unknown = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!g[y][x]) unknown.push(x + ',' + y);
  return { ok: !unknown.length, unknown, pass, g };
}

function main() {
let bad = 0;
for (const slug in PICLV) {
  console.log('== ' + slug + ' ==');
  PICLV[slug].forEach((L, i) => {
    const errs = [];
    if (L.b.length !== L.n) errs.push(`filas ${L.b.length} != ${L.n}`);
    L.b.forEach((r, y) => { if (r.length !== L.n) errs.push(`fila ${y} mide ${r.length}`); if (/[^#.]/.test(r)) errs.push(`fila ${y} con caracteres raros`); });
    if (errs.length) { console.log(`  ${String(i + 1).padStart(2)} ${L.t}: ERROR ${errs.join('; ')}`); bad++; return; }
    const sol = L.b.map((r) => [...r].map((ch) => ch === '#'));
    const rows = sol.map(clue), cols = sol[0].map((_, x) => clue(sol.map((r) => r[x])));
    const fill = sol.flat().filter(Boolean).length;
    if (!fill || fill === L.n * L.n) { console.log(`  ${String(i + 1).padStart(2)} ${L.t}: ERROR dibujo vacío o lleno`); bad++; return; }
    const res = solve(L.n, rows, cols);
    if (!res.ok) { console.log(`  ${String(i + 1).padStart(2)} ${L.t} (${L.n}×${L.n}): NO resoluble por líneas — ${res.why || res.unknown.length + ' casillas ambiguas: ' + res.unknown.slice(0, 12).join(' ')}`); bad++; return; }
    // la solución que encuentra la lógica debe ser exactamente el dibujo
    let same = true;
    for (let y = 0; y < L.n; y++) for (let x = 0; x < L.n; x++) if ((res.g[y][x] === 1) !== sol[y][x]) same = false;
    if (!same) { console.log(`  ${String(i + 1).padStart(2)} ${L.t}: ERROR la lógica llega a otro dibujo`); bad++; return; }
    const maxc = Math.max(...rows.map((r) => r.length), ...cols.map((r) => r.length));
    console.log(`  ${String(i + 1).padStart(2)} ${L.t.padEnd(12)} ${String(L.n).padStart(2)}×${L.n}  única y sin adivinar (${res.pass} vueltas, ${fill} casillas, ${Math.round(fill / (L.n * L.n) * 100)}%, max ${maxc} pistas)`);
  });
}
console.log(bad ? `\n${bad} NIVELES MAL` : '\nTodos los niveles correctos');
process.exit(bad ? 1 : 0);
}
module.exports = { clue, lineSolve, solve, main };
if (require.main === module) main();
