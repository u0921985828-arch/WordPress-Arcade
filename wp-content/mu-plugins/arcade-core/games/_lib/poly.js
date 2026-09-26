/* Tangram Studio: encaja todas las piezas en el cuadrado (partición aleatoria del tablero → siempre resoluble)
 * Arte propio: bandeja de madera con casillas hundidas, piezas con bisel que se levantan al arrastrar, vista previa y encaje con "clic". */
const W = 480, H = 640, OUT = ART.OUT, R2 = 6.2832;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1a1630' }), c = k.ctx;
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
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.7 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); g.fill(); }
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms); /* 1.23: la pantalla final espera si el juego está en pausa */
const COL = ['#ff6b6b', '#5ce1e6', '#ffd23d', '#7cf7a0', '#b98cff', '#ffa94d', '#ff9ad5', '#6c8cff'];
let TS = 26, N, S, OX, OY = 84, pieces, level, drag, done, score, mask, bgCv, t = 0, doneT = 0, kbs = null, moves = 0;
function build() {
  N = Math.min(7, 4 + Math.floor(level / 3)); S = Math.floor(300 / N); OX = Math.floor((W - N * S) / 2); done = false; doneT = 0; kbs = null; moves = 0; bgCv = null;
  const own = Array.from({ length: N }, () => Array(N).fill(-1)); const np = Math.min(8, 3 + Math.floor(N * N / 7), 3 + Math.floor((level - 1) * 0.6)); /* 1.23: niveles 1-2: 3 piezas, sube más despacio */ const seeds = k.shuffle([...Array(N * N).keys()]).slice(0, np);
  seeds.forEach((s, i) => (own[Math.floor(s / N)][s % N] = i));
  let changed = true; while (changed) { changed = false; for (const [y, x] of k.shuffle([...Array(N * N).keys()].map((i) => [Math.floor(i / N), i % N]))) { if (own[y][x] >= 0) continue; const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => own[y + dy] && own[y + dy][x + dx]).filter((v) => v !== undefined && v >= 0); if (nb.length) { own[y][x] = k.pick(nb); changed = true; } } }
  pieces = []; for (let i = 0; i < np; i++) { const cells = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (own[y][x] === i) cells.push([x, y]); if (!cells.length) continue; const mx = Math.min(...cells.map((q) => q[0])), my = Math.min(...cells.map((q) => q[1])); let sh = cells.map(([x, y]) => [x - mx, y - my]); for (let r = k.ri(0, 3); r > 0; r--) sh = rot(sh); pieces.push({ sh, col: COL[i % COL.length], bx: null, by: null, tx: 0, ty: 0, rx: null, ry: null, rs: TS, ang: 0, pop: 0 }); }
  layoutTray(); for (const p of pieces) { p.rx = p.tx; p.ry = p.ty + 40; }
}
function rot(sh) { const r = sh.map(([x, y]) => [-y, x]); const mx = Math.min(...r.map((q) => q[0])), my = Math.min(...r.map((q) => q[1])); return r.map(([x, y]) => [x - mx, y - my]); }
const pw = (p) => Math.max(...p.sh.map((q) => q[0])) + 1, ph = (p) => Math.max(...p.sh.map((q) => q[1])) + 1;
function layoutTray() { const top = OY + N * S + 34, list = pieces.filter((p) => p.bx === null && !(kbs && kbs.p === p));
  // tamaño de casilla de la bandeja: el mayor que quepa
  for (TS = 30; TS >= 14; TS -= 2) { let x = 20, y = top, rowH = 0;
    for (const p of list) { const w = pw(p) * TS, h = ph(p) * TS; if (x + w > W - 20) { x = 20; y += rowH + 14; rowH = 0; } p.tx = x; p.ty = y; x += w + 16; rowH = Math.max(rowH, h); }
    if (y + rowH <= H - 12) break; } }
