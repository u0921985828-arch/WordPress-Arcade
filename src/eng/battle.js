/* Battle Grid (hundir la flota) contra la IA */
const k = Kit({ w: 480, h: 640, title: CFG.title, bg: '#0e2238' }), c = k.ctx, N = 10, S = 30;
const SHIPS = [5, 4, 3, 3, 2];
let mine, theirs, myShots, aiShots, turn, msg, aiT, targets, wins, placing;
function fleet() { const g = Array.from({ length: N }, () => Array(N).fill(-1)); SHIPS.forEach((len, id) => { while (true) { const h = Math.random() < 0.5, x = k.ri(0, h ? N - len : N - 1), y = k.ri(0, h ? N - 1 : N - len); const cells = Array.from({ length: len }, (_, i) => [x + (h ? i : 0), y + (h ? 0 : i)]); if (cells.every(([cx, cy]) => g[cy][cx] === -1)) { cells.forEach(([cx, cy]) => (g[cy][cx] = id)); break; } } }); return g; }
function sunk(g, shots, id) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === id && !shots[y][x]) return false; return true; }
function allSunk(g, shots) { return SHIPS.every((_, id) => sunk(g, shots, id)); }
function build() { mine = fleet(); theirs = fleet(); myShots = Array.from({ length: N }, () => Array(N).fill(0)); aiShots = Array.from({ length: N }, () => Array(N).fill(0)); turn = 'me'; msg = 'Dispara al radar enemigo'; targets = []; }
function reset() { if (wins === undefined) wins = 0; build(); }
reset(); k.show(CFG.title, 'Toca el radar de arriba para disparar. Hunde los 5 barcos enemigos antes de que hundan los tuyos.');
const EX = 90, EY = 60, MX = 165, MY = 420, MS = 18;
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (turn === 'ai') { aiT -= dt; if (aiT > 0) return; let shot;
    while (targets.length && !shot) { const [x, y] = targets.pop(); if (x >= 0 && y >= 0 && x < N && y < N && !aiShots[y][x]) shot = [x, y]; }
    if (!shot) { const cand = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!aiShots[y][x] && (x + y) % 2 === 0) cand.push([x, y]); if (!cand.length) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!aiShots[y][x]) cand.push([x, y]); shot = k.pick(cand); }
    const [x, y] = shot; aiShots[y][x] = 1; const id = mine[y][x];
    if (id >= 0) { targets.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); msg = sunk(mine, aiShots, id) ? 'La IA hundió uno de tus barcos' : 'La IA te ha dado'; navigator.vibrate && navigator.vibrate(60); if (allSunk(mine, aiShots)) { k.st = 'over'; k.show('Flota hundida', `Racha: ${wins} · Récord ${k.best(CFG.id, wins)}<br>Toca para otra partida`); wins = 0; } }
    else msg = 'La IA falló. Tu turno'; turn = 'me'; return; }
  if (!k.ptr.hit) return; const x = Math.floor((k.ptr.x - EX) / S), y = Math.floor((k.ptr.y - EY) / S); if (x < 0 || y < 0 || x >= N || y >= N || myShots[y][x]) return;
  myShots[y][x] = 1; const id = theirs[y][x]; if (id >= 0) { k.burst(EX + x * S + S / 2, EY + y * S + S / 2, '#ff9a3c', 14); k.sfx('explode'); } else k.sfx('pop');
  if (id >= 0) { msg = sunk(theirs, myShots, id) ? `¡Hundido! (${SHIPS[id]} casillas)` : '¡Tocado!'; if (allSunk(theirs, myShots)) { wins++; k.st = 'over'; k.show('¡Victoria!', `Racha: ${wins} · Récord ${k.best(CFG.id, wins)}<br>Toca para otra partida`); return; } }
  else msg = 'Agua';
  turn = 'ai'; aiT = 0.7;
}, () => {
  k.clear(); k.text(CFG.title, 20, 16, 22, '#f2d15c'); k.text(msg, 460, 20, 14, '#fff', 'right');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = EX + x * S, Y = EY + y * S, s = myShots[y][x], hit = s && theirs[y][x] >= 0; k.rect(X + 1, Y + 1, S - 2, S - 2, hit ? (sunk(theirs, myShots, theirs[y][x]) ? '#8a2433' : '#e0455a') : s ? '#1d4466' : '#15375a'); if (s && !hit) k.circle(X + S / 2, Y + S / 2, 4, '#8fb8de'); }
  k.text('Tu flota', 240, MY - 26, 14, '#b8d4f0', 'center');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = MX + x * MS, Y = MY + y * MS, sh = mine[y][x] >= 0, s = aiShots[y][x]; k.rect(X + 1, Y + 1, MS - 2, MS - 2, sh ? (s ? '#e0455a' : '#8aa0b8') : s ? '#1d4466' : '#15375a'); }
  let left = SHIPS.filter((_, id) => !sunk(theirs, myShots, id)).length; k.text(`Barcos enemigos a flote: ${left}`, 240, EY + N * S + 10, 14, '#fff', 'center');
});
