/* Pool Break: mete todas las bolas. Arrastra desde la bola blanca hacia atrás para tirar. */
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#2a1a10' }), c = k.ctx;
const TX = 30, TY = 60, TW = 300, TH = 540, BR = 10, POCKETS = [[TX, TY], [TX + TW, TY], [TX, TY + TH / 2], [TX + TW, TY + TH / 2], [TX, TY + TH], [TX + TW, TY + TH]];
const COL = ['#fff', '#f2d15c', '#2b50c9', '#d23a4a', '#6a3fb5', '#f28b2d', '#1e8a4c', '#8a2432', '#111', '#f2d15c', '#2b50c9', '#d23a4a', '#6a3fb5', '#f28b2d', '#1e8a4c', '#8a2432'];
let balls, shots, potted, aiming, msg, msgT, rack;
function reset() { rack = 0; shots = 0; potted = 0; setup(); }
function setup() { balls = [{ n: 0, x: 180, y: 480, vx: 0, vy: 0 }]; let n = 1; const order = k.shuffle([...Array(15).keys()].map((i) => i + 1)); for (let r = 0; r < 5; r++) for (let i = 0; i <= r; i++) balls.push({ n: order[n++ - 1], x: 180 + (i - r / 2) * (BR * 2 + 0.5), y: 200 - r * (BR * 1.75), vx: 0, vy: 0 }); msg = ''; msgT = 0; }
reset(); k.show(CFG.title, 'Arrastra desde la bola blanca hacia atrás y suelta. Mete las 15 bolas con el menor número de tiros. Meter la blanca = +2 tiros.');
const moving = () => balls.some((b) => Math.hypot(b.vx, b.vy) > 3);
k.run((dt) => {
  msgT -= dt; if (!k.gate(reset)) return;
  const cue = balls.find((b) => b.n === 0);
  if (!moving()) { balls.forEach((b) => { b.vx = b.vy = 0; });
    if (!cue) { balls.unshift({ n: 0, x: 180, y: 480, vx: 0, vy: 0 }); return; }
    if (k.ptr.hit) aiming = true; if (aiming && k.ptr.up) { aiming = false; const dx = cue.x - k.ptr.x, dy = cue.y - k.ptr.y, p = Math.min(1, Math.hypot(dx, dy) / 180); if (p > 0.04) { const a = Math.atan2(dy, dx); cue.vx = Math.cos(a) * p * 1500; cue.vy = Math.sin(a) * p * 1500; shots++; k.sfx('hit'); } } return; }
  const steps = 8, h = dt / steps;
  for (let s = 0; s < steps; s++) { for (const b of balls) { b.x += b.vx * h; b.y += b.vy * h; const f = 1 - 0.9 * h; b.vx *= f; b.vy *= f;
      if (b.x < TX + BR) { b.x = TX + BR; b.vx = Math.abs(b.vx) * 0.85; } if (b.x > TX + TW - BR) { b.x = TX + TW - BR; b.vx = -Math.abs(b.vx) * 0.85; } if (b.y < TY + BR) { b.y = TY + BR; b.vy = Math.abs(b.vy) * 0.85; } if (b.y > TY + TH - BR) { b.y = TY + TH - BR; b.vy = -Math.abs(b.vy) * 0.85; }
      for (const [px, py] of POCKETS) if (Math.hypot(b.x - px, b.y - py) < 17) b.in = true; }
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) { const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < BR * 2 && d > 0) { const nx = dx / d, ny = dy / d, ov = (BR * 2 - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov; const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rv > 0) { a.vx -= rv * nx; a.vy -= rv * ny; b.vx += rv * nx; b.vy += rv * ny; } } }
    for (const b of balls) if (b.in) { if (b.n === 0) { shots += 2; msg = 'Falta: blanca dentro (+2)'; msgT = 1.2; } else { potted++; k.sfx('coin'); msg = `Bola ${b.n}`; msgT = 0.8; } }
    balls = balls.filter((b) => !b.in); }
  if (!balls.some((b) => b.n > 0)) { rack++; k.st = 'over'; k.best(CFG.id, Math.max(1, 200 - shots * 5)); k.show('¡Mesa limpia!', `${shots} tiros<br>Toca para otra partida`); }
}, () => {
  k.clear(); k.rrect(TX - 18, TY - 18, TW + 36, TH + 36, 16, '#5a3417'); k.rect(TX, TY, TW, TH, '#1d7a46'); c.strokeStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.moveTo(TX, 480); c.lineTo(TX + TW, 480); c.stroke();
  for (const [px, py] of POCKETS) k.circle(px, py, 15, '#0a0a0a');
  const cue = balls.find((b) => b.n === 0);
  if (cue && aiming && k.ptr.down && !moving()) { const dx = cue.x - k.ptr.x, dy = cue.y - k.ptr.y, a = Math.atan2(dy, dx), p = Math.min(1, Math.hypot(dx, dy) / 180); c.strokeStyle = 'rgba(255,255,255,.5)'; c.setLineDash([5, 6]); c.lineWidth = 2; c.beginPath(); c.moveTo(cue.x, cue.y); c.lineTo(cue.x + Math.cos(a) * 400, cue.y + Math.sin(a) * 400); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#d9b38c'; c.lineWidth = 6; c.beginPath(); c.moveTo(cue.x - Math.cos(a) * (16 + p * 60), cue.y - Math.sin(a) * (16 + p * 60)); c.lineTo(cue.x - Math.cos(a) * (230 + p * 60), cue.y - Math.sin(a) * (230 + p * 60)); c.stroke(); }
  for (const b of balls) { k.circle(b.x + 2, b.y + 2, BR, 'rgba(0,0,0,.35)'); k.circle(b.x, b.y, BR, COL[b.n]); if (b.n > 8) { c.save(); c.beginPath(); c.arc(b.x, b.y, BR, 0, 6.283); c.clip(); k.rect(b.x - BR, b.y - BR, BR * 2, 5, '#fff'); k.rect(b.x - BR, b.y + BR - 5, BR * 2, 5, '#fff'); c.restore(); } if (b.n) { k.circle(b.x, b.y, 4.5, '#fff'); k.text(b.n, b.x, b.y - 4, 7, '#111', 'center'); } }
  k.text(`Tiros ${shots}`, 14, 16, 18); k.text(`Metidas ${potted % 15 || (potted && !balls.some((b) => b.n) ? 15 : 0)}/15`, 346, 16, 18, '#f2d15c', 'right'); if (msgT > 0) k.text(msg, 180, 320, 20, '#fff', 'center');
});
