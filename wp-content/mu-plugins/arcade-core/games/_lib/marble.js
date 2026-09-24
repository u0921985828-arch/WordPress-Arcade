/* Marble Roll: inclina (sensor, arrastre o flechas) para llevar la canica a la meta sin caer en los agujeros.
 * Tablero cacheado por nivel (suelo, muros en relieve con sombra, agujeros); colisión círculo-casilla con subpasos. */
const k = Kit({ w: 480, h: 640, title: CFG.title, bg: '#221b36' }), c = k.ctx, OUT = ART.OUT;
let N, S, OX, OY, g, ball, holes, goal, level, score, t, lives, sink, board, bgc, ballImg, trail, tilt = { x: 0, y: 0 }, gyro = false, ax = 0, ay = 0;
addEventListener('deviceorientation', (e) => { if (e.gamma === null) return; gyro = true; tilt.x = k.clamp(e.gamma / 25, -1, 1); tilt.y = k.clamp((e.beta - 30) / 25, -1, 1); });
function carve(n) { const m = Array.from({ length: n }, () => Array(n).fill(1)), st = [[1, 1]]; m[1][1] = 0; while (st.length) { const [x, y] = st[st.length - 1]; const nb = k.shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]]).filter(([dx, dy]) => x + dx > 0 && y + dy > 0 && x + dx < n - 1 && y + dy < n - 1 && m[y + dy][x + dx]); if (!nb.length) { st.pop(); continue; } const [dx, dy] = nb[0]; m[y + dy / 2][x + dx / 2] = 0; m[y + dy][x + dx] = 0; st.push([x + dx, y + dy]); }
  for (let i = 0; i < n * 2; i++) { const x = k.ri(1, n - 2), y = k.ri(1, n - 2); if (m[y][x] && ((!m[y - 1][x] && !m[y + 1][x]) || (!m[y][x - 1] && !m[y][x + 1]))) m[y][x] = 0; } return m; }
/* Los agujeros no bloquean el camino: solo se ponen en casillas con alternativa (comprobado por BFS) */
function reach(block) { const seen = new Set(['1,1']), q = [[1, 1]]; while (q.length) { const [x, y] = q.shift(); if (x === N - 2 && y === N - 2) return true; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, key = nx + ',' + ny; if (!g[ny][nx] && !block.has(key) && !seen.has(key)) { seen.add(key); q.push([nx, ny]); } } } return false; }
/* Dificultad por nivel: laberinto 7 → 15 casillas en 8 niveles (antes 9 → 15 en 4), agujeros 1 + nivel (antes 2 + 2·nivel)
 * y aceleración de la canica 680 → 900 (más controlable al principio). */
function build() { N = Math.min(15, 7 + 2 * Math.floor(level / 2)); S = Math.floor(440 / N); OX = (480 - N * S) / 2; OY = 128; g = carve(N); goal = [N - 2, N - 2];
  holes = []; const block = new Set(), cells = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (!g[y][x] && x + y > 3 && !(x === N - 2 && y === N - 2)) cells.push([x, y]);
  const want = Math.min(cells.length / 5, 1 + Math.floor(level * 0.8)); // 1.23: más fácil (antes 1+nivel)
  for (const [x, y] of k.shuffle(cells)) { if (holes.length >= want) break; block.add(x + ',' + y); if (!reach(block)) { block.delete(x + ',' + y); continue; }
    holes.push({ x: OX + x * S + S / 2 + k.rnd(-S * 0.12, S * 0.12), y: OY + y * S + S / 2 + k.rnd(-S * 0.12, S * 0.12), r: S * 0.27 }); }
  t = 0; bake(); spawnBall(); }
function spawnBall() { ball = { x: OX + 1.5 * S, y: OY + 1.5 * S, vx: 0, vy: 0, r: S * 0.3, rot: 0, pop: 0.4 }; sink = null; trail = []; }
function reset() { if (!level || (k.st === 'over' && lives <= 0)) { level = 1; score = 0; lives = 4; } build(); }
/* ---------- Cachés ---------- */
const mk = (w, h, f) => { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const q = cv.getContext('2d'); q.scale(2, 2); q.lineJoin = 'round'; f(q); return cv; };
bgc = mk(480, 640, (q) => { const gr = q.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, '#2c2150'); gr.addColorStop(1, '#171230'); q.fillStyle = gr; q.fillRect(0, 0, 480, 640);
  q.strokeStyle = 'rgba(255,255,255,.04)'; q.lineWidth = 14; for (let i = -640; i < 480; i += 40) { q.beginPath(); q.moveTo(i, 640); q.lineTo(i + 640, 0); q.stroke(); } });
