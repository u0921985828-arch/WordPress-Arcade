/* descenso — descensos por la nieve a cuatro (oleada 2). CFG.mode:
 *  'slalom' Slalom de Banderas: 2 mangas por un trazado de puertas; rozar un palo suma 1 s y saltarse una puerta 5 s.
 *           Pantalla dividida en columnas (una por jugador humano); el resto de corredores se ve como fantasma.
 *  'trineo' Trineo Nevado: copa de 3 bajadas por un sendero sinuoso con abetos, rampas, placas de hielo y turbos.
 *           Cámara compartida con el humano que va primero; los trineos chocan entre sí; salir de cámara te recoloca.
 *  'tabla'  Descenso Loco a Cuatro (oleada 3): misma física de sendero que el trineo pero en tabla de snow, con una
 *           pista que se estrecha bajada tras bajada y empujones (B) que apartan al rival y te frenan a ti un poco.
 * Física de ladera: la gravedad empuja según el ángulo con la línea de máxima pendiente (cruzarse frena), rozamiento
 * del aire (agacharse lo reduce), cuña para frenar. Siempre bajan 4: humanos según la tele y CPU en el resto; la CPU
 * mejora con las victorias guardadas en localStorage (cup:<id>). Vista cenital con árboles y banderas «de pie». */
const M = CFG.mode || 'slalom', SL = M === 'slalom', TB = M === 'tabla', OUT = ART.OUT, TAU = Math.PI * 2;
const PORT = innerHeight > innerWidth, W = PORT ? 405 : 720, H = PORT ? 720 : 405;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#e8f2fb' }), c = k.ctx;
const { lite, dark, alpha, rr, fillOut, glint, shadow } = ART, SNOW = ART.THEMES.snow;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t, sstep = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function RNG(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function mk(w, h, res, draw) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * res); cv.height = Math.ceil(h * res); const q = cv.getContext('2d'); q.scale(res, res); if (draw) draw(q); return cv; }
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
const fmtT = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
const ORD = (n) => n + '.º', CN = ['roja', 'azul', 'amarilla', 'verde'];
let CUP = 0; try { CUP = clamp(+localStorage.getItem('cup:' + CFG.id) || 0, 0, 5); } catch (e) { /* sin almacenamiento */ }
const skill = () => clamp(0.3 + CUP * 0.06, 0.3, 0.6);

/* ---------- Pistas ---------- */
const CW = 360, NETL = 16, NETR = CW - 16; /* slalom: pista recta de 360 de ancho con redes a los lados */
const RUNS = SL ? 2 : 3, PTS = [10, 6, 3, 1];
const NAMES = SL ? ['Pista Azul', 'Pista Roja'] : TB ? ['Canal ancho', 'Garganta de pinos', 'Embudo final'] : ['Bosque de abetos', 'Paso helado', 'Barranco del eco'];
let T = null, SEED = 1;
function buildSlalom(run) {
  const rng = RNG(SEED + run * 7919), gates = [], n = 20 + run * 3; let y = 430;
  for (let i = 0; i < n; i++) {
    const d = i / (n - 1), gap = lerp(128, 88, d) - run * 4, amp = lerp(24, 92, sstep(d * 1.15)), side = i % 2 ? 1 : -1;
    const cx = clamp(CW / 2 + side * amp * (0.7 + 0.3 * rng()), NETL + gap / 2 + 12, NETR - gap / 2 - 12);
    gates.push({ y, cx, gap, col: i % 2 ? '#3f7df0' : '#ff4d5e', i, wob: [0, 0] });
    y += lerp(250, 205, d) + rng() * 30;
  }
  const trees = []; for (let ty = -400; ty < y + 900; ty += 38) for (const sd of [-1, 1]) for (let row = 0; row < 3; row++) if (rng() < 0.8) {
    const x = sd < 0 ? -30 - row * 46 - rng() * 22 : CW + 30 + row * 46 + rng() * 22; trees.push({ x, y: ty + rng() * 30, s: 0.75 + rng() * 0.35, seed: rng(), r: 11 });
  }
  return { gates, LEN: y + 60, trees, cx: () => CW / 2, hw: () => CW / 2 - 16, name: NAMES[run], obj: [], bucket: bucketize(trees) };
}
function buildTrail(run) {
  const rng = RNG(SEED + run * 104729), LEN = 6200 + run * 700, p1 = rng() * TAU, p2 = rng() * TAU, p3 = rng() * TAU, ST = 20, n = Math.ceil((LEN + 1400) / ST) + 40;
  const CX = [], HW = [];
  for (let i = 0; i < n; i++) { const y = i * ST - 400, u = clamp(y / LEN, 0, 1), A = lerp(70, 210, u) * sstep(y / 700);
    /* en 'tabla' el canal se va cerrando a lo largo de la bajada y de una bajada a la siguiente */
    const base = TB ? lerp(250, lerp(150, 104, run / Math.max(1, RUNS - 1)), u) : 235;
    CX.push(A * (0.62 * Math.sin(y * 0.0019 + p1) + 0.38 * Math.sin(y * 0.0043 + p2))); HW.push(base - (TB ? 30 : 62) * Math.max(0, Math.sin(y * 0.0012 + p3)) * clamp(y / 1800, 0, 1)); }
  const at = (A, y) => { const f = (y + 400) / ST, i = clamp(Math.floor(f), 0, n - 2), q = clamp(f - i, 0, 1); return A[i] + (A[i + 1] - A[i]) * q; };
  const cx = (y) => at(CX, y), hw = (y) => at(HW, y), trees = [], obj = [];
  /* bosque a los lados (varias filas) */
  for (let y = -400; y < LEN + 900; y += 32) for (const sd of [-1, 1]) for (let row = 0; row < 3; row++) if (rng() < 0.85) {
    const yy = y + rng() * 26; trees.push({ x: cx(yy) + sd * (hw(yy) + 26 + row * 42 + rng() * 18), y: yy, s: 0.8 + rng() * 0.4, seed: rng(), r: 12 }); }
  /* obstáculos y ayudas dentro del sendero (nada en los primeros 750: arranque tranquilo) */
  let y = 760, last = '';
  while (y < LEN - 250) {
    const d = y / LEN, h = hw(y), r = rng(); let kind = r < 0.42 + d * 0.12 ? 'trees' : r < 0.66 ? 'ramp' : r < 0.82 ? 'ice' : 'boost'; if (kind === last && kind !== 'trees') kind = 'trees'; last = kind;
    if (kind === 'trees') { const nT = 1 + (rng() < 0.3 + d * 0.5 ? 1 : 0) + (d > 0.55 && rng() < 0.4 ? 1 : 0), free = (rng() * 2 - 1) * 0.5 * h;
      for (let i = 0; i < nT; i++) { let o, tries = 0; do { o = (rng() * 2 - 1) * 0.8 * h; tries++; } while (Math.abs(o - free) < 70 && tries < 20); if (Math.abs(o - free) < 70) continue; const yy = y + rng() * 60; trees.push({ x: cx(yy) + o, y: yy, s: 0.85 + rng() * 0.3, seed: rng(), r: 12, inner: 1 }); } }
    else if (kind === 'ramp') { const w = 120 + rng() * 40, o = (rng() * 2 - 1) * (h - w / 2 - 10); obj.push({ k: 'ramp', x: cx(y) + o, y, w, l: 34 }); }
    else if (kind === 'ice') { const o = (rng() * 2 - 1) * 0.5 * h; obj.push({ k: 'ice', x: cx(y) + o, y: y + 40, rx: 70 + rng() * 40, ry: 55 + rng() * 40, seed: rng() * 99 }); }
    else { const o = (rng() * 2 - 1) * 0.6 * h; obj.push({ k: 'boost', x: cx(y) + o, y, w: 64, l: 60 }); }
    y += lerp(300, 200, d) + rng() * 90;
  }
  return { LEN, trees, obj, cx, hw, name: NAMES[run], gates: [], bucket: bucketize(trees) };
}
function bucketize(trees) { const b = {}; for (const t of trees) (b[Math.floor(t.y / 100)] || (b[Math.floor(t.y / 100)] = [])).push(t); return b; }
function treesNear(y, r) { const out = [], a = Math.floor((y - r) / 100), z = Math.floor((y + r) / 100); for (let i = a; i <= z; i++) if (T.bucket[i]) out.push(...T.bucket[i]); return out; }

