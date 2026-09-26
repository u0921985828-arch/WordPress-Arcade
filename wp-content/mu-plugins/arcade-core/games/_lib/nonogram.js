/* Nonogramas. CFG.size, CFG.daily
 * Tablero de papel con bloques en relieve, herramientas Pintar / Marcar, arrastre bloqueado a fila o columna,
 * pistas que se apagan al cumplirse, resaltado de fila y columna, cronómetro y revelado en color al resolver. */
const N = CFG.size || 10, W = 480, H = 560, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#1b2440' }), c = k.ctx;
/* ---------- R5 §8 «pieza única» + cartoon de estudio (helpers locales) ----------
   uni(): contornea TODAS las partes y luego las rellena → solo sobrevive la silueta exterior.
   celp(): 3 tonos de borde duro (cel shading) recortados a la silueta, sin degradados.
   spec(): único óvalo especular.  contact(): sombra de contacto dura. */
function uni(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = ART.OUT; g.lineWidth = (ow || 1.5) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
}
function inpath(g, parts, fn) { g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip(); fn(g); g.restore(); }
function celp(g, parts, base, dx, dy) {
  inpath(g, parts, (h) => {
    const P = () => { h.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](h); h.fill(); };
    h.fillStyle = ART.dark(base, 0.24); P();
    h.translate(-dx, -dy); h.fillStyle = base; P();
    h.translate(-dx * 1.15, -dy * 1.15); h.fillStyle = ART.lite(base, 0.2); P();
  });
}
function celm(g, parts, dx, dy) { for (let i = 0; i < parts.length; i++) celp(g, [parts[i]], parts[i][1], dx, dy); }
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.7 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); g.fill(); }
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
const FS = N > 10 ? 11 : 15, LH = FS + (N > 10 ? 2 : 3), PT = 54, OX = N > 10 ? 116 : 112, S = Math.floor((468 - OX) / N), OY = PT + Math.ceil(N / 2) * LH + 14;
let sol, grid, rows, cols, solved, paint, mistakes, puzzle, seedR, tool, from, start, axis, cur, kbd, tm, revT, rowOk, colOk, pulse;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clue = (line) => { const r = []; let n = 0; for (const v of line) { if (v) n++; else if (n) { r.push(n); n = 0; } } if (n) r.push(n); return r.length ? r : [0]; };
function build() {
  const d = new Date(); seedR = CFG.daily ? mulberry(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + puzzle * 7919) : Math.random;
  const fill = Math.max(k.dif === 0 ? 0.66 : k.dif === 2 ? 0.55 : 0.6, (k.dif === 0 ? 0.8 : k.dif === 2 ? 0.68 : 0.74) - puzzle * 0.025); /* 1.23: más lleno al principio */ /* primeros puzzles más llenos (bloques largos, más fáciles de deducir) */
  sol = Array.from({ length: N }, () => Array.from({ length: N }, () => seedR() < fill));
  for (const r of sol) for (let x = 0; x < N >> 1; x++) r[N - 1 - x] = r[x]; // simetría especular: el resultado parece un dibujo
  grid = Array.from({ length: N }, () => Array(N).fill(0)); rows = sol.map(clue); cols = sol[0].map((_, x) => clue(sol.map((r) => r[x]))); solved = false;
  tm = 0; revT = 0; paint = undefined; axis = null; cur = [0, 0]; rowOk = rows.map(() => false); colOk = cols.map(() => false); pulse = { r: rows.map(() => 0), c: cols.map(() => 0) };
}
const rowDone = (y) => clue(grid[y].map((v) => v === 1)).join() === rows[y].join();
const colDone = (x) => clue(grid.map((r) => r[x] === 1)).join() === cols[x].join();
function check() {
  // líneas recién completadas: destello y sonido
  for (let y = 0; y < N; y++) { const ok = rowDone(y); if (ok && !rowOk[y]) { pulse.r[y] = 1; k.sfx('coin'); } rowOk[y] = ok; }
  for (let x = 0; x < N; x++) { const ok = colDone(x); if (ok && !colOk[x]) { pulse.c[x] = 1; k.sfx('coin'); } colOk[x] = ok; }
  const ok = rowOk.every(Boolean) && colOk.every(Boolean); if (ok) { solved = true; revT = 0.001; k.best(CFG.id, puzzle + 1); /* 1.23: récord = puzzles resueltos */ k.sfx('win'); }
}
function reset() { if (puzzle === undefined) puzzle = 0; else puzzle++; build(); if (!tool) tool = 1; }
function setCell(x, y) { if (grid[y][x] === paint) return; if (paint === 0 ? grid[y][x] !== from : grid[y][x] !== 0) return; grid[y][x] = paint; check(); }
function press(x, y, t) { from = grid[y][x]; paint = t === 1 ? (from === 1 ? 0 : 1) : (from === 2 ? 0 : 2); grid[y][x] = paint; check(); k.sfx(paint === 1 ? 'pop' : 'click'); }

