/* Color Sort (plan Friv): 20 estanterías escritas a mano en SORTLV (src/eng/sortlv.js), con las
 * REGLAS PURAS de ese fichero (SORTLV.pour/won/amount): las mismas que usa el resolutor de
 * scripts/check_sortlv.js, así que el mínimo de vertidos de cada nivel está demostrado.
 * Seis ideas nuevas de una en una (bolas ocultas, tubos de otra capacidad, límite de vertidos,
 * candado de color, tubo de un solo uso, comodín) y reloj; deshacer y pista contados por
 * dificultad, estrellas 1/2/3 y final de verdad. Lienzo fluido: llena la pantalla en vertical
 * y en horizontal, y los tubos se reparten en 1–3 filas según el hueco. */
const LVS = SORTLV[CFG.id] || SORTLV['color-sort'];
const W = 480, H = 640, OUT = ART.OUT, R2 = 6.2832;
const k = Kit({
  w: W, h: H, title: CFG.title, bg: '#16213d',
  fluid: { min: 0.42, max: 2.8, maxW: 1280, maxH: 960 },
  help: CFG.help || 'Toca un tubo para levantar la bola de arriba y otro para soltarla: solo cae sobre su mismo color, sobre un comodín o en un tubo vacío. Llena cada tubo con un solo color. Las «?» se descubren al quedar arriba, el candado se abre al completar su color y el tubo de un solo uso recibe una vez. Deshacer, Pista y Reiniciar están abajo: con pocos vertidos y sin ayudas, tres estrellas.'
}), c = k.ctx;
/* ---------- R5 §8 «pieza única» + cartoon de estudio (helpers locales) ---------- */
function uni(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = (ow || 1.5) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
}
function celp(g, parts, base, dx, dy) {
  g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip();
  const P = () => { g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.fill(); };
  g.fillStyle = ART.dark(base, 0.24); P();
  g.translate(-dx, -dy); g.fillStyle = base; P();
  g.translate(-dx * 1.15, -dy * 1.15); g.fillStyle = ART.lite(base, 0.2); P();
  g.restore();
}
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
const COL = { R: '#ff5f5f', B: '#4cc3ff', Y: '#ffd23d', G: '#5fe08a', P: '#b77cff', O: '#ff9a3d', K: '#ff8ad0', N: '#5a78ff', L: '#b8e05a', '*': '#f4f0ff' };
const CNAME = { R: 'rojo', B: 'azul', Y: 'amarillo', G: 'verde', P: 'morado', O: 'naranja', K: 'rosa', N: 'añil', L: 'lima', '*': 'comodín' };
const SYM = 'RBYGPOKNL';
/* Medidas a escala 1 (se multiplican por s, que sale del hueco disponible). */
const BR = 19, SL = 44, TW = 54, SP = 74, LIFT = 58, SHELF = 22;
const tubeH = (cap) => cap * SL + 18;

let MAP, ST, HID, init, hist, moves, level = 1, total = 0, lv, goal, undoLeft, hintLeft, usedUndo, usedHint, tLeft;
let sel = null, fly = [], pend = [], wob = [], fullT = [], openT = [], revT = [], liftA = 0, winT = 0, done = false, lost = false;
let chain = 0, bestChain = 0, tipT = 0, hintMv = null, hintT = 0, msgT = 0, msg = '', kc = 0, kbd = false, t = 0, wasLocked = [];
/* disposición */
let s = 1, POS = [], ROWS = [], BTN = [], BY = 0, HUDH = 64, bgCv = null, spr = {};

function build() {
  lv = LVS[Math.max(0, Math.min(LVS.length - 1, level - 1))];
  const P = SORTLV.parse(lv); MAP = P.map; ST = P.st; HID = P.hid;
  init = JSON.stringify({ st: ST, hid: HID });
  goal = SORTLV.goal(lv, k.dif);
  restartState();
  tipT = 5; layout();
}
function restartState() {
  const o = JSON.parse(init); ST = o.st; HID = o.hid;
  hist = []; moves = 0; undoLeft = SORTLV.UNDO[k.dif]; hintLeft = SORTLV.HINT[k.dif]; usedUndo = false; usedHint = false;
  tLeft = goal.tm || 0; sel = null; fly = []; done = false; lost = false; winT = 0; chain = 0; bestChain = 0; k.chainReset(); hintMv = null; hintT = 0;
  const n = ST.t.length; pend = new Array(n).fill(0); wob = new Array(n).fill(0); fullT = new Array(n).fill(0); openT = new Array(n).fill(0); revT = new Array(n).fill(0);
  wasLocked = ST.t.map((_, i) => SORTLV.locked(MAP, ST, i)); kc = Math.min(kc, n - 1);
}
function reset() { level = k.lv || 1; total = 0; build(); }
k.levels(LVS.length, { start: (i) => { level = i; total = 0; build(); if (k.st === 'play') k.st = 'over'; } });
k.onDif = () => { if (k.st !== 'play') reset(); };
k.onSize = () => { layout(); };

