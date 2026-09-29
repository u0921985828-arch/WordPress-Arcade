/* Match-3. CFG.mode: 'moves' | 'time'
 * Gemas facetadas con forma y color distintos (accesible), intercambio animado, retirada con destello,
 * caída con rebote, cascadas en combo con texto y partículas, pista tras unos segundos quieto y control con teclado. */
const W = 480, H = 640, OUT = ART.OUT;
/* jewel-swap (plan Friv, tanda 4): 20 tableros escritos a mano en SWAPLV (src/eng/swaplv.js),
   con reglas puras en M3, progreso por dificultad y final de verdad. Todo lo nuevo va detrás
   de HAND: jewel-tide (modo 'time') y cualquier otro juego del motor siguen exactamente igual. */
const HAND = (CFG.mode === 'moves' && typeof SWAPLV !== 'undefined' && SWAPLV[CFG.id]) || null;
const k = Kit({
  w: W, h: H, title: CFG.title, bg: '#1d1538',
  fluid: HAND ? { min: 0.42, max: 2.8, maxW: 1180, maxH: 1000 } : false,
  help: HAND ? 'Intercambia dos gemas vecinas (deslizando o tocando las dos) para alinear tres o más. Cada nivel pide algo distinto: recoger gemas de un color, bajar los cofres hasta el suelo, romper todo el hielo, quitar la gelatina o liberar a los animalillos. Tienes un número de movimientos: se gasta uno por intercambio. Cuatro en línea dan un RAYO que limpia su fila o su columna, una L o una T dan una BOMBA de 3×3 y cinco en línea dan un COMODÍN. Junta dos especiales para fusionarlos.' : ''
}), c = k.ctx, N = 8, S = 56, OX = 16, OY = 146;
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
const GEM = ['#ff4d6d', '#ffd23d', '#4fe08a', '#4cc3ff', '#b77cff', '#ff9a3d'];
const TIMED = CFG.mode === 'time';
let queued = null, b, off, vel, sel, score, moves, target, level, time, busy, combo, clearing, swapA, check, cur, kbd, idle, hint, prevT, comboT, comboTxt, lvlT;
/* Dificultad: fácil juega con 5 colores de gema (más combinaciones), normal y difícil con los 6 de siempre. */
const ncol = () => (k.dif === 0 ? 5 : 6);
const MOVES = () => Math.round(30 * k.D.time);
const TMAX = () => 135 * k.D.time;
const HINTW = () => (k.dif === 0 ? 2.5 : k.dif === 2 ? 6 : 4);
function rnd() { return k.ri(0, ncol() - 1); }
function fill() { b = []; for (let y = 0; y < N; y++) { b[y] = []; for (let x = 0; x < N; x++) { let v; do v = rnd(); while ((x > 1 && b[y][x - 1] === v && b[y][x - 2] === v) || (y > 1 && b[y - 1][x] === v && b[y - 2][x] === v)); b[y][x] = v; } }
  off = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => 60 + (N - y) * 44 + x * 10)); vel = Array.from({ length: N }, () => Array(N).fill(0)); }
function matches() { const m = new Set();
  for (let y = 0; y < N; y++) for (let x = 0; x < N - 2; x++) { const v = b[y][x]; if (v >= 0 && v === b[y][x + 1] && v === b[y][x + 2]) [0, 1, 2].forEach((i) => m.add(y * N + x + i)); }
  for (let x = 0; x < N; x++) for (let y = 0; y < N - 2; y++) { const v = b[y][x]; if (v >= 0 && v === b[y + 1][x] && v === b[y + 2][x]) [0, 1, 2].forEach((i) => m.add((y + i) * N + x)); } return m; }
function findMove() { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) { const nx = x + dx, ny = y + dy; if (nx >= N || ny >= N) continue; swap(x, y, nx, ny); const ok = matches().size > 0; swap(x, y, nx, ny); if (ok) return [[x, y], [nx, ny]]; } return null; }
const hasMove = () => !!findMove();
function swap(x1, y1, x2, y2) { const t = b[y1][x1]; b[y1][x1] = b[y2][x2]; b[y2][x2] = t; }
const cx = (x) => OX + x * S + S / 2, cy = (y) => OY + y * S + S / 2;

/* Retira las gemas marcadas con puntos y efectos; la gravedad llega al terminar el destello */
function startClear(m) {
  combo++; const pts = m.size * 10 * combo; score += pts; let sx = 0, sy = 0;
  for (const i of m) { const gy = Math.floor(i / N), gx = i % N; sx += cx(gx); sy += cy(gy); k.burst(cx(gx), cy(gy), GEM[b[gy][gx]], 7, 140); }
  sx /= m.size; sy /= m.size; k.float('+' + pts, sx, sy, m.size >= 5 ? '#fff38a' : '#fff');
  if (m.size >= 5) { k.flash('rgba(255,255,255,.25)'); k.shake(4); }
  if (combo > 1) { comboTxt = combo >= 5 ? '¡Increíble!' : combo >= 4 ? '¡Fantástico!' : combo === 3 ? '¡Genial!' : '¡Bien!'; comboT = 1.1; }
  k.sfx(combo > 1 ? 'coin' : 'pop'); navigator.vibrate && navigator.vibrate(12);
  clearing = { m, t: 0 };
}
function gravity() {
  for (const i of clearing.m) b[Math.floor(i / N)][i % N] = -1;
  for (let x = 0; x < N; x++) { let w = N - 1; for (let y = N - 1; y >= 0; y--) if (b[y][x] >= 0) { if (w !== y) { b[w][x] = b[y][x]; off[w][x] = (w - y) * S + off[y][x]; vel[w][x] = vel[y][x]; } w--; }
    for (let y = w; y >= 0; y--) { b[y][x] = rnd(); off[y][x] = (w + 1) * S + 20; vel[y][x] = 0; } }
  clearing = null; check = true;
}
function reshuffle() { hint = null; idle = 0; k.float('Sin jugadas: nuevo tablero', 240, OY + N * S / 2, '#fff38a'); k.sfx('explode'); fill(); check = true; }
function reset() { score = 0; level = 1; moves = MOVES(); target = 650; prevT = 0; time = TMAX(); combo = 0; fill(); sel = null; clearing = null; swapA = null; check = true; cur = [3, 3]; kbd = false; idle = 0; hint = null; comboT = 0; lvlT = 0; queued = null; }

/* ---------- Gráficos cacheados ---------- */
function shape(v) {
  const r = 23, P = (n, rad, rot) => Array.from({ length: n }, (_, i) => { const a = rot + i * 6.2832 / n; return [Math.cos(a) * rad, Math.sin(a) * rad]; });
  if (v === 0) return P(8, r, Math.PI / 8);                                             // rubí octogonal
  if (v === 1) return Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.5 : r + 2; return [Math.cos(a) * rr, Math.sin(a) * rr + 2]; }); // estrella
  if (v === 2) return [[0, -r - 1], [r * 0.8, -r * 0.45], [r * 0.8, r * 0.45], [0, r + 1], [-r * 0.8, r * 0.45], [-r * 0.8, -r * 0.45]]; // esmeralda
  if (v === 3) return P(14, r - 1, 0);                                                  // zafiro redondo
  if (v === 4) return [[0, -r - 2], [r - 2, 0], [0, r + 2], [-r + 2, 0]];              // rombo
  return [[0, -r], [r + 1, r * 0.72], [-r - 1, r * 0.72]].map(([x, y]) => [x, y + 2]); // triángulo
}
const gemCv = [], gemFc = [];
/* Cara de la gema (solo jewel-swap): [desplazamiento vertical, separación de los ojos].
   Cada forma tiene su sitio: en el triángulo la cara baja, en la estrella se junta. */
