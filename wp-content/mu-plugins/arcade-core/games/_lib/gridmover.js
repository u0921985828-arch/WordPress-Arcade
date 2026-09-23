/* Neon Trails (mode 'trails') y Territory (mode 'territory') */
const M = CFG.mode, k = Kit({ w: 480, h: 480, title: CFG.title, bg: '#070916' }), c = k.ctx;
const N = M === 'trails' ? 60 : 48, S = 480 / N, D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
let g, bikes, acc, score, round, sparks, pct;
function newRound() {
  g = Array.from({ length: N }, () => Array(N).fill(0)); acc = 0;
  if (M === 'trails') { bikes = [{ x: 10, y: 24, d: 'right', col: '#5ce1e6', id: 1, alive: true, me: true }, { x: 50, y: 36, d: 'left', col: '#ff5fa2', id: 2, alive: true }, { x: 30, y: 10, d: 'down', col: '#f2d15c', id: 3, alive: true }, { x: 30, y: 50, d: 'up', col: '#7cf7a0', id: 4, alive: true }].slice(0, 2 + Math.min(2, round)); bikes.forEach((b) => (g[b.y][b.x] = b.id)); }
  else { for (let y = 20; y < 26; y++) for (let x = 20; x < 26; x++) g[y][x] = 1; bikes = [{ x: 22, y: 22, d: null, me: true, alive: true, trail: [] }]; sparks = Array.from({ length: 2 + round }, () => ({ x: k.rnd(2, N - 2), y: k.rnd(2, 10), vx: k.pick([-1, 1]) * k.rnd(6, 10), vy: k.pick([-1, 1]) * k.rnd(6, 10) })); pct = 0; }
}
function reset() { score = 0; round = 1; newRound(); }
reset(); k.show(CFG.title, CFG.help);
const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !g[y][x];
function space(x, y, lim) { const seen = new Set([x + ',' + y]), q = [[x, y]]; while (q.length && seen.size < lim) { const [a, b] = q.shift(); for (const [dx, dy] of Object.values(D)) { const nx = a + dx, ny = b + dy, key = nx + ',' + ny; if (!seen.has(key) && free(nx, ny)) { seen.add(key); q.push([nx, ny]); } } } return seen.size; }
function capture() {
  const me = bikes[0]; for (const [x, y] of me.trail) g[y][x] = 1; me.trail = [];
  const out = Array.from({ length: N }, () => Array(N).fill(false)), q = [];
  for (let i = 0; i < N; i++) for (const [x, y] of [[i, 0], [i, N - 1], [0, i], [N - 1, i]]) if (g[y][x] !== 1 && !out[y][x]) { out[y][x] = true; q.push([x, y]); }
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of Object.values(D)) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !out[ny][nx] && g[ny][nx] !== 1) { out[ny][nx] = true; q.push([nx, ny]); } } }
  let own = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!out[y][x]) g[y][x] = 1; if (g[y][x] === 1) own++; }
  if (own) k.sfx('coin'); const np = own / (N * N) * 100; score += Math.max(0, Math.round((np - pct) * 10)); pct = np;
}
k.run((dt) => {
  if (!k.gate(reset)) return;
  const me = bikes[0], want = k.swipe || ['up', 'down', 'left', 'right'].find((d) => k.hit.has(d));
  if (want && want !== OPP[me.d]) me.nd = want;
  acc += dt; const step = M === 'trails' ? Math.max(0.045, 0.075 - round * 0.004) : 0.07;
  if (M === 'territory') for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; if (s.x < 0 || s.x > N) s.vx *= -1; if (s.y < 0 || s.y > N) s.vy *= -1; const cx = Math.floor(s.x), cy = Math.floor(s.y);
    if (g[cy] && g[cy][cx] === 2 || (Math.abs(s.x - me.x - 0.5) < 1 && Math.abs(s.y - me.y - 0.5) < 1 && g[me.y][me.x] !== 1)) return k.lose(CFG.id, score, 'Te han cortado', `${Math.round(pct)}% conquistado`);
    if (g[cy] && g[cy][cx] === 1) { s.vx *= -1; s.vy *= -1; s.x += s.vx * dt * 2; s.y += s.vy * dt * 2; } }
  while (acc >= step) { acc -= step;
    if (M === 'trails') {
      for (const b of bikes) { if (!b.alive) continue;
        if (b.me) { if (b.nd) { b.d = b.nd; b.nd = null; } }
        else { const opts = Object.keys(D).filter((d) => d !== OPP[b.d]).map((d) => { const nx = b.x + D[d][0], ny = b.y + D[d][1]; return [d, free(nx, ny) ? space(nx, ny, 250) + (d === b.d ? 3 : 0) + Math.random() * 4 : -1]; }); opts.sort((a, z) => z[1] - a[1]); b.d = opts[0][0]; }
        b.nx = b.x + D[b.d][0]; b.ny = b.y + D[b.d][1]; }
      for (const b of bikes) if (b.alive) { if (!free(b.nx, b.ny) || bikes.some((o) => o !== b && o.alive && o.nx === b.nx && o.ny === b.ny)) b.alive = false; }
      for (const b of bikes) if (b.alive) { b.x = b.nx; b.y = b.ny; g[b.y][b.x] = b.id; }
      for (const b of bikes) if (!b.alive && !b.boom) { b.boom = true; k.burst(b.x * S, b.y * S, b.col, 20); k.sfx('explode'); }
      if (!bikes[0].alive) return k.lose(CFG.id, score, 'Choque', `Ronda ${round}`);
      if (bikes.filter((b) => b.alive).length === 1) { score += 100 * round; round++; newRound(); return; }
      score += 1;
    } else {
      if (me.nd) { me.d = me.nd; me.nd = null; } if (!me.d) continue;
      const nx = me.x + D[me.d][0], ny = me.y + D[me.d][1]; if (nx < 0 || ny < 0 || nx >= N || ny >= N) { me.d = null; continue; }
      if (g[ny][nx] === 2) return k.lose(CFG.id, score, 'Te cruzaste', `${Math.round(pct)}%`);
      me.x = nx; me.y = ny;
      if (g[ny][nx] === 1) { if (me.trail.length) capture(); } else { g[ny][nx] = 2; me.trail.push([nx, ny]); }
      if (pct >= 75) { score += 500; round++; newRound(); return; }
    }
  }
}, () => {
  k.clear(); const cols = { 1: '#5ce1e6', 2: '#ff5fa2', 3: '#f2d15c', 4: '#7cf7a0' };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = g[y][x]; if (!v) continue;
    if (M === 'territory') k.rect(x * S, y * S, S, S, v === 1 ? '#2b3a8f' : '#ff5fa2'); else { c.globalAlpha = 0.75; k.rect(x * S, y * S, S, S, cols[v]); c.globalAlpha = 1; } }
  if (M === 'trails') { for (const b of bikes) if (b.alive) k.rect(b.x * S - 1, b.y * S - 1, S + 2, S + 2, '#fff'); }
  else { const me = bikes[0]; k.rect(me.x * S - 1, me.y * S - 1, S + 2, S + 2, '#f2d15c'); for (const s of sparks) k.circle(s.x * S, s.y * S, 5, '#ffa94d'); k.text(`${pct.toFixed(0)}% / 75%`, 470, 8, 14, '#b8b6e0', 'right'); }
  k.text(`${score}`, 10, 8, 16); if (M === 'trails') k.text(`Ronda ${round}`, 470, 8, 14, '#b8b6e0', 'right');
});
