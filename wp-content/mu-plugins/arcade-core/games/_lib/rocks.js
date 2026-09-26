/* Rock Belt: asteroides con arte propio. Nave cartoon con inercia, rocas con cráteres (sprite cacheado por roca) que se
 * parten en dos, OVNI grande (dispara al azar) y pequeño (apunta), mejoras (disparo triple, ráfaga, escudo, vida),
 * hiperespacio seguro con recarga, oleadas y vida extra cada 10 000 puntos.
 * Táctil: joystick flotante en la mitad izquierda (la nave gira hacia él y acelera), mitad derecha dispara, botón de salto.
 * Teclado: ← → girar, ↑ propulsar, A disparar, B o ↓ hiperespacio. */
const OUT = ART.OUT, R2 = 6.2832, ID = CFG.id || 'rock-belt';
/* --- Ley de la pieza única (R5, docs/REMASTER.md §8) -------------------------------
   `unite(g, partes, ancho)` traza TODAS las partes y las rellena después: los contornos
   interiores quedan tapados y solo sobrevive la silueta exterior. El detalle interior va
   recortado (`within` en caché, `clipIn` en el lienzo de partida), nunca con stroke. */
const OUTW = 1.1, INW = 0.65, INA = 0.62;
const _hx = (h) => { if (h[0] !== '#') { const m = h.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; } h = h.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _rgb = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
const LT = (col, f) => _rgb(_hx(col).map((v) => v + (255 - v) * f));
const DK = (col, f) => _rgb(_hx(col).map((v) => v * (1 - f)));
const MXC = (a, b, u) => { const x = _hx(a), y = _hx(b); return _rgb(x.map((v, i) => v + (y[i] - v) * u)); };
const AL = (col, a) => { const q = _hx(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
/* partes = [[trazado, relleno, sombraDeContacto?]], en orden de profundidad */
function unite(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = OUT; g.lineWidth = (ow || OUTW) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) {
    const P = parts[i];
    if (P[2]) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); P[0](g); g.strokeStyle = AL(OUT, 0.15); g.lineWidth = P[2]; g.stroke(); g.lineWidth = P[2] * 0.45; g.stroke(); g.restore(); }
    g.beginPath(); P[0](g); g.fillStyle = P[1]; g.fill();
  }
}
/* detalle de una pieza, recortado contra su propio trazado (caché: source-atop es barato) */
function within(g, path, fn) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* igual, para el lienzo de partida: recorte a secas (source-atop costaría un compuesto de pantalla completa) */
function clipIn(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }

const MP = CFG.mode === 'arena', PORT = !MP && innerHeight > innerWidth, W = PORT ? 360 : 640, H = PORT ? 640 : 480;
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
    /* silueta de una pieza: curva cerrada por los puntos medios, sin esquinas duras */
    const P = pts.map((d, i) => { const a = i / n * R2; return [Math.cos(a) * d, Math.sin(a) * d]; });
    const shape = () => { g.beginPath(); const m = (i, j) => [(P[i][0] + P[j][0]) / 2, (P[i][1] + P[j][1]) / 2]; let q = m(n - 1, 0); g.moveTo(q[0], q[1]); for (let i = 0; i < n; i++) { const e = m(i, (i + 1) % n); g.quadraticCurveTo(P[i][0], P[i][1], e[0], e[1]); } g.closePath(); };
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
    if (ore) { g.strokeStyle = '#ffc928'; g.lineWidth = 2.2; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = rnd(seed + i * 11) * R2; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1); g.lineTo(Math.cos(a + 0.4) * r * 0.5, Math.sin(a + 0.4) * r * 0.5); g.lineTo(Math.cos(a + 0.2) * r * 0.75, Math.sin(a + 0.2) * r * 0.75); g.stroke(); } }
    g.restore();
    shape(); g.lineJoin = 'round'; g.lineWidth = (r > 20 ? 1.25 : 1.1) * 2; g.strokeStyle = OUT; g.stroke();
    g.save(); g.clip(); g.lineWidth = (r > 20 ? 1.25 : 1.1) * 4; g.strokeStyle = AL(OUT, 0.16); g.beginPath(); g.translate(-r * 0.1, -r * 0.12); shape(); g.stroke(); g.restore();
  }) };
}
/* Dificultad 0→1 por oleada (máximo en la 9): velocidad de las rocas, cadencia y puntería de los OVNIs. */
const DF = () => Math.min(1, (wave - 1) / 12), /* 1.23: más fácil */ lerp = (a, b, q) => a + (b - a) * q;
function mkRock(x, y, size, vx, vy) {
  const seed = Math.random() * 1000, ore = Math.random() < 0.08, sp = rockSprite(RS[size], seed, ore), r = RS[size];
  if (vx === undefined) { const a = k.rnd(0, R2), v = k.rnd(30, 60) * (1 + (3 - size) * 0.45) * lerp(0.56, 1.19, DF()) * k.D.spd; vx = Math.cos(a) * v; vy = Math.sin(a) * v; }
  return { x, y, size, r, vx, vy, ang: k.rnd(0, R2), rot: k.rnd(-1, 1) * (1.4 - size * 0.3), ore, cv: sp.cv, hit: 0 };
}

