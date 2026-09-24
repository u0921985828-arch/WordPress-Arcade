/* Laberintos con arte propio (ART). CFG.mode: 'muncher' | 'digger' | 'iso' | 'dungeon'
 * muncher: laberinto simétrico sin callejones, casa de fantasmas con salida escalonada, dispersión/persecución, fruta.
 * digger: tierra por estratos, gemas, rocas que caen y aplastan bichos; los bichos cruzan la tierra como fantasmas.
 * iso/dungeon: laberinto isométrico por casillas con 3 llaves y salida; dungeon con monstruos, espada y corazones. */
const M = CFG.mode, ISO = M === 'iso' || M === 'dungeon', OUT = ART.OUT, R2 = 6.2832;
const W = 480, H = 520, TOP = 40;
const k = Kit({ w: W, h: H, title: CFG.title, bg: CFG.bg || '#0d0f24' }), c = k.ctx;
const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }, DIRS = ['up', 'left', 'down', 'right'];
let invT = 0, g, N, S, BX, BY, pl, foes, items, drops, rocks, score, lives, level, fright, exitC, need, swordT, t = 0, ready, dying, clearT, freeze, msg, msgT, lvT;
let boardCv, flashCv, dirtCv, floorCv, blockCv, bgCv, vigCv, dirty, fruit, eaten, left, chain, home, homeMap, cam, torches, dragged, dmapF, dmapC, best;

/* ---------- Utilidades ---------- */
function mkCv(w, h, draw) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * 2); cv.height = Math.ceil(h * 2); const b = cv.getContext('2d'); b.scale(2, 2); draw(b); return cv; }
function shade(hex, a) { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(a > 0 ? v + (255 - v) * a : v * (1 + a)))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function banner(s, y, col) { c.font = '800 22px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(s).width + 36; ART.rr(c, W / 2 - mw / 2, y - 9, mw, 40, 12); c.fillStyle = 'rgba(26,21,48,.82)'; c.fill(); label(s, W / 2, y, 22, col || '#ffc928', 'center'); }
function carve(n, loops) {
  const m = Array.from({ length: n }, () => Array(n).fill(1)), st = [[1, 1]]; m[1][1] = 0;
  while (st.length) { const [x, y] = st[st.length - 1]; const nb = k.shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]]).filter(([dx, dy]) => m[y + dy] && m[y + dy][x + dx] === 1 && x + dx > 0 && y + dy > 0 && x + dx < n - 1 && y + dy < n - 1);
    if (!nb.length) { st.pop(); continue; } const [dx, dy] = nb[0]; m[y + dy / 2][x + dx / 2] = 0; m[y + dy][x + dx] = 0; st.push([x + dx, y + dy]); }
  for (let i = 0; i < loops; i++) { const x = k.ri(1, n - 2), y = k.ri(1, n - 2); if (m[y][x] === 1 && ((m[y - 1][x] === 0 && m[y + 1][x] === 0) || (m[y][x - 1] === 0 && m[y][x + 1] === 0))) m[y][x] = 0; }
  return m;
}
const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const walk = (x, y) => inside(x, y) && g[y][x] === 0;
function distMap(tx, ty, pass) {
  const q = [[tx, ty]], seen = { [tx + ',' + ty]: 0 };
  for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const d of DIRS) { const nx = x + D[d][0], ny = y + D[d][1], key = nx + ',' + ny; if (seen[key] === undefined && pass(nx, ny)) { seen[key] = seen[x + ',' + y] + 1; q.push([nx, ny]); } } }
  return seen;
}
/* Mapa de distancias al jugador, uno por fotograma como mucho */
function plMap(pass) { if (dmapF !== t) { dmapF = t; dmapC = distMap(pl.x, pl.y, pass); } return dmapC; }

/* ---------- Entidades por casillas con interpolación ---------- */
function ent(x, y, sp) { return { x, y, px: x, py: y, fx: x, fy: y, t: 0, dir: null, next: null, sp, face: 1, sx: x, sy: y }; }
function faceOf(d) { return ISO ? (D[d][0] - D[d][1] > 0 ? 1 : -1) : D[d][0]; }
function go(e, d) { e.dir = d; e.px = e.x; e.py = e.y; e.x += D[d][0]; e.y += D[d][1]; e.face = faceOf(d) || e.face; }
function reverse(e) { if (!e.dir) return; [e.x, e.px] = [e.px, e.x]; [e.y, e.py] = [e.py, e.y]; e.t = 1 - e.t; e.dir = OPP[e.dir]; e.face = faceOf(e.dir) || e.face; }
/* Avanza; al llegar a una casilla pide dirección a pick(e). Devuelve true al llegar (casilla = px,py) */
function stepEnt(e, dt, pick) {
  let arr = false;
  if (e.dir) { e.t += dt * e.sp; if (e.t >= 1) { const over = e.t - 1; arr = true; e.px = e.x; e.py = e.y; const d = pick(e); if (d) { go(e, d); e.t = Math.min(over, 0.9); } else { e.dir = null; e.t = 0; } } }
  else { const d = pick(e); if (d) { go(e, d); e.t = 0; } }
  e.fx = e.px + (e.x - e.px) * e.t; e.fy = e.py + (e.y - e.py) * e.t; return arr;
}
function respawnEnt(e) { e.x = e.px = e.fx = e.sx; e.y = e.py = e.fy = e.sy; e.t = 0; e.dir = e.next = null; }

/* ---------- Entrada: teclas, deslizar o arrastrar (en isométrico, la diagonal de pantalla) ---------- */
function stickDir() {
  const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy, m = Math.hypot(dx, dy); if (m < 14) return null;
  dragged = true; if (m > 34) { k.ptr.sx = k.ptr.x - dx / m * 18; k.ptr.sy = k.ptr.y - dy / m * 18; }
  if (ISO) return dx > 0 ? (dy < 0 ? 'up' : 'right') : (dy > 0 ? 'down' : 'left');
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}
const heldDir = () => DIRS.find((d) => k.held.has(d)) || (k.ptr.down ? stickDir() : null);
const tapped = () => k.tap && !dragged;

/* ---------- Construcción de niveles ---------- */
function build() {
  items = []; foes = []; drops = []; rocks = []; fright = 0; chain = 0; freeze = 0; dying = 0; clearT = 0; lvT = 0; boardCv = flashCv = floorCv = null; dirty = true; fruit = null; eaten = 0;
  if (M === 'muncher') buildMuncher(); else if (M === 'digger') buildDigger(); else buildIso();
  left = items.length;
}
function reset() { score = 0; lives = 3; level = 1; swordT = 0; invT = 0; best = k.best(CFG.id, 0); build(); }

