/* Neon Trails (mode 'trails': motos de luz contra la IA) y Territory (mode 'territory': cerrar áreas esquivando chispas).
 * Estelas y zonas se pintan de forma incremental en lienzos cacheados; motos y chispas interpoladas entre pasos. */
const M = CFG.mode, TRAILS = M === 'trails', OUT = ART.OUT, R2 = 6.2832, W = 480, TOP = 40, H = 480 + TOP;
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

const k = Kit({ w: W, h: H, title: CFG.title, bg: '#070916' }), c = k.ctx;
const N = TRAILS ? 60 : 48, S = 480 / N, D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }, ANG = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const COL = { 1: '#5ce1e6', 2: '#ff5fa2', 3: '#f2d15c', 4: '#7cf7a0' };
let g, bikes, acc, score, round, sparks, pct, count, goT = 0, between, dying, booms, freshT, respawn, t = 0;
function mk(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const q = cv.getContext('2d'); q.scale(2, 2); if (draw) draw(q); return cv; }
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lite = (h, f) => `rgb(${hex(h).map((x) => Math.round(x + (255 - x) * f))})`;
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}

/* ---------- Fondos cacheados ---------- */
const BG = mk(W, H, (q) => {
  let gr = q.createLinearGradient(0, 0, 0, TOP); gr.addColorStop(0, '#141838'); gr.addColorStop(1, '#0b0e24'); q.fillStyle = gr; q.fillRect(0, 0, W, TOP);
  gr = q.createRadialGradient(W / 2, TOP + 240, 40, W / 2, TOP + 240, 360); gr.addColorStop(0, TRAILS ? '#10163a' : '#121632'); gr.addColorStop(1, '#05060f'); q.fillStyle = gr; q.fillRect(0, TOP, W, 480);
  q.lineWidth = 1;
  for (let i = 0; i <= N; i++) { const major = i % (TRAILS ? 6 : 4) === 0; q.strokeStyle = major ? 'rgba(110,98,245,.22)' : 'rgba(110,98,245,.07)'; q.beginPath(); q.moveTo(i * S, TOP); q.lineTo(i * S, H); q.moveTo(0, TOP + i * S); q.lineTo(W, TOP + i * S); q.stroke(); }
  q.strokeStyle = 'rgba(92,225,230,.18)'; q.lineWidth = 6; q.strokeRect(3, TOP + 3, W - 6, 474); q.strokeStyle = '#5ce1e6'; q.lineWidth = 2; q.strokeRect(1, TOP + 1, W - 2, 478);
});
const glowCv = (col, r) => mk(r * 2, r * 2, (q) => { const gr = q.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, col + 'ff'); gr.addColorStop(0.25, col + '99'); gr.addColorStop(1, col + '00'); q.fillStyle = gr; q.fillRect(0, 0, r * 2, r * 2); });
const GLOW = { spark: glowCv('#ffa94d', 22), me: glowCv('#f2d15c', 18) }; Object.entries(COL).forEach(([i, col]) => (GLOW[i] = glowCv(col, 20)));
const glowOf = (b) => GLOW[b.gk] || (GLOW[b.gk] = glowCv(b.col, 20));
/* Modo tele (fiesta, 2–4 humanos): 4 motos, las que faltan las lleva la CPU; gana el partido quien gane 3 rondas. */
const WIN = 3, CPUC = ['#b98cff', '#9aa3c7', '#ff9f5a', '#e0e4ff'];
/* Salida en molinete (giro de 90° alrededor del centro): todas las motos tienen el mismo espacio y el mismo rival de frente. */
const PIN = [[8, 38, 'right'], [21, 8, 'down'], [51, 21, 'left'], [38, 51, 'up']];
let cdPend = false, rT = 0, MP = null, SLOTS = null, wins = [], lastW = null;
const inParty = (p) => !!(k.party && k.party.some((q) => q.p === p));
const trailCv = mk(480, 480), tc = trailCv.getContext('2d'), haloCv = mk(480, 480), hc = haloCv.getContext('2d');
const ownCv = mk(480, 480), oc = ownCv.getContext('2d'), freshCv = mk(480, 480), fc = freshCv.getContext('2d');
const PAT = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 16; const q = cv.getContext('2d'); q.fillStyle = '#23307e'; q.fillRect(0, 0, 16, 16); q.strokeStyle = '#2f3fa0'; q.lineWidth = 3; q.beginPath(); q.moveTo(-4, 20); q.lineTo(20, -4); q.moveTo(-4, 4); q.lineTo(4, -4); q.moveTo(12, 20); q.lineTo(20, 12); q.stroke(); return oc.createPattern(cv, 'repeat'); })();

