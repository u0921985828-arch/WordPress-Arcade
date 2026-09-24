/* tetra.js — motor independiente de Tetra Drop y Tetra Drop Marathon (se edita aquí, no se genera).
 * window.TETRA_MODE = 'classic' | 'marathon'.
 * Reglas: bolsa de 7, pieza fantasma, rotación SRS con wall kicks, retardo de bloqueo 0,5 s con 15 reinicios como máximo
 * (se renuevan solo al alcanzar una fila más baja), reserva una vez por pieza, cola de 3 y puntuación estándar
 * (T-giro, back-to-back, combo, tablero limpio). Disposición vertical 360×640 u horizontal 640×360 según la pantalla. */
const MODE = window.TETRA_MODE === 'marathon' ? 'marathon' : 'classic';
const LAND = innerWidth > innerHeight;
window.CFG = Object.assign({ id: 'tetra-' + MODE }, window.CFG || {}, LAND ? { hud: 'tr' } : {});
const W = LAND ? 640 : 360, H = LAND ? 360 : 640;
const k = Kit({ w: W, h: H, title: MODE === 'marathon' ? 'Tetra Drop Marathon' : 'Tetra Drop', bg: '#0f0d25' }), c = k.ctx;
const OUT = '#1a1530', ACC = '#6e62f5';
const COLS = 10, ROWS = 20, HID = 2, R = ROWS + HID;          // HID filas ocultas encima del tablero visible
const START = MODE === 'marathon' ? 5 : 1, GOAL = MODE === 'marathon' ? 150 : 0;
const LOCK = 0.5, MAXRESET = 15, CLR = 0.34, DAS = 0.16, ARR = 0.045;

/* ---------- Disposición ---------- */
const P = LAND ? {
  S: 17, BX: 235, BY: 10, STEP: 20, m1: 16, m2: 12,
  score: { x: 20, y: 10, w: 195, h: 52 }, hold: { x: 115, y: 70, w: 100, h: 86 }, stats: { x: 20, y: 70, w: 88, h: 86 },
  next: { x: 425, y: 10, w: 100, h: 172 }, chips: { x: 20, y: 168, w: 195, row: true },
} : {
  S: 27, BX: 8, BY: 50, STEP: 26, m1: 14, m2: 11,
  score: null, hold: { x: 286, y: 230, w: 66, h: 76 }, stats: { x: 286, y: 314, w: 66, h: 118 },
  next: { x: 286, y: 50, w: 66, h: 172 }, chips: { x: 286, y: 442, w: 66, row: false },
};
const { S, BX, BY } = P, BW = COLS * S, BH = ROWS * S;
const BTN = (LAND ? [[20, 284, 92, 64], [123, 284, 92, 64], [425, 284, 92, 64], [528, 284, 92, 64]]
  : [[8, 598, 80, 38], [96, 598, 80, 38], [184, 598, 80, 38], [272, 598, 80, 38]])
  .map(([x, y, w, h], i) => ({ id: ['hold', 'ccw', 'cw', 'drop'][i], x, y, w, h, pt: 0 }));

