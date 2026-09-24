/* Plataformas con arte propio (ART). CFG.mode: 'barrels' (vigas y escaleras) | 'ninja' (salto entre paredes) | 'hopper' (rebote en nubes) | 'lava' (la lava sube).
 * CFG.theme opcional; CFG.pal.p = color del héroe; CFG.bg = color de fondo exterior. */
const M = CFG.mode === 'side' ? 'barrels' : CFG.mode, port = M !== 'barrels';
const TH = ART.THEMES[CFG.theme || { barrels: 'factory', ninja: 'night', hopper: 'sky', lava: 'dusk' }[M] || 'factory'], OUT = ART.OUT;
const W = port ? 360 : 480, H = port ? 640 : 360, T = 20;
const k = Kit({ w: W, h: H, title: CFG.title, bg: CFG.bg || TH.sky[0] }), c = k.ctx;
const PAL = CFG.pal || {}, HERO = PAL.p || { barrels: '#5ce1e6', ninja: '#ff4d6d', hopper: '#ff5fa2', lava: '#5ce1e6' }[M];
const BUFFER = 0.12, COYOTE = 0.09, WALL = 46;
let map, MW, MH, p, enemies, coins, anchors, barrels, flag, cam, level, lives, score, t, jumpBuf, coyote, rope, dashT, dashCd, swordT, lava, hiY, platforms, bT;
let plan, planY, planSide, ladders, foes, fx, dead, sq, got, bonus, genY, lastX, startY, intro, throwT, drumT, lvCv, climbPh, steer, diffT;
const R2 = Math.PI * 2, tileAt = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (tx < 0 || tx >= MW || ty < 0 || ty >= MH) return 0; return map[ty][tx]; };
const height = () => Math.max(0, Math.floor((startY - hiY) / 10));
const diff = (y) => Math.min(1, (startY - y) / 14000);
function mkCv(w, h, draw) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * 2); cv.height = Math.ceil(h * 2); const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; draw(g); return cv; }
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function mkP(x, y) { return { x, y, vx: 0, vy: 0, w: port ? 18 : 14, h: port ? 30 : 26, face: 1, ground: false, state: 'idle', lad: null, on: null }; }

/* ================= Generación ================= */
const fyRow = (i) => MH - 1 - i * 3; // fila de la viga i (0 = suelo)
const floorDir = (j) => j === 0 ? 1 : j % 2 ? -1 : 1; // hacia dónde ruedan los barriles en cada piso
function genBarrels() {
  MW = 24; MH = 18; map = Array.from({ length: MH }, () => Array(MW).fill(0)); barrels = []; coins = []; enemies = []; ladders = []; fx = []; bT = 1.4; throwT = 0; drumT = 0; climbPh = 0;
  for (let x = 0; x < MW; x++) map[MH - 1][x] = 1;
  for (let i = 1; i <= 5; i++) { const y = fyRow(i); for (let x = 0; x < MW; x++) if (i % 2 ? x > 2 : x < MW - 3) map[y][x] = 2; }
  for (let i = 0; i < 5; i++) { // dos escaleras por tramo, separadas y lejos de huecos, bandera y lanzador
    const up = i + 1, lo = up % 2 ? 5 : 2, hi = up % 2 ? MW - 3 : MW - 6, cols = [];
    for (let n = 0; n < 40 && cols.length < 2; n++) { const cx = k.ri(lo, up === 5 ? MW - 7 : hi); if (up === 5 && cx < 9) continue; if (cols.every((q) => Math.abs(q - cx) >= 6)) cols.push(cx); }
    for (const cx of cols) ladders.push({ x: cx * T + T / 2, y0: fyRow(up) * T, y1: fyRow(i) * T });
  }
  for (let i = 0; i < 5; i++) for (let n = 0; n < 3; n++) { const cx = k.ri(i % 2 ? 4 : 1, i % 2 ? MW - 2 : MW - 5); if (i === 0 && cx > MW - 4) continue; coins.push({ x: cx * T + T / 2, y: fyRow(i) * T - 16 - (n === 1 ? 26 : 0) }); }
  flag = { x: 7 * T, y: fyRow(5) * T };
  p = mkP(4 * T, (MH - 1) * T - 26); bonus = 3000 + (level - 1) * 500; lvCv = null; intro = 1.5;
}
function cloudW(d) { return k.ri(Math.round(62 - d * 14), Math.round(84 - d * 22)); }
function genMore() {
  if (M === 'ninja') {
    while (genY > cam - H) {
      // ruta planificada (cruces y dobles saltos): los pinchos nunca tapan sus puntos de agarre → siempre hay camino
      while (planY > genY - 700) { const same = Math.random() < 0.35; if (!same) planSide = -planSide; planY -= same ? 118 : 92; plan.push({ side: planSide, y0: planY - 8, y1: planY + 30 + 28 }); }
      const d = diff(genY), gap = k.rnd(95 - d * 30, 175 - d * 85), h = k.ri(40, 50 + Math.round(d * 60));
      genY -= gap + h; const free = (s) => !plan.some((q) => q.side === s && q.y1 > genY && q.y0 < genY + h);
      let side = k.pick([-1, 1]); if (!free(side)) side = -side; if (free(side)) enemies.push({ side, y: genY, h });
      if (Math.random() < 0.55) coins.push({ x: W / 2 + k.rnd(-50, 50), y: genY + h + gap / 2 });
      if (d > 0.08 && Math.random() < 0.12 + d * 0.3) foes.push({ x: k.rnd(WALL + 20, W - WALL - 20), y: genY - k.rnd(20, 60), vx: k.pick([-1, 1]) * (60 + d * 80), ph: Math.random() * 6 });
    }
    return;
  }
  while (genY > cam - 160) {
    const d = diff(genY), r = Math.random();
    if (M === 'hopper') {
      genY -= k.rnd(46, 62 + d * 72); const w = cloudW(d), prev = platforms[platforms.length - 1];
      const kind = r < 0.07 + d * 0.13 ? 'move' : r < 0.14 + d * 0.2 && prev.kind !== 'break' ? 'break' : r < 0.19 + d * 0.2 ? 'spring' : 'n';
      const q = { x: k.rnd(6, W - w - 6), y: genY, w, kind, vx: k.pick([-1, 1]) * (45 + d * 70), sq: 0 }; platforms.push(q);
      if (kind !== 'break' && Math.random() < 0.28) coins.push({ x: q.x + w / 2, y: genY - 30 });
      if (d > 0.05 && kind === 'n' && Math.random() < 0.05 + d * 0.12) foes.push({ x: k.rnd(30, W - 30), y: genY - 70, x0: 0, vx: k.pick([-1, 1]) * (40 + d * 60), ph: Math.random() * 6 });
    } else {
      genY -= k.rnd(62, 78 + d * 24); const w = k.ri(Math.round(96 - d * 34), Math.round(132 - d * 44));
      const cx = k.clamp(lastX + k.pick([-1, 1]) * k.rnd(40, 105), w / 2 + 6, W - w / 2 - 6); lastX = cx;
      const prev = platforms[platforms.length - 1];
      const kind = d > 0.12 && r < 0.12 + d * 0.15 ? 'move' : d > 0.05 && r < 0.3 + d * 0.15 && prev.kind !== 'crumble' ? 'crumble' : 'n';
      platforms.push({ x: cx - w / 2, y: genY, w, kind, vx: k.pick([-1, 1]) * (35 + d * 45), cr: 0, vy: 0 });
      if (Math.random() < 0.35) coins.push({ x: cx + k.rnd(-w / 3, w / 3), y: genY - 22 });
    }
  }
}
function genVert() {
  platforms = []; enemies = []; coins = []; foes = []; fx = []; cam = 0; lava = H + 260; lastX = W / 2;
  if (M === 'ninja') { p = mkP(WALL, H - 140); p.side = -1; p.cling = true; p.face = 1; genY = H - 200; planY = p.y; planSide = -1; plan = [{ side: -1, y0: p.y - 8, y1: p.y + 58 }]; }
  else { platforms.push({ x: -10, y: H - 40, w: W + 20, kind: 'floor', sq: 0 }); p = mkP(W / 2 - 9, H - 70); genY = H - 40; }
  startY = hiY = p.y; genMore();
}
function build() { t = 0; rope = null; dashT = 0; dashCd = 0; swordT = 0; jumpBuf = 0; coyote = 0; cam = 0; dead = 0; sq = 0; steer = 0; diffT = 0; if (M === 'barrels') genBarrels(); else genVert(); }
let rec = 0;
function reset() { try { rec = +localStorage.getItem('best:' + CFG.id) || 0; } catch (e) { /* sin almacenamiento */ } level = 1; lives = 3; score = 0; got = 0; build(); }
reset(); k.show(CFG.title, CFG.help);

