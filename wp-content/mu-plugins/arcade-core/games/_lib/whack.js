/* Reflex Grid: golpea los topos antes de que se escondan y evita las bombas. 60 s.
 * Agujeros cacheados en un prado, topos que asoman con animación, topo dorado (+2 s), mazo animado y teclado con cursor. */
const OUT = ART.OUT, R2 = 6.2832;
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#3f9b4c' }), c = k.ctx;
let N, cells, time, score, combo, spawnT, lvl, mallet, sel, kbd, tm, lvlT, boardCv;
function reset() { N = 3; cells = Array(16).fill(null); time = 60; score = 0; combo = 0; spawnT = 0.5; lvl = 1; mallet = null; sel = 4; kbd = false; tm = 0; lvlT = 0; boardCv = board(3); }
const cellR = (i) => { const S = 300 / N; return [30 + (i % N) * S, 196 + Math.floor(i / N) * S * 1.18, S, S * 1.18]; };
const holeC = (i) => { const [x, y, S] = cellR(i); return [x + S / 2, y + S * 0.78, S]; };

/* ---------- prado y agujeros cacheados (uno por tamaño de cuadrícula) */
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function board(n) { const saveN = N; N = n; const cv = off(360, 640, (g) => {
  let gr = g.createLinearGradient(0, 0, 0, 170); gr.addColorStop(0, '#6ec8ff'); gr.addColorStop(1, '#d4f1ff'); g.fillStyle = gr; g.fillRect(0, 0, 360, 170);
  g.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y] of [[60, 104], [250, 86], [330, 130]]) { g.beginPath(); g.arc(x, y, 14, 0, R2); g.arc(x + 18, y - 7, 18, 0, R2); g.arc(x + 38, y, 13, 0, R2); g.fill(); }
  g.fillStyle = '#8fd48a'; g.beginPath(); g.moveTo(0, 170); for (let x = 0; x <= 360; x += 10) g.lineTo(x, 138 - Math.sin(x / 60) * 14 - Math.sin(x / 23) * 4); g.lineTo(360, 170); g.fill();
  gr = g.createLinearGradient(0, 150, 0, 640); gr.addColorStop(0, '#5cc462'); gr.addColorStop(1, '#3a9a48'); g.fillStyle = gr; g.fillRect(0, 150, 360, 490);
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 9; i++) if (i % 2) g.fillRect(i * 40, 150, 40, 490);
  g.strokeStyle = 'rgba(30,90,40,.35)'; g.lineWidth = 1.5; for (let i = 0; i < 140; i++) { const x = rnd(i) * 360, y = 160 + rnd(i + 50) * 470; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 5); g.moveTo(x + 2, y); g.lineTo(x + 3, y - 6); g.stroke(); }
  for (let i = 0; i < 10; i++) { const x = rnd(i + 200) * 340 + 10, y = 170 + rnd(i + 300) * 450; g.fillStyle = ['#fff', '#ffe066', '#ff9ec7'][i % 3]; for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(x + Math.cos(j * 1.256) * 3, y + Math.sin(j * 1.256) * 3, 2.2, 0, R2); g.fill(); } g.fillStyle = '#f2b705'; g.beginPath(); g.arc(x, y, 1.8, 0, R2); g.fill(); }
  for (let i = 0; i < n * n; i++) { const [hx, hy, S] = holeC(i), rx = S * 0.38, ry = S * 0.14;
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(hx, hy + ry * 0.5, rx * 1.3, ry * 1.6, 0, 0, R2); g.fill();
    g.beginPath(); g.ellipse(hx, hy, rx * 1.22, ry * 1.5, 0, 0, R2); ART.fillOut(g, '#a4703f', 2.5);
    g.fillStyle = '#c28a55'; g.beginPath(); g.ellipse(hx, hy - ry * 0.35, rx * 1.12, ry * 1.1, 0, Math.PI, 0); g.fill();
    g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, R2); const hg = g.createLinearGradient(0, hy - ry, 0, hy + ry); hg.addColorStop(0, '#120c20'); hg.addColorStop(1, '#3a2618'); g.fillStyle = hg; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); }
  // valla y arbustos al frente
  for (let x = 6; x < 360; x += 30) { ART.rr(g, x, 590, 16, 50, 3); ART.fillOut(g, '#e8d2a8', 2.5); } ART.rr(g, -4, 604, 368, 9, 3); ART.fillOut(g, '#d6bb8a', 2.5);
  g.beginPath(); for (let i = 0; i < 7; i++) { const x = i * 60 + (i % 2) * 14 - 10, y = 634; g.moveTo(x + 24, y); g.arc(x, y, 24, 0, R2); g.moveTo(x + 48, y - 8); g.arc(x + 26, y - 8, 22, 0, R2); }
  g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.fillStyle = '#34944a'; g.fill();
  g.fillStyle = 'rgba(255,255,255,.14)'; for (let i = 0; i < 7; i++) { const x = i * 60 + (i % 2) * 14 - 10; g.beginPath(); g.arc(x + 20, 614, 7, 0, R2); g.arc(x - 6, 622, 5, 0, R2); g.fill(); }
}); N = saveN; return cv; }
reset(); k.show(CFG.title, 'Golpea los topos lo más rápido posible. El dorado da +2 s. ¡No toques las bombas! 60 segundos. Teclado: flechas y A.');

