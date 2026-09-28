/* esquinas.js — Esquinas de Colores (estilo Blokus, marca blanca). CFG.mode: 'esquinas'
 * Reglas puras en esqrul.js (ESQ), verificadas en Node. 1–4 jugadores (tele). */
const PORT = innerHeight > innerWidth;
const W = PORT ? 480 : 820, H = PORT ? 760 : 470;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#101a33' });
const c = k.ctx, OUT = ART.OUT;
const N = 20, HUD = 56, BTNH = 42;
const BX = 8, BY = HUD + 4;
const BS = PORT ? W - 16 : Math.min(H - BY - 8 - BTNH - 8, 380);
const CS = BS / N;
const BTNY = PORT ? H - BTNH - 8 : H - BTNH - 8;
const TRX = PORT ? 8 : BX + BS + 10, TRY = PORT ? BY + BS + 8 : BY;
const TRW = PORT ? W - 16 : W - 8 - TRX, TRH = (PORT ? BTNY - 10 : BTNY - 10) - TRY;
const TB = PORT ? 48 : 44, TPER = Math.max(1, Math.floor(TRW / TB));

let g, left, pass, turn, pl, np, phase, sel, ori, ghost, cur, msg, msgT, cpuT, pieces, lastP;
const label = (t, x, y, sz, col, al, bl) => { c.save(); c.font = `700 ${sz}px system-ui,sans-serif`; c.textAlign = al || 'left'; c.textBaseline = bl || 'top';
  c.lineWidth = Math.max(2, sz * 0.22); c.strokeStyle = 'rgba(12,16,34,.85)'; c.lineJoin = 'round'; c.strokeText(t, x, y); c.fillStyle = col; c.fillText(t, x, y); c.restore(); };
const say = (t) => { msg = t; msgT = 2.4; };
const human = (p) => (k.party ? !pl[p].cpu : p === 0);
const NAMES = ESQ.PIECES.map((o, i) => `${o[0].length} casilla${o[0].length === 1 ? '' : 's'} · ${String.fromCharCode(65 + i)}`);

