/* PICTOS: juegos de fiesta de «dibuja y adivina» para el modo tele (2–4 jugadores, la CPU rellena).
 * CFG.mode:
 *  'dibuja'  Dibuja y Adivina — a quien le toca dibujar se le enseña la palabra SOLO en su móvil (k.priv);
 *            dibuja en la tele con el dedo sobre el cuadro blanco de su móvil (el joystick sigue valiendo) y los demás
 *            reciben 4 opciones en su móvil (k.onPick). Puntos por acertar pronto y por que te adivinen.
 *  'mimica'  Mímica Exprés — la palabra sale solo en el móvil de quien actúa; la tele enseña la cuenta atrás,
 *            la categoría y las pistas. Los demás eligen entre 4 opciones. Varias palabras por turno.
 *  'cadena'  Cadena de Garabatos — ronda 1 todos dibujan su palabra a la vez, ronda 2 cada uno adivina el
 *            dibujo del vecino, ronda 3 se enseña la cadena entera con lo que dijo cada cual y el podio.
 * Sin teclado en el mando: adivinar es SIEMPRE elegir entre opciones. Funciona también en solitario
 * (la CPU dibuja con trazos guardados y adivina) y con 2, 3 y 4; si alguien se va, la CPU le sustituye.
 * Datos propios con fetch diferido: ../_data/dibujar-es.json (palabras por categoría + trazos vectoriales).
 * Los trazos se acumulan en un lienzo aparte (uno por jugador, 512×512): por frame solo hay un drawImage.
 * Arte por código, cartoon de estudio y §8 «ley de la pieza única» (docs/REMASTER.md): cada objeto se
 * traza entero, se contornea una vez y se rellena una vez; nada de contornos cerrados por dentro. */
const MODE = CFG.mode || 'dibuja';
const PORT = innerHeight > innerWidth;
const W = PORT ? 480 : 860, H = PORT ? 760 : 480;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#0f1730' });
const c = k.ctx, OUT = ART.OUT;

