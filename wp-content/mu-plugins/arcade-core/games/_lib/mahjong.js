/* Mahjong Solitaire: empareja fichas libres iguales.
 *
 * mahjong-solitaire (plan Friv / la vara): 20 disposiciones DIBUJADAS A MANO en MAHLV
 * (src/eng/mahlv.js), con semilla fija por nivel — el mismo tablero en cada intento — y
 * siempre resolubles por colocación inversa. Presión de verdad: reloj por nivel, barajadas
 * limitadas (3/2/1 según dificultad) y fichas especiales que entran de una en una
 * (comodín en el 6, hielo en el 9, cuenta atrás en el 12). Estrellas: 1 terminar,
 * 2 dentro del tiempo objetivo, 3 dentro del tiempo sin pista y sin barajar.
 * Sin MAHLV (o en otro juego del motor) se conserva el comportamiento de antes: tres
 * disposiciones generadas que se repiten sin fin.
 *
 * Fichas gruesas con cara y lateral cacheadas, símbolos dibujados, pistas, combos y
 * barajado que conserva la garantía de solución. */
const W = 640, H = 480, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#0f3a33' }), c = k.ctx;
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms); /* 1.23: la pantalla final espera si el juego está en pausa */
const HAND = (typeof MAHLV !== 'undefined' && MAHLV.G[CFG.id]) ? MAHLV : null; /* acotado al juego con tabla a mano */
/* Medidas base de la ficha (el sprite se dibuja siempre a este tamaño y se escala al tablero) */
const B = { TW: 44, TH: 56, DX: 6, DY: 7 }, NT = 27;
let TW = B.TW, TH = B.TH, DX = B.DX, DY = B.DY, OX = 56, OY = 76, SC = 1;
/* 0-8 caracteres 1-9 · 9-14 círculos 1-6 · 15-19 bambúes 1-5 · 20-23 vientos E S O N · 24-26 dragones rojo, verde y blanco */
const SUITC = (t) => (t < 9 ? '#d5303e' : t < 15 ? '#2d6fd0' : t < 20 ? '#2a9a5a' : t < 24 ? '#22306e' : ['#d5303e', '#2a9a5a', '#2d6fd0'][t - 24]);
const NAMES = ['Tortuga', 'Pirámide', 'Puentes'];
let tiles, sel, score, level, done, hints, hint, shuf, combo, comboT, fly, dirty, cur, kbd, boardCv, FREE = new Set(), ORD = [];
let t, tl, tmax, t2, hintsUsed, shufUsed, cdT0, iceN, lvi, tipT, quake;