/* ---------- Texturas y sprites ---------- */
const PT = (() => {
  const r = RNG(5), p = (w, h, draw) => { const cv = mk(w, h, 2, draw), q = c.createPattern(cv, 'repeat'); try { q.setTransform(new DOMMatrix().scale(0.5)); } catch (e) { /* antiguo */ } return q; };
  return {
    piste: p(128, 128, (g) => { g.fillStyle = '#f7fbff'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(150,180,215,.16)'; g.lineWidth = 1; for (let x = 0; x < 128; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
      for (let i = 0; i < 50; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.9)' : 'rgba(170,200,235,.35)'; g.fillRect(r() * 128, r() * 128, 1.5, 1.5); } }),
    deep: p(160, 160, (g) => { g.fillStyle = '#e4eef9'; g.fillRect(0, 0, 160, 160); for (let i = 0; i < 9; i++) { const x = r() * 160, y = r() * 160, w = 30 + r() * 40; g.fillStyle = 'rgba(160,190,225,.28)'; g.beginPath(); g.ellipse(x, y + 4, w, 7, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(x - 3, y, w * 0.9, 5, 0, 0, TAU); g.fill(); }
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(r() * 160, r() * 160, 1.5, 1.5); } }),
  };
})();
function drawPine(t) { c.save(); c.translate(t.x, t.y); c.scale(t.s * 0.8, t.s * 0.8); ART.deco(c, SNOW, 0, 0, 32, t.seed); c.restore(); }
/* ---------- Ley de la pieza única (REMASTER §8) ----------
 * uni(): traza TODAS las partes y las rellena después, así los contornos interiores quedan
 * tapados y solo sobrevive el borde exterior de la silueta. inw(): detalle interior recortado
 * contra esa silueta. Las separaciones internas se leen por sombra propia o por cambio de
 * color, nunca por stroke. Una pieza solo se separa cuando se mueve de verdad. */
function uni(g, parts, ow) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = ow * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); } }
const all = (parts) => (g) => { for (const p of parts) p(g); };
function inw(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
const rp = (g, x, y, w, h, r) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const cp = (g, x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); g.closePath(); };
const ep2 = (g, x, y, rx, ry, rot) => { g.moveTo(x + rx * Math.cos(rot || 0), y + rx * Math.sin(rot || 0)); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.closePath(); };
const ply = (pts) => (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
/* hueso de ancho variable: baja por un costado, redondea la punta y vuelve por el otro, así
 * miembro y tronco se unen con tangente continua y sin escalón. */
function bone(pts, ws) {
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
    g.lineTo(R[0][0], R[0][1]);
    g.closePath();
  };
}
/* Puerta de slalom: palo y banderola son una sola pieza (la tela nace del palo). */
function drawGatePole(x, y, col, wob, right, tt) {
  const sw = Math.sin(tt * 18) * wob * 7; c.save(); c.translate(x, y); c.lineJoin = 'round';
  shadow(c, 3, 1, 6, 0.25);
  c.rotate(sw * 0.02);
  const d = right ? -1 : 1;
  const pole = (q) => rp(q, -2, -40, 4, 40, 1.5);
  const flag = ply([[0, -38], [d * 22 + sw, -36], [d * 21 + sw, -20], [0, -22]]);
  const g = c.createLinearGradient(0, -38, d * 22, -20); g.addColorStop(0, lite(col, 0.2)); g.addColorStop(1, dark(col, 0.15));
  uni(c, [[flag, g], [pole, col]], 1.1);
  inw(c, all([pole, flag]), (q) => {
    q.fillStyle = '#fff'; for (let i = 0; i < 3; i++) q.fillRect(-1.4, -34 + i * 11, 2.8, 4);
    q.fillStyle = 'rgba(0,0,0,.22)'; q.fillRect(-2, -40, 1.4, 40);
    q.fillStyle = alpha('#ffffff', 0.8); q.beginPath(); q.arc(d * 10 + sw * 0.5, -29, 3.2, 0, TAU); q.fill(); });
  c.restore();
}
/* Cada corredor es UN cuerpo (piernas, tronco, brazos y cabeza en el mismo trazado); la tabla,
 * los esquís y el trineo van aparte porque giran con el rumbo. */
