/* Match-3. CFG.mode: 'moves' | 'time'
 * Gemas facetadas con forma y color distintos (accesible), intercambio animado, retirada con destello,
 * caída con rebote, cascadas en combo con texto y partículas, pista tras unos segundos quieto y control con teclado. */
const W = 480, H = 640, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#1d1538' }), c = k.ctx, N = 8, S = 56, OX = 16, OY = 146;
const GEM = ['#ff4d6d', '#ffd23d', '#4fe08a', '#4cc3ff', '#b77cff', '#ff9a3d'];
const TIMED = CFG.mode === 'time';
let queued = null, b, off, vel, sel, score, moves, target, level, time, busy, combo, clearing, swapA, check, cur, kbd, idle, hint, prevT, comboT, comboTxt, lvlT;
function rnd() { return k.ri(0, 5); }
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
function reset() { score = 0; level = 1; moves = 30; target = 650; prevT = 0; time = 135; combo = 0; fill(); sel = null; clearing = null; swapA = null; check = true; cur = [3, 3]; kbd = false; idle = 0; hint = null; comboT = 0; lvlT = 0; queued = null; }

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
const gemCv = [];
function gemSprite(v) {
  if (gemCv[v]) return gemCv[v];
  const cv = document.createElement('canvas'); cv.width = cv.height = S * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(S / 2, S / 2);
  const V = shape(v), col = GEM[v], I = V.map(([x, y]) => [x * 0.5, y * 0.5 - 2]);
  const poly = (pts) => { g.beginPath(); pts.forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); };
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 22, 18, 5, 0, 0, 6.283); g.fill();
  poly(V); g.fillStyle = col; g.fill();
  for (let i = 0; i < V.length; i++) { const j = (i + 1) % V.length, mx = (V[i][0] + V[j][0]) / 2, my = (V[i][1] + V[j][1]) / 2, l = Math.cos(Math.atan2(my, mx) + 2.2);
    poly([V[i], V[j], I[j], I[i]]); g.fillStyle = l > 0 ? `rgba(255,255,255,${0.35 * l})` : `rgba(20,10,40,${-0.35 * l})`; g.fill(); }
  poly(I); const gr = g.createLinearGradient(0, -12, 0, 10); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,.1)'); g.fillStyle = gr; g.fill();
  poly(V); g.lineJoin = 'round'; g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); const hx = -8, hy = -11; g.moveTo(hx, hy - 5); g.quadraticCurveTo(hx, hy, hx + 5, hy); g.quadraticCurveTo(hx, hy, hx, hy + 5); g.quadraticCurveTo(hx, hy, hx - 5, hy); g.quadraticCurveTo(hx, hy, hx, hy - 5); g.fill();
  return (gemCv[v] = cv);
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

reset(); k.show(CFG.title, TIMED ? 'Haz todas las combinaciones que puedas en 135 segundos. Desliza o toca dos gemas vecinas.' : 'Consigue los puntos objetivo antes de quedarte sin movimientos. Desliza o toca dos gemas vecinas.');
let drag = null;
function trySwap(a, bb) {
  if (!bb || bb[0] < 0 || bb[1] < 0 || bb[0] >= N || bb[1] >= N) return;
  swap(a[0], a[1], bb[0], bb[1]); swapA = { a, b: bb, t: 0, back: false }; if (!TIMED) moves--; sel = null; idle = 0; hint = null; k.sfx('click');
}
k.run((dt) => {
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
  if (!TIMED) { if (score >= target) { level++; prevT = target; target = score + Math.min(2600, 650 + 220 * (level - 1)); moves = 30; /* 1.23: más fácil */ lvlT = 1.6; k.sfx('win'); k.confetti(); }
    else if (moves <= 0) return k.lose(CFG.id, score, 'Sin movimientos', `Nivel ${level}`); }
  idle += dt; if (idle > 4 && !hint) hint = findMove();
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
  const pr = TIMED ? time / 135 : k.clamp((score - prevT) / (target - prevT), 0, 1), bw = (W - 54) * pr;
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
  if (lvlT > 0) { c.globalAlpha = Math.min(1, lvlT / 0.3); label(`¡Nivel ${level}!`, W / 2, OY + N * S / 2 + 50, 40, '#ffd23d', 'center', 'middle'); label('30 movimientos', W / 2, OY + N * S / 2 + 86, 18, '#fff', 'center', 'middle'); c.globalAlpha = 1; }
});