/* ================= Muerte ================= */
function die(col) {
  if (dead) return; dead = 1.1; p.vy = -520; p.lad = null; k.sfx('hurt'); k.shake(8); k.flash('rgba(255,60,80,.35)');
  k.burst(p.x + p.w / 2, p.y + p.h / 2 - (port ? cam : 0), col || '#fff', 18, 220);
}
function finish() {
  if (M === 'barrels') {
    lives--; if (lives <= 0) return k.lose(CFG.id, score, 'Sin vidas', `Nivel ${level} · ${got} moneda${got === 1 ? "" : "s"}`);
    p = mkP(4 * T, (MH - 1) * T - 26); barrels = []; bT = 1.4; dead = 0; bonus = 3000 + (level - 1) * 500; intro = 1; return;
  }
  const m = Math.floor(height() / 3.2);
  k.lose(CFG.id, Math.floor(score), { ninja: 'Fin de la escalada', hopper: '¡Te caíste!', lava: '¡Te alcanzó la lava!' }[M] || 'Fin', `${m} m · ${got} moneda${got === 1 ? "" : "s"}`);
}
function coinGet(co, oy) { co.got = true; got++; score += port ? 25 : 10; k.sfx('coin'); k.burst(co.x, co.y - oy, '#ffc928', 8, 90); k.float(port ? '+25' : '+10', co.x, co.y - oy - 12, '#ffc928'); }

/* ================= Actualización ================= */
k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt; sq += (0 - sq) * Math.min(1, dt * 10); intro -= dt;
  for (const f of fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; } fx = fx.filter((f) => f.t < f.max);
  if (dead) { dead -= dt; p.vy += 1500 * dt; p.y += p.vy * dt; if (dead <= 0) finish(); return; }
  const L = k.held.has('left'), R = k.held.has('right'), U = k.held.has('up'), D = k.held.has('down');
  const J = k.hit.has('up') || k.hit.has('a'), kx = (R ? 1 : 0) - (L ? 1 : 0);
  if (M === 'barrels') return upBarrels(dt, L, R, U, D, kx);
  if (M === 'ninja') return upNinja(dt, J || k.hit.has('left') || k.hit.has('right') || k.ptr.hit);
  upVert(dt, J, kx);
}, draw);

