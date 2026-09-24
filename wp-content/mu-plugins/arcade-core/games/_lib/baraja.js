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

/* =================================================================== INTERFAZ =================================================================== */
if (typeof window !== 'undefined' && window.Kit && window.CFG) (() => {
  const MODE = CFG.mode || 'brisca', PORT = innerHeight > innerWidth;
  const W = PORT ? 540 : 960, H = PORT ? 960 : 540;
  const k = Kit({ w: W, h: H, title: CFG.title, bg: '#0b3a28' }), c = k.ctx, OUT = ART.OUT, TAU = Math.PI * 2;
  const SC = ['#e3a21a', '#d5303e', '#2f6fc0', '#3f8a3a'], SCD = SC.map((x) => ART.dark(x, 0.25));
  const CW = PORT ? 78 : 82, CH = Math.round(CW * 1.55), TW = PORT ? 66 : 66, SW = PORT ? 40 : 44, RW = PORT ? 50 : 54;
  const FONT = 'ui-rounded,"Trebuchet MS",system-ui,sans-serif';
  const LVKEY = 'cpu:' + CFG.id;
  const lvlGet = () => { try { return Math.min(4, +localStorage.getItem(LVKEY) || 0); } catch (e) { return 0; } };

  /* ------------------------------------------------ Dibujo de cartas (espacio 100 × 155) */
  function fo(g, fill, lw) { g.fillStyle = fill; g.fill(); g.lineWidth = lw || 1.7; g.strokeStyle = OUT; g.stroke(); }
  function ell(g, x, y, rx, ry, fill, rot, lw) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); fo(g, fill, lw); }
  function poly(g, pts, fill, lw) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); fo(g, fill, lw); }
  function circ(g, x, y, r, fill, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); fo(g, fill, lw); }
  function lg(g, x0, y0, x1, y1, a, b) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
  function rrf(g, x, y, w, h, r, fill, lw) { ART.rr(g, x, y, w, h, r); fo(g, fill, lw); }
  function sym(g, s, x, y, z, rot) {
    g.save(); g.translate(x, y); if (rot) g.rotate(rot); const lw = Math.max(0.9, z * 0.1); g.lineJoin = 'round';
    if (s === 0) {
      g.beginPath(); g.arc(0, 0, z, 0, TAU); const gr = g.createRadialGradient(-z * 0.35, -z * 0.35, z * 0.1, 0, 0, z); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.6, '#f5c542'); gr.addColorStop(1, '#d08a12'); fo(g, gr, lw);
      g.beginPath(); g.arc(0, 0, z * 0.72, 0, TAU); g.lineWidth = lw * 0.8; g.strokeStyle = '#b06e0c'; g.stroke();
      g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? z * 0.24 : z * 0.5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fillStyle = '#e0961a'; g.fill(); g.lineWidth = lw * 0.6; g.strokeStyle = '#9a5a08'; g.stroke();
      g.beginPath(); g.arc(0, 0, z * 0.17, 0, TAU); g.fillStyle = '#fff0a0'; g.fill();
      g.beginPath(); g.arc(-z * 0.42, -z * 0.42, z * 0.13, 0, TAU); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill();
    } else if (s === 1) {
      poly(g, [[-z * 0.13, z * 0.3], [-z * 0.42, z * 0.8], [z * 0.42, z * 0.8], [z * 0.13, z * 0.3]], lg(g, -z * 0.4, 0, z * 0.4, 0, '#ffe07a', '#d09a1c'), lw);
      ell(g, 0, z * 0.83, z * 0.48, z * 0.13, '#f2c14e', 0, lw); ell(g, 0, z * 0.36, z * 0.17, z * 0.09, '#f2c14e', 0, lw);
      g.beginPath(); g.moveTo(-z * 0.68, -z * 0.62); g.bezierCurveTo(-z * 0.68, z * 0.05, -z * 0.3, z * 0.28, 0, z * 0.28); g.bezierCurveTo(z * 0.3, z * 0.28, z * 0.68, z * 0.05, z * 0.68, -z * 0.62); g.closePath(); fo(g, lg(g, -z * 0.6, -z * 0.6, z * 0.6, z * 0.3, '#ff7c7c', '#b51c2c'), lw);
      g.beginPath(); g.moveTo(-z * 0.62, -z * 0.22); g.quadraticCurveTo(0, -z * 0.04, z * 0.62, -z * 0.22); g.lineWidth = lw * 1.5; g.strokeStyle = '#f2c14e'; g.stroke();
      ell(g, 0, -z * 0.62, z * 0.68, z * 0.17, '#f2c14e', 0, lw); g.beginPath(); g.ellipse(0, -z * 0.62, z * 0.5, z * 0.08, 0, 0, TAU); g.fillStyle = '#7d1020'; g.fill();
      g.beginPath(); g.ellipse(-z * 0.36, -z * 0.28, z * 0.07, z * 0.2, 0.3, 0, TAU); g.fillStyle = 'rgba(255,255,255,.6)'; g.fill();
    } else if (s === 2) {
      poly(g, [[0, -z], [z * 0.15, -z * 0.8], [z * 0.12, z * 0.36], [-z * 0.12, z * 0.36], [-z * 0.15, -z * 0.8]], lg(g, -z * 0.15, 0, z * 0.15, 0, '#ffffff', '#93acd0'), lw);
      g.beginPath(); g.moveTo(0, -z * 0.82); g.lineTo(0, z * 0.32); g.lineWidth = lw * 0.5; g.strokeStyle = '#6f88b0'; g.stroke();
      rrf(g, -z * 0.52, z * 0.33, z * 1.04, z * 0.15, z * 0.07, '#3d7fd0', lw); circ(g, -z * 0.55, z * 0.405, z * 0.1, '#f2c14e', lw * 0.8); circ(g, z * 0.55, z * 0.405, z * 0.1, '#f2c14e', lw * 0.8);
      rrf(g, -z * 0.09, z * 0.48, z * 0.18, z * 0.34, z * 0.05, '#7a4a24', lw); circ(g, 0, z * 0.9, z * 0.12, '#f2c14e', lw);
    } else {
      g.beginPath(); g.moveTo(-z * 0.1, z * 0.95); g.quadraticCurveTo(-z * 0.2, z * 0.1, -z * 0.34, -z * 0.62); g.quadraticCurveTo(-z * 0.3, -z * 0.98, 0, -z * 0.98); g.quadraticCurveTo(z * 0.3, -z * 0.98, z * 0.34, -z * 0.62); g.quadraticCurveTo(z * 0.2, z * 0.1, z * 0.1, z * 0.95); g.quadraticCurveTo(0, z * 1.03, -z * 0.1, z * 0.95); g.closePath();
      fo(g, lg(g, -z * 0.3, 0, z * 0.3, 0, '#e8ac6a', '#8a5424'), lw);
      ell(g, -z * 0.33, -z * 0.16, z * 0.11, z * 0.07, '#a8692f', -0.5, lw * 0.8); ell(g, z * 0.27, z * 0.22, z * 0.1, z * 0.06, '#a8692f', 0.5, lw * 0.8);
      g.beginPath(); g.moveTo(-z * 0.12, -z * 0.7); g.quadraticCurveTo(-z * 0.06, -z * 0.2, -z * 0.04, z * 0.5); g.lineWidth = lw * 0.5; g.strokeStyle = 'rgba(90,50,20,.55)'; g.stroke();
      g.save(); g.translate(z * 0.2, -z * 0.86); g.rotate(-0.5); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(z * 0.25, -z * 0.17, z * 0.48, 0); g.quadraticCurveTo(z * 0.25, z * 0.17, 0, 0); fo(g, '#5fbf45', lw * 0.8); g.restore();
    }
    g.restore();
  }
  const PIPS = { 2: [[50, 50], [50, 106]], 3: [[50, 42], [50, 78], [50, 114]], 4: [[33, 50], [67, 50], [33, 106], [67, 106]], 5: [[33, 48], [67, 48], [50, 78], [33, 108], [67, 108]],
    6: [[33, 44], [67, 44], [33, 78], [67, 78], [33, 112], [67, 112]], 7: [[33, 40], [67, 40], [50, 60], [33, 84], [67, 84], [33, 114], [67, 114]] };
  function frame(g, s) {
    const x0 = 8, y0 = 8, x1 = 92, y1 = 147, col = SC[s]; g.strokeStyle = col; g.lineWidth = 2.2; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y1); g.moveTo(x1, y0); g.lineTo(x1, y1); g.stroke();
    for (const y of [y0, y1]) { const cuts = []; for (let i = 1; i <= s; i++) cuts.push(x0 + ((x1 - x0) * i) / (s + 1)); let a = x0; g.beginPath(); for (const cx of cuts) { g.moveTo(a, y); g.lineTo(cx - 4, y); a = cx + 4; } g.moveTo(a, y); g.lineTo(x1, y); g.stroke(); }
  }
  function idx(g, cd) { g.font = `900 17px ${FONT}`; g.fillStyle = SCD[cd.s]; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillText(String(cd.r), 12, 11); g.save(); g.translate(100, 155); g.rotate(Math.PI); g.fillText(String(cd.r), 12, 11); g.restore(); }
  function eyes(g, x, y, d) { g.fillStyle = OUT; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * d, y, 1.15, 0, TAU); g.fill(); } g.fillStyle = 'rgba(255,110,110,.45)'; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * (d + 2.2), y + 3.2, 1.9, 0, TAU); g.fill(); } }
  function smile(g, x, y) { g.beginPath(); g.arc(x, y, 2.4, 0.25, Math.PI - 0.25); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke(); }
  const SKIN = '#f6c7a0';
  function holdSym(g, s, x, y, big) { if (s === 2) sym(g, 2, x, y - 6, big ? 22 : 15, 0.28); else if (s === 3) sym(g, 3, x, y - 4, big ? 22 : 16, 0.2); else sym(g, s, x, y, big ? 10.5 : 8.5); }
  function sota(g, s) {
    const col = SC[s], dk = ART.dark(col, 0.35);
    ell(g, 50, 125, 22, 3, 'rgba(20,12,40,.2)', 0, 0.01);
    rrf(g, 42, 102, 7, 21, 2, dk); rrf(g, 51, 102, 7, 21, 2, dk); ell(g, 45, 124, 6, 2.8, '#3b2414'); ell(g, 55, 124, 6, 2.8, '#3b2414');
    poly(g, [[31, 73], [37, 71], [36, 82], [32, 99], [27, 98]], col); circ(g, 29, 100, 3, SKIN);
    poly(g, [[38, 70], [62, 70], [70, 106], [30, 106]], lg(g, 30, 70, 70, 106, ART.lite(col, 0.25), col));
    g.fillStyle = '#f2c14e'; g.fillRect(35, 87, 30, 4.5); g.strokeStyle = OUT; g.lineWidth = 1.2; g.strokeRect(35, 87, 30, 4.5);
    poly(g, [[62, 71], [69, 64], [71, 57], [66, 56], [64, 62], [58, 71]], col); circ(g, 69, 55, 3, SKIN);
    holdSym(g, s, 71, 46);
    ell(g, 50, 59, 11.5, 11, '#6b3a1e'); ell(g, 50, 70, 9, 3.2, '#fff'); circ(g, 50, 61, 8.3, SKIN); ell(g, 50, 53.5, 8.6, 3.6, '#6b3a1e');
    ell(g, 48, 49.5, 11.5, 4, dk, -0.15); g.beginPath(); g.moveTo(56, 48); g.quadraticCurveTo(63, 40, 68, 35); g.quadraticCurveTo(64, 45, 57, 50.5); g.closePath(); fo(g, '#fff', 1.2);
    eyes(g, 50, 61, 3.2); smile(g, 50, 64);
  }
  function caballo(g, s) {
    const col = SC[s], dk = ART.dark(col, 0.35), coat = ['#f3ead8', '#b0672e', '#e4ded2', '#7c4a26'][s], mane = s === 0 || s === 2 ? '#c9b08a' : ART.dark(coat, 0.45);
    ell(g, 50, 125, 30, 3, 'rgba(20,12,40,.2)', 0, 0.01);
    g.beginPath(); g.moveTo(27, 96); g.quadraticCurveTo(15, 104, 19, 120); g.quadraticCurveTo(24, 110, 30, 101); g.closePath(); fo(g, mane);
    for (const [x, y] of [[29, 104], [36, 106], [62, 104], [69, 104]]) { rrf(g, x, y, 6, 18, 2, coat); rrf(g, x - 0.5, y + 16, 7, 4, 1.5, '#3b2414'); }
    ell(g, 48, 99, 24, 11, coat);
    poly(g, [[60, 96], [70, 76], [80, 78], [72, 100]], coat);
    poly(g, [[62, 92], [70, 73], [75, 72], [67, 94]], mane);
    ell(g, 81, 77, 10, 5.5, coat, 0.55); poly(g, [[74, 70], [75, 63], [79, 70]], coat); g.fillStyle = OUT; g.beginPath(); g.arc(80, 74, 1.1, 0, TAU); g.fill(); g.beginPath(); g.arc(86.5, 81, 0.9, 0, TAU); g.fill();
    rrf(g, 38, 89, 21, 13, 3, col); g.fillStyle = '#f2c14e'; g.fillRect(38.5, 99, 20, 2.5);
    poly(g, [[46, 84], [54, 84], [56, 102], [50, 104]], dk); ell(g, 53, 104, 4.5, 2.5, '#3b2414');
    poly(g, [[42, 63], [58, 63], [57, 87], [43, 87]], lg(g, 42, 63, 58, 87, ART.lite(col, 0.25), col));
    g.fillStyle = '#f2c14e'; g.fillRect(43, 79, 14, 3);
    poly(g, [[57, 65], [64, 59], [66, 51], [62, 50], [59, 57], [54, 65]], col); circ(g, 64, 49, 2.7, SKIN);
    holdSym(g, s, 66, 40);
    circ(g, 50, 55.5, 7.6, SKIN); ell(g, 50, 49.5, 11, 2.8, dk); rrf(g, 44, 41, 12, 8.5, 3, dk); g.beginPath(); g.moveTo(54, 42); g.quadraticCurveTo(60, 36, 63, 33); g.quadraticCurveTo(59, 40, 55, 44); g.closePath(); fo(g, '#f2c14e', 1);
    eyes(g, 50, 55.5, 2.9); smile(g, 50, 58.5);
  }
  function rey(g, s) {
    const col = SC[s], dk = ART.dark(col, 0.4);
    ell(g, 50, 126, 26, 3, 'rgba(20,12,40,.2)', 0, 0.01);
    poly(g, [[33, 71], [67, 71], [79, 125], [21, 125]], dk);
    poly(g, [[37, 71], [63, 71], [70, 125], [30, 125]], lg(g, 30, 71, 70, 125, ART.lite(col, 0.25), col));
    g.fillStyle = '#fff'; g.fillRect(46, 74, 8, 51); g.fillRect(30.5, 119, 39, 6); g.strokeStyle = OUT; g.lineWidth = 1.1; g.strokeRect(46, 74, 8, 51); g.strokeRect(30.5, 119, 39, 6);
    g.fillStyle = OUT; for (let y = 79; y < 118; y += 8) { g.fillRect(49.3, y, 1.6, 2.4); } for (let x = 34; x < 68; x += 7) g.fillRect(x, 121, 1.6, 2.2);
    ell(g, 50, 71.5, 14, 4.8, '#fff'); g.fillStyle = OUT; for (const x of [42, 50, 58]) g.fillRect(x, 70.5, 1.5, 2);
    poly(g, [[37, 74], [30, 86], [35, 97], [41, 93], [39, 82]], col); circ(g, 38, 95, 3, SKIN);
    poly(g, [[63, 74], [70, 86], [65, 97], [59, 93], [61, 82]], col); circ(g, 62, 95, 3, SKIN);
    if (s >= 2) sym(g, s, 64, 84, 20, s === 2 ? 0.05 : 0.12); else sym(g, s, 60, 92, 10.5);
    ell(g, 40.5, 57, 3, 5, '#d8d2c4'); ell(g, 59.5, 57, 3, 5, '#d8d2c4');
    circ(g, 50, 56, 9.8, SKIN);
    g.beginPath(); g.moveTo(40.5, 58); g.quadraticCurveTo(41, 75, 50, 78); g.quadraticCurveTo(59, 75, 59.5, 58); g.quadraticCurveTo(50, 66, 40.5, 58); g.closePath(); fo(g, '#ece6da');
    ell(g, 47, 62, 3.4, 1.5, '#d8d2c4', 0.2, 1); ell(g, 53, 62, 3.4, 1.5, '#d8d2c4', -0.2, 1);
    eyes(g, 50, 55, 3.4);
    poly(g, [[39, 49], [39, 37], [44.5, 43], [50, 33], [55.5, 43], [61, 37], [61, 49]], lg(g, 39, 33, 61, 49, '#ffe58a', '#e0a21e'));
    circ(g, 50, 44.5, 1.9, '#e0304a', 0.8); circ(g, 43.5, 46, 1.4, '#3a7bd5', 0.8); circ(g, 56.5, 46, 1.4, '#3a7bd5', 0.8);
  }
  function drawFace(g, cd) {
    ART.rr(g, 1.5, 1.5, 97, 152, 9); fo(g, lg(g, 0, 0, 0, 155, '#fffdf6', '#f1e8d2'), 3);
    frame(g, cd.s); idx(g, cd);
    if (cd.r >= 10) {
      g.save(); ART.rr(g, 13, 28, 74, 99, 5); g.fillStyle = ART.lite(SC[cd.s], 0.86); g.fill(); g.clip();
      g.fillStyle = ART.lite(SC[cd.s], 0.76); for (let i = -2; i < 12; i++) { g.beginPath(); g.moveTo(13 + i * 10, 28); g.lineTo(13 + i * 10 + 30, 127); g.lineTo(13 + i * 10 + 35, 127); g.lineTo(13 + i * 10 + 5, 28); g.fill(); }
      (cd.r === 10 ? sota : cd.r === 11 ? caballo : rey)(g, cd.s); g.restore();
      ART.rr(g, 13, 28, 74, 99, 5); g.lineWidth = 1.4; g.strokeStyle = SC[cd.s]; g.stroke();
    } else if (cd.r === 1) {
      const gr = g.createRadialGradient(50, 78, 4, 50, 78, 40); gr.addColorStop(0, ART.alpha(ART.lite(SC[cd.s], 0.5), 0.7)); gr.addColorStop(1, ART.alpha(SC[cd.s], 0)); g.fillStyle = gr; g.fillRect(10, 30, 80, 100);
      sym(g, cd.s, 50, 78, cd.s >= 2 ? 40 : 30, cd.s >= 2 ? 0.12 : 0);
    } else PIPS[cd.r].forEach(([x, y], i) => sym(g, cd.s, x, y, cd.s >= 2 ? 15 : 11.5, cd.s >= 2 ? (i % 2 ? 0.22 : -0.22) : 0));
  }
  function drawBack(g) {
    ART.rr(g, 1.5, 1.5, 97, 152, 9); fo(g, lg(g, 0, 0, 100, 155, '#c23a52', '#7a1a2e'), 3);
    g.save(); ART.rr(g, 8, 8, 84, 139, 5); g.clip(); g.strokeStyle = 'rgba(255,225,190,.16)'; g.lineWidth = 1.3; g.beginPath();
    for (let i = -160; i < 260; i += 11) { g.moveTo(i, 0); g.lineTo(i + 155, 155); g.moveTo(i, 155); g.lineTo(i + 155, 0); } g.stroke();
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, 0, 100, 50); g.restore();
    ART.rr(g, 8, 8, 84, 139, 5); g.lineWidth = 2; g.strokeStyle = 'rgba(255,230,190,.8)'; g.stroke();
    circ(g, 50, 77.5, 21, lg(g, 30, 57, 70, 98, '#ffe58a', '#d99a1e'), 2);
    g.save(); g.translate(50, 77.5); g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? 7 : 15; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); fo(g, '#c2361e', 1.2); g.restore();
    circ(g, 50, 77.5, 4.5, '#ffe58a', 1);
    for (const [x, y] of [[18, 18], [82, 18], [18, 137], [82, 137]]) circ(g, x, y, 3.2, '#ffe58a', 1);
  }
  const SPR = {}; let RES = 160;
  function spr(id) { const key = id + '@' + RES; if (SPR[key]) return SPR[key]; const w = RES, h = Math.round(w * 1.55), cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.scale(w / 100, h / 155); if (id === 'back') drawBack(g); else drawFace(g, BJ.CARDS[id]); return (SPR[key] = cv); }
  const URL = {};
  function cardURL(id) { if (URL[id]) return URL[id]; const cv = document.createElement('canvas'); cv.width = 96; cv.height = 149; const g = cv.getContext('2d'); g.scale(0.96, 149 / 155); drawFace(g, BJ.CARDS[id]); let u = cv.toDataURL('image/webp', 0.85); if (!/^data:image\/webp/.test(u)) u = cv.toDataURL('image/png'); return (URL[id] = u); }
  const setRes = () => { RES = Math.max(96, Math.min(230, Math.round(CW * k.scale * (devicePixelRatio || 1)))); };
  setRes(); addEventListener('resize', () => { setRes(); clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });

  /* ------------------------------------------------ Tapete (cacheado) */
  const FELT = (() => { const cv = document.createElement('canvas'); cv.width = W * 1.5; cv.height = H * 1.5; const g = cv.getContext('2d'); g.scale(1.5, 1.5);
    let gr = g.createRadialGradient(W / 2, H * 0.45, 30, W / 2, H * 0.45, Math.max(W, H) * 0.7); gr.addColorStop(0, '#1f7a4c'); gr.addColorStop(1, '#0b3a28'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.07)'; g.fillRect(Math.random() * W, Math.random() * H, 1, 1 + Math.random()); }
    const cx = W / 2, cy = H * (PORT ? 0.46 : 0.45); g.strokeStyle = 'rgba(255,240,200,.1)'; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, W * (PORT ? 0.36 : 0.3), H * (PORT ? 0.2 : 0.26), 0, 0, TAU); g.stroke();
    g.setLineDash([6, 8]); g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy, W * (PORT ? 0.33 : 0.28), H * (PORT ? 0.18 : 0.23), 0, 0, TAU); g.stroke(); g.setLineDash([]);
    gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return cv; })();

  /* ------------------------------------------------ Estado de la interfaz */
  const OPTS = {
    brisca: [{ k: 'n', l: 'Jugadores', v: [2, 4], t: (v) => (v === 2 ? '2 · mano a mano' : '4 · por parejas') }, { k: 'target', l: 'Partida', v: [2, 1, 3], t: (v) => `a ${v} juego${v > 1 ? 's' : ''}` }, { k: 'cambio', l: 'Cambiar el 7 / el 2', v: [true, false], t: (v) => (v ? 'Sí' : 'No') }],
    mus: [{ k: 'target', l: 'Partida', v: [40, 20], t: (v) => (v === 40 ? 'a 40 piedras' : 'corta · a 20') }, { k: 'senas', l: 'Señas del compañero', v: [true, false], t: (v) => (v ? 'Sí' : 'No') }],
    chinchon: [{ k: 'n', l: 'Jugadores', v: [2, 3, 4], t: (v) => `${v} jugadores` }, { k: 'target', l: 'Eliminación', v: [100, 50], t: (v) => (v === 100 ? 'a 100 puntos' : 'corta · a 50') }],
  }[MODE];
  let SET = {}; OPTS.forEach((o) => (SET[o.k] = o.v[0]));
  try { const sv = JSON.parse(localStorage.getItem('baraja:' + CFG.id) || '{}'); OPTS.forEach((o) => { if (o.v.some((v) => v === sv[o.k])) SET[o.k] = sv[o.k]; }); } catch (e) { /* sin almacenamiento */ }
  let S = null, ui = 'setup', row = 0, t = 0, thinkT = 0, waitT = 0, sel = [new Set(), new Set(), new Set(), new Set()], foc = 0, kbd = false, bubbles = [], banner = null, lastNd = '', privT = 0, privSig = {}, hover = null, finished = false;
  const AN = new Map(); let HITS = [], BTN = [];
  const nP = () => (S ? S.n : MODE === 'mus' ? 4 : SET.n || 2);
  const humans = () => (k.party ? k.party.map((q) => q.p) : [0]);
  const isHum = (p) => p >= 0 && (k.party ? k.party.some((q) => q.p === p) : p === 0);
  const privMode = () => !!(k.party && k.privOK);
  const label = (p) => { if (!isHum(p)) return 'CPU ' + (p + 1); if (!k.party) return 'Tú'; const q = k.party.find((x) => x.p === p); return (q && q.name) || 'J' + (p + 1); };
  const teamed = () => S && (MODE === 'mus' || (MODE === 'brisca' && S.n === 4));
  const tname = (t2) => (!k.party ? (t2 === 0 ? 'Nosotros' : 'Ellos') : `${label(t2)} y ${label(t2 + 2)}`);
  function viewer() { if (!S) return -1; if (!k.party) return 0; if (privMode()) return -1; const nd = BJ.need(S); return nd && nd.p >= 0 && isHum(nd.p) ? nd.p : -1; }
  const minN = () => Math.max(2, Math.min(4, humans().length));
  function fixSet() { if (MODE === 'brisca' && humans().length > 2) SET.n = 4; if (MODE === 'chinchon' && SET.n < minN()) SET.n = minN(); }

  /* Asientos: J1 abajo y el resto en sentido contrario a las agujas del reloj (derecha, arriba, izquierda). */
  const CX = W / 2, CY = H * (PORT ? 0.46 : 0.45);
  const PL = PORT ? { b: [CX, H - CH / 2 - 14], r: [W - 52, H * 0.4], t: [CX, 118], l: [52, H * 0.4] } : { b: [CX, H - CH / 2 - 12], r: [W - 66, CY - 18], t: [CX, 64], l: [66, CY - 18] };
  const seatOf = (p) => (nP() === 2 ? ['b', 't'] : nP() === 3 ? ['b', 'r', 'l'] : ['b', 'r', 't', 'l'])[p];
  const DIR = { b: [0, 1], r: [1, 0], t: [0, -1], l: [-1, 0] };
  const DECK = PORT ? [CX - 172, CY + 176] : [CX - (MODE === 'mus' ? 336 : 250), CY + 4], DISC = PORT ? [CX + 172, CY + 176] : [CX + (MODE === 'mus' ? 336 : 250), CY + 4];
  const STOCK = [CX - 58, CY], PILE = [CX + 58, CY];
  const handY = H - CH / 2 - 12, handTop = handY - CH / 2;

  /* ------------------------------------------------ Partida */
  function startMatch() {
    fixSet(); try { localStorage.setItem('baraja:' + CFG.id, JSON.stringify(SET)); } catch (e) { /* nada */ }
    S = BJ.create(MODE, Object.assign({ lvl: lvlGet() }, SET)); ui = 'game'; finished = false; AN.clear(); bubbles = []; sel.forEach((q) => q.clear()); thinkT = 0; waitT = 0; privSig = {}; foc = 0;
    events(); k.sfx('start');
  }
  function reset() { startMatch(); }
  function events() {
    if (!S) return; const E = S.ev.splice(0);
    for (const e of E) {
      if (e.t === 'deal' || e.t === 'redeal') { dealAnim(e.t === 'redeal'); k.sfx('pop'); sel.forEach((q) => q.clear()); if (e.t === 'deal') bubbles = []; }
      else if (e.t === 'play' || e.t === 'discard') { k.sfx('click'); if (e.t === 'discard' && e.cs) e.cs.forEach((cd) => { const a = AN.get(cd.id); if (a) a.lift = 0; }); }
      else if (e.t === 'draw') k.sfx('pop');
      else if (e.t === 'trick') { const [x, y] = seatXY(e.p); k.sfx(e.pts >= 10 ? 'coin' : 'pop'); if (e.pts) { k.float('+' + e.pts, CX + (x - CX) * 0.35, CY + (y - CY) * 0.35, '#ffe27a'); if (e.pts >= 10) k.burst(CX, CY, '#ffe27a', 14, 150); } }
      else if (e.t === 'say') say(e.p, e.txt, e.big);
      else if (e.t === 'swap') { say(e.p, `Cambia el ${e.c.r}`); k.sfx('coin'); }
      else if (e.t === 'lance') { banner = { txt: BJ.LN[e.L], t: 1.4 }; k.sfx('tick'); }
      else if (e.t === 'info') banner = { txt: e.txt, t: 1.8 };
      else if (e.t === 'pts') { const [x, y] = teamXY(e.team); k.float(`+${e.v}`, x, y + 30, '#ffe27a'); }
      else if (e.t === 'hand' || e.t === 'reveal' || e.t === 'close' || e.t === 'null') { waitT = 0; k.sfx(e.t === 'close' ? 'win' : 'coin'); if (e.t === 'close') { const [x, y] = seatXY(e.p); k.burst(x, y, '#7cf7a0', 20, 170); say(e.p, e.v < 0 ? '¡Cierro con todo!' : 'Cierro'); } }
      else if (e.t === 'chinchon') { k.confetti(); k.sfx('fanfare'); k.flash('rgba(255,240,160,.5)'); say(e.p, '¡Chinchón!', true); }
      else if (e.t === 'out') { const [x, y] = seatXY(e.p); k.float('Eliminado', x, y, '#ff8a8a'); k.sfx('hurt'); }
      else if (e.t === 'end') finish();
    }
  }
  function say(p, txt, big) { bubbles = bubbles.filter((b) => b.p !== p); bubbles.push({ p, txt, t: big ? 2.4 : 1.7, big }); if (big) { k.shake(8); k.flash('rgba(255,90,90,.35)'); k.sfx('explode'); } else k.sfx('click'); }
  function dealAnim(re) { let i = 0; const [dx, dy] = MODE === 'chinchon' ? STOCK : DECK; for (const h of S.hands) for (const cd of h) { let a = AN.get(cd.id); if (!a || !re) { a = { x: dx, y: dy, r: 0, w: TW, up: false, f: 0, lift: 0 }; AN.set(cd.id, a); } if (!re) a.delay = 0.1 + (i++) * (MODE === 'brisca' ? 0.09 : 0.06); } }
  function finish() {
    if (finished) return; finished = true; for (const p of humans()) k.priv(p, null);
    const humWin = MODE === 'chinchon' || (MODE === 'brisca' && S.n === 2) ? humans().includes(S.winner) : humans().some((p) => p % 2 === S.winner);
    let lv = lvlGet(); try { if (humWin) localStorage.setItem(LVKEY, String(Math.min(8, (+localStorage.getItem(LVKEY) || 0) + 1))); } catch (e) { /* nada */ }
    if (humWin) k.best(CFG.id, lv + 1);
    if (MODE === 'chinchon') {
      const rows = S.score.map((v, p) => ({ p, name: label(p), score: p === S.winner ? Math.min(v, -1000 + v) : v }));
      k.podium(rows, { asc: true, head: S.chinchon ? `¡Chinchón de ${label(S.winner)}!` : `¡Gana ${label(S.winner)}!`, fmt: (v) => (v < -500 ? `${v + 1000} pts · gana` : `${v} pts${v > S.target ? ' · eliminado' : ''}`) });
    } else if (teamed()) {
      const sc = MODE === 'mus' ? S.score : S.games;
      k.podium([0, 1, 2, 3].map((p) => ({ p, name: label(p), score: sc[p % 2] + (p % 2 === S.winner ? 0.001 : 0) })), { head: `¡Gana ${tname(S.winner)}!`, fmt: (v) => { const f = Math.floor(v); return `${f} ${MODE === 'mus' ? (f === 1 ? 'piedra' : 'piedras') : f === 1 ? 'juego' : 'juegos'}`; }, noTie: true });
    } else k.podium([0, 1].map((p) => ({ p, name: label(p), score: S.games[p] })), { head: `¡Gana ${label(S.winner)}!`, fmt: (v) => `${v} juego${v === 1 ? '' : 's'}` });
  }
  const seatXY = (p) => PL[seatOf(p)];
  const teamXY = (tm) => (teamed() ? seatXY(tm) : seatXY(tm));

  /* ------------------------------------------------ Acciones del humano */
  function doAct(p, v) {
    if (!S) return false; const nd = BJ.need(S); if (!nd || nd.p !== p) return false;
    if (typeof v === 'string' && v.startsWith('t:')) { const id = +v.slice(2); if (sel[p].has(id)) sel[p].delete(id); else if (sel[p].size < 4) sel[p].add(id); k.sfx('click'); return true; }
    if (v === 'disc') { if (!sel[p].size) return false; const ok = BJ.act(S, p, { a: 'discard', ids: [...sel[p]] }); sel[p].clear(); events(); return ok; }
    const ok = BJ.act(S, p, v); if (ok) { thinkT = 0; events(); } return ok;
  }
  /* Opciones del jugador p: cartas tocables y botones. */
  function options(p) {
    const nd = S && BJ.need(S), out = { cards: new Map(), btns: [], text: '' }; if (!nd) return out;
    const mine = nd.p === p, who = label(nd.p);
    if (nd.p === -1) { out.text = MODE === 'brisca' && nd.kind === 'collect' ? 'Baza…' : 'Fin de la mano'; if (nd.kind === 'next' && isHum(p)) out.btns.push({ v: 'next', l: S.over ? 'Ver resultado' : 'Siguiente mano', col: '#7cf7a0' }); return out; }
    if (!mine) { out.text = MODE === 'mus' && nd.kind === 'bet' ? `${BJ.LN[nd.L]}: habla ${who}` : `Turno de ${who}`; return out; }
    if (MODE === 'brisca') { nd.legal.forEach((a) => a.startsWith('c:') && out.cards.set(+a.slice(2), a)); if (nd.legal.includes('swap')) { const sc = BJ.swapCard(S, p); out.btns.push({ v: 'swap', l: `Cambiar el ${sc.r}`, col: '#ffd166' }); } out.text = 'Tu turno: juega una carta'; }
    if (MODE === 'mus') {
      if (nd.kind === 'mus') { out.btns.push({ v: 'mus', l: 'Mus', col: '#7cf7a0' }, { v: 'nomus', l: 'No hay mus', col: '#ff9a8a' }); out.text = '¿Mus o no hay mus?'; }
      else if (nd.kind === 'discard') { S.hands[p].forEach((cd) => out.cards.set(cd.id, 't:' + cd.id)); out.btns.push({ v: 'disc', l: `Descartar ${sel[p].size || ''}`.trim(), col: '#ffd166', off: !sel[p].size }); out.text = 'Marca de 1 a 4 cartas para cambiar'; }
      else { const L = BJ.LN[nd.L]; const lab = { paso: 'Paso', envido: 'Envido 2', env5: 'Envido 5', ordago: 'Órdago', quiero: 'Quiero', noquiero: 'No quiero', sube: 'Dos más' }, col = { ordago: '#ff5a5f', quiero: '#7cf7a0', noquiero: '#ff9a8a', paso: '#cfd6e6' };
        nd.legal.forEach((a) => out.btns.push({ v: a, l: lab[a], col: col[a] || '#ffd166' })); out.text = nd.stake === 0 ? `${L}: ¿envidas?` : nd.stake === 'O' ? `${L}: ¡te echan órdago!` : `${L}: te envidan ${nd.stake}`; }
    }
    if (MODE === 'chinchon') {
      if (nd.kind === 'draw') { out.btns.push({ v: 'stock', l: 'Robar del mazo', col: '#ffd166' }); if (nd.legal.includes('pile')) out.btns.push({ v: 'pile', l: 'Coger descarte', col: '#7cf7a0' }); out.text = 'Roba una carta'; }
      else { nd.legal.forEach((a) => a.startsWith('c:') && out.cards.set(+a.slice(2), a)); if (nd.legal.includes('close')) out.btns.push({ v: 'close', l: 'Cerrar', col: '#7cf7a0' }); out.text = nd.legal.includes('close') ? 'Descarta una carta o cierra' : 'Descarta una carta'; }
    }
    return out;
  }
  /* Orden de la mano en pantalla (y en el móvil). */
  function sorted(p) {
    const h = S.hands[p].slice();
    if (MODE === 'brisca') return h.sort((a, b) => (a.s === S.ts) - (b.s === S.ts) || a.s - b.s || BJ.STR[a.r] - BJ.STR[b.r]);
    if (MODE === 'mus') return h.sort((a, b) => BJ.mv(b.r) - BJ.mv(a.r) || a.s - b.s);
    const b = BJ.best(h); return b.melds.flat().concat(b.loose.sort((x, y) => x.s - y.s || x.i - y.i));
  }
  function meldGroups(p) { if (MODE !== 'chinchon') return null; const b = BJ.best(S.hands[p]), m = new Map(); b.melds.forEach((g, i) => g.forEach((cd) => m.set(cd.id, i))); return m; }

  /* ------------------------------------------------ Mensajes privados al móvil (modo tele) */
  function status(p) {
    const o = options(p); let txt = o.text;
    if (MODE === 'brisca') txt += ` · Triunfo: ${BJ.SUIT[S.ts]}`;
    if (S.senas !== false && teamed() && S.phase !== 'reveal') { const mate = (p + 2) % 4; const sn = MODE === 'mus' ? (S.phase === 'lance' ? BJ.mSena(S.hands[mate]) : null) : BJ.bSena(S, mate); if (sn) txt += ` · Seña de ${label(mate)}: ${sn}`; }
    return { o, txt };
  }
  function sendPrivs(force) {
    if (!privMode() || !S || finished) return;
    for (const p of humans()) {
      if (p >= S.n) { if (privSig[p] !== 'x') { k.priv(p, { title: 'Mirando', text: 'Esta partida ya tiene todas las plazas. Entras en la próxima.', items: [] }); privSig[p] = 'x'; } continue; }
      const { o, txt } = status(p), gm = meldGroups(p);
      const items = sorted(p).map((cd) => { const v = o.cards.get(cd.id); return { v: v || 'x' + cd.id, img: cardURL(cd.id), off: !v, sub: sel[p].has(cd.id) ? 'Descarte' : gm && gm.has(cd.id) ? 'Ligada' : '' }; });
      o.btns.forEach((b) => items.push({ v: b.v, label: b.l, col: b.col, off: !!b.off }));
      const sig = txt + '|' + items.map((i) => i.v + (i.off ? 0 : 1) + (i.sub || '') + (i.label || '')).join(',');
      if (!force && privSig[p] === sig) continue; privSig[p] = sig;
      k.priv(p, { title: `${label(p)} · ${CFG.title}`, text: txt, items });
    }
  }
  k.onPick = (p, v) => { if (ui === 'game' && S && typeof v === 'string') { if (v === 'next') { const nd = BJ.need(S); if (nd && nd.p === -1 && nd.kind === 'next') { BJ.act(S, -1, 'next'); events(); } return; } doAct(p, v); sendPrivs(); } };
  k.onParty = () => { privSig = {}; fixSet(); if (!k.party) sel.forEach((q) => q.clear()); if (S) sendPrivs(true); };

  /* ------------------------------------------------ Bucle */
  function update(dt) {
    t += dt;
    if (!k.gate(reset)) return;
    if (ui === 'setup') return setupUpdate();
    events(); if (!S) return;
    const nd = BJ.need(S);
    const sig = nd ? nd.p + nd.kind + (nd.legal || []).length + S.phase : 'end'; if (sig !== lastNd) { lastNd = sig; foc = 0; thinkT = 0; }
    bubbles.forEach((b) => (b.t -= dt)); bubbles = bubbles.filter((b) => b.t > 0); if (banner && (banner.t -= dt) <= 0) banner = null;
    if (!nd) return;
    if (nd.p === -1) {
      waitT += dt;
      if (nd.kind === 'collect' ? waitT > 1.15 : waitT > (k.party ? 14 : 30) || anyA()) { BJ.act(S, -1, nd.legal[0]); waitT = 0; events(); }
      else if (nd.kind === 'next') input(-1, nd);
    } else if (!isHum(nd.p)) {
      if (!thinkT) thinkT = MODE === 'mus' && nd.kind === 'bet' ? 0.95 : MODE === 'chinchon' && nd.kind === 'draw' ? 0.5 : 0.7 + Math.random() * 0.35;
      if ((thinkT -= dt) <= 0) { thinkT = 0; const a = BJ.ai(S, nd.p); if (!BJ.act(S, nd.p, a)) BJ.act(S, nd.p, nd.legal[0] === 'discard' ? { a: 'discard', ids: [S.hands[nd.p][0].id] } : nd.legal[0]); events(); }
    } else input(nd.p, nd);
    if ((privT -= dt) <= 0) { privT = 0.12; sendPrivs(); }
  }
  const anyA = () => k.hit.has('a') || (!!k.party && k.party.some((q) => k.phit(q.p, 'a')));
  /* Entrada local: táctil/ratón + teclado o mando (flechas y A). En la tele con móviles, cada humano elige en su móvil. */
  function input(p, nd) {
    const v = viewer(), local = p === -1 ? true : v === p;
    if (!local) return;
    const foci = HITS.filter((h) => h.v && !h.off);
    if (k.tap || (k.ptr.up && !k.swipe)) { kbd = false; const h = hitAt(k.ptr.x, k.ptr.y); if (h && h.v && !h.off) press(p, h.v); return; }
    const kp = p === -1 ? null : p, hit = (key) => (kp == null ? k.hit.has(key) || (!!k.party && k.party.some((q) => k.phit(q.p, key))) : k.party ? k.phit(kp, key) : k.hit.has(key));
    if (!foci.length) return;
    if (hit('left') || hit('right') || hit('up') || hit('down')) {
      if (!kbd) { kbd = true; foc = 0; }
      else { const d = hit('left') || hit('up') ? -1 : 1; if (hit('up') || hit('down')) { const cur = foci[foc % foci.length], grp = cur && cur.btn; const j = foci.findIndex((h) => !!h.btn !== !!grp); if (j >= 0) foc = j; } else foc = (foc + d + foci.length) % foci.length; }
      k.sfx('click');
    }
    if (hit('a')) { if (!kbd) { kbd = true; foc = 0; k.sfx('click'); return; } const h = foci[foc % foci.length]; if (h) press(p, h.v); }
    if (hit('b') && MODE === 'mus' && nd.kind === 'discard' && sel[p].size) press(p, 'disc');
  }
  function press(p, v) {
    if (v === 'next') { const nd = BJ.need(S); if (nd && nd.kind === 'next') { BJ.act(S, -1, 'next'); events(); } return; }
    if (v === 'deck') v = 'stock';
    if (!doAct(p, v)) k.sfx('hit');
  }
  function hitAt(x, y) { for (let i = HITS.length - 1; i >= 0; i--) { const h = HITS[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; }

  /* ------------------------------------------------ Menú inicial (opciones de la partida) */
  function setupRects() {
    const pw = PORT ? 460 : 520, rh = 58, top = PORT ? 300 : 150, x0 = CX - pw / 2;
    return { pw, rh, top, x0, rows: OPTS.map((o, i) => ({ x: x0 + 14, y: top + 64 + i * (rh + 10), w: pw - 28, h: rh })), go: { x: CX - 110, y: top + 64 + OPTS.length * (rh + 10) + 8, w: 220, h: 56 } };
  }
  function cycle(i, d) { const o = OPTS[i], j = o.v.indexOf(SET[o.k]); SET[o.k] = o.v[(j + d + o.v.length) % o.v.length]; fixSet(); k.sfx('click'); }
  function setupUpdate() {
    fixSet(); const R = setupRects(), any = (key) => k.hit.has(key) || (!!k.party && k.party.some((q) => k.phit(q.p, key)));
    if (any('up')) { row = (row + OPTS.length) % (OPTS.length + 1); k.sfx('click'); }
    if (any('down')) { row = (row + 1) % (OPTS.length + 1); k.sfx('click'); }
    if (row < OPTS.length && (any('left') || any('right'))) cycle(row, any('left') ? -1 : 1);
    if (any('a')) { if (row < OPTS.length) cycle(row, 1); else startMatch(); return; }
    if (k.tap) { const { x, y } = k.ptr; const g = R.go; if (x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) return startMatch();
      R.rows.forEach((r, i) => { if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { row = i; cycle(i, x < r.x + r.w * 0.45 && x < r.x + 60 ? -1 : 1); } }); }
  }

  /* ------------------------------------------------ Dibujo */
  function label2(s, x, y, size, col, align, base) { c.font = `800 ${size}px ${FONT}`; c.textAlign = align || 'center'; c.textBaseline = base || 'middle'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
  function pill(x, y, w, h, fill, txt, size, tcol) { ART.rr(c, x, y + 3, w, h, h / 2.4); c.fillStyle = OUT; c.fill(); ART.rr(c, x, y, w, h, h / 2.4); ART.fillOut(c, fill, 2.5); c.fillStyle = 'rgba(255,255,255,.35)'; ART.rr(c, x + 6, y + 3, w - 12, h * 0.28, h / 5); c.fill(); if (txt) { c.font = `800 ${size || 17}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = tcol || OUT; c.fillText(txt, x + w / 2, y + h / 2 + 1); } }
  function card(id, x, y, w, r, up, o) {
    o = o || {}; const h = w * 1.55; c.save(); c.translate(x, y); if (r) c.rotate(r); if (o.sx != null) c.scale(o.sx, 1);
    c.fillStyle = 'rgba(10,6,24,.3)'; ART.rr(c, -w / 2 + 2, -h / 2 + 4, w, h, w * 0.09); c.fill();
    c.drawImage(spr(up ? id : 'back'), -w / 2, -h / 2, w, h);
    if (o.dim) { c.fillStyle = 'rgba(10,20,30,.38)'; ART.rr(c, -w / 2, -h / 2, w, h, w * 0.09); c.fill(); }
    if (o.hl) { ART.rr(c, -w / 2 - 2, -h / 2 - 2, w + 4, h + 4, w * 0.1); c.lineWidth = 3.5; c.strokeStyle = o.hl; c.stroke(); }
    if (o.tag) { const tw = w * 0.9; ART.rr(c, -tw / 2, h / 2 - 18, tw, 16, 6); c.fillStyle = o.tagc || '#ff5a5f'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); c.font = `800 11px ${FONT}`; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.tag, 0, h / 2 - 10); }
    c.restore();
  }
  /* Posiciones objetivo de las 40 cartas; la animación las persigue. */
  function layout() {
    const T = new Map(), v = viewer(), rev = S.phase === 'reveal' || S.phase === 'end', o = v >= 0 ? options(v) : null, gm = v >= 0 ? meldGroups(v) : null;
    HITS = []; BTN = [];
    const put = (cd, x, y, w, r, up, z, extra) => T.set(cd.id, Object.assign({ x, y, w, r: r || 0, up, z }, extra || {}));
    const hr = (id) => ((id * 7919) % 100) / 100 - 0.5;
    if (MODE === 'brisca') {
      S.deck.forEach((cd, i) => (i === 0 && S.deck.length ? put(cd, DECK[0] + 34, DECK[1], TW, Math.PI / 2, true, 0) : put(cd, DECK[0] - i * 0.35, DECK[1] - i * 0.35, TW, 0, false, 1 + i)));
      [0, 1].forEach((tm) => { const [x, y] = wonXY(tm); S.won[tm].forEach((cd, i) => put(cd, x, y - i * 0.3, SW, 0.3 * (tm ? -1 : 1), false, 1 + i)); });
      S.trick.forEach((q, i) => { const [dx, dy] = DIR[seatOf(q.p)]; put(q.c, CX + dx * (PORT ? 70 : 92) + hr(q.c.id) * 10, CY + dy * (PORT ? 74 : 62) + hr(q.c.id + 3) * 8, TW + 6, hr(q.c.id) * 0.25, true, 100 + i); });
    }
    if (MODE === 'mus') {
      S.deck.forEach((cd, i) => put(cd, DECK[0] - i * 0.35, DECK[1] - i * 0.35, TW, 0, false, 1 + i));
      S.disc.concat(S.newDisc).forEach((cd, i) => put(cd, DISC[0] + hr(cd.id) * 8, DISC[1] - i * 0.35 + hr(cd.id + 1) * 6, TW, hr(cd.id) * 0.5, false, 1 + i));
    }
    if (MODE === 'chinchon') {
      S.deck.forEach((cd, i) => put(cd, STOCK[0] - i * 0.3, STOCK[1] - i * 0.3, TW + 4, 0, false, 1 + i));
      S.pile.forEach((cd, i) => put(cd, PILE[0] + hr(cd.id) * 6, PILE[1] + hr(cd.id + 1) * 6, TW + 4, hr(cd.id) * 0.22, !(rev && cd === S.closeCard && i === S.pile.length - 1), 1 + i));
      if (!rev && S.phase === 'draw' && v >= 0 && o && o.btns.length) { HITS.push({ x: STOCK[0] - 40, y: STOCK[1] - 60, w: 80, h: 120, v: 'stock', tbl: 1 }); if (S.pile.length) HITS.push({ x: PILE[0] - 40, y: PILE[1] - 60, w: 80, h: 120, v: 'pile', tbl: 1 }); }
    }
    // Manos
    for (let p = 0; p < S.n; p++) {
      const h = S.hands[p]; if (!h.length) continue; const st = seatOf(p);
      if (p === v && !rev) {
        const arr = sorted(p), n = arr.length, avail = W - (PORT ? 24 : 260), sp = Math.min(CW + 8, (avail - CW) / Math.max(1, n - 1));
        let gap = 0; const groups = gm ? arr.map((cd) => (gm.has(cd.id) ? gm.get(cd.id) : -1)) : null;
        const extra = groups ? groups.reduce((a, g, i) => a + (i && g !== groups[i - 1] ? 1 : 0), 0) * 10 : 0;
        const x0 = CX - ((n - 1) * sp + extra) / 2;
        arr.forEach((cd, i) => {
          if (groups && i && groups[i] !== groups[i - 1]) gap += 10;
          const x = x0 + i * sp + gap, act = o.cards.get(cd.id), selc = sel[p].has(cd.id), newc = S.drew && S.drew.c === cd && S.phase === 'discard';
          put(cd, x, handY - (selc ? 24 : 0) - (newc ? 10 : 0), CW, 0, true, 200 + i, { hand: 1, act, dim: o.cards.size && !act && !(MODE === 'mus'), tag: selc ? 'Descarte' : groups && groups[i] >= 0 ? null : null, meld: groups ? groups[i] : -1, fresh: newc });
          HITS.push({ x: x - CW / 2, y: handY - CH / 2 - (selc ? 24 : 0), w: i === n - 1 ? CW : Math.min(CW, sp + (groups && groups[i + 1] !== groups[i] ? 10 : 0)), h: CH, v: act, id: cd.id, off: !act });
        });
      } else {
        const [ax, ay] = PL[st], showUp = rev, w = showUp ? RW : SW, arr = showUp ? revealOrder(p) : h, n = arr.length;
        const vert = !showUp && (st === 'l' || st === 'r'), sp = showUp ? w * 0.66 : Math.min(16, 90 / Math.max(1, n - 1));
        let bx = ax, by = ay; if (showUp) { const half = ((n - 1) * sp + w) / 2 + 6; bx = Math.max(half, Math.min(W - half, ax)); if (st === 'b') by = handY; if (st === 't') by = ay + 14; }
        arr.forEach((cd, i) => { const off = (i - (n - 1) / 2) * sp; put(cd, vert ? bx : bx + off, vert ? by + off : by, w, vert ? Math.PI / 2 : 0, showUp, 150 + i, { loose: showUp && MODE === 'chinchon' && S.tally.find((q) => q.p === p) && S.tally.find((q) => q.p === p).loose.includes(cd) }); });
      }
    }
    return T;
  }
  function revealOrder(p) { if (MODE !== 'chinchon') return sorted(p); const tl = S.tally.find((q) => q.p === p); if (!tl) return sorted(p); const ms = p === S.closer && S.closedMelds ? [] : tl.melds; return ms.flat().concat(tl.laid || [], tl.loose); }
  function wonXY(tm) { const p = tm, st = seatOf(p); const [x, y] = PL[st]; return st === 'b' ? [PORT ? W - 44 : W - 70, handY] : st === 't' ? [x + (PORT ? 150 : 170), y] : [x, y + 80]; }

  function draw() {
    c.drawImage(FELT, 0, 0, W, H);
    if (k.st === 'ready' || ui === 'setup' || !S) return drawShowcase();
    const T = layout(), dt = Math.min(0.05, 1 / 60);
    const list = [];
    for (const [id, tg] of T) {
      let a = AN.get(id); if (!a) { a = { x: tg.x, y: tg.y, r: tg.r, w: tg.w, up: tg.up, f: 0, lift: 0 }; AN.set(id, a); }
      if (a.delay > 0) { a.delay -= dt; list.push([a, tg, id, true]); continue; }
      const f = 1 - Math.exp(-dt * 11); a.x += (tg.x - a.x) * f; a.y += (tg.y - a.y) * f; a.r += (tg.r - a.r) * f; a.w += (tg.w - a.w) * f;
      if (tg.up !== a.up && !(a.f > 0)) { a.f = 1; a.to = tg.up; } if (a.f > 0) { a.f -= dt * 5; if (a.f <= 0.5 && a.up !== a.to) a.up = a.to; if (a.f <= 0) a.f = 0; }
      list.push([a, tg, id, false]);
    }
    const moving = (a, tg) => Math.abs(a.x - tg.x) + Math.abs(a.y - tg.y) > 6;
    list.sort((A, B) => (A[1].z + (moving(A[0], A[1]) && !A[3] ? 400 : 0)) - (B[1].z + (moving(B[0], B[1]) && !B[3] ? 400 : 0)));
    drawTable();
    const v = viewer(), foci = HITS.filter((h) => h.v && !h.off), fh = kbd && foci.length ? foci[foc % foci.length] : null, hv = !kbd && !k.ptr.down ? hitAt(k.ptr.x, k.ptr.y) : null;
    for (const [a, tg, id, wait] of list) {
      if (wait) { if (!list.some((q) => q[2] !== id && q[3] && q[1].z > tg.z)) { /* en el mazo */ } }
      const up = a.f > 0 ? a.up : a.up, sx = a.f > 0 ? Math.max(0.04, Math.abs(Math.cos((1 - a.f) * Math.PI))) : 1;
      const isF = fh && fh.id === id, isH = hv && hv.id === id && hv.v;
      const lift = tg.hand && (isF || isH) ? -12 : 0; a.lift += (lift - a.lift) * 0.3;
      card(id, a.x, a.y + a.lift, a.w, a.r, up, { sx, dim: tg.dim || tg.loose, hl: isF ? '#ffd166' : tg.fresh ? '#7cf7a0' : tg.meld >= 0 && tg.hand ? null : null, tag: tg.tag, tagc: '#ff5a5f' });
      if (tg.hand && tg.meld >= 0 && !(a.f > 0)) { c.fillStyle = ['#7cf7a0', '#ffd166', '#5ce1e6', '#ff9ad5'][tg.meld % 4]; ART.rr(c, a.x - a.w / 2 + 6, a.y + a.lift + CH / 2 + 3, a.w - 12, 5, 2.5); c.fill(); }
    }
    drawSeats(); drawHUD(v);
    for (const b of bubbles) bubble(b);
    if (banner) { const al = Math.min(1, banner.t * 3); c.globalAlpha = al; const w = Math.max(220, banner.txt.length * 13 + 60); pill(CX - w / 2, CY - 26, w, 52, '#fff3c4', banner.txt, 24); c.globalAlpha = 1; }
    if (S.phase === 'reveal' || S.phase === 'hand') drawResult();
  }
  function drawTable() {
    if (MODE === 'brisca') { if (!S.deck.length) { c.globalAlpha = 0.4; label2('Mazo vacío', DECK[0], DECK[1], 15, '#fff'); c.globalAlpha = 1; } else label2(String(S.deck.length), DECK[0], DECK[1] - 72, 16, '#fff3c4');
      const tx = DECK[0] + (PORT ? 112 : 34), ty = DECK[1] + (PORT ? -10 : 60); label2('Triunfo', tx, ty, 14, '#fff3c4'); sym(c, S.ts, tx, ty + 22, 9); }
    if (MODE === 'chinchon') { label2('Mazo', STOCK[0], STOCK[1] + 72, 14, '#fff3c4'); label2('Descarte', PILE[0], PILE[1] + 72, 14, '#fff3c4'); }
    if (MODE === 'mus') {
      const L = S.phase === 'lance' || S.phase === 'reveal' ? S.L : -1, names = ['Grande', 'Chica', 'Pares', S.punto ? 'Punto' : 'Juego'], bw = PORT ? 108 : 118, x0 = CX - (bw * 4 + 18) / 2, y0 = CY - 44;
      names.forEach((nm, i) => { const r = S.res[i], on = i === L && S.phase === 'lance', x = x0 + i * (bw + 6);
        ART.rr(c, x, y0, bw, 88, 14); c.fillStyle = on ? 'rgba(255,243,196,.95)' : 'rgba(10,30,20,.55)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = on ? OUT : 'rgba(255,255,255,.18)'; c.stroke();
        label2(nm, x + bw / 2, y0 + 20, 16, on ? '#ffd166' : '#fff');
        let s2 = ''; if (on && S.bet) s2 = S.bet.stake === 0 ? '…' : S.bet.stake === 'O' ? '¡Órdago!' : `Envite ${S.bet.stake}`;
        else if (r) s2 = r.type === 'paso' ? 'En paso' : r.type === 'querido' ? (r.stake === 'O' ? 'Órdago' : `${r.stake} querido`) : r.type === 'noquerido' ? `No quiero (${r.safe})` : r.type === 'solo' ? 'Sin rival' : 'Nadie';
        if (s2) label2(s2, x + bw / 2, y0 + 50, 15, on ? '#ff5a5f' : '#cfe8d8');
        if (i === 2 && r && S.phase !== 'mus') {} });
      label2(S.phase === 'mus' || S.phase === 'discard' ? (S.rounds ? `Mus · descartes: ${S.rounds}` : 'Mus') : '', CX, y0 - 22, 16, '#fff3c4');
    }
  }
  function badgeXY(p) {
    const st = seatOf(p), [ax, ay] = PL[st]; let bx, by;
    if (st === 'b') { bx = PORT ? 70 : 90; by = viewer() === p && S.phase !== 'reveal' ? handTop - 26 : ay - 70; } else if (st === 't') { bx = ax - (PORT ? 150 : 196); by = ay; } else { bx = ax; by = ay - (PORT ? 86 : 80); }
    if (st === 'b' && PORT && viewer() === p) { bx = 64; by = handTop - 118; }
    return [Math.max(63, Math.min(W - 63, bx)), by];
  }
  function drawSeats() {
    for (let p = 0; p < S.n; p++) {
      const st = seatOf(p), [ax, ay] = PL[st], col = k.pcol(p), hum = isHum(p), nd = BJ.need(S), turn = nd && nd.p === p;
      const [bx, by] = badgeXY(p);
      const w = 118, h = 42; if (turn) { c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6); ART.rr(c, bx - w / 2 - 5, by - h / 2 - 5, w + 10, h + 10, 16); c.fillStyle = col; c.fill(); c.globalAlpha = 1; }
      ART.rr(c, bx - w / 2, by - h / 2 + 3, w, h, 13); c.fillStyle = OUT; c.fill(); ART.rr(c, bx - w / 2, by - h / 2, w, h, 13); ART.fillOut(c, 'rgba(20,24,44,.92)', 2.5);
      circ(c, bx - w / 2 + 20, by, 13, col, 2.5); label2(hum ? (k.party ? 'J' + (p + 1) : '★') : 'IA', bx - w / 2 + 20, by + 1, 11, '#fff');
      label2(label(p), bx - w / 2 + 38, by - 7, 14, '#fff', 'left'); label2(sub(p), bx - w / 2 + 38, by + 10, 11, '#cfe8d8', 'left');
      if (MODE === 'mus' && S.mano === p) { pill(bx + w / 2 - 34, by - h / 2 - 14, 44, 20, '#ffd166', 'Mano', 11); }
      if (MODE === 'chinchon' && S.out[p]) { c.strokeStyle = '#ff5a5f'; c.lineWidth = 4; c.beginPath(); c.moveTo(bx - w / 2, by); c.lineTo(bx + w / 2, by); c.stroke(); }
    }
  }
  function sub(p) {
    if (MODE === 'chinchon') return `${S.score[p]} pts`;
    if (MODE === 'mus') return `Pareja ${p % 2 ? 'B' : 'A'}`;
    if (S.n === 4) return `Pareja ${p % 2 ? 'B' : 'A'}`;
    return `${S.games[p]} juego${S.games[p] === 1 ? '' : 's'}`;
  }
  function drawHUD(v) {
    // Marcador
    const x = 10, y = 10;
    if (MODE === 'mus' || (MODE === 'brisca' && S.n === 4)) {
      const sc = MODE === 'mus' ? S.score : S.games, w = PORT ? 200 : 214; ART.rr(c, x, y, w, 62, 12); ART.fillOut(c, 'rgba(12,18,32,.85)', 2);
      [0, 1].forEach((tm) => { const yy = y + 18 + tm * 26; circ(c, x + 16, yy, 7, k.pcol(tm), 1.5); circ(c, x + 28, yy, 7, k.pcol(tm + 2), 1.5); label2(tname(tm), x + 42, yy, 13, '#fff', 'left'); label2(String(sc[tm]), x + w - 12, yy, 17, '#ffd166', 'right');
        if (MODE === 'mus') { c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x + 42, yy + 9, w - 90, 3); c.fillStyle = k.pcol(tm); c.fillRect(x + 42, yy + 9, (w - 90) * Math.min(1, sc[tm] / S.target), 3); } });
      label2(MODE === 'mus' ? `a ${S.target}` : `a ${S.target} juego${S.target > 1 ? 's' : ''}`, x + w / 2, y + 74, 11, '#cfe8d8');
    } else if (MODE === 'chinchon') { label2(`Eliminación a ${S.target}`, x + 4, y + 10, 13, '#fff3c4', 'left'); }
    else label2(`A ${S.target} juego${S.target > 1 ? 's' : ''}`, x + 4, y + 10, 13, '#fff3c4', 'left');
    // Aviso y botones del jugador que mira la pantalla
    const nd = BJ.need(S); let txt = '', btns = [];
    if (v >= 0) { const o = options(v); txt = o.text; btns = o.btns; }
    else if (nd) { txt = nd.p >= 0 ? (isHum(nd.p) ? `${label(nd.p)}: elige en tu móvil` : `Turno de ${label(nd.p)}`) : ''; if (nd.kind === 'next') { txt = k.party ? 'Pulsa A para seguir' : ''; btns = [{ v: 'next', l: S.over ? 'Ver resultado' : 'Siguiente mano', col: '#7cf7a0' }]; } }
    if (nd && nd.p === -1 && nd.kind === 'next' && v >= 0) btns = [{ v: 'next', l: S.over ? 'Ver resultado' : 'Siguiente mano', col: '#7cf7a0' }];
    if (teamed() && S.senas !== false && v >= 0 && S.phase !== 'reveal' && !isHum((v + 2) % 4)) { const mate = (v + 2) % 4, sn = MODE === 'mus' ? (S.phase === 'lance' ? BJ.mSena(S.hands[mate]) : null) : BJ.bSena(S, mate); if (sn) { const [mx, my] = badgeXY(mate), tw = Math.max(118, sn.length * 7.4 + 56); pill(mx - tw / 2, my + 26, tw, 24, '#b98cff', `Seña: ${sn}`, 12.5, '#fff'); } }
    const by = S.phase === 'reveal' || S.phase === 'hand' ? (PORT ? H * 0.72 : H * 0.8) : v >= 0 ? handTop - 58 : H - 70;
    if (txt) { c.font = `800 16px ${FONT}`; const tw = c.measureText(txt).width + 36; ART.rr(c, CX - tw / 2, (PORT ? 178 : 112) - 17, tw, 34, 17); c.fillStyle = 'rgba(8,14,26,.8)'; c.fill(); label2(txt, CX, PORT ? 178 : 112, 16, '#fff'); }
    if (btns.length) {
      const bw = PORT ? Math.min(150, (W - 30) / btns.length - 8) : 150, tot = btns.length * (bw + 10) - 10; let bx = CX - tot / 2;
      const foci = HITS; for (const b of btns) { const hb = { x: bx, y: by, w: bw, h: 46, v: b.v, off: b.off, btn: 1 }; foci.push(hb); bx += bw + 10; }
      const fl = HITS.filter((h) => h.v && !h.off), fh = kbd && fl.length ? fl[foc % fl.length] : null, hv = !k.ptr.down ? hitAt(k.ptr.x, k.ptr.y) : null;
      btns.forEach((b, i) => { const hb = HITS[HITS.length - btns.length + i]; const on = fh === hb || hv === hb; if (on) { ART.rr(c, hb.x - 4, hb.y - 4, hb.w + 8, hb.h + 11, 18); c.fillStyle = '#fff'; c.fill(); }
        c.globalAlpha = b.off ? 0.45 : 1; pill(hb.x, hb.y, hb.w, hb.h, b.col, b.l, bw < 130 ? 15 : 17); c.globalAlpha = 1; });
    }
  }
  function bubble(b) {
    const [x0, y0] = PL[seatOf(b.p)], st = seatOf(b.p), x = st === 'l' ? x0 + 60 : st === 'r' ? x0 - 60 : x0 + (st === 't' ? 150 : 0), y = st === 'b' ? (viewer() === b.p ? handTop - (PORT ? 172 : 110) : y0 - 120) : st === 't' ? y0 + 70 : y0 - 10;
    const size = b.big ? 26 : 17; c.font = `800 ${size}px ${FONT}`; const w = c.measureText(b.txt).width + 28, h = size + 18, xx = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, x)), s = Math.min(1, (b.big ? 2.4 : 1.7) - b.t < 0.15 ? 0.6 + ((b.big ? 2.4 : 1.7) - b.t) * 2.6 : 1);
    c.save(); c.translate(xx, y); c.scale(s, s); c.globalAlpha = Math.min(1, b.t * 3);
    ART.rr(c, -w / 2, -h / 2, w, h, h / 2); ART.fillOut(c, b.big ? '#ff5a5f' : '#fff', 2.5); c.beginPath(); c.moveTo(-8, h / 2 - 1); c.lineTo(0, h / 2 + 9); c.lineTo(8, h / 2 - 1); c.fillStyle = b.big ? '#ff5a5f' : '#fff'; c.fill();
    c.fillStyle = b.big ? '#fff' : OUT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.txt, 0, 1); c.restore(); c.globalAlpha = 1;
  }
  function drawResult() {
    const lines = [];
    if (MODE === 'brisca') { const nt = 2; for (let tm = 0; tm < nt; tm++) lines.push({ col: teamed() ? k.pcol(tm) : k.pcol(tm), txt: `${teamed() ? tname(tm) : label(tm)}: ${S.pts[tm]} puntos`, v: S.handWin === tm ? '+1 juego' : '' }); if (S.handWin < 0) lines.push({ col: '#fff', txt: 'Empate a 60: nadie suma', v: '' }); }
    if (MODE === 'mus') S.tally.forEach((q) => lines.push({ col: q.team >= 0 ? k.pcol(q.team) : '#fff', txt: `${q.txt}${q.team >= 0 ? ' · ' + tname(q.team) : ''}`, v: q.v === 'Partida' ? '¡Partida!' : q.v ? `+${q.v}${q.pre ? ' (ya)' : ''}` : '' }));
    if (MODE === 'chinchon') S.tally.forEach((q) => lines.push({ col: q.p >= 0 ? k.pcol(q.p) : '#fff', txt: q.p >= 0 ? `${label(q.p)}: ${q.txt || 'suma sueltas'}` : q.txt, v: q.p >= 0 ? `${q.v > 0 ? '+' : ''}${q.v} → ${S.score[q.p]}` : '' }));
    const w = PORT ? 460 : 470, lh = 26, h = 52 + lines.length * lh, x = CX - w / 2, y = (PORT ? CY - 40 : CY - 20) - h / 2;
    ART.rr(c, x, y + 5, w, h, 16); c.fillStyle = OUT; c.fill(); ART.rr(c, x, y, w, h, 16); ART.fillOut(c, 'rgba(18,22,40,.95)', 3);
    label2(MODE === 'brisca' ? `Fin de la mano ${S.hand}` : MODE === 'mus' ? 'Recuento' : 'Cierre de la mano', CX, y + 24, 19, '#ffd166');
    lines.forEach((l, i) => { const yy = y + 52 + i * lh; circ(c, x + 20, yy, 6, l.col, 1.5); label2(l.txt, x + 34, yy, 14.5, '#fff', 'left'); label2(l.v, x + w - 16, yy, 14.5, '#ffd166', 'right'); });
  }
  /* Portada / menú: abanico de cartas sobre el tapete */
  function drawShowcase() {
    const ids = MODE === 'brisca' ? [0, 29, 12, 38, 27] : MODE === 'mus' ? [9, 19, 29, 2] : [23, 24, 25, 26, 27, 28, 29], n = ids.length, cy = ui === 'setup' && k.st === 'play' ? (PORT ? 190 : 72) : CY + 10, w = ui === 'setup' && k.st === 'play' ? (PORT ? 70 : 52) : PORT ? 118 : 118;
    ids.forEach((id, i) => { const a = (i - (n - 1) / 2) * 0.2 + Math.sin(t * 1.3 + i) * 0.02; const x = CX + Math.sin(a) * w * 2.4, y = cy + (1 - Math.cos(a)) * w * 2.4 + (ui === 'setup' && k.st === 'play' ? 0 : -10); card(id, x, y, w, a, true); });
    if (MODE === 'brisca' && k.st === 'ready') card(33, CX - 330 * (PORT ? 0.4 : 1), CY + 40, 90, Math.PI / 2 - 0.1, true);
    if (k.st !== 'play' || ui !== 'setup') return;
    const R = setupRects(); ART.rr(c, R.x0, R.top + 5, R.pw, R.go.y + R.go.h + 20 - R.top, 20); c.fillStyle = OUT; c.fill(); ART.rr(c, R.x0, R.top, R.pw, R.go.y + R.go.h + 20 - R.top, 20); ART.fillOut(c, 'rgba(18,22,40,.94)', 3);
    label2(CFG.title, CX, R.top + 32, 26, '#ffd166');
    R.rows.forEach((r, i) => { const o = OPTS[i], on = row === i; ART.rr(c, r.x, r.y, r.w, r.h, 14); c.fillStyle = on ? 'rgba(255,243,196,.16)' : 'rgba(255,255,255,.05)'; c.fill(); if (on) { c.lineWidth = 2.5; c.strokeStyle = '#ffd166'; c.stroke(); }
      label2(o.l, r.x + 16, r.y + r.h / 2, 15, '#cfe8d8', 'left'); const vx = r.x + r.w - (PORT ? 120 : 130); label2('‹', vx - 72, r.y + r.h / 2, 26, on ? '#ffd166' : '#fff'); label2('›', vx + 72 + (PORT ? 30 : 36), r.y + r.h / 2, 26, on ? '#ffd166' : '#fff'); label2(o.t(SET[o.k]), vx + (PORT ? 15 : 18), r.y + r.h / 2, 17, '#fff'); });
    const g = R.go, on = row === OPTS.length; if (on) { ART.rr(c, g.x - 4, g.y - 4, g.w + 8, g.h + 11, 20); c.fillStyle = '#fff'; c.fill(); } pill(g.x, g.y, g.w, g.h, '#7cf7a0', 'Repartir', 21);
    label2(k.party ? 'Joystick: elegir · A: cambiar / repartir' : 'Toca o usa flechas y Espacio', CX, g.y + g.h + 22, 13, '#cfe8d8');
    if (k.party && humans().length) label2(`Jugáis ${humans().length} con móvil · la CPU rellena el resto`, CX, R.top - 20, 15, '#fff3c4');
  }
  window.__bj = { BJ, W, H, get S() { return S; }, get ui() { return ui; }, get hits() { return HITS; }, get foc() { return foc; }, get finished() { return finished; } }; // para pruebas
  k.run(update, draw);
  k.show(CFG.title, CFG.help);
})();