function drawRacer(r, tt, ghost) {
  const x = r.x, z = r.z, y = r.y - z * 26, a = r.a; if (ghost) c.globalAlpha = 0.42;
  if (r.inv > 0 && !r.crash && Math.floor(tt * 14) % 2) c.globalAlpha *= 0.5;
  shadow(c, r.x + 2 + z * 8, r.y + 2 + z * 6, 11 * (1 - z * 0.25), 0.25);
  c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineCap = 'round';
  if (r.crash > 0) c.rotate(r.crash * 9 * r.spinDir);
  const sx = Math.sin(a), sy = Math.cos(a), col = r.col;
  const body = (parts, detail) => { uni(c, parts, 1.15); inw(c, all(parts.map((q) => q[0])), detail); };
  if (SL) {
    const skis = (q) => { for (const o of [-3.6, 3.6]) { const px = sy * o, py = -sx * o;
      q.moveTo(px - sx * 14 - sy * 1.5, py - sy * 14 + sx * 1.5);
      q.lineTo(px + sx * 15 - sy * 1.5, py + sy * 15 + sx * 1.5);
      q.lineTo(px + sx * 15 + sy * 1.5, py + sy * 15 - sx * 1.5);
      q.lineTo(px - sx * 14 + sy * 1.5, py - sy * 14 - sx * 1.5); q.closePath(); } };
    uni(c, [[skis, dark(col, 0.1)]], 1.1);
    const tuck = r.tuck && !r.crash, lean = clamp(r.steer, -1, 1) * 3, hy = tuck ? -21 : -29;
    c.lineWidth = 1.5; c.strokeStyle = OUT; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 7 + lean, tuck ? -9 : -14); c.lineTo(sd * 9 - sx * 6, 2 - sy * 6); c.stroke(); }
    const legs = (q) => rp(q, -5 + lean * 0.4, tuck ? -9 : -13, 10, tuck ? 9 : 13, 3);
    const torso = (q) => rp(q, -7 + lean, tuck ? -18 : -25, 14, 12, 5);
    const head = (q) => cp(q, lean * 1.2, hy, 5.6);
    const g = c.createLinearGradient(-7, -25, 7, -13); g.addColorStop(0, lite(col, 0.25)); g.addColorStop(1, dark(col, 0.2));
    body([[legs, '#3a3558'], [torso, g], [head, col]], (q) => {
      q.fillStyle = 'rgba(0,0,0,.26)'; q.fillRect(-9 + lean, (tuck ? -9 : -13) - 1.4, 18, 2.6); q.fillRect(-8 + lean, hy + 4, 16, 2.2);
      q.fillStyle = '#ffd166'; q.beginPath(); rp(q, lean * 1.2 - 4.5, hy - 1, 9, 3.2, 1.5); q.fill(); glint(q, lean * 1.2 - 2, hy - 3.5, 1.6); });
  } else if (TB) {
    const lean = clamp(r.steer, -1, 1) * 3.4, tuck = r.tuck && !r.crash, pu = r.push > 0 ? Math.min(1, r.push / 0.25) : 0;
    c.save(); c.rotate(-a * 0.9); c.scale(1, 0.62);
    const board = (q) => rp(q, -7, -20, 14, 40, 7);
    const bg = c.createLinearGradient(-7, -20, 7, 20); bg.addColorStop(0, lite(col, 0.3)); bg.addColorStop(1, dark(col, 0.25));
    uni(c, [[board, bg]], 1.5);
    inw(c, board, (q) => { q.fillStyle = alpha('#ffffff', 0.7); q.fillRect(-2, -14, 4, 28);
      q.fillStyle = OUT; for (const o of [-7, 7]) { q.beginPath(); rp(q, -5, o - 2.5, 10, 5, 2); q.fill(); } });
    c.restore();
    const hy = tuck ? -20 : -27;
    const legs = [-1, 1].map((sd) => bone([[sd * 3 + lean * 0.4, tuck ? -7 : -10], [sd * 6, 3]], [2.6, 2]));
    const arms = [-1, 1].map((sd) => bone([[sd * 5 + lean, tuck ? -14 : -19], [sd * (10 + pu * 12), (tuck ? -12 : -16) + sd * lean * 0.6 - pu * 4]], [2.2, 1.7]));
    const torso = (q) => rp(q, -7 + lean, tuck ? -17 : -23, 14, tuck ? 12 : 15, 6);
    const head = (q) => { cp(q, lean * 1.2, hy, 5.8); q.moveTo(lean * 1.2 + 6.2, hy - 1); q.arc(lean * 1.2, hy - 1, 6.2, 0, Math.PI, true); q.closePath(); };
    const g = c.createLinearGradient(-7, -23, 7, -8); g.addColorStop(0, lite(col, 0.25)); g.addColorStop(1, dark(col, 0.2));
    body([[legs[0], '#3a3558'], [legs[1], '#3a3558'], [arms[0], lite(col, 0.35)], [arms[1], lite(col, 0.35)], [torso, g], [head, '#ffd9b8']], (q) => {
      q.fillStyle = 'rgba(0,0,0,.26)'; q.fillRect(-10 + lean, (tuck ? -7 : -10) - 1.2, 20, 2.4); q.fillRect(-9 + lean, hy + 4, 18, 2.2);
      q.fillStyle = col; q.beginPath(); q.arc(lean * 1.2, hy - 1, 6.2, Math.PI, 0); q.fill();
      q.fillStyle = '#2c2a44'; q.beginPath(); rp(q, lean * 1.2 - 4.6, hy - 1.6, 9.2, 3.4, 1.6); q.fill(); glint(q, lean * 1.2 - 2, hy - 3.6, 1.6); });
    if (r.shoved > 0) for (let i = 0; i < 2; i++) glint(c, Math.cos(tt * 12 + i * 3) * 16, hy - 8 + Math.sin(tt * 12 + i * 3) * 4, 3, '#ff8a8a');
  } else {
    c.save(); c.rotate(-a); c.scale(1, 0.8);
    const runners = (q) => { for (const sd of [-1, 1]) { q.moveTo(sd * 8 - 1.6, -14); q.lineTo(sd * 8 + 1.6, -14); q.lineTo(sd * 8 + 1.6, 12);
      q.quadraticCurveTo(sd * 8 + 1.6, 20.6, sd * 4, 20.6); q.lineTo(sd * 4, 17.4); q.quadraticCurveTo(sd * 8 - 1.6, 17.4, sd * 8 - 1.6, 12); q.closePath(); } };
    const seat = (q) => rp(q, -9, -13, 18, 26, 4);
    const wg = c.createLinearGradient(-9, 0, 9, 0); wg.addColorStop(0, '#d49a5c'); wg.addColorStop(1, '#9a6334');
    uni(c, [[runners, '#c9d4e6'], [seat, wg]], 1.3);
    inw(c, all([runners, seat]), (q) => { q.fillStyle = alpha(OUT, 0.26); for (let i = -1; i <= 1; i++) q.fillRect(-9, i * 7 - 0.6, 18, 1.2);
      q.fillStyle = 'rgba(0,0,0,.22)'; q.fillRect(-11, -13, 3, 26); q.fillRect(8, -13, 3, 26); });
    c.restore();
    const lean = clamp(r.steer, -1, 1) * 3, tuck = r.tuck && !r.crash, hy = tuck ? -17 : -23;
    const sc = Math.sin(tt * 10 + r.p) * 2;
    const scarf = bone([[lean * 1.3 - 5, hy + 5], [lean - 11, hy + 6 + sc], [lean - 16, hy + 2 + sc]], [2.2, 1.9, 1.4]);
    const torso = (q) => rp(q, -8 + lean, tuck ? -14 : -19, 16, tuck ? 12 : 15, 6);
    const head = (q) => { cp(q, lean * 1.3, hy, 6); q.moveTo(lean * 1.3 + 6.2, hy - 1); q.arc(lean * 1.3, hy - 1, 6.2, 0, Math.PI, true); q.closePath(); cp(q, lean * 1.3, hy - 8, 2.6); };
    const g = c.createLinearGradient(-8, -19, 8, -4); g.addColorStop(0, lite(col, 0.25)); g.addColorStop(1, dark(col, 0.2));
    body([[scarf, lite(col, 0.4)], [torso, g], [head, '#ffd9b8']], (q) => {
      q.fillStyle = 'rgba(0,0,0,.24)'; q.fillRect(-10 + lean, hy + 4, 20, 2.2);
      q.fillStyle = col; q.beginPath(); q.arc(lean * 1.3, hy - 1, 6.2, Math.PI, 0); q.fill();
      q.fillStyle = '#fff'; q.beginPath(); q.arc(lean * 1.3, hy - 8, 2.4, 0, TAU); q.fill(); });
  }
  c.restore(); c.globalAlpha = 1;
  if (r.crash > 0) for (let i = 0; i < 3; i++) { const an = tt * 8 + i * 2.1; glint(c, x + Math.cos(an) * 14, y - 30 + Math.sin(an) * 4, 3, '#ffd166'); }
}

/* ---------- Estado ---------- */
let racers, run, phase, phT, parts, raceT, finOrder, msg, msgT, cdPend = false, cam;
const GR = 240, CD = 0.00285;
function mkRacer(p) {
  const hu = k.human(p), q = k.party && k.party.find((x) => x.p === p);
  return { p, col: k.pcol(p), cpu: !hu, name: hu ? (q && q.name) || (k.party ? 'J' + (p + 1) : 'Tú') : 'CPU ' + CN[p], x: 0, y: 0, a: 0, dir: 0, v: 0, z: 0, air: 0, airMax: 0, bx: 0,
    steer: 0, tuck: false, crash: 0, inv: 0, boost: 0, hold: 0, spinDir: 1, g: 0, pen: 0, fin: 0, pts: 0, gain: 0, times: [], trail: [], trT: 0, surf: '', offT: 0,
    tx: 0, reT: 0, err: 0, blind: 0, spd: 0.97 + (3 - p) * 0.01, place: 0, pcd: 0, push: 0, shoves: 0, shoved: 0 };
}
function startRun() {
  T = SL ? buildSlalom(run) : buildTrail(run);
  parts = []; finOrder = []; raceT = 0; phase = 'run'; phT = 0;
  const order = SL ? racers.slice() : racers.slice().sort((a, b) => (run === 0 ? (a.cpu - b.cpu) || a.p - b.p : a.pts - b.pts));
  order.forEach((r, i) => { const x = SL ? CW / 2 + (i - 1.5) * 10 : T.cx(0) + (i - 1.5) * 52;
    Object.assign(r, { x, y: SL ? -i * 2 : -(i % 2) * 18, a: 0, dir: 0, v: 0, z: 0, air: 0, bx: 0, crash: 0, inv: 0, boost: 0, hold: 0, g: 0, pen: 0, fin: 0, gain: 0, trail: [], trT: 0, offT: 0, tx: x, reT: 0, pcd: 0, push: 0, shoved: 0 }); });
  const h = racers.find((q) => !q.cpu) || racers[0]; cam = { x: T.cx(0), y: h.y + 120 };
  msg = `${SL ? 'Manga' : 'Bajada'} ${run + 1} de ${RUNS} · ${T.name}`; msgT = 3; cdPend = true;
}
function reset() { demoOn = false; SEED = (Math.random() * 1e9) | 0; run = 0; racers = Array.from({ length: 4 }, (_, p) => mkRacer(p)); startRun(); }
k.onParty = () => {
  if (k.st !== 'play') { reset(); return; }
  for (const r of racers) { const hu = k.human(r.p), q = k.party && k.party.find((x) => x.p === r.p); r.cpu = !hu; r.col = k.pcol(r.p); r.name = hu ? (q && q.name) || (k.party ? 'J' + (r.p + 1) : 'Tú') : 'CPU ' + CN[r.p]; }
};
const humans = () => racers.filter((r) => !r.cpu);

