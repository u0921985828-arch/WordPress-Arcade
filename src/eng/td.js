/* Tower Defense con arte propio (ART). CFG.mode: 'path' (camino fijo) | 'maze' (prado libre: las torres desvían la ruta) | 'hex' (mapa hexagonal)
 * 4 torres con torreta que apunta, 3 niveles y venta; oleadas anunciadas con jefe cada 5; construcción en dos toques con vista previa. */
const M = CFG.mode, HEX = M === 'hex', OUT = ART.OUT, R2 = 6.2832;
const W = 640, H = 360, OY = 40, PX = 560, S = 40, HR = 20, COLS = HEX ? 18 : 14, ROWS = 8;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#2f5a2c' }), c = k.ctx;
const CELL = HEX ? HR * 1.732 : S, SC = CELL / S; // distancia entre centros vecinos y escala de sprites
const HX0 = (PX - (COLS - 1) * HR * 1.5) / 2, HY0 = OY + (H - OY - (ROWS + 0.5) * CELL) / 2 + CELL / 2;
/* coste, alcance (px a 40), cadencia (s), daño */
const TOWERS = [
  { n: 'Ballesta', cost: 50, r: 96, rate: 0.55, dmg: 9, col: '#c98a4b', kind: 'arrow' },
  { n: 'Cañón', cost: 90, r: 84, rate: 1.3, dmg: 24, splash: 42, col: '#8a93a6', kind: 'cannon' },
  { n: 'Hielo', cost: 70, r: 80, rate: 0.9, dmg: 4, slow: 1.6, col: '#7fd8ff', kind: 'ice' },
  { n: 'Rayo', cost: 120, r: 90, rate: 1.15, dmg: 13, chain: 3, col: '#f2d15c', kind: 'zap' },
];
/* arte, vida relativa, velocidad (casillas/s), tamaño, oro, blindaje */
const FT = {
  norm: { art: 'slime', hp: 1, sp: 1.35, w: 26, h: 22, gold: 5, col: '#8be04a' },
  fast: { art: 'bird', hp: 0.55, sp: 2.5, w: 26, h: 22, gold: 5 },
  armor: { art: 'knight', hp: 2.2, sp: 0.95, w: 22, h: 26, gold: 9, armor: 3 },
  boss: { art: 'slime', hp: 11, sp: 0.62, w: 44, h: 38, gold: 60, col: '#b36cff' },
};
let grid, path, towers, foes, bullets, gold, lives, wave, spawnQ, spawnT, pick, score, between, fxs, sel, preview, banner, msg, tt, bg, cur, kbd, START, GOAL;

/* ---------- Geometría (cuadrícula u hexágonos) ---------- */
const center = ([x, y]) => HEX ? [HX0 + x * HR * 1.5, HY0 + y * CELL + (x & 1) * CELL / 2] : [x * S + S / 2, OY + y * S + S / 2];
const inb = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
function nbs(x, y) { if (!HEX) return [[x + 1, y], [x, y + 1], [x, y - 1], [x - 1, y]]; const o = x & 1; return [[x + 1, y - 1 + o], [x + 1, y + o], [x, y - 1], [x, y + 1], [x - 1, y - 1 + o], [x - 1, y + o]]; }
function cellAt(px, py) {
  if (px >= PX || py < OY) return null;
  if (!HEX) { const x = Math.floor(px / S), y = Math.floor((py - OY) / S); return inb(x, y) ? [x, y] : null; }
  let best = null, bd = HR; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const [cx, cy] = center([x, y]), d = Math.hypot(px - cx, py - cy); if (d < bd) { bd = d; best = [x, y]; } } return best;
}
function hexPath(g, x, y, r) { g.beginPath(); for (let i = 0; i < 6; i++) g.lineTo(x + Math.cos(i * 1.0472) * r, y + Math.sin(i * 1.0472) * r); g.closePath(); }
/* 0 libre · 1 camino · 2 torre · 3 roca · 4 entrada/salida */
function bfs(from) {
  const prev = {}, q = [from], seen = new Set([from.join()]);
  while (q.length) { const cu = q.shift(); if (cu[0] === GOAL[0] && cu[1] === GOAL[1]) { const out = [cu]; let kk = cu.join(); while (prev[kk]) { out.unshift(prev[kk]); kk = prev[kk].join(); } return out; }
    for (const [nx, ny] of nbs(cu[0], cu[1])) { const kk = nx + ',' + ny; if (!inb(nx, ny) || seen.has(kk) || grid[ny][nx] === 2 || grid[ny][nx] === 3) continue; seen.add(kk); prev[kk] = cu; q.push([nx, ny]); } }
  return null;
}

/* ---------- Mapa ---------- */
function build() {
  for (let tries = 0; tries < 50; tries++) {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    if (M === 'maze') { START = [0, 3]; GOAL = [COLS - 1, 4]; grid[START[1]][START[0]] = grid[GOAL[1]][GOAL[0]] = 4; }
    else { // camino serpenteante de izquierda a derecha
      path = []; let x = 0, y = k.ri(2, ROWS - 3), since = 1; path.push([x, y]);
      while (x < COLS - 1) {
        if (since >= 2 && x > 0 && x < COLS - 2 && Math.random() < 0.45) { const ny = k.clamp(y + (Math.random() < 0.5 ? -1 : 1) * k.ri(2, 4), 1, ROWS - 2); while (y !== ny) { y += Math.sign(ny - y); path.push([x, y]); } since = 0; continue; }
        if (HEX) { const o = x & 1, opts = [y - 1 + o, y + o].filter((q) => q >= 1 && q <= ROWS - 2); y = opts.length > 1 ? (Math.abs(opts[0] - 3.5) < Math.abs(opts[1] - 3.5) === Math.random() < 0.6 ? opts[0] : opts[1]) : opts[0]; }
        x++; since++; path.push([x, y]);
      }
      for (const [px, py] of path) grid[py][px] = 1; START = path[0]; GOAL = path[path.length - 1];
    }
    // rocas decorativas (no edificables)
    for (let i = 0, n = M === 'maze' ? 7 : 9; i < n * 4 && n > 0; i++) { const x = k.ri(1, COLS - 2), y = k.ri(0, ROWS - 1); if (grid[y][x] !== 0) continue; if (Math.abs(x - START[0]) + Math.abs(y - START[1]) < 3 || Math.abs(x - GOAL[0]) + Math.abs(y - GOAL[1]) < 3) continue; grid[y][x] = 3; n--; }
    if (M === 'maze') { path = bfs(START); if (!path) continue; }
    break;
  }
  bake();
}
function reset() { towers = []; foes = []; bullets = []; fxs = []; gold = 150; lives = 20; wave = 0; spawnQ = []; spawnT = 0; pick = 0; score = 0; between = 4; sel = null; preview = null; banner = null; msg = null; tt = 0; cur = [2, 3]; kbd = false; build(); }

