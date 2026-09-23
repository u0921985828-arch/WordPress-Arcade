/* Lunar Lander */
const k = Kit({ w: 640, h: 360, title: CFG.title, bg: '#05060d' }), c = k.ctx;
let s, ground, padX, fuel, score, level, landed;
function build() {
  ground = []; let y = 300; padX = k.ri(3, 12) * 40;
  for (let x = 0; x <= 640; x += 40) { if (x === padX || x === padX + 40) { ground.push([x, y]); continue; } y = k.clamp(y + k.rnd(-50, 50), 200, 340); ground.push([x, y]); }
  const py = ground.find((g) => g[0] === padX)[1]; ground.forEach((g) => { if (g[0] === padX || g[0] === padX + 40 || g[0] === padX + 80 && false) g[1] = py; });
  s = { x: 60, y: 40, vx: 40, vy: 0, a: 0 }; fuel = Math.max(40, 100 - level * 8); landed = 0;
}
function gy(x) { for (let i = 0; i < ground.length - 1; i++) { const [x1, y1] = ground[i], [x2, y2] = ground[i + 1]; if (x >= x1 && x <= x2) return y1 + (y2 - y1) * (x - x1) / (x2 - x1); } return 360; }
function reset() { score = 0; level = 1; build(); }
reset(); k.show(CFG.title, '← → girar · ↑ o mantener pulsado = motor. Aterriza suave y recto en la plataforma.');
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (landed) { landed -= dt; if (landed <= 0) { level++; build(); } return; }
  if (k.held.has('left')) s.a -= 2.5 * dt; if (k.held.has('right')) s.a += 2.5 * dt;
  if (k.ptr.down) s.a += k.clamp((k.ptr.x - 320) / 320 * 1.2 - s.a, -2.5 * dt, 2.5 * dt);
  s.thr = (k.held.has('up') || k.held.has('a') || k.ptr.down) && fuel > 0;
  if (s.thr) { s.vx += Math.sin(s.a) * 70 * dt; s.vy -= Math.cos(s.a) * 70 * dt; fuel -= 12 * dt; }
  s.vy += 25 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.x = (s.x + 640) % 640;
  if (s.y + 10 >= gy(s.x)) {
    const onPad = s.x > padX + 4 && s.x < padX + 76, ok = onPad && s.vy < 40 && Math.abs(s.vx) < 25 && Math.abs(s.a) < 0.3;
    if (ok) { score += Math.round(100 + fuel * 5) * level; landed = 1.5; k.sfx('win'); k.confetti(); s.y = gy(s.x) - 10; }
    else { k.burst(s.x, s.y, '#ffb347', 50, 240); k.sfx('explode'); k.lose('lunar-lander', score, 'Estrellado', `Nivel ${level}`); }
  }
}, () => {
  k.clear(); c.fillStyle = '#20233d'; c.beginPath(); c.moveTo(0, 360); ground.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(640, 360); c.fill();
  c.strokeStyle = '#8a8fb8'; c.lineWidth = 2; c.beginPath(); ground.forEach(([x, y]) => c.lineTo(x, y)); c.stroke();
  const py = gy(padX + 40); k.rect(padX, py - 2, 80, 4, '#7cf7a0');
  c.save(); c.translate(s.x, s.y); c.rotate(s.a); k.rect(-8, -10, 16, 14, '#e8e6ff'); c.strokeStyle = '#e8e6ff'; c.beginPath(); c.moveTo(-8, 4); c.lineTo(-12, 11); c.moveTo(8, 4); c.lineTo(12, 11); c.stroke();
  if (s.thr) { c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(-5, 5); c.lineTo(0, 16 + Math.random() * 6); c.lineTo(5, 5); c.fill(); } c.restore();
  k.text(`Nv ${level}  Puntos ${score}`, 10, 10, 15); k.text(`Combustible`, 10, 30, 11, '#b8b6e0'); k.rect(90, 32, fuel, 8, fuel > 20 ? '#7cf7a0' : '#ff6b6b');
  const bad = s.vy > 40 || Math.abs(s.vx) > 25; k.text(`↓ ${Math.round(s.vy)}  → ${Math.round(s.vx)}`, 630, 10, 14, bad ? '#ff6b6b' : '#7cf7a0', 'right');
});
