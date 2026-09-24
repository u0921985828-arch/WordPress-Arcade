/* Laser Mirrors: gira los espejos para llevar el láser al objetivo.
 * Generador: se traza primero el camino con espejos (solución garantizada) y luego se desordenan.
 * Emisor con carcasa, espejos enmarcados que giran animados, bloques de piedra, rayo con brillo y receptor que se ilumina. */
const W = 480, H = 560, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#0e1226' }), c = k.ctx;
let N, S, OX, OY = 112, grid, emit, target, level, done, beam, score, taps, cur, kbd, hitT, boardCv, sparkT;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
function reflect(d, m) { const [dx, dy] = DIRS[d]; const nd = m === 1 ? [-dy, -dx] : [dy, dx]; return DIRS.findIndex((q) => q[0] === nd[0] && q[1] === nd[1]); }
function trace() { const pts = [[emit.x, emit.y]]; let x = emit.x, y = emit.y, d = emit.d, hit = false, stop = 'edge'; for (let s = 0; s < 200; s++) { x += DIRS[d][0]; y += DIRS[d][1]; if (x < 0 || y < 0 || x >= N || y >= N) { pts.push([x, y]); break; } if (x === target[0] && y === target[1]) { pts.push([x, y]); hit = true; break; } const cell = grid[y][x]; if (cell.block) { pts.push([x, y]); stop = 'block'; break; } if (cell.m) { d = reflect(d, cell.m); pts.push([x, y]); } } return { pts, hit, d, stop }; }
function build() {
  N = Math.min(9, 5 + Math.floor(level / 2)); S = Math.floor(430 / (N + 0.8)); OX = Math.round((480 - (N + 0.8) * S) / 2 + 0.8 * S); done = false;
  for (let tries = 0; tries < 500; tries++) {
    grid = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ m: 0 }))); emit = { x: -1, y: k.ri(0, N - 1), d: 0 };
    let x = emit.x, y = emit.y, d = 0, turns = 0; const used = new Set(); let ok = false; const want = Math.min(6, 1 + level); /* nivel 1: 2 espejos en el camino */
    for (let s = 0; s < N * 4; s++) { x += DIRS[d][0]; y += DIRS[d][1]; if (x < 0 || y < 0 || x >= N || y >= N || used.has(x + ',' + y)) break; used.add(x + ',' + y);
      if (turns >= want && Math.random() < 0.4) { target = [x, y]; ok = true; break; }
      if (Math.random() < 0.35) { const nd = (d + (Math.random() < 0.5 ? 1 : 3)) % 4; const m = [1, 2].find((mm) => reflect(d, mm) === nd); grid[y][x].m = m; grid[y][x].fixed = true; d = nd; turns++; } }
    if (!ok) continue;
    for (let i = 0; i < Math.min(N, 1 + level); i++) { const rx = k.ri(0, N - 1), ry = k.ri(0, N - 1); if (!used.has(rx + ',' + ry) && !(rx === target[0] && ry === target[1])) { if (Math.random() < 0.5) grid[ry][rx].m = k.ri(1, 2); else grid[ry][rx].block = true; } }
    for (const row of grid) for (const cl of row) { if (cl.fixed) cl.sol = cl.m; if (cl.m && Math.random() < 0.6) cl.m = 3 - cl.m; }
    if (!trace().hit) break;
  }
  for (const row of grid) for (const cl of row) if (cl.m) { cl.ang = cl.m === 1 ? -Math.PI / 4 : Math.PI / 4; cl.a = cl.ang; cl.p = 0; }
  beam = trace(); taps = 0; hitT = 0; cur = [0, emit.y]; boardCv = null; sparkT = 0;
}
function reset() { if (!level) { level = 1; score = 0; } build(); }
function rotate(x, y) { const cl = grid[y] && grid[y][x]; if (!cl || !cl.m) return; cl.m = 3 - cl.m; cl.ang += Math.PI / 2; cl.p = 1; taps++; beam = trace(); k.sfx('click');
  if (beam.hit) { done = true; const bonus = Math.max(0, 50 - taps * 5); score += 100 * level + bonus; const rec = k.best(CFG.id, score); hitT = 0.001; const [tx, ty] = P(target); k.burst(tx, ty, '#7cf7a0', 24, 200); k.sfx('coin'); k.flash('rgba(124,247,160,.25)');
    setTimeout(() => { k.st = 'over'; k.show('¡Objetivo alcanzado!', `Nivel ${level} · ${taps} giros · ${score} puntos · Récord ${rec}<br>Toca para el siguiente`); level++; }, 900); } }
const P = ([x, y]) => [OX + x * S + S / 2, OY + y * S + S / 2];

