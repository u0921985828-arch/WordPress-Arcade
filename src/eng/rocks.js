/* Rock Belt: asteroides con arte propio. Nave cartoon con inercia, rocas con cráteres (sprite cacheado por roca) que se
 * parten en dos, OVNI grande (dispara al azar) y pequeño (apunta), mejoras (disparo triple, ráfaga, escudo, vida),
 * hiperespacio seguro con recarga, oleadas y vida extra cada 10 000 puntos.
 * Táctil: joystick flotante en la mitad izquierda (la nave gira hacia él y acelera), mitad derecha dispara, botón de salto.
 * Teclado: ← → girar, ↑ propulsar, A disparar, B o ↓ hiperespacio. */
const OUT = ART.OUT, R2 = 6.2832, ID = CFG.id || 'rock-belt';
const PORT = innerHeight > innerWidth, W = PORT ? 360 : 640, H = PORT ? 640 : 480;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#07080f' }), c = k.ctx;
const RS = PORT ? { 3: 36, 2: 21, 1: 12 } : { 3: 44, 2: 25, 1: 14 }, PTS = { 3: 20, 2: 50, 1: 100 };
const PCOL = { triple: '#ffb13d', rapid: '#5ce1e6', shield: '#7cf7a0', life: '#ff4d6d' };
const PNAME = { triple: 'Disparo triple', rapid: 'Ráfaga', shield: 'Escudo', life: 'Vida extra' };
let ship, rocks, shots, eshots, ufo, ufoT, pups, score, lives, wave, cool, t, dead, respT, hyperCd, warp, trip, rapid, shield, bannerT, nextLife, bgCv, touchOn;
/* controles táctiles propios (multitoque) */
const touches = new Map();
const HB = () => ({ x: W - (PORT ? 60 : 150), y: H - (PORT ? 170 : 62), r: 26 }), FB = () => ({ x: W - 62, y: H - 70, r: 40 });
function locp(e) { const r = k.cv.getBoundingClientRect(); return [(e.clientX - r.left) / k.scale, (e.clientY - r.top) / k.scale]; }
addEventListener('pointerdown', (e) => {
  const [x, y] = locp(e), hb = HB(); if (e.pointerType === 'touch') touchOn = true;
  const zone = Math.hypot(x - hb.x, y - hb.y) < hb.r + 10 ? 'hyper' : x < W * 0.5 ? 'stick' : 'fire';
  touches.set(e.pointerId, { x, y, sx: x, sy: y, zone, fresh: true });
});
addEventListener('pointermove', (e) => { const q = touches.get(e.pointerId); if (q) [q.x, q.y] = locp(e); });
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, (e) => touches.delete(e.pointerId));
addEventListener('blur', () => touches.clear());

