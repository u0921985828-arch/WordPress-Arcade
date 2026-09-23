/* Marble Roll: inclina (sensor, arrastre o flechas) para llevar la canica a la meta sin caer en los agujeros */
const k = Kit({ w: 480, h: 640, title: CFG.title, bg: '#221b36' }), c = k.ctx;
let N, S, OX, OY, g, ball, holes, goal, level, score, t, tilt = { x: 0, y: 0 }, gyro = false;
addEventListener('deviceorientation', (e) => { if (e.gamma === null) return; gyro = true; tilt.x = k.clamp(e.gamma / 25, -1, 1); tilt.y = k.clamp((e.beta - 30) / 25, -1, 1); });
function carve(n) { const m = Array.from({ length: n }, () => Array(n).fill(1)), st = [[1, 1]]; m[1][1] = 0; while (st.length) { const [x, y] = st[st.length - 1]; const nb = k.shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]]).filter(([dx, dy]) => x + dx > 0 && y + dy > 0 && x + dx < n - 1 && y + dy < n - 1 && m[y + dy][x + dx]); if (!nb.length) { st.pop(); continue; } const [dx, dy] = nb[0]; m[y + dy / 2][x + dx / 2] = 0; m[y + dy][x + dx] = 0; st.push([x + dx, y + dy]); }
  for (let i = 0; i < n * 2; i++) { const x = k.ri(1, n - 2), y = k.ri(1, n - 2); if (m[y][x] && ((!m[y - 1][x] && !m[y + 1][x]) || (!m[y][x - 1] && !m[y][x + 1]))) m[y][x] = 0; } return m; }
function build() { N = Math.min(15, 7 + level * 2); S = Math.floor(460 / N); OX = (480 - N * S) / 2; OY = 110; g = carve(N); ball = { x: OX + 1.5 * S, y: OY + 1.5 * S, vx: 0, vy: 0, r: S * 0.3 }; goal = [N - 2, N - 2];
  holes = []; const cells = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (!g[y][x] && x + y > 3 && !(x === N - 2 && y === N - 2)) cells.push([x, y]); k.shuffle(cells).slice(0, Math.min(cells.length / 6, 2 + level * 2)).forEach(([x, y]) => holes.push({ x: OX + x * S + S / 2 + k.rnd(-S * 0.15, S * 0.15), y: OY + y * S + S / 2, r: S * 0.26 })); t = 0; }
function reset() { if (!level || k.st === 'over' && ball && ball.lost) { level = 1; score = 0; } build(); }
reset(); k.show(CFG.title, 'Inclina el móvil (o arrastra / flechas) para rodar la canica hasta la meta dorada. Evita los agujeros.');
k.run((dt) => {
  if (!k.gate(reset)) return; t += dt;
  let ax = gyro ? tilt.x : 0, ay = gyro ? tilt.y : 0;
  if (k.held.has('left')) ax = -1; if (k.held.has('right')) ax = 1; if (k.held.has('up')) ay = -1; if (k.held.has('down')) ay = 1;
  if (k.ptr.down) { ax = k.clamp((k.ptr.x - k.ptr.sx) / 60, -1, 1); ay = k.clamp((k.ptr.y - k.ptr.sy) / 60, -1, 1); }
  const steps = 3; for (let s = 0; s < steps; s++) { const h = dt / steps; ball.vx = (ball.vx + ax * 900 * h) * (1 - 0.8 * h); ball.vy = (ball.vy + ay * 900 * h) * (1 - 0.8 * h);
    ball.x += ball.vx * h; for (const [cx, cy] of [[-1, 0], [1, 0]]) { const tx = Math.floor((ball.x + cx * ball.r - OX) / S), ty = Math.floor((ball.y - OY) / S); if (g[ty] && g[ty][tx]) { ball.x = cx > 0 ? OX + tx * S - ball.r - 0.01 : OX + (tx + 1) * S + ball.r + 0.01; ball.vx *= -0.4; } }
    ball.y += ball.vy * h; for (const [cx, cy] of [[0, -1], [0, 1]]) { const tx = Math.floor((ball.x - OX) / S), ty = Math.floor((ball.y + cy * ball.r - OY) / S); if (g[ty] && g[ty][tx]) { ball.y = cy > 0 ? OY + ty * S - ball.r - 0.01 : OY + (ty + 1) * S + ball.r + 0.01; ball.vy *= -0.4; } } }
  for (const ho of holes) if (Math.hypot(ball.x - ho.x, ball.y - ho.y) < ho.r) { k.sfx('hurt'); ball.lost = true; return k.lose(CFG.id, score, 'La canica cayó', `Nivel ${level}`); }
  if (Math.hypot(ball.x - (OX + goal[0] * S + S / 2), ball.y - (OY + goal[1] * S + S / 2)) < S * 0.3) { score += Math.max(50, 500 - Math.floor(t) * 5) * level; level++; k.st = 'over'; k.show('¡Meta!', `${score} puntos<br>Toca para el nivel ${level}`); }
}, () => {
  k.clear(); k.text(CFG.title, 20, 20, 24, '#f2d15c'); k.text(`Nivel ${level} · ${score}`, 460, 24, 16, '#fff', 'right'); if (!gyro) k.text('Arrastra para inclinar', 20, 56, 13, '#b8b6e0');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = OX + x * S, Y = OY + y * S; if (g[y][x]) { k.rect(X, Y + 4, S, S, '#3d2b1f'); k.rect(X, Y, S, S, '#8a5a3b'); k.rect(X, Y, S, 3, '#b07a55'); } else k.rect(X, Y, S, S, (x + y) % 2 ? '#e7d6b5' : '#dcc9a5'); }
  for (const ho of holes) { k.circle(ho.x, ho.y, ho.r, '#111'); k.circle(ho.x, ho.y + 2, ho.r * 0.7, '#000'); }
  const gx = OX + goal[0] * S + S / 2, gy = OY + goal[1] * S + S / 2; k.circle(gx, gy, S * 0.36, '#f2d15c'); k.circle(gx, gy, S * 0.22, '#c79a12');
  k.circle(ball.x + 3, ball.y + 4, ball.r, 'rgba(0,0,0,.3)'); const grd = c.createRadialGradient(ball.x - ball.r * 0.4, ball.y - ball.r * 0.4, 1, ball.x, ball.y, ball.r); grd.addColorStop(0, '#fff'); grd.addColorStop(0.3, '#5ce1e6'); grd.addColorStop(1, '#1d6f8c'); c.fillStyle = grd; c.beginPath(); c.arc(ball.x, ball.y, ball.r, 0, 6.283); c.fill();
});
