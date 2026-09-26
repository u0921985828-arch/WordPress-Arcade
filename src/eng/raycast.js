/* Crystal Labyrinth — laberinto en primera persona (raycasting por columnas con texturas cacheadas).
 * Recoge 3 cristales para abrir el portal antes de que se apague el farol. Minimapa con niebla de guerra. */
const W = 480, H = 480, OUT = ART.OUT, R2 = 6.2832;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#07061a' }), c = k.ctx;
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
const COLS = 200, CW = W / COLS, FOV = 1.15, PL = Math.tan(FOV / 2), PROJ = W / 2 / PL, TS = 128, FOG = '#0c0822';
const GEM = ['#5ce1e6', '#ff5fa2', '#f2d15c'];
let g, N, px, py, pa, crystals, got, level, score, time, oil, oilMax, seen, mapCv, mapDirty, walk, bannerT, zb = new Float32Array(COLS), fade;

/* ---------- Utilidades de color ---------- */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (h, f) => { const v = hex(h).map((x) => Math.round(f > 0 ? x + (255 - x) * f : x * (1 + f))); return `rgb(${v})`; };
const srnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function mk(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')); return cv; }

/* ---------- Texturas de pared (64×64): 1 = sillería, 2 = sillería con vetas de cristal; cara oscura para lados Y ---------- */
function brick(g2, seed) {
  g2.fillStyle = '#231a44'; g2.fillRect(0, 0, 64, 64);
  for (let r = 0; r < 4; r++) for (let b = -1; b < 3; b++) {
    const x = b * 32 + (r % 2 ? 16 : 0) + 1.5, y = r * 16 + 1.5, s = srnd(seed + r * 7 + b * 3);
    g2.fillStyle = mix('#5a4a92', (s - 0.5) * 0.35); g2.fillRect(x, y, 29, 13);
    g2.fillStyle = 'rgba(255,255,255,.16)'; g2.fillRect(x, y, 29, 2.5); g2.fillStyle = 'rgba(10,5,30,.35)'; g2.fillRect(x, y + 10.5, 29, 2.5);
    g2.fillStyle = 'rgba(10,5,30,.25)'; for (let i = 0; i < 3; i++) g2.fillRect(x + 3 + srnd(seed + i + r * 11 + b) * 22, y + 3 + srnd(seed * 3 + i + b) * 7, 2, 2);
  }
  g2.strokeStyle = 'rgba(15,8,35,.55)'; g2.lineWidth = 1; g2.beginPath(); g2.moveTo(40, 17); g2.lineTo(44, 23); g2.lineTo(42, 28); g2.stroke();
}
function texture(kind) {
  return mk(TS, TS, (g2) => {
    g2.scale(2, 2); brick(g2, kind * 13);
    if (kind === 2) [[18, 40, 9, '#5ce1e6'], [44, 20, 7, '#ff5fa2'], [50, 50, 6, '#5ce1e6']].forEach(([x, y, r, col]) => {
      const gr = g2.createRadialGradient(x, y, 1, x, y, r * 2.2); gr.addColorStop(0, col + 'aa'); gr.addColorStop(1, col + '00'); g2.fillStyle = gr; g2.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
      g2.beginPath(); g2.moveTo(x, y - r * 1.4); g2.lineTo(x + r * 0.7, y); g2.lineTo(x, y + r * 1.1); g2.lineTo(x - r * 0.7, y); g2.closePath(); g2.fillStyle = col; g2.fill(); g2.lineWidth = 1.5; g2.strokeStyle = OUT; g2.stroke();
      g2.fillStyle = 'rgba(255,255,255,.75)'; g2.beginPath(); g2.moveTo(x - 1, y - r); g2.lineTo(x - r * 0.4, y); g2.lineTo(x - 1, y); g2.fill();
    });
  });
}
const TEX = {}; for (const kd of [1, 2]) { const t = texture(kd); TEX[kd] = [t, mk(TS, TS, (g2) => { g2.drawImage(t, 0, 0); g2.fillStyle = 'rgba(8,4,26,.38)'; g2.fillRect(0, 0, TS, TS); })]; }

/* ---------- Cielo/suelo, viñeta y cristales (fotogramas de giro) cacheados ---------- */
const BG = mk(W, H + 40, (g2) => {
  let gr = g2.createLinearGradient(0, 0, 0, H / 2 + 20); gr.addColorStop(0, '#05041a'); gr.addColorStop(0.7, '#1a1340'); gr.addColorStop(1, '#2a1f55'); g2.fillStyle = gr; g2.fillRect(0, 0, W, H / 2 + 20);
  g2.fillStyle = 'rgba(180,160,255,.5)'; for (let i = 0; i < 40; i++) { const x = srnd(i) * W, y = srnd(i + 50) * (H / 2 - 40); g2.globalAlpha = 0.15 + srnd(i + 9) * 0.35; g2.fillRect(x, y, 1.5, 1.5); } g2.globalAlpha = 1;
  gr = g2.createLinearGradient(0, H / 2 + 20, 0, H + 40); gr.addColorStop(0, '#1b1538'); gr.addColorStop(0.35, '#2c2350'); gr.addColorStop(1, '#4a3b78'); g2.fillStyle = gr; g2.fillRect(0, H / 2 + 20, W, H / 2 + 20);
  g2.strokeStyle = 'rgba(10,6,30,.35)'; g2.lineWidth = 1.5; // losas en perspectiva (fijas: dan sensación de suelo)
  for (let i = 1; i < 9; i++) { const y = H / 2 + 20 + Math.pow(i / 8, 2.2) * (H / 2 + 20); g2.beginPath(); g2.moveTo(0, y); g2.lineTo(W, y); g2.stroke(); }
  gr = g2.createLinearGradient(0, H / 2 - 30, 0, H / 2 + 70); gr.addColorStop(0, 'rgba(12,8,34,0)'); gr.addColorStop(0.5, FOG); gr.addColorStop(1, 'rgba(12,8,34,0)'); g2.fillStyle = gr; g2.fillRect(0, H / 2 - 30, W, 100);
});
const VIG = mk(W, H, (g2) => { const gr = g2.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H * 0.78); gr.addColorStop(0, 'rgba(5,3,18,0)'); gr.addColorStop(1, 'rgba(5,3,18,.85)'); g2.fillStyle = gr; g2.fillRect(0, 0, W, H); });
const GLOW = {}; GEM.forEach((col) => (GLOW[col] = mk(64, 64, (g2) => { const gr = g2.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, col + 'cc'); gr.addColorStop(0.4, col + '44'); gr.addColorStop(1, col + '00'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64); })));
function gemFrame(col, rot) {
  return mk(80, 112, (g2) => {
    g2.drawImage(GLOW[col], -8, 0, 96, 96);
    const cx = 40, top = 14, belt = 40, bot = 84, r = 17, V = [];
    for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; V.push([cx + Math.cos(a) * r, a]); }
    g2.lineJoin = 'round';
    for (let i = 0; i < 6; i++) {
      const [x1, a1] = V[i], [x2] = V[(i + 1) % 6], n = a1 + Math.PI / 6; if (Math.sin(n) < 0) continue; // sólo caras visibles
      const l = Math.cos(n + 0.6) * 0.45;
      g2.beginPath(); g2.moveTo(cx, top); g2.lineTo(x1, belt); g2.lineTo(x2, belt); g2.closePath(); g2.fillStyle = mix(col, l + 0.25); g2.fill(); g2.lineWidth = 1.2; g2.strokeStyle = 'rgba(26,21,48,.6)'; g2.stroke();
      g2.beginPath(); g2.moveTo(x1, belt); g2.lineTo(x2, belt); g2.lineTo(cx, bot); g2.closePath(); g2.fillStyle = mix(col, l - 0.1); g2.fill(); g2.stroke();
    }
    const xs = V.map((v) => v[0]), mn = Math.min(...xs), mxx = Math.max(...xs);
    g2.beginPath(); g2.moveTo(cx, top); g2.lineTo(mxx, belt); g2.lineTo(cx, bot); g2.lineTo(mn, belt); g2.closePath(); g2.lineWidth = 2.5; g2.strokeStyle = OUT; g2.stroke();
    g2.fillStyle = 'rgba(255,255,255,.85)'; g2.beginPath(); g2.moveTo(cx - 4, top + 8); g2.lineTo(cx - 8, belt - 3); g2.lineTo(cx - 5, belt - 3); g2.fill();
  });
}
const GEMF = GEM.map((col) => Array.from({ length: 16 }, (_, i) => gemFrame(col, i / 16 * Math.PI / 3)));
const PORT = mk(128, 160, () => {}), pc = PORT.getContext('2d');