function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function whack(i) {
  const [hx, hy, S] = holeC(i), q = cells[i]; mallet = { x: hx + S * 0.5 + 16, y: hy + 6, tx: hx, ty: hy - S * 0.42, t: 0 };
  if (!q || q.hit) { combo = 0; k.sfx('click'); return; }
  q.hit = 0.001; q.life = Math.min(q.life, 0.35);
  if (q.bomb) { score = Math.max(0, score - 100); time -= 3; combo = 0; k.burst(hx, hy - S * 0.2, '#ff9a3c', 24, 220); k.burst(hx, hy - S * 0.2, '#555', 12, 140); k.sfx('explode'); k.shake(9); k.flash('rgba(255,120,60,.35)'); k.float('-3 s', hx, hy - S * 0.5, '#ff6b6b'); navigator.vibrate && navigator.vibrate(120); return; }
  combo++; const mul = Math.min(5, 1 + Math.floor(combo / 5)), pts = (q.gold ? 50 : 10) * mul; score += pts; if (q.gold) time += 2;
  k.burst(hx, hy - S * 0.25, q.gold ? '#f2d15c' : '#fff', 12, 180); k.sfx(q.gold ? 'coin' : 'hit'); k.shake(2);
  k.float(q.gold ? `+${pts}  +2 s` : `+${pts}`, hx, hy - S * 0.6, q.gold ? '#fff27a' : '#fff');
  if (combo > 0 && combo % 5 === 0 && combo <= 20) k.float(`Combo x${mul}`, 180, 176, '#fff27a');
}
k.run((dt) => {
  tm += dt; lvlT -= dt; if (mallet) { mallet.t += dt; if (mallet.t > 0.28) mallet = null; }
  for (let i = 0; i < 16; i++) { const q = cells[i]; if (q && q.hit) q.hit += dt; }
  if (!k.gate(reset)) return; time -= dt; if (time <= 0) { time = 0; return k.lose(CFG.id, score, '¡Tiempo!', NREC(score) + `Nivel ${lvl}`); }
  if (score > 1500 && N === 3) { N = 4; cells = Array(16).fill(null); lvl = 2; lvlT = 1.6; sel = 5; boardCv = board(4); k.sfx('win'); k.confetti(); }
  spawnT -= dt; if (spawnT <= 0) { spawnT = Math.max(0.28, 0.8 - (60 - time) * 0.009); const free = [...Array(N * N).keys()].filter((i) => !cells[i]); if (free.length) { const i = k.pick(free); const bomb = Math.random() < 0.18, gold = !bomb && Math.random() < 0.1; const life = Math.max(0.55, 1.4 - (60 - time) * 0.012) * (gold ? 0.6 : 1); cells[i] = { life, max: life, bomb, gold, age: 0, hit: 0 }; } }
  for (let i = 0; i < N * N; i++) { const q = cells[i]; if (!q) continue; q.age += dt; q.life -= dt; if (q.life <= 0) { if (!q.bomb && !q.hit) combo = 0; cells[i] = null; } }
  // teclado: cursor por la cuadrícula
  const mv = (dx, dy) => { kbd = true; const x = k.clamp(sel % N + dx, 0, N - 1), y = k.clamp(Math.floor(sel / N) + dy, 0, N - 1); sel = y * N + x; };
  if (k.hit.has('left')) mv(-1, 0); if (k.hit.has('right')) mv(1, 0); if (k.hit.has('up')) mv(0, -1); if (k.hit.has('down')) mv(0, 1);
  if (k.hit.has('a')) { kbd = true; whack(sel); }
  if (k.ptr.hit) { kbd = false; for (let i = 0; i < N * N; i++) { const [x, y, S, SY] = cellR(i); if (k.ptr.x > x && k.ptr.x < x + S && k.ptr.y > y && k.ptr.y < y + SY) { whack(i); break; } } }
}, () => {
  c.drawImage(boardCv, 0, 0, 360, 640);
  if (kbd && k.st === 'play') { const [hx, hy, S] = holeC(sel); c.lineWidth = 4; c.strokeStyle = '#fff27a'; c.setLineDash([8, 6]); c.beginPath(); c.ellipse(hx, hy, S * 0.5, S * 0.22, 0, 0, R2); c.stroke(); c.setLineDash([]); }
  for (let i = 0; i < N * N; i++) { const q = cells[i]; if (!q) continue; const [hx, hy, S] = holeC(i);
    // altura: sube con rebote, baja al final o al ser golpeado
    let up = q.age < 0.14 ? Math.sin(q.age / 0.14 * 1.9) / Math.sin(1.9) * 1.08 : 1; if (q.age >= 0.14 && q.age < 0.22) up = 1 + Math.sin((q.age - 0.14) / 0.08 * Math.PI) * 0.04;
    if (q.life < 0.16) up = Math.min(up, q.life / 0.16); if (q.hit && !q.bomb) up = Math.min(up, Math.max(0, 1 - Math.max(0, q.hit - 0.12) / 0.2));
    if (up <= 0.01) continue; const w = S * 0.6, h = S * 0.72, sq = q.hit && q.hit < 0.12 ? 0.18 : 0;
    c.save(); c.beginPath(); c.rect(hx - S / 2, hy - S * 1.2, S, S * 1.2); c.ellipse(hx, hy, S * 0.38, S * 0.14, 0, 0, Math.PI); c.clip();
    c.translate(hx, hy + (1 - up) * h * 1.05 + 4); c.scale(1 + sq, 1 - sq);
    if (q.bomb) { const r = w * 0.48, cy = -r - 2; if (q.hit) { c.restore(); continue; }
      c.beginPath(); c.arc(0, cy, r, 0, R2); ART.fillOut(c, '#2d2a3e', 3); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-r * 0.4, cy - r * 0.4, r * 0.25, r * 0.15, -0.6, 0, R2); c.fill();
      ART.rr(c, -5, cy - r - 7, 10, 9, 2); ART.fillOut(c, '#8a8fa8', 2); c.strokeStyle = '#c9a36a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, cy - r - 7); c.quadraticCurveTo(6, cy - r - 18, 12, cy - r - 14); c.stroke();
      const sp = 4 + Math.sin(tm * 30) * 2; c.fillStyle = '#ffdd55'; c.beginPath(); for (let j = 0; j < 8; j++) { const a = j * 0.785, rr = j % 2 ? sp * 0.4 : sp; c.lineTo(12 + Math.cos(a) * rr, cy - r - 14 + Math.sin(a) * rr); } c.fill();
      c.strokeStyle = '#ff5f5f'; c.lineWidth = 3; c.beginPath(); c.moveTo(-r * 0.45, cy - r * 0.25); c.lineTo(-r * 0.12, cy - r * 0.1); c.moveTo(r * 0.45, cy - r * 0.25); c.lineTo(r * 0.12, cy - r * 0.1); c.stroke();
      c.fillStyle = '#ff5f5f'; c.beginPath(); c.arc(-r * 0.28, cy + r * 0.05, r * 0.1, 0, R2); c.arc(r * 0.28, cy + r * 0.05, r * 0.1, 0, R2); c.fill(); }
    else { const body = q.gold ? '#f2c230' : '#9a6a44', belly = q.gold ? '#fff0a8' : '#d9b48a';
      c.beginPath(); c.moveTo(-w / 2, 4); c.lineTo(-w / 2, -h + w / 2); c.arc(0, -h + w / 2, w / 2, Math.PI, 0); c.lineTo(w / 2, 4); c.closePath(); ART.fillOut(c, body, 3);
      c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-w * 0.26, -h + w * 0.42, w * 0.08, w * 0.2, 0.3, 0, R2); c.fill();
      c.fillStyle = belly; c.beginPath(); c.ellipse(0, -h * 0.28, w * 0.3, h * 0.3, 0, 0, R2); c.fill();
      const ey = -h + w * 0.5, dz = q.hit && !q.bomb;
      if (dz) { c.strokeStyle = OUT; c.lineWidth = 2.5; for (const sx of [-1, 1]) { const ex = sx * w * 0.18; c.beginPath(); c.moveTo(ex - 4, ey - 4); c.lineTo(ex + 4, ey + 4); c.moveTo(ex + 4, ey - 4); c.lineTo(ex - 4, ey + 4); c.stroke(); } }
      else { for (const sx of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.arc(sx * w * 0.18, ey, w * 0.11, 0, R2); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(sx * w * 0.18 + 1, ey + 1, w * 0.06, 0, R2); c.fill(); } }
      c.beginPath(); c.ellipse(0, ey + w * 0.2, w * 0.13, w * 0.09, 0, 0, R2); ART.fillOut(c, '#ff8fb0', 2);
      c.fillStyle = '#fff'; c.fillRect(-w * 0.07, ey + w * 0.28, w * 0.065, w * 0.1); c.fillRect(w * 0.005, ey + w * 0.28, w * 0.065, w * 0.1);
      c.fillStyle = '#ff9a9a'; c.globalAlpha = 0.5; c.beginPath(); c.arc(-w * 0.32, ey + w * 0.18, w * 0.07, 0, R2); c.arc(w * 0.32, ey + w * 0.18, w * 0.07, 0, R2); c.fill(); c.globalAlpha = 1;
      if (q.gold) { c.beginPath(); c.moveTo(-w * 0.24, -h + 4); c.lineTo(-w * 0.26, -h - 12); c.lineTo(-w * 0.1, -h - 3); c.lineTo(0, -h - 15); c.lineTo(w * 0.1, -h - 3); c.lineTo(w * 0.26, -h - 12); c.lineTo(w * 0.24, -h + 4); c.closePath(); ART.fillOut(c, '#ffe14d', 2.5); c.fillStyle = '#ff5f7a'; c.beginPath(); c.arc(0, -h - 4, 2.5, 0, R2); c.fill(); }
      // patitas en el borde
      for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * w * 0.36, -2, w * 0.13, w * 0.08, 0, 0, R2); ART.fillOut(c, belly, 2); } }
    c.restore();
    // estrellas de mareo
    if (q.hit && !q.bomb) { for (let j = 0; j < 3; j++) { const a = tm * 6 + j * 2.09, sx = hx + Math.cos(a) * S * 0.28, sy = hy - S * 0.62 + Math.sin(a) * S * 0.07; c.fillStyle = '#fff27a'; c.beginPath(); for (let m = 0; m < 10; m++) { const r = m % 2 ? 2.2 : 5.5, b = m * 0.628 - 1.57; c.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r); } c.closePath(); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); } }
    // aviso de tiempo: anillo que se vacía
    if (!q.hit) { const p = Math.max(0, q.life / q.max); c.strokeStyle = q.bomb ? 'rgba(255,95,95,.8)' : q.gold ? 'rgba(255,242,122,.9)' : 'rgba(255,255,255,.75)'; c.lineWidth = 3.5; c.beginPath(); c.ellipse(hx, hy + 3, S * 0.44, S * 0.18, 0, Math.PI * 0.5 - p * Math.PI, Math.PI * 0.5 + p * Math.PI); c.stroke(); } }
  // mazo
  if (mallet) { const L = Math.hypot(mallet.tx - mallet.x, mallet.ty - mallet.y), a1 = Math.atan2(mallet.tx - mallet.x, mallet.y - mallet.ty), p = Math.min(1, mallet.t / 0.07), a = a1 + (1 - p * p) * 0.9;
    c.save(); c.translate(mallet.x, mallet.y); c.rotate(a); c.globalAlpha = mallet.t > 0.2 ? 1 - (mallet.t - 0.2) / 0.08 : 1;
    ART.rr(c, -4, -L, 8, L, 3); ART.fillOut(c, '#c98a4b', 2.5); ART.rr(c, -24, -L - 13, 44, 26, 8); ART.fillOut(c, '#e24b5b', 3); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-18, -L - 9, 32, 5);
    ART.rr(c, -26, -L - 9, 7, 18, 3); ART.fillOut(c, '#f4efe6', 2); ART.rr(c, 15, -L - 9, 7, 18, 3); ART.fillOut(c, '#f4efe6', 2); c.restore(); c.globalAlpha = 1; }
  // HUD
  label(score, 16, 12, 36, '#fff'); label('PUNTOS', 18, 52, 11, '#eaffea');
  const tl = Math.ceil(Math.max(0, time)), low = time < 10; const cx = 330, cy = 34; c.beginPath(); c.arc(cx, cy, 15, 0, R2); ART.fillOut(c, '#fff', 3); c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 9); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(tm * 3) * 7, cy + Math.sin(tm * 3) * 7); c.stroke();
  label(`${tl}`, 308, 18, 30, low ? (Math.sin(tm * 12) > 0 ? '#ff5f5f' : '#fff') : '#fff', 'right');
  ART.rr(c, 16, 82, 328, 12, 6); c.fillStyle = 'rgba(26,21,48,.45)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); const tw = Math.min(1, time / 60) * 324; if (tw > 2) { ART.rr(c, 18, 84, tw, 8, 4); c.fillStyle = low ? '#ff6b6b' : '#fff27a'; c.fill(); }
  label(`Nivel ${lvl}`, 16, 104, 14, '#eaffea'); if (combo >= 5) label(`Combo x${Math.min(5, 1 + Math.floor(combo / 5))}`, 344, 104, 16, '#fff27a', 'right');
  if (lvlT > 0) { const s = lvlT > 1.4 ? 0.5 + (1.6 - lvlT) * 2.5 : 1; c.save(); c.translate(180, 150); c.scale(s, s); label('¡Nivel 2! Cuadrícula 4×4', 0, 0, 22, '#fff27a', 'center', 'middle'); c.restore(); }
});

/* ¿la puntuación supera el récord guardado? (se consulta antes de que k.lose/k.end lo actualicen) */
function NREC(s) { let b = 0; try { b = +localStorage.getItem('best:' + CFG.id) || 0; } catch (e) {} if (s > b && s > 0) { k.confetti(); return '¡Nuevo récord! · '; } return ''; }