/* ---------- Disposición: 1–3 filas, la escala que más llene ---------- */
function layout() {
  if (!MAP) return;
  const n = ST.t.length, maxCap = Math.max.apply(null, MAP.tubes.map((q) => q.cap));
  HUDH = goal && goal.tm ? 104 : 88; const bot = 62, availW = k.W - 16, availH = k.H - HUDH - bot - 6;
  const rowH = tubeH(maxCap) + LIFT + SHELF;
  let best = 0, rows = 1;
  for (let r = 1; r <= 3; r++) { const per = Math.ceil(n / r), sc = Math.min(availW / (per * SP), availH / (r * rowH)); if (sc > best + 0.02) { best = sc; rows = r; } }
  s = Math.min(1.6, best);
  const per = Math.ceil(n / rows), used = rows * rowH * s, y0 = HUDH + 6 + (availH - used) / 2;
  POS = []; ROWS = [];
  for (let r = 0; r < rows; r++) {
    const a = r * per, b = Math.min(n, a + per), cnt = b - a, base = y0 + (r + 1) * rowH * s - SHELF * s;
    ROWS.push({ base: base, x0: k.W / 2 - cnt * SP * s / 2, x1: k.W / 2 + cnt * SP * s / 2 });
    for (let i = a; i < b; i++) {
      const cx = k.W / 2 + (i - a - (cnt - 1) / 2) * SP * s, h = tubeH(MAP.tubes[i].cap) * s;
      POS[i] = { cx: cx, x: cx - TW * s / 2, y: base - h, w: TW * s, h: h, base: base, row: r };
    }
  }
  const bw = Math.round(Math.max(96, Math.min(160, (k.W - 40) / 3)));
  BY = Math.round(k.H - 48);
  BTN = [['undo', k.W / 2 - bw * 1.5 - 8, bw], ['hint', k.W / 2 - bw / 2, bw], ['restart', k.W / 2 + bw / 2 + 8, bw]];
  spr = {}; bgCv = null; fly = []; pend = pend.map(() => 0);
}
const slot = (i, j) => { const p = POS[i]; return [p.cx, p.base - (9 + BR + j * SL) * s]; };
const liftPos = (i) => { const p = POS[i]; return [p.cx, p.y - 30 * s]; };