/* ---------- Vistas: una columna por humano (slalom) o cámara compartida (trineo) ---------- */
function views() {
  const hs = humans();
  if (SL) { const n = Math.max(1, hs.length), list = hs.length ? hs : [racers[0]], vw = W / n;
    return list.map((r, i) => { const s = clamp(Math.min(vw / 400, H / 560), 0.42, 1.1); return { x: i * vw, y: 0, w: vw, h: H, s, r }; }); }
  return [{ x: 0, y: 0, w: W, h: H, s: clamp(Math.min(W / 530, H / 500), 0.5, 1.1), r: null }];
}
function camFor(v) {
  const VW = v.w / v.s, VH = v.h / v.s;
  if (SL) { const r = v.r, cx = VW >= CW + 40 ? CW / 2 : clamp(r.x, VW / 2 - 60, CW + 60 - VW / 2); return { x: cx, y: r.y - r.z * 26 + VH * 0.24, VW, VH }; }
  return { x: cam.x, y: cam.y, VW, VH };
}
function camTarget() {
  const hs = humans().filter((r) => !r.fin), pool = hs.length ? hs : humans().length ? humans() : racers;
  return pool.reduce((a, b) => (b.y > a.y ? b : a));
}
function updCam(dt, snap) {
  if (SL) return; const t = camTarget(), v = views()[0], VH = v.h / v.s, VW = v.w / v.s, hs = humans();
  const ty = t.y + VH * 0.2, mx = hs.length ? hs.reduce((s, r) => s + r.x, 0) / hs.length : t.x, tx = lerp(T.cx(ty), mx, 0.55), f = snap ? 1 : Math.min(1, dt * 5);
  cam.y += (ty - cam.y) * f; cam.x += (tx - cam.x) * Math.min(1, dt * 3); void VW;
}

/* ---------- Entrada ---------- */
function humanIn(r) {
  const d = k.pdir(r.p); let s = d.x, tuck = k.pheld(r.p, 'a') || d.y > 0, brake = TB ? d.y < 0 : k.pheld(r.p, 'b') || d.y < 0;
  const push = TB && k.phit(r.p, 'b');
  if (!k.party && r.p === 0 && k.ptr.down) { /* táctil sin mando: el esquiador va hacia donde está el dedo */
    const v = views()[0], cm = camFor(v), wx = cm.x + (k.ptr.x - v.x - v.w / 2) / v.s, want = clamp(Math.atan2(wx - r.x, 150), -1.2, 1.2);
    s = Math.abs(want - r.a) > 0.06 ? Math.sign(want - r.a) : 0; if (Math.abs(want) < 0.25 && Math.abs(r.a) < 0.3) tuck = true; }
  return { s, tuck, brake, push };
}
function cpuIn(r, dt) {
  const sk = skill(); let tx, look;
  if (SL) {
    const g = T.gates[r.g], g2 = T.gates[r.g + 1];
    if (!g) { tx = CW / 2; look = 200; }
    else { if (r.reT !== r.g) { r.reT = r.g; const miss = r.g > 1 && Math.random() < (1 - sk) * 0.07; r.err = miss ? (Math.random() < 0.5 ? -1 : 1) * (g.gap / 2 + 18) : (Math.random() * 2 - 1) * (1 - sk) * 0.55 * (g.gap / 2 - 8); }
      tx = g.cx + r.err; look = Math.max(50, g.y - r.y);
      if (g2 && g.y - r.y < 70) { tx = lerp(tx, g2.cx, 0.35); } }
  } else {
    r.reT -= dt;
    if (r.reT <= 0) { r.reT = 0.22; const L = 120 + r.v * 0.65, y1 = r.y + L, h = T.hw(y1), cands = [];
      if (Math.random() < (1 - sk) * 0.12) r.blind = 0.8;
      for (let o = -0.75; o <= 0.76; o += 0.15) { const x1 = T.cx(y1) + o * h; let sc = -Math.abs(x1 - r.x) * 0.02 - Math.abs(o) * 0.6;
        if (r.blind <= 0) for (const t of treesNear(r.y + L / 2, L / 2 + 20)) { if (t.y < r.y + 5 || t.y > y1 + 15) continue; const q = (t.y - r.y) / (y1 - r.y), lx = r.x + (x1 - r.x) * q; if (Math.abs(lx - t.x) < 34) sc -= 10 * (1 - Math.abs(lx - t.x) / 34) + 2; }
        for (const ob of T.obj) { if (ob.y < r.y || ob.y > y1 + 40) continue; const q = clamp((ob.y - r.y) / (y1 - r.y), 0, 1), lx = r.x + (x1 - r.x) * q; if (Math.abs(lx - ob.x) < (ob.w || ob.rx || 60) / 2) sc += ob.k === 'boost' ? 2.5 * sk : ob.k === 'ramp' ? 1.5 * sk : -1.2 * sk; }
        cands.push([sc, x1]); }
      cands.sort((a, b) => b[0] - a[0]); r.tx = cands[0][1]; }
    if (r.blind > 0) r.blind -= dt;
    tx = r.tx; look = 120 + r.v * 0.65;
  }
  const want = clamp(Math.atan2(tx - r.x, look) * 1.15, -1.25, 1.25), dA = want - r.a;
  const s = Math.abs(dA) > 0.05 ? clamp(dA * 4, -1, 1) : 0;
  const tuck = Math.abs(want) < 0.3 && Math.abs(r.a) < 0.35 && Math.random() < 0.6 + sk * 0.4;
  const brake = SL && r.v > 200 && Math.abs(dA) > 0.7;
  let push = false;
  if (TB && r.pcd <= 0 && raceT > 5) { const o = nearRival(r); push = !!o && Math.random() < 0.02 + sk * 0.05; }
  return { s, tuck, brake, push };
}

