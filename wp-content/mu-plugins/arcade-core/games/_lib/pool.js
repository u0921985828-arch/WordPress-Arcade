/* Pool Break con arte propio: mete las 15 bolas con el menor número de tiros. Meter la blanca = +2 tiros.
 * Arrastra hacia atrás (desde cualquier punto) y suelta; la guía muestra la bola fantasma y la salida de la bola tocada. Teclado: ← → apuntar, ↑ ↓ fuerza, A tirar. */
const OUT = ART.OUT, R2 = 6.2832, W = 360, H = 640;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1a1210' }), c = k.ctx;
const TX = 36, TY = 76, TW = 288, TH = 504, BR = 10, POCKETS = [[TX, TY, 19], [TX + TW, TY, 19], [TX, TY + TH / 2, 16], [TX + TW, TY + TH / 2, 16], [TX, TY + TH, 19], [TX + TW, TY + TH, 19]];
const COL = ['#fff', '#f2c230', '#2b50c9', '#d7263d', '#6a3fb5', '#f28b2d', '#1e8a4c', '#8a2432', '#15151c', '#f2c230', '#2b50c9', '#d7263d', '#6a3fb5', '#f28b2d', '#1e8a4c', '#8a2432'];
let balls, shots, potted, aiming, msg, msgT, msgC, rack, sinking, tray, kAng, kPow, kb, strike, shotPots, t = 0, lastClick = 0, tableCv, sprites, shade;
function reset() { rack = 0; shots = 0; potted = 0; tray = []; sinking = []; kb = false; strike = null; setup(); }
function setup() { balls = [{ n: 0, x: 180, y: 480, vx: 0, vy: 0, rot: 0 }]; let n = 1; const order = k.shuffle([...Array(15).keys()].map((i) => i + 1));
  for (let r = 0; r < 5; r++) for (let i = 0; i <= r; i++) balls.push({ n: order[n++ - 1], x: 180 + (i - r / 2) * (BR * 2 + 0.5), y: 200 - r * (BR * 1.75), vx: 0, vy: 0, rot: Math.random() * R2 }); msg = ''; msgT = 0; kAng = -Math.PI / 2; kPow = 0.8; }
