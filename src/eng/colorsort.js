/* Color Sort: pasa bolas de color entre tubos hasta que cada tubo tenga un solo color.
 * Tubos de cristal, bolas con símbolo (accesible), la bola elegida se eleva y vuela en arco, deshacer y reiniciar. */
const W = 480, H = 640, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#16213d' }), c = k.ctx, CAP = 4;
const COL = ['#ff5f5f', '#4cc3ff', '#ffd23d', '#5fe08a', '#b77cff', '#ff9a3d', '#ff8ad0', '#5a78ff', '#b8e05a'];
let tubes, sel, level, moves, done, hist, pour, fly, hidden, wob, liftA, init, winT, kc, kbd, fullT;
const BR = 19, SL = 44, TW = 54, TH = CAP * SL + 18;
function build() { const n = Math.min(9, 2 + level); /* nivel 1: 3 colores */ const all = []; for (let i = 0; i < n; i++) for (let j = 0; j < CAP; j++) all.push(i); k.shuffle(all); tubes = []; for (let i = 0; i < n; i++) tubes.push(all.slice(i * CAP, i * CAP + CAP)); tubes.push([], []); sel = null; moves = 0; done = false; hist = []; if (tubes.every((t) => !t.length || (t.length === CAP && t.every((v) => v === t[0])))) build();
  init = JSON.stringify(tubes); fly = []; hidden = tubes.map(() => 0); wob = tubes.map(() => 0); fullT = tubes.map(() => 0); liftA = 0; winT = 0; kc = 0; }
function layout(i) { const n = tubes.length, rows = n > 6 ? 2 : 1, perRow = Math.ceil(n / rows), row = Math.floor(i / perRow), inRow = Math.min(perRow, n - row * perRow), col = i - row * perRow, sp = Math.min(80, 460 / perRow);
  return [W / 2 - (inRow - 1) * sp / 2 + col * sp - TW / 2, rows === 1 ? 250 : 138 + row * 250, TW, TH]; }
const slot = (i, j) => { const [x, y] = layout(i); return [x + TW / 2, y + TH - 9 - BR - j * SL]; };
const liftPos = (i) => { const [x, y] = layout(i); return [x + TW / 2, y - 34]; };
const solvedT = (t) => t.length === CAP && t.every((v) => v === t[0]);
function canPour(a, b) { const A = tubes[a], B = tubes[b]; return a !== b && A.length && B.length < CAP && (!B.length || B[B.length - 1] === A[A.length - 1]); }
function doPour(a, b) { hist.push(JSON.stringify(tubes)); const A = tubes[a], B = tubes[b], col = A[A.length - 1]; let n = 0;
  while (A.length && A[A.length - 1] === col && B.length < CAP) { const from = n === 0 ? liftPos(a) : slot(a, A.length - 1); A.pop(); B.push(col); fly.push({ col, from, to: slot(b, B.length - 1), t: -n * 0.08, b }); n++; }
  hidden[b] += n; moves++; pour = { b, t: 0.25 }; k.sfx('jump');
  if (tubes.every((t) => !t.length || solvedT(t))) { done = true; k.best(CFG.id, level); } }
function reset() { if (!level) level = 1; build(); }

