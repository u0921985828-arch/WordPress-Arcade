/* Pool Break con arte propio: mete las 15 bolas con el menor número de tiros. Meter la blanca = +2 tiros.
 * Arrastra hacia atrás (desde cualquier punto) y suelta; la guía muestra la bola fantasma y la salida de la bola tocada. Teclado: ← → apuntar, ↑ ↓ fuerza, A tirar. */
/* CFG.mode 'eight' → eightGame() (al final del archivo); sin modo: Pool Break en solitario. */
if (CFG.mode === 'eight') eightGame(); else {
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
}
/* ================= Bola Ocho Duo (CFG.mode 'eight'): bola 8 a dos, mesa horizontal 800×450 =================
 * Reglas (simplificadas donde se indica): salida desde el punto de cabecera; mesa abierta tras la salida (la 8 metida en
 * la salida se vuelve a colocar). La primera bola metida sin falta asigna lisas (1–7) o rayadas (9–15). Sigues mientras
 * metas de las tuyas. Falta = blanca dentro, no tocar ninguna bola o tocar primero una que no es tuya (con mesa abierta,
 * la 8): el rival coloca la blanca donde quiera. Meter la 8 con tu grupo limpio y sin falta gana; antes o con falta
 * pierde. Sin regla de banda ni cantar tronera. Mando: ← → apuntar, ↑ ↓ ajuste fino, mantener A = fuerza, soltar = tiro.
 * Táctil (J1): arrastra hacia atrás y suelta. CPU: busca bola fantasma y tronera; su error baja con 'cpu:<id>'. */
