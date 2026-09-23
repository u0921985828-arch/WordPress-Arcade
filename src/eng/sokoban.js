/* Sokoban (mode 'push': generado por retroceso, siempre resoluble) e Ice (mode 'ice': deslizar hasta la salida) */
const M = CFG.mode, k = Kit({ w: 480, h: 540, title: CFG.title, bg: '#1b1a2e' }), c = k.ctx;
const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
let N, wall, goals, boxes, pl, level, moves, hist, exitC, total;
const K = (x, y) => x + ',' + y;
function genPush() {
  N = 7 + Math.min(3, Math.floor(level / 3)); const nb = Math.min(5, 2 + Math.floor(level / 2));
  for (let tries = 0; tries < 200; tries++) {
    wall = new Set(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (x === 0 || y === 0 || x === N - 1 || y === N - 1 || Math.random() < 0.12) wall.add(K(x, y));
    const free = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (!wall.has(K(x, y))) free.push([x, y]); if (free.length < nb + 6) continue;
    k.shuffle(free); goals = free.slice(0, nb); boxes = goals.map((g) => [...g]); pl = [...free[nb]];
    for (let i = 0; i < 400 + level * 60; i++) { const d = D[k.pick(Object.keys(D))], nx = pl[0] + d[0], ny = pl[1] + d[1]; if (wall.has(K(nx, ny)) || boxes.some((b) => b[0] === nx && b[1] === ny)) continue;
      const behind = boxes.find((b) => b[0] === pl[0] - d[0] && b[1] === pl[1] - d[1]); const pull = behind && Math.random() < 0.7; const op = [...pl]; pl = [nx, ny]; if (pull) { behind[0] = op[0]; behind[1] = op[1]; } }
    const onGoal = boxes.filter((b) => goals.some((g) => g[0] === b[0] && g[1] === b[1])).length; if (onGoal <= Math.max(0, nb - 2) && onGoal < nb) return;
  }
}
function slideEnd(x, y, d) { while (true) { const nx = x + d[0], ny = y + d[1]; if (wall.has(K(nx, ny))) return [x, y]; x = nx; y = ny; if (x === exitC[0] && y === exitC[1]) return [x, y]; } }
function genIce() {
  N = 9 + Math.min(4, Math.floor(level / 2));
  for (let tries = 0; tries < 400; tries++) {
    wall = new Set(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (x === 0 || y === 0 || x === N - 1 || y === N - 1 || Math.random() < 0.13) wall.add(K(x, y));
    pl = [k.ri(1, N - 2), k.ri(1, N - 2)]; if (wall.has(K(...pl))) continue; exitC = [k.ri(1, N - 2), k.ri(1, N - 2)]; if (wall.has(K(...exitC))) continue;
    const seen = new Map([[K(...pl), 0]]), q = [pl]; let found = -1;
    while (q.length) { const cur = q.shift(), dd = seen.get(K(...cur)); if (cur[0] === exitC[0] && cur[1] === exitC[1]) { found = dd; break; } for (const d of Object.values(D)) { const e = slideEnd(cur[0], cur[1], d), ke = K(...e); if (!seen.has(ke)) { seen.set(ke, dd + 1); q.push(e); } } }
    if (found >= Math.min(9, 3 + level)) return;
  }
}
function build() { moves = 0; hist = []; goals = []; boxes = []; if (M === 'push') genPush(); else genIce(); }
function reset() { level = 1; total = 0; build(); }
reset(); k.show(CFG.title, M === 'push' ? 'Empuja todas las cajas a las marcas. Desliza o usa flechas. B = deshacer.' : 'Sobre el hielo resbalas hasta chocar. Llega a la salida en pocos movimientos. B = reiniciar.');
function move(d) {
  if (M === 'ice') { const e = slideEnd(pl[0], pl[1], d); if (e[0] === pl[0] && e[1] === pl[1]) return; pl = e; moves++; k.sfx('click'); if (pl[0] === exitC[0] && pl[1] === exitC[1]) win(); return; }
  const nx = pl[0] + d[0], ny = pl[1] + d[1]; if (wall.has(K(nx, ny))) return; const b = boxes.find((q) => q[0] === nx && q[1] === ny);
  if (b) { const bx = nx + d[0], by = ny + d[1]; if (wall.has(K(bx, by)) || boxes.some((q) => q[0] === bx && q[1] === by)) return; hist.push(JSON.stringify([pl, boxes])); b[0] = bx; b[1] = by; } else hist.push(JSON.stringify([pl, boxes]));
  pl = [nx, ny]; moves++; k.sfx(b ? 'pop' : 'click'); if (boxes.every((q) => goals.some((g) => g[0] === q[0] && g[1] === q[1]))) win();
}
let winT = 0; function win() { total += Math.max(50, 400 - moves * 5) * level; winT = 0.8; navigator.vibrate && navigator.vibrate(30); }
let startPl;
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (winT > 0) { winT -= dt; if (winT <= 0) { level++; build(); } return; }
  const d = k.swipe || ['up', 'down', 'left', 'right'].find((q) => k.hit.has(q)); if (d) move(D[d]);
  if (k.hit.has('b') || (k.tap && k.ptr.y > 500)) { if (M === 'push' && hist.length) { const [p2, b2] = JSON.parse(hist.pop()); pl = p2; boxes = b2; moves++; } else if (M === 'ice') { const lv = level; build(); level = lv; } }
}, () => {
  k.clear(); const S = Math.floor(460 / N), ox = (480 - S * N) / 2, oy = 60;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = ox + x * S, Y = oy + y * S;
    if (wall.has(K(x, y))) { k.rect(X, Y, S, S, '#3a3566'); k.rect(X, Y, S, 4, '#5b53a0'); } else k.rect(X, Y, S, S, M === 'ice' ? ((x + y) % 2 ? '#bfe6ff' : '#aedcf7') : '#262440'); }
  for (const g of goals) { c.strokeStyle = '#f2d15c'; c.lineWidth = 3; c.strokeRect(ox + g[0] * S + S * 0.25, oy + g[1] * S + S * 0.25, S * 0.5, S * 0.5); }
  if (exitC) if (M === 'ice') k.rrect(ox + exitC[0] * S + 4, oy + exitC[1] * S + 4, S - 8, S - 8, 6, '#7cf7a0');
  for (const b of boxes) { const on = goals.some((g) => g[0] === b[0] && g[1] === b[1]); k.rrect(ox + b[0] * S + 4, oy + b[1] * S + 4, S - 8, S - 8, 6, on ? '#7cf7a0' : '#c98a4b'); k.rect(ox + b[0] * S + S * 0.2, oy + b[1] * S + S / 2 - 2, S * 0.6, 4, 'rgba(0,0,0,.25)'); }
  k.circle(ox + pl[0] * S + S / 2, oy + pl[1] * S + S / 2, S * 0.36, M === 'ice' ? '#ff5fa2' : '#5ce1e6');
  k.text(`Nivel ${level}  ·  Movs ${moves}`, 12, 16, 18); k.text(`${total}`, 468, 16, 18, '#f2d15c', 'right');
  k.rrect(140, 506, 200, 30, 15, '#34305a'); k.text(M === 'push' ? '↶ Deshacer' : '↺ Reiniciar', 240, 513, 15, '#fff', 'center');
  if (winT > 0) k.text('¡Nivel superado!', 240, 250, 30, '#7cf7a0', 'center');
});
