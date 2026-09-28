/* Puzles lógicos con solución única. CFG.mode: 'puentes' | 'estrellas' | 'tiendas' | 'suma' | 'gatos'
 * Los tableros los genera L2GEN (src/eng/l2gen.js), que verifica por fuerza bruta que la solución
 * es única (en «suma», que la rejilla se puede vaciar entera por construcción).
 * 20 niveles por juego con progreso guardado por dificultad, pista, reinicio y final de verdad.
 * Arte propio: mar con oleaje, campo de hierba, comarcas de colores, cajas de madera y gatos. */
const M = CFG.mode, W = 480, H = 620, OUT = ART.OUT, R2 = 6.2832;
const TH = {
  puentes: { bg: ['#1b5674', '#0b2333'], ac: '#6fd6e8', panel: '#123a50' },
  estrellas: { bg: ['#2a2350', '#110d24'], ac: '#ffd23d', panel: '#1d1740' },
  tiendas: { bg: ['#3a6b34', '#132612'], ac: '#ffd23d', panel: '#274a24' },
  suma: { bg: ['#3d2f55', '#170f26'], ac: '#7cf7a0', panel: '#2a2040' },
  gatos: { bg: ['#4a3426', '#1b110a'], ac: '#ffc94d', panel: '#33231a' },
}[M];
const k = Kit({ w: W, h: H, title: CFG.title, bg: TH.bg[1] }), c = k.ctx;
/* ---------- R5 §8 «pieza única» + cartoon de estudio (helpers locales) ---------- */
function uni(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = (ow || 1.5) * 2;
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
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.7 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, R2); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, R2); g.fill(); }
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms);
const cv = (w, h) => { const q = document.createElement('canvas'); q.width = Math.ceil(w * CDPR); q.height = Math.ceil(h * CDPR); const g = q.getContext('2d'); g.scale(CDPR, CDPR); return [q, g]; };
const rndf = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const HUDH = 76, BOT = 58;
const REG = ['#6e62f5', '#ff6fb5', '#5b8cff', '#a8cf3f', '#ffc94d', '#4ec9b0', '#ff8a5b', '#b98cff', '#e5556e'];
const CATS = [['Michi', '#ffc94d'], ['Nube', '#e8eef7'], ['Bigotes', '#ff8a5b'], ['Sombra', '#6b6486'], ['Trufa', '#a8cf3f'], ['Pelusa', '#ff6fb5']];

let level = 1, score = 0, t = 0, done = false, doneT = 0, P = null, N = 8, S = 40, OX = 0, OY = 0;
let cell = null, ev = null, EC = null, sel = null, gg = null, undo = [], asg = null, selCat = null;
let msg = '', msgT = 0, hints = 0, anim = null, bgCv = null, boardCv = null, fx = [], moves = 0;
let btns = [], cur = [0, 0], kb = false;

/* ---------- generación por nivel ---------- */
function sizes() {
  const d = k.dif - 1; /* fácil -1 · normal 0 · difícil +1 */
  if (M === 'puentes') return { N: Math.min(9, 5 + Math.floor((level - 1) / 4) + (d > 0 ? 1 : 0)), want: Math.max(5, Math.min(16, 6 + Math.floor(level * 0.6) + d * 2)) };
  if (M === 'estrellas') return { N: Math.max(5, Math.min(8, 5 + Math.floor((level - 1) / 6) + d)) };
  if (M === 'tiendas') return { N: Math.max(6, Math.min(8, 6 + Math.floor((level - 1) / 8) + (d > 0 ? 1 : 0))), want: Math.max(3, Math.min(11, 3 + Math.floor(level * 0.4) + d)) };
  if (M === 'suma') return { R: Math.min(9, 4 + Math.floor(level / 3) + d), C: Math.min(7, 4 + Math.floor(level / 5)) };
  return { n: Math.max(4, Math.min(6, 4 + Math.floor((level - 1) / 7) + (d > 0 ? 1 : 0))) };
}
function build() {
  const s = sizes();
  done = false; doneT = 0; t = 0; sel = null; selCat = null; msg = ''; msgT = 0; hints = 0; undo = []; fx = []; moves = 0; boardCv = null;
  for (let a = 0; a < 6 && !P; a++) {
    if (M === 'puentes') P = L2GEN.puentes(s.N, s.want);
    else if (M === 'estrellas') P = L2GEN.estrellas(s.N);
    else if (M === 'tiendas') P = L2GEN.tiendas(s.N, s.want);
    else if (M === 'suma') P = L2GEN.suma(s.R, s.C);
    else P = L2GEN.gatos(s.n);
  }
  if (!P) { /* red de seguridad: un tablero pequeño siempre sale */
    P = M === 'puentes' ? L2GEN.puentes(5, 5) : M === 'estrellas' ? L2GEN.estrellas(5) : M === 'tiendas' ? L2GEN.tiendas(6, 3) : M === 'suma' ? L2GEN.suma(4, 4) : L2GEN.gatos(4);
  }
  if (M === 'puentes') { N = P.N; EC = L2GEN.pzCand(P.isl); ev = EC.map(() => 0); }
  if (M === 'estrellas') { N = P.N; cell = new Int8Array(N * N); }
  if (M === 'tiendas') { N = P.N; cell = new Int8Array(N * N); }
  if (M === 'suma') { gg = P.g.slice(); }
  if (M === 'gatos') { asg = Array(P.n).fill(-1); }
  anim = new Float32Array(M === 'suma' ? P.R * P.C : M === 'gatos' ? P.n : N * N);
  cur = [0, 0]; layout();
}
function newP() { P = null; build(); }

