/* Arena cenital para fiestas (1–4 jugadores; la CPU rellena las plazas vacías): física de empujones, zonas,
 * recogida y eliminación. Modos (CFG.mode): sumo, hielo, pintar, colina, patata, corona, carritos, silla, glotones, pastores.
 * Cada partido son varias rondas cortas; cada ronda reparte 3/2/1/0 puntos según la clasificación y al final k.podium.
 * Mando: joystick + A/B (tele, teclado, mando físico o mando virtual). En un jugador también se puede guiar tocando. */
const M = CFG.mode || 'sumo', OUT = ART.OUT, TAU = Math.PI * 2, lite = ART.lite, dark = ART.dark, alpha = ART.alpha;
const PORT = innerHeight > innerWidth * 1.05;
const W = PORT ? 480 : 760, H = PORT ? 720 : 480, AW = 440, OX = PORT ? 20 : 160, OY = PORT ? 140 : 20, CX = 220, CY = 220;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#120e26' }), c = k.ctx;
const MD = {
  sumo: { rounds: 3, len: 60, elim: 1, fr: 3.2, acc: 720, max: 170, r: 18, walls: 0, sp: 110 },
  hielo: { rounds: 3, len: 80, elim: 1, fr: 0.35, acc: 250, max: 235, r: 16, walls: 0, sp: 115, e: 0.95 },
  pintar: { rounds: 3, len: 30, fr: 4.2, acc: 950, max: 185, r: 15, walls: 1, sp: 150 },
  colina: { rounds: 3, len: 40, fr: 4, acc: 880, max: 170, r: 16, walls: 1, sp: 150 },
  patata: { rounds: 3, len: 0, elim: 1, fr: 4.5, acc: 950, max: 172, r: 15, walls: 1, sp: 150, pil: 1 },
  corona: { rounds: 3, len: 45, fr: 4.5, acc: 950, max: 178, r: 15, walls: 1, sp: 150, pil: 1 },
  carritos: { rounds: 3, len: 60, elim: 1, r: 17, walls: 1, sp: 150, car: 1, e: 0.7 },
  silla: { rounds: 3, len: 0, elim: 1, fr: 5, acc: 900, max: 150, r: 14, walls: 1, sp: 150 },
  glotones: { rounds: 2, len: 50, fr: 3, acc: 760, max: 190, r: 16, walls: 2, sp: 125 },
  pastores: { rounds: 2, len: 55, fr: 5.5, acc: 1100, max: 205, r: 13, walls: 1, sp: 0 },
}[M];
const CORN = [[-1, -1], [-1, 1], [1, -1], [1, 1]]; /* J1 arriba izq., J2 abajo izq., J3 arriba der., J4 abajo der. (como las fichas del marcador) */
const PIL = MD.pil ? [[220, 92, 24], [220, 348, 24], [92, 220, 24], [348, 220, 24]] : [];
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t)), adiff = (a) => Math.atan2(Math.sin(a), Math.cos(a)), hyp = Math.hypot;
let P = [], round = 0, rt = 0, T = 0, phase = 'play', btw = 0, banner = null, cdPend = false, elimOrder = [], S = {}, waves = [];
let CPU = 0; try { CPU = Math.min(6, +localStorage.getItem('cpu:' + CFG.id) || 0); } catch (e) { /* sin almacenamiento */ }
const skill = () => Math.min(0.95, 0.3 + CPU * 0.1 + (round - 1) * 0.04);
const spdK = () => lerp(0.8, 1, rt / 20); /* arranque suave: 80 % → 100 % en 20 s */
function mk(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const q = cv.getContext('2d'); q.scale(2, 2); if (fn) fn(q); return cv; }
function label(s, x, y, size, col, align, q) {
  q = q || c; q.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; q.textAlign = align || 'center'; q.textBaseline = 'middle';
  q.lineJoin = 'round'; q.lineWidth = size / 4 + 2; q.strokeStyle = OUT; q.strokeText(s, x, y); q.fillStyle = col || '#fff'; q.fillText(s, x, y);
}
const tagOf = (pl) => (pl.cpu ? 'CPU' : k.party ? 'J' + (pl.p + 1) : 'TÚ');
const standing = () => P.filter((pl) => pl.alive && !pl.fall);
const near = (pl, list) => { let b = null, bd = 1e9; for (const o of list || standing()) if (o !== pl && !o.gone) { const d = hyp(o.x - pl.x, o.y - pl.y); if (d < bd) { bd = d; b = o; } } return [b, bd]; };
function seek(pl, tx, ty, lead) { const dx = tx - pl.x - pl.vx * (lead || 0.2), dy = ty - pl.y - pl.vy * (lead || 0.2), L = hyp(dx, dy); return L < 4 ? { x: 0, y: 0 } : { x: dx / L, y: dy / L }; }
const facing = (pl, o, tol) => { const a = Math.atan2(o.y - pl.y, o.x - pl.x); return Math.abs(adiff(a - Math.atan2(pl.fy, pl.fx))) < (tol || 0.45); };
const W2 = (x) => OX + x, H2 = (y) => OY + y;

