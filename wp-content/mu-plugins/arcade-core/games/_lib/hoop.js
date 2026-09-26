/* Hoop Arc con arte propio: arrastra hacia atrás (desde cualquier punto) y suelta para lanzar; o ← → ángulo, ↑ ↓ fuerza y A.
 * Tablero, aro y red con física (se deforma al pasar el balón). Racha = multiplicador; con racha 3 el aro se mueve y el balón arde.
 * Canasta limpia (sin tocar aro ni tablero) = +1 punto y +2 s. 60 segundos. */
/* CFG.mode 'duel' → duelGame() (al final del archivo); sin modo: Hoop Arc en solitario. */
/* ---------- Ley de la pieza única (REMASTER §8) ----------
 * uni(): traza TODAS las partes y las rellena después, así los contornos interiores quedan
 * tapados y solo sobrevive el borde exterior de la silueta. inw(): detalle interior recortado
 * contra esa silueta. Las separaciones internas se leen por sombra propia o por cambio de
 * color, nunca por stroke. Una pieza solo se separa cuando se mueve de verdad. */
function uni(g, parts, ow) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = ow * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); } }
const all = (parts) => (g) => { for (const p of parts) p(g); };
function inw(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
const rp = (g, x, y, w, h, r) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const cp = (g, x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); g.closePath(); };
const ep2 = (g, x, y, rx, ry, rot) => { g.moveTo(x + rx * Math.cos(rot || 0), y + rx * Math.sin(rot || 0)); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.closePath(); };
const ply = (pts) => (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
/* hueso de ancho variable: baja por un costado, redondea la punta y vuelve por el otro, así
 * miembro y tronco se unen con tangente continua y sin escalón. */
function bone(pts, ws) {
  return (g) => {
    const n = pts.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i > 0 ? i - 1 : 0], b = pts[i < n - 1 ? i + 1 : n - 1];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
      L.push([pts[i][0] - ty * ws[i], pts[i][1] + tx * ws[i]]);
      R.push([pts[i][0] + ty * ws[i], pts[i][1] - tx * ws[i]]);
    }
    g.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(L[i][0], L[i][1], (L[i][0] + L[i + 1][0]) / 2, (L[i][1] + L[i + 1][1]) / 2);
    g.lineTo(L[n - 1][0], L[n - 1][1]);
    const e = pts[n - 1], w = ws[n - 1], a0 = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
    g.arc(e[0], e[1], w, a0, a0 - Math.PI, true);
    for (let i = n - 2; i > 0; i--) g.quadraticCurveTo(R[i][0], R[i][1], (R[i][0] + R[i - 1][0]) / 2, (R[i][1] + R[i - 1][1]) / 2);
    g.lineTo(R[0][0], R[0][1]);
    g.closePath();
  };
}
if (CFG.mode === 'duel') duelGame(); else {
const OUT = ART.OUT, R2 = 6.2832, W = 360, H = 640, FLOOR = 578, BR = 13, RIM = 26, NC = 7, NR = 5;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#241a3a' }), c = k.ctx;
let shotN = 0, ball, hoop, score, time, streak, aim, msg, msgT, msgC, best, net, kAng, kPow, kb, t = 0, bgCv, ballSpr, fireT = 0, clankT = 0;
/* los primeros lanzamientos salen cerca del aro; la zona se abre hasta la completa hacia el 18.º (1.23) */
function newBall() { const d = Math.min(1, shotN++ / 18); ball = { x: k.rnd(190 - 140 * d, 190 - 10 * (1 - d)), y: k.rnd(440 - 40 * d, 480 + 40 * d), vx: 0, vy: 0, fly: false, scored: false, prevY: 0, rot: 0, sp: 0, touched: false, bounces: 0, pop: 0, done: 0 }; ball.sx = ball.x; ball.sy = ball.y;
  const dx = hoop.x - ball.x, hh = ball.y - hoop.y, a = 1.0, den = 2 * Math.cos(a) ** 2 * (dx * Math.tan(a) - hh); kAng = -a; kPow = den > 0 ? k.clamp(Math.sqrt(1300 * dx * dx / den) / 950 * 0.9, 0.2, 1) : 0.8; } /* el teclado parte de un tiro corto: hay que ajustarlo */
function reset() { shotN = 0; hoop = { x: 280, y: 230, vx: 0 }; score = 0; time = 60; streak = 0; best = 0; msg = ''; msgT = 0; kb = false; net = []; for (let j = 0; j < NR; j++) for (let i = 0; i < NC; i++) net.push({ i, j, dx: 0, dy: 0, vx: 0, vy: 0 }); newBall(); }
/* ---------- Cacheados: pabellón y balón ---------- */
function buildArt() {
  bgCv = document.createElement('canvas'); bgCv.width = W * 2; bgCv.height = H * 2; const g = bgCv.getContext('2d'); g.scale(2, 2);
  const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return v - Math.floor(v); };
  let gr = g.createLinearGradient(0, 0, 0, FLOOR); gr.addColorStop(0, '#171033'); gr.addColorStop(1, '#3b2a66'); g.fillStyle = gr; g.fillRect(0, 0, W, FLOOR);
  // paneles de pared y grada en sombra
  g.fillStyle = 'rgba(255,255,255,.04)'; for (let x = 0; x < W; x += 60) g.fillRect(x, 0, 2, FLOOR);
  for (let r = 0; r < 6; r++) for (let i = 0; i < 26; i++) { const x = i * 14 + (r % 2) * 7 + hr(i, r) * 3, y = 380 + r * 16; g.fillStyle = `rgba(${[255, 120, 190][r % 3]},${[90, 110, 200][i % 3]},${[140, 255, 120][(r + i) % 3]},.25)`; g.beginPath(); g.arc(x, y, 5, Math.PI, 0); g.fill(); g.beginPath(); g.arc(x, y - 7, 3.4, 0, R2); g.fill(); }
  g.fillStyle = '#241a44'; g.fillRect(0, 474, W, 104); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 474, W, 4);
  // pancartas
  [['#ff5fa2', 40], ['#5ce1e6', 150]].forEach(([col, x], i) => { g.beginPath(); g.moveTo(x, 70); g.lineTo(x + 50, 70); g.lineTo(x + 50, 150); g.lineTo(x + 25, 136); g.lineTo(x, 150); g.closePath(); ART.fillOut(g, col, 2); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '900 16px ui-rounded,system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(i ? '3' : '1', x + 25, 110); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 4, 74, 6, 60); });
  // focos
  for (const x of [70, 200, 330]) { gr = g.createLinearGradient(0, 0, 0, FLOOR); gr.addColorStop(0, 'rgba(255,240,200,.18)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 10, 0); g.lineTo(x + 10, 0); g.lineTo(x + 80, FLOOR); g.lineTo(x - 80, FLOOR); g.fill(); }
  // parqué
  gr = g.createLinearGradient(0, FLOOR, 0, H); gr.addColorStop(0, '#c98a4b'); gr.addColorStop(1, '#8a5a33'); g.fillStyle = gr; g.fillRect(0, FLOOR, W, H - FLOOR);
  for (let i = -12; i < 24; i++) { g.strokeStyle = 'rgba(90,50,20,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(i * 30, FLOOR); g.lineTo(i * 30 - (i * 30 - 180) * 0.7, H); g.stroke(); }
  g.strokeStyle = 'rgba(90,50,20,.3)'; for (let y = FLOOR + 8, hh = 6; y < H; hh *= 1.35, y += hh) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, FLOOR + 2, W, 3);
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.beginPath(); g.ellipse(300, FLOOR + 30, 210, 22, 0, Math.PI * 0.55, Math.PI * 1.02); g.stroke();
  g.fillStyle = OUT; g.fillRect(0, FLOOR - 1, W, 2.5);
  ballSpr = document.createElement('canvas'); ballSpr.width = ballSpr.height = 64; const b = ballSpr.getContext('2d'); b.scale(2, 2);
  gr = b.createRadialGradient(12, 11, 2, 16, 16, BR); gr.addColorStop(0, '#ffb870'); gr.addColorStop(0.55, '#f07a22'); gr.addColorStop(1, '#b44a0c'); b.beginPath(); b.arc(16, 16, BR, 0, R2); b.fillStyle = gr; b.fill();
  b.fillStyle = 'rgba(90,30,0,.25)'; for (let i = 0; i < 40; i++) b.fillRect(4 + hr(i, 1) * 24, 4 + hr(i, 2) * 24, 1, 1);
}
buildArt(); reset();
k.show(CFG.title, 'Arrastra hacia atrás y suelta para lanzar (o ← → ángulo, ↑ ↓ fuerza y A). Encesta seguido para multiplicar puntos; canasta limpia = +1 y +2 s. 60 segundos.');
function throwBall(a, p) { ball.vx = Math.cos(a) * p * 950; ball.vy = Math.sin(a) * p * 950; ball.sp = -ball.vx / 60; ball.fly = true; k.sfx('jump'); }
const rimL = () => [hoop.x - RIM, hoop.y], rimR = () => [hoop.x + RIM, hoop.y], BB = () => ({ x0: hoop.x + RIM + 8, x1: hoop.x + RIM + 20, y0: hoop.y - 92, y1: hoop.y + 14 });
k.run((dt) => {
  t += dt; msgT -= dt; clankT -= dt; if (!k.gate(reset)) return; time -= dt; if (time <= 0) { time = 0; return k.lose(CFG.id, score, '¡Tiempo!', `Mejor racha x${best}`); }
  if (streak >= 3) { if (!hoop.vx) hoop.vx = 32; const hv = Math.min(80, 32 + (streak - 3) * 4); hoop.vx = Math.sign(hoop.vx) * hv; hoop.x += hoop.vx * dt; if (hoop.x > 300) { hoop.x = 300; hoop.vx = -Math.abs(hoop.vx); } if (hoop.x < 205) { hoop.x = 205; hoop.vx = Math.abs(hoop.vx); } } else { hoop.vx = 0; hoop.x += (280 - hoop.x) * Math.min(1, dt * 2); }
  stepNet(dt);
  ball.pop = Math.min(1, ball.pop + dt * 5);
  if (!ball.fly) {
    if (k.ptr.hit) aim = true;
    if (aim && k.ptr.up) { aim = false; const dx = k.ptr.sx - k.ptr.x, dy = k.ptr.sy - k.ptr.y, p = Math.min(1, Math.hypot(dx, dy) / 160); if (p > 0.1) throwBall(Math.atan2(dy, dx), p); }
    if (k.held.has('left')) { kAng -= 1.2 * dt; kb = true; } if (k.held.has('right')) { kAng += 1.2 * dt; kb = true; }
    if (k.held.has('up')) { kPow = Math.min(1, kPow + 0.5 * dt); kb = true; } if (k.held.has('down')) { kPow = Math.max(0.15, kPow - 0.5 * dt); kb = true; }
    if (k.hit.has('a')) throwBall(kAng, kPow);
    return;
  }
  if (streak >= 3 && (fireT -= dt) <= 0) { fireT = 0.03; k.burst(ball.x, ball.y, k.pick(['#ffb13d', '#ff5f2d', '#f2d15c']), 2, 40); }
  const h = dt / 5; for (let s = 0; s < 5; s++) { const b = ball; b.prevY = b.y; b.vy += 1300 * h; b.x += b.vx * h; b.y += b.vy * h; b.rot += b.sp * h * 6;
    for (const [rx, ry] of [rimL(), rimR()]) { const d = Math.hypot(b.x - rx, b.y - ry); if (d < BR + 3) { const nx = (b.x - rx) / d, ny = (b.y - ry) / d, vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; b.sp += vn * nx * 0.02; if (clankT <= 0 && vn < -80) { k.sfx('hit'); clankT = 0.12; } b.touched = true; } b.x = rx + nx * (BR + 3); b.y = ry + ny * (BR + 3); } }
    const bb = BB(); if (b.x + BR > bb.x0 && b.x - BR < bb.x1 && b.y > bb.y0 && b.y < bb.y1) { if (b.vx > 0 && b.x < bb.x0) { b.x = bb.x0 - BR; b.vx = -Math.abs(b.vx) * 0.6; b.touched = true; if (clankT <= 0) { k.sfx('click'); clankT = 0.12; } } else if (b.y < bb.y0 + 10 && b.vy > 0) { b.y = bb.y0 - 1; b.vy = -Math.abs(b.vy) * 0.5; } }
    if (!b.scored && b.prevY < hoop.y && b.y >= hoop.y && Math.abs(b.x - hoop.x) < RIM - 5 && b.vy > 0) scored(); /* 1.23: más fácil (RIM-8→RIM-5) */
    // el balón empuja la red
    for (const n of net) { const [nx0, ny0] = netRest(n), px = nx0 + n.dx, py = ny0 + n.dy, d = Math.hypot(px - b.x, py - b.y); if (d < BR + 1 && d > 0) { const f = (BR + 1 - d); n.dx += (px - b.x) / d * f * 0.7; n.dy += (py - b.y) / d * f * 0.7; n.vx += b.vx * 0.02; n.vy += b.vy * 0.03; } }
    if (b.y > FLOOR - BR && b.vy > 0) { b.y = FLOOR - BR; b.vy *= -0.55; b.vx *= 0.8; b.sp *= 0.8; b.bounces++; if (Math.abs(b.vy) > 60) k.sfx('pop'); } }
  if (ball.bounces >= 2 || ball.x < -40 || ball.x > 400 || ball.done) { if (!ball.scored) { if (streak) { msg = 'Fallo'; msgC = '#ff9a9a'; msgT = 0.7; } streak = 0; } newBall(); }
}, draw);
function scored() {
  const b = ball; b.scored = true; streak++; best = Math.max(best, streak); const far = Math.hypot(b.sx - hoop.x, b.sy - hoop.y) > 330, swish = !b.touched;
  const pts = 2 * Math.min(5, streak) + (far ? 1 : 0) + (swish ? 1 : 0); score += pts; if (swish) time = Math.min(60, time + 2);
  msg = swish ? `¡Limpia! +${pts}` : streak > 1 ? `+${pts} ¡Racha x${streak}!` : `+${pts}`; msgC = swish ? '#5ce1e6' : '#f2d15c'; msgT = 1.1;
  k.burst(hoop.x, hoop.y + 20, streak >= 3 ? '#ff9a3d' : '#f2d15c', 18, 150); k.sfx(streak >= 3 ? 'win' : 'coin'); if (swish) k.float('+2 s', hoop.x, hoop.y + 60, '#5ce1e6'); if (streak === 3) { k.float('¡EN LLAMAS!', 180, 330, '#ff9a3d'); k.flash('rgba(255,150,60,.3)'); } navigator.vibrate && navigator.vibrate(20);
  for (const n of net) n.vy += 60 * (1 - n.j / NR);
}
/* ---------- Red: nodos con muelle hacia su posición de reposo ---------- */
function netRest(n) { const u = n.i / (NC - 1) * 2 - 1, taper = 1 - 0.45 * n.j / (NR - 1); return [hoop.x + u * RIM * taper, hoop.y + 2 + n.j * 11]; }
function stepNet(dt) { for (const n of net) { if (n.j === 0) { n.dx = n.dy = 0; continue; } n.vx += (-n.dx * 90 - n.vx * 6) * dt; n.vy += (-n.dy * 90 - n.vy * 6) * dt; n.dx += n.vx * dt; n.dy += n.vy * dt; } }
function drawNet() {
  const P = (i, j) => { const n = net[j * NC + i], [x, y] = netRest(n); return [x + n.dx, y + n.dy]; };
  c.lineCap = 'round'; for (const [lw, col] of [[3.2, 'rgba(26,21,48,.55)'], [1.6, '#f4f2ff']]) { c.lineWidth = lw; c.strokeStyle = col; c.beginPath();
    for (let j = 0; j < NR - 1; j++) for (let i = 0; i < NC; i++) { const a = P(i, j); if (i < NC - 1) { const b = P(i + 1, j + 1); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } if (i > 0) { const b = P(i - 1, j + 1); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } }
    for (const j of [NR - 1]) for (let i = 0; i < NC - 1; i++) { const a = P(i, j), b = P(i + 1, j); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } c.stroke(); }
}
function drawBall() {
  const b = ball, s = 0.4 + 0.6 * b.pop, r = BR * s; c.save(); c.translate(b.x, b.y);
  if (streak >= 3 && b.fly) { c.fillStyle = 'rgba(255,140,40,.35)'; c.beginPath(); c.arc(0, 0, r + 6 + Math.sin(t * 30) * 2, 0, R2); c.fill(); }
  c.drawImage(ballSpr, -16 * s, -16 * s, 32 * s, 32 * s);
  c.save(); c.beginPath(); c.arc(0, 0, r, 0, R2); c.clip(); c.rotate(b.rot); c.strokeStyle = '#4a1f05'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.moveTo(-r * 0.7, -r); c.quadraticCurveTo(-r * 0.15, 0, -r * 0.7, r); c.moveTo(r * 0.7, -r); c.quadraticCurveTo(r * 0.15, 0, r * 0.7, r); c.stroke(); c.restore();
  c.beginPath(); c.arc(0, 0, r, 0, R2); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-r * 0.38, -r * 0.45, r * 0.3, r * 0.18, -0.6, 0, R2); c.fill(); c.restore();
}
function draw() {
  c.drawImage(bgCv, 0, 0, W, H);
  // sombra del balón en el suelo
  const hgt = Math.max(0, FLOOR - ball.y), sh = Math.max(0.25, 1 - hgt / 500); c.fillStyle = `rgba(0,0,0,${0.35 * sh})`; c.beginPath(); c.ellipse(ball.x, FLOOR + 6, 16 * sh, 4 * sh, 0, 0, R2); c.fill();
  // poste, brazo y tablero
  const bb = BB(), px = bb.x1 + 26; c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(px, FLOOR + 6, 22, 5, 0, 0, R2); c.fill();
  { const post = (q) => rp(q, px - 5, bb.y0 + 30, 10, FLOOR - bb.y0 - 28, 3),
      base = (q) => rp(q, px - 22, FLOOR - 70, 44, 70, 6),
      brazo = ply([[bb.x1, hoop.y - 44], [px, bb.y0 + 34], [px, bb.y0 + 48], [bb.x1, hoop.y - 30]]),
      tab = ply([[bb.x0, bb.y0 + 6], [bb.x1, bb.y0], [bb.x1, bb.y1 - 6], [bb.x0, bb.y1]]);
    uni(c, [[base, '#2e3350'], [post, '#5d6480'], [brazo, '#5d6480'], [tab, 'rgba(235,245,255,.92)']], 1.3);
    inw(c, all([base, post, brazo, tab]), (q) => {
      q.fillStyle = 'rgba(26,21,48,.22)'; q.beginPath(); rp(q, px - 24, FLOOR - 72, 48, 5, 2); q.fill();
      q.fillStyle = 'rgba(255,255,255,.2)'; q.beginPath(); rp(q, px - 3, bb.y0 + 34, 3, FLOOR - bb.y0 - 40, 1.5); q.fill();
      q.fillStyle = '#ff5fa2'; q.beginPath(); rp(q, px - 18, FLOOR - 60, 36, 4, 2); q.fill(); }); }
  c.strokeStyle = '#e0303f'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(bb.x0 + 3, hoop.y - 34); c.lineTo(bb.x1 - 3, hoop.y - 36); c.lineTo(bb.x1 - 3, hoop.y - 6); c.lineTo(bb.x0 + 3, hoop.y - 4); c.closePath(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(bb.x0 + 2, bb.y0 + 10, 2, 40);
  // aro: mitad trasera, balón, red, mitad delantera
  const hot = streak >= 3; c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.ellipse(hoop.x, hoop.y, RIM, 6, 0, Math.PI, R2); c.stroke(); c.lineWidth = 4; c.strokeStyle = hot ? '#ffb13d' : '#ff5f2d'; c.stroke();
  c.fillStyle = '#9aa2b5'; c.fillRect(hoop.x + RIM - 1, hoop.y - 3, bb.x0 - hoop.x - RIM + 1, 5);
  const behind = ball.y < hoop.y || Math.abs(ball.x - hoop.x) > RIM + BR; if (behind) drawBall(); drawNet(); if (!behind) drawBall();
  c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.ellipse(hoop.x, hoop.y, RIM, 6, 0, 0, Math.PI); c.stroke(); c.lineWidth = 4; c.strokeStyle = hot ? '#ffb13d' : '#ff5f2d'; c.stroke();
  if (hot) { c.globalAlpha = 0.5 + Math.sin(t * 20) * 0.2; for (let i = 0; i < 6; i++) { const x = hoop.x - RIM + i * RIM * 0.4, hh = 8 + Math.sin(t * 17 + i * 2) * 4; c.fillStyle = i % 2 ? '#ffb13d' : '#ff5f2d'; c.beginPath(); c.moveTo(x - 4, hoop.y); c.quadraticCurveTo(x, hoop.y - hh * 2, x + 4, hoop.y); c.fill(); } c.globalAlpha = 1; }
  // guía de tiro
  let a = null, p = 0; if (!ball.fly && aim && k.ptr.down) { const dx = k.ptr.sx - k.ptr.x, dy = k.ptr.sy - k.ptr.y; p = Math.min(1, Math.hypot(dx, dy) / 160); if (p > 0.1) a = Math.atan2(dy, dx); } else if (!ball.fly && kb) { a = kAng; p = kPow; }
  if (a !== null) { let x = ball.x, y = ball.y, vx = Math.cos(a) * p * 950, vy = Math.sin(a) * p * 950; const dots = Math.round(24 - 8 * Math.min(1, shotN / 12)); for (let i = 0; i < dots; i++) { for (let j = 0; j < 3; j++) { vy += 1300 * 0.012; x += vx * 0.012; y += vy * 0.012; } c.globalAlpha = 1 - i / (dots + 2); c.beginPath(); c.arc(x, y, 4 - i * 0.12, 0, R2); ART.fillOut(c, '#fff', 1.5); } c.globalAlpha = 1;
    c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.arc(ball.x, ball.y, 22, -Math.PI / 2, -Math.PI / 2 + p * R2); c.stroke(); c.strokeStyle = `hsl(${120 - p * 120} 90% 60%)`; c.lineWidth = 4; c.stroke(); }
  if (!ball.fly && !aim && !kb && score === 0 && time > 56) { const e = (t % 1.4) / 1.4; c.globalAlpha = 1 - e; c.fillStyle = '#fff'; c.beginPath(); c.arc(ball.x - 20 - e * 50, ball.y + 20 + e * 40, 9, 0, R2); c.fill(); c.globalAlpha = 1; }
  // HUD
  panel(8, 6, 116, 48); label(`${score}`, 18, 10, 26, '#f2d15c'); label(streak > 1 ? `Racha x${streak}` : 'puntos', 114, 16, 11, streak >= 3 ? '#ffb13d' : '#e6e1ff', 'right'); label(`Mejor x${best}`, 114, 34, 10, 'rgba(230,225,255,.7)', 'right');
  panel(W - 96, 6, 88, 48); const tl = Math.ceil(time), cx = W - 72, cy = 30; c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.arc(cx, cy, 15, 0, R2); c.stroke(); c.strokeStyle = time < 10 ? '#ff6b6b' : '#7cf7a0'; c.beginPath(); c.arc(cx, cy, 15, -Math.PI / 2, -Math.PI / 2 + R2 * time / 60); c.stroke();
  label(`${tl}`, W - 20, 16, 20, time < 10 ? '#ff6b6b' : '#fff', 'right');
  if (msgT > 0) { const e = Math.min(1, (1.1 - msgT) / 0.15), s = 0.5 + 0.5 * e + Math.sin(e * Math.PI) * 0.2; c.save(); c.translate(W / 2, 120); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, -14, 26, msgC, 'center'); c.restore(); c.globalAlpha = 1; }
}
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function panel(x, y, w, h) { ART.rr(c, x, y, w, h, 10); c.fillStyle = 'rgba(26,21,48,.72)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.14)'; c.stroke(); }
}
/* ================= Canastas a Duelo (CFG.mode 'duel'): dos canastas espalda con espalda, 60 s, 800×450 =================
 * Cada jugador tira a la suya a la vez (J1 a la izquierda, J2 a la derecha; la CPU ocupa la plaza vacía). Canasta = 2,
 * +1 si es de lejos y +1 si es limpia (sin tocar aro ni tablero). Con racha de 3 tu aro empieza a moverse.
 * Mando: ← → ángulo (hacia tu canasta = más plano), ↑ ↓ fuerza, A lanza; guía de puntos. Táctil (J1): arrastra hacia atrás
 * en tu mitad y suelta. Física en coordenadas de media pista (u = 0 en el centro, crece hacia tu canasta). */
