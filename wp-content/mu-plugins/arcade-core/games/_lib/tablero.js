/* tablero.js — juegos de recorrido con dados y fichas. CFG.mode: 'parchis' | 'expres' | 'oca'
 * Reglas (TAB, puras y comprobables en Node con module.exports):
 *  Parchís (reglas españolas): 68 casillas, 12 seguros (salidas incluidas), pasillo de 7 + meta con entrada exacta.
 *   Sale con 5 (obligatorio si puede; si en la salida hay 2 fichas y alguna es rival, come la última en llegar).
 *   Máx. 2 fichas por casilla; dos del mismo color forman barrera (nadie la cruza). Con 6 hay que abrir barrera si se puede.
 *   Comer (fuera de seguros) cuenta 20; llegar a meta cuenta 10 (con una sola ficha, la que se pueda). 6 repite;
 *   con todas las fichas fuera de casa el 6 cuenta 7 (variante elegida en «Parchís de la Plaza»). Tres 6 seguidos:
 *   la última ficha movida vuelve a casa (salvo si está en el pasillo o en meta) y se acaba el turno.
 *  Exprés: 2 fichas por jugador (una ya en la salida), dos dados; cada dado mueve una ficha, sale con un 5 o con
 *   dados que sumen 5; los dobles repiten y obligan a abrir barrera; tres dobles: la última ficha movida vuelve a casa.
 *  Oca: 63 casillas en espiral; de oca a oca y tiro; puentes 6↔12 y dados 26↔53 (y tiro); posada 19 (1 turno);
 *   pozo 31 (hasta que otro caiga); laberinto 42 → 30; cárcel 56 (2 turnos); calavera 58 → 1; entrada exacta en
 *   la 63 rebotando (si el rebote cae en oca, retrocede a la oca anterior y tira). */
