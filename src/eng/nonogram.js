/* Nonogramas. CFG.size, CFG.daily
 * Tablero de papel con bloques en relieve, herramientas Pintar / Marcar, arrastre bloqueado a fila o columna,
 * pistas que se apagan al cumplirse, resaltado de fila y columna, cronómetro y revelado en color al resolver.
 *
 * pixel-picross-xl (vara del gancho): 20 dibujos escritos a mano en src/eng/piclv.js, con
 * solución única verificada en Node (scripts/check_piclv.js), progreso y estrellas por dificultad,
 * autocruces, ampliar/desplazar y cadena de líneas. Todo eso vive dentro de `if (HAND)`:
 * nonogram-daily (y cualquier otro slug sin tabla) se comporta exactamente como antes. */
const NB = CFG.size || 10, W = 480, H = 560, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#1b2440' }), c = k.ctx;
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
const PT = 54;
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms);

/* ---------- Dibujos a mano (solo pixel-picross-xl) ---------- */
const HAND = (typeof PICLV !== 'undefined' && PICLV[CFG.id]) || null;
const LVN = HAND ? HAND.length : 0;
const lvOf = () => HAND[k.clamp(level || 1, 1, LVN) - 1];
/* Objetivos por dificultad: en fácil sobra tiempo, en difícil aprieta. */
const DIFP = [1.4, 1, 0.75];
const par = (v) => Math.round(v * DIFP[k.dif] || v);
if (HAND && !CFG.help) CFG.help = 'Los números de cada fila y columna son los bloques pintados, en orden y separados por al menos un hueco. Pinta lo seguro, marca con cruces lo que sepas vacío y no hace falta adivinar nunca. Arrastra para pintar de seguido; con «Mover» y la lupa puedes acercar el tablero.';

/* Dificultad (normal = exactamente como siempre): la rejilla encoge dos casillas en fácil y crece dos en
   difícil, siempre que el tablero siga cabiendo en el alto de siempre; si no cabe, se queda como está.
   Con dibujo a mano el tamaño lo manda el dibujo y la dificultad no lo toca. */
let N, FS, LH, OX, S, OY, TBY, TB;
function geo(n) { const fs = n > 10 ? 11 : 15, lh = fs + (n > 10 ? 2 : 3), ox = n > 10 ? 116 : 112, s = Math.floor((468 - ox) / n); return { n, fs, lh, ox, s, oy: PT + Math.ceil(n / 2) * lh + 14 }; }
function layout() {
  const base = geo(NB), lim = base.oy + base.n * base.s, d = k.dif === 0 ? -2 : k.dif === 2 ? 2 : 0; let q = base;
  for (let i = Math.abs(d); i > 0; i--) { const t2 = geo(k.clamp(NB + Math.sign(d) * i, 5, 20)); if (t2.oy + t2.n * t2.s <= lim) { q = t2; break; } }
  N = q.n; FS = q.fs; LH = q.lh; OX = q.ox; S = q.s; OY = q.oy;
  tools();
}
/* Con dibujo a mano la franja de pistas se mide de verdad (no se reserva media rejilla),
   así el 20×20 sale con casillas de 19 px en vez de 17 y sin banda vacía arriba. */