/* ---------- Sprites cacheados a la escala viva ---------- */
function mkCv(w, h, f) { const cv = document.createElement('canvas'), sc = s * CDPR; cv.width = Math.ceil(w * sc); cv.height = Math.ceil(h * sc); const g = cv.getContext('2d'); g.scale(sc, sc); f(g); return cv; }
function ballSpr(ch) {
  const key = 'b' + ch; if (spr[key]) return spr[key];
  const R = BR + 4;
  return (spr[key] = mkCv(R * 2, R * 2, (g) => {
    g.translate(R, R);
    const hidden = ch === '?', base = hidden ? '#5b5f7e' : COL[ch];
    const body = (h) => { h.moveTo(BR, 0); h.arc(0, 0, BR, 0, R2); }, parts = [[body, base]];
    uni(g, parts, 1.5); celp(g, parts, base, BR * 0.42, BR * 0.42);
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (hidden) { g.font = '900 22px ui-rounded,"Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = OUT; g.strokeText('?', 0, 2); g.fillStyle = '#e9e6ff'; g.fillText('?', 0, 2); }
    else if (ch === '*') {
      const cols = ['#ff5f5f', '#ffd23d', '#5fe08a', '#4cc3ff', '#b77cff'];
      g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.5 : 11; g.lineTo(Math.cos(a) * r, 1 + Math.sin(a) * r); } g.closePath();
      g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.save(); g.clip();
      for (let i = 0; i < 5; i++) { g.fillStyle = cols[i]; g.fillRect(-12, -10 + i * 4.6, 24, 4.7); } g.restore();
    } else {
      const v = SYM.indexOf(ch), sz = 6.5; g.fillStyle = 'rgba(26,21,48,.45)'; g.beginPath();
      if (v === 0) g.arc(0, 2, sz * 0.8, 0, R2);
      else if (v === 1) { g.moveTo(0, 2 - sz); g.lineTo(sz, 2 + sz * 0.8); g.lineTo(-sz, 2 + sz * 0.8); }
      else if (v === 2) g.rect(-sz * 0.8, 2 - sz * 0.8, sz * 1.6, sz * 1.6);
      else if (v === 3) for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? sz * 0.45 : sz * 1.1; g.lineTo(Math.cos(a) * r, 2 + Math.sin(a) * r); }
      else if (v === 4) { g.moveTo(0, 2 - sz); g.lineTo(sz * 0.8, 2); g.lineTo(0, 2 + sz); g.lineTo(-sz * 0.8, 2); }
      else if (v === 5) { g.rect(-sz, 0, sz * 2, 4); g.rect(-2, 2 - sz, 4, sz * 2); }
      else if (v === 6) { g.moveTo(0, 2 + sz); g.bezierCurveTo(-sz * 1.6, 2 - sz * 0.2, -sz * 0.6, 2 - sz * 1.4, 0, 2 - sz * 0.4); g.bezierCurveTo(sz * 0.6, 2 - sz * 1.4, sz * 1.6, 2 - sz * 0.2, 0, 2 + sz); }
      else if (v === 7) { g.arc(0, 2, sz, 0, R2); g.arc(0, 2, sz * 0.45, 0, R2, true); }
      else { g.rect(-sz, -2, sz * 2, 3.5); g.rect(-sz, 4, sz * 2, 3.5); }
      g.fill('evenodd');
    }
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(-7, -9, 5, 3, -0.6, 0, R2); g.fill();
  }));
}
function tubePath(g, x, y, w, h) { const r = w / 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h - r); g.arc(x + r, y + h - r, r, Math.PI, 0, true); g.lineTo(x + w, y); }
/* kind: n normal · u un solo uso · x un solo uso ya gastado (cristal agrietado) */
function tubeSpr(cap, kind, front) {
  const key = 't' + cap + kind + (front ? 'f' : 'b'); if (spr[key]) return spr[key];
  const th = tubeH(cap);
  return (spr[key] = mkCv(TW + 20, th + 24, (g) => {
    g.translate(10, 12);
    if (!front) {
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(TW / 2, th + 3, TW / 2 + 6, 6, 0, 0, R2); g.fill();
      tubePath(g, 0, 0, TW, th); g.closePath();
      g.fillStyle = kind === 'n' ? 'rgba(160,200,255,.13)' : kind === 'u' ? 'rgba(255,214,140,.16)' : 'rgba(120,120,140,.18)'; g.fill();
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(TW * 0.55, 4, TW * 0.4, th - TW / 2);
      return;
    }
    const rim = kind === 'n' ? 'rgba(210,235,255,.85)' : kind === 'u' ? 'rgba(255,220,150,.9)' : 'rgba(170,170,190,.7)';
    tubePath(g, 0, 0, TW, th); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3; g.strokeStyle = rim; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.4)'; ART.rr(g, 6, 14, 5, th - 44, 2.5); g.fill();
    ART.rr(g, -5, -6, TW + 10, 10, 5); ART.fillOut(g, kind === 'n' ? '#cfe4ff' : kind === 'u' ? '#ffd79a' : '#8d8ea6', 2.5);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, -4, TW - 6, 2);
    if (kind !== 'n') { /* etiqueta «1» de un solo uso */
      ART.rr(g, TW / 2 - 11, th - 34, 22, 20, 6); ART.fillOut(g, kind === 'u' ? '#ffb347' : '#6d6e86', 2);
      g.font = '900 14px ui-rounded,"Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('1', TW / 2, th - 23);
    }
    if (kind === 'x') { g.strokeStyle = 'rgba(240,240,255,.75)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(8, 18); g.lineTo(20, 40); g.lineTo(14, 58); g.moveTo(20, 40); g.lineTo(34, 50); g.moveTo(TW - 6, th * 0.45); g.lineTo(TW - 18, th * 0.55); g.lineTo(TW - 12, th * 0.7); g.stroke(); }
  }));
}
/* Candado de una pieza (arco + cuerpo en una silueta) con el color que lo abre. */
function lockSpr(ch) {
  const key = 'l' + ch; if (spr[key]) return spr[key];
  return (spr[key] = mkCv(52, 58, (g) => {
    g.translate(26, 32);
    const body = (h) => { ART.rr(h, -17, -6, 34, 26, 7); }, shackle = (h) => { h.moveTo(-11, -4); h.lineTo(-11, -14); h.arc(0, -14, 11, Math.PI, 0); h.lineTo(11, -4); h.lineTo(5, -4); h.lineTo(5, -14); h.arc(0, -14, 5, 0, Math.PI, true); h.lineTo(-5, -4); h.closePath(); };
    const parts = [[shackle, '#c9cbe0'], [body, COL[ch]]];
    uni(g, parts, 1.6); celp(g, [[body, COL[ch]]], COL[ch], 4, 4);
    g.fillStyle = OUT; g.beginPath(); g.arc(0, 4, 4, 0, R2); g.fill(); g.fillRect(-1.6, 5, 3.2, 8);
  }));
}
function corkSpr(ch) {
  const key = 'c' + ch; if (spr[key]) return spr[key];
  return (spr[key] = mkCv(TW + 16, 26, (g) => {
    g.translate(8, 6);
    const body = (h) => { h.moveTo(6, 0); h.lineTo(TW - 6, 0); h.lineTo(TW - 9, 14); h.lineTo(9, 14); h.closePath(); }, parts = [[body, COL[ch]]];
    uni(g, parts, 1.5); celp(g, parts, COL[ch], 3, 3);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(12, 3, TW - 24, 2.5);
  }));
}
function makeBg() {
  const BW = Math.ceil(k.W), BH = Math.ceil(k.H), cv = document.createElement('canvas'); cv.width = BW * CDPR; cv.height = BH * CDPR; const g = cv.getContext('2d'); g.scale(CDPR, CDPR);
  const gr = g.createLinearGradient(0, 0, 0, BH); gr.addColorStop(0, '#2b3c6e'); gr.addColorStop(1, '#141a33'); g.fillStyle = gr; g.fillRect(0, 0, BW, BH);
  /* azulejos de laboratorio, desaturados (el decorado no compite con las bolas) */
  const ts = 40; g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 2;
  for (let x = 0; x < BW; x += ts) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, BH); g.stroke(); }
  for (let y = 0; y < BH; y += ts) { g.beginPath(); g.moveTo(0, y); g.lineTo(BW, y); g.stroke(); }
  const vg = g.createRadialGradient(BW / 2, BH / 2, Math.min(BW, BH) * 0.3, BW / 2, BH / 2, Math.max(BW, BH) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, BW, BH);
  /* baldas de madera, una por fila */
  for (const r of ROWS) {
    const x0 = Math.max(6, r.x0 - 14 * s), x1 = Math.min(BW - 6, r.x1 + 14 * s), sy = r.base + 4 * s, sh = Math.max(9, 14 * s);
    g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, x0 + 4, sy + 4, x1 - x0, sh, 6); g.fill();
    ART.rr(g, x0, sy, x1 - x0, sh, 6); ART.fillOut(g, '#8a5a3b', 2.5); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x0 + 8, sy + 3, x1 - x0 - 16, 2);
    g.fillStyle = '#6b4128'; for (let x = x0 + 30; x < x1 - 20; x += 90) g.fillRect(x, sy + sh * 0.55, 18, 1.5);
  }
  return cv;
}
/* fondo vivo: burbujas que suben (posición determinista por tiempo, sin estado) */
function bubbles() {
  c.strokeStyle = 'rgba(190,215,255,.12)'; c.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const sp = 14 + (i * 7) % 18, ph = (i * 0.137) % 1, x = ((i * 97.3) % 1) * 0 + ((i * 131) % 1000) / 1000 * k.W + Math.sin(t * 0.7 + i) * 10;
    const y = k.H + 20 - ((t * sp + ph * (k.H + 40)) % (k.H + 40)), r = 3 + (i * 5) % 9;
    c.beginPath(); c.arc(x, y, r, 0, R2); c.stroke();
  }
}