/* ================= COME-COCOS ================= */
const GCOL = ['#ff4d5e', '#ff9ad5', '#4fd8e8', '#ffa94d'];
function genMuncher() {
  const m = carve(N, 0), h = (N - 1) / 2, sym = (x, y) => { m[y][x] = 0; m[y][N - 1 - x] = 0; };
  for (let y = 0; y < N; y++) for (let x = 0; x < h; x++) m[y][N - 1 - x] = m[y][x];
  for (let y = h - 1; y <= h + 1; y++) for (let x = h - 2; x <= h + 2; x++) m[y][x] = 0; // casa
  // Conectividad garantizada: abre paredes entre zonas no alcanzadas (simétricamente)
  for (let guard = 0; guard < 400; guard++) {
    const seen = Array.from({ length: N }, () => Array(N).fill(false)), q = [[h, N - 2]]; seen[N - 2][h] = true;
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const d of DIRS) { const nx = x + D[d][0], ny = y + D[d][1]; if (!m[ny][nx] && !seen[ny][nx]) { seen[ny][nx] = true; q.push([nx, ny]); } } }
    let fixed = false;
    for (let y = 1; y < N - 1 && !fixed; y++) for (let x = 1; x < N - 1 && !fixed; x++) {
      if (m[y][x] !== 1 || (x % 2) + (y % 2) !== 1) continue;
      const [a, b] = x % 2 ? [[x, y - 1], [x, y + 1]] : [[x - 1, y], [x + 1, y]];
      if (!m[a[1]][a[0]] && !m[b[1]][b[0]] && seen[a[1]][a[0]] !== seen[b[1]][b[0]]) { sym(x, y); fixed = true; }
    }
    if (!fixed) break;
  }
  // Sin callejones: cada casilla con una sola salida abre otra pared
  for (let y = 1; y < N - 1; y += 2) for (let x = 1; x <= h; x += 2) {
    const o = k.shuffle(DIRS.filter((d) => { const cx = x + D[d][0] * 2, cy = y + D[d][1] * 2; return m[y + D[d][1]][x + D[d][0]] === 1 && cx > 0 && cy > 0 && cx < N - 1 && cy < N - 1; }));
    for (const d of o) { if (DIRS.filter((q) => !m[y + D[q][1]][x + D[q][0]]).length > 1) break; sym(x + D[d][0], y + D[d][1]); }
  }
  return m;
}
function buildMuncher() {
  N = 19; S = 25; BX = (W - N * S) / 2; BY = TOP + 2; g = genMuncher(); const h = (N - 1) / 2;
  home = [h, h]; homeMap = distMap(h, h, walk);
  const house = (x, y) => y >= h - 1 && y <= h + 1 && x >= h - 2 && x <= h + 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!g[y][x] && !house(x, y) && !(x === h && y === N - 2)) items.push({ x, y, t: 'dot' });
  [[1, 3], [N - 2, 3], [1, N - 4], [N - 2, N - 4]].forEach(([x, y]) => { const it = items.find((q) => q.x === x && q.y === y); if (it) it.t = 'power'; });
  pl = ent(h, N - 2, 7.2); pl.dir = null;
  foes = [[h, h - 1], [h, h], [h - 1, h], [h + 1, h]].map(([x, y], i) => { const f = ent(x, y, 4.6); f.id = i; return f; });
  homeReset(); ready = 1.6;
}
function homeReset() { const rel = [0, 1.2, 4, 7].map((v) => v * Math.max(0.35, 1 - (level - 1) * 0.15)); foes.forEach((f, i) => { respawnEnt(f); f.mode = 'house'; f.rel = rel[i]; f.scared = false; }); }
function ghostTarget(f) {
  const corners = [[N - 2, -2], [1, -2], [N - 2, N + 1], [1, N + 1]], d = D[pl.dir || 'left'];
  if ((lvT < 6 || (lvT > 26 && lvT < 32)) && f.id < 3) return corners[f.id];
  if (f.id === 0) return [pl.x, pl.y];
  if (f.id === 1) return [pl.x + d[0] * 4, pl.y + d[1] * 4];
  if (f.id === 2) { const r = foes[0]; return [2 * (pl.x + d[0] * 2) - r.x, 2 * (pl.y + d[1] * 2) - r.y]; }
  return Math.hypot(f.x - pl.x, f.y - pl.y) > 7 ? [pl.x, pl.y] : corners[3];
}
function ghostPick(f) {
  if (f.mode === 'eyes') {
    if (f.x === home[0] && f.y === home[1]) { f.mode = 'house'; f.rel = 0.8; f.scared = false; return null; }
    let bd = null, bv = Infinity; for (const d of DIRS) { const v = homeMap[(f.x + D[d][0]) + ',' + (f.y + D[d][1])]; if (v !== undefined && v < bv) { bv = v; bd = d; } } return bd;
  }
  let opts = DIRS.filter((d) => walk(f.x + D[d][0], f.y + D[d][1]) && d !== OPP[f.dir]);
  if (!opts.length) opts = DIRS.filter((d) => walk(f.x + D[d][0], f.y + D[d][1]));
  if (f.scared) return k.pick(opts);
  const [tx, ty] = ghostTarget(f); let bd = null, bv = Infinity;
  for (const d of opts) { const v = Math.hypot(f.x + D[d][0] - tx, f.y + D[d][1] - ty) + Math.random() * Math.max(0.4, 1.5 - (level - 1) * 0.2); if (v < bv) { bv = v; bd = d; } }
  return bd;
}
const cellX = (x) => BX + (x + 0.5) * S, cellY = (y) => BY + (y + 0.5) * S;
function eatAt(x, y) {
  const it = items.find((q) => !q.got && q.x === x && q.y === y);
  if (it) {
    it.got = true; left--;
    if (it.t === 'dot') { score += 10; eaten++; if (eaten % 2) k.sfx('pop'); if (eaten === 70 || eaten === 150) fruit = { x: home[0], y: home[1] + 2, t: 9 }; }
    else {
      score += 50; fright = Math.max(1.8, 7 - (level - 1) * 0.8); chain = 0; k.sfx('coin'); k.burst(cellX(x), cellY(y), '#fff3d6', 14, 140);
      for (const f of foes) if (f.mode !== 'eyes') { if (f.mode === 'go' && !f.scared) reverse(f); f.scared = true; }
    }
    if (left <= 0) { clearT = 1.8; score += 300 * level; k.sfx('win'); k.confetti(); msg = '¡Nivel superado!'; msgT = 1.8; }
  }
  if (fruit && fruit.x === x && fruit.y === y) { const v = [100, 300, 500, 700, 1000][Math.min(4, level - 1)]; score += v; k.float(`+${v}`, cellX(x), cellY(y) - 10, '#ff7a8a'); k.sfx('coin'); k.burst(cellX(x), cellY(y), '#ff4d5e', 12); fruit = null; }
}
function die() { dying = 1.5; fright = 0; foes.forEach((f) => { f.scared = false; }); k.sfx('hurt'); k.shake(6); }
function updMuncher(dt) {
  const want = k.swipe || DIRS.find((d) => k.hit.has(d)) || heldDir();
  if (want) { if (pl.dir && want === OPP[pl.dir]) reverse(pl); pl.next = want; }
  invT -= dt; lvT += dt; if (fruit && (fruit.t -= dt) <= 0) fruit = null;
  if (stepEnt(pl, dt, (e) => { for (const d of [e.next, e.dir]) if (d && walk(e.x + D[d][0], e.y + D[d][1])) return d; return null; })) eatAt(pl.px, pl.py);
  if (clearT > 0) return;
  if (fright > 0 && (fright -= dt) <= 0) foes.forEach((f) => { f.scared = false; });
  const base = Math.min(6.8, 4.1 + level * 0.3);
  for (const f of foes) {
    if (f.mode === 'house') { f.fx = f.x; f.fy = f.y + Math.sin(t * 7 + f.id) * 0.18; if ((f.rel -= dt) <= 0) f.mode = 'go'; }
    else { f.sp = f.mode === 'eyes' ? 12 : base * (f.scared ? 0.55 : 1); stepEnt(f, dt, ghostPick); }
    if (f.mode === 'eyes' || Math.hypot(f.fx - pl.fx, f.fy - pl.fy) > 0.6) continue;
    if (f.scared) {
      chain++; const v = 200 * 2 ** Math.min(3, chain - 1); score += v; f.mode = 'eyes'; f.scared = false; freeze = 0.45;
      k.float(`+${v}`, cellX(f.fx), cellY(f.fy) - 8, '#8fd3ff'); k.burst(cellX(f.fx), cellY(f.fy), '#3d5afe', 16); k.sfx('coin');
    } else if (invT <= 0) return die();
  }
}

