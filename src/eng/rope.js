/* Cut & Drop: corta las cuerdas (desliza a través de ellas) para que el caramelo caiga en la cesta de la criatura
 * Arte propio: cuerdas trenzadas con física Verlet, caramelo envuelto que gira, criatura que abre la boca, estrellas dibujadas.
 * Teclado: izquierda/derecha eligen cuerda, A la corta. A partir del nivel 9 los niveles se repiten en espejo. */
const W = 360, H = 640, OUT = ART.OUT, R2 = 6.2832;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1b2440' }), c = k.ctx;
/* ---------- R5 §8 «pieza única» + cartoon de estudio (helpers locales) ----------
   uni(): contornea TODAS las partes y luego las rellena → solo sobrevive la silueta exterior.
   celp(): 3 tonos de borde duro (cel shading) recortados a la silueta, sin degradados.
   spec(): único óvalo especular.  contact(): sombra de contacto dura. */
function uni(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = ART.OUT; g.lineWidth = (ow || 1.5) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
}
function inpath(g, parts, fn) { g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip(); fn(g); g.restore(); }
function celp(g, parts, base, dx, dy) {
  inpath(g, parts, (h) => {
    const P = () => { h.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](h); h.fill(); };
    h.fillStyle = ART.dark(base, 0.24); P();
    h.translate(-dx, -dy); h.fillStyle = base; P();
    h.translate(-dx * 1.15, -dy * 1.15); h.fillStyle = ART.lite(base, 0.2); P();
  });
}
function celm(g, parts, dx, dy) { for (let i = 0; i < parts.length; i++) celp(g, [parts[i]], parts[i][1], dx, dy); }
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.7 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); g.fill(); }
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms); /* 1.23: la pantalla final espera si el juego está en pausa */
const LEVELS = [
  { pins: [[180, 80]], basket: 180, stars: [[180, 300], [180, 420]] },
  { pins: [[90, 80], [270, 80]], basket: 260, stars: [[220, 380]] },
  { pins: [[60, 120], [300, 60]], basket: 90, stars: [[140, 300], [100, 470]] },
  { pins: [[180, 60], [40, 260], [320, 260]], basket: 60, stars: [[130, 330], [90, 420]] },
  { pins: [[40, 80], [180, 60], [320, 80]], basket: 300, stars: [[250, 330], [300, 460]] },
  { pins: [[300, 90], [60, 200]], basket: 280, bumper: [180, 420], stars: [[200, 330]] },
  { pins: [[80, 60], [280, 160], [80, 300]], basket: 180, stars: [[150, 470], [175, 530]] },
  { pins: [[180, 60]], basket: 250, bumper: [120, 360], stars: [[190, 300], [240, 450]], wind: 180 },
];
let lv, candy, ropes, stars, got, state, score, cutLine, t, L, trail = [], bumpT = 0, winT = 0, kbSel = 0, chew = 0, bgCv;
function level(n) { const b = LEVELS[(n - 1) % LEVELS.length], m = Math.floor((n - 1) / LEVELS.length) % 2 === 1, fx = (x) => (m ? W - x : x);
  return { pins: b.pins.map(([x, y]) => [fx(x), y]), basket: fx(b.basket), stars: b.stars.map(([x, y]) => [fx(x), y]), bumper: b.bumper && [fx(b.bumper[0]), b.bumper[1]], wind: b.wind ? (m ? -b.wind : b.wind) : 0 }; }