function reset() {
  np = 4; pl = k.players(np);
  g = ESQ.nuevo(N, np);
  left = [0, 1, 2, 3].map(() => Array.from({ length: 21 }, (_, i) => i));
  pass = [0, 0, 0, 0]; pieces = []; lastP = [-1, -1, -1, -1];
  turn = 0; phase = 'play'; sel = null; ori = 0; ghost = null; cur = [g.st[0][0], g.st[0][1]];
  msg = 'Empieza en tu esquina'; msgT = 3; cpuT = 0;
  askPriv();
}
function askPriv() {
  if (!k.party || !k.privOK || !human(turn)) return;
  k.priv(turn, { title: 'Tus piezas', text: 'Elige una pieza', items: left[turn].map((i) => ({ v: i, label: NAMES[i], sub: '' })) });
}
k.onPick = (p, v) => { if (p === turn && human(turn)) { sel = v | 0; ori = 0; ghost = null; refresh(); k.sfx('click'); } };
/* mejor colocación de la pieza elegida que cubra (cx,cy) */
function ghostAt(cx, cy) {
  if (sel == null) return null;
  const os = ESQ.PIECES[sel], ord = [ori];
  for (let o = 0; o < os.length; o++) if (o !== ori) ord.push(o);
  for (const o of ord) for (let j = 0; j < os[o].length; j++) {
    const dx = cx - os[o][j][0], dy = cy - os[o][j][1];
    const cells = os[o].map((p2) => [p2[0] + dx, p2[1] + dy]);
    if (ESQ.fits(g, turn, cells)) return { o: o, cells: cells };
  }
  return null;
}
const refresh = () => { const gh = ghostAt(cur[0], cur[1]); if (gh) { ori = gh.o; ghost = gh; } else ghost = null; };
function put(cells) {
  ESQ.play(g, { p: turn, cells: cells }); pieces.push({ p: turn, cells: cells });
  left[turn] = left[turn].filter((x) => x !== sel); lastP[turn] = sel;
  k.sfx('pop'); k.burst(BX + (cells[0][0] + 0.5) * CS, BY + (cells[0][1] + 0.5) * CS, k.pcol(turn), 8, 90);
  sel = null; ghost = null; next();
}
function next() {
  for (let n = 0; n < np; n++) {
    turn = (turn + 1) % np;
    if (!pass[turn]) { cpuT = 0; sel = null; ghost = null; cur = [g.st[turn][0], g.st[turn][1]]; askPriv(); return; }
  }
  over();
}
function doPass() { pass[turn] = 1; say(`${pl[turn].name} no puede seguir`); k.sfx('hurt'); if (pass.slice(0, np).every((v) => v)) return over(); next(); }
function over() {
  phase = 'over';
  const sc = [];
  for (let p = 0; p < np; p++) sc.push(ESQ.score(left[p], lastP[p] === 0));
  let top = 0; for (let p = 1; p < np; p++) if (sc[p] > sc[top]) top = p;
  k.best(CFG.id, sc[0]); k.confetti();
  k.podium(pl.map((q, p) => ({ p: p, name: q.name, score: sc[p] })), { head: top === 0 && !k.party ? '¡Has ganado!' : `Gana ${pl[top].name}`, fmt: (v) => `${v} puntos`, go: 'Toca para otra partida' });
}
/* ---- bucle ---- */
reset();
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
k.onParty = () => { if (k.st !== 'play') reset(); };
k.show(CFG.title, CFG.help);
k.run((dt) => {
  if (msgT > 0) msgT -= dt;
  if (!k.gate(reset)) return;
  if (phase === 'over') return;
  if (!human(turn)) {
    cpuT += dt; if (cpuT < 0.7) return;
    const m = ESQ.ai(g, turn, left[turn], 0.3 + k.D.cpu * 0.6, Math.random);
    if (!m) return doPass();
    sel = m.pi; return put(m.cells);
  }
  if (!ESQ.moves(g, turn, left[turn], 1).length) return doPass();
  /* mando y teclado */
  const d = k.party ? k.pdir(turn) : { x: (k.hit.has('right') ? 1 : 0) - (k.hit.has('left') ? 1 : 0), y: (k.hit.has('down') ? 1 : 0) - (k.hit.has('up') ? 1 : 0) };
  if (d.x || d.y) { cur = [k.clamp(cur[0] + d.x, 0, N - 1), k.clamp(cur[1] + d.y, 0, N - 1)]; refresh(); k.sfx('click'); }
  if (k.party ? k.phit(turn, 'b') : k.hit.has('b')) { rotate(); }
  if ((k.party ? k.phit(turn, 'a') : k.hit.has('a')) && ghost) return put(ghost.cells);
  if (!k.ptr.hit) return;
  const x = k.ptr.x, y = k.ptr.y;
  if (y >= BTNY) { const bw = (W - 32) / 3;
    if (x < 8 + bw) return rotate();
    if (x < 16 + bw * 2) return hint();
    return doPass(); }
  if (x >= BX && x < BX + BS && y >= BY && y < BY + BS) {
    const cx = Math.floor((x - BX) / CS), cy = Math.floor((y - BY) / CS);
    if (ghost && ghost.cells.some((p2) => p2[0] === cx && p2[1] === cy)) return put(ghost.cells);
    cur = [cx, cy]; refresh();
    if (!ghost) { say(sel == null ? 'Elige antes una pieza' : 'Ahí no cabe'); k.sfx('hurt'); }
    return;
  }
  if (!k.party && x >= TRX && x < TRX + TRW && y >= TRY && y < TRY + TRH) {
    const i = Math.floor((y - TRY) / TB) * TPER + Math.floor((x - TRX) / TB);
    if (i >= 0 && i < left[0].length) { sel = left[0][i]; ori = 0; refresh(); k.sfx('click'); }
  }
}, () => {
  c.fillStyle = '#101a33'; c.fillRect(0, 0, W, H);
  /* tablero */
  c.fillStyle = '#18254a'; ART.rr(c, BX - 3, BY - 3, BS + 6, BS + 6, 10); c.fill();
  c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 1;
  for (let i = 1; i < N; i++) { c.beginPath(); c.moveTo(BX + i * CS, BY); c.lineTo(BX + i * CS, BY + BS); c.moveTo(BX, BY + i * CS); c.lineTo(BX + BS, BY + i * CS); c.stroke(); }
  for (let p = 0; p < np; p++) if (!g.first[p]) { const s = g.st[p];
    c.fillStyle = ART.alpha(k.pcol(p), 0.3); c.fillRect(BX + s[0] * CS, BY + s[1] * CS, CS, CS); }
  for (const pc of pieces) blob(pc.cells, k.pcol(pc.p), 1);
  if (ghost) blob(ghost.cells, '#ffe27a', 0.5);
  else if (sel != null && human(turn)) { c.strokeStyle = '#ff8a9a'; c.lineWidth = 2;
    c.strokeRect(BX + cur[0] * CS + 1, BY + cur[1] * CS + 1, CS - 2, CS - 2); }
  /* HUD */
  if (PORT) label(CFG.title, 10, 8, 19, '#ffe27a', 'left');
  const bw0 = (W - 20) / np;
  for (let p = 0; p < np; p++) { const bx = 10 + p * bw0, act = turn === p && phase === 'play';
    ART.rr(c, bx, 30, bw0 - 6, 22, 7); c.fillStyle = act ? ART.alpha(k.pcol(p), 0.32) : 'rgba(18,22,48,.7)'; c.fill();
    c.lineWidth = act ? 2.4 : 1.6; c.strokeStyle = act ? k.pcol(p) : 'rgba(255,255,255,.18)'; c.stroke();
    label(`${pl[p].name} ${left[p].length}${pass[p] ? '·fuera' : ''}`, bx + (bw0 - 6) / 2, 41, 12, act ? '#fff' : 'rgba(255,255,255,.65)', 'center', 'middle'); }
  /* bandeja */
  if (!k.party) {
    left[0].forEach((pi, i) => { const bx = TRX + (i % TPER) * TB, by = TRY + Math.floor(i / TPER) * TB;
      if (by + TB > TRY + TRH) return;
      const on = sel === pi;
      ART.rr(c, bx + 1, by + 1, TB - 3, TB - 3, 6); c.fillStyle = on ? 'rgba(255,226,122,.2)' : 'rgba(255,255,255,.05)'; c.fill();
      c.lineWidth = on ? 2.2 : 1; c.strokeStyle = on ? '#ffe27a' : 'rgba(255,255,255,.16)'; c.stroke();
      const cs = ESQ.PIECES[pi][0]; let mw = 1, mh = 1;
      for (const p2 of cs) { mw = Math.max(mw, p2[0] + 1); mh = Math.max(mh, p2[1] + 1); }
      const u = Math.min((TB - 12) / mw, (TB - 12) / mh), ox = bx + (TB - 2 - mw * u) / 2, oy = by + (TB - 2 - mh * u) / 2;
      c.fillStyle = k.pcol(0);
      for (const p2 of cs) c.fillRect(ox + p2[0] * u + 0.5, oy + p2[1] * u + 0.5, u - 1, u - 1); });
  } else label(human(turn) ? 'Elige la pieza en tu móvil' : '', TRX + TRW / 2, TRY + TRH / 2, 16, '#cfe6ff', 'center', 'middle');
  /* aviso */
  const m2 = msgT > 0 ? msg : (human(turn) ? (sel == null ? 'Elige una pieza' : 'Toca donde quieras ponerla') : `Piensa ${pl[turn].name}…`);
  label(m2, PORT ? W / 2 : TRX + TRW / 2, BTNY - 22, 15, msgT > 0 ? '#ffe27a' : '#cfe6ff', 'center');
  /* botones */
  const bw = (W - 32) / 3, lbl = ['Girar', 'Pista', 'Paso'], colB = ['#5b8cff', '#a8cf3f', '#8a86a5'];
  for (let i = 0; i < 3; i++) { const bx = 8 + i * (bw + 8);
    ART.rr(c, bx, BTNY, bw, BTNH, 12); c.fillStyle = ART.alpha(colB[i], 0.28); c.fill(); c.lineWidth = 2.6; c.strokeStyle = colB[i]; c.stroke();
    label(lbl[i], bx + bw / 2, BTNY + BTNH / 2, 17, '#fff', 'center', 'middle'); }
});
/* una pieza = un trazo: relleno de todas sus casillas y contorno solo por fuera */
function blob(cells, col, a) {
  const has = (x, y) => cells.some((p2) => p2[0] === x && p2[1] === y);
  c.globalAlpha = a; c.fillStyle = col;
  for (const p2 of cells) c.fillRect(BX + p2[0] * CS, BY + p2[1] * CS, CS + 0.5, CS + 0.5);
  c.globalAlpha = 1; c.beginPath();
  for (const p2 of cells) { const x = BX + p2[0] * CS, y = BY + p2[1] * CS;
    if (!has(p2[0], p2[1] - 1)) { c.moveTo(x, y); c.lineTo(x + CS, y); }
    if (!has(p2[0], p2[1] + 1)) { c.moveTo(x, y + CS); c.lineTo(x + CS, y + CS); }
    if (!has(p2[0] - 1, p2[1])) { c.moveTo(x, y); c.lineTo(x, y + CS); }
    if (!has(p2[0] + 1, p2[1])) { c.moveTo(x + CS, y); c.lineTo(x + CS, y + CS); } }
  c.lineWidth = Math.max(1.4, CS * 0.13); c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke();
}
function rotate() {
  if (sel == null) { say('Elige antes una pieza'); return; }
  const os = ESQ.PIECES[sel]; ori = (ori + 1) % os.length; k.sfx('click');
  const gh = ghostAt(cur[0], cur[1]); ghost = gh && gh.o === ori ? gh : null;
  if (!ghost) { /* con esa vuelta no cabe aquí: se prueba el resto al tocar */ }
}
function hint() {
  const ms = ESQ.moves(g, turn, left[turn], 400);
  if (!ms.length) return doPass();
  let best = ms[0], bv = -1e9;
  for (const m of ms) { const v = ESQ.rate(g, m, left[turn]); if (v > bv) { bv = v; best = m; } }
  sel = best.pi; ori = best.o; cur = [best.cells[0][0], best.cells[0][1]]; ghost = { o: best.o, cells: best.cells };
  say('Prueba aquí'); k.sfx('coin');
}
