/* Tangram Studio: encaja todas las piezas en la silueta.
 * Con POLYLV (tangram-studio) son 20 figuras dibujadas a mano con progreso por dificultad,
 * espejo obligatorio, pieza fija, señuelos y tres estrellas. Sin POLYLV el motor sigue
 * exactamente como antes (partición aleatoria del cuadrado), por si algún día sirve a otro juego.
 * Arte propio: bandeja de madera con casillas hundidas, piezas con bisel que se levantan al arrastrar. */
const W = 480, H = 640, OUT = ART.OUT;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1a1630' }), c = k.ctx;
const HAND = (typeof POLYLV !== 'undefined' && POLYLV.G[CFG.id]) ? POLYLV : null;
const LVS = HAND ? HAND.G[CFG.id] : null;
/* ---------- R5 §8 «pieza única» + cartoon de estudio (helpers locales) ---------- */
function inpath(g, parts, fn) { g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip(); fn(g); g.restore(); }
function celp(g, parts, base, dx, dy) {
  inpath(g, parts, (h) => {
    const P = () => { h.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](h); h.fill(); };
    h.fillStyle = ART.dark(base, 0.24); P();
    h.translate(-dx, -dy); h.fillStyle = base; P();
    h.translate(-dx * 1.15, -dy * 1.15); h.fillStyle = ART.lite(base, 0.2); P();
  });
}
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.7 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); g.fill(); }
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms); /* 1.23: la pantalla final espera si el juego está en pausa */
const COL = ['#ff6b6b', '#5ce1e6', '#ffd23d', '#7cf7a0', '#b98cff', '#ffa94d', '#ff9ad5', '#6c8cff', '#f2705a', '#48d6b0', '#c9e35a', '#8a9cff'];
const DEC_COL = '#8a8299';

/* ---------- geometría de piezas ---------- */
function norm(sh) { const mx = Math.min(...sh.map((q) => q[0])), my = Math.min(...sh.map((q) => q[1]));
  return sh.map((q) => [q[0] - mx, q[1] - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]); }
const rot = (sh) => norm(sh.map(([x, y]) => [-y, x]));
const mir = (sh) => norm(sh.map(([x, y]) => [-x, y]));
const pkey = (sh) => norm(sh).map((q) => q.join()).join(';');
/* Los 4 giros de una postura (sin repetir). El espejo NO se alcanza girando: es el otro
   juego de posturas, y por eso VOLTEAR es un verbo aparte y no una vuelta más de la rueda. */
function rotsOf(sh) { const out = [], seen = {}; let s = norm(sh);
  for (let i = 0; i < 4; i++) { const kk = pkey(s); if (!seen[kk]) { seen[kk] = 1; out.push(s); } s = rot(s); }
  return out; }
const listOf = (p) => (p.side ? p.B : p.A);
function mkPiece(sol) { const A = rotsOf(sol), B = rotsOf(mir(sol));
  const inA = A.some((s) => pkey(s) === pkey(mir(sol)));
  return { A: A, B: B, chi: !inA, side: 0, ri: 0, sh: A[0], tA: A.findIndex((s) => pkey(s) === pkey(norm(sol))) }; }
const pw = (p) => Math.max(...p.sh.map((q) => q[0])) + 1, ph = (p) => Math.max(...p.sh.map((q) => q[1])) + 1;
/* Coste mínimo REAL de dejar una pieza en su postura: cada giro y cada volteo valen 1.
   Se busca a lo ancho sobre los estados (cara, postura), porque volteando se salta de una
   rueda de posturas a la otra y contar giros «a ojo» se equivocaba en las piezas con espejo. */