function layoutHand() {
  FS = N > 12 ? 11 : N > 8 ? 13 : 15; LH = FS + (N > 12 ? 2 : 3);
  const mr = Math.max(...rows.map((r) => r.join(' ').length)), mc = Math.max(...cols.map((r) => r.length));
  OX = k.clamp(Math.ceil(mr * FS * 0.62) + 16, 44, 150);
  OY = PT + mc * LH + 10;
  S = Math.max(12, Math.min(Math.floor((470 - OX) / N), Math.floor((500 - OY) / N)));
  OX += Math.floor((470 - OX - N * S) / 2);
  tools();
}
const TBW = 130;
function tools() {
  TBY = HAND ? Math.min(H - 46, OY + N * S + 12) : OY + N * S + 12;   /* sin dibujo a mano, exactamente donde estaba */
  TB = HAND
    ? [{ t: 1, x: 10, w: 124, n: 'Pintar' }, { t: 2, x: 142, w: 124, n: 'Marcar' }, { t: 3, x: 274, w: 96, n: 'Mover' }, { t: 4, x: 378, w: 92, n: 'Zoom' }]
    : [{ t: 1, x: W / 2 - TBW - 8, w: TBW, n: 'Pintar' }, { t: 2, x: W / 2 + 8, w: TBW, n: 'Marcar' }];
  bgCv = null; paperCv = null;
}
let sol, grid, rows, cols, solved, paint, mistakes, puzzle, seedR, tool, from, start, axis, cur, kbd, tm, revT, rowOk, colOk, pulse;
let level = 1, chain = 0, chainT = 0, banner = null, done = false, painted = 0, need = 0, Z = 1, VX = 0, VY = 0, panS = null, vp = { x: 0, y: 0, w: W, h: H };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clue = (line) => { const r = []; let n = 0; for (const v of line) { if (v) n++; else if (n) { r.push(n); n = 0; } } if (n) r.push(n); return r.length ? r : [0]; };
function common() {
  grid = Array.from({ length: N }, () => Array(N).fill(0)); solved = false; done = false;
  tm = 0; revT = 0; paint = undefined; axis = null; cur = [0, 0]; chain = 0; chainT = 0; mistakes = 0;
  rowOk = rows.map(() => false); colOk = cols.map(() => false); pulse = { r: rows.map(() => 0), c: cols.map(() => 0) };
  painted = 0; need = sol.reduce((a, r) => a + r.filter(Boolean).length, 0);
  Z = 1; VX = 0; VY = 0; panS = null; if (!tool || tool > 2) tool = 1; clampPan();
}
function buildHand() {
  const L = lvOf(); N = L.n;
  sol = L.b.map((r) => [...r].map((ch) => ch === '#'));
  rows = sol.map(clue); cols = sol[0].map((_, x) => clue(sol.map((r) => r[x])));
  layoutHand(); common();
  /* Fácil: las líneas vacías vienen ya cruzadas (no destripa nada del dibujo y enseña el 0). */
  if (k.dif === 0) {
    for (let y = 0; y < N; y++) if (rows[y][0] === 0) for (let x = 0; x < N; x++) grid[y][x] = 2;
    for (let x = 0; x < N; x++) if (cols[x][0] === 0) for (let y = 0; y < N; y++) grid[y][x] = 2;
  }
  banner = { t: L.q, d: L.d, a: 0, life: 7 };
  check(1);   // marca como hechas las líneas vacías ya cruzadas, sin premio ni sonido
}
function build() {
  if (HAND) return buildHand();
  layout();
  const d = new Date(); seedR = CFG.daily ? mulberry(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + puzzle * 7919) : Math.random;
  const fill = Math.max(k.dif === 0 ? 0.66 : k.dif === 2 ? 0.55 : 0.6, (k.dif === 0 ? 0.8 : k.dif === 2 ? 0.68 : 0.74) - puzzle * 0.025); /* 1.23: más lleno al principio */ /* primeros puzzles más llenos (bloques largos, más fáciles de deducir) */
  sol = Array.from({ length: N }, () => Array.from({ length: N }, () => seedR() < fill));
  for (const r of sol) for (let x = 0; x < N >> 1; x++) r[N - 1 - x] = r[x]; // simetría especular: el resultado parece un dibujo
  rows = sol.map(clue); cols = sol[0].map((_, x) => clue(sol.map((r) => r[x])));
  common();
  /* Fácil: unas pocas casillas ya resueltas como pista de arranque (no altera el dibujo ni su unicidad). */
  if (k.dif === 0) for (const i of k.shuffle([...Array(N * N).keys()]).slice(0, Math.max(3, Math.round(N * N * 0.06)))) { const y = Math.floor(i / N), x = i % N; grid[y][x] = sol[y][x] ? 1 : 2; if (grid[y][x] === 1) painted++; }
}
const rowDone = (y) => clue(grid[y].map((v) => v === 1)).join() === rows[y].join();
const colDone = (x) => clue(grid.map((r) => r[x] === 1)).join() === cols[x].join();
/* Autocruces: al cerrar una línea, lo que queda en blanco es vacío seguro. Fuera del modo difícil. */
const AUTOX = () => HAND && k.dif !== 2;
function lineReward(cx, cy) {
  if (!HAND) return;
  chain = chainT > 0 ? chain + 1 : 1; chainT = 4.5;
  k.chime(chain - 1);
  if (chain > 1) k.combo(chain, cx, cy);
  if (chain === 3) k.reward('¡Tres seguidas!', '#7cf7a0');
  if (chain === 6) k.reward('¡En racha!', '#ffd23d');
}
function check(quiet) {
  // líneas recién completadas: destello, sonido, cadena y cruces automáticas
  for (let y = 0; y < N; y++) { const ok = rowDone(y); if (ok && !rowOk[y] && !solved && !quiet) { pulse.r[y] = 1; k.sfx('coin'); if (AUTOX()) for (let x = 0; x < N; x++) if (!grid[y][x]) grid[y][x] = 2; lineReward(OX + N * S / 2, OY + (y + 0.5) * S); } rowOk[y] = ok; }
  for (let x = 0; x < N; x++) { const ok = colDone(x); if (ok && !colOk[x] && !solved && !quiet) { pulse.c[x] = 1; k.sfx('coin'); if (AUTOX()) for (let y = 0; y < N; y++) if (!grid[y][x]) grid[y][x] = 2; lineReward(OX + (x + 0.5) * S, OY + N * S / 2); } colOk[x] = ok; }
  const ok = rowOk.every(Boolean) && colOk.every(Boolean);
  if (ok && !solved) {
    solved = true; revT = 0.001; k.sfx('win'); if (HAND) k.punch(0.06);
    if (!HAND) k.best(CFG.id, puzzle + 1); /* 1.23: récord = puzzles resueltos */
  }
}
function reset() {
  if (HAND) { level = k.lv; build(); return; }
  if (puzzle === undefined) puzzle = 0; else puzzle++;
  build(); if (!tool) tool = 1;
}
/* Pintar en una casilla que el dibujo deja vacía es un fallo: se marca con cruz (ahora se sabe
   que está vacía), suena y cuesta la tercera estrella. Sin fallos, la partida no puede atascarse. */