/* ---------- utilidades y arte cacheado ---------- */
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const rnd = (q) => { const x = Math.sin(q * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const wrap = (o) => { o.x = (o.x + W) % W; o.y = (o.y + H) % H; };
function renderBg() {
  return off(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b0b24'); gr.addColorStop(1, '#130a22'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (const [x, y, r, col] of [[0.2, 0.25, 0.55, '110,98,245'], [0.85, 0.7, 0.5, '255,95,162'], [0.55, 0.95, 0.4, '92,225,230']]) {
      const n = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * Math.max(W, H)); n.addColorStop(0, `rgba(${col},.2)`); n.addColorStop(1, `rgba(${col},0)`); g.fillStyle = n; g.fillRect(0, 0, W, H);
    }
    for (let i = 0; i < 160; i++) { const s = rnd(i + 3); g.globalAlpha = 0.25 + s * 0.6; g.fillStyle = s > 0.9 ? '#ffe9b0' : '#dfe4ff'; g.beginPath(); g.arc(rnd(i) * W, rnd(i + 500) * H, s > 0.93 ? 1.6 : 0.8, 0, R2); g.fill(); }
    g.globalAlpha = 1;
    // planeta lejano con anillo
    const px = W * 0.78, py = H * 0.2, pr = 26; g.fillStyle = '#3a2d6b'; g.beginPath(); g.arc(px, py, pr, 0, R2); g.fill();
    g.fillStyle = '#4c3c8a'; g.beginPath(); g.arc(px - 6, py - 6, pr * 0.8, 0, R2); g.fill();
    g.strokeStyle = 'rgba(185,140,255,.55)'; g.lineWidth = 3; g.beginPath(); g.ellipse(px, py, pr * 1.7, pr * 0.45, -0.3, 0, R2); g.stroke();
  });
}
function rockSprite(r, seed, ore) {
  const n = 12, pts = []; for (let i = 0; i < n; i++) pts.push(r * (0.8 + rnd(seed + i) * 0.25));
  const S = r * 2 + 10;
  return { pts, cv: off(S, S, (g) => {
    g.translate(S / 2, S / 2);
    const shape = () => { g.beginPath(); pts.forEach((d, i) => { const a = i / n * R2; g.lineTo(Math.cos(a) * d, Math.sin(a) * d); }); g.closePath(); };
    shape(); g.fillStyle = ore ? '#8a7a6a' : '#9a8fb0'; g.fill();
    g.save(); shape(); g.clip();
    g.fillStyle = ore ? '#5e5046' : '#6a5f86'; g.fillRect(-S, -S, S * 2, S * 2); g.fillStyle = ore ? '#8a7a6a' : '#9a8fb0'; g.beginPath(); g.arc(-r * 0.18, -r * 0.22, r * 0.92, 0, R2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(-r * 0.3, -r * 0.35, r * 0.55, 0, R2); g.fill();
    const nc = r > 30 ? 5 : r > 20 ? 3 : 2;
    for (let i = 0; i < nc; i++) {
      const a = rnd(seed * 3 + i) * R2, d = rnd(seed * 5 + i) * r * 0.55, cr = r * (0.13 + rnd(seed + i * 7) * 0.14), x = Math.cos(a) * d, y = Math.sin(a) * d;
      g.fillStyle = 'rgba(26,21,48,.35)'; g.beginPath(); g.arc(x, y, cr, 0, R2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.arc(x + cr * 0.3, y + cr * 0.3, cr * 0.7, 0.2, 2.2); g.lineTo(x, y); g.fill();
    }
    if (ore) { g.strokeStyle = '#ffc928'; g.lineWidth = 2.5; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = rnd(seed + i * 11) * R2; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1); g.lineTo(Math.cos(a + 0.4) * r * 0.5, Math.sin(a + 0.4) * r * 0.5); g.lineTo(Math.cos(a + 0.2) * r * 0.75, Math.sin(a + 0.2) * r * 0.75); g.stroke(); } }
    g.restore();
    shape(); g.lineJoin = 'round'; g.lineWidth = r > 20 ? 3 : 2.4; g.strokeStyle = OUT; g.stroke();
  }) };
}
/* Dificultad 0→1 por oleada (máximo en la 9): velocidad de las rocas, cadencia y puntería de los OVNIs. */
const DF = () => Math.min(1, (wave - 1) / 8), lerp = (a, b, q) => a + (b - a) * q;
function mkRock(x, y, size, vx, vy) {
  const seed = Math.random() * 1000, ore = Math.random() < 0.08, sp = rockSprite(RS[size], seed, ore), r = RS[size];
  if (vx === undefined) { const a = k.rnd(0, R2), v = k.rnd(30, 60) * (1 + (3 - size) * 0.45) * lerp(0.7, 1.4, DF()); vx = Math.cos(a) * v; vy = Math.sin(a) * v; }
  return { x, y, size, r, vx, vy, ang: k.rnd(0, R2), rot: k.rnd(-1, 1) * (1.4 - size * 0.3), ore, cv: sp.cv, hit: 0 };
}

