/* Hoop Arc: arrastra hacia atrás y suelta para lanzar a canasta (60 s) */
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#241a3a' }), c = k.ctx;
let ball, hoop, score, time, streak, aim, msg, msgT;
function newBall() { ball = { x: k.rnd(60, 200), y: k.rnd(470, 560), vx: 0, vy: 0, fly: false, scored: false, prevY: 0 }; ball.sx = ball.x; ball.sy = ball.y; }
function reset() { hoop = { x: 280, y: 220, vx: 0 }; score = 0; time = 60; streak = 0; msg = ''; msgT = 0; newBall(); }
reset(); k.show(CFG.title, 'Arrastra desde el balón hacia atrás y suelta para lanzar. Encesta seguido para multiplicar puntos. 60 segundos.');
const RIM = 26;
k.run((dt) => {
  msgT -= dt; if (!k.gate(reset)) return; time -= dt; if (time <= 0) return k.lose(CFG.id, score, '¡Tiempo!');
  if (streak >= 3) { hoop.x += hoop.vx * dt; if (!hoop.vx) hoop.vx = 60; if (hoop.x > 310 || hoop.x < 200) hoop.vx *= -1; }
  if (!ball.fly) { if (k.ptr.hit && Math.hypot(k.ptr.x - ball.x, k.ptr.y - ball.y) < 70) aim = true;
    if (aim && k.ptr.up) { aim = false; const dx = ball.x - k.ptr.x, dy = ball.y - k.ptr.y, p = Math.min(1, Math.hypot(dx, dy) / 160); if (p > 0.1) { const a = Math.atan2(dy, dx); ball.vx = Math.cos(a) * p * 950; ball.vy = Math.sin(a) * p * 950; ball.fly = true; } } return; }
  const h = dt / 4; for (let s = 0; s < 4; s++) { ball.prevY = ball.y; ball.vy += 1300 * h; ball.x += ball.vx * h; ball.y += ball.vy * h;
    for (const rx of [hoop.x - RIM, hoop.x + RIM]) { const d = Math.hypot(ball.x - rx, ball.y - hoop.y); if (d < 13 + 3) { const nx = (ball.x - rx) / d, ny = (ball.y - hoop.y) / d, vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { ball.vx -= 1.6 * vn * nx; ball.vy -= 1.6 * vn * ny; } ball.x = rx + nx * 16; ball.y = hoop.y + ny * 16; } }
    if (ball.x > hoop.x + RIM + 10 && ball.x < hoop.x + RIM + 22 && ball.y > hoop.y - 90 && ball.y < hoop.y + 10) { ball.vx = -Math.abs(ball.vx) * 0.6; }
    if (!ball.scored && ball.prevY < hoop.y && ball.y >= hoop.y && Math.abs(ball.x - hoop.x) < RIM - 8 && ball.vy > 0) { ball.scored = true; streak++; k.burst(hoop.x, hoop.y + 20, '#f2d15c', 16); k.sfx('coin'); const pts = 2 * Math.min(5, streak) + (Math.hypot(ball.sx - hoop.x, ball.sy - hoop.y) > 350 ? 1 : 0); score += pts; msg = streak > 1 ? `+${pts} ¡Racha x${streak}!` : `+${pts}`; msgT = 1; navigator.vibrate && navigator.vibrate(20); } }
  if (ball.y > 700 || ball.x < -40 || ball.x > 400) { if (!ball.scored) { streak = 0; msg = 'Fallo'; msgT = 0.6; } newBall(); }
}, () => {
  k.clear(); k.rect(0, 580, 360, 60, '#8a5a3b'); for (let x = 0; x < 360; x += 40) k.rect(x, 580, 2, 60, '#6f4830');
  k.rect(hoop.x + RIM + 10, hoop.y - 90, 12, 100, '#e8e8f0'); c.strokeStyle = '#ff5f5f'; c.lineWidth = 2; c.strokeRect(hoop.x + RIM + 12, hoop.y - 50, 8, 30); k.rect(hoop.x + RIM + 22, hoop.y - 30, 30, 8, '#888');
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(hoop.x + i * 8, hoop.y); c.lineTo(hoop.x + i * 5, hoop.y + 40); c.stroke(); }
  const drawBall = () => { k.circle(ball.x, ball.y, 13, '#f28b2d'); c.strokeStyle = '#5a2a0a'; c.lineWidth = 1.5; c.beginPath(); c.arc(ball.x, ball.y, 13, 0, 6.283); c.moveTo(ball.x - 13, ball.y); c.lineTo(ball.x + 13, ball.y); c.stroke(); };
  if (ball.y < hoop.y) drawBall(); c.strokeStyle = '#ff5f2d'; c.lineWidth = 4; c.beginPath(); c.moveTo(hoop.x - RIM, hoop.y); c.lineTo(hoop.x + RIM, hoop.y); c.stroke(); if (ball.y >= hoop.y) drawBall();
  if (aim && k.ptr.down && !ball.fly) { const dx = ball.x - k.ptr.x, dy = ball.y - k.ptr.y, p = Math.min(1, Math.hypot(dx, dy) / 160), a = Math.atan2(dy, dx); let x = ball.x, y = ball.y, vx = Math.cos(a) * p * 950, vy = Math.sin(a) * p * 950; c.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 14; i++) { for (let j = 0; j < 3; j++) { vy += 1300 * 0.012; x += vx * 0.012; y += vy * 0.012; } c.beginPath(); c.arc(x, y, 3, 0, 6.283); c.fill(); } }
  k.text(`${score}`, 14, 12, 28); k.text(`${Math.ceil(time)} s`, 346, 16, 20, time < 10 ? '#ff6b6b' : '#fff', 'right'); if (msgT > 0) k.text(msg, 180, 120, 26, '#f2d15c', 'center');
});
