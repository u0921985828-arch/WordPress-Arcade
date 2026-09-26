/* Cocina cooperativa (1–4 jugadores en la misma cocina; no hay CPU: la carga de pedidos se ajusta al número de cocineros).
 * Modos (CFG.mode): 'cocina' (cortar, freír y emplatar) y 'pizza' (montar, hornear y apagar incendios con encimeras que se mueven).
 * Estaciones alrededor de la cocina: cajas de ingredientes, tablas de cortar, fuegos/hornos, platos, ventanilla y basura.
 * Cada pedido tiene su reloj: si caduca se pierde una estrella de reputación; con 0 estrellas se acaba el servicio.
 * Mando: joystick para moverse, A coger/soltar, B correr. En un jugador también se puede guiar arrastrando el dedo. */
/* ===== §8 «Ley de la pieza única» — utilería local (REMASTER.md §8) =====
 * unite8(): traza y contornea TODAS las partes y después las rellena en orden de profundidad, así
 * dentro de la silueta no sobrevive ningún contorno cerrado: solo el borde exterior. Las separaciones
 * internas se leen por sombra propia (seam8) o por cambio de color, nunca por stroke.
 * Todo lo repetido se hornea en sprites cacheados a Math.min(2, devicePixelRatio) para que el coste
 * por frame no suba (regla innegociable del brief). */
