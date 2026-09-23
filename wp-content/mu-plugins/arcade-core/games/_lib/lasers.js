/* Laser Mirrors: gira los espejos para llevar el láser al objetivo */
const k = Kit({ w: 480, h: 560, title: CFG.title, bg: '#0c0f1f' }), c = k.ctx;
let N, S, OX, OY = 80, grid, emit, target, level, done, beam, score;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
function reflect(d, m) { const [dx, dy] = DIRS[d]; const nd = m === 1 ? [-dy, -dx] : [dy, dx]; return DIRS.findIndex((q) => q[0] === nd[0] && q[1] === nd[1]); }
function trace() { const pts = [[emit.x, emit.y]]; let x = emit.x, y = emit.y, d = emit.d, hit = false; for (let s = 0; s < 200; s++) { x += DIRS[d][0]; y += DIRS[d][1]; if (x < 0 || y < 0 || x >= N || y >= N) { pts.push([x, y]); break; } if (x === target[0] && y === target[1]) { pts.push([x, y]); hit = true; break; } const cell = grid[y][x]; if (cell.block) { pts.push([x, y]); break; } if (cell.m) { d = reflect(d, cell.m); pts.push([x, y]); } } return { pts, hit }; }
function build() {
  N = Math.min(9, 5 + Math.floor(level / 2)); S = Math.floor(440 / N); OX = (480 - N * S) / 2; done = false;
  for (let tries = 0; tries < 500; tries++) {
    grid = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ m: 0 }))); emit = { x: -1, y: k.ri(0, N - 1), d: 0 };
    let x = emit.x, y = emit.y, d = 0, turns = 0; const used = new Set(); let ok = false; const want = Math.min(6, 2 + level);
    for (let s = 0; s < N * 4; s++) { x += DIRS[d][0]; y += DIRS[d][1]; if (x < 0 || y < 0 || x >= N || y >= N || used.has(x + ',' + y)) break; used.add(x + ',' + y);
      if (turns >= want && Math.random() < 0.4) { target = [x, y]; ok = true; break; }
      if (Math.random() < 0.35) { const nd = (d + (Math.random() < 0.5 ? 1 : 3)) % 4; const m = [1, 2].find((mm) => reflect(d, mm) === nd); grid[y][x].m = m; grid[y][x].fixed = true; d = nd; turns++; } }
    if (!ok) continue;
    for (let i = 0; i < N; i++) { const rx = k.ri(0, N - 1), ry = k.ri(0, N - 1); if (!used.has(rx + ',' + ry) && !(rx === target[0] && ry === target[1])) { if (Math.random() < 0.5) grid[ry][rx].m = k.ri(1, 2); else grid[ry][rx].block = true; } }
    for (const row of grid) for (const cl of row) if (cl.m && Math.random() < 0.6) cl.m = 3 - cl.m;
    if (!trace().hit) break;
  }
  beam = trace();
}
function reset() { if (!level) { level = 1; score = 0; } build(); }
reset(); k.show(CFG.title, 'Toca los espejos para girarlos y guía el láser hasta el objetivo verde.');
k.run(() => {
  if (!k.gate(reset) || done) return;
  if (k.ptr.hit) { const x = Math.floor((k.ptr.x - OX) / S), y = Math.floor((k.ptr.y - OY) / S); if (grid[y] && grid[y][x] && grid[y][x].m) { grid[y][x].m = 3 - grid[y][x].m; beam = trace(); k.sfx('click');
    if (beam.hit) { done = true; score += 100 * level; setTimeout(() => { k.st = 'over'; k.show('¡Objetivo alcanzado!', `Nivel ${level} · ${score} puntos<br>Toca para el siguiente`); level++; }, 600); } } }
}, () => {
  k.clear(); k.text(CFG.title, 20, 22, 24, '#f2d15c'); k.text(`Nivel ${level}`, 460, 26, 16, '#fff', 'right');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = OX + x * S, Y = OY + y * S, cl = grid[y][x]; k.rect(X + 1, Y + 1, S - 2, S - 2, '#161b33');
    if (cl.block) k.rrect(X + 6, Y + 6, S - 12, S - 12, 6, '#3a3f66');
    if (cl.m) { c.strokeStyle = '#dfe7ff'; c.lineWidth = 5; c.beginPath(); if (cl.m === 1) { c.moveTo(X + 8, Y + S - 8); c.lineTo(X + S - 8, Y + 8); } else { c.moveTo(X + 8, Y + 8); c.lineTo(X + S - 8, Y + S - 8); } c.stroke(); } }
  const P = ([x, y]) => [OX + x * S + S / 2, OY + y * S + S / 2];
  const [tx, ty] = P(target); k.circle(tx, ty, S * 0.32, beam.hit ? '#7cf7a0' : '#2f7a55'); k.circle(tx, ty, S * 0.14, '#0c0f1f');
  const [ex, ey] = P([emit.x, emit.y]); k.rrect(ex - S * 0.1, ey - S * 0.25, S * 0.45, S * 0.5, 6, '#ff5f5f');
  c.strokeStyle = '#ff3b6b'; c.lineWidth = 3; c.shadowColor = '#ff3b6b'; c.shadowBlur = 10; c.beginPath(); beam.pts.forEach((p) => c.lineTo(...P(p))); c.stroke(); c.shadowBlur = 0;
});