function layout() {
  const av = H - HUDH - BOT - 16;
  if (M === 'suma') { S = Math.floor(Math.min((W - 44) / P.C, av / P.R, 74)); OX = Math.floor((W - P.C * S) / 2); OY = Math.floor(HUDH + (av - P.R * S) / 2) + 8; return; }
  /* gatos: las pistas mandan arriba, las cajas caen justo debajo y la bandeja se queda abajo */
  if (M === 'gatos') { S = Math.floor(Math.min((W - 40) / P.n, 84)); OX = Math.floor((W - P.n * S) / 2); OY = Math.min(H - BOT - 210, HUDH + 16 + P.clues.length * 17 + 40); return; }
  const pad = M === 'tiendas' ? 30 : 0; /* franja de pistas arriba y a la izquierda */
  S = Math.floor(Math.min((W - 36 - pad) / N, (av - pad) / N, 72));
  OX = Math.floor((W - N * S + pad) / 2); OY = Math.floor(HUDH + pad + (av - pad - N * S) / 2) + 6;
}

/* ---------- comprobación de victoria ---------- */
function solved() {
  if (M === 'puentes') {
    const deg = P.isl.map(() => 0);
    for (let i = 0; i < EC.length; i++) if (ev[i]) { deg[EC[i].i] += ev[i]; deg[EC[i].j] += ev[i]; }
    if (!deg.every((v, i) => v === P.isl[i].n)) return false;
    const n = P.isl.length, adj = Array.from({ length: n }, () => []);
    for (let i = 0; i < EC.length; i++) if (ev[i]) { adj[EC[i].i].push(EC[i].j); adj[EC[i].j].push(EC[i].i); }
    const seen = new Uint8Array(n), st = [0]; seen[0] = 1; let m = 1;
    while (st.length) { const u = st.pop(); for (const w of adj[u]) if (!seen[w]) { seen[w] = 1; m++; st.push(w); } }
    return m === n;
  }
  if (M === 'estrellas') {
    const col = Array(N).fill(0), row = Array(N).fill(0), rg = Array(N).fill(0);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (cell[y * N + x] === 2) {
      row[y]++; col[x]++; rg[P.reg[y * N + x]]++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && x + dx >= 0 && x + dx < N && y + dy >= 0 && y + dy < N && cell[(y + dy) * N + x + dx] === 2) return false;
    }
    return row.every((v) => v === 1) && col.every((v) => v === 1) && rg.every((v) => v === 1);
  }
  if (M === 'tiendas') {
    const tents = [];
    for (let i = 0; i < N * N; i++) if (cell[i] === 2) tents.push(i);
    if (tents.length !== P.trees.length) return false;
    const row = Array(N).fill(0), col = Array(N).fill(0);
    for (const i of tents) { row[(i / N) | 0]++; col[i % N]++; }
    if (!row.every((v, y) => v === P.rows[y]) || !col.every((v, x) => v === P.cols[x])) return false;
    for (const i of tents) { const x = i % N, y = (i / N) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && cell[(y + dy) * N + x + dx] === 2 && x + dx >= 0 && x + dx < N && y + dy >= 0 && y + dy < N) return false; }
    const set = new Set(tents), sol = new Set(P.sol);
    if (tents.length !== sol.size) return false;
    /* con solución única, la única colocación válida es la del generador */
    for (const i of set) if (!sol.has(i)) return false;
    return true;
  }
  if (M === 'suma') return gg.every((v) => !v);
  return asg.every((v, i) => v >= 0 && P.sol[v] === i);
}
function win() {
  if (done) return; done = true; doneT = 0;
  const gain = Math.max(60, 900 - Math.floor(t) * 4 - hints * 120) * level;
  score += gain; k.best(CFG.id, score); k.sfx('coin'); k.confetti();
  k.float('+' + gain, W / 2, OY + 30, TH.ac);
  later(() => k.levelDone(score, `Nivel ${level}/20 · ${Math.floor(t)} s${hints ? ' · ' + hints + ' pistas' : ''}`), 1200);
}
function check() { if (!done && solved()) win(); }

