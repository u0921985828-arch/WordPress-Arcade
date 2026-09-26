/* Columnas de Joyas (CFG.mode 'joyas'): caen columnas de tres gemas en un pozo de 7×14; se limpian las líneas de tres o
 * más del mismo color en horizontal, vertical y en las dos diagonales, y lo que queda cae y puede encadenar.
 * Arte propio: gemas cacheadas con forma distinta por color (también se distinguen sin ver el tono), pozo con marco.
 * Curva 1.19/1.23: nivel 1 muy lento y con 4 colores; el quinto color llega en el nivel 4 y el sexto en el 7. */
const OUT = ART.OUT, TAU = 6.2832, ID = CFG.id || 'columnas-de-joyas';
const W = 360, H = 640, CS = 34, COLS = 7, ROWS = 14;
const X0 = (W - COLS * CS) / 2, Y0 = 96;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#191134' }), c = k.ctx;
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
const GEM = [
  { c: '#ff6fb5', s: 'diamante' }, { c: '#5b8cff', s: 'redonda' }, { c: '#a8cf3f', s: 'cuadrada' },
  { c: '#ffc94d', s: 'gota' }, { c: '#a097ff', s: 'hexagono' }, { c: '#ff7a59', s: 'estrella' },
];
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
let F, piece, next, fall, speed, score, level, cleared, chain, phase, phT, t, over, msg, msgT, hard;
const spr = [];

const cx = (x) => X0 + x * CS + CS / 2, cy = (y) => Y0 + y * CS + CS / 2;
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}

/* ---------- gemas cacheadas ---------- */
function gemPath(g, s, r) {
  g.beginPath();
  if (s === 'diamante') { g.moveTo(0, -r); g.lineTo(r * 0.82, 0); g.lineTo(0, r); g.lineTo(-r * 0.82, 0); g.closePath(); }
  else if (s === 'redonda') g.arc(0, 0, r * 0.94, 0, TAU);
  else if (s === 'cuadrada') ART.rr(g, -r * 0.82, -r * 0.82, r * 1.64, r * 1.64, r * 0.26);
  else if (s === 'gota') { g.moveTo(0, -r); g.bezierCurveTo(r * 0.95, -r * 0.3, r * 0.8, r * 0.95, 0, r); g.bezierCurveTo(-r * 0.8, r * 0.95, -r * 0.95, -r * 0.3, 0, -r); }
  else if (s === 'hexagono') { for (let i = 0; i < 6; i++) { const a = -1.5708 + i * TAU / 6; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); } g.closePath(); }
  else { for (let i = 0; i < 10; i++) { const a = -1.5708 + i * TAU / 10, rr = i % 2 ? r * 0.44 : r; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); }
}
function gemSprite(i) {
  const o = GEM[i], r = CS * 0.42, S = CS + 6;
  return off(S, S, (g) => {
    g.translate(S / 2, S / 2);
    contact(g, 1, r * 0.78, r * 0.85, r * 0.24, 0.3);
    const parts = [[(h) => gemPath(h, o.s, r), o.c]];
    uni(g, parts, 1.5);
    celp(g, parts, o.c, r * 0.42, r * 0.42);
    spec(g, -r * 0.34, -r * 0.4, r * 0.26, r * 0.15, -0.6, 0.78);
  });
}
function rainbowSprite() {
  const r = CS * 0.42, S = CS + 6;
  return off(S, S, (g) => {
    g.translate(S / 2, S / 2);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(1, r * 0.75, r * 0.85, r * 0.26, 0, 0, TAU); g.fill();
    const gr = g.createLinearGradient(-r, -r, r, r);
    GEM.forEach((q, i) => gr.addColorStop(i / (GEM.length - 1), q.c));
    g.beginPath(); g.arc(0, 0, r * 0.94, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-r * 0.3, -r * 0.35, r * 0.3, r * 0.18, -0.6, 0, TAU); g.fill();
    ART.glint(g, r * 0.25, r * 0.3, r * 0.34, '#fff');
  });
}
const bg = off(W, H, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#332358'); gr.addColorStop(1, '#130d28'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.04)';
  for (let i = 0; i < 34; i++) { const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * W, y = ((Math.sin(i * 78.233) * 43758.5453) % 1 + 1) % 1 * H; g.beginPath(); g.arc(x, y, 2 + (i % 5), 0, TAU); g.fill(); }
  const bw = COLS * CS, bh = ROWS * CS;
  ART.rr(g, X0 - 10, Y0 - 10, bw + 20, bh + 22, 16); ART.fillOut(g, '#463ac4', 3);
  ART.rr(g, X0 - 10, Y0 - 10, bw + 20, bh + 16, 16); ART.fillOut(g, '#6e62f5', 3);
  g.save(); ART.rr(g, X0, Y0, bw, bh, 8); g.clip();
  g.fillStyle = '#1d1540'; g.fillRect(X0, Y0, bw, bh);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { g.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.012)'; g.fillRect(X0 + x * CS, Y0 + y * CS, CS, CS); }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X0, Y0, bw, 6); g.fillRect(X0, Y0, 5, bh);
  g.restore();
  ART.rr(g, X0, Y0, bw, bh, 8); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
});