const P8OUT = ART.OUT, P8W = 1.5, P8IW = 0.7, P8IA = 0.62, P8T = 6.2832;
const _p8h = (s) => { s = String(s).replace('#', ''); if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _p8c = (a) => `rgb(${Math.max(0, Math.min(255, a[0] | 0))},${Math.max(0, Math.min(255, a[1] | 0))},${Math.max(0, Math.min(255, a[2] | 0))})`;
const LT8 = (col, f) => (String(col)[0] === '#' ? _p8c(_p8h(col).map((v) => v + (255 - v) * f)) : col);
const DK8 = (col, f) => (String(col)[0] === '#' ? _p8c(_p8h(col).map((v) => v * (1 - f))) : col);
const AL8 = (col, a) => { const q = _p8h(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
const CV8 = (w, h) => { const q = document.createElement('canvas'); q.width = Math.max(1, Math.ceil(w)); q.height = Math.max(1, Math.ceil(h)); return q; };
/* como ART.rr pero SIN beginPath: imprescindible para componer subtrayectorias de una misma pieza */
function rr8(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const DPR8 = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
/* recorte contra la propia forma. Nunca `source-atop` en el lienzo vivo: obliga a un compuesto de
 * pantalla completa (medido 11–18 ms/frame). Aquí basta el clip. */
function clip8(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* cel de 3 planos con borde DURO: sombra, base desplazada hacia la luz (arriba-izquierda) y luz */
function cel8(g, path, base, o) {
  o = o || {}; const dx = o.dx == null ? 2.2 : o.dx, dy = o.dy == null ? 2 : o.dy, f = o.f == null ? 1 : o.f, B = o.b || 260;
  g.save(); g.beginPath(); path(g); g.clip();
  g.fillStyle = DK8(base, 0.22 * f); g.fillRect(-B, -B, B * 2, B * 2);
  g.save(); g.translate(-dx, -dy); g.beginPath(); path(g); g.fillStyle = base; g.fill(); g.restore();
  if (o.hi !== false) { g.save(); g.translate(-dx * 2.1, -dy * 2.1); g.beginPath(); path(g); g.fillStyle = LT8(base, 0.2 * f); g.fill(); g.restore(); }
  g.restore();
}
/* EL MECANISMO: parts = [[trazado, color, celOpts|0, detalle(g)|0]] en orden de profundidad */
function unite8(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = P8OUT; g.lineWidth = (ow || P8W) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) {
    const P = parts[i];
    g.beginPath(); P[0](g); g.fillStyle = P[1]; g.fill();
    if (P[2]) cel8(g, P[0], P[1], P[2] === true ? null : P[2]);
    if (P[3]) clip8(g, P[0], P[3]);
  }
}
/* separación interna por sombra propia (~16 % más oscuro), nunca por contorno */
function seam8(g, path, base, fn, f) { clip8(g, path, (q) => { q.fillStyle = DK8(base, f == null ? 0.16 : f); fn(q); }); }
/* línea interior fina: detalle, jamás un contorno cerrado */
function ink8(g, w, a) { g.lineWidth = w == null ? P8IW : w; g.strokeStyle = AL8(P8OUT, a == null ? P8IA : a); }
/* óvalo especular (un toque por pieza) */
function shine8(g, x, y, rx, ry, rot, a) { g.fillStyle = `rgba(255,255,255,${a == null ? 0.34 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, P8T); g.fill(); }
/* sombra de contacto dura bajo la pieza */
function drop8(g, x, y, rx, ry, a) { g.fillStyle = `rgba(26,21,48,${a == null ? 0.26 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, P8T); g.fill(); }
/* caché de sprites; el origen del dibujo es (ox,oy) dentro del lienzo de w×h */
const SPR8 = {};
function spr8(key, w, h, ox, oy, fn, sc) {
  let q = SPR8[key]; if (q) return q;
  const s = (sc || 1) * DPR8; q = SPR8[key] = CV8(w * s, h * s); const g = q.getContext('2d');
  g.scale(s, s); g.translate(ox, oy); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g);
  q.iw = w; q.ih = h; q.ox = ox; q.oy = oy; return q;
}
function blit8(ctx, q, x, y, sc, al) {
  sc = sc || 1; if (al != null) ctx.globalAlpha = al;
  ctx.drawImage(q, x - q.ox * sc, y - q.oy * sc, q.iw * sc, q.ih * sc);
  if (al != null) ctx.globalAlpha = 1;
}
/* manopla grande con pulgar marcado, en una sola forma */
function mitt8(x, y, a, r, s) {
  const tx = x + Math.cos(a - s * 1.25) * r * 0.85, ty = y + Math.sin(a - s * 1.25) * r * 0.85;
  return (g) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, P8T); g.moveTo(tx + r * 0.46, ty); g.arc(tx, ty, r * 0.46, 0, P8T); };
}
/* hueso de ancho variable: la raíz queda abierta y enterrada en el tronco → tangente continua */
function bone8(pts, ws) {
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
    g.lineTo(R[0][0], R[0][1]); g.closePath();
  };
}
/* La cara manda: ojos grandes con PÁRPADO SUPERIOR RECTO (lo que da expresión) y cejas gruesas */
function eyes8(g, cx, cy, sep, r, o) {
  o = o || {}; const ry = r * (o.sq || 1), lid = o.lid == null ? 0.24 : o.lid, lx = o.lx || 0, ly = o.ly || 0;
  for (const s of [-1, 1]) {
    g.save(); g.translate(cx + s * sep, cy);
    if (o.shut) { g.beginPath(); g.moveTo(-r, -ry * 0.1); g.quadraticCurveTo(0, ry * 0.7, r, -ry * 0.1); g.lineWidth = Math.max(0.9, r * 0.3); g.strokeStyle = AL8(P8OUT, 0.9); g.stroke(); g.restore(); continue; }
    g.beginPath(); g.ellipse(0, 0, r, ry, 0, 0, P8T); g.fillStyle = o.white || '#fff'; g.fill();
    const ix = lx * r * 0.34, iy = ly * ry * 0.3 + ry * 0.06;
    g.beginPath(); g.arc(ix, iy, r * 0.6, 0, P8T); g.fillStyle = o.iris || '#3a5bb8'; g.fill();
    g.beginPath(); g.arc(ix, iy, r * 0.31, 0, P8T); g.fillStyle = P8OUT; g.fill();
    g.beginPath(); g.arc(ix - r * 0.3, iy - r * 0.34, r * 0.22, 0, P8T); g.fillStyle = '#fff'; g.fill();
    g.rotate(s * (o.tilt || 0));
    g.beginPath(); g.ellipse(0, 0, r * 1.05, ry * 1.05, 0, 0, P8T); g.clip();
    const y0 = -ry + ry * 2 * lid;
    g.fillStyle = o.lidCol || '#ffd3ad'; g.fillRect(-r * 1.3, -ry * 1.6, r * 2.6, y0 + ry * 1.6);
    g.fillStyle = AL8(P8OUT, 0.92); g.fillRect(-r * 1.3, y0 - r * 0.18, r * 2.6, r * 0.2);
    g.restore();
  }
}
/* cejas gruesas (trazo con cuerpo). tilt>0 = enfadado */
function brow8(g, cx, cy, sep, len, tilt, col, th) {
  th = th || 1.5; g.fillStyle = col || P8OUT;
  for (const s of [-1, 1]) { g.beginPath(); bone8([[cx + s * (sep - len * 0.45), cy + tilt], [cx + s * (sep + len * 0.55), cy - tilt * 0.85]], [th, th * 0.5])(g); g.fill(); }
}
/* boca grande y simple. m: 0 sonrisa · 1 abierta · 2 mueca · 3 recta · 4 «o» */
function mouth8(g, x, y, w, m, col) {
  if (m === 1 || m === 4) { g.beginPath(); g.ellipse(x, y + w * 0.14, w * (m === 4 ? 0.5 : 0.7), w * (m === 4 ? 0.6 : 0.76), 0, 0, P8T); g.fillStyle = col || '#5e2436'; g.fill(); return; }
  g.beginPath(); g.lineCap = 'round'; g.lineWidth = Math.max(1, w * 0.26); g.strokeStyle = col || AL8(P8OUT, 0.9);
  if (m === 3) { g.moveTo(x - w * 0.5, y); g.lineTo(x + w * 0.5, y); }
  else if (m === 2) { g.moveTo(x - w * 0.5, y + w * 0.2); g.quadraticCurveTo(x, y - w * 0.3, x + w * 0.5, y + w * 0.2); }
  else { g.moveTo(x - w * 0.55, y - w * 0.1); g.quadraticCurveTo(x, y + w * 0.55, x + w * 0.55, y - w * 0.1); }
  g.stroke();
}
const M = CFG.mode || 'cocina', PIZZA = M === 'pizza';
const OUT = ART.OUT, TAU = Math.PI * 2, lite = ART.lite, dark = ART.dark, alpha = ART.alpha, rr = ART.rr, fillOut = ART.fillOut;
const PORT = innerHeight > innerWidth * 1.05;
const W = PORT ? 480 : 820, H = PORT ? 760 : 480, TOP = PORT ? 108 : 96;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#150f2c' }), c = k.ctx;
const DAY = PIZZA ? 165 : 180; /* duración del servicio */
const clamp = k.clamp, hyp = Math.hypot, lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

/* ---------------------------------------------------------------- ingredientes y recetas */
const ING = {
  lechuga: { c: '#8fd14a', n: 'Lechuga', cut: 1, sh: 'leaf' },
  tomate: { c: '#ff5a5f', n: 'Tomate', cut: 1, sh: 'round' },
  carne: { c: '#b5653a', n: 'Carne', cook: 1, sh: 'patty' },
  pan: { c: '#ffc94d', n: 'Pan', sh: 'bun' },
  queso: { c: '#ffd84d', n: 'Queso', cut: 1, sh: 'wedge' },
  patata: { c: '#e8c98a', n: 'Patata', cut: 1, cook: 1, sh: 'round' },
  masa: { c: '#f2dfae', n: 'Masa', sh: 'round' },
  jamon: { c: '#ff8fb0', n: 'Jamón', cut: 1, sh: 'wedge' },
  champi: { c: '#cbb9a0', n: 'Champiñón', cut: 1, sh: 'mush' },
  aceituna: { c: '#6d7a3a', n: 'Aceituna', cut: 1, sh: 'round' },
};
/* it: [ingrediente, estado] con estado 0 crudo, 1 cortado, 2 hecho. after: segundo en que entra en la carta. */
const REC = PIZZA ? [
  { n: 'Margarita', it: [['masa', 0], ['tomate', 1], ['queso', 1]], p: 26, after: 0 },
  { n: 'De jamón', it: [['masa', 0], ['tomate', 1], ['jamon', 1]], p: 28, after: 0 },
  { n: 'Cuatro quesos', it: [['masa', 0], ['queso', 1], ['queso', 1]], p: 30, after: 30 },
  { n: 'Champiñones', it: [['masa', 0], ['tomate', 1], ['champi', 1]], p: 32, after: 45 },
  { n: 'Especial', it: [['masa', 0], ['tomate', 1], ['queso', 1], ['jamon', 1]], p: 44, after: 70 },
  { n: 'Del chef', it: [['masa', 0], ['tomate', 1], ['champi', 1], ['jamon', 1]], p: 48, after: 95 },
] : [
  { n: 'Ensalada', it: [['lechuga', 1], ['tomate', 1]], p: 22, after: 0 },
  { n: 'Hamburguesa', it: [['pan', 0], ['carne', 2]], p: 26, after: 0 },
  { n: 'Patatas fritas', it: [['patata', 2]], p: 20, after: 20 },
  { n: 'Con queso', it: [['pan', 0], ['carne', 2], ['queso', 1]], p: 36, after: 45 },
  { n: 'Bocadillo', it: [['pan', 0], ['queso', 1], ['lechuga', 1]], p: 34, after: 60 },
  { n: 'Plato combinado', it: [['pan', 0], ['carne', 2], ['patata', 2]], p: 46, after: 90 },
];
const CRATES = PIZZA ? ['masa', 'tomate', 'queso', 'jamon', 'champi'] : ['lechuga', 'tomate', 'carne', 'pan', 'queso', 'patata'];
const CUT_T = 2.1, COOK_T = 5.6, BURN_T = 6.2, BAKE_T = 7.4, FIRE_T = 6.5, PANIC = 11;

/* ---------------------------------------------------------------- cocina y estaciones */
const KX = 10, KY = TOP + 4, KW = W - 20, KH = H - KY - (PORT ? 66 : 62), S = PORT ? 62 : 60;
const COLS = Math.floor(KW / S), ROWS = Math.floor(KH / S);
const GX = Math.round(KX + (KW - COLS * S) / 2), GY = Math.round(KY + (KH - ROWS * S) / 2);
let ST = [], chefs = [], orders = [], t, money, tips, rep, served, lostO, combo, nextO, oid, alertT, alertC, ended;

function ring() { /* celdas del borde, en el sentido de las agujas del reloj desde arriba a la izquierda */
  const out = [];
  for (let x = 0; x < COLS; x++) out.push([x, 0]);
  for (let y = 1; y < ROWS; y++) out.push([COLS - 1, y]);
  for (let x = COLS - 2; x >= 0; x--) out.push([x, ROWS - 1]);
  for (let y = ROWS - 2; y > 0; y--) out.push([0, y]);
  return out;
}
function build() {
  ST = [];
  const R = ring(), spec = [];
  for (const g of CRATES) spec.push({ t: 'crate', ing: g });
  spec.push({ t: 'fuego' }, { t: 'plates' }, { t: 'serve' }, { t: 'board' }, { t: 'fuego' }, { t: 'bin' });
  if (PIZZA) spec.push({ t: 'ext' }); else spec.push({ t: 'board' });
  /* se reparten por el perímetro: caja, estación, caja, estación… para que nadie quede en una esquina muerta */
  const order = [];
  const cr = spec.filter((s) => s.t === 'crate'), ot = spec.filter((s) => s.t !== 'crate');
  while (cr.length || ot.length) { if (cr.length) order.push(cr.shift()); if (ot.length) order.push(ot.shift()); }
  /* nunca en las esquinas: solo se llega a ellas en diagonal */
  const corner = ([x, y]) => (x === 0 || x === COLS - 1) && (y === 0 || y === ROWS - 1);
  const cand = R.map((cc, i) => i).filter((i) => !corner(R[i]));
  const step = cand.length / order.length;
  const used = {};
  order.forEach((sp, i) => { used[cand[Math.round(i * step) % cand.length]] = sp; });
  R.forEach(([x, y], i) => {
    const sp = used[i] || { t: 'counter' };
    ST.push({ t: sp.t, ing: sp.ing, gx: x, gy: y, x: GX + x * S, y: GY + y * S, w: S, h: S, item: null, prog: 0, cook: 0, fire: 0, panic: 0, mv: 0, x0: GX + x * S });
  });
  /* isla central: encimeras sueltas con pasillos; en la pizzería se mueven de lado a lado */
  const my = Math.floor(ROWS / 2);
  for (let x = 2; x <= COLS - 3; x += 2) {
    const s = { t: 'counter', gx: x, gy: my, x: GX + x * S, y: GY + my * S, w: S, h: S, item: null, prog: 0, cook: 0, fire: 0, panic: 0, mv: PIZZA ? S * 0.7 : 0, x0: GX + x * S, ph: x * 0.9 };
    ST.push(s);
  }
}
const isFuego = (s) => s.t === 'fuego';
function accepts(s, it) {
  if (!it) return false;
  if (s.t === 'board') return !it.plate && !it.ext && !it.bad && ING[it.kind].cut && it.st === 0;
  if (isFuego(s)) {
    if (PIZZA) return !!it.plate && it.on.length >= 2 && !it.baked;
    return !it.plate && !it.ext && !it.bad && ING[it.kind].cook && (ING[it.kind].cut ? it.st === 1 : it.st === 0);
  }
  return false;
}
const newPlate = () => ({ plate: 1, on: [], baked: 0 });

/* ---------------------------------------------------------------- pedidos */
const nAct = () => Math.max(1, chefs.length);
function recPool() { const p = REC.filter((r) => t >= r.after); return p.length ? p : [REC[0]]; }
function maxOrders() { return 2 + nAct(); }
function patience() { return lerp(42, 26, t / DAY) * (nAct() === 1 ? 1.15 : 1); }
function interval() {
  const base = PIZZA ? 7.6 : 8.2, d = t / DAY;
  return base * lerp(1.45, 0.95, d) / (0.6 + 0.4 * nAct());
}
function addOrder() {
  if (orders.length >= maxOrders()) { nextO = 2.5; return; }
  const r = k.pick(recPool()), pat = patience();
  orders.push({ id: ++oid, r, t: pat, max: pat, pop: 0 });
  k.sfx('pop');
}
const key = (a) => a.map((x) => x[0] + ':' + x[1]).sort().join('|');
function serve(ch, pl) {
  if (PIZZA && !pl.baked) { warn('Falta hornearla'); return; }
  const kk = key(pl.on.map((o) => [o.kind, o.st]));
  const i = orders.findIndex((o) => key(o.r.it) === kk);
  if (i < 0) { warn('Nadie ha pedido eso'); k.sfx('hurt'); return; }
  const o = orders[i], frac = o.t / o.max, tip = frac > 0.55 ? Math.round(o.r.p * 0.3) : frac > 0.3 ? Math.round(o.r.p * 0.12) : 0;
  combo = Math.min(9, combo + 1);
  const gain = o.r.p + tip + (combo - 1) * 2;
  money += gain; tips += tip; served++; ch.served++;
  orders.splice(i, 1);
  k.sfx('coin'); k.float('+' + gain + ' €', ch.x, ch.y - 34, '#a8cf3f'); k.burst(ch.x, ch.y - 20, '#ffc94d', 12, 180);
  if (combo >= 3) k.float('x' + combo, ch.x, ch.y - 56, '#ffc94d');
  ch.hold = newPlate();
}
function warn(s) { alertT = 1.6; alertC = s; }
function loseRep(s) {
  rep--; combo = 0; lostO++; warn(s); k.sfx('hurt'); k.shake(6); k.flash('rgba(255,80,110,.3)');
  if (rep <= 0) { rep = 0; ended = 1; k.lose(CFG.id, money, PIZZA ? 'Cerraron la pizzería' : 'Os echaron de la cocina', `${served} platos servidos · ${Math.floor(t)} s`); }
}

/* ---------------------------------------------------------------- cocineros */
const HAT = ['#ffffff', '#ffe9b3', '#d8e7ff', '#ffd9ec'];
function makeChefs() {
  const pl = k.party ? k.party.map((q) => q.p) : [0];
  const old = {}; for (const ch of chefs) old[ch.p] = ch;
  chefs = pl.map((p, i) => {
    const o = old[p];
    if (o) return o;
    return { p, x: GX + S * (1.5 + (i % 3)), y: GY + S * (ROWS - 2.5), vx: 0, vy: 0, fx: 0, fy: 1, hold: null, dash: 0, cd: 0, served: 0, bob: 0, col: k.pcol(p) };
  });
  for (const ch of chefs) ch.col = k.pcol(ch.p);
}
k.onParty = () => makeChefs(); /* se ajusta la plantilla aunque aún no haya empezado la partida */

function reset() {
  t = 0; money = 0; tips = 0; rep = 3; served = 0; lostO = 0; combo = 0; nextO = 6; oid = 0; orders = []; alertT = 0; alertC = ''; ended = 0;
  build(); chefs = []; makeChefs();
}

/* ---------------------------------------------------------------- lógica */
function stAt(ch) { /* la estación que tiene delante (o la más cercana al alcance) */
  const px = ch.x + ch.fx * 26, py = ch.y + ch.fy * 26;
  let best = null, bd = 1e9;
  for (const s of ST) {
    const cx = clamp(px, s.x, s.x + s.w), cy = clamp(py, s.y, s.y + s.h), d = hyp(px - cx, py - cy);
    if (d < bd) { bd = d; best = s; }
  }
  return bd < 24 ? best : null;
}
function interact(ch) {
  const s = stAt(ch); if (!s) return;
  const it = ch.hold;
  if (s.fire > 0) { warn('¡Está ardiendo!'); return; }
  if (s.t === 'crate') { if (!it) { ch.hold = { kind: s.ing, st: 0 }; k.sfx('click'); } else if (it.plate) add(ch, it, { kind: s.ing, st: 0 }); return; }
  if (s.t === 'plates') { if (!it) { ch.hold = newPlate(); k.sfx('click'); } return; }
  if (s.t === 'ext') { if (!it) { ch.hold = { ext: 1 }; k.sfx('click'); } return; }
  if (s.t === 'bin') { if (it) { ch.hold = it.plate ? newPlate() : null; k.sfx('pop'); } return; }
  if (s.t === 'serve') { if (it && it.plate && it.on.length) serve(ch, it); else if (it && it.plate) warn('El plato está vacío'); return; }
  if (s.t === 'board' || isFuego(s)) {
    if (!s.item && accepts(s, it)) { s.item = it; ch.hold = null; s.prog = 0; s.cook = 0; k.sfx('click'); return; }
    if (s.item && !it) { ch.hold = s.item; s.item = null; s.prog = 0; s.cook = 0; k.sfx('click'); return; }
    if (s.item && it && it.plate && !s.item.plate && ready(s)) { add(ch, it, s.item); s.item = null; s.prog = 0; s.cook = 0; return; }
    if (s.item && it) warn(isFuego(s) ? (PIZZA ? 'El horno está ocupado' : 'El fuego está ocupado') : 'La tabla está ocupada');
    else if (!s.item && it) warn(s.t === 'board' ? 'Eso no se corta' : PIZZA ? 'Al horno va la pizza montada' : 'Eso no se fríe');
    return;
  }
  /* encimera */
  if (!s.item && it) { s.item = it; ch.hold = null; k.sfx('click'); return; }
  if (s.item && !it) { ch.hold = s.item; s.item = null; k.sfx('click'); return; }
  if (s.item && it) {
    if (it.plate && !s.item.plate) { add(ch, it, s.item); s.item = null; return; }
    if (!it.plate && s.item.plate) { if (add(ch, s.item, it)) ch.hold = null; return; }
    warn('Ahí no cabe');
  }
}
const ready = (s) => { /* lo que hay en la estación ya está listo para emplatar */
  if (!s.item || s.item.plate) return false;
  if (s.t === 'board') return s.item.st >= 1;
  if (isFuego(s)) return s.item.st >= 2;
  return true;
};
function add(ch, plate, it) {
  if (it.bad) { warn('Eso está quemado'); return false; }
  if (it.ext || it.plate) { warn('Ahí no cabe'); return false; }
  if (plate.on.length >= 4) { warn('El plato está lleno'); return false; }
  if (ING[it.kind].cut && it.st === 0) { warn(ING[it.kind].n + ' sin cortar'); return false; }
  if (ING[it.kind].cook && it.st < 2) { warn(ING[it.kind].n + ' sin hacer'); return false; }
  plate.on.push({ kind: it.kind, st: it.st }); k.sfx('pop');
  if (ch.hold === it) ch.hold = null;
  return true;
}

function update(dt) {
  alertT -= dt;
  for (const o of orders) o.pop = Math.max(0, o.pop - dt * 2);
  if (!k.gate(reset)) return;
  if (ended) return;
  t += dt;
  /* estaciones */
  for (const s of ST) {
    if (s.mv) { s.ph += dt * 0.55; s.x = s.x0 + Math.sin(s.ph) * s.mv; }
    if (s.t === 'board' && s.item && s.item.st === 0) {
      const near = chefs.some((ch) => hyp(ch.x - (s.x + s.w / 2), ch.y - (s.y + s.h / 2)) < S * 1.15);
      if (near) { s.prog += dt / CUT_T; if (s.prog >= 1) { s.item.st = 1; s.prog = 0; k.sfx('hit'); k.burst(s.x + s.w / 2, s.y + 10, '#fff', 6, 100); } }
    }
    if (isFuego(s) && s.item && s.fire <= 0) {
      s.cook += dt;
      if (PIZZA) {
        if (!s.item.baked && s.cook >= BAKE_T) { s.item.baked = 1; k.sfx('win'); }
        else if (s.item.baked && s.cook >= BAKE_T + FIRE_T) { s.fire = 1; s.item = null; s.cook = 0; k.sfx('explode'); k.shake(5); }
      } else {
        if (s.item.st < 2 && s.cook >= COOK_T) { s.item.st = 2; k.sfx('coin'); }
        else if (s.item.st === 2 && s.cook >= COOK_T + BURN_T) { s.item = { bad: 1 }; k.sfx('hurt'); }
      }
    }
    if (s.fire > 0) {
      const ap = chefs.some((ch) => ch.hold && ch.hold.ext && hyp(ch.x - (s.x + s.w / 2), ch.y - (s.y + s.h / 2)) < S * 1.2);
      if (ap) { s.fire -= dt / 1.5; if (s.fire <= 0) { s.fire = 0; s.panic = 0; k.sfx('win'); k.float('¡Apagado!', s.x + s.w / 2, s.y, '#5b8cff'); } }
      else { s.panic += dt; if (s.panic >= PANIC) { s.panic = 0; s.fire = 0; loseRep('El fuego estropeó el horno'); } }
    }
  }
  /* cocineros */
  for (const ch of chefs) {
    let dx = 0, dy = 0;
    const d = k.pdir(ch.p); dx = d.x; dy = d.y;
    if (ch.p === 0 && !k.party && k.ptr.down) {
      const L = hyp(k.ptr.x - ch.x, k.ptr.y - ch.y);
      if (L > 16) { dx = (k.ptr.x - ch.x) / L; dy = (k.ptr.y - ch.y) / L; }
    }
    const L = hyp(dx, dy); if (L > 1) { dx /= L; dy /= L; }
    if (ch.cd > 0) ch.cd -= dt;
    if ((k.phit(ch.p, 'b') || false) && ch.cd <= 0 && L > 0.1) { ch.dash = 0.32; ch.cd = 2.2; k.sfx('jump'); }
    if (ch.dash > 0) ch.dash -= dt;
    const sp = (PORT ? 172 : 182) * (ch.dash > 0 ? 1.7 : 1);
    ch.vx = dx * sp; ch.vy = dy * sp;
    if (L > 0.1) { ch.fx = dx; ch.fy = dy; ch.bob += dt * 9; }
    move(ch, dt);
    if (k.phit(ch.p, 'a') || (ch.p === 0 && !k.party && k.tap)) interact(ch);
  }
  /* pedidos */
  nextO -= dt;
  if (nextO <= 0) { addOrder(); nextO = interval(); }
  for (let i = orders.length - 1; i >= 0; i--) {
    const o = orders[i]; o.t -= dt;
    if (o.t <= 0) { orders.splice(i, 1); loseRep('Se fue un cliente'); if (ended) return; }
  }
  if (t >= DAY) {
    ended = 1; k.st = 'over'; k.sfx('win'); k.confetti();
    const parts = chefs.length > 1 ? ' · ' + chefs.map((ch) => `J${ch.p + 1}: ${ch.served}`).join(' ') : '';
    k.end(CFG.id, money, '¡Servicio terminado!', `${served} platos · ${tips} € de propinas${parts}`);
  }
}
function move(ch, dt) {
  const R = 17;
  ch.x = clamp(ch.x + ch.vx * dt, GX + R, GX + COLS * S - R);
  ch.y = clamp(ch.y + ch.vy * dt, GY + R, GY + ROWS * S - R);
  for (const s of ST) {
    const cx = clamp(ch.x, s.x, s.x + s.w), cy = clamp(ch.y, s.y, s.y + s.h), dx = ch.x - cx, dy = ch.y - cy, d = hyp(dx, dy);
    if (d < R) {
      if (d > 0.01) { ch.x = cx + dx / d * R; ch.y = cy + dy / d * R; }
      else { /* dentro del rectángulo: sale por el lado más cercano */
        const l = ch.x - s.x, r = s.x + s.w - ch.x, u = ch.y - s.y, b = s.y + s.h - ch.y, m = Math.min(l, r, u, b);
        if (m === l) ch.x = s.x - R; else if (m === r) ch.x = s.x + s.w + R; else if (m === u) ch.y = s.y - R; else ch.y = s.y + s.h + R;
      }
    }
  }
  for (const o of chefs) if (o !== ch) { const dx = ch.x - o.x, dy = ch.y - o.y, d = hyp(dx, dy); if (d < 30 && d > 0.01) { ch.x += dx / d * (30 - d) * 0.5; ch.y += dy / d * (30 - d) * 0.5; } }
}

/* ---------------------------------------------------------------- dibujo */
function mk(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const q = cv.getContext('2d'); q.scale(2, 2); q.lineJoin = 'round'; if (fn) fn(q); return cv; }
function label(s, x, y, size, col, align, q) {
  q = q || c; q.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; q.textAlign = align || 'center'; q.textBaseline = 'middle';
  q.lineJoin = 'round'; q.lineWidth = size / 4 + 2; q.strokeStyle = OUT; q.strokeText(s, x, y); q.fillStyle = col || '#fff'; q.fillText(s, x, y);
}
function plain(s, x, y, size, col, align, q) { /* sin contorno: para texto oscuro sobre fondo claro */
  q = q || c; q.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; q.textAlign = align || 'center'; q.textBaseline = 'middle';
  q.fillStyle = col; q.fillText(s, x, y);
}
const FLOOR = mk(W, H, (g) => {
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#221a44'); gr.addColorStop(1, '#130e28'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* baldosas en damero dentro de la cocina */
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    g.fillStyle = (x + y) % 2 ? '#2e2657' : '#332c60'; g.fillRect(GX + x * S, GY + y * S, S, S);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; g.strokeRect(GX + x * S + 0.5, GY + y * S + 0.5, S - 1, S - 1);
  }
  g.strokeStyle = OUT; g.lineWidth = 5; g.strokeRect(GX - 2, GY - 2, COLS * S + 4, ROWS * S + 4);
  g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(GX, GY, COLS * S, Math.min(40, ROWS * S));
});
/* §8: cada ingrediente es UNA silueta (los trozos cortados se funden en una sola forma, el champiñón
 * no lleva contorno entre pie y sombrero). Todo horneado por (tipo, estado, radio). */
