/* Nonogramas. CFG.size, CFG.daily */
const N = CFG.size || 10, k = Kit({ w: 480, h: 560, title: CFG.title, bg: '#16213a' }), c = k.ctx;
const CLUE = N > 10 ? 110 : 120, S = Math.floor((480 - CLUE - 12) / N), OX = CLUE, OY = CLUE + 60;
let sol, grid, rows, cols, solved, paint, mistakes, puzzle, seedR;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clue = (line) => { const r = []; let n = 0; for (const v of line) { if (v) n++; else if (n) { r.push(n); n = 0; } } if (n) r.push(n); return r.length ? r : [0]; };
function build() {
  const d = new Date(); seedR = CFG.daily ? mulberry(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + puzzle * 7919) : Math.random;
  sol = Array.from({ length: N }, () => Array.from({ length: N }, () => seedR() < 0.58));
  grid = Array.from({ length: N }, () => Array(N).fill(0)); rows = sol.map(clue); cols = sol[0].map((_, x) => clue(sol.map((r) => r[x]))); solved = false;
}
function check() { const ok = grid.every((r, y) => clue(r.map((v) => v === 1)).join() === rows[y].join()) && cols.every((cl, x) => clue(grid.map((r) => r[x] === 1)).join() === cl.join()); if (ok) { solved = true; setTimeout(() => { k.show('¡Resuelto!', CFG.daily ? 'Toca para el siguiente puzzle del día' : 'Toca para un nuevo puzzle'); k.st = 'over'; }, 500); } }
function reset() { if (puzzle === undefined) puzzle = 0; else puzzle++; build(); }
reset(); k.show(CFG.title, 'Rellena las casillas según las pistas de filas y columnas. Toca o arrastra para pintar; toca de nuevo para marcar ✕.');
k.run(() => {
  if (!k.gate(reset) || solved) return;
  const cx = Math.floor((k.ptr.x - OX) / S), cy = Math.floor((k.ptr.y - OY) / S), inb = cx >= 0 && cy >= 0 && cx < N && cy < N;
  if (k.ptr.hit && inb) { paint = (grid[cy][cx] + 1) % 3; k.sfx('click'); }
  if (k.ptr.down && inb && paint !== undefined && grid[cy][cx] !== paint) { grid[cy][cx] = paint; if (paint === 1) check(); }
  if (k.ptr.up) paint = undefined;
}, () => {
  k.clear(); k.text(CFG.title, 12, 12, 22, '#f2d15c'); if (CFG.daily) k.text(`Puzzle del día #${puzzle + 1}`, 12, 40, 13, '#b8b6e0');
  for (let y = 0; y < N; y++) { k.text(rows[y].join(' '), OX - 6, OY + y * S + S / 2 - 7, N > 10 ? 11 : 13, grid[y] && clue(grid[y].map((v) => v === 1)).join() === rows[y].join() ? '#7cf7a0' : '#f5f1e6', 'right'); }
  for (let x = 0; x < N; x++) cols[x].forEach((n, i) => k.text(n, OX + x * S + S / 2, OY - 8 - (cols[x].length - i) * 14, N > 10 ? 11 : 13, clue(grid.map((r) => r[x] === 1)).join() === cols[x].join() ? '#7cf7a0' : '#f5f1e6', 'center'));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = grid[y][x]; k.rect(OX + x * S + 1, OY + y * S + 1, S - 2, S - 2, v === 1 ? '#5ce1e6' : '#24304f');
    if (v === 2) { c.strokeStyle = '#ff6b6b'; c.lineWidth = 2; c.beginPath(); c.moveTo(OX + x * S + 5, OY + y * S + 5); c.lineTo(OX + x * S + S - 5, OY + y * S + S - 5); c.moveTo(OX + x * S + S - 5, OY + y * S + 5); c.lineTo(OX + x * S + 5, OY + y * S + S - 5); c.stroke(); } }
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; for (let i = 0; i <= N; i += 5) { c.beginPath(); c.moveTo(OX + i * S, OY); c.lineTo(OX + i * S, OY + N * S); c.moveTo(OX, OY + i * S); c.lineTo(OX + N * S, OY + i * S); c.stroke(); }
});