function wrong(x, y) {
  mistakes++; chain = 0; chainT = 0; grid[y][x] = 2;
  k.sfx('hurt'); k.hitstop(0.05); k.shake(6); k.flash('rgba(255,90,90,.22)');
  k.float('¡Ahí no!', OX + (x + 0.5) * S, OY + y * S - 4, '#ff8a8a');
}
function setCell(x, y) {
  if (grid[y][x] === paint) return;
  if (paint === 0 ? grid[y][x] !== from : grid[y][x] !== 0) return;
  if (HAND && paint === 1 && !sol[y][x]) return wrong(x, y);
  if (grid[y][x] === 1) painted--; if (paint === 1) painted++;
  grid[y][x] = paint; check();
}
function press(x, y, t) {
  from = grid[y][x]; paint = t === 1 ? (from === 1 ? 0 : 1) : (from === 2 ? 0 : 2);
  if (HAND && paint === 1 && !sol[y][x]) { paint = undefined; return wrong(x, y); }
  if (grid[y][x] === 1) painted--; if (paint === 1) painted++;
  grid[y][x] = paint; check(); k.sfx(paint === 1 ? 'pop' : 'click');
}

/* ---------- Ampliar y desplazar ---------- */
function content() { return { x0: 6, y0: PT, x1: W - 6, y1: OY + N * S + 6 }; }
function clampPan() {
  /* Sin dibujo a mano no hay lupa ni desplazamiento: todo queda exactamente donde estaba. */
  if (!HAND) { Z = 1; VX = 0; VY = 0; vp = { x: 0, y: 0, w: W, h: H }; return; }
  const q = content();
  vp = { x: 4, y: PT - 6, w: W - 8, h: Math.min(H - 52, q.y1 + 4) - (PT - 6) };
  const lo = vp.x + vp.w - Z * q.x1, hi = vp.x - Z * q.x0;
  VX = lo > hi ? (lo + hi) / 2 : k.clamp(VX, lo, hi);
  const lo2 = vp.y + vp.h - Z * q.y1, hi2 = vp.y - Z * q.y0;
  VY = lo2 > hi2 ? (lo2 + hi2) / 2 : k.clamp(VY, lo2, hi2);
}
function setZoom(z) {
  const cx = vp.x + vp.w / 2, cy = vp.y + vp.h / 2, bx = (cx - VX) / Z, by = (cy - VY) / Z;
  Z = z; VX = cx - Z * bx; VY = cy - Z * by; clampPan(); k.sfx('click');
}
const px2b = (px, py) => [(px - VX) / Z, (py - VY) / Z];