/* ---------- pista ---------- */
function hint() {
  if (done) return;
  hints++; k.sfx('pop'); k.shake(4);
  if (M === 'puentes') {
    const sol = L2GEN.puentesSol(P.isl);
    for (const e of sol) { const i = EC.findIndex((q) => q.i === e.i && q.j === e.j); if (i >= 0 && ev[i] !== e.c) { ev[i] = e.c; say('Un puente colocado'); check(); return; } }
    say('Ya está todo en su sitio');
  } else if (M === 'estrellas') {
    for (let y = 0; y < N; y++) if (cell[y * N + P.sol[y]] !== 2) { for (let x = 0; x < N; x++) if (cell[y * N + x] === 2) cell[y * N + x] = 0; cell[y * N + P.sol[y]] = 2; anim[y * N + P.sol[y]] = 1; say('Una estrella revelada'); check(); return; }
    say('Ya están todas');
  } else if (M === 'tiendas') {
    for (const i of P.sol) if (cell[i] !== 2) { cell[i] = 2; anim[i] = 1; say('Una tienda revelada'); check(); return; }
    say('Ya están todas');
  } else if (M === 'suma') {
    const mv = L2GEN.sumaMove(P.R, P.C, gg);
    if (mv) { sel = mv[0]; say('Prueba con esta pareja'); } else say('No quedan parejas');
  } else {
    for (let i = 0; i < P.n; i++) if (asg[P.sol[i]] !== i) { const b = P.sol[i]; for (let j = 0; j < P.n; j++) if (asg[j] === i) asg[j] = -1; asg[b] = i; anim[b] = 1; say('Un gato colocado'); check(); return; }
    say('Ya están todos');
  }
}
const say = (s) => { msg = s; msgT = 2.2; };

/* ---------- entrada ---------- */
function tapAt(px, py) {
  if (done) return;
  for (const b of btns) if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) { b.f(); return; }
  if (M === 'puentes') return tapPuentes(px, py);
  if (M === 'suma') return tapSuma(px, py);
  if (M === 'gatos') return tapGatos(px, py);
  const x = Math.floor((px - OX) / S), y = Math.floor((py - OY) / S);
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  const i = y * N + x;
  if (M === 'tiendas' && P.trees.indexOf(i) >= 0) return;
  cell[i] = (cell[i] + 1) % 3; anim[i] = 1; moves++;
  k.sfx(cell[i] === 2 ? 'coin' : cell[i] === 1 ? 'click' : 'pop');
  check();
}
function islAt(px, py) { for (let i = 0; i < P.isl.length; i++) { const q = P.isl[i], cx = OX + (q.x + 0.5) * S, cy = OY + (q.y + 0.5) * S; if (Math.hypot(px - cx, py - cy) < S * 0.52) return i; } return -1; }
function tapPuentes(px, py) {
  const i = islAt(px, py);
  if (i < 0) { sel = null; return; }
  if (sel === null || sel === i) { sel = sel === i ? null : i; k.sfx('click'); return; }
  const e = EC.findIndex((q) => (q.i === sel && q.j === i) || (q.j === sel && q.i === i));
  if (e < 0) { say('No están alineadas'); k.sfx('hurt'); sel = i; return; }
  const nv = (ev[e] + 1) % 3;
  if (nv > ev[e]) { /* no se puede cruzar otro puente */
    for (let j = 0; j < EC.length; j++) if (j !== e && ev[j] && L2GEN.pzCross(EC[e], EC[j])) { say('Los puentes no se cruzan'); k.sfx('hurt'); k.shake(5); sel = null; return; }
  }
  ev[e] = nv; moves++; sel = null; k.sfx(nv ? 'click' : 'pop');
  fx.push({ e, t: 0.4 });
  check();
}
function tapSuma(px, py) {
  const x = Math.floor((px - OX) / S), y = Math.floor((py - OY) / S);
  if (x < 0 || y < 0 || x >= P.C || y >= P.R) { sel = null; return; }
  const i = y * P.C + x;
  if (!gg[i]) { sel = null; return; }
  if (sel === null) { sel = i; k.sfx('click'); return; }
  if (sel === i) { sel = null; return; }
  const sx = sel % P.C, sy = (sel / P.C) | 0;
  if (Math.abs(sx - x) + Math.abs(sy - y) !== 1) { sel = i; k.sfx('click'); return; }
  if (gg[sel] + gg[i] !== 10) { say('No suman diez'); k.sfx('hurt'); k.shake(4); sel = null; return; }
  undo.push([sel, gg[sel], i, gg[i]]);
  k.burst(OX + (x + 0.5) * S, OY + (y + 0.5) * S, TH.ac, 12);
  gg[sel] = 0; gg[i] = 0; anim[sel] = 1; anim[i] = 1; sel = null; moves++;
  score += 20; k.sfx('coin');
  check();
  if (!done && !L2GEN.sumaMove(P.R, P.C, gg)) say('Sin parejas: usa Deshacer');
}
function tapGatos(px, py) {
  const ty = H - BOT - 92;
  if (py >= ty && py <= ty + 78) { const bw = Math.floor((W - 24) / P.n); const i = Math.floor((px - 12) / bw); if (i >= 0 && i < P.n) { selCat = selCat === i ? null : i; k.sfx('click'); } return; }
  if (py >= OY && py <= OY + S * 1.1) {
    const i = Math.floor((px - OX) / S);
    if (i < 0 || i >= P.n) return;
    if (asg[i] >= 0) { asg[i] = -1; k.sfx('pop'); return; }
    if (selCat === null) return;
    for (let j = 0; j < P.n; j++) if (asg[j] === selCat) asg[j] = -1;
    asg[i] = selCat; anim[i] = 1; selCat = null; moves++; k.sfx('click'); check();
  }
}

