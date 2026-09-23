/* Paddle en vertical. CFG.mode: 'hockey' (Air Hockey, mazo libre) | 'pong' (Ping Pong Reflex) */
const M = CFG.mode, k = Kit({ w: 360, h: 640, title: CFG.title, bg: M === 'hockey' ? '#dfeef7' : '#0f2a4a' }), c = k.ctx;
const GOAL = 110, TO = 7;
let me, ai, puck, sMe, sAi, serveT, rally, best;
function serve(dir) { puck = { x: 180, y: 320, vx: k.rnd(-120, 120), vy: dir * (M === 'hockey' ? 60 : 300), r: M === 'hockey' ? 16 : 9 }; serveT = 0.8; rally = 0; }
function reset() { me = { x: 180, y: 560, px: 180, py: 560, r: M === 'hockey' ? 28 : 0, w: 80 }; ai = { x: 180, y: 80, px: 180, py: 80, r: M === 'hockey' ? 28 : 0, w: 80 }; sMe = 0; sAi = 0; serve(1); }
reset(); k.show(CFG.title, M === 'hockey' ? 'Mueve tu mazo con el dedo y marca en la portería de arriba. Gana quien llegue a 7.' : 'Mueve la pala con el dedo. Golpea en movimiento para dar efecto. Partido a 11 puntos con 2 de diferencia.');
function goal(forMe) { if (forMe) sMe++; else sAi++; k.burst(puck.x, k.clamp(puck.y, 10, 630), forMe ? '#7cf7a0' : '#ff5f5f', 24); k.sfx(forMe ? 'coin' : 'hurt'); navigator.vibrate && navigator.vibrate(forMe ? 30 : 90); const TGT = M === 'pong' ? 11 : TO, fin = (sMe >= TGT || sAi >= TGT) && (M !== 'pong' || Math.abs(sMe - sAi) >= 2);
  if (fin) { k.st = 'over'; k.best(CFG.id, sMe > sAi ? sMe - sAi : 0); k.show(sMe > sAi ? '¡Ganaste!' : 'Perdiste', `${sMe} – ${sAi}<br>Toca para la revancha`); return; } serve(forMe ? -1 : 1); }