function minOps(p) {
  const kk = (s, r) => s + ':' + r, goal = kk(0, p.tA);
  if (kk(p.side, p.ri) === goal) return 0;
  const seen = new Set([kk(p.side, p.ri)]), q = [[p.side, p.ri, 0]];
  for (let h = 0; h < q.length; h++) {
    const [s, r, d] = q[h], list = s ? p.B : p.A, nx = [[s, (r + 1) % list.length]];
    if (p.chi) { const other = s ? p.A : p.B, m = pkey(mir(list[r])), i = other.findIndex((t) => pkey(t) === m); if (i >= 0) nx.push([s ^ 1, i]); }
    for (const [ns, nr] of nx) { const kn = kk(ns, nr); if (seen.has(kn)) continue; if (kn === goal) return d + 1; seen.add(kn); q.push([ns, nr, d + 1]); }
  }
  return 0;
}
/* azar reproducible: el mismo nivel sale siempre con las piezas en la misma postura */
function rngOf(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- estado ---------- */
let TS = 26, N, S = 26, OX = 0, OY = 100, GW, GH, pieces, level = 1, drag, done, score, bgCv, t = 0, doneT = 0, kbs = null, own = null;
let cells = null, cellSet = null, lvi = null, moves = 0, rotc = 0, rotMin = 0, hintUsed = false, hint = null, hintT = 0, sel = null;
let chain = 0, chainT = 0, tipT = 0, warned = false;
const BOARD_H = 296, BOARD_TOP = 96, TRAY_TOP = 400, BTN_Y = 588;
const nPlaceable = () => pieces.filter((p) => !p.dec).length;
const nPlaced = () => pieces.filter((p) => !p.dec && p.bx !== null).length;
/* Menos movimientos imposible: las fijas ya están puestas, las demás valen uno cada una. */
const minMoves = () => pieces.filter((p) => !p.dec && !p.fix).length;
const easyHelp = () => k.dif === 0, hardMode = () => k.dif === 2;
const m2Goal = () => lvi ? (k.dif === 0 ? lvi.m2 + 4 : k.dif === 2 ? Math.max(minMoves() + 1, lvi.m2 - 2) : lvi.m2) : 0;
const rotTol = () => (k.dif === 0 ? 4 : k.dif === 2 ? 0 : 2);

function buildHand() {
  lvi = LVS[Math.min(level, LVS.length) - 1];
  const info = HAND.cellsOf(lvi);
  GW = info.w; GH = info.h; N = Math.max(GW, GH);
  cells = []; for (let y = 0; y < lvi.g.length; y++) for (let x = 0; x < lvi.g[y].length; x++) if (lvi.g[y].charAt(x) !== '.') cells.push([x, y]);
  cellSet = new Set(cells.map((q) => q.join()));
  S = Math.max(16, Math.min(46, Math.floor(Math.min((W - 44) / GW, BOARD_H / GH))));
  OX = Math.round((W - GW * S) / 2); OY = Math.round(BOARD_TOP + (BOARD_H - GH * S) / 2);
  own = {}; for (const L of Object.keys(info.map)) for (const [x, y] of info.map[L]) own[x + ',' + y] = L;
  const letters = Object.keys(info.map).sort();
  const R = rngOf(0x7a06 + level * 6151 + letters.length * 97);
  const xs = lvi.x || '', fx = lvi.f || '';
  pieces = []; rotMin = 0;
  letters.forEach((L, i) => {
    const sol = norm(info.map[L]);
    const mnx = Math.min(...info.map[L].map((q) => q[0])), mny = Math.min(...info.map[L].map((q) => q[1]));
    const p = mkPiece(sol);
    p.L = L; p.sol = [mnx, mny]; p.col = COL[i % COL.length];
    p.fix = fx.indexOf(L) >= 0; p.dec = false;
    p.bx = null; p.by = null; p.tx = 0; p.ty = 0; p.rx = null; p.ry = null; p.rs = 26; p.ang = 0; p.pop = 0;
    if (!p.fix) { /* la pieza fija sale ya en su postura; las demás salen giradas */
      const L4 = p.A.length;
      if (xs.indexOf(L) >= 0 && p.chi) p.side = 1; /* espejo obligatorio: hay que voltearla */
      const step = L4 > 1 ? 1 + Math.floor(R() * (L4 - 1)) : 0;
      p.ri = (p.tA + step) % L4;
    } else { p.ri = p.tA; p.bx = mnx; p.by = mny; }
    p.sh = listOf(p)[p.ri];
    if (!p.fix) rotMin += minOps(p);
    pieces.push(p);
  });
  (lvi.d || []).forEach((d, j) => {
    const sh = []; d.forEach((r, y) => r.split('').forEach((ch, x) => { if (ch === '#') sh.push([x, y]); }));
    const q = mkPiece(sh);
    q.L = '?'; q.sol = [0, 0]; q.col = DEC_COL; q.fix = false; q.dec = true;
    q.bx = null; q.by = null; q.tx = 0; q.ty = 0; q.rx = null; q.ry = null; q.rs = 26; q.ang = 0; q.pop = 0;
    q.ri = Math.floor(R() * q.A.length); q.sh = q.A[q.ri];
    pieces.push(q);
  });
  done = false; doneT = 0; kbs = null; drag = null; sel = null; bgCv = null;
  moves = 0; rotc = 0; hintUsed = false; hint = null; hintT = 0; chain = 0; chainT = 0; warned = false;
  tipT = 4.5;
  layoutTray(); for (const p of pieces) { p.rx = p.bx !== null ? OX + p.bx * S : p.tx; p.ry = (p.bx !== null ? OY + p.by * S : p.ty) + (p.bx !== null ? 0 : 40); p.rs = p.bx !== null ? S : TS; }
}
/* ---- modo antiguo: partición aleatoria de un cuadrado (sin POLYLV) ---- */
function buildRnd() {
  const grow = k.dif === 0 ? 4 : k.dif === 2 ? 2 : 3;
  N = Math.min(7, (k.dif === 2 ? 5 : 4) + Math.floor(level / grow)); GW = GH = N; S = Math.floor(300 / N);
  OX = Math.floor((W - N * S) / 2); OY = 84; done = false; doneT = 0; kbs = null; drag = null; sel = null; bgCv = null;
  moves = 0; rotc = 0; hintUsed = false; hint = null; chain = 0; lvi = null; tipT = 0;
  cells = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cells.push([x, y]);
  cellSet = new Set(cells.map((q) => q.join()));
  const grid = Array.from({ length: N }, () => Array(N).fill(-1));
  const np = k.clamp(Math.min(8, 3 + Math.floor(N * N / 7), 3 + Math.floor((level - 1) * 0.6)) + (k.dif === 0 ? -1 : k.dif === 2 ? 1 : 0), 2, 8);
  const seeds = k.shuffle([...Array(N * N).keys()]).slice(0, np);
  seeds.forEach((s, i) => (grid[Math.floor(s / N)][s % N] = i));
  let changed = true; while (changed) { changed = false;
    for (const [y, x] of k.shuffle([...Array(N * N).keys()].map((i) => [Math.floor(i / N), i % N]))) { if (grid[y][x] >= 0) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => grid[y + dy] && grid[y + dy][x + dx]).filter((v) => v !== undefined && v >= 0);
      if (nb.length) { grid[y][x] = k.pick(nb); changed = true; } } }
  own = {}; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) own[x + ',' + y] = String(grid[y][x]);
  pieces = [];
  for (let i = 0; i < np; i++) { const cc = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (grid[y][x] === i) cc.push([x, y]);
    if (!cc.length) continue; const p = mkPiece(norm(cc));
    p.L = String(i); p.sol = [Math.min(...cc.map((q) => q[0])), Math.min(...cc.map((q) => q[1]))];
    p.col = COL[i % COL.length]; p.fix = false; p.dec = false;
    p.bx = null; p.by = null; p.tx = 0; p.ty = 0; p.rx = null; p.ry = null; p.rs = 26; p.ang = 0; p.pop = 0;
    p.ri = k.ri(0, p.A.length - 1); p.sh = p.A[p.ri]; pieces.push(p); }
  layoutTray(); for (const p of pieces) { p.rx = p.tx; p.ry = p.ty + 40; p.rs = TS; }
}
const build = () => (HAND ? buildHand() : buildRnd());