/* ---------- Gráficos cacheados ---------- */
const ballCv = [];
function ballSprite(v) {
  if (ballCv[v]) return ballCv[v];
  const R = BR + 3, cv = document.createElement('canvas'); cv.width = cv.height = R * 4; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(R, R);
  g.beginPath(); g.arc(0, 0, BR, 0, 6.283); const gr = g.createRadialGradient(-6, -7, 2, 0, 0, BR); gr.addColorStop(0, '#fff'); gr.addColorStop(0.18, COL[v]); gr.addColorStop(1, COL[v]); g.fillStyle = gr; g.fill();
  g.save(); g.clip(); g.fillStyle = 'rgba(26,21,48,.25)'; g.beginPath(); g.arc(4, 7, BR, 0, 6.283); g.arc(-2, -2, BR, 0, 6.283, true); g.fill('evenodd'); g.restore();
  g.lineWidth = 2.5; g.strokeStyle = OUT; g.beginPath(); g.arc(0, 0, BR, 0, 6.283); g.stroke();
  // símbolo propio de cada color
  g.fillStyle = 'rgba(26,21,48,.45)'; g.strokeStyle = 'rgba(26,21,48,.45)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); const s = 6.5;
  if (v === 0) g.arc(0, 2, s * 0.8, 0, 6.283);
  else if (v === 1) { g.moveTo(0, 2 - s); g.lineTo(s, 2 + s * 0.8); g.lineTo(-s, 2 + s * 0.8); }
  else if (v === 2) g.rect(-s * 0.8, 2 - s * 0.8, s * 1.6, s * 1.6);
  else if (v === 3) for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s * 1.1; g.lineTo(Math.cos(a) * r, 2 + Math.sin(a) * r); }
  else if (v === 4) { g.moveTo(0, 2 - s); g.lineTo(s * 0.8, 2); g.lineTo(0, 2 + s); g.lineTo(-s * 0.8, 2); }
  else if (v === 5) { g.rect(-s, 0, s * 2, 4); g.rect(-2, 2 - s, 4, s * 2); }
  else if (v === 6) { g.moveTo(0, 2 + s); g.bezierCurveTo(-s * 1.6, 2 - s * 0.2, -s * 0.6, 2 - s * 1.4, 0, 2 - s * 0.4); g.bezierCurveTo(s * 0.6, 2 - s * 1.4, s * 1.6, 2 - s * 0.2, 0, 2 + s); }
  else if (v === 7) { g.arc(0, 2, s, 0, 6.283); g.arc(0, 2, s * 0.45, 0, 6.283, true); }
  else { g.rect(-s, -2, s * 2, 3.5); g.rect(-s, 4, s * 2, 3.5); }
  g.fill('evenodd');
  g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(-7, -9, 5, 3, -0.6, 0, 6.283); g.fill();
  return (ballCv[v] = cv);
}
function tubePath(g, x, y, w, h) { const r = w / 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h - r); g.arc(x + r, y + h - r, r, Math.PI, 0, true); g.lineTo(x + w, y); }
let tubeBack, tubeFront, bgCv;
function tubeSprites() {
  const mk = (f) => { const cv = document.createElement('canvas'); cv.width = (TW + 20) * 2; cv.height = (TH + 20) * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(10, 10); f(g); return cv; };
  tubeBack = mk((g) => { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(TW / 2, TH + 4, TW / 2 + 6, 6, 0, 0, 6.283); g.fill();
    tubePath(g, 0, 0, TW, TH); g.closePath(); const gr = g.createLinearGradient(0, 0, TW, 0); gr.addColorStop(0, 'rgba(160,200,255,.16)'); gr.addColorStop(0.5, 'rgba(160,200,255,.06)'); gr.addColorStop(1, 'rgba(160,200,255,.2)'); g.fillStyle = gr; g.fill(); });
  tubeFront = mk((g) => { tubePath(g, 0, 0, TW, TH); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3; g.strokeStyle = 'rgba(210,235,255,.85)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.4)'; ART.rr(g, 6, 14, 5, TH - 44, 2.5); g.fill(); g.fillStyle = 'rgba(255,255,255,.2)'; ART.rr(g, TW - 11, 22, 3, TH - 70, 1.5); g.fill();
    ART.rr(g, -5, -6, TW + 10, 10, 5); ART.fillOut(g, '#cfe4ff', 2.5); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, -4, TW - 6, 2); });
}
function makeBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2b3c6e'); gr.addColorStop(1, '#141a33'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = (i * 173) % H, r = 3 + (i * 7) % 12; g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.stroke(); }
  const vg = g.createRadialGradient(W / 2, H / 2, 180, W / 2, H / 2, 460); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const hud = (x, w) => { g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, x, 16, w, 52, 14); g.fill(); ART.rr(g, x, 12, w, 52, 14); ART.fillOut(g, '#34487e', 3); };
  hud(14, 150); hud(W - 164, 150);
  return cv;
}
function label(s, x, y, size, col, align, base) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
const BTN = [{ x: 96, t: 'Deshacer', id: 'undo' }, { x: 256, t: 'Reiniciar', id: 'restart' }];
function button(bn, dis) { const x = bn.x, y = 592, w = 128, h = 38; c.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(c, x, y + 4, w, h, 14); c.fill(); ART.rr(c, x, y, w, h, 14); ART.fillOut(c, dis ? '#3a4466' : '#5a6fb8', 3);
  c.strokeStyle = '#fff'; c.lineWidth = 3; c.lineCap = 'round'; c.globalAlpha = dis ? 0.4 : 1; const ix = x + 22, iy = y + 19;
  c.beginPath(); if (bn.id === 'undo') { c.arc(ix + 2, iy + 2, 7, -Math.PI * 0.9, Math.PI * 0.6); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(ix - 9, iy - 4); c.lineTo(ix - 1, iy - 6); c.lineTo(ix - 6, iy + 3); c.fill(); }
  else { c.arc(ix, iy, 7, -Math.PI * 0.35, Math.PI * 1.45); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(ix + 2, iy - 11); c.lineTo(ix + 8, iy - 6); c.lineTo(ix + 1, iy - 3); c.fill(); }
  label(bn.t, x + 38, y + 11, 15, '#fff'); c.globalAlpha = 1; }

