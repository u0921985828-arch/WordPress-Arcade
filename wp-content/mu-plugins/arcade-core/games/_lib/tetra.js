/* Motor compartido de Tetra Drop y Tetra Drop Marathon. window.TETRA_MODE = 'classic' | 'marathon' */
const MODE = window.TETRA_MODE || 'classic';
const k = Kit({ w: 360, h: 640, title: MODE === 'marathon' ? 'Tetra Drop Marathon' : 'Tetra Drop', bg: '#14132b' }), c = k.ctx;
const COLS = 10, ROWS = 20, S = 28, OX = 12, OY = 60;
const SHAPES = { I: [[0,1],[1,1],[2,1],[3,1]], O: [[1,0],[2,0],[1,1],[2,1]], T: [[1,0],[0,1],[1,1],[2,1]], S: [[1,0],[2,0],[0,1],[1,1]], Z: [[0,0],[1,0],[1,1],[2,1]], J: [[0,0],[0,1],[1,1],[2,1]], L: [[2,0],[0,1],[1,1],[2,1]] };
const COLORS = { I: '#5ce1e6', O: '#f2d15c', T: '#b98cff', S: '#7cf7a0', Z: '#ff6b6b', J: '#5b8cff', L: '#ffa94d' };
let board, cur, next, bag, lines, level, score, fall, lock, das;
const newBag = () => Object.keys(SHAPES).sort(() => Math.random() - 0.5);
const take = () => { if (!bag.length) bag = newBag(); const t = bag.pop(); return { t, x: 3, y: 0, cells: SHAPES[t].map((p) => [...p]) }; };
const fits = (cells, x, y) => cells.every(([cx, cy]) => { const X = cx + x, Y = cy + y; return X >= 0 && X < COLS && Y < ROWS && (Y < 0 || !board[Y][X]); });
function rotate() {
  if (cur.t === 'O') return;
  const n = cur.t === 'I' ? 3 : 2, rot = cur.cells.map(([x, y]) => [n - y, x]);
  for (const kick of [0, -1, 1, -2, 2]) if (fits(rot, cur.x + kick, cur.y)) { cur.cells = rot; cur.x += kick; if (resets++ < 15) lock = 0; return; }
}
let resets = 0;
const move = (dx, dy) => { if (fits(cur.cells, cur.x + dx, cur.y + dy)) { cur.x += dx; cur.y += dy; if (dy > 0) resets = 0; else if (resets++ < 15) lock = 0; return true; } return false; };
const speed = () => Math.max(0.05, 0.8 * Math.pow(0.85, level - 1));
function place() {
  for (const [x, y] of cur.cells) { if (cur.y + y < 0) return over(); board[cur.y + y][cur.x + x] = cur.t; }
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) if (board[y].every(Boolean)) { board.splice(y, 1); board.unshift(Array(COLS).fill(null)); cleared++; y++; }
  if (cleared) { k.sfx(cleared >= 4 ? 'win' : 'coin'); k.shake(cleared * 2); if (cleared >= 4) k.float('¡TETRA!', k.w / 2, k.h / 3, '#f2d15c'); lines += cleared; score += [0, 100, 300, 500, 800][cleared] * level; level = Math.floor(lines / 10) + (MODE === 'marathon' ? 5 : 1); }
  if (MODE === 'marathon' && lines >= 150) { k.st = 'over'; k.show('¡Maratón completada!', `Puntos: ${score} · Récord ${k.best('tetra-marathon', score)} · Toca para repetir`); return; }
  cur = next; next = take(); lock = 0; fall = 0; resets = 0;
  if (!fits(cur.cells, cur.x, cur.y)) over();
}
function over() { k.st = 'over'; k.sfx('lose'); k.shake(6); k.show('Fin', `Líneas: ${lines} · Puntos: ${score} · Récord ${k.best('tetra-' + MODE, score)} · Toca para repetir`); }
function hardDrop() { let d = 0; while (move(0, 1)) d++; score += d * 2; k.sfx('hit'); k.shake(3); place(); }
function reset() { board = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); bag = newBag(); cur = take(); next = take(); lines = 0; level = MODE === 'marathon' ? 5 : 1; score = 0; fall = 0; lock = 0; das = 0; }
reset();
k.show(document.title, MODE === 'marathon' ? 'Llega a 150 líneas empezando en nivel 5. ← → mover · ↑/A girar · ↓ bajar · B soltar' : 'Desliza ← → para mover, toca para girar, desliza ↓ para soltar. Teclado: ←→ ↑/A ↓ B');
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (k.hit.has('left')) { move(-1, 0); das = -0.17; } if (k.hit.has('right')) { move(1, 0); das = -0.17; }
  if (k.held.has('left') || k.held.has('right')) { das += dt; while (das > 0.05) { das -= 0.05; move(k.held.has('left') ? -1 : 1, 0); } }
  if (k.hit.has('up') || k.hit.has('a')) rotate();
  if (k.hit.has('b')) return hardDrop();
  if (k.ptr.hit) { k.ptr.moved = false; resets = 0; }
  if (!k.ptr.moved) { if (k.swipe === 'left') move(-1, 0); if (k.swipe === 'right') move(1, 0); }
  if (k.swipe === 'down') return hardDrop(); if (k.tap || k.swipe === 'up') rotate();
  if (k.ptr.down && k.ptr.sx !== undefined) { const dx = Math.round((k.ptr.x - k.ptr.sx) / S); if (dx) { if (move(Math.sign(dx), 0)) k.ptr.sx += Math.sign(dx) * S; k.ptr.moved = true; } }
  fall += dt * (k.held.has('down') ? 12 : 1);
  if (fall >= speed()) { fall = 0; if (!move(0, 1)) { lock += speed(); } }
  if (!fits(cur.cells, cur.x, cur.y + 1)) { lock += dt; if (lock > 0.5) place(); }
}, () => {
  c.fillStyle = '#14132b'; c.fillRect(0, 0, 360, 640);
  c.fillStyle = '#1d1c3d'; c.fillRect(OX, OY, COLS * S, ROWS * S);
  const cell = (x, y, col, a) => { c.globalAlpha = a || 1; c.fillStyle = col; c.fillRect(OX + x * S + 1, OY + y * S + 1, S - 2, S - 2); c.globalAlpha = 1; };
  board.forEach((row, y) => row.forEach((t, x) => t && cell(x, y, COLORS[t])));
  if (k.st === 'play') {
    let gy = cur.y; while (fits(cur.cells, cur.x, gy + 1)) gy++;
    for (const [x, y] of cur.cells) { cell(cur.x + x, gy + y, COLORS[cur.t], 0.25); if (cur.y + y >= 0) cell(cur.x + x, cur.y + y, COLORS[cur.t]); }
  }
  k.text(`${score}`, 12, 14, 22); k.text(`Líneas ${lines} · Nv ${level}`, 12, 38, 13, '#b8b6e0');
  k.text('Siguiente', 306, 64, 12, '#b8b6e0', 'center');
  for (const [x, y] of SHAPES[next.t]) { c.fillStyle = COLORS[next.t]; c.fillRect(290 + x * 12, 84 + y * 12, 11, 11); }
});