/* ---------- estado ---------- */
function newShip() { return { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, inv: 2.5, thr: 0, tilt: 0 }; }
function spawnWave() {
  wave++; bannerT = 2;
  for (let i = 0; i < Math.min(3 + wave, 11); i++) { let x, y; do { x = k.rnd(0, W); y = k.rnd(0, H); } while (Math.hypot(x - ship.x, y - ship.y) < 170); rocks.push(mkRock(x, y, 3)); }
}
function reset() {
  ship = newShip(); rocks = []; shots = []; eshots = []; pups = []; ufo = null; ufoT = 20; score = 0; lives = 3; wave = 0; cool = 0; t = 0;
  dead = false; respT = 0; hyperCd = 0; warp = 0; trip = rapid = 0; shield = false; nextLife = 10000; spawnWave();
}

/* ---------- acciones ---------- */
function fire() {
  const n = trip > 0 ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const a = ship.a + (i - (n - 1) / 2) * 0.2;
    shots.push({ x: ship.x + Math.cos(a) * 16, y: ship.y + Math.sin(a) * 16, vx: Math.cos(a) * 540 + ship.vx * 0.6, vy: Math.sin(a) * 540 + ship.vy * 0.6, t: 0.85 });
  }
  cool = rapid > 0 ? 0.09 : 0.2; k.sfx('shoot');
  ship.vx -= Math.cos(ship.a) * 6; ship.vy -= Math.sin(ship.a) * 6;
}
function hyper() {
  if (hyperCd > 0 || dead || warp > 0) return;
  let best = null, bd = -1;
  for (let i = 0; i < 30; i++) { const x = k.rnd(40, W - 40), y = k.rnd(40, H - 40), d = Math.min(999, ...rocks.map((r) => Math.hypot(r.x - x, r.y - y) - r.r)); if (d > bd) { bd = d; best = [x, y]; } }
  k.burst(ship.x, ship.y, '#b98cff', 16, 160); warp = 0.4; ship.wx = best[0]; ship.wy = best[1]; hyperCd = 3; k.sfx('jump');
}
function breakRock(r, byPlayer) {
  r.dead = true; const n = r.size === 3 ? 22 : r.size === 2 ? 14 : 8;
  k.burst(r.x, r.y, r.ore ? '#ffc928' : '#b3a8cf', n, 60 + r.r * 3); k.burst(r.x, r.y, '#fff', n / 3, 120);
  k.sfx(r.size === 3 ? 'explode' : 'hit'); k.shake(r.size * 2);
  if (byPlayer) { const p = PTS[r.size] * (r.ore ? 3 : 1); addScore(p); if (r.ore || r.size === 3) k.float(`+${p}`, r.x, r.y - 10, r.ore ? '#ffd23d' : '#fff'); }
  if (r.size > 1) {
    const sp = Math.hypot(r.vx, r.vy) * lerp(1.2, 1.35, DF()) + lerp(15, 25, DF()), a = Math.atan2(r.vy, r.vx);
    for (const d of [-0.7, 0.7]) rocks.push(mkRock(r.x, r.y, r.size - 1, Math.cos(a + d) * sp, Math.sin(a + d) * sp));
  }
  if (byPlayer && (r.ore || Math.random() < 0.05)) dropPup(r.x, r.y);
}
function dropPup(x, y) { const kind = lives < 3 && Math.random() < 0.25 ? 'life' : k.pick(['triple', 'rapid', 'shield']); pups.push({ x, y, vx: k.rnd(-30, 30), vy: k.rnd(-30, 30), kind, life: 9, pop: 0 }); }
function addScore(p) { score += p; if (score >= nextLife) { nextLife += 10000; lives++; k.sfx('coin'); k.float('Vida extra', ship.x, ship.y - 30, '#ff4d6d'); } }
function killShip() {
  if (shield) { shield = false; ship.inv = 1.2; k.sfx('hit'); k.flash('rgba(124,247,160,.3)'); k.burst(ship.x, ship.y, '#7cf7a0', 20, 200); return; }
  dead = true; respT = 1.8; lives--; trip = rapid = 0;
  navigator.vibrate && navigator.vibrate(120); k.sfx('explode'); k.burst(ship.x, ship.y, '#ffb347', 30, 240); k.burst(ship.x, ship.y, '#dfe6f5', 16, 200);
  ship.debris = [0, 1, 2, 3, 4].map((i) => ({ x: ship.x, y: ship.y, vx: ship.vx * 0.4 + Math.cos(i * 1.26) * 90, vy: ship.vy * 0.4 + Math.sin(i * 1.26) * 90, a: i, va: k.rnd(-6, 6) }));
}
function spawnUfo() {
  const small = wave >= 3 && Math.random() < Math.min(0.7, 0.2 + wave * 0.07), left = Math.random() < 0.5;
  ufo = { x: left ? -20 : W + 20, y: k.rnd(60, H - 120), vx: (left ? 1 : -1) * (small ? 110 : 75), vy: 0, small, r: small ? 12 : 19, cd: 1.6, turn: 1, hp: 1 };
}

