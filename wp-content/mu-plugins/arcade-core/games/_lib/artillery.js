/* Artillería (1–4 jugadores; la CPU rellena las plazas vacías). Terreno destructible: máscara Uint8Array (colisiones) +
 * lienzo propio a 2× (textura) que se reutiliza en cada ronda (sin crear lienzos nuevos por explosión).
 * CFG.mode: 'cannon'  Cañones de Colina: tanques por turnos, viento, obús / triple / pesado; gana quien gane 2 rondas.
 *           'worms'   Bichos Artilleros: equipos de 3 bichos por turnos con bazuca, granada y cuerda; una batalla hasta el último equipo.
 *           'snow'    Guerra de Bolas de Nieve: en tiempo real, parábola, fuertes de nieve que se derriten al sol; 3 rondas a puntos.
 * Mando: ← → andar, ↑ ↓ ángulo, A mantener = cargar y soltar = disparar, B = cambiar arma (nieve: agacharse y hacer bolas).
 * Táctil en solitario: arrastra hacia atrás como un tirachinas y suelta. */
const M = CFG.mode || 'cannon', OUT = ART.OUT, TAU = Math.PI * 2, lite = ART.lite, dark = ART.dark, alpha = ART.alpha, hyp = Math.hypot;
const W = 800, H = 450;
const MD = {
  cannon: { th: 'meadow', turn: 1, units: 1, hp: 100, wind: 1, wins: 2, turnLen: 25, v0: 150, v1: 470, sd: 18, water: 24, base: 0.6, amp: 70, fuel: 1.3, walk: 34, kb: 120 },
  worms: { th: 'jungle', turn: 1, units: 3, hp: 60, wind: 1, wins: 1, turnLen: 30, v0: 150, v1: 470, sd: 21, water: 30, base: 0.64, amp: 60, walk: 42, kb: 300 },
  snow: { th: 'snow', turn: 0, units: 1, hp: 3, wind: 0.35, rounds: 3, len: 60, v0: 170, v1: 380, water: 0, base: 0.8, amp: 10, walk: 70 },
}[M];
const WEAP = {
  cannon: [{ id: 'obus', name: 'Obús', r: 30, dmg: 42, n: -1 }, { id: 'triple', name: 'Triple', r: 20, dmg: 24, n: 2 }, { id: 'pesado', name: 'Pesado', r: 50, dmg: 62, n: 1 }],
  worms: [{ id: 'bazuca', name: 'Bazuca', r: 30, dmg: 40, n: -1 }, { id: 'granada', name: 'Granada', r: 32, dmg: 44, n: -1 }, { id: 'cuerda', name: 'Cuerda', n: -1 }],
  snow: [{ id: 'bola', name: 'Bola', r: 7, dmg: 1, n: -1 }],
}[M];
const TH = ART.THEMES[MD.th];
const G = 330, GU = 620, WA = 70;
const k = Kit({ w: W, h: H, title: CFG.title, bg: TH.sky[0] }), c = k.ctx;
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
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
let CPU = 0; try { CPU = Math.min(8, +localStorage.getItem('cpu:' + CFG.id) || 0); } catch (e) { /* sin almacenamiento */ }
const skill = () => Math.min(0.8, 0.2 + CPU * 0.06);
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'center'; c.textBaseline = base || 'middle';
  c.lineJoin = 'round'; c.lineWidth = size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}

/* ---------------------------------------------------------------- Terreno */
const mask = new Uint8Array(W * H), FM = M === 'snow' ? new Uint8Array(W * H) : null;
const S1 = document.createElement('canvas'); S1.width = W; S1.height = H; const s1 = S1.getContext('2d', { willReadFrequently: true });
const TR = 2, TC = document.createElement('canvas'); TC.width = W * TR; TC.height = H * TR; const tg = TC.getContext('2d');
let fortPath = null, groundTop = new Float32Array(W);
const solid = (x, y) => { x = x | 0; y = y | 0; return x >= 0 && x < W && y >= 0 && y < H && mask[y * W + x] === 1; };
const rs = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function heights(base, amp) {
  const ph = [k.rnd(0, TAU), k.rnd(0, TAU), k.rnd(0, TAU)], f = [k.rnd(0.8, 1.6), k.rnd(2.2, 3.6), k.rnd(6, 9)], out = [];
  for (let x = 0; x <= W; x += 4) out.push([x, base * H + amp * (0.62 * Math.sin(x / W * TAU * f[0] / 2 + ph[0]) + 0.28 * Math.sin(x / W * TAU * f[1] / 2 + ph[1]) + 0.1 * Math.sin(x / W * TAU * f[2] / 2 + ph[2]))]);
  return out;
}
function fortBricks(p, cx, h) { /* fuerte de bloques de nieve: filas desplazadas, almenas arriba */
  const bw = 15, bh = 10, rows = Math.round(h / bh), top = groundTop[Math.round(cx)] + 2;
  const brick = (x, y, w) => (p.roundRect ? p.roundRect(x, y, w, bh + 1, 3) : p.rect(x, y, w, bh + 1));
  for (let r = 0; r < rows; r++) { const y = top - (r + 1) * bh;
    if (r % 2) { brick(cx - bw, y, bw / 2); brick(cx - bw / 2, y, bw); brick(cx + bw / 2, y, bw / 2); } else { brick(cx - bw, y, bw); brick(cx, y, bw); } }
  const y = top - rows * bh; for (const dx of [-11, 5]) p.roundRect ? p.roundRect(cx + dx - 3, y - 7, 9, 8, 3) : p.rect(cx + dx - 3, y - 7, 9, 8);
}
function genTerrain(seats) {
  const path = new Path2D(), hs = heights(MD.base, MD.amp);
  path.moveTo(0, H + 2); for (const [x, y] of hs) path.lineTo(x, y); path.lineTo(W, H + 2); path.closePath();
  for (const [x, y] of hs) for (let i = 0; i < 4 && x + i < W; i++) groundTop[x + i] = y;
  if (M === 'worms') { /* islas flotantes y un puente de roca */
    const n = k.ri(2, 3); for (let i = 0; i < n; i++) { const cx = W * (0.2 + 0.6 * (i + 0.5) / n) + k.rnd(-40, 40), cy = H * k.rnd(0.28, 0.4), rw = k.rnd(55, 85), rh = k.rnd(16, 24);
      path.moveTo(cx + rw, cy); path.ellipse(cx, cy, rw, rh, 0, 0, TAU); path.moveTo(cx + rw * 0.55, cy + rh * 0.5); path.ellipse(cx, cy + rh * 0.6, rw * 0.55, rh * 0.9, 0, 0, Math.PI); }
  }
  fortPath = null;
  if (M === 'snow') { fortPath = new Path2D(); seats.forEach((sx, i) => { for (const s of [-1, 1]) if (seats.some((o) => (o - sx) * s > 0)) fortBricks(fortPath, sx + s * 46, k.ri(46, 56)); }); }
  s1.setTransform(1, 0, 0, 1, 0, 0); s1.clearRect(0, 0, W, H); s1.fillStyle = '#000'; s1.fill(path); if (fortPath) s1.fill(fortPath);
  let d = s1.getImageData(0, 0, W, H).data; for (let i = 0; i < W * H; i++) mask[i] = d[i * 4 + 3] > 110 ? 1 : 0;
  if (FM) { s1.clearRect(0, 0, W, H); s1.fill(fortPath); d = s1.getImageData(0, 0, W, H).data; for (let i = 0; i < W * H; i++) FM[i] = d[i * 4 + 3] > 110 ? 1 : 0; }
  d = null;
  /* textura */
  tg.setTransform(TR, 0, 0, TR, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H);
  const pal = M === 'snow' ? ['#e9f3ff', '#9fb7d4', '#ffffff', '#c7dcf2'] : M === 'worms' ? ['#7a5634', '#3f2a19', '#3cc96a', '#2a9e50'] : ['#9a6a42', '#4f321f', '#5ccf5a', '#3aa845'];
  tg.save(); tg.clip(path); let g = tg.createLinearGradient(0, H * 0.35, 0, H); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); tg.fillStyle = g; tg.fillRect(0, 0, W, H);
  if (M === 'snow') { for (let i = 0; i < 90; i++) { tg.fillStyle = alpha('#ffffff', 0.5); tg.beginPath(); tg.arc(rs(i) * W, H * 0.8 + rs(i + 9) * H * 0.2, 1 + rs(i + 3) * 2, 0, TAU); tg.fill(); } }
  else {
    tg.strokeStyle = alpha(OUT, 0.13); tg.lineWidth = 3; for (let j = 1; j < 7; j++) { tg.beginPath(); for (let x = 0; x <= W; x += 20) tg.lineTo(x, H * 0.52 + j * 30 + Math.sin(x * 0.012 + j * 2) * 9); tg.stroke(); }
    for (let i = 0; i < 70; i++) { const x = k.rnd(0, W), y = k.rnd(H * 0.3, H), r = k.rnd(2, 6); tg.beginPath(); tg.ellipse(x, y, r * 1.4, r, k.rnd(0, 3), 0, TAU); tg.fillStyle = i % 3 ? alpha(lite(pal[0], 0.2), 0.8) : alpha(dark(pal[1], 0.2), 0.6); tg.fill(); tg.lineWidth = 1.2; tg.strokeStyle = alpha(OUT, 0.5); tg.stroke(); }
    if (M === 'worms') for (let i = 0; i < 14; i++) { const x = k.rnd(0, W), y = k.rnd(H * 0.45, H); tg.strokeStyle = alpha('#c8a070', 0.55); tg.lineWidth = 2; tg.beginPath(); tg.moveTo(x, y); tg.quadraticCurveTo(x + 8, y + 10, x + k.rnd(-10, 10), y + 22); tg.stroke(); }
  }
  tg.restore();
  if (fortPath) { tg.save(); tg.clip(fortPath); g = tg.createLinearGradient(0, H * 0.55, 0, H * 0.8); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfe2f6'); tg.fillStyle = g; tg.fillRect(0, 0, W, H); tg.restore();
    tg.lineWidth = 1.4; tg.strokeStyle = alpha('#7f9fc6', 0.9); tg.stroke(fortPath); }
  /* capa superior (hierba o nieve) en cada superficie que mira hacia arriba */
  for (let x = 0; x < W; x++) for (let y = 1; y < H; y++) if (mask[y * W + x] && !mask[(y - 1) * W + x]) {
    if (FM && FM[y * W + x]) continue;
    tg.fillStyle = pal[2]; tg.fillRect(x, y, 1.1, M === 'snow' ? 7 : 5); tg.fillStyle = pal[3]; tg.fillRect(x, y + (M === 'snow' ? 7 : 5), 1.1, 2);
  }
  tg.lineJoin = 'round'; tg.lineWidth = 2.6; tg.strokeStyle = OUT; tg.stroke(path);
  if (fortPath) { /* contorno exterior de los fuertes */ tg.fillStyle = OUT;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (FM[i] && (!mask[i - 1] || !mask[i + 1] || !mask[i - W])) tg.fillRect(x - 0.4, y - 0.4, 1.3, 1.3); } }
}
const RIM = M === 'snow' ? '#b9d3ef' : '#3a2415';
function carve(x, y, r, onlyFort) {
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
  let any = false;
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const i = yy * W + xx; if ((xx - x) * (xx - x) + (yy - y) * (yy - y) <= r * r && mask[i] && (!onlyFort || FM[i])) { mask[i] = 0; if (FM) FM[i] = 0; any = true; } }
  if (!any) return false;
  tg.save(); if (onlyFort) tg.clip(fortPath);
  tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = alpha(RIM, M === 'snow' ? 0.9 : 0.75); tg.beginPath(); tg.arc(x, y, r + (M === 'snow' ? 2.5 : 5), 0, TAU); tg.fill();
  tg.globalCompositeOperation = 'destination-out'; tg.beginPath(); tg.arc(x, y, r, 0, TAU); tg.fill();
  tg.globalCompositeOperation = 'source-atop'; tg.lineWidth = 2.4; tg.strokeStyle = OUT; tg.beginPath(); tg.arc(x, y, r + 0.7, 0, TAU); tg.stroke();
  tg.restore(); return true;
}
function surfaceY(x) { for (let y = 0; y < H; y++) if (solid(x, y)) return y - 1; return H + 50; }

