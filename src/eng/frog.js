/* Frog Crossing — cruza la carretera y el río hasta las 5 charcas. Arte vectorial propio (ART).
 * Coches, camiones y bólidos por carril; troncos y tortugas (algunas se sumergen); mosca de bonificación. */
const MODE = CFG.mode || 'clasico', INF = MODE === 'infinito'; /* 'infinito': filas sin fin para 1–4 jugadores */
const W = 416, H = 480, S = 32, TOP = 64, OUT = ART.OUT, R2 = 6.2832, P = 640, LO = -180, JT = 0.13;
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
function reset() { if (INF) return resetInf(); score = 0; lives = 4; level = 1; build(); }
/* profundidad de una tortuga que bucea (0 = a flote, 1 = sumergida) */
function depth(it) { if (!it.dive) return 0; const q = (t + it.ph) % 5; return q < 3.2 ? 0 : q < 3.8 ? (q - 3.2) / 0.6 : q < 4.5 ? 1 : 1 - (q - 4.5) / 0.5; }
if (!INF) reset(); k.show(CFG.title, INF ? (CFG.help || 'Cruza sin parar: la pantalla sube sola y quien se queda atrás cae.') : 'Cruza la carretera y el río hasta las 5 charcas. Sube a troncos y tortugas (¡algunas bucean!). Atrapa la mosca para ganar puntos extra. Desliza, toca o usa las flechas.');

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
  if (INF) { t += dt; return updInf(dt); }
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
    /* tronco de una pieza: cuerpo y testa se trazan juntos y se rellenan después */
    const body = (q) => ART.rr(q, 2, 3, w, 22, 10), cap = (q) => { q.moveTo(w + 1, 14); q.ellipse(w - 6, 14, 7, 10, 0, 0, R2); };
    unite(g, [[body, '#8b5a2b'], [cap, '#d9a066']], 1.15);
    within(g, body, (q) => {
      q.strokeStyle = AL('#3c200e', 0.6); q.lineWidth = 1.5; q.lineCap = 'round';
      for (let i = 0; i < n * 3; i++) { const x = 10 + srnd(i + n * 20) * (w - 26), y = 8 + (i % 3) * 5.5; q.beginPath(); q.moveTo(x, y); q.lineTo(x + 8 + srnd(i) * 14, y); q.stroke(); }
      q.fillStyle = 'rgba(255,255,255,.2)'; ART.rr(q, 8, 5, w - 22, 4, 2); q.fill();
      q.fillStyle = AL(OUT, 0.2); ART.rr(q, 4, 19, w - 8, 5, 2.5); q.fill();
      q.fillStyle = '#5a8f3a'; q.beginPath(); q.ellipse(w * 0.4, 5, 6, 3, 0, 0, R2); q.fill();
    });
    within(g, cap, (q) => { /* anillos por cambio de color, sin contorno */
      q.fillStyle = '#c08a52'; q.beginPath(); q.ellipse(w - 6, 14, 4.6, 6.6, 0, 0, R2); q.fill();
      q.fillStyle = '#d9a066'; q.beginPath(); q.ellipse(w - 6, 14, 3.4, 5, 0, 0, R2); q.fill();
      q.fillStyle = '#a8703a'; q.beginPath(); q.ellipse(w - 6, 14, 1.5, 2.5, 0, 0, R2); q.fill();
      q.fillStyle = AL('#ffffff', 0.22); q.beginPath(); q.ellipse(w - 7.6, 9.4, 3.4, 2.2, -0.5, 0, R2); q.fill();
    });
  });
}
const LOG = { 2: logCv(2), 3: logCv(3), 4: logCv(4), 5: logCv(5) };
/* Vehículos vistos desde arriba, mirando a la derecha (se voltean para la izquierda) */
function vehicle(type, col) {
  const w = VW[type] * S, h = S - 6; return mk(w + 22, S, (g) => {
    g.fillStyle = 'rgba(255,236,150,.14)'; g.beginPath(); g.moveTo(w, 8); g.lineTo(w + 22, 1); g.lineTo(w + 22, S - 1); g.lineTo(w, S - 8); g.fill(); // luces
    const y = 3;
    /* las ruedas sí giran: van detrás, sin contorno propio */
    const wheel = (x) => { g.fillStyle = OUT; ART.rr(g, x, y - 2, 9, 5, 2); g.fill(); ART.rr(g, x, y + h - 3, 9, 5, 2); g.fill(); };
    const glass = (q, x, yy, ww, hh, r, cl) => { q.fillStyle = AL(OUT, 0.3); ART.rr(q, x, yy + 1.2, ww, hh, r); q.fill(); q.fillStyle = cl; ART.rr(q, x, yy, ww, hh, r); q.fill(); q.fillStyle = AL('#ffffff', 0.3); ART.rr(q, x + 1.5, yy + 1.5, ww * 0.45, hh * 0.3, r * 0.5); q.fill(); };
    let body;
    if (type === 'truck') { wheel(8); wheel(30); wheel(w - 20);
      const box = (q) => ART.rr(q, 1, y, w - 22, h, 4), cab = (q) => ART.rr(q, w - 21, y + 1, 20, h - 2, 5);
      unite(g, [[box, '#e8e6f2'], [cab, col]], 1.15);
      body = (q) => { box(q); cab(q); };
      within(g, box, (q) => { q.strokeStyle = AL(OUT, 0.25); q.lineWidth = 1.3; for (let x = 10; x < w - 26; x += 9) { q.beginPath(); q.moveTo(x, y + 3); q.lineTo(x, y + h - 3); q.stroke(); } });
      within(g, cab, (q) => glass(q, w - 9, y + 4, 5, h - 8, 2, '#9fe7ff'));
    } else if (type === 'dozer') {
      const hull = (q) => ART.rr(q, 6, y + 4, w - 18, h - 8, 4), blade = (q) => ART.rr(q, w - 11, y - 3, 9, h + 6, 2);
      const trk = (q) => { ART.rr(q, 4, y - 2, w - 14, 7, 3); ART.rr(q, 4, y + h - 5, w - 14, 7, 3); };
      unite(g, [[trk, '#2a2d4a'], [hull, '#f2b705'], [blade, '#9a98ac']], 1.15);
      body = (q) => { trk(q); hull(q); blade(q); };
      within(g, trk, (q) => { q.strokeStyle = '#6b6b80'; q.lineWidth = 1.4; for (let x = 7; x < w - 12; x += 5) { q.beginPath(); q.moveTo(x, y - 1); q.lineTo(x, y + 4); q.moveTo(x, y + h - 4); q.lineTo(x, y + h + 1); q.stroke(); } });
      within(g, hull, (q) => glass(q, 12, y + 7, 14, h - 14, 3, '#9fe7ff'));
      within(g, blade, (q) => { q.fillStyle = AL(OUT, 0.35); q.fillRect(w - 11, y + h / 2 - 2, 5, 4); });
    } else { const race = type === 'racer'; wheel(5); wheel(w - 15);
      const shell = race ? (q) => { q.moveTo(3, y + 2); q.lineTo(w - 12, y + 3); q.quadraticCurveTo(w, y + h / 2, w - 12, y + h - 3); q.lineTo(3, y + h - 2); q.closePath(); } : (q) => ART.rr(q, 2, y + 1, w - 3, h - 2, 8);
      const spoil = race ? (q) => ART.rr(q, -1, y - 1, 7, h + 2, 2) : null;
      unite(g, spoil ? [[spoil, '#2a2a40'], [shell, col]] : [[shell, col]], 1.15);
      body = spoil ? (q) => { spoil(q); shell(q); } : shell;
      within(g, shell, (q) => {
        if (race) { q.fillStyle = '#fff'; q.fillRect(4, y + h / 2 - 2.5, w - 14, 5); }
        glass(q, race ? w * 0.45 : w * 0.3, y + 4, race ? 10 : w * 0.38, h - 8, 4, race ? '#2a2a40' : '#9fe7ff');
        q.fillStyle = 'rgba(255,255,255,.35)'; ART.rr(q, 6, y + 3, w * 0.5, 3, 1.5); q.fill();
        q.fillStyle = AL(OUT, 0.18); q.fillRect(0, y + h - 4.5, w, 4.5);
      });
    }
    within(g, body, (q) => { q.fillStyle = '#fff6a8'; q.fillRect(w - 4, y + 3, 4, 4); q.fillRect(w - 4, y + h - 7, 4, 4); q.fillStyle = '#ff4d6d'; q.fillRect(0, y + 3, 3, 4); q.fillRect(0, y + h - 7, 3, 4); });
  });
}
const VEH = {}; function veh(type, col) { const key = type + col; return VEH[key] || (VEH[key] = vehicle(type, col)); }