/* ---------- Gráficos ---------- */
let bgCv;
function makeBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2d3a66'); gr.addColorStop(1, '#161d36'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let y = 0; y < H; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < W; x += 12) g.fillRect(x, y, 2, 2);
  const vg = g.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 420); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // marco del papel (pistas + tablero)
  const B = N * S; g.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(g, 8, PT + 6, W - 16, OY + B - PT + 6, 16); g.fill();
  ART.rr(g, 6, PT, W - 12, OY + B - PT + 6, 16); ART.fillOut(g, '#efe6d2', 3.5);
  for (let y = 0; y < N; y++) if (y % 2) { g.fillStyle = 'rgba(90,70,40,.07)'; g.fillRect(12, OY + y * S, OX - 14, S); }
  for (let x = 0; x < N; x++) if (x % 2) { g.fillStyle = 'rgba(90,70,40,.07)'; g.fillRect(OX + x * S, PT + 4, S, OY - PT - 6); }
  g.fillStyle = '#fbf7ee'; g.fillRect(OX, OY, B, B);
  g.strokeStyle = 'rgba(60,50,40,.22)'; g.lineWidth = 1; for (let i = 1; i < N; i++) { g.beginPath(); g.moveTo(OX + i * S + 0.5, OY); g.lineTo(OX + i * S + 0.5, OY + B); g.moveTo(OX, OY + i * S + 0.5); g.lineTo(OX + B, OY + i * S + 0.5); g.stroke(); }
  return cv;
}
function label(s, x, y, size, col, align, base) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
const TBY = OY + N * S + 12, TBW = 130, TB = [{ t: 1, x: W / 2 - TBW - 8, n: 'Pintar' }, { t: 2, x: W / 2 + 8, n: 'Marcar' }];
/* Casilla pintada: pieza única con 3 tonos duros, cacheada por color (R5 §8) */
const cellCv = {};
function cellSprite(col) {
  const key = col + '|' + Math.round(S); let q = cellCv[key]; if (q) return q;
  const d = Math.ceil(S * CDPR); q = document.createElement('canvas'); q.width = q.height = d;
  const g = q.getContext('2d'); g.scale(d / S, d / S);
  const body = (h) => ART.rr(h, 1, 1, S - 2, S - 2, S * 0.1), parts = [[body, col]];
  uni(g, parts, 1.1);
  celp(g, parts, col, S * 0.12, S * 0.12);
  if (S >= 26) spec(g, S * 0.32, S * 0.24, S * 0.14, S * 0.06, -0.5, 0.34);
  cellCv[key] = q; return q;
}
function cross(x, y, s, col, lw) { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x + s, y + s); c.moveTo(x + s, y - s); c.lineTo(x - s, y + s); c.stroke(); }