/* ---------- Cacheados: mesa y bolas ---------- */
function build() {
  tableCv = document.createElement('canvas'); tableCv.width = W * 2; tableCv.height = H * 2; const g = tableCv.getContext('2d'); g.scale(2, 2);
  const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return v - Math.floor(v); };
  let gr = g.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 420); gr.addColorStop(0, '#3a2418'); gr.addColorStop(1, '#120a08'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,.45)'; ART.rr(g, TX - 22, TY - 14, TW + 44, TH + 44, 20); g.fill();
  // marco de madera
  ART.rr(g, TX - 26, TY - 26, TW + 52, TH + 52, 20); gr = g.createLinearGradient(TX - 26, 0, TX + TW + 26, 0); gr.addColorStop(0, '#6b3a1c'); gr.addColorStop(0.5, '#9a5a2c'); gr.addColorStop(1, '#6b3a1c'); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
  g.strokeStyle = 'rgba(255,220,170,.25)'; g.lineWidth = 2; ART.rr(g, TX - 22, TY - 22, TW + 44, TH + 44, 17); g.stroke();
  g.strokeStyle = 'rgba(60,25,8,.35)'; g.lineWidth = 1; for (let i = 0; i < 40; i++) { const y = TY - 24 + hr(i, 1) * (TH + 48); g.beginPath(); g.moveTo(TX - 24, y); g.quadraticCurveTo(TX - 14, y + 6, TX - 4, y); g.moveTo(TX + TW + 4, y); g.quadraticCurveTo(TX + TW + 14, y - 6, TX + TW + 24, y); g.stroke(); }
  // diamantes
  g.fillStyle = '#f3e7c9'; const dia = (x, y) => { g.beginPath(); g.moveTo(x, y - 3.5); g.lineTo(x + 2.5, y); g.lineTo(x, y + 3.5); g.lineTo(x - 2.5, y); g.closePath(); g.fill(); };
  for (let i = 1; i < 4; i++) { dia(TX + TW * i / 4, TY - 14); dia(TX + TW * i / 4, TY + TH + 14); } for (let i = 1; i < 8; i++) if (i !== 4) { dia(TX - 14, TY + TH * i / 8); dia(TX + TW + 14, TY + TH * i / 8); }
  // tapete
  g.fillStyle = '#156b3b'; g.fillRect(TX - 8, TY - 8, TW + 16, TH + 16);
  gr = g.createRadialGradient(W / 2, TY + TH / 2, 40, W / 2, TY + TH / 2, TH * 0.65); gr.addColorStop(0, '#26a35e'); gr.addColorStop(1, '#17804a'); g.fillStyle = gr; g.fillRect(TX, TY, TW, TH);
  for (let i = 0; i < 2200; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,40,10,.12)'; g.fillRect(TX + hr(i, 4) * TW, TY + hr(i, 5) * TH, 1, 1); }
  // bandas (cojines) entre troneras
  g.fillStyle = '#0f5a30'; const cush = (x0, y0, x1, y1, nx, ny) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1 - nx * 8 + (x0 < x1 ? -8 : x0 > x1 ? 8 : 0), y1 - ny * 8 + (y0 < y1 ? -8 : y0 > y1 ? 8 : 0)); g.lineTo(x0 - nx * 8 + (x0 < x1 ? 8 : x0 > x1 ? -8 : 0), y0 - ny * 8 + (y0 < y1 ? 8 : y0 > y1 ? -8 : 0)); g.closePath(); g.fill(); };
  cush(TX + 18, TY, TX + TW - 18, TY, 0, 1); cush(TX + 18, TY + TH, TX + TW - 18, TY + TH, 0, -1);
  for (const [a, b] of [[TY + 18, TY + TH / 2 - 15], [TY + TH / 2 + 15, TY + TH - 18]]) { cush(TX, a, TX, b, 1, 0); cush(TX + TW, a, TX + TW, b, -1, 0); }
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1.5; g.strokeRect(TX, TY, TW, TH);
  // línea de cabecera y puntos
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(TX, 480); g.lineTo(TX + TW, 480); g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(180, 480, 2, 0, R2); g.arc(180, 200, 2, 0, R2); g.fill();
  // troneras
  for (const [x, y, r] of POCKETS) { g.beginPath(); g.arc(x, y, r + 5, 0, R2); ART.fillOut(g, '#3a2210', 2.5); g.beginPath(); g.arc(x, y, r, 0, R2); gr = g.createRadialGradient(x, y + 2, 2, x, y, r); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#1d1512'); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r - 1, Math.PI * 1.1, Math.PI * 1.6); g.stroke(); }
  // bandeja de bolas metidas
  ART.rr(g, TX - 10, TY + TH + 32, TW + 20, 26, 13); ART.fillOut(g, '#2a1a10', 2.5); g.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(g, TX - 4, TY + TH + 36, TW + 8, 18, 9); g.fill();
  // bolas: patrón (color, franja, número) y sombreado fijo aparte para simular el giro
  sprites = COL.map((col, n) => { const cv = document.createElement('canvas'); cv.width = cv.height = 48; const b = cv.getContext('2d'); b.scale(2, 2); b.translate(12, 12); b.beginPath(); b.arc(0, 0, BR, 0, R2); b.clip();
    b.fillStyle = n > 8 ? '#f7f3ea' : col; b.fillRect(-12, -12, 24, 24); if (n > 8) { b.fillStyle = col; b.fillRect(-12, -5.6, 24, 11.2); }
    if (n) { b.beginPath(); b.arc(0, 0, 4.8, 0, R2); b.fillStyle = '#fff'; b.fill(); b.fillStyle = '#15151c'; b.font = `900 ${n > 9 ? 6 : 7}px ui-rounded,system-ui,sans-serif`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText(n, 0, 0.5); }
    else { b.fillStyle = '#d23a4a'; b.beginPath(); b.arc(3, 3, 1.4, 0, R2); b.fill(); } return cv; });
  shade = document.createElement('canvas'); shade.width = shade.height = 48; const s = shade.getContext('2d'); s.scale(2, 2); s.translate(12, 12);
  gr = s.createRadialGradient(-3, -4, 1, 0, 0, BR + 1); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); s.beginPath(); s.arc(0, 0, BR, 0, R2); s.fillStyle = gr; s.fill();
  s.fillStyle = 'rgba(255,255,255,.9)'; s.beginPath(); s.ellipse(-3.5, -4.2, 2.6, 1.6, -0.6, 0, R2); s.fill(); s.lineWidth = 1.8; s.strokeStyle = OUT; s.beginPath(); s.arc(0, 0, BR, 0, R2); s.stroke();
}
build(); reset(); k.show(CFG.title, 'Arrastra hacia atrás y suelta para tirar (o ← → apuntar, ↑ ↓ fuerza, A tirar). Mete las 15 bolas con el menor número de tiros. Meter la blanca = +2 tiros.');
const moving = () => balls.some((b) => Math.hypot(b.vx, b.vy) > 3) || strike;
function shoot(a, p) { const cue = balls.find((b) => b.n === 0); if (!cue || p < 0.04) return; strike = { a, p, t: 0 }; shots++; shotPots = 0; }
/* primer contacto del tiro para la guía: bola fantasma y salidas */
function ray(cue, a) { const dx = Math.cos(a), dy = Math.sin(a); let best = 1e9, hit = null;
  for (const b of balls) { if (b === cue) continue; const fx = b.x - cue.x, fy = b.y - cue.y, pr = fx * dx + fy * dy; if (pr <= 0) continue; const perp2 = fx * fx + fy * fy - pr * pr, r2 = 4 * BR * BR; if (perp2 > r2) continue; const d = pr - Math.sqrt(r2 - perp2); if (d < best) { best = d; hit = b; } }
  const tx = dx > 0 ? (TX + TW - BR - cue.x) / dx : dx < 0 ? (TX + BR - cue.x) / dx : 1e9, ty = dy > 0 ? (TY + TH - BR - cue.y) / dy : dy < 0 ? (TY + BR - cue.y) / dy : 1e9, dw = Math.min(tx, ty);
  if (!hit || dw < best) return { x: cue.x + dx * dw, y: cue.y + dy * dw, hit: null }; return { x: cue.x + dx * best, y: cue.y + dy * best, hit }; }