/* ---------- actualización ---------- */
function controls(dt) {
  let turn = 0, thrust = 0, firing = k.held.has('a'), hyp = k.hit.has('b') || k.hit.has('down');
  if (k.held.has('left')) turn = -1; if (k.held.has('right')) turn = 1; if (k.held.has('up')) thrust = 1;
  ship.a += turn * 4.6 * dt;
  for (const q of touches.values()) {
    if (q.zone === 'fire') firing = true;
    else if (q.zone === 'hyper') { if (q.fresh) hyp = true; }
    else {
      const dx = q.x - q.sx, dy = q.y - q.sy, m = Math.hypot(dx, dy);
      if (m > 10) {
        const ta = Math.atan2(dy, dx), d = Math.atan2(Math.sin(ta - ship.a), Math.cos(ta - ship.a));
        ship.a += k.clamp(d, -7.5 * dt, 7.5 * dt); turn = Math.sign(d);
        if (Math.abs(d) < 1.1) thrust = Math.min(1, (m - 10) / 40);
      }
    }
    q.fresh = false;
  }
  return { turn, thrust, firing, hyp };
}
function update(dt) {
  t += dt; bannerT = Math.max(0, bannerT - dt); hyperCd = Math.max(0, hyperCd - dt); trip = Math.max(0, trip - dt); rapid = Math.max(0, rapid - dt); cool -= dt;
  const ctl = controls(dt);
  if (!dead) {
    if (warp > 0) { warp -= dt; if (warp <= 0.2 && ship.wx !== undefined) { ship.x = ship.wx; ship.y = ship.wy; ship.wx = undefined; ship.vx *= 0.3; ship.vy *= 0.3; ship.inv = Math.max(ship.inv, 0.6); k.burst(ship.x, ship.y, '#b98cff', 16, 160); } }
    else {
      if (ctl.hyp) hyper();
      if (ctl.thrust) { ship.vx += Math.cos(ship.a) * 320 * ctl.thrust * dt; ship.vy += Math.sin(ship.a) * 320 * ctl.thrust * dt; if (Math.random() < 0.6) k.burst(ship.x - Math.cos(ship.a) * 16, ship.y - Math.sin(ship.a) * 16, '#ffb347', 1, 60); }
      if (ctl.firing && cool <= 0) fire();
    }
    ship.thr += ((ctl.thrust ? 1 : 0) - ship.thr) * Math.min(1, dt * 12); ship.tilt += (ctl.turn - ship.tilt) * Math.min(1, dt * 10);
    const v = Math.hypot(ship.vx, ship.vy); if (v > 380) { ship.vx *= 380 / v; ship.vy *= 380 / v; }
    ship.vx *= 1 - 0.45 * dt; ship.vy *= 1 - 0.45 * dt; ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship); ship.inv -= dt;
  } else {
    for (const d of ship.debris) { d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.va * dt; }
    respT -= dt;
    if (respT <= 0) {
      if (lives <= 0) { k.lose(ID, score, 'Fin', `Oleada ${wave}`); return; }
      if (rocks.every((r) => Math.hypot(r.x - W / 2, r.y - H / 2) > r.r + 80)) { ship = newShip(); dead = false; k.sfx('start'); }
    }
  }
  for (const s of shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt; wrap(s); }
  for (const s of eshots) { s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt; wrap(s); }
  for (const r of rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.ang += r.rot * dt; wrap(r); r.hit = Math.max(0, r.hit - dt); }
  // OVNI
  if (!ufo && wave >= 2 && (ufoT -= dt) <= 0) { spawnUfo(); ufoT = k.rnd(16, 24); }
  if (ufo) {
    ufo.x += ufo.vx * dt; ufo.y += ufo.vy * dt; ufo.y = (ufo.y + H) % H;
    if ((ufo.turn -= dt) <= 0) { ufo.turn = k.rnd(0.8, 1.6); ufo.vy = k.pick([-1, 0, 1]) * 60; }
    if ((ufo.cd -= dt) <= 0 && !dead) {
      ufo.cd = (ufo.small ? lerp(1.6, 1.05, DF()) : lerp(2, 1.4, DF())); const a = ufo.small ? Math.atan2(ship.y - ufo.y, ship.x - ufo.x) + k.rnd(-0.12, 0.12) * Math.max(0.3, 1.5 - wave * 0.1) : k.rnd(0, R2);
      eshots.push({ x: ufo.x, y: ufo.y, vx: Math.cos(a) * lerp(210, 250, DF()), vy: Math.sin(a) * lerp(210, 250, DF()), t: 1.6 }); k.sfx('shoot');
    }
    if (ufo.x < -40 || ufo.x > W + 40) ufo = null;
  }
  // impactos
  for (const s of shots) {
    if (s.t <= 0) continue;
    for (const r of rocks) if (!r.dead && Math.hypot(s.x - r.x, s.y - r.y) < r.r) { s.t = 0; breakRock(r, true); break; }
    if (s.t > 0 && ufo && Math.hypot(s.x - ufo.x, s.y - ufo.y) < ufo.r + 3) {
      s.t = 0; const p = ufo.small ? 1000 : 200; addScore(p); k.float(`+${p}`, ufo.x, ufo.y - 16, '#ffd23d');
      k.burst(ufo.x, ufo.y, '#7cf7a0', 26, 220); k.burst(ufo.x, ufo.y, '#fff', 10, 160); k.sfx('explode'); k.shake(6); dropPup(ufo.x, ufo.y); ufo = null;
    }
  }
  for (const s of eshots) { if (s.t <= 0) continue; for (const r of rocks) if (!r.dead && Math.hypot(s.x - r.x, s.y - r.y) < r.r) { s.t = 0; breakRock(r, false); break; } }
  if (!dead && warp <= 0) {
    if (ship.inv <= 0) {
      for (const r of rocks) if (!r.dead && Math.hypot(ship.x - r.x, ship.y - r.y) < r.r * 0.9 + 10) { breakRock(r, true); killShip(); break; }
      if (!dead) for (const s of eshots) if (s.t > 0 && Math.hypot(ship.x - s.x, ship.y - s.y) < 12) { s.t = 0; killShip(); break; }
      if (!dead && ufo && Math.hypot(ship.x - ufo.x, ship.y - ufo.y) < ufo.r + 10) { k.burst(ufo.x, ufo.y, '#7cf7a0', 20, 200); ufo = null; killShip(); }
    }
    for (const p of pups) if (p.life > 0 && Math.hypot(ship.x - p.x, ship.y - p.y) < 22) {
      p.life = 0; k.sfx('coin'); k.burst(p.x, p.y, PCOL[p.kind], 16, 160); k.float(PNAME[p.kind], p.x, p.y - 20, PCOL[p.kind]);
      if (p.kind === 'triple') trip = 12; else if (p.kind === 'rapid') rapid = 12; else if (p.kind === 'shield') shield = true; else lives++;
    }
  }
  for (const p of pups) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.pop = Math.min(1, p.pop + dt * 3); wrap(p); }
  rocks = rocks.filter((r) => !r.dead); shots = shots.filter((s) => s.t > 0); eshots = eshots.filter((s) => s.t > 0); pups = pups.filter((p) => p.life > 0);
  if (!rocks.length && !dead) spawnWave();
}

