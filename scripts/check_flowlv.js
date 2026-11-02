/* Resolutor de los 20 tableros de flow-lines (src/eng/flowlv.js).
 *
 *   node scripts/check_flowlv.js           comprueba los 20: solución única que llena el tablero
 *   node scripts/check_flowlv.js 7         solo el nivel 7 (y dibuja la solución)
 *
 * Búsqueda en profundidad que alarga cada tubería desde uno de sus extremos con las REGLAS DEL
 * JUEGO (FLOWLV.canStep del propio fichero de niveles) y cuenta soluciones hasta dos: si hay una
 * sola, el tablero tiene solución única. Poda: casilla libre con menos de dos salidas, tubería
 * cuya cabeza ya no alcanza su pareja y zona libre que ninguna tubería puede llenar. Además
 * comprueba la forma de cada nivel (parejas completas, portales de dos en dos, marcas que no
 * pisan extremos) y que la solución encontrada pasa FLOWLV.solved, la misma que usa el motor.
 */
const path = require('path');
const FLOWLV = require(path.join(__dirname, '..', 'src', 'eng', 'flowlv.js'));

function solve(M, limit, budget) {
  const NN = M.nodes.length, nc = M.nc, nodes = M.nodes;
  const own = new Int16Array(NN).fill(-1);
  const head = [], prev = [], done = [], tgt = [], paths = [];
  for (let c = 0; c < nc; c++) { const e = M.ends[c]; own[e[0]] = c; own[e[1]] = c; head[c] = e[0]; prev[c] = -1; tgt[c] = e[1]; done[c] = false; paths[c] = [e[0]]; }
  let count = 0, sol = null, sol2 = null, steps = 0, aborted = false;
  const comp = new Int32Array(NN), stack = new Int32Array(NN);
  function moves(c) {
    const out = [], h = head[c], nb = nodes[h].nb;
    for (let i = 0; i < nb.length; i++) { const nx = nb[i][0]; if ((own[nx] === -1 || nx === tgt[c]) && FLOWLV.canStep(M, c, prev[c], h, nx)) out.push(nx); }
    return out;
  }
  function prune() {
    /* casilla libre sin dos salidas */
    for (let v = 0; v < NN; v++) {
      if (own[v] !== -1) continue;
      let k = 0; const nb = nodes[v].nb;
      for (let i = 0; i < nb.length && k < 2; i++) { const u = nb[i][0]; if (own[u] === -1) k++; else { const c = own[u]; if (!done[c] && (head[c] === u || tgt[c] === u)) k++; } }
      if (k < 2) return true;
    }
    /* componentes de casillas libres */
    comp.fill(-1); let nComp = 0;
    for (let v = 0; v < NN; v++) {
      if (own[v] !== -1 || comp[v] !== -1) continue;
      let sp = 0; stack[sp++] = v; comp[v] = nComp;
      while (sp) { const a = stack[--sp], nb = nodes[a].nb; for (let i = 0; i < nb.length; i++) { const u = nb[i][0]; if (own[u] === -1 && comp[u] === -1) { comp[u] = nComp; stack[sp++] = u; } } }
      nComp++;
    }
    const claimed = new Uint8Array(nComp);
    for (let c = 0; c < nc; c++) {
      if (done[c]) continue;
      const hs = new Set(), h = head[c];
      let direct = false;
      for (const [u] of nodes[h].nb) { if (own[u] === -1) hs.add(comp[u]); if (u === tgt[c]) direct = true; }
      let ok = direct;
      for (const [u] of nodes[tgt[c]].nb) if (own[u] === -1 && hs.has(comp[u])) { ok = true; claimed[comp[u]] = 1; }
      if (!ok) return true;
    }
    for (let i = 0; i < nComp; i++) if (!claimed[i]) return true;
    return false;
  }
  function rec() {
    if (aborted || count >= limit) return;
    if (++steps > budget) { aborted = true; return; }
    let best = -1, bm = null;
    for (let c = 0; c < nc; c++) {
      if (done[c]) continue;
      const m = moves(c);
      if (!m.length) return;
      if (!bm || m.length < bm.length) { best = c; bm = m; if (m.length === 1) break; }
    }
    if (best < 0) {
      for (let v = 0; v < NN; v++) if (own[v] === -1) return;
      if (!FLOWLV.solved(M, paths)) return;
      count++;
      if (count === 1) sol = paths.map((p) => p.slice()); else sol2 = paths.map((p) => p.slice());
      return;
    }
    if (prune()) return;
    const c = best;
    for (let i = 0; i < bm.length; i++) {
      const nx = bm[i], ph = head[c], pp = prev[c];
      if (nx === tgt[c]) { done[c] = true; paths[c].push(nx); rec(); paths[c].pop(); done[c] = false; }
      else { own[nx] = c; prev[c] = ph; head[c] = nx; paths[c].push(nx); rec(); paths[c].pop(); head[c] = ph; prev[c] = pp; own[nx] = -1; }
      if (aborted || count >= limit) return;
    }
  }
  rec();
  return { count: count, sol: sol, sol2: sol2, steps: steps, aborted: aborted };
}