k.run((dt) => {
  t += dt; msgT -= dt; if (!k.gate(reset)) return;
  for (let i = sinking.length - 1; i >= 0; i--) { const s = sinking[i]; s.t += dt * 4; s.x += (s.px - s.x) * Math.min(1, dt * 14); s.y += (s.py - s.y) * Math.min(1, dt * 14); if (s.t >= 1) { sinking.splice(i, 1); if (s.n) tray.push({ n: s.n, x: TX + TW, tx: TX + 6 + tray.length * 19, rot: 0 }); } }
  for (const b of tray) { b.x += (b.tx - b.x) * Math.min(1, dt * 5); b.rot += dt * 3 * Math.sign(b.x - b.tx); }
  const cue = balls.find((b) => b.n === 0);
  if (strike) { strike.t += dt; if (strike.t >= 0.12) { cue.vx = Math.cos(strike.a) * strike.p * 1500; cue.vy = Math.sin(strike.a) * strike.p * 1500; k.sfx(strike.p > 0.7 ? 'shoot' : 'hit'); if (strike.p > 0.8) k.shake(3); strike = null; } return; }
  if (!moving()) { balls.forEach((b) => { b.vx = b.vy = 0; });
    if (!balls.some((b) => b.n > 0) && !sinking.length) { rack++; k.st = 'over'; const sc = Math.max(1, 200 - shots * 5), nr = NREC(sc), b = k.best(CFG.id, sc); k.show('¡Mesa limpia!', `${nr}${shots} tiros · Récord ${b}<br>Toca para otra partida`); return; }
    if (!cue) { let y = 480; while (balls.some((b) => Math.hypot(b.x - 180, b.y - y) < BR * 2 + 1)) y += 6; balls.unshift({ n: 0, x: 180, y, vx: 0, vy: 0, rot: 0, pop: 0 }); return; }
    if (k.ptr.hit) aiming = true;
    if (aiming && k.ptr.up) { aiming = false; const dx = k.ptr.sx - k.ptr.x, dy = k.ptr.sy - k.ptr.y, p = Math.min(1, Math.hypot(dx, dy) / 150); if (p > 0.05) { kAng = Math.atan2(dy, dx); shoot(kAng, p); } }
    if (k.held.has('left')) { kAng -= (k.held.has('b') ? 0.15 : 0.9) * dt; kb = true; } if (k.held.has('right')) { kAng += (k.held.has('b') ? 0.15 : 0.9) * dt; kb = true; }
    if (k.held.has('up')) { kPow = Math.min(1, kPow + 0.6 * dt); kb = true; } if (k.held.has('down')) { kPow = Math.max(0.1, kPow - 0.6 * dt); kb = true; }
    if (k.hit.has('a')) shoot(kAng, kPow);
    return; }
  const steps = 8, h = dt / steps;
  for (let s = 0; s < steps; s++) { for (const b of balls) { b.x += b.vx * h; b.y += b.vy * h; const f = 1 - 0.85 * h, sp = Math.hypot(b.vx, b.vy); b.vx *= f; b.vy *= f; if (sp > 0 && sp < 25) { const g = Math.max(0, sp - 20 * h) / sp; b.vx *= g; b.vy *= g; } b.rot += sp * h / BR;
      let bn = 0; if (b.x < TX + BR) { b.x = TX + BR; bn = Math.abs(b.vx); b.vx = Math.abs(b.vx) * 0.8; } if (b.x > TX + TW - BR) { b.x = TX + TW - BR; bn = Math.abs(b.vx); b.vx = -Math.abs(b.vx) * 0.8; } if (b.y < TY + BR) { b.y = TY + BR; bn = Math.abs(b.vy); b.vy = Math.abs(b.vy) * 0.8; } if (b.y > TY + TH - BR) { b.y = TY + TH - BR; bn = Math.abs(b.vy); b.vy = -Math.abs(b.vy) * 0.8; }
      if (bn > 120 && t - lastClick > 0.05) { lastClick = t; k.sfx('pop'); }
      for (const [px, py, pr] of POCKETS) if (Math.hypot(b.x - px, b.y - py) < pr + 3) /* 1.23: troneras algo más amables */ { b.in = true; b.px = px; b.py = py; } }
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) { const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < BR * 2 && d > 0) { const nx = dx / d, ny = dy / d, ov = (BR * 2 - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov; const rv = ((a.vx - b.vx) * nx + (a.vy - b.vy) * ny) * 0.97; if (rv > 0) { a.vx -= rv * nx; a.vy -= rv * ny; b.vx += rv * nx; b.vy += rv * ny; if (rv > 40 && t - lastClick > 0.04) { lastClick = t; k.sfx('click'); } } } }
    for (const b of balls) if (b.in) { sinking.push({ n: b.n, x: b.x, y: b.y, px: b.px, py: b.py, t: 0, rot: b.rot });
      if (b.n === 0) { shots += 2; msg = 'Falta: blanca dentro (+2)'; msgC = '#ff9a9a'; msgT = 1.4; navigator.vibrate && navigator.vibrate(60); }
      else { potted++; shotPots++; k.sfx('coin'); k.burst(b.px, b.py, COL[b.n], 10, 90); msg = shotPots > 1 ? `¡${['', '', 'Doble', 'Triple', 'Cuádruple'][Math.min(4, shotPots)] || 'Combo'}!` : `Bola ${b.n}`; msgC = shotPots > 1 ? '#f2d15c' : '#fff'; msgT = 1; if (shotPots > 1) k.float(`x${shotPots}`, b.px, b.py - 20, '#f2d15c'); } }
    balls = balls.filter((b) => !b.in); }
}, () => {
  c.drawImage(tableCv, 0, 0, W, H);
  for (const s of sinking) { const sc = 1 - s.t * 0.6; c.globalAlpha = 1 - s.t * 0.7; drawBall(s.n, s.x, s.y, s.rot, sc); } c.globalAlpha = 1;
  for (const b of balls) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(b.x + 3, b.y + 4, BR, BR * 0.8, 0, 0, R2); c.fill(); }
  const cue = balls.find((b) => b.n === 0);
  // guía y taco
  let a = null, p = 0; if (cue && !moving() && aiming && k.ptr.down) { const dx = k.ptr.sx - k.ptr.x, dy = k.ptr.sy - k.ptr.y; p = Math.min(1, Math.hypot(dx, dy) / 150); if (p > 0.05) a = Math.atan2(dy, dx); } else if (cue && !moving() && kb) { a = kAng; p = kPow; }
  if (cue && strike) { a = strike.a; p = strike.p * Math.max(0, 1 - strike.t / 0.12); }
  if (cue && a !== null && !strike) { const r = ray(cue, a); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(cue.x, cue.y); c.lineTo(r.x, r.y); c.stroke(); c.setLineDash([]);
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.beginPath(); c.arc(r.x, r.y, BR, 0, R2); c.stroke();
    if (r.hit) { const nx = r.hit.x - r.x, ny = r.hit.y - r.y, L = Math.hypot(nx, ny); c.strokeStyle = 'rgba(255,240,150,.9)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(r.hit.x, r.hit.y); c.lineTo(r.hit.x + nx / L * 60, r.hit.y + ny / L * 60); c.stroke();
      const dx = Math.cos(a), dy = Math.sin(a), dot = dx * nx / L + dy * ny / L, tx = dx - dot * nx / L, ty = dy - dot * ny / L, tl = Math.hypot(tx, ty); if (tl > 0.05) { c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(r.x, r.y); c.lineTo(r.x + tx / tl * 36 * tl, r.y + ty / tl * 36 * tl); c.stroke(); } } }
  for (const b of balls) drawBall(b.n, b.x, b.y, b.rot, 1);
  if (cue && a !== null) { const d0 = BR + 4 + p * 50, L = 250, cx = Math.cos(a), cy = Math.sin(a), x0 = cue.x - cx * d0, y0 = cue.y - cy * d0, x1 = cue.x - cx * (d0 + L), y1 = cue.y - cy * (d0 + L);
    c.lineCap = 'round'; c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 7; c.beginPath(); c.moveTo(x0 + 4, y0 + 6); c.lineTo(x1 + 4, y1 + 6); c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 8.5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    const seg = (f0, f1, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0 - cx * L * f0, y0 - cy * L * f0); c.lineTo(x0 - cx * L * f1, y0 - cy * L * f1); c.stroke(); };
    c.lineCap = 'butt'; seg(0, 0.02, '#5ab0ff', 4.5); seg(0.02, 0.06, '#f7f3ea', 4.5); seg(0.06, 0.62, '#e8c38e', 5); seg(0.62, 0.66, '#f2d15c', 5.5); seg(0.66, 0.85, '#1a1530', 6); seg(0.85, 1, '#6b3a1c', 6.5); c.lineCap = 'round';
    if (!strike) { c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.arc(cue.x, cue.y, 18, -Math.PI / 2, -Math.PI / 2 + p * R2); c.stroke(); c.strokeStyle = `hsl(${120 - p * 120} 90% 60%)`; c.lineWidth = 4; c.stroke(); } }
  if (cue && !moving() && !aiming && !kb && shots === 0) { const e = (t % 1.4) / 1.4; c.globalAlpha = 1 - e; c.fillStyle = '#fff'; c.beginPath(); c.arc(cue.x, cue.y + 30 + e * 60, 9, 0, R2); c.fill(); c.globalAlpha = 1; label('Arrastra hacia atrás', cue.x, cue.y + 104, 12, 'rgba(255,255,255,.85)', 'center'); }
  for (const b of tray) drawBall(b.n, b.x, TY + TH + 45, b.rot, 0.9);
  // HUD
  panel(8, 6, 110, 44); label(`${shots}`, 18, 10, 24, '#fff'); label('tiros', 108, 16, 12, '#e6e1ff', 'right');
  panel(W - 118, 6, 110, 44); label(`${potted}/15`, W - 18, 10, 22, '#f2d15c', 'right'); label('metidas', W - 108, 30, 10, '#e6e1ff');
  if (msgT > 0) { const e = Math.min(1, (1 - msgT) / 0.14), s = 0.6 + 0.4 * Math.min(1, Math.max(0, e)) + Math.sin(Math.min(1, Math.max(0, e)) * Math.PI) * 0.2; c.save(); c.translate(W / 2, 330); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, -12, msg.length > 14 ? 20 : 28, msgC, 'center'); c.restore(); c.globalAlpha = 1; }
});
function drawBall(n, x, y, rot, s) { const sz = 24 * s; c.save(); c.translate(x, y); c.save(); c.rotate(rot); c.drawImage(sprites[n], -sz / 2, -sz / 2, sz, sz); c.restore(); c.drawImage(shade, -sz / 2, -sz / 2, sz, sz); c.restore(); }
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function panel(x, y, w, h) { ART.rr(c, x, y, w, h, 10); c.fillStyle = 'rgba(26,21,48,.72)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.14)'; c.stroke(); }

/* ¿la puntuación supera el récord guardado? (se consulta antes de que k.best lo actualice; mismo aviso que k.end) */
function NREC(s) { let b = 0; try { b = +localStorage.getItem('best:' + CFG.id) || 0; } catch (e) {} if (s > b && b > 0) { k.confetti(); k.sfx('win'); return '<b style="color:#ffd166">¡Nuevo récord!</b><br>'; } return ''; }
