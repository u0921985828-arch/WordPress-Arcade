/* Serpiente en cuadrícula con arte propio (ART): cuerpo continuo interpolado con cola afilada y bocados que recorren el cuerpo,
 * manzanas (normales, doradas con tiempo, arándanos que frenan), combos, niveles con tema nuevo y rocas colocadas sin
 * dejar zonas aisladas ni callejones, velocidad progresiva. Control: deslizar (en cualquier momento del arrastre),
 * tocar a un lado de la cabeza, flechas/WASD o mando. Récord con el id del juego (migra el antiguo 'serpent-grid-best'). */
const OUT = ART.OUT, R2 = 6.2832, ID = CFG.id || 'serpent-grid';
/* disposición: vertical 360×640 (tablero 14×23) u horizontal 640×360 (26×13); franja superior para el marcador */
const PORT = innerHeight > innerWidth, CS = 24;
const COLS = PORT ? 14 : 26, ROWS = PORT ? 23 : 13, W = PORT ? 360 : 640, H = PORT ? 640 : 360;
const X0 = (W - COLS * CS) / 2, Y0 = PORT ? 62 : 40, NEED = 8;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#16241b' }), c = k.ctx;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const THM = [
  { name: 'Pradera', a: '#8fd16a', b: '#84c760', tuft: '#6fb64e', edge: '#3f8a3a', edgeD: '#2c6a2c', rock: '#a3a8bd', rockD: '#727790', bg: ['#27402c', '#16241b'] },
  { name: 'Desierto', a: '#ecd79c', b: '#e3cc8c', tuft: '#cfae66', edge: '#c08a45', edgeD: '#8e6230', rock: '#c98a4b', rockD: '#8a5a33', bg: ['#5a3f28', '#2e2016'] },
  { name: 'Nieve', a: '#e6f2fb', b: '#d9e9f6', tuft: '#bcd4ea', edge: '#86a9d0', edgeD: '#5d7ea8', rock: '#8fa6c9', rockD: '#5f7599', bg: ['#34496b', '#1b2638'] },
  { name: 'Crepúsculo', a: '#8a78b8', b: '#7f6dad', tuft: '#6d5b9a', edge: '#56346a', edgeD: '#3a2148', rock: '#c3a0ff', rockD: '#8f63d6', bg: ['#2e1d36', '#170e1d'] },
  { name: 'Selva', a: '#5fb679', b: '#56ab6f', tuft: '#46965c', edge: '#2c7d52', edgeD: '#1d5a39', rock: '#9a8a66', rockD: '#6a5c44', bg: ['#1f4a33', '#0f2619'] },
];
const SK = { body: '#ffb13d', dark: '#e0762a', light: '#ffe39a' };
let snake, prev, dir, queue, foods, rocks, score, level, eaten, acc, step, t, grow, bulges, dying, combo, lastEat, slowT, bannerT, floorCv, rockCv, th, anchor, swiped, eatenTotal;
try { const o = +localStorage.getItem('serpent-grid-best') || 0; if (o) k.best(ID, o); } catch (e) { /* sin almacenamiento */ }

