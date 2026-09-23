/* Tower Defense. CFG.mode: 'path' | 'maze' | 'hex' */
const M = CFG.mode, k = Kit({ w: 640, h: 360, title: CFG.title, bg: '#1b2b1f' }), c = k.ctx;
const COLS = 16, ROWS = 8, S = 40, OY = 40;
const TOWERS = [{ n: 'Flecha', cost: 50, r: 95, rate: 0.5, dmg: 8, col: '#5ce1e6' }, { n: 'Cañón', cost: 90, r: 80, rate: 1.2, dmg: 22, splash: 40, col: '#ffa94d' }, { n: 'Hielo', cost: 70, r: 85, rate: 0.9, dmg: 4, slow: 0.5, col: '#b98cff' }];
let grid, path, towers, foes, bullets, gold, lives, wave, spawnQ, spawnT, pick, score, between;
function bfs() { const start = [0, Math.floor(ROWS / 2)], goal = [COLS - 1, Math.floor(ROWS / 2)], prev = {}, q = [start], seen = new Set([start.join()]);
  while (q.length) { const cur = q.shift(); if (cur[0] === goal[0] && cur[1] === goal[1]) { const out = [cur]; let kk = cur.join(); while (prev[kk]) { out.unshift(prev[kk]); kk = prev[kk].join(); } return out; }
    for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) { const nx = cur[0] + dx, ny = cur[1] + dy, kk = nx + ',' + ny; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || seen.has(kk) || grid[ny][nx] === 2) continue; seen.add(kk); prev[kk] = cur; q.push([nx, ny]); } } return null; }
