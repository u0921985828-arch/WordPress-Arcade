/* Simulador de los 20 retos de 2048-classic (src/eng/g2048lv.js).
 *
 *   node scripts/check_g2048lv.js                 los 20 retos × 3 dificultades
 *   node scripts/check_g2048lv.js 13              solo el reto 13
 *   node scripts/check_g2048lv.js 13 2 400        reto 13, difícil, 400 partidas
 *
 * Juega con las REGLAS DEL JUEGO (G2048LV.plan/alive/token/tune del propio fichero de niveles:
 * el motor y este simulador no pueden divergir) y un jugador de heurística serpiente + huecos +
 * fusiones, con búsqueda de 2 jugadas (4 en los retos de objetivo alto) y un muestreo de la
 * ficha que entra. Reproduce lo que hace el motor: bolsa de fichas, probabilidad de 4 por
 * dificultad, generador, mecha de las bombas, límite de movimientos y el rescate de fácil.
 *
 * Saca, por reto y dificultad: % de victorias y los movimientos del percentil 25/50/75 de las
 * partidas ganadas, que es de donde salen los objetivos s2/s3 escritos a mano. Avisa si algún
 * reto no se gana lo suficiente o si s2/s3 quedan por debajo de lo que cuesta ganarlo.
 */
const path = require('path');
const G = require(path.join(__dirname, '..', 'src', 'eng', 'g2048lv.js'));
const LVS = G.L['2048-classic'];
const DIRS = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const NAMES = ['left', 'right', 'up', 'down'];
const K = (x, y) => x + ',' + y;

function build(lv) {
  const N = lv.g || 4, cells = [], walls = {}, tiles = {};
  const rows = lv.b ? lv.b.map((r) => r.trim().split(/\s+/)) : null;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (rows && G.token(rows[y][x]) === 'wall') { walls[K(x, y)] = 1; continue; }
    cells.push([x, y]);
  }
  return { N: N, cells: cells, walls: walls, tiles: tiles, rows: rows };
}
function spawn(s, lv, dif, rnd) {
  const empty = s.cells.filter((cl) => !s.tiles[K(cl[0], cl[1])]);
  if (!empty.length) return;
  const cl = empty[(rnd() * empty.length) | 0];
  let v = 2, w = false;
  if (lv.sp) { const p = lv.sp[(rnd() * lv.sp.length) | 0]; if (p === '*') { w = true; v = 0; } else v = p; }
  else v = rnd() < (dif === 0 ? 0.95 : dif === 2 ? 0.8 : 0.9) ? 2 : 4;
  s.tiles[K(cl[0], cl[1])] = { v: v, w: w };
}
function clone(s) { const t = {}; for (const kk in s.tiles) { const a = s.tiles[kk]; t[kk] = { v: a.v, w: a.w, fz: a.fz, bo: a.bo, ch: a.ch, bomb: a.bomb, fu: a.fu }; } return { N: s.N, cells: s.cells, walls: s.walls, tiles: t, rows: s.rows }; }
function apply(s, P) {
  const nt = {};
  for (const kk in P.board) { const r = P.board[kk]; nt[kk] = { v: r.v, w: r.w, fz: r.fz, bo: r.bo, ch: r.ch, bomb: r.bomb, fu: r.fu }; }
  s.tiles = nt;
}
/* ---- heurística ---- */
function evalS(s) {
  let e = 0, sum = 0, best = 0, merges = 0, bolted = 0, chests = 0, bombRisk = 0;
  const N = s.N;
  for (let i = 0; i < s.cells.length; i++) {
    const cl = s.cells[i], t = s.tiles[K(cl[0], cl[1])];
    if (!t) { e++; continue; }
    /* serpiente anclada a la esquina inferior izquierda */
    const y = cl[1], x = cl[0], col = (y % 2 === 0) ? (N - 1 - x) : x;
    const w = Math.pow(3.1, y * N + col);
    sum += w * (t.v || 2);
    if (t.v > best) best = t.v;
    if (t.bo) bolted++;
    if (t.ch) chests++;
    if (t.bomb) bombRisk += 1 / Math.max(1, t.fu || 1);
    for (let j = 0; j < 4; j++) { const o = s.tiles[K(cl[0] + NB[j][0], cl[1] + NB[j][1])]; if (o && !o.fz && !t.fz && (o.v === t.v || o.w || t.w)) merges++; }
  }
  return sum + e * Math.pow(3.1, N * N) * 0.06 + merges * Math.pow(3.1, N * N) * 0.02
    - bolted * Math.pow(3.1, N * N) * 0.05 - chests * Math.pow(3.1, N * N) * 0.04
    - bombRisk * Math.pow(3.1, N * N) * 0.8;
}
function moves(s, ban) {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const nm = NAMES[i]; if (ban && ban.indexOf(nm) >= 0) continue;
    const P = G.plan(s.cells, s.tiles, DIRS[nm], DIRS[nm], NB);
    if (P.moved) out.push([nm, P]);
  }
  return out;
}
function search(s, lv, dif, depth, rnd) {
  const ms = moves(s, lv.ban);
  if (!ms.length) return null;
  let bn = null, bv = -Infinity;
  for (const [nm, P] of ms) {
    const ns = clone(s); apply(ns, P);
    let v = evalS(ns) + P.gained * 6 + (P.defused.length ? 1e14 : 0) + P.opened.length * 1e11 + P.uf.length * 1e10;
    if (depth > 1) {
      let acc = 0, n = 0;
      for (let t = 0; t < 2; t++) {
        const s2 = clone(ns); spawn(s2, lv, dif, rnd);
        const r = search(s2, lv, dif, depth - 1, rnd);
        acc += r ? r.v : -1e18; n++;
      }
      v = v * 0.15 + (acc / n) * 0.85;
    }
    if (v > bv) { bv = v; bn = nm; }
  }
  return { nm: bn, v: bv };
}
/* ---- una partida ---- */
function play(lv, dif, rnd, depth) {
  const t = G.tune(lv, dif), s = build(lv);
  if (s.rows) for (const cl of s.cells) { const tk = G.token(s.rows[cl[1]][cl[0]]); if (tk && tk !== 'wall') s.tiles[K(cl[0], cl[1])] = { v: tk.v, w: !!tk.w, fz: !!tk.fz, bo: !!tk.bo, ch: !!tk.ch, bomb: !!tk.bomb, fu: tk.bomb ? t.fuse : 0 }; }
  else { spawn(s, lv, dif, rnd); spawn(s, lv, dif, rnd); }
  let mv = 0, rescues = dif === 0 ? 1 : 0, opened = 0, chests0 = 0, usedRescue = false;
  for (const kk in s.tiles) if (s.tiles[kk].ch) chests0++;
  for (let guard = 0; guard < 6000; guard++) {
    const r = search(s, lv, dif, depth, rnd);
    if (!r) { if (rescues > 0) { rescues--; usedRescue = true; rescue(s); continue; } return { win: false, mv: mv, why: 'block' }; }
    const P = G.plan(s.cells, s.tiles, DIRS[r.nm], DIRS[r.nm], NB);
    apply(s, P); opened += P.opened.length; mv++;
    spawn(s, lv, dif, rnd);
    if (t.gen && mv % t.gen === 0) spawn(s, lv, dif, rnd);
    /* mecha */
    if (t.fuse) { for (const kk in s.tiles) { const a = s.tiles[kk]; if (a.bomb) { a.fu = (a.fu || 0) - 1; if (a.fu <= 0) return { win: false, mv: mv, why: 'bomba' }; } } }
    let cnt = 0; for (const kk in s.tiles) if (s.tiles[kk].v >= t.goal) cnt++;
    if (cnt >= t.need) return { win: true, mv: mv, opened: opened, chests: chests0, clean: !usedRescue };
    if (t.mv && mv >= t.mv) return { win: false, mv: mv, why: 'movimientos' };
    if (!G.alive(s.cells, s.tiles, NB)) { if (rescues > 0) { rescues--; usedRescue = true; rescue(s); } else return { win: false, mv: mv, why: 'block' }; }
  }
  return { win: false, mv: mv, why: 'guard' };
}
function rescue(s) {
  const list = Object.keys(s.tiles).filter((kk) => !s.tiles[kk].fz).sort((a, b) => s.tiles[a].v - s.tiles[b].v).slice(0, 3);
  for (const kk of list) delete s.tiles[kk];
}
function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pc = (a, q) => a.length ? a[Math.min(a.length - 1, Math.floor(q * (a.length - 1)))] : 0;