/* ---------- Física ---------- */
function surfaceOf(r) {
  if (r.z > 0.02) return 'air';
  if (!SL) { if (Math.abs(r.x - T.cx(r.y)) > T.hw(r.y) + 6) return 'deep';
    for (const o of T.obj) { if (Math.abs(o.y - r.y) > 120) continue;
      if (o.k === 'ice' && ((r.x - o.x) / o.rx) ** 2 + ((r.y - o.y) / o.ry) ** 2 < 1) return 'ice';
      if (o.k === 'boost' && Math.abs(r.x - o.x) < o.w / 2 && r.y > o.y - o.l / 2 && r.y < o.y + o.l / 2) return 'boost';
      if (o.k === 'ramp' && Math.abs(r.x - o.x) < o.w / 2 && r.y > o.y - o.l && r.y < o.y) return 'ramp'; } }
  return 'snow';
}
function vFactor(r) {
  let f = 1;
  if (r.cpu) { f = (0.84 + CUP * 0.014) * r.spd; const hs = humans(); if (hs.length) { const h = hs.reduce((a, b) => (b.y > a.y ? b : a)); f *= 1 + clamp((h.y - r.y) / 3000, -0.08, 0.05); } }
  return f * lerp(0.9, 1, clamp(run / (RUNS - 1), 0, 1));
}
function step(r, dt) {
  if (r.hold > 0) { r.hold -= dt; return; }
  if (r.fin) { r.v *= Math.exp(-1.6 * dt); r.a *= Math.exp(-2 * dt); r.dir = r.a; r.x += r.v * Math.sin(r.dir) * dt; r.y += r.v * Math.cos(r.dir) * dt; r.steer = 0; r.tuck = false; return; }
  if (r.inv > 0) r.inv -= dt;
  if (r.crash > 0) { r.crash -= dt; r.v *= Math.exp(-3 * dt); r.x += r.v * Math.sin(r.dir) * dt; r.y += r.v * Math.cos(r.dir) * dt; if (r.crash <= 0) { r.a = r.dir = 0; r.inv = 1.6; } return; }
  const inp = r.cpu ? cpuIn(r, dt) : humanIn(r), sf = surfaceOf(r), air = sf === 'air';
  r.steer = lerp(r.steer, inp.s, Math.min(1, dt * 12)); r.tuck = inp.tuck && !inp.brake;
  const turn = (SL ? 2.9 : 2.3) * (r.tuck ? 0.6 : 1) * (air ? 1.4 : 1);
  r.a = clamp(r.a + inp.s * turn * dt, -1.45, 1.45);
  const vf = vFactor(r); let cd = CD / (vf * vf) * (r.tuck ? 0.62 : 1), acc = GR * Math.cos(r.a);
  if (sf === 'ice') cd *= 0.7; if (sf === 'deep') { acc *= 0.55; cd *= 1; }
  let dec = cd * r.v * r.v + Math.abs(inp.s) * 22 + (inp.brake ? 250 : 0) + (sf === 'deep' ? 1.6 * r.v : 0);
  if (air) { acc = 60; dec = cd * 0.5 * r.v * r.v; }
  const slip = Math.abs(r.a - r.dir); dec += slip * r.v * 1.2;
  r.v = Math.max(0, r.v + (acc - dec) * dt);
  if (sf === 'boost' && r.surf !== 'boost') { r.boost = 0.9; if (!r.cpu) { k.sfx('coin'); fl(r, '¡Turbo!', '#ffd166'); } }
  if (r.boost > 0) { r.boost -= dt; r.v = Math.min(r.v + 260 * dt, 430 * vf); }
  if (sf === 'ramp' && r.surf !== 'ramp' && r.v > 70) { r.air = r.airMax = clamp(r.v / 300 * 0.95, 0.45, 1.05); if (!r.cpu) k.sfx('jump'); }
  r.surf = sf;
  if (TB) { r.pcd = Math.max(0, r.pcd - dt); r.push = Math.max(0, r.push - dt); r.shoved = Math.max(0, r.shoved - dt);
    if (inp.push && r.pcd <= 0 && !air) shove(r); }
  const grip = air ? 0.5 : sf === 'ice' ? 1.3 : 10; r.dir += (r.a - r.dir) * Math.min(1, grip * dt);
  r.x += (r.v * Math.sin(r.dir) + r.bx) * dt; r.y += r.v * Math.cos(r.dir) * dt; r.bx *= Math.exp(-4 * dt);
  if (r.air > 0) { r.air -= dt; r.z = Math.sin(Math.PI * clamp(1 - r.air / r.airMax, 0, 1)) * clamp(r.airMax, 0.5, 1);
    if (r.air <= 0) { r.z = 0; if (Math.abs(r.a) < 0.4) { r.boost = 0.7; if (!r.cpu) { k.sfx('coin'); fl(r, '¡Buen aterrizaje!', '#7cf7a0'); } } else { r.v *= 0.62; if (!r.cpu) { k.sfx('hit'); fl(r, 'Aterrizaje torcido', '#ffd166'); } } spray(r, 10); } }
  /* spray de nieve al girar o frenar */
  if (!air && r.v > 80 && (Math.abs(inp.s) > 0.5 || inp.brake) && Math.random() < 0.6) spray(r, 1);
  r.trT += dt; if (r.trT > 0.05 && !air) { r.trT = 0; r.trail.push([r.x, r.y]); if (r.trail.length > 90) r.trail.shift(); }
  if (air && r.trail.length && r.trail[r.trail.length - 1] !== null) r.trail.push(null);
  /* límites */
  if (SL) { if (r.x < NETL + 6 || r.x > NETR - 6) { r.x = clamp(r.x, NETL + 6, NETR - 6); r.v *= 0.7; r.a *= -0.4; r.dir = r.a; if (!r.cpu) { k.sfx('hit'); k.shake(3); } } }
  else if (r.z < 0.3 && r.inv <= 0) for (const t of treesNear(r.y, 30)) { if (Math.hypot(r.x - t.x, r.y - t.y) < t.r + 7) { crash(r, t); break; } }
}
/* 'tabla': empujón lateral. Aparta al rival que tienes al lado y te frena un poco a ti (acción y reacción). */
function nearRival(r) {
  let best = null, bd = 1e9;
  for (const o of racers) { if (o === r || o.fin || o.hold > 0 || o.crash > 0) continue;
    const dx = o.x - r.x, dy = o.y - r.y; if (Math.abs(dx) > 62 || dy < -46 || dy > 34) continue;
    const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = o; } }
  return best;
}
function shove(r) {
  r.pcd = 0.85; r.push = 0.25; const o = nearRival(r);
  if (!o) { if (!r.cpu) k.sfx('click'); return; }
  const sd = o.x >= r.x ? 1 : -1;
  o.bx += sd * 260; o.v *= 0.9; o.a = clamp(o.a + sd * 0.35, -1.45, 1.45); o.shoved = 0.5;
  r.bx -= sd * 70; r.v *= 0.97; r.shoves++;
  for (let i = 0; i < 7; i++) addPart((r.x + o.x) / 2, (r.y + o.y) / 2, i % 2 ? '#ffffff' : '#ffd166', 130, 0.4, 2.6);
  k.sfx('hit'); if (!r.cpu || !o.cpu) k.shake(3);
  if (!r.cpu) fl(r, '¡Empujón!', '#ffd166'); else if (!o.cpu) fl(o, '¡Te empujan!', '#ff8a8a');
}
function crash(r, t) {
  r.crash = 1.0; r.spinDir = r.x < t.x ? -1 : 1; r.v = Math.min(r.v, 60); r.dir = r.a = clamp(r.a + r.spinDir * 0.8, -1.2, 1.2); r.air = 0; r.z = 0; r.boost = 0;
  for (let i = 0; i < 12; i++) addPart(t.x, t.y - 20, i % 2 ? '#ffffff' : '#cfe2f5', 120, 0.6, 3);
  if (!r.cpu) { k.sfx('hurt'); k.shake(5); fl(r, '¡Pino!', '#ff8a8a'); }
}
function fl(r, txt, col) { flo.push({ txt, r, t: 1.1, col }); }
const flo = [];
function spray(r, n) { for (let i = 0; i < n; i++) addPart(r.x - Math.sin(r.dir) * 8, r.y - Math.cos(r.dir) * 8, i % 2 ? '#ffffff' : '#d7e8f8', 70, 0.45, 2.4); }
function addPart(x, y, col, spd, life, rad) { if (parts.length > 300) return; const a = Math.random() * TAU, v = Math.random() * spd; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life, max: life, col, r: rad * (0.6 + Math.random() * 0.6) }); }

