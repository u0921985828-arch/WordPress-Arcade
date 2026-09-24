/* tetraduel.js — Tetra Duelo: bloques que caen 1 contra 1 con basura (1–2 jugadores; la CPU ocupa la plaza libre).
 * Reglas: pozo 10×20 (+2 ocultas), bolsa de 7 (misma secuencia para los dos en cada ronda), SRS con wall kicks,
 * pieza fantasma, reserva una vez por pieza, bloqueo 0,5 s con 15 reinicios. Ataque: doble 1, triple 2, cuatro 4,
 * T-giro simple/doble/triple 2/4/6 (mini 0/1), back-to-back +1, combo (tabla 0,0,1,1,2,2,3,3,4,4,4,5), tablero limpio +6.
 * Tus líneas cancelan primero la basura pendiente; el resto viaja al rival en filas grises con un único hueco por ataque.
 * La basura entra al bloquear una pieza sin borrar (máx. 8 filas de golpe). La gravedad sube durante la ronda.
 * Gana la ronda quien no rebose; el duelo, el primero en ganar 2. Mando: ←→ mover, ↓ bajar, ↑ caída, A girar, B reserva. */
const OUT = ART.OUT, ID = CFG.id || 'tetra-duelo';
const PORT = innerHeight >= innerWidth, W = PORT ? 360 : 640, H = PORT ? 640 : 360;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#0f0d25' }), c = k.ctx;
const FONT = 'ui-rounded,"Trebuchet MS",system-ui,sans-serif';
const COLS = 10, ROWS = 20, HID = 2, R = ROWS + HID, LOCK = 0.5, MAXRESET = 15, CLR = 0.3, DAS = 0.16, ARR = 0.05, WINS = 2;

