/* Puzzles de cuadrícula. CFG.mode: 'sudoku' | 'mines' | 'lights' | 'pipes' | 'slide'
 * Arte propio: tableros en relieve, bombillas con halo, tuberías con agua que fluye, fichas de madera que se deslizan.
 * Control: táctil + teclado (flechas mueven el cursor, A actúa, B = bandera / girar al revés; en sudoku, números 1-9 y borrar). */
const M = CFG.mode, W = 480, H = 600, OUT = ART.OUT, R2 = 6.2832;
const BG = { sudoku: ['#2d3a5c', '#161f35'], mines: ['#2f4a3a', '#15241c'], lights: ['#2a2350', '#110d24'], pipes: ['#23374f', '#0f1b2b'], slide: ['#4a3426', '#20150e'] }[M];
const k = Kit({ w: W, h: H, title: CFG.title, bg: BG[1] }), c = k.ctx;
/* ---------- Plan Friv (tanda 4): mine-sweep con 20 tableros a mano ----------
   HAND solo existe en el modo 'mines' del juego que tenga tabla en MINELV; los demás
   modos (sudoku, luces, tuberías, 15) y cualquier otro slug no ven nada de esto. */
const HAND = (M === 'mines' && typeof MINELV !== 'undefined' && MINELV[CFG.id]) || null;
const LVN = HAND ? HAND.length : 0;
const lvOf = () => HAND[k.clamp(level || 1, 1, LVN) - 1];
/* ---------- Plan Friv: sudoku-zen con 20 puzles escritos a mano (tabla SUDLV) ----------
   SH solo existe en el modo 'sudoku' del slug que tenga tabla; el resto de modos y de
   slugs del motor no ven nada de esto (el sudoku al azar de siempre sigue intacto). */
const SH = (M === 'sudoku' && typeof SUDLV !== 'undefined' && SUDLV[CFG.id]) || null;
const SLVN = SH ? SH.length : 0;
const sOf = () => SH[k.clamp(level || 1, 1, SLVN) - 1];
const SDIFT = [1.5, 1, 0.8];
/* ---------- Plan Friv: pipe-connect con 20 tableros a mano (tabla PIPELV) ----------
   PH solo existe en el modo 'pipes' del slug que tenga tabla; el modo de tuberías al azar de
   siempre y el resto de modos no ven nada de esto. Reglas compartidas con el verificador. */
