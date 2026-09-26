/* Naves. CFG.mode: 'invaders' | 'vertical' | 'centipede' | 'bullethell' | 'coop' (invasores a dúo con escudo compartido). Arte propio vectorial. */
const M = CFG.mode, land = M === 'invaders' || M === 'coop';
const W = land ? 480 : 360, H = land ? 400 : 640;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#070814' }), c = k.ctx, OUT = '#0d0b1c';
let p, shots, foes, eb, score, lives, wave, cool, inv, dirX, t, pt, calm, mush, bunkers, ufo, pups, power, shield, stars, banner, bannerT;
/* ---------------------------------------------------------------- arte */
/* --- Ley de la pieza única (R5, docs/REMASTER.md §8) -------------------------------
   `unite(g, partes, ancho)` traza TODAS las partes y las rellena después: los contornos
   interiores quedan tapados y solo sobrevive la silueta exterior. El detalle interior va
   recortado (`within` en caché, `clipIn` en el lienzo de partida), nunca con stroke. */
const OUTW = 1.1, INW = 0.65, INA = 0.62;
const _hx = (h) => { if (h[0] !== '#') { const m = h.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; } h = h.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _rgb = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
const LT = (col, f) => _rgb(_hx(col).map((v) => v + (255 - v) * f));
const DK = (col, f) => _rgb(_hx(col).map((v) => v * (1 - f)));
const MXC = (a, b, u) => { const x = _hx(a), y = _hx(b); return _rgb(x.map((v, i) => v + (y[i] - v) * u)); };
const AL = (col, a) => { const q = _hx(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
/* partes = [[trazado, relleno, sombraDeContacto?]], en orden de profundidad */
function unite(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = OUT; g.lineWidth = (ow || OUTW) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) {
    const P = parts[i];
    if (P[2]) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); P[0](g); g.strokeStyle = AL(OUT, 0.15); g.lineWidth = P[2]; g.stroke(); g.lineWidth = P[2] * 0.45; g.stroke(); g.restore(); }
    g.beginPath(); P[0](g); g.fillStyle = P[1]; g.fill();
  }
}
/* detalle de una pieza, recortado contra su propio trazado (caché: source-atop es barato) */
function within(g, path, fn) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* igual, para el lienzo de partida: recorte a secas (source-atop costaría un compuesto de pantalla completa) */
function clipIn(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
function glow(col, blur) { c.shadowColor = col; c.shadowBlur = blur; }
const GSP = {};
function gspr(id) {
  if (GSP[id]) return GSP[id];
  const [w, h, glw, col] = { s: [3, 12, '#5ce1e6', '#bff6ff'], z: [3, 12, '#ff5c7a', '#ffe066'], r: [7, 7, '#ff5c7a', '#ff8fa3'], R: [9, 9, '#ff5c7a', '#ff8fa3'] }[id], P = 9, cw = w + P * 2, ch = h + P * 2;
  const cv = document.createElement('canvas'); cv.width = cw * 2; cv.height = ch * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(cw / 2, ch / 2);
  g.shadowColor = glw; g.shadowBlur = 8; g.fillStyle = col;
  if (id === 'r' || id === 'R') { g.beginPath(); g.arc(0, 0, w / 2, 0, 6.283); g.fill(); } else g.fillRect(-w / 2, -h / 2, w, h);
  return (GSP[id] = { cv, w: cw, h: ch, o: -cw / 2, q: -ch / 2 });
}
/* Casco y alas son UN solo trazado continuo (tangente seguida en el encuentro ala-fuselaje);
   el color de las alas y la carlinga van recortados dentro de esa silueta, sin contorno propio. */
const HULL = (g) => {
  g.moveTo(0, -18);
  g.bezierCurveTo(3.4, -14.6, 6, -9.2, 7.2, -4.2);      // morro → hombro
  g.bezierCurveTo(9.4, -0.4, 13.2, 4, 16, 8);           // hombro → punta de ala
  g.lineTo(16, 13);
  g.bezierCurveTo(11.4, 11.6, 8, 10.4, 5.4, 10);        // borde de fuga del ala → cola
  g.quadraticCurveTo(0, 9.2, -5.4, 10);
  g.bezierCurveTo(-8, 10.4, -11.4, 11.6, -16, 13);
  g.lineTo(-16, 8);
  g.bezierCurveTo(-13.2, 4, -9.4, -0.4, -7.2, -4.2);
  g.bezierCurveTo(-6, -9.2, -3.4, -14.6, 0, -18);
  g.closePath();
};
function ship(x, y, s, tilt, wing) {
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(tilt * 0.25);
  const fl = 6 + Math.random() * 6; glow('#ff9a3c', 12); c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(-5, 12); c.lineTo(0, 12 + fl); c.lineTo(5, 12); c.fill(); c.shadowBlur = 0;
  const gr = c.createLinearGradient(-8, -18, 10, 13); gr.addColorStop(0, '#f6f9ff'); gr.addColorStop(0.55, '#dfe6f5'); gr.addColorStop(1, '#a8b2cb');
  unite(c, [[HULL, gr]], 1.1);
  clipIn(c, HULL, (g) => {
    const wc = wing || '#6e62f5';
    g.fillStyle = wc; g.beginPath(); g.moveTo(-18, 6.4); g.lineTo(-6.4, 1.2); g.lineTo(-6.4, 11); g.lineTo(-18, 15); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(18, 6.4); g.lineTo(6.4, 1.2); g.lineTo(6.4, 11); g.lineTo(18, 15); g.closePath(); g.fill();
    g.fillStyle = AL(OUT, 0.26); g.fillRect(-7.4, -6, 1.5, 20); g.fillRect(5.9, -6, 1.5, 20);   // juntura por sombra propia, no por línea
    g.fillStyle = AL('#ffffff', 0.4); g.fillRect(-6.1, -6, 0.9, 20); g.fillRect(7.2, -6, 0.9, 20);
    g.fillStyle = '#5ce1e6'; g.beginPath(); g.ellipse(0, -4, 3.5, 7, 0, 0, 6.283); g.fill();
    g.fillStyle = AL(OUT, 0.3); g.beginPath(); g.ellipse(0, -1.2, 3.5, 3.4, 0, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,.72)'; g.beginPath(); g.ellipse(-1.2, -6.4, 1.1, 2.2, 0.2, 0, 6.283); g.fill();
    g.fillStyle = AL('#ffffff', 0.3); g.beginPath(); g.moveTo(0, -18); g.lineTo(-3.4, -5); g.lineTo(-1.2, -5); g.closePath(); g.fill();
  });
  c.restore();
}
const EC = ['#f0647e', '#9b8afb', '#3cc7d0', '#e9b949'];
/* patas y antenas salen del cuerpo como engrosamiento del mismo trazado: se trazan primero y se
   rellenan después, así el borde interior desaparece y el bicho es una sola silueta. */
const limb = (g, x0, y0, x1, y1, x2, y2, w) => { g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x2 + w, y2); g.lineTo(x1 + w * 0.7, y1); g.lineTo(x0 + w, y0); g.closePath(); };
function alien(x, y, kind, fr, flash) {
  c.save(); c.translate(x, y); const col = flash ? '#fff' : EC[kind % 4];
  const kk = kind % 3;
  const body = kk === 0 ? (g) => g.ellipse(0, 0, 12, 8, 0, 0, 6.283)
    : kk === 1 ? (g) => { g.moveTo(-12, 4); g.quadraticCurveTo(-11.4, -5.4, -8, -8); g.lineTo(8, -8); g.quadraticCurveTo(11.4, -5.4, 12, 4); g.quadraticCurveTo(9.6, 7.2, 6, 8); g.lineTo(-6, 8); g.quadraticCurveTo(-9.6, 7.2, -12, 4); g.closePath(); }
    : (g) => { g.arc(0, 0, 10, Math.PI, 0); g.lineTo(10, 6); for (let i = 0; i < 4; i++) g.lineTo(10 - (i + 0.5) * 5, fr ? 10 : 7); g.lineTo(-10, 6); g.closePath(); };
  const parts = [];
  if (kk === 0) for (const sd of [-1, 1]) parts.push([(g) => limb(g, sd * 5.4, 3.4, sd * 8, 8, sd * (10 + fr * 3), 12, sd * 2.4), col]);
  if (kk === 1) for (const sd of [-1, 1]) parts.push([(g) => limb(g, sd * 3.6, -6.6, sd * 5.6, -10, sd * (7 + fr * 2), -13.4, sd * 2.1), col]);
  parts.push([body, col]);
  unite(c, parts, 1.05);
  clipIn(c, body, (g) => {
    const gr = g.createLinearGradient(-8, -9, 6, 9); gr.addColorStop(0, AL('#ffffff', 0.26)); gr.addColorStop(0.55, AL('#ffffff', 0)); gr.addColorStop(1, AL(OUT, 0.3));
    g.fillStyle = gr; g.fillRect(-14, -14, 28, 28);
  });
  c.fillStyle = '#fff'; c.beginPath(); c.arc(-4, -1, 3, 0, 6.283); c.arc(4, -1, 3, 0, 6.283); c.fill();
  c.fillStyle = OUT; c.beginPath(); c.arc(-4, 0, 1.4, 0, 6.283); c.arc(4, 0, 1.4, 0, 6.283); c.fill();
  c.restore();
}
function drone(x, y, r, big, flash) {
  c.save(); c.translate(x, y); c.rotate(t * (big ? 0.6 : 1.8)); c.strokeStyle = OUT; c.lineWidth = 2;
  const hex = (g) => { for (let i = 0; i < 6; i++) { const a = i * 1.047; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); };
  const base = flash ? '#fff' : big ? '#b35a6b' : '#5a5f7a';
  const gr2 = c.createLinearGradient(-r, -r, r * 0.6, r); gr2.addColorStop(0, LT(base, 0.3)); gr2.addColorStop(0.6, base); gr2.addColorStop(1, DK(base, 0.3));
  unite(c, [[hex, gr2]], 1.1);
  clipIn(c, hex, (g) => { g.fillStyle = AL(OUT, 0.24); g.beginPath(); g.arc(0, 0, r * 0.62, 0, 6.283); g.fill(); });
  c.rotate(-t * (big ? 0.6 : 1.8)); glow('#f0647e', 10); c.fillStyle = '#f0647e'; c.beginPath(); c.arc(0, 0, r * 0.35, 0, 6.283); c.fill(); c.shadowBlur = 0; c.restore();
}
/* El ciempiés es UN cuerpo: los anillos se trazan con sus uniones y se rellenan de una vez; la
   separación entre anillos se lee por sombra propia recortada, nunca por contorno. */