/* ---------- dibujo ---------- */
function drawShip(x, y, a, s, thr, tilt) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
  if (thr > 0.05) { const fl = (10 + Math.random() * 8) * thr; c.fillStyle = '#ff7a3d'; c.beginPath(); c.moveTo(-11, -5); c.lineTo(-13 - fl, 0); c.lineTo(-11, 5); c.fill(); c.fillStyle = '#ffe39a'; c.beginPath(); c.moveTo(-11, -2.5); c.lineTo(-11 - fl * 0.55, 0); c.lineTo(-11, 2.5); c.fill(); }
  // alas (la que va por fuera del giro se ve más)
  for (const sd of [-1, 1]) { const w = 1 + tilt * sd * 0.25; c.beginPath(); c.moveTo(-2, sd * 6); c.lineTo(-12, sd * 15 * w); c.lineTo(-14, sd * 12 * w); c.lineTo(-10, sd * 4); c.closePath(); ART.fillOut(c, '#6e62f5', 2); }
  c.beginPath(); c.moveTo(18, 0); c.quadraticCurveTo(8, -10, -10, -8); c.quadraticCurveTo(-14, 0, -10, 8); c.quadraticCurveTo(8, 10, 18, 0); ART.fillOut(c, '#e8ecf7', 2.4);
  c.fillStyle = '#b9c0d8'; c.beginPath(); c.moveTo(-10, 8); c.quadraticCurveTo(-14, 0, -10, -8); c.lineTo(-6, -7); c.quadraticCurveTo(-9, 0, -6, 7); c.fill();
  c.fillStyle = '#ff5f7a'; c.fillRect(8, -1.5, 6, 3);
  c.beginPath(); c.ellipse(2, 0, 6, 4.2, 0, 0, R2); ART.fillOut(c, '#5ce1e6', 1.8);
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(3.5, -1.5, 2.2, 1.1, 0, 0, R2); c.fill();
  c.restore();
}
function drawUfo(u) {
  c.save(); c.translate(u.x, u.y); const s = u.r / 16; c.scale(s, s);
  c.beginPath(); c.ellipse(0, -5, 9, 8, 0, Math.PI, 0); ART.fillOut(c, 'rgba(140,240,255,.85)', 2);
  c.fillStyle = '#7cf7a0'; c.beginPath(); c.arc(0, -6, 3.5, 0, R2); c.fill(); c.fillStyle = OUT; c.fillRect(-1.8, -7, 1.2, 1.5); c.fillRect(0.8, -7, 1.2, 1.5);
  c.beginPath(); c.ellipse(0, 0, 20, 6.5, 0, 0, R2); ART.fillOut(c, u.small ? '#ff5f7a' : '#9aa3bd', 2.4);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-3, -2.5, 12, 1.8, 0, 0, R2); c.fill();
  for (let i = 0; i < 5; i++) { const on = Math.floor(t * 8 + i) % 5 === 0; c.fillStyle = on ? '#ffe45c' : '#5a4f7a'; c.beginPath(); c.arc(-14 + i * 7, 1.5, 1.8, 0, R2); c.fill(); }
  c.restore();
}
function pupIcon(kind, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.globalAlpha = 0.3; c.fillStyle = PCOL[kind]; c.beginPath(); c.arc(0, 0, 17, 0, R2); c.fill(); c.globalAlpha = 1;
  c.beginPath(); c.arc(0, 0, 12, 0, R2); ART.fillOut(c, PCOL[kind], 2.2); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(-3, -4, 4.5, 0, R2); c.fill();
  c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 1.5;
  if (kind === 'triple') for (const a of [-0.5, 0, 0.5]) { c.save(); c.rotate(a); ART.rr(c, -1.5, -8, 3, 7, 1.5); c.fill(); c.stroke(); c.restore(); }
  else if (kind === 'rapid') { c.beginPath(); c.moveTo(1, -8); c.lineTo(-4, 1); c.lineTo(0, 1); c.lineTo(-1, 8); c.lineTo(4, -1); c.lineTo(0, -1); c.closePath(); c.fill(); c.stroke(); }
  else if (kind === 'shield') { c.beginPath(); c.moveTo(0, -7); c.lineTo(6, -4); c.lineTo(5, 2); c.quadraticCurveTo(3, 6, 0, 8); c.quadraticCurveTo(-3, 6, -5, 2); c.lineTo(-6, -4); c.closePath(); c.fill(); c.stroke(); }
  else { c.restore(); ART.heart(c, x, y + 1, 0.9, true); return; }
  c.restore();
}
function each(o, r, fn) { fn(o.x, o.y); if (o.x < r) fn(o.x + W, o.y); if (o.x > W - r) fn(o.x - W, o.y); if (o.y < r) fn(o.x, o.y + H); if (o.y > H - r) fn(o.x, o.y - H); }
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function drawControls() {
  const st = [...touches.values()].find((q) => q.zone === 'stick'), fireOn = [...touches.values()].some((q) => q.zone === 'fire');
  const bx = st ? st.sx : 80, by = st ? st.sy : H - 80;
  c.globalAlpha = st ? 0.5 : 0.22; c.fillStyle = 'rgba(255,255,255,.12)'; c.strokeStyle = '#fff'; c.lineWidth = 2;
  c.beginPath(); c.arc(bx, by, 48, 0, R2); c.fill(); c.stroke();
  let nx = bx, ny = by; if (st) { const dx = st.x - st.sx, dy = st.y - st.sy, m = Math.hypot(dx, dy), f = m > 48 ? 48 / m : 1; nx += dx * f; ny += dy * f; }
  c.beginPath(); c.arc(nx, ny, 20, 0, R2); c.fillStyle = 'rgba(255,255,255,.5)'; c.fill(); c.stroke();
  const fb = FB(), hb = HB();
  c.globalAlpha = fireOn ? 0.6 : 0.3; c.beginPath(); c.arc(fb.x, fb.y, fb.r, 0, R2); c.fillStyle = 'rgba(255,95,122,.35)'; c.fill(); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(fb.x, fb.y, 7, 0, R2); c.fill(); for (let i = 0; i < 4; i++) { const a = i * 1.5708; c.fillRect(fb.x + Math.cos(a) * 14 - 2, fb.y + Math.sin(a) * 14 - 2, 4, 4); }
  c.globalAlpha = hyperCd > 0 ? 0.15 : 0.35; c.beginPath(); c.arc(hb.x, hb.y, hb.r, 0, R2); c.fillStyle = 'rgba(185,140,255,.35)'; c.fill(); c.stroke();
  c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.arc(hb.x, hb.y, 9, 0.5, 5.5); c.stroke();
  if (hyperCd > 0) { c.globalAlpha = 0.6; c.strokeStyle = '#b98cff'; c.lineWidth = 3; c.beginPath(); c.arc(hb.x, hb.y, hb.r + 3, -1.57, -1.57 + R2 * (1 - hyperCd / 3)); c.stroke(); }
  c.globalAlpha = 1;
}
function draw() {
  c.drawImage(bgCv, 0, 0, W, H);
  for (let i = 0; i < 24; i++) { c.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.3 + i * 2.1)); c.fillStyle = '#fff'; c.fillRect(rnd(i + 77) * W, rnd(i + 177) * H, 1.6, 1.6); } c.globalAlpha = 1;
  for (const p of pups) { if (p.life < 2 && Math.floor(p.life * 8) % 2) continue; const s = p.pop < 1 ? Math.sin(p.pop * 2.1) * 1.15 : 1 + Math.sin(t * 5) * 0.06; pupIcon(p.kind, p.x, p.y, s); }
  for (const r of rocks) each(r, r.r + 5, (x, y) => {
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x + 4, y + 6, r.r * 0.95, r.r * 0.85, 0, 0, R2); c.fill();
    c.save(); c.translate(x, y); c.rotate(r.ang); const S = r.r * 2 + 10; c.drawImage(r.cv, -S / 2, -S / 2, S, S); c.restore();
  });
  c.lineCap = 'round'; for (const s of shots) { const tx = s.vx * 0.022, ty = s.vy * 0.022; c.strokeStyle = 'rgba(255,200,80,.45)'; c.lineWidth = 7; c.beginPath(); c.moveTo(s.x - tx, s.y - ty); c.lineTo(s.x, s.y); c.stroke(); c.strokeStyle = '#fff6c2'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(s.x - tx * 0.6, s.y - ty * 0.6); c.lineTo(s.x, s.y); c.stroke(); }
  for (const s of eshots) { c.beginPath(); c.arc(s.x, s.y, 4, 0, R2); ART.fillOut(c, '#ff5f7a', 1.5); }
  if (ufo) drawUfo(ufo);
  if (dead && respT > 0) { for (const d of ship.debris) { c.save(); c.translate(d.x, d.y); c.rotate(d.a); c.globalAlpha = Math.min(1, respT); ART.rr(c, -6, -2.5, 12, 5, 2); ART.fillOut(c, d.a % 2 < 1 ? '#e8ecf7' : '#6e62f5', 1.5); c.restore(); } c.globalAlpha = 1; }
  if (!dead && k.st !== 'over') {
    const blink = ship.inv > 0 && Math.floor(ship.inv * 10) % 2;
    if (warp > 0) { const f = warp > 0.2 ? (warp - 0.2) / 0.2 : 1 - warp / 0.2, x = warp > 0.2 ? ship.x : ship.wx !== undefined ? ship.wx : ship.x, y = warp > 0.2 ? ship.y : ship.wy !== undefined ? ship.wy : ship.y; c.strokeStyle = '#b98cff'; c.lineWidth = 3; c.globalAlpha = 0.8; c.beginPath(); c.arc(x, y, 30 * (1 - f) + 4, 0, R2); c.stroke(); c.globalAlpha = 1; drawShip(x, y, ship.a + (1 - f) * 6, f, 0, 0); }
    else if (!blink) each(ship, 20, (x, y) => drawShip(x, y, ship.a, 1, ship.thr, ship.tilt));
    if (shield && warp <= 0) { c.globalAlpha = 0.35 + Math.sin(t * 6) * 0.1; c.strokeStyle = '#7cf7a0'; c.lineWidth = 3; c.beginPath(); c.arc(ship.x, ship.y, 24, 0, R2); c.stroke(); c.fillStyle = 'rgba(124,247,160,.12)'; c.fill(); c.globalAlpha = 1; }
  }
  if (touchOn && k.st === 'play') drawControls();
  // marcador (el centro superior queda libre para pausa y sonido)
  label(`${score}`, 12, 8, 22, '#fff');
  label(`Oleada ${wave}`, 12, 34, 12, 'rgba(255,255,255,.75)');
  for (let i = 0; i < Math.min(lives, 6); i++) drawShip(W - 18 - i * 22, 22, -Math.PI / 2, 0.6, 0, 0);
  let py = 40; for (const [v, kind] of [[trip, 'triple'], [rapid, 'rapid']]) if (v > 0) { pupIcon(kind, W - 20, py + 10, 0.6); c.fillStyle = PCOL[kind]; c.fillRect(W - 76, py + 8, 44 * v / 12, 4); py += 24; }
  if (bannerT > 0) {
    const a = Math.min(1, bannerT * 2), s = 1 + Math.max(0, bannerT - 1.7) * 1.5; c.globalAlpha = a;
    c.save(); c.translate(W / 2, H * 0.36); c.scale(s, s); c.font = '800 26px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const txt = `Oleada ${wave}`, mw = c.measureText(txt).width + 40;
    ART.rr(c, -mw / 2, -25, mw, 50, 14); c.fillStyle = 'rgba(26,21,48,.85)'; c.fill(); label(txt, 0, -14, 26, '#fff', 'center'); c.restore(); c.globalAlpha = 1;
  }
}

bgCv = renderBg(); reset();
k.show(CFG.title || 'Rock Belt', 'Destruye las rocas: se parten al disparar. Cuidado con los OVNIs. Móvil: joystick a la izquierda, dispara tocando a la derecha, botón morado = hiperespacio. Teclado: ← → girar, ↑ propulsar, A disparar, B salto.<br>Toca para empezar');
k.run((dt) => { if (!k.gate(reset)) { t += dt; for (const r of rocks) { r.x += r.vx * dt * 0.5; r.y += r.vy * dt * 0.5; r.ang += r.rot * dt; wrap(r); } return; } update(dt); }, draw);
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
