/* Laberintos. CFG.mode: 'muncher' | 'digger' | 'iso' | 'dungeon' */
const M = CFG.mode, ISO = M === 'iso' || M === 'dungeon';
const k = Kit({ w: 480, h: 480, title: CFG.title, bg: CFG.bg || '#0d0f24' }), c = k.ctx;
const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
let invT = 0, g, N, S, pl, foes, items, score, lives, level, fright, exitC, need, swordT;
function carve(n, loops) {
  const m = Array.from({ length: n }, () => Array(n).fill(1)), st = [[1, 1]]; m[1][1] = 0;
  while (st.length) { const [x, y] = st[st.length - 1]; const nb = k.shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]]).filter(([dx, dy]) => m[y + dy] && m[y + dy][x + dx] === 1 && x + dx > 0 && y + dy > 0 && x + dx < n - 1 && y + dy < n - 1);
    if (!nb.length) { st.pop(); continue; } const [dx, dy] = nb[0]; m[y + dy / 2][x + dx / 2] = 0; m[y + dy][x + dx] = 0; st.push([x + dx, y + dy]); }
  for (let i = 0; i < loops; i++) { const x = k.ri(1, n - 2), y = k.ri(1, n - 2); if (m[y][x] === 1 && ((m[y - 1][x] === 0 && m[y + 1][x] === 0) || (m[y][x - 1] === 0 && m[y][x + 1] === 0))) m[y][x] = 0; }
  return m;
}
const open = (x, y) => g[y] && g[y][x] !== undefined && (M === 'digger' ? true : g[y][x] !== 1) && x >= 0 && y >= 0 && x < N && y < N;
const walk = (x, y) => g[y] && g[y][x] === 0;
function ent(x, y, sp) { return { x, y, fx: x, fy: y, dir: null, next: null, sp, t: 0 }; }
function build() {
  N = M === 'digger' ? 15 : ISO ? 11 + Math.min(8, level * 2) : 19; if (N % 2 === 0) N++;
  S = 480 / N; items = []; foes = [];
  if (M === 'digger') {
    g = Array.from({ length: N }, () => Array(N).fill(2)); for (let x = 0; x < N; x++) g[0][x] = 0;
    for (let y = 1; y < 4; y++) g[y][7] = 0;
    for (let i = 0; i < 12 + level * 2; i++) { const x = k.ri(0, N - 1), y = k.ri(4, N - 1); items.push({ x, y, t: 'gem' }); }
    for (let i = 0; i < 2 + level; i++) { const x = k.ri(1, N - 2), y = k.ri(6, N - 2); for (let j = -2; j <= 2; j++) if (g[y][x + j] !== undefined) g[y][x + j] = 0; foes.push(ent(x, y, 2.4 + level * 0.2)); }
    pl = ent(7, 0, 6);
  } else {
    g = carve(N, M === 'muncher' ? 40 : 4);
    if (M === 'muncher') {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!g[y][x]) items.push({ x, y, t: 'dot' });
      [[1, 1], [N - 2, 1], [1, N - 2], [N - 2, N - 2]].forEach(([x, y]) => { const it = items.find((q) => q.x === x && q.y === y); if (it) it.t = 'power'; });
      const cx = (N - 1) / 2 | 1; pl = ent(1, N - 2, 7); items = items.filter((q) => !(q.x === 1 && q.y === N - 2));
      for (let i = 0; i < 4; i++) foes.push(ent(N - 2 - (i % 2) * 2, 1 + Math.floor(i / 2) * 2, 4.2 + level * 0.3));
    } else {
      pl = ent(1, 1, 6); exitC = [N - 2, N - 2]; const cells = []; for (let y = 1; y < N; y++) for (let x = 1; x < N; x++) if (!g[y][x] && x + y > Math.max(4, N * 0.6)) cells.push([x, y]);
      k.shuffle(cells); need = 3; for (let i = 0; i < need; i++) { const [x, y] = cells.pop(); items.push({ x, y, t: 'key' }); }
      if (M === 'dungeon') for (let i = 0; i < 3 + level; i++) { const [x, y] = cells.pop(); const f = ent(x, y, 2.5); f.hp = 2; foes.push(f); }
    }
  }
  fright = 0;
}
function reset() { score = 0; lives = 3; level = 1; swordT = 0; build(); }
function bfs(sx, sy, tx, ty, pass) {
  const q = [[tx, ty]], seen = { [tx + ',' + ty]: 0 };
  while (q.length) { const [x, y] = q.shift(); if (x === sx && y === sy) break; for (const [dx, dy] of Object.values(D)) { const nx = x + dx, ny = y + dy, key = nx + ',' + ny; if (seen[key] === undefined && pass(nx, ny)) { seen[key] = seen[x + ',' + y] + 1; q.push([nx, ny]); } } }
  return seen;
}
function stepEnt(e, dt, pass) {
  e.t += dt * e.sp;
  if (e.t < 1) { if (e.dir) { e.fx = e.x - D[e.dir][0] * (1 - e.t); e.fy = e.y - D[e.dir][1] * (1 - e.t); } return false; }
  e.t = 0; e.fx = e.x; e.fy = e.y;
  let d = e.next && pass(e.x + D[e.next][0], e.y + D[e.next][1]) ? e.next : e.dir && pass(e.x + D[e.dir][0], e.y + D[e.dir][1]) ? e.dir : null;
  if (ISO && e === pl) { d = e.next && pass(e.x + D[e.next][0], e.y + D[e.next][1]) ? e.next : null; e.next = heldDir(); }
  e.dir = d; if (d) { e.x += D[d][0]; e.y += D[d][1]; } return true;
}
const heldDir = () => ['up', 'down', 'left', 'right'].find((d) => k.held.has(d)) || (k.ptr.down ? stickDir() : null);
function stickDir() { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy; if (Math.hypot(dx, dy) < 12) return null; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
reset(); k.show(CFG.title, CFG.help);
k.run((dt) => {
  if (!k.gate(reset)) return;
  const want = k.swipe || ['up', 'down', 'left', 'right'].find((d) => k.hit.has(d)) || heldDir(); if (want) pl.next = want;
  const pPass = M === 'digger' ? (x, y) => x >= 0 && y >= 0 && x < N && y < N : walk;
  if (stepEnt(pl, dt, pPass)) {
    if (M === 'digger' && g[pl.y][pl.x] === 2) { g[pl.y][pl.x] = 0; score += 1; }
    const it = items.find((q) => q.x === pl.x && q.y === pl.y && !q.got);
    if (it) { it.got = true; score += it.t === 'power' ? 50 : it.t === 'dot' ? 10 : it.t === 'gem' ? 100 : 200; if (it.t === 'power') fright = 7; if (navigator.vibrate && it.t !== 'dot') navigator.vibrate(20); }
    if (ISO && pl.x === exitC[0] && pl.y === exitC[1] && items.every((q) => q.got)) { score += 500 * level; level++; build(); return; }
  }
  if (!ISO && items.every((q) => q.got)) { score += 300 * level; level++; build(); return; }
  fright -= dt; swordT -= dt; invT -= dt;
  if (M === 'dungeon' && (k.hit.has('a') || k.tap) && swordT <= 0) { swordT = 0.35; k.sfx('shoot'); for (const f of foes) if (Math.abs(f.x - pl.x) + Math.abs(f.y - pl.y) <= 1 && --f.hp <= 0) { f.dead = true; score += 100; } }
  const fPass = M === 'digger' ? (x, y) => open(x, y) && g[y][x] === 0 : walk;
  for (const f of foes) {
    if (f.dead) continue;
    if (f.t + dt * f.sp >= 1) {
      const map = bfs(f.x, f.y, pl.x, pl.y, fPass); let best = null, bv = Infinity;
      for (const [d, [dx, dy]] of Object.entries(D)) { const v = map[(f.x + dx) + ',' + (f.y + dy)]; if (v === undefined) continue; const score2 = (fright > 0 ? -v : v) + Math.random() * (M === 'dungeon' ? 6 : 2.5); if (score2 < bv) { bv = score2; best = d; } }
      if (M === 'digger' && Math.random() < 0.08) { const d = k.pick(Object.keys(D)); const nx = f.x + D[d][0], ny = f.y + D[d][1]; if (open(nx, ny) && ny > 0) { g[ny][nx] = 0; best = d; } }
      f.next = best;
    }
    stepEnt(f, dt * (fright > 0 ? 0.55 : 1), fPass);
    if (Math.abs(f.fx - pl.fx) < 0.6 && Math.abs(f.fy - pl.fy) < 0.6) {
      if (fright > 0 && M === 'muncher') { score += 200; k.burst(f.fx * S + S / 2, f.fy * S + S / 2, '#3d5afe', 16); k.float('+200', f.fx * S + S / 2, f.fy * S); k.sfx('coin'); f.x = f.fx = N - 2; f.y = f.fy = 1; f.t = 0; }
      else if (invT <= 0) { invT = 2; lives--; navigator.vibrate && navigator.vibrate(120); if (lives <= 0) return k.lose(CFG.id, score, 'Atrapado', `Nivel ${level}`); pl.x = pl.fx = M === 'digger' ? 7 : 1; pl.y = pl.fy = M === 'digger' ? 0 : M === 'muncher' ? N - 2 : 1; pl.dir = pl.next = null; pl.t = 0; }
    }
  }
  foes = foes.filter((f) => !f.dead);
}, () => {
  k.clear();
  if (!ISO) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (g[y][x] === 1) k.rrect(x * S + 1, y * S + 1, S - 2, S - 2, 3, CFG.wall || '#3b3f9e'); if (g[y][x] === 2) k.rect(x * S, y * S, S, S, (x + y) % 2 ? '#6b4a2b' : '#5c3f25'); }
    for (const it of items) if (!it.got) { const cx = it.x * S + S / 2, cy = it.y * S + S / 2; if (it.t === 'dot') k.circle(cx, cy, 2.5, '#f5e6c8'); else if (it.t === 'power') k.circle(cx, cy, 6 + Math.sin(performance.now() / 150) * 1.5, '#fff'); else { c.fillStyle = '#5ce1e6'; c.beginPath(); c.moveTo(cx, cy - 8); c.lineTo(cx + 7, cy); c.lineTo(cx, cy + 8); c.lineTo(cx - 7, cy); c.fill(); } }
    const mouth = Math.abs(Math.sin(performance.now() / 90)) * 0.7, ang = { right: 0, down: 1.57, left: 3.14, up: -1.57 }[pl.dir || 'right'];
    c.fillStyle = '#f2d15c'; c.beginPath(); c.moveTo(pl.fx * S + S / 2, pl.fy * S + S / 2); c.arc(pl.fx * S + S / 2, pl.fy * S + S / 2, S * 0.42, ang + mouth / 2, ang - mouth / 2 + 6.283); c.fill();
    foes.forEach((f, i) => { const col = fright > 0 ? (fright < 2 && Math.floor(fright * 6) % 2 ? '#fff' : '#3d5afe') : ['#ff5f5f', '#ff9ad5', '#5ce1e6', '#ffa94d'][i % 4]; const x = f.fx * S + S / 2, y = f.fy * S + S / 2, r = S * 0.42; c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.1, r, Math.PI, 0); c.lineTo(x + r, y + r * 0.8); c.lineTo(x - r, y + r * 0.8); c.fill(); k.circle(x - r * 0.35, y - r * 0.2, r * 0.22, '#fff'); k.circle(x + r * 0.35, y - r * 0.2, r * 0.22, '#fff'); });
  } else {
    // Isométrico con cámara centrada en el jugador
    const tw = 34, th = 17, ox = 240 - (pl.fx - pl.fy) * tw / 2, oy = 200 - (pl.fx + pl.fy) * th / 2;
    const P = (x, y) => [ox + (x - y) * tw / 2, oy + (x + y) * th / 2];
    const tile = (x, y, col) => { const [px, py] = P(x, y); c.fillStyle = col; c.beginPath(); c.moveTo(px, py - th / 2); c.lineTo(px + tw / 2, py); c.lineTo(px, py + th / 2); c.lineTo(px - tw / 2, py); c.fill(); };
    const block = (x, y, h, top, l, r) => { const [px, py] = P(x, y); c.fillStyle = l; c.beginPath(); c.moveTo(px - tw / 2, py); c.lineTo(px, py + th / 2); c.lineTo(px, py + th / 2 - h); c.lineTo(px - tw / 2, py - h); c.fill(); c.fillStyle = r; c.beginPath(); c.moveTo(px + tw / 2, py); c.lineTo(px, py + th / 2); c.lineTo(px, py + th / 2 - h); c.lineTo(px + tw / 2, py - h); c.fill(); c.fillStyle = top; c.beginPath(); c.moveTo(px, py - th / 2 - h); c.lineTo(px + tw / 2, py - h); c.lineTo(px, py + th / 2 - h); c.lineTo(px - tw / 2, py - h); c.fill(); };
    const pal = CFG.iso || ['#2b2f55', '#7b6cf6', '#4b3fb0', '#3a2f8c'];
    for (let s = 0; s < N * 2; s++) for (let x = 0; x <= s; x++) { const y = s - x; if (y >= N || x >= N) continue;
      if (g[y][x] === 1) block(x, y, 22, pal[1], pal[2], pal[3]); else { tile(x, y, (x + y) % 2 ? pal[0] : '#262a4c');
        if (x === exitC[0] && y === exitC[1]) tile(x, y, items.every((q) => q.got) ? '#7cf7a0' : '#556');
        const it = items.find((q) => q.x === x && q.y === y && !q.got); if (it) { const [px, py] = P(x, y); k.circle(px, py - 10 + Math.sin(performance.now() / 200 + x) * 3, 6, '#f2d15c'); }
        for (const f of foes) if (Math.round(f.fx) === x && Math.round(f.fy) === y) { const [px, py] = P(f.fx, f.fy); k.circle(px, py - 9, 9, '#ff5f5f'); k.circle(px - 3, py - 11, 2, '#fff'); k.circle(px + 3, py - 11, 2, '#fff'); }
        if (Math.round(pl.fx) === x && Math.round(pl.fy) === y) { const [px, py] = P(pl.fx, pl.fy); k.rrect(px - 7, py - 24, 14, 22, 5, '#5ce1e6'); k.circle(px, py - 28, 6, '#f5e6c8'); if (swordT > 0) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(px, py - 14, 20, -swordT * 12, -swordT * 12 + 2); c.stroke(); } } } }
    k.text(`Llaves ${items.filter((q) => q.got).length}/${items.length}`, 470, 34, 14, '#f2d15c', 'right');
  }
  k.text(`${score}`, 10, 8, 16); k.text(`Nv ${level}  ${'♥'.repeat(Math.max(0, lives))}`, 470, 8, 14, '#ff9ad5', 'right');
});