/* ---------- estado ---------- */
function newShip() { return { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, inv: 3 / k.D.dmg, thr: 0, tilt: 0 }; }
function spawnWave() {
  wave++; bannerT = 2;
  for (let i = 0; i < Math.max(1, Math.round(Math.min(2 + wave, 9) * k.D.rate)); i++) { let x, y; do { x = k.rnd(0, W); y = k.rnd(0, H); } while (Math.hypot(x - ship.x, y - ship.y) < 190); rocks.push(mkRock(x, y, 3)); }
}
function reset() {
  ship = newShip(); rocks = []; shots = []; eshots = []; pups = []; ufo = null; ufoT = 20; score = 0; lives = 4 + k.D.life; wave = 0; cool = 0; t = 0;
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
    const sp = Math.hypot(r.vx, r.vy) * lerp(1.1, 1.25, DF()) + lerp(12, 21, DF()), a = Math.atan2(r.vy, r.vx);
    for (const d of [-0.7, 0.7]) rocks.push(mkRock(r.x, r.y, r.size - 1, Math.cos(a + d) * sp, Math.sin(a + d) * sp));
  }
  if (byPlayer && (r.ore || Math.random() < 0.05)) dropPup(r.x, r.y);
}
function dropPup(x, y) { const kind = lives < 4 && Math.random() < 0.25 ? 'life' : k.pick(['triple', 'rapid', 'shield']); pups.push({ x, y, vx: k.rnd(-30, 30), vy: k.rnd(-30, 30), kind, life: 9, pop: 0 }); }
function addScore(p) { score += p; if (score >= nextLife) { nextLife += 10000; lives++; k.sfx('coin'); k.float('Vida extra', ship.x, ship.y - 30, '#ff4d6d'); } }
function killShip() {
  if (shield) { shield = false; ship.inv = 1.2 / k.D.dmg; k.sfx('hit'); k.flash('rgba(124,247,160,.3)'); k.burst(ship.x, ship.y, '#7cf7a0', 20, 200); return; }
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
  if (!ufo && wave >= 2 && (ufoT -= dt) <= 0) { spawnUfo(); ufoT = k.rnd(20, 30) / k.D.rate; }
  if (ufo) {
    ufo.x += ufo.vx * dt; ufo.y += ufo.vy * dt; ufo.y = (ufo.y + H) % H;
    if ((ufo.turn -= dt) <= 0) { ufo.turn = k.rnd(0.8, 1.6); ufo.vy = k.pick([-1, 0, 1]) * 60; }
    if ((ufo.cd -= dt) <= 0 && !dead) {
      ufo.cd = (ufo.small ? lerp(2.13, 1.4, DF()) : lerp(2.67, 1.87, DF())) / k.D.rate; const a = ufo.small ? Math.atan2(ship.y - ufo.y, ship.x - ufo.x) + k.rnd(-0.12, 0.12) * Math.max(0.3, 1.5 - wave * 0.1) : k.rnd(0, R2);
      eshots.push({ x: ufo.x, y: ufo.y, vx: Math.cos(a) * lerp(168, 200, DF()) * k.D.spd, vy: Math.sin(a) * lerp(168, 200, DF()) * k.D.spd, t: 1.6 }); k.sfx('shoot');
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
      for (const r of rocks) if (!r.dead && Math.hypot(ship.x - r.x, ship.y - r.y) < r.r * 0.9 + 8.5) { breakRock(r, true); killShip(); break; }
      if (!dead) for (const s of eshots) if (s.t > 0 && Math.hypot(ship.x - s.x, ship.y - s.y) < 10) { s.t = 0; killShip(); break; }
      if (!dead && ufo && Math.hypot(ship.x - ufo.x, ship.y - ufo.y) < ufo.r + 8.5) { k.burst(ufo.x, ufo.y, '#7cf7a0', 20, 200); ufo = null; killShip(); }
    }
    for (const p of pups) if (p.life > 0 && Math.hypot(ship.x - p.x, ship.y - p.y) < 26) {
      p.life = 0; k.sfx('coin'); k.burst(p.x, p.y, PCOL[p.kind], 16, 160); k.float(PNAME[p.kind], p.x, p.y - 20, PCOL[p.kind]);
      if (p.kind === 'triple') trip = 12; else if (p.kind === 'rapid') rapid = 12; else if (p.kind === 'shield') shield = true; else lives++;
    }
  }
  for (const p of pups) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.pop = Math.min(1, p.pop + dt * 3); wrap(p); }
  rocks = rocks.filter((r) => !r.dead); shots = shots.filter((s) => s.t > 0); eshots = eshots.filter((s) => s.t > 0); pups = pups.filter((p) => p.life > 0);
  if (!rocks.length && !dead) spawnWave();
}