/* ---------------------------------------------------------------- Jugadores y unidades */
let P = [], U = [], shots = [], booms = [], amb = [], graves = [];
let T = 0, round = 0, phase = 'start', cdPend = false, btw = 0, banner = null, bannerT = 0, wind = 0, wl = H, turnNo = 0, turnT = 0, cur = null, ti = -1, fuel = 0, rt = 0, meltT = 0, elim = [], firstCpu = true, lastT = 0, drag = null, plan = null;
function nSeats() { if (k.party) return Math.max(2, Math.max(...k.party.map((x) => x.p)) + 1); return M === 'worms' ? 2 : 3; }
function mkPlayers() { P = k.players(nSeats()).map((q, i) => ({ i, p: q.p, col: q.color, name: q.cpu ? 'CPU ' + (i + 1) : q.name, cpu: q.cpu, wins: 0, pts: 0, dmg: 0, ui: 0, gain: 0, ammo: {} })); }
function syncPlayers() { const pl = k.players(P.length); P.forEach((x, i) => { x.cpu = pl[i].cpu; x.name = pl[i].cpu ? 'CPU ' + (i + 1) : pl[i].name; x.col = pl[i].color; }); }
k.onParty = () => { if (k.st !== 'play') reset(); else syncPlayers(); }; /* a mitad de partida, la CPU ocupa el sitio de quien se va */
function seatsX(n) { return { 2: [110, 690], 3: [100, 400, 700], 4: [90, 303, 497, 710] }[n] || [110, 690]; }
function newRound() {
  round++; rt = 0; turnNo = 0; shots = []; booms = []; graves = []; elim = []; plan = null; drag = null; cur = null; firstCpu = true; meltT = 0;
  const n = P.length, seats = seatsX(n);
  genTerrain(seats);
  wl = MD.water ? H - MD.water : H + 40;
  U = [];
  if (M === 'snow') P.forEach((pl, i) => U.push(mkUnit(i, seats[i])));
  else {
    const tot = n * MD.units, xs = []; let tries = 0;
    while (xs.length < tot && tries++ < 4000) { const x = k.rnd(30, W - 30), y = surfaceY(x); if (y > wl - 12 || y < 40) continue; if (xs.some((o) => Math.abs(o - x) < (MD.units > 1 ? 44 : 150) - tries / 60)) continue; xs.push(x); }
    while (xs.length < tot) xs.push(k.rnd(30, W - 30));
    if (MD.units === 1) xs.sort((a, b) => a - b); else k.shuffle(xs);
    const order = MD.units === 1 ? k.shuffle(P.map((_, i) => i)) : null;
    for (let j = 0; j < tot; j++) U.push(mkUnit(MD.units === 1 ? order[j] : j % n, xs[j]));
  }
  P.forEach((pl) => { pl.ui = 0; pl.gain = 0; pl.ammo = {}; WEAP.forEach((w) => (pl.ammo[w.id] = w.n)); });
  U.forEach((u) => (u.face = u.x < W / 2 ? 1 : -1));
  ti = (round - 2 + n) % n; wind = 0; phase = 'start'; cdPend = true; banner = null;
  if (M === 'snow') wind = k.rnd(-1, 1) * MD.wind;
}
function mkUnit(team, x) {
  const u = { team, x, y: 0, vx: 0, vy: 0, air: false, hp: MD.hp, max: MD.hp, alive: true, face: 1, elev: M === 'snow' ? 0.75 : 0.7, power: 0, chg: false, hurt: 0, walkT: 0, crouch: false, ammo: 2, pack: 0, cd: 0, stun: 0, home: x, rope: null, weap: 0, ai: { cd: k.rnd(1.2, 2.2), plan: null }, id: Math.random() };
  u.y = surfaceY(x); return u;
}
function reset() { mkPlayers(); round = 0; newRound(); }
const teamAlive = (t) => U.some((u) => u.alive && u.team === t);
const aliveTeams = () => P.filter((pl) => teamAlive(pl.i));
const pOf = (u) => P[u.team];
const aimVec = (u) => { const a = u.face > 0 ? -u.elev : Math.PI + u.elev; return [Math.cos(a), Math.sin(a)]; };
const muzzle = (u) => { const [dx, dy] = aimVec(u); return M === 'cannon' ? [u.x + dx * 18, u.y - 13 + dy * 18] : M === 'worms' ? [u.x + dx * 14, u.y - 9 + dy * 14] : [u.x + dx * 8 + u.face * 2, u.y - 26 + dy * 6]; };