/* ---------------------------------------------------------------- Música propia (sillas) */
let AX = null, mi = 0, mbt = 0;
const MEL = [523, 659, 784, 659, 698, 587, 494, 587, 523, 659, 784, 1047, 988, 784, 659, 587, 523, 587, 659, 523, 440, 494, 523, 392];
function note(f, d, v, type) {
  if (k.muted()) return;
  if (!AX) try { AX = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  if (AX.state === 'suspended') AX.resume();
  const o = AX.createOscillator(), g = AX.createGain(), t0 = AX.currentTime; o.type = type || 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(v || 0.07, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + d); o.connect(g); g.connect(AX.destination); o.start(t0); o.stop(t0 + d + 0.02);
}

/* ---------------------------------------------------------------- Fondos cacheados */
function scene(q) {
  let g = q.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1745'); g.addColorStop(1, '#0d0a20'); q.fillStyle = g; q.fillRect(0, 0, W, H);
  q.fillStyle = 'rgba(255,255,255,.035)'; for (let y = 10; y < H; y += 22) for (let x = (y / 22) % 2 ? 10 : 21; x < W; x += 22) { q.beginPath(); q.arc(x, y, 1.6, 0, TAU); q.fill(); }
  q.save(); q.translate(OX, OY); q.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(q, -6, 2, AW + 12, AW + 12, 26); q.fill(); FLOOR[M](q); q.restore();
}
function frame(q, col, col2) {
  ART.rr(q, -4, -4, AW + 8, AW + 8, 22); q.lineWidth = 12; q.strokeStyle = OUT; q.stroke(); q.lineWidth = 7; q.strokeStyle = col; q.stroke();
  q.lineWidth = 2; q.strokeStyle = col2 || lite(col, 0.3); ART.rr(q, -2, -2, AW + 4, AW + 4, 20); q.stroke();
}
function clipBox(q) { ART.rr(q, 0, 0, AW, AW, 18); q.clip(); }
function tuft(q, x, y, col) { q.strokeStyle = col; q.lineWidth = 2; q.lineCap = 'round'; q.beginPath(); q.moveTo(x - 4, y + 3); q.lineTo(x - 2, y - 3); q.moveTo(x, y + 3); q.lineTo(x + 1, y - 5); q.moveTo(x + 4, y + 3); q.lineTo(x + 5, y - 2); q.stroke(); }
const rs = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function grass(q, a, b) {
  q.save(); clipBox(q); let g = q.createRadialGradient(CX, CY, 40, CX, CY, 330); g.addColorStop(0, a); g.addColorStop(1, b); q.fillStyle = g; q.fillRect(0, 0, AW, AW);
  for (let i = 0; i < 26; i++) { q.fillStyle = alpha(lite(a, 0.2), 0.35); q.beginPath(); q.ellipse(rs(i) * AW, rs(i + 50) * AW, 20 + rs(i + 9) * 30, 10 + rs(i + 3) * 14, rs(i + 7) * 3, 0, TAU); q.fill(); }
  for (let i = 0; i < 70; i++) tuft(q, rs(i + 100) * AW, rs(i + 200) * AW, dark(a, 0.25));
  for (let i = 0; i < 14; i++) { const x = rs(i + 300) * AW, y = rs(i + 400) * AW, col = ['#fff', '#ffd166', '#ff9ad5'][i % 3]; for (let j = 0; j < 5; j++) { q.fillStyle = col; q.beginPath(); q.arc(x + Math.cos(j * 1.256) * 3, y + Math.sin(j * 1.256) * 3, 2.2, 0, TAU); q.fill(); } q.fillStyle = '#f2a33a'; q.beginPath(); q.arc(x, y, 1.8, 0, TAU); q.fill(); }
  q.restore();
}
function pillar(q, x, y, r, kind) {
  ART.shadow(q, x + 4, y + r * 0.6, r * 1.05, 0.3);
  if (kind === 'bush') {
    for (let j = 0; j < 6; j++) { const a = j * 1.047, xx = x + Math.cos(a) * r * 0.5, yy = y + Math.sin(a) * r * 0.45; q.beginPath(); q.arc(xx, yy, r * 0.6, 0, TAU); q.fillStyle = OUT; q.fill(); }
    for (let j = 0; j < 6; j++) { const a = j * 1.047, xx = x + Math.cos(a) * r * 0.5, yy = y + Math.sin(a) * r * 0.45, g = q.createRadialGradient(xx - 4, yy - 5, 1, xx, yy, r * 0.6); g.addColorStop(0, '#8fe07a'); g.addColorStop(1, '#3f9b45'); q.beginPath(); q.arc(xx, yy, r * 0.6 - 2.4, 0, TAU); q.fillStyle = g; q.fill(); }
    q.fillStyle = '#ff5f7a'; [[-6, -4], [7, 3], [-2, 8]].forEach(([a, b]) => { q.beginPath(); q.arc(x + a, y + b, 2.6, 0, TAU); q.fill(); });
    return;
  }
  q.beginPath(); q.arc(x, y, r, 0, TAU); const g = q.createRadialGradient(x - r * 0.4, y - r * 0.4, 2, x, y, r * 1.1); g.addColorStop(0, '#e7e3f5'); g.addColorStop(1, '#8a86a5'); ART.fillOut(q, g, 3);
  q.beginPath(); q.arc(x, y, r * 0.66, 0, TAU); q.lineWidth = 2; q.strokeStyle = alpha(OUT, 0.35); q.stroke();
  q.fillStyle = '#ffd166'; q.beginPath(); q.arc(x, y, r * 0.22, 0, TAU); q.fill(); q.lineWidth = 1.5; q.strokeStyle = OUT; q.stroke();
}
const FLOOR = {
  sumo(q) { q.save(); clipBox(q); for (let i = 0; i < 11; i++) { q.fillStyle = i % 2 ? '#8a5a35' : '#7b4f2e'; q.fillRect(i * 40, 0, 40, AW); q.fillStyle = 'rgba(0,0,0,.22)'; q.fillRect(i * 40, 0, 2, AW); for (let j = 0; j < 3; j++) q.fillRect(i * 40, (rs(i * 3 + j) * AW) | 0, 40, 2); q.fillStyle = 'rgba(255,255,255,.06)'; q.fillRect(i * 40 + 3, 0, 5, AW); } q.restore(); frame(q, '#4a2c1a'); },
  hielo(q) { q.save(); clipBox(q); const g = q.createRadialGradient(CX, CY, 20, CX, CY, 320); g.addColorStop(0, '#1d5a8f'); g.addColorStop(1, '#0a1f3d'); q.fillStyle = g; q.fillRect(0, 0, AW, AW);
    q.strokeStyle = 'rgba(160,220,255,.16)'; q.lineWidth = 2; for (let i = 0; i < 40; i++) { const x = rs(i) * AW, y = rs(i + 40) * AW; q.beginPath(); q.arc(x, y, 8 + rs(i + 80) * 14, 3.6, 5.8); q.stroke(); } q.restore(); frame(q, '#3a5f8c', '#9fd8f2'); },
  pintar(q) { q.save(); clipBox(q); q.fillStyle = '#2b2450'; q.fillRect(0, 0, AW, AW); for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) { ART.rr(q, x * 40 + 2, y * 40 + 2, 36, 36, 7); q.fillStyle = (x + y) % 2 ? '#e9e4f7' : '#dcd5f0'; q.fill(); q.fillStyle = 'rgba(255,255,255,.5)'; q.fillRect(x * 40 + 7, y * 40 + 6, 12, 3); } q.restore(); frame(q, '#6e62f5'); },
  colina(q) { grass(q, '#74c25c', '#3f8a3f'); frame(q, '#8b5a3c', '#c98a4b'); },
  patata(q) { q.save(); clipBox(q); const g = q.createRadialGradient(CX, CY, 30, CX, CY, 320); g.addColorStop(0, '#f1d9a0'); g.addColorStop(1, '#c9a064'); q.fillStyle = g; q.fillRect(0, 0, AW, AW);
    for (let i = 0; i < 90; i++) { q.fillStyle = alpha(i % 2 ? '#a07a45' : '#fff4d2', 0.5); q.beginPath(); q.ellipse(rs(i) * AW, rs(i + 90) * AW, 2 + rs(i + 5) * 3, 1.5 + rs(i + 6) * 2, 0, 0, TAU); q.fill(); }
    q.strokeStyle = 'rgba(255,255,255,.35)'; q.lineWidth = 4; q.setLineDash([14, 12]); q.beginPath(); q.arc(CX, CY, 70, 0, TAU); q.stroke(); q.setLineDash([]); q.restore();
    PIL.forEach(([x, y, r]) => pillar(q, x, y, r, 'bush')); frame(q, '#d0773a', '#ffb070'); },
  corona(q) { q.save(); clipBox(q); for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) { q.fillStyle = (x + y) % 2 ? '#8d8aa8' : '#7b7898'; q.fillRect(x * 40, y * 40, 40, 40); q.fillStyle = 'rgba(255,255,255,.08)'; q.fillRect(x * 40, y * 40, 40, 3); q.fillStyle = 'rgba(0,0,0,.18)'; q.fillRect(x * 40, y * 40 + 38, 40, 2); }
    q.fillStyle = '#a3263a'; q.fillRect(CX - 26, 0, 52, AW); q.fillRect(0, CY - 26, AW, 52); q.fillStyle = '#ffd166'; q.fillRect(CX - 26, 0, 4, AW); q.fillRect(CX + 22, 0, 4, AW); q.fillRect(0, CY - 26, AW, 4); q.fillRect(0, CY + 22, AW, 4);
    q.beginPath(); q.arc(CX, CY, 42, 0, TAU); q.fillStyle = '#c23a4f'; q.fill(); q.lineWidth = 4; q.strokeStyle = '#ffd166'; q.stroke(); q.restore();
    PIL.forEach(([x, y, r]) => pillar(q, x, y, r)); frame(q, '#4b4f7a', '#9496ad'); },
  carritos(q) { q.save(); clipBox(q); q.fillStyle = '#353b63'; q.fillRect(0, 0, AW, AW); q.fillStyle = 'rgba(255,255,255,.06)'; for (let y = 0; y < AW; y += 16) for (let x = (y / 16) % 2 ? 0 : 8; x < AW; x += 16) { q.beginPath(); q.ellipse(x, y, 5, 2, 0.7, 0, TAU); q.fill(); }
    q.strokeStyle = 'rgba(255,209,102,.25)'; q.lineWidth = 3; q.beginPath(); q.arc(CX, CY, 150, 0, TAU); q.stroke(); q.restore();
    ART.rr(q, -6, -6, AW + 12, AW + 12, 24); q.lineWidth = 16; q.strokeStyle = OUT; q.stroke(); q.save(); q.setLineDash([22, 22]); q.lineWidth = 10; q.strokeStyle = '#f2f2f2'; q.stroke(); q.lineDashOffset = 22; q.strokeStyle = '#e04a4a'; q.stroke(); q.restore(); },
  silla(q) { q.save(); clipBox(q); for (let i = 0; i < 22; i++) for (let j = 0; j < 11; j++) { q.fillStyle = (i + j) % 2 ? '#c98a4b' : '#b87a3f'; q.fillRect(i * 20, j * 40 + (i % 2) * 20, 20, 40); q.fillStyle = 'rgba(0,0,0,.15)'; q.fillRect(i * 20, j * 40 + (i % 2) * 20, 1.5, 40); }
    const g = q.createRadialGradient(CX, CY, 20, CX, CY, 260); g.addColorStop(0, 'rgba(255,240,200,.35)'); g.addColorStop(1, 'rgba(20,10,40,.45)'); q.fillStyle = g; q.fillRect(0, 0, AW, AW);
    for (let i = 0; i < 60; i++) { q.fillStyle = ['#ff5f7a', '#5ce1e6', '#ffd166', '#7cf7a0', '#b98cff'][i % 5]; q.save(); q.translate(rs(i) * AW, rs(i + 60) * AW); q.rotate(rs(i + 7) * 6); q.fillRect(-3, -1.5, 6, 3); q.restore(); }
    q.strokeStyle = 'rgba(255,255,255,.22)'; q.lineWidth = 3; q.setLineDash([10, 10]); q.beginPath(); q.arc(CX, CY, 150, 0, TAU); q.stroke(); q.setLineDash([]); q.restore(); frame(q, '#6a3d8a', '#b98cff'); },
  glotones(q) { q.save(); clipBox(q); grassFill(q); q.restore(); q.beginPath(); q.arc(CX, CY, 216, 0, TAU); q.fillStyle = '#c9b27a'; q.fill(); q.lineWidth = 4; q.strokeStyle = OUT; q.stroke();
    q.beginPath(); q.arc(CX, CY, 212, 0, TAU); const g = q.createRadialGradient(CX - 40, CY - 50, 20, CX, CY, 230); g.addColorStop(0, '#5ecbe0'); g.addColorStop(0.7, '#2b8fb5'); g.addColorStop(1, '#1f6f9a'); q.fillStyle = g; q.fill();
    q.save(); q.beginPath(); q.arc(CX, CY, 212, 0, TAU); q.clip(); q.strokeStyle = 'rgba(255,255,255,.18)'; q.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = rs(i) * AW, y = rs(i + 30) * AW; q.beginPath(); q.ellipse(x, y, 10 + rs(i + 3) * 12, 4, 0, 3.5, 5.9); q.stroke(); }
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, x = CX + Math.cos(a) * 190, y = CY + Math.sin(a) * 190, r = 14 + rs(i) * 6; q.beginPath(); q.moveTo(x, y); q.arc(x, y, r, a + 0.3, a + 0.3 + TAU - 0.5); q.closePath(); q.fillStyle = '#4fae5a'; q.fill(); q.lineWidth = 2; q.strokeStyle = OUT; q.stroke(); if (i % 3 === 0) { q.fillStyle = '#ff9ad5'; q.beginPath(); q.arc(x - 3, y - 3, 4, 0, TAU); q.fill(); } }
    q.restore(); },
  pastores(q) { grass(q, '#86cc5e', '#4d9b44'); PEN.forEach((pn) => { q.save(); q.beginPath(); q.moveTo(pn.x, pn.y); q.arc(pn.x, pn.y, PR, pn.ma - 0.785, pn.ma + 0.785); q.closePath(); q.clip(); q.fillStyle = '#e6cf7a'; q.fillRect(pn.x - PR, pn.y - PR, PR * 2, PR * 2);
    q.strokeStyle = 'rgba(160,120,40,.5)'; q.lineWidth = 1.5; for (let i = 0; i < 40; i++) { const a = pn.ma + (rs(i + pn.i * 50) - 0.5) * 1.5, d = rs(i + 9 + pn.i * 50) * PR; const x = pn.x + Math.cos(a) * d, y = pn.y + Math.sin(a) * d; q.beginPath(); q.moveTo(x - 4, y); q.lineTo(x + 4, y - 2); q.stroke(); } q.restore();
    for (const s of [-1, 1]) { const a0 = pn.ma + s * HALF, a1 = pn.ma + s * 0.8; q.beginPath(); q.arc(pn.x, pn.y, PR, Math.min(a0, a1), Math.max(a0, a1)); q.lineWidth = 9; q.strokeStyle = OUT; q.stroke(); q.lineWidth = 5; q.strokeStyle = '#a0703f'; q.stroke();
      for (let i = 0; i <= 3; i++) { const a = a0 + (a1 - a0) * i / 3, x = pn.x + Math.cos(a) * PR, y = pn.y + Math.sin(a) * PR; q.beginPath(); q.arc(x, y, 5, 0, TAU); ART.fillOut(q, '#c98a4b', 2); } } });
    frame(q, '#8b5a3c', '#c98a4b'); },
};
function grassFill(q) { const g = q.createRadialGradient(CX, CY, 40, CX, CY, 330); g.addColorStop(0, '#6cc27a'); g.addColorStop(1, '#3d8a4a'); q.fillStyle = g; q.fillRect(0, 0, AW, AW); for (let i = 0; i < 60; i++) tuft(q, rs(i + 100) * AW, rs(i + 200) * AW, '#2f6f3a'); }
const PR = 92, HALF = 0.46, PEN = CORN.map(([sx, sy], i) => ({ i, x: sx < 0 ? 0 : AW, y: sy < 0 ? 0 : AW, ma: Math.atan2(-sy, -sx) }));
const BG = mk(W, H, scene);
/* baldosa de hielo */
const ICE = mk(40, 40, (q) => { ART.rr(q, 1.5, 1.5, 37, 37, 6); const g = q.createLinearGradient(0, 0, 40, 40); g.addColorStop(0, '#f2fbff'); g.addColorStop(0.5, '#bfe9fb'); g.addColorStop(1, '#8fcbe8'); q.fillStyle = g; q.fill(); q.lineWidth = 2; q.strokeStyle = alpha(OUT, 0.55); q.stroke();
  q.strokeStyle = 'rgba(255,255,255,.8)'; q.lineWidth = 2.5; q.lineCap = 'round'; q.beginPath(); q.moveTo(8, 14); q.lineTo(15, 7); q.moveTo(10, 20); q.lineTo(21, 9); q.stroke(); });

