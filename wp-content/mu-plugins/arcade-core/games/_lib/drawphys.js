/* Física de dibujo. CFG.mode: 'funnel' (guía la bola a la copa) | 'bridge' (construye un puente para la rueda) */
const M = CFG.mode, land = M === 'bridge';
const W = land ? 640 : 360, H = land ? 360 : 640;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#f4efe4' }), c = k.ctx;
let level, score, segs, userSegs, ink, maxInk, ball, running, cup, stroke, fixed, goalX, done, t;
function build() {
  segs = []; userSegs = []; running = false; stroke = null; done = false; t = 0;
  if (M === 'funnel') { maxInk = 700; const bx = k.rnd(60, 300); ball = { x: bx, y: 60, vx: 0, vy: 0, r: 11, sx: bx }; cup = { x: k.rnd(50, 310), y: 590 };
    for (let i = 0; i < 1 + level; i++) { const x = k.rnd(20, 300), y = k.rnd(160, 500), w = k.rnd(50, 120); segs.push([x, y, x + w, y + k.rnd(-20, 20)]); } }
  else { maxInk = 360 + 20 * Math.max(0, 6 - level); const gap = Math.min(300, 120 + level * 25), lx = 180, rx = lx + gap, ly = 240, ry = 240 + k.ri(-40, 30);
    segs.push([0, ly, lx, ly], [lx, ly, lx, H], [rx, ry, rx, H], [rx, ry, W, ry]); ball = { x: 30, y: ly - 14, vx: 0, vy: 0, r: 13, sx: 30, sy: ly - 14 }; goalX = W - 50; fixed = { ly, ry }; }
  ink = maxInk;
}
function reset() { if (!level || k.st === 'over' && !done) { level = 1; score = 0; } build(); }
reset(); k.show(CFG.title, CFG.help);
function collide(b, s) { const [x1, y1, x2, y2] = s, dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1; const tt = k.clamp(((b.x - x1) * dx + (b.y - y1) * dy) / l2, 0, 1); const px = x1 + dx * tt, py = y1 + dy * tt, ex = b.x - px, ey = b.y - py, d = Math.hypot(ex, ey);
  if (d < b.r && d > 0) { const nx = ex / d, ny = ey / d; b.x = px + nx * b.r; b.y = py + ny * b.r; const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.3 * vn * nx; b.vy -= 1.3 * vn * ny; b.vx *= 0.995; b.vy *= 0.995; } return true; } return false; }
k.run((dt) => {
  if (!k.gate(reset) || done) return;
  const btn = land ? [W - 110, 12, 96, 36] : [W / 2 - 60, H - 44, 120, 34], onBtn = k.ptr.x > btn[0] && k.ptr.x < btn[0] + btn[2] && k.ptr.y > btn[1] && k.ptr.y < btn[1] + btn[3];
  if (k.ptr.hit && onBtn) { if (running) { running = false; ball.x = ball.sx; ball.y = ball.sy || 60; ball.vx = ball.vy = 0; } else running = true; return; }
  if ((k.hit.has('a')) && !running) running = true;
  if (!running) {
    if (k.ptr.hit && !onBtn) stroke = [[k.ptr.x, k.ptr.y]];
    if (k.ptr.down && stroke) { const l = stroke[stroke.length - 1], d = Math.hypot(k.ptr.x - l[0], k.ptr.y - l[1]); if (d > 8 && ink > d) { stroke.push([k.ptr.x, k.ptr.y]); ink -= d; userSegs.push([l[0], l[1], k.ptr.x, k.ptr.y]); } }
    if (k.ptr.up) stroke = null;
    if (k.hit.has('b')) { userSegs = []; ink = maxInk; }
    return;
  }
  t += dt; const steps = 4, h = dt / steps;
  for (let s = 0; s < steps; s++) { ball.vy += 900 * h; if (M === 'bridge') ball.vx += (ball.vx < 170 ? 260 : 0) * h; ball.x += ball.vx * h; ball.y += ball.vy * h; for (const sg of [...segs, ...userSegs]) collide(ball, sg); }
  if (M === 'funnel') { if (Math.abs(ball.x - cup.x) < 30 && ball.y > cup.y - 20 && ball.y < cup.y + 30) win(); if (ball.y > H + 40 || ball.x < -40 || ball.x > W + 40) fail(); }
  else { if (ball.x > goalX && ball.y < fixed.ry) win(); if (ball.y > H + 40) fail(); }
  if (t > 12) fail();
}, () => {
  k.clear(); c.lineCap = 'round';
  c.strokeStyle = '#2b2f55'; c.lineWidth = 8; for (const s of segs) { c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke(); }
  c.strokeStyle = '#e0457b'; c.lineWidth = 6; for (const s of userSegs) { c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke(); }
  if (M === 'funnel') { c.strokeStyle = '#2f9e6a'; c.lineWidth = 6; c.beginPath(); c.moveTo(cup.x - 32, cup.y - 24); c.lineTo(cup.x - 24, cup.y + 30); c.lineTo(cup.x + 24, cup.y + 30); c.lineTo(cup.x + 32, cup.y - 24); c.stroke(); }
  else { k.rect(goalX + 10, fixed.ry - 60, 3, 60, '#2b2f55'); k.rect(goalX + 13, fixed.ry - 60, 22, 14, '#2f9e6a'); }
  k.circle(ball.x, ball.y, ball.r, '#f0a202'); c.strokeStyle = '#8a5a00'; c.lineWidth = 2; c.beginPath(); c.arc(ball.x, ball.y, ball.r * 0.6, ball.x / 12, ball.x / 12 + 2); c.stroke();
  k.text(`Nivel ${level}`, 12, 12, 18, '#2b2f55'); k.text(`Tinta`, 12, 36, 12, '#555'); k.rect(52, 38, 100 * ink / maxInk, 8, '#e0457b');
  const btn = land ? [W - 110, 12, 96, 36] : [W / 2 - 60, H - 44, 120, 34]; k.rrect(...btn, 17, running ? '#555' : '#2f9e6a'); k.text(running ? '↺ Reintentar' : '▶ Soltar', btn[0] + btn[2] / 2, btn[1] + 9, 15, '#fff', 'center');
});
function win() { k.sfx('coin'); done = true; score += Math.round(100 + ink / maxInk * 200) * level; setTimeout(() => { k.st = 'over'; k.show('¡Conseguido!', `Nivel ${level} · ${score} puntos<br>Toca para el siguiente`); level++; }, 300); }
function fail() { running = false; ball.x = ball.sx; ball.y = ball.sy || 60; ball.vx = ball.vy = 0; t = 0; }