/* ---------- Piezas y SRS (como tetra.js) ---------- */
const SHAPES = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]] };
const COLORS = { I: '#45d6ea', J: '#4f7cff', L: '#ff9a3c', O: '#f7d046', S: '#5fdc6e', T: '#b36cf0', Z: '#ff5a6a', G: '#7d7a96' };
const ROT = {};
for (const t in SHAPES) { const n = t === 'I' || t === 'O' ? 4 : 3; let s = SHAPES[t]; ROT[t] = [s]; for (let i = 1; i < 4; i++) { if (t !== 'O') s = s.map(([x, y]) => [n - 1 - y, x]); ROT[t].push(s); } }
const KJ = { '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]] };
const KI = { '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]] };
const COMBO = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5];
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- Disposición ---------- */
const LAY = PORT ? [
  { bx: 12, by: 92, S: 24, meter: { x: 254, y: 92, w: 8, h: 480 }, next: { x: 268, y: 92, w: 82, h: 150, n: 3 }, hold: { x: 268, y: 250, w: 82, h: 70 }, name: { x: 12, y: 12 } },
  { bx: 276, by: 432, S: 7, mini: true, meter: { x: 264, y: 432, w: 6, h: 140 }, name: { x: 312, y: 398 } },
] : [
  { bx: 92, by: 40, S: 15, meter: { x: 245, y: 40, w: 6, h: 300 }, next: { x: 256, y: 40, w: 44, h: 132, n: 3 }, hold: { x: 32, y: 40, w: 52, h: 50 }, name: { x: 167, y: 8 }, stats: { x: 32, y: 104 } },
  { bx: 398, by: 40, S: 15, meter: { x: 551, y: 40, w: 6, h: 300 }, next: { x: 562, y: 40, w: 44, h: 132, n: 3 }, hold: { x: 338, y: 40, w: 52, h: 50 }, name: { x: 473, y: 8 }, stats: { x: 338, y: 104 } },
];
const BTN = PORT ? [[8, 586, 80, 44], [96, 586, 80, 44], [184, 586, 80, 44], [272, 586, 80, 44]].map(([x, y, w, h], i) => ({ id: ['hold', 'ccw', 'cw', 'drop'][i], x, y, w, h, pt: 0 })) : [];

/* ---------- Estado ---------- */
let P = [], round, over, overT, rt, time = 0, projs = [], seed, G = null, cpuLv = 0, banner = 0;
const RAW = new Set(); addEventListener('keydown', (e) => { if (!e.repeat) RAW.add(e.code); });
const lsGet = (key) => { try { return +localStorage.getItem(key) || 0; } catch (e) { return 0; } };
const lsSet = (key, v) => { try { localStorage.setItem(key, v); } catch (e) { /* sin almacenamiento */ } };

function newPlayer(p, pl) {
  return { p, cpu: pl.cpu, name: pl.name, col: pl.color, wins: 0, board: null };
}
function roundReset(q) {
  q.board = Array.from({ length: R }, () => Array(COLS).fill(null));
  q.rng = mulberry(seed); q.bag = []; q.queue = [fromBag(q), fromBag(q), fromBag(q)]; q.hold = null; q.holdUsed = false;
  q.combo = -1; q.b2b = false; q.inc = []; q.alive = true; q.dieT = 0; q.clearing = null; q.clearT = 0; q.sent = 0; q.lines = 0;
  q.das = 0; q.dasT = 0; q.pops = []; q.lockFx = null; q.rowFx = null; q.shake = 0; q.ai = null; q.warn = 0;
  nextPiece(q);
}
function fromBag(q) { if (!q.bag.length) { q.bag = Object.keys(SHAPES); for (let i = q.bag.length - 1; i > 0; i--) { const j = Math.floor(q.rng() * (i + 1)); [q.bag[i], q.bag[j]] = [q.bag[j], q.bag[i]]; } } return q.bag.pop(); }
const fits = (q, t, r, x, y) => ROT[t][r].every(([cx, cy]) => { const X = x + cx, Y = y + cy; return X >= 0 && X < COLS && Y < R && (Y < 0 || !q.board[Y][X]); });
const grounded = (q) => !fits(q, q.cur.t, q.cur.r, q.cur.x, q.cur.y + 1);
function ghostY(q) { let y = q.cur.y; while (fits(q, q.cur.t, q.cur.r, q.cur.x, y + 1)) y++; return y; }
function spawn(q, t) {
  q.cur = { t, r: 0, x: 3, y: HID - 1 }; q.lockT = 0; q.fallT = 0; q.resets = 0; q.lastRot = false; q.lastKick = 0; q.ai = null;
  if (!fits(q, t, 0, 3, q.cur.y)) return die(q);
  if (fits(q, t, 0, 3, q.cur.y + 1)) q.cur.y++;
  q.lowest = q.cur.y; q.vis = { x: q.cur.x, y: q.cur.y - 0.6 };
}
function nextPiece(q) { const t = q.queue.shift(); q.queue.push(fromBag(q)); q.holdUsed = false; q.qAnim = 1; spawn(q, t); }
function tryMove(q, dx, dy) {
  const cu = q.cur; if (!cu || !fits(q, cu.t, cu.r, cu.x + dx, cu.y + dy)) return false;
  const g = grounded(q); cu.x += dx; cu.y += dy; q.lastRot = false;
  if (cu.y > q.lowest) { q.lowest = cu.y; q.resets = 0; q.lockT = 0; } else if (g && q.resets < MAXRESET) { q.resets++; q.lockT = 0; }
  return true;
}
function rotate(q, dir) {
  const cu = q.cur; if (!cu || cu.t === 'O') return false;
  const r2 = (cu.r + dir + 4) % 4, tab = (cu.t === 'I' ? KI : KJ)[cu.r + '>' + r2], g = grounded(q);
  for (let i = 0; i < tab.length; i++) {
    const [kx, ky] = tab[i]; if (!fits(q, cu.t, r2, cu.x + kx, cu.y - ky)) continue;
    cu.x += kx; cu.y -= ky; cu.r = r2; q.lastRot = true; q.lastKick = i;
    if (cu.y > q.lowest) { q.lowest = cu.y; q.resets = 0; q.lockT = 0; } else if (g && q.resets < MAXRESET) { q.resets++; q.lockT = 0; }
    q.vis.x = cu.x; q.vis.y = cu.y; if (!q.cpu) k.sfx('click'); return true;
  }
  return false;
}
function hardDrop(q) { const gy = ghostY(q), d = gy - q.cur.y; if (d) { q.lastRot = false; q.cur.y = gy; } q.vis.y = gy; q.vis.x = q.cur.x; q.shake = Math.max(q.shake, d > 6 ? 3 : 2); k.sfx('hit'); lockPiece(q); }
function doHold(q) {
  if (q.holdUsed || !q.cur) return; const t = q.cur.t; q.holdPop = 1; if (!q.cpu) k.sfx('pop');
  if (q.hold) { const h2 = q.hold; q.hold = t; spawn(q, h2); } else { q.hold = t; nextPiece(q); }
  q.holdUsed = true;
}
function tspin(q) {
  const cu = q.cur; if (cu.t !== 'T' || !q.lastRot) return '';
  const occ = (x, y) => x < 0 || x >= COLS || y >= R || (y >= 0 && !!q.board[y][x]);
  const X = cu.x, Y = cu.y, cs = [occ(X, Y), occ(X + 2, Y), occ(X + 2, Y + 2), occ(X, Y + 2)];
  if (cs.filter(Boolean).length < 3) return '';
  const f = [[0, 1], [1, 2], [2, 3], [3, 0]][cu.r];
  return (cs[f[0]] && cs[f[1]]) || q.lastKick === 4 ? 'full' : 'mini';
}
const L0 = (q) => LAY[P.indexOf(q)];
function lockPiece(q) {
  const cu = q.cur, cells = ROT[cu.t][cu.r].map(([x, y]) => [cu.x + x, cu.y + y]), ts = tspin(q);
  if (cells.every(([, y]) => y < HID)) return die(q);
  for (const [x, y] of cells) if (y >= 0) q.board[y][x] = cu.t;
  q.lockFx = { cells, t: 0.18 }; q.cur = null;
  const full = []; for (let y = 0; y < R; y++) if (q.board[y].every(Boolean)) full.push(y);
  attack(q, full, ts, cu);
  if (full.length) {
    q.clearing = full; q.clearT = CLR; const l = L0(q);
    if (!l.mini) for (const y of full) for (let x = 0; x < COLS; x += 2) k.burst(l.bx + (x + 0.5) * l.S, l.by + (y - HID + 0.5) * l.S, COLORS[q.board[y][x]], 2, 130);
  } else { addGarbage(q); if (q.alive) nextPiece(q); }
}
function attack(q, full, ts, cu) {
  const n = full.length; let a = 0, name = '';
  if (ts === 'full') { a = [0, 2, 4, 6][n]; name = ['T-GIRO', 'T-GIRO SIMPLE', 'T-GIRO DOBLE', 'T-GIRO TRIPLE'][n]; }
  else if (ts === 'mini') { a = [0, 0, 1][n] || 1; name = 'MINI T-GIRO'; }
  else { a = [0, 0, 1, 2, 4][n]; name = ['', '', 'DOBLE', 'TRIPLE', '¡CUATRO!'][n]; }
  const hard = n === 4 || (ts && n > 0);
  if (n > 0) {
    if (hard && q.b2b) { a += 1; pop(q, 'BACK-TO-BACK', '#7ff0ff', 13); }
    q.b2b = hard; q.combo++; a += COMBO[Math.min(q.combo, COMBO.length - 1)];
    if (q.combo > 0) pop(q, 'COMBO ×' + q.combo, '#ffb35c', 14);
    if (q.board.every((row, y) => full.includes(y) || row.every((v) => !v))) { a += 6; pop(q, '¡LIMPIO!', '#7cf7a0', 16); k.confetti(q.col, 40); }
    q.lines += n;
  } else q.combo = -1;
  if (name) pop(q, name, n === 4 ? '#f7d046' : ts ? '#d49bff' : '#fff', n === 4 ? 20 : 16);
  if (n === 4 || (ts && n)) { k.sfx('win'); k.shake(4); } else if (n) k.sfx('coin'); else if (ts) k.sfx('pop');
  if (!a) return;
  // cancela primero la basura pendiente
  let cancel = 0; while (a > 0 && q.inc.length) { const g = q.inc[0], m = Math.min(a, g.n); g.n -= m; a -= m; cancel += m; if (!g.n) q.inc.shift(); }
  const l = L0(q), cx = l.bx + (cu.x + 1.5) * l.S, cy = l.by + (cu.y - HID) * l.S;
  if (cancel) k.float('−' + cancel, l.meter.x, l.meter.y + l.meter.h - 20, '#7ff0ff');
  if (a > 0) {
    const o = P[1 - P.indexOf(q)]; if (!o || !o.alive) return;
    o.inc.push({ n: a, hole: Math.floor(Math.random() * COLS), t: 0 }); q.sent += a;
    const lo = L0(o); projs.push({ x0: cx, y0: cy, x1: lo.meter.x + lo.meter.w / 2, y1: lo.meter.y + lo.meter.h - 10, t: 0, n: a, col: q.col });
    k.float('+' + a, cx, cy - 10, q.col); k.sfx('shoot');
  }
}
function addGarbage(q) {
  let n = 0;
  while (q.inc.length && n < 8) {
    const g = q.inc[0], take = Math.min(g.n, 8 - n);
    for (let i = 0; i < take; i++) { const top = q.board.shift(); if (top.some(Boolean)) q.overflow = true; const row = Array(COLS).fill('G'); row[g.hole] = null; q.board.push(row); }
    g.n -= take; n += take; if (!g.n) q.inc.shift();
  }
  if (n) { q.shake = Math.max(q.shake, 3 + n); q.rowFx = { n, t: 0.18 }; k.sfx('hurt'); if (q.overflow) die(q); }
}
function finishClear(q) {
  const rows = q.clearing; q.clearing = null;
  q.board = q.board.filter((_, y) => !rows.includes(y)); while (q.board.length < R) q.board.unshift(Array(COLS).fill(null));
  nextPiece(q);
}
function die(q) { if (!q.alive) return; q.alive = false; q.cur = null; q.clearing = null; q.dieT = 0; k.sfx('explode'); k.shake(6); if (!over) { over = true; overT = 0; } }
function pop(q, txt, col, size) { q.pops.push({ txt, col, size, t: 1.2, max: 1.2 }); if (q.pops.length > 3) q.pops.shift(); }
/* gravedad (s por fila): 0,95 s al empezar (≈60 % de la normal) → 0,07 s hacia los 2,5 min de ronda */
const grav = () => { const d = Math.min(1, rt / 150), e = d * d * (3 - 2 * d); return 0.95 + (0.07 - 0.95) * e; };

/* ---------- IA de la CPU: evalúa todas las colocaciones (con y sin reserva) ---------- */
function evalBoard(b, lines) {
  const hs = []; let holes = 0, agg = 0, bump = 0, maxH = 0;
  for (let x = 0; x < COLS; x++) { let y = 0; while (y < R && !b[y][x]) y++; const h = R - y; hs.push(h); agg += h; maxH = Math.max(maxH, h); let seen = false; for (let yy = 0; yy < R; yy++) { if (b[yy][x]) seen = true; else if (seen) holes++; } }
  for (let x = 0; x < COLS - 1; x++) bump += Math.abs(hs[x] - hs[x + 1]);
  const danger = maxH > 14 ? (maxH - 14) * 4 : 0;
  return -0.51 * agg + (lines === 4 ? 8 : lines >= 2 ? lines * 1.2 : lines * 0.5) - 0.36 * holes * 2 - 0.18 * bump - danger;
}
function bestPlacements(q, t) {
  const out = [];
  for (let r = 0; r < (t === 'O' ? 1 : 4); r++) for (let x = -2; x < COLS; x++) {
    if (!fits(q, t, r, x, 0)) continue; let y = 0; while (fits(q, t, r, x, y + 1)) y++;
    const b = q.board.map((row) => row.slice()); for (const [cx, cy] of ROT[t][r]) if (y + cy >= 0) b[y + cy][x + cx] = t;
    let lines = 0; const nb = b.filter((row) => { if (row.every(Boolean)) { lines++; return false; } return true; }); while (nb.length < R) nb.unshift(Array(COLS).fill(null));
    out.push({ r, x, s: evalBoard(nb, lines) });
  }
  return out.sort((a, b) => b.s - a.s);
}
function cpuThink(q) {
  const lv = cpuLv, a = bestPlacements(q, q.cur.t), alt = !q.holdUsed ? bestPlacements(q, q.hold || q.queue[0]) : [];
  let use = a, hold = false; if (alt.length && (!a.length || alt[0].s > a[0].s + 1.5)) { use = alt; hold = true; }
  const err = Math.max(0.03, 0.2 - lv * 0.017), pick = use[Math.random() < err ? Math.min(use.length - 1, 1 + Math.floor(Math.random() * 3)) : 0] || { r: 0, x: 3 };
  q.ai = { hold, r: pick.r, x: pick.x, t: Math.max(0.1, 0.5 - lv * 0.04) * (0.8 + Math.random() * 0.4), step: Math.max(0.028, 0.1 - lv * 0.007) };
}
function cpuTick(q, dt) {
  if (!q.cur) return; if (!q.ai) cpuThink(q);
  const ai = q.ai; ai.t -= dt; if (ai.t > 0) return; ai.t = ai.step;
  if (ai.hold) { ai.hold = false; doHold(q); if (q.cur) { const keep = q.ai; q.ai = keep; } return; }
  if (q.cur.r !== ai.r) { if (!rotate(q, ai.r === (q.cur.r + 3) % 4 ? -1 : 1)) ai.r = q.cur.r; return; }
  if (q.cur.x !== ai.x) { if (!tryMove(q, Math.sign(ai.x - q.cur.x), 0)) ai.x = q.cur.x; return; }
  hardDrop(q);
}

/* ---------- Entrada humana ---------- */
function human(q, dt, raw) {
  const p = q.p, hit = (key) => k.phit(p, key), held = (key) => k.pheld(p, key), solo = !k.party && p === 0;
  if (!q.cur) return;
  if (solo && raw.has('KeyC')) doHold(q);
  if (hit('b')) doHold(q);
  if (!q.cur) return;
  if (solo && raw.has('KeyZ')) rotate(q, -1); else if (hit('a')) rotate(q, 1);
  if (hit('up')) return hardDrop(q);
  if (hit('left')) { tryMove(q, -1, 0); q.das = -1; q.dasT = 0; }
  if (hit('right')) { tryMove(q, 1, 0); q.das = 1; q.dasT = 0; }
  const hl = held('left'), hr = held('right');
  if (q.das && !(q.das < 0 ? hl : hr)) { q.das = hl ? -1 : hr ? 1 : 0; q.dasT = 0; }
  if (q.das) { q.dasT += dt; while (q.dasT >= DAS) { if (!tryMove(q, q.das, 0)) { q.dasT = DAS; break; } q.dasT -= ARR; } }
  q.soft = held('down');
  if (solo) touch(q, dt);
}
/* táctil (solo sin tele): arrastrar mueve, tocar gira, deslizar abajo rápido = caída, arriba = reserva */
function touch(q, dt) {
  const p = k.ptr, l = L0(q), step = l.S * 1.1;
  if (p.hit) {
    const b = BTN.find((b2) => p.sx > b2.x - 4 && p.sx < b2.x + b2.w + 4 && p.sy > b2.y - 4 && p.sy < b2.y + b2.h + 4);
    if (b) { G = { btn: b }; b.pt = 0.14; if (b.id === 'hold') doHold(q); else if (b.id === 'ccw') rotate(q, -1); else if (b.id === 'cw') rotate(q, 1); else hardDrop(q); return; }
    G = { x0: p.sx, y0: p.sy, ax: p.sx, ay: p.sy, t: 0, axis: null, hist: [[0, p.sx, p.sy]], pc: q.cur };
  }
  if (G && !G.btn && q.cur && G.pc === q.cur) {
    G.t += dt; G.hist.push([G.t, p.x, p.y]); while (G.hist.length > 2 && G.t - G.hist[1][0] > 0.1) G.hist.shift();
    const dx = p.x - G.x0, dy = p.y - G.y0;
    if (!G.axis && Math.hypot(dx, dy) > 9) G.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    if (G.axis === 'h') { while (p.x - G.ax >= step) { if (!tryMove(q, 1, 0)) { G.ax = p.x; break; } G.ax += step; } while (G.ax - p.x >= step) { if (!tryMove(q, -1, 0)) { G.ax = p.x; break; } G.ax -= step; } }
    else if (G.axis === 'v') { while (p.y - G.ay >= step) { if (!tryMove(q, 0, 1)) { G.ay = p.y; break; } G.ay += step; } }
    if (p.up) {
      const h0 = G.hist[0], d2 = Math.max(0.016, G.t - h0[0]), vy = (p.y - h0[2]) / d2;
      if (G.axis === 'v' && dy > 30 && vy > 650) hardDrop(q);
      else if (G.axis === 'v' && dy < -30 && vy < -450) doHold(q);
      else if (!G.axis && G.t < 0.4 && Math.hypot(dx, dy) < 12) rotate(q, 1);
    }
  }
  if (p.up) G = null;
}
function gravity(q, dt) {
  if (!q.cur) return;
  if (!grounded(q)) {
    const g = grav(), iv = q.soft ? Math.min(g, 0.035) : g; q.fallT += dt;
    while (q.fallT >= iv) { q.fallT -= iv; if (!tryMove(q, 0, 1)) break; if (grounded(q)) { q.fallT = 0; break; } }
  } else { q.fallT = 0; q.lockT += dt; if (q.lockT >= LOCK) lockPiece(q); }
}

/* ---------- Partida ---------- */
function setupPlayers() {
  const pl = k.players(2);
  if (!P.length || P.length !== 2) P = pl.map((x) => newPlayer(x.p, x));
  else P.forEach((q, i) => { q.cpu = pl[i].cpu; q.name = pl[i].name; q.col = pl[i].color; });
}
k.onParty = () => setupPlayers();
function startRound() { round++; seed = (Math.random() * 1e9) | 0; rt = 0; over = false; overT = 0; projs = []; P.forEach(roundReset); banner = 1.6; k.count(3); }
function reset() { cpuLv = Math.min(10, lsGet('cpu:' + ID)); P = []; setupPlayers(); round = 0; startRound(); }
function endRound() {
  const alive = P.filter((q) => q.alive), win = alive.length === 1 ? alive[0] : null;
  if (win) { win.wins++; k.confetti(win.col, 50); }
  if (win && win.wins >= WINS) {
    const hu = P.filter((q) => !q.cpu);
    if (hu.length === 1 && !win.cpu) lsSet('cpu:' + ID, Math.min(10, cpuLv + 1));
    return k.podium(P.map((q) => ({ p: q.p, score: q.wins })), { fmt: (s) => s + (s === 1 ? ' ronda' : ' rondas'), head: `¡Gana ${win.cpu ? 'la CPU' : win.name === 'Tú' ? 'tu pozo' : win.name}!` });
  }
  startRound();
}
function update(dt) {
  time += dt; const raw = new Set(RAW); RAW.clear();
  for (const q of P) effects(q, dt);
  for (const pr of projs) pr.t += dt * 2.2; projs = projs.filter((pr) => pr.t < 1);
  banner = Math.max(0, banner - dt);
  if (!k.gate(reset)) return;
  if (k.counting()) return;
  if (over) { overT += dt; for (const q of P) if (!q.alive) q.dieT += dt; if (overT > 1.6) endRound(); return; }
  rt += dt;
  for (const q of P) {
    if (!q.alive) continue;
    if (q.clearing) { q.clearT -= dt; if (q.clearT <= 0) finishClear(q); continue; }
    if (q.cpu) { cpuTick(q, dt); q.soft = false; } else human(q, dt, raw);
    if (q.alive && q.cur) gravity(q, dt);
  }
}
function effects(q, dt) {
  if (!q.board) return;
  const f = 1 - Math.exp(-dt * 38); if (q.cur) { q.vis.x += (q.cur.x - q.vis.x) * f; q.vis.y += (q.cur.y - q.vis.y) * f; }
  for (const p of q.pops) p.t -= dt; q.pops = q.pops.filter((p) => p.t > 0);
  if (q.lockFx && (q.lockFx.t -= dt) <= 0) q.lockFx = null;
  if (q.rowFx && (q.rowFx.t -= dt) <= 0) q.rowFx = null;
  q.shake = Math.max(0, q.shake - dt * 20); q.holdPop = Math.max(0, (q.holdPop || 0) - dt * 5); q.qAnim = Math.max(0, (q.qAnim || 0) - dt * 7);
  for (const b of BTN) b.pt = Math.max(0, b.pt - dt);
}

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ${FONT}`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function small(s, x, y, align, col) { c.font = `800 ${PORT ? 10 : 9}px ${FONT}`; c.textAlign = align || 'center'; c.textBaseline = 'top'; c.fillStyle = col || '#9790d6'; c.fillText(s, x, y); }
const SPR = {};
function block(col, s) {
  const key = col + '|' + s; if (SPR[key]) return SPR[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(s * 2); const g = cv.getContext('2d'); g.scale(2, 2);
  const lw = Math.max(1, s * 0.075), r = s * 0.2, i = lw / 2, e = s * 0.17;
  ART.rr(g, i, i, s - lw, s - lw, r); g.fillStyle = ART.dark(col, 0.3); g.fill(); g.save(); g.clip();
  g.fillStyle = ART.lite(col, 0.4); g.beginPath(); g.moveTo(0, 0); g.lineTo(s, 0); g.lineTo(s - e, e); g.lineTo(e, e); g.lineTo(e, s - e); g.lineTo(0, s); g.fill();
  const gr = g.createLinearGradient(0, e, 0, s - e); gr.addColorStop(0, ART.lite(col, 0.12)); gr.addColorStop(1, ART.dark(col, 0.08)); g.fillStyle = gr; ART.rr(g, e, e, s - 2 * e, s - 2 * e, r * 0.45); g.fill();
  if (col === COLORS.G) { g.strokeStyle = 'rgba(26,21,48,.35)'; g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(e, s - e); g.lineTo(s - e, e); g.stroke(); }
  else { g.fillStyle = 'rgba(255,255,255,.5)'; ART.rr(g, e + s * 0.07, e + s * 0.07, s * 0.3, s * 0.11, s * 0.055); g.fill(); }
  g.restore(); ART.rr(g, i, i, s - lw, s - lw, r); g.lineWidth = lw; g.strokeStyle = OUT; g.stroke();
  return (SPR[key] = cv);
}
function panel(g, p, title) {
  g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, p.x, p.y + 3, p.w, p.h, 9); g.fill();
  ART.rr(g, p.x, p.y, p.w, p.h, 9); ART.fillOut(g, '#1a1740', 2.2);
  if (title) { g.font = `800 ${PORT ? 10 : 8.5}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#9790d6'; g.fillText(title, p.x + p.w / 2, p.y + 5); }
}
let STATIC = null;
function buildStatic() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#231c52'); gr.addColorStop(1, '#0c0a20'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const rn = mulberry(3), keys = Object.keys(SHAPES);
  for (let i = 0; i < 26; i++) { const t = keys[i % 7], r = Math.floor(rn() * 4), s = 8 + rn() * 9, x = rn() * W, y = rn() * H; g.fillStyle = 'rgba(255,255,255,.03)'; for (const [cx, cy] of ROT[t][r]) { ART.rr(g, x + cx * s, y + cy * s, s - 1.5, s - 1.5, s * 0.2); g.fill(); } }
  LAY.forEach((l, i) => {
    const q = P[i], S = l.S, BW = COLS * S, BH = ROWS * S, F = l.mini ? 3 : 4, col = q ? q.col : '#6e62f5';
    const rg = g.createRadialGradient(l.bx + BW / 2, l.by + BH / 2, 10, l.bx + BW / 2, l.by + BH / 2, BH * 0.7); rg.addColorStop(0, ART.alpha(col, 0.2)); rg.addColorStop(1, ART.alpha(col, 0)); g.fillStyle = rg; g.fillRect(l.bx - BW, l.by - 40, BW * 3, BH + 80);
    g.fillStyle = 'rgba(0,0,0,.4)'; ART.rr(g, l.bx - F, l.by - F + 5, BW + 2 * F, BH + 2 * F, 9); g.fill();
    ART.rr(g, l.bx - F, l.by - F, BW + 2 * F, BH + 2 * F, 9); ART.fillOut(g, ART.mix('#2e2866', col, 0.35), 2.5);
    gr = g.createLinearGradient(0, l.by, 0, l.by + BH); gr.addColorStop(0, '#16133a'); gr.addColorStop(1, '#0a091c'); g.fillStyle = gr; g.fillRect(l.bx, l.by, BW, BH);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; g.beginPath();
    for (let x = 1; x < COLS; x++) { g.moveTo(l.bx + x * S + 0.5, l.by); g.lineTo(l.bx + x * S + 0.5, l.by + BH); }
    for (let y = 1; y < ROWS; y++) { g.moveTo(l.bx, l.by + y * S + 0.5); g.lineTo(l.bx + BW, l.by + y * S + 0.5); }
    g.stroke(); g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(l.bx - 1, l.by - 1, BW + 2, BH + 2);
    const m = l.meter; ART.rr(g, m.x - 1, m.y - 1, m.w + 2, m.h + 2, 3); ART.fillOut(g, '#0c0a20', 1.5);
    if (l.next) panel(g, l.next, 'SIGUIENTE'); if (l.hold) panel(g, l.hold, 'RESERVA');
  });
  STATIC = cv;
}
function mini(t, cx, cy, m, alpha, sc) {
  const cells = ROT[t][0], xs = cells.map((p) => p[0]), ys = cells.map((p) => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
  const w = (Math.max(...xs) - x0 + 1) * m, h = (Math.max(...ys) - y0 + 1) * m, spr = block(COLORS[t], m);
  c.save(); c.globalAlpha = alpha; c.translate(cx, cy); if (sc) c.scale(sc, sc);
  for (const [x, y] of cells) c.drawImage(spr, (x - x0) * m - w / 2, (y - y0) * m - h / 2, m, m);
  c.restore();
}
function drawPlayer(q, l) {
  const S = l.S, BW = COLS * S, BH = ROWS * S, sx = q.shake ? (Math.random() - 0.5) * q.shake : 0, sy = q.shake ? (Math.random() - 0.5) * q.shake : 0;
  const px = (x) => l.bx + x * S + sx, py = (y) => l.by + (y - HID) * S + sy;
  c.save(); c.beginPath(); c.rect(l.bx, l.by, BW, BH); c.clip();
  const clr = q.clearing, p = clr ? 1 - q.clearT / CLR : 0, rise = q.rowFx ? q.rowFx.n * S * (q.rowFx.t / 0.18) : 0;
  const grey = !q.alive ? Math.min(ROWS, Math.floor(q.dieT / 0.8 * ROWS)) : 0;
  for (let y = HID; y < R; y++) for (let x = 0; x < COLS; x++) {
    const t = q.board[y][x]; if (!t) continue;
    const col = R - 1 - y < grey ? '#4b4863' : COLORS[t];
    if (clr && clr.includes(y)) { const s2 = S * (1 - p); c.drawImage(block(col, S), px(x) + (S - s2) / 2, py(y) + (S - s2) / 2, s2, s2); c.globalAlpha = 0.5 * (1 - p); c.fillStyle = '#fff'; c.fillRect(px(x), py(y), S, S); c.globalAlpha = 1; }
    else c.drawImage(block(col, S), px(x), py(y) + rise, S, S);
  }
  if (q.cur && q.alive) {
    const gy = ghostY(q), col = COLORS[q.cur.t];
    if (gy > q.cur.y && !l.mini) for (const [cx, cy] of ROT[q.cur.t][q.cur.r]) { ART.rr(c, px(q.cur.x + cx) + 1.5, py(gy + cy) + 1.5, S - 3, S - 3, S * 0.18); c.globalAlpha = 0.16; c.fillStyle = col; c.fill(); c.globalAlpha = 0.75; c.lineWidth = S > 12 ? 2 : 1.2; c.strokeStyle = col; c.stroke(); c.globalAlpha = 1; }
    const spr = block(col, S), warn = grounded(q) ? Math.min(1, q.lockT / LOCK) : 0;
    for (const [cx, cy] of ROT[q.cur.t][q.cur.r]) { const x = l.bx + (q.vis.x + cx) * S + sx, y = l.by + (q.vis.y + cy - HID) * S + sy; c.drawImage(spr, x, y, S, S); if (warn > 0) { c.globalAlpha = warn * 0.35; c.fillStyle = OUT; c.fillRect(x + 1, y + 1, S - 2, S - 2); c.globalAlpha = 1; } }
  }
  if (q.lockFx) for (const [x, y] of q.lockFx.cells) { c.globalAlpha = (q.lockFx.t / 0.18) * 0.7; c.fillStyle = '#fff'; c.fillRect(px(x) + 1, py(y) + 1, S - 2, S - 2); c.globalAlpha = 1; }
  c.restore();
  // peligro
  let danger = false; for (let y = HID; y < HID + 5 && !danger; y++) if (q.board[y].some(Boolean)) danger = true;
  if (danger && q.alive) { c.globalAlpha = 0.45 + 0.35 * Math.sin(time * 8); c.strokeStyle = '#ff4d6a'; c.lineWidth = 3; ART.rr(c, l.bx - 3, l.by - 3, BW + 6, BH + 6, 8); c.stroke(); c.globalAlpha = 1; }
  // basura pendiente
  const m = l.meter, pend = q.inc.reduce((a, g) => a + g.n, 0);
  if (pend) { const hh = Math.min(m.h, pend * S), fl = 0.75 + 0.25 * Math.sin(time * 10); c.fillStyle = pend >= 4 ? `rgba(255,77,106,${fl})` : '#ff9a3c'; c.fillRect(m.x, m.y + m.h - hh, m.w, hh); c.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 1; i < pend && i * S < m.h; i++) c.fillRect(m.x, m.y + m.h - i * S, m.w, 1); }
  // siguiente y reserva
  if (l.next) {
    const n = l.next, sl = PORT ? [[n.y + 46, 16], [n.y + 92, 12], [n.y + 128, 12]] : [[n.y + 34, 10], [n.y + 72, 8], [n.y + 104, 8]];
    q.queue.slice(0, 3).forEach((t, i) => mini(t, n.x + n.w / 2, sl[i][0] + (q.qAnim || 0) * 10, sl[i][1], 1 - (i === 2 ? q.qAnim || 0 : 0)));
  }
  if (l.hold && q.hold) mini(q.hold, l.hold.x + l.hold.w / 2, l.hold.y + l.hold.h / 2 + 6, PORT ? 16 : 10, q.holdUsed ? 0.3 : 1, 1 + (q.holdPop || 0) * 0.25);
  // nombre, rondas y estadísticas
  const nm = q.cpu ? 'CPU' : q.name, nx = l.name.x, ny = l.name.y;
  if (PORT && !l.mini) { label(nm, nx, ny, 22, q.col); for (let i = 0; i < WINS; i++) { c.beginPath(); c.arc(nx + 8 + i * 20, ny + 44, 7, 0, 6.283); ART.fillOut(c, i < q.wins ? '#ffd166' : 'rgba(255,255,255,.15)', 2); } label(`Enviadas ${q.sent}`, W - 12, ny + 2, 14, '#fff', 'right'); label(`Líneas ${q.lines} · Ronda ${round}`, W - 12, ny + 24, 13, '#c9c3ff', 'right'); }
  else if (l.mini) { label(nm, nx, ny - 20, 14, q.col, 'center'); for (let i = 0; i < WINS; i++) { c.beginPath(); c.arc(nx - 10 + i * 20, ny + 14, 5.5, 0, 6.283); ART.fillOut(c, i < q.wins ? '#ffd166' : 'rgba(255,255,255,.15)', 1.8); } }
  else { label(nm, nx, ny, 18, q.col, 'center'); for (let i = 0; i < WINS; i++) { c.beginPath(); c.arc(nx + BW / 2 - 30 + i * 18, ny + 11, 6, 0, 6.283); ART.fillOut(c, i < q.wins ? '#ffd166' : 'rgba(255,255,255,.15)', 1.8); } }
  if (l.stats) {
    const s = l.stats; small('ENVIADAS', s.x + (PORT ? 41 : 26), s.y); label(String(q.sent), s.x + (PORT ? 41 : 26), s.y + 12, PORT ? 20 : 16, '#fff', 'center');
    small('LÍNEAS', s.x + (PORT ? 41 : 26), s.y + (PORT ? 42 : 36)); label(String(q.lines), s.x + (PORT ? 41 : 26), s.y + (PORT ? 54 : 48), PORT ? 18 : 14, '#fff', 'center');
    let cy = s.y + (PORT ? 86 : 76);
    if (q.combo > 0) { label('COMBO ×' + q.combo, s.x + (PORT ? 41 : 26), cy, PORT ? 13 : 10, '#ffb35c', 'center'); cy += 18; }
    if (q.b2b) label('B2B', s.x + (PORT ? 41 : 26), cy, PORT ? 13 : 10, '#7ff0ff', 'center');
  }
  // textos
  let y = l.by + ROWS * S * 0.3;
  for (const p2 of q.pops) { const age = p2.max - p2.t, sc = (0.4 + 0.6 * Math.min(1, age / 0.2)) * (l.mini ? 0.55 : PORT ? 1.1 : 0.85); c.save(); c.globalAlpha = Math.min(1, p2.t / 0.35); c.translate(l.bx + BW / 2, y - age * 12); c.scale(sc, sc); label(p2.txt, 0, 0, p2.size, p2.col, 'center', 'middle'); c.restore(); y += p2.size * 1.2 * (l.mini ? 0.6 : 1); }
  if (!q.alive && q.dieT > 0.3) { c.save(); c.translate(l.bx + BW / 2, l.by + BH / 2); const s = Math.min(1, (q.dieT - 0.3) * 4) * (l.mini ? 0.5 : 1); c.scale(s, s); label('¡KO!', 0, 0, 36, '#ff5a6a', 'center', 'middle'); c.restore(); }
}
function drawButtons() {
  if (k.party) return;
  for (const b of BTN) {
    const on = b.pt > 0, y = b.y + (on ? 2 : 0);
    c.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(c, b.x, b.y + 4, b.w, b.h, 11); c.fill();
    ART.rr(c, b.x, y, b.w, b.h, 11); ART.fillOut(c, on ? '#6e62f5' : '#2b2658', 2.5);
    label({ hold: 'Reserva', ccw: '⟲', cw: '⟳', drop: 'Caída' }[b.id], b.x + b.w / 2, y + b.h / 2 + 1, b.id === 'ccw' || b.id === 'cw' ? 22 : 13, '#fff', 'center', 'middle');
  }
}
function draw() {
  if (!STATIC) buildStatic();
  c.drawImage(STATIC, 0, 0, W, H);
  P.forEach((q, i) => q.board && drawPlayer(q, LAY[i]));
  if (!PORT) { label('VS', W / 2, 190, 22, '#ffd166', 'center', 'middle'); label(`Ronda ${round}`, W / 2, 216, 11, '#c9c3ff', 'center', 'middle'); }
  for (const pr of projs) { const e = pr.t, x = pr.x0 + (pr.x1 - pr.x0) * e, y = pr.y0 + (pr.y1 - pr.y0) * e - Math.sin(e * Math.PI) * 60; c.beginPath(); c.arc(x, y, 5 + pr.n, 0, 6.283); ART.fillOut(c, pr.col, 2); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x - 2, y - 2, 2 + pr.n * 0.3, 0, 6.283); c.fill(); }
  drawButtons();
  if (banner > 0 && k.st === 'play' && round > 1) { c.globalAlpha = Math.min(1, banner * 2); label(`Ronda ${round}`, W / 2, H * 0.22, 30, '#fff', 'center', 'middle'); c.globalAlpha = 1; }
}

window.__td = { get P() { return P; }, get round() { return round; } };
reset();
k.show(CFG.title || 'Tetra Duelo', 'Borra varias líneas a la vez para mandar basura al pozo rival. Gana dos rondas. ← → mover · ↓ bajar · ↑ dejar caer · A girar (Z al revés) · B reserva. En pantalla: arrastra, toca para girar y desliza abajo.<br>Toca para jugar');
k.run(update, draw);
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight >= innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