/* ---------------------------------------------------------------- Dibujo de personajes */
function blob(x, y, r, col, fx, fy, kind, z, pl) {
  ART.shadow(c, x, y + r * 0.45, r * (z ? 0.75 : 1.02), 0.3);
  c.beginPath(); c.ellipse(x, y + r * 0.45, r * 1.12, r * 0.42, 0, 0, TAU); c.lineWidth = 3; c.strokeStyle = alpha(col, 0.9); c.stroke();
  y -= r * 0.2 + (z || 0);
  const sp = pl ? Math.min(1, hyp(pl.vx, pl.vy) / 300) : 0, bob = Math.sin(T * 14 + (pl ? pl.i : 0)) * sp * 1.5;
  c.save(); c.translate(x, y + bob); const fa = Math.atan2(fy, fx);
  if (kind === 'fish') { c.save(); c.rotate(fa); const wag = Math.sin(T * 12 + (pl ? pl.i : 0)) * 0.35; c.save(); c.translate(-r * 0.9, 0); c.rotate(wag); c.beginPath(); c.moveTo(0, 0); c.lineTo(-r * 0.8, -r * 0.6); c.quadraticCurveTo(-r * 0.55, 0, -r * 0.8, r * 0.6); c.closePath(); ART.fillOut(c, dark(col, 0.15), 2.2); c.restore();
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(-r * 0.1, s * r * 0.95, r * 0.35, r * 0.18, s * 0.5, 0, TAU); ART.fillOut(c, lite(col, 0.2), 2); } c.restore(); }
  if (kind === 'dog') { c.save(); c.rotate(fa); const wag = Math.sin(T * 16) * 0.5; c.save(); c.translate(-r * 0.9, 0); c.rotate(wag); c.beginPath(); c.ellipse(-r * 0.3, 0, r * 0.45, r * 0.16, 0, 0, TAU); ART.fillOut(c, dark(col, 0.1), 2); c.restore(); c.restore(); }
  c.scale(1 + sp * 0.06, 1 - sp * 0.06);
  const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1); g.addColorStop(0, lite(col, 0.45)); g.addColorStop(0.55, col); g.addColorStop(1, dark(col, 0.3));
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = g; c.fill(); c.lineWidth = Math.max(2.2, r * 0.14); c.strokeStyle = OUT; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.38)'; c.beginPath(); c.ellipse(-r * 0.38, -r * 0.45, r * 0.28, r * 0.15, -0.6, 0, TAU); c.fill();
  const px = -fy, py = fx;
  if (kind === 'sumo') { c.beginPath(); c.arc(0, 0, r * 0.82, fa + 1.2, fa + TAU - 1.2); c.lineWidth = r * 0.24; c.strokeStyle = OUT; c.stroke(); c.lineWidth = r * 0.14; c.strokeStyle = '#f2f2f2'; c.stroke();
    c.beginPath(); c.arc(-fx * r * 0.85, -fy * r * 0.85, r * 0.2, 0, TAU); ART.fillOut(c, '#f2f2f2', 2); }
  if (kind === 'dog') for (const s of [-1, 1]) { c.beginPath(); c.ellipse(px * s * r * 0.78 - fx * r * 0.15, py * s * r * 0.78 - fy * r * 0.15, r * 0.42, r * 0.24, fa + s * 0.6, 0, TAU); ART.fillOut(c, dark(col, 0.35), 2); }
  const ex = fx * r * 0.4, ey = fy * r * 0.4 - r * 0.08, blink = ((T + (pl ? pl.i * 1.3 : 0)) % 3.2) < 0.1, er = r * 0.25;
  for (const s of [-1, 1]) { const X = ex + px * r * 0.34 * s, Y = ey + py * r * 0.34 * s;
    if (blink) { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(X - er, Y); c.lineTo(X + er, Y); c.stroke(); continue; }
    c.beginPath(); c.arc(X, Y, er, 0, TAU); ART.fillOut(c, '#fff', 1.6); c.beginPath(); c.arc(X + fx * er * 0.4, Y + fy * er * 0.4, er * 0.52, 0, TAU); c.fillStyle = OUT; c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(X + fx * er * 0.4 - er * 0.18, Y + fy * er * 0.4 - er * 0.2, er * 0.18, 0, TAU); c.fill(); }
  if (kind === 'dog') { c.beginPath(); c.arc(fx * r * 0.88, fy * r * 0.88, r * 0.18, 0, TAU); c.fillStyle = OUT; c.fill(); }
  if (kind === 'fish' && pl) { const mo = 0.25 + Math.abs(Math.sin(T * 8)) * 0.25; c.beginPath(); c.arc(fx * r * 0.72, fy * r * 0.72, r * 0.2, fa - mo * 2, fa + mo * 2); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); }
  c.restore();
}
function car(pl, x, y) {
  const h = pl.h, col = pl.col; ART.shadow(c, x, y + 10, 24, 0.3);
  c.save(); c.translate(x, y); c.rotate(h);
  /* globos atados detrás */
  for (let j = 0; j < pl.balloons; j++) { const oy = (j - (pl.balloons - 1) / 2) * 13, bx = -34 - Math.abs(oy) * 0.2 + Math.sin(T * 3 + j) * 2, by = oy * 1.25 + Math.cos(T * 2.5 + j) * 2;
    c.strokeStyle = alpha(OUT, 0.7); c.lineWidth = 1.2; c.beginPath(); c.moveTo(-18, 0); c.lineTo(bx + 6, by); c.stroke();
    c.beginPath(); c.ellipse(bx, by, 8, 9, 0, 0, TAU); const g = c.createRadialGradient(bx - 3, by - 3, 1, bx, by, 10); g.addColorStop(0, lite(col, 0.6)); g.addColorStop(1, col); ART.fillOut(c, g, 2); }
  ART.rr(c, -21, -16, 42, 32, 13); c.fillStyle = '#2a2440'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
  ART.rr(c, -17, -12, 34, 24, 9); const g = c.createLinearGradient(-17, -12, 17, 12); g.addColorStop(0, lite(col, 0.4)); g.addColorStop(1, dark(col, 0.2)); ART.fillOut(c, g, 2);
  ART.rr(c, -12, -8, 12, 16, 5); ART.fillOut(c, dark(col, 0.45), 1.5);
  c.beginPath(); c.arc(-6, 0, 7, 0, TAU); ART.fillOut(c, '#ffd9b0', 2); for (const s of [-1, 1]) { c.fillStyle = OUT; c.beginPath(); c.arc(-3, s * 2.8, 1.5, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.5)'; ART.rr(c, 4, -9, 10, 4, 2); c.fill();
  c.beginPath(); c.arc(-16, 0, 3, 0, TAU); ART.fillOut(c, '#c3ccd4', 1.5);
  if (Math.sin(T * 40 + pl.i) > 0.3) ART.glint(c, -16, 0, 5, '#fff3a8');
  if (pl.turbo > 0) { c.fillStyle = alpha('#ffb13d', 0.8); c.beginPath(); c.moveTo(-22, -6); c.lineTo(-34 - Math.random() * 8, 0); c.lineTo(-22, 6); c.fill(); }
  c.restore();
}
function crownAt(x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(-12, 6); c.lineTo(-13, -6); c.lineTo(-6, 0); c.lineTo(0, -10); c.lineTo(6, 0); c.lineTo(13, -6); c.lineTo(12, 6); c.closePath();
  const g = c.createLinearGradient(0, -10, 0, 6); g.addColorStop(0, '#fff3a8'); g.addColorStop(1, '#e89200'); ART.fillOut(c, g, 2.4);
  [[-7, 2, '#ff5f7a'], [0, 1, '#5ce1e6'], [7, 2, '#7cf7a0']].forEach(([a, b, cc]) => { c.beginPath(); c.arc(a, b, 2.2, 0, TAU); c.fillStyle = cc; c.fill(); }); c.restore();
}
function bombAt(x, y, s, hot) {
  c.save(); c.translate(x, y); c.scale(s, s); const sh = hot ? (Math.random() - 0.5) * 2.5 : 0; c.translate(sh, 0);
  c.beginPath(); c.arc(0, 0, 11, 0, TAU); const g = c.createRadialGradient(-4, -4, 1, 0, 0, 12); g.addColorStop(0, hot ? '#ff8a6a' : '#6b6588'); g.addColorStop(1, '#221c3a'); ART.fillOut(c, g, 2.4);
  ART.rr(c, -4, -15, 8, 5, 1.5); ART.fillOut(c, '#8a86a5', 1.8); c.strokeStyle = '#c9a064'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, -15); c.quadraticCurveTo(5, -21, 9, -19); c.stroke();
  ART.glint(c, 9, -19, 4 + Math.random() * 3, Math.random() < 0.5 ? '#ffd166' : '#fff'); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-4, -5, 3.5, 2, -0.6, 0, TAU); c.fill(); c.restore();
}
function chair(x, y, a, occ) {
  ART.shadow(c, x + 2, y + 9, 15, 0.3); c.save(); c.translate(x, y); c.rotate(a);
  ART.rr(c, -12, -12, 24, 24, 5); const g = c.createLinearGradient(-12, -12, 12, 12); g.addColorStop(0, occ ? '#e7c089' : '#ffd9a0'); g.addColorStop(1, '#b87a3f'); ART.fillOut(c, g, 2.4);
  ART.rr(c, 9, -13, 7, 26, 3); ART.fillOut(c, '#8b5a3c', 2.2); c.fillStyle = '#ff5f7a'; ART.rr(c, -8, -8, 14, 16, 4); c.fill(); c.restore();
}
function sheep(sh) {
  const x = sh.x, y = sh.y, a = Math.atan2(sh.fy, sh.fx), hop = Math.abs(Math.sin(T * 10 + sh.ph)) * Math.min(1, hyp(sh.vx, sh.vy) / 60) * 2;
  ART.shadow(c, x, y + 6, 11, 0.28); c.save(); c.translate(x, y - 2 - hop); c.rotate(a);
  const puff = [[-4, -4], [-4, 4], [3, -5], [3, 5], [-8, 0], [6, 0], [0, 0]];
  c.fillStyle = OUT; puff.forEach(([u, v]) => { c.beginPath(); c.arc(u, v, 6.6, 0, TAU); c.fill(); });
  c.fillStyle = '#fbf7ee'; puff.forEach(([u, v]) => { c.beginPath(); c.arc(u, v, 5, 0, TAU); c.fill(); });
  c.fillStyle = '#e4ddcc'; c.beginPath(); c.arc(-3, 3, 3, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(11, 0, 5.5, 4.4, 0, 0, TAU); ART.fillOut(c, '#3b3450', 2); c.fillStyle = '#fff'; c.beginPath(); c.arc(12.5, -1.8, 1.3, 0, TAU); c.arc(12.5, 1.8, 1.3, 0, TAU); c.fill();
  if (sh.pen >= 0) { c.beginPath(); c.arc(7, 0, 3.4, 0, TAU); ART.fillOut(c, P[sh.pen].col, 1.5); }
  c.restore();
}

/* ---------------------------------------------------------------- Jugadores y rondas */
function mkPlayers() { P = k.players(4).map((q, i) => ({ i, p: q.p, col: q.color, name: q.name, cpu: q.cpu, pts: 0, wins: 0 })); }
function syncPlayers() { const pl = k.players(4); P.forEach((x, i) => { x.cpu = pl[i].cpu; x.name = pl[i].name; x.col = pl[i].color; }); }
k.onParty = () => { if (k.st !== 'play') { reset(); return; } syncPlayers(); };
function newRound() {
  round++; rt = 0; phase = 'play'; elimOrder = []; cdPend = true; banner = null; waves = []; S = {};
  P.forEach((pl, i) => { const [sx, sy] = CORN[i], d = MD.sp;
    Object.assign(pl, { x: CX + sx * d * 0.7071, y: CY + sy * d * 0.7071, vx: 0, vy: 0, r: MD.r, fx: -sx * 0.7071, fy: -sy * 0.7071, h: Math.atan2(-sy, -sx), alive: true, fall: 0, dash: 0, kb: 0, cd: 0, cd2: 0,
      chg: 0, z: 0, zt: 0, stun: 0, inv: 0, val: 0, slip: 0, aH: false, brace: false, turbo: 0, balloons: 3, m: 12, gone: 0, bark: 0, lie: false, seat: -1, ai: { t: 0 }, gain: 0 }); });
  MODES[M].init();
}
function reset() { mkPlayers(); round = 0; newRound(); }
function dash(pl, pow, dur, kb) { pl.vx += pl.fx * pow; pl.vy += pl.fy * pow; pl.dash = dur; pl.kb = kb || 0; k.sfx('jump'); k.burst(W2(pl.x - pl.fx * pl.r), H2(pl.y - pl.fy * pl.r), '#e8e2ff', 6, 90); }
function fallOut(pl) { if (pl.fall) return; pl.fall = 0.001; k.sfx('hurt'); k.float(M === 'hielo' ? '¡Al agua!' : '¡Fuera!', W2(pl.x), H2(pl.y) - 26, pl.col); }
function eliminate(pl) { if (!pl.alive) return; pl.alive = false; pl.fall = 0; elimOrder.push(pl.i); }
function human(pl) {
  const d = k.pdir(pl.p); let x = d.x, y = d.y; const solo = !k.party && pl.p === 0;
  if (solo && k.ptr.down && !x && !y) { const dx = k.ptr.x - W2(pl.x), dy = k.ptr.y - H2(pl.y), L = hyp(dx, dy); if (L > 14) { x = dx / L; y = dy / L; } }
  const L = hyp(x, y); if (L > 1) { x /= L; y /= L; }
  return { x, y, a: k.pheld(pl.p, 'a') || (solo && k.tap), ah: k.phit(pl.p, 'a') || (solo && k.tap), b: k.pheld(pl.p, 'b'), bh: k.phit(pl.p, 'b') };
}
function AI(pl, dt) {
  const s = skill(), ai = pl.ai; ai.t -= dt;
  if (ai.t <= 0) { ai.t = lerp(0.5, 0.14, s) * k.rnd(0.7, 1.3); ai.nx = k.rnd(-1, 1) * (1 - s) * 0.7; ai.ny = k.rnd(-1, 1) * (1 - s) * 0.7; ai.go = true; }
  const o = MODES[M].ai(pl, ai, s, dt) || { x: 0, y: 0 }; ai.go = false;
  if (o.x || o.y) { o.x += ai.nx; o.y += ai.ny; const L = hyp(o.x, o.y) || 1; o.x /= L; o.y /= L; }
  if (rt < 3 && M !== 'silla') { o.ah = false; if (M === 'sumo') o.a = false; } /* respiro inicial: la CPU no ataca en los 3 primeros segundos */
  return o;
}
function control(pl, inp, dt) {
  if (pl.stun > 0) inp = { x: 0, y: 0 };
  if (inp.x || inp.y) { const q = Math.min(1, dt * 14); pl.fx += (inp.x - pl.fx) * q; pl.fy += (inp.y - pl.fy) * q; const L = hyp(pl.fx, pl.fy) || 1; pl.fx /= L; pl.fy /= L; }
  inp.ar = pl.aH && !inp.a; pl.aH = !!inp.a;
  if (MD.car) return carCtl(pl, inp, dt);
  const mul = MODES[M].act(pl, inp, dt), acc = MD.acc * spdK() * (mul == null ? 1 : mul);
  pl.vx += inp.x * acc * dt; pl.vy += inp.y * acc * dt;
}
function carCtl(pl, inp, dt) {
  const L = hyp(inp.x, inp.y); let thr = 0;
  if (inp.b) { thr = -0.6; if (L > 0.3) pl.h += Math.max(-3 * dt, Math.min(3 * dt, adiff(Math.atan2(-inp.y, -inp.x) - pl.h))); }
  else if (L > 0.3) { const df = adiff(Math.atan2(inp.y, inp.x) - pl.h); pl.h += Math.max(-4.4 * dt, Math.min(4.4 * dt, df)); thr = Math.max(0.25, Math.cos(df)); }
  if (inp.ah && pl.cd <= 0) { pl.turbo = 0.55; pl.cd = 2.4; k.sfx('shoot'); }
  if (pl.turbo > 0) thr = 2.2;
  const fx = Math.cos(pl.h), fy = Math.sin(pl.h), A = 470 * spdK(); pl.fx = fx; pl.fy = fy;
  pl.vx += fx * A * thr * dt; pl.vy += fy * A * thr * dt;
  const fw = (pl.vx * fx + pl.vy * fy) * Math.exp(-1.1 * dt), lt = (-pl.vx * fy + pl.vy * fx) * Math.exp(-6 * dt);
  pl.vx = fx * fw - fy * lt; pl.vy = fy * fw + fx * lt;
  const sp = hyp(pl.vx, pl.vy), mx = pl.turbo > 0 ? 330 : 215; if (sp > mx) { const q = Math.max(mx / sp, 1 - 4 * dt); pl.vx *= q; pl.vy *= q; }
  pl.dash = pl.turbo;
}
const mass = (pl) => (pl.seat >= 0 ? 1e5 : (M === 'glotones' ? pl.r * pl.r / 256 : 1) * (pl.dash > 0 ? 1.8 + pl.kb / 200 : 1) * (pl.brace ? 3 : 1));
function collide(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy), mn = a.r + b.r;
  if (d >= mn || d < 0.01) return;
  const md = MODES[M]; if (md.pass && md.pass(a, b, d)) return;
  const nx = dx / d, ny = dy / d, ma = mass(a), mb = mass(b), ov = mn - d, ta = mb / (ma + mb);
  a.x -= nx * ov * ta; a.y -= ny * ov * ta; b.x += nx * ov * (1 - ta); b.y += ny * ov * (1 - ta);
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn < 0) {
    const e = MD.e == null ? 0.8 : MD.e, j = -(1 + e) * vn / (1 / ma + 1 / mb);
    a.vx -= j / ma * nx; a.vy -= j / ma * ny; b.vx += j / mb * nx; b.vy += j / mb * ny;
    if (a.dash > 0 && b.seat < 0 && !b.brace) { b.vx += nx * a.kb; b.vy += ny * a.kb; a.dash = 0; }
    if (b.dash > 0 && a.seat < 0 && !a.brace) { a.vx -= nx * b.kb; a.vy -= ny * b.kb; b.dash = 0; }
    const imp = -vn;
    if (imp > 80) { k.sfx('hit'); k.burst(W2(a.x + nx * a.r), H2(a.y + ny * a.r), '#fff', Math.min(14, 4 + imp / 30), 60 + imp * 0.4); if (imp > 220) k.shake(3); }
    if (md.hit) md.hit(a, b, imp);
  }
}
function walls(pl) {
  if (MD.walls === 1) { const r = pl.r, e = MD.car ? 0.7 : 0.45; let hitW = false;
    if (pl.x < r) { pl.x = r; hitW = pl.vx < -120; pl.vx = Math.abs(pl.vx) * e; } if (pl.x > AW - r) { pl.x = AW - r; hitW = pl.vx > 120; pl.vx = -Math.abs(pl.vx) * e; }
    if (pl.y < r) { pl.y = r; hitW = hitW || pl.vy < -120; pl.vy = Math.abs(pl.vy) * e; } if (pl.y > AW - r) { pl.y = AW - r; hitW = hitW || pl.vy > 120; pl.vy = -Math.abs(pl.vy) * e; }
    if (hitW && MD.car) k.sfx('click');
  } else if (MD.walls === 2) { const dx = pl.x - CX, dy = pl.y - CY, d = hyp(dx, dy), lim = 212 - pl.r; if (d > lim) { const nx = dx / d, ny = dy / d; pl.x = CX + nx * lim; pl.y = CY + ny * lim; const vn = pl.vx * nx + pl.vy * ny; if (vn > 0) { pl.vx -= 1.5 * vn * nx; pl.vy -= 1.5 * vn * ny; } } }
  for (const [x, y, r] of PIL) { const dx = pl.x - x, dy = pl.y - y, d = hyp(dx, dy), mn = r + pl.r; if (d < mn && d > 0.01) { const nx = dx / d, ny = dy / d; pl.x = x + nx * mn; pl.y = y + ny * mn; const vn = pl.vx * nx + pl.vy * ny; if (vn < 0) { pl.vx -= 1.5 * vn * nx; pl.vy -= 1.5 * vn * ny; } } }
}
/* Fin de ronda: clasificación → 3/2/1/0 puntos (los empates comparten puntos). */
function rankKey(pl) { const md = MODES[M]; if (MD.elim) return pl.alive ? 1000 + (md.key ? md.key(pl) : 0) : elimOrder.indexOf(pl.i); return md.key(pl); }
function endRound() {
  const keys = new Map(P.map((pl) => [pl, rankKey(pl)])), order = P.slice().sort((a, b) => keys.get(b) - keys.get(a)), PT = [3, 2, 1, 0];
  order.forEach((pl, j) => { pl.gain = j && Math.abs(keys.get(pl) - keys.get(order[j - 1])) < 1e-6 ? order[j - 1].gain : PT[j]; });
  order.forEach((pl) => { pl.pts += pl.gain; if (pl.gain === 3) pl.wins++; });
  phase = 'between'; btw = 3.4; banner = { order, tie: order.length > 1 && order[1].gain === order[0].gain };
  const w = order[0]; k.sfx(w.cpu && !k.party ? 'lose' : 'win'); if (!banner.tie) { k.burst(W2(w.x), H2(w.y), w.col, 30, 220); k.float('¡Ronda!', W2(w.x), H2(w.y) - 30, w.col); }
  if (MODES[M].stop) MODES[M].stop();
}
function finish() {
  /* desempate: más rondas ganadas y, después, mejor puesto en la última ronda (el podio solo muestra los puntos) */
  const sc = (pl) => pl.pts * 100 + pl.wins * 10 + pl.gain, best = Math.max(...P.map(sc)), win = P.filter((pl) => sc(pl) === best);
  if (win.length === 1) { CPU = win[0].cpu ? Math.max(0, CPU - 1) : Math.min(6, CPU + 1); try { localStorage.setItem('cpu:' + CFG.id, CPU); } catch (e) { /* sin almacenamiento */ } }
  k.podium(P.map((pl) => ({ p: pl.p, score: sc(pl) })), { fmt: (v) => Math.floor(v / 100) + ' pts', head: !k.party && win.length === 1 && !win[0].cpu ? '¡Has ganado!' : undefined });
}