/* ---------- Lógica ---------- */
const sealed = (i) => SORTLV.sealed(MAP, ST.t[i]);
const lockedNow = (i) => SORTLV.locked(MAP, ST, i);
const usedOne = (i) => MAP.tubes[i].one && (ST.u & (1 << i));
const colorsLeft = () => MAP.cols.length - SORTLV.doneCount(MAP, ST);
const anyMove = () => { for (let a = 0; a < ST.t.length; a++) for (let b = 0; b < ST.t.length; b++) if (SORTLV.amount(MAP, ST, a, b)) return true; return false; };
function say(txt, col) { msg = txt; msgT = 1.6; k.float(txt, k.W / 2, BY - 30, col || '#ffd23d'); }
function pickable(i) { return ST.t[i].length && !sealed(i) && !lockedNow(i); }
function why(a, b) {
  if (lockedNow(b)) return 'Candado: completa el ' + CNAME[MAP.tubes[b].lock];
  if (sealed(b)) return 'Ese tubo ya está completo';
  if (usedOne(b)) return 'El tubo de un uso ya se gastó';
  if (ST.t[b].length >= MAP.tubes[b].cap) return 'Ese tubo está lleno';
  return 'Solo sobre el mismo color';
}
function tapTube(i) {
  if (i < 0) { sel = null; return; }
  if (sel === null) {
    if (pickable(i)) { sel = i; liftA = 0; k.sfx('click'); }
    else { wob[i] = 0.3; if (lockedNow(i)) { say('Candado: completa el ' + CNAME[MAP.tubes[i].lock]); k.sfx('hit'); } }
    return;
  }
  if (sel === i) { sel = null; k.sfx('click'); return; }
  if (SORTLV.amount(MAP, ST, sel, i)) { doPour(sel, i); sel = null; return; }
  /* tocar otro tubo que se puede coger cambia la selección si no hay vertido posible */
  if (pickable(i) && ST.t[i].length && ST.t[i][ST.t[i].length - 1] !== ST.t[sel][ST.t[sel].length - 1] && ST.t[i].length >= MAP.tubes[i].cap) { sel = i; liftA = 0; k.sfx('click'); return; }
  wob[i] = 0.35; k.sfx('hit'); say(why(sel, i), '#ffb0b0'); sel = null; chain = 0; k.chainReset();
}
function doPour(a, b) {
  const before = ST.t[b], A = ST.t[a];
  hist.push({ st: ST, hid: HID.map((h) => h.slice()) });
  const r = SORTLV.pour(MAP, ST, a, b);
  const fromTop = sel === a && liftA >= 1;
  for (let n = 0; n < r.n; n++) {
    const from = n === 0 && fromTop ? liftPos(a) : slot(a, A.length - 1 - n);
    fly.push({ col: r.c, from: from, to: slot(b, before.length + n), t: -n * 0.08, b: b, last: n === r.n - 1, lift: n === 0 && fromTop });
  }
  HID[a].length -= r.n; for (let n = 0; n < r.n; n++) HID[b].push(false);
  ST = r.st; moves++; pend[b] += r.n; hintMv = null;
  /* la «?» que queda arriba se descubre */
  const ha = HID[a]; if (ha.length && ha[ha.length - 1]) { ha[ha.length - 1] = false; revT[a] = 0.55; }
  /* cadena: cada vertido que junta color suma; volcar en un tubo vacío o fallar la corta */
  if (before.length || SORTLV.sealed(MAP, ST.t[b])) { chain++; bestChain = Math.max(bestChain, chain); } else { chain = 0; k.chainReset(); }
  fly[fly.length - 1].ch = chain; k.sfx('jump');
  if (SORTLV.won(MAP, ST)) done = true;
}
function land(f) {
  pend[f.b] = Math.max(0, pend[f.b] - 1);
  k.burst(f.to[0], f.to[1] - 6 * s, COL[f.col], 4, 60 * s);
  if (!f.last) { k.sfx('pop'); return; }
  const p = POS[f.b];
  if (sealed(f.b)) {
    const ch = f.ch || 1; fullT[f.b] = 0.9; k.hitstop(0.06); k.punch(0.1);
    k.burst(p.cx, p.y, COL[f.col], 22, 190 * s); k.sfx('coin'); k.reward('¡' + CNAME[f.col].toUpperCase() + ' COMPLETO!', COL[f.col]);
    if (ch >= 3) k.combo(ch, p.cx, p.y - 30 * s); else k.chime(Math.min(10, ch));
  } else if (f.ch > 0) { k.sfx('pop'); if (f.ch >= 3) k.combo(f.ch, p.cx, p.y - 20 * s); else k.chime(f.ch - 1); }
  else k.sfx('pop');
  /* candados que se abren */
  for (let i = 0; i < ST.t.length; i++) if (wasLocked[i] && !lockedNow(i)) {
    wasLocked[i] = false; openT[i] = 0.8; const q = POS[i]; k.burst(q.cx, q.y + 20 * s, COL[MAP.tubes[i].lock], 18, 160 * s);
    k.reward('¡CANDADO ABIERTO!', '#ffe08a'); k.shake(4); k.sfx('explode');
  }
  if (!done && goal.lim && moves >= goal.lim && !fly.some((q) => !q.land && q !== f)) lose('lim');
}
function undo() {
  if (!hist.length || done) return;
  if (undoLeft <= 0) { say('Sin deshaceres: reinicia', '#ff8a9a'); k.sfx('hurt'); return; }
  const h = hist.pop(); ST = h.st; HID = h.hid; undoLeft--; usedUndo = true; moves = Math.max(0, moves - 1);
  fly = []; pend = pend.map(() => 0); sel = null; chain = 0; k.chainReset(); hintMv = null;
  wasLocked = ST.t.map((_, i) => SORTLV.locked(MAP, ST, i)); k.sfx('click');
}
function restart() { restartState(); k.sfx('pop'); }
function hint() {
  if (done) return;
  if (hintLeft <= 0) { say('No quedan pistas', '#ff8a9a'); k.sfx('hurt'); return; }
  const r = SORTLV.solve(MAP, ST, { w: 2, cap: 30000 }) || SORTLV.solve(MAP, ST, { w: 5, cap: 60000 });
  if (!r || !r.path.length) { say('Sin salida desde aquí: deshaz o reinicia', '#ff8a9a'); k.sfx('hurt'); return; }
  hintLeft--; usedHint = true; hintMv = r.path[0]; hintT = 3; sel = null; k.sfx('coin');
}
function lose(why2) {
  if (lost || done) return; lost = true;
  const left = colorsLeft();
  const extra = (why2 === 'time' ? 'Se acabó el reloj' : `Gastaste los ${goal.lim} vertidos`) + `<br>Te faltaba${left === 1 ? '' : 'n'} ${left} color${left === 1 ? '' : 'es'} por completar`;
  k.lose(CFG.id, 0, why2 === 'time' ? '¡Tiempo!' : 'Sin vertidos', extra);
}
function win() {
  const in2 = moves <= goal.s2, stars = in2 && !usedUndo && !usedHint ? 3 : in2 ? 2 : 1;
  const gain = Math.max(100, 800 - Math.max(0, moves - lv.m) * 20) + level * 25 + (usedUndo ? 0 : 150) + (usedHint ? 0 : 100) + stars * 100 + Math.floor(tLeft) * 4 + bestChain * 25;
  total += gain; k.best(CFG.id, total);
  const miss = [];
  if (!in2) miss.push(`acabar en ${goal.s2} vertidos (has hecho ${moves})`);
  if (usedUndo) miss.push('no deshacer');
  if (usedHint) miss.push('no pedir pista');
  const extra = `${lv.n}<br>${moves} vertido${moves === 1 ? '' : 's'} · mínimo ${lv.m} · 2★ en ${goal.s2}` +
    (stars === 3 ? ' · <b style="color:#ffd166">¡Perfecto!</b>' : `<br>Para ${stars + 1 === 2 ? '2★' : '3★'} te falta: ${miss.join(' y ')}`);
  k.levelDone(total, extra, { stars: stars });
}
function btnAt(x, y) { if (y < BY - 4 || y > BY + 44) return null; const b = BTN.find((q) => x > q[1] && x < q[1] + q[2]); return b ? b[0] : null; }
function tubeAt(x, y) {
  for (let i = 0; i < POS.length; i++) { const p = POS[i]; if (Math.abs(x - p.cx) < SP * s / 2 && y > p.y - LIFT * s && y < p.base + 14 * s) return i; }
  return -1;
}

