/* Juegos de tablero contra la IA. CFG.mode: 'checkers' | 'reversi' */
const M = CFG.mode, k = Kit({ w: 480, h: 560, title: CFG.title, bg: '#1e1a2e' }), c = k.ctx, N = 8, S = 54, OX = 24, OY = 80;
let b, turn, sel, moves, wins, thinking, msg, chain;
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
function build() { b = Array.from({ length: N }, () => Array(N).fill(0));
  if (M === 'reversi') { b[3][3] = b[4][4] = 2; b[3][4] = b[4][3] = 1; } else for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2) { if (y < 3) b[y][x] = 2; if (y > 4) b[y][x] = 1; }
  turn = 1; sel = null; chain = null; msg = 'Tu turno'; }
/* ---- Reversi ---- */
function flips(bd, x, y, p) { if (bd[y][x]) return []; const out = []; for (const [dx, dy] of DIRS8) { const line = []; let cx = x + dx, cy = y + dy; while (inb(cx, cy) && bd[cy][cx] === 3 - p) { line.push([cx, cy]); cx += dx; cy += dy; } if (line.length && inb(cx, cy) && bd[cy][cx] === p) out.push(...line); } return out; }
function rMoves(bd, p) { const m = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const f = flips(bd, x, y, p); if (f.length) m.push({ x, y, f }); } return m; }
const W8 = [[100, -20, 10, 5, 5, 10, -20, 100], [-20, -50, -2, -2, -2, -2, -50, -20], [10, -2, 1, 1, 1, 1, -2, 10], [5, -2, 1, 0, 0, 1, -2, 5], [5, -2, 1, 0, 0, 1, -2, 5], [10, -2, 1, 1, 1, 1, -2, 10], [-20, -50, -2, -2, -2, -2, -50, -20], [100, -20, 10, 5, 5, 10, -20, 100]];
function rEval(bd) { let s = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) s += bd[y][x] === 2 ? W8[y][x] : bd[y][x] === 1 ? -W8[y][x] : 0; return s + (rMoves(bd, 2).length - rMoves(bd, 1).length) * 3; }
function rPlay(bd, m, p) { const nb = bd.map((r) => [...r]); nb[m.y][m.x] = p; for (const [x, y] of m.f) nb[y][x] = p; return nb; }
function rAI() { let best = null, bv = -1e9; for (const m of rMoves(b, 2)) { const nb = rPlay(b, m, 2); const rep = rMoves(nb, 1); let worst = rep.length ? 1e9 : rEval(nb); for (const r of rep) worst = Math.min(worst, rEval(rPlay(nb, r, 1))); if (worst > bv) { bv = worst; best = m; } } return best; }
/* ---- Damas ---- */
function cMoves(bd, p) { const jumps = [], steps = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = bd[y][x]; if (!v || owner(v) !== p) continue; const king = v > 2, dirs = king ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : p === 1 ? [[1, -1], [-1, -1]] : [[1, 1], [-1, 1]];
    for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue; if (!bd[ny][nx]) steps.push({ x, y, nx, ny }); else if (owner(bd[ny][nx]) !== p && inb(nx + dx, ny + dy) && !bd[ny + dy][nx + dx]) jumps.push({ x, y, nx: nx + dx, ny: ny + dy, cap: [nx, ny] }); } } return jumps.length ? jumps : steps; }
