/* Runner de un botón. CFG.mode: 'flap' | 'jump' | 'double' | 'gravity' | 'cave' */
const M = CFG.mode, port = M === 'flap';
const W = port ? 360 : 640, H = port ? 640 : 360;
const k = Kit({ w: W, h: H, title: CFG.title, bg: CFG.bg || '#141a33' }), c = k.ctx;
const G = 1500, FLOOR = H - 50, CEIL = 50;
let hover = true, p, obs, t, speed, score, spawn, jumps, grav, cave, bullets;
function reset() {
  p = { x: port ? 100 : 120, y: port || M === 'cave' ? H / 2 : FLOOR - 20, vy: 0, s: 20 }; hover = true; obs = []; t = 0; speed = port ? 150 : 280; score = 0; spawn = 1; jumps = 0; grav = 1; bullets = [];
  cave = []; for (let x = 0; x <= W + 40; x += 20) cave.push({ x, top: 60, bot: H - 60 });
}
reset(); k.show(CFG.title, CFG.help);
const act = () => k.hit.has('a') || k.hit.has('up') || k.ptr.hit;
function die() { k.burst(p.x, p.y, '#fff', 30, 260); k.lose(CFG.id, Math.floor(score)); }
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (hover && (M === 'flap' || M === 'cave')) { if (act() || k.held.has('a') || k.ptr.down) hover = false; else { t += dt; p.y = (M === 'flap' ? H / 2 : H / 2) + Math.sin(t * 4) * 8; p.vy = 0; return; } }
  t += dt; speed += dt * (port ? 2 : 6); score += dt * 10;
  if (M === 'flap') { if (act()) { p.vy = -380; k.sfx('jump'); } p.vy += 1200 * dt; p.y += p.vy * dt; if (p.y > H - 10 || p.y < 0) return die(); }
  if (M === 'jump' || M === 'double') {
    const on = p.y >= FLOOR - p.s;
    if (on) { p.y = FLOOR - p.s; p.vy = 0; jumps = 0; }
    if (act() && (on || (M === 'double' && jumps < 2))) { p.vy = -560; k.sfx('jump'); k.burst(p.x, p.y + p.s, '#fff', 5, 80); jumps = on ? 1 : jumps + 1; }
    if (!(k.held.has('a') || k.held.has('up') || k.ptr.down) && p.vy < -200) p.vy = -200;
    p.vy += G * dt; p.y = Math.min(FLOOR - p.s, p.y + p.vy * dt);
  }
  if (M === 'gravity') {
    if (act()) { grav *= -1; k.sfx('jump'); } p.vy += G * grav * dt; p.vy = k.clamp(p.vy, -700, 700); p.y += p.vy * dt;
    if (p.y > FLOOR - p.s) { p.y = FLOOR - p.s; p.vy = 0; } if (p.y < CEIL) { p.y = CEIL; p.vy = 0; }
  }
  if (M === 'cave') {
    const hold = k.held.has('a') || k.held.has('up') || k.ptr.down; p.vy += (hold ? -900 : 700) * dt; p.vy = k.clamp(p.vy, -300, 350); p.y += p.vy * dt;
    for (const s of cave) s.x -= speed * dt;
    if (cave[0].x < -20) { cave.shift(); const l = cave[cave.length - 1], gap = Math.max(130, 220 - t * 2); let top = k.clamp(l.top + k.rnd(-24, 24), 20, H - gap - 20); cave.push({ x: l.x + 20, top, bot: top + gap }); }
    const s = cave.find((q) => q.x <= p.x && q.x + 20 > p.x); if (s && (p.y - 8 < s.top || p.y + 8 > s.bot)) return die();
    if (Math.floor(t * 5) !== Math.floor((t - dt) * 5)) bullets.push({ x: p.x + 14, y: p.y });
    for (const b of bullets) b.x += 500 * dt;
  }
  spawn -= dt;
  if (spawn <= 0) {
    if (M === 'flap') { const gap = Math.max(140, 190 - t), y = k.rnd(80, H - 80 - gap); obs.push({ x: W + 30, y: 0, w: 56, h: y, pipe: 1 }, { x: W + 30, y: y + gap, w: 56, h: H - y - gap, pipe: 1, scored: false, main: 1 }); spawn = 1.6; }
    else if (M === 'cave') { const s = cave[cave.length - 1]; obs.push({ x: W + 20, y: k.rnd(s.top + 20, s.bot - 50), w: 26, h: 26, hp: 2, mine: 1 }); spawn = k.rnd(1, 2); }
    else if (M === 'gravity') { const top = Math.random() < 0.5; obs.push({ x: W + 20, y: top ? CEIL : FLOOR - 40, w: 26, h: 40 }); spawn = k.rnd(0.6, 1.2) * 300 / speed * 1.8; }
    else { const tall = Math.random() < (M === 'double' ? 0.45 : 0.3), fly = M === 'double' && Math.random() < 0.25; obs.push({ x: W + 20, y: fly ? FLOOR - 90 : FLOOR - (tall ? 50 : 26), w: tall ? 22 : 30, h: fly ? 20 : tall ? 50 : 26 }); spawn = k.rnd(0.7, 1.4) * 300 / speed * 1.7; }
  }
  for (const o of obs) {
    o.x -= speed * dt;
    if (o.main && !o.scored && o.x + o.w < p.x) { o.scored = true; score += 10; k.sfx('coin'); }
    if (o.mine) for (const b of bullets) if (!b.dead && b.x > o.x && b.x < o.x + o.w && b.y > o.y && b.y < o.y + o.h) { b.dead = true; if (--o.hp <= 0) { o.dead = true; score += 25; k.burst(o.x + 13, o.y + 13, '#ff6b6b', 14); k.sfx('hit'); } }
    const r = M === 'cave' ? 8 : p.s / 2 - 2, cx = p.x, cy = M === 'flap' || M === 'cave' ? p.y : p.y + p.s / 2;
    if (!o.dead && cx + r > o.x && cx - r < o.x + o.w && cy + r > o.y && cy - r < o.y + o.h) return die();
  }
  obs = obs.filter((o) => !o.dead && o.x > -80); bullets = bullets.filter((b) => !b.dead && b.x < W);
}, () => {
  k.clear();
  const pal = CFG.pal || ['#5ce1e6', '#ff5fa2', '#2a3160'];
  if (M === 'cave') { c.fillStyle = pal[2]; for (const s of cave) { c.fillRect(s.x, 0, 21, s.top); c.fillRect(s.x, s.bot, 21, H - s.bot); } }
  else if (M !== 'flap') { k.rect(0, FLOOR, W, H - FLOOR, pal[2]); if (M === 'gravity') k.rect(0, 0, W, CEIL, pal[2]); c.fillStyle = 'rgba(255,255,255,.15)'; const off = (t * speed) % 40; for (let x = -off; x < W; x += 40) c.fillRect(x, FLOOR + 6, 20, 3); }
  for (const o of obs) { if (o.pipe) { k.rect(o.x, o.y, o.w, o.h, '#4fd18b'); k.rect(o.x - 4, o.y === 0 ? o.h - 20 : o.y, o.w + 8, 20, '#3ab077'); } else if (o.mine) k.circle(o.x + 13, o.y + 13, 13, '#ff6b6b'); else { c.fillStyle = pal[1]; c.beginPath(); c.moveTo(o.x, o.y + o.h); c.lineTo(o.x + o.w / 2, o.y); c.lineTo(o.x + o.w, o.y + o.h); c.fill(); } }
  c.fillStyle = '#fff'; for (const b of bullets) c.fillRect(b.x, b.y - 1, 8, 3);
  if (M === 'flap') { k.circle(p.x, p.y, 13, '#f2d15c'); k.circle(p.x + 5, p.y - 4, 3, '#141a33'); k.rect(p.x - 12, p.y + (Math.sin(t * 20) > 0 ? -2 : 2), 10, 5, '#ffa94d'); }
  else if (M === 'cave') { c.fillStyle = pal[0]; c.beginPath(); c.moveTo(p.x + 14, p.y); c.lineTo(p.x - 10, p.y - 8); c.lineTo(p.x - 10, p.y + 8); c.fill(); }
  else k.rrect(p.x - p.s / 2, p.y, p.s, p.s, 4, pal[0]);
  k.text(Math.floor(score), W / 2, 14, 26, '#fff', 'center');
});
