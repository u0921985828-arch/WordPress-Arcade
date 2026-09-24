/* Puzzles de cuadrícula. CFG.mode: 'sudoku' | 'mines' | 'lights' | 'pipes' | 'slide'
 * Arte propio: tableros en relieve, bombillas con halo, tuberías con agua que fluye, fichas de madera que se deslizan.
 * Control: táctil + teclado (flechas mueven el cursor, A actúa, B = bandera / girar al revés; en sudoku, números 1-9 y borrar). */
const M = CFG.mode, W = 480, H = 600, OUT = ART.OUT, R2 = 6.2832;
const BG = { sudoku: ['#2d3a5c', '#161f35'], mines: ['#2f4a3a', '#15241c'], lights: ['#2a2350', '#110d24'], pipes: ['#23374f', '#0f1b2b'], slide: ['#4a3426', '#20150e'] }[M];
const k = Kit({ w: W, h: H, title: CFG.title, bg: BG[1] }), c = k.ctx;
let lost = false, g, N, S, OX = 24, OY = 90, sel, score, level, t, done, flagMode, first, sol, given, src;
let clk = 0, litN = 0, padHit = 0, downIn = false, skipSw = false, cur = [0, 0], kb = false, anim, fx = [], moves = 0, bgCv, boardCv, keyNum = null, pressT = 0, longDone = false, boom = null, doneT = 0, conf = new Set(), rp, glow;
const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const DD = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function sudokuGen() { const b = Array(81).fill(0); const ok = (i, v) => { const r = Math.floor(i / 9), cc = i % 9; for (let j = 0; j < 9; j++) if (b[r * 9 + j] === v || b[j * 9 + cc] === v) return false; const br = r - r % 3, bc = cc - cc % 3; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (b[(br + y) * 9 + bc + x] === v) return false; return true; };
  const fillB = (i) => { if (i === 81) return true; for (const v of k.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) if (ok(i, v)) { b[i] = v; if (fillB(i + 1)) return true; b[i] = 0; } return false; }; fillB(0); return b; }
