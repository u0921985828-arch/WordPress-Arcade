/* triangulos.js — Triángulos Numerados (triominós, marca blanca). CFG.mode: 'trio'
 * Reglas puras en triorul.js (TRI), verificadas en Node. 1–4 jugadores (tele). */
const PORT = innerHeight > innerWidth;
const W = PORT ? 480 : 820, H = PORT ? 760 : 470;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#101a33' });
const c = k.ctx, OUT = ART.OUT;
const NCOL = ['#8a93ad', '#e0524f', '#e08a2f', '#a8cf3f', '#5b8cff', '#c46ae0'];
const HUD = 56, BTNH = 44, BTNY = H - BTNH - 8;
const HW = PORT ? 84 : 74, HH = Math.round(HW * 0.866), ROWS = PORT ? 2 : 1;
const PER = Math.max(1, Math.floor((W - 16) / (HW + 4)));
const HANDY = BTNY - 8 - HH * ROWS - (ROWS - 1) * 6 - 6;
const TY = HUD + 4, TH = HANDY - TY - 20;
const SR3 = 0.8660254;

let deck, hands, board, sc, turn, pl, np, phase, sel, legal, cur, draws, pass, msg, msgT, cpuT, fx;
const label = (t, x, y, sz, col, al, bl) => { c.save(); c.font = `700 ${sz}px system-ui,sans-serif`; c.textAlign = al || 'left'; c.textBaseline = bl || 'top';
  c.lineWidth = Math.max(2, sz * 0.22); c.strokeStyle = 'rgba(12,16,34,.85)'; c.lineJoin = 'round'; c.strokeText(t, x, y); c.fillStyle = col; c.fillText(t, x, y); c.restore(); };
const say = (t) => { msg = t; msgT = 2.4; };