function chain(segs) {
  if (!segs.length) return;
  const parts = [], link = [];
  for (let i = 0; i < segs.length; i++) {
    const a = segs[i], b = segs[i + 1];
    if (b && Math.abs(a.x - b.x) < 26 && Math.abs(a.y - b.y) < 26) link.push([a, b]);
  }
  for (const [a, b] of link) parts.push([(g) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d * 7.4, ny = dx / d * 7.4; g.moveTo(a.x + nx, a.y + ny); g.lineTo(b.x + nx, b.y + ny); g.lineTo(b.x - nx, b.y - ny); g.lineTo(a.x - nx, a.y - ny); g.closePath(); }, '#4cc38a']);
  for (const q of segs) parts.push([(g) => g.arc(q.x, q.y, 9, 0, 6.283), q.flash > 0 ? '#fff' : q.head ? '#e9b949' : '#4cc38a']);
  unite(c, parts, 1.1);
  for (const q of segs) clipIn(c, (g) => g.arc(q.x, q.y, 9, 0, 6.283), (g) => {
    const gr = g.createRadialGradient(q.x - 3.2, q.y - 3.6, 1, q.x, q.y, 11);
    gr.addColorStop(0, AL('#ffffff', 0.34)); gr.addColorStop(0.45, AL('#ffffff', 0)); gr.addColorStop(1, AL(OUT, 0.34));
    g.fillStyle = gr; g.fillRect(q.x - 10, q.y - 10, 20, 20);
    if (q.head) { g.fillStyle = OUT; g.beginPath(); g.arc(q.x - 3, q.y + 2, 1.8, 0, 6.283); g.arc(q.x + 3, q.y + 2, 1.8, 0, 6.283); g.fill(); }
  });
}
/* Pie y sombrero, una sola seta: se traza el conjunto y se rellena después; el pie se distingue
   por color y por la sombra que el sombrero proyecta sobre él. */
function mushroom(x, y, hp) {
  const s = 0.5 + hp / 6, R = 8 * s, cap = ['#553', '#a0527a', '#c05a8a', '#e0649a'][hp];
  const stem = (g) => { g.moveTo(x - 3, y - 1); g.quadraticCurveTo(x - 3.4, y + 4, x - 2.6, y + 7); g.lineTo(x + 2.6, y + 7); g.quadraticCurveTo(x + 3.4, y + 4, x + 3, y - 1); g.closePath(); };
  const hat = (g) => { g.moveTo(x - R, y + 1); g.quadraticCurveTo(x - R * 0.92, y + 1 - R * 1.24, x, y + 1 - R * 1.24); g.quadraticCurveTo(x + R * 0.92, y + 1 - R * 1.24, x + R, y + 1); g.quadraticCurveTo(x, y + 2.6, x - R, y + 1); g.closePath(); };
  unite(c, [[stem, '#e8dcc8'], [hat, cap]], 1.05);
  clipIn(c, stem, (g) => { g.fillStyle = AL(OUT, 0.3); g.fillRect(x - 4, y - 1, 8, 2.4); g.fillStyle = AL(OUT, 0.16); g.fillRect(x + 1, y - 1, 3, 10); });
  clipIn(c, hat, (g) => { g.fillStyle = AL('#ffffff', 0.34); g.beginPath(); g.ellipse(x - R * 0.36, y - R * 0.5, R * 0.34, R * 0.24, -0.4, 0, 6.283); g.fill(); g.fillStyle = AL(OUT, 0.22); g.beginPath(); g.ellipse(x + R * 0.5, y - R * 0.1, R * 0.5, R * 0.46, 0, 0, 6.283); g.fill(); });
}
function boss(b, flash) {
  c.save(); c.translate(b.x, b.y); const r = b.r; c.strokeStyle = OUT; c.lineWidth = 3;
  const base = flash ? '#fff' : '#3d3566';
  const hull = (g) => { g.moveTo(-r * 1.6, 0); g.quadraticCurveTo(-r * 1.34, -r * 0.52, -r, -r * 0.6); g.lineTo(r, -r * 0.6); g.quadraticCurveTo(r * 1.34, -r * 0.52, r * 1.6, 0); g.quadraticCurveTo(r * 1.32, r * 0.56, r, r * 0.7); g.lineTo(-r, r * 0.7); g.quadraticCurveTo(-r * 1.32, r * 0.56, -r * 1.6, 0); g.closePath(); };
  const pod = (sd) => (g) => { g.moveTo(sd * r * 1.1 - 5, r * 0.18); g.lineTo(sd * r * 1.1 + 5, r * 0.18); g.quadraticCurveTo(sd * r * 1.1 + 4, r * 0.82, sd * r * 1.1, r * 0.9); g.quadraticCurveTo(sd * r * 1.1 - 4, r * 0.82, sd * r * 1.1 - 5, r * 0.18); g.closePath(); };
  const gb = c.createLinearGradient(0, -r * 0.6, 0, r * 0.9); gb.addColorStop(0, LT(base, 0.22)); gb.addColorStop(0.55, base); gb.addColorStop(1, DK(base, 0.3));
  unite(c, [[pod(-1), '#2a2448'], [pod(1), '#2a2448'], [hull, gb]], 1.25);
  clipIn(c, hull, (g) => {
    g.fillStyle = '#5a4f99'; g.fillRect(-r * 0.9, -r * 0.2, r * 1.8, r * 0.4);
    g.fillStyle = AL(OUT, 0.3); g.fillRect(-r * 0.9, -r * 0.2, r * 1.8, 2.2);
    g.fillStyle = AL('#ffffff', 0.16); g.fillRect(-r * 1.5, -r * 0.6, r * 3, 2.4);
  });
  glow('#f0647e', 20); c.fillStyle = b.phase > 1 ? '#ff3b5c' : '#f0647e'; c.beginPath(); c.arc(0, 0, r * 0.38 + Math.sin(t * 6) * 2, 0, 6.283); c.fill(); c.shadowBlur = 0;
  c.restore();
}
/* Búnker: UNA losa por búnker. Las celdas vivas se trazan juntas y se rellenan de una vez, así solo
   sobrevive el borde exterior (y el de los boquetes). Cacheado: solo se repinta al perder una celda. */