/* ---------- Disposiciones generadas (respaldo, sin tabla a mano) ---------- */
function layout() {
  const L = [], v = (level - 1) % 3;
  if (v === 0) { for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) if (!(y === 0 || y === 5) || (x > 1 && x < 10)) L.push([x, y, 0]); for (let y = 1; y < 5; y++) for (let x = 3; x < 9; x++) L.push([x, y, 1]); for (let y = 2; y < 4; y++) for (let x = 4; x < 8; x++) L.push([x, y, 2]); L.push([5.5, 2.5, 3]); }
  if (v === 1) { for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) if (!((x === 0 || x === 11) && (y === 0 || y === 5))) L.push([x, y, 0]); for (let y = 1; y < 5; y++) for (let x = 2; x < 10; x++) L.push([x, y, 1]); for (let y = 1.5; y < 4; y++) for (let x = 3.5; x < 8; x++) L.push([x, y, 2]); for (let x = 4.5; x < 7; x++) L.push([x, 2.5, 3]); }
  if (v === 2) { for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) if (!((x === 5 || x === 6) && (y === 0 || y === 5))) L.push([x, y, 0]); for (const bx of [1, 7]) { for (let y = 1; y < 5; y++) for (let x = bx; x < bx + 4; x++) L.push([x, y, 1]); for (let y = 2; y < 4; y++) for (let x = bx + 1; x < bx + 3; x++) L.push([x, y, 2]); L.push([bx + 1.5, 2.5, 3]); } for (let x = 5; x < 7; x++) L.push([x, 2.5, 1]); }
  return L;
}
const EPS = 1e-6;
/* Libre = nada encima y un lado (izquierda o derecha) despejado. Mismas reglas que MAHLV. */
function freeIn(tile, set) {
  let L = false, R = false;
  for (let i = 0; i < set.length; i++) { const o = set[i]; if (o === tile) continue;
    if (o.z === tile.z + 1) { if (Math.abs(o.x - tile.x) < 1 - EPS && Math.abs(o.y - tile.y) < 1 - EPS) return false; continue; }
    if (o.z !== tile.z || Math.abs(o.y - tile.y) >= 1 - EPS) continue;
    if (o.x < tile.x - EPS && o.x > tile.x - 1 - EPS) L = true; else if (o.x > tile.x + EPS && o.x < tile.x + 1 + EPS) R = true; }
  return !L || !R;
}
/* El conjunto de fichas libres solo cambia al retirar una pareja: se recalcula ahí, no por frame. */
function recalc() { FREE = new Set(); for (let i = 0; i < tiles.length; i++) if (freeIn(tiles[i], tiles)) FREE.add(tiles[i]); ORD = tiles.slice().sort((a, b) => b.z - a.z || b.y - a.y || b.x - a.x); dirty = true; }
const isFree = (q) => FREE.has(q);
const canTake = (q) => FREE.has(q) && !q.ice;
const pairOK = (a, b) => a !== b && (a.t === b.t || a.w || b.w);
/* Colocación inversa: se retiran parejas libres del tablero lleno y se les asigna tipo → ese orden es una solución */
function assign(pos, types) {
  for (let tries = 0; tries < 60; tries++) { const rem = pos.map((p) => ({ x: p.x, y: p.y, z: p.z, c: p.c })), placed = []; let ok = true; const ts = k.shuffle(types.slice());
    for (const ty of ts) { const fr = rem.filter((p) => freeIn(p, rem)); if (fr.length < 2) { ok = false; break; } k.shuffle(fr); const a = fr[0], b = fr[1]; a.t = ty; b.t = ty; placed.push(a, b); rem.splice(rem.indexOf(a), 1); rem.splice(rem.indexOf(b), 1); }
    if (ok && !rem.length) return placed; }
  return null;
}
function metrics(cols, rows, mz) {
  const availW = W - 20, availH = 348;
  const u = Math.min(availW / (cols * B.TW + mz * B.DX), availH / (rows * B.TH + mz * B.DY), 1);
  SC = u; TW = B.TW * u; TH = B.TH * u; DX = B.DX * u; DY = B.DY * u;
  const bw = cols * TW + mz * DX, bh = rows * TH + mz * DY;
  OX = Math.round((W - bw) / 2 + mz * DX); OY = Math.round(74 + (availH - bh) / 2 + mz * DY);
}
/* Dificultad: reloj, objetivo de 2★, pistas, barajadas, hielo y relojes de ficha. */
const DTIME = () => (k.dif === 0 ? 1.3 : k.dif === 2 ? 0.85 : 1);
const DT2 = () => (k.dif === 0 ? 1.35 : k.dif === 2 ? 0.85 : 1);
function build() {
  sel = null; done = false; hint = null; combo = 0; comboT = 0; fly = []; t = 0; hintsUsed = 0; shufUsed = 0; quake = 0; tipT = 6;
  hints = k.dif === 0 ? 5 : k.dif === 2 ? 1 : 3; shuf = k.dif === 0 ? 3 : k.dif === 2 ? 1 : 2;
  iceN = k.dif === 0 ? 1 : 2; cdT0 = k.dif === 0 ? 34 : k.dif === 2 ? 20 : 27;
  if (HAND) {
    const b = HAND.build(CFG.id, level); lvi = b.lv;
    tiles = b.sol.map((q) => ({ x: q.x, y: q.y, z: q.z, t: q.t, w: q.c === 'W', ice: q.c === 'I' ? iceN : 0, cd: q.c === 'T' ? cdT0 : 0, pop: 0 }));
    tmax = Math.round(lvi.sec * DTIME()); t2 = Math.round(lvi.t2 * DT2()); tl = tmax;
    metrics(b.cols, b.rows, b.mz);
  } else {
    lvi = null; let pos = layout().map(([x, y, z]) => ({ x, y, z, c: '#' })); if (pos.length % 2) pos.pop();
    const nT = k.clamp(Math.min(NT, 9 + (level - 1) * 4) + (k.dif === 0 ? -3 : k.dif === 2 ? 3 : 0), 6, NT);
    const got = assign(pos, [...Array(pos.length / 2).keys()].map((i) => i % nT)); if (!got) return build();
    tiles = got.map((q) => ({ x: q.x, y: q.y, z: q.z, t: q.t, w: false, ice: 0, cd: 0, pop: 0 }));
    tmax = 0; t2 = 0; tl = 0; metrics(12, 6, 3);
  }
  boardCv = null; recalc();
}
function moves() { const fr = tiles.filter(canTake); for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length; j++) if (pairOK(fr[i], fr[j])) return [fr[i], fr[j]]; return null; }
/* Si no queda jugada y hay hielo, el hielo se resquebraja: ninguna ficha especial bloquea. */
function crack() { const icy = tiles.filter((q) => q.ice); if (!icy.length) return false; icy.forEach((q) => { q.ice = 0; k.burst(sx(q) + TW / 2, sy(q) + TH / 2, '#9fe8ff', 12, 130); }); k.sfx('shoot'); k.float('¡Se rompe el hielo!', W / 2, H / 2, '#9fe8ff'); dirty = true; return true; }
/* Barajado que conserva la garantía: se reasignan los símbolos por colocación inversa sobre
   las posiciones que quedan (los comodines y el hielo van con la posición, no con el símbolo). */