/* ---------- fondo ---------- */
function drawBg() {
  if (bgCv) return;
  const [q, g] = cv(W, H); bgCv = q;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, TH.bg[0]); gr.addColorStop(1, TH.bg[1]);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (M === 'puentes') { g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 3;
    for (let i = 0; i < 46; i++) { const y = 40 + rndf(i) * (H - 60), x = rndf(i + 9) * W; g.beginPath(); g.moveTo(x - 18, y); g.quadraticCurveTo(x - 9, y - 5, x, y); g.quadraticCurveTo(x + 9, y + 5, x + 18, y); g.stroke(); } }
  if (M === 'tiendas') { for (let i = 0; i < 260; i++) { const x = rndf(i) * W, y = rndf(i + 3) * H; g.strokeStyle = 'rgba(255,255,255,' + (0.03 + rndf(i + 7) * 0.05) + ')'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1.5, y - 7); g.stroke(); } }
  if (M === 'estrellas') { for (let i = 0; i < 90; i++) { const x = rndf(i) * W, y = rndf(i + 5) * H, r = 0.7 + rndf(i + 11) * 1.5; g.fillStyle = 'rgba(255,255,255,' + (0.1 + rndf(i + 2) * 0.35) + ')'; g.beginPath(); g.arc(x, y, r, 0, R2); g.fill(); } }
  if (M === 'gatos' || M === 'suma') { for (let i = 0; i < 160; i++) { const x = rndf(i) * W, y = rndf(i + 4) * H; g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(x, y, 3, 3); } }
  g.fillStyle = 'rgba(10,6,22,.34)';
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,4,18,.5)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