const owner = (v) => (v === 1 || v === 3 ? 1 : v === 2 || v === 4 ? 2 : 0);
function cPlay(bd, m) { const nb = bd.map((r) => [...r]); let v = nb[m.y][m.x]; nb[m.y][m.x] = 0; if (m.cap) nb[m.cap[1]][m.cap[0]] = 0; if (v === 1 && m.ny === 0) v = 3; if (v === 2 && m.ny === N - 1) v = 4; nb[m.ny][m.nx] = v; return nb; }
function cEval(bd) { let s = 0; for (const r of bd) for (const v of r) s += v === 2 ? 3 : v === 4 ? 5 : v === 1 ? -3 : v === 3 ? -5 : 0; return s; }
function cSearch(bd, p, depth) { const ms = cMoves(bd, p); if (!ms.length) return p === 2 ? -100 : 100; if (!depth) return cEval(bd); let best = p === 2 ? -1e9 : 1e9; for (const m of ms) { const nb = cPlay(bd, m); const v = cSearch(nb, 3 - p, depth - 1); best = p === 2 ? Math.max(best, v) : Math.min(best, v); } return best; }
function cAI() { const ms = cMoves(b, 2); let best = null, bv = -1e9; for (const m of k.shuffle(ms)) { const v = cSearch(cPlay(b, m), 1, 3); if (v > bv) { bv = v; best = m; } } return best; }
function reset() { if (wins === undefined) wins = 0; build(); }
reset(); k.show(CFG.title, M === 'reversi' ? 'Coloca fichas para encerrar las del rival y darles la vuelta. Gana quien tenga más.' : 'Mueve en diagonal y salta sobre las piezas rivales. Capturar es obligatorio.');
function finish() { let me = 0, ai = 0; for (const r of b) for (const v of r) { if (owner(v) === 1 || (M === 'reversi' && v === 1)) me++; if (owner(v) === 2) ai++; }
  const won = M === 'reversi' ? me > ai : !cMoves(b, 2).length; if (won) wins++; k.st = 'over'; k.show(won ? '¡Ganaste!' : me === ai && M === 'reversi' ? 'Empate' : 'Perdiste', `${M === 'reversi' ? `${me} – ${ai} · ` : ''}Victorias: ${wins} · Récord ${k.best(CFG.id, wins)}<br>Toca para jugar otra vez`); if (!won) wins = 0; }
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (turn === 2) { thinking = (thinking || 0) + dt; if (thinking < 0.5) return; thinking = 0;
    if (M === 'reversi') { const m = rAI(); if (m) b = rPlay(b, m, 2); turn = 1; if (!rMoves(b, 1).length) { if (!rMoves(b, 2).length) return finish(); turn = 2; msg = 'No puedes mover, pasa'; } else msg = 'Tu turno'; }
    else { let m = cAI(); if (!m) return finish(); m.wasKing = b[m.y][m.x] === 4; b = cPlay(b, m); while (m.cap) { if (b[m.ny][m.nx] === 4 && m.ny === N - 1 && !m.wasKing) break; const more = cMoves(b, 2).filter((q) => q.cap && q.x === m.nx && q.y === m.ny); if (!more.length) break; const wk = m.wasKing; m = more[0]; m.wasKing = wk; b = cPlay(b, m); } turn = 1; if (!cMoves(b, 1).length) return finish(); msg = 'Tu turno'; }
    return; }
  if (!k.ptr.hit) return; const x = Math.floor((k.ptr.x - OX) / S), y = Math.floor((k.ptr.y - OY) / S); if (!inb(x, y)) return;
  if (M === 'reversi') { const m = rMoves(b, 1).find((q) => q.x === x && q.y === y); if (m) { b = rPlay(b, m, 1); k.sfx('click'); turn = 2; msg = 'IA pensando…'; if (!rMoves(b, 2).length) { turn = 1; if (!rMoves(b, 1).length) return finish(); msg = 'La IA pasa. Tu turno'; } } return; }
  const legal = cMoves(b, 1).filter((q) => !chain || (q.cap && q.x === chain[0] && q.y === chain[1]));
  if (owner(b[y][x]) === 1 && !chain) { sel = [x, y]; return; }
  if (sel) { const m = legal.find((q) => q.x === sel[0] && q.y === sel[1] && q.nx === x && q.ny === y); if (m) { const wasMan = b[m.y][m.x] === 1; b = cPlay(b, m); k.sfx(m.cap ? 'hit' : 'click'); const crowned = wasMan && b[m.ny][m.nx] === 3; const more = m.cap && !crowned && cMoves(b, 1).filter((q) => q.cap && q.x === x && q.y === y); if (more && more.length) { chain = [x, y]; sel = [x, y]; msg = 'Sigue saltando'; } else { chain = null; sel = null; turn = 2; msg = 'IA pensando…'; if (!cMoves(b, 2).length) finish(); } } }
}, () => {
  k.clear(); k.text(CFG.title, 24, 20, 24, '#f2d15c'); k.text(msg, 456, 26, 15, '#fff', 'right');
  const hints = turn === 1 ? (M === 'reversi' ? rMoves(b, 1) : cMoves(b, 1).filter((q) => sel && q.x === sel[0] && q.y === sel[1])) : [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { k.rect(OX + x * S, OY + y * S, S, S, M === 'reversi' ? ((x + y) % 2 ? '#1f7a4d' : '#218353') : (x + y) % 2 ? '#7a4f35' : '#e8d3b0');
    const v = b[y][x]; if (v) { const cx = OX + x * S + S / 2, cy = OY + y * S + S / 2; k.circle(cx, cy + 2, S * 0.4, 'rgba(0,0,0,.3)'); k.circle(cx, cy, S * 0.4, owner(v) === 1 || (M === 'reversi' && v === 1) ? (M === 'reversi' ? '#1b1b1b' : '#d23a4a') : (M === 'reversi' ? '#f5f5f5' : '#222')); if (v > 2 && M === 'checkers') k.text('♛', cx, cy - 11, 20, '#f2d15c', 'center'); if (sel && sel[0] === x && sel[1] === y) { c.strokeStyle = '#f2d15c'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, S * 0.44, 0, 6.283); c.stroke(); } } }
  for (const h of hints) { const hx = M === 'reversi' ? h.x : h.nx, hy = M === 'reversi' ? h.y : h.ny; k.circle(OX + hx * S + S / 2, OY + hy * S + S / 2, 7, 'rgba(242,209,92,.8)'); }
  if (M === 'reversi') { let me = 0, ai = 0; for (const r of b) for (const v of r) { if (v === 1) me++; if (v === 2) ai++; } k.text(`● Tú ${me}   ○ IA ${ai}`, 240, 526, 18, '#fff', 'center'); }
});
