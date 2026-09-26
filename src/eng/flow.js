/* Flow Lines: une los puntos del mismo color y llena el tablero.
 * Generador: camino hamiltoniano aleatorio (backbite) partido en tramos ≥ 3 → solución garantizada.
 * Tuberías con contorno y brillo, extremos que laten al conectar, cursor de teclado y ola final al completar. */
const W = 480, H = 580, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#141a33' }), c = k.ctx;
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
const COL = ['#ff5f5f', '#4cc3ff', '#ffd23d', '#5fe08a', '#b77cff', '#ff9a3d', '#ff8ad0', '#5a78ff', '#b8e05a', '#f2f2f2'];
let sol, N, S, OX, OY = 104, ends, paths, drag, level, score, done, cur, kbd, winT, conn, boardCv, bestL;
function build() {
  /* Dificultad: el tablero de partida (fácil 4×4, normal 5×5, difícil 6×6); crece cada 3 niveles igual que siempre. */
  N = Math.min(k.dif === 0 ? 7 : 9, N0() + Math.floor((level - 1) / (k.dif === 0 ? 4 : 3))); /* 1.23: crece cada 3 niveles */ S = Math.floor(440 / N); OX = (480 - S * N) / 2; done = false;
  let path = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) path.push([y % 2 ? N - 1 - x : x, y]);
  for (let it = 0; it < N * N * 30; it++) { if (Math.random() < 0.5) path.reverse(); const end = path[path.length - 1]; const nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [end[0] + dx, end[1] + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N);
    const nb = k.pick(nbs); const i = path.findIndex((p) => p[0] === nb[0] && p[1] === nb[1]); if (i < 0 || i === path.length - 2) continue; path = path.slice(0, i + 1).concat(path.slice(i + 1).reverse()); }
  const segs = []; let i = 0; const nCol = Math.min(COL.length, Math.max(3, Math.round(N * N / (N + 2))));
  while (i < path.length) { const remain = path.length - i, left = nCol - segs.length; let len = left <= 1 ? remain : k.ri(3, Math.max(3, Math.min(remain - 3 * (left - 1), Math.ceil(remain / left) + 3))); if (remain - len < 3 && remain - len > 0) len = remain; segs.push(path.slice(i, i + len)); i += len; }
  sol = segs; ends = segs.map((s) => [s[0], s[s.length - 1]]); paths = segs.map(() => []);
  drag = null; cur = [0, 0]; winT = 0; conn = paths.map(() => 0); boardCv = null;
}
const K = (p) => p[0] + ',' + p[1];
function owner(p) { for (let i = 0; i < paths.length; i++) if (paths[i].some((q) => q[0] === p[0] && q[1] === p[1])) return i; return -1; }
function endOf(p) { return ends.findIndex((e) => (e[0][0] === p[0] && e[0][1] === p[1]) || (e[1][0] === p[0] && e[1][1] === p[1])); }
function connected(i) { const pa = paths[i]; if (pa.length < 2) return false; const a = pa[0], b = pa[pa.length - 1], [e1, e2] = ends[i]; return (K(a) === K(e1) && K(b) === K(e2)) || (K(a) === K(e2) && K(b) === K(e1)); }
const N0 = () => (k.dif === 0 ? 4 : k.dif === 2 ? 6 : 5);
function reset() { if (!level || k.st === 'over' && !done) { level = 1; score = 0; } build(); }
k.onDif = () => { if (k.st !== 'play') { level = 1; score = 0; build(); } };

/* ---------- Acciones (comunes a táctil y teclado) ---------- */
function grab(cell) { const e = endOf(cell), o = owner(cell);
  if (e >= 0) { drag = e; paths[e] = [cell]; k.sfx('click'); }
  else if (o >= 0) { drag = o; const idx = paths[o].findIndex((q) => K(q) === K(cell)); paths[o] = paths[o].slice(0, idx + 1); k.sfx('click'); }
  else drag = null; }