function layoutTray() {
  const top = HAND ? TRAY_TOP + 6 : OY + N * S + 34, bot = HAND ? BTN_Y - 10 : H - 12;
  const list = pieces.filter((p) => p.bx === null && !(kbs && kbs.p === p));
  for (TS = 30; TS >= 12; TS -= 2) { let x = 18, y = top, rowH = 0, ok = true;
    for (const p of list) { const w = pw(p) * TS, h = ph(p) * TS;
      if (x + w > W - 18) { x = 18; y += rowH + 12; rowH = 0; }
      p.tx = x; p.ty = y; x += w + 14; rowH = Math.max(rowH, h); }
    if (y + rowH > bot) ok = false;
    if (ok) break; }
}
function occupied(except) { const s = new Set(); for (const p of pieces) if (p !== except && p.bx !== null) for (const [x, y] of p.sh) s.add((p.bx + x) + ',' + (p.by + y)); return s; }
const fits = (p, gx, gy) => { const occ = occupied(p); return p.sh.every(([x, y]) => cellSet.has((gx + x) + ',' + (gy + y)) && !occ.has((gx + x) + ',' + (gy + y))); };
function reset() { if (HAND) level = k.lv; else if (!level) level = 1; score = 0; build(); }

if (HAND) k.levels(LVS.length, { start: (i) => { level = i; score = 0; build(); if (k.st === 'play') k.st = 'over'; } });
k.onDif = () => { if (k.st !== 'play') { if (!HAND) level = 1; score = 0; build(); } };
level = 1; reset();
k.show(CFG.title, HAND
  ? 'Completa la figura con todas las piezas. Tócala para girarla, Voltear para las del revés y Sacar para devolver la última. 20 figuras con piezas fijas, espejos y señuelos: cuantos menos movimientos y giros, más estrellas.'
  : 'Arrastra las piezas al cuadrado hasta llenarlo. Toca una pieza para girarla. Teclado: A coge / suelta, flechas mueven, B gira.');