/* ---------- dibujo de piezas ---------- */
function star(g, x, y, r, col) {
  const p = [(h) => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.44 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? h.lineTo(px, py) : h.moveTo(px, py); } h.closePath(); }, col];
  contact(g, x, y + r * 0.8, r * 0.7, r * 0.25, 0.28);
  uni(g, [p], 1.5); celp(g, [p], col, r * 0.2, r * 0.22); spec(g, x - r * 0.22, y - r * 0.3, r * 0.18, r * 0.1, -0.5, 0.8);
}
function tree(g, x, y, s) {
  /* pieza única: tronco y copa en un solo contorno */
  const p = [(h) => { h.moveTo(x - s * 0.09, y + s * 0.42); h.lineTo(x - s * 0.09, y + s * 0.1); h.bezierCurveTo(x - s * 0.5, y + s * 0.06, x - s * 0.42, y - s * 0.42, x, y - s * 0.44); h.bezierCurveTo(x + s * 0.42, y - s * 0.42, x + s * 0.5, y + s * 0.06, x + s * 0.09, y + s * 0.1); h.lineTo(x + s * 0.09, y + s * 0.42); h.closePath(); }, '#3f8f3a'];
  contact(g, x, y + s * 0.44, s * 0.3, s * 0.1, 0.3);
  uni(g, [p], 1.4); celp(g, [p], '#3f8f3a', s * 0.12, s * 0.14);
  g.fillStyle = 'rgba(26,21,48,.28)'; g.fillRect(x - s * 0.09, y + s * 0.1, s * 0.18, s * 0.32);
  spec(g, x - s * 0.16, y - s * 0.26, s * 0.1, s * 0.05, -0.6, 0.55);
}
function tent(g, x, y, s) {
  const p = [(h) => { h.moveTo(x, y - s * 0.4); h.lineTo(x + s * 0.42, y + s * 0.36); h.lineTo(x - s * 0.42, y + s * 0.36); h.closePath(); }, '#ff8a5b'];
  contact(g, x, y + s * 0.38, s * 0.34, s * 0.1, 0.3);
  uni(g, [p], 1.5); celp(g, [p], '#ff8a5b', s * 0.12, s * 0.12);
  g.fillStyle = 'rgba(26,21,48,.3)'; g.beginPath(); g.moveTo(x, y - s * 0.12); g.lineTo(x + s * 0.14, y + s * 0.36); g.lineTo(x - s * 0.14, y + s * 0.36); g.closePath(); g.fill();
  spec(g, x - s * 0.14, y + s * 0.04, s * 0.06, s * 0.14, 0.4, 0.5);
}
function cat(g, x, y, s, col, blink) {
  /* pieza única: cabeza, orejas, cuerpo y cola en un solo trazo */
  const p = [(h) => {
    h.moveTo(x - s * 0.34, y + s * 0.42);
    h.lineTo(x - s * 0.3, y - s * 0.06);
    h.lineTo(x - s * 0.34, y - s * 0.42); h.lineTo(x - s * 0.12, y - s * 0.24);
    h.bezierCurveTo(x, y - s * 0.32, x + s * 0.06, y - s * 0.32, x + s * 0.14, y - s * 0.24);
    h.lineTo(x + s * 0.34, y - s * 0.42); h.lineTo(x + s * 0.3, y - s * 0.06);
    h.lineTo(x + s * 0.34, y + s * 0.42);
    h.lineTo(x + s * 0.52, y + s * 0.42); h.bezierCurveTo(x + s * 0.6, y + s * 0.1, x + s * 0.44, y + s * 0.06, x + s * 0.4, y + s * 0.2);
    h.lineTo(x + s * 0.38, y + s * 0.44);
    h.closePath();
  }, col];
  contact(g, x, y + s * 0.44, s * 0.36, s * 0.1, 0.3);
  uni(g, [p], 1.5); celp(g, [p], col, s * 0.1, s * 0.12);
  const ey = y - s * 0.1;
  g.fillStyle = OUT;
  if (blink) { g.fillRect(x - s * 0.19, ey, s * 0.1, 2); g.fillRect(x + s * 0.09, ey, s * 0.1, 2); }
  else { g.beginPath(); g.ellipse(x - s * 0.14, ey, s * 0.05, s * 0.07, 0, 0, R2); g.ellipse(x + s * 0.14, ey, s * 0.05, s * 0.07, 0, 0, R2); g.fill();
    spec(g, x - s * 0.155, ey - s * 0.025, s * 0.018, s * 0.024, 0, 0.9); spec(g, x + s * 0.125, ey - s * 0.025, s * 0.018, s * 0.024, 0, 0.9); }
  g.fillStyle = '#ff9ab5'; g.beginPath(); g.moveTo(x, y + s * 0.03); g.lineTo(x - s * 0.05, y - s * 0.02); g.lineTo(x + s * 0.05, y - s * 0.02); g.closePath(); g.fill();
}

function drawBoard() {
  if (boardCv) { c.drawImage(boardCv, 0, 0, W, H); return; }
  const [q, g] = cv(W, H); boardCv = q;
  if (M === 'estrellas') {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const r = P.reg[y * N + x], col = REG[r % REG.length];
      g.fillStyle = ART.dark(col, 0.35); g.fillRect(OX + x * S, OY + y * S, S, S);
      g.fillStyle = 'rgba(255,255,255,' + (0.05 + ((x + y) % 2) * 0.04) + ')'; g.fillRect(OX + x * S, OY + y * S, S, S);
    }
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1;
    for (let i = 1; i < N; i++) { g.beginPath(); g.moveTo(OX + i * S, OY); g.lineTo(OX + i * S, OY + N * S); g.moveTo(OX, OY + i * S); g.lineTo(OX + N * S, OY + i * S); g.stroke(); }
    g.strokeStyle = OUT; g.lineWidth = 3.4; g.lineCap = 'round';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = P.reg[y * N + x];
      if (x + 1 < N && P.reg[y * N + x + 1] !== r) { g.beginPath(); g.moveTo(OX + (x + 1) * S, OY + y * S); g.lineTo(OX + (x + 1) * S, OY + (y + 1) * S); g.stroke(); }
      if (y + 1 < N && P.reg[(y + 1) * N + x] !== r) { g.beginPath(); g.moveTo(OX + x * S, OY + (y + 1) * S); g.lineTo(OX + (x + 1) * S, OY + (y + 1) * S); g.stroke(); } }
    g.strokeStyle = OUT; g.lineWidth = 4; g.strokeRect(OX, OY, N * S, N * S);
  } else if (M === 'tiendas') {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      g.fillStyle = (x + y) % 2 ? '#3d7a36' : '#468a3d'; g.fillRect(OX + x * S, OY + y * S, S, S);
      for (let i = 0; i < 4; i++) { const sx = OX + x * S + rndf(y * 31 + x * 7 + i) * S, sy = OY + y * S + rndf(y * 17 + x * 5 + i + 2) * S; g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 1.2, sy - 5); g.stroke(); }
    }
    g.strokeStyle = 'rgba(26,21,48,.35)'; g.lineWidth = 1;
    for (let i = 1; i < N; i++) { g.beginPath(); g.moveTo(OX + i * S, OY); g.lineTo(OX + i * S, OY + N * S); g.moveTo(OX, OY + i * S); g.lineTo(OX + N * S, OY + i * S); g.stroke(); }
    g.strokeStyle = OUT; g.lineWidth = 4; g.strokeRect(OX, OY, N * S, N * S);
    for (const i of P.trees) tree(g, OX + ((i % N) + 0.5) * S, OY + (((i / N) | 0) + 0.5) * S, S * 0.86);
  } else if (M === 'puentes') {
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(OX, OY, N * S, N * S);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
    for (let i = 1; i < N; i++) { g.beginPath(); g.moveTo(OX + i * S, OY); g.lineTo(OX + i * S, OY + N * S); g.moveTo(OX, OY + i * S); g.lineTo(OX + N * S, OY + i * S); g.stroke(); }
  } else if (M === 'suma') {
    for (let y = 0; y < P.R; y++) for (let x = 0; x < P.C; x++) { g.fillStyle = 'rgba(255,255,255,.05)'; ART.rr(g, OX + x * S + 2, OY + y * S + 2, S - 4, S - 4, 8); g.fill(); }
  }
  c.drawImage(boardCv, 0, 0, W, H);
}

