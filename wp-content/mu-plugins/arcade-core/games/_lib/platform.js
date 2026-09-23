/* Plataformas. CFG.mode: 'side' | 'barrels' | 'ninja' | 'hopper' | 'lava'
 * CFG.abil: {wall, dash, sword, grapple, swing(auto-run+hold)}, CFG.enemies, CFG.spikes, CFG.pal */
const M = CFG.mode, A = CFG.abil || {}, port = M === 'ninja' || M === 'hopper' || M === 'lava';
const W = port ? 360 : M === 'barrels' ? 480 : 640, H = port ? 640 : 360, T = 20;
const k = Kit({ w: W, h: H, title: CFG.title, bg: CFG.bg || '#151a36' }), c = k.ctx;
const PAL = CFG.pal || { sky: '#151a36', ground: '#3b3f7a', top: '#7b6cf6', p: '#5ce1e6', spike: '#ff6b6b', enemy: '#ffa94d', coin: '#f2d15c' };
let map, MW, MH, p, enemies, coins, anchors, barrels, flag, cam, level, lives, score, t, jumpBuf, coyote, rope, dashT, dashCd, swordT, lava, hiY, platforms, bT;
const tileAt = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (tx < 0 || tx >= MW) return 1; if (ty < 0) return 0; if (ty >= MH) return 0; return map[ty][tx]; };
function genSide() {
  MW = 90 + level * 25; MH = 18; map = Array.from({ length: MH }, () => Array(MW).fill(0)); enemies = []; coins = []; anchors = [];
  const col = (x, h) => { for (let y = MH - h; y < MH; y++) if (x >= 0 && x < MW) map[y][x] = 1; };
  let x = 0, h = 3; for (; x < 8; x++) col(x, h);
  while (x < MW - 12) {
    const r = Math.random();
    if (A.swing || (r < 0.28 && !(A.wall && r < 0.1))) {
      const gw = A.swing ? k.ri(5, 8) : A.dash && Math.random() < 0.4 ? k.ri(5, 6) : k.ri(2, 4);
      if (A.grapple || A.swing) anchors.push({ x: (x + gw / 2) * T, y: (MH - h - 7) * T });
      for (let i = 0; i < gw; i++) if (Math.random() < 0.5) coins.push({ x: (x + i) * T + 10, y: (MH - h - 4) * T });
      x += gw;
    }
    const seg = A.swing ? k.ri(2, 4) : k.ri(4, 9);
    let nh = k.clamp(h + k.ri(-2, 3), 2, 9);
    if (A.wall && Math.random() < 0.3 && h < 6) {
      nh = h + 6; for (let i = 0; i < 4; i++) col(x + i, h); // pasillo
      for (let y = MH - nh - 1; y < MH - h - 3; y++) map[y][x + 1] = 1; // pared flotante de la chimenea
      x += 4; h = nh; continue;
    }
    for (let i = 0; i < seg; i++) {
      col(x + i, nh);
      if (CFG.spikes && i > 1 && i < seg - 1 && Math.random() < CFG.spikes && x > 12) map[MH - nh - 1][x + i] = 3;
      else if (Math.random() < 0.25) coins.push({ x: (x + i) * T + 10, y: (MH - nh - 2) * T + 4 });
    }
    if (CFG.enemies && seg >= 5 && x > 14 && Math.random() < CFG.enemies) enemies.push({ x: (x + 1) * T, y: (MH - nh) * T - 16, w: 16, h: 16, vx: 50, min: x * T, max: (x + seg) * T - 16, alive: true });
    if (Math.random() < 0.2 && !A.swing) { const py = MH - nh - 4; for (let i = 1; i < 4; i++) if (map[py]) map[py][x + i] = 2; coins.push({ x: (x + 2) * T + 10, y: (py - 1) * T }); }
    x += seg; h = nh;
  }
  for (; x < MW; x++) col(x, h); flag = { x: (MW - 5) * T, y: (MH - h) * T };
  p = mkP(3 * T, (MH - 3) * T - 40);
}
function genBarrels() {
  MW = 24; MH = 18; map = Array.from({ length: MH }, () => Array(MW).fill(0)); enemies = []; coins = []; anchors = []; barrels = []; bT = 1;
  for (let x = 0; x < MW; x++) map[MH - 1][x] = 1;
  for (let i = 1; i <= 5; i++) { const y = MH - 1 - i * 3, gapLeft = i % 2 === 1; for (let x = 0; x < MW; x++) if (gapLeft ? x > 2 : x < MW - 3) map[y][x] = 2; }
  flag = { x: 11 * T, y: (MH - 16) * T }; p = mkP(2 * T, (MH - 2) * T - 18);
}
function genVert() {
  platforms = []; enemies = []; coins = []; hiY = 0; cam = 0; lava = H + 400;
  let y = H - 40; platforms.push({ x: 0, y: H - 20, w: W, kind: 'floor' });
  while (y > -4000) { y -= M === 'lava' ? k.ri(60, 90) : k.ri(55, 95); const w = M === 'hopper' ? 60 : k.ri(60, 120); platforms.push({ x: k.rnd(10, W - w - 10), y, w, kind: M === 'hopper' && Math.random() < 0.15 ? 'move' : M === 'hopper' && Math.random() < 0.1 ? 'break' : 'n', vx: 60 }); if (Math.random() < 0.3) coins.push({ x: platforms[platforms.length - 1].x + w / 2, y: y - 24 }); }
  if (M === 'ninja') { platforms = []; p = { x: 40, y: H - 100, vx: 0, vy: 0, w: 14, h: 18, side: -1, cling: true }; enemies = []; for (let yy = H - 300; yy > -20000; yy -= k.ri(120, 220)) enemies.push({ side: k.pick([-1, 1]), y: yy, h: k.ri(40, 90) }); return; }
  p = mkP(W / 2, H - 60);
}
function mkP(x, y) { return { x, y, vx: 0, vy: 0, w: 14, h: 18, face: 1, ground: false }; }
function build() { t = 0; rope = null; dashT = 0; dashCd = 0; swordT = 0; jumpBuf = 0; coyote = 0; cam = 0; if (M === 'side') genSide(); else if (M === 'barrels') genBarrels(); else genVert(); }
function reset() { level = 1; lives = 3; score = 0; build(); }
reset(); k.show(CFG.title, CFG.help);
function die() { lives--; navigator.vibrate && navigator.vibrate(100); if (lives <= 0 || port) return k.lose(CFG.id, Math.floor(score), port ? 'Fin' : 'Sin vidas', port ? '' : `Nivel ${level}`); const lv = level; build(); level = lv; }
function collideTiles(o, dt) {
  o.x += o.vx * dt;
  for (const cy of [o.y + 1, o.y + o.h - 1]) for (const cx of [o.x, o.x + o.w]) if (tileAt(cx, cy) === 1) { if (o.vx > 0) o.x = Math.floor(cx / T) * T - o.w - 0.01; else if (o.vx < 0) o.x = Math.floor(cx / T) * T + T + 0.01; o.wallHit = o.vx > 0 ? 1 : -1; o.vx = 0; }
  const oldBottom = o.y + o.h; o.y += o.vy * dt; o.ground = false;
  for (const cx of [o.x + 1, o.x + o.w - 1]) {
    const tb = tileAt(cx, o.y + o.h), tt = tileAt(cx, o.y);
    if (o.vy >= 0 && (tb === 1 || (tb === 2 && oldBottom <= Math.floor((o.y + o.h) / T) * T + 1))) { o.y = Math.floor((o.y + o.h) / T) * T - o.h; o.vy = 0; o.ground = true; }
    else if (o.vy < 0 && tt === 1) { o.y = Math.floor(o.y / T) * T + T; o.vy = 0; }
  }
}
k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt;
  let L = k.held.has('left'), R = k.held.has('right'), J = k.hit.has('up') || k.hit.has('a'), JH = k.held.has('up') || k.held.has('a'), B = k.hit.has('b'), BH = k.held.has('b');
  if (M === 'ninja') {
    if ((J || k.ptr.hit) && p.cling) { k.sfx('jump'); p.cling = false; p.vx = -p.side * 520; p.vy = -380; }
    if (!p.cling) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.x <= 40 || p.x >= W - 40 - p.w) { p.side = p.x <= 40 ? -1 : 1; p.x = p.side < 0 ? 40 : W - 40 - p.w; p.cling = true; p.vx = 0; p.vy = 0; score += 1; } }
    else p.y += 40 * dt;
    for (const e of enemies) if ((e.side === p.side && p.cling || (p.x < 60 && e.side < 0) || (p.x > W - 60 - p.w && e.side > 0)) && p.y + p.h > e.y && p.y < e.y + e.h) return die();
    cam = Math.min(cam, p.y - H * 0.6); if (p.y > cam + H + 20) return die(); score = Math.max(score, Math.floor((H - 100 - p.y) / 10)); return;
  }
  if (M === 'hopper' || M === 'lava') {
    if (k.ptr.down && M === 'hopper') { if (k.ptr.x < W / 2) L = true; else R = true; }
    if (M === 'lava' && k.ptr.hit) { p.face = k.ptr.x < W / 2 ? -1 : 1; if (p.ground || coyote > 0) { p.vy = -560; p.vx = p.face * 190; p.hop = 0.5; } }
    if (M === 'lava' && J && (p.ground || coyote > 0)) p.vy = -560;
    p.hop = (p.hop || 0) - dt;
    const ax = (R ? 1 : 0) - (L ? 1 : 0); if (p.hop <= 0) p.vx = ax * 200; if (ax) p.face = ax;
    p.vy += 1300 * dt; const oldB = p.y + p.h; p.x += p.vx * dt; p.y += p.vy * dt; p.ground = false; coyote -= dt;
    if (M === 'hopper') { if (p.x < -p.w) p.x = W; if (p.x > W) p.x = -p.w; } else p.x = k.clamp(p.x, 0, W - p.w);
    for (const q of platforms) { if (q.kind === 'move') { q.x += q.vx * dt; if (q.x < 0 || q.x + q.w > W) q.vx *= -1; } if (q.gone) continue;
      if (p.vy >= 0 && oldB <= q.y + 1 && p.y + p.h >= q.y && p.x + p.w > q.x && p.x < q.x + q.w) { p.y = q.y - p.h; if (M === 'hopper') { p.vy = -640; k.sfx('jump'); if (q.kind === 'break') q.gone = true; } else { p.vy = 0; p.ground = true; coyote = 0.08; p.hop = 0; } } }
    for (const co of coins) if (!co.got && Math.abs(co.x - p.x - 7) < 16 && Math.abs(co.y - p.y - 9) < 18) { co.got = true; score += 25; k.sfx('coin'); k.burst(co.x, co.y, PAL.coin, 8, 90); }
    cam = Math.min(cam, p.y - H * 0.45); score = Math.max(score, Math.floor((H - 60 - p.y) / 10) + coins.filter((q) => q.got).length * 25);
    if (M === 'lava') { lava -= (18 + t * 0.9) * dt; lava = Math.min(lava, cam + H + 60); if (p.y + p.h > lava) return die(); }
    if (p.y > cam + H + 40) return die(); return;
  }
  // side / barrels
  if (A.grapple && !A.swing) { if (k.ptr.down) BH = true; if (k.ptr.hit) B = true; }
  if (A.swing) { R = true; BH = k.ptr.down || BH || JH; B = k.ptr.hit || B || J; J = false; }
  dashCd -= dt; swordT -= dt; jumpBuf -= dt; coyote -= dt;
  if (J) jumpBuf = 0.12;
  if (A.dash && B && dashCd <= 0) { dashT = 0.18; dashCd = 0.6; }
  if (A.sword && (B || k.tap) && swordT <= -0.15) swordT = 0.2;
  if ((A.grapple || A.swing) && B && !rope) { const an = anchors.filter((a) => a.y < p.y && Math.abs(a.x - p.x) < 190 && (a.x - p.x) * (A.swing ? 1 : p.face) > -40).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (an) rope = { a: an, len: Math.hypot(an.x - p.x, an.y - p.y) }; }
  if (rope && !BH) { rope = null; p.vy -= 120; }
  const ax = (R ? 1 : 0) - (L ? 1 : 0); if (ax) p.face = ax;
  if (dashT > 0) { dashT -= dt; p.vx = p.face * 520; p.vy = 0; }
  else if (rope) { p.vx += ax * 300 * dt; }
  else { const target = ax * (A.swing ? 150 : 175); p.vx += (target - p.vx) * Math.min(1, dt * (p.ground ? 16 : 7)); }
  if (dashT <= 0) p.vy = Math.min(p.vy + 1400 * dt, 700);
  if (p.ground) coyote = 0.08;
  if (jumpBuf > 0 && coyote > 0) { k.sfx('jump'); p.vy = -520; jumpBuf = 0; coyote = 0; }
  else if (jumpBuf > 0 && A.wall && !p.ground && (tileAt(p.x - 2, p.y + 9) === 1 || tileAt(p.x + p.w + 2, p.y + 9) === 1)) { const s = tileAt(p.x - 2, p.y + 9) === 1 ? 1 : -1; p.vy = -480; p.vx = s * 230; p.face = s; jumpBuf = 0; }
  if (!JH && p.vy < -220 && !rope) p.vy = -220;
  if (rope) { const dx = p.x + 7 - rope.a.x, dy = p.y + 9 - rope.a.y, d = Math.hypot(dx, dy); if (d > rope.len) { const nx = dx / d, ny = dy / d, vd = p.vx * nx + p.vy * ny; if (vd > 0) { p.vx -= vd * nx; p.vy -= vd * ny; } p.x = rope.a.x + nx * rope.len - 7; p.y = rope.a.y + ny * rope.len - 9; } rope.len = Math.max(40, rope.len - 30 * dt); }
  p.wallHit = 0; collideTiles(p, dt);
  if (M === 'barrels') { p.x = k.clamp(p.x, 0, W - p.w); bT -= dt; if (bT <= 0) { bT = Math.max(1.1, 2.6 - level * 0.2) * k.rnd(0.8, 1.3); barrels.push({ x: W - 60, y: (MH - 16) * T - 14, w: 14, h: 14, vx: 0, vy: 0, dir: -1 }); }
    for (const b of barrels) { const wasG = b.ground; b.vy = Math.min(b.vy + 1400 * dt, 600); b.vx = b.dir * (110 + level * 10); b.wallHit = 0; collideTiles(b, dt); if (b.wallHit) b.dir *= -1; if (!wasG && b.ground && b.hadAir) b.dir *= -1; b.hadAir = !b.ground; if (b.x < 0 || b.x > W - b.w) { b.dir *= -1; b.x = k.clamp(b.x, 0, W - b.w); }
      if (Math.abs(b.x + 7 - p.x - 7) < 13 && Math.abs(b.y + 7 - p.y - 9) < 14) return die();
      if (!b.jumped && Math.abs(b.x - p.x) < 10 && p.y + p.h < b.y && p.y + p.h > b.y - 40) { b.jumped = true; score += 100; } if (b.y > H) b.dead = true; }
    barrels = barrels.filter((b) => !b.dead); }
  // enemigos
  for (const e of enemies) if (e.alive) { e.x += e.vx * dt; if (e.x < e.min || e.x > e.max) { e.vx *= -1; e.x = k.clamp(e.x, e.min, e.max); }
    const hit = p.x + p.w > e.x && p.x < e.x + e.w && p.y + p.h > e.y && p.y < e.y + e.h;
    if (swordT > 0 && Math.abs(e.x + 8 - (p.x + 7 + p.face * 18)) < 22 && Math.abs(e.y + 8 - p.y - 9) < 20) { e.alive = false; score += 100; k.burst(e.x + 8, e.y + 8, PAL.enemy, 14); k.sfx('hit'); continue; }
    if (hit) { if (p.vy > 0 && p.y + p.h - e.y < 10 || dashT > 0) { e.alive = false; p.vy = -380; score += 100; k.burst(e.x + 8, e.y + 8, PAL.enemy, 14); k.sfx('hit'); } else return die(); } }
  for (const co of coins) if (!co.got && Math.abs(co.x - p.x - 7) < 14 && Math.abs(co.y - p.y - 9) < 16) { co.got = true; score += 10; k.sfx('coin'); k.burst(co.x, co.y, PAL.coin, 8, 90); }
  for (const cx of [p.x + 2, p.x + p.w - 2]) if (tileAt(cx, p.y + p.h - 2) === 3 || tileAt(cx, p.y + 4) === 3) return die();
  if (p.y > MH * T + 40) return die();
  if (Math.abs(p.x - flag.x) < 18 && p.y + p.h > flag.y - 60 && p.y < flag.y + 4) { k.sfx('win'); k.confetti(); score += 500 * level; level++; const s = score, lv = lives; build(); score = s; lives = lv; return; }
  cam = M === 'barrels' ? 0 : k.clamp(p.x - W * 0.4, 0, MW * T - W);
}, () => {
  k.clear(PAL.sky);
  if (port) {
    c.save(); c.translate(0, -cam);
    if (M === 'ninja') { k.rect(0, cam - 20, 40, H + 40, PAL.ground); k.rect(W - 40, cam - 20, 40, H + 40, PAL.ground);
      for (const e of enemies) if (e.y > cam - 100 && e.y < cam + H + 100) { c.fillStyle = PAL.spike; for (let y = e.y; y < e.y + e.h; y += 12) { c.beginPath(); if (e.side < 0) { c.moveTo(40, y); c.lineTo(56, y + 6); c.lineTo(40, y + 12); } else { c.moveTo(W - 40, y); c.lineTo(W - 56, y + 6); c.lineTo(W - 40, y + 12); } c.fill(); } } }
    for (const q of platforms) if (!q.gone && q.y > cam - 20 && q.y < cam + H + 20) k.rrect(q.x, q.y, q.w, 10, 5, q.kind === 'break' ? '#8a6d5a' : q.kind === 'move' ? PAL.coin : PAL.top);
    for (const co of coins) if (!co.got) k.circle(co.x, co.y, 6, PAL.coin);
    k.rrect(p.x, p.y, p.w, p.h, 4, PAL.p); k.rect(p.x + (p.face > 0 ? 8 : 2), p.y + 4, 4, 4, '#111');
    if (M === 'lava') { const g2 = c.createLinearGradient(0, lava, 0, lava + 60); g2.addColorStop(0, '#ff7a1a'); g2.addColorStop(1, '#b3261e'); c.fillStyle = g2; c.fillRect(0, lava, W, H * 2); }
    c.restore(); k.text(Math.floor(score), W / 2, 12, 24, '#fff', 'center'); return;
  }
  c.save(); c.translate(-Math.floor(cam), 0);
  const x0 = Math.max(0, Math.floor(cam / T)), x1 = Math.min(MW, x0 + Math.ceil(W / T) + 2);
  for (let y = 0; y < MH; y++) for (let x = x0; x < x1; x++) { const v = map[y][x]; if (!v) continue;
    if (v === 1) { k.rect(x * T, y * T, T, T, PAL.ground); if (!map[y - 1] || map[y - 1][x] !== 1) k.rect(x * T, y * T, T, 4, PAL.top); }
    else if (v === 2) k.rect(x * T, y * T, T, 6, M === 'barrels' ? '#ff5fa2' : PAL.top);
    else { c.fillStyle = PAL.spike; c.beginPath(); c.moveTo(x * T, y * T + T); c.lineTo(x * T + T / 2, y * T + 4); c.lineTo(x * T + T, y * T + T); c.fill(); } }
  for (const a of anchors) k.circle(a.x, a.y, 6, '#b8b6e0');
  if (rope) { c.strokeStyle = '#f5f1e6'; c.lineWidth = 2; c.beginPath(); c.moveTo(rope.a.x, rope.a.y); c.lineTo(p.x + 7, p.y + 9); c.stroke(); }
  for (const co of coins) if (!co.got) k.circle(co.x, co.y, 5, PAL.coin);
  for (const e of enemies) if (e.alive) { k.rrect(e.x, e.y, e.w, e.h, 5, PAL.enemy); k.rect(e.x + (e.vx > 0 ? 9 : 3), e.y + 4, 4, 4, '#111'); }
  if (barrels) for (const b of barrels) { k.circle(b.x + 7, b.y + 7, 7, '#b5651d'); c.strokeStyle = '#6b3a12'; c.beginPath(); c.arc(b.x + 7, b.y + 7, 4, t * 8 * b.dir, t * 8 * b.dir + 3); c.stroke(); }
  k.rect(flag.x, flag.y - 60, 3, 60, '#ddd'); k.rect(flag.x + 3, flag.y - 60, 20, 13, '#7cf7a0');
  if (dashT > 0) { c.globalAlpha = 0.4; k.rrect(p.x - p.face * 14, p.y, p.w, p.h, 4, PAL.p); c.globalAlpha = 1; }
  k.rrect(p.x, p.y, p.w, p.h, 4, PAL.p); k.rect(p.x + (p.face > 0 ? 8 : 2), p.y + 4, 4, 4, '#111');
  if (swordT > 0) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(p.x + 7, p.y + 9, 22, p.face > 0 ? -1.2 : 1.9, p.face > 0 ? 1.2 : 4.3); c.stroke(); }
  c.restore();
  k.text(`${Math.floor(score)}`, 10, 8, 16); k.text(`Nv ${level}  ${'♥'.repeat(Math.max(0, lives))}`, W - 10, 8, 14, '#ff9ad5', 'right');
});