/* ---------- Piezas y SRS ---------- */
const SHAPES = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]] };
const COLORS = { I: '#45d6ea', J: '#4f7cff', L: '#ff9a3c', O: '#f7d046', S: '#5fdc6e', T: '#b36cf0', Z: '#ff5a6a' };
const ROT = {};   // 4 estados por pieza; giro horario en su caja n×n: (x,y) → (n-1-y, x)
for (const t in SHAPES) { const n = t === 'I' || t === 'O' ? 4 : 3; let s = SHAPES[t]; ROT[t] = [s]; for (let i = 1; i < 4; i++) { if (t !== 'O') s = s.map(([x, y]) => [n - 1 - y, x]); ROT[t].push(s); } }
// Tablas de wall kicks SRS (y positiva = arriba, como en la guía)
const KJ = { '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]] };
const KI = { '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]] };

/* ---------- Estado ---------- */
let board, cur, queue, bag, hold, holdUsed, score, lines, level, combo, b2b;
let bestV = 0, fallT, lockT, resets, lowest, lastRot, lastKick, clearing, clearT, dying, dieT, ended, won;
let vis = { x: 0, y: 0 }, trails = [], pops = [], lockFx = null, rowFx = null, shown = 0, holdPop = 0, qAnim = 0, lvlFx = 0, G = null, dasDir = 0, dasT = 0, time = 0;
const RAW = new Set();   // teclas extra (Z = girar al revés, C = reserva) que el kit no distingue
addEventListener('keydown', (e) => { if (!e.repeat) RAW.add(e.code); });

const fits = (t, r, x, y) => ROT[t][r].every(([cx, cy]) => { const X = x + cx, Y = y + cy; return X >= 0 && X < COLS && Y < R && (Y < 0 || !board[Y][X]); });
const grounded = () => !fits(cur.t, cur.r, cur.x, cur.y + 1);
/* segundos por fila: nivel 1 = 1,2 s (antes 0,8), curva continua con las líneas (sin saltos al subir de nivel); nivel 10 ≈ 0,26 s (antes 0,21), suelo 0,045 s */
const grav = () => Math.max(0.053, 1.5 * Math.pow(0.88, START - 1 + lines / 10)); // 1.23: más fácil (antes 1,2 s·0,845^n, tope 0,045)
function fromBag() { if (!bag.length) bag = k.shuffle(Object.keys(SHAPES)); return bag.pop(); }
function ghostY() { let y = cur.y; while (fits(cur.t, cur.r, cur.x, y + 1)) y++; return y; }

function spawn(t) {
  cur = { t, r: 0, x: 3, y: HID - 1 }; lockT = 0; fallT = 0; resets = 0; lastRot = false; lastKick = 0;
  if (G) G.dead = true;                               // el gesto en curso no afecta a la pieza nueva
  if (!fits(t, 0, cur.x, cur.y)) return die();        // sin sitio para aparecer
  if (fits(t, 0, cur.x, cur.y + 1)) cur.y++;          // baja una fila al aparecer (como la guía)
  lowest = cur.y; vis.x = cur.x; vis.y = cur.y - 0.6;
}
function nextPiece() { const t = queue.shift(); queue.push(fromBag()); qAnim = 1; holdUsed = false; spawn(t); }
function touchReset() { if (resets < MAXRESET) { resets++; lockT = 0; } }   // límite de 15 reinicios del bloqueo
function landed() { if (cur.y > lowest) { lowest = cur.y; resets = 0; lockT = 0; } }

function tryMove(dx, dy) {
  if (!fits(cur.t, cur.r, cur.x + dx, cur.y + dy)) return false;
  const g = grounded(); cur.x += dx; cur.y += dy; lastRot = false;
  if (cur.y > lowest) landed(); else if (g) touchReset();
  return true;
}
function rotate(dir) {
  if (!cur || cur.t === 'O') return false;
  const r2 = (cur.r + dir + 4) % 4, tab = (cur.t === 'I' ? KI : KJ)[cur.r + '>' + r2], g = grounded();
  for (let i = 0; i < tab.length; i++) {
    const [kx, ky] = tab[i];
    if (!fits(cur.t, r2, cur.x + kx, cur.y - ky)) continue;
    cur.x += kx; cur.y -= ky; cur.r = r2; lastRot = true; lastKick = i;
    if (cur.y > lowest) landed(); else if (g) touchReset();
    vis.x = cur.x; vis.y = cur.y; k.sfx('click'); return true;
  }
  return false;
}
function hardDrop() {
  const y0 = cur.y, gy = ghostY(), d = gy - y0;
  if (d) { lastRot = false; cur.y = gy; }
  score += d * 2;
  if (d > 0) { const cols = {}; for (const [x, y] of ROT[cur.t][cur.r]) cols[x] = Math.min(cols[x] ?? 99, y); trails.push({ t: 0.24, col: COLORS[cur.t], cols: Object.keys(cols).map((x) => [cur.x + +x, y0 + cols[x], gy + cols[x]]) }); }
  vis.x = cur.x; vis.y = cur.y; k.sfx('hit'); k.shake(d > 6 ? 3 : 2);
  lockPiece();
}
function doHold() {
  if (holdUsed || !cur) return;
  const t = cur.t; holdPop = 1; k.sfx('pop');
  if (hold) { const h2 = hold; hold = t; spawn(h2); } else { hold = t; nextPiece(); }
  holdUsed = true;
}

/* T-giro por la regla de las 3 esquinas; «mini» si falta una esquina frontal (salvo con el 5.º kick) */
function tspinKind() {
  if (cur.t !== 'T' || !lastRot) return '';
  const occ = (x, y) => x < 0 || x >= COLS || y >= R || (y >= 0 && !!board[y][x]);
  const X = cur.x, Y = cur.y, cs = [occ(X, Y), occ(X + 2, Y), occ(X + 2, Y + 2), occ(X, Y + 2)];
  if (cs.filter(Boolean).length < 3) return '';
  const f = [[0, 1], [1, 2], [2, 3], [3, 0]][cur.r];
  return (cs[f[0]] && cs[f[1]]) || lastKick === 4 ? 'full' : 'mini';
}

function lockPiece() {
  const cells = ROT[cur.t][cur.r].map(([x, y]) => [cur.x + x, cur.y + y]), ts = tspinKind();
  if (cells.every(([, y]) => y < HID)) return die();   // bloqueada entera por encima del tablero
  for (const [x, y] of cells) if (y >= 0) board[y][x] = cur.t;
  lockFx = { cells, t: 0.2 };
  const full = []; for (let y = 0; y < R; y++) if (board[y].every(Boolean)) full.push(y);
  const cx = BX + (cur.x + 1.5) * S, cy = BY + (cur.y - HID + 0.5) * S;
  scoreLock(full, ts, cx, cy);
  if (full.length) {
    clearing = full; clearT = CLR; cur = null;
    for (const y of full) for (let x = 0; x < COLS; x++) k.burst(BX + (x + 0.5) * S, BY + (y - HID + 0.5) * S, COLORS[board[y][x]], 3, 170);
  } else nextPiece();
}

function scoreLock(full, ts, cx, cy) {
  const n = full.length;
  let base, name;
  if (ts === 'full') { base = [400, 800, 1200, 1600][n]; name = ['T-GIRO', 'T-GIRO SIMPLE', 'T-GIRO DOBLE', 'T-GIRO TRIPLE'][n]; }
  else if (ts === 'mini') { base = [100, 200, 400][n] || 400; name = n ? 'MINI T-GIRO ' + ['', 'SIMPLE', 'DOBLE'][n] : 'MINI T-GIRO'; }
  else { base = [0, 100, 300, 500, 800][n]; name = ['', '', 'DOBLE', 'TRIPLE', '¡TETRA!'][n]; }
  const hard = n === 4 || (ts && n > 0);
  let pts = base * level, isB2B = false, pc = false;
  if (n > 0) {
    if (hard && b2b) { pts = Math.floor(pts * 1.5); isB2B = true; }
    b2b = hard; combo++;
    if (combo > 0) pts += 50 * combo * level;
    pc = board.every((row, y) => full.includes(y) || row.every((v) => !v));
    if (pc) pts += [0, 800, 1200, 1800, 2000][n] * level;
  } else combo = -1;
  score += pts;
  // textos y efectos
  if (name) pop(name, n === 4 ? '#f7d046' : ts ? '#d49bff' : '#fff', n === 4 ? 30 : 22);
  if (isB2B) pop('BACK-TO-BACK', '#7ff0ff', 15);
  if (combo > 0) pop('COMBO ×' + combo, '#ffb35c', 17);
  if (pc) { pop('¡TABLERO LIMPIO!', '#7cf7a0', 18); k.confetti(); }
  if (pts) k.float('+' + pts, cx, cy, n === 4 ? '#f7d046' : '#fff');
  if (n === 4) { k.sfx('win'); k.shake(7); k.flash('rgba(255,255,255,.35)'); }
  else if (n) { k.sfx('coin'); k.shake(1 + n * 1.5); if (ts) k.sfx('pop'); }
  else if (ts) k.sfx('pop');
  if (n) {
    lines += n;
    const nl = START + Math.floor(lines / 10);
    if (nl > level) { level = nl; lvlFx = 1; setTimeout(() => k.sfx('start'), 250); pop('NIVEL ' + level, '#a99fff', 20); }
  }
}

function finishClear() {
  const rows = clearing; clearing = null;
  const below = (y) => rows.filter((r) => r > y).length, shift = Array(R).fill(0);
  for (let y = 0; y < R; y++) if (!rows.includes(y)) shift[y + below(y)] = below(y);   // animación: las filas bajan
  board = board.filter((_, y) => !rows.includes(y));
  while (board.length < R) board.unshift(Array(COLS).fill(null));
  rowFx = { shift, t: 0.14 };
  if (GOAL && lines >= GOAL) return win();
  nextPiece();
}
function die() { dying = true; dieT = 0; cur = null; clearing = null; k.sfx('hurt'); k.shake(5); }
function win() {
  won = true; k.st = 'over'; cur = null;
  k.show('¡Maratón completada!', `${GOAL} líneas · Puntos: ${score} · Récord ${k.best('tetra-' + MODE, score)}<br>Toca para jugar otra vez`);
}
function pop(txt, col, size) { pops.push({ txt, col, size, t: 1.25, max: 1.25 }); if (pops.length > 4) pops.shift(); }

function reset() {
  board = Array.from({ length: R }, () => Array(COLS).fill(null));
  bag = []; queue = [fromBag(), fromBag(), fromBag()]; hold = null;
  score = 0; shown = 0; lines = 0; level = START; combo = -1; b2b = false;
  clearing = null; dying = false; ended = false; won = false; trails = []; pops = []; lockFx = null; rowFx = null; G = null; dasDir = 0;
  bestV = k.best('tetra-' + MODE, 0); nextPiece(); qAnim = 0;
}

/* ---------- Entrada ---------- */
const inBtn = (p, b) => p.x > b.x - 5 && p.x < b.x + b.w + 5 && p.y > b.y - 5 && p.y < b.y + b.h + 5;
function action(id) { if (id === 'hold') doHold(); else if (id === 'ccw') rotate(-1); else if (id === 'cw') rotate(1); else if (id === 'drop') hardDrop(); }
function keyboard(dt, raw) {
  if (raw.has('KeyC')) doHold();
  if (!cur) return;
  if (raw.has('KeyZ')) rotate(-1); else if (k.hit.has('up') || k.hit.has('a')) rotate(1);
  if (k.hit.has('b')) return hardDrop();
  if (k.hit.has('left')) { tryMove(-1, 0); dasDir = -1; dasT = 0; }
  if (k.hit.has('right')) { tryMove(1, 0); dasDir = 1; dasT = 0; }
  const hl = k.held.has('left'), hr = k.held.has('right');
  if (dasDir && !(dasDir < 0 ? hl : hr)) { dasDir = hl ? -1 : hr ? 1 : 0; dasT = 0; }
  if (dasDir) { dasT += dt; while (dasT >= DAS) { if (!tryMove(dasDir, 0)) { dasT = DAS; break; } dasT -= ARR; } }
}
/* Táctil: arrastrar mueve casilla a casilla, arrastrar abajo baja, deslizar rápido abajo = caída, arriba = reserva, tocar = girar */
function touch(dt) {
  const p = k.ptr;
  if (p.hit) {
    const b = BTN.find((b2) => inBtn({ x: p.sx, y: p.sy }, b2));
    if (b) { G = { btn: b }; b.pt = 0.14; action(b.id); }
    else G = { x0: p.sx, y0: p.sy, ax: p.sx, ay: p.sy, t: 0, axis: null, hist: [[0, p.sx, p.sy]] };   // desde el punto real de contacto
  }
  if (G && !G.btn && !G.dead && cur) {
    G.t += dt; G.hist.push([G.t, p.x, p.y]); while (G.hist.length > 2 && G.t - G.hist[1][0] > 0.1) G.hist.shift();
    const dx = p.x - G.x0, dy = p.y - G.y0;
    if (!G.axis && Math.hypot(dx, dy) > 9) G.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    if (G.axis === 'v' && Math.abs(p.x - G.ax) > P.STEP * 1.5) G.axis = 'h';
    if (G.axis === 'h') {
      while (p.x - G.ax >= P.STEP) { if (!tryMove(1, 0)) { G.ax = p.x; break; } G.ax += P.STEP; }
      while (G.ax - p.x >= P.STEP) { if (!tryMove(-1, 0)) { G.ax = p.x; break; } G.ax -= P.STEP; }
    } else if (G.axis === 'v') {
      while (p.y - G.ay >= P.STEP) { if (!tryMove(0, 1)) { G.ay = p.y; break; } G.ay += P.STEP; score += 1; }
    }
  }
  if (p.up && G && !G.btn && !G.dead && cur) {
    const h0 = G.hist[0], dt2 = Math.max(0.016, G.t - h0[0]), vy = (p.y - h0[2]) / dt2, dy = p.y - G.y0, dx = p.x - G.x0;
    if (G.axis === 'v' && dy > 30 && vy > 650) hardDrop();
    else if (G.axis === 'v' && dy < -30 && vy < -450) doHold();
    else if (!G.axis && G.t < 0.4 && Math.hypot(dx, dy) < 12) rotate(1);
  }
  if (p.up) G = null;
}

function gravity(dt) {
  const soft = k.held.has('down');
  if (!grounded()) {
    const g = grav(), iv = soft ? Math.min(g, 0.035) : g;
    fallT += dt;
    while (fallT >= iv) { fallT -= iv; if (!tryMove(0, 1)) break; if (soft) score += 1; if (grounded()) { fallT = 0; break; } }
  } else { fallT = 0; lockT += dt; if (lockT >= LOCK) lockPiece(); }
}

function effects(dt) {
  time += dt;
  shown = Math.abs(score - shown) < 1 ? score : shown + (score - shown) * Math.min(1, dt * 12);
  const f = 1 - Math.exp(-dt * 38);
  if (cur) { vis.x += (cur.x - vis.x) * f; vis.y += (cur.y - vis.y) * f; }
  for (const t of trails) t.t -= dt; trails = trails.filter((t) => t.t > 0);
  for (const p of pops) p.t -= dt; pops = pops.filter((p) => p.t > 0);
  if (lockFx && (lockFx.t -= dt) <= 0) lockFx = null;
  if (rowFx && (rowFx.t -= dt) <= 0) rowFx = null;
  for (const b of BTN) b.pt = Math.max(0, b.pt - dt);
  holdPop = Math.max(0, holdPop - dt * 5); qAnim = Math.max(0, qAnim - dt * 7); lvlFx = Math.max(0, lvlFx - dt * 1.2);
}

/* ---------- Dibujo: utilidades y cachés ---------- */
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fillOut(g, fill, lw) { g.fillStyle = fill; g.fill(); g.lineWidth = lw || 2.5; g.strokeStyle = OUT; g.stroke(); }
function shade(hex, a) {
  const n = parseInt(hex.slice(1), 16), t = a > 0 ? 255 : 0, f = Math.abs(a), m = (v) => Math.round(v + (t - v) * f);
  return `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`;
}
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function small(g, s, x, y, align, col) { g.font = '800 9.5px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = align || 'center'; g.textBaseline = 'top'; g.fillStyle = col || '#9790d6'; g.fillText(s, x, y); }

// Bloque con relieve y contorno, cacheado por color y tamaño (a 2×)
const SPR = {};
function block(col, s) {
  const key = col + '|' + s; if (SPR[key]) return SPR[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(s * 2); const g = cv.getContext('2d'); g.scale(2, 2);
  const lw = Math.max(1.3, s * 0.075), r = s * 0.2, i = lw / 2, e = s * 0.17;
  rr(g, i, i, s - lw, s - lw, r); g.fillStyle = shade(col, -0.3); g.fill();
  g.save(); g.clip();
  g.fillStyle = shade(col, 0.4); g.beginPath(); g.moveTo(0, 0); g.lineTo(s, 0); g.lineTo(s - e, e); g.lineTo(e, e); g.lineTo(e, s - e); g.lineTo(0, s); g.fill();
  const gr = g.createLinearGradient(0, e, 0, s - e); gr.addColorStop(0, shade(col, 0.12)); gr.addColorStop(1, shade(col, -0.08));
  g.fillStyle = gr; rr(g, e, e, s - 2 * e, s - 2 * e, r * 0.45); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)'; rr(g, e + s * 0.07, e + s * 0.07, s * 0.3, s * 0.11, s * 0.055); g.fill();
  g.restore();
  rr(g, i, i, s - lw, s - lw, r); g.lineWidth = lw; g.strokeStyle = OUT; g.stroke();
  return (SPR[key] = cv);
}
function panel(g, p, title) {
  g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, p.x, p.y + 3, p.w, p.h, 10); g.fill();
  rr(g, p.x, p.y, p.w, p.h, 10); fillOut(g, '#1a1740', 2.5);
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1; rr(g, p.x + 3, p.y + 3, p.w - 6, p.h - 6, 7); g.stroke();
  if (title) small(g, title, p.x + (p.w < 120 ? p.w / 2 : 10), p.y + 7, p.w < 120 ? 'center' : 'left');
}
// Escena estática (fondo, pozo del tablero, paneles) cacheada a 2×
const STATIC = (() => {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#231c52'); gr.addColorStop(1, '#0c0a20'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // textura: siluetas de piezas muy tenues
  let sd = 7; const rn = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const keys = Object.keys(SHAPES);
  for (let i = 0; i < 30; i++) {
    const t = keys[i % 7], r = Math.floor(rn() * 4), s = 9 + rn() * 9, x = rn() * W, y = rn() * H;
    g.fillStyle = 'rgba(255,255,255,.028)'; g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1;
    for (const [cx, cy] of ROT[t][r]) { rr(g, x + cx * s, y + cy * s, s - 1.5, s - 1.5, s * 0.2); g.fill(); g.stroke(); }
  }
  gr = g.createRadialGradient(BX + BW / 2, BY + BH / 2, 20, BX + BW / 2, BY + BH / 2, BH * 0.75);
  gr.addColorStop(0, 'rgba(110,98,245,.22)'); gr.addColorStop(1, 'rgba(110,98,245,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // pozo
  const F = LAND ? 4 : 4;
  g.fillStyle = 'rgba(0,0,0,.4)'; rr(g, BX - F, BY - F + 5, BW + 2 * F, BH + 2 * F, 10); g.fill();
  rr(g, BX - F, BY - F, BW + 2 * F, BH + 2 * F, 10); fillOut(g, '#2e2866', 2.5);
  gr = g.createLinearGradient(0, BY, 0, BY + BH); gr.addColorStop(0, '#16133a'); gr.addColorStop(1, '#0a091c'); g.fillStyle = gr; g.fillRect(BX, BY, BW, BH);
  for (let x = 0; x < COLS; x += 2) { g.fillStyle = 'rgba(255,255,255,.02)'; g.fillRect(BX + x * S, BY, S, BH); }
  g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; g.beginPath();
  for (let x = 1; x < COLS; x++) { g.moveTo(BX + x * S + 0.5, BY); g.lineTo(BX + x * S + 0.5, BY + BH); }
  for (let y = 1; y < ROWS; y++) { g.moveTo(BX, BY + y * S + 0.5); g.lineTo(BX + BW, BY + y * S + 0.5); }
  g.stroke();
  g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(BX - 1, BY - 1, BW + 2, BH + 2);
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1.2; rr(g, BX - F + 2.5, BY - F + 2.5, BW + 2 * F - 5, BH + 2 * F - 5, 8); g.stroke();
  panel(g, P.next, 'SIGUIENTE'); panel(g, P.hold, 'RESERVA'); panel(g, P.stats, '');
  if (P.score) panel(g, P.score, '');
  return cv;
})();

/* ---------- Dibujo por capas ---------- */
const px = (x) => BX + x * S, py = (y) => BY + (y - HID) * S;
const eob = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);   // easeOutBack

function mini(t, cx, cy, m, alpha, sc) {
  const cells = ROT[t][0], xs = cells.map((p) => p[0]), ys = cells.map((p) => p[1]);
  const w = (Math.max(...xs) - Math.min(...xs) + 1) * m, h = (Math.max(...ys) - Math.min(...ys) + 1) * m, spr = block(COLORS[t], m);
  c.save(); c.globalAlpha = alpha; c.translate(cx, cy); if (sc) c.scale(sc, sc);
  for (const [x, y] of cells) c.drawImage(spr, (x - Math.min(...xs)) * m - w / 2, (y - Math.min(...ys)) * m - h / 2, m, m);
  c.restore();
}
function drawBoard() {
  c.save(); c.beginPath(); c.rect(BX, BY, BW, BH); c.clip();
  const p = clearing ? 1 - clearT / CLR : 0, e = rowFx ? Math.pow(rowFx.t / 0.14, 2) : 0;
  const grey = dying ? Math.min(ROWS, Math.floor((dieT / 0.75) * ROWS)) : 0;
  for (let y = HID; y < R; y++) {
    const oy = rowFx ? -rowFx.shift[y] * S * e : 0, clr = clearing && clearing.includes(y);
    for (let x = 0; x < COLS; x++) {
      const t = board[y][x]; if (!t) continue;
      const col = R - 1 - y < grey ? '#5b5775' : COLORS[t];
      if (clr) {   // se encoge desde el centro hacia fuera con destello
        const q = Math.min(1, Math.max(0, (p - Math.abs(x - 4.5) / 4.5 * 0.35) / 0.55)); if (q >= 1) continue;
        const s2 = S * (1 - q); c.drawImage(block(col, S), px(x) + (S - s2) / 2, py(y) + (S - s2) / 2, s2, s2);
        c.globalAlpha = 0.25 + 0.6 * q; c.fillStyle = '#fff'; rr(c, px(x) + (S - s2) / 2, py(y) + (S - s2) / 2, s2, s2, s2 * 0.2); c.fill(); c.globalAlpha = 1;
      } else c.drawImage(block(col, S), px(x), py(y) + oy, S, S);
    }
    if (clr && p < 0.45) { c.globalAlpha = (1 - p / 0.45) * 0.85; c.fillStyle = '#fff'; c.fillRect(BX, py(y) + S * 0.1, BW, S * 0.8); c.globalAlpha = 1; }
  }
  // estelas de caída dura
  for (const t of trails) for (const [x, y0, y1] of t.cols) {
    const top = py(y0), bot = py(y1) + S, gr = c.createLinearGradient(0, top, 0, bot);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, t.col); c.globalAlpha = (t.t / 0.24) * 0.45; c.fillStyle = gr;
    c.fillRect(px(x) + S * 0.12, top, S * 0.76, bot - top); c.globalAlpha = 1;
  }
  if (cur && !dying) {
    // pieza fantasma
    const gy = ghostY(), col = COLORS[cur.t];
    if (gy > cur.y) for (const [cx, cy] of ROT[cur.t][cur.r]) {
      const x = px(cur.x + cx) + 2, y = py(gy + cy) + 2; rr(c, x, y, S - 4, S - 4, S * 0.18);
      c.globalAlpha = 0.16; c.fillStyle = col; c.fill(); c.globalAlpha = 0.75; c.lineWidth = 2; c.strokeStyle = col; c.stroke(); c.globalAlpha = 1;
    }
    // pieza actual (posición interpolada) con aviso del bloqueo
    const spr = block(col, S), warn = grounded() ? Math.min(1, lockT / LOCK) : 0;
    for (const [cx, cy] of ROT[cur.t][cur.r]) {
      const x = BX + (vis.x + cx) * S, y = BY + (vis.y + cy - HID) * S; c.drawImage(spr, x, y, S, S);
      if (warn > 0) { c.globalAlpha = warn * 0.35; c.fillStyle = OUT; rr(c, x + 1, y + 1, S - 2, S - 2, S * 0.2); c.fill(); c.globalAlpha = 1; }
    }
  }
  if (lockFx) for (const [x, y] of lockFx.cells) { c.globalAlpha = (lockFx.t / 0.2) * 0.7; c.fillStyle = '#fff'; rr(c, px(x) + 1, py(y) + 1, S - 2, S - 2, S * 0.2); c.fill(); c.globalAlpha = 1; }
  c.restore();
  // marco en peligro (pila alta) o al subir de nivel
  let danger = false; for (let y = HID; y < HID + 4 && !danger; y++) if (board[y].some(Boolean)) danger = true;
  if (danger || lvlFx > 0) {
    c.globalAlpha = danger ? 0.45 + 0.35 * Math.sin(time * 8) : lvlFx; c.strokeStyle = danger ? '#ff4d6a' : '#a99fff'; c.lineWidth = 3;
    rr(c, BX - 3, BY - 3, BW + 6, BH + 6, 8); c.stroke(); c.globalAlpha = 1;
  }
}
function drawPanels() {
  const n = P.next, slots = [[n.y + 44, P.m1], [n.y + 100, P.m2], [n.y + 144, P.m2], [n.y + 184, P.m2]];
  c.save(); c.beginPath(); c.rect(n.x, n.y + 18, n.w, n.h - 20); c.clip();
  queue.forEach((t, i) => {   // la cola sube deslizándose al sacar una pieza
    const a = slots[i], b = slots[i + 1], q = qAnim;
    mini(t, n.x + n.w / 2, a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, i === 2 ? 1 - q : 1);
  });
  c.restore();
  const h = P.hold;
  if (hold) mini(hold, h.x + h.w / 2, h.y + h.h / 2 + 7, P.m1, holdUsed ? 0.3 : 1, 1 + holdPop * 0.25);
  // puntuación y récord
  const best = Math.max(bestV, score);
  if (P.score) {
    const s = P.score; small(c, 'PUNTOS', s.x + 10, s.y + 7, 'left'); label(String(Math.round(shown)), s.x + 10, s.y + 20, 22, '#fff');
    small(c, 'RÉCORD', s.x + s.w - 10, s.y + 7, 'right'); label(String(best), s.x + s.w - 10, s.y + 24, 15, '#c9c3ff', 'right');
  } else {
    small(c, 'PUNTOS', 10, 6, 'left'); label(String(Math.round(shown)), 10, 18, 22, '#fff');
    small(c, 'RÉCORD', W - 8, 6, 'right'); label(String(best), W - 8, 20, 15, '#c9c3ff', 'right');
  }
  // nivel y líneas
  const st = P.stats, cx = st.x + st.w / 2, dy = LAND ? 42 : 46, sz = LAND ? 18 : 20;
  small(c, 'NIVEL', cx, st.y + 7); label(String(level), cx, st.y + 19, sz, lvlFx > 0 ? '#c9c3ff' : '#fff', 'center');
  small(c, 'LÍNEAS', cx, st.y + 7 + dy - (LAND ? 2 : 0)); label(GOAL ? `${lines}/${GOAL}` : String(lines), cx, st.y + 18 + dy - (LAND ? 2 : 0), GOAL ? 14 : sz, '#fff', 'center');
  if (!LAND) {   // barra hacia el siguiente nivel
    const bx = st.x + 8, bw = st.w - 16, by = st.y + st.h - 18;
    rr(c, bx, by, bw, 8, 4); fillOut(c, '#0c0a20', 1.5);
    if (lines % 10) { rr(c, bx + 1, by + 1, (bw - 2) * (lines % 10) / 10, 6, 3); c.fillStyle = ACC; c.fill(); }
  } else {
    const bx = P.chips.x, bw = P.chips.w, by = 162;
    rr(c, bx, by, bw, 6, 3); fillOut(c, '#0c0a20', 1.5);
    if (lines % 10) { rr(c, bx + 1, by + 1, (bw - 2) * (lines % 10) / 10, 4, 2); c.fillStyle = ACC; c.fill(); }
  }
  // chips de combo y back-to-back
  const ch = P.chips, list = [];
  if (combo > 0) list.push(['COMBO', '×' + combo, '#ffb35c']);
  if (b2b) list.push(['B2B', 'ACTIVO', '#7ff0ff']);
  list.forEach(([a, b2, col], i) => {
    const w = ch.row ? 92 : ch.w, x = ch.row ? ch.x + i * (w + 11) : ch.x, y = ch.row ? ch.y + 8 : ch.y + i * 48;
    rr(c, x, y, w, 40, 9); fillOut(c, '#1a1740', 2.5); c.fillStyle = col; c.fillRect(x + 6, y + 6, 3, 28);
    small(c, a, x + w / 2 + 3, y + 7, 'center', col); label(b2, x + w / 2 + 3, y + 19, 14, '#fff', 'center');
  });
}
function icon(id, x, y, s) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  const stroke = (f) => { c.strokeStyle = OUT; c.lineWidth = s * 0.34; f(); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = s * 0.17; f(); c.stroke(); };
  if (id === 'cw' || id === 'ccw') {   // flecha circular; la antihoraria es la misma reflejada
    c.save(); c.translate(x, y); if (id === 'ccw') c.scale(-1, 1);
    const r = s * 0.6, a1 = 0.45, ex = Math.cos(a1) * r, ey = Math.sin(a1) * r, tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
    stroke(() => { c.beginPath(); c.arc(0, 0, r, -3.3, a1 - 0.2); });
    c.beginPath(); c.moveTo(ex + tx * s * 0.55, ey + ty * s * 0.55); c.lineTo(ex + nx * s * 0.45 - tx * s * 0.15, ey + ny * s * 0.45 - ty * s * 0.15); c.lineTo(ex - nx * s * 0.45 - tx * s * 0.15, ey - ny * s * 0.45 - ty * s * 0.15); c.closePath();
    fillOut(c, '#fff', s * 0.14); c.restore();
  } else if (id === 'drop') {
    stroke(() => { c.beginPath(); for (const o of [-0.55, -0.05]) { c.moveTo(x - s * 0.5, y + o * s); c.lineTo(x, y + (o + 0.42) * s); c.lineTo(x + s * 0.5, y + o * s); } });
    rr(c, x - s * 0.6, y + s * 0.55, s * 1.2, s * 0.26, s * 0.12); fillOut(c, '#fff', s * 0.12);
  } else {   // reserva: bandeja con un bloque
    stroke(() => { c.beginPath(); c.moveTo(x - s * 0.62, y - s * 0.1); c.lineTo(x - s * 0.62, y + s * 0.62); c.lineTo(x + s * 0.62, y + s * 0.62); c.lineTo(x + s * 0.62, y - s * 0.1); });
    c.drawImage(block(COLORS.T, s * 0.62), x - s * 0.31, y - s * 0.28, s * 0.62, s * 0.62);
    stroke(() => { c.beginPath(); c.moveTo(x, y - s * 1.0); c.lineTo(x, y - s * 0.42); c.moveTo(x - s * 0.26, y - s * 0.66); c.lineTo(x, y - s * 0.4); c.lineTo(x + s * 0.26, y - s * 0.66); });
  }
}
function drawButtons() {
  for (const b of BTN) {
    const on = b.pt > 0 || (G && G.btn === b && k.ptr.down), dis = b.id === 'hold' && (holdUsed || !cur), y = b.y + (on ? 2 : 0);
    c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, b.x, b.y + 4, b.w, b.h, 11); c.fill();
    rr(c, b.x, y, b.w, b.h, 11); fillOut(c, on ? ACC : '#2b2658', 2.5);
    c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, b.x + 4, y + 3, b.w - 8, b.h * 0.4, 8); c.fill();
    c.globalAlpha = dis ? 0.4 : 1;
    const s = LAND ? 18 : 14, txt = { hold: 'Reserva', drop: 'Caída' }[b.id];
    if (txt && !LAND) { icon(b.id, b.x + 17, y + b.h / 2, s); label(txt, b.x + 30, y + b.h / 2 + 1, 12, '#fff', 'left', 'middle'); }
    else if (txt) { icon(b.id, b.x + b.w / 2, y + 26, s); label(txt, b.x + b.w / 2, y + 52, 11, '#fff', 'center', 'middle'); }
    else icon(b.id, b.x + b.w / 2, y + b.h / 2 + 1, s);
    c.globalAlpha = 1;
  }
}
function drawPops() {
  let y = BY + BH * 0.3;
  for (const p of pops) {
    const age = p.max - p.t, sc = 0.4 + 0.6 * eob(Math.min(1, age / 0.22));
    c.save(); c.globalAlpha = Math.min(1, p.t / 0.35); c.translate(BX + BW / 2, y - age * 14); c.scale(sc, sc);
    label(p.txt, 0, 0, LAND ? p.size * 0.75 : p.size, p.col, 'center', 'middle'); c.restore();
    y += (LAND ? p.size * 0.75 : p.size) * 1.35;
  }
}