function occupied(except) { const s = new Set(); for (const p of pieces) if (p !== except && p.bx !== null) for (const [x, y] of p.sh) s.add((p.bx + x) + ',' + (p.by + y)); return s; }
const fits = (p, gx, gy) => { const occ = occupied(p); return p.sh.every(([x, y]) => gx + x >= 0 && gy + y >= 0 && gx + x < N && gy + y < N && !occ.has((gx + x) + ',' + (gy + y))); };
function reset() { if (!level) { level = 1; score = 0; } build(); }
reset(); k.show(CFG.title, 'Arrastra las piezas al cuadrado hasta llenarlo. Toca una pieza para girarla. Teclado: A coge / suelta, flechas mueven, B gira.');
function snap(p) { p.pop = 1; moves++; k.sfx('pop'); const cx = OX + (p.bx + pw(p) / 2) * S, cy = OY + (p.by + ph(p) / 2) * S; k.burst(cx, cy, p.col, 10, 110); checkDone(); }
function checkDone() { if (pieces.every((q) => q.bx !== null) && !done) { done = true; doneT = 0; const gain = 150 * level; score += gain; k.best(CFG.id, score); k.float('+' + gain, W / 2, OY + N * S + 40, '#ffd23d');
  later(() => { k.st = 'over'; k.show('¡Encajado!', `Nivel ${level} · ${score} puntos<br>Toca para el siguiente`); level++; }, 900); } }
function dropPos(p) { return [Math.round((k.ptr.x - OX) / S - 0.5 - (pw(p) - 1) / 2), Math.round((k.ptr.y - OY) / S - 0.5 - (ph(p) - 1) / 2)]; }