function build() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  if (M === 'maze') path = bfs();
  else { path = []; let x = 0, y = k.ri(1, ROWS - 2); path.push([x, y]); while (x < COLS - 1) { const r = Math.random(); if (r < 0.55 || x % 2) x++; else { const ny = k.clamp(y + (Math.random() < 0.5 ? -1 : 1) * k.ri(1, 3), 0, ROWS - 1); while (y !== ny) { y += Math.sign(ny - y); path.push([x, y]); } x++; } path.push([x, y]); }
    for (const [px, py] of path) grid[py][px] = 1; }
}
function reset() { towers = []; foes = []; bullets = []; gold = 150; lives = 20; wave = 0; spawnQ = []; spawnT = 0; pick = 0; score = 0; between = 3; build(); }
reset(); k.show(CFG.title, M === 'maze' ? 'Coloca torres en el prado para alargar el camino de los enemigos (no puedes bloquearlo del todo).' : 'Elige torre abajo y toca una casilla libre para construir. Toca una torre para mejorarla.');
const center = ([x, y]) => [x * S + S / 2, OY + y * S + S / 2];
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (k.ptr.hit) { if (k.ptr.y < OY) { const i = Math.floor(k.ptr.x / 110); if (i < 3) pick = i; else if (k.ptr.x > 520 && between > 0) between = 0.01; }
    else { const x = Math.floor(k.ptr.x / S), y = Math.floor((k.ptr.y - OY) / S); if (x >= 0 && y >= 0 && x < COLS && y < ROWS) { const tw = towers.find((q) => q.x === x && q.y === y);
      if (tw) { const cost = 40 * tw.lv; if (gold >= cost && tw.lv < 4) { gold -= cost; tw.lv++; } }
      else if (grid[y][x] === 0 && gold >= TOWERS[pick].cost) { if (M === 'maze') { grid[y][x] = 2; const np = bfs(); if (!np || foes.some((f) => f.gx === x && f.gy === y)) { grid[y][x] = 0; return; } path = np; } else grid[y][x] = 2;
        towers.push({ x, y, t: pick, lv: 1, cd: 0 }); k.sfx('click'); gold -= TOWERS[pick].cost; } } } }
  if (between > 0) { between -= dt; if (between <= 0) { wave++; const n = 6 + wave * 2; spawnQ = Array.from({ length: n }, (_, i) => (wave % 5 === 0 && i === n - 1 ? 'boss' : wave > 2 && i % 4 === 0 ? 'fast' : 'norm')); } }
  spawnT -= dt; if (spawnQ.length && spawnT <= 0) { spawnT = 0.7; const ty = spawnQ.shift(); const hp = (20 + wave * 9) * (ty === 'boss' ? 8 : ty === 'fast' ? 0.6 : 1); foes.push({ i: 0, p: 0, hp, max: hp, sp: ty === 'fast' ? 2.6 : ty === 'boss' ? 0.8 : 1.5, ty, slow: 0, path: path.slice() }); }
  for (const f of foes) { f.slow -= dt; const sp = f.sp * (f.slow > 0 ? 0.5 : 1); f.p += sp * dt; while (f.p >= 1 && f.i < f.path.length - 1) { f.p -= 1; f.i++; }
    if (M === 'maze' && f.p < 0.05) { /* recalcula ruta al cambiar el laberinto */ const cur = f.path[f.i]; if (cur) { f.gx = cur[0]; f.gy = cur[1]; const idx = path.findIndex((q) => q[0] === cur[0] && q[1] === cur[1]); if (idx >= 0) { f.path = path.slice(idx); f.i = 0; } } }
    const a = f.path[f.i], b = f.path[Math.min(f.i + 1, f.path.length - 1)]; const [ax, ay] = center(a), [bx, by] = center(b); f.x = ax + (bx - ax) * f.p; f.y = ay + (by - ay) * f.p;
    if (f.i >= f.path.length - 1) { f.dead = true; lives -= f.ty === 'boss' ? 5 : 1; } }
  for (const tw of towers) { const T = TOWERS[tw.t], [tx, ty] = center([tw.x, tw.y]); tw.cd -= dt; if (tw.cd > 0) continue; const r = T.r * (1 + (tw.lv - 1) * 0.12);
    const tg = foes.filter((f) => !f.dead && Math.hypot(f.x - tx, f.y - ty) < r).sort((a, b) => (b.i + b.p) - (a.i + a.p))[0]; if (tg) { tw.cd = T.rate; bullets.push({ x: tx, y: ty, tg, T, dmg: T.dmg * (1 + (tw.lv - 1) * 0.6) }); } }
  for (const b of bullets) { if (b.tg.dead) { b.dead = true; continue; } const a = Math.atan2(b.tg.y - b.y, b.tg.x - b.x); b.x += Math.cos(a) * 380 * dt; b.y += Math.sin(a) * 380 * dt;
    if (Math.hypot(b.tg.x - b.x, b.tg.y - b.y) < 8) { b.dead = true; const hitList = b.T.splash ? foes.filter((f) => Math.hypot(f.x - b.x, f.y - b.y) < b.T.splash) : [b.tg]; for (const f of hitList) { f.hp -= b.dmg; if (b.T.slow) f.slow = 1.5; } } }
  for (const f of foes) if (f.hp <= 0 && !f.dead) { f.dead = true; k.burst(f.x, f.y, '#ff6b6b', 8, 90); k.sfx('pop'); gold += f.ty === 'boss' ? 60 : 6 + Math.floor(wave / 3); score += 10; }
  foes = foes.filter((f) => !f.dead); bullets = bullets.filter((b) => !b.dead);
  if (lives <= 0) return k.lose(CFG.id, score, 'La base ha caído', `Oleada ${wave}`);
  if (!spawnQ.length && !foes.length && between <= 0) { between = 6; score += wave * 20; gold += 25; }
}, () => {
  k.clear();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) k.rect(x * S, OY + y * S, S - 1, S - 1, (x + y) % 2 ? '#24402b' : '#284a30');
  for (const [x, y] of path) k.rect(x * S, OY + y * S, S - 1, S - 1, '#6b5a3c');
  const [sx, sy] = center(path[0]), [ex, ey] = center(path[path.length - 1]); k.text('▶', sx, sy - 9, 16, '#fff', 'center'); k.text('⌂', ex, ey - 11, 20, '#ff9ad5', 'center');
  for (const tw of towers) { const T = TOWERS[tw.t], [x, y] = center([tw.x, tw.y]); if (M === 'hex') { c.fillStyle = T.col; c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(x + Math.cos(i * 1.047) * 16, y + Math.sin(i * 1.047) * 16); c.fill(); } else k.rrect(x - 15, y - 15, 30, 30, 6, T.col); k.text('★'.repeat(tw.lv), x, y + 8, 8, '#1b2b1f', 'center'); }
  for (const f of foes) { k.circle(f.x, f.y, f.ty === 'boss' ? 13 : f.ty === 'fast' ? 7 : 9, f.slow > 0 ? '#b98cff' : f.ty === 'boss' ? '#ff3b3b' : f.ty === 'fast' ? '#f2d15c' : '#ff6b6b'); k.rect(f.x - 10, f.y - 16, 20 * f.hp / f.max, 3, '#7cf7a0'); }
  for (const b of bullets) k.circle(b.x, b.y, 3, b.T.col);
  k.rect(0, 0, 640, OY, '#10180f'); TOWERS.forEach((T, i) => { k.rrect(i * 110 + 4, 4, 102, 32, 8, pick === i ? T.col : '#243324'); k.text(`${T.n} ${T.cost}`, i * 110 + 55, 12, 13, pick === i ? '#10180f' : '#fff', 'center'); });
  k.text(`💰${gold}  ♥${lives}  Oleada ${wave}`, 340, 12, 13, '#fff'); if (between > 0) { k.rrect(530, 4, 106, 32, 8, '#7cf7a0'); k.text(`▶ Ya (${Math.ceil(between)})`, 583, 12, 13, '#10180f', 'center'); }
});