/* ---------- utilería de color y trazo (§8) ---------- */
const _h = (s) => { s = String(s).replace('#', ''); if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _c = (a) => `rgb(${a.map((v) => Math.max(0, Math.min(255, v | 0))).join(',')})`;
const LT = (col, f) => (String(col)[0] === '#' ? _c(_h(col).map((v) => v + (255 - v) * f)) : col);
const DK = (col, f) => (String(col)[0] === '#' ? _c(_h(col).map((v) => v * (1 - f))) : col);
const AL = (col, a) => { const q = _h(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
/* une: contornea TODAS las subpiezas y luego las rellena en orden de profundidad → una sola silueta */
function uni(parts, ow) {
  c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = (ow || 1.6) * 2;
  for (let i = 0; i < parts.length; i++) { c.beginPath(); parts[i][0](c); c.stroke(); }
  for (let i = 0; i < parts.length; i++) { c.beginPath(); parts[i][0](c); c.fillStyle = parts[i][1]; c.fill(); }
}
const rr = (g, x, y, w, h, r) => ART.rr(g, x, y, w, h, r);
const label = (t, x, y, sz, col, al, bl, wt) => { c.save(); c.font = `${wt || 700} ${sz}px system-ui,sans-serif`; c.textAlign = al || 'left'; c.textBaseline = bl || 'top';
  c.lineWidth = Math.max(2, sz * 0.2); c.strokeStyle = 'rgba(12,16,34,.85)'; c.lineJoin = 'round'; c.strokeText(t, x, y); c.fillStyle = col; c.fillText(t, x, y); c.restore(); };
/* recorta el texto al ancho disponible (nada se sale ni se solapa) */
function fitText(t, sz, max) {
  c.save(); c.font = `700 ${sz}px system-ui,sans-serif`;
  if (c.measureText(t).width <= max) { c.restore(); return t; }
  let s = t;
  while (s.length > 2 && c.measureText(s + '…').width > max) s = s.slice(0, -1);
  c.restore(); return s + '…';
}
const fitSize = (t, sz, max) => { c.save(); let s = sz; c.font = `700 ${s}px system-ui,sans-serif`;
  while (s > 9 && c.measureText(t).width > max) { s -= 1; c.font = `700 ${s}px system-ui,sans-serif`; } c.restore(); return s; };
const UP = (s) => String(s).toUpperCase();

/* ---------- paleta de dibujo (Kuboplay) ---------- */
const PAL = ['#1a1530', '#6e62f5', '#ff6fb5', '#5b8cff', '#a8cf3f', '#ffc94d'];
const PALN = ['Tinta', 'Lila', 'Rosa', 'Azul', 'Verde', 'Oro'];
const BW0 = 0.016;                                   /* grosor del pincel en unidades 0..1 */
const DSZ = 512;                                     /* lado del lienzo acumulador de cada jugador */
const PAPER = '#f7f1e3';

/* ---------- datos ---------- */
const FB = {
  cat: { animal: ['gato', 'perro', 'pez', 'mariposa', 'abeja', 'araña', 'tortuga', 'pulpo'],
         objeto: ['casa', 'reloj', 'llave', 'taza', 'libro', 'gafas', 'pelota', 'globo'],
         comida: ['manzana', 'pizza', 'helado', 'pastel', 'queso', 'pan', 'huevo', 'uvas'],
         naturaleza: ['sol', 'luna', 'estrella', 'nube', 'árbol', 'flor', 'rayo', 'montaña'],
         'vehículo': ['coche', 'barco', 'avión', 'tren', 'cohete', 'bicicleta', 'moto', 'camión'],
         oficio: ['médico', 'bombero', 'cocinero', 'payaso', 'pintor', 'policía', 'cartero', 'músico'],
         'acción': ['bailar', 'nadar', 'dormir', 'cocinar', 'correr', 'saltar', 'pescar', 'cantar'],
         'película': ['piratas', 'zombis', 'vaqueros', 'fantasmas', 'dinosaurios', 'detectives', 'circo', 'boda'] },
  dib: ['animal', 'objeto', 'comida', 'naturaleza', 'vehículo'],
  mim: ['animal', 'oficio', 'acción', 'película'],
  draw: { sol: [[0.7, 0.5, 0.64, 0.64, 0.5, 0.7, 0.36, 0.64, 0.3, 0.5, 0.36, 0.36, 0.5, 0.3, 0.64, 0.36, 0.7, 0.5], [0.78, 0.5, 0.92, 0.5], [0.5, 0.78, 0.5, 0.92], [0.22, 0.5, 0.08, 0.5], [0.5, 0.22, 0.5, 0.08]],
          casa: [[0.2, 0.88, 0.2, 0.46, 0.8, 0.46, 0.8, 0.88, 0.2, 0.88], [0.12, 0.48, 0.5, 0.16, 0.88, 0.48], [0.42, 0.88, 0.42, 0.62, 0.58, 0.62, 0.58, 0.88]],
          pelota: [[0.82, 0.5, 0.74, 0.7, 0.5, 0.82, 0.26, 0.7, 0.18, 0.5, 0.26, 0.3, 0.5, 0.18, 0.74, 0.3, 0.82, 0.5], [0.18, 0.5, 0.82, 0.5]],
          estrella: [[0.5, 0.14, 0.59, 0.4, 0.86, 0.4, 0.64, 0.57, 0.72, 0.84, 0.5, 0.68, 0.28, 0.84, 0.36, 0.57, 0.14, 0.4, 0.41, 0.4, 0.5, 0.14]] }
};
let DATA = null, LOADERR = false, CATOF = {}, DIBW = [], MIMC = [], DRAWK = [];
const ready = () => { try { if (k.st !== 'play') reset(); } catch (e) { } };
function useData(d) {
  DATA = d; CATOF = {}; DIBW = []; MIMC = (d.mim || []).filter((x) => d.cat[x]);
  for (const cat in d.cat) for (const w of d.cat[cat]) if (!CATOF[w]) CATOF[w] = cat;
  for (const cat of (d.dib || [])) if (d.cat[cat]) for (const w of d.cat[cat]) DIBW.push(w);
  DRAWK = Object.keys(d.draw || {}).filter((w) => CATOF[w]);
  if (!MIMC.length) MIMC = Object.keys(d.cat);
  if (!DIBW.length) DIBW = Object.keys(CATOF);
  ready();
}
fetch('../_data/dibujar-es.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(useData).catch(() => { LOADERR = true; useData(FB); });

/* ---------- reparto de la pantalla ---------- */
let BX, BY, BW, BH, OPTY, OPTH, CHIPY, TOPH, CAPY, CAPH;
function layout() {
  TOPH = PORT ? 58 : 54;
  CHIPY = PORT ? 30 : 26;
  OPTH = phoneUI() ? 26 : (PORT ? 146 : 104);
  CAPH = 22;
  BX = 10; BY = TOPH; BW = W - 20; BH = H - TOPH - OPTH - CAPH - 10;
  CAPY = BY + BH + 2; OPTY = CAPY + CAPH + 2;
}
/* ¿los humanos juegan desde el móvil? (tele con panel privado) */
const phoneUI = () => !!(k.party && k.privOK);
/* cuadrado de papel dentro del tablero */
function paperBox(i, n) {
  n = n || 1;
  if (n <= 1) { const s = Math.min(BW, BH); return { x: BX + (BW - s) / 2, y: BY + (BH - s) / 2, s }; }
  const cols = n <= 2 ? (BW > BH ? 2 : 1) : 2, rows = Math.ceil(n / cols), g = 12;
  const s = Math.min((BW - g * (cols - 1)) / cols, (BH - g * (rows - 1)) / rows);
  const gw = s * cols + g * (cols - 1), gh = s * rows + g * (rows - 1);
  const cx = i % cols, cy = Math.floor(i / cols);
  return { x: BX + (BW - gw) / 2 + cx * (s + g), y: BY + (BH - gh) / 2 + cy * (s + g), s };
}

/* rótulo de la franja entre el tablero y las opciones (nunca pisa el papel) */
function cap(t, col) {
  if (!t || msgT > 0) return;
  label(t, W / 2, CAPY + CAPH / 2, fitSize(t, 15, W - 24), col || '#cfe6ff', 'center', 'middle');
}

/* ---------- lienzos acumuladores ---------- */
const offs = [], offg = [], strokes = [], pen = [];
for (let p = 0; p < 4; p++) {
  const o = document.createElement('canvas'); o.width = o.height = DSZ;
  const g = o.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
  offs.push(o); offg.push(g); strokes.push([]); pen.push({ x: 0.5, y: 0.5, col: 0, st: null, dot: 0, fg: 0 });
}
function wipe(p) { const g = offg[p]; g.clearRect(0, 0, DSZ, DSZ); strokes[p].length = 0; pen[p].st = null; pen[p].fg = 0; pen[p].x = 0.5; pen[p].y = 0.5; }
function repaint(p) {
  const g = offg[p]; g.clearRect(0, 0, DSZ, DSZ);
  for (const s of strokes[p]) paintStroke(g, s, DSZ);
}
function paintStroke(g, s, sz) {
  g.strokeStyle = s.col; g.lineWidth = Math.max(1, s.w * sz);
  g.beginPath();
  if (s.pts.length <= 2) { g.arc(s.pts[0] * sz, s.pts[1] * sz, g.lineWidth / 2, 0, 6.2832); g.fillStyle = s.col; g.fill(); return; }
  g.moveTo(s.pts[0] * sz, s.pts[1] * sz);
  for (let i = 2; i < s.pts.length; i += 2) g.lineTo(s.pts[i] * sz, s.pts[i + 1] * sz);
  g.stroke();
}
function penDown(p) {
  const q = pen[p], s = { col: PAL[q.col], w: BW0, pts: [q.x, q.y] };
  strokes[p].push(s); q.st = s;
  const g = offg[p]; g.fillStyle = s.col; g.beginPath(); g.arc(q.x * DSZ, q.y * DSZ, s.w * DSZ / 2, 0, 6.2832); g.fill();
}
function penTo(p, x, y) {
  const q = pen[p], s = q.st; if (!s) return;
  const n = s.pts.length, lx = s.pts[n - 2], ly = s.pts[n - 1];
  if (Math.abs(x - lx) + Math.abs(y - ly) < 0.004) return;
  s.pts.push(x, y);
  const g = offg[p]; g.strokeStyle = s.col; g.lineWidth = s.w * DSZ;
  g.beginPath(); g.moveTo(lx * DSZ, ly * DSZ); g.lineTo(x * DSZ, y * DSZ); g.stroke();
}
const penUp = (p) => { pen[p].st = null; };
function undo(p) { if (!strokes[p].length) return false; strokes[p].pop(); pen[p].st = null; repaint(p); return true; }

/* ---------- palabras ---------- */
const rndOf = (a) => a[Math.floor(Math.random() * a.length)];
let used = [];
function newWord(forCpu) {
  const pool = forCpu ? DRAWK : DIBW;
  if (!pool.length) return 'casa';
  for (let t = 0; t < 40; t++) { const w = rndOf(pool); if (used.indexOf(w) < 0) { used.push(w); if (used.length > 24) used.shift(); return w; } }
  return rndOf(pool);
}
function newMimWord() {
  if (!DATA) return 'bailar';
  const cat = rndOf(MIMC.length ? MIMC : Object.keys(DATA.cat)), pool = DATA.cat[cat] || ['bailar'];
  for (let t = 0; t < 30; t++) { const w = rndOf(pool); if (used.indexOf(w) < 0) { used.push(w); if (used.length > 24) used.shift(); return w; } }
  return rndOf(pool);
}
function makeOpts(word) {
  const cat = CATOF[word], pool = (DATA && DATA.cat[cat]) || [], out = [word];
  for (let t = 0; t < 80 && out.length < 4; t++) { const w = rndOf(pool); if (w && out.indexOf(w) < 0) out.push(w); }
  const all = Object.keys(CATOF);
  for (let t = 0; t < 80 && out.length < 4; t++) { const w = rndOf(all); if (w && out.indexOf(w) < 0) out.push(w); }
  return k.shuffle(out);
}
/* plan de trazos de la CPU: los puntos se van soltando poco a poco, como si dibujara */
function cpuPlan(word) {
  const src = (DATA && DATA.draw[word]) || FB.draw[word] || FB.draw.casa;
  const pts = [], col = Math.floor(Math.random() * 2) ? 0 : 1 + Math.floor(Math.random() * 5);
  for (const s of src) { const a = []; for (let i = 0; i < s.length; i += 2) a.push(0.08 + s[i] * 0.84, 0.08 + s[i + 1] * 0.84); pts.push(a); }
  return { s: pts, i: 0, j: 0, col, t: 0 };
}
function cpuTick(p, plan, dt, speed) {
  plan.t += dt * speed;
  while (plan.t > 1 && plan.i < plan.s.length) {
    plan.t -= 1;
    const s = plan.s[plan.i];
    if (plan.j >= s.length) { penUp(p); plan.i++; plan.j = 0; continue; }
    const x = s[plan.j], y = s[plan.j + 1];
    if (plan.j === 0) { pen[p].x = x; pen[p].y = y; pen[p].col = plan.col; penDown(p); } else { pen[p].x = x; pen[p].y = y; penTo(p, x, y); }
    plan.j += 2;
  }
  return plan.i >= plan.s.length;
}
const cpuDone = (plan) => plan.i >= plan.s.length;
const planTotal = (plan) => plan.s.reduce((a, s) => a + s.length / 2 + 1, 0);
const planProg = (plan) => { let d = 0; for (let i = 0; i < plan.i; i++) d += plan.s[i].length / 2 + 1; return Math.min(1, (d + plan.j / 2) / Math.max(1, planTotal(plan))); };

/* ================================ estado ================================= */
let np, pl, sc, phase, tmr, T0, round, ROUNDS, drawer, word, opts, picks, hits, msg, msgT;
let plan, cpuWhen, optSel, blok, wordsDone, chain, ci, actGest, hint, rdy;
const say = (t, s) => { msg = t; msgT = s || 2.4; };
const isCpu = (p) => !k.human(p);
const T = (s) => s * (k.D.time || 1);

function reset() {
  layout();
  np = k.party ? k.clamp(k.players().length, 2, 4) : (MODE === 'cadena' ? 4 : 3);
  if (np < 2) np = 2;
  pl = k.players(np); sc = []; optSel = []; blok = []; hits = []; rdy = [];
  for (let p = 0; p < np; p++) { sc.push(0); optSel.push(0); blok.push(0); hits.push(0); rdy.push(false); wipe(p); }
  round = 0; msg = ''; msgT = 0; used = [];
  ROUNDS = MODE === 'dibuja' ? (np === 2 ? 4 : 6) : np;
  chain = null; ci = 0;
  if (MODE === 'cadena') startChainDraw(); else startRound();
}

/* ------------------------------ DIBUJA / MÍMICA ------------------------------ */
function startRound() {
  drawer = MODE === 'mimica' && !k.party ? 1 + (round % Math.max(1, np - 1)) : round % np;
  picks = []; for (let p = 0; p < np; p++) picks.push(null);
  wipe(drawer); wordsDone = 0; hint = 0;
  nextWord();
  phase = 'intro'; tmr = 2.2; T0 = MODE === 'mimica' ? T(40) : T(42);
  askPriv();
}
function nextWord() {
  word = MODE === 'mimica' ? newMimWord() : newWord(isCpu(drawer));
  opts = makeOpts(word);
  for (let p = 0; p < np; p++) { picks[p] = null; optSel[p] = 0; blok[p] = 0; }
  if (MODE === 'dibuja') { plan = isCpu(drawer) ? cpuPlan(word) : null; cpuWhen = []; for (let p = 0; p < np; p++) cpuWhen.push(cpuTime()); }
  else { plan = null; actGest = (word.length * 7 + word.charCodeAt(0)) % 5; cpuWhen = []; for (let p = 0; p < np; p++) cpuWhen.push(3 + Math.random() * T(14)); }
  hint = 0;
}
const cpuTime = () => 5 + Math.random() * T(24);
const cpuOK = (prog) => Math.random() < Math.min(0.92, 0.34 + 0.12 * (k.D.cpu || 0) + 0.5 * prog);

function guess(p, i) {
  if (picks[p] != null || p === drawer || phase !== 'play') return;
  if (blok[p] > 0) return;
  const ok = opts[i] === word;
  if (MODE === 'mimica') {
    if (!ok) { blok[p] = 2.5; k.sfx('hurt'); if (k.human(p)) say(`${pl[p].name} falla`, 1.4); privGuess(p); return; }
    sc[p] += 20; sc[drawer] += 12; hits[p]++;
    k.sfx('coin'); k.confetti(k.pcol(p), 24); say(`¡${pl[p].name} acierta: ${UP(word)}!`, 2.2);
    wordsDone++; nextWord(); askPriv(); return;
  }
  picks[p] = i;
  if (ok) {
    const pts = 30 + Math.round(70 * Math.max(0, tmr) / T0);
    sc[p] += pts; sc[drawer] += 25; hits[p]++;
    k.sfx('coin'); k.float(`+${pts}`, W / 2, BY + 30, k.pcol(p)); say(`¡${pl[p].name} acierta! +${pts}`, 2.2);
  } else { k.sfx('hurt'); say(`${pl[p].name} falla`, 1.6); }
  privGuess(p);
  let left = 0; for (let q = 0; q < np; q++) if (q !== drawer && picks[q] == null) left++;
  if (!left) endRound();
}
function endRound() {
  if (phase !== 'play') return;
  phase = 'res'; tmr = 3.4;
  if (k.privOK) for (let p = 0; p < np; p++) if (k.human(p)) k.priv(p, { title: UP(word), text: picks && picks[p] != null && opts[picks[p]] === word ? '¡Acertaste!' : (p === drawer ? 'Se acabó el tiempo' : 'Era ' + word), bar: true, items: [] });
  k.sfx('pop');
}
function nextRound() {
  round++;
  if (round >= ROUNDS) return finish();
  startRound();
}
function finish() {
  phase = 'over';
  if (k.privOK) for (let p = 0; p < np; p++) if (k.human(p)) k.priv(p, null);
  k.best(CFG.id, sc[0]);
  let top = 0; for (let p = 1; p < np; p++) if (sc[p] > sc[top]) top = p;
  k.podium(pl.map((q, p) => ({ p, name: q.name, score: sc[p] })),
    { head: top === 0 && !k.party ? '¡Has ganado!' : `Gana ${pl[top].name}`, fmt: (v) => `${v} puntos`, go: 'Toca para otra partida' });
}

/* ------------------------------ CADENA ------------------------------ */
function startChainDraw() {
  chain = [];
  for (let p = 0; p < np; p++) { const w = newWord(isCpu(p)); chain.push({ w, opts: makeOpts(w), by: (p + 1) % np, pick: null, plan: isCpu(p) ? cpuPlan(w) : null }); wipe(p); rdy[p] = false; }
  phase = 'cdraw'; tmr = T(45); T0 = tmr; ci = 0; askPriv();
}
function startChainGuess() {
  phase = 'cguess'; ci = 0; startLink();
}
function startLink() {
  const L = chain[ci]; L.pick = null;
  optSel[L.by] = 0; blok[L.by] = 0;
  tmr = T(22); T0 = tmr;
  cpuWhen = []; for (let p = 0; p < np; p++) cpuWhen.push(2 + Math.random() * T(12));
  askPriv();
}
function linkGuess(i) {
  const L = chain[ci]; if (L.pick != null) return;
  L.pick = i;
  if (L.opts[i] === L.w) { sc[L.by] += 100; sc[ci] += 60; hits[L.by]++; k.sfx('coin'); k.confetti(k.pcol(L.by), 26); say(`¡${pl[L.by].name} lo ve: ${UP(L.w)}!`, 2); }
  else { k.sfx('hurt'); say(`${pl[L.by].name} dice «${L.opts[i]}»`, 2); }
  if (k.privOK && k.human(L.by)) k.priv(L.by, { title: UP(L.w), text: L.opts[i] === L.w ? '¡Acertaste!' : `Dijiste «${L.opts[i]}»`, bar: true, items: [] });
  phase = 'clink'; tmr = 2.2;
}
function nextLink() {
  ci++;
  if (ci >= chain.length) { phase = 'cshow'; ci = 0; tmr = 3.4; if (k.privOK) for (let p = 0; p < np; p++) if (k.human(p)) k.priv(p, { title: 'La cadena', text: 'Mira la tele', bar: true, items: [] }); return; }
  phase = 'cguess'; startLink();
}

/* ------------------------------ paneles del móvil ------------------------------ */
const COLIT = () => PAL.map((col, i) => ({ v: 'c' + i, label: PALN[i], col }));
function privDraw(p, w) {
  if (!k.privOK || !k.human(p)) return;
  k.priv(p, { title: 'Dibuja: ' + UP(w), sm: true, draw: true,
    text: 'Dibuja con el dedo en el cuadro · elige color abajo',
    items: COLIT().concat(MODE === 'cadena' ? [{ v: 'undo', label: 'Deshacer', col: '#2c4a86' }, { v: 'clear', label: 'Borrar', col: '#8a3550' }, { v: 'done', label: rdy[p] ? 'Listo ✓' : 'Listo', col: '#2f6b3a' }]
                                                  : [{ v: 'undo', label: 'Deshacer', col: '#2c4a86' }, { v: 'clear', label: 'Borrar', col: '#8a3550' }]) });
}
function privGuess(p) {
  if (!k.privOK || !k.human(p)) return;
  const done = MODE === 'cadena' ? chain[ci].pick != null : picks[p] != null;
  const os = MODE === 'cadena' ? chain[ci].opts : opts;
  if (done) { k.priv(p, { title: 'Elegido', text: 'A ver si has acertado…', bar: true, items: [] }); return; }
  k.priv(p, { title: MODE === 'mimica' ? '¿Qué está haciendo?' : '¿Qué es?', text: blok[p] > 0 ? 'Fallaste: espera un momento' : 'Elige una de las cuatro',
    items: os.map((o, i) => ({ v: i, label: o, off: blok[p] > 0 })) });
}
function privWait(p, t) { if (k.privOK && k.human(p)) k.priv(p, { title: t || 'Mira la tele', text: '', bar: true, items: [] }); }
function askPriv() {
  if (!k.privOK) return;
  for (let p = 0; p < np; p++) {
    if (!k.human(p)) continue;
    if (MODE === 'cadena') {
      if (phase === 'cdraw') privDraw(p, chain[p].w);
      else if (phase === 'cguess') { if (p === chain[ci].by) privGuess(p); else privWait(p, `Adivina ${pl[chain[ci].by].name}`); }
      else privWait(p);
      continue;
    }
    if (p === drawer) {
      if (MODE === 'mimica') k.priv(p, { title: 'Actúa: ' + UP(word), sm: true, bar: true, text: 'Sin hablar y sin señalar letras', items: [{ v: 'skip', label: 'Pasar (−5)', col: '#8a3550' }] });
      else privDraw(p, word);
    } else if (phase === 'play') privGuess(p);
    else privWait(p, phase === 'intro' ? `Dibuja ${pl[drawer].name}` : 'Mira la tele');
  }
}
/* Trazo con el dedo desde el móvil (1.46): la posición llega absoluta, así que el pincel salta
   donde toque el dedo en vez de arrastrarse con el joystick, que era casi imposible de manejar.
   d: 1 = apoya, 2 = mueve, 0 = levanta. El joystick sigue valiendo (mando sin panel privado). */
function canDraw(p) {
  if (!k.human(p)) return false;
  if (MODE === 'cadena') return phase === 'cdraw' && !rdy[p];
  return MODE === 'dibuja' && phase === 'play' && p === drawer && !plan;
}
k.onDraw = (p, x, y, d) => {
  if (p < 0 || p >= np || !canDraw(p)) return;
  const q = pen[p];
  q.x = k.clamp(x, 0.01, 0.99); q.y = k.clamp(y, 0.01, 0.99); q.dot = 0.25;
  q.fg = d === 0 ? 0 : 2;                     /* mientras dibuja el dedo, el joystick y A no tocan el pincel */
  if (d === 0) { if (q.st) penUp(p); return; }
  if (d === 1) { if (q.st) penUp(p); penDown(p); return; }
  if (q.st) penTo(p, q.x, q.y); else penDown(p);
};
k.onPick = (p, v) => {
  if (p < 0 || p >= np || !k.human(p)) return;
  if (typeof v === 'string' && v[0] === 'c' && v.length === 2) { pen[p].col = +v[1] % PAL.length; k.sfx('click'); return; }
  if (v === 'undo') { if (undo(p)) k.sfx('click'); return; }
  if (v === 'clear') { wipe(p); rdy[p] = false; k.sfx('pop'); return; }
  if (v === 'done') { if (MODE === 'cadena' && phase === 'cdraw') { rdy[p] = true; k.sfx('click'); privDraw(p, chain[p].w); } return; }
  if (v === 'skip') { if (MODE === 'mimica' && p === drawer && phase === 'play') { sc[p] = Math.max(0, sc[p] - 5); k.sfx('hurt'); say('Palabra pasada', 1.4); nextWord(); askPriv(); } return; }
  const i = v | 0;
  if (MODE === 'cadena') { if (phase === 'cguess' && p === chain[ci].by && i >= 0 && i < 4) linkGuess(i); return; }
  if (phase === 'play' && i >= 0 && i < 4) guess(p, i);
};

/* ------------------------------ entrada ------------------------------ */
const SPD = 0.52;
function moveBrush(p, dt) {
  const q = pen[p];
  /* Si el móvil está mandando trazo, no se mezcla con el joystick (y si se corta, a los 2 s vuelve). */
  if (q.fg > 0) { q.fg -= dt; if (q.fg > 0) return; if (q.st) penUp(p); }
  let dx = 0, dy = 0;
  if (k.party) { const d = k.pdir(p); dx = d.x; dy = d.y; }
  else { dx = (k.held.has('right') ? 1 : 0) - (k.held.has('left') ? 1 : 0); dy = (k.held.has('down') ? 1 : 0) - (k.held.has('up') ? 1 : 0); }
  if (dx || dy) { const m = Math.hypot(dx, dy) || 1; q.x = k.clamp(q.x + dx / m * SPD * dt, 0.01, 0.99); q.y = k.clamp(q.y + dy / m * SPD * dt, 0.01, 0.99); if (q.st) penTo(p, q.x, q.y); }
  const a = k.party ? k.pheld(p, 'a') : k.held.has('a'), hitB = k.party ? k.phit(p, 'b') : k.hit.has('b');
  if (a && !q.st) penDown(p); else if (!a && q.st) penUp(p);
  if (hitB) { q.col = (q.col + 1) % PAL.length; k.sfx('click'); if (!k.party) say('Color: ' + PALN[q.col], 1.2); }
}
/* dibujo con el dedo o el ratón (fuera de la tele) */
let ptrBox = null;
function pointerDraw(p) {
  if (phoneUI()) return;
  const b = ptrBox; if (!b) return;
  if (k.ptr.down) {
    const x = k.clamp((k.ptr.x - b.x) / b.s, 0.01, 0.99), y = k.clamp((k.ptr.y - b.y) / b.s, 0.01, 0.99);
    const inside = k.ptr.x >= b.x - 4 && k.ptr.x <= b.x + b.s + 4 && k.ptr.y >= b.y - 4 && k.ptr.y <= b.y + b.s + 4;
    if (!inside) { if (pen[p].st) penUp(p); return; }
    pen[p].x = x; pen[p].y = y;
    if (!pen[p].st) penDown(p); else penTo(p, x, y);
  } else if (pen[p].st) penUp(p);
}
/* botones de la parte de abajo (solo fuera del panel del móvil) */
let btns = [];
function hitBtn() {
  if (!k.ptr.hit) return -1;
  for (let i = 0; i < btns.length; i++) { const b = btns[i]; if (k.ptr.x >= b.x && k.ptr.x <= b.x + b.w && k.ptr.y >= b.y && k.ptr.y <= b.y + b.h) return i; }
  return -1;
}
/* selección de opción con el mando cuando no hay panel privado (tele sin móviles o solitario) */
function padPick(p, n, fn) {
  const d = k.party ? { x: (k.phit(p, 'right') ? 1 : 0) - (k.phit(p, 'left') ? 1 : 0), y: (k.phit(p, 'down') ? 1 : 0) - (k.phit(p, 'up') ? 1 : 0) }
                    : { x: (k.hit.has('right') ? 1 : 0) - (k.hit.has('left') ? 1 : 0), y: (k.hit.has('down') ? 1 : 0) - (k.hit.has('up') ? 1 : 0) };
  const cols = PORT ? 2 : 4;
  if (d.x) { optSel[p] = (optSel[p] + d.x + n) % n; k.sfx('click'); }
  if (d.y) { optSel[p] = (optSel[p] + d.y * cols + n * 2) % n; k.sfx('click'); }
  if (k.party ? k.phit(p, 'a') : k.hit.has('a')) fn(optSel[p]);
}

/* ================================ bucle ================================= */
reset();
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
k.onParty = () => { if (k.st !== 'play') reset(); else { layout(); askPriv(); } };
k.show(CFG.title, CFG.help);

k.run((dt) => {
  if (msgT > 0) msgT -= dt;
  if (!k.gate(reset)) return;
  if (!DATA) return;
  if (phase === 'over') return;
  layout();
  for (let p = 0; p < np; p++) if (blok[p] > 0) blok[p] -= dt;

  if (MODE === 'cadena') return updCadena(dt);

  if (phase === 'intro') { tmr -= dt; if (tmr <= 0) { phase = 'play'; tmr = T0; askPriv(); k.sfx('start'); } return; }
  if (phase === 'res') { tmr -= dt; if (tmr <= 0) nextRound(); return; }
  if (phase !== 'play') return;

  tmr -= dt;
  if (MODE === 'dibuja') {
    if (plan) { const sp = planTotal(plan) / Math.max(4, T0 * 0.62); cpuTick(drawer, plan, dt, sp); }
    else if (k.human(drawer)) { moveBrush(drawer, dt); pointerDraw(drawer); }
  } else {
    if (tmr < T0 * 0.62 && hint < 1) hint = 1;
    if (tmr < T0 * 0.32 && hint < 2) hint = 2;
    if (!phoneUI() && k.human(drawer) && k.hit.has('b')) { sc[drawer] = Math.max(0, sc[drawer] - 5); nextWord(); askPriv(); k.sfx('hurt'); }
  }
  /* CPU que adivina */
  const prog = MODE === 'dibuja' ? (plan ? planProg(plan) : Math.min(1, strokes[drawer].length / 5)) : 1 - Math.max(0, tmr) / T0;
  for (let p = 0; p < np; p++) {
    if (p === drawer || !isCpu(p) || picks[p] != null || blok[p] > 0) continue;
    cpuWhen[p] -= dt;
    if (cpuWhen[p] <= 0) {
      if (prog < 0.25 && MODE === 'dibuja') { cpuWhen[p] = 1.5; continue; }
      const ok = cpuOK(prog);
      let i = opts.indexOf(word);
      if (!ok) { const bad = []; for (let j = 0; j < opts.length; j++) if (j !== i) bad.push(j); i = rndOf(bad); }
      guess(p, i);
      if (MODE === 'mimica') cpuWhen[p] = 2 + Math.random() * 6; else cpuWhen[p] = 99;
    }
  }
  /* humanos sin panel privado: eligen en la tele */
  if (!phoneUI()) for (let p = 0; p < np; p++) {
    if (p === drawer || isCpu(p) || picks[p] != null || blok[p] > 0) continue;
    padPick(p, opts.length, (i) => guess(p, i));
    if (p === 0) { const b = hitBtn(); if (b >= 0 && b < opts.length) guess(p, b); }
  }
  /* botones de dibujo en la tele (solitario) */
  if (!phoneUI() && k.human(drawer) && MODE === 'dibuja') {
    const b = hitBtn();
    if (b >= 0) { if (b < 6) { pen[drawer].col = b; k.sfx('click'); } else if (b === 6) undo(drawer); else { wipe(drawer); k.sfx('pop'); } }
  }
  if (tmr <= 0) { if (MODE === 'mimica') { say('¡Tiempo!', 2); endRound(); } else { say('Se acabó el tiempo', 2); endRound(); } }
}, () => draw());

function updCadena(dt) {
  if (phase === 'cdraw') {
    tmr -= dt;
    for (let p = 0; p < np; p++) {
      const L = chain[p];
      if (L.plan) { const sp = planTotal(L.plan) / Math.max(4, T0 * 0.7); cpuTick(p, L.plan, dt, sp); }
      else if (k.human(p)) { moveBrush(p, dt); if (p === 0) pointerDraw(p); }
    }
    if (!phoneUI() && k.human(0)) { const b = hitBtn(); if (b >= 0) { if (b < 6) { pen[0].col = b; k.sfx('click'); } else if (b === 6) undo(0); else if (b === 7) { wipe(0); k.sfx('pop'); } else { rdy[0] = true; k.sfx('click'); } } }
    let all = true;
    for (let p = 0; p < np; p++) { const L = chain[p]; if (L.plan ? !cpuDone(L.plan) : !rdy[p]) all = false; }
    if (tmr <= 0 || all) { k.sfx('pop'); startChainGuess(); }
    return;
  }
  if (phase === 'cguess') {
    tmr -= dt;
    const L = chain[ci], g = L.by;
    if (isCpu(g)) { cpuWhen[g] -= dt; if (cpuWhen[g] <= 0) { const ok = cpuOK(0.6); let i = L.opts.indexOf(L.w); if (!ok) { const bad = []; for (let j = 0; j < 4; j++) if (j !== i) bad.push(j); i = rndOf(bad); } return linkGuess(i); } }
    else if (!phoneUI()) { padPick(g, L.opts.length, (i) => linkGuess(i)); const b = hitBtn(); if (b >= 0 && b < L.opts.length) linkGuess(b); }
    if (tmr <= 0) { const bad = []; for (let j = 0; j < 4; j++) if (L.opts[j] !== L.w) bad.push(j); linkGuess(rndOf(bad)); }
    return;
  }
  if (phase === 'clink') { tmr -= dt; if (tmr <= 0) nextLink(); return; }
  if (phase === 'cshow') {
    tmr -= dt;
    if (tmr <= 0) { ci++; if (ci >= chain.length) return finish(); tmr = 3.4; k.sfx('pop'); }
  }
}

/* ================================ pintura ================================= */
function draw() {
  layout();
  c.fillStyle = '#0f1730'; c.fillRect(0, 0, W, H);
  bgArt();
  if (!DATA) { label('Cargando palabras…', W / 2, H / 2, 20, '#cfe6ff', 'center', 'middle'); return; }
  btns = []; ptrBox = null;
  topBar();
  if (MODE === 'cadena') drawCadena(); else drawRound();
  if (msgT > 0) {
    const s = fitSize(msg, 17, W - 40);
    c.font = `700 ${s}px system-ui, sans-serif`;
    const mw = Math.min(W - 24, c.measureText(msg).width + 26), mh = CAPH + 2, my = CAPY + (CAPH - mh) / 2;
    rr(c, (W - mw) / 2, my, mw, mh, 10); c.fillStyle = 'rgba(16,20,44,.96)'; c.fill();
    c.lineWidth = 2.2; c.strokeStyle = '#6e62f5'; c.stroke();
    label(msg, W / 2, my + mh / 2, s, '#ffe27a', 'center', 'middle');
  }
}
/* fondo: viñeta y confeti de fondo muy suave (cartoon, sin coste por frame) */
let bgc = null;
function bgArt() {
  if (!bgc || bgc.width !== Math.ceil(W) || bgc.height !== Math.ceil(H)) {
    bgc = document.createElement('canvas'); bgc.width = Math.ceil(W); bgc.height = Math.ceil(H);
    const g = bgc.getContext('2d');
    g.fillStyle = '#0f1730'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) {
      const x = (i * 97.3) % W, y = (i * 151.7) % H, r = 6 + (i % 4) * 3, a = 0.05 + (i % 3) * 0.015;
      g.fillStyle = AL(PAL[1 + i % 5], a);
      g.beginPath(); g.ellipse(x, y, r, r * 0.6, i, 0, 6.2832); g.fill();
    }
    const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.72);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  c.drawImage(bgc, 0, 0);
}
function topBar() {
  const tw = W - 20;
  const ts = fitSize(CFG.title, PORT ? 20 : 21, tw * 0.52);
  label(CFG.title, 10, 6, ts, '#ffe27a', 'left');
  /* reloj de la ronda */
  if (phase === 'play' || phase === 'cdraw' || phase === 'cguess') {
    const fr = Math.max(0, tmr) / Math.max(0.01, T0);
    const rw = Math.min(160, tw * 0.34), rx = W - 10 - rw, ry = 8, rh = 14;
    rr(c, rx, ry, rw, rh, 7); c.fillStyle = 'rgba(10,14,32,.75)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.25)'; c.stroke();
    if (fr > 0) { rr(c, rx + 2, ry + 2, Math.max(2, (rw - 4) * fr), rh - 4, 5); c.fillStyle = fr < 0.25 ? '#ff6fb5' : '#a8cf3f'; c.fill(); }
    label(Math.ceil(Math.max(0, tmr)) + ' s', rx + rw / 2, ry + rh / 2 + 1, 11, '#fff', 'center', 'middle', 800);
  } else if (MODE !== 'cadena') {
    label(`Ronda ${Math.min(round + 1, ROUNDS)}/${ROUNDS}`, W - 10, 10, 14, '#cfe6ff', 'right');
  }
  /* fichas de jugador: dejan libre el centro de arriba (botones de pausa/sonido del reproductor) */
  const gap = 5, hgt = 22, GAPC = 116;
  const left = np <= 1 ? np : Math.ceil(np / 2), right = np - left;
  const half = (W - 20 - GAPC) / 2;
  const boxes = [];
  for (let i = 0; i < left; i++) {
    const bw = (half - gap * (left - 1)) / left;
    boxes.push({ x: 10 + i * (bw + gap), w: bw });
  }
  for (let i = 0; i < right; i++) {
    const bw = (half - gap * (right - 1)) / right;
    boxes.push({ x: W - 10 - half + i * (bw + gap), w: bw });
  }
  for (let p = 0; p < np; p++) {
    const x = boxes[p].x, bw = boxes[p].w, act = activeP(p);
    rr(c, x, CHIPY, bw, hgt, 8); c.fillStyle = act ? AL(k.pcol(p), 0.34) : 'rgba(18,22,48,.72)'; c.fill();
    c.lineWidth = act ? 2.4 : 1.5; c.strokeStyle = act ? k.pcol(p) : 'rgba(255,255,255,.18)'; c.stroke();
    const t = `${pl[p].name} ${sc[p]}`;
    label(fitText(t, 12, bw - 8), x + bw / 2, CHIPY + hgt / 2 + 1, 12, act ? '#fff' : 'rgba(255,255,255,.7)', 'center', 'middle');
  }
}
function activeP(p) {
  if (MODE === 'cadena') return phase === 'cdraw' ? true : (phase === 'cguess' || phase === 'clink' ? p === chain[ci].by : false);
  return p === drawer;
}
/* hoja de papel con chinchetas (una pieza) */
function paper(b, hl) {
  c.save();
  c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, b.x + 4, b.y + 5, b.s, b.s, 12); c.fill();
  rr(c, b.x, b.y, b.s, b.s, 12); c.fillStyle = PAPER; c.fill();
  c.lineWidth = 3; c.strokeStyle = hl ? '#ffe27a' : OUT; c.stroke();
  c.restore();
}
function pin(x, y, col) {
  uni([[(g) => { g.moveTo(x, y + 7); g.lineTo(x - 3, y + 2); g.arc(x, y - 1, 5, 0.6, Math.PI * 2 + 0.1); g.closePath(); }, col]], 1.2);
}
function drawPaper(p, b, hl) {
  paper(b, hl);
  c.save(); c.beginPath(); rr(c, b.x, b.y, b.s, b.s, 12); c.clip();
  c.drawImage(offs[p], 0, 0, DSZ, DSZ, b.x, b.y, b.s, b.s);
  c.restore();
  pin(b.x + 14, b.y + 12, '#ff6fb5'); pin(b.x + b.s - 14, b.y + 12, '#5b8cff');
}
/* pincel cartoon (una pieza: mango + virola + punta) */
function brush(x, y, col, ang) {
  c.save(); c.translate(x, y); c.rotate(ang || -0.5);
  uni([
    [(g) => { g.moveTo(-4, -4); g.lineTo(-8, -46); g.quadraticCurveTo(0, -54, 8, -46); g.lineTo(4, -4); g.closePath(); }, '#c89a5a'],
    [(g) => { g.moveTo(-5, -4); g.lineTo(5, -4); g.lineTo(6, -14); g.lineTo(-6, -14); g.closePath(); }, '#b9c3d6'],
    [(g) => { g.moveTo(-5, -5); g.quadraticCurveTo(-3, 9, 0, 12); g.quadraticCurveTo(3, 9, 5, -5); g.closePath(); }, col]
  ], 1.5);
  c.restore();
}
/* muñeco que actúa (mímica): cabeza grande, manos manopla, párpado recto */
function actor(x, y, s, t, gest, col) {
  /* ángulo del brazo: 0 = recto hacia arriba, ±π/2 = horizontal, ±2.6 = pegado al costado */
  const A = Math.sin(t * 3.4), B = Math.sin(t * 3.4 + 1.6), C2 = Math.sin(t * 2.1);
  let la = -2.4 + A * 0.5, ra = 2.4 - A * 0.5, bob = C2 * 0.03 * s, lean = 0, leg = A * 0.35;
  if (gest === 1) { la = -0.5 + A * 0.3; ra = 0.5 - A * 0.3; }                       /* brazos arriba */
  else if (gest === 2) { bob = -Math.abs(A) * 0.14 * s; la = -1.7; ra = 1.7; }        /* saltos */
  else if (gest === 3) { la = -2.5; ra = 1.4 + B * 0.4; lean = A * 0.1; }             /* señala */
  else if (gest === 4) { la = -1.1 - A * 0.4; ra = 2.5; lean = -0.14 + A * 0.1; }     /* se agacha / gira */
  c.save(); c.translate(x, y + bob); c.rotate(lean); c.scale(s / 100, s / 100);
  /* sombra de contacto dura */
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, 67, 38, 9, 0, 0, 6.2832); c.fill();
  /* brazo de una pieza: manga recta + mano manopla al final */
  const arm = (a, sgn) => (g) => {
    const sx = sgn * 15, sy = -8, hx = sx + Math.sin(a) * 32, hy = sy - Math.cos(a) * 32;
    const dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1, px = -dy / L * 7, py = dx / L * 7;
    g.moveTo(sx + px, sy + py); g.lineTo(hx + px, hy + py); g.lineTo(hx - px, hy - py); g.lineTo(sx - px, sy - py); g.closePath();
    g.moveTo(hx + 9, hy); g.arc(hx, hy, 9, 0, 6.2832); g.closePath();
  };
  uni([
    [arm(la, -1), LT(col, 0.06)],
    [arm(ra, 1), LT(col, 0.06)],
    [(g) => { const l1 = leg * 10, l2 = -leg * 10;
      g.moveTo(-25, 65 + l1); g.lineTo(-25, 58 + l1); g.lineTo(-14, 56 + l1); g.lineTo(-13, 18); g.lineTo(13, 18);
      g.lineTo(14, 56 + l2); g.lineTo(25, 58 + l2); g.lineTo(25, 65 + l2); g.lineTo(3, 65 + l2); g.lineTo(3, 58 + l2);
      g.lineTo(2, 30); g.lineTo(-2, 30); g.lineTo(-3, 58 + l1); g.lineTo(-3, 65 + l1); g.closePath(); }, '#3b4470'],
    [(g) => { g.moveTo(-20, 22); g.quadraticCurveTo(-24, -12, 0, -16); g.quadraticCurveTo(24, -12, 20, 22); g.closePath(); }, col],
    [(g) => { g.arc(0, -42, 28, 0, 6.2832); }, '#f6d3ae'],
    [(g) => { g.moveTo(-28, -50); g.quadraticCurveTo(-18, -74, 4, -70); g.quadraticCurveTo(26, -66, 27, -48); g.quadraticCurveTo(10, -60, -28, -50); g.closePath(); }, '#43304f']
  ], 1.6);
  /* cara: párpado superior recto, cejas gruesas */
  c.fillStyle = OUT;
  c.fillRect(-15, -48, 9, 3.4); c.fillRect(6, -48, 9, 3.4);
  c.beginPath(); c.arc(-10.5, -41, 4.2, 0, 6.2832); c.arc(10.5, -41, 4.2, 0, 6.2832); c.fill();
  c.beginPath(); c.ellipse(0, -30, 7 + Math.abs(A) * 3, 5 + Math.abs(A) * 3, 0, 0, 6.2832); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-16, -52, 6, 4, -0.5, 0, 6.2832); c.fill();
  c.restore();
}
/* marca de acierto / fallo (una pieza) */
function mark(x, y, r, ok) {
  uni([[(g) => { g.arc(x, y, r, 0, 6.2832); }, ok ? '#a8cf3f' : '#ff6fb5']], 1.6);
  c.strokeStyle = '#1a1530'; c.lineWidth = Math.max(2.4, r * 0.28); c.lineCap = 'round'; c.beginPath();
  if (ok) { c.moveTo(x - r * 0.45, y); c.lineTo(x - r * 0.1, y + r * 0.38); c.lineTo(x + r * 0.5, y - r * 0.4); }
  else { c.moveTo(x - r * 0.38, y - r * 0.38); c.lineTo(x + r * 0.38, y + r * 0.38); c.moveTo(x + r * 0.38, y - r * 0.38); c.lineTo(x - r * 0.38, y + r * 0.38); }
  c.stroke();
}

