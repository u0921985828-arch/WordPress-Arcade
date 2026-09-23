/* Planet Hopper: salta de planeta en planeta con gravedad */
const k = Kit({ w: 640, h: 360, title: CFG.title, bg: '#070818' }), c = k.ctx;
let planets, p, cam, score, stars, gems, t, best;
function genPlanets() { planets = [{ x: 120, y: 200, r: 50, hue: 200 }]; let x = 120; for (let i = 0; i < 60; i++) { x += k.rnd(170, 260); planets.push({ x, y: k.rnd(90, 290), r: k.rnd(28, 55), hue: k.ri(0, 360) }); } gems = planets.slice(1).map((q) => ({ x: q.x + k.rnd(-60, 60), y: q.y - q.r - k.rnd(40, 80), got: false })); }
function reset() { genPlanets(); p = { on: planets[0], a: -Math.PI / 2, x: 0, y: 0, vx: 0, vy: 0 }; cam = 0; score = 0; t = 0; best = 0; stars = Array.from({ length: 80 }, () => [k.rnd(0, 640), k.rnd(0, 360), k.rnd(0.2, 1)]); }
reset(); k.show(CFG.title, 'Tu astronauta camina solo por el planeta. Toca para saltar y deja que la gravedad te lleve al siguiente.');
k.run((dt) => {
  if (!k.gate(reset)) return; t += dt;
  if (p.on) { const q = p.on; p.a += dt * 180 / q.r; p.x = q.x + Math.cos(p.a) * (q.r + 8); p.y = q.y + Math.sin(p.a) * (q.r + 8);
    if (k.ptr.hit || k.hit.has('a') || k.hit.has('up')) { const nx = Math.cos(p.a), ny = Math.sin(p.a); p.vx = nx * 340; p.vy = ny * 340; p.on = null; p.from = q; k.sfx('jump'); } }
  else { for (const q of planets) { if (Math.abs(q.x - p.x) > 500) continue; const dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2); const f = q.r * q.r * (q === p.from ? 40 : 230) / d2; p.vx += dx / d * f * dt; p.vy += dy / d * f * dt;
      if (d < q.r + 8) { p.on = q; p.a = Math.atan2(p.y - q.y, p.x - q.x); k.sfx('pop'); if (q !== p.from) { const idx = planets.indexOf(q); if (idx > best) { score += (idx - best) * 50; best = idx; } } p.vx = p.vy = 0; break; } }
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.y < -400 || p.y > 760 || p.x < cam - 300) return k.lose(CFG.id, score, 'Perdido en el espacio', `${best} planetas`); }
  for (const g of gems) if (!g.got && Math.hypot(g.x - p.x, g.y - p.y) < 18) { g.got = true; score += 25; k.sfx('coin'); k.burst(g.x - cam, g.y, '#f2d15c', 8); }
  cam += (p.x - 220 - cam) * Math.min(1, dt * 2);
  if (best >= planets.length - 5) { const l = planets[planets.length - 1]; for (let i = 0; i < 20; i++) { const q = { x: l.x + (i + 1) * k.rnd(180, 260), y: k.rnd(90, 290), r: k.rnd(26, 50), hue: k.ri(0, 360) }; planets.push(q); gems.push({ x: q.x, y: q.y - q.r - 60, got: false }); } }
}, () => {
  k.clear(); for (const [x, y, z] of stars) { c.fillStyle = `rgba(255,255,255,${z})`; c.fillRect(((x - cam * z * 0.2) % 640 + 640) % 640, y, 2, 2); }
  c.save(); c.translate(-cam, 0);
  for (const q of planets) { if (q.x < cam - 100 || q.x > cam + 740) continue; c.fillStyle = `hsla(${q.hue},80%,60%,.12)`; c.beginPath(); c.arc(q.x, q.y, q.r * 2.2, 0, 6.283); c.fill();
    const g = c.createRadialGradient(q.x - q.r * 0.4, q.y - q.r * 0.4, 2, q.x, q.y, q.r); g.addColorStop(0, `hsl(${q.hue},80%,72%)`); g.addColorStop(1, `hsl(${q.hue},60%,30%)`); c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill(); }
  for (const g of gems) if (!g.got) { c.fillStyle = '#f2d15c'; c.beginPath(); c.moveTo(g.x, g.y - 8); c.lineTo(g.x + 6, g.y); c.lineTo(g.x, g.y + 8); c.lineTo(g.x - 6, g.y); c.fill(); }
  if (p.on && k.st === 'play') { let x = p.x, y = p.y, vx = Math.cos(p.a) * 340, vy = Math.sin(p.a) * 340; c.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 70; i++) { for (const q of planets) { if (Math.abs(q.x - x) > 500) continue; const dx = q.x - x, dy = q.y - y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2); if (d < q.r + 6 && q !== p.on) { i = 99; break; } const f = q.r * q.r * (q === p.on ? 40 : 230) / d2; vx += dx / d * f / 60; vy += dy / d * f / 60; } x += vx / 60; y += vy / 60; if (i % 3 === 0) { c.beginPath(); c.arc(x, y, 2, 0, 6.283); c.fill(); } } }
  const ang = p.on ? p.a + Math.PI / 2 : Math.atan2(p.vy, p.vx) + Math.PI / 2; c.save(); c.translate(p.x, p.y); c.rotate(ang); k.rrect(-7, -9, 14, 18, 6, '#f5f5f5'); k.rrect(-5, -7, 10, 6, 3, '#5ce1e6'); c.restore();
  c.restore(); k.text(`${score}`, 12, 10, 20); k.text(`Planetas ${best}`, 628, 10, 15, '#b8b6e0', 'right');
});