function drawHud() {
  c.fillStyle = 'rgba(12,8,26,.55)'; c.fillRect(0, 0, W, HUDH - 14);
  /* El reproductor puede dejar su botón de pausa arriba al centro: el título se queda
     a la izquierda y encoge para no meterse nunca debajo. */
  let fs = 19;
  c.font = `800 ${fs}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  while (fs > 12 && c.measureText(CFG.title).width > 158) { fs -= 1; c.font = `800 ${fs}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; }
  k.text(CFG.title, 14, 14, fs, '#fff', 'left');
  k.text(`Nivel ${level}/20`, 14, 40, 14, TH.ac, 'left');
  k.text(`${Math.floor(t)} s`, W - 14, 14, 17, '#fff', 'right');
  k.text(`${score}`, W - 14, 40, 14, '#cfc7ff', 'right');
  if (M === 'suma' && gg) k.text(`Quedan ${gg.filter((v) => v).length}`, W / 2, 40, 14, '#cfc7ff', 'center');
  if (msgT > 0) { const a = Math.min(1, msgT); c.globalAlpha = a; k.text(msg, W / 2, H - BOT - 20, 14, '#ffd7df', 'center'); c.globalAlpha = 1; }
}
function drawBtns() {
  btns = [];
  const list = M === 'suma' ? [['Pista', hint], ['Deshacer', () => { const u = undo.pop(); if (!u) return say('Nada que deshacer'); gg[u[0]] = u[1]; gg[u[2]] = u[3]; score = Math.max(0, score - 20); k.sfx('pop'); }], ['Reiniciar', newP]] : [['Pista', hint], ['Reiniciar', newP]];
  const bw = Math.floor((W - 24 - (list.length - 1) * 10) / list.length), by = H - BOT + 8, bh = 38;
  list.forEach(([lab, f], i) => {
    const x = 12 + i * (bw + 10);
    btns.push({ x, y: by, w: bw, h: bh, f });
    ART.rr(c, x, by, bw, bh, 11); c.fillStyle = TH.panel; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.4; c.stroke();
    ART.rr(c, x + 3, by + 3, bw - 6, bh * 0.44, 8); c.fillStyle = 'rgba(255,255,255,.1)'; c.fill();
    k.text(lab, x + bw / 2, by + 11, 15, '#fff', 'center');
  });
}

