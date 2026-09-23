/* Acción cenital. CFG.mode: 'dungeon' | 'crypt' | 'arena' | 'zombie' | 'brawl' | 'tank' */
const M = CFG.mode, land = CFG.land !== false;
const W = land ? 640 : 480, H = land ? 360 : 480;
const k = Kit({ w: W, h: H, title: CFG.title, bg: CFG.bg || '#141226' }), c = k.ctx;
let p, foes, shots, eshots, walls, room, score, t, cool, upg, msgT, msg, swing;
const melee = M === 'crypt' || M === 'brawl';
function rectHit(x, y, r) { return walls.some((w) => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) || x < r || y < r || x > W - r || y > H - r; }
function buildRoom() {
  room++; walls = []; foes = []; shots = []; eshots = [];
  const nw = M === 'arena' || M === 'zombie' || M === 'brawl' ? 0 : k.ri(3, 6);
  for (let i = 0; i < nw; i++) { const w = k.pick([40, 80, 120]), h = k.pick([40, 60]); const x = k.rnd(80, W - 80 - w), y = k.rnd(50, H - 50 - h); if (Math.hypot(x - p.x, y - p.y) > 90) walls.push({ x, y, w, h }); }
  const n = M === 'tank' ? Math.min(4, 1 + Math.floor(room / 2)) : 3 + room * 2;
  for (let i = 0; i < n; i++) spawnFoe();
  msg = M === 'arena' || M === 'zombie' ? `Oleada ${room}` : M === 'tank' ? `Batalla ${room}` : `Sala ${room}`; msgT = 1.5;
}
function spawnFoe(x, y, small) {
  let fx = x, fy = y; if (fx === undefined) { do { const e = k.ri(0, 3); fx = e === 0 ? 20 : e === 1 ? W - 20 : k.rnd(20, W - 20); fy = e === 2 ? 20 : e === 3 ? H - 20 : k.rnd(20, H - 20); } while (rectHit(fx, fy, 14) || Math.hypot(fx - p.x, fy - p.y) < 140); }
  const type = M === 'tank' ? 'tank' : M === 'arena' ? 'slime' : M === 'zombie' ? (Math.random() < 0.15 ? 'brute' : 'zombie') : M === 'brawl' ? (Math.random() < 0.3 ? 'brute' : 'thug') : Math.random() < 0.3 ? 'shooter' : 'chaser';
  const base = { chaser: [11, 2, 75], shooter: [11, 2, 45], slime: [small ? 8 : 16, small ? 1 : 3, small ? 95 : 55], zombie: [11, 2, 45 + room * 3], brute: [17, 6, 38], thug: [13, 3, 70], tank: [15, 3, 60] }[type];
  foes.push({ x: fx, y: fy, r: base[0], hp: base[1], sp: base[2], type, cd: k.rnd(0.5, 2), a: 0, small });
}
function reset() { p = { x: W / 2, y: H / 2, r: 11, hp: 5, max: 5, a: 0, inv: 0 }; room = 0; score = 0; t = 0; cool = 0; upg = { rate: 1, dmg: 1, speed: 1 }; swing = 0; buildRoom(); }
reset(); k.show(CFG.title, CFG.help);
function hurt(n) { if (p.inv > 0) return; p.hp -= n; p.inv = 0.8; navigator.vibrate && navigator.vibrate(60); if (p.hp <= 0) k.lose(CFG.id, score, 'Derrotado', `${msg}`); }
function move(o, dx, dy) { if (!rectHit(o.x + dx, o.y, o.r)) o.x += dx; if (!rectHit(o.x, o.y + dy, o.r)) o.y += dy; }
k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt; msgT -= dt; p.inv -= dt; cool -= dt; swing -= dt;
  let mx = 0, my = 0; if (k.held.has('left')) mx--; if (k.held.has('right')) mx++; if (k.held.has('up')) my--; if (k.held.has('down')) my++;
  if (k.ptr.down) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy, d = Math.hypot(dx, dy); if (d > 8) { mx = dx / Math.max(d, 40); my = dy / Math.max(d, 40); } }
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  if (ml > 0.1) p.a = Math.atan2(my, mx);
  move(p, mx * 170 * upg.speed * dt, my * 170 * upg.speed * dt);
  const near = foes.reduce((b, f) => (!b || Math.hypot(f.x - p.x, f.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? f : b), null);
  const trigger = k.held.has('a') || k.tap || (!melee && M !== 'tank' && near);
  if (melee) {
    if ((trigger || (near && Math.hypot(near.x - p.x, near.y - p.y) < 40)) && cool <= 0) { cool = 0.4 / upg.rate; swing = 0.18; k.sfx('shoot'); if (near) p.a = Math.atan2(near.y - p.y, near.x - p.x);
      for (const f of foes) { const d = Math.hypot(f.x - p.x, f.y - p.y), da = Math.abs(((Math.atan2(f.y - p.y, f.x - p.x) - p.a + 9.42) % 6.283) - 3.14); if (d < 44 + f.r && da < 1.2) { f.hp -= upg.dmg; f.x += Math.cos(p.a) * 18; f.y += Math.sin(p.a) * 18; } } }
  } else if (trigger && cool <= 0 && (near || M === 'tank')) {
    cool = (M === 'tank' ? 0.6 : 0.28) / upg.rate; const a = M === 'tank' ? (near ? Math.atan2(near.y - p.y, near.x - p.x) : p.a) : Math.atan2(near.y - p.y, near.x - p.x);
    k.sfx('shoot'); shots.push({ x: p.x, y: p.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, b: M === 'tank' ? 1 : 0, life: 1.5 });
  }
  for (const s of [...shots, ...eshots]) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (rectHit(s.x, s.y, 2)) { if (s.b > 0) { s.b--; if (rectHit(s.x - s.vx * dt, s.y, 2)) s.vy *= -1; else s.vx *= -1; } else s.dead = true; } if (s.life <= 0) s.dead = true; }
  for (const s of shots) for (const f of foes) if (!s.dead && Math.hypot(s.x - f.x, s.y - f.y) < f.r + 3) { s.dead = true; f.hp -= upg.dmg; }
  for (const s of eshots) if (!s.dead && Math.hypot(s.x - p.x, s.y - p.y) < p.r) { s.dead = true; hurt(1); }
  for (const f of foes) {
    const d = Math.hypot(p.x - f.x, p.y - f.y), a = Math.atan2(p.y - f.y, p.x - f.x); f.a = a; f.cd -= dt;
    if (f.type === 'shooter' || f.type === 'tank') { const want = f.type === 'tank' ? 200 : 170; const dir = d > want ? 1 : d < want - 40 ? -1 : 0; move(f, Math.cos(a) * f.sp * dir * dt + Math.cos(a + 1.57) * Math.sin(t + f.x) * 30 * dt, Math.sin(a) * f.sp * dir * dt + Math.sin(a + 1.57) * Math.sin(t + f.x) * 30 * dt);
      if (f.cd <= 0) { f.cd = f.type === 'tank' ? 1.8 : 2.2; eshots.push({ x: f.x, y: f.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, b: f.type === 'tank' ? 1 : 0, life: 3 }); } }
    else { const hop = f.type === 'slime' ? (Math.sin(t * 5 + f.x) > 0 ? 1.6 : 0.2) : 1; move(f, Math.cos(a) * f.sp * hop * dt, Math.sin(a) * f.sp * hop * dt); }
    if (d < f.r + p.r) hurt(f.type === 'brute' ? 2 : 1);
    if (f.hp <= 0 && !f.dead) { f.dead = true; k.burst(f.x, f.y, ({ chaser: '#ff6b6b', shooter: '#ffa94d', slime: '#7cf7a0', zombie: '#8bbf6a', brute: '#b35c5c', thug: '#ff9ad5', tank: '#ff6b6b' })[f.type], f.type === 'tank' ? 30 : 14); k.sfx(f.type === 'tank' ? 'explode' : 'hit'); score += f.type === 'brute' ? 50 : 20; if (f.type === 'slime' && !f.small) { spawnFoe(f.x - 10, f.y, true); spawnFoe(f.x + 10, f.y, true); } if (Math.random() < 0.08 && p.hp < p.max) p.hp++; }
  }
  if (M === 'zombie' && Math.random() < dt * (0.4 + room * 0.1) && foes.length < 12 + room * 3) spawnFoe();
  foes = foes.filter((f) => !f.dead); shots = shots.filter((s) => !s.dead); eshots = eshots.filter((s) => !s.dead);
  if (!foes.length && k.st === 'play') { score += 100 * room;
    const key = k.pick(['rate', 'dmg', 'speed']); upg[key] += key === 'speed' ? 0.1 : 0.25; k.sfx('win'); msg = `+ ${{ rate: 'Cadencia', dmg: 'Daño', speed: 'Velocidad' }[key]}`; msgT = 1.2; buildRoom(); }
}, () => {
  k.clear(); c.strokeStyle = 'rgba(255,255,255,.04)'; for (let x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  for (const w of walls) { k.rect(w.x, w.y, w.w, w.h, '#3b3566'); k.rect(w.x, w.y, w.w, 5, '#554c8f'); }
  const FC = { chaser: '#ff6b6b', shooter: '#ffa94d', slime: '#7cf7a0', zombie: '#8bbf6a', brute: '#b35c5c', thug: '#ff9ad5', tank: '#ff6b6b' };
  for (const f of foes) { if (f.type === 'tank') { c.save(); c.translate(f.x, f.y); c.rotate(f.a); k.rect(-14, -11, 28, 22, FC.tank); k.rect(0, -3, 20, 6, '#222'); c.restore(); } else { k.circle(f.x, f.y, f.r, FC[f.type]); k.circle(f.x + Math.cos(f.a) * f.r * 0.4, f.y + Math.sin(f.a) * f.r * 0.4, f.r * 0.3, '#141226'); } }
  for (const s of shots) k.circle(s.x, s.y, 3.5, '#fff'); for (const s of eshots) k.circle(s.x, s.y, 4, '#ffe066');
  if (!(p.inv > 0 && Math.floor(p.inv * 12) % 2)) { c.save(); c.translate(p.x, p.y); c.rotate(p.a); if (M === 'tank') { k.rect(-14, -11, 28, 22, '#5ce1e6'); k.rect(0, -3, 20, 6, '#1d6f73'); } else { k.circle(0, 0, p.r, '#5ce1e6'); k.circle(6, 0, 4, '#141226'); } c.restore(); }
  if (swing > 0) { c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y, 36, p.a - 1.1, p.a + 1.1); c.stroke(); }
  if (k.ptr.down) { c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.beginPath(); c.arc(k.ptr.sx, k.ptr.sy, 40, 0, 6.283); c.stroke(); k.circle(k.ptr.sx + k.clamp(k.ptr.x - k.ptr.sx, -40, 40), k.ptr.sy + k.clamp(k.ptr.y - k.ptr.sy, -40, 40), 14, 'rgba(255,255,255,.3)'); }
  for (let i = 0; i < p.max; i++) k.text(i < p.hp ? '♥' : '♡', 10 + i * 16, 8, 15, '#ff5f7a');
  k.text(`${score}`, W - 10, 8, 16, '#fff', 'right'); if (msgT > 0) k.text(msg, W / 2, H / 2 - 20, 26, '#f2d15c', 'center');
});