function ingShape(g, x, y, r, kind, st) {
  const I = ING[kind], col = st >= 2 ? dark(I.c, 0.3) : I.c;
  g.save(); g.translate(x, y);
  if (st === 1) { /* cortado: tres trozos, una sola silueta */
    const pc = (i) => (q) => { const a = -0.6 + i * 0.6; q.moveTo(Math.cos(a) * r * 0.5 + r * 0.42, Math.sin(a) * r * 0.45); q.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.45, r * 0.42, r * 0.3, a, 0, TAU); };
    unite8(g, [[pc(0), col], [pc(2), col], [pc(1), lite(col, 0.16), { dx: 1.2, dy: 1.2 }]], 1.4);
  } else if (I.sh === 'bun') {
    const b = (q) => { q.moveTo(-r, 0); q.arc(0, 0, r, Math.PI, 0); q.lineTo(r, r * 0.45); q.lineTo(-r, r * 0.45); q.closePath(); };
    unite8(g, [[b, col, { dx: 1.6, dy: 1.6 }]], 1.4);
    g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = -1; i < 2; i++) { g.beginPath(); g.arc(i * r * 0.45, -r * 0.35, 1.4, 0, TAU); g.fill(); }
  } else if (I.sh === 'patty') {
    unite8(g, [[(q) => { q.moveTo(r, 0); q.ellipse(0, 0, r, r * 0.62, 0, 0, TAU); }, col, { dx: 1.4, dy: 1.4 }]], 1.4);
    if (st >= 2) { g.strokeStyle = lite(col, 0.4); g.lineWidth = 1.6; for (let i = -1; i < 2; i++) { g.beginPath(); g.moveTo(-r * 0.5, i * 4); g.lineTo(r * 0.5, i * 4); g.stroke(); } }
  } else if (I.sh === 'wedge') {
    unite8(g, [[(q) => { q.moveTo(-r, r * 0.6); q.lineTo(r, r * 0.6); q.lineTo(0, -r * 0.7); q.closePath(); }, col, { dx: 1.6, dy: 1.6 }]], 1.4);
  } else if (I.sh === 'leaf') {
    unite8(g, [[(q) => { q.moveTo(r, 0); q.ellipse(0, 0, r, r * 0.78, 0.3, 0, TAU); }, col, { dx: 1.4, dy: 1.4 }]], 1.4);
    g.strokeStyle = dark(col, 0.35); g.lineWidth = 1.4; g.beginPath(); g.moveTo(-r * 0.6, r * 0.3); g.lineTo(r * 0.6, -r * 0.3); g.stroke();
  } else if (I.sh === 'mush') {
    const stem = (q) => rr8(q, -r * 0.28, -r * 0.1, r * 0.56, r * 0.8, 3), cap = (q) => { q.moveTo(-r * 0.85, -r * 0.1); q.arc(0, -r * 0.1, r * 0.85, Math.PI, 0); q.closePath(); };
    unite8(g, [[stem, '#efe4d0'], [cap, col, { dx: 1.4, dy: 1.2 }]], 1.4);
  } else {
    unite8(g, [[(q) => { q.moveTo(r * 0.9, 0); q.arc(0, 0, r * 0.9, 0, TAU); }, col, { dx: 1.6, dy: 1.6 }]], 1.4);
    shine8(g, -r * 0.3, -r * 0.35, r * 0.24, r * 0.16, -0.6, 0.42);
  }
  g.restore();
}
/* sprite por (tipo, estado, radio): los radios en juego son pocos (15, 11, 6…) */
function ingSpr(kind, st, r) {
  const q = Math.round(r * 2) / 2, z = q * 1.5 + 8;
  return spr8(`ing_${kind}_${st}_${q}`, z * 2, z * 2, z, z, (g) => ingShape(g, 0, 0, q, kind, st), 3);
}
const ing8 = (g, x, y, r, kind, st) => blit8(g, ingSpr(kind, st, r), x, y);
function drawItem(g, x, y, it, s) {
  s = s || 1;
  if (it.bad) { g.beginPath(); g.arc(x, y, 11 * s, 0, TAU); fillOut(g, '#3a3350', 2.4); g.fillStyle = '#6a6285'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x - 5 + i * 5, y - 2 - (i % 2) * 4, 2.6, 0, TAU); g.fill(); } return; }
  if (it.ext) { unite8(g, [[(q) => rr8(q, x - 3 * s, y - 15 * s, 6 * s, 5 * s, 2), '#c9ccd6'], [(q) => rr8(q, x - 6 * s, y - 11 * s, 12 * s, 20 * s, 4 * s), '#e8404f', { dx: 1.6, dy: 1.6 }, (q) => { q.fillStyle = '#ffd9a0'; q.fillRect(x - 4 * s, y - 4 * s, 8 * s, 3 * s); }]], 1.5); return; }
  if (it.plate) {
    if (PIZZA) {
      /* §8: corteza, salsa y tropiezos son una sola silueta; dentro solo hay cambio de color */
      const parts = [[(q) => { q.moveTo(x + 15 * s, y); q.arc(x, y, 15 * s, 0, TAU); }, it.baked ? '#e8b25e' : '#f2dfae', { dx: 1.6, dy: 1.6 }]];
      if (it.baked) parts.push([(q) => { q.moveTo(x + 11.5 * s, y); q.arc(x, y, 11.5 * s, 0, TAU); }, '#d9803f']);
      it.on.forEach((o, i) => { if (o.kind === 'masa') return; const a = i * 1.7, R = 6.5 * s; parts.push([(q) => { q.moveTo(x + Math.cos(a) * R + 3.4 * s, y + Math.sin(a) * R); q.arc(x + Math.cos(a) * R, y + Math.sin(a) * R, 3.4 * s, 0, TAU); }, ING[o.kind].c]); });
      unite8(g, parts, 1.5);
      if (!it.on.length) { g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(x, y, 6 * s, 0, TAU); g.fill(); }
      return;
    }
    g.beginPath(); g.ellipse(x, y + 2 * s, 16 * s, 9 * s, 0, 0, TAU); fillOut(g, '#eef1f7', 2.6);
    g.beginPath(); g.ellipse(x, y + 2 * s, 11 * s, 6 * s, 0, 0, TAU); g.strokeStyle = '#bfc6d8'; g.lineWidth = 1.6; g.stroke();
    it.on.forEach((o, i) => { const dx = (i - (it.on.length - 1) / 2) * 8 * s; ing8(g, x + dx, y - 2 * s, 6 * s, o.kind, o.st); });
    return;
  }
  ing8(g, x, y, 11 * s, it.kind, it.st);
}
function station(s) {
  const x = s.x, y = s.y, w = s.w, h = s.h, cx = x + w / 2, cy = y + h / 2;
  const base = s.t === 'serve' ? '#a8cf3f' : s.t === 'bin' ? '#5a5478' : s.t === 'crate' ? '#8a6a44' : s.t === 'ext' ? '#e8404f' : '#6b6392';
  rr(c, x + 3, y + 3, w - 6, h - 6, 9); fillOut(c, base, 3);
  rr(c, x + 6, y + 6, w - 12, h * 0.34, 6); c.fillStyle = 'rgba(255,255,255,.14)'; c.fill();
  if (s.t === 'crate') {
    ing8(c, cx, cy + 4, 15, s.ing, 0);
    label(ING[s.ing].n, cx, y + h - 9, 10, '#ffeccd');
  } else if (s.t === 'board') {
    rr(c, x + 9, cy - 10, w - 18, 22, 5); fillOut(c, '#d8a765', 2.4);
    if (!s.item) { c.strokeStyle = '#f5f1e6'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 8, cy - 4); c.lineTo(cx + 6, cy - 12); c.stroke(); c.lineWidth = 5; c.strokeStyle = '#9aa2bb'; c.beginPath(); c.moveTo(cx + 2, cy - 9); c.lineTo(cx + 10, cy - 14); c.stroke(); }
    label('Cortar', cx, y + h - 9, 10, '#ffeccd');
  } else if (isFuego(s)) {
    rr(c, x + 8, cy - 12, w - 16, 26, 7); fillOut(c, PIZZA ? '#3b3358' : '#2b2546', 2.6);
    if (s.fire <= 0) { const on = !!s.item; c.fillStyle = on ? '#ff8a3c' : '#4a4370'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(cx - 12 + i * 12, cy + (PIZZA ? 6 : 0), 3.4, 0, TAU); c.fill(); } }
    label(PIZZA ? 'Horno' : 'Fuego', cx, y + h - 9, 10, '#ffeccd');
  } else if (s.t === 'plates') {
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(cx, cy + 6 - i * 5, 16, 8, 0, 0, TAU); fillOut(c, i === 2 ? '#eef1f7' : '#d7dbe8', 2.2); }
    label(PIZZA ? 'Bandejas' : 'Platos', cx, y + h - 9, 10, '#ffeccd');
  } else if (s.t === 'serve') {
    rr(c, x + 8, cy - 12, w - 16, 20, 6); fillOut(c, '#f6f3e6', 2.4);
    c.fillStyle = OUT; for (let i = 0; i < 3; i++) c.fillRect(x + 13 + i * 12, cy - 8, 3, 12);
    plain('Servir', cx, y + h - 9, 10, '#1a1530');
  } else if (s.t === 'bin') {
    unite8(c, [[(q) => rr8(q, x + 12, cy - 10, w - 24, 24, 5), '#3c3660', { dx: 1.8, dy: 1.8 }], [(q) => rr8(q, x + 9, cy - 15, w - 18, 7, 3), '#2b2650']], 1.5);
    label('Basura', cx, y + h - 9, 10, '#ffeccd');
  } else if (s.t === 'ext') {
    drawItem(c, cx, cy - 2, { ext: 1 }, 1.1);
    label('Extintor', cx, y + h - 9, 10, '#fff');
  }
  if (s.item) drawItem(c, cx, cy - 6, s.item, 1);
  if (s.t === 'board' && s.item && s.item.st === 0 && s.prog > 0) bar(x + 8, y + h - 20, w - 16, 6, s.prog, '#a8cf3f');
  if (isFuego(s) && s.item && s.fire <= 0) {
    const p = PIZZA ? (s.item.baked ? 1 - clamp((s.cook - BAKE_T) / FIRE_T, 0, 1) : s.cook / BAKE_T) : (s.item.st < 2 ? s.cook / COOK_T : 1 - clamp((s.cook - COOK_T) / BURN_T, 0, 1));
    const done = PIZZA ? s.item.baked : s.item.st >= 2;
    bar(x + 8, y + h - 20, w - 16, 6, clamp(p, 0, 1), done ? (p < 0.35 ? '#ff6fb5' : '#ffc94d') : '#5b8cff');
  }
  if (s.fire > 0) {
    const f = (t * 9) % 1;
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + t * 3, r = 10 + Math.sin(a) * 4; c.beginPath(); c.arc(cx + Math.cos(a) * 12, cy - 6 - ((i * 7 + f * 10) % 22), r * 0.6, 0, TAU); c.fillStyle = i % 2 ? 'rgba(255,170,60,.85)' : 'rgba(255,90,60,.8)'; c.fill(); }
    bar(x + 8, y + h - 20, w - 16, 6, 1 - s.panic / PANIC, '#ff6fb5');
  }
}
function bar(x, y, w, h, p, col) {
  rr(c, x, y, w, h, h / 2); fillOut(c, 'rgba(12,8,28,.75)', 1.6);
  if (p > 0.02) { rr(c, x + 1.5, y + 1.5, Math.max(2, (w - 3) * clamp(p, 0, 1)), h - 3, (h - 3) / 2); c.fillStyle = col; c.fill(); }
}
/* §8: el cocinero (manoplas, cuerpo, cabeza y gorro) es UNA sola silueta; delantal y gorro se leen por
 * cambio de color, nunca por contorno. Horneado por color de traje: el coste por frame no sube. */
