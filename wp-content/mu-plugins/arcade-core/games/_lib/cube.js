/* Cube Roller: rueda el bloque 1×1×2 hasta que caiga de pie en el agujero (niveles generados y comprobados por BFS) */
const k = Kit({ w: 640, h: 480, title: CFG.title, bg: '#101428' }), c = k.ctx;
let tiles, st, goal, level, moves, score, anim, fall, NX, NY;
/* estado: {x,y,o} o: 0 de pie, 1 tumbado en X (ocupa x,x+1), 2 tumbado en Y (ocupa y,y+1) */
const cellsOf = (s) => s.o === 0 ? [[s.x, s.y]] : s.o === 1 ? [[s.x, s.y], [s.x + 1, s.y]] : [[s.x, s.y], [s.x, s.y + 1]];
function roll(s, d) { const [dx, dy] = d; if (s.o === 0) { if (dx) return { x: dx > 0 ? s.x + 1 : s.x - 2, y: s.y, o: 1 }; return { x: s.x, y: dy > 0 ? s.y + 1 : s.y - 2, o: 2 }; }
  if (s.o === 1) { if (dx) return { x: dx > 0 ? s.x + 2 : s.x - 1, y: s.y, o: 0 }; return { x: s.x, y: s.y + dy, o: 1 }; }
  if (dy) return { x: s.x, y: dy > 0 ? s.y + 2 : s.y - 1, o: 0 }; return { x: s.x + dx, y: s.y, o: 2 }; }
const ok = (s) => cellsOf(s).every(([x, y]) => tiles.has(x + ',' + y));
const DD = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function build() {
  NX = Math.min(14, 8 + level); NY = Math.min(9, 5 + Math.floor(level / 2));
  for (let tries = 0; tries < 300; tries++) {
    tiles = new Set(); let x = 1, y = Math.floor(NY / 2); const target = Math.floor(NX * NY * (0.5 - Math.min(0.15, level * 0.02)));
    while (tiles.size < target) { tiles.add(x + ',' + y); const d = k.pick([[1, 0], [1, 0], [0, 1], [0, -1], [-1, 0]]); x = k.clamp(x + d[0], 0, NX - 1); y = k.clamp(y + d[1], 0, NY - 1); if (Math.random() < 0.3) tiles.add(k.clamp(x + 1, 0, NX - 1) + ',' + y); }
    const start = { x: 1, y: Math.floor(NY / 2), o: 0 }; if (!ok(start)) continue;
    const K = (s) => s.x + ',' + s.y + ',' + s.o, seen = new Map([[K(start), 0]]), q = [start]; let far = null, fd = 0;
    while (q.length) { const s = q.shift(), d = seen.get(K(s)); if (s.o === 0 && d > fd && d >= 4) { far = s; fd = d; } for (const dd of Object.values(DD)) { const n = roll(s, dd); if (ok(n) && !seen.has(K(n))) { seen.set(K(n), d + 1); q.push(n); } } }
    if (far && fd >= Math.min(14, 5 + level * 2)) { st = start; goal = [far.x, far.y]; moves = 0; fall = 0; anim = null; return; }
  }
  st = { x: 1, y: Math.floor(NY / 2), o: 0 }; goal = [2, Math.floor(NY / 2)]; tiles.add('2,' + goal[1]);
}
function reset() { if (!level || (k.st === 'over' && fall > 0 && !st.won)) { level = 1; score = 0; } build(); }
reset(); k.show(CFG.title, 'Desliza o usa las flechas para rodar el bloque. Mételo de pie en el agujero. ¡Si se sale de las baldosas, cae!');
const TW = 44, TH = 24;
const P = (x, y, z) => [320 + (x - y) * TW / 2 - (NX - NY) * TW / 4, 110 + (x + y) * TH / 2 - z];
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (fall > 0) { fall += dt; if (fall > 0.8) { if (st.won) { level++; k.st = 'over'; k.show('¡Dentro!', `${score} puntos<br>Toca para el nivel ${level}`); } else k.lose(CFG.id, score, 'El bloque cayó', `Nivel ${level}`); } return; }
  const d = k.swipe || ['up', 'down', 'left', 'right'].find((q) => k.hit.has(q)); if (!d) return;
  st = roll(st, DD[d]); moves++; k.sfx('click');
  if (!ok(st)) { fall = 0.01; navigator.vibrate && navigator.vibrate(80); return; }
  if (st.o === 0 && st.x === goal[0] && st.y === goal[1]) { st.won = true; score += Math.max(50, 300 - moves * 5) * level; fall = 0.01; }
}, () => {
  k.clear(); k.text(CFG.title, 14, 12, 22, '#f2d15c'); k.text(`Nivel ${level} · Movs ${moves} · ${score}`, 626, 14, 15, '#fff', 'right');
  const tileDraw = (x, y, col) => { const [a, b] = P(x, y, 0); c.fillStyle = col; c.beginPath(); c.moveTo(a, b - TH / 2); c.lineTo(a + TW / 2, b); c.lineTo(a, b + TH / 2); c.lineTo(a - TW / 2, b); c.fill(); c.fillStyle = '#2b2f57'; c.beginPath(); c.moveTo(a - TW / 2, b); c.lineTo(a, b + TH / 2); c.lineTo(a, b + TH / 2 + 8); c.lineTo(a - TW / 2, b + 8); c.fill(); c.fillStyle = '#20244a'; c.beginPath(); c.moveTo(a + TW / 2, b); c.lineTo(a, b + TH / 2); c.lineTo(a, b + TH / 2 + 8); c.lineTo(a + TW / 2, b + 8); c.fill(); };
  const list = [...tiles].map((s) => s.split(',').map(Number)).sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  for (const [x, y] of list) { if (x === goal[0] && y === goal[1]) { const [a, b] = P(x, y, 0); c.fillStyle = '#05060d'; c.beginPath(); c.moveTo(a, b - TH / 2); c.lineTo(a + TW / 2, b); c.lineTo(a, b + TH / 2); c.lineTo(a - TW / 2, b); c.fill(); } else tileDraw(x, y, (x + y) % 2 ? '#8b93d6' : '#7d86cc'); }
  const sink = fall > 0 ? fall * fall * 300 : 0; const cells = cellsOf(st); const h = st.o === 0 ? 2 : 1;
  const x0 = Math.min(...cells.map((q) => q[0])), y0 = Math.min(...cells.map((q) => q[1])), x1 = Math.max(...cells.map((q) => q[0])) + 1, y1 = Math.max(...cells.map((q) => q[1])) + 1;
  const V = (x, y, z) => P(x - 0.5, y - 0.5, z * TH * 1.15 - sink); const poly = (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach((p) => c.lineTo(...p)); c.fill(); };
  poly([V(x0, y1, 0), V(x1, y1, 0), V(x1, y1, h), V(x0, y1, h)], '#d9a321'); poly([V(x1, y0, 0), V(x1, y1, 0), V(x1, y1, h), V(x1, y0, h)], '#b8861a'); poly([V(x0, y0, h), V(x1, y0, h), V(x1, y1, h), V(x0, y1, h)], '#f2d15c');
});