/* ---------- utilidades ---------- */
const cx = (x) => X0 + x * CS + CS / 2, cy = (y) => Y0 + y * CS + CS / 2;
const rockAt = (x, y) => rocks.some((r) => r.x === x && r.y === y);
const onSnake = (x, y) => snake.some((s) => s.x === x && s.y === y);
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const rnd = (q) => { const x = Math.sin(q * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* ---------- arte cacheado: fondo, tablero y roca ---------- */
function renderFloor() {
  return off(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, th.bg[0]); gr.addColorStop(1, th.bg[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(rnd(i) * W, rnd(i + 50) * H, 2 + rnd(i + 9) * 5, 0, R2); g.fill(); }
    // seto / muro alrededor con volumen
    const bw = COLS * CS, bh = ROWS * CS;
    ART.rr(g, X0 - 9, Y0 - 9, bw + 18, bh + 22, 14); ART.fillOut(g, th.edgeD, 3);
    ART.rr(g, X0 - 9, Y0 - 9, bw + 18, bh + 16, 14); ART.fillOut(g, th.edge, 3);
    g.fillStyle = 'rgba(255,255,255,.18)'; ART.rr(g, X0 - 5, Y0 - 7, bw + 10, 4, 2); g.fill();
    // casillas en damero con brillo superior
    g.save(); ART.rr(g, X0, Y0, bw, bh, 6); g.clip();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      g.fillStyle = (x + y) % 2 ? th.b : th.a; g.fillRect(X0 + x * CS, Y0 + y * CS, CS, CS);
      if (rnd(x * 31 + y * 7 + level) < 0.18) { g.strokeStyle = th.tuft; g.lineWidth = 1.6; g.lineCap = 'round'; const px = X0 + x * CS + 6 + rnd(x + y * 3) * 12, py = Y0 + y * CS + 16; g.beginPath(); g.moveTo(px - 3, py - 4); g.lineTo(px - 1, py); g.moveTo(px, py - 6); g.lineTo(px, py); g.moveTo(px + 3, py - 4); g.lineTo(px + 1, py); g.stroke(); }
    }
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(X0, Y0, bw, 5); g.fillRect(X0, Y0, 4, bh);
    g.restore();
    ART.rr(g, X0, Y0, bw, bh, 6); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
  });
}
function renderRock() {
  return off(CS + 8, CS + 8, (g) => {
    g.translate((CS + 8) / 2, (CS + 8) / 2);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(1, 9, 11, 4, 0, 0, R2); g.fill();
    const shape = () => { g.beginPath(); g.moveTo(-11, 7); g.lineTo(-12, -1); g.lineTo(-7, -9); g.lineTo(2, -11); g.lineTo(10, -6); g.lineTo(12, 3); g.lineTo(9, 8); g.closePath(); };
    shape(); g.fillStyle = th.rock; g.fill();
    g.save(); shape(); g.clip(); g.fillStyle = th.rockD; g.beginPath(); g.moveTo(-12, 8); g.lineTo(12, 8); g.lineTo(12, -1); g.lineTo(3, 3); g.lineTo(-6, 2); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(-7, -7); g.lineTo(1, -9); g.lineTo(-2, -5); g.lineTo(-8, -3); g.closePath(); g.fill(); g.restore();
    shape(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke();
    g.strokeStyle = 'rgba(26,21,48,.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(3, 3); g.lineTo(6, -3); g.stroke();
  });
}
function apple(x, y, s, kind) {
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, 9, 8 * s, 3 * s, 0, 0, R2); c.fill();
  c.scale(s, s);
  if (kind === 'berry') {
    for (const [bx, by] of [[-4, 2], [4, 2], [0, -4]]) { c.beginPath(); c.arc(bx, by, 5.2, 0, R2); ART.fillOut(c, '#4a7dff', 1.8); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(bx - 1.6, by - 1.8, 1.5, 0, R2); c.fill(); }
    c.beginPath(); c.ellipse(4, -9, 5, 2.4, -0.5, 0, R2); ART.fillOut(c, '#5ccf5a', 1.6);
  } else {
    const col = kind === 'gold' ? '#ffc928' : '#ff4d5e';
    c.beginPath(); c.moveTo(0, -6); c.bezierCurveTo(6, -11, 12, -4, 9, 4); c.bezierCurveTo(7, 10, 2, 10, 0, 8); c.bezierCurveTo(-2, 10, -7, 10, -9, 4); c.bezierCurveTo(-12, -4, -6, -11, 0, -6); ART.fillOut(c, col, 2);
    c.fillStyle = kind === 'gold' ? '#fff6c2' : 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-4.5, -2, 2, 3.2, 0.4, 0, R2); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -6); c.lineTo(1, -11); c.stroke();
    c.beginPath(); c.ellipse(5, -10, 4.5, 2.2, -0.4, 0, R2); ART.fillOut(c, '#5ccf5a', 1.6);
  }
  c.restore();
}
function sparkle(x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -5); c.lineTo(1.2, -1.2); c.lineTo(5, 0); c.lineTo(1.2, 1.2); c.lineTo(0, 5); c.lineTo(-1.2, 1.2); c.lineTo(-5, 0); c.lineTo(-1.2, -1.2); c.closePath(); c.fill(); c.restore(); }