k.run((dt) => {
  if (!k.gate(reset)) return; t += dt;
  for (const p of pieces) { // interpolación hacia su sitio
    const dragging = drag && drag.p === p && drag.moved; let tx, ty, ts;
    if (dragging) { ts = S; tx = k.ptr.x - pw(p) * S / 2; ty = k.ptr.y - ph(p) * S / 2 - 10; }
    else if (kbs && kbs.p === p) { ts = S; tx = OX + kbs.gx * S; ty = OY + kbs.gy * S; }
    else if (p.bx !== null) { ts = S; tx = OX + p.bx * S; ty = OY + p.by * S; } else { ts = TS; tx = p.tx; ty = p.ty; }
    const a = dragging ? 1 : 1 - Math.pow(0.0005, dt); p.rx += (tx - p.rx) * a; p.ry += (ty - p.ry) * a; p.rs += (ts - p.rs) * (1 - Math.pow(0.0005, dt));
    p.ang += (0 - p.ang) * (1 - Math.pow(0.0001, dt)); p.pop = Math.max(0, p.pop - dt * 4);
  }
  if (done) { doneT += dt; return; }
  const hitPiece = (px, py) => pieces.slice().reverse().find((p) => p.sh.some(([x, y]) => { const s = p.bx !== null ? S : TS, ox = p.bx !== null ? OX + p.bx * S : p.tx, oy = p.bx !== null ? OY + p.by * S : p.ty; return px > ox + x * s && px < ox + (x + 1) * s && py > oy + y * s && py < oy + (y + 1) * s; }));
  if (k.ptr.hit && !kbs) { const p = hitPiece(k.ptr.sx, k.ptr.sy); if (p) { drag = { p, moved: false, from: [p.bx, p.by] }; pieces.splice(pieces.indexOf(p), 1); pieces.push(p); k.sfx('click'); } }
  if (drag && k.ptr.down && Math.hypot(k.ptr.x - k.ptr.sx, k.ptr.y - k.ptr.sy) > 8) { drag.moved = true; drag.p.bx = null; }
  // gesto rápido: hit y up en el mismo frame → se decide por la distancia al punto inicial
  if (drag && k.ptr.up && !drag.moved && Math.hypot(k.ptr.x - k.ptr.sx, k.ptr.y - k.ptr.sy) > 8) { drag.moved = true; drag.p.bx = null; }
  if (drag && k.ptr.up) { const p = drag.p;
    if (!drag.moved) { p.sh = rot(p.sh); p.ang = -Math.PI / 2; k.sfx('click'); if (p.bx !== null) { const occ = occupied(p); if (p.sh.some(([x, y]) => p.bx + x >= N || p.by + y >= N || occ.has((p.bx + x) + ',' + (p.by + y)))) p.bx = null; } }
    else { const [gx, gy] = dropPos(p);
      if (fits(p, gx, gy)) { p.bx = gx; p.by = gy; snap(p); } else { p.bx = null; k.sfx(k.ptr.y < OY + N * S + 10 ? 'hit' : 'click'); } }
    drag = null; layoutTray(); checkDone(); }
  // teclado: A coge una pieza de la bandeja o la suelta, flechas la mueven, B la gira
  const kd = ['up', 'down', 'left', 'right'].find((q) => k.hit.has(q));
  if (k.hit.has('a')) { if (!kbs) { const p = pieces.find((q) => q.bx === null); if (p) { kbs = { p, gx: 0, gy: 0 }; pieces.splice(pieces.indexOf(p), 1); pieces.push(p); layoutTray(); k.sfx('click'); } }
    else if (fits(kbs.p, kbs.gx, kbs.gy)) { const p = kbs.p; p.bx = kbs.gx; p.by = kbs.gy; kbs = null; snap(p); layoutTray(); } else { k.sfx('hit'); k.shake(3); } }
  if (kbs) { if (kd) { const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[kd]; kbs.gx = k.clamp(kbs.gx + d[0], 0, N - pw(kbs.p)); kbs.gy = k.clamp(kbs.gy + d[1], 0, N - ph(kbs.p)); k.sfx('click'); }
    if (k.hit.has('b')) { kbs.p.sh = rot(kbs.p.sh); kbs.p.ang = -Math.PI / 2; kbs.gx = k.clamp(kbs.gx, 0, N - pw(kbs.p)); kbs.gy = k.clamp(kbs.gy, 0, N - ph(kbs.p)); k.sfx('click'); } }
}, draw);

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function renderBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2e2657'); gr.addColorStop(1, '#130f26'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 2; for (let i = -H; i < W; i += 28) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke(); }
  // bandeja de madera
  const bw = N * S, pad = 14; g.fillStyle = 'rgba(0,0,0,.4)'; ART.rr(g, OX - pad, OY - pad + 8, bw + pad * 2, bw + pad * 2, 16); g.fill();
  ART.rr(g, OX - pad, OY - pad, bw + pad * 2, bw + pad * 2, 16); ART.fillOut(g, '#b07a48', 3);
  g.save(); g.clip(); g.strokeStyle = 'rgba(90,50,20,.3)'; g.lineWidth = 1.5; for (let i = 0; i < 14; i++) { const y = OY - pad + i * (bw + pad * 2) / 14 + rnd(i) * 6; g.beginPath(); g.moveTo(OX - pad, y); g.bezierCurveTo(OX + bw * 0.3, y + rnd(i + 1) * 10 - 5, OX + bw * 0.7, y + rnd(i + 2) * 10 - 5, OX + bw + pad, y); g.stroke(); } g.restore();
  g.fillStyle = 'rgba(255,255,255,.25)'; ART.rr(g, OX - pad + 8, OY - pad + 3, bw + pad * 2 - 16, 4, 2); g.fill();
  ART.rr(g, OX - 3, OY - 3, bw + 6, bw + 6, 6); g.fillStyle = '#4a2e1a'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = OX + x * S, Y = OY + y * S; g.fillStyle = (x + y) % 2 ? '#5a3a22' : '#553620'; g.fillRect(X + 1, Y + 1, S - 2, S - 2); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X + 1, Y + 1, S - 2, 3); g.fillStyle = 'rgba(255,220,170,.08)'; g.fillRect(X + 1, Y + S - 3, S - 2, 2); }
  // zona de piezas
  const ty = OY + N * S + 24; ART.rr(g, 10, ty, W - 20, H - ty - 6, 16); ART.fillOut(g, '#3d3572', 3); g.fillStyle = 'rgba(0,0,0,.2)'; ART.rr(g, 13, ty + 3, W - 26, 8, 4); g.fill();
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = ty + 14; y < H - 10; y += 12) for (let x = 20 + (y % 24 ? 6 : 0); x < W - 16; x += 12) g.fillRect(x, y, 2, 2);
  return cv;
}
function piece(p, ox, oy, s, o) {
  o = o || {}; const set = new Set(p.sh.map((q) => q.join())), has = (x, y) => set.has(x + ',' + y);
  const w = pw(p) * s, h = ph(p) * s, sc = 1 + p.pop * 0.1 + (o.lift ? 0.06 : 0);
  c.save(); c.translate(ox + w / 2, oy + h / 2); c.rotate(p.ang); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
  if (o.lift) { c.fillStyle = 'rgba(0,0,0,.3)'; for (const [x, y] of p.sh) c.fillRect(x * s + 8, y * s + 12, s, s); }
  if (o.ghost) { c.globalAlpha = 0.5; }
  c.fillStyle = o.ghost || p.col; for (const [x, y] of p.sh) c.fillRect(x * s - 0.3, y * s - 0.3, s + 0.6, s + 0.6);
  if (!o.ghost) { const b = Math.max(2, s * 0.1);
    for (const [x, y] of p.sh) { const X = x * s, Y = y * s;
      c.fillStyle = 'rgba(255,255,255,.5)'; if (!has(x, y - 1)) c.fillRect(X, Y, s, b); if (!has(x - 1, y)) c.fillRect(X, Y, b, s);
      c.fillStyle = 'rgba(0,0,0,.3)'; if (!has(x, y + 1)) c.fillRect(X, Y + s - b, s, b); if (!has(x + 1, y)) c.fillRect(X + s - b, Y, b, s);
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(X + s / 2, Y + s / 2, s * 0.14, 0, R2); c.fill(); }
    c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 1; c.beginPath(); for (const [x, y] of p.sh) { if (has(x + 1, y)) { c.moveTo((x + 1) * s, y * s + 3); c.lineTo((x + 1) * s, (y + 1) * s - 3); } if (has(x, y + 1)) { c.moveTo(x * s + 3, (y + 1) * s); c.lineTo((x + 1) * s - 3, (y + 1) * s); } } c.stroke(); }
  // contorno exterior de la pieza
  c.strokeStyle = o.ghost ? '#fff' : OUT; c.lineWidth = o.ghost ? 2.5 : 2.5; c.lineCap = 'round'; c.beginPath();
  for (const [x, y] of p.sh) { const X = x * s, Y = y * s; if (!has(x, y - 1)) { c.moveTo(X, Y); c.lineTo(X + s, Y); } if (!has(x, y + 1)) { c.moveTo(X, Y + s); c.lineTo(X + s, Y + s); } if (!has(x - 1, y)) { c.moveTo(X, Y); c.lineTo(X, Y + s); } if (!has(x + 1, y)) { c.moveTo(X + s, Y); c.lineTo(X + s, Y + s); } }
  c.stroke(); c.restore(); c.globalAlpha = 1;
}
function draw() {
  if (!bgCv) bgCv = renderBg(); c.drawImage(bgCv, 0, 0, W, H);
  label(CFG.title, 14, 13, 17, '#ffd23d'); label(`Nivel ${level}`, 16, 40, 14, '#cfd6ff');
  label(`${score}`, W - 18, 12, 22, '#fff', 'right'); label(`Piezas ${pieces.filter((p) => p.bx !== null).length}/${pieces.length}`, W - 18, 40, 14, '#cfd6ff', 'right');
  const dp = drag && drag.moved ? drag.p : kbs ? kbs.p : null;
  if (dp) { const [gx, gy] = kbs ? [kbs.gx, kbs.gy] : dropPos(dp); if (kbs || (gx > -pw(dp) && gy > -ph(dp) && gx < N && gy < N)) piece(dp, OX + gx * S, OY + gy * S, S, { ghost: fits(dp, gx, gy) ? '#7cf7a0' : '#ff5f5f' }); }
  for (const p of pieces) if (p !== dp) piece(p, p.rx, p.ry, p.rs, {});
  if (dp) piece(dp, dp.rx, dp.ry, dp.rs, { lift: true });
  if (done) { const a = Math.min(1, doneT * 3); c.globalAlpha = a * (0.25 + Math.sin(doneT * 10) * 0.12); c.fillStyle = '#fff'; c.fillRect(OX, OY, N * S, N * S); c.globalAlpha = 1;
    const sc = 0.7 + a * 0.3 + Math.sin(a * 3.14) * 0.08; c.save(); c.translate(W / 2, OY + N * S / 2); c.scale(sc, sc); ART.rr(c, -130, -34, 260, 68, 20); ART.fillOut(c, 'rgba(34,28,66,.92)', 3); label('¡Encajado!', 0, -18, 32, '#7cf7a0', 'center'); c.restore(); }
}
