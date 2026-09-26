/* naval — barcos con inercia, viento y andanadas laterales (oleada 1). CFG.mode 'piratas' (Barcos Piratas, 1–4).
 * El viento decide la velocidad: de través vuela, de popa va rápido y de proa se queda en facha (hay que virar en zigzag).
 * A = andanada por babor (izquierda), B = por estribor (derecha); cada banda recarga por su cuenta.
 * Rondas de 60 s: cofre +1, hundir +2 (el hundido suelta parte del botín). Gana la partida quien se lleve 2 rondas.
 * Siempre navegan 4 barcos: humanos según las plazas de la tele y CPU en el resto; la CPU mejora con victorias (cpu:<id>). */
const OUT = ART.OUT, TAU = Math.PI * 2, { mix, lite, dark, alpha, rr, glint, shadow } = ART;
const PORT = innerHeight > innerWidth, W = PORT ? 405 : 720, H = PORT ? 720 : 405;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#0f4f7a' }), c = k.ctx;
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
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
const wrapA = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
function mk(w, h, res, draw) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * res); cv.height = Math.ceil(h * res); const q = cv.getContext('2d'); q.scale(res, res); if (draw) draw(q); return cv; }
function RNG(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
let LV = 0; try { LV = clamp(+localStorage.getItem('cpu:' + CFG.id) || 0, 0, 9); } catch (e) { /* sin almacenamiento */ }
const NS = 4, ROUND_T = 60, WINS = 2, HP = 5, RELOAD = 1.8, BALL_V = 265, BALL_T = 0.9, VMAX = 92, R_SHIP = 14, CN = ['roja', 'azul', 'amarilla', 'verde'];
/* Velocidad según el ángulo entre el rumbo y hacia donde sopla el viento (0 = de popa, π = de proa) */
const POLAR = [[0, 0.74], [0.6, 0.86], [1.2, 0.98], [1.6, 1], [2.0, 0.86], [2.3, 0.6], [2.5, 0.2], [Math.PI, 0.1]];
function polar(th) { th = Math.abs(th); for (let i = 1; i < POLAR.length; i++) if (th <= POLAR[i][0]) { const [a0, v0] = POLAR[i - 1], [a1, v1] = POLAR[i]; return lerp(v0, v1, (th - a0) / (a1 - a0)); } return 0.1; }

/* ---------- Mar e islas (cacheados) ---------- */
const SEA = mk(W, H, 2, (q) => {
  const g = q.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, Math.max(W, H) * 0.75); g.addColorStop(0, '#2a9bd0'); g.addColorStop(0.6, '#1c7fb6'); g.addColorStop(1, '#125d8f'); q.fillStyle = g; q.fillRect(0, 0, W, H);
  const r = RNG(5); q.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 60; i++) { q.beginPath(); q.ellipse(r() * W, r() * H, 20 + r() * 50, 6 + r() * 10, r() * 3, 0, TAU); q.fill(); }
});
const WAVE = (() => { const cv = mk(96, 96, 2, (q) => { q.strokeStyle = 'rgba(255,255,255,.22)'; q.lineWidth = 1.6; q.lineCap = 'round'; const r = RNG(11); for (let i = 0; i < 7; i++) { const x = r() * 96, y = r() * 96; q.beginPath(); q.arc(x, y, 6, Math.PI * 1.15, Math.PI * 1.85); q.stroke(); } }); const p = c.createPattern(cv, 'repeat'); try { p.setTransform(new DOMMatrix().scale(0.5)); } catch (e) { /* antiguo */ } return p; })();
let isles = [], isleCv = null;
function makeIsles(seed) {
  const r = RNG(seed), n = PORT ? 4 : 4, out = [], cx = W / 2, cy = H / 2;
  for (let t = 0; t < 300 && out.length < n; t++) {
    const rad = 22 + r() * 18, x = 70 + r() * (W - 140), y = 80 + r() * (H - 140);
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + rad + 70)) continue;
    if ([[60, 70], [W - 60, 70], [60, H - 60], [W - 60, H - 60]].some(([a, b]) => Math.hypot(a - x, b - y) < rad + 80)) continue;
    if (out.length === 0 && Math.hypot(x - cx, y - cy) > 80) continue; /* una isla central */
    out.push({ x, y, r: rad, seed: r() * 1000, palms: 1 + Math.floor(r() * 3) });
  }
  isles = out;
  isleCv = mk(W, H, 2, (q) => {
    for (const o of out) {
      const rr2 = RNG(o.seed | 0), pts = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; pts.push([Math.cos(a), Math.sin(a), 0.86 + rr2() * 0.22]); }
      const blob = (s, dx, dy) => { q.beginPath(); pts.forEach(([cx2, sy2, m], i) => { const X = o.x + dx + cx2 * o.r * s * m, Y = o.y + dy + sy2 * o.r * s * m; i ? q.lineTo(X, Y) : q.moveTo(X, Y); }); q.closePath(); };
      blob(1.55, 0, 0); q.fillStyle = 'rgba(120,230,220,.35)'; q.fill();
      blob(1.25, 0, 0); q.fillStyle = 'rgba(160,240,225,.45)'; q.fill();
      blob(1, 2, 4); q.fillStyle = 'rgba(10,40,60,.3)'; q.fill();
      blob(1, 0, 0); const g = q.createLinearGradient(o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r); g.addColorStop(0, '#fff0b8'); g.addColorStop(1, '#e0bc72'); q.fillStyle = g; q.fill(); q.lineWidth = 2.5; q.strokeStyle = OUT; q.stroke();
      blob(0.62, -o.r * 0.08, -o.r * 0.1); const g2 = q.createLinearGradient(o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r); g2.addColorStop(0, '#7ad35f'); g2.addColorStop(1, '#3f9a45'); q.fillStyle = g2; q.fill(); q.lineWidth = 1.8; q.stroke();
      for (let i = 0; i < 2; i++) { const a = rr2() * TAU, d = o.r * 0.8; q.beginPath(); q.ellipse(o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, 5, 3.5, a, 0, TAU); q.fillStyle = '#9d97ad'; q.fill(); q.lineWidth = 1.5; q.strokeStyle = OUT; q.stroke(); }
      for (let i = 0; i < o.palms; i++) { const a = rr2() * TAU, d = rr2() * o.r * 0.35, px = o.x + Math.cos(a) * d - 3, py = o.y + Math.sin(a) * d - 4;
        q.fillStyle = 'rgba(10,40,20,.25)'; q.beginPath(); q.arc(px + 4, py + 5, 12, 0, TAU); q.fill();
        for (let l = 0; l < 6; l++) { const la = l / 6 * TAU + a; q.beginPath(); q.moveTo(px, py); q.quadraticCurveTo(px + Math.cos(la + 0.3) * 9, py + Math.sin(la + 0.3) * 9, px + Math.cos(la) * 14, py + Math.sin(la) * 14); q.quadraticCurveTo(px + Math.cos(la - 0.3) * 7, py + Math.sin(la - 0.3) * 7, px, py); q.fillStyle = l % 2 ? '#3fae4a' : '#5cc85a'; q.fill(); q.lineWidth = 1.3; q.strokeStyle = OUT; q.stroke(); }
        q.beginPath(); q.arc(px, py, 2.6, 0, TAU); q.fillStyle = '#8a5a3b'; q.fill(); }
    }
  });
}

