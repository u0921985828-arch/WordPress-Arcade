/* Frog Crossing — cruza la carretera y el río hasta las 5 charcas. Arte vectorial propio (ART).
 * Coches, camiones y bólidos por carril; troncos y tortugas (algunas se sumergen); mosca de bonificación. */
const W = 416, H = 480, S = 32, TOP = 64, OUT = ART.OUT, R2 = 6.2832, P = 640, LO = -180, JT = 0.13;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#101b2e' }), c = k.ctx;
let f, lanes, homes, score, lives, level, timer, best, fly, t = 0, clearT = 0;
const rowY = (r) => TOP + r * S;
const srnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function mk(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; draw(g); cv.lw = w; cv.lh = h; return cv; }
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}

/* ---------- Carriles: tipo, sentido, velocidad base y generador de objetos ---------- */
const LANE = {
  1: ['log', 1, 42, () => k.ri(3, 4)], 2: ['turtle', -1, 52, () => 3], 3: ['log', 1, 64, () => 5], 4: ['turtle', -1, 46, () => 2], 5: ['log', 1, 36, () => k.ri(3, 4)],
  7: ['truck', -1, 44], 8: ['car', 1, 66], 9: ['racer', -1, 105], 10: ['dozer', 1, 38], 11: ['car', -1, 58],
};
const VW = { truck: 2.4, car: 1.25, racer: 1.3, dozer: 1.5 };
const CARCOL = ['#ff6b6b', '#5ce1e6', '#f2d15c', '#b98cff', '#ffa94d'];
function build() {
  lanes = []; const lv = Math.min(1, (level - 1) / 12), sp = 0.64 + 0.72 * lv, dive = 0.1 + 0.45 * lv; // nivel 1 suave → máximo en el nivel 13 (1.23: más fácil)
  for (const r in LANE) {
    const [type, dir, v, len] = LANE[r], river = type === 'log' || type === 'turtle', L = { type, dir, sp: v * sp, items: [], river };
    const gap = () => (river ? k.ri(2, 3) : k.ri(2, 4) + (level < 3 ? 1 : 0)) * S, first = LO + k.rnd(0, 80); let x = first;
    for (;;) { const n = river ? len() : 0, w = river ? n * S : VW[type] * S; if (L.items.length && x + w + S * 1.5 > first + P) break;
      L.items.push({ x, w, n, col: k.pick(CARCOL), dive: type === 'turtle' && L.items.length > 0 && Math.random() < dive, ph: k.rnd(0, 5) }); x += w + gap(); }
    lanes[r] = L;
  }
  homes = [0, 1, 2, 3, 4].map((i) => ({ x: 36 + i * 88, filled: false, pop: 0 })); fly = { i: -1, t: 3 }; place();
}
function place() { f = { x: 6 * S, y: 12, fx: 6 * S, fy: 12, jt: 0, dir: 0, q: null, dead: 0, kind: '', land: 0 }; timer = 45; best = 12; }
function reset() { score = 0; lives = 4; level = 1; build(); }
/* profundidad de una tortuga que bucea (0 = a flote, 1 = sumergida) */
function depth(it) { if (!it.dive) return 0; const q = (t + it.ph) % 5; return q < 3.2 ? 0 : q < 3.8 ? (q - 3.2) / 0.6 : q < 4.5 ? 1 : 1 - (q - 4.5) / 0.5; }
reset(); k.show(CFG.title, 'Cruza la carretera y el río hasta las 5 charcas. Sube a troncos y tortugas (¡algunas bucean!). Atrapa la mosca para ganar puntos extra. Desliza, toca o usa las flechas.');