function extend(cell) {
  const pa = paths[drag], last = pa[pa.length - 1];
  if (!last || K(last) === K(cell) || Math.abs(last[0] - cell[0]) + Math.abs(last[1] - cell[1]) !== 1) return;
  const back = pa.findIndex((q) => K(q) === K(cell)); if (back >= 0) { paths[drag] = pa.slice(0, back + 1); return; } // retroceder siempre se permite
  if (connected(drag)) return;
  const e = endOf(cell); if (e >= 0 && e !== drag) return;
  const o = owner(cell); if (o >= 0) { const idx = paths[o].findIndex((q) => K(q) === K(cell)); paths[o] = paths[o].slice(0, idx); }
  pa.push(cell);
  if (connected(drag)) { const [x, y] = ctr(cell); k.burst(x, y, COL[drag], 10, 120); k.sfx('coin'); conn[drag] = 0.6; }
}
function release() { drag = null; const filled = new Set(paths.flat().map(K)).size;
  if (paths.every((_, i) => connected(i)) && filled === N * N) { done = true; score += 200 * level; bestL = k.best(CFG.id, score); winT = 0.001; k.sfx('coin'); k.flash('rgba(255,255,255,.3)'); }
  else if (paths.every((_, i) => connected(i))) k.float('Llena todas las casillas', W / 2, OY + N * S + 10, '#fff38a'); }
const ctr = ([x, y]) => [OX + x * S + S / 2, OY + y * S + S / 2];

/* ---------- Gráficos ---------- */
let bgCv;
function makeBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#26305e'); gr.addColorStop(1, '#10142a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1; for (let x = 0; x < W; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const vg = g.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 420); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const hud = (x, w) => { g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, x, 16, w, 52, 14); g.fill(); ART.rr(g, x, 12, w, 52, 14); ART.fillOut(g, '#34407a', 3); };
  hud(14, 150); hud(W - 164, 150); return cv;
}
function makeBoard() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const B = N * S; g.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(g, OX - 10, OY - 4, B + 20, B + 20, 16); g.fill();
  ART.rr(g, OX - 10, OY - 10, B + 20, B + 20, 16); ART.fillOut(g, '#3a4680', 4); ART.rr(g, OX - 3, OY - 3, B + 6, B + 6, 10); g.fillStyle = '#161c38'; g.fill();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ART.rr(g, OX + x * S + 1.5, OY + y * S + 1.5, S - 3, S - 3, 6); g.fillStyle = (x + y) % 2 ? '#1e2548' : '#1b2143'; g.fill(); }
  return cv;
}
/* Extremo de tubería: pieza única cacheada por color y estado (R5 §8) */
const endCv = {};
function endSprite(i, ok, r) {
  const key = i + '|' + (ok ? 1 : 0) + '|' + Math.round(r);
  let q = endCv[key]; if (q) return q;
  const R = r * 1.5, d = Math.ceil(R * 2 * CDPR);
  q = document.createElement('canvas'); q.width = q.height = d;
  const g = q.getContext('2d'); g.scale(d / (R * 2), d / (R * 2)); g.translate(R, R);
  const body = (h) => { h.moveTo(r, 0); h.arc(0, 0, r, 0, 6.283); }, parts = [[body, COL[i]]];
  contact(g, 0, r * 0.88, r * 0.78, r * 0.24, 0.32);
  uni(g, parts, 1.5);
  celp(g, parts, COL[i], r * 0.42, r * 0.42);
  spec(g, -r * 0.32, -r * 0.4, r * 0.3, r * 0.17, -0.6, 0.72);
  if (ok) { g.strokeStyle = ART.OUT; g.lineWidth = 2.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-r * 0.3, 0); g.lineTo(-r * 0.05, r * 0.25); g.lineTo(r * 0.35, -r * 0.25); g.stroke(); }
  endCv[key] = q; return q;
}
function label(s, x, y, size, col, align, base) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }

reset(); k.show(CFG.title, 'Arrastra desde un punto hasta el otro del mismo color. Las líneas no pueden cruzarse. Llena todo el tablero. Teclado: flechas y A.');
k.run((dt) => {
  conn = conn.map((v) => Math.max(0, v - dt));
  if (winT) { winT += dt; if (winT > 1.1 && k.st === 'play') { level++; k.st = 'over'; k.show('¡Perfecto!', `Nivel ${level - 1} completado · ${score} puntos · Récord ${bestL}<br>Toca para el siguiente`); } }
  if (!k.gate(reset) || done) return;
  const cell = [Math.floor((k.ptr.x - OX) / S), Math.floor((k.ptr.y - OY) / S)], inb = cell[0] >= 0 && cell[1] >= 0 && cell[0] < N && cell[1] < N;
  if (k.ptr.hit) { kbd = false; if (inb) grab(cell); }
  if (k.ptr.down && drag != null && inb) extend(cell);
  if (k.ptr.up && !kbd) release();
  // teclado: A engancha/suelta, flechas mueven el cursor (y trazan si hay línea enganchada)
  const DV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  for (const d in DV) if (k.hit.has(d)) { kbd = true; const nc = [k.clamp(cur[0] + DV[d][0], 0, N - 1), k.clamp(cur[1] + DV[d][1], 0, N - 1)]; if (drag != null) { extend(nc); const pa = paths[drag]; if (K(pa[pa.length - 1]) === K(nc)) cur = nc; } else cur = nc; }
  if (k.hit.has('a')) { kbd = true; if (drag != null) release(); else grab(cur); }
}, () => {
  if (!bgCv) bgCv = makeBg(); if (!boardCv) boardCv = makeBoard(); c.drawImage(bgCv, 0, 0, W, H); c.drawImage(boardCv, 0, 0, W, H);
  const filled = new Set(paths.flat().map(K)).size, nconn = paths.filter((_, i) => connected(i)).length, t = performance.now() / 1000;
  c.font = '800 11px ui-rounded,"Trebuchet MS",sans-serif'; c.textBaseline = 'top'; c.fillStyle = '#b9c3f0'; c.textAlign = 'left'; c.fillText(`NIVEL ${level}`, 30, 20); c.textAlign = 'right'; c.fillText('TABLERO', W - 30, 20);
  label(`${nconn}/${ends.length} flujos`, 30, 35, 20, '#ffd23d'); label(`${Math.floor(filled / (N * N) * 100)} %`, W - 30, 35, 22, filled === N * N ? '#5fe08a' : '#fff', 'right');
  c.font = '600 12px -apple-system,Segoe UI,Roboto,sans-serif'; c.textAlign = 'center'; c.fillStyle = '#8f9ad0'; c.fillText(`${score} puntos`, W / 2, 80);
  // casillas ocupadas: tinte del color
  paths.forEach((pa, i) => { c.fillStyle = COL[i]; c.globalAlpha = connected(i) ? 0.22 : 0.12; for (const [x, y] of pa) { ART.rr(c, OX + x * S + 1.5, OY + y * S + 1.5, S - 3, S - 3, 6); c.fill(); } }); c.globalAlpha = 1;
  // tuberías: contorno, color y brillo
  c.lineCap = c.lineJoin = 'round';
  const stroke = (pa, w, col, dy) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pa.forEach((p) => { const [x, y] = ctr(p); c.lineTo(x, y + (dy || 0)); }); c.stroke(); };
  paths.forEach((pa, i) => { if (pa.length < 2) return; const w = S * 0.36 * (winT ? 1 + 0.15 * Math.max(0, Math.sin(winT * 8 - i)) : 1);
    stroke(pa, w + 6, OUT); stroke(pa, w, COL[i]); stroke(pa, w * 0.28, 'rgba(255,255,255,.45)', -w * 0.18); });
  // extremos
  ends.forEach((e, i) => { const ok = connected(i); e.forEach((p) => { const [x, y] = ctr(p), r = S * 0.34;
    if (ok || conn[i] > 0) { c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 4 + i) + conn[i]; c.fillStyle = COL[i]; c.beginPath(); c.arc(x, y, r * 1.45 + conn[i] * 14, 0, 6.283); c.fill(); c.globalAlpha = 1; }
    const q = endSprite(i, ok, r); c.drawImage(q, x - r * 1.5, y - r * 1.5, r * 3, r * 3); }); });
  // dedo / cursor
  if (drag != null && !kbd && k.ptr.down) { c.globalAlpha = 0.3; c.fillStyle = COL[drag]; c.beginPath(); c.arc(k.ptr.x, k.ptr.y, S * 0.6, 0, 6.283); c.fill(); c.globalAlpha = 1; }
  if (kbd && !done) { const [x, y] = ctr(cur); c.strokeStyle = drag != null ? COL[drag] : '#fff'; c.lineWidth = 3; c.setLineDash([5, 4]); ART.rr(c, x - S / 2 + 2, y - S / 2 + 2, S - 4, S - 4, 8); c.stroke(); c.setLineDash([]); }
  if (winT) { const a = Math.min(1, winT * 3); c.globalAlpha = a; label('¡Tablero completo!', W / 2, OY + N * S / 2, 34 * (0.8 + 0.2 * a), '#fff38a', 'center', 'middle'); c.globalAlpha = 1; }
});