/* ---------- pantallas ---------- */
function drawRound() {
  const b = paperBox(0, 1);
  if (MODE === 'dibuja') {
    drawPaper(drawer, b, phase === 'play');
    if (!phoneUI() && k.human(drawer) && phase === 'play') ptrBox = b;
    if (phase === 'play' && k.human(drawer)) { const q = pen[drawer]; brush(b.x + q.x * b.s, b.y + q.y * b.s, PAL[q.col]); }
  } else {
    paper(b, phase === 'play');
    actor(b.x + b.s / 2, b.y + b.s * 0.62, b.s * 0.52, performance.now() / 1000, actGest, k.pcol(drawer));
    const cat = CATOF[word] || '';
    label(UP(cat), b.x + b.s / 2, b.y + 14, fitSize(UP(cat), 18, b.s - 30), '#6e62f5', 'center', 'top', 800);
    if (phase === 'play') {
      let h = '';
      if (hint >= 1) h = `${word.replace(/\S/g, '_').replace(/_/g, '_ ')}`.trim();
      if (hint >= 2) h = (UP(word[0]) + word.slice(1).replace(/\S/g, '_').replace(/_/g, ' _')).trim();
      if (h) label(h, b.x + b.s / 2, b.y + b.s - 16, fitSize(h, 20, b.s - 24), '#1a1530', 'center', 'bottom');
      label(`Palabras: ${wordsDone}`, b.x + 12, b.y + b.s - 12, 13, '#6b6482', 'left', 'bottom');
    }
  }
  /* rótulo central de la fase */
  if (phase === 'intro') {
    const t1 = MODE === 'mimica' ? `Actúa ${pl[drawer].name}` : `Dibuja ${pl[drawer].name}`;
    banner(b, t1, isCpu(drawer) ? 'Adivina en tu móvil' : (phoneUI() ? 'Mira tu móvil' : 'Prepárate'));
  } else if (phase === 'res') {
    banner(b, UP(word), `${hitCount()} de ${np - 1} lo adivinaron`);
  }
  bottom();
}
function hitCount() { let n = 0; for (let p = 0; p < np; p++) if (p !== drawer && picks[p] != null && opts[picks[p]] === word) n++; return n; }
function banner(b, t1, t2) {
  const bw = Math.min(b.s + 20, W - 20), bx = (W - bw) / 2, by = b.y + Math.max(10, b.s * 0.3 - 46);
  rr(c, bx, by, bw, 92, 16); c.fillStyle = 'rgba(16,20,44,.92)'; c.fill(); c.lineWidth = 3.4; c.strokeStyle = '#6e62f5'; c.stroke();
  label(t1, W / 2, by + 34, fitSize(t1, 30, bw - 30), '#ffe27a', 'center', 'middle');
  label(t2, W / 2, by + 66, fitSize(t2, 16, bw - 30), '#cfe6ff', 'center', 'middle');
}
function drawCadena() {
  if (!chain || !chain.length) return;
  if (ci >= chain.length) ci = chain.length - 1;
  if (phase === 'cdraw') {
    for (let p = 0; p < np; p++) {
      const b = paperBox(p, np);
      drawPaper(p, b, k.human(p));
      const nm = pl[p].name + (rdy[p] ? ' ✓' : '');
      label(nm, b.x + 8, b.y + b.s - 8, Math.min(14, fitSize(nm, 14, b.s - 16)), DK(k.pcol(p), 0.25), 'left', 'bottom');
      if (k.human(p)) { const q = pen[p]; brush(b.x + q.x * b.s, b.y + q.y * b.s, PAL[q.col]); }
      if (p === 0 && !phoneUI() && k.human(0)) ptrBox = b;
    }
    cap(phoneUI() ? 'Cada uno dibuja su palabra (mírala en tu móvil)' : 'Dibuja tu palabra');
    bottom();
    return;
  }
  if (phase === 'cshow') {
    const L = chain[ci], b = paperBox(0, 1);
    drawPaper(ci, b, false);
    const ok = L.opts[L.pick] === L.w;
    mark(b.x + b.s - 22, b.y + b.s - 22, 18, ok);
    banner(b, `${pl[ci].name} dibujó «${UP(L.w)}»`, `${pl[L.by].name} dijo «${L.pick == null ? '—' : L.opts[L.pick]}»`);
    bottom();
    return;
  }
  const L = chain[ci], b = paperBox(0, 1);
  drawPaper(ci, b, phase === 'cguess');
  if (phase === 'clink') {
    const ok = L.opts[L.pick] === L.w;
    banner(b, ok ? '¡Acierto!' : UP(L.w), ok ? `${pl[L.by].name} +100` : `${pl[L.by].name} dijo «${L.opts[L.pick]}»`);
  } else {
    cap(`Dibujo de ${pl[ci].name} · adivina ${pl[L.by].name}`);
  }
  bottom();
}