/* ================= EXCAVADOR ================= */
const GEMC = ['#4fe3ff', '#ff5fa2', '#7cf78a', '#ffc53d'];
function buildDigger() {
  N = 15; S = 32; BX = 0; BY = TOP; g = Array.from({ length: N }, () => Array(N).fill(2));
  for (let x = 0; x < N; x++) g[0][x] = 0; for (let y = 1; y < 4; y++) g[y][7] = 0;
  const nf = Math.min(6, 1 + level), sp = Math.min(4.4, 2.2 + level * 0.25);
  for (let i = 0; i < nf; i++) { const x = k.ri(2, N - 3), y = k.ri(5, N - 2); for (let j = -2; j <= 2; j++) g[y][x + j] = 0; const f = ent(x, y, sp); f.id = i; f.base = sp; f.gh = false; f.ghost = 0; f.gcd = k.rnd(5, 9) + Math.max(0, 4 - level * 2); foes.push(f); }
  const cells = []; for (let y = 3; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === 2) cells.push([x, y]);
  k.shuffle(cells); for (let i = 0; i < 12 + level * 2 && cells.length; i++) { const [x, y] = cells.pop(); items.push({ x, y, t: 'gem', c: i % 4 }); }
  const nr = Math.min(8, 3 + level); for (const [x, y] of cells) { if (rocks.length >= nr) break;
    if (y < 2 || y > N - 3 || x === 7 || g[y + 1][x] !== 2 || rocks.some((r) => Math.abs(r.x - x) + Math.abs(r.y - y) < 3)) continue; rocks.push({ x, y, fy: y, st: 'rest', w: 0, v: 0, kills: 0 }); g[y][x] = 3; }
  pl = ent(7, 0, 6.6); ready = 1.6; if (!dirtCv) dirtCv = renderDirt();
}
const fallAt = (x, y) => rocks.some((r) => r.st === 'fall' && r.x === x && y >= Math.floor(r.fy) && y <= Math.floor(r.fy) + 1);
const dpass = (x, y) => inside(x, y) && g[y][x] !== 3 && !fallAt(x, y);
const tun = (x, y) => inside(x, y) && g[y][x] === 0 && !fallAt(x, y);
const gemAt = (x, y) => items.some((q) => !q.got && q.x === x && q.y === y);
function pickDig(e) {
  if (e.halt) { e.halt = false; e.next = null; return null; }
  for (const d of [e.next, e.dir]) {
    if (!d) continue; const nx = e.x + D[d][0], ny = e.y + D[d][1]; if (!dpass(nx, ny)) continue;
    if (g[ny][nx] === 2) { g[ny][nx] = 0; dirty = true; score += 1; e.sp = 4.6; k.burst(BX + (nx + 0.5) * S, BY + (ny + 0.5) * S, k.pick(['#8a5a33', '#b07a45', '#6e4527']), 4, 70); } else e.sp = 6.6;
    return d;
  }
  return null;
}
function pickBug(f) {
  if (f.gh && f.ghost <= 0 && tun(f.x, f.y)) f.gh = false;
  const ok = f.gh ? (x, y) => inside(x, y) && g[y][x] !== 3 : tun;
  let opts = DIRS.filter((d) => ok(f.x + D[d][0], f.y + D[d][1]));
  if (f.gh) { let bd = null, bv = Infinity; for (const d of opts) { const v = Math.abs(f.x + D[d][0] - pl.x) + Math.abs(f.y + D[d][1] - pl.y) + Math.random() * 0.6; if (v < bv) { bv = v; bd = d; } } return bd; }
  const m = plMap(tun), here = m[f.x + ',' + f.y];
  if ((here === undefined || Math.random() < 0.3) && f.gcd <= 0) { f.gh = true; f.ghost = 2.5 + Math.random(); f.gcd = Math.max(4, k.rnd(7, 11) - level * 0.5); }
  if (here !== undefined && Math.random() > 0.12) { let bd = null, bv = Infinity; for (const d of opts) { const v = m[(f.x + D[d][0]) + ',' + (f.y + D[d][1])]; if (v !== undefined && v < bv) { bv = v; bd = d; } } if (bd) return bd; }
  const nr = opts.filter((d) => d !== OPP[f.dir]); return nr.length ? k.pick(nr) : opts[0] || null;
}
function updDigger(dt) {
  const want = k.swipe || DIRS.find((d) => k.hit.has(d)) || heldDir();
  if (want) { if (pl.dir && want === OPP[pl.dir]) reverse(pl); pl.next = want; pl.halt = false; } else if (tapped()) pl.halt = true;
  invT -= dt;
  if (stepEnt(pl, dt, pickDig)) {
    const it = items.find((q) => !q.got && q.x === pl.px && q.y === pl.py);
    if (it) { it.got = true; left--; score += 100; k.sfx('coin'); k.burst(cellX(it.x), cellY(it.y), GEMC[it.c], 14, 150); k.float('+100', cellX(it.x), cellY(it.y) - 12, GEMC[it.c]);
      if (left <= 0) { clearT = 1.8; score += 300 * level; k.sfx('win'); k.confetti(); msg = '¡Todas las gemas!'; msgT = 1.8; return; } }
  }
  for (const r of rocks) {
    if (r.st === 'rest') { const by = r.y + 1, under = by < N && g[by][r.x] === 0 && !gemAt(r.x, by); const plU = (pl.x === r.x && pl.y === by) || (pl.px === r.x && pl.py === by);
      if (under && !plU) { r.st = 'wob'; r.w = 0.55; } }
    else if (r.st === 'wob') { if ((r.w -= dt) <= 0) { r.st = 'fall'; g[r.y][r.x] = 0; r.fy = r.y; r.v = 2; dirty = true; } }
    else {
      r.v = Math.min(11, r.v + 30 * dt); r.fy += r.v * dt;
      for (const f of foes) if (!f.dead && Math.abs(f.fx - r.x) < 0.7 && f.fy - r.fy > 0.1 && f.fy - r.fy < 0.8) { f.dead = true; r.kills++; const v = 250 * r.kills; score += v; k.burst(cellX(f.fx), cellY(f.fy), '#ff6b6b', 18); k.float(`+${v}`, cellX(f.fx), cellY(f.fy) - 10, '#ffc928'); k.sfx('hit'); }
      if (invT <= 0 && Math.abs(pl.fx - r.x) < 0.7 && pl.fy - r.fy > 0.1 && pl.fy - r.fy < 0.8) { r.fy = Math.floor(r.fy); r.dead = true; k.burst(cellX(r.x), cellY(r.fy), '#9a97a8', 20); return die(); }
      const n = Math.floor(r.fy), ny = n + 1;
      if (ny >= N || g[ny][r.x] !== 0 || gemAt(r.x, ny)) { r.fy = n; r.dead = true; k.burst(cellX(r.x), cellY(n) + 8, '#9a97a8', 22, 170); k.burst(cellX(r.x), cellY(n) + 8, '#6e4527', 10, 120); k.sfx('explode'); k.shake(4); }
    }
  }
  rocks = rocks.filter((r) => !r.dead); foes = foes.filter((f) => !f.dead);
  for (const f of foes) {
    f.gcd -= dt; if (f.gh) f.ghost -= dt; f.sp = f.base * (f.gh ? 0.6 : 1);
    stepEnt(f, dt, pickBug);
    if (!f.gh && invT <= 0 && Math.hypot(f.fx - pl.fx, f.fy - pl.fy) < 0.62) return die();
  }
}

/* ================= ISOMÉTRICO ================= */
const TW = 50, TH = 25, WH = 15, PAL = CFG.iso || ['#2b2f55', '#7b6cf6', '#4b3fb0', '#3a2f8c'], DG = M === 'dungeon';
const PX = (x, y) => (x - y) * TW / 2, PY = (x, y) => (x + y) * TH / 2;
function buildIso() {
  N = 11 + Math.min(8, level * 2); if (N % 2 === 0) N++;
  g = carve(N, 4 + level); pl = ent(1, 1, 5.2); exitC = [N - 2, N - 2]; need = 3;
  const cells = []; for (let y = 1; y < N; y++) for (let x = 1; x < N; x++) if (!g[y][x] && x + y > Math.max(4, N * 0.6) && !(x === exitC[0] && y === exitC[1])) cells.push([x, y]);
  k.shuffle(cells); for (let i = 0; i < need; i++) { const [x, y] = cells.pop(); items.push({ x, y, t: 'key' }); }
  if (DG) { const kinds = level >= 3 ? ['slime', 'ghost', 'knight'] : level >= 2 ? ['slime', 'ghost'] : ['slime'];
    const dm = distMap(1, 1, walk), far = cells.filter(([x, y]) => (dm[x + ',' + y] || 0) >= 10), pool = far.length >= 3 ? far : cells; // lejos de la entrada
    for (let i = 0; i < Math.min(11, 2 + level) && pool.length; i++) { const [x, y] = pool.pop(); if (pool !== cells) cells.splice(cells.findIndex((q) => q[0] === x && q[1] === y), 1); const f = ent(x, y, Math.min(4, 2 + level * 0.25)); f.id = i; f.kind = kinds[i % kinds.length]; f.hp = f.max = f.kind === 'knight' ? 3 : 2; f.stun = 1.5; f.fl = 0; foes.push(f); } }
  else for (let i = 0; i < 5 && cells.length; i++) { const [x, y] = cells.pop(); drops.push({ x, y, t: 'coin' }); }
  torches = []; if (DG) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === 1 && rnd(x * 31 + y * 7 + level) < 0.07) { if (walk(x, y + 1)) torches.push([x, y, -1]); else if (walk(x + 1, y)) torches.push([x, y, 1]); }
  cam = { x: PX(1, 1), y: PY(1, 1) }; ready = 0; msg = `Nivel ${level}`; msgT = 1.6;
  if (!blockCv) blockCv = renderBlock(); if (!bgCv) bgCv = renderIsoBg(); if (!vigCv) vigCv = renderVig();
}
function pickIso(e) { const d = e.next || heldDir(); e.next = null; if (d) e.face = faceOf(d); return d && walk(e.x + D[d][0], e.y + D[d][1]) ? d : null; }
function pickMon(f) {
  if (f.stun > 0) return null;
  const opts = DIRS.filter((d) => walk(f.x + D[d][0], f.y + D[d][1])), m = plMap(walk), here = m[f.x + ',' + f.y];
  if (here !== undefined && here <= 7 && Math.random() > (level < 2 ? 0.3 : 0.12)) { let bd = null, bv = Infinity; for (const d of opts) { const v = m[(f.x + D[d][0]) + ',' + (f.y + D[d][1])]; if (v < bv) { bv = v; bd = d; } } return bd; }
  const nr = opts.filter((d) => d !== OPP[f.dir]); return nr.length ? k.pick(nr) : opts[0] || null;
}
const allKeys = () => items.every((q) => q.got);
const isoLim = () => Math.round(40 + N * N * 0.3);
function updIso(dt) {
  const hk = DIRS.find((d) => k.hit.has(d)); if (hk) pl.next = hk;
  invT -= dt; swordT -= dt; lvT += dt;
  if (stepEnt(pl, dt, pickIso)) {
    const x = pl.px, y = pl.py, it = items.find((q) => !q.got && q.x === x && q.y === y), sx = W / 2, sy = (TOP + H) / 2 - 6;
    if (it) { it.got = true; score += 200; k.sfx('coin'); k.burst(sx, sy - 20, '#ffc928', 16, 150); k.float('+200', sx, sy - 44, '#ffc928');
      if (allKeys()) { msg = '¡Salida abierta!'; msgT = 1.6; k.sfx('start'); } }
    const dp = drops.find((q) => q.x === x && q.y === y);
    if (dp) { drops.splice(drops.indexOf(dp), 1); if (dp.t === 'coin') { score += 50; k.sfx('coin'); k.float('+50', sx, sy - 44, '#ffe27a'); } else { lives = Math.min(5, lives + 1); k.sfx('pop'); k.float('+1', sx, sy - 44, '#ff7a8a'); } k.burst(sx, sy - 16, dp.t === 'coin' ? '#ffc928' : '#ff4d6d', 10); }
    if (x === exitC[0] && y === exitC[1] && allKeys()) { const bonus = Math.max(0, Math.round(90 - lvT)) * 5; score += 500 * level + bonus; clearT = 1.5; k.sfx('win'); k.confetti(); msg = bonus ? `¡Salida! +${bonus} por rapidez` : '¡Salida!'; msgT = 1.5; return; }
  }
  if (!DG) { // laberinto sin monstruos: límite de tiempo por nivel (si no, la partida no acababa ni guardaba récord)
    const r = isoLim() - lvT; if (r < 10 && Math.ceil(r) !== Math.ceil(r + dt)) k.sfx('click');
    if (r <= 0) { k.sfx('lose'); k.shake(5); return k.lose(CFG.id, score, 'Sin tiempo', `Nivel ${level}`); }
    return;
  }
  if ((k.hit.has('a') || tapped()) && swordT <= -0.05) {
    swordT = 0.3; k.sfx('shoot'); let hit = false;
    for (const f of foes) if (Math.hypot(f.fx - pl.fx, f.fy - pl.fy) <= 1.3) { hit = true; f.hp--; f.fl = 0.25; f.stun = 0.7; const [sx, sy] = scr(f.fx, f.fy);
      k.burst(sx, sy - 12, '#fff', 8, 120);
      if (f.hp <= 0) { f.dead = true; score += 100; k.burst(sx, sy - 12, f.kind === 'slime' ? '#8be04a' : f.kind === 'ghost' ? '#b98cff' : '#9aa3b5', 18); k.float('+100', sx, sy - 30, '#fff'); if (Math.random() < 0.25) drops.push({ x: f.px, y: f.py, t: 'heart' }); } }
    if (hit) { k.sfx('hit'); k.shake(3); }
  }
  foes = foes.filter((f) => !f.dead);
  for (const f of foes) {
    f.fl -= dt; if (f.stun > 0) { f.stun -= dt; if (f.dir) continue; }
    stepEnt(f, dt, pickMon);
    if (invT <= 0 && f.stun <= 0 && Math.hypot(f.fx - pl.fx, f.fy - pl.fy) < 0.55) {
      lives--; invT = 1.6; f.stun = 1.2; k.sfx('hurt'); k.shake(6); k.flash('rgba(255,60,80,.3)');
      if (lives <= 0) { dying = 1.2; return; }
    }
  }
}