/* ---------- jugadas ---------- */
function rotate(p) { const L = listOf(p); p.ri = (p.ri + 1) % L.length; p.sh = L[p.ri]; p.ang = -Math.PI / 2; rotc++; k.sfx('click'); }
/* VOLTEAR: salta al juego de posturas del espejo. En una pieza simétrica no cambia nada y avisa. */
function flip(p) {
  const m = pkey(mir(p.sh)), other = p.side ? p.A : p.B, i = other.findIndex((s) => pkey(s) === m);
  if (!p.chi || i < 0) { k.sfx('hit'); k.shake(2); k.float('Esta pieza es simétrica', p.rx + pw(p) * p.rs / 2, p.ry - 8, '#cfd6ff'); return; }
  p.side ^= 1; p.ri = i; p.sh = other[i]; p.ang = 0; p.pop = 0.9; rotc++; k.sfx('pop');
}
function snap(p) { p.pop = 1; moves++; chain++; chainT = 2.2;
  const cx = OX + (p.bx + pw(p) / 2) * S, cy = OY + (p.by + ph(p) / 2) * S;
  k.sfx('pop'); if (k.chime) k.chime(chain - 1); k.burst(cx, cy, p.col, 10, 110); if (k.hitstop) k.hitstop(0.04);
  if (chain >= 3 && k.combo) k.combo(chain, cx, cy);
  const falta = nPlaceable() - nPlaced();
  if (falta === 1 && !warned && !done) { warned = true; if (k.reward) k.reward('¡Una pieza!', '#ffd23d'); }
  checkDone();
}
function starsNow() {
  let s = 1; if (moves <= m2Goal()) s = 2;
  if (s === 2 && !hintUsed && rotc <= rotMin + rotTol()) s = 3;
  return s;
}
function checkDone() {
  if (done || nPlaced() < nPlaceable()) return;
  done = true; doneT = 0;
  const st = HAND ? starsNow() : 1;
  const gain = 150 * level + (HAND ? Math.max(0, (m2Goal() - moves)) * 40 + (st - 1) * 250 : 0);
  score += gain; k.best(CFG.id, score); k.confetti();
  k.float('+' + gain, W / 2, OY + GH * S / 2, '#ffd23d');
  if (!HAND) { later(() => { k.st = 'over'; k.show('¡Encajado!', `Nivel ${level} · ${score} puntos<br>Toca para el siguiente`); level++; }, 900); return; }
  let falta = '';
  if (st < 3) { const f = [];
    if (moves > m2Goal()) f.push(`con ${m2Goal()} movimientos o menos (has usado ${moves})`);
    else if (hintUsed) f.push('sin usar la pista');
    else if (rotc > rotMin + rotTol()) f.push(`girando menos (${rotMin + rotTol()} giros, has hecho ${rotc})`);
    if (f.length) falta = '<br>Para la siguiente estrella: ' + f[0]; }
  later(() => k.levelDone(score, `${lvi.n} · ${moves} movimientos · ${rotc} giros${falta}`, { stars: st }), 950);
}
function dropPos(p) { return [Math.round((k.ptr.x - OX) / S - 0.5 - (pw(p) - 1) / 2), Math.round((k.ptr.y - OY) / S - 0.5 - (ph(p) - 1) / 2)]; }
/* Fácil: encaje tolerante — si la casilla exacta no vale, se prueban las vecinas. */
function nearFit(p, gx, gy) { if (!easyHelp()) return null;
  const off = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [dx, dy] of off) if (fits(p, gx + dx, gy + dy)) return [gx + dx, gy + dy];
  return null; }
function doHint() {
  if (!HAND || done) return;
  const p = pieces.find((q) => !q.dec && !q.fix && q.bx === null);
  if (!p) return;
  hintUsed = true; hint = p; hintT = 3.2; k.sfx('coin');
}
/* botones de la franja inferior (solo con tabla a mano) */
const BTN = () => [ { id: 'flip', x: 24, w: 128, t: 'Voltear' }, { id: 'hint', x: 176, w: 128, t: 'Pista' }, { id: 'back', x: 328, w: 128, t: 'Sacar' } ];
function btnAt(x, y) { if (!HAND || y < BTN_Y - 4 || y > BTN_Y + 42) return null;
  return BTN().find((b) => x >= b.x && x <= b.x + b.w) || null; }
