/* Darts Pro con arte propio: 501 con cierre en doble o bull. El punto de mira oscila; mantén pulsado para estabilizar (sin pasarte: el pulso se cansa) y suelta para lanzar.
 * Teclado: flechas mueven la mira, mantén A para estabilizar y suelta para lanzar. Si te pasas, quedas en 1 o cierras sin doble, el turno se anula. */
/* CFG.mode 'cricket' → cricketGame() (al final del archivo); sin modo: 501 clásico. */
/* ---------- Ley de la pieza única (REMASTER §8) ----------
 * uni(): traza TODAS las partes y las rellena después, así los contornos interiores quedan
 * tapados y solo sobrevive el borde exterior de la silueta. inw(): detalle interior recortado
 * contra esa silueta. Las separaciones internas se leen por sombra propia o por cambio de
 * color, nunca por stroke. Una pieza solo se separa cuando se mueve de verdad. */
function uni(g, parts, ow) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = ART.OUT; g.lineWidth = ow * 2;
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
if (CFG.mode === 'cricket') cricketGame(); else {
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
  /* Dificultad seleccionable: k.D.spd = 1 en normal → la mira oscila exactamente igual que siempre. */
  const fat = Math.max(0, holdT - 3) * 0.5, amp = (19 + 10 * Math.min(1, darts / 22)) * (hold ? Math.min(1.3, 0.4 + fat) : 1) * k.D.spd; // 1.23: más fácil (oscilación 24–34 → 19–29, pulso firme 2,2→3 s)
  aim.x = aim.bx + Math.sin(t * 2.3) * amp + Math.sin(t * 5.1) * amp * 0.3; aim.y = aim.by + Math.cos(t * 1.9) * amp + Math.sin(t * 4.3) * amp * 0.3;
  if (k.ptr.up || (prevA && !aDown)) release(); prevA = aDown;
}, () => {
  c.drawImage(bgCv, 0, 0, W, H);
  for (const d of thrown) drawDart(d.x, d.y, 1 + (1 - d.s) * 0.6, d.a);
  if (fly) { const e = fly.t, x = 180 + (fly.x - 180) * e, y = 720 + (fly.y - 720) * e - Math.sin(e * Math.PI) * 60; drawDart(x, y, 2.4 - e * 1.4, 1); }
  // mira
  if (!fly && turnT <= 0) { const col = hold ? (holdT > 3 ? '#ff9a3d' : '#7cf7a0') : '#fff'; c.lineCap = 'round';
    for (const [lw, cl] of [[5, OUT], [2.5, col]]) { c.strokeStyle = cl; c.lineWidth = lw; c.beginPath(); c.arc(aim.x, aim.y, 11, 0, R2); c.moveTo(aim.x - 19, aim.y); c.lineTo(aim.x - 6, aim.y); c.moveTo(aim.x + 6, aim.y); c.lineTo(aim.x + 19, aim.y); c.moveTo(aim.x, aim.y - 19); c.lineTo(aim.x, aim.y - 6); c.moveTo(aim.x, aim.y + 6); c.lineTo(aim.x, aim.y + 19); c.stroke(); }
    c.fillStyle = col; c.beginPath(); c.arc(aim.x, aim.y, 2, 0, R2); c.fill();
    if (hold) { const p = Math.min(1, holdT / 3); c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.arc(aim.x, aim.y, 26, -Math.PI / 2, -Math.PI / 2 + R2 * p); c.stroke(); c.strokeStyle = col; c.lineWidth = 3; c.stroke(); }
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
  const punta = ply([[0, 0], [1.6, 3.4], [4.4, 6.2], [2.6, 7]]);
  const barril = bone([[3, 5], [8, 14]], [3.1, 2.4]);
  const varilla = bone([[8, 14], [12.2, 22.4]], [1.5, 1.3]);
  const plumas = ply([[5, 22], [11, 19], [16, 29], [13, 31.5], [9.6, 28], [6.4, 30.4]]);
  const PA = [[plumas, '#ff4d6d'], [varilla, '#5ce1e6'], [barril, '#9aa2b5'], [punta, '#c7ccd8']];
  uni(c, PA, 1.05);
  inw(c, all(PA.map((q) => q[0])), (q) => {
    q.fillStyle = 'rgba(255,255,255,.55)'; q.beginPath(); q.moveTo(3.6, 5.6); q.lineTo(5.2, 5.1); q.lineTo(9.2, 12.6); q.lineTo(7.6, 13.2); q.closePath(); q.fill();
    q.fillStyle = 'rgba(26,21,48,.22)'; q.beginPath(); q.moveTo(6.4, 7.4); q.lineTo(8, 6.9); q.lineTo(11.4, 13.6); q.lineTo(9.8, 14.2); q.closePath(); q.fill();
    q.fillStyle = '#ff8fa6'; q.beginPath(); q.moveTo(11, 19); q.lineTo(13, 31); q.lineTo(16, 29); q.closePath(); q.fill();
    q.fillStyle = 'rgba(26,21,48,.18)'; q.beginPath(); q.moveTo(11, 19); q.lineTo(9.6, 28); q.lineTo(6.4, 30.4); q.lineTo(5, 22); q.closePath(); q.fill(); });
  c.restore(); c.globalAlpha = 1;
}
function miniDart(x, y, on) { c.save(); c.globalAlpha = on ? 0.9 : 0.25; c.translate(x - 14, y); c.rotate(-0.1); c.strokeStyle = '#c7ccd8'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(8, 0); c.stroke(); c.strokeStyle = '#9aa2b5'; c.lineWidth = 5; c.beginPath(); c.moveTo(8, 0); c.lineTo(18, 0); c.stroke(); c.fillStyle = '#ff4d6d'; c.beginPath(); c.moveTo(20, 0); c.lineTo(30, -6); c.lineTo(28, 0); c.lineTo(30, 6); c.closePath(); c.fill(); c.restore(); c.globalAlpha = 1; }
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }

/* ¿la puntuación supera el récord guardado? (se consulta antes de que k.best lo actualice; mismo aviso que k.end) */
function NREC(s) { let b = 0; try { b = +localStorage.getItem(k.bkey(CFG.id)) || 0; } catch (e) {} if (s > b && b > 0) { k.confetti(); k.sfx('win'); return '<b style="color:#ffd166">¡Nuevo récord!</b><br>'; } return ''; }
}
/* ================= Dardos Cricket (CFG.mode 'cricket'): 1–4 jugadores, lienzo 800×450 =================
 * Reglas reales: solo cuentan 15–20 y la diana. Cada número se cierra con 3 marcas (sencillo 1, doble 2, triple 3;
 * diana exterior 1 y centro 2). Con el número cerrado, las marcas de más suman su valor si algún rival lo tiene abierto.
 * Gana quien cierra los 7 sin ir por detrás en puntos. Límite de rondas (20 a dos, 15 con más): gana quien más puntos.
 * Mira que oscila (mantener A la afina; el pulso se cansa a los 3 s). CPU: elige objetivo (cerrar o puntuar) y falla
 * según su nivel 'cpu:<id>'. */
function cricketGame() {
  const W = 800, H = 450, OUT = ART.OUT, R2 = 6.2832, CX = 236, CY = 236, R = 146, ID = CFG.id || 'dardos-cricket';
  const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1d1a26' }), c = k.ctx;
  const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5], NUMS = [20, 19, 18, 17, 16, 15, 25];
  const CNAME = ['roja', 'azul', 'amarilla', 'verde'];
  const clamp = k.clamp, gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(R2 * Math.random()); };
  let LV = 0; try { LV = clamp(+localStorage.getItem('cpu:' + ID) || 0, 0, 10); } catch (e) { /* sin almacenamiento */ }
  const lvD = () => clamp(LV + k.D.cpu * 2, -2, 12); // el nivel guardado no se toca: se suma al leerlo
  let seats = [], P = [], cur = 0, dartN = 0, round = 1, maxR = 20, thrown = [], turnLog = [], aim, t = 0, hold = false, holdT = 0, prevA = false, fly = null, turnT = 0, msg = '', msgT = 0, msgC = '#fff', cpu = null, bannerT = 0, winner = -1, endT = 0;
  const nPl = () => (k.party ? Math.max(2, ...k.party.map((q) => q.p + 1)) : 2);
  const nm = (i) => (seats[i].cpu ? 'CPU ' + CNAME[seats[i].p % 4] : String(seats[i].name).slice(0, 10));
  const pc = (i) => k.pcol(seats[i].p);
  k.onParty = () => { if (k.st !== 'play' || !P.length) reset(); else seats = k.players(P.length); };
  function reset() {
    const n = nPl(); seats = k.players(n); P = seats.map(() => ({ m: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 }, pts: 0, marks: 0 }));
    cur = 0; dartN = 0; round = 1; maxR = n > 2 ? 15 : 20; thrown = []; turnLog = []; t = 0; hold = false; holdT = 0; prevA = false; fly = null; turnT = 0; msg = ''; msgT = 0; cpu = null; bannerT = 1.2; winner = -1; endT = 0;
    aim = { x: CX, y: CY, bx: CX, by: CY - 40 };
  }
  /* ---------- diana ---------- */
  function scoreAt(x, y) {
    const dx = x - CX, dy = y - CY, d = Math.hypot(dx, dy) / R; if (d > 1) return { n: 0, m: 0, lb: 'Fuera' };
    if (d < 0.05) return { n: 25, m: 2, lb: 'Bull' }; if (d < 0.1) return { n: 25, m: 1, lb: '25' };
    const ang = (Math.atan2(dx, -dy) * 180 / Math.PI + 360 + 9) % 360, n = ORDER[Math.floor(ang / 18)];
    if (d > 0.58 && d < 0.65) return { n, m: 3, lb: 'T' + n }; if (d > 0.93) return { n, m: 2, lb: 'D' + n }; return { n, m: 1, lb: '' + n };
  }
  const segPt = (n, r) => { const a = ORDER.indexOf(n) * 18 * Math.PI / 180; return { x: CX + Math.sin(a) * r * R, y: CY - Math.cos(a) * r * R }; };
  const board = (() => {
    const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
    const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return v - Math.floor(v); };
    // pared de ladrillo en penumbra
    g.fillStyle = '#2a2233'; g.fillRect(0, 0, W, H);
    for (let r = 0; r < 20; r++) for (let i = 0; i < 18; i++) { const x = i * 50 - (r % 2) * 25, y = r * 24; g.fillStyle = ['#3b2b34', '#35262f', '#40303a'][(i + r * 2) % 3]; g.fillRect(x + 1, y + 1, 48, 22); g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(x + 1, y + 1, 48, 3); }
    let gr = g.createRadialGradient(CX, CY, 80, CX, CY, 520); gr.addColorStop(0, 'rgba(255,220,160,.2)'); gr.addColorStop(1, 'rgba(0,0,0,.65)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(CX + 8, CY + 12, R * 1.2, 0, R2); g.fill();
    g.beginPath(); g.arc(CX, CY, R * 1.2, 0, R2); ART.fillOut(g, '#15151c', 3); g.strokeStyle = '#3a3a48'; g.lineWidth = 3; g.beginPath(); g.arc(CX, CY, R * 1.16, 0, R2); g.stroke();
    for (let i = 0; i < 20; i++) {
      const a0 = (i * 18 - 99) * Math.PI / 180, a1 = a0 + Math.PI / 10, on = ORDER[i] >= 15;
      for (const [r0, r1, cols] of [[0.1, 0.58, ['#16161c', '#f1e4c2']], [0.58, 0.65, ['#d7263d', '#1f8f4e']], [0.65, 0.93, ['#16161c', '#f1e4c2']], [0.93, 1, ['#d7263d', '#1f8f4e']]]) { g.fillStyle = cols[i % 2]; g.beginPath(); g.arc(CX, CY, r1 * R, a0, a1); g.arc(CX, CY, r0 * R, a1, a0, true); g.closePath(); g.fill(); }
      if (!on) { g.fillStyle = 'rgba(12,10,20,.38)'; g.beginPath(); g.arc(CX, CY, R, a0, a1); g.arc(CX, CY, 0.1 * R, a1, a0, true); g.closePath(); g.fill(); }
      const am = a0 + Math.PI / 20; g.font = `900 ${on ? 18 : 14}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = on ? '#ffd166' : 'rgba(255,255,255,.55)'; g.fillText(ORDER[i], CX + Math.cos(am) * R * 1.095, CY + Math.sin(am) * R * 1.095 + 1);
    }
    g.save(); g.beginPath(); g.arc(CX, CY, R, 0, R2); g.clip(); for (let i = 0; i < 1100; i++) { const a = hr(i, 1) * R2, r = Math.sqrt(hr(i, 2)) * R; g.fillStyle = hr(i, 3) > 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.12)'; g.fillRect(CX + Math.cos(a) * r, CY + Math.sin(a) * r, 1, 1); } g.restore();
    g.beginPath(); g.arc(CX, CY, 0.1 * R, 0, R2); g.fillStyle = '#1f8f4e'; g.fill(); g.beginPath(); g.arc(CX, CY, 0.05 * R, 0, R2); g.fillStyle = '#d7263d'; g.fill();
    g.strokeStyle = 'rgba(210,215,230,.85)'; g.lineWidth = 1; for (const r of [0.05, 0.1, 0.58, 0.65, 0.93, 1]) { g.beginPath(); g.arc(CX, CY, r * R, 0, R2); g.stroke(); }
    for (let i = 0; i < 20; i++) { const a = (i * 18 - 99) * Math.PI / 180; g.beginPath(); g.moveTo(CX + Math.cos(a) * R * 0.1, CY + Math.sin(a) * R * 0.1); g.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R); g.stroke(); }
    gr = g.createLinearGradient(CX - R, CY - R, CX + R, CY + R); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(CX, CY, R * 1.2, 0, R2); g.fill();
    // pizarra (marco de madera + fondo verde con restos de tiza)
    ART.rr(g, 446, 8, 346, 392, 14); ART.fillOut(g, '#6b4a2f', 3); ART.rr(g, 456, 18, 326, 372, 8); g.fillStyle = '#1f3a2e'; g.fill();
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,255,255,${0.02 + hr(i, 7) * 0.04})`; g.lineWidth = 6 + hr(i, 8) * 10; g.beginPath(); const x = 470 + hr(i, 9) * 290, y = 30 + hr(i, 10) * 340; g.moveTo(x, y); g.quadraticCurveTo(x + 30, y - 8, x + 60, y + 4); g.stroke(); }
    return cv;
  })();
  /* ---------- reglas ---------- */
  const closed = (i, n) => P[i].m[n] >= 3;
  const allClosed = (n) => P.every((q, i) => closed(i, n));
  function apply(i, s) {
    if (!s.m || NUMS.indexOf(s.n) < 0) return { add: 0, pts: 0 };
    const q = P[i], before = q.m[s.n], take = Math.min(s.m, Math.max(0, 3 - before)), extra = s.m - take; q.m[s.n] = Math.min(3, before + s.m); q.marks += s.m;
    let pts = 0; if (extra > 0 && P.some((o, j) => j !== i && !closed(j, s.n))) { pts = extra * s.n; q.pts += pts; }
    return { add: s.m, pts, close: before < 3 && q.m[s.n] >= 3 };
  }
  function checkWin(i) { const q = P[i]; if (!NUMS.every((n) => q.m[n] >= 3)) return false; return P.every((o) => o.pts <= q.pts); }
  /* ---------- CPU ---------- */
  function cpuTarget(i) {
    const q = P[i], lead = P.every((o, j) => j === i || o.pts <= q.pts);
    // si va por detrás y tiene un número cerrado que otro tiene abierto: puntuar ahí (el más alto)
    if (!lead) for (const n of NUMS) if (n !== 25 && closed(i, n) && P.some((o, j) => j !== i && !closed(j, n))) return n;
    for (const n of NUMS) if (!closed(i, n)) return n;
    for (const n of NUMS) if (P.some((o, j) => j !== i && !closed(j, n))) return n;
    return 20;
  }
  function cpuStart() {
    const n = cpuTarget(cur), sig = R * Math.max(0.07, 0.19 - lvD() * 0.011);
    let p; if (n === 25) p = { x: CX, y: CY }; else p = segPt(n, LV >= 3 || Math.random() < 0.35 ? 0.615 : 0.78);
    cpu = { tx: p.x + gauss() * sig, ty: p.y + gauss() * sig, t: 0, dur: 0.75 + Math.random() * 0.35 };
  }
  /* ---------- turno ---------- */
  function throwDart() { if (fly || turnT > 0 || bannerT > 0) return; fly = { x: aim.x, y: aim.y, t: 0 }; k.sfx('jump'); }
  function land() {
    const { x, y } = fly; fly = null; const s = scoreAt(x, y), r = apply(cur, s); thrown.push({ x, y, a: 1, s: 0 }); dartN++;
    const valid = r.add > 0; turnLog.push({ lb: s.lb, ok: valid, pts: r.pts });
    k.sfx(valid ? (r.close ? 'coin' : 'hit') : 'hurt'); k.shake(2); k.burst(x, y, valid ? pc(cur) : '#fff', valid ? 12 : 5, 70);
    if (r.pts) k.float('+' + r.pts, x, y - 18, '#fff6a8');
    msg = !s.m ? 'Fuera' : !valid ? `${s.lb}: no cuenta` : r.close ? `¡${s.n === 25 ? 'Diana' : s.n} cerrado!` : s.m === 3 ? `¡Triple ${s.n}!` : s.m === 2 ? (s.n === 25 ? '¡Bull!' : `Doble ${s.n}`) : `${s.lb}`;
    msgC = !valid ? '#ff9a9a' : r.close ? '#7cf7a0' : '#fff'; msgT = 1;
    if (checkWin(cur)) { winner = cur; endT = 1.2; return; }
    if (dartN >= 3) turnT = 1.1; else if (seats[cur].cpu) cpuStart();
  }
  function nextTurn() {
    thrown = []; turnLog = []; dartN = 0; cur = (cur + 1) % P.length; if (cur === 0) round++;
    if (round > maxR) { winner = -2; endT = 0.4; return; }
    bannerT = 1.1; cpu = null; hold = false; holdT = 0; prevA = true;
    aim.bx = CX; aim.by = CY - 40;
  }
  function finish() {
    k.st = 'over'; const rows = P.map((q, i) => ({ i, p: seats[i].p, score: q.pts, name: nm(i), mk: q.marks }));
    let w = winner; if (w < 0) { rows.sort((a, b) => b.score - a.score || b.mk - a.mk); w = rows[0].i; }
    const ord = [rows.find((r) => r.i === w)].concat(rows.filter((r) => r.i !== w).sort((a, b) => b.score - a.score));
    const hum = seats.filter((q) => !q.cpu); if (hum.length === 1) { LV = clamp(LV + (!seats[w].cpu ? 0.5 : -0.5), 0, 10); try { localStorage.setItem('cpu:' + ID, LV); } catch (e) { /* sin almacenamiento */ } }
    k.podium(ord.map((r) => ({ p: r.p, score: r.score, name: r.name })), { noTie: true, head: `¡Gana ${nm(w)}!`, fmt: (v) => v + ' pts' });
  }
  /* ---------- bucle ---------- */
  function update(dt) {
    t += dt; msgT -= dt; for (const d of thrown) d.s = Math.min(1, d.s + dt * 8);
    if (!k.gate(reset)) return;
    if (endT > 0) { endT -= dt; if (endT <= 0) finish(); return; }
    if (bannerT > 0) { bannerT -= dt; if (seats[cur].cpu && bannerT <= 0) cpuStart(); return; }
    if (turnT > 0) { turnT -= dt; if (turnT < 0.4) for (const d of thrown) d.a = Math.max(0, turnT / 0.4); if (turnT <= 0) nextTurn(); return; }
    if (fly) { fly.t += dt * 5; if (fly.t >= 1) land(); return; }
    const hu = !seats[cur].cpu, p = seats[cur].p, local = hu && !k.party && p === 0;
    let aDown = false;
    if (hu) {
      const d = k.pdir(p); aim.bx += d.x * 130 * dt; aim.by += d.y * 130 * dt; aDown = k.pheld(p, 'a');
      if (local && k.ptr.down) { aim.bx = k.ptr.x; aim.by = k.ptr.y - 70; }
      hold = aDown || (local && k.ptr.down);
    } else if (cpu) {
      cpu.t += dt; const e = Math.min(1, cpu.t / cpu.dur); aim.bx += (cpu.tx - aim.bx) * Math.min(1, dt * 6); aim.by += (cpu.ty - aim.by) * Math.min(1, dt * 6); hold = e > 0.4;
    }
    aim.bx = clamp(aim.bx, CX - R * 1.25, CX + R * 1.25); aim.by = clamp(aim.by, CY - R * 1.25, CY + R * 1.25);
    holdT = hold ? holdT + dt : 0;
    const fat = Math.max(0, holdT - 3) * 0.5, amp = (20 + 8 * Math.min(1, round / 12)) * (hold ? Math.min(1.3, 0.4 + fat) : 1) * (seats[cur].cpu ? 0.25 : k.D.spd);
    aim.x = aim.bx + Math.sin(t * 2.3) * amp + Math.sin(t * 5.1) * amp * 0.3; aim.y = aim.by + Math.cos(t * 1.9) * amp + Math.sin(t * 4.3) * amp * 0.3;
    if (hu) { if ((local && k.ptr.up && !k._skipUp) || (prevA && !aDown)) throwDart(); prevA = aDown; }
    else if (cpu && cpu.t >= cpu.dur) { cpu = null; throwDart(); }
  }
  /* ---------- dibujo ---------- */
  function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
  function chalk(s, x, y, size, col, align) { c.font = `700 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.fillStyle = col || 'rgba(240,245,235,.92)'; c.fillText(s, x, y); }
  function markDraw(x, y, n, col) {
    c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
    if (n >= 1) { c.moveTo(x - 8, y + 8); c.lineTo(x + 8, y - 8); } if (n >= 2) { c.moveTo(x - 8, y - 8); c.lineTo(x + 8, y + 8); } c.stroke();
    if (n >= 3) { c.beginPath(); c.arc(x, y, 12, 0, R2); c.stroke(); }
  }
  function drawDart(x, y, s, a) {
    if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s);
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-8, 16); c.stroke();
    c.strokeStyle = '#c7ccd8'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 0); c.lineTo(3, 5); c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.moveTo(3, 5); c.lineTo(8, 14); c.stroke(); c.strokeStyle = '#9aa2b5'; c.lineWidth = 4.5; c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 3.5; c.beginPath(); c.moveTo(8, 14); c.lineTo(12, 22); c.stroke(); c.strokeStyle = '#eef0f6'; c.lineWidth = 1.8; c.stroke();
    const fc = d.col || '#ff4d6d';
    { const plumas = ply([[5, 22], [11, 19], [16, 29], [13, 31.5], [9.6, 28], [6.4, 30.4]]);
      uni(c, [[plumas, fc]], 1.05);
      inw(c, plumas, (q) => { q.fillStyle = ART.lite(fc, 0.35); q.beginPath(); q.moveTo(11, 19); q.lineTo(13, 31); q.lineTo(16, 29); q.closePath(); q.fill();
        q.fillStyle = 'rgba(26,21,48,.18)'; q.beginPath(); q.moveTo(11, 19); q.lineTo(9.6, 28); q.lineTo(6.4, 30.4); q.lineTo(5, 22); q.closePath(); q.fill(); }); }
    c.restore(); c.globalAlpha = 1;
  }
  const d = { col: '#ff4d6d' };
  function draw() {
    c.drawImage(board, 0, 0, W, H);
    const ccol = P.length ? pc(cur) : '#ff4d6d'; d.col = ccol;
    for (const q of thrown) drawDart(q.x, q.y, 1 + (1 - q.s) * 0.6, q.a);
    if (fly) { const e = fly.t, x = CX + (fly.x - CX) * e, y = 520 + (fly.y - 520) * e - Math.sin(e * Math.PI) * 60; drawDart(x, y, 2.4 - e * 1.4, 1); }
    // mira
    if (k.st === 'play' && !fly && turnT <= 0 && bannerT <= 0 && endT <= 0 && aim) {
      const col = hold ? (holdT > 3 ? '#ff9a3d' : '#7cf7a0') : '#fff'; c.lineCap = 'round';
      for (const [lw, cl] of [[5, OUT], [2.5, col]]) { c.strokeStyle = cl; c.lineWidth = lw; c.beginPath(); c.arc(aim.x, aim.y, 11, 0, R2); c.moveTo(aim.x - 19, aim.y); c.lineTo(aim.x - 6, aim.y); c.moveTo(aim.x + 6, aim.y); c.lineTo(aim.x + 19, aim.y); c.moveTo(aim.x, aim.y - 19); c.lineTo(aim.x, aim.y - 6); c.moveTo(aim.x, aim.y + 6); c.lineTo(aim.x, aim.y + 19); c.stroke(); }
      c.fillStyle = ccol; c.beginPath(); c.arc(aim.x, aim.y, 3, 0, R2); c.fill();
      if (hold && !seats[cur].cpu) { const p = Math.min(1, holdT / 3); c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.arc(aim.x, aim.y, 26, -Math.PI / 2, -Math.PI / 2 + R2 * p); c.stroke(); c.strokeStyle = col; c.lineWidth = 3; c.stroke(); }
      const s = scoreAt(aim.x, aim.y); if (s.lb) label(s.lb, aim.x + 24, aim.y - 26, 13, NUMS.indexOf(s.n) >= 0 ? '#fff6a8' : '#b9b3cc');
    }
    // cabecera: turno y ronda
    if (P.length) {
      ART.rr(c, 12, 10, 200, 32, 10); ART.fillOut(c, 'rgba(26,21,48,.9)', 2.5); c.fillStyle = ccol; ART.rr(c, 16, 14, 6, 24, 3); c.fill();
      label(nm(cur), 30, 26, 16, ccol); label(`Ronda ${Math.min(round, maxR)}/${maxR}`, 206, 26, 12, '#c9c3ff', 'right');
      // dardos del turno
      for (let i = 0; i < 3; i++) { const x = 20 + i * 70, y = 412, L = turnLog[i]; ART.rr(c, x, y, 62, 28, 8); ART.fillOut(c, L ? 'rgba(40,34,70,.95)' : 'rgba(20,16,36,.8)', 2);
        if (L) label(L.lb, x + 31, y + 14, 14, L.ok ? (L.pts ? '#fff6a8' : '#7cf7a0') : '#8a86a5', 'center');
        else { c.fillStyle = i === dartN && turnT <= 0 ? ccol : 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(x + 31, y + 14, 5, 0, R2); c.fill(); } }
    }
    // pizarra
    const n = P.length || 2, X0 = 520, CWID = (776 - X0) / n, RY = 94, RH = 40;
    chalk('CRICKET', 488, 36, 13, 'rgba(240,245,235,.6)');
    for (let i = 0; i < n && P.length; i++) {
      const x = X0 + CWID * i + CWID / 2, on = i === cur;
      if (on) { c.fillStyle = ART.alpha ? ART.alpha(pc(i), 0.16) : 'rgba(255,255,255,.1)'; c.fillRect(X0 + CWID * i + 2, 22, CWID - 4, 364); }
      chalk(nm(i).slice(0, CWID > 100 ? 10 : 6), x, 34, CWID > 100 ? 15 : 12, pc(i));
      chalk(String(P[i].pts), x, 62, 22);
    }
    c.strokeStyle = 'rgba(240,245,235,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(466, 78); c.lineTo(772, 78); c.moveTo(X0 - 6, 24); c.lineTo(X0 - 6, 380); c.stroke();
    NUMS.forEach((num, r) => {
      const y = RY + r * RH + 10, dead = P.length && allClosed(num);
      chalk(num === 25 ? 'D' : String(num), 488, y, 22, dead ? 'rgba(240,245,235,.3)' : '#ffe9a8');
      for (let i = 0; i < P.length; i++) markDraw(X0 + CWID * i + CWID / 2, y, P[i].m[num], dead ? 'rgba(240,245,235,.35)' : 'rgba(240,245,235,.92)');
      if (dead) { c.strokeStyle = 'rgba(240,245,235,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(470, y); c.lineTo(772, y); c.stroke(); }
    });
    if (msgT > 0) { const e = Math.min(1, (1 - msgT) / 0.12), s = 0.6 + 0.4 * Math.min(1, e); c.save(); c.translate(CX, 70); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, 0, 24, msgC, 'center'); c.restore(); c.globalAlpha = 1; }
    if (k.st === 'play' && bannerT > 0 && P.length) { const a = Math.min(1, bannerT / 0.25); c.globalAlpha = a; ART.rr(c, CX - 130, CY - 34, 260, 68, 16); ART.fillOut(c, 'rgba(26,21,48,.94)', 3); label('Turno de ' + nm(cur), CX, CY - 8, 22, ccol, 'center'); label(seats[cur].cpu ? 'La CPU apunta…' : 'Mantén A para afinar y suelta', CX, CY + 18, 13, '#c9c3ff', 'center'); c.globalAlpha = 1; }
  }
  window.__cr = { get P() { return P; }, get cur() { return cur; }, get round() { return round; }, get seats() { return seats; }, get aim() { return aim; }, set LV(v) { LV = v; } };
  reset();
  k.show(CFG.title || 'Dardos Cricket', 'Cierra el 15, 16, 17, 18, 19, 20 y la diana con tres marcas (doble = 2, triple = 3). Con un número cerrado, lo que sigas metiendo ahí suma puntos mientras un rival lo tenga abierto. Gana quien cierra todo sin ir por detrás. Mueve la mira, mantén A (o el dedo) para afinar el pulso y suelta para lanzar.<br>Toca para jugar');
  k.run(update, draw);
}