function reset() {
  np = k.party ? k.clamp(k.players().length, 2, 4) : 4;
  pl = k.players(np);
  deck = TRI.deck((n) => Math.floor(Math.random() * n));
  const nh = np === 2 ? 9 : 7;
  hands = []; sc = [];
  for (let p = 0; p < np; p++) { const h = []; for (let t = 0; t < nh; t++) h.push(deck.pop()); hands.push(h); sc.push(0); }
  board = {};
  let st = 0, sv = -1, si = 0;
  for (let p = 0; p < np; p++) hands[p].forEach((t, i) => { const v = TRI.val(t) + (TRI.triple(t) ? 100 : 0); if (v > sv) { sv = v; st = p; si = i; } });
  const t0 = hands[st].splice(si, 1)[0];
  board[TRI.key(0, 0)] = { v: t0, p: st, t: 0 };
  sc[st] += TRI.val(t0) + (TRI.triple(t0) ? (t0[0] === 0 ? 40 : 10) : 0);
  turn = (st + 1) % np; phase = 'play'; sel = null; legal = []; cur = 0; draws = 0; pass = 0;
  msg = `Sale ${pl[st].name}`; msgT = 2.4; cpuT = 0; fx = 0;
  askPriv();
}
/* ---- turno ---- */
const human = (p) => (k.party ? !pl[p].cpu : p === 0);
/* Miniatura de la ficha para el panel privado del mando (una por combinación, cacheada). */
const IMGC = {};
function tileImg(v) {
  const key = v.join('');
  if (IMGC[key]) return IMGC[key];
  const w = 104, h = Math.round(w * 0.866);
  const o = document.createElement('canvas'); o.width = w + 8; o.height = h + 8;
  const g = o.getContext('2d'), x = 4, y = 4, cx = x + w / 2, cy = y + h * 0.62;
  const cs = [[x + w / 2, y], [x + w, y + h], [x, y + h]];
  g.lineJoin = 'round'; g.beginPath(); g.moveTo(cs[0][0], cs[0][1]); g.lineTo(cs[1][0], cs[1][1]); g.lineTo(cs[2][0], cs[2][1]); g.closePath();
  g.fillStyle = '#f3ecd6'; g.fill(); g.lineWidth = 3.2; g.strokeStyle = OUT; g.stroke();
  g.font = `800 ${Math.round(w * 0.27)}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let n = 0; n < 3; n++) {
    const tx = cs[n][0] + (cx - cs[n][0]) * 0.36, ty = cs[n][1] + (cy - cs[n][1]) * 0.36;
    g.lineWidth = 4.5; g.strokeStyle = OUT; g.strokeText(String(v[n]), tx, ty);
    g.fillStyle = NCOL[v[n]]; g.fillText(String(v[n]), tx, ty);
  }
  return (IMGC[key] = o.toDataURL('image/png'));
}
/* Cada jugador ve SU mano en su móvil, siempre: en su turno puede tocarla, fuera de turno se ve apagada. */
function askPriv() {
  if (!k.party || !k.privOK) return;
  for (let p = 0; p < np; p++) {
    if (!human(p)) continue;
    const mine = p === turn && phase === 'play';
    const items = hands[p].map((t, i) => ({ v: i, img: tileImg(t), sub: `${TRI.val(t)} pts`, off: !mine }));
    if (mine) { items.push({ v: 'draw', label: `Robar (${3 - draws})`, col: '#2c4a86' }); items.push({ v: 'pass', label: 'Pasar', col: '#3a3556' }); }
    k.priv(p, { title: `Tus fichas (${hands[p].length})`, sm: true,
      text: mine ? 'Elige una ficha' : `Turno de ${pl[turn].name}`, items });
  }
}
/* Mientras coloca, el panel se reduce a un aviso: así el joystick queda libre. */
function privPlacing() {
  if (!k.party || !k.privOK || !human(turn)) return;
  k.priv(turn, { title: 'Coloca la ficha', text: 'Mueve con el joystick y pulsa Poner (B para cambiar de ficha)', bar: true, items: [] });
}
k.onPick = (p, v) => {
  if (p !== turn || !human(turn) || phase !== 'play') return;
  if (v === 'draw') return drawOne();
  if (v === 'pass') return doPass();
  pick(v | 0);
};
function pick(i) {
  if (i < 0 || i >= hands[turn].length) return;
  sel = i; legal = TRI.moves(board, [hands[turn][i]]); cur = 0;
  if (!legal.length) { sel = null; say('Esa ficha no encaja'); k.sfx('hurt'); return; }
  k.sfx('click'); privPlacing();
}
function place(m) {
  const s = TRI.rate(board, m);
  board[TRI.key(m.r, m.i)] = { v: m.v, p: turn, t: 0 };
  sc[turn] += s.pts; hands[turn].splice(sel != null ? sel : m.h, 1);
  say(`${pl[turn].name} +${s.pts}${s.bonus.length ? ' · ' + s.bonus.join(' + ') : ''}`);
  k.sfx(s.bonus.length ? 'win' : 'pop'); if (s.bonus.length) { k.burst(W / 2, TY + TH / 2, '#ffe27a', 16, 120); k.shake(3); }
  sel = null; legal = []; pass = 0; draws = 0; fx = 0.25;
  if (!hands[turn].length) return over(turn);
  next();
}
function next() { turn = (turn + 1) % np; cpuT = 0; sel = null; legal = []; draws = 0; askPriv(); }
function drawOne() {
  if (draws >= 3 || !deck.length) return doPass();
  hands[turn].push(deck.pop()); sc[turn] -= 5; draws++; k.sfx('click'); say(`${pl[turn].name} roba (−5)`); askPriv();
}
function doPass() { sc[turn] -= 10; say(`${pl[turn].name} pasa (−10)`); k.sfx('hurt'); if (++pass >= np) return over(-1); next(); }
function over(win) {
  phase = 'over';
  if (k.party && k.privOK) for (let p = 0; p < np; p++) if (human(p)) k.priv(p, null);
  if (win >= 0) { let rest = 0; for (let p = 0; p < np; p++) if (p !== win) { const v = hands[p].reduce((a, t) => a + TRI.val(t), 0); sc[p] -= v; rest += v; } sc[win] += 25 + rest; k.confetti(); }
  else { let lo = 0; for (let p = 1; p < np; p++) if (hands[p].reduce((a, t) => a + TRI.val(t), 0) < hands[lo].reduce((a, t) => a + TRI.val(t), 0)) lo = p; win = lo; }
  k.best(`${CFG.id}`, sc[0]);
  let top = 0; for (let p = 1; p < np; p++) if (sc[p] > sc[top]) top = p;
  k.podium(pl.map((q, p) => ({ p: p, name: q.name, score: sc[p] })), { head: top === 0 && !k.party ? '¡Has ganado!' : `Gana ${pl[top].name}`, fmt: (v) => `${v} puntos`, go: 'Toca para otra partida' });
}
/* ---- vista del tablero ---- */
let VS = 1, VX = 0, VY = 0;
function view() {
  let r0 = 1e9, r1 = -1e9, k0 = 1e9, k1 = -1e9;
  const add = (r, i) => { r0 = Math.min(r0, r); r1 = Math.max(r1, r + 1); k0 = Math.min(k0, i); k1 = Math.max(k1, i + 2); };
  for (const key in board) { const p = key.split(','); add(+p[0], +p[1]); }
  for (const m of legal) add(m.r, m.i);
  const cw = (k1 - k0) / 2 + 0.5, ch = (r1 - r0) * SR3 + 0.4;
  VS = Math.min((W - 24) / cw, (TH - 8) / ch, 92);
  VX = (W - cw * VS) / 2 - k0 * VS / 2 + VS * 0.25;
  VY = TY + (TH - ch * VS) / 2 - r0 * VS * SR3 + VS * 0.2;
}
const PX = (i) => VX + i * VS / 2, PY = (r) => VY + r * VS * SR3;
function path(r, i) {
  c.beginPath();
  if (TRI.up(r, i)) { c.moveTo(PX(i + 1), PY(r)); c.lineTo(PX(i + 2), PY(r + 1)); c.lineTo(PX(i), PY(r + 1)); }
  else { c.moveTo(PX(i + 1), PY(r + 1)); c.lineTo(PX(i), PY(r)); c.lineTo(PX(i + 2), PY(r)); }
  c.closePath();
}
function mid(r, i) { const cs = corners(r, i); return [(cs[0][0] + cs[1][0] + cs[2][0]) / 3, (cs[0][1] + cs[1][1] + cs[2][1]) / 3]; }
/* punto dentro del triángulo (isPointInPath no sirve: el lienzo va escalado) */
function inTri(r, i, x, y) {
  const cs = corners(r, i), sgn = (a, b) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const d1 = sgn(cs[0], cs[1]), d2 = sgn(cs[1], cs[2]), d3 = sgn(cs[2], cs[0]);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
function corners(r, i) {
  return TRI.up(r, i) ? [[PX(i + 1), PY(r)], [PX(i + 2), PY(r + 1)], [PX(i), PY(r + 1)]]
                      : [[PX(i + 1), PY(r + 1)], [PX(i), PY(r)], [PX(i + 2), PY(r)]];
}
function drawCell(r, i, v, a) {
  const cs = corners(r, i), cx = (cs[0][0] + cs[1][0] + cs[2][0]) / 3, cy = (cs[0][1] + cs[1][1] + cs[2][1]) / 3;
  path(r, i); c.fillStyle = `rgba(243,236,214,${a})`; c.fill();
  c.lineWidth = Math.max(1.4, VS * 0.035); c.strokeStyle = OUT; c.stroke();
  const fs = Math.max(8, VS * 0.24);
  for (let n = 0; n < 3; n++) {
    const x = cs[n][0] + (cx - cs[n][0]) * 0.42, y = cs[n][1] + (cy - cs[n][1]) * 0.42;
    label(String(v[n]), x, y, fs, NCOL[v[n]], 'center', 'middle');
  }
}
/* ---- ficha de la mano ---- */
function handTri(x, y, w, v, on) {
  const h = w * 0.866, cx = x + w / 2, cy = y + h * 0.62;
  const cs = [[x + w / 2, y], [x + w, y + h], [x, y + h]];
  c.beginPath(); c.moveTo(cs[0][0], cs[0][1]); c.lineTo(cs[1][0], cs[1][1]); c.lineTo(cs[2][0], cs[2][1]); c.closePath();
  c.fillStyle = on ? '#fff6d8' : '#f3ecd6'; c.fill();
  c.lineWidth = on ? 3.4 : 2.2; c.strokeStyle = on ? '#ffe27a' : OUT; c.stroke();
  for (let n = 0; n < 3; n++) label(String(v[n]), cs[n][0] + (cx - cs[n][0]) * 0.36, cs[n][1] + (cy - cs[n][1]) * 0.36, w * 0.27, NCOL[v[n]], 'center', 'middle');
}
const handX = (n) => Math.round((W - (Math.min(PER, n) * (HW + 4) - 4)) / 2);
/* ---- bucle ---- */
reset();
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
k.onParty = () => { if (k.st !== 'play') reset(); };
k.show(CFG.title, CFG.help);
k.run((dt) => {
  if (msgT > 0) msgT -= dt; if (fx > 0) fx -= dt;
  if (!k.gate(reset)) return;
  if (phase === 'over') return;
  if (!human(turn)) {
    cpuT += dt; if (cpuT < 0.8) return;
    const m = TRI.ai(board, hands[turn], 0.35 + k.D.cpu * 0.5, Math.random);
    if (m) { sel = m.h; return place(m); }
    return drawOne();
  }
  /* humano: mando/teclado en la tele, toque en el móvil */
  if (legal.length) {
    const d = k.party ? k.pdir(turn) : { x: (k.hit.has('right') ? 1 : 0) - (k.hit.has('left') ? 1 : 0), y: 0 };
    if (d.x > 0) { cur = (cur + 1) % legal.length; k.sfx('click'); }
    else if (d.x < 0) { cur = (cur + legal.length - 1) % legal.length; k.sfx('click'); }
    if (k.party ? k.phit(turn, 'a') : k.hit.has('a')) return place(legal[cur]);
    if (k.party ? k.phit(turn, 'b') : k.hit.has('b')) { sel = null; legal = []; askPriv(); return; }
  } else if (k.party && k.phit(turn, 'a')) return drawOne();
  if (!k.ptr.hit) return;
  const x = k.ptr.x, y = k.ptr.y;
  if (y >= BTNY) { const bw = (W - 24) / 2; return x < 8 + bw ? drawOne() : doPass(); }
  if (!k.party && y >= HANDY) {
    const row = ROWS === 1 || y < HANDY + HH + 3 ? 0 : 1, i = row * PER + Math.floor((x - handX(hands[turn].length)) / (HW + 4));
    if (i >= 0 && i < hands[turn].length) pick(i);
    return;
  }
  if (legal.length && y >= TY && y < TY + TH) {
    for (let n = 0; n < legal.length; n++) if (inTri(legal[n].r, legal[n].i, x, y)) { cur = n; return place(legal[n]); }
    /* toque cerca: vale el hueco más próximo si está a menos de un triángulo */
    let bn = -1, bd = VS * VS;
    for (let n = 0; n < legal.length; n++) { const p2 = mid(legal[n].r, legal[n].i), d = (p2[0] - x) * (p2[0] - x) + (p2[1] - y) * (p2[1] - y); if (d < bd) { bd = d; bn = n; } }
    if (bn >= 0) { cur = bn; return place(legal[bn]); }
    sel = null; legal = [];
  }
}, () => {
  c.fillStyle = '#101a33'; c.fillRect(0, 0, W, H);
  view();
  c.fillStyle = '#16233f'; ART.rr(c, 6, TY - 2, W - 12, TH + 4, 14); c.fill();
  c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  c.save(); c.beginPath(); c.rect(6, TY - 2, W - 12, TH + 4); c.clip();
  for (const key in board) { const p = key.split(','), b = board[key]; drawCell(+p[0], +p[1], b.v, 1); }
  for (let n = 0; n < legal.length; n++) { const m = legal[n];
    path(m.r, m.i); c.fillStyle = n === cur ? 'rgba(255,226,122,.35)' : 'rgba(255,255,255,.12)'; c.fill();
    c.setLineDash([5, 4]); c.lineWidth = n === cur ? 3 : 1.6; c.strokeStyle = n === cur ? '#ffe27a' : 'rgba(255,255,255,.45)'; c.stroke(); c.setLineDash([]);
    if (n === cur) drawCell(m.r, m.i, m.v, 0.55); }
  c.restore();
  /* HUD */
  if (PORT) label(CFG.title, 10, 8, 19, '#ffe27a', 'left');
  const bw0 = (W - 20) / np;
  for (let p = 0; p < np; p++) { const bx = 10 + p * bw0, act = turn === p && phase === 'play';
    ART.rr(c, bx, 30, bw0 - 6, 22, 7); c.fillStyle = act ? ART.alpha(k.pcol(p), 0.32) : 'rgba(18,22,48,.7)'; c.fill();
    c.lineWidth = act ? 2.4 : 1.6; c.strokeStyle = act ? k.pcol(p) : 'rgba(255,255,255,.18)'; c.stroke();
    label(`${pl[p].name} ${sc[p]}`, bx + (bw0 - 6) / 2, 41, 13, act ? '#fff' : 'rgba(255,255,255,.65)', 'center', 'middle'); }
  label(`Pozo ${deck.length}`, W - 10, 8, 14, '#cfe6ff', 'right');
  /* aviso */
  const m2 = msgT > 0 ? msg : (human(turn) ? (legal.length ? 'Toca el hueco marcado' : 'Elige una ficha') : `Piensa ${pl[turn].name}…`);
  label(m2, W / 2, TY + TH + 4, 15, msgT > 0 ? '#ffe27a' : '#cfe6ff', 'center');
  /* mano */
  if (!k.party) {
    const hand = hands[0], hx = handX(hand.length);
    hand.forEach((t, i) => handTri(hx + (i % PER) * (HW + 4), HANDY + (i < PER ? 0 : 1) * (HH + 6) - (sel === i ? 5 : 0), HW, sel === i ? legal[cur] ? legal[cur].v : t : t, sel === i));
  } else {
    label(human(turn) ? 'Elige la ficha en tu móvil' : '', W / 2, HANDY + HH / 2, 16, '#cfe6ff', 'center', 'middle');
  }
  /* botones */
  const bw = (W - 24) / 2, lbl = [`Robar (${3 - draws})`, 'Pasar'], colB = ['#5b8cff', '#8a86a5'];
  for (let i = 0; i < 2; i++) { const bx = 8 + i * (bw + 8);
    ART.rr(c, bx, BTNY, bw, BTNH, 12); c.fillStyle = ART.alpha(colB[i], 0.28); c.fill(); c.lineWidth = 2.6; c.strokeStyle = colB[i]; c.stroke();
    label(lbl[i], bx + bw / 2, BTNY + BTNH / 2, 17, '#fff', 'center', 'middle'); }
});
