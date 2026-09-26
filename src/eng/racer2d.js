/* racer2d — carreras cenitales con derrape (oleada 1). CFG.mode:
 *  'mesa'   Rally de Mesa: cochecitos sobre la mesa de la cocina; salirte por el borde te tira al suelo y te retrasa.
 *  'garaje' Circuito Garaje: la cámara sigue al líder; quien se queda fuera de cámara pierde un punto (rondas a 6 puntos).
 *  'patio'  Karts de Patio: cajas con objetos propios (pompa, muelle y charco).
 * Circuitos definidos por spline Catmull-Rom cerrada y remuestreada cada ~8 px: progreso, vueltas, posiciones,
 * línea ideal (se abre y cierra en las curvas) y perfil de velocidad para la CPU, que comete errores y mejora con
 * las victorias guardadas en localStorage (cup:<id>). Superficies: agua (poco agarre), tierra/harina/serrín/barro
 * (frena) y aceite (trompo). Siempre corren 4 coches: humanos según las plazas de la tele y CPU en el resto. */
const M = CFG.mode || 'mesa', OUT = ART.OUT, TAU = Math.PI * 2, GAR = M === 'garaje', ITEMS = M === 'patio';
const PORT = innerHeight > innerWidth, W = PORT ? 405 : 720, H = PORT ? 720 : 405, Z = PORT ? 1.15 : 1, VW = W / Z, VH = H / Z; /* Z: zoom de cámara (vista en unidades del mundo VW×VH) */
const MD = {
  mesa: { hw: 52, off: 0.74, offGrip: 6, bg: '#3a2a2a', car: 'coche', haz: ['agua', 'harina', 'aceite'], obs: ['taza', 'naranja', 'galleta', 'salero'] },
  garaje: { hw: 56, off: 0.72, offGrip: 6.5, bg: '#2a2d35', car: 'bolido', haz: ['aceite', 'agua', 'serrin'], obs: ['ruedas', 'cono', 'bidon', 'ruedas'] },
  patio: { hw: 54, off: 0.6, offGrip: 5, bg: '#2f5a26', car: 'kart', haz: ['barro', 'agua', 'barro'], obs: ['arbusto', 'piedra', 'pelota', 'arbusto'] },
}[M];
const k = Kit({ w: W, h: H, title: CFG.title, bg: MD.bg }), c = k.ctx;
/* ---------- Ley de la pieza única (REMASTER §8) ----------
 * uni(): traza todas las partes y las rellena después → solo sobrevive el borde exterior.
 * inw(): detalle interior recortado contra la silueta. Separaciones por sombra o color. */
function uni(g, parts, ow) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = ow * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); } }
const all = (parts) => (g) => { for (const p of parts) p(g); };
function inw(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
const rp = (g, x, y, w, h, r) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const cp = (g, x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); g.closePath(); };
const ep2 = (g, x, y, rx, ry, rot) => { g.moveTo(x + rx * Math.cos(rot || 0), y + rx * Math.sin(rot || 0)); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.closePath(); };
const { mix, lite, dark, alpha, rr, fillOut, glint, shadow } = ART;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
const wrapA = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
function RNG(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function mk(w, h, res, draw) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * res); cv.height = Math.ceil(h * res); const q = cv.getContext('2d'); q.scale(res, res); if (draw) draw(q); return cv; }
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
let CUP = 0; try { CUP = clamp(+localStorage.getItem('cup:' + CFG.id) || 0, 0, 5); } catch (e) { /* sin almacenamiento */ }

/* ---------- Circuitos (puntos de control en unidades de 140 px) ---------- */
const SHP = {
  ovalo: [[2, 2], [8, 1.5], [10, 3], [9, 5.5], [6, 5], [4, 7], [1.5, 6.5], [0.8, 4]],
  ele: [[1, 1], [5, 0.8], [6, 3.5], [10, 4], [10.5, 7], [7, 8], [2, 7.8], [0.6, 4.5]],
  horquilla: [[1, 1], [5, 1], [9, 1], [10, 3], [8, 4.5], [5, 3.6], [3.8, 5.2], [8, 6.2], [9, 8], [6, 9.2], [2, 8.5], [0.5, 6], [1.5, 3.5]],
  rinon: [[1, 2], [4, 0.8], [7, 2], [9, 1], [11, 2.5], [10.5, 5.5], [8, 7], [6, 5.3], [4, 7], [1.5, 6.5], [0.5, 4.5]],
  gota: [[5, 0.8], [9, 2.5], [10, 6], [7, 8.5], [3, 8], [1, 5], [2, 2.5]],
  bota: [[1, 1], [6, 1], [6.5, 4], [10, 4.5], [10.5, 7.5], [6, 8.5], [1.5, 8], [0.5, 4.5]],
  trebol: [[4, 0.5], [7, 1.5], [10, 1], [11.5, 3.5], [9.5, 5], [11, 7.5], [8, 8.8], [5.5, 7], [3, 8.5], [0.8, 6.5], [2.5, 4.5], [1, 2]],
};
const CIRC = {
  mesa: [['Mantel de cuadros', 'ovalo', 0], ['Esquina del frutero', 'ele', 0], ['Vuelta de la tetera', 'horquilla', 1]],
  garaje: [['Foso del mecánico', 'rinon', 0], ['Trébol de aceite', 'trebol', 0], ['Bota de goma', 'bota', 1]],
  patio: [['Charca del recreo', 'gota', 0], ['Arenero', 'bota', 0], ['Trébol del jardín', 'trebol', 1]],
}[M];
const U = 140, MARG = 260;
let T = null;
function buildTrack(ci) {
  const [name, shp, mir] = CIRC[ci], rng = RNG(ci * 977 + M.length * 131 + 7), hw = MD.hw;
  let pts = SHP[shp].map(([x, y]) => [x, y]);
  if (mir) { const mx = Math.max(...pts.map((p) => p[0])); pts = pts.map(([x, y]) => [mx - x, y]); }
  const P = pts.map(([x, y]) => [x * U + MARG, y * U + MARG]), n = P.length, raw = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n], st = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4);
    for (let j = 0; j < st; j++) { const t = j / st, t2 = t * t, t3 = t2 * t; raw.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3))); }
  }
  let L = 0; const cum = [0];
  for (let i = 1; i <= raw.length; i++) { const a = raw[i - 1], b = raw[i % raw.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); cum.push(L); }
  const N = Math.round(L / 8), sp = L / N, S = []; let j = 0;
  for (let i = 0; i < N; i++) { const s = i * sp; while (cum[j + 1] < s) j++; const a = raw[j], b = raw[(j + 1) % raw.length], f = (s - cum[j]) / (cum[j + 1] - cum[j]); S.push({ x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f }); }
  const at = (i) => S[((i % N) + N) % N];
  S.forEach((s, i) => { const a = at(i - 1), b = at(i + 1); s.a = Math.atan2(b.y - a.y, b.x - a.x); s.nx = -Math.sin(s.a); s.ny = Math.cos(s.a); });
  S.forEach((s, i) => { s.cv = wrapA(at(i + 3).a - at(i - 3).a) / (6 * sp); });
  const smooth = (key, r, passes) => { for (let p = 0; p < passes; p++) { const v = S.map((s) => s[key]); S.forEach((s, i) => { let t = 0; for (let d = -r; d <= r; d++) t += v[((i + d) % N + N) % N]; s[key] = t / (2 * r + 1); }); } };
  smooth('cv', 2, 2);
  /* línea ideal: hacia el interior de la curva, suavizada para abrir antes y salir abierto */
  S.forEach((s) => { s.off = clamp(s.cv * 60, -1, 1) * 0.6 * hw; }); smooth('off', 10, 3);
  /* velocidad segura (fracción de la máxima) según el radio de curva: v²/r ≤ 640 px/s² */
  S.forEach((s) => { const r = 1 / Math.max(1e-4, Math.abs(s.cv)); s.vt = clamp(Math.sqrt(640 * r) / 255, 0.5, 1); });
  S.forEach((s, i) => { let m = 1; for (let d = 0; d < 26; d++) m = Math.min(m, at(i + d).vt); s.va = m; });
  const path = new Path2D(); S.forEach((s, i) => (i ? path.lineTo(s.x, s.y) : path.moveTo(s.x, s.y))); path.closePath();
  /* pianos (bordillos) en las curvas cerradas */
  const kerbR = new Path2D(), kerbW = new Path2D();
  S.forEach((s, i) => { if (Math.abs(s.cv) * hw < 0.3) return; const side = s.cv > 0 ? 1 : -1, b = at(i + 1), q = (i >> 1) % 2 ? kerbR : kerbW;
    for (const sd of [side, -side]) { const o = hw + 1; q.moveTo(s.x + s.nx * o * sd, s.y + s.ny * o * sd); q.lineTo(b.x + b.nx * o * sd, b.y + b.ny * o * sd); } });
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; S.forEach((s) => { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y); });
  const tm = hw + 34, table = { x0: x0 - tm, y0: y0 - tm, x1: x1 + tm, y1: y1 + tm };
  const bound = { x0: x0 - hw - 150, y0: y0 - hw - 150, x1: x1 + hw + 150, y1: y1 + hw + 150 };
  const tr = { S, N, L, sp, hw, path, kerbR, kerbW, name, at, table, bound, obst: [], haz: [], boxes: [], ci };
  const nearTrack = (x, y) => { let m = 1e9; for (let i = 0; i < N; i += 2) { const s = S[i]; m = Math.min(m, Math.hypot(x - s.x, y - s.y)); } return m; };
  /* obstáculos junto a la pista (nunca encima) */
  for (let tries = 0; tries < 400 && tr.obst.length < 16; tries++) {
    const s = S[Math.floor(rng() * N)], side = rng() < 0.5 ? -1 : 1, r = 14 + rng() * 9, dd = hw + r + 8 + rng() * (M === 'mesa' ? 18 : 90);
    const x = s.x + s.nx * dd * side, y = s.y + s.ny * dd * side;
    if (nearTrack(x, y) < hw + r + 6) continue;
    if (M === 'mesa' && (x - r < table.x0 + 4 || x + r > table.x1 - 4 || y - r < table.y0 + 4 || y + r > table.y1 - 4)) continue;
    if (tr.obst.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 26)) continue;
    tr.obst.push({ x, y, r, type: MD.obs[tr.obst.length % MD.obs.length], rot: rng() * TAU });
  }
  /* superficies sobre la pista, repartidas y lejos de la salida */
  const nh = 6;
  for (let h = 0; h < nh; h++) {
    const i = Math.floor(N * (0.13 + (h / nh) * 0.78 + rng() * 0.05)), s = S[i], off = (rng() * 2 - 1) * 0.5 * hw, type = MD.haz[(h + ci) % MD.haz.length];
    const r = type === 'aceite' ? 20 + rng() * 6 : 24 + rng() * 12;
    tr.haz.push({ x: s.x + s.nx * off, y: s.y + s.ny * off, r, type, i, off, seed: rng() * 1000 });
  }
  if (ITEMS) for (const f of [0.3, 0.66]) { const i = Math.floor(N * f), s = S[i]; for (const o of [-0.55, 0, 0.55]) tr.boxes.push({ x: s.x + s.nx * o * hw, y: s.y + s.ny * o * hw, t: 0, i }); }
  /* minimapa */
  const mw = PORT ? 92 : 118, mh = PORT ? 78 : 78, sc = Math.min(mw / (x1 - x0 + 2 * hw), mh / (y1 - y0 + 2 * hw));
  tr.mini = { sc, w: mw, h: mh, ox: x0 - hw, oy: y0 - hw, path: new Path2D() };
  S.forEach((s, i) => { const X = (s.x - tr.mini.ox) * sc, Y = (s.y - tr.mini.oy) * sc; i ? tr.mini.path.lineTo(X, Y) : tr.mini.path.moveTo(X, Y); }); tr.mini.path.closePath();
  return tr;
}

