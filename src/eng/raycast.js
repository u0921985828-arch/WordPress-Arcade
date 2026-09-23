/* Crystal Labyrinth — laberinto en primera persona (raycasting) */
const k = Kit({ w: 480, h: 480, title: CFG.title, bg: '#06070f' }), c = k.ctx;
let g, N, px, py, pa, crystals, got, level, score, time;
function carve(n) { const m = Array.from({ length: n }, () => Array(n).fill(1)), st = [[1, 1]]; m[1][1] = 0;
  while (st.length) { const [x, y] = st[st.length - 1]; const nb = k.shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]]).filter(([dx, dy]) => x + dx > 0 && y + dy > 0 && x + dx < n - 1 && y + dy < n - 1 && m[y + dy][x + dx] === 1);
    if (!nb.length) { st.pop(); continue; } const [dx, dy] = nb[0]; m[y + dy / 2][x + dx / 2] = 0; m[y + dy][x + dx] = 0; st.push([x + dx, y + dy]); } return m; }
function build() { N = 9 + level * 2; g = carve(N); px = 1.5; py = 1.5; pa = 0; got = 0; const cells = []; for (let y = 1; y < N; y++) for (let x = 1; x < N; x++) if (!g[y][x] && x + y > 5) cells.push([x, y]); k.shuffle(cells); crystals = cells.slice(0, 3).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 })); g[N - 2][N - 2] = 0; time = 0; }
function reset() { level = 1; score = 0; build(); }
reset(); k.show(CFG.title, 'Encuentra 3 cristales y sal por el portal verde. ↑↓ andar, ←→ girar. Táctil: mantén y arrastra.');
const solid = (x, y) => !g[Math.floor(y)] || g[Math.floor(y)][Math.floor(x)] !== 0;
k.run((dt) => {
  if (!k.gate(reset)) return;
  time += dt; let mv = 0, rot = 0;
  if (k.held.has('up')) mv = 1; if (k.held.has('down')) mv = -1; if (k.held.has('left')) rot = -1; if (k.held.has('right')) rot = 1;
  if (k.ptr.down) { const dx = (k.ptr.x - k.ptr.sx) / 80, dy = (k.ptr.y - k.ptr.sy) / 80; rot = k.clamp(dx, -1, 1); mv = k.clamp(-dy, -1, 1); if (Math.abs(dy) < 0.15) mv = 0.8; }
  pa += rot * 2.4 * dt; const nx = px + Math.cos(pa) * mv * 2.6 * dt, ny = py + Math.sin(pa) * mv * 2.6 * dt;
  if (!solid(nx + Math.sign(nx - px) * 0.2, py)) px = nx; if (!solid(px, ny + Math.sign(ny - py) * 0.2)) py = ny;
  for (const cr of crystals) if (!cr.got && Math.hypot(cr.x - px, cr.y - py) < 0.5) { cr.got = true; got++; k.sfx('coin'); navigator.vibrate && navigator.vibrate(25); }
  if (got === 3 && Math.hypot(N - 1.5 - px, N - 1.5 - py) < 0.6) { score += Math.max(100, 1000 - Math.floor(time * 5)) * level; level++; build(); }
}, () => {
  const W = 480, H = 480, cols = 160, FOV = 1.05, zb = [];
  const sky = c.createLinearGradient(0, 0, 0, H / 2); sky.addColorStop(0, '#0b0d26'); sky.addColorStop(1, '#2a1f4f'); c.fillStyle = sky; c.fillRect(0, 0, W, H / 2);
  k.rect(0, H / 2, W, H / 2, '#141528');
  for (let i = 0; i < cols; i++) {
    const a = pa - FOV / 2 + FOV * i / cols, dx = Math.cos(a), dy = Math.sin(a);
    let mx = Math.floor(px), my = Math.floor(py); const ddx = Math.abs(1 / dx), ddy = Math.abs(1 / dy), sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
    let tx = (dx < 0 ? px - mx : mx + 1 - px) * ddx, ty = (dy < 0 ? py - my : my + 1 - py) * ddy, side = 0, cell = 0;
    for (let s = 0; s < 64; s++) { if (tx < ty) { tx += ddx; mx += sx; side = 0; } else { ty += ddy; my += sy; side = 1; } cell = g[my] ? g[my][mx] : 1; if (cell !== 0) break; }
    const dist = (side ? ty - ddy : tx - ddx) * Math.cos(a - pa), h = Math.min(H * 2, H / Math.max(0.1, dist)); zb[i] = dist;
    const shade = Math.max(0.15, 1 - dist / 9), base = side ? [123, 108, 246] : [92, 225, 230];
    c.fillStyle = `rgb(${base.map((v) => Math.floor(v * shade)).join(',')})`; c.fillRect(i * W / cols, H / 2 - h / 2, W / cols + 1, h);
  }
  const sprites = crystals.filter((q) => !q.got).map((q) => ({ ...q, col: '#f2d15c' })); if (got === 3) sprites.push({ x: N - 1.5, y: N - 1.5, col: '#7cf7a0', big: 1 });
  sprites.sort((a, b) => Math.hypot(b.x - px, b.y - py) - Math.hypot(a.x - px, a.y - py)).forEach((s) => {
    const d = Math.hypot(s.x - px, s.y - py); let ang = Math.atan2(s.y - py, s.x - px) - pa; while (ang > Math.PI) ang -= 6.283; while (ang < -Math.PI) ang += 6.283;
    if (Math.abs(ang) > FOV / 2 + 0.2) return; const sxp = (ang / FOV + 0.5) * W, col = Math.floor(sxp / (W / cols)); if (zb[col] !== undefined && zb[col] < d) return;
    const size = (s.big ? 280 : 160) / d, y = H / 2 + Math.sin(performance.now() / 300) * 6;
    c.fillStyle = s.col; c.beginPath(); c.moveTo(sxp, y - size / 2); c.lineTo(sxp + size / 3, y); c.lineTo(sxp, y + size / 2); c.lineTo(sxp - size / 3, y); c.fill();
  });
  const ms = 5; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x]) k.rect(470 - N * ms + x * ms, 10 + y * ms, ms, ms, 'rgba(255,255,255,.25)');
  k.circle(470 - N * ms + px * ms, 10 + py * ms, 2.5, '#ff5fa2');
  k.text(`Cristales ${got}/3  Nv ${level}`, 10, 10, 16, '#f2d15c'); k.text(`${score}`, 10, 32, 14);
});