/* ---------- Sprites ---------- */
const SPR = {};
function hullSprite(col) {
  if (SPR[col]) return SPR[col];
  return (SPR[col] = mk(56, 32, 3, (g) => {
    g.translate(28, 16); g.lineJoin = 'round';
    const hull = () => { g.beginPath(); g.moveTo(24, 0); g.bezierCurveTo(16, -9, 4, -10, -14, -9); g.lineTo(-20, -6); g.lineTo(-20, 6); g.lineTo(-14, 9); g.bezierCurveTo(4, 10, 16, 9, 24, 0); g.closePath(); };
    g.fillStyle = OUT; for (const s of [-1, 1]) for (const x of [-9, 0, 9]) { rr(g, x - 2.5, s * 9 - 2.5 + s * 1.5, 5, 5, 1.2); g.fill(); }
    hull(); const gr = g.createLinearGradient(0, -10, 0, 10); gr.addColorStop(0, '#b77a45'); gr.addColorStop(1, '#6e4222'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
    g.save(); hull(); g.clip(); g.fillStyle = col; g.fillRect(-22, -11, 50, 3); g.fillRect(-22, 8, 50, 3);
    g.beginPath(); g.moveTo(20, 0); g.bezierCurveTo(13, -6, 3, -7, -12, -6); g.lineTo(-16, -4); g.lineTo(-16, 4); g.lineTo(-12, 6); g.bezierCurveTo(3, 7, 13, 6, 20, 0); g.fillStyle = '#d9a86c'; g.fill();
    g.strokeStyle = 'rgba(110,66,34,.5)'; g.lineWidth = 0.8; for (let y = -4; y <= 4; y += 2.6) { g.beginPath(); g.moveTo(-16, y); g.lineTo(18, y * 0.7); g.stroke(); } g.restore();
    rr(g, -18, -5, 7, 10, 2); g.fillStyle = '#8a5530'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
    for (const x of [-4, 10]) { g.beginPath(); g.arc(x, 0, 2.2, 0, TAU); g.fillStyle = '#5a3a20'; g.fill(); g.lineWidth = 1.2; g.stroke(); }
    g.beginPath(); g.moveTo(24, 0); g.lineTo(30, 0); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  }));
}
function chestSprite() {
  if (SPR.chest) return SPR.chest;
  return (SPR.chest = mk(26, 22, 3, (g) => {
    g.lineJoin = 'round'; rr(g, 3, 7, 20, 13, 2.5); const gr = g.createLinearGradient(0, 7, 0, 20); gr.addColorStop(0, '#b77a45'); gr.addColorStop(1, '#7a4a26'); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(3, 9); g.quadraticCurveTo(13, -1, 23, 9); g.closePath(); g.fillStyle = '#c98a4b'; g.fill(); g.stroke();
    g.fillStyle = '#ffd166'; g.fillRect(3, 9, 20, 2.2); g.fillRect(11.5, 6, 3, 14); g.strokeStyle = OUT; g.lineWidth = 1; g.strokeRect(11.5, 11, 3, 4);
    g.fillStyle = '#fff2b0'; g.beginPath(); g.arc(8, 5, 1.6, 0, TAU); g.fill();
  }));
}

/* ---------- Estado ---------- */
let ships, balls, chests, fx, wakes, wind, windT, windTo, roundN, roundT, phase, phT, chestT, lastMsg, msgT, cdPend = false, streaks, bestOf;
const spawnPts = () => [[62, 64, 0.6], [W - 62, H - 64, 0.6 + Math.PI], [W - 62, 64, Math.PI - 0.6], [62, H - 64, -0.6]].map(([x, y, a]) => ({ x, y, a: PORT ? a + 0.4 : a }));
const skill = () => clamp(0.245 + LV * 0.06 + (roundN - 1) * 0.03, 0.2, 0.85); /* 1.23: más fácil (antes 0,35 + 0,12/victoria, tope 0,98) */
function mkShip(p) { const hu = k.human(p); return { p, col: k.pcol(p), cpu: !hu, name: hu ? (k.party ? 'J' + (p + 1) : 'Tú') : 'CPU', x: 0, y: 0, a: 0, v: 0, vx: 0, vy: 0, hp: HP, rl: 0, rr: 0, pts: 0, total: 0, wins: 0, dead: 0, inv: 0, hurtT: 0, tack: 0, tackT: 0, goal: null, goalT: 0, react: 0, sail: 0, bump: 0 }; }
function place(s, i) { const sp = spawnPts()[i]; Object.assign(s, { x: sp.x, y: sp.y, a: sp.a, v: 20, vx: 0, vy: 0, hp: HP, dead: 0, inv: 3, rl: 0.5, rr: 0.5 }); }
function newRound() {
  roundT = ROUND_T; phase = 'run'; balls = []; chests = []; fx = []; wakes = []; chestT = 1.2;
  makeIsles(roundN * 131 + Math.floor(Math.random() * 1000));
  wind = Math.random() * TAU; windTo = wind; windT = 26 + Math.random() * 8;
  ships.forEach((s, i) => { place(s, i); s.pts = 0; });
  for (let i = 0; i < 3; i++) spawnChest();
  lastMsg = `Ronda ${roundN}`; msgT = 2.5; cdPend = true;
}
function reset() { roundN = 1; ships = Array.from({ length: NS }, (_, p) => mkShip(p)); streaks = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 10 + Math.random() * 24, t: Math.random() })); newRound(); }
k.onParty = () => { if (k.st !== 'play') { reset(); return; } for (const s of ships) { const hu = k.human(s.p); s.cpu = !hu; s.col = k.pcol(s.p); s.name = hu ? (k.party ? 'J' + (s.p + 1) : 'Tú') : 'CPU'; } };
const freeAt = (x, y, r) => x > r && y > r && x < W - r && y < H - r && !isles.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r);
function spawnChest(x, y) {
  if (x === undefined) { for (let t = 0; t < 60; t++) { const X = 40 + Math.random() * (W - 80), Y = 50 + Math.random() * (H - 90); if (freeAt(X, Y, 26) && !ships.some((s) => Math.hypot(s.x - X, s.y - Y) < 80) && !chests.some((q) => Math.hypot(q.x - X, q.y - Y) < 60)) { x = X; y = Y; break; } } if (x === undefined) return; }
  chests.push({ x, y, t: Math.random() * 6, life: 0, vx: 0, vy: 0 });
}