/* ---------------------------------------------------------------- Física */
function supported(u) { return solid(u.x, u.y + 1) || solid(u.x - 3, u.y + 1) || solid(u.x + 3, u.y + 1); }
function hurt(u, d, by) {
  if (!u.alive || d <= 0) return; d = Math.round(d); u.hp = Math.max(0, u.hp - d); u.hurt = 0.5;
  if (by != null && by !== u.team) P[by].dmg += d;
  k.float(M === 'snow' ? '¡Plaf!' : '-' + d, u.x, u.y - 34, M === 'snow' ? '#fff' : '#ffd166');
  if (u.hp <= 0) kill(u);
}
function kill(u, drown) {
  if (!u.alive) return; u.alive = false; u.hp = 0; u.rope = null;
  if (M !== 'snow') { k.burst(u.x, u.y - 8, pOf(u).col, 18, 200); if (!drown) graves.push({ x: u.x, y: u.y, vy: 0, col: pOf(u).col }); k.sfx(drown ? 'hurt' : 'explode'); }
  else { k.sfx('hurt'); u.downT = 0; }
  if (!teamAlive(u.team) && !elim.includes(u.team)) elim.push(u.team);
}
function land(u, y) {
  const v = u.vy; u.y = y; u.air = false; u.vx = 0; u.vy = 0;
  if (M !== 'snow' && v > 420) hurt(u, (v - 420) / 9);
  if (v > 200) k.burst(u.x, u.y, M === 'snow' ? '#fff' : '#c8a070', 5, 60);
}
function airStep(u, dt) {
  u.vy = Math.min(900, u.vy + GU * dt);
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(u.vx), Math.abs(u.vy)) * dt / 2)), sd = dt / n;
  for (let i = 0; i < n; i++) {
    let nx = Math.max(6, Math.min(W - 6, u.x + u.vx * sd)); const ny = u.y + u.vy * sd;
    if (solid(nx, ny) || (u.vy < 0 && solid(nx, ny - 14))) {
      if (u.vy >= 0) { let up = 0; while (up < 8 && solid(nx, ny - up)) up++; if (up < 8) { u.x = nx; land(u, ny - up); return; } }
      if (!solid(u.x, ny) && !(u.vy < 0 && solid(u.x, ny - 14))) { u.vx *= -0.25; u.y = ny; }
      else if (!solid(nx, u.y) && !solid(nx, u.y - 14)) { u.x = nx; u.vy = Math.max(0, u.vy) * 0.2; }
      else { u.vx *= -0.25; u.vy = Math.max(0, u.vy) * 0.2; if (supported(u)) { u.air = false; u.vx = 0; return; } }
      continue;
    }
    u.x = nx; u.y = ny;
  }
}
function walk(u, dir, dt) {
  u.face = dir; const nx = Math.max(8, Math.min(W - 8, u.x + dir * MD.walk * dt)); if (nx === u.x) return;
  if (M === 'snow' && Math.abs(nx - u.home) > 26) return;
  let ny = u.y;
  if (solid(nx, ny) || solid(nx, ny - 10)) { let s = 1; while (s <= 7 && (solid(nx, ny - s) || solid(nx, ny - s - 12))) s++; if (s > 7) return; ny -= s; }
  else if (!solid(nx, ny + 1)) { let s = 1; while (s <= 7 && !solid(nx, ny + s + 1)) s++; if (s <= 7) ny += s; else { u.x = nx; u.air = true; u.vx = dir * MD.walk * 0.6; u.vy = 0; return; } }
  u.x = nx; u.y = ny; u.walkT += dt;
}
function ropeStep(u, dt, inp) {
  const r = u.rope; let px = u.x, py = u.y - 8;
  u.vy += GU * dt; const dx = px - r.x, dy = py - r.y, d = hyp(dx, dy) || 1, nx = dx / d, ny = dy / d;
  if (inp.x) { u.vx += inp.x * 360 * dt; u.face = inp.x > 0 ? 1 : -1; } /* balanceo: empuje lateral */
  if (inp.y) r.L = Math.max(18, Math.min(260, r.L + inp.y * 130 * dt));
  const n = 4, sd = dt / n;
  for (let i = 0; i < n; i++) {
    let qx = px + u.vx * sd, qy = py + u.vy * sd; const ex = qx - r.x, ey = qy - r.y, e = hyp(ex, ey) || 1;
    if (e > r.L) { qx = r.x + ex / e * r.L; qy = r.y + ey / e * r.L; const vr = u.vx * ex / e + u.vy * ey / e; if (vr > 0) { u.vx -= vr * ex / e; u.vy -= vr * ey / e; } }
    if (solid(qx, qy + 8) || solid(qx, qy - 6) || qx < 6 || qx > W - 6) { u.vx *= -0.35; u.vy *= -0.35; if (solid(qx, qy + 8) && !solid(px, py + 7)) { u.vx = 0; } continue; }
    px = qx; py = qy;
  }
  u.vx *= 1 - 0.3 * dt; u.x = px; u.y = py + 8;
}
function castRope(u) {
  const [dx, dy] = aimVec(u); let x = u.x, y = u.y - 10;
  for (let s = 0; s < 130; s++) { x += dx * 2; y += dy * 2; if (x < 0 || x > W || y < 0) break; if (solid(x, y)) { u.rope = { x, y, L: Math.max(20, hyp(x - u.x, y - u.y + 8) - 2) }; u.air = true; u.vx = 0; u.vy = 0; k.sfx('shoot'); return; } }
  u.ropeMiss = { x, y, t: 0.25 }; k.sfx('click');
}

/* ---------------------------------------------------------------- Proyectiles */
function fire(u) {
  const pl = pOf(u), w = WEAP[u.weap], [mx, my] = muzzle(u), [dx, dy] = aimVec(u), v = MD.v0 + u.power * MD.v1;
  if (w.n > 0) pl.ammo[w.id]--;
  const mk = (a) => ({ x: mx, y: my, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w, team: u.team, own: u, t: 0, bounce: 0, trail: 0 });
  const a0 = Math.atan2(dy, dx);
  if (w.id === 'triple') for (const da of [-0.09, 0, 0.09]) shots.push(mk(a0 + da)); else shots.push(mk(a0));
  u.power = 0; u.chg = false;
  k.sfx(M === 'snow' ? 'jump' : 'shoot'); if (M !== 'snow') { k.burst(mx, my, '#fff2b0', 8, 120); k.shake(2); }
  if (w.n > 0 && pl.ammo[w.id] === 0) u.weap = 0;
}
const hitUnit = (u, x, y) => (M === 'snow' ? Math.abs(x - u.x) < 8.5 && y > u.y - (u.crouch ? 15 : 30) && y < u.y + 2 : hyp(u.x - x, u.y - 8 - y) < (M === 'cannon' ? 13 : 10));
function explode(x, y, r, dmg, team) {
  carve(x, y, r); booms.push({ x, y, r, t: 0 });
  k.burst(x, y, '#ffb347', 22, 260); k.burst(x, y, '#fff2b0', 10, 180); k.burst(x, y, M === 'worms' ? '#8a6a3f' : '#9a6a42', 14, 200); k.shake(Math.min(12, r / 4)); k.sfx('explode');
  const R = r * 1.5;
  for (const u of U) { if (!u.alive) continue; const dx = u.x - x, dy = u.y - 8 - y, d = hyp(dx, dy); if (d >= R) continue;
    const f = 1 - d / R; hurt(u, dmg * (0.35 + 0.65 * f), team);
    const nx = d > 0.5 ? dx / d : 0, ny = d > 0.5 ? dy / d : -1; u.vx += nx * MD.kb * f; u.vy += ny * MD.kb * f - MD.kb * 0.45 * f; u.air = true; u.rope = null; }
}
function stepShot(s, dt) {
  const n = Math.max(1, Math.ceil(hyp(s.vx, s.vy) * dt / 3)), sd = dt / n, w = s.w;
  for (let i = 0; i < n; i++) {
    if ((w.id === 'granada' && s.t >= 3) || s.t >= 10) return impact(s, null);
    if (w.id !== 'granada') s.vx += wind * WA * sd; s.vy += G * sd; const px = s.x, py = s.y; s.x += s.vx * sd; s.y += s.vy * sd; s.t += sd;
    if (s.x < -60 || s.x > W + 60 || s.y > H + 30) { s.dead = true; if (s.y > wl) splash(s.x); return; }
    if (s.y > wl && MD.water) { s.dead = true; splash(s.x); return; }
    for (const u of U) if (u.alive && (u !== s.own || s.t > 0.25) && hitUnit(u, s.x, s.y)) {
      if (w.id === 'granada') { s.vx *= -0.3; s.vy *= -0.3; s.x = px; s.y = py; break; }
      return impact(s, u);
    }
    if (s.y >= 0 && solid(s.x, s.y)) {
      if (w.id === 'granada') { let nx = 0, ny = 0; for (let a = 0; a < 8; a++) { const ax = Math.cos(a * TAU / 8), ay = Math.sin(a * TAU / 8); if (solid(s.x + ax * 4, s.y + ay * 4)) { nx -= ax; ny -= ay; } } const L = hyp(nx, ny) || 1; nx /= L; ny /= L; const vn = s.vx * nx + s.vy * ny; s.vx = (s.vx - 2 * vn * nx) * 0.5; s.vy = (s.vy - 2 * vn * ny) * 0.5; s.x = px; s.y = py; if (Math.abs(vn) > 60) k.sfx('click'); if (hyp(s.vx, s.vy) < 25) { s.vx = 0; s.vy = 0; } continue; }
      return impact(s, null);
    }
  }
  if (M !== 'snow' && (s.trail -= dt) <= 0) { s.trail = 0.03; amb.push({ x: s.x, y: s.y, t: 0.5, smoke: 1, r: 3 }); }
}
function impact(s, u) {
  s.dead = true;
  if (M === 'snow') { k.burst(s.x, s.y, '#ffffff', 10, 120); k.burst(s.x, s.y, '#cfe2f6', 5, 80);
    if (u) { hurt(u, 1, s.team); u.stun = 0.45; u.vx = Math.sign(s.vx) * 20; k.sfx('hit'); k.shake(3); }
    else { carve(s.x, s.y, 8, true); k.sfx('pop'); } return; }
  explode(s.x, s.y, s.w.r, s.w.dmg, s.team);
}
function splash(x) { for (let i = 0; i < 10; i++) amb.push({ x: x + k.rnd(-6, 6), y: wl, vx: k.rnd(-60, 60), vy: -k.rnd(90, 220), t: 0.8, drop: 1 }); k.sfx('pop'); }
/* simulación para la CPU (misma física, sin romper terreno) */
function sim(x, y, vx, vy, grav, wa, team, tgt) {
  const dt = 1 / 60; let best = 1e9;
  for (let i = 0; i < 400; i++) {
    vx += wa * dt; vy += grav * dt; x += vx * dt; y += vy * dt;
    if (tgt) { const d = hyp(tgt.x - x, tgt.y - 10 - y); if (d < best) best = d; }
    if (x < -40 || x > W + 40 || y > H + 20 || (MD.water && y > wl)) return { x, y, out: 1, best };
    if (y >= 0 && solid(x, y)) return { x, y, best };
    for (const u of U) if (u.alive && u.team !== team && hitUnit(u, x, y)) return { x, y, u, best };
  }
  return { x, y, out: 1, best };
}
function makePlan(u, tgt, err) {
  const s = skill(), face = tgt.x >= u.x ? 1 : -1, w = WEAP[u.weap], wa = w.id === 'granada' ? 0 : wind * WA; let best = null;
  const save = [u.face, u.elev];
  const es = M === 'snow' ? 0.09 : 0.065, ps = M === 'snow' ? 0.055 : 0.04;
  for (let e = -0.25; e <= 1.45; e += es) for (let pw = 0.12; pw <= 1.001; pw += ps) {
    u.face = face; u.elev = e; const [mx, my] = muzzle(u), [dx, dy] = aimVec(u), v = MD.v0 + pw * MD.v1;
    const r = sim(mx, my, dx * v, dy * v, G, wa, u.team, tgt);
    let sc = r.u ? (r.u === tgt ? 0 : 20) : r.out ? 400 + r.best : hyp(r.x - tgt.x, r.y - tgt.y + 8);
    if (!r.out && M !== 'snow') for (const o of U) if (o.alive && o.team === u.team && hyp(o.x - r.x, o.y - 8 - r.y) < (w.r || 20) * 1.6) sc += o === u ? 500 : 250;
    sc += pw * 4 + Math.abs(e - 0.7) * 3;
    if (!best || sc < best.sc) best = { sc, elev: e, power: pw, face };
  }
  u.face = save[0]; u.elev = save[1];
  const q = (1 - s) * (err || 1); const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  best.elev += g() * q * 0.16; best.power = Math.max(0.1, Math.min(1, best.power * (1 + g() * q * 0.13)));
  return best;
}
function pickTarget(u) {
  const foes = U.filter((o) => o.alive && o.team !== u.team); if (!foes.length) return null;
  let b = null, bs = 1e9; for (const o of foes) { const sc = Math.abs(o.x - u.x) * 0.6 + o.hp * (M === 'snow' ? 30 : 0.8) + k.rnd(0, 120); if (sc < bs) { bs = sc; b = o; } } return b;
}

