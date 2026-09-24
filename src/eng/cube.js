/* Cube Roller: rueda el bloque 1×1×2 hasta que caiga de pie en el agujero (niveles generados y comprobados por BFS).
 * El bloque se dibuja en 3D real (8 esquinas rotadas sobre la arista de apoyo) y el tablero se cachea por nivel. */
const k = Kit({ w: 640, h: 480, title: CFG.title, bg: '#101428' }), c = k.ctx, OUT = ART.OUT;
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
    while (q.length) { const s = q.shift(), d = seen.get(K(s)); if (s.o === 0 && d > fd && d >= 4 && (tries >= 300 || d <= HI)) { far = s; fd = d; } for (const dd of Object.values(DD)) { const n = roll(s, dd); if (ok(n) && !seen.has(K(n))) { seen.set(K(n), d + 1); q.push(n); } } }
    if (far && fd >= (tries < 300 ? LO : 4)) { st = start; goal = [far.x, far.y]; par = fd; break; }
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
function bake() { const D = Math.max(8, TH * 0.4);
  board = mk(640, 480, (g) => { g.drawImage(BGC, 0, 0, 640, 480);
    const list = [...tiles].map((s) => s.split(',').map(Number)).sort((a, b) => a[0] + a[1] - b[0] - b[1]);
    const dia = (x, y, z) => { const a = P(x, y, z); return [[a[0], a[1] - TH / 2], [a[0] + TW / 2, a[1]], [a[0], a[1] + TH / 2], [a[0] - TW / 2, a[1]]]; };
    const poly = (pts, col, lw) => { g.beginPath(); pts.forEach(([a, b]) => g.lineTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); } };
    // sombra del tablero
    g.fillStyle = 'rgba(0,0,0,.3)'; for (const [x, y] of list) { const d = dia(x, y, -D - 10); g.beginPath(); d.forEach(([a, b]) => g.lineTo(a + 6, b)); g.fill(); }
    for (const [x, y] of list) { const d = dia(x, y, 0), gl = x === goal[0] && y === goal[1];
      poly([d[3], d[2], [d[2][0], d[2][1] + D], [d[3][0], d[3][1] + D]], '#3a3f7a', 2); poly([d[2], d[1], [d[1][0], d[1][1] + D], [d[2][0], d[2][1] + D]], '#2a2e5e', 2);
      if (gl) { poly(d, '#1a1d3e', 2); const i = dia(x, y, 0).map(([a, b]) => [a + (P(x, y, 0)[0] - a) * 0.22, b + (P(x, y, 0)[1] - b) * 0.22]); poly(i, '#05060d'); poly([i[3], i[0], [i[0][0], i[0][1] + D * 0.8], [i[3][0], i[3][1] + D * 0.8]], '#11142e'); poly([i[0], i[1], [i[1][0], i[1][1] + D * 0.8], [i[0][0], i[0][1] + D * 0.8]], '#0b0d22'); g.save(); g.beginPath(); i.forEach(([a, b]) => g.lineTo(a, b)); g.clip(); g.fillStyle = '#05060d'; g.fillRect(0, i[0][1] + D * 0.8, 640, 400); g.restore(); g.strokeStyle = '#f2d15c'; g.lineWidth = 2; g.beginPath(); i.forEach(([a, b]) => g.lineTo(a, b)); g.closePath(); g.stroke(); }
      else { poly(d, (x + y) % 2 ? '#8b93d6' : '#7d86cc', 2); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(d[3][0] + 4, d[3][1]); g.lineTo(d[0][0], d[0][1] + 3); g.lineTo(d[1][0] - 4, d[1][1]); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.08)'; const m = d.map(([a, b]) => [a + (P(x, y, 0)[0] - a) * 0.35, b + (P(x, y, 0)[1] - b) * 0.35]); g.beginPath(); m.forEach(([a, b]) => g.lineTo(a, b)); g.fill(); }
      if (x === 1 && y === Math.floor(NY / 2)) { const a = P(x, y, 0); g.strokeStyle = 'rgba(124,247,160,.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(a[0], a[1], TW * 0.22, TH * 0.22, 0, 0, 6.283); g.stroke(); } }
  }); }
reset(); k.show(CFG.title, 'Desliza (en diagonal) o usa las flechas para rodar el bloque. Mételo de pie en el agujero dorado. ¡Si se sale de las baldosas, cae!');
/* ---------- Bloque 3D ---------- */
const FACES = [[[0, 2, 6, 4], [-1, 0, 0]], [[1, 5, 7, 3], [1, 0, 0]], [[0, 4, 5, 1], [0, -1, 0]], [[2, 3, 7, 6], [0, 1, 0]], [[0, 1, 3, 2], [0, 0, -1]], [[4, 6, 7, 5], [0, 0, 1]]];
function boxOf(s) { const cs = cellsOf(s), x0 = Math.min(...cs.map((q) => q[0])), y0 = Math.min(...cs.map((q) => q[1])), x1 = Math.max(...cs.map((q) => q[0])) + 1, y1 = Math.max(...cs.map((q) => q[1])) + 1; return { x0, y0, x1, y1, h: s.o === 0 ? 2 : 1 }; }
function drawBlock(s, a, sink, alpha) { const b = boxOf(s), pts = [], th = a ? a.p * Math.PI / 2 : 0, co = Math.cos(th), si = Math.sin(th);
  const R = (x, y, z, piv) => { if (!a) return [x, y, z]; const [dx, dy] = a.d; if (dx) { const u = x - piv; return dx > 0 ? [piv + u * co + z * si, y, -u * si + z * co] : [piv + u * co - z * si, y, u * si + z * co]; } const u = y - piv; return dy > 0 ? [x, piv + u * co + z * si, -u * si + z * co] : [x, piv + u * co - z * si, u * si + z * co]; };
  const piv = a ? (a.d[0] > 0 ? b.x1 : a.d[0] < 0 ? b.x0 : a.d[1] > 0 ? b.y1 : b.y0) : 0;
  for (let i = 0; i < 8; i++) { const w = R(i & 1 ? b.x1 : b.x0, i & 2 ? b.y1 : b.y0, i & 4 ? b.h : 0, piv); pts.push(Q(w[0], w[1], w[2] - sink)); }
  const V = [1, 1, TH / ZH], L = [0.3, 0.6, 1]; c.globalAlpha = alpha; c.lineJoin = 'round';
  // sombra en el suelo
  if (!sink) { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].forEach(([x, y]) => { const p = Q(x + 0.08, y + 0.08, 0); c.lineTo(p[0], p[1]); }); c.fill(); }
  for (const [idx, n0] of FACES) { const n = R(n0[0], n0[1], n0[2], 0); const nn = a ? n : n0; if (nn[0] * V[0] + nn[1] * V[1] + nn[2] * V[2] <= 0.001) continue;
    const ln = Math.hypot(...L), dot = Math.max(0, (nn[0] * L[0] + nn[1] * L[1] + nn[2] * L[2]) / ln), sh = 0.45 + 0.6 * dot;
    c.fillStyle = `rgb(${Math.min(255, 242 * sh) | 0},${Math.min(255, 196 * sh) | 0},${Math.min(255, 72 * sh) | 0})`; c.beginPath(); idx.forEach((i) => c.lineTo(pts[i][0], pts[i][1])); c.closePath(); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    const cx = idx.reduce((q, i) => q + pts[i][0], 0) / 4, cy = idx.reduce((q, i) => q + pts[i][1], 0) / 4; c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.beginPath(); idx.forEach((i) => c.lineTo(pts[i][0] + (cx - pts[i][0]) * 0.2, pts[i][1] + (cy - pts[i][1]) * 0.2)); c.closePath(); c.stroke(); }
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
