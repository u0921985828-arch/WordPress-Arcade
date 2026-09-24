/* Baraja española (40 cartas: oros, copas, espadas, bastos; sota, caballo y rey) dibujada por código.
 * CFG.mode: 'brisca' | 'mus' | 'chinchon'. Motor de bazas y combinaciones, IA por reglas que mejora con tus victorias
 * (localStorage cpu:<id>), mano privada en el móvil en el modo tele (k.priv / k.onPick) y mano en pantalla sin tele.
 * BJ = reglas puras (sin DOM): create / need / act / ai. En Node se exporta para el simulador bot contra bot. */
const BJ = (() => {
  const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  const SUIT = ['oros', 'copas', 'espadas', 'bastos'];
  const RN = { 1: 'As', 2: 'Dos', 3: 'Tres', 4: 'Cuatro', 5: 'Cinco', 6: 'Seis', 7: 'Siete', 10: 'Sota', 11: 'Caballo', 12: 'Rey' };
  const CARDS = []; for (let s = 0; s < 4; s++) RANKS.forEach((r, i) => CARDS.push({ id: s * 10 + i, s, r, i }));
  const name = (c) => `${RN[c.r]} de ${SUIT[c.s]}`;
  const X = { rnd: Math.random };
  const R = () => X.rnd();
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const newDeck = () => shuffle(CARDS.slice());
  const rm = (h, c) => { const i = h.indexOf(c); if (i >= 0) h.splice(i, 1); return i >= 0; };
  const cid = (a) => (typeof a === 'string' && a.startsWith('c:') ? CARDS[+a.slice(2)] : null);
  const ev = (S, e) => { S.ev.push(e); if (S.ev.length > 200) S.ev.shift(); };
  const NOISE = [0.3, 0.22, 0.15, 0.1, 0.06];

  /* =========================== BRISCA =========================== */
  const STR = { 2: 0, 4: 1, 5: 2, 6: 3, 7: 4, 10: 5, 11: 6, 12: 7, 3: 8, 1: 9 }, PTS = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };
  const pts = (c) => PTS[c.r] || 0;
  const bTeam = (S, p) => (S.n === 4 ? p % 2 : p);
  const beats = (S, a, b) => (a.s === b.s ? STR[a.r] > STR[b.r] : a.s === S.ts);
  function trickWin(S) { let b = S.trick[0]; for (const x of S.trick) if (beats(S, x.c, b.c)) b = x; return b; }
  function bDeal(S) {
    S.deck = newDeck(); S.hands = Array.from({ length: S.n }, () => []); S.trick = []; S.pts = [0, 0]; S.won = [[], []]; S.last = null;
    for (let k = 0; k < 3; k++) for (let j = 0; j < S.n; j++) S.hands[(S.dealer + 1 + j) % S.n].push(S.deck.pop());
    const m = S.deck.pop(); S.deck.unshift(m); S.muestra = m; S.ts = m.s;
    S.turn = (S.dealer + 1) % S.n; S.phase = 'play'; S.hand++;
    ev(S, { t: 'deal' });
  }
  function swapCard(S, p) {
    if (!S.cambio || S.trick.length || S.turn !== p || S.deck.length <= S.n) return null;
    const m = S.deck[0];
    return S.hands[p].find((c) => c.s === S.ts && ((c.r === 7 && [1, 3, 10, 11, 12].includes(m.r)) || (c.r === 2 && [4, 5, 6, 7].includes(m.r)))) || null;
  }
  function bNeed(S) {
    if (S.phase === 'play') {
      if (S.trick.length === S.n) return { p: -1, kind: 'collect', legal: ['collect'] };
      const p = S.turn, legal = S.hands[p].map((c) => 'c:' + c.id); if (swapCard(S, p)) legal.push('swap');
      return { p, kind: 'play', legal };
    }
    if (S.phase === 'hand') return { p: -1, kind: 'next', legal: ['next'] };
    return null;
  }
  function bAct(S, p, a) {
    if (a === 'swap') { const c = swapCard(S, p); if (!c) return false; const m = S.deck[0]; S.hands[p][S.hands[p].indexOf(c)] = m; S.deck[0] = c; S.muestra = c; ev(S, { t: 'swap', p, c, m }); return true; }
    if (a === 'collect') {
      const w = trickWin(S), t = bTeam(S, w.p), sum = S.trick.reduce((q, x) => q + pts(x.c), 0);
      S.won[t].push(...S.trick.map((x) => x.c)); S.pts[t] += sum; S.last = { p: w.p, pts: sum, cards: S.trick.map((x) => x.c) }; S.trick = [];
      ev(S, { t: 'trick', p: w.p, pts: sum });
      if (S.deck.length) for (let j = 0; j < S.n; j++) if (S.deck.length) S.hands[(w.p + j) % S.n].push(S.deck.pop());
      S.turn = w.p;
      if (S.hands.every((h) => !h.length)) {
        const nt = S.n === 4 ? 2 : S.n, win = S.pts.findIndex((v) => v > 60);
        if (win >= 0) S.games[win]++;
        S.handWin = win; S.phase = 'hand';
        if (win >= 0 && S.games[win] >= S.target) { S.over = true; S.winner = win; }
        ev(S, { t: 'hand', win, nt });
      }
      return true;
    }
    if (a === 'next') { if (S.over) { S.phase = 'end'; ev(S, { t: 'end' }); } else { S.dealer = (S.dealer + 1) % S.n; bDeal(S); } return true; }
    const c = cid(a); if (!c || !rm(S.hands[p], c)) return false;
    S.trick.push({ p, c }); S.turn = (p + 1) % S.n; ev(S, { t: 'play', p, c });
    return true;
  }
  /* Seña simplificada de la brisca: la mejor carta de triunfo de la mano (el compañero la «ve»). */
  function bSena(S, p) { const t = S.hands[p].filter((c) => c.s === S.ts).sort((a, b) => STR[b.r] - STR[a.r])[0]; return t && STR[t.r] >= 6 ? RN[t.r] : null; }
  function bAI(S, p) {
    const nd = bNeed(S), legal = nd.legal, h = S.hands[p], lvl = S.lvl, ts = S.ts;
    if (legal.includes('swap')) return 'swap';
    if (R() < NOISE[lvl] * 0.5) return 'c:' + h[Math.floor(R() * h.length)].id;
    const cost = (c) => pts(c) * 2 + (c.s === ts ? 7 + STR[c.r] * 1.2 : 0) + STR[c.r] * 0.25;
    const cheapest = (arr) => arr.slice().sort((a, b) => cost(a) - cost(b))[0];
    if (!S.trick.length) {
      const late = !S.deck.length; let pool = h.filter((c) => c.s !== ts && pts(c) === 0);
      if (late && lvl >= 2) { const hiT = h.filter((c) => c.s === ts && STR[c.r] >= 8); if (hiT.length && h.length > 1) return 'c:' + hiT[0].id; }
      if (!pool.length) pool = h;
      return 'c:' + cheapest(pool).id;
    }
    const best = trickWin(S), sum = S.trick.reduce((q, x) => q + pts(x.c), 0), last = S.trick.length === S.n - 1;
    const mate = S.n === 4 && bTeam(S, best.p) === bTeam(S, p);
    if (mate) {
      const safe = last || (best.c.s === ts && STR[best.c.r] >= 7) || (best.c.s !== ts && STR[best.c.r] >= 8 && lvl >= 1);
      if (safe) { const load = h.filter((c) => c.s !== ts).sort((a, b) => pts(b) - pts(a))[0]; if (load && pts(load)) return 'c:' + load.id; }
      return 'c:' + cheapest(h).id;
    }
    const wins = h.filter((c) => beats(S, c, best.c)), same = wins.filter((c) => c.s !== ts), trumps = wins.filter((c) => c.s === ts);
    if (same.length) return 'c:' + (last ? same.sort((a, b) => pts(b) - pts(a))[0] : cheapest(same)).id;
    const worth = sum >= (S.deck.length ? 10 - lvl : 4) || (last && sum >= 3 && lvl >= 2);
    if (trumps.length && worth) return 'c:' + cheapest(trumps).id;
    const junk = h.filter((c) => c.s !== ts && !pts(c));
    return 'c:' + cheapest(junk.length ? junk : h).id;
  }

  /* =========================== MUS =========================== */
  /* Mus a 8 reyes: los treses cuentan como reyes y los doses como ases. Parejas: J1+J3 (0 y 2) contra J2+J4 (1 y 3). */
  const mv = (r) => (r === 3 ? 12 : r === 2 ? 1 : r);
  const jv = (r) => (r >= 10 || r === 3 ? 10 : r <= 2 ? 1 : r);
  const jPts = (h) => h.reduce((a, c) => a + jv(c.r), 0);
  const JORD = [31, 32, 40, 37, 36, 35, 34, 33];
  const LN = ['Grande', 'Chica', 'Pares', 'Juego', 'Punto'];
  function paresOf(h) {
    const cnt = {}; h.forEach((c) => { const v = mv(c.r); cnt[v] = (cnt[v] || 0) + 1; }); const vs = Object.keys(cnt).map(Number);
    const four = vs.find((v) => cnt[v] === 4), three = vs.find((v) => cnt[v] === 3), pairs = vs.filter((v) => cnt[v] === 2).sort((a, b) => b - a);
    if (four != null) return { t: 3, k: [four, four] };
    if (pairs.length === 2) return { t: 3, k: pairs };
    if (three != null) return { t: 2, k: [three, 0] };
    if (pairs.length === 1) return { t: 1, k: [pairs[0], 0] };
    return { t: 0, k: [0, 0] };
  }
  const PARN = ['', 'Par', 'Medias', 'Duples'];
  function key(L, h) {
    if (L === 0) return h.map((c) => mv(c.r)).sort((a, b) => b - a);
    if (L === 1) return h.map((c) => 13 - mv(c.r)).sort((a, b) => b - a);
    if (L === 2) { const q = paresOf(h); return [q.t, q.k[0], q.k[1]]; }
    if (L === 3) return [8 - JORD.indexOf(jPts(h))];
    return [jPts(h)];
  }
  const cmpK = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  const mL = (S) => (S.L === 3 && S.punto ? 4 : S.L);
  function eligOf(S, L) {
    if (L === 2) return S.order.filter((p) => paresOf(S.hands[p]).t > 0);
    if (L === 3) return S.order.filter((p) => jPts(S.hands[p]) >= 31);
    return S.order.slice();
  }
  function lanceWin(S, L, elig) { let b = null, bk = null; for (const p of elig) { const kk = key(L, S.hands[p]); if (!b && b !== 0 || cmpK(kk, bk) > 0) { b = p; bk = kk; } } return b; }
  const teamVal = (S, L, t) => S.order.filter((p) => p % 2 === t).reduce((a, p) => a + (L === 2 ? paresOf(S.hands[p]).t : L === 3 ? (jPts(S.hands[p]) === 31 ? 3 : jPts(S.hands[p]) >= 31 ? 2 : 0) : 0), 0);
  function mDeal(S) {
    S.deck = newDeck(); S.disc = []; S.mano = (S.dealer + 1) % 4; S.order = [0, 1, 2, 3].map((j) => (S.mano + j) % 4);
    S.hands = [[], [], [], []]; for (let k = 0; k < 4; k++) for (const p of S.order) S.hands[p].push(S.deck.pop());
    S.phase = 'mus'; S.mi = 0; S.rounds = 0; S.res = [null, null, null, null]; S.L = 0; S.bet = null; S.punto = false; S.ordago = null; S.tally = []; S.newDisc = [];
    S.hand++; ev(S, { t: 'deal' });
  }
  function addPts(S, t, v, why) { if (S.over || !v) return; S.score[t] += v; ev(S, { t: 'pts', team: t, v, why }); if (S.score[t] >= S.target) { S.over = true; S.winner = t; } }
  function startLance(S) {
    while (S.L < 4) {
      const L = S.L;
      if (L === 2) S.order.forEach((p) => ev(S, { t: 'say', p, txt: paresOf(S.hands[p]).t ? 'Pares: sí' : 'Pares: no' }));
      if (L === 3) S.order.forEach((p) => ev(S, { t: 'say', p, txt: jPts(S.hands[p]) >= 31 ? 'Juego: sí' : 'Juego: no' }));
      let elig = eligOf(S, L);
      if (L === 3 && !elig.length) { S.punto = true; elig = S.order.slice(); ev(S, { t: 'info', txt: 'Nadie tiene juego: se juega al punto' }); }
      const teams = new Set(elig.map((p) => p % 2));
      if (!elig.length) { S.res[L] = { type: 'none' }; S.L++; continue; }
      if (teams.size === 1) { S.res[L] = { type: 'solo', team: [...teams][0] }; S.L++; continue; }
      S.bet = { elig, queue: elig.slice(), stake: 0, safe: 1, team: -1 }; S.phase = 'lance'; ev(S, { t: 'lance', L: mL(S) });
      return;
    }
    mReveal(S);
  }
  function nextLance(S) { S.bet = null; S.L++; if (S.over) mReveal(S); else startLance(S); }
  function responders(S, p) { const o = S.order, ip = o.indexOf(p); return S.bet.elig.filter((q) => q % 2 !== p % 2).sort((a, b) => ((o.indexOf(a) - ip + 4) % 4) - ((o.indexOf(b) - ip + 4) % 4)); }
  function mReveal(S) {
    S.phase = 'reveal'; S.bet = null; const T = S.tally = [];
    if (S.ordago != null) {
      const L = S.ordago, ln = L === 3 && S.punto ? 4 : L, w = lanceWin(S, ln, L === 3 && S.punto ? S.order : eligOf(S, L));
      S.over = true; S.winner = w % 2; T.push({ L: ln, txt: `Órdago a ${LN[ln].toLowerCase()}`, team: w % 2, v: 'Partida' }); ev(S, { t: 'reveal' }); return;
    }
    if (S.over) { T.push({ L: -1, txt: `No quiero: llega a ${S.target}`, team: S.winner, v: 'Partida' }); ev(S, { t: 'reveal' }); return; }
    for (let L = 0; L < 4 && !S.over; L++) {
      const r = S.res[L], ln = L === 3 && S.punto ? 4 : L; if (!r) break;
      if (r.type === 'none') { T.push({ L: ln, txt: `${LN[ln]}: nadie`, team: -1, v: 0 }); continue; }
      const elig = ln === 4 ? S.order : eligOf(S, L), w = r.type === 'solo' ? null : lanceWin(S, ln, elig), team = r.type === 'solo' ? r.team : w % 2;
      const extra = L >= 2 ? (ln === 4 ? 1 : teamVal(S, L, team)) : 0;
      let v = 0, how = '';
      if (r.type === 'paso') { v = L < 2 ? 1 : extra; how = 'en paso'; }
      else if (r.type === 'solo') { v = extra; how = 'sin rival'; }
      else if (r.type === 'querido') { v = r.stake + (L >= 2 ? extra : 0); how = `envite de ${r.stake}`; }
      else if (r.type === 'noquerido') { T.push({ L: ln, txt: `${LN[ln]} no querido`, team: r.team, v: r.safe, pre: true }); if (L < 2 || ln === 4) continue; v = extra; how = '(jugada)'; }
      T.push({ L: ln, txt: `${LN[ln]} ${how}`, team, v, w });
      addPts(S, team, v, LN[ln]);
    }
    ev(S, { t: 'reveal' });
  }
  function mNeed(S) {
    if (S.phase === 'mus') return { p: S.order[S.mi], kind: 'mus', legal: ['mus', 'nomus'] };
    if (S.phase === 'discard') return { p: S.order[S.mi], kind: 'discard', legal: ['discard'] };
    if (S.phase === 'lance') {
      const B = S.bet, p = B.queue[0];
      const legal = B.stake === 0 ? ['paso', 'envido', 'env5', 'ordago'] : B.stake === 'O' ? ['noquiero', 'quiero'] : ['noquiero', 'quiero'].concat(B.stake < 30 ? ['sube'] : [], ['ordago']);
      return { p, kind: 'bet', legal, L: mL(S), stake: B.stake };
    }
    if (S.phase === 'reveal') return { p: -1, kind: 'next', legal: ['next'] };
    return null;
  }
  const SAY = { mus: 'Mus', nomus: 'No hay mus', paso: 'Paso', envido: 'Envido', env5: 'Cinco', ordago: '¡Órdago!', quiero: 'Quiero', noquiero: 'No quiero', sube: 'Dos más' };
  function mAct(S, p, a) {
    if (a === 'next') { if (S.over) { S.phase = 'end'; ev(S, { t: 'end' }); } else { S.dealer = (S.dealer + 1) % 4; mDeal(S); } return true; }
    const nd = mNeed(S); if (!nd || nd.p !== p) return false;
    if (S.phase === 'mus') {
      if (a === 'mus') { ev(S, { t: 'say', p, txt: 'Mus' }); if (++S.mi === 4) { S.phase = 'discard'; S.mi = 0; S.newDisc = []; } return true; }
      if (a === 'nomus') { ev(S, { t: 'say', p, txt: 'No hay mus' }); S.L = 0; startLance(S); return true; }
      return false;
    }
    if (S.phase === 'discard') {
      if (!a || a.a !== 'discard' || !Array.isArray(a.ids)) return false;
      const ids = [...new Set(a.ids)], h = S.hands[p], cs = ids.map((i) => h.find((c) => c.id === i));
      if (!ids.length || ids.length > 4 || cs.some((c) => !c)) return false;
      cs.forEach((c) => { rm(h, c); S.newDisc.push(c); }); ev(S, { t: 'say', p, txt: `Descarta ${ids.length}` }); ev(S, { t: 'discard', p, cs });
      if (++S.mi === 4) {
        for (const q of S.order) while (S.hands[q].length < 4) {
          if (!S.deck.length) { S.deck = shuffle(S.disc.length ? S.disc : S.newDisc); if (S.disc.length) S.disc = []; else S.newDisc = []; ev(S, { t: 'info', txt: 'Se barajan los descartes' }); }
          S.hands[q].push(S.deck.pop());
        }
        S.disc = S.disc.concat(S.newDisc); S.newDisc = []; S.rounds++; S.mi = 0; ev(S, { t: 'redeal' });
        if (S.rounds >= S.maxMus) { ev(S, { t: 'info', txt: 'Se corta el mus' }); S.L = 0; startLance(S); } else S.phase = 'mus';
      }
      return true;
    }
    if (S.phase === 'lance') {
      if (!nd.legal.includes(a)) return false;
      const B = S.bet; ev(S, { t: 'say', p, txt: SAY[a], big: a === 'ordago' });
      if (B.stake === 0) {
        if (a === 'paso') { B.queue.shift(); if (!B.queue.length) { S.res[S.L] = { type: 'paso' }; nextLance(S); } return true; }
        B.stake = a === 'envido' ? 2 : a === 'env5' ? 5 : 'O'; B.safe = 1; B.team = p % 2; B.queue = responders(S, p); return true;
      }
      if (a === 'quiero') { S.res[S.L] = { type: 'querido', stake: B.stake }; if (B.stake === 'O') { S.ordago = S.L; mReveal(S); } else nextLance(S); return true; }
      if (a === 'noquiero') { B.queue.shift(); if (!B.queue.length) { S.res[S.L] = { type: 'noquerido', team: B.team, safe: B.safe }; addPts(S, B.team, B.safe, 'No quiero'); nextLance(S); } return true; }
      B.safe = B.stake; B.stake = a === 'sube' ? B.stake + 2 : 'O'; B.team = p % 2; B.queue = responders(S, p); return true;
    }
    return false;
  }
  /* Fuerza estimada (0..1) de una mano en cada lance y seña simplificada que ve el compañero. */
  function mStr(S, h, L) {
    if (L === 0) { const v = h.map((c) => mv(c.r)).sort((a, b) => b - a); const nr = v.filter((x) => x === 12).length; return nr >= 3 ? 0.95 : nr === 2 ? 0.74 + (v[2] >= 10 ? 0.08 : 0) : nr === 1 ? 0.42 + (v[1] >= 10 ? 0.08 : 0) : v[0] === 11 ? 0.22 : 0.1; }
    if (L === 1) { const v = h.map((c) => mv(c.r)).sort((a, b) => a - b); const na = v.filter((x) => x === 1).length; return na >= 3 ? 0.95 : na === 2 ? 0.74 + (v[2] <= 4 ? 0.08 : 0) : na === 1 ? 0.4 + (v[1] <= 4 ? 0.1 : 0) : v[0] === 4 ? 0.22 : 0.08; }
    if (L === 2) { const q = paresOf(h); return q.t === 3 ? 0.8 + q.k[0] / 12 * 0.18 : q.t === 2 ? 0.6 + q.k[0] / 12 * 0.2 : q.t === 1 ? 0.2 + q.k[0] / 12 * 0.35 : 0; }
    if (L === 3) { const j = jPts(h); return j === 31 ? 0.92 : j === 32 ? 0.72 : j === 40 ? 0.55 : j === 37 ? 0.45 : j >= 31 ? 0.32 : 0; }
    const j = jPts(h); return Math.max(0.05, Math.min(0.9, (j - 21) / 10));
  }
  function mSena(h) {
    const q = paresOf(h), j = jPts(h), v = h.map((c) => mv(c.r)), nr = v.filter((x) => x === 12).length, na = v.filter((x) => x === 1).length;
    if (q.t === 3) return 'Duples'; if (j === 31) return '31 de juego'; if (q.t === 2) return 'Medias'; if (nr >= 2) return nr === 2 ? 'Dos reyes' : 'Tres reyes'; if (na >= 2) return 'Dos ases';
    return 'Nada (ciego)';
  }
  function senaEst(txt, L) { const m = { 0: { 'Dos reyes': 0.74, 'Tres reyes': 0.95 }, 1: { 'Dos ases': 0.74 }, 2: { Duples: 0.85, Medias: 0.65 }, 3: { '31 de juego': 0.92 } }; return (m[L] && m[L][txt]) || 0; }
  function mAI(S, p) {
    const h = S.hands[p], lvl = S.lvl, nz = NOISE[lvl], mate = (p + 2) % 4;
    if (S.phase === 'mus') {
      const q = paresOf(h), j = jPts(h), g = mStr(S, h, 0), ch = mStr(S, h, 1);
      const cut = q.t >= 2 || j === 31 || (q.t === 1 && j >= 31 && R() < 0.6) || (g >= 0.74 && q.t >= 1) || ch >= 0.95 || (S.rounds >= 2 && R() < 0.35) || R() < nz * 0.3;
      return cut ? 'nomus' : 'mus';
    }
    if (S.phase === 'discard') {
      const cnt = {}; h.forEach((c) => { const v = mv(c.r); cnt[v] = (cnt[v] || 0) + 1; });
      const keep = (c) => mv(c.r) === 12 || cnt[mv(c.r)] >= 2 || (mv(c.r) === 1 && cnt[1] >= 2) || (jv(c.r) === 10 && lvl >= 1 && R() < 0.8);
      let ids = h.filter((c) => !keep(c)).map((c) => c.id);
      if (!ids.length) ids = [h.slice().sort((a, b) => (cnt[mv(a.r)] - cnt[mv(b.r)]) || (mv(a.r) - mv(b.r)))[0].id];
      return { a: 'discard', ids: ids.slice(0, 4) };
    }
    const nd = mNeed(S), L = nd.L, legal = nd.legal, B = S.bet;
    let s = mStr(S, h, L);
    if (S.senas && S.hands[mate] && B.elig.includes(mate)) s = Math.max(s, senaEst(mSena(S.hands[mate]), L) - 0.05);
    const oi = S.order.indexOf(p); s += oi === 0 ? 0.06 : oi === 1 ? 0.03 : 0; s += (R() - 0.5) * nz;
    const opp = S.score[1 - (p % 2)], me = S.score[p % 2], pick = (a) => (legal.includes(a) ? a : legal[0]);
    if (B.stake === 0) {
      if (s >= 0.93 && (R() < 0.3 || opp >= S.target - 6)) return pick('ordago');
      if (s >= 0.8) return pick(R() < 0.45 ? 'env5' : 'envido');
      if (s >= 0.62 || R() < 0.04 + lvl * 0.015) return pick('envido');
      return 'paso';
    }
    if (B.stake === 'O') return s >= 0.86 || (opp >= S.target - 5 && s >= 0.6) || (me < S.target * 0.3 && opp > S.target * 0.7 && s >= 0.55) ? 'quiero' : 'noquiero';
    const need = Math.min(0.8, 0.44 + B.stake * 0.025);
    if (s >= need + 0.3 && legal.includes('sube') && R() < 0.5) return R() < 0.12 ? 'ordago' : 'sube';
    return s >= need ? 'quiero' : 'noquiero';
  }

  /* =========================== CHINCHÓN =========================== */
  /* 40 cartas sin comodines; figuras valen 10. Escalera = 3+ del mismo palo seguidas (7 y sota son seguidas);
     grupo = 3 o 4 del mismo número. Cierre con ≤ 3 puntos sueltos; −10 si todo ligado; chinchón (escalera de 7) gana. */
  const cv = (c) => (c.r >= 10 ? 10 : c.r);
  function melds(h) {
    const out = [], by = {};
    h.forEach((c, i) => (by[c.r] = by[c.r] || []).push(i));
    for (const r in by) { const a = by[r]; if (a.length >= 3) { for (let x = 0; x < a.length; x++) for (let y = x + 1; y < a.length; y++) for (let z = y + 1; z < a.length; z++) out.push((1 << a[x]) | (1 << a[y]) | (1 << a[z])); if (a.length === 4) out.push(a.reduce((m, i) => m | (1 << i), 0)); } }
    for (let s = 0; s < 4; s++) {
      const a = h.map((c, i) => [c, i]).filter(([c]) => c.s === s).sort((x, y) => x[0].i - y[0].i);
      let st = 0; for (let j = 1; j <= a.length; j++) if (j === a.length || a[j][0].i !== a[j - 1][0].i + 1) { for (let x = st; x < j; x++) for (let y = x + 2; y < j; y++) { let m = 0; for (let q = x; q <= y; q++) m |= 1 << a[q][1]; out.push(m); } st = j; }
    }
    return out;
  }
  function best(h) {
    const M = melds(h), memo = new Map(), full = (1 << h.length) - 1;
    const f = (mask) => {
      if (!mask) return { d: 0, ms: [] }; if (memo.has(mask)) return memo.get(mask);
      const lo = mask & -mask, i = 31 - Math.clz32(lo); let r = f(mask & ~lo); r = { d: r.d + cv(h[i]), ms: r.ms };
      for (const m of M) if ((m & lo) && (m & mask) === m) { const q = f(mask & ~m); if (q.d < r.d || (q.d === r.d && q.ms.length + 1 < r.ms.length)) r = { d: q.d, ms: q.ms.concat([m]) }; }
      memo.set(mask, r); return r;
    };
    const r = f(full), used = r.ms.reduce((a, m) => a | m, 0);
    return { dead: r.d, melds: r.ms.map((m) => h.filter((_, i) => m & (1 << i)).sort((a, b) => a.s - b.s || a.i - b.i)), loose: h.filter((_, i) => !(used & (1 << i))) };
  }
  const isChin = (h) => h.length === 7 && h.every((c) => c.s === h[0].s) && (() => { const a = h.map((c) => c.i).sort((x, y) => x - y); return a.every((v, i) => !i || v === a[i - 1] + 1); })();
  const active = (S) => S.hands.map((_, p) => p).filter((p) => !S.out[p]);
  const nextAct = (S, p) => { for (let j = 1; j <= S.n; j++) { const q = (p + j) % S.n; if (!S.out[q]) return q; } return p; };
  function cDeal(S) {
    S.deck = newDeck(); S.hands = Array.from({ length: S.n }, () => []); S.drew = null; S.closer = null; S.tally = []; S.refills = 0; S.turns = 0;
    const act = active(S); for (let k = 0; k < 7; k++) for (const p of act) S.hands[p].push(S.deck.pop());
    S.pile = [S.deck.pop()]; S.turn = nextAct(S, S.dealer); S.phase = 'draw'; S.hand++; ev(S, { t: 'deal' });
  }
  function closeWith(S, p) {
    const h = S.hands[p], ban = S.drew && S.drew.from === 'pile' ? S.drew.c : null; let bestC = null;
    for (const c of h) { if (c === ban) continue; const rest = h.filter((x) => x !== c), b = best(rest), sc = isChin(rest) ? -100 : b.dead === 0 ? -10 : b.dead;
      if (b.dead <= 3 && (!bestC || sc < bestC.sc)) bestC = { c, sc, b, rest }; }
    return bestC;
  }
  function cNeed(S) {
    if (S.phase === 'draw') return { p: S.turn, kind: 'draw', legal: S.pile.length ? ['stock', 'pile'] : ['stock'] };
    if (S.phase === 'discard') {
      const p = S.turn, ban = S.drew.from === 'pile' ? S.drew.c : null, legal = S.hands[p].filter((c) => c !== ban).map((c) => 'c:' + c.id);
      if (closeWith(S, p)) legal.push('close'); return { p, kind: 'discard', legal };
    }
    if (S.phase === 'reveal') return { p: -1, kind: 'next', legal: ['next'] };
    return null;
  }
  function fits(m, c) { if (m.every((x) => x.r === m[0].r)) return m.length < 4 && c.r === m[0].r; const lo = m[0], hi = m[m.length - 1]; return c.s === lo.s && (c.i === lo.i - 1 || c.i === hi.i + 1); }
  function cReveal(S, p, cl) {
    S.phase = 'reveal'; S.closer = p; S.hands[p] = cl.rest; S.closeCard = cl.c; const T = S.tally = [];
    if (isChin(cl.rest)) { S.over = true; S.winner = p; S.chinchon = true; T.push({ p, txt: '¡Chinchón!', v: 0, melds: cl.b.melds, loose: [] }); ev(S, { t: 'chinchon', p }); return; }
    const cm = cl.b.melds.map((m) => m.slice()), cs = cl.b.dead === 0 ? -10 : cl.b.dead;
    S.score[p] += cs; T.push({ p, txt: cl.b.dead === 0 ? 'Cierra con todo ligado' : 'Cierra', v: cs, melds: cl.b.melds, loose: cl.b.loose });
    for (let j = 1; j < S.n; j++) {
      const q = (p + j) % S.n; if (S.out[q]) continue; const b = best(S.hands[q]); let loose = b.loose.slice(), laid = [], ch = true;
      while (ch) { ch = false; for (const c of loose) { const m = cm.find((mm) => fits(mm, c)); if (m) { m.push(c); m.sort((a, b2) => a.i - b2.i); laid.push(c); loose = loose.filter((x) => x !== c); ch = true; break; } } }
      const d = loose.reduce((a, c) => a + cv(c), 0); S.score[q] += d; T.push({ p: q, txt: laid.length ? `Liga ${laid.length}` : '', v: d, melds: b.melds, loose, laid });
    }
    S.closedMelds = cm;
    const act = active(S); act.forEach((q) => { if (S.score[q] > S.target) { S.out[q] = true; ev(S, { t: 'out', p: q }); } });
    const left = active(S);
    if (left.length <= 1) { S.over = true; S.winner = left.length ? left[0] : act.slice().sort((a, b) => S.score[a] - S.score[b])[0]; }
    ev(S, { t: 'close', p, v: cs });
  }
  function cAct(S, p, a) {
    if (a === 'next') { if (S.over) { S.phase = 'end'; ev(S, { t: 'end' }); } else { S.dealer = nextAct(S, S.dealer); cDeal(S); } return true; }
    const nd = cNeed(S); if (!nd || nd.p !== p) return false;
    if (S.phase === 'draw') {
      if (a === 'pile' && S.pile.length) { const c = S.pile.pop(); S.hands[p].push(c); S.drew = { from: 'pile', c }; S.phase = 'discard'; ev(S, { t: 'draw', p, from: 'pile', c }); return true; }
      if (a !== 'stock') return false;
      if (!S.deck.length) {
        if (++S.refills >= 3) { S.phase = 'reveal'; S.closer = null; S.tally = [{ p: -1, txt: 'Mazo agotado tres veces: mano nula', v: 0 }]; ev(S, { t: 'null' }); return true; }
        const top = S.pile.pop(); S.deck = shuffle(S.pile); S.pile = [top]; ev(S, { t: 'info', txt: 'Se baraja el descarte' });
      }
      const c = S.deck.pop(); S.hands[p].push(c); S.drew = { from: 'stock', c }; S.phase = 'discard'; ev(S, { t: 'draw', p, from: 'stock', c }); return true;
    }
    if (S.phase === 'discard') {
      if (!nd.legal.includes(a)) return false;
      if (a === 'close') { const cl = closeWith(S, p); S.pile.push(cl.c); cReveal(S, p, cl); return true; }
      const c = cid(a); rm(S.hands[p], c); S.pile.push(c); S.drew = null; S.phase = 'draw'; S.turns++; S.turn = nextAct(S, p); ev(S, { t: 'discard', p, c }); return true;
    }
    return false;
  }
  function near(h) { let n = 0; const lo = best(h).loose; for (let i = 0; i < lo.length; i++) for (let j = i + 1; j < lo.length; j++) { const a = lo[i], b = lo[j]; if (a.r === b.r || (a.s === b.s && Math.abs(a.i - b.i) <= 2)) n++; } return n; }
  function cAI(S, p) {
    const nd = cNeed(S), h = S.hands[p], lvl = S.lvl, nz = NOISE[lvl];
    if (S.phase === 'draw') {
      if (!S.pile.length) return 'stock';
      const top = S.pile[S.pile.length - 1], cur = best(h), h2 = h.concat([top]);
      let bd = 99, bm = 0; for (const c of h) { const b = best(h2.filter((x) => x !== c)); if (b.dead < bd) { bd = b.dead; bm = b.melds.length; } }
      return bd <= cur.dead - 4 || (bd <= 3 && cur.dead > 3) || (bm > cur.melds.length && bd < cur.dead) || (R() < nz * 0.3 && cv(top) <= 3) ? 'pile' : 'stock';
    }
    if (nd.legal.includes('close')) { const cl = closeWith(S, p); if (cl.sc <= 0 || lvl < 3 || S.turns > 6 * S.n || R() < 0.75) return 'close'; }
    const cand = nd.legal.filter((a) => a.startsWith('c:')).map((a) => { const c = cid(a), rest = h.filter((x) => x !== c), b = best(rest); return { a, sc: b.dead - near(rest) * (1 + lvl * 0.3) + (R() - 0.5) * nz * 12 }; });
    cand.sort((x, y) => x.sc - y.sc); return cand[0].a;
  }

  /* =========================== Común =========================== */
  function create(mode, o) {
    o = o || {};
    const S = { mode, ev: [], hand: 0, lvl: Math.max(0, Math.min(4, o.lvl | 0)), over: false, winner: null, phase: 'deal' };
    if (mode === 'brisca') { S.n = o.n === 4 ? 4 : 2; S.target = o.target || 2; S.cambio = o.cambio !== false; S.games = [0, 0]; S.dealer = Math.floor(R() * S.n); bDeal(S); }
    else if (mode === 'mus') { S.n = 4; S.target = o.target || 40; S.senas = o.senas !== false; S.maxMus = o.maxMus || 4; S.score = [0, 0]; S.dealer = Math.floor(R() * 4); mDeal(S); }
    else { S.n = Math.max(2, Math.min(4, o.n || 2)); S.target = o.target || 100; S.score = Array(S.n).fill(0); S.out = Array(S.n).fill(false); S.dealer = Math.floor(R() * S.n); cDeal(S); }
    return S;
  }
  const need = (S) => (S.phase === 'end' ? null : S.mode === 'brisca' ? bNeed(S) : S.mode === 'mus' ? mNeed(S) : cNeed(S));
  function act(S, p, a) { const nd = need(S); if (!nd || nd.p !== p) return false; if (typeof a === 'string' && !nd.legal.includes(a)) return false; return S.mode === 'brisca' ? bAct(S, p, a) : S.mode === 'mus' ? mAct(S, p, a) : cAct(S, p, a); }
  const ai = (S, p) => (S.mode === 'brisca' ? bAI(S, p) : S.mode === 'mus' ? mAI(S, p) : cAI(S, p));
  /* Todas las cartas de la partida (para comprobar que no se pierde ni se duplica ninguna). */
  function allCards(S) {
    const a = S.hands.flat().concat(S.deck);
    if (S.mode === 'brisca') a.push(...S.trick.map((x) => x.c), ...S.won[0], ...S.won[1]);
    if (S.mode === 'mus') a.push(...S.disc, ...S.newDisc);
    if (S.mode === 'chinchon') a.push(...S.pile);
    return a;
  }
  return { X, CARDS, RANKS, SUIT, RN, name, create, need, act, ai, allCards, pts, STR, trickWin, bTeam, bSena, swapCard, mv, jPts, paresOf, mSena, PARN, LN, SAY, best, isChin, closeWith, cv, eligOf };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BJ;
