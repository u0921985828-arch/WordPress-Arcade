/* Missile Guard */
const k = Kit({ w: 480, h: 360, title: CFG.title, bg: '#0b0c22' }), c = k.ctx;
let cities, bases, missiles, booms, inter, score, wave, left, spawnT;
function reset() { cities = [80, 150, 200, 280, 330, 400].map((x) => ({ x, alive: true })); bases = [{ x: 30, ammo: 10 }, { x: 240, ammo: 10 }, { x: 450, ammo: 10 }]; missiles = []; booms = []; inter = []; score = 0; wave = 0; nextWave(); }
function nextWave() { wave++; left = 8 + wave * 3; spawnT = 1; bases.forEach((b) => (b.ammo = 10)); }
reset(); k.show(CFG.title, 'Toca el cielo para lanzar un interceptor. Protege las ciudades.');
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (k.ptr.hit && k.ptr.y < 320) {
    const b = bases.filter((q) => q.ammo > 0).sort((a, z) => Math.abs(a.x - k.ptr.x) - Math.abs(z.x - k.ptr.x))[0];
    if (b) { b.ammo--; inter.push({ x: b.x, y: 330, tx: k.ptr.x, ty: k.ptr.y, sx: b.x }); }
  }
  spawnT -= dt;
  if (left > 0 && spawnT <= 0) { left--; spawnT = k.rnd(0.4, 1.6) / (1 + wave * 0.1); const tg = k.pick([...cities.filter((q) => q.alive), ...bases]); const x = k.rnd(0, 480); missiles.push({ sx: x, x, y: 0, tx: tg.x, sp: 30 + wave * 6 }); }
  for (const m of missiles) { const a = Math.atan2(335 - m.y, m.tx - m.x); m.x += Math.cos(a) * m.sp * dt; m.y += Math.sin(a) * m.sp * dt;
    if (m.y >= 330) { m.dead = true; k.sfx('hurt'); k.shake(6); booms.push({ x: m.x, y: 330, r: 0, t: 0, enemy: 1 }); for (const q of cities) if (Math.abs(q.x - m.x) < 20) q.alive = false; for (const q of bases) if (Math.abs(q.x - m.x) < 20) q.ammo = 0; } }
  for (const i of inter) { const a = Math.atan2(i.ty - i.y, i.tx - i.x); i.x += Math.cos(a) * 360 * dt; i.y += Math.sin(a) * 360 * dt; if (Math.hypot(i.tx - i.x, i.ty - i.y) < 8) { i.dead = true; k.sfx('explode'); booms.push({ x: i.tx, y: i.ty, r: 0, t: 0 }); } }
  for (const b of booms) { b.t += dt; b.r = Math.sin(Math.min(1, b.t / 1.2) * Math.PI) * 32; if (b.t > 1.2) b.dead = true;
    if (!b.enemy) for (const m of missiles) if (!m.dead && Math.hypot(m.x - b.x, m.y - b.y) < b.r) { m.dead = true; score += 25; k.burst(m.x, m.y, '#ffe9a8', 10); booms.push({ x: m.x, y: m.y, r: 0, t: 0 }); } }
  missiles = missiles.filter((m) => !m.dead); inter = inter.filter((i) => !i.dead); booms = booms.filter((b) => !b.dead);
  if (!cities.some((q) => q.alive)) return k.lose('missile-guard', score, 'Ciudades destruidas', `Oleada ${wave}`);
  if (!left && !missiles.length && !booms.length) { score += cities.filter((q) => q.alive).length * 100 + bases.reduce((s, b) => s + b.ammo * 5, 0); nextWave(); }
}, () => {
  k.clear(); k.rect(0, 330, 480, 30, '#3a2f5b');
  for (const q of cities) if (q.alive) { k.rect(q.x - 12, 318, 8, 12, '#5ce1e6'); k.rect(q.x - 3, 312, 8, 18, '#5ce1e6'); k.rect(q.x + 6, 320, 7, 10, '#5ce1e6'); }
  for (const b of bases) { c.fillStyle = '#f2d15c'; c.beginPath(); c.moveTo(b.x - 16, 330); c.lineTo(b.x, 314); c.lineTo(b.x + 16, 330); c.fill(); k.text(b.ammo, b.x, 338, 12, '#fff', 'center'); }
  c.lineWidth = 1.5; c.strokeStyle = '#ff6b6b'; for (const m of missiles) { c.beginPath(); c.moveTo(m.sx, 0); c.lineTo(m.x, m.y); c.stroke(); }
  c.strokeStyle = '#7cf7a0'; for (const i of inter) { c.beginPath(); c.moveTo(i.sx, 330); c.lineTo(i.x, i.y); c.stroke(); }
  for (const b of booms) k.circle(b.x, b.y, Math.max(0, b.r), b.enemy ? 'rgba(255,107,107,.7)' : 'rgba(255,240,180,.85)');
  k.text(score, 10, 10, 16); k.text(`Oleada ${wave}`, 470, 10, 14, '#b8b6e0', 'right');
});