function eightGame() {
  const W = 800, H = 450, OUT = ART.OUT, R2 = 6.2832, BR = 10, TX = 120, TY = 92, TW = 560, TH = 280, ID = CFG.id || 'bola-ocho-duo';
  const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1a1210' }), c = k.ctx;
  const POCK = [[TX, TY, 18], [TX + TW / 2, TY - 3, 15], [TX + TW, TY, 18], [TX, TY + TH, 18], [TX + TW / 2, TY + TH + 3, 15], [TX + TW, TY + TH, 18]];
  const COL = ['#fff', '#f2c230', '#2b50c9', '#d7263d', '#6a3fb5', '#f28b2d', '#1e8a4c', '#8a2432', '#15151c', '#f2c230', '#2b50c9', '#d7263d', '#6a3fb5', '#f28b2d', '#1e8a4c', '#8a2432'];
  const HX = TX + TW * 0.25, FX = TX + TW * 0.72, MY = TY + TH / 2, CNAME = ['roja', 'azul', 'amarilla', 'verde'];
  const clamp = k.clamp, gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(R2 * Math.random()); };
  let LV = 0; try { LV = clamp(+localStorage.getItem('cpu:' + ID) || 0, 0, 10); } catch (e) { /* sin almacenamiento */ }
  let seats = [], balls = [], sinking = [], cur = 0, breaker = 1, grp = [null, null], phase = 'aim', isBreak = true, shot = null, strike = null, kAng = 0, pw = 0, holdT = 0, prevA = false, aiming = false;
  let t = 0, msg = '', msgT = 0, msgC = '#fff', cpu = null, lastClick = 0, endT = 0, winner = -1, why = '', bannerT = 0;
  const nm = (i) => (seats[i].cpu ? 'CPU ' + CNAME[seats[i].p % 4] : String(seats[i].name).slice(0, 10));
  const pc = (i) => k.pcol(seats[i].p);
  const cueB = () => balls.find((b) => b.n === 0);
  const inG = (n, g) => (g === 'solid' ? n >= 1 && n <= 7 : g === 'stripe' ? n >= 9 : false);
  const cleared = (i) => grp[i] && !balls.some((b) => inG(b.n, grp[i]));
  const legalFirst = (i, n) => (!grp[i] ? n !== 8 : cleared(i) ? n === 8 : inG(n, grp[i]));
  const targets = (i) => balls.filter((b) => b.n && legalFirst(i, b.n));
  k.onParty = () => { if (k.st !== 'play' || !seats.length) reset(); else seats = k.players(2); };
  function say(s, col, d) { msg = s; msgC = col || '#fff'; msgT = d || 1.6; }
  function reset() {
    seats = k.players(2); breaker = 1 - breaker; cur = breaker; grp = [null, null]; sinking = []; isBreak = true; shot = null; strike = null; cpu = null;
    endT = 0; winner = -1; why = ''; msg = ''; msgT = 0; holdT = 0; pw = 0; prevA = true; aiming = false; bannerT = 1.2;
    balls = [{ n: 0, x: HX, y: MY, vx: 0, vy: 0, rot: 0 }];
    const sol = k.shuffle([1, 2, 3, 4, 5, 6, 7]), str = k.shuffle([9, 10, 11, 12, 13, 14, 15]), slots = [];
    for (let r = 0; r < 5; r++) for (let i = 0; i <= r; i++) slots.push([r, i]);
    const cornerA = sol.pop(), cornerB = str.pop(), rest = k.shuffle(sol.concat(str));
    for (const [r, i] of slots) {
      const n = r === 2 && i === 1 ? 8 : r === 4 && i === 0 ? cornerA : r === 4 && i === 4 ? cornerB : rest.pop();
      balls.push({ n, x: FX + r * BR * 1.74, y: MY + (i - r / 2) * (BR * 2 + 0.4), vx: 0, vy: 0, rot: Math.random() * R2 });
    }
    kAng = 0; phase = 'aim';
  }
  /* ---------- mesa y bolas cacheadas ---------- */
  let tableCv, sprites, shade;
  (function build() {
    tableCv = document.createElement('canvas'); tableCv.width = W * 2; tableCv.height = H * 2; const g = tableCv.getContext('2d'); g.scale(2, 2);
    const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return v - Math.floor(v); };
    let gr = g.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 520); gr.addColorStop(0, '#3a2418'); gr.addColorStop(1, '#120a08'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.45)'; ART.rr(g, TX - 20, TY - 12, TW + 44, TH + 44, 20); g.fill();
    ART.rr(g, TX - 26, TY - 26, TW + 52, TH + 52, 20); gr = g.createLinearGradient(0, TY - 26, 0, TY + TH + 26); gr.addColorStop(0, '#6b3a1c'); gr.addColorStop(0.5, '#9a5a2c'); gr.addColorStop(1, '#6b3a1c'); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = 'rgba(255,220,170,.25)'; g.lineWidth = 2; ART.rr(g, TX - 22, TY - 22, TW + 44, TH + 44, 17); g.stroke();
    g.strokeStyle = 'rgba(60,25,8,.35)'; g.lineWidth = 1; for (let i = 0; i < 50; i++) { const x = TX - 24 + hr(i, 1) * (TW + 48); g.beginPath(); g.moveTo(x, TY - 24); g.quadraticCurveTo(x + 6, TY - 14, x, TY - 4); g.moveTo(x, TY + TH + 4); g.quadraticCurveTo(x - 6, TY + TH + 14, x, TY + TH + 24); g.stroke(); }
    g.fillStyle = '#f3e7c9'; const dia = (x, y) => { g.beginPath(); g.moveTo(x, y - 3.5); g.lineTo(x + 2.5, y); g.lineTo(x, y + 3.5); g.lineTo(x - 2.5, y); g.closePath(); g.fill(); };
    for (let i = 1; i < 8; i++) if (i !== 4) { dia(TX + TW * i / 8, TY - 14); dia(TX + TW * i / 8, TY + TH + 14); } for (let i = 1; i < 4; i++) { dia(TX - 14, TY + TH * i / 4); dia(TX + TW + 14, TY + TH * i / 4); }
    g.fillStyle = '#0f5a30'; g.fillRect(TX - 8, TY - 8, TW + 16, TH + 16);
    gr = g.createRadialGradient(TX + TW / 2, MY, 40, TX + TW / 2, MY, TW * 0.6); gr.addColorStop(0, '#26a35e'); gr.addColorStop(1, '#17804a'); g.fillStyle = gr; g.fillRect(TX, TY, TW, TH);
    for (let i = 0; i < 2600; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,40,10,.12)'; g.fillRect(TX + hr(i, 4) * TW, TY + hr(i, 5) * TH, 1, 1); }
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(TX, TY, TW, TH);
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(HX, TY); g.lineTo(HX, TY + TH); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(HX, MY, 2, 0, R2); g.arc(FX, MY, 2, 0, R2); g.fill();
    for (const [x, y, r] of POCK) { g.beginPath(); g.arc(x, y, r + 5, 0, R2); ART.fillOut(g, '#3a2210', 2.5); g.beginPath(); g.arc(x, y, r, 0, R2); gr = g.createRadialGradient(x, y + 2, 2, x, y, r); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#1d1512'); g.fillStyle = gr; g.fill(); }
    sprites = COL.map((col, n) => { const cv = document.createElement('canvas'); cv.width = cv.height = 48; const b = cv.getContext('2d'); b.scale(2, 2); b.translate(12, 12); b.beginPath(); b.arc(0, 0, BR, 0, R2); b.clip();
      b.fillStyle = n > 8 ? '#f7f3ea' : col; b.fillRect(-12, -12, 24, 24); if (n > 8) { b.fillStyle = col; b.fillRect(-12, -5.6, 24, 11.2); }
      if (n) { b.beginPath(); b.arc(0, 0, 4.8, 0, R2); b.fillStyle = '#fff'; b.fill(); b.fillStyle = '#15151c'; b.font = `900 ${n > 9 ? 6 : 7}px ui-rounded,system-ui,sans-serif`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText(n, 0, 0.5); }
      else { b.fillStyle = '#d23a4a'; b.beginPath(); b.arc(3, 3, 1.4, 0, R2); b.fill(); } return cv; });
    shade = document.createElement('canvas'); shade.width = shade.height = 48; const s = shade.getContext('2d'); s.scale(2, 2); s.translate(12, 12);
    gr = s.createRadialGradient(-3, -4, 1, 0, 0, BR + 1); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); s.beginPath(); s.arc(0, 0, BR, 0, R2); s.fillStyle = gr; s.fill();
    s.fillStyle = 'rgba(255,255,255,.9)'; s.beginPath(); s.ellipse(-3.5, -4.2, 2.6, 1.6, -0.6, 0, R2); s.fill(); s.lineWidth = 1.8; s.strokeStyle = OUT; s.beginPath(); s.arc(0, 0, BR, 0, R2); s.stroke();
  })();
  /* ---------- geometría ---------- */
  function ray(cue, a) { const dx = Math.cos(a), dy = Math.sin(a); let best = 1e9, hit = null;
    for (const b of balls) { if (b === cue) continue; const fx = b.x - cue.x, fy = b.y - cue.y, pr = fx * dx + fy * dy; if (pr <= 0) continue; const perp2 = fx * fx + fy * fy - pr * pr, r2 = 4 * BR * BR; if (perp2 > r2) continue; const d = pr - Math.sqrt(r2 - perp2); if (d < best) { best = d; hit = b; } }
    const tx = dx > 0 ? (TX + TW - BR - cue.x) / dx : dx < 0 ? (TX + BR - cue.x) / dx : 1e9, ty = dy > 0 ? (TY + TH - BR - cue.y) / dy : dy < 0 ? (TY + BR - cue.y) / dy : 1e9, dw = Math.min(tx, ty);
    if (!hit || dw < best) return { x: cue.x + dx * dw, y: cue.y + dy * dw, hit: null }; return { x: cue.x + dx * best, y: cue.y + dy * best, hit }; }
  function clearPath(x0, y0, x1, y1, skip) { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    for (const b of balls) { if (skip.indexOf(b) >= 0) continue; const u = ((b.x - x0) * dx + (b.y - y0) * dy) / (L * L); if (u < 0 || u > 1) continue; if (Math.hypot(x0 + dx * u - b.x, y0 + dy * u - b.y) < BR * 2 - 0.5) return false; } return true; }
  const freeSpot = (x, y) => x > TX + BR && x < TX + TW - BR && y > TY + BR && y < TY + TH - BR && !balls.some((b) => b.n && Math.hypot(b.x - x, b.y - y) < BR * 2 + 1);
  /* mejores tiros desde (cx,cy): bola fantasma → tronera */
  function plans(i, cx, cy) {
    const out = [], cue = { x: cx, y: cy };
    for (const b of targets(i)) for (const [px, py] of POCK) {
      const ox = px - b.x, oy = py - b.y, od = Math.hypot(ox, oy), gx = b.x - ox / od * BR * 2, gy = b.y - oy / od * BR * 2;
      const cxv = gx - cx, cyv = gy - cy, cd = Math.hypot(cxv, cyv); if (cd < 1) continue;
      const cut = (cxv * ox + cyv * oy) / (cd * od); if (cut < 0.25) continue;
      const cueObj = balls.find((q) => q.n === 0);
      if (!clearPath(cx, cy, gx, gy, [b, cueObj]) || !clearPath(b.x, b.y, px, py, [b, cueObj])) continue;
      const sc = cut * cut * 600 / (cd + od * 1.4 + 60);
      out.push({ a: Math.atan2(cyv, cxv), p: clamp(0.22 + (cd + od / Math.max(0.35, cut)) / 1100, 0.25, 0.95), sc, b });
    }
    return out.sort((a, b) => b.sc - a.sc);
  }
  function cpuThink() {
    const cue = cueB(); let pl = plans(cur, cue.x, cue.y)[0];
    if (!pl) { const tg = targets(cur).sort((a, b) => Math.hypot(a.x - cue.x, a.y - cue.y) - Math.hypot(b.x - cue.x, b.y - cue.y)); const b = tg.find((q) => clearPath(cue.x, cue.y, q.x, q.y, [q, cue])) || tg[0];
      pl = b ? { a: Math.atan2(b.y - cue.y, b.x - cue.x) + gauss() * 0.03, p: 0.45 } : { a: Math.random() * R2, p: 0.5 }; }
    if (isBreak) pl = { a: Math.atan2(MY - cue.y, FX - cue.x) + gauss() * 0.01, p: 0.95 };
    const sig = Math.max(0.005, 0.03 - LV * 0.0026);
    cpu = { a: pl.a + gauss() * sig, p: clamp(pl.p * (1 + gauss() * 0.08), 0.15, 1), t: 0, from: kAng };
  }
  function cpuPlace() {
    let best = null, bs = -1;
    for (let gx = 0; gx < 14; gx++) for (let gy = 0; gy < 7; gy++) { const x = TX + 20 + gx * (TW - 40) / 13, y = TY + 20 + gy * (TH - 40) / 6; if (!freeSpot(x, y)) continue; const p = plans(cur, x, y)[0], s = p ? p.sc : 0; if (s > bs) { bs = s; best = { x, y }; } }
    const cue = cueB(); if (best && cue) { cue.x = best.x; cue.y = best.y; }
  }
  /* ---------- tiro y evaluación ---------- */
  function shoot(a, p) { if (p < 0.04) return; strike = { a, p, t: 0 }; shot = { first: 0, pots: [], cueIn: false }; phase = 'roll'; aiming = false; holdT = 0; pw = 0; }
  function autoAim() { const cue = cueB(); if (!cue) return; const tg = targets(cur); if (!tg.length) return; tg.sort((a, b) => Math.hypot(a.x - cue.x, a.y - cue.y) - Math.hypot(b.x - cue.x, b.y - cue.y)); kAng = Math.atan2(tg[0].y - cue.y, tg[0].x - cue.x); }
  function startTurn(inHand) {
    cpu = null; prevA = true; aiming = false; holdT = 0; pw = 0; bannerT = 1;
    if (inHand) { let cue = cueB(); if (!cue) { cue = { n: 0, x: HX, y: MY, vx: 0, vy: 0, rot: 0 }; for (let g = 0; g < 200 && !freeSpot(cue.x, cue.y); g++) { cue.x = HX - (g % 20) * 6; cue.y = MY + (((g / 20) | 0) % 2 ? 1 : -1) * Math.ceil((g / 20 | 0) / 2) * 24; } balls.unshift(cue); } phase = 'place'; }
    else phase = 'aim';
    autoAim();
  }
  function evaluate() {
    const i = cur, o = 1 - i, s = shot; shot = null; const brk = isBreak; isBreak = false;
    // estado anterior al tiro (las bolas metidas ya no están en la mesa)
    const clearBefore = !!grp[i] && !balls.concat(s.pots.map((n) => ({ n }))).some((b) => inG(b.n, grp[i]));
    const okFirst = (n) => (!grp[i] ? n !== 8 : clearBefore ? n === 8 : inG(n, grp[i]));
    let foul = '', eight = s.pots.indexOf(8) >= 0;
    if (s.cueIn) foul = 'Falta: blanca dentro';
    else if (!s.first) foul = 'Falta: no tocaste ninguna bola';
    else if (!brk && !okFirst(s.first)) foul = `Falta: tocaste primero la ${s.first}`;
    if (eight) {
      if (brk) { const b8 = { n: 8, x: FX, y: MY, vx: 0, vy: 0, rot: 0 }; while (!freeSpot(b8.x, b8.y)) b8.x += 4; balls.push(b8); say('La 8 vuelve a su sitio', '#fff', 1.4); }
      else { winner = foul || !clearBefore ? o : i; why = winner === i ? '¡Bola 8 dentro!' : foul ? '8 con falta' : 'La 8 antes de tiempo'; endT = 1.3; say(why, winner === i ? '#7cf7a0' : '#ff9a9a', 1.6); return; }
    }
    const obj = s.pots.filter((n) => n && n !== 8);
    if (!foul && !brk && !grp[i] && obj.length) { const g = obj[0] < 8 ? 'solid' : 'stripe'; grp[i] = g; grp[o] = g === 'solid' ? 'stripe' : 'solid';
      say(`${nm(i)}: ${g === 'solid' ? 'lisas' : 'rayadas'}`, pc(i), 1.8); }
    const own = brk ? obj.length : grp[i] ? obj.filter((n) => inG(n, grp[i])).length : 0;
    if (foul) { say(foul, '#ff9a9a', 1.8); k.sfx('hurt'); cur = o; startTurn(true); return; }
    if (own > 0 || (brk && obj.length)) { k.sfx('coin'); startTurn(false); return; }
    cur = o; startTurn(false);
  }
  function finish() {
    k.st = 'over'; const w = winner, hum = seats.filter((q) => !q.cpu);
    if (hum.length === 1) { LV = clamp(LV + (!seats[w].cpu ? 0.5 : -0.5), 0, 10); try { localStorage.setItem('cpu:' + ID, LV); } catch (e) { /* sin almacenamiento */ } }
    const rows = [w, 1 - w].map((i) => ({ p: seats[i].p, score: grp[i] ? 7 - balls.filter((b) => inG(b.n, grp[i])).length : 0, name: nm(i) }));
    k.podium(rows, { noTie: true, head: `¡Gana ${nm(w)}!`, fmt: (v) => `${v} bolas` });
  }
  /* ---------- bucle ---------- */
  const moving = () => balls.some((b) => Math.hypot(b.vx, b.vy) > 3) || strike || sinking.length;
  function physics(dt) {
    const steps = 8, h = dt / steps;
    for (let s = 0; s < steps; s++) {
      for (const b of balls) { b.x += b.vx * h; b.y += b.vy * h; const f = 1 - 0.85 * h, sp = Math.hypot(b.vx, b.vy); b.vx *= f; b.vy *= f; if (sp > 0 && sp < 25) { const g = Math.max(0, sp - 20 * h) / sp; b.vx *= g; b.vy *= g; } b.rot += sp * h / BR;
        let bn = 0; if (b.x < TX + BR) { b.x = TX + BR; bn = Math.abs(b.vx); b.vx = Math.abs(b.vx) * 0.8; } if (b.x > TX + TW - BR) { b.x = TX + TW - BR; bn = Math.abs(b.vx); b.vx = -Math.abs(b.vx) * 0.8; } if (b.y < TY + BR) { b.y = TY + BR; bn = Math.abs(b.vy); b.vy = Math.abs(b.vy) * 0.8; } if (b.y > TY + TH - BR) { b.y = TY + TH - BR; bn = Math.abs(b.vy); b.vy = -Math.abs(b.vy) * 0.8; }
        if (bn > 120 && t - lastClick > 0.05) { lastClick = t; k.sfx('pop'); }
        for (const [px, py, pr] of POCK) if (Math.hypot(b.x - px, b.y - py) < pr + 3) { b.in = true; b.px = px; b.py = py; } }
      for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) { const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < BR * 2 && d > 0) { const nx = dx / d, ny = dy / d, ov = (BR * 2 - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov; const rv = ((a.vx - b.vx) * nx + (a.vy - b.vy) * ny) * 0.97; if (rv > 0) { a.vx -= rv * nx; a.vy -= rv * ny; b.vx += rv * nx; b.vy += rv * ny; if (shot && !shot.first && (a.n === 0 || b.n === 0)) shot.first = a.n || b.n; if (rv > 40 && t - lastClick > 0.04) { lastClick = t; k.sfx('click'); } } } }
      for (const b of balls) if (b.in) { sinking.push({ n: b.n, x: b.x, y: b.y, px: b.px, py: b.py, t: 0, rot: b.rot }); if (shot) { if (b.n === 0) shot.cueIn = true; else shot.pots.push(b.n); }
        if (b.n) { k.sfx('coin'); k.burst(b.px, b.py, COL[b.n], 10, 90); } else navigator.vibrate && navigator.vibrate(60); }
      balls = balls.filter((b) => !b.in);
    }
  }
  function update(dt) {
    t += dt; msgT -= dt;
    for (let i = sinking.length - 1; i >= 0; i--) { const s = sinking[i]; s.t += dt * 4; s.x += (s.px - s.x) * Math.min(1, dt * 14); s.y += (s.py - s.y) * Math.min(1, dt * 14); if (s.t >= 1) sinking.splice(i, 1); }
    if (!k.gate(reset)) return;
    if (endT > 0) { endT -= dt; physics(dt); if (endT <= 0) finish(); return; }
    if (bannerT > 0) { bannerT -= dt; if (bannerT > 0) return; }
    const cue = cueB();
    if (phase === 'roll') {
      if (strike) { strike.t += dt; if (strike.t >= 0.12) { cue.vx = Math.cos(strike.a) * strike.p * 1500; cue.vy = Math.sin(strike.a) * strike.p * 1500; k.sfx(strike.p > 0.7 ? 'shoot' : 'hit'); if (strike.p > 0.8) k.shake(3); strike = null; } return; }
      physics(dt);
      if (!moving()) { balls.forEach((b) => { b.vx = b.vy = 0; }); evaluate(); }
      return;
    }
    const pi = seats[cur].p, hu = !seats[cur].cpu, local = hu && !k.party && pi === 0;
    if (!hu) {
      if (phase === 'place') { cpuPlace(); phase = 'aim'; autoAim(); return; }
      if (!cpu) cpuThink();
      cpu.t += dt; let da = ((cpu.a - kAng + Math.PI * 3) % R2) - Math.PI; kAng += da * Math.min(1, dt * 4);
      if (cpu.t > 1.1) { pw = Math.min(cpu.p, (cpu.t - 1.1) * 1.3); if (pw >= cpu.p) { kAng = cpu.a; shoot(kAng, cpu.p); cpu = null; } }
      return;
    }
    const d = k.pdir(pi), aDown = k.pheld(pi, 'a');
    if (phase === 'place') {
      cue.x += d.x * 170 * dt; cue.y += d.y * 170 * dt;
      if (local && k.ptr.down) { cue.x = k.ptr.x; cue.y = k.ptr.y; }
      cue.x = clamp(cue.x, TX + BR + 1, TX + TW - BR - 1); cue.y = clamp(cue.y, TY + BR + 1, TY + TH - BR - 1);
      for (let it = 0; it < 8; it++) for (const b of balls) if (b.n && Math.hypot(b.x - cue.x, b.y - cue.y) < BR * 2 + 1) { const a = Math.atan2(cue.y - b.y, cue.x - b.x); cue.x = b.x + Math.cos(a) * (BR * 2 + 1.5); cue.y = b.y + Math.sin(a) * (BR * 2 + 1.5); }
      const ok = () => { if (!freeSpot(cue.x, cue.y)) { let bx = 0, by = 0, bd = 1e9; for (let yy = TY + BR + 2; yy < TY + TH - BR - 1; yy += 4) for (let xx = TX + BR + 2; xx < TX + TW - BR - 1; xx += 4) { const dd = (xx - cue.x) ** 2 + (yy - cue.y) ** 2; if (dd < bd && freeSpot(xx, yy)) { bd = dd; bx = xx; by = yy; } } if (bd < 1e9) { cue.x = bx; cue.y = by; } }
        if (freeSpot(cue.x, cue.y)) { phase = 'aim'; prevA = true; k.sfx('click'); autoAim(); } };
      if (!aDown) prevA = false; else if (!prevA) ok();
      if (local && k.ptr.up) ok();
      return;
    }
    // apuntar: ← → giro (con B, fino), ↑ ↓ ajuste fino; mantener A = fuerza que sube y baja, soltar = tiro
    if (d.x) kAng += d.x * (k.pheld(pi, 'b') ? 0.12 : 0.85) * dt;
    if (d.y) kAng += d.y * 0.1 * dt;
    if (prevA) { if (!aDown) prevA = false; }
    else if (aDown) { holdT += dt; const ph = (holdT / 1.2) % 2; pw = Math.max(0.05, ph < 1 ? ph : 2 - ph); }
    else if (holdT > 0) { shoot(kAng, pw); return; }
    else if (!aiming) pw = 0;
    if (local) {
      if (k.ptr.hit) aiming = true;
      if (aiming && k.ptr.down) { const dx = k.ptr.sx - k.ptr.x, dy = k.ptr.sy - k.ptr.y, p = Math.min(1, Math.hypot(dx, dy) / 170); if (p > 0.05) { kAng = Math.atan2(dy, dx); pw = p; } }
      if (aiming && k.ptr.up) { aiming = false; const dx = k.ptr.sx - k.ptr.x, dy = k.ptr.sy - k.ptr.y, p = Math.min(1, Math.hypot(dx, dy) / 170); if (p > 0.05) shoot(Math.atan2(dy, dx), p); else pw = 0; }
    }
  }
  /* ---------- dibujo ---------- */
  function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
  function drawBall(n, x, y, rot, s) { const sz = 24 * s; c.save(); c.translate(x, y); c.save(); c.rotate(rot); c.drawImage(sprites[n], -sz / 2, -sz / 2, sz, sz); c.restore(); c.drawImage(shade, -sz / 2, -sz / 2, sz, sz); c.restore(); }
  function plate(i, x, right) {
    const on = i === cur && k.st === 'play', w = 300;
    ART.rr(c, x, 6, w, 50, 12); ART.fillOut(c, on ? 'rgba(40,32,78,.95)' : 'rgba(26,21,48,.85)', on ? 3 : 2.5);
    if (on) { c.strokeStyle = pc(i); c.lineWidth = 2.5; ART.rr(c, x + 3, 9, w - 6, 44, 10); c.stroke(); }
    c.fillStyle = pc(i); ART.rr(c, right ? x + w - 12 : x + 6, 12, 6, 38, 3); c.fill();
    const tx = right ? x + w - 20 : x + 20; label(nm(i), tx, 22, 15, pc(i), right ? 'right' : 'left');
    const g = grp[i]; label(g ? (g === 'solid' ? 'Lisas' : 'Rayadas') + (cleared(i) ? ' · ¡a por la 8!' : '') : 'Mesa abierta', tx, 42, 11, g && cleared(i) ? '#ffd166' : '#c9c3ff', right ? 'right' : 'left');
    if (g) { const ns = g === 'solid' ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15];
      ns.forEach((n, j) => { const bx = right ? x + 18 + j * 17 : x + w - 18 - (6 - j) * 17, off = !balls.some((b) => b.n === n); c.globalAlpha = off ? 0.25 : 1; drawBall(n, bx, 31, 0, 0.62); c.globalAlpha = 1; }); }
  }
  function draw() {
    c.drawImage(tableCv, 0, 0, W, H);
    for (const s of sinking) { const sc = 1 - s.t * 0.6; c.globalAlpha = Math.max(0, 1 - s.t * 0.7); drawBall(s.n, s.x, s.y, s.rot, sc); } c.globalAlpha = 1;
    for (const b of balls) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(b.x + 3, b.y + 4, BR, BR * 0.8, 0, 0, R2); c.fill(); }
    const cue = cueB(), idle = k.st === 'play' && phase === 'aim' && bannerT <= 0 && endT <= 0 && cue && seats.length;
    const hu = seats.length && !seats[cur].cpu;
    let a = null, p = 0; if (idle) { a = kAng; p = pw; } if (cue && strike) { a = strike.a; p = strike.p * Math.max(0, 1 - strike.t / 0.12); }
    if (idle && hu && a !== null) { const r = ray(cue, a); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(cue.x, cue.y); c.lineTo(r.x, r.y); c.stroke(); c.setLineDash([]);
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.beginPath(); c.arc(r.x, r.y, BR, 0, R2); c.stroke();
      if (r.hit) { const ok = legalFirst(cur, r.hit.n) || isBreak, nx = r.hit.x - r.x, ny = r.hit.y - r.y, L = Math.hypot(nx, ny); c.strokeStyle = ok ? 'rgba(255,240,150,.9)' : 'rgba(255,110,110,.9)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(r.hit.x, r.hit.y); c.lineTo(r.hit.x + nx / L * 60, r.hit.y + ny / L * 60); c.stroke();
        if (!ok) { c.strokeStyle = 'rgba(255,110,110,.95)'; c.lineWidth = 3; c.beginPath(); c.arc(r.hit.x, r.hit.y, BR + 4, 0, R2); c.stroke(); } } }
    for (const b of balls) drawBall(b.n, b.x, b.y, b.rot, 1);
    if (k.st === 'play' && phase === 'place' && cue && bannerT <= 0) { const e = 0.5 + 0.5 * Math.sin(t * 6); c.strokeStyle = `rgba(255,255,255,${0.4 + 0.5 * e})`; c.lineWidth = 2.5; c.setLineDash([4, 4]); c.beginPath(); c.arc(cue.x, cue.y, BR + 7, 0, R2); c.stroke(); c.setLineDash([]); }
    if (cue && a !== null) { const d0 = BR + 4 + p * 50, L = 250, cx = Math.cos(a), cy = Math.sin(a), x0 = cue.x - cx * d0, y0 = cue.y - cy * d0, x1 = cue.x - cx * (d0 + L), y1 = cue.y - cy * (d0 + L);
      c.lineCap = 'round'; c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 7; c.beginPath(); c.moveTo(x0 + 4, y0 + 6); c.lineTo(x1 + 4, y1 + 6); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 8.5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      const seg = (f0, f1, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0 - cx * L * f0, y0 - cy * L * f0); c.lineTo(x0 - cx * L * f1, y0 - cy * L * f1); c.stroke(); };
      c.lineCap = 'butt'; seg(0, 0.02, '#5ab0ff', 4.5); seg(0.02, 0.06, '#f7f3ea', 4.5); seg(0.06, 0.62, '#e8c38e', 5); seg(0.62, 0.66, seats.length ? pc(cur) : '#f2d15c', 5.5); seg(0.66, 0.85, '#1a1530', 6); seg(0.85, 1, '#6b3a1c', 6.5); c.lineCap = 'round';
      if (!strike && p > 0) { c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.arc(cue.x, cue.y, 18, -Math.PI / 2, -Math.PI / 2 + p * R2); c.stroke(); c.strokeStyle = `hsl(${120 - p * 120} 90% 60%)`; c.lineWidth = 4; c.stroke(); } }
    if (seats.length) { plate(0, 8, false); plate(1, 492, true); }
    // pie: fuerza y ayuda
    if (seats.length && k.st === 'play') {
      const hint = !hu ? 'La CPU piensa…' : phase === 'place' ? 'Bola en mano: mueve la blanca y pulsa A' : isBreak ? 'Salida: apunta al triángulo y mantén A' : 'Mantén A para la fuerza y suelta';
      label(hint, W / 2, 426, 14, '#e6e1ff', 'center');
      if (phase === 'aim' && hu && pw > 0) { ART.rr(c, W / 2 - 110, 436, 220, 8, 4); c.fillStyle = '#1b1438'; c.fill(); ART.rr(c, W / 2 - 110, 436, 220 * pw, 8, 4); c.fillStyle = `hsl(${120 - pw * 120} 90% 60%)`; c.fill(); }
    }
    if (msgT > 0) { const e = Math.min(1, Math.max(0, (1.6 - msgT) / 0.14)), s = 0.6 + 0.4 * e; c.save(); c.translate(W / 2, MY - 60); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, 0, 24, msgC, 'center'); c.restore(); c.globalAlpha = 1; }
    if (k.st === 'play' && bannerT > 0 && seats.length) { const al = Math.min(1, bannerT / 0.25); c.globalAlpha = al; ART.rr(c, W / 2 - 140, MY - 30, 280, 60, 16); ART.fillOut(c, 'rgba(26,21,48,.94)', 3); label('Turno de ' + nm(cur), W / 2, MY - 8, 22, pc(cur), 'center'); label(phase === 'place' ? 'Bola en mano' : isBreak ? 'Salida' : grp[cur] ? (grp[cur] === 'solid' ? 'Lisas' : 'Rayadas') : 'Mesa abierta', W / 2, MY + 16, 13, '#c9c3ff', 'center'); c.globalAlpha = 1; }
  }
  window.__8 = { get balls() { return balls; }, get cur() { return cur; }, get grp() { return grp; }, get phase() { return phase; }, get seats() { return seats; }, get winner() { return winner; }, set LV(v) { LV = v; } };
  reset();
  k.show(CFG.title || 'Bola Ocho Duo', 'Bola 8 a dos. Tras la salida, la primera bola que metas te da lisas o rayadas; sigue tirando mientras metas de las tuyas. Falta: el rival coloca la blanca donde quiera. Mete la 8 al final para ganar (antes, pierdes). ← → apuntan, ↑ ↓ afinan, mantén A para la fuerza y suelta. En el móvil, arrastra hacia atrás y suelta.<br>Toca para jugar');
  k.run(update, draw);
}
