/* Juegos de tablero contra la IA. CFG.mode: 'checkers' | 'reversi' | 'four' (Cuatro en Línea: 7×6 con gravedad, 2 jugadores en la tele o contra la IA)
 * Damas: captura obligatoria, multisalto y la coronación termina el turno. Reversi con pasar turno.
 * Tablero de madera cacheado, fichas con bisel, deslizamientos/saltos, volteo escalonado y jugadas válidas marcadas. */
const M = CFG.mode, FOUR = M === 'four', W = FOUR ? 640 : 480, H = FOUR ? 480 : 560, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: FOUR ? '#1b1740' : '#2a1a12' }), c = k.ctx, N = 8, S = 54, OX = 24, OY = 72;
let quiet = 0, lvl = 0, b, turn, sel, moves, wins, thinking, msg, chain, at = 0, anims = [], flipA = {}, animEnd = 0, pend = null, last = null, cur = null, kbd = false;
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
function build() { b = Array.from({ length: N }, () => Array(N).fill(0));
  if (M === 'reversi') { b[3][3] = b[4][4] = 2; b[3][4] = b[4][3] = 1; } else for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2) { if (y < 3) b[y][x] = 2; if (y > 4) b[y][x] = 1; }
  turn = 1; sel = null; chain = null; quiet = 0; msg = 'Tu turno'; anims = []; flipA = {}; animEnd = at; pend = null; last = null; thinking = 0; }
/* ---- Reversi ---- */
function flips(bd, x, y, p) { if (bd[y][x]) return []; const out = []; for (const [dx, dy] of DIRS8) { const line = []; let cx = x + dx, cy = y + dy; while (inb(cx, cy) && bd[cy][cx] === 3 - p) { line.push([cx, cy]); cx += dx; cy += dy; } if (line.length && inb(cx, cy) && bd[cy][cx] === p) out.push(...line); } return out; }
function rMoves(bd, p) { const m = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const f = flips(bd, x, y, p); if (f.length) m.push({ x, y, f }); } return m; }
const W8 = [[100, -20, 10, 5, 5, 10, -20, 100], [-20, -50, -2, -2, -2, -2, -50, -20], [10, -2, 1, 1, 1, 1, -2, 10], [5, -2, 1, 0, 0, 1, -2, 5], [5, -2, 1, 0, 0, 1, -2, 5], [10, -2, 1, 1, 1, 1, -2, 10], [-20, -50, -2, -2, -2, -2, -50, -20], [100, -20, 10, 5, 5, 10, -20, 100]];
function rEval(bd) { let s = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) s += bd[y][x] === 2 ? W8[y][x] : bd[y][x] === 1 ? -W8[y][x] : 0; return s + (rMoves(bd, 2).length - rMoves(bd, 1).length) * 3; }
function rPlay(bd, m, p) { const nb = bd.map((r) => [...r]); nb[m.y][m.x] = p; for (const [x, y] of m.f) nb[y][x] = p; return nb; }
/* Nivel de la IA (sube al ganar, baja al perder): 0 = voraz 1 jugada con despistes, 1 = 2 jugadas con algún despiste, 2+ = 2 jugadas sin fallos */
const AIERR = [0.5, 0.25, 0.08]; // 1.23: más fácil (antes 0.35/0.15/0)
function rAI() { const ms = rMoves(b, 2); if (!ms.length) return null; const L = Math.min(lvl | 0, 2);
  if (Math.random() < AIERR[L]) return k.pick(ms);
  if (L === 0) { let best = null, bv = -1e9; for (const m of k.shuffle(ms)) { const v = rEval(rPlay(b, m, 2)); if (v > bv) { bv = v; best = m; } } return best; }
  let best = null, bv = -1e9; for (const m of k.shuffle(ms)) { const nb = rPlay(b, m, 2); const rep = rMoves(nb, 1); let worst = rep.length ? 1e9 : rEval(nb); for (const r of rep) worst = Math.min(worst, rEval(rPlay(nb, r, 1))); if (worst > bv) { bv = worst; best = m; } } return best; }
/* ---- Damas ---- */
function cMoves(bd, p) { const jumps = [], steps = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = bd[y][x]; if (!v || owner(v) !== p) continue; const king = v > 2, dirs = king ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : p === 1 ? [[1, -1], [-1, -1]] : [[1, 1], [-1, 1]];
    for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue; if (!bd[ny][nx]) steps.push({ x, y, nx, ny }); else if (owner(bd[ny][nx]) !== p && inb(nx + dx, ny + dy) && !bd[ny + dy][nx + dx]) jumps.push({ x, y, nx: nx + dx, ny: ny + dy, cap: [nx, ny] }); } } return jumps.length ? jumps : steps; }
const owner = (v) => (v === 1 || v === 3 ? 1 : v === 2 || v === 4 ? 2 : 0);
function cPlay(bd, m) { const nb = bd.map((r) => [...r]); let v = nb[m.y][m.x]; nb[m.y][m.x] = 0; if (m.cap) nb[m.cap[1]][m.cap[0]] = 0; if (v === 1 && m.ny === 0) v = 3; if (v === 2 && m.ny === N - 1) v = 4; nb[m.ny][m.nx] = v; return nb; }
function cEval(bd) { let s = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = bd[y][x]; s += v === 2 ? 3 + y * 0.08 : v === 4 ? 5 : v === 1 ? -3 - (7 - y) * 0.08 : v === 3 ? -5 : 0; } return s; }
/* Jugadas completas: los saltos encadenados cuentan como una sola jugada (la coronación la corta) */
function cSeqs(bd, p) { const ms = cMoves(bd, p); if (!ms.length || !ms[0].cap) return ms.map((m) => ({ path: [m], bd: cPlay(bd, m) })); const out = [];
  const ext = (b0, m, path) => { const man = b0[m.y][m.x] <= 2, nb = cPlay(b0, m), np = [...path, m], more = man && nb[m.ny][m.nx] > 2 ? [] : cMoves(nb, p).filter((q) => q.cap && q.x === m.nx && q.y === m.ny); if (!more.length) out.push({ path: np, bd: nb }); else more.forEach((q) => ext(nb, q, np)); };
  ms.forEach((m) => ext(bd, m, [])); return out; }