/* ---------- nivel: tema y rocas sin zonas aisladas ni callejones ---------- */
function freeOk() {
  const blk = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || rockAt(x, y);
  let total = 0, start = null;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!blk(x, y)) {
    total++; if (!start) start = [x, y];
    let n = 0; for (const d of Object.values(DIRS)) if (!blk(x + d[0], y + d[1])) n++;
    if (n < 2) return false;
  }
  const seen = new Set([start.join()]), q = [start];
  while (q.length) { const [x, y] = q.pop(); for (const d of Object.values(DIRS)) { const nx = x + d[0], ny = y + d[1], key = nx + ',' + ny; if (!blk(nx, ny) && !seen.has(key)) { seen.add(key); q.push([nx, ny]); } } }
  return seen.size === total;
}
function buildLevel() {
  th = THM[(level - 1) % THM.length]; floorCv = renderFloor(); rockCv = renderRock();
  rocks = []; const n = Math.min(3 * (level - 1), Math.floor(COLS * ROWS * 0.1)), h = snake[0], d = DIRS[dir];
  for (let tries = 0; rocks.length < n && tries < 400; tries++) {
    const x = k.ri(0, COLS - 1), y = k.ri(0, ROWS - 1);
    if (onSnake(x, y) || rockAt(x, y) || foods.some((f) => f.x === x && f.y === y)) continue;
    if (Math.abs(x - h.x) + Math.abs(y - h.y) < 3) continue;
    let ahead = false; for (let i = 1; i <= 6; i++) if (h.x + d[0] * i === x && h.y + d[1] * i === y) ahead = true;
    if (ahead) continue;
    const r = { x, y, pop: -rocks.length * 0.06 }; rocks.push(r);
    if (!freeOk()) rocks.pop();
  }
}
function spawnFood(kind, life) {
  const free = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!onSnake(x, y) && !rockAt(x, y) && !foods.some((f) => f.x === x && f.y === y)) free.push([x, y]);
  if (!free.length) return;
  const [x, y] = k.pick(free); foods.push({ x, y, kind, life: life || 0, max: life || 0, pop: 0 });
}

function reset() {
  level = 1; score = 0; eaten = 0; eatenTotal = 0; t = 0; combo = 0; lastEat = -9; slowT = 0; dying = 0; bulges = []; queue = []; grow = 0; bannerT = 0;
  dir = PORT ? 'up' : 'right'; const d = DIRS[dir], sx = PORT ? Math.floor(COLS / 2) : 6, sy = PORT ? ROWS - 6 : Math.floor(ROWS / 2);
  snake = []; for (let i = 0; i < 4; i++) snake.push({ x: sx - d[0] * i, y: sy - d[1] * i });
  prev = snake.map((s) => ({ x: s.x - d[0], y: s.y - d[1] }));
  step = 0.15; acc = step * 0.999; foods = []; rocks = [];
  buildLevel(); spawnFood('apple');
}

/* ---------- control ---------- */
function turn(nd) {
  const last = queue.length ? queue[queue.length - 1] : dir, a = DIRS[nd], b = DIRS[last];
  if (nd === last || (a[0] === -b[0] && a[1] === -b[1]) || queue.length >= 2) return;
  queue.push(nd); k.sfx('click');
}
function input() {
  for (const n of ['up', 'down', 'left', 'right']) if (k.hit.has(n)) turn(n);
  const p = k.ptr;
  if (p.hit) { anchor = [p.x, p.y]; swiped = false; }
  if (p.down && anchor) {
    const dx = p.x - anchor[0], dy = p.y - anchor[1];
    if (Math.max(Math.abs(dx), Math.abs(dy)) * k.scale > 22) { turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); anchor = [p.x, p.y]; swiped = true; }
  }
  // toque sin deslizar: girar hacia el lado de la cabeza donde se toca
  if (p.up && !swiped && anchor) {
    const last = queue.length ? queue[queue.length - 1] : dir, hx = cx(snake[0].x), hy = cy(snake[0].y);
    if (last === 'up' || last === 'down') turn(p.x < hx ? 'left' : 'right'); else turn(p.y < hy ? 'up' : 'down');
  }
  if (p.up) anchor = null;
}