/* ================= Bucle ================= */
reset(); k.show(CFG.title, CFG.help);
k.run((dt) => {
  t += dt; if (k.ptr.hit) dragged = false;
  if (!k.gate(reset)) return;
  if (msgT > 0) msgT -= dt;
  if (freeze > 0) { freeze -= dt; return; }
  if (dying > 0) { if ((dying -= dt) <= 0) afterDeath(); return; }
  if (clearT > 0) { clearT -= dt; if (clearT <= 0) { level++; build(); } return; }
  if (ready > 0) { ready -= dt; if (ready <= 0) invT = Math.max(invT, 2); return; }
  if (M === 'muncher') updMuncher(dt); else if (M === 'digger') updDigger(dt); else updIso(dt);
}, draw);
function afterDeath() {
  if (DG) return k.lose(CFG.id, score, 'Derrotado', `Nivel ${level}`);
  lives--; if (lives <= 0) return k.lose(CFG.id, score, 'Atrapado', `Nivel ${level}`);
  respawnEnt(pl); pl.halt = false; ready = 1.6; invT = 0;
  if (M === 'muncher') { fright = 0; fruit = null; homeReset(); lvT = 0; }
  else foes.forEach((f) => { respawnEnt(f); f.gh = false; f.ghost = 0; f.gcd = k.rnd(5, 9); });
}

/* ================= Dibujo ================= */
function draw() {
  if (M === 'muncher') drawMuncher(); else if (M === 'digger') drawDigger(); else drawIso();
  if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); banner(msg, (TOP + H) / 2 - 70, '#ffc928'); c.globalAlpha = 1; }
}
function hudScore() { label(`${score}`, 12, 6, 20, '#fff'); label(`Récord ${Math.max(best || 0, score)}`, 13, 28, 10, 'rgba(255,255,255,.7)'); }