function reshuffle() {
  const s = lvi ? lvi.s : Math.min(NT, 9 + (level - 1) * 4);
  const types = []; for (let i = 0; i < tiles.length / 2; i++) types.push(i % s);
  const nt = assign(tiles, types);
  if (!nt) return false;
  const by = new Map(nt.map((q) => [q.x + ',' + q.y + ',' + q.z, q.t]));
  for (const q of tiles) q.t = by.get(q.x + ',' + q.y + ',' + q.z);
  sel = null; hint = null; recalc(); k.sfx('shoot'); k.shake(3); return true;
}
function useShuffle(manual) {
  if (shuf > 0) { shuf--; shufUsed++; reshuffle(); k.float(manual ? 'Barajado' : 'Sin parejas: barajando', W / 2, H / 2 - 30, '#fff'); }
  else { /* nunca se pierde por atasco: barajado de emergencia con castigo de tiempo */
    shufUsed++; reshuffle(); if (tmax) { tl = Math.max(4, tl - 20); quake = 0.5; k.shake(6); }
    k.float('Barajado de emergencia −20 s', W / 2, H / 2 - 30, '#ff8a8a'); }
}
function reset() { if (HAND) { level = k.lv; score = 0; } else if (!level || (k.st === 'over' && !done)) { level = 1; score = 0; } build(); }
const sx = (q) => OX + q.x * TW - q.z * DX, sy = (q) => OY + q.y * TH - q.z * DY;
function pick(px, py) { return ORD.find((q) => px > sx(q) && px < sx(q) + TW - 2 * SC && py > sy(q) && py < sy(q) + TH - 2 * SC); }
/* ---------- Jugada ---------- */
function take(a, b) {
  const ax = sx(a) + TW / 2, ay = sy(a) + TH / 2, bx2 = sx(b) + TW / 2, by2 = sy(b) + TH / 2;
  tiles = tiles.filter((q) => q !== a && q !== b);
  combo = comboT > 0 ? combo + 1 : 1; comboT = 4.2;
  const pts = 20 * Math.min(combo, 5) + (a.w || b.w ? 10 : 0); score += pts;
  const mx = (ax + bx2) / 2, my = (ay + by2) / 2;
  fly.push({ t: a.t, w: a.w, x: sx(a), y: sy(a), mx: mx - TW / 2, my: my - TH / 2, a: 0, col: SUITC(a.t) });
  fly.push({ t: b.t, w: b.w, x: sx(b), y: sy(b), mx: mx - TW / 2, my: my - TH / 2, a: 0, col: SUITC(b.t) });
  /* Gancho: cada acierto reacciona; la cadena sube de tono y de color. */
  if (combo > 1) { k.combo(combo, mx, my - 34); k.hitstop(0.03 + Math.min(0.05, combo * 0.01)); }
  else { k.chainReset(); k.chime(0); }
  if (combo === 4) k.reward('¡Buena cadena!', '#ffb0e0');
  if (combo >= 6 && combo % 3 === 0) { k.reward('¡En racha x' + combo + '!', '#ffd84a'); k.punch(0.05); }
  k.float('+' + pts, mx, my - 30, combo > 1 ? '#ffb0e0' : '#ffe27a'); k.sfx(combo > 2 ? 'coin' : 'pop');
  /* el hielo se rompe con las parejas de al lado */
  for (const q of tiles) if (q.ice) for (const r of [a, b])
    if (Math.abs(r.x - q.x) <= 2 && Math.abs(r.y - q.y) <= 2 && Math.abs(r.z - q.z) <= 1) {
      q.ice--; k.burst(sx(q) + TW / 2, sy(q) + TH / 2, '#9fe8ff', q.ice ? 5 : 12, 110);
      if (!q.ice) { k.sfx('hit'); k.float('¡Hielo roto!', sx(q) + TW / 2, sy(q) - 6, '#9fe8ff'); } break; }
  sel = null; hint = null; recalc();
  if (!tiles.length) return finish();
  if (!moves() && !crack()) later(() => { if (!tiles.length || k.st !== 'play') return; useShuffle(false); }, 420);
}
function tap(tile) {
  if (!tile) { sel = null; return; }
  if (tile.ice) { k.sfx('hit'); k.shake(2); k.float('Helada: ' + tile.ice + ' pareja' + (tile.ice > 1 ? 's' : '') + ' al lado', sx(tile) + TW / 2, sy(tile) - 6, '#9fe8ff'); sel = null; return; }
  if (!isFree(tile)) { k.sfx('hit'); k.shake(2); sel = null; return; }
  if (sel && pairOK(sel, tile)) { const a = sel; sel = null; take(a, tile); return; }
  sel = sel === tile ? null : tile; k.sfx('click');
}
function starsNow() { let s = 1; if (t <= t2) s = 2; if (s === 2 && !hintsUsed && !shufUsed) s = 3; return s; }
function finish() {
  done = true;
  const bonus = Math.max(80, Math.round(tl * 6)) + (HAND ? level * 25 : 0); score += bonus;
  k.confetti(); k.punch(0.08); k.sfx('win');
  if (!HAND) { later(() => { k.st = 'over'; k.show('¡Tablero limpio!', `Nivel ${level} (${NAMES[(level - 1) % 3]}) · Bonus de tiempo ${bonus} · ${score} puntos · Récord ${k.best(CFG.id, score)}<br>Toca para el siguiente tablero`); level++; }, 700); return; }
  const st = starsNow(); k.best(CFG.id, score);
  const falta = st === 3 ? '' : st === 2
    ? (hintsUsed || shufUsed ? `Para la 3ª: el mismo tiempo <b>sin pista y sin barajar</b>.` : '')
    : `Para la 2ª: termínalo en ${mmss(t2)} (has tardado ${mmss(t)}).`;
  later(() => k.levelDone(score, `${lvi.n} · ${mmss(t)} · ${score} puntos${falta ? '<br>' + falta : ''}`, { stars: st }), 820);
}
function useHint() { if (done || hints <= 0 || hint) return; const m = moves(); if (!m) return; hint = m; hints--; hintsUsed++; k.sfx('coin'); }
function nav(dir) { const fr = tiles.filter(isFree); if (!fr.length) return; if (!kbd || !cur || !tiles.includes(cur)) { kbd = true; cur = sel && tiles.includes(sel) ? sel : fr[0]; return; }
  const cx = sx(cur), cy = sy(cur); let best = null, bd = 1e9; for (const q of fr) { if (q === cur) continue; const dx = sx(q) - cx, dy = sy(q) - cy, al = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy, pe = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx); if (al < 5) continue; const s = al + pe * 2; if (s < bd) { bd = s; best = q; } }
  if (best) { cur = best; k.sfx('click'); } }