/* ---------- Texturas (a 2x, con patrón escalado) ---------- */
const RES = 2;
function pat(w, h, draw) { const cv = mk(w, h, RES, draw), p = c.createPattern(cv, 'repeat'); try { p.setTransform(new DOMMatrix().scale(1 / RES)); } catch (e) { /* navegador antiguo */ } return p; }
const PT = (() => {
  const r = RNG(99), o = {};
  if (M === 'mesa') {
    o.ground = pat(96, 96, (q) => { q.fillStyle = '#cdbfa6'; q.fillRect(0, 0, 96, 96); q.fillStyle = '#b9a98e'; q.fillRect(0, 0, 48, 48); q.fillRect(48, 48, 48, 48); q.strokeStyle = 'rgba(60,40,30,.25)'; q.lineWidth = 2; q.strokeRect(0, 0, 48, 48); q.strokeRect(48, 48, 48, 48); });
    o.table = pat(256, 128, (q) => {
      for (let i = 0; i < 4; i++) { const g = q.createLinearGradient(0, i * 32, 0, i * 32 + 32), b = ['#c98f55', '#c2874d', '#cf9660', '#c48a52'][i]; g.addColorStop(0, lite(b, 0.08)); g.addColorStop(1, dark(b, 0.06)); q.fillStyle = g; q.fillRect(0, i * 32, 256, 32);
        q.strokeStyle = 'rgba(90,50,20,.35)'; q.lineWidth = 1.5; q.beginPath(); q.moveTo(0, i * 32 + 0.75); q.lineTo(256, i * 32 + 0.75); q.stroke();
        q.strokeStyle = 'rgba(110,60,25,.22)'; q.lineWidth = 1; for (let l = 0; l < 4; l++) { q.beginPath(); const y = i * 32 + 5 + l * 7; for (let x = 0; x <= 256; x += 8) q.lineTo(x, y + Math.sin(x * 0.03 + i * 2 + l) * 2.2); q.stroke(); }
        const kx = r() * 256; q.fillStyle = 'rgba(110,60,25,.25)'; q.beginPath(); q.ellipse(kx, i * 32 + 16, 7, 3, 0, 0, TAU); q.fill(); }
    });
    o.road = pat(32, 32, (q) => { q.fillStyle = '#fbf6ee'; q.fillRect(0, 0, 32, 32); q.fillStyle = 'rgba(214,64,70,.55)'; q.fillRect(0, 0, 16, 32); q.fillRect(0, 0, 32, 16); q.fillStyle = 'rgba(190,40,52,.35)'; q.fillRect(0, 0, 16, 16); });
    o.edge = '#f1e3b8';
  } else if (GAR) {
    o.ground = pat(128, 128, (q) => { q.fillStyle = '#8c8f96'; q.fillRect(0, 0, 128, 128); for (let i = 0; i < 260; i++) { q.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)'; q.fillRect(r() * 128, r() * 128, 2, 2); } q.strokeStyle = 'rgba(40,40,50,.35)'; q.lineWidth = 2; q.strokeRect(0, 0, 128, 128); q.strokeStyle = 'rgba(40,40,50,.18)'; q.lineWidth = 1; q.beginPath(); q.moveTo(20, 30); q.lineTo(40, 44); q.lineTo(38, 70); q.stroke(); });
    o.road = pat(64, 64, (q) => { q.fillStyle = '#3d414c'; q.fillRect(0, 0, 64, 64); for (let i = 0; i < 120; i++) { q.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.12)'; q.fillRect(r() * 64, r() * 64, 1.5, 1.5); } });
    o.edge = pat(24, 24, (q) => { q.fillStyle = '#ffc93c'; q.fillRect(0, 0, 24, 24); q.fillStyle = '#1a1530'; q.beginPath(); q.moveTo(0, 0); q.lineTo(12, 0); q.lineTo(0, 12); q.fill(); q.beginPath(); q.moveTo(24, 0); q.lineTo(24, 12); q.lineTo(12, 24); q.lineTo(0, 24); q.fill(); });
  } else {
    o.ground = pat(128, 128, (q) => { q.fillStyle = '#5fb04a'; q.fillRect(0, 0, 128, 128); q.fillStyle = '#58a544'; q.fillRect(0, 0, 64, 128); for (let i = 0; i < 160; i++) { q.strokeStyle = r() < 0.5 ? 'rgba(140,220,90,.35)' : 'rgba(30,90,30,.25)'; q.lineWidth = 1.2; const x = r() * 128, y = r() * 128; q.beginPath(); q.moveTo(x, y); q.lineTo(x + r() * 3 - 1.5, y - 4); q.stroke(); } });
    o.road = pat(64, 64, (q) => { q.fillStyle = '#d8b07a'; q.fillRect(0, 0, 64, 64); for (let i = 0; i < 70; i++) { q.fillStyle = r() < 0.5 ? 'rgba(120,80,40,.25)' : 'rgba(255,240,210,.35)'; q.beginPath(); q.arc(r() * 64, r() * 64, 0.8 + r() * 1.6, 0, TAU); q.fill(); } });
    o.edge = '#f7f3ea';
  }
  return o;
})();

/* ---------- Sprites cacheados ---------- */
const SPR = {};
/* Coches cenitales: la carrocería (con alerones y barras, que no se mueven) es UNA silueta;
 * las ruedas van sueltas porque giran de verdad, y el casco porque el piloto se mueve. */
function carSprite(col, kind) {
  const key = kind + col; if (SPR[key]) return SPR[key];
  return (SPR[key] = mk(48, 32, 3, (g) => {
    g.translate(24, 16); g.lineJoin = 'round';
    const wheel = (x, y, w, h) => { g.beginPath(); rp(g, x - w / 2, y - h / 2, w, h, 2); g.fillStyle = '#25202f'; g.fill(); g.lineWidth = 1.1; g.strokeStyle = OUT; g.stroke(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, 1.1); };
    const paint = (y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, lite(col, 0.3)); gr.addColorStop(0.55, col); gr.addColorStop(1, dark(col, 0.25)); return gr; };
    if (kind === 'coche') {
      for (const [x, y] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) wheel(x, y, 8, 4.5);
      const body = (q) => rp(q, -16, -9, 32, 18, 6);
      uni(g, [[body, paint(-9, 9)]], 1.1);
      inw(g, body, (q) => {
        q.fillStyle = 'rgba(0,0,0,.22)'; q.beginPath(); rp(q, -7, -7.6, 15, 15.2, 5); q.fill();            // sombra propia del techo
        q.fillStyle = '#2c3a66'; q.beginPath(); rp(q, -6, -7, 13, 14, 4); q.fill();                        // techo, resuelto por color
        q.fillStyle = lite(col, 0.2); q.beginPath(); rp(q, -3.5, -5.5, 7, 11, 3); q.fill();
        q.fillStyle = 'rgba(160,210,255,.65)'; q.fillRect(4.5, -5, 1.6, 10);
        q.fillStyle = '#fff3a8'; q.beginPath(); q.arc(14, -5.5, 1.8, 0, TAU); q.arc(14, 5.5, 1.8, 0, TAU); q.fill();
        q.fillStyle = '#ff6b6b'; q.fillRect(-16, -6.5, 1.8, 3); q.fillRect(-16, 3.5, 1.8, 3); });
    } else if (kind === 'bolido') {
      for (const [x, y] of [[-10, -9], [10, -8], [-10, 9], [10, 8]]) wheel(x, y, x < 0 ? 9 : 7, 5);
      const hull = (q) => { q.moveTo(-15, -6); q.lineTo(6, -5); q.quadraticCurveTo(17, -2.5, 17, 0); q.quadraticCurveTo(17, 2.5, 6, 5); q.lineTo(-15, 6); q.closePath(); };
      const wingF = (q) => rp(q, 12, -9, 5, 18, 2), wingR = (q) => rp(q, -19, -8, 5, 16, 2);
      const P = [[wingR, dark(col, 0.2)], [wingF, dark(col, 0.1)], [hull, paint(-6, 6)]];
      uni(g, P, 1.1);
      inw(g, all(P.map((q) => q[0])), (q) => {
        q.fillStyle = 'rgba(0,0,0,.2)'; q.fillRect(11, -9, 2, 18); q.fillRect(-15, -8, 2, 16);   // sombra propia donde nace cada alerón
        q.fillStyle = '#fff'; q.fillRect(-12, -1.2, 26, 2.4);
        q.fillStyle = 'rgba(0,0,0,.25)'; q.beginPath(); cp(q, -3, 0, 4.6); q.fill();
        q.fillStyle = '#fbfbfb'; q.beginPath(); cp(q, -3, 0, 4); q.fill(); q.fillStyle = '#2c3a66'; q.fillRect(-1, -2.2, 3, 4.4); });
    } else {
      for (const [x, y] of [[-9, -10], [9, -10], [-9, 10], [9, 10]]) wheel(x, y, 9, 5.5);
      const bars = (q) => { rp(q, -10.6, -10.6, 3.2, 21.2, 1.6); rp(q, 7.4, -10.6, 3.2, 21.2, 1.6); };
      const body = (q) => rp(q, -12, -6.5, 26, 13, 5);
      const spoil = (q) => rp(q, 13, -8, 3.4, 16, 1.6);
      const P = [[bars, '#8e97a6'], [spoil, '#e8e8ee'], [body, paint(-6.5, 6.5)]];
      uni(g, P, 1.1);
      inw(g, all(P.map((q) => q[0])), (q) => {
        q.fillStyle = 'rgba(0,0,0,.24)'; q.fillRect(-12.6, -7.4, 26, 1.4); q.fillRect(-12.6, 6, 26, 1.4);
        q.fillStyle = '#2b2533'; q.beginPath(); rp(q, -10, -5, 7, 10, 2.5); q.fill(); });
      const helm = (q) => cp(q, -3, 0, 5.2);                                   // el piloto se mueve: pieza aparte
      g.beginPath(); helm(g); const hg = g.createRadialGradient(-4.5, -1.8, 0.5, -3, 0, 5.2); hg.addColorStop(0, lite(col, 0.55)); hg.addColorStop(1, dark(col, 0.1)); g.fillStyle = hg; g.fill(); g.lineWidth = 1.1; g.strokeStyle = OUT; g.stroke();
      inw(g, helm, (q) => { q.fillStyle = '#1f2a4d'; q.beginPath(); q.arc(-3, 0, 3.4, -0.9, 0.9); q.lineTo(-3, 0); q.fill(); glint(q, -5, -2, 1.4); });
    }
  }));
}
const HCOL = { agua: ['#6cc8f0', '#bfeaff'], harina: ['#f6f2ea', '#ffffff'], aceite: ['#6b5a1f', '#c9a93a'], serrin: ['#d3a868', '#f0cf95'], barro: ['#7a5230', '#9c6c42'], charco: ['#b48cff', '#e2d4ff'] };
function hazSprite(type, r, seed) {
  const key = type + Math.round(r) + Math.round(seed); if (SPR[key]) return SPR[key];
  return (SPR[key] = mk(r * 2.6, r * 2.6, 2, (g) => {
    const rn = RNG(seed | 0), m = r * 1.3, [c1, c2] = HCOL[type];
    const blob = (sc) => { g.beginPath(); for (let i = 0; i <= 14; i++) { const a = (i / 14) * TAU, rad = r * sc * (0.85 + 0.2 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 5 + seed * 2)); const X = m + Math.cos(a) * rad, Y = m + Math.sin(a) * rad * 0.9; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); };
    if (type === 'harina' || type === 'serrin') {
      for (let i = 0; i < 9; i++) { const a = rn() * TAU, d = rn() * r * 0.6, rad = r * (0.25 + rn() * 0.2); g.beginPath(); g.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, rad, 0, TAU); g.fillStyle = i % 2 ? c1 : c2; g.fill(); }
      for (let i = 0; i < 40; i++) { const a = rn() * TAU, d = r * (0.6 + rn() * 0.5); g.fillStyle = alpha(type === 'harina' ? '#ffffff' : '#b98a4e', 0.8); g.fillRect(m + Math.cos(a) * d, m + Math.sin(a) * d, 1.6, 1.6); }
      blob(0.75); g.lineWidth = 1.2; g.strokeStyle = alpha(OUT, 0.18); g.stroke();
      return;
    }
    blob(1); g.fillStyle = alpha(c1, type === 'agua' ? 0.55 : 0.85); g.fill(); g.lineWidth = 2; g.strokeStyle = alpha(OUT, 0.35); g.stroke();
    if (type === 'aceite') { const gr = g.createLinearGradient(m - r, m - r, m + r, m + r); ['#ff5fa2', '#ffd166', '#7cf7a0', '#5ce1e6', '#b98cff'].forEach((cc, i) => gr.addColorStop(i / 4, alpha(cc, 0.28))); blob(0.7); g.fillStyle = gr; g.fill(); }
    else { blob(0.62); g.fillStyle = alpha(c2, type === 'agua' ? 0.4 : 0.5); g.fill(); }
    if (type === 'barro' || type === 'charco') for (let i = 0; i < 5; i++) { const a = rn() * TAU, d = rn() * r * 0.6; g.beginPath(); g.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, 1.5 + rn() * 2.5, 0, TAU); g.fillStyle = alpha(c2, 0.9); g.fill(); g.lineWidth = 1; g.strokeStyle = alpha(OUT, 0.3); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(m - r * 0.35, m - r * 0.35, r * 0.22, r * 0.08, -0.6, 0, TAU); g.fill(); glint(g, m + r * 0.3, m - r * 0.2, r * 0.12);
  }));
}
/* Obstáculos: cada uno es UNA silueta (nada de discos apilados con su propio contorno);
 * los volúmenes interiores se leen por degradado y sombra propia. */
function obsSprite(type, r) {
  const key = 'o' + type + Math.round(r); if (SPR[key]) return SPR[key];
  return (SPR[key] = mk(r * 3, r * 3, 3, (g) => {
    const m = r * 1.5; g.translate(m, m); g.lineJoin = 'round';
    const rad = (rd, c1, c2) => { const gr = g.createRadialGradient(-rd * 0.35, -rd * 0.35, rd * 0.1, 0, 0, rd); gr.addColorStop(0, c1); gr.addColorStop(1, c2); return gr; };
    const disc = (rd) => (q) => cp(q, 0, 0, rd);
    const ring = (q, rd, col, w) => { q.save(); q.beginPath(); q.arc(0, 0, rd, 0, TAU); q.lineWidth = w; q.strokeStyle = col; q.stroke(); q.restore(); };
    const OW = Math.max(0.8, r * 0.09);
    if (type === 'taza') {
      const asa = (q) => { q.moveTo(r * 0.9, -r * 0.36); q.arc(r * 0.95, 0, r * 0.5, -1.25, 1.25); q.lineTo(r * 0.85, r * 0.28); q.arc(r * 0.95, 0, r * 0.28, 1.25, -1.25, true); q.closePath(); };
      uni(g, [[asa, '#e6e8f0'], [disc(r), rad(r, '#ffffff', '#cfd3e0')]], OW);
      inw(g, all([asa, disc(r)]), (q) => { q.fillStyle = 'rgba(0,0,0,.16)'; q.beginPath(); cp(q, 0, 0, r * 0.82); q.fill();
        q.fillStyle = rad(r * 0.74, '#8a5530', '#4d2c16'); q.beginPath(); cp(q, 0, 0, r * 0.74); q.fill();
        q.fillStyle = 'rgba(255,240,220,.5)'; q.beginPath(); q.ellipse(-r * 0.2, -r * 0.25, r * 0.28, r * 0.1, -0.5, 0, TAU); q.fill(); });
    } else if (type === 'naranja') {
      const hoja = (q) => ep2(q, r * 0.25, -r * 0.1, r * 0.4, r * 0.18, 0.6);
      uni(g, [[hoja, '#4fae45'], [disc(r), rad(r, '#ffb24d', '#e0701c')]], OW);
      inw(g, all([hoja, disc(r)]), (q) => { q.fillStyle = 'rgba(160,70,10,.3)'; for (let i = 0; i < 14; i++) { const a = i * 2.4, d = r * (0.3 + (i % 3) * 0.2); q.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1.4, 1.4); }
        q.fillStyle = 'rgba(0,0,0,.2)'; q.beginPath(); q.ellipse(r * 0.25, -r * 0.1, r * 0.42, r * 0.2, 0.6, 0, TAU); q.fill(); q.fillStyle = '#4fae45'; q.beginPath(); q.ellipse(r * 0.25, -r * 0.1, r * 0.38, r * 0.16, 0.6, 0, TAU); q.fill();
        glint(q, -r * 0.4, -r * 0.4, r * 0.18); });
    } else if (type === 'galleta') {
      const P = (q) => { q.moveTo(r, 0); for (let i = 1; i <= 16; i++) { const a = i / 16 * TAU; q.lineTo(Math.cos(a) * r * (1 + 0.06 * Math.sin(a * 7)), Math.sin(a) * r * (1 + 0.06 * Math.sin(a * 7))); } q.closePath(); };
      uni(g, [[P, rad(r, '#e9b36a', '#b9793a')]], OW);
      inw(g, P, (q) => { q.fillStyle = '#4a2a18'; for (let i = 0; i < 7; i++) { const a = i * 2.1, d = r * (0.2 + (i % 3) * 0.22); q.beginPath(); q.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.1, 0, TAU); q.fill(); } });
    } else if (type === 'salero') {
      const P = (q) => { rp(q, -r * 0.55, -r * 0.8, r * 1.1, r * 1.5, r * 0.35); };
      uni(g, [[P, rad(r, '#ffffff', '#c9cfdc')]], OW);
      inw(g, P, (q) => { q.fillStyle = 'rgba(0,0,0,.18)'; q.fillRect(-r, -r * 0.34, r * 2, r * 0.1);
        q.fillStyle = '#d9dde8'; q.beginPath(); rp(q, -r * 0.5, -r * 0.78, r, r * 0.46, r * 0.3); q.fill();
        q.fillStyle = OUT; for (const [x, y] of [[0, -r * 0.6], [-r * 0.2, -r * 0.48], [r * 0.2, -r * 0.48]]) { q.beginPath(); q.arc(x, y, r * 0.07, 0, TAU); q.fill(); }
        q.fillStyle = 'rgba(255,255,255,.35)'; q.fillRect(-r * 0.45, -r * 0.28, r * 0.16, r * 0.8); });
    } else if (type === 'ruedas') {
      uni(g, [[disc(r), rad(r, '#3a3642', '#1f1c26')]], OW);
      inw(g, disc(r), (q) => { for (let i = 1; i < 3; i++) { q.fillStyle = 'rgba(0,0,0,.3)'; q.beginPath(); cp(q, 0, 0, r * (1 - i * 0.18) + 0.6); q.fill(); q.fillStyle = rad(r, '#4a4652', '#1f1c26'); q.beginPath(); cp(q, 0, 0, r * (1 - i * 0.18)); q.fill(); }
        q.fillStyle = rad(r * 0.42, '#6f6a7a', '#4e4a58'); q.beginPath(); cp(q, 0, 0, r * 0.42); q.fill(); ring(q, r * 0.8, 'rgba(255,255,255,.14)', 1.2); });
    } else if (type === 'cono') {
      const P = (q) => { rp(q, -r * 0.92, -r * 0.92, r * 1.84, r * 1.84, r * 0.2); cp(q, 0, 0, r * 0.74); };
      uni(g, [[P, '#ff7a2e']], OW);
      inw(g, P, (q) => { q.fillStyle = 'rgba(0,0,0,.2)'; q.beginPath(); cp(q, 0, 0, r * 0.78); q.fill();
        q.fillStyle = rad(r * 0.72, '#ffa05c', '#e65a14'); q.beginPath(); cp(q, 0, 0, r * 0.72); q.fill();
        ring(q, r * 0.45, '#fff', r * 0.16); q.fillStyle = rad(r * 0.22, '#ffb07a', '#ff7a2e'); q.beginPath(); cp(q, 0, 0, r * 0.22); q.fill(); });
    } else if (type === 'bidon') {
      uni(g, [[disc(r), rad(r, '#4f8ff0', '#2456b8')]], OW);
      inw(g, disc(r), (q) => { q.fillStyle = 'rgba(0,0,0,.22)'; q.beginPath(); cp(q, 0, 0, r * 0.76); q.fill(); q.fillStyle = rad(r * 0.72, '#5d9bf5', '#2456b8'); q.beginPath(); cp(q, 0, 0, r * 0.72); q.fill();
        q.fillStyle = rad(r * 0.2, '#c9d4e6', '#7f8aa0'); q.beginPath(); cp(q, 0, 0, r * 0.2); q.fill();
        q.fillStyle = OUT; q.beginPath(); q.arc(r * 0.45, -r * 0.2, r * 0.12, 0, TAU); q.fill(); });
    } else if (type === 'arbusto') {
      const P = (q) => { for (const [x, y, s2] of [[-r * 0.4, r * 0.2, 0.62], [r * 0.4, r * 0.25, 0.6], [0, -r * 0.3, 0.66], [0, r * 0.1, 0.55]]) cp(q, x, y, r * s2); };
      uni(g, [[P, '#3f9a45']], OW);
      inw(g, P, (q) => { q.fillStyle = rad(r * 0.66, '#6fd35a', '#2f8a37'); q.beginPath(); cp(q, 0, -r * 0.3, r * 0.66); q.fill();
        q.fillStyle = 'rgba(0,0,0,.2)'; q.fillRect(-r * 1.5, r * 0.3, r * 3, r * 1.2);
        q.fillStyle = '#7fe06a'; q.beginPath(); cp(q, -r * 0.25, -r * 0.5, r * 0.3); q.fill();
        q.fillStyle = '#ff6b8a'; for (const [x, y] of [[-r * 0.3, -r * 0.1], [r * 0.35, r * 0.1], [0, -r * 0.5]]) { q.beginPath(); q.arc(x, y, 2, 0, TAU); q.fill(); } });
    } else if (type === 'piedra') {
      const P = (q) => { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, d = r * (0.8 + ((i * 7) % 3) * 0.1); i ? q.lineTo(Math.cos(a) * d, Math.sin(a) * d) : q.moveTo(Math.cos(a) * d, Math.sin(a) * d); } q.closePath(); };
      const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#c9c3d6'); gr.addColorStop(1, '#7c7690');
      uni(g, [[P, gr]], OW);
      inw(g, P, (q) => { q.strokeStyle = alpha(OUT, 0.26); q.lineWidth = 1; q.beginPath(); q.moveTo(-r * 0.3, -r * 0.2); q.lineTo(r * 0.2, r * 0.1); q.stroke();
        q.fillStyle = 'rgba(0,0,0,.18)'; q.fillRect(-r, r * 0.35, r * 2, r); });
    } else if (type === 'pelota') {
      uni(g, [[disc(r * 0.85), rad(r * 0.85, '#ffffff', '#d6d6e2')]], OW);
      inw(g, disc(r * 0.85), (q) => { q.fillStyle = '#ff5a5f'; q.fillRect(-r, -r * 0.25, r * 2, r * 0.5); q.fillStyle = 'rgba(0,0,0,.14)'; q.fillRect(-r, r * 0.16, r * 2, r * 0.1); glint(q, -r * 0.35, -r * 0.35, r * 0.15); });
    }
  }));
}
const ITM = { pompa: 'Pompa', muelle: 'Muelle', charco: 'Charco' };
function itemIcon(g, type, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s / 20, s / 20); g.lineJoin = 'round';
  if (type === 'pompa') { g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fillStyle = 'rgba(140,220,255,.55)'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#e8fbff'; g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-3, -3.5, 2.6, 1.2, -0.7, 0, TAU); g.fill(); }
  else if (type === 'muelle') { g.lineWidth = 4; g.strokeStyle = OUT; const zz = () => { g.beginPath(); g.moveTo(-6, 8); for (let i = 0; i < 5; i++) g.lineTo(i % 2 ? -6 : 6, 5 - i * 3.2); g.stroke(); }; zz(); g.lineWidth = 2; g.strokeStyle = '#c9d4e6'; zz(); rr(g, -8, 7, 16, 3.5, 1.5); g.fillStyle = '#ff5a5f'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke(); rr(g, -8, -10, 16, 3.5, 1.5); g.fillStyle = '#ffd166'; g.fill(); g.stroke(); }
  else { g.beginPath(); g.ellipse(0, 1, 9, 6, 0, 0, TAU); g.fillStyle = '#b48cff'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke(); g.fillStyle = '#e2d4ff'; for (const [a, b, r2] of [[-3, -1, 2.2], [3, 2, 1.6], [1, -4, 2.6]]) { g.beginPath(); g.arc(a, b, r2, 0, TAU); g.fill(); } }
  g.restore();
}