/* Estela: brillo por celda (expansión S/2 → intensidad uniforme) y cuerpo continuo entre la celda anterior y la nueva */
function stamp(x0, y0, x1, y1, col) {
  hc.fillStyle = col; hc.globalAlpha = 0.07; hc.fillRect(x1 * S - S, y1 * S - S, S * 3, S * 3); hc.globalAlpha = 0.24; hc.fillRect(x1 * S - S / 2, y1 * S - S / 2, S * 2, S * 2); hc.globalAlpha = 1;
  const ax = Math.min(x0, x1) * S, ay = Math.min(y0, y1) * S, bx = (Math.max(x0, x1) + 1) * S, by = (Math.max(y0, y1) + 1) * S;
  tc.fillStyle = col; tc.fillRect(ax + 1, ay + 1, bx - ax - 2, by - ay - 2); tc.fillStyle = lite(col, 0.7); tc.fillRect(ax + 3, ay + 3, bx - ax - 6, by - ay - 6);
}
function paintOwn() {
  oc.clearRect(0, 0, 480, 480); oc.beginPath();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === 1) oc.rect(x * S, y * S, S, S);
  oc.fillStyle = PAT; oc.fill();
  oc.beginPath(); const own = (x, y) => x >= 0 && y >= 0 && x < N && y < N && g[y][x] === 1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === 1) {
    if (!own(x, y - 1)) { oc.moveTo(x * S, y * S); oc.lineTo(x * S + S, y * S); } if (!own(x, y + 1)) { oc.moveTo(x * S, y * S + S); oc.lineTo(x * S + S, y * S + S); }
    if (!own(x - 1, y)) { oc.moveTo(x * S, y * S); oc.lineTo(x * S, y * S + S); } if (!own(x + 1, y)) { oc.moveTo(x * S + S, y * S); oc.lineTo(x * S + S, y * S + S); }
  }
  oc.lineCap = 'square'; oc.strokeStyle = 'rgba(92,225,230,.35)'; oc.lineWidth = 5; oc.stroke(); oc.strokeStyle = '#8ff4f7'; oc.lineWidth = 2; oc.stroke();
}

/* ---------- Rondas ---------- */
/* Dificultad 0→1 por ronda (máximo en la 9): paso de las motos, visión de la IA, número y velocidad de chispas. */
const DF = () => Math.min(1, (round - 1) / 12), // 1.23: más fácil (antes máximo en la ronda 9; paso 0,11→0,05, IA 60→300, chispas 5→11)
  lerp = (a, b, q) => a + (b - a) * q;
