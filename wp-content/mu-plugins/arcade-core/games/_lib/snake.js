/* Serpiente en cuadrícula con arte propio (ART): cuerpo continuo interpolado con cola afilada y bocados que recorren el cuerpo,
 * manzanas (normales, doradas con tiempo, arándanos que frenan), combos, niveles con tema nuevo y rocas colocadas sin
 * dejar zonas aisladas ni callejones, velocidad progresiva. Control: deslizar (en cualquier momento del arrastre),
 * tocar a un lado de la cabeza, flechas/WASD o mando. Récord con el id del juego (migra el antiguo 'serpent-grid-best'). */
const OUT = ART.OUT, R2 = 6.2832, ID = CFG.id || 'serpent-grid';
/* disposición: vertical 360×640 (tablero 14×23) u horizontal 640×360 (26×13); franja superior para el marcador */
/* CFG.mode 'mp' (Serpientes Hambrientas): siempre horizontal, tablero 28×14 de 22 px, hasta 4 serpientes (ver snakeMP al final) */
const MP = CFG.mode === 'mp', PORT = !MP && innerHeight > innerWidth, CS = MP ? 22 : 24;
const COLS = MP ? 28 : PORT ? 14 : 26, ROWS = MP ? 14 : PORT ? 23 : 13, W = PORT ? 360 : 640, H = PORT ? 640 : 360;
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
  rocks = []; const n = Math.min(2 * (level - 1), Math.floor(COLS * ROWS * 0.08)), h = snake[0], d = DIRS[dir];
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
  step = 1 / 3.6; acc = step * 0.999; foods = []; rocks = [];
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
  /* velocidad continua por manzanas comidas: 4,5 casillas/s al empezar → 11,5 hacia la manzana 64 (nivel 9) */
  const dq = Math.min(1, eatenTotal / 96); // 1.23: más fácil (antes 4,5 → 11,5 en 64 manzanas)
  step = 1 / (3.6 + 6.2 * dq) * (slowT > 0 ? 1.45 : 1);
  for (const b of bulges) b.d += dt / step; bulges = bulges.filter((b) => b.d < snake.length + 1);
  acc += dt; if (acc >= step) { acc -= step; if (acc > step) acc = 0; tick(); }
}