/* ---------- Generador: backtracker (siempre conexo) + algunos atajos; cristales en callejones ---------- */
function carve(n) {
  const m = Array.from({ length: n }, () => Array(n).fill(1)), st = [[1, 1]]; m[1][1] = 0;
  while (st.length) { const [x, y] = st[st.length - 1]; const nb = k.shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]]).filter(([dx, dy]) => x + dx > 0 && y + dy > 0 && x + dx < n - 1 && y + dy < n - 1 && m[y + dy][x + dx] === 1);
    if (!nb.length) { st.pop(); continue; } const [dx, dy] = nb[0]; m[y + dy / 2][x + dx / 2] = 0; m[y + dy][x + dx] = 0; st.push([x + dx, y + dy]); }
  for (let i = 0; i < n / 3; i++) { const x = k.ri(1, n - 2), y = k.ri(1, n - 2); if (m[y][x] && ((x % 2 && !m[y - 1][x] && !m[y + 1][x]) || (y % 2 && !m[y][x - 1] && !m[y][x + 1]))) m[y][x] = 0; }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x] && srnd(x * 31 + y * 17 + n) < 0.12) m[y][x] = 2;
  return m;
}
function build() {
  N = Math.min(25, 9 + level * 2); g = carve(N); px = 1.5; py = 1.5; pa = g[1][2] ? Math.PI / 2 : 0; got = 0; time = 0;
  const free = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (!g[y][x] && x + y > 5 && !(x === N - 2 && y === N - 2)) free.push([x, y]);
  const dead = free.filter(([x, y]) => [g[y - 1][x], g[y + 1][x], g[y][x - 1], g[y][x + 1]].filter((v) => v).length === 3);
  k.shuffle(dead); k.shuffle(free); const pick = dead.concat(free.filter((q) => !dead.includes(q)));
  crystals = []; for (const [x, y] of pick) { if (crystals.length === 3) break; if (crystals.every((q) => Math.abs(q.x - x - 0.5) + Math.abs(q.y - y - 0.5) > 4)) crystals.push({ x: x + 0.5, y: y + 0.5, col: GEM[crystals.length], got: false }); }
  for (const [x, y] of pick) { if (crystals.length === 3) break; if (!crystals.some((q) => q.x === x + 0.5 && q.y === y + 0.5)) crystals.push({ x: x + 0.5, y: y + 0.5, col: GEM[crystals.length], got: false }); }
  oilMax = oil = Math.round(68 + N * N * 0.6); /* 1.23: +50 % de aceite */ seen = Array.from({ length: N }, () => Array(N).fill(false)); mapDirty = true; walk = 0; bannerT = 2.2; fade = 1;
}
function reset() { level = 1; score = 0; build(); }
reset(); k.show(CFG.title, 'Encuentra los 3 cristales para abrir el portal y sal antes de que se apague el farol. Cada cristal da más aceite. Flechas o WASD: andar y girar. Táctil: arrastra como un joystick.');
const solid = (x, y) => !g[Math.floor(y)] || g[Math.floor(y)][Math.floor(x)] !== 0;
const blocked = (x, y, r) => solid(x - r, y - r) || solid(x + r, y - r) || solid(x - r, y + r) || solid(x + r, y + r);

