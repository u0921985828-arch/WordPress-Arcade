/* Home Run Derby: toca para batear en el momento justo. 10 eliminaciones (outs) */
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#1d6b3a' }), c = k.ctx;
let ball, swing, outs, hrs, total, msg, msgT, wait, hit, pitchN;
function pitch() { pitchN++; const sp = k.rnd(0.9, 1.5) * (1 + Math.min(0.5, pitchN * 0.02)); const curve = k.rnd(-40, 40) * Math.min(1, pitchN / 5); ball = { t: 0, sp, curve, x: 180, y: 230, s: 0.3, live: true }; swing = 0; hit = null; }
function reset() { outs = 0; hrs = 0; total = 0; msg = ''; msgT = 0; wait = 1; pitchN = 0; ball = null; hit = null; swing = 0; }
reset(); k.show(CFG.title, 'Toca para batear cuando la bola llegue a la zona de strike. Un buen momento = jonrón. 10 fallos y se acaba.');
k.run((dt) => {
  msgT -= dt; if (!k.gate(reset)) return;
  if (swing > 0) swing -= dt;
  if (outs >= 10 && !ball && msgT < 0.2) return k.lose(CFG.id, hrs, 'Fin del Derby', `${hrs} jonrones · ${total} m`);
  if (!ball) { wait -= dt; if (wait <= 0) pitch(); return; }
  if (hit) { hit.t += dt; if (hit.t > 1.6) { ball = null; wait = 0.8; } return; }
  ball.t += dt * ball.sp; const e = ball.t; ball.y = 230 + e * 320; ball.s = 0.3 + e * 0.7; ball.x = 180 + Math.sin(e * 3) * ball.curve * e;
  if ((k.ptr.hit || k.hit.has('a')) && swing <= 0) { swing = 0.25; k.sfx('shoot'); const off = e - 0.93;
    if (Math.abs(off) < 0.12 && Math.abs(ball.x - 180) < 60) { const q = 1 - Math.abs(off) / 0.12; const dist = Math.round(60 + q * 110 + k.rnd(-8, 8)); const ang = k.clamp(off * 6 + (ball.x - 180) / 120, -0.8, 0.8);
      hit = { t: 0, dist, ang }; if (dist >= 110) { hrs++; total += dist; k.sfx('win'); k.confetti(); msg = `¡JONRÓN! ${dist} m`; navigator.vibrate && navigator.vibrate(40); } else { outs++; msg = `Atrapada · ${dist} m`; } msgT = 1.4; }
    else { outs++; msg = off < 0 ? 'Demasiado pronto' : 'Demasiado tarde'; msgT = 1; } }
  if (e > 1.15 && !hit) { if (swing <= 0) { outs++; msg = 'Strike'; msgT = 0.8; } ball = null; wait = 0.8; }
}, () => {
  const g = c.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, '#0e1740'); g.addColorStop(1, '#3a5aa8'); c.fillStyle = g; c.fillRect(0, 0, 360, 260);
  k.rect(0, 200, 360, 60, '#2a2f44'); for (let i = 0; i < 9; i++) k.circle(20 + i * 40, 150 + (i % 2) * 8, 3, '#fffbe0');
  c.fillStyle = '#1d6b3a'; c.fillRect(0, 250, 360, 390); c.fillStyle = '#b88a5a'; c.beginPath(); c.moveTo(180, 240); c.lineTo(330, 600); c.lineTo(30, 600); c.fill(); c.fillStyle = '#1d6b3a'; c.beginPath(); c.moveTo(180, 290); c.lineTo(270, 520); c.lineTo(90, 520); c.fill();
  k.circle(180, 250, 14, '#b88a5a'); k.rrect(170, 222, 20, 30, 6, '#e0e0e0'); k.circle(180, 216, 7, '#ffd1a3');
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(165, 590); c.lineTo(195, 590); c.lineTo(195, 600); c.lineTo(180, 610); c.lineTo(165, 600); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.strokeRect(140, 520, 80, 70);
  if (ball && !hit) { k.circle(ball.x, ball.y + 20 * ball.s, 8 * ball.s, 'rgba(0,0,0,.25)'); k.circle(ball.x, ball.y, 9 * ball.s + 2, '#fff'); }
  if (hit) { const e = Math.min(1, hit.t / 1.4), x = 180 + Math.sin(hit.ang) * hit.dist * 1.6 * e, y = 560 - e * hit.dist * 2.6 - Math.sin(e * Math.PI) * 80; k.circle(x, Math.max(20, y), 7 * (1 - e * 0.6), '#fff'); }
  c.save(); c.translate(215, 575); c.rotate(swing > 0 ? -2.4 + (0.25 - swing) * 14 : -2.4); k.rrect(-4, -80, 9, 80, 4, '#c28a4a'); c.restore(); k.rrect(212, 560, 26, 50, 8, '#3056c9'); k.circle(225, 552, 10, '#ffd1a3');
  k.text(`HR ${hrs}`, 14, 14, 22, '#f2d15c'); k.text(`Outs ${outs}/10`, 346, 16, 16, '#fff', 'right'); if (msgT > 0) k.text(msg, 180, 380, 24, '#fff', 'center');
});