function cSearch(bd, p, depth, al, be) { const ss = cSeqs(bd, p); if (!ss.length) return p === 2 ? -100 - depth : 100 + depth; if (!depth) return cEval(bd);
  for (const q of ss) { const v = cSearch(q.bd, 3 - p, depth - 1, al, be); if (p === 2) al = Math.max(al, v); else be = Math.min(be, v); if (al >= be) break; } return p === 2 ? al : be; }
/* Damas: profundidad 0 → 3 según el nivel y probabilidad de despiste (jugada legal al azar, respeta la captura obligatoria) */
const CDEP = [0, 1, 2, 3], CERR = [0.4, 0.25, 0.12, 0.04]; // 1.23: más fácil (antes prof. 1-4, despiste 0.3→0); nivel 0 = voraz 1 jugada
function cAI() { const ss = cSeqs(b, 2); if (!ss.length) return null; const L = Math.min(lvl | 0, 3); if (Math.random() < CERR[L]) return k.pick(ss);
  let best = null, bv = -1e9; for (const q of k.shuffle(ss)) { const v = cSearch(q.bd, 1, CDEP[L], bv, 1e9); if (v > bv) { bv = v; best = q; } } return best; }
function reset() { if (wins === undefined) wins = 0; build(); }
function finish() { let me = 0, ai = 0; for (const r of b) for (const v of r) { if (owner(v) === 1 || (M === 'reversi' && v === 1)) me++; if (owner(v) === 2) ai++; }
  const won = M === 'reversi' ? me > ai : !cMoves(b, 2).length; if (won) { wins++; lvl += 0.5; } else if (!(M === 'reversi' && me === ai)) lvl = Math.max(0, lvl - 1); k.st = 'over'; k.show(won ? '¡Ganaste!' : me === ai && M === 'reversi' ? 'Empate' : 'Perdiste', `${M === 'reversi' ? `${me} – ${ai} · ` : `Piezas: tú ${me}, IA ${ai} · `}Victorias seguidas: ${wins} · Récord ${k.best(CFG.id, wins)}<br>Toca para jugar otra vez`); if (!won) { wins = 0; k.sfx('lose'); } }
/* ---- Animaciones ---- */
const cx = (x) => OX + x * S + S / 2, cy = (y) => OY + y * S + S / 2;
function animMove(v, path, caps) { const step = 0.26, t0 = Math.max(at, animEnd); anims.push({ v, path, caps, t0, step, hide: path[path.length - 1] }); animEnd = t0 + step * (path.length - 1); return t0; }
function animPlace(m, p) { const t0 = Math.max(at, animEnd); flipA[m.x + ',' + m.y] = { t0, pop: 1 }; m.f.forEach(([x, y]) => { const d = Math.max(Math.abs(x - m.x), Math.abs(y - m.y)); flipA[x + ',' + y] = { t0: t0 + 0.1 + d * 0.07, from: 3 - p }; });
  let md = 0; m.f.forEach(([x, y]) => (md = Math.max(md, Math.abs(x - m.x), Math.abs(y - m.y)))); animEnd = t0 + 0.1 + md * 0.07 + 0.32; last = [m.x, m.y]; }
const busy = () => at < animEnd;
/* Movimiento del jugador en damas */
function playerStep(m) { const v = b[m.y][m.x], wasMan = v === 1; quiet = m.cap || wasMan ? 0 : quiet + 1; const capV = m.cap ? b[m.cap[1]][m.cap[0]] : 0; b = cPlay(b, m); animMove(v, [[m.x, m.y], [m.nx, m.ny]], m.cap ? [[m.cap[0], m.cap[1], capV]] : []); last = [m.nx, m.ny];
  k.sfx(m.cap ? 'hit' : 'click'); const crowned = wasMan && b[m.ny][m.nx] === 3; if (crowned) setTimeout(() => { k.sfx('coin'); k.float('¡Dama!', cx(m.nx), cy(m.ny) - 20, '#ffe27a'); k.burst(cx(m.nx), cy(m.ny), '#ffe27a', 14, 120); }, 260);
  const more = m.cap && !crowned && cMoves(b, 1).filter((q) => q.cap && q.x === m.nx && q.y === m.ny);
  if (more && more.length) { chain = [m.nx, m.ny]; sel = [m.nx, m.ny]; msg = 'Sigue saltando'; } else { chain = null; sel = null; turn = 2; msg = 'La IA piensa…'; if (!cMoves(b, 2).length) pend = 1; } }
function aiTurn() {
  if (M === 'reversi') { const m = rAI(); if (m) { b = rPlay(b, m, 2); animPlace(m, 2); k.sfx('pop'); } turn = 1; if (!rMoves(b, 1).length) { if (!rMoves(b, 2).length) { pend = 1; return; } turn = 2; msg = 'No puedes mover: pasas'; k.float('Pasas turno', W / 2, OY + 4 * S, '#fff'); } else msg = 'Tu turno'; return; }
  const q = cAI(); if (!q) { pend = 1; return; } const v0 = b[q.path[0].y][q.path[0].x], path = [[q.path[0].x, q.path[0].y]], caps = [];
  for (const m of q.path) { if (m.cap) caps.push([m.cap[0], m.cap[1], b[m.cap[1]][m.cap[0]]]); b = cPlay(b, m); path.push([m.nx, m.ny]); }
  quiet = caps.length || v0 === 2 ? 0 : quiet + 1;
  animMove(v0, path, caps); last = path[path.length - 1]; k.sfx(caps.length ? 'hit' : 'click'); turn = 1; if (!cMoves(b, 1).length) { pend = 1; return; } msg = 'Tu turno'; }