/* ---------- Gráficos ---------- */
let bgCv;
function makeBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1f2750'); gr.addColorStop(1, '#0b0e1f'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,160,255,.05)'; g.lineWidth = 1; for (let i = 0; i < W + H; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i - H, H); g.stroke(); }
  const vg = g.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 420); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const hud = (x, w) => { g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, x, 16, w, 52, 14); g.fill(); ART.rr(g, x, 12, w, 52, 14); ART.fillOut(g, '#2e3a70', 3); };
  hud(14, 150); hud(W - 164, 150); return cv;
}
function makeBoard() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2); const B = N * S;
  g.fillStyle = 'rgba(0,0,0,.4)'; ART.rr(g, OX - 10, OY - 4, B + 20, B + 20, 14); g.fill();
  ART.rr(g, OX - 10, OY - 10, B + 20, B + 20, 14); ART.fillOut(g, '#4a5580', 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = OX + x * S, Y = OY + y * S;
    g.fillStyle = (x + y) % 2 ? '#262d52' : '#222949'; g.fillRect(X, Y, S, S); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.strokeRect(X + 0.75, Y + 0.75, S - 1.5, S - 1.5);
    g.fillStyle = 'rgba(255,255,255,.08)'; [[4, 4], [S - 6, 4], [4, S - 6], [S - 6, S - 6]].forEach(([a, b]) => g.fillRect(X + a, Y + b, 2, 2));
    const cl = grid[y][x];
    if (cl.block) { const m = S * 0.1; g.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(g, X + m, Y + m + 4, S - m * 2, S - m * 2, 7); g.fill(); ART.rr(g, X + m, Y + m, S - m * 2, S - m * 2, 7); ART.fillOut(g, '#6a6f93', 3);
      ART.rr(g, X + m + 4, Y + m + 4, S - m * 2 - 8, (S - m * 2) * 0.3, 4); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill();
      g.strokeStyle = 'rgba(26,21,48,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X + S * 0.3, Y + S * 0.55); g.lineTo(X + S * 0.45, Y + S * 0.65); g.lineTo(X + S * 0.42, Y + S * 0.78); g.moveTo(X + S * 0.62, Y + S * 0.3); g.lineTo(X + S * 0.7, Y + S * 0.42); g.stroke(); }
    if (cl.m) { const r = S * 0.4; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(X + S / 2, Y + S / 2 + 4, r, r * 0.9, 0, 0, 6.283); g.fill();
      g.beginPath(); g.arc(X + S / 2, Y + S / 2, r, 0, 6.283); ART.fillOut(g, '#3a4370', 2.5); g.beginPath(); g.arc(X + S / 2, Y + S / 2, r * 0.7, 0, 6.283); g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; g.stroke(); }
  }
  // emisor
  const ey = OY + emit.y * S + S / 2, ex = OX - 10; g.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(g, ex - S * 0.72, ey - S * 0.3 + 4, S * 0.72, S * 0.6, 8); g.fill();
  ART.rr(g, ex - S * 0.72, ey - S * 0.3, S * 0.72, S * 0.6, 8); ART.fillOut(g, '#c0c6e0', 3); ART.rr(g, ex - S * 0.66, ey - S * 0.24, S * 0.6, S * 0.14, 4); g.fillStyle = 'rgba(255,255,255,.5)'; g.fill();
  g.fillStyle = OUT; g.fillRect(ex - S * 0.6, ey + S * 0.02, S * 0.4, 3); g.fillRect(ex - S * 0.6, ey + S * 0.1, S * 0.4, 3);
  ART.rr(g, ex - 6, ey - S * 0.16, 14, S * 0.32, 4); ART.fillOut(g, '#8a90b0', 2.5);
  return cv;
}
function label(s, x, y, size, col, align, base) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }

reset(); k.show(CFG.title, 'Toca los espejos para girarlos y guía el láser hasta el receptor verde. Teclado: flechas y A.');
k.run((dt) => {
  for (const row of grid) for (const cl of row) if (cl.m) { cl.a += (cl.ang - cl.a) * Math.min(1, dt * 16); cl.p = Math.max(0, cl.p - dt * 4); }
  if (hitT) hitT += dt;
  sparkT -= dt; if (sparkT <= 0 && !beam.hit && k.st === 'play') { sparkT = 0.12; const e = beamEnd(); k.burst(e[0], e[1], '#ff7a9a', 2, 90); }
  if (!k.gate(reset) || done) return;
  if (k.ptr.hit) { kbd = false; rotate(Math.floor((k.ptr.x - OX) / S), Math.floor((k.ptr.y - OY) / S)); }
  const DV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  for (const d in DV) if (k.hit.has(d)) { kbd = true; cur = [k.clamp(cur[0] + DV[d][0], 0, N - 1), k.clamp(cur[1] + DV[d][1], 0, N - 1)]; }
  if (k.hit.has('a')) { kbd = true; rotate(cur[0], cur[1]); }
}, draw);
/* Puntos del rayo en píxeles: arranca en la boca del emisor y termina en la cara del bloque o en el borde */
function beamPx() { const pts = beam.pts.map(P); pts[0] = [OX - 4, pts[0][1]]; const L = pts.length - 1, [lx, ly] = beam.pts[L], d = DIRS[beam.d];
  if (!beam.hit) { if (beam.stop === 'block') pts[L] = [pts[L][0] - d[0] * S * 0.38, pts[L][1] - d[1] * S * 0.38]; else pts[L] = [OX + (lx - d[0] * 0.5) * S + S / 2, OY + (ly - d[1] * 0.5) * S + S / 2]; }
  return pts; }