function bake() { const BW = N * S, P = 14, WH = Math.max(5, S * 0.24);
  board = mk(BW + P * 2, BW + P * 2 + 10, (q) => { const o = P;
    q.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(q, 6, 12, BW + P * 2 - 4, BW + P * 2 - 4, 16); q.fill();
    ART.rr(q, 0, 0, BW + P * 2, BW + P * 2, 16); ART.fillOut(q, '#6b4329', 3); q.fillStyle = '#8a5a3b'; ART.rr(q, 4, 4, BW + P * 2 - 8, BW + P * 2 - 8, 13); q.fill(); q.fillStyle = 'rgba(255,255,255,.18)'; q.fillRect(14, 6, BW + P * 2 - 28, 3);
    // suelo a cuadros
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { q.fillStyle = (x + y) % 2 ? '#ecdcbc' : '#e2cfa9'; q.fillRect(o + x * S, o + y * S, S, S); }
    q.strokeStyle = 'rgba(120,80,40,.12)'; q.lineWidth = 1; for (let y = 0; y < N; y++) { q.beginPath(); q.moveTo(o, o + y * S + S / 2); q.lineTo(o + BW, o + y * S + S / 2); q.stroke(); }
    // agujeros
    for (const ho of holes) { const x = ho.x - OX + o, y = ho.y - OY + o; q.fillStyle = '#b89a6c'; q.beginPath(); q.arc(x, y, ho.r + 3, 0, 6.283); q.fill(); const hg = q.createRadialGradient(x, y + ho.r * 0.3, 1, x, y, ho.r); hg.addColorStop(0, '#000'); hg.addColorStop(0.7, '#120b1e'); hg.addColorStop(1, '#3a2a3e'); q.fillStyle = hg; q.beginPath(); q.arc(x, y, ho.r, 0, 6.283); q.fill(); q.strokeStyle = OUT; q.lineWidth = 2; q.stroke(); }
    // meta
    const gx = o + goal[0] * S + S / 2, gy = o + goal[1] * S + S / 2; q.beginPath(); q.arc(gx, gy, S * 0.4, 0, 6.283); ART.fillOut(q, '#ffc928', 2.5); q.beginPath(); q.arc(gx, gy, S * 0.26, 0, 6.283); ART.fillOut(q, '#2a1a0a', 2); q.fillStyle = 'rgba(255,255,255,.5)'; q.beginPath(); q.arc(gx - S * 0.18, gy - S * 0.2, S * 0.07, 0, 6.283); q.fill();
    // sombras de los muros
    q.fillStyle = 'rgba(60,30,10,.28)'; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x]) q.fillRect(o + x * S + WH * 0.6, o + y * S + WH * 0.8, S, S);
    // muros en relieve: cara frontal + tapa
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!g[y][x]) continue; const X = o + x * S, Y = o + y * S - WH;
      if (!(g[y + 1] && g[y + 1][x])) { q.fillStyle = '#7a4a2c'; q.fillRect(X, Y + S, S, WH); } q.fillStyle = (x + y) % 2 ? '#c08a5c' : '#b98457'; q.fillRect(X, Y, S, S); }
    q.strokeStyle = OUT; q.lineWidth = 2; q.beginPath(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!g[y][x]) continue; const X = o + x * S, Y = o + y * S - WH, open = (dx, dy) => !(g[y + dy] && g[y + dy][x + dx]);
      if (open(0, -1)) { q.moveTo(X, Y); q.lineTo(X + S, Y); } if (open(0, 1)) { q.moveTo(X, Y + S + WH); q.lineTo(X + S, Y + S + WH); q.moveTo(X, Y + S); q.lineTo(X + S, Y + S); }
      if (open(-1, 0)) { q.moveTo(X, Y); q.lineTo(X, Y + S + (open(0, 1) ? WH : 0)); } if (open(1, 0)) { q.moveTo(X + S, Y); q.lineTo(X + S, Y + S + (open(0, 1) ? WH : 0)); } } q.stroke();
    q.fillStyle = 'rgba(255,255,255,.22)'; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] && !(g[y - 1] && g[y - 1][x])) q.fillRect(o + x * S + 1, o + y * S - WH + 2, S - 2, 2);
  });
  const r = S * 0.3; ballImg = mk(r * 2 + 4, r * 2 + 4, (q) => { const cx = r + 2; const bg = q.createRadialGradient(cx - r * 0.35, cx - r * 0.4, r * 0.1, cx, cx, r); bg.addColorStop(0, '#e8fdff'); bg.addColorStop(0.35, '#5ce1e6'); bg.addColorStop(1, '#1b5f8a'); q.fillStyle = bg; q.beginPath(); q.arc(cx, cx, r, 0, 6.283); q.fill(); q.lineWidth = 2; q.strokeStyle = OUT; q.stroke(); });
}
reset(); k.show(CFG.title, 'Inclina el móvil (o arrastra / flechas) para rodar la canica hasta la meta dorada. Evita los agujeros: tienes 3 canicas.');
const solid = (tx, ty) => !g[ty] || g[ty][tx] === undefined || g[ty][tx];
function collide() { const tx0 = Math.floor((ball.x - ball.r - OX) / S), tx1 = Math.floor((ball.x + ball.r - OX) / S), ty0 = Math.floor((ball.y - ball.r - OY) / S), ty1 = Math.floor((ball.y + ball.r - OY) / S);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { if (!solid(tx, ty)) continue; const X = OX + tx * S, Y = OY + ty * S, cx = k.clamp(ball.x, X, X + S), cy = k.clamp(ball.y, Y, Y + S); let dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy);
    if (d >= ball.r) continue; if (d < 1e-6) { dx = ball.vx ? -Math.sign(ball.vx) : 0; dy = ball.vy ? -Math.sign(ball.vy) : 1; d = Math.hypot(dx, dy); ball.x += dx / d * ball.r; ball.y += dy / d * ball.r; continue; }
    const nx = dx / d, ny = dy / d; ball.x += nx * (ball.r - d); ball.y += ny * (ball.r - d); const vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { if (vn < -260) { k.sfx('click'); } ball.vx -= 1.4 * vn * nx; ball.vy -= 1.4 * vn * ny; } } }