function die(kind) {
  if (f.dead) return; f.dead = 0.9; f.kind = kind; lives--; const cx = f.x + S / 2, cy = rowY(f.y) + S / 2;
  if (kind === 'splash') { k.burst(cx, cy, '#9fe7ff', 18, 150); k.sfx('hurt'); } else if (kind === 'squash') { k.burst(cx, cy, '#7cf78a', 14, 180); k.sfx('hit'); k.shake(8); } else k.sfx('hurt');
  navigator.vibrate && navigator.vibrate(100);
}
const DIRS = { up: [0, -1, 0], down: [0, 1, 2], left: [-1, 0, 3], right: [1, 0, 1] };
function jump(d) {
  const [dx, dy, a] = DIRS[d], ny = f.y + dy, nx = f.x + dx * S; if (ny > 12 || nx < -4 || nx > W - S + 4) return;
  f.fx = f.x; f.fy = f.y; f.x = nx; f.y = ny; f.dir = a; f.jt = JT; k.sfx('jump');
  if (f.y < best) { best = f.y; score += 10; }
}
k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt; clearT = Math.max(0, clearT - dt);
  for (const r in lanes) { const L = lanes[r]; for (const it of L.items) { it.x += L.dir * L.sp * dt; if (it.x >= LO + P) it.x -= P; else if (it.x < LO) it.x += P; } }
  for (const h of homes) h.pop = Math.max(0, h.pop - dt * 3);
  fly.t -= dt; if (fly.t <= 0) { const free = homes.map((h, i) => (!h.filled ? i : -1)).filter((i) => i >= 0 && i !== fly.i); fly.i = fly.i >= 0 || !free.length ? -1 : k.pick(free); fly.t = fly.i >= 0 ? 5 : k.rnd(4, 8); }
  if (f.dead) { f.dead -= dt; if (f.dead <= 0) { if (lives <= 0) return k.lose('frog-crossing', score, f.kind === 'time' ? 'Se acabó el tiempo' : f.kind === 'splash' ? 'Al agua' : 'Aplastada', `Nivel ${level}`); place(); } return; }
  const d = k.swipe || (k.tap ? 'up' : null) || ['up', 'down', 'left', 'right'].find((q) => k.hit.has(q));
  if (d) { if (f.jt > 0) f.q = d; else jump(d); }
  if (f.jt > 0) { f.jt -= dt; if (f.jt <= 0) { f.jt = 0; f.land = 0.12; if (f.q) { const q = f.q; f.q = null; jump(q); } } }
  f.land = Math.max(0, f.land - dt);
  timer -= dt; if (timer <= 0) { timer = 0; return die('time'); }
  const L = lanes[f.y], cx = f.x + S / 2;
  if (L && !L.river && L.items.some((it) => cx + 8.5 > it.x + 3 && cx - 8.5 < it.x + it.w - 3)) return die('squash');
  if (f.jt > 0) return;
  if (L && L.river) {
    const on = L.items.find((it) => cx > it.x - 3 && cx < it.x + it.w + 3 && depth(it) < 0.7); if (!on) return die('splash');
    f.x += L.dir * L.sp * dt; if (f.x < -12 || f.x > W - S + 12) return die('splash');
  }
  if (f.y === 0) {
    const i = homes.findIndex((q) => Math.abs(q.x - cx) < 28 && !q.filled); if (i < 0) { f.y = 0; return die('squash'); }
    const h = homes[i]; h.filled = true; h.pop = 1; let pts = 50 + Math.floor(timer) * 5; if (fly.i === i) { pts += 200; fly.i = -1; fly.t = 6; k.float('¡Mosca! +200', h.x, rowY(0) + 30, '#f2d15c'); }
    score += pts; k.float(`+${pts}`, h.x, rowY(0) + 8, '#7cf7a0'); k.burst(h.x, rowY(0) + S / 2, '#7cf7a0', 16); k.sfx('coin');
    if (homes.every((q) => q.filled)) { score += 500 * level; level++; k.sfx('win'); k.confetti(); clearT = 1.6; build(); } else place();
  }
}, draw);