/* ---------- Barcos ---------- */
function sailF(s) { return polar(wrapA(s.a - wind)); }
function steerTo(s, tgt, dt) { const da = wrapA(tgt - s.a), rate = 1.7 * (0.4 + 0.6 * Math.min(1, s.v / 50)); s.a += clamp(da, -rate * dt, rate * dt); }
function fire(s, side) {
  const key = side < 0 ? 'rl' : 'rr'; if (s[key] > 0 || s.dead) return false;
  s[key] = s.cpu ? RELOAD * 1.33 : RELOAD; const fa = s.a + side * Math.PI / 2, fx0 = Math.cos(s.a), fy0 = Math.sin(s.a), vx = Math.cos(s.a) * s.v, vy = Math.sin(s.a) * s.v;
  for (const off of [-9, 0, 9]) { const a = fa + (Math.random() - 0.5) * 0.08, px = s.x + fx0 * off + Math.cos(fa) * 11, py = s.y + fy0 * off + Math.sin(fa) * 11;
    balls.push({ x: px, y: py, vx: Math.cos(a) * BALL_V + vx * 0.8, vy: Math.sin(a) * BALL_V + vy * 0.8, t: BALL_T + Math.random() * 0.08, owner: s });
    for (let n = 0; n < 4; n++) fx.push({ x: px, y: py, vx: Math.cos(fa) * 40 + (Math.random() - 0.5) * 30, vy: Math.sin(fa) * 40 + (Math.random() - 0.5) * 30, t: 0.7, max: 0.7, r: 4 + Math.random() * 4, col: '#e9e6f2', smoke: 1 }); }
  k.sfx('shoot'); if (!s.cpu) k.shake(2); return true;
}
function humanCtl(s, dt) {
  const d = k.pdir(s.p); let tgt = null;
  if (d.x || d.y) tgt = Math.atan2(d.y, d.x);
  if (!k.party && s.p === 0 && k.ptr.down) { const dx = k.ptr.x - s.x, dy = k.ptr.y - s.y; if (dx * dx + dy * dy > 400) tgt = Math.atan2(dy, dx); }
  if (tgt !== null) steerTo(s, tgt, dt);
  if (k.phit(s.p, 'a')) fire(s, -1); if (k.phit(s.p, 'b')) fire(s, 1);
}
/* Rumbo hacia un punto teniendo en cuenta el viento: si el rumbo directo es de ceñida imposible, bordea (zigzag) */
function courseTo(s, x, y, dt) {
  let want = Math.atan2(y - s.y, x - s.x);
  if (polar(wrapA(want - wind)) < 0.5) {
    s.tackT -= dt; const up = wind + Math.PI, t1 = up + 0.85, t2 = up - 0.85;
    if (s.tackT <= 0 || !s.tack) { s.tack = Math.abs(wrapA(t1 - want)) < Math.abs(wrapA(t2 - want)) ? 1 : -1; s.tackT = 2.2 + Math.random(); }
    want = s.tack > 0 ? t1 : t2;
  }
  /* islas y bordes */
  for (const dd of [34, 70]) { const px = s.x + Math.cos(s.a) * dd, py = s.y + Math.sin(s.a) * dd;
    for (const o of isles) if (Math.hypot(px - o.x, py - o.y) < o.r + 22) { const cr = Math.cos(s.a) * (o.y - s.y) - Math.sin(s.a) * (o.x - s.x); want = s.a + (cr > 0 ? -1.1 : 1.1); } }
  if (s.x < 40 || s.x > W - 40 || s.y < 40 || s.y > H - 40) { const cw = Math.atan2(H / 2 - s.y, W / 2 - s.x); if (Math.abs(wrapA(cw - s.a)) > 0.8) want = cw; }
  steerTo(s, want, dt);
}
function cpuCtl(s, dt) {
  const sk = skill(); s.goalT -= dt;
  if (s.goalT <= 0 || (s.goal && s.goal.ship && (s.goal.ship.dead || s.goal.ship.inv > 0)) || (s.goal && s.goal.chest && !chests.includes(s.goal.chest))) {
    s.goalT = 1 + Math.random(); s.goal = null;
    const foes = ships.filter((o) => o !== s && !o.dead && o.inv <= 0).map((o) => ({ o, d: Math.hypot(o.x - s.x, o.y - s.y) - (HP - o.hp) * 25 - (o.cpu ? 0 : 20) }));
    foes.sort((a, b) => a.d - b.d); const ch = chests.slice().sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
    const aggro = 0.35 + sk * 0.4 + (s.hp < 3 ? -0.3 : 0);
    if (foes.length && foes[0].d < 230 && Math.random() < aggro) s.goal = { ship: foes[0].o };
    else if (ch) s.goal = { chest: ch }; else if (foes.length) s.goal = { ship: foes[0].o };
  }
  if (s.goal && s.goal.ship) { const o = s.goal.ship, d = Math.hypot(o.x - s.x, o.y - s.y), to = Math.atan2(o.y - s.y, o.x - s.x);
    if (d > 170) courseTo(s, o.x, o.y, dt);
    else { /* ponerse de través: rumbo perpendicular al rival, el que mejor navegue */ const h1 = to + Math.PI / 2, h2 = to - Math.PI / 2, pick = polar(wrapA(h1 - wind)) + (Math.abs(wrapA(h1 - s.a)) < 1.5 ? 0.3 : 0) > polar(wrapA(h2 - wind)) + (Math.abs(wrapA(h2 - s.a)) < 1.5 ? 0.3 : 0) ? h1 : h2;
      const px = s.x + Math.cos(pick) * 80, py = s.y + Math.sin(pick) * 80; courseTo(s, px, py, dt); } }
  else if (s.goal && s.goal.chest) courseTo(s, s.goal.chest.x, s.goal.chest.y, dt);
  else courseTo(s, W / 2, H / 2, dt);
  /* disparo: rival a tiro por un costado (con anticipación según el nivel) */
  s.react -= dt; if (s.react > 0 || roundT > ROUND_T - 3) return;
  s.react = lerp(0.45, 0.12, sk);
  for (const o of ships) { if (o === s || o.dead || o.inv > 0) continue; const d = Math.hypot(o.x - s.x, o.y - s.y); if (d > 235) continue;
    const tt = d / BALL_V, px = o.x + Math.cos(o.a) * o.v * tt * sk - Math.cos(s.a) * s.v * tt * 0.8, py = o.y + Math.sin(o.a) * o.v * tt * sk - Math.sin(s.a) * s.v * tt * 0.8;
    const rel = wrapA(Math.atan2(py - s.y, px - s.x) - s.a), tol = lerp(0.34, 0.14, sk) + 14 / Math.max(40, d);
    if (Math.abs(rel + Math.PI / 2) < tol && Math.random() < 0.4 + sk * 0.6) { if (fire(s, -1)) return; }
    if (Math.abs(rel - Math.PI / 2) < tol && Math.random() < 0.4 + sk * 0.6) { if (fire(s, 1)) return; } }
}
function sink(s, by) {
  s.dead = 3; s.hp = 0; k.sfx('explode'); k.shake(s.cpu ? 4 : 8); k.burst(s.x, s.y, '#ffb24d', 26, 200); k.burst(s.x, s.y, '#8a5a3b', 16, 150);
  for (let n = 0; n < 14; n++) fx.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, t: 2.5, max: 2.5, r: 3 + Math.random() * 3, col: '#8a5a3b', plank: Math.random() * 3 });
  const drop = Math.min(2, s.pts); s.pts -= drop; for (let i = 0; i < drop; i++) { const a = Math.random() * TAU; chests.push({ x: clamp(s.x + Math.cos(a) * 26, 20, W - 20), y: clamp(s.y + Math.sin(a) * 26, 30, H - 20), t: 0, life: 0, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 }); }
  if (by) { by.pts += 2; k.float('+2 ¡Hundido!', by.x, by.y - 24, by.col); }
  k.float(`${s.name === 'Tú' ? '¡Te hunden!' : s.name + ' a pique'}`, s.x, s.y - 10, '#fff');
}
function hurt(s, by, n) { if (s.inv > 0 || s.dead) return; s.hp -= n; s.hurtT = 0.3; if (!s.cpu) { k.sfx('hurt'); k.flash('rgba(255,80,80,.25)'); } else k.sfx('hit'); if (s.hp <= 0) sink(s, by); else if (!s.cpu && !k.party) s.inv = 1.5; /* 1.23: respiro tras recibir daño */ }

