/* Flow Lines: une los puntos del mismo color y llena el tablero */
const k = Kit({ w: 480, h: 580, title: CFG.title, bg: '#101424' }), c = k.ctx;
const COL = ['#ff5f5f', '#5ce1e6', '#f2d15c', '#7cf7a0', '#b98cff', '#ffa94d', '#ff9ad5', '#6c8cff', '#c7f464', '#ffffff'];
let N, S, OX, OY = 90, ends, paths, drag, level, score, done;
function build() {
  N = Math.min(9, 5 + Math.floor((level - 1) / 2)); S = Math.floor(440 / N); OX = (480 - S * N) / 2; done = false;
  let path = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) path.push([y % 2 ? N - 1 - x : x, y]);
  const adj = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
  for (let it = 0; it < N * N * 30; it++) { if (Math.random() < 0.5) path.reverse(); const end = path[path.length - 1]; const nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [end[0] + dx, end[1] + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N);
    const nb = k.pick(nbs); const i = path.findIndex((p) => p[0] === nb[0] && p[1] === nb[1]); if (i < 0 || i === path.length - 2) continue; path = path.slice(0, i + 1).concat(path.slice(i + 1).reverse()); }
  const segs = []; let i = 0; const nCol = Math.min(COL.length, Math.max(3, Math.round(N * N / (N + 2))));
  while (i < path.length) { const remain = path.length - i, left = nCol - segs.length; let len = left <= 1 ? remain : k.ri(3, Math.max(3, Math.min(remain - 3 * (left - 1), Math.ceil(remain / left) + 3))); if (remain - len < 3 && remain - len > 0) len = remain; segs.push(path.slice(i, i + len)); i += len; }
  ends = segs.map((s) => [s[0], s[s.length - 1]]); paths = segs.map(() => []);
}
const K = (p) => p[0] + ',' + p[1];
function owner(p) { for (let i = 0; i < paths.length; i++) if (paths[i].some((q) => q[0] === p[0] && q[1] === p[1])) return i; return -1; }
function endOf(p) { return ends.findIndex((e) => (e[0][0] === p[0] && e[0][1] === p[1]) || (e[1][0] === p[0] && e[1][1] === p[1])); }
function connected(i) { const pa = paths[i]; if (pa.length < 2) return false; const a = pa[0], b = pa[pa.length - 1], [e1, e2] = ends[i]; return (K(a) === K(e1) && K(b) === K(e2)) || (K(a) === K(e2) && K(b) === K(e1)); }
function reset() { if (!level || k.st === 'over' && !done) { level = 1; score = 0; } build(); }
reset(); k.show(CFG.title, 'Arrastra desde un punto hasta el otro del mismo color. Las líneas no pueden cruzarse. Llena todo el tablero.');
k.run(() => {
  if (!k.gate(reset) || done) return;
  const cell = [Math.floor((k.ptr.x - OX) / S), Math.floor((k.ptr.y - OY) / S)], inb = cell[0] >= 0 && cell[1] >= 0 && cell[0] < N && cell[1] < N;
  if (k.ptr.hit && inb) { const e = endOf(cell), o = owner(cell); if (e >= 0) { drag = e; paths[e] = [cell]; k.sfx('click'); } else if (o >= 0) { drag = o; const idx = paths[o].findIndex((q) => K(q) === K(cell)); paths[o] = paths[o].slice(0, idx + 1); } else drag = null; }
  if (k.ptr.down && drag != null && inb) { const pa = paths[drag], last = pa[pa.length - 1];
    if (last && K(last) !== K(cell) && Math.abs(last[0] - cell[0]) + Math.abs(last[1] - cell[1]) === 1 && !connected(drag)) {
      const back = pa.findIndex((q) => K(q) === K(cell)); if (back >= 0) paths[drag] = pa.slice(0, back + 1);
      else { const e = endOf(cell); if (e >= 0 && e !== drag) return; const o = owner(cell); if (o >= 0) { const idx = paths[o].findIndex((q) => K(q) === K(cell)); paths[o] = paths[o].slice(0, idx); } pa.push(cell); } } }
  if (k.ptr.up) { drag = null; const filled = new Set(paths.flat().map(K)).size; if (paths.every((_, i) => connected(i)) && filled === N * N) { done = true; score += 200 * level; setTimeout(() => { level++; k.st = 'over'; k.show('¡Perfecto!', `Nivel ${level - 1} completado · ${score} puntos<br>Toca para el siguiente`); }, 400); } }
}, () => {
  k.clear(); k.text(CFG.title, 20, 24, 24, '#f2d15c'); k.text(`Nivel ${level}`, 460, 28, 16, '#fff', 'right');
  const filled = new Set(paths.flat().map(K)).size; k.text(`Tablero ${Math.floor(filled / (N * N) * 100)}%`, 20, 56, 13, '#b8b6e0');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const o = owner([x, y]); k.rect(OX + x * S + 1, OY + y * S + 1, S - 2, S - 2, o >= 0 ? COL[o] + '33' : '#1a2036'); }
  paths.forEach((pa, i) => { if (pa.length < 2) return; c.strokeStyle = COL[i]; c.lineWidth = S * 0.35; c.lineCap = c.lineJoin = 'round'; c.beginPath(); pa.forEach(([x, y]) => c.lineTo(OX + x * S + S / 2, OY + y * S + S / 2)); c.stroke(); });
  ends.forEach((e, i) => e.forEach(([x, y]) => k.circle(OX + x * S + S / 2, OY + y * S + S / 2, S * 0.36, COL[i])));
});