/* ---------- Estado ---------- */
const NCAR = 4, PTS = [10, 6, 3, 1], LAPS = () => (T.L < 4300 ? 3 : 2);
let cars, race, phase, phT, cam, skids, parts, shots, puddles, finishOrder, raceT, round, roundT, lastWin, msg, msgT, cdPend = false, humans0 = 0;
const skill = () => clamp(0.32 + CUP * 0.05, 0.32, 0.6); // 1.23: CPU más torpe (antes 0,45 + 0,1·copa, tope 0,95)
const pace = () => (GAR ? Math.min(1, 0.8 + (round - 1) * 0.04) : [0.82, 0.91, 1][race] || 1);
function mkCar(p) {
  const hu = k.human(p);
  return { p, col: k.pcol(p), cpu: !hu, name: hu ? (k.party ? 'J' + (p + 1) : 'Tú') : 'CPU', x: 0, y: 0, a: 0, vx: 0, vy: 0, vf: 0, vr: 0, i: 0, s: 0, prog: 0, d: 0,
    pts: GAR ? 3 : 0, gain: 0, alive: true, inMatch: true, fin: 0, fall: 0, ghost: 0, spin: 0, spinDir: 1, bubble: 0, z: 0, jumpT: 0, boost: 0, hold: 0, item: null, itemT: 0, roll: 0,
    lane: 0, laneT: 0, err: 0, errOff: 0, errT: 0, avoid: {}, lapShown: 0, wrongT: 0, lastSurf: '', spd: 0.94 + (3 - p) * 0.012, dust: 0, outX: 0, outY: 0 };
}
function grid(anchorI, list) {
  /* parrilla 2×2 detrás del punto de anclaje; el primero de la lista, delante */
  list.forEach((car, n) => {
    const i = ((anchorI - 3 - Math.floor(n / 2) * 6) % T.N + T.N) % T.N, s = T.S[i], off = (n % 2 ? 0.42 : -0.42) * T.hw;
    Object.assign(car, { x: s.x + s.nx * off, y: s.y + s.ny * off, a: s.a, vx: 0, vy: 0, vf: 0, vr: 0, i, fall: 0, spin: 0, bubble: 0, z: 0, jumpT: 0, boost: 0, hold: 0, ghost: 0, wrongT: 0 });
    car.s = i * T.sp;
  });
}
function startRace() {
  T = buildTrack(GAR ? (Math.floor(Math.random() * 3)) : race);
  skids = []; parts = []; shots = []; puddles = []; finishOrder = []; raceT = 0; phase = 'run'; phT = 0;
  const order = GAR ? cars.slice() : cars.slice().sort((a, b) => (race === 0 ? (a.cpu - b.cpu) || a.p - b.p : a.pts - b.pts)); /* en la copa sale delante quien va último */
  grid(0, order.reverse());
  cars.forEach((car) => { car.prog = car.i === 0 ? 0 : -(T.N - car.i) * T.sp; car.fin = 0; car.item = null; car.lapShown = 0; car.alive = car.inMatch; car.gain = 0; car.avoid = {}; });
  const lead = cars[0]; cam = { x: lead.x, y: lead.y, ix: 0, iy: 0 };
  msg = GAR ? `Ronda ${round}` : `Carrera ${race + 1} de 3 · ${T.name}`; msgT = 3;
  cdPend = true; round = round || 1; roundT = 0;
}
function reset() {
  race = 0; round = 1; lastWin = null; humans0 = k.party ? k.party.length : 1;
  cars = Array.from({ length: NCAR }, (_, p) => mkCar(p));
  startRace();
}
k.onParty = () => {
  if (k.st !== 'play') { reset(); return; }
  for (const car of cars) { const hu = k.human(car.p); car.cpu = !hu; car.col = k.pcol(car.p); car.name = hu ? (k.party ? 'J' + (car.p + 1) : 'Tú') : 'CPU'; }
};