function beamEnd() { const p = beamPx(); return p[p.length - 1]; }
function draw() {
  if (!bgCv) bgCv = makeBg(); if (!boardCv) boardCv = makeBoard(); c.drawImage(bgCv, 0, 0, W, H); c.drawImage(boardCv, 0, 0, W, H);
  const t = performance.now() / 1000;
  c.font = '800 11px ui-rounded,"Trebuchet MS",sans-serif'; c.textBaseline = 'top'; c.fillStyle = '#aab6ee'; c.textAlign = 'left'; c.fillText('NIVEL', 30, 20); c.textAlign = 'right'; c.fillText('PUNTOS', W - 30, 20);
  label(`${level}`, 30, 35, 22, '#ffd23d'); label(`${score}`, W - 30, 35, 22, '#fff', 'right');
  c.font = '600 12px -apple-system,Segoe UI,Roboto,sans-serif'; c.textAlign = 'center'; c.fillStyle = '#8f9ad0'; c.fillText(`Giros: ${taps}`, W / 2, 84);
  // receptor
  const [tx, ty] = P(target), r = S * 0.36, lit = beam.hit;
  if (lit) { c.globalAlpha = 0.35 + 0.2 * Math.sin(t * 10); c.fillStyle = '#7cf7a0'; c.beginPath(); c.arc(tx, ty, r * 1.7 + Math.min(1, hitT * 3) * 8, 0, 6.283); c.fill(); c.globalAlpha = 1; }
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(tx, ty + r * 0.9, r, r * 0.3, 0, 0, 6.283); c.fill();
  c.beginPath(); c.arc(tx, ty, r, 0, 6.283); ART.fillOut(c, lit ? '#2f9e62' : '#2a5a48', 3);
  c.beginPath(); c.moveTo(tx, ty - r * 0.62); c.lineTo(tx + r * 0.5, ty); c.lineTo(tx, ty + r * 0.62); c.lineTo(tx - r * 0.5, ty); c.closePath(); ART.fillOut(c, lit ? '#b6ffd0' : '#4f8a70', 2.5);
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(tx, ty - r * 0.5); c.lineTo(tx + r * 0.2, ty - r * 0.1); c.lineTo(tx, ty); c.closePath(); c.fill();
  // rayo: halo, color y núcleo (con pulso)
  const pts = beamPx(); c.lineCap = c.lineJoin = 'round';
  const line = (w, col) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pts.forEach((p) => c.lineTo(p[0], p[1])); c.stroke(); };
  line(16 + Math.sin(t * 12) * 2, 'rgba(255,60,110,.18)'); line(7, lit ? '#ff5f8a' : '#ff3b6b'); c.setLineDash([10, 8]); c.lineDashOffset = -t * 60; line(2.5, '#fff'); c.setLineDash([]); line(1.2, 'rgba(255,255,255,.8)');
  const e = pts[pts.length - 1]; if (!lit) { c.fillStyle = '#fff'; c.beginPath(); c.arc(e[0], e[1], 4 + Math.sin(t * 30) * 1.5, 0, 6.283); c.fill(); }
  // espejos (encima del rayo): placa con marco que gira
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const cl = grid[y][x]; if (!cl.m) continue; const [X, Y] = P([x, y]), L = S * 0.42 * (1 + cl.p * 0.12);
    c.save(); c.translate(X, Y); c.rotate(cl.a); ART.rr(c, -L, -5, L * 2, 10, 4); ART.fillOut(c, '#8a90b0', 2.5);
    const gr = c.createLinearGradient(0, -3, 0, 3); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#bfe6ff'); gr.addColorStop(1, '#7aa8d8'); c.fillStyle = gr; c.fillRect(-L + 4, -2.5, L * 2 - 8, 3.5);
    c.restore(); c.beginPath(); c.arc(X, Y, 4, 0, 6.283); ART.fillOut(c, '#ffd23d', 2); }
  if (kbd && !done) { const X = OX + cur[0] * S, Y = OY + cur[1] * S; c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([5, 4]); ART.rr(c, X + 2, Y + 2, S - 4, S - 4, 8); c.stroke(); c.setLineDash([]); }
  if (hitT) { c.globalAlpha = Math.min(1, hitT * 3); label('¡Conectado!', W / 2, OY + N * S + 24, 28, '#7cf7a0', 'center', 'middle'); c.globalAlpha = 1; }
}