function build() {
  done = false; t = 0; sel = null; first = true; flagMode = false; moves = 0; boom = null; doneT = 0; fx = []; longDone = false;
  if (M === 'sudoku') { N = 9; S = 48; sol = sudokuGen(); const holes = Math.min(54, 28 + (level - 1) * 2); /* 1.23: nivel 1: 28 huecos → 54 en el nivel 14 */ g = [...sol]; k.shuffle([...Array(81).keys()]).slice(0, holes).forEach((i) => (g[i] = 0)); given = g.map((v) => v > 0); calcConf(); }
  if (M === 'mines') { N = 9; S = 48; g = Array.from({ length: 81 }, () => ({ mine: false, open: false, flag: false, n: 0, ot: 0 })); }
  // luces: se parte de todo apagado y se aplican pulsaciones aleatorias → siempre resoluble
  if (M === 'lights') { N = 5; S = 80; g = Array(25).fill(false); k.shuffle([...Array(25).keys()]).slice(0, Math.min(13, 2 + Math.floor((level + 1) * 0.6))).forEach((i) => toggle(i % 5, Math.floor(i / 5))); /* nivel 1: 3 toques distintos */ if (g.every((v) => !v)) toggle(2, 2); glow = g.map((v) => (v ? 1 : 0)); }
  // tuberías: árbol de expansión desde la fuente y giro aleatorio de cada pieza → siempre resoluble
  if (M === 'pipes') { N = Math.min(8, 4 + Math.floor(level / 3)); /* nivel 1-2: 4×4 */ S = Math.floor(432 / N); g = Array.from({ length: N * N }, () => ({ c: [0, 0, 0, 0], r: 0, ra: 0 })); src = [Math.floor(N / 2), Math.floor(N / 2)];
    const seen = new Set([src.join()]), st = [src];
    while (st.length) { const cur2 = st[Math.floor(Math.random() * st.length)]; const opts = DD.map((d, i) => [i, cur2[0] + d[0], cur2[1] + d[1]]).filter(([, x, y]) => inb(x, y) && !seen.has(x + ',' + y)); if (!opts.length) { st.splice(st.indexOf(cur2), 1); continue; } const [i, x, y] = k.pick(opts); g[cur2[1] * N + cur2[0]].c[i] = 1; g[y * N + x].c[(i + 2) % 4] = 1; seen.add(x + ',' + y); st.push([x, y]); }
    for (const cell of g) { const r = k.ri(0, 3); for (let i = 0; i < r; i++) cell.c.unshift(cell.c.pop()); } }
  // 15: movimientos aleatorios desde la posición resuelta → siempre resoluble
  if (M === 'slide') { N = 4; S = 104; g = [...Array(15).keys()].map((i) => i + 1).concat(0);
    do { let pe = -1; for (let i = 0, nm = Math.min(300, 10 + (level - 1) * 20); i < nm; i++) { const e = g.indexOf(0), ex = e % 4, ey = Math.floor(e / 4); const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [ex + dx, ey + dy]).filter(([x, y]) => inb(x, y) && y * 4 + x !== pe); const [x, y] = k.pick(nb); g[e] = g[y * 4 + x]; g[y * 4 + x] = 0; pe = e; } } while (g.every((v, i) => v === (i === 15 ? 0 : i + 1)));
    rp = []; g.forEach((v, i) => (rp[v] = [i % 4, Math.floor(i / 4)])); }
  OX = Math.floor((W - N * S) / 2); anim = Array(N * N).fill(0); cur = [Math.floor(N / 2), Math.floor(N / 2)]; boardCv = null;
}
function toggle(x, y) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (inb(x + dx, y + dy)) g[(y + dy) * N + x + dx] = !g[(y + dy) * N + x + dx]; }
function lit() { const on = new Map([[src.join(), 0]]), q = [src]; while (q.length) { const [x, y] = q.shift(), cl = g[y * N + x], d0 = on.get(x + ',' + y); DD.forEach((d, i) => { const nx = x + d[0], ny = y + d[1]; if (cl.c[i] && inb(nx, ny) && g[ny * N + nx].c[(i + 2) % 4] && !on.has(nx + ',' + ny)) { on.set(nx + ',' + ny, d0 + 1); q.push([nx, ny]); } }); } return on; }
function openCell(x, y, depth) {
  const cl = g[y * N + x]; if (cl.open || cl.flag) return; cl.open = true; cl.ot = clk + (depth || 0) * 0.025;
  if (cl.mine) { done = true; lost = true; cl.boom = true; boom = { x: OX + (x + 0.5) * S, y: OY + (y + 0.5) * S, t: 0 };
    let n = 0; g.forEach((q, i) => { if (q.mine && !q.open) { q.open = true; q.ot = clk + 0.25 + (n++) * 0.06; } });
    k.sfx('explode'); k.shake(12); k.flash('rgba(255,120,60,.55)'); k.burst(boom.x, boom.y, '#ff9a3d', 30, 260); k.burst(boom.x, boom.y, '#3a3346', 16, 180);
    setTimeout(() => k.lose(CFG.id, score, '¡Boom!', `Nivel ${level}`), 1500); return; }
  if (!cl.n) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy)) openCell(x + dx, y + dy, (depth || 0) + 1);
}
function solvedCheck() {
  let ok = false;
  if (M === 'sudoku') ok = g.every((v, i) => v === sol[i]) || (g.every((v) => v) && validSudoku());
  if (M === 'mines') ok = g.every((q) => q.mine || q.open);
  if (M === 'lights') ok = g.every((v) => !v);
  if (M === 'pipes') ok = lit().size === N * N;
  if (M === 'slide') ok = g.every((v, i) => v === (i === 15 ? 0 : i + 1));
  if (ok && !done) { done = true; doneT = 0; const gain = Math.max(50, 1000 - Math.floor(t) * 3) * level; score += gain; k.sfx('coin'); k.float('+' + gain, W / 2, OY + N * S / 2 + 56, '#ffd23d');
    if (M === 'mines') g.forEach((q) => { if (q.mine) q.flag = true; });
    setTimeout(() => { k.st = 'over'; k.show('¡Resuelto!', `Nivel ${level} · Tiempo ${Math.floor(t)} s${moves ? ' · ' + moves + ' movimientos' : ''} · Puntos ${score}<br>Toca para el siguiente`); level++; }, 1100); }
}
function validSudoku() { for (let i = 0; i < 9; i++) { const r = new Set(), cc = new Set(), b = new Set(); for (let j = 0; j < 9; j++) { r.add(g[i * 9 + j]); cc.add(g[j * 9 + i]); b.add(g[(Math.floor(i / 3) * 3 + Math.floor(j / 3)) * 9 + (i % 3) * 3 + j % 3]); } if (r.size < 9 || cc.size < 9 || b.size < 9) return false; } return true; }
const unitsOf = (i) => { const r = Math.floor(i / 9), cc = i % 9, br = r - r % 3, bc = cc - cc % 3; return [[...Array(9).keys()].map((j) => r * 9 + j), [...Array(9).keys()].map((j) => j * 9 + cc), [...Array(9).keys()].map((j) => (br + Math.floor(j / 3)) * 9 + bc + j % 3)]; };
function calcConf() { conf = new Set(); for (let i = 0; i < 81; i++) if (g[i]) for (const u of unitsOf(i)) for (const j of u) if (j !== i && g[j] === g[i]) conf.add(i); }
function setNum(n) {
  if (sel === null || given[sel] || done) return; if (g[sel] === n) return; g[sel] = n; anim[sel] = 1; k.sfx(n ? 'click' : 'pop'); calcConf();
  if (n && conf.has(sel)) { k.sfx('hit'); fx.push({ cells: [sel], t: 0.5, col: 'rgba(255,80,90,' }); }
  else if (n) for (const u of unitsOf(sel)) if (u.every((j) => g[j] && !conf.has(j))) { fx.push({ cells: u, t: 0.7, col: 'rgba(124,247,160,' }); k.sfx('coin'); }
  solvedCheck();
}
function nMines() { return 7 + Math.min(10, (level || 1) - 1); } /* 1.23: 7 minas en el nivel 1 → 17 en el 11 */
function reset() { if (level === undefined || lost) { level = 1; score = 0; lost = false; } build(); }
addEventListener('keydown', (e) => { if (M !== 'sudoku') return; const m = /^(Digit|Numpad)([0-9])$/.exec(e.code); if (m) keyNum = +m[2]; else if (e.code === 'Backspace' || e.code === 'Delete') keyNum = 0; });
level = undefined; reset(); k.show(CFG.title, CFG.help);