reset();
k.show(CFG.title, 'Pasa las bolas de tubo en tubo hasta que cada uno tenga un solo color. 20 estanterías pensadas a mano: cuantos menos vertidos, más estrellas.');

k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt;
  liftA = Math.min(1, liftA + dt / 0.12);
  for (let i = 0; i < wob.length; i++) { wob[i] = Math.max(0, wob[i] - dt); fullT[i] = Math.max(0, fullT[i] - dt); openT[i] = Math.max(0, openT[i] - dt); revT[i] = Math.max(0, revT[i] - dt); }
  if (tipT > 0) tipT -= dt; if (hintT > 0) { hintT -= dt; if (hintT <= 0) hintMv = null; } if (msgT > 0) msgT -= dt;
  for (const f of fly) { f.t += dt / 0.34; if (f.t >= 1 && !f.land) { f.land = true; land(f); } }
  if (fly.length && fly.every((f) => f.land)) fly = [];
  if (lost) return;
  if (done) { if (!fly.length) { winT += dt; if (winT > 0.7) { winT = -1e9; win(); } } return; }
  if (goal.tm) { tLeft -= dt; if (tLeft <= 0) { tLeft = 0; lose('time'); return; } }
  if (fly.some((f) => f.t < 0.5)) return;
  const n = ST.t.length, row = (i) => POS[i] ? POS[i].row : 0;
  if (k.hit.has('left')) { kc = (kc + n - 1) % n; kbd = true; }
  if (k.hit.has('right')) { kc = (kc + 1) % n; kbd = true; }
  if (k.hit.has('up') || k.hit.has('down')) {
    const dr = k.hit.has('up') ? -1 : 1, want = row(kc) + dr; let bi = -1, bd = 1e9;
    for (let i = 0; i < n; i++) if (row(i) === want) { const d = Math.abs(POS[i].cx - POS[kc].cx); if (d < bd) { bd = d; bi = i; } }
    if (bi >= 0) kc = bi; kbd = true;
  }
  if (k.hit.has('a')) { kbd = true; tapTube(kc); }
  if (k.hit.has('b')) undo();
  if (k.ptr.hit) {
    kbd = false; tipT = Math.min(tipT, 0.4);
    const b = btnAt(k.ptr.x, k.ptr.y);
    if (b === 'undo') undo(); else if (b === 'hint') hint(); else if (b === 'restart') restart();
    else tapTube(tubeAt(k.ptr.x, k.ptr.y));
  }
}, draw);

