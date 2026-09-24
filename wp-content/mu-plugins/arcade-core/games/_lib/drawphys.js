/* Física de dibujo. CFG.mode: 'funnel' (guía la bola a la copa) | 'bridge' (construye un puente para la rueda)
 * Arte propio: papel cuadriculado, trazos de tinta, tablones de madera, acantilados con césped, bola y rueda que giran, estela de la trayectoria. */
const M = CFG.mode, land = M === 'bridge', OUT = ART.OUT, R2 = 6.2832;
const W = land ? 640 : 360, H = land ? 360 : 640;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#f4efe4' }), c = k.ctx;
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms); /* 1.23: la pantalla final espera si el juego está en pausa */
let stuckT = 0, level, score, segs, userSegs, ink, maxInk, ball, running, cup, stroke, fixed, goalX, done, t, strokes = [], path = [], ghost = [], clk = 0, doneT = 0, bgCv, pathT = 0, failT = 0;
function build() {
  segs = []; userSegs = []; strokes = []; path = []; ghost = []; running = false; stroke = null; done = false; t = 0; doneT = 0; bgCv = null;
  if (M === 'funnel') { maxInk = 840 + 60 * Math.max(0, 4 - level); /* 1.23: +20 % tinta */ const bx = k.rnd(60, 300), reach = Math.min(260, 60 + level * 28); ball = { x: bx, y: 86, vx: 0, vy: 0, r: 11, sx: bx, sy: 86, a: 0 }; cup = { x: k.clamp(bx + k.rnd(-reach, reach), 50, 310), y: 548 }; /* copa cerca de la bola al principio */
    for (let i = 0; i < Math.min(7, Math.ceil(level * 0.7)); i++) { const w = k.rnd(50, 120), x = k.rnd(20, 340 - w), y = k.rnd(160, 470); segs.push([x, y, x + w, y + k.rnd(-20, 20)]); } }
  else { maxInk = 430 + 25 * Math.max(0, 6 - level); const gap = Math.min(300, 100 + (level - 1) * 17) /* 1.23: +20 % tinta, hueco crece más despacio */, lx = 180, rx = lx + gap, ly = 240, ry = 240 + k.ri(-40, 30);
    segs.push([0, ly, lx, ly], [lx, ly, lx, H], [rx, ry, rx, H], [rx, ry, W, ry]); ball = { x: 30, y: ly - 14, vx: 0, vy: 0, r: 13, sx: 30, sy: ly - 14, a: 0 }; goalX = W - 50; fixed = { ly, ry, lx, rx }; }
  ink = maxInk;
}
function reset() { if (!level || k.st === 'over' && !done) { level = 1; score = 0; } build(); }
reset(); k.show(CFG.title, CFG.help);
function collide(b, s) { const [x1, y1, x2, y2] = s, dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1; const tt = k.clamp(((b.x - x1) * dx + (b.y - y1) * dy) / l2, 0, 1); const px = x1 + dx * tt, py = y1 + dy * tt, ex = b.x - px, ey = b.y - py, d = Math.hypot(ex, ey);
  if (d < b.r && d > 0) { const nx = ex / d, ny = ey / d; b.x = px + nx * b.r; b.y = py + ny * b.r; const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.3 * vn * nx; b.vy -= 1.3 * vn * ny; b.vx *= 0.995; b.vy *= 0.995; } return true; } return false; }