/* ---------------------------------------------------------------- Turnos */
function startTurn() {
  const n = P.length; let tries = 0;
  do { ti = (ti + 1) % n; } while (!teamAlive(ti) && ++tries <= n);
  const pl = P[ti], mine = U.filter((u) => u.team === ti);
  for (let j = 0; j < mine.length; j++) { const u = mine[(pl.ui + j) % mine.length]; if (u.alive) { cur = u; pl.ui = (pl.ui + j + 1) % mine.length; break; } }
  turnNo++; phase = 'aim'; turnT = MD.turnLen; fuel = MD.fuel || 0; cur.power = 0; cur.chg = false; cur.weap = 0; plan = null; drag = null;
  const ramp = Math.min(1, turnNo / (P.length * 2)); wind = Math.round(k.rnd(-1, 1) * lerp(0.35, 1, ramp) * MD.wind * 10) / 10;
  if (turnNo > MD.sd * P.length / 3 && MD.water) { wl = Math.max(H * 0.5, wl - 10); if (turnNo === Math.ceil(MD.sd * P.length / 3) + 1) say('¡Sube el agua!', '#5ce1e6'); }
  say(pl.cpu && !k.party ? `Turno de ${pl.name}` : k.party || P.filter((x) => !x.cpu).length > 1 ? `Turno de ${pl.name}` : '¡Tu turno!', pl.col);
  cur.ai = { think: lerp(1.2, 0.7, skill()), plan: null, walk: 0 };
}
function say(t, col) { banner = { t, col }; bannerT = 1.6; }
function inputOf(u) {
  const pl = pOf(u), d = k.pdir(pl.p), solo = !k.party && pl.p === 0;
  return { x: d.x, y: d.y, a: k.pheld(pl.p, 'a'), ah: k.phit(pl.p, 'a'), b: k.pheld(pl.p, 'b'), bh: k.phit(pl.p, 'b'), solo };
}
function nextWeapon(u) { const pl = pOf(u); for (let j = 1; j <= WEAP.length; j++) { const w = (u.weap + j) % WEAP.length; if (pl.ammo[WEAP[w].id] !== 0) { u.weap = w; break; } } k.sfx('click'); k.float(WEAP[u.weap].name, u.x, u.y - 44, '#fff'); }
function touchAim(u, inp) { /* tirachinas: arrastra hacia atrás y suelta */
  const p = k.ptr; if (!inp.solo) return false;
  if (p.hit) drag = { x: p.x, y: p.y };
  if (drag && p.down) { const dx = drag.x - p.x, dy = drag.y - p.y, L = hyp(dx, dy); if (L > 14) { u.face = dx >= 0 ? 1 : -1; u.elev = Math.max(-0.3, Math.min(1.5, Math.atan2(-dy, Math.abs(dx)))); u.power = Math.min(1, (L - 14) / 150); u.chg = true; } return true; }
  if (drag && p.up) { const was = u.chg && u.power > 0.05; drag = null; if (was) return 'fire'; u.chg = false; u.power = 0; return true; }
  return false;
}
function controlAim(u, dt) {
  const pl = pOf(u), w = WEAP[u.weap];
  if (pl.cpu) return cpuTurn(u, dt);
  const inp = inputOf(u);
  if (u.rope) { ropeStep(u, dt, inp); if (inp.ah || inp.bh) { u.rope = null; u.air = true; k.sfx('jump'); } return; }
  if (u.air) return;
  const t = touchAim(u, inp); if (t === 'fire') { fire(u); phase = 'fly'; return; } if (t) return;
  if (inp.x && !u.chg && (M !== 'cannon' || fuel > 0)) { walk(u, inp.x > 0 ? 1 : -1, dt); if (M === 'cannon') fuel -= dt; }
  else if (inp.x && M === 'cannon' && !u.chg) u.face = inp.x > 0 ? 1 : -1;
  if (inp.y) u.elev = Math.max(-0.3, Math.min(1.5, u.elev - inp.y * 1.1 * dt));
  if (inp.bh && !u.chg) nextWeapon(u);
  if (w.id === 'cuerda') { if (inp.ah) castRope(u); return; }
  if (inp.a) { if (!u.chg && inp.ah) { u.chg = true; u.power = 0; } if (u.chg) { u.power = Math.min(1, u.power + 0.72 * dt); if (u.power >= 1) { fire(u); phase = 'fly'; } } }
  else if (u.chg) { fire(u); phase = 'fly'; }
}
function cpuTurn(u, dt) {
  const ai = u.ai; if (u.air) return;
  if (ai.think > 0) { ai.think -= dt; return; }
  if (!ai.plan) { const tg0 = pickTarget(u); if (!tg0) return; ai.tgt = tg0; const pl = pOf(u);
    if (M === 'cannon' && pl.ammo.pesado > 0 && tg0.hp > 50 && Math.random() < 0.5) u.weap = 2; else if (M === 'cannon' && pl.ammo.triple > 0 && Math.random() < 0.3) u.weap = 1;
    else if (M === 'worms' && Math.abs(tg0.x - u.x) < 160 && Math.random() < 0.4) u.weap = 1; else u.weap = 0;
    ai.plan = makePlan(u, tg0, firstCpu ? 1.8 : 1); firstCpu = false;
    if (M === 'worms' && ai.plan.sc > 60 && !ai.walked) { ai.walk = k.rnd(0.8, 1.8); ai.walked = true; ai.wdir = Math.sign(tg0.x - u.x) || 1; ai.plan = null; return; } }
  if (ai.walk > 0) { ai.walk -= dt; walk(u, ai.wdir, dt); if (ai.walk <= 0) ai.think = 0.3; return; }
  const p = ai.plan; u.face = p.face; const de = p.elev - u.elev;
  if (Math.abs(de) > 0.02) { u.elev += Math.sign(de) * Math.min(Math.abs(de), 1.1 * dt); return; }
  u.chg = true; u.power = Math.min(p.power, u.power + 0.72 * dt); if (u.power >= p.power - 1e-3) { fire(u); phase = 'fly'; }
}
function settled() { return !shots.length && U.every((u) => !u.alive || (!u.air && !u.rope)) && booms.every((b) => b.t > 0.4); }
function roundOver() { const a = aliveTeams(); return a.length <= 1; }
function endRound() {
  const a = aliveTeams(); phase = 'between'; btw = 3.4;
  if (M === 'snow') {
    const key = (pl) => { const u = U.find((x) => x.team === pl.i); return (u.alive ? 100 : elim.indexOf(pl.i)) + u.hp; };
    const order = P.slice().sort((x, y) => key(y) - key(x)), PT = [3, 2, 1, 0];
    order.forEach((pl, j) => { pl.gain = j && key(pl) === key(order[j - 1]) ? order[j - 1].gain : PT[j]; pl.pts += pl.gain; if (pl.gain === 3) pl.wins++; });
    const tie = order.length > 1 && order[1].gain === order[0].gain;
    banner = { t: tie ? '¡Empate!' : `¡Ronda para ${order[0].name}!`, col: tie ? '#ffd166' : order[0].col, list: order }; bannerT = 3.4;
  } else {
    const w = a[0]; if (w) { w.wins++; banner = { t: M === 'worms' ? `¡Gana ${w.name}!` : `¡Ronda para ${w.name}!`, col: w.col }; } else banner = { t: '¡Nadie en pie!', col: '#ffd166' };
    bannerT = 3.4; if (w) elim.push(w.i);
  }
  const hum = banner.col && P.some((pl) => !pl.cpu && banner.t.includes(pl.name)); k.sfx(hum || k.party ? 'win' : 'lose');
}
function finish() {
  let rows, best;
  if (M === 'snow') rows = P.map((pl) => ({ p: pl.p, name: pl.name, score: pl.pts * 100 + pl.wins * 10 + pl.gain }));
  else if (M === 'worms') rows = P.map((pl) => ({ p: pl.p, name: pl.name, score: (elim.indexOf(pl.i) + 1) * 1000 + Math.min(999, pl.dmg) }));
  else rows = P.map((pl) => ({ p: pl.p, name: pl.name, score: pl.wins * 1000 + Math.min(999, pl.dmg) }));
  best = Math.max(...rows.map((r) => r.score)); const win = rows.filter((r) => r.score === best);
  if (win.length === 1) { const wp = P.find((pl) => pl.p === win[0].p); CPU = wp.cpu ? Math.max(0, CPU - 1) : Math.min(8, CPU + 1); try { localStorage.setItem('cpu:' + CFG.id, CPU); } catch (e) { /* sin almacenamiento */ } }
  const fmt = M === 'snow' ? (v) => Math.floor(v / 100) + ' pts' : M === 'worms' ? (v) => (v % 1000) + ' de daño' : (v) => Math.floor(v / 1000) + (Math.floor(v / 1000) === 1 ? ' ronda' : ' rondas') + ' · ' + (v % 1000) + ' daño';
  const solo = !k.party && win.length === 1 && P.find((pl) => pl.p === win[0].p && !pl.cpu);
  k.podium(rows, { fmt, head: solo ? '¡Has ganado!' : undefined });
}