const STEP = () => (TRAILS ? lerp(0.1375, 0.059, DF()) : 0.065) / k.D.spd; /* paso más corto = más rápido */
/* dificultad de la IA y de las chispas: la rampa se desplaza con k.D.cpu (fácil −0,2 · difícil +0,2) */
const DFA = () => k.clamp(DF() + k.D.cpu * 0.2, 0, 1);
function newRound() {
  g = Array.from({ length: N }, () => Array(N).fill(0)); acc = 0; count = MP ? 0 : 2.4; cdPend = !!MP; rT = 0; between = 0; dying = 0; booms = []; freshT = 0; respawn = 0; tc.clearRect(0, 0, 480, 480); hc.clearRect(0, 0, 480, 480);
  if (TRAILS) {
    bikes = [{ x: 10, y: 36, d: 'right', col: COL[1], id: 1, alive: true, me: true }, { x: 50, y: 24, d: 'left', col: COL[2], id: 2, alive: true }, { x: 30, y: 8, d: 'down', col: COL[3], id: 3, alive: true }, { x: 30, y: 52, d: 'up', col: COL[4], id: 4, alive: true }].slice(0, MP ? 4 : 2 + Math.min(2, round - 1));
    bikes.forEach((b) => { b.gk = b.id; });
    if (MP) bikes.forEach((b, i) => { const p = SLOTS[i]; Object.assign(b, { x: PIN[i][0], y: PIN[i][1], d: PIN[i][2], me: false });
      if (p !== null) { b.orig = p; b.col = k.pcol(p); b.gk = 'p' + b.col; if (inParty(p)) { b.pl = p; b.name = 'J' + (p + 1); } else b.name = 'CPU'; } else { b.col = CPUC[i]; b.gk = 'c' + i; b.name = 'CPU'; } });
    bikes.forEach((b) => { g[b.y][b.x] = b.id; b.px = b.x; b.py = b.y; stamp(b.x, b.y, b.x, b.y, b.col); });
  } else {
    for (let y = 21; y < 27; y++) for (let x = 21; x < 27; x++) g[y][x] = 1;
    bikes = [{ x: 23, y: 26, px: 23, py: 26, d: null, ld: null, me: true, alive: true, trail: [] }];
    sparks = Array.from({ length: Math.max(1, Math.round(Math.min(5, 1 + Math.floor(round / 3)) * k.D.rate)) }, () => newSpark()); pct = 36 / (N * N) * 100; paintOwn(); fc.clearRect(0, 0, 480, 480);
  }
}
function newSpark() { const me = bikes && bikes[0]; for (let i = 0; i < 60; i++) { const x = k.rnd(2, N - 2), y = k.rnd(2, N - 2); if (g[Math.floor(y)][Math.floor(x)]) continue; if (me && Math.hypot(x - me.x, y - me.y) < 14) continue; const v = lerp(4, 9.3, DF()) * k.D.spd; return { x, y, vx: k.pick([-1, 1]) * k.rnd(0.7, 1.2) * v, vy: k.pick([-1, 1]) * k.rnd(0.7, 1.2) * v, tail: [] }; } return { x: 2, y: 2, vx: 6, vy: 6, tail: [] }; }
function reset() { MP = TRAILS && k.party && k.party.length >= 2 ? k.party.slice(0, 4) : null;
  /* con 2 jugadores, en esquinas opuestas del molinete */
  SLOTS = MP ? (MP.length === 2 ? [MP[0].p, null, MP[1].p, null] : [0, 1, 2, 3].map((i) => (MP[i] ? MP[i].p : null))) : null;
  wins = [0, 0, 0, 0]; lastW = null; score = 0; round = 1; newRound(); }
/* Si alguien se va a mitad de partido, la CPU lleva su moto (con su color) hasta que vuelva; quien llega nuevo ocupa una moto de la CPU en la ronda siguiente. */
k.onParty = () => {
  if (k.st !== 'play' || !MP) { if (k.st !== 'play') reset(); return; }
  for (const b of bikes) if (b.orig !== undefined) { if (inParty(b.orig)) { b.pl = b.orig; b.name = 'J' + (b.orig + 1); } else { b.pl = undefined; b.nd = null; b.name = 'CPU'; } }
  for (const q of k.party || []) if (!SLOTS.includes(q.p)) { const i = SLOTS.indexOf(null); if (i >= 0) SLOTS[i] = q.p; }
};
reset(); k.show(CFG.title, CFG.help);

const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !g[y][x];
function space(x, y, lim) { const seen = new Set([x * 64 + y]), q = [[x, y]]; let h = 0; while (h < q.length && seen.size < lim) { const [a, b] = q[h++]; for (const [dx, dy] of Object.values(D)) { const nx = a + dx, ny = b + dy, key = nx * 64 + ny; if (!seen.has(key) && free(nx, ny)) { seen.add(key); q.push([nx, ny]); } } } return seen.size; }
function capture() {
  const me = bikes[0]; for (const [x, y] of me.trail) g[y][x] = 1; me.trail = [];
  const out = Array.from({ length: N }, () => Array(N).fill(false)), q = [];
  for (let i = 0; i < N; i++) for (const [x, y] of [[i, 0], [i, N - 1], [0, i], [N - 1, i]]) if (g[y][x] !== 1 && !out[y][x]) { out[y][x] = true; q.push([x, y]); }
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of Object.values(D)) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !out[ny][nx] && g[ny][nx] !== 1) { out[ny][nx] = true; q.push([nx, ny]); } } }
  let own = 0; fc.clearRect(0, 0, 480, 480); fc.fillStyle = '#fff';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!out[y][x] && g[y][x] !== 1) { g[y][x] = 1; fc.fillRect(x * S, y * S, S, S); } if (g[y][x] === 1) own++; }
  const np = own / (N * N) * 100, gain = np - pct; score += Math.max(0, Math.round(gain * 10)); pct = np; freshT = 0.5; paintOwn();
  k.sfx('coin'); if (gain >= 0.5) k.float(`+${gain.toFixed(1)} %`, me.x * S + S / 2, TOP + me.y * S - 10, '#8ff4f7');
  // chispas atrapadas dentro de la zona nueva: bonificación y reaparición más tarde
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; if (g[Math.floor(s.y)] && g[Math.floor(s.y)][Math.floor(s.x)] === 1) { sparks.splice(i, 1); score += 200; k.burst(s.x * S, TOP + s.y * S, '#ffa94d', 24, 200); k.float('¡Chispa atrapada! +200', s.x * S, TOP + s.y * S, '#ffa94d'); k.sfx('explode'); respawn = 3; } }
}
function boom(x, y, col) { booms.push({ x, y, col, t: 0 }); k.burst(x, y, col, 26, 240); k.burst(x, y, '#fff', 10, 140); k.sfx('explode'); k.shake(6); }
function lose(head, extra) { dying = 0.8; k._head = [head, extra]; }