/* ---------- Pista: localizar, superficies ---------- */
function locate(car, global) {
  const S = T.S, N = T.N; let best = 1e18, bi = car.i;
  if (global) { for (let i = 0; i < N; i++) { const s = S[i], d = (car.x - s.x) ** 2 + (car.y - s.y) ** 2; if (d < best) { best = d; bi = i; } } }
  else for (let d = -14; d <= 14; d++) { const i = ((car.i + d) % N + N) % N, s = S[i], q = (car.x - s.x) ** 2 + (car.y - s.y) ** 2; if (q < best) { best = q; bi = i; } }
  car.i = bi; const s = S[bi]; car.d = (car.x - s.x) * s.nx + (car.y - s.y) * s.ny;
  const ns = bi * T.sp; let ds = ns - car.s; if (ds < -T.L / 2) ds += T.L; if (ds > T.L / 2) ds -= T.L; car.prog += ds; car.s = ns;
}
function surface(car) {
  if (car.z > 0.05) return { vm: 1.05, grip: 9, k: 'air' };
  for (const p of puddles) if (Math.hypot(car.x - p.x, car.y - p.y) < p.r && !(p.owner === car && p.imm > 0)) return { vm: 0.9, grip: 1, k: 'charco', pd: p };
  for (const h of T.haz) if (Math.hypot(car.x - h.x, car.y - h.y) < h.r * 0.95) {
    if (h.type === 'agua') return { vm: 0.95, grip: 1.7, k: 'agua' };
    if (h.type === 'aceite') return { vm: 1, grip: 0.7, k: 'aceite' };
    return { vm: 0.55, grip: 5, k: 'tierra', col: HCOL[h.type][1] };
  }
  if (Math.abs(car.d) > T.hw) return { vm: MD.off, grip: MD.offGrip, k: 'off', col: M === 'patio' ? '#7ccf5e' : M === 'mesa' ? '#e0b07a' : '#b8bcc6' };
  return { vm: 1, grip: 9, k: 'road' };
}
const spinOut = (car, t) => { if (car.spin > 0 || car.z > 0.05) return; car.spin = t; car.spinDir = Math.random() < 0.5 ? -1 : 1; if (!car.cpu) k.sfx('hurt'); };

