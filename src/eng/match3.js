/* Match-3. CFG.mode: 'moves' | 'time' */
const k = Kit({ w: 480, h: 640, title: CFG.title, bg: '#1a1433' }), c = k.ctx, N = 8, S = 56, OX = 16, OY = 130;
const GEM = ['#ff5f7a', '#f2d15c', '#7cf7a0', '#5ce1e6', '#b98cff', '#ffa94d'];
let b, off, sel, score, moves, target, level, time, busy, combo;
function rnd() { return k.ri(0, 5); }
function fill() { b = []; for (let y = 0; y < N; y++) { b[y] = []; for (let x = 0; x < N; x++) { let v; do v = rnd(); while ((x > 1 && b[y][x - 1] === v && b[y][x - 2] === v) || (y > 1 && b[y - 1][x] === v && b[y - 2][x] === v)); b[y][x] = v; } } off = Array.from({ length: N }, () => Array(N).fill(0)); }
function matches() { const m = new Set();
  for (let y = 0; y < N; y++) for (let x = 0; x < N - 2; x++) { const v = b[y][x]; if (v >= 0 && v === b[y][x + 1] && v === b[y][x + 2]) [0, 1, 2].forEach((i) => m.add(y * N + x + i)); }
  for (let x = 0; x < N; x++) for (let y = 0; y < N - 2; y++) { const v = b[y][x]; if (v >= 0 && v === b[y + 1][x] && v === b[y + 2][x]) [0, 1, 2].forEach((i) => m.add((y + i) * N + x)); } return m; }
function hasMove() { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) { const nx = x + dx, ny = y + dy; if (nx >= N || ny >= N) continue; swap(x, y, nx, ny); const ok = matches().size > 0; swap(x, y, nx, ny); if (ok) return true; } return false; }
function swap(x1, y1, x2, y2) { const t = b[y1][x1]; b[y1][x1] = b[y2][x2]; b[y2][x2] = t; }
function resolve() { const m = matches(); if (!m.size) { combo = 0; if (!hasMove()) fill(); return false; }
  combo++; score += m.size * 10 * combo; for (const i of m) { const gy = Math.floor(i / N), gx = i % N; k.burst(OX + gx * S + S / 2, OY + gy * S + S / 2, GEM[b[gy][gx]], 6, 120); b[gy][gx] = -1; } k.sfx(combo > 1 ? 'coin' : 'pop'); if (combo > 1) k.float(`Combo x${combo}`, 240, 110, '#ff9ad5');
  for (let x = 0; x < N; x++) { let w = N - 1; for (let y = N - 1; y >= 0; y--) if (b[y][x] >= 0) { if (w !== y) { b[w][x] = b[y][x]; off[w][x] = (w - y) * S; } w--; } for (let y = w; y >= 0; y--) { b[y][x] = rnd(); off[y][x] = (w + 1) * S; } }
  navigator.vibrate && navigator.vibrate(12); return true; }
function reset() { score = 0; level = 1; moves = 25; target = 1500; time = 90; combo = 0; fill(); sel = null; }
reset(); k.show(CFG.title, CFG.mode === 'time' ? 'Haz todas las combinaciones que puedas en 90 segundos. Desliza o toca dos gemas vecinas.' : 'Consigue los puntos objetivo antes de quedarte sin movimientos.');
let pending = null;
k.run((dt) => {
  let settling = false; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (off && off[y][x] > 0) { off[y][x] = Math.max(0, off[y][x] - 900 * dt); settling = true; }
  if (!k.gate(reset)) return;
  if (CFG.mode === 'time') { time -= dt; if (time <= 0) return k.lose(CFG.id, score, '¡Tiempo!'); }
  if (!settling) { if (pending) { const [a, bb] = pending; pending = null; if (!resolve()) { swap(a[0], a[1], bb[0], bb[1]); if (CFG.mode === 'moves') moves++; } } else resolve(); }
  if (settling || pending) return;
  if (CFG.mode === 'moves') { if (score >= target) { level++; target = score + 1500 + level * 500; moves = 25; } else if (moves <= 0) return k.lose(CFG.id, score, 'Sin movimientos', `Nivel ${level}`); }
  const cell = (x, y) => [Math.floor((x - OX) / S), Math.floor((y - OY) / S)], inB = ([x, y]) => x >= 0 && y >= 0 && x < N && y < N;
  let a = null, bb = null;
  if (k.ptr.up) { const s0 = cell(k.ptr.sx, k.ptr.sy); const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy;
    if (Math.hypot(dx, dy) > 20 && inB(s0)) { a = s0; bb = Math.abs(dx) > Math.abs(dy) ? [s0[0] + Math.sign(dx), s0[1]] : [s0[0], s0[1] + Math.sign(dy)]; }
    else if (inB(s0)) { if (sel && Math.abs(sel[0] - s0[0]) + Math.abs(sel[1] - s0[1]) === 1) { a = sel; bb = s0; sel = null; } else sel = s0; } }
  if (a && bb && inB(bb)) { swap(a[0], a[1], bb[0], bb[1]); pending = [a, bb]; if (CFG.mode === 'moves') moves--; sel = null; }
}, () => {
  k.clear(); k.text(`${score}`, 24, 30, 30, '#fff'); k.text(CFG.mode === 'time' ? `${Math.max(0, Math.ceil(time))} s` : `Movs ${moves} · Meta ${target}`, 456, 38, 18, '#f2d15c', 'right');
  k.rrect(OX - 6, OY - 6, N * S + 12, N * S + 12, 14, '#241d45');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = b[y][x]; if (v < 0) continue; const cx = OX + x * S + S / 2, cy = OY + y * S + S / 2 - off[y][x];
    if (sel && sel[0] === x && sel[1] === y) k.rrect(OX + x * S + 2, OY + y * S + 2, S - 4, S - 4, 10, 'rgba(255,255,255,.2)');
    c.fillStyle = GEM[v]; c.beginPath(); const r = 21, sides = [3, 4, 5, 6, 8, 40][v]; for (let i = 0; i < sides; i++) { const ang = -Math.PI / 2 + i * 6.283 / sides; c.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); } c.fill();
    k.circle(cx - 6, cy - 7, 4, 'rgba(255,255,255,.55)'); }
  if (combo > 1) k.text(`Combo x${combo}`, 240, 90, 20, '#ff9ad5', 'center');
});