const PH = (M === 'pipes' && typeof PIPELV !== 'undefined' && PIPELV[CFG.id]) || null;
const PR = PH ? PIPELV.rules : null;
const WCOL = ['#2f9bf0', '#ff5f7a', '#3fcf6e'], WLITE = ['#bfe6ff', '#ffc4cf', '#c4f5d3'], WNAME = ['azul', 'roja', 'verde'];
let PB = null, pm = null, pra = null, pev = null, PS = null, pwet = null, pTaps = 0, pHints = 0, pUsed = 0, pHintSet = null;
let pPhase = 0, pNext = 0, pWT = 0, pWS = 0, pVH = 0, pDrips = [], pFail = null, pFed = null, pChain = 0, pChainT = 0;
let pWide = false, pTop = 58, pBan = 0, pBarY = 0, pPanX = 0, pPanW = 0, pPress = -1, pPressT = 0, pLong = false, pMsg = null, pVAng = null, pWin = 0, pDist = null, pBoardCv = null, pBgCv = null;
const pLv = () => PH[k.clamp(level || 1, 1, PH.length) - 1];
const pShut = (i) => !PS.open[i];
const pGoals = () => PR.goals(PB, k.dif);
const pSpr = {}; /* el tiempo objetivo se estira en fácil y se aprieta en difícil */
const medKey = () => 'med:' + CFG.id + (k.dif === 0 ? '@f' : k.dif === 2 ? '@d' : '');
function medRead() { try { const v = JSON.parse(localStorage.getItem(medKey()) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function medSave(i) { const v = medRead(); v[i] = 1; try { localStorage.setItem(medKey(), JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
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
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms); /* 1.23: la pantalla final espera si el juego está en pausa */
let lost = false, g, N, S, OX = 24, OY = 90, sel, score, level, t, done, flagMode, first, sol, given, src;
let shield = 0; /* buscaminas: minas que se desactivan solas (k.D.life) — en normal 0, exactamente como siempre */
let hints = 0, usedHint = 0, hintI = -1, hintT = 0, medal = false, banner = null;
/* Sudoku: tamaño y cajas (9/3/3 en el modo de siempre, 4/2/2 y 6/3/2 en los niveles a mano). */
let SN = 9, BW = 3, BH = 3, notes = null, noteMode = false, undoS = [], mistakes = 0, checkT = 0, chain = 0, chainT = 0, KY = 0, TY = 0, KW = 43.2;
let clk = 0, litN = 0, padHit = 0, downIn = false, skipSw = false, cur = [0, 0], kb = false, anim, fx = [], moves = 0, bgCv, boardCv, keyNum = null, pressT = 0, longDone = false, boom = null, doneT = 0, conf = new Set(), rp, glow;
const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const DD = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function sudokuGen() { const b = Array(81).fill(0); const ok = (i, v) => { const r = Math.floor(i / 9), cc = i % 9; for (let j = 0; j < 9; j++) if (b[r * 9 + j] === v || b[j * 9 + cc] === v) return false; const br = r - r % 3, bc = cc - cc % 3; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (b[(br + y) * 9 + bc + x] === v) return false; return true; };
  const fillB = (i) => { if (i === 81) return true; for (const v of k.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) if (ok(i, v)) { b[i] = v; if (fillB(i + 1)) return true; b[i] = 0; } return false; }; fillB(0); return b; }
function build() {
  done = false; t = 0; sel = null; first = true; flagMode = false; moves = 0; boom = null; doneT = 0; fx = []; longDone = false;
  if (PH) return buildPipe();
  shield = M === 'mines' ? (k.D.life | 0) : 0;
  if (M === 'sudoku' && SH) buildSud();
  else if (M === 'sudoku') { SN = 9; BW = 3; BH = 3; N = 9; S = 48; OY = 90; sol = sudokuGen(); const holes = Math.min(54, 28 + (level - 1) * 2) + (k.dif === 0 ? -6 : k.dif === 2 ? 6 : 0); /* 1.23: nivel 1: 28 huecos → 54 en el nivel 14 */ g = [...sol]; k.shuffle([...Array(81).keys()]).slice(0, holes).forEach((i) => (g[i] = 0)); given = g.map((v) => v > 0); calcConf(); }
  if (M === 'mines' && HAND) buildHand();
  else if (M === 'mines') { N = 9; S = 48; g = Array.from({ length: 81 }, () => ({ mine: false, open: false, flag: false, n: 0, ot: 0 })); }
  // luces: se parte de todo apagado y se aplican pulsaciones aleatorias → siempre resoluble
  if (M === 'lights') { N = 5; S = 80; g = Array(25).fill(false); k.shuffle([...Array(25).keys()]).slice(0, k.clamp(Math.min(13, 2 + Math.floor((level + 1) * 0.6)) + (k.dif === 0 ? -1 : k.dif === 2 ? 2 : 0), 1, 20)).forEach((i) => toggle(i % 5, Math.floor(i / 5))); /* nivel 1: 3 toques distintos */ if (g.every((v) => !v)) toggle(2, 2); glow = g.map((v) => (v ? 1 : 0)); }
  // tuberías: árbol de expansión desde la fuente y giro aleatorio de cada pieza → siempre resoluble
  if (M === 'pipes') { N = Math.min(8, (k.dif === 2 ? 5 : 4) + Math.floor(level / (k.dif === 0 ? 4 : 3))); /* nivel 1-2: 4×4 */ S = Math.floor(432 / N); g = Array.from({ length: N * N }, () => ({ c: [0, 0, 0, 0], r: 0, ra: 0 })); src = [Math.floor(N / 2), Math.floor(N / 2)];
    const seen = new Set([src.join()]), st = [src];
    while (st.length) { const cur2 = st[Math.floor(Math.random() * st.length)]; const opts = DD.map((d, i) => [i, cur2[0] + d[0], cur2[1] + d[1]]).filter(([, x, y]) => inb(x, y) && !seen.has(x + ',' + y)); if (!opts.length) { st.splice(st.indexOf(cur2), 1); continue; } const [i, x, y] = k.pick(opts); g[cur2[1] * N + cur2[0]].c[i] = 1; g[y * N + x].c[(i + 2) % 4] = 1; seen.add(x + ',' + y); st.push([x, y]); }
    for (const cell of g) { const r = k.ri(0, 3); for (let i = 0; i < r; i++) cell.c.unshift(cell.c.pop()); } }
  // 15: movimientos aleatorios desde la posición resuelta → siempre resoluble
  if (M === 'slide') { N = 4; S = 104; g = [...Array(15).keys()].map((i) => i + 1).concat(0);
    do { let pe = -1; for (let i = 0, nm = Math.round(Math.min(300, 10 + (level - 1) * 20) * (k.dif === 0 ? 0.6 : k.dif === 2 ? 1.5 : 1)); i < nm; i++) { const e = g.indexOf(0), ex = e % 4, ey = Math.floor(e / 4); const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [ex + dx, ey + dy]).filter(([x, y]) => inb(x, y) && y * 4 + x !== pe); const [x, y] = k.pick(nb); g[e] = g[y * 4 + x]; g[y * 4 + x] = 0; pe = e; } } while (g.every((v, i) => v === (i === 15 ? 0 : i + 1)));
    rp = []; g.forEach((v, i) => (rp[v] = [i % 4, Math.floor(i / 4)])); }
  OX = Math.floor((W - N * S) / 2); anim = Array(N * N).fill(0); cur = [Math.floor(N / 2), Math.floor(N / 2)]; boardCv = null;
  if (M === 'mines' && HAND) { OY = HOY + Math.max(0, Math.floor((HBH - (N * S + 58)) / 2)); openCell(lvOf().fc[0], lvOf().fc[1], 0); }
}
/* Tablero escrito a mano: minas colocadas tal cual, primera casilla abierta de salida.
   HOY/HBH: banda libre entre el cartel de la técnica y el borde inferior. */
const HOY = 132, HBH = 460;
function buildHand() {
  const L = lvOf(); N = L.n; S = Math.max(22, Math.min(48, Math.floor(Math.min(432 / N, (HBH - 58) / N))));
  g = Array.from({ length: N * N }, () => ({ mine: false, open: false, flag: false, n: 0, ot: 0 }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (L.b[y][x] === '*') g[y * N + x].mine = true;
  g.forEach((q, i) => { const x = i % N, y = Math.floor(i / N); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy) && g[(y + dy) * N + x + dx].mine) q.n++; });
  first = false; usedHint = 0; hintI = -1; hintT = 0; medal = medRead()[level - 1] === 1;
  hints = k.dif === 0 ? 2 : k.dif === 1 ? 1 : 0;
  banner = { t: L.t, d: L.d, a: 0 };
}
/* ---------- Sudoku Zen: puzle escrito a mano ---------- */
const SBT = 148, SBH = 328; /* banda libre del tablero: cabe entre el cartel de la técnica y la barra de progreso, que va justo encima del teclado */
function buildSud() {
  const L = sOf(); SN = L.n; BW = SN === 4 ? 2 : 3; BH = SN === 9 ? 3 : 2; N = SN;
  S = Math.floor(Math.min(456 / SN, SBH / SN));
  OY = SBT + Math.floor((SBH - SN * S) / 2);
  KY = 496; TY = 552; KW = 456 / (SN + 1);
  g = L.g.split('').map((ch) => (ch === '.' ? 0 : +ch));
  sol = solveSud(g.slice());
  given = g.map((v) => v > 0);
  notes = new Array(SN * SN).fill(0);
  if (k.dif === 0) autoNotes();
  noteMode = false; undoS = []; mistakes = 0; checkT = 0; chain = 0; chainT = 0;
  usedHint = 0; hintI = -1; hintT = 0;
  hints = k.dif === 0 ? 3 : k.dif === 1 ? 2 : 1;
  medal = medRead()[level - 1] === 1;
  banner = { t: L.t + ' · ' + L.q, d: L.d, a: 0 };
  calcConf();
}
/* Resolutor de respaldo (retroceso): da la solución del puzle, que es única por construcción. */
function solveSud(b) {
  const okv = (i, v) => !unitsOf(i).some((u) => u.some((j) => j !== i && b[j] === v));
  const rec = () => { let bi = -1, bc = SN + 1, bl = null;
    for (let i = 0; i < SN * SN; i++) { if (b[i]) continue; const c2 = []; for (let v = 1; v <= SN; v++) if (okv(i, v)) c2.push(v); if (c2.length < bc) { bc = c2.length; bi = i; bl = c2; if (!bc) return false; } }
    if (bi < 0) return true;
    for (const v of bl) { b[bi] = v; if (rec()) return true; b[bi] = 0; } return false; };
  rec(); return b;
}
/* Candidatos automáticos (solo en fácil): se rellenan las marcas de todas las casillas vacías. */
function autoNotes() {
  for (let i = 0; i < SN * SN; i++) { if (g[i]) { notes[i] = 0; continue; } let m = 0;
    for (let v = 1; v <= SN; v++) if (!unitsOf(i).some((u) => u.some((j) => g[j] === v))) m |= 1 << v;
    notes[i] = m; }
}
function sudUndo() {
  if (!SH || !undoS.length || done) return;
  const u = undoS.pop(); g[u.i] = u.v; notes[u.i] = u.nt; anim[u.i] = 1; sel = u.i; calcConf(); k.sfx('pop');
}
/* Comprobación opcional: marca en rojo 1,6 s los números que no encajan con la solución. */
function sudCheck() {
  if (!SH || done) return;
  const bad = []; for (let i = 0; i < SN * SN; i++) if (g[i] && !given[i] && g[i] !== sol[i]) bad.push(i);
  usedHint++; checkT = 1.6;
  if (!bad.length) { k.sfx('coin'); k.float('Todo correcto', W / 2, OY - 10, '#7cf7a0'); }
  else { k.sfx('hurt'); fx.push({ cells: bad, t: 1.6, col: 'rgba(255,80,90,' }); k.float(bad.length + (bad.length === 1 ? ' fallo' : ' fallos'), W / 2, OY - 10, '#ff8a8a'); }
}
/* Pista: rellena una casilla vacía (la que menos candidatos tenga) con su número correcto. */
function sudHint() {
  if (!SH || hints <= 0 || done || k.st !== 'play') return;
  let bi = -1, bc = SN + 1;
  for (let i = 0; i < SN * SN; i++) { if (g[i] === sol[i]) continue; let n2 = 0; for (let v = 1; v <= SN; v++) if (!unitsOf(i).some((u) => u.some((j) => j !== i && g[j] === v))) n2++; if (n2 < bc) { bc = n2; bi = i; } }
  if (bi < 0) return;
  hints--; usedHint++; hintI = bi; hintT = 1.6;
  const prev = sel; sel = bi; const nm = noteMode; noteMode = false;
  g[bi] = 0; setNum(sol[bi]); noteMode = nm; if (prev !== null && !done) sel = bi;
  k.float('Pista', OX + (bi % SN + 0.5) * S, OY + Math.floor(bi / SN) * S - 4, '#ffd23d');
}
/* Nivel superado: 2★ por tiempo, 3★ por tiempo + sin pistas/comprobaciones + sin errores. */
function sudDone() {
  const L = sOf(), tt = Math.floor(t), p2 = Math.round(L.p2 * SDIFT[k.dif]), p3 = Math.round(L.p3 * SDIFT[k.dif]);
  const stars = tt <= p3 && !usedHint && !mistakes ? 3 : tt <= p2 ? 2 : 1;
  if (stars >= 2 && !medal) { medal = true; medSave(level - 1); }
  const fmt = (v) => `${Math.floor(v / 60)}:${String(Math.floor(v) % 60).padStart(2, '0')}`;
  k.best(CFG.id, score);
  /* La tarjeta dice qué falta exactamente para la siguiente estrella. */
  let falta = '';
  if (stars === 1) falta = `Para 2★: termínalo en ${fmt(p2)} o menos.`;
  else if (stars === 2) { const f = [];
    if (tt > p3) f.push(`en ${fmt(p3)} o menos`);
    if (usedHint) f.push('sin pistas ni comprobaciones');
    if (mistakes) f.push('sin ningún fallo');
    falta = 'Para 3★: ' + f.join(', ') + '.'; }
  k.levelDone(score, `${L.t} · Tiempo ${fmt(tt)} (2★ ${fmt(p2)} · 3★ ${fmt(p3)}) · Fallos ${mistakes} · Ayudas ${usedHint}${falta ? '<br><b>' + falta + '</b>' : ''}`, { stars });
}
function toggle(x, y) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (inb(x + dx, y + dy)) g[(y + dy) * N + x + dx] = !g[(y + dy) * N + x + dx]; }
function lit() { const on = new Map([[src.join(), 0]]), q = [src]; while (q.length) { const [x, y] = q.shift(), cl = g[y * N + x], d0 = on.get(x + ',' + y); DD.forEach((d, i) => { const nx = x + d[0], ny = y + d[1]; if (cl.c[i] && inb(nx, ny) && g[ny * N + nx].c[(i + 2) % 4] && !on.has(nx + ',' + ny)) { on.set(nx + ',' + ny, d0 + 1); q.push([nx, ny]); } }); } return on; }
function openCell(x, y, depth) {
  const cl = g[y * N + x]; if (cl.open || cl.flag) return; cl.open = true; cl.ot = clk + (depth || 0) * 0.025;
  if (cl.mine) {
    /* Fácil: la primera mina se desactiva en vez de estallar (k.D.life). */
    if (shield > 0) { shield--; cl.open = false; cl.flag = true; anim[y * N + x] = 1; k.sfx('hurt'); k.shake(7); k.flash('rgba(255,180,60,.3)'); k.float('¡Mina desactivada!', OX + (x + 0.5) * S, OY + y * S - 4, '#ffd23d'); return; }
    done = true; lost = true; cl.boom = true; boom = { x: OX + (x + 0.5) * S, y: OY + (y + 0.5) * S, t: 0 };
    let n = 0; g.forEach((q, i) => { if (q.mine && !q.open) { q.open = true; q.ot = clk + 0.25 + (n++) * 0.06; } });
    k.sfx('explode'); k.shake(12); k.flash('rgba(255,120,60,.55)'); k.burst(boom.x, boom.y, '#ff9a3d', 30, 260); k.burst(boom.x, boom.y, '#3a3346', 16, 180);
    later(() => k.lose(CFG.id, score, '¡Boom!', HAND ? `Nivel ${level}/${LVN} · Prueba otra vez` : `Nivel ${level}`), 1500); return; }
  if (!cl.n) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy)) openCell(x + dx, y + dy, (depth || 0) + 1);
}
function solvedCheck() {
  let ok = false;
  if (M === 'sudoku') ok = g.every((v, i) => v === sol[i]) || (g.every((v) => v) && validSudoku());
  if (M === 'mines') ok = g.every((q) => q.mine || q.open);
  if (M === 'lights') ok = g.every((v) => !v);
  if (M === 'pipes') ok = lit().size === N * N;
  if (M === 'slide') ok = g.every((v, i) => v === (i === 15 ? 0 : i + 1));
  if (ok && !done) { done = true; doneT = 0; const gain = Math.max(50, 1000 - Math.floor(t) * 3) * level; score += gain; k.best(CFG.id, score); k.sfx('coin'); k.float('+' + gain, W / 2, OY + N * S / 2 + 56, '#ffd23d');
    if (M === 'mines') g.forEach((q) => { if (q.mine) q.flag = true; });
    if (SH) { k.confetti(); k.punch && k.punch(9); return later(sudDone, 1100); }
    if (HAND) return later(handDone, 1100);
    later(() => { k.st = 'over'; k.show('¡Resuelto!', `Nivel ${level} · Tiempo ${Math.floor(t)} s${moves ? ' · ' + moves + ' movimientos' : ''} · Puntos ${score}<br>Toca para el siguiente`); level++; }, 1100); }
}
function validSudoku() { for (let i = 0; i < SN; i++) { const r = new Set(), cc = new Set(), b = new Set(); for (let j = 0; j < SN; j++) { r.add(g[i * SN + j]); cc.add(g[j * SN + i]); const br = Math.floor(i / (SN / BW)) * BH, bc = (i % (SN / BW)) * BW; b.add(g[(br + Math.floor(j / BW)) * SN + bc + j % BW]); } if (r.size < SN || cc.size < SN || b.size < SN) return false; } return true; }
const unitsOf = (i) => { const r = Math.floor(i / SN), cc = i % SN, br = r - r % BH, bc = cc - cc % BW; return [[...Array(SN).keys()].map((j) => r * SN + j), [...Array(SN).keys()].map((j) => j * SN + cc), [...Array(SN).keys()].map((j) => (br + Math.floor(j / BW)) * SN + bc + j % BW)]; };
/* Dificultad: en difícil no se marcan en rojo los números en conflicto (solo aviso visual; la lógica no cambia). */
const SHOWC = () => k.dif !== 2;
function calcConf() { conf = new Set(); for (let i = 0; i < SN * SN; i++) if (g[i]) for (const u of unitsOf(i)) for (const j of u) if (j !== i && g[j] === g[i]) conf.add(i); }
function setNum(n) {
  if (sel === null || given[sel] || done) return;
  if (SH && n > SN) return;
  if (SH && noteMode && n) { /* marca de candidato: no ocupa la casilla */
    if (g[sel]) return; undoS.push({ i: sel, v: g[sel], nt: notes[sel] }); notes[sel] = notes[sel] ^ (1 << n); k.sfx('click'); if (undoS.length > 200) undoS.shift(); return; }
  if (g[sel] === n) return;
  if (SH) { undoS.push({ i: sel, v: g[sel], nt: notes[sel] }); if (undoS.length > 200) undoS.shift(); notes[sel] = 0; }
  g[sel] = n; anim[sel] = 1; k.sfx(n ? 'click' : 'pop'); calcConf();
  if (SH && n) { if (n !== sol[sel]) { mistakes++; chain = 0; k.chainReset && k.chainReset(); k.sfx('hurt'); k.hitstop && k.hitstop(0.05); k.shake(5); k.float('Ahí no', OX + (sel % SN + 0.5) * S, OY + Math.floor(sel / SN) * S - 4, '#ff8a8a'); }
    else { notes.forEach((v, j) => { if (v && unitsOf(sel).some((u) => u.includes(j))) notes[j] = v & ~(1 << n); }); } }
  if (n && conf.has(sel)) { k.sfx('hit'); fx.push({ cells: [sel], t: 0.5, col: 'rgba(255,80,90,' }); }
  else if (n) { let done2 = 0;
    for (const u of unitsOf(sel)) if (u.every((j) => g[j] && !conf.has(j))) { fx.push({ cells: u, t: 0.7, col: 'rgba(124,247,160,' }); done2++; }
    if (done2 && SH) unitReward(done2); else if (done2) k.sfx('coin'); }
  solvedCheck();
}
/* Gancho: cada fila, columna o caja terminada suma cadena, suena más agudo y saca rótulo. */
function unitReward(n2) {
  chain += n2; chainT = 4;
  k.sfx('coin'); k.chime && k.chime(Math.min(7, chain - 1));
  const X = OX + (sel % SN + 0.5) * S, Y = OY + (Math.floor(sel / SN) + 0.5) * S;
  k.burst(X, Y, '#7cf7a0', 10, 110);
  if (chain >= 2) k.combo && k.combo(chain, X, Y - 24);
  if (chain === 3) k.reward && k.reward('¡EN RACHA!', '#7cf7a0');
  else if (chain === 6) k.reward && k.reward('¡IMPARABLE!', '#ffd23d');
  k.punch && k.punch(2 + n2);
}
/* Dificultad: dos minas menos en fácil y dos más en difícil. */
function nMines() { if (HAND) return lvOf().m; return 7 + (k.dif === 0 ? -2 : k.dif === 2 ? 2 : 0) + Math.min(10, (level || 1) - 1); } /* 1.23: 7 minas en el nivel 1 → 17 en el 11 */
function reset() { if (PH) { level = k.lv; score = 0; lost = false; build(); return; } if (SH) { level = k.lv; score = 0; lost = false; build(); return; } if (HAND) { level = k.lv; score = 0; lost = false; build(); return; } if (level === undefined || lost) { level = 1; score = 0; lost = false; } build(); }
addEventListener('keydown', (e) => { if (M !== 'sudoku') return; const m = /^(Digit|Numpad)([0-9])$/.exec(e.code); if (m) keyNum = +m[2]; else if (e.code === 'Backspace' || e.code === 'Delete') keyNum = 0; });
k.onDif = () => { if (k.st !== 'play') { if (HAND || SH || PH) level = k.lv; build(); } };
level = undefined;
if (HAND) { level = k.levels(LVN, { start: (i) => { level = i; score = 0; lost = false; build(); } }); }
if (SH) { level = k.levels(SLVN, { start: (i) => { level = i; score = 0; lost = false; build(); } }); }
if (PH) { level = k.levels(PH.length, { start: (i) => { level = i; score = 0; lost = false; build(); } }); k.onSize = () => { if (PB) layoutP(); };
  CFG.help = 'Toca una pieza para girarla (mant\u00e9n pulsado para girarla al rev\u00e9s). Resuelto: ninguna boca al aire y cada red con su fuente. Cada casa pide agua de su color; los puentes cruzan dos tuber\u00edas sin mezclarlas; las piezas con tornillos no giran. Con reloj, el agua sale sola y avanza: lo mojado ya no gira y una boca al aire es una fuga. Las v\u00e1lvulas frenan el agua: t\u00f3calas para abrirlas antes de que revienten. Con mando: flechas, A gira, B gira al rev\u00e9s. Pocos giros y sin pistas: tres estrellas.'; }
if (SH) CFG.help = 'Rellena el tablero: cada fila, cada columna y cada caja llevan todos los n\u00fameros una sola vez. Toca una casilla y pulsa un n\u00famero. \u00abNotas\u00bb apunta candidatos, \u00abDeshacer\u00bb retira la \u00faltima jugada, \u00abComprobar\u00bb marca los fallos y \u00abPista\u00bb rellena una casilla. Con mando: flechas mueven, A cambia el n\u00famero y B borra. Tres estrellas: dentro del tiempo, sin ayudas y sin fallos.';
reset(); k.show(CFG.title, CFG.help);
/* Nivel superado: medalla si se baja del tiempo objetivo (en fácil y normal vale también
   terminarlo sin gastar pistas y con holgura). El nivel 20 cierra el juego. */
function handDone() {
  const L = lvOf(), tt = Math.floor(t), par = L.par;
  const win = t <= par || (k.dif < 2 && usedHint === 0 && t <= par * 1.6);
  if (win && !medal) { medal = true; medSave(level - 1); }
  const fmt = (v) => `${Math.floor(v / 60)}:${String(Math.floor(v) % 60).padStart(2, '0')}`;
  k.best(CFG.id, score);
  k.levelDone(score, `Tiempo ${fmt(tt)} · Objetivo ${fmt(par)}${win ? ' · ¡Medalla!' : ''} · ${L.m} minas · ${score} puntos`);
}
/* Pista: abre una casilla segura pegada a lo ya descubierto (fácil 2, normal 1, difícil 0). */
function hint() {
  if (!HAND || hints <= 0 || done || k.st !== 'play') return;
  const near = [], far = [];
  for (let i = 0; i < N * N; i++) { const q = g[i]; if (q.open || q.flag || q.mine) continue;
    const x = i % N, y = Math.floor(i / N); let adj = false;
    for (let dy = -1; dy <= 1 && !adj; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy) && g[(y + dy) * N + x + dx].open) { adj = true; break; }
    (adj ? near : far).push(i); }
  const pool = near.length ? near : far; if (!pool.length) return;
  const i = pool[Math.floor(Math.random() * pool.length)];
  hints--; usedHint++; hintI = i; hintT = 1.4;
  k.sfx('pop'); k.float('¡Aquí no hay mina!', OX + (i % N + 0.5) * S, OY + Math.floor(i / N) * S - 6, '#7cf7a0');
  openCell(i % N, Math.floor(i / N), 0); if (!done) solvedCheck();
}