/* ---------- Dibujo ---------- */
function turtle(x, y, dp, dir, ph) {
  const s = 1 - dp * 0.25; c.save(); c.translate(x, y); c.scale(dir * s, s); c.globalAlpha = 1 - dp * 0.75;
  const pad = Math.sin(t * 8 + ph) * 3;
  /* tortuga de una pieza: aletas, cabeza y caparazón trazados juntos */
  const fins = (q) => { [[-7, -9 - pad], [-7, 9 + pad], [7, -9 + pad], [7, 9 - pad]].forEach(([a, b]) => { q.moveTo(a + 4.5, b); q.ellipse(a, b, 4.5, 3.4, 0, 0, R2); }); };
  const head = (q) => { q.moveTo(-7, 0); q.ellipse(-12, 0, 5.4, 4.5, 0, 0, R2); };
  const shell = (q) => { q.moveTo(12, 0); q.ellipse(1, 0, 11, 10, 0, 0, R2); };
  unite(c, [[fins, '#6fcf6a'], [head, '#6fcf6a'], [shell, dp > 0 ? '#a14a3a' : '#c0563f']], 1.1 / Math.max(0.5, s));
  clipIn(c, head, (g) => { g.fillStyle = OUT; g.beginPath(); g.arc(-14, -2, 1.2, 0, R2); g.arc(-14, 2, 1.2, 0, R2); g.fill(); g.fillStyle = AL(OUT, 0.16); g.fillRect(-18, 2, 12, 4); });
  clipIn(c, shell, (g) => {
    /* placas del caparazón: hendidura por luz + sombra, nunca un trazo negro */
    const scutes = (q) => { q.beginPath(); q.moveTo(-4, -4); q.lineTo(6, -4); q.lineTo(6, 4); q.lineTo(-4, 4); q.closePath(); q.moveTo(-4, -4); q.lineTo(-9, -6); q.moveTo(6, -4); q.lineTo(10, -6); q.moveTo(-4, 4); q.lineTo(-9, 6); q.moveTo(6, 4); q.lineTo(10, 6); q.stroke(); };
    g.lineWidth = 1.4; g.lineJoin = 'round'; g.strokeStyle = AL('#ffffff', 0.22); g.save(); g.translate(0.7, 0.7); scutes(g); g.restore();
    g.lineWidth = 1.2; g.strokeStyle = AL(OUT, 0.38); scutes(g);
    g.fillStyle = AL('#ffffff', 0.3); g.beginPath(); g.ellipse(-1, -5, 5, 2, 0, 0, R2); g.fill();
    g.fillStyle = AL(OUT, 0.18); g.beginPath(); g.ellipse(2, 8, 10, 3.4, 0, 0, R2); g.fill();
  });
  c.restore();
}
function frog(x, y, dir, sc, sx, sy, jumpP, alpha, cl) {
  c.save(); c.translate(x, y); c.rotate(dir * Math.PI / 2); c.scale(sc * sx, sc * sy); c.globalAlpha = alpha;
  const ext = jumpP > 0 ? Math.sin(jumpP * Math.PI) : 0, col = cl || '#5ccf5a';
  const leg = ART.dark(col, 0.18), spot = ART.dark(col, 0.3);
  /* rana de una pieza: patas, cuerpo y ojos forman una sola silueta */
  const legs = (q) => { [-1, 1].forEach((sd) => {
    q.moveTo(sd * 9 + 4, 6 + ext * 7); q.ellipse(sd * 9, 6 + ext * 7, 4.4, 6.4 + ext * 4, sd * (0.5 - ext * 0.4), 0, R2);
    q.moveTo(sd * 11 + 4, 11 + ext * 10); q.ellipse(sd * 11, 11 + ext * 10, 4.2, 2.8, 0, 0, R2);
    q.moveTo(sd * 8 + 3, -7 - ext * 3); q.ellipse(sd * 8, -7 - ext * 3, 3.2, 4.2, sd * -0.5, 0, R2); }); };
  const body = (q) => { q.moveTo(10, 1); q.ellipse(0, 1, 10, 12, 0, 0, R2); };
  const eyes = (q) => { [-1, 1].forEach((sd) => { q.moveTo(sd * 5 + 4.4, -9); q.arc(sd * 5, -9, 4.4, 0, R2); }); };
  unite(c, [[legs, leg], [body, col], [eyes, '#fff']], 1.15 / Math.max(0.5, sc));
  clipIn(c, body, (g) => {
    g.fillStyle = spot; [[-4, 5, 2.2], [4, 7, 1.8], [1, 1, 1.6]].forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, R2); g.fill(); });
    g.fillStyle = AL('#ffffff', 0.35); g.beginPath(); g.ellipse(-4, -2, 3, 6, 0.3, 0, R2); g.fill();
    g.fillStyle = AL(OUT, 0.15); g.beginPath(); g.ellipse(0, 12, 9, 4, 0, 0, R2); g.fill();
  });
  clipIn(c, eyes, (g) => { [-1, 1].forEach((sd) => { g.fillStyle = OUT; g.beginPath(); g.arc(sd * 5, -10, 2.2, 0, R2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(sd * 5 - 0.8, -11, 0.8, 0, R2); g.fill(); }); g.fillStyle = AL(OUT, 0.14); g.fillRect(-12, -6.4, 24, 3); });
  c.restore();
}
function draw() {
  if (INF) return drawInf();
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

/* ================= MODO INFINITO (CFG.mode='infinito'): filas sin fin, 1–4 jugadores =================
 * La cámara sube sola y cada vez más rápido; quien se queda por debajo del borde pierde una vida.
 * Puntúa la fila más alta alcanzada; al caer el último sale la clasificación (k.podium). */
var IP = [], camN = 0, genN = 0, ROWS = {}, elapsed = 0, overI = 0, banner2 = '', bannerT = 0, CPUW = 0;
try { CPUW = Math.min(8, +localStorage.getItem('cpu:' + CFG.id) || 0); } catch (e) { /* sin almacenamiento */ }
var VIS = Math.floor((H - TOP - 32) / S); // filas visibles
const BOT = 32; // franja inferior: la fila más baja no queda pegada al borde
const yOf = (n) => H - BOT - S - (n - camN) * S;
const iskill = () => Math.min(0.78, 0.26 + CPUW * 0.05);
const hard = (n) => Math.min(1, n / 170); // dificultad por altura

function mkRow(type) {
  const n = genN++, d = hard(n), R = { n, type, items: [], dir: 0, sp: 0 };
  if (type === 'road') {
    const kind = ['car', 'truck', 'car', 'racer', 'dozer'][k.ri(0, 4)];
    R.kind = kind; R.dir = k.pick([-1, 1]); R.sp = (34 + k.rnd(0, 26) + (kind === 'racer' ? 34 : 0)) * (0.62 + 0.72 * d);
    const w = VW[kind] * S; let x = LO + k.rnd(0, 90);
    for (;;) { const gap = (k.ri(2, 4) + (d < 0.25 ? 1 : 0)) * S - d * 16; if (R.items.length && x + w + S * 1.4 > LO + P) break; R.items.push({ x, w, col: k.pick(CARCOL) }); x += w + gap; }
  } else if (type === 'river') {
    const turtle = Math.random() < 0.42;
    R.kind = turtle ? 'turtle' : 'log'; R.dir = k.pick([-1, 1]); R.sp = (30 + k.rnd(0, 26)) * (0.66 + 0.6 * d);
    let x = LO + k.rnd(0, 90);
    for (;;) { const len = turtle ? k.ri(2, 3) : k.ri(3, 5), w = len * S, gap = k.ri(2, 3) * S;
      if (R.items.length && x + w + S * 1.4 > LO + P) break;
      R.items.push({ x, w, n: len, ph: k.rnd(0, 5), dive: turtle && R.items.length > 0 && Math.random() < 0.12 + d * 0.3 }); x += w + gap; }
  }
  ROWS[n] = R; return R;
}
function ensure(upTo) {
  while (genN <= upTo) {
    if (genN < 4) { mkRow('grass'); continue; }
    const d = hard(genN), r = Math.random();
    if (r < 0.44) { const cnt = k.ri(1, 2 + Math.round(d * 2)); for (let i = 0; i < cnt; i++) mkRow('road'); mkRow('grass'); }
    else if (r < 0.8) { const cnt = k.ri(1, 2 + Math.round(d * 1.6)); for (let i = 0; i < cnt; i++) mkRow('river'); mkRow('grass'); }
    else mkRow('grass');
  }
}
function rowAt(n) { if (n < 0) return null; ensure(n); return ROWS[n]; }
function nSeatsI() { return k.party ? Math.max(1, Math.max.apply(null, k.party.map((x) => x.p)) + 1) : Math.min(2, k.mpMax || 1); }
function resetInf() {
  ROWS = {}; genN = 0; camN = 0; elapsed = 0; overI = 0; bannerT = 0; t = 0;
  ensure(VIS + 4);
  const seats = k.players(nSeatsI());
  IP = seats.map((q, i) => ({ p: q.p, col: q.color, name: q.name, cpu: q.cpu, x: (3 + i * 2) * S, n: 1, fx: (3 + i * 2) * S, fn: 1, jt: 0, dir: 0, q: null,
    lives: 3, best: 0, inv: 2.5, dead: 0, kind: '', out: false, land: 0, think: 0.4 + i * 0.1 }));
}
function jumpI(pl, d) {
  const [dx, dy, a] = DIRS[d], nn = pl.n - dy, nx = k.clamp(pl.x + dx * S, 0, W - S);
  if (nn < Math.floor(camN)) return;
  pl.fx = pl.x; pl.fn = pl.n; pl.x = nx; pl.n = nn; pl.dir = a; pl.jt = JT; if (!pl.cpu) k.sfx('jump');
  if (pl.n - 1 > pl.best) pl.best = pl.n - 1;
}
function hitI(pl, kind) {
  if (pl.dead || pl.inv > 0 || pl.out) return;
  pl.dead = 0.8; pl.kind = kind; pl.lives--;
  const cx = pl.x + S / 2, cy = yOf(pl.n) + S / 2;
  if (kind === 'splash') { k.burst(cx, cy, '#9fe7ff', 16, 140); k.sfx('hurt'); }
  else if (kind === 'squash') { k.burst(cx, cy, '#7cf78a', 14, 170); k.sfx('hit'); k.shake(6); }
  else { k.burst(cx, cy, '#ffb13d', 12, 150); k.sfx('lose'); }
  if (!pl.cpu) navigator.vibrate && navigator.vibrate(90);
}
function depthI(it) { if (!it.dive) return 0; const q = (t + it.ph) % 5; return q < 3.4 ? 0 : q < 4 ? (q - 3.4) / 0.6 : q < 4.6 ? 1 : 1 - (q - 4.6) / 0.4; }
function floatAt(R, cx) { return R.items.find((it) => cx > it.x - 3 && cx < it.x + it.w + 3 && depthI(it) < 0.7); }
function safeAt(R, x, ahead) {
  if (!R || R.type === 'grass') return true;
  const cx = x + S / 2;
  if (R.type === 'road') {
    for (const it of R.items) for (const q of [0, 0.3, 0.6]) { const off = R.dir * R.sp * q * (ahead ? 1 : 0); if (cx > it.x - 11 + off && cx < it.x + it.w + 11 + off) return false; }
    return true;
  }
  return !!floatAt(R, cx);
}
function cpuI(pl, dt) {
  pl.think -= dt; if (pl.think > 0 || pl.jt > 0 || pl.dead) return;
  const sk = iskill(); pl.think = 0.42 - sk * 0.2 + Math.random() * 0.22;
  const here = rowAt(pl.n), up = rowAt(pl.n + 1), urge = pl.n - camN < 4;
  if (here && here.type === 'river') { const on = floatAt(here, pl.x + S / 2);
    if (on && (on.x < 6 || on.x + on.w > W - 6)) { const away = on.x < 6 ? 'right' : 'left'; if (Math.random() < 0.8) return jumpI(pl, away); } }
  if (safeAt(up, pl.x, true)) return jumpI(pl, 'up');
  if (urge && Math.random() < 0.5 - sk * 0.3) return jumpI(pl, 'up'); // con la cámara encima arriesga
  for (const d of k.shuffle(['left', 'right'])) { const nx = k.clamp(pl.x + (d === 'left' ? -S : S), 0, W - S); if (safeAt(here, nx, false) && safeAt(up, nx, true)) return jumpI(pl, d); }
}
function updInf(dt) {
  if (overI > 0) { overI -= dt; if (overI <= 0) { const win = IP.slice().sort((a, b) => b.best - a.best)[0];
      if (win && !win.cpu) { CPUW++; try { localStorage.setItem('cpu:' + CFG.id, CPUW); } catch (e) { /* sin almacenamiento */ } }
      k.podium(IP.map((q) => ({ p: q.p, score: q.best })), { fmt: (v) => v + ' m' }); } return; }
  elapsed += dt; if (bannerT > 0) bannerT -= dt;
  // cámara: sube sola tras 6 s de cortesía y sigue al que va delante
  const rise = elapsed < 6 ? 0 : Math.min(1.15, 0.16 + (elapsed - 6) * 0.013);
  camN += rise * dt;
  const alive = IP.filter((q) => !q.out);
  if (alive.length) { const lead = Math.max.apply(null, alive.map((q) => q.n)); camN = Math.max(camN, lead - VIS + 4); }
  ensure(Math.ceil(camN) + VIS + 3);
  for (const key in ROWS) { const R = ROWS[key]; if (+key < camN - 3 || +key > camN + VIS + 4) { if (+key < camN - 6) delete ROWS[key]; continue; }
    if (R.sp) for (const it of R.items) { it.x += R.dir * R.sp * dt; if (it.x >= LO + P) it.x -= P; else if (it.x < LO) it.x += P; } }
  for (const pl of IP) {
    if (pl.out) continue;
    if (pl.dead > 0) { pl.dead -= dt; if (pl.dead <= 0) { pl.dead = 0;
        if (pl.lives <= 0) { pl.out = true; if (!pl.cpu) { banner2 = `${pl.name}: ${pl.best} m`; bannerT = 1.6; } }
        else { pl.n = pl.fn = Math.ceil(camN) + 2; pl.x = pl.fx = k.clamp(pl.x, 0, W - S); pl.jt = 0; pl.inv = 2; } }
      continue; }
    pl.inv -= dt;
    if (pl.cpu) cpuI(pl, dt);
    else {
      let d = ['up', 'down', 'left', 'right'].find((q) => k.phit(pl.p, q));
      if (!k.party && pl.p === 0 && !d) d = k.swipe || (k.tap ? 'up' : null);
      if (d) { if (pl.jt > 0) pl.q = d; else jumpI(pl, d); }
    }
    if (pl.jt > 0) { pl.jt -= dt; if (pl.jt <= 0) { pl.jt = 0; pl.land = 0.12; if (pl.q) { const q = pl.q; pl.q = null; jumpI(pl, q); } } }
    pl.land = Math.max(0, pl.land - dt);
    if (pl.jt > 0) continue;
    const R = rowAt(pl.n), cx = pl.x + S / 2;
    if (R && R.type === 'road' && pl.inv <= 0 && R.items.some((it) => cx + 8.5 > it.x + 3 && cx - 8.5 < it.x + it.w - 3)) { hitI(pl, 'squash'); continue; }
    if (R && R.type === 'river') {
      const on = floatAt(R, cx);
      if (!on) { if (pl.inv <= 0) { hitI(pl, 'splash'); continue; } } else { pl.x += R.dir * R.sp * dt; pl.fx = pl.x; if (pl.x < -14 || pl.x > W - S + 14) { hitI(pl, 'splash'); continue; } }
    }
    if (pl.n < camN - 0.15) hitI(pl, 'atras');
  }
  if (IP.every((q) => q.out)) { overI = 1.2; k.sfx('win'); if (IP.some((q) => !q.cpu && q.best >= 40)) k.confetti(); }
}

/* ---------- Dibujo del modo infinito ---------- */
var STRIP = {};
function strip(type) {
  if (STRIP[type]) return STRIP[type];
  return (STRIP[type] = mk(W, S, (g) => {
    if (type === 'grass') { const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#5cb85a'); gr.addColorStop(1, '#4aa34c'); g.fillStyle = gr; g.fillRect(0, 0, W, S);
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(30,90,40,.45)'; g.fillRect(srnd(i) * W, 4 + srnd(i * 3) * (S - 10), 2, 5); }
      for (let i = 0; i < 6; i++) { const x = 20 + srnd(i * 7) * (W - 40), y = 8 + srnd(i + 3) * (S - 16); g.fillStyle = ['#fff3a8', '#ff9ad5', '#ffffff'][i % 3];
        for (let q = 0; q < 5; q++) { g.beginPath(); g.arc(x + Math.cos(q * 1.256) * 2.5, y + Math.sin(q * 1.256) * 2.5, 1.8, 0, R2); g.fill(); }
        g.fillStyle = '#f2b705'; g.beginPath(); g.arc(x, y, 1.5, 0, R2); g.fill(); } }
    else if (type === 'road') { const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#3a3a4e'); gr.addColorStop(1, '#434358'); g.fillStyle = gr; g.fillRect(0, 0, W, S);
      for (let i = 0; i < 120; i++) { g.fillStyle = srnd(i) > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)'; g.fillRect(srnd(i * 1.3) * W, srnd(i * 2.7) * S, 2, 2); }
      g.fillStyle = 'rgba(255,255,255,.7)'; for (let x = 6; x < W; x += 40) g.fillRect(x, S / 2 - 1.5, 22, 3); }
    else { const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#1f6fb8'); gr.addColorStop(1, '#2b86c9'); g.fillStyle = gr; g.fillRect(0, 0, W, S);
      g.fillStyle = 'rgba(10,30,80,.22)'; g.fillRect(0, S - 3, W, 3); }
  }));
}
function drawInf() {
  const gr = c.createLinearGradient(0, TOP, 0, H); gr.addColorStop(0, '#0d1428'); gr.addColorStop(1, '#101b2e'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  const n0 = Math.floor(camN) - 1, n1 = Math.ceil(camN) + VIS + 1;
  for (let n = n0; n <= n1; n++) { const R = rowAt(n); if (!R) continue; const y = yOf(n); if (y > H || y < TOP - S) continue;
    c.drawImage(strip(R.type === 'grass' ? 'grass' : R.type), 0, y, W, S);
    if (R.type === 'river') { c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 2; c.lineCap = 'round';
      const off = ((t * R.sp * 0.35 * R.dir) % 52 + 52) % 52;
      for (let i = -1; i < 9; i++) { c.beginPath(); c.arc(i * 52 + off + (n % 2) * 26, y + 12 + ((i + n) % 3) * 6, 6, 3.6, 5.8); c.stroke(); } }
  }
  for (let n = n0; n <= n1; n++) {
    const R = rowAt(n); if (!R || !R.items.length) continue; const y = yOf(n); if (y > H || y < TOP - S) continue;
    for (const it of R.items) {
      if (it.x > W + 4 || it.x + it.w < -30) continue;
      if (R.kind === 'log') { const cv = LOG[Math.min(5, it.n)]; c.fillStyle = 'rgba(10,30,80,.3)'; ART.rr(c, it.x + 4, y + 8, it.w - 4, 22, 10); c.fill();
        if (R.dir > 0) c.drawImage(cv, it.x, y + 2, cv.lw, cv.lh); else { c.save(); c.translate(it.x + it.w, y + 2); c.scale(-1, 1); c.drawImage(cv, 0, 0, cv.lw, cv.lh); c.restore(); } }
      else if (R.kind === 'turtle') { const dp = depthI(it);
        if (dp < 1) for (let i = 0; i < it.n; i++) turtle(it.x + i * S + S / 2, y + S / 2, dp, R.dir, i + it.ph);
        else { c.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < it.n; i++) { c.beginPath(); c.arc(it.x + i * S + S / 2 + Math.sin(t * 6 + i) * 4, y + S / 2 - ((t * 20 + i * 5) % 10), 2, 0, R2); c.fill(); } } }
      else { const cv = veh(R.kind, it.col); c.fillStyle = 'rgba(0,0,0,.28)'; ART.rr(c, it.x + 2, y + 7, it.w, S - 8, 6); c.fill();
        if (R.dir > 0) c.drawImage(cv, it.x, y, cv.lw, cv.lh); else { c.save(); c.translate(it.x + it.w, y); c.scale(-1, 1); c.drawImage(cv, 0, 0, cv.lw, cv.lh); c.restore(); } }
    }
  }
  for (const pl of IP) {
    if (pl.out) continue;
    const p = pl.jt > 0 ? 1 - pl.jt / JT : 1, vx = pl.fx + (pl.x - pl.fx) * (pl.jt > 0 ? p : 1);
    const vn = pl.fn + (pl.n - pl.fn) * (pl.jt > 0 ? p : 1), vy = yOf(vn) + S / 2, cx = vx + S / 2;
    if (vy < TOP - S || vy > H + S) continue;
    if (!pl.dead) {
      const arc = pl.jt > 0 ? Math.sin(p * Math.PI) : 0, sq = pl.land > 0 ? pl.land / 0.12 : 0;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx, vy + 8 + arc * 6, 11 - arc * 3, 5 - arc, 0, 0, R2); c.fill();
      const al = pl.inv > 0 && Math.floor(t * 12) % 2 ? 0.35 : 1;
      frog(cx, vy - arc * 6, pl.dir, 1 + arc * 0.22, 1 + sq * 0.18, 1 - sq * 0.15, pl.jt > 0 ? p : 0, al, pl.col);
    } else if (pl.kind === 'squash') { c.save(); c.translate(cx, vy); c.scale(1.5, 0.45); c.beginPath(); c.ellipse(0, 0, 12, 12, 0, 0, R2); ART.fillOut(c, pl.col, 2.5); c.restore(); }
    else { const q = 1 - pl.dead / 0.8; c.strokeStyle = `rgba(255,255,255,${1 - q})`; c.lineWidth = 3;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(cx, vy, 6 + q * 20 + i * 7, (6 + q * 20 + i * 7) * 0.5, 0, 0, R2); c.stroke(); } }
    // flecha si va por encima del borde visible
    if (vn > camN + VIS - 0.5) { c.fillStyle = pl.col; c.beginPath(); c.moveTo(cx, TOP + 4); c.lineTo(cx - 7, TOP + 14); c.lineTo(cx + 7, TOP + 14); c.closePath(); ART.fillOut(c, pl.col, 2); }
  }
  // borde inferior: la cámara se come la fila de abajo
  const gg = c.createLinearGradient(0, H - BOT - 14, 0, H - BOT); gg.addColorStop(0, 'rgba(12,8,28,0)'); gg.addColorStop(1, 'rgba(12,8,28,.55)'); c.fillStyle = gg; c.fillRect(0, H - BOT - 14, W, 14);
  c.fillStyle = '#0c0a20'; c.fillRect(0, H - BOT, W, BOT);
  hudInf();
}
function fitTxt(s, max, size, min) {
  let sz = size;
  for (; sz > (min || 8); sz--) { c.font = `800 ${sz}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; if (c.measureText(s).width <= max) return [s, sz]; }
  let out = s; while (out.length > 1) { out = out.slice(0, -1); if (c.measureText(out + '…').width <= max) return [out + '…', sz]; }
  return [out, sz];
}
function hudInf() {
  c.fillStyle = '#0c0a20'; c.fillRect(0, 0, W, TOP); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(0, TOP - 2, W, 2);
  // hueco central libre: ahi cae el boton de pausa del reproductor cuando el juego ocupa toda la pantalla
  const n = Math.max(1, IP.length), gapL = W / 2 - 58, gapR = W / 2 + 58;
  const nl = Math.min(n, Math.max(1, Math.round(n / 2))), nr = n - nl;
  const wl = gapL / nl, wr = nr ? (W - gapR) / nr : 0;
  IP.forEach((pl, i) => {
    const lf = i < nl, x = (lf ? i * wl : gapR + (i - nl) * wr) + 8, inner = (lf ? wl : wr) - 16;
    c.globalAlpha = pl.out ? 0.4 : 1;
    c.fillStyle = pl.col; ART.rr(c, x, 7, 10, 10, 3); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    const [nm, ns] = fitTxt(String(pl.name), inner - 15, 12, 8);
    label(nm, x + 15, 7, ns, '#fff');
    label(`${pl.best} m`, x, 24, 15, pl.col);
    for (let v = 0; v < 3; v++) { c.beginPath(); c.arc(x + 5 + v * 11, 48, 3.4, 0, R2); c.fillStyle = v < pl.lives ? '#7cf78a' : 'rgba(255,255,255,.18)'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = OUT; c.stroke(); }
    c.globalAlpha = 1;
  });
  if (bannerT > 0) { c.globalAlpha = Math.min(1, bannerT * 3); const [bt, bs] = fitTxt(banner2, W - 60, 20, 12), bw = c.measureText(bt).width + 34;
    ART.rr(c, W / 2 - bw / 2, H / 2 - 24, bw, 40, 12); c.fillStyle = '#171334'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    c.textBaseline = 'middle'; label(bt, W / 2, H / 2 - 4, bs, '#ffc94d', 'center'); c.textBaseline = 'top'; c.globalAlpha = 1; }
}
if (INF) resetInf(); // el estado del modo infinito se crea tras declarar sus variables
if (INF) k.onParty = () => { // la tele manda los jugadores después de cargar: rehacer plazas fuera de partida
  if (k.st === 'play' && IP.length) { const seats = k.players(nSeatsI());
    seats.forEach((q, i) => { const pl = IP[i]; if (pl) { pl.cpu = q.cpu; pl.name = q.name; pl.col = q.color; } });
    if (seats.length !== IP.length) resetInf(); }
  else resetInf();
};
