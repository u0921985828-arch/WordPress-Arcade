/* Bowling Flick con arte propio: pista de madera en perspectiva con cámara que sigue la bola, bolos con física (masa, choques entre bolos, caída animada).
 * Arrastra a los lados para colocar la bola y desliza hacia arriba para lanzar: la velocidad del gesto da fuerza y un desliz curvo da efecto.
 * Teclado: ← → colocar, ↑ ↓ ángulo, A lanzar. 10 frames con puntuación oficial (strike, spare y décimo frame con bolas extra). */
const OUT = ART.OUT, R2 = 6.2832, W = 360, H = 640;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1a1230' }), c = k.ctx;
const LANE_W = 62, GUT = 13, LANE_L = 1800, PIT = 1660, BR = 11, PR = 6, PH = 38, F = 520, HY = 96, BASE = 610, SC = 2.45, PS = 2.6;
let pins, ball, frames, frame, roll, state, standing, msg, msgT, msgC, aimX, aimA, cam, t = 0, kb, path, downT, strikes, spares, sweepT, pinSpr, ballSpr;
function rackPins() { pins = []; const rows = [[0], [-1, 1], [-2, 0, 2], [-3, -1, 1, 3]]; let id = 0; rows.forEach((r, i) => r.forEach((x) => pins.push({ id: id++, x: x * 15, y: 1500 + i * 26, vx: 0, vy: 0, down: false, gone: false, tilt: 0, fd: x ? Math.sign(x) : k.pick([-1, 1]), wob: 0, a: 1 }))); }
function setBall() { ball = { x: aimX || 0, y: 30, vx: 0, vy: 0, hook: 0, rolling: false, gutter: false, rot: 0, a: 1 }; state = 'aim'; path = []; }
function reset() { frames = []; frame = 0; roll = 0; aimX = 0; aimA = 0; cam = 0; kb = false; standing = 10; strikes = 0; spares = 0; rackPins(); setBall(); msg = ''; msgT = 0; }
function score() { const r = frames.flat(); let s = 0, i = 0; const out = []; for (let f = 0; f < 10; f++) { if (r[i] === undefined) break; if (r[i] === 10) { if (r[i + 2] === undefined) break; s += 10 + r[i + 1] + r[i + 2]; i++; } else { if (r[i + 1] === undefined) break; if (r[i] + r[i + 1] === 10) { if (r[i + 2] === undefined) break; s += 10 + r[i + 2]; } else s += r[i] + r[i + 1]; i += 2; } out.push(s); } return out; }
/* ---------- Proyección en perspectiva con cámara ---------- */
const P = (x, y, z) => { const s = F / (F + Math.max(-F * 0.6, y - cam)); return [180 + x * s * SC, HY + (BASE - HY) * s - (z || 0) * s * SC, s]; };
/* ---------- Sprites cacheados a 2× ---------- */
function sprite(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); fn(g); return cv; }
function buildSprites() {
  pinSpr = sprite(40, 104, (g) => { const cx = 20, b = 102, u = PS; // perfil del bolo (unidades → px)
    const prof = (g2) => { g2.beginPath(); g2.moveTo(cx - 3.2 * u, b); g2.bezierCurveTo(cx - 6.6 * u, b - 6 * u, cx - 6.4 * u, b - 13 * u, cx - 4.2 * u, b - 19 * u); g2.bezierCurveTo(cx - 2.2 * u, b - 24 * u, cx - 2 * u, b - 26 * u, cx - 3.4 * u, b - 31 * u); g2.bezierCurveTo(cx - 4.2 * u, b - 35 * u, cx - 2 * u, b - 38.4 * u, cx, b - 38.4 * u); g2.bezierCurveTo(cx + 2 * u, b - 38.4 * u, cx + 4.2 * u, b - 35 * u, cx + 3.4 * u, b - 31 * u); g2.bezierCurveTo(cx + 2 * u, b - 26 * u, cx + 2.2 * u, b - 24 * u, cx + 4.2 * u, b - 19 * u); g2.bezierCurveTo(cx + 6.4 * u, b - 13 * u, cx + 6.6 * u, b - 6 * u, cx + 3.2 * u, b); g2.closePath(); };
    prof(g); const gr = g.createLinearGradient(cx - 17, 0, cx + 17, 0); gr.addColorStop(0, '#dcd9e6'); gr.addColorStop(0.35, '#ffffff'); gr.addColorStop(1, '#b9b4c8'); g.fillStyle = gr; g.fill();
    g.save(); prof(g); g.clip(); g.fillStyle = '#e0303f'; g.fillRect(0, b - 27.2 * u, 40, 1.3 * u); g.fillRect(0, b - 25 * u, 40, 1.3 * u); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(cx - 9, b - 34 * u, 3, 40); g.restore();
    prof(g); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); });
  ballSpr = sprite(64, 64, (g) => { const r = BR * PS; g.beginPath(); g.arc(32, 32, r, 0, R2); const gr = g.createRadialGradient(24, 22, 3, 32, 32, r); gr.addColorStop(0, '#8fb0ff'); gr.addColorStop(0.45, '#3a5fd6'); gr.addColorStop(1, '#1d2a78'); g.fillStyle = gr; g.fill();
    g.save(); g.clip(); g.strokeStyle = 'rgba(190,120,255,.45)'; g.lineWidth = 4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, 12 + i * 14); g.bezierCurveTo(20, i * 14, 40, 30 + i * 10, 64, 18 + i * 14); g.stroke(); } g.restore();
    g.beginPath(); g.arc(32, 32, r, 0, R2); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(22, 20, 7, 4.5, -0.6, 0, R2); g.fill(); });
}
buildSprites(); reset();
k.show(CFG.title, 'Arrastra la bola a los lados para colocarla y desliza hacia arriba para lanzar: cuanto más rápido, más fuerte; un desliz curvo le da efecto. Teclado: ← → colocar, ↑ ↓ ángulo, A lanzar. 10 frames con puntuación oficial.');
function launch(vy, ang, hook) { ball.vy = vy; ball.vx = Math.tan(ang) * vy + k.rnd(-12, 12); /* la pista nunca es perfecta */ ball.hook = hook; ball.rolling = true; state = 'roll'; k.sfx('shoot'); k.shake(2); }
k.run((dt) => {
  t += dt; msgT -= dt; if (!k.gate(reset)) return;
  if (state === 'aim') { cam += (0 - cam) * Math.min(1, dt * 5);
    const bs = P(ball.x, ball.y)[2];
    if (k.ptr.hit) { path = []; downT = t; }
    if (k.ptr.down) { path.push([k.ptr.x, k.ptr.y]); const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy; if (k.ptr.sy > 430 && Math.abs(dy) < 28 && Math.abs(dx) > 6) { aimX = k.clamp((k.ptr.x - 180) / (bs * SC), -LANE_W + BR, LANE_W - BR); ball.x = aimX; path.moving = true; } }
    if (k.ptr.up) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.sy - k.ptr.y;
      if (dy > 60 && !path.moving) { const L = Math.hypot(dx, dy), dur = Math.max(0.06, t - downT); let dev = 0; for (const [x, y] of path) { const d = ((x - k.ptr.sx) * -dy - (y - k.ptr.sy) * dx) / L; if (Math.abs(d) > Math.abs(dev)) dev = d; }
        launch(k.clamp(L / dur * 1.25, 650, 1750), k.clamp(Math.atan2(dx, dy) * 0.28, -0.12, 0.12), k.clamp(dev * 4, -170, 170)); }
      path = []; }
    if (k.held.has('left')) { aimX = Math.max(-LANE_W + BR, aimX - 70 * dt); ball.x = aimX; kb = true; } if (k.held.has('right')) { aimX = Math.min(LANE_W - BR, aimX + 70 * dt); ball.x = aimX; kb = true; }
    if (k.held.has('up')) { aimA = Math.max(-0.08, aimA - 0.08 * dt); kb = true; } if (k.held.has('down')) { aimA = Math.min(0.08, aimA + 0.08 * dt); kb = true; }
    if (k.hit.has('a')) launch(1350, aimA, 0);
    return;
  }
  // simulación: bola, bolos (masa 4,5:1), choques bolo-bolo
  const N = 6, h = dt / N;
  for (let s = 0; s < N; s++) {
    if (ball.rolling) { const b = ball; if (b.y > 750 && !b.gutter) b.vx += b.hook * h; b.x += b.vx * h; b.y += b.vy * h; b.rot += b.vy * h / BR;
      if (!b.gutter && !b.hitP && b.y < 1470 && Math.abs(b.x) > LANE_W - 2) { b.gutter = true; b.vx = 0; b.x = Math.sign(b.x) * (LANE_W + GUT / 2); k.sfx('hurt'); msg = 'Canal'; msgC = '#ff9a9a'; msgT = 1; }
      if (!b.gutter) for (const p of pins) { if (p.gone) continue; const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy), md = BR + (p.down ? PR + 2 : PR); if (d < md && d > 0) { const nx = dx / d, ny = dy / d, vr = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
          if (vr > 0) { b.hitP = true; p.vx += 1.64 * vr * nx; p.vy += 1.64 * vr * ny; b.vx -= 0.36 * vr * nx; b.vy -= 0.36 * vr * ny; if (!p.down) knock(p, vr); } p.x = b.x + nx * md; p.y = b.y + ny * md; } }
      if (b.y > PIT + 60 || b.vy < 40) { b.rolling = false; b.a = 0; if (state === 'roll') { state = 'settle'; ball.wait = 1.5; } } }
    for (const p of pins) { if (p.gone || !p.down) continue; p.x += p.vx * h; p.y += p.vy * h; const f = 1 - 2.2 * h; p.vx *= f; p.vy *= f; if (Math.abs(p.x) > LANE_W + 4 || p.y > PIT || p.y < 1400) { p.gone = true; } }
    for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) { const a = pins[i], b = pins[j]; if (a.gone || b.gone) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), md = (a.down ? PR + 3 : PR) + (b.down ? PR + 3 : PR); if (d >= md || d === 0) continue;
      const nx = dx / d, ny = dy / d, vr = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (vr > 0) { const j2 = vr * 0.85; if (!b.down && j2 > 80) knock(b, j2); else if (!b.down) b.wob = Math.max(b.wob, 0.6);
        if (!a.down && j2 > 80) knock(a, j2); else if (!a.down) a.wob = Math.max(a.wob, 0.6);
        if (a.down) { a.vx -= j2 * nx; a.vy -= j2 * ny; } if (b.down) { b.vx += j2 * nx; b.vy += j2 * ny; } }
      const ov = (md - d) / 2; if (a.down) { a.x -= nx * ov; a.y -= ny * ov; } if (b.down) { b.x += nx * ov; b.y += ny * ov; } }
  }
  for (const p of pins) { if (p.down && !p.fs && Math.hypot(p.vx, p.vy) > 5) { p.fs = 1; if (Math.abs(p.vx) > 3) p.fd = Math.sign(p.vx); } if (p.down) p.tilt = Math.min(1, p.tilt + dt * 4.5); p.wob = Math.max(0, p.wob - dt * 1.5); }
  // cámara: sigue a la bola hacia los bolos
  const tc = state === 'roll' && ball.rolling ? k.clamp(ball.y - 340, 0, 1080) : state === 'settle' || state === 'sweep' ? cam : 0; cam += (tc - cam) * Math.min(1, dt * 4);
  if (state === 'settle') { ball.wait -= dt; if (ball.wait <= 0) evaluate(); }
  if (state === 'sweep') { sweepT -= dt; for (const p of pins) if (p.down || p.gone) p.a = Math.max(0, p.a - dt * 3); if (sweepT <= 0) next(); }
}, draw);
function knock(p, v) { p.down = true; if (v > 20) { k.sfx(v > 400 ? 'explode' : 'hit'); } }
let pendMode;
function evaluate() {
  const up = pins.filter((p) => !(p.down || p.gone)).length, pts = standing - up; frames[frame] = frames[frame] || []; frames[frame].push(pts); const fr = frames[frame];
  const strike = pts === 10 && standing === 10, spare = !strike && standing < 10 && up === 0;
  msg = strike ? '¡STRIKE!' : spare ? '¡SPARE!' : pts === 0 ? (ball.gutter ? 'Canal' : 'Cero') : `${pts} ${pts === 1 ? 'bolo' : 'bolos'}`; msgC = strike || spare ? '#f2d15c' : '#fff'; msgT = 1.3;
  if (strike) { strikes++; k.sfx('win'); k.confetti(); k.shake(6); k.flash('rgba(255,240,180,.35)'); } else if (spare) { spares++; k.sfx('coin'); k.burst(180, 260, '#f2d15c', 24, 200); } else if (pts > 0) k.sfx('pop');
  let mode = 'keep';
  if (frame < 9) mode = fr[0] === 10 || fr.length === 2 ? 'next' : 'keep';
  else if (fr.length === 3) mode = 'end';
  else if (fr.length === 1) mode = fr[0] === 10 ? 'rerack' : 'keep';
  else { const [a, b] = fr; mode = a === 10 ? (b === 10 ? 'rerack' : 'keep') : a + b === 10 ? 'rerack' : 'end'; }
  pendMode = mode; state = 'sweep'; sweepT = 0.9; standing = up;
}
function next() {
  const mode = pendMode;
  if (mode === 'end') { const total = score().pop() || 0; k.st = 'over'; k.end(CFG.id, total, total >= 200 ? '¡Partidón!' : 'Partida terminada', NREC(total) + `${strikes} strikes · ${spares} spares`); return; }
  if (mode === 'next') { frame++; roll = 0; rackPins(); standing = 10; }
  else if (mode === 'rerack') { roll++; rackPins(); standing = 10; }
  else { roll++; pins = pins.filter((p) => !(p.down || p.gone)); pins.forEach((p) => { p.vx = p.vy = 0; }); }
  setBall();
}
/* ---------- Dibujo ---------- */
function quad(pts, col) { c.fillStyle = col; c.beginPath(); pts.forEach((p) => c.lineTo(p[0], p[1])); c.closePath(); c.fill(); }
function draw() {
  const g0 = c.createLinearGradient(0, 0, 0, H); g0.addColorStop(0, '#120c24'); g0.addColorStop(0.3, '#2a1a44'); g0.addColorStop(1, '#1a1230'); c.fillStyle = g0; c.fillRect(0, 0, W, H);
  const y0 = cam - 40, y1 = LANE_L + 60, span = LANE_W * 2 + GUT * 2 + 26;
  // pistas vecinas (tenues), separadores y pista principal
  for (const o of [-1, 1]) { const ox = o * span; quad([P(ox - LANE_W - GUT, y0), P(ox + LANE_W + GUT, y0), P(ox + LANE_W + GUT, y1), P(ox - LANE_W - GUT, y1)], '#3a2a3c'); quad([P(ox - LANE_W, y0), P(ox + LANE_W, y0), P(ox + LANE_W, PIT), P(ox - LANE_W, PIT)], '#8a5a3a'); }
  for (const o of [-1, 1]) { const x0 = o * (LANE_W + GUT), x1 = o * (LANE_W + GUT + 26); quad([P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], '#4a3a6a'); const a = P(x0, y0), b = P(x0, y1); c.strokeStyle = '#6e62f5'; c.lineWidth = 2; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  // canales
  for (const o of [-1, 1]) { const x0 = o * LANE_W, x1 = o * (LANE_W + GUT); quad([P(x0, y0), P(x1, y0), P(x1, PIT), P(x0, PIT)], '#2c2438'); quad([P(x0 + o * 3, y0), P(x1 - o * 3, y0), P(x1 - o * 3, PIT), P(x0 + o * 3, PIT)], '#40354f'); }
  // tablas de madera
  const NB = 13; for (let i = 0; i < NB; i++) { const xa = -LANE_W + (2 * LANE_W) * i / NB, xb = -LANE_W + (2 * LANE_W) * (i + 1) / NB; quad([P(xa, y0), P(xb, y0), P(xb, PIT), P(xa, PIT)], i % 2 ? '#e2ac6c' : '#d89e5e'); }
  // zona de bolos más clara y foso
  quad([P(-LANE_W, 1440), P(LANE_W, 1440), P(LANE_W, PIT), P(-LANE_W, PIT)], 'rgba(255,240,210,.18)');
  quad([P(-LANE_W - GUT, PIT), P(LANE_W + GUT, PIT), P(LANE_W + GUT, y1), P(-LANE_W - GUT, y1)], '#0c0818');
  // brillo del aceite
  const gl = c.createLinearGradient(0, P(0, PIT)[1], 0, BASE); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.6, 'rgba(255,255,255,.10)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); quad([P(-LANE_W * 0.5, y0), P(LANE_W * 0.1, y0), P(LANE_W * 0.1, PIT), P(-LANE_W * 0.5, PIT)], gl);
  // bordes de la pista
  c.strokeStyle = OUT; c.lineWidth = 2; for (const x of [-LANE_W, LANE_W]) { const a = P(x, y0), b = P(x, PIT); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  // flechas, puntos y línea de falta
  for (let i = -2; i <= 2; i++) { const x = i * 22, yy = 520 + Math.abs(i) * 30, a = P(x, yy + 26), l = P(x - 4, yy - 4), r = P(x + 4, yy - 4); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(l[0], l[1]); c.lineTo(r[0], r[1]); c.closePath(); c.fillStyle = '#6b3a1c'; c.fill(); }
  for (let i = -3; i <= 3; i++) { const [x, y, s] = P(i * 16, 220); c.fillStyle = '#6b3a1c'; c.beginPath(); c.ellipse(x, y, 2.2 * s * SC / 2.4, 1.2 * s * SC / 2.4, 0, 0, R2); c.fill(); }
  { const a = P(-LANE_W, 0), b = P(LANE_W, 0); if (a[1] < H) { c.strokeStyle = '#d23a4a'; c.lineWidth = 3; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); } }
  // muro del fondo (tapa del foso) con neón
  { const a = P(-LANE_W - GUT - 26, 1720), b = P(LANE_W + GUT + 26, 1720), hh = 60 * a[2] * SC; ART.rr(c, a[0], a[1] - hh, b[0] - a[0], hh, 6 * a[2]); ART.fillOut(c, '#2a1f4d', 2); c.fillStyle = '#6e62f5'; c.fillRect(a[0] + 4, a[1] - hh * 0.35, b[0] - a[0] - 8, Math.max(1.5, 4 * a[2])); c.fillStyle = '#ff5fa2'; c.fillRect(a[0] + 4, a[1] - hh * 0.25, b[0] - a[0] - 8, Math.max(1, 2 * a[2]));
    c.font = `900 ${Math.max(6, 18 * a[2] * SC / 2.4)}px ui-rounded,system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f2d15c'; c.fillText('ARCADE BOWL', (a[0] + b[0]) / 2, a[1] - hh * 0.65); }
  // objetos ordenados por profundidad
  const objs = pins.filter((p) => !p.gone || p.a > 0).map((p) => ({ o: p, y: p.y })); if (ball.a > 0) objs.push({ o: ball, y: ball.y, b: 1 }); objs.sort((u, v) => v.y - u.y);
  for (const { o, b } of objs) {
    if (b) { const [x, y, s] = P(o.x, o.y), r = BR * s * SC; c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y, r * 1.05, r * 0.35, 0, 0, R2); c.fill(); const dz = o.gutter ? -5 : 0, by = P(o.x, o.y, BR + dz)[1];
      c.drawImage(ballSpr, x - 32 * s * SC / PS, by - 32 * s * SC / PS, 64 * s * SC / PS, 64 * s * SC / PS);
      const ph = o.rot, cy = Math.cos(ph); if (cy > 0.1) { c.fillStyle = '#0c0818'; for (const [hx, hy] of [[-0.25, 0], [0.25, 0], [0, 0.45]]) { c.beginPath(); c.ellipse(x + hx * r, by - Math.sin(ph) * r * 0.55 + hy * r * cy * 0.6, r * 0.12, r * 0.12 * cy, 0, 0, R2); c.fill(); } }
      continue; }
    const [x, y, s] = P(o.x, o.y), sc = s * SC / PS; c.globalAlpha = o.a;
    if (!o.gone) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y, 7 * s * SC, 2.4 * s * SC, 0, 0, R2); c.fill(); }
    c.save(); c.translate(x, y); const tilt = o.tilt * (Math.PI / 2) * o.fd + Math.sin(t * 30) * o.wob * 0.08; c.rotate(tilt); if (o.down) c.translate(0, o.tilt * 4 * s * SC); c.drawImage(pinSpr, -20 * sc, -102 * sc, 40 * sc, 104 * sc); c.restore(); c.globalAlpha = 1;
  }
  // guía de lanzamiento
  if (state === 'aim') { const [bx, by, bs] = P(ball.x, ball.y); let ang = aimA; if (k.ptr.down && !path.moving) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.sy - k.ptr.y; if (dy > 20) ang = k.clamp(Math.atan2(dx, dy) * 0.28, -0.12, 0.12); }
    if (kb || (k.ptr.down && !path.moving)) { c.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 1; i < 16; i++) { const yy = ball.y + i * 90, [x, y, s] = P(ball.x + Math.tan(ang) * i * 90, yy); if (yy > 1480) break; c.globalAlpha = 1 - i / 16; c.beginPath(); c.arc(x, y, 3 * s * SC / 2, 0, R2); c.fill(); } c.globalAlpha = 1; }
    if (!k.ptr.down && !kb) { const e = (t % 1.5) / 1.5; c.globalAlpha = 1 - e; c.strokeStyle = '#fff'; c.lineWidth = 3; c.lineCap = 'round'; const yy = by - 40 - e * 90; c.beginPath(); c.moveTo(bx, by - 40); c.lineTo(bx, yy); c.moveTo(bx - 8, yy + 9); c.lineTo(bx, yy); c.lineTo(bx + 8, yy + 9); c.stroke(); c.globalAlpha = 1;
      label('← arrastra →', bx, by + 30, 12, 'rgba(255,255,255,.8)', 'center'); } }
  hud();
}
function hud() {
  const sc = score(); ART.rr(c, 4, 4, W - 8, 56, 8); c.fillStyle = 'rgba(12,8,24,.85)'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#6e62f5'; c.stroke();
  for (let f = 0; f < 10; f++) { const w = f === 9 ? 46 : 32.5, x = 8 + f * 33.7, cur = f === frame && k.st === 'play'; ART.rr(c, x, 8, w - 2, 48, 5); c.fillStyle = cur ? 'rgba(242,209,92,.22)' : 'rgba(255,255,255,.07)'; c.fill(); if (cur) { c.strokeStyle = '#f2d15c'; c.lineWidth = 1.5; c.stroke(); }
    const fr = frames[f] || [], n = f === 9 ? 3 : 2, bw = (w - 2) / n; for (let i = 0; i < n; i++) { const v = fr[i]; const bx = x + i * bw; c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; c.strokeRect(bx + 1.5, 10, bw - 3, 16); if (v === undefined) continue;
      const mk = marks(f, fr)[i];
      c.font = '800 11px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = mk === 'X' ? '#ff5fa2' : mk === '/' ? '#5ce1e6' : '#fff'; c.fillText(mk, bx + bw / 2, 18.5); }
    label(String(f + 1), x + 3, 44, 7, 'rgba(255,255,255,.4)'); if (sc[f] !== undefined) label(String(sc[f]), x + (w - 2) / 2, 30, 13, '#f2d15c', 'center'); }
  // diagrama de bolos en pie
  ART.rr(c, W - 70, 66, 62, 56, 8); c.fillStyle = 'rgba(12,8,24,.7)'; c.fill(); const ids = new Set(pins.filter((p) => !p.down && !p.gone).map((p) => p.id)); const L = [[0, 0], [-1, 1], [1, 1], [-2, 2], [0, 2], [2, 2], [-3, 3], [-1, 3], [1, 3], [3, 3]];
  L.forEach(([x, r], i) => { const px = W - 39 + x * 6.5, py = 112 - r * 12; c.beginPath(); c.arc(px, py, 4.2, 0, R2); c.fillStyle = ids.has(i) && state !== 'sweep' || (state === 'sweep' && ids.has(i)) ? '#fff' : 'rgba(255,255,255,.15)'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke(); });
  label(`Frame ${Math.min(10, frame + 1)} · Bola ${roll + 1}`, 10, 68, 12, '#e6e1ff');
  if (msgT > 0) { const e = Math.min(1, (1.3 - msgT) / 0.16), s = 0.5 + 0.5 * e + Math.sin(e * Math.PI) * 0.25; c.save(); c.translate(W / 2, 300); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, -22, msg.length > 8 ? 34 : 44, msgC, 'center'); c.restore(); c.globalAlpha = 1; }
}
function marks(f, fr) { return fr.map((v, i) => { const fresh = i === 0 || (f === 9 && (i === 1 ? fr[0] === 10 : fr[0] === 10 ? fr[1] === 10 : fr[0] + fr[1] === 10));
  return fresh ? (v === 10 ? 'X' : v ? String(v) : '-') : fr[i - 1] + v === 10 ? '/' : v ? String(v) : '-'; }); }
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }

/* ¿la puntuación supera el récord guardado? (se consulta antes de que k.lose/k.end lo actualicen) */
function NREC(s) { let b = 0; try { b = +localStorage.getItem('best:' + CFG.id) || 0; } catch (e) {} if (s > b && s > 0) { k.confetti(); return '¡Nuevo récord! · '; } return ''; }