/* ---------- Acciones ---------- */
function minesTap(cx, cy, flag) {
  const cl = g[cy * N + cx];
  if (flag) { if (!cl.open) { cl.flag = !cl.flag; anim[cy * N + cx] = 1; k.sfx(cl.flag ? 'pop' : 'click'); } return; }
  if (cl.open && cl.n) { // acorde: abre vecinas si ya hay tantas banderas como el número
    let f = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(cx + dx, cy + dy) && g[(cy + dy) * N + cx + dx].flag) f++;
    if (f === cl.n) { k.sfx('click'); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(cx + dx, cy + dy) && !done) openCell(cx + dx, cy + dy, 1); } }
  else if (!cl.open && !cl.flag) {
    if (first && !HAND) { first = false; const safe = new Set(), sr = k.dif === 0 ? 2 : 1; for (let dy = -sr; dy <= sr; dy++) for (let dx = -sr; dx <= sr; dx++) if (inb(cx + dx, cy + dy)) safe.add((cy + dy) * N + cx + dx); /* fácil: 5×5 seguro → siempre se abre una zona grande */ const cand = k.shuffle([...Array(81).keys()].filter((i) => !safe.has(i))); cand.slice(0, nMines()).forEach((i) => (g[i].mine = true)); g.forEach((q, i) => { const x = i % N, y = Math.floor(i / N); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy) && g[(y + dy) * N + x + dx].mine) q.n++; }); }
    k.sfx('click'); openCell(cx, cy, 0); }
  if (!done) solvedCheck();
}
function lightsTap(cx, cy) { toggle(cx, cy); moves++; k.sfx('click'); anim[cy * N + cx] = 1; k.burst(OX + (cx + 0.5) * S, OY + (cy + 0.5) * S, g[cy * N + cx] ? '#ffe98a' : '#8a90c0', 8, 90); solvedCheck(); }
function pipesTap(cx, cy, back) { const cl = g[cy * N + cx]; if (back) { cl.c.push(cl.c.shift()); cl.ra += Math.PI / 2; } else { cl.c.unshift(cl.c.pop()); cl.ra -= Math.PI / 2; } cl.r += 1; moves++; k.sfx('click'); const before = litN; litN = lit().size; if (litN > before) k.sfx('pop'); solvedCheck(); }
function slideTo(tx, ty) {
  const e = g.indexOf(0), ex = e % 4, ey = Math.floor(e / 4); if (!inb(tx, ty) || (tx !== ex && ty !== ey) || (tx === ex && ty === ey)) return false;
  const sx = Math.sign(tx - ex), sy = Math.sign(ty - ey); let x = ex, y = ey; // desliza toda la fila/columna hacia el hueco
  while (x !== tx || y !== ty) { const nx = x + sx, ny = y + sy; g[y * 4 + x] = g[ny * 4 + nx]; g[ny * 4 + nx] = 0; x = nx; y = ny; moves++; }
  k.sfx('click'); solvedCheck(); return true;
}

k.run((dt) => {
  if (!k.gate(reset)) { keyNum = null; return; }
  if (PH) return updPipe(dt);
  for (const f of fx) f.t -= dt; fx = fx.filter((f) => f.t > 0); for (let i = 0; i < anim.length; i++) if (anim[i] > 0) anim[i] = Math.max(0, anim[i] - dt * 5);
  if (M === 'lights') glow = glow.map((v, i) => v + k.clamp((g[i] ? 1 : 0) - v, -dt * 7, dt * 7));
  if (M === 'pipes') for (const q of g) q.ra += k.clamp(-q.ra, -dt * 14, dt * 14);
  if (M === 'slide') g.forEach((v, i) => { const r = rp[v], s2 = dt * 12; r[0] += k.clamp(i % 4 - r[0], -s2, s2); r[1] += k.clamp(Math.floor(i / 4) - r[1], -s2, s2); });
  clk += dt; if (boom) boom.t += dt; if (done) { doneT += dt; return; } t += dt;
  const cx = Math.floor((k.ptr.x - OX) / S), cy = Math.floor((k.ptr.y - OY) / S), on = inb(cx, cy);
  const kd = ['up', 'down', 'left', 'right'].find((d) => k.hit.has(d));
  if (k.ptr.hit) kb = false;
  if (kd && M !== 'slide' && M !== 'sudoku') { kb = true; const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[kd]; cur = [k.clamp(cur[0] + d[0], 0, N - 1), k.clamp(cur[1] + d[1], 0, N - 1)]; k.sfx('click'); }
  if (M === 'sudoku') {
    const mid = Math.floor(SN * SN / 2);
    if (k.ptr.hit && on) { sel = cy * SN + cx; k.sfx('click'); }
    if (SH) {
      if (k.ptr.hit && k.ptr.y >= KY && k.ptr.y < KY + 46) { const n = Math.floor((k.ptr.x - 12) / KW) + 1; if (n >= 1 && n <= SN + 1) { padHit = n; setNum(n === SN + 1 ? 0 : n); } }
      if (k.ptr.hit && k.ptr.y >= TY && k.ptr.y < TY + 38) { const i2 = Math.floor((k.ptr.x - 12) / 116);
        if (i2 === 0) { noteMode = !noteMode; k.sfx('pop'); }
        else if (i2 === 1) sudUndo();
        else if (i2 === 2) sudCheck();
        else if (i2 === 3) { if (hints > 0) sudHint(); else k.sfx('hurt'); } }
      if (checkT > 0) checkT -= dt; if (hintT > 0) hintT -= dt;
      if (chainT > 0) { chainT -= dt; if (chainT <= 0) { chain = 0; k.chainReset && k.chainReset(); } }
      if (banner) banner.a = Math.min(1, banner.a + dt * 3);
    } else if (k.ptr.hit && k.ptr.y > OY + SN * S + 12) { const n = Math.floor((k.ptr.x - 24) / 43.2) + 1; if (n >= 1 && n <= 10) { padHit = n; setNum(n === 10 ? 0 : n); } }
    if (kd) { if (sel === null) sel = mid; else { const dd = { up: -SN, down: SN, left: -1, right: 1 }[kd]; sel = k.clamp(sel + dd, 0, SN * SN - 1); } }
    if (keyNum !== null) { setNum(keyNum); keyNum = null; }
    if (k.hit.has('a')) { if (sel === null) sel = mid; else if (!given[sel]) setNum((g[sel] + 1) % (SN + 1)); } /* mando: A cambia el número (1→N→vacío), B borra */
    if (k.hit.has('b') && sel !== null) setNum(0);
  }
  if (M === 'mines') {
    if (k.ptr.hit) { pressT = 0; longDone = false; downIn = true; }
    if (k.ptr.down && on && !longDone && Math.hypot(k.ptr.x - k.ptr.sx, k.ptr.y - k.ptr.sy) < 14) { pressT += dt; if (pressT > 0.38 && !g[cy * N + cx].open) { longDone = true; minesTap(cx, cy, true); navigator.vibrate && navigator.vibrate(15); } }
    if (k.ptr.up && downIn && !longDone && on) minesTap(cx, cy, flagMode);
    if (k.ptr.up && downIn && !longDone && k.ptr.y > OY + N * S + 10 && k.ptr.y < OY + N * S + 56) {
      if (HAND && k.ptr.x > W / 2 + 34) { if (hints > 0) hint(); else k.sfx('hurt'); }
      else { flagMode = !flagMode; k.sfx('pop'); } }
    if (k.ptr.up) downIn = false;
    if (!k.ptr.down) pressT = 0;
    if (kb && k.hit.has('a')) minesTap(cur[0], cur[1], flagMode); if (kb && k.hit.has('b')) minesTap(cur[0], cur[1], true);
    if (HAND) { if (hintT > 0) hintT -= dt; if (banner) banner.a = Math.min(1, banner.a + dt * 3); }
  }
  if (M === 'lights') { if (k.ptr.hit && on) lightsTap(cx, cy); if (k.hit.has('a')) lightsTap(cur[0], cur[1]); }
  if (M === 'pipes') { if (k.ptr.hit && on) pipesTap(cx, cy); if (k.hit.has('a')) pipesTap(cur[0], cur[1]); if (k.hit.has('b')) pipesTap(cur[0], cur[1], true); }
  if (M === 'slide') { const e = g.indexOf(0), ex = e % 4, ey = Math.floor(e / 4), km = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] };
    if (k.ptr.hit) skipSw = on && slideTo(cx, cy);
    const d = kd || (skipSw ? null : k.swipe); if (k.ptr.up) skipSw = false;
    if (d && km[d]) slideTo(ex + km[d][0], ey + km[d][1]); }
}, () => _draw());

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function num(s, x, y, size, col, w) { c.font = `${w || 800} ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y); }
function offscreen(fn) { const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const q = cv.getContext('2d'); q.scale(2, 2); fn(q); return cv; }
function renderBg() { return offscreen((q) => {
  const gr = q.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, BG[0]); gr.addColorStop(1, BG[1]); q.fillStyle = gr; q.fillRect(0, 0, W, H);
  q.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 40; i++) { q.beginPath(); q.arc(rnd(i) * W, rnd(i + 50) * H, 10 + rnd(i + 9) * 40, 0, R2); q.fill(); }
  // marco del tablero
  const bw = N * S, pad = M === 'slide' ? 16 : 10; q.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(q, OX - pad, OY - pad + 8, bw + pad * 2, bw + pad * 2, 18); q.fill();
  ART.rr(q, OX - pad, OY - pad, bw + pad * 2, bw + pad * 2, 18); ART.fillOut(q, { sudoku: '#e9dfc8', mines: '#3f6b3a', lights: '#3a3560', pipes: '#40506e', slide: '#7a4e2e' }[M], 3);
  q.fillStyle = 'rgba(255,255,255,.18)'; ART.rr(q, OX - pad + 6, OY - pad + 3, bw + pad * 2 - 12, 4, 2); q.fill();
  if (M === 'slide') { q.fillStyle = '#3a2416'; ART.rr(q, OX - 4, OY - 4, bw + 8, bw + 8, 10); q.fill(); q.strokeStyle = 'rgba(0,0,0,.4)'; q.lineWidth = 2; q.stroke();
    q.strokeStyle = 'rgba(255,220,170,.12)'; q.lineWidth = 1; for (let i = 0; i < 12; i++) { q.beginPath(); q.moveTo(OX - 16, OY - 16 + rnd(i) * (bw + 32)); q.bezierCurveTo(OX + bw * 0.3, OY + rnd(i + 3) * bw, OX + bw * 0.7, OY + rnd(i + 5) * bw, OX + bw + 16, OY - 16 + rnd(i + 7) * (bw + 32)); q.stroke(); } }
  if (M === 'pipes') for (let i = 0; i < N * N; i++) { const X = OX + (i % N) * S, Y = OY + Math.floor(i / N) * S; ART.rr(q, X + 1.5, Y + 1.5, S - 3, S - 3, 5); q.fillStyle = (i + Math.floor(i / N)) % 2 ? '#2b3a57' : '#283652'; q.fill(); q.fillStyle = 'rgba(255,255,255,.06)'; q.fillRect(X + 3, Y + 3, S - 6, 2); q.fillStyle = 'rgba(0,0,0,.35)'; for (const [a, b] of [[5, 5], [S - 5, 5], [5, S - 5], [S - 5, S - 5]]) { q.beginPath(); q.arc(X + a, Y + b, 1.6, 0, R2); q.fill(); } }
  if (M === 'lights') for (let i = 0; i < N * N; i++) { const X = OX + (i % N) * S, Y = OY + Math.floor(i / N) * S; ART.rr(q, X + 5, Y + 7, S - 10, S - 10, 14); q.fillStyle = 'rgba(0,0,0,.35)'; q.fill(); ART.rr(q, X + 5, Y + 5, S - 10, S - 10, 14); ART.fillOut(q, '#262143', 2); q.fillStyle = 'rgba(255,255,255,.07)'; ART.rr(q, X + 10, Y + 8, S - 20, 5, 2); q.fill(); }
}); }
// halo de bombilla cacheado
const haloCv = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 200; const q = cv.getContext('2d'), gr = q.createRadialGradient(100, 100, 5, 100, 100, 100); gr.addColorStop(0, 'rgba(255,230,120,.9)'); gr.addColorStop(0.4, 'rgba(255,200,60,.35)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); q.fillStyle = gr; q.fillRect(0, 0, 200, 200); return cv; })();
function wrap(s, size, maxw) {
  c.font = `700 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  const words = s.split(' '), out = []; let ln = '';
  for (const w of words) { const test = ln ? ln + ' ' + w : w; if (c.measureText(test).width > maxw && ln) { out.push(ln); ln = w; } else ln = test; }
  if (ln) out.push(ln); return out;
}
/* Cartel de la técnica del nivel: título + explicación corta, siempre encima del tablero. */
function handBanner() {
  if (!banner) return;
  const bw = 432, bx = (W - bw) / 2, by = 62, lines = wrap(banner.d, 12.5, bw - 24).slice(0, 3);
  const bh = 24 + 15 * lines.length + 8;
  c.globalAlpha = 0.35 + banner.a * 0.65;
  ART.rr(c, bx, by, bw, bh, 12); ART.fillOut(c, 'rgba(22,38,28,.86)', 2.5);
  c.fillStyle = 'rgba(255,255,255,.1)'; ART.rr(c, bx + 8, by + 3, bw - 16, 3, 2); c.fill();
  label(banner.t, bx + 12, by + 6, 15, medal ? '#ffd23d' : '#8fd14f');
  if (medal) label('★ Medalla', bx + bw - 12, by + 7, 13, '#ffd23d', 'right');
  for (let i = 0; i < lines.length; i++) label(lines[i], bx + 12, by + 25 + i * 15, 12.5, '#dff0d6');
  c.globalAlpha = 1;
}
/* HUD de Sudoku Zen: nivel, reloj contra el objetivo de 2★, fallos, cadena y barra de casillas. */
function hudSud() {
  const L = sOf(), p2 = Math.round(L.p2 * SDIFT[k.dif]);
  label(CFG.title, 16, 10, 17, '#ffd23d');
  label(`Nivel ${level}/${SLVN} · ${SN}×${SN}`, 16, 33, 14, '#cfd6ff');
  const tt = Math.floor(t), ts = `${Math.floor(tt / 60)}:${String(tt % 60).padStart(2, '0')}`;
  clock(W - 84, 21); label(ts, W - 18, 10, 20, tt > p2 ? '#ffb4a0' : '#fff', 'right');
  label(`Fallos ${mistakes}${chain >= 2 ? ' · Cadena ×' + chain : ''}`, W - 18, 33, 14, mistakes ? '#ffb4a0' : '#cfd6ff', 'right');
  sudBanner();
  const tot = SN * SN, fill = g.reduce((a, v) => a + (v ? 1 : 0), 0), bw = SN * S, by = OY + SN * S + 10;
  ART.rr(c, OX, by, bw, 8, 4); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill();
  if (fill) { ART.rr(c, OX, by, Math.max(8, bw * fill / tot), 8, 4); c.fillStyle = fill === tot ? '#7cf7a0' : '#6e62f5'; c.fill(); }
  label(`${fill}/${tot}`, OX + bw, by - 3, 12, '#cfd6ff', 'right');
}
function sudBanner() {
  if (!banner) return;
  const bw = 432, bx = (W - bw) / 2, by = 62, lines = wrap(banner.d, 12.5, bw - 24).slice(0, 3);
  const bh = 24 + 15 * lines.length + 8;
  c.globalAlpha = 0.35 + banner.a * 0.65;
  ART.rr(c, bx, by, bw, bh, 12); ART.fillOut(c, 'rgba(26,28,56,.88)', 2.5);
  c.fillStyle = 'rgba(255,255,255,.1)'; ART.rr(c, bx + 8, by + 3, bw - 16, 3, 2); c.fill();
  const st = k.starsOf ? k.starsOf(level) : 0;
  label(banner.t, bx + 12, by + 6, 15, st === 3 ? '#ffd23d' : '#a9bbff');
  if (st) label('★'.repeat(st), bx + bw - 12, by + 7, 13, '#ffd23d', 'right');
  for (let i = 0; i < lines.length; i++) label(lines[i], bx + 12, by + 25 + i * 15, 12.5, '#dfe3ff');
  c.globalAlpha = 1;
}
function hud() {
  if (SH) return hudSud();
  if (HAND) return hudHand();
  label(CFG.title, 16, 13, 19, '#ffd23d'); label(`Nivel ${level || 1}`, 16, 40, 14, '#cfd6ff');
  const tt = Math.floor(t), ts = `${Math.floor(tt / 60)}:${String(tt % 60).padStart(2, '0')}`; clock(W - 86, 24); label(ts, W - 18, 12, 22, '#fff', 'right');
  let sub = `Puntos ${score}`;
  if (M === 'mines') sub = `Minas ${nMines() - g.filter((q) => q.flag).length}` + (shield > 0 ? ' · Escudo' : '');
  if (M === 'lights') sub = `Toques ${moves} · Luces ${g.filter(Boolean).length}`;
  if (M === 'pipes') sub = `Conectadas ${litN}/${N * N}`;
  if (M === 'slide') sub = `Movimientos ${moves}`;
  label(sub, W - 18, 40, 14, '#cfd6ff', 'right');
}
/* HUD del modo con niveles: título + «Nivel n/20» a la izquierda, minas y reloj a la derecha.
   Se queda dentro de los 58 px de arriba, lejos de los botones de pausa/sonido del reproductor. */