const mmss = (v) => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`;

k.onDif = () => { if (k.st !== 'play') { if (!HAND) { level = 1; score = 0; } reset(); } };
if (HAND) k.levels(HAND.G[CFG.id].length, { start: (i) => { level = i; score = 0; build(); if (k.st === 'play') k.st = 'over'; } });
reset();
k.show(CFG.title, HAND
  ? 'Empareja fichas iguales que estén libres (sin nada encima y con un lado despejado). 20 tableros con reloj, comodines, hielo y fichas de cuenta atrás. Encadena parejas seguidas para multiplicar.'
  : 'Toca dos fichas iguales que estén libres (sin nada encima y con un lado libre). Encadena parejas rápido para hacer combos. B o el botón = pista.');

k.run((dt) => {
  for (const f of fly) f.a += dt * 3.2; fly = fly.filter((f) => { if (f.a >= 1 && !f.b) { f.b = 1; k.burst(f.mx + TW / 2, f.my + TH / 2, f.col, 10, 130); } return f.a < 1.25; });
  if (!k.gate(reset) || done) return;
  t += dt; tipT -= dt; comboT = Math.max(0, comboT - dt); if (comboT <= 0) { if (combo > 1) k.chainReset(); combo = 0; }
  quake = Math.max(0, quake - dt);
  for (const q of tiles) q.pop = Math.max(0, q.pop - dt * 3);
  if (tmax) { /* reloj del nivel */
    tl -= dt;
    for (const q of tiles) if (q.cd > 0) { q.cd -= dt; if (q.cd <= 0) { q.cd = cdT0 * 0.6; const pen = k.dif === 0 ? 8 : k.dif === 2 ? 16 : 12; tl -= pen; quake = 0.5; k.shake(7); k.flash('rgba(255,90,90,.25)'); k.sfx('explode'); k.float('−' + pen + ' s', sx(q) + TW / 2, sy(q) - 6, '#ff8a8a'); } }
    if (tl <= 0) { tl = 0; k.lose(CFG.id, score, 'Se acabó el tiempo', `${lvi.n} · te faltaban ${tiles.length} fichas (${tiles.length / 2} parejas)`); return; }
  }
  for (const d of ['left', 'right', 'up', 'down']) if (k.hit.has(d)) nav(d);
  if (k.hit.has('a')) { if (kbd && cur && tiles.includes(cur)) tap(cur); else nav('right'); }
  if (k.hit.has('b')) useHint();
  if (k.ptr.hit) { kbd = false;
    if (k.ptr.y > BY) { const b = btnAt(k.ptr.x); if (b === 'hint') return useHint(); if (b === 'shuf') { if (!done) useShuffle(true); return; } return; }
    tap(pick(k.ptr.x, k.ptr.y)); }
}, draw);

/* ================= Arte ================= */
function rrp(g, x, y, w, h, r) { ART.rr(g, x, y, w, h, r); }
function dotC(g, x, y, r, col) { /* círculo: anillos por color, sin contorno interior */
  g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fillStyle = ART.dark(col, 0.45); g.fill();
  g.beginPath(); g.arc(x, y - r * 0.08, r * 0.9, 0, 6.283); g.fillStyle = col; g.fill();
  g.beginPath(); g.arc(x, y, r * 0.6, 0, 6.283); g.fillStyle = '#fffaf0'; g.fill();
  g.beginPath(); g.arc(x, y, r * 0.34, 0, 6.283); g.fillStyle = col; g.fill();
  g.beginPath(); g.arc(x - r * 0.3, y - r * 0.34, r * 0.22, 0, 6.283); g.fillStyle = 'rgba(255,255,255,.5)'; g.fill(); }
function stick(g, x, y, h, col) { /* bambú: una caña, nudo por sombra */
  rrp(g, x - 3, y - h / 2, 6, h, 3); const gr = g.createLinearGradient(x - 3, 0, x + 3, 0); gr.addColorStop(0, ART.lite(col, 0.35)); gr.addColorStop(0.45, col); gr.addColorStop(1, ART.dark(col, 0.35));
  g.fillStyle = gr; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
  g.save(); rrp(g, x - 3, y - h / 2, 6, h, 3); g.clip();
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 3, y - 0.9, 6, 1.8); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 3, y + 0.9, 6, 0.8); g.restore(); }
function symbol(g, ty, cx, cy) {
  const col = SUITC(ty); g.lineJoin = 'round';
  if (ty < 9) { const n = ty + 1; g.font = '900 22px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = '#fffaf0'; g.strokeText(n, cx, cy - 9); g.fillStyle = '#22306e'; g.fillText(n, cx, cy - 9);
    rrp(g, cx - 10, cy + 5, 20, 15, 3); g.fillStyle = col; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke(); g.strokeStyle = '#fffaf0'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - 6, cy + 9); g.lineTo(cx + 6, cy + 9); g.moveTo(cx, cy + 8); g.lineTo(cx, cy + 17); g.moveTo(cx - 6, cy + 16); g.quadraticCurveTo(cx, cy + 11, cx + 6, cy + 16); g.stroke(); return; }
  if (ty < 15) { const n = ty - 8, cols = ['#2d6fd0', '#2a9a5a', '#d5303e'];
    const P = { 1: [[0, 0]], 2: [[0, -10], [0, 10]], 3: [[-8, -12], [0, 0], [8, 12]], 4: [[-8, -9], [8, -9], [-8, 9], [8, 9]], 5: [[-8, -11], [8, -11], [0, 0], [-8, 11], [8, 11]], 6: [[-8, -13], [8, -13], [-8, 0], [8, 0], [-8, 13], [8, 13]] }[n];
    P.forEach(([dx, dy], i) => dotC(g, cx + dx, cy + dy, n === 1 ? 14 : n < 4 ? 7.5 : 6.5, n === 1 ? '#d5303e' : cols[(i + n) % 3])); if (n === 1) { g.beginPath(); g.arc(cx, cy, 18, 0, 6.283); g.strokeStyle = '#2a9a5a'; g.lineWidth = 2; g.stroke(); } return; }
  if (ty < 20) { const n = ty - 14, gr = '#2a9a5a', rd = '#d5303e';
    if (n === 1) { stick(g, cx, cy + 2, 34, gr); g.beginPath(); g.moveTo(cx + 2, cy - 8); g.quadraticCurveTo(cx + 14, cy - 18, cx + 13, cy - 4); g.quadraticCurveTo(cx + 8, cy - 8, cx + 2, cy - 8); g.fillStyle = gr; g.fill(); g.stroke(); g.beginPath(); g.arc(cx, cy - 16, 4, 0, 6.283); g.fillStyle = rd; g.fill(); g.stroke(); return; }
    const P = { 2: [[0, -10], [0, 10]], 3: [[0, -10], [-7, 10], [7, 10]], 4: [[-7, -10], [7, -10], [-7, 10], [7, 10]], 5: [[-10, -10], [10, -10], [0, 0], [-10, 10], [10, 10]] }[n];
    P.forEach(([dx, dy], i) => stick(g, cx + dx, cy + dy, 17, n === 5 && i === 2 ? rd : i === 0 && n === 3 ? rd : gr)); return; }
  if (ty < 24) { const d = ty - 20, L = ['E', 'S', 'O', 'N'][d], ang = [0, Math.PI / 2, Math.PI, -Math.PI / 2][d];
    g.beginPath(); g.arc(cx, cy + 8, 11, 0, 6.283); g.fillStyle = '#e9e2cf'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
    g.save(); g.translate(cx, cy + 8); g.rotate(ang); g.beginPath(); g.moveTo(10, 0); g.lineTo(-3, -4.5); g.lineTo(-3, 4.5); g.closePath(); g.fillStyle = '#d5303e'; g.fill(); g.stroke(); g.beginPath(); g.moveTo(-9, 0); g.lineTo(-3, -3); g.lineTo(-3, 3); g.closePath(); g.fillStyle = '#22306e'; g.fill(); g.restore();
    g.font = '900 17px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#22306e'; g.fillText(L, cx, cy - 13); return; }
  if (ty === 24) { g.beginPath(); g.moveTo(cx, cy - 20); g.bezierCurveTo(cx + 16, cy - 6, cx + 12, cy + 16, cx, cy + 20); g.bezierCurveTo(cx - 12, cy + 16, cx - 16, cy - 6, cx, cy - 20); g.fillStyle = '#d5303e'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(cx, cy - 6); g.bezierCurveTo(cx + 7, cy + 2, cx + 5, cy + 12, cx, cy + 14); g.bezierCurveTo(cx - 5, cy + 12, cx - 7, cy + 2, cx, cy - 6); g.fillStyle = '#ffd05a'; g.fill(); return; }
  if (ty === 25) { for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2.094; g.save(); g.translate(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, 0, 6, 11, 0, 0, 6.283); g.fillStyle = '#2a9a5a'; g.fill(); g.lineWidth = 1.1; g.strokeStyle = OUT; g.stroke(); g.restore(); }
    g.beginPath(); g.arc(cx, cy, 4.5, 0, 6.283); g.fillStyle = '#ffd05a'; g.fill(); g.stroke(); return; }
  rrp(g, cx - 13, cy - 18, 26, 36, 3); g.lineWidth = 3; g.strokeStyle = '#2d6fd0'; g.stroke(); rrp(g, cx - 8, cy - 13, 16, 26, 2); g.lineWidth = 1.5; g.stroke();
}
/* --- Ley de la pieza única (§8): un trazado, un relleno, un contorno --- */
function uni(g, parts, ow) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = (ow || 1.1) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
  g.restore();
}
function inpath(g, parts, fn) { g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip(); fn(g); g.restore(); }
/* Ficha de mahjong: UNA pieza (cara de marfil + canto verde), no tres losas apiladas.
   El canto y la cara se separan por color y sombra propia, nunca por contorno.
   `gold` = comodín: el mismo trazo, el marfil pasa a oro y la cara lleva su estrella. */
function mkTile(ty, gold) { const cv = document.createElement('canvas'); cv.width = (B.TW + 10) * 2; cv.height = (B.TH + 12) * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(1, 1);
  const fw = B.TW - 2, fh = B.TH - 2;
  g.fillStyle = 'rgba(0,0,0,.26)'; rrp(g, B.DX + 1.5, B.DY + 3.5, fw, fh, 7); g.fill();
  const body = (q) => rrp(q, 0, 0, fw + B.DX, fh + B.DY, 7.5), face = (q) => rrp(q, 0, 0, fw, fh, 7);
  const bg = g.createLinearGradient(0, fh * 0.5, fw + B.DX, fh + B.DY);
  if (gold) { bg.addColorStop(0, '#f6cf6a'); bg.addColorStop(0.5, '#cfa03a'); bg.addColorStop(1, '#9a7422'); } else { bg.addColorStop(0, '#cbb890'); bg.addColorStop(0.5, '#a89469'); bg.addColorStop(1, '#7c6a49'); }
  const fg = g.createLinearGradient(0, 0, fw * 0.8, fh);
  if (gold) { fg.addColorStop(0, '#fff8df'); fg.addColorStop(0.55, '#ffe9a8'); fg.addColorStop(1, '#f0cb76'); } else { fg.addColorStop(0, '#fffdf6'); fg.addColorStop(0.55, '#f7eeda'); fg.addColorStop(1, '#e8dbbd'); }
  const parts = [[body, bg], [face, fg]];
  uni(g, parts, 1.55);
  inpath(g, parts, (q) => {
    /* canto: el marfil se vuelve verde por color; la arista, por sombra */
    let gr = q.createLinearGradient(fw - 2, 0, fw + B.DX, 0); gr.addColorStop(0, 'rgba(0,0,0,.34)'); gr.addColorStop(0.35, 'rgba(0,0,0,.06)'); gr.addColorStop(1, 'rgba(0,0,0,.28)');
    q.fillStyle = gr; q.fillRect(fw - 2, 4, B.DX + 2, fh + B.DY);
    gr = q.createLinearGradient(0, fh - 2, 0, fh + B.DY); gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(0.4, 'rgba(0,0,0,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.3)');
    q.fillStyle = gr; q.fillRect(4, fh - 2, fw + B.DX, B.DY + 2);
    /* veta del marfil (determinista, no un patrón repetido) */
    let sd = ty * 977 + 13; const rr = () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 26; i++) { const x = rr() * fw, y = rr() * fh, l = 3 + rr() * 9;
      q.fillStyle = rr() < 0.5 ? 'rgba(160,140,100,.10)' : 'rgba(255,255,255,.28)'; q.fillRect(x, y, l, 0.8); }
    gr = q.createLinearGradient(0, 0, 0, fh); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(0.12, 'rgba(255,255,255,0)'); gr.addColorStop(0.82, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.14)');
    q.fillStyle = gr; q.fillRect(0, 0, fw, fh);
  });
  g.save(); g.beginPath(); face(g); g.clip(); symbol(g, ty, fw / 2, fh / 2);
  if (gold) { /* estrella del comodín: una sola pieza, contorno fuera */
    g.translate(fw - 11, 11); g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.4 : 8; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.fillStyle = '#ffd84a'; g.fill(); }
  g.restore(); return cv; }
const SPR = {}; const spr = (ty, gold) => { const key = (gold ? 'w' : 'n') + ty; return SPR[key] || (SPR[key] = mkTile(ty, gold)); };
const SW = () => (B.TW + 10) * SC, SH = () => (B.TH + 12) * SC;
const BG = (() => { const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  let gr = g.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H / 2, W * 0.7); gr.addColorStop(0, '#1d6b58'); gr.addColorStop(1, '#0b302a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1.5; for (let y = -20; y < H + 40; y += 40) for (let x = -20; x < W + 40; x += 40) { g.beginPath(); g.arc(x, y, 20, 0, Math.PI); g.stroke(); g.beginPath(); g.arc(x + 20, y + 20, 20, 0, Math.PI); g.stroke(); }
  for (let i = 0; i < 4000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.06)'; g.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
  gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createLinearGradient(0, 0, 0, 50); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 50); return cv; })();
/* Farolillos del fondo: algo que respira detrás del tablero (gancho §9). */
const LANT = [];
for (let i = 0; i < 7; i++) LANT.push({ x: 40 + i * 94 + (i % 2) * 18, y: 44 + (i % 3) * 16, r: 9 + (i % 3) * 3, p: i * 0.9 });
function order(a, b) { return a.z - b.z || a.y - b.y || a.x - b.x; }
function renderBoard() { if (!boardCv) { boardCv = document.createElement('canvas'); boardCv.width = W * 2; boardCv.height = H * 2; } const g = boardCv.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, W, H);
  const sw = SW(), sh = SH();
  for (const q of [...tiles].sort(order)) { const x = sx(q), y = sy(q); g.drawImage(spr(q.t, q.w), x - SC, y - SC, sw, sh); if (!isFree(q)) { g.fillStyle = 'rgba(20,45,38,.3)'; rrp(g, x, y, TW - 2 * SC, TH - 2 * SC, 7 * SC); g.fill(); } }
  dirty = false; }
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function fit(s, x, y, size, col, align, max) { let f = size; c.font = `800 ${f}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; while (c.measureText(s).width > max && f > 9) { f -= 1; c.font = `800 ${f}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; } label(s, x, y, f, col, align); }
function ring(q, col, lw, lift) { const x = sx(q), y = sy(q) - (lift || 0); c.strokeStyle = col; c.lineWidth = lw; rrp(c, x - 2, y - 2, TW + 2, TH + 2, 9 * SC); c.stroke(); }
/* Marcas de las fichas especiales: se pintan vivas (son pocas y cambian solas). */
function marks(now) {
  for (const q of tiles) {
    const x = sx(q), y = sy(q), w = TW - 2 * SC, h = TH - 2 * SC;
    if (q.w) { c.save(); c.globalAlpha = 0.35 + 0.25 * Math.sin(now * 3 + q.x); c.strokeStyle = '#ffd84a'; c.lineWidth = 2.5; rrp(c, x + 1, y + 1, w - 2, h - 2, 6 * SC); c.stroke(); c.restore(); }
    if (q.ice) { c.save(); c.fillStyle = 'rgba(150,225,255,.42)'; rrp(c, x, y, w, h, 7 * SC); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) { const a = i * 1.047 + 0.3, cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * 0.3;
        c.beginPath(); c.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r); c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.stroke(); }
      c.restore(); label(String(q.ice), x + w / 2, y + h / 2 - 9, 16, '#e8fbff', 'center'); }
    if (q.cd > 0) { const p = q.cd / cdT0, urg = q.cd < 8;
      c.save(); c.translate(x + w / 2, y + 12 * SC); const r = 10 * SC;
      c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.fillStyle = urg ? 'rgba(90,10,20,.9)' : 'rgba(20,30,40,.85)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r - 2, -Math.PI / 2, -Math.PI / 2 + 6.283 * p); c.closePath(); c.fillStyle = urg ? '#ff6a6a' : '#ffd84a'; c.fill();
      c.restore();
      label(String(Math.ceil(q.cd)), x + w / 2, y + 22 * SC, 13 * (urg ? 1.1 : 1), urg ? '#ffb3b3' : '#fff', 'center'); }
  }
}
/* Barra inferior: pista y barajado, siempre visibles (meta y recursos a la vista). */
const BY = 430, BH = 38;
const BTN = () => [['hint', 74, 150], ['shuf', 246, 150]];
function btnAt(x) { const b = BTN().find((q) => x > q[1] && x < q[1] + q[2]); return b ? b[0] : null; }
function bigBtn(x, w, on, txt, icon) {
  rrp(c, x, BY + 3, w, BH, 14); c.fillStyle = OUT; c.fill(); rrp(c, x, BY, w, BH, 14); ART.fillOut(c, on ? '#f4e6c4' : '#8d8a97', 2);
  c.fillStyle = 'rgba(255,255,255,.5)'; rrp(c, x + 6, BY + 3, w - 12, 7, 4); c.fill();
  if (icon === 'bulb') { c.beginPath(); c.arc(x + 24, BY + 16, 7, 0, 6.283); c.fillStyle = '#ffd84a'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); c.fillStyle = OUT; c.fillRect(x + 20, BY + 24, 8, 4); }
  else { c.save(); c.translate(x + 24, BY + 19); c.lineWidth = 2.4; c.strokeStyle = OUT; c.beginPath(); c.arc(0, 0, 8, 0.6, 5.2); c.stroke(); c.beginPath(); c.moveTo(6, -6); c.lineTo(9, 1); c.lineTo(2, 0); c.closePath(); c.fillStyle = OUT; c.fill(); c.restore(); }
  c.font = '800 15px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; c.fillText(txt, x + w / 2 + 14, BY + 20);
}
function draw() {
  const now = performance.now() / 1000;
  c.drawImage(BG, 0, 0, W, H);
  /* farolillos: el fondo respira */
  for (const L of LANT) { const yy = L.y + Math.sin(now * 0.8 + L.p) * 5, a = 0.1 + 0.05 * Math.sin(now * 1.6 + L.p);
    c.save(); c.globalAlpha = a; c.fillStyle = '#ffd08a'; c.beginPath(); c.ellipse(L.x, yy, L.r, L.r * 1.25, 0, 0, 6.283); c.fill(); c.restore(); }
  if (quake > 0) { c.save(); c.translate(Math.sin(now * 60) * quake * 4, 0); }
  if (dirty) renderBoard(); c.drawImage(boardCv, 0, 0, W, H);
  marks(now);
  // ficha bajo el puntero / seleccionada: se eleva
  const hov = !kbd && k.st === 'play' && !k.ptr.down ? pick(k.ptr.x, k.ptr.y) : null;
  const sw = SW(), sh = SH();
  for (const q of [hov, kbd ? cur : null, sel]) if (q && tiles.includes(q) && isFree(q)) { const l = q === sel ? 4 : 2; c.drawImage(spr(q.t, q.w), sx(q) - SC, sy(q) - SC - l, sw, sh); if (q === sel) { c.fillStyle = 'rgba(255,226,122,.28)'; rrp(c, sx(q), sy(q) - l, TW - 2 * SC, TH - 2 * SC, 7 * SC); c.fill(); ring(q, '#ffd84a', 3.5, l); } else if (q === cur && kbd) ring(q, '#5ce1e6', 3, l); else ring(q, 'rgba(255,255,255,.7)', 2, l); }
  if (hint) for (const q of hint) if (tiles.includes(q)) ring(q, `rgba(124,247,160,${0.6 + 0.4 * Math.sin(now * 8)})`, 4);
  // parejas que vuelan al centro y desaparecen
  for (const f of fly) { const e = Math.min(1, f.a), ee = e * e * (3 - 2 * e), x = f.x + (f.mx - f.x) * ee, y = f.y + (f.my - f.y) * ee - Math.sin(e * Math.PI) * 30, s = f.a > 1 ? 1 + (f.a - 1) * 2 : 1 + e * 0.15;
    c.save(); c.globalAlpha = f.a > 1 ? Math.max(0, 1 - (f.a - 1) * 4) : 1; c.translate(x + TW / 2, y + TH / 2); c.scale(s, s); c.drawImage(spr(f.t, f.w), -TW / 2 - SC, -TH / 2 - SC, sw, sh); c.restore(); }
  if (quake > 0) c.restore();
  drawHud(now);
}
function drawHud(now) {
  if (HAND) {
    /* el reproductor puede poner pausa/sonido arriba al centro (x 264..376 en pantallas anchas):
       la fila de arriba deja libre esa franja, con lo suyo a la izquierda y a la derecha */
    fit(`Nivel ${level} · ${lvi.n}`, 12, 7, 18, '#ffe27a', 'left', 246);
    label(`${score}`, W - 12, 5, 21, '#fff', 'right');
    const urg0 = tl < 25;
    label(`Fichas ${tiles.length} · ${mmss(Math.max(0, tl))}`, W - 12, 31, 14, urg0 ? '#ffb3b3' : '#cfeee2', 'right');
    /* reloj: barra con la marca de la 2ª estrella (meta visible en todo momento) */
    const bx = 12, bw = 246, by = 34, bh = 13, p = k.clamp(tl / tmax, 0, 1);
    rrp(c, bx, by, bw, bh, 6); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill();
    const urg = tl < 25;
    rrp(c, bx + 1.5, by + 1.5, Math.max(2, (bw - 3) * p), bh - 3, 5); c.fillStyle = urg ? (Math.sin(now * 9) > 0 ? '#ff6a6a' : '#ff9a6a') : p > 0.35 ? '#7cf7a0' : '#ffd84a'; c.fill();
    /* marca de la 2ª estrella: pilar con reborde oscuro, sin rótulo (el consejo ya dice el tiempo) */
    const mx = bx + (bw - 3) * k.clamp(1 - t2 / tmax, 0, 1) + 1.5;
    c.fillStyle = '#1a1530'; c.fillRect(mx - 3.5, by - 5, 7, bh + 10);
    c.fillStyle = '#ffd84a'; c.fillRect(mx - 2, by - 3.5, 4, bh + 7);
    /* la idea del nivel los primeros segundos, después el objetivo de tiempo */
    const tip = tipT > 0 ? lvi.i : `2★ si terminas en ${mmss(t2)} · 3★ además sin pista y sin barajar`;
    fit(tip, 12, 52, 12, tipT > 0 ? '#ffe7a8' : '#9fd3c2', 'left', W - 24);
  } else {
    label(CFG.title, 12, 10, 18, '#ffe27a'); label(`Nivel ${level} · ${NAMES[(level - 1) % 3]}`, 12, 32, 12, '#bfe6d6');
    label(`${score}`, W - 12, 8, 20, '#fff', 'right'); label(`Fichas ${tiles.length} · ${mmss(t)}`, W - 12, 32, 12, '#bfe6d6', 'right');
  }
  const bt = BTN();
  bigBtn(bt[0][1], bt[0][2], hints > 0, `Pista (${hints})`, 'bulb');
  bigBtn(bt[1][1], bt[1][2], shuf > 0, `Barajar (${shuf})`, 'shuf');
  /* franja libre a la derecha de los botones (x 404..628): estrellas y cadena, sin tapar fichas */
  if (HAND) label(`★ ${k.starsOf(level)}/3`, W - 16, BY + 2, 15, '#ffd84a', 'right');
  if (combo > 1) {
    const s = 1 + 0.06 * Math.sin(now * 12);
    c.save();
    if (HAND) { c.translate(W - 16, BY + 26); c.scale(s, s); label(`Cadena x${combo}`, 0, 0, 14, '#ffb0e0', 'right'); c.globalAlpha = 0.8; c.fillStyle = '#ffb0e0'; c.fillRect(-78, 15, 78 * comboT / 4.2, 3); }
    else { c.translate(W / 2, BY - 22); c.scale(s, s); label(`Cadena x${combo}`, 0, -10, 18, '#ffb0e0', 'center'); c.globalAlpha = 0.8; c.fillStyle = '#ffb0e0'; c.fillRect(-40, 12, 80 * comboT / 4.2, 4); }
    c.restore();
  }
}