function landTiles(o, dt) { // vigas de un solo sentido: se atraviesan desde abajo
  const oldB = o.y + o.h; o.y += o.vy * dt; o.ground = false; if (o.vy < 0) return;
  for (const xx of [o.x + 2, o.x + o.w - 2]) { const v = tileAt(xx, o.y + o.h); if (v === 1 || v === 2) { const top = Math.floor((o.y + o.h) / T) * T; if (oldB <= top + 2) { o.y = top - o.h; o.vy = 0; o.ground = true; return; } } }
}
function upBarrels(dt, L, R, U, D, kx) {
  const pcx = p.x + p.w / 2, feet = p.y + p.h;
  let J = k.hit.has('a') || k.swipe === 'up';
  if (k.ptr.down) { const dx = k.ptr.x - pcx; if (dx < -18) L = true; else if (dx > 18) R = true; if (k.ptr.y < p.y - 10) U = true; else if (k.ptr.y > feet + 12) D = true; kx = (R ? 1 : 0) - (L ? 1 : 0); }
  if (!p.lad && p.ground && (U || D)) { const l = ladders.find((q) => Math.abs(q.x - pcx) < 10 && (U ? Math.abs(feet - q.y1) < 3 : Math.abs(feet - q.y0) < 3)); if (l) { p.lad = l; p.x = l.x - p.w / 2; p.vx = 0; p.vy = 0; jumpBuf = 0; } }
  if (!p.lad && (k.hit.has('up') || (k.ptr.hit && k.ptr.y < p.y - 10))) J = true;
  bonus = Math.max(0, bonus - dt * 50);
  jumpBuf -= dt; coyote -= dt; if (J && !p.lad) jumpBuf = BUFFER;
  if (p.lad) {
    const l = p.lad, dir = (D ? 1 : 0) - (U ? 1 : 0); p.y += dir * 90 * dt; climbPh += Math.abs(dir) * dt; p.state = 'climb';
    if (p.y + p.h <= l.y0) { p.y = l.y0 - p.h; p.lad = null; p.ground = true; sq = 0.15; }
    else if (p.y + p.h >= l.y1) { p.y = l.y1 - p.h; p.lad = null; p.ground = true; }
    if (k.hit.has('a') && p.lad) { p.lad = null; p.vy = -380; p.vx = kx * 120; k.sfx('jump'); }
  } else {
    if (kx) p.face = kx;
    p.vx += (kx * 125 - p.vx) * Math.min(1, dt * (p.ground ? 16 : 6));
    p.vy = Math.min(p.vy + 1500 * dt, 700);
    if (p.ground) coyote = COYOTE;
    if (jumpBuf > 0 && coyote > 0) { p.vy = -500; jumpBuf = 0; coyote = 0; k.sfx('jump'); sq = -0.2; k.burst(pcx, feet, 'rgba(255,255,255,.8)', 5, 60); }
    p.x = k.clamp(p.x + p.vx * dt, 0, W - p.w);
    const was = p.ground, vy0 = p.vy; landTiles(p, dt);
    if (p.ground && !was && vy0 > 250) { sq = 0.22; k.burst(p.x + p.w / 2, p.y + p.h, 'rgba(255,255,255,.7)', 5, 60); }
    p.state = !p.ground ? (p.vy < 0 ? 'jump' : 'fall') : Math.abs(p.vx) > 20 ? 'run' : 'idle';
  }
  if (intro > 0) return;
  // lanzador y barriles
  throwT -= dt; bT -= dt;
  if (bT <= 0) { bT = Math.max(1.2, 3.6 - (level - 1) * 0.28) * k.rnd(0.8, 1.25); throwT = 0.45; k.sfx('pop'); barrels.push({ x: W - 78, y: fyRow(5) * T - 16, w: 16, h: 16, vy: 0, dir: -1, a: 0, blue: level >= 3 && Math.random() < Math.min(0.4, 0.12 + level * 0.03), seen: new Set(), ground: true }); }
  const spd = Math.min(170, 78 + (level - 1) * 11.5);
  for (const b of barrels) {
    const bcx = b.x + 8;
    if (b.lad) { b.y += 100 * dt; b.a += dt * 3; if (b.y + 16 >= b.lad.y1) { b.y = b.lad.y1 - 16; b.lad = null; b.ground = true; b.dir = floorDir(Math.round((MH - 1 - (b.y + 16) / T) / 3)); } }
    else {
      const was = b.ground; if (b.ground) b.x += b.dir * spd * (b.blue ? 1.15 : 1) * dt; else b.x += b.dir * 60 * dt;
      b.vy = Math.min(b.vy + 1400 * dt, 600); landTiles(b, dt); b.a += (b.ground ? b.dir * spd / 8 : b.dir * 4) * dt;
      if (b.ground && !was) { b.dir = floorDir(Math.round((MH - 1 - (b.y + 16) / T) / 3)); k.shake(1.5); }
      b.x = k.clamp(b.x, 0, W - 16);
      const j = Math.round((MH - 1 - (b.y + 16) / T) / 3);
      if (b.ground && j > 0) for (const l of ladders) if (l.y0 === b.y + 16 && (bcx - l.x) * (b.x + 8 - l.x) <= 0 && !b.seen.has(l)) { b.seen.add(l); if (b.blue || Math.random() < Math.min(0.55, 0.12 + (level - 1) * 0.05)) { b.lad = l; b.x = l.x - 8; } }
      if (b.ground && j === 0 && b.x > W - 52) { b.dead = true; drumT = 0.6; k.burst(W - 30, H - T - 36, '#ffb13d', 10, 120); }
    }
    if (Math.abs(b.x + 8 - (p.x + p.w / 2)) < 12 && Math.abs(b.y + 8 - (p.y + p.h / 2)) < 17) return die('#ffb13d');
    if (!b.jumped && !p.ground && !p.lad && Math.abs(b.x + 8 - (p.x + p.w / 2)) < 12 && p.y + p.h < b.y + 2 && b.y - (p.y + p.h) < 46) { b.jumped = true; score += 100; k.sfx('coin'); k.float('+100', b.x + 8, b.y - 18, '#7cf7a0'); }
  }
  barrels = barrels.filter((b) => !b.dead);
  for (const co of coins) if (!co.got && Math.abs(co.x - p.x - p.w / 2) < 14 && Math.abs(co.y - p.y - p.h / 2) < 18) coinGet(co, 0);
  if (p.ground && Math.abs(p.y + p.h - flag.y) < 2 && Math.abs(p.x + p.w / 2 - flag.x) < 18) {
    const b = Math.round(bonus / 100) * 100; score += 500 * level + b; k.sfx('win'); k.confetti(); k.float(`+${500 * level + b}`, flag.x + 30, flag.y - 40, '#ffc928');
    level++; genBarrels();
  }
}
function upNinja(dt, J) {
  const d = diff(p.y), slide = 32 + d * 60;
  if (p.cling) {
    p.y += slide * dt; p.face = -p.side; p.state = 'wall';
    if (Math.random() < dt * 8) fx.push({ x: p.side < 0 ? WALL + 2 : W - WALL - 2, y: p.y + p.h - 4, vx: -p.side * 10, vy: -20, t: 0, max: 0.4, k: 'dust' });
    if (J) { p.cling = false; p.air = 1; p.vx = -p.side * 560; p.vy = -430; p.face = -p.side; k.sfx('jump'); sq = -0.25; }
  } else {
    if (J && p.air > 0) { p.air = 0; p.vx = -p.vx; p.vy = -400; p.face = Math.sign(p.vx); p.spin = 0.35; k.sfx('jump'); k.burst(p.x + p.w / 2, p.y + p.h - cam, 'rgba(255,255,255,.8)', 7, 80); } // doble salto: vuelve a la misma pared
    p.spin = Math.max(0, (p.spin || 0) - dt);
    p.vy += 1000 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.state = p.vy < 0 ? 'jump' : 'fall';
    if (p.x <= WALL || p.x >= W - WALL - p.w) { p.side = p.x <= WALL ? -1 : 1; p.x = p.side < 0 ? WALL : W - WALL - p.w; p.cling = true; p.vx = 0; p.vy = 0; sq = 0.2; k.sfx('click'); k.burst(p.side < 0 ? WALL : W - WALL, p.y + p.h / 2 - cam, 'rgba(255,255,255,.7)', 5, 60); }
  }
  hiY = Math.min(hiY, p.y);
  for (const e of enemies) { const near = (p.side < 0 && p.cling) || (!p.cling && p.vx < 0 && p.x < WALL + 10) ? -1 : (p.side > 0 && p.cling) || (!p.cling && p.vx > 0 && p.x > W - WALL - p.w - 10) ? 1 : 0; // al despegar no cuenta la pared que dejas
    if (near === e.side && p.y + p.h - 5 > e.y && p.y + 5 < e.y + e.h) return die('#dfe6f2'); }
  for (const f of foes) { f.x += f.vx * dt; if (f.x < WALL + 16 || f.x > W - WALL - 16) f.vx *= -1; if (Math.abs(f.x - p.x - p.w / 2) < 16 && Math.abs(f.y + Math.sin(t * 3 + f.ph) * 8 - p.y - p.h / 2) < 17) return die('#ff9a3d'); }
  for (const co of coins) if (!co.got && Math.abs(co.x - p.x - p.w / 2) < 18 && Math.abs(co.y - p.y - p.h / 2) < 20) coinGet(co, cam);
  diffT += dt; const auto = hiY < startY - 800 ? Math.min(45, 8 + (startY - hiY - 800) / 250) : 0;
  const tgt = p.y - H * 0.6; cam = Math.min(cam - auto * dt, cam + (tgt - cam) * Math.min(1, dt * 5));
  score = height() + got * 25; prune(); genMore();
  if (p.y > cam + H + 10) { k.sfx('hurt'); dead = 0.5; p.vy = 0; }
}
function prune() { const lim = cam + H + 200; enemies = enemies.filter((e) => e.y < lim); if (plan) plan = plan.filter((q) => q.y0 < lim); coins = coins.filter((q) => q.y < lim); foes = foes.filter((q) => q.y < lim); if (platforms.length) platforms = platforms.filter((q) => q.y < lim || q.kind === 'floor' && q.y < lim + 400); }
function upVert(dt, J, kx) {
  const hop = M === 'hopper', G = hop ? 1300 : 1400;
  if (hop) {
    let ax = kx; if (k.ptr.down) ax = k.ptr.x < W / 2 ? -1 : 1;
    if (ax) p.face = ax; p.vx += (ax * 235 - p.vx) * Math.min(1, dt * 10);
  } else {
    const hold = k.ptr.down ? (k.ptr.x < W / 2 ? -1 : 1) : kx;
    if (k.ptr.hit) { steer = k.ptr.x < W / 2 ? -1 : 1; p.face = steer; jumpBuf = BUFFER; }
    if (J) { steer = kx; if (kx) p.face = kx; jumpBuf = BUFFER; }
    jumpBuf -= dt; coyote -= dt; if (p.ground) coyote = COYOTE;
    if (jumpBuf > 0 && coyote > 0) { p.vy = -600; p.vx = steer * 165; jumpBuf = 0; coyote = 0; p.ground = false; p.on = null; k.sfx('jump'); sq = -0.22; k.burst(p.x + p.w / 2, p.y + p.h - cam, 'rgba(255,220,180,.8)', 5, 60); }
    if (p.ground) p.vx = kx * 170;
    else if (hold) { p.vx += (hold * 165 - p.vx) * Math.min(1, dt * 10); p.face = hold; }
    else p.vx *= Math.exp(-dt / 0.33);
    if (kx) p.face = kx;
  }
  if (p.on && p.on.kind === 'move' && p.ground) p.x += p.on.vx * dt;
  p.vy = Math.min(p.vy + G * dt, 900); const oldB = p.y + p.h; p.x += p.vx * dt; p.y += p.vy * dt; const was = p.ground; p.ground = false;
  if (hop) { if (p.x < -p.w) p.x = W; if (p.x > W) p.x = -p.w; } else p.x = k.clamp(p.x, 0, W - p.w);
  for (const q of platforms) {
    if (q.kind === 'move') { q.x += q.vx * dt; if (q.x < 0 || q.x + q.w > W) { q.vx *= -1; q.x = k.clamp(q.x, 0, W - q.w); } }
    if (q.kind === 'crumble' && q.cr > 0) { q.cr += dt; if (q.cr > 0.6) { q.vy += 1200 * dt; q.y += q.vy * dt; if (!q.gone) { q.gone = true; k.sfx('hit'); } } }
    if (q.sq) q.sq = Math.max(0, q.sq - dt * 3);
    if (q.gone) continue;
    if (p.vy >= 0 && oldB <= q.y + 4 && p.y + p.h >= q.y && p.x + p.w > q.x + 3 && p.x < q.x + q.w - 3) {
      p.y = q.y - p.h;
      if (hop) {
        const spring = q.kind === 'spring' && Math.abs(p.x + p.w / 2 - (q.x + q.w / 2)) < 20;
        p.vy = spring ? -1080 : -660; q.sq = 1; sq = 0.28; k.sfx(spring ? 'start' : 'jump');
        if (spring) { k.float('¡Muelle!', q.x + q.w / 2, q.y - cam - 30, '#7cf7a0'); q.sq = 1.4; }
        if (q.kind === 'break') { q.gone = true; k.burst(q.x + q.w / 2, q.y - cam + 6, '#aeb6c8', 16, 110); k.sfx('pop'); }
      } else { p.vy = 0; p.ground = true; p.on = q; if (!was) { sq = 0.2; if (q.kind === 'crumble' && !q.cr) { q.cr = 0.001; k.sfx('click'); } } }
    }
  }
  if (!p.ground) p.on = null;
  p.state = p.ground ? (Math.abs(p.vx) > 25 ? 'run' : 'idle') : p.vy < 0 ? 'jump' : 'fall';
  hiY = Math.min(hiY, p.y);
  for (const co of coins) if (!co.got && Math.abs(co.x - p.x - p.w / 2) < 18 && Math.abs(co.y - p.y - p.h / 2) < 22) coinGet(co, cam);
  for (const f of foes) { if (f.dead) { f.y += 500 * dt; continue; } f.x += f.vx * dt; if (f.x < 24 || f.x > W - 24) f.vx *= -1;
    const fy = f.y + Math.sin(t * 3 + f.ph) * 6;
    if (Math.abs(f.x - p.x - p.w / 2) < 20 && Math.abs(fy - p.y - p.h / 2) < 22) { if (p.vy > 0 && p.y + p.h < fy + 4) { f.dead = true; p.vy = -700; score += 50; k.sfx('hit'); k.burst(f.x, fy - cam, '#ff9a3d', 14, 150); k.float('+50', f.x, fy - cam - 18, '#ffc928'); } else return die('#ff9a3d'); } }
  const tgt = p.y - H * (hop ? 0.42 : 0.5); if (tgt < cam) cam += (tgt - cam) * Math.min(1, dt * 6);
  score = Math.max(score, height() + got * 25);
  if (!hop) {
    diffT += dt; const lq = Math.min(1, Math.max(0, diffT - 3) / 210); lava -= (diffT < 3 ? 4 : 14 + 76 * lq * lq * (3 - 2 * lq)) * dt; lava = Math.min(lava, cam + H + 50);
    if (Math.random() < dt * 14) fx.push({ x: Math.random() * W, y: lava, vx: k.rnd(-12, 12), vy: -k.rnd(30, 70), t: 0, max: k.rnd(1, 2), k: 'ember' });
    if (Math.random() < dt * 5) fx.push({ x: Math.random() * W, y: lava + k.rnd(8, 30), vx: 0, vy: 0, t: 0, max: 0.7, k: 'bubble', r: k.rnd(3, 7) });
    if (p.y + p.h > lava + 6) return die('#ffb13d');
  }
  prune(); genMore();
  if (p.y > cam + H + 30) { k.sfx('hurt'); dead = 0.6; p.vy = 0; }
}