function tapSquare(x, y) {
  if (M === 'reversi') { const m = rMoves(b, 1).find((q) => q.x === x && q.y === y); if (!m) { k.sfx('hit'); return; } b = rPlay(b, m, 1); animPlace(m, 1); k.sfx('pop'); if (m.f.length >= 4) k.float(`+${m.f.length}`, cx(x), cy(y) - 20, '#ffe27a');
    turn = 2; msg = 'La IA piensa…'; if (!rMoves(b, 2).length) { turn = 1; if (!rMoves(b, 1).length) { pend = 1; return; } msg = 'La IA pasa. Tu turno'; k.float('La IA pasa', W / 2, OY + 4 * S, '#fff'); } return; }
  const legal = cMoves(b, 1).filter((q) => !chain || (q.cap && q.x === chain[0] && q.y === chain[1]));
  if (owner(b[y][x]) === 1 && !chain) { if (legal.some((q) => q.x === x && q.y === y)) { sel = [x, y]; k.sfx('click'); } else { sel = null; k.sfx('hit'); if (legal.some((q) => q.cap)) { msg = 'Captura obligatoria'; k.float('¡Captura obligatoria!', W / 2, OY + 4 * S, '#ff8a9a'); } } return; }
  if (sel) { const m = legal.find((q) => q.x === sel[0] && q.y === sel[1] && q.nx === x && q.ny === y); if (m) playerStep(m); else if (!chain) sel = null; }
}
if (!FOUR) { reset(); k.show(CFG.title, M === 'reversi' ? 'Coloca fichas para encerrar las del rival y darles la vuelta. Los puntos marcan tus jugadas válidas. Gana quien tenga más.' : 'Mueve en diagonal y salta sobre las piezas rivales. Capturar es obligatorio, se encadenan saltos y al coronar termina el turno.');
k.run((dt) => {
  at += dt; if (!k.gate(reset)) return;
  if (busy()) return;
  if (pend) { pend = null; return finish(); }
  if (M === 'checkers' && quiet >= 40) { quiet = 0; k.st = 'over'; k.show('Tablas', `40 jugadas sin capturas ni avances · Victorias seguidas: ${wins}<br>Toca para jugar otra vez`); return; }
  if (turn === 2) { thinking = (thinking || 0) + dt; if (thinking < 0.45) return; thinking = 0; return aiTurn(); }
  for (const d of ['left', 'right', 'up', 'down']) if (k.hit.has(d)) { if (!kbd || !cur) { kbd = true; cur = sel ? [...sel] : [3, 5]; } else { cur[0] = k.clamp(cur[0] + (d === 'left' ? -1 : d === 'right' ? 1 : 0), 0, 7); cur[1] = k.clamp(cur[1] + (d === 'up' ? -1 : d === 'down' ? 1 : 0), 0, 7); } }
  if (k.hit.has('a') && kbd && cur) tapSquare(cur[0], cur[1]);
  if (!k.ptr.hit) return; kbd = false; const x = Math.floor((k.ptr.x - OX) / S), y = Math.floor((k.ptr.y - OY) / S); if (!inb(x, y)) return; tapSquare(x, y);
}, draw); }

/* ================= Arte ================= */
const BOARD = FOUR ? null : (() => { const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, M === 'reversi' ? '#1c2a3a' : '#3a2418'); gr.addColorStop(1, M === 'reversi' ? '#0e1622' : '#1f130c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // marco de madera
  const fx = OX - 14, fy = OY - 14, fs = N * S + 28; g.fillStyle = 'rgba(0,0,0,.4)'; ART.rr(g, fx + 3, fy + 7, fs, fs, 14); g.fill();
  ART.rr(g, fx, fy, fs, fs, 14); gr = g.createLinearGradient(fx, fy, fx + fs, fy + fs); gr.addColorStop(0, '#b8743e'); gr.addColorStop(1, '#6e3d1c'); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
  g.save(); g.clip(); g.strokeStyle = 'rgba(60,25,5,.25)'; g.lineWidth = 1.2; for (let i = 0; i < 26; i++) { const yy = fy + i * 18 + Math.sin(i) * 4; g.beginPath(); g.moveTo(fx, yy); g.bezierCurveTo(fx + fs * 0.3, yy + 6, fx + fs * 0.7, yy - 6, fx + fs, yy + 3); g.stroke(); } g.restore();
  g.fillStyle = 'rgba(255,230,190,.35)'; ART.rr(g, fx + 6, fy + 3, fs - 12, 4, 2); g.fill();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = OX + x * S, Y = OY + y * S, dark = (x + y) % 2;
    if (M === 'reversi') { g.fillStyle = dark ? '#1f8a55' : '#23935b'; g.fillRect(X, Y, S, S); }
    else { g.fillStyle = dark ? '#7a4526' : '#ecd2a2'; g.fillRect(X, Y, S, S); g.strokeStyle = dark ? 'rgba(40,15,0,.22)' : 'rgba(150,100,50,.18)'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { const yy = Y + 6 + i * 10 + ((x * 7 + y * 3 + i) % 4); g.beginPath(); g.moveTo(X, yy); g.quadraticCurveTo(X + S / 2, yy + (dark ? 3 : -3), X + S, yy); g.stroke(); } } }
  if (M === 'reversi') { for (let i = 0; i < 4000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.07)'; g.fillRect(OX + Math.random() * N * S, OY + Math.random() * N * S, 1, 1); }
    g.strokeStyle = 'rgba(0,40,20,.7)'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i <= N; i++) { g.moveTo(OX + i * S, OY); g.lineTo(OX + i * S, OY + N * S); g.moveTo(OX, OY + i * S); g.lineTo(OX + N * S, OY + i * S); } g.stroke();
    g.fillStyle = 'rgba(0,40,20,.8)'; for (const [x, y] of [[2, 2], [6, 2], [2, 6], [6, 6]]) { g.beginPath(); g.arc(OX + x * S, OY + y * S, 4, 0, 6.283); g.fill(); } }
  g.strokeStyle = OUT; g.lineWidth = 2.5; g.strokeRect(OX, OY, N * S, N * S);
  // coordenadas
  g.fillStyle = 'rgba(255,235,200,.75)'; g.font = '700 9px ui-rounded,system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let i = 0; i < N; i++) { g.fillText('abcdefgh'[i], OX + i * S + S / 2, OY + N * S + 7); g.fillText(String(N - i), OX - 7, OY + i * S + S / 2); }
  return cv; })();