const FACE = [[-3, 6.4], [-0.5, 5.6], [-3, 6.4], [-3, 6.6], [-1, 5.6], [3, 6.2]];
function gemFace(g, parts, v) {
  const f = FACE[v] || FACE[0], dy = f[0], sp2 = f[1];
  inpath(g, parts, (h) => {
    for (let s = -1; s <= 1; s += 2) {
      h.fillStyle = '#fffdf6'; h.beginPath(); h.ellipse(s * sp2, dy, 4.1, 4.8, 0, 0, 6.2832); h.fill();
      h.fillStyle = ART.OUT; h.beginPath(); h.ellipse(s * sp2 + s * 0.5, dy + 0.7, 2.3, 2.7, 0, 0, 6.2832); h.fill();
      h.fillStyle = 'rgba(255,255,255,.9)'; h.beginPath(); h.arc(s * sp2 - 0.8, dy - 1.2, 1.05, 0, 6.2832); h.fill();
    }
    /* sonrisa: media luna rellena, sin contorno (§8: nada de trazos cerrados dentro) */
    h.fillStyle = 'rgba(26,21,48,.72)'; h.beginPath();
    h.ellipse(0, dy + 6.2, 4.4, 3.4, 0, 0.18 * Math.PI, 0.82 * Math.PI); h.closePath(); h.fill();
  });
}
function gemSprite(v, face) {
  const store = face ? gemFc : gemCv;
  if (store[v]) return store[v];
  const cv = document.createElement('canvas'); cv.width = cv.height = S * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(S / 2, S / 2);
  const V = shape(v), col = GEM[v];
  const body = (h) => { h.moveTo(V[0][0], V[0][1]); for (let i = 1; i < V.length; i++) h.lineTo(V[i][0], V[i][1]); h.closePath(); };
  const parts = [[body, col]];
  contact(g, 0, 22, 17, 4.6, 0.32);
  uni(g, parts, 1.5);
  celp(g, parts, col, 5.5, 5.5);
  spec(g, -8.5, -12.5, 4.6, 2.8, -0.6, 0.72);
  if (face) gemFace(g, parts, v);
  return (store[v] = cv);
}
let bgCv;
function makeBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3b2468'); gr.addColorStop(0.6, '#241645'); gr.addColorStop(1, '#170f2e'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 2; for (let i = -H; i < W; i += 28) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(g, OX - 10, OY - 4, N * S + 20, N * S + 20, 18); g.fill();
  ART.rr(g, OX - 10, OY - 10, N * S + 20, N * S + 20, 18); ART.fillOut(g, '#5a4390', 4);
  ART.rr(g, OX - 3, OY - 3, N * S + 6, N * S + 6, 12); g.fillStyle = '#2a1d4f'; g.fill();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { g.fillStyle = (x + y) % 2 ? '#33265e' : '#2c2154'; ART.rr(g, OX + x * S + 1.5, OY + y * S + 1.5, S - 3, S - 3, 8); g.fill(); }
  const hud = (x, w) => { g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, x, 16, w, 56, 14); g.fill(); ART.rr(g, x, 12, w, 56, 14); ART.fillOut(g, '#4a3680', 3); };
  hud(14, 150); hud(W - 164, 150);
  g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, 24, 94, W - 48, 24, 12); g.fill(); ART.rr(g, 24, 90, W - 48, 24, 12); ART.fillOut(g, '#2a1d4f', 3);
  return cv;
}
function label(s, x, y, size, col, align, base) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function small(s, x, y, col, align) { c.font = '800 11px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.fillStyle = col || '#c9b8f0'; c.fillText(s, x, y); }

const intro = () => TIMED ? `Haz todas las combinaciones que puedas en ${Math.round(TMAX())} segundos. Desliza o toca dos gemas vecinas.` : `Consigue los puntos objetivo en ${MOVES()} movimientos. Desliza o toca dos gemas vecinas.`;
if (!HAND) k.onDif = () => { if (k.st !== 'play') { reset(); k.show(CFG.title, intro()); } };
if (!HAND) { reset(); k.show(CFG.title, intro()); }
let drag = null;
function trySwap(a, bb) {
  if (!bb || bb[0] < 0 || bb[1] < 0 || bb[0] >= N || bb[1] >= N) return;
  swap(a[0], a[1], bb[0], bb[1]); swapA = { a, b: bb, t: 0, back: false }; if (!TIMED) moves--; sel = null; idle = 0; hint = null; k.sfx('click');
}
if (!HAND) k.run((dt) => {
  let settling = false;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (off[y][x] > 0 || vel[y][x]) { settling = true;
    vel[y][x] += 2600 * dt; off[y][x] -= vel[y][x] * dt;
    if (off[y][x] <= 0 && vel[y][x] > 0) { off[y][x] = 0; if (vel[y][x] > 260) vel[y][x] *= -0.22; else vel[y][x] = 0; } }
  if (comboT > 0) comboT -= dt; if (lvlT > 0) lvlT -= dt;
  if (!k.gate(reset)) return;
  if (TIMED) { time -= dt; if (time <= 0) { time = 0; return k.lose(CFG.id, score, '¡Tiempo!'); } }
  // el deslizamiento hecho mientras caen las gemas se guarda y se aplica al quedar quietas
  const cell = (x, y) => [Math.floor((x - OX) / S), Math.floor((y - OY) / S)], inB = ([x, y]) => x >= 0 && y >= 0 && x < N && y < N;
  if (k.ptr.hit) { const s0 = cell(k.ptr.sx, k.ptr.sy); drag = inB(s0) ? { s0, done: false } : null; kbd = false; }
  const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy, far = Math.hypot(dx, dy) > 20;
  if (drag && !drag.done && (k.ptr.down || k.ptr.up) && far) { drag.done = true; queued = [drag.s0, Math.abs(dx) > Math.abs(dy) ? [drag.s0[0] + Math.sign(dx), drag.s0[1]] : [drag.s0[0], drag.s0[1] + Math.sign(dy)]]; }
  if (swapA) { swapA.t += dt / 0.16; if (swapA.t >= 1) { const s = swapA; swapA = null;
    if (!s.back) { const m = matches(); if (m.size) { combo = 0; startClear(m); } else { swap(s.a[0], s.a[1], s.b[0], s.b[1]); swapA = { a: s.a, b: s.b, t: 0, back: true }; if (!TIMED) moves++; k.sfx('hit'); } } } return; }
  if (clearing) { clearing.t += dt / 0.2; if (clearing.t >= 1) gravity(); return; }
  if (settling) return;
  if (check) { const m = matches(); if (m.size) return startClear(m); check = false; combo = 0; if (!hasMove()) return reshuffle(); }
  if (!TIMED) { if (score >= target) { level++; prevT = target; target = score + Math.min(2600, 650 + 220 * (level - 1)); moves = MOVES(); /* 1.23: más fácil */ lvlT = 1.6; k.sfx('win'); k.confetti(); }
    else if (moves <= 0) return k.lose(CFG.id, score, 'Sin movimientos', `Nivel ${level}`); }
  idle += dt; if (idle > HINTW() && !hint) hint = findMove();
  if (queued) { const q = queued; queued = null; trySwap(q[0], q[1]); return; }
  else if (drag && !drag.done && k.ptr.up) { const s0 = drag.s0; if (sel && Math.abs(sel[0] - s0[0]) + Math.abs(sel[1] - s0[1]) === 1) trySwap(sel, s0); else { sel = sel && sel[0] === s0[0] && sel[1] === s0[1] ? null : s0; k.sfx('click'); } }
  if (k.ptr.up) drag = null;
  // teclado: flechas mueven el cursor; A selecciona y la flecha siguiente intercambia
  const DV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  for (const d in DV) if (k.hit.has(d)) { kbd = true; if (sel) { trySwap(sel, [sel[0] + DV[d][0], sel[1] + DV[d][1]]); cur = [k.clamp(cur[0] + DV[d][0], 0, N - 1), k.clamp(cur[1] + DV[d][1], 0, N - 1)]; } else cur = [k.clamp(cur[0] + DV[d][0], 0, N - 1), k.clamp(cur[1] + DV[d][1], 0, N - 1)]; }
  if (k.hit.has('a')) { kbd = true; sel = sel ? null : [...cur]; k.sfx('click'); }
}, () => {
  if (!bgCv) bgCv = makeBg(); c.drawImage(bgCv, 0, 0, W, H);
  const t = performance.now() / 1000;
  small('PUNTOS', 30, 20); label(String(score), 30, 34, 26, '#fff');
  if (TIMED) { small('TIEMPO', W - 30, 20, '#c9b8f0', 'right'); label(`${Math.ceil(time)} s`, W - 30, 34, 26, time < 10 ? '#ff6b7a' : '#ffd23d', 'right'); }
  else { small(`NIVEL ${level}`, W - 30, 20, '#c9b8f0', 'right'); label(`${moves} movs`, W - 30, 34, 26, moves <= 5 ? '#ff6b7a' : '#ffd23d', 'right'); }
  // barra de progreso: meta de puntos o tiempo restante
  const pr = TIMED ? time / TMAX() : k.clamp((score - prevT) / (target - prevT), 0, 1), bw = (W - 54) * pr;
  if (bw > 2) { ART.rr(c, 27, 93, Math.max(18, bw), 18, 9); c.fillStyle = TIMED ? (time < 10 ? '#ff5f7a' : '#4cc3ff') : '#ffd23d'; c.fill(); ART.rr(c, 31, 95, Math.max(10, bw - 8), 5, 2.5); c.fillStyle = 'rgba(255,255,255,.45)'; c.fill(); }
  c.font = '800 12px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 3; c.strokeStyle = OUT; const bt = TIMED ? 'Combina rápido' : `Meta ${target}`; c.strokeText(bt, W / 2, 103); c.fillStyle = '#fff'; c.fillText(bt, W / 2, 103);
  // gemas
  c.save(); c.beginPath(); c.rect(OX - 3, OY - 3, N * S + 6, N * S + 6); c.clip();
  const pos = (x, y) => { let X = cx(x), Y = cy(y) - off[y][x];
    if (swapA) { const e = swapA.t < 0.5 ? 2 * swapA.t * swapA.t : 1 - 2 * (1 - swapA.t) * (1 - swapA.t), [a, bb] = [swapA.a, swapA.b];
      if (x === a[0] && y === a[1]) { X = cx(bb[0]) + (cx(a[0]) - cx(bb[0])) * e; Y = cy(bb[1]) + (cy(a[1]) - cy(bb[1])) * e; }
      else if (x === bb[0] && y === bb[1]) { X = cx(a[0]) + (cx(bb[0]) - cx(a[0])) * e; Y = cy(a[1]) + (cy(bb[1]) - cy(a[1])) * e; } } return [X, Y]; };
  const isSel = (p, x, y) => p && p[0] === x && p[1] === y;
  for (const p of [sel, kbd ? cur : null]) if (p) { c.lineWidth = 3; c.strokeStyle = p === sel ? '#fff' : 'rgba(255,255,255,.5)'; ART.rr(c, OX + p[0] * S + 2, OY + p[1] * S + 2, S - 4, S - 4, 10); if (p === sel) { c.fillStyle = 'rgba(255,255,255,.18)'; c.fill(); } c.stroke(); }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = b[y][x]; if (v < 0) continue; const [X, Y] = pos(x, y); if (Y < OY - S) continue;
    let s = 1, sy = 1; const cl = clearing && clearing.m.has(y * N + x);
    if (cl) s = 1 + 0.25 * Math.sin(clearing.t * Math.PI) - clearing.t * 0.9;
    else if (isSel(sel, x, y)) s = 1.08 + Math.sin(t * 8) * 0.04;
    else if (hint && (isSel(hint[0], x, y) || isSel(hint[1], x, y))) s = 1 + Math.abs(Math.sin(t * 5)) * 0.12;
    if (vel[y][x] < 0) sy = 0.88; // aplastado al rebotar
    const z = S / 2 * s; if (z <= 0) continue; const w2 = z * 2 * (2 - sy), h2 = z * 2 * sy; c.drawImage(gemSprite(v), X - w2 / 2, Y + z - h2, w2, h2);
    if (cl) { c.globalAlpha = Math.sin(clearing.t * Math.PI) * 0.8; c.fillStyle = '#fff'; c.beginPath(); c.arc(X, Y, 20 * s + 4, 0, 6.283); c.fill(); c.globalAlpha = 1; } }
  c.restore();
  if (comboT > 0) { const a = Math.min(1, comboT / 0.3), sc = 1 + Math.max(0, comboT - 0.9) * 2; c.globalAlpha = a; label(comboTxt, W / 2, OY + N * S / 2 - 40, 38 * sc, '#ff9ad5', 'center', 'middle'); label(`Combo x${combo}`, W / 2, OY + N * S / 2, 20, '#fff', 'center', 'middle'); c.globalAlpha = 1; }
  if (lvlT > 0) { c.globalAlpha = Math.min(1, lvlT / 0.3); label(`¡Nivel ${level}!`, W / 2, OY + N * S / 2 + 50, 40, '#ffd23d', 'center', 'middle'); label(MOVES() + ' movimientos', W / 2, OY + N * S / 2 + 86, 18, '#fff', 'center', 'middle'); c.globalAlpha = 1; }
});