/* Forma: dos extremos por color, portales de dos en dos y ningún extremo encima de una marca. */
function shape(lv) {
  const errs = [], M = FLOWLV.parse(lv), seen = {};
  for (const r of lv.g) if (r.length !== lv.g[0].length) errs.push('filas de distinta anchura');
  for (let c = 0; c < M.nc; c++) if (!M.ends[c] || M.ends[c].length !== 2) errs.push('el color ' + String.fromCharCode(65 + c) + ' no tiene dos puntos');
  for (const n of M.nodes) { const ch = M.cell[n.x + ',' + n.y].ch; if (ch >= '1' && ch <= '9') seen[ch] = (seen[ch] || 0) + 1; if (n.req >= M.nc) errs.push('gema de un color que no existe'); }
  for (const k in seen) if (seen[k] !== 2) errs.push('portal ' + k + ' sin pareja');
  return { errs: errs, M: M };
}
/* Solución como texto de pasos desde el primer punto de cada color: R D L U, y P = salto de portal. */
function encode(M, pa) { let out = ''; for (let i = 1; i < pa.length; i++) out += 'RDLUP'[FLOWLV.dirOf(M, pa[i - 1], pa[i])]; return out; }
function draw(M, sol) {
  const L = 'ABCDEFGHIJ', rows = [];
  for (let y = 0; y < M.NH; y++) { let r = ''; for (let x = 0; x < M.NW; x++) { const q = M.cell[x + ',' + y]; if (!q) { r += ' '; continue; } let s = ''; for (const id of q.ids) sol.forEach((p, c) => { if (p.includes(id)) s += L[c].toLowerCase(); }); r += q.ch >= 'A' && q.ch <= 'J' ? q.ch : (s.length > 1 ? '+' : s); } rows.push(r); }
  return rows.join('\n');
}

if (require.main === module) {
  const LVS = FLOWLV['flow-lines'], only = +process.argv.slice(2).find((a) => /^\d+$/.test(a)) || 0;
  let bad = 0; const tab = [];
  if (LVS.length !== 20) { console.log('AVISO: hay ' + LVS.length + ' tableros, no 20'); bad++; }
  LVS.forEach((lv, i) => {
    if (only && only !== i + 1) return;
    const { errs, M } = shape(lv);
    const t0 = Date.now(), r = solve(M, 2, 5e7), ms = Date.now() - t0;
    const marks = { '#': 0, '+': 0, gem: 0, por: 0, '=': 0, '%': 0 };
    for (const r2 of lv.g) for (const ch of r2) { if (ch === '#' || ch === '+' || ch === '=' || ch === '%') marks[ch]++; else if (ch >= 'a' && ch <= 'j') marks.gem++; else if (ch >= '1' && ch <= '9') marks.por++; }
    const G = FLOWLV.goals(lv, 1);
    /* la pista del juego enseña lv.s: tiene que ser exactamente la solución única */
    if (r.sol && lv.s && r.sol.some((p, c) => encode(M, p) !== lv.s[c])) errs.push('la solución guardada (s) no coincide con la del resolutor');
    if (!lv.s) errs.push('falta la solución guardada (s)');
    if (process.argv.includes('--sol') && r.sol) console.log(`${i + 1}: s: ${JSON.stringify(r.sol.map((p) => encode(M, p)))}`);
    const ok = !errs.length && r.count === 1 && !r.aborted;
    if (!ok) bad++;
    tab.push(`${String(i + 1).padStart(2)} ${(lv.n || '').padEnd(22)} ${M.NW}x${M.NH} col ${String(M.nc).padStart(2)} huecos ${String(marks['#']).padStart(2)} puentes ${marks['+']} gemas ${marks.gem} portales ${marks.por / 2} rectas ${marks['=']} codos ${marks['%']} reloj ${lv.t ? lv.t.join('/') : '-'}  ${ok ? 'ÚNICA' : r.aborted ? 'SIN TERMINAR' : r.count === 0 ? 'SIN SOLUCIÓN' : 'VARIAS'}  (${r.steps} nodos, ${ms} ms)${errs.length ? '  ' + errs.join('; ') : ''}`);
    if (only) { if (r.sol) console.log(draw(M, r.sol)); if (r.sol2) console.log('--- otra solución ---\n' + draw(M, r.sol2)); }
  });
  console.log(tab.join('\n'));
  console.log(bad ? `\n${bad} tablero(s) con problemas` : '\nTodo correcto: los 20 tienen solución única que llena el tablero.');
  process.exit(bad ? 1 : 0);
}
module.exports = { solve, shape, draw, encode };