k.run((dt) => {
  if (!k.gate(reset)) return;
  const lvl = 0.55 + (sMe + sAi) * 0.03;
  me.px = me.x; me.py = me.y; ai.px = ai.x; ai.py = ai.y;
  if (k.ptr.down) { me.x += (k.ptr.x - me.x) * Math.min(1, dt * 25); if (M === 'hockey') me.y += (k.ptr.y - me.y) * Math.min(1, dt * 25); }
  if (k.held.has('left')) me.x -= 400 * dt; if (k.held.has('right')) me.x += 400 * dt; if (M === 'hockey') { if (k.held.has('up')) me.y -= 400 * dt; if (k.held.has('down')) me.y += 400 * dt; }
  me.x = k.clamp(me.x, M === 'hockey' ? me.r : 40, 360 - (M === 'hockey' ? me.r : 40)); me.y = M === 'hockey' ? k.clamp(me.y, 340, 620 - me.r) : 580;
  // IA
  const tx = puck.vy < 0 || M === 'pong' ? puck.x : 180, ty = M === 'hockey' ? (puck.y < 320 && puck.vy < 80 ? puck.y - 20 : 90) : 60;
  const sp = (M === 'hockey' ? 330 : 280) * lvl; ai.x += k.clamp(tx - ai.x, -sp * dt, sp * dt); ai.y += k.clamp(ty - ai.y, -sp * dt, sp * dt);
  ai.x = k.clamp(ai.x, M === 'hockey' ? ai.r : 40, 360 - (M === 'hockey' ? ai.r : 40)); ai.y = M === 'hockey' ? k.clamp(ai.y, 20 + ai.r, 300) : 60;
  if (serveT > 0) { serveT -= dt; return; }
  const steps = 4, h = dt / steps;
  for (let s = 0; s < steps; s++) { puck.x += puck.vx * h; puck.y += puck.vy * h; if (M === 'hockey') { puck.vx *= 1 - 0.25 * h; puck.vy *= 1 - 0.25 * h; }
    if (puck.x < puck.r || puck.x > 360 - puck.r) { puck.vx *= -1; puck.x = k.clamp(puck.x, puck.r, 360 - puck.r); }
    if (M === 'hockey') { const inGoal = Math.abs(puck.x - 180) < GOAL / 2;
      if (puck.y < puck.r + 10) { if (inGoal) return goal(true); puck.vy = Math.abs(puck.vy); } if (puck.y > 630 - puck.r) { if (inGoal) return goal(false); puck.vy = -Math.abs(puck.vy); }
      for (const m of [me, ai]) { const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy); if (d < m.r + puck.r && d > 0) { const nx = dx / d, ny = dy / d; puck.x = m.x + nx * (m.r + puck.r); puck.y = m.y + ny * (m.r + puck.r); const mvx = (m.x - m.px) / dt, mvy = (m.y - m.py) / dt; const rv = (puck.vx - mvx) * nx + (puck.vy - mvy) * ny; if (rv < 0) { puck.vx -= 1.9 * rv * nx; puck.vy -= 1.9 * rv * ny; k.sfx('click'); } const spd = Math.hypot(puck.vx, puck.vy); if (spd > 900) { puck.vx *= 900 / spd; puck.vy *= 900 / spd; } } } }
    else { for (const [p, dir] of [[me, -1], [ai, 1]]) { const py = p === me ? 580 : 60; if (Math.sign(puck.vy) === -dir && Math.abs(puck.y - py) < 10 && Math.abs(puck.x - p.x) < p.w / 2 + puck.r) { rally++; k.sfx('click'); const spd = Math.min(820, Math.hypot(puck.vx, puck.vy) * 1.05); const off = (puck.x - p.x) / (p.w / 2), spin = (p.x - p.px) / dt * 0.25; puck.vx = off * spd * 0.7 + spin; puck.vy = dir * Math.sqrt(Math.max(1, spd * spd - puck.vx * puck.vx * 0.5)); puck.y = py + dir * 11; } }
      if (puck.y < 0) return goal(true); if (puck.y > 640) return goal(false); } }
}, () => {
  k.clear();
  if (M === 'hockey') { c.strokeStyle = '#e24b5b'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 320); c.lineTo(360, 320); c.stroke(); c.beginPath(); c.arc(180, 320, 50, 0, 6.283); c.stroke(); c.strokeStyle = '#3a7bd5'; c.beginPath(); c.arc(180, 0, 70, 0, 3.14); c.stroke(); c.beginPath(); c.arc(180, 640, 70, 3.14, 6.283); c.stroke();
    k.rect(180 - GOAL / 2, 0, GOAL, 8, '#222'); k.rect(180 - GOAL / 2, 632, GOAL, 8, '#222');
    for (const [m, col] of [[me, '#3a7bd5'], [ai, '#e24b5b']]) { k.circle(m.x, m.y + 3, m.r, 'rgba(0,0,0,.2)'); k.circle(m.x, m.y, m.r, col); k.circle(m.x, m.y, m.r * 0.45, '#fff5'); }
    k.circle(puck.x, puck.y + 2, puck.r, 'rgba(0,0,0,.2)'); k.circle(puck.x, puck.y, puck.r, '#222'); }
  else { k.rect(20, 40, 320, 560, '#1d5a8c'); c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(20, 40, 320, 560); k.rect(20, 318, 320, 4, '#fff'); k.rect(178, 40, 4, 560, 'rgba(255,255,255,.4)');
    k.rrect(me.x - me.w / 2, 574, me.w, 12, 6, '#ff5f5f'); k.rrect(ai.x - ai.w / 2, 54, ai.w, 12, 6, '#f2d15c'); k.circle(puck.x + 4, puck.y + 6, puck.r, 'rgba(0,0,0,.25)'); k.circle(puck.x, puck.y, puck.r, '#fff'); if (rally > 3) k.text(`Rally ${rally}`, 180, 612, 13, '#fff', 'center'); }
  const txt = M === 'hockey' ? '#223' : '#fff'; k.text(sAi, 340, 280, 32, txt, 'right'); k.text(sMe, 340, 330, 32, txt, 'right');
});
