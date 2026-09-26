/* Burbujas y fusión (arte propio con ART, contorno #1a1530).
 * CFG.mode:
 *   'arcoiris' (Burbujas Arcoíris): lanzador sobre rejilla hexagonal, rebote en las paredes, racimos de 3+ que estallan,
 *                                   burbujas sueltas que caen y techo que baja cada varios disparos.
 *   'fruta'    (Fusión de Frutas):  gravedad hacia abajo en un tarro; dos frutas iguales se funden en la siguiente.
 *   'solar'    (Fusión Solar):      lo mismo con gravedad radial hacia el sol dentro de un anillo orbital.
 * Física de fusión: pasos fijos de 1/120 s, corrección posicional con relajación e impulsos amortiguados, velocidad
 * limitada y posición recortada dentro del recipiente en cada paso → ningún cuerpo puede salirse ni ganar energía. */
const OUT = ART.OUT, TAU = 6.2832, MODE = CFG.mode || 'arcoiris', ID = CFG.id || 'burbujas';
const W = 360, H = 640;
const k = Kit({ w: W, h: H, title: CFG.title, bg: MODE === 'solar' ? '#0c0a1f' : MODE === 'fruta' ? '#241a3d' : '#1b1436' }), c = k.ctx;
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

function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const R2 = (q) => { const x = Math.sin(q * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

if (MODE === 'arcoiris') arcoiris(); else fusion();

/* ===================================================================== Burbujas Arcoíris ===== */
function arcoiris() {
  const R = 19, RS = 33, COLS = 9, X0 = (W - COLS * 2 * R) / 2, TOP = 66, LINE = H - 104, LX = W / 2, LY = H - 56;
  const COL = [
    { c: '#ff6fb5', s: 'star' }, { c: '#5b8cff', s: 'dot' }, { c: '#a8cf3f', s: 'leaf' },
    { c: '#ffc94d', s: 'ring' }, { c: '#a097ff', s: 'tri' }, { c: '#ff7a59', s: 'cross' },
  ];
  let G, par, ang, cur, next, shot, shots, drops, score, over, slide, fallers, t, msg, msgT, sprite = [];
  const lp = { x: LX, y: LY };
  const rowPar = (r) => (r + par) & 1;              // 1 = fila corta desplazada media burbuja
  const rowLen = (r) => (rowPar(r) ? COLS - 1 : COLS);
  const cellX = (r, i) => X0 + R + i * 2 * R + (rowPar(r) ? R : 0);
  const cellY = (r) => TOP + R + r * RS;
  const ROWS = Math.ceil((LINE - TOP) / RS) + 2;

  for (let i = 0; i < COL.length; i++) sprite.push(bubbleSprite(COL[i]));
  function bubbleSprite(cc) {
    const S = R * 2 + 8;
    return off(S, S, (g) => {
      g.translate(S / 2, S / 2);
      const gr = g.createRadialGradient(-R * 0.35, -R * 0.45, R * 0.15, 0, 0, R * 1.15);
      gr.addColorStop(0, ART.lite(cc.c, 0.45)); gr.addColorStop(0.55, cc.c); gr.addColorStop(1, ART.dark(cc.c, 0.3));
      g.beginPath(); g.arc(0, 0, R - 1, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-R * 0.34, -R * 0.4, R * 0.3, R * 0.19, -0.6, 0, TAU); g.fill();
      // símbolo interior (también distingue los colores sin depender del tono)
      g.fillStyle = ART.dark(cc.c, 0.55); g.strokeStyle = ART.dark(cc.c, 0.55); g.lineWidth = 2.6; g.lineCap = 'round';
      const s = cc.s;
      if (s === 'star') { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -1.5708 + i * TAU / 10, rr = i % 2 ? 3 : 7.5; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr + 1); } g.closePath(); g.fill(); }
      else if (s === 'dot') { g.beginPath(); g.arc(0, 1, 5, 0, TAU); g.fill(); }
      else if (s === 'leaf') { g.beginPath(); g.moveTo(0, -7); g.quadraticCurveTo(7, -1, 0, 8); g.quadraticCurveTo(-7, -1, 0, -7); g.fill(); }
      else if (s === 'ring') { g.beginPath(); g.arc(0, 1, 5.5, 0, TAU); g.stroke(); }
      else if (s === 'tri') { g.beginPath(); g.moveTo(0, -6.5); g.lineTo(6.5, 5); g.lineTo(-6.5, 5); g.closePath(); g.fill(); }
      else { g.beginPath(); g.moveTo(-5, -5); g.lineTo(5, 5); g.moveTo(5, -5); g.lineTo(-5, 5); g.stroke(); }
    });
  }
  const bg = off(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2d2159'); gr.addColorStop(1, '#140f2b'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(R2(i) * W, R2(i + 31) * H, 3 + R2(i + 7) * 12, 0, TAU); g.fill(); }
    // marco del tubo
    ART.rr(g, 6, TOP - 12, W - 12, LINE - TOP + 20, 16); g.lineWidth = 5; g.strokeStyle = 'rgba(160,151,255,.35)'; g.stroke();
    ART.rr(g, 10, TOP - 9, W - 20, 9, 5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
  });

  function colorsNow() { return Math.min(COL.length, 3 + Math.floor(drops / 4)); }
  function pickColor() {
    const live = new Set();
    for (let r = 0; r < G.length; r++) for (let i = 0; i < G[r].length; i++) if (G[r][i]) live.add(G[r][i].c);
    const pool = live.size ? [...live] : [];
    return pool.length && Math.random() < 0.85 ? k.pick(pool) : k.ri(0, colorsNow() - 1);
  }
  function newRow(r) { const a = []; for (let i = 0; i < rowLen(r); i++) a.push({ c: k.ri(0, colorsNow() - 1), pop: 1 }); return a; }
  function reset() {
    par = 0; G = []; score = 0; drops = 0; shots = 7; over = 0; slide = 0; fallers = []; t = 0; msg = ''; msgT = 0; shot = null; ang = 0;
    for (let r = 0; r < 5; r++) { G.push([]); for (let i = 0; i < rowLen(r); i++) G[r].push(r < 4 || Math.random() < 0.45 ? { c: k.ri(0, 2), pop: 1 } : null); }
    cur = pickColor(); next = pickColor();
  }
  function neighbors(r, i) {
    const out = [], odd = rowPar(r);
    const add = (rr, ii) => { if (rr >= 0 && rr < G.length && ii >= 0 && ii < G[rr].length) out.push([rr, ii]); };
    add(r, i - 1); add(r, i + 1);
    add(r - 1, odd ? i : i - 1); add(r - 1, odd ? i + 1 : i);
    add(r + 1, odd ? i : i - 1); add(r + 1, odd ? i + 1 : i);
    return out;
  }
  const at = (r, i) => (G[r] && G[r][i]) || null;
  function ensureRows(r) { while (G.length <= r) { const n = G.length; G.push(new Array(rowLen(n)).fill(null)); } }
  /* casilla libre más cercana al punto de contacto (con vecina ocupada o en la primera fila) */
  function snapTo(x, y) {
    let best = null, bd = 1e9; const lim = G.length;
    for (let r = 0; r <= lim; r++) {
      ensureRows(r);
      for (let i = 0; i < G[r].length; i++) {
        if (G[r][i]) continue;
        if (r > 0 && !neighbors(r, i).some(([a, b]) => at(a, b))) continue;
        const d = (cellX(r, i) - x) ** 2 + (cellY(r) - y) ** 2;
        if (d < bd) { bd = d; best = [r, i]; }
      }
    }
    return best;
  }
  function cluster(r, i, col) {
    const seen = new Set([r + ',' + i]), q = [[r, i]], out = [[r, i]];
    while (q.length) {
      const [a, b] = q.pop();
      for (const [x, y] of neighbors(a, b)) { const key = x + ',' + y, cell = at(x, y); if (cell && !seen.has(key) && (col == null || cell.c === col)) { seen.add(key); q.push([x, y]); out.push([x, y]); } }
    }
    return out;
  }
  function detachFloating() {
    const keep = new Set();
    for (let i = 0; i < (G[0] || []).length; i++) if (G[0][i]) for (const [a, b] of cluster(0, i, null)) keep.add(a + ',' + b);
    const loose = [];
    for (let r = 0; r < G.length; r++) for (let i = 0; i < G[r].length; i++) if (G[r][i] && !keep.has(r + ',' + i)) { loose.push([r, i]); }
    for (const [r, i] of loose) { fallers.push({ x: cellX(r, i), y: cellY(r) - slide, vx: k.rnd(-40, 40), vy: -60, c: G[r][i].c }); G[r][i] = null; }
    return loose.length;
  }
  function popAt(r, i) {
    const cl = cluster(r, i, G[r][i].c);
    if (cl.length < 3) { k.sfx('click'); return 0; }
    for (const [a, b] of cl) { const cell = G[a][b]; k.burst(cellX(a, b), cellY(a) - slide, COL[cell.c].c, 7, 130); G[a][b] = null; }
    const drop = detachFloating(), pts = cl.length * 10 + drop * 25;
    score += pts; k.sfx(drop ? 'explode' : 'pop'); if (drop) k.shake(3);
    k.float('+' + pts, cellX(r, i), cellY(r) - slide - 20, drop ? '#ffd166' : '#fff');
    if (drop >= 3) { msg = '¡' + drop + ' caídas!'; msgT = 1.4; }
    return cl.length;
  }
  function pushRow() {
    drops++; par ^= 1; G.unshift(newRow(0)); slide = RS; shots = Math.max(4, 7 - Math.floor(drops / 3));
    k.sfx('hit'); k.shake(2);
  }
  function fire() {
    if (shot || over) return;
    shot = { x: LX, y: LY - 22, vx: Math.sin(ang) * 660, vy: -Math.cos(ang) * 660, c: cur };
    cur = next; next = pickColor(); k.sfx('shoot');
  }
  function stepShot(dt) {
    const steps = Math.ceil(Math.hypot(shot.vx, shot.vy) * dt / 5) || 1;
    for (let s = 0; s < steps && shot; s++) {
      shot.x += shot.vx * dt / steps; shot.y += shot.vy * dt / steps;
      if (shot.x < X0 + R) { shot.x = X0 + R; shot.vx = Math.abs(shot.vx); k.sfx('click'); }
      if (shot.x > W - X0 - R) { shot.x = W - X0 - R; shot.vx = -Math.abs(shot.vx); k.sfx('click'); }
      let hit = shot.y - R <= TOP - 2;
      if (!hit) for (let r = 0; r < G.length && !hit; r++) for (let i = 0; i < G[r].length; i++) {
        if (!G[r][i]) continue;
        const dx = cellX(r, i) - shot.x, dy = cellY(r) - slide - shot.y;
        if (dx * dx + dy * dy < (2 * R - 4) ** 2) { hit = true; break; }
      }
      if (hit) land();
    }
  }
  function land() {
    const cell = snapTo(shot.x, shot.y + slide), col = shot.c; shot = null;
    if (!cell) return;
    const [r, i] = cell; ensureRows(r); G[r][i] = { c: col, pop: 0 };
    if (!popAt(r, i)) { if (--shots <= 0) pushRow(); }
    else shots = Math.max(shots, 1);
    for (let r2 = 0; r2 < G.length; r2++) for (let i2 = 0; i2 < G[r2].length; i2++) if (G[r2][i2] && cellY(r2) + R > LINE) over = 1;
    if (over) { k.sfx('hurt'); k.shake(8); }
  }
  function update(dt) {
    t += dt;
    if (!k.gate(reset)) return;
    slide = Math.max(0, slide - dt * 90);
    for (let r = 0; r < G.length; r++) for (const cell of G[r]) if (cell) cell.pop = Math.min(1, cell.pop + dt * 6);
    for (let i = fallers.length - 1; i >= 0; i--) { const f = fallers[i]; f.vy += 1500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.y > H + 30) fallers.splice(i, 1); }
    msgT = Math.max(0, msgT - dt);
    if (over) { over += dt; if (over > 1.2) k.lose(ID, score, 'Se llenó el tubo', `${drops} bajadas del techo`); return; }
    // puntería: ratón/dedo apuntan hacia el punto tocado; cruceta y flechas giran
    const p = k.ptr;
    if (p.x !== lp.x || p.y !== lp.y) { lp.x = p.x; lp.y = p.y; if (p.y < LY - 6) ang = k.clamp(Math.atan2(p.x - LX, LY - p.y), -1.34, 1.34); }
    if (k.held.has('left')) ang = k.clamp(ang - 2.1 * dt, -1.34, 1.34);
    if (k.held.has('right')) ang = k.clamp(ang + 2.1 * dt, -1.34, 1.34);
    if (k.hit.has('a') || k.hit.has('up') || (p.up && p.y < LY - 10)) fire();
    if (k.hit.has('b') || k.hit.has('down')) { const q = cur; cur = next; next = q; k.sfx('click'); }
    if (shot) stepShot(dt);
  }
  function drawBubble(x, y, col, s) {
    const cv = sprite[col], S = (R * 2 + 8) * (s || 1);
    c.drawImage(cv, x - S / 2, y - S / 2, S, S);
  }
  function draw() {
    c.drawImage(bg, 0, 0, W, H);
    // línea de peligro
    c.save(); c.setLineDash([9, 7]); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,111,181,.7)';
    c.beginPath(); c.moveTo(12, LINE); c.lineTo(W - 12, LINE); c.stroke(); c.restore();
    // guía de puntería con un rebote
    if (!shot && !over && k.st === 'play') {
      let x = LX, y = LY - 22, vx = Math.sin(ang), vy = -Math.cos(ang), bounce = 1;
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.setLineDash([6, 10]); c.beginPath(); c.moveTo(x, y);
      for (let s = 0; s < 220; s++) {
        x += vx * 6; y += vy * 6;
        if (x < X0 + R || x > W - X0 - R) { if (!bounce--) break; x = k.clamp(x, X0 + R, W - X0 - R); vx = -vx; c.lineTo(x, y); }
        if (y < TOP + R) break;
        let stop = false;
        for (let r = 0; r < G.length && !stop; r++) for (let i = 0; i < G[r].length; i++) if (G[r][i] && (cellX(r, i) - x) ** 2 + (cellY(r) - slide - y) ** 2 < (2 * R - 4) ** 2) { stop = true; break; }
        if (stop) break;
      }
      c.lineTo(x, y); c.stroke(); c.setLineDash([]);
    }
    c.save(); c.beginPath(); c.rect(0, TOP - 6, W, H - TOP + 6); c.clip();  // las filas nuevas salen de debajo del techo, nunca sobre el marcador
    for (let r = 0; r < G.length; r++) for (let i = 0; i < G[r].length; i++) {
      const cell = G[r][i]; if (!cell) continue;
      const y = cellY(r) - slide; if (y < TOP - R) continue;
      drawBubble(cellX(r, i), y, cell.c, cell.pop < 1 ? 0.6 + 0.5 * Math.sin(cell.pop * 2.1) : 1);
    }
    c.restore();
    for (const f of fallers) drawBubble(f.x, f.y, f.c, 1);
    if (shot) drawBubble(shot.x, shot.y, shot.c, 1);
    // lanzador
    c.save(); c.translate(LX, LY); c.rotate(ang);
    ART.rr(c, -11, -34, 22, 40, 8); ART.fillOut(c, '#6e62f5', 2.6);
    c.fillStyle = 'rgba(255,255,255,.25)'; ART.rr(c, -7, -30, 6, 30, 3); c.fill();
    c.restore();
    c.beginPath(); c.arc(LX, LY + 6, 21, 0, TAU); ART.fillOut(c, '#463ac4', 2.6);
    c.beginPath(); c.arc(LX, LY + 6, 13, 0, TAU); ART.fillOut(c, '#2a2350', 2);
    if (!shot && !over) drawBubble(LX + Math.sin(ang) * 26, LY + 6 - Math.cos(ang) * 26, cur, 0.92);
    drawBubble(W - 34, LY + 2, next, 0.64);
    label('Siguiente', W - 34, LY + 22, 10, 'rgba(255,255,255,.65)', 'center');
    label('Cambiar', 34, LY + 22, 10, 'rgba(255,255,255,.5)', 'center');
    // marcador
    label(String(score), 14, 10, 24, '#fff');
    label('Récord ' + Math.max(k.best(ID, 0), score), 14, 36, 11, 'rgba(255,255,255,.65)');
    label('Techo', W - 14, 10, 12, 'rgba(255,255,255,.7)', 'right');
    for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(W - 14 - i * 12, 34, 4, 0, TAU); ART.fillOut(c, i < shots ? '#a8cf3f' : 'rgba(255,255,255,.18)', 1.5); }
    if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); label(msg, W / 2, LINE - 44, 22, '#ffd166', 'center'); c.globalAlpha = 1; }
  }
  window.__bu = { get G() { return G; }, get score() { return score; }, get shot() { return shot; }, fire, get over() { return over; } };
  reset();
  k.show(CFG.title || 'Burbujas Arcoíris', 'Apunta con el dedo o el ratón y suelta para lanzar. Tres burbujas iguales estallan y las que se quedan sueltas caen. Cada pocos disparos baja el techo: no dejes que llegue a la línea rosa.<br>Toca para jugar');
  k.run(update, draw);
}