function hudHand() {
  label(CFG.title, 16, 10, 17, '#ffd23d');
  label(`Nivel ${level}/${LVN}`, 16, 33, 14, '#cfd6ff');
  const tt = Math.floor(t), ts = `${Math.floor(tt / 60)}:${String(tt % 60).padStart(2, '0')}`;
  const par = lvOf().par, late = tt > par;
  clock(W - 84, 21); label(ts, W - 18, 10, 20, late ? '#ffb4a0' : '#fff', 'right');
  const left = nMines() - g.filter((q) => q.flag).length;
  label(`Minas ${left}${shield > 0 ? ' · Escudo' : ''}`, W - 18, 33, 14, left < 0 ? '#ffb4a0' : '#cfd6ff', 'right');
  handBanner();
}
function clock(x, y) { c.beginPath(); c.arc(x, y, 9, 0, R2); ART.fillOut(c, '#fff', 2); c.strokeStyle = OUT; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 5); c.moveTo(x, y); c.lineTo(x + 4, y + 1); c.stroke(); }
function cursorBox(x, y) { if (!kb || done) return; c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([8, 5]); c.lineDashOffset = -clk * 20; ART.rr(c, OX + x * S + 2, OY + y * S + 2, S - 4, S - 4, 8); c.stroke(); c.setLineDash([]); }
function flagIcon(x, y, s) {
  const parts = [[(h) => ART.rr(h, x - 4.6 * s, y - 12 * s, 2.4 * s, 22 * s, 1.2 * s), '#7a6f58'],
                 [(h) => { h.moveTo(x - 3 * s, y - 11 * s); h.lineTo(x + 10 * s, y - 5 * s); h.lineTo(x - 3 * s, y + 1 * s); h.closePath(); }, '#ff4d5e'],
                 [(h) => ART.rr(h, x - 10 * s, y + 9 * s, 13 * s, 4 * s, 2 * s), '#5a5470']];
  contact(c, x - 3.5 * s, y + 13.4 * s, 8 * s, 2.2 * s, 0.3);
  uni(c, parts, 1.5 * s);
  celm(c, parts, 1.4, 1.4);
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(x - 2 * s, y - 9.6 * s); c.lineTo(x + 5 * s, y - 6.4 * s); c.lineTo(x - 2 * s, y - 5 * s); c.closePath(); c.fill();
}
function mineIcon(x, y, r) { c.strokeStyle = OUT; c.lineWidth = r * 0.28; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.moveTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6); c.lineTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3); } c.stroke();
  c.beginPath(); c.arc(x, y, r, 0, R2); ART.fillOut(c, '#2a2638', 2); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, R2); c.fill(); }
function shovelIcon(x, y) { c.save(); c.translate(x, y); c.rotate(0.6);
  const parts = [[(h) => ART.rr(h, -2, -13, 4, 16, 2), '#a0703f'],
                 [(h) => { h.moveTo(-6, 2); h.lineTo(6, 2); h.lineTo(5, 10); h.quadraticCurveTo(0, 15, -5, 10); h.closePath(); }, '#c7d0da']];
  uni(c, parts, 1.5); celm(c, parts, 1.6, 1.6); c.restore(); }
function key3d(x, y, w, h, face, pressed) { ART.rr(c, x, y + 4, w, h, 10); c.fillStyle = OUT; c.fill(); const yy = y + (pressed ? 3 : 0); ART.rr(c, x, yy, w, h, 10); ART.fillOut(c, face, 2.5); c.fillStyle = 'rgba(255,255,255,.35)'; ART.rr(c, x + 6, yy + 4, w - 12, 4, 2); c.fill(); return yy; }