/* ---------- Conducción ---------- */
function humanInput(car) {
  let tgt = null, thr = 0; const d = k.pdir(car.p);
  if (d.x || d.y) { tgt = Math.atan2(d.y, d.x); thr = 1; }
  if (!k.party && car.p === 0 && k.ptr.down) { const px = sx(car.x), py = sy(car.y), dx = k.ptr.x - px, dy = k.ptr.y - py; if (dx * dx + dy * dy > 144) { tgt = Math.atan2(dy, dx); thr = 1; } }
  if (k.pheld(car.p, 'a')) { thr = 1; if (tgt === null) tgt = car.a; }
  const hb = !ITEMS && k.pheld(car.p, 'b');
  if (ITEMS && k.phit(car.p, 'b')) useItem(car);
  return { tgt, thr, hb };
}
function cpuInput(car, dt) {
  const S = T.S, N = T.N, sk = skill(), look = 5 + Math.round(Math.abs(car.vf) / 24), j = (car.i + look) % N, s = S[j];
  car.laneT -= dt; if (car.laneT <= 0) { car.laneT = 1.5 + Math.random() * 2.5; car.lane = (Math.random() * 2 - 1) * 0.28 * T.hw; }
  let off = s.off * lerp(0.4, 1, sk) + car.lane;
  /* esquivar superficies que ve venir (más a menudo cuanto más hábil) */
  for (const h of T.haz) { const di = ((h.i - car.i) % N + N) % N; if (di < 3 || di > 30) continue;
    if (car.avoid[h.seed] === undefined) car.avoid[h.seed] = Math.random() < sk * 0.95;
    if (car.avoid[h.seed] && Math.abs(off - h.off) < h.r + 16) off = h.off + (h.off > 0 ? -1 : 1) * (h.r + 22); }
  for (const p of puddles) { const dd = Math.hypot(p.x - s.x, p.y - s.y); if (dd < p.r + 40 && Math.random() < sk) { const po = (p.x - s.x) * s.nx + (p.y - s.y) * s.ny; if (Math.abs(off - po) < p.r + 14) off = po + (po > 0 ? -1 : 1) * (p.r + 20); } }
  /* adelantar: si hay un coche justo delante en su carril, se abre */
  for (const o of cars) { if (o === car || !o.alive || o.fall) continue; const dx = o.x - car.x, dy = o.y - car.y, fw = dx * Math.cos(car.a) + dy * Math.sin(car.a); if (fw > 0 && fw < 60 && Math.abs(-dx * Math.sin(car.a) + dy * Math.cos(car.a)) < 20) { off += (o.d > car.d ? -1 : 1) * 0.35 * T.hw; break; } }
  /* errores: de vez en cuando se despista (menos con más nivel) */
  car.errT -= dt; if (car.errT <= 0) { car.errT = 0.8 + Math.random() * 1.6; car.err = Math.random() < (1 - sk) * 0.45 ? 0.6 + Math.random() * 0.5 : 0; car.errOff = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6) * T.hw; }
  if (car.err > 0) { car.err -= dt; off += car.errOff; }
  off = clamp(off, -T.hw * 0.85, T.hw * 0.85);
  const tx = s.x + s.nx * off, ty = s.y + s.ny * off, tgt = Math.atan2(ty - car.y, tx - car.x);
  const want = S[car.i].va * vmax(car) * lerp(1.1, 1.02, sk);
  let thr = car.vf < want ? 1 : 0; const hb = !ITEMS && sk > 0.55 && car.vf > want * 1.2 && Math.abs(wrapA(tgt - car.a)) > 0.5;
  if (ITEMS && car.item) cpuItem(car, dt);
  if (car.fin) thr = car.vf < 90 ? 0.6 : 0;
  return { tgt, thr, hb };
}
function vmax(car) {
  let v = 255 * pace();
  if (car.cpu) { v *= ((GAR ? 0.88 : 0.85) + CUP * 0.0125 + (GAR ? 0 : race * 0.012)) * car.spd; // 1.23: antes 0,9/0,86 + 0,025·copa + 0,02·carrera (0,88/0,85: con 0,86/0,82 un bot con teclas ganaba siempre; con 0,9/0,86, nunca)
    const hs = cars.filter((q) => !q.cpu && q.alive); /* goma elástica suave: la CPU se acerca o afloja según el humano */
    if (hs.length && !GAR) { const h = hs.reduce((a, b) => (b.prog > a.prog ? b : a)); v *= 1 + clamp((h.prog - car.prog) / 2500, -0.1, 0.06); } }
  return v;
}
function drive(car, dt) {
  let inp = { tgt: null, thr: 0, hb: false };
  if (car.hold > 0) car.hold -= dt;
  else if (car.fin && !car.cpu) inp = { tgt: T.S[(car.i + 8) % T.N].a, thr: car.vf < 90 ? 0.5 : 0, hb: false };
  else inp = car.cpu ? cpuInput(car, dt) : humanInput(car);
  const sf = surface(car);
  if (sf.k === 'aceite' && car.lastSurf !== 'aceite') spinOut(car, 0.6);
  if (sf.k === 'charco' && car.lastSurf !== 'charco') { spinOut(car, 0.9); if (!car.cpu) k.float('¡Charco!', sx(car.x), sy(car.y) - 24, '#e2d4ff'); }
  if (sf.k === 'agua' && car.lastSurf !== 'agua') { for (let i = 0; i < 8; i++) addPart(car.x, car.y, '#bfeaff', 60, 0.5, 2.5); }
  car.lastSurf = sf.k;
  if (car.spin > 0) { car.spin -= dt; car.a += car.spinDir * 10 * dt; inp.thr = 0; inp.tgt = null; }
  if (car.bubble > 0) { car.bubble -= dt; inp.thr = 0; inp.tgt = null; }
  let { tgt, thr, hb } = inp;
  const fx = Math.cos(car.a), fy = Math.sin(car.a), vf0 = car.vx * fx + car.vy * fy;
  if (tgt !== null) {
    const da = wrapA(tgt - car.a), tm = 3.3 * (hb ? 1.4 : 1) * Math.max(thr ? 0.45 : 0.15, Math.min(1, Math.abs(vf0) / 100));
    car.a += clamp(da, -tm * dt, tm * dt); if (Math.abs(da) > 2.3) thr *= 0.35;
  }
  const Fx = Math.cos(car.a), Fy = Math.sin(car.a);
  let vf = car.vx * Fx + car.vy * Fy, vr = -car.vx * Fy + car.vy * Fx;
  const vm = vmax(car) * sf.vm * (car.boost > 0 ? 1.3 : 1);
  if (thr > 0) { if (vf < vm) vf = Math.min(vm, vf + 290 * thr * dt * (0.6 + 0.4 * sf.vm)); else vf -= (vf - vm) * 3 * dt; }
  else vf *= Math.exp(-(car.fin ? 2 : 1.1) * dt);
  if (hb) vf *= Math.exp(-0.55 * dt);
  if (car.bubble > 0) { vf *= Math.exp(-2.6 * dt); vr *= Math.exp(-2.6 * dt); }
  const grip = car.spin > 0 ? 0.8 : Math.min(hb ? 2.3 : 9, sf.grip);
  vr *= Math.exp(-grip * dt);
  car.vx = Fx * vf - Fy * vr; car.vy = Fy * vf + Fx * vr; car.vf = vf; car.vr = vr;
  const ox = car.x, oy = car.y; car.x += car.vx * dt; car.y += car.vy * dt;
  if (car.boost > 0) car.boost -= dt;
  if (car.jumpT > 0) { car.jumpT -= dt; car.z = Math.max(0, Math.sin(Math.PI * (1 - car.jumpT / 0.85))); if (car.jumpT <= 0) { car.z = 0; addDust(car, '#fff', 6); } }
  /* marcas de derrape y polvo */
  if (car.z < 0.05 && Math.abs(vr) > 55 && Math.abs(vf) > 50 && sf.k !== 'agua') for (const sd of [-6, 6]) { const bx = -12 * Fx - sd * Fy, by = -12 * Fy + sd * Fx; skids.push([ox + bx, oy + by, car.x + bx, car.y + by]); }
  if (skids.length > 700) skids.splice(0, skids.length - 700);
  if (sf.col && Math.abs(vf) > 60) { car.dust += dt * Math.abs(vf) / 30; while (car.dust > 1) { car.dust--; addPart(car.x - Fx * 12, car.y - Fy * 12, sf.col, 40, 0.5, 3); } }
  if (car.boost > 0 && Math.random() < 0.5) addPart(car.x - Fx * 16, car.y - Fy * 16, '#ffd166', 30, 0.3, 2.5);
}
function addPart(x, y, col, spd, life, r) { if (parts.length > 320) return; const a = Math.random() * TAU, v = Math.random() * spd; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, col, r: r * (0.6 + Math.random() * 0.6) }); }
function addDust(car, col, n) { for (let i = 0; i < n; i++) addPart(car.x, car.y, col, 90, 0.45, 3); }