function duelGame() {
  const W = 800, H = 450, OUT = ART.OUT, R2 = 6.2832, HW = 400, FLOOR = 404, BR = 12, RIM = 24, NC = 7, NR = 5, G = 1000, VMAX = 800, TIME = 60, ID = CFG.id || 'canastas-a-duelo';
  const k = Kit({ w: W, h: H, title: CFG.title, bg: '#241a3a' }), c = k.ctx;
  const CNAME = ['roja', 'azul', 'amarilla', 'verde'], clamp = k.clamp, gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(R2 * Math.random()); };
  let LV = 0; try { LV = clamp(+localStorage.getItem('cpu:' + ID) || 0, 0, 10); } catch (e) { /* sin almacenamiento */ }
  let seats = [], S = [], time = TIME, t = 0, over = false, overT = 0, clankT = 0;
  const DIR = [-1, 1];   // pista 0 mira a la izquierda (espejo), pista 1 a la derecha
  const sx = (i, u) => HW + DIR[i] * u;   // local → pantalla
  const nm = (i) => (seats[i].cpu ? 'CPU ' + CNAME[seats[i].p % 4] : String(seats[i].name).slice(0, 10));
  const pc = (i) => k.pcol(seats[i].p);
  k.onParty = () => { if (k.st !== 'play' || !S.length) reset(); else seats = k.players(2); };
  function mkS(i) { const s = { i, score: 0, streak: 0, best: 0, shotN: 0, hoop: { u: 318, y: 176, vu: 0 }, net: [], msg: '', msgT: 0, msgC: '#fff', kAng: -1, kPow: 0.6, prevA: false, aim: false, cpuT: 0, cpuP: null, ball: null, made: 0, att: 0 };
    for (let j = 0; j < NR; j++) for (let q = 0; q < NC; q++) s.net.push({ i: q, j, dx: 0, dy: 0, vx: 0, vy: 0 }); newBall(s); return s; }
  function reset() { seats = k.players(2); S = [mkS(0), mkS(1)]; time = TIME; over = false; overT = 0; t = 0; k.count(3); }
  /* balón nuevo: los primeros cerca, luego más lejos */
  function newBall(s) {
    const d = Math.min(1, s.shotN++ / 14), u = k.rnd(170 - 120 * d, 230 - 30 * d), y = k.rnd(318 - 20 * d, 350);
    s.ball = { u, y, vu: 0, vy: 0, fly: false, scored: false, prevY: 0, rot: 0, sp: 0, touched: false, bounces: 0, pop: 0, su: u, sy: y };
    const a0 = bestAng(s), need = solve(s, a0); s.kAng = a0; s.kPow = need ? clamp(need * 0.88, 0.3, 1) : 0.7;   // el mando parte de un tiro corto: hay que ajustarlo
    s.cpuT = 1.2 + Math.random() * 0.6 - LV * 0.05; s.cpuP = null;
  }
  /* ángulo de mínima fuerza (45° + mitad de la elevación), algo más tendido para que entre bajando */
  function bestAng(s) { const b = s.ball, dx = s.hoop.u - b.u, hh = b.y - s.hoop.y; return -clamp(Math.PI / 4 + Math.atan2(hh, dx) / 2 + 0.05, 0.6, 1.4); }
  /* fuerza (0..1) para encestar con el ángulo a desde la posición del balón */
  function solve(s, a) { const b = s.ball, dx = s.hoop.u - b.u, hh = b.y - s.hoop.y, den = 2 * Math.cos(a) ** 2 * (dx * Math.tan(-a) - hh); if (den <= 0) return null; return Math.sqrt(G * dx * dx / den) / VMAX; }
  function throwBall(s, a, p) { const b = s.ball; b.vu = Math.cos(a) * p * VMAX; b.vy = Math.sin(a) * p * VMAX; b.sp = b.vu / 60; b.fly = true; s.att++; if (!seats[s.i].cpu) k.sfx('jump'); }
  const rims = (s) => [[s.hoop.u - RIM, s.hoop.y], [s.hoop.u + RIM, s.hoop.y]];
  const BB = (s) => ({ x0: s.hoop.u + RIM + 8, x1: s.hoop.u + RIM + 19, y0: s.hoop.y - 84, y1: s.hoop.y + 12 });
  function scored(s) {
    const b = s.ball; b.scored = true; s.streak++; s.best = Math.max(s.best, s.streak); s.made++;
    const far = s.hoop.u - b.su > 210, swish = !b.touched, pts = 2 + (far ? 1 : 0) + (swish ? 1 : 0); s.score += pts;
    s.msg = swish && far ? `¡Limpia y de lejos! +${pts}` : swish ? `¡Limpia! +${pts}` : far ? `¡De lejos! +${pts}` : `+${pts}`; s.msgC = swish ? '#5ce1e6' : '#f2d15c'; s.msgT = 1.1;
    const x = sx(s.i, s.hoop.u); k.burst(x, s.hoop.y + 20, s.streak >= 3 ? '#ff9a3d' : pc(s.i), 16, 140); k.sfx(s.streak >= 3 ? 'win' : 'coin');
    if (s.streak === 3) { k.float('¡EN LLAMAS!', sx(s.i, 200), 150, '#ff9a3d'); }
    for (const n of s.net) n.vy += 60 * (1 - n.j / NR);
  }
  function netRest(s, n) { const q = n.i / (NC - 1) * 2 - 1, taper = 1 - 0.45 * n.j / (NR - 1); return [s.hoop.u + q * RIM * taper, s.hoop.y + 2 + n.j * 10]; }
  function stepNet(s, dt) { for (const n of s.net) { if (n.j === 0) { n.dx = n.dy = 0; continue; } n.vx += (-n.dx * 90 - n.vx * 6) * dt; n.vy += (-n.dy * 90 - n.vy * 6) * dt; n.dx += n.vx * dt; n.dy += n.vy * dt; } }
  /* ---------- toque en solitario: J1 en la mitad izquierda ---------- */
  function inputs(s, dt) {
    const i = s.i, p = seats[i].p, local = !k.party && p === 0 && !seats[i].cpu;
    if (seats[i].cpu) {
      s.cpuT -= dt; if (s.cpuT > 0) return;
      if (!s.cpuP) { const a = bestAng(s) - Math.random() * 0.12, need = solve(s, a) || 0.8, sig = Math.max(0.01, 0.04 - LV * 0.003); s.cpuP = { a: a + gauss() * sig * 0.4, p: clamp(need * (1 + gauss() * sig), 0.2, 1), t: 0 }; }
      s.cpuP.t += dt; s.kAng += (s.cpuP.a - s.kAng) * Math.min(1, dt * 5); s.kPow += (s.cpuP.p - s.kPow) * Math.min(1, dt * 5);
      if (s.cpuP.t > 0.55) { throwBall(s, s.cpuP.a, s.cpuP.p); s.cpuP = null; }
      return;
    }
    const d = k.pdir(p), toward = d.x * DIR[i];   // hacia tu canasta = más plano
    if (toward) s.kAng = clamp(s.kAng + toward * 0.9 * dt, -1.45, -0.25);
    if (d.y) s.kPow = clamp(s.kPow - d.y * 0.45 * dt, 0.2, 1);
    if (k.phit(p, 'a')) { throwBall(s, s.kAng, s.kPow); return; }
    if (local) {
      const inHalf = k.ptr.sx < HW;
      if (k.ptr.hit && inHalf) s.aim = true;
      if (s.aim && k.ptr.down) { const dx = (k.ptr.sx - k.ptr.x) * DIR[i], dy = k.ptr.sy - k.ptr.y, pw = Math.min(1, Math.hypot(dx, dy) / 150); if (pw > 0.1) { s.kAng = clamp(Math.atan2(dy, dx), -1.55, -0.1); s.kPow = pw; } }
      if (s.aim && k.ptr.up) { s.aim = false; const dx = (k.ptr.sx - k.ptr.x) * DIR[i], dy = k.ptr.sy - k.ptr.y, pw = Math.min(1, Math.hypot(dx, dy) / 150); if (pw > 0.1) throwBall(s, clamp(Math.atan2(dy, dx), -1.55, -0.1), pw); }
    }
  }
  function stepCourt(s, dt) {
    s.msgT -= dt;
    if (s.streak >= 3) { if (!s.hoop.vu) s.hoop.vu = 30; const hv = Math.min(70, 30 + (s.streak - 3) * 4); s.hoop.vu = Math.sign(s.hoop.vu) * hv; s.hoop.u += s.hoop.vu * dt; if (s.hoop.u > 322) { s.hoop.u = 322; s.hoop.vu = -hv; } if (s.hoop.u < 262) { s.hoop.u = 262; s.hoop.vu = hv; } }
    else { s.hoop.vu = 0; s.hoop.u += (318 - s.hoop.u) * Math.min(1, dt * 2); }
    stepNet(s, dt); const b = s.ball; b.pop = Math.min(1, b.pop + dt * 5);
    if (!b.fly) { if (!over) inputs(s, dt); return; }
    const h = dt / 5, [bb] = [BB(s)];
    for (let q = 0; q < 5; q++) { b.prevY = b.y; b.vy += G * h; b.u += b.vu * h; b.y += b.vy * h; b.rot += b.sp * h * 6;
      for (const [ru, ry] of rims(s)) { const d = Math.hypot(b.u - ru, b.y - ry); if (d < BR + 3) { const nx = (b.u - ru) / d, ny = (b.y - ry) / d, vn = b.vu * nx + b.vy * ny; if (vn < 0) { b.vu -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; b.sp += vn * nx * 0.02; if (clankT <= 0 && vn < -80) { k.sfx('hit'); clankT = 0.12; } b.touched = true; } b.u = ru + nx * (BR + 3); b.y = ry + ny * (BR + 3); } }
      if (b.u + BR > bb.x0 && b.u - BR < bb.x1 && b.y > bb.y0 && b.y < bb.y1) { if (b.vu > 0 && b.u < bb.x0) { b.u = bb.x0 - BR; b.vu = -Math.abs(b.vu) * 0.6; b.touched = true; if (clankT <= 0) { k.sfx('click'); clankT = 0.12; } } else if (b.y < bb.y0 + 10 && b.vy > 0) { b.y = bb.y0 - 1; b.vy = -Math.abs(b.vy) * 0.5; } }
      if (!b.scored && b.prevY < s.hoop.y && b.y >= s.hoop.y && Math.abs(b.u - s.hoop.u) < RIM - 4 && b.vy > 0) scored(s);
      for (const n of s.net) { const [nx0, ny0] = netRest(s, n), px = nx0 + n.dx, py = ny0 + n.dy, d = Math.hypot(px - b.u, py - b.y); if (d < BR + 1 && d > 0) { const f = BR + 1 - d; n.dx += (px - b.u) / d * f * 0.7; n.dy += (py - b.y) / d * f * 0.7; n.vx += b.vu * 0.02; n.vy += b.vy * 0.03; } }
      if (b.y > FLOOR - BR && b.vy > 0) { b.y = FLOOR - BR; b.vy *= -0.55; b.vu *= 0.8; b.sp *= 0.8; b.bounces++; if (Math.abs(b.vy) > 60) k.sfx('pop'); } }
    if (b.bounces >= 1 || (b.scored && b.y > s.hoop.y + 80) || b.u < -10 || b.u > 440) { if (!b.scored) { if (s.streak >= 2) { s.msg = 'Fallo'; s.msgC = '#ff9a9a'; s.msgT = 0.7; } s.streak = 0; } newBall(s); }
  }
  function finish() {
    const rows = S.map((s) => ({ p: seats[s.i].p, score: s.score, name: nm(s.i) })), hum = seats.filter((q) => !q.cpu);
    if (hum.length === 1) { const hi = seats.findIndex((q) => !q.cpu), win = S[hi].score > S[1 - hi].score; LV = clamp(LV + (win ? 0.5 : -0.5), 0, 10); try { localStorage.setItem('cpu:' + ID, LV); } catch (e) { /* sin almacenamiento */ } }
    k.podium(rows, { fmt: (v) => v + ' pts' });
  }
  function update(dt) {
    t += dt; clankT -= dt;
    if (!k.gate(reset)) return;
    if (k.counting()) return;
    if (over) { overT += dt; for (const s of S) stepCourt(s, dt); if (overT > 1.6) { over = false; finish(); } return; }
    const was = Math.ceil(time); time -= dt; if (time <= 10 && Math.ceil(time) !== was && time > 0) k.sfx('tick');
    if (time <= 0) { time = 0; over = true; overT = 0; k.sfx('win'); k.flash('rgba(255,255,255,.35)'); return; }
    for (const s of S) stepCourt(s, dt);
  }
  /* ---------- arte: media pista cacheada (coordenadas locales, se dibuja en espejo) ---------- */
  const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return v - Math.floor(v); };
  const court = (() => {
    const cv = document.createElement('canvas'); cv.width = HW * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
    let gr = g.createLinearGradient(0, 0, 0, FLOOR); gr.addColorStop(0, '#171033'); gr.addColorStop(1, '#3b2a66'); g.fillStyle = gr; g.fillRect(0, 0, HW, FLOOR);
    g.fillStyle = 'rgba(255,255,255,.04)'; for (let x = 0; x < HW; x += 60) g.fillRect(x, 0, 2, FLOOR);
    for (let r = 0; r < 5; r++) for (let i = 0; i < 30; i++) { const x = i * 14 + (r % 2) * 7 + hr(i, r) * 3, y = 262 + r * 15; g.fillStyle = `rgba(${[255, 120, 190][r % 3]},${[90, 110, 200][i % 3]},${[140, 255, 120][(r + i) % 3]},.25)`; g.beginPath(); g.arc(x, y, 5, Math.PI, 0); g.fill(); g.beginPath(); g.arc(x, y - 7, 3.4, 0, R2); g.fill(); }
    g.fillStyle = '#241a44'; g.fillRect(0, 334, HW, FLOOR - 334); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 334, HW, 4);
    for (const x of [80, 250]) { gr = g.createLinearGradient(0, 0, 0, FLOOR); gr.addColorStop(0, 'rgba(255,240,200,.16)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 10, 0); g.lineTo(x + 10, 0); g.lineTo(x + 70, FLOOR); g.lineTo(x - 70, FLOOR); g.fill(); }
    gr = g.createLinearGradient(0, FLOOR, 0, H); gr.addColorStop(0, '#c98a4b'); gr.addColorStop(1, '#8a5a33'); g.fillStyle = gr; g.fillRect(0, FLOOR, HW, H - FLOOR);
    for (let i = -8; i < 24; i++) { g.strokeStyle = 'rgba(90,50,20,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(i * 30, FLOOR); g.lineTo(i * 30 - (i * 30 - 200) * 0.6, H); g.stroke(); }
    g.strokeStyle = 'rgba(90,50,20,.3)'; for (let y = FLOOR + 6, hh = 5; y < H; hh *= 1.4, y += hh) { g.beginPath(); g.moveTo(0, y); g.lineTo(HW, y); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.beginPath(); g.ellipse(340, FLOOR + 22, 230, 16, 0, Math.PI * 0.55, Math.PI * 1.02); g.stroke();   // línea de tres (lejos)
    g.fillStyle = OUT; g.fillRect(0, FLOOR - 1, HW, 2.5);
    return cv;
  })();
  const ballSpr = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const b = cv.getContext('2d'); b.scale(2, 2);
    const gr = b.createRadialGradient(12, 11, 2, 16, 16, BR); gr.addColorStop(0, '#ffb870'); gr.addColorStop(0.55, '#f07a22'); gr.addColorStop(1, '#b44a0c'); b.beginPath(); b.arc(16, 16, BR, 0, R2); b.fillStyle = gr; b.fill();
    b.fillStyle = 'rgba(90,30,0,.25)'; for (let i = 0; i < 40; i++) b.fillRect(4 + hr(i, 1) * 24, 4 + hr(i, 2) * 24, 1, 1); return cv; })();
  function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
  function drawBall(s) {
    const b = s.ball, sc = 0.4 + 0.6 * b.pop, r = BR * sc; c.save(); c.translate(b.u, b.y);
    if (s.streak >= 3 && b.fly) { c.fillStyle = 'rgba(255,140,40,.35)'; c.beginPath(); c.arc(0, 0, r + 6 + Math.sin(t * 30) * 2, 0, R2); c.fill(); }
    c.drawImage(ballSpr, -16 * sc, -16 * sc, 32 * sc, 32 * sc);
    c.save(); c.beginPath(); c.arc(0, 0, r, 0, R2); c.clip(); c.rotate(b.rot); c.strokeStyle = '#4a1f05'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.moveTo(-r * 0.7, -r); c.quadraticCurveTo(-r * 0.15, 0, -r * 0.7, r); c.moveTo(r * 0.7, -r); c.quadraticCurveTo(r * 0.15, 0, r * 0.7, r); c.stroke(); c.restore();
    c.beginPath(); c.arc(0, 0, r, 0, R2); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-r * 0.38, -r * 0.45, r * 0.3, r * 0.18, -0.6, 0, R2); c.fill(); c.restore();
  }
  function drawNet(s) {
    const P = (q, j) => { const n = s.net[j * NC + q], [x, y] = netRest(s, n); return [x + n.dx, y + n.dy]; };
    c.lineCap = 'round'; for (const [lw, col] of [[3.2, 'rgba(26,21,48,.55)'], [1.6, '#f4f2ff']]) { c.lineWidth = lw; c.strokeStyle = col; c.beginPath();
      for (let j = 0; j < NR - 1; j++) for (let q = 0; q < NC; q++) { const a = P(q, j); if (q < NC - 1) { const b = P(q + 1, j + 1); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } if (q > 0) { const b = P(q - 1, j + 1); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } }
      for (let q = 0; q < NC - 1; q++) { const a = P(q, NR - 1), b = P(q + 1, NR - 1); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } c.stroke(); }
  }
  function drawCourt(s) {
    const i = s.i, b = s.ball, hoop = s.hoop, bb = BB(s), px = bb.x1 + 16, col = pc(i);
    c.save(); c.translate(HW, 0); c.scale(DIR[i], 1);
    c.drawImage(court, 0, 0, HW, H);
    c.fillStyle = ART.alpha(col, 0.1); c.fillRect(0, 0, HW, FLOOR);
    const hgt = Math.max(0, FLOOR - b.y), sh = Math.max(0.25, 1 - hgt / 400); c.fillStyle = `rgba(0,0,0,${0.35 * sh})`; c.beginPath(); c.ellipse(b.u, FLOOR + 6, 15 * sh, 4 * sh, 0, 0, R2); c.fill();
    // poste, brazo y tablero (color del jugador)
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(px, FLOOR + 6, 18, 4, 0, 0, R2); c.fill();
    { const post = (q) => rp(q, px - 5, bb.y0 + 30, 10, FLOOR - bb.y0 - 28, 3),
        base = (q) => rp(q, px - 16, FLOOR - 56, 32, 56, 6),
        brazo = ply([[bb.x1, hoop.y - 40], [px, bb.y0 + 34], [px, bb.y0 + 46], [bb.x1, hoop.y - 28]]),
        tab = ply([[bb.x0, bb.y0 + 6], [bb.x1, bb.y0], [bb.x1, bb.y1 - 6], [bb.x0, bb.y1]]);
      uni(c, [[base, '#2e3350'], [post, '#5d6480'], [brazo, '#5d6480'], [tab, 'rgba(235,245,255,.92)']], 1.3);
      inw(c, all([base, post, brazo, tab]), (q) => { q.fillStyle = 'rgba(26,21,48,.22)'; q.beginPath(); rp(q, px - 18, FLOOR - 58, 36, 5, 2); q.fill();
        q.fillStyle = col; q.beginPath(); rp(q, px - 12, FLOOR - 48, 24, 4, 2); q.fill(); }); }
    c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); c.moveTo(bb.x0 + 3, hoop.y - 32); c.lineTo(bb.x1 - 3, hoop.y - 34); c.lineTo(bb.x1 - 3, hoop.y - 6); c.lineTo(bb.x0 + 3, hoop.y - 4); c.closePath(); c.stroke();
    const hot = s.streak >= 3, rc = hot ? '#ffb13d' : '#ff5f2d';
    c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.ellipse(hoop.u, hoop.y, RIM, 6, 0, Math.PI, R2); c.stroke(); c.lineWidth = 4; c.strokeStyle = rc; c.stroke();
    c.fillStyle = '#9aa2b5'; c.fillRect(hoop.u + RIM - 1, hoop.y - 3, bb.x0 - hoop.u - RIM + 1, 5);
    const behind = b.y < hoop.y || Math.abs(b.u - hoop.u) > RIM + BR; if (behind) drawBall(s); drawNet(s); if (!behind) drawBall(s);
    c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.ellipse(hoop.u, hoop.y, RIM, 6, 0, 0, Math.PI); c.stroke(); c.lineWidth = 4; c.strokeStyle = rc; c.stroke();
    if (hot) { c.globalAlpha = 0.5 + Math.sin(t * 20) * 0.2; for (let q = 0; q < 6; q++) { const x = hoop.u - RIM + q * RIM * 0.4, hh = 8 + Math.sin(t * 17 + q * 2) * 4; c.fillStyle = q % 2 ? '#ffb13d' : '#ff5f2d'; c.beginPath(); c.moveTo(x - 4, hoop.y); c.quadraticCurveTo(x, hoop.y - hh * 2, x + 4, hoop.y); c.fill(); } c.globalAlpha = 1; }
    // guía (humanos) y arco de fuerza
    if (!b.fly && k.st === 'play' && !over && !k.counting()) {
      const a = s.kAng, p = s.kPow, human = !seats[i].cpu;
      if (human) { let x = b.u, y = b.y, vu = Math.cos(a) * p * VMAX, vy = Math.sin(a) * p * VMAX; const dots = Math.round(20 - 8 * Math.min(1, s.shotN / 12));
        for (let q = 0; q < dots; q++) { for (let j = 0; j < 3; j++) { vy += G * 0.012; x += vu * 0.012; y += vy * 0.012; } c.globalAlpha = 1 - q / (dots + 2); c.beginPath(); c.arc(x, y, 3.6 - q * 0.1, 0, R2); ART.fillOut(c, '#fff', 1.5); } c.globalAlpha = 1; }
      c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.arc(b.u, b.y, 21, -Math.PI / 2, -Math.PI / 2 + p * R2); c.stroke(); c.strokeStyle = `hsl(${120 - p * 120} 90% 60%)`; c.lineWidth = 4; c.stroke();
    }
    c.restore();
  }
  function draw() {
    for (const s of S) drawCourt(s);
    // separador central
    c.fillStyle = OUT; c.fillRect(HW - 3, 0, 6, H); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(HW - 1, 0, 2, H);
    if (!S.length) return;
    // marcador central
    ART.rr(c, HW - 150, 8, 300, 52, 14); ART.fillOut(c, 'rgba(26,21,48,.92)', 3);
    for (const s of S) { const x = HW + DIR[s.i] * 88; label(nm(s.i), x, 22, 12, pc(s.i), 'center'); label(String(s.score), x, 44, 22, '#fff', 'center');
      if (s.streak >= 2) label(`x${s.streak}`, HW + DIR[s.i] * 140, 44, 12, s.streak >= 3 ? '#ffb13d' : '#e6e1ff', 'center'); }
    const tl = Math.ceil(time), cx = HW, cy = 34; c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.arc(cx, cy, 20, 0, R2); c.stroke(); c.strokeStyle = time < 10 ? '#ff6b6b' : '#7cf7a0'; c.beginPath(); c.arc(cx, cy, 20, -Math.PI / 2, -Math.PI / 2 + R2 * time / TIME); c.stroke();
    label(String(tl), cx, cy + 1, 18, time < 10 ? '#ff6b6b' : '#fff', 'center');
    for (const s of S) if (s.msgT > 0) { const e = Math.min(1, (1.1 - s.msgT) / 0.15), sc = 0.5 + 0.5 * Math.max(0, e); c.save(); c.translate(HW + DIR[s.i] * 190, 96); c.scale(sc, sc); c.globalAlpha = Math.min(1, s.msgT / 0.3); label(s.msg, 0, 0, 20, s.msgC, 'center'); c.restore(); c.globalAlpha = 1; }
    if (over) { c.globalAlpha = Math.min(1, overT * 3); label('¡TIEMPO!', HW, H / 2 - 20, 40, '#ffd166', 'center'); c.globalAlpha = 1; }
  }
  window.__du = { get S() { return S; }, get time() { return time; }, get seats() { return seats; }, set LV(v) { LV = v; } };
  reset();
  k.show(CFG.title || 'Canastas a Duelo', 'Dos canastas y 60 segundos: gana quien más puntos meta. ← → cambian el ángulo, ↑ ↓ la fuerza y A lanza (sigue la guía de puntos). Canasta 2 puntos; de lejos o limpia, +1. En el móvil, arrastra hacia atrás en tu mitad (la izquierda) y suelta.<br>Toca para jugar');
  k.run(update, draw);
}