/* ---------- Fondo cacheado a 2× ---------- */
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function bake() {
  bg = document.createElement('canvas'); bg.width = W * 2; bg.height = H * 2; const g = bg.getContext('2d'); g.scale(2, 2);
  let gr = g.createLinearGradient(0, OY, 0, H); gr.addColorStop(0, '#74c66a'); gr.addColorStop(1, '#5aa956'); g.fillStyle = gr; g.fillRect(0, OY, PX, H - OY);
  // textura de hierba y flores
  for (let i = 0; i < 900; i++) { const x = rnd(i) * PX, y = OY + rnd(i + 0.5) * (H - OY); g.strokeStyle = rnd(i + 2) < 0.5 ? 'rgba(40,110,40,.35)' : 'rgba(190,240,150,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd(i + 3) - 0.5) * 3, y - 3 - rnd(i + 4) * 3); g.stroke(); }
  for (let i = 0; i < 40; i++) { const x = rnd(i + 70) * PX, y = OY + 6 + rnd(i + 71) * (H - OY - 12); g.fillStyle = ['#fff6c2', '#ff9ad5', '#ffffff', '#ffd23d'][i % 4]; for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x + Math.cos(j * 1.57) * 1.8, y + Math.sin(j * 1.57) * 1.8, 1.4, 0, R2); g.fill(); } g.fillStyle = '#e39b00'; g.beginPath(); g.arc(x, y, 1, 0, R2); g.fill(); }
  // rejilla sutil de casillas
  g.strokeStyle = 'rgba(20,60,20,.16)'; g.lineWidth = 1;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const [cx, cy] = center([x, y]); if (HEX) { hexPath(g, cx, cy, HR - 1); g.stroke(); } else g.strokeRect(cx - S / 2 + 0.5, cy - S / 2 + 0.5, S - 1, S - 1); }
  // camino de tierra (modo fijo)
  if (M !== 'maze') {
    const pts = path.map(center); pts.unshift([pts[0][0] - CELL, pts[0][1]]); pts.push([pts[pts.length - 1][0] + CELL, pts[pts.length - 1][1]]);
    const road = (lw, col) => { g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = lw; g.strokeStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    road(CELL * 0.86 + 5, OUT); road(CELL * 0.86, '#a8784a'); road(CELL * 0.62, '#c99a64'); road(CELL * 0.2, 'rgba(255,230,180,.18)');
    for (let i = 0; i < path.length * 5; i++) { const [cx, cy] = center(path[i % path.length]); g.fillStyle = rnd(i + 9) < 0.5 ? 'rgba(110,70,40,.45)' : 'rgba(255,235,200,.4)'; g.beginPath(); g.ellipse(cx + (rnd(i) - 0.5) * CELL * 0.6, cy + (rnd(i + 1) - 0.5) * CELL * 0.6, 1.8, 1.2, 0, 0, R2); g.fill(); }
  }
  // rocas
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x] === 3) {
    const [cx, cy] = center([x, y]), s = SC, r = rnd(x * 7 + y);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(cx, cy + 9 * s, 15 * s, 5 * s, 0, 0, R2); g.fill();
    if (r < 0.5) { g.beginPath(); g.moveTo(cx - 14 * s, cy + 9 * s); g.quadraticCurveTo(cx - 15 * s, cy - 8 * s, cx - 2 * s, cy - 11 * s); g.quadraticCurveTo(cx + 14 * s, cy - 9 * s, cx + 14 * s, cy + 9 * s); g.closePath(); ART.fillOut(g, '#9a98ad', 2); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx - 5 * s, cy - 5 * s, 4 * s, 2.5 * s, -0.4, 0, R2); g.fill(); g.strokeStyle = 'rgba(26,21,48,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + 3 * s, cy - 6 * s); g.lineTo(cx + 6 * s, cy + 2 * s); g.stroke(); }
    else { g.save(); g.translate(cx, cy + 10 * s); g.scale(0.78 * s, 0.78 * s); ART.deco(g, { deco: 'pine', near: '#3d8f4a' }, 0, 0, 32, 0); g.restore(); }
  }
  // entrada (cueva) y salida (castillo)
  const [sx, sy] = center(START), [ex, ey] = center(GOAL), s = SC;
  g.save(); g.translate(sx - CELL * 0.35, sy); g.scale(s, s); g.beginPath(); g.moveTo(-20, 18); g.lineTo(-20, -6); g.quadraticCurveTo(-18, -26, 2, -24); g.quadraticCurveTo(16, -20, 14, 18); g.closePath(); ART.fillOut(g, '#77748f', 2.5); g.beginPath(); g.moveTo(-10, 18); g.lineTo(-10, 0); g.quadraticCurveTo(-8, -12, 1, -12); g.quadraticCurveTo(9, -10, 8, 18); g.closePath(); ART.fillOut(g, '#1a1530', 2); g.restore();
  g.save(); g.translate(ex + CELL * 0.1, ey + 4 * s); g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, 16, 22, 6, 0, 0, R2); g.fill();
  ART.rr(g, -16, -14, 32, 30, 3); ART.fillOut(g, '#c9c2dc', 2.5); for (let i = 0; i < 4; i++) { g.beginPath(); g.rect(-16 + i * 9, -20, 6, 7); ART.fillOut(g, '#c9c2dc', 2); }
  g.beginPath(); g.moveTo(-6, 16); g.lineTo(-6, 4); g.arc(0, 4, 6, Math.PI, 0); g.lineTo(6, 16); ART.fillOut(g, '#6b4329', 2); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-13, -11, 4, 18); g.restore();
  // barra superior y panel lateral
  gr = g.createLinearGradient(0, 0, 0, OY); gr.addColorStop(0, '#3a2b22'); gr.addColorStop(1, '#2a1f19'); g.fillStyle = gr; g.fillRect(0, 0, W, OY); g.fillStyle = OUT; g.fillRect(0, OY - 3, W, 3);
  gr = g.createLinearGradient(PX, 0, W, 0); gr.addColorStop(0, '#3e2f25'); gr.addColorStop(1, '#2d221b'); g.fillStyle = gr; g.fillRect(PX, OY, W - PX, H - OY); g.fillStyle = OUT; g.fillRect(PX, OY, 3, H - OY);
  g.fillStyle = 'rgba(255,255,255,.04)'; for (let y = OY + 8; y < H; y += 16) g.fillRect(PX + 3, y, W - PX, 1);
  // viñeta suave del tablero
  gr = g.createRadialGradient(PX / 2, (OY + H) / 2, 150, PX / 2, (OY + H) / 2, 360); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,30,0,.28)'); g.fillStyle = gr; g.fillRect(0, OY, PX, H - OY);
}