/* Ficha con bisel cacheada: color de jugador (1|2), dama */
const PC = {};
function pieceSpr(key) { if (PC[key]) return PC[key]; const [kind, king] = key.split('|'), R = S * 0.39, sz = S + 10, cv = document.createElement('canvas'); cv.width = cv.height = sz * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(sz / 2, sz / 2 - 2);
  const col = { r: ['#e0414f', '#a41e2c', '#ff8a92'], k: ['#3a3548', '#1c1826', '#6e6788'], w: ['#f5f2ea', '#bdb6a6', '#ffffff'], b: ['#2a2733', '#121018', '#5a5566'] }[kind];
  g.beginPath(); g.ellipse(0, 5, R, R * 0.92, 0, 0, 6.283); ART.fillOut(g, col[1], 2);
  g.beginPath(); g.arc(0, 0, R, 0, 6.283); const gr = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R); gr.addColorStop(0, col[2]); gr.addColorStop(1, col[0]); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  if (M === 'checkers') { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, R * 0.72, 0, 6.283); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(0, 0.8, R * 0.52, 0, 6.283); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-R * 0.3, -R * 0.45, R * 0.38, R * 0.18, -0.5, 0, 6.283); g.fill();
  if (king === '1') { const w = R * 0.62, bY = R * 0.3, h = R * 0.62; g.beginPath(); g.moveTo(-w, bY); g.lineTo(-w, bY - h * 0.8); g.lineTo(-w * 0.5, bY - h * 0.35); g.lineTo(0, bY - h * 1.05); g.lineTo(w * 0.5, bY - h * 0.35); g.lineTo(w, bY - h * 0.8); g.lineTo(w, bY); g.closePath(); ART.fillOut(g, '#f2c14e', 1.6);
    for (const px of [-w, 0, w]) { g.beginPath(); g.arc(px, px ? bY - h * 0.8 : bY - h * 1.05, 2.2, 0, 6.283); g.fillStyle = '#fff3c4'; g.fill(); } g.fillStyle = '#c8912a'; g.fillRect(-w, bY - 3, w * 2, 3); }
  return (PC[key] = cv); }