/* ---------- Lógica ---------- */
k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt; freshT = Math.max(0, freshT - dt); for (const b of booms) b.t += dt;
  if (dying) { dying -= dt; if (dying <= 0) { dying = 0; k.lose(CFG.id, score, k._head[0], k._head[1]); } return; }
  if (between) { between -= dt; if (between <= 0) newRound(); return; }
  const me = bikes[0], want = MP ? null : k.swipe || ['up', 'down', 'left', 'right'].find((d) => k.hit.has(d));
  if (MP) bikes.forEach((b, i) => { if (b.pl === undefined || !b.alive) return; const h = k.pad(b.pl).hit; let w = ['up', 'down', 'left', 'right'].find((d) => h.has(d));
    if (!w && i === 0) w = k.swipe || ['up', 'down', 'left', 'right'].find((d) => k.hit.has(d)); /* J1 también con teclado o deslizando */
    if (w && w !== OPP[b.nd || b.d]) b.nd = w; });
  if (want) { const back = TRAILS ? OPP[me.nd || me.d] : me.trail.length ? OPP[me.nd || me.ld] : null; if (want !== back) me.nd = want; }
  goT = Math.max(0, goT - dt);
  if (cdPend) { cdPend = false; k.count(3); }
  if (k.counting()) { acc = 0; return; }
  if (count > 0) { const c0 = Math.ceil(count / 0.8); count -= dt; const c1 = Math.ceil(count / 0.8); if (c1 !== c0) k.sfx(c1 > 0 ? 'click' : 'start'); if (count > 0) return; acc = 0; goT = 0.6; }
  if (MP) rT += dt;
  const step = MP ? Math.max(0.06, 0.09 - rT * 0.001) : STEP(), /* fiesta: la ronda acelera poco a poco (0,09 → 0,06 s por casilla en 30 s) */ look = Math.round(lerp(40, 240, DFA())), noise = lerp(13, 5, DFA());
  if (!TRAILS) {
    for (const s of sparks) {
      s.tail.unshift([s.x, s.y]); if (s.tail.length > 7) s.tail.pop();
      const blk = (x, y) => x < 0 || y < 0 || x >= N || y >= N || g[Math.floor(y)][Math.floor(x)] === 1;
      const nx = s.x + s.vx * dt; if (blk(nx, s.y)) s.vx *= -1; else s.x = nx;
      const ny = s.y + s.vy * dt; if (blk(s.x, ny)) s.vy *= -1; else s.y = ny;
      const cx = Math.floor(s.x), cy = Math.floor(s.y);
      if (g[cy] && g[cy][cx] === 2) { boom(s.x * S, TOP + s.y * S, '#ff5fa2'); return lose('Te han cortado', `${Math.round(pct)} % conquistado`); }
      if (g[me.y][me.x] !== 1 && Math.abs(s.x - me.x - 0.5) < 0.85 && Math.abs(s.y - me.y - 0.5) < 0.85) { boom(me.x * S + S / 2, TOP + me.y * S + S / 2, '#f2d15c'); return lose('Te ha alcanzado una chispa', `${Math.round(pct)} % conquistado`); }
    }
    if (respawn > 0) { respawn -= dt; if (respawn <= 0) sparks.push(newSpark()); }
  }
  acc += dt;
  while (acc >= step) { acc -= step;
    if (TRAILS) {
      for (const b of bikes) { if (!b.alive) continue; b.px = b.x; b.py = b.y;
        if (b.me || b.pl !== undefined) { if (b.nd) { b.d = b.nd; b.nd = null; } }
        else { const opts = Object.keys(D).filter((d) => d !== OPP[b.d]).map((d) => { const nx = b.x + D[d][0], ny = b.y + D[d][1]; return [d, free(nx, ny) ? space(nx, ny, look) + (d === b.d ? 3 : 0) + Math.random() * noise : -1]; }); opts.sort((a, z) => z[1] - a[1]); b.d = opts[0][0]; }
        b.nx = b.x + D[b.d][0]; b.ny = b.y + D[b.d][1]; }
      for (const b of bikes) if (b.alive) { if (!free(b.nx, b.ny) || bikes.some((o) => o !== b && o.alive && o.nx === b.nx && o.ny === b.ny)) b.alive = false; }
      for (const b of bikes) if (b.alive) { b.x = b.nx; b.y = b.ny; g[b.y][b.x] = b.id; stamp(b.px, b.py, b.x, b.y, b.col); }
      for (const b of bikes) if (!b.alive && !b.boom) { b.boom = true; b.px = b.x; b.py = b.y; boom(b.x * S + S / 2, TOP + b.y * S + S / 2, b.col); if (!b.me && !MP) { score += 50; k.float('+50', b.x * S, TOP + b.y * S - 12, b.col); } }
      if (MP) { const al = bikes.filter((b) => b.alive), hum = al.filter((b) => b.pl !== undefined), vsH = bikes.filter((b) => b.pl !== undefined).length >= 2;
        /* con 2+ personas las motos de la CPU son obstáculo: gana la ronda el último humano en pie (antes la CPU podía llevarse la partida entre amigos) */
        if (vsH ? hum.length <= 1 : (al.length <= 1 || (!hum.length && bikes.some((b) => b.pl !== undefined)))) { const wb = vsH ? hum[0] || null : al.length === 1 ? al[0] : null; lastW = wb; if (wb) { wins[bikes.indexOf(wb)]++; k.sfx('win'); k.float('+1', wb.x * S, TOP + wb.y * S - 14, wb.col); }
          const champ = bikes.findIndex((b, i) => wins[i] >= WIN);
          if (champ >= 0) { const cb = bikes[champ]; between = 0; dying = 0;
            k.win(cb.name === 'CPU' ? 'Gana la CPU' : `¡Gana ${cb.name}!`, cb.col, bikes.map((b, i) => `<b style="color:${b.col}">${b.name} ${wins[i]}</b>`).join(' · ') + '<br>Toca para la revancha', wins[champ]); return; }
          round++; between = 1.6; return; }
        continue; }
      if (!bikes[0].alive) return lose('Choque', `Ronda ${round}`);
      if (bikes.filter((b) => b.alive).length === 1) { score += 100 * round; k.sfx('win'); k.float(`+${100 * round}`, me.x * S, TOP + me.y * S - 14, '#7cf7a0'); round++; between = 1.4; return; }
      score += 1;
    } else {
      me.px = me.x; me.py = me.y;
      if (me.nd) { me.d = me.nd; me.nd = null; } if (!me.d) continue;
      const nx = me.x + D[me.d][0], ny = me.y + D[me.d][1]; if (nx < 0 || ny < 0 || nx >= N || ny >= N) { me.d = null; continue; }
      if (g[ny][nx] === 2) { boom(nx * S + S / 2, TOP + ny * S + S / 2, '#ff5fa2'); return lose('Te cruzaste', `${Math.round(pct)} % conquistado`); }
      me.x = nx; me.y = ny; me.ld = me.d;
      if (g[ny][nx] === 1) { if (me.trail.length) capture(); } else { g[ny][nx] = 2; me.trail.push([nx, ny]); }
      if (pct >= 75) { score += 500 * round; k.sfx('win'); k.confetti(); round++; between = 1.6; return; }
    }
  }
}, draw);

