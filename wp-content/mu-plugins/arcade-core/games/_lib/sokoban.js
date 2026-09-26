/* Sokoban (mode 'push': generado por retroceso, siempre resoluble) e Ice (mode 'ice': deslizar hasta la salida, BFS garantiza solución)
 * Arte propio: almacén de losetas con muros de ladrillo y cajas de madera / pista de hielo con rocas nevadas. Movimiento interpolado. */
const M = CFG.mode, ICE = M === 'ice', W = 480, H = 540, OUT = ART.OUT, R2 = 6.2832;
const k = Kit({ w: W, h: H, title: CFG.title, bg: ICE ? '#16304d' : '#1b1a2e' }), c = k.ctx;
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
const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
let N, wall, goals, boxes, pl, level, moves, hist, exitC, total, par, init;
let S, OX, OY, boardCv, bgCv, pr, boxR, face = 1, walkT = 0, t = 0, queued = null, holdT = 0, bump = null, trail = [], winT = 0, winStars = 0, pushT = 0;
const K = (x, y) => x + ',' + y, rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function genPush() {
  /* Dificultad: fácil una caja menos y menos revuelto; difícil una más. */
  N = 7 + Math.min(3, Math.floor(level / 4)); const nb = k.clamp(Math.min(5, 1 + Math.floor(level / 3)) + (k.dif === 0 ? -1 : k.dif === 2 ? 1 : 0), 1, 6);
  for (let tries = 0; tries < 200; tries++) {
    wall = new Set(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (x === 0 || y === 0 || x === N - 1 || y === N - 1 || Math.random() < 0.12) wall.add(K(x, y));
    const free = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (!wall.has(K(x, y))) free.push([x, y]); if (free.length < nb + 6) continue;
    k.shuffle(free); goals = free.slice(0, nb); boxes = goals.map((g) => [...g]); pl = [...free[nb]];
    // retroceso: el jugador camina y "tira" de las cajas; cada tirón es un empuje válido al revés
    for (let i = 0, nw = Math.min(400 + level * 60, 60 + level * 70); i < Math.round(nw * (k.dif === 0 ? 0.7 : k.dif === 2 ? 1.3 : 1)); i++) { /* pocos pasos al principio → cajas cerca de sus marcas */ const d = D[k.pick(Object.keys(D))], nx = pl[0] + d[0], ny = pl[1] + d[1]; if (wall.has(K(nx, ny)) || boxes.some((b) => b[0] === nx && b[1] === ny)) continue;
      const behind = boxes.find((b) => b[0] === pl[0] - d[0] && b[1] === pl[1] - d[1]); const pull = behind && Math.random() < 0.7; const op = [...pl]; pl = [nx, ny]; if (pull) { behind[0] = op[0]; behind[1] = op[1]; } }
    const onGoal = boxes.filter((b) => goals.some((g) => g[0] === b[0] && g[1] === b[1])).length; if (onGoal <= Math.max(0, nb - 2) && onGoal < nb) return;
  }
}
function slideEnd(x, y, d) { while (true) { const nx = x + d[0], ny = y + d[1]; if (wall.has(K(nx, ny))) return [x, y]; x = nx; y = ny; if (x === exitC[0] && y === exitC[1]) return [x, y]; } }
function genIce() {
  N = 9 + Math.min(4, Math.floor(level / 3));
  for (let tries = 0; tries < 400; tries++) {
    wall = new Set(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (x === 0 || y === 0 || x === N - 1 || y === N - 1 || Math.random() < 0.13) wall.add(K(x, y));
    pl = [k.ri(1, N - 2), k.ri(1, N - 2)]; if (wall.has(K(...pl))) continue; exitC = [k.ri(1, N - 2), k.ri(1, N - 2)]; if (wall.has(K(...exitC))) continue;
    const seen = new Map([[K(...pl), 0]]), q = [pl]; let found = -1;
    while (q.length) { const cur = q.shift(), dd = seen.get(K(...cur)); if (cur[0] === exitC[0] && cur[1] === exitC[1]) { found = dd; break; } for (const d of Object.values(D)) { const e = slideEnd(cur[0], cur[1], d), ke = K(...e); if (!seen.has(ke)) { seen.set(ke, dd + 1); q.push(e); } } }
    if (found >= Math.max(2, Math.round(Math.min(9, 1 + Math.ceil(level * 2 / 3)) * (k.dif === 0 ? 0.7 : k.dif === 2 ? 1.4 : 1))) && (level >= 8 || found <= 3 + level * 2 || tries > 300)) { par = found; return; } /* nivel 1: 2-5 deslizamientos */
  }
}
function build() {
  moves = 0; hist = []; goals = []; boxes = []; winT = 0; queued = null; trail = [];
  if (M === 'push') genPush(); else genIce();
  init = JSON.stringify([pl, boxes]); snapR();
  S = Math.floor(Math.min(460, 432) / N); OX = Math.floor((W - S * N) / 2); OY = 58 + Math.floor((432 - S * N) / 2); boardCv = renderBoard();
}
function snapR() { pr = [...pl]; boxR = boxes.map((b) => [...b]); }
function reset() { level = 1; total = 0; build(); }
k.onDif = () => { if (k.st !== 'play') reset(); };
reset(); k.show(CFG.title, M === 'push' ? 'Empuja todas las cajas a las marcas. Desliza, toca hacia donde ir o usa las flechas. B = deshacer.' : 'Sobre el hielo resbalas hasta chocar. Llega a la bandera con los mínimos movimientos. B = reiniciar.');

/* ---------- Lógica ---------- */
const onG = (b) => goals.some((g) => g[0] === b[0] && g[1] === b[1]);
function move(dn) {
  const d = D[dn]; if (d[0]) face = d[0];
  if (ICE) { const e = slideEnd(pl[0], pl[1], d); if (e[0] === pl[0] && e[1] === pl[1]) { bump = { d, t: 0.18 }; k.sfx('hit'); return; } pl = e; moves++; k.sfx('jump'); return; }
  const nx = pl[0] + d[0], ny = pl[1] + d[1]; if (wall.has(K(nx, ny))) { bump = { d, t: 0.15 }; return; }
  const b = boxes.find((q) => q[0] === nx && q[1] === ny);
  if (b) { const bx = nx + d[0], by = ny + d[1]; if (wall.has(K(bx, by)) || boxes.some((q) => q[0] === bx && q[1] === by)) { bump = { d, t: 0.15 }; k.sfx('hit'); return; }
    hist.push(JSON.stringify([pl, boxes])); const was = onG(b); b[0] = bx; b[1] = by; pushT = 0.25;
    if (onG(b) && !was) { const X = OX + (bx + 0.5) * S, Y = OY + (by + 0.5) * S; k.burst(X, Y, '#ffd23d', 14, 120); k.float('+', X, Y - S * 0.4, '#ffd23d'); k.sfx('coin'); } else k.sfx('pop');
  } else { hist.push(JSON.stringify([pl, boxes])); k.sfx('click'); }
  pl = [nx, ny]; moves++;
}
// caja fuera de marca en una esquina de muros: ya no se puede resolver
function stuck() { const w = (x, y) => wall.has(K(x, y)); return boxes.some((q) => !onG(q) && (w(q[0] - 1, q[1]) || w(q[0] + 1, q[1])) && (w(q[0], q[1] - 1) || w(q[0], q[1] + 1))); }
function solved() { return ICE ? pl[0] === exitC[0] && pl[1] === exitC[1] : boxes.every(onG); }
function win() {
  const gain = Math.max(50, 400 - moves * (ICE ? 25 : 5)) * level; total += gain; winT = 1.6; k.best(CFG.id, total);
  winStars = ICE ? (moves <= par ? 3 : moves <= par + 2 ? 2 : 1) : 3; k.sfx('win'); k.confetti(); k.float('+' + gain, W / 2, H / 2 + 90, '#ffd23d');
}
function undo() { if (!ICE && hist.length) { const [p2, b2] = JSON.parse(hist.pop()); pl = p2; boxes = b2; moves++; k.sfx('click'); } }
function restart() { if (ICE) { pl = JSON.parse(init)[0]; pr = [...pl]; trail = []; moves = 0; } else { const [p2, b2] = JSON.parse(init); if (moves) hist.push(JSON.stringify([pl, boxes])); pl = p2; boxes = b2; moves++; } k.sfx('pop'); }
const BTN = ICE ? [['restart', W / 2 - 80, 160]] : [['undo', W / 2 - 170, 160], ['restart', W / 2 + 10, 160]];
const BY = 498, BH = 36;
function btnAt(x, y) { if (y < BY || y > BY + BH) return null; const b = BTN.find((q) => x > q[1] && x < q[1] + q[2]); return b ? b[0] : null; }
const moving = () => Math.abs(pr[0] - pl[0]) + Math.abs(pr[1] - pl[1]) > 0.02;

k.run((dt) => {
  if (!k.gate(reset)) return; t += dt;
  // interpolación del jugador y las cajas
  const sp = (ICE ? 17 : 11) * dt; const was = moving();
  pr[0] += k.clamp(pl[0] - pr[0], -sp, sp); pr[1] += k.clamp(pl[1] - pr[1], -sp, sp);
  if (was) { walkT += dt; if (ICE && Math.random() < 0.7) trail.push({ x: pr[0], y: pr[1], l: 0.5 }); }
  if (ICE && was && !moving()) { k.shake(3); k.sfx('hit'); }
  if (boxR.length !== boxes.length) boxR = boxes.map((b) => [...b]);
  boxes.forEach((b, i) => { const r = boxR[i], s2 = 11 * dt; r[0] += k.clamp(b[0] - r[0], -s2, s2); r[1] += k.clamp(b[1] - r[1], -s2, s2); });
  for (const q of trail) q.l -= dt; trail = trail.filter((q) => q.l > 0);
  if (bump) { bump.t -= dt; if (bump.t <= 0) bump = null; } if (pushT > 0) pushT -= dt;
  if (winT > 0) { winT -= dt; if (winT <= 0) { level++; build(); } return; }
  if (!moving() && solved()) { win(); return; }
  // entrada
  let d = k.swipe || ['up', 'down', 'left', 'right'].find((q) => k.hit.has(q));
  if (!d && k.tap) { const b = btnAt(k.ptr.x, k.ptr.y); if (b === 'undo') undo(); else if (b === 'restart') restart();
    else if (k.ptr.y < BY - 4) { const dx = k.ptr.x - (OX + (pl[0] + 0.5) * S), dy = k.ptr.y - (OY + (pl[1] + 0.5) * S); if (Math.max(Math.abs(dx), Math.abs(dy)) > S * 0.5) d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); } }
  const hd = ['up', 'down', 'left', 'right'].find((q) => k.held.has(q)); if (hd) holdT += dt; else holdT = 0;
  if (!d && hd && holdT > 0.22 && !moving()) d = hd; // repetición al mantener la tecla
  if (k.hit.has('b')) { if (ICE) restart(); else undo(); }
  if (d) queued = d;
  if (queued && (!ICE || !moving()) && (ICE || Math.abs(pr[0] - pl[0]) + Math.abs(pr[1] - pl[1]) < 0.5)) { const q = queued; queued = null; move(q); }
}, draw);

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function renderBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, ICE ? '#2a5a88' : '#2b2745'); gr.addColorStop(1, ICE ? '#10263f' : '#141224'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (ICE) { g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 70; i++) { g.globalAlpha = 0.2 + rnd(i) * 0.5; g.beginPath(); g.arc(rnd(i + 3) * W, rnd(i + 7) * H, 0.8 + rnd(i + 9) * 1.8, 0, R2); g.fill(); } g.globalAlpha = 1; }
  else { g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1; for (let y = 0; y < H; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (y / 24) % 2 ? 0 : 24; x < W; x += 48) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 24); g.stroke(); } } }
  return cv;
}
function renderBoard() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const isW = (x, y) => x < 0 || y < 0 || x >= N || y >= N || wall.has(K(x, y));
  // sombra del tablero
  g.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(g, OX - 2, OY + 6, S * N + 4, S * N + 4, 10); g.fill();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (isW(x, y)) continue; const X = OX + x * S, Y = OY + y * S, r = rnd(x * 31 + y * 7 + level);
    if (ICE) { g.fillStyle = (x + y) % 2 ? '#c9ecff' : '#b8e2fb'; g.fillRect(X, Y, S, S); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X + S * (0.15 + r * 0.3), Y + S * 0.7); g.lineTo(X + S * (0.45 + r * 0.3), Y + S * 0.3); g.stroke();
      g.fillStyle = 'rgba(90,150,200,.18)'; g.fillRect(X, Y + S - 2, S, 2); }
    else { g.fillStyle = '#8a7a64'; g.fillRect(X, Y, S, S); ART.rr(g, X + 1.5, Y + 1.5, S - 3, S - 3, 4); g.fillStyle = r < 0.5 ? '#c4b196' : '#bcaa8e'; g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(X + 3, Y + 3, S - 6, 2);
      g.fillStyle = 'rgba(90,70,50,.18)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(X + 6 + rnd(r * 90 + i) * (S - 12), Y + 6 + rnd(r * 40 + i * 3) * (S - 12), 1.2, 0, R2); g.fill(); } }
    if (isW(x, y - 1)) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(X, Y, S, S * 0.16); } // sombra del muro de arriba
  }
  // objetivos pintados en el suelo
  for (const q of goals) { const X = OX + (q[0] + 0.5) * S, Y = OY + (q[1] + 0.5) * S; g.strokeStyle = '#e0a31a'; g.lineWidth = 3; g.setLineDash([S * 0.12, S * 0.08]); ART.rr(g, X - S * 0.36, Y - S * 0.36, S * 0.72, S * 0.72, 5); g.stroke(); g.setLineDash([]);
    g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(X - S * 0.14, Y - S * 0.14); g.lineTo(X + S * 0.14, Y + S * 0.14); g.moveTo(X + S * 0.14, Y - S * 0.14); g.lineTo(X - S * 0.14, Y + S * 0.14); g.stroke(); }
  if (ICE) { const X = OX + exitC[0] * S, Y = OY + exitC[1] * S; g.fillStyle = 'rgba(124,247,160,.35)'; g.beginPath(); g.ellipse(X + S / 2, Y + S * 0.62, S * 0.42, S * 0.28, 0, 0, R2); g.fill(); g.strokeStyle = '#3fbf6a'; g.lineWidth = 2; g.stroke(); }
  // muros en relieve: cara superior + cara frontal si abajo hay suelo
  const fd = Math.max(5, S * 0.2);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!isW(x, y)) continue; const X = OX + x * S, Y = OY + y * S, front = !isW(x, y + 1) && y < N - 1, th = front ? S - fd : S;
    if (ICE) { g.fillStyle = '#5f7ba3'; g.fillRect(X, Y, S, S); g.fillStyle = '#9fbde0'; g.fillRect(X, Y, S, th); g.strokeStyle = 'rgba(60,90,130,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X + S * (0.2 + rnd(x + y * 5) * 0.5), Y + th); g.lineTo(X + S * 0.5, Y + th * 0.55); g.lineTo(X + S * 0.85, Y + th * 0.7); g.stroke();
      g.fillStyle = '#f4fbff'; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + S, Y); g.lineTo(X + S, Y + th * 0.3); for (let i = 4; i >= 0; i--) g.lineTo(X + i * S / 4, Y + th * (0.3 + (i % 2) * 0.14 + rnd(x * 3 + y + i) * 0.1)); g.fill();
      if (front) { g.fillStyle = '#56709a'; g.fillRect(X, Y + th, S, fd); g.fillStyle = '#d6ecff'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(X + i * S / 3 + 2, Y + th); g.lineTo(X + i * S / 3 + S / 6, Y + th + fd * 0.8); g.lineTo(X + (i + 1) * S / 3 - 2, Y + th); g.fill(); } } }
    else { g.fillStyle = '#6e3530'; g.fillRect(X, Y, S, S); g.fillStyle = '#b0584c'; g.fillRect(X, Y, S, th); g.strokeStyle = '#8a4038'; g.lineWidth = 1.5; const rh = th / 2;
      for (let r = 0; r < 2; r++) { g.beginPath(); g.moveTo(X, Y + r * rh + rh); g.lineTo(X + S, Y + r * rh + rh); g.stroke(); const bx = X + (r % 2 ? S / 2 : S / 4 + ((x + y) % 2) * S / 2); g.beginPath(); g.moveTo(bx, Y + r * rh); g.lineTo(bx, Y + r * rh + rh); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(X, Y, S, 2);
      if (front) { g.fillStyle = '#7e3d35'; g.fillRect(X, Y + th, S, fd); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(X, Y + S - 2, S, 2); } }
  }
  // contorno de la masa de muros
  g.strokeStyle = OUT; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!isW(x, y)) continue; const X = OX + x * S, Y = OY + y * S;
    if (!isW(x, y - 1) || y === 0) { g.moveTo(X, Y); g.lineTo(X + S, Y); } if (!isW(x, y + 1) || y === N - 1) { g.moveTo(X, Y + S); g.lineTo(X + S, Y + S); }
    if (!isW(x - 1, y) || x === 0) { g.moveTo(X, Y); g.lineTo(X, Y + S); } if (!isW(x + 1, y) || x === N - 1) { g.moveTo(X + S, Y); g.lineTo(X + S, Y + S); } }
  g.stroke();
  return cv;
}
/* Caja: pieza única cacheada (R5 §8). El squash escala la imagen, no la redibuja. */
const crateCv = {};
function crateSprite(s, on) {
  const key = Math.round(s) + '|' + (on ? 1 : 0); let q = crateCv[key]; if (q) return q;
  const w = s * 0.84, pad = 6, d = Math.ceil((w + pad * 2) * CDPR);
  q = document.createElement('canvas'); q.width = q.height = d;
  const g = q.getContext('2d'); g.scale(d / (w + pad * 2), d / (w + pad * 2)); g.translate(pad, pad);
  const base = on ? '#e8b04a' : '#d0934e', b = s * 0.13;
  const body = (h) => ART.rr(h, 0, 0, w, w, s * 0.1), parts = [[body, base]];
  uni(g, parts, 1.5);
  celp(g, parts, base, s * 0.12, s * 0.12);
  inpath(g, parts, (h) => {
    h.fillStyle = ART.dark(base, 0.3); h.fillRect(b, b, w - 2 * b, w - 2 * b);
    h.fillStyle = base; for (let i = 0; i < 3; i++) h.fillRect(b + 1, b + i * (w - 2 * b) / 3 + 1, w - 2 * b - 2, (w - 2 * b) / 3 - 2);
    h.strokeStyle = ART.dark(base, 0.3); h.lineWidth = b * 0.9; h.beginPath(); h.moveTo(b, w - b); h.lineTo(w - b, b); h.stroke();
    h.strokeStyle = ART.lite(base, 0.12); h.lineWidth = b * 0.5; h.stroke();
    h.fillStyle = ART.dark(base, 0.55); for (const [ax, ay] of [[b / 2, b / 2], [w - b / 2, b / 2], [b / 2, w - b / 2], [w - b / 2, w - b / 2]]) { h.beginPath(); h.arc(ax, ay, 1.7, 0, R2); h.fill(); }
  });
  spec(g, w * 0.27, w * 0.16, w * 0.16, w * 0.055, -0.35, 0.5);
  if (on) { g.beginPath(); g.arc(w - s * 0.06, s * 0.06, s * 0.15, 0, R2); ART.fillOut(g, '#5fd37a', 2); g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(w - s * 0.13, s * 0.06); g.lineTo(w - s * 0.08, s * 0.11); g.lineTo(w + s * 0.01, 0); g.stroke(); }
  crateCv[key] = q; return q;
}
function crate(x, y, s, on, sq) {
  const w = s * (0.84 + sq), h = s * (0.84 - sq * 0.6), X = x - w / 2, Y = y + s * 0.42 - h;
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x, y + s * 0.4, w * 0.5, s * 0.1, 0, 0, R2); c.fill();
  const q = crateSprite(s, on), pad = 6, base = s * 0.84, f = (base + pad * 2) / base;
  c.drawImage(q, X - w * (f - 1) / 2, Y - h * (f - 1) / 2, w * f, h * f);
}
function btn(kind, x, w) {
  const pressed = k.ptr.down && btnAt(k.ptr.x, k.ptr.y) === kind, y = BY + (pressed ? 2 : 0);
  ART.rr(c, x, BY + 4, w, BH, 14); c.fillStyle = OUT; c.fill();
  ART.rr(c, x, y, w, BH, 14); ART.fillOut(c, kind === 'undo' ? '#6e62f5' : ICE ? '#3aa0d8' : '#e0795a', 2.5); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x + 12, y + 4, w - 24, 4);
  const ix = x + 26, iy = y + BH / 2; c.strokeStyle = '#fff'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
  if (kind === 'undo') { c.arc(ix + 2, iy + 2, 7, -Math.PI * 0.9, Math.PI * 0.5); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(ix - 9, iy - 4); c.lineTo(ix - 1, iy - 6); c.lineTo(ix - 6, iy + 2); c.fill(); }
  else { c.arc(ix, iy, 7, -Math.PI * 0.3, Math.PI * 1.5); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(ix + 3, iy - 11); c.lineTo(ix + 9, iy - 6); c.lineTo(ix + 2, iy - 3); c.fill(); }
  label(kind === 'undo' ? 'Deshacer' : 'Reiniciar', x + w / 2 + 12, y + 9, 16, '#fff', 'center');
}
function draw() {
  if (!bgCv) bgCv = renderBg(); c.drawImage(bgCv, 0, 0, W, H); c.drawImage(boardCv, 0, 0, W, H);
  const cx = (gx) => OX + (gx + 0.5) * S, cy = (gy) => OY + (gy + 0.5) * S;
  if (ICE) { // salida: bandera con brillo
    const X = cx(exitC[0]), Y = cy(exitC[1]); c.globalAlpha = 0.35 + Math.sin(t * 4) * 0.15; c.fillStyle = '#b6ffcc'; c.beginPath(); c.arc(X, Y + S * 0.12, S * 0.45, 0, R2); c.fill(); c.globalAlpha = 1;
    ART.flag(c, X - S * 0.15, Y + S * 0.34, t, '#7cf7a0', S * 0.8);
    for (const q of trail) { c.globalAlpha = q.l; c.fillStyle = '#fff'; c.beginPath(); c.arc(cx(q.x) + (rnd(q.l * 99) - 0.5) * S * 0.4, cy(q.y) + S * 0.3, 2 + q.l * 3, 0, R2); c.fill(); } c.globalAlpha = 1;
  }
  // entidades ordenadas por fila
  const ents = boxes.map((b, i) => ({ y: boxR[i] ? boxR[i][1] : b[1], i })).concat([{ y: pr[1] + 0.01, hero: 1 }]).sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (e.hero) { let hx = cx(pr[0]), hy = cy(pr[1]) + S * 0.4; if (bump) { hx += bump.d[0] * S * 0.12 * Math.sin(bump.t * 20); hy += bump.d[1] * S * 0.12 * Math.sin(bump.t * 20); }
      c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(hx, hy, S * 0.28, S * 0.09, 0, 0, R2); c.fill();
      const mv = moving(); ART.hero(c, hx, hy, S / 46, { face, state: mv ? (ICE ? 'jump' : 'run') : 'idle', t: t + walkT, col: ICE ? '#ff5f7a' : '#ffb13d', squash: pushT > 0 ? 0.08 : 0 }); }
    else { const r = boxR[e.i] || boxes[e.i], b = boxes[e.i], on = onG(b) && Math.abs(r[0] - b[0]) + Math.abs(r[1] - b[1]) < 0.05; crate(cx(r[0]), cy(r[1]), S, on, pushT > 0 && Math.abs(r[0] - b[0]) + Math.abs(r[1] - b[1]) > 0.05 ? 0.05 : 0); }
  }
  // HUD
  label(`Nivel ${level}`, 14, 10, 20, '#fff'); label(`Movs ${moves}`, 14, 34, 14, '#cfc8ff');
  label(`${total}`, W - 14, 10, 20, '#ffd23d', 'right');
  if (ICE) label(`Mínimo ${par}`, W - 14, 34, 14, '#b6ffcc', 'right'); else label(`Cajas ${boxes.filter(onG).length}/${boxes.length}`, W - 14, 34, 14, '#ffd9a0', 'right');
  for (const b of BTN) btn(b[0], b[1], b[2]);
  if (!ICE && !winT && !moving() && stuck()) { ART.rr(c, W / 2 - 130, BY - 34, 260, 28, 12); ART.fillOut(c, 'rgba(34,28,66,.92)', 2); label('Caja atascada: deshaz o reinicia', W / 2, BY - 28, 15, '#ffd23d', 'center'); }
  if (winT > 0) { const p = Math.min(1, (1.6 - winT) * 5), sc = p < 1 ? 0.6 + p * 0.5 - Math.sin(p * 3.14) * 0.1 : 1; c.save(); c.translate(W / 2, H / 2 - 20); c.scale(sc, sc);
    ART.rr(c, -150, -58, 300, 116, 22); ART.fillOut(c, 'rgba(34,28,66,.94)', 3); label('¡Nivel superado!', 0, -44, 28, '#7cf7a0', 'center');
    for (let i = 0; i < 3; i++) star(-44 + i * 44, 20, i < winStars ? 15 : 12, i < winStars && p > i * 0.3);
    c.restore(); }
}
function star(x, y, r, on) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); ART.fillOut(c, on ? '#ffd23d' : 'rgba(255,255,255,.18)', 2.5); }