function build() {
  L = level(lv); const cx = L.pins.reduce((s, p) => s + p[0], 0) / L.pins.length, cy = Math.max(...L.pins.map((p) => p[1])) + 110;
  candy = { x: cx, y: cy, ox: cx, oy: cy, a: 0 }; ropes = L.pins.map(([px, py]) => { const segs = [], n = 12; for (let i = 0; i <= n; i++) { const x = px + (cx - px) * i / n, y = py + (cy - py) * i / n; segs.push({ x, y, ox: x, oy: y }); } return { pin: [px, py], pts: segs, len: Math.hypot(cx - px, cy - py) / n * 0.98, cut: -1 }; });
  stars = L.stars.map(([x, y]) => ({ x, y, got: false, gt: 0 })); got = 0; state = 'play'; t = 0; trail = []; winT = 0; kbSel = 0; chew = 0;
}
/* si el caramelo se cae se repite el mismo nivel (con los puntos que tenías al empezarlo), no se vuelve al 1 */
/* Dificultad: los niveles están verificados por simulador y no se tocan; difícil empieza en el 4. */
const LV0 = () => (k.dif === 2 ? 4 : 1);
let s0 = 0; function reset() { if (!lv) { lv = LV0(); score = 0; } else if (k.st === 'over' && state === 'lost') score = s0; s0 = score; build(); }
k.onDif = () => { if (k.st !== 'play') { lv = LV0(); score = 0; s0 = 0; build(); } };
reset(); k.show(CFG.title, 'Desliza el dedo a través de las cuerdas para cortarlas. Mete el caramelo en la cesta y recoge estrellas. Teclado: flechas eligen cuerda, A corta.');
function segInt(a, b, p, q) { const d = (b.x - a.x) * (q.y - p.y) - (b.y - a.y) * (q.x - p.x); if (!d) return false; const u = ((p.x - a.x) * (q.y - p.y) - (p.y - a.y) * (q.x - p.x)) / d, v = ((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)) / d; return u >= 0 && u <= 1 && v >= 0 && v <= 1; }
function cutRope(r, i) { r.cut = i; k.sfx('shoot'); navigator.vibrate && navigator.vibrate(15); const p = r.pts[i]; k.burst(p.x, p.y, '#e8c890', 10, 90); }
let prev = null;
k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt; for (const q of trail) q.l -= dt; trail = trail.filter((q) => q.l > 0); bumpT = Math.max(0, bumpT - dt); chew = Math.max(0, chew - dt);
  if (state === 'won') { winT += dt; return; }
  if (state !== 'play') return;
  const h = Math.min(dt, 1 / 60);
  // corte por deslizamiento (con gesto rápido: hit y up en el mismo frame)
  if (k.ptr.hit) prev = { x: k.ptr.sx, y: k.ptr.sy };
  if (prev && (k.ptr.down || k.ptr.up)) { const cur = { x: k.ptr.x, y: k.ptr.y };
    if (Math.hypot(cur.x - prev.x, cur.y - prev.y) > 0.5) { trail.push({ x: prev.x, y: prev.y, x2: cur.x, y2: cur.y, l: 0.25 });
      for (const r of ropes) if (r.cut < 0) for (let i = 0; i < r.pts.length - 1; i++) { const b = i + 1 === r.pts.length - 1 ? candy : r.pts[i + 1]; if (segInt(prev, cur, r.pts[i], b)) { cutRope(r, i); break; } } }
    prev = k.ptr.down ? cur : null; }
  // teclado
  const live = ropes.filter((r) => r.cut < 0);
  if (live.length) { kbSel = ((kbSel % live.length) + live.length) % live.length; if (k.hit.has('left')) kbSel--; if (k.hit.has('right')) kbSel++; kbSel = ((kbSel % live.length) + live.length) % live.length;
    if (k.hit.has('a') || k.hit.has('down')) cutRope(live[kbSel], Math.floor(live[kbSel].pts.length / 2)); }
  const all = [candy, ...ropes.flatMap((r) => r.pts.slice(1))];
  for (const p of all) { const vx = (p.x - p.ox) * 0.995, vy = (p.y - p.oy) * 0.995; p.ox = p.x; p.oy = p.y; p.x += vx + (L.wind || 0) * h * h * (p === candy ? 1 : 0.3); p.y += vy + 900 * h * h; }
  for (let it = 0; it < 12; it++) for (const r of ropes) { const pts = r.pts; pts[0].x = r.pin[0]; pts[0].y = r.pin[1]; const last = pts.length - 1;
    for (let i = 0; i < last; i++) { if (i === r.cut) continue; const a = pts[i], b = i + 1 === last ? candy : pts[i + 1]; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, diff = (d - r.len) / d; if (diff <= 0) continue; const wa = i === 0 ? 0 : 0.5, wb = i === 0 ? 1 : 0.5; a.x += dx * diff * wa; a.y += dy * diff * wa; b.x -= dx * diff * wb; b.y -= dy * diff * wb; } if (r.cut !== last - 1) { pts[last].x = candy.x; pts[last].y = candy.y; } pts[0].x = r.pin[0]; pts[0].y = r.pin[1]; }
  candy.a += (candy.x - candy.ox) * 0.08;
  if (L.bumper) { const [bx, by] = L.bumper, d = Math.hypot(candy.x - bx, candy.y - by); if (d < 34) { const nx = (candy.x - bx) / d, ny = (candy.y - by) / d; candy.x = bx + nx * 34; candy.y = by + ny * 34; candy.ox = candy.x - nx * 9; candy.oy = candy.y - ny * 9; if (bumpT < 0.1) { k.sfx('jump'); bumpT = 0.3; } } }
  if (candy.x < 14 || candy.x > 346) { candy.x = k.clamp(candy.x, 14, 346); candy.ox = candy.x + (candy.x - candy.ox) * 0.5; }
  for (const s of stars) if (!s.got && Math.hypot(s.x - candy.x, s.y - candy.y) < 31) { s.got = true; s.gt = t; got++; k.sfx('coin'); k.burst(s.x, s.y, '#ffd23d', 16); k.float('+100', s.x, s.y - 20, '#ffd23d'); }
  if (candy.y > 560 && candy.y < 600 && Math.abs(candy.x - L.basket) < 48 && candy.y - candy.oy > 0) { state = 'won'; chew = 0.8; score += 100 + got * 100; k.best(CFG.id, score); k.sfx('pop'); k.burst(L.basket, 575, '#ff7aa8', 20, 150);
    later(() => { k.st = 'over'; k.show('¡Dentro!', `Nivel ${lv} · Estrellas ${got}/${stars.length} · ${score} puntos<br>Toca para el siguiente nivel`); lv++; }, 1300); }
  if (candy.y > 680) { state = 'lost'; k.lose(CFG.id, score, 'Se cayó', `Nivel ${lv}`); }
}, draw);

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function renderBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#5a4a9e'); gr.addColorStop(0.6, '#342a6a'); gr.addColorStop(1, '#1d173f'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // papel pintado: rayas y lunares
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 0; x < W; x += 40) g.fillRect(x, 0, 20, H);
  g.fillStyle = 'rgba(255,255,255,.06)'; for (let y = 20; y < H; y += 40) for (let x = (y / 40 % 2) * 20 + 10; x < W; x += 40) { g.beginPath(); g.arc(x, y, 2.5, 0, R2); g.fill(); }
  // repisa inferior
  g.fillStyle = '#6b4a8a'; g.fillRect(0, 606, W, 34); g.fillStyle = '#86609f'; g.fillRect(0, 606, W, 5); g.strokeStyle = OUT; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, 606); g.lineTo(W, 606); g.stroke();
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return cv;
}
function star(x, y, r, col, rotA) { c.save(); c.translate(x, y); c.rotate(rotA || 0); c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.46 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); ART.fillOut(c, col, 2.5);
  if (col !== 'rgba(255,255,255,.18)') { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-r * 0.2, -r * 0.25, r * 0.16, r * 0.28, 0.5, 0, R2); c.fill(); } c.restore(); }