/* ---------- Come-cocos ---------- */
function renderMaze(col, hi, sh) {
  return mkCv(W, H, (b) => {
    const gr = b.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#161a3d'); gr.addColorStop(1, '#090b1c'); b.fillStyle = gr; b.fillRect(0, 0, W, H);
    b.fillStyle = 'rgba(255,255,255,.035)'; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!g[y][x] && (x + y) % 2) b.fillRect(BX + x * S, BY + y * S, S, S);
    const h = (N - 1) / 2; ART.rr(b, BX + (h - 2) * S + 3, BY + (h - 1) * S + 3, 5 * S - 6, 3 * S - 6, 10); b.fillStyle = 'rgba(255,154,213,.08)'; b.fill(); b.setLineDash([5, 5]); b.strokeStyle = 'rgba(255,154,213,.35)'; b.lineWidth = 2; b.stroke(); b.setLineDash([]);
    const wl = (x, y) => inside(x, y) && g[y][x] === 1;
    const path = () => { b.beginPath(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (wl(x, y)) { const cx = BX + (x + 0.5) * S, cy = BY + (y + 0.5) * S; b.moveTo(cx, cy); b.lineTo(cx + 0.01, cy); if (wl(x + 1, y)) { b.moveTo(cx, cy); b.lineTo(cx + S, cy); } if (wl(x, y + 1)) { b.moveTo(cx, cy); b.lineTo(cx, cy + S); } } };
    b.lineCap = b.lineJoin = 'round';
    path(); b.strokeStyle = 'rgba(0,0,0,.35)'; b.lineWidth = S * 0.66; b.save(); b.translate(2, 3); path(); b.stroke(); b.restore();
    path(); b.strokeStyle = OUT; b.lineWidth = S * 0.6; b.stroke(); b.strokeStyle = col; b.lineWidth = S * 0.42; b.stroke();
    b.save(); b.translate(S * 0.05, S * 0.06); path(); b.globalAlpha = 0.5; b.strokeStyle = sh; b.lineWidth = S * 0.2; b.stroke(); b.restore();
    b.save(); b.translate(-S * 0.07, -S * 0.07); path(); b.globalAlpha = 0.75; b.strokeStyle = hi; b.lineWidth = S * 0.09; b.stroke(); b.restore();
  });
}
let dotCv, powCv;
function drawPac(x, y, r, dir, mouth) {
  c.save(); c.translate(x, y); c.rotate({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir || 'right']); if (dir === 'left') c.scale(1, -1);
  c.beginPath(); c.moveTo(-r * 0.2, 0); c.arc(0, 0, r, mouth, R2 - mouth); c.closePath(); ART.fillOut(c, '#ffd23d', 2.2);
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = r * 0.16; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, r * 0.66, -2.5, -1.75); c.stroke();
  if (mouth < 2) { c.fillStyle = OUT; c.beginPath(); c.arc(r * 0.1, -r * 0.5, r * 0.14, 0, R2); c.fill(); }
  c.restore();
}
function drawGhost(f, x, y, r) {
  const d = D[f.dir || 'down'];
  if (f.mode !== 'eyes') {
    const blink = fright < 2 && Math.floor(fright * 5) % 2, col = f.scared ? (blink ? '#f2f2ff' : '#3d5afe') : GCOL[f.id], ph = Math.floor(t * 8 + f.id) % 2;
    c.beginPath(); c.moveTo(x - r, y + r * 0.85); c.lineTo(x - r, y - r * 0.1); c.arc(x, y - r * 0.1, r, Math.PI, 0); c.lineTo(x + r, y + r * 0.85);
    for (let i = 1; i <= 6; i++) c.lineTo(x + r - i * r / 3, y + r * 0.85 - ((i + ph) % 2 ? r * 0.3 : 0));
    c.closePath(); ART.fillOut(c, col, 2); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(x - r * 0.45, y - r * 0.5, r * 0.18, r * 0.3, -0.4, 0, R2); c.fill();
    if (f.scared) { const fc = blink ? '#ff4d5e' : '#ffe2c4'; c.fillStyle = fc; c.fillRect(x - r * 0.45, y - r * 0.3, r * 0.22, r * 0.26); c.fillRect(x + r * 0.23, y - r * 0.3, r * 0.22, r * 0.26);
      c.strokeStyle = fc; c.lineWidth = 1.6; c.beginPath(); for (let i = 0; i <= 6; i++) c.lineTo(x - r * 0.6 + i * r * 0.2, y + r * 0.32 + (i % 2 ? -r * 0.12 : 0)); c.stroke(); return; }
  }
  for (const s of [-1, 1]) { const ex = x + s * r * 0.38, ey = y - r * 0.18; c.beginPath(); c.ellipse(ex, ey, r * 0.28, r * 0.35, 0, 0, R2); c.fillStyle = '#fff'; c.fill(); if (f.mode === 'eyes') { c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); }
    c.fillStyle = '#1d2a8a'; c.beginPath(); c.arc(ex + d[0] * r * 0.13, ey + d[1] * r * 0.15, r * 0.15, 0, R2); c.fill(); }
}
function drawCherry(x, y) {
  c.strokeStyle = '#3aa845'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x - 5, y + 2); c.quadraticCurveTo(x - 2, y - 8, x + 4, y - 10); c.moveTo(x + 5, y + 3); c.quadraticCurveTo(x + 4, y - 4, x + 4, y - 10); c.stroke();
  for (const [dx, dy] of [[-5, 4], [5, 5]]) { c.beginPath(); c.arc(x + dx, y + dy, 5.5, 0, R2); ART.fillOut(c, '#ff3b4e', 2); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x + dx - 2, y + dy - 2, 1.6, 0, R2); c.fill(); }
}
function drawMuncher() {
  if (!boardCv) { const base = CFG.wall || '#4a55d8'; boardCv = renderMaze(base, shade(base, 0.55), shade(base, -0.45)); flashCv = renderMaze('#e8ecff', '#ffffff', '#9aa6d8'); }
  if (!dotCv) { dotCv = mkCv(10, 10, (b) => { b.beginPath(); b.arc(5, 5, 3, 0, R2); b.fillStyle = '#ffe2b0'; b.fill(); b.lineWidth = 1; b.strokeStyle = 'rgba(26,21,48,.8)'; b.stroke(); });
    powCv = mkCv(32, 32, (b) => { const gr = b.createRadialGradient(16, 16, 3, 16, 16, 16); gr.addColorStop(0, 'rgba(255,240,200,.7)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); b.fillStyle = gr; b.fillRect(0, 0, 32, 32); b.beginPath(); b.arc(16, 16, 7, 0, R2); ART.fillOut(b, '#fff3d6', 2); b.fillStyle = '#fff'; b.beginPath(); b.arc(13.5, 13.5, 2.2, 0, R2); b.fill(); }); }
  c.drawImage(clearT > 0 && Math.floor(clearT * 7) % 2 ? flashCv : boardCv, 0, 0, W, H);
  for (const it of items) if (!it.got) { const x = cellX(it.x), y = cellY(it.y); if (it.t === 'dot') c.drawImage(dotCv, x - 5, y - 5, 10, 10); else { const s = 30 * (1 + Math.sin(t * 7) * 0.14); c.drawImage(powCv, x - s / 2, y - s / 2, s, s); } }
  if (fruit && (fruit.t > 2 || Math.floor(t * 8) % 2)) drawCherry(cellX(fruit.x), cellY(fruit.y) + Math.sin(t * 4) * 1.5);
  if (clearT <= 0) for (const f of foes) drawGhost(f, cellX(f.fx), cellY(f.fy), S * 0.43);
  if (lives > 0 && !(invT > 0 && ready <= 0 && Math.floor(t * 10) % 2)) {
    let mouth = pl.dir ? 0.06 + Math.abs(Math.sin(t * 15)) * 0.62 : 0.4, dir = pl.dir || pl.last || 'right';
    if (dying > 0) { const p = Math.min(1, (1.5 - dying) / 1.1); mouth = 0.3 + p * 2.84; dir = 'up'; }
    if (dying <= 0 || dying > 0.3) drawPac(cellX(pl.fx), cellY(pl.fy), S * 0.45 * (dying > 0 ? Math.min(1, dying / 0.4 + 0.2) : 1), dir, mouth);
    if (pl.dir) pl.last = pl.dir;
  }
  hudScore();
  for (let i = 0; i < Math.max(0, lives); i++) drawPac(W - 18 - i * 22, 16, 8, 'left', 0.5);
  label(`Nivel ${level}`, W - 10, 28, 10, 'rgba(255,255,255,.8)', 'right');
  if (ready > 0 && k.st === 'play') label('¡Listo!', W / 2, cellY(home[1] + 2) - 11, 20, '#ffd23d', 'center');
}

/* ---------- Excavador ---------- */
function renderDirt() {
  return mkCv(W, H, (b) => {
    const gy = BY + S, sk = b.createLinearGradient(0, 0, 0, gy); sk.addColorStop(0, '#6cc6ff'); sk.addColorStop(1, '#d4f1ff'); b.fillStyle = sk; b.fillRect(0, 0, W, gy);
    b.fillStyle = 'rgba(255,245,200,.9)'; b.beginPath(); b.arc(W * 0.62, 20, 13, 0, R2); b.fill();
    b.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y] of [[90, 22], [330, 14], [420, 30]]) { b.beginPath(); b.arc(x, y, 9, 0, R2); b.arc(x + 12, y - 5, 11, 0, R2); b.arc(x + 25, y, 8, 0, R2); b.fill(); }
    b.fillStyle = '#9fd49a'; b.beginPath(); b.moveTo(0, gy); for (let x = 0; x <= W; x += 16) b.lineTo(x, gy - 10 - Math.sin(x / 70) * 8 - Math.sin(x / 23) * 2); b.lineTo(W, gy); b.fill();
    const L = [['#b37a47', 1], ['#96603a', 4], ['#7a4a2e', 8], ['#5c3622', 11]];
    L.forEach(([col, r], i) => { const y0 = BY + r * S; b.fillStyle = col; b.beginPath(); b.moveTo(0, H); for (let x = 0; x <= W; x += 12) b.lineTo(x, i ? y0 + Math.sin(x / 45 + i * 2) * 7 + Math.sin(x / 17 + i) * 2 : y0); b.lineTo(W, H); b.fill();
      if (i) { b.strokeStyle = 'rgba(0,0,0,.18)'; b.lineWidth = 2; b.beginPath(); for (let x = 0; x <= W; x += 12) b.lineTo(x, y0 + Math.sin(x / 45 + i * 2) * 7 + Math.sin(x / 17 + i) * 2); b.stroke(); } });
    for (let i = 0; i < 420; i++) { const x = rnd(i) * W, y = gy + 6 + rnd(i + 0.5) * (H - gy); b.fillStyle = rnd(i + 3) > 0.5 ? 'rgba(0,0,0,.14)' : 'rgba(255,230,190,.12)'; b.fillRect(x, y, 2 + rnd(i + 7) * 2, 2); }
    for (let i = 0; i < 38; i++) { const x = rnd(i * 3.3) * W, y = gy + 14 + rnd(i * 5.1) * (H - gy - 18), r = 2.5 + rnd(i * 7.7) * 3; b.beginPath(); b.ellipse(x, y, r * 1.3, r, rnd(i) * 3, 0, R2); b.fillStyle = ['#a8a0a0', '#8f8790', '#c2b6a3'][i % 3]; b.fill(); b.lineWidth = 1.2; b.strokeStyle = 'rgba(26,21,48,.6)'; b.stroke(); b.fillStyle = 'rgba(255,255,255,.35)'; b.fillRect(x - r * 0.5, y - r * 0.5, r * 0.6, r * 0.4); }
    // hueso fósil en lo profundo
    b.save(); b.translate(390, BY + 13 * S); b.rotate(-0.3); b.fillStyle = 'rgba(240,228,205,.45)'; b.fillRect(-12, -2, 24, 4); for (const s of [-1, 1]) { b.beginPath(); b.arc(s * 12, -3, 3.4, 0, R2); b.arc(s * 12, 3, 3.4, 0, R2); b.fill(); } b.restore();
    // césped
    b.fillStyle = '#3aa845'; b.fillRect(0, gy - 6, W, 9); b.fillStyle = '#5ccf5a'; b.fillRect(0, gy - 6, W, 5);
    b.fillStyle = '#5ccf5a'; for (let x = 0; x < W; x += 7) { b.beginPath(); b.moveTo(x, gy - 5); b.lineTo(x + 3, gy - 11 - (x % 3) * 2); b.lineTo(x + 6, gy - 5); b.fill(); }
    b.fillStyle = 'rgba(255,255,255,.35)'; b.fillRect(0, gy - 6, W, 1.5);
  });
}
function renderTunnels() {
  boardCv = mkCv(W, H, (b) => {
    b.drawImage(dirtCv, 0, 0, W, H); b.save(); b.beginPath(); b.rect(0, BY + S - 3, W, H); b.clip();
    const path = () => { b.beginPath(); for (let y = 1; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === 0) { const cx = BX + (x + 0.5) * S, cy = BY + (y + 0.5) * S; if (!(g[y][x + 1] === 0 || g[y][x - 1] === 0 || (g[y + 1] && g[y + 1][x] === 0) || g[y - 1][x] === 0)) { b.moveTo(cx, cy); b.lineTo(cx + 0.01, cy); }
      if (x + 1 < N && g[y][x + 1] === 0) { b.moveTo(cx, cy); b.lineTo(cx + S, cy); } if (y + 1 < N && g[y + 1][x] === 0) { b.moveTo(cx, cy); b.lineTo(cx, cy + S); } if (y === 1) { b.moveTo(cx, cy); b.lineTo(cx, cy - S); } } };
    b.lineCap = b.lineJoin = 'round'; path();
    b.strokeStyle = 'rgba(255,226,180,.3)'; b.lineWidth = S * 1.04; b.stroke(); b.strokeStyle = OUT; b.lineWidth = S * 0.9; b.stroke(); b.strokeStyle = '#3a2416'; b.lineWidth = S * 0.8; b.stroke();
    b.save(); b.translate(0, S * 0.16); path(); b.strokeStyle = '#2a190e'; b.lineWidth = S * 0.46; b.stroke(); b.restore();
    b.save(); b.translate(0, -S * 0.2); path(); b.strokeStyle = '#2f1d10'; b.lineWidth = S * 0.3; b.stroke(); b.restore();
    b.restore();
  });
  dirty = false;
}
const gemCv = {};
function gemSprite(i) {
  return gemCv[i] || (gemCv[i] = mkCv(26, 24, (b) => {
    const col = GEMC[i], x = 13, y = 11, r = 10;
    b.beginPath(); b.moveTo(x - r, y - 2); b.lineTo(x - r * 0.55, y - 8); b.lineTo(x + r * 0.55, y - 8); b.lineTo(x + r, y - 2); b.lineTo(x, y + 11); b.closePath(); ART.fillOut(b, col, 2);
    b.fillStyle = 'rgba(255,255,255,.45)'; b.beginPath(); b.moveTo(x - r * 0.55, y - 8); b.lineTo(x - r * 0.2, y - 2); b.lineTo(x - r, y - 2); b.closePath(); b.fill();
    b.fillStyle = 'rgba(0,0,0,.22)'; b.beginPath(); b.moveTo(x + r, y - 2); b.lineTo(x + r * 0.2, y - 2); b.lineTo(x, y + 11); b.closePath(); b.fill();
    b.strokeStyle = 'rgba(26,21,48,.45)'; b.lineWidth = 1; b.beginPath(); b.moveTo(x - r, y - 2); b.lineTo(x + r, y - 2); b.moveTo(x - r * 0.2, y - 2); b.lineTo(x, y + 11); b.lineTo(x + r * 0.2, y - 2); b.stroke();
  }));
}
let rockCv;
function drawBug(f, x, y) {
  const s = S * 0.36, ph = t * 16 + f.id * 2, col = ['#e0484e', '#9c5ae0', '#e08a2a'][f.id % 3];
  c.save(); c.translate(x, y); c.scale(f.face || 1, 1);
  if (f.gh) { c.globalAlpha = 0.35 + Math.sin(t * 10) * 0.1; c.beginPath(); c.ellipse(0, 0, s * 1.1, s * 0.8, 0, 0, R2); c.fillStyle = col; c.fill(); c.globalAlpha = 1;
    for (const e of [-1, 1]) { c.beginPath(); c.arc(s * 0.35 + e * s * 0.38, -s * 0.2, s * 0.3, 0, R2); ART.fillOut(c, '#fff', 1.5); c.fillStyle = OUT; c.beginPath(); c.arc(s * 0.45 + e * s * 0.38, -s * 0.2, s * 0.14, 0, R2); c.fill(); } c.restore(); return; }
  c.strokeStyle = OUT; c.lineWidth = 2; c.lineCap = 'round';
  for (let i = -1; i <= 1; i++) { const sw = Math.sin(ph + i * 2.1) * 3; c.beginPath(); c.moveTo(i * s * 0.5, s * 0.3); c.lineTo(i * s * 0.5 + sw, s * 0.95); c.stroke(); }
  c.beginPath(); c.moveTo(s * 1.1, -s * 0.35); c.quadraticCurveTo(s * 1.4, -s * 1.2, s * 1.7 + Math.sin(ph) * 1.5, -s * 1.1); c.stroke();
  c.beginPath(); c.ellipse(-s * 0.15, 0, s * 1.05, s * 0.78, 0, 0, R2); ART.fillOut(c, col, 2);
  c.strokeStyle = 'rgba(26,21,48,.55)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-s * 0.15, -s * 0.76); c.lineTo(-s * 0.15, s * 0.3); c.stroke();
  c.fillStyle = 'rgba(26,21,48,.35)'; c.beginPath(); c.arc(-s * 0.6, -s * 0.1, s * 0.15, 0, R2); c.arc(s * 0.25, -s * 0.25, s * 0.13, 0, R2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-s * 0.55, -s * 0.45, s * 0.3, s * 0.13, -0.3, 0, R2); c.fill();
  c.beginPath(); c.arc(s * 0.85, -s * 0.05, s * 0.5, 0, R2); ART.fillOut(c, shade(col, -0.35), 2);
  c.beginPath(); c.arc(s * 1.0, -s * 0.2, s * 0.24, 0, R2); ART.fillOut(c, '#fff', 1.2); c.fillStyle = OUT; c.beginPath(); c.arc(s * 1.1, -s * 0.2, s * 0.12, 0, R2); c.fill();
  c.restore();
}
function drawMiner(x, y) {
  const s = 0.72, f = pl.face || 1, moving = !!pl.dir, st = moving ? 'run' : 'idle';
  let sq = 0; if (dying > 0) { sq = k.clamp((1.5 - dying) * 0.5, 0, 0.5); }
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y, 9, 2.5, 0, 0, R2); c.fill();
  ART.hero(c, x, y, s, { face: f, state: st, t, col: '#ff5f7a', squash: sq });
  const hy = y - 28 * s * (1 - sq);
  c.beginPath(); c.arc(x, hy, 11 * s, Math.PI, 0); c.lineTo(x + f * 13 * s, hy); c.lineTo(x - f * 11 * s, hy); c.closePath(); ART.fillOut(c, '#ffc928', 1.8);
  c.beginPath(); c.arc(x + f * 7 * s, hy - 4 * s, 2.6, 0, R2); ART.fillOut(c, '#fffbe0', 1.2);
  if (moving && pl.sp < 5) { c.save(); c.translate(x + f * 10, y - 12 + Math.sin(t * 22) * 2); c.rotate(f * (0.6 + Math.sin(t * 22) * 0.5)); c.strokeStyle = OUT; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -6); c.stroke(); c.strokeStyle = '#a0703f'; c.lineWidth = 2.2; c.stroke();
    c.beginPath(); c.moveTo(-6, -6); c.quadraticCurveTo(0, -10, 6, -6); c.lineWidth = 4.5; c.strokeStyle = OUT; c.stroke(); c.strokeStyle = '#cfd6e2'; c.lineWidth = 2.4; c.stroke(); c.restore(); }
}
function drawDigger() {
  if (dirty || !boardCv) renderTunnels();
  if (!rockCv) rockCv = mkCv(32, 32, (b) => { b.beginPath(); const pts = [[4, 18], [8, 7], [18, 4], [27, 9], [29, 21], [21, 29], [9, 28]]; pts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); b.closePath(); ART.fillOut(b, '#9a97a8', 2.2);
    b.fillStyle = 'rgba(0,0,0,.22)'; b.beginPath(); b.moveTo(29, 21); b.lineTo(21, 29); b.lineTo(9, 28); b.lineTo(15, 20); b.closePath(); b.fill(); b.fillStyle = 'rgba(255,255,255,.45)'; b.beginPath(); b.moveTo(8, 9); b.lineTo(17, 6); b.lineTo(12, 14); b.closePath(); b.fill();
    b.strokeStyle = 'rgba(26,21,48,.5)'; b.lineWidth = 1.2; b.beginPath(); b.moveTo(15, 20); b.lineTo(20, 13); b.moveTo(15, 20); b.lineTo(9, 22); b.stroke(); });
  c.drawImage(boardCv, 0, 0, W, H);
  for (const it of items) if (!it.got) { const x = cellX(it.x), y = cellY(it.y); c.drawImage(gemSprite(it.c), x - 13, y - 12, 26, 24);
    const tw = Math.sin(t * 3 + it.x * 1.7 + it.y); if (tw > 0.75) { c.fillStyle = '#fff'; c.globalAlpha = (tw - 0.75) * 4; c.beginPath(); const sx = x - 4, sy = y - 6; c.moveTo(sx, sy - 5); c.lineTo(sx + 1.2, sy - 1.2); c.lineTo(sx + 5, sy); c.lineTo(sx + 1.2, sy + 1.2); c.lineTo(sx, sy + 5); c.lineTo(sx - 1.2, sy + 1.2); c.lineTo(sx - 5, sy); c.lineTo(sx - 1.2, sy - 1.2); c.fill(); c.globalAlpha = 1; } }
  for (const r of rocks) { const wx = r.st === 'wob' ? Math.sin(t * 50) * 1.6 : 0; c.drawImage(rockCv, BX + r.x * S + wx, BY + r.fy * S, S, S); }
  for (const f of foes) drawBug(f, cellX(f.fx), cellY(f.fy) + 2);
  if (lives > 0 && !(invT > 0 && ready <= 0 && Math.floor(t * 10) % 2)) drawMiner(cellX(pl.fx), BY + (pl.fy + 1) * S - 4);
  hudScore();
  for (let i = 0; i < Math.max(0, lives); i++) ART.heart(c, W - 18 - i * 22, 17, 1.1, true);
  label(`Nivel ${level}`, W - 10, 28, 10, 'rgba(255,255,255,.85)', 'right');
  c.drawImage(gemSprite(0), W - 150, 8, 20, 18); label(`${left}`, W - 128, 10, 14, '#fff');
  if (ready > 0 && k.st === 'play') banner('¡Listo!', (TOP + H) / 2 - 10, '#ffd23d');
}

