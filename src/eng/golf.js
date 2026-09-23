/* Minigolf. CFG.mode: 'walls' (Mini Golf 3D: recorridos con paredes) | 'island' (Putt Island: rodeado de agua) */
const M = CFG.mode, k = Kit({ w: 360, h: 640, title: CFG.title, bg: M === 'island' ? '#1e6fb8' : '#20382a' }), c = k.ctx, T = 30, COLS = 12, ROWS = 20;
let grid, ball, hole, tee, holeN, strokes, total, pars, aiming, sunkT, lastPos, bumpers, sand;
function genHole() {
  for (let tries = 0; tries < 100; tries++) {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); bumpers = []; sand = new Set();
    const rooms = []; let cx = k.ri(2, 8), cy = 16; const nr = k.ri(3, 4);
    for (let i = 0; i < nr; i++) { const w = k.ri(3, 5), h = k.ri(3, 5); const x = k.clamp(cx - Math.floor(w / 2), 1, COLS - 1 - w), y = k.clamp(cy - Math.floor(h / 2), 1, ROWS - 1 - h); rooms.push([x, y, w, h]); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) grid[yy][xx] = 1;
      const [nx, ny] = [k.clamp(cx + k.ri(-5, 5), 2, COLS - 3), k.clamp(cy - k.ri(4, 6), 2, ROWS - 3)]; const sx = Math.sign(nx - cx), sy = Math.sign(ny - cy); let x2 = cx, y2 = cy; while (x2 !== nx) { grid[y2][x2] = grid[y2][x2 + 1] = 1; x2 += sx; } while (y2 !== ny) { grid[y2][x2] = grid[y2][x2 + 1 < COLS ? x2 + 1 : x2] = 1; y2 += sy; } cx = nx; cy = ny; }
    const first = rooms[0], last = rooms[rooms.length - 1]; tee = [(first[0] + first[2] / 2) * T, (first[1] + first[3] - 0.7) * T]; hole = [(last[0] + last[2] / 2) * T, (last[1] + 0.8) * T];
    if (Math.hypot(tee[0] - hole[0], tee[1] - hole[1]) < 200) continue;
    for (let i = 0; i < 1 + Math.floor(holeN / 3); i++) { const r = k.pick(rooms.slice(1, -1).length ? rooms.slice(1, -1) : rooms); const bx = (r[0] + k.rnd(1, r[2] - 1)) * T, by = (r[1] + k.rnd(1, r[3] - 1)) * T; if (Math.hypot(bx - hole[0], by - hole[1]) > 60 && Math.hypot(bx - tee[0], by - tee[1]) > 60) bumpers.push({ x: bx, y: by, r: 14 }); }
    if (M === 'island') for (let i = 0; i < 6; i++) { const x = k.ri(0, COLS - 1), y = k.ri(0, ROWS - 1); if (grid[y][x]) sand.add(x + ',' + y); }
    return;
  }
}
function place() { ball = { x: tee[0], y: tee[1], vx: 0, vy: 0, r: 7 }; lastPos = [...tee]; strokes = 0; sunkT = 0; }
function reset() { holeN = 1; total = 0; pars = 0; genHole(); place(); }
reset(); k.show(CFG.title, M === 'island' ? 'Arrastra hacia atrás desde la bola para golpear. Si cae al agua: +1 golpe. 9 hoyos.' : 'Arrastra hacia atrás desde la bola para apuntar y golpear. Rebota en las paredes. 9 hoyos.');
const solid = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || !grid[ty][tx]; };
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (sunkT > 0) { sunkT -= dt; if (sunkT <= 0) { total += strokes; pars += 3; if (holeN >= 9) { const diff = total - pars; k.st = 'over'; k.best(CFG.id, Math.max(0, 100 - diff * 5)); k.show('Recorrido completado', `${total} golpes (${diff >= 0 ? '+' : ''}${diff} sobre par)<br>Toca para jugar otra vez`); return; } holeN++; genHole(); place(); } return; }
  const moving = Math.hypot(ball.vx, ball.vy) > 4;
  if (!moving) { if (k.ptr.hit && Math.hypot(k.ptr.x - ball.x, k.ptr.y - ball.y) < 60) aiming = true;
    if (aiming && k.ptr.up) { aiming = false; const dx = ball.x - k.ptr.x, dy = ball.y - k.ptr.y, p = Math.min(1, Math.hypot(dx, dy) / 150); if (p > 0.05) { const a = Math.atan2(dy, dx); ball.vx = Math.cos(a) * p * 900; ball.vy = Math.sin(a) * p * 900; strokes++; if (strokes >= 8 && M !== 'x') ball.cap = true; lastPos = [ball.x, ball.y]; k.sfx('click'); } } }
  const steps = 6; for (let s = 0; s < steps; s++) { const h = dt / steps, inSand = sand.has(Math.floor(ball.x / T) + ',' + Math.floor(ball.y / T)); const fr = inSand ? 3.2 : 1.05; ball.vx -= ball.vx * fr * h; ball.vy -= ball.vy * fr * h;
    if (M === 'island') { ball.x += ball.vx * h; ball.y += ball.vy * h; if (solid(ball.x, ball.y)) { strokes++; ball.x = lastPos[0]; ball.y = lastPos[1]; ball.vx = ball.vy = 0; navigator.vibrate && navigator.vibrate(60); break; } }
    else { ball.x += ball.vx * h; if (solid(ball.x + Math.sign(ball.vx) * ball.r, ball.y)) { ball.x -= ball.vx * h; ball.vx *= -0.8; } ball.y += ball.vy * h; if (solid(ball.x, ball.y + Math.sign(ball.vy) * ball.r)) { ball.y -= ball.vy * h; ball.vy *= -0.8; } }
    for (const b of bumpers) { const d = Math.hypot(ball.x - b.x, ball.y - b.y); if (d < b.r + ball.r) { const nx = (ball.x - b.x) / d, ny = (ball.y - b.y) / d, vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { ball.vx -= 2 * vn * nx * 1.05; ball.vy -= 2 * vn * ny * 1.05; } ball.x = b.x + nx * (b.r + ball.r); ball.y = b.y + ny * (b.r + ball.r); } }
    const dh = Math.hypot(ball.x - hole[0], ball.y - hole[1]); if (dh < 10 && Math.hypot(ball.vx, ball.vy) < 420) { ball.x = hole[0]; ball.y = hole[1]; ball.vx = ball.vy = 0; sunkT = 1.2; k.sfx(strokes <= 2 ? 'win' : 'coin'); if (strokes <= 2) k.confetti(); navigator.vibrate && navigator.vibrate(30); break; } }
  if (!moving) { ball.vx = ball.vy = 0; if (ball.cap && sunkT <= 0) { ball.cap = false; strokes = 8; sunkT = 1.2; k.float('Máximo de golpes', 180, 300, '#ff9a9a'); } }
}, () => {
  k.clear();
  if (M === 'island') { c.strokeStyle = 'rgba(255,255,255,.08)'; for (let y = 0; y < 640; y += 14) { c.beginPath(); c.moveTo(0, y + Math.sin(performance.now() / 600 + y) * 3); c.lineTo(360, y + Math.sin(performance.now() / 600 + y + 2) * 3); c.stroke(); } }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (grid[y][x]) { k.rect(x * T, y * T, T, T, (x + y) % 2 ? '#56b35a' : '#4eaa52'); if (sand.has(x + ',' + y)) k.rect(x * T + 2, y * T + 2, T - 4, T - 4, '#e8d08a'); }
    else if (M === 'walls') { const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy] && grid[y + dy][x + dx]); if (adj) { k.rect(x * T, y * T + 6, T, T, '#5a3a22'); k.rect(x * T, y * T, T, T - 4, '#9b6a3f'); } }
    else { const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy] && grid[y + dy][x + dx]); if (adj) k.rect(x * T, y * T, T, T, 'rgba(240,220,160,.35)'); } }
  for (const b of bumpers) { k.circle(b.x, b.y + 3, b.r, 'rgba(0,0,0,.3)'); k.circle(b.x, b.y, b.r, '#ff5f7a'); k.circle(b.x - 4, b.y - 4, 4, '#ffc2cf'); }
  k.circle(hole[0], hole[1], 11, '#111'); k.rect(hole[0] - 1, hole[1] - 44, 2, 44, '#eee'); c.fillStyle = '#ff5f5f'; c.beginPath(); c.moveTo(hole[0] + 1, hole[1] - 44); c.lineTo(hole[0] + 22, hole[1] - 37); c.lineTo(hole[0] + 1, hole[1] - 30); c.fill();
  if (sunkT <= 0) { k.circle(ball.x + 2, ball.y + 3, ball.r, 'rgba(0,0,0,.3)'); k.circle(ball.x, ball.y, ball.r, '#fff'); }
  if (aiming && k.ptr.down) { const dx = ball.x - k.ptr.x, dy = ball.y - k.ptr.y, p = Math.min(1, Math.hypot(dx, dy) / 150), a = Math.atan2(dy, dx); c.strokeStyle = `hsl(${120 - p * 120} 90% 60%)`; c.lineWidth = 4; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(ball.x, ball.y); c.lineTo(ball.x + Math.cos(a) * p * 140, ball.y + Math.sin(a) * p * 140); c.stroke(); c.setLineDash([]); }
  k.rect(0, 0, 360, 34, 'rgba(0,0,0,.4)'); k.text(`Hoyo ${holeN}/9 · Par 3`, 10, 8, 15); k.text(`Golpes ${strokes} · Total ${total}`, 350, 8, 15, '#f2d15c', 'right');
  if (sunkT > 0) k.text(strokes === 1 ? '¡Hoyo en uno!' : strokes < 3 ? '¡Birdie!' : strokes === 3 ? 'Par' : `+${strokes - 3}`, 180, 300, 34, '#fff', 'center');
});
