/* Bowling Flick: desliza para lanzar la bola. 10 frames con puntuación oficial */
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#2a1a12' }), c = k.ctx;
const LANE_W = 105, LANE_L = 1800;
let pins, ball, frames, frame, roll, state, standing, msg, msgT, aimX;
function rackPins() { pins = []; const rows = [[0], [-1, 1], [-2, 0, 2], [-3, -1, 1, 3]]; rows.forEach((r, i) => r.forEach((x) => pins.push({ x: x * 15, y: 1500 + i * 26, vx: 0, vy: 0, down: false, gone: false }))); }
function setBall() { ball = { x: aimX || 0, y: 0, vx: 0, vy: 0, rolling: false }; state = 'aim'; }
function reset() { frames = []; frame = 0; roll = 0; aimX = 0; standing = 10; rackPins(); setBall(); msg = ''; msgT = 0; }
function score() { const r = frames.flat(); let s = 0, i = 0; const out = []; for (let f = 0; f < 10; f++) { if (r[i] === undefined) break; if (r[i] === 10) { if (r[i + 2] === undefined) break; s += 10 + r[i + 1] + r[i + 2]; i++; } else { if (r[i + 1] === undefined) break; if (r[i] + r[i + 1] === 10) { if (r[i + 2] === undefined) break; s += 10 + r[i + 2]; } else s += r[i] + r[i + 1]; i += 2; } out.push(s); } return out; }
reset(); k.show(CFG.title, 'Arrastra la bola a los lados para colocarla y desliza hacia arriba para lanzar. Un desliz torcido da efecto.');
const P = (x, y) => { const s = 1 / (1 + y / 900); return [180 + x * s * 1.6, 600 - (1 - s) * 560, s]; };
k.run((dt) => {
  msgT -= dt; if (!k.gate(reset)) return;
  if (state === 'aim') { if (k.ptr.down && k.ptr.y > 520 && Math.abs(k.ptr.y - k.ptr.sy) < 20) aimX = k.clamp((k.ptr.x - 180) / 1.6, -LANE_W + 12, LANE_W - 12), ball.x = aimX;
    if (k.ptr.up && k.ptr.sy - k.ptr.y > 60) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.sy - k.ptr.y; ball.vy = k.clamp(dy * 4.2, 500, 1500); ball.vx = dx * 0.35; ball.hook = k.clamp(dx / 400, -0.4, 0.4) * -60; ball.rolling = true; state = 'roll'; }
    if (k.hit.has('a') || k.hit.has('up')) { ball.vy = 1200; ball.vx = 0; ball.hook = 0; state = 'roll'; } if (k.held.has('left')) ball.x = aimX = Math.max(-LANE_W + 12, aimX - 120 * dt); if (k.held.has('right')) ball.x = aimX = Math.min(LANE_W - 12, aimX + 120 * dt); }
  if (state === 'roll' || state === 'settle') { const h = dt / 4; for (let s = 0; s < 4; s++) {
      if (state === 'roll') { ball.vx += (ball.y > 900 ? ball.hook : 0) * h; ball.x += ball.vx * h; ball.y += ball.vy * h; if (Math.abs(ball.x) > LANE_W) { ball.gutter = true; ball.vx = 0; ball.x = Math.sign(ball.x) * (LANE_W + 10); }
        if (!ball.gutter) for (const p of pins) if (!p.gone && Math.hypot(p.x - ball.x, p.y - ball.y) < 20) { const nx = (p.x - ball.x) / 20, ny = (p.y - ball.y) / 20; p.vx += nx * ball.vy * 0.7 + ball.vx * 0.3; p.vy += ny * ball.vy * 0.7; if (!p.down) k.sfx('hit'); p.down = true; ball.vy *= 0.93; } }
      for (const p of pins) { if (p.gone) continue; p.x += p.vx * h; p.y += p.vy * h; p.vx *= 1 - 1.6 * h; p.vy *= 1 - 1.6 * h; if (Math.abs(p.x) > LANE_W + 10 || p.y > 1640) p.gone = true;
        for (const q of pins) if (q !== p && !q.gone && Math.hypot(q.x - p.x, q.y - p.y) < 12) { const sp = Math.hypot(p.vx, p.vy); if (sp > 40) { const nx = (q.x - p.x) / 12, ny = (q.y - p.y) / 12; q.vx += nx * sp * 0.6; q.vy += ny * sp * 0.6; q.down = true; p.vx *= 0.7; p.vy *= 0.7; } } } }
    if (state === 'roll' && ball.y > 1700) { state = 'settle'; ball.wait = 1.2; }
    if (state === 'settle') { ball.wait -= dt; if (ball.wait <= 0) {
      const up = pins.filter((p) => !(p.down || p.gone)).length, pts = standing - up; frames[frame] = frames[frame] || []; frames[frame].push(pts); const fr = frames[frame];
      msg = pts === 10 && standing === 10 && (roll === 0 || frame === 9) ? '¡STRIKE!' : standing < 10 && up === 0 ? '¡SPARE!' : `${pts} bolos`; if (msg === '¡STRIKE!') { k.sfx('win'); k.confetti(); } else if (msg === '¡SPARE!') k.sfx('coin');
      msgT = 1.2;
      let mode = 'keep';
      if (frame < 9) mode = fr[0] === 10 || fr.length === 2 ? 'next' : 'keep';
      else if (fr.length === 3) mode = 'end';
      else if (fr.length === 1) mode = fr[0] === 10 ? 'rerack' : 'keep';
      else { const [a, b] = fr; mode = a === 10 ? (b === 10 ? 'rerack' : 'keep') : a + b === 10 ? 'rerack' : 'end'; }
      if (mode === 'end') { const total = score().pop() || 0; k.st = 'over'; k.end(CFG.id, total, 'Partida terminada'); return; }
      if (mode === 'next') { frame++; roll = 0; rackPins(); standing = 10; }
      else if (mode === 'rerack') { roll++; rackPins(); standing = 10; }
      else { roll++; pins = pins.filter((p) => !(p.down || p.gone)); pins.forEach((p) => { p.vx = p.vy = 0; }); standing = up; }
      setBall(); ball.gutter = false; } } }
}, () => {
  k.clear(); const q = (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach((p) => c.lineTo(p[0], p[1])); c.fill(); };
  const a = P(-LANE_W - 22, -50), b = P(LANE_W + 22, -50), cc = P(LANE_W + 22, LANE_L), d = P(-LANE_W - 22, LANE_L); q([a, b, cc, d], '#1a1a1a');
  const a2 = P(-LANE_W, -50), b2 = P(LANE_W, -50), c2 = P(LANE_W, LANE_L), d2 = P(-LANE_W, LANE_L); q([a2, b2, c2, d2], '#d9a066');
  for (let i = -3; i <= 3; i++) { const p1 = P(i * 28, -50), p2 = P(i * 28, LANE_L); c.strokeStyle = 'rgba(120,70,30,.25)'; c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke(); }
  for (let i = -2; i <= 2; i++) { const [x, y, s] = P(i * 26, 600); c.fillStyle = '#7a3b1c'; c.beginPath(); c.moveTo(x, y - 8 * s); c.lineTo(x + 5 * s, y + 4 * s); c.lineTo(x - 5 * s, y + 4 * s); c.fill(); }
  const objs = [...pins.filter((p) => !p.gone).map((p) => ({ ...p, pin: true })), { ...ball, ballObj: true }].sort((u, v) => v.y - u.y);
  for (const o of objs) { const [x, y, s] = P(o.x, o.y); if (o.ballObj) { k.circle(x, y - 16 * s, 20 * s, '#2b50c9'); k.circle(x - 4 * s, y - 16 * s, 3 * s, '#fff8'); } else if (o.down) { c.save(); c.translate(x, y - 5 * s); c.rotate(Math.atan2(o.vy, o.vx) || 1.2); k.rrect(-26 * s, -7 * s, 52 * s, 14 * s, 7 * s, '#f5f5f5'); k.rect(-8 * s, -7 * s, 4 * s, 14 * s, '#d23a4a'); c.restore(); } else { k.rrect(x - 8 * s, y - 56 * s, 16 * s, 56 * s, 8 * s, '#f5f5f5'); k.circle(x, y - 54 * s, 6 * s, '#f5f5f5'); k.rect(x - 8 * s, y - 42 * s, 16 * s, 5 * s, '#d23a4a'); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.strokeRect(x - 8 * s, y - 56 * s, 16 * s, 56 * s); } }
  const sc = score(); k.rect(0, 0, 360, 58, 'rgba(0,0,0,.6)'); for (let f = 0; f < 10; f++) { const x = 4 + f * 35.2; c.strokeStyle = f === frame ? '#f2d15c' : '#555'; c.strokeRect(x, 4, 33, 50); const fr = frames[f] || []; k.text(fr.map((v, i) => (v === 10 && (i === 0 || f === 9) ? 'X' : i > 0 && fr[i - 1] + v === 10 && fr[i - 1] !== 10 ? '/' : v || '-')).join(' '), x + 16, 8, 11, '#fff', 'center'); if (sc[f] !== undefined) k.text(sc[f], x + 16, 30, 14, '#f2d15c', 'center'); }
  if (msgT > 0) k.text(msg, 180, 300, 36, '#fff', 'center');
  if (state === 'aim') k.text('↑ Desliza para lanzar', 180, 610, 14, '#ffe', 'center');
});