/* ---------------------------------------------------------------- Modos */
const tileAt = (x, y) => (x < 0 || y < 0 || x >= AW || y >= AW ? -1 : Math.floor(y / 40) * 11 + Math.floor(x / 40));
const MODES = {
  /* Sumo de Cojines: tatami inflable que encoge cada 10 s; A cargada = embestida; B = plantarse (pesas el triple). */
  sumo: {
    hint: ['Mantén A: cargar', 'Suelta: embestida', 'B: plantarse'],
    init() { S.R = 205; S.Rt = 205; S.wob = 0; },
    act(pl, inp, dt) {
      pl.brace = !!inp.b && pl.chg === 0;
      if (inp.a && pl.cd <= 0) { if (!pl.chg) k.sfx('click'); pl.chg = Math.min(1, pl.chg + dt / 0.7); }
      else if (pl.chg > 0) { const q = pl.chg; pl.chg = 0; dash(pl, 180 + 340 * q, 0.32, 90 + 260 * q); pl.cd = 0.45; }
      return pl.brace ? 0.08 : pl.chg > 0 ? 0.3 : 1;
    },
    step(dt) {
      const tgt = Math.max(100, 205 - 24 * Math.floor(rt / 10));
      if (tgt < S.Rt) { S.Rt = tgt; S.wob = 1; k.sfx('pop'); k.float('¡El tatami encoge!', W2(CX), H2(CY) - 60, '#ffd166'); }
      S.R += (S.Rt - S.R) * Math.min(1, dt * 2); S.wob = Math.max(0, S.wob - dt);
      for (const pl of standing()) if (hyp(pl.x - CX, pl.y - CY) > S.R + pl.r * 0.15) fallOut(pl);
    },
    key: (pl) => -hyp(pl.x - CX, pl.y - CY),
    val: (pl) => (!pl.alive || pl.fall ? 'Fuera' : pl.chg > 0 ? 'Cargando ' + Math.round(pl.chg * 100) + ' %' : pl.brace ? 'Plantado' : 'En pie'),
    ai(pl, ai, s) {
      const [o, d] = near(pl); if (!o) return seek(pl, CX, CY);
      const dc = hyp(pl.x - CX, pl.y - CY); let mv;
      if (dc > S.R - 42) mv = seek(pl, CX, CY, 0.35);
      else { const ox = o.x - CX, oy = o.y - CY, L = hyp(ox, oy) || 1; mv = ai.chg ? seek(pl, o.x, o.y, 0) : seek(pl, o.x - ox / L * (o.r + pl.r + 14), o.y - oy / L * (o.r + pl.r + 14), 0.3); }
      if (ai.go) { ai.want = d < 120 && d > 28 && facing(pl, o, 0.6) && Math.random() < 0.4 + s * 0.5 ? lerp(0.3, 0.85, s) : 0;
        ai.brace = o.dash > 0 && d < 70 && dc > S.R - 70 && Math.random() < s; }
      if (ai.want && pl.chg < ai.want && pl.cd <= 0) { ai.chg = true; mv = seek(pl, o.x, o.y, 0); } else { ai.chg = false; ai.want = 0; }
      return { x: mv.x, y: mv.y, a: ai.chg, b: ai.brace };
    },
  },
  /* Pista de Hielo Loca: sin frenos; las baldosas se agrietan (al azar y bajo quien se queda quieto) y se abren agujeros. */
  hielo: {
    hint: ['Nadie frena', 'A: empujón', 'B: onda de choque'],
    init() { S.g = new Float32Array(121); S.st = new Float32Array(121); S.next = 4.5; S.cl = [];
      for (let i = 0; i < 121; i++) { const x = (i % 11) * 40 + 20, y = Math.floor(i / 11) * 40 + 20; S.g[i] = hyp(x - CX, y - CY) < 214 ? 0 : -2;
        const segs = []; let px = 20 + (rs(i) - 0.5) * 10, py = 20 + (rs(i + 3) - 0.5) * 10; for (let j = 0; j < 6; j++) { const a = rs(i * 7 + j) * TAU, L = 8 + rs(i * 5 + j) * 10; segs.push([px, py, px + Math.cos(a) * L, py + Math.sin(a) * L]); if (j % 2) { px += Math.cos(a) * L; py += Math.sin(a) * L; } } S.cl.push(segs); } },
    act(pl, inp) {
      if (inp.ah && pl.cd <= 0) { dash(pl, 210, 0.3, 140); pl.cd = 1.4; }
      if (inp.bh && pl.cd2 <= 0) { pl.cd2 = 4; waves.push({ x: pl.x, y: pl.y, t: 0, col: pl.col }); k.sfx('explode'); k.shake(3);
        for (const o of standing()) if (o !== pl) { const dx = o.x - pl.x, dy = o.y - pl.y, d = hyp(dx, dy); if (d < 78 && d > 0) { const f = 250 * (1 - d / 110); o.vx += dx / d * f; o.vy += dy / d * f; } } }
      return 1;
    },
    step(dt) {
      if (rt > S.next) { S.next = rt + lerp(1.3, 0.4, rt / 55); const sol = []; for (let i = 0; i < 121; i++) if (S.g[i] === 0) sol.push(i);
        if (sol.length) { let pick = k.pick(sol); const tg = k.pick(standing()); if (tg && Math.random() < 0.45) { const near2 = sol.filter((i) => hyp((i % 11) * 40 + 20 - tg.x, Math.floor(i / 11) * 40 + 20 - tg.y) < 90); if (near2.length) pick = k.pick(near2); } S.g[pick] = 0.01; } }
      for (const pl of standing()) { const t = tileAt(pl.x, pl.y); if (t >= 0 && S.g[t] === 0) { S.st[t] += dt; if (S.st[t] > 2.2) S.g[t] = 0.01; } }
      for (let i = 0; i < 121; i++) if (S.g[i] > 0) { S.g[i] += dt / 1.6; if (S.g[i] >= 1) { S.g[i] = -1; const x = (i % 11) * 40 + 20, y = Math.floor(i / 11) * 40 + 20; k.burst(W2(x), H2(y), '#bfe9ff', 16, 150); k.sfx('hit'); } }
      for (const pl of standing()) { const t = tileAt(pl.x, pl.y); if (t < 0 || S.g[t] < 0) fallOut(pl); }
    },
    key: (pl) => -hyp(pl.x - CX, pl.y - CY),
    val: (pl) => (!pl.alive || pl.fall ? 'Al agua' : 'Patinando'),
    ai(pl, ai, s) {
      if (ai.go || ai.tx == null) { let best = -1e9;
        for (let i = 0; i < 121; i++) { if (S.g[i] !== 0) continue; const x = (i % 11) * 40 + 20, y = Math.floor(i / 11) * 40 + 20; let nb = 0;
          for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = (i % 11) + u, yy = Math.floor(i / 11) + v; if (xx >= 0 && yy >= 0 && xx < 11 && yy < 11 && S.g[yy * 11 + xx] === 0) nb++; }
          const sc = -hyp(x - CX, y - CY) * 0.35 - hyp(x - pl.x, y - pl.y) * 0.3 + nb * 14 - S.st[i] * 10 + rs(i + round) * 8; if (sc > best) { best = sc; ai.tx = x; ai.ty = y; } }
        const [o, d] = near(pl); ai.atk = o && d < 100 && hyp(o.x - CX, o.y - CY) > 120 && facing(pl, o, 0.5) && Math.random() < s * 0.8; ai.shock = o && d < 60 && Math.random() < s * 0.5; }
      const mv = seek(pl, ai.tx, ai.ty, lerp(0.5, 1.1, s)); return { x: mv.x, y: mv.y, ah: ai.atk, bh: ai.shock };
    },
  },
  /* Pintacasillas: 30 s para pintar suelo; la pintura ajena resbala y cuesta repintarla; B = bomba de pintura 3×3. */
  pintar: {
    hint: ['Pinta el suelo', 'A: acelerón', 'B: bomba de pintura'],
    init() { S.pt = new Int8Array(121).fill(-1); S.rp = new Float32Array(121); S.rb = new Int8Array(121).fill(-1); S.cnt = [0, 0, 0, 0]; },
    paint(i, pl) { if (S.pt[i] !== pl.i) { if (S.pt[i] >= 0) S.cnt[S.pt[i]]--; S.pt[i] = pl.i; S.cnt[pl.i]++; } S.rp[i] = 0; },
    act(pl, inp) {
      if (inp.ah && pl.cd <= 0) { dash(pl, 230, 0.25, 90); pl.cd = 1.1; }
      if (inp.bh && pl.cd2 <= 0) { pl.cd2 = 5; const tx = Math.floor(pl.x / 40), ty = Math.floor(pl.y / 40);
        for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const x = tx + u, y = ty + v; if (x >= 0 && y >= 0 && x < 11 && y < 11) this.paint(y * 11 + x, pl); }
        k.burst(W2(pl.x), H2(pl.y), pl.col, 26, 200); k.sfx('pop'); }
      return pl.slip > 0 ? 0.35 : 1;
    },
    step(dt) {
      for (const pl of standing()) { pl.slip = Math.max(0, pl.slip - dt); const i = tileAt(pl.x, pl.y); if (i < 0) continue;
        if (S.pt[i] < 0 || S.pt[i] === pl.i) this.paint(i, pl);
        else { pl.slip = 0.3; if (S.rb[i] !== pl.i) { S.rb[i] = pl.i; S.rp[i] = 0; } S.rp[i] += dt / 0.45; if (S.rp[i] >= 1) { this.paint(i, pl); k.sfx('pop'); } } }
      P.forEach((pl) => (pl.val = S.cnt[pl.i]));
    },
    fr: (pl) => (pl.slip > 0 ? 0.9 : MD.fr),
    key: (pl) => S.cnt[pl.i],
    val: (pl) => Math.round(S.cnt[pl.i] / 1.21) + ' %',
    ai(pl, ai, s) {
      if (ai.go || ai.tx == null || hyp(ai.tx - pl.x, ai.ty - pl.y) < 14) { let best = -1e9; const tx = Math.floor(pl.x / 40), ty = Math.floor(pl.y / 40);
        for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) { const i = y * 11 + x, v = S.pt[i] < 0 ? 3 : S.pt[i] !== pl.i ? 2.2 : 0; if (!v) continue; const sc = v - hyp(x - tx, y - ty) * 0.55 + rs(i * 3 + pl.i + Math.floor(rt)) * 0.8; if (sc > best) { best = sc; ai.tx = x * 40 + 20; ai.ty = y * 40 + 20; } }
        if (ai.tx == null) { ai.tx = CX; ai.ty = CY; }
        let non = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const x = tx + u, y = ty + v; if (x >= 0 && y >= 0 && x < 11 && y < 11 && S.pt[y * 11 + x] !== pl.i) non++; }
        ai.bomb = non >= 5 && Math.random() < s; ai.dash = hyp(ai.tx - pl.x, ai.ty - pl.y) > 110 && Math.random() < s; }
      const mv = seek(pl, ai.tx, ai.ty, 0.15); return { x: mv.x, y: mv.y, ah: ai.dash, bh: ai.bomb };
    },
  },
  /* Rey de la Colina: la zona se desplaza; solo suma quien está solo dentro; A = empujón, B = salto corto. */
  colina: {
    hint: ['Quédate solo en la zona', 'A: empujón', 'B: salto'],
    init() { S.ph = k.rnd(0, 6); S.a = k.rnd(0, 6); S.zr = 66; S.owner = -1; S.cont = false; this.zpos(0); },
    zpos(ahead) { const ph = S.ph + ahead * lerp(0.3, 0.62, rt / MD.len); const x = CX + 135 * Math.sin(ph + S.a), y = CY + 130 * Math.sin(ph * 1.37); if (!ahead) { S.zx = x; S.zy = y; } return [x, y]; },
    act(pl, inp, dt) {
      if (inp.ah && pl.cd <= 0 && pl.zt <= 0) { dash(pl, 250, 0.28, 230); pl.cd = 0.9; }
      if (inp.bh && pl.cd2 <= 0 && pl.zt <= 0) { pl.zt = 0.5; pl.cd2 = 1; k.sfx('jump'); }
      if (pl.zt > 0) { pl.zt -= dt; pl.z = Math.sin(Math.PI * (1 - Math.max(0, pl.zt) / 0.5)) * 26; if (pl.zt <= 0) { pl.z = 0; k.burst(W2(pl.x), H2(pl.y + 8), '#e8e2ff', 8, 80); } }
      return 1;
    },
    step(dt) {
      S.ph += dt * lerp(0.3, 0.62, rt / MD.len); S.zr = lerp(66, 54, rt / MD.len); this.zpos(0);
      const inn = standing().filter((pl) => pl.z <= 0 && hyp(pl.x - S.zx, pl.y - S.zy) < S.zr);
      S.cont = inn.length > 1; const was = S.owner; S.owner = inn.length === 1 ? inn[0].i : -1;
      if (S.owner >= 0) { P[S.owner].val += dt; if (was !== S.owner) k.sfx('coin'); }
    },
    key: (pl) => pl.val,
    val: (pl) => pl.val.toFixed(1) + ' s',
    ai(pl, ai, s) {
      const [zx, zy] = this.zpos(0.6), inZ = hyp(pl.x - S.zx, pl.y - S.zy) < S.zr; let mv = seek(pl, zx, zy, 0.25);
      if (ai.go) { const [o, d] = near(pl); ai.push = inZ && o && d < 85 && hyp(o.x - S.zx, o.y - S.zy) < S.zr + 10 && Math.random() < 0.3 + s * 0.6 ? o : null; ai.jump = o && o.dash > 0 && d < 70 && Math.random() < s * 0.7; }
      if (ai.push && ai.push.alive) { mv = seek(pl, ai.push.x, ai.push.y, 0); return { x: mv.x, y: mv.y, ah: facing(pl, ai.push, 0.4), bh: ai.jump }; }
      return { x: mv.x, y: mv.y, bh: ai.jump };
    },
  },
  /* Patata Explosiva: la bomba pasa al tocar a otro; la mecha es secreta (8–15 s); no se puede devolver al instante. */
  patata: {
    hint: ['Pasa la bomba tocando', 'A: acelerón', 'B: finta lateral'],
    init() { S.hold = -1; S.fuse = 0; S.wait = 0.2; S.nb = -1; S.nbT = 0; S.tk = 0; },
    act(pl, inp) {
      if (inp.ah && pl.cd <= 0) { dash(pl, 250, 0.25, 50); pl.cd = 1.3; }
      if (inp.bh && pl.cd2 <= 0) { const s = inp.x * -pl.fy + inp.y * pl.fx >= 0 ? 1 : -1; pl.vx += -pl.fy * s * 240; pl.vy += pl.fx * s * 240; pl.cd2 = 1.4; k.sfx('jump'); }
      return 1;
    },
    spd: (pl) => (S.hold === pl.i ? 1.12 : 1),
    give(pl, first) { S.hold = pl.i; S.fuse = first ? k.rnd(9, 15) : k.rnd(8, 14); k.sfx('pop'); k.float('¡La bomba!', W2(pl.x), H2(pl.y) - 30, pl.col); },
    step(dt) {
      S.nbT -= dt;
      if (S.hold < 0) { S.wait -= dt; if (S.wait <= 0) { const al = standing(); if (al.length) this.give(k.pick(al), elimOrder.length === 0); } return; }
      S.fuse -= dt; S.tk -= dt; if (S.tk <= 0) { S.tk = k.rnd(0.35, 0.6); k.sfx('click'); }
      if (S.fuse <= 0) { const h = P[S.hold]; S.hold = -1; S.wait = 1.6; k.sfx('explode'); k.shake(11); k.flash('rgba(255,170,80,.5)');
        k.burst(W2(h.x), H2(h.y), '#ffb13d', 40, 320); k.burst(W2(h.x), H2(h.y), '#1a1530', 20, 200); k.float('¡BUM!', W2(h.x), H2(h.y) - 20, '#ffd166');
        for (const o of standing()) if (o !== h) { const dx = o.x - h.x, dy = o.y - h.y, d = hyp(dx, dy) || 1; if (d < 120) { o.vx += dx / d * 260 * (1 - d / 120); o.vy += dy / d * 260 * (1 - d / 120); } }
        eliminate(h); }
    },
    hit(a, b) { for (const [x, y] of [[a, b], [b, a]]) if (S.hold === x.i && y.alive && !y.fall && (S.nbT <= 0 || y.i !== S.nb)) { S.hold = y.i; S.nb = x.i; S.nbT = 1; y.stun = 0.15; k.sfx('pop'); k.float('¡Toma!', W2(y.x), H2(y.y) - 28, x.col); return; } },
    key: () => 0,
    val: (pl) => (!pl.alive ? '¡Bum!' : S.hold === pl.i ? '¡Tiene la bomba!' : 'A salvo'),
    ai(pl, ai, s) {
      const al = standing();
      if (S.hold === pl.i) { const [o, d] = near(pl, al.filter((q) => S.nbT <= 0 || q.i !== S.nb)); if (!o) return { x: 0, y: 0 }; const mv = seek(pl, o.x + o.vx * 0.3, o.y + o.vy * 0.3, 0.1); if (ai.go) ai.dash = d < 90 && facing(pl, o, 0.5) && Math.random() < 0.3 + s * 0.6; return { x: mv.x, y: mv.y, ah: ai.dash }; }
      if (S.hold < 0) return seek(pl, CX + (pl.x - CX) * 0.9, CY + (pl.y - CY) * 0.9);
      const h = P[S.hold], dx = pl.x - h.x, dy = pl.y - h.y, d = hyp(dx, dy) || 1; let x = dx / d, y = dy / d;
      x += (CX - pl.x) / 150; y += (CY - pl.y) / 150; /* no dejarse acorralar en una esquina */
      if (d > 170) { x *= 0.3; y *= 0.3; }
      if (ai.go) ai.fint = d < 60 && Math.random() < s * 0.8; return { x, y, bh: ai.fint };
    },
  },
  /* Coge la Corona: quien la lleva suma tiempo (y va algo más lento); un placaje con acelerón o un choque fuerte la roba. */
  corona: {
    hint: ['Lleva la corona', 'A: placaje', 'Choca fuerte para robarla'],
    init() { S.h = -1; S.x = CX; S.y = CY; S.inv = 0; },
    act(pl, inp) { if (inp.ah && pl.cd <= 0) { const own = S.h === pl.i; dash(pl, own ? 200 : 270, 0.28, own ? 40 : 120); pl.cd = own ? 1.8 : 1.1; } return 1; },
    spd: (pl) => (S.h === pl.i ? 0.87 : 1),
    step(dt) {
      S.inv -= dt;
      if (S.h < 0) { for (const pl of standing()) if (hyp(pl.x - S.x, pl.y - S.y) < pl.r + 14) { S.h = pl.i; S.inv = 1; k.sfx('coin'); k.float('¡Corona!', W2(pl.x), H2(pl.y) - 30, '#ffd166'); break; } }
      else { const h = P[S.h]; h.val += dt; S.x = h.x; S.y = h.y; }
    },
    hit(a, b, imp) { for (const [h, o] of [[a, b], [b, a]]) if (S.h === h.i && S.inv <= 0 && (o.dash > 0 || imp > 170)) { S.h = o.i; S.inv = 1.3; h.stun = 0.5; k.sfx('coin'); k.burst(W2(h.x), H2(h.y) - 20, '#ffd166', 20, 180); k.float('¡Robada!', W2(o.x), H2(o.y) - 30, o.col); return; } },
    key: (pl) => pl.val,
    val: (pl) => pl.val.toFixed(1) + ' s',
    ai(pl, ai, s) {
      if (S.h < 0) return seek(pl, S.x, S.y, 0.2);
      if (S.h === pl.i) { let x = 0, y = 0; for (const o of standing()) if (o !== pl) { const dx = pl.x - o.x, dy = pl.y - o.y, d = hyp(dx, dy) || 1; x += dx / d / Math.max(0.3, d / 80); y += dy / d / Math.max(0.3, d / 80); }
        x += (CX - pl.x) / 110; y += (CY - pl.y) / 110; return { x, y }; }
      const h = P[S.h], d = hyp(h.x - pl.x, h.y - pl.y), ld = lerp(0.1, 0.45, s), mv = seek(pl, h.x + h.vx * ld, h.y + h.vy * ld, 0.15);
      if (ai.go) ai.dash = d < 95 && S.inv <= 0.2 && Math.random() < 0.3 + s * 0.6; return { x: mv.x, y: mv.y, ah: ai.dash && facing(pl, h, 0.45) };
    },
  },
  /* Choque de Carritos: coches de choque; golpear por detrás pincha un globo del rival (+1 toque). Sin globos, fuera. */
  carritos: {
    hint: ['Golpea por detrás', 'A: turbo', 'B: marcha atrás'],
    init() { P.forEach((pl) => (pl.r = 17)); },
    act() { return 1; },
    step(dt) { for (const pl of P) { pl.turbo = Math.max(0, pl.turbo - dt); } },
    hit(a, b, imp) {
      for (const [at, vi] of [[a, b], [b, a]]) {
        if (vi.inv > 0 || !vi.alive || vi.fall || imp < 45) continue;
        const dx = at.x - vi.x, dy = at.y - vi.y, d = hyp(dx, dy) || 1, rear = (-Math.cos(vi.h) * dx - Math.sin(vi.h) * dy) / d, front = (Math.cos(at.h) * -dx + Math.sin(at.h) * -dy) / d;
        if (rear > 0.45 && front > 0.3) { vi.balloons--; vi.inv = 0.8; at.val++; k.sfx('pop'); k.burst(W2(vi.x - Math.cos(vi.h) * 34), H2(vi.y - Math.sin(vi.h) * 34), vi.col, 18, 200); k.float('+1', W2(at.x), H2(at.y) - 28, at.col);
          vi.h += k.rnd(-0.6, 0.6); if (vi.balloons <= 0) { fallOut(vi); k.shake(5); } return; }
      }
    },
    key: (pl) => pl.balloons * 100 + pl.val,
    val: (pl) => (!pl.alive || pl.fall ? 'Fuera · ' : '') + 'Toques ' + pl.val,
    ai(pl, ai, s) {
      const al = standing().filter((o) => o !== pl); if (!al.length) return { x: 0, y: 0 };
      if (ai.go || !ai.tg || !ai.tg.alive || ai.tg.fall) { let best = 1e9; for (const o of al) { const sc = hyp(o.x - pl.x, o.y - pl.y) - (o.balloons < pl.balloons ? 30 : 0) + Math.random() * 40; if (sc < best) { best = sc; ai.tg = o; } }
        ai.evade = null; for (const o of al) { const dx = pl.x - o.x, dy = pl.y - o.y, d = hyp(dx, dy); if (d < 90 && (Math.cos(o.h) * dx + Math.sin(o.h) * dy) / d > 0.7 && (-Math.cos(pl.h) * -dx - Math.sin(pl.h) * -dy) / d > 0.3 && Math.random() < s) ai.evade = o; } }
      if (ai.evade) { const sgn = (pl.i % 2 ? 1 : -1); return { x: -Math.sin(pl.h) * sgn + Math.cos(pl.h) * 0.4, y: Math.cos(pl.h) * sgn + Math.sin(pl.h) * 0.4 }; }
      const o = ai.tg, tx = o.x - Math.cos(o.h) * 30 + o.vx * 0.3, ty = o.y - Math.sin(o.h) * 30 + o.vy * 0.3; let x = tx - pl.x, y = ty - pl.y; const d = hyp(x, y) || 1; x /= d; y /= d;
      const behind = (-Math.cos(o.h) * (pl.x - o.x) - Math.sin(o.h) * (pl.y - o.y)) / (hyp(pl.x - o.x, pl.y - o.y) || 1);
      const turbo = d < 160 && behind > 0.2 && Math.abs(adiff(Math.atan2(y, x) - pl.h)) < 0.35 && Math.random() < 0.2 + s * 0.6;
      if (pl.x < 40 || pl.x > AW - 40 || pl.y < 40 || pl.y > AW - 40) { x += (CX - pl.x) / 120; y += (CY - pl.y) / 120; }
      return { x, y, ah: turbo };
    },
  },
  /* Quita la Silla: el suelo gira mientras suena la música; al pararse, a por una silla. Siempre falta una. */
  silla: {
    hint: ['Da vueltas con la música', 'Al parar: ¡a una silla!', 'A: empujón'],
    init() { S.st = 'music'; S.t = k.rnd(5, 8); S.stopT = 0; this.chairs(); P.forEach((pl, i) => { const a = i * TAU / 4 + 0.785; pl.x = CX + Math.cos(a) * 150; pl.y = CY + Math.sin(a) * 150; }); },
    chairs() { const n = standing().length - 1, a0 = k.rnd(0, TAU); S.ch = []; for (let j = 0; j < n; j++) { const a = a0 + j * TAU / n; S.ch.push({ x: CX + Math.cos(a) * 52, y: CY + Math.sin(a) * 52, a, occ: -1 }); } },
    act(pl, inp) { if (inp.ah && pl.cd <= 0 && pl.seat < 0) { dash(pl, 240, 0.28, 200); pl.cd = 1; } return pl.seat >= 0 ? 0 : 1; },
    stop() { S.st = 'end'; },
    step(dt) {
      if (S.st === 'music') {
        mbt -= dt; if (mbt <= 0) { mbt = 0.2; const f = MEL[mi++ % MEL.length]; note(f, 0.18, 0.06, 'square'); if (mi % 2) note(f / 4, 0.3, 0.08, 'triangle'); if (mi % 3 === 0) k.float('♪', W2(CX + k.rnd(-30, 30)), H2(CY - 10), k.pick(['#ffd166', '#5ce1e6', '#ff9ad5'])); }
        const w = lerp(0.55, 0.8, rt / 40) * dt;
        for (const pl of standing()) { const dx = pl.x - CX, dy = pl.y - CY; pl.x = CX + dx * Math.cos(w) - dy * Math.sin(w); pl.y = CY + dx * Math.sin(w) + dy * Math.cos(w);
          const d = hyp(pl.x - CX, pl.y - CY), mn = 88 + pl.r; if (d < mn) { pl.x = CX + (pl.x - CX) / d * mn; pl.y = CY + (pl.y - CY) / d * mn; const vn = (pl.vx * (pl.x - CX) + pl.vy * (pl.y - CY)) / mn; if (vn < 0) { pl.vx -= vn * (pl.x - CX) / mn; pl.vy -= vn * (pl.y - CY) / mn; } } }
        S.t -= dt; if (S.t <= 0) { S.st = 'scr'; S.t = 7; S.stopT = rt; k.sfx('go'); k.flash('rgba(255,255,255,.3)'); for (const pl of P) pl.ai.react = lerp(0.65, 0.18, skill()) + k.rnd(0, 0.3); }
      } else if (S.st === 'scr') {
        for (const pl of standing()) if (pl.seat < 0) for (let j = 0; j < S.ch.length; j++) { const ch = S.ch[j]; if (ch.occ < 0 && hyp(pl.x - ch.x, pl.y - ch.y) < pl.r + 13) { ch.occ = pl.i; pl.seat = j; pl.x = ch.x; pl.y = ch.y; pl.vx = pl.vy = 0; k.sfx('coin'); k.float('¡Sentado!', W2(pl.x), H2(pl.y) - 26, pl.col); break; } }
        const up = standing().filter((pl) => pl.seat < 0); S.t -= dt;
        if (S.ch.every((ch) => ch.occ >= 0) || S.t <= 0) {
          let loser = up[0]; if (up.length > 1) { let far = -1; for (const pl of up) { let dm = 1e9; for (const ch of S.ch) if (ch.occ < 0) dm = Math.min(dm, hyp(pl.x - ch.x, pl.y - ch.y)); if (dm > far) { far = dm; loser = pl; } } }
          if (loser) { k.sfx('lose'); k.shake(5); k.burst(W2(loser.x), H2(loser.y), loser.col, 24, 200); k.float('¡Sin silla!', W2(loser.x), H2(loser.y) - 26, loser.col); eliminate(loser); }
          for (const pl of standing()) pl.val++; S.st = 'gap'; S.t = 1.5;
        }
      } else if (S.st === 'gap') {
        S.t -= dt; if (S.t <= 0 && standing().length > 1) { const al = standing(); al.forEach((pl, j) => { pl.seat = -1; const a = Math.atan2(pl.y - CY, pl.x - CX) + j * 0.01; pl.x = CX + Math.cos(a) * 150; pl.y = CY + Math.sin(a) * 150; pl.vx = pl.vy = 0; });
          this.chairs(); S.st = 'music'; S.t = k.rnd(3.5, 8.5); }
      }
    },
    key: (pl) => pl.val,
    val: (pl) => (!pl.alive ? 'Sin silla' : pl.seat >= 0 ? 'Sentado' : 'De pie'),
    ai(pl, ai, s) {
      if (pl.seat >= 0) return { x: 0, y: 0 };
      if (S.st === 'music' || S.st === 'gap') { const a = Math.atan2(pl.y - CY, pl.x - CX) + 0.5, rr = lerp(140, 108, s); return seek(pl, CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, 0.2); }
      if (rt - S.stopT < (ai.react || 0.3)) return { x: 0, y: 0 };
      let best = null, bd = 1e9; for (const ch of S.ch) if (ch.occ < 0) { const d = hyp(pl.x - ch.x, pl.y - ch.y); let rival = 1e9; for (const o of standing()) if (o !== pl && o.seat < 0) rival = Math.min(rival, hyp(o.x - ch.x, o.y - ch.y)); const sc = d + (rival < d ? 40 * s : 0); if (sc < bd) { bd = sc; best = ch; } }
      if (!best) return { x: 0, y: 0 }; const mv = seek(pl, best.x, best.y, 0.15), [o, od] = near(pl, standing().filter((q) => q.seat < 0));
      return { x: mv.x, y: mv.y, ah: o && od < 45 && Math.random() < s * 0.3 && facing(pl, o, 0.5) };
    },
  },
  /* Glotones del Estanque: come bolitas y renacuajos para crecer; come a los rivales más pequeños (≥ 18 % menores). */
  glotones: {
    hint: ['Come y crece', 'Huye de los grandes', 'A: acelerón'],
    init() { S.food = []; for (let i = 0; i < 55; i++) S.food.push(this.spot({ t: i % 3, rsp: 0 })); S.tad = []; for (let i = 0; i < 5; i++) S.tad.push(this.spot({ vx: 0, vy: 0, rsp: 0, a: k.rnd(0, TAU) })); P.forEach((pl) => this.grow(pl)); },
    spot(o) { const a = k.rnd(0, TAU), d = Math.sqrt(Math.random()) * 195; o.x = CX + Math.cos(a) * d; o.y = CY + Math.sin(a) * d; return o; },
    grow(pl) { pl.r = 7 + Math.sqrt(pl.m) * 2.6; },
    act(pl, inp) { if (inp.ah && pl.cd <= 0) { dash(pl, 260, 0.25, 40); pl.cd = 1.6; if (pl.m > 14) pl.m -= 1; } return 1; },
    spd: (pl) => Math.sqrt(16 / pl.r),
    eat(big, sm) { big.m = Math.min(260, big.m + sm.m * 0.75); sm.gone = 2.2; sm.m = 10; this.grow(sm); k.sfx('explode'); k.burst(W2(sm.x), H2(sm.y), sm.col, 26, 220); k.float('¡Ñam!', W2(big.x), H2(big.y) - big.r - 12, big.col); this.grow(big); },
    pass(a, b, d) {
      if (a.inv > 0 || b.inv > 0) return false;
      for (const [x, y] of [[a, b], [b, a]]) if (x.r > y.r * 1.18) { if (d < x.r - y.r * 0.3) this.eat(x, y); return true; }
      return false;
    },
    step(dt) {
      for (const pl of P) { if (pl.gone > 0) { pl.gone -= dt; if (pl.gone <= 0) { this.spot(pl); let tries = 0; while (tries++ < 20 && P.some((o) => o !== pl && !o.gone && hyp(o.x - pl.x, o.y - pl.y) < 90)) this.spot(pl); pl.vx = pl.vy = 0; pl.inv = 2; } continue; }
        if (pl.m > 40) pl.m -= pl.m * 0.005 * dt; this.grow(pl); }
      for (const f of S.food) { if (f.rsp > 0) { f.rsp -= dt; continue; } for (const pl of P) if (!pl.gone && pl.alive && hyp(pl.x - f.x, pl.y - f.y) < pl.r + 3) { pl.m += 1; f.rsp = 1.2; this.spot(f); if (!pl.cpu) k.sfx('click'); break; } }
      for (const t of S.tad) { if (t.rsp > 0) { t.rsp -= dt; continue; } t.a += k.rnd(-2, 2) * dt; let fx = Math.cos(t.a) * 50, fy = Math.sin(t.a) * 50;
        for (const pl of P) if (!pl.gone) { const dx = t.x - pl.x, dy = t.y - pl.y, d = hyp(dx, dy) || 1; if (d < 80) { fx += dx / d * 120; fy += dy / d * 120; } if (d < pl.r + 5) { pl.m += 4; t.rsp = 3; this.spot(t); k.sfx('coin'); k.float('+4', W2(pl.x), H2(pl.y) - pl.r - 10, '#7cf7a0'); break; } }
        t.vx += (fx - t.vx) * dt * 2; t.vy += (fy - t.vy) * dt * 2; t.x += t.vx * dt; t.y += t.vy * dt; const d = hyp(t.x - CX, t.y - CY); if (d > 200) { t.x = CX + (t.x - CX) / d * 200; t.y = CY + (t.y - CY) / d * 200; t.a += Math.PI; } }
      P.forEach((pl) => (pl.val = Math.round(pl.m)));
    },
    key: (pl) => pl.m,
    val: (pl) => (pl.gone > 0 ? '¡Comido!' : 'Tamaño ' + Math.round(pl.m)),
    ai(pl, ai, s) {
      if (ai.go || ai.x == null) { let x = 0, y = 0, best = 0, tx = null, ty = null;
        for (const f of S.food) if (f.rsp <= 0) { const d = hyp(f.x - pl.x, f.y - pl.y), v = 1 / (d + 20); if (v > best) { best = v; tx = f.x; ty = f.y; } }
        for (const t of S.tad) if (t.rsp <= 0) { const d = hyp(t.x - pl.x, t.y - pl.y), v = 3 / (d + 30); if (v > best) { best = v; tx = t.x; ty = t.y; } }
        ai.hunt = false;
        for (const o of P) if (o !== pl && !o.gone && o.inv <= 0) { const d = hyp(o.x - pl.x, o.y - pl.y);
          if (pl.r > o.r * 1.2 && pl.inv <= 0) { const v = (o.m / 4) / (d + 30) * s * 2; if (v > best) { best = v; tx = o.x + o.vx * 0.4; ty = o.y + o.vy * 0.4; ai.hunt = d < 110; } }
          if (o.r > pl.r * 1.18 && d < 110 + o.r) { const w = (130 + o.r - d) / 60 * (0.5 + s); x += (pl.x - o.x) / d * w; y += (pl.y - o.y) / d * w; } }
        if (tx != null) { const d = hyp(tx - pl.x, ty - pl.y) || 1; x += (tx - pl.x) / d; y += (ty - pl.y) / d; }
        x += (CX - pl.x) / 400; y += (CY - pl.y) / 400; ai.x = x; ai.y = y; }
      return { x: ai.x, y: ai.y, ah: ai.hunt && Math.random() < s * 0.08 };
    },
  },
  /* Perros Pastores: cada perro mete ovejas en su redil (esquina de su color). A = ladrido, B = quieto (las ovejas se calman). */
  pastores: {
    hint: ['Lleva ovejas a tu redil', 'A: ladrar', 'B: quieto'],
    init() { S.sh = []; for (let i = 0; i < 14; i++) { const a = k.rnd(0, TAU), d = k.rnd(0, 70); S.sh.push({ x: CX + Math.cos(a) * d, y: CY + Math.sin(a) * d, vx: 0, vy: 0, fx: 1, fy: 0, r: 10, pen: -1, ph: k.rnd(0, 6), wa: k.rnd(0, TAU) }); }
      P.forEach((pl, i) => { const pn = PEN[i]; pl.x = pn.x + Math.cos(pn.ma) * (PR + 34); pl.y = pn.y + Math.sin(pn.ma) * (PR + 34); }); },
    act(pl, inp) {
      pl.lie = !!inp.b;
      if (inp.ah && pl.cd <= 0) { pl.cd = 1.6; pl.bark = 0.4; waves.push({ x: pl.x, y: pl.y, t: 0, col: pl.col }); k.sfx('shoot');
        for (const s of S.sh) if (s.pen < 0) { const dx = s.x - pl.x, dy = s.y - pl.y, d = hyp(dx, dy) || 1; if (d < 150) { const f = 80 + 200 * (1 - d / 150); s.vx += dx / d * f; s.vy += dy / d * f; } } }
      return pl.lie ? 0 : 1;
    },
    fence(e, i, dog) {
      const pn = PEN[i], dx = e.x - pn.x, dy = e.y - pn.y, d = hyp(dx, dy) || 1;
      if (dog) { if (d < PR + e.r) { e.x = pn.x + dx / d * (PR + e.r); e.y = pn.y + dy / d * (PR + e.r); const vn = (e.vx * dx + e.vy * dy) / d; if (vn < 0) { e.vx -= vn * dx / d; e.vy -= vn * dy / d; } } return; }
      if (e.pen === i) { if (d > PR - 12) { e.x = pn.x + dx / d * (PR - 12); e.y = pn.y + dy / d * (PR - 12); e.vx *= -0.3; e.vy *= -0.3; } return; }
      if (Math.abs(d - PR) > e.r + 2) return;
      if (Math.abs(adiff(Math.atan2(dy, dx) - pn.ma)) < HALF) return; /* hueco de la puerta */
      const tgt = d < PR ? PR - e.r - 2 : PR + e.r + 2; e.x = pn.x + dx / d * tgt; e.y = pn.y + dy / d * tgt; const vn = (e.vx * dx + e.vy * dy) / d; e.vx -= 1.4 * vn * dx / d; e.vy -= 1.4 * vn * dy / d;
    },
    step(dt) {
      for (const pl of P) { pl.bark = Math.max(0, pl.bark - dt); if (pl.alive) for (let i = 0; i < 4; i++) this.fence(pl, i, true); }
      const free = S.sh.filter((s) => s.pen < 0); let mx = 0, my = 0; free.forEach((s) => { mx += s.x; my += s.y; }); if (free.length) { mx /= free.length; my /= free.length; }
      for (const s of S.sh) {
        let fx = 0, fy = 0;
        if (s.pen < 0) {
          s.wa += k.rnd(-2, 2) * dt; fx += Math.cos(s.wa) * 25; fy += Math.sin(s.wa) * 25; fx += (mx - s.x) * 0.25; fy += (my - s.y) * 0.25;
          for (const pl of P) { if (!pl.alive || pl.lie) continue; const dx = s.x - pl.x, dy = s.y - pl.y, d = hyp(dx, dy) || 1; if (d < 95) { const f = 480 * (1 - d / 95) + 60; fx += dx / d * f; fy += dy / d * f; } }
        } else { const pn = PEN[s.pen]; s.wa += k.rnd(-2, 2) * dt; fx += Math.cos(s.wa) * 15 + (pn.x + Math.cos(pn.ma) * 45 - s.x) * 0.3; fy += Math.sin(s.wa) * 15 + (pn.y + Math.sin(pn.ma) * 45 - s.y) * 0.3; }
        for (const o of S.sh) if (o !== s) { const dx = s.x - o.x, dy = s.y - o.y, d = hyp(dx, dy); if (d < 22 && d > 0.01) { fx += dx / d * (22 - d) * 14; fy += dy / d * (22 - d) * 14; } }
        s.vx += fx * dt * 3; s.vy += fy * dt * 3; const f = Math.exp(-2.6 * dt); s.vx *= f; s.vy *= f;
        const sp = hyp(s.vx, s.vy), mxs = s.pen < 0 ? 140 : 40; if (sp > mxs) { s.vx *= mxs / sp; s.vy *= mxs / sp; } if (sp > 8) { s.fx = s.vx / sp; s.fy = s.vy / sp; }
        s.x += s.vx * dt; s.y += s.vy * dt;
        for (const pl of P) { if (!pl.alive) continue; const dx = s.x - pl.x, dy = s.y - pl.y, d = hyp(dx, dy), mn = s.r + pl.r; if (d < mn && d > 0.01) { s.x = pl.x + dx / d * mn; s.y = pl.y + dy / d * mn; } }
        s.x = Math.max(s.r, Math.min(AW - s.r, s.x)); s.y = Math.max(s.r, Math.min(AW - s.r, s.y));
        for (let i = 0; i < 4; i++) this.fence(s, i, false);
        if (s.pen < 0) for (const pn of PEN) if (hyp(s.x - pn.x, s.y - pn.y) < PR - 16) { s.pen = pn.i; P[pn.i].val++; k.sfx('coin'); k.burst(W2(s.x), H2(s.y), P[pn.i].col, 14, 140); k.float('+1', W2(s.x), H2(s.y) - 18, P[pn.i].col); break; }
      }
    },
    done: () => S.sh.every((s) => s.pen >= 0),
    key: (pl) => pl.val,
    val: (pl) => pl.val + (pl.val === 1 ? ' oveja' : ' ovejas'),
    ai(pl, ai, s) {
      const pn = PEN[pl.i], gIn = [pn.x + Math.cos(pn.ma) * 30, pn.y + Math.sin(pn.ma) * 30], gOut = [pn.x + Math.cos(pn.ma) * (PR + 28), pn.y + Math.sin(pn.ma) * (PR + 28)];
      if (ai.go || !ai.sh || ai.sh.pen >= 0) { let best = 1e9; ai.sh = null; for (const sh of S.sh) if (sh.pen < 0) { const sc = hyp(sh.x - pl.x, sh.y - pl.y) + hyp(sh.x - gOut[0], sh.y - gOut[1]) * 0.8 + Math.random() * 30 * (1 - s); if (sc < best) { best = sc; ai.sh = sh; } } }
      const sh = ai.sh; if (!sh) return seek(pl, gOut[0], gOut[1]);
      const dm = hyp(sh.x - gOut[0], sh.y - gOut[1]), goal = dm < 40 ? gIn : gOut, gx = sh.x - goal[0], gy = sh.y - goal[1], gl = hyp(gx, gy) || 1;
      const bx = sh.x + gx / gl * 40, by = sh.y + gy / gl * 40, db = hyp(bx - pl.x, by - pl.y);
      if (db > 24) { const wrong = ((pl.x - sh.x) * -gx + (pl.y - sh.y) * -gy) / gl > 0 && hyp(pl.x - sh.x, pl.y - sh.y) < 110; const mv = seek(pl, bx, by, 0.1);
        if (wrong) { const px = -gy / gl, py = gx / gl, sg = (pl.x - sh.x) * px + (pl.y - sh.y) * py >= 0 ? 1 : -1; mv.x += px * sg * 1.4; mv.y += py * sg * 1.4; mv.x += (pl.x - sh.x) / 120; mv.y += (pl.y - sh.y) / 120; }
        return { x: mv.x, y: mv.y, b: false }; }
      const mv = seek(pl, sh.x - gx / gl * 10, sh.y - gy / gl * 10, 0.1); if (ai.go) ai.bark = dm < 120 && Math.random() < s * 0.5;
      return { x: mv.x * lerp(0.55, 0.8, s), y: mv.y * lerp(0.55, 0.8, s), ah: ai.bark };
    },
  },
};