function drawGame() {
  drawBoard();
  if (M === 'puentes') {
    for (let e = 0; e < EC.length; e++) if (ev[e]) {
      const A = P.isl[EC[e].i], B = P.isl[EC[e].j];
      const ax = OX + (A.x + 0.5) * S, ay = OY + (A.y + 0.5) * S, bx = OX + (B.x + 0.5) * S, by = OY + (B.y + 0.5) * S;
      const nx = ay === by ? 0 : 1, ny = ay === by ? 1 : 0, off = ev[e] === 2 ? S * 0.13 : 0;
      for (let s2 = 0; s2 < ev[e]; s2++) {
        const o = ev[e] === 2 ? (s2 ? off : -off) : 0;
        c.strokeStyle = OUT; c.lineWidth = 9; c.lineCap = 'round';
        c.beginPath(); c.moveTo(ax + nx * o, ay + ny * o); c.lineTo(bx + nx * o, by + ny * o); c.stroke();
        c.strokeStyle = '#c99a5d'; c.lineWidth = 5.4;
        c.beginPath(); c.moveTo(ax + nx * o, ay + ny * o); c.lineTo(bx + nx * o, by + ny * o); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(ax + nx * o, ay + ny * o - (ny ? 0 : 1.4)); c.lineTo(bx + nx * o, by + ny * o - (ny ? 0 : 1.4)); c.stroke();
      }
    }
    const deg = P.isl.map(() => 0);
    for (let e = 0; e < EC.length; e++) if (ev[e]) { deg[EC[e].i] += ev[e]; deg[EC[e].j] += ev[e]; }
    P.isl.forEach((q, i) => {
      const cx = OX + (q.x + 0.5) * S, cy = OY + (q.y + 0.5) * S, r = S * 0.4;
      const full = deg[i] === q.n, over = deg[i] > q.n;
      const col = over ? '#e5556e' : full ? '#7cf7a0' : '#f0d9a8';
      const p = [(h) => h.arc(cx, cy, r, 0, R2), col];
      contact(c, cx, cy + r * 0.85, r * 0.8, r * 0.26, 0.3);
      uni(c, [p], 1.6); celp(c, [p], col, r * 0.22, r * 0.24); spec(c, cx - r * 0.3, cy - r * 0.36, r * 0.2, r * 0.11, -0.5, 0.75);
      if (sel === i) { c.strokeStyle = TH.ac; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r + 5 + Math.sin(t * 7) * 1.5, 0, R2); c.stroke(); }
      k.text(String(q.n), cx, cy - r * 0.44, Math.max(14, r * 0.95), OUT, 'center');
    });
  } else if (M === 'estrellas') {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = cell[y * N + x], cx = OX + (x + 0.5) * S, cy = OY + (y + 0.5) * S, a = anim[y * N + x];
      if (v === 1) { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3; c.lineCap = 'round'; const d = S * 0.15; c.beginPath(); c.moveTo(cx - d, cy - d); c.lineTo(cx + d, cy + d); c.moveTo(cx + d, cy - d); c.lineTo(cx - d, cy + d); c.stroke(); }
      if (v === 2) star(c, cx, cy, S * 0.34 * (1 + a * 0.25), '#ffd23d');
    }
  } else if (M === 'tiendas') {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = cell[y * N + x], cx = OX + (x + 0.5) * S, cy = OY + (y + 0.5) * S, a = anim[y * N + x];
      if (v === 1) { c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(cx, cy, S * 0.09, 0, R2); c.fill(); }
      if (v === 2) tent(c, cx, cy, S * 0.9 * (1 + a * 0.2));
    }
    const rowN = Array(N).fill(0), colN = Array(N).fill(0);
    for (let i = 0; i < N * N; i++) if (cell[i] === 2) { rowN[(i / N) | 0]++; colN[i % N]++; }
    for (let i = 0; i < N; i++) {
      const okR = rowN[i] === P.rows[i], okC = colN[i] === P.cols[i];
      k.text(String(P.rows[i]), OX - 15, OY + i * S + S / 2 - 8, 16, okR ? '#7cf7a0' : rowN[i] > P.rows[i] ? '#e5556e' : '#fff', 'center');
      k.text(String(P.cols[i]), OX + i * S + S / 2, OY - 24, 16, okC ? '#7cf7a0' : colN[i] > P.cols[i] ? '#e5556e' : '#fff', 'center');
    }
  } else if (M === 'suma') {
    for (let y = 0; y < P.R; y++) for (let x = 0; x < P.C; x++) {
      const i = y * P.C + x, v = gg[i]; if (!v) continue;
      const cx = OX + x * S + 3, cy = OY + y * S + 3, s2 = S - 6, a = anim[i];
      const on = sel === i;
      const col = on ? TH.ac : '#e8dcc0';
      const p = [(h) => ART.rr(h, cx, cy, s2, s2, 9), col];
      contact(c, cx + s2 / 2, cy + s2 + 2, s2 * 0.42, 3.5, 0.28);
      uni(c, [p], 1.5); celp(c, [p], col, s2 * 0.1, s2 * 0.11);
      k.text(String(v), cx + s2 / 2, cy + s2 / 2 - s2 * 0.3, Math.max(16, s2 * 0.58), OUT, 'center');
      if (on) { c.strokeStyle = '#fff'; c.lineWidth = 2.6; ART.rr(c, cx - 2, cy - 2, s2 + 4, s2 + 4, 11); c.stroke(); }
      if (a > 0) { c.globalAlpha = a; c.fillStyle = TH.ac; ART.rr(c, cx, cy, s2, s2, 9); c.fill(); c.globalAlpha = 1; }
    }

  } else {
    /* gatos: pistas, cajas y bandeja */
    const lines = P.clues.map(clueTxt);
    let y = HUDH - 6;
    lines.forEach((s, i) => { k.text('· ' + s, 16, y + i * 17, 13.5, '#e6e0ff', 'left'); });
    for (let i = 0; i < P.n; i++) {
      const x = OX + i * S + 4, bw = S - 8, bh = S * 1.02, a = anim[i];
      const p = [(h) => ART.rr(h, x, OY, bw, bh, 8), '#b9884f'];
      contact(c, x + bw / 2, OY + bh + 3, bw * 0.45, 4, 0.3);
      uni(c, [p], 1.5); celp(c, [p], '#b9884f', bw * 0.1, bw * 0.1);
      c.strokeStyle = 'rgba(26,21,48,.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 4, OY + bh * 0.62); c.lineTo(x + bw - 4, OY + bh * 0.62); c.stroke();
      k.text(String(i + 1), x + bw / 2, OY + bh + 8, 14, '#cfc7ff', 'center');
      if (asg[i] >= 0) cat(c, x + bw / 2, OY + bh * 0.42, bw * (0.82 + a * 0.15), CATS[asg[i]][1], Math.floor(t * 1.6) % 5 === 0);
    }
    const ty = H - BOT - 92, bw2 = Math.floor((W - 24) / P.n);
    k.text('Toca un gato y luego su caja', W / 2, ty - 22, 13.5, '#cfc7ff', 'center');
    for (let i = 0; i < P.n; i++) {
      const x = 12 + i * bw2, placed = asg.indexOf(i) >= 0;
      c.globalAlpha = placed ? 0.3 : 1;
      if (selCat === i) { ART.rr(c, x + 3, ty + 2, bw2 - 6, 74, 10); c.fillStyle = 'rgba(255,255,255,.14)'; c.fill(); c.strokeStyle = TH.ac; c.lineWidth = 2.4; c.stroke(); }
      cat(c, x + bw2 / 2, ty + 32, Math.min(52, bw2 * 0.8), CATS[i][1], false);
      k.text(CATS[i][0], x + bw2 / 2, ty + 58, 12, '#fff', 'center');
      c.globalAlpha = 1;
    }
  }
}
function clueTxt(q) {
  const A = CATS[q.a][0], B = q.b !== undefined ? CATS[q.b][0] : '';
  if (q.t === 'pos') return `${A} está en la caja ${q.k + 1}.`;
  if (q.t === 'no') return `${A} no está en la caja ${q.k + 1}.`;
  if (q.t === 'izq') return `${A} está a la izquierda de ${B}.`;
  if (q.t === 'jun') return `${A} está justo al lado de ${B}.`;
  if (q.t === 'sep') return `Entre ${A} y ${B} hay ${q.d - 1} caja${q.d - 1 === 1 ? '' : 's'}.`;
  return `${A} está en un extremo.`;
}