/* ---------- Arte cacheado ---------- */
const BG = mk(W, H, (g) => {
  // franja de marcador
  let gr = g.createLinearGradient(0, 0, 0, TOP); gr.addColorStop(0, '#171a3a'); gr.addColorStop(1, '#0e1128'); g.fillStyle = gr; g.fillRect(0, 0, W, TOP);
  // seto con charcas (fila 0)
  gr = g.createLinearGradient(0, rowY(0), 0, rowY(1)); gr.addColorStop(0, '#2f8f4a'); gr.addColorStop(1, '#236f39'); g.fillStyle = gr; g.fillRect(0, rowY(0), W, S);
  for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(i * 17 + 4, rowY(0) + 6 + srnd(i) * 5, 10 + srnd(i + 4) * 4, 0, R2); g.fillStyle = i % 2 ? '#3aa857' : '#349c4f'; g.fill(); }
  // río (filas 1-5)
  gr = g.createLinearGradient(0, rowY(1), 0, rowY(6)); gr.addColorStop(0, '#1f6fb8'); gr.addColorStop(1, '#2b86c9'); g.fillStyle = gr; g.fillRect(0, rowY(1), W, 5 * S);
  g.fillStyle = 'rgba(10,30,80,.25)'; for (let r = 1; r <= 5; r++) g.fillRect(0, rowY(r) + S - 3, W, 3);
  for (let i = 0; i < 5; i++) { const x = 36 + i * 88; g.fillStyle = '#1f6fb8'; ART.rr(g, x - 22, rowY(0) + 4, 44, S + 2, 10); g.fill(); g.strokeStyle = 'rgba(26,21,48,.5)'; g.lineWidth = 2; g.stroke();
    const ly = rowY(0) + S / 2 + 3; g.beginPath(); g.arc(x, ly, 12.5, 0, R2); ART.fillOut(g, '#4fc36a', 2);
    g.strokeStyle = '#2f8f4a'; g.lineWidth = 1.2; for (let a = 0; a < 6; a++) { g.beginPath(); g.moveTo(x, ly); g.lineTo(x + Math.cos(a * 1.05 + 0.4) * 10, ly + Math.sin(a * 1.05 + 0.4) * 10); g.stroke(); }
    g.fillStyle = '#1f6fb8'; g.beginPath(); g.moveTo(x, ly); g.lineTo(x + 13, ly - 4); g.lineTo(x + 13, ly + 2); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(x - 4, ly - 5, 5, 2.5, -0.4, 0, R2); g.fill(); }
  g.fillStyle = '#1e6b36'; g.fillRect(0, rowY(1) - 3, W, 3);
  // mediana (fila 6): hierba con flores y bordillo
  const grass = (r) => { gr = g.createLinearGradient(0, rowY(r), 0, rowY(r) + S); gr.addColorStop(0, '#5cb85a'); gr.addColorStop(1, '#4aa34c'); g.fillStyle = gr; g.fillRect(0, rowY(r), W, S);
    for (let i = 0; i < 40; i++) { const x = srnd(i + r * 50) * W, y = rowY(r) + 4 + srnd(i * 3 + r) * (S - 10); g.fillStyle = 'rgba(30,90,40,.45)'; g.fillRect(x, y, 2, 5); }
    for (let i = 0; i < 7; i++) { const x = 20 + srnd(i * 7 + r) * (W - 40), y = rowY(r) + 8 + srnd(i + r * 9) * (S - 16), col = ['#fff3a8', '#ff9ad5', '#ffffff'][i % 3]; g.fillStyle = col; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.256) * 2.5, y + Math.sin(p * 1.256) * 2.5, 1.8, 0, R2); g.fill(); } g.fillStyle = '#f2b705'; g.beginPath(); g.arc(x, y, 1.5, 0, R2); g.fill(); } };
  grass(6); grass(12);
  // carretera (filas 7-11): asfalto con grano y líneas
  gr = g.createLinearGradient(0, rowY(7), 0, rowY(12)); gr.addColorStop(0, '#3a3a4e'); gr.addColorStop(1, '#434358'); g.fillStyle = gr; g.fillRect(0, rowY(7), W, 5 * S);
  for (let i = 0; i < 500; i++) { g.fillStyle = srnd(i) > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)'; g.fillRect(srnd(i * 1.3) * W, rowY(7) + srnd(i * 2.7) * 5 * S, 2, 2); }
  g.fillStyle = '#9a98ac'; g.fillRect(0, rowY(7) - 3, W, 4); g.fillRect(0, rowY(12) - 1, W, 4);
  g.fillStyle = '#f2d15c'; g.fillRect(0, rowY(7) + 3, W, 2); g.fillRect(0, rowY(12) - 5, W, 2);
  g.fillStyle = 'rgba(255,255,255,.75)'; for (let r = 8; r <= 11; r++) for (let x = 6; x < W; x += 40) g.fillRect(x, rowY(r) - 1.5, 22, 3);
});
function logCv(n) {
  const w = n * S - 4; return mk(w + 4, 28, (g) => {
    ART.rr(g, 2, 3, w, 22, 10); ART.fillOut(g, '#8b5a2b', 2.5);
    g.strokeStyle = 'rgba(60,32,14,.6)'; g.lineWidth = 2; g.lineCap = 'round';
    for (let i = 0; i < n * 3; i++) { const x = 10 + srnd(i + n * 20) * (w - 26), y = 8 + (i % 3) * 5.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8 + srnd(i) * 14, y); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.2)'; ART.rr(g, 8, 5, w - 22, 4, 2); g.fill();
    g.beginPath(); g.ellipse(w - 6, 14, 7, 10, 0, 0, R2); ART.fillOut(g, '#d9a066', 2.5); g.strokeStyle = '#a8703a'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(w - 6, 14, 4, 6, 0, 0, R2); g.stroke(); g.beginPath(); g.ellipse(w - 6, 14, 1.5, 2.5, 0, 0, R2); g.stroke();
    g.fillStyle = '#5a8f3a'; g.beginPath(); g.ellipse(w * 0.4, 5, 6, 3, 0, 0, R2); g.fill();
  });
}
const LOG = { 2: logCv(2), 3: logCv(3), 4: logCv(4), 5: logCv(5) };
/* Vehículos vistos desde arriba, mirando a la derecha (se voltean para la izquierda) */
function vehicle(type, col) {
  const w = VW[type] * S, h = S - 6; return mk(w + 22, S, (g) => {
    g.fillStyle = 'rgba(255,236,150,.14)'; g.beginPath(); g.moveTo(w, 8); g.lineTo(w + 22, 1); g.lineTo(w + 22, S - 1); g.lineTo(w, S - 8); g.fill(); // luces
    const y = 3, wheel = (x) => { g.fillStyle = OUT; ART.rr(g, x, y - 2, 9, 5, 2); g.fill(); ART.rr(g, x, y + h - 3, 9, 5, 2); g.fill(); };
    if (type === 'truck') { wheel(8); wheel(30); wheel(w - 20);
      ART.rr(g, 1, y, w - 22, h, 4); ART.fillOut(g, '#e8e6f2', 2.5); g.strokeStyle = 'rgba(26,21,48,.25)'; g.lineWidth = 1.5; for (let x = 10; x < w - 26; x += 9) { g.beginPath(); g.moveTo(x, y + 3); g.lineTo(x, y + h - 3); g.stroke(); }
      ART.rr(g, w - 20, y + 1, 19, h - 2, 5); ART.fillOut(g, col, 2.5); ART.rr(g, w - 9, y + 4, 5, h - 8, 2); ART.fillOut(g, '#9fe7ff', 1.5); }
    else if (type === 'dozer') { g.fillStyle = OUT; ART.rr(g, 4, y - 2, w - 14, 7, 3); g.fill(); ART.rr(g, 4, y + h - 5, w - 14, 7, 3); g.fill();
      g.strokeStyle = '#6b6b80'; g.lineWidth = 1.5; for (let x = 7; x < w - 12; x += 5) { g.beginPath(); g.moveTo(x, y - 1); g.lineTo(x, y + 4); g.moveTo(x, y + h - 4); g.lineTo(x, y + h + 1); g.stroke(); }
      ART.rr(g, 6, y + 4, w - 18, h - 8, 4); ART.fillOut(g, '#f2b705', 2.5); ART.rr(g, 12, y + 7, 14, h - 14, 3); ART.fillOut(g, '#9fe7ff', 2);
      ART.rr(g, w - 10, y - 3, 8, h + 6, 2); ART.fillOut(g, '#9a98ac', 2.5); g.fillStyle = OUT; g.fillRect(w - 13, y + h / 2 - 2, 4, 4); }
    else { const race = type === 'racer'; wheel(5); wheel(w - 15);
      g.beginPath(); if (race) { g.moveTo(3, y + 2); g.lineTo(w - 12, y + 3); g.quadraticCurveTo(w, y + h / 2, w - 12, y + h - 3); g.lineTo(3, y + h - 2); g.closePath(); } else ART.rr(g, 2, y + 1, w - 3, h - 2, 8);
      ART.fillOut(g, col, 2.5);
      if (race) { g.fillStyle = '#fff'; g.fillRect(4, y + h / 2 - 2.5, w - 14, 5); ART.rr(g, 0, y - 1, 6, h + 2, 2); ART.fillOut(g, OUT, 1); }
      ART.rr(g, race ? w * 0.45 : w * 0.3, y + 4, race ? 10 : w * 0.38, h - 8, 4); ART.fillOut(g, race ? '#2a2a40' : '#9fe7ff', 2);
      g.fillStyle = 'rgba(255,255,255,.35)'; ART.rr(g, 6, y + 3, w * 0.5, 3, 1.5); g.fill(); }
    g.fillStyle = '#fff6a8'; g.fillRect(w - 3, y + 3, 3, 4); g.fillRect(w - 3, y + h - 7, 3, 4); // faros
    g.fillStyle = '#ff4d6d'; g.fillRect(1, y + 3, 2, 4); g.fillRect(1, y + h - 7, 2, 4);
  });
}
const VEH = {}; function veh(type, col) { const key = type + col; return VEH[key] || (VEH[key] = vehicle(type, col)); }