/* ---------------------------------------------------------------- Bucle */
reset(); k.show(CFG.title, CFG.help);
let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if ((innerHeight > innerWidth * 1.05) !== PORT && k.st !== 'play') location.reload(); }, 350); });
k.run((dt) => {
  T += dt; waves.forEach((w) => (w.t += dt)); waves = waves.filter((w) => w.t < 0.5);
  if (!k.gate(reset)) return;
  if (phase === 'between') { btw -= dt; for (const pl of P) { pl.vx *= 0.9; pl.vy *= 0.9; } if (btw <= 0) { if (round >= MD.rounds) finish(); else newRound(); } return; }
  if (cdPend) { cdPend = false; k.count(3); }
  if (k.counting()) return;
  rt += dt; const md = MODES[M];
  for (const pl of P) {
    pl.cd -= dt; pl.cd2 -= dt; pl.dash = Math.max(0, pl.dash - dt); pl.stun = Math.max(0, pl.stun - dt); pl.inv = Math.max(0, pl.inv - dt);
    if (!pl.alive || pl.gone > 0) continue;
    if (pl.fall) { pl.fall += dt; pl.vx *= 0.95; pl.vy *= 0.95; pl.x += pl.vx * dt; pl.y += pl.vy * dt; if (pl.fall > 0.7) eliminate(pl); continue; }
    if (pl.seat >= 0) continue;
    control(pl, pl.cpu ? AI(pl, dt) : human(pl), dt);
  }
  for (const pl of P) {
    if (!pl.alive || pl.fall || pl.gone > 0 || pl.seat >= 0) continue;
    if (!MD.car) { const f = Math.exp(-(md.fr ? md.fr(pl) : MD.fr) * dt); pl.vx *= f; pl.vy *= f;
      const mx = MD.max * spdK() * (md.spd ? md.spd(pl) : 1), sp = hyp(pl.vx, pl.vy); if (pl.dash <= 0 && sp > mx) { const q = Math.max(mx / sp, 1 - 5 * dt); pl.vx *= q; pl.vy *= q; } }
    pl.x += pl.vx * dt; pl.y += pl.vy * dt;
  }
  const act = P.filter((pl) => pl.alive && !pl.fall && !(pl.gone > 0) && pl.z <= 0);
  for (let it = 0; it < 2; it++) for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) collide(act[i], act[j]);
  for (const pl of act) walls(pl);
  md.step(dt);
  const falling = P.some((pl) => pl.alive && pl.fall);
  if (MD.elim) { if (standing().length <= 1 && !falling) endRound(); else if (MD.len && rt >= MD.len && !falling) endRound(); }
  else if (rt >= MD.len || (md.done && md.done())) endRound();
}, draw);