function pressBtn(id) {
  if (id === 'flip') { const p = sel && sel.bx === null && !sel.fix ? sel : pieces.find((q) => q.bx === null && !q.fix && !q.dec); if (p) { sel = p; flip(p); } else k.sfx('hit'); }
  else if (id === 'hint') doHint();
  else if (id === 'back') { const p = [...pieces].reverse().find((q) => q.bx !== null && !q.fix); if (p) { p.bx = null; p.by = null; sel = p; chain = 0; if (k.chainReset) k.chainReset(); layoutTray(); k.sfx('click'); } else k.sfx('hit'); }
}

k.run((dt) => {
  if (!k.gate(reset)) return; t += dt;
  if (hintT > 0) hintT -= dt; if (tipT > 0) tipT -= dt;
  if (chainT > 0) { chainT -= dt; if (chainT <= 0) { chain = 0; if (k.chainReset) k.chainReset(); } }
  for (const p of pieces) {
    const dragging = drag && drag.p === p && drag.moved; let tx, ty, ts;
    if (dragging) { ts = S; tx = k.ptr.x - pw(p) * S / 2; ty = k.ptr.y - ph(p) * S / 2 - 10; }
    else if (kbs && kbs.p === p) { ts = S; tx = OX + kbs.gx * S; ty = OY + kbs.gy * S; }
    else if (p.bx !== null) { ts = S; tx = OX + p.bx * S; ty = OY + p.by * S; } else { ts = TS; tx = p.tx; ty = p.ty; }
    const a = dragging ? 1 : 1 - Math.pow(0.0005, dt); p.rx += (tx - p.rx) * a; p.ry += (ty - p.ry) * a; p.rs += (ts - p.rs) * (1 - Math.pow(0.0005, dt));
    p.ang += (0 - p.ang) * (1 - Math.pow(0.0001, dt)); p.pop = Math.max(0, p.pop - dt * 4);
  }
  if (done) { doneT += dt; return; }
  if (k.ptr.hit && HAND) { const b = btnAt(k.ptr.sx, k.ptr.sy); if (b) { pressBtn(b.id); return; } }
  const hitPiece = (px, py) => pieces.slice().reverse().find((p) => !p.fix && p.sh.some(([x, y]) => {
    const s = p.bx !== null ? S : TS, ox = p.bx !== null ? OX + p.bx * S : p.tx, oy = p.bx !== null ? OY + p.by * S : p.ty;
    return px > ox + x * s && px < ox + (x + 1) * s && py > oy + y * s && py < oy + (y + 1) * s; }));
  if (k.ptr.hit && !kbs) { const p = hitPiece(k.ptr.sx, k.ptr.sy); if (p) { drag = { p, moved: false }; sel = p; pieces.splice(pieces.indexOf(p), 1); pieces.push(p); k.sfx('click'); } }
  if (drag && k.ptr.down && Math.hypot(k.ptr.x - k.ptr.sx, k.ptr.y - k.ptr.sy) > 8) { drag.moved = true; drag.p.bx = null; }
  /* gesto rápido: hit y up en el mismo frame → se decide por la distancia al punto inicial */
  if (drag && k.ptr.up && !drag.moved && Math.hypot(k.ptr.x - k.ptr.sx, k.ptr.y - k.ptr.sy) > 8) { drag.moved = true; drag.p.bx = null; }
  if (drag && k.ptr.up) { const p = drag.p;
    if (!drag.moved) { rotate(p);
      if (p.bx !== null) { const occ = occupied(p); if (p.sh.some(([x, y]) => !cellSet.has((p.bx + x) + ',' + (p.by + y)) || occ.has((p.bx + x) + ',' + (p.by + y)))) { p.bx = null; p.by = null; } } }
    else { let [gx, gy] = dropPos(p); const near = fits(p, gx, gy) ? null : nearFit(p, gx, gy); if (near) { gx = near[0]; gy = near[1]; }
      if (fits(p, gx, gy)) { p.bx = gx; p.by = gy; snap(p); }
      else { p.bx = null; p.by = null; if (chain) { chain = 0; if (k.chainReset) k.chainReset(); } k.sfx(k.ptr.y < OY + GH * S + 10 ? 'hit' : 'click'); } }
    drag = null; layoutTray(); checkDone(); }
  /* teclado: A coge una pieza de la bandeja o la suelta, flechas la mueven, B gira, pista con ↑ mantenido */
  const kd = ['up', 'down', 'left', 'right'].find((q) => k.hit.has(q));
  if (k.hit.has('a')) {
    if (!kbs) { const p = pieces.find((q) => q.bx === null && !q.fix && !q.dec); if (p) { kbs = { p, gx: 0, gy: 0 }; sel = p; pieces.splice(pieces.indexOf(p), 1); pieces.push(p); layoutTray(); k.sfx('click'); } }
    else if (fits(kbs.p, kbs.gx, kbs.gy)) { const p = kbs.p; p.bx = kbs.gx; p.by = kbs.gy; kbs = null; snap(p); layoutTray(); }
    else { k.sfx('hit'); k.shake(3); } }
  if (kbs) {
    if (kd) { const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[kd];
      kbs.gx = k.clamp(kbs.gx + d[0], -1, GW - 1); kbs.gy = k.clamp(kbs.gy + d[1], -1, GH - 1); k.sfx('click'); }
    if (k.hit.has('b')) { rotate(kbs.p); kbs.gx = k.clamp(kbs.gx, -1, GW - 1); kbs.gy = k.clamp(kbs.gy, -1, GH - 1); } }
}, draw);

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function fitLabel(s, x, y, size, col, align, maxw) {
  let sz = size; c.font = `800 ${sz}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  while (sz > 9 && c.measureText(s).width > maxw) { sz--; c.font = `800 ${sz}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; }
  label(s, x, y, sz, col, align);
}
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function renderBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2e2657'); gr.addColorStop(1, '#130f26'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 2; for (let i = -H; i < W; i += 28) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke(); }
  /* bandeja de madera alrededor de la silueta */
  const bw = GW * S, bh = GH * S, pad = 14;
  g.fillStyle = 'rgba(0,0,0,.4)'; ART.rr(g, OX - pad, OY - pad + 8, bw + pad * 2, bh + pad * 2, 16); g.fill();
  ART.rr(g, OX - pad, OY - pad, bw + pad * 2, bh + pad * 2, 16); ART.fillOut(g, '#b07a48', 3);
  g.save(); g.clip(); g.strokeStyle = 'rgba(90,50,20,.3)'; g.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) { const y = OY - pad + i * (bh + pad * 2) / 14 + rnd(i) * 6; g.beginPath(); g.moveTo(OX - pad, y);
    g.bezierCurveTo(OX + bw * 0.3, y + rnd(i + 1) * 10 - 5, OX + bw * 0.7, y + rnd(i + 2) * 10 - 5, OX + bw + pad, y); g.stroke(); }
  g.restore();
  g.fillStyle = 'rgba(255,255,255,.25)'; ART.rr(g, OX - pad + 8, OY - pad + 3, bw + pad * 2 - 16, 4, 2); g.fill();
  /* las casillas de la silueta, hundidas; lo de fuera queda como madera lisa */
  for (const [x, y] of cells) { const X = OX + x * S, Y = OY + y * S;
    g.fillStyle = (x + y) % 2 ? '#5a3a22' : '#553620'; g.fillRect(X, Y, S, S);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(X, Y, S, 3);
    g.fillStyle = 'rgba(255,220,170,.08)'; g.fillRect(X, Y + S - 2, S, 2); }
  /* contorno único de la silueta (R5 §8: un solo trazo, nada de rejilla dibujada) */
  g.strokeStyle = OUT; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
  for (const [x, y] of cells) { const X = OX + x * S, Y = OY + y * S;
    if (!cellSet.has(x + ',' + (y - 1))) { g.moveTo(X, Y); g.lineTo(X + S, Y); }
    if (!cellSet.has(x + ',' + (y + 1))) { g.moveTo(X, Y + S); g.lineTo(X + S, Y + S); }
    if (!cellSet.has((x - 1) + ',' + y)) { g.moveTo(X, Y); g.lineTo(X, Y + S); }
    if (!cellSet.has((x + 1) + ',' + y)) { g.moveTo(X + S, Y); g.lineTo(X + S, Y + S); } }
  g.stroke();
  /* zona de piezas */
  const ty = HAND ? TRAY_TOP - 6 : OY + GH * S + 24, bot = HAND ? BTN_Y - 12 : H - 6;
  ART.rr(g, 10, ty, W - 20, bot - ty, 16); ART.fillOut(g, '#3d3572', 3);
  g.fillStyle = 'rgba(0,0,0,.2)'; ART.rr(g, 13, ty + 3, W - 26, 8, 4); g.fill();
  g.fillStyle = 'rgba(255,255,255,.05)';
  for (let y = ty + 14; y < bot - 6; y += 12) for (let x = 20 + (y % 24 ? 6 : 0); x < W - 16; x += 12) g.fillRect(x, y, 2, 2);
  return cv;
}
/* Pieza de tangram: silueta única cacheada, 3 tonos duros, sin trazos interiores (R5 §8) */
const pieceCv = {};
function pieceSprite(p, s, col) {
  const kk = p.sh.map((q) => q.join()).join(';') + '|' + col + '|' + Math.round(s);
  let q = pieceCv[kk]; if (q) return q;
  const set = new Set(p.sh.map((r) => r.join())), has = (x, y) => set.has(x + ',' + y);
  const w = pw(p) * s, h = ph(p) * s, pad = 5, d = Math.ceil((w + pad * 2) * CDPR), dh = Math.ceil((h + pad * 2) * CDPR);
  q = document.createElement('canvas'); q.width = d; q.height = dh;
  const g = q.getContext('2d'); g.scale(d / (w + pad * 2), dh / (h + pad * 2)); g.translate(pad, pad);
  const body = (t2) => { for (const [x, y] of p.sh) t2.rect(x * s - 0.3, y * s - 0.3, s + 0.6, s + 0.6); }, parts = [[body, col]];
  g.fillStyle = col; g.beginPath(); body(g); g.fill();
  celp(g, parts, col, s * 0.22, s * 0.22);
  g.strokeStyle = ART.OUT; g.lineWidth = 2.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  for (const [x, y] of p.sh) { const X = x * s, Y = y * s;
    if (!has(x, y - 1)) { g.moveTo(X, Y); g.lineTo(X + s, Y); } if (!has(x, y + 1)) { g.moveTo(X, Y + s); g.lineTo(X + s, Y + s); }
    if (!has(x - 1, y)) { g.moveTo(X, Y); g.lineTo(X, Y + s); } if (!has(x + 1, y)) { g.moveTo(X + s, Y); g.lineTo(X + s, Y + s); } }
  g.stroke();
  const [fx, fy] = p.sh.reduce((m, r) => (r[1] < m[1] || (r[1] === m[1] && r[0] < m[0]) ? r : m), p.sh[0]);
  spec(g, fx * s + s * 0.42, fy * s + s * 0.3, s * 0.2, s * 0.09, -0.5, 0.5);
  pieceCv[kk] = q; return q;
}
function outlineShape(g, sh, s) {
  const set = new Set(sh.map((r) => r.join())), has = (x, y) => set.has(x + ',' + y);
  g.beginPath();
  for (const [x, y] of sh) { const X = x * s, Y = y * s;
    if (!has(x, y - 1)) { g.moveTo(X, Y); g.lineTo(X + s, Y); } if (!has(x, y + 1)) { g.moveTo(X, Y + s); g.lineTo(X + s, Y + s); }
    if (!has(x - 1, y)) { g.moveTo(X, Y); g.lineTo(X, Y + s); } if (!has(x + 1, y)) { g.moveTo(X + s, Y); g.lineTo(X + s, Y + s); } }
  g.stroke();
}
function piece(p, ox, oy, s, o) {
  o = o || {};
  const w = pw(p) * s, h = ph(p) * s, sc = 1 + p.pop * 0.1 + (o.lift ? 0.06 : 0);
  c.save(); c.translate(ox + w / 2, oy + h / 2); c.rotate(p.ang); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
  if (o.lift) { c.fillStyle = 'rgba(0,0,0,.3)'; for (const [x, y] of p.sh) c.fillRect(x * s + 8, y * s + 12, s, s); }
  if (o.ghost) {
    c.globalAlpha = 0.5; c.fillStyle = o.ghost; c.beginPath(); for (const [x, y] of p.sh) c.rect(x * s - 0.3, y * s - 0.3, s + 0.6, s + 0.6); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.lineCap = 'round'; outlineShape(c, p.sh, s);
  } else { const pad = 5, q = pieceSprite(p, s, p.fix ? '#9a93b5' : p.col); c.drawImage(q, -pad, -pad, w + pad * 2, h + pad * 2); }
  if (o.sel) { c.strokeStyle = '#ffd23d'; c.lineWidth = 3; c.lineCap = 'round'; c.globalAlpha = 0.5 + Math.sin(t * 7) * 0.3; outlineShape(c, p.sh, s); c.globalAlpha = 1; }
  c.restore(); c.globalAlpha = 1;
}
function drawBtn(b) {
  const on = (b.id === 'hint' && hintT > 0) || (b.id === 'flip' && sel && sel.bx === null);
  ART.rr(c, b.x, BTN_Y, b.w, 40, 12); ART.fillOut(c, on ? '#6e62f5' : '#3a3266', 2.5);
  c.fillStyle = 'rgba(255,255,255,.12)'; ART.rr(c, b.x + 5, BTN_Y + 4, b.w - 10, 9, 5); c.fill();
  label(b.t, b.x + b.w / 2, BTN_Y + 10, 16, '#fff', 'center');
}
function draw() {
  if (!bgCv) bgCv = renderBg(); c.drawImage(bgCv, 0, 0, W, H);
  if (HAND) {
    /* el botón de pausa/sonido puede caer arriba al centro (x ~166..314): el título no llega ahí */
    fitLabel(lvi.n, 14, 10, 19, '#ffd23d', 'left', 148);
    label(`Nivel ${level}/${LVS.length}`, 16, 36, 14, '#cfd6ff');
    label(`${nPlaced()}/${nPlaceable()}`, W - 18, 8, 22, '#fff', 'right');
    const over = moves > m2Goal();
    label(`Mov ${moves}/${m2Goal()}`, W - 18, 36, 14, over ? '#ff9a9a' : '#7cf7a0', 'right');
    label(`Giros ${rotc}`, W - 18, 56, 12, rotc > rotMin + rotTol() ? '#ff9a9a' : '#cfd6ff', 'right');
    if (tipT > 0) { c.globalAlpha = Math.min(1, tipT); fitLabel(lvi.i, W / 2, 74, 13, '#e6e2ff', 'center', W - 40); c.globalAlpha = 1; }
  } else {
    label(CFG.title, 14, 13, 17, '#ffd23d'); label(`Nivel ${level}`, 16, 40, 14, '#cfd6ff');
    label(`${score}`, W - 18, 12, 22, '#fff', 'right');
    label(`Piezas ${nPlaced()}/${nPlaceable()}`, W - 18, 40, 14, '#cfd6ff', 'right');
  }
  /* Fácil: pista — la partición de la solución se insinúa en las casillas aún libres. */
  if (easyHelp() && own && !done) {
    const pend = new Map(); for (const p of pieces) if (!p.dec && p.bx === null) pend.set(p.L, p.col);
    c.globalAlpha = 0.28 + Math.sin(t * 2) * 0.06;
    for (const [x, y] of cells) { const col = pend.get(own[x + ',' + y]); if (!col) continue;
      c.fillStyle = col; c.fillRect(OX + x * S + 3, OY + y * S + 3, S - 6, S - 6); }
    c.globalAlpha = 1;
  }
  /* pista puntual: dónde va una pieza concreta */
  if (hint && hintT > 0 && hint.bx === null) {
    c.globalAlpha = 0.35 + Math.sin(t * 8) * 0.2; c.fillStyle = hint.col;
    for (const [x, y] of hint.A[hint.tA]) c.fillRect(OX + (hint.sol[0] + x) * S + 2, OY + (hint.sol[1] + y) * S + 2, S - 4, S - 4);
    c.globalAlpha = 1;
  }
  const dp = drag && drag.moved ? drag.p : kbs ? kbs.p : null;
  if (dp) { const [gx, gy] = kbs ? [kbs.gx, kbs.gy] : dropPos(dp);
    if (kbs || (gx > -pw(dp) && gy > -ph(dp) && gx < GW && gy < GH)) {
      const ok = fits(dp, gx, gy);
      piece(dp, OX + gx * S, OY + gy * S, S, { ghost: hardMode() ? '#cfd6ff' : ok ? '#7cf7a0' : '#ff5f5f' }); } }
  for (const p of pieces) if (p !== dp) piece(p, p.rx, p.ry, p.rs, { sel: HAND && p === sel && p.bx === null && !p.dec });
  if (dp) piece(dp, dp.rx, dp.ry, dp.rs, { lift: true });
  if (HAND) BTN().forEach(drawBtn);
  if (done) { const a = Math.min(1, doneT * 3);
    c.globalAlpha = a * (0.25 + Math.sin(doneT * 10) * 0.12); c.fillStyle = '#fff'; c.fillRect(OX, OY, GW * S, GH * S); c.globalAlpha = 1;
    const sc = 0.7 + a * 0.3 + Math.sin(a * 3.14) * 0.08;
    c.save(); c.translate(W / 2, OY + GH * S / 2); c.scale(sc, sc);
    ART.rr(c, -140, -34, 280, 68, 20); ART.fillOut(c, 'rgba(34,28,66,.92)', 3);
    label(HAND ? lvi.n + ' ✓' : '¡Encajado!', 0, -18, 28, '#7cf7a0', 'center'); c.restore(); }
}
