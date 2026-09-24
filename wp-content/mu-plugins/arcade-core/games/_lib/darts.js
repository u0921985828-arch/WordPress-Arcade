/* Darts Pro con arte propio: 501 con cierre en doble o bull. El punto de mira oscila; mantén pulsado para estabilizar (sin pasarte: el pulso se cansa) y suelta para lanzar.
 * Teclado: flechas mueven la mira, mantén A para estabilizar y suelta para lanzar. Si te pasas, quedas en 1 o cierras sin doble, el turno se anula. */
const OUT = ART.OUT, R2 = 6.2832, W = 360, H = 640;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#16202e' }), c = k.ctx;
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5], CX = 180, CY = 262, R = 128;
let left, darts, turn, turnStart, thrown, aim, t, msg, msgT, msgC, hold, holdT, fly, turnT, kb, prevA, boardCv, bgCv, total3;
function reset() { left = 501; darts = 0; turn = []; turnStart = 501; thrown = []; t = 0; msg = ''; msgT = 0; aim = { x: CX, y: CY, bx: CX, by: CY - 60 }; hold = false; holdT = 0; fly = null; turnT = 0; kb = false; prevA = false; total3 = []; }
function scoreAt(x, y) { const dx = x - CX, dy = y - CY, d = Math.hypot(dx, dy) / R; if (d > 1) return [0, 'Fuera']; if (d < 0.05) return [50, 'Bull', true]; if (d < 0.1) return [25, '25'];
  const ang = (Math.atan2(dx, -dy) * 180 / Math.PI + 360 + 9) % 360, n = ORDER[Math.floor(ang / 18)]; if (d > 0.58 && d < 0.65) return [n * 3, `T${n}`]; if (d > 0.93) return [n * 2, `D${n}`, true]; return [n, `${n}`]; }
/* Sugerencia de cierre: menos dardos posible, el último en doble o bull */
const THROWS = (() => { const a = []; for (let n = 20; n >= 1; n--) a.push([n * 3, 'T' + n]); a.push([50, 'Bull'], [25, '25']); for (let n = 20; n >= 1; n--) a.push([n, '' + n]); return a; })(), DBL = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1].map((n) => [n * 2, 'D' + n]).concat([[50, 'Bull']]);
function checkout(v, nd) { if (v > 170 || nd < 1) return null; for (const d of DBL) if (d[0] === v) return [d[1]]; if (nd < 2) return null;
  for (const d of DBL) for (const a of THROWS) if (a[0] + d[0] === v) return [a[1], d[1]]; if (nd < 3) return null;
  for (const a of THROWS) for (const d of DBL) { const r = v - a[0] - d[0], b = THROWS.find((x) => x[0] === r); if (b) return [a[1], b[1], d[1]]; } return null; }