const TAB = (() => {
  const SAFE = new Set(); for (let a = 0; a < 4; a++) for (const o of [4, 11, 16]) SAFE.add((17 * a + o) % 68);
  const END = 71, LAST = 63;
  const VAR = { parchis: { np: 4, dice: 1, six7: true, out: 0 }, expres: { np: 2, dice: 2, six7: false, out: 1 } };
  function newP(mode, seats) { const o = VAR[mode]; return { mode, o, seats, n: seats.length, pcs: seats.map(() => Array.from({ length: o.np }, (_, i) => ({ r: i < o.out ? 0 : -1, ts: 0 }))), cur: 0, pend: [], rolls: 0, again: false, force: false, last: null, winner: -1, clock: 0, turns: 0 }; }
  const tIdx = (S, p, r) => (17 * S.seats[p] + 4 + r) % 68;
  const key = (S, p, r) => (r < 0 || r >= END ? null : r <= LAST ? 't' + tIdx(S, p, r) : 'c' + p + '.' + (r - 64));
  function occ(S) { const M = new Map(); S.pcs.forEach((a, p) => a.forEach((pc, i) => { const kk = key(S, p, pc.r); if (!kk) return; if (!M.has(kk)) M.set(kk, []); M.get(kk).push({ p, i, ts: pc.ts }); })); for (const L of M.values()) L.sort((x, y) => x.ts - y.ts); return M; }
  const bar = (L) => !!L && L.length === 2 && L[0].p === L[1].p;
  const safeKey = (kk) => kk[0] === 't' && SAFE.has(+kk.slice(1));
  function stepMove(S, M, p, i, v) {
    const r = S.pcs[p][i].r; if (r < 0 || r >= END) return null; const t = r + v; if (t > END) return null;
    for (let s = r + 1; s < t; s++) if (bar(M.get(key(S, p, s)))) return null;
    const m = { p, i, from: r, to: t, v }; if (t === END) return m;
    const kk = key(S, p, t), L = M.get(kk) || [];
    if (L.length >= 2) return null;
    if (L.length === 1 && L[0].p !== p && !safeKey(kk)) m.cap = { p: L[0].p, i: L[0].i };
    return m;
  }
  function exitMove(S, M, p) {
    const i = S.pcs[p].findIndex((pc) => pc.r < 0); if (i < 0) return null;
    const L = M.get(key(S, p, 0)) || [], m = { p, i, from: -1, to: 0, v: 5, exit: true };
    if (L.length >= 2) { const opp = L.filter((q) => q.p !== p); if (!opp.length) return null; const q = opp[opp.length - 1]; m.cap = { p: q.p, i: q.i }; }
    return m;
  }
  function legal(S) {
    const p = S.cur, P = S.pend; if (!P.length || S.winner >= 0) return [];
    const M = occ(S), out = [];
    if (P[0].t === 'b') { for (let i = 0; i < S.pcs[p].length; i++) { const m = stepMove(S, M, p, i, P[0].v); if (m) { m.use = [0]; m.bonus = true; out.push(m); } } return out; }
    if (S.pcs[p].some((pc) => pc.r < 0)) { const ex = exitMove(S, M, p); if (ex) {
      const five = P.findIndex((d) => d.raw === 5);
      if (five >= 0) return [Object.assign(ex, { use: [five] })];
      if (P.length === 2 && P[0].raw + P[1].raw === 5) return [Object.assign(ex, { use: [0, 1] })];
    } }
    P.forEach((d, j) => { if (j === 1 && P[0].v === d.v) return; for (let i = 0; i < S.pcs[p].length; i++) { const m = stepMove(S, M, p, i, d.v); if (m) { m.use = [j]; out.push(m); } } });
    if (S.force) { const bs = out.filter((m) => m.from >= 0 && bar(M.get(key(S, p, m.from)))); if (bs.length) return bs; }
    return out;
  }
  function roll(S, vals) {
    S.turns++; const dbl = S.o.dice === 2 ? vals[0] === vals[1] : vals[0] === 6, ev = { vals };
    if (dbl) S.rolls++;
    if (dbl && S.rolls >= 3) {
      const l = S.last; ev.three = true;
      if (l && S.pcs[l.p][l.i].r >= 0 && S.pcs[l.p][l.i].r <= LAST) { const pc = S.pcs[l.p][l.i]; ev.burn = { p: l.p, i: l.i, from: pc.r }; pc.r = -1; pc.ts = 0; }
      S.pend = []; S.again = false; S.force = false; return ev;
    }
    S.again = dbl; S.force = dbl;
    const home = S.pcs[S.cur].some((pc) => pc.r < 0);
    S.pend = vals.map((v, j) => ({ v: v === 6 && S.o.six7 && !home ? 7 : v, raw: v, t: 'd', j }));
    return ev;
  }
  function apply(S, m) {
    const pc = S.pcs[m.p][m.i], ev = { m };
    pc.r = m.to; pc.ts = ++S.clock;
    m.use.slice().sort((a, b) => b - a).forEach((j) => S.pend.splice(j, 1));
    S.last = { p: m.p, i: m.i };
    if (m.cap) { const v = S.pcs[m.cap.p][m.cap.i]; ev.capFrom = v.r; v.r = -1; v.ts = 0; S.pend.unshift({ v: 20, t: 'b' }); }
    if (m.to === END) { if (S.pcs[m.p].every((q) => q.r === END)) { S.winner = m.p; S.pend = []; } else S.pend.unshift({ v: 10, t: 'b' }); }
    return ev;
  }
  /* Descarta lo que no se puede mover (un premio sin jugada se pierde); true si queda algo que jugar. */
  function settle(S) { while (S.pend.length) { if (legal(S).length) return true; if (S.pend[0].t === 'b') S.pend.shift(); else S.pend = S.pend.filter((d) => d.t === 'b'); } return false; }
  /* Fin de la jugada: true si pasa el turno, false si el mismo jugador repite. */
  function endTurn(S) { if (S.again && S.winner < 0) { S.again = false; return false; } S.cur = (S.cur + 1) % S.n; S.rolls = 0; S.last = null; S.again = false; S.force = false; return true; }
  const pscore = (S, p) => S.pcs[p].reduce((s, pc) => s + (pc.r === END ? 1000 : 0) + pc.r + 1, 0);
  /* IA por reglas: come, se protege en seguros, huye de amenazas, entra en el pasillo, forma barreras. lvl 0..3 = menos despistes. */
  function threat(S, p, t) { let n = 0; S.pcs.forEach((a, q) => { if (q === p) return; a.forEach((pc) => { if (pc.r < 0 || pc.r > LAST) return; const d = (t - tIdx(S, q, pc.r) + 68) % 68; if (d >= 1 && d <= 7 && pc.r + d <= LAST) n += d <= 6 ? 1 : 0.4; }); }); return n; }
  function aiPick(S, moves, lvl, rnd) {
    const p = S.cur, M = occ(S), noise = [30, 16, 7, 2][Math.max(0, Math.min(3, lvl | 0))]; let best = moves[0], bv = -1e9;
    for (const m of moves) {
      let s = m.v * 0.35;
      if (m.exit) s += 30;
      if (m.cap) s += 55 + Math.max(0, S.pcs[m.cap.p][m.cap.i].r) * 0.4;
      if (m.to === END) s += 50;
      if (m.from <= LAST && m.to > LAST) s += 22 + m.from * 0.2;
      if (m.to <= LAST) { const ti = tIdx(S, p, m.to), L = (M.get('t' + ti) || []).filter((q) => !(q.p === p && q.i === m.i));
        if (L.some((q) => q.p === p)) s += 10 + threat(S, p, ti) * 4; else if (SAFE.has(ti)) s += 8; else s -= threat(S, p, ti) * (10 + m.to * 0.35); }
      if (m.from >= 0 && m.from <= LAST) { const fi = tIdx(S, p, m.from); if (SAFE.has(fi)) s -= 4; else s += threat(S, p, fi) * (9 + m.from * 0.3); if (bar(M.get('t' + fi))) s -= 6; }
      s += (rnd() - 0.5) * noise;
      if (s > bv) { bv = s; best = m; }
    }
    return best;
  }
  /* ---- La Oca ---- */
  const OCAS = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59, 63];
  function newO(n) { return { n, pos: Array(n).fill(0), skip: Array(n).fill(0), pozo: -1, cur: 0, winner: -1, again: false, turns: 0 }; }
  function ocaStart(S) { const p = S.cur; if (S.skip[p] > 0) { S.skip[p]--; return 'skip'; } if (S.pozo === p) return 'pozo'; return 'roll'; }
  function ocaRoll(S, d) {
    const p = S.cur, from = S.pos[p]; let t = from + d, bounce = false; const path = [];
    for (let s = from + 1; s <= Math.min(t, 63); s++) path.push(s);
    if (t > 63) { bounce = true; t = 126 - t; for (let s = 62; s >= t; s--) path.push(s); }
    S.pos[p] = t; S.turns++;
    const ev = { p, d, from, path, land: t, bounce }; let again = false, to = t;
    if (t === 63) S.winner = p;
    else if (OCAS.includes(t)) { to = bounce ? OCAS.filter((o) => o < t).pop() : OCAS.find((o) => o > t); again = true; ev.fx = 'oca'; }
    else if (t === 6 || t === 12) { to = t === 6 ? 12 : 6; again = true; ev.fx = 'puente'; }
    else if (t === 26 || t === 53) { to = t === 26 ? 53 : 26; again = true; ev.fx = 'dados'; }
    else if (t === 19) { S.skip[p] = 1; ev.fx = 'posada'; }
    else if (t === 56) { S.skip[p] = 2; ev.fx = 'carcel'; }
    else if (t === 31) { ev.fx = 'pozo'; if (S.pozo >= 0 && S.pozo !== p) ev.freed = S.pozo; S.pozo = p; }
    else if (t === 42) { to = 30; ev.fx = 'laberinto'; }
    else if (t === 58) { to = 1; ev.fx = 'muerte'; }
    if (to !== t) { S.pos[p] = to; ev.to = to; if (to === 63) S.winner = p; }
    S.again = again && S.winner < 0; return ev;
  }
  function ocaEnd(S) { if (S.again && S.winner < 0) { S.again = false; return false; } S.cur = (S.cur + 1) % S.n; return true; }
  return { SAFE, END, LAST, VAR, OCAS, newP, tIdx, key, occ, bar, legal, roll, apply, settle, endTurn, pscore, threat, aiPick, newO, ocaStart, ocaRoll, ocaEnd };
})();
if (typeof module === 'object' && module.exports) module.exports = TAB;
else (function () {
  /* ================= Interfaz ================= */
  const MODE = CFG.mode || 'parchis', OCA = MODE === 'oca', TWO = MODE === 'expres', PORT = innerHeight > innerWidth;
  const W = PORT ? 600 : 960, H = PORT ? 920 : 600;
  const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1d1533' }), c = k.ctx, OUT = ART.OUT, TAU = Math.PI * 2;
  const BS = PORT ? 584 : 572, BX = PORT ? 8 : 14, BY = PORT ? 8 : 14, CX = BX + BS / 2, CY = BY + BS / 2;
  const PX = PORT ? 10 : BX + BS + 16, PY = PORT ? BY + BS + 12 : 14, PW = PORT ? W - 20 : W - PX - 12, PH = PORT ? H - PY - 10 : H - 28;
  const FONT = (wt, s) => `${wt} ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  const LK = 'cpu:' + (CFG.id || MODE);
  let lvl = 0; try { lvl = +localStorage.getItem(LK) || 0; } catch (e) { /* sin almacenamiento */ }
  let S = null, pl = [], n = 4, nSel = 4, phase = 'demo', moves = [], sel = 0, timer = 0, msg = '', sub = '', T = 0, queue = [], dice = { vals: TWO ? [5, 3] : [5], t: 0, rot: 0 }, hideP = null, ending = 0;
  const SPEED = { v: 1 };
  const seatsOf = (m) => (m === 2 ? [0, 2] : m === 3 ? [0, 1, 2] : [0, 1, 2, 3]);
  const NEUTRAL = '#b8ae9c';

  /* ---------- Geometría del parchís (brazos 3×8, casillas alargadas, centro 3×3) ---------- */
  const B = BS / 22, A = 2 * B, HA = 1.5 * A, HC = BS / 2, R = B * 0.46;
  const rot = (a, x, y) => { for (let q = 0; q < a; q++) [x, y] = [y, -x]; return [CX + x, CY + y]; };
  const armCell = (c0, j) => [-HA + c0 * A, HA + j * B, A, B]; // x, y, w, h en el marco del brazo inferior
  function trackACJ(idx) { const q = (idx + 9) % 68, a = Math.floor(q / 17), off = q - 17 * a; return off < 8 ? [a, 0, off] : off === 8 ? [a, 1, 7] : [a, 2, 16 - off]; }
  function cellPoly(a, c0, j) { const [x, y, w, h] = armCell(c0, j); return [rot(a, x, y), rot(a, x + w, y), rot(a, x + w, y + h), rot(a, x, y + h)]; }
  function cellCenter(a, c0, j, slot) { const [x, y, w, h] = armCell(c0, j); return rot(a, x + w / 2 + (slot < 0 ? 0 : (slot ? 1 : -1) * A * 0.25), y + h / 2); }
  const seatOf = (p) => S.seats[p];
  function posR(p, r, slot) {
    if (r <= TAB.LAST) { const [a, c0, j] = trackACJ(TAB.tIdx(S, p, r)); return cellCenter(a, c0, j, slot); }
    return cellCenter(seatOf(p), 1, 6 - (r - 64), slot);
  }
  function homePos(p, i) { const a = seatOf(p), m = (HA + HC) / 2, d = (HC - HA) * 0.2, sl = [[-1, -1], [1, -1], [-1, 1], [1, 1]][i % 4]; return rot(a, m + sl[0] * d, m + sl[1] * d); }
  function metaPos(p, i) { const np = S.o.np; return rot(seatOf(p), (i - (np - 1) / 2) * A * (np > 2 ? 0.46 : 0.55), HA * 0.6); }
  function piecePos(p, i, M) {
    const r = S.pcs[p][i].r; if (r < 0) return homePos(p, i); if (r === TAB.END) return metaPos(p, i);
    const L = M.get(TAB.key(S, p, r)) || []; return posR(p, r, L.length === 2 ? L.findIndex((q) => q.p === p && q.i === i) : -1);
  }

  /* ---------- Geometría de la oca (espiral 8×8: 0 = salida, 63 = jardín) ---------- */
  const G = BS / 8, SP = (() => { const out = []; let x0 = 0, y0 = 0, x1 = 7, y1 = 7;
    while (out.length < 64) { for (let x = x0; x <= x1; x++) out.push([x, y1]); y1--; for (let y = y1; y >= y0; y--) out.push([x1, y]); x1--; for (let x = x1; x >= x0; x--) out.push([x, y0]); y0++; for (let y = y0; y <= y1; y++) out.push([x0, y]); x0++; }
    return out.slice(0, 64); })();
  const ocaXY = (s) => [BX + SP[s][0] * G + G / 2, BY + SP[s][1] * G + G / 2];
  function ocaSlot(s, p, cnt, idx) { const [x, y] = ocaXY(s); if (cnt <= 1) return [x, y + G * 0.08]; const o = [[-1, -1], [1, -1], [-1, 1], [1, 1]][idx]; return [x + o[0] * G * 0.2, y + o[1] * G * 0.17 + G * 0.1]; }
  function ocaPos(p) { const s = S.pos[p], same = []; for (let q = 0; q < S.n; q++) if (S.pos[q] === s) same.push(q); return ocaSlot(s, p, same.length, same.indexOf(p)); }
  const OCA_T = {}; TAB.OCAS.forEach((o) => (OCA_T[o] = 'oca')); Object.assign(OCA_T, { 6: 'puente', 12: 'puente', 19: 'posada', 26: 'dados', 53: 'dados', 31: 'pozo', 42: 'laberinto', 56: 'carcel', 58: 'muerte', 63: 'jardin', 0: 'salida' });
  const OCA_C = { oca: '#8fd3ff', puente: '#e2b67a', posada: '#ffc56b', dados: '#f4f0ff', pozo: '#9fb0c4', laberinto: '#a6e08a', carcel: '#b8b0cc', muerte: '#4a3c5c', jardin: '#ffd166', salida: '#c4f0b8' };
  const OCA_TXT = { oca: 'De oca a oca y tiro porque me toca', puente: 'De puente a puente y tiro porque me lleva la corriente', dados: 'De dado a dado y tiro porque me ha tocado', posada: 'Posada: pierde 1 turno', carcel: 'Cárcel: pierde 2 turnos', pozo: 'Pozo: espera a que otro caiga', laberinto: 'Laberinto: vuelve a la 30', muerte: 'Calavera: vuelve a la casilla 1' };

  /* ---------- Dibujo: fichas, dados, tablero ---------- */
  function token(x, y, r, col, lift, ring) {
    ART.shadow(c, x, y + r * 0.72, r * 0.95, 0.3);
    y -= lift || 0;
    c.beginPath(); c.ellipse(x, y + r * 0.22, r, r * 0.92, 0, 0, TAU); c.fillStyle = ART.dark(col, 0.35); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05); g.addColorStop(0, ART.lite(col, 0.45)); g.addColorStop(1, col);
    c.beginPath(); c.arc(x, y, r * 0.92, 0, TAU); c.fillStyle = g; c.fill(); c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(x, y, r * 0.55, 0, TAU); c.lineWidth = 1.5; c.strokeStyle = ART.alpha(OUT, 0.35); c.stroke();
    ART.glint(c, x - r * 0.35, y - r * 0.38, r * 0.2);
    if (ring) { c.beginPath(); c.arc(x, y, r * 1.28 + Math.sin(T * 7) * 1.5, 0, TAU); c.lineWidth = 3; c.strokeStyle = ring; c.stroke(); }
  }
  function pawn(x, y, s, col, lift, ring) {
    ART.shadow(c, x, y + s * 0.05, s * 0.42, 0.3); y -= lift || 0;
    const g = c.createLinearGradient(x - s * 0.4, 0, x + s * 0.4, 0); g.addColorStop(0, ART.lite(col, 0.35)); g.addColorStop(1, ART.dark(col, 0.2));
    c.beginPath(); c.ellipse(x, y - s * 0.06, s * 0.38, s * 0.14, 0, 0, TAU); ART.fillOut(c, ART.dark(col, 0.15), 2);
    c.beginPath(); c.moveTo(x - s * 0.3, y - s * 0.1); c.quadraticCurveTo(x - s * 0.12, y - s * 0.45, x - s * 0.1, y - s * 0.62); c.lineTo(x + s * 0.1, y - s * 0.62); c.quadraticCurveTo(x + s * 0.12, y - s * 0.45, x + s * 0.3, y - s * 0.1); c.closePath(); ART.fillOut(c, g, 2);
    c.beginPath(); c.arc(x, y - s * 0.74, s * 0.19, 0, TAU); ART.fillOut(c, g, 2); ART.glint(c, x - s * 0.07, y - s * 0.8, s * 0.06);
    if (ring) { c.beginPath(); c.ellipse(x, y - s * 0.06, s * 0.52 + Math.sin(T * 7) * 1.5, s * 0.22, 0, 0, TAU); c.lineWidth = 3; c.strokeStyle = ring; c.stroke(); }
  }
  const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  function die(x, y, s, v, ang, dim, glow) {
    c.save(); c.translate(x, y); c.rotate(ang || 0); c.globalAlpha = dim ? 0.35 : 1;
    if (glow) { c.shadowColor = glow; c.shadowBlur = 18; }
    ART.rr(c, -s / 2, -s / 2 + 4, s, s, s * 0.2); c.fillStyle = OUT; c.fill(); c.shadowBlur = 0;
    ART.rr(c, -s / 2, -s / 2, s, s, s * 0.2); const g = c.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e4dcf2'); ART.fillOut(c, g, 2.5);
    c.fillStyle = v === 1 ? '#e0344a' : '#231a3a'; for (const [a, b] of PIPS[Math.max(1, Math.min(6, v))]) { c.beginPath(); c.arc(a * s * 0.25, b * s * 0.25, s * 0.09, 0, TAU); c.fill(); }
    c.restore();
  }
  let boardCv = null, boardKey = '';
  function boardCanvas() {
    const res = Math.min(3, Math.max(1, k.scale * (devicePixelRatio || 1))), kk = res + '|' + (S && S.seats ? S.seats.join() + pl.map((q) => q.color).join() : '') + MODE;
    if (boardCv && boardKey === kk) return boardCv;
    boardKey = kk; boardCv = document.createElement('canvas'); boardCv.width = Math.ceil(W * res); boardCv.height = Math.ceil(H * res);
    const g0 = boardCv.getContext('2d'); g0.scale(res, res); (OCA ? ocaBoard : parBoard)(g0); return boardCv;
  }
  const colSeat = (a) => { if (!S) return NEUTRAL; const p = S.seats ? S.seats.indexOf(a) : -1; return p >= 0 ? k.pcol(p) : NEUTRAL; };
  function poly(g, P, fill, lw, stroke) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let q = 1; q < P.length; q++) g.lineTo(P[q][0], P[q][1]); g.closePath(); g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = stroke || OUT; g.stroke(); } }
  function parBoard(g) {
    g.lineJoin = 'round';
    ART.rr(g, BX - 6, BY - 2, BS + 12, BS + 12, 22); g.fillStyle = OUT; g.fill();
    ART.rr(g, BX - 6, BY - 6, BS + 12, BS + 12, 22); const wd = g.createLinearGradient(BX, BY, BX + BS, BY + BS); wd.addColorStop(0, '#c98a4b'); wd.addColorStop(1, '#8f5a2c'); g.fillStyle = wd; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    ART.rr(g, BX, BY, BS, BS, 14); g.fillStyle = '#f6ecd4'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
    for (let a = 0; a < 4; a++) {
      const col = colSeat(a), P = [rot(a, HA, HA), rot(a, HC, HA), rot(a, HC, HC), rot(a, HA, HC)];
      const xs = P.map((q) => q[0]), ys = P.map((q) => q[1]), x0 = Math.min(...xs) + 4, y0 = Math.min(...ys) + 4, sz = HC - HA - 8;
      ART.rr(g, x0, y0, sz, sz, 16); const hg = g.createLinearGradient(x0, y0, x0 + sz, y0 + sz); hg.addColorStop(0, ART.lite(col, 0.15)); hg.addColorStop(1, ART.dark(col, 0.12)); g.fillStyle = hg; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
      const mx = x0 + sz / 2, my = y0 + sz / 2; g.beginPath(); g.arc(mx, my, sz * 0.36, 0, TAU); g.fillStyle = ART.lite(col, 0.6); g.fill(); g.lineWidth = 2; g.stroke();
      for (let i = 0; i < 4; i++) { const [hx, hy] = rot(a, (HA + HC) / 2 + [-1, 1, -1, 1][i] * (HC - HA) * 0.2, (HA + HC) / 2 + [-1, -1, 1, 1][i] * (HC - HA) * 0.2); g.beginPath(); g.arc(hx, hy, R * 1.15, 0, TAU); g.fillStyle = ART.alpha(ART.dark(col, 0.3), 0.35); g.fill(); }
      for (let j = 0; j < 8; j++) for (let c0 = 0; c0 < 3; c0++) {
        const P2 = cellPoly(a, c0, j); let fill = '#fffaf0';
        if (c0 === 1 && j < 7) fill = ART.lite(col, 0.25);
        poly(g, P2, fill, 1.6, ART.alpha(OUT, 0.7));
      }
      // triángulo de meta
      poly(g, [rot(a, -HA, HA), rot(a, HA, HA), [CX, CY]], col, 2.5);
      const tg = g.createLinearGradient(...rot(a, 0, HA), CX, CY); tg.addColorStop(0, 'rgba(255,255,255,.25)'); tg.addColorStop(1, 'rgba(0,0,0,.12)'); poly(g, [rot(a, -HA, HA), rot(a, HA, HA), [CX, CY]], tg, 0);
    }
    for (let idx = 0; idx < 68; idx++) { const [a, c0, j] = trackACJ(idx), sal = [4, 21, 38, 55].indexOf(idx), P2 = cellPoly(a, c0, j);
      if (sal >= 0) poly(g, P2, ART.lite(colSeat(sal), 0.35), 1.6, ART.alpha(OUT, 0.7));
      if (TAB.SAFE.has(idx)) { const [x, y] = cellCenter(a, c0, j, -1); g.beginPath(); g.arc(x, y, B * 0.3, 0, TAU); g.fillStyle = sal >= 0 ? ART.dark(colSeat(sal), 0.1) : '#c9bfae'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = ART.alpha(OUT, 0.6); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); for (let q = 0; q < 10; q++) { const rr = q % 2 ? B * 0.1 : B * 0.22, an = -Math.PI / 2 + q * Math.PI / 5; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } g.fill(); }
    }
    g.beginPath(); g.arc(CX, CY, A * 0.36, 0, TAU); ART.fillOut(g, '#fff7e0', 2.5);
    g.fillStyle = '#c58a2e'; g.font = FONT(900, Math.round(A * 0.34)); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', CX, CY + 1);
  }
  function ocaBoard(g) {
    g.lineJoin = 'round';
    ART.rr(g, BX - 6, BY - 2, BS + 12, BS + 12, 22); g.fillStyle = OUT; g.fill();
    ART.rr(g, BX - 6, BY - 6, BS + 12, BS + 12, 22); const gr = g.createLinearGradient(BX, BY, BX, BY + BS); gr.addColorStop(0, '#79c35a'); gr.addColorStop(1, '#4e9a3c'); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    for (let q = 0; q < 40; q++) { const x = BX + ((q * 97) % BS), y = BY + ((q * 61 + 13) % BS); g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(x, y, 3 + (q % 4), 0, TAU); g.fill(); }
    g.beginPath(); for (let s = 0; s < 64; s++) { const [x, y] = ocaXY(s); s ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineWidth = G * 0.5; g.strokeStyle = '#d8b884'; g.stroke(); g.lineWidth = G * 0.5 - 6; g.strokeStyle = '#ecd3a4'; g.stroke();
    for (let s = 0; s < 64; s++) {
      const [x, y] = ocaXY(s), ty = OCA_T[s], sz = G - 6, x0 = x - sz / 2, y0 = y - sz / 2;
      ART.rr(g, x0, y0 + 3, sz, sz, 10); g.fillStyle = OUT; g.fill();
      ART.rr(g, x0, y0, sz, sz, 10); const base = OCA_C[ty] || (s % 2 ? '#fff6dc' : '#ffefc9'), tg = g.createLinearGradient(x0, y0, x0, y0 + sz); tg.addColorStop(0, ART.lite(base, 0.25)); tg.addColorStop(1, base); g.fillStyle = tg; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
      if (ty) icon(g, ty, x, y + 3, sz * 0.62);
      if (s) { g.font = FONT(900, Math.round(G * 0.22)); g.textAlign = 'left'; g.textBaseline = 'top'; g.lineWidth = 3; g.strokeStyle = ty === 'muerte' ? '#000' : '#fff'; g.strokeText(String(s), x0 + 5, y0 + 3); g.fillStyle = ty === 'muerte' ? '#fff' : '#3a2b4f'; g.fillText(String(s), x0 + 5, y0 + 3); }
      else { g.font = FONT(900, Math.round(G * 0.2)); g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#2f5b25'; g.fillText('SALIDA', x, y0 + 4); }
    }
  }
  function goose(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s / 40, s / 40);
    g.beginPath(); g.ellipse(-2, 8, 15, 10, 0.1, 0, TAU); ART.fillOut(g, '#ffffff', 2.4);
    g.beginPath(); g.moveTo(8, 4); g.quadraticCurveTo(14, -4, 9, -14); g.lineTo(14, -16); g.quadraticCurveTo(20, -4, 13, 8); g.closePath(); ART.fillOut(g, '#ffffff', 2.4);
    g.beginPath(); g.arc(11.5, -15, 5.5, 0, TAU); ART.fillOut(g, '#ffffff', 2.2);
    g.beginPath(); g.moveTo(16, -16); g.lineTo(23, -13); g.lineTo(16, -11.5); g.closePath(); ART.fillOut(g, '#ff9a2e', 1.6);
    g.fillStyle = OUT; g.beginPath(); g.arc(12.5, -16.5, 1.4, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-12, 6); g.quadraticCurveTo(-4, 2, 2, 8); g.lineWidth = 1.6; g.stroke();
    g.restore();
  }
  function icon(g, ty, x, y, s) {
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    if (ty === 'oca') goose(g, x, y, s);
    else if (ty === 'jardin') { for (let q = 0; q < 6; q++) { const an = q * TAU / 6; g.beginPath(); g.arc(x + Math.cos(an) * s * 0.42, y + Math.sin(an) * s * 0.36, s * 0.08, 0, TAU); ART.fillOut(g, ['#ff6f8a', '#ffffff', '#b98cff'][q % 3], 1.5); } goose(g, x, y, s * 0.9); }
    else if (ty === 'puente') { g.beginPath(); g.moveTo(x - s * 0.5, y + s * 0.2); g.quadraticCurveTo(x, y - s * 0.45, x + s * 0.5, y + s * 0.2); g.lineTo(x + s * 0.5, y + s * 0.34); g.quadraticCurveTo(x, y - s * 0.25, x - s * 0.5, y + s * 0.34); g.closePath(); ART.fillOut(g, '#9c6634', 2); g.beginPath(); g.moveTo(x - s * 0.5, y + s * 0.42); g.quadraticCurveTo(x - s * 0.25, y + s * 0.34, x, y + s * 0.42); g.quadraticCurveTo(x + s * 0.25, y + s * 0.5, x + s * 0.5, y + s * 0.42); g.lineWidth = 2.5; g.strokeStyle = '#3fb6ea'; g.stroke(); }
    else if (ty === 'posada') { g.beginPath(); g.rect(x - s * 0.32, y - s * 0.05, s * 0.64, s * 0.42); ART.fillOut(g, '#fff3d6', 2); g.beginPath(); g.moveTo(x - s * 0.45, y - s * 0.02); g.lineTo(x, y - s * 0.42); g.lineTo(x + s * 0.45, y - s * 0.02); g.closePath(); ART.fillOut(g, '#d9483b', 2); g.beginPath(); g.rect(x - s * 0.08, y + s * 0.12, s * 0.16, s * 0.25); ART.fillOut(g, '#8a5a2b', 1.6); }
    else if (ty === 'pozo') { g.beginPath(); g.ellipse(x, y + s * 0.2, s * 0.36, s * 0.14, 0, 0, TAU); ART.fillOut(g, '#2b3550', 2); g.beginPath(); g.rect(x - s * 0.36, y + s * 0.2, s * 0.72, s * 0.2); ART.fillOut(g, '#8b95a6', 2); g.lineWidth = 2.5; g.strokeStyle = OUT; g.beginPath(); g.moveTo(x - s * 0.3, y + s * 0.2); g.lineTo(x - s * 0.3, y - s * 0.3); g.lineTo(x + s * 0.3, y - s * 0.3); g.lineTo(x + s * 0.3, y + s * 0.2); g.stroke(); g.beginPath(); g.moveTo(x - s * 0.42, y - s * 0.22); g.lineTo(x, y - s * 0.46); g.lineTo(x + s * 0.42, y - s * 0.22); g.closePath(); ART.fillOut(g, '#7a4a2a', 2); }
    else if (ty === 'laberinto') { g.strokeStyle = '#2f6a22'; g.lineWidth = 3; for (let q = 0; q < 3; q++) { const d = s * (0.42 - q * 0.13); g.beginPath(); g.moveTo(x - d + (q % 2 ? d * 0.6 : 0), y - d); g.lineTo(x + d, y - d); g.lineTo(x + d, y + d); g.lineTo(x - d, y + d); g.lineTo(x - d, y - d + d * 0.6); g.stroke(); } }
    else if (ty === 'carcel') { g.beginPath(); g.rect(x - s * 0.36, y - s * 0.34, s * 0.72, s * 0.7); ART.fillOut(g, '#6d6484', 2); g.fillStyle = '#d6d0e4'; for (let q = 0; q < 4; q++) { g.fillRect(x - s * 0.28 + q * s * 0.18, y - s * 0.3, s * 0.07, s * 0.62); } g.strokeStyle = OUT; g.lineWidth = 1.2; g.strokeRect(x - s * 0.36, y - s * 0.34, s * 0.72, s * 0.7); }
    else if (ty === 'dados') { const d = s * 0.42; [[-0.2, 0.08, 3, -0.3], [0.2, -0.1, 5, 0.25]].forEach(([ox, oy, v, an]) => { g.save(); g.translate(x + ox * s, y + oy * s); g.rotate(an); ART.rr(g, -d / 2, -d / 2, d, d, d * 0.2); ART.fillOut(g, '#fff', 2); g.fillStyle = OUT; for (const [a, b] of PIPS[v]) { g.beginPath(); g.arc(a * d * 0.25, b * d * 0.25, d * 0.08, 0, TAU); g.fill(); } g.restore(); }); }
    else if (ty === 'muerte') { g.beginPath(); g.arc(x, y - s * 0.06, s * 0.3, 0, TAU); ART.fillOut(g, '#f4efe6', 2); g.beginPath(); g.rect(x - s * 0.16, y + s * 0.14, s * 0.32, s * 0.16); ART.fillOut(g, '#f4efe6', 2); g.fillStyle = OUT; [[-0.11, -0.08], [0.11, -0.08]].forEach(([a, b]) => { g.beginPath(); g.arc(x + a * s, y + b * s, s * 0.075, 0, TAU); g.fill(); }); g.fillRect(x - s * 0.02, y + s * 0.18, s * 0.04, s * 0.1); }
    else if (ty === 'salida') { g.beginPath(); g.moveTo(x - s * 0.2, y + s * 0.4); g.lineTo(x - s * 0.2, y - s * 0.2); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.beginPath(); g.moveTo(x - s * 0.2, y - s * 0.2); g.lineTo(x + s * 0.3, y - s * 0.05); g.lineTo(x - s * 0.2, y + s * 0.1); g.closePath(); ART.fillOut(g, '#ff5a5f', 2); }
    g.restore();
  }

  /* ---------- Animaciones (saltos casilla a casilla) ---------- */
  function hop(who, pts, step, hgt, done, sfx) { queue.push({ who, pts, step, hgt, done, sfx, t: 0 }); }
  function animPos(a) { const n1 = a.pts.length - 1, f = Math.min(n1, a.t / a.step), q = Math.min(n1 - 1, Math.floor(f)), u = f - q, p0 = a.pts[q], p1 = a.pts[q + 1]; return [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, Math.sin(Math.PI * u) * a.hgt]; }
  function tickAnim(dt) {
    const a = queue[0]; if (!a) return;
    const n1 = a.pts.length - 1, before = Math.floor(a.t / a.step); a.t += dt; const after = Math.floor(a.t / a.step);
    if (after > before && after <= n1) k.sfx(a.sfx || 'pop');
    if (a.t >= a.step * n1) { queue.shift(); if (a.done) a.done(); }
  }
  const busy = () => queue.length > 0;
  const isCpu = (p) => !pl[p] || pl[p].cpu;
  const nm = (p) => (pl[p] ? (pl[p].cpu ? 'CPU ' + (p + 1) : pl[p].name) : 'J' + (p + 1));
  const fast = () => isCpu(S.cur) ? 0.75 : 1;

  /* ---------- Flujo de la partida ---------- */
  function reset() { phase = 'setup'; queue = []; hideP = null; ending = 0; const hu = humansMax(); nSel = Math.max(nSel, hu, 2); msg = ''; }
  function humansMax() { return k.party ? Math.max(...k.party.map((q) => q.p + 1)) : 1; }
  function demo() { // posición de muestra en la portada (miniatura)
    n = 4; pl = k.players(4);
    if (OCA) { S = TAB.newO(4); S.pos = [23, 9, 42, 57]; S.demo = true; }
    else { S = TAB.newP(MODE, [0, 1, 2, 3]); const put = [[-1, 12, 40, 66], [3, -1, 20, -1], [0, 30, -1, 71], [-1, 5, 50, -1]]; S.pcs.forEach((a, p) => a.forEach((pc, i) => { pc.r = put[p][i] === undefined ? -1 : put[p][i]; })); S.demo = true; }
  }
  function start() {
    n = nSel; pl = k.players(n); S = OCA ? TAB.newO(n) : TAB.newP(MODE, seatsOf(n)); S.cur = k.ri(0, n - 1); boardKey = '';
    phase = 'turn'; k.sfx('start'); say(`Empieza ${nm(S.cur)}`, k.pcol(S.cur)); beginTurn();
  }
  function say(t, col) { k.float(t, BX + BS / 2, BY + BS * 0.5, col || '#fff'); }
  function beginTurn() {
    moves = []; sel = 0;
    if (OCA) { const r = TAB.ocaStart(S);
      if (r === 'skip') { msg = `${nm(S.cur)} pierde el turno`; sub = S.pos[S.cur] === 56 ? 'Sigue en la cárcel' : 'Descansa en la posada'; wait(1.1, nextO); return; }
      if (r === 'pozo') { msg = `${nm(S.cur)} sigue en el pozo`; sub = 'Hasta que otro jugador caiga'; wait(1.0, nextO); return; } }
    phase = 'roll'; timer = isCpu(S.cur) ? 0.45 : 0;
    msg = isCpu(S.cur) ? `Turno de ${nm(S.cur)}` : `${nm(S.cur)}: tira el dado`; sub = isCpu(S.cur) ? '' : (k.party ? 'Pulsa A' : 'Pulsa A o toca la pantalla');
  }
  function wait(t, fn) { phase = 'wait'; timer = t; waitFn = fn; }
  let waitFn = null;
  function doRoll() {
    dice.vals = OCA || !TWO ? [k.ri(1, 6)] : [k.ri(1, 6), k.ri(1, 6)];
    if (window.__tab && window.__tab.force) dice.vals = window.__tab.force.splice(0, dice.vals.length).concat(dice.vals).slice(0, dice.vals.length);
    dice.t = 0.55 * fast(); dice.spin = dice.vals.map(() => k.ri(1, 6)); phase = 'rolling'; k.sfx('click');
  }
  function afterRoll() {
    const vs = dice.vals; k.sfx('coin'); dice.pop = 0.3;
    if (OCA) {
      const ev = TAB.ocaRoll(S, vs[0]), p = ev.p, st = S.pos[p]; S.pos[p] = ev.from; hideP = p;
      msg = `${nm(p)} saca ${vs[0]}`; sub = '';
      const pts = [ocaXY(ev.from), ...ev.path.map(ocaXY)];
      hop({ p }, pts, 0.16 * fast(), G * 0.35, () => {
        S.pos[p] = ev.land;
        if (ev.fx) { const [x, y] = ocaXY(ev.land); msg = OCA_TXT[ev.fx]; k.float(OCA_TXT[ev.fx].split(':')[0], x, y - G * 0.4, '#fff');
          k.burst(x, y, OCA_C[ev.fx], 16, 140); k.sfx(ev.fx === 'muerte' || ev.fx === 'pozo' || ev.fx === 'carcel' ? 'hurt' : ev.fx === 'posada' || ev.fx === 'laberinto' ? 'hit' : 'jump');
          if (ev.fx === 'muerte') { k.shake(8); k.flash('rgba(40,20,60,.5)'); }
          if (ev.freed !== undefined) { const [fx, fy] = ocaXY(31); k.float(`¡${nm(ev.freed)} sale del pozo!`, fx, fy - G * 0.8, k.pcol(ev.freed)); } }
        if (ev.to !== undefined) hop({ p }, [ocaXY(ev.land), ocaXY(ev.to)], (ev.fx === 'muerte' || ev.fx === 'laberinto' ? 0.8 : 0.55) * fast(), G * 1.6, () => { S.pos[p] = st; endO(); }, 'jump');
        else { S.pos[p] = st; endO(); }
      });
      return;
    }
    const ev = TAB.roll(S, vs), p = S.cur;
    msg = `${nm(p)} saca ${vs.join(' y ')}`;
    if (ev.three) { const t = TWO ? '¡Tres dobles!' : '¡Tres seises!'; msg = t; sub = ev.burn ? 'La última ficha movida vuelve a casa' : 'Se acaba el turno'; say(t, '#ff6f6f'); k.sfx('lose');
      if (ev.burn) { const b = ev.burn, from = posR(b.p, b.from, -1); hideP = b; hop(b, [from, homePos(b.p, b.i)], 0.7, BS * 0.2, () => { hideP = null; k.burst(...homePos(b.p, b.i), k.pcol(b.p), 18, 150); k.shake(6); wait(0.6, nextP); }, 'hurt'); }
      else wait(1.0, nextP); return; }
    if (!TWO && vs[0] === 6 && S.pend[0] && S.pend[0].v === 7) k.float('¡Cuenta 7!', PX + PW / 2, dieY() - 50, '#ffd166');
    toPick();
  }
  function toPick() {
    if (S.winner >= 0) return finish();
    if (!TAB.settle(S)) { if (msg.indexOf('Sin') < 0) sub = 'Sin movimiento posible'; wait(0.8 * fast(), nextP); return; }
    moves = TAB.legal(S); moves.sort((a, b) => a.i - b.i || a.use[0] - b.use[0]); sel = 0;
    if (!isCpu(S.cur)) { const best = TAB.aiPick(S, moves, 3, () => 0.5); sel = Math.max(0, moves.indexOf(best)); }
    phase = 'pick'; timer = isCpu(S.cur) ? 0.4 * fast() : 0;
    const bonus = S.pend[0] && S.pend[0].t === 'b';
    sub = bonus ? `Cuenta ${S.pend[0].v} con una ficha` : isCpu(S.cur) ? '' : k.party ? '← → elige ficha · A mueve' : '← → o toca tu ficha · A mueve';
    if (!isCpu(S.cur)) msg = `${nm(S.cur)}: elige ficha`;
  }
  function play(m) {
    phase = 'moving'; moves = []; const M = TAB.occ(S), p = m.p;
    const from = piecePos(p, m.i, M), pts = [from];
    if (m.exit) pts.push(posR(p, 0, -1)); else for (let s = m.from + 1; s <= m.to; s++) pts.push(s === TAB.END ? metaPos(p, m.i) : posR(p, s, -1));
    const vpos = m.cap ? piecePos(m.cap.p, m.cap.i, M) : null;
    hideP = { p, i: m.i };
    hop({ p, i: m.i }, pts, (m.exit ? 0.35 : 0.13) * fast(), B * 1.1, () => {
      hideP = null; const ev = TAB.apply(S, m), [x, y] = piecePos(p, m.i, TAB.occ(S));
      if (m.cap) { const v = m.cap; k.sfx('hit'); k.shake(7); k.burst(vpos[0], vpos[1], k.pcol(v.p), 22, 190); k.float('¡Comida! +20', x, y - 26, '#ffd166'); hideP = v;
        hop(v, [vpos, homePos(v.p, v.i)], 0.6, BS * 0.25, () => { hideP = null; toPick(); }, 'hurt'); return; }
      if (m.to === TAB.END) { k.sfx('win'); k.burst(x, y, k.pcol(p), 24, 170); k.float(S.winner >= 0 ? '¡Todas en meta!' : '¡A meta! +10', x, y - 26, '#7cf7a0'); }
      else if (m.to <= TAB.LAST && TAB.SAFE.has(TAB.tIdx(S, p, m.to))) k.burst(x, y, '#ffffff', 6, 60);
      if (ev.m.to === TAB.END && S.winner >= 0) return wait(0.9, finish);
      toPick();
    }, m.exit ? 'jump' : 'pop');
  }
  function nextP() { const passed = TAB.endTurn(S); if (!passed) { say('¡Repite!', k.pcol(S.cur)); } beginTurn(); }
  function endO() { hideP = null; if (S.winner >= 0) return wait(0.9, finish); if (S.again) { say('¡Tira otra vez!', k.pcol(S.cur)); } TAB.ocaEnd(S) ; beginTurn(); }
  function nextO() { TAB.ocaEnd(S); beginTurn(); }
  function finish() {
    phase = 'over'; const w = S.winner, rows = pl.map((q) => ({ p: q.p, score: OCA ? S.pos[q.p] : TAB.pscore(S, q.p) }));
    const humWin = !isCpu(w); if (pl.some((q) => !q.cpu)) { lvl = humWin ? Math.min(3, lvl + 1) : Math.max(0, lvl - 1); try { localStorage.setItem(LK, lvl); } catch (e) { /* nada */ } }
    rows.sort((a, b) => (a.p === w ? -1 : b.p === w ? 1 : b.score - a.score)); rows.forEach((r, i) => (r.score = rows.length - i));
    const det = (p) => (OCA ? `casilla ${S.pos[p]}` : `${S.pcs[p].filter((q) => q.r === TAB.END).length}/${S.o.np} en meta`);
    const map = {}; rows.forEach((r) => (map[r.score] = r.p));
    k.podium(rows, { fmt: (s) => det(map[s]), noTie: true, head: `¡Gana ${nm(w)}!` });
  }

  /* ---------- Entrada ---------- */
  function hitA(p) { return k.phit(p, 'a') || (!k.party && p === 0 && k.ptr.hit); }
  function update(dt) {
    T += dt; dt *= SPEED.v;
    if (!k.gate(reset)) { if (phase === 'demo' && !S) demo(); return; }
    if (phase === 'demo') reset();
    if (dice.pop > 0) dice.pop -= dt;
    if (busy()) { tickAnim(dt); return; }
    if (phase === 'setup') {
      const lo = Math.max(2, humansMax()); nSel = Math.max(nSel, lo);
      for (let p = 0; p < 4; p++) { if (k.phit(p, 'left')) { nSel = Math.max(lo, nSel - 1); k.sfx('click'); } if (k.phit(p, 'right')) { nSel = Math.min(4, nSel + 1); k.sfx('click'); } }
      if (!k.party && k.ptr.hit) { const b = setupBtns().find((q) => Math.abs(k.ptr.x - q.x) < q.w / 2 && Math.abs(k.ptr.y - q.y) < q.h / 2); if (b) { if (b.v === 'go') start(); else if (b.v >= lo) { nSel = b.v; k.sfx('click'); } } return; }
      for (let p = 0; p < 4; p++) if (k.phit(p, 'a')) { start(); return; }
      if (!S || S.n !== nSel || S.turns || S.demo) { n = nSel; pl = k.players(n); if (OCA) S = TAB.newO(n); else S = TAB.newP(MODE, seatsOf(n)); boardKey = ''; }
      return;
    }
    if (phase === 'over') return;
    if (phase === 'wait') { timer -= dt; if (timer <= 0) { phase = 'idle'; waitFn(); } return; }
    const p = S.cur;
    if (phase === 'roll') {
      if (isCpu(p)) { timer -= dt; if (timer <= 0) doRoll(); }
      else if (hitA(p)) doRoll();
      return;
    }
    if (phase === 'rolling') { dice.t -= dt; dice.rot += dt * 18; if (Math.random() < 0.35) dice.spin = dice.spin.map(() => k.ri(1, 6)); if (dice.t <= 0) afterRoll(); return; }
    if (phase === 'pick') {
      if (isCpu(p)) { timer -= dt; if (timer <= 0) play(TAB.aiPick(S, moves, lvl, Math.random)); return; }
      const d = (k.phit(p, 'right') || k.phit(p, 'down') ? 1 : 0) - (k.phit(p, 'left') || k.phit(p, 'up') ? 1 : 0);
      if (d) { sel = (sel + d + moves.length) % moves.length; k.sfx('click'); }
      if (!k.party && p === 0 && k.ptr.hit) { touchPick(); return; }
      if (k.phit(p, 'a')) play(moves[sel]);
    }
  }
  function touchPick() {
    const M = TAB.occ(S), x = k.ptr.x, y = k.ptr.y, m0 = moves[sel];
    const dst = destPos(m0); if (Math.hypot(dst[0] - x, dst[1] - y) < R * 1.6) return play(m0);
    if (TWO) { const dy = dieY(); for (let j = 0; j < 2; j++) { const [dx] = dieX(j); if (Math.abs(x - dx) < 40 && Math.abs(y - dy) < 40) { const alt = moves.findIndex((m) => m.i === m0.i && m !== m0 && dieOf(m).includes(j)); if (alt >= 0) { sel = alt; k.sfx('click'); } return; } } }
    let best = -1, bd = R * 1.8; moves.forEach((m, q) => { const [px, py] = piecePos(m.p, m.i, M), dd = Math.hypot(px - x, py - y); if (dd < bd) { bd = dd; best = q; } });
    if (best < 0) { moves.forEach((m, q) => { const [px, py] = destPos(m), dd = Math.hypot(px - x, py - y); if (dd < bd) { bd = dd; best = q; } }); if (best >= 0) return play(moves[best]); return; }
    if (moves[best].i === m0.i) return play(m0);
    sel = best; k.sfx('click');
  }
  const dieOf = (m) => (m.bonus ? [] : m.use.map((u) => S.pend[u] && S.pend[u].j));
  const destPos = (m) => (m.to === TAB.END ? metaPos(m.p, m.i) : posR(m.p, m.to, -1));

  /* ---------- Pintado ---------- */
  const dieY = () => (PORT ? PY + 206 : PY + PH - 190);
  const dieCX = () => (PORT ? PX + 94 : PX + PW / 2);
  const dieX = (j) => [dieCX() + (TWO ? (j - 0.5) * 84 : 0)];
  function setupBtns() { const out = [], y = CY - 10; [2, 3, 4].forEach((v, q) => out.push({ v, x: CX + (q - 1) * 120, y, w: 100, h: 100 })); out.push({ v: 'go', x: CX, y: y + 120, w: 240, h: 64 }); return out; }
  function drawPieces() {
    if (!S) return;
    if (OCA) { const order = pl.map((q) => q.p).filter((p) => p < S.n).sort((a, b) => ocaPos(a)[1] - ocaPos(b)[1]);
      for (const p of order) { if (hideP && hideP.p === p && busy()) continue; const [x, y] = ocaPos(p), cur = phase !== 'setup' && phase !== 'over' && S.cur === p; pawn(x, y, G * 0.5, k.pcol(p), cur ? Math.abs(Math.sin(T * 4)) * 4 : 0, cur && phase === 'roll' ? '#fff' : null); }
    } else {
      const M = TAB.occ(S), sm = phase === 'pick' ? moves[sel] : null, can = new Set(phase === 'pick' && !isCpu(S.cur) ? moves.map((m) => m.i) : []), list = [];
      S.pcs.forEach((a, p) => a.forEach((pc, i) => { if (hideP && hideP.p === p && hideP.i === i) return; const [x, y] = piecePos(p, i, M); list.push([y, x, p, i]); }));
      list.sort((a, b) => a[0] - b[0]);
      if (sm) { const pts = []; if (sm.exit) pts.push(posR(sm.p, 0, -1)); else for (let s = sm.from + 1; s < sm.to; s++) pts.push(posR(sm.p, s, -1));
        c.fillStyle = ART.alpha('#ffffff', 0.8); for (const [x, y] of pts) { c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }
        const [dx, dy] = destPos(sm); c.save(); c.globalAlpha = 0.45 + Math.sin(T * 6) * 0.15; token(dx, dy, R, k.pcol(sm.p), 0); c.restore(); c.setLineDash([4, 4]); c.beginPath(); c.arc(dx, dy, R * 1.3, 0, TAU); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke(); c.setLineDash([]);
        if (sm.cap) { c.font = FONT(900, 20); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 4; c.strokeStyle = OUT; c.strokeText('¡Come!', dx, dy - R * 2.2); c.fillStyle = '#ffd166'; c.fillText('¡Come!', dx, dy - R * 2.2); } }
      for (const [y, x, p, i] of list) { const isSel = sm && sm.p === p && sm.i === i, mv = p === S.cur && can.has(i);
        token(x, y, R, k.pcol(p), isSel ? 5 + Math.abs(Math.sin(T * 6)) * 5 : 0, isSel ? '#ffffff' : mv ? ART.alpha('#ffffff', 0.55) : null); }
    }
    const a = queue[0]; if (a) { const [x, y, z] = animPos(a); if (OCA) pawn(x, y, G * 0.5, k.pcol(a.who.p), z); else token(x, y, R, k.pcol(a.who.p), z); }
  }
  function panel() {
    ART.rr(c, PX, PY + 4, PW, PH, 18); c.fillStyle = OUT; c.fill();
    ART.rr(c, PX, PY, PW, PH, 18); const g = c.createLinearGradient(0, PY, 0, PY + PH); g.addColorStop(0, '#3a2c5e'); g.addColorStop(1, '#261c42'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    if (!S) return;
    const cols = PORT ? 2 : 1, rw = PORT ? (PW - 30) / 2 : PW - 24, rh = PORT ? 52 : 64;
    const top = PORT ? PY + 12 : PY + 58;
    if (!PORT) { c.font = FONT(900, 26); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(CFG.title || '', PX + PW / 2, PY + 30); }
    for (let p = 0; p < S.n; p++) {
      const col = k.pcol(p), x = PX + 12 + (p % cols) * (rw + 6), y = top + Math.floor(p / cols) * (rh + 8), cur = S.cur === p && phase !== 'setup' && phase !== 'demo';
      ART.rr(c, x, y, rw, rh, 12); c.fillStyle = cur ? ART.alpha(col, 0.3) : 'rgba(0,0,0,.22)'; c.fill(); c.lineWidth = cur ? 3 : 1.5; c.strokeStyle = cur ? col : ART.alpha('#ffffff', 0.12); c.stroke();
      if (OCA) pawn(x + 26, y + rh * 0.82, rh * 0.62, col, 0); else token(x + 26, y + rh / 2, rh * 0.28, col, 0);
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = FONT(900, PORT ? 20 : 22); c.fillStyle = '#fff'; c.fillText(nm(p), x + 50, y + rh * 0.34);
      c.font = FONT(700, PORT ? 16 : 17); c.fillStyle = ART.lite(col, 0.4);
      let st = '';
      if (OCA) st = S.pos[p] ? `Casilla ${S.pos[p]}` + (S.pozo === p ? ' · pozo' : S.skip[p] ? ` · espera ${S.skip[p]}` : '') : 'En la salida';
      else { const a = S.pcs[p], m = a.filter((q) => q.r === TAB.END).length, h = a.filter((q) => q.r < 0).length; st = `Meta ${m}/${a.length} · casa ${h}`; }
      c.fillText(st, x + 50, y + rh * 0.72);
      if (cur) { c.fillStyle = col; c.beginPath(); const ax = x + rw - 14, ay = y + rh / 2; c.moveTo(ax + 6, ay - 9); c.lineTo(ax - 6, ay); c.lineTo(ax + 6, ay + 9); c.closePath(); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); }
    }
    // dados
    const dy = dieY(), rolling = phase === 'rolling', vals = rolling ? dice.spin : dice.vals, s = 64 + (dice.pop > 0 ? dice.pop * 20 : 0);
    const left = TWO && S.pend && (phase === 'pick' || phase === 'moving') ? S.pend.filter((d) => d.t === 'd').map((d) => d.j) : null;
    const sm = phase === 'pick' ? moves[sel] : null, sj = sm ? dieOf(sm) : [];
    vals.forEach((v, j) => { const [x] = dieX(j), dim = !!left && !left.includes(j) && !(phase === 'moving' && queue.length);
      const glow = sj.includes(j) ? k.pcol(S.cur) : null;
      die(x, dy + (rolling ? -Math.abs(Math.sin(dice.rot * 0.7 + j)) * 16 : 0), s, v, rolling ? Math.sin(dice.rot + j * 2) * 0.6 : 0, dim, glow); });
    if (phase === 'roll' && !isCpu(S.cur)) { c.globalAlpha = 0.5 + Math.sin(T * 5) * 0.3; c.lineWidth = 3; c.strokeStyle = k.pcol(S.cur); ART.rr(c, dieCX() - (TWO ? 90 : 44), dy - 44, TWO ? 180 : 88, 88, 18); c.stroke(); c.globalAlpha = 1; }
    if (!OCA && S.pend && S.pend[0] && S.pend[0].t === 'b' && phase === 'pick') { c.font = FONT(900, 26); c.textAlign = 'center'; c.fillStyle = '#ffd166'; c.fillText(`+${S.pend[0].v}`, dieX(TWO ? 1 : 0)[0] + (TWO ? 90 : 70), dy); }
    // mensajes
    const mx = PORT ? PX + 200 : PX + PW / 2, my = PORT ? PY + 180 : dy + 70, mw = PORT ? PW - 210 : PW - 24;
    c.textAlign = PORT ? 'left' : 'center'; c.textBaseline = 'top';
    wrap(msg, mx, my, mw, FONT(900, PORT ? 22 : 22), '#fff', 26);
    wrap(sub, mx, my + (PORT ? 58 : 56), mw, FONT(700, 17), '#cfc4ee', 21);
  }
  function wrap(t, x, y, mw, font, col, lh) { if (!t) return; c.font = font; c.fillStyle = col; const ws = t.split(' '); let line = '', yy = y, cnt = 0;
    for (const w0 of ws) { const tt = line ? line + ' ' + w0 : w0; if (c.measureText(tt).width > mw && line) { c.fillText(line, x, yy); yy += lh; line = w0; if (++cnt >= 2) break; } else line = tt; } if (line) c.fillText(line, x, yy); }
  function drawSetup() {
    c.fillStyle = 'rgba(12,8,24,.62)'; c.fillRect(0, 0, W, H);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = FONT(900, 34); c.lineWidth = 6; c.strokeStyle = OUT; c.strokeText('¿Cuántos jugadores?', CX, CY - 120); c.fillStyle = '#fff'; c.fillText('¿Cuántos jugadores?', CX, CY - 120);
    const lo = Math.max(2, humansMax());
    for (const b of setupBtns()) {
      const on = b.v === nSel, off = b.v !== 'go' && b.v < lo;
      ART.rr(c, b.x - b.w / 2, b.y - b.h / 2 + 5, b.w, b.h, 18); c.fillStyle = OUT; c.fill();
      ART.rr(c, b.x - b.w / 2, b.y - b.h / 2 + (on ? 3 : 0), b.w, b.h, 18); c.fillStyle = b.v === 'go' ? '#6e62f5' : on ? '#ffd166' : off ? '#4a4060' : '#efe6ff'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = b.v === 'go' ? '#fff' : '#1a1530'; c.font = FONT(900, b.v === 'go' ? 26 : 46); c.fillText(b.v === 'go' ? (k.party ? 'A: ¡A jugar!' : '¡A jugar!') : String(b.v), b.x, b.y + (on ? 3 : 0));
    }
    c.font = FONT(700, 18); c.fillStyle = '#e6ddff';
    const hu = pl.filter((q) => !q.cpu).length; c.fillText(`${hu} ${hu === 1 ? 'persona' : 'personas'} + ${nSel - hu} CPU · ← → para cambiar`, CX, CY + 200);
  }
  function draw() {
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2b1f47'); bg.addColorStop(1, '#171029'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.03)'; for (let x = 0; x < W; x += 40) c.fillRect(x, 0, 18, H);
    if (!S) demo();
    const res = boardCanvas(); c.drawImage(res, 0, 0, W, H);
    drawPieces(); panel();
    if (phase === 'setup' && k.st === 'play') drawSetup();
  }
  addEventListener('resize', () => { boardKey = ''; clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
  k.onParty = () => { if (S) pl = k.players(S.n); if (phase === 'setup') nSel = Math.max(nSel, humansMax(), 2); };
  window.__tab = { get S() { return S; }, get phase() { return phase; }, get moves() { return moves; }, get sel() { return sel; }, SPEED, TAB, force: null };
  k.show(CFG.title, (CFG.help || '') + '<br>Toca para jugar');
  k.run(update, draw);
})();