/* ---------- Acciones ---------- */
function minesTap(cx, cy, flag) {
  const cl = g[cy * N + cx];
  if (flag) { if (!cl.open) { cl.flag = !cl.flag; anim[cy * N + cx] = 1; k.sfx(cl.flag ? 'pop' : 'click'); } return; }
  if (cl.open && cl.n) { // acorde: abre vecinas si ya hay tantas banderas como el número
    let f = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(cx + dx, cy + dy) && g[(cy + dy) * N + cx + dx].flag) f++;
    if (f === cl.n) { k.sfx('click'); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(cx + dx, cy + dy) && !done) openCell(cx + dx, cy + dy, 1); } }
  else if (!cl.open && !cl.flag) {
    if (first) { first = false; const safe = new Set(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(cx + dx, cy + dy)) safe.add((cy + dy) * N + cx + dx); const cand = k.shuffle([...Array(81).keys()].filter((i) => !safe.has(i))); cand.slice(0, nMines()).forEach((i) => (g[i].mine = true)); g.forEach((q, i) => { const x = i % N, y = Math.floor(i / N); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy) && g[(y + dy) * N + x + dx].mine) q.n++; }); }
    k.sfx('click'); openCell(cx, cy, 0); }
  if (!done) solvedCheck();
}
function lightsTap(cx, cy) { toggle(cx, cy); moves++; k.sfx('click'); anim[cy * N + cx] = 1; k.burst(OX + (cx + 0.5) * S, OY + (cy + 0.5) * S, g[cy * N + cx] ? '#ffe98a' : '#8a90c0', 8, 90); solvedCheck(); }
function pipesTap(cx, cy, back) { const cl = g[cy * N + cx]; if (back) { cl.c.push(cl.c.shift()); cl.ra += Math.PI / 2; } else { cl.c.unshift(cl.c.pop()); cl.ra -= Math.PI / 2; } cl.r += 1; moves++; k.sfx('click'); const before = litN; litN = lit().size; if (litN > before) k.sfx('pop'); solvedCheck(); }
function slideTo(tx, ty) {
  const e = g.indexOf(0), ex = e % 4, ey = Math.floor(e / 4); if (!inb(tx, ty) || (tx !== ex && ty !== ey) || (tx === ex && ty === ey)) return false;
  const sx = Math.sign(tx - ex), sy = Math.sign(ty - ey); let x = ex, y = ey; // desliza toda la fila/columna hacia el hueco
  while (x !== tx || y !== ty) { const nx = x + sx, ny = y + sy; g[y * 4 + x] = g[ny * 4 + nx]; g[ny * 4 + nx] = 0; x = nx; y = ny; moves++; }
  k.sfx('click'); solvedCheck(); return true;
}