/* ---------- Diana y pared cacheadas a 2× ---------- */
function build() {
  bgCv = document.createElement('canvas'); bgCv.width = W * 2; bgCv.height = H * 2; let g = bgCv.getContext('2d'); g.scale(2, 2);
  const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return v - Math.floor(v); };
  for (let i = 0; i < 8; i++) { g.fillStyle = ['#3a2a22', '#43302a', '#362620'][i % 3]; g.fillRect(i * 45, 0, 45, H); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(i * 45, 0, 2, H); for (let j = 0; j < 14; j++) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; g.beginPath(); const x = i * 45 + 6 + hr(i, j) * 34; g.moveTo(x, j * 50); g.quadraticCurveTo(x + 4, j * 50 + 25, x, j * 50 + 50); g.stroke(); } }
  let gr = g.createRadialGradient(CX, CY, 60, CX, CY, 380); gr.addColorStop(0, 'rgba(255,220,160,.25)'); gr.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(CX + 8, CY + 12, R * 1.2, 0, R2); g.fill();
  // diana
  g.beginPath(); g.arc(CX, CY, R * 1.2, 0, R2); ART.fillOut(g, '#15151c', 3); g.strokeStyle = '#3a3a48'; g.lineWidth = 3; g.beginPath(); g.arc(CX, CY, R * 1.16, 0, R2); g.stroke();
  for (let i = 0; i < 20; i++) { const a0 = (i * 18 - 99) * Math.PI / 180, a1 = a0 + Math.PI / 10;
    for (const [r0, r1, cols] of [[0.1, 0.58, ['#16161c', '#f1e4c2']], [0.58, 0.65, ['#d7263d', '#1f8f4e']], [0.65, 0.93, ['#16161c', '#f1e4c2']], [0.93, 1, ['#d7263d', '#1f8f4e']]]) { g.fillStyle = cols[i % 2]; g.beginPath(); g.arc(CX, CY, r1 * R, a0, a1); g.arc(CX, CY, r0 * R, a1, a0, true); g.closePath(); g.fill(); }
    g.font = '900 16px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const am = a0 + Math.PI / 20; g.fillStyle = '#fff'; g.fillText(ORDER[i], CX + Math.cos(am) * R * 1.09, CY + Math.sin(am) * R * 1.09 + 1); }
  // fibras de sisal
  g.save(); g.beginPath(); g.arc(CX, CY, R, 0, R2); g.clip(); for (let i = 0; i < 900; i++) { const a = hr(i, 1) * R2, r = Math.sqrt(hr(i, 2)) * R; g.fillStyle = hr(i, 3) > 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.12)'; g.fillRect(CX + Math.cos(a) * r, CY + Math.sin(a) * r, 1, 1); } g.restore();
  g.beginPath(); g.arc(CX, CY, 0.1 * R, 0, R2); g.fillStyle = '#1f8f4e'; g.fill(); g.beginPath(); g.arc(CX, CY, 0.05 * R, 0, R2); g.fillStyle = '#d7263d'; g.fill();
  // alambres
  g.strokeStyle = 'rgba(210,215,230,.85)'; g.lineWidth = 1; for (const r of [0.05, 0.1, 0.58, 0.65, 0.93, 1]) { g.beginPath(); g.arc(CX, CY, r * R, 0, R2); g.stroke(); }
  for (let i = 0; i < 20; i++) { const a = (i * 18 - 99) * Math.PI / 180; g.beginPath(); g.moveTo(CX + Math.cos(a) * R * 0.1, CY + Math.sin(a) * R * 0.1); g.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R); g.stroke(); }
  gr = g.createLinearGradient(CX - R, CY - R, CX + R, CY + R); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(CX, CY, R * 1.2, 0, R2); g.fill();
}
build(); reset();
k.show(CFG.title, 'Mantén pulsado para estabilizar la mira (el pulso se cansa si esperas mucho) y suelta para lanzar. 501: baja a 0 exacto y cierra con un doble (anillo exterior) o el bull. Si te pasas, el turno se anula. Teclado: flechas y mantener/soltar A.');
function release() { if (fly || turnT > 0) return; fly = { x: aim.x, y: aim.y, t: 0 }; k.sfx('jump'); }
function land() { const { x, y } = fly; fly = null; const [pts, lbl, dbl] = scoreAt(x, y); thrown.push({ x, y, a: 1, s: 0 }); darts++; turn.push(lbl);
  k.sfx(pts ? 'hit' : 'hurt'); k.shake(2); k.burst(x, y, pts >= 40 ? '#f2d15c' : '#fff', pts >= 40 ? 14 : 6, 70);
  if (left - pts < 0 || left - pts === 1 || (left - pts === 0 && !dbl)) { msg = '¡Pasado! Turno anulado'; msgC = '#ff9a9a'; msgT = 1.4; left = turnStart; navigator.vibrate && navigator.vibrate(60); turnT = 1.1; return; }
  left -= pts; msg = pts ? (pts >= 50 ? `¡${lbl}!` : lbl.startsWith('T') ? `¡Triple ${lbl.slice(1)}!` : lbl.startsWith('D') ? `Doble ${lbl.slice(1)}` : lbl) : 'Fuera'; msgC = pts >= 40 ? '#f2d15c' : '#fff'; msgT = 0.9; if (pts) k.float(`-${pts}`, x, y - 16, '#fff6a8');
  if (left === 0) { k.st = 'over'; k.confetti(); const sc = Math.max(1, 100 - darts), nr = NREC(sc), b = k.best(CFG.id, sc); k.show('¡Checkout!', `${nr}501 en ${darts} dardos · Récord ${b}<br>Toca para jugar otra vez`); return; }
  if (turn.length >= 3) turnT = 1; }