/* ---------- bucle ---------- */
function reset() { level = k.lv || 1; score = 0; newP(); }
const _upd = (dt) => {
  if (!k.gate(reset)) return;
  t += dt;
  if (msgT > 0) msgT -= dt;
  if (anim) for (let i = 0; i < anim.length; i++) if (anim[i] > 0) anim[i] = Math.max(0, anim[i] - dt * 3);
  for (let i = fx.length - 1; i >= 0; i--) { fx[i].t -= dt; if (fx[i].t <= 0) fx.splice(i, 1); }
  if (done) { doneT += dt; return; }
  if (k.ptr.hit) tapAt(k.ptr.x, k.ptr.y);
  /* teclado / mando: cursor por casillas */
  if (M !== 'gatos' && M !== 'puentes') {
    const nn = M === 'suma' ? [P.C, P.R] : [N, N];
    if (k.hit.has('left')) { cur[0] = Math.max(0, cur[0] - 1); kb = true; }
    if (k.hit.has('right')) { cur[0] = Math.min(nn[0] - 1, cur[0] + 1); kb = true; }
    if (k.hit.has('up')) { cur[1] = Math.max(0, cur[1] - 1); kb = true; }
    if (k.hit.has('down')) { cur[1] = Math.min(nn[1] - 1, cur[1] + 1); kb = true; }
    if (k.hit.has('a')) tapAt(OX + (cur[0] + 0.5) * S, OY + (cur[1] + 0.5) * S);
    if (k.hit.has('b')) hint();
  } else if (k.hit.has('b')) hint();
};
const _draw = () => {
  drawBg(); c.drawImage(bgCv, 0, 0, W, H);
  drawGame();
  if (kb && M !== 'gatos' && M !== 'puentes') { c.strokeStyle = TH.ac; c.lineWidth = 2.6; ART.rr(c, OX + cur[0] * S + 1, OY + cur[1] * S + 1, S - 2, S - 2, 6); c.stroke(); }
  drawHud(); drawBtns();
  if (done) { c.fillStyle = 'rgba(12,8,26,' + Math.min(0.45, doneT * 0.8) + ')'; c.fillRect(0, 0, W, H); k.text('¡Resuelto!', W / 2, H / 2 - 20, 34, '#fff', 'center'); }
};
/* Niveles diseñados por generador con solución única; el progreso va por dificultad (kit.js). */
k.levels(20, { start: (i) => { level = i; score = 0; newP(); } });
reset();
k.run(_upd, _draw);
k.show(CFG.title, CFG.help);
