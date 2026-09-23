/* Missile Guard: toca el cielo (o mueve la mira con flechas y A) para lanzar un interceptor y proteger las ciudades.
 * Ciudades con ventanas, búnkeres con torreta y munición visible, estelas que se desvanecen, explosiones en expansión
 * y misiles que se dividen (MIRV) desde la oleada 3. */
const OUT = ART.OUT, R2 = 6.2832, GY = 330;
const k = Kit({ w: 480, h: 360, title: CFG.title, bg: '#0b0c22' }), c = k.ctx;
let cities, bases, missiles, booms, inter, score, wave, left, spawnT, cur, tm, banner, bonus, endT, smoke, lastP;
function reset() { cities = [80, 150, 200, 280, 330, 400].map((x, i) => ({ x, alive: true, v: i })); bases = [{ x: 30, ammo: 10, a: -1.57 }, { x: 240, ammo: 10, a: -1.57 }, { x: 450, ammo: 10, a: -1.57 }];
  missiles = []; booms = []; inter = []; smoke = []; score = 0; wave = 0; tm = 0; endT = 0; cur = { x: 240, y: 160 }; lastP = { x: -1, y: -1 }; bonus = null; nextWave(); }
function nextWave() { wave++; left = 8 + wave * 3; spawnT = 1.5; bases.forEach((b) => (b.ammo = 10)); banner = 1.8; }
reset(); k.show(CFG.title, 'Toca el cielo para lanzar un interceptor: explota donde tocaste. Teclado: flechas para apuntar y A para disparar. Protege las ciudades.');