const only = process.argv[2] ? +process.argv[2] : 0;
const onlyD = process.argv[3] !== undefined ? +process.argv[3] : -1;
const Ngames = process.argv[4] ? +process.argv[4] : 0;
let bad = 0;
console.log('reto  nombre                  dif  gana%   mov p25/p50/p75   s2      s3');
for (let i = 0; i < LVS.length; i++) {
  const n = i + 1; if (only && n !== only) continue;
  const lv = LVS[i];
  for (let dif = 0; dif < 3; dif++) {
    if (onlyD >= 0 && dif !== onlyD) continue;
    const t = G.tune(lv, dif);
    const depth = t.goal >= 1024 ? 4 : t.goal >= 256 ? 3 : 2;
    const games = Ngames || (t.goal >= 1024 ? 40 : t.goal >= 256 ? 90 : 150);
    let win = 0; const ms = []; const why = {};
    for (let gi = 0; gi < games; gi++) {
      const r = play(lv, dif, mulberry(n * 1000 + dif * 97 + gi), depth);
      if (r.win) { win++; ms.push(r.mv); } else why[r.why] = (why[r.why] || 0) + 1;
    }
    ms.sort((a, b) => a - b);
    const st = G.stars(lv, dif), rate = win / games;
    const flags = (rate < 0.5 ? ' POCAS VICTORIAS' : '') + (st.s2 && st.s2 < pc(ms, 0.5) ? ' s2<p50' : '') + (st.s3 && st.s3 < pc(ms, 0.25) ? ' s3<p25' : '') + (st.s2 ? '' : ' s2=0');
    if (flags) bad++;
    console.log('      ' + lv.name.padEnd(22) + ' ' + ['f', 'n', 'd'][dif] + '   ' + (rate * 100).toFixed(0).padStart(4) + '%  ' +
      String(pc(ms, 0.25)).padStart(4) + '/' + String(pc(ms, 0.5)).padStart(4) + '/' + String(pc(ms, 0.75)).padStart(4) +
      '      ' + String(st.s2).padStart(4) + '    ' + String(st.s3).padStart(4) + flags + (Object.keys(why).length ? '  (' + Object.entries(why).map((e) => e[0] + ':' + e[1]).join(' ') + ')' : ''));
  }
}
console.log(bad ? `\n${bad} caso(s) con problemas` : '\nTodos los retos se ganan y s2/s3 tienen margen.');
process.exit(bad ? 1 : 0);