const SKIN8 = '#ffd9b0';
function chefSpr(col, hc) {
  return spr8(`chef_${col}_${hc}`, 62, 80, 31, 60, (g) => {
    const body = (q) => rr8(q, -13, -10, 26, 26, 9),
      armL = mitt8(-15.6, 3, Math.PI * 0.86, 5.1, 1), armR = mitt8(15.6, 3, Math.PI * 0.14, 5.1, -1),
      head = (q) => { q.moveTo(11, -16); q.arc(0, -16, 11, 0, P8T); },
      puff = (q) => { q.moveTo(0, -33); q.ellipse(-6, -33, 6, 5.5, 0, 0, P8T); q.moveTo(12, -33); q.ellipse(6, -33, 6, 5.5, 0, 0, P8T); q.moveTo(7, -36); q.ellipse(0, -36, 7, 6.5, 0, 0, P8T); },
      brim = (q) => rr8(q, -11, -30, 22, 7, 3);
    unite8(g, [
      [armL, SKIN8], [armR, SKIN8],
      [body, col, { dx: 2, dy: 2 }, (q) => { q.fillStyle = 'rgba(255,255,255,.78)'; q.beginPath(); rr8(q, -13, 2, 26, 14, 8); q.fill(); }],
      [head, SKIN8, { dx: 1.8, dy: 1.8 }],
      [puff, hc, { dx: 1.8, dy: 1.8 }], [brim, DK8(hc, 0.16)],
    ], 1.5);
    shine8(g, -4.5, -21, 3.2, 2, -0.5, 0.3);
  }, 3);
}
function chef(ch) {
  const bob = Math.sin(ch.bob) * 2 * (hyp(ch.vx, ch.vy) > 10 ? 1 : 0), hc = HAT[ch.p % 4];
  ART.shadow(c, ch.x, ch.y + 15, 14, 0.25);
  blit8(c, chefSpr(ch.col, hc), ch.x, ch.y + bob);
  eyes8(c, ch.x, ch.y - 17.5 + bob, 3.6, 2.6, { lx: ch.fx, ly: ch.fy, lid: 0.1, lidCol: '#f0b98d', sq: 0.95 });
  brow8(c, ch.x, ch.y - 21.5 + bob, 3.6, 3.4, -0.5, DK8(SKIN8, 0.55), 1.15);
  mouth8(c, ch.x + ch.fx * 1.2, ch.y - 11.8 + bob, 4.4, ch.hold ? 1 : 0);
  if (ch.dash > 0) { c.globalAlpha = 0.5; c.beginPath(); c.arc(ch.x - ch.fx * 18, ch.y - ch.fy * 18, 9, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.globalAlpha = 1; }
  if (ch.hold) drawItem(c, ch.x, ch.y - 44 + bob, ch.hold, 0.95);
  /* indicador de jugador */
  label(k.party ? 'J' + (ch.p + 1) : '', ch.x, ch.y + 20 + bob, 11, ch.col);
}
function ticket(o, x, y, w, h) {
  rr(c, x, y, w, h, 8); fillOut(c, '#f6f3e6', 2.6);
  const p = o.t / o.max, col = p > 0.5 ? '#a8cf3f' : p > 0.22 ? '#ffc94d' : '#ff6fb5';
  plain(o.r.n, x + w / 2, y + 12, Math.min(13, w / 8.2), '#1a1530');
  const n = o.r.it.length, sp = Math.min(24, (w - 10) / n);
  o.r.it.forEach(([kind, st], i) => {
    const ix = x + w / 2 + (i - (n - 1) / 2) * sp, iy = y + 31;
    ing8(c, ix, iy, 9, kind, st);
    if (st >= 2) { c.fillStyle = '#ff8a3c'; c.beginPath(); c.arc(ix + 7, iy + 7, 3, 0, TAU); c.fill(); c.lineWidth = 1.4; c.strokeStyle = OUT; c.stroke(); }
    else if (st === 1) { c.strokeStyle = '#8a8fa8'; c.lineWidth = 2; c.beginPath(); c.moveTo(ix + 4, iy + 9); c.lineTo(ix + 10, iy + 5); c.stroke(); }
  });
  bar(x + 5, y + h - 11, w - 10, 7, p, col);
}
function draw() {
  c.drawImage(FLOOR, 0, 0, W, H);
  ST.filter((s) => !s.mv).forEach(station);
  /* se marca la estación que cada cocinero tiene delante, para saber qué usará el botón A */
  for (const ch of chefs) {
    const s = stAt(ch); if (!s) continue;
    c.save(); c.strokeStyle = ch.col; c.globalAlpha = 0.75; c.lineWidth = 3;
    rr(c, s.x + 2, s.y + 2, s.w - 4, s.h - 4, 9); c.stroke(); c.restore();
  }
  chefs.slice().sort((a, b) => a.y - b.y).forEach(chef);
  ST.filter((s) => s.mv).forEach(station);
  /* HUD */
  c.fillStyle = 'rgba(16,11,34,.92)'; c.fillRect(0, 0, W, TOP); c.fillStyle = OUT; c.fillRect(0, TOP - 3, W, 3);
  const maxN = maxOrders(), tw = Math.min(PORT ? 112 : 132, (W - 150) / Math.max(3, maxN) - 6);
  orders.forEach((o, i) => { if (i < maxN) ticket(o, 8 + i * (tw + 6), 6, tw, TOP - 18); });
  /* dinero, estrellas, reloj */
  const rx = W - 8;
  label(money + ' €', rx, 18, 22, '#ffc94d', 'right');
  for (let i = 0; i < 3; i++) ART.heart(c, rx - 14 - i * 24, 46, 1.4, i < rep);
  const left = Math.max(0, DAY - t);
  label(`${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, rx, 72, 15, left < 20 ? '#ff6fb5' : '#d8d4f5', 'right');
  bar(rx - 96, TOP - 12, 96, 6, 1 - left / DAY, '#6e62f5');
  if (combo >= 2) label('Racha x' + combo, rx - 108, 18, 14, '#a8cf3f', 'right');
  if (alertT > 0) { c.globalAlpha = Math.min(1, alertT); label(alertC, W / 2, TOP + 26, 17, '#ff9ecb'); c.globalAlpha = 1; }
}

reset();
k.show(CFG.title || (PIZZA ? 'Pizzería en Llamas' : 'Cocina en Apuros'),
  (PIZZA
    ? 'Monta las pizzas en una bandeja, mételas al horno y sírvelas antes de que el cliente se vaya. Si una pizza se queda de más en el horno, arde: coge el extintor y ponte al lado. Las encimeras del centro se mueven con lo que dejes encima.'
    : 'Coge ingredientes de las cajas, córtalos en la tabla, fríe lo que lo necesite, monta el plato y llévalo a la ventanilla. Un cocinero al lado de la tabla corta solo; lo que se queda de más en el fuego se quema.')
  + '<br>A coger o soltar, B correr. Solo o hasta cuatro en la tele: cuantos más seáis, más pedidos entran.<br>Toca para empezar');
k.run(update, draw);
window.__co = { get orders() { return orders; }, get money() { return money; }, get rep() { return rep; }, get ST() { return ST; }, get chefs() { return chefs; }, get t() { return t; } };