/* ---------- Dibujo ---------- */
function label(str, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(str, x, y); c.fillStyle = col || '#fff'; c.fillText(str, x, y);
}
function fitLabel(str, x, y, size, maxW, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; const w = c.measureText(str).width; if (w > maxW) size = Math.max(9, Math.floor(size * maxW / w)); label(str, x, y, size, col, align); }
function panel(x, y, w, h, col) { c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, x, y + 4, w, h, 14); c.fill(); ART.rr(c, x, y, w, h, 14); ART.fillOut(c, col || '#34487e', 2.5); }
function button(id, x, w) {
  const dis = id === 'undo' ? (!hist.length || undoLeft <= 0) : id === 'hint' ? hintLeft <= 0 : !moves && !hist.length;
  const y = BY, h = 40, pulse = id === 'hint' && !dis && !anyMove() ? 1 : 0;
  c.globalAlpha = dis ? 0.5 : 1;
  c.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(c, x, y + 4, w, h, 14); c.fill(); ART.rr(c, x, y, w, h, 14);
  ART.fillOut(c, dis ? '#3a4466' : id === 'undo' ? '#6e62f5' : id === 'hint' ? '#2f9e8f' : '#e0795a', 2.5);
  c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x + 12, y + 4, w - 24, 3);
  const txt = id === 'undo' ? `Deshacer ${undoLeft}` : id === 'hint' ? `Pista ${hintLeft}` : 'Reiniciar';
  fitLabel(txt, x + w / 2, y + 11, 16, w - 14, '#fff', 'center');
  c.globalAlpha = 1;
  if (pulse) { c.strokeStyle = 'rgba(255,240,160,' + (0.5 + Math.sin(t * 8) * 0.4) + ')'; c.lineWidth = 3; ART.rr(c, x - 4, y - 4, w + 8, h + 8, 17); c.stroke(); }
}
function drawBall(ch, x, y, sc) { const im = ballSpr(ch), R = (BR + 4) * s * (sc || 1); c.drawImage(im, x - R, y - R, R * 2, R * 2); }
function draw() {
  if (!bgCv) bgCv = makeBg();
  c.drawImage(bgCv, 0, 0, k.W, k.H);
  bubbles();
  const n = ST.t.length;
  for (let i = 0; i < n; i++) {
    const p = POS[i]; if (!p) continue;
    const tb = MAP.tubes[i], kind = tb.one ? (usedOne(i) ? 'x' : 'u') : 'n', ox = Math.sin(wob[i] * 40) * wob[i] * 14 * s, x = p.x + ox;
    const sl = sealed(i) && !pend[i];
    if (fullT[i] > 0 || sl) { c.globalAlpha = fullT[i] > 0 ? 0.25 + fullT[i] * 0.3 : 0.14; c.fillStyle = COL[ST.t[i][0]]; c.beginPath(); c.ellipse(p.cx + ox, p.y + p.h / 2, p.w * 0.95, p.h * 0.6, 0, 0, R2); c.fill(); c.globalAlpha = 1; }
    if (hintMv && (hintMv[0] === i || hintMv[1] === i)) { const on = hintMv[0] === i; c.strokeStyle = on ? 'rgba(124,247,160,' + (0.6 + Math.sin(t * 9) * 0.35) + ')' : 'rgba(255,240,140,.85)'; c.lineWidth = 3.5; c.setLineDash(on ? [] : [7, 5]); ART.rr(c, x - 8 * s, p.y - 18 * s, p.w + 16 * s, p.h + 26 * s, 14 * s); c.stroke(); c.setLineDash([]); }
    if (kbd && kc === i) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.setLineDash([6, 5]); ART.rr(c, x - 10 * s, p.y - LIFT * s, p.w + 20 * s, p.h + LIFT * s + 10 * s, 16 * s); c.stroke(); c.setLineDash([]); }
    const bk = tubeSpr(tb.cap, kind, false), fr = tubeSpr(tb.cap, kind, true), sw = (TW + 20) * s, sh = (tubeH(tb.cap) + 24) * s;
    c.drawImage(bk, x - 10 * s, p.y - 12 * s, sw, sh);
    const str = ST.t[i], shown = str.length - pend[i];
    for (let j = 0; j < shown; j++) {
      let [bx, by] = slot(i, j); bx += ox;
      if (sel === i && j === str.length - 1) { const [lx, ly] = liftPos(i), e = 1 - (1 - liftA) * (1 - liftA); if (liftA >= 1) continue; bx += (lx - p.cx) * e; by += (ly - by) * e; }
      const hidden = HID[i][j];
      if (j === shown - 1 && revT[i] > 0) { const q = revT[i] / 0.55, sx = Math.abs(Math.cos(q * Math.PI)); const im = ballSpr(q > 0.5 ? '?' : str[j]), R = (BR + 4) * s; c.drawImage(im, bx - R * sx, by - R, R * 2 * sx, R * 2); continue; }
      drawBall(hidden ? '?' : str[j], bx, by);
    }
    c.drawImage(fr, x - 10 * s, p.y - 12 * s, sw, sh);
    if (sl) { const pop = fullT[i] > 0.6 ? 1 + (fullT[i] - 0.6) * 1.5 : 1, cw = (TW + 16) * s * pop, ch2 = 26 * s * pop; c.drawImage(corkSpr(ST.t[i][0]), p.cx + ox - cw / 2, p.y - 16 * s - (pop - 1) * 20 * s, cw, ch2); }
    if (tb.lock && (lockedNow(i) || openT[i] > 0)) {
      const a = lockedNow(i) ? 1 : openT[i] / 0.8, lw = 52 * s, lh = 58 * s, ly = p.y + p.h * 0.42 - lh / 2 - (1 - a) * 30 * s;
      if (lockedNow(i)) { c.strokeStyle = 'rgba(200,203,224,.85)'; c.lineWidth = 4 * s; c.beginPath(); c.moveTo(x - 4 * s, p.y + p.h * 0.3); c.lineTo(x + p.w + 4 * s, p.y + p.h * 0.55); c.moveTo(x - 4 * s, p.y + p.h * 0.55); c.lineTo(x + p.w + 4 * s, p.y + p.h * 0.3); c.stroke(); }
      c.globalAlpha = a; c.drawImage(lockSpr(tb.lock), p.cx + ox - lw / 2, ly, lw, lh); c.globalAlpha = 1;
    }
  }
  /* bola levantada, por encima de todo */
  if (sel !== null && liftA >= 1 && ST.t[sel].length) {
    const [lx, ly] = liftPos(sel), str = ST.t[sel]; c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(lx, POS[sel].y - 4 * s, 14 * s, 4 * s, 0, 0, R2); c.fill();
    drawBall(str[str.length - 1], lx, ly + Math.sin(t * 6) * 3 * s);
  }
  /* vertido en arco con estirón en el vuelo y aplastón al llegar */
  for (const f of fly) {
    if (f.land) continue;
    if (f.t < 0) { if (!f.lift) continue; drawBall(f.col, f.from[0], f.from[1]); continue; }
    const e = f.t < 0.5 ? 2 * f.t * f.t : 1 - 2 * (1 - f.t) * (1 - f.t), top = Math.min(f.from[1], f.to[1]) - 70 * s - Math.abs(f.to[0] - f.from[0]) * 0.15;
    const x = f.from[0] + (f.to[0] - f.from[0]) * e, y = (1 - e) * (1 - e) * f.from[1] + 2 * (1 - e) * e * top + e * e * f.to[1];
    drawBall(f.col, x, y, 1 + Math.sin(f.t * Math.PI) * 0.12);
  }
  drawHud();
  BTN.forEach((b) => button(b[0], b[1], b[2]));
  if (!done && !lost && !fly.length && !anyMove()) { const bw = Math.min(320, k.W - 24); panel(k.W / 2 - bw / 2, BY - 40, bw, 30, 'rgba(34,28,66,.95)'); fitLabel('Sin jugadas: deshaz o reinicia', k.W / 2, BY - 33, 15, bw - 16, '#ffd23d', 'center'); }
  if (tipT > 0 && lv.i) {
    const al = Math.min(1, tipT / 0.6), bw = Math.min(440, k.W - 24); c.save(); c.globalAlpha = al;
    c.font = '700 15px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const words = lv.i.split(' '), lines = []; let cur = '';
    for (const wd of words) { const tr = cur ? cur + ' ' + wd : wd; if (c.measureText(tr).width > bw - 28 && cur) { lines.push(cur); cur = wd; } else cur = tr; } if (cur) lines.push(cur);
    const hh = 34 + lines.length * 20, y0 = BY - hh - 12;
    panel(k.W / 2 - bw / 2, y0, bw, hh, 'rgba(20,14,40,.93)'); label(lv.n, k.W / 2, y0 + 8, 16, '#ffd23d', 'center');
    c.font = '700 15px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.fillStyle = '#e9e6ff'; c.textAlign = 'center'; c.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) c.fillText(lines[i], k.W / 2, y0 + 30 + i * 20);
    c.restore();
  }
}
function drawHud() {
  /* Dos paneles en las esquinas (el centro de arriba es de los botones de pausa y sonido del kit)
     y, debajo, la meta visible: una ficha por color (se enciende al completarlo) y el reloj. */
  const L = k.ex(8), R = k.ex2(8), pw = Math.max(120, Math.min(200, k.W / 2 - 74)), ph = 50;
  panel(L, 8, pw, ph); panel(R - pw, 8, pw, ph);
  fitLabel(`Nivel ${level}/${LVS.length}`, L + 10, 13, 18, pw - 20, '#ffd23d');
  c.font = '700 12px ui-rounded,"Trebuchet MS",sans-serif'; c.fillStyle = '#b9c8f0'; c.textAlign = 'left'; c.textBaseline = 'top';
  let nm = lv.n; while (c.measureText(nm).width > pw - 20 && nm.length > 4) nm = nm.slice(0, -2).trimEnd() + '…'; c.fillText(nm, L + 10, 37);
  const mv = goal.lim ? `${moves}/${goal.lim}` : String(moves), danger = goal.lim && goal.lim - moves <= 3;
  c.font = '700 11px ui-rounded,"Trebuchet MS",sans-serif'; c.fillStyle = '#b9c8f0'; c.textAlign = 'left'; c.fillText(goal.lim ? 'LÍMITE' : 'VERTIDOS', R - pw + 10, 18);
  const lw = c.measureText(goal.lim ? 'LÍMITE' : 'VERTIDOS').width;
  fitLabel(mv, R - 10, 12, 20, pw - lw - 30, danger ? '#ff6f8a' : '#fff', 'right');
  c.font = '700 12px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = 'right'; c.fillStyle = moves <= goal.s2 ? '#ffd166' : '#8a8fb0';
  let st = `2★ si acabas en ${goal.s2}`; if (c.measureText(st).width > pw - 20) st = `2★ ≤ ${goal.s2}`; c.fillText(st, R - 10, 37);
  const cols = MAP.cols, cw = 15, gap = 5, tw = cols.length * (cw + gap) - gap, x0 = k.W / 2 - tw / 2, yy = 64;
  for (let i = 0; i < cols.length; i++) {
    const ok = SORTLV.colorDone(MAP, ST, cols[i]); c.globalAlpha = ok ? 1 : 0.32; ART.rr(c, x0 + i * (cw + gap), yy, cw, cw, 4); ART.fillOut(c, COL[cols[i]], 1.6); c.globalAlpha = 1;
    if (ok) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + i * (cw + gap) + 3.5, yy + 8); c.lineTo(x0 + i * (cw + gap) + 6.5, yy + 11); c.lineTo(x0 + i * (cw + gap) + 11.5, yy + 4); c.stroke(); }
  }
  if (goal.tm) {
    const bw = Math.min(320, k.W - 90), bx = k.W / 2 - bw / 2 - 18, by = yy + cw + 7, fr = Math.max(0, tLeft / goal.tm), low = tLeft < 10;
    ART.rr(c, bx, by, bw, 9, 4.5); ART.fillOut(c, '#1d2442', 1.5);
    if (fr > 0) { ART.rr(c, bx + 1.5, by + 1.5, (bw - 3) * fr, 6, 3); c.fillStyle = low ? (Math.sin(t * 12) > 0 ? '#ff6f8a' : '#ffb0b0') : fr < 0.3 ? '#ffd23d' : '#7cf7a0'; c.fill(); }
    label(Math.ceil(tLeft) + ' s', bx + bw + 8, by - 3, 13, low ? '#ff6f8a' : '#fff', 'left');
  }
}