reset(); k.show(CFG.title, 'Toca un tubo y luego otro para pasar las bolas de arriba. Solo se puede poner sobre el mismo color o en un tubo vacío.');
function tapTube(i) {
  if (i < 0) { sel = null; return; }
  if (sel === null) { if (tubes[i].length && !solvedT(tubes[i])) { sel = i; liftA = 0; k.sfx('click'); } else wob[i] = 0.3; }
  else if (sel === i) sel = null;
  else { if (canPour(sel, i)) doPour(sel, i); else { wob[i] = 0.35; k.sfx('hit'); } sel = null; }
}
k.run((dt) => { if (pour) { pour.t -= dt; if (pour.t <= 0) pour = null; }
  liftA = Math.min(1, liftA + dt / 0.12); wob = wob.map((w) => Math.max(0, w - dt)); fullT = fullT.map((w) => Math.max(0, w - dt));
  for (const f of fly) { f.t += dt / 0.36; if (f.t >= 1 && !f.land) { f.land = true; hidden[f.b]--; k.burst(f.to[0], f.to[1] - 6, COL[f.col], 4, 60);
    if (!hidden[f.b] && solvedT(tubes[f.b])) { fullT[f.b] = 0.8; const [x, y] = layout(f.b); k.burst(x + TW / 2, y, COL[f.col], 18, 180); k.sfx('coin'); k.float('¡Completo!', x + TW / 2, y - 20, '#fff38a'); } else k.sfx('pop'); } }
  fly = fly.filter((f) => !f.land);
  if (done && !fly.length && k.st === 'play') { winT += dt; if (winT > 0.6) { k.st = 'over'; k.show('¡Ordenado!', `Nivel ${level} en ${moves} movimientos<br>Toca para el siguiente`); level++; } }
  if (!k.gate(reset) || done) return;
  if (fly.some((f) => f.t < 0.6)) return;
  const n = tubes.length, perRow = Math.ceil(n / (n > 6 ? 2 : 1));
  if (k.hit.has('left')) { kc = (kc + n - 1) % n; kbd = true; } if (k.hit.has('right')) { kc = (kc + 1) % n; kbd = true; }
  if (k.hit.has('up') && kc >= perRow) { kc -= perRow; kbd = true; } if (k.hit.has('down') && kc + perRow < n) { kc += perRow; kbd = true; }
  if (k.hit.has('a')) { kbd = true; tapTube(kc); }
  const undo = () => { if (hist.length) { tubes = JSON.parse(hist.pop()); moves++; fly = []; hidden = tubes.map(() => 0); k.sfx('click'); } sel = null; };
  if (k.hit.has('b')) undo();
  if (k.ptr.hit) { kbd = false;
    if (k.ptr.y > 586) { for (const bn of BTN) if (k.ptr.x > bn.x && k.ptr.x < bn.x + 128) { if (bn.id === 'undo') undo(); else { tubes = JSON.parse(init); hist = []; moves = 0; sel = null; fly = []; hidden = tubes.map(() => 0); k.sfx('click'); } } return; }
    const i = tubes.findIndex((_, j) => { const [x, y, w, h] = layout(j); return k.ptr.x > x - 12 && k.ptr.x < x + w + 12 && k.ptr.y > y - 60 && k.ptr.y < y + h + 14; });
    tapTube(i); } }, () => {
  if (!bgCv) { bgCv = makeBg(); tubeSprites(); } c.drawImage(bgCv, 0, 0, W, H);
  c.font = '800 11px ui-rounded,"Trebuchet MS",sans-serif'; c.textBaseline = 'top'; c.fillStyle = '#b9c8f0'; c.textAlign = 'left'; c.fillText('NIVEL', 30, 20); c.textAlign = 'right'; c.fillText('MOVIMIENTOS', W - 30, 20);
  label(String(level), 30, 32, 24, '#ffd23d'); label(String(moves), W - 30, 32, 24, '#fff', 'right');
  // estanterías
  const n = tubes.length, rows = n > 6 ? 2 : 1;
  for (let r = 0; r < rows; r++) { const [, y] = layout(r * Math.ceil(n / rows)), sy = y + TH + 8; c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, 30, sy + 4, W - 60, 14, 6); c.fill(); ART.rr(c, 26, sy, W - 52, 14, 6); ART.fillOut(c, '#8a5a3b', 3); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(34, sy + 3, W - 68, 2); }
  const t = performance.now() / 1000;
  tubes.forEach((tb, i) => { let [x, y] = layout(i); x += Math.sin(wob[i] * 40) * wob[i] * 14;
    if (kbd && kc === i) { c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.setLineDash([6, 5]); ART.rr(c, x - 10, y - 62, TW + 20, TH + 70, 16); c.stroke(); c.setLineDash([]); }
    if (fullT[i] > 0 || (solvedT(tb) && !hidden[i])) { c.globalAlpha = fullT[i] > 0 ? 0.5 + fullT[i] * 0.5 : 0.35; c.fillStyle = COL[tb[0]]; c.beginPath(); c.ellipse(x + TW / 2, y + TH / 2, TW * 0.9, TH * 0.6, 0, 0, 6.283); c.globalAlpha *= 0.35; c.fill(); c.globalAlpha = 1; }
    c.drawImage(tubeBack, x - 10, y - 10, TW + 20, TH + 20);
    const shown = tb.length - hidden[i];
    for (let j = 0; j < shown; j++) { let [bx, by] = slot(i, j); bx += x - layout(i)[0]; if (sel === i && j === tb.length - 1) { const [lx, ly] = liftPos(i), e = 1 - (1 - liftA) * (1 - liftA); bx = bx + (lx - bx) * e; by = by + (ly - by) * e + Math.sin(t * 6) * 3; if (liftA >= 1) continue; }
      c.drawImage(ballSprite(tb[j]), bx - BR - 3, by - BR - 3, (BR + 3) * 2, (BR + 3) * 2); }
    c.drawImage(tubeFront, x - 10, y - 10, TW + 20, TH + 20);
    if (solvedT(tb) && !hidden[i]) { ART.rr(c, x - 6, y - 12, TW + 12, 14, 6); ART.fillOut(c, COL[tb[0]], 2.5); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(x, y - 9, TW, 3); } });
  // bola elevada (encima de todo)
  if (sel !== null && liftA >= 1 && tubes[sel].length) { const [lx, ly] = liftPos(sel), v = tubes[sel][tubes[sel].length - 1]; c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(lx, layout(sel)[1] - 4, 14, 4, 0, 0, 6.283); c.fill(); c.drawImage(ballSprite(v), lx - BR - 3, ly - BR - 3 + Math.sin(t * 6) * 3, (BR + 3) * 2, (BR + 3) * 2); }
  for (const f of fly) { if (f.t < 0) { c.drawImage(ballSprite(f.col), f.from[0] - BR - 3, f.from[1] - BR - 3, (BR + 3) * 2, (BR + 3) * 2); continue; }
    const e = f.t < 0.5 ? 2 * f.t * f.t : 1 - 2 * (1 - f.t) * (1 - f.t), top = Math.min(f.from[1], f.to[1]) - 70 - Math.abs(f.to[0] - f.from[0]) * 0.15;
    const x = f.from[0] + (f.to[0] - f.from[0]) * e, y = (1 - e) * (1 - e) * f.from[1] + 2 * (1 - e) * e * top + e * e * f.to[1];
    c.drawImage(ballSprite(f.col), x - BR - 3, y - BR - 3, (BR + 3) * 2, (BR + 3) * 2); }
  BTN.forEach((bn) => button(bn, bn.id === 'undo' ? !hist.length : !moves));
  if (!done && !fly.length && !tubes.some((_, i) => tubes.some((__, j) => canPour(i, j)))) label('Sin movimientos: deshaz o reinicia', W / 2, 560, 16, '#ffd23d', 'center');
});