/* ---------------------------------------------------------------- Nieve en tiempo real */
function snowUnit(u, dt) {
  if (!u.alive) { u.downT = (u.downT || 0) + dt; return; }
  u.cd -= dt; u.stun -= dt;
  const pl = pOf(u);
  let inp;
  if (pl.cpu) inp = snowAI(u, dt);
  else { inp = inputOf(u); const t = touchAim(u, inp); if (t === 'fire') { inp = { x: 0, y: 0, rel: 1 }; } else if (t) inp = { x: 0, y: 0, hold: 1 }; }
  if (u.stun > 0) { u.chg = false; u.power = 0; u.crouch = false; return; }
  u.crouch = !!inp.b && !u.chg;
  if (u.crouch) { u.pack += dt; if (u.pack > 0.7 && u.ammo < 5) { u.pack = 0; u.ammo++; k.sfx('pop'); } return; } else u.pack = 0;
  if (inp.x && !u.chg) walk(u, inp.x > 0 ? 1 : -1, dt); else if (inp.x) u.face = inp.x > 0 ? 1 : -1;
  if (inp.y) u.elev = Math.max(-0.2, Math.min(1.45, u.elev - inp.y * 1.3 * dt));
  if (inp.hold) return;
  const canThrow = u.ammo > 0 && u.cd <= 0;
  if (inp.rel && u.chg && canThrow) { throwBall(u); return; }
  if (inp.a && canThrow) { if (!u.chg) { u.chg = true; u.power = 0; } u.power = Math.min(1, u.power + 1.1 * dt); }
  else if (u.chg && !inp.a) { if (canThrow) throwBall(u); else { u.chg = false; u.power = 0; } }
  else if (inp.ah && u.ammo <= 0) { k.float('¡Sin bolas! Mantén B', u.x, u.y - 46, '#cfe2f6'); }
}
function throwBall(u) { fire(u); u.ammo--; u.cd = 0.35; u.throwT = 0.25; }
function snowAI(u, dt) {
  const ai = u.ai, s = skill(), o = { x: 0, y: 0 };
  ai.cd -= dt;
  if (ai.crouch > 0) { ai.crouch -= dt; if (u.ammo < 5 || ai.crouch > 0) { o.b = true; if (u.ammo >= 3 && ai.crouch <= 0) ai.crouch = 0; return o; } }
  if (u.ammo <= 0) { ai.crouch = 0.8 * 3 + k.rnd(0, 1); o.b = true; return o; }
  /* esquivar: una bola enemiga que viene hacia mí */
  if (rt > 2 && !u.chg && Math.random() < s * 0.12) for (const sh of shots) if (sh.team !== u.team && Math.sign(u.x - sh.x) === Math.sign(sh.vx) && Math.abs(u.x - sh.x) < 150 && sh.vy > -40) { ai.crouch = 0.7; o.b = true; return o; }
  if (!ai.plan) {
    if (ai.cd > 0 || rt < 5) { if (Math.random() < dt * 0.6) ai.wd = k.pick([-1, 0, 1]); if (ai.wd && Math.abs(u.x + ai.wd * 10 - u.home) < 22) o.x = ai.wd; return o; }
    const t = pickTarget(u); if (!t) return o; ai.plan = makePlan(u, t, 1.25); ai.tgt = t;
  }
  const p = ai.plan; if (u.face !== p.face) o.x = p.face; else { const de = p.elev - u.elev; if (Math.abs(de) > 0.03) o.y = de > 0 ? -1 : 1; else { if (u.power < p.power - 0.02) o.a = true; else { ai.plan = null; ai.cd = lerp(2.4, 1.1, s) * k.rnd(0.8, 1.3); o.rel = 1; u.chg = true; } } }
  return o;
}

/* ---------------------------------------------------------------- Bucle */
function ambient(dt) {
  const kind = M === 'snow' ? 'flake' : M === 'worms' ? 'leaf' : 'seed';
  while (amb.filter((a) => a.bg).length < 26) amb.push({ bg: 1, x: k.rnd(-40, W + 40), y: k.rnd(-20, H * 0.8), t: 1e9, ph: k.rnd(0, TAU), kind, s: k.rnd(0.6, 1.3) });
  for (const a of amb) {
    if (a.bg) { a.x += (wind * 60 + (M === 'snow' ? 6 : 14)) * dt * a.s; a.y += (M === 'snow' ? 22 : 10) * dt * a.s + Math.sin(T * 2 + a.ph) * 8 * dt; a.ph += dt; if (a.x > W + 50) a.x = -40; if (a.x < -50) a.x = W + 40; if (a.y > H) { a.y = -10; a.x = k.rnd(-40, W + 40); } continue; }
    a.t -= dt; if (a.drop) { a.vy += 500 * dt; a.x += a.vx * dt; a.y += a.vy * dt; } else if (a.smoke) { a.r += dt * 10; a.y -= dt * 12; a.x += wind * 20 * dt; } else if (a.melt) { a.y += 60 * dt; }
  }
  amb = amb.filter((a) => a.t > 0);
}
function physics(dt) {
  for (const u of U) {
    u.hurt = Math.max(0, u.hurt - dt); if (u.throwT) u.throwT -= dt;
    if (u.ropeMiss) { u.ropeMiss.t -= dt; if (u.ropeMiss.t <= 0) u.ropeMiss = null; }
    if (!u.alive) continue;
    if (u.rope && (u !== cur || phase !== 'aim')) { u.rope = null; u.air = true; }
    if (!u.rope) { if (u.air) airStep(u, dt); else if (!supported(u)) { u.air = true; u.vy = 0; } }
    if (MD.water && u.y > wl + 4) { kill(u, true); splash(u.x); }
    if (u.y > H + 30) kill(u, true);
  }
  for (const g of graves) { if (!solid(g.x, g.y + 1) && g.y < H + 20) { g.vy += GU * dt; g.y += g.vy * dt; if (solid(g.x, g.y + 1)) { while (solid(g.x, g.y)) g.y--; g.vy = 0; } } }
  for (const s of shots) stepShot(s, dt);
  shots = shots.filter((s) => !s.dead);
  for (const b of booms) b.t += dt; booms = booms.filter((b) => b.t < 0.6);
}
function melt(dt) { /* el sol derrite los fuertes: cada vez más rápido */
  meltT -= dt; if (meltT > 0) return; meltT = lerp(0.8, 0.16, rt / MD.len) * k.rnd(0.7, 1.3);
  for (let tries = 0; tries < 12; tries++) { const x = k.ri(0, W - 1); let y = -1; for (let yy = 0; yy < H; yy++) if (FM[yy * W + x]) { y = yy; break; } if (y < 0) continue;
    carve(x + k.rnd(-2, 2), y + 1, k.rnd(3.5, 5.5), true); if (Math.random() < 0.5) amb.push({ x, y: y + 4, t: 0.6, melt: 1 }); break; }
}
reset(); k.show(CFG.title, CFG.help);
k.run((dt) => {
  T += dt; ambient(dt); bannerT = Math.max(0, bannerT - dt);
  if (!k.gate(reset)) { for (const b of booms) b.t += dt; return; }
  if (phase === 'between') { btw -= dt; physics(dt); if (btw <= 0) { if (M === 'snow' ? round >= MD.rounds : (M === 'worms' || P.some((pl) => pl.wins >= MD.wins))) finish(); else newRound(); } return; }
  if (cdPend) { cdPend = false; k.count(3); }
  if (k.counting()) return;
  rt += dt;
  if (M === 'snow') {
    if (phase === 'start') phase = 'play';
    for (const u of U) snowUnit(u, dt);
    physics(dt); melt(dt);
    const alive = U.filter((u) => u.alive).length;
    if (alive <= 1 || rt >= MD.len) endRound();
    return;
  }
  if (phase === 'start') { startTurn(); }
  if (phase === 'aim') {
    if (!cur.alive || (settled() && roundOver())) { phase = 'fly'; }
    else { controlAim(cur, dt); turnT -= dt; if (turnT <= 0 && phase === 'aim') { if (cur.chg && cur.power > 0.05) fire(cur); cur.rope = null; cur.air = !supported(cur); phase = 'fly'; say('¡Tiempo!', '#ff8a6a'); } }
  }
  physics(dt);
  if (phase === 'fly') { if (settled()) { phase = 'settle'; lastT = 0.7; } }
  else if (phase === 'settle') { lastT -= dt; if (!settled()) phase = 'fly'; else if (lastT <= 0) { if (roundOver()) endRound(); else startTurn(); } }
}, draw);