/* ---------------------------------------------------------------- Dibujo */
function drawWorld() {
  const md = MODES[M];
  if (M === 'sumo') { const R = S.R + Math.sin(T * 10) * 4 * S.wob;
    c.beginPath(); c.arc(CX, CY + 6, R + 10, 0, TAU); c.fillStyle = 'rgba(0,0,0,.3)'; c.fill();
    c.beginPath(); c.arc(CX, CY, R, 0, TAU); const g = c.createRadialGradient(CX - 40, CY - 50, 10, CX, CY, R); g.addColorStop(0, '#f5ead0'); g.addColorStop(1, '#cdb279'); c.fillStyle = g; c.fill();
    c.strokeStyle = alpha('#8a6a3a', 0.35); c.lineWidth = 2; for (let r2 = R - 30; r2 > 20; r2 -= 30) { c.beginPath(); c.arc(CX, CY, r2, 0, TAU); c.stroke(); }
    c.fillStyle = '#fff'; c.fillRect(CX - 26, CY - 14, 18, 5); c.fillRect(CX + 8, CY + 9, 18, 5);
    c.beginPath(); c.arc(CX, CY, R, 0, TAU); c.lineWidth = 20; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 15; c.strokeStyle = rt > 0 && (Math.floor(rt) % 10) >= 8 && S.Rt > 100 ? (Math.sin(T * 20) > 0 ? '#ff8a6a' : '#e8554e') : '#e8554e'; c.stroke();
    c.beginPath(); c.arc(CX, CY, R - 2, 3.4, 5.2); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.45)'; c.stroke();
    c.setLineDash([5, 7]); c.beginPath(); c.arc(CX, CY, R + 4, 0, TAU); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.6)'; c.stroke(); c.setLineDash([]);
  }
  if (M === 'hielo') for (let i = 0; i < 121; i++) { const v = S.g[i]; if (v < 0) continue; const x = (i % 11) * 40, y = Math.floor(i / 11) * 40, sh = v > 0.6 ? (Math.random() - 0.5) * 2 * v : 0;
    c.drawImage(ICE, x + sh, y, 40, 40);
    if (v > 0) { c.fillStyle = alpha('#0a1f3d', v * 0.45); ART.rr(c, x + 2 + sh, y + 2, 36, 36, 6); c.fill(); c.strokeStyle = alpha(OUT, 0.75); c.lineWidth = 1.6; c.beginPath(); const segs = S.cl[i], n = Math.ceil(v * segs.length); for (let j = 0; j < n; j++) { const s = segs[j]; c.moveTo(x + s[0] + sh, y + s[1]); c.lineTo(x + s[2] + sh, y + s[3]); } c.stroke(); }
    else if (S.st[i] > 1.2) { c.strokeStyle = alpha('#fff', 0.7); c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + 12, y + 20); c.lineTo(x + 28, y + 22); c.stroke(); } }
  if (M === 'pintar') for (let i = 0; i < 121; i++) { const o = S.pt[i], x = (i % 11) * 40, y = Math.floor(i / 11) * 40;
    if (o >= 0) { const col = P[o].col; ART.rr(c, x + 3, y + 3, 34, 34, 8); c.fillStyle = col; c.fill(); c.lineWidth = 1.5; c.strokeStyle = alpha(OUT, 0.4); c.stroke(); c.fillStyle = alpha(lite(col, 0.5), 0.8); c.beginPath(); c.arc(x + 12, y + 12, 5, 0, TAU); c.fill(); c.beginPath(); c.arc(x + 26, y + 27, 3, 0, TAU); c.fill(); }
    if (S.rp[i] > 0 && S.rb[i] >= 0) { c.beginPath(); c.arc(x + 20, y + 20, 4 + S.rp[i] * 14, 0, TAU); c.fillStyle = alpha(P[S.rb[i]].col, 0.85); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); } }
  if (M === 'colina') { const own = S.owner >= 0 ? P[S.owner].col : '#ffd166';
    c.beginPath(); c.arc(S.zx, S.zy, S.zr, 0, TAU); c.fillStyle = alpha(own, S.cont ? 0.18 : 0.32); c.fill();
    c.save(); c.setLineDash([14, 9]); c.lineDashOffset = -T * 30; c.lineWidth = 7; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 4; c.strokeStyle = S.cont ? (Math.sin(T * 16) > 0 ? '#fff' : '#ff5f5f') : own; c.stroke(); c.restore();
    c.fillStyle = '#6b4329'; c.fillRect(S.zx - 2, S.zy - 34, 4, 34); c.beginPath(); c.moveTo(S.zx + 2, S.zy - 34); c.lineTo(S.zx + 24 + Math.sin(T * 6) * 3, S.zy - 27); c.lineTo(S.zx + 2, S.zy - 20); c.closePath(); ART.fillOut(c, own, 2);
    if (S.cont) label('¡Disputada!', S.zx, S.zy + S.zr + 16, 18, '#fff'); }
  if (M === 'silla') {
    c.beginPath(); c.arc(CX, CY, 88, 0, TAU); c.fillStyle = 'rgba(40,20,60,.25)'; c.fill();
    for (const ch of S.ch || []) chair(ch.x, ch.y, ch.a, ch.occ >= 0);
    if (S.st === 'music') { c.save(); c.setLineDash([6, 6]); c.lineDashOffset = T * 20; c.beginPath(); c.arc(CX, CY, 88, 0, TAU); c.lineWidth = 6; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = '#ffd166'; c.stroke(); c.restore();
      for (let j = 0; j < 8; j++) { const a = j * TAU / 8; c.beginPath(); c.arc(CX + Math.cos(a) * 88, CY + Math.sin(a) * 88, 5, 0, TAU); ART.fillOut(c, '#c98a4b', 2); } }
    c.save(); c.translate(CX, CY); if (S.st === 'music') c.rotate(Math.sin(T * 8) * 0.12);
    c.beginPath(); c.arc(0, 0, 13, 0, TAU); ART.fillOut(c, '#3b3450', 2.4); c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fillStyle = '#ffd166'; c.fill(); c.restore();
    if (S.st === 'scr' && rt - S.stopT < 1.3) label('¡ALTO!', CX, CY - 60, 30, '#ff5f7a');
  }
  if (M === 'glotones') { for (const f of S.food) if (f.rsp <= 0) { c.beginPath(); c.arc(f.x, f.y, 3.6, 0, TAU); ART.fillOut(c, ['#7cf7a0', '#ffd166', '#ff9ad5'][f.t], 1.4); }
    for (const t of S.tad) if (t.rsp <= 0) { const a = Math.atan2(t.vy, t.vx); c.save(); c.translate(t.x, t.y); c.rotate(a); c.beginPath(); c.moveTo(-4, 0); c.quadraticCurveTo(-12, Math.sin(T * 18 + t.a) * 5, -16, 0); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); c.beginPath(); c.ellipse(0, 0, 6, 4.5, 0, 0, TAU); ART.fillOut(c, '#3b3450', 1.6); c.fillStyle = '#fff'; c.beginPath(); c.arc(3, -1.5, 1.2, 0, TAU); c.fill(); c.restore(); } }
  if (M === 'pastores') PEN.forEach((pn) => { const pl = P[pn.i], x = pn.x + Math.cos(pn.ma) * 22, y = pn.y + Math.sin(pn.ma) * 22;
    c.fillStyle = '#6b4329'; c.fillRect(x - 1.5, y - 24, 3, 24); c.beginPath(); c.moveTo(x + 1.5, y - 24); c.lineTo(x + 20 + Math.sin(T * 5 + pn.i) * 2, y - 18); c.lineTo(x + 1.5, y - 12); c.closePath(); ART.fillOut(c, pl.col, 2); });
  for (const w of waves) { c.beginPath(); c.arc(w.x, w.y, 20 + w.t * 260, 0, TAU); c.lineWidth = 5 * (1 - w.t * 2); c.strokeStyle = alpha(w.col, Math.max(0, 1 - w.t * 2)); c.stroke(); }
  /* entidades ordenadas por profundidad */
  const L = [];
  for (const pl of P) if ((pl.alive || pl.fall) && !(pl.gone > 0)) L.push([pl.y, 0, pl]);
  if (M === 'pastores') for (const s of S.sh) L.push([s.y, 1, s]);
  if (M === 'corona' && S.h < 0) L.push([S.y, 2]);
  if (M === 'patata' && S.hold < 0 && elimOrder.length === 0 && phase === 'play') L.push([CY, 3]);
  L.sort((a, b) => a[0] - b[0]);
  for (const [, t, e] of L) {
    if (t === 1) { sheep(e); continue; }
    if (t === 2) { ART.shadow(c, S.x, S.y + 10, 12, 0.3); crownAt(S.x, S.y - 4 + Math.sin(T * 4) * 3, 1.1); ART.glint(c, S.x + 10, S.y - 14, 3 + Math.sin(T * 6) * 2, '#fff'); continue; }
    if (t === 3) { bombAt(CX, CY + Math.sin(T * 5) * 3, 1, false); continue; }
    const pl = e; c.save(); let sc = 1;
    if (pl.fall) { const q = Math.min(1, pl.fall / 0.7); sc = 1 - q * 0.7; c.globalAlpha = 1 - q * 0.9; }
    if (pl.inv > 0 && (M === 'glotones' || M === 'carritos') && Math.sin(T * 30) > 0) c.globalAlpha *= 0.45;
    if (sc !== 1) { c.translate(pl.x, pl.y); c.scale(sc, sc); c.translate(-pl.x, -pl.y); }
    if (MD.car) car(pl, pl.x, pl.y);
    else blob(pl.x, pl.y, pl.r, pl.col, pl.fx, pl.fy, M === 'sumo' ? 'sumo' : M === 'glotones' ? 'fish' : M === 'pastores' ? 'dog' : '', pl.z, pl);
    if (pl.chg > 0) { c.beginPath(); c.arc(pl.x, pl.y - pl.r * 0.2, pl.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * pl.chg); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 3; c.strokeStyle = pl.chg >= 1 ? '#fff' : '#ffd166'; c.stroke(); }
    if (pl.brace) { c.beginPath(); c.arc(pl.x, pl.y - pl.r * 0.2, pl.r + 5, 0, TAU); c.lineWidth = 3; c.strokeStyle = alpha('#fff', 0.7); c.stroke(); }
    if (pl.lie) label('z', pl.x + pl.r, pl.y - pl.r - 6, 14, '#fff');
    if (pl.stun > 0) for (let j = 0; j < 3; j++) ART.glint(c, pl.x + Math.cos(T * 8 + j * 2.1) * pl.r, pl.y - pl.r - 4 + Math.sin(T * 8 + j * 2.1) * 4, 3.5, '#ffd166');
    const top = pl.y - (MD.car ? 22 : pl.r * 1.2) - pl.z;
    if (M === 'corona' && S.h === pl.i) crownAt(pl.x, top - 6, 0.95);
    if (M === 'patata' && S.hold === pl.i) bombAt(pl.x, top - 10, 0.95, S.fuse < 1);
    c.restore();
    if (!pl.fall) label(tagOf(pl), pl.x, top - (M === 'corona' && S.h === pl.i ? 26 : M === 'patata' && S.hold === pl.i ? 34 : 10), 15, pl.col);
  }
}
function card(pl, x, y, w, h) {
  const out = MD.elim ? !pl.alive || pl.fall : false;
  ART.rr(c, x, y, w, h, 14); c.fillStyle = out ? 'rgba(30,26,52,.85)' : 'rgba(34,28,70,.92)'; c.fill(); c.lineWidth = 3; c.strokeStyle = out ? '#4a4466' : pl.col; c.stroke();
  c.beginPath(); c.arc(x + 22, y + 24, 12, 0, TAU); const g = c.createRadialGradient(x + 18, y + 20, 1, x + 22, y + 24, 13); g.addColorStop(0, lite(pl.col, 0.4)); g.addColorStop(1, pl.col); ART.fillOut(c, g, 2);
  c.fillStyle = OUT; c.beginPath(); c.arc(x + 18, y + 23, 2, 0, TAU); c.arc(x + 26, y + 23, 2, 0, TAU); c.fill();
  label(pl.cpu ? 'CPU' : k.party ? 'J' + (pl.p + 1) : 'TÚ', x + 42, y + 24, 20, out ? '#8a86a5' : pl.col, 'left');
  label('★ ' + pl.pts, x + w - 12, y + 24, 19, '#ffd166', 'right');
  if (M === 'carritos') { for (let j = 0; j < 3; j++) { c.beginPath(); c.ellipse(x + 20 + j * 18, y + h - 22 - 22, 6.5, 7.5, 0, 0, TAU); ART.fillOut(c, j < pl.balloons ? pl.col : '#3a3458', 1.6); } }
  label(MODES[M].val(pl), x + 12, y + h - 20, M === 'patata' || M === 'sumo' ? 16 : 18, out ? '#8a86a5' : '#fff', 'left');
}
function info(x, y, w, h) {
  ART.rr(c, x, y, w, h, 14); c.fillStyle = 'rgba(34,28,70,.92)'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#6e62f5'; c.stroke();
  label(`Ronda ${Math.max(1, round)}/${MD.rounds}`, x + w / 2, y + 22, 18, '#cfc8ff');
  let t = '';
  if (M === 'patata') t = 'Mecha ¿?'; else if (M === 'silla') t = S.st === 'music' ? '♪ ♫ ♪' : S.st === 'scr' ? '¡Siéntate!' : '…';
  else if (MD.len) t = String(Math.max(0, Math.ceil(MD.len - rt)));
  label(t, x + w / 2, y + h / 2 + 12, t.length > 4 ? 22 : 36, M === 'silla' && S.st === 'scr' ? '#ff5f7a' : MD.len && MD.len - rt < 6 && phase === 'play' ? '#ff9a3d' : '#fff');
}
function hints(x, y, w, h) {
  ART.rr(c, x, y, w, h, 14); c.fillStyle = 'rgba(34,28,70,.7)'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#3d3470'; c.stroke();
  MODES[M].hint.forEach((s, j) => { let fs = 16; do { c.font = `700 ${fs}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; } while (c.measureText(s).width > w - 14 && --fs > 10);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = j ? '#cfc8ff' : '#fff'; c.fillText(s, x + w / 2, y + h / 2 + (j - 1) * 26); });
}
function draw() {
  c.drawImage(BG, 0, 0, W, H);
  c.save(); c.translate(OX, OY); drawWorld(); c.restore();
  if (PORT) { card(P[0], 8, 8, 150, 122); info(164, 8, 152, 122); card(P[2], 322, 8, 150, 122); card(P[1], 8, 590, 150, 122); hints(164, 590, 152, 122); card(P[3], 322, 590, 150, 122); }
  else { card(P[0], 8, 20, 144, 112); info(8, 150, 144, 112); card(P[1], 8, 348, 144, 112); card(P[2], 608, 20, 144, 112); hints(608, 150, 144, 112); card(P[3], 608, 348, 144, 112); }
  if (phase === 'between' && banner && k.st === 'play') {
    const a = Math.min(1, (3.4 - btw) * 4), bw = 340, bh = 90 + banner.order.length * 30, bx = W2(CX) - bw / 2, by = H2(CY) - bh / 2;
    c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(10,8,24,.45)'; c.fillRect(OX, OY, AW, AW);
    ART.rr(c, bx, by, bw, bh, 18); c.fillStyle = '#221c46'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 2.5; c.strokeStyle = banner.tie ? '#ffd166' : banner.order[0].col; ART.rr(c, bx + 4, by + 4, bw - 8, bh - 8, 15); c.stroke();
    label(`Fin de la ronda ${round}`, bx + bw / 2, by + 24, 18, '#cfc8ff');
    label(banner.tie ? '¡Empate!' : `¡Gana ${tagOf(banner.order[0])}!`, bx + bw / 2, by + 56, 28, banner.tie ? '#ffd166' : banner.order[0].col);
    banner.order.forEach((pl, j) => { const yy = by + 96 + j * 30; label(`${j + 1}. ${tagOf(pl)}`, bx + 30, yy, 19, pl.col, 'left'); label(MODES[M].val(pl), bx + bw / 2 + 20, yy, 17, '#fff'); label('+' + pl.gain, bx + bw - 28, yy, 19, '#ffd166', 'right'); });
    c.restore();
  }
}