const pkey = (v) => M === 'reversi' ? (v === 1 ? 'b|0' : 'w|0') : (owner(v) === 1 ? 'r' : 'k') + '|' + (v > 2 ? 1 : 0);
function piece(v, x, y, sxs, sys, lift) { const sz = S + 10; lift = lift || 0;
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x + 2, y + 8, S * 0.38 * sxs * (1 - lift / 120), S * 0.14, 0, 0, 6.283); c.fill();
  c.save(); c.translate(x, y - lift); c.scale(sxs, sys); c.drawImage(pieceSpr(pkey(v)), -sz / 2, -sz / 2 + 2, sz, sz); c.restore(); }
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function draw() {
  const now = performance.now() / 1000; c.drawImage(BOARD, 0, 0, W, H);
  // último movimiento
  if (last) { c.fillStyle = 'rgba(255,226,122,.22)'; c.fillRect(OX + last[0] * S, OY + last[1] * S, S, S); }
  const idle = turn === 1 && !busy() && k.st === 'play';
  // jugadas válidas
  if (idle && M === 'reversi') for (const m of rMoves(b, 1)) { const hov = !kbd && Math.floor((k.ptr.x - OX) / S) === m.x && Math.floor((k.ptr.y - OY) / S) === m.y;
    if (hov) { c.globalAlpha = 0.45; piece(1, cx(m.x), cy(m.y), 1, 1); c.globalAlpha = 1; label(String(m.f.length), cx(m.x), cy(m.y) - 8, 13, '#ffe27a', 'center'); }
    else { c.fillStyle = 'rgba(10,20,15,.35)'; c.beginPath(); c.arc(cx(m.x), cy(m.y), 7 + Math.sin(now * 4) * 1.2, 0, 6.283); c.fill(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.5; c.stroke(); } }
  let legal = [], movers = new Set();
  if (idle && M === 'checkers') { legal = cMoves(b, 1).filter((q) => !chain || (q.cap && q.x === chain[0] && q.y === chain[1])); legal.forEach((q) => movers.add(q.x + ',' + q.y));
    for (const q of legal) if (!sel) { c.strokeStyle = q.cap ? `rgba(255,120,120,${0.6 + 0.3 * Math.sin(now * 6)})` : 'rgba(255,226,122,.45)'; c.lineWidth = 3; c.strokeRect(OX + q.x * S + 2, OY + q.y * S + 2, S - 4, S - 4); } }
  // fichas del tablero (ocultas las que aún están en movimiento)
  const hide = new Set(anims.filter((a) => at < a.t0 + a.step * (a.path.length - 1) + 0.02).map((a) => a.hide.join(',')));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = b[y][x]; if (!v || hide.has(x + ',' + y)) continue; const fa = flipA[x + ',' + y]; let sxs = 1, sys = 1, vv = v, lift = 0;
    if (fa) { const p = (at - fa.t0) / (fa.pop ? 0.22 : 0.32); if (p >= 1) delete flipA[x + ',' + y]; else if (fa.pop) { if (p < 0) continue; const e = Math.max(0, p); sxs = sys = e < 0.7 ? e / 0.7 * 1.15 : 1.15 - (e - 0.7) / 0.3 * 0.15; lift = (1 - e) * 10; }
      else if (p < 0) vv = fa.from; else { sys = Math.max(0.05, Math.abs(Math.cos(p * Math.PI))); vv = p < 0.5 ? fa.from : v; lift = Math.sin(p * Math.PI) * 12; } }
    const sl = sel && sel[0] === x && sel[1] === y; piece(vv, cx(x), cy(y), sxs, sys, lift + (sl ? 6 + Math.sin(now * 6) * 2 : 0));
    if (sl) { c.strokeStyle = '#ffd84a'; c.lineWidth = 3; c.beginPath(); c.arc(cx(x), cy(y) - 6, S * 0.45, 0, 6.283); c.stroke(); } }
  // piezas capturadas que aún se ven y piezas en movimiento
  for (const a of anims) { const seg = (at - a.t0) / a.step, n = a.path.length - 1;
    a.caps.forEach(([x, y, v], i) => { if (seg < i + 0.5) piece(v, cx(x), cy(y), 1, 1); else if (!a['c' + i]) { a['c' + i] = 1; k.burst(cx(x), cy(y), owner(v) === 1 ? '#e0414f' : '#6e6788', 14, 150); k.sfx('hit'); k.shake(3); } else if (seg < i + 1) { const e = (seg - i - 0.5) * 2; c.globalAlpha = 1 - e; piece(v, cx(x), cy(y) - e * 20, 1 - e * 0.5, 1 - e * 0.5); c.globalAlpha = 1; } });
    if (seg >= n) continue; const i = Math.max(0, Math.floor(seg)), f = Math.max(0, seg - i), e = f * f * (3 - 2 * f), [x0, y0] = a.path[i], [x1, y1] = a.path[i + 1], hop = a.caps.length ? Math.sin(f * Math.PI) * 26 : Math.sin(f * Math.PI) * 6;
    piece(a.v, cx(x0) + (cx(x1) - cx(x0)) * e, cy(y0) + (cy(y1) - cy(y0)) * e, 1, 1, hop); }
  anims = anims.filter((a) => at < a.t0 + a.step * (a.path.length - 1) + 0.3);
  // destinos de la pieza seleccionada
  if (idle && sel) for (const q of legal) if (q.x === sel[0] && q.y === sel[1]) { c.fillStyle = q.cap ? 'rgba(255,120,120,.85)' : 'rgba(255,226,122,.85)'; c.beginPath(); c.arc(cx(q.nx), cy(q.ny), 9 + Math.sin(now * 5) * 1.5, 0, 6.283); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); }
  if (kbd && cur && k.st === 'play') { c.strokeStyle = '#5ce1e6'; c.lineWidth = 3; c.setLineDash([6, 4]); c.strokeRect(OX + cur[0] * S + 3, OY + cur[1] * S + 3, S - 6, S - 6); c.setLineDash([]); }
  // HUD
  label(CFG.title, 16, 12, 20, '#ffe27a'); label(`Victorias ${wins}`, W - 16, 14, 15, '#fff', 'right'); label(`IA nivel ${Math.min(lvl | 0, M === 'reversi' ? 2 : 3) + 1}`, W - 16, 36, 12, '#cfd6ff', 'right');
  const my = OY + N * S + 18; let me = 0, ai = 0; for (const r of b) for (const v of r) { if (owner(v) === 1) me++; if (owner(v) === 2) ai++; }
  piece(1, 36, my + 12, 0.5, 0.5); label(`Tú ${me}`, 52, my + 3, 16, '#fff'); piece(2, W - 36, my + 12, 0.5, 0.5); label(`IA ${ai}`, W - 52, my + 3, 16, '#fff', 'right');
  const tc = turn === 1 ? '#7cf7a0' : '#ffb0e0'; label(turn === 2 && !busy() ? 'La IA piensa' + '.'.repeat(1 + Math.floor(now * 3) % 3) : msg, W / 2, my + 4, 15, msg === 'Captura obligatoria' ? '#ff8a9a' : tc, 'center');
}

/* ================= Cuatro en Línea (CFG.mode 'four') =================
 * 7 columnas × 6 filas con gravedad. Gana quien alinea 4 (horizontal, vertical o diagonal); tablero lleno = empate.
 * 2 jugadores en la tele (J1/J2 con su mando) o contra la IA (alfa-beta, 3 niveles que suben al ganarle: cpu:<id>).
 * Tablero: índice r*7+c con r=0 abajo. Las funciones f4* son puras (se prueban bot contra bot desde Playwright). */
const F4C = 7, F4R = 6;
let F4WIN = null;
function f4Wins() { if (F4WIN) return F4WIN; F4WIN = []; for (let r = 0; r < F4R; r++) for (let c0 = 0; c0 < F4C; c0++) for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const w = []; for (let i = 0; i < 4; i++) { const cc = c0 + dc * i, rr = r + dr * i; if (cc < 0 || cc >= F4C || rr < 0 || rr >= F4R) break; w.push(rr * F4C + cc); } if (w.length === 4) F4WIN.push(w); } return F4WIN; }
function f4New() { return { b: new Int8Array(F4C * F4R), h: new Int8Array(F4C), n: 0 }; }
function f4Legal(g) { const out = []; for (let c0 = 0; c0 < F4C; c0++) if (g.h[c0] < F4R) out.push(c0); return out; }
function f4Play(g, c0, p) { const r = g.h[c0]; g.b[r * F4C + c0] = p; g.h[c0]++; g.n++; return r; }
function f4Undo(g, c0) { g.h[c0]--; g.b[g.h[c0] * F4C + c0] = 0; g.n--; }
/* Línea ganadora que pasa por (c,r) para el jugador p, o null */
function f4Line(g, c0, r, p) { for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const cells = [[c0, r]];
    for (const s of [1, -1]) { let cc = c0 + dc * s, rr = r + dr * s; while (cc >= 0 && cc < F4C && rr >= 0 && rr < F4R && g.b[rr * F4C + cc] === p) { cells.push([cc, rr]); cc += dc * s; rr += dr * s; } }
    if (cells.length >= 4) return cells; } return null; }