/* ---------- gráficos cacheados */
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const BG = off(480, 360, (g) => {
  let gr = g.createLinearGradient(0, 0, 0, 340); gr.addColorStop(0, '#070820'); gr.addColorStop(0.7, '#241a52'); gr.addColorStop(1, '#4a2b6a'); g.fillStyle = gr; g.fillRect(0, 0, 480, 360);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + rnd(i) * 0.7})`; g.fillRect(rnd(i + 1) * 480, rnd(i + 2) * 230, rnd(i + 3) < 0.1 ? 2 : 1.2, rnd(i + 3) < 0.1 ? 2 : 1.2); }
  g.fillStyle = '#fff6d6'; g.beginPath(); g.arc(400, 60, 20, 0, R2); g.fill(); g.fillStyle = 'rgba(200,190,160,.5)'; for (const [x, y, r] of [[394, 54, 4], [406, 66, 3], [398, 70, 2.5]]) { g.beginPath(); g.arc(x, y, r, 0, R2); g.fill(); }
  g.fillStyle = '#1d1640'; for (let x = 0; x < 480; x += 14) { const h = 20 + rnd(x) * 40; g.fillRect(x, 318 - h, 12, h + 20); }
  g.fillStyle = 'rgba(255,220,120,.25)'; for (let i = 0; i < 60; i++) g.fillRect(rnd(i + 40) * 480, 280 + rnd(i + 80) * 36, 2, 2);
  gr = g.createLinearGradient(0, GY, 0, 360); gr.addColorStop(0, '#5a3f7a'); gr.addColorStop(1, '#2b1f45'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 360); for (let x = 0; x <= 480; x += 10) g.lineTo(x, GY - Math.sin(x / 40) * 2); g.lineTo(480, 360); g.fill();
  g.strokeStyle = OUT; g.lineWidth = 2.5; g.beginPath(); for (let x = 0; x <= 480; x += 10) g.lineTo(x, GY - Math.sin(x / 40) * 2); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1.5; g.beginPath(); for (let x = 0; x <= 480; x += 10) g.lineTo(x, GY + 2 - Math.sin(x / 40) * 2); g.stroke();
});
const CITY = [0, 1, 2].map((v) => off(40, 34, (g) => {
  const B = [[[2, 14, 10, 20], [13, 4, 12, 30], [26, 18, 11, 16]], [[1, 18, 12, 16], [14, 10, 10, 24], [25, 2, 13, 32]], [[3, 8, 12, 26], [16, 16, 10, 18], [27, 12, 10, 22]]][v];
  const cols = ['#5ce1e6', '#7aa0ff', '#b98cff'];
  B.forEach(([x, y, w, h], i) => { ART.rr(g, x, y, w, h, 2); ART.fillOut(g, cols[(i + v) % 3], 2); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x + 2, y + 2, 2, h - 4);
    for (let wy = y + 4; wy < 30; wy += 5) for (let wx = x + 3; wx < x + w - 3; wx += 4) { g.fillStyle = rnd(wx * 3 + wy + v) > 0.35 ? '#fff3a8' : 'rgba(26,21,48,.6)'; g.fillRect(wx, wy, 2, 2.5); } });
}));
const RUBBLE = off(40, 16, (g) => { g.beginPath(); g.moveTo(2, 16); g.lineTo(6, 8); g.lineTo(11, 11); g.lineTo(16, 4); g.lineTo(22, 10); g.lineTo(28, 6); g.lineTo(34, 12); g.lineTo(38, 16); g.closePath(); ART.fillOut(g, '#4a4060', 2); g.fillStyle = '#ff7a3d'; g.fillRect(14, 10, 3, 3); g.fillRect(26, 11, 3, 2); });
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function fire(tx, ty) {
  if (ty > GY - 14) return; const b = bases.filter((q) => q.ammo > 0).sort((a, z) => Math.abs(a.x - tx) - Math.abs(z.x - tx))[0];
  if (!b) { k.sfx('click'); k.float('Sin munición', tx, ty, '#ff6b6b'); return; }
  b.ammo--; b.a = Math.atan2(ty - (GY - 14), tx - b.x); b.kick = 0.15; const sx = b.x + Math.cos(b.a) * 18, sy = GY - 14 + Math.sin(b.a) * 18;
  inter.push({ x: sx, y: sy, sx, sy, tx, ty }); k.sfx('shoot');
}
function spawnMissile(x, y, sp, split) { const tg = k.pick([...cities.filter((q) => q.alive), ...bases]); missiles.push({ sx: x, sy: y, x, y, tx: tg.x + k.rnd(-6, 6), sp, split }); }

k.run((dt) => {
  tm += dt;
  for (const p of smoke) { p.y -= 14 * dt; p.x += 6 * dt; p.r += 6 * dt; p.t -= dt; } smoke = smoke.filter((p) => p.t > 0);
  for (const q of cities) if (!q.alive && Math.random() < dt * 3) smoke.push({ x: q.x + k.rnd(-8, 8), y: GY - 6, r: 3, t: 1.6 });
  for (const b of bases) if (b.kick) b.kick = Math.max(0, b.kick - dt);
  if (!k.gate(reset)) return;
  banner -= dt; if (bonus) { bonus.t -= dt; if (bonus.t <= 0) { bonus = null; nextWave(); } }
  if (endT) { endT -= dt; if (endT <= 0) return k.lose('missile-guard', score, 'Ciudades destruidas', `Oleada ${wave}`); }
  // mira: puntero o flechas
  if (k.ptr.x !== lastP.x || k.ptr.y !== lastP.y) { cur.x = k.ptr.x; cur.y = k.ptr.y; lastP = { x: k.ptr.x, y: k.ptr.y }; }
  const sp = 260 * dt; if (k.held.has('left')) cur.x -= sp; if (k.held.has('right')) cur.x += sp; if (k.held.has('up')) cur.y -= sp; if (k.held.has('down')) cur.y += sp;
  cur.x = k.clamp(cur.x, 6, 474); cur.y = k.clamp(cur.y, 30, GY - 16);
  if (!endT && !bonus) { if (k.ptr.hit && k.ptr.y < GY - 10) fire(k.ptr.x, k.ptr.y); if (k.hit.has('a')) fire(cur.x, cur.y); }
  for (const b of bases) { const ta = Math.atan2(cur.y - (GY - 14), cur.x - b.x); if (b.ammo > 0) b.a += (ta - b.a) * Math.min(1, dt * 8); }
  spawnT -= dt;
  if (left > 0 && spawnT <= 0 && !endT) { left--; spawnT = k.rnd(0.4, 1.6) / (1 + wave * 0.1); spawnMissile(k.rnd(0, 480), 0, 30 + wave * 6, wave >= 3 && Math.random() < Math.min(0.4, 0.1 + wave * 0.04)); }
  for (const m of missiles) { const a = Math.atan2(GY + 5 - m.y, m.tx - m.x); m.x += Math.cos(a) * m.sp * dt; m.y += Math.sin(a) * m.sp * dt;
    if (m.split && m.y > 110 + (m.sx % 70)) { m.split = false; const n = k.ri(2, 3); for (let i = 0; i < n; i++) spawnMissile(m.x, m.y, m.sp, false); m.dead = true; k.sfx('pop'); k.burst(m.x, m.y, '#ff9a9a', 6, 60); }
    if (m.y >= GY) { m.dead = true; k.sfx('explode'); k.shake(6); booms.push({ x: m.x, y: GY, r: 0, t: 0, enemy: 1 });
      for (const q of cities) if (q.alive && Math.abs(q.x - m.x) < 22) { q.alive = false; k.burst(q.x, GY - 12, '#ff9a3c', 20, 160); k.flash('rgba(255,90,60,.25)'); }
      for (const q of bases) if (Math.abs(q.x - m.x) < 22 && q.ammo) { q.ammo = 0; k.burst(q.x, GY - 10, '#ffd23d', 14, 140); } } }
  for (const i of inter) { const a = Math.atan2(i.ty - i.y, i.tx - i.x); i.x += Math.cos(a) * 360 * dt; i.y += Math.sin(a) * 360 * dt; if (Math.hypot(i.tx - i.x, i.ty - i.y) < 8) { i.dead = true; k.sfx('explode'); booms.push({ x: i.tx, y: i.ty, r: 0, t: 0 }); } }
  for (const b of booms) { b.t += dt; b.r = Math.sin(Math.min(1, b.t / 1.2) * Math.PI) * 32; if (b.t > 1.2) b.dead = true;
    if (!b.enemy) for (const m of missiles) if (!m.dead && Math.hypot(m.x - b.x, m.y - b.y) < b.r) { m.dead = true; const pts = m.split ? 50 : 25; score += pts; k.burst(m.x, m.y, '#ffe9a8', 10); k.float(`+${pts}`, m.x, m.y - 10, '#fff27a'); booms.push({ x: m.x, y: m.y, r: 0, t: 0 }); } }
  missiles = missiles.filter((m) => !m.dead); inter = inter.filter((i) => !i.dead); booms = booms.filter((b) => !b.dead);
  if (!endT && !cities.some((q) => q.alive)) { endT = 1.4; k.sfx('hurt'); }
  if (!endT && !bonus && !left && !missiles.length && !booms.length && !inter.length) {
    const cb = cities.filter((q) => q.alive).length * 100, ab = bases.reduce((s, b) => s + b.ammo * 5, 0); score += cb + ab; bonus = { t: 2.2, cb, ab }; k.sfx('win'); }
}, () => {
  c.drawImage(BG, 0, 0, 480, 360);
  for (const p of smoke) { c.globalAlpha = Math.min(0.5, p.t * 0.4); c.fillStyle = '#6a6080'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, R2); c.fill(); } c.globalAlpha = 1;
  for (const q of cities) { if (q.alive) c.drawImage(CITY[q.v % 3], q.x - 20, GY - 32, 40, 34); else c.drawImage(RUBBLE, q.x - 20, GY - 14, 40, 16); }
  // búnkeres con torreta y munición
  for (const b of bases) { const by = GY - 14, kick = (b.kick || 0) * 20;
    c.save(); c.translate(b.x, by); c.rotate(b.a); ART.rr(c, 2 - kick, -3.5, 18, 7, 3); ART.fillOut(c, b.ammo ? '#c9d2ea' : '#6a6f88', 2); c.restore();
    c.beginPath(); c.arc(b.x, GY, 16, Math.PI, 0); c.closePath(); ART.fillOut(c, b.ammo ? '#f2d15c' : '#7a6a5a', 2.5); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(b.x - 5, GY - 9, 4, 0, R2); c.fill();
    for (let i = 0; i < b.ammo; i++) { const x = b.x - 12 + (i % 5) * 6, y = GY + 6 + Math.floor(i / 5) * 10; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y + 2); c.lineTo(x + 2, y + 7); c.lineTo(x - 2, y + 7); c.lineTo(x - 2, y + 2); c.closePath(); ART.fillOut(c, '#dfe6f2', 1.2); } }
  // estelas: misiles enemigos (rojo) e interceptores (verde)
  c.lineCap = 'round';
  for (const m of missiles) { const g = c.createLinearGradient(m.sx, m.sy, m.x, m.y); g.addColorStop(0, 'rgba(255,107,107,0)'); g.addColorStop(1, 'rgba(255,107,107,.9)'); c.strokeStyle = g; c.lineWidth = 2.5; c.beginPath(); c.moveTo(m.sx, m.sy); c.lineTo(m.x, m.y); c.stroke();
    c.beginPath(); c.arc(m.x, m.y, m.split ? 4.5 : 3.5, 0, R2); ART.fillOut(c, Math.sin(tm * 20) > 0 ? '#fff' : '#ffb0b0', 1.5); }
  for (const i of inter) { const g = c.createLinearGradient(i.sx, i.sy, i.x, i.y); g.addColorStop(0, 'rgba(124,247,160,0)'); g.addColorStop(1, 'rgba(124,247,160,.95)'); c.strokeStyle = g; c.lineWidth = 2.5; c.beginPath(); c.moveTo(i.sx, i.sy); c.lineTo(i.x, i.y); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(i.x, i.y, 2.5, 0, R2); c.fill();
    c.strokeStyle = '#7cf7a0'; c.lineWidth = 2; c.beginPath(); c.moveTo(i.tx - 5, i.ty - 5); c.lineTo(i.tx + 5, i.ty + 5); c.moveTo(i.tx + 5, i.ty - 5); c.lineTo(i.tx - 5, i.ty + 5); c.stroke(); }
  // explosiones en expansión con color cambiante
  for (const b of booms) { if (b.r <= 0.5) continue; const ph = Math.floor(b.t * 14) % 3, cols = b.enemy ? ['#ff6b6b', '#ff9a3c', '#ffd23d'] : ['#fff6c0', '#ffd23d', '#ff9a3c'];
    c.globalAlpha = b.t > 0.9 ? Math.max(0, (1.2 - b.t) / 0.3) : 1; c.beginPath(); c.arc(b.x, b.y, b.r, 0, R2); c.fillStyle = cols[ph]; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.arc(b.x, b.y, b.r * 0.55, 0, R2); c.fillStyle = cols[(ph + 1) % 3]; c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.18, 0, R2); c.fill(); c.globalAlpha = 1; }
  // mira
  if (k.st === 'play' && !endT) { c.strokeStyle = OUT; c.lineWidth = 4; const cr = () => { c.beginPath(); c.arc(cur.x, cur.y, 9, 0, R2); c.moveTo(cur.x - 15, cur.y); c.lineTo(cur.x - 5, cur.y); c.moveTo(cur.x + 5, cur.y); c.lineTo(cur.x + 15, cur.y); c.moveTo(cur.x, cur.y - 15); c.lineTo(cur.x, cur.y - 5); c.moveTo(cur.x, cur.y + 5); c.lineTo(cur.x, cur.y + 15); c.stroke(); }; cr(); c.strokeStyle = '#7cf7a0'; c.lineWidth = 2; cr(); }
  // HUD
  label(score, 10, 6, 18, '#fff'); label(`Oleada ${wave}`, 470, 6, 14, '#cfc8ff', 'right'); if (left + missiles.length > 0) label(`Misiles: ${left + missiles.length}`, 470, 26, 11, '#ff9a9a', 'right');
  if (banner > 0 && !bonus) { const p = 1.8 - banner, s = p < 0.2 ? 0.4 + p * 3.5 : 1.1; c.save(); c.translate(240, 150); c.scale(s, s); c.globalAlpha = Math.min(1, banner / 0.3); label(`Oleada ${wave}`, 0, 0, 34, '#fff27a', 'center', 'middle'); if (wave >= 3) label('Cuidado: misiles que se dividen', 0, 30, 13, '#ffb0b0', 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
  if (bonus) { const p = 2.2 - bonus.t; c.globalAlpha = Math.min(1, bonus.t / 0.3); label('¡Oleada superada!', 240, 110, 28, '#7cf7a0', 'center', 'middle'); if (p > 0.3) label(`Ciudades: +${bonus.cb}`, 240, 146, 16, '#fff', 'center', 'middle'); if (p > 0.6) label(`Munición: +${bonus.ab}`, 240, 168, 16, '#fff', 'center', 'middle'); c.globalAlpha = 1; }
});