/* ---------- Gráficos ---------- */
let bgCv, paperCv;
function makeBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2d3a66'); gr.addColorStop(1, '#161d36'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let y = 0; y < H; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < W; x += 12) g.fillRect(x, y, 2, 2);
  const vg = g.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 420); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  if (!HAND) paper(g);   /* sin dibujo a mano el papel se hornea aquí, igual que siempre (mismos píxeles en el borde) */
  return cv;
}
function makePaper() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  paper(g);
  return cv;
}
function paper(g) {
  // marco del papel (pistas + tablero)
  const B = N * S; g.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(g, 8, PT + 6, W - 16, OY + B - PT + 6, 16); g.fill();
  ART.rr(g, 6, PT, W - 12, OY + B - PT + 6, 16); ART.fillOut(g, '#efe6d2', 3.5);
  for (let y = 0; y < N; y++) if (y % 2) { g.fillStyle = 'rgba(90,70,40,.07)'; g.fillRect(12, OY + y * S, OX - 14, S); }
  for (let x = 0; x < N; x++) if (x % 2) { g.fillStyle = 'rgba(90,70,40,.07)'; g.fillRect(OX + x * S, PT + 4, S, OY - PT - 6); }
  g.fillStyle = '#fbf7ee'; g.fillRect(OX, OY, B, B);
  g.strokeStyle = 'rgba(60,50,40,.22)'; g.lineWidth = 1; for (let i = 1; i < N; i++) { g.beginPath(); g.moveTo(OX + i * S + 0.5, OY); g.lineTo(OX + i * S + 0.5, OY + B); g.moveTo(OX, OY + i * S + 0.5); g.lineTo(OX + B, OY + i * S + 0.5); g.stroke(); }
}
function label(s, x, y, size, col, align, base) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function wrap(s, size, maxw) {
  c.font = `700 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  const words = s.split(' '), out = []; let ln = '';
  for (const w of words) { const test = ln ? ln + ' ' + w : w; if (c.measureText(test).width > maxw && ln) { out.push(ln); ln = w; } else ln = test; }
  if (ln) out.push(ln); return out;
}
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

/* ---------- Fin de nivel (dibujo a mano) ---------- */
function handDone() {
  const L = lvOf(), tt = Math.round(tm), p2 = par(L.p2), p3 = par(L.p3);
  const stars = tt <= p3 && !mistakes ? 3 : tt <= p2 ? 2 : 1;
  const fmt = (v) => `${Math.floor(v / 60)}:${String(Math.floor(v) % 60).padStart(2, '0')}`;
  const score = Math.max(100, 1200 - tt * 2) * level - mistakes * 40;
  k.best(CFG.id, score);
  /* La tarjeta dice qué falta exactamente para la siguiente estrella. */
  let falta = '';
  if (stars === 1) falta = `Para 2★: termínalo en ${fmt(p2)} o menos.`;
  else if (stars === 2) { const f = [];
    if (tt > p3) f.push(`en ${fmt(p3)} o menos`);
    if (mistakes) f.push('sin pintar ni una casilla vacía');
    falta = 'Para 3★: ' + f.join(' y ') + '.'; }
  k.levelDone(score, `Es <b>${L.t}</b> · Tiempo ${fmt(tt)} (2★ ${fmt(p2)} · 3★ ${fmt(p3)} sin fallos) · Fallos ${mistakes}${falta ? '<br><b>' + falta + '</b>' : ''}`, { stars });
}

k.onDif = () => { if (k.st !== 'play') { if (HAND) level = k.lv; build(); } };
if (HAND) level = k.levels(LVN, { start: (i) => { level = i; build(); } });
reset();
k.show(CFG.title, HAND ? CFG.help : 'Rellena las casillas según las pistas: cada número es un bloque seguido de casillas pintadas. Elige Pintar o Marcar y toca o arrastra. Teclado: flechas, A pinta, B marca.');
k.run((dt) => {
  pulse.r = pulse.r.map((v) => Math.max(0, v - dt * 2)); pulse.c = pulse.c.map((v) => Math.max(0, v - dt * 2));
  if (chainT > 0) { chainT -= dt; if (chainT <= 0) { chain = 0; k.chainReset(); } }
  if (banner) { banner.a = Math.min(1, banner.a + dt * 3); if (banner.life > 0) { banner.life -= dt; if (banner.life <= 0) banner = null; } }
  if (revT) { revT += dt;
    if (revT > 1.8 && !done) {
      done = true;
      if (HAND) handDone();
      else { k.st = 'over'; const mm = Math.floor(tm / 60), ss = String(Math.floor(tm % 60)).padStart(2, '0'); k.show('¡Resuelto!', `Puzzle ${puzzle + 1} resuelto en ${mm}:${ss}<br>${CFG.daily ? 'Toca para el siguiente puzzle del día' : 'Toca para un nuevo puzzle'}`); }
    } }
  if (!k.gate(reset) || solved) return;
  tm += dt;
  clampPan();
  if (k.ptr.hit) { kbd = false;
    for (const b of TB) if (k.ptr.x > b.x && k.ptr.x < b.x + b.w && k.ptr.y > TBY - 4 && k.ptr.y < TBY + 40) {
      if (b.t === 4) setZoom(Z >= 2 ? 1 : Z >= 1.5 ? 2 : 1.5);
      else { tool = b.t; k.sfx('click'); if (banner) banner.life = Math.min(banner.life, 0.6); }
      return;
    } }
  const inVp = k.ptr.x > vp.x && k.ptr.x < vp.x + vp.w && k.ptr.y > vp.y && k.ptr.y < vp.y + vp.h;
  if (tool === 3) { // desplazar el tablero
    if (k.ptr.hit && inVp) panS = [k.ptr.x - VX, k.ptr.y - VY];
    if (k.ptr.down && panS) { VX = k.ptr.x - panS[0]; VY = k.ptr.y - panS[1]; clampPan(); }
    if (k.ptr.up) panS = null;
  } else {
    const [bx, by] = px2b(k.ptr.x, k.ptr.y);
    const cx = Math.floor((bx - OX) / S), cy = Math.floor((by - OY) / S), inb = cx >= 0 && cy >= 0 && cx < N && cy < N && inVp;
    if (k.ptr.hit && inb) { start = [cx, cy]; axis = null; press(cx, cy, tool); if (banner) banner.life = Math.min(banner.life, 0.6); }
    if (k.ptr.down && paint !== undefined && start) { let x = k.clamp(cx, 0, N - 1), y = k.clamp(cy, 0, N - 1);
      if (!axis && (x !== start[0] || y !== start[1])) axis = Math.abs(k.ptr.x - k.ptr.sx) > Math.abs(k.ptr.y - k.ptr.sy) ? 'row' : 'col';
      if (axis === 'row') y = start[1]; if (axis === 'col') x = start[0];
      // rellena todo el tramo desde el inicio (arrastres rápidos no se saltan casillas)
      if (axis === 'row') for (let i = Math.min(x, start[0]); i <= Math.max(x, start[0]); i++) setCell(i, y); else if (axis === 'col') for (let i = Math.min(y, start[1]); i <= Math.max(y, start[1]); i++) setCell(x, i); }
    if (k.ptr.up) { paint = undefined; start = null; }
  }
  const DV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  for (const d in DV) if (k.hit.has(d)) { kbd = true; cur = [k.clamp(cur[0] + DV[d][0], 0, N - 1), k.clamp(cur[1] + DV[d][1], 0, N - 1)]; }
  if (k.hit.has('a')) { kbd = true; press(cur[0], cur[1], 1); paint = undefined; }
  if (k.hit.has('b')) { kbd = true; press(cur[0], cur[1], 2); paint = undefined; }
}, () => {
  if (!bgCv) bgCv = makeBg(); c.drawImage(bgCv, 0, 0, W, H);
  if (HAND && !paperCv) paperCv = makePaper();
  hud();
  // el tablero (papel, pistas y casillas) se pinta dentro del recuadro, con la lupa y el desplazamiento aplicados
  if (!HAND) { toolbar(); minimap(); }
  if (HAND) { c.save(); c.beginPath(); c.rect(vp.x, vp.y, vp.w, vp.h); c.clip(); c.translate(VX, VY); c.scale(Z, Z); }
  if (HAND) c.drawImage(paperCv, 0, 0, W, H);
  board();
  if (HAND) { c.restore(); toolbar(); }
  if (banner) drawBanner();
  if (revT) { const a = Math.min(1, revT * 2), t = performance.now() / 1000; c.globalAlpha = a;
    label(HAND ? '¡Es ' + lvOf().t + '!' : '¡Imagen revelada!', HAND ? W / 2 : OX + N * S / 2, HAND ? vp.y + vp.h / 2 : OY + N * S / 2, 30 + Math.sin(t * 6) * 1.5, '#ffd23d', 'center', 'middle'); c.globalAlpha = 1; }
});

function hud() {
  if (HAND) return hudHand();
  /* HUD de siempre (nonogram-daily y cualquier slug sin tabla): intacto. */
  label(CFG.title, 14, 13, CFG.title.length > 14 ? 17 : 18, '#ffd23d');
  c.font = '600 12px -apple-system,Segoe UI,Roboto,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = '#b9c3e8';
  c.fillText(CFG.daily ? `Puzzle del día #${puzzle + 1} · ${N}×${N}` : `Puzzle ${puzzle + 1} · ${N}×${N}`, 15, 42);
  const mm = Math.floor(tm / 60), ss = String(Math.floor(tm % 60)).padStart(2, '0'); label(`${mm}:${ss}`, W - 16, 14, 22, '#fff', 'right');
  c.font = '800 11px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = 'right'; c.fillStyle = '#b9c3e8';
  c.fillText(`${rowOk.filter(Boolean).length + colOk.filter(Boolean).length}/${2 * N} líneas`, W - 16, 44);
}
/* HUD de los dibujos a mano: nivel, reloj contra el objetivo de 2★, fallos, cadena y barra de casillas. */
function hudHand() {
  label(CFG.title, 14, 10, CFG.title.length > 14 ? 16 : 18, '#ffd23d');
  const mm = Math.floor(tm / 60), ss = String(Math.floor(tm % 60)).padStart(2, '0');
  const late = tm > par(lvOf().p2);
  label(`${mm}:${ss}`, W - 16, 10, 21, late ? '#ffb4a0' : '#fff', 'right');
  c.font = '600 12px -apple-system,Segoe UI,Roboto,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = '#b9c3e8';
  c.fillText(`Nivel ${level}/${LVN} · ${N}×${N}`, 15, 33);
  // meta siempre visible: barra de casillas pintadas y fallos
  /* La cuenta va DENTRO de la barra y la cadena pegada a «Fallos»: el centro de arriba queda
     libre para los botones de pausa y sonido del reproductor (se solapaban en 800×450). */
  const bw = 132, bx = W - 16 - bw, by = 35, p = need ? painted / need : 0;
  c.fillStyle = 'rgba(0,0,0,.45)'; ART.rr(c, bx, by, bw, 13, 6.5); c.fill();
  c.fillStyle = p >= 1 ? '#7cf7a0' : '#6e62f5'; ART.rr(c, bx + 1.5, by + 1.5, Math.max(3, (bw - 3) * p), 10, 5); c.fill();
  c.font = '800 11px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = p > 0.5 ? '#141a30' : '#e6ecff'; c.fillText(`${painted}/${need}`, bx + bw / 2, by + 7);
  c.textAlign = 'left'; c.fillStyle = mistakes ? '#ffb4a0' : '#8fa0cc';
  const ft = `Fallos ${mistakes}`; c.fillText(ft, 15, by + 7);
  if (chain > 1) { c.fillStyle = '#ffd23d'; c.fillText('· Cadena ×' + chain, 15 + c.measureText(ft).width + 8, by + 7); }
}
function board() {
  const hy = kbd ? cur[1] : ((px2b(k.ptr.x, k.ptr.y)[1] - OY) / S) | 0, hx = kbd ? cur[0] : ((px2b(k.ptr.x, k.ptr.y)[0] - OX) / S) | 0;
  const [pbx, pby] = px2b(k.ptr.x, k.ptr.y);
  const hov = !solved && hx >= 0 && hy >= 0 && hx < N && hy < N && (HAND ? (kbd || (pbx >= OX && pby >= OY)) : (k.ptr.x >= OX && k.ptr.y >= OY));
  if (hov) { c.fillStyle = 'rgba(92,120,255,.14)'; c.fillRect(12, OY + hy * S, OX - 12 + N * S, S); c.fillRect(OX + hx * S, PT + 4, S, OY - PT - 4 + N * S); }
  // pistas
  for (let y = 0; y < N; y++) { const ok = rowOk[y], p = pulse.r[y]; if (p) { c.fillStyle = `rgba(95,224,138,${p * 0.5})`; c.fillRect(12, OY + y * S, OX - 14, S); }
    c.font = `800 ${FS}px ui-rounded,"Trebuchet MS",sans-serif`; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillStyle = ok ? 'rgba(60,140,90,.55)' : '#2b2440'; c.fillText(rows[y].join(' '), OX - 7, OY + y * S + S / 2 + 1); }
  for (let x = 0; x < N; x++) { const ok = colOk[x], p = pulse.c[x]; if (p) { c.fillStyle = `rgba(95,224,138,${p * 0.5})`; c.fillRect(OX + x * S, PT + 4, S, OY - PT - 6); }
    c.font = `800 ${FS}px ui-rounded,"Trebuchet MS",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ok ? 'rgba(60,140,90,.55)' : '#2b2440';
    cols[x].forEach((n, i) => c.fillText(n, OX + x * S + S / 2, OY - 4 - LH / 2 - (cols[x].length - 1 - i) * LH)); }
  // casillas
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = grid[y][x], X = OX + x * S, Y = OY + y * S;
    if (v === 1) { const w = revT ? Math.min(1, Math.max(0, revT * 2.2 - (x + y) / N * 0.8)) : 0, col = w > 0 ? `hsl(${190 + ((x + y) / (2 * N)) * 170},75%,${40 + 18 * Math.round(w * 4) / 4}%)` : '#3a3f8f';
      c.drawImage(cellSprite(col), X, Y, S, S); }
    else if (v === 2 && !revT) cross(X + S / 2, Y + S / 2, S * 0.22, '#d04848', N > 10 ? 2.2 : 3);
    else if (!v && !revT && k.dif !== 2 && (rowOk[y] || colOk[x])) /* difícil: sin las cruces de cortesía */ cross(X + S / 2, Y + S / 2, S * 0.13, 'rgba(60,50,40,.18)', 1.5); }
  // líneas gruesas cada 5 y marco
  c.strokeStyle = '#5a4a36'; c.lineWidth = 2; for (let i = 5; i < N; i += 5) { c.beginPath(); c.moveTo(OX + i * S, OY); c.lineTo(OX + i * S, OY + N * S); c.moveTo(OX, OY + i * S); c.lineTo(OX + N * S, OY + i * S); c.stroke(); }
  c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(OX, OY, N * S, N * S);
  if (kbd && !solved) { c.strokeStyle = '#e0575a'; c.lineWidth = 3; c.strokeRect(OX + cur[0] * S + 1.5, OY + cur[1] * S + 1.5, S - 3, S - 3); }
  if (HAND) minimap();   /* sin dibujo a mano la miniatura va en su sitio de siempre, antes del tablero */
}
// miniatura del dibujo en la esquina de las pistas
function minimap() {
  const ms = Math.min(Math.floor((OX - (HAND ? 22 : 30)) / N), Math.floor((OY - PT - (HAND ? 12 : 16)) / N));
  if (ms < 2) return;
  const mx = (OX - N * ms) / 2 + 2, my = PT + (OY - PT - N * ms) / 2;
  c.fillStyle = '#fbf7ee'; c.fillRect(mx - 2, my - 2, N * ms + 4, N * ms + 4); c.strokeStyle = 'rgba(60,50,40,.35)'; c.lineWidth = 1; c.strokeRect(mx - 2.5, my - 2.5, N * ms + 5, N * ms + 5);
  c.fillStyle = '#3a3f8f'; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (grid[y][x] === 1) c.fillRect(mx + x * ms, my + y * ms, ms, ms);
}
function toolbar() {
  for (const b of TB) { const on = b.t === 4 ? Z > 1 : tool === b.t, y = TBY + (on ? 2 : 0);
    c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, b.x, TBY + 4, b.w, 34, 10); c.fill();
    ART.rr(c, b.x, y, b.w, 34, 10); ART.fillOut(c, on ? (b.t === 1 ? '#4a4fb8' : b.t === 2 ? '#e0575a' : '#3f8f6a') : '#d8cdb4', 2.5);
    const ix = b.x + (b.w > 100 ? 26 : 20), iy = y + 17;
    if (b.t === 1) { ART.rr(c, ix - 8, iy - 8, 16, 16, 3); ART.fillOut(c, on ? '#fff' : '#3a3f8f', 2); }
    else if (b.t === 2) cross(ix, iy, 6, on ? '#fff' : '#d04848', 3.5);
    else if (b.t === 3) { c.strokeStyle = on ? '#fff' : '#3c6b52'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(ix - 8, iy); c.lineTo(ix + 8, iy); c.moveTo(ix, iy - 8); c.lineTo(ix, iy + 8); c.moveTo(ix - 5, iy - 3); c.lineTo(ix - 8, iy); c.lineTo(ix - 5, iy + 3); c.moveTo(ix + 5, iy - 3); c.lineTo(ix + 8, iy); c.lineTo(ix + 5, iy + 3); c.stroke(); }
    else { c.strokeStyle = on ? '#fff' : '#5a4a36'; c.lineWidth = 2.6; c.beginPath(); c.arc(ix - 1, iy - 2, 6, 0, 6.2832); c.moveTo(ix + 4, iy + 3); c.lineTo(ix + 8, iy + 8); c.stroke(); }
    c.font = `800 ${b.w > 100 ? 16 : 13}px ui-rounded,"Trebuchet MS",sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = on ? '#fff' : '#5a4a36';
    c.fillText(b.t === 4 ? Z.toString().replace('.', ',') + '×' : b.n, ix + (b.w > 100 ? 18 : 14), iy + 1); }
}
/* Cartel de la técnica del nivel: se lee antes del primer toque y se aparta solo. */
function drawBanner() {
  const bw = 440, bx = (W - bw) / 2, lines = wrap(banner.d, 12.5, bw - 24).slice(0, 4);
  const bh = 26 + 15 * lines.length + 8, by = Math.max(vp.y + 6, vp.y + vp.h / 2 - bh / 2);
  c.globalAlpha = (0.35 + banner.a * 0.65) * Math.min(1, banner.life / 0.6);
  ART.rr(c, bx, by, bw, bh, 12); ART.fillOut(c, 'rgba(20,26,48,.92)', 2.5);
  c.fillStyle = 'rgba(255,255,255,.1)'; ART.rr(c, bx + 8, by + 3, bw - 16, 3, 2); c.fill();
  label(banner.t, bx + 12, by + 6, 15, '#ffd23d');
  label(`Nivel ${level}`, bx + bw - 12, by + 7, 13, '#a9b6e0', 'right');
  for (let i = 0; i < lines.length; i++) label(lines[i], bx + 12, by + 26 + i * 15, 12.5, '#dbe3ff');
  c.globalAlpha = 1;
}