/* ================= Dibujo: piezas ================= */
function girder(g, x, y, w) {
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 3, y + 12, w - 6, 3);
  ART.rr(g, x + 1, y, w - 2, 12, 2); ART.fillOut(g, '#e0484f', 2);
  g.save(); ART.rr(g, x + 2, y + 1, w - 4, 10, 2); g.clip();
  g.strokeStyle = '#8e2231'; g.lineWidth = 1.6; g.beginPath(); for (let xx = x - 4; xx < x + w; xx += 12) { g.moveTo(xx, y + 10); g.lineTo(xx + 6, y + 3); g.lineTo(xx + 12, y + 10); } g.stroke();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y + 1, w, 2); g.restore();
  g.fillStyle = '#ffd6c8'; for (let xx = x + 8; xx < x + w - 4; xx += 24) { g.beginPath(); g.arc(xx, y + 6.5, 1.5, 0, R2); g.fill(); }
}
function ladder(g, x, y0, y1) {
  for (let y = y0 + 5; y < y1 - 2; y += 7) { ART.rr(g, x - 7, y, 14, 3, 1); ART.fillOut(g, '#6fd3ff', 1.5); }
  for (const s of [-8, 8]) { ART.rr(g, x + s - 2, y0 + 2, 4, y1 - y0 - 2, 2); ART.fillOut(g, '#6fd3ff', 1.8); }
}
function renderBarrelLevel() {
  return mkCv(W, H, (g) => {
    for (const l of ladders) ladder(g, l.x, l.y0, l.y1);
    for (let i = 1; i <= 5; i++) { const row = fyRow(i); let x0 = -1; for (let x = 0; x <= MW; x++) { const on = x < MW && map[row][x] === 2; if (on && x0 < 0) x0 = x; if (!on && x0 >= 0) { girder(g, x0 * T, row * T, (x - x0) * T); x0 = -1; } } }
    for (let x = 0; x < MW; x++) ART.tile(g, TH, 'ground', x * T, (MH - 1) * T, T, { top: true });
  });
}
function barrel(x, y, a, blue) {
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x, y + 9, 8, 2.5, 0, 0, R2); c.fill();
  c.save(); c.translate(x, y); c.rotate(a);
  c.beginPath(); c.arc(0, 0, 8.5, 0, R2); ART.fillOut(c, blue ? '#4f8fe0' : '#b8743a', 2.2);
  c.strokeStyle = blue ? '#27538f' : '#7a4520'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, 5, 0, R2); c.stroke();
  c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, 0); c.lineTo(8, 0); c.moveTo(0, -8); c.lineTo(0, 8); c.stroke();
  c.strokeStyle = blue ? '#bfe0ff' : '#e9c07a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-7, 0); c.lineTo(7, 0); c.moveTo(0, -7); c.lineTo(0, 7); c.stroke();
  c.restore(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(x - 3, y - 3.5, 2.2, 0, R2); c.fill();
}
function standBarrel(x, y) { // barril de pie (pila del lanzador)
  ART.rr(c, x - 8, y - 20, 16, 20, 5); ART.fillOut(c, '#b8743a', 2); c.fillStyle = '#6b6f7a'; c.fillRect(x - 8, y - 16, 16, 2.5); c.fillRect(x - 8, y - 6, 16, 2.5);
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x - 5, y - 18, 2.5, 16);
}
function drum(x, y) {
  const fl = drumT > 0 ? 1.8 : 1; drumT = Math.max(0, drumT - 1 / 60);
  for (let i = 0; i < 3; i++) { const h = (10 + Math.sin(t * 12 + i * 2) * 4) * fl; c.beginPath(); c.moveTo(x - 10 + i * 10 - 5, y - 30); c.quadraticCurveTo(x - 10 + i * 10, y - 30 - h * 2, x - 10 + i * 10 + 5, y - 30); ART.fillOut(c, i === 1 ? '#ffd23d' : '#ff7a2d', 1.5); }
  ART.rr(c, x - 15, y - 32, 30, 32, 4); ART.fillOut(c, '#3d6fd6', 2.2); c.fillStyle = '#27478f'; c.fillRect(x - 14, y - 24, 28, 3); c.fillRect(x - 14, y - 10, 28, 3);
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x - 11, y - 29, 3, 26);
}
function thrower(x, y) {
  const th = throwT > 0 ? throwT / 0.45 : 0;
  for (let i = 0; i < 3; i++) standBarrel(x + 26 + (i % 2) * 8, y - (i === 2 ? 20 : 0) - 0);
  ART.enemy(c, 'robot', x - 15, y - 28, 30, 28, { t, face: -1 });
  c.save(); c.translate(x - 14, y - 15); c.rotate(-0.4 - th * 1.4); c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.moveTo(0, 0); c.lineTo(-12, 4); c.stroke(); c.strokeStyle = '#c7d0da'; c.lineWidth = 4; c.stroke(); c.restore();
}
function spikes(e) { // bandeja de pinchos clavada en la pared
  const s = e.side, bx = s < 0 ? WALL : W - WALL, n = Math.max(2, Math.round(e.h / 14)), hh = e.h / n;
  ART.rr(c, s < 0 ? bx - 4 : bx - 2, e.y - 2, 6, e.h + 4, 2); ART.fillOut(c, '#6b6f86', 2);
  c.beginPath(); for (let i = 0; i < n; i++) { const y = e.y + i * hh; c.moveTo(bx, y + 1); c.lineTo(bx - s * 17, y + hh / 2); c.lineTo(bx, y + hh - 1); } ART.fillOut(c, '#dfe6f2', 2);
  c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < n; i++) c.fillRect(bx - s * 6 - 1, e.y + i * hh + hh / 2 - 3, 2, 3);
}
let wallCv = null, cloudCache = {}, rockCache = {};
function renderWall() { // ladrillos de piedra con musgo, tesela vertical de 160 px
  return mkCv(WALL, 160, (g) => {
    g.fillStyle = TH.ground; g.fillRect(0, 0, WALL, 160);
    for (let r = 0; r < 8; r++) { const y = r * 20, off = r % 2 ? -14 : 0; for (let x = off; x < WALL; x += 28) { ART.rr(g, x + 1.5, y + 1.5, 25, 17, 4); g.fillStyle = (r * 3 + x) % 5 ? '#45366a' : '#4e3e78'; g.fill(); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 3, y + 3, 20, 2); } }
    g.fillStyle = 'rgba(80,200,120,.35)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(8 + (i * 17) % 30, 12 + i * 33, 4 + (i % 3), 0, R2); g.fill(); }
  });
}
function walls() {
  if (!wallCv) wallCv = renderWall();
  const off = ((cam % 160) + 160) % 160;
  for (let y = -off; y < H; y += 160) { c.drawImage(wallCv, 0, y, WALL, 160); c.save(); c.translate(W, 0); c.scale(-1, 1); c.drawImage(wallCv, 0, y, WALL, 160); c.restore(); }
  for (const x of [WALL, W - WALL]) { c.fillStyle = OUT; c.fillRect(x - 2, 0, 4, H); c.fillStyle = TH.top; c.fillRect(x + (x < W / 2 ? -5 : 2), 0, 3, H); }
}
function cloud(w, kind) {
  const key = w + kind; if (cloudCache[key]) return cloudCache[key];
  const col = kind === 'break' ? '#aab2c6' : kind === 'move' ? '#fff3c9' : '#ffffff', dark = kind === 'break' ? '#8790a8' : kind === 'move' ? '#f2d98a' : '#cfe8ff';
  const cv = mkCv(w + 16, 40, (g) => {
    const n = Math.max(3, Math.round(w / 20)), bumps = [];
    for (let i = 0; i < n; i++) { const bx = 8 + 10 + i * (w - 20) / (n - 1); bumps.push([bx, 20 - (i % 2 ? 3 : 0) - (i > 0 && i < n - 1 ? 2 : 0), i % 2 ? 11 : 13]); }
    const shape = () => { g.beginPath(); for (const [x, y, r] of bumps) { g.moveTo(x + r, y); g.arc(x, y, r, 0, R2); } g.moveTo(8 + w, 28); g.ellipse(8 + w / 2, 28, w / 2, 8, 0, 0, R2); };
    g.strokeStyle = OUT; g.lineWidth = 5; shape(); g.stroke(); g.fillStyle = col; shape(); g.fill();
    g.save(); shape(); g.clip(); g.fillStyle = dark; g.fillRect(0, 29, w + 16, 20); g.fillStyle = 'rgba(255,255,255,.7)'; for (const [x, y, r] of bumps) { g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, R2); g.fill(); } g.restore();
    if (kind === 'break') { g.strokeStyle = '#5a6078'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 12); g.lineTo(w / 2 + 6, 22); g.lineTo(w / 2 + 1, 26); g.lineTo(w / 2 + 8, 34); g.stroke(); }
    if (kind === 'move') { g.fillStyle = '#e0a93a'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(8 + w / 2 + s * 12, 25); g.lineTo(8 + w / 2 + s * 18, 21); g.lineTo(8 + w / 2 + s * 18, 29); g.closePath(); g.fill(); } }
  });
  return (cloudCache[key] = cv);
}
function rock(w, kind) {
  const key = w + kind; if (rockCache[key]) return rockCache[key];
  const cv = mkCv(w + 6, 34, (g) => {
    const base = kind === 'crumble' ? '#7a5a4a' : kind === 'move' ? '#6b6f86' : '#3f2c3c', top = kind === 'crumble' ? '#a07a5c' : kind === 'move' ? '#9aa0b8' : '#6e4a5a';
    g.beginPath(); g.moveTo(3, 3); g.lineTo(w + 3, 3); g.lineTo(w + 1, 14); g.lineTo(w - 8, 24); g.lineTo(w * 0.6, 20); g.lineTo(w * 0.45, 30); g.lineTo(w * 0.3, 22); g.lineTo(10, 26); g.lineTo(4, 14); g.closePath(); ART.fillOut(g, base, 2.5);
    ART.rr(g, 2, 1, w + 2, 8, 4); ART.fillOut(g, top, 2.2); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(6, 2.5, w - 6, 2);
    if (kind === 'move') { g.fillStyle = '#d6dbe6'; for (let x = 10; x < w; x += 18) { g.beginPath(); g.arc(x, 14, 1.8, 0, R2); g.fill(); } }
    else { g.strokeStyle = kind === 'crumble' ? OUT : '#ff7a2d'; g.lineWidth = kind === 'crumble' ? 1.5 : 2; g.lineCap = 'round'; g.beginPath(); for (let x = 10, i = 0; x < w - 8; x += 17 + (i * 7) % 11, i++) { const a = (i * 5) % 3 - 1; g.moveTo(x, 10); g.lineTo(x + a * 4, 15 + (i % 2) * 2); g.lineTo(x + a * 2 + 3, 19 + (i % 3)); if (i % 2) { g.moveTo(x + a * 4, 15); g.lineTo(x + a * 4 + 6, 17); } } g.stroke(); }
  });
  return (rockCache[key] = cv);
}
function hero(o, s) {
  const x = o.x + o.w / 2, y = o.y + o.h, st = dead ? 'fall' : o.state === 'climb' ? 'fall' : o.state === 'wall' ? 'idle' : o.state;
  if (!dead && o.ground) { c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x, y + 1, 9 * s, 2.5, 0, 0, R2); c.fill(); }
  c.save(); const rot = dead ? (1.1 - dead) * 7 : o.spin ? -o.face * (1 - o.spin / 0.35) * R2 : 0; if (rot) { c.translate(x, y - 15 * s); c.rotate(rot); c.translate(-x, -(y - 15 * s)); }
  const face = o.state === 'climb' ? (Math.sin(climbPh * 14) > 0 ? 1 : -1) : o.face;
  ART.hero(c, x, y, s, { face, state: st, t, col: HERO, squash: sq }); c.restore();
}