/* ---------- dibujo de la serpiente ---------- */
function snakePath(f, snake, prev) {
  const n = snake.length, L = (a, b) => a + (b - a) * f;
  const pts = [[L(cx(prev[0].x), cx(snake[0].x)), L(cy(prev[0].y), cy(snake[0].y))]];
  for (let i = 1; i < n; i++) pts.push([cx(snake[i].x), cy(snake[i].y)]);
  pts.push([L(cx(prev[n - 1].x), cx(snake[n - 1].x)), L(cy(prev[n - 1].y), cy(snake[n - 1].y))]);
  return pts;
}
function drawSnake() { drawSnakeOf({ body: snake, prev, bulges, dying, dir, sk: SK, f: dying > 0 ? 1 : k.clamp(acc / step, 0, 1) }); }
/* dibuja una serpiente cualquiera: o = {body, prev, bulges, dying, dir, sk:{body,dark}, f (interpolación), ghost (parpadeo)} */
function drawSnakeOf(o) {
  const snake = o.body, bulges = o.bulges, dying = o.dying, dir = o.dir, SK = o.sk;
  const f = o.f, pts = snakePath(f, snake, o.prev), R = CS * 0.4;
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
  if (o.ghost) c.globalAlpha = 0.45;
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
  c.restore(); c.globalAlpha = 1;
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

if (MP) snakeMP(); else {
reset();
k.show(CFG.title || 'Serpent Grid', 'Come manzanas para crecer. Las doradas valen más y los arándanos te frenan. Cada 8 manzanas, nivel nuevo con rocas. Desliza, toca a un lado de la cabeza o usa las flechas.<br>Toca para empezar');
k.run((dt) => { if (!k.gate(reset)) { t += dt; for (const f of foods) f.pop = Math.min(1, f.pop + dt * 4); return; } update(dt); }, draw);
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
}

/* ================= Serpientes Hambrientas (CFG.mode 'mp'): hasta 4 serpientes, ronda de 90 s =================
 * Chocar no elimina: la serpiente parpadea, reaparece con la mitad del cuerpo y es intangible un momento. Meter la cabeza
 * en el cuerpo de otra da +2 a su dueña; los choques de frente dejan KO a las dos. Manzana +1, dorada +3 (más al final).
 * Velocidad 3,3 → 8 casillas/s. CPU: BFS a la comida más cercana + relleno para no encerrarse; mejora con 'cpu:<id>'. */
function snakeMP() {
  const ROUND = 90, NS = 4, APPLES = 4, START = [[12, 3, 'left'], [15, 5, 'right'], [12, 8, 'left'], [15, 10, 'right']];
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  let S = [], clock = 0, over = false, overT = 0, cpuLv = 0, goldT = 0, warned = 0;
  const lsGet = (key) => { try { return +localStorage.getItem(key) || 0; } catch (e) { return 0; } };
  const lsSet = (key, v) => { try { localStorage.setItem(key, v); } catch (e) { /* sin almacenamiento */ } };
  level = 1; t = 0; th = THM[0]; floorCv = renderFloor(); rocks = []; foods = [];
  const inB = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  function occGrid(skipTails) {
    const o = new Int8Array(COLS * ROWS).fill(-1);
    for (const s of S) if (s.alive && !s.inv) s.body.forEach((b, i) => { if (skipTails && i === s.body.length - 1 && s.grow === 0) return; o[b.y * COLS + b.x] = s.p; });
    return o;
  }
  function mk(pl) {
    const col = pl.color;
    return { p: pl.p, cpu: pl.cpu, name: pl.name, sk: { body: col, dark: ART.dark(col, 0.28) }, score: 0, body: [], prev: [], bulges: [], dir: 'right', queue: [], grow: 0, alive: true, down: 0, inv: 0, dying: 0, len0: 4, anchor: null };
  }
  function place(s, x, y, dir, len) {
    const d = DIRS[dir]; s.dir = dir; s.queue = []; s.grow = 0; s.bulges = [];
    s.body = []; for (let i = 0; i < len; i++) s.body.push({ x: x - d[0] * i, y: y - d[1] * i });
    s.prev = s.body.map((b) => ({ x: b.x - d[0], y: b.y - d[1] }));
  }
  /* punto de reaparición: casilla libre lejos de las cabezas, con recorrido libre por delante */
  function respawn(s) {
    const o = occGrid(false), len = Math.max(3, Math.ceil(s.len0 / 2)); let best = null, bs = -1;
    for (let n = 0; n < 160; n++) {
      const x = k.ri(2, COLS - 3), y = k.ri(1, ROWS - 2), dir = k.pick(['up', 'down', 'left', 'right']), d = DIRS[dir];
      let ok = true; for (let i = -len + 1; i <= 5; i++) { const cx2 = x + d[0] * i, cy2 = y + d[1] * i; if (!inB(cx2, cy2) || o[cy2 * COLS + cx2] >= 0) { ok = false; break; } }
      if (!ok) continue;
      let far = 99; for (const q of S) if (q !== s && q.alive) far = Math.min(far, Math.abs(q.body[0].x - x) + Math.abs(q.body[0].y - y));
      if (far > bs) { bs = far; best = [x, y, dir]; }
    }
    if (!best) best = [START[s.p][0], START[s.p][1], START[s.p][2]];
    place(s, best[0], best[1], best[2], len); s.alive = true; s.inv = 1.4; s.dying = 0;
    k.burst(cx(best[0]), cy(best[1]), s.sk.body, 12, 120);
  }
  function crash(s, why, by) {
    if (!s.alive) return;
    s.alive = false; s.down = 1.1; s.dying = 1.1; s.len0 = s.body.length; s.queue = [];
    const h = s.body[0]; k.burst(cx(h.x), cy(h.y), '#fff', 12, 170); k.burst(cx(h.x), cy(h.y), s.sk.body, 12, 140); k.shake(4); k.sfx('hurt');
    if (by) { by.score += 2; k.float('+2', cx(h.x), cy(h.y) - 16, by.sk.body); }
    else if (why) k.float(why, cx(h.x), cy(h.y) - 16, '#fff');
  }
  function spawnApple(kind, life) {
    const o = occGrid(false), free = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (o[y * COLS + x] < 0 && !foods.some((f) => f.x === x && f.y === y) && !S.some((s) => Math.abs(s.body[0].x - x) + Math.abs(s.body[0].y - y) < 3)) free.push([x, y]);
    if (!free.length) return; const [x, y] = k.pick(free); foods.push({ x, y, kind, life: life || 0, max: life || 0, pop: 0 });
  }
  function setup() {
    const pl = k.players(NS);
    if (S.length !== NS) S = pl.map(mk); else S.forEach((s, i) => { s.cpu = pl[i].cpu; s.name = pl[i].name; s.sk = { body: pl[i].color, dark: ART.dark(pl[i].color, 0.28) }; });
  }
  k.onParty = () => setup();
  function reset() {
    cpuLv = Math.min(8, lsGet('cpu:' + ID)); S = []; setup(); clock = 0; over = false; overT = 0; goldT = 6; warned = 0; foods = []; t = 0;
    S.forEach((s, i) => { s.score = 0; s.alive = true; s.inv = 0; s.dying = 0; s.down = 0; place(s, START[i][0], START[i][1], START[i][2], 4); s.len0 = 4; });
    for (let i = 0; i < APPLES; i++) spawnApple('apple');
    step = 1 / 3.0; acc = 0; k.count(3);
  }
  function turnS(s, nd) {
    const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if (nd === last || nd === OPP[last] || s.queue.length >= 2) return; s.queue.push(nd);
  }
  function humanInput(s) {
    for (const n of ['up', 'down', 'left', 'right']) if (k.phit(s.p, n)) turnS(s, n);
    if (k.party || s.p !== 0) return;
    const p = k.ptr;   // solo, J1: deslizar
    if (p.hit) s.anchor = [p.x, p.y];
    if (p.down && s.anchor) { const dx = p.x - s.anchor[0], dy = p.y - s.anchor[1]; if (Math.max(Math.abs(dx), Math.abs(dy)) * k.scale > 22) { turnS(s, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); s.anchor = [p.x, p.y]; } }
    if (p.up) s.anchor = null;
  }
  /* ---------- CPU ---------- */
  function flood(o, sx, sy, cap) {
    if (!inB(sx, sy) || o[sy * COLS + sx] >= 0) return 0;
    const seen = new Uint8Array(COLS * ROWS), q = [sy * COLS + sx]; seen[q[0]] = 1;
    for (let h = 0; h < q.length && q.length < cap; h++) { const x = q[h] % COLS, y = (q[h] / COLS) | 0; for (const d of Object.values(DIRS)) { const nx = x + d[0], ny = y + d[1], i = ny * COLS + nx; if (inB(nx, ny) && !seen[i] && o[i] < 0) { seen[i] = 1; q.push(i); } } }
    return q.length;
  }
  function cpuThink(s) {
    const o = occGrid(true), h = s.body[0], err = Math.max(0.05, 0.22 - cpuLv * 0.009); // 1.23: CPU más torpe (antes 0,16 − 0,014·nivel, mín 0,02)
 
    // BFS desde la cabeza hasta la comida más valiosa y cercana
    const par = new Int32Array(COLS * ROWS).fill(-2), q = [h.y * COLS + h.x]; par[q[0]] = -1; let goal = -1;
    const food = new Map(foods.map((f) => [f.y * COLS + f.x, f]));
    for (let i = 0; i < q.length; i++) { const cur = q[i]; if (i && food.has(cur)) { goal = cur; if (food.get(cur).kind === 'gold' || Math.random() < 0.7) break; }
      const x = cur % COLS, y = (cur / COLS) | 0; for (const d of Object.values(DIRS)) { const nx = x + d[0], ny = y + d[1], j = ny * COLS + nx; if (inB(nx, ny) && par[j] === -2 && o[j] < 0) { par[j] = cur; q.push(j); } } }
    let want = null;
    if (goal >= 0) { let c2 = goal; while (par[c2] !== q[0] && par[c2] >= 0) c2 = par[c2]; const dx = c2 % COLS - h.x, dy = ((c2 / COLS) | 0) - h.y; want = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up'; }
    const heads = S.filter((r) => r !== s && r.alive && !r.inv).map((r) => { const d = DIRS[r.queue[0] || r.dir]; return (r.body[0].y + d[1]) * COLS + r.body[0].x + d[0]; });
    let best = null, bs = -1e9;
    for (const dn of ['up', 'down', 'left', 'right']) {
      if (dn === OPP[s.dir]) continue; const d = DIRS[dn], nx = h.x + d[0], ny = h.y + d[1];
      if (!inB(nx, ny) || o[ny * COLS + nx] >= 0) { if (-1000 > bs) { bs = -1000; best = dn; } continue; }
      const room = flood(o, nx, ny, s.body.length * 3 + 12);
      let sc = room >= s.body.length * 2 + 4 ? 100 : room * 2;
      if (dn === want) sc += 40; if (dn === s.dir) sc += 3;
      if (heads.includes(ny * COLS + nx)) sc -= 60 - cpuLv * 2;
      sc += Math.random() * 6;
      if (sc > bs) { bs = sc; best = dn; }
    }
    if (Math.random() < err) { const alt = ['up', 'down', 'left', 'right'].filter((dn) => dn !== OPP[s.dir]); best = k.pick(alt); }   // despiste ocasional
    if (best && best !== s.dir) s.queue = [best];
  }
  /* ---------- paso común: todas se mueven a la vez ---------- */
  function tick() {
    const live = S.filter((s) => s.alive);
    for (const s of live) { if (s.cpu) cpuThink(s); if (s.queue.length) s.dir = s.queue.shift(); }
    const nh = new Map(live.map((s) => { const d = DIRS[s.dir]; return [s, { x: s.body[0].x + d[0], y: s.body[0].y + d[1] }]; }));
    const o = occGrid(true), dead = new Map();
    for (const s of live) {
      const n = nh.get(s);
      if (!inB(n.x, n.y)) { dead.set(s, ['¡Pared!', null]); continue; }
      if (s.inv) continue;
      const who = o[n.y * COLS + n.x];
      if (who === s.p) { dead.set(s, ['¡Ay!', null]); continue; }
      if (who >= 0) { const ow = S.find((q) => q.p === who); dead.set(s, [null, ow]); continue; }
      for (const r of live) if (r !== s && !r.inv) { const m = nh.get(r);
        if ((m.x === n.x && m.y === n.y) || (m.x === s.body[0].x && m.y === s.body[0].y && n.x === r.body[0].x && n.y === r.body[0].y)) { dead.set(s, ['¡KO!', null]); dead.set(r, ['¡KO!', null]); } }
    }
    for (const s of live) {
      if (dead.has(s)) continue;
      const n = nh.get(s), old = s.body.map((b) => ({ x: b.x, y: b.y }));
      s.body.unshift(n); if (s.grow > 0) { s.grow--; old.push({ ...old[old.length - 1] }); } else s.body.pop(); s.prev = old;
      const fi = foods.findIndex((f) => f.x === n.x && f.y === n.y);
      if (fi >= 0) { const f = foods[fi]; foods.splice(fi, 1); const g = f.kind === 'gold';
        s.score += g ? 3 : 1; s.grow += g ? 2 : 1; s.bulges.push({ d: 0 });
        k.float(g ? '+3' : '+1', cx(n.x), cy(n.y) - 16, g ? '#ffd23d' : '#fff'); k.burst(cx(n.x), cy(n.y), g ? '#ffd23d' : '#ff4d5e', g ? 16 : 9, 130); k.sfx(g ? 'coin' : 'pop');
        if (f.kind === 'apple') spawnApple('apple'); }
    }
    for (const [s, [why, by]] of dead) { s.prev = s.body.map((b) => ({ ...b })); crash(s, why, by); }
  }
  function update(dt) {
    t += dt;
    for (const f of foods) f.pop = Math.min(1, f.pop + dt * 4);
    if (!k.gate(reset)) return;
    if (k.counting()) return;
    if (over) { overT += dt; if (overT > 1.2) finish(); return; }
    clock += dt; const left = ROUND - clock;
    if (left <= 10 && Math.ceil(left) !== warned) { warned = Math.ceil(left); k.sfx('click'); }
    if (left <= 0) { over = true; overT = 0; k.sfx('win'); k.confetti(); return; }
    for (const s of S) {
      if (!s.alive) { s.dying = Math.max(0, s.dying - dt); if ((s.down -= dt) <= 0) respawn(s); continue; }
      s.inv = Math.max(0, s.inv - dt); if (!s.cpu) humanInput(s);
      for (const b of s.bulges) b.d += dt / step; s.bulges = s.bulges.filter((b) => b.d < s.body.length + 1);
    }
    for (let i = foods.length - 1; i >= 0; i--) { const f = foods[i]; if (f.max && (f.life -= dt) <= 0) { k.burst(cx(f.x), cy(f.y), '#fff', 8, 80); foods.splice(i, 1); } }
    // doradas: cada 9–13 s; en los últimos 25 s, cada 3–5 s
    if ((goldT -= dt) <= 0) { const late = left < 25; goldT = late ? 3 + Math.random() * 2 : 9 + Math.random() * 4; if (foods.filter((f) => f.kind === 'gold').length < (late ? 3 : 1)) spawnApple('gold', late ? 6 : 7); }
    // velocidad: 3,3 casillas/s → 8 hacia el final de la ronda
    const e = Math.min(1, clock / (ROUND * 0.9)); step = 1 / (3.0 + 4.0 * e * e * (3 - 2 * e));
    acc += dt; if (acc >= step) { acc -= step; if (acc > step) acc = 0; tick(); }
  }
  function finish() {
    const rows = S.map((s) => ({ p: s.p, score: s.score })), hu = S.filter((s) => !s.cpu), top = Math.max(...rows.map((r) => r.score));
    if (hu.length === 1 && hu[0].score === top && S.filter((s) => s.score === top).length === 1) lsSet('cpu:' + ID, Math.min(8, cpuLv + 0.5));
    k.podium(rows, { fmt: (v) => v + (v === 1 ? ' punto' : ' puntos'), head: hu.length === 1 && hu[0].score === top && S.filter((s) => s.score === top).length === 1 ? '¡Has ganado!' : undefined });
  }
  function draw() {
    c.drawImage(floorCv, 0, 0, W, H);
    for (const f of foods) {
      if (f.max && f.life < 2 && Math.floor(f.life * 8) % 2) continue;
      const x = cx(f.x), y = cy(f.y), s = f.pop < 1 ? Math.sin(f.pop * 2.1) * 1.15 : 1 + Math.sin(t * 5 + f.x) * 0.05;
      if (f.max) { c.strokeStyle = 'rgba(255,210,61,.85)'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, 12, -1.5708, -1.5708 + R2 * f.life / f.max); c.stroke(); }
      apple(x, y + Math.sin(t * 4 + f.y) * 1.2, Math.max(0.01, s * 0.85), f.kind);
      if (f.kind === 'gold') sparkle(x + 7 * Math.cos(t * 3), y - 7 + 4 * Math.sin(t * 3), 0.6 + 0.4 * Math.abs(Math.sin(t * 6)));
    }
    const fr = k.st === 'play' && !k.counting() ? k.clamp(acc / step, 0, 1) : 1;
    for (const s of S) {
      if (!s.body.length) continue;
      if (!s.alive && s.dying <= 0) continue;
      if (!s.alive) c.globalAlpha = Math.min(1, s.dying * 1.4);
      drawSnakeOf({ body: s.body, prev: s.prev, bulges: s.bulges, dying: s.alive ? 0 : s.dying, dir: s.dir, sk: s.sk, f: s.alive ? fr : 1, ghost: s.inv > 0 && Math.floor(s.inv * 10) % 2 === 0 });
      c.globalAlpha = 1;
    }
    // marcador: 4 fichas (J1 J2 a la izquierda, J3 J4 a la derecha; el centro queda para pausa/sonido)
    const xs = [8, 162, 356, 510];
    S.forEach((s, i) => {
      const x = xs[i], y = 3, lead = s.score > 0 && s.score === Math.max(...S.map((q) => q.score));
      ART.rr(c, x, y, 122, 30, 10); ART.fillOut(c, lead ? 'rgba(255,209,102,.28)' : 'rgba(26,21,48,.72)', 2);
      c.beginPath(); c.arc(x + 16, y + 15, 9, 0, R2); ART.fillOut(c, s.sk.body, 2);
      c.fillStyle = OUT; c.beginPath(); c.arc(x + 19, y + 12, 1.8, 0, R2); c.arc(x + 19, y + 18, 1.8, 0, R2); c.fill();
      label(s.name.slice(0, 5), x + 30, y + 7, 14, s.sk.body);
      label(String(s.score), x + 114, y + 3, 20, '#fff', 'right');
    });
    // tiempo: barra bajo el marcador y cifra grande en los últimos 10 s
    const left = Math.max(0, ROUND - clock), bw = COLS * CS;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(X0, 35, bw, 4); c.fillStyle = left < 10 ? '#ff5a5f' : '#ffd166'; c.fillRect(X0, 35, bw * left / ROUND, 4);
    if (k.st === 'play' && !k.counting() && left < 10 && left > 0) { c.globalAlpha = 0.55; label(String(Math.ceil(left)), W / 2, Y0 + ROWS * CS / 2 - 40, 72, '#fff', 'center'); c.globalAlpha = 1; }
  }
  window.__sn = { get S() { return S; }, get clock() { return clock; }, get foods() { return foods; } };
  reset();
  k.show(CFG.title || 'Serpientes Hambrientas', 'Hasta 4 serpientes y 90 segundos. Manzana +1, dorada +3. Si una rival choca contra tu cuerpo, +2 para ti. Chocar no elimina: vuelves más corta tras un parpadeo. Flechas, joystick o desliza.<br>Toca para jugar');
  k.run(update, draw);
}