/* ---------- Reglas ---------- */
const stat = (tw) => { const T = TOWERS[tw.t], l = tw.lv - 1; return { r: T.r * SC * (1 + l * 0.14), dmg: T.dmg * (1 + l * 0.65), rate: T.rate * (1 - l * 0.1) }; };
const upCost = (tw) => Math.round(TOWERS[tw.t].cost * 0.7 * tw.lv), sellVal = (tw) => Math.floor(tw.spent * 0.6);
const towerAt = (x, y) => towers.find((q) => q.x === x && q.y === y);
function nextCell(f) { return f.path[Math.min(f.i + 1, f.path.length - 1)]; }
/* ¿se puede construir? En el laberinto la ruta no puede quedar bloqueada (tampoco para los enemigos en camino) */
function canBuild(x, y) {
  if (grid[y][x] !== 0) return { ok: false };
  if (M !== 'maze') return { ok: true };
  if (foes.some((f) => { const a = f.path[f.i], b = nextCell(f); return (a[0] === x && a[1] === y) || (b[0] === x && b[1] === y); })) return { ok: false, why: 'Hay un enemigo ahí' };
  grid[y][x] = 2; const np = bfs(START), okF = np && foes.every((f) => bfs(nextCell(f))); grid[y][x] = 0;
  return np && okF ? { ok: true, np } : { ok: false, why: '¡No bloquees el camino!' };
}
function select(cell) { sel = cell; preview = null; if (cell && !towerAt(...cell) && grid[cell[1]][cell[0]] === 0) preview = canBuild(...cell); }
function buildAt(x, y) {
  const T = TOWERS[pick], cb = canBuild(x, y);
  if (!cb.ok) { say(cb.why || 'Ahí no se puede'); k.sfx('hurt'); return; }
  if (gold < T.cost) { say('Falta oro'); k.sfx('hurt'); return; }
  grid[y][x] = 2; gold -= T.cost; towers.push({ x, y, t: pick, lv: 1, cd: 0, a: -1.2, rec: 0, pop: 0.3, spent: T.cost });
  if (M === 'maze') { path = cb.np; for (const f of foes) { const nb = bfs(nextCell(f)); if (nb) { f.path = [f.path[f.i], ...nb]; f.i = 0; } } }
  const [cx, cy] = center([x, y]); k.burst(cx, cy + 8, '#d9c7a0', 10, 90); k.sfx('click'); select([x, y]);
}
function upgrade(tw) {
  if (tw.lv >= 3) return; const cost = upCost(tw); if (gold < cost) { say('Falta oro'); k.sfx('hurt'); return; }
  gold -= cost; tw.spent += cost; tw.lv++; tw.pop = 0.3; const [cx, cy] = center([tw.x, tw.y]); k.burst(cx, cy, '#ffd23d', 14, 120); k.float('Nivel ' + tw.lv, cx, cy - 26, '#ffd23d'); k.sfx('coin');
}
function sell(tw) {
  const v = sellVal(tw); gold += v; towers.splice(towers.indexOf(tw), 1); grid[tw.y][tw.x] = 0; const [cx, cy] = center([tw.x, tw.y]);
  k.float('+' + v, cx, cy - 16, '#ffd23d'); k.burst(cx, cy, '#b7a58a', 10, 90); k.sfx('pop');
  if (M === 'maze') { path = bfs(START); for (const f of foes) { const nb = bfs(nextCell(f)); if (nb) { f.path = [f.path[f.i], ...nb]; f.i = 0; } } }
  select(null);
}
function say(t) { msg = { t, life: 1.6 }; }
function startWave() {
  if (between <= 0) return; if (wave > 0 && between > 1) { const b = Math.ceil(between) * 2; gold += b; k.float('+' + b, PX + 40, H - 50, '#ffd23d'); }
  between = 0; wave++; const n = Math.min(6 + wave * 2, 32);
  spawnQ = Array.from({ length: n }, (_, i) => (wave % 5 === 0 && i === n - 1 ? 'boss' : wave >= 4 && i % 5 === 2 ? 'armor' : wave >= 3 && i % 4 === 0 ? 'fast' : 'norm'));
  banner = { t: 2.4, head: 'Oleada ' + wave, sub: wave % 5 === 0 ? '¡Llega un jefe!' : wave === 3 ? 'Cuidado: pájaros rápidos' : wave === 4 ? 'Caballeros con armadura' : n + ' enemigos' };
  k.sfx(wave % 5 === 0 ? 'hurt' : 'start'); spawnT = 0.4;
}
function damage(f, d) { const T = FT[f.ty]; f.hp -= Math.max(1, d - (T.armor || 0)); f.hf = 0.1; }
function panelHit(px, py) { if (px < PX) return -2; if (py > H - 62) return 9; const i = Math.floor((py - OY - 6) / 62); return i >= 0 && i < 4 ? i : -1; }
/* botones flotantes sobre la casilla seleccionada */
function popup() {
  if (!sel) return []; const [cx, cy] = center(sel), tw = towerAt(...sel), up = cy - CELL * 0.6 - 26 < OY + 2, y = up ? cy + CELL * 0.6 + 4 : cy - CELL * 0.6 - 26;
  if (tw) { const bw = 84, x0 = k.clamp(cx - bw - 3, 4, PX - bw * 2 - 10); return [{ id: 'up', x: x0, y, w: bw, h: 24, txt: tw.lv >= 3 ? 'Máx.' : 'Mejorar', cost: tw.lv >= 3 ? null : upCost(tw), on: tw.lv < 3 && gold >= upCost(tw) }, { id: 'sell', x: x0 + bw + 6, y, w: bw, h: 24, txt: 'Vender', cost: sellVal(tw), on: true, red: true }]; }
  if (grid[sel[1]][sel[0]] !== 0) return []; const bw = 92, x0 = k.clamp(cx - bw / 2, 4, PX - bw - 4);
  return [{ id: 'build', x: x0, y, w: bw, h: 24, txt: 'Construir', cost: TOWERS[pick].cost, on: preview && preview.ok && gold >= TOWERS[pick].cost }];
}