function f4Eval(g, p) { const o = 3 - p; let s = 0; for (let r = 0; r < F4R; r++) { const v = g.b[r * F4C + 3]; if (v === p) s += 3; else if (v === o) s -= 3; }
  for (const w of f4Wins()) { let a = 0, e = 0; for (const i of w) { const v = g.b[i]; if (v === p) a++; else if (v === o) e++; } if (a && e) continue; if (a === 3) s += 6; else if (a === 2) s += 2; else if (e === 3) s -= 7; else if (e === 2) s -= 2; } return s; }
const F4ORD = [3, 2, 4, 1, 5, 0, 6];
function f4Neg(g, p, depth, al, be, ply) {
  for (const c0 of F4ORD) if (g.h[c0] < F4R) { const r = f4Play(g, c0, p), w = f4Line(g, c0, r, p); f4Undo(g, c0); if (w) return 1000 - ply; }
  if (g.n >= F4C * F4R) return 0; if (depth <= 0) return f4Eval(g, p);
  let best = -1e9; for (const c0 of F4ORD) { if (g.h[c0] >= F4R) continue; f4Play(g, c0, p); const v = -f4Neg(g, 3 - p, depth - 1, -be, -al, ply + 1); f4Undo(g, c0); if (v > best) best = v; if (v > al) al = v; if (al >= be) break; } return best; }
/* Jugada de la IA. lvl 0 = fácil (profundidad 1, despistes), 1 = normal (3), 2 = difícil (5); sube medio nivel por victoria. */
const F4DEP = [1, 3, 5], F4ERR = [0.4, 0.15, 0.04]; // 1.23: más fácil (antes 2/4/6, 0.28/0.08/0)
function f4AI(g, p, lvl, rnd) { rnd = rnd || Math.random; const L = Math.max(0, Math.min(2, lvl | 0)), ms = f4Legal(g); if (!ms.length) return -1;
  for (const c0 of ms) { const r = f4Play(g, c0, p), w = f4Line(g, c0, r, p); f4Undo(g, c0); if (w) return c0; } // siempre remata
  if (rnd() < F4ERR[L]) return ms[Math.floor(rnd() * ms.length)];
  let best = [], bv = -1e9; for (const c0 of ms) { f4Play(g, c0, p); const v = -f4Neg(g, 3 - p, F4DEP[L] - 1, -1e9, 1e9, 1); f4Undo(g, c0); if (v > bv + 0.5) { bv = v; best = [c0]; } else if (Math.abs(v - bv) <= 0.5) best.push(c0); }
  return best[Math.floor(rnd() * best.length)]; }