// botones: [id, x, y, w, h]
const BTNS = land ? [['go', W - 112, 10, 100, 38], ['undo', W - 166, 10, 46, 38], ['clear', W - 220, 10, 46, 38]] : [['undo', 12, H - 50, 56, 40], ['go', W / 2 - 64, H - 52, 128, 44], ['clear', W - 68, H - 50, 56, 40]];
const btnAt = (x, y) => { const b = BTNS.find((q) => x > q[1] && x < q[1] + q[3] && y > q[2] && y < q[2] + q[4]); return b && b[0]; };
function rebuildSegs() { userSegs = []; for (const s of strokes) for (let i = 1; i < s.pts.length; i++) userSegs.push([s.pts[i - 1][0], s.pts[i - 1][1], s.pts[i][0], s.pts[i][1]]); }
function stop() { running = false; ball.x = ball.sx; ball.y = ball.sy || 60; ball.vx = ball.vy = 0; ball.a = 0; if (path.length) ghost = path; path = []; t = 0; }
function press(id) {
  if (id === 'go') { if (running) stop(); else { running = true; path = []; k.sfx('jump'); } }
  if (running) return;
  if (id === 'undo' && strokes.length) { const s = strokes.pop(); ink = Math.min(maxInk, ink + s.len); rebuildSegs(); k.sfx('pop'); }
  if (id === 'clear' && strokes.length) { strokes = []; userSegs = []; ink = maxInk; k.sfx('pop'); }
}
k.run((dt) => {
  if (!k.gate(reset)) return; clk += dt; failT = Math.max(0, failT - dt);
  if (done) { doneT += dt; return; }
  const b0 = k.ptr.hit ? btnAt(k.ptr.sx, k.ptr.sy) : null;
  if (b0) { press(b0); stroke = null; return; }
  if (k.hit.has('a')) press('go');
  if (!running) {
    if (k.ptr.hit) { stroke = { pts: [[k.ptr.sx, k.ptr.sy]], len: 0 }; strokes.push(stroke); }
    if ((k.ptr.down || k.ptr.up) && stroke) { const l = stroke.pts[stroke.pts.length - 1], d = Math.hypot(k.ptr.x - l[0], k.ptr.y - l[1]);
      if (d > 8 && ink > d) { stroke.pts.push([k.ptr.x, k.ptr.y]); ink -= d; stroke.len += d; userSegs.push([l[0], l[1], k.ptr.x, k.ptr.y]); if (Math.random() < 0.3) k.sfx('click'); } }
    if (k.ptr.up && stroke) { if (stroke.pts.length < 2) strokes.pop(); stroke = null; }
    if (k.hit.has('b')) press('clear');
    return;
  }
  t += dt; const steps = 8, h = dt / steps;
  for (let s = 0; s < steps; s++) { ball.vy += 900 * h; if (M === 'bridge') ball.vx += (ball.vx < 170 ? 260 : 0) * h; ball.x += ball.vx * h; ball.y += ball.vy * h; for (const sg of segs) collide(ball, sg); for (const sg of userSegs) collide(ball, sg); }
  ball.a += ball.vx / ball.r * dt; pathT += dt; if (pathT > 0.04) { pathT = 0; path.push([ball.x, ball.y]); }
  if (M === 'funnel') { if (Math.abs(ball.x - cup.x) < 33 && ball.y > cup.y - 20 && ball.y < cup.y + 30) win(); if (ball.y > H + 40 || ball.x < -40 || ball.x > W + 40) fail(); }
  else { if (ball.x > goalX && ball.y < fixed.ry) win(); if (ball.y > H + 40) fail(); }
  // atascada: si apenas se mueve durante 1,5 s, se reinicia el intento
  stuckT = Math.hypot(ball.vx, ball.vy) < 12 ? stuckT + dt : 0; if (t > 12 || stuckT > 1.5) fail();
}, draw);
function win() { k.sfx('coin'); done = true; doneT = 0; const gain = Math.round(100 + ink / maxInk * 200) * level; score += gain; k.best(CFG.id, score); k.burst(ball.x, ball.y, '#ffd23d', 24, 160); k.float('+' + gain, ball.x, ball.y - 30, '#ffd23d');
  later(() => { k.st = 'over'; k.show('¡Conseguido!', `Nivel ${level} · ${score} puntos<br>Toca para el siguiente`); level++; }, 1000); }
