/* mesa.js — juegos abstractos de mesa con IA. CFG.mode: 'ajedrez' | 'damaschinas'
 * Reglas puras (CH y DCH, comprobables en Node con module.exports):
 *  Ajedrez (CH): reglas completas de la FIDE en representación 0x88 — movimientos de las seis piezas,
 *   enroque corto y largo (con casillas vacías y sin pasar por jaque), captura al paso, coronación a
 *   dama/torre/alfil/caballo, jaque, jaque mate y ahogado, tablas por repetición triple, por la regla de
 *   las 50 jugadas y por material insuficiente. Verificado con perft desde la posición inicial
 *   (20 / 400 / 8902 / 197281) y desde la posición «Kiwipete».
 *   IA: negamax con poda alfa-beta, ordenación de capturas (MVV-LVA), quiescencia y tablas de casillas.
 *   El nivel base es bajo (mueve casi al azar entre las jugadas decentes) y sube con cada victoria
 *   guardada en localStorage (cpu:<id>).
 *  Damas chinas (DCH): estrella de seis puntas (hexágono central de radio 3 más seis triángulos de 6
 *   casillas = 73 agujeros) y 6 canicas por jugador, versión rápida del juego clásico. En tu turno mueves
 *   una canica a un agujero vecino libre o saltas en cadena por encima de canicas (siempre al agujero
 *   inmediatamente posterior, que debe estar libre). No se puede terminar el movimiento dentro de la
 *   punta de otro jugador (sí atravesarla saltando) y una canica que ya está en su punta de destino solo
 *   se mueve dentro de ella. Gana quien primero ocupa las seis casillas de la punta opuesta. */

/* ===================== Ajedrez (0x88) ===================== */
const CH = (() => {
  const on = (s) => !(s & 0x88);
  const W = (p) => p >= 'A' && p <= 'Z', B = (p) => p >= 'a' && p <= 'z';
  const OFF = { n: [-33, -31, -18, -14, 14, 18, 31, 33], b: [-17, -15, 15, 17], r: [-16, -1, 1, 16], q: [-17, -16, -15, -1, 1, 15, 16, 17], k: [-17, -16, -15, -1, 1, 15, 16, 17] };
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const sq = (f, r) => r * 16 + f; /* r = 0 es la octava fila (negras) */
  const name = (s) => 'abcdefgh'[s & 7] + (8 - (s >> 4));

  function fromFen(fen) {
    const S = { b: new Array(128).fill(''), t: 'w', c: '', ep: -1, half: 0, full: 1 };
    const P = (fen || START).split(' ');
    let f = 0, r = 0;
    for (const ch of P[0]) {
      if (ch === '/') { r++; f = 0; }
      else if (ch >= '1' && ch <= '8') f += +ch;
      else S.b[sq(f++, r)] = ch;
    }
    S.t = P[1] === 'b' ? 'b' : 'w'; S.c = P[2] && P[2] !== '-' ? P[2] : '';
    S.ep = P[3] && P[3] !== '-' ? sq('abcdefgh'.indexOf(P[3][0]), 8 - +P[3][1]) : -1;
    S.half = +(P[4] || 0) || 0; S.full = +(P[5] || 1) || 1;
    return S;
  }
  function toFen(S) {
    let out = '';
    for (let r = 0; r < 8; r++) { let e = 0; for (let f = 0; f < 8; f++) { const p = S.b[sq(f, r)]; if (!p) e++; else { if (e) { out += e; e = 0; } out += p; } } if (e) out += e; if (r < 7) out += '/'; }
    return `${out} ${S.t} ${S.c || '-'} ${S.ep >= 0 ? name(S.ep) : '-'} ${S.half} ${S.full}`;
  }
  const key = (S) => { let s = ''; for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) s += S.b[sq(f, r)] || '.'; return s + S.t + S.c + (S.ep >= 0 ? S.ep : ''); };
  const mine = (S, p) => !!p && (S.t === 'w' ? W(p) : B(p));
  const theirs = (S, p) => !!p && (S.t === 'w' ? B(p) : W(p));
  const kingSq = (S, side) => { const kk = side === 'w' ? 'K' : 'k'; for (let s = 0; s < 128; s++) if (!(s & 0x88) && S.b[s] === kk) return s; return -1; };

  /* ¿la casilla s está atacada por el bando `by`? */
  function attacked(S, s, by) {
    const up = by === 'w';
    /* peones */
    const pd = up ? 16 : -16; /* el peón que ataca s viene de s+pd */
    for (const d of [-1, 1]) { const o = s + pd + d; if (on(o) && S.b[o] === (up ? 'P' : 'p')) return true; }
    for (const d of OFF.n) { const o = s + d; if (on(o) && S.b[o] === (up ? 'N' : 'n')) return true; }
    for (const d of OFF.k) { const o = s + d; if (on(o) && S.b[o] === (up ? 'K' : 'k')) return true; }
    for (const d of OFF.b) { let o = s + d; while (on(o)) { const p = S.b[o]; if (p) { if (p === (up ? 'B' : 'b') || p === (up ? 'Q' : 'q')) return true; break; } o += d; } }
    for (const d of OFF.r) { let o = s + d; while (on(o)) { const p = S.b[o]; if (p) { if (p === (up ? 'R' : 'r') || p === (up ? 'Q' : 'q')) return true; break; } o += d; } }
    return false;
  }
  const inCheck = (S, side) => attacked(S, kingSq(S, side || S.t), (side || S.t) === 'w' ? 'b' : 'w');

  function gen(S) {
    const out = [], up = S.t === 'w', dir = up ? -16 : 16, home = up ? 6 : 1, last = up ? 0 : 7;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue; const p = S.b[s]; if (!mine(S, p)) continue;
      const t = p.toLowerCase();
      if (t === 'p') {
        const o1 = s + dir;
        if (on(o1) && !S.b[o1]) {
          if ((o1 >> 4) === last) for (const pr of 'qrbn') out.push({ from: s, to: o1, p, promo: up ? pr.toUpperCase() : pr });
          else { out.push({ from: s, to: o1, p }); const o2 = s + dir * 2; if ((s >> 4) === home && !S.b[o2]) out.push({ from: s, to: o2, p, dbl: 1 }); }
        }
        for (const d of [-1, 1]) {
          const o = s + dir + d; if (!on(o)) continue;
          if (theirs(S, S.b[o])) {
            if ((o >> 4) === last) for (const pr of 'qrbn') out.push({ from: s, to: o, p, cap: S.b[o], promo: up ? pr.toUpperCase() : pr });
            else out.push({ from: s, to: o, p, cap: S.b[o] });
          } else if (o === S.ep && !S.b[o]) out.push({ from: s, to: o, p, cap: up ? 'p' : 'P', ep: 1 });
        }
      } else if (t === 'n' || t === 'k') {
        for (const d of OFF[t]) { const o = s + d; if (!on(o)) continue; const q = S.b[o]; if (mine(S, q)) continue; out.push({ from: s, to: o, p, cap: q || undefined }); }
      } else {
        for (const d of OFF[t]) { let o = s + d; while (on(o)) { const q = S.b[o]; if (mine(S, q)) break; out.push({ from: s, to: o, p, cap: q || undefined }); if (q) break; o += d; } }
      }
    }
    /* enroques */
    const e = up ? 0x74 : 0x04, opp = up ? 'b' : 'w';
    if (S.b[e] === (up ? 'K' : 'k') && !attacked(S, e, opp)) {
      if (S.c.includes(up ? 'K' : 'k') && !S.b[e + 1] && !S.b[e + 2] && S.b[e + 3] === (up ? 'R' : 'r') && !attacked(S, e + 1, opp) && !attacked(S, e + 2, opp)) out.push({ from: e, to: e + 2, p: S.b[e], cas: 'k' });
      if (S.c.includes(up ? 'Q' : 'q') && !S.b[e - 1] && !S.b[e - 2] && !S.b[e - 3] && S.b[e - 4] === (up ? 'R' : 'r') && !attacked(S, e - 1, opp) && !attacked(S, e - 2, opp)) out.push({ from: e, to: e - 2, p: S.b[e], cas: 'q' });
    }
    return out;
  }
  function make(S, m) {
    const u = { c: S.c, ep: S.ep, half: S.half, full: S.full, capSq: -1, cap: '' };
    const up = S.t === 'w';
    S.b[m.from] = '';
    if (m.ep) { const cs = m.to + (up ? 16 : -16); u.capSq = cs; u.cap = S.b[cs]; S.b[cs] = ''; }
    else if (m.cap) { u.capSq = m.to; u.cap = S.b[m.to]; }
    S.b[m.to] = m.promo || m.p;
    if (m.cas === 'k') { S.b[m.to - 1] = S.b[m.to + 1]; S.b[m.to + 1] = ''; }
    if (m.cas === 'q') { S.b[m.to + 1] = S.b[m.to - 2]; S.b[m.to - 2] = ''; }
    S.ep = m.dbl ? m.from + (up ? -16 : 16) : -1;
    const lose = (ch) => { S.c = S.c.split('').filter((x) => x !== ch).join(''); };
    const t = m.p.toLowerCase();
    if (t === 'k') { if (up) { lose('K'); lose('Q'); } else { lose('k'); lose('q'); } }
    if (m.from === 0x77 || m.to === 0x77) lose('K'); if (m.from === 0x70 || m.to === 0x70) lose('Q');
    if (m.from === 0x07 || m.to === 0x07) lose('k'); if (m.from === 0x00 || m.to === 0x00) lose('q');
    S.half = m.cap || t === 'p' ? 0 : S.half + 1;
    if (!up) S.full++;
    S.t = up ? 'b' : 'w';
    return u;
  }
  function unmake(S, m, u) {
    S.t = S.t === 'w' ? 'b' : 'w';
    const up = S.t === 'w';
    S.b[m.from] = m.p; S.b[m.to] = '';
    if (u.capSq >= 0) S.b[u.capSq] = u.cap;
    if (m.cas === 'k') { S.b[m.to + 1] = S.b[m.to - 1]; S.b[m.to - 1] = ''; }
    if (m.cas === 'q') { S.b[m.to - 2] = S.b[m.to + 1]; S.b[m.to + 1] = ''; }
    S.c = u.c; S.ep = u.ep; S.half = u.half; S.full = u.full;
  }
  function legal(S) {
    const out = [], side = S.t;
    for (const m of gen(S)) { const u = make(S, m); if (!inCheck(S, side)) out.push(m); unmake(S, m, u); }
    return out;
  }
  function perft(S, d) {
    if (d <= 0) return 1;
    let n = 0; const side = S.t;
    for (const m of gen(S)) { const u = make(S, m); if (!inCheck(S, side)) n += d === 1 ? 1 : perft(S, d - 1); unmake(S, m, u); }
    return n;
  }
  /* material insuficiente: R+R, R+alfil/caballo, alfiles del mismo color */
  function poorMat(S) {
    const pc = []; for (let s = 0; s < 128; s++) { if (s & 0x88) continue; const p = S.b[s]; if (p && p.toLowerCase() !== 'k') pc.push([p.toLowerCase(), ((s >> 4) + (s & 7)) % 2]); }
    if (!pc.length) return true;
    if (pc.length === 1) return pc[0][0] === 'n' || pc[0][0] === 'b';
    if (pc.every((x) => x[0] === 'b') && pc.every((x) => x[1] === pc[0][1])) return true;
    return false;
  }
  /* estado de la partida: reps = mapa de posiciones repetidas */
  function status(S, reps) {
    const ms = legal(S);
    if (!ms.length) return inCheck(S) ? 'mate' : 'ahogado';
    if (S.half >= 100) return '50';
    if (reps && reps[key(S)] >= 3) return 'repeticion';
    if (poorMat(S)) return 'material';
    return 'play';
  }
  /* ---- Evaluación ---- */
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  };
  function evalPos(S) {
    let v = 0;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue; const p = S.b[s]; if (!p) continue;
      const t = p.toLowerCase(), i8 = (s >> 4) * 8 + (s & 7), w = W(p);
      const pv = VAL[t] + PST[t][w ? i8 : (7 - (s >> 4)) * 8 + (s & 7)];
      v += w ? pv : -pv;
    }
    return S.t === 'w' ? v : -v;
  }
  const MVV = (m) => (m.cap ? VAL[m.cap.toLowerCase()] * 10 - VAL[m.p.toLowerCase()] : 0) + (m.promo ? 800 : 0);
  function quiesce(S, a, b, d) {
    const st = evalPos(S); if (st >= b) return b; if (st > a) a = st;
    if (d <= 0) return a;
    const side = S.t, caps = gen(S).filter((m) => m.cap || m.promo).sort((x, y) => MVV(y) - MVV(x));
    for (const m of caps) {
      const u = make(S, m); if (inCheck(S, side)) { unmake(S, m, u); continue; }
      const v = -quiesce(S, -b, -a, d - 1); unmake(S, m, u);
      if (v >= b) return b; if (v > a) a = v;
    }
    return a;
  }
  function search(S, d, a, b, q) {
    if (d <= 0) return quiesce(S, a, b, q || 3);
    const side = S.t, ms = gen(S).sort((x, y) => MVV(y) - MVV(x));
    let any = false;
    for (const m of ms) {
      const u = make(S, m); if (inCheck(S, side)) { unmake(S, m, u); continue; }
      any = true; const v = -search(S, d - 1, -b, -a, q); unmake(S, m, u);
      if (v >= b) return b; if (v > a) a = v;
    }
    if (!any) return inCheck(S, side) ? -90000 - d : 0;
    return a;
  }
  /* IA: lvl 0..4 → profundidad y ruido. El nivel 0 es para quien nunca ha jugado. */
  const LEVELS = [{ d: 1, noise: 130, q: 1 }, { d: 1, noise: 60, q: 2 }, { d: 2, noise: 40, q: 3 }, { d: 3, noise: 18, q: 3 }, { d: 3, noise: 0, q: 5 }];
  function think(S, lvl, rnd) {
    rnd = rnd || Math.random;
    const L = LEVELS[Math.max(0, Math.min(4, Math.round(lvl)))], side = S.t, ms = legal(S);
    if (!ms.length) return null;
    const scored = [];
    for (const m of ms) {
      const u = make(S, m);
      let v = -search(S, L.d - 1, -1e9, 1e9, L.q);
      unmake(S, m, u);
      v += (rnd() - 0.5) * L.noise;
      scored.push({ m, v });
    }
    scored.sort((x, y) => y.v - x.v);
    return scored[0].m;
  }
  return { START, fromFen, toFen, key, name, sq, on, gen, legal, make, unmake, perft, attacked, inCheck, kingSq, status, evalPos, think, poorMat, VAL };
})();

