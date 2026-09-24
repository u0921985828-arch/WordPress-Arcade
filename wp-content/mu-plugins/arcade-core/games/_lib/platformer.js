/* Plataformas laterales HD con arte propio (ART). T = 32 px; héroe 22×30 px (≈0,7×0,95 casillas).
 * CFG.theme, CFG.abil {wall,dash,sword,grapple,swing}, CFG.enemies (0-1), CFG.spikes (0-1) */
const A = CFG.abil || {}, TH = ART.THEMES[CFG.theme || 'meadow'];
const W = 640, H = 360, T = 32, MH = 16;
const k = Kit({ w: W, h: H, title: CFG.title, bg: TH.sky[0] }), c = k.ctx;
/* Física ajustada a la escala de 32 px */
const G = 2300, JUMP = 830, CUT = 350, RUN = A.swing ? 250 : 285, FALL = 1100, COYOTE = 0.09, BUFFER = 0.13;
let map, MW, p, enemies, coins, anchors, decos, flag, check, cx = 0, cy = 0, level, lives, score, coinsGot, t, jumpBuf, coyote, rope, dashT, dashCd, swordT, dead, intro, landSq, spawn;
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = ART.OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
const tileAt = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (tx < 0 || tx >= MW) return 1; if (ty < 0 || ty >= MH) return 0; return map[ty][tx]; };
function gen() {
  const lv = Math.min(1, (level - 1) / 8); MW = 62 + Math.min(level, 12) * 16; map = Array.from({ length: MH }, () => Array(MW).fill(0)); enemies = []; coins = []; anchors = []; decos = [];
  const col = (x, h) => { for (let y = MH - h; y < MH; y++) if (x >= 0 && x < MW) map[y][x] = 1; };
  const spare = []; // tramos aptos sin enemigo: garantizan un mínimo por nivel
  let x = 0, h = 3; for (; x < 7; x++) col(x, h);
  for (let i = 3; i < 7; i++) coins.push({ x: (i + 0.5) * T, y: (MH - h - 1) * T - 6 - Math.sin((i - 3) / 3 * Math.PI) * 26 }); // arranque con algo que recoger
  if (!A.swing) decos.push({ x: 1.5 * T, y: (MH - h) * T });
  while (x < MW - 10) {
    let nh = A.swing ? k.clamp(h + k.ri(-2, 1), 2, 7) : k.clamp(h + k.ri(-2, lv < 0.25 ? 2 : 3), 2, 8); // en balanceo la isla siguiente no sube más de 1 casilla
    const r = Math.random();
    if (A.swing || r < 0.18 + lv * 0.14) {
      const gw = A.swing ? k.ri(5, lv < 0.25 ? 6 : 7) : A.dash && Math.random() < 0.2 + lv * 0.2 ? k.ri(5, 6) : k.ri(2, lv < 0.25 ? 3 : 4);
      if (A.grapple || A.swing) anchors.push({ x: (x + gw / 2) * T, y: (MH - Math.max(h, nh) - 5) * T }); // anilla sobre la orilla más alta
      for (let i = 0; i < gw; i += 2) coins.push({ x: (x + i + 0.5) * T, y: (MH - h - 3) * T - Math.sin(i / gw * Math.PI) * T * 1.5 });
      x += gw;
    }
    if (A.wall && Math.random() < 0.3 && h < 5) { // chimenea para salto de pared
      nh = h + 5; for (let i = 0; i < 5; i++) col(x + i, h);
      for (let y = MH - nh - 1; y < MH - h - 3; y++) map[y][x + 1] = 1;
      x += 5; for (let i = 0; i < 3; i++) col(x + i, nh); x += 3; h = nh; continue;
    }
    const seg = A.swing ? k.ri(2, 4) : k.ri(4, 9);
    for (let i = 0; i < seg; i++) {
      col(x + i, nh);
      if (CFG.spikes && i > 0 && i < seg - 1 && x > 10 && Math.random() < CFG.spikes * (0.4 + 0.6 * lv)) map[MH - nh - 1][x + i] = 3;
      else if (Math.random() < 0.22) coins.push({ x: (x + i + 0.5) * T, y: (MH - nh - 1) * T - 6 });
      else if (Math.random() < 0.12 && !A.swing) decos.push({ x: (x + i + 0.5) * T, y: (MH - nh) * T });
    }
    const foe = () => ({ x: (x + 1) * T, y: (MH - nh) * T - 24, w: 26, h: 24, vx: (55 + 55 * lv) * k.pick([-1, 1]), min: x * T, max: (x + seg) * T - 26, alive: true, fly: TH.enemy === 'bird' });
    if (CFG.enemies && seg >= 5 && x > 12) { if (Math.random() < CFG.enemies * (0.55 + 0.45 * lv)) enemies.push(foe()); else spare.push(foe()); }
    if (Math.random() < 0.22 && !A.swing && seg >= 4) { const py = MH - nh - 4; for (let i = 1; i < 4; i++) if (map[py] && !map[py][x + i]) map[py][x + i] = 2; for (let i = 1; i < 4; i++) coins.push({ x: (x + i + 0.5) * T, y: (py - 1) * T + 10 }); }
    x += seg; h = nh;
    if (!check && x > MW / 2) check = { x: (x - 2) * T, y: (MH - h) * T, on: false };
  }
  if (CFG.enemies) { k.shuffle(spare); while (enemies.length < 2 + Math.round(2 * lv) && spare.length) enemies.push(spare.pop()); }
  for (; x < MW; x++) col(x, h); flag = { x: (MW - 5) * T, y: (MH - h) * T };
  spawn = { x: 3 * T, y: (MH - 3) * T - 40 };
}
function mkP(s) { return { x: s.x, y: s.y, vx: 0, vy: 0, w: 22, h: 30, face: 1, ground: false, state: 'idle', wall: 0 }; }
function build() { check = null; gen(); p = mkP(spawn); t = 0; rope = null; dashT = 0; dashCd = 0; swordT = 0; jumpBuf = 0; coyote = 0; dead = 0; intro = 1.6; landSq = 0; cx = 0; cy = (MH * T - H); }
function reset() { level = 1; lives = 3; score = 0; coinsGot = 0; build(); }
reset(); k.show(CFG.title, CFG.help);
function die() { if (dead) return; dead = 1.1; p.vy = -600; k.sfx('hurt'); k.shake(8); k.flash('rgba(255,60,80,.35)'); }
function respawn() { lives--; if (lives <= 0) return k.lose(CFG.id, score, 'Sin vidas', `Nivel ${level} · ${coinsGot} moneda${coinsGot === 1 ? '' : 's'}`); const s = check && check.on ? { x: check.x, y: check.y - 40 } : spawn; p = mkP(s); rope = null; dead = 0; dashT = 0; }
function collide(o, dt) {
  o.x += o.vx * dt; o.wall = 0;
  for (const yy of [o.y + 2, o.y + o.h / 2, o.y + o.h - 2]) for (const xx of [o.x, o.x + o.w]) if (tileAt(xx, yy) === 1) {
    if (o.vx > 0 || xx === o.x + o.w) { o.x = Math.floor(xx / T) * T - o.w - 0.01; o.wall = 1; } else { o.x = Math.floor(xx / T) * T + T + 0.01; o.wall = -1; } o.vx = 0; }
  const oldB = o.y + o.h; o.y += o.vy * dt; const was = o.ground; o.ground = false;
  for (const xx of [o.x + 2, o.x + o.w - 2]) {
    const tb = tileAt(xx, o.y + o.h), tt = tileAt(xx, o.y);
    if (o.vy >= 0 && (tb === 1 || (tb === 2 && oldB <= Math.floor((o.y + o.h) / T) * T + 2))) { o.y = Math.floor((o.y + o.h) / T) * T - o.h; if (!was && o.vy > 300) { landSq = 0.18; k.burst(o.x + o.w / 2, o.y + o.h, '#fff', 6, 70); } o.vy = 0; o.ground = true; }
    else if (o.vy < 0 && tt === 1) { o.y = Math.floor(o.y / T) * T + T; o.vy = 0; }
  }
}
k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt; intro -= dt; landSq = Math.max(0, landSq - dt);
  if (dead) { dead -= dt; p.vy += G * dt; p.y += p.vy * dt; if (dead <= 0) respawn(); return; }
  let L = k.held.has('left'), R = k.held.has('right'), J = k.hit.has('up') || k.hit.has('a'), JH = k.held.has('up') || k.held.has('a'), B = k.hit.has('b'), BH = k.held.has('b');
  if (A.grapple && !A.swing) { if (k.ptr.down) BH = true; if (k.ptr.hit) B = true; }
  if (A.swing) { R = true; BH = BH || JH || k.ptr.down; B = B || J || k.ptr.hit; J = false; }
  dashCd -= dt; swordT -= dt; jumpBuf -= dt; coyote -= dt;
  if (J) jumpBuf = BUFFER;
  if (A.dash && B && dashCd <= 0) { dashT = 0.16; dashCd = 0.55; k.sfx('shoot'); }
  if (A.sword && (B || k.tap) && swordT <= -0.12) { swordT = 0.22; k.sfx('shoot'); }
  if ((A.grapple || A.swing) && B && !rope) { const an = anchors.filter((a) => a.y < p.y && Math.abs(a.x - p.x) < 330 && (a.x - p.x) * (A.swing ? 1 : p.face) > -60).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (an) { rope = { a: an, len: Math.hypot(an.x - p.x, an.y - p.y) }; k.sfx('jump'); } }
  if (rope && !BH) { rope = null; p.vy -= 200; p.vx *= 1.15; }
  const ax = (R ? 1 : 0) - (L ? 1 : 0); if (ax) p.face = ax;
  if (dashT > 0) { dashT -= dt; p.vx = p.face * 820; p.vy = 0; if (Math.random() < 0.6) k.burst(p.x + 11, p.y + 15, TH.hero === '#1a1530' ? '#b98cff' : TH.hero, 1, 30); }
  else if (rope) p.vx += ax * 500 * dt;
  else { const tgt = ax * RUN; p.vx += (tgt - p.vx) * Math.min(1, dt * (p.ground ? 18 : 8)); }
  const sliding = A.wall && !p.ground && p.wall && p.vy > 0 && ax === p.wall;
  if (dashT <= 0) p.vy = Math.min(p.vy + G * dt, sliding ? 170 : FALL);
  if (p.ground) coyote = COYOTE;
  if (jumpBuf > 0 && coyote > 0) { p.vy = -JUMP; jumpBuf = 0; coyote = 0; k.sfx('jump'); landSq = -0.15; k.burst(p.x + 11, p.y + 30, '#fff', 5, 60); }
  else if (jumpBuf > 0 && A.wall && !p.ground && (tileAt(p.x - 3, p.y + 15) === 1 || tileAt(p.x + p.w + 3, p.y + 15) === 1)) { const s = tileAt(p.x - 3, p.y + 15) === 1 ? 1 : -1; p.vy = -780; p.vx = s * 380; p.face = s; jumpBuf = 0; k.sfx('jump'); k.burst(p.x + (s > 0 ? 0 : 22), p.y + 15, '#fff', 6, 70); }
  if (!JH && p.vy < -CUT && !rope && !A.swing) p.vy = -CUT;
  if (rope) { const dx = p.x + 11 - rope.a.x, dy = p.y + 15 - rope.a.y, d = Math.hypot(dx, dy); if (d > rope.len) { const nx = dx / d, ny = dy / d, vd = p.vx * nx + p.vy * ny; if (vd > 0) { p.vx -= vd * nx; p.vy -= vd * ny; } p.x = rope.a.x + nx * rope.len - 11; p.y = rope.a.y + ny * rope.len - 15; } rope.len = Math.max(60, rope.len - 50 * dt); }
  collide(p, dt);
  p.state = !p.ground ? (sliding ? 'wall' : p.vy < 0 ? 'jump' : 'fall') : Math.abs(p.vx) > 30 ? 'run' : 'idle';
  // enemigos
  for (const e of enemies) if (e.alive) { e.x += e.vx * dt; if (e.x < e.min || e.x > e.max) { e.vx *= -1; e.x = k.clamp(e.x, e.min, e.max); }
    const ey = e.fly ? e.y - 20 + Math.sin(t * 2 + e.min) * 16 : e.y, hit = p.x + p.w > e.x + 3 && p.x < e.x + e.w - 3 && p.y + p.h > ey + 4 && p.y < ey + e.h;
    if (swordT > 0 && Math.abs(e.x + 13 - (p.x + 11 + p.face * 22)) < 30 && Math.abs(ey + 12 - p.y - 15) < 28) { e.alive = false; score += 100; k.burst(e.x + 13, ey + 12, '#fff', 16); k.float('+100', e.x + 13, ey); k.sfx('hit'); continue; }
    if (hit) { if ((p.vy > 0 && p.y + p.h - ey < 14) || dashT > 0) { e.alive = false; p.vy = -620; score += 100; k.burst(e.x + 13, ey + 12, '#fff', 16); k.float('+100', e.x + 13, ey); k.sfx('hit'); } else return die(); } }
  for (const co of coins) if (!co.got && Math.abs(co.x - p.x - 11) < 18 && Math.abs(co.y - p.y - 15) < 22) { co.got = true; coinsGot++; score += 10; k.sfx('coin'); k.burst(co.x, co.y, '#ffc928', 6, 80); }
  for (const xx of [p.x + 4, p.x + p.w - 4]) if (tileAt(xx, p.y + p.h - 3) === 3) return die();
  if (p.y > MH * T + 60) return die();
  if (check && !check.on && p.x > check.x - 10) { check.on = true; k.sfx('coin'); k.float('¡Punto de control!', check.x, check.y - 70, '#7cf7a0'); }
  if (p.x > flag.x - 10) { k.sfx('win'); k.confetti(); score += 500 * level + coinsGot * 5; level++; const s = score, lv = lives, cg = coinsGot; build(); score = s; lives = lv; coinsGot = cg; return; }
  cx += (k.clamp(p.x - W * 0.38 + p.vx * 0.25, 0, MW * T - W) - cx) * Math.min(1, dt * 6);
  cy += (k.clamp(p.y - H * 0.55, 0, MH * T - H) - cy) * Math.min(1, dt * 5);
}, () => {
  ART.background(c, TH, W, H, cx, cy, t);
  c.save(); c.translate(-Math.round(cx), -Math.round(cy));
  const x0 = Math.max(0, Math.floor(cx / T) - 1), x1 = Math.min(MW, x0 + Math.ceil(W / T) + 3);
  for (const d of decos) if (d.x > cx - 60 && d.x < cx + W + 60) ART.deco(c, TH, d.x, d.y, T);
  for (let y = 0; y < MH; y++) for (let x = x0; x < x1; x++) { const v = map[y][x]; if (!v) continue;
    if (v === 1) ART.tile(c, TH, 'ground', x * T, y * T, T, { top: !map[y - 1] || map[y - 1][x] !== 1, left: x > 0 && map[y][x - 1] !== 1, right: x < MW - 1 && map[y][x + 1] !== 1 });
    else ART.tile(c, TH, v === 2 ? 'plank' : 'spike', x * T, y * T, T, {}); }
  for (const a of anchors) ART.anchor(c, a.x, a.y, t);
  if (check) ART.flag(c, check.x, check.y, t, check.on ? '#7cf7a0' : '#8a86b5', 60);
  ART.flag(c, flag.x, flag.y, t, '#ff5f7a', 110);
  for (const co of coins) if (!co.got && co.x > cx - 20 && co.x < cx + W + 20) ART.coin(c, co.x, co.y, t);
  for (const e of enemies) if (e.alive && e.x > cx - 40 && e.x < cx + W + 40) ART.enemy(c, TH.enemy, e.x, e.fly ? e.y - 20 + Math.sin(t * 2 + e.min) * 16 : e.y, e.w, e.h, { t, face: e.vx > 0 ? 1 : -1 });
  if (rope) { c.strokeStyle = ART.OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(rope.a.x, rope.a.y); c.lineTo(p.x + 11, p.y + 12); c.stroke(); c.strokeStyle = '#e6d3a3'; c.lineWidth = 2; c.stroke(); }
  if (dashT > 0) { c.globalAlpha = 0.35; ART.hero(c, p.x + 11 - p.face * 18, p.y + p.h, 1, { face: p.face, state: 'run', t, col: TH.hero }); c.globalAlpha = 1; }
  const sq = landSq > 0 ? landSq : landSq < 0 ? landSq : 0;
  ART.hero(c, p.x + 11, p.y + p.h, 1, { face: p.face, state: dead ? 'fall' : p.state, t, col: TH.hero, squash: sq, sword: A.sword ? (swordT > 0 ? -1.6 + (0.22 - swordT) * 14 : 0.5) : 0 });
  if (swordT > 0) { c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 4; c.beginPath(); c.arc(p.x + 11, p.y + 12, 30, p.face > 0 ? -1.3 : 1.8, p.face > 0 ? 1.1 : 4.2); c.stroke(); }
  c.restore();
  // HUD
  for (let i = 0; i < 3; i++) ART.heart(c, 22 + i * 24, 22, 1.25, i < lives);
  ART.coin(c, 104, 22, 0, 8); label(`× ${coinsGot}`, 116, 13, 17, '#fff');
  label(`${score}`, W - 12, 8, 22, '#fff', 'right'); label(`Nivel ${level}`, W - 12, 34, 13, '#ffc928', 'right');
  if (intro > 0 && k.st === 'play') { c.globalAlpha = Math.min(1, intro); ART.rr(c, W / 2 - 110, H / 2 - 38, 220, 64, 18); c.fillStyle = 'rgba(26,21,48,.8)'; c.fill(); label(`Nivel ${level}`, W / 2, H / 2 - 30, 30, '#fff', 'center'); label(CFG.title, W / 2, H / 2 + 4, 14, '#ffc928', 'center'); c.globalAlpha = 1; }
});