/* ---------- Objetos (Karts de Patio) ---------- */
function giveItem(car) {
  const rank = ranking().indexOf(car), r = Math.random(), w = [[0.3, 0.1, 0.6], [0.4, 0.25, 0.35], [0.45, 0.35, 0.2], [0.45, 0.45, 0.1]][rank] || [0.4, 0.3, 0.3];
  car.item = r < w[0] ? 'pompa' : r < w[0] + w[1] ? 'muelle' : 'charco'; car.roll = 0.6; car.itemT = 0; if (!car.cpu) k.sfx('coin');
}
function useItem(car) {
  if (!car.item || car.roll > 0 || car.fall || car.bubble > 0) return;
  const it = car.item; car.item = null; const fx = Math.cos(car.a), fy = Math.sin(car.a);
  if (it === 'pompa') { const v = Math.max(0, car.vf) + 330; shots.push({ x: car.x + fx * 20, y: car.y + fy * 20, vx: fx * v, vy: fy * v, owner: car, t: 2.4 }); k.sfx('pop'); }
  else if (it === 'muelle') { car.jumpT = 0.85; car.boost = 1.1; const v = Math.max(car.vf, 0) + 110; car.vx = fx * v; car.vy = fy * v; k.sfx('jump'); addDust(car, '#ffd166', 8); }
  else { puddles.push({ x: car.x - fx * 30, y: car.y - fy * 30, r: 26, t: 14, owner: car, imm: 1.2, seed: Math.random() * 999 }); k.sfx('pop'); }
}
function cpuItem(car, dt) {
  car.itemT += dt; if (car.roll > 0) return; const sk = skill();
  if (car.itemT < 0.8 + (1 - sk) * 1.5) return;
  const fx = Math.cos(car.a), fy = Math.sin(car.a);
  const ahead = cars.some((o) => o !== car && o.alive && !o.fin && (() => { const dx = o.x - car.x, dy = o.y - car.y, d = Math.hypot(dx, dy); return d < 280 && (dx * fx + dy * fy) / d > 0.85; })());
  const behind = cars.some((o) => o !== car && o.alive && (() => { const dx = o.x - car.x, dy = o.y - car.y, d = Math.hypot(dx, dy); return d < 130 && (dx * fx + dy * fy) / d < -0.6; })());
  if (car.item === 'pompa' && (ahead || car.itemT > 7)) useItem(car);
  else if (car.item === 'charco' && (behind || car.itemT > 6)) useItem(car);
  else if (car.item === 'muelle' && ((T.S[car.i].va > 0.95 && car.vf > 150) || Math.abs(car.d) > T.hw || car.itemT > 5)) useItem(car);
}

/* ---------- Colisiones ---------- */
function collide(dt) {
  const act = cars.filter((q) => q.alive && !q.fall && q.z < 0.3);
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
    const a = act[i], b = act[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = 24;
    if (d >= R || d < 0.01 || a.ghost > 0 || b.ghost > 0) continue;
    const nx = dx / d, ny = dy / d, ov = (R - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
    const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rv < 0) { const im = -rv * 0.8; a.vx -= nx * im * 0.5; a.vy -= ny * im * 0.5; b.vx += nx * im * 0.5; b.vy += ny * im * 0.5;
      if (im > 70) { if (!a.cpu || !b.cpu) k.sfx('hit'); for (let n = 0; n < 5; n++) addPart((a.x + b.x) / 2, (a.y + b.y) / 2, '#fff3b0', 120, 0.3, 2); } }
  }
  for (const car of act) {
    for (const o of T.obst) { const dx = car.x - o.x, dy = car.y - o.y, d = Math.hypot(dx, dy), R = o.r + 11;
      if (d < R && d > 0.01) { const nx = dx / d, ny = dy / d; car.x = o.x + nx * R; car.y = o.y + ny * R; const vn = car.vx * nx + car.vy * ny;
        if (vn < 0) { car.vx -= nx * vn * 1.5; car.vy -= ny * vn * 1.5; car.vx *= 0.7; car.vy *= 0.7; if (-vn > 60) { if (!car.cpu) { k.sfx('hit'); k.shake(4); } for (let n = 0; n < 6; n++) addPart(car.x - nx * 11, car.y - ny * 11, '#fff', 110, 0.3, 2); } } } }
    if (M !== 'mesa') { const B = T.bound; /* vallas del patio / paredes del garaje */
      if (car.x < B.x0 + 12) { car.x = B.x0 + 12; car.vx = Math.abs(car.vx) * 0.5; } if (car.x > B.x1 - 12) { car.x = B.x1 - 12; car.vx = -Math.abs(car.vx) * 0.5; }
      if (car.y < B.y0 + 12) { car.y = B.y0 + 12; car.vy = Math.abs(car.vy) * 0.5; } if (car.y > B.y1 - 12) { car.y = B.y1 - 12; car.vy = -Math.abs(car.vy) * 0.5; } }
  }
}

/* ---------- Clasificación, cámara y reapariciones ---------- */
function ranking() { return cars.filter((q) => q.inMatch).slice().sort((a, b) => (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.prog - a.prog)); }
function camTarget() {
  const alive = cars.filter((q) => q.alive && q.inMatch);
  if (GAR) return alive.reduce((a, b) => (b.prog > a.prog ? b : a), alive[0]);
  const hs = cars.filter((q) => !q.cpu);
  if (!hs.length) return ranking()[0];
  const run = hs.filter((q) => !q.fin);
  return (run.length ? run : hs).reduce((a, b) => (b.prog > a.prog ? b : a));
}
function updCam(dt, snap) {
  const t = camTarget(); if (!t) return;
  const la = GAR ? 0.5 : 0.32, ax = t.x + clamp(t.vx * la, -VW * 0.3, VW * 0.3), ay = t.y + clamp(t.vy * la, -VH * 0.3, VH * 0.3), f = snap ? 1 : Math.min(1, dt * (GAR ? 3.2 : 4.5));
  cam.x += (ax - cam.x) * f; cam.y += (ay - cam.y) * f;
  if (GAR) { const q = clamp((roundT - 9) / 14, 0, 1); cam.ix = lerp(cam.ix, q * 0.3 * VW, Math.min(1, dt * 2)); cam.iy = lerp(cam.iy, q * 0.3 * VH, Math.min(1, dt * 2)); }
}
const inView = (car, m) => { const x0 = cam.x - VW / 2 + cam.ix, x1 = cam.x + VW / 2 - cam.ix, y0 = cam.y - VH / 2 + cam.iy, y1 = cam.y + VH / 2 - cam.iy; return car.x > x0 - m && car.x < x1 + m && car.y > y0 - m && car.y < y1 + m; };
function respawnAt(car, i, hold) {
  const s = T.S[((i % T.N) + T.N) % T.N], off = clamp(car.d, -0.3, 0.3) * 0; Object.assign(car, { x: s.x + s.nx * off, y: s.y + s.ny * off, a: s.a, vx: Math.cos(s.a) * 40, vy: Math.sin(s.a) * 40, fall: 0, spin: 0, bubble: 0, ghost: 1.4, hold: hold || 0 });
  const oldI = car.i; car.i = ((i % T.N) + T.N) % T.N; let ds = car.i * T.sp - car.s; if (ds < -T.L / 2) ds += T.L; if (ds > T.L / 2) ds -= T.L; car.prog += ds; car.s = car.i * T.sp; void oldI;
}
function sx(x) { return (x - cam.x) * Z + W / 2; } function sy(y) { return (y - cam.y) * Z + H / 2; }

/* ---------- Bucle ---------- */
function update(dt) {
  if (!k.gate(reset)) return;
  if (cdPend) { cdPend = false; k.count(3); updCam(0, true); }
  if (msgT > 0) msgT -= dt;
  if (phase === 'stand') { phT -= dt; if (phT <= 0 || (phT < 3 && (k.hit.has('a') || (k.party && k.party.some((q) => k.phit(q.p, 'a')))))) nextRace(); updParts(dt); return; }
  if (phase === 'gap') { phT -= dt; updParts(dt); if (phT <= 0) { newRound(); } return; }
  if (k.counting()) { updCam(dt); return; }
  raceT += dt; roundT += dt;
  for (const car of cars) {
    if (!car.alive) continue;
    if (car.ghost > 0) car.ghost -= dt;
    if (car.roll > 0) car.roll -= dt;
    if (car.fall > 0) { car.fall -= dt; car.vx *= 0.9; car.vy *= 0.9; if (car.fall <= 0) { respawnAt(car, car.i, 0.35); if (!car.cpu) k.sfx('start'); } continue; }
    drive(car, dt); locate(car);
    /* mesa: por el borde de la mesa se cae al suelo */
    if (M === 'mesa' && car.z < 0.05) { const tb = T.table; if (car.x < tb.x0 || car.x > tb.x1 || car.y < tb.y0 || car.y > tb.y1) { car.fall = 1.3; car.outX = car.vx; car.outY = car.vy; if (!car.cpu) { k.sfx('lose'); k.float('¡Al suelo!', sx(car.x), sy(car.y) - 20, '#ffd166'); } } }
    /* sentido contrario */
    if (!car.cpu) { const wrong = Math.abs(wrapA(car.a - T.S[car.i].a)) > 2.1 && Math.abs(car.vf) > 30; car.wrongT = wrong ? car.wrongT + dt : 0; }
    if (!GAR && !car.fin) {
      const lap = Math.floor(car.prog / T.L);
      if (lap > car.lapShown && lap < LAPS()) { car.lapShown = lap; if (!car.cpu) { k.sfx('coin'); msg = lap === LAPS() - 1 ? '¡Última vuelta!' : `Vuelta ${lap + 1}`; msgT = 1.6; } }
      if (car.prog >= LAPS() * T.L) { car.fin = raceT; finishOrder.push(car); if (!car.cpu) { k.sfx(finishOrder.length === 1 ? 'win' : 'coin'); k.burst(sx(car.x), sy(car.y), car.col, 24, 180); } }
    }
    if (ITEMS) for (const b of T.boxes) if (b.t <= 0 && car.z < 0.3 && Math.hypot(car.x - b.x, car.y - b.y) < 20) { b.t = 3; for (let n = 0; n < 8; n++) addPart(b.x, b.y, ['#ffd166', '#ff5fa2', '#5ce1e6'][n % 3], 120, 0.4, 2.5); if (!car.item) giveItem(car); }
  }
  collide(dt);
  if (ITEMS) {
    for (const b of T.boxes) if (b.t > 0) b.t -= dt;
    for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.t -= dt;
      let tg = null, bd = 330; for (const o of cars) { if (o === s.owner || !o.alive || o.fall || o.bubble > 0) continue; const dx = o.x - s.x, dy = o.y - s.y, d = Math.hypot(dx, dy), v = Math.hypot(s.vx, s.vy); if (d < bd && (dx * s.vx + dy * s.vy) / (d * v) > 0.5) { bd = d; tg = o; } }
      if (tg) { const v = Math.hypot(s.vx, s.vy), a = Math.atan2(s.vy, s.vx), da = wrapA(Math.atan2(tg.y - s.y, tg.x - s.x) - a), na = a + clamp(da, -2.6 * dt, 2.6 * dt); s.vx = Math.cos(na) * v; s.vy = Math.sin(na) * v; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      let hit = null; for (const o of cars) if (o !== s.owner && o.alive && !o.fall && o.z < 0.3 && Math.hypot(o.x - s.x, o.y - s.y) < 20) hit = o;
      const wall = T.obst.some((o) => Math.hypot(o.x - s.x, o.y - s.y) < o.r + 8);
      if (hit) { hit.bubble = 1.5; k.sfx('pop'); for (let n = 0; n < 12; n++) addPart(s.x, s.y, '#bfeaff', 140, 0.45, 2.5); if (!hit.cpu) k.float('¡Atrapado!', sx(hit.x), sy(hit.y) - 26, '#bfeaff'); }
      if (hit || wall || s.t <= 0) { if (!hit) for (let n = 0; n < 6; n++) addPart(s.x, s.y, '#e8fbff', 90, 0.35, 2); shots.splice(i, 1); }
    }
    for (let i = puddles.length - 1; i >= 0; i--) { const p = puddles[i]; p.t -= dt; p.imm -= dt; if (p.t <= 0) puddles.splice(i, 1); }
  }
  updCam(dt);
  const hs = cars.filter((q) => !q.cpu && q.alive);
  if (GAR) garageRules(dt);
  else {
    /* varios humanos: quien se queda fuera de la cámara reaparece detrás del líder (y espera un instante) */
    if (hs.length >= 2) { const lead = camTarget(); for (const car of hs) if (car !== lead && !car.fin && !car.fall && car.ghost <= 0 && raceT > 3 && !inView(car, 14)) { respawnAt(car, lead.i - 14 - (car.p % 2) * 5, 0.8); k.sfx('hurt'); msg = `${car.name}: ¡fuera de cámara!`; msgT = 1.4; } }
    const allH = hs.length && hs.every((q) => q.fin), firstF = finishOrder.length ? finishOrder[0].fin : 0;
    if ((allH && raceT - Math.max(...hs.map((q) => q.fin)) > 2.5) || (firstF && raceT - firstF > 14) || finishOrder.length >= NCAR) endRace();
  }
  updParts(dt);
}
function updParts(dt) { for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; p.life -= dt; } for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1); }
function endRace() {
  const r = ranking(); r.forEach((car, i) => { car.gain = PTS[i] || 0; car.pts += car.gain; car.place = i + 1; });
  phase = 'stand'; phT = 5; k.sfx(r[0].cpu ? 'coin' : 'win'); if (!r[0].cpu) k.confetti(r[0].col, 60);
}
function nextRace() {
  if (race >= 2) return finish(cars.map((q) => ({ p: q.p, score: q.pts, name: q.name })), cars.reduce((a, b) => (b.pts > a.pts ? b : a)));
  race++; startRace();
}
function finish(rows, champ) {
  const CN = ['roja', 'azul', 'amarilla', 'verde']; rows.forEach((r) => { const car = cars.find((q) => q.p === r.p); if (car && car.cpu) r.name = 'CPU ' + CN[r.p]; });
  const hw = champ && !champ.cpu;
  if (!k.party || hw) { CUP = clamp(CUP + (hw ? 1 : k.party ? 0 : -1), 0, 5); try { localStorage.setItem('cup:' + CFG.id, CUP); } catch (e) { /* sin almacenamiento */ } }
  if (!k.party) k.best(CFG.id, rows.find((q) => q.p === 0).score);
  const tie = rows.filter((q) => q.score === champ.pts).length > 1;
  const head = tie ? null : !champ.cpu && !k.party ? (GAR ? '¡Rey del garaje!' : '¡La copa es tuya!') : champ.cpu ? `¡Gana la CPU ${CN[champ.p]}!` : null;
  k.podium(rows, Object.assign({ fmt: (n) => `${n} punto${n === 1 ? '' : 's'}` }, head ? { head } : {}));
}