k.run((dt) => {
  if (!k.gate(reset)) return; t += dt; ball.pop = Math.max(0, ball.pop - dt);
  let tx = gyro ? tilt.x : 0, ty = gyro ? tilt.y : 0;
  if (k.held.has('left')) tx = -1; if (k.held.has('right')) tx = 1; if (k.held.has('up')) ty = -1; if (k.held.has('down')) ty = 1;
  if (k.ptr.down) { tx = k.clamp((k.ptr.x - k.ptr.sx) / 60, -1, 1); ty = k.clamp((k.ptr.y - k.ptr.sy) / 60, -1, 1); }
  ax += (tx - ax) * Math.min(1, dt * 10); ay += (ty - ay) * Math.min(1, dt * 10);
  if (sink) { sink.t += dt; ball.x += (sink.x - ball.x) * Math.min(1, dt * 10); ball.y += (sink.y - ball.y) * Math.min(1, dt * 10);
    if (sink.t > 0.6) { if (sink.goal) { score += Math.max(50, 500 - Math.floor(t) * 5) * level; level++; k.st = 'over'; k.sfx('win'); k.confetti(); k.show('¡Meta!', `${score} puntos<br>Toca para el nivel ${level}`); }
      else { lives--; if (lives <= 0) return k.lose(CFG.id, score, 'La canica cayó', `Nivel ${level}`); spawnBall(); } } return; }
  const steps = Math.max(3, Math.ceil(Math.hypot(ball.vx, ball.vy) * dt / (ball.r * 0.4)));
  for (let s = 0; s < steps; s++) { const h = dt / steps; const A = 600 + 170 * Math.min(1, (level - 1) / 10); ball.vx = (ball.vx + ax * A * h) * (1 - 0.8 * h); ball.vy = (ball.vy + ay * A * h) * (1 - 0.8 * h); ball.x += ball.vx * h; ball.y += ball.vy * h; collide(); }
  const sp = Math.hypot(ball.vx, ball.vy); ball.rot += sp * dt / ball.r; if (sp > 250 && Math.random() < 0.5) trail.push({ x: ball.x, y: ball.y, l: 0.35 }); for (const q of trail) q.l -= dt; trail = trail.filter((q) => q.l > 0);
  for (const ho of holes) if (Math.hypot(ball.x - ho.x, ball.y - ho.y) < ho.r * 0.85) { sink = { t: 0, x: ho.x, y: ho.y }; k.sfx('hurt'); k.shake(5); navigator.vibrate && navigator.vibrate(60); return; }
  const gx = OX + goal[0] * S + S / 2, gy = OY + goal[1] * S + S / 2;
  if (Math.hypot(ball.x - gx, ball.y - gy) < S * 0.3) { sink = { t: 0, x: gx, y: gy, goal: true }; k.sfx('coin'); k.burst(gx, gy, '#ffc928', 20, 180); }
}, () => {
  c.drawImage(bgc, 0, 0, 480, 640);
  const P = 14, BW = N * S, cx = OX + BW / 2, cy = OY + BW / 2;
  c.save(); c.translate(cx + ax * 3, cy + ay * 3); c.scale(1 - Math.abs(ax) * 0.015, 1 - Math.abs(ay) * 0.015); c.translate(-cx, -cy);
  c.drawImage(board, OX - P, OY - P, BW + P * 2, BW + P * 2 + 10);
  // luz según inclinación
  if (Math.abs(ax) + Math.abs(ay) > 0.05) { const lg = c.createLinearGradient(cx - ax * BW / 2, cy - ay * BW / 2, cx + ax * BW / 2, cy + ay * BW / 2); lg.addColorStop(0, 'rgba(255,255,255,.12)'); lg.addColorStop(1, 'rgba(0,0,0,.12)'); c.fillStyle = lg; c.fillRect(OX, OY, BW, BW); }
  // brillo de la meta
  const gx = OX + goal[0] * S + S / 2, gy = OY + goal[1] * S + S / 2, pu = 0.5 + 0.5 * Math.sin(t * 4); c.strokeStyle = `rgba(255,220,90,${0.35 + pu * 0.4})`; c.lineWidth = 3; c.beginPath(); c.arc(gx, gy, S * (0.45 + pu * 0.12), 0, 6.283); c.stroke();
  for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; c.fillStyle = '#fff6c2'; c.fillRect(gx + Math.cos(a) * S * 0.5 - 1.5, gy + Math.sin(a) * S * 0.5 - 1.5, 3, 3); }
  // estela y canica
  for (const q of trail) { c.globalAlpha = q.l * 1.2; c.fillStyle = '#b8fbff'; c.beginPath(); c.arc(q.x, q.y, ball.r * q.l * 1.6, 0, 6.283); c.fill(); } c.globalAlpha = 1;
  const sc = sink ? Math.max(0, 1 - sink.t / 0.6) : 1 + Math.sin(ball.pop * 20) * ball.pop * 0.3, r = ball.r * sc;
  if (r > 0.5) { if (!sink) { c.fillStyle = 'rgba(40,20,10,.3)'; c.beginPath(); c.ellipse(ball.x + 3 - ax * 2, ball.y + 5 - ay * 2, r, r * 0.8, 0, 0, 6.283); c.fill(); }
    c.drawImage(ballImg, ball.x - (ball.r + 2) * sc, ball.y - (ball.r + 2) * sc, (ball.r * 2 + 4) * sc, (ball.r * 2 + 4) * sc);
    // veta interior que gira con la rodadura
    const a = Math.atan2(ball.vy, ball.vx), ph = Math.sin(ball.rot); c.save(); c.beginPath(); c.arc(ball.x, ball.y, r * 0.92, 0, 6.283); c.clip(); c.translate(ball.x, ball.y); c.rotate(a);
    c.fillStyle = 'rgba(255,95,162,.75)'; c.beginPath(); c.ellipse(ph * r * 0.7, 0, r * 0.22 * Math.abs(Math.cos(ball.rot)) + 1, r * 0.9, 0, 0, 6.283); c.fill(); c.restore();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(ball.x - r * 0.35, ball.y - r * 0.4, r * 0.22, r * 0.14, -0.6, 0, 6.283); c.fill(); }
  c.restore();
  // HUD
  label(`Nivel ${level}`, 16, 14, 24, '#f2d15c'); label(`${score}`, 464, 14, 24, '#fff', 'right');
  for (let i = 0; i < 4; i++) { const x = 26 + i * 24, y = 62; c.globalAlpha = i < lives ? 1 : 0.25; c.drawImage(ballImg, x - 9, y - 9, 18, 18); } c.globalAlpha = 1;
  label(`${Math.floor(t)} s`, 464, 50, 16, '#b8b6e0', 'right');
  if (k.ptr.down && k.st === 'play') { const r0 = 44; c.globalAlpha = 0.55; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(k.ptr.sx, k.ptr.sy, r0, 0, 6.283); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(k.ptr.sx + ax * r0 * 0.8, k.ptr.sy + ay * r0 * 0.8, 16, 0, 6.283); c.fill(); c.globalAlpha = 1; }
  else if (!gyro && t < 4 && k.st === 'play') { c.globalAlpha = Math.min(1, 4 - t); label('Arrastra para inclinar', 240, 600, 18, '#fff', 'center'); c.globalAlpha = 1; }
});
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
