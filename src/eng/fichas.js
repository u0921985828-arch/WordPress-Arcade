/* fichas.js — Fichas de Colores (rummy de fichas, marca blanca). CFG.mode: 'rummy'
 * Reglas puras en fichasrul.js (FR), verificadas en Node. 1 persona contra 3 CPU.
 * Tú juegas con la mano a la vista; en tu turno puedes mover también las fichas que ya
 * están en la mesa (esa es la gracia del juego) y «Listo» comprueba que todo cuadre. */
const OUT = ART.OUT, R2 = 6.2832;
const PORT = innerHeight > innerWidth;
const W = PORT ? 480 : 820, H = PORT ? 760 : 470;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#12203a' }), c = k.ctx;
const TCOL = ['#e0524f', '#4f8fe0', '#e08a2f', '#2f3550'];
const NAMES = ['Tú', 'CPU 1', 'CPU 2', 'CPU 3'];
const PCOL = ['#ffc94d', '#8fd6ff', '#a8cf3f', '#ff9ac4'];
const LS = 'cpu:' + CFG.id; let lvl = 0; try { lvl = +localStorage.getItem(LS) || 0; } catch (e) {}

/* ---- disposición ---- */
const HUD = 56, BTNH = 46, BTNY = H - BTNH - 8;
const HTW = PORT ? 38 : 34, HTH = Math.round(HTW * 1.34);
const HANDY = BTNY - 8 - HTH * 2 - 6;
const TY = HUD + 6, TH = HANDY - TY - 8;
const STW = PORT ? 30 : 30, STH = Math.round(STW * 1.34), SGAP = 3, SPAD = 7, ROWH = STH + SPAD * 2 + 6;

let deck, hands, table, turn, melded, pool, msg = '', msgT = 0, phase = 'play', tScroll = 0;
let sel = null, carried = null, snap = null, fromHand = [], movedTable = false, cpuT = 0, tN = 0, started = false;
let lay = [], ranking = null;

const rndi = (n) => Math.floor(Math.random() * n);
function reset() {
  deck = FR.deck(rndi); hands = [0, 1, 2, 3].map(() => deck.splice(0, 14));
  table = []; turn = 0; melded = [0, 0, 0, 0]; pool = deck.length; phase = 'play';
  sel = null; carried = null; fromHand = []; movedTable = false; tScroll = 0; ranking = null;
  hands[0].sort(handOrder); takeSnap();
  say('Tu turno: baja 30 puntos o más para empezar');
}
const handOrder = (a, b) => (a.j ? 1 : b.j ? -1 : a.c - b.c || a.n - b.n);
const takeSnap = () => { snap = { hand: hands[0].slice(), table: table.map((s) => s.slice()) }; fromHand = []; movedTable = false; };
const say = (t) => { msg = t; msgT = 3.2; };

