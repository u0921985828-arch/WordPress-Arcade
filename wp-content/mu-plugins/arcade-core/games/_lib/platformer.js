/* Plataformas laterales HD con arte propio (ART). T = 32 px; héroe 22×30 px (≈0,7×0,95 casillas).
 * CFG.theme, CFG.abil {wall,dash,sword,grapple,swing}, CFG.enemies (0-1), CFG.spikes (0-1)
 * CFG.mode 'race': carrera a 4 (1 humano + CPU o hasta 4 en la tele) por rondas con cámara que sigue al líder. */
const A = CFG.abil || {}, RACE = CFG.mode === 'race';
let TH = ART.THEMES[CFG.theme || 'meadow'];
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
  const lv = RACE ? Math.min(1, (level - 1) / 5) : Math.min(1, (level - 1) / 8); MW = RACE ? 120 + Math.min(level, 6) * 8 : 62 + Math.min(level, 12) * 16; map = Array.from({ length: MH }, () => Array(MW).fill(0)); enemies = []; coins = []; anchors = []; decos = [];
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
function reset() { if (RACE) return raceNew(); level = 1; lives = 3; score = 0; coinsGot = 0; build(); }
function die() { if (dead) return; dead = 1.1; p.vy = -600; k.sfx('hurt'); k.shake(8); k.flash('rgba(255,60,80,.35)'); }
function respawn() { lives--; if (lives <= 0) return k.lose(CFG.id, score, 'Sin vidas', `Nivel ${level} · ${coinsGot} moneda${coinsGot === 1 ? '' : 's'}`); const s = check && check.on ? { x: check.x, y: check.y - 40 } : spawn; p = mkP(s); rope = null; dead = 0; dashT = 0; }
function collide(o, dt) {
  o.x += o.vx * dt; o.wall = 0;
  for (const yy of [o.y + 2, o.y + o.h / 2, o.y + o.h - 2]) for (const xx of [o.x, o.x + o.w]) if (tileAt(xx, yy) === 1) {
    if (o.vx > 0 || xx === o.x + o.w) { o.x = Math.floor(xx / T) * T - o.w - 0.01; o.wall = 1; } else { o.x = Math.floor(xx / T) * T + T + 0.01; o.wall = -1; } o.vx = 0; }
  const oldB = o.y + o.h; o.y += o.vy * dt; const was = o.ground; o.ground = false;
  for (const xx of [o.x + 2, o.x + o.w - 2]) {
    const tb = tileAt(xx, o.y + o.h), tt = tileAt(xx, o.y);
    if (o.vy >= 0 && (tb === 1 || (tb === 2 && oldB <= Math.floor((o.y + o.h) / T) * T + 2))) { o.y = Math.floor((o.y + o.h) / T) * T - o.h; if (!was && o.vy > 300) { if (o === p) landSq = 0.18; else o.sq = 0.18; k.burst(o.x + o.w / 2, o.y + o.h, '#fff', 6, 70); } o.vy = 0; o.ground = true; }
    else if (o.vy < 0 && tt === 1) { o.y = Math.floor(o.y / T) * T + T; o.vy = 0; }
  }
}
function upd(dt) {
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
}
function drw() {
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
}
/* ---------- Carrera de Plataformas (CFG.mode 'race'): 4 corredores en el mismo nivel, la cámara sigue al que va primero.
   Quien se queda fuera por la izquierda, cae a un foso o toca pinchos/enemigos pierde la ronda. Gana la ronda quien toca
   la bandera o el último en pie; a 3 rondas, podio. A salta (mantén = más alto), B empujón; pisar a un rival lo aturde.
   La CPU sigue la ruta leyendo las columnas que tiene delante (fosos, escalones, pinchos, enemigos) y mejora con tus victorias. ---------- */