k.run((dt) => {
  t += dt; msgT -= dt; for (const d of thrown) d.s = Math.min(1, d.s + dt * 8); if (!k.gate(reset)) return;
  if (turnT > 0) { turnT -= dt; if (turnT < 0.4) for (const d of thrown) d.a = Math.max(0, turnT / 0.4); if (turnT <= 0) { total3.push(turnStart - left); turn = []; turnStart = left; thrown = []; } }
  if (fly) { fly.t += dt * 5; if (fly.t >= 1) land(); }
  const aDown = k.held.has('a'); if (k.held.has('left')) { aim.bx -= 120 * dt; kb = true; } if (k.held.has('right')) { aim.bx += 120 * dt; kb = true; } if (k.held.has('up')) { aim.by -= 120 * dt; kb = true; } if (k.held.has('down')) { aim.by += 120 * dt; kb = true; }
  hold = k.ptr.down || aDown; holdT = hold ? holdT + dt : 0;
  if (k.ptr.down) { aim.bx = k.ptr.x; aim.by = k.ptr.y - 80; }
  aim.bx = k.clamp(aim.bx, 20, 340); aim.by = k.clamp(aim.by, 90, 440);
  const fat = Math.max(0, holdT - 2.2) * 0.6, amp = 34 * (hold ? Math.min(1.3, 0.42 + fat) : 1);
  aim.x = aim.bx + Math.sin(t * 2.3) * amp + Math.sin(t * 5.1) * amp * 0.3; aim.y = aim.by + Math.cos(t * 1.9) * amp + Math.sin(t * 4.3) * amp * 0.3;
  if (k.ptr.up || (prevA && !aDown)) release(); prevA = aDown;
}, () => {
  c.drawImage(bgCv, 0, 0, W, H);
  for (const d of thrown) drawDart(d.x, d.y, 1 + (1 - d.s) * 0.6, d.a);
  if (fly) { const e = fly.t, x = 180 + (fly.x - 180) * e, y = 720 + (fly.y - 720) * e - Math.sin(e * Math.PI) * 60; drawDart(x, y, 2.4 - e * 1.4, 1); }
  // mira
  if (!fly && turnT <= 0) { const col = hold ? (holdT > 2.2 ? '#ff9a3d' : '#7cf7a0') : '#fff'; c.lineCap = 'round';
    for (const [lw, cl] of [[5, OUT], [2.5, col]]) { c.strokeStyle = cl; c.lineWidth = lw; c.beginPath(); c.arc(aim.x, aim.y, 11, 0, R2); c.moveTo(aim.x - 19, aim.y); c.lineTo(aim.x - 6, aim.y); c.moveTo(aim.x + 6, aim.y); c.lineTo(aim.x + 19, aim.y); c.moveTo(aim.x, aim.y - 19); c.lineTo(aim.x, aim.y - 6); c.moveTo(aim.x, aim.y + 6); c.lineTo(aim.x, aim.y + 19); c.stroke(); }
    c.fillStyle = col; c.beginPath(); c.arc(aim.x, aim.y, 2, 0, R2); c.fill();
    if (hold) { const p = Math.min(1, holdT / 2.2); c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.arc(aim.x, aim.y, 26, -Math.PI / 2, -Math.PI / 2 + R2 * p); c.stroke(); c.strokeStyle = col; c.lineWidth = 3; c.stroke(); }
    const [, lb] = scoreAt(aim.x, aim.y); label(lb, aim.x + 24, aim.y - 30, 12, '#fff6a8'); }
  // marcador tipo pizarra
  const y0 = 440; ART.rr(c, 10, y0, W - 20, 190, 12); ART.fillOut(c, '#6b4a2f', 3); ART.rr(c, 20, y0 + 10, W - 40, 170, 8); c.fillStyle = '#1f3a2e'; c.fill(); c.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 6; i++) c.fillRect(24 + i * 50, y0 + 14, 30, 160);
  label('QUEDAN', 36, y0 + 20, 11, 'rgba(230,240,230,.7)'); label(String(left), 36, y0 + 34, 50, left <= 170 && checkout(left, 3 - turn.length) ? '#f2d15c' : '#fff');
  const avg = total3.length ? Math.round(total3.reduce((a, b) => a + b, 0) / total3.length) : 0; label(`Dardos ${darts}`, W - 36, y0 + 22, 13, '#e6f0e6', 'right'); label(`Media ${avg}`, W - 36, y0 + 42, 13, 'rgba(230,240,230,.75)', 'right');
  for (let i = 0; i < 3; i++) { const x = 36 + i * 98, has = turn[i] !== undefined; ART.rr(c, x, y0 + 96, 90, 34, 8); c.fillStyle = has ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.2)'; c.fill(); c.strokeStyle = i === turn.length && turnT <= 0 ? '#f2d15c' : 'rgba(255,255,255,.2)'; c.lineWidth = 1.5; c.stroke();
    if (has) label(turn[i], x + 45, y0 + 103, 17, turn[i].startsWith('D') || turn[i] === 'Bull' ? '#7cf7a0' : turn[i].startsWith('T') ? '#ff8a9a' : '#fff', 'center'); else miniDart(x + 45, y0 + 113, i >= turn.length); }
  const co = turnT <= 0 && checkout(left, 3 - turn.length); label(co ? `Cierre: ${co.join(' · ')}` : left <= 170 ? 'Sin cierre este turno' : 'Toca y suelta para lanzar', W / 2, y0 + 146, 13, co ? '#f2d15c' : 'rgba(230,240,230,.6)', 'center');
  if (msgT > 0) { const e = Math.min(1, (0.9 - msgT) / 0.12), s = 0.6 + 0.4 * Math.min(1, e) + Math.sin(Math.min(1, e) * Math.PI) * 0.2; c.save(); c.translate(W / 2, 66); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, -14, 26, msgC, 'center'); c.restore(); c.globalAlpha = 1; }
});
/* Dardo clavado visto de frente-lado: punta en (x,y), barril metálico, varilla y plumas */
function drawDart(x, y, s, a) {
  if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s);
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-8, 16); c.stroke();
  c.strokeStyle = '#c7ccd8'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 0); c.lineTo(3, 5); c.stroke();
  c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.moveTo(3, 5); c.lineTo(8, 14); c.stroke(); c.strokeStyle = '#9aa2b5'; c.lineWidth = 4.5; c.stroke(); c.strokeStyle = '#eef0f6'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(3.5, 5.5); c.lineTo(7, 12); c.stroke();
  c.strokeStyle = OUT; c.lineWidth = 3.5; c.beginPath(); c.moveTo(8, 14); c.lineTo(12, 22); c.stroke(); c.strokeStyle = '#5ce1e6'; c.lineWidth = 1.8; c.stroke();
  for (const [dx, dy] of [[-6, 3], [6, -1]]) { c.beginPath(); c.moveTo(11, 19); c.lineTo(12 + dx, 22 + dy); c.lineTo(15, 30); c.closePath(); ART.fillOut(c, '#ff4d6d', 1.5); }
  c.beginPath(); c.moveTo(11, 19); c.lineTo(13, 31); c.lineTo(16, 29); c.closePath(); ART.fillOut(c, '#ff8fa6', 1.2); c.restore(); c.globalAlpha = 1;
}
function miniDart(x, y, on) { c.save(); c.globalAlpha = on ? 0.9 : 0.25; c.translate(x - 14, y); c.rotate(-0.1); c.strokeStyle = '#c7ccd8'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(8, 0); c.stroke(); c.strokeStyle = '#9aa2b5'; c.lineWidth = 5; c.beginPath(); c.moveTo(8, 0); c.lineTo(18, 0); c.stroke(); c.fillStyle = '#ff4d6d'; c.beginPath(); c.moveTo(20, 0); c.lineTo(30, -6); c.lineTo(28, 0); c.lineTo(30, 6); c.closePath(); c.fill(); c.restore(); c.globalAlpha = 1; }
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }

/* ¿la puntuación supera el récord guardado? (se consulta antes de que k.best lo actualice) */
function NREC(s) { let b = 0; try { b = +localStorage.getItem('best:' + CFG.id) || 0; } catch (e) {} if (s > b && s > 0) { k.confetti(); return '¡Nuevo récord! · '; } return ''; }