/* ---------- Dibujo ---------- */
const BK_BODY = (g) => { ART.rr(g, -11, -4.5, 17, 9, 4); };
const BK_NOSE = (g) => { g.moveTo(10.2, 0); g.arc(7, 0, 3.2, 0, R2); };
const EXHAUST = (g) => { ART.rr(g, -13, -1.8, 4, 3.6, 1.4); };
function bike(b, fr) {
  const x = (b.px + (b.x - b.px) * fr) * S + S / 2, y = TOP + (b.py + (b.y - b.py) * fr) * S + S / 2, a = ANG[b.d] || 0;
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.8; c.drawImage(glowOf(b), x - 20, y - 20, 40, 40); c.restore();
  c.save(); c.translate(x, y); c.rotate(a); c.scale(1.25, 1.25); c.lineJoin = 'round';
  /* moto de una pieza: carenado + morro + escape se trazan juntos y se rellenan después */
  unite(c, [[EXHAUST, '#2a2d4a'], [BK_BODY, b.col], [BK_NOSE, '#fff']], 1.05 / 1.25);
  clipIn(c, BK_BODY, (g) => {
    g.fillStyle = '#1b2040'; g.beginPath(); g.moveTo(-3, -3); g.lineTo(5, -2); g.quadraticCurveTo(9, 0, 5, 2); g.lineTo(-3, 3); g.closePath(); g.fill();
    g.fillStyle = AL('#ffffff', 0.55); g.fillRect(-9, -3.2, 6, 1.6);
    g.fillStyle = AL(OUT, 0.2); g.fillRect(-11, 2.6, 17, 2.4);
  });
  c.restore();
  if (MP) label(b.name, k.clamp(x, 22, W - 22), y < TOP + 40 ? y + 34 : y - 34, 17, b.pl !== undefined ? b.col : '#c9cbe0', 'center');
}
function hudTop() {
  if (MP) { label(`R${round}`, W - 8, 9, 18, '#b8b6e0', 'right');
    bikes.forEach((b, i) => { const x = 6 + i * 102; ART.rr(c, x, 4, 96, 32, 9); c.fillStyle = b.alive ? 'rgba(26,21,48,.9)' : 'rgba(26,21,48,.45)'; c.fill(); c.lineWidth = 3; c.strokeStyle = b.alive ? b.col : '#3a3d5c'; c.stroke();
      label(b.name, x + 8, 9, 18, b.alive ? b.col : '#55587a');
      for (let j = 0; j < WIN; j++) { c.beginPath(); c.arc(x + 62 + j * 11, 20, 4.5, 0, R2); c.fillStyle = j < wins[i] ? '#ffd166' : 'rgba(255,255,255,.15)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); } });
    return; }
  label(`${score}`, 12, 8, 22, '#fff');
  if (TRAILS) { label(`Ronda ${round}`, W - 12, 5, 15, '#b8b6e0', 'right');
    bikes.forEach((b, i) => { const x = W - 20 - (bikes.length - 1 - i) * 20, y = 30; c.beginPath(); c.arc(x, y, 6, 0, R2); ART.fillOut(c, b.alive ? b.col : '#2a2d4a', 2); if (!b.alive) { c.strokeStyle = '#ff5f7a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 4, y - 4); c.lineTo(x + 4, y + 4); c.moveTo(x + 4, y - 4); c.lineTo(x - 4, y + 4); c.stroke(); } if (b.me) { c.fillStyle = OUT; c.beginPath(); c.arc(x, y, 2, 0, R2); c.fill(); } }); }
  else { const bw = 150, bx = W - bw - 12, by = 24, fr = Math.min(1, pct / 100);
    label(`${pct.toFixed(1)} %`, W - 12, 3, 15, pct >= 60 ? '#7cf7a0' : '#b8b6e0', 'right'); label(`Nivel ${round}`, bx, 5, 12, '#8a88b8');
    ART.rr(c, bx, by, bw, 10, 5); ART.fillOut(c, '#0a0c20', 2); if (fr > 0) { ART.rr(c, bx + 2, by + 2, Math.max(6, (bw - 4) * fr), 6, 3); c.fillStyle = '#5ce1e6'; c.fill(); }
    const mx = bx + 2 + (bw - 4) * 0.75; c.fillStyle = '#f2d15c'; c.beginPath(); c.moveTo(mx, by - 1); c.lineTo(mx - 4, by - 6); c.lineTo(mx + 4, by - 6); c.closePath(); c.fill(); c.fillRect(mx - 1, by, 2, 10); }
}
function draw() {
  c.drawImage(BG, 0, 0, W, H);
  const fr = count > 0 || between || dying || k.counting() ? 1 : Math.min(1, acc / (MP ? Math.max(0.06, 0.09 - rT * 0.001) : STEP()));
  if (TRAILS) {
    c.drawImage(haloCv, 0, TOP, 480, 480); c.drawImage(trailCv, 0, TOP, 480, 480);
    for (const b of bikes) if (b.alive) bike(b, fr);
  } else {
    c.drawImage(ownCv, 0, TOP, 480, 480);
    if (freshT > 0) { c.globalAlpha = freshT / 0.5 * 0.8; c.drawImage(freshCv, 0, TOP, 480, 480); c.globalAlpha = 1; }
    const me = bikes[0], pulse = 0.75 + Math.sin(t * 12) * 0.25;
    if (me.trail.length) { c.fillStyle = 'rgba(255,95,162,.25)'; for (const [x, y] of me.trail) c.fillRect(x * S - 3, TOP + y * S - 3, S + 6, S + 6);
      c.fillStyle = '#ff5fa2'; for (const [x, y] of me.trail) c.fillRect(x * S, TOP + y * S, S, S);
      c.globalAlpha = pulse; c.fillStyle = '#ffd0e6'; for (const [x, y] of me.trail) c.fillRect(x * S + 3, TOP + y * S + 3, S - 6, S - 6); c.globalAlpha = 1; }
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const s of sparks) { s.tail.forEach(([x, y], i) => { c.globalAlpha = 0.35 * (1 - i / 7); c.drawImage(GLOW.spark, x * S - 10, TOP + y * S - 10, 20, 20); }); c.globalAlpha = 1; c.drawImage(GLOW.spark, s.x * S - 22, TOP + s.y * S - 22, 44, 44); }
    c.restore();
    for (const s of sparks) { const x = s.x * S, y = TOP + s.y * S; c.save(); c.translate(x, y); c.rotate(t * 8); c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 3 : 8.5; c.lineTo(Math.cos(i * Math.PI / 4) * r, Math.sin(i * Math.PI / 4) * r); } c.closePath(); ART.fillOut(c, '#fff3c4', 1.5); c.restore(); }
    if (!dying) { const x = (me.px + (me.x - me.px) * fr) * S + S / 2, y = TOP + (me.py + (me.y - me.py) * fr) * S + S / 2;
      c.save(); c.globalCompositeOperation = 'lighter'; c.drawImage(GLOW.me, x - 18, y - 18, 36, 36); c.restore();
      c.save(); c.translate(x, y); c.rotate(Math.PI / 4 + (me.d ? t * 6 : 0)); ART.rr(c, -6, -6, 12, 12, 3); ART.fillOut(c, '#f2d15c', 2); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-4, -4, 4, 4); c.restore(); }
  }
  for (const b of booms) if (b.t < 0.6) { const q = b.t / 0.6; c.globalAlpha = 1 - q; c.strokeStyle = b.col; c.lineWidth = 6 * (1 - q) + 1; c.beginPath(); c.arc(b.x, b.y, 8 + q * 46, 0, R2); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(b.x, b.y, 4 + q * 30, 0, R2); c.stroke(); c.globalAlpha = 1; }
  hudTop();
  if (count > 0 && k.st === 'play') { const n = Math.ceil(count / 0.8), p = 1 - (count % 0.8) / 0.8, s = 1 + (1 - Math.min(1, p * 3)) * 0.6; c.save(); c.translate(W / 2, TOP + 200); c.scale(s, s); c.globalAlpha = Math.min(1, (1 - p) * 3 + 0.2); label(`${n}`, 0, -30, 60, '#fff', 'center'); c.restore();
    if (TRAILS) label('Desliza o usa las flechas para girar', W / 2, TOP + 290, 14, '#b8b6e0', 'center'); else label('Sal de tu zona y vuelve para conquistar', W / 2, TOP + 290, 14, '#b8b6e0', 'center'); }
  if (goT > 0) { c.globalAlpha = goT / 0.6; label('¡Ya!', W / 2, TOP + 170 - (0.6 - goT) * 40, 56, '#7cf7a0', 'center'); c.globalAlpha = 1; }
  if (between && MP) label(lastW ? `¡Ronda para ${lastW.name}!` : 'Ronda nula', W / 2, TOP + 200, 36, lastW ? lastW.col : '#b8b6e0', 'center');
  else if (between) label(TRAILS ? '¡Ronda superada!' : '¡Zona conquistada!', W / 2, TOP + 200, 30, '#7cf7a0', 'center');
}