k.onDif = () => { if (k.st !== 'play') build(); };
reset(); k.show(CFG.title, 'Rellena las casillas según las pistas: cada número es un bloque seguido de casillas pintadas. Elige Pintar o Marcar y toca o arrastra. Teclado: flechas, A pinta, B marca.');
k.run((dt) => {
  pulse.r = pulse.r.map((v) => Math.max(0, v - dt * 2)); pulse.c = pulse.c.map((v) => Math.max(0, v - dt * 2));
  if (revT) { revT += dt; if (revT > 1.8 && k.st === 'play') { k.st = 'over'; const mm = Math.floor(tm / 60), ss = String(Math.floor(tm % 60)).padStart(2, '0'); k.show("¡Resuelto!", `Puzzle ${puzzle + 1} resuelto en ${mm}:${ss}<br>${CFG.daily ? 'Toca para el siguiente puzzle del día' : 'Toca para un nuevo puzzle'}`); } }
  if (!k.gate(reset) || solved) return;
  tm += dt;
  if (k.ptr.hit) { kbd = false; for (const b of TB) if (k.ptr.x > b.x && k.ptr.x < b.x + TBW && k.ptr.y > TBY - 4 && k.ptr.y < TBY + 40) { tool = b.t; k.sfx('click'); } }
  const cx = Math.floor((k.ptr.x - OX) / S), cy = Math.floor((k.ptr.y - OY) / S), inb = cx >= 0 && cy >= 0 && cx < N && cy < N;
  if (k.ptr.hit && inb) { start = [cx, cy]; axis = null; press(cx, cy, tool); }
  if (k.ptr.down && paint !== undefined && start) { let x = k.clamp(cx, 0, N - 1), y = k.clamp(cy, 0, N - 1);
    if (!axis && (x !== start[0] || y !== start[1])) axis = Math.abs(k.ptr.x - k.ptr.sx) > Math.abs(k.ptr.y - k.ptr.sy) ? 'row' : 'col';
    if (axis === 'row') y = start[1]; if (axis === 'col') x = start[0];
    // rellena todo el tramo desde el inicio (arrastres rápidos no se saltan casillas)
    if (axis === 'row') for (let i = Math.min(x, start[0]); i <= Math.max(x, start[0]); i++) setCell(i, y); else if (axis === 'col') for (let i = Math.min(y, start[1]); i <= Math.max(y, start[1]); i++) setCell(x, i); }
  if (k.ptr.up) { paint = undefined; start = null; }
  const DV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  for (const d in DV) if (k.hit.has(d)) { kbd = true; cur = [k.clamp(cur[0] + DV[d][0], 0, N - 1), k.clamp(cur[1] + DV[d][1], 0, N - 1)]; }
  if (k.hit.has('a')) { kbd = true; press(cur[0], cur[1], 1); paint = undefined; }
  if (k.hit.has('b')) { kbd = true; press(cur[0], cur[1], 2); paint = undefined; }
}, () => {
  if (!bgCv) bgCv = makeBg(); c.drawImage(bgCv, 0, 0, W, H);
  label(CFG.title, 14, 13, CFG.title.length > 14 ? 17 : 18, '#ffd23d');
  c.font = '600 12px -apple-system,Segoe UI,Roboto,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = '#b9c3e8'; c.fillText(CFG.daily ? `Puzzle del día #${puzzle + 1} · ${N}×${N}` : `Puzzle ${puzzle + 1} · ${N}×${N}`, 15, 42);
  const mm = Math.floor(tm / 60), ss = String(Math.floor(tm % 60)).padStart(2, '0'); label(`${mm}:${ss}`, W - 16, 14, 22, '#fff', 'right');
  c.font = '800 11px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = 'right'; c.fillStyle = '#b9c3e8'; c.fillText(`${rowOk.filter(Boolean).length + colOk.filter(Boolean).length}/${2 * N} líneas`, W - 16, 44);
  // herramientas
  for (const b of TB) { const on = tool === b.t, y = TBY + (on ? 2 : 0); c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, b.x, TBY + 4, TBW, 34, 10); c.fill(); ART.rr(c, b.x, y, TBW, 34, 10); ART.fillOut(c, on ? (b.t === 1 ? '#4a4fb8' : '#e0575a') : '#d8cdb4', 2.5);
    const ix = b.x + 26, iy = y + 17; if (b.t === 1) { ART.rr(c, ix - 8, iy - 8, 16, 16, 3); ART.fillOut(c, on ? '#fff' : '#3a3f8f', 2); } else cross(ix, iy, 6, on ? '#fff' : '#d04848', 3.5);
    c.font = '800 16px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = on ? '#fff' : '#5a4a36'; c.fillText(b.n, ix + 18, iy + 1); }
  // miniatura del dibujo en la esquina de las pistas
  { const ms = Math.min(Math.floor((OX - 30) / N), Math.floor((OY - PT - 16) / N)), mx = (OX - N * ms) / 2 + 2, my = PT + (OY - PT - N * ms) / 2; c.fillStyle = '#fbf7ee'; c.fillRect(mx - 2, my - 2, N * ms + 4, N * ms + 4); c.strokeStyle = 'rgba(60,50,40,.35)'; c.lineWidth = 1; c.strokeRect(mx - 2.5, my - 2.5, N * ms + 5, N * ms + 5);
    c.fillStyle = '#3a3f8f'; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (grid[y][x] === 1) c.fillRect(mx + x * ms, my + y * ms, ms, ms); }
  const hy = kbd ? cur[1] : (k.ptr.y - OY) / S | 0, hx = kbd ? cur[0] : (k.ptr.x - OX) / S | 0, hov = !solved && hx >= 0 && hy >= 0 && hx < N && hy < N && k.ptr.x >= OX && k.ptr.y >= OY;
  if (hov) { c.fillStyle = 'rgba(92,120,255,.14)'; c.fillRect(12, OY + hy * S, OX - 12 + N * S, S); c.fillRect(OX + hx * S, PT + 4, S, OY - PT - 4 + N * S); }
  // pistas
  const fs = FS;
  for (let y = 0; y < N; y++) { const ok = rowOk[y], p = pulse.r[y]; if (p) { c.fillStyle = `rgba(95,224,138,${p * 0.5})`; c.fillRect(12, OY + y * S, OX - 14, S); }
    c.font = `800 ${fs}px ui-rounded,"Trebuchet MS",sans-serif`; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillStyle = ok ? 'rgba(60,140,90,.55)' : '#2b2440'; c.fillText(rows[y].join(' '), OX - 7, OY + y * S + S / 2 + 1); }
  for (let x = 0; x < N; x++) { const ok = colOk[x], p = pulse.c[x]; if (p) { c.fillStyle = `rgba(95,224,138,${p * 0.5})`; c.fillRect(OX + x * S, PT + 4, S, OY - PT - 6); }
    c.font = `800 ${fs}px ui-rounded,"Trebuchet MS",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ok ? 'rgba(60,140,90,.55)' : '#2b2440'; const lh = LH;
    cols[x].forEach((n, i) => c.fillText(n, OX + x * S + S / 2, OY - 4 - lh / 2 - (cols[x].length - 1 - i) * lh)); }
  // casillas
  const t = performance.now() / 1000;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = grid[y][x], X = OX + x * S, Y = OY + y * S;
    if (v === 1) { const w = revT ? Math.min(1, Math.max(0, revT * 2.2 - (x + y) / N * 0.8)) : 0, col = w > 0 ? `hsl(${190 + ((x + y) / (2 * N)) * 170},75%,${40 + 18 * Math.round(w * 4) / 4}%)` : '#3a3f8f';
      c.drawImage(cellSprite(col), X, Y, S, S); }
    else if (v === 2 && !revT) cross(X + S / 2, Y + S / 2, S * 0.22, '#d04848', N > 10 ? 2.2 : 3);
    else if (!v && !revT && (rowOk[y] || colOk[x])) cross(X + S / 2, Y + S / 2, S * 0.13, 'rgba(60,50,40,.18)', 1.5); }
  // líneas gruesas cada 5 y marco
  c.strokeStyle = '#5a4a36'; c.lineWidth = 2; for (let i = 5; i < N; i += 5) { c.beginPath(); c.moveTo(OX + i * S, OY); c.lineTo(OX + i * S, OY + N * S); c.moveTo(OX, OY + i * S); c.lineTo(OX + N * S, OY + i * S); c.stroke(); }
  c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(OX, OY, N * S, N * S);
  if (kbd && !solved) { c.strokeStyle = '#e0575a'; c.lineWidth = 3; c.strokeRect(OX + cur[0] * S + 1.5, OY + cur[1] * S + 1.5, S - 3, S - 3); }
  if (revT) { const a = Math.min(1, revT * 2); c.globalAlpha = a; label('¡Imagen revelada!', OX + N * S / 2, OY + N * S / 2, 30 + Math.sin(t * 6) * 1.5, '#ffd23d', 'center', 'middle'); c.globalAlpha = 1; }
});