function f4Main() {
  const S4 = 50, BW = F4C * S4, BH = F4R * S4, BX = (W - BW) / 2, BY = 100, cxF = (c0) => BX + c0 * S4 + S4 / 2, cyF = (r) => BY + (F4R - 1 - r) * S4 + S4 / 2;
  const LS = 'cpu:' + CFG.id; let lvl4 = 0; try { lvl4 = +localStorage.getItem(LS) || 0; } catch (e) {}
  let endT = 0, g, turn, first = 0, hover, drops, winLine, series, seats, over4, think, t4 = 0, pendEnd = 0, lastDrop = -1, msg4 = '', moves = 0, cpuPick = -1;
  const seat = () => (seats = k.players(2));
  function newGame() { g = f4New(); turn = first; first = 1 - first; hover = [3, 3]; drops = []; winLine = null; over4 = false; think = 0; pendEnd = 0; endT = 0; lastDrop = -1; moves = 0; cpuPick = -1; }
  function reset4() { series = [0, 0]; seat(); first = 0; newGame(); k.count(3); }
  k.onParty = () => { seat(); };
  // ---- arte cacheado: marco de plástico con agujeros (las fichas caen por detrás) y fondo ----
  const FR = (() => { const cv = document.createElement('canvas'); cv.width = (BW + 36) * 2; cv.height = (BH + 44) * 2; const q = cv.getContext('2d'); q.scale(2, 2); q.translate(18, 10);
    ART.rr(q, -14, -8, BW + 28, BH + 22, 18); let gr = q.createLinearGradient(0, -8, 0, BH + 14); gr.addColorStop(0, '#5b63e8'); gr.addColorStop(1, '#3137a8'); q.fillStyle = gr; q.fill();
    q.globalCompositeOperation = 'destination-out'; for (let r = 0; r < F4R; r++) for (let c0 = 0; c0 < F4C; c0++) { q.beginPath(); q.arc(c0 * S4 + S4 / 2, r * S4 + S4 / 2, S4 * 0.37, 0, 6.283); q.fill(); }
    q.globalCompositeOperation = 'source-over';
    for (let r = 0; r < F4R; r++) for (let c0 = 0; c0 < F4C; c0++) { const x = c0 * S4 + S4 / 2, y = r * S4 + S4 / 2; q.lineWidth = 3; q.strokeStyle = 'rgba(20,16,60,.55)'; q.beginPath(); q.arc(x, y + 1, S4 * 0.37 + 1.5, 0.2, Math.PI - 0.2); q.stroke(); q.strokeStyle = 'rgba(255,255,255,.28)'; q.beginPath(); q.arc(x, y - 1, S4 * 0.37 + 1.5, Math.PI + 0.3, -0.3); q.stroke(); q.lineWidth = 2; q.strokeStyle = OUT; q.beginPath(); q.arc(x, y, S4 * 0.37, 0, 6.283); q.stroke(); }
    ART.rr(q, -14, -8, BW + 28, BH + 22, 18); q.lineWidth = 3; q.strokeStyle = OUT; q.stroke(); q.fillStyle = 'rgba(255,255,255,.22)'; ART.rr(q, -6, -4, BW + 12, 5, 3); q.fill();
    // patas
    for (const x of [-16, BW + 4]) { ART.rr(q, x, BH - 30, 12, 50, 5); gr = q.createLinearGradient(x, 0, x + 12, 0); gr.addColorStop(0, '#6a72f0'); gr.addColorStop(1, '#2c318f'); q.fillStyle = gr; q.fill(); q.lineWidth = 2.5; q.strokeStyle = OUT; q.stroke(); }
    return cv; })();
  const BG = (() => { const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const q = cv.getContext('2d'); q.scale(2, 2);
    let gr = q.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a2560'); gr.addColorStop(1, '#141030'); q.fillStyle = gr; q.fillRect(0, 0, W, H);
    // papel pintado con rombos y mesa
    q.fillStyle = 'rgba(255,255,255,.035)'; for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 * 20; x < W; x += 40) { q.beginPath(); q.moveTo(x, y - 10); q.lineTo(x + 10, y); q.lineTo(x, y + 10); q.lineTo(x - 10, y); q.fill(); }
    gr = q.createLinearGradient(0, H - 70, 0, H); gr.addColorStop(0, '#8a5130'); gr.addColorStop(1, '#5a3018'); q.fillStyle = gr; q.fillRect(0, H - 62, W, 62); q.fillStyle = OUT; q.fillRect(0, H - 64, W, 3); q.fillStyle = 'rgba(255,220,180,.25)'; q.fillRect(0, H - 60, W, 2);
    q.strokeStyle = 'rgba(40,15,0,.25)'; q.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const y = H - 52 + i * 9; q.beginPath(); q.moveTo(0, y); q.bezierCurveTo(W * 0.3, y + 4, W * 0.7, y - 4, W, y + 2); q.stroke(); }
    gr = q.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H * 0.45, 420); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.4)'); q.fillStyle = gr; q.fillRect(0, 0, W, H); return cv; })();
  const DSC = {};
  function discSpr(col) { if (DSC[col]) return DSC[col]; const R = S4 * 0.39, sz = S4 + 8, cv = document.createElement('canvas'); cv.width = cv.height = sz * 2; const q = cv.getContext('2d'); q.scale(2, 2); q.translate(sz / 2, sz / 2);
    q.beginPath(); q.arc(0, 0, R, 0, 6.283); const gr = q.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R); gr.addColorStop(0, ART.lite(col, 0.45)); gr.addColorStop(1, col); q.fillStyle = gr; q.fill(); q.lineWidth = 2.2; q.strokeStyle = OUT; q.stroke();
    q.lineWidth = 2; q.strokeStyle = 'rgba(0,0,0,.22)'; q.beginPath(); q.arc(0, 0, R * 0.68, 0, 6.283); q.stroke(); q.strokeStyle = 'rgba(255,255,255,.3)'; q.beginPath(); q.arc(0, 1, R * 0.5, 0, 6.283); q.stroke();
    q.fillStyle = 'rgba(255,255,255,.4)'; q.beginPath(); q.ellipse(-R * 0.32, -R * 0.45, R * 0.36, R * 0.16, -0.5, 0, 6.283); q.fill(); return (DSC[col] = cv); }
  const disc = (p, x, y, s, a) => { const sz = (S4 + 8) * (s || 1); c.globalAlpha = a == null ? 1 : a; c.drawImage(discSpr(k.pcol(p)), x - sz / 2, y - sz / 2, sz, sz); c.globalAlpha = 1; };
  const nameOf = (p) => (seats[p].cpu ? 'CPU' : String(seats[p].name).slice(0, 8));
  const human = (p) => !seats[p].cpu;
  const LVLN = ['Fácil', 'Normal', 'Difícil'];
  function drop(c0) { if (g.h[c0] >= F4R || over4) return false; const p = turn + 1, r = f4Play(g, c0, p); moves++; drops.push({ c: c0, r, p: turn, y: BY - S4 * 0.6, vy: 0, done: false, b: 0 }); lastDrop = c0; k.sfx('click');
    const w = f4Line(g, c0, r, p); if (w) { winLine = { cells: w, p: turn }; over4 = true; pendEnd = 1; } else if (g.n >= F4C * F4R) { over4 = true; pendEnd = 2; } else { turn = 1 - turn; hover[turn] = c0; think = 0; cpuPick = -1; } return true; }
  function finish4() { const vsCPU = seats[0].cpu !== seats[1].cpu, hp = seats[0].cpu ? 1 : 0;
    if (pendEnd === 1) { const wp = winLine.p; series[wp]++;
      if (vsCPU) { if (wp === hp) lvl4 = Math.min(2, lvl4 + 0.5); else lvl4 = Math.max(0, lvl4 - 1); try { localStorage.setItem(LS, lvl4); } catch (e) {} }
      k.podium([{ p: 0, score: series[0] }, { p: 1, score: series[1] }], { head: `¡Cuatro en línea de ${nameOf(wp)}!`, noTie: true, fmt: (v) => `${v} ${v === 1 ? 'partida' : 'partidas'}`, go: 'Toca para la siguiente' }); }
    else k.podium([{ p: 0, score: series[0] }, { p: 1, score: series[1] }], { head: '¡Tablero lleno: empate!', noTie: true, fmt: (v) => `${v} ${v === 1 ? 'partida' : 'partidas'}`, go: 'Toca para la siguiente' }); }
  const help = 'Deja caer fichas por las columnas y conecta 4 en horizontal, vertical o diagonal antes que el rival. ← → o joystick para elegir columna, A (o ↓) para soltar; en el móvil, toca la columna. Contra la IA, cada victoria la hace más lista.';
  reset4(); k.show(CFG.title, help);
  // tras la pantalla final se juega la siguiente partida conservando el marcador de la serie
  const again = () => { seat(); newGame(); k.count(2); };
  let started = false, lpx = k.ptr.x;
  k.run((dt) => {
    t4 += dt;
    for (const d of drops) if (!d.done) { const ty = cyF(d.r); d.vy += 2600 * dt; d.y += d.vy * dt; if (d.y >= ty) { d.y = ty; if (d.vy > 260) { d.vy = -d.vy * 0.28; if (!d.b++) { k.sfx('pop'); k.shake(1.5); } } else { d.vy = 0; d.done = true; } } }
    if (!k.gate(started ? again : reset4)) return; started = true;
    if (k.counting()) return;
    if (drops.some((d) => !d.done)) return;
    if (pendEnd) { if (endT === 0 && winLine) { const col = k.pcol(winLine.p); k.sfx('win'); k.shake(4); for (const [cc, rr] of winLine.cells) k.burst(cxF(cc), cyF(rr), col, 14, 160); }
      endT += dt; if (endT > (winLine ? 1.1 : 0.6)) { finish4(); pendEnd = 0; } return; }
    if (over4) return;
    const p = turn;
    if (!human(p)) { think += dt; if (cpuPick < 0 && think > 0.25) { cpuPick = f4AI(g, p + 1, lvl4); } if (cpuPick >= 0) { if (hover[p] !== cpuPick && think > 0.4) { hover[p] += Math.sign(cpuPick - hover[p]); think = 0.25; k.sfx('click'); } else if (hover[p] === cpuPick && think > 0.55) drop(cpuPick); } return; }
    if (k.phit(p, 'left')) { hover[p] = (hover[p] + F4C - 1) % F4C; k.sfx('click'); } if (k.phit(p, 'right')) { hover[p] = (hover[p] + 1) % F4C; k.sfx('click'); }
    if (k.phit(p, 'a') || k.phit(p, 'down')) { if (!drop(hover[p])) { k.sfx('hit'); k.float('Columna llena', cxF(hover[p]), BY - 20, '#ff9aa8'); } }
    if (!k.party && k.ptr.hit && p === 0) { const c0 = Math.floor((k.ptr.x - BX) / S4); if (c0 >= 0 && c0 < F4C && k.ptr.y > 40 && k.ptr.y < BY + BH + 20) { hover[0] = c0; if (!drop(c0)) k.sfx('hit'); } }
    else if (!k.party && p === 0 && k.ptr.x !== lpx) { lpx = k.ptr.x; const c0 = Math.floor((k.ptr.x - BX) / S4); if (c0 >= 0 && c0 < F4C && k.ptr.y > 40) hover[0] = c0; }
  }, () => {
    c.drawImage(BG, 0, 0, W, H);
    const now = t4;
    // título y marcador de la serie
    label(CFG.title, W / 2, 12, 26, '#ffe27a', 'center');
    for (const p of [0, 1]) { const x = p ? W - 66 : 66, act = k.st === 'play' && !over4 && turn === p, col = k.pcol(p);
      ART.rr(c, x - 56, 150, 112, 170, 16); c.fillStyle = act ? ART.alpha(col, 0.28) : 'rgba(20,16,50,.72)'; c.fill(); c.lineWidth = act ? 4 : 2; c.strokeStyle = act ? col : 'rgba(255,255,255,.15)'; c.stroke();
      disc(p, x, 196 + (act ? Math.sin(now * 5) * 3 : 0), 1.05); label(nameOf(p), x, 236, 22, col, 'center'); label(String(series ? series[p] : 0), x, 262, 30, '#fff', 'center');
      label(seats && seats[p].cpu ? LVLN[lvl4 | 0] : (act ? 'Tu turno' : ' '), x, 298, 15, act ? '#fff' : '#cfd6ff', 'center'); }
    // fichas (detrás del marco)
    for (let r = 0; r < F4R; r++) for (let c0 = 0; c0 < F4C; c0++) { const v = g.b[r * F4C + c0]; if (!v) continue; const d = drops.find((q) => q.c === c0 && q.r === r); if (d && !d.done) continue; disc(v - 1, cxF(c0), cyF(r)); }
    for (const d of drops) if (!d.done) disc(d.p, cxF(d.c), d.y);
    c.drawImage(FR, BX - 18, BY - 10, BW + 36, BH + 44);
    // línea ganadora
    if (winLine && drops.every((d) => d.done)) { const cs = winLine.cells.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), a = cs[0], b = cs[cs.length - 1], pul = 0.5 + 0.5 * Math.sin(now * 8);
      for (const [cc, rr] of cs) { c.lineWidth = 4; c.strokeStyle = `rgba(255,255,255,${0.5 + pul * 0.5})`; c.beginPath(); c.arc(cxF(cc), cyF(rr), S4 * 0.42, 0, 6.283); c.stroke(); }
      c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 12; c.beginPath(); c.moveTo(cxF(a[0]), cyF(a[1])); c.lineTo(cxF(b[0]), cyF(b[1])); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 6; c.stroke(); }
    // ficha flotante del jugador en turno
    if (k.st === 'play' && !over4 && !drops.some((d) => !d.done) && !k.counting()) { const hx = cxF(hover[turn]), hy = BY - S4 * 0.62 + Math.sin(now * 4) * 3; disc(turn, hx, hy, 1, 0.95);
      c.fillStyle = ART.alpha(k.pcol(turn), 0.16); c.fillRect(BX + hover[turn] * S4 + 4, BY, S4 - 8, BH);
      const r = g.h[hover[turn]]; if (r < F4R) { c.globalAlpha = 0.35 + 0.15 * Math.sin(now * 6); disc(turn, hx, cyF(r), 0.9); c.globalAlpha = 1; } }
    const st = !g ? '' : over4 ? '' : (human(turn) ? (k.party || seats[0].cpu === seats[1].cpu ? `Turno de ${nameOf(turn)}` : 'Tu turno') : 'La CPU piensa' + '.'.repeat(1 + Math.floor(now * 3) % 3));
    label(st, W / 2, H - 44, 22, turn !== undefined ? k.pcol(turn) : '#fff', 'center');
    if (k.st === 'play' && !k.party && moves === 0 && human(turn) && !seats[0].cpu) label('← → elige columna · A suelta', W / 2, 52, 16, '#cfd6ff', 'center');
  });
}
if (FOUR) f4Main();