/* ---------- franja de abajo: opciones o paleta ---------- */
function bottom() {
  if (phoneUI()) {
    const t = phase === 'res' || phase === 'clink' || phase === 'cshow' ? 'Mira la tele' : 'Todo pasa en los móviles';
    label(t, W / 2, OPTY + 8, 13, 'rgba(207,230,255,.7)', 'center', 'middle');
    return;
  }
  const meDraw = MODE === 'cadena' ? (phase === 'cdraw' && k.human(0)) : (phase === 'play' && drawer === 0 && k.human(0) && MODE === 'dibuja');
  if (meDraw) return palette(0);
  let os = null, fn = null, sel = 0;
  if (MODE === 'cadena' && phase === 'cguess' && k.human(chain[ci].by)) { os = chain[ci].opts; sel = optSel[chain[ci].by]; }
  else if (MODE !== 'cadena' && phase === 'play' && drawer !== 0 && k.human(0) && picks[0] == null) { os = opts; sel = optSel[0]; }
  if (!os) {
    const t = MODE === 'mimica' && phase === 'play' && drawer === 0 ? 'Actúa la palabra y pulsa B para pasar' : 'Espera tu turno';
    label(t, W / 2, OPTY + OPTH / 2, 15, 'rgba(207,230,255,.75)', 'center', 'middle');
    return;
  }
  const cols = PORT ? 2 : 4, rows = Math.ceil(os.length / cols), gap = 8;
  const bw = (W - 20 - gap * (cols - 1)) / cols, bh = Math.min(52, (OPTH - 8 - gap * (rows - 1)) / rows);
  const y0 = OPTY + (OPTH - (bh * rows + gap * (rows - 1))) / 2;
  for (let i = 0; i < os.length; i++) {
    const x = 10 + (i % cols) * (bw + gap), y = y0 + Math.floor(i / cols) * (bh + gap), on = i === sel;
    btns.push({ x, y, w: bw, h: bh });
    rr(c, x, y + 3, bw, bh, 12); c.fillStyle = OUT; c.fill();
    rr(c, x, y - (on ? 2 : 0), bw, bh, 12); c.fillStyle = on ? '#6e62f5' : '#2a2f55'; c.fill();
    c.lineWidth = 2.6; c.strokeStyle = on ? '#ffe27a' : 'rgba(255,255,255,.22)'; c.stroke();
    label(fitText(os[i], 17, bw - 14), x + bw / 2, y + bh / 2 - (on ? 2 : 0), Math.min(17, fitSize(os[i], 17, bw - 14)), '#fff', 'center', 'middle');
  }
}
const PBL = ['Deshacer', 'Borrar'];
function palette(p) {
  const n = PAL.length, gap = 6;
  const rowH = Math.min(44, (OPTH - 10 - gap) / 2);
  const sw = (W - 20 - gap * (n - 1)) / n, y0 = OPTY + 4;
  for (let i = 0; i < n; i++) {
    const x = 10 + i * (sw + gap), on = pen[p].col === i;
    btns.push({ x, y: y0, w: sw, h: rowH });
    rr(c, x, y0 + 3, sw, rowH, 10); c.fillStyle = OUT; c.fill();
    rr(c, x, y0 - (on ? 2 : 0), sw, rowH, 10); c.fillStyle = PAL[i]; c.fill();
    c.lineWidth = on ? 3.2 : 2; c.strokeStyle = on ? '#ffe27a' : 'rgba(255,255,255,.3)'; c.stroke();
  }
  const nb = MODE === 'cadena' ? 3 : 2, lbl = MODE === 'cadena' ? PBL.concat([rdy[p] ? 'Listo ✓' : 'Listo']) : PBL;
  const cols2 = ['#2c4a86', '#8a3550', '#2f6b3a'];
  const y1 = y0 + rowH + gap, bw = (W - 20 - gap * (nb - 1)) / nb, bh = Math.min(rowH, OPTH - (y1 - OPTY) - 6);
  for (let i = 0; i < nb; i++) {
    const x = 10 + i * (bw + gap);
    btns.push({ x, y: y1, w: bw, h: bh });
    rr(c, x, y1 + 3, bw, bh, 10); c.fillStyle = OUT; c.fill();
    rr(c, x, y1, bw, bh, 10); c.fillStyle = cols2[i]; c.fill();
    c.lineWidth = 2.4; c.strokeStyle = 'rgba(255,255,255,.28)'; c.stroke();
    label(lbl[i], x + bw / 2, y1 + bh / 2, Math.min(16, fitSize(lbl[i], 16, bw - 12)), '#fff', 'center', 'middle');
  }
  const w2 = MODE === 'cadena' ? (chain && chain[p] ? chain[p].w : '') : word;
  if (w2) cap('Tu palabra: ' + UP(w2), '#ffe27a');
}
