/* Juegos de tablero contra la IA. CFG.mode: 'checkers' | 'reversi'
 * Damas: captura obligatoria, multisalto y la coronación termina el turno. Reversi con pasar turno.
 * Tablero de madera cacheado, fichas con bisel, deslizamientos/saltos, volteo escalonado y jugadas válidas marcadas. */
const M = CFG.mode, W = 480, H = 560, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#2a1a12' }), c = k.ctx, N = 8, S = 54, OX = 24, OY = 72;
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
const AIERR = [0.35, 0.15, 0];
function rAI() { const ms = rMoves(b, 2); if (!ms.length) return null; const L = Math.min(lvl, 2);
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
/* Damas: profundidad 1 → 4 según el nivel y probabilidad de despiste (jugada legal al azar, respeta la captura obligatoria) */
const CDEP = [1, 2, 3, 4], CERR = [0.3, 0.15, 0.05, 0];
function cAI() { const ss = cSeqs(b, 2); if (!ss.length) return null; const L = Math.min(lvl, 3); if (Math.random() < CERR[L]) return k.pick(ss);
  let best = null, bv = -1e9; for (const q of k.shuffle(ss)) { const v = cSearch(q.bd, 1, CDEP[L], bv, 1e9); if (v > bv) { bv = v; best = q; } } return best; }
function reset() { if (wins === undefined) wins = 0; build(); }
function finish() { let me = 0, ai = 0; for (const r of b) for (const v of r) { if (owner(v) === 1 || (M === 'reversi' && v === 1)) me++; if (owner(v) === 2) ai++; }
  const won = M === 'reversi' ? me > ai : !cMoves(b, 2).length; if (won) { wins++; lvl++; } else if (!(M === 'reversi' && me === ai)) lvl = Math.max(0, lvl - 1); k.st = 'over'; k.show(won ? '¡Ganaste!' : me === ai && M === 'reversi' ? 'Empate' : 'Perdiste', `${M === 'reversi' ? `${me} – ${ai} · ` : `Piezas: tú ${me}, IA ${ai} · `}Victorias seguidas: ${wins} · Récord ${k.best(CFG.id, wins)}<br>Toca para jugar otra vez`); if (!won) { wins = 0; k.sfx('lose'); } }
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
reset(); k.show(CFG.title, M === 'reversi' ? 'Coloca fichas para encerrar las del rival y darles la vuelta. Los puntos marcan tus jugadas válidas. Gana quien tenga más.' : 'Mueve en diagonal y salta sobre las piezas rivales. Capturar es obligatorio, se encadenan saltos y al coronar termina el turno.');
k.run((dt) => {
  at += dt; if (!k.gate(reset)) return;
  if (busy()) return;
  if (pend) { pend = null; return finish(); }
  if (M === 'checkers' && quiet >= 40) { quiet = 0; k.st = 'over'; k.show('Tablas', `40 jugadas sin capturas ni avances · Victorias seguidas: ${wins}<br>Toca para jugar otra vez`); return; }
  if (turn === 2) { thinking = (thinking || 0) + dt; if (thinking < 0.45) return; thinking = 0; return aiTurn(); }
  for (const d of ['left', 'right', 'up', 'down']) if (k.hit.has(d)) { if (!kbd || !cur) { kbd = true; cur = sel ? [...sel] : [3, 5]; } else { cur[0] = k.clamp(cur[0] + (d === 'left' ? -1 : d === 'right' ? 1 : 0), 0, 7); cur[1] = k.clamp(cur[1] + (d === 'up' ? -1 : d === 'down' ? 1 : 0), 0, 7); } }
  if (k.hit.has('a') && kbd && cur) tapSquare(cur[0], cur[1]);
  if (!k.ptr.hit) return; kbd = false; const x = Math.floor((k.ptr.x - OX) / S), y = Math.floor((k.ptr.y - OY) / S); if (!inb(x, y)) return; tapSquare(x, y);
}, draw);

/* ================= Arte ================= */
const BOARD = (() => { const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
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
  label(CFG.title, 16, 12, 20, '#ffe27a'); label(`Victorias ${wins}`, W - 16, 14, 15, '#fff', 'right'); label(`IA nivel ${Math.min(lvl, M === 'reversi' ? 2 : 3) + 1}`, W - 16, 36, 12, '#cfd6ff', 'right');
  const my = OY + N * S + 18; let me = 0, ai = 0; for (const r of b) for (const v of r) { if (owner(v) === 1) me++; if (owner(v) === 2) ai++; }
  piece(1, 36, my + 12, 0.5, 0.5); label(`Tú ${me}`, 52, my + 3, 16, '#fff'); piece(2, W - 36, my + 12, 0.5, 0.5); label(`IA ${ai}`, W - 52, my + 3, 16, '#fff', 'right');
  const tc = turn === 1 ? '#7cf7a0' : '#ffb0e0'; label(turn === 2 && !busy() ? 'La IA piensa' + '.'.repeat(1 + Math.floor(now * 3) % 3) : msg, W / 2, my + 4, 15, msg === 'Captura obligatoria' ? '#ff8a9a' : tc, 'center');
}