/* ===================== Damas chinas ===================== */
const DCH = (() => {
  const R = 3, ROWS = 3; /* hexágono central de radio 3 + puntas de 6 casillas */
  const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const rot = (q, r) => [-r, q + r]; /* giro de 60° */
  function build() {
    const cells = [], idx = new Map(), tri = new Map();
    const add = (q, r, t) => { const kk = q + ',' + r; if (idx.has(kk)) return; idx.set(kk, cells.length); cells.push({ q, r, t }); if (t >= 0) { if (!tri.has(t)) tri.set(t, []); tri.get(t).push(cells.length - 1); } };
    for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) { const s = -q - r; if (Math.abs(s) <= R) add(q, r, -1); }
    /* punta 0 (arriba) y sus cinco giros */
    const base = [];
    for (let r = -R - ROWS; r <= -R - 1; r++) for (let q = -r - R; q <= R; q++) { const s = -q - r; if (s <= R && s >= 0) base.push([q, r]); }
    for (let t = 0; t < 6; t++) for (const [q0, r0] of base) { let q = q0, r = r0; for (let i = 0; i < t; i++) [q, r] = rot(q, r); add(q, r, t); }
    /* orden dentro de cada punta: de la punta hacia el centro (para emparejar destinos) */
    const key = (i) => { const c = cells[i]; return Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r); };
    for (const [t, L] of tri) L.sort((a, b) => key(b) - key(a));
    const nb = cells.map(() => []);
    cells.forEach((c, i) => DIRS.forEach(([dq, dr], d) => { const j = idx.get(c.q + dq + ',' + (c.r + dr)); nb[i][d] = j === undefined ? -1 : j; }));
    /* salto: dos pasos en la misma dirección */
    const jp = cells.map((c) => DIRS.map(([dq, dr]) => { const j = idx.get(c.q + 2 * dq + ',' + (c.r + 2 * dr)); return j === undefined ? -1 : j; }));
    return { cells, idx, tri, nb, jp };
  }
  const BRD = build();
  const OPP = (t) => (t + 3) % 6;
  const SEATS = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4] };
  const hexDist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;

  function create(n, o) {
    o = o || {};
    const seats = SEATS[Math.max(2, Math.min(4, n))];
    const S = { n: seats.length, seats, lvl: o.lvl || 0, cur: 0, cell: new Array(BRD.cells.length).fill(-1), winner: -1, turns: 0, ev: [], home: [], goal: [] };
    seats.forEach((t, p) => {
      const src = BRD.tri.get(t), dst = BRD.tri.get(OPP(t));
      S.home.push(src.slice()); S.goal.push(dst.slice());
      for (const i of src) S.cell[i] = p;
    });
    S.busy = new Set(); seats.forEach((t) => BRD.tri.get(t).forEach((i) => S.busy.add(i))); /* puntas ocupadas (no se puede acabar en la de otro) */
    return S;
  }
  const triOf = (i) => BRD.cells[i].t;
  const inGoal = (S, p, i) => S.goal[p].includes(i);
  /* ¿puede la pieza de p terminar en i? */
  function canLand(S, p, from, i) {
    const t = triOf(i);
    if (t >= 0 && t !== S.seats[p] && t !== OPP(S.seats[p])) return false; /* punta ajena: se puede atravesar, no acabar */
    if (inGoal(S, p, from) && !inGoal(S, p, i)) return false; /* ya en casa: no sale */
    return true;
  }
  /* Movimientos de la ficha `from`: pasos simples y cadenas de salto. */
  function movesFrom(S, p, from) {
    if (S.cell[from] !== p) return [];
    const out = new Map();
    for (let d = 0; d < 6; d++) { const j = BRD.nb[from][d]; if (j >= 0 && S.cell[j] < 0 && canLand(S, p, from, j)) out.set(j, { from, to: j, path: [from, j] }); }
    const seen = new Set([from]), stack = [[from, [from]]];
    while (stack.length) {
      const [cur, path] = stack.pop();
      for (let d = 0; d < 6; d++) {
        const mid = BRD.nb[cur][d], j = BRD.jp[cur][d];
        if (mid < 0 || j < 0 || S.cell[mid] < 0 || S.cell[j] >= 0 || seen.has(j)) continue;
        seen.add(j); const np = path.concat([j]); stack.push([j, np]);
        if (canLand(S, p, from, j) && !out.has(j)) out.set(j, { from, to: j, path: np, jump: 1 });
      }
    }
    return [...out.values()];
  }
  function moves(S, p) {
    const out = [];
    for (let i = 0; i < S.cell.length; i++) if (S.cell[i] === p) out.push(...movesFrom(S, p, i));
    return out;
  }
  function apply(S, m) {
    const p = S.cell[m.from]; if (p < 0) return null;
    S.cell[m.from] = -1; S.cell[m.to] = p; S.turns++;
    S.ev.push({ t: 'move', p, m });
    if (S.goal[p].every((i) => S.cell[i] === p)) { S.winner = p; S.ev.push({ t: 'end', p }); return { p, m, win: true }; }
    advance(S);
    return { p, m };
  }
  /* pasa el turno saltándose a quien no tiene ninguna jugada (raro, pero no puede bloquear la partida) */
  function advance(S) {
    for (let i = 0; i < S.n; i++) {
      S.cur = (S.cur + 1) % S.n;
      if (moves(S, S.cur).length) return S.cur;
    }
    return S.cur;
  }
  const done = (S, p) => S.goal[p].filter((i) => S.cell[i] === p).length;
  /* progreso: distancia total de las canicas a las casillas de destino (menos es mejor) */
  function dist(S, p, i) { const c = BRD.cells[i]; let best = 99; for (const g of S.goal[p]) { if (S.cell[g] === p && g !== i) continue; best = Math.min(best, hexDist(c, BRD.cells[g])); } return best; }
  function score(S, p) { let v = 0; for (let i = 0; i < S.cell.length; i++) if (S.cell[i] === p) v += dist(S, p, i); return v; }
  /* IA: avanza hacia su punta, premia los saltos largos y no deja rezagadas. lvl 0..3 = menos despistes. */
  function aiPick(S, p, lvl, rnd) {
    const ms = moves(S, p); if (!ms.length) return null;
    const noise = [3.4, 2.2, 1.1, 0.35][Math.max(0, Math.min(3, lvl | 0))];
    let best = ms[0], bv = -1e9;
    const far = (() => { let m0 = 0; for (let i = 0; i < S.cell.length; i++) if (S.cell[i] === p) m0 = Math.max(m0, dist(S, p, i)); return m0; })();
    for (const m of ms) {
      const d0 = dist(S, p, m.from);
      S.cell[m.from] = -1; S.cell[m.to] = p;
      const d1 = dist(S, p, m.to);
      S.cell[m.to] = -1; S.cell[m.from] = p;
      let v = (d0 - d1) * 2.2;
      if (d0 >= far - 0.01) v += 1.6; /* mueve la rezagada */
      if (inGoal(S, p, m.to)) v += 2.2;
      if (m.jump) v += 0.5;
      v += (rnd() - 0.5) * noise;
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  return { BRD, R, ROWS, DIRS, SEATS, OPP, hexDist, create, moves, movesFrom, apply, advance, done, score, aiPick, triOf, inGoal, dist };
})();