/* ---------------------------------------------------------------- Dibujo */
function slopeAt(x, y) { const f = (xx) => { let yy = y - 8; while (yy < y + 10 && !solid(xx, yy + 1)) yy++; return yy; }; return Math.max(-0.5, Math.min(0.5, Math.atan2(f(x + 7) - f(x - 7), 14))); }
function drawTank(u, act) {
  const col = pOf(u).col, sl = u.air ? 0 : slopeAt(u.x, u.y), [dx, dy] = aimVec(u), hurtF = u.hurt > 0 && Math.floor(u.hurt * 16) % 2;
  c.save(); c.translate(u.x, u.y); c.rotate(sl);
  contact(c, 0, 1.5, 17, 3.6, 0.28);
  /* cañón: única pieza que gira de verdad */
  c.save(); c.translate(0, -13); c.rotate(Math.atan2(dy, dx) - sl);
  const barrel = (q) => { q.moveTo(0, -2.9); q.lineTo(15, -2.9); q.lineTo(15, -4); q.lineTo(20, -4); q.lineTo(20, 4); q.lineTo(15, 4); q.lineTo(15, 2.9); q.lineTo(0, 2.9); q.closePath(); };
  unite(c, [[barrel, '#5a5373']], 1.5);
  clipIn(c, barrel, (q) => { q.fillStyle = PAL(PZO, 0.22); q.fillRect(0, 0.6, 22, 4); q.fillStyle = 'rgba(255,255,255,.26)'; q.fillRect(1, -2.4, 14, 1.4); });
  c.restore();
  /* casco + cúpula + oruga: una sola silueta */
  const bd = hurtF ? '#fff' : col;
  const cup = (q) => { q.arc(0, -13, 7, Math.PI, 0); q.closePath(); };
  const hull = (q) => { q.moveTo(-14, -6); q.lineTo(-10, -13); q.lineTo(10, -13); q.lineTo(14, -6); q.closePath(); };
  const track = (q) => { const r = 4; q.moveTo(-16 + r, -7); q.arcTo(16, -7, 16, 1, r); q.arcTo(16, 1, -16, 1, r); q.arcTo(-16, 1, -16, -7, r); q.arcTo(-16, -7, 16, -7, r); q.closePath(); };
  unite(c, [[track, '#3b3552'], [hull, bd], [cup, hurtF ? '#fff' : lite(col, 0.14)]], 1.6);
  clipIn(c, hull, (q) => {
    q.fillStyle = hurtF ? '#fff' : lite(col, 0.3); q.beginPath(); q.moveTo(-14, -6); q.lineTo(-10, -13); q.lineTo(10, -13); q.lineTo(9, -10.4); q.lineTo(-11.4, -10.4); q.lineTo(-14, -6); q.closePath(); q.fill();
    q.fillStyle = PAL(PZO, 0.18); q.fillRect(-16, -7.6, 32, 2.2);
  });
  clipIn(c, cup, (q) => { q.fillStyle = PAL(PZO, 0.16); q.beginPath(); q.arc(0, -11.2, 7, Math.PI, 0); q.closePath(); q.fill(); });
  clipIn(c, track, (q) => {
    q.fillStyle = PAL(PZO, 0.35); q.fillRect(-16, -2.6, 32, 4);
    q.fillStyle = '#8b86a5'; for (let i = -3; i <= 3; i += 2) { q.beginPath(); q.arc(i * 4.2, -3, 2.4, 0, TAU); q.fill(); }
    q.fillStyle = PAL(PZO, 0.3); for (let i = -3; i <= 3; i += 2) { q.beginPath(); q.arc(i * 4.2, -1.6, 2.4, 0, TAU); q.fill(); }
  });
  spec(c, -3, -14.8, 4.2, 1.5, -0.12, 0.4);
  c.restore();
}
function drawBug(u, act) {
  const col = pOf(u).col, hurtF = u.hurt > 0 && Math.floor(u.hurt * 16) % 2, f = u.face, bob = u.walkT ? Math.sin(u.walkT * 18) * 1.2 : 0, [dx, dy] = aimVec(u);
  c.save(); c.translate(u.x, u.y);
  contact(c, 0, 1, 11, 2.8, 0.24);
  /* patas: se mueven de verdad, van aparte y detrás */
  c.strokeStyle = OUT; c.lineWidth = 2.6; c.lineCap = 'round';
  for (let i = -1; i <= 1; i++) { const ph = Math.sin(u.walkT * 18 + i * 2) * 2; c.beginPath(); c.moveTo(i * 4, -4); c.lineTo(i * 5 + ph, 0); c.stroke(); }
  /* antenas */
  const hx = f * 7, hy = -12 + bob * 0.5;
  c.strokeStyle = OUT; c.lineWidth = 1.8; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(hx + s * 2, hy - 4); c.quadraticCurveTo(hx + s * 3 + f * 2, hy - 11, hx + s * 5 + f * 3, hy - 12); c.stroke(); }
  /* cuerpo + cabeza + bolitas: una silueta */
  const body = (q) => { q.ellipse(-f * 1, -8 + bob * 0.3, 9, 7.5, 0, 0, TAU); };
  const head = (q) => { q.arc(hx, hy, 5.5, 0, TAU); };
  const ant = (q) => { for (const s of [-1, 1]) { q.moveTo(hx + s * 5 + f * 3 + 1.9, hy - 12); q.arc(hx + s * 5 + f * 3, hy - 12, 1.9, 0, TAU); } };
  unite(c, [[ant, lite(col, 0.25)], [body, hurtF ? '#fff' : col], [head, '#3a3150']], 1.6);
  clipIn(c, body, (q) => {
    q.fillStyle = hurtF ? '#eee' : PDK(col, 0.18); q.beginPath(); q.ellipse(-f * 1, -4.4 + bob * 0.3, 9, 7.5, 0, 0, TAU); q.fill();
    q.fillStyle = PAL(PZO, 0.32); q.fillRect(-f * 1 - 0.7, -17, 1.4, 18);
    q.fillStyle = PAL(PZO, 0.5); for (const [sx, sy] of [[-5, -10], [3, -11], [-3, -5], [5, -5]]) { q.beginPath(); q.arc(sx - f, sy + bob * 0.3, 1.8, 0, TAU); q.fill(); }
  });
  clipIn(c, head, (q) => { q.fillStyle = PAL('#ffffff', 0.12); q.beginPath(); q.arc(hx, hy - 2.4, 5.5, 0, TAU); q.fill(); });
  spec(c, -f * 4, -12.4 + bob * 0.3, 3.2, 1.7, -0.4, 0.42);
  for (const s of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.arc(hx + s * 2.3 + f * 0.8, hy - 1, 2.2, 0, TAU); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(hx + s * 2.3 + f * 0.8 + dx * 0.9, hy - 1 + dy * 0.9, 1.1, 0, TAU); c.fill(); }
  c.restore();
  if (act && !u.air && !u.rope) { const w = WEAP[u.weap].id, ax = u.x, ay = u.y - 9; c.save(); c.translate(ax, ay); c.rotate(Math.atan2(dy, dx));
    if (w === 'bazuca') { const tube = (q) => { q.moveTo(-4, -3.2); q.lineTo(11, -3.2); q.lineTo(11, -4); q.lineTo(16, -4); q.lineTo(16, 4); q.lineTo(11, 4); q.lineTo(11, 3.2); q.lineTo(-4, 3.2); q.closePath(); };
      unite(c, [[tube, '#6f7d3a']], 1.5); clipIn(c, tube, (q) => { q.fillStyle = PAL(PZO, 0.28); q.fillRect(-5, 0.6, 22, 5); }); spec(c, 2, -2.2, 5, 0.9, 0, 0.3); }
    else if (w === 'granada') { const gr = (q) => { q.moveTo(8, -6.5); q.lineTo(10.4, -6.5); q.lineTo(10.4, -3.6); q.arc(9, 0, 4.2, -1.3, 5.2); q.closePath(); };
      unite(c, [[gr, '#4f8a3a']], 1.5); clipIn(c, gr, (q) => { q.fillStyle = PAL(PZO, 0.24); q.beginPath(); q.arc(9, 2.4, 4.2, 0, TAU); q.fill(); q.fillStyle = '#c9c9c9'; q.fillRect(8, -6.5, 2.4, 3); }); spec(c, 7.6, -1.6, 1.5, 1, -0.5, 0.42); }
    else { const bat = (q) => { q.moveTo(0, -2.5); q.lineTo(11, -2.5); q.arc(13, 0, 2.5, -1.57, 1.57); q.lineTo(0, 2.5); q.closePath(); };
      unite(c, [[bat, '#8a5a3b']], 1.5); clipIn(c, bat, (q) => { q.fillStyle = PAL(PZO, 0.24); q.fillRect(-1, 0.4, 18, 4); q.fillStyle = '#c9c9c9'; q.beginPath(); q.arc(13, 0, 2.5, 0, TAU); q.fill(); }); }
    c.restore(); }
}
function drawKid(u) {
  const col = pOf(u).col, f = u.face, hurtF = u.hurt > 0 && Math.floor(u.hurt * 16) % 2;
  c.save(); c.translate(u.x, u.y);
  contact(c, 0, 1, 10, 2.6, 0.24);
  if (!u.alive) { c.rotate(-f * 1.35); c.translate(0, 2); }
  const [dx, dy] = aimVec(u), bh = u.crouch ? 13 : 16, by = u.crouch ? -13 : -22, hy = by - 6, bd = hurtF ? '#fff' : col;
  const rr = (q, x, y, w, h, r) => { q.moveTo(x + r, y); q.arcTo(x + w, y, x + w, y + h, r); q.arcTo(x + w, y + h, x, y + h, r); q.arcTo(x, y + h, x, y, r); q.arcTo(x, y, x + w, y, r); q.closePath(); };
  const legs = (q) => { if (!u.crouch) for (const s of [-1, 1]) rr(q, s * 3 - 2.5, -8, 5, 8, 2); };
  const body = (q) => rr(q, -8, by, 16, bh, 6);
  const head = (q) => { q.arc(0, hy, 6.5, 0, TAU); };
  const cap = (q) => { q.arc(0, hy - 1.5, 7, Math.PI, 0); q.lineTo(f * 7 + f * 5, hy - 1.5); q.lineTo(f * 7 + f * 5, hy + 1.2); q.lineTo(-f * 7, hy + 1.2); q.closePath(); };
  const pom = (q) => { q.arc(0, hy - 9.5, 2.9, 0, TAU); };
  unite(c, [[legs, '#3b3552'], [body, bd], [head, '#ffd9b8'], [cap, dark(col, 0.18)], [pom, '#fff']], 1.6);
  clipIn(c, body, (q) => { q.fillStyle = hurtF ? '#fff' : lite(col, 0.28); q.fillRect(-8, by, 16, 3.2); q.fillStyle = PAL(PZO, 0.16); q.fillRect(-8, by + bh - 4, 16, 4); q.fillStyle = 'rgba(255,255,255,.26)'; q.fillRect(-5, by + 2, 2.6, u.crouch ? 7 : 10); });
  clipIn(c, head, (q) => { q.fillStyle = PAL(PZO, 0.13); q.beginPath(); q.arc(0, hy - 2.6, 6.5, 0, TAU); q.fill(); });
  clipIn(c, cap, (q) => { q.fillStyle = PAL(PZO, 0.26); q.fillRect(-14, hy - 1.4, 28, 4); q.fillStyle = PAL('#ffffff', 0.18); q.beginPath(); q.arc(-2, hy - 5, 5, Math.PI, 0); q.fill(); });
  spec(c, -2.6, hy - 4.6, 2.2, 1.1, -0.5, 0.4);
  if (u.alive) { c.fillStyle = OUT; c.beginPath(); c.arc(f * 2.5 - 1.2, hy + 1, 1.2, 0, TAU); c.arc(f * 2.5 + 2.2, hy + 1, 1.2, 0, TAU); c.fill(); c.fillStyle = '#ff9a9a'; c.beginPath(); c.arc(f * 4.5, hy + 3, 1.6, 0, TAU); c.fill(); }
  else { c.strokeStyle = OUT; c.lineWidth = 1.3; for (const s of [-1, 2.6]) { c.beginPath(); c.moveTo(f * 2.5 + s - 1, hy); c.lineTo(f * 2.5 + s + 1, hy + 2); c.moveTo(f * 2.5 + s + 1, hy); c.lineTo(f * 2.5 + s - 1, hy + 2); c.stroke(); } }
  /* brazo con la bola: se mueve de verdad */
  if (u.alive && !u.crouch) { const ang = u.chg ? Math.atan2(dy, dx) + Math.PI * 0.85 * f * -1 * (0.4 + u.power * 0.6) : u.throwT > 0 ? Math.atan2(dy, dx) : Math.PI / 2 + f * 0.4;
    const sx = f * 4, sy = by + 4, ex = sx + Math.cos(ang) * 9, ey = sy + Math.sin(ang) * 9;
    c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 5.6; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke(); c.strokeStyle = bd; c.lineWidth = 3; c.stroke();
    if (u.ammo > 0 && !(u.throwT > 0)) { const bl = (q) => { q.arc(ex, ey, 3.8, 0, TAU); }; unite(c, [[bl, '#fff']], 1.4); clipIn(c, bl, (q) => { q.fillStyle = PAL('#9fb7d4', 0.45); q.beginPath(); q.arc(ex + 1.2, ey + 1.6, 3.8, 0, TAU); q.fill(); }); spec(c, ex - 1.2, ey - 1.4, 1.3, 0.9, -0.5, 0.75); } }
  if (u.crouch && u.alive) { const r = 3.8 + u.pack * 3, bl = (q) => { q.arc(f * 8, -3, r, 0, TAU); }; unite(c, [[bl, '#fff']], 1.4); clipIn(c, bl, (q) => { q.fillStyle = PAL('#9fb7d4', 0.45); q.beginPath(); q.arc(f * 8 + r * 0.35, -3 + r * 0.4, r, 0, TAU); q.fill(); }); spec(c, f * 8 - r * 0.35, -3 - r * 0.35, r * 0.35, r * 0.24, -0.5, 0.7); }
  c.restore();
  if (!u.alive) for (let i = 0; i < 3; i++) { const a = T * 3 + i * 2.1; ART.glint(c, u.x + Math.cos(a) * 10, u.y - 16 + Math.sin(a) * 3, 3, '#ffd166'); }
}
function drawShot(s) {
  const id = s.w.id;
  if (id === 'bola') { c.beginPath(); c.arc(s.x, s.y, 4.2, 0, TAU); ART.fillOut(c, '#fff', 1.6); c.fillStyle = '#cfe2f6'; c.beginPath(); c.arc(s.x + 1, s.y + 1, 1.8, 0, TAU); c.fill(); return; }
  c.save(); c.translate(s.x, s.y);
  if (id === 'granada') { c.rotate(s.t * 6); c.beginPath(); c.arc(0, 0, 5, 0, TAU); ART.fillOut(c, '#4f8a3a', 1.8); c.fillStyle = '#c9c9c9'; c.fillRect(-1.2, -8, 2.4, 3.5); c.restore(); label(String(Math.max(1, Math.ceil(3 - s.t))), s.x, s.y - 16, 12, '#fff'); return; }
  c.rotate(Math.atan2(s.vy, s.vx));
  const big = id === 'pesado' ? 1.5 : id === 'triple' ? 0.8 : 1;
  c.scale(big, big); ART.rr(c, -7, -4, 13, 8, 4); ART.fillOut(c, id === 'bazuca' ? '#7a8a44' : '#3d3752', 1.8);
  c.fillStyle = id === 'pesado' ? '#ff5f7a' : '#ffd166'; c.fillRect(-6, -3, 3, 6); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(-3, -2.5, 7, 1.5);
  c.restore();
}
function drawWater(front) {
  if (!MD.water || wl > H) return;
  const y0 = wl;
  c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 10) c.lineTo(x, y0 + Math.sin(x * 0.04 + T * (front ? 2.2 : 1.6) + (front ? 1 : 0)) * 3 + (front ? 3 : 0)); c.lineTo(W, H); c.closePath();
  c.fillStyle = front ? 'rgba(58,158,240,.72)' : 'rgba(31,94,170,.9)'; c.fill();
  if (front) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= W; x += 10) c.lineTo(x, y0 + Math.sin(x * 0.04 + T * 2.2 + 1) * 3 + 3); c.stroke(); }
}
function drawAim(u) {
  if (!u.alive || u.air || u.rope) return;
  const [dx, dy] = aimVec(u), [mx, my] = muzzle(u), L = 26 + u.power * 60;
  c.fillStyle = '#fff'; for (let d = 6; d < L; d += 8) { c.globalAlpha = 0.9 - d / (L + 20); c.beginPath(); c.arc(mx + dx * d, my + dy * d, 2.2, 0, TAU); c.fill(); }
  c.globalAlpha = 1; const ex = mx + dx * (L + 6), ey = my + dy * (L + 6); c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.arc(ex, ey, 6, 0, TAU); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
  if (u.chg || u.power > 0) { const bx = u.x - 22 * u.face - 4, by = u.y - 44; ART.rr(c, bx, by, 8, 36, 3); ART.fillOut(c, 'rgba(26,21,48,.7)', 2); const h = 32 * u.power, g = u.power < 0.5 ? '#7cf7a0' : u.power < 0.8 ? '#ffd166' : '#ff5f7a'; c.fillStyle = g; c.fillRect(bx + 2, by + 34 - h, 4, h); }
}
function hpTag(u, act) {
  if (!u.alive) return; const col = pOf(u).col, y = u.y - (M === 'cannon' ? 34 : 32), txt = String(u.hp);
  c.font = '800 11px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const w = c.measureText(txt).width + 10;
  ART.rr(c, u.x - w / 2, y - 7, w, 14, 6); ART.fillOut(c, alpha('#1a1530', 0.75), 1.5); c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, u.x, y + 0.5);
  if (act) { const a = y - 16 + Math.sin(T * 6) * 2; c.beginPath(); c.moveTo(u.x - 6, a - 5); c.lineTo(u.x + 6, a - 5); c.lineTo(u.x, a + 2); c.closePath(); ART.fillOut(c, col, 1.8); }
}
function drawWind(x, y) {
  ART.rr(c, x - 64, y - 14, 128, 28, 10); ART.fillOut(c, 'rgba(26,21,48,.72)', 2);
  label('Viento', x - 36, y + 1, 11, '#cfe2f6');
  const L = Math.abs(wind) * 44, s = Math.sign(wind) || 1, cx = x + 22;
  if (Math.abs(wind) < 0.05) { label('calma', cx, y + 1, 11, '#fff'); return; }
  c.save(); c.translate(cx - s * L / 2, y + 1); c.fillStyle = '#7cf7a0'; c.strokeStyle = OUT; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(0, -3); c.lineTo(s * (L - 6), -3); c.lineTo(s * (L - 6), -7); c.lineTo(s * L, 0); c.lineTo(s * (L - 6), 7); c.lineTo(s * (L - 6), 3); c.lineTo(0, 3); c.closePath(); c.fill(); c.stroke(); c.restore();
}
function drawHUD() {
  let x = 10; const y = 10;
  for (const pl of P) {
    const mine = U.filter((u) => u.team === pl.i), hp = mine.reduce((s, u) => s + u.hp, 0), tot = MD.hp * MD.units, dead = !teamAlive(pl.i), act = cur && cur.team === pl.i && M !== 'snow';
    const w = 88; ART.rr(c, x, y, w, 30, 9); ART.fillOut(c, act ? alpha(pl.col, 0.45) : 'rgba(26,21,48,.72)', act ? 2.6 : 2);
    c.globalAlpha = dead ? 0.45 : 1; c.fillStyle = pl.col; ART.rr(c, x + 6, y + 6, 8, 8, 2); c.fill();
    c.font = '800 11px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(pl.name.slice(0, 9), x + 18, y + 10.5);
    if (M === 'snow') { for (let i = 0; i < MD.hp; i++) ART.heart(c, x + 12 + i * 13, y + 22, 0.42, i < hp); label(pl.pts + ' pts', x + w - 20, y + 22, 10, '#ffd166'); }
    else { ART.rr(c, x + 6, y + 18, w - 12 - (MD.wins > 1 ? 14 : 0), 6, 3); c.fillStyle = 'rgba(0,0,0,.4)'; c.fill(); c.fillStyle = pl.col; ART.rr(c, x + 6, y + 18, Math.max(0, (w - 12 - (MD.wins > 1 ? 14 : 0)) * hp / tot), 6, 3); c.fill();
      if (MD.wins > 1) for (let i = 0; i < MD.wins; i++) { c.beginPath(); c.arc(x + w - 10, y + 12 + i * 9, 3.2, 0, TAU); ART.fillOut(c, i < pl.wins ? '#ffd166' : 'rgba(255,255,255,.15)', 1.2); } }
    c.globalAlpha = 1; x += w + 6;
  }
  drawWind(W - 76, 24);
  if (M === 'snow') { const left = Math.max(0, Math.ceil(MD.len - rt)); label(`Ronda ${round}/${MD.rounds}`, W - 76, 52, 12, '#fff'); if (phase === 'play') label(String(left), W - 76, 74, 20, left <= 10 ? '#ff8a6a' : '#fff'); }
  else if (phase === 'aim' && cur) { const tt = Math.max(0, Math.ceil(turnT)); c.beginPath(); c.arc(W - 160, 24, 15, 0, TAU); ART.fillOut(c, 'rgba(26,21,48,.72)', 2); c.strokeStyle = tt <= 5 ? '#ff8a6a' : pOf(cur).col; c.lineWidth = 3; c.beginPath(); c.arc(W - 160, 24, 11, -Math.PI / 2, -Math.PI / 2 + TAU * turnT / MD.turnLen); c.stroke(); label(String(tt), W - 160, 25, 11, '#fff');
    const w = WEAP[cur.weap], pl = pOf(cur), am = pl.ammo[w.id]; ART.rr(c, W - 200 - 118, 12, 110, 24, 9); ART.fillOut(c, 'rgba(26,21,48,.72)', 2); label(w.name + (am > 0 ? ' ×' + am : ''), W - 263, 25, 12, '#fff');
    if (M === 'cannon') { ART.rr(c, W - 318, 40, 110, 6, 3); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill(); c.fillStyle = '#ffd166'; ART.rr(c, W - 318, 40, 110 * Math.max(0, fuel) / MD.fuel, 6, 3); c.fill(); } }
}
function draw() {
  ART.background(c, TH, W, H, 0, 0, T);
  for (const a of amb) if (a.bg) { c.globalAlpha = 0.75; if (a.kind === 'flake') { c.fillStyle = '#fff'; c.beginPath(); c.arc(a.x, a.y, 1.6 * a.s, 0, TAU); c.fill(); } else { c.fillStyle = a.kind === 'leaf' ? '#6fd08a' : '#fff6d0'; c.save(); c.translate(a.x, a.y); c.rotate(a.ph); c.beginPath(); c.ellipse(0, 0, 3 * a.s, 1.4 * a.s, 0, 0, TAU); c.fill(); c.restore(); } }
  c.globalAlpha = 1;
  drawWater(false);
  c.drawImage(TC, 0, 0, W, H);
  for (const g of graves) { c.save(); c.translate(g.x, g.y); ART.rr(c, -5, -13, 10, 13, 4); ART.fillOut(c, '#b7b3c9', 1.8); c.fillStyle = g.col; c.fillRect(-1, -11, 2, 7); c.fillRect(-3, -9, 6, 2); c.restore(); }
  for (const u of U) { const act = u === cur && phase === 'aim' && M !== 'snow';
    if (u.rope) { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(u.rope.x, u.rope.y); c.lineTo(u.x, u.y - 8); c.stroke(); c.strokeStyle = '#e8d7a8'; c.lineWidth = 1.5; c.stroke(); c.beginPath(); c.arc(u.rope.x, u.rope.y, 3, 0, TAU); ART.fillOut(c, '#c9c9c9', 1.2); }
    if (u.ropeMiss) { c.globalAlpha = u.ropeMiss.t * 3; c.strokeStyle = '#e8d7a8'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(u.x, u.y - 10); c.lineTo(u.ropeMiss.x, u.ropeMiss.y); c.stroke(); c.globalAlpha = 1; }
    if (!u.alive && M !== 'snow') continue;
    if (M === 'cannon') drawTank(u, act); else if (M === 'worms') drawBug(u, act); else drawKid(u);
    if (M !== 'snow') hpTag(u, act);
    else if (u.alive) { for (let i = 0; i < u.ammo; i++) { c.beginPath(); c.arc(u.x - (u.ammo - 1) * 4 + i * 8, u.y + 9, 2.6, 0, TAU); ART.fillOut(c, '#fff', 1.1); } const pl = pOf(u); if (!pl.cpu) label(k.party ? pl.name.slice(0, 8) : 'Tú', u.x, u.y - 50, 11, pl.col); }
  }
  for (const s of shots) drawShot(s);
  for (const a of amb) if (!a.bg) { c.globalAlpha = Math.min(1, a.t * 2); if (a.smoke) { c.fillStyle = 'rgba(230,226,240,.55)'; c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill(); } else { c.fillStyle = a.melt ? '#9fd4ff' : '#bfe6ff'; c.beginPath(); c.arc(a.x, a.y, 2, 0, TAU); c.fill(); } }
  c.globalAlpha = 1;
  for (const b of booms) { const p = b.t / 0.6; c.globalAlpha = 1 - p; c.fillStyle = '#fff2b0'; c.beginPath(); c.arc(b.x, b.y, b.r * (0.5 + p * 0.9), 0, TAU); c.fill(); c.strokeStyle = '#ff8a3c'; c.lineWidth = 4 * (1 - p) + 1; c.stroke(); c.globalAlpha = 1; }
  drawWater(true);
  for (const s of shots) if (s.y < 0) { c.beginPath(); c.moveTo(s.x, 4); c.lineTo(s.x - 6, 14); c.lineTo(s.x + 6, 14); c.closePath(); ART.fillOut(c, '#fff', 1.6); }
  if (k.st === 'play') {
    if (M === 'snow') { for (const u of U) if (u.alive && !pOf(u).cpu && (u.chg || u.power > 0)) drawAim(u); else if (u.alive && !pOf(u).cpu && !u.crouch && phase === 'play') { const [dx, dy] = aimVec(u), [mx, my] = muzzle(u); c.fillStyle = 'rgba(255,255,255,.55)'; for (let d = 8; d < 30; d += 7) { c.beginPath(); c.arc(mx + dx * d, my + dy * d, 1.8, 0, TAU); c.fill(); } } }
    else if (phase === 'aim' && cur && !pOf(cur).cpu) drawAim(cur);
    else if (phase === 'aim' && cur && pOf(cur).cpu && cur.chg) drawAim(cur);
  }
  drawHUD();
  if (bannerT > 0 && banner && k.st === 'play') {
    const a = Math.min(1, bannerT * 2.5); c.globalAlpha = a; c.font = '800 26px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(banner.t).width + 44, by = H * 0.3;
    ART.rr(c, W / 2 - mw / 2, by - 24, mw, 48, 14); ART.fillOut(c, 'rgba(26,21,48,.86)', 3); c.strokeStyle = banner.col; c.lineWidth = 2; ART.rr(c, W / 2 - mw / 2 + 4, by - 20, mw - 8, 40, 11); c.stroke();
    label(banner.t, W / 2, by + 1, 26, banner.col);
    if (banner.list) banner.list.forEach((pl, j) => label(`${pl.name} +${pl.gain}`, W / 2 - (banner.list.length - 1) * 60 + j * 120, by + 44, 14, pl.col));
    c.globalAlpha = 1;
  }
}