/* ---------- Reglas ---------- */
function gates(r) {
  for (let i = Math.max(0, r.g - 1); i < Math.min(T.gates.length, r.g + 2); i++) { const g = T.gates[i];
    for (let s = 0; s < 2; s++) { const px = g.cx + (s ? 1 : -1) * g.gap / 2, bit = 1 << (s + r.p * 2); if ((g.hitMask || 0) & bit) continue;
      if (Math.abs(r.y - g.y) < 10 && Math.abs(r.x - px) < 10) { g.hitMask = (g.hitMask || 0) | bit; g.wob[s] = 1; r.pen += 1; r.v *= 0.85; r.x += (r.x < px ? -1 : 1) * 3;
        if (!r.cpu) { k.sfx('hit'); fl(r, '+1 s', '#ffd166'); } } } }
  const g = T.gates[r.g];
  if (g && r.y >= g.y) { const ok = r.x > g.cx - g.gap / 2 && r.x < g.cx + g.gap / 2; r.g++;
    if (ok) { if (!r.cpu) k.sfx('coin'); } else { r.pen += 5; if (!r.cpu) { k.sfx('hurt'); fl(r, '¡Puerta fallada! +5 s', '#ff8a8a'); k.shake(3); } } }
}
function sim(dt) {
  raceT += dt;
  for (const r of racers) {
    step(r, dt);
    if (SL && !r.fin) gates(r);
    if (!r.fin && r.y >= T.LEN) { r.fin = raceT; finOrder.push(r); r.time = raceT + r.pen;
      if (!r.cpu) { k.sfx(finOrder.length === 1 ? 'win' : 'coin'); k.burst(W / 2, H / 3, r.col, 24, 180); fl(r, SL ? fmtT(r.time) : ORD(finOrder.length), '#fff'); } }
  }
  if (!SL) collide();
  updCam(dt);
}
/* Demostración detrás de la pantalla de inicio: bajan cuatro corredores de la CPU (también da la miniatura). */
let demoOn = false;
function attract(dt) {
  if (!demoOn || finOrder.length >= 2 || raceT > 60) { reset(); demoOn = true; for (const r of racers) r.cpu = true; msgT = 0; cdPend = false; for (let i = 0; i < 100; i++) { sim(1 / 30); updParts(1 / 30); } updCam(0, true); }
  sim(Math.min(dt, 0.05)); updParts(dt);
  for (const g of T.gates) for (let q = 0; q < 2; q++) g.wob[q] = Math.max(0, g.wob[q] - dt * 1.5);
}
function update(dt) {
  if (k.st === 'ready' && !k.party) attract(dt);
  else if (demoOn && k.st === 'play') reset();
  if (!k.gate(reset)) return;
  if (cdPend) { cdPend = false; k.count(3); updCam(0, true); }
  if (msgT > 0) msgT -= dt;
  for (let i = flo.length - 1; i >= 0; i--) { flo[i].t -= dt; if (flo[i].t <= 0) flo.splice(i, 1); }
  for (const g of T.gates) for (let s = 0; s < 2; s++) g.wob[s] = Math.max(0, g.wob[s] - dt * 1.5);
  if (phase === 'stand') { phT -= dt; updParts(dt); if (phT <= 0 || (phT < 3.2 && (k.hit.has('a') || k.ptr.hit || (k.party && k.party.some((q) => k.phit(q.p, 'a')))))) nextRun(); return; }
  if (k.counting()) { updCam(dt); return; }
  sim(dt);
  /* trineo con varios humanos: quien se queda fuera de cámara reaparece junto al primero */
  if (!SL && humans().length >= 2 && raceT > 3) { const v = views()[0], cm = camFor(v), lead = camTarget();
    for (const r of humans()) { if (r === lead || r.fin || r.hold > 0) continue; const out = r.y < cm.y - cm.VH / 2 - 10 || Math.abs(r.x - cm.x) > cm.VW / 2 + 10;
      r.offT = out ? r.offT + dt : 0;
      if (r.offT > 0.4) { r.offT = 0; r.y = lead.y - 50; r.x = T.cx(r.y) + (r.p - 1.5) * 40; r.v = lead.v * 0.8; r.a = r.dir = 0; r.crash = 0; r.air = r.z = 0; r.hold = 0.7; r.inv = 1.5; r.trail.push(null); k.sfx('hurt'); msg = `${r.name}: ¡fuera de cámara!`; msgT = 1.4; } } }
  const hs = humans(), allH = hs.length && hs.every((r) => r.fin), firstF = finOrder.length ? finOrder[0].fin : 0;
  if ((allH && raceT - Math.max(...hs.map((r) => r.fin)) > 2.2) || finOrder.length >= 4 || (firstF && raceT - firstF > (SL ? 18 : 12)) || raceT > 150) endRun();
  updParts(dt);
}
function collide() {
  const act = racers.filter((r) => !r.fin && r.z < 0.3 && r.hold <= 0);
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) { const a = act[i], b = act[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = 22;
    if (d >= R || d < 0.01) continue; const nx = dx / d, ny = dy / d, ov = (R - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
    const im = Math.abs(nx) * 90; a.bx -= nx * im; b.bx += nx * im; if (ny > 0.5) { const t = (a.v - b.v) * 0.3; a.v -= t; b.v += t; }
    if (im > 40 && (!a.cpu || !b.cpu)) { k.sfx('hit'); for (let n = 0; n < 5; n++) addPart((a.x + b.x) / 2, (a.y + b.y) / 2, '#fff', 110, 0.3, 2); } }
}
function updParts(dt) { for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; p.life -= dt; } for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1); }
function estTime(r) { return raceT + r.pen + Math.max(0, T.LEN - r.y) / 170 + (SL ? (T.gates.length - r.g) * 1.5 : 0); }
function ranking() { return racers.slice().sort((a, b) => (SL ? (a.fin ? a.time : estTime(a)) - (b.fin ? b.time : estTime(b)) : (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.y - a.y))); }
function endRun() {
  const r = ranking();
  if (SL) racers.forEach((q) => { q.times[run] = q.fin ? q.time : estTime(q) + 5; q.dnf = !q.fin; });
  else r.forEach((q, i) => { q.gain = PTS[i]; q.pts += q.gain; });
  r.forEach((q, i) => { q.place = i + 1; });
  phase = 'stand'; phT = 5.5; k.sfx(r[0].cpu ? 'coin' : 'win'); if (!r[0].cpu) k.confetti(r[0].col, 60);
}
const total = (q) => q.times.reduce((s, t) => s + (t || 0), 0);
function nextRun() {
  if (run >= RUNS - 1) return finish();
  run++; startRun();
}
function finish() {
  const rows = racers.map((q) => ({ p: q.p, score: SL ? Math.round(total(q) * 10) : q.pts, name: q.name }));
  const champ = SL ? racers.slice().sort((a, b) => total(a) - total(b))[0] : racers.slice().sort((a, b) => b.pts - a.pts)[0], hw = !champ.cpu;
  if (!k.party || hw) { CUP = clamp(CUP + (hw ? 1 : k.party ? 0 : -1), 0, 5); try { localStorage.setItem('cup:' + CFG.id, CUP); } catch (e) { /* sin almacenamiento */ } }
  let head = null;
  if (!k.party) { const me = racers[0];
    if (SL) { let b = 0; try { b = +localStorage.getItem('bt:' + CFG.id) || 0; if (!b || total(me) < b) localStorage.setItem('bt:' + CFG.id, total(me).toFixed(1)); } catch (e) { /* sin almacenamiento */ } if (b && total(me) < b) head = '¡Récord personal!'; }
    else k.best(CFG.id, me.pts); }
  if (!head) head = hw && !k.party ? (SL ? '¡Oro en el slalom!' : '¡La copa es tuya!') : champ.cpu ? `¡Gana la ${champ.name}!` : null;
  k.podium(rows, Object.assign(SL ? { asc: true, fmt: (n) => fmtT(n / 10) } : { fmt: (n) => `${n} punto${n === 1 ? '' : 's'}` }, head ? { head } : {}));
}