/* ---------- Bucle ---------- */
function update(dt) {
  if (!k.gate(reset)) return;
  if (cdPend) { cdPend = false; k.count(3); }
  msgT -= dt; for (const st of streaks) { st.x += Math.cos(wind) * 70 * dt; st.y += Math.sin(wind) * 70 * dt; st.t += dt * 0.4; if (st.x < -30 || st.x > W + 30 || st.y < -30 || st.y > H + 30) { st.x = Math.random() * W; st.y = Math.random() * H; st.t = 0; } }
  updFx(dt);
  if (phase === 'gap') { phT -= dt; if (phT <= 0) { roundN++; newRound(); } return; }
  if (phase === 'end') return;
  if (k.counting()) return;
  roundT -= dt;
  /* el viento rola a mitad de ronda */
  windT -= dt; if (windT <= 0) { windT = 999; windTo = wind + (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.7); lastMsg = '¡Rola el viento!'; msgT = 2; k.sfx('tick'); }
  wind += clamp(wrapA(windTo - wind), -0.35 * dt, 0.35 * dt);
  for (const s of ships) {
    if (s.dead > 0) { s.dead -= dt; if (s.dead <= 0) { const sp = spawnPts().map((q, i) => ({ q, i, d: Math.min(...ships.filter((o) => o !== s && !o.dead).map((o) => Math.hypot(o.x - q.x, o.y - q.y)), 999) })).sort((a, b) => b.d - a.d)[0]; place(s, sp.i); s.inv = 2; } continue; }
    s.inv -= dt; s.rl -= dt; s.rr -= dt; s.hurtT -= dt; s.bump -= dt;
    if (s.cpu) cpuCtl(s, dt); else humanCtl(s, dt);
    const tv = VMAX * sailF(s) * (0.85 + 0.15 * Math.min(1, (ROUND_T - roundT) / 12)); s.v += (tv - s.v) * (tv > s.v ? 0.7 : 1.1) * dt;
    s.sail = lerp(s.sail, sailF(s), dt * 3);
    s.vx = s.vx * Math.exp(-2 * dt) + Math.cos(wind) * 8 * dt * 2; s.vy = s.vy * Math.exp(-2 * dt) + Math.sin(wind) * 8 * dt * 2;
    s.x += (Math.cos(s.a) * s.v + s.vx) * dt; s.y += (Math.sin(s.a) * s.v + s.vy) * dt;
    if (s.x < R_SHIP) { s.x = R_SHIP; s.vx = 20; } if (s.x > W - R_SHIP) { s.x = W - R_SHIP; s.vx = -20; } if (s.y < R_SHIP) { s.y = R_SHIP; s.vy = 20; } if (s.y > H - R_SHIP) { s.y = H - R_SHIP; s.vy = -20; }
    for (const o of isles) { const dx = s.x - o.x, dy = s.y - o.y, d = Math.hypot(dx, dy), R = o.r + R_SHIP - 2; if (d < R) { const nx = dx / d, ny = dy / d; s.x = o.x + nx * R; s.y = o.y + ny * R; s.vx += nx * 40; s.vy += ny * 40; if (s.v > 45 && s.bump <= 0) { s.bump = 1; hurt(s, null, 1); for (let n = 0; n < 6; n++) fx.push({ x: s.x - nx * 12, y: s.y - ny * 12, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, t: 0.5, max: 0.5, r: 2.5, col: '#fff0b8' }); } s.v *= 0.5; } }
    if (Math.random() < dt * (4 + s.v / 10)) wakes.push({ x: s.x - Math.cos(s.a) * 20, y: s.y - Math.sin(s.a) * 20, t: 1.4, r: 3 + s.v / 30 });
    for (let i = chests.length - 1; i >= 0; i--) { const q = chests[i]; if (q.life < 0.4) continue; if (Math.hypot(q.x - s.x, q.y - s.y) < 22) { chests.splice(i, 1); s.pts++; k.float('+1', q.x, q.y - 14, '#ffd166'); if (!s.cpu) k.sfx('coin'); else k.sfx('pop'); for (let n = 0; n < 8; n++) fx.push({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, t: 0.5, max: 0.5, r: 2.2, col: '#ffd166' }); } }
  }
  for (let i = 0; i < ships.length; i++) for (let j = i + 1; j < ships.length; j++) { const a = ships[i], b = ships[j]; if (a.dead || b.dead) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 26 && d > 0.01) { const nx = dx / d, ny = dy / d, ov = (26 - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov; a.vx -= nx * 30; a.vy -= ny * 30; b.vx += nx * 30; b.vy += ny * 30; a.v *= 0.9; b.v *= 0.9; } }
  for (let i = balls.length - 1; i >= 0; i--) { const b = balls[i]; b.t -= dt; b.x += b.vx * dt; b.y += b.vy * dt; let end = b.t <= 0, hitS = null;
    for (const s of ships) if (s !== b.owner && !s.dead && Math.hypot(s.x - b.x, s.y - b.y) < R_SHIP + 2) hitS = s;
    const isl = isles.find((o) => Math.hypot(o.x - b.x, o.y - b.y) < o.r);
    if (hitS) { hurt(hitS, b.owner, 1); k.burst(b.x, b.y, '#ffd166', 8, 140); k.burst(b.x, b.y, '#8a5a3b', 5, 100); end = true; }
    else if (isl) { for (let n = 0; n < 5; n++) fx.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, t: 0.5, max: 0.5, r: 2.5, col: '#fff0b8' }); end = true; }
    else if (end) { fx.push({ x: b.x, y: b.y, t: 0.6, max: 0.6, ring: 1, r: 4 }); for (let n = 0; n < 5; n++) fx.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 70, t: 0.4, max: 0.4, r: 2, col: '#e8fbff' }); }
    if (end) balls.splice(i, 1); }
  for (const q of chests) { q.t += dt; q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt; q.vy *= 1 - dt; q.x += Math.cos(wind) * 4 * dt; q.y += Math.sin(wind) * 4 * dt; q.x = clamp(q.x, 16, W - 16); q.y = clamp(q.y, 26, H - 16); for (const o of isles) { const d = Math.hypot(q.x - o.x, q.y - o.y); if (d < o.r + 12) { q.x = o.x + (q.x - o.x) / d * (o.r + 12); q.y = o.y + (q.y - o.y) / d * (o.r + 12); } } }
  chestT -= dt; if (chestT <= 0) { chestT = lerp(2.4, 1.6, (ROUND_T - roundT) / ROUND_T); if (chests.length < 6) spawnChest(); }
  if (roundT <= 10 && Math.ceil(roundT) !== Math.ceil(roundT + dt) && roundT > 0) k.sfx('tick');
  if (roundT <= 0) endRound();
}
function updFx(dt) {
  for (const f of fx) { f.t -= dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 1 - 2 * dt; f.vy *= 1 - 2 * dt; } } for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t <= 0) fx.splice(i, 1);
  for (const w of wakes) w.t -= dt; while (wakes.length && wakes[0].t <= 0) wakes.shift(); if (wakes.length > 260) wakes.splice(0, wakes.length - 260);
}
function endRound() {
  const top = Math.max(...ships.map((s) => s.pts)), win = ships.filter((s) => s.pts === top);
  if (win.length === 1) win[0].wins++;
  ships.forEach((s) => { s.total += s.pts; });
  lastMsg = win.length === 1 ? `Ronda para ${win[0].name === 'Tú' ? 'ti' : win[0].cpu ? 'la CPU ' + CN[win[0].p] : win[0].name}` : '¡Empate en la ronda!'; msgT = 3.2;
  if (win.length === 1 && !win[0].cpu) { k.sfx('win'); k.confetti(win[0].col, 50); } else k.sfx('coin');
  const mx = Math.max(...ships.map((s) => s.wins));
  if (mx >= WINS || roundN >= 4) {
    phase = 'end';
    const rows = ships.map((s) => ({ p: s.p, score: s.wins * 1000 + s.total, name: s.cpu ? 'CPU ' + CN[s.p] : s.name })), champ = ships.slice().sort((a, b) => b.wins * 1000 + b.total - (a.wins * 1000 + a.total))[0];
    if (!k.party || !champ.cpu) { LV = clamp(LV + (champ.cpu ? (k.party ? 0 : -1) : 1), 0, 9); try { localStorage.setItem('cpu:' + CFG.id, LV); } catch (e) { /* sin almacenamiento */ } }
    if (!k.party) k.best(CFG.id, ships[0].total);
    const head = !k.party && !champ.cpu ? '¡Eres el rey de los mares!' : champ.cpu ? `¡Gana la CPU ${CN[champ.p]}!` : null;
    setTimeout(() => k.podium(rows, Object.assign({ fmt: (n) => `${Math.floor(n / 1000)} ronda${Math.floor(n / 1000) === 1 ? '' : 's'} · ${n % 1000} pts`, noTie: true }, head ? { head } : {})), 1400);
  } else { phase = 'gap'; phT = 3.4; }
}

