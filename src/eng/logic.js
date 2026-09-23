/* Puzzles de cuadrícula simples. CFG.mode: 'sudoku' | 'mines' | 'lights' | 'pipes' | 'slide' */
const M = CFG.mode, k = Kit({ w: 480, h: 600, title: CFG.title, bg: '#172033' }), c = k.ctx;
let lost = false, g, N, S, OX = 24, OY = 90, sel, score, level, t, done, flagMode, first, sol, given, src;
const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
function sudokuGen() { const b = Array(81).fill(0); const ok = (i, v) => { const r = Math.floor(i / 9), cc = i % 9; for (let j = 0; j < 9; j++) if (b[r * 9 + j] === v || b[j * 9 + cc] === v) return false; const br = r - r % 3, bc = cc - cc % 3; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (b[(br + y) * 9 + bc + x] === v) return false; return true; };
  const fillB = (i) => { if (i === 81) return true; for (const v of k.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) if (ok(i, v)) { b[i] = v; if (fillB(i + 1)) return true; b[i] = 0; } return false; }; fillB(0); return b; }
function build() {
  done = false; t = 0; sel = null; first = true; flagMode = false;
  if (M === 'sudoku') { N = 9; S = 48; sol = sudokuGen(); const holes = 38 + Math.min(16, level * 3); g = [...sol]; k.shuffle([...Array(81).keys()]).slice(0, holes).forEach((i) => (g[i] = 0)); given = g.map((v) => v > 0); }
  if (M === 'mines') { N = 9; S = 48; g = Array.from({ length: 81 }, () => ({ mine: false, open: false, flag: false, n: 0 })); }
  if (M === 'lights') { N = 5; S = 80; g = Array(25).fill(false); for (let i = 0; i < 4 + level * 2; i++) toggle(k.ri(0, 4), k.ri(0, 4)); if (g.every((v) => !v)) toggle(2, 2); }
  if (M === 'pipes') { N = Math.min(8, 5 + Math.floor(level / 2)); S = Math.floor(432 / N); g = Array.from({ length: N * N }, () => ({ c: [0, 0, 0, 0], r: 0 })); src = [Math.floor(N / 2), Math.floor(N / 2)];
    const seen = new Set([src.join()]), st = [src]; const DD = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    while (st.length) { const cur = st[Math.floor(Math.random() * st.length)]; const opts = DD.map((d, i) => [i, cur[0] + d[0], cur[1] + d[1]]).filter(([, x, y]) => inb(x, y) && !seen.has(x + ',' + y)); if (!opts.length) { st.splice(st.indexOf(cur), 1); continue; } const [i, x, y] = k.pick(opts); g[cur[1] * N + cur[0]].c[i] = 1; g[y * N + x].c[(i + 2) % 4] = 1; seen.add(x + ',' + y); st.push([x, y]); }
    for (const cell of g) { const r = k.ri(0, 3); for (let i = 0; i < r; i++) cell.c.unshift(cell.c.pop()); } }
  if (M === 'slide') { N = 4; S = 104; g = [...Array(15).keys()].map((i) => i + 1).concat(0); for (let i = 0; i < 300; i++) { const e = g.indexOf(0), ex = e % 4, ey = Math.floor(e / 4); const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [ex + dx, ey + dy]).filter(([x, y]) => inb(x, y)); const [x, y] = k.pick(nb); g[e] = g[y * 4 + x]; g[y * 4 + x] = 0; } }
  OX = (480 - N * S) / 2;
}
function toggle(x, y) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (inb(x + dx, y + dy)) g[(y + dy) * N + x + dx] = !g[(y + dy) * N + x + dx]; }
function lit() { const on = new Set([src.join()]), q = [src]; const DD = [[0, -1], [1, 0], [0, 1], [-1, 0]]; while (q.length) { const [x, y] = q.pop(), cl = g[y * N + x]; DD.forEach((d, i) => { const nx = x + d[0], ny = y + d[1]; if (cl.c[i] && inb(nx, ny) && g[ny * N + nx].c[(i + 2) % 4] && !on.has(nx + ',' + ny)) { on.add(nx + ',' + ny); q.push([nx, ny]); } }); } return on; }
function openCell(x, y) { const cl = g[y * N + x]; if (cl.open || cl.flag) return; cl.open = true; if (cl.mine) { done = true; lost = true; g.forEach((q) => q.mine && (q.open = true)); return k.lose(CFG.id, score, '¡Boom!'); } if (!cl.n) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy)) openCell(x + dx, y + dy); }
function solvedCheck() {
  let ok = false;
  if (M === 'sudoku') ok = g.every((v, i) => v === sol[i]) || (g.every((v) => v) && validSudoku());
  if (M === 'mines') ok = g.every((q) => q.mine || q.open);
  if (M === 'lights') ok = g.every((v) => !v);
  if (M === 'pipes') ok = lit().size === N * N;
  if (M === 'slide') ok = g.every((v, i) => v === (i === 15 ? 0 : i + 1));
  if (ok && !done) { done = true; score += Math.max(50, 1000 - Math.floor(t) * 3) * level; setTimeout(() => { k.st = 'over'; k.show('¡Resuelto!', `Tiempo ${Math.floor(t)} s · Puntos ${score}<br>Toca para el siguiente`); level++; }, 500); }
}
function validSudoku() { for (let i = 0; i < 9; i++) { const r = new Set(), cc = new Set(), b = new Set(); for (let j = 0; j < 9; j++) { r.add(g[i * 9 + j]); cc.add(g[j * 9 + i]); b.add(g[(Math.floor(i / 3) * 3 + Math.floor(j / 3)) * 9 + (i % 3) * 3 + j % 3]); } if (r.size < 9 || cc.size < 9 || b.size < 9) return false; } return true; }
function reset() { if (level === undefined || lost) { level = 1; score = 0; lost = false; } build(); }
level = undefined; reset(); k.show(CFG.title, CFG.help);
let pressT = 0;
k.run((dt) => {
  if (!k.gate(reset) || done) return; t += dt;
  const cx = Math.floor((k.ptr.x - OX) / S), cy = Math.floor((k.ptr.y - OY) / S), on = inb(cx, cy);
  if (k.ptr.down) pressT += dt; else if (!k.ptr.up) pressT = 0;
  if (M === 'sudoku') {
    if (k.ptr.hit && on) sel = cy * 9 + cx;
    if (k.ptr.hit && k.ptr.y > OY + 9 * S + 16) { const n = Math.floor((k.ptr.x - 24) / 48) + 1; if (sel !== null && !given[sel] && n >= 1 && n <= 10) { k.sfx('click'); g[sel] = n === 10 ? 0 : n; solvedCheck(); } }
    if (sel !== null) { const e = ['up', 'down', 'left', 'right'].find((d) => k.hit.has(d)); if (e) { const dd = { up: -9, down: 9, left: -1, right: 1 }[e]; sel = k.clamp(sel + dd, 0, 80); } }
  }
  if (M === 'mines' && k.ptr.up && on) { const cl = g[cy * N + cx];
    if (flagMode || pressT > 0.4) { if (!cl.open) cl.flag = !cl.flag; }
    else { if (first) { first = false; const safe = new Set(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) safe.add((cy + dy) * N + cx + dx); const cand = k.shuffle([...Array(81).keys()].filter((i) => !safe.has(i))); cand.slice(0, 10 + Math.min(8, level * 2)).forEach((i) => (g[i].mine = true)); g.forEach((q, i) => { const x = i % N, y = Math.floor(i / N); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy) && g[(y + dy) * N + x + dx].mine) q.n++; }); } openCell(cx, cy); }
    if (!done) solvedCheck(); }
  if (M === 'mines' && k.ptr.up && k.ptr.y > OY + N * S + 10) flagMode = !flagMode;
  if (M === 'lights' && k.ptr.hit && on) { k.sfx('click'); toggle(cx, cy); solvedCheck(); }
  if (M === 'pipes' && k.ptr.hit && on) { const cl = g[cy * N + cx]; cl.c.unshift(cl.c.pop()); cl.r += 1; k.sfx('click'); solvedCheck(); }
  if (M === 'slide') { let tx = null, ty = null; if (k.ptr.hit && on) { tx = cx; ty = cy; } const e = g.indexOf(0), ex = e % 4, ey = Math.floor(e / 4); const kd = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }; const d = ['up', 'down', 'left', 'right'].find((q) => k.hit.has(q)) || k.swipe; if (d && kd[d]) { tx = ex + kd[d][0]; ty = ey + kd[d][1]; }
    if (tx !== null && inb(tx, ty) && ((tx === ex && Math.abs(ty - ey) === 1) || (ty === ey && Math.abs(tx - ex) === 1))) { g[e] = g[ty * 4 + tx]; g[ty * 4 + tx] = 0; k.sfx('click'); solvedCheck(); } }
}, () => {
  k.clear(); k.text(CFG.title, 24, 24, 24, '#f2d15c'); k.text(`${Math.floor(t)} s`, 456, 28, 18, '#fff', 'right'); k.text(`Nivel ${level || 1}`, 24, 56, 13, '#b8b6e0');
  if (M === 'sudoku') { for (let i = 0; i < 81; i++) { const x = i % 9, y = Math.floor(i / 9), same = sel !== null && g[sel] && g[i] === g[sel];
      k.rect(OX + x * S + 1, OY + y * S + 1, S - 2, S - 2, i === sel ? '#3a4f8c' : same ? '#2c3d6a' : '#223050'); if (g[i]) k.text(g[i], OX + x * S + S / 2, OY + y * S + 12, 24, given[i] ? '#f5f1e6' : '#5ce1e6', 'center'); }
    c.strokeStyle = '#f5f1e6'; c.lineWidth = 2; for (let i = 0; i <= 9; i += 3) { c.beginPath(); c.moveTo(OX + i * S, OY); c.lineTo(OX + i * S, OY + 9 * S); c.moveTo(OX, OY + i * S); c.lineTo(OX + 9 * S, OY + i * S); c.stroke(); }
    for (let n = 1; n <= 10; n++) { k.rrect(24 + (n - 1) * 43.2 + 2, OY + 9 * S + 20, 39, 46, 8, '#2c3d6a'); k.text(n === 10 ? '⌫' : n, 24 + (n - 1) * 43.2 + 21, OY + 9 * S + 32, 20, '#fff', 'center'); } }
  if (M === 'mines') { g.forEach((q, i) => { const x = i % N, y = Math.floor(i / N), X = OX + x * S, Y = OY + y * S; k.rect(X + 1, Y + 1, S - 2, S - 2, q.open ? (q.mine ? '#ff5f5f' : '#2a3656') : '#46598f');
      if (q.open && q.mine) k.circle(X + S / 2, Y + S / 2, 10, '#111'); else if (q.open && q.n) k.text(q.n, X + S / 2, Y + 12, 22, ['', '#5ce1e6', '#7cf7a0', '#ff6b6b', '#b98cff', '#ffa94d', '#f2d15c', '#fff', '#aaa'][q.n], 'center'); else if (q.flag) k.text('⚑', X + S / 2, Y + 11, 22, '#ff5f7a', 'center'); });
    k.rrect(140, OY + N * S + 20, 200, 40, 20, flagMode ? '#ff5f7a' : '#34406a'); k.text(flagMode ? '⚑ Modo bandera' : '⛏ Modo excavar', 240, OY + N * S + 31, 16, '#fff', 'center'); k.text('Mantén pulsado para poner bandera', 240, OY + N * S + 70, 12, '#b8b6e0', 'center'); }
  if (M === 'lights') g.forEach((v, i) => { const x = i % N, y = Math.floor(i / N); k.rrect(OX + x * S + 5, OY + y * S + 5, S - 10, S - 10, 14, v ? '#f2d15c' : '#27324f'); if (v) k.circle(OX + x * S + S / 2, OY + y * S + S / 2, 10, '#fff6c8'); });
  if (M === 'pipes') { const on = lit(); g.forEach((q, i) => { const x = i % N, y = Math.floor(i / N), X = OX + x * S, Y = OY + y * S, cx = X + S / 2, cy = Y + S / 2, col = on.has(x + ',' + y) ? '#5ce1e6' : '#56607f';
      k.rect(X + 1, Y + 1, S - 2, S - 2, '#1f2a44'); c.strokeStyle = col; c.lineWidth = S * 0.22; c.lineCap = 'round'; [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach((d, j) => { if (q.c[j]) { c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + d[0] * S / 2, cy + d[1] * S / 2); c.stroke(); } }); k.circle(cx, cy, S * 0.13, col); if (x === src[0] && y === src[1]) k.circle(cx, cy, S * 0.25, '#f2d15c'); }); }
  if (M === 'slide') g.forEach((v, i) => { if (!v) return; const x = i % 4, y = Math.floor(i / 4); k.rrect(OX + x * S + 4, OY + y * S + 4, S - 8, S - 8, 12, v === i + 1 ? '#5ce1e6' : '#b98cff'); k.text(v, OX + x * S + S / 2, OY + y * S + S / 2 - 18, 34, '#172033', 'center'); });
});