/* ---------- dibujo ---------- */
/* Casco y alas forman una sola silueta: se trazan todas y se rellenan después. */
const SH_HULL = (g) => { g.moveTo(18, 0); g.quadraticCurveTo(8, -10, -10, -8); g.quadraticCurveTo(-14, 0, -10, 8); g.quadraticCurveTo(8, 10, 18, 0); };
const SH_WING = (sd, w) => (g) => { g.moveTo(-1, sd * 5); g.quadraticCurveTo(-7, sd * 10.5, -12, sd * 15 * w); g.quadraticCurveTo(-14.5, sd * 14 * w, -14, sd * 12 * w); g.quadraticCurveTo(-12, sd * 7.5, -9, sd * 3); g.closePath(); };
function drawShip(x, y, a, s, thr, tilt, wing) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
  if (thr > 0.05) { const fl = (10 + Math.random() * 8) * thr; c.fillStyle = '#ff7a3d'; c.beginPath(); c.moveTo(-11, -5); c.lineTo(-13 - fl, 0); c.lineTo(-11, 5); c.fill(); c.fillStyle = '#ffe39a'; c.beginPath(); c.moveTo(-11, -2.5); c.lineTo(-11 - fl * 0.55, 0); c.lineTo(-11, 2.5); c.fill(); }
  const wc = wing || '#6e62f5', wl = SH_WING(-1, 1 - tilt * 0.25), wr = SH_WING(1, 1 + tilt * 0.25);
  unite(c, [[wl, wc], [wr, wc], [SH_HULL, '#e8ecf7']], 1.15);
  /* alas: sombra propia hacia el borde de fuga, sin contorno interior */
  for (const wp of [wl, wr]) clipIn(c, wp, (g) => { g.fillStyle = AL(OUT, 0.18); g.fillRect(-16, -20, 4.2, 40); g.fillStyle = AL('#ffffff', 0.22); g.fillRect(-9, -20, 3, 40); });
  /* detalle del casco, recortado contra su silueta */
  clipIn(c, SH_HULL, (g) => {
    g.fillStyle = AL(OUT, 0.17); g.beginPath(); g.moveTo(-11, 9); g.quadraticCurveTo(-15, 0, -11, -9); g.lineTo(-5.5, -7.4); g.quadraticCurveTo(-8.5, 0, -5.5, 7.4); g.closePath(); g.fill();
    g.fillStyle = AL('#ffffff', 0.62); g.beginPath(); g.moveTo(16, -1.4); g.quadraticCurveTo(7, -8.2, -8, -6.4); g.quadraticCurveTo(6, -4.4, 14, -0.4); g.closePath(); g.fill();
    g.fillStyle = '#ff5f7a'; g.fillRect(8, -1.5, 6, 3);
    g.fillStyle = AL(OUT, 0.24); g.beginPath(); g.ellipse(2, 0.9, 6.2, 4.4, 0, 0, R2); g.fill();
    g.fillStyle = '#5ce1e6'; g.beginPath(); g.ellipse(2, 0, 6, 4.2, 0, 0, R2); g.fill();
    g.fillStyle = AL('#ffffff', 0.75); g.beginPath(); g.ellipse(3.5, -1.5, 2.2, 1.1, 0, 0, R2); g.fill();
  });
  c.restore();
}
const UF_BODY = (g) => { g.moveTo(-20, 0); g.quadraticCurveTo(-19.6, -3.3, -11.5, -4.6); g.quadraticCurveTo(-9.6, -12.9, 0, -13); g.quadraticCurveTo(9.6, -12.9, 11.5, -4.6); g.quadraticCurveTo(19.6, -3.3, 20, 0); g.quadraticCurveTo(19, 6.5, 0, 6.5); g.quadraticCurveTo(-19, 6.5, -20, 0); g.closePath(); };
function drawUfo(u) {
  c.save(); c.translate(u.x, u.y); const s = u.r / 16; c.scale(s, s);
  unite(c, [[UF_BODY, u.small ? '#ff5f7a' : '#9aa3bd']], 1.2);
  clipIn(c, UF_BODY, (g) => {
    /* cúpula: cambio de color, no contorno */
    g.fillStyle = AL(OUT, 0.2); g.beginPath(); g.ellipse(0, -4, 9.4, 8.4, 0, 0, R2); g.fill();
    g.fillStyle = 'rgba(150,242,255,.95)'; g.beginPath(); g.ellipse(0, -5, 9, 8, 0, 0, R2); g.fill();
    g.fillStyle = '#7cf7a0'; g.beginPath(); g.arc(0, -6, 3.5, 0, R2); g.fill();
    g.fillStyle = OUT; g.fillRect(-1.8, -7, 1.2, 1.5); g.fillRect(0.8, -7, 1.2, 1.5);
    g.fillStyle = AL('#ffffff', 0.5); g.beginPath(); g.ellipse(-3.4, -8.4, 3, 1.8, -0.5, 0, R2); g.fill();
    /* platillo: luz arriba y sombra propia abajo */
    g.fillStyle = AL('#ffffff', 0.35); g.beginPath(); g.ellipse(-3, -2.6, 12, 1.8, 0, 0, R2); g.fill();
    g.fillStyle = AL(OUT, 0.22); g.beginPath(); g.ellipse(0, 7.6, 19, 4.2, 0, 0, R2); g.fill();
    for (let i = 0; i < 5; i++) { const on = Math.floor(t * 8 + i) % 5 === 0; g.fillStyle = on ? '#ffe45c' : '#5a4f7a'; g.beginPath(); g.arc(-14 + i * 7, 1.5, 1.8, 0, R2); g.fill(); }
  });
  c.restore();
}
function pupIcon(kind, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.globalAlpha = 0.3; c.fillStyle = PCOL[kind]; c.beginPath(); c.arc(0, 0, 17, 0, R2); c.fill(); c.globalAlpha = 1;
  if (kind === 'life') { c.restore(); ART.heart(c, x, y + 1, 0.9, true); return; }
  const disc = (g) => { g.arc(0, 0, 12, 0, R2); };
  unite(c, [[disc, PCOL[kind]]], 1.15);
  clipIn(c, disc, (g) => {
    g.fillStyle = AL('#ffffff', 0.3); g.beginPath(); g.arc(-3, -4, 6.5, 0, R2); g.fill();
    g.fillStyle = AL(OUT, 0.2); g.beginPath(); g.arc(3, 5, 9, 0, R2); g.fill();
    /* símbolo: relieve por sombra propia, sin trazo */
    const sym = (q) => {
      if (kind === 'triple') for (const a of [-0.5, 0, 0.5]) { q.save(); q.rotate(a); ART.rr(q, -1.5, -8, 3, 7, 1.5); q.fill(); q.restore(); }
      else if (kind === 'rapid') { q.beginPath(); q.moveTo(1, -8); q.lineTo(-4, 1); q.lineTo(0, 1); q.lineTo(-1, 8); q.lineTo(4, -1); q.lineTo(0, -1); q.closePath(); q.fill(); }
      else { q.beginPath(); q.moveTo(0, -7); q.lineTo(6, -4); q.lineTo(5, 2); q.quadraticCurveTo(3, 6, 0, 8); q.quadraticCurveTo(-3, 6, -5, 2); q.lineTo(-6, -4); q.closePath(); q.fill(); }
    };
    g.save(); g.translate(0, 1.1); g.fillStyle = AL(OUT, 0.35); sym(g); g.restore();
    g.fillStyle = '#fff'; sym(g);
  });
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

if (!MP) {
bgCv = renderBg(); reset();
k.show(CFG.title || 'Rock Belt', 'Destruye las rocas: se parten al disparar. Cuidado con los OVNIs. Móvil: joystick a la izquierda, dispara tocando a la derecha, botón morado = hiperespacio. Teclado: ← → girar, ↑ propulsar, A disparar, B salto.<br>Toca para empezar');
k.run((dt) => { if (!k.gate(reset)) { t += dt; for (const r of rocks) { r.x += r.vx * dt * 0.5; r.y += r.vy * dt * 0.5; r.ang += r.rot * dt; wrap(r); } return; } update(dt); }, draw);
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
}
/* ================================================================ modo 'arena': Arena de Asteroides (1–4 naves)
   Naves con inercia alrededor de un agujero negro central que atrae naves, rocas y balas (tocar el núcleo destruye).
   Mando: la cruceta apunta y acelera hacia esa dirección, A dispara, B turbo. Cada nave tiene 3 corazones;
   rondas de 60 s como máximo (el agujero crece con el tiempo), 3/2/1/0 puntos por puesto, 3 rondas y podio. */
if (MP) {
  const BX = W / 2, BY = H / 2, ROUNDS = 3, RLEN = 60, SAFE = 5, WINGS = 3;
  let P = [], round = 0, rt = 0, phase = 'play', btw = 0, cdPend = false, elim = [], banner2 = null, bannerT2 = 0, hole = 18, arocks = [], ashots = [];
  let LV = 0; try { LV = Math.min(8, +localStorage.getItem('cpu:' + ID) || 0); } catch (e) { /* sin almacenamiento */ }
  const skill = () => Math.min(0.8, 0.22 + LV * 0.07);
  const CORN = [[70, 70], [W - 70, H - 70], [W - 70, 70], [70, H - 70]];
  function mkPlayers() { P = k.players(Math.max(2, Math.min(4, k.party ? Math.max(...k.party.map((q) => q.p)) + 1 : 4))).map((q, i) => ({ ...q, name: q.cpu ? 'CPU ' + (i + 1) : q.name, pts: 0, kills: 0 })); }
  function syncPlayers() { const pl = k.players(P.length); P.forEach((s, i) => { s.cpu = pl[i].cpu; s.name = pl[i].cpu ? 'CPU ' + (i + 1) : pl[i].name; s.color = pl[i].color; if (i >= pl.length) s.out = true; }); }
  function newRound() {
    round++; rt = 0; phase = 'play'; elim = []; hole = 18; ashots = []; arocks = []; cdPend = true; wave = 1;
    P.forEach((s, i) => { const [x, y] = CORN[i]; Object.assign(s, { x, y, vx: 0, vy: 0, a: Math.atan2(BY - y, BX - x) + Math.PI / 2, hp: WINGS, dead: false, inv: SAFE, cool: 0, bcd: 0, thr: 0, tilt: 0, fl: 0, aiT: 0, aim: 0, tgt: null, place: 0 }); });
    for (let i = 0; i < 4; i++) { const a = i * 1.5708 + 0.785, d = 150; const r = mkRock(BX + Math.cos(a) * d, BY + Math.sin(a) * d, 2, -Math.sin(a) * 40, Math.cos(a) * 40); arocks.push(r); }
    banner2 = `Ronda ${round}`; bannerT2 = 1.6;
  }
  function reset() { t = 0; round = 0; mkPlayers(); newRound(); }
  k.onParty = () => { if (k.st !== 'play') reset(); else syncPlayers(); };
  bgCv = renderBg(); reset();
  k.show(CFG.title, CFG.help);
  window.__arena = { get: () => ({ round, rt, phase, hole, rocks: arocks.length, P: P.map((s) => ({ x: s.x, y: s.y, hp: s.hp, dead: s.dead, cpu: s.cpu, pts: s.pts, kills: s.kills, name: s.name })) }), end: () => { rt = RLEN; } }; /* pruebas */
  const alive = () => P.filter((s) => !s.dead);
  function pull(o, m, dt) { const dx = BX - o.x, dy = BY - o.y, d2 = Math.max(dx * dx + dy * dy, 900), d = Math.sqrt(d2), g = Math.min(420, (m * hole * 500) / Math.max(30, d)); o.vx += dx / d * g * dt; o.vy += dy / d * g * dt; return d; }
  function hurt(s, by, n) {
    if (s.dead || s.inv > 0) return; s.hp -= n || 1; s.inv = 1.2; s.fl = 0.25; k.sfx('hurt'); k.burst(s.x, s.y, s.color, 12, 160);
    if (s.hp <= 0) kill(s, by);
  }
  function kill(s, by) {
    if (s.dead) return; s.dead = true; s.hp = 0; elim.push(s); if (by && by !== s) by.kills++;
    k.sfx('explode'); k.shake(7); k.burst(s.x, s.y, '#ffb347', 30, 240); k.burst(s.x, s.y, s.color, 16, 200);
    s.debris = [0, 1, 2, 3, 4].map((i) => ({ x: s.x, y: s.y, vx: s.vx * 0.4 + Math.cos(i * 1.26) * 90, vy: s.vy * 0.4 + Math.sin(i * 1.26) * 90, a: i, va: k.rnd(-6, 6) }));
    if (by && by !== s) k.float(`${by.name} derriba a ${s.name}`, W / 2, 60, by.color);
  }
  function endRound() {
    const al = alive().sort((a, b) => b.hp - a.hp), order = al.concat(elim.slice().reverse()); /* primero = mejor */
    order.forEach((s, i) => { s.pts += Math.max(0, 3 - i); s.place = i + 1; });
    const w = order[0]; if (w) { banner2 = `${w.name} gana la ronda`; bannerT2 = 2.2; k.sfx(w.cpu ? 'lose' : 'win'); if (!w.cpu) k.confetti(); }
    phase = 'between'; btw = 2.6;
  }
  function finish() {
    const best = Math.max(...P.map((s) => s.pts)), win = P.filter((s) => s.pts === best);
    if (win.length === 1) { LV = win[0].cpu ? Math.max(0, LV - 1) : Math.min(8, LV + 1); try { localStorage.setItem('cpu:' + ID, LV); } catch (e) { /* sin almacenamiento */ } }
    k.podium(P.map((s) => ({ p: s.p, score: s.pts * 100 + s.kills })), { fmt: (v) => `${Math.floor(v / 100)} pts · ${v % 100} derribos`, head: !k.party && win.length === 1 && !win[0].cpu ? '¡Has ganado!' : undefined });
  }
  /* entrada humana: la dirección marca hacia dónde apunta la nave; acelera cuando ya mira hacia allí */
  function humanCtl(s) {
    const d = k.pdir(s.p); let ta = null, thrust = 0, fire = k.pheld(s.p, 'a'), boost = k.phit(s.p, 'b');
    if (d.x || d.y) { ta = Math.atan2(d.y, d.x); thrust = 1; }
    if (s.p === 0 && !k.party) for (const q of touches.values()) {
      if (q.zone === 'fire') fire = true; else if (q.zone === 'hyper') { if (q.fresh) boost = true; }
      else { const dx = q.x - q.sx, dy = q.y - q.sy, m = Math.hypot(dx, dy); if (m > 10) { ta = Math.atan2(dy, dx); thrust = Math.min(1, (m - 10) / 40); } }
      q.fresh = false;
    }
    return { ta, thrust, fire, boost };
  }
  function cpuCtl(s, dt) {
    const sk = skill(); let ta = s.a, thrust = 0, fire = false, boost = false;
    const dh = Math.hypot(BX - s.x, BY - s.y), inward = ((BX - s.x) * s.vx + (BY - s.y) * s.vy) / Math.max(1, dh);
    if ((s.aiT -= dt) <= 0) { s.aiT = k.rnd(0.6, 1.2); const others = alive().filter((o) => o !== s); s.tgt = others.length ? others.reduce((a, b) => (Math.hypot(b.x - s.x, b.y - s.y) < Math.hypot(a.x - s.x, a.y - s.y) ? b : a)) : null; s.aim = k.rnd(-1, 1) * (0.5 - sk * 0.5); }
    if (dh < hole * 2.2 + 90 && inward > -20) { ta = Math.atan2(s.y - BY, s.x - BX) + 0.6; thrust = 1; if (dh < hole * 2 + 50 && s.bcd <= 0 && Math.random() < sk) boost = true; }
    else if (s.tgt && !s.tgt.dead) {
      const o = s.tgt, dx = o.x - s.x, dy = o.y - s.y, d = Math.hypot(dx, dy), lt = d / 420;
      ta = Math.atan2(dy + (o.vy - s.vy) * lt * sk, dx + (o.vx - s.vx) * lt * sk) + s.aim;
      const err = Math.abs(Math.atan2(Math.sin(ta - s.a), Math.cos(ta - s.a)));
      fire = rt > SAFE + 0.5 && err < 0.25 && d < 320 && Math.random() < 0.4 + sk * 0.6;
      thrust = d > 200 ? 0.8 : d < 110 ? 0 : 0.3;
    } else { ta = Math.atan2(s.y - BY, s.x - BX) + 1.5708; thrust = 0.4; }
    for (const r of arocks) if (Math.hypot(r.x - s.x, r.y - s.y) < r.r + 40) { ta = Math.atan2(s.y - r.y, s.x - r.x); thrust = 1; }
    return { ta, thrust, fire, boost };
  }
  function step(dt) {
    rt += dt; t += dt; hole = Math.min(46, 18 + Math.max(0, rt - SAFE) * 0.45);
    const G = Math.min(1, rt / SAFE); /* la atracción entra poco a poco en los primeros 5 s */
    for (const s of P) {
      if (s.dead) { if (s.debris) for (const d of s.debris) { d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.va * dt; } continue; }
      s.inv -= dt; s.cool -= dt; s.bcd -= dt; s.fl -= dt;
      const ctl = s.cpu ? cpuCtl(s, dt) : humanCtl(s); let turn = 0;
      if (ctl.ta !== null) { const d = Math.atan2(Math.sin(ctl.ta - s.a), Math.cos(ctl.ta - s.a)); s.a += k.clamp(d, -6.5 * dt, 6.5 * dt); turn = Math.sign(d); if (Math.abs(d) > 1.2) ctl.thrust *= 0.25; }
      if (ctl.thrust) { s.vx += Math.cos(s.a) * 300 * ctl.thrust * dt; s.vy += Math.sin(s.a) * 300 * ctl.thrust * dt; if (Math.random() < 0.5) k.burst(s.x - Math.cos(s.a) * 16, s.y - Math.sin(s.a) * 16, '#ffb347', 1, 60); }
      if (ctl.boost && s.bcd <= 0) { s.bcd = 2; s.vx += Math.cos(s.a) * 260; s.vy += Math.sin(s.a) * 260; k.sfx('jump'); k.burst(s.x, s.y, s.color, 10, 140); }
      if (ctl.fire && s.cool <= 0 && ashots.filter((q) => q.o === s).length < 4) { s.cool = 0.24; ashots.push({ x: s.x + Math.cos(s.a) * 16, y: s.y + Math.sin(s.a) * 16, vx: Math.cos(s.a) * 460 + s.vx * 0.5, vy: Math.sin(s.a) * 460 + s.vy * 0.5, t: 1.1, o: s }); k.sfx('shoot'); s.vx -= Math.cos(s.a) * 5; s.vy -= Math.sin(s.a) * 5; }
      s.thr += ((ctl.thrust ? 1 : 0) - s.thr) * Math.min(1, dt * 12); s.tilt += (turn - s.tilt) * Math.min(1, dt * 10);
      const dh = pull(s, G, dt);
      const v = Math.hypot(s.vx, s.vy), vm = s.bcd > 1.6 ? 520 : 360; if (v > vm) { s.vx *= vm / v; s.vy *= vm / v; }
      s.vx *= 1 - 0.4 * dt; s.vy *= 1 - 0.4 * dt; s.x += s.vx * dt; s.y += s.vy * dt; wrap(s);
      if (dh < hole * 0.55 + 10) { if (s.inv > 0) { const a = Math.atan2(s.y - BY, s.x - BX); s.vx = Math.cos(a) * 200; s.vy = Math.sin(a) * 200; } else { k.flash('rgba(110,98,245,.3)'); kill(s, null); k.float(`${s.name} cae al agujero`, W / 2, 60, '#a097ff'); } }
    }
    /* choques entre naves */
    const al = alive();
    for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) { const a = al[i], b = al[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 26 && d > 0) { const nx = dx / d, ny = dy / d, rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { a.vx += rv * nx; a.vy += rv * ny; b.vx -= rv * nx; b.vy -= rv * ny; k.sfx('click'); } a.x -= nx * (26 - d) / 2; a.y -= ny * (26 - d) / 2; b.x += nx * (26 - d) / 2; b.y += ny * (26 - d) / 2; } }
    /* rocas: orbitan, caen al agujero y reaparecen por el borde */
    for (const r of arocks) { pull(r, G * 0.5, dt); r.x += r.vx * dt; r.y += r.vy * dt; r.ang += r.rot * dt; wrap(r); r.hit = Math.max(0, r.hit - dt);
      if (Math.hypot(r.x - BX, r.y - BY) < hole * 0.6 + r.r * 0.4) { r.dead = true; k.burst(r.x, r.y, '#a097ff', 10, 100); }
      for (const s of al) if (!s.dead && Math.hypot(s.x - r.x, s.y - r.y) < r.r * 0.9 + 9) { const a = Math.atan2(s.y - r.y, s.x - r.x); s.vx = Math.cos(a) * 180; s.vy = Math.sin(a) * 180; hurt(s, null); } }
    for (const q of ashots) { if (q.t <= 0) continue; pull(q, G * 0.35, dt); q.x += q.vx * dt; q.y += q.vy * dt; q.t -= dt; wrap(q);
      if (Math.hypot(q.x - BX, q.y - BY) < hole * 0.6) { q.t = 0; continue; }
      for (const r of arocks) if (!r.dead && Math.hypot(q.x - r.x, q.y - r.y) < r.r) { q.t = 0; r.dead = true; k.burst(r.x, r.y, '#b3a8cf', 12, 120); k.sfx('hit'); if (r.size > 1) { const a = Math.atan2(r.vy, r.vx), sp = Math.hypot(r.vx, r.vy) * 1.1 + 15; for (const d of [-0.7, 0.7]) arocks.push(mkRock(r.x, r.y, r.size - 1, Math.cos(a + d) * sp, Math.sin(a + d) * sp)); } break; }
      if (q.t > 0) for (const s of al) if (s !== q.o && !s.dead && Math.hypot(q.x - s.x, q.y - s.y) < 13) { q.t = 0; if (s.inv <= 0) { s.vx += q.vx * 0.12; s.vy += q.vy * 0.12; } hurt(s, q.o); break; } }
    arocks = arocks.filter((r) => !r.dead); ashots = ashots.filter((q) => q.t > 0);
    if (arocks.length < 3 && Math.random() < dt * 0.5) { const e = k.ri(0, 3), x = e === 0 ? 0 : e === 1 ? W : k.rnd(0, W), y = e === 2 ? 0 : e === 3 ? H : k.rnd(0, H), a = Math.atan2(BY - y, BX - x) + k.rnd(0.5, 0.9); arocks.push(mkRock(x, y, k.pick([1, 2, 2]), Math.cos(a) * 60, Math.sin(a) * 60)); }
    const hum = al.filter((s) => !s.cpu).length;
    if (al.length <= 1 || rt >= RLEN) endRound();
    return !hum && P.some((s) => !s.cpu);
  }
  function drawHole() {
    const r = hole; c.save(); c.translate(BX, BY);
    const gl = c.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 3.2); gl.addColorStop(0, 'rgba(110,98,245,.55)'); gl.addColorStop(0.4, 'rgba(255,111,181,.18)'); gl.addColorStop(1, 'rgba(110,98,245,0)'); c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 3.2, 0, R2); c.fill();
    for (let i = 0; i < 3; i++) { c.save(); c.rotate(t * (0.9 + i * 0.5) + i * 2); c.strokeStyle = ['#a097ff', '#ff6fb5', '#ffc94d'][i]; c.globalAlpha = 0.55; c.lineWidth = 3 - i * 0.6; c.beginPath(); c.ellipse(0, 0, r * (1.5 + i * 0.35), r * (0.9 + i * 0.2), 0, 0, 4.2); c.stroke(); c.restore(); }
    c.globalAlpha = 1; c.beginPath(); c.arc(0, 0, r * 0.62, 0, R2); ART.fillOut(c, '#05040c', 3); c.strokeStyle = 'rgba(255,201,77,.8)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, r * 0.62 + 3, 0, R2); c.stroke();
    c.restore();
  }
  function draw2() {
    c.drawImage(bgCv, 0, 0, W, H);
    for (let i = 0; i < 24; i++) { c.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.3 + i * 2.1)); c.fillStyle = '#fff'; c.fillRect(rnd(i + 77) * W, rnd(i + 177) * H, 1.6, 1.6); } c.globalAlpha = 1;
    drawHole();
    for (const r of arocks) each(r, r.r + 5, (x, y) => { c.save(); c.translate(x, y); c.rotate(r.ang); const S = r.r * 2 + 10; c.drawImage(r.cv, -S / 2, -S / 2, S, S); c.restore(); });
    c.lineCap = 'round'; for (const q of ashots) { const tx = q.vx * 0.02, ty = q.vy * 0.02; c.strokeStyle = q.o.color; c.globalAlpha = 0.5; c.lineWidth = 7; c.beginPath(); c.moveTo(q.x - tx, q.y - ty); c.lineTo(q.x, q.y); c.stroke(); c.globalAlpha = 1; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(q.x - tx * 0.5, q.y - ty * 0.5); c.lineTo(q.x, q.y); c.stroke(); }
    for (const s of P) {
      if (s.dead) { if (s.debris && phase === 'play') for (const d of s.debris) { c.save(); c.translate(d.x, d.y); c.rotate(d.a); ART.rr(c, -6, -2.5, 12, 5, 2); ART.fillOut(c, d.a % 2 < 1 ? '#e8ecf7' : s.color, 1.5); c.restore(); } continue; }
      if (s.inv > 0 && s.fl <= 0 && rt > SAFE && Math.floor(s.inv * 10) % 2) continue;
      each(s, 20, (x, y) => drawShip(x, y, s.a, 1, s.thr, s.tilt, s.color));
      if (rt < SAFE) { c.globalAlpha = 0.35 + Math.sin(t * 6) * 0.1; c.strokeStyle = s.color; c.lineWidth = 2.5; c.beginPath(); c.arc(s.x, s.y, 22, 0, R2); c.stroke(); c.globalAlpha = 1; }
      for (let i = 0; i < WINGS; i++) ART.heart(c, s.x - 12 + i * 12, s.y - 28, 0.42, i < s.hp);
      if (s.bcd > 0) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, 17, -1.57, -1.57 + R2 * (1 - s.bcd / 2)); c.stroke(); }
    }
    if (touchOn && !k.party && k.st === 'play') drawControls();
    /* marcador: chapas por jugador */
    P.forEach((s, i) => { const x = 10 + i * 118, y = H - 30; ART.rr(c, x, y, 110, 22, 8); ART.fillOut(c, s.dead ? 'rgba(26,21,48,.6)' : 'rgba(26,21,48,.85)', 2); c.fillStyle = s.color; ART.rr(c, x + 5, y + 5, 12, 12, 4); c.fill(); label(`${s.name.slice(0, 7)} ${s.pts}`, x + 22, y + 4, 12, s.dead ? 'rgba(255,255,255,.5)' : '#fff'); });
    label(`Ronda ${Math.max(1, round)}/${ROUNDS}`, 12, 8, 14, '#fff');
    if (phase === 'play') label(String(Math.max(0, Math.ceil(RLEN - rt))), W - 12, 8, 18, rt > RLEN - 10 ? '#ff6fb5' : '#fff', 'right');
    if (bannerT2 > 0 && banner2) { c.globalAlpha = Math.min(1, bannerT2 * 2); c.font = '800 24px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(banner2).width + 40; ART.rr(c, W / 2 - mw / 2, H * 0.24 - 24, mw, 48, 14); c.fillStyle = 'rgba(26,21,48,.85)'; c.fill(); label(banner2, W / 2, H * 0.24 - 13, 24, '#fff', 'center'); c.globalAlpha = 1; }
  }
  k.run((dt) => {
    bannerT2 -= dt;
    if (!k.gate(reset)) { t += dt; for (const r of arocks) { r.x += r.vx * dt * 0.5; r.y += r.vy * dt * 0.5; r.ang += r.rot * dt; wrap(r); } return; }
    if (phase === 'between') { t += dt; btw -= dt; for (const s of P) if (s.dead && s.debris) for (const d of s.debris) { d.x += d.vx * dt; d.y += d.vy * dt; } if (btw <= 0) { if (round >= ROUNDS) finish(); else newRound(); } return; }
    if (cdPend) { cdPend = false; k.count(3); }
    if (k.counting()) { t += dt; return; }
    if (step(dt) && phase === 'play') { step(dt); if (phase === 'play') step(dt); } /* sin humanos vivos: avance rápido */
  }, draw2);
}
