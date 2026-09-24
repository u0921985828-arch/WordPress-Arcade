/* Home Run Derby: toca para batear en el momento justo. 10 eliminaciones (outs).
 * Estadio nocturno cacheado, lanzador con impulso, bateador con swing animado, bola con estela y fuegos al jonrón. */
const OUT = ART.OUT, R2 = 6.2832;
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#0b1238' }), c = k.ctx;
const PY = 292, ZY = 552, WALL = 206, HX = 150, HY = 548, BAT = 92;
let ball, swing, outs, hrs, total, msg, msgT, msgD = 1, msgC, wait, hit, pitchN, trail, streak, fw, tm, outMarks;
/* dificultad por lanzamiento: d 0→1 en 30 lanzamientos. Velocidad media 0,78→1,65 (antes 1,2→1,8 al 10.º), la variación y el efecto crecen con d */
function pitch() { pitchN++; const d = Math.min(1, (pitchN - 1) / 45), /* 1.23: más fácil (rampa 30→45 lanzamientos, velocidad 0,78–1,65 → 0,62–1,40) */ e = d * d * (3 - 2 * d) * 0.6 + d * 0.4; const sp = (0.62 + 0.78 * e) * (1 + k.rnd(-1, 1) * (0.04 + 0.2 * e)); const curve = k.rnd(-40, 40) * Math.min(1, (pitchN - 1) / 18); ball = { t: 0, sp, curve, x: 180, y: PY, s: 0.3, live: true, spin: 0 }; swing = 0; hit = null; trail = []; k.sfx('click'); }
function reset() { outs = 0; hrs = 0; total = 0; msg = ''; msgT = 0; msgC = '#fff'; wait = 1.2; pitchN = 0; ball = null; hit = null; swing = 0; trail = []; streak = 0; fw = []; tm = 0; outMarks = []; }
reset(); k.show(CFG.title, 'Toca (o pulsa A) para batear cuando la bola entre en la zona de strike. Buen momento = jonrón. 10 eliminaciones y se acaba.');
function say(s, col, d) { msg = s; msgC = col; msgT = msgD = d || 1.2; }
function out(s) { outs++; outMarks.push(0); streak = 0; say(s, '#ff8a7a', 1); }