/* ===================================================================== Fusión (frutas / solar) ===== */
function fusion() {
  const SOLAR = MODE === 'solar';
  const BOX = { l: 32, r: W - 32, top: 168, bot: H - 34 };
  const CEN = { x: W / 2, y: 348, R: 166, sun: 30 };
  const G0 = 1500, GS = 900;                         // gravedad recta / radial
  const SUB = 1 / 120, MAXV = 900, ITER = 8;
  const FRUIT = [
    { n: 'Cereza', r: 12, c: '#ff5470', d: 'stem' }, { n: 'Fresa', r: 16, c: '#ff3f6e', d: 'seeds' },
    { n: 'Uva', r: 21, c: '#a097ff', d: 'stem' }, { n: 'Mandarina', r: 26, c: '#ff9a3d', d: 'wedge' },
    { n: 'Naranja', r: 32, c: '#ff7a1f', d: 'wedge' }, { n: 'Kiwi', r: 39, c: '#a8cf3f', d: 'seeds' },
    { n: 'Manzana', r: 47, c: '#ff4d5e', d: 'stem' }, { n: 'Pomelo', r: 56, c: '#ff6fb5', d: 'wedge' },
    { n: 'Melocotón', r: 66, c: '#ffb36b', d: 'stem' }, { n: 'Melón', r: 77, c: '#d6e86a', d: 'stripe' },
    { n: 'Sandía', r: 89, c: '#5bbd63', d: 'stripe' },
  ];
  const PLAN = [
    { n: 'Polvo', r: 10, c: '#b9b4d6', d: 'rock' }, { n: 'Asteroide', r: 13, c: '#8f89b5', d: 'rock' },
    { n: 'Luna', r: 17, c: '#dfe2f2', d: 'rock' }, { n: 'Mercurio', r: 21, c: '#c08a5a', d: 'rock' },
    { n: 'Marte', r: 26, c: '#e0674a', d: 'rock' }, { n: 'Tierra', r: 32, c: '#5b8cff', d: 'earth' },
    { n: 'Neptuno', r: 39, c: '#5fc7ff', d: 'bands' }, { n: 'Júpiter', r: 47, c: '#ffc94d', d: 'bands' },
    { n: 'Saturno', r: 56, c: '#ffd9a0', d: 'ring' }, { n: 'Enana roja', r: 66, c: '#ff7a59', d: 'star' },
    { n: 'Estrella', r: 78, c: '#fff1a8', d: 'star' },
  ];
  const T = SOLAR ? PLAN : FRUIT, MAXSPAWN = SOLAR ? 3 : 4;
  let B, score, best5, aim, cur, next, cool, over, danger, t, seq, spr = [];

  for (let i = 0; i < T.length; i++) spr.push(sprite(i));
  function sprite(i) {
    const o = T[i], r = o.r, S = r * 2 + 10;
    return off(S, S, (g) => {
      g.translate(S / 2, S / 2);
      if (o.d === 'ring') { g.save(); g.rotate(-0.35); g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 0.42, 0, 0, TAU); g.lineWidth = r * 0.22; g.strokeStyle = ART.dark('#ffd9a0', 0.25); g.stroke(); g.restore(); }
      const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.2);
      gr.addColorStop(0, ART.lite(o.c, 0.5)); gr.addColorStop(0.55, o.c); gr.addColorStop(1, ART.dark(o.c, 0.32));
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
      g.save(); g.beginPath(); g.arc(0, 0, r - 1, 0, TAU); g.clip();
      const D = ART.dark(o.c, 0.34), L = ART.lite(o.c, 0.4);
      if (o.d === 'stripe') { g.strokeStyle = D; g.lineWidth = r * 0.17; for (let j = -3; j <= 3; j++) { g.beginPath(); g.moveTo(j * r * 0.42, -r); g.quadraticCurveTo(j * r * 0.55, 0, j * r * 0.42, r); g.stroke(); } }
      else if (o.d === 'seeds') { g.fillStyle = D; for (let j = 0; j < 9; j++) { const a = j * 0.7, rr = r * (0.3 + (j % 3) * 0.22); g.beginPath(); g.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.07 + 1, r * 0.11 + 1.4, a, 0, TAU); g.fill(); } }
      else if (o.d === 'wedge') { g.strokeStyle = ART.alpha('#ffffff', 0.35); g.lineWidth = 2; for (let j = 0; j < 6; j++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(j * 1.05) * r, Math.sin(j * 1.05) * r); g.stroke(); } }
      else if (o.d === 'bands') { g.fillStyle = ART.alpha(D, 0.55); for (let j = -2; j <= 2; j++) { g.beginPath(); g.ellipse(0, j * r * 0.42, r, r * 0.13, 0, 0, TAU); g.fill(); } }
      else if (o.d === 'earth') { g.fillStyle = '#a8cf3f'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.1, r * 0.42, r * 0.3, 0.4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(r * 0.35, r * 0.35, r * 0.3, r * 0.22, -0.3, 0, TAU); g.fill(); }
      else if (o.d === 'rock') { g.fillStyle = ART.alpha(D, 0.7); for (let j = 0; j < 5; j++) { const a = j * 1.4, rr = r * 0.55; g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * (0.1 + R2(i * 7 + j) * 0.12), 0, TAU); g.fill(); } }
      else if (o.d === 'star') { g.fillStyle = ART.alpha(L, 0.8); for (let j = 0; j < 7; j++) { const a = j * 0.9; g.beginPath(); g.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.16, 0, TAU); g.fill(); } }
      g.restore();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-r * 0.33, -r * 0.4, r * 0.28, r * 0.17, -0.6, 0, TAU); g.fill();
      if (!SOLAR && (o.d === 'stem')) { g.strokeStyle = '#7a4a2a'; g.lineWidth = Math.max(2, r * 0.09); g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -r + 2); g.lineTo(r * 0.12, -r - r * 0.22); g.stroke(); g.beginPath(); g.ellipse(r * 0.3, -r - r * 0.16, r * 0.26, r * 0.12, -0.45, 0, TAU); ART.fillOut(g, '#5ccf5a', 1.8); }
      // carita amable en las piezas grandes
      if (r >= 26) {
        const ey = r * 0.1;
        for (const s of [-1, 1]) { g.beginPath(); g.arc(s * r * 0.3, ey, r * 0.13, 0, TAU); ART.fillOut(g, '#fff', 1.5); g.fillStyle = OUT; g.beginPath(); g.arc(s * r * 0.3 + r * 0.04, ey, r * 0.07, 0, TAU); g.fill(); }
        g.strokeStyle = OUT; g.lineWidth = Math.max(1.8, r * 0.05); g.lineCap = 'round'; g.beginPath(); g.arc(0, ey + r * 0.12, r * 0.22, 0.5, 2.64); g.stroke();
      }
    });
  }
  const bg = off(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    if (SOLAR) { gr.addColorStop(0, '#191140'); gr.addColorStop(1, '#070515'); } else { gr.addColorStop(0, '#3a2b63'); gr.addColorStop(1, '#1a1230'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (SOLAR) { g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 70; i++) { const s = R2(i) * 1.6 + 0.4; g.globalAlpha = 0.3 + R2(i + 5) * 0.6; g.beginPath(); g.arc(R2(i + 11) * W, R2(i + 23) * H, s, 0, TAU); g.fill(); } g.globalAlpha = 1; }
    else { g.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(R2(i) * W, R2(i + 3) * H, 8 + R2(i + 9) * 22, 0, TAU); g.fill(); } }
  });

  function reset() {
    B = []; score = 0; over = 0; danger = 0; t = 0; cool = 0; seq = 0;
    aim = SOLAR ? -1.5708 : W / 2;
    cur = k.ri(0, MAXSPAWN - 1); next = k.ri(0, MAXSPAWN - 1);
  }
  function add(tier, x, y, vx, vy) { const b = { t: tier, r: T[tier].r, x, y, vx: vx || 0, vy: vy || 0, age: 0, pop: 0, id: ++seq }; B.push(b); return b; }
  function drop() {
    if (cool > 0 || over) return;
    if (SOLAR) { const r = CEN.R - T[cur].r - 2; add(cur, CEN.x + Math.cos(aim) * r, CEN.y + Math.sin(aim) * r, -Math.cos(aim) * 60, -Math.sin(aim) * 60); }
    else add(cur, k.clamp(aim, BOX.l + T[cur].r + 1, BOX.r - T[cur].r - 1), BOX.top - 26, 0, 40);
    cur = next; next = k.ri(0, MAXSPAWN - 1); cool = 0.45; k.sfx('pop');
  }
  /* ---------- física: pasos fijos, impulsos amortiguados y recorte dentro del recipiente ---------- */
  function clampIn(b) {
    if (SOLAR) {
      const dx = b.x - CEN.x, dy = b.y - CEN.y; let d = Math.hypot(dx, dy);
      if (d < 1e-4) { b.x += 0.1; d = 0.1; }
      const nx = dx / d, ny = dy / d, out = CEN.R - b.r, inn = CEN.sun + b.r;
      if (d > out) { b.x = CEN.x + nx * out; b.y = CEN.y + ny * out; const vn = b.vx * nx + b.vy * ny; if (vn > 0) { b.vx -= vn * 1.35 * nx; b.vy -= vn * 1.35 * ny; } }
      else if (d < inn) { b.x = CEN.x + nx * inn; b.y = CEN.y + ny * inn; const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= vn * 1.35 * nx; b.vy -= vn * 1.35 * ny; } }
    } else {
      if (b.x < BOX.l + b.r) { b.x = BOX.l + b.r; if (b.vx < 0) b.vx *= -0.25; }
      if (b.x > BOX.r - b.r) { b.x = BOX.r - b.r; if (b.vx > 0) b.vx *= -0.25; }
      if (b.y > BOX.bot - b.r) { b.y = BOX.bot - b.r; if (b.vy > 0) b.vy *= -0.18; b.vx *= 0.9; }
      if (b.y < -200) b.y = -200;
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAXV) { b.vx *= MAXV / sp; b.vy *= MAXV / sp; }
    if (!isFinite(b.x) || !isFinite(b.y)) { b.x = SOLAR ? CEN.x : (BOX.l + BOX.r) / 2; b.y = SOLAR ? CEN.y - CEN.sun - b.r - 1 : BOX.bot - b.r; b.vx = b.vy = 0; }
  }
  function merges() {
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], b = B[j];
      if (a.t !== b.t || a.t >= T.length - 1 || a.dead || b.dead || a.age < 0.08 || b.age < 0.08) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > a.r + b.r + 0.6) continue;                 // fusiona al tocarse: el solver deja las piezas justo en contacto
      a.dead = b.dead = true;
      const nt = a.t + 1, n = add(nt, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.vx + b.vx) / 2, (a.vy + b.vy) / 2);
      clampIn(n); n.pop = 1; const pts = (nt + 1) * (nt + 2) / 2; score += pts;
      k.burst(n.x, n.y, T[nt].c, 12, 150); k.float('+' + pts, n.x, n.y - n.r - 8, '#ffd166');
      k.sfx(nt >= 7 ? 'win' : 'coin'); if (nt >= 6) k.shake(3);
      if (nt === T.length - 1) { k.confetti(T[nt].c, 40); k.flash('rgba(255,255,255,.25)'); }
    }
    if (B.some((b) => b.dead)) B = B.filter((b) => !b.dead);
  }
  function step(dt) {
    for (const b of B) {
      b.age += dt;
      if (SOLAR) { const dx = CEN.x - b.x, dy = CEN.y - b.y, d = Math.hypot(dx, dy) || 1; b.vx += dx / d * GS * dt; b.vy += dy / d * GS * dt; }
      else b.vy += G0 * dt;
      b.vx *= 0.999; b.vy *= 0.999;
      b.x += b.vx * dt; b.y += b.vy * dt;
      clampIn(b);
    }
    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j], dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy); const sum = a.r + b.r;
        if (d >= sum || d < 1e-6) { if (d < 1e-6) { b.x += 0.3; b.y -= 0.3; } continue; }
        const nx = dx / d, ny = dy / d, ov = sum - d;
        const ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
        const corr = Math.max(0, ov - 0.05) * 0.85;
        a.x -= nx * corr * (mb / tot); a.y -= ny * corr * (mb / tot);
        b.x += nx * corr * (ma / tot); b.y += ny * corr * (ma / tot);
        if (it === 0) {           // impulso normal con restitución baja y rozamiento tangencial
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            const jn = -(1 + 0.08) * vn / (1 / ma + 1 / mb);
            a.vx -= jn * nx / ma; a.vy -= jn * ny / ma; b.vx += jn * nx / mb; b.vy += jn * ny / mb;
            const tx = -ny, ty = nx, vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty, jt = -vt * 0.22 / (1 / ma + 1 / mb);
            a.vx -= jt * tx / ma; a.vy -= jt * ty / ma; b.vx += jt * tx / mb; b.vy += jt * ty / mb;
          }
        }
      }
      for (const b of B) clampIn(b);
    }
    merges();
  }
  function outside(b) {
    if (SOLAR) return Math.hypot(b.x - CEN.x, b.y - CEN.y) + b.r > CEN.R + 1.5;
    return b.x - b.r < BOX.l - 1.5 || b.x + b.r > BOX.r + 1.5 || b.y + b.r > BOX.bot + 1.5;
  }
  function peril() {
    // pieza quieta rozando el borde de salida (aro exterior o boca del tarro)
    for (const b of B) {
      if (b.age < 1.2 || Math.hypot(b.vx, b.vy) > 45) continue;
      if (SOLAR) { if (Math.hypot(b.x - CEN.x, b.y - CEN.y) + b.r > CEN.R - 6) return true; }
      else if (b.y - b.r < BOX.top + 4) return true;
    }
    return false;
  }
  function update(dt) {
    t += dt;
    for (const b of B) b.pop = Math.max(0, b.pop - dt * 4);
    if (!k.gate(reset)) return;
    cool = Math.max(0, cool - dt);
    if (over) { over += dt; if (over > 1.1) k.lose(ID, score, SOLAR ? 'El anillo se llenó' : 'El tarro rebosa', `Mayor: ${T[Math.max(0, ...B.map((b) => b.t))].n}`); return; }
    // control: dedo/ratón coloca la pieza (ángulo en el modo solar), cruceta y flechas la mueven
    const p = k.ptr;
    if (SOLAR) {
      if (p.down || p.hit) aim = Math.atan2(p.y - CEN.y, p.x - CEN.x);
      const d = (k.held.has('right') ? 1 : 0) - (k.held.has('left') ? 1 : 0); if (d) aim += d * 1.6 * dt;
    } else {
      if (p.down || p.hit) aim = p.x;
      const d = (k.held.has('right') ? 1 : 0) - (k.held.has('left') ? 1 : 0); if (d) aim = k.clamp(aim + d * 260 * dt, BOX.l, BOX.r);
    }
    if (p.up || k.hit.has('a') || k.hit.has('down') || k.hit.has('up')) drop();
    let n = 0; for (let acc = dt; acc > 0 && n < 5; acc -= SUB, n++) step(Math.min(SUB, acc));
    if (t > 5 && peril()) { danger += dt; if (danger > 2.2) { over = 0.001; k.sfx('hurt'); k.shake(7); } } else danger = Math.max(0, danger - dt * 1.5);
  }
  function drawBody(b) {
    const S = (b.r * 2 + 10) * (1 + b.pop * 0.22);
    c.save(); c.translate(b.x, b.y);
    if (SOLAR) c.rotate(Math.atan2(b.y - CEN.y, b.x - CEN.x) + 1.5708);
    c.drawImage(spr[b.t], -S / 2, -S / 2, S, S); c.restore();
  }
  function draw() {
    c.drawImage(bg, 0, 0, W, H);
    if (SOLAR) {
      c.beginPath(); c.arc(CEN.x, CEN.y, CEN.R, 0, TAU); c.lineWidth = 6; c.strokeStyle = danger > 0.6 ? '#ff6fb5' : 'rgba(160,151,255,.5)'; c.stroke();
      c.beginPath(); c.arc(CEN.x, CEN.y, CEN.R - 4, 0, TAU); c.fillStyle = 'rgba(110,98,245,.07)'; c.fill();
      const gr = c.createRadialGradient(CEN.x, CEN.y, 4, CEN.x, CEN.y, CEN.sun * 2.2);
      gr.addColorStop(0, '#fff6c2'); gr.addColorStop(0.4, '#ffc94d'); gr.addColorStop(1, 'rgba(255,201,77,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(CEN.x, CEN.y, CEN.sun * 2.2, 0, TAU); c.fill();
      c.beginPath(); c.arc(CEN.x, CEN.y, CEN.sun, 0, TAU); ART.fillOut(c, '#ffd23d', 2.6);
      for (const s of [-1, 1]) { c.beginPath(); c.arc(CEN.x + s * 9, CEN.y - 3, 3, 0, TAU); c.fillStyle = OUT; c.fill(); }
      c.strokeStyle = OUT; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.arc(CEN.x, CEN.y + 2, 7, 0.5, 2.64); c.stroke();
    } else {
      ART.rr(c, BOX.l - 10, BOX.top - 6, BOX.r - BOX.l + 20, BOX.bot - BOX.top + 16, 22);
      c.lineWidth = 8; c.strokeStyle = 'rgba(160,151,255,.4)'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.04)'; c.fill();
      c.save(); c.setLineDash([9, 8]); c.lineWidth = 3; c.strokeStyle = danger > 0.6 ? '#ff6fb5' : 'rgba(255,255,255,.35)';
      c.beginPath(); c.moveTo(BOX.l - 6, BOX.top); c.lineTo(BOX.r + 6, BOX.top); c.stroke(); c.restore();
    }
    for (const b of B) drawBody(b);
    // pieza en espera
    if (!over && k.st === 'play') {
      const r = T[cur].r;
      if (SOLAR) { const d = CEN.R + 22, x = CEN.x + Math.cos(aim) * d, y = CEN.y + Math.sin(aim) * d; drawBody({ x, y, r, t: cur, pop: 0 });
        c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.setLineDash([5, 8]); c.beginPath(); c.moveTo(x, y); c.lineTo(CEN.x, CEN.y); c.stroke(); c.setLineDash([]); }
      else { const x = k.clamp(aim, BOX.l + r, BOX.r - r); drawBody({ x, y: BOX.top - 26, r, t: cur, pop: 0 });
        c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2; c.setLineDash([5, 8]); c.beginPath(); c.moveTo(x, BOX.top - 26 + r); c.lineTo(x, BOX.bot); c.stroke(); c.setLineDash([]); }
    }
    // marcador
    label(String(score), 14, 10, 26, '#fff');
    label('Récord ' + Math.max(k.best(ID, 0), score), 14, 40, 11, 'rgba(255,255,255,.65)');
    const nr = Math.min(20, T[next].r), S = (T[next].r * 2 + 10) * nr / T[next].r;
    c.drawImage(spr[next], W - 30 - S / 2, 24 - S / 2 + 6, S, S);
    label('Siguiente', W - 30, 44, 10, 'rgba(255,255,255,.65)', 'center');
    if (danger > 0.6 && !over) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 12); label('¡Cuidado!', W / 2, SOLAR ? 108 : BOX.top - 52, 18, '#ff6fb5', 'center'); c.globalAlpha = 1; }
  }
  /* pruebas: simulación sin dibujar (window.__fu.sim(n) devuelve cuántos cuerpos se salieron) */
  window.__fu = {
    get B() { return B; }, get score() { return score; }, T, BOX, CEN, SOLAR, drop,
    sim(n, every) {
      let bad = 0;
      for (let i = 0; i < n; i++) {
        if (every && i % every === 0) { cool = 0; aim = SOLAR ? Math.random() * TAU : k.rnd(BOX.l + 20, BOX.r - 20); drop(); }
        step(SUB);
        for (const b of B) if (outside(b)) bad++;
      }
      return bad;
    },
  };
  reset();
  k.show(CFG.title || (SOLAR ? 'Fusión Solar' : 'Fusión de Frutas'),
    SOLAR ? 'Gira alrededor del anillo y suelta planetas hacia el sol. Dos iguales se funden en el siguiente. Si el montón toca el anillo, se acabó.<br>Toca para jugar'
      : 'Mueve la fruta y suéltala en el tarro. Dos frutas iguales se funden en la siguiente, más grande. Si el montón rebosa por la boca, se acabó.<br>Toca para jugar');
  k.run(update, draw);
}