/* ---------- lógica ---------- */
function die() {
  dying = 1; k.sfx('hurt'); k.shake(9); k.flash('rgba(255,60,80,.3)'); queue = [];
  const h = snake[0]; k.burst(cx(h.x), cy(h.y), '#fff', 14, 180); k.burst(cx(h.x), cy(h.y), SK.body, 10, 140);
}
function eat(f) {
  const x = cx(f.x), y = cy(f.y);
  combo = t - lastEat < 3 ? Math.min(combo + 1, 5) : 1; lastEat = t;
  const base = f.kind === 'gold' ? 50 : f.kind === 'berry' ? 20 : 10, pts = base * combo;
  score += pts; bulges.push({ d: 0 });
  k.float(combo > 1 ? `+${pts}  x${combo}` : `+${pts}`, x, y - 16, f.kind === 'gold' ? '#ffd23d' : combo > 1 ? '#7cf7a0' : '#fff');
  if (f.kind === 'apple') {
    grow += 1; eaten++; eatenTotal++; k.sfx('pop'); k.burst(x, y, '#ff4d5e', 10, 120);
    spawnFood('apple');
    if (!foods.some((q) => q.kind !== 'apple')) { const r = Math.random(); if (r < 0.2) spawnFood('gold', 7); else if (level > 1 && r < 0.34) spawnFood('berry', 8); }
  } else if (f.kind === 'gold') { grow += 2; k.sfx('coin'); k.burst(x, y, '#ffd23d', 18, 170); k.flash('rgba(255,220,90,.18)'); }
  else { slowT = 5; k.sfx('coin'); k.burst(x, y, '#4a7dff', 14, 150); k.float('Más lento', x, y - 36, '#9fc0ff'); }
  if (eaten >= NEED) {
    level++; eaten = 0; bannerT = 2; k.sfx('win'); k.confetti(); k.flash('rgba(255,255,255,.35)');
    buildLevel(); foods = foods.filter((q) => !rockAt(q.x, q.y)); if (!foods.some((q) => q.kind === 'apple')) spawnFood('apple');
  }
}
function tick() {
  if (queue.length) dir = queue.shift();
  const h = snake[0], d = DIRS[dir], nx = h.x + d[0], ny = h.y + d[1];
  const tailMoves = grow === 0, self = snake.some((s, i) => s.x === nx && s.y === ny && !(tailMoves && i === snake.length - 1));
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || rockAt(nx, ny) || self) return die();
  const old = snake.map((s) => ({ x: s.x, y: s.y }));
  snake.unshift({ x: nx, y: ny });
  if (grow > 0) { grow--; old.push({ ...old[old.length - 1] }); } else snake.pop();
  prev = old;
  const fi = foods.findIndex((f) => f.x === nx && f.y === ny);
  if (fi >= 0) { const f = foods[fi]; foods.splice(fi, 1); eat(f); }
}
function update(dt) {
  t += dt; bannerT = Math.max(0, bannerT - dt);
  for (const r of rocks) r.pop = Math.min(1, r.pop + dt * 3);
  for (const f of foods) f.pop = Math.min(1, f.pop + dt * 4);
  if (dying > 0) { dying -= dt; if (dying <= 0) k.lose(ID, score, 'Fin', `Nivel ${level} · Longitud ${snake.length}`); return; }
  input();
  for (let i = foods.length - 1; i >= 0; i--) { const f = foods[i]; if (f.max && (f.life -= dt) <= 0) { k.burst(cx(f.x), cy(f.y), '#fff', 8, 80); foods.splice(i, 1); } }
  slowT = Math.max(0, slowT - dt);
  step = Math.max(0.062, 0.15 - (level - 1) * 0.011 - eaten * 0.0012) * (slowT > 0 ? 1.45 : 1);
  for (const b of bulges) b.d += dt / step; bulges = bulges.filter((b) => b.d < snake.length + 1);
  acc += dt; if (acc >= step) { acc -= step; if (acc > step) acc = 0; tick(); }
}

