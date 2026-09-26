/* Cube Roller: rueda el bloque 1×1×2 hasta que caiga de pie en el agujero (niveles generados y comprobados por BFS).
 * El bloque se dibuja en 3D real (8 esquinas rotadas sobre la arista de apoyo) y el tablero se cachea por nivel. */
const k = Kit({ w: 640, h: 480, title: CFG.title, bg: '#101428' }), c = k.ctx, OUT = ART.OUT;
/* --- Ley de la pieza única (R5, docs/REMASTER.md §8) + cartoon de estudio -----------------
   `unite(g, partes, ancho)` traza TODAS las partes y las rellena después: los contornos
   interiores quedan tapados y solo sobrevive la silueta. El detalle interior va recortado
   (`clipIn`), nunca con stroke; las separaciones internas se leen por sombra propia. */
const PZO = '#1a1530', OUTW = 1.5, INW = 0.7, INA = 0.6;
const _hx = (h) => { if (h[0] !== '#') { const m = h.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; } h = h.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _rgb = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
const PLT = (col, f) => _rgb(_hx(col).map((v) => v + (255 - v) * f));
const PDK = (col, f) => _rgb(_hx(col).map((v) => v * (1 - f)));
const PAL = (col, a) => { const q = _hx(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
/* partes = [[trazado, relleno, sombraDeContacto?]], en orden de profundidad */
function unite(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = PZO; g.lineWidth = (ow || OUTW) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) {
    const P = parts[i];
    if (P[2]) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); P[0](g); g.strokeStyle = PAL(PZO, 0.15); g.lineWidth = P[2]; g.stroke(); g.lineWidth = P[2] * 0.45; g.stroke(); g.restore(); }
    g.beginPath(); P[0](g); g.fillStyle = P[1]; g.fill();
  }
}
/* detalle recortado contra un trazado (en el lienzo vivo: recorte a secas, nunca source-atop) */
function clipIn(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* detalle de una pieza dentro de una caché (source-atop es barato en un lienzo pequeño) */
function within(g, path, fn) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* 3 planos de color con borde duro: sombra, base desplazada hacia la luz y plano de luz */
function cel3(g, path, base, o) {
  o = o || {}; const dx = o.dx == null ? 2.4 : o.dx, dy = o.dy == null ? 2.2 : o.dy, R = o.r || 200;
  g.save(); g.beginPath(); path(g); g.clip();
  g.fillStyle = PDK(base, o.sh == null ? 0.26 : o.sh); g.fillRect(-R, -R, R * 2, R * 2);
  g.save(); g.translate(-dx, -dy); g.beginPath(); path(g); g.fillStyle = base; g.fill(); g.restore();
  if (o.hi !== false) { g.save(); g.translate(-dx * 2.15, -dy * 2.15); g.beginPath(); path(g); g.fillStyle = PLT(base, o.lt == null ? 0.2 : o.lt); g.fill(); g.restore(); }
  g.restore();
}
/* óvalo especular (un único toque de luz por pieza) */
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = `rgba(255,255,255,${a == null ? 0.5 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.283); g.fill(); }
/* sombra de contacto dura bajo el objeto */
function contact(g, x, y, rx, ry, a) { g.fillStyle = `rgba(12,10,26,${a == null ? 0.3 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.283); g.fill(); }
let tiles, st, goal, level, moves, score, anim, fall, NX, NY, par, TW, TH, ZH, OX, OY, board, queue, t, lastMove;
/* estado: {x,y,o} o: 0 de pie, 1 tumbado en X (ocupa x,x+1), 2 tumbado en Y (ocupa y,y+1) */
const cellsOf = (s) => s.o === 0 ? [[s.x, s.y]] : s.o === 1 ? [[s.x, s.y], [s.x + 1, s.y]] : [[s.x, s.y], [s.x, s.y + 1]];
function roll(s, d) { const [dx, dy] = d; if (s.o === 0) { if (dx) return { x: dx > 0 ? s.x + 1 : s.x - 2, y: s.y, o: 1 }; return { x: s.x, y: dy > 0 ? s.y + 1 : s.y - 2, o: 2 }; }
  if (s.o === 1) { if (dx) return { x: dx > 0 ? s.x + 2 : s.x - 1, y: s.y, o: 0 }; return { x: s.x, y: s.y + dy, o: 1 }; }
  if (dy) return { x: s.x, y: dy > 0 ? s.y + 2 : s.y - 1, o: 0 }; return { x: s.x + dx, y: s.y, o: 2 }; }
const ok = (s) => cellsOf(s).every(([x, y]) => tiles.has(x + ',' + y));
const DD = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function build() {
  NX = Math.min(14, 8 + Math.floor(level * 0.7)); NY = Math.min(9, 5 + Math.floor(level / 3)); // 1.23: más fácil (antes 8+nivel, 5+nivel/2)
  // Se repite hasta encontrar un nivel resoluble (BFS); tras 300 intentos se relaja la distancia mínima
  /* recorrido mínimo del nivel en una franja creciente: 5-8 (nivel 1), 6-9, 8-11 … hasta 14-17 desde el nivel 7 (antes ≥7 y la meta más lejana posible)
   * y tablero más lleno al principio (56 % → 35 %) */
  const LO = Math.min(14, 3 + Math.round(level * 1.0)), HI = LO + 3; // 1.23: rampa más lenta (antes ×1,5)
  for (let tries = 0; ; tries++) {
    tiles = new Set(); let x = 1, y = Math.floor(NY / 2); const target = Math.floor(NX * NY * (0.56 - Math.min(0.21, level * 0.02)));
    while (tiles.size < target) { tiles.add(x + ',' + y); const d = k.pick([[1, 0], [1, 0], [0, 1], [0, -1], [-1, 0]]); x = k.clamp(x + d[0], 0, NX - 1); y = k.clamp(y + d[1], 0, NY - 1); if (Math.random() < 0.3) tiles.add(k.clamp(x + 1, 0, NX - 1) + ',' + y); }
    const start = { x: 1, y: Math.floor(NY / 2), o: 0 }; if (!ok(start)) continue;
    const K = (s) => s.x + ',' + s.y + ',' + s.o, seen = new Map([[K(start), 0]]), q = [start]; let far = null, fd = 0;
    while (q.length) { const s = q.shift(), d = seen.get(K(s)); if (s.o === 0 && d > fd && d >= (tries < 2000 ? 4 : 2) && (tries >= 300 || d <= HI)) { far = s; fd = d; } for (const dd of Object.values(DD)) { const n = roll(s, dd); if (ok(n) && !seen.has(K(n))) { seen.set(K(n), d + 1); q.push(n); } } }
    if (far && fd >= (tries < 300 ? LO : tries < 2000 ? 4 : 2)) { /* tope: tras 2000 intentos acepta cualquier meta alcanzable */ st = start; goal = [far.x, far.y]; par = fd; break; }
  }
  moves = 0; fall = 0; anim = null; queue = null; lastMove = 0; layout(); bake();
}
function reset() { if (!level || (k.st === 'over' && fall > 0 && !st.won)) { level = 1; score = 0; } t = 0; build(); }
/* ---------- Proyección isométrica (escala según tamaño del nivel) ---------- */
function layout() { TW = Math.min(64, Math.floor(1120 / (NX + NY))); TH = Math.round(TW * 0.56); ZH = TH * 1.15; OX = 320 - (NX - NY) * TW / 4; OY = 262 - (NX + NY) * TH / 4; }
const P = (x, y, z) => [OX + (x - y) * TW / 2, OY + (x + y) * TH / 2 - z];
const Q = (x, y, z) => P(x - 0.5, y - 0.5, z * ZH); // coordenadas de arista (casilla x ocupa [x, x+1])
const mk = (w, h, f) => { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; f(g); return cv; };
const rs = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const BGC = mk(640, 480, (g) => { const gr = g.createRadialGradient(320, 200, 40, 320, 240, 460); gr.addColorStop(0, '#26306a'); gr.addColorStop(1, '#0c0f24'); g.fillStyle = gr; g.fillRect(0, 0, 640, 480);
  for (let i = 0; i < 90; i++) { g.globalAlpha = 0.2 + rs(i) * 0.6; g.fillStyle = '#fff'; g.fillRect(rs(i + 1) * 640, rs(i + 2) * 480, 1.5, 1.5); } g.globalAlpha = 1; });
/* Ley de la pieza única: cada baldosa es UN prisma (hexágono trazado y contorneado una vez);
   la cara superior y los dos costados se separan por color, no por línea. La casilla meta lleva
   el agujero como segundo subtrazado del mismo path (regla par-impar), así el hueco forma parte
   de la silueta en vez de ser una placa encajada encima. */
function bake() { const D = Math.max(8, TH * 0.4);
  board = mk(640, 480, (g) => { g.drawImage(BGC, 0, 0, 640, 480);
    const list = [...tiles].map((s) => s.split(',').map(Number)).sort((a, b) => a[0] + a[1] - b[0] - b[1]);
    const dia = (x, y, z) => { const a = P(x, y, z); return [[a[0], a[1] - TH / 2], [a[0] + TW / 2, a[1]], [a[0], a[1] + TH / 2], [a[0] - TW / 2, a[1]]]; };
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([a, b]) => g.lineTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); };
    g.lineJoin = 'round'; g.lineCap = 'round';
    // sombra proyectada del tablero
    g.fillStyle = 'rgba(0,0,0,.3)'; for (const [x, y] of list) { const d = dia(x, y, -D - 10); g.beginPath(); d.forEach(([a, b]) => g.lineTo(a + 6, b)); g.fill(); }
    for (const [x, y] of list) { const d = dia(x, y, 0), gl = x === goal[0] && y === goal[1];
      const sil = (q) => { q.moveTo(d[3][0], d[3][1]); q.lineTo(d[0][0], d[0][1]); q.lineTo(d[1][0], d[1][1]); q.lineTo(d[1][0], d[1][1] + D); q.lineTo(d[2][0], d[2][1] + D); q.lineTo(d[3][0], d[3][1] + D); q.closePath(); };
      const lo = gl ? '#4a4f8c' : (x + y) % 2 ? '#8b93d6' : '#7d86cc';
      const hole = gl ? d.map(([a, b]) => [a + (P(x, y, 0)[0] - a) * 0.24, b + (P(x, y, 0)[1] - b) * 0.24]) : null;
      g.beginPath(); sil(g);
      if (gl) { g.moveTo(hole[0][0], hole[0][1]); for (let n = 3; n > 0; n--) g.lineTo(hole[n][0], hole[n][1]); g.closePath(); }
      g.fillStyle = lo; g.fill(gl ? 'evenodd' : 'nonzero');
      g.save(); g.clip(gl ? 'evenodd' : 'nonzero');
      poly([d[3], d[2], [d[2][0], d[2][1] + D], [d[3][0], d[3][1] + D]], PDK(lo, 0.5));   // costado izquierdo, en sombra
      poly([d[2], d[1], [d[1][0], d[1][1] + D], [d[2][0], d[2][1] + D]], PDK(lo, 0.66));  // costado derecho, más oscuro
      poly(d, gl ? PDK(lo, 0.18) : PLT(lo, 0.1));                                          // cara superior, a la luz
      g.fillStyle = 'rgba(12,10,26,.14)'; g.fillRect(d[3][0], d[2][1] + D - 5, TW, 6);      // sombra propia en la base
      g.restore();
      g.lineWidth = 1.5; g.strokeStyle = OUT; g.beginPath(); sil(g); g.stroke();
      if (gl) { // pozo: negro al fondo y borde dorado, todo dentro de la silueta de la baldosa
        g.beginPath(); hole.forEach(([a, b]) => g.lineTo(a, b)); g.closePath();
        g.save(); g.clip(); g.fillStyle = '#05060d'; g.fillRect(hole[3][0], hole[0][1] - 2, TW, D * 3);
        g.fillStyle = '#131634'; g.beginPath(); g.moveTo(hole[3][0], hole[3][1]); g.lineTo(hole[0][0], hole[0][1]); g.lineTo(hole[1][0], hole[1][1]); g.lineTo(hole[1][0], hole[1][1] + D); g.lineTo(hole[3][0], hole[3][1] + D); g.closePath(); g.fill(); g.restore();
        g.strokeStyle = '#f2d15c'; g.lineWidth = 2; g.beginPath(); hole.forEach(([a, b]) => g.lineTo(a, b)); g.closePath(); g.stroke();
      } else {
        g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(d[3][0] + 4, d[3][1]); g.lineTo(d[0][0], d[0][1] + 3); g.lineTo(d[1][0] - 4, d[1][1]); g.stroke();   // luz de borde
        const a0 = P(x, y, 0); g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(a0[0] - TW * 0.13, a0[1] - TH * 0.1, TW * 0.13, TH * 0.11, -0.5, 0, 6.283); g.fill();   // especular
      }
      if (x === 1 && y === Math.floor(NY / 2)) { const a = P(x, y, 0); g.strokeStyle = 'rgba(124,247,160,.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(a[0], a[1], TW * 0.22, TH * 0.22, 0, 0, 6.283); g.stroke(); } }
  }); }
reset(); k.show(CFG.title, 'Desliza (en diagonal) o usa las flechas para rodar el bloque. Mételo de pie en el agujero dorado. ¡Si se sale de las baldosas, cae!');
/* ---------- Bloque 3D ---------- */
const FACES = [[[0, 2, 6, 4], [-1, 0, 0]], [[1, 5, 7, 3], [1, 0, 0]], [[0, 4, 5, 1], [0, -1, 0]], [[2, 3, 7, 6], [0, 1, 0]], [[0, 1, 3, 2], [0, 0, -1]], [[4, 6, 7, 5], [0, 0, 1]]];
function boxOf(s) { const cs = cellsOf(s), x0 = Math.min(...cs.map((q) => q[0])), y0 = Math.min(...cs.map((q) => q[1])), x1 = Math.max(...cs.map((q) => q[0])) + 1, y1 = Math.max(...cs.map((q) => q[1])) + 1; return { x0, y0, x1, y1, h: s.o === 0 ? 2 : 1 }; }
/* Ley de la pieza única: el bloque es UN volumen. Antes cada cara llevaba su contorno cerrado y
   un recuadro interior, así que se leían seis chapas encajadas. Ahora las caras se rellenan sin
   línea (se separan por la luz) y se contornea una sola vez la silueta = envolvente convexa de
   los 8 vértices proyectados, que en un prisma convexo es exactamente su borde. */
function hull(pts) {
  const q = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), h = [];
  for (const p of q) { while (h.length >= 2 && cr(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); }
  const L = h.length + 1;
  for (let i = q.length - 2; i >= 0; i--) { const p = q[i]; while (h.length >= L && cr(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); }
  h.pop(); return h;
}
function drawBlock(s, a, sink, alpha) { const b = boxOf(s), pts = [], th = a ? a.p * Math.PI / 2 : 0, co = Math.cos(th), si = Math.sin(th);
  const R = (x, y, z, piv) => { if (!a) return [x, y, z]; const [dx, dy] = a.d; if (dx) { const u = x - piv; return dx > 0 ? [piv + u * co + z * si, y, -u * si + z * co] : [piv + u * co - z * si, y, u * si + z * co]; } const u = y - piv; return dy > 0 ? [x, piv + u * co + z * si, -u * si + z * co] : [x, piv + u * co - z * si, u * si + z * co]; };
  const piv = a ? (a.d[0] > 0 ? b.x1 : a.d[0] < 0 ? b.x0 : a.d[1] > 0 ? b.y1 : b.y0) : 0;
  for (let i = 0; i < 8; i++) { const w = R(i & 1 ? b.x1 : b.x0, i & 2 ? b.y1 : b.y0, i & 4 ? b.h : 0, piv); pts.push(Q(w[0], w[1], w[2] - sink)); }
  const V = [1, 1, TH / ZH], L = [0.3, 0.6, 1]; c.globalAlpha = alpha; c.lineJoin = 'round'; c.lineCap = 'round';
  // sombra de contacto en el suelo
  if (!sink) { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].forEach(([x, y]) => { const p = Q(x + 0.08, y + 0.08, 0); c.lineTo(p[0], p[1]); }); c.fill(); }
  let topF = null, topSh = 0;
  for (const [idx, n0] of FACES) { const n = R(n0[0], n0[1], n0[2], 0); const nn = a ? n : n0; if (nn[0] * V[0] + nn[1] * V[1] + nn[2] * V[2] <= 0.001) continue;
    const ln = Math.hypot(...L), dot = Math.max(0, (nn[0] * L[0] + nn[1] * L[1] + nn[2] * L[2]) / ln), sh = 0.45 + 0.6 * dot;
    c.fillStyle = `rgb(${Math.min(255, 242 * sh) | 0},${Math.min(255, 196 * sh) | 0},${Math.min(255, 72 * sh) | 0})`;
    c.beginPath(); idx.forEach((i) => c.lineTo(pts[i][0], pts[i][1])); c.closePath(); c.fill();
    if (sh > topSh) { topSh = sh; topF = idx; } }
  const hl = hull(pts);                                         // un solo contorno: la silueta
  c.lineWidth = 2.2; c.strokeStyle = OUT; c.beginPath(); hl.forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); c.stroke();
  if (topF) {                                                   // luz de borde y especular en la cara más iluminada
    const cx = topF.reduce((q, i) => q + pts[i][0], 0) / 4, cy = topF.reduce((q, i) => q + pts[i][1], 0) / 4;
    c.save(); c.beginPath(); topF.forEach((i) => c.lineTo(pts[i][0], pts[i][1])); c.closePath(); c.clip();
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2.4; c.beginPath(); topF.forEach((i) => c.lineTo(pts[i][0] + (cx - pts[i][0]) * 0.07, pts[i][1] + (cy - pts[i][1]) * 0.07)); c.closePath(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(cx - TW * 0.12, cy - TH * 0.16, TW * 0.16, TH * 0.15, -0.5, 0, 6.283); c.fill();
    c.restore(); }
  c.globalAlpha = 1; }
function after() { // se evalúa al terminar la animación de rodar
  if (!ok(st)) { fall = 0.01; k.sfx('hurt'); navigator.vibrate && navigator.vibrate(80); return; }
  k.burst(...P(st.x + (st.o === 1 ? 0.5 : 0), st.y + (st.o === 2 ? 0.5 : 0), 0), 'rgba(200,210,255,.8)', 5, 60);
  if (st.o === 0 && st.x === goal[0] && st.y === goal[1]) { st.won = true; score += level * (100 + Math.max(0, 200 - (moves - par) * 20)); fall = 0.01; k.sfx('coin'); } }
k.run((dt) => {
  t += dt; if (!k.gate(reset)) return; lastMove += dt;
  if (fall > 0) { fall += dt; if (fall > 0.9) { if (st.won) { level++; k.st = 'over'; k.sfx('win'); k.confetti(); k.show(moves <= par ? '¡Perfecto!' : '¡Dentro!', `${moves} movimientos (mínimo ${par}) · ${score} puntos<br>Toca para el nivel ${level}`); } else k.lose(CFG.id, score, 'El bloque cayó', `Nivel ${level}`); } return; }
  let d = ['up', 'down', 'left', 'right'].find((q) => k.hit.has(q));
  if (!d && k.ptr.up) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy, m = Math.max(Math.abs(dx), Math.abs(dy));
    if (m * k.scale > 24) d = Math.min(Math.abs(dx), Math.abs(dy)) > 0.3 * m ? (dx > 0 ? (dy > 0 ? 'right' : 'up') : (dy > 0 ? 'down' : 'left')) : k.swipe; }
  if (d) queue = d;
  if (anim) { anim.p += dt / 0.17; if (anim.p < 1) return; anim = null; after(); if (fall) return; }
  if (!queue) return; d = queue; queue = null;
  const from = st; st = roll(st, DD[d]); moves++; lastMove = 0; k.sfx('click'); anim = { from, d: DD[d], p: 0 };
}, () => {
  c.drawImage(board, 0, 0, 640, 480);
  // pistas de dirección al principio
  if (level === 1 && moves < 3 && !anim && !fall && k.st === 'play') { const b = boxOf(st), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; c.globalAlpha = 0.55 + 0.3 * Math.sin(t * 5);
    for (const [nm, [dx, dy]] of Object.entries(DD)) { const [a, bb] = Q(cx + dx * 1.3, cy + dy * 1.3, 0), [a0, b0] = Q(cx + dx * 0.8, cy + dy * 0.8, 0), an = Math.atan2(bb - b0, a - a0); c.save(); c.translate(a, bb); c.rotate(an); c.beginPath(); c.moveTo(8, 0); c.lineTo(-6, -7); c.lineTo(-6, 7); c.closePath(); ART.fillOut(c, '#7cf7a0', 2); c.restore(); } c.globalAlpha = 1; }
  const sink = fall > 0 ? fall * fall * (st.won ? 3.2 : 6) : 0;
  if (anim) drawBlock(anim.from, anim, 0, 1);
  else if (st.won && fall > 0) { const g0 = P(goal[0], goal[1], 0); c.save(); c.beginPath(); c.moveTo(g0[0] - TW * 0.4, g0[1]); c.lineTo(g0[0], g0[1] + TH * 0.4); c.lineTo(g0[0] + TW * 0.4, g0[1]); c.lineTo(g0[0] + TW * 0.4, -10); c.lineTo(g0[0] - TW * 0.4, -10); c.closePath(); c.clip(); drawBlock(st, null, sink, 1); c.restore();
    c.globalAlpha = Math.max(0, 1 - fall); c.fillStyle = '#f2d15c'; c.beginPath(); c.ellipse(g0[0], g0[1], TW * (0.3 + fall), TH * (0.3 + fall), 0, 0, 6.283); c.fill(); c.globalAlpha = 1; }
  else drawBlock(st, null, sink, fall > 0 ? Math.max(0, 1 - fall) : 1);
  label(`Nivel ${level}`, 14, 12, 24, '#f2d15c'); label(`${score}`, 626, 12, 24, '#fff', 'right');
  label(`Movimientos ${moves}`, 14, 44, 15, '#fff'); label(`Mínimo ${par}`, 626, 44, 15, '#b8b6e0', 'right');
});
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