/* ================= Dibujo: escenas ================= */
function draw() {
  if (M === 'barrels') return drawBarrels();
  ART.background(c, TH, W, H, 0, Math.max(cam, -3000), t);
  if (M === 'hopper') { const a = Math.min(0.75, Math.max(0, -cam / 16000)); if (a > 0) { c.fillStyle = `rgba(22,16,64,${a})`; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { c.globalAlpha = a * (0.5 + 0.5 * Math.sin(t * 2 + i)); c.fillRect((i * 97) % W, ((i * 173 - cam * 0.05) % H + H) % H, 2, 2); } c.globalAlpha = 1; } }
  if (M === 'lava') { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(40,10,30,.55)'); g.addColorStop(1, 'rgba(90,20,10,.25)'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  if (M === 'ninja') walls();
  c.save(); c.translate(0, -Math.round(cam));
  // marcas de altura cada 10 m (32 px = 1 m)
  for (let m = Math.ceil((startY - cam - H) / 320); m <= Math.floor((startY - cam) / 320); m++) { if (m <= 0) continue; const y = startY - m * 320; c.globalAlpha = 0.6; c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(port && M === 'ninja' ? WALL : 0, y, M === 'ninja' ? W - WALL * 2 : W, 2); c.globalAlpha = 1; label(`${m * 10} m`, M === 'ninja' ? W / 2 : 6, y - 18, 12, 'rgba(255,255,255,.85)', M === 'ninja' ? 'center' : 'left'); }
  if (M === 'ninja') for (const e of enemies) if (e.y > cam - 100 && e.y < cam + H + 20) spikes(e);
  for (const q of platforms) { if (q.y < cam - 40 || q.y > cam + H + 40) continue;
    if (q.kind === 'floor') { if (M === 'hopper') { for (let x = -10; x < W + 10; x += 70) c.drawImage(cloud(80, 'n'), x - 8, q.y - 10, 96, 40); } else { for (let x = 0; x < W; x += T) ART.tile(c, TH, 'ground', x, q.y, T, { top: true }); c.fillStyle = TH.ground; c.fillRect(0, q.y + T, W, 200); } continue; }
    if (q.gone && (M === 'hopper' || q.y > cam + H)) continue;
    if (M === 'hopper') { const s = Math.sin(q.sq * 9) * q.sq * 0.12; c.save(); c.translate(q.x + q.w / 2, q.y + 6); c.scale(1 + s, 1 - s); c.drawImage(cloud(q.w, q.kind), -q.w / 2 - 8, -16, q.w + 16, 40); c.restore();
      if (q.kind === 'spring') { const e = q.sq > 0 ? q.sq * 8 : 0, sx = q.x + q.w / 2, sy = q.y - 2; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); for (let i = 0; i <= 4; i++) c.lineTo(sx + (i % 2 ? 6 : -6), sy - i * (3 + e / 4)); c.stroke(); c.strokeStyle = '#d6dbe6'; c.lineWidth = 2; c.stroke(); ART.rr(c, sx - 9, sy - 16 - e, 18, 5, 2); ART.fillOut(c, '#ff5f7a', 2); } }
    else { const sh = q.kind === 'crumble' && q.cr > 0 && !q.gone ? Math.sin(t * 60) * 1.5 : 0; c.drawImage(rock(q.w, q.kind), q.x - 3 + sh, q.y - 1, q.w + 6, 34); }
  }
  for (const co of coins) if (!co.got && co.y > cam - 20 && co.y < cam + H + 20) ART.coin(c, co.x, co.y, t, 8);
  for (const f of foes) if (f.y > cam - 40 && f.y < cam + H + 40) { c.save(); if (f.dead) { c.translate(f.x, f.y); c.scale(1, -1); c.translate(-f.x, -f.y); } ART.enemy(c, 'bird', f.x - 14, f.y + Math.sin(t * 3 + f.ph) * (M === 'ninja' ? 8 : 6) - 12, 28, 22, { t, face: f.vx > 0 ? 1 : -1 }); c.restore(); }
  for (const f of fx) if (f.k === 'dust') { c.globalAlpha = 1 - f.t / f.max; c.fillStyle = '#fff'; c.beginPath(); c.arc(f.x, f.y, 2 + f.t * 6, 0, R2); c.fill(); c.globalAlpha = 1; }
  hero(p, 0.82);
  if (M === 'lava') drawLava();
  c.restore();
  if (M === 'lava') { const dd = lava - (p.y + p.h); if (dd < 220) { c.fillStyle = `rgba(255,70,20,${(1 - dd / 220) * (0.18 + 0.06 * Math.sin(t * 8))})`; c.fillRect(0, 0, W, H); } }
  hud();
}
function drawLava() {
  const ly = lava, wave = (x) => ly + Math.sin(x * 0.045 + t * 2.6) * 4 + Math.sin(x * 0.12 - t * 1.7) * 2;
  const glow = c.createLinearGradient(0, ly - 150, 0, ly); glow.addColorStop(0, 'rgba(255,120,40,0)'); glow.addColorStop(1, 'rgba(255,120,40,.5)'); c.fillStyle = glow; c.fillRect(0, ly - 150, W, 150);
  const g = c.createLinearGradient(0, ly, 0, ly + 120); g.addColorStop(0, '#ffb13d'); g.addColorStop(0.15, '#ff6a1a'); g.addColorStop(1, '#a3161b');
  c.beginPath(); c.moveTo(0, ly + 800); for (let x = 0; x <= W; x += 12) c.lineTo(x, wave(x)); c.lineTo(W, ly + 800); c.closePath(); c.fillStyle = g; c.fill();
  c.lineWidth = 3; c.strokeStyle = OUT; c.beginPath(); for (let x = 0; x <= W; x += 12) c.lineTo(x, wave(x)); c.stroke();
  c.lineWidth = 2; c.strokeStyle = '#fff2a8'; c.beginPath(); for (let x = 0; x <= W; x += 12) c.lineTo(x, wave(x) + 3); c.stroke();
  c.fillStyle = 'rgba(120,20,20,.45)'; for (let i = 0; i < 6; i++) { const x = ((i * 83 + t * (10 + i * 3)) % (W + 60)) - 30; c.beginPath(); c.ellipse(x, ly + 22 + (i % 3) * 18, 18 + (i % 2) * 8, 4, 0, 0, R2); c.fill(); }
  for (const f of fx) { const a = 1 - f.t / f.max;
    if (f.k === 'ember') { c.globalAlpha = a; c.fillStyle = f.t < f.max * 0.4 ? '#fff2a8' : '#ff7a2d'; c.fillRect(f.x + Math.sin(f.t * 5 + f.x) * 4, f.y, 3, 3); c.globalAlpha = 1; }
    else if (f.k === 'bubble') { const r = f.r * Math.min(1, f.t * 3); c.beginPath(); c.arc(f.x, ly - 2 + (1 - f.t / f.max) * 6, r, Math.PI, 0); c.fillStyle = '#ffb13d'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#a3161b'; c.stroke(); } }
}
function drawBarrels() {
  ART.background(c, TH, W, H, 0, 0, t);
  if (!lvCv) lvCv = renderBarrelLevel(); c.drawImage(lvCv, 0, 0, W, H);
  drum(W - 30, H - T);
  thrower(W - 50, fyRow(5) * T);
  ART.flag(c, flag.x, flag.y, t, '#7cf7a0', 32);
  for (const co of coins) if (!co.got) ART.coin(c, co.x, co.y, t, 6.5);
  for (const b of barrels) barrel(b.x + 8, b.y + 8, b.a, b.blue);
  hero(p, 0.68);
  // HUD
  for (let i = 0; i < 3; i++) ART.heart(c, 14 + i * 20, 12, 1, i < lives);
  label(`${score}`, 8, 22, 16, '#fff');
  label(`Bonus ${Math.round(bonus / 100) * 100}`, W - 92, 5, 12, bonus < 1000 ? '#ff9a5c' : '#ffc928', 'right'); // lejos de pausa/sonido
  label(`Nivel ${level}`, 8, 42, 11, 'rgba(255,255,255,.9)');
  if (intro > 0 && k.st === 'play') { c.globalAlpha = Math.min(1, intro * 2); ART.rr(c, W / 2 - 100, H / 2 - 34, 200, 60, 16); ART.fillOut(c, 'rgba(26,21,48,.85)', 2); label(`Nivel ${level}`, W / 2, H / 2 - 26, 26, '#fff', 'center'); label('¡Llega a la bandera!', W / 2, H / 2 + 4, 13, '#ffc928', 'center'); c.globalAlpha = 1; }
}
function hud() {
  label(`${Math.floor(score)}`, 12, 10, 26, '#fff');
  ART.coin(c, 20, 52, -0.25, 7); label(`× ${got}`, 32, 44, 15, '#ffc928');
  label(`${Math.floor(height() / 3.2)} m`, W - 12, 10, 18, '#fff', 'right');
  if (rec) label(`Récord ${rec}`, W - 12, 34, 12, 'rgba(255,255,255,.8)', 'right');
}