function fail() { k.sfx('hurt'); failT = 1.2; stuckT = 0; stop(); }

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function note(s, x, y, size, col) { c.font = `700 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = 5; c.strokeStyle = '#f6f1e4'; c.strokeText(s, x, y); c.fillStyle = col; c.fillText(s, x, y); }
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function plank(g, s) { const [x1, y1, x2, y2] = s, len = Math.hypot(x2 - x1, y2 - y1); g.save(); g.translate(x1, y1); g.rotate(Math.atan2(y2 - y1, x2 - x1));
  g.fillStyle = 'rgba(0,0,0,.15)'; ART.rr(g, -6, -2, len + 12, 14, 6); g.fill(); ART.rr(g, -6, -7, len + 12, 14, 6); ART.fillOut(g, '#c98a4b', 2.5);
  g.strokeStyle = 'rgba(120,70,30,.45)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(2, -2); g.lineTo(len * 0.6, -2); g.moveTo(len * 0.3, 2); g.lineTo(len - 2, 2); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-2, -5, len + 4, 2); g.fillStyle = '#5a4a3a'; for (const x of [0, len]) { g.beginPath(); g.arc(x, 0, 2, 0, R2); g.fill(); } g.restore(); }
function renderBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  g.fillStyle = '#f6f1e4'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(90,140,200,.18)'; g.lineWidth = 1; g.beginPath(); for (let x = 0; x < W; x += 20) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); } for (let y = 0; y < H; y += 20) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); } g.stroke();
  g.strokeStyle = 'rgba(230,90,110,.35)'; g.lineWidth = 2; g.beginPath(); if (land) { g.moveTo(0, 58); g.lineTo(W, 58); } else { g.moveTo(34, 0); g.lineTo(34, H); } g.stroke();
  g.fillStyle = 'rgba(120,100,70,.05)'; for (let i = 0; i < 300; i++) g.fillRect(rnd(i) * W, rnd(i + 400) * H, 2, 2);
  if (land) { // acantilados
    const cliff = (x0, x1, y) => { g.beginPath(); g.rect(x0, y, x1 - x0, H - y); g.fillStyle = '#9a6a45'; g.fill(); g.fillStyle = '#80553a'; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(x0 + 8 + rnd(i + x0) * (x1 - x0 - 16), y + 24 + rnd(i * 3 + y) * (H - y - 30), 3 + rnd(i) * 4, 0, R2); g.fill(); }
      g.fillStyle = '#5ccf5a'; g.fillRect(x0, y - 2, x1 - x0, 12); g.fillStyle = '#3aa845'; g.fillRect(x0, y + 8, x1 - x0, 3); g.strokeStyle = OUT; g.lineWidth = 2.5; g.strokeRect(x0 - 2, y - 2, x1 - x0 + 4, H - y + 6); };
    cliff(0, fixed.lx, fixed.ly); cliff(fixed.rx, W, fixed.ry);
    g.fillStyle = 'rgba(90,140,200,.25)'; g.fillRect(fixed.lx + 3, H - 26, fixed.rx - fixed.lx - 6, 26); g.strokeStyle = 'rgba(60,110,180,.5)'; g.lineWidth = 2; g.beginPath(); for (let x = fixed.lx + 6; x < fixed.rx - 6; x += 14) { g.moveTo(x, H - 20); g.quadraticCurveTo(x + 4, H - 24, x + 8, H - 20); } g.stroke();
  } else for (const s of segs) plank(g, s);
  return cv;
}
function inkPath(pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } const l = pts[pts.length - 1]; c.lineTo(l[0], l[1]); }
function icon(id, x, y) { c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
  if (id === 'go') { if (running) { c.beginPath(); c.arc(x, y, 7, -Math.PI * 0.3, Math.PI * 1.5); c.stroke(); c.beginPath(); c.moveTo(x + 3, y - 11); c.lineTo(x + 9, y - 6); c.lineTo(x + 2, y - 3); c.fill(); } else { c.beginPath(); c.moveTo(x - 5, y - 8); c.lineTo(x + 8, y); c.lineTo(x - 5, y + 8); c.closePath(); c.fill(); } }
  if (id === 'undo') { c.beginPath(); c.arc(x + 2, y + 2, 7, -Math.PI * 0.9, Math.PI * 0.5); c.stroke(); c.beginPath(); c.moveTo(x - 9, y - 4); c.lineTo(x - 1, y - 6); c.lineTo(x - 6, y + 2); c.fill(); }
  if (id === 'clear') { c.save(); c.translate(x, y); c.rotate(-0.6); ART.rr(c, -9, -5, 18, 10, 3); c.fill(); c.fillStyle = '#e06a8a'; c.fillRect(-9, -5, 6, 10); c.restore(); } }
function wheel(x, y, r, a) { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.arc(0, 0, r, 0, R2); ART.fillOut(c, '#3a3346', 2.5); c.beginPath(); c.arc(0, 0, r * 0.62, 0, R2); ART.fillOut(c, '#c7ccd8', 2); c.strokeStyle = '#6a7088'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 5; i++) { const q = i * R2 / 5; c.moveTo(0, 0); c.lineTo(Math.cos(q) * r * 0.6, Math.sin(q) * r * 0.6); } c.stroke(); c.beginPath(); c.arc(0, 0, 3, 0, R2); ART.fillOut(c, '#ffd23d', 1.5); c.restore(); }
function ballDraw(x, y, r, a) { c.save(); c.translate(x, y); c.beginPath(); c.arc(0, 0, r, 0, R2); ART.fillOut(c, '#ff8a3d', 2.5); c.save(); c.clip(); c.rotate(a); c.fillStyle = '#ffd23d'; c.fillRect(-r, -r * 0.3, r * 2, r * 0.6); c.restore(); c.beginPath(); c.arc(0, 0, r, 0, R2); c.strokeStyle = OUT; c.lineWidth = 2.5; c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.32, -0.6, 0, R2); c.fill(); c.restore(); }
function draw() {
  if (!bgCv) bgCv = renderBg(); c.drawImage(bgCv, 0, 0, W, H);
  // estela del intento anterior y del actual
  c.fillStyle = 'rgba(60,70,120,.18)'; for (const p of ghost) { c.beginPath(); c.arc(p[0], p[1], 2, 0, R2); c.fill(); }
  c.fillStyle = 'rgba(255,120,60,.45)'; for (const p of path) { c.beginPath(); c.arc(p[0], p[1], 2.5, 0, R2); c.fill(); }
  // meta
  if (M === 'funnel') { const { x, y } = cup; c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(x, y + 32, 30, 6, 0, 0, R2); c.fill();
    c.beginPath(); c.moveTo(x - 32, y - 24); c.lineTo(x - 24, y + 30); c.lineTo(x + 24, y + 30); c.lineTo(x + 32, y - 24); c.closePath(); ART.fillOut(c, '#7cd6a0', 3); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - 24, y - 18, 6, 40);
    c.beginPath(); c.ellipse(x, y - 24, 32, 6, 0, 0, R2); ART.fillOut(c, '#2f7a52', 2.5); label('META', x, y - 2, 12, '#fff', 'center'); }
  else ART.flag(c, goalX + 12, fixed.ry, clk, '#7cf7a0', 64);
  // tinta del jugador
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const s of strokes) { if (s.pts.length < 2) continue; inkPath(s.pts); c.strokeStyle = OUT; c.lineWidth = 8; c.stroke(); c.strokeStyle = '#3b5bdb'; c.lineWidth = 5; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.stroke(); }
  if (stroke && k.ptr.down) { c.save(); c.translate(k.ptr.x, k.ptr.y); c.rotate(-0.7); ART.rr(c, -4, -34, 8, 26, 3); ART.fillOut(c, '#3b5bdb', 2); c.beginPath(); c.moveTo(-4, -8); c.lineTo(0, 0); c.lineTo(4, -8); c.closePath(); ART.fillOut(c, '#e8e0cc', 1.5); c.restore(); }
  // bola / rueda
  c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(ball.x, ball.y + ball.r + 2, ball.r * 0.8, 3, 0, 0, R2); c.fill();
  if (land) wheel(ball.x, ball.y, ball.r, ball.a); else ballDraw(ball.x, ball.y, ball.r, ball.a);
  if (!running && !done) { c.globalAlpha = 0.5 + Math.sin(clk * 5) * 0.3; c.strokeStyle = '#ff8a3d'; c.lineWidth = 2; c.setLineDash([4, 4]); c.beginPath(); c.arc(ball.x, ball.y, ball.r + 7, 0, R2); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }
  // HUD
  label(`Nivel ${level}`, land ? 12 : 44, 10, 18, '#fff');
  // en vertical, la tinta va a la derecha: el centro superior es de pausa/sonido
  const ix = land ? 12 : W - 116, iy = 38; ART.rr(c, ix + 20, iy + 2, 90, 12, 6); ART.fillOut(c, '#fff', 2); c.fillStyle = ink / maxInk < 0.2 ? '#ff5f5f' : '#3b5bdb'; if (ink > 1) { ART.rr(c, ix + 22, iy + 4, 86 * ink / maxInk, 8, 4); c.fill(); }
  ART.rr(c, ix, iy - 2, 14, 18, 3); ART.fillOut(c, '#3b5bdb', 2); ART.rr(c, ix + 3, iy - 7, 8, 6, 2); ART.fillOut(c, '#c7ccd8', 1.5);
  label(`${score}`, land ? W - 230 : W - 12, land ? 18 : 10, 18, '#ffd23d', 'right');
  for (const b of BTNS) { const [id, x, y, w, h] = b, pr = k.ptr.down && btnAt(k.ptr.x, k.ptr.y) === id && !stroke, yy = y + (pr ? 2 : 0);
    ART.rr(c, x, y + 3, w, h, 12); c.fillStyle = OUT; c.fill(); ART.rr(c, x, yy, w, h, 12); ART.fillOut(c, id === 'go' ? (running ? '#8a8fa8' : '#2fa36a') : id === 'undo' ? '#6e62f5' : '#e0567a', 2.5); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 8, yy + 4, w - 16, 3);
    if (id === 'go') { icon(id, x + 22, yy + h / 2); label(running ? 'Otra vez' : 'Soltar', x + w / 2 + 12, yy + h / 2 - 9, 16, '#fff', 'center'); } else icon(id, x + w / 2, yy + h / 2); }
  if (failT > 0) { c.globalAlpha = Math.min(1, failT * 2); note('¡Casi! Prueba otro trazo', W / 2, land ? 78 : 130, 18, '#d6336c'); c.globalAlpha = 1; }
  if (!running && !strokes.length && !done) { c.globalAlpha = 0.5 + Math.sin(clk * 3) * 0.2; note('Dibuja con el dedo', W / 2, land ? 100 : 150, 17, '#5a4fd6'); c.globalAlpha = 1; }
  if (done) { const p = Math.min(1, doneT * 3), sc = 0.7 + p * 0.3 + Math.sin(p * 3.14) * 0.1; c.save(); c.globalAlpha = p; c.translate(W / 2, H / 2 - 20); c.scale(sc, sc); ART.rr(c, -130, -34, 260, 68, 20); ART.fillOut(c, 'rgba(34,28,66,.92)', 3); label('¡Conseguido!', 0, -18, 30, '#7cf7a0', 'center'); c.restore(); }
}