/* ---------- Dibujo ---------- */
function drawShip(s, tt) {
  if (s.dead > 0) return;
  const blink = s.inv > 0 && Math.floor(tt * 10) % 2;
  c.save(); c.translate(s.x, s.y); c.rotate(s.a);
  c.globalAlpha = blink ? 0.5 : 1;
  c.fillStyle = 'rgba(8,40,70,.35)'; c.beginPath(); c.ellipse(3, 5, 24, 11, 0, 0, TAU); c.fill();
  const bob = Math.sin(tt * 2.2 + s.p) * 0.05; c.rotate(bob);
  c.drawImage(hullSprite(s.col), -28, -16, 56, 32);
  if (s.hurtT > 0) { c.globalAlpha = 0.5; c.fillStyle = '#ff5a5f'; c.beginPath(); c.ellipse(0, 0, 22, 10, 0, 0, TAU); c.fill(); c.globalAlpha = blink ? 0.5 : 1; }
  /* velas: la botavara se orienta con el viento y se hincha según la marcha */
  const rel = wrapA(wind - s.a), boom = clamp(rel * 0.5, -1.2, 1.2), full = 3 + s.sail * 7;
  for (const [mx, len] of [[10, 13], [-4, 16]]) {
    c.save(); c.translate(mx, 0); c.rotate(boom + Math.PI / 2);
    c.beginPath(); c.moveTo(-len, 0); c.quadraticCurveTo(0, full * Math.sign(Math.cos(rel - boom) || 1), len, 0); c.closePath();
    const g = c.createLinearGradient(0, -6, 0, 10); g.addColorStop(0, mix('#ffffff', s.col, 0.18)); g.addColorStop(1, mix('#dcd6e8', s.col, 0.45)); c.fillStyle = g; c.fill(); c.lineWidth = 1.8; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = s.col; c.fillRect(-len * 0.35, -1.2, len * 0.7, 2.4);
    c.lineWidth = 2.4; c.strokeStyle = '#5a3a20'; c.beginPath(); c.moveTo(-len - 1, 0); c.lineTo(len + 1, 0); c.stroke(); c.restore();
  }
  c.beginPath(); c.arc(-4, 0, 2.2, 0, TAU); c.arc(10, 0, 2, 0, TAU); c.fillStyle = '#3b2412'; c.fill();
  /* bandera en el palo mayor (ondea a sotavento) */
  c.save(); c.translate(-4, 0); c.rotate(rel); c.beginPath(); c.moveTo(0, 0); c.lineTo(11, -2 + Math.sin(tt * 9 + s.p) * 1.5); c.lineTo(10, 3); c.closePath(); c.fillStyle = s.col; c.fill(); c.lineWidth = 1.3; c.strokeStyle = OUT; c.stroke(); c.restore();
  c.restore(); c.globalAlpha = 1;
  /* vida y etiqueta */
  const y = s.y + 22; for (let i = 0; i < HP; i++) { c.fillStyle = i < s.hp ? (s.hp <= 2 ? '#ff5a5f' : '#7cf7a0') : 'rgba(0,0,0,.35)'; rr(c, s.x - 14 + i * 6, y, 5, 4, 1.5); c.fill(); }
  const tag = k.party ? (s.cpu ? 'CPU' : 'J' + (s.p + 1)) : s.cpu ? null : 'TÚ';
  if (tag) { c.font = '900 12px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const tw = c.measureText(tag).width + 10, ty = s.y - 30; rr(c, s.x - tw / 2, ty - 8, tw, 16, 6); c.fillStyle = s.col; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 2.5; c.strokeText(tag, s.x, ty + 1); c.fillText(tag, s.x, ty + 1); }
  /* recarga de cada banda (solo humanos) */
  if (!s.cpu) for (const [side, key] of [[-1, 'rl'], [1, 'rr']]) { const fa = s.a + side * Math.PI / 2, ok = s[key] <= 0, px = s.x + Math.cos(fa) * 18, py = s.y + Math.sin(fa) * 18;
    c.beginPath(); c.arc(px, py, 4, 0, TAU); c.fillStyle = ok ? '#ffd166' : 'rgba(0,0,0,.35)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
    if (ok) { c.strokeStyle = alpha(s.col, 0.35); c.lineWidth = 2; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(px + Math.cos(fa) * 6, py + Math.sin(fa) * 6); c.lineTo(px + Math.cos(fa) * 70, py + Math.sin(fa) * 70); c.stroke(); c.setLineDash([]); } }
}
function draw() {
  const tt = performance.now() / 1000;
  c.drawImage(SEA, 0, 0, W, H);
  c.save(); const ox = (tt * 12 * Math.cos(wind)) % 96, oy = (tt * 12 * Math.sin(wind)) % 96; c.translate(ox, oy); c.fillStyle = WAVE; c.fillRect(-ox - 2, -oy - 2, W + 4, H + 4); c.restore();
  c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath(); for (const st of streaks) { const a = Math.sin(st.t * Math.PI); if (a <= 0) continue; c.moveTo(st.x, st.y); c.lineTo(st.x - Math.cos(wind) * st.l, st.y - Math.sin(wind) * st.l); } c.stroke();
  for (const w of wakes) { c.globalAlpha = Math.max(0, w.t / 1.4) * 0.55; c.fillStyle = '#e8fbff'; c.beginPath(); c.arc(w.x, w.y, w.r * (1.6 - w.t / 1.4 * 0.6), 0, TAU); c.fill(); } c.globalAlpha = 1;
  if (isleCv) c.drawImage(isleCv, 0, 0, W, H);
  for (const q of chests) { const b = Math.sin(q.t * 3) * 2, sc = Math.min(1, q.life * 3); c.save(); c.translate(q.x, q.y + b); c.scale(sc, sc); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 7, 14 + Math.sin(q.t * 3) * 2, 5, 0, 0, TAU); c.stroke(); c.drawImage(chestSprite(), -13, -11, 26, 22); c.restore(); if (Math.sin(q.t * 2.3) > 0.9) glint(c, q.x + 7, q.y - 9, 3.5, '#fff6c0'); }
  for (const f of fx) if (f.ring) { const p = 1 - f.t / f.max; c.globalAlpha = 1 - p; c.strokeStyle = '#e8fbff'; c.lineWidth = 2; c.beginPath(); c.ellipse(f.x, f.y, 4 + p * 14, 3 + p * 9, 0, 0, TAU); c.stroke(); c.globalAlpha = 1; }
  for (const f of fx) if (f.plank !== undefined) { c.globalAlpha = Math.min(1, f.t); c.save(); c.translate(f.x, f.y); c.rotate(f.plank + f.t); c.fillStyle = f.col; c.fillRect(-5, -1.5, 10, 3); c.restore(); c.globalAlpha = 1; }
  for (const s of ships) drawShip(s, tt);
  for (const b of balls) { const h = Math.sin(Math.PI * (1 - b.t / BALL_T)) * 6; c.fillStyle = 'rgba(8,40,70,.35)'; c.beginPath(); c.arc(b.x + 2, b.y + 3, 3, 0, TAU); c.fill(); c.beginPath(); c.arc(b.x, b.y - h, 3.6, 0, TAU); c.fillStyle = '#2b2533'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(b.x - 1.5, b.y - h - 1.5, 1.4, 1.4); }
  for (const f of fx) if (!f.ring && f.plank === undefined) { c.globalAlpha = Math.max(0, f.t / f.max) * (f.smoke ? 0.6 : 0.9); c.fillStyle = f.col; c.beginPath(); c.arc(f.x, f.y, f.r * (f.smoke ? 1.6 - f.t / f.max * 0.6 : 1), 0, TAU); c.fill(); } c.globalAlpha = 1;
  drawHUD(tt);
}
function drawHUD() {
  /* marcador */
  const bw = PORT ? 94 : 112; let x = 6;
  const list = ships.slice(); const cols = PORT ? 2 : 4;
  list.forEach((s, i) => { const bx = PORT ? 6 + (i % 2) * (bw + 4) : i < 2 ? 6 + i * (bw + 5) : W - 6 - (4 - i) * (bw + 5) + 5, by = PORT ? 6 + Math.floor(i / 2) * 30 : 6; x += bw + 5;
    rr(c, bx, by, bw, 26, 8); c.fillStyle = 'rgba(12,20,40,.66)'; c.fill(); c.lineWidth = 2; c.strokeStyle = s.col; c.stroke();
    label(s.cpu ? 'CPU' : s.name, bx + 6, by + 5, 13, s.col); label(String(s.pts), bx + bw - 30, by + 3, 17, '#fff', 'right');
    for (let w = 0; w < WINS; w++) { const px = bx + bw - 20 + w * 8, py = by + 13; c.beginPath(); c.arc(px, py, 3.3, 0, TAU); c.fillStyle = w < s.wins ? '#ffd166' : 'rgba(255,255,255,.15)'; c.fill(); c.lineWidth = 1; c.strokeStyle = OUT; c.stroke(); } });
  void cols;
  /* reloj y viento */
  const cx = W - 44, cy = PORT ? 38 : H - 48, R = 26;
  c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fillStyle = 'rgba(12,20,40,.66)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
  c.save(); c.translate(cx, cy); c.rotate(wind); c.beginPath(); c.moveTo(16, 0); c.lineTo(2, -9); c.lineTo(4, -3.5); c.lineTo(-15, -3.5); c.lineTo(-15, 3.5); c.lineTo(4, 3.5); c.lineTo(2, 9); c.closePath(); c.fillStyle = '#e8fbff'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = OUT; c.stroke(); c.restore();
  label('viento', cx, cy + R + 2, 11, '#cfe8ff', 'center');
  const secs = Math.max(0, Math.ceil(roundT)); label(`${secs}`, PORT ? W / 2 : W / 2, PORT ? H - 34 : H - 32, 22, secs <= 10 ? '#ff5a5f' : '#fff', 'center');
  label(`Ronda ${roundN}`, PORT ? W / 2 : W / 2, PORT ? H - 52 : H - 50, 12, '#cfe8ff', 'center');
  if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); label(lastMsg, W / 2, H * 0.36, PORT ? 22 : 26, '#fff', 'center'); c.globalAlpha = 1; }
}
reset();
k.show(CFG.title, CFG.help);
k.run(update, draw);
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
