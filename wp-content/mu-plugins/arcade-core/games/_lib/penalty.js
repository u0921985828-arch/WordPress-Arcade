/* Penalty Flick: desliza para chutar, el portero intenta pararla */
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#2e8b3e' }), c = k.ctx;
const GX = 40, GY = 150, GW = 280, GH = 110;
let ball, keeper, goals, shots, misses, state, msg, msgT, level;
function setup() { ball = { x: 180, y: 540, s: 1, t: 0, fly: false }; keeper = { x: 180, tx: 180, dive: 0, dir: 0 }; state = 'aim'; }
function reset() { goals = 0; shots = 0; misses = 0; level = 1; msg = ''; msgT = 0; setup(); }
reset(); k.show(CFG.title, 'Desliza el dedo desde el balón hacia la portería. Más largo = más alto. Fallas 3 y se acaba.');
k.run((dt) => {
  msgT -= dt; if (!k.gate(reset)) return;
  if (state === 'aim' && k.ptr.up && k.ptr.sy > 400) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy; if (dy < -40) { const tx = 180 + dx * 1.3, ty = GY + GH + 40 + dy * 0.45; ball.fly = true; ball.from = [180, 540]; ball.to = [tx, ty]; ball.t = 0; state = 'fly'; shots++;
      const skill = Math.min(0.75, 0.3 + level * 0.06); keeper.dir = Math.random() < skill ? Math.sign(tx - 180) || 1 : k.pick([-1, 1, 0]); keeper.tx = 180 + keeper.dir * k.rnd(60, 120); keeper.dive = 0; } }
  if (state === 'fly') { ball.t += dt * 2.2; keeper.dive = Math.min(1, keeper.dive + dt * 3.2); keeper.x += (keeper.tx - keeper.x) * Math.min(1, dt * 6);
    const e = Math.min(1, ball.t); ball.x = ball.from[0] + (ball.to[0] - ball.from[0]) * e; ball.y = ball.from[1] + (ball.to[1] - ball.from[1]) * e - Math.sin(e * Math.PI) * 30; ball.s = 1 - e * 0.55;
    if (ball.t >= 1) { const inGoal = ball.x > GX + 8 && ball.x < GX + GW - 8 && ball.y > GY + 6 && ball.y < GY + GH; const kx = keeper.x, ky = GY + GH - 40 - Math.abs(keeper.dir) * 10; const saved = inGoal && Math.abs(ball.x - kx) < 40 + keeper.dive * 10 && Math.abs(ball.y - ky) < 55;
      if (inGoal && !saved) { goals++; msg = '¡GOOOL!'; k.sfx('win'); k.confetti(); if (goals % 3 === 0) level++; } else { misses++; msg = saved ? '¡Parada!' : 'Fuera'; navigator.vibrate && navigator.vibrate(60); }
      msgT = 1; state = 'wait'; ball.wait = 1; } }
  if (state === 'wait') { ball.wait -= dt; if (ball.wait <= 0) { if (misses >= 3) return k.lose(CFG.id, goals, 'Fin de la tanda', `${goals} goles de ${shots}`); setup(); } }
}, () => {
  k.clear();
  for (let y = 0; y < 640; y += 40) k.rect(0, y, 360, 20, 'rgba(255,255,255,.04)');
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, GY + GH + 90); c.lineTo(360, GY + GH + 90); c.stroke(); c.strokeRect(GX - 30, GY + GH, GW + 60, 90);
  k.rect(GX - 4, GY - 4, GW + 8, 6, '#fff'); k.rect(GX - 4, GY - 4, 6, GH + 4, '#fff'); k.rect(GX + GW - 2, GY - 4, 6, GH + 4, '#fff');
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; for (let x = GX; x < GX + GW; x += 14) { c.beginPath(); c.moveTo(x, GY); c.lineTo(x, GY + GH); c.stroke(); } for (let y = GY; y < GY + GH; y += 14) { c.beginPath(); c.moveTo(GX, y); c.lineTo(GX + GW, y); c.stroke(); }
  const kx = keeper.x, ky = GY + GH - 40, lean = keeper.dir * keeper.dive; c.save(); c.translate(kx, ky + Math.abs(lean) * 12); c.rotate(lean * 1.1); k.rrect(-14, -30, 28, 50, 8, '#f2d15c'); k.circle(0, -40, 11, '#ffd1a3'); k.rect(-34, -26, 20, 8, '#f2d15c'); k.rect(14, -26, 20, 8, '#f2d15c'); c.restore();
  k.circle(ball.x, ball.y + 6 * ball.s, 13 * ball.s, 'rgba(0,0,0,.3)'); k.circle(ball.x, ball.y, 13 * ball.s, '#fff'); k.circle(ball.x, ball.y, 4 * ball.s, '#222');
  if (state === 'aim' && k.ptr.down && k.ptr.sy > 400) { c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(k.ptr.sx, k.ptr.sy); c.lineTo(k.ptr.x, k.ptr.y); c.stroke(); }
  k.text(`⚽ ${goals}`, 12, 12, 22); k.text('✕'.repeat(misses) + '○'.repeat(Math.max(0, 3 - misses)), 348, 14, 18, '#fff', 'right');
  if (msgT > 0) k.text(msg, 180, 330, 40, '#fff', 'center');
});