/* ---------- Dibujo ---------- */
function turtle(x, y, dp, dir, ph) {
  const s = 1 - dp * 0.25; c.save(); c.translate(x, y); c.scale(dir * s, s); c.globalAlpha = 1 - dp * 0.75;
  const pad = Math.sin(t * 8 + ph) * 3;
  c.fillStyle = '#4fae5a'; [[-7, -9 - pad], [-7, 9 + pad], [7, -9 + pad], [7, 9 - pad]].forEach(([a, b]) => { c.beginPath(); c.ellipse(a, b, 4.5, 3, 0, 0, R2); ART.fillOut(c, '#6fcf6a', 1.5); });
  c.beginPath(); c.ellipse(-12, 0, 5, 4.5, 0, 0, R2); ART.fillOut(c, '#6fcf6a', 1.5); c.fillStyle = OUT; c.beginPath(); c.arc(-14, -2, 1.2, 0, R2); c.arc(-14, 2, 1.2, 0, R2); c.fill();
  c.beginPath(); c.ellipse(1, 0, 11, 10, 0, 0, R2); ART.fillOut(c, dp > 0 ? '#a14a3a' : '#c0563f', 2);
  c.strokeStyle = 'rgba(26,21,48,.45)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-4, -4); c.lineTo(6, -4); c.lineTo(6, 4); c.lineTo(-4, 4); c.closePath(); c.moveTo(-4, -4); c.lineTo(-9, -6); c.moveTo(6, -4); c.lineTo(10, -6); c.moveTo(-4, 4); c.lineTo(-9, 6); c.moveTo(6, 4); c.lineTo(10, 6); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-1, -5, 5, 2, 0, 0, R2); c.fill(); c.restore();
}
function frog(x, y, dir, sc, sx, sy, jumpP, alpha) {
  c.save(); c.translate(x, y); c.rotate(dir * Math.PI / 2); c.scale(sc * sx, sc * sy); c.globalAlpha = alpha;
  const ext = jumpP > 0 ? Math.sin(jumpP * Math.PI) : 0, col = '#5ccf5a';
  [-1, 1].forEach((sd) => { // patas traseras (se estiran al saltar) y delanteras
    c.beginPath(); c.ellipse(sd * 9, 6 + ext * 7, 4, 6 + ext * 4, sd * (0.5 - ext * 0.4), 0, R2); ART.fillOut(c, '#46b04a', 2);
    c.beginPath(); c.ellipse(sd * 11, 11 + ext * 10, 4, 2.5, 0, 0, R2); ART.fillOut(c, '#46b04a', 1.5);
    c.beginPath(); c.ellipse(sd * 8, -7 - ext * 3, 3, 4, sd * -0.5, 0, R2); ART.fillOut(c, '#46b04a', 1.5);
  });
  c.beginPath(); c.ellipse(0, 1, 10, 12, 0, 0, R2); ART.fillOut(c, col, 2.5);
  c.fillStyle = '#3f9f45'; [[-4, 5, 2.2], [4, 7, 1.8], [1, 1, 1.6]].forEach(([a, b, r]) => { c.beginPath(); c.arc(a, b, r, 0, R2); c.fill(); });
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-4, -2, 3, 6, 0.3, 0, R2); c.fill();
  [-1, 1].forEach((sd) => { c.beginPath(); c.arc(sd * 5, -9, 4.5, 0, R2); ART.fillOut(c, '#fff', 2); c.fillStyle = OUT; c.beginPath(); c.arc(sd * 5, -10, 2.2, 0, R2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(sd * 5 - 0.8, -11, 0.8, 0, R2); c.fill(); });
  c.restore();
}
function draw() {
  c.drawImage(BG, 0, 0, W, H);
  // olas animadas del río
  c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2; c.lineCap = 'round';
  for (let r = 1; r <= 5; r++) { const L = lanes[r], off = ((t * L.sp * 0.35 * L.dir) % 52 + 52) % 52; for (let i = -1; i < 9; i++) { const x = i * 52 + off + (r % 2) * 26, y = rowY(r) + 9 + ((i + r) % 3) * 7; c.beginPath(); c.arc(x, y + 5, 6, 3.6, 5.8); c.stroke(); } }
  // mosca en una charca
  if (fly.i >= 0) { const h = homes[fly.i], fx = h.x + Math.sin(t * 9) * 3, fy = rowY(0) + S / 2 + Math.cos(t * 7) * 3; c.fillStyle = 'rgba(220,240,255,.8)'; c.beginPath(); c.ellipse(fx - 3, fy - 3, 3.5, 2, -0.5 + Math.sin(t * 40) * 0.4, 0, R2); c.ellipse(fx + 3, fy - 3, 3.5, 2, 0.5 - Math.sin(t * 40) * 0.4, 0, R2); c.fill(); c.beginPath(); c.arc(fx, fy, 3, 0, R2); ART.fillOut(c, '#2a2a40', 1.5); }
  for (const h of homes) if (h.filled) { const s = 0.7 + h.pop * 0.4; frog(h.x, rowY(0) + S / 2 + 2, 2, s, 1, 1, 0, 1); }
  // objetos de los carriles
  for (const r in lanes) {
    const L = lanes[r], y = rowY(r);
    for (const it of L.items) {
      if (it.x > W + 4 || it.x + it.w < -30) continue;
      if (L.type === 'log') { const cv = LOG[it.n]; c.fillStyle = 'rgba(10,30,80,.3)'; ART.rr(c, it.x + 4, y + 8, it.w - 4, 22, 10); c.fill(); if (L.dir > 0) c.drawImage(cv, it.x, y + 2, cv.lw, cv.lh); else { c.save(); c.translate(it.x + it.w, y + 2); c.scale(-1, 1); c.drawImage(cv, 0, 0, cv.lw, cv.lh); c.restore(); } }
      else if (L.type === 'turtle') { const dp = depth(it); if (dp > 0) { c.strokeStyle = `rgba(255,255,255,${0.5 * dp})`; c.lineWidth = 1.5; for (let i = 0; i < it.n; i++) { c.beginPath(); c.ellipse(it.x + i * S + S / 2, y + S / 2, 13 + dp * 3, 8 + dp * 2, 0, 0, R2); c.stroke(); } }
        if (dp < 1) for (let i = 0; i < it.n; i++) turtle(it.x + i * S + S / 2, y + S / 2, dp, L.dir, i + it.ph);
        else { c.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < it.n; i++) { c.beginPath(); c.arc(it.x + i * S + S / 2 + Math.sin(t * 6 + i) * 4, y + S / 2 - ((t * 20 + i * 5) % 10), 2, 0, R2); c.fill(); } } }
      else { const cv = veh(L.type, it.col); c.fillStyle = 'rgba(0,0,0,.28)'; ART.rr(c, it.x + 2, y + 7, it.w, S - 8, 6); c.fill();
        if (L.dir > 0) c.drawImage(cv, it.x, y, cv.lw, cv.lh); else { c.save(); c.translate(it.x + it.w, y); c.scale(-1, 1); c.drawImage(cv, 0, 0, cv.lw, cv.lh); c.restore(); } }
    }
  }
  // rana
  const p = f.jt > 0 ? 1 - f.jt / JT : 1, vx = f.fx + (f.x - f.fx) * (f.jt > 0 ? p : 1), vy = rowY(f.fy + (f.y - f.fy) * (f.jt > 0 ? p : 1)) + S / 2, cx = vx + S / 2;
  if (!f.dead || f.kind === 'time') {
    const arc = f.jt > 0 ? Math.sin(p * Math.PI) : 0, sq = f.land > 0 ? f.land / 0.12 : 0;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx, vy + 8 + arc * 6, 11 - arc * 3, 5 - arc, 0, 0, R2); c.fill();
    frog(cx, vy - arc * 6, f.dir, 1 + arc * 0.22, 1 + sq * 0.18, 1 - sq * 0.15, f.jt > 0 ? p : 0, f.dead ? f.dead / 0.9 : 1);
  } else if (f.kind === 'squash') { c.save(); c.translate(cx, vy); c.scale(1.5, 0.45); c.beginPath(); c.ellipse(0, 0, 12, 12, 0, 0, R2); ART.fillOut(c, '#5ccf5a', 2.5); c.restore(); c.fillStyle = OUT; c.beginPath(); c.arc(cx - 6, vy - 1, 1.8, 0, R2); c.arc(cx + 6, vy - 1, 1.8, 0, R2); c.fill(); }
  else { const q = 1 - f.dead / 0.9; c.strokeStyle = `rgba(255,255,255,${1 - q})`; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(cx, vy, 6 + q * 22 + i * 7, (6 + q * 22 + i * 7) * 0.5, 0, 0, R2); c.stroke(); } }
  hud();
}
function hud() {
  label(`${score}`, 12, 8, 22, '#fff'); label(`Nivel ${level}`, 12, 32, 12, '#9fe7ff');
  for (let i = 0; i < 4; i++) { const x = W - 22 - i * 26, y = 20; c.save(); c.globalAlpha = i < lives ? 1 : 0.25; c.translate(x, y); c.beginPath(); c.ellipse(0, 2, 10, 8, 0, 0, R2); ART.fillOut(c, '#5ccf5a', 2);
    [-1, 1].forEach((sd) => { c.beginPath(); c.arc(sd * 5, -4, 4, 0, R2); ART.fillOut(c, '#fff', 1.5); c.fillStyle = OUT; c.beginPath(); c.arc(sd * 5, -4, 1.8, 0, R2); c.fill(); }); c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 3, 4, 0.3, Math.PI - 0.3); c.stroke(); c.restore(); }
  const fr = timer / 45, bx = 12, by = 48, bw = W - 24, low = timer < 8;
  ART.rr(c, bx, by, bw, 10, 5); ART.fillOut(c, '#0a0c20', 2);
  if (fr > 0) { ART.rr(c, bx + 2, by + 2, Math.max(6, (bw - 4) * fr), 6, 3); c.fillStyle = low ? (Math.sin(t * 12) > 0 ? '#ff5f7a' : '#ff9a5c') : fr > 0.5 ? '#7cf7a0' : '#f2d15c'; c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(bx + 4, by + 3, Math.max(0, (bw - 8) * fr), 1.5); }
  if (clearT > 0) { c.globalAlpha = Math.min(1, clearT); label(`¡Nivel ${level}!`, W / 2, H / 2 - 20, 34, '#f2d15c', 'center'); c.globalAlpha = 1; }
}