let bkCv = null, bkN = -1, bkX = 0, bkY = 0, bkW = 0, bkH = 0;
function drawBunkers() {
  if (!bunkers || !bunkers.length) return;
  const live = bunkers.filter((b) => !b.dead);
  if (!live.length) return;
  if (bkN !== live.length) {
    bkN = live.length;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const b of live) { if (b.x < x0) x0 = b.x; if (b.y < y0) y0 = b.y; if (b.x > x1) x1 = b.x; if (b.y > y1) y1 = b.y; }
    bkX = x0 - 4; bkY = y0 - 4; bkW = x1 - x0 + 14; bkH = y1 - y0 + 14;
    if (!bkCv || bkCv.width < bkW * 2 || bkCv.height < bkH * 2) { bkCv = document.createElement('canvas'); bkCv.width = Math.ceil(bkW * 2); bkCv.height = Math.ceil(bkH * 2); }
    const g = bkCv.getContext('2d'); g.setTransform(2, 0, 0, 2, -bkX * 2, -bkY * 2); g.clearRect(bkX, bkY, bkW, bkH);
    const cell = (b) => (q) => q.rect(b.x - 0.5, b.y - 0.5, 6, 6);
    unite(g, live.map((b) => [cell(b), '#4cc38a']), 1.05);
    g.save(); g.globalCompositeOperation = 'source-atop';
    for (const b of live) { g.fillStyle = AL('#ffffff', 0.3); g.fillRect(b.x - 0.5, b.y - 0.5, 6, 1.7); g.fillStyle = AL(OUT, 0.17); g.fillRect(b.x - 0.5, b.y + 3.6, 6, 1.9); }
    g.restore();
  }
  c.drawImage(bkCv, 0, 0, bkW * 2, bkH * 2, bkX, bkY, bkW, bkH);
}
/* Fondo cacheado a 2×: nebulosas, polvo estelar y planeta (espacio) o huerto nocturno (ciempiés) */
function mkCv(w, h) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); return [cv, g]; }
const BG = (() => {
  const [cv, g] = mkCv(W, H), R = (a, b) => a + Math.random() * (b - a);
  if (M === 'centipede') {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d1a14'); gr.addColorStop(0.55, '#15291c'); gr.addColorStop(1, '#1d3322'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { const x = R(0, W), y = R(0, H), r = R(30, 70), rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, i % 3 ? 'rgba(60,110,60,.18)' : 'rgba(90,70,50,.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.lineCap = 'round'; for (let i = 0; i < 260; i++) { const x = R(0, W), y = R(0, H), hh = R(4, 9), sh = y / H; g.strokeStyle = `rgba(${90 + sh * 60 | 0},${150 + sh * 60 | 0},${90 | 0},${0.25 + sh * 0.3})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + R(-2, 2), y - hh * 0.6, x + R(-4, 4), y - hh); g.stroke(); }
    for (let i = 0; i < 18; i++) { const x = R(8, W - 8), y = R(8, H - 8), r = R(3, 6); g.beginPath(); g.ellipse(x, y, r * 1.3, r, R(0, 3), 0, 6.283); g.fillStyle = '#3d4a44'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke(); g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(x - r * 0.4, y - r * 0.4, r * 0.4, 0, 6.283); g.fill(); }
    for (let i = 0; i < 22; i++) { const x = R(6, W - 6), y = R(H * 0.15, H - 6), col = ['#e0649a', '#f2d15c', '#9b8afb', '#fff'][i % 4]; g.globalAlpha = 0.55; for (let j = 0; j < 5; j++) { const a = j * 1.2566; g.fillStyle = col; g.beginPath(); g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2, 0, 6.283); g.fill(); } g.fillStyle = '#f2d15c'; g.beginPath(); g.arc(x, y, 1.4, 0, 6.283); g.fill(); g.globalAlpha = 1; }
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    return { cv };
  }
  const top = M === 'bullethell' ? '#12061c' : '#070814', bot = M === 'bullethell' ? '#2a0e33' : '#161038';
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const neb = M === 'bullethell' ? ['#ff3b7a', '#9b3bff', '#ff8a3c'] : ['#6e62f5', '#f0647e', '#3cc7d0'];
  for (let i = 0; i < 14; i++) { const x = R(-40, W + 40), y = R(-40, H + 40), r = R(60, 170), rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, neb[i % 3] + '30'); rg.addColorStop(0.5, neb[i % 3] + '12'); rg.addColorStop(1, neb[i % 3] + '00'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${R(0.1, 0.45)})`; const r = R(0.4, 1.1); g.fillRect(R(0, W), R(0, H), r, r); }
  // planeta (sprite aparte, se desplaza despacio)
  const PR = land ? 150 : 46, [pc, pg] = mkCv(PR * 2 + 60, PR * 2 + 60), cx = PR + 30, cy = PR + 30;
  const pcol = M === 'bullethell' ? ['#7a3b8f', '#3d1a4f'] : land ? ['#4b6fc9', '#1d2a5c'] : ['#e08a5a', '#6b3550'];
  const pgr = pg.createRadialGradient(cx - PR * 0.4, cy - PR * 0.4, PR * 0.1, cx, cy, PR); pgr.addColorStop(0, pcol[0]); pgr.addColorStop(1, pcol[1]);
  pg.beginPath(); pg.arc(cx, cy, PR, 0, 6.283); pg.fillStyle = pgr; pg.fill(); pg.save(); pg.clip();
  pg.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 5; i++) pg.fillRect(cx - PR, cy - PR * 0.7 + i * PR * 0.32, PR * 2, PR * 0.1);
  for (let i = 0; i < 7; i++) { const a = R(0, 6.28), d = R(0, PR * 0.8), r = R(PR * 0.06, PR * 0.16); pg.beginPath(); pg.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, 0, 6.283); pg.fillStyle = 'rgba(0,0,0,.18)'; pg.fill(); }
  pg.fillStyle = 'rgba(0,0,0,.35)'; pg.beginPath(); pg.arc(cx + PR * 0.35, cy + PR * 0.35, PR, 0, 6.283); pg.fill(); pg.restore();
  pg.lineWidth = 3; pg.strokeStyle = OUT; pg.beginPath(); pg.arc(cx, cy, PR, 0, 6.283); pg.stroke();
  if (!land) { pg.save(); pg.translate(cx, cy); pg.rotate(-0.35); pg.strokeStyle = 'rgba(255,220,180,.55)'; pg.lineWidth = 4; pg.beginPath(); pg.ellipse(0, 0, PR * 1.5, PR * 0.35, 0, 0.1, Math.PI - 0.1); pg.stroke(); pg.restore(); }
  const atm = pg.createRadialGradient(cx, cy, PR, cx, cy, PR + 22); atm.addColorStop(0, pcol[0] + '55'); atm.addColorStop(1, pcol[0] + '00'); pg.fillStyle = atm; pg.beginPath(); pg.arc(cx, cy, PR + 22, 0, 6.283); pg.arc(cx, cy, PR, 0, 6.283, true); pg.fill();
  return { cv, pc, PR };
})();
function background() {
  c.drawImage(BG.cv, 0, 0, W, H);
  if (BG.pc) { const s = BG.pc.width / 2; if (land) c.drawImage(BG.pc, W * 0.72 - s / 2, H - 70 - 30, s, s); else { const y = ((t * 7 + 120) % (H + s + 40)) - s / 2 - 20; c.drawImage(BG.pc, W * 0.7 - s / 2, y - s / 2, s, s); } }
  if (M === 'centipede') { for (let i = 0; i < 9; i++) { const x = (i * 97 + Math.sin(t * 0.5 + i) * 30 + W) % W, y = (i * 71 + Math.cos(t * 0.4 + i * 2) * 26 + H) % H, a = 0.35 + 0.35 * Math.sin(t * 3 + i * 1.7); c.fillStyle = `rgba(214,255,120,${a * 0.35})`; c.beginPath(); c.arc(x, y, 6, 0, 6.283); c.fill(); c.fillStyle = `rgba(240,255,190,${a})`; c.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); } return; }
  for (const s of stars) { const a = 0.3 + s.z * 0.7; c.fillStyle = `rgba(255,255,255,${a})`; const r = s.z * 2.2; c.fillRect(s.x - r / 2, s.y - r / 2, r, r); if (s.z > 0.85) { c.globalAlpha = 0.35 + 0.3 * Math.sin(t * 4 + s.x); c.fillRect(s.x - 4, s.y - 0.5, 8, 1); c.fillRect(s.x - 0.5, s.y - 4, 1, 8); c.globalAlpha = 1; } }
}
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
/* ---------------------------------------------------------------- lógica */
/* Dificultad 0→1: por tiempo jugado en starfall (máximo hacia los 3,5 min) y por oleada en el resto (máximo en la 9). */
const lerp = (a, b, q) => a + (b - a) * q, ease = (q) => q * q * (3 - 2 * q);
function diff() { return M === 'vertical' ? Math.min(1, pt / 315) : ease(Math.min(1, (wave - 1) / 12)); } // 1.23: más fácil (máx. 5,25 min / oleada 13)
function msg(txt) { banner = txt; bannerT = 1.8; }
function spawnWave() {
  wave++; foes = []; calm = wave === 1 ? 5 : 2;
  if (M === 'invaders') { const rows = 5, cols = 9; for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) foes.push({ x: 50 + i * 42, y: 60 + r * 30, r: 12, hp: 1, pts: [30, 20, 20, 10, 10][r], kind: r < 1 ? 1 : r < 3 ? 0 : 2, fr: 0 }); dirX = 1; if (wave === 1) makeBunkers(); msg(`Oleada ${wave}`); }
  if (M === 'centipede') { if (wave === 1) { mush = []; for (let i = 0; i < 34; i++) mush.push({ x: k.ri(1, 16) * 20 + 10, y: k.ri(3, 25) * 20 + 10, hp: 3 }); } for (let i = 0; i < Math.min(25, 9 + wave * 2); i++) foes.push({ x: 10 - i * 20, y: 30, r: 9, hp: 1, pts: i === 0 ? 100 : 20, dir: 1, seg: true, head: i === 0 }); msg(`Oleada ${wave}`); }
  if (M === 'bullethell' || (M === 'vertical' && wave % 3 === 0)) { const hp = M === 'bullethell' ? 112 + wave * 40 : 32 + wave * 10; foes.push({ x: W / 2, y: -60, ty: 110, r: 30, hp, max: hp, pts: 500 * wave, boss: true, a: 0, phase: 1 }); msg(M === 'bullethell' ? `Jefe ${wave}` : '¡Jefe!'); }
  else if (M === 'vertical') msg(`Oleada ${wave}`);
}
function makeBunkers() { bunkers = []; for (let b = 0; b < 4; b++) { const bx = 70 + b * 110, by = H - 100; for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) { if ((y === 4 && x > 2 && x < 5) || (y === 0 && (x === 0 || x === 7))) continue; bunkers.push({ x: bx + x * 5, y: by + y * 5 }); } } }
function reset() { p = { x: W / 2, y: H - 50, tilt: 0 }; shots = []; foes = []; eb = []; pups = []; score = 0; lives = 4; wave = 0; cool = 0; inv = 3; t = 0; pt = 0; calm = 0; power = 1; shield = 0; ufo = null; bunkers = []; stars = Array.from({ length: 70 }, () => ({ x: k.rnd(0, W), y: k.rnd(0, H), z: k.rnd(0.2, 1) })); spawnWave(); }
if (M !== 'coop') { reset(); k.show(CFG.title, CFG.help); }
function hitPlayer() { if (inv > 0) return; if (shield > 0) { shield = 0; inv = 1; k.sfx('hit'); k.burst(p.x, p.y, '#5ce1e6', 16); return; } lives--; inv = 2; eb = []; power = Math.max(1, power - 1); k.burst(p.x, p.y, '#ffb347', 30, 220); k.sfx('explode'); k.shake(8); k.flash('rgba(255,80,90,.35)'); if (lives <= 0) k.lose(CFG.id, Math.floor(score), 'Nave destruida', `Oleada ${wave}`); }
function killFoe(f) { f.dead = true; score += f.pts; k.burst(f.x, f.y, f.boss ? '#f0647e' : EC[(f.kind || 0) % 4], f.boss ? 70 : 14, f.boss ? 260 : 160); k.sfx(f.boss ? 'explode' : 'hit'); if (f.boss) { k.shake(12); k.float(`+${f.pts}`, f.x, f.y, '#e9b949'); pups.push({ x: f.x, y: f.y, t: 'P' }); }
  if (M === 'centipede' && f.seg) mush.push({ x: Math.round((f.x - 10) / 20) * 20 + 10, y: f.y, hp: 3 });
  if (M === 'vertical' && !f.boss && Math.random() < 0.08) pups.push({ x: f.x, y: f.y, t: Math.random() < 0.6 ? 'P' : 'S' }); }
if (M !== 'coop') k.run((dt) => {
  t += dt; for (const s of stars) { s.y += (20 + s.z * 90) * dt; if (s.y > H) { s.y = 0; s.x = k.rnd(0, W); } }
  bannerT -= dt;
  if (!k.gate(reset)) return;
  pt += dt; calm -= dt; const D = diff();
  const sp = 270, free = M !== 'invaders', ox = p.x;
  if (k.held.has('left')) p.x -= sp * dt; if (k.held.has('right')) p.x += sp * dt;
  if (free && k.held.has('up')) p.y -= sp * dt; if (free && k.held.has('down')) p.y += sp * dt;
  if (k.ptr.down) { p.x += (k.ptr.x - p.x) * Math.min(1, dt * 14); if (free) p.y += (k.ptr.y - 70 - p.y) * Math.min(1, dt * 14); }
  p.x = k.clamp(p.x, 16, W - 16); p.y = k.clamp(p.y, free ? H * 0.4 : H - 40, H - 30); p.tilt += (((p.x - ox) / Math.max(dt, 0.001)) / 300 - p.tilt) * Math.min(1, dt * 10);
  cool -= dt; inv -= dt; shield -= dt;
  const auto = M !== 'invaders' || k.ptr.down, rate = M === 'bullethell' ? 0.09 : M === 'invaders' ? 0.45 : 0.18;
  if ((k.held.has('a') || auto) && cool <= 0 && (M !== 'invaders' || shots.length < 2)) { cool = rate; const n = M === 'bullethell' ? 3 : Math.min(3, power);
    for (let i = 0; i < n; i++) shots.push({ x: p.x + (i - (n - 1) / 2) * 9, y: p.y - 16, vx: (i - (n - 1) / 2) * (M === 'bullethell' ? 40 : 60) }); if (M !== 'bullethell') k.sfx('shoot'); }
  for (const s of shots) { s.y -= 560 * dt; s.x += (s.vx || 0) * dt; }
  /* enemigos */
  if (M === 'invaders') {
    const alive = foes.length, sp2 = lerp(16, 34, D) + (45 - alive) * 2.7; let edge = false; const fr = Math.floor(t * (1 + (45 - alive) / 12)) % 2;
    for (const f of foes) { f.fr = fr; f.x += dirX * sp2 * dt; if (f.x < 16 || f.x > W - 16) edge = true; }
    if (edge) { dirX *= -1; for (const f of foes) { f.y += 10; f.x += dirX * 4; if (f.y > H - 72) return k.lose(CFG.id, Math.floor(score), 'Invadido', `Oleada ${wave}`); } }
    if (foes.length && calm <= 0 && Math.random() < dt * lerp(0.45, 2.25, D)) { const cols = {}; for (const f of foes) { const key = Math.round(f.x / 10); if (!cols[key] || cols[key].y < f.y) cols[key] = f; } const f = k.pick(Object.values(cols)); eb.push({ x: f.x, y: f.y + 10, vx: 0, vy: lerp(128, 208, D), zig: 1 }); }
    if (!ufo && Math.random() < dt * 0.06) ufo = { x: -30, y: 34, vx: 90, pts: k.pick([50, 100, 150, 300]) };
    if (ufo) { ufo.x += ufo.vx * dt; if (ufo.x > W + 40) ufo = null; }
    for (const s of shots) { if (ufo && !s.dead && Math.abs(s.x - ufo.x) < 18 && Math.abs(s.y - ufo.y) < 10) { s.dead = true; score += ufo.pts; k.float(`+${ufo.pts}`, ufo.x, ufo.y, '#e9b949'); k.burst(ufo.x, ufo.y, '#f0647e', 24); k.sfx('coin'); ufo = null; }
      for (const b of bunkers) if (!b.dead && !s.dead && s.x > b.x - 1 && s.x < b.x + 6 && s.y < b.y + 6 && s.y + 560 * dt > b.y) { b.dead = true; s.dead = true; } } /* barrido: a 560 px/s la bala avanza más que una celda por fotograma */
    for (const e of eb) for (const b of bunkers) if (!b.dead && !e.dead && e.x > b.x - 2 && e.x < b.x + 7 && e.y > b.y && e.y - e.vy * dt < b.y + 6) { b.dead = true; e.dead = true; k.burst(e.x, e.y, '#4cc38a', 3, 60); }
    for (const f of foes) for (const b of bunkers) if (!b.dead && Math.abs(f.x - b.x) < 14 && Math.abs(f.y - b.y) < 10) b.dead = true;
    bunkers = bunkers.filter((b) => !b.dead);
  } else if (M === 'vertical') {
    if (!foes.some((f) => f.boss) && calm <= 0 && Math.random() < dt * lerp(0.8, 2.56, D)) { const big = Math.random() < lerp(0.06, 0.22, D); foes.push({ x: k.rnd(24, W - 24), y: -20, r: big ? 18 : 12, hp: big ? 6 : 1, pts: big ? 60 : 15, vy: k.rnd(60, 120) * lerp(0.56, 0.98, D), ph: k.rnd(0, 6), big, kind: k.ri(0, 3) }); }
    for (const f of foes) { if (f.boss) continue; f.y += f.vy * dt; f.x += Math.sin(t * 2 + f.ph) * 45 * dt; if (f.big && f.y > 20 && Math.random() < dt * lerp(0.34, 0.75, D)) { const a = Math.atan2(p.y - f.y, p.x - f.x), v = lerp(112, 152, D); eb.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v }); } if (f.y > H + 30) f.dead = true; }
    if (!foes.some((f) => f.boss) && pt > wave * 26) spawnWave();
  } else if (M === 'centipede') {
    for (const f of foes) { if (f.spider) continue; f.x += f.dir * lerp(56, 128, D) * dt;
      const blocked = f.x < 10 || f.x > W - 10 || mush.some((m) => m.hp > 0 && Math.abs(m.x - f.x) < 14 && Math.abs(m.y - f.y) < 10);
      if (blocked) { f.dir *= -1; f.x = k.clamp(f.x, 10, W - 10); f.y += 20; if (f.y > H - 20) f.y = H * 0.62; }
      if (Math.hypot(f.x - p.x, f.y - p.y) < 17) hitPlayer(); }
    const segs = foes.filter((f) => f.seg); segs.forEach((f, i) => { if (i === 0 || !segs[i - 1] || Math.hypot(segs[i - 1].x - f.x, segs[i - 1].y - f.y) > 24) f.head = true; });
    for (const s of shots) for (const m of mush) if (m.hp > 0 && !s.dead && Math.abs(s.x - m.x) < 10 && Math.abs(s.y - m.y) < 10) { m.hp--; s.dead = true; score += 1; if (!m.hp) k.burst(m.x, m.y, '#e0649a', 6, 60); }
    if (calm <= -2 && Math.random() < dt * lerp(0.12, 0.4, D)) { const sx = Math.random() < 0.5 ? -10 : W + 10; foes.push({ x: sx, y: k.rnd(H * 0.6, H - 40), r: 11, hp: 1, pts: k.pick([300, 600, 900]), dir: sx < 0 ? 1 : -1, spider: true }); }
    for (const f of foes) if (f.spider) { f.x += f.dir * lerp(64, 98, D) * dt; f.y += Math.sin(t * 7 + f.x * 0.05) * 140 * dt; f.y = k.clamp(f.y, H * 0.55, H - 20); if (f.x < -20 || f.x > W + 20) f.dead = true; if (Math.hypot(f.x - p.x, f.y - p.y) < 17) hitPlayer(); mush.forEach((m) => { if (Math.abs(m.x - f.x) < 10 && Math.abs(m.y - f.y) < 10) m.hp = 0; }); }
  }
  for (const b of foes) if (b.boss) {
    b.y += (b.ty - b.y) * Math.min(1, dt * 1.5); b.a += dt; b.x = W / 2 + Math.sin(t * 0.7) * 110; b.phase = b.hp < b.max * 0.33 ? 3 : b.hp < b.max * 0.66 ? 2 : 1;
    /* no dispara hasta estar en posición; anillos y ráfagas crecen con la dificultad y con la fase */
    const n = Math.round(lerp(7, 18, D)) + b.phase * 2, rv = lerp(68, 88, D) + b.phase * 12, av = lerp(132, 168, D);
    if (b.y > b.ty - 25 && Math.random() < dt * (lerp(0.68, 1.28, D) + b.phase * lerp(0.38, 0.68, D))) for (let i = 0; i < n; i++) { const a = b.a * (b.phase === 3 ? 3 : 2) + i / n * 6.283; eb.push({ x: b.x, y: b.y, vx: Math.cos(a) * rv, vy: Math.sin(a) * rv }); }
    if (b.y > b.ty - 25 && Math.random() < dt * (lerp(0.38, 0.68, D) + b.phase * 0.26)) { const a = Math.atan2(p.y - b.y, p.x - b.x); for (let j = -1; j <= 1; j++) eb.push({ x: b.x, y: b.y, vx: Math.cos(a + j * 0.2) * av, vy: Math.sin(a + j * 0.2) * av }); }
    if (M === 'bullethell') score += dt * 5;
  }
  for (const s of shots) for (const f of foes) if (!f.dead && !s.dead && Math.hypot(s.x - f.x, s.y - f.y) < f.r + 4) { s.dead = true; f.flash = 0.06; if (--f.hp <= 0) killFoe(f); }
  for (const e of eb) { e.x += e.vx * dt; e.y += e.vy * dt; if (Math.hypot(e.x - p.x, e.y - p.y) < (M === 'bullethell' ? 4.25 : 9.4)) { e.dead = true; hitPlayer(); } }
  for (const f of foes) { f.flash = (f.flash || 0) - dt; if (!f.dead && !f.boss && M !== 'centipede' && Math.hypot(f.x - p.x, f.y - p.y) < f.r + 10) { killFoe(f); hitPlayer(); } }
  for (const u of pups) { u.y += 90 * dt; if (Math.hypot(u.x - p.x, u.y - p.y) < 26) { u.dead = true; k.sfx('coin'); if (u.t === 'P') { power = Math.min(3, power + 1); k.float('¡Disparo mejorado!', p.x, p.y - 30, '#5ce1e6'); } else { shield = 10; k.float('¡Escudo!', p.x, p.y - 30, '#9b8afb'); } } }
  shots = shots.filter((s) => !s.dead && s.y > -10); eb = eb.filter((e) => !e.dead && e.y > -20 && e.y < H + 20 && e.x > -20 && e.x < W + 20); foes = foes.filter((f) => !f.dead); pups = pups.filter((u) => !u.dead && u.y < H + 20);
  if (k.st === 'play' && M !== 'vertical' && !foes.some((f) => !f.spider)) { score += 200 * wave; k.float(`+${200 * wave}`, W / 2, H * 0.5, '#e9b949'); k.sfx('win'); k.confetti(); spawnWave(); }
  if (k.st === 'play' && M === 'vertical' && wave % 3 === 0 && !foes.some((f) => f.boss) && t > 3) { /* jefe vencido */ }
}, () => {
  background();
  if (M === 'centipede') for (const m of mush) if (m.hp > 0) mushroom(m.x, m.y, m.hp);
  if (bunkers) drawBunkers();
  if (ufo) { c.save(); c.translate(ufo.x, ufo.y);
    const disc = (g) => g.ellipse(0, 2, 20, 7, 0, 0, 6.283), dome = (g) => { g.moveTo(-8, -1.4); g.bezierCurveTo(-8, -9.6, 8, -9.6, 8, -1.4); g.quadraticCurveTo(0, 0.6, -8, -1.4); g.closePath(); };
    const gd = c.createLinearGradient(0, -5, 0, 9); gd.addColorStop(0, '#ff93a8'); gd.addColorStop(0.5, '#f0647e'); gd.addColorStop(1, '#9c3550');
    unite(c, [[dome, '#5ce1e6'], [disc, gd]], 1.15);
    clipIn(c, dome, (g) => { g.fillStyle = AL('#ffffff', 0.45); g.beginPath(); g.ellipse(-3, -5, 2.6, 1.6, -0.4, 0, 6.283); g.fill(); });
    clipIn(c, disc, (g) => { g.fillStyle = AL(OUT, 0.24); g.fillRect(-20, -1.2, 40, 2); for (let i = -2; i <= 2; i++) { g.fillStyle = Math.floor(t * 8 + i) % 2 ? '#fff' : '#e9b949'; g.beginPath(); g.arc(i * 7, 4, 1.8, 0, 6.283); g.fill(); } });
    c.restore(); }
  if (M === 'centipede') chain(foes.filter((f) => f.seg));
  for (const f of foes) { const fl = f.flash > 0;
    if (f.boss) { boss(f, fl); const bw = Math.min(220, W - 150), bx = W / 2 - bw / 2; ART.rr(c, bx - 2, 54, bw + 4, 10, 5); ART.fillOut(c, 'rgba(12,10,24,.7)', 2); c.fillStyle = f.phase > 2 ? '#ff3b5c' : '#f0647e'; ART.rr(c, bx, 56, bw * Math.max(0, f.hp) / f.max, 6, 3); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(bx + 2, 56.5, Math.max(0, bw * f.hp / f.max - 4), 1.5); continue; }
    if (f.seg) continue;
    else if (f.spider) { c.save(); c.translate(f.x, f.y); c.lineCap = 'round';
      const legs = [];
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const ly = -6 + i * 4 + Math.sin(t * 20 + i + sd) * 2; legs.push([(g) => limb(g, sd * 1.6, -1.4, sd * 9, ly - 5, sd * 15, ly + 2, sd * 2.2), '#c98a2a']); }
      unite(c, legs.concat([[(g) => g.ellipse(0, 1, 9, 8, 0, 0, 6.283), fl ? '#fff' : '#e9b949']]), 1.05);
      clipIn(c, (g) => g.ellipse(0, 1, 9, 8, 0, 0, 6.283), (g) => { g.fillStyle = AL(OUT, 0.22); g.beginPath(); g.arc(3, 4, 8, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-3, -3, 2.5, 0, 6.283); g.fill(); });
      c.fillStyle = '#ff3b5c'; c.beginPath(); c.arc(-3, 2, 1.8, 0, 6.283); c.arc(3, 2, 1.8, 0, 6.283); c.fill(); c.restore(); }
    else if (M === 'invaders') alien(f.x, f.y, f.kind, f.fr, fl);
    else if (M === 'vertical') f.big ? drone(f.x, f.y, f.r, true, fl) : alien(f.x, f.y, f.kind, Math.floor(t * 4) % 2, fl); }
  for (const u of pups) { const col = u.t === 'P' ? '#5ce1e6' : '#9b8afb', b = 1 + Math.sin(t * 6) * 0.08; c.save(); c.translate(u.x, u.y); c.scale(b, b);
    c.globalAlpha = 0.3; c.fillStyle = col; c.beginPath(); c.arc(0, 0, 17, 0, 6.283); c.fill(); c.globalAlpha = 1;
    c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.roundRect ? c.roundRect(-11, -11, 22, 22, 7) : c.rect(-11, -11, 22, 22); c.fill(); c.stroke();
    c.fillStyle = OUT; c.beginPath(); if (u.t === 'P') { for (const dx of [-4, 4]) { c.moveTo(dx, -7); c.lineTo(dx + 4, 0); c.lineTo(dx - 4, 0); c.closePath(); c.rect(dx - 1.5, 0, 3, 6); } } else { c.moveTo(0, -7); c.lineTo(6, -4); c.lineTo(5, 3); c.lineTo(0, 7); c.lineTo(-5, 3); c.lineTo(-6, -4); c.closePath(); } c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(-8, -8, 10, 2.5); c.restore(); }
  // balas con brillo: sprites precalculados (shadowBlur en cada bala cuesta un desenfoque por figura y frame)
  const sh = gspr('s'); for (const s of shots) c.drawImage(sh.cv, s.x + sh.o, s.y - 1 + sh.q, sh.w, sh.h);
  const ez = gspr('z'), er = gspr(M === 'bullethell' ? 'R' : 'r'); for (const e of eb) { if (e.zig) c.drawImage(ez.cv, e.x + (Math.floor(e.y / 6) % 2 ? 2 : -2) + ez.o, e.y + ez.q, ez.w, ez.h); else c.drawImage(er.cv, e.x + er.o, e.y + er.q, er.w, er.h); }
  if (k.st === 'play' && !(inv > 0 && Math.floor(inv * 10) % 2)) { ship(p.x, p.y, 1, k.clamp(p.tilt, -1.5, 1.5)); if (shield > 0) { c.strokeStyle = `rgba(155,138,251,${0.5 + Math.sin(t * 8) * 0.2})`; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 26, 0, 6.283); c.stroke(); } if (M === 'bullethell') { c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, 3, 0, 6.283); c.fill(); } }
  label(String(Math.floor(score)), 12, 8, 22, '#fff'); for (let i = 0; i < lives; i++) ship(W - 18 - i * 22, 22, 0.55, 0);
  if (M === 'vertical' && power > 1) for (let i = 1; i < power; i++) { c.beginPath(); c.moveTo(18 + (i - 1) * 16, 36); c.lineTo(25 + (i - 1) * 16, 47); c.lineTo(11 + (i - 1) * 16, 47); c.closePath(); ART.fillOut(c, '#5ce1e6', 2); }
  if (bannerT > 0 && k.st === 'play') { c.globalAlpha = Math.min(1, bannerT); label(banner, W / 2, H * 0.42, 28, '#fff', 'center'); c.globalAlpha = 1; }
});
/* ================================================================ modo 'coop': invasores a dúo
   Dos naves en la franja baja (8 direcciones), escudo de energía compartido (un impacto gasta 25),
   enlace entre naves cercanas que absorbe balas, rescate de la nave caída (acércate 1,2 s) o reaparición
   a los 6 s con la reserva común. La partida acaba si caen las dos a la vez o la flota llega a los búnkeres. */
if (M === 'coop') {
  const BY = H - 128, TOP = H - 74, BOT = H - 22, LINK = 125;
  let ships, shE, shT, reserve, fox, foy, divT, cpl, kills;
  const coopBunkers = () => { bunkers = []; for (let b = 0; b < 4; b++) { const bx = 58 + b * 112, by = BY; for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) { if ((y === 4 && x > 2 && x < 6) || (y === 0 && (x === 0 || x === 8))) continue; bunkers.push({ x: bx + x * 5, y: by + y * 5 }); } } };
  const mkShips = () => { cpl = k.players(2); ships = cpl.map((q, i) => ({ p: q.p, x: W / 2 + (i ? 60 : -60), y: BOT - 14, tilt: 0, cool: 0, inv: 0, down: false, rt: 0, help: 0, cpu: q.cpu, col: q.color, name: q.name, tx: W / 2, tt: 0 })); };
  const syncShips = () => { cpl = k.players(2); ships.forEach((s, i) => { s.cpu = cpl[i].cpu; s.col = cpl[i].color; s.name = cpl[i].name; }); };
  const coopWave = () => {
    wave++; foes = []; calm = wave === 1 ? 5 : 2.2; fox = 0; foy = 0; dirX = 1; divT = wave === 1 ? 7 : 3.5;
    const rows = Math.min(5, 3 + Math.floor((wave + 1) / 3)), cols = 8;
    for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) foes.push({ gx: 58 + i * 48, gy: 66 + r * 30, x: 58 + i * 48, y: 66 + r * 30, r: 12, hp: r === 0 && wave > 2 ? 2 : 1, pts: [30, 20, 20, 10, 10][r], kind: r < 1 ? 1 : r < 3 ? 0 : 2, fr: 0, dive: 0 });
    if (wave === 1 || wave % 3 === 1) coopBunkers();
    for (const s of ships) if (s.down) { s.down = false; s.inv = 2; s.x = k.clamp(s.x, 20, W - 20); s.y = BOT - 14; }
    if (wave > 1) { reserve = Math.min(5, reserve + 1); shE = Math.min(100, shE + 35); }
    msg(`Oleada ${wave}`);
  };
  function coopReset() { t = 0; pt = 0; score = 0; wave = 0; shots = []; eb = []; pups = []; shE = 100; shT = 0; reserve = 3; kills = [0, 0]; stars = Array.from({ length: 70 }, () => ({ x: k.rnd(0, W), y: k.rnd(0, H), z: k.rnd(0.2, 1) })); mkShips(); coopWave(); }
  k.onParty = () => { if (k.st !== 'play') coopReset(); else syncShips(); };
  coopReset(); k.show(CFG.title, CFG.help);
  window.__coop = (kill) => (kill && ships.forEach((s) => { s.inv = 0; shE = 0; hitShip(s); }), { ships: ships.map((s) => ({ x: s.x, y: s.y, down: s.down, cpu: s.cpu, name: s.name })), shE, reserve, wave, score, foes: foes.length, eb: eb.length, kills }); /* pruebas */
  const alive = () => ships.filter((s) => !s.down);
  function gameOver(why) { const nm = ships.map((s, i) => `${s.name} ${kills[i]}`).join(' · '); k.lose(CFG.id, Math.floor(score), why, `Oleada ${wave} · derribos: ${nm}`); }
  function hitShip(s) {
    if (s.down || s.inv > 0) return;
    shT = 2.2;
    if (shE >= 25) { shE -= 25; s.inv = 0.8; k.sfx('hit'); k.burst(s.x, s.y, '#5ce1e6', 18, 160); k.flash('rgba(92,225,230,.18)'); return; }
    s.down = true; s.rt = 6; s.help = 0; k.burst(s.x, s.y, '#ffb347', 34, 220); k.sfx('explode'); k.shake(8); k.flash('rgba(255,80,90,.3)');
    if (!alive().length) gameOver('Escuadrón abatido');
  }
  function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, q = k.clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1), 0, 1); return Math.hypot(px - ax - vx * q, py - ay - vy * q); }
  /* aliado CPU: se coloca bajo la columna más baja (separado del compañero), esquiva balas y rescata */
  function allyInput(s, o, dt) {
    let tx = s.x, ty = BOT - 14, fire = false;
    if (o.down) { tx = o.x; ty = o.y; }
    else {
      s.tt -= dt;
      if (s.tt <= 0) { s.tt = k.rnd(0.35, 0.8); const cand = foes.filter((f) => Math.abs(f.x - o.x) > 50); const f = cand.length ? cand.reduce((a, b) => (Math.abs(b.x - s.x) + (H - b.y) * 0.6 < Math.abs(a.x - s.x) + (H - a.y) * 0.6 ? b : a)) : foes[0]; s.tx = f ? f.x : W / 2; }
      tx = s.tx; if (Math.abs(s.x - o.x) < 40) tx += s.x < o.x ? -50 : 50;
      fire = foes.some((f) => Math.abs(f.x - s.x) < 16);
    }
    for (const e of eb) if (e.y < s.y && e.y > s.y - 110 && Math.abs(e.x - s.x) < 20) { tx = s.x + (e.x > s.x ? -60 : 60); ty = BOT - 4; }
    for (const f of foes) if (f.dive && Math.hypot(f.x - s.x, f.y - s.y) < 70) tx = s.x + (f.x > s.x ? -70 : 70);
    const dx = tx - s.x, dy = ty - s.y; return { x: Math.abs(dx) > 6 ? Math.sign(dx) : 0, y: Math.abs(dy) > 6 ? Math.sign(dy) : 0, fire };
  }
  k.run((dt) => {
    t += dt; for (const s of stars) { s.y += (20 + s.z * 90) * dt; if (s.y > H) { s.y = 0; s.x = k.rnd(0, W); } }
    bannerT -= dt;
    if (!k.gate(coopReset)) return;
    pt += dt; calm -= dt; const D = ease(Math.min(1, (wave - 1) / 12)), sp = 230;
    /* naves */
    ships.forEach((s, i) => {
      const o = ships[1 - i]; s.inv -= dt; s.cool -= dt;
      if (s.down) {
        s.rt -= dt; const near = !o.down && Math.hypot(o.x - s.x, o.y - s.y) < 38; s.help = near ? s.help + dt : Math.max(0, s.help - dt * 0.5);
        if (s.help >= 1.2) { s.down = false; s.inv = 2; k.sfx('coin'); k.float('¡Rescatado!', s.x, s.y - 26, '#5ce1e6'); }
        else if (s.rt <= 0 && reserve > 0) { reserve--; s.down = false; s.inv = 2; s.x = W / 2; s.y = BOT - 14; k.sfx('start'); }
        return;
      }
      let ix = 0, iy = 0, fire = false; const ox = s.x;
      if (s.cpu) { const a = allyInput(s, o, dt); ix = a.x; iy = a.y; fire = a.fire; }
      else { const d = k.pdir(s.p); ix = d.x; iy = d.y; fire = k.pheld(s.p, 'a');
        if (s.p === 0 && k.ptr.down) { s.x += (k.ptr.x - s.x) * Math.min(1, dt * 12); s.y += (k.ptr.y - 60 - s.y) * Math.min(1, dt * 12); fire = true; } }
      const m = ix && iy ? 0.7071 : 1; s.x += ix * sp * m * dt; s.y += iy * sp * m * dt;
      s.x = k.clamp(s.x, 16, W - 16); s.y = k.clamp(s.y, TOP, BOT); s.tilt += (((s.x - ox) / Math.max(dt, 0.001)) / 300 - s.tilt) * Math.min(1, dt * 10);
      if (fire && s.cool <= 0 && shots.filter((q) => q.o === i).length < 3) { s.cool = 0.32; shots.push({ x: s.x, y: s.y - 16, vx: 0, o: i }); k.sfx('shoot'); }
    });
    shT -= dt; if (shT <= 0) shE = Math.min(100, shE + dt * 7);
    for (const s of shots) s.y -= 540 * dt;
    /* flota */
    const form = foes.filter((f) => !f.dive), n = foes.length, spd = lerp(14, 30, D) + (40 - Math.min(40, n)) * 1.6;
    fox += dirX * spd * dt;
    let lo = 1e9, hi = -1e9, low = 0; for (const f of form) { lo = Math.min(lo, f.gx + fox); hi = Math.max(hi, f.gx + fox); low = Math.max(low, f.gy + foy); }
    if (form.length && (lo < 16 || hi > W - 16)) { dirX *= -1; fox += dirX * 3; foy += 8; if (low + 8 > BY - 10) return gameOver('La flota llegó a la base'); }
    const fr = Math.floor(t * (1 + (40 - Math.min(40, n)) / 12)) % 2;
    for (const f of foes) { f.fr = fr;
      if (!f.dive) { f.x = f.gx + fox; f.y = f.gy + foy; continue; }
      f.dt += dt;
      if (f.dive === 1) { const tg = ships[f.tg]; const ax = (tg && !tg.down ? tg.x : W / 2) - f.x; f.vx += Math.sign(ax) * 140 * dt; f.vx = k.clamp(f.vx, -120, 120); f.x += (f.vx + Math.sin(f.dt * 4) * 60) * dt; f.y += lerp(110, 170, D) * dt;
        if (f.shots > 0 && f.y > 90 && f.y < BY - 30 && Math.random() < dt * 1.4) { f.shots--; eb.push({ x: f.x, y: f.y + 10, vx: 0, vy: lerp(150, 200, D), zig: 1 }); }
        if (f.y > H + 20) { f.dive = 2; f.y = -20; } }
      else { const hx = f.gx + fox, hy = f.gy + foy; f.x += (hx - f.x) * Math.min(1, dt * 3); f.y += (hy - f.y) * Math.min(1, dt * 3); if (Math.hypot(hx - f.x, hy - f.y) < 3) f.dive = 0; }
    }
    if (calm <= 0) {
      divT -= dt;
      if (divT <= 0 && form.length > 2) { divT = lerp(5, 2, D) * k.rnd(0.8, 1.3); const f = k.pick(form); f.dive = 1; f.dt = 0; f.vx = 0; f.shots = wave > 2 ? 1 : 0; f.tg = k.pick(alive().map((s) => ships.indexOf(s))) || 0; k.sfx('pop'); }
      if (form.length && Math.random() < dt * lerp(0.55, 2.0, D)) { const cols = {}; for (const f of form) { const key = Math.round(f.x / 10); if (!cols[key] || cols[key].y < f.y) cols[key] = f; } const f = k.pick(Object.values(cols)); eb.push({ x: f.x, y: f.y + 10, vx: 0, vy: lerp(125, 200, D), zig: 1 }); }
    }
    /* impactos */
    for (const s of shots) {
      for (const b of bunkers) if (!b.dead && !s.dead && s.x > b.x - 1 && s.x < b.x + 6 && s.y < b.y + 6 && s.y + 540 * dt > b.y) { b.dead = true; s.dead = true; }
      for (const f of foes) if (!f.dead && !s.dead && Math.hypot(s.x - f.x, s.y - f.y) < f.r + 4) { s.dead = true; f.flash = 0.06; if (--f.hp <= 0) { f.dead = true; const pts = f.pts * (f.dive ? 2 : 1); score += pts; kills[s.o]++; k.burst(f.x, f.y, EC[f.kind % 4], 14, 160); k.sfx('hit'); if (f.dive) k.float(`+${pts}`, f.x, f.y, '#e9b949'); if (Math.random() < 0.06) pups.push({ x: f.x, y: f.y, t: 'S' }); } }
    }
    const [a0, a1] = ships, linked = !a0.down && !a1.down && Math.hypot(a0.x - a1.x, a0.y - a1.y) < LINK;
    for (const e of eb) { e.x += e.vx * dt; e.y += e.vy * dt;
      for (const b of bunkers) if (!b.dead && !e.dead && e.x > b.x - 2 && e.x < b.x + 7 && e.y > b.y && e.y - e.vy * dt < b.y + 6) { b.dead = true; e.dead = true; k.burst(e.x, e.y, '#4cc38a', 3, 60); }
      if (!e.dead && linked && shE >= 4 && segDist(e.x, e.y, a0.x, a0.y - 6, a1.x, a1.y - 6) < 7) { e.dead = true; shE -= 4; shT = 1; k.burst(e.x, e.y, '#5ce1e6', 6, 90); k.sfx('click'); }
      if (!e.dead) for (const s of ships) if (!s.down && Math.hypot(e.x - s.x, e.y - s.y) < 10) { e.dead = true; hitShip(s); } }
    for (const f of foes) { f.flash = (f.flash || 0) - dt; if (f.dead) continue; for (const s of ships) if (!s.down && Math.hypot(f.x - s.x, f.y - s.y) < f.r + 10) { f.dead = true; k.burst(f.x, f.y, EC[f.kind % 4], 14, 160); hitShip(s); }
      for (const b of bunkers) if (!b.dead && !f.dive && Math.abs(f.x - b.x) < 14 && Math.abs(f.y - b.y) < 10) b.dead = true; }
    for (const u of pups) { u.y += 80 * dt; for (const s of ships) if (!u.dead && !s.down && Math.hypot(u.x - s.x, u.y - s.y) < 26) { u.dead = true; shE = Math.min(100, shE + 40); k.sfx('coin'); k.float('¡Escudo +40!', s.x, s.y - 30, '#5ce1e6'); } }
    shots = shots.filter((s) => !s.dead && s.y > -10); eb = eb.filter((e) => !e.dead && e.y < H + 20); foes = foes.filter((f) => !f.dead); pups = pups.filter((u) => !u.dead && u.y < H + 20); bunkers = bunkers.filter((b) => !b.dead);
    if (k.st === 'play' && !foes.length) { score += 200 * wave; k.float(`+${200 * wave}`, W / 2, H * 0.45, '#e9b949'); k.sfx('win'); k.confetti(); coopWave(); }
  }, () => {
    background();
      if (bunkers) drawBunkers();
    for (const f of foes) alien(f.x, f.y, f.kind, f.fr, f.flash > 0);
    for (const f of foes) if (f.hp > 1) { c.strokeStyle = '#e9b949'; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, 15, 3.6, 5.8); c.stroke(); }
    const [a0, a1] = ships;
    if (!a0.down && !a1.down) { const d = Math.hypot(a0.x - a1.x, a0.y - a1.y); if (d < LINK && shE >= 4) { const al = 0.35 + 0.25 * Math.sin(t * 10);
      c.lineCap = 'round'; c.strokeStyle = `rgba(92,225,230,${al * 0.5})`; c.lineWidth = 8; c.beginPath(); c.moveTo(a0.x, a0.y - 6); c.lineTo(a1.x, a1.y - 6); c.stroke();
      c.strokeStyle = `rgba(220,255,255,${al + 0.3})`; c.lineWidth = 2; c.beginPath(); c.moveTo(a0.x, a0.y - 6); for (let i = 1; i < 8; i++) { const q = i / 8; c.lineTo(lerp(a0.x, a1.x, q), lerp(a0.y, a1.y, q) - 6 + Math.sin(t * 30 + i * 2) * 3); } c.lineTo(a1.x, a1.y - 6); c.stroke(); } }
    for (const u of pups) { const b = 1 + Math.sin(t * 6) * 0.08; c.save(); c.translate(u.x, u.y); c.scale(b, b); c.globalAlpha = 0.3; c.fillStyle = '#5ce1e6'; c.beginPath(); c.arc(0, 0, 17, 0, 6.283); c.fill(); c.globalAlpha = 1;
      ART.rr(c, -11, -11, 22, 22, 7); ART.fillOut(c, '#5ce1e6', 2.5); c.fillStyle = OUT; c.beginPath(); c.moveTo(0, -7); c.lineTo(6, -4); c.lineTo(5, 3); c.lineTo(0, 7); c.lineTo(-5, 3); c.lineTo(-6, -4); c.closePath(); c.fill(); c.restore(); }
    const sh = gspr('s'); for (const s of shots) c.drawImage(sh.cv, s.x + sh.o, s.y - 1 + sh.q, sh.w, sh.h);
    const ez = gspr('z'); for (const e of eb) c.drawImage(ez.cv, e.x + (Math.floor(e.y / 6) % 2 ? 2 : -2) + ez.o, e.y + ez.q, ez.w, ez.h);
    ships.forEach((s, i) => {
      if (s.down) { c.globalAlpha = 0.45; ship(s.x, s.y, 0.9, 0, '#555a70'); c.globalAlpha = 1;
        c.strokeStyle = 'rgba(12,10,24,.7)'; c.lineWidth = 5; c.beginPath(); c.arc(s.x, s.y, 24, 0, 6.283); c.stroke();
        c.strokeStyle = s.help > 0 ? '#5ce1e6' : s.col; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, 24, -1.571, -1.571 + 6.283 * (s.help > 0 ? s.help / 1.2 : Math.max(0, 1 - s.rt / 6))); c.stroke();
        label(s.help > 0 ? 'Rescatando' : reserve > 0 ? String(Math.ceil(s.rt)) : '¡Rescátame!', s.x, s.y - 44, 12, '#fff', 'center'); return; }
      if (k.st === 'play' && s.inv > 0 && Math.floor(s.inv * 10) % 2) return;
      ship(s.x, s.y, 1, k.clamp(s.tilt, -1.5, 1.5), s.col);
      if (s.inv > 0 && k.st === 'play') { c.strokeStyle = 'rgba(92,225,230,.55)'; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, 22, 0, 6.283); c.stroke(); }
      c.fillStyle = s.col; c.beginPath(); c.moveTo(s.x - 5, s.y + 22); c.lineTo(s.x + 5, s.y + 22); c.lineTo(s.x, s.y + 17); c.closePath(); ART.fillOut(c, s.col, 1.5);
      if (k.party || i === 1) label(s.cpu ? 'CPU' : s.name, s.x, s.y + 22, 10, s.col, 'center');
    });
    label(String(Math.floor(score)), 12, 8, 22, '#fff'); label(`Oleada ${wave}`, 12, 34, 12, '#a097ff');
    const bw = 150, bx = W / 2 - bw / 2; ART.rr(c, bx - 2, 10, bw + 4, 12, 6); ART.fillOut(c, 'rgba(12,10,24,.75)', 2);
    c.fillStyle = shE >= 25 ? '#5ce1e6' : '#f0647e'; ART.rr(c, bx, 12, bw * shE / 100, 8, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(bx + 3, 13, Math.max(0, bw * shE / 100 - 6), 1.5);
    c.fillStyle = 'rgba(12,10,24,.6)'; for (let i = 1; i < 4; i++) c.fillRect(bx + bw * i / 4 - 1, 12, 2, 8);
    label('Escudo', W / 2, 25, 11, '#bff6ff', 'center');
    for (let i = 0; i < reserve; i++) ship(96 + i * 18, 40, 0.45, 0);
    if (bannerT > 0 && k.st === 'play') { c.globalAlpha = Math.min(1, bannerT); label(banner, W / 2, H * 0.4, 28, '#fff', 'center'); c.globalAlpha = 1; }
  });
}