k.run((dt) => {
  if (!k.gate(reset)) { keyNum = null; return; }
  for (const f of fx) f.t -= dt; fx = fx.filter((f) => f.t > 0); for (let i = 0; i < anim.length; i++) if (anim[i] > 0) anim[i] = Math.max(0, anim[i] - dt * 5);
  if (M === 'lights') glow = glow.map((v, i) => v + k.clamp((g[i] ? 1 : 0) - v, -dt * 7, dt * 7));
  if (M === 'pipes') for (const q of g) q.ra += k.clamp(-q.ra, -dt * 14, dt * 14);
  if (M === 'slide') g.forEach((v, i) => { const r = rp[v], s2 = dt * 12; r[0] += k.clamp(i % 4 - r[0], -s2, s2); r[1] += k.clamp(Math.floor(i / 4) - r[1], -s2, s2); });
  clk += dt; if (boom) boom.t += dt; if (done) { doneT += dt; return; } t += dt;
  const cx = Math.floor((k.ptr.x - OX) / S), cy = Math.floor((k.ptr.y - OY) / S), on = inb(cx, cy);
  const kd = ['up', 'down', 'left', 'right'].find((d) => k.hit.has(d));
  if (k.ptr.hit) kb = false;
  if (kd && M !== 'slide' && M !== 'sudoku') { kb = true; const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[kd]; cur = [k.clamp(cur[0] + d[0], 0, N - 1), k.clamp(cur[1] + d[1], 0, N - 1)]; k.sfx('click'); }
  if (M === 'sudoku') {
    if (k.ptr.hit && on) { sel = cy * 9 + cx; k.sfx('click'); }
    if (k.ptr.hit && k.ptr.y > OY + 9 * S + 12) { const n = Math.floor((k.ptr.x - 24) / 43.2) + 1; if (n >= 1 && n <= 10) { padHit = n; setNum(n === 10 ? 0 : n); } }
    if (kd) { if (sel === null) sel = 40; else { const dd = { up: -9, down: 9, left: -1, right: 1 }[kd]; sel = k.clamp(sel + dd, 0, 80); } }
    if (keyNum !== null) { setNum(keyNum); keyNum = null; }
    if (k.hit.has('a')) { if (sel === null) sel = 40; else if (!given[sel]) setNum((g[sel] + 1) % 10); } /* mando: A cambia el número (1→9→vacío), B borra */
    if (k.hit.has('b') && sel !== null) setNum(0);
  }
  if (M === 'mines') {
    if (k.ptr.hit) { pressT = 0; longDone = false; downIn = true; }
    if (k.ptr.down && on && !longDone && Math.hypot(k.ptr.x - k.ptr.sx, k.ptr.y - k.ptr.sy) < 14) { pressT += dt; if (pressT > 0.38 && !g[cy * N + cx].open) { longDone = true; minesTap(cx, cy, true); navigator.vibrate && navigator.vibrate(15); } }
    if (k.ptr.up && downIn && !longDone && on) minesTap(cx, cy, flagMode);
    if (k.ptr.up && downIn && !longDone && k.ptr.y > OY + N * S + 10) { flagMode = !flagMode; k.sfx('pop'); }
    if (k.ptr.up) downIn = false;
    if (!k.ptr.down) pressT = 0;
    if (kb && k.hit.has('a')) minesTap(cur[0], cur[1], flagMode); if (kb && k.hit.has('b')) minesTap(cur[0], cur[1], true);
  }
  if (M === 'lights') { if (k.ptr.hit && on) lightsTap(cx, cy); if (k.hit.has('a')) lightsTap(cur[0], cur[1]); }
  if (M === 'pipes') { if (k.ptr.hit && on) pipesTap(cx, cy); if (k.hit.has('a')) pipesTap(cur[0], cur[1]); if (k.hit.has('b')) pipesTap(cur[0], cur[1], true); }
  if (M === 'slide') { const e = g.indexOf(0), ex = e % 4, ey = Math.floor(e / 4), km = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] };
    if (k.ptr.hit) skipSw = on && slideTo(cx, cy);
    const d = kd || (skipSw ? null : k.swipe); if (k.ptr.up) skipSw = false;
    if (d && km[d]) slideTo(ex + km[d][0], ey + km[d][1]); }
}, () => _draw());

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function num(s, x, y, size, col, w) { c.font = `${w || 800} ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y); }
function offscreen(fn) { const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const q = cv.getContext('2d'); q.scale(2, 2); fn(q); return cv; }
function renderBg() { return offscreen((q) => {
  const gr = q.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, BG[0]); gr.addColorStop(1, BG[1]); q.fillStyle = gr; q.fillRect(0, 0, W, H);
  q.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 40; i++) { q.beginPath(); q.arc(rnd(i) * W, rnd(i + 50) * H, 10 + rnd(i + 9) * 40, 0, R2); q.fill(); }
  // marco del tablero
  const bw = N * S, pad = M === 'slide' ? 16 : 10; q.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(q, OX - pad, OY - pad + 8, bw + pad * 2, bw + pad * 2, 18); q.fill();
  ART.rr(q, OX - pad, OY - pad, bw + pad * 2, bw + pad * 2, 18); ART.fillOut(q, { sudoku: '#e9dfc8', mines: '#3f6b3a', lights: '#3a3560', pipes: '#40506e', slide: '#7a4e2e' }[M], 3);
  q.fillStyle = 'rgba(255,255,255,.18)'; ART.rr(q, OX - pad + 6, OY - pad + 3, bw + pad * 2 - 12, 4, 2); q.fill();
  if (M === 'slide') { q.fillStyle = '#3a2416'; ART.rr(q, OX - 4, OY - 4, bw + 8, bw + 8, 10); q.fill(); q.strokeStyle = 'rgba(0,0,0,.4)'; q.lineWidth = 2; q.stroke();
    q.strokeStyle = 'rgba(255,220,170,.12)'; q.lineWidth = 1; for (let i = 0; i < 12; i++) { q.beginPath(); q.moveTo(OX - 16, OY - 16 + rnd(i) * (bw + 32)); q.bezierCurveTo(OX + bw * 0.3, OY + rnd(i + 3) * bw, OX + bw * 0.7, OY + rnd(i + 5) * bw, OX + bw + 16, OY - 16 + rnd(i + 7) * (bw + 32)); q.stroke(); } }
  if (M === 'pipes') for (let i = 0; i < N * N; i++) { const X = OX + (i % N) * S, Y = OY + Math.floor(i / N) * S; ART.rr(q, X + 1.5, Y + 1.5, S - 3, S - 3, 5); q.fillStyle = (i + Math.floor(i / N)) % 2 ? '#2b3a57' : '#283652'; q.fill(); q.fillStyle = 'rgba(255,255,255,.06)'; q.fillRect(X + 3, Y + 3, S - 6, 2); q.fillStyle = 'rgba(0,0,0,.35)'; for (const [a, b] of [[5, 5], [S - 5, 5], [5, S - 5], [S - 5, S - 5]]) { q.beginPath(); q.arc(X + a, Y + b, 1.6, 0, R2); q.fill(); } }
  if (M === 'lights') for (let i = 0; i < N * N; i++) { const X = OX + (i % N) * S, Y = OY + Math.floor(i / N) * S; ART.rr(q, X + 5, Y + 7, S - 10, S - 10, 14); q.fillStyle = 'rgba(0,0,0,.35)'; q.fill(); ART.rr(q, X + 5, Y + 5, S - 10, S - 10, 14); ART.fillOut(q, '#262143', 2); q.fillStyle = 'rgba(255,255,255,.07)'; ART.rr(q, X + 10, Y + 8, S - 20, 5, 2); q.fill(); }
}); }
// halo de bombilla cacheado
const haloCv = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 200; const q = cv.getContext('2d'), gr = q.createRadialGradient(100, 100, 5, 100, 100, 100); gr.addColorStop(0, 'rgba(255,230,120,.9)'); gr.addColorStop(0.4, 'rgba(255,200,60,.35)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); q.fillStyle = gr; q.fillRect(0, 0, 200, 200); return cv; })();
function hud() {
  label(CFG.title, 16, 13, 19, '#ffd23d'); label(`Nivel ${level || 1}`, 16, 40, 14, '#cfd6ff');
  const tt = Math.floor(t), ts = `${Math.floor(tt / 60)}:${String(tt % 60).padStart(2, '0')}`; clock(W - 86, 24); label(ts, W - 18, 12, 22, '#fff', 'right');
  let sub = `Puntos ${score}`;
  if (M === 'mines') sub = `Minas ${nMines() - g.filter((q) => q.flag).length}`;
  if (M === 'lights') sub = `Toques ${moves} · Luces ${g.filter(Boolean).length}`;
  if (M === 'pipes') sub = `Conectadas ${litN}/${N * N}`;
  if (M === 'slide') sub = `Movimientos ${moves}`;
  label(sub, W - 18, 40, 14, '#cfd6ff', 'right');
}
function clock(x, y) { c.beginPath(); c.arc(x, y, 9, 0, R2); ART.fillOut(c, '#fff', 2); c.strokeStyle = OUT; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 5); c.moveTo(x, y); c.lineTo(x + 4, y + 1); c.stroke(); }
function cursorBox(x, y) { if (!kb || done) return; c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([8, 5]); c.lineDashOffset = -clk * 20; ART.rr(c, OX + x * S + 2, OY + y * S + 2, S - 4, S - 4, 8); c.stroke(); c.setLineDash([]); }
function flagIcon(x, y, s) { c.strokeStyle = OUT; c.lineWidth = 2.5 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 4 * s, y + 11 * s); c.lineTo(x - 4 * s, y - 11 * s); c.stroke();
  c.beginPath(); c.moveTo(x - 3 * s, y - 11 * s); c.lineTo(x + 10 * s, y - 5 * s); c.lineTo(x - 3 * s, y + 1 * s); c.closePath(); ART.fillOut(c, '#ff4d5e', 2 * s); ART.rr(c, x - 10 * s, y + 9 * s, 13 * s, 4 * s, 2 * s); ART.fillOut(c, '#5a5470', 1.5 * s); }
function mineIcon(x, y, r) { c.strokeStyle = OUT; c.lineWidth = r * 0.28; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.moveTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6); c.lineTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3); } c.stroke();
  c.beginPath(); c.arc(x, y, r, 0, R2); ART.fillOut(c, '#2a2638', 2); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, R2); c.fill(); }
function shovelIcon(x, y) { c.save(); c.translate(x, y); c.rotate(0.6); ART.rr(c, -2, -13, 4, 16, 2); ART.fillOut(c, '#a0703f', 1.8); c.beginPath(); c.moveTo(-6, 2); c.lineTo(6, 2); c.lineTo(5, 10); c.quadraticCurveTo(0, 15, -5, 10); c.closePath(); ART.fillOut(c, '#c7d0da', 1.8); c.restore(); }
function key3d(x, y, w, h, face, pressed) { ART.rr(c, x, y + 4, w, h, 10); c.fillStyle = OUT; c.fill(); const yy = y + (pressed ? 3 : 0); ART.rr(c, x, yy, w, h, 10); ART.fillOut(c, face, 2.5); c.fillStyle = 'rgba(255,255,255,.35)'; ART.rr(c, x + 6, yy + 4, w - 12, 4, 2); c.fill(); return yy; }

function drawSudoku() {
  const sr = sel !== null ? Math.floor(sel / 9) : -1, sc = sel !== null ? sel % 9 : -1, sb = sel !== null ? Math.floor(sr / 3) * 3 + Math.floor(sc / 3) : -1, sv = sel !== null ? g[sel] : 0;
  for (let i = 0; i < 81; i++) { const x = i % 9, y = Math.floor(i / 9), X = OX + x * S, Y = OY + y * S, b = Math.floor(y / 3) * 3 + Math.floor(x / 3);
    let col = (Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? '#fbf6ea' : '#f4eedd';
    if (sel !== null && (y === sr || x === sc || b === sb)) col = '#e3e8fb'; if (sv && g[i] === sv) col = '#c8d3fb'; if (conf.has(i) && !given[i]) col = '#ffd9d9'; if (i === sel) col = '#a9bbff';
    c.fillStyle = col; c.fillRect(X, Y, S, S); }
  for (const f of fx) { c.fillStyle = f.col + Math.min(0.55, f.t) + ')'; for (const i of f.cells) c.fillRect(OX + (i % 9) * S, OY + Math.floor(i / 9) * S, S, S); }
  c.strokeStyle = '#cfc5ad'; c.lineWidth = 1; c.beginPath(); for (let i = 1; i < 9; i++) if (i % 3) { c.moveTo(OX + i * S, OY); c.lineTo(OX + i * S, OY + 9 * S); c.moveTo(OX, OY + i * S); c.lineTo(OX + 9 * S, OY + i * S); } c.stroke();
  c.strokeStyle = '#3a3f66'; c.lineWidth = 2.5; c.beginPath(); for (let i = 3; i < 9; i += 3) { c.moveTo(OX + i * S, OY); c.lineTo(OX + i * S, OY + 9 * S); c.moveTo(OX, OY + i * S); c.lineTo(OX + 9 * S, OY + i * S); } c.stroke();
  ART.rr(c, OX, OY, 9 * S, 9 * S, 6); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
  for (let i = 0; i < 81; i++) { if (!g[i]) continue; const X = OX + (i % 9 + 0.5) * S, Y = OY + (Math.floor(i / 9) + 0.5) * S + 1, a = anim[i], sz = 27 * (1 + a * 0.45);
    num(g[i], X, Y, sz, given[i] ? '#262a4a' : conf.has(i) ? '#e0344a' : '#4b5de0', given[i] ? 800 : 700); }
  if (sel !== null) { const X = OX + sc * S, Y = OY + sr * S; c.strokeStyle = '#4b5de0'; c.lineWidth = 3; ART.rr(c, X + 1.5, Y + 1.5, S - 3, S - 3, 6); c.stroke(); }
  // teclado numérico
  const cnt = Array(10).fill(0); g.forEach((v) => v && cnt[v]++);
  for (let n = 1; n <= 10; n++) { const x = 24 + (n - 1) * 43.2 + 2, y = OY + 9 * S + 18, full = n < 10 && cnt[n] >= 9, pressed = k.ptr.down && k.ptr.y > y - 6 && Math.floor((k.ptr.x - 24) / 43.2) + 1 === n;
    const yy = key3d(x, y, 39, 44, n === 10 ? '#ff8a8a' : full ? '#b9bdd6' : '#ffffff', pressed);
    if (n < 10) num(n, x + 19.5, yy + 23, 24, full ? '#7d82a3' : '#2a2f55');
    else { const cx = x + 20, cy = yy + 22; c.beginPath(); c.moveTo(cx - 12, cy); c.lineTo(cx - 5, cy - 8); c.lineTo(cx + 11, cy - 8); c.lineTo(cx + 11, cy + 8); c.lineTo(cx - 5, cy + 8); c.closePath(); ART.fillOut(c, '#fff', 2); c.strokeStyle = '#e0344a'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - 1, cy - 4); c.lineTo(cx + 6, cy + 4); c.moveTo(cx + 6, cy - 4); c.lineTo(cx - 1, cy + 4); c.stroke(); } }
}
function drawMines() {
  const NC = ['', '#2f6fd6', '#2e9e4a', '#e0443a', '#7a3fc4', '#d9821a', '#1aa3a3', '#333', '#888'];
  g.forEach((q, i) => { const x = i % N, y = Math.floor(i / N), X = OX + x * S, Y = OY + y * S, chk = (x + y) % 2, p = q.open ? k.clamp((clk - q.ot) / 0.15, 0, 1) : 0;
    if (q.open && p > 0) { c.fillStyle = q.boom ? '#ff5f4a' : q.mine ? (lost ? '#f2a08a' : '#bfe3a0') : chk ? '#ead6ac' : '#e1cb9d'; c.fillRect(X, Y, S, S);
      c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(X, Y, S, 3); c.fillRect(X, Y, 3, S);
      if (q.mine) { if (!q.flag || lost) mineIcon(X + S / 2, Y + S / 2, S * 0.2 * (0.6 + p * 0.4)); }
      else if (q.n) { c.save(); c.translate(X + S / 2, Y + S / 2 + 1); c.scale(0.6 + p * 0.4, 0.6 + p * 0.4); num(q.n, 0, 0, 28, NC[q.n], 900); c.restore(); } }
    if (!q.open || p < 1) { const s = 1 - p; c.save(); c.translate(X + S / 2, Y + S / 2); c.scale(s, s); c.fillStyle = chk ? '#8fd14f' : '#83c646'; c.fillRect(-S / 2, -S / 2, S, S); c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(-S / 2, -S / 2, S, 4); c.fillRect(-S / 2, -S / 2, 4, S); c.fillStyle = 'rgba(0,60,0,.22)'; c.fillRect(-S / 2, S / 2 - 4, S, 4); c.fillRect(S / 2 - 4, -S / 2, 4, S);
      if (q.flag) { const a = anim[i]; c.scale(1 + a * 0.4, 1 + a * 0.4); flagIcon(0, 0, 1); } c.restore(); }
    else if (q.flag && q.mine && !lost) { flagIcon(X + S / 2, Y + S / 2, 1); }
  });
  // presión larga: anillo de progreso
  if (k.ptr.down && !longDone && pressT > 0.08 && !done) { c.strokeStyle = '#fff'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(k.ptr.x, k.ptr.y - 34, 14, -Math.PI / 2, -Math.PI / 2 + R2 * Math.min(1, pressT / 0.38)); c.stroke(); }
  ART.rr(c, OX, OY, N * S, N * S, 6); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke(); cursorBox(cur[0], cur[1]);
  if (boom && boom.t < 0.6) { c.globalAlpha = 1 - boom.t / 0.6; c.fillStyle = '#ffd23d'; c.beginPath(); c.arc(boom.x, boom.y, 20 + boom.t * 160, 0, R2); c.fill(); c.globalAlpha = 1; }
  const by = OY + N * S + 12, yy = key3d(W / 2 - 110, by, 220, 42, flagMode ? '#ff6b7a' : '#6e62f5', k.ptr.down && k.ptr.y > by - 4);
  if (flagMode) flagIcon(W / 2 - 80, yy + 21, 0.85); else shovelIcon(W / 2 - 80, yy + 21);
  label(flagMode ? 'Modo bandera' : 'Modo excavar', W / 2 + 12, yy + 11, 18, '#fff', 'center');
  label('Mantén pulsado para poner bandera', W / 2, by + 49, 12, '#cfe6c0', 'center');
}
function drawLights() {
  g.forEach((v, i) => { const x = i % N, y = Math.floor(i / N), cx = OX + (x + 0.5) * S, cy = OY + (y + 0.5) * S - 4, b = glow[i], a = anim[i], s = 1 + a * 0.12;
    if (b > 0.02) { c.globalAlpha = b * (0.85 + Math.sin(clk * 5 + i) * 0.08); c.drawImage(haloCv, cx - S * 0.85, cy - S * 0.85, S * 1.7, S * 1.7); c.globalAlpha = 1; }
    c.save(); c.translate(cx, cy); c.scale(s, s);
    ART.rr(c, -9, 12, 18, 12, 3); ART.fillOut(c, '#a8adc4', 2); c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-9, 16); c.lineTo(9, 16); c.moveTo(-9, 20); c.lineTo(9, 20); c.stroke();
    c.beginPath(); c.arc(0, -2, 18, Math.PI * 0.8, Math.PI * 2.2); c.lineTo(8, 12); c.lineTo(-8, 12); c.closePath();
    const off = [0x4a, 0x50, 0x74], onc = [0xff, 0xd2, 0x3d], mix = off.map((o, j) => Math.round(o + (onc[j] - o) * b)); ART.fillOut(c, `rgb(${mix})`, 2.5);
    c.strokeStyle = b > 0.5 ? '#fff6c8' : 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, 10); c.lineTo(-4, 0); c.lineTo(0, 4); c.lineTo(4, 0); c.lineTo(5, 10); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-8, -8, 3.5, 6, 0.5, 0, R2); c.fill(); c.restore(); });
  cursorBox(cur[0], cur[1]);
}
function drawPipes() {
  const on = lit(); litN = on.size; const wave = done ? doneT * 14 : -1;
  g.forEach((q, i) => { const x = i % N, y = Math.floor(i / N), cx = OX + (x + 0.5) * S, cy = OY + (y + 0.5) * S, d = on.get(x + ',' + y), wet = d !== undefined, hl = wet && wave >= 0 && Math.abs(wave - d) < 1.2;
    c.save(); c.translate(cx, cy); c.rotate(q.ra); const L = S / 2, dirs = DD.filter((_, j) => q.c[j]);
    const path = () => { c.beginPath(); for (const dd of dirs) { c.moveTo(0, 0); c.lineTo(dd[0] * L, dd[1] * L); } };
    c.lineCap = 'round'; path(); c.strokeStyle = OUT; c.lineWidth = S * 0.34; c.stroke(); c.lineCap = 'butt'; path(); c.stroke();
    path(); c.strokeStyle = hl ? '#bff4ff' : wet ? '#2f9bf0' : '#8b93ad'; c.lineWidth = S * 0.24; c.lineCap = 'round'; c.stroke();
    if (wet) { path(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = S * 0.07; c.setLineDash([S * 0.12, S * 0.18]); c.lineDashOffset = -clk * S * 0.8; c.stroke(); c.setLineDash([]); }
    else { path(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = S * 0.05; c.stroke(); }
    // bridas en los bordes
    for (const dd of dirs) { c.save(); c.rotate(Math.atan2(dd[1], dd[0])); ART.rr(c, L - S * 0.1, -S * 0.17, S * 0.08, S * 0.34, 2); ART.fillOut(c, wet ? '#6fc3ff' : '#a9b0c6', 1.5); c.restore(); }
    c.beginPath(); c.arc(0, 0, S * 0.15, 0, R2); ART.fillOut(c, wet ? '#5bb8ff' : '#9aa2bb', 2);
    if (dirs.length === 1 && !(x === src[0] && y === src[1])) { c.beginPath(); c.arc(0, 0, S * 0.22, 0, R2); ART.fillOut(c, wet ? '#7cf7a0' : '#5a627e', 2.5); c.fillStyle = wet ? '#fff' : '#3a4058'; c.beginPath(); c.arc(0, 0, S * 0.08, 0, R2); c.fill(); }
    c.restore();
    if (x === src[0] && y === src[1]) { ART.rr(c, cx - S * 0.3, cy - S * 0.3, S * 0.6, S * 0.6, S * 0.12); ART.fillOut(c, '#ffd23d', 3); c.fillStyle = '#2f9bf0'; const lv = 0.5 + Math.sin(clk * 3) * 0.08; c.fillRect(cx - S * 0.22, cy + S * 0.22 - S * 0.44 * lv, S * 0.44, S * 0.44 * lv); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(cx - S * 0.22, cy - S * 0.22, S * 0.08, S * 0.4); c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(cx - S * 0.22, cy - S * 0.22, S * 0.44, S * 0.44); }
  });
  cursorBox(cur[0], cur[1]);
}
const tileCv = (() => { const s = 96, cv = document.createElement('canvas'); cv.width = cv.height = s * 2; const q = cv.getContext('2d'); q.scale(2, 2);
  ART.rr(q, 2, 6, s - 4, s - 6, 12); q.fillStyle = '#6e4424'; q.fill(); ART.rr(q, 2, 2, s - 4, s - 8, 12); q.fillStyle = '#e2b06e'; q.fill();
  q.save(); q.clip(); q.strokeStyle = 'rgba(150,95,45,.35)'; q.lineWidth = 1.5; for (let i = 0; i < 7; i++) { q.beginPath(); q.moveTo(0, 8 + i * 13 + rnd(i) * 4); q.bezierCurveTo(30, 4 + i * 13 + rnd(i + 2) * 10, 60, 12 + i * 13 - rnd(i + 4) * 10, s, 8 + i * 13); q.stroke(); } q.restore();
  q.fillStyle = 'rgba(255,255,255,.35)'; ART.rr(q, 10, 6, s - 20, 5, 2); q.fill(); ART.rr(q, 2, 2, s - 4, s - 4, 12); q.lineWidth = 2.5; q.strokeStyle = OUT; q.stroke(); return cv; })();
function drawSlide() {
  const order = g.map((v, i) => v).filter(Boolean);
  for (const v of order) { const r = rp[v], X = OX + r[0] * S + 4, Y = OY + r[1] * S + 4, ok = g[v - 1] === v, sz = S - 8;
    c.drawImage(tileCv, X, Y, sz, sz);
    if (ok) { c.fillStyle = 'rgba(124,247,160,.22)'; ART.rr(c, X + 3, Y + 3, sz - 6, sz - 12, 10); c.fill(); c.beginPath(); c.arc(X + sz - 14, Y + 14, 5, 0, R2); ART.fillOut(c, '#5fd37a', 1.5); }
    num(v, X + sz / 2, Y + sz / 2 + 1, 40, 'rgba(255,240,210,.8)'); num(v, X + sz / 2, Y + sz / 2 - 1, 40, '#5a3418'); }
  if (done) { c.globalAlpha = Math.min(0.5, doneT) * (0.6 + Math.sin(doneT * 8) * 0.4); c.fillStyle = '#fff6c8'; ART.rr(c, OX, OY, N * S, N * S, 10); c.fill(); c.globalAlpha = 1; }
}
const _draw = () => {
  if (!bgCv || bgCv.n !== N * 100 + S) { bgCv = renderBg(); bgCv.n = N * 100 + S; }
  c.drawImage(bgCv, 0, 0, W, H); hud();
  if (M === 'sudoku') drawSudoku(); if (M === 'mines') drawMines(); if (M === 'lights') drawLights(); if (M === 'pipes') drawPipes(); if (M === 'slide') drawSlide();
  if (done && !lost) { const p = Math.min(1, doneT * 3), sc = 0.7 + p * 0.3 + Math.sin(p * 3.14) * 0.08; c.save(); c.globalAlpha = p; c.translate(W / 2, OY + N * S / 2); c.scale(sc, sc); ART.rr(c, -130, -34, 260, 68, 20); ART.fillOut(c, 'rgba(34,28,66,.92)', 3); label('¡Resuelto!', 0, -18, 32, '#7cf7a0', 'center'); c.restore(); }
};