if (typeof module === 'object' && module.exports) module.exports = { CH, DCH };
else (function () {
  /* ================= Interfaz ================= */
  const MODE = CFG.mode === 'damaschinas' ? 'damas' : 'ajedrez';
  const PORT = innerHeight > innerWidth;
  const W = PORT ? 600 : 960, H = PORT ? 920 : 600;
  const k = Kit({ w: W, h: H, title: CFG.title, bg: MODE === 'damas' ? '#1b1436' : '#20182f' }), c = k.ctx, OUT = ART.OUT, TAU = Math.PI * 2;
  const FONT = (wt, s) => `${wt} ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  const LK = 'cpu:' + (CFG.id || MODE);
  let lvl = 0; try { lvl = +localStorage.getItem(LK) || 0; } catch (e) { /* sin almacenamiento */ }

  const PANH = PORT ? (MODE === 'damas' ? 78 : 132) : 0, PANW = PORT ? 0 : 250;
  /* en horizontal no hay banda de letterbox: se deja sitio arriba para la pausa y el sonido del reproductor */
  const TOPR = PORT ? 0 : 46;
  const BD = PORT ? { x: 10, y: 10, w: W - 20, h: H - PANH - 26 } : { x: 10, y: TOPR, w: W - PANW - 30, h: H - TOPR - 10 };
  const PAN = PORT ? { x: 10, y: H - PANH - 8, w: W - 20, h: PANH } : { x: W - PANW - 10, y: 10, w: PANW, h: H - 20 };

  let T = 0, phase = 'setup', msg = '', sub = '', banner = null, think = 0, pl = [], nSel = 2, anim = null;
  let idleP = -1, idleT = 0;
  const humans = () => (k.party ? k.party.map((q) => q.p) : [0]);
  const isHum = (p) => (k.party ? k.party.some((q) => q.p === p) : p === 0);
  const label = (p) => { if (!isHum(p)) return (pl[p] && pl[p].name) || 'CPU'; if (!k.party) return 'Tú'; const q = k.party.find((x) => x.p === p); return (q && q.name) || 'J' + (p + 1); };
  const humansMax = () => (k.party ? Math.max(...k.party.map((q) => q.p)) + 1 : 1);
  /* ajusta el tamaño de fuente hasta que el texto quepa en `maxw` (devuelve el tamaño usado) */
  function fitFont(txt, maxw, weight, size) {
    let fs = size; c.font = FONT(weight, fs);
    while (c.measureText(txt).width > maxw && fs > 9) { fs -= 1; c.font = FONT(weight, fs); }
    return fs;
  }
  const say = (txt, col, t) => { banner = { txt, col: col || '#ffd166', t: t || 1.6 }; };

  /* ---------------------------------------------- Ajedrez ---------------------------------------------- */
  const CHS = { S: null, sel: -1, moves: [], reps: {}, over: '', lastM: null, curX: 4, curY: 6, promo: null, hist: [] };
  const sqXY = (s, G, x0, y0, flip) => { let f = s & 7, r = s >> 4; if (flip) { f = 7 - f; r = 7 - r; } return [x0 + f * G + G / 2, y0 + r * G + G / 2]; };
  function chGeo() { const LB = 18; const G = Math.floor(Math.min(BD.w, BD.h - LB) / 8); return { G, x0: BD.x + (BD.w - G * 8) / 2, y0: BD.y + (BD.h - LB - G * 8) / 2 }; }
  const chFlip = () => k.party && !isHum(0) && isHum(1);
  function chReset() {
    CHS.S = CH.fromFen(CH.START); CHS.sel = -1; CHS.moves = []; CHS.reps = {}; CHS.over = ''; CHS.lastM = null; CHS.promo = null; CHS.hist = [];
    CHS.reps[CH.key(CHS.S)] = 1; CHS.curX = 4; CHS.curY = 6;
    msg = 'Salen las blancas'; sub = '';
  }
  const chSide = () => (CHS.S.t === 'w' ? 0 : 1);
  function chMove(m) {
    const S = CHS.S;
    CHS.hist.push({ m, u: CH.make(S, m) });
    const kk = CH.key(S); CHS.reps[kk] = (CHS.reps[kk] || 0) + 1;
    CHS.lastM = m; CHS.sel = -1; CHS.moves = []; CHS.promo = null;
    anim = { from: m.from, to: m.to, t: 0.22, p: m.promo || m.p };
    k.sfx(m.cap ? 'hit' : 'click');
    const st = CH.status(S, CHS.reps);
    if (m.cap) { const [x, y] = sqXY(m.to, chGeo().G, chGeo().x0, chGeo().y0, chFlip()); k.burst(x, y, '#ffc94d', 14, 130); }
    if (st === 'play') { if (CH.inCheck(S)) { say('¡Jaque!', '#ff6fb5', 1.4); k.sfx('hurt'); k.shake(5); } }
    else chEnd(st);
  }
  function chEnd(st) {
    const S = CHS.S, loser = S.t === 'w' ? 0 : 1, win = 1 - loser;
    phase = 'over';
    const names = { mate: 'Jaque mate', ahogado: 'Rey ahogado: tablas', 50: 'Tablas por la regla de las 50 jugadas', repeticion: 'Tablas por repetición', material: 'Tablas por falta de material' };
    if (st === 'mate') {
      const hum = isHum(win);
      if (!k.party) { lvl = hum ? Math.min(4, lvl + 1) : Math.max(0, lvl - 1); try { localStorage.setItem(LK, String(lvl)); } catch (e) { /* nada */ } if (hum) k.best(CFG.id, lvl + 1); }
      k.podium([{ p: win, name: label(win), score: 1 }, { p: loser, name: label(loser), score: 0 }], { head: `${names.mate}: ¡gana ${label(win)}!`, fmt: (v) => (v ? 'jaque mate' : 'rey derrotado'), noTie: true });
    } else {
      k.win('Tablas', '#ffd166', `${names[st]}<br>Toca para jugar otra vez`, 0);
    }
  }
  function chUpdate(dt) {
    const S = CHS.S, side = chSide();
    if (phase !== 'play') return;
    msg = CH.inCheck(S) ? `${S.t === 'w' ? 'Blancas' : 'Negras'} en jaque` : `Juegan las ${S.t === 'w' ? 'blancas' : 'negras'}`;
    sub = isHum(side) ? (CHS.promo ? 'Elige pieza de coronación' : k.party ? (CHS.sel >= 0 ? 'Flechas: destino · A confirma · B cancela' : 'Flechas: mueve el cursor · A elige pieza') : (CHS.sel >= 0 ? 'Toca el destino · A confirma' : 'Toca tu pieza · flechas y A con mando')) : 'La CPU piensa…';
    if (!isHum(side)) {
      if (!think) think = 0.45 + Math.random() * 0.3;
      if ((think -= dt) <= 0) { think = 0; const m = CH.think(S, Math.min(4, lvl), Math.random); if (m) chMove(m); }
      return;
    }
    think = 0;
    const g = chGeo(), fl = chFlip();
    if (CHS.promo) {
      const opts = CHS.promo.opts;
      const d = (k.phit(side, 'right') ? 1 : 0) - (k.phit(side, 'left') ? 1 : 0);
      if (d) { CHS.promo.i = (CHS.promo.i + d + opts.length) % opts.length; k.sfx('click'); }
      if (k.phit(side, 'a')) { chMove(opts[CHS.promo.i]); return; }
      if (!k.party && k.ptr.hit) { const b = promoBtns(); for (let i = 0; i < b.length; i++) if (Math.abs(k.ptr.x - b[i].x) < b[i].r && Math.abs(k.ptr.y - b[i].y) < b[i].r) { chMove(opts[i]); return; } }
      return;
    }
    /* cursor con mando/teclado */
    let mv = 0;
    if (k.phit(side, 'left')) { CHS.curX = (CHS.curX + 7) % 8; mv = 1; }
    if (k.phit(side, 'right')) { CHS.curX = (CHS.curX + 1) % 8; mv = 1; }
    if (k.phit(side, 'up')) { CHS.curY = (CHS.curY + 7) % 8; mv = 1; }
    if (k.phit(side, 'down')) { CHS.curY = (CHS.curY + 1) % 8; mv = 1; }
    if (mv) k.sfx('click');
    if (k.phit(side, 'a')) chPick(fl ? (7 - CHS.curY) * 16 + (7 - CHS.curX) : CHS.curY * 16 + CHS.curX);
    if (k.phit(side, 'b')) { CHS.sel = -1; CHS.moves = []; }
    if (!k.party && k.ptr.hit) {
      const f = Math.floor((k.ptr.x - g.x0) / g.G), r = Math.floor((k.ptr.y - g.y0) / g.G);
      if (f >= 0 && f < 8 && r >= 0 && r < 8) { CHS.curX = f; CHS.curY = r; chPick(fl ? (7 - r) * 16 + (7 - f) : r * 16 + f); }
    }
  }
  function chPick(s) {
    const S = CHS.S;
    if (CHS.sel >= 0) {
      const ms = CHS.moves.filter((m) => m.to === s);
      if (ms.length > 1) { CHS.promo = { opts: ms, i: 0, sq: s }; k.sfx('pop'); return; }
      if (ms.length === 1) { chMove(ms[0]); return; }
    }
    const p = S.b[s];
    if (p && ((S.t === 'w') === (p === p.toUpperCase()))) { CHS.sel = s; CHS.moves = CH.legal(S).filter((m) => m.from === s); k.sfx('click'); }
    else { CHS.sel = -1; CHS.moves = []; }
  }
  function promoBtns() {
    const g = chGeo(), y = g.y0 + g.G * 4, out = [];
    for (let i = 0; i < 4; i++) out.push({ x: g.x0 + g.G * 4 + (i - 1.5) * g.G * 1.1, y, r: g.G * 0.52 });
    return out;
  }
  /* ---- Dibujo del ajedrez ---- */
  function piece(x, y, s, p) {
    const w = p === p.toUpperCase(), t = p.toLowerCase();
    const body = w ? '#f5efe0' : '#4a4160', lite = w ? '#ffffff' : '#6b5f8c';
    c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineWidth = Math.max(2, s * 0.07); c.strokeStyle = OUT;
    ART.shadow(c, 0, s * 0.42, s * 0.34, 0.3);
    const base = () => { c.beginPath(); c.ellipse(0, s * 0.36, s * 0.32, s * 0.11, 0, 0, TAU); ART.fillOut(c, ART.dark(body, 0.12), c.lineWidth); };
    const gr = c.createLinearGradient(-s * 0.3, -s * 0.4, s * 0.3, s * 0.4); gr.addColorStop(0, lite); gr.addColorStop(1, ART.dark(body, 0.1));
    base();
    if (t === 'p') {
      c.beginPath(); c.moveTo(-s * 0.2, s * 0.32); c.quadraticCurveTo(-s * 0.1, s * 0.02, -s * 0.09, -s * 0.06); c.lineTo(s * 0.09, -s * 0.06); c.quadraticCurveTo(s * 0.1, s * 0.02, s * 0.2, s * 0.32); c.closePath(); ART.fillOut(c, gr, c.lineWidth);
      c.beginPath(); c.arc(0, -s * 0.18, s * 0.14, 0, TAU); ART.fillOut(c, gr, c.lineWidth);
    } else if (t === 'r') {
      c.beginPath(); c.moveTo(-s * 0.22, s * 0.32); c.lineTo(-s * 0.17, -s * 0.14); c.lineTo(s * 0.17, -s * 0.14); c.lineTo(s * 0.22, s * 0.32); c.closePath(); ART.fillOut(c, gr, c.lineWidth);
      c.beginPath(); c.moveTo(-s * 0.26, -s * 0.14); c.lineTo(-s * 0.26, -s * 0.32); c.lineTo(-s * 0.13, -s * 0.32); c.lineTo(-s * 0.13, -s * 0.24); c.lineTo(-s * 0.05, -s * 0.24); c.lineTo(-s * 0.05, -s * 0.32); c.lineTo(s * 0.05, -s * 0.32); c.lineTo(s * 0.05, -s * 0.24); c.lineTo(s * 0.13, -s * 0.24); c.lineTo(s * 0.13, -s * 0.32); c.lineTo(s * 0.26, -s * 0.32); c.lineTo(s * 0.26, -s * 0.14); c.closePath(); ART.fillOut(c, gr, c.lineWidth);
    } else if (t === 'n') {
      c.beginPath(); c.moveTo(-s * 0.2, s * 0.32); c.lineTo(-s * 0.14, -s * 0.02); c.quadraticCurveTo(-s * 0.2, -s * 0.16, -s * 0.06, -s * 0.3);
      c.quadraticCurveTo(s * 0.02, -s * 0.4, s * 0.16, -s * 0.3); c.quadraticCurveTo(s * 0.26, -s * 0.16, s * 0.2, s * 0.02); c.lineTo(s * 0.22, s * 0.32); c.closePath(); ART.fillOut(c, gr, c.lineWidth);
      c.beginPath(); c.moveTo(s * 0.02, -s * 0.3); c.lineTo(s * 0.1, -s * 0.44); c.lineTo(s * 0.16, -s * 0.28); c.closePath(); ART.fillOut(c, gr, c.lineWidth);
      c.beginPath(); c.arc(s * 0.04, -s * 0.2, s * 0.035, 0, TAU); c.fillStyle = OUT; c.fill();
    } else if (t === 'b') {
      c.beginPath(); c.moveTo(-s * 0.2, s * 0.32); c.quadraticCurveTo(-s * 0.12, s * 0.0, -s * 0.13, -s * 0.1); c.lineTo(s * 0.13, -s * 0.1); c.quadraticCurveTo(s * 0.12, s * 0, s * 0.2, s * 0.32); c.closePath(); ART.fillOut(c, gr, c.lineWidth);
      c.beginPath(); c.moveTo(0, -s * 0.44); c.quadraticCurveTo(s * 0.2, -s * 0.22, 0, -s * 0.08); c.quadraticCurveTo(-s * 0.2, -s * 0.22, 0, -s * 0.44); c.closePath(); ART.fillOut(c, gr, c.lineWidth);
    } else if (t === 'q' || t === 'k') {
      c.beginPath(); c.moveTo(-s * 0.22, s * 0.32); c.quadraticCurveTo(-s * 0.14, s * 0.02, -s * 0.16, -s * 0.12); c.lineTo(s * 0.16, -s * 0.12); c.quadraticCurveTo(s * 0.14, s * 0.02, s * 0.22, s * 0.32); c.closePath(); ART.fillOut(c, gr, c.lineWidth);
      if (t === 'q') {
        c.beginPath(); c.moveTo(-s * 0.24, -s * 0.12); c.lineTo(-s * 0.3, -s * 0.36); c.lineTo(-s * 0.12, -s * 0.22); c.lineTo(0, -s * 0.44); c.lineTo(s * 0.12, -s * 0.22); c.lineTo(s * 0.3, -s * 0.36); c.lineTo(s * 0.24, -s * 0.12); c.closePath(); ART.fillOut(c, gr, c.lineWidth);
        for (const dx of [-0.3, 0, 0.3]) { c.beginPath(); c.arc(dx * s, (dx ? -0.38 : -0.47) * s, s * 0.05, 0, TAU); ART.fillOut(c, '#ffd166', 1.6); }
      } else {
        c.beginPath(); c.moveTo(-s * 0.22, -s * 0.12); c.quadraticCurveTo(0, -s * 0.34, s * 0.22, -s * 0.12); c.closePath(); ART.fillOut(c, gr, c.lineWidth);
        c.beginPath(); c.rect(-s * 0.05, -s * 0.5, s * 0.1, s * 0.22); ART.fillOut(c, '#ffd166', 1.8);
        c.beginPath(); c.rect(-s * 0.14, -s * 0.42, s * 0.28, s * 0.09); ART.fillOut(c, '#ffd166', 1.8);
      }
    }
    ART.glint(c, -s * 0.12, -s * 0.1, s * 0.07);
    c.restore();
  }
  function chDraw() {
    const { G, x0, y0 } = chGeo(), S = CHS.S, fl = chFlip();
    ART.rr(c, x0 - 10, y0 - 6, G * 8 + 20, G * 8 + 20, 16); c.fillStyle = OUT; c.fill();
    ART.rr(c, x0 - 10, y0 - 10, G * 8 + 20, G * 8 + 20, 16);
    const wd = c.createLinearGradient(x0, y0, x0 + G * 8, y0 + G * 8); wd.addColorStop(0, '#8d5f36'); wd.addColorStop(1, '#5d3d22'); ART.fillOut(c, wd, 3);
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const x = x0 + f * G, y = y0 + r * G, dark = (f + r) % 2 === 1;
      c.fillStyle = dark ? '#7a6a9c' : '#efe4d0'; c.fillRect(x, y, G, G);
      c.fillStyle = dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)'; c.fillRect(x, y, G, G * 0.18);
    }
    /* coordenadas */
    c.font = FONT(800, Math.max(10, G * 0.2)); c.textBaseline = 'middle';
    for (let f = 0; f < 8; f++) { c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText('abcdefgh'[fl ? 7 - f : f], x0 + f * G + G / 2, y0 + G * 8 + 10); }
    for (let r = 0; r < 8; r++) { c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText(String(fl ? r + 1 : 8 - r), x0 - 4, y0 + r * G + G / 2); }
    /* última jugada, selección, jaque */
    const mark = (s, col, a) => { const [x, y] = sqXY(s, G, x0, y0, fl); c.fillStyle = ART.alpha(col, a); c.fillRect(x - G / 2, y - G / 2, G, G); };
    if (CHS.lastM) { mark(CHS.lastM.from, '#ffd166', 0.3); mark(CHS.lastM.to, '#ffd166', 0.42); }
    if (CHS.sel >= 0) mark(CHS.sel, '#6e62f5', 0.5);
    if (CH.inCheck(S)) mark(CH.kingSq(S, S.t), '#ff5a5f', 0.5);
    for (const m of CHS.moves) {
      const [x, y] = sqXY(m.to, G, x0, y0, fl);
      if (m.cap) { c.lineWidth = 4; c.strokeStyle = ART.alpha('#ff6fb5', 0.85); c.beginPath(); c.arc(x, y, G * 0.42, 0, TAU); c.stroke(); }
      else { c.beginPath(); c.arc(x, y, G * 0.15, 0, TAU); c.fillStyle = ART.alpha('#a8cf3f', 0.85); c.fill(); }
    }
    /* cursor */
    if (isHum(chSide()) && phase === 'play') {
      const x = x0 + CHS.curX * G, y = y0 + CHS.curY * G;
      c.lineWidth = 3; c.strokeStyle = ART.alpha('#ffffff', 0.55 + Math.sin(T * 6) * 0.25); ART.rr(c, x + 2, y + 2, G - 4, G - 4, 6); c.stroke();
    }
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue; const p = S.b[s]; if (!p) continue;
      if (anim && anim.to === s) continue;
      const [x, y] = sqXY(s, G, x0, y0, fl); piece(x, y, G * 0.82, p);
    }
    if (anim) { const [ax, ay] = sqXY(anim.from, G, x0, y0, fl), [bx, by] = sqXY(anim.to, G, x0, y0, fl), u = 1 - anim.t / 0.22; piece(ax + (bx - ax) * u, ay + (by - ay) * u - Math.sin(u * Math.PI) * G * 0.25, G * 0.82, anim.p); }
    if (CHS.promo) {
      c.fillStyle = 'rgba(10,6,20,.6)'; c.fillRect(0, 0, W, H);
      const b = promoBtns();
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = FONT(900, 22); c.fillStyle = '#fff';
      c.fillText('¿A qué pieza corona?', x0 + G * 4, b[0].y - G * 0.95);
      b.forEach((q, i) => { ART.rr(c, q.x - q.r, q.y - q.r, q.r * 2, q.r * 2, 12); c.fillStyle = i === CHS.promo.i ? '#6e62f5' : '#2c2348'; ART.fillOut(c, i === CHS.promo.i ? '#6e62f5' : '#2c2348', 3); piece(q.x, q.y, q.r * 1.7, CHS.promo.opts[i].promo); });
    }
  }
  function chPanel() {
    const S = CHS.S;
    /* material capturado */
    const cnt = { w: {}, b: {} };
    for (let s = 0; s < 128; s++) { if (s & 0x88) continue; const p = S.b[s]; if (!p) continue; const sd = p === p.toUpperCase() ? 'w' : 'b'; cnt[sd][p.toLowerCase()] = (cnt[sd][p.toLowerCase()] || 0) + 1; }
    const FULL = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const lost = (sd) => { const out = []; for (const t in FULL) for (let i = 0; i < FULL[t] - (cnt[sd][t] || 0); i++) out.push(t); return out; };
    const bal = (sd) => lost(sd === 'w' ? 'b' : 'w').reduce((a, t) => a + CH.VAL[t], 0) - lost(sd).reduce((a, t) => a + CH.VAL[t], 0);
    for (let i = 0; i < 2; i++) {
      const sd = i === 0 ? 'b' : 'w', top = PORT ? PAN.y + 8 + i * 60 : PAN.y + 12 + i * 92;
      const cur = (S.t === 'w') === (sd === 'w') && phase === 'play';
      ART.rr(c, PAN.x + 8, top, PAN.w - 16, PORT ? 54 : 84, 12); c.fillStyle = cur ? ART.alpha(k.pcol(sd === 'w' ? 0 : 1), 0.28) : 'rgba(0,0,0,.25)'; c.fill();
      c.lineWidth = cur ? 3 : 1.5; c.strokeStyle = cur ? k.pcol(sd === 'w' ? 0 : 1) : ART.alpha('#ffffff', 0.12); c.stroke();
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = FONT(900, 17); c.fillStyle = '#fff';
      c.fillText(`${sd === 'w' ? 'Blancas' : 'Negras'} · ${label(sd === 'w' ? 0 : 1)}`, PAN.x + 20, top + 20);
      const L = lost(sd), d = bal(sd);
      let x = PAN.x + 20; c.font = FONT(700, 13);
      for (const t of L.slice(0, PORT ? 14 : 10)) { piece(x, top + (PORT ? 40 : 48), 24, sd === 'w' ? t.toUpperCase() : t); x += 14; }
      if (d > 0) { c.fillStyle = '#a8cf3f'; c.textAlign = 'right'; c.fillText('+' + Math.round(d / 100), PAN.x + PAN.w - 18, top + 20); }
      if (!PORT) { c.font = FONT(700, 13); c.fillStyle = '#bdb2e0'; c.textAlign = 'left'; c.fillText(`Jugada ${S.full} · 50 jugadas: ${Math.floor(S.half / 2)}`, PAN.x + 20, top + 70); }
    }
    if (!PORT) { c.textAlign = 'left'; c.font = FONT(700, 14); c.fillStyle = '#bdb2e0'; c.fillText(`Nivel de la CPU: ${Math.round(lvl) + 1}/5`, PAN.x + 20, PAN.y + 210); }
  }

  /* ---------------------------------------------- Damas chinas ---------------------------------------------- */
  const DS = { S: null, sel: -1, moves: [], cur: 0, anim: null, turns: 0 };
  /* La estrella de madera: vértices exteriores a ROUT y los interiores (esquinas del hexágono) a RIN. */
  const RIN = 5.9, ROUT = 9.85, HW = ROUT * Math.cos(Math.PI / 6);
  function dGeo() {
    const s = Math.min((BD.w - 18) / (HW * 2), (BD.h - 18) / (ROUT * 2));
    return { s, cx: BD.x + BD.w / 2, cy: BD.y + BD.h / 2, r: s * 0.62 };
  }
  function hexXY(cell, s) { return [s * Math.sqrt(3) * (cell.q + cell.r / 2), s * 1.5 * cell.r]; }
  const dPos = (i) => { const g = dGeo(), [x, y] = hexXY(DCH.BRD.cells[i], g.s); return [g.cx + x, g.cy + y]; };
  function dReset(n) {
    DS.S = DCH.create(n, { lvl }); DS.sel = -1; DS.moves = []; DS.anim = null; DS.turns = 0;
    pl = k.players(DS.S.n); msg = ''; sub = '';
  }
  function dEnd() {
    phase = 'over'; const S = DS.S, w = S.winner;
    if (pl.some((q) => !q.cpu)) { const hum = isHum(w); lvl = hum ? Math.min(3, lvl + 0.5) : Math.max(0, lvl - 0.5); try { localStorage.setItem(LK, String(lvl)); } catch (e) { /* nada */ } if (hum) k.best(CFG.id, 6); }
    const rows = []; for (let p = 0; p < S.n; p++) rows.push({ p, name: label(p), score: DCH.done(S, p) + (p === w ? 0.5 : 0) });
    k.podium(rows, { head: `¡Gana ${label(w)}!`, fmt: (v) => `${Math.floor(v)}/6 en casa`, noTie: true });
  }
  function dPlay(m) {
    const S = DS.S, p = S.cur;
    DS.anim = { path: m.path.map(dPos), to: m.to, t: 0, sp: m.path.length > 2 ? 9 : 6, p };
    DCH.apply(S, m); DS.sel = -1; DS.moves = []; DS.turns++;
    k.sfx(m.jump ? 'jump' : 'click');
    const [x, y] = dPos(m.to);
    if (DCH.inGoal(S, p, m.to)) { k.burst(x, y, k.pcol(p), 12, 110); k.sfx('coin'); }
    if (S.winner >= 0) { k.confetti(k.pcol(S.winner), 80); setTimeout(() => { }, 0); }
  }
  function dUpdate(dt) {
    const S = DS.S;
    if (DS.anim) { DS.anim.t += dt * DS.anim.sp; if (DS.anim.t >= DS.anim.path.length - 1) DS.anim = null; }
    if (S.winner >= 0) { if (!DS.anim) dEnd(); return; }
    if (!DS.anim && !DCH.moves(S, S.cur).length) { say(`${label(S.cur)} no puede mover: pasa`, '#ffc94d'); DCH.advance(S); DS.sel = -1; DS.moves = []; return; }
    const p = S.cur;
    msg = isHum(p) ? `${label(p)}: te toca` : `Juega ${label(p)}…`;
    sub = isHum(p) ? (k.party ? (DS.sel >= 0 ? 'Flechas: destino · A confirma · B cancela' : 'Flechas: elige canica · A la coge') : (DS.sel >= 0 ? 'Toca el agujero de destino' : 'Toca una canica tuya · flechas y A con mando')) : '';
    if (DS.anim) return;
    if (!isHum(p)) {
      if (!think) think = 0.4 + Math.random() * 0.3;
      if ((think -= dt) <= 0) { think = 0; const m = DCH.aiPick(S, p, Math.min(3, lvl), Math.random); if (m) dPlay(m); }
      return;
    }
    think = 0;
    /* en la tele, si el jugador se despista 25 s, la partida sigue sola */
    if (idleP !== p) { idleP = p; idleT = 0; } else idleT += dt;
    if (k.party && idleT > 25) { idleT = 0; const m = DCH.aiPick(S, p, 1, Math.random); if (m) { say(`${label(p)} tarda: mueve la mesa`, '#ffc94d'); dPlay(m); return; } }
    if (!k.party && k.ptr.hit) { dTap(k.ptr.x, k.ptr.y, p); return; }
    /* mando: A recorre las canicas propias (solo las que pueden moverse), flechas eligen destino */
    const mine = dMine(S, p);
    if (k.phit(p, 'b')) { DS.sel = -1; DS.moves = []; k.sfx('click'); return; }
    if (DS.sel < 0) {
      const d = (k.phit(p, 'right') || k.phit(p, 'down') ? 1 : 0) - (k.phit(p, 'left') || k.phit(p, 'up') ? 1 : 0);
      if (d) { DS.cur = (DS.cur + d + mine.length) % mine.length; k.sfx('click'); }
      DS.cur = Math.min(DS.cur, mine.length - 1);
      if (k.phit(p, 'a')) { const i = mine[DS.cur], ms = DCH.movesFrom(S, p, i); if (ms.length) { DS.sel = i; DS.moves = ms; DS.mi = 0; k.sfx('pop'); } else k.sfx('hurt'); }
    } else {
      const d = (k.phit(p, 'right') || k.phit(p, 'down') ? 1 : 0) - (k.phit(p, 'left') || k.phit(p, 'up') ? 1 : 0);
      if (d) { DS.mi = ((DS.mi || 0) + d + DS.moves.length) % DS.moves.length; k.sfx('click'); }
      if (k.phit(p, 'a')) dPlay(DS.moves[DS.mi || 0]);
    }
  }
  /* canicas del jugador que tienen alguna jugada (si ninguna, todas, para no dejar el cursor vacío) */
  function dMine(S, p) {
    const all = [], ok = [];
    for (let i = 0; i < S.cell.length; i++) if (S.cell[i] === p) { all.push(i); if (DCH.movesFrom(S, p, i).length) ok.push(i); }
    return ok.length ? ok : all;
  }
  function dTap(x, y, p) {
    const S = DS.S, g = dGeo();
    let best = -1, bd = g.r * 1.5;
    for (let i = 0; i < S.cell.length; i++) { const [px, py] = dPos(i), dd = Math.hypot(px - x, py - y); if (dd < bd) { bd = dd; best = i; } }
    if (best < 0) { DS.sel = -1; DS.moves = []; return; }
    if (DS.sel >= 0) { const m = DS.moves.find((q) => q.to === best); if (m) { dPlay(m); return; } }
    if (S.cell[best] === p) { const ms = DCH.movesFrom(S, p, best); if (ms.length) { DS.sel = best; DS.moves = ms; DS.mi = 0; k.sfx('pop'); } else { k.sfx('hurt'); DS.sel = -1; DS.moves = []; } }
    else { DS.sel = -1; DS.moves = []; }
  }
  function marble(x, y, r, col, lift, ring) {
    ART.shadow(c, x, y + r * 0.8, r * 0.9, 0.32); y -= lift || 0;
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, ART.lite(col, 0.55)); g.addColorStop(0.6, col); g.addColorStop(1, ART.dark(col, 0.28));
    c.beginPath(); c.arc(x, y, r, 0, TAU); ART.fillOut(c, g, 2.2);
    ART.glint(c, x - r * 0.33, y - r * 0.36, r * 0.24);
    if (ring) { c.beginPath(); c.arc(x, y, r * 1.35 + Math.sin(T * 7) * 1.5, 0, TAU); c.lineWidth = 3; c.strokeStyle = ring; c.stroke(); }
  }
  let dBoardCv = null, dBoardKey = '';
  function dBoard() {
    const g = dGeo(), S = DS.S;
    const kk = `${g.s.toFixed(2)}|${S ? S.seats.join() : ''}|${(S ? S.seats : []).map((t, p) => k.pcol(p)).join()}`;
    if (!dBoardCv || dBoardKey !== kk) {
      dBoardKey = kk; dBoardCv = document.createElement('canvas');
      const res = Math.min(2, Math.max(1, k.scale * Math.min(2, devicePixelRatio || 1)));
      dBoardCv.width = Math.ceil(W * res); dBoardCv.height = Math.ceil(H * res);
      const q = dBoardCv.getContext('2d'); q.scale(res, res);
      /* tablero: estrella de madera */
      q.save(); q.translate(g.cx, g.cy);
      const pts = [];
      for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i * Math.PI / 6, rr = g.s * (i % 2 ? RIN : ROUT); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      q.beginPath(); pts.forEach(([x, y], i) => (i ? q.lineTo(x, y + 6) : q.moveTo(x, y + 6))); q.closePath(); q.fillStyle = OUT; q.fill();
      q.beginPath(); pts.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y))); q.closePath();
      const wd = q.createLinearGradient(-g.s * 7, -g.s * 7, g.s * 7, g.s * 7); wd.addColorStop(0, '#6f4fae'); wd.addColorStop(1, '#3d2a6b');
      q.fillStyle = wd; q.fill(); q.lineWidth = 4; q.strokeStyle = OUT; q.stroke();
      q.restore();
      /* agujeros */
      DCH.BRD.cells.forEach((cell, i) => {
        const [x, y] = hexXY(cell, g.s), px = g.cx + x, py = g.cy + y;
        const t = cell.t, p = S ? S.seats.indexOf(t) : -1, op = S && t >= 0 ? S.seats.indexOf(DCH.OPP(t)) : -1;
        q.beginPath(); q.arc(px, py + 2, g.r * 0.92, 0, TAU); q.fillStyle = 'rgba(0,0,0,.35)'; q.fill();
        q.beginPath(); q.arc(px, py, g.r * 0.9, 0, TAU);
        let base = '#2a1f52';
        if (op >= 0) base = ART.mix ? ART.mix('#2a1f52', k.pcol(op), 0.55) : k.pcol(op); /* punta de destino de ese jugador */
        q.fillStyle = base; q.fill(); q.lineWidth = 2.2; q.strokeStyle = op >= 0 ? ART.dark(k.pcol(op), 0.35) : ART.alpha(OUT, 0.7); q.stroke();
        if (op >= 0) { q.beginPath(); q.arc(px, py, g.r * 0.46, 0, TAU); q.lineWidth = 2; q.strokeStyle = ART.alpha(ART.lite(k.pcol(op), 0.5), 0.9); q.stroke(); }
        else { q.beginPath(); q.arc(px, py, g.r * 0.55, 0, TAU); q.fillStyle = 'rgba(0,0,0,.28)'; q.fill(); }
      });
      dBoardCv._res = res;
    }
    c.drawImage(dBoardCv, 0, 0, W, H);
    if (!S) return;
    /* canicas */
    const g2 = dGeo();
    for (let i = 0; i < S.cell.length; i++) {
      const p = S.cell[i]; if (p < 0) continue;
      if (DS.anim && DS.anim.to === i) continue;
      const [x, y] = dPos(i), sel = DS.sel === i;
      const home = DCH.inGoal(S, p, i);
      marble(x, y, g2.r * 0.9, k.pcol(p), sel ? 5 : 0, sel ? '#ffffff' : home ? ART.alpha('#ffffff', 0.5) : null);
    }
    /* destinos posibles */
    if (DS.sel >= 0) {
      DS.moves.forEach((m, i) => {
        const [x, y] = dPos(m.to), on = (DS.mi || 0) === i && k.party;
        c.beginPath(); c.arc(x, y, g2.r * (on ? 0.7 : 0.5), 0, TAU); c.fillStyle = ART.alpha(m.jump ? '#ffc94d' : '#a8cf3f', 0.75 + Math.sin(T * 6) * 0.15); c.fill();
        c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
      });
    }
    /* cursor de mando */
    if (k.party && DS.sel < 0 && isHum(S.cur) && phase === 'play') {
      const mine = dMine(S, S.cur);
      const i = mine[Math.min(DS.cur, mine.length - 1)];
      if (i !== undefined) { const [x, y] = dPos(i); c.beginPath(); c.arc(x, y, g2.r * 1.25, 0, TAU); c.lineWidth = 3; c.strokeStyle = ART.alpha('#ffffff', 0.5 + Math.sin(T * 6) * 0.3); c.stroke(); }
    }
    if (DS.anim) {
      const a = DS.anim, i = Math.min(a.path.length - 2, Math.floor(a.t)), u = a.t - i;
      const [x0, y0] = a.path[i], [x1, y1] = a.path[i + 1];
      marble(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * g2.r * 1.1, g2.r * 0.9, k.pcol(a.p), 0, null);
    }
  }
  function dPanel() {
    const S = DS.S; if (!S) return;
    const rows = S.n, bw = PORT ? (PAN.w - 16) / Math.min(4, rows) - 6 : PAN.w - 16, bh = PORT ? 52 : 62;
    for (let p = 0; p < rows; p++) {
      const x = PORT ? PAN.x + 8 + p * (bw + 6) : PAN.x + 8, y = PORT ? PAN.y + 8 : PAN.y + 12 + p * (bh + 8);
      const cur = S.cur === p && phase === 'play';
      ART.rr(c, x, y, bw, bh, 12); c.fillStyle = cur ? ART.alpha(k.pcol(p), 0.3) : 'rgba(0,0,0,.25)'; c.fill();
      c.lineWidth = cur ? 3 : 1.5; c.strokeStyle = cur ? k.pcol(p) : ART.alpha('#ffffff', 0.12); c.stroke();
      marble(x + 20, y + bh * 0.45, 11, k.pcol(p), 0, null);
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = FONT(cur ? 900 : 800, PORT ? 14 : 17); c.fillStyle = '#fff';
      c.fillText(label(p), x + 38, y + bh * 0.33);
      c.font = FONT(700, PORT ? 13 : 15); c.fillStyle = '#bdb2e0';
      c.fillText(`${DCH.done(S, p)}/6 en casa`, x + 38, y + bh * 0.72);
    }
    if (!PORT) { c.textAlign = 'left'; c.font = FONT(700, 14); c.fillStyle = '#bdb2e0'; c.fillText(`Jugadas: ${S.turns}`, PAN.x + 20, PAN.y + PAN.h - 30); }
  }

  /* ---------------------------------------------- Común ---------------------------------------------- */
  function setupBtns() {
    const cx = BD.x + BD.w / 2, cy = BD.y + BD.h / 2, out = [];
    [2, 3, 4].forEach((v, i) => out.push({ v, x: cx + (i - 1) * 110, y: cy - 10, w: 94, h: 94 }));
    out.push({ v: 'go', x: cx, y: cy + 110, w: 240, h: 62 });
    return out;
  }
  function drawSetup() {
    c.fillStyle = 'rgba(12,8,24,.66)'; c.fillRect(0, 0, W, H);
    const cx = BD.x + BD.w / 2, cy = BD.y + BD.h / 2;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = FONT(900, 32); c.lineWidth = 6; c.strokeStyle = OUT;
    c.strokeText('¿Cuántos jugadores?', cx, cy - 110); c.fillStyle = '#fff'; c.fillText('¿Cuántos jugadores?', cx, cy - 110);
    const lo = Math.max(2, humansMax());
    for (const b of setupBtns()) {
      const on = b.v === nSel, off = b.v !== 'go' && b.v < lo;
      ART.rr(c, b.x - b.w / 2, b.y - b.h / 2 + 5, b.w, b.h, 18); c.fillStyle = OUT; c.fill();
      ART.rr(c, b.x - b.w / 2, b.y - b.h / 2 + (on ? 3 : 0), b.w, b.h, 18);
      c.fillStyle = b.v === 'go' ? '#6e62f5' : on ? '#ffc94d' : off ? '#4a4060' : '#efe6ff'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = b.v === 'go' ? '#fff' : '#1a1530'; c.font = FONT(900, b.v === 'go' ? 24 : 42);
      c.fillText(b.v === 'go' ? (k.party ? 'A: ¡A jugar!' : '¡A jugar!') : String(b.v), b.x, b.y + (on ? 3 : 0));
    }
    const hu = Math.max(1, humansMax());
    c.font = FONT(700, 17); c.fillStyle = '#e6ddff';
    c.fillText(`${hu} ${hu === 1 ? 'persona' : 'personas'} + ${Math.max(0, nSel - hu)} CPU · ← → para cambiar`, cx, cy + 180);
  }
  function reset() {
    if (MODE === 'ajedrez') { pl = k.players(2); chReset(); phase = 'play'; }
    else { nSel = Math.max(nSel, humansMax(), 2); phase = 'setup'; dReset(nSel); }
    banner = null; think = 0;
  }
  function update(dt) {
    T += dt;
    if (!k.gate(reset)) return;
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    if (anim) { anim.t -= dt; if (anim.t <= 0) anim = null; }
    if (phase === 'setup') {
      const lo = Math.max(2, humansMax()); nSel = Math.max(nSel, lo);
      for (let p = 0; p < 4; p++) { if (k.phit(p, 'left')) { nSel = Math.max(lo, nSel - 1); k.sfx('click'); } if (k.phit(p, 'right')) { nSel = Math.min(4, nSel + 1); k.sfx('click'); } }
      if (!DS.S || DS.S.n !== nSel) dReset(nSel);
      if (!k.party && k.ptr.hit) { const b = setupBtns().find((q) => Math.abs(k.ptr.x - q.x) < q.w / 2 && Math.abs(k.ptr.y - q.y) < q.h / 2); if (b) { if (b.v === 'go') { phase = 'play'; k.sfx('start'); } else if (b.v >= lo) { nSel = b.v; k.sfx('click'); } } return; }
      for (let p = 0; p < 4; p++) if (k.phit(p, 'a')) { phase = 'play'; k.sfx('start'); return; }
      return;
    }
    if (phase === 'over') return;
    if (MODE === 'ajedrez') chUpdate(dt); else dUpdate(dt);
  }
  function draw() {
    const g = c.createLinearGradient(0, 0, 0, H);
    if (MODE === 'damas') { g.addColorStop(0, '#2a1f4e'); g.addColorStop(1, '#150f2b'); } else { g.addColorStop(0, '#2c2342'); g.addColorStop(1, '#171223'); }
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.03)'; for (let x = 0; x < W; x += 46) c.fillRect(x, 0, 18, H);
    /* panel */
    ART.rr(c, PAN.x, PAN.y + 4, PAN.w, PAN.h, 18); c.fillStyle = OUT; c.fill();
    ART.rr(c, PAN.x, PAN.y, PAN.w, PAN.h, 18);
    const pg = c.createLinearGradient(0, PAN.y, 0, PAN.y + PAN.h); pg.addColorStop(0, '#3a2c5e'); pg.addColorStop(1, '#261c42'); c.fillStyle = pg; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    if (MODE === 'ajedrez') { chDraw(); chPanel(); } else { dBoard(); dPanel(); }
    /* mensajes */
    const tx = PORT ? W / 2 : PAN.x + PAN.w / 2, ty = PORT ? PAN.y - 30 : PAN.y + PAN.h - 96;
    const maxw = (PORT ? W : PAN.w) - 24;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (msg && phase !== 'setup') { fitFont(msg, maxw, 900, 19); c.lineWidth = 5; c.strokeStyle = OUT; c.strokeText(msg, tx, ty); c.fillStyle = '#fff'; c.fillText(msg, tx, ty); }
    if (sub && phase !== 'setup') { fitFont(sub, maxw, 700, 14); c.lineWidth = 4; c.strokeStyle = OUT; c.strokeText(sub, tx, ty + 21); c.fillStyle = '#cfc4ee'; c.fillText(sub, tx, ty + 21); }
    if (banner) {
      const y = BD.y + Math.max(46, BD.h * 0.2), cxb = BD.x + BD.w / 2;
      c.save(); c.globalAlpha = Math.min(1, banner.t); c.textAlign = 'center'; c.textBaseline = 'middle';
      const fs = fitFont(banner.txt, BD.w - 24, 900, PORT ? 34 : 40);
      const wt = Math.min(BD.w - 8, c.measureText(banner.txt).width + 44);
      ART.rr(c, cxb - wt / 2, y - fs / 2 - 15, wt, fs + 30, 16); c.fillStyle = ART.alpha('#1a1530', 0.85); c.fill(); c.lineWidth = 3; c.strokeStyle = banner.col; c.stroke();
      c.fillStyle = banner.col; c.fillText(banner.txt, cxb, y + 1); c.restore();
    }
    if (phase === 'setup' && k.st === 'play') drawSetup();
  }
  k.onParty = () => { pl = k.players(MODE === 'ajedrez' ? 2 : (DS.S ? DS.S.n : nSel)); if (phase === 'setup') nSel = Math.max(nSel, humansMax(), 2); };
  addEventListener('resize', () => { dBoardKey = ''; clearTimeout(window.__mst); window.__mst = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
  window.__mesa = { CH, DCH, get CHS() { return CHS; }, get DS() { return DS; }, get phase() { return phase; }, set phase(v) { phase = v; }, set: (fen) => { CHS.S = CH.fromFen(fen); CHS.reps = {}; CHS.reps[CH.key(CHS.S)] = 1; CHS.sel = -1; CHS.moves = []; CHS.lastM = null; CHS.promo = null; phase = 'play'; }, move: (a, b) => { if (MODE !== 'ajedrez') return false; const m = CH.legal(CHS.S).find((x) => CH.name(x.from) === a && CH.name(x.to) === b); if (m) chMove(m); return !!m; } };
  reset();
  k.show(CFG.title, (CFG.help || '') + '<br>Toca para jugar');
  k.run(update, draw);
})();