/* ---------- estadio cacheado */
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const BG = off(360, 640, (g) => {
  let gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, '#070b2a'); gr.addColorStop(1, '#2d4591'); g.fillStyle = gr; g.fillRect(0, 0, 360, 200);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd(i) * 0.6})`; g.fillRect(rnd(i + 3) * 360, rnd(i + 7) * 90, 1.5, 1.5); }
  // gradas curvas con público
  g.beginPath(); g.moveTo(0, 212); g.lineTo(0, 120); g.quadraticCurveTo(180, 82, 360, 120); g.lineTo(360, 212); g.closePath(); g.fillStyle = '#29254a'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
  const CR = ['#ff5f7a', '#f2d15c', '#5ce1e6', '#ffffff', '#b98cff', '#ff9a3c', '#7cf7a0'];
  for (let row = 0; row < 7; row++) for (let i = 0; i < 44; i++) { const x = 4 + i * 8.2 + (row % 2) * 4, top = 120 - Math.sin(x / 360 * Math.PI) * 38 * (1 - row / 9); const y = top + 8 + row * 11; if (y > 200) continue; g.fillStyle = CR[Math.floor(rnd(row * 50 + i) * 7)]; g.globalAlpha = 0.55 + rnd(i * 3 + row) * 0.35; g.beginPath(); g.arc(x, y, 2.6, 0, R2); g.fill(); g.fillRect(x - 2.6, y + 2, 5.2, 4); }
  g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.25)'; for (let row = 1; row < 7; row++) g.fillRect(0, 133 + row * 11, 360, 1.5);
  // torres de luz
  for (const x of [26, 334]) { g.fillStyle = '#39406a'; g.fillRect(x - 3, 40, 6, 90); g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(x - 3, 40, 6, 90);
    const rg = g.createRadialGradient(x, 34, 2, x, 34, 60); rg.addColorStop(0, 'rgba(255,250,210,.55)'); rg.addColorStop(1, 'rgba(255,250,210,0)'); g.fillStyle = rg; g.fillRect(x - 60, 0, 120, 100);
    ART.rr(g, x - 17, 22, 34, 20, 3); ART.fillOut(g, '#4a5180', 2); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(x - 11 + i * 7.3, 28 + j * 8, 2.6, 0, R2); g.fill(); } }
  // césped a franjas
  gr = g.createLinearGradient(0, WALL, 0, 640); gr.addColorStop(0, '#2f8f47'); gr.addColorStop(1, '#1f6e37'); g.fillStyle = gr; g.fillRect(0, WALL, 360, 434);
  for (let i = 0, y = WALL; y < 640; i++) { const h = 10 + i * 5; if (i % 2) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, y, 360, h); } y += h; }
  // valla del fondo
  g.fillStyle = '#1d5a3a'; g.fillRect(0, WALL - 14, 360, 16); g.fillStyle = '#f2d15c'; g.fillRect(0, WALL - 16, 360, 3); g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(-2, WALL - 16, 364, 18);
  g.font = '800 9px ui-rounded,system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; [[40, '100'], [180, '120'], [320, '100']].forEach(([x, s]) => g.fillText(s, x, WALL - 4));
  // tierra del cuadro
  g.beginPath(); g.moveTo(180, 610); g.lineTo(340, 420); g.quadraticCurveTo(180, 205, 20, 420); g.closePath(); g.fillStyle = '#c28a55'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(26,21,48,.5)'; g.stroke();
  g.beginPath(); g.moveTo(180, 560); g.lineTo(282, 400); g.lineTo(180, 268); g.lineTo(78, 400); g.closePath(); gr = g.createLinearGradient(0, 268, 0, 560); gr.addColorStop(0, '#2c8a45'); gr.addColorStop(1, '#23753a'); g.fillStyle = gr; g.fill();
  // líneas de foul
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(180, 600); g.lineTo(360, 330); g.moveTo(180, 600); g.lineTo(0, 330); g.stroke();
  // montículo
  g.beginPath(); g.ellipse(180, PY + 14, 30, 11, 0, 0, R2); g.fillStyle = '#c99762'; g.fill(); g.strokeStyle = 'rgba(26,21,48,.5)'; g.stroke(); g.fillStyle = '#fff'; g.fillRect(172, PY + 10, 16, 3);
  // bases
  for (const [x, y] of [[282, 400], [180, 262], [78, 400]]) { g.save(); g.translate(x, y); g.scale(1, 0.55); g.rotate(Math.PI / 4); g.fillStyle = '#fff'; g.fillRect(-6, -6, 12, 12); g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(-6, -6, 12, 12); g.restore(); }
  // zona de bateo: tierra, cajas del bateador y home
  g.beginPath(); g.ellipse(180, 600, 90, 34, 0, 0, R2); g.fillStyle = '#c28a55'; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.strokeRect(112, 578, 42, 50); g.strokeRect(206, 578, 42, 50);
  g.beginPath(); g.moveTo(166, 594); g.lineTo(194, 594); g.lineTo(194, 602); g.lineTo(180, 612); g.lineTo(166, 602); g.closePath(); ART.fillOut(g, '#fff', 2);
});

/* ---------- personajes */
function pitcher() {
  const wind = !ball && !hit && wait < 0.6 ? 1 - wait / 0.6 : 0, rel = ball && ball.t < 0.12 ? 1 - ball.t / 0.12 : 0;
  c.save(); c.translate(180, PY + 8); c.scale(0.62, 0.62);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 4, 20, 6, 0, 0, R2); c.fill();
  const lift = wind * 10; ART.rr(c, -11, -26 - lift * 0.5, 9, 26 - lift * 0.3, 3); ART.fillOut(c, '#e8e8f0', 2.5); ART.rr(c, 2, -26, 9, 26, 3); ART.fillOut(c, '#e8e8f0', 2.5);
  ART.rr(c, -15, -58, 30, 34, 8); ART.fillOut(c, '#f4f4f8'); c.fillStyle = '#e24b5b'; c.fillRect(-13, -44, 26, 4);
  // brazo de lanzar
  const a = rel ? -0.3 + (1 - rel) * 1.2 : -2.6 * wind - 0.3; c.save(); c.translate(12, -52); c.rotate(a); ART.rr(c, -3, -3, 22, 7, 3); ART.fillOut(c, '#ffd1a3', 2); c.restore();
  c.beginPath(); c.arc(-16, -40, 8, 0, R2); ART.fillOut(c, '#8a5a33', 2); // guante
  c.beginPath(); c.arc(0, -68, 11, 0, R2); ART.fillOut(c, '#ffd1a3');
  c.beginPath(); c.arc(0, -71, 11.5, Math.PI, 0); c.lineTo(15, -71); c.lineTo(-11.5, -71); ART.fillOut(c, '#e24b5b', 2);
  c.fillStyle = OUT; c.beginPath(); c.arc(-4, -66, 1.8, 0, R2); c.arc(4, -66, 1.8, 0, R2); c.fill();
  c.restore();
}
function batAngle() { if (swing <= 0) return -1.95 + Math.sin(tm * 3) * 0.05; const p = 1 - swing / 0.3; return p < 0.55 ? -1.95 + Math.pow(p / 0.55, 1.6) * 2.35 : 0.4 + (p - 0.55) * 0.6; }
function batter() {
  const a = batAngle(), tw = swing > 0 ? Math.min(1, (1 - swing / 0.3) * 1.6) : 0;
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(118, 628, 34, 9, 0, 0, R2); c.fill();
  // piernas
  ART.rr(c, 96, 578, 15, 48, 6); ART.fillOut(c, '#e8e8f0'); ART.rr(c, 122, 578, 15, 48, 6); ART.fillOut(c, '#e8e8f0');
  ART.rr(c, 92, 618, 22, 10, 4); ART.fillOut(c, '#2a2342', 2); ART.rr(c, 120, 618, 22, 10, 4); ART.fillOut(c, '#2a2342', 2);
  // cuerpo (de espaldas) con giro
  c.save(); c.translate(117, 560); c.scale(1 - tw * 0.12, 1); ART.rr(c, -24, -28, 48, 50, 14); ART.fillOut(c, '#3056c9', 3);
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-18, -22, 6, 36);
  c.font = '900 22px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 4; c.strokeStyle = OUT; c.strokeText('7', 2, -2); c.fillStyle = '#fff'; c.fillText('7', 2, -2); c.restore();
  // bate
  c.save(); c.translate(HX, HY); c.rotate(a); c.beginPath(); c.moveTo(-6, -3.5); c.lineTo(BAT * 0.55, -4.5); c.quadraticCurveTo(BAT, -8, BAT + 2, 0); c.quadraticCurveTo(BAT, 8, BAT * 0.55, 4.5); c.lineTo(-6, 3.5); c.closePath(); ART.fillOut(c, '#d9a066', 2.5);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(BAT * 0.35, -3, BAT * 0.5, 2); c.fillStyle = '#2a2342'; c.fillRect(-6, -4, 14, 8); c.restore();
  if (swing > 0 && swing < 0.26) { c.globalAlpha = 0.25; c.strokeStyle = '#fff'; c.lineWidth = 10; c.beginPath(); c.arc(HX, HY, BAT * 0.8, a - 0.9, a); c.stroke(); c.globalAlpha = 1; }
  // brazos y casco
  c.strokeStyle = OUT; c.lineCap = 'round'; c.lineWidth = 11; c.beginPath(); c.moveTo(104, 548); c.lineTo(HX - 4, HY); c.moveTo(132, 546); c.lineTo(HX, HY + 2); c.stroke();
  c.strokeStyle = '#3056c9'; c.lineWidth = 6.5; c.stroke(); c.beginPath(); c.arc(HX, HY, 6, 0, R2); ART.fillOut(c, '#f4f4f8', 2);
  c.beginPath(); c.arc(116, 522, 17, 0, R2); ART.fillOut(c, '#223c99', 3); c.beginPath(); c.ellipse(132, 530, 9, 4, 0.3, 0, R2); ART.fillOut(c, '#223c99', 2);
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(109, 514, 5, 7, -0.5, 0, R2); c.fill();
}
function baseball(x, y, r, spin) {
  c.beginPath(); c.arc(x, y, r, 0, R2); ART.fillOut(c, '#fbfbf5', Math.max(1.2, r * 0.25));
  if (r > 4) { c.strokeStyle = '#e24b5b'; c.lineWidth = Math.max(1, r * 0.14); const o = Math.sin(spin) * r * 0.35; c.beginPath(); c.arc(x - r * 1.05 + o, y, r * 0.75, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(x + r * 1.05 + o, y, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); }
}
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function hitPos(h) { const e = Math.min(1, h.t / 1.4), ly = 560 - h.dist / 110 * (560 - WALL); const x = h.x0 + (180 + Math.sin(h.ang) * h.dist * 1.6 - h.x0) * e, y = h.y0 + (ly - h.y0) * e - Math.sin(e * Math.PI) * (60 + h.dist * 1.1); return [x, y, e, ly]; }

k.run((dt) => {
  msgT -= dt; tm += dt; outMarks = outMarks.map((m) => Math.min(1, m + dt * 4));
  for (const f of fw) f.t -= dt; fw = fw.filter((f) => f.t > 0);
  if (!k.gate(reset)) return;
  if (swing > 0) swing -= dt;
  if (outs >= 10 && !ball && msgT < 0.2) return k.lose(CFG.id, hrs, 'Fin del Derby', `${hrs} jonrones · ${total} m`);
  if (!ball) { wait -= dt; if (wait <= 0) pitch(); return; }
  if (hit) { hit.t += dt; const [x, y] = hitPos(hit); trail.push([x, y]); if (trail.length > 14) trail.shift();
    if (hit.hr && hit.t > 1 && !hit.boom) { hit.boom = 1; for (let i = 0; i < 3; i++) fw.push({ x: k.rnd(60, 300), y: k.rnd(40, 120), t: 0.9 + i * 0.25, d: i * 0.25, col: k.pick(['#f2d15c', '#ff5fa2', '#5ce1e6', '#7cf7a0']) }); }
    for (const f of fw) if (!f.done && f.t <= 0.9) { f.done = 1; k.burst(f.x, f.y, f.col, 26, 150); k.sfx('pop'); }
    if (hit.t > 1.9) { ball = null; wait = 1; } return; }
  ball.t += dt * ball.sp; ball.spin += dt * 20; const e = ball.t; ball.y = PY + e * (ZY - PY) / 0.93; ball.s = 0.3 + e * 0.7; ball.x = 180 + Math.sin(e * 3) * ball.curve * e;
  trail.push([ball.x, ball.y]); if (trail.length > 6) trail.shift();
  if ((k.ptr.hit || k.hit.has('a')) && swing <= 0) { swing = 0.3; k.sfx('jump'); const off = e - 0.93;
    if (Math.abs(off) < 0.14 && Math.abs(ball.x - 180) < 66) { const q = 1 - Math.abs(off) / 0.14; const dist = Math.round(60 + q * 110 + k.rnd(-8, 8)); const ang = k.clamp(off * 6 + (ball.x - 180) / 120, -0.8, 0.8);
      hit = { t: 0, dist, ang, x0: ball.x, y0: ball.y, hr: dist >= 110 }; trail = []; k.sfx('hit'); k.shake(q > 0.7 ? 6 : 3); k.burst(ball.x, ball.y, '#fff', 10, 200);
      if (hit.hr) { hrs++; total += dist; streak++; k.sfx('win'); k.confetti(); k.flash('rgba(255,250,200,.35)'); say(streak > 1 ? `¡JONRÓN x${streak}!` : '¡JONRÓN!', '#fff27a', 1.8); navigator.vibrate && navigator.vibrate(40); }
      else { outs++; outMarks.push(0); streak = 0; say(`Atrapada · ${dist} m`, '#ffd08a', 1.5); } }
    else out(off < 0 ? 'Demasiado pronto' : 'Demasiado tarde'); }
  if (e > 1.15 && !hit) { if (swing <= 0) out('¡Strike!'); ball = null; wait = 1; }
}, () => {
  c.drawImage(BG, 0, 0, 360, 640);
  for (const f of fw) if (f.t < 0.9) { const p = 1 - f.t / 0.9; c.globalAlpha = 1 - p; c.strokeStyle = f.col; c.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * R2, r = 10 + p * 46; c.beginPath(); c.moveTo(f.x + Math.cos(a) * r * 0.6, f.y + Math.sin(a) * r * 0.6); c.lineTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r); c.stroke(); } c.globalAlpha = 1; }
  pitcher();
  // zona de strike (se ilumina cuando se puede batear)
  const inWin = ball && !hit && Math.abs(ball.t - 0.93) < 0.12; c.lineWidth = 2.5; c.strokeStyle = inWin ? 'rgba(255,242,122,.95)' : 'rgba(255,255,255,.35)'; c.setLineDash([7, 5]); ART.rr(c, 145, ZY - 32, 70, 64, 8); c.stroke(); c.setLineDash([]);
  if (inWin) { c.fillStyle = 'rgba(255,242,122,.12)'; c.fill(); }
  // bola lanzada: sombra, estela y bola
  if (ball && !hit) { const r = 9 * ball.s + 1.5; c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(ball.x, ball.y + 10 + 26 * ball.s, r, r * 0.35, 0, 0, R2); c.fill();
    trail.forEach(([x, y], i) => { c.globalAlpha = i / trail.length * 0.35; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r * (0.4 + i / trail.length * 0.5), 0, R2); c.fill(); }); c.globalAlpha = 1; baseball(ball.x, ball.y, r, ball.spin); }
  // bola bateada: estela larga, sombra en el césped y distancia
  if (hit) { const [x, y, e, ly] = hitPos(hit), r = 10 * (1 - e * 0.7);
    const sx = hit.x0 + (180 + Math.sin(hit.ang) * hit.dist * 1.6 - hit.x0) * e, sy = hit.y0 + (ly - hit.y0) * e; if (sy > WALL) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(sx, sy, r, r * 0.35, 0, 0, R2); c.fill(); }
    c.lineCap = 'round'; for (let i = 1; i < trail.length; i++) { c.globalAlpha = i / trail.length * 0.7; c.strokeStyle = hit.hr ? '#fff27a' : '#fff'; c.lineWidth = r * 1.4 * i / trail.length; c.beginPath(); c.moveTo(trail[i - 1][0], trail[i - 1][1]); c.lineTo(trail[i][0], trail[i][1]); c.stroke(); } c.globalAlpha = 1;
    baseball(x, Math.max(14, y), Math.max(2.5, r), tm * 30); if (e < 1 || hit.t < 1.9) label(`${Math.round(hit.dist * Math.min(1, e * 1.1))} m`, x + 14, Math.max(14, y) - 8, 14, hit.hr ? '#fff27a' : '#fff'); }
  batter();
  // HUD en las esquinas
  label(hrs, 14, 10, 34, '#fff27a'); label('JONRONES', 14, 48, 11, '#dfe6ff'); label(`${total} m`, 14, 64, 13, '#b8c6ff');
  for (let i = 0; i < 10; i++) { const x = 250 + (i % 5) * 20, y = 22 + Math.floor(i / 5) * 22; if (i < outs) { const s = 0.6 + (outMarks[i] || 1) * 0.4; c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.arc(0, 0, 8, 0, R2); ART.fillOut(c, '#e24b5b', 2); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-3.5, -3.5); c.lineTo(3.5, 3.5); c.moveTo(3.5, -3.5); c.lineTo(-3.5, 3.5); c.stroke(); c.restore(); } else baseball(x, y, 7.5, 0); }
  label('OUTS', 346, 58, 11, '#dfe6ff', 'right');
  if (msgT > 0) { const p = (msgD - msgT) / 0.18, s = p < 1 ? 0.6 + p * 0.55 : Math.max(1, 1.15 - (p - 1) * 0.3); c.save(); c.translate(180, 400); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.25); label(msg, 0, 0, msg.startsWith('¡J') ? 34 : 24, msgC, 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
});