/* ---------- Lógica ---------- */
k.run((dt) => {
  if (!k.gate(reset)) return;
  time += dt; bannerT -= dt; fade = Math.max(0, fade - dt * 2); oil -= dt;
  if (oil <= 0) { oil = 0; return k.lose('crystal-labyrinth', score, 'Se apagó el farol', `Nivel ${level} · ${got}/3 cristales`); }
  let mv = 0, rot = 0;
  if (k.held.has('up')) mv = 1; if (k.held.has('down')) mv = -0.7; if (k.held.has('left')) rot = -1; if (k.held.has('right')) rot = 1;
  if (k.ptr.down) { const j = joy(); rot = Math.abs(j.x) > 0.12 ? j.x : 0; mv = Math.abs(j.y) > 0.12 ? -j.y : 0; if (Math.hypot(j.x, j.y) < 0.12) mv = 0; }
  pa += rot * 2.3 * dt; const sp = mv * 2.7 * dt, r = 0.22;
  const nx = px + Math.cos(pa) * sp, ny = py + Math.sin(pa) * sp;
  if (!blocked(nx, py, r)) px = nx; if (!blocked(px, ny, r)) py = ny;
  if (mv) walk += dt * 9 * Math.abs(mv);
  for (let y = Math.floor(py) - 2; y <= Math.floor(py) + 2; y++) for (let x = Math.floor(px) - 2; x <= Math.floor(px) + 2; x++) if (g[y] && g[y][x] !== undefined && !seen[y][x] && Math.hypot(x + 0.5 - px, y + 0.5 - py) < 2.6) { seen[y][x] = true; mapDirty = true; }
  for (const cr of crystals) if (!cr.got && Math.hypot(cr.x - px, cr.y - py) < 0.54) {
    cr.got = true; got++; oil = Math.min(oilMax + 30, oil + 15); score += 100 * level; k.sfx('coin'); navigator.vibrate && navigator.vibrate(25); k.flash(cr.col + '55'); k.burst(W / 2, H / 2, cr.col, 24, 220); k.float(`+${100 * level}`, W / 2, H / 2 - 30, cr.col);
    if (got === 3) { k.sfx('win'); setTimeout(() => k.float('¡Portal abierto!', W / 2, H / 2 + 10, '#7cf7a0'), 350); mapDirty = true; }
  }
  if (got === 3 && Math.hypot(N - 1.5 - px, N - 1.5 - py) < 0.55) {
    const bonus = Math.round(oil * 10) * level; score += 500 * level + bonus; k.sfx('win'); k.confetti(); k.flash('rgba(160,255,200,.6)'); k.float(`+${500 * level + bonus}`, W / 2, H / 2, '#7cf7a0'); level++; build();
  }
}, draw);