/* ---------- Circuito Garaje: rondas por cámara ---------- */
function garageRules() {
  const alive = cars.filter((q) => q.alive && q.inMatch);
  if (roundT > 2.5 && alive.length > 1) for (const car of alive) {
    if (car === camTarget() || inView(car, 16)) continue;
    car.alive = false; car.pts--; lastOut(car);
  }
  const left = cars.filter((q) => q.alive && q.inMatch);
  if (left.length <= 1) {
    const w = left[0] || lastWin; if (left[0]) { w.pts++; lastWin = w; k.float('+1', sx(w.x), sy(w.y) - 28, w.col); if (!w.cpu) k.sfx('win'); }
    cars.forEach((q) => { if (q.pts <= 0 && q.inMatch) { q.inMatch = false; q.alive = false; } });
    const inM = cars.filter((q) => q.inMatch);
    if (inM.some((q) => q.pts >= 6) || inM.length <= 1 || round >= 10 || !inM.some((q) => !q.cpu)) { const rows = cars.map((q) => ({ p: q.p, score: Math.max(0, q.pts), name: q.name })), champ = cars.slice().sort((a, b) => b.pts - a.pts)[0]; phase = 'gap'; phT = 1e9; setTimeout(() => finish(rows, champ), 900); return; }
    phase = 'gap'; phT = 1.6; msg = w ? `¡Punto para ${w.name === 'Tú' ? 'ti' : w.name}!` : 'Ronda nula'; msgT = 1.6;
  }
}
function lastOut(car) {
  const x = clamp(sx(car.x), 20, W - 20), y = clamp(sy(car.y), 40, H - 20);
  k.float(`${car.name} fuera · −1`, x, y, car.col); k.sfx(car.cpu ? 'hit' : 'hurt'); if (!car.cpu) k.shake(5);
  for (let n = 0; n < 10; n++) addPart(car.x, car.y, car.col, 120, 0.5, 3);
}
function newRound() {
  round++; roundT = 0; phase = 'run'; cam.ix = cam.iy = 0; skids.length = 0;
  const w = lastWin && lastWin.inMatch ? lastWin : camTarget() || cars.find((q) => q.inMatch);
  const list = cars.filter((q) => q.inMatch); list.sort((a, b) => (a === w ? -1 : b === w ? 1 : b.prog - a.prog));
  const anchor = w.i + 4; list.forEach((q) => { q.alive = true; });
  grid(anchor, list); list.forEach((q) => { q.prog = w.prog + ((q.i - anchor) * T.sp); q.s = q.i * T.sp; });
  updCam(0, true); msg = `Ronda ${round}`; msgT = 1.2; k.count(2);
}