reset();
k.show(CFG.title, M === 'maze' ? 'Construye torres en el prado para alargar el camino de los enemigos (no puedes cerrarlo del todo). Toca una casilla dos veces para construir.' : 'Elige torre a la derecha y toca dos veces una casilla de hierba para construir. Toca una torre para mejorarla o venderla.');

k.run((dt) => {
  if (!k.gate(reset)) return;
  tt += dt;
  /* --- entrada táctil --- */
  if (k.ptr.hit) {
    kbd = false; const px = k.ptr.x, py = k.ptr.y, ph = panelHit(px, py);
    const pb = popup().find((b) => px >= b.x && px <= b.x + b.w && py >= b.y - 4 && py <= b.y + b.h + 4);
    if (pb) { const tw = towerAt(...sel); if (pb.id === 'build') buildAt(...sel); else if (pb.id === 'up') upgrade(tw); else sell(tw); }
    else if (ph === 9) startWave();
    else if (ph >= 0) { pick = ph; k.sfx('click'); if (sel && !towerAt(...sel)) select(sel); }
    else if (ph === -2) { const cell = cellAt(px, py);
      if (!cell) select(null);
      else if (sel && cell[0] === sel[0] && cell[1] === sel[1] && !towerAt(...cell) && grid[cell[1]][cell[0]] === 0) buildAt(...cell);
      else if (towerAt(...cell) || grid[cell[1]][cell[0]] === 0) { select(cell); k.sfx('click'); }
      else select(null); }
  }
  /* --- teclado: flechas mueven el cursor, A construye/mejora (o lanza oleada), B cambia de torre --- */
  const dir = k.hit.has('left') ? [-1, 0] : k.hit.has('right') ? [1, 0] : k.hit.has('up') ? [0, -1] : k.hit.has('down') ? [0, 1] : null;
  if (dir) { kbd = true; cur = [k.clamp(cur[0] + dir[0], 0, COLS - 1), k.clamp(cur[1] + dir[1], 0, ROWS - 1)]; select(cur.slice()); }
  if (k.hit.has('b')) { pick = (pick + 1) % 4; k.sfx('click'); if (sel && !towerAt(...sel)) select(sel); }
  if (k.hit.has('a')) { const tw = sel && towerAt(...sel); if (tw) upgrade(tw); else if (sel && grid[sel[1]][sel[0]] === 0) buildAt(...sel); else startWave(); }

  /* --- oleadas --- */
  if (between > 0) { between -= dt; if (between <= 0) { between = 0.01; startWave(); } }
  if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
  if (msg) { msg.life -= dt; if (msg.life <= 0) msg = null; }
  spawnT -= dt;
  if (spawnQ.length && spawnT <= 0) { const ty = spawnQ.shift(), T = FT[ty]; spawnT = ty === 'fast' ? 0.45 : 0.75; const hp = Math.round((18 + wave * 8 + wave * wave * 0.7) * T.hp);
    foes.push({ ty, i: 0, p: 0, hp, max: hp, slow: 0, hf: 0, face: 1, ph: Math.random() * 6, path: path.slice(), x: -20, y: 0, walked: 0 }); }
  /* --- enemigos --- */
  for (const f of foes) {
    f.slow -= dt; f.hf -= dt; const sp = FT[f.ty].sp * (f.slow > 0 ? 0.5 : 1); f.p += sp * dt; f.walked += sp * dt;
    while (f.p >= 1 && f.i < f.path.length - 1) { f.p -= 1; f.i++; }
    const a = f.path[f.i], b = nextCell(f), [ax, ay] = center(a), [bx, by] = center(b);
    if (bx !== ax) f.face = Math.sign(bx - ax); f.x = ax + (bx - ax) * f.p; f.y = ay + (by - ay) * f.p;
    if (f.i >= f.path.length - 1) { f.dead = true; f.leak = true; lives -= f.ty === 'boss' ? 5 : 1; k.burst(f.x, f.y, '#ff4d6d', 12, 120); k.flash('rgba(255,60,80,.25)'); k.shake(5); k.sfx('hurt'); }
  }
  /* --- torres --- */
  for (const tw of towers) {
    const T = TOWERS[tw.t], st = stat(tw), [tx, ty] = center([tw.x, tw.y]); tw.cd -= dt; tw.rec = Math.max(0, tw.rec - dt * 4); tw.pop = Math.max(0, tw.pop - dt);
    let tg = null, bestP = -1; for (const f of foes) if (!f.dead && Math.hypot(f.x - tx, f.y - ty) < st.r) { const pr = f.walked - (f.path.length - f.i) * 0.001; if (pr > bestP) { bestP = pr; tg = f; } }
    if (tg) { const want = Math.atan2(tg.y - ty, tg.x - tx); let d = ((want - tw.a + Math.PI * 3) % R2) - Math.PI; tw.a += d * Math.min(1, dt * 12); }
    if (tw.cd > 0 || !tg) continue;
    tw.cd = st.rate; tw.rec = 1; const mx = tx + Math.cos(tw.a) * 14 * SC, my = ty - 6 * SC + Math.sin(tw.a) * 14 * SC;
    if (T.kind === 'zap') { // rayo encadenado
      const hit = [tg]; let last = tg; for (let j = 1; j < T.chain + tw.lv - 1; j++) { const nx = foes.find((f) => !f.dead && !hit.includes(f) && Math.hypot(f.x - last.x, f.y - last.y) < 70 * SC); if (!nx) break; hit.push(nx); last = nx; }
      const pts = [[tx, ty - 16 * SC], ...hit.map((f) => [f.x, f.y - 8 * SC])]; fxs.push({ k: 'bolt', pts, life: 0.16, max: 0.16 }); hit.forEach((f, j) => damage(f, st.dmg * (j ? 0.7 : 1))); k.sfx('shoot');
    } else if (T.kind === 'cannon') { const d = Math.hypot(tg.x - mx, tg.y - my); bullets.push({ k: 'ball', sx: mx, sy: my, ex: tg.x, ey: tg.y, t: 0, dur: 0.25 + d / 420, dmg: st.dmg, splash: T.splash * SC * (1 + (tw.lv - 1) * 0.15) }); fxs.push({ k: 'puff', x: mx, y: my, life: 0.25, max: 0.25 }); k.sfx('hit'); }
    else bullets.push({ k: T.kind, x: mx, y: my, tg, dmg: st.dmg, slow: T.slow ? T.slow + (tw.lv - 1) * 0.5 : 0, sp: T.kind === 'arrow' ? 460 : 340, a: tw.a });
  }
  /* --- proyectiles --- */
  for (const b of bullets) {
    if (b.k === 'ball') { b.t += dt; if (b.t >= b.dur) { b.dead = true; for (const f of foes) if (!f.dead && Math.hypot(f.x - b.ex, f.y - b.ey) < b.splash) damage(f, b.dmg); fxs.push({ k: 'ring', x: b.ex, y: b.ey, r: b.splash, life: 0.3, max: 0.3, col: '#ffb13d' }); k.burst(b.ex, b.ey, '#ffb13d', 10, 130); k.burst(b.ex, b.ey, '#6b5a4a', 6, 70); } continue; }
    if (b.tg.dead) { b.dead = true; continue; }
    const a = Math.atan2(b.tg.y - 6 * SC - b.y, b.tg.x - b.x); b.a = a; b.x += Math.cos(a) * b.sp * dt; b.y += Math.sin(a) * b.sp * dt;
    if (Math.hypot(b.tg.x - b.x, b.tg.y - 6 * SC - b.y) < 9) { b.dead = true; damage(b.tg, b.dmg);
      if (b.slow) { b.tg.slow = b.slow; fxs.push({ k: 'ring', x: b.tg.x, y: b.tg.y - 6, r: 16, life: 0.25, max: 0.25, col: '#bff0ff' }); k.burst(b.tg.x, b.tg.y - 6, '#bff0ff', 5, 60); }
      else k.burst(b.x, b.y, '#fff2c9', 4, 60); }
  }
  for (const f of foes) if (f.hp <= 0 && !f.dead) { f.dead = true; const gd = FT[f.ty].gold + Math.floor(wave / 3); gold += gd; score += f.ty === 'boss' ? 150 : 10;
    k.burst(f.x, f.y - 6, FT[f.ty].col || (f.ty === 'fast' ? '#ff9a3d' : '#c7d0da'), f.ty === 'boss' ? 30 : 12, 130); k.float('+' + gd, f.x, f.y - 20, '#ffd23d'); k.sfx(f.ty === 'boss' ? 'explode' : 'pop'); if (f.ty === 'boss') k.shake(6); }
  foes = foes.filter((f) => !f.dead); bullets = bullets.filter((b) => !b.dead);
  for (const e of fxs) e.life -= dt; fxs = fxs.filter((e) => e.life > 0);
  if (lives <= 0) { lives = 0; return k.lose(CFG.id, score, 'La base ha caído', `Oleada ${wave}`); }
  if (!spawnQ.length && !foes.length && between <= 0 && wave > 0) { between = 8; const bonus = 20 + wave * 5; score += wave * 20; gold += bonus; k.float(`¡Oleada superada! +${bonus}`, PX / 2, H / 2, '#ffd23d'); k.sfx('win'); }
}, draw);

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function coinIcon(x, y, r) { c.beginPath(); c.arc(x, y, r, 0, R2); ART.fillOut(c, '#ffc928', 1.8); c.beginPath(); c.arc(x, y, r * 0.55, 0, R2); c.strokeStyle = '#e39b00'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#fff6c2'; c.fillRect(x - r * 0.45, y - r * 0.5, r * 0.25, r * 0.55); }
/* torre: base + torreta orientada. Se dibuja a escala 40 px y se reduce con s */
function drawTower(x, y, t, lv, a, rec, s, ghost) {
  const T = TOWERS[t]; c.save(); c.translate(x, y); c.scale(s, s); if (ghost) c.globalAlpha = 0.55;
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 12, 17, 6, 0, 0, R2); c.fill();
  // base de piedra (hexagonal en el mapa hex)
  const baseCol = T.kind === 'ice' ? '#a9c9e6' : T.kind === 'arrow' ? '#b48a5e' : T.kind === 'zap' ? '#7d7690' : '#9a98ad';
  if (HEX) { hexPath(c, 0, 4, 17); ART.fillOut(c, baseCol, 2.5); hexPath(c, 0, 0, 15); c.fillStyle = 'rgba(255,255,255,.22)'; c.fill(); }
  else { ART.rr(c, -16, -12, 32, 26, 6); ART.fillOut(c, baseCol, 2.5); ART.rr(c, -16, -12, 32, 18, 6); c.fillStyle = 'rgba(255,255,255,.22)'; c.fill(); c.strokeStyle = 'rgba(26,21,48,.3)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, -12); c.lineTo(-8, 13); c.moveTo(6, -12); c.lineTo(6, 13); c.moveTo(-16, 3); c.lineTo(16, 3); c.stroke(); }
  // bandas de nivel
  for (let i = 0; i < lv; i++) { c.beginPath(); c.arc(-8 + i * 8, 10, 2.6, 0, R2); ART.fillOut(c, '#ffd23d', 1.4); }
  c.translate(0, -6); const bob = rec * 3;
  if (T.kind === 'arrow') { // ballesta de madera
    c.beginPath(); c.arc(0, 0, 10, 0, R2); ART.fillOut(c, '#8a5a33', 2); c.rotate(a); c.translate(-bob, 0);
    ART.rr(c, -6, -3, 20, 6, 2); ART.fillOut(c, '#c98a4b', 2);
    c.beginPath(); c.moveTo(9, -13 - lv); c.quadraticCurveTo(16, 0, 9, 13 + lv); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 2.5; c.strokeStyle = lv > 2 ? '#ffd23d' : '#e8d3a8'; c.stroke();
    c.strokeStyle = '#f4efe6'; c.lineWidth = 1; c.beginPath(); c.moveTo(9, -13 - lv); c.lineTo(2 - rec * 4, 0); c.lineTo(9, 13 + lv); c.stroke();
    if (rec < 0.5) { c.fillStyle = '#f4efe6'; c.fillRect(0, -1, 18, 2); c.fillStyle = '#ff5f7a'; c.fillRect(-1, -2, 4, 4); }
  } else if (T.kind === 'cannon') {
    c.beginPath(); c.arc(0, 0, 11, 0, R2); ART.fillOut(c, '#5d6275', 2.2); c.rotate(a); c.translate(-bob * 1.6, 0);
    ART.rr(c, -4, -5 - lv * 0.5, 22 + lv, 10 + lv, 3); ART.fillOut(c, '#3a3d4d', 2.2); ART.rr(c, 16 + lv, -6 - lv * 0.5, 5, 12 + lv, 2); ART.fillOut(c, lv > 2 ? '#ffd23d' : '#5d6275', 2);
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(0, -4, 14, 2); c.rotate(-a); c.beginPath(); c.arc(0, 0, 5, 0, R2); ART.fillOut(c, '#8a93a6', 1.6);
  } else if (T.kind === 'ice') { // cristales que laten
    const pl = 1 + Math.sin(tt * 4 + x) * 0.06 + rec * 0.15; c.scale(pl, pl);
    const cr = (dx, h, w, col) => { c.beginPath(); c.moveTo(dx, 4); c.lineTo(dx - w, -h * 0.55); c.lineTo(dx, -h); c.lineTo(dx + w, -h * 0.55); c.closePath(); ART.fillOut(c, col, 2); };
    cr(-7, 14, 4, '#9fe3ff'); cr(7, 13, 4, '#9fe3ff'); cr(0, 20 + lv * 2, 6, '#dff8ff'); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-1.5, -14 - lv * 2, 2, 9);
  } else { // bobina de rayos
    ART.rr(c, -7, -14, 14, 18, 3); ART.fillOut(c, '#6d7390', 2); c.strokeStyle = '#d98b3a'; c.lineWidth = 2.2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-7, -10 + i * 5); c.lineTo(7, -8 + i * 5); c.stroke(); }
    const gl = 0.5 + Math.sin(tt * 9 + x) * 0.25 + rec * 0.5; c.fillStyle = `rgba(255,236,120,${gl * 0.45})`; c.beginPath(); c.arc(0, -20, 10 + lv, 0, R2); c.fill();
    c.beginPath(); c.arc(0, -20, 5.5 + lv * 0.7, 0, R2); ART.fillOut(c, '#fff3a0', 2);
  }
  c.restore();
}
function drawFoe(f) {
  const T = FT[f.ty], s = SC, w = T.w * s, h = T.h * s, fy = f.y + 8 * s, fly = f.ty === 'fast';
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(f.x, fy, w * 0.42, 3.5 * s, 0, 0, R2); c.fill();
  const yy = fly ? fy - h - 6 * s + Math.sin(tt * 6 + f.ph) * 2 : fy - h;
  ART.enemy(c, T.art, f.x - w / 2, yy, w, h, { t: tt + f.ph, face: f.face, col: f.slow > 0 && T.col ? '#9fe3ff' : T.col });
  if (f.ty === 'boss') { c.beginPath(); const cx = f.x, cy = yy - 2; c.moveTo(cx - 9, cy + 4); c.lineTo(cx - 10, cy - 7); c.lineTo(cx - 4, cy - 2); c.lineTo(cx, cy - 9); c.lineTo(cx + 4, cy - 2); c.lineTo(cx + 10, cy - 7); c.lineTo(cx + 9, cy + 4); c.closePath(); ART.fillOut(c, '#ffd23d', 1.8); }
  if (f.slow > 0) { c.fillStyle = 'rgba(191,240,255,.9)'; for (let i = 0; i < 3; i++) { const a = tt * 2 + i * 2.1 + f.ph; c.fillRect(f.x + Math.cos(a) * w * 0.55 - 1.5, yy + h * 0.5 + Math.sin(a) * h * 0.3 - 1.5, 3, 3); } }
  if (f.hf > 0) { c.globalAlpha = 0.5; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(f.x, yy + h * 0.55, w * 0.45, h * 0.45, 0, 0, R2); c.fill(); c.globalAlpha = 1; }
  if (f.hp < f.max) { const bw = f.ty === 'boss' ? 36 : 22, bx = f.x - bw / 2, by = yy - (f.ty === 'boss' ? 14 : 8), q = Math.max(0, f.hp / f.max);
    c.fillStyle = OUT; c.fillRect(bx - 1.5, by - 1.5, bw + 3, 6); c.fillStyle = '#4a1f2a'; c.fillRect(bx, by, bw, 3); c.fillStyle = q > 0.5 ? '#7cf06a' : q > 0.25 ? '#ffd23d' : '#ff5f5f'; c.fillRect(bx, by, bw * q, 3); }
}
function button(b, sub) {
  ART.rr(c, b.x, b.y, b.w, b.h, 8); ART.fillOut(c, !b.on ? '#5d5870' : b.red ? '#e0564a' : '#5bc85a', 2.2);
  ART.rr(c, b.x + 3, b.y + 2, b.w - 6, b.h * 0.4, 5); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill();
  if (b.cost != null) { label(b.txt, b.x + 6, b.y + b.h / 2, 11, '#fff'); label(String(b.cost), b.x + b.w - 6, b.y + b.h / 2, 11, '#fff6c2', 'right'); coinIcon(b.x + b.w - 12 - c.measureText(String(b.cost)).width, b.y + b.h / 2, 5); }
  else label(b.txt, b.x + b.w / 2, b.y + b.h / 2, 11, '#fff', 'center');
}
function draw() {
  c.drawImage(bg, 0, 0, W, H);
  // ruta viva en el laberinto (se recalcula al construir)
  if (M === 'maze') {
    const route = (pp, col, lw, dash) => { c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = col; c.lineWidth = lw; c.setLineDash(dash || []); c.lineDashOffset = -tt * 30; c.beginPath(); pp.map(center).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.setLineDash([]); };
    route(path, 'rgba(160,110,60,.35)', CELL * 0.55); route(path, 'rgba(255,245,210,.85)', 3, [2, 10]);
    if (preview && preview.np) route(preview.np, 'rgba(255,210,60,.9)', 3, [8, 6]);
  }
  // casilla seleccionada, alcance y fantasma de construcción
  if (sel) { const [cx, cy] = center(sel), tw = towerAt(...sel), free = grid[sel[1]][sel[0]] === 0, ok = tw || (preview && preview.ok);
    const r = tw ? stat(tw).r : TOWERS[pick].r * SC;
    if (tw || free) { c.fillStyle = ok ? 'rgba(255,255,255,.12)' : 'rgba(255,80,80,.12)'; c.beginPath(); c.arc(cx, cy, r, 0, R2); c.fill(); c.strokeStyle = ok ? 'rgba(255,255,255,.7)' : 'rgba(255,100,100,.7)'; c.lineWidth = 2; c.setLineDash([6, 5]); c.lineDashOffset = -tt * 20; c.stroke(); c.setLineDash([]); }
    c.strokeStyle = !tw && !free ? 'rgba(255,90,90,.9)' : '#fff'; c.lineWidth = 2.5; if (HEX) { hexPath(c, cx, cy, HR - 1.5); c.stroke(); } else { ART.rr(c, cx - S / 2 + 2, cy - S / 2 + 2, S - 4, S - 4, 6); c.stroke(); }
    if (free && !tw) drawTower(cx, cy, pick, 1, -1.2, 0, SC, true); }
  else if (kbd) { const [cx, cy] = center(cur); c.strokeStyle = '#fff'; c.lineWidth = 2; if (HEX) hexPath(c, cx, cy, HR - 2); else ART.rr(c, cx - S / 2 + 2, cy - S / 2 + 2, S - 4, S - 4, 6); c.stroke(); }
  // torres y enemigos ordenados por profundidad
  const list = towers.map((tw) => { const [x, y] = center([tw.x, tw.y]); return { y, d: () => { const p = tw.pop > 0 ? 1 + Math.sin(tw.pop / 0.3 * Math.PI) * 0.18 : 1; drawTower(x, y, tw.t, tw.lv, tw.a, tw.rec, SC * p); } }; });
  for (const f of foes) list.push({ y: f.y + 1, d: () => drawFoe(f) });
  list.sort((a, b) => a.y - b.y).forEach((o) => o.d());
  // proyectiles
  for (const b of bullets) {
    if (b.k === 'ball') { const q = b.t / b.dur, x = b.sx + (b.ex - b.sx) * q, y = b.sy + (b.ey - b.sy) * q, hh = Math.sin(q * Math.PI) * 30 * SC;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + 6, 4, 2, 0, 0, R2); c.fill(); c.beginPath(); c.arc(x, y - hh, 4.5, 0, R2); ART.fillOut(c, '#3a3d4d', 1.8); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x - 2, y - hh - 2.5, 1.8, 1.8); }
    else if (b.k === 'arrow') { c.save(); c.translate(b.x, b.y); c.rotate(b.a); c.strokeStyle = OUT; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-9, 0); c.lineTo(5, 0); c.stroke(); c.strokeStyle = '#f4efe6'; c.lineWidth = 1.5; c.stroke(); c.beginPath(); c.moveTo(8, 0); c.lineTo(3, -3); c.lineTo(3, 3); c.closePath(); ART.fillOut(c, '#c7d0da', 1); c.fillStyle = '#ff5f7a'; c.fillRect(-10, -2, 4, 4); c.restore(); }
    else { c.save(); c.translate(b.x, b.y); c.rotate(b.a + tt * 10); c.beginPath(); c.moveTo(6, 0); c.lineTo(0, -3.5); c.lineTo(-6, 0); c.lineTo(0, 3.5); c.closePath(); ART.fillOut(c, '#dff8ff', 1.5); c.restore(); }
  }
  // efectos
  for (const e of fxs) { const q = e.life / e.max;
    if (e.k === 'ring') { c.globalAlpha = q; c.strokeStyle = e.col; c.lineWidth = 3; c.beginPath(); c.arc(e.x, e.y, e.r * (1.1 - q * 0.6), 0, R2); c.stroke(); c.globalAlpha = 1; }
    else if (e.k === 'puff') { c.globalAlpha = q * 0.8; c.fillStyle = '#e8e2d6'; c.beginPath(); c.arc(e.x, e.y, 8 * (1.4 - q), 0, R2); c.fill(); c.globalAlpha = 1; }
    else if (e.k === 'bolt') { c.globalAlpha = q; for (const [lw, col] of [[6, 'rgba(255,230,90,.5)'], [2.2, '#fffbe0']]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (let i = 0; i < e.pts.length - 1; i++) { const [ax, ay] = e.pts[i], [bx, by] = e.pts[i + 1]; if (!i) c.moveTo(ax, ay); for (let j = 1; j <= 4; j++) { const u = j / 4; c.lineTo(ax + (bx - ax) * u + (j < 4 ? (rnd(i * 9 + j + Math.floor(tt * 30)) - 0.5) * 12 : 0), ay + (by - ay) * u + (j < 4 ? (rnd(i * 5 + j + Math.floor(tt * 30) + 3) - 0.5) * 12 : 0)); } } c.stroke(); } c.globalAlpha = 1; }
  }
  // botones flotantes
  for (const b of popup()) button(b);
  // HUD superior (esquinas; el centro es de pausa/sonido)
  coinIcon(18, 20, 9); label(String(gold), 32, 20, 18, '#ffd23d');
  ART.heart(c, 104, 21, 1.35, true); label(String(lives), 118, 20, 18, '#fff');
  label('Oleada ' + wave, 380, 20, 16, '#fff'); label(score + ' pts', PX - 6, 20, 16, '#bdf5a0', 'right');
  // panel de torres
  TOWERS.forEach((T, i) => { const y = OY + 6 + i * 62, on = pick === i, can = gold >= T.cost;
    ART.rr(c, PX + 7, y, W - PX - 12, 56, 9); ART.fillOut(c, on ? '#f2d15c' : '#5a4636', on ? 3 : 2); if (on) { ART.rr(c, PX + 10, y + 3, W - PX - 18, 20, 7); c.fillStyle = 'rgba(255,255,255,.3)'; c.fill(); }
    if (!can) c.globalAlpha = 0.45; drawTower(PX + 26, y + 36, i, 1, -0.7, 0, 0.55); c.globalAlpha = 1;
    coinIcon(PX + 51, y + 27, 6); label(String(T.cost), PX + 51, y + 44, 12, can ? '#fff6c2' : '#ff9a9a', 'center');
    c.font = '800 10px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.fillStyle = on ? '#3a2b22' : '#e8d9c4'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(T.n, PX + 7 + (W - PX - 12) / 2, y + 10); });
  // botón de oleada
  const wb = { x: PX + 7, y: H - 56, w: W - PX - 12, h: 50 }, ready = between > 0;
  ART.rr(c, wb.x, wb.y, wb.w, wb.h, 10); ART.fillOut(c, ready ? '#e0564a' : '#4a3b30', 2.5);
  if (ready) { ART.rr(c, wb.x + 3, wb.y + 3, wb.w - 6, 16, 7); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill();
    c.beginPath(); c.moveTo(wb.x + 14, wb.y + 14); c.lineTo(wb.x + 26, wb.y + 21); c.lineTo(wb.x + 14, wb.y + 28); c.closePath(); ART.fillOut(c, '#fff', 1.5);
    label(String(Math.ceil(between)), wb.x + 50, wb.y + 21, 16, '#fff', 'center'); label(wave ? 'Siguiente' : 'Empezar', wb.x + wb.w / 2, wb.y + 39, 10, '#ffe0d0', 'center');
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2.5; c.beginPath(); c.arc(wb.x + 50, wb.y + 21, 11, -Math.PI / 2, -Math.PI / 2 + R2 * (between / (wave ? 8 : 4))); c.stroke(); }
  else { label('En curso', wb.x + wb.w / 2, wb.y + 18, 11, '#e8d9c4', 'center'); const n = spawnQ.length + foes.length; label(n + ' enem.', wb.x + wb.w / 2, wb.y + 35, 11, '#ffb3a8', 'center'); }
  // aviso de oleada
  if (banner) { const q = banner.t, x = q > 2.1 ? PX / 2 + (q - 2.1) / 0.3 * -PX : q < 0.3 ? PX / 2 + (0.3 - q) / 0.3 * PX : PX / 2;
    c.globalAlpha = Math.min(1, q / 0.3, (2.4 - q) / 0.2 + 0.2); ART.rr(c, x - 130, 150, 260, 60, 14); ART.fillOut(c, wave % 5 === 0 ? '#8a2b3a' : '#2d2442', 3);
    label(banner.head, x, 170, 24, wave % 5 === 0 ? '#ffd23d' : '#fff', 'center'); label(banner.sub, x, 195, 12, '#d8d0f0', 'center'); c.globalAlpha = 1; }
  if (msg) { c.globalAlpha = Math.min(1, msg.life / 0.3); label(msg.t, PX / 2, H - 20, 15, '#ffb3a8', 'center'); c.globalAlpha = 1; }
}