/* ================== jewel-swap: 20 niveles a mano (plan Friv, F3, tanda 4) ==================
   Las reglas viven en M3 (src/eng/swaplv.js) y están verificadas con un simulador en Node.
   Aquí solo se dibuja y se anima: el motor pide un paso (M3.step) y cada paso se convierte en
   una animación. Nada de este bloque se ejecuta sin HAND, así que jewel-tide queda intacto. */
if (HAND) (function () {
  const LV = HAND, NLV = LV.length;
  const E = M3.EMPTY, CH = M3.CHEST, CG = M3.CAGE, WD = M3.WILD;
  let LS = null, CS = 40, BX = 0, BY = 0, TOPH = 104, PX = 0, PY = 0, PW = 0, PH = 0, side = false;
  let bgL = null, bdL = null, bdX = 0, bdY = 0, A = null, idleOn = false, selL = null, curL = [0, 0], kbdL = false;
  let dragL = null, queuedL = null, pops = [], fx = null, nw = null, bt = null, cmbT = 0, cmbTxt = '', hintL = null, idleT = 0;
  let starsL = 0, noteT = 0, noteTxt = '', introT = 0, seenSt = 1, mvPulse = 0;

  /* fácil regala movimientos y quita un color; difícil recorta el margen */
  const mvOf = (lv) => Math.max(6, Math.round(lv.mv * (k.dif === 0 ? 1.3 : k.dif === 2 ? 0.85 : 1)));
  const colsOf = (lv) => (k.dif === 0 ? Math.max(4, (lv.cols || 6) - 1) : (lv.cols || 6));
  const CN = ['rojas', 'amarillas', 'verdes', 'azules', 'moradas', 'naranjas'];
  /* Casi-victoria (GANCHO §A4): al perder se dice EXACTAMENTE qué faltaba, en castellano llano. */
  const CN1 = ['roja', 'amarilla', 'verde', 'azul', 'morada', 'naranja'];
  const MISS = { chest: ['cofre', 'cofres'], ice: ['trozo de hielo', 'trozos de hielo'], jelly: ['gelatina', 'gelatinas'], animal: ['animalillo', 'animalillos'], score: ['punto', 'puntos'] };
  function missName(o, n) {
    if (o.t === 'color') return n === 1 ? 'gema ' + (CN1[o.v] || '') : 'gemas ' + (CN[o.v] || '');
    const m = MISS[o.t] || [o.t, o.t]; return n === 1 ? m[0] : m[1];
  }
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function rrp(g, x, y, w, h, r) { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* ---------------- adornos cacheados (fondo vivo, estrellas, brillo de especial) ----------------
     Todo se hornea una vez: en el bucle solo hay drawImage, nunca gradientes ni shadowBlur. */
  const stCv = {};
  function starIco(on) {
    const key = on ? 1 : 0; if (stCv[key]) return stCv[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = 48; const g = cv.getContext('2d'); g.translate(24, 24);
    const V = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 8 : 18; V.push([Math.cos(a) * r, Math.sin(a) * r]); }
    const body = (h) => { h.moveTo(V[0][0], V[0][1]); for (let i = 1; i < V.length; i++) h.lineTo(V[i][0], V[i][1]); h.closePath(); };
    const col = on ? '#ffd23d' : '#3b2f63';
    uni(g, [[body, col]], 1.6);
    celp(g, [[body, col]], col, 3.5, 3.5);
    if (on) spec(g, -5, -7, 3.6, 2.2, -0.6, 0.75);
    return (stCv[key] = cv);
  }
  let gloCv = null;
  function glowSpr() {
    if (gloCv) return gloCv;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.3, 'rgba(255,246,190,.45)'); gr.addColorStop(1, 'rgba(255,240,170,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (gloCv = cv);
  }
  const aurCv = {};
  function aurora(i) {
    if (aurCv[i]) return aurCv[i];
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    const col = i ? ['rgba(255,120,200,.30)', 'rgba(255,120,200,0)'] : ['rgba(110,98,245,.34)', 'rgba(110,98,245,0)'];
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return (aurCv[i] = cv);
  }
  /* 22 motas de polvo que suben despacio: el fondo respira sin costar nada (GANCHO §B9) */
  const MOTE = []; for (let i = 0; i < 22; i++) MOTE.push({ x: (i * 97 % 100) / 100, y: (i * 61 % 100) / 100, r: 3 + (i % 5) * 2.2, s: 0.006 + (i % 7) * 0.0022, w: 0.3 + (i % 4) * 0.25, a: 0.10 + (i % 5) * 0.035 });

  /* ---------------- sprites cacheados (§8: una sola silueta por objeto) ---------------- */
  const spCv = {};
  function spSpr(v, sp) {
    const key = v + ':' + sp; if (spCv[key]) return spCv[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = S * 2;
    const g = cv.getContext('2d'); g.scale(2, 2); g.translate(S / 2, S / 2);
    if (sp === M3.WSP) {
      const body = (h) => { h.moveTo(0, -23); for (let i = 1; i < 8; i++) { const a = -Math.PI / 2 + i * 6.2832 / 8; h.lineTo(Math.cos(a) * 23, Math.sin(a) * 23); } h.closePath(); };
      contact(g, 0, 22, 17, 4.6, 0.32);
      uni(g, [[body, '#ffffff']], 1.6);
      inpath(g, [[body, '#fff']], (h) => {
        for (let i = 0; i < 6; i++) { h.fillStyle = GEM[i]; h.beginPath(); h.moveTo(0, 0); h.arc(0, 0, 26, -1.5708 + i * 1.0472, -1.5708 + (i + 1) * 1.0472); h.closePath(); h.fill(); }
        h.fillStyle = 'rgba(255,255,255,.55)'; h.beginPath(); h.arc(0, 0, 8, 0, 6.2832); h.fill();
      });
      spec(g, -8, -11, 5, 3, -0.6, 0.8);
      return (spCv[key] = cv);
    }
    g.drawImage(gemSprite(v), -S / 2, -S / 2, S, S);
    const mk = (fn) => { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = ART.OUT; g.lineWidth = 3.2; g.beginPath(); fn(g); g.stroke(); g.beginPath(); fn(g); g.fillStyle = '#fff7d8'; g.fill(); };
    if (sp === M3.RH) mk((h) => { h.moveTo(-15, -4.5); h.lineTo(10, -4.5); h.lineTo(10, -9); h.lineTo(18, 0); h.lineTo(10, 9); h.lineTo(10, 4.5); h.lineTo(-15, 4.5); h.lineTo(-15, 9); h.lineTo(-23, 0); h.lineTo(-15, -9); h.closePath(); });
    else if (sp === M3.RV) mk((h) => { h.moveTo(-4.5, -15); h.lineTo(-4.5, 10); h.lineTo(-9, 10); h.lineTo(0, 18); h.lineTo(9, 10); h.lineTo(4.5, 10); h.lineTo(4.5, -15); h.lineTo(9, -15); h.lineTo(0, -23); h.lineTo(-9, -15); h.closePath(); });
    else if (sp === M3.BOMB) {
      mk((h) => { h.arc(0, 3, 13, 0, 6.2832); h.moveTo(3, -9); h.lineTo(7, -18); h.lineTo(11, -15); h.lineTo(7, -7); h.closePath(); });
      g.fillStyle = ART.dark('#fff7d8', 0.4); g.beginPath(); g.arc(0, 5, 8, 0.2, 2.6); g.fill();
      g.fillStyle = '#ff9a3d'; g.beginPath(); g.arc(9.5, -18.5, 3.2, 0, 6.2832); g.fill();
    }
    return (spCv[key] = cv);
  }
  let chCv = null, cgCv = null, icCv = null, jlCv = null;
  function chestSpr() {
    if (chCv) return chCv;
    const cv = document.createElement('canvas'); cv.width = cv.height = S * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(S / 2, S / 2);
    const body = (h) => rrp(h, -21, -16, 42, 33, 6);
    contact(g, 0, 19, 17, 4.4, 0.32);
    uni(g, [[body, '#d08f44']], 1.7);
    inpath(g, [[body, '#d08f44']], (h) => {
      h.fillStyle = ART.lite('#d08f44', 0.22); h.fillRect(-23, -18, 46, 12);
      h.fillStyle = ART.dark('#d08f44', 0.3); h.fillRect(-23, -6, 46, 6);
      h.fillStyle = ART.dark('#d08f44', 0.16); h.fillRect(-23, 8, 46, 12);
      h.fillStyle = '#ffd23d'; h.beginPath(); rrp(h, -7, -7, 14, 15, 3); h.fill();
      h.fillStyle = ART.dark('#ffd23d', 0.45); h.beginPath(); h.arc(0, -1, 2.6, 0, 6.2832); h.fill(); h.fillRect(-1.2, -1, 2.4, 6);
    });
    spec(g, -11, -11, 6, 2.6, -0.5, 0.5);
    return (chCv = cv);
  }
  function cageSpr() {
    if (cgCv) return cgCv;
    const cv = document.createElement('canvas'); cv.width = cv.height = S * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(S / 2, S / 2);
    const body = (h) => { h.moveTo(-19, 18); h.lineTo(-19, -4); h.arcTo(-19, -20, 0, -20, 16); h.arcTo(19, -20, 19, -4, 16); h.lineTo(19, 18); h.closePath(); };
    contact(g, 0, 20, 17, 4.2, 0.32);
    uni(g, [[body, '#9aa7c9']], 1.7);
    inpath(g, [[body, '#9aa7c9']], (h) => {
      h.fillStyle = '#4a3a70'; h.fillRect(-20, -8, 40, 24);
      h.fillStyle = '#ffd08a'; h.beginPath(); h.ellipse(0, 7, 10, 8, 0, 0, 6.2832); h.fill();
      h.fillStyle = ART.OUT; h.beginPath(); h.ellipse(-3.6, 5, 1.8, 2.1, 0, 0, 6.2832); h.fill(); h.beginPath(); h.ellipse(3.6, 5, 1.8, 2.1, 0, 0, 6.2832); h.fill();
      h.fillStyle = ART.dark('#9aa7c9', 0.3); for (let i = -2; i <= 2; i++) h.fillRect(i * 8 - 1.6, -20, 3.2, 40);
      h.fillStyle = ART.dark('#9aa7c9', 0.18); h.fillRect(-20, 13, 40, 7);
    });
    spec(g, -9, -12, 5.4, 2.4, -0.5, 0.45);
    return (cgCv = cv);
  }
  function iceIco() {
    if (icCv) return icCv;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); g.translate(32, 32);
    const body = (h) => { for (let i = 0; i < 6; i++) { const a = i * 1.0472; h.moveTo(0, 0); h.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); h.lineTo(Math.cos(a + 0.42) * 12, Math.sin(a + 0.42) * 12); h.closePath(); } };
    uni(g, [[body, '#bfeaff']], 2.6);
    return (icCv = cv);
  }
  function jellyIco() {
    if (jlCv) return jlCv;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); g.translate(32, 32);
    const body = (h) => { h.moveTo(-24, 16); h.bezierCurveTo(-26, -14, -10, -24, 0, -24); h.bezierCurveTo(12, -24, 26, -12, 24, 16); h.closePath(); };
    uni(g, [[body, '#ff8ad0']], 2.6);
    inpath(g, [[body, '#ff8ad0']], (h) => { h.fillStyle = 'rgba(255,255,255,.4)'; h.beginPath(); h.ellipse(-8, -8, 7, 5, -0.5, 0, 6.2832); h.fill(); });
    return (jlCv = cv);
  }

  /* ---------------- nivel y disposición ---------------- */
  function load(i) {
    const lv = LV[i - 1];
    LS = M3.make(lv, { colors: colsOf(lv), moves: mvOf(lv) });
    M3.settle(LS, 4000);
    fx = LS.c.map((r) => r.map(() => 0));
    nw = LS.c.map((r) => r.map(() => 0));
    bt = LS.c.map((r) => r.map(() => 0));
    A = null; idleOn = true; selL = null; hintL = null; idleT = 0; pops = []; cmbT = 0; noteT = 0; starsL = 0;
    introT = 2.9; seenSt = 1; mvPulse = 0; k.chainReset();
    curL = [Math.min(LS.w - 1, LS.w >> 1), Math.min(LS.h - 1, LS.h >> 1)]; kbdL = false; dragL = null; queuedL = null;
    layout();
  }
  function layout() {
    if (!LS) return;
    const topFree = 56;                      /* el reproductor pone su botón de pausa arriba al centro */
    const cs = Math.min((k.H - topFree - 44) / LS.h, (k.W - 380) / LS.w, 86);
    side = k.W >= 760 && k.W - cs * LS.w >= 260 && cs >= 34;
    if (side) {
      CS = Math.max(22, Math.floor(cs));
      const bw = CS * LS.w; PW = Math.max(230, Math.min(340, Math.floor(k.W - bw - 60)));
      const tot = bw + PW + 26; PX = Math.round((k.W - tot) / 2);
      BX = Math.round(PX + PW + 26); BY = Math.round(topFree + (k.H - topFree - CS * LS.h) / 2);
      PH = Math.min(k.H - topFree - 16, 300 + 37 * LS.obj.length);
      PY = Math.round(Math.max(topFree + 8, BY + (CS * LS.h - PH) / 2));
      TOPH = topFree;
    } else {
      TOPH = 102;
      const availW = k.W - 20, availH = k.H - TOPH - 58;   /* 58: franja de la barra de estrellas */
      CS = Math.max(18, Math.floor(Math.min(availW / LS.w, availH / LS.h, 80)));
      BX = Math.round((k.W - CS * LS.w) / 2); BY = Math.round(TOPH + (availH - CS * LS.h) / 2);
      PW = 0; PX = 0;
    }
    bgL = null; bdL = null;
  }
  /* Fondo lejano: degradado, rayos y la placa del panel. El tablero va en su propio lienzo
     (makeBoard) para que las motas y las auroras puedan pasar POR DETRÁS de él. */
  function makeBg() {
    const sc = (k.W > 900 || k.H > 900) ? 1 : CDPR;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(k.W * sc); cv.height = Math.ceil(k.H * sc);
    const g = cv.getContext('2d'); g.scale(sc, sc);
    const gr = g.createLinearGradient(0, 0, 0, k.H); gr.addColorStop(0, '#34215e'); gr.addColorStop(0.55, '#1f1440'); gr.addColorStop(1, '#130d28');
    g.fillStyle = gr; g.fillRect(0, 0, k.W, k.H);
    g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 2;
    for (let i = -k.H; i < k.W; i += 28) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + k.H, k.H); g.stroke(); }
    /* viñeta: el decorado se apaga por los bordes y lo jugable queda lo más claro (GANCHO §B10) */
    const vg = g.createRadialGradient(k.W / 2, k.H * 0.46, Math.min(k.W, k.H) * 0.22, k.W / 2, k.H * 0.5, Math.max(k.W, k.H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
    g.fillStyle = vg; g.fillRect(0, 0, k.W, k.H);
    if (side) { g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, PX, PY + 6, PW, PH, 18); g.fill(); ART.rr(g, PX, PY, PW, PH, 18); ART.fillOut(g, '#33265e', 3); }
    return cv;
  }
  /* Placa del tablero con profundidad: sombra proyectada, marco biselado, casilla hundida. */
  function makeBoard() {
    if (!LS) return null;
    const sc = (k.W > 900 || k.H > 900) ? 1 : CDPR, M = 14;
    bdX = BX - M; bdY = BY - M;
    const w2 = CS * LS.w + M * 2, h2 = CS * LS.h + M * 2;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w2 * sc); cv.height = Math.ceil(h2 * sc);
    const g = cv.getContext('2d'); g.scale(sc, sc); g.translate(-bdX, -bdY);
    const r = Math.max(4, CS * 0.15);
    const has = (x, y) => x >= 0 && y >= 0 && x < LS.w && y < LS.h && !LS.bl[y][x];
    const each = (fn) => { for (let y = 0; y < LS.h; y++) for (let x = 0; x < LS.w; x++) if (has(x, y)) fn(x, y, BX + x * CS, BY + y * CS); };
    each((x, y, X, Y) => { g.fillStyle = 'rgba(8,4,20,.42)'; g.fillRect(X - 6, Y + 4, CS + 12, CS + 12); });   /* sombra proyectada */
    each((x, y, X, Y) => { g.fillStyle = '#6a50a6'; g.fillRect(X - 6, Y - 7, CS + 12, CS + 13); });            /* canto claro (luz arriba) */
    each((x, y, X, Y) => { g.fillStyle = '#4a3680'; g.fillRect(X - 6, Y - 1, CS + 12, CS + 7); });             /* cuerpo del marco */
    each((x, y, X, Y) => { g.fillStyle = '#231843'; g.fillRect(X, Y, CS, CS); });                              /* hueco */
    each((x, y, X, Y) => {
      g.fillStyle = (x + y) % 2 ? '#342767' : '#2c215a';
      ART.rr(g, X + 1.5, Y + 1.5, CS - 3, CS - 3, r); g.fill();
      g.fillStyle = 'rgba(8,4,20,.30)'; ART.rr(g, X + 1.5, Y + 1.5, CS - 3, Math.max(3, CS * 0.2), r); g.fill();   /* sombra interior arriba */
      g.fillStyle = 'rgba(255,255,255,.07)'; ART.rr(g, X + 3, Y + CS - Math.max(4, CS * 0.16), CS - 6, Math.max(2.5, CS * 0.1), r * 0.6); g.fill();
    });
    return cv;
  }

  /* ---------------- animación: cada paso del motor es un fotograma largo ---------------- */
  function fallFx(prev) {
    for (let y = 0; y < LS.h; y++) for (let x = 0; x < LS.w; x++) { fx[y][x] = 0; nw[y][x] = 0; }
    for (let x = 0; x < LS.w; x++) {
      const t = LS.top[x], b = LS.bot[x]; if (t < 0) continue;
      const old = []; for (let y = b; y >= t; y--) if (prev[y][x] !== E) old.push(y);
      let j = 0;
      for (let y = b; y >= t; y--) {
        if (LS.c[y][x] === E) continue;
        const nuevo = j >= old.length;
        const oy = nuevo ? (t - 1 - (j - old.length)) : old[j];
        fx[y][x] = (oy - y) * CS; if (nuevo) nw[y][x] = 1; j++;
      }
    }
  }
  /* Remate de la caída: lo que ha bajado aterriza con aplastamiento (GANCHO §B8) */
  function landFx() {
    for (let y = 0; y < LS.h; y++) for (let x = 0; x < LS.w; x++) if (fx[y][x]) bt[y][x] = 0.17;
  }
  const cxp = (x) => BX + x * CS + CS / 2, cyp = (y) => BY + y * CS + CS / 2;
  /* Todo el jugo de una retirada, junto: partículas del color de la gema, puntos flotantes,
     nota de la cadena que sube (k.chime), multiplicador visible (k.combo), hitstop y golpe
     de zoom en lo gordo, y cartel cuando la cascada se pone seria (GANCHO §A3 y §B7). */
  function fireClear(ev) {
    let sx = 0, sy = 0, n = 0, esp = false;
    for (let q = 0; q < pops.length && q < 14; q++) { const p = pops[q]; k.burst(cxp(p.x), cyp(p.y), p.kind === 'cage' ? '#ffd23d' : (GEM[p.v] || '#fff'), p.sp ? 12 : 6, p.sp ? 200 : 130); }
    for (let q = 0; q < pops.length; q++) { if (pops[q].sp) esp = true; sx += cxp(pops[q].x); sy += cyp(pops[q].y); n++; }
    if (n) k.float('+' + ev.pts, sx / n, sy / n, ev.combo > 1 ? '#fff38a' : '#fff');
    k.chime(Math.min(10, ev.combo - 1));
    if (ev.combo > 1 && n) k.combo(ev.combo, sx / n, sy / n - CS * 0.7);
    if (esp) { k.punch(0.055); k.hitstop(0.05); k.flash('rgba(255,255,255,.22)'); k.shake(6); }
    else if (pops.length >= 7) { k.flash('rgba(255,255,255,.16)'); k.shake(4); k.hitstop(0.04); }
    else if (pops.length >= 5) k.hitstop(0.03);
    if (ev.combo > 1) { cmbTxt = ev.combo >= 5 ? '¡Increíble!' : ev.combo >= 4 ? '¡Fantástico!' : ev.combo === 3 ? '¡Genial!' : '¡Bien!'; cmbT = 1.1; }
    if (ev.combo >= 4) k.reward('¡CASCADA x' + ev.combo + '!', '#ff9ad5');
    if (ev.freed.length) { k.sfx('win'); k.reward(ev.freed.length > 1 ? '¡RESCATE x' + ev.freed.length + '!' : '¡RESCATADO!', '#7cf7a0'); }
    else k.sfx(ev.combo > 1 ? 'coin' : 'pop');
    navigator.vibrate && navigator.vibrate(esp ? 24 : 12);
  }
  function stepOnce() {
    const prev = LS.c.map((r) => r.slice()), psp = LS.sp.map((r) => r.slice());
    const ev = M3.step(LS);
    if (ev.t === 'idle') { idleOn = true; k.chainReset(); return; }
    if (ev.t === 'win') { lwin(); return; }
    if (ev.t === 'lose') { llose(); return; }
    if (ev.t === 'clear') {
      pops = [];
      let nsp = 0;
      for (let q = 0; q < ev.cells.length; q++) { const i = ev.cells[q], y = (i / LS.w) | 0, x = i % LS.w; if (psp[y][x]) nsp++; pops.push({ x: x, y: y, v: prev[y][x], sp: psp[y][x], kind: 'gem' }); }
      for (let q = 0; q < ev.freed.length; q++) { const i = ev.freed[q], y = (i / LS.w) | 0, x = i % LS.w; pops.push({ x: x, y: y, v: 0, sp: 0, kind: 'cage' }); }
      /* Un especial no revienta de golpe: primero se CARGA (crece y se pone blanco) y luego
         estalla. Anticipación y remate, GANCHO §B8. */
      if (nsp) { A = { t: 'charge', time: 0, dur: 0.2, ev: ev, then: { t: 'clear', time: 0, dur: 0.22 } }; return; }
      fireClear(ev); A = { t: 'clear', time: 0, dur: 0.2 }; return;
    }
    if (ev.t === 'chest') {
      pops = ev.cells.map((i) => ({ x: i % LS.w, y: (i / LS.w) | 0, v: 0, sp: 0, kind: 'chest' }));
      for (let q = 0; q < pops.length; q++) { const p = pops[q]; k.burst(cxp(p.x), cyp(p.y), '#ffd23d', 16, 150); k.float('+300', cxp(p.x), cyp(p.y) - CS * 0.5, '#ffd23d'); }
      k.sfx('coin'); k.shake(5); k.punch(0.045); k.hitstop(0.04);
      k.reward(pops.length > 1 ? '¡' + pops.length + ' COFRES!' : '¡COFRE!', '#ffd23d');
      A = { t: 'chest', time: 0, dur: 0.34 }; return;
    }
    if (ev.t === 'fall') { fallFx(prev); A = { t: 'fall', time: 0, dur: 0.17 }; return; }
    if (ev.t === 'shuffle') { noteTxt = 'Sin jugadas: barajo el tablero'; noteT = 1.6; k.sfx('explode'); A = { t: 'shuffle', time: 0, dur: 0.4 }; return; }
    A = { t: 'wait', time: 0, dur: 0.05 };
  }
  function lwin() {
    starsL = M3.stars(LS);
    k.best(CFG.id, LS.score);
    const lv = LV[k.lv - 1];
    const nxt = k.lv < NLV ? '<br>Ahora: ' + LV[k.lv].n : '';
    const falta = starsL < 3 ? '<br>Con ' + LS.st[2] + ' puntos habrían sido tres estrellas.' : '';
    /* Las estrellas van a kit.js: se guardan por dificultad y salen en la rejilla de niveles. */
    k.levelDone(LS.score, lv.n + '<br>' + LS.score + ' puntos · ' + LS.mv + ' movimiento' + (LS.mv === 1 ? '' : 's') + ' de sobra' + falta + nxt, { stars: starsL });
  }
  function llose() {
    /* Casi-victoria: se dice exactamente qué faltaba, y si faltaba poco se dice también. */
    const pend = LS.obj.filter((o) => o.got < o.n);
    const trozos = pend.map((o) => { const n = o.n - o.got; return n + ' ' + missName(o, n); });
    let txt = 'Nivel ' + k.lv + '/' + NLV;
    if (trozos.length) {
      const lista = trozos.length > 1 ? trozos.slice(0, -1).join(', ') + ' y ' + trozos[trozos.length - 1] : trozos[0];
      const cerca = pend.every((o) => o.n - o.got <= Math.max(2, Math.ceil(o.n * 0.12)));
      const uno = trozos.length === 1 && pend[0].n - pend[0].got === 1;
      txt += '<br>' + (cerca ? '¡Por poco! ' : '') + (uno ? 'Te faltaba ' : 'Te faltaban ') + lista;
    }
    k.lose(CFG.id, LS.score, 'Sin movimientos', txt);
  }

  /* ---------------- entrada ---------------- */
  const inB = (p) => !!p && p[0] >= 0 && p[1] >= 0 && p[0] < LS.w && p[1] < LS.h && !LS.bl[p[1]][p[0]];
  const cellAt = (X, Y) => [Math.floor((X - BX) / CS), Math.floor((Y - BY) / CS)];
  function tryMove(a, bb) {
    if (!inB(a) || !inB(bb)) return;
    if (Math.abs(a[0] - bb[0]) + Math.abs(a[1] - bb[1]) !== 1) return;
    selL = null; hintL = null; idleT = 0;
    if (M3.valid(LS, a[0], a[1], bb[0], bb[1])) { A = { t: 'swap', time: 0, dur: 0.16, a: a, b: bb }; k.sfx('click'); }
    else { A = { t: 'bad', time: 0, dur: 0.3, a: a, b: bb }; k.sfx('hit'); }
  }
  function afterAnim(a) {
    if (a.then) { if (a.t === 'charge') fireClear(a.ev); A = a.then; return; }
    if (a.t === 'fall') landFx();
    pops = [];
    if (a.t === 'swap') { M3.doSwap(LS, a.a[0], a.a[1], a.b[0], a.b[1]); idleOn = false; }
  }

  function reset() { load(k.lv || 1); }
  k.onSize = () => { layout(); };
  k.onDif = () => { if (k.st !== 'play') reset(); };
  k.levels(NLV, { start: (i) => { load(i); if (k.st === 'play') k.st = 'over'; } });
  reset();
  k.show(CFG.title, 'Alinea tres o más gemas. Cada nivel pide algo distinto y tiene los movimientos contados. ' + NLV + ' niveles y ' + (NLV * 3) + ' estrellas que coleccionar: llevas ' + k.starsTotal() + '.');

  k.run((dt) => {
    if (cmbT > 0) cmbT -= dt; if (noteT > 0) noteT -= dt; if (introT > 0) introT -= dt;
    if (bt) for (let y = 0; y < bt.length; y++) for (let x = 0; x < bt[y].length; x++) if (bt[y][x] > 0) bt[y][x] -= dt;
    if (!k.gate(reset)) return;
    if (introT > 0 && k.ptr.hit) introT = Math.min(introT, 0.35);
    /* Celebración pequeña al ganar una estrella durante la partida (GANCHO §B11) */
    if (LS) { const s2 = M3.stars(LS); if (s2 > seenSt) { seenSt = s2; k.reward(s2 === 3 ? '3 ESTRELLAS' : '2 ESTRELLAS', '#ffd23d'); k.sfx('win'); k.confetti('#ffd23d', 26); } }
    mvPulse = LS && LS.mv <= 5 ? mvPulse + dt : 0;
    if (A) { A.time += dt; if (A.time >= A.dur) { const a = A; A = null; afterAnim(a); } return; }
    if (!idleOn) { stepOnce(); return; }
    /* ---- inactivo: manda el jugador ---- */
    if (k.ptr.hit) { const s0 = cellAt(k.ptr.sx, k.ptr.sy); dragL = inB(s0) ? { s0: s0, done: false } : null; kbdL = false; }
    const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy, far = Math.hypot(dx, dy) > Math.max(14, CS * 0.35);
    if (dragL && !dragL.done && (k.ptr.down || k.ptr.up) && far) {
      dragL.done = true;
      queuedL = [dragL.s0, Math.abs(dx) > Math.abs(dy) ? [dragL.s0[0] + Math.sign(dx), dragL.s0[1]] : [dragL.s0[0], dragL.s0[1] + Math.sign(dy)]];
    }
    if (queuedL) { const q = queuedL; queuedL = null; tryMove(q[0], q[1]); return; }
    if (dragL && !dragL.done && k.ptr.up) {
      const s0 = dragL.s0;
      if (selL && Math.abs(selL[0] - s0[0]) + Math.abs(selL[1] - s0[1]) === 1) tryMove(selL, s0);
      else { selL = selL && selL[0] === s0[0] && selL[1] === s0[1] ? null : s0; k.sfx('click'); }
    }
    if (k.ptr.up) dragL = null;
    const DV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const d in DV) if (k.hit.has(d)) {
      kbdL = true; const nx = [k.clamp(curL[0] + DV[d][0], 0, LS.w - 1), k.clamp(curL[1] + DV[d][1], 0, LS.h - 1)];
      if (selL) { tryMove(selL, [selL[0] + DV[d][0], selL[1] + DV[d][1]]); curL = nx; return; }
      curL = nx;
    }
    if (k.hit.has('a')) { kbdL = true; selL = selL ? null : [curL[0], curL[1]]; k.sfx('click'); }
    idleT += dt; if (idleT > (k.dif === 0 ? 3 : k.dif === 2 ? 7 : 5) && !hintL) hintL = M3.findMove(LS);
  }, () => {
    if (!LS) return;
    if (!bgL) bgL = makeBg();
    if (!bdL) bdL = makeBoard();
    const t = performance.now() / 1000;
    c.drawImage(bgL, 0, 0, k.W, k.H);
    /* ---- fondo vivo: dos auroras que se pasean y polvo que sube (todo cacheado) ---- */
    const au = Math.max(k.W, k.H) * 0.9;
    c.drawImage(aurora(0), k.W * 0.5 + Math.sin(t * 0.09) * k.W * 0.34 - au / 2, k.H * 0.34 + Math.cos(t * 0.07) * k.H * 0.16 - au / 2, au, au);
    c.drawImage(aurora(1), k.W * 0.5 + Math.cos(t * 0.06 + 2) * k.W * 0.32 - au * 0.4, k.H * 0.68 + Math.sin(t * 0.05) * k.H * 0.14 - au * 0.4, au * 0.8, au * 0.8);
    const gl = glowSpr();
    for (let i = 0; i < MOTE.length; i++) {
      const m = MOTE[i], my = ((m.y - t * m.s) % 1 + 1) % 1, mx = (m.x + Math.sin(t * m.w + i) * 0.03) * k.W;
      c.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(t * 1.3 + i));
      c.drawImage(gl, mx - m.r, my * k.H - m.r, m.r * 2, m.r * 2);
    }
    c.globalAlpha = 1;
    if (bdL) c.drawImage(bdL, bdX, bdY, CS * LS.w + 28, CS * LS.h + 28);
    /* Todo lo que se mueve vive DENTRO del tablero: lo que cae asoma por el borde de arriba
       en vez de flotar sobre el fondo. */
    c.save(); c.beginPath(); c.rect(BX - 1, BY - 1, CS * LS.w + 2, CS * LS.h + 2); c.clip();
    const e = A ? ease(Math.min(1, A.time / A.dur)) : 0;
    const sh = A && A.t === 'shuffle' ? Math.sin(Math.min(1, A.time / A.dur) * Math.PI) : 0;
    /* gelatina bajo las gemas */
    for (let y = 0; y < LS.h; y++) for (let x = 0; x < LS.w; x++) {
      if (LS.bl[y][x] || LS.jl[y][x] <= 0) continue;
      const X = BX + x * CS, Y = BY + y * CS;
      c.fillStyle = LS.jl[y][x] > 1 ? 'rgba(178,72,232,.62)' : 'rgba(255,124,196,.5)';
      ART.rr(c, X + 2, Y + 2, CS - 4, CS - 4, Math.max(4, CS * 0.16)); c.fill();
      if (LS.jl[y][x] > 1) { c.fillStyle = 'rgba(255,255,255,.16)'; ART.rr(c, X + 6, Y + 6, CS - 12, CS - 12, Math.max(3, CS * 0.12)); c.fill(); }
    }
    /* sq = aplastamiento al aterrizar (1 = nada). Las piezas cargadas laten y llevan brillo:
       un especial se lee de un vistazo aunque la gema sea del mismo color. */
    const drawPiece = (v, sp, X, Y, sc, sq) => {
      const d = CS * sc, q = sq || 1, dw = d * (2 - q), dh = d * q, x0 = X - dw / 2, y0 = Y + d / 2 - dh;
      if (sp || v === WD) {
        const pl = 0.55 + 0.45 * Math.sin(t * 6 + X * 0.05), r2 = d * (0.62 + 0.08 * pl);
        c.globalAlpha = 0.28 + 0.3 * pl; c.drawImage(glowSpr(), X - r2, Y - r2, r2 * 2, r2 * 2); c.globalAlpha = 1;
      }
      if (v === CH) c.drawImage(chestSpr(), x0, y0, dw, dh);
      else if (v === CG) c.drawImage(cageSpr(), x0, y0, dw, dh);
      else if (v === WD) c.drawImage(spSpr(0, M3.WSP), x0, y0, dw, dh);
      else if (v >= 0) c.drawImage(sp ? spSpr(v, sp) : gemSprite(v, true), x0, y0, dw, dh);
    };
    const swapPos = (x, y) => {
      if (!A || (A.t !== 'swap' && A.t !== 'bad')) return null;
      const p = Math.min(1, A.time / A.dur), f = A.t === 'bad' ? Math.sin(p * Math.PI) * 0.55 : (p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p));
      const a = A.a, bb = A.b;
      if (x === a[0] && y === a[1]) return [cxp(a[0]) + (cxp(bb[0]) - cxp(a[0])) * f, cyp(a[1]) + (cyp(bb[1]) - cyp(a[1])) * f];
      if (x === bb[0] && y === bb[1]) return [cxp(bb[0]) + (cxp(a[0]) - cxp(bb[0])) * f, cyp(bb[1]) + (cyp(a[1]) - cyp(bb[1])) * f];
      return null;
    };
    for (let y = 0; y < LS.h; y++) for (let x = 0; x < LS.w; x++) {
      if (LS.bl[y][x]) continue;
      const v = LS.c[y][x]; if (v === E) continue;
      let X = cxp(x), Y = cyp(y);
      if (A && A.t === 'fall' && fx[y] && fx[y][x]) Y += fx[y][x] * (1 - e);
      const sp2 = swapPos(x, y); if (sp2) { X = sp2[0]; Y = sp2[1]; }
      if (sh) { X += Math.sin((x * 3 + y * 5) * 1.7) * sh * CS * 0.22; Y += Math.cos((x * 5 + y * 3) * 1.3) * sh * CS * 0.22; }
      let s = 1, sq = 1;
      if (selL && selL[0] === x && selL[1] === y) s = 1.1 + Math.sin(t * 8) * 0.04;
      else if (hintL && ((hintL[0] === x && hintL[1] === y) || (hintL[2] === x && hintL[3] === y))) s = 1 + Math.abs(Math.sin(t * 5)) * 0.12;
      /* entrada: lo que nace arriba crece 0,7 → 1,12 → 1; aterrizaje: aplastamiento corto */
      if (A && A.t === 'fall' && nw[y] && nw[y][x]) s *= 0.7 + 0.42 * e - 0.12 * e * e;
      else if (bt[y] && bt[y][x] > 0) sq = 1 - 0.2 * Math.sin((bt[y][x] / 0.17) * Math.PI);
      drawPiece(v, LS.sp[y][x], X, Y, s, sq);
      if (LS.ice[y][x] > 0) {
        const bx = BX + x * CS, by = BY + y * CS, r = Math.max(4, CS * 0.15);
        c.fillStyle = 'rgba(200,238,255,.5)'; ART.rr(c, bx + 1.5, by + 1.5, CS - 3, CS - 3, r); c.fill();
        c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath();
        c.moveTo(bx + 4, by + CS * 0.62); c.lineTo(bx + CS * 0.44, by + 4); c.lineTo(bx + CS * 0.68, by + 4); c.lineTo(bx + 4, by + CS - 5); c.closePath(); c.fill();
        c.lineWidth = 2; c.strokeStyle = 'rgba(26,21,48,.35)'; ART.rr(c, bx + 1.5, by + 1.5, CS - 3, CS - 3, r); c.stroke();
      }
    }
    /* CARGA: antes de estallar, el especial crece y se pone blanco. Se ve venir el golpe. */
    if (A && A.t === 'charge') {
      const p = Math.min(1, A.time / A.dur);
      for (let q = 0; q < pops.length; q++) {
        const o = pops[q], X = cxp(o.x), Y = cyp(o.y);
        const sc = o.sp ? 1 + 0.34 * p : 1 - 0.06 * p;
        if (o.kind === 'cage') c.drawImage(cageSpr(), X - CS * sc / 2, Y - CS * sc / 2, CS * sc, CS * sc);
        else drawPiece(o.v, o.sp, X, Y, sc);
        if (o.sp) {
          const r2 = CS * (0.5 + 0.9 * p);
          c.globalAlpha = 0.5 * p; c.drawImage(glowSpr(), X - r2, Y - r2, r2 * 2, r2 * 2);
          c.globalAlpha = 0.55 * p * p; c.fillStyle = '#fff'; c.beginPath(); c.arc(X, Y, CS * 0.34 * sc, 0, 6.283); c.fill();
          c.globalAlpha = 1;
        }
      }
    }
    if (A && (A.t === 'clear' || A.t === 'chest')) {
      const p = Math.min(1, A.time / A.dur);
      for (let q = 0; q < pops.length; q++) {
        const o = pops[q], sc = 1 + 0.3 * Math.sin(p * Math.PI) - p * 0.95; if (sc <= 0) continue;
        const X = cxp(o.x), Y = cyp(o.y) - (o.kind === 'chest' ? p * CS * 0.5 : 0);
        if (o.kind === 'chest') c.drawImage(chestSpr(), X - CS * sc / 2, Y - CS * sc / 2, CS * sc, CS * sc);
        else if (o.kind === 'cage') c.drawImage(cageSpr(), X - CS * sc / 2, Y - CS * sc / 2, CS * sc, CS * sc);
        else drawPiece(o.v, o.sp, X, Y, sc);
        c.globalAlpha = Math.sin(p * Math.PI) * 0.75; c.fillStyle = '#fff'; c.beginPath(); c.arc(X, Y, CS * 0.36 * sc + 3, 0, 6.283); c.fill(); c.globalAlpha = 1;
      }
    }
    for (const p of [selL, kbdL ? curL : null]) if (p && !LS.bl[p[1]][p[0]]) {
      c.lineWidth = 3; c.strokeStyle = p === selL ? '#fff' : 'rgba(255,255,255,.5)';
      ART.rr(c, BX + p[0] * CS + 2, BY + p[1] * CS + 2, CS - 4, CS - 4, Math.max(4, CS * 0.16));
      if (p === selL) { c.fillStyle = 'rgba(255,255,255,.18)'; c.fill(); }
      c.stroke();
    }
    c.restore();
    if (cmbT > 0) {
      const al = Math.min(1, cmbT / 0.3), sc = 1 + Math.max(0, cmbT - 0.9) * 2;
      c.globalAlpha = al; label(cmbTxt, BX + CS * LS.w / 2, BY + CS * LS.h / 2 - 22, Math.round(Math.min(40, CS * 0.78) * sc), '#ff9ad5', 'center', 'middle'); c.globalAlpha = 1;
    }
    if (noteT > 0) { c.globalAlpha = Math.min(1, noteT / 0.4); label(noteTxt, BX + CS * LS.w / 2, BY + CS * LS.h / 2, Math.max(13, Math.min(20, CS * 0.4)), '#fff38a', 'center', 'middle'); c.globalAlpha = 1; }
    hud();
    intro();
  });

  /* ---------------- marcador ---------------- */
  function ico(o, X, Y, d) {
    if (o.t === 'color') c.drawImage(gemSprite(Math.min(LS.nc - 1, o.v)), X - d / 2, Y - d / 2, d, d);
    else if (o.t === 'chest') c.drawImage(chestSpr(), X - d / 2, Y - d / 2, d, d);
    else if (o.t === 'animal') c.drawImage(cageSpr(), X - d / 2, Y - d / 2, d, d);
    else if (o.t === 'ice') c.drawImage(iceIco(), X - d / 2, Y - d / 2, d, d);
    else c.drawImage(jellyIco(), X - d / 2, Y - d / 2, d, d);
  }
  const chipTxt = (o) => (o.got >= o.n ? '¡Ya!' : o.got + '/' + o.n);
  function chipW(o, h) { c.font = '800 ' + Math.round(h * 0.46) + 'px ui-rounded,"Trebuchet MS",sans-serif'; return h * 0.95 + c.measureText(chipTxt(o)).width + h * 0.42; }
  function chip(x, y, w, h, o) {
    const ok = o.got >= o.n;
    c.fillStyle = ok ? 'rgba(74,214,140,.24)' : 'rgba(0,0,0,.36)';
    ART.rr(c, x, y, w, h, h / 2); c.fill();
    c.lineWidth = 2; c.strokeStyle = ok ? '#68e0a0' : 'rgba(255,255,255,.2)'; c.stroke();
    ico(o, x + h * 0.52, y + h / 2, h * 0.78);
    label(chipTxt(o), x + h * 0.95, y + h / 2 + 1, Math.round(h * 0.46), ok ? '#c8ffe2' : '#fff', 'left', 'middle');
  }
  function wrap(txt, x, y, w, lh, bot) {
    const lim = (bot == null ? k.H : bot) - lh - 6;
    const words = String(txt || '').split(' '); let line = '', yy = y;
    for (let i = 0; i < words.length; i++) {
      const tst = line ? line + ' ' + words[i] : words[i];
      if (c.measureText(tst).width > w && line) { c.fillText(line, x, yy); yy += lh; line = words[i]; if (yy > lim) return; } else line = tst;
    }
    if (line) c.fillText(line, x, yy);
  }
  /* Barra de puntos con las tres marcas de estrella: en todo momento se ve qué falta para
     la siguiente (GANCHO §A1 y §A6). La 1ª se gana al superar el nivel, la 2ª y la 3ª por puntos. */
  function starBar(x, y, w, h) {
    const st = LS.st, top = Math.max(1, st[2] || 1), p = k.clamp(LS.score / top, 0, 1);
    c.fillStyle = 'rgba(8,4,20,.55)'; ART.rr(c, x, y, w, h, h / 2); c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.14)'; c.stroke();
    if (p > 0.01) {
      const fw = Math.max(h, w * p);
      c.fillStyle = LS.score >= st[2] ? '#ffd23d' : LS.score >= st[1] ? '#8ce0a8' : '#6e62f5';
      ART.rr(c, x, y, fw, h, h / 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.38)'; ART.rr(c, x + 3, y + 2.5, Math.max(4, fw - 6), h * 0.3, h * 0.15); c.fill();
    }
    const d = h * 1.9, got = M3.stars(LS);
    const px = [x + h * 0.55, x + k.clamp((st[1] || 0) / top, 0.12, 0.92) * w, x + w - h * 0.55];
    for (let i = 0; i < 3; i++) {
      const on = i === 0 ? true : (i === 1 ? LS.score >= st[1] : LS.score >= st[2]);
      const pop2 = on && got >= i + 1 ? 1 + 0.08 * Math.sin(performance.now() / 160 + i) : 1;
      c.drawImage(starIco(on), px[i] - d * pop2 / 2, y + h / 2 - d * pop2 / 2, d * pop2, d * pop2);
    }
  }
  function hud() {
    const t2 = performance.now() / 1000;
    const mvSz = LS.mv <= 5 ? 1 + 0.12 * Math.abs(Math.sin(t2 * 6)) : 1;
    if (side) {
      const x = PX + 18; let y = PY + 16;
      small('NIVEL', x, y); label(k.lv + '/' + NLV, x, y + 13, 24, '#fff'); y += 48;
      small('MOVIMIENTOS', x, y); label(String(LS.mv), x, y + 13, Math.round(28 * mvSz), LS.mv <= 5 ? '#ff6b7a' : '#ffd23d'); y += 52;
      small('OBJETIVOS', x, y); y += 17;
      const h = 30;
      for (let i = 0; i < LS.obj.length; i++) { chip(x, y, Math.min(PW - 36, chipW(LS.obj[i], h) + 8), h, LS.obj[i]); y += h + 7; }
      y += 8; small('PUNTOS', x, y); label(String(LS.score), x, y + 13, 22, '#fff');
      y += 42; starBar(x, y, PW - 36, 13); y += 34;
      if (PY + PH - y > 30) { c.font = '600 12px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = '#b6a6e0'; wrap(LV[k.lv - 1].i, x, y, PW - 36, 15, PY + PH - 6); }
      return;
    }
    /* franja superior: izquierda y derecha; el centro se deja libre para el botón de pausa */
    small('NIVEL', 14, 10); label(k.lv + '/' + NLV, 14, 22, 24, '#fff');
    small('MOVIMIENTOS', k.W - 14, 10, '#c9b8f0', 'right'); label(String(LS.mv), k.W - 14, 22, Math.round(26 * mvSz), LS.mv <= 5 ? '#ff6b7a' : '#ffd23d', 'right');
    const h = k.W < 400 ? 26 : 30, ws = LS.obj.map((o) => chipW(o, h) + 6);
    let tot = 0; for (let i = 0; i < ws.length; i++) tot += ws[i];
    tot += (ws.length - 1) * 6;
    let sx2 = Math.max(6, (k.W - tot) / 2), gap = 6;
    if (tot > k.W - 12) {
      gap = 3; const base = tot - (ws.length - 1) * 6, sc = (k.W - 12 - (ws.length - 1) * gap) / base;
      for (let i = 0; i < ws.length; i++) ws[i] = Math.max(h * 1.5, ws[i] * sc);
      sx2 = 6;
    }
    /* los objetivos bajan a pegarse al tablero: la meta se lee junto a la acción */
    const cy3 = Math.max(TOPH - h - 10, BY - h - 16);
    for (let i = 0; i < LS.obj.length; i++) { chip(sx2, cy3, ws[i], h, LS.obj[i]); sx2 += ws[i] + gap; }
    const bh = 13, by2 = Math.max(BY + CS * LS.h + 10, k.H - 40);
    /* El hueco entre el tablero y la barra no se deja vacío: ahí va lo que enseña el nivel. */
    const y0 = BY + CS * LS.h + 14, hueco = by2 - 20 - y0;
    const th = Math.min(76, hueco), ty = y0 + Math.max(0, (hueco - th) / 2);
    if (th >= 34) {
      c.fillStyle = 'rgba(0,0,0,.28)'; ART.rr(c, 14, ty, k.W - 28, th, 13); c.fill();
      c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.10)'; c.stroke();
      label(LV[k.lv - 1].n, k.W / 2, ty + 15, 15, '#ffd23d', 'center', 'middle');
      c.font = '600 12px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = '#b6a6e0';
      if (th >= 46) wrap(LV[k.lv - 1].i, k.W / 2, ty + 26, k.W - 40, 14, ty + th);
    }
    if (by2 + bh < k.H) { small('PUNTOS ' + LS.score, 14, by2 - 15); starBar(14, by2, k.W - 28, bh); }
  }
  /* Tarjeta de entrada del nivel: nombre y la idea que enseña. Se va sola en 2,9 s o al tocar.
     «¿Se ve qué se gana en el siguiente?» (GANCHO §C). */
  function intro() {
    if (introT <= 0 || k.st !== 'play') return;
    const a = Math.min(1, introT / 0.5) * Math.min(1, (2.9 - introT) / 0.22);
    const lv = LV[k.lv - 1], wd = Math.min(k.W - 36, 420), x = (k.W - wd) / 2;
    const cy2 = side ? BY + CS * LS.h / 2 : BY + CS * LS.h / 2;
    c.font = '600 13px ui-rounded,"Trebuchet MS",sans-serif';
    const words = String(lv.i || '').split(' '); let ln = 1, line = '';
    for (let i = 0; i < words.length; i++) { const tst = line ? line + ' ' + words[i] : words[i]; if (c.measureText(tst).width > wd - 34 && line) { ln++; line = words[i]; } else line = tst; }
    const hh = 58 + ln * 17, y = cy2 - hh / 2;
    c.globalAlpha = a;
    c.fillStyle = 'rgba(12,7,28,.88)'; ART.rr(c, x, y + 5, wd, hh, 16); c.fill();
    ART.rr(c, x, y, wd, hh, 16); ART.fillOut(c, '#6e62f5', 3);
    label('Nivel ' + k.lv + ' · ' + lv.n, k.W / 2, y + 22, 19, '#ffd23d', 'center', 'middle');
    c.font = '600 13px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = '#d7cbf6';
    wrap(lv.i, k.W / 2, y + 38, wd - 34, 17, y + hh);
    c.globalAlpha = 1;
  }
  window.LG = { get S() { return LS; }, get busy() { return !!A || !idleOn; }, load: load, move: tryMove, M3: M3, LV: LV };
})();