function ropePath(r) { c.beginPath(); r.pts.forEach((p, i) => { if (state === 'won' && r.cut >= 0 && i > r.cut) return; const q = i === r.pts.length - 1 && r.cut !== i - 1 ? candy : p; if (i === 0 || (r.cut >= 0 && i === r.cut + 1)) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y); }); }
function creature(x, y) {
  const dx = candy.x - x, dy = candy.y - (y - 30), d = Math.hypot(dx, dy), open = state === 'won' ? (chew > 0 ? Math.abs(Math.sin(chew * 18)) * 0.6 : 0.1) : k.clamp(1 - (d - 60) / 200, 0.1, 1), bob = Math.sin(t * 3) * 2, sq = chew > 0 ? Math.sin(chew * 18) * 0.06 : 0;
  c.save(); c.translate(x, y - 16 + bob); c.scale(1 + sq, 1 - sq);
  const eyes = [-12, 12].map((ex) => (h) => { h.moveTo(ex + 8, -18); h.arc(ex, -18, 8, 0, R2); });
  const parts = [[(h) => { h.moveTo(-34, 10); h.bezierCurveTo(-36, -44, 36, -44, 34, 10); h.closePath(); }, '#7fd65a'],
                 [eyes[0], '#ffffff'], [eyes[1], '#ffffff']];
  uni(c, parts, 1.6);
  celp(c, [parts[0]], '#7fd65a', 7, 7);
  const ang = Math.atan2(dy, dx);
  c.fillStyle = OUT; for (const ex of [-12, 12]) { c.beginPath(); c.arc(ex + Math.cos(ang) * 3, -18 + Math.sin(ang) * 3, 3.8, 0, R2); c.fill(); }
  c.fillStyle = '#7a1f3a'; c.beginPath(); c.ellipse(0, -2, 13, 2 + open * 11, 0, 0, R2); c.fill();
  if (open > 0.4) { c.fillStyle = '#ff7aa8'; c.beginPath(); c.ellipse(0, -2 + open * 6, 7, open * 4, 0, 0, R2); c.fill(); }
  c.fillStyle = '#fff'; c.fillRect(-7, -2 - open * 11, 5, 4); c.fillRect(2, -2 - open * 11, 5, 4);
  spec(c, -16, -26, 5, 8.5, -0.5, 0.45);
  c.restore();
}
function basket(x) {
  const parts = [[(h) => { h.moveTo(x - 46, 566); h.lineTo(x + 46, 566); h.lineTo(x + 36, 608); h.lineTo(x - 36, 608); h.closePath(); }, '#c98a4b'],
                 [(h) => ART.rr(h, x - 50, 560, 100, 10, 5), '#e0a868']];
  contact(c, x, 610, 44, 6, 0.3);
  uni(c, parts, 1.6);
  celm(c, parts, 9, 9);
  inpath(c, [parts[0]], (h) => { h.strokeStyle = 'rgba(122,74,34,.55)'; h.lineWidth = 2; for (let yy = 574; yy < 608; yy += 8) { h.beginPath(); h.moveTo(x - 50, yy); h.lineTo(x + 50, yy); h.stroke(); } for (let xx = -50; xx < 50; xx += 10) { h.beginPath(); h.moveTo(x + xx, 566); h.lineTo(x + xx * 0.8, 608); h.stroke(); } });
}
const candyCv = {};
function candySprite() {
  let q = candyCv.q; if (q) return q;
  const R = 30, d = Math.ceil(R * 2 * CDPR);
  q = document.createElement('canvas'); q.width = q.height = d;
  const g = q.getContext('2d'); g.scale(d / (R * 2), d / (R * 2)); g.translate(R, R);
  const parts = [[(h) => { h.moveTo(-13, 0); h.lineTo(-26, -10); h.quadraticCurveTo(-22, 0, -26, 10); h.closePath(); }, '#ffd23d'],
                 [(h) => { h.moveTo(13, 0); h.lineTo(26, -10); h.quadraticCurveTo(22, 0, 26, 10); h.closePath(); }, '#ffd23d'],
                 [(h) => { h.moveTo(16, 0); h.arc(0, 0, 16, 0, R2); }, '#ff5f7a']];
  uni(g, parts, 1.6);
  celm(g, parts, 5, 5);
  inpath(g, [parts[2]], (h) => { h.strokeStyle = 'rgba(255,255,255,.85)'; h.lineWidth = 4; for (let i = -2; i <= 2; i++) { h.beginPath(); h.moveTo(i * 10 - 16, -16); h.lineTo(i * 10 + 16, 16); h.stroke(); } });
  spec(g, -6, -7, 4, 6, -0.6, 0.72);
  candyCv.q = q; return q;
}
function candyDraw(x, y, a) {
  contact(c, x + 3, y + 18, 12, 4, 0.22);
  c.save(); c.translate(x, y); c.rotate(a); c.drawImage(candySprite(), -30, -30, 60, 60); c.restore();
}
function draw() {
  if (!bgCv) bgCv = renderBg(); c.drawImage(bgCv, 0, 0, W, H);
  if (L.wind) { c.strokeStyle = 'rgba(200,235,255,.35)'; c.lineWidth = 2; c.lineCap = 'round'; for (let i = 0; i < 9; i++) { const y = 120 + rnd(i) * 420, len = 30 + rnd(i + 3) * 30, sp = 90 + rnd(i + 5) * 60, x0 = ((t * sp + rnd(i + 8) * W) % (W + 80)) - 40, x = L.wind > 0 ? x0 : W - x0; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - Math.sign(L.wind) * len / 2, y - 4, x - Math.sign(L.wind) * len, y); c.stroke(); } }
  // estrellas
  for (const s of stars) { if (s.got) { const a = t - s.gt; if (a < 0.4) { c.globalAlpha = 1 - a / 0.4; star(s.x, s.y - a * 60, 16 + a * 30, '#ffd23d'); c.globalAlpha = 1; } continue; }
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.22 + Math.sin(t * 4 + s.x) * 0.08; c.fillStyle = '#ffb000'; c.beginPath(); c.arc(s.x, s.y, 26, 0, R2); c.fill(); c.globalAlpha = 0.25; c.beginPath(); c.arc(s.x, s.y, 17, 0, R2); c.fill(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; star(s.x, s.y + Math.sin(t * 3 + s.x) * 3, 16, '#ffd23d', Math.sin(t * 2 + s.y) * 0.2); }
  if (L.bumper) { const [bx, by] = L.bumper, sq = Math.sin(bumpT * 30) * bumpT * 0.6; c.save(); c.translate(bx, by); c.scale(1 + sq, 1 - sq); c.beginPath(); c.arc(0, 0, 22, 0, R2); ART.fillOut(c, '#ff9ad5', 3); c.fillStyle = '#ffd6ee'; for (const [a, b, r] of [[-8, -8, 5], [8, -4, 3.5], [0, 9, 4]]) { c.beginPath(); c.arc(a, b, r, 0, R2); c.fill(); } c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-10, -12, 4, 6, -0.6, 0, R2); c.fill(); c.restore(); }
  creature(L.basket, 560); basket(L.basket);
  // cuerdas
  const live = ropes.filter((r) => r.cut < 0);
  for (const r of ropes) { const sel = live.length > 1 && live[kbSel % live.length] === r && k.held.size >= 0 && kbUsed;
    ropePath(r); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = sel ? '#fff' : OUT; c.lineWidth = sel ? 9 : 7; c.stroke(); c.strokeStyle = '#e8c890'; c.lineWidth = 4; c.stroke(); c.strokeStyle = '#a8773f'; c.lineWidth = 4; c.setLineDash([3, 5]); c.stroke(); c.setLineDash([]); }
  for (const r of ropes) { const [px, py] = r.pin; c.beginPath(); c.arc(px, py, 9, 0, R2); ART.fillOut(c, '#c7ccd8', 2.5); c.beginPath(); c.arc(px, py, 4.5, 0, R2); ART.fillOut(c, '#8a90a6', 1.5); c.fillStyle = '#fff'; c.beginPath(); c.arc(px - 3, py - 3, 2, 0, R2); c.fill(); }
  if (state !== 'won' || chew > 0.6) candyDraw(candy.x, candy.y, candy.a);
  // estela del corte
  c.lineCap = 'round'; for (const q of trail) { c.globalAlpha = q.l / 0.25; c.strokeStyle = '#fff'; c.lineWidth = 2 + q.l * 16; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x2, q.y2); c.stroke(); } c.globalAlpha = 1;
  // HUD
  label(`Nivel ${lv}`, 12, 10, 20, '#fff'); for (let i = 0; i < stars.length; i++) star(22 + i * 24, 48, 9, i < got ? '#ffd23d' : 'rgba(255,255,255,.18)');
  label(`${score}`, W - 12, 10, 20, '#ffd23d', 'right'); if (L.wind) label(L.wind > 0 ? 'Viento >>' : '<< Viento', W - 12, 36, 13, '#bfe6ff', 'right');
  if (state === 'won') { const p = Math.min(1, winT * 3), sc = 0.7 + p * 0.3 + Math.sin(p * 3.14) * 0.1; c.save(); c.globalAlpha = p; c.translate(W / 2, 250); c.scale(sc, sc); ART.rr(c, -120, -50, 240, 100, 20); ART.fillOut(c, 'rgba(34,28,66,.92)', 3); label('¡Dentro!', 0, -38, 30, '#7cf7a0', 'center');
    for (let i = 0; i < stars.length; i++) star((i - (stars.length - 1) / 2) * 40, 22, i < got ? 15 : 11, i < got && winT > 0.3 + i * 0.2 ? '#ffd23d' : 'rgba(255,255,255,.18)'); c.restore(); }
}
let kbUsed = false; addEventListener('keydown', () => { kbUsed = true; }); addEventListener('pointerdown', () => { kbUsed = false; });