/* ---------- dibujo de la serpiente ---------- */
function snakePath(f) {
  const n = snake.length, L = (a, b) => a + (b - a) * f;
  const pts = [[L(cx(prev[0].x), cx(snake[0].x)), L(cy(prev[0].y), cy(snake[0].y))]];
  for (let i = 1; i < n; i++) pts.push([cx(snake[i].x), cy(snake[i].y)]);
  pts.push([L(cx(prev[n - 1].x), cx(snake[n - 1].x)), L(cy(prev[n - 1].y), cy(snake[n - 1].y))]);
  return pts;
}
function drawSnake() {
  const f = dying > 0 ? 1 : k.clamp(acc / step, 0, 1), pts = snakePath(f), R = CS * 0.4;
  // muestras cada 3 px a lo largo del recorrido
  const S = []; let acum = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay);
    for (let s = 0; s < len; s += 3) S.push([ax + (bx - ax) * s / len, ay + (by - ay) * s / len, acum + s]);
    acum += len;
  }
  const last = pts[pts.length - 1]; S.push([last[0], last[1], acum]);
  const total = acum;
  const rad = (d) => {
    let r = R * Math.min(1, 0.35 + 0.65 * (total - d) / (CS * 2.2));
    for (const b of bulges) { const q = Math.abs(d - b.d * CS); if (q < CS) r *= 1 + 0.32 * (1 - q / CS); }
    return r;
  };
  const flashOn = dying > 0 && Math.floor(dying * 12) % 2;
  const pass = (col, extra, ox, oy, sc) => { c.fillStyle = col; c.beginPath(); for (const [x, y, d] of S) { const r = rad(d) * (sc || 1) + extra; c.moveTo(x + ox + r, y + oy); c.arc(x + ox, y + oy, r, 0, R2); } c.fill(); };
  c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); for (const [x, y, d] of S) { const r = rad(d); c.moveTo(x + 2 + r, y + 5); c.arc(x + 2, y + 5, r, 0, R2); } c.fill();
  pass(OUT, 2.4, 0, 0); pass(flashOn ? '#fff' : SK.body, 0, 0, 0);
  // bandas del cuerpo ancladas a la cola (se mueven con él)
  c.fillStyle = SK.dark;
  for (let d = total - CS * 0.6; d > CS * 0.9; d -= CS * 0.62) {
    const s = S[Math.min(S.length - 1, Math.round(d / 3))]; if (!s) continue; const r = rad(d);
    c.beginPath(); c.ellipse(s[0], s[1], r * 0.42, r * 0.42, 0, 0, R2); c.fill();
  }
  pass('rgba(255,255,255,.3)', 0, -R * 0.25, -R * 0.35, 0.38);
  // cabeza
  const [hx, hy] = pts[0], nk = pts[1], ang = Math.atan2(hy - nk[1], hx - nk[0]) || (DIRS[dir][1] ? DIRS[dir][1] * 1.5708 : DIRS[dir][0] < 0 ? Math.PI : 0);
  const fr = foods.some((q) => q.x === snake[0].x + DIRS[dir][0] && q.y === snake[0].y + DIRS[dir][1]);
  c.save(); c.translate(hx, hy); c.rotate(ang);
  const sq = 1 + (bulges.length && bulges[bulges.length - 1].d < 0.6 ? 0.12 : 0);
  c.scale(sq, 1 / sq);
  if (!dying && Math.sin(t * 3.1) > 0.93) { c.strokeStyle = '#ff4d6d'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(R + 5, 0); c.lineTo(R + 13, 0); c.lineTo(R + 16, -3); c.moveTo(R + 13, 0); c.lineTo(R + 16, 3); c.stroke(); }
  c.beginPath(); c.ellipse(2, 0, R * 1.4, R * 1.2, 0, 0, R2); ART.fillOut(c, flashOn ? '#fff' : SK.body, 2.4);
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-1, -R * 0.55, R * 0.7, R * 0.28, 0, 0, R2); c.fill();
  if (fr && !dying) { c.fillStyle = OUT; c.beginPath(); c.ellipse(R * 1.05, 0, 3.5, 4.5, 0, 0, R2); c.fill(); c.fillStyle = '#ff6b7a'; c.beginPath(); c.ellipse(R * 1.05, 1, 2, 2.2, 0, 0, R2); c.fill(); }
  else { c.fillStyle = OUT; c.beginPath(); c.arc(R * 1.1, -2.5, 1, 0, R2); c.arc(R * 1.1, 2.5, 1, 0, R2); c.fill(); }
  const blink = !dying && (t % 3.3) < 0.12;
  for (const s of [-1, 1]) {
    const ex = 2, ey = s * R * 0.62;
    if (dying) { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(ex - 3, ey - 3); c.lineTo(ex + 3, ey + 3); c.moveTo(ex + 3, ey - 3); c.lineTo(ex - 3, ey + 3); c.stroke(); continue; }
    if (blink) { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(ex - 3.5, ey); c.lineTo(ex + 3.5, ey); c.stroke(); continue; }
    c.beginPath(); c.arc(ex, ey, 4.4, 0, R2); ART.fillOut(c, '#fff', 1.8);
    c.fillStyle = OUT; c.beginPath(); c.arc(ex + 1.6, ey, 2.3, 0, R2); c.fill(); c.fillStyle = '#fff'; c.fillRect(ex + 1.6, ey - 1.8, 1.2, 1.2);
  }
  c.restore();
}
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function draw() {
  c.drawImage(floorCv, 0, 0, W, H);
  for (const r of rocks) { if (r.pop <= 0) continue; const s = r.pop < 1 ? 1 + Math.sin(r.pop * Math.PI) * 0.3 : 1, sz = (CS + 8) * s * Math.min(1, r.pop * 2); c.drawImage(rockCv, cx(r.x) - sz / 2, cy(r.y) - sz / 2 + 1, sz, sz); }
  for (const f of foods) {
    if (f.max && f.life < 2 && Math.floor(f.life * 8) % 2) continue;
    const x = cx(f.x), y = cy(f.y), s = f.pop < 1 ? Math.sin(f.pop * 2.1) * 1.15 : 1 + Math.sin(t * 5 + f.x) * 0.05;
    if (f.max) { c.strokeStyle = f.kind === 'gold' ? 'rgba(255,210,61,.85)' : 'rgba(120,160,255,.85)'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, 13, -1.5708, -1.5708 + R2 * f.life / f.max); c.stroke(); }
    apple(x, y + Math.sin(t * 4 + f.y) * 1.2, Math.max(0.01, s * 0.95), f.kind);
    if (f.kind === 'gold') sparkle(x + 8 * Math.cos(t * 3), y - 8 + 4 * Math.sin(t * 3), 0.6 + 0.4 * Math.abs(Math.sin(t * 6)));
  }
  drawSnake();
  // marcador: puntos arriba a la izquierda, nivel y progreso arriba a la derecha (centro libre para pausa/sonido)
  const hy = PORT ? 16 : 8;
  apple(20, hy + 13, 0.9, 'apple'); label(`${score}`, 36, hy + 2, 22, '#fff');
  const rx = W - 12; label(`Nivel ${level}`, rx, hy - 2, 15, '#fff', 'right');
  for (let i = 0; i < NEED; i++) { const px = rx - (NEED - 1 - i) * 11 - 4; c.beginPath(); c.arc(px, hy + 24, 4, 0, R2); ART.fillOut(c, i < eaten ? '#ff4d5e' : 'rgba(255,255,255,.18)', 1.5); }
  if (PORT) label(`Récord ${Math.max(k.best(ID, 0), score)}`, 14, hy + 30, 11, 'rgba(255,255,255,.7)');
  if (slowT > 0) { const x = PORT ? W - 12 : W - 110; label('Lento', PORT ? x : x, PORT ? hy + 32 : hy + 2, 11, '#9fc0ff', 'right'); }
  if (combo > 1 && t - lastEat < 3) { const a = 1 - (t - lastEat) / 3; c.globalAlpha = a; label(`Combo x${combo}`, PORT ? W / 2 : W / 2 + 90, PORT ? H - 24 : hy + 4, 14, '#7cf7a0', 'center'); c.globalAlpha = 1; }
  if (bannerT > 0) {
    const a = Math.min(1, bannerT * 2), s = 1 + Math.max(0, bannerT - 1.7) * 1.5; c.globalAlpha = a;
    c.save(); c.translate(W / 2, Y0 + ROWS * CS / 2); c.scale(s, s);
    c.font = '800 24px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const txt = `Nivel ${level} · ${th.name}`, mw = c.measureText(txt).width + 40;
    ART.rr(c, -mw / 2, -24, mw, 48, 14); c.fillStyle = 'rgba(26,21,48,.85)'; c.fill(); label(txt, 0, -13, 24, '#fff', 'center');
    c.restore(); c.globalAlpha = 1;
  }
}

reset();
k.show(CFG.title || 'Serpent Grid', 'Come manzanas para crecer. Las doradas valen más y los arándanos te frenan. Cada 8 manzanas, nivel nuevo con rocas. Desliza, toca a un lado de la cabeza o usa las flechas.<br>Toca para empezar');
k.run((dt) => { if (!k.gate(reset)) { t += dt; for (const f of foods) f.pop = Math.min(1, f.pop + dt * 4); return; } update(dt); }, draw);
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