/* ---------- Dibujo ---------- */
function drawWorld(v, tt) {
  const cm = camFor(v), VW = cm.VW, VH = cm.VH, x0 = cm.x - VW / 2, y0 = cm.y - VH / 2, x1 = x0 + VW, y1 = y0 + VH;
  c.save(); c.beginPath(); c.rect(v.x, v.y, v.w, v.h); c.clip();
  c.translate(v.x + v.w / 2, v.y + v.h / 2); c.scale(v.s, v.s); c.translate(-cm.x, -cm.y);
  c.fillStyle = PT.deep; c.fillRect(x0, y0, VW, VH);
  if (SL) {
    c.fillStyle = PT.piste; c.fillRect(NETL - 4, y0, NETR - NETL + 8, VH);
    c.fillStyle = 'rgba(120,160,210,.18)'; c.fillRect(NETL - 4, y0, 10, VH); c.fillRect(NETR - 6, y0, 10, VH);
    for (const [xx, cc] of [[NETL - 2, '#ff8a3d'], [NETR + 2, '#ff8a3d']]) { c.strokeStyle = OUT; c.lineWidth = 4.5; c.beginPath(); c.moveTo(xx, y0); c.lineTo(xx, y1); c.stroke(); c.setLineDash([10, 6]); c.strokeStyle = cc; c.lineWidth = 2.5; c.stroke(); c.setLineDash([]);
      for (let yy = Math.floor(y0 / 90) * 90; yy < y1; yy += 90) { rr(c, xx - 2, yy - 16, 4, 18, 1.5); fillOut(c, '#f2f2f7', 1.4); } }
    /* líneas azules de la pista en la zona de puertas */
    c.strokeStyle = 'rgba(80,130,220,.35)'; c.lineWidth = 2; c.setLineDash([4, 10]);
    c.beginPath(); for (let i = 1; i < T.gates.length; i++) { const g = T.gates[i], q = T.gates[i - 1]; if (g.y < y0 - 300 || q.y > y1 + 300) continue; c.moveTo(q.cx, q.y); c.lineTo(g.cx, g.y); } c.stroke(); c.setLineDash([]);
  } else {
    const L = [], R = [], st = 30; for (let yy = Math.floor(y0 / st) * st - st; yy <= y1 + st; yy += st) { const cx = T.cx(yy), hw = T.hw(yy); L.push([cx - hw, yy]); R.push([cx + hw, yy]); }
    c.beginPath(); L.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath();
    c.fillStyle = PT.piste; c.fill();
    for (const E of [L, R]) { c.beginPath(); E.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.lineWidth = 12; c.strokeStyle = 'rgba(150,185,225,.35)'; c.stroke(); c.lineWidth = 2; c.strokeStyle = 'rgba(90,120,170,.45)'; c.stroke(); }
    for (const o of T.obj) { if (o.y < y0 - 120 || o.y > y1 + 120) continue; drawObj(o, tt); }
  }
  /* meta y salida */
  for (const [yy, kind] of [[0, 's'], [T.LEN, 'f']]) { if (yy < y0 - 80 || yy > y1 + 80) continue; const cx = T.cx(yy), hw = SL ? CW / 2 - 16 : T.hw(yy), n = Math.max(8, Math.round(hw / 12));
    if (kind === 'f') for (let r = 0; r < 2; r++) for (let q = 0; q < n * 2; q++) { c.fillStyle = (q + r) % 2 ? OUT : '#fff'; c.fillRect(cx - hw + q * (hw / n), yy + r * 8, hw / n, 8); }
    else { c.fillStyle = 'rgba(255,90,95,.8)'; c.fillRect(cx - hw, yy + 14, hw * 2, 5); }
    for (const sd of [-1, 1]) { const px = cx + sd * (hw + 6); rr(c, px - 3, yy - 44, 6, 48, 2); fillOut(c, '#8a86a5', 1.8); }
    rr(c, cx - hw - 10, yy - 58, hw * 2 + 20, 18, 6); fillOut(c, kind === 'f' ? '#6e62f5' : '#ff5a5f', 2.2);
    c.font = '900 13px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(kind === 'f' ? 'META' : 'SALIDA', cx, yy - 49); }
  /* huellas */
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const r of racers) { const tr = r.trail; if (tr.length < 2) continue; c.strokeStyle = alpha(SL ? '#8fb3dc' : '#9dbde2', SL && v.r !== r ? 0.25 : 0.55); c.lineWidth = SL ? 2 : 3;
    for (const o of SL ? [-3.6, 3.6] : [-7, 7]) { c.beginPath(); let pen = false; for (let i = 0; i < tr.length; i++) { const p = tr[i]; if (!p) { pen = false; continue; } const q = tr[i + 1] || [r.x, r.y], a = Math.atan2(q[0] - p[0], q[1] - p[1]), ox = Math.cos(a) * o, oy = -Math.sin(a) * o; pen ? c.lineTo(p[0] + ox, p[1] + oy) : c.moveTo(p[0] + ox, p[1] + oy); pen = true; } c.stroke(); } }
  /* elementos de pie ordenados por profundidad */
  const B = [];
  for (const t of treesNear((y0 + y1) / 2 + 40, VH / 2 + 120)) if (t.x > x0 - 60 && t.x < x1 + 60 && t.y > y0 - 10 && t.y < y1 + 100) B.push([t.y, 0, t]);
  if (SL) for (const g of T.gates) if (g.y > y0 - 10 && g.y < y1 + 60) B.push([g.y, 1, g]);
  for (const r of racers) if (r.y > y0 - 60 && r.y < y1 + 80 && r.hold <= 0) B.push([r.y, 2, r]);
  B.sort((a, b) => a[0] - b[0]);
  for (const [, kind, o] of B) { if (kind === 0) drawPine(o); else if (kind === 1) { drawGatePole(o.cx - o.gap / 2, o.y, o.col, o.wob[0], false, tt); drawGatePole(o.cx + o.gap / 2, o.y, o.col, o.wob[1], true, tt); } else drawRacer(o, tt, SL && v.r !== o); }
  for (const p of parts) { c.globalAlpha = Math.min(1, p.life / p.max * 1.6) * 0.9; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); } c.globalAlpha = 1;
  /* etiquetas */
  for (const r of racers) { if (r.hold > 0 || r.y < y0 - 40 || r.y > y1 + 40) continue; let tag = null;
    if (k.party || humans().length > 1) tag = r.cpu ? 'CPU' : 'J' + (r.p + 1); else if (!r.cpu && raceT < 4) tag = 'TÚ';
    if (tag && !(SL && v.r !== r && r.cpu && humans().length > 1)) { const yy = r.y - r.z * 26 - 44; c.font = '900 11px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const tw = c.measureText(tag).width + 10; c.globalAlpha = SL && v.r !== r ? 0.55 : 1;
      rr(c, r.x - tw / 2, yy - 8, tw, 15, 6); c.fillStyle = r.col; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(tag, r.x, yy); c.globalAlpha = 1; } }
  for (const f of flo) { if (SL && f.r !== v.r) continue; const a = Math.min(1, f.t * 2); c.globalAlpha = a; c.save(); c.translate(f.r.x, f.r.y - 56 - (1.1 - f.t) * 30); c.scale(1 / v.s, 1 / v.s); label(f.txt, 0, 0, 16, f.col, 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
  c.restore();
  if (SL && views().length > 1 && v.x > 0) { c.fillStyle = OUT; c.fillRect(v.x - 2, 0, 4, H); }
}
function drawObj(o, tt) {
  if (o.k === 'ice') { c.beginPath(); c.ellipse(o.x, o.y, o.rx, o.ry, 0, 0, TAU); const g = c.createRadialGradient(o.x - o.rx * 0.3, o.y - o.ry * 0.3, 4, o.x, o.y, o.rx); g.addColorStop(0, '#e8fbff'); g.addColorStop(1, '#9fdcf2'); c.fillStyle = g; c.fill(); c.lineWidth = 2; c.strokeStyle = alpha(OUT, 0.35); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2.5; for (const d of [-0.3, 0.15]) { c.beginPath(); c.moveTo(o.x + o.rx * (d - 0.2), o.y - o.ry * 0.2 + d * 20); c.lineTo(o.x + o.rx * (d + 0.15), o.y - o.ry * 0.45 + d * 20); c.stroke(); } glint(c, o.x + o.rx * 0.3, o.y - o.ry * 0.3, 5); }
  else if (o.k === 'boost') { for (let i = 0; i < 3; i++) { const yy = o.y - o.l / 2 + 10 + i * 18, ph = (tt * 3 - i * 0.33) % 1; c.beginPath(); c.moveTo(o.x - o.w / 2 + 6, yy); c.lineTo(o.x, yy + 14); c.lineTo(o.x + o.w / 2 - 6, yy); c.lineTo(o.x + o.w / 2 - 6, yy + 8); c.lineTo(o.x, yy + 22); c.lineTo(o.x - o.w / 2 + 6, yy + 8); c.closePath(); c.fillStyle = ph < 0.5 ? '#ffd166' : '#ff9a3d'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); } }
  else if (o.k === 'ramp') { const x = o.x - o.w / 2, y = o.y - o.l; shadow(c, o.x, o.y + 6, o.w * 0.55, 0.22);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + o.w, y); c.lineTo(x + o.w + 6, o.y); c.lineTo(x - 6, o.y); c.closePath(); const g = c.createLinearGradient(0, y, 0, o.y); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bcd4ee'); c.fillStyle = g; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(x - 6, o.y); c.lineTo(x + o.w + 6, o.y); c.lineTo(x + o.w + 2, o.y + 12); c.lineTo(x - 2, o.y + 12); c.closePath(); fillOut(c, '#8fb0d6', 2); rr(c, x - 6, o.y - 4, o.w + 12, 7, 3); fillOut(c, '#9a6334', 2);
    c.fillStyle = alpha('#6e62f5', 0.55); for (let i = 0; i < 2; i++) { const yy = y + 8 + i * 11; c.beginPath(); c.moveTo(o.x - 12, yy); c.lineTo(o.x, yy + 8); c.lineTo(o.x + 12, yy); c.lineTo(o.x + 12, yy + 4); c.lineTo(o.x, yy + 12); c.lineTo(o.x - 12, yy + 4); c.closePath(); c.fill(); } }
}
function drawHUD() {
  const vs = views(), rk = ranking();
  for (const v of vs) { const r = v.r || camTarget(), me = SL ? r : r; if (!me) continue;
    const x = v.x + 8, y = 8, compact = v.w < 260;
    /* 1.28.1: con 3–4 columnas el panel pasa a una sola línea para tapar lo menos posible de la pista. */
    const slim = SL && vs.length >= 3, pw = slim ? v.w - 16 : compact ? v.w - 16 : 150, ph = slim ? 24 : compact ? 50 : 56;
    if (SL) { rr(c, x, y, pw, ph, 10); c.fillStyle = 'rgba(20,16,36,.66)'; c.fill(); c.lineWidth = 2; c.strokeStyle = vs.length > 1 ? me.col : OUT; c.stroke();
      const t = me.fin ? me.time : raceT + me.pen; label(fmtT(t), x + 7, y + (slim ? 4 : 5), slim ? 15 : compact ? 18 : 22, me.fin ? '#7cf7a0' : '#fff');
      const prog = `${ORD(rk.indexOf(me) + 1)}  ·  ${Math.min(me.g, T.gates.length)}/${T.gates.length}`;
      if (slim) label(prog, x + pw - 7, y + 6, 11, '#c9c3e6', 'right');
      else label(prog, x + 8, y + (compact ? 28 : 32), compact ? 12 : 14, '#c9c3e6');
      if (me.pen) label(`+${me.pen} s`, x + pw - 7, y + (slim ? ph + 2 : 5), slim ? 12 : compact ? 13 : 15, '#ff8a8a', 'right'); }
    else { const hs = humans(); if (hs.length <= 1) { const q = hs[0] || rk[0], pos = rk.indexOf(q) + 1; rr(c, x, y, 112, 56, 12); c.fillStyle = 'rgba(20,16,36,.66)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
        label(ORD(pos), x + 8, y + 3, 30, pos === 1 ? '#ffd166' : '#fff'); label('/4', x + 10 + c.measureText(ORD(pos)).width, y + 14, 16, '#c9c3e6'); label(q.fin ? '¡Meta!' : `${Math.round(clamp(q.y / T.LEN, 0, 1) * 100)} %`, x + 8, y + 36, 14, '#c9c3e6'); }
      else { let xx = x; for (const q of hs) { const pos = rk.indexOf(q) + 1; rr(c, xx, y, 76, 30, 9); c.fillStyle = 'rgba(20,16,36,.7)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = q.col; c.stroke(); label(`J${q.p + 1} ${ORD(pos)}`, xx + 7, y + 6, 16, q.col); xx += 82; } } }
  }
  /* barra de progreso de la bajada (derecha) */
  const bx = W - 18, by0 = SL ? 70 : 16, by1 = H - 20; rr(c, bx - 5, by0 - 5, 10, by1 - by0 + 10, 5); c.fillStyle = 'rgba(20,16,36,.45)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = '#fff'; c.fillRect(bx - 5, by1 - 2, 10, 4);
  for (const r of racers.slice().sort((a, b) => (a.cpu ? 0 : 1) - (b.cpu ? 0 : 1))) { const q = clamp(r.y / T.LEN, 0, 1); c.beginPath(); c.arc(bx, by0 + q * (by1 - by0), r.cpu ? 4 : 6, 0, TAU); c.fillStyle = r.col; c.fill(); c.lineWidth = 1.8; c.strokeStyle = OUT; c.stroke(); }
  if (msgT > 0 && phase === 'run') { c.globalAlpha = Math.min(1, msgT * 2); label(msg, W / 2, PORT ? 96 : 70, PORT ? 18 : 22, '#fff', 'center'); c.globalAlpha = 1; }
}
function drawStand() {
  const r = SL ? racers.slice().sort((a, b) => total(a) - total(b)) : racers.slice().sort((a, b) => b.pts - a.pts), bw = Math.min(W - 30, 460), bh = 76 + r.length * 40, x = (W - bw) / 2, y = (H - bh) / 2;
  c.fillStyle = 'rgba(10,6,20,.55)'; c.fillRect(0, 0, W, H);
  rr(c, x, y, bw, bh, 18); const g = c.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, '#3a3160'); g.addColorStop(1, '#221c3d'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  label(run >= RUNS - 1 ? 'Clasificación final' : `Tras la ${SL ? 'manga' : 'bajada'} ${run + 1} de ${RUNS}`, W / 2, y + 16, 21, '#ffd166', 'center');
  r.forEach((q, i) => { const yy = y + 58 + i * 40; rr(c, x + 12, yy, bw - 24, 34, 10); c.fillStyle = alpha(q.col, 0.22); c.fill(); c.lineWidth = 2; c.strokeStyle = q.col; c.stroke();
    label(`${i + 1}.`, x + 22, yy + 8, 17, '#fff'); label(q.name, x + 50, yy + 8, 17, q.col);
    if (SL) { const t = q.times[run]; label(`${fmtT(t)}${q.dnf ? '*' : ''}`, x + bw - 108, yy + 10, 14, '#c9c3e6', 'right'); label(fmtT(total(q)), x + bw - 22, yy + 8, 17, '#fff', 'right'); }
    else { label(`${q.pts}`, x + bw - 70, yy + 8, 17, '#fff', 'right'); if (q.gain) label(`+${q.gain}`, x + bw - 22, yy + 10, 14, '#7cf7a0', 'right'); } });
  if (SL && racers.some((q) => q.dnf)) label('* sin terminar: tiempo estimado + 5 s', W / 2, y + bh - 16, 11, '#c9c3e6', 'center');
}
function draw() {
  const tt = performance.now() / 1000;
  c.fillStyle = '#e8f2fb'; c.fillRect(0, 0, W, H);
  for (const v of views()) drawWorld(v, tt);
  if (phase === 'stand') drawStand(); else drawHUD();
}
reset();
k.show(CFG.title, CFG.help);
k.run(update, draw);
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