/* ---------- Bucle ---------- */
let flip = false;
addEventListener('resize', () => { flip = (innerWidth > innerHeight) !== LAND; });   // al girar fuera de partida se recarga
reset();
k.show(document.title, (MODE === 'marathon' ? 'Llega a 150 líneas empezando en nivel 5. ' : 'Completa líneas para borrarlas; cada 10 líneas sube el nivel. ')
  + 'Arrastra para mover, toca para girar, desliza abajo para dejar caer y arriba para guardar. Teclado: ← → mover · ↓ bajar · ↑/Espacio girar · Z al revés · X caída · C reserva');
k.run((dt) => {
  const raw = new Set(RAW); RAW.clear();
  effects(dt);
  if (!k.gate(reset)) return;
  if (dying) { dieT += dt; if (dieT > 0.95 && !ended) { ended = true; k.lose('tetra-' + MODE, score, 'Fin de partida', `Líneas: ${lines} · Nivel ${level}`); } return; }
  if (clearing) { clearT -= dt; if (clearT <= 0) finishClear(); if (k.ptr.up) G = null; return; }
  if (!cur) return;
  keyboard(dt, raw);
  if (cur && !clearing && !dying) touch(dt); else if (k.ptr.up) G = null;
  if (cur && !clearing && !dying && k.st === 'play') gravity(dt);
}, () => {
  if (flip && k.st !== 'play') location.reload();
  c.drawImage(STATIC, 0, 0, W, H);
  drawBoard(); drawPanels(); drawButtons(); drawPops();
});
