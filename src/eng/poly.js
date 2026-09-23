/* Tangram Studio: encaja todas las piezas en la silueta */
const k = Kit({ w: 480, h: 640, title: CFG.title, bg: '#1a1630' }), c = k.ctx;
const COL = ['#ff5f5f', '#5ce1e6', '#f2d15c', '#7cf7a0', '#b98cff', '#ffa94d', '#ff9ad5', '#6c8cff'];
let N, S, OX, OY = 70, pieces, level, drag, done, score, mask;
function build() {
  N = Math.min(7, 4 + Math.floor(level / 2)); S = Math.floor(300 / N); OX = (480 - N * S) / 2; done = false;
  const own = Array.from({ length: N }, () => Array(N).fill(-1)); const np = Math.min(8, 3 + Math.floor(N * N / 7)); const seeds = k.shuffle([...Array(N * N).keys()]).slice(0, np);
  seeds.forEach((s, i) => (own[Math.floor(s / N)][s % N] = i));
  let changed = true; while (changed) { changed = false; for (const [y, x] of k.shuffle([...Array(N * N).keys()].map((i) => [Math.floor(i / N), i % N]))) { if (own[y][x] >= 0) continue; const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => own[y + dy] && own[y + dy][x + dx]).filter((v) => v !== undefined && v >= 0); if (nb.length) { own[y][x] = k.pick(nb); changed = true; } } }
  pieces = []; for (let i = 0; i < np; i++) { const cells = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (own[y][x] === i) cells.push([x, y]); if (!cells.length) continue; const mx = Math.min(...cells.map((q) => q[0])), my = Math.min(...cells.map((q) => q[1])); let sh = cells.map(([x, y]) => [x - mx, y - my]); for (let r = k.ri(0, 3); r > 0; r--) sh = rot(sh); pieces.push({ sh, col: COL[i % COL.length], bx: null, by: null, tx: 0, ty: 0 }); }
  layoutTray();
}
function rot(sh) { const r = sh.map(([x, y]) => [-y, x]); const mx = Math.min(...r.map((q) => q[0])), my = Math.min(...r.map((q) => q[1])); return r.map(([x, y]) => [x - mx, y - my]); }
function layoutTray() { let x = 20, y = OY + N * S + 40; const ts = 28; for (const p of pieces) { if (p.bx !== null) continue; const w = (Math.max(...p.sh.map((q) => q[0])) + 1) * ts, h = (Math.max(...p.sh.map((q) => q[1])) + 1) * ts; if (x + w > 460) { x = 20; y += 110; } p.tx = x; p.ty = y; x += w + 18; } }
function occupied(except) { const s = new Set(); for (const p of pieces) if (p !== except && p.bx !== null) for (const [x, y] of p.sh) s.add((p.bx + x) + ',' + (p.by + y)); return s; }
function reset() { if (!level) { level = 1; score = 0; } build(); }
reset(); k.show(CFG.title, 'Arrastra las piezas al cuadrado hasta llenarlo. Toca una pieza para girarla.');
k.run(() => {
  if (!k.gate(reset) || done) return;
  const hitPiece = (px, py) => pieces.slice().reverse().find((p) => p.sh.some(([x, y]) => { const s = p.bx !== null ? S : 28, ox = p.bx !== null ? OX + p.bx * S : p.tx, oy = p.bx !== null ? OY + p.by * S : p.ty; return px > ox + x * s && px < ox + (x + 1) * s && py > oy + y * s && py < oy + (y + 1) * s; }));
  if (k.ptr.hit) { const p = hitPiece(k.ptr.x, k.ptr.y); if (p) { drag = { p, moved: false, from: [p.bx, p.by] }; pieces.splice(pieces.indexOf(p), 1); pieces.push(p); } }
  if (drag && k.ptr.down && Math.hypot(k.ptr.x - k.ptr.sx, k.ptr.y - k.ptr.sy) > 8) { drag.moved = true; drag.p.bx = null; }
  if (drag && k.ptr.up && !drag.moved && Math.hypot(k.ptr.x - k.ptr.sx, k.ptr.y - k.ptr.sy) > 8) { drag.moved = true; drag.p.bx = null; }
  if (drag && k.ptr.up) { const p = drag.p;
    if (!drag.moved) { p.sh = rot(p.sh); if (p.bx !== null) { const occ = occupied(p); if (p.sh.some(([x, y]) => p.bx + x >= N || p.by + y >= N || occ.has((p.bx + x) + ',' + (p.by + y)))) p.bx = null; } }
    else { const gx = Math.round((k.ptr.x - OX) / S - 0.5 - (Math.max(...p.sh.map((q) => q[0]))) / 2), gy = Math.round((k.ptr.y - OY) / S - 0.5 - (Math.max(...p.sh.map((q) => q[1]))) / 2); const occ = occupied(p);
      k.sfx('click'); if (p.sh.every(([x, y]) => gx + x >= 0 && gy + y >= 0 && gx + x < N && gy + y < N && !occ.has((gx + x) + ',' + (gy + y)))) { p.bx = gx; p.by = gy; } else p.bx = null; }
    drag = null; layoutTray();
    if (pieces.every((q) => q.bx !== null)) { done = true; score += 150 * level; setTimeout(() => { k.st = 'over'; k.show('¡Encajado!', `Nivel ${level} · ${score} puntos<br>Toca para el siguiente`); level++; }, 400); } }
}, () => {
  k.clear(); k.text(CFG.title, 20, 20, 22, '#f2d15c'); k.text(`Nivel ${level}`, 460, 24, 16, '#fff', 'right');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) k.rect(OX + x * S + 1, OY + y * S + 1, S - 2, S - 2, '#2a2450');
  for (const p of pieces) { const dragging = drag && drag.p === p && drag.moved; const s = p.bx !== null || dragging ? S : 28; let ox = p.bx !== null ? OX + p.bx * S : p.tx, oy = p.bx !== null ? OY + p.by * S : p.ty;
    if (dragging) { ox = k.ptr.x - (Math.max(...p.sh.map((q) => q[0])) + 1) * S / 2; oy = k.ptr.y - (Math.max(...p.sh.map((q) => q[1])) + 1) * S / 2; }
    for (const [x, y] of p.sh) k.rrect(ox + x * s + 1, oy + y * s + 1, s - 2, s - 2, 4, p.col); }
});