function drawSudoku() {
  const sr = sel !== null ? Math.floor(sel / SN) : -1, sc = sel !== null ? sel % SN : -1;
  const sb = sel !== null ? Math.floor(sr / BH) * BH * 100 + Math.floor(sc / BW) : -1, sv = sel !== null ? g[sel] : 0;
  for (let i = 0; i < SN * SN; i++) { const x = i % SN, y = Math.floor(i / SN), X = OX + x * S, Y = OY + y * S, b = Math.floor(y / BH) * BH * 100 + Math.floor(x / BW);
    let col = (Math.floor(x / BW) + Math.floor(y / BH)) % 2 ? '#fbf6ea' : '#f4eedd';
    if (sel !== null && (y === sr || x === sc || b === sb)) col = '#e3e8fb'; if (sv && g[i] === sv) col = '#c8d3fb'; if (SHOWC() && conf.has(i) && !given[i]) col = '#ffd9d9'; if (i === sel) col = '#a9bbff';
    if (SH && i === hintI && hintT > 0) col = '#ffe9a8';
    c.fillStyle = col; c.fillRect(X, Y, S, S); }
  for (const f of fx) { c.fillStyle = f.col + Math.min(0.55, f.t) + ')'; for (const i of f.cells) c.fillRect(OX + (i % SN) * S, OY + Math.floor(i / SN) * S, S, S); }
  c.strokeStyle = '#cfc5ad'; c.lineWidth = 1; c.beginPath(); for (let i = 1; i < SN; i++) { if (i % BW) { c.moveTo(OX + i * S, OY); c.lineTo(OX + i * S, OY + SN * S); } if (i % BH) { c.moveTo(OX, OY + i * S); c.lineTo(OX + SN * S, OY + i * S); } } c.stroke();
  c.strokeStyle = '#3a3f66'; c.lineWidth = 2.5; c.beginPath(); for (let i = BW; i < SN; i += BW) { c.moveTo(OX + i * S, OY); c.lineTo(OX + i * S, OY + SN * S); } for (let i = BH; i < SN; i += BH) { c.moveTo(OX, OY + i * S); c.lineTo(OX + SN * S, OY + i * S); } c.stroke();
  ART.rr(c, OX, OY, SN * S, SN * S, 6); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
  if (SH) for (let i = 0; i < SN * SN; i++) { const m = notes[i]; if (g[i] || !m) continue; /* marcas de candidatos: rejilla pequeña dentro de la casilla */
    const X = OX + (i % SN) * S, Y = OY + Math.floor(i / SN) * S, cols = SN === 4 ? 2 : 3, sz = Math.max(8, S * 0.26);
    for (let v = 1; v <= SN; v++) if (m & (1 << v)) num(v, X + ((v - 1) % cols + 0.5) * (S / cols), Y + (Math.floor((v - 1) / cols) + 0.5) * (S / Math.ceil(SN / cols)), sz, '#8b8fae', 700); }
  for (let i = 0; i < SN * SN; i++) { if (!g[i]) continue; const X = OX + (i % SN + 0.5) * S, Y = OY + (Math.floor(i / SN) + 0.5) * S + 1, a = anim[i], sz = (SH ? S * 0.58 : 27) * (1 + a * 0.45);
    num(g[i], X, Y, sz, given[i] ? '#262a4a' : SHOWC() && conf.has(i) ? '#e0344a' : '#4b5de0', given[i] ? 800 : 700); }
  if (sel !== null) { const X = OX + sc * S, Y = OY + sr * S; c.strokeStyle = noteMode ? '#f0a500' : '#4b5de0'; c.lineWidth = 3; ART.rr(c, X + 1.5, Y + 1.5, S - 3, S - 3, 6); c.stroke(); }
  // teclado numérico
  const cnt = Array(SN + 1).fill(0); g.forEach((v) => v && cnt[v]++);
  if (SH) {
    for (let n = 1; n <= SN + 1; n++) { const x = 12 + (n - 1) * KW + 2, w = KW - 4, full = n <= SN && cnt[n] >= SN;
      const pressed = k.ptr.down && k.ptr.y >= KY && k.ptr.y < KY + 46 && Math.floor((k.ptr.x - 12) / KW) + 1 === n;
      const yy = key3d(x, KY, w, 44, n === SN + 1 ? '#ff8a8a' : full ? '#b9bdd6' : noteMode ? '#ffe6b0' : '#ffffff', pressed);
      if (n <= SN) num(n, x + w / 2, yy + 23, Math.min(24, w * 0.6), full ? '#7d82a3' : '#2a2f55');
      else eraseIcon(x + w / 2, yy + 22); }
    const TL = [noteMode ? 'Notas ON' : 'Notas', 'Deshacer', 'Comprobar', 'Pista ' + hints];
    for (let i = 0; i < 4; i++) { const x = 12 + i * 116, w = 108;
      const pressed = k.ptr.down && k.ptr.y >= TY && k.ptr.y < TY + 38 && Math.floor((k.ptr.x - 12) / 116) === i;
      const off = i === 0 && noteMode ? '#f0a500' : i === 3 && hints <= 0 ? '#8b8fae' : '#dfe3ff';
      const yy = key3d(x, TY, w, 36, i === 0 && noteMode ? '#ffd98a' : '#3b4478', pressed);
      label(TL[i], x + w / 2, yy + 10, 13.5, i === 0 && noteMode ? '#2a2f55' : off, 'center'); }
    return;
  }
  for (let n = 1; n <= 10; n++) { const x = 24 + (n - 1) * 43.2 + 2, y = OY + 9 * S + 18, full = n < 10 && cnt[n] >= 9, pressed = k.ptr.down && k.ptr.y > y - 6 && Math.floor((k.ptr.x - 24) / 43.2) + 1 === n;
    const yy = key3d(x, y, 39, 44, n === 10 ? '#ff8a8a' : full ? '#b9bdd6' : '#ffffff', pressed);
    if (n < 10) num(n, x + 19.5, yy + 23, 24, full ? '#7d82a3' : '#2a2f55');
    else eraseIcon(x + 20, yy + 22); }
}
function eraseIcon(cx, cy) {
  c.beginPath(); c.moveTo(cx - 12, cy); c.lineTo(cx - 5, cy - 8); c.lineTo(cx + 11, cy - 8); c.lineTo(cx + 11, cy + 8); c.lineTo(cx - 5, cy + 8); c.closePath(); ART.fillOut(c, '#fff', 2);
  c.strokeStyle = '#e0344a'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - 1, cy - 4); c.lineTo(cx + 6, cy + 4); c.moveTo(cx + 6, cy - 4); c.lineTo(cx - 1, cy + 4); c.stroke();
}
function drawMines() {
  const NC = ['', '#2f6fd6', '#2e9e4a', '#e0443a', '#7a3fc4', '#d9821a', '#1aa3a3', '#333', '#888'];
  g.forEach((q, i) => { const x = i % N, y = Math.floor(i / N), X = OX + x * S, Y = OY + y * S, chk = (x + y) % 2, p = q.open ? k.clamp((clk - q.ot) / 0.15, 0, 1) : 0;
    if (q.open && p > 0) { c.fillStyle = q.boom ? '#ff5f4a' : q.mine ? (lost ? '#f2a08a' : '#bfe3a0') : chk ? '#ead6ac' : '#e1cb9d'; c.fillRect(X, Y, S, S);
      c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(X, Y, S, 3); c.fillRect(X, Y, 3, S);
      if (q.mine) { if (!q.flag || lost) mineIcon(X + S / 2, Y + S / 2, S * 0.2 * (0.6 + p * 0.4)); }
      else if (q.n) { c.save(); c.translate(X + S / 2, Y + S / 2 + 1); c.scale(0.6 + p * 0.4, 0.6 + p * 0.4); num(q.n, 0, 0, 28, NC[q.n], 900); c.restore(); } }
    if (!q.open || p < 1) { const s = 1 - p; c.save(); c.translate(X + S / 2, Y + S / 2); c.scale(s, s); c.fillStyle = chk ? '#8fd14f' : '#83c646'; c.fillRect(-S / 2, -S / 2, S, S); c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(-S / 2, -S / 2, S, 4); c.fillRect(-S / 2, -S / 2, 4, S); c.fillStyle = 'rgba(0,60,0,.22)'; c.fillRect(-S / 2, S / 2 - 4, S, 4); c.fillRect(S / 2 - 4, -S / 2, 4, S);
      if (q.flag) { const a = anim[i]; c.scale(1 + a * 0.4, 1 + a * 0.4); flagIcon(0, 0, 1); } c.restore(); }
    else if (q.flag && q.mine && !lost) { flagIcon(X + S / 2, Y + S / 2, 1); }
  });
  // presión larga: anillo de progreso
  if (k.ptr.down && !longDone && pressT > 0.08 && !done) { c.strokeStyle = '#fff'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(k.ptr.x, k.ptr.y - 34, 14, -Math.PI / 2, -Math.PI / 2 + R2 * Math.min(1, pressT / 0.38)); c.stroke(); }
  ART.rr(c, OX, OY, N * S, N * S, 6); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke(); cursorBox(cur[0], cur[1]);
  if (boom && boom.t < 0.6) { c.globalAlpha = 1 - boom.t / 0.6; c.fillStyle = '#ffd23d'; c.beginPath(); c.arc(boom.x, boom.y, 20 + boom.t * 160, 0, R2); c.fill(); c.globalAlpha = 1; }
  if (hintT > 0 && hintI >= 0) { const hx = OX + (hintI % N) * S, hy = OY + Math.floor(hintI / N) * S;
    c.strokeStyle = '#7cf7a0'; c.lineWidth = 3.5; ART.rr(c, hx + 2, hy + 2, S - 4, S - 4, 6); c.globalAlpha = Math.min(1, hintT); c.stroke(); c.globalAlpha = 1; }
  const by = OY + N * S + 12, down = k.ptr.down && k.ptr.y > by - 4 && k.ptr.y < by + 46;
  if (!HAND) {
    const yy = key3d(W / 2 - 110, by, 220, 42, flagMode ? '#ff6b7a' : '#6e62f5', down);
    if (flagMode) flagIcon(W / 2 - 80, yy + 21, 0.85); else shovelIcon(W / 2 - 80, yy + 21);
    label(flagMode ? 'Modo bandera' : 'Modo excavar', W / 2 + 12, yy + 11, 18, '#fff', 'center');
    label('Mantén pulsado para poner bandera', W / 2, by + 49, 12, '#cfe6c0', 'center');
    return;
  }
  const bx = 34, bw = 262, yy = key3d(bx, by, bw, 42, flagMode ? '#ff6b7a' : '#6e62f5', down && k.ptr.x <= W / 2 + 34);
  if (flagMode) flagIcon(bx + 30, yy + 21, 0.8); else shovelIcon(bx + 30, yy + 21);
  label(flagMode ? 'Modo bandera' : 'Modo excavar', bx + 56, yy + 12, 16, '#fff');
  const hx = W / 2 + 46, hw = W - 34 - hx, hyy = key3d(hx, by, hw, 42, hints > 0 ? '#3f8f52' : '#4a4a5e', down && k.ptr.x > W / 2 + 34);
  label(hints > 0 ? `Pista ${hints}` : 'Sin pistas', hx + hw / 2, hyy + 12, hints > 0 ? 16 : 14, hints > 0 ? '#fff' : '#b9bdd6', 'center');
}
/* Bombilla: pieza única (casquillo + globo fundidos) cacheada por brillo (R5 §8) */
const bulbCv = {};
function bulbSprite(b) {
  const key = b; let q = bulbCv[key]; if (q) return q;
  const d = Math.ceil(48 * CDPR), dh = Math.ceil(56 * CDPR);
  q = document.createElement('canvas'); q.width = d; q.height = dh;
  const g = q.getContext('2d'); g.scale(d / 48, dh / 56); g.translate(24, 26);
  const off = [0x4a, 0x50, 0x74], onc = [0xff, 0xd2, 0x3d], mx = off.map((o, j) => Math.round(o + (onc[j] - o) * b)), col = `rgb(${mx[0]},${mx[1]},${mx[2]})`;
  const parts = [[(h) => { h.moveTo(8, 12); h.arc(0, -2, 18, Math.PI * 0.8, Math.PI * 2.2); h.lineTo(8, 12); h.closePath(); }, col],
                 [(h) => ART.rr(h, -9, 12, 18, 12, 3), '#a8adc4']];
  contact(g, 0, 25, 11, 3, 0.3);
  uni(g, parts, 1.5);
  celm(g, parts, 3.2, 3.2);
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-9, 16); g.lineTo(9, 16); g.moveTo(-9, 20); g.lineTo(9, 20); g.stroke();
  g.strokeStyle = b > 0.5 ? '#fff6c8' : 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-5, 10); g.lineTo(-4, 0); g.lineTo(0, 4); g.lineTo(4, 0); g.lineTo(5, 10); g.stroke();
  spec(g, -8, -8, 3.5, 6, 0.5, 0.55);
  bulbCv[key] = q; return q;
}
function drawLights() {
  g.forEach((v, i) => { const x = i % N, y = Math.floor(i / N), cx = OX + (x + 0.5) * S, cy = OY + (y + 0.5) * S - 4, b = glow[i], a = anim[i], s = 1 + a * 0.12;
    if (b > 0.02) { c.globalAlpha = b * (0.85 + Math.sin(clk * 5 + i) * 0.08); c.drawImage(haloCv, cx - S * 0.85, cy - S * 0.85, S * 1.7, S * 1.7); c.globalAlpha = 1; }
    const q = bulbSprite(Math.round(b * 8) / 8);
    c.save(); c.translate(cx, cy); c.scale(s, s); c.drawImage(q, -24, -26, 48, 56); c.restore(); });
  cursorBox(cur[0], cur[1]);
}
function drawPipes() {
  const on = lit(); litN = on.size; const wave = done ? doneT * 14 : -1;
  g.forEach((q, i) => { const x = i % N, y = Math.floor(i / N), cx = OX + (x + 0.5) * S, cy = OY + (y + 0.5) * S, d = on.get(x + ',' + y), wet = d !== undefined, hl = wet && wave >= 0 && Math.abs(wave - d) < 1.2;
    c.save(); c.translate(cx, cy); c.rotate(q.ra); const L = S / 2, dirs = DD.filter((_, j) => q.c[j]);
    const path = () => { c.beginPath(); for (const dd of dirs) { c.moveTo(0, 0); c.lineTo(dd[0] * L, dd[1] * L); } };
    c.lineCap = 'round'; path(); c.strokeStyle = OUT; c.lineWidth = S * 0.34; c.stroke(); c.lineCap = 'butt'; path(); c.stroke();
    path(); c.strokeStyle = hl ? '#bff4ff' : wet ? '#2f9bf0' : '#8b93ad'; c.lineWidth = S * 0.24; c.lineCap = 'round'; c.stroke();
    if (wet) { path(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = S * 0.07; c.setLineDash([S * 0.12, S * 0.18]); c.lineDashOffset = -clk * S * 0.8; c.stroke(); c.setLineDash([]); }
    else { path(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = S * 0.05; c.stroke(); }
    // bridas en los bordes
    for (const dd of dirs) { c.save(); c.rotate(Math.atan2(dd[1], dd[0])); ART.rr(c, L - S * 0.1, -S * 0.17, S * 0.08, S * 0.34, 2); ART.fillOut(c, wet ? '#6fc3ff' : '#a9b0c6', 1.5); c.restore(); }
    c.beginPath(); c.arc(0, 0, S * 0.15, 0, R2); ART.fillOut(c, wet ? '#5bb8ff' : '#9aa2bb', 2);
    if (dirs.length === 1 && !(x === src[0] && y === src[1])) { c.beginPath(); c.arc(0, 0, S * 0.22, 0, R2); ART.fillOut(c, wet ? '#7cf7a0' : '#5a627e', 2.5); c.fillStyle = wet ? '#fff' : '#3a4058'; c.beginPath(); c.arc(0, 0, S * 0.08, 0, R2); c.fill(); }
    c.restore();
    if (x === src[0] && y === src[1]) { const sp = [[(h) => ART.rr(h, cx - S * 0.3, cy - S * 0.3, S * 0.6, S * 0.6, S * 0.12), '#ffd23d']];
      uni(c, sp, 1.6); celp(c, sp, '#ffd23d', S * 0.09, S * 0.09);
      inpath(c, sp, (h) => { const lv = 0.5 + Math.sin(clk * 3) * 0.08; h.fillStyle = '#2f9bf0'; h.fillRect(cx - S * 0.22, cy + S * 0.22 - S * 0.44 * lv, S * 0.44, S * 0.44 * lv); h.fillStyle = 'rgba(255,255,255,.35)'; h.fillRect(cx - S * 0.22, cy + S * 0.22 - S * 0.44 * lv, S * 0.44, S * 0.05); });
      spec(c, cx - S * 0.14, cy - S * 0.2, S * 0.1, S * 0.04, -0.5, 0.6); }
  });
  cursorBox(cur[0], cur[1]);
}
const tileCv = (() => { const s = 96, cv = document.createElement('canvas'); cv.width = cv.height = s * 2; const q = cv.getContext('2d'); q.scale(2, 2);
  ART.rr(q, 2, 6, s - 4, s - 6, 12); q.fillStyle = '#6e4424'; q.fill(); ART.rr(q, 2, 2, s - 4, s - 8, 12); q.fillStyle = '#e2b06e'; q.fill();
  q.save(); q.clip(); q.strokeStyle = 'rgba(150,95,45,.35)'; q.lineWidth = 1.5; for (let i = 0; i < 7; i++) { q.beginPath(); q.moveTo(0, 8 + i * 13 + rnd(i) * 4); q.bezierCurveTo(30, 4 + i * 13 + rnd(i + 2) * 10, 60, 12 + i * 13 - rnd(i + 4) * 10, s, 8 + i * 13); q.stroke(); } q.restore();
  q.fillStyle = 'rgba(255,255,255,.35)'; ART.rr(q, 10, 6, s - 20, 5, 2); q.fill(); ART.rr(q, 2, 2, s - 4, s - 4, 12); q.lineWidth = 2.5; q.strokeStyle = OUT; q.stroke(); return cv; })();
function drawSlide() {
  const order = g.map((v, i) => v).filter(Boolean);
  for (const v of order) { const r = rp[v], X = OX + r[0] * S + 4, Y = OY + r[1] * S + 4, ok = g[v - 1] === v, sz = S - 8;
    c.drawImage(tileCv, X, Y, sz, sz);
    if (ok) { c.fillStyle = 'rgba(124,247,160,.22)'; ART.rr(c, X + 3, Y + 3, sz - 6, sz - 12, 10); c.fill(); c.beginPath(); c.arc(X + sz - 14, Y + 14, 5, 0, R2); ART.fillOut(c, '#5fd37a', 1.5); }
    num(v, X + sz / 2, Y + sz / 2 + 1, 40, 'rgba(255,240,210,.8)'); num(v, X + sz / 2, Y + sz / 2 - 1, 40, '#5a3418'); }
  if (done) { c.globalAlpha = Math.min(0.5, doneT) * (0.6 + Math.sin(doneT * 8) * 0.4); c.fillStyle = '#fff6c8'; ART.rr(c, OX, OY, N * S, N * S, 10); c.fill(); c.globalAlpha = 1; }
}
/* =====================================================================================
   PIPE-CONNECT a la vara (PH): 20 tableros de PIPELV, reglas en PIPELV.rules.
   Todo lo de aquí abajo solo se ejecuta si PH existe (CFG.id con tabla y modo 'pipes').
   ===================================================================================== */
function buildPipe() {
  const L = pLv(); PB = PR.parse(L); pm = PR.start(PB); pra = new Float32Array(PB.n); pVAng = new Float32Array(PB.n);
  pTaps = 0; pUsed = 0; pHints = PR.HN[k.dif]; pHintSet = new Set(); pFed = new Set(); pChain = 0; pChainT = 0; pDrips = []; pFail = null; pWin = 0; pMsg = null; pPress = -1;
  const ts = PR.TS[k.dif]; pWT = L.w ? L.w[0] * ts : 0; pWS = L.w ? L.w[1] * ts : 0; pVH = (L.vh || 0) * ts;
  PS = PR.wetStart(PB); pwet = new Float32Array(PB.n * 2).fill(-1); pPhase = L.w ? 1 : 0; pNext = pWT;
  /* distancia (en la solución) a la fuente: la pista arregla primero lo más cercano */
  pDist = new Array(PB.n).fill(1e9); const q = []; for (const s of PB.src) { pDist[s] = 0; q.push(s); }
  while (q.length) { const i = q.shift(); for (let d = 0; d < 4; d++) if (PB.sol[i] & (1 << d)) { const j = PR.nb(PB, i, d); if (j >= 0 && pDist[j] > pDist[i] + 1) { pDist[j] = pDist[i] + 1; q.push(j); } } }
  pev = pEval(); cur = [PB.src[0] % PB.w, Math.floor(PB.src[0] / PB.w)]; kb = false;
  anim = new Array(PB.n).fill(0); N = Math.max(PB.w, PB.h);
  banner = { a: 0 }; layoutP();
}
function pEval() { return PR.evalB(PB, pm, pPhase ? pShut : null); }
/* ---------- disposición (lienzo fluido) ---------- */
function layoutP() {
  if (!PB) return;
  pWide = k.W >= k.H * 1.18; pTop = 58;
  if (pWide) {
    pPanW = Math.round(k.clamp(k.W * 0.3, 190, 290)); pPanX = Math.round(k.ex2(14) - pPanW);
    const aw = pPanX - 30, ah = k.H - pTop - 18;
    S = Math.floor(Math.min(aw / PB.w, ah / PB.h, 96));
    OX = Math.round(16 + (aw - S * PB.w) / 2); OY = Math.round(pTop + (ah - S * PB.h) / 2);
  } else {
    pBan = 44; const bot = 58;
    const aw = k.W - 24, ah = k.H - pTop - pBan - bot - 22;
    S = Math.floor(Math.min(aw / PB.w, ah / PB.h, 96));
    OX = Math.round((k.W - S * PB.w) / 2); OY = Math.round(pTop + pBan + 8 + (ah - S * PB.h) / 2);
    pBarY = Math.round(k.H - bot - 4);
  }
  pBoardCv = null; pBgCv = null; for (const key in pSpr) delete pSpr[key];
}
/* ---------- acciones ---------- */
function pCountWet(ev) { let n = 0; for (let v = 0; v < ev.col.length; v++) if (ev.col[v] >= 0) n++; return n; }
function pRotate(i, back) {
  if (done || i < 0) return;
  const X = OX + (i % PB.w + 0.5) * S, Y = OY + (Math.floor(i / PB.w) + 0.5) * S;
  if (PB.valve[i]) { pValve(i); return; }
  if (PB.rock[i]) return;
  if (PB.fixed[i] || pHintSet.has(i)) { k.sfx('hit'); anim[i] = 1; k.float(PB.cross[i] ? 'Puente' : 'Atornillada', X, Y - S * 0.4, '#cfd6ff'); return; }
  if (pPhase && PR.wetCell(PS, i)) { k.sfx('hit'); anim[i] = 1; k.float('Ya lleva agua', X, Y - S * 0.4, '#bfe6ff'); return; }
  const before = pCountWet(pev);
  pm[i] = back ? ((pm[i] >> 1) | ((pm[i] & 1) << 3)) & 15 : PR.rot(pm[i]);
  pra[i] += back ? Math.PI / 2 : -Math.PI / 2; pTaps++; k.sfx('click');
  pev = pEval(); const after = pCountWet(pev);
  if (after > before) {
    pChain++; pChainT = 2.5; k.chime && k.chime(Math.min(7, pChain - 1)); k.burst(X, Y, '#bfe6ff', 6, 90);
    if (pChain >= 3) k.combo && k.combo(pChain, X, Y - S * 0.5);
  } else if (after < before) { pChain = 0; k.chainReset && k.chainReset(); }
  pAfter();
}
/* lo que pasa tras cualquier cambio: casas con agua, mezclas, victoria */
function pAfter() {
  for (let i = 0; i < PB.n; i++) if (PB.house[i] && pev.col[2 * i] === PB.col[i] && !pFed.has(i)) {
    pFed.add(i); const X = OX + (i % PB.w + 0.5) * S, Y = OY + (Math.floor(i / PB.w) + 0.5) * S;
    k.reward('¡Casa con agua!', WCOL[PB.col[i]]); k.punch(0.05); k.hitstop(0.05); k.sfx('coin'); k.burst(X, Y, WCOL[PB.col[i]], 16, 140); anim[i] = 1;
  }
  let mixed = false; for (let v = 0; v < pev.col.length; v++) if (pev.col[v] === -2) { mixed = true; break; }
  if (mixed && !pPhase) pMsg = ['¡Se mezclan dos colores!', '#ffb4c8', 1.6];
  if (pev.ok && (!pPhase || PB.valve.every((v, i) => !v || PS.open[i]))) pSolved();
}
function pValve(i) {
  const X = OX + (i % PB.w + 0.5) * S, Y = OY + (Math.floor(i / PB.w) + 0.5) * S;
  if (!pPhase) { k.sfx('hit'); return; }
  if (PS.open[i]) { k.sfx('hit'); k.float('Ya está abierta', X, Y - S * 0.4, '#c4f5d3'); return; }
  PS.open[i] = 1; PS.hold[i] = 0; k.sfx('pop'); k.punch(0.04); k.burst(X, Y, '#7cf7a0', 10, 110); k.float('¡Abierta!', X, Y - S * 0.4, '#7cf7a0');
  pev = pEval(); pAfter();
}
function pHint() {
  if (done || pHints <= 0 || k.st !== 'play') { k.sfx('hurt'); return; }
  let best = -1;
  for (let i = 0; i < PB.n; i++) { if (PB.fixed[i] || pHintSet.has(i) || pm[i] === PB.sol[i] || (pPhase && PR.wetCell(PS, i))) continue; if (best < 0 || pDist[i] < pDist[best]) best = i; }
  if (best < 0) {
    /* todo bien girado: solo faltan válvulas por abrir */
    for (let i = 0; i < PB.n; i++) if (PB.valve[i] && !PS.open[i]) { pMsg = ['Abre la válvula', '#7cf7a0', 2]; return; }
    k.sfx('hurt'); return;
  }
  pHints--; pUsed++; pm[best] = PB.sol[best]; pra[best] = 0; pHintSet.add(best); anim[best] = 1; pBoardCv = null;
  const X = OX + (best % PB.w + 0.5) * S, Y = OY + (Math.floor(best / PB.w) + 0.5) * S;
  k.sfx('pop'); k.float('Pista', X, Y - S * 0.45, '#ffd23d'); k.burst(X, Y, '#ffd23d', 10, 100);
  pev = pEval(); pAfter();
}
function pSolved() {
  if (done) return; done = true; doneT = 0; pWin = 1;
  /* el agua termina de llenar lo que quedaba seco: se ve correr */
  const col = PR.evalB(PB, pm, null).col; for (let v = 0; v < col.length; v++) if (col[v] >= 0 && pwet[v] < 0) { PS.wet[v] = col[v]; pwet[v] = clk + pDist[v >> 1] * 0.05; }
  pPhase = pPhase ? 2 : 0;
  k.sfx('win'); k.confetti(); k.punch(0.08); k.hitstop(0.06);
  later(pDone, 1300);
}
function pDone() {
  const G = pGoals(), stars = pTaps <= G.s3 && !pUsed ? 3 : pTaps <= G.s2 ? 2 : 1;
  score = Math.max(100, 1000 + (G.s2 - pTaps) * 25 + (pLv().w ? 300 : 0)) * (stars === 3 ? 2 : 1); k.best(CFG.id, score);
  let falta = '';
  if (stars === 1) falta = `Para 2★: ${G.s2} giros o menos.`;
  else if (stars === 2) falta = 'Para 3★: ' + [pTaps > G.s3 ? `${G.s3} giros o menos` : '', pUsed ? 'sin pistas' : ''].filter(Boolean).join(' y ') + '.';
  k.levelDone(score, `${pLv().n} · Giros ${pTaps} (mínimo ${G.min}) · 2★ ≤ ${G.s2} · 3★ ≤ ${G.s3} sin pistas${pUsed ? ' · Pistas ' + pUsed : ''}${falta ? '<br><b>' + falta + '</b>' : ''}`, { stars });
}
function pLose(why, i) {
  if (done) return; done = true; lost = true; pFail = { i, t: 0 };
  const X = OX + (i % PB.w + 0.5) * S, Y = OY + (Math.floor(i / PB.w) + 0.5) * S;
  k.sfx('explode'); k.shake(9); k.hitstop(0.08); k.flash('rgba(120,190,255,.45)'); k.burst(X, Y, '#2f9bf0', 30, 240);
  let bad = 0; for (let j = 0; j < PB.n; j++) if (!PB.rock[j] && pm[j] !== PB.sol[j]) bad++;
  const head = { atasco: '¡Agua encerrada!', fuga: '¡Fuga!', mezcla: '¡Se mezclan!', casa: '¡Casa equivocada!', valvula: '¡Revienta la válvula!' }[why];
  const det = { atasco: 'El agua se cerró en un circuito y ya no puede llegar al resto.', fuga: 'El agua llegó a una boca sin tubo.', mezcla: 'Dos colores se tocaron.', casa: 'Esa casa pedía otro color.', valvula: 'La válvula aguantó el agua demasiado tiempo.' }[why];
  later(() => k.lose(CFG.id, score, head, `${det}<br>Nivel ${level}/${PH.length} · te faltaban ${bad} pieza${bad === 1 ? '' : 's'} por colocar`), 1300);
}
/* ---------- bucle ---------- */
function updPipe(dt) {
  clk += dt; for (let i = 0; i < anim.length; i++) if (anim[i] > 0) anim[i] = Math.max(0, anim[i] - dt * 5);
  for (let i = 0; i < PB.n; i++) if (pra[i]) pra[i] += k.clamp(-pra[i], -dt * 14, dt * 14);
  for (let i = 0; i < PB.n; i++) if (PB.valve[i]) pVAng[i] += ((PS.open[i] ? 1.6 : 0) - pVAng[i]) * Math.min(1, dt * 10);
  if (banner) banner.a = Math.min(1, banner.a + dt * 3);
  if (pMsg) { pMsg[2] -= dt; if (pMsg[2] <= 0) pMsg = null; }
  if (pChainT > 0) { pChainT -= dt; if (pChainT <= 0) { pChain = 0; k.chainReset && k.chainReset(); } }
  if (pFail) pFail.t += dt;
  if (done) { doneT += dt; return; }
  t += dt;
  /* agua con reloj */
  if (pPhase === 1 && t >= pWT) {
    pPhase = 2; PR.release(PB, PS); for (const s of PB.src) pwet[2 * s] = clk; k.sfx('start'); k.reward('¡Sale el agua!', '#2f9bf0'); pev = pEval();
  }
  if (pPhase === 2) {
    if (t >= pNext) {
      pNext += pWS;
      const r = PR.step(PB, pm, PS);
      for (const u of r.fresh) { pwet[u] = clk; const i = u >> 1; anim[i] = Math.max(anim[i], 0.5); if (PB.house[i]) k.sfx('coin'); }
      if (r.fresh.length) k.sfx('pop');
      pDrips = r.drips; if (r.drips.length) k.sfx('tick');
      if (r.fail) return pLose(r.fail.why, r.fail.i);
      pev = pEval(); pAfter(); if (done) return;
    }
    for (let i = 0; i < PB.n; i++) if (PB.valve[i] && !PS.open[i] && PS.wet[2 * i] >= 0) { PS.hold[i] += dt; if (PS.hold[i] >= pVH) return pLose('valvula', i); }
  }
  /* entrada: toque = girar a la derecha; mantener = al revés */
  const cx = Math.floor((k.ptr.x - OX) / S), cy = Math.floor((k.ptr.y - OY) / S), on = cx >= 0 && cy >= 0 && cx < PB.w && cy < PB.h;
  if (k.ptr.hit) { kb = false; pPress = on ? cy * PB.w + cx : -2; pPressT = 0; pLong = false; if (!on && pHintHit()) { pPress = -3; pHint(); } }
  if (k.ptr.down && pPress >= 0 && !pLong && Math.hypot(k.ptr.x - k.ptr.sx, k.ptr.y - k.ptr.sy) < 14) { pPressT += dt; if (pPressT > 0.4) { pLong = true; pRotate(pPress, true); navigator.vibrate && navigator.vibrate(15); } }
  if (k.ptr.up && pPress >= 0 && !pLong && on && cy * PB.w + cx === pPress) pRotate(pPress, false);
  if (k.ptr.up) pPress = -1;
  const kd = ['up', 'down', 'left', 'right'].find((d) => k.hit.has(d));
  if (kd) { kb = true; const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[kd]; cur = [k.clamp(cur[0] + d[0], 0, PB.w - 1), k.clamp(cur[1] + d[1], 0, PB.h - 1)]; k.sfx('click'); }
  if (k.hit.has('a')) { kb = true; pRotate(cur[1] * PB.w + cur[0], false); }
  if (k.hit.has('b')) { kb = true; pRotate(cur[1] * PB.w + cur[0], true); }
}
/* botón de pista: abajo en vertical, en el panel en apaisado */
function pHintRect() { return pWide ? [pPanX, k.H - 70, pPanW, 50] : [k.W - 16 - Math.min(150, k.W * 0.38), pBarY + 4, Math.min(150, k.W * 0.38), 46]; }
function pHintHit() { const [x, y, w, h] = pHintRect(); return k.ptr.x >= x && k.ptr.x <= x + w && k.ptr.y >= y && k.ptr.y <= y + h; }

/* ---------- dibujo ---------- */
function pSprite(key, w, h, fn) {
  let q = pSpr[key]; if (q) return q;
  q = document.createElement('canvas'); q.width = Math.ceil(w * CDPR); q.height = Math.ceil(h * CDPR);
  const g2 = q.getContext('2d'); g2.scale(CDPR, CDPR); fn(g2); pSpr[key] = q; return q;
}
/* fondo: degradado y burbujas horneadas a resolución real */
function pBg() {
  if (pBgCv) return pBgCv;
  const cv = document.createElement('canvas'); cv.width = Math.ceil(k.W * CDPR); cv.height = Math.ceil(k.H * CDPR);
  const q = cv.getContext('2d'); q.scale(CDPR, CDPR);
  const gr = q.createLinearGradient(0, 0, 0, k.H); gr.addColorStop(0, '#243a56'); gr.addColorStop(1, '#0d1828'); q.fillStyle = gr; q.fillRect(0, 0, k.W, k.H);
  q.strokeStyle = 'rgba(160,200,255,.05)'; q.lineWidth = 10; for (let i = 0; i < 9; i++) { q.beginPath(); const y = rnd(i + 3) * k.H; q.moveTo(-20, y); q.bezierCurveTo(k.W * 0.3, y - 60, k.W * 0.6, y + 80, k.W + 20, y + 10); q.stroke(); }
  /* placa del tablero con sombra, casillas, rocas y tornillos (lo que no se mueve) */
  const bw = PB.w * S, bh = PB.h * S, pad = 10;
  q.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(q, OX - pad, OY - pad + 8, bw + pad * 2, bh + pad * 2, 16); q.fill();
  ART.rr(q, OX - pad, OY - pad, bw + pad * 2, bh + pad * 2, 16); ART.fillOut(q, '#40506e', 3);
  q.fillStyle = 'rgba(255,255,255,.16)'; ART.rr(q, OX - pad + 8, OY - pad + 3, bw + pad * 2 - 16, 4, 2); q.fill();
  for (let i = 0; i < PB.n; i++) {
    const X = OX + (i % PB.w) * S, Y = OY + Math.floor(i / PB.w) * S;
    if (PB.rock[i]) { q.fillStyle = '#2a3346'; ART.rr(q, X + 1.5, Y + 1.5, S - 3, S - 3, 6); q.fill(); pRock(q, X + S / 2, Y + S / 2, S); continue; }
    ART.rr(q, X + 1.5, Y + 1.5, S - 3, S - 3, 6); q.fillStyle = (i % PB.w + Math.floor(i / PB.w)) % 2 ? '#2d3d5b' : '#2a3855'; q.fill();
    q.fillStyle = 'rgba(255,255,255,.06)'; q.fillRect(X + 4, Y + 3, S - 8, 2);
    if (PB.fixed[i] && !PB.cross[i] && !PB.valve[i]) { /* placa atornillada: más oscura con cuatro tornillos */
      ART.rr(q, X + 3, Y + 3, S - 6, S - 6, 6); q.fillStyle = '#1f2a40'; q.fill();
      for (const [a, b] of [[7, 7], [S - 7, 7], [7, S - 7], [S - 7, S - 7]]) { q.beginPath(); q.arc(X + a, Y + b, Math.max(2, S * 0.05), 0, R2); ART.fillOut(q, '#b9c2d8', 1); q.strokeStyle = '#5a6278'; q.lineWidth = 1; q.beginPath(); q.moveTo(X + a - 2, Y + b); q.lineTo(X + a + 2, Y + b); q.stroke(); }
    }
  }
  pBgCv = cv; return cv;
}
function pRock(q, x, y, s) {
  const r = s * 0.36, parts = [[(h) => { h.moveTo(x - r, y + r * 0.6); h.quadraticCurveTo(x - r * 1.05, y - r * 0.3, x - r * 0.35, y - r * 0.75); h.quadraticCurveTo(x + r * 0.3, y - r * 1.05, x + r * 0.8, y - r * 0.35); h.quadraticCurveTo(x + r * 1.1, y + r * 0.3, x + r * 0.85, y + r * 0.65); h.closePath(); }, '#7d7f93']];
  contact(q, x, y + r * 0.7, r * 1.05, r * 0.22, 0.35); uni(q, parts, 1.5); celp(q, parts, '#7d7f93', r * 0.12, r * 0.12); spec(q, x - r * 0.3, y - r * 0.45, r * 0.18, r * 0.09, -0.4, 0.45);
}
/* casa: pieza única (tejado + fachada), un sprite por color y estado */
function pHouse(col, fed) {
  const s = S;
  return pSprite('h' + col + fed + s, s, s, (g2) => {
    const x = s / 2, y = s / 2 + s * 0.04, w = s * 0.5, h = s * 0.34;
    const parts = [[(h2) => ART.rr(h2, x - w * 0.42, y - h * 0.15, w * 0.84, h * 0.95, 3), '#efe6d2'],
      [(h2) => { h2.moveTo(x - w * 0.6, y - h * 0.1); h2.lineTo(x, y - h * 0.95); h2.lineTo(x + w * 0.6, y - h * 0.1); h2.closePath(); }, WCOL[col]]];
    contact(g2, x, y + h * 0.82, w * 0.5, h * 0.12, 0.35); uni(g2, parts, 1.4); celm(g2, parts, 1.2, 1.2);
    g2.fillStyle = fed ? '#ffe17a' : '#3b4568'; ART.rr(g2, x - w * 0.14, y + h * 0.12, w * 0.28, h * 0.3, 2); g2.fill();
    if (fed) { g2.fillStyle = 'rgba(255,240,170,.5)'; g2.beginPath(); g2.arc(x, y + h * 0.27, w * 0.3, 0, R2); g2.fill(); }
  });
}
/* fuente: depósito de una pieza con el color de su agua */
function pSource(col) {
  const s = S;
  return pSprite('s' + col + s, s, s, (g2) => {
    const x = s / 2, y = s / 2, r = s * 0.3;
    const parts = [[(h2) => ART.rr(h2, x - r, y - r, r * 2, r * 2, r * 0.35), '#ffd23d']];
    contact(g2, x, y + r * 1.02, r * 0.95, r * 0.2, 0.35); uni(g2, parts, 1.6); celp(g2, parts, '#ffd23d', r * 0.18, r * 0.18);
    g2.fillStyle = WCOL[col]; ART.rr(g2, x - r * 0.68, y - r * 0.68, r * 1.36, r * 1.36, r * 0.25); g2.fill();
    spec(g2, x - r * 0.45, y - r * 0.62, r * 0.28, r * 0.1, -0.4, 0.6);
  });
}
function pNodeCol(v) {
  if (pPhase === 2) { const c2 = PS.wet[v]; return c2 >= 0 ? c2 : -1; }
  if (pPhase === 1) return -1;
  return pev.col[v];
}
function pTile(i) {
  const x = i % PB.w, y = Math.floor(i / PB.w), cx = OX + (x + 0.5) * S, cy = OY + (y + 0.5) * S, m = pm[i], L = S / 2;
  const a = anim[i] || 0, sc = 1 + a * 0.08;
  c.save(); c.translate(cx, cy); if (sc !== 1) c.scale(sc, sc); c.rotate(pra[i]);
  const groups = PB.cross[i] ? [[0, 2], [1, 3]] : [[0, 1, 2, 3].filter((d) => m & (1 << d))];
  for (const gd of groups) {
    const dirs = gd.filter((d) => m & (1 << d)); if (!dirs.length) continue;
    const v = PR.node(PB, i, dirs[0]), wc = pNodeCol(v), dryCon = pPhase === 1 && pev.col[v] >= 0 ? pev.col[v] : -1;
    const path = () => { c.beginPath(); if (PB.cross[i]) { const d0 = PR.DX[dirs[0]], e0 = PR.DY[dirs[0]]; c.moveTo(-d0 * L, -e0 * L); c.lineTo(d0 * L, e0 * L); } else for (const d of dirs) { c.moveTo(0, 0); c.lineTo(PR.DX[d] * L, PR.DY[d] * L); } };
    c.lineCap = 'butt'; path(); c.strokeStyle = OUT; c.lineWidth = S * 0.36; c.stroke();
    if (!PB.cross[i]) { c.beginPath(); c.arc(0, 0, S * 0.18, 0, R2); c.fillStyle = OUT; c.fill(); }
    let pipe = '#8b93ad'; if (wc === -2) pipe = (clk * 4 | 0) % 2 ? '#b061ff' : '#7c3fd0'; else if (wc >= 0) pipe = WCOL[wc]; else if (dryCon >= 0) pipe = '#9fb0cf';
    /* agua que entra: el grosor crece durante el paso */
    const wt0 = v < pwet.length ? pwet[v] : -1, grow = pPhase === 2 && wc >= 0 && wt0 >= 0 ? k.clamp((clk - wt0) / Math.max(0.2, pWS * 0.6), 0, 1) : 1;
    path(); c.strokeStyle = '#8b93ad'; c.lineWidth = S * 0.24; c.stroke();
    if (grow > 0 && pipe !== '#8b93ad') { path(); c.strokeStyle = pipe; c.lineWidth = S * 0.24 * (0.35 + 0.65 * grow); c.stroke(); }
    if (wc >= 0) { path(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = S * 0.06; c.setLineDash([S * 0.12, S * 0.18]); c.lineDashOffset = -clk * S * 0.8; c.stroke(); c.setLineDash([]); }
    else { path(); c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = S * 0.05; c.stroke(); }
    if (!PB.cross[i]) { c.beginPath(); c.arc(0, 0, S * 0.12, 0, R2); c.fillStyle = pipe; c.fill(); }
    if (PB.cross[i] && gd[0] === 0) { /* el puente: sombra del tubo de arriba sobre el de abajo */ c.fillStyle = 'rgba(8,12,30,.45)'; c.fillRect(-S * 0.3, -S * 0.25, S * 0.6, S * 0.5); }
  }
  if (PB.cross[i]) { /* barandillas del puente */
    c.fillStyle = '#c9d2e6'; for (const sx of [-1, 1]) { ART.rr(c, sx * S * 0.27 - S * 0.04, -S * 0.2, S * 0.08, S * 0.4, 2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.5; c.stroke(); }
  }
  c.restore();
}
function pValveDraw(i) {
  const cx = OX + (i % PB.w + 0.5) * S, cy = OY + (Math.floor(i / PB.w) + 0.5) * S, r = S * 0.24, open = PS.open[i];
  if (pPhase && !open && PS.hold[i] > 0) { const f = PS.hold[i] / pVH; c.strokeStyle = f > 0.66 ? ((clk * 8 | 0) % 2 ? '#ff4d5e' : '#ffd23d') : '#ffd23d'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(cx, cy, r * 1.6, -Math.PI / 2, -Math.PI / 2 + R2 * f); c.stroke(); }
  c.save(); c.translate(cx, cy); c.rotate(pVAng[i]);
  const col = open ? '#3fcf6e' : '#ff5a5a';
  c.strokeStyle = OUT; c.lineWidth = r * 0.55; c.lineCap = 'round'; c.beginPath(); for (let a = 0; a < 4; a++) { c.moveTo(0, 0); c.lineTo(Math.cos(a * Math.PI / 2) * r, Math.sin(a * Math.PI / 2) * r); } c.stroke();
  c.beginPath(); c.arc(0, 0, r, 0, R2); c.lineWidth = r * 0.5; c.stroke();
  c.strokeStyle = col; c.lineWidth = r * 0.3; c.beginPath(); c.arc(0, 0, r, 0, R2); c.stroke();
  c.beginPath(); for (let a = 0; a < 4; a++) { c.moveTo(0, 0); c.lineTo(Math.cos(a * Math.PI / 2) * r, Math.sin(a * Math.PI / 2) * r); } c.lineWidth = r * 0.28; c.stroke();
  c.beginPath(); c.arc(0, 0, r * 0.28, 0, R2); ART.fillOut(c, col, 1.5);
  c.restore();
}
function drawPipeLv() {
  c.drawImage(pBg(), 0, 0, k.W, k.H);
  /* fondo vivo: burbujas que suben despacio */
  c.fillStyle = 'rgba(150,200,255,.07)'; for (let b = 0; b < 10; b++) { const x = rnd(b + 40) * k.W, y = k.H - ((clk * (10 + rnd(b) * 14) + rnd(b + 9) * k.H) % (k.H + 40)); c.beginPath(); c.arc(x + Math.sin(clk + b) * 6, y, 4 + rnd(b + 7) * 9, 0, R2); c.fill(); }
  for (let i = 0; i < PB.n; i++) if (!PB.rock[i]) pTile(i);
  for (let i = 0; i < PB.n; i++) {
    const X = OX + (i % PB.w) * S, Y = OY + Math.floor(i / PB.w) * S, a = anim[i] || 0;
    if (PB.src.indexOf(i) >= 0) { const sp = pSource(PB.col[i]); c.drawImage(sp, X, Y, S, S); if (pPhase === 1) { const f = k.clamp(t / pWT, 0, 1); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(X + S / 2, Y + S / 2, S * 0.42, -Math.PI / 2, -Math.PI / 2 + R2 * f); c.stroke(); } }
    else if (PB.house[i]) { const fed = pev.col[2 * i] === PB.col[i] && (pPhase !== 1) ? 1 : 0; const sp = pHouse(PB.col[i], (pPhase === 2 ? PS.wet[2 * i] === PB.col[i] : fed) ? 1 : 0); const b = 1 + a * 0.18; c.drawImage(sp, X + S / 2 - S * b / 2, Y + S / 2 - S * b / 2 - a * 4, S * b, S * b); }
    else if (PB.valve[i]) pValveDraw(i);
    if (pHintSet.has(i)) { c.strokeStyle = '#ffd23d'; c.lineWidth = 2.5; ART.rr(c, X + 3, Y + 3, S - 6, S - 6, 6); c.stroke(); }
  }
  /* gotas: boca mojada que da al vacío — aviso de fuga en el siguiente paso */
  if (pPhase === 2 && !done) for (const [i, d] of pDrips) {
    const X = OX + (i % PB.w + 0.5 + PR.DX[d] * 0.5) * S, Y = OY + (Math.floor(i / PB.w) + 0.5 + PR.DY[d] * 0.5) * S, ph = (clk * 2.5) % 1;
    c.fillStyle = '#ff4d5e'; c.globalAlpha = 0.5 + 0.5 * Math.sin(clk * 14); c.beginPath(); c.arc(X, Y, S * 0.16, 0, R2); c.fill(); c.globalAlpha = 1;
    c.fillStyle = '#7cc8ff'; c.beginPath(); c.arc(X + PR.DX[d] * ph * S * 0.3, Y + PR.DY[d] * ph * S * 0.3 + ph * 6, 3.5, 0, R2); c.fill();
  }
  if (pFail && pFail.t < 0.8) { const X = OX + (pFail.i % PB.w + 0.5) * S, Y = OY + (Math.floor(pFail.i / PB.w) + 0.5) * S; c.globalAlpha = 1 - pFail.t / 0.8; c.fillStyle = '#7cc8ff'; c.beginPath(); c.arc(X, Y, S * 0.3 + pFail.t * S * 1.5, 0, R2); c.fill(); c.globalAlpha = 1; }
  if (kb && !done) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([8, 5]); c.lineDashOffset = -clk * 20; ART.rr(c, OX + cur[0] * S + 2, OY + cur[1] * S + 2, S - 4, S - 4, 8); c.stroke(); c.setLineDash([]); }
  if (pPress >= 0 && k.ptr.down && !pLong && pPressT > 0.1) { c.strokeStyle = '#fff'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(k.ptr.x, k.ptr.y - 40, 13, -Math.PI / 2, -Math.PI / 2 + R2 * Math.min(1, pPressT / 0.4)); c.stroke(); }
  pHud();
  if (pWin && doneT > 0.05) { const p = Math.min(1, doneT * 3), sc = 0.7 + p * 0.3; c.save(); c.globalAlpha = p; c.translate(OX + PB.w * S / 2, OY + PB.h * S / 2); c.scale(sc, sc); ART.rr(c, -140, -32, 280, 64, 20); ART.fillOut(c, 'rgba(20,34,60,.92)', 3); label(level === PH.length ? '¡La Gran Fuente!' : '¡Todo con agua!', 0, -16, 28, '#7cf7a0', 'center'); c.restore(); }
}
function pFit(s, size, maxw) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; while (size > 10 && c.measureText(s).width > maxw) { size--; c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; } return size; }
function pHud() {
  const L = pLv(), G = pGoals(), Lx = k.ex(16), Rx = k.ex2(16), narrow = k.W < 420;
  const midL = !k.extHud && !k.party ? k.W / 2 - 58 : Rx - 120; /* sin reproductor, la pausa y el sonido del kit van arriba en el centro */
  label(`NIVEL ${level}/${PH.length}`, Lx, 9, 12, '#9fb3d8');
  label(L.n, Lx, 26, pFit(L.n, narrow ? 17 : 20, Math.max(80, midL - Lx - 6)), '#ffd23d');
  const gcol = pTaps <= G.s3 && !pUsed ? '#ffd166' : pTaps <= G.s2 ? '#fff' : '#ff9aa8';
  const gt = `${pTaps}/${pTaps <= G.s3 && !pUsed ? G.s3 : G.s2}`;
  label('GIROS', Rx, 9, 12, '#9fb3d8', 'right'); label(gt, Rx, 25, 22, gcol, 'right');
  /* estado del agua y meta visible */
  let nodes = 0, wet = 0; for (let i = 0; i < PB.n; i++) { if (PB.rock[i]) continue; const vs = PB.cross[i] ? [2 * i, 2 * i + 1] : [2 * i]; for (const v of vs) { nodes++; if (pev.col[v] >= 0) wet++; } }
  const houses = PB.house.filter(Boolean).length, fed = PB.house.reduce((a, h, i) => a + (h && pev.col[2 * i] === PB.col[i] ? 1 : 0), 0);
  let water = '';
  if (pPhase === 1) water = `El agua sale en ${Math.max(0, Math.ceil(pWT - t))} s`;
  else if (pPhase === 2 && !done) water = 'El agua avanza';
  const pct = wet / nodes;
  const idea = pMsg ? pMsg[0] : L.i, ideaCol = pMsg ? pMsg[1] : '#e6eeff';
  if (pWide) {
    const x = pPanX, w = pPanW; let y = pTop + 4;
    const lines = wrap(idea, 13, w - 24).slice(0, 6);
    ART.rr(c, x, y, w, Math.min(k.H - y - 84, 18 + lines.length * 17 + 10 + 30 + (houses ? 22 : 0) + (pLv().w ? 22 : 0) + 26), 14); ART.fillOut(c, 'rgba(18,30,52,.85)', 2.5); c.globalAlpha = 0.4 + 0.6 * (banner ? banner.a : 1);
    for (let j = 0; j < lines.length; j++) label(lines[j], x + 12, y + 12 + j * 17, 13, ideaCol); c.globalAlpha = 1;
    y += 18 + lines.length * 17 + 10;
    y = pMeter(x + 12, y, w - 24, pct, `${pLv().w ? 'Conectado' : 'Con agua'} ${Math.round(pct * 100)} %`) + 10;
    if (houses) { label(`Casas ${fed}/${houses}`, x + 12, y, 14, fed === houses ? '#7cf7a0' : '#cfd6ff'); y += 22; }
    if (water) { label(water, x + 12, y, 15, pPhase === 1 && pWT - t < 6 ? '#ffb4a0' : '#7cc8ff'); y += 22; }
    label(`2★ ≤ ${G.s2} · 3★ ≤ ${G.s3}`, x + 12, y, 12.5, '#9fb3d8');
  } else {
    const y = pTop - 2, lines = wrap(idea, 12.5, k.W - 32).slice(0, 2);
    c.globalAlpha = 0.4 + 0.6 * (banner ? banner.a : 1);
    for (let j = 0; j < lines.length; j++) label(lines[j], k.W / 2, y + j * 16, 12.5, ideaCol, 'center'); c.globalAlpha = 1;
    const by = pBarY, hw = pHintRect()[2], mw = k.W - 32 - hw - 12;
    let st = `${pLv().w ? 'Conectado' : 'Con agua'} ${Math.round(pct * 100)} %` + (houses ? ` · Casas ${fed}/${houses}` : '');
    pMeter(16, by + 4, mw, pct, st);
    if (water) label(water, 16, by + 30, pFit(water, 14, mw), pPhase === 1 && pWT - t < 6 ? '#ffb4a0' : '#7cc8ff');
  }
  const [hx, hy, hw, hh] = pHintRect(), dn = k.ptr.down && pPress === -3;
  const yy = key3d(hx, hy, hw, hh - 4, pHints > 0 ? '#3f8f52' : '#4a4a5e', dn);
  label(pHints > 0 ? `Pista ${pHints}` : 'Sin pistas', hx + hw / 2, yy + (hh - 4) / 2 - 8, 15, pHints > 0 ? '#fff' : '#b9bdd6', 'center');
}
function pMeter(x, y, w, f, txt) {
  label(txt, x, y, pFit(txt, 13, w), f >= 1 ? '#7cf7a0' : '#cfd6ff');
  ART.rr(c, x, y + 18, w, 8, 4); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill();
  if (f > 0) { ART.rr(c, x, y + 18, Math.max(8, w * f), 8, 4); c.fillStyle = f >= 1 ? '#7cf7a0' : '#2f9bf0'; c.fill(); }
  return y + 30;
}
const _draw = () => {
  if (PH) return drawPipeLv();
  if (!bgCv || bgCv.n !== N * 1000 + S * 10 + (OY % 10)) { bgCv = renderBg(); bgCv.n = N * 1000 + S * 10 + (OY % 10); }
  c.drawImage(bgCv, 0, 0, W, H); hud();
  if (M === 'sudoku') drawSudoku(); if (M === 'mines') drawMines(); if (M === 'lights') drawLights(); if (M === 'pipes') drawPipes(); if (M === 'slide') drawSlide();
  if (done && !lost) { const p = Math.min(1, doneT * 3), sc = 0.7 + p * 0.3 + Math.sin(p * 3.14) * 0.08; c.save(); c.globalAlpha = p; c.translate(W / 2, OY + N * S / 2); c.scale(sc, sc); ART.rr(c, -130, -34, 260, 68, 20); ART.fillOut(c, 'rgba(34,28,66,.92)', 3); label('¡Resuelto!', 0, -18, 32, '#7cf7a0', 'center'); c.restore(); }
};
