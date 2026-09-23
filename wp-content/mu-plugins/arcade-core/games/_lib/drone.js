/* Drone Flight: atraviesa los anillos en 3D */
const k = Kit({ w: 640, h: 360, title: CFG.title, bg: '#0a1030' }), c = k.ctx, F = 300;
let d, rings, z, speed, score, lives, t, combo, parts;
function reset() { d = { x: 0, y: 0, vx: 0, vy: 0 }; rings = []; z = 0; speed = 900; score = 0; lives = 3; t = 0; combo = 0; parts = []; let rz = 1500, rx = 0, ry = 0; for (let i = 0; i < 12; i++) { rx = k.clamp(rx + k.rnd(-260, 260), -500, 500); ry = k.clamp(ry + k.rnd(-160, 160), -260, 260); rings.push({ x: rx, y: ry, z: rz, r: 140 }); rz += 900; } }
reset(); k.show(CFG.title, 'Guía el dron a través de los anillos. Arrastra o usa las flechas. Pasar cerca del centro da más puntos.');
k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt; speed += dt * 8; z += speed * dt;
  let ax = (k.held.has('right') ? 1 : 0) - (k.held.has('left') ? 1 : 0), ay = (k.held.has('down') ? 1 : 0) - (k.held.has('up') ? 1 : 0);
  if (k.ptr.down) { ax = k.clamp((k.ptr.x - k.ptr.sx) / 60, -1, 1); ay = k.clamp((k.ptr.y - k.ptr.sy) / 60, -1, 1); }
  d.vx += (ax * 900 - d.vx) * Math.min(1, dt * 4); d.vy += (ay * 700 - d.vy) * Math.min(1, dt * 4); d.x = k.clamp(d.x + d.vx * dt, -600, 600); d.y = k.clamp(d.y + d.vy * dt, -320, 320);
  for (const r of rings) if (!r.done && r.z < z) { r.done = true; const dist = Math.hypot(d.x - r.x, d.y - r.y);
    if (dist < r.r) { combo++; const pts = Math.round((dist < r.r * 0.35 ? 100 : 50) * (1 + combo * 0.1)); score += pts; k.sfx('coin'); parts.push({ txt: `+${pts}`, t: 1 }); } else { combo = 0; lives--; navigator.vibrate && navigator.vibrate(80); parts.push({ txt: '¡Fallo!', t: 1 }); if (lives <= 0) return k.lose(CFG.id, score, 'Sin batería'); } }
  rings = rings.filter((r) => r.z > z - 200); while (rings.length < 12) { const l = rings[rings.length - 1]; rings.push({ x: k.clamp(l.x + k.rnd(-300, 300), -520, 520), y: k.clamp(l.y + k.rnd(-180, 180), -270, 270), z: l.z + Math.max(600, 900 - t * 3), r: Math.max(90, 140 - t * 0.6) }); }
  parts.forEach((p) => (p.t -= dt)); parts = parts.filter((p) => p.t > 0);
}, () => {
  const g = c.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#0a1030'); g.addColorStop(0.5, '#3a2d6b'); g.addColorStop(1, '#122a1e'); c.fillStyle = g; c.fillRect(0, 0, 640, 360);
  const camX = d.x * 0.85, camY = d.y * 0.85, P = (x, y, zz) => { const s = F / Math.max(1, zz - z + 250); return [320 + (x - camX) * s, 180 + (y - camY) * s, s]; };
  c.strokeStyle = 'rgba(124,247,160,.25)'; c.lineWidth = 1; for (let i = 0; i < 20; i++) { const gz = Math.floor(z / 300) * 300 + i * 300; const [x1, y1] = P(-2000, 400, gz), [x2, y2] = P(2000, 400, gz); if (y1 > 180) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); } }
  for (let xx = -2000; xx <= 2000; xx += 400) { const [x1, y1] = P(xx, 400, z + 50), [x2, y2] = P(xx, 400, z + 6000); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  for (const r of [...rings].reverse()) { if (r.z < z - 100) continue; const [x, y, s] = P(r.x, r.y, r.z); const rad = r.r * s; if (rad < 1) continue; c.lineWidth = Math.max(2, 22 * s); c.strokeStyle = r === rings.find((q) => !q.done) ? '#f2d15c' : 'rgba(92,225,230,.8)'; c.beginPath(); c.arc(x, y, rad, 0, 6.283); c.stroke(); }
  const [dx, dy] = [320 + (d.x - camX) * 0.9, 180 + (d.y - camY) * 0.9 + 60]; const tilt = d.vx / 3000;
  c.save(); c.translate(dx, dy); c.rotate(tilt); k.rect(-34, -4, 68, 8, '#dfe6ff'); k.rrect(-14, -10, 28, 16, 6, '#5ce1e6'); for (const s of [-1, 1]) { k.rect(s * 34 - 2, -12, 4, 10, '#999'); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(s * 34 - 16, -14, 32, 3); } c.restore();
  k.text(`${score}`, 12, 10, 20); k.text(`${'🔋'.repeat(Math.max(0, lives))}`, 628, 10, 16, '#fff', 'right'); if (combo > 1) k.text(`Combo x${combo}`, 320, 12, 16, '#f2d15c', 'center');
  parts.forEach((p) => k.text(p.txt, 320, 80 - (1 - p.t) * 30, 22, `rgba(255,255,255,${p.t})`, 'center'));
});