/* ---------- Isométrico ---------- */
function renderBlock() {
  return mkCv(TW + 4, TH + WH + 4, (b) => {
    b.translate(TW / 2 + 2, TH / 2 + WH + 2); const hw = TW / 2, hh = TH / 2;
    const face = (pts, col) => { b.beginPath(); pts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); b.closePath(); b.fillStyle = col; b.fill(); };
    face([[-hw, 0], [0, hh], [0, hh - WH], [-hw, -WH]], PAL[2]); face([[hw, 0], [0, hh], [0, hh - WH], [hw, -WH]], PAL[3]); face([[0, -hh - WH], [hw, -WH], [0, hh - WH], [-hw, -WH]], PAL[1]);
    b.lineWidth = 1; b.strokeStyle = 'rgba(0,0,0,.22)';
    if (DG) { for (let r = 1; r < 3; r++) { const dy = -r * WH / 3; b.beginPath(); b.moveTo(-hw, dy); b.lineTo(0, hh + dy); b.lineTo(hw, dy); b.stroke();
        for (let j = 0; j < 2; j++) { const u = (j + (r % 2) * 0.5 + 0.25) / 2; b.beginPath(); b.moveTo(-hw + u * hw, u * hh + dy); b.lineTo(-hw + u * hw, u * hh + dy + WH / 3); b.moveTo(hw - u * hw, u * hh + dy); b.lineTo(hw - u * hw, u * hh + dy + WH / 3); b.stroke(); } } }
    else { b.strokeStyle = 'rgba(255,255,255,.14)'; b.beginPath(); b.moveTo(-hw + 5, -WH + 8); b.lineTo(-5, hh - WH + 10); b.lineTo(-5, hh - 6); b.lineTo(-hw + 5, -4); b.closePath(); b.moveTo(hw - 5, -WH + 8); b.lineTo(5, hh - WH + 10); b.lineTo(5, hh - 6); b.lineTo(hw - 5, -4); b.closePath(); b.stroke(); }
    b.strokeStyle = 'rgba(255,255,255,.3)'; b.lineWidth = 1.5; b.beginPath(); b.moveTo(-hw + 4, -WH); b.lineTo(0, -hh - WH + 2); b.lineTo(hw - 4, -WH); b.stroke();
    b.strokeStyle = 'rgba(26,21,48,.55)'; b.lineWidth = 1; b.beginPath(); b.moveTo(-hw, -WH); b.lineTo(0, hh - WH); b.lineTo(hw, -WH); b.moveTo(0, hh - WH); b.lineTo(0, hh); b.stroke();
    b.beginPath(); b.moveTo(0, -hh - WH); b.lineTo(hw, -WH); b.lineTo(hw, 0); b.lineTo(0, hh); b.lineTo(-hw, 0); b.lineTo(-hw, -WH); b.closePath(); b.strokeStyle = OUT; b.lineWidth = 1.6; b.stroke();
  });
}
function renderFloor() {
  const f0 = PAL[0];
  return mkCv(N * TW, N * TH + 8, (b) => {
    const ox = N * TW / 2, oy = TH / 2, hw = TW / 2, hh = TH / 2;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (g[y][x]) continue; const cx = ox + PX(x, y), cy = oy + PY(x, y);
      const dia = () => { b.beginPath(); b.moveTo(cx, cy - hh); b.lineTo(cx + hw, cy); b.lineTo(cx, cy + hh); b.lineTo(cx - hw, cy); b.closePath(); };
      dia(); b.fillStyle = shade(f0, (x + y) % 2 ? 0.07 : -0.05 + rnd(x * 13 + y) * 0.06); b.fill(); b.strokeStyle = 'rgba(0,0,0,.35)'; b.lineWidth = 1; b.stroke();
      b.strokeStyle = 'rgba(255,255,255,.07)'; b.beginPath(); b.moveTo(cx - hw + 3, cy); b.lineTo(cx, cy - hh + 1.5); b.lineTo(cx + hw - 3, cy); b.stroke();
      if (rnd(x * 7 + y * 3) < 0.3) { b.strokeStyle = 'rgba(0,0,0,.25)'; b.beginPath(); const a = rnd(x + y * 9) * 6 - 3; b.moveTo(cx - 6 + a, cy - 2); b.lineTo(cx - 1 + a, cy + 1); b.lineTo(cx + 3 + a, cy - 1); b.stroke(); }
      if (DG && rnd(x * 5 + y * 11) < 0.12) { b.fillStyle = 'rgba(120,170,90,.3)'; b.beginPath(); b.ellipse(cx + 5, cy + 2, 5, 2.5, 0, 0, R2); b.fill(); }
      b.fillStyle = 'rgba(0,0,0,.32)';
      if (g[y][x - 1]) { b.beginPath(); b.moveTo(cx - hw, cy); b.lineTo(cx, cy - hh); b.lineTo(cx + 7, cy - hh + 3.5); b.lineTo(cx - hw + 7, cy + 3.5); b.closePath(); b.fill(); }
      if (g[y - 1] && g[y - 1][x]) { b.beginPath(); b.moveTo(cx + hw, cy); b.lineTo(cx, cy - hh); b.lineTo(cx - 7, cy - hh + 3.5); b.lineTo(cx + hw - 7, cy + 3.5); b.closePath(); b.fill(); }
    }
  });
}
function renderIsoBg() { return mkCv(W, H, (b) => { const gr = b.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 380); gr.addColorStop(0, DG ? '#241a24' : '#1b1f45'); gr.addColorStop(1, DG ? '#0b080d' : '#07081a'); b.fillStyle = gr; b.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { b.fillStyle = `rgba(255,255,255,${0.05 + rnd(i) * 0.12})`; b.fillRect(rnd(i + 1) * W, rnd(i + 2) * H, 1.5, 1.5); } }); }
function renderVig() { return mkCv(W, H, (b) => { const cy = (TOP + H) / 2, gr = b.createRadialGradient(W / 2, cy, DG ? 110 : 150, W / 2, cy, 330); gr.addColorStop(0, 'rgba(6,4,12,0)'); gr.addColorStop(1, DG ? 'rgba(6,4,12,.88)' : 'rgba(6,4,20,.6)'); b.fillStyle = gr; b.fillRect(0, 0, W, H); }); }
let keyCv, glowCv;
function keySprite() {
  return keyCv || (keyCv = mkCv(30, 16, (b) => {
    b.beginPath(); b.arc(7, 8, 5.5, 0, R2); b.moveTo(12, 6); b.lineTo(27, 6); b.lineTo(27, 12); b.lineTo(24, 12); b.lineTo(24, 10); b.lineTo(21, 10); b.lineTo(21, 12); b.lineTo(18, 12); b.lineTo(18, 10); b.lineTo(12, 10); b.closePath(); ART.fillOut(b, '#ffc928', 1.8);
    b.beginPath(); b.arc(7, 8, 2.2, 0, R2); b.fillStyle = OUT; b.fill(); b.fillStyle = 'rgba(255,255,255,.6)'; b.fillRect(13, 6.8, 11, 1.4);
  }));
}
const scr = (x, y) => [W / 2 - cam.x + PX(x, y), (TOP + H) / 2 + 14 - cam.y + PY(x, y)];
function drawIso() {
  if (!floorCv) floorCv = renderFloor();
  if (!glowCv) glowCv = mkCv(80, 80, (b) => { const gr = b.createRadialGradient(40, 40, 2, 40, 40, 40); gr.addColorStop(0, 'rgba(255,190,90,.4)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); b.fillStyle = gr; b.fillRect(0, 0, 80, 80); });
  const tx = PX(pl.fx, pl.fy), ty = PY(pl.fx, pl.fy); cam.x += (tx - cam.x) * 0.15; cam.y += (ty - cam.y) * 0.15;
  c.drawImage(bgCv, 0, 0, W, H);
  const [ox, oy] = scr(0, 0); c.drawImage(floorCv, ox - N * TW / 2, oy - TH / 2, N * TW, N * TH + 8);
  // entidades por casilla de dibujo (la de mayor profundidad entre origen y destino)
  const at = {}, put = (x, y, o) => { (at[x + ',' + y] = at[x + ',' + y] || []).push(o); };
  const dc = (e) => (e.x + e.y >= e.px + e.py ? [e.x, e.y] : [e.px, e.py]);
  put(...dc(pl), { hero: 1, e: pl }); for (const f of foes) put(...dc(f), { e: f });
  const open = allKeys();
  for (let s = 0; s < N * 2 - 1; s++) for (let x = Math.max(0, s - N + 1); x <= Math.min(N - 1, s); x++) {
    const y = s - x, [sx, sy] = scr(x, y); if (sx < -TW || sx > W + TW || sy < TOP - 20 || sy > H + WH + TH + 40) continue;
    if (g[y][x] === 1) { c.drawImage(blockCv, sx - TW / 2 - 2, sy - TH / 2 - WH - 2, TW + 4, TH + WH + 4); continue; }
    if (x === exitC[0] && y === exitC[1]) drawExit(sx, sy, open);
    const it = items.find((q) => !q.got && q.x === x && q.y === y);
    if (it) { const bob = Math.sin(t * 3 + x) * 3; c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(sx, sy, 9 - bob * 0.5, 4, 0, 0, R2); c.fill();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5; c.drawImage(glowCv, sx - 22, sy - 42 + bob, 44, 44); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.save(); c.translate(sx, sy - 20 + bob); c.rotate(-0.5 + Math.sin(t * 2 + y) * 0.2); c.drawImage(keySprite(), -15, -8, 30, 16); c.restore(); }
    for (const d of drops) if (d.x === x && d.y === y) { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(sx, sy, 7, 3, 0, 0, R2); c.fill(); if (d.t === 'coin') ART.coin(c, sx, sy - 14, t, 7); else ART.heart(c, sx, sy - 14 + Math.sin(t * 4) * 2, 1.1, true); }
    const list = at[x + ',' + y]; if (list) for (const o of list.sort((a, b) => a.e.fy + a.e.fx - b.e.fy - b.e.fx)) (o.hero ? drawIsoHero : drawMon)(o.e, 1);
  }
  for (const [x, y, side] of torches) { const [sx, sy] = scr(x, y); if (sx < -40 || sx > W + 40 || sy < 0 || sy > H + 60) continue; const tx2 = sx + side * TW / 4, ty2 = sy + TH / 4 - WH * 0.5, fl = Math.sin(t * 17 + x) * 0.12 + Math.sin(t * 7 + y) * 0.1;
    c.globalCompositeOperation = 'lighter'; c.drawImage(glowCv, tx2 - 40 * (1 + fl), ty2 - 44 * (1 + fl), 80 * (1 + fl), 80 * (1 + fl)); c.globalCompositeOperation = 'source-over';
    ART.rr(c, tx2 - 3, ty2 - 1, 6, 5, 1.5); ART.fillOut(c, '#6b4329', 1.2); c.beginPath(); c.arc(tx2, ty2 - 4, 3.6, 0.2, Math.PI - 0.2); c.quadraticCurveTo(tx2 - 3, ty2 - 9, tx2, ty2 - 13 - fl * 8); c.quadraticCurveTo(tx2 + 3, ty2 - 9, tx2 + 3.4, ty2 - 3); c.closePath(); ART.fillOut(c, '#ff8a2a', 1.2); c.fillStyle = '#ffe27a'; c.beginPath(); c.ellipse(tx2, ty2 - 5, 1.8, 2.8, 0, 0, R2); c.fill(); }
  // silueta del héroe si queda tapado por un muro delantero
  const [hx, hy] = dc(pl); if (g[hy + 1] && (g[hy + 1][hx] === 1 || g[hy + 1][hx + 1] === 1 || g[hy][hx + 1] === 1)) { c.globalAlpha = 0.35; drawIsoHero(pl, 0); c.globalAlpha = 1; }
  if (swordT > 0) { const [sx, sy] = scr(pl.fx, pl.fy), p = 1 - swordT / 0.3; c.globalAlpha = Math.min(1, swordT * 6); c.lineCap = 'round';
    for (const [lw, col] of [[9, 'rgba(26,21,48,.5)'], [6, '#fff'], [2.5, '#7df0ff']]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.ellipse(sx, sy - 8, 36, 18, 0, p * R2 - 2.2, p * R2); c.stroke(); } c.globalAlpha = 1; }
  c.drawImage(vigCv, 0, 0, W, H);
  if (k.ptr.down && dragged) { c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2; c.beginPath(); c.arc(k.ptr.sx, k.ptr.sy, 30, 0, R2); c.stroke(); k.circle(k.ptr.sx + k.clamp(k.ptr.x - k.ptr.sx, -30, 30), k.ptr.sy + k.clamp(k.ptr.y - k.ptr.sy, -30, 30), 11, 'rgba(255,255,255,.35)'); }
  // HUD
  hudScore();
  ART.rr(c, 8, 44, 102, 26, 13); c.fillStyle = 'rgba(26,21,48,.7)'; c.fill();
  items.forEach((q, i) => { c.globalAlpha = q.got ? 1 : 0.28; c.drawImage(keySprite(), 14 + i * 32, 49, 30, 16); c.globalAlpha = 1; });
  label(`Nivel ${level}`, W - 10, DG ? 28 : 8, DG ? 10 : 16, DG ? 'rgba(255,255,255,.85)' : '#fff', 'right');
  if (DG) for (let i = 0; i < Math.max(0, lives); i++) ART.heart(c, W - 18 - i * 22, 17, 1.1, true);
  else { const r = Math.max(0, Math.ceil(isoLim() - lvT)); label(`${r} s`, W - 10, 30, 14, r <= 10 && Math.floor(t * 4) % 2 ? '#ff6b6b' : r <= 10 ? '#ffc928' : 'rgba(255,255,255,.85)', 'right'); }
  compass(open);
}
function drawExit(sx, sy, open) {
  const hw = TW / 2 - 4, hh = TH / 2 - 2;
  c.beginPath(); c.moveTo(sx, sy - hh); c.lineTo(sx + hw, sy); c.lineTo(sx, sy + hh); c.lineTo(sx - hw, sy); c.closePath();
  ART.fillOut(c, open ? '#1d6b4a' : '#3c3a4a', 2);
  c.beginPath(); c.ellipse(sx, sy, hw * 0.55, hh * 0.55, 0, 0, R2); c.fillStyle = open ? '#7cf7a0' : '#1f1d2a'; c.fill();
  if (open) { const p = 0.6 + Math.sin(t * 4) * 0.2; c.globalCompositeOperation = 'lighter'; const gr = c.createLinearGradient(0, sy - 70, 0, sy); gr.addColorStop(0, 'rgba(124,247,160,0)'); gr.addColorStop(1, `rgba(124,247,160,${0.45 * p})`);
    c.fillStyle = gr; c.fillRect(sx - hw * 0.55, sy - 70, hw * 1.1, 70); c.fillStyle = '#bfffd0';
    for (let i = 0; i < 5; i++) { const q = (t * 0.7 + i / 5) % 1; c.globalAlpha = 1 - q; c.fillRect(sx - 10 + rnd(i) * 20, sy - q * 60, 2.5, 2.5); } c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  else { const by = sy - 24 + Math.sin(t * 2) * 2; c.beginPath(); c.arc(sx, by - 5, 5, Math.PI, 0); c.lineWidth = 4.5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 2.2; c.strokeStyle = '#cfd6e2'; c.stroke();
    ART.rr(c, sx - 7.5, by - 5, 15, 12, 3); ART.fillOut(c, '#ffc928', 2); c.fillStyle = OUT; c.fillRect(sx - 1, by - 1, 2, 5); }
}
function drawIsoHero(e, shadow) {
  const [sx, sy] = scr(e.fx, e.fy); if (shadow) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(sx, sy + 1, 10, 4.5, 0, 0, R2); c.fill(); }
  if (shadow && invT > 0 && Math.floor(t * 12) % 2) return;
  let sw = DG ? 0.35 : 0; if (DG && swordT > 0) sw = -2.2 + (1 - swordT / 0.3) * 4.2;
  const sq = dying > 0 ? Math.min(0.5, (1.2 - dying) * 0.6) : 0;
  ART.hero(c, sx, sy + 2, 0.62, { face: e.face, state: e.dir ? 'run' : 'idle', t, col: DG ? '#5ce1e6' : '#ff5f7a', sword: DG ? sw : 0, squash: sq });
}
function drawMon(f) {
  const [sx, sy] = scr(f.fx, f.fy); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(sx, sy + 1, 11, 4.5, 0, 0, R2); c.fill();
  if (f.fl > 0 && Math.floor(t * 20) % 2) return;
  const jit = f.stun > 0 ? Math.sin(t * 50) * 1.5 : 0;
  ART.enemy(c, f.kind, sx - 12 + jit, sy - 22, 24, 22, { t: t + f.id, face: f.face, col: f.kind === 'slime' ? ['#8be04a', '#ff8a5c', '#5ce1e6'][f.id % 3] : undefined });
  if (f.hp < f.max) for (let i = 0; i < f.max; i++) { c.beginPath(); c.arc(sx - (f.max - 1) * 4 + i * 8, sy - 36, 3, 0, R2); ART.fillOut(c, i < f.hp ? '#ff4d6d' : '#3a3346', 1.2); }
}
function compass(open) {
  let tgt = null, bd = Infinity; if (open) tgt = exitC; else for (const q of items) if (!q.got) { const d = Math.hypot(q.x - pl.fx, q.y - pl.fy); if (d < bd) { bd = d; tgt = [q.x, q.y]; } }
  if (!tgt) return; const cx = W - 36, cy = H - 36, a = Math.atan2(PY(tgt[0], tgt[1]) - PY(pl.fx, pl.fy), PX(tgt[0], tgt[1]) - PX(pl.fx, pl.fy));
  c.beginPath(); c.arc(cx, cy, 26, 0, R2); c.fillStyle = 'rgba(26,21,48,.78)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = open ? '#7cf7a0' : '#ffc928'; c.stroke();
  c.save(); c.translate(cx, cy); c.rotate(a); c.beginPath(); c.moveTo(24, 0); c.lineTo(13, -7); c.lineTo(13, 7); c.closePath(); ART.fillOut(c, open ? '#7cf7a0' : '#ffc928', 1.8); c.restore();
  if (open) { c.beginPath(); c.moveTo(cx - 8, cy + 8); c.lineTo(cx - 8, cy - 4); c.arc(cx, cy - 4, 8, Math.PI, 0); c.lineTo(cx + 8, cy + 8); c.closePath(); ART.fillOut(c, '#1d6b4a', 1.8); c.fillStyle = '#7cf7a0'; c.fillRect(cx - 4, cy - 3, 8, 11); }
  else c.drawImage(keySprite(), cx - 11, cy - 6, 22, 12);
}