/* ---------- reglas ---------- */
const colorsNow = () => Math.min(GEM.length, level < 4 ? 4 : level < 7 ? 5 : 6);
const free = (x, y) => x >= 0 && x < COLS && y < ROWS && (y < 0 || !F[y][x]);
function newPiece() {
  const g = []; for (let i = 0; i < 3; i++) g.push(k.ri(0, colorsNow() - 1));
  // gema comodín ocasional a partir del nivel 3 (limpia todas las del color donde cae)
  if (level >= 3 && Math.random() < 0.06) g[k.ri(0, 2)] = -1;
  return g;
}
function spawn() {
  piece = { x: Math.floor(COLS / 2), y: 0, g: next || newPiece(), off: 0 };
  next = newPiece(); fall = 0; hard = false;
  if (!free(piece.x, 0)) { over = 0.001; k.sfx('hurt'); k.shake(8); }
}
function reset() {
  F = []; for (let y = 0; y < ROWS; y++) F.push(new Array(COLS).fill(null));
  score = 0; level = 1; cleared = 0; chain = 0; phase = 'fall'; phT = 0; t = 0; over = 0; msg = ''; msgT = 0; next = null;
  spawn();
}
function stepSpeed() { return Math.max(0.16, 0.95 * Math.pow(0.86, level - 1)); }
const landRow = (x) => { let y = ROWS - 1; while (y >= 0 && F[y][x]) y--; return y; };
function move(d) {
  if (phase !== 'fall' || over) return;
  const nx2 = piece.x + d;
  if (nx2 < 0 || nx2 >= COLS || landRow(nx2) < Math.ceil(piece.y)) return;
  piece.x = nx2; k.sfx('click');
}
function rotate() { if (phase !== 'fall' || over) return; piece.g = [piece.g[2], piece.g[0], piece.g[1]]; k.sfx('click'); }
function lock() {
  const y = Math.floor(piece.y);
  for (let i = 0; i < 3; i++) { const ry = y - i; if (ry < 0) { over = 0.001; k.sfx('hurt'); k.shake(8); return; } F[ry][piece.x] = { c: piece.g[i], pop: 0, off: 0 }; }
  k.sfx('hit');
  // comodín: limpia todas las gemas del color sobre el que aterriza
  let wild = false;
  for (let i = 0; i < 3; i++) { const ry = y - i; if (F[ry] && F[ry][piece.x] && F[ry][piece.x].c === -1) wild = true; }
  if (wild) {
    const below = F[y + 1] && F[y + 1][piece.x] ? F[y + 1][piece.x].c : k.ri(0, colorsNow() - 1);
    let n = 0;
    for (let yy = 0; yy < ROWS; yy++) for (let xx = 0; xx < COLS; xx++) if (F[yy][xx] && (F[yy][xx].c === below || F[yy][xx].c === -1)) { F[yy][xx].mark = true; n++; }
    if (n) { msg = '¡Comodín!'; msgT = 1.3; }
  }
  chain = 0; phase = 'check'; phT = 0;
}
function findMatches() {
  let any = false;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const a = F[y][x]; if (!a || a.c < 0) continue;
    for (const [dx, dy] of DIRS) {
      let n = 1;
      while (true) { const nx = x + dx * n, ny = y + dy * n; if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || !F[ny][nx] || F[ny][nx].c !== a.c) break; n++; }
      if (n >= 3) { for (let i = 0; i < n; i++) { F[y + dy * i][x + dx * i].mark = true; } any = true; }
    }
  }
  return any || F.some((row) => row.some((g) => g && g.mark));
}
function clearMarked() {
  let n = 0, sx = 0, sy = 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (F[y][x] && F[y][x].mark) {
    n++; sx += cx(x); sy += cy(y);
    k.burst(cx(x), cy(y), F[y][x].c < 0 ? '#fff' : GEM[F[y][x].c].c, 8, 120); F[y][x] = null;
  }
  if (!n) return 0;
  chain++;
  const pts = n * 10 * chain * (1 + Math.floor(level / 4));
  score += pts; cleared += n;
  k.float('+' + pts + (chain > 1 ? '  x' + chain : ''), sx / n, sy / n - 14, chain > 1 ? '#a8cf3f' : '#fff');
  k.sfx(chain > 1 ? 'coin' : 'pop'); if (chain > 1) { msg = 'Cadena x' + chain; msgT = 1.3; k.shake(2); }
  const lv = Math.min(12, 1 + Math.floor(cleared / 22));
  if (lv > level) { level = lv; msg = 'Nivel ' + level; msgT = 1.6; k.sfx('win'); k.flash('rgba(255,255,255,.2)'); }
  return n;
}
function gravity() {
  let moved = false;
  for (let x = 0; x < COLS; x++) {
    let w = ROWS - 1;
    for (let y = ROWS - 1; y >= 0; y--) if (F[y][x]) { if (y !== w) { F[w][x] = F[y][x]; F[w][x].off = (w - y) * CS; F[y][x] = null; moved = true; } w--; }
  }
  return moved;
}
function update(dt) {
  t += dt; msgT = Math.max(0, msgT - dt);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const g = F && F[y][x]; if (!g) continue; g.off = Math.max(0, g.off - dt * 900); if (g.mark) g.pop += dt; }
  if (!k.gate(reset)) return;
  if (over) { over += dt; if (over > 1.2) k.lose(ID, score, 'El pozo se llenó', `Nivel ${level} · ${cleared} gemas`); return; }
  if (phase === 'fall') {
    if (k.hit.has('left')) move(-1);
    if (k.hit.has('right')) move(1);
    if (k.hit.has('a') || k.hit.has('up')) rotate();
    if (k.hit.has('b')) { hard = true; k.sfx('shoot'); }
    // gesto: arrastrar a los lados mueve, tocar gira, deslizar abajo suelta
    const p = k.ptr;
    if (p.hit) { piece.ax = p.x; piece.ay = p.y; piece.moved = false; }
    if (p.down && piece.ax != null) {
      const dx = p.x - piece.ax, dy = p.y - piece.ay;
      if (Math.abs(dx) > CS * 0.8) { move(dx > 0 ? 1 : -1); piece.ax = p.x; piece.moved = true; }
      else if (dy > CS * 2.2) { hard = true; piece.moved = true; piece.ax = null; }
    }
    if (p.up) { if (!piece.moved && piece.ax != null) rotate(); piece.ax = null; }
    const soft = k.held.has('down') || (k.ptr.down && piece.ax == null);
    const sp = hard ? 42 : soft ? 14 : 1 / stepSpeed();
    piece.y += sp * dt;
    const lim = landRow(piece.x);
    if (piece.y >= lim) { piece.y = lim; if (hard) score += 2; lock(); }
  } else if (phase === 'check') {
    if (findMatches()) { phase = 'flash'; phT = 0; } else { phase = 'fall'; spawn(); }
  } else if (phase === 'flash') {
    phT += dt; if (phT > 0.28) { clearMarked(); phase = 'gravity'; phT = 0; gravity(); }
  } else if (phase === 'gravity') {
    phT += dt; if (phT > 0.2) { phase = 'check'; phT = 0; }
  }
}
function drawGem(x, y, col, s, alphaV) {
  const cv = col < 0 ? spr.rain : spr[col], S = (CS + 6) * (s || 1);
  if (alphaV != null) c.globalAlpha = alphaV;
  c.drawImage(cv, x - S / 2, y - S / 2, S, S);
  c.globalAlpha = 1;
}
function draw() {
  c.drawImage(bg, 0, 0, W, H);
  c.save(); ART.rr(c, X0, Y0, COLS * CS, ROWS * CS, 8); c.clip();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const g = F[y][x]; if (!g) continue;
    const fl = g.mark ? 1 + Math.sin(g.pop * 40) * 0.12 : 1;
    drawGem(cx(x), cy(y) - g.off, g.c, fl, g.mark && Math.floor(g.pop * 20) % 2 ? 0.5 : 1);
  }
  if (phase === 'fall' && !over && k.st === 'play') {
    // sombra de destino
    let ly = Math.floor(piece.y); while (!free(piece.x, ly + 1)) ly--;
    for (let i = 0; i < 3; i++) if (ly - i >= 0) { c.globalAlpha = 0.18; drawGem(cx(piece.x), cy(ly - i), piece.g[i], 0.9); c.globalAlpha = 1; }
    for (let i = 0; i < 3; i++) { const y = Y0 + (piece.y - i) * CS + CS / 2; if (y > Y0 - CS) drawGem(cx(piece.x), y, piece.g[i], 1); }
  }
  c.restore();
  // marcador
  label(String(score), 14, 10, 26, '#fff');
  label('Récord ' + Math.max(k.best(ID, 0), score), 14, 40, 11, 'rgba(255,255,255,.65)');
  label('Nivel ' + level, W - 14, 10, 16, '#ffc94d', 'right');
  label(cleared + ' gemas', W - 14, 32, 12, 'rgba(255,255,255,.65)', 'right');
  // siguiente columna
  label('Siguiente', W / 2, 50, 11, 'rgba(255,255,255,.6)', 'center');
  if (next) for (let i = 0; i < 3; i++) drawGem(W / 2 - 34 + i * 34, 77, next[i], 0.62);
  if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); label(msg, W / 2, Y0 + ROWS * CS + 14, 20, '#a8cf3f', 'center'); c.globalAlpha = 1; }
}
spr.push(...GEM.map((_, i) => gemSprite(i)));
spr.rain = rainbowSprite();
reset();
window.__co = { get F() { return F; }, get piece() { return piece; }, get score() { return score; }, get level() { return level; }, get phase() { return phase; } };
k.show(CFG.title || 'Columnas de Joyas', 'Cae una columna de tres gemas. Muévela a los lados, tócala para rotar los colores y deslízala hacia abajo para soltarla. Tres iguales en línea (también en diagonal) desaparecen y lo de arriba cae: así se encadenan combos.<br>Toca para jugar');
k.run(update, draw);