/* Joystick táctil: base en el punto de toque, radio 46 */
function joy() { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy, m = Math.hypot(dx, dy), s = m > 46 ? 46 / m : 1; return { x: dx * s / 46, y: dy * s / 46 }; }

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function draw() {
  const t = performance.now() / 1000, bob = Math.sin(walk) * 5, hz = H / 2 + bob, dx = Math.cos(pa), dy = Math.sin(pa), plx = -dy * PL, ply = dx * PL;
  const light = Math.min(1, oil / 20), view = 3.2 + 5.3 * light; // el farol alumbra menos cuando queda poco aceite
  c.drawImage(BG, 0, bob - 20);
  /* paredes: DDA por columna, textura por franja de 1 px y niebla por distancia */
  c.imageSmoothingEnabled = false;
  for (let i = 0; i < COLS; i++) {
    const cam = 2 * (i + 0.5) / COLS - 1, rx = dx + plx * cam, ry = dy + ply * cam;
    let mx = Math.floor(px), my = Math.floor(py); const ddx = Math.abs(1 / rx), ddy = Math.abs(1 / ry), sx = rx < 0 ? -1 : 1, sy = ry < 0 ? -1 : 1;
    let tx = (rx < 0 ? px - mx : mx + 1 - px) * ddx, ty = (ry < 0 ? py - my : my + 1 - py) * ddy, side = 0, cell = 1;
    for (let s = 0; s < 80; s++) { if (tx < ty) { tx += ddx; mx += sx; side = 0; } else { ty += ddy; my += sy; side = 1; } cell = g[my] ? g[my][mx] : 1; if (cell === undefined) cell = 1; if (cell !== 0) break; }
    const dist = Math.max(0.05, side ? ty - ddy : tx - ddx), h = PROJ / dist; zb[i] = dist;
    let wx = side ? px + dist * rx : py + dist * ry; wx -= Math.floor(wx); let tc = Math.floor(wx * TS); if ((!side && rx > 0) || (side && ry < 0)) tc = TS - 1 - tc;
    const x = i * CW, y0 = hz - h / 2;
    c.drawImage(TEX[cell][side], tc, 0, 1, TS, x, y0, CW + 0.6, h);
    const f = Math.min(1, dist / view); if (f > 0.04) { c.globalAlpha = f * f * 0.6 + f * 0.4; c.fillStyle = FOG; c.fillRect(x, y0, CW + 0.6, h); c.globalAlpha = 1; }
  }
  c.imageSmoothingEnabled = true;
  /* sprites: cristales y portal, ordenados de lejos a cerca */
  const spr = crystals.filter((q) => !q.got).map((q) => ({ x: q.x, y: q.y, q })); spr.push({ x: N - 1.5, y: N - 1.5, portal: true });
  for (const s of spr) { const rx = s.x - px, ry = s.y - py; s.a = rx * dx + ry * dy; s.b = (rx * plx + ry * ply) / (PL * PL); }
  spr.sort((a, b) => b.a - a.a);
  for (const s of spr) {
    if (s.a < 0.15) continue; const sc = PROJ / s.a, cx = W / 2 * (1 + s.b / s.a), f = Math.min(1, s.a / view);
    if (s.portal) { portalFrame(t); const w = sc * 0.95, hh = w * 1.25; billboard(PORT, cx - w / 2, hz + sc * 0.5 - hh, w, hh, s.a, 1 - f * 0.85); }
    else { const fr = GEMF[GEM.indexOf(s.q.col)][Math.floor(t * 10 + s.x * 3) % 16], w = sc * 0.42, hh = w * 1.4, fy = Math.sin(t * 2.5 + s.x) * sc * 0.04;
      const ci = Math.floor(cx / CW); if (ci >= 0 && ci < COLS && zb[ci] > s.a) { c.globalAlpha = 0.35 * (1 - f); c.fillStyle = '#000'; c.beginPath(); c.ellipse(cx, hz + sc * 0.5, w * 0.26 * (1 - fy / sc * 4), w * 0.06, 0, 0, R2); c.fill(); c.globalAlpha = 1; }
      billboard(fr, cx - w / 2, hz + sc * 0.26 - hh * 0.5 + fy, w, hh, s.a, 1 - f * 0.8); }
  }
  c.drawImage(VIG, 0, 0); if (light < 1) { c.globalAlpha = (1 - light) * 0.45; c.fillStyle = '#05030f'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  lantern(t, bob, light); minimap(t); hud(t);
  if (k.ptr.down && k.st === 'play') { const j = joy(); c.globalAlpha = 0.5; c.beginPath(); c.arc(k.ptr.sx, k.ptr.sy, 46, 0, R2); c.fillStyle = 'rgba(255,255,255,.12)'; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke(); c.globalAlpha = 0.85;
    c.beginPath(); c.arc(k.ptr.sx + j.x * 46, k.ptr.sy + j.y * 46, 20, 0, R2); ART.fillOut(c, '#b8a8ff', 2.5); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(k.ptr.sx + j.x * 46 - 6, k.ptr.sy + j.y * 46 - 6, 6, 0, R2); c.fill(); c.globalAlpha = 1; }
  if (fade > 0) { c.globalAlpha = fade; c.fillStyle = '#05030f'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
}
/* Dibuja una imagen en franjas visibles según el z-buffer (oclusión por columnas agrupadas) */
function billboard(img, x0, y0, w, h, d, alpha) {
  const i0 = Math.max(0, Math.floor(x0 / CW)), i1 = Math.min(COLS - 1, Math.floor((x0 + w) / CW)); if (i1 < i0 || w < 1) return;
  c.globalAlpha = Math.max(0, alpha); let run = -1;
  for (let i = i0; i <= i1 + 1; i++) {
    const vis = i <= i1 && zb[i] > d;
    if (vis && run < 0) run = i;
    if (!vis && run >= 0) { const xs = Math.max(x0, run * CW), xe = Math.min(x0 + w, i * CW), sx = (xs - x0) / w * img.width, sw = (xe - xs) / w * img.width; if (sw > 0.1) c.drawImage(img, sx, 0, sw, img.height, xs, y0, xe - xs, h); run = -1; }
  }
  c.globalAlpha = 1;
}
/* Portal: arco de piedra; cerrado muestra 3 engastes, abierto un remolino animado */
function portalFrame(t) {
  const q = pc, open = got === 3; q.clearRect(0, 0, 128, 160); q.lineJoin = 'round';
  if (open) { const gr = q.createRadialGradient(64, 86, 4, 64, 86, 70); gr.addColorStop(0, 'rgba(124,247,160,.6)'); gr.addColorStop(1, 'rgba(124,247,160,0)'); q.fillStyle = gr; q.fillRect(0, 0, 128, 160); }
  q.beginPath(); q.moveTo(10, 160); q.lineTo(10, 70); q.arc(64, 70, 54, Math.PI, 0); q.lineTo(118, 160); q.closePath(); ART.fillOut(q, '#6a5aa6', 3);
  q.strokeStyle = 'rgba(26,21,48,.5)'; q.lineWidth = 2; for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; q.beginPath(); q.moveTo(64 + Math.cos(a) * 40, 70 + Math.sin(a) * 40); q.lineTo(64 + Math.cos(a) * 54, 70 + Math.sin(a) * 54); q.stroke(); }
  for (let y = 90; y < 160; y += 22) { q.beginPath(); q.moveTo(10, y); q.lineTo(24, y); q.moveTo(104, y); q.lineTo(118, y); q.stroke(); }
  q.fillStyle = 'rgba(255,255,255,.18)'; q.fillRect(13, 72, 5, 86);
  q.beginPath(); q.moveTo(24, 160); q.lineTo(24, 70); q.arc(64, 70, 40, Math.PI, 0); q.lineTo(104, 160); q.closePath(); q.fillStyle = open ? '#1d6b52' : '#150f2c'; q.fill(); q.lineWidth = 2.5; q.strokeStyle = OUT; q.stroke();
  q.save(); q.clip();
  if (open) { q.translate(64, 100); for (let i = 0; i < 5; i++) { q.rotate(t * 1.6 + i * 1.256); q.beginPath(); for (let a = 0; a < 7; a += 0.3) q.lineTo(Math.cos(a) * a * 7, Math.sin(a) * a * 7); q.lineWidth = 5; q.strokeStyle = i % 2 ? 'rgba(124,247,160,.8)' : 'rgba(180,255,240,.6)'; q.stroke(); }
    q.setTransform(1, 0, 0, 1, 0, 0); q.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const a = t * 2 + i, r = (t * 30 + i * 13) % 40; q.globalAlpha = 1 - r / 40; q.fillRect(64 + Math.cos(a) * r, 100 + Math.sin(a) * r, 3, 3); } q.globalAlpha = 1; }
  else { q.fillStyle = 'rgba(120,100,200,.25)'; q.fillRect(24, 20, 80, 140); }
  q.restore();
  GEM.forEach((col, i) => { const x = 40 + i * 24, y = 30, on = crystals.some((cr) => cr.col === col && cr.got); q.beginPath(); q.moveTo(x, y - 8); q.lineTo(x + 6, y); q.lineTo(x, y + 8); q.lineTo(x - 6, y); q.closePath(); ART.fillOut(q, on ? col : '#2a2248', 2); });
}
/* Farol en la mano (abajo a la derecha), con balanceo al andar */
function lantern(t, bob, light) {
  const x = 408 + Math.cos(walk * 0.5) * 6, y = 372 + bob * 1.4, fl = 0.85 + Math.sin(t * 23) * 0.08 + Math.sin(t * 7) * 0.07;
  c.save(); c.globalAlpha = 0.25 * light * fl; c.drawImage(GLOW[GEM[2]], x - 90, y - 60, 180, 180); c.restore();
  c.lineCap = 'round'; c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.arc(x, y - 44, 16, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.lineWidth = 3.5; c.strokeStyle = '#8f86b8'; c.stroke();
  ART.rr(c, x - 24, y - 40, 48, 12, 5); ART.fillOut(c, '#3f3566', 2.5);
  ART.rr(c, x - 20, y - 28, 40, 58, 8); ART.fillOut(c, light > 0.1 ? '#ffd98a' : '#6b5a45', 2.5);
  c.fillStyle = `rgba(255,${Math.round(150 + 60 * fl)},60,${0.9 * light})`; c.beginPath(); c.moveTo(x, y - 18 - 6 * fl); c.quadraticCurveTo(x + 9, y + 4, x, y + 10); c.quadraticCurveTo(x - 9, y + 4, x, y - 18 - 6 * fl); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(x - 15, y - 24, 4, 44); c.strokeStyle = 'rgba(26,21,48,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 7, y - 28); c.lineTo(x - 7, y + 30); c.moveTo(x + 7, y - 28); c.lineTo(x + 7, y + 30); c.stroke();
  ART.rr(c, x - 24, y + 28, 48, 12, 5); ART.fillOut(c, '#3f3566', 2.5);
  // brazo con manga y puño que sujeta la argolla
  c.beginPath(); c.moveTo(x + 10, y - 74); c.quadraticCurveTo(x + 50, y - 100, W + 10, y - 84); c.lineTo(W + 10, y + 6); c.quadraticCurveTo(x + 56, y - 30, x + 34, y - 50); c.closePath(); ART.fillOut(c, '#3a4a8a', 2.5);
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 30, y - 78); c.quadraticCurveTo(x + 55, y - 88, W, y - 76); c.stroke();
  c.save(); c.translate(x + 22, y - 64); c.rotate(1.2); ART.rr(c, -16, -6, 32, 12, 5); ART.fillOut(c, '#2b3668', 2.5); c.restore();
  c.beginPath(); c.ellipse(x + 4, y - 60, 13, 11, -0.3, 0, R2); ART.fillOut(c, '#f0c49c', 2.5);
  c.strokeStyle = 'rgba(26,21,48,.55)'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x - 6, y - 58); c.lineTo(x + 2, y - 52); c.moveTo(x - 3, y - 64); c.lineTo(x + 6, y - 57); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x + 2, y - 66, 5, 2.5, -0.3, 0, R2); c.fill();
}
/* Minimapa con niebla de guerra y cono de visión */
function minimap(t) {
  const size = 118, ms = size / N, ox = W - size - 12, oy = 12;
  if (mapDirty || !mapCv || mapCv.n !== N) {
    mapCv = mapCv && mapCv.n === N ? mapCv : mk(size * 2, size * 2, () => {}); mapCv.n = N; const q = mapCv.getContext('2d'); q.setTransform(2, 0, 0, 2, 0, 0); q.clearRect(0, 0, size, size);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (seen[y][x]) { q.fillStyle = g[y][x] ? (g[y][x] === 2 ? '#6fd9e0' : '#8c7ccc') : '#2a2250'; q.fillRect(x * ms, y * ms, ms + 0.3, ms + 0.3); }
    mapDirty = false;
  }
  ART.rr(c, ox - 5, oy - 5, size + 10, size + 10, 10); ART.fillOut(c, 'rgba(10,7,30,.78)', 2.5);
  c.drawImage(mapCv, ox, oy, size, size);
  c.save(); c.beginPath(); c.rect(ox, oy, size, size); c.clip();
  const pxm = ox + px * ms, pym = oy + py * ms;
  c.fillStyle = 'rgba(255,217,138,.28)'; c.beginPath(); c.moveTo(pxm, pym); c.arc(pxm, pym, ms * 3.2, pa - FOV / 2, pa + FOV / 2); c.closePath(); c.fill();
  for (const cr of crystals) if (!cr.got && seen[Math.floor(cr.y)][Math.floor(cr.x)]) { c.fillStyle = cr.col; c.beginPath(); c.arc(ox + cr.x * ms, oy + cr.y * ms, Math.max(2, ms * 0.35), 0, R2); c.fill(); }
  if (got === 3 || seen[N - 2][N - 2]) { const pr = Math.max(2.5, ms * 0.45) * (1 + (got === 3 ? Math.sin(t * 6) * 0.3 : 0)); c.beginPath(); c.arc(ox + (N - 1.5) * ms, oy + (N - 1.5) * ms, pr, 0, R2); c.fillStyle = got === 3 ? '#7cf7a0' : '#5a4a92'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); }
  c.translate(pxm, pym); c.rotate(pa); c.beginPath(); c.moveTo(5, 0); c.lineTo(-3.5, 3.5); c.lineTo(-2, 0); c.lineTo(-3.5, -3.5); c.closePath(); ART.fillOut(c, '#ff5fa2', 1.5);
  c.restore();
}
function gemIcon(x, y, s, col, on) { c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.65, y - s * 0.2); c.lineTo(x, y + s); c.lineTo(x - s * 0.65, y - s * 0.2); c.closePath(); ART.fillOut(c, on ? col : 'rgba(255,255,255,.12)', 2); if (on) { c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(x - 1, y - s * 0.7); c.lineTo(x - s * 0.4, y - s * 0.2); c.lineTo(x - 1, y - s * 0.2); c.fill(); } }
function hud(t) {
  ART.rr(c, 10, 10, 150, 72, 12); ART.fillOut(c, 'rgba(10,7,30,.7)', 2.5);
  crystals.forEach((cr, i) => gemIcon(30 + i * 26, 30, 11, cr.col, cr.got));
  label(`Nv ${level}`, 150, 20, 15, '#b8a8ff', 'right');
  label(`${score}`, 20, 48, 14, '#fff');
  // barra de aceite del farol
  const fr = Math.min(1, oil / oilMax), low = oil < 15, bx = 20, by = 68, bw = 130;
  ART.rr(c, bx, by, bw, 8, 4); ART.fillOut(c, '#1a1530', 1.5); if (fr > 0) { ART.rr(c, bx + 1, by + 1, Math.max(6, (bw - 2) * fr), 6, 3); c.fillStyle = low ? (Math.sin(t * 10) > 0 ? '#ff5f7a' : '#ff9a5c') : '#ffc85c'; c.fill(); }
  label(`${Math.ceil(oil)} s`, 150, 48, 13, low ? '#ff9a9a' : '#ffd98a', 'right');
  if (bannerT > 0) { c.globalAlpha = Math.min(1, bannerT); label(`Nivel ${level}`, W / 2, H / 2 - 70, 34, '#fff', 'center'); label(got === 3 ? 'Ve al portal' : 'Busca los 3 cristales', W / 2, H / 2 - 30, 16, '#d8ccff', 'center'); c.globalAlpha = 1; }
  if (got === 3 && bannerT <= 0) label('Portal abierto: busca la luz verde', W / 2, H - 30, 14, '#7cf7a0', 'center');
}