const RWIN = 3, RTH = ['meadow', 'jungle', 'dusk', 'snow', 'castle', 'sky'];
let R = null, rcpu = 0; try { rcpu = Math.max(0, Math.min(6, +localStorage.getItem('cpu:' + CFG.id) || 0)); } catch (e) {}
function raceNew() { const pl = k.players(4); R = { rs: pl.map((q) => ({ pl: q.p, col: q.color, name: q.cpu ? 'CPU' : q.name, cpu: q.cpu, wins: 0 })), round: 0 }; raceRound(); }
function raceRound() {
  R.round++; level = R.round; TH = ART.THEMES[RTH[(R.round - 1) % RTH.length]]; check = null; gen(); check = null;
  t = 0; cx = 0; cy = MH * T - H; R.between = 0; R.win = null; R.scroll = 0; R.msg = `Ronda ${R.round}`; R.msgT = 2.4; R.cd = true; R.order = [];
  const ord = R.rs.map((r, i) => i).sort((a, b) => R.rs[b].wins - R.rs[a].wins || a - b); /* quien va ganando sale detrás */
  ord.forEach((ri, slot) => { const r = R.rs[ri]; Object.assign(r, mkP({ x: (0.6 + slot * 1.3) * T, y: (MH - 3) * T - 30 }), { out: false, dead: 0, jb: 0, co: 0, dashT: 0, dashCd: 0, stun: 0, sq: 0, ai: { miss: 0, hold: 0, lag: 0 }, face: 1 }); });
}
const colTop = (col) => { if (col < 0 || col >= MW) return 0; for (let y = 0; y < MH; y++) if (map[y][col] === 1) return y; return MH; };
function raceCpu(r, dt) {
  const lv = rcpu, ai = r.ai, fx = r.x + r.w, col = Math.floor((r.x + r.w / 2) / T), my = colTop(col);
  let jump = false, dash = false; ai.hold -= dt;
  if (r.ground) {
    for (let c2 = col + 1; c2 <= col + 3; c2++) {
      const tp = colTop(c2), edge = c2 * T - fx, spike = tp < MH && tp > 0 && map[tp - 1][c2] === 3;
      const need = tp === MH ? 6 : tp < my ? 26 : spike ? 22 : -1; /* foso: saltar en el borde; escalón: un poco antes */
      if (need >= 0) { if (ai.lag <= 0) ai.lag = Math.random() < Math.max(0.02, 0.13 - lv * 0.018) ? k.rnd(-18, 22) : k.rnd(-4, 4); if (edge < need + ai.lag) { jump = true; ai.lag = 0; } break; }
    }
    for (const e of enemies) if (e.alive && e.x > r.x && e.x - fx < 46 && Math.abs(e.y - r.y) < 40) jump = true;
  }
  if (jump) ai.hold = 0.32;
  for (const o of R.rs) if (o !== r && !o.out && !o.dead && o.x > r.x && o.x - fx < 18 && Math.abs(o.y - r.y) < 20 && r.dashCd <= 0 && Math.random() < 0.02 + lv * 0.01) dash = true;
  return { L: false, R: true, J: jump, JH: ai.hold > 0 || (!r.ground && r.vy < 0 && ai.hold > -0.05), B: dash, sp: 0.9 + lv * 0.017 };
}
function raceOut(r, why) { if (r.out) return; r.out = true; R.order.push(r); k.sfx('lose'); k.float(why, k.clamp(r.x, cx + 40, cx + W - 40), k.clamp(r.y, cy + 60, cy + H - 30), r.col); }
function raceUpdate(dt) {
  if (!k.gate(reset)) return;
  t += dt; R.msgT -= dt;
  if (R.cd) { R.cd = false; k.count(3); }
  if (k.counting()) return;
  if (R.between) { R.between -= dt; if (R.between <= 0) { const ch = R.rs.find((r) => r.wins >= RWIN); if (ch) return raceEnd(ch); raceRound(); } }
  const live = R.rs.filter((r) => !r.out);
  for (const r of R.rs) {
    if (r.out) continue; r.sq = Math.max(0, r.sq - dt);
    if (r.dead) { r.dead -= dt; r.vy += G * dt; r.y += r.vy * dt; if (r.dead <= 0) raceOut(r, '¡Fuera!'); continue; }
    let I;
    if (r.cpu) I = raceCpu(r, dt);
    else { I = { L: k.pheld(r.pl, 'left'), R: k.pheld(r.pl, 'right'), J: k.phit(r.pl, 'up') || k.phit(r.pl, 'a'), JH: k.pheld(r.pl, 'up') || k.pheld(r.pl, 'a'), B: k.phit(r.pl, 'b'), sp: 1 };
      if (r.pl === 0 && !k.party) { if (k.ptr.hit) I.J = true; if (k.ptr.down) { I.JH = true; } } }
    if (R.between) I = { L: false, R: false, J: false, JH: false, B: false, sp: 1 };
    r.jb -= dt; r.co -= dt; r.dashCd -= dt; r.stun -= dt;
    if (r.stun > 0) I = { L: false, R: false, J: false, JH: false, B: false, sp: 1 };
    if (I.J) r.jb = BUFFER;
    if (I.B && r.dashCd <= 0) { r.dashT = 0.14; r.dashCd = 1.3; k.sfx('shoot'); }
    const ax = (I.R ? 1 : 0) - (I.L ? 1 : 0); if (ax) r.face = ax;
    if (r.dashT > 0) { r.dashT -= dt; r.vx = r.face * 640; r.vy = Math.min(r.vy, 0); if (Math.random() < 0.6) k.burst(r.x + 11, r.y + 15, r.col, 1, 30); }
    else { const tgt = ax * RUN * I.sp; r.vx += (tgt - r.vx) * Math.min(1, dt * (r.ground ? 18 : 8)); }
    if (r.dashT <= 0) r.vy = Math.min(r.vy + G * dt, FALL);
    if (r.ground) r.co = COYOTE;
    if (r.jb > 0 && r.co > 0) { r.vy = -JUMP; r.jb = 0; r.co = 0; k.sfx('jump'); k.burst(r.x + 11, r.y + 30, '#fff', 4, 60); }
    if (!I.JH && r.vy < -CUT) r.vy = -CUT;
    collide(r, dt);
    r.state = !r.ground ? (r.vy < 0 ? 'jump' : 'fall') : Math.abs(r.vx) > 30 ? 'run' : 'idle';
    /* enemigos y pinchos */
    for (const e of enemies) if (e.alive) { const ey = e.fly ? e.y - 20 + Math.sin(t * 2 + e.min) * 16 : e.y;
      if (r.x + r.w > e.x + 3 && r.x < e.x + e.w - 3 && r.y + r.h > ey + 4 && r.y < ey + e.h) {
        if ((r.vy > 0 && r.y + r.h - ey < 14) || r.dashT > 0) { e.alive = false; r.vy = -620; k.burst(e.x + 13, ey + 12, '#fff', 14); k.sfx('hit'); }
        else { r.dead = 0.9; r.vy = -560; k.sfx('hurt'); k.burst(r.x + 11, r.y + 15, r.col, 14, 150); } } }
    if (!r.dead) for (const xx of [r.x + 4, r.x + r.w - 4]) if (tileAt(xx, r.y + r.h - 3) === 3) { r.dead = 0.9; r.vy = -560; k.sfx('hurt'); k.burst(r.x + 11, r.y + 15, r.col, 14, 150); break; }
    for (const co of coins) if (!co.got && Math.abs(co.x - r.x - 11) < 18 && Math.abs(co.y - r.y - 15) < 22) { co.got = true; if (!r.cpu) k.sfx('coin'); k.burst(co.x, co.y, '#ffc928', 5, 70); }
    if (r.y > MH * T + 40) raceOut(r, '¡Al foso!');
    if (!R.between && r.x > flag.x - 10) { R.win = r; r.wins++; R.between = 2.4; R.msg = `¡${r.cpu ? 'CPU' : r.name} llega a la meta!`; R.msgT = 2.4; k.sfx('win'); k.confetti(r.col, 60); }
  }
  /* choques entre corredores: pisar la cabeza aturde; de lado se empujan (el empujón con B lanza lejos) */
  for (const a of live) for (const b of live) if (a !== b && !a.dead && !b.dead && a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h) {
    if (a.vy > 0 && a.y + a.h - b.y < 14 && a.y < b.y) { a.vy = -560; b.stun = 0.6; b.vy = Math.max(b.vy, 200); b.sq = 0.25; k.sfx('pop'); k.burst(b.x + 11, b.y, '#fff', 8, 100); k.float('¡Plof!', b.x + 11, b.y - 16, a.col); }
    else { const s = a.x < b.x ? -1 : 1, f = a.dashT > 0 || b.dashT > 0 ? 420 : 60; a.vx = s * f * (b.dashT > 0 ? 1 : 0.5); if (b.dashT > 0 && a.dashT <= 0) { a.stun = 0.25; a.vy = -260; k.sfx('hit'); } }
  }
  /* cámara: sigue al líder y avanza sola despacio; quien queda a la izquierda del borde, fuera */
  const lead = live.filter((r) => !r.dead).sort((a, b) => b.x - a.x)[0];
  if (lead && !R.between) {
    R.scroll = Math.min(150, 25 + t * 4); const tx = k.clamp(Math.max(lead.x - W * 0.6, cx + R.scroll * dt), 0, MW * T - W);
    cx += Math.max(0, tx - cx) * Math.min(1, dt * 5); cy += (k.clamp(lead.y - H * 0.55, 0, MH * T - H) - cy) * Math.min(1, dt * 4);
    for (const r of live) if (!r.dead && r.x + r.w < cx - 2) raceOut(r, '¡Fuera de cámara!');
  }
  for (const e of enemies) if (e.alive) { e.x += e.vx * dt; if (e.x < e.min || e.x > e.max) { e.vx *= -1; e.x = k.clamp(e.x, e.min, e.max); } }
  const still = R.rs.filter((r) => !r.out);
  if (!R.between && still.length <= 1 && R.rs.length > 1) {
    const w = still[0] || R.order[R.order.length - 1]; R.win = w; w.wins++; R.between = 2.4; R.msg = `¡${w.cpu ? 'CPU' : w.name} aguanta más!`; R.msgT = 2.4; k.sfx('win'); k.confetti(w.col, 50);
  }
}
function raceEnd(ch) {
  if (!k.party) { const hu = R.rs.find((r) => r.pl === 0); rcpu = Math.max(0, Math.min(6, rcpu + (ch === hu ? 1 : -1))); try { localStorage.setItem('cpu:' + CFG.id, rcpu); } catch (e) {} }
  const head = !k.party ? (ch.pl === 0 ? '¡Has ganado la carrera!' : 'Gana la CPU') : ch.cpu ? 'Gana la CPU' : `¡Gana ${ch.name}!`;
  k.podium(R.rs.map((r) => ({ p: r.pl, score: r.wins, name: r.cpu ? 'CPU' : r.name })), { head, noTie: true, fmt: (n) => `${n} ronda${n === 1 ? '' : 's'}` });
}
function raceDraw() {
  ART.background(c, TH, W, H, cx, cy, t);
  c.save(); c.translate(-Math.round(cx), -Math.round(cy));
  const x0 = Math.max(0, Math.floor(cx / T) - 1), x1 = Math.min(MW, x0 + Math.ceil(W / T) + 3);
  for (const d of decos) if (d.x > cx - 60 && d.x < cx + W + 60) ART.deco(c, TH, d.x, d.y, T);
  for (let y = 0; y < MH; y++) for (let x = x0; x < x1; x++) { const v = map[y][x]; if (!v) continue;
    if (v === 1) ART.tile(c, TH, 'ground', x * T, y * T, T, { top: !map[y - 1] || map[y - 1][x] !== 1, left: x > 0 && map[y][x - 1] !== 1, right: x < MW - 1 && map[y][x + 1] !== 1 });
    else ART.tile(c, TH, v === 2 ? 'plank' : 'spike', x * T, y * T, T, {}); }
  ART.flag(c, flag.x, flag.y, t, '#ffc928', 110);
  for (const co of coins) if (!co.got && co.x > cx - 20 && co.x < cx + W + 20) ART.coin(c, co.x, co.y, t);
  for (const e of enemies) if (e.alive && e.x > cx - 40 && e.x < cx + W + 40) ART.enemy(c, TH.enemy, e.x, e.fly ? e.y - 20 + Math.sin(t * 2 + e.min) * 16 : e.y, e.w, e.h, { t, face: e.vx > 0 ? 1 : -1 });
  for (const r of R.rs) { if (r.out) continue;
    if (r.dashT > 0) { c.globalAlpha = 0.35; ART.hero(c, r.x + 11 - r.face * 18, r.y + r.h, 1, { face: r.face, state: 'run', t, col: r.col }); c.globalAlpha = 1; }
    ART.hero(c, r.x + 11, r.y + r.h, 1, { face: r.face, state: r.dead ? 'fall' : r.state, t: t + r.pl * 0.3, col: r.col, squash: r.sq > 0 ? r.sq : 0 });
    if (r.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; c.fillStyle = '#ffd23d'; c.beginPath(); c.arc(r.x + 11 + Math.cos(a) * 12, r.y - 6 + Math.sin(a) * 4, 3, 0, 6.283); c.fill(); }
    label(r.cpu ? 'CPU' : r.name, r.x + 11, r.y - 26, 14, r.cpu ? '#e8e4f4' : r.col, 'center'); }
  c.restore();
  /* borde que elimina */
  const gr = c.createLinearGradient(0, 0, 36, 0); gr.addColorStop(0, 'rgba(255,60,90,.55)'); gr.addColorStop(1, 'rgba(255,60,90,0)'); c.fillStyle = gr; c.fillRect(0, 0, 36, H);
  /* marcador: rondas ganadas y barra de progreso con la posición de cada uno */
  const pw = Math.min(140, (W - 20) / R.rs.length - 6);
  R.rs.forEach((r, i) => { const x = 10 + i * (pw + 6); ART.rr(c, x, 5, pw, 26, 9); c.fillStyle = r.out ? 'rgba(26,21,48,.45)' : 'rgba(26,21,48,.85)'; c.fill(); c.lineWidth = 2; c.strokeStyle = r.col; c.stroke();
    label(r.cpu ? 'CPU' : r.name, x + 8, 10, 14, r.out ? '#77708f' : r.col); for (let j = 0; j < RWIN; j++) { const sx = x + pw - 14 - (RWIN - 1 - j) * 16; c.beginPath(); for (let q = 0; q < 10; q++) { const a = -Math.PI / 2 + q * Math.PI / 5, rr = q % 2 ? 3 : 7; c.lineTo(sx + Math.cos(a) * rr, 18 + Math.sin(a) * rr); } c.closePath(); ART.fillOut(c, j < r.wins ? '#ffc928' : '#3a3552', 1.5); } });
  const bx = 60, bw = W - 120, by = H - 14; ART.rr(c, bx, by - 3, bw, 6, 3); c.fillStyle = 'rgba(26,21,48,.7)'; c.fill();
  c.fillStyle = '#ffc928'; c.fillRect(bx + bw - 3, by - 8, 3, 12);
  for (const r of R.rs) if (!r.out) { c.beginPath(); c.arc(bx + bw * k.clamp(r.x / flag.x, 0, 1), by, 6, 0, 6.283); ART.fillOut(c, r.col, 2); }
  if (R.msgT > 0) { c.globalAlpha = Math.min(1, R.msgT * 2); c.font = '800 24px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(R.msg).width + 40; ART.rr(c, W / 2 - mw / 2, 46, mw, 42, 12); c.fillStyle = 'rgba(26,21,48,.82)'; c.fill(); label(R.msg, W / 2, 54, 24, R.win ? R.win.col : '#ffc928', 'center'); c.globalAlpha = 1; }
}
k.onParty = () => { if (!RACE) return; if (k.st !== 'play' || !R) { reset(); return; } const pl = k.players(4); for (const r of R.rs) { r.cpu = pl[r.pl].cpu; r.name = r.cpu ? 'CPU' : pl[r.pl].name; } };
reset(); k.show(CFG.title, CFG.help);
k.run(RACE ? raceUpdate : upd, RACE ? raceDraw : drw);