/* ---------- Dibujo ---------- */
function drawWorld() {
  const x0 = cam.x - VW / 2, y0 = cam.y - VH / 2;
  c.save(); c.scale(Z, Z); c.translate(-Math.round(x0 * 2) / 2, -Math.round(y0 * 2) / 2);
  c.fillStyle = PT.ground; c.fillRect(x0, y0, VW, VH);
  if (M === 'mesa') {
    c.fillStyle = 'rgba(30,20,30,.45)'; c.fillRect(x0, y0, VW, VH);
    const tb = T.table; c.fillStyle = 'rgba(20,10,20,.4)'; rr(c, tb.x0 + 14, tb.y0 + 20, tb.x1 - tb.x0, tb.y1 - tb.y0, 26); c.fill();
    rr(c, tb.x0 - 6, tb.y0 - 6, tb.x1 - tb.x0 + 12, tb.y1 - tb.y0 + 12, 28); c.fillStyle = '#8a5530'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    rr(c, tb.x0, tb.y0, tb.x1 - tb.x0, tb.y1 - tb.y0, 24); c.fillStyle = PT.table; c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,230,190,.35)'; c.stroke();
  } else {
    const B = T.bound; c.lineWidth = 14; c.strokeStyle = M === 'patio' ? '#9a6a3c' : '#5b5f6b'; c.strokeRect(B.x0 - 7, B.y0 - 7, B.x1 - B.x0 + 14, B.y1 - B.y0 + 14);
    c.lineWidth = 3; c.strokeStyle = OUT; c.strokeRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0); c.strokeRect(B.x0 - 14, B.y0 - 14, B.x1 - B.x0 + 28, B.y1 - B.y0 + 28);
    if (M === 'patio') { c.strokeStyle = '#c28a52'; c.lineWidth = 3; for (let x = B.x0; x < B.x1; x += 30) { c.beginPath(); c.moveTo(x, B.y0 - 12); c.lineTo(x, B.y0 - 2); c.moveTo(x, B.y1 + 2); c.lineTo(x, B.y1 + 12); c.stroke(); } }
  }
  const hw = T.hw; c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = 'rgba(20,12,40,.22)'; c.lineWidth = hw * 2 + 22; c.save(); c.translate(3, 5); c.stroke(T.path); c.restore();
  c.strokeStyle = OUT; c.lineWidth = hw * 2 + 14; c.stroke(T.path);
  c.strokeStyle = PT.edge; c.lineWidth = hw * 2 + 9; c.stroke(T.path);
  c.strokeStyle = OUT; c.lineWidth = hw * 2 + 2; c.stroke(T.path);
  c.strokeStyle = PT.road; c.lineWidth = hw * 2; c.stroke(T.path);
  c.lineCap = 'butt'; c.lineWidth = 6; c.strokeStyle = '#e8434a'; c.stroke(T.kerbR); c.strokeStyle = '#ffffff'; c.stroke(T.kerbW);
  if (GAR) { c.setLineDash([18, 16]); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke(T.path); c.setLineDash([]); }
  /* línea de salida a cuadros */
  { const s = T.S[0]; c.save(); c.translate(s.x, s.y); c.rotate(s.a); const n = Math.round(hw * 2 / 8); for (let r = 0; r < 2; r++) for (let q = 0; q < n; q++) { c.fillStyle = (q + r) % 2 ? '#1a1530' : '#fff'; c.fillRect(-8 + r * 8, -hw + q * (hw * 2 / n), 8, hw * 2 / n); } c.restore(); }
  /* marcas de derrape */
  c.strokeStyle = 'rgba(30,20,30,.28)'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); for (const s of skids) { c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); } c.stroke();
  for (const h of T.haz) { if (Math.abs(h.x - cam.x) > VW / 2 + 60 || Math.abs(h.y - cam.y) > VH / 2 + 60) continue; const sp = hazSprite(h.type, h.r, h.seed); c.drawImage(sp, h.x - h.r * 1.3, h.y - h.r * 1.3, h.r * 2.6, h.r * 2.6); }
  for (const p of puddles) { const sp = hazSprite('charco', p.r, p.seed); c.globalAlpha = Math.min(1, p.t / 1.5); c.drawImage(sp, p.x - p.r * 1.3, p.y - p.r * 1.3, p.r * 2.6, p.r * 2.6); c.globalAlpha = 1; }
  const tt = performance.now() / 1000;
  for (const b of T.boxes) { if (b.t > 0) { const q = 1 - b.t / 3; if (q < 0.6) continue; c.globalAlpha = (q - 0.6) / 0.4; }
    c.save(); c.translate(b.x, b.y); c.rotate(Math.sin(tt * 2 + b.x) * 0.25); const bs = 1 + Math.sin(tt * 4 + b.y) * 0.06; c.scale(bs, bs);
    shadow(c, 2, 12, 11, 0.25); rr(c, -11, -11, 22, 22, 5); const g = c.createLinearGradient(-11, -11, 11, 11); g.addColorStop(0, '#ffd166'); g.addColorStop(0.5, '#ff7ab8'); g.addColorStop(1, '#6e62f5'); c.fillStyle = g; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
    c.font = '900 15px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 3; c.strokeText('?', 0, 1); c.fillStyle = '#fff'; c.fillText('?', 0, 1); c.restore(); c.globalAlpha = 1; }
  for (const o of T.obst) { if (Math.abs(o.x - cam.x) > VW / 2 + 50 || Math.abs(o.y - cam.y) > VH / 2 + 50) continue; shadow(c, o.x + 4, o.y + 6, o.r * 1.05, 0.25); c.save(); c.translate(o.x, o.y); c.rotate(o.rot); c.drawImage(obsSprite(o.type, o.r), -o.r * 1.5, -o.r * 1.5, o.r * 3, o.r * 3); c.restore(); }
  for (const p of parts) { c.globalAlpha = Math.min(1, p.life / p.max * 1.6) * 0.85; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); } c.globalAlpha = 1;
  const list = cars.filter((q) => q.alive || (GAR && q.inMatch && phase !== 'run')).filter((q) => q.inMatch).sort((a, b) => a.z - b.z || a.y - b.y);
  for (const car of list) drawCar(car, tt);
  for (const s of shots) { c.save(); c.translate(s.x, s.y); itemIcon(c, 'pompa', 0, Math.sin(tt * 12) * 1.5, 24); c.restore(); }
  for (const car of list) if (car.alive && !car.fall) {
    const y = car.y - 24 - car.z * 14; let tag = null;
    if (k.party) tag = car.cpu ? 'CPU' : 'J' + (car.p + 1); else if (!car.cpu && raceT < 4) tag = 'TÚ';
    if (tag) { c.font = '900 12px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const tw = c.measureText(tag).width + 10; rr(c, car.x - tw / 2, y - 9, tw, 16, 6); c.fillStyle = car.col; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 2.5; c.strokeText(tag, car.x, y); c.fillText(tag, car.x, y); }
    if (ITEMS && car.item && !car.cpu && k.party) { const yy = y - (tag ? 20 : 4); c.beginPath(); c.arc(car.x, yy, 10, 0, TAU); c.fillStyle = 'rgba(255,255,255,.85)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); itemIcon(c, car.roll > 0 ? ['pompa', 'muelle', 'charco'][Math.floor(tt * 12) % 3] : car.item, car.x, yy, 16); }
  }
  c.restore();
}
function drawCar(car, tt) {
  let s = 1 + car.z * 0.35, x = car.x, y = car.y - car.z * 14, a = car.a;
  if (car.fall > 0) { const q = 1 - car.fall / 1.3; s = Math.max(0.1, 1 - q * 1.1); x += car.outX * q * 0.35; y += car.outY * q * 0.35 + q * q * 40; a += q * 8; }
  if (car.ghost > 0 && Math.floor(tt * 14) % 2) c.globalAlpha = 0.45;
  if (car.fall <= 0) shadow(c, car.x + 3 + car.z * 8, car.y + 5 + car.z * 10, 17 * (1 - car.z * 0.3), 0.3);
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
  if (!car.cpu && !k.party) { c.beginPath(); c.ellipse(0, 0, 24, 17, 0, 0, TAU); c.lineWidth = 2.5; c.strokeStyle = alpha('#ffffff', 0.35 + 0.25 * Math.sin(tt * 6)); c.stroke(); }
  c.drawImage(carSprite(car.col, MD.car), -24, -16, 48, 32); c.restore(); c.globalAlpha = 1;
  if (car.bubble > 0) { c.beginPath(); c.arc(car.x, car.y - 6 + Math.sin(tt * 5) * 3, 24, 0, TAU); c.fillStyle = 'rgba(160,225,255,.3)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = 'rgba(232,251,255,.9)'; c.stroke(); glint(c, car.x - 9, car.y - 16, 4); }
  if (car.spin > 0) for (let i = 0; i < 3; i++) { const an = tt * 8 + i * 2.1; glint(c, car.x + Math.cos(an) * 20, car.y - 18 + Math.sin(an) * 6, 3.5, '#ffd166'); }
}
function drawMini() {
  const m = T.mini, x = W - m.w - 10, y = 10; rr(c, x - 6, y - 6, m.w + 12, m.h + 12, 10); c.fillStyle = 'rgba(20,16,36,.62)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
  c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.25)'; c.stroke(m.path); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke(m.path);
  const s0 = T.S[0]; c.fillStyle = '#ffd166'; c.fillRect((s0.x - m.ox) * m.sc - 2, (s0.y - m.oy) * m.sc - 2, 4, 4);
  for (const car of cars.filter((q) => q.alive && q.inMatch).sort((a, b) => (a.cpu ? 0 : 1) - (b.cpu ? 0 : 1))) { c.beginPath(); c.arc((car.x - m.ox) * m.sc, (car.y - m.oy) * m.sc, car.cpu ? 3 : 4.5, 0, TAU); c.fillStyle = car.col; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); }
  c.restore();
}
const ORD = (n) => n + '.º';
function drawHUD() {
  if (GAR) {
    const bw = 124; let y = 8;
    for (const car of cars) { const x = 8; rr(c, x, y, bw, 28, 9); c.fillStyle = car.inMatch ? 'rgba(20,16,36,.72)' : 'rgba(20,16,36,.35)'; c.fill(); c.lineWidth = 2; c.strokeStyle = car.alive && car.inMatch ? car.col : OUT; c.stroke();
      label(car.cpu ? 'CPU' : car.name, x + 7, y + 6, 14, car.col); for (let i = 0; i < 6; i++) { const px = x + 50 + i * 12, py = y + 14; c.beginPath(); c.arc(px, py, 4.2, 0, TAU); c.fillStyle = i < car.pts ? car.col : 'rgba(255,255,255,.14)'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke(); }
      if (!car.alive && phase === 'run' || !car.inMatch) { c.strokeStyle = '#ff5a5f'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 4, y + 24); c.lineTo(x + bw - 4, y + 4); c.stroke(); }
      y += 32; }
    drawMini();
    if (cam.ix > 2) { /* la cámara se estrecha: franjas de peligro */ const ix = cam.ix * Z, iy = cam.iy * Z; c.fillStyle = 'rgba(10,6,20,.55)'; c.fillRect(0, 0, ix, H); c.fillRect(W - ix, 0, ix, H); c.fillRect(ix, 0, W - ix * 2, iy); c.fillRect(ix, H - iy, W - ix * 2, iy); c.strokeStyle = '#ffc93c'; c.lineWidth = 3; c.setLineDash([12, 8]); c.strokeRect(ix, iy, W - ix * 2, H - iy * 2); c.setLineDash([]); }
    label(`Ronda ${round}`, 10, H - 30, 18, '#fff');
  } else {
    const r = ranking(), hs = cars.filter((q) => !q.cpu), laps = LAPS();
    if (hs.length <= 1) { const me = hs[0] || r[0], pos = r.indexOf(me) + 1, lap = clamp(Math.floor(me.prog / T.L) + 1, 1, laps);
      rr(c, 8, 8, 112, 58, 12); c.fillStyle = 'rgba(20,16,36,.66)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
      label(ORD(pos), 16, 11, 30, pos === 1 ? '#ffd166' : '#fff'); label('/4', 18 + c.measureText(ORD(pos)).width, 22, 16, '#c9c3e6');
      label(me.fin ? '¡Meta!' : `Vuelta ${lap}/${laps}`, 16, 45, 14, '#c9c3e6');
      if (ITEMS) { rr(c, 126, 8, 50, 50, 12); c.fillStyle = 'rgba(20,16,36,.66)'; c.fill(); c.lineWidth = 2; c.strokeStyle = me.item ? '#ffd166' : OUT; c.stroke();
        if (me.item) itemIcon(c, me.roll > 0 ? ['pompa', 'muelle', 'charco'][Math.floor(performance.now() / 80) % 3] : me.item, 151, 31, 34); else label('B', 151, 22, 16, 'rgba(255,255,255,.25)', 'center'); }
    } else { let x = 8; for (const q of hs) { const pos = r.indexOf(q) + 1, lap = clamp(Math.floor(q.prog / T.L) + 1, 1, laps), bw = 108; rr(c, x, 8, bw, 32, 9); c.fillStyle = 'rgba(20,16,36,.7)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = q.col; c.stroke();
      label(`J${q.p + 1} ${ORD(pos)}`, x + 7, 13, 18, q.col); label(q.fin ? 'meta' : `${lap}/${laps}`, x + bw - 7, 16, 13, '#fff', 'right'); x += bw + 6; } }
    drawMini();
    const me = hs[0]; if (me && me.wrongT > 0.8 && !me.fin) label('¡Sentido contrario!', W / 2, H * 0.3, 22, '#ff5a5f', 'center');
  }
  if (msgT > 0 && phase === 'run') { c.globalAlpha = Math.min(1, msgT * 2); label(msg, W / 2, PORT ? 92 : 58, PORT ? 20 : 24, '#fff', 'center'); c.globalAlpha = 1; }
}
function drawStand() {
  const r = cars.slice().sort((a, b) => b.pts - a.pts), bw = Math.min(W - 40, 420), bh = 72 + r.length * 40, x = (W - bw) / 2, y = (H - bh) / 2;
  c.fillStyle = 'rgba(10,6,20,.55)'; c.fillRect(0, 0, W, H);
  rr(c, x, y, bw, bh, 18); const g = c.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, '#3a3160'); g.addColorStop(1, '#221c3d'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  label(race >= 2 ? 'Clasificación final' : `Tras la carrera ${race + 1} de 3`, W / 2, y + 16, 22, '#ffd166', 'center');
  r.forEach((q, i) => { const yy = y + 56 + i * 40; rr(c, x + 14, yy, bw - 28, 34, 10); c.fillStyle = alpha(q.col, 0.22); c.fill(); c.lineWidth = 2; c.strokeStyle = q.col; c.stroke();
    label(`${i + 1}.`, x + 26, yy + 7, 18, '#fff'); c.save(); c.translate(x + 70, yy + 17); c.drawImage(carSprite(q.col, MD.car), -18, -12, 36, 24); c.restore();
    label(q.name, x + 96, yy + 7, 18, q.col); label(`${q.pts}`, x + bw - 80, yy + 7, 18, '#fff', 'right'); if (q.gain) label(`+${q.gain}`, x + bw - 28, yy + 9, 15, '#7cf7a0', 'right'); });
}
function draw() {
  drawWorld();
  if (phase === 'stand') drawStand(); else drawHUD();
}
reset();
k.show(CFG.title, CFG.help);
k.run(update, draw);
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