/* ---- arte: ficha de una sola pieza, cacheada ---- */
const SPR = {};
function tile(t, w, h, hot) {
  const key = `${t.j ? 'J' : t.c + ':' + t.n}|${w}|${h}|${hot ? 1 : 0}`;
  if (SPR[key]) return SPR[key];
  const D = Math.min(2, devicePixelRatio || 1), cv = document.createElement('canvas');
  cv.width = (w + 8) * D; cv.height = (h + 10) * D;
  const q = cv.getContext('2d'); q.scale(D, D); q.translate(4, 3);
  const path = (g) => ART.rr(g, 0, 0, w, h, w * 0.18);
  q.save(); q.translate(1.5, 4); path(q); q.fillStyle = 'rgba(8,10,28,.35)'; q.fill(); q.restore();
  path(q); q.lineWidth = 2.4; q.lineJoin = 'round'; q.strokeStyle = OUT; q.stroke();
  q.fillStyle = hot ? '#fffaf0' : '#f2e7cf'; q.fill();
  q.save(); path(q); q.clip();
  q.fillStyle = 'rgba(120,96,50,.22)'; q.fillRect(0, h * 0.62, w, h);
  q.fillStyle = 'rgba(255,255,255,.55)'; q.fillRect(0, 0, w, h * 0.16);
  q.restore();
  const col = t.j ? '#8a3fd0' : TCOL[t.c];
  q.font = `900 ${Math.round(h * 0.52)}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  q.textAlign = 'center'; q.textBaseline = 'middle';
  if (t.j) { /* comodín: una carita sonriente de una pieza */
    q.beginPath(); q.arc(w / 2, h * 0.44, h * 0.23, 0, R2); q.fillStyle = col; q.lineWidth = 2; q.strokeStyle = OUT; q.stroke(); q.fill();
    q.fillStyle = OUT; q.beginPath(); q.arc(w / 2 - h * 0.09, h * 0.4, h * 0.04, 0, R2); q.arc(w / 2 + h * 0.09, h * 0.4, h * 0.04, 0, R2); q.fill();
    q.strokeStyle = OUT; q.lineWidth = 2; q.beginPath(); q.arc(w / 2, h * 0.46, h * 0.1, 0.5, 2.64); q.stroke();
  } else { q.fillStyle = col; q.fillText(String(t.n), w / 2, h * 0.46);
    q.beginPath(); q.arc(w / 2, h * 0.84, h * 0.055, 0, R2); q.fillStyle = col; q.fill(); }
  return (SPR[key] = cv);
}
const put = (t, x, y, w, h, hot) => { const cv = tile(t, w, h, hot); c.drawImage(cv, x - 4, y - 3, w + 8, h + 10); };
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}

/* ---- maquetación de la mesa: cada combinación es una caja que se coloca en filas ---- */
function layout() {
  lay = []; let x = 8, y = 0, rh = ROWH;
  const maxW = W - 16;
  for (let i = 0; i < table.length; i++) {
    const bw = table[i].length * (STW + SGAP) - SGAP + SPAD * 2;
    if (x > 8 && x + bw > 8 + maxW) { x = 8; y += rh; }
    lay.push({ i, x, y, w: bw, h: STH + SPAD * 2 });
    x += bw + 8;
  }
  /* hueco para dejar una combinación nueva */
  const nw = STW + SPAD * 2 + 10;
  if (x > 8 && x + nw > 8 + maxW) { x = 8; y += rh; }
  lay.push({ i: -1, x, y, w: nw, h: STH + SPAD * 2 });
  return y + rh;
}
const layH = () => layout();

/* ---- turno humano ---- */
function pickFromHand(i) { carried = null; sel = sel === i ? null : i; k.sfx('click'); }
function insertAt(si, tl) {
  const s = table[si];
  for (let p = 0; p <= s.length; p++) { const nw = s.slice(); nw.splice(p, 0, tl); if (FR.valid(nw)) { table[si] = nw; return true; } }
  s.push(tl); return true;
}
function playSelected(si) {
  if (sel != null) { const tl = hands[0][sel];
    if (si < 0) table.push([tl]); else insertAt(si, tl);
    hands[0].splice(sel, 1); fromHand.push(tl); sel = null; k.sfx('pop'); return; }
  if (carried) { const { si: from, ti } = carried; const tl = table[from][ti];
    if (!melded[0]) { say('En la primera bajada no puedes tocar la mesa'); carried = null; return; }
    table[from].splice(ti, 1); if (!table[from].length) { table.splice(from, 1); if (si > from) si--; if (si === from) si = -1; }
    if (si < 0) table.push([tl]); else insertAt(si, tl);
    if (fromHand.indexOf(tl) < 0) movedTable = true;
    carried = null; k.sfx('pop'); }
}
function undo() { hands[0] = snap.hand.slice(); table = snap.table.map((s) => s.slice()); hands[0].sort(handOrder); sel = null; carried = null; fromHand = []; movedTable = false; k.sfx('hit'); }
function draw1() {
  if (fromHand.length) { say('Primero deshaz lo que has puesto'); return; }
  if (!deck.length) { say('No quedan fichas en el pozo'); endTurn(true); return; }
  hands[0].push(deck.pop()); pool = deck.length; hands[0].sort(handOrder); k.sfx('coin'); endTurn(true);
}
function ready() {
  if (!fromHand.length) { say('Tienes que poner al menos una ficha'); return; }
  for (const s of table) if (!FR.valid(s)) { say('Hay una combinación que no vale'); k.sfx('hit'); return; }
  if (!melded[0]) {
    if (movedTable) { say('En la primera bajada no puedes mover la mesa'); return; }
    let sum = 0;
    for (const s of table) { const f = FR.info(s); if (!f) continue; s.forEach((t, i) => { if (fromHand.indexOf(t) >= 0) sum += f.vals[i]; }); }
    if (sum < 30) { say(`Te faltan ${30 - sum} puntos para la primera bajada`); k.sfx('hit'); return; }
    melded[0] = 1; say('¡Primera bajada hecha!');
  }
  k.sfx('win'); endTurn(false);
}
function endTurn(drew) {
  takeSnap();
  if (!hands[0].length) return finish(0);
  if (drew) say('Robas una ficha');
  turn = 1; cpuT = 0;
}

/* ---- turnos de la CPU ---- */
function cpuPlay() {
  const p = turn, lazy = Math.max(0, 1 - (k.clamp(lvl + k.D.cpu, 0, 2) + 1) / 3) * 0.5;
  let r = { played: false };
  if (Math.random() >= lazy) r = FR.cpuTurn(hands[p], table, melded[p]);
  if (r.played && FR.tableOK(r.table)) {
    const put0 = hands[p].length - r.hand.length;
    hands[p] = r.hand; table = r.table; melded[p] = 1;
    say(`${NAMES[p]} pone ${put0} ficha${put0 === 1 ? '' : 's'}`); k.sfx('pop');
    if (!hands[p].length) return finish(p);
  } else if (deck.length) { hands[p].push(deck.pop()); pool = deck.length; say(`${NAMES[p]} roba`); k.sfx('click'); }
  else { say(`${NAMES[p]} pasa`); }
  turn = (p + 1) % 4; cpuT = 0;
  if (turn === 0) {
    if (!deck.length && !FR.cpuTurn(hands[0], table, melded[0]).played && !FR.rebuild(hands[0], table)) {
      /* nadie puede seguir: gana la mano más baja */
      if (!hands.some((h, i) => i && FR.cpuTurn(h, table, melded[i]).played)) return finish(-1);
    }
    say('Tu turno');
  }
}
function finish(win) {
  phase = 'over';
  const rows = hands.map((h, i) => ({ p: i, name: NAMES[i], score: i === win ? 0 : FR.penalty(h) }));
  if (win === 0) { lvl = Math.min(2, lvl + 0.5); } else if (win > 0) lvl = Math.max(0, lvl - 1);
  try { localStorage.setItem(LS, lvl); } catch (e) { /* sin almacenamiento */ }
  ranking = rows;
  k.podium(rows, { asc: true, head: win === 0 ? '¡Has ganado!' : win > 0 ? `Gana ${NAMES[win]}` : 'Sin fichas en el pozo', fmt: (v) => `${v} puntos`, go: 'Toca para otra partida' });
}

/* ---- bucle ---- */
reset();
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
k.show(CFG.title, CFG.help);
k.run((dt) => {
  tN += dt; if (msgT > 0) msgT -= dt;
  if (!k.gate(reset)) return; started = true; void started;
  if (phase === 'over') return;
  if (turn !== 0) { cpuT += dt; if (cpuT > 0.75) cpuPlay(); return; }
  const th = layH();
  if (k.ptr.down && k.ptr.y > TY && k.ptr.y < TY + TH && Math.abs(k.ptr.y - k.ptr.sy) > 6) {
    tScroll = k.clamp(tScroll + (k.ptr.y - k.ptr.sy) * 0.0, 0, 1e5); /* el arrastre se aplica abajo */
  }
  if (!k.ptr.hit) return;
  const x = k.ptr.x, y = k.ptr.y;
  /* botones */
  if (y >= BTNY) { const bw = (W - 32) / 3;
    if (x < 8 + bw) return draw1();
    if (x < 16 + bw * 2) return undo();
    return ready(); }
  /* mano */
  if (y >= HANDY && y < HANDY + HTH * 2 + 6) {
    const per = Math.max(1, Math.floor((W - 16) / (HTW + 4))), row = y < HANDY + HTH + 3 ? 0 : 1;
    const i = row * per + Math.floor((x - handX(per)) / (HTW + 4));
    if (i >= 0 && i < hands[0].length && x >= handX(per)) pickFromHand(i);
    return; }
  /* mesa */
  if (y >= TY && y < TY + TH) {
    const ly = y - TY + tScroll;
    for (const b of lay) {
      if (x < b.x || x > b.x + b.w || ly < b.y || ly > b.y + b.h) continue;
      if (b.i < 0) { if (sel != null || carried) playSelected(-1); return; }
      if (sel != null || carried) { playSelected(b.i); return; }
      const ti = k.clamp(Math.floor((x - b.x - SPAD) / (STW + SGAP)), 0, table[b.i].length - 1);
      const tl = table[b.i][ti];
      if (!melded[0] && fromHand.indexOf(tl) < 0) { say('En la primera bajada no puedes tocar la mesa'); return; }
      carried = { si: b.i, ti }; sel = null; k.sfx('click'); return;
    }
    if (sel != null || carried) playSelected(-1);
    return; }
  void th;
}, () => {
  c.fillStyle = '#12203a'; c.fillRect(0, 0, W, H);
  /* tapete */
  c.fillStyle = '#16543f'; ART.rr(c, 6, TY - 4, W - 12, TH + 8, 14); c.fill();
  c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  /* HUD */
  if (PORT) label(CFG.title, 10, 8, 19, '#ffe27a', 'left');
  const bw0 = (W - 20) / 4;
  for (let p = 0; p < 4; p++) { const bx = 10 + p * bw0, act = turn === p && phase === 'play';
    ART.rr(c, bx, 30, bw0 - 6, 22, 7); c.fillStyle = act ? ART.alpha(PCOL[p], 0.3) : 'rgba(18,22,48,.7)'; c.fill();
    c.lineWidth = act ? 2.4 : 1.6; c.strokeStyle = act ? PCOL[p] : 'rgba(255,255,255,.18)'; c.stroke();
    label(`${NAMES[p]} ${hands[p].length}`, bx + (bw0 - 6) / 2, 41, 13, act ? '#fff' : 'rgba(255,255,255,.6)', 'center', 'middle'); }
  label(`Pozo ${deck.length}`, W - 10, 8, 14, '#cfe6ff', 'right');
  /* mesa */
  const th = layout();
  c.save(); c.beginPath(); c.rect(6, TY - 2, W - 12, TH + 4); c.clip(); c.translate(0, TY - tScroll);
  for (const b of lay) {
    if (b.i < 0) { c.setLineDash([5, 5]); ART.rr(c, b.x, b.y, b.w, b.h, 9); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.4)'; c.stroke(); c.setLineDash([]);
      label('+', b.x + b.w / 2, b.y + b.h / 2, 22, 'rgba(255,255,255,.6)', 'center', 'middle'); continue; }
    const s = table[b.i], ok = FR.valid(s);
    ART.rr(c, b.x, b.y, b.w, b.h, 9); c.fillStyle = ok ? 'rgba(10,50,36,.6)' : 'rgba(120,30,40,.55)'; c.fill();
    c.lineWidth = 2; c.strokeStyle = ok ? 'rgba(255,255,255,.2)' : '#ff8a9a'; c.stroke();
    s.forEach((t, j) => { const hot = carried && carried.si === b.i && carried.ti === j;
      put(t, b.x + SPAD + j * (STW + SGAP), b.y + SPAD - (hot ? 4 : 0), STW, STH, hot); });
  }
  c.restore();
  if (th > TH) { const hbar = Math.max(24, TH * TH / th), by = TY + (TH - hbar) * (tScroll / Math.max(1, th - TH));
    ART.rr(c, W - 10, by, 4, hbar, 2); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill(); }
  /* mano */
  const per = Math.max(1, Math.floor((W - 16) / (HTW + 4))), hx = handX(per);
  hands[0].forEach((t, i) => { const r = i < per ? 0 : 1, cx = hx + (i % per) * (HTW + 4), cy = HANDY + r * (HTH + 6) - (sel === i ? 6 : 0);
    put(t, cx, cy, HTW, HTH, sel === i); });
  /* botones */
  const bw = (W - 32) / 3, lbl = ['Robar', 'Deshacer', 'Listo'], colB = ['#5b8cff', '#8a86a5', '#a8cf3f'];
  for (let i = 0; i < 3; i++) { const bx = 8 + i * (bw + 8);
    ART.rr(c, bx, BTNY, bw, BTNH, 12); c.fillStyle = ART.alpha(colB[i], 0.28); c.fill(); c.lineWidth = 2.6; c.strokeStyle = colB[i]; c.stroke();
    label(lbl[i], bx + bw / 2, BTNY + BTNH / 2, 17, '#fff', 'center', 'middle'); }
  /* aviso */
  if (msgT > 0) label(msg, W / 2, HANDY - 16, 15, '#ffe27a', 'center', 'middle');
  else if (turn === 0 && !melded[0]) label('Primera bajada: 30 puntos o más', W / 2, HANDY - 16, 15, '#cfe6ff', 'center', 'middle');
  void ranking;
});
function handX(per) { const n = Math.min(per, hands[0].length); return Math.round((W - (n * (HTW + 4) - 4)) / 2); }
