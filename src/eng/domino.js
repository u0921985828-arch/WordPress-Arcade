/* domino.js — fichas de dominó. CFG.mode: 'parejas'
 * Reglas (DOM, puras y comprobables en Node con module.exports):
 *  Dominó por parejas (4 jugadores, doble seis de 28 fichas, 7 por cabeza):
 *   - Equipos: J1+J3 contra J2+J4 (p % 2). Se juega en el sentido de las agujas del reloj.
 *   - La primera mano la abre quien tiene el doble seis y está obligado a salir con él; las siguientes las
 *     abre quien ganó la anterior (con la ficha que quiera).
 *   - Arrastre: si tienes ficha que casa con alguna de las dos puntas, estás OBLIGADO a jugarla; solo se
 *     pasa cuando no casa ninguna. No hay pozo para robar.
 *   - Quien se queda sin fichas cierra la mano («dominó») y su pareja se anota los puntos que quedan en
 *     las manos de los dos rivales.
 *   - Cierre (tranca): si los cuatro pasan seguidos, la mano queda cerrada; gana la pareja con menos puntos
 *     en la mano y se anota los puntos de los rivales. Si hay empate a puntos, gana la pareja del jugador
 *     que colocó la última ficha.
 *   - La partida la gana la primera pareja que llega a CFG.target puntos (50 por defecto). */
const DOM = (() => {
  const SET = () => { const t = []; let id = 0; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) t.push({ a, b, id: id++ }); return t; };
  const pips = (t) => t.a + t.b;
  const shuf = (arr, rnd) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const team = (p) => p % 2;

  function create(o) {
    o = o || {};
    const S = { n: 4, target: o.target || 50, lvl: o.lvl || 0, score: [0, 0], hand: 0, starter: -1, over: false, winner: -1, ev: [], rnd: o.rnd || Math.random };
    deal(S); return S;
  }
  function deal(S) {
    const t = shuf(SET(), S.rnd);
    S.hands = [0, 1, 2, 3].map((p) => t.slice(p * 7, p * 7 + 7).sort((x, y) => pips(y) - pips(x) || y.a - x.a));
    S.chain = []; S.ends = [-1, -1]; S.passes = 0; S.last = -1; S.result = null; S.turns = 0;
    S.seen = [new Set(), new Set(), new Set(), new Set()]; /* números que cada jugador ha demostrado no tener */
    if (S.starter < 0) { S.cur = S.hands.findIndex((h) => h.some((x) => x.a === 6 && x.b === 6)); S.forced = true; }
    else { S.cur = S.starter; S.forced = false; }
    S.ev.push({ t: 'deal' });
  }
  /* Jugadas posibles de p: {id, side} con side 'l'|'r' ('r' también para la primera ficha). */
  function legal(S, p) {
    if (S.result || p !== S.cur) return [];
    const h = S.hands[p], out = [];
    if (!S.chain.length) { const fs = S.forced ? h.filter((x) => x.a === 6 && x.b === 6) : h; for (const x of fs) out.push({ id: x.id, side: 'r' }); return out; }
    for (const x of h) {
      if (x.a === S.ends[0] || x.b === S.ends[0]) out.push({ id: x.id, side: 'l' });
      if (x.a === S.ends[1] || x.b === S.ends[1]) out.push({ id: x.id, side: 'r' });
    }
    return out;
  }
  const canPlay = (S, p) => legal(S, p).length > 0;
  function play(S, p, id, side) {
    if (S.result || p !== S.cur) return null;
    if (!legal(S, p).some((m) => m.id === id && m.side === side)) return null;
    const i = S.hands[p].findIndex((x) => x.id === id), t = S.hands[p][i];
    S.hands[p].splice(i, 1); S.passes = 0; S.last = p; S.turns++;
    let pc;
    if (!S.chain.length) { pc = { a: t.a, b: t.b, id: t.id, p }; S.chain.push(pc); S.ends = [t.a, t.b]; }
    else if (side === 'l') { const e = S.ends[0], flip = t.b !== e; pc = { a: flip ? t.b : t.a, b: flip ? t.a : t.b, id: t.id, p }; S.chain.unshift(pc); S.ends[0] = pc.a; }
    else { const e = S.ends[1], flip = t.a !== e; pc = { a: flip ? t.b : t.a, b: flip ? t.a : t.b, id: t.id, p }; S.chain.push(pc); S.ends[1] = pc.b; }
    const ev = { t: 'play', p, tile: t, side, pc, ends: S.ends.slice() }; S.ev.push(ev);
    if (!S.hands[p].length) close(S, 'domino', p); else S.cur = (S.cur + 1) % 4;
    return ev;
  }
  function pass(S, p) {
    if (S.result || p !== S.cur || canPlay(S, p)) return null;
    S.ends.forEach((e) => S.seen[p].add(e)); S.passes++; S.turns++;
    const ev = { t: 'pass', p }; S.ev.push(ev);
    if (S.passes >= 4) close(S, 'cierre', -1); else S.cur = (S.cur + 1) % 4;
    return ev;
  }
  const handPts = (S, p) => S.hands[p].reduce((s, x) => s + pips(x), 0);
  function close(S, kind, p) {
    const tp = [handPts(S, 0) + handPts(S, 2), handPts(S, 1) + handPts(S, 3)];
    let win;
    if (kind === 'domino') win = team(p);
    else win = tp[0] === tp[1] ? team(S.last < 0 ? 0 : S.last) : tp[0] < tp[1] ? 0 : 1;
    const pts = tp[1 - win];
    S.score[win] += pts;
    S.result = { kind, team: win, pts, by: p, tp };
    S.starter = kind === 'domino' ? p : [0, 1, 2, 3].filter((q) => team(q) === win).reduce((a, b) => (handPts(S, a) <= handPts(S, b) ? a : b));
    S.ev.push({ t: 'hand', kind, team: win, pts, by: p, tp: tp.slice() });
    if (S.score[win] >= S.target) { S.over = true; S.winner = win; S.ev.push({ t: 'end', team: win }); }
  }
  function next(S) { if (S.over || !S.result) return false; S.hand++; deal(S); return true; }

  /* ---- IA por reglas: arrastra, conserva variedad, tapa las puntas que el rival no tiene y cuida al compañero.
     lvl 0..3 = cada vez menos despistes (nivel 0 casi al azar entre las jugadas válidas). ---- */
  function aiPick(S, p, lvl, rnd) {
    const ms = legal(S, p); if (!ms.length) return null;
    if (ms.length === 1) return ms[0];
    const noise = [40, 24, 12, 5][Math.max(0, Math.min(3, lvl | 0))];
    const h = S.hands[p], cnt = Array(7).fill(0); for (const x of h) { cnt[x.a]++; if (x.b !== x.a) cnt[x.b]++; }
    const mate = (p + 2) % 4, rivals = [(p + 1) % 4, (p + 3) % 4];
    let best = ms[0], bv = -1e9;
    for (const m of ms) {
      const t = h.find((x) => x.id === m.id), other = S.ends.length && S.chain.length ? (m.side === 'l' ? S.ends[0] : S.ends[1]) : -1;
      const keep = !S.chain.length ? t.a : (t.a === other ? t.b : t.a); /* número que queda en esa punta */
      const openA = S.chain.length ? (m.side === 'l' ? keep : S.ends[0]) : t.a, openB = S.chain.length ? (m.side === 'l' ? S.ends[1] : keep) : t.b;
      let s = pips(t) * 0.5; /* soltar peso es bueno */
      if (t.a === t.b) s += 7 - cnt[t.a] * 1.5; /* los dobles cuestan de colocar: fuera pronto si no tengo apoyo */
      s += (cnt[keep] - (t.a === keep || t.b === keep ? 1 : 0)) * 5; /* dejo una punta que yo domino */
      for (const r of rivals) { if (S.seen[r].has(openA)) s += 6; if (S.seen[r].has(openB)) s += 6; }
      if (S.seen[mate].has(openA)) s -= 7; if (S.seen[mate].has(openB)) s -= 7;
      if (openA === openB) s += 4; /* puntas iguales: mando yo */
      if (h.length === 2) s += pips(t) * 0.8;
      s += (rnd() - 0.5) * noise;
      if (s > bv) { bv = s; best = m; }
    }
    return best;
  }
  return { SET, pips, team, create, deal, legal, canPlay, play, pass, handPts, next, aiPick };
})();
if (typeof module === 'object' && module.exports) module.exports = DOM;
else (function () {
  /* ================= Interfaz ================= */
  const PORT = innerHeight > innerWidth;
  const W = PORT ? 600 : 960, H = PORT ? 920 : 600;
  const k = Kit({ w: W, h: H, title: CFG.title, bg: '#18243a' }), c = k.ctx, OUT = ART.OUT, TAU = Math.PI * 2;
  const FONT = (wt, s) => `${wt} ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  const LK = 'cpu:' + (CFG.id || 'domino');
  const TARGET = CFG.target || 50;
  let lvl = 0; try { lvl = +localStorage.getItem(LK) || 0; } catch (e) { /* sin almacenamiento */ }

  /* Zonas: tablero, panel de marcador y mano propia */
  const HANDH = PORT ? 118 : 104;
  const PANW = PORT ? W - 24 : 246;
  const PANH = PORT ? 152 : H - 24;
  /* en horizontal no hay banda de letterbox: se deja sitio arriba para la pausa y el sonido del reproductor */
  const TOPR = PORT ? 0 : 46;
  const BD = PORT ? { x: 12, y: 12, w: W - 24, h: H - HANDH - PANH - 34 } : { x: 12, y: TOPR, w: W - PANW - 36, h: H - HANDH - TOPR - 12 };
  const PAN = PORT ? { x: 12, y: BD.y + BD.h + 10, w: PANW, h: PANH } : { x: W - PANW - 12, y: 12, w: PANW, h: PANH };
  const HND = { x: 12, y: H - HANDH - 6, w: (PORT ? W : W - PANW - 24) - 24, h: HANDH };

  let S = null, phase = 'play', T = 0, sel = -1, msg = '', sub = '', think = 0, waitT = 0, waitFn = null;
  let anim = null, banner = null, pl = [], privSig = {}, privT = 0, endGlow = 0;
  let idleP = -1, idleT = 0;
  const humans = () => (k.party ? k.party.map((q) => q.p) : [0]);
  const isHum = (p) => (k.party ? k.party.some((q) => q.p === p) : p === 0);
  const privMode = () => !!(k.party && k.privOK);
  const label = (p) => { if (!isHum(p)) return (pl[p] && pl[p].name) || 'CPU'; if (!k.party) return 'Tú'; const q = k.party.find((x) => x.p === p); return (q && q.name) || 'J' + (p + 1); };
  const tname = (t) => (!k.party ? (t === 0 ? 'Nosotros' : 'Ellos') : `${label(t)} y ${label(t + 2)}`);
  const seatOf = (p) => ['b', 'r', 't', 'l'][p];

  function reset() {
    S = DOM.create({ target: TARGET, lvl });
    pl = k.players(4); phase = 'play'; sel = -1; anim = null; banner = null; privSig = {}; think = 0; waitT = 0; endGlow = 0;
    msg = ''; sub = ''; drain();
  }
  /* ajusta el tamaño de fuente hasta que el texto quepa en `maxw` (devuelve el tamaño usado) */
  function fitFont(txt, maxw, weight, size) {
    let fs = size; c.font = FONT(weight, fs);
    while (c.measureText(txt).width > maxw && fs > 9) { fs -= 1; c.font = FONT(weight, fs); }
    return fs;
  }
  function wait(t, fn) { waitT = t; waitFn = fn; phase = 'wait'; }

  /* ---------- Reglas → efectos ---------- */
  function drain() {
    for (const e of S.ev.splice(0)) {
      if (e.t === 'deal') { msg = S.forced ? `Sale ${label(S.cur)} con el doble seis` : `Sale ${label(S.cur)}`; sub = ''; k.sfx('pop'); }
      else if (e.t === 'play') { k.sfx('click'); anim = { pc: e.pc, t: 0.26 }; }
      else if (e.t === 'pass') { banner = { txt: `${label(e.p)} pasa`, t: 1.2, col: '#ff9a8a' }; k.sfx('hurt'); }
      else if (e.t === 'hand') {
        const won = e.team, mine = humans().some((p) => DOM.team(p) === won);
        banner = { txt: e.kind === 'domino' ? `¡Dominó de ${label(e.by)}! +${e.pts}` : `Cierre: ${tname(won)} +${e.pts}`, t: 2.4, col: mine ? '#a8cf3f' : '#ffc94d' };
        k.sfx(mine ? 'win' : 'coin'); if (mine) k.confetti(null, 40);
        msg = e.kind === 'domino' ? `${label(e.by)} se queda sin fichas` : 'Cierre: nadie puede jugar';
        sub = `${tname(0)} ${S.score[0]} · ${tname(1)} ${S.score[1]} (a ${TARGET})`;
        phase = 'hand'; endGlow = 1;
      } else if (e.t === 'end') finish();
    }
  }
  function finish() {
    phase = 'over'; const w = S.winner, mine = humans().some((p) => DOM.team(p) === w);
    if (pl.some((q) => !q.cpu)) { lvl = mine ? Math.min(3, lvl + 0.5) : Math.max(0, lvl - 0.5); try { localStorage.setItem(LK, String(lvl)); } catch (e) { /* nada */ } }
    if (mine) k.best(CFG.id, S.score[w]);
    for (const p of humans()) k.priv(p, null);
    const rows = [0, 1, 2, 3].map((p) => ({ p, name: label(p), score: S.score[DOM.team(p)] + (DOM.team(p) === w ? 0.001 : 0) }));
    k.podium(rows, { head: !k.party ? (w === 0 ? '¡Ganamos la partida!' : '¡Ganan ellos!') : `¡Ganan ${tname(w)}!`, fmt: (v) => `${Math.floor(v)} puntos`, noTie: true });
  }

  /* ---------- Jugadas ---------- */
  const myMoves = (p) => DOM.legal(S, p);
  function doPlay(p, id, side) { if (DOM.play(S, p, id, side)) { sel = -1; drain(); return true; } return false; }
  function doPass(p) { if (DOM.pass(S, p)) { sel = -1; drain(); return true; } return false; }
  function sidesFor(p, id) { return myMoves(p).filter((m) => m.id === id).map((m) => m.side); }

  /* ---------- Información privada (modo tele) ---------- */
  const tileTxt = (t) => `${t.a}|${t.b}`;
  function sendPrivs(force) {
    if (!privMode() || !S) return;
    for (const p of humans()) {
      if (p > 3) continue;
      const turn = S.cur === p && phase === 'play' && !S.result, ms = turn ? myMoves(p) : [];
      const items = S.hands[p].map((t) => {
        const sd = ms.filter((m) => m.id === t.id);
        if (sd.length === 2) return { v: 'x' + t.id, label: tileTxt(t), sub: 'Elige punta', col: '#a097ff', off: false, both: 1 };
        return { v: sd.length ? sd[0].side + ':' + t.id : 'x' + t.id, label: tileTxt(t), off: !sd.length, col: sd.length ? '#a8cf3f' : '' };
      });
      const two = [];
      items.forEach((it, i) => { if (it.both) { const t = S.hands[p][i]; two.push({ v: 'l:' + t.id, label: '◀ ' + tileTxt(t), col: '#5b8cff' }, { v: 'r:' + t.id, label: tileTxt(t) + ' ▶', col: '#5b8cff' }); it.off = true; it.v = 'x' + t.id; } });
      const list = items.concat(two);
      if (turn && !ms.length) list.push({ v: 'pass', label: 'Paso', col: '#ff6fb5' });
      const txt = S.result ? 'Fin de la mano' : turn ? (ms.length ? `Tu turno · puntas ${S.ends[0]} y ${S.ends[1]}` : 'No casas: pasa') : `Turno de ${label(S.cur)} · puntas ${S.ends[0]} y ${S.ends[1]}`;
      const sig = txt + '|' + list.map((i) => i.v + (i.off ? 0 : 1)).join(',');
      if (!force && privSig[p] === sig) continue; privSig[p] = sig;
      k.priv(p, { title: `${label(p)} · ${tname(DOM.team(p))}`, text: txt, items: list });
    }
  }
  k.onPick = (p, v) => {
    if (!S || typeof v !== 'string' || phase !== 'play') return;
    if (v === 'pass') doPass(p); else if (v[0] === 'l' || v[0] === 'r') doPlay(p, +v.slice(2), v[0]);
    sendPrivs(true);
  };
  k.onParty = () => { pl = k.players(4); privSig = {}; if (S) sendPrivs(true); };

  /* ---------- Trazado de la cadena (serpentina que cabe siempre en el tablero) ---------- */
  /* Cadena en serpentina: cada ficha ocupa una casilla de lado largo L; las fichas normales van tumbadas
     en el sentido de la fila y los dobles de pie. El tamaño es el mayor que cabe en el tablero. */
  function layout() {
    const n = S ? S.chain.length : 0; if (!n) return [];
    const AH = BD.h - 58; /* franja inferior reservada para los mensajes */
    let L = PORT ? 108 : 120, per = 1, rows = 1;
    for (; L > 24; L -= 2) {
      per = Math.max(1, Math.floor((BD.w - 18) / L));
      rows = Math.ceil(n / per);
      if (rows * L * 1.12 + 26 <= AH) break;
    }
    const rh = L * 1.12, out = [], y0 = BD.y + (AH - rows * rh) / 2 + rh / 2;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / per), col = i % per, cnt = Math.min(per, n - r * per), rev = r % 2 === 1;
      const x0 = BD.x + (BD.w - cnt * L) / 2, cc = rev ? cnt - 1 - col : col;
      out.push({ x: x0 + cc * L + L / 2, y: y0 + r * rh, L, w: L * 0.5, h: L * 0.995, dir: rev ? -1 : 1 });
    }
    return out;
  }

  /* ---------- Dibujo de fichas ----------
   * Ley de la pieza única (§8): la ficha es UNA pieza de hueso con grosor; la barra central y el
   * canto se leen por sombra propia y por color, nunca por contorno. */
  function uni(g, parts, ow) {
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = (ow || 1.1) * 2;
    for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
    for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
    g.restore();
  }
  function inpath(g, parts, fn) { g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip(); fn(g); g.restore(); }
  const PIP = { 0: [], 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  const PCOL = ['#1a1530', '#e0344a', '#2f9e4f', '#2f5fd0', '#d4761c', '#7a3fc0', '#1a8f9e'];
  /* punto: un hoyo taladrado en el hueso (sombra dentro, luz en el filo inferior), no un disco encima */
  function half(c, x, y, s, v) {
    const r = s * 0.115;
    for (const [a, b] of PIP[v]) {
      const px = x + a * s * 0.26, py = y + b * s * 0.26, col = PCOL[v] || '#1a1530';
      c.beginPath(); c.arc(px, py, r * 1.12, 0, TAU); c.fillStyle = ART.alpha('#ffffff', 0.5); c.fill();
      const g = c.createRadialGradient(px + r * 0.32, py + r * 0.36, r * 0.1, px, py - r * 0.12, r * 1.25);
      g.addColorStop(0, ART.lite(col, 0.3)); g.addColorStop(0.55, col); g.addColorStop(1, ART.dark(col, 0.55));
      c.beginPath(); c.arc(px, py, r, 0, TAU); c.fillStyle = g; c.fill();
    }
  }
  /* caché de sprite: la ficha es siempre la misma, se dibuja una vez por (valores, medida, estado) */
  const TSC = {};
  function tileArt(x, y, w, h, a, b, opt) {
    opt = opt || {};
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const key = a + '_' + b + '_' + Math.round(w) + '_' + Math.round(h) + '_' + (opt.dim ? 1 : 0) + '_' + (opt.lw || 0) + '_' + dpr;
    let sp = TSC[key];
    if (!sp) {
      const TH0 = w * 0.085, pad = 6, cw = w + pad * 2, chh = h + TH0 + pad * 2;
      const cv = document.createElement('canvas'); cv.width = Math.ceil(cw * dpr); cv.height = Math.ceil(chh * dpr);
      const g = cv.getContext('2d'); g.scale(dpr, dpr); g.translate(cw / 2, pad + h / 2);
      tileDraw(g, w, h, a, b, opt);
      sp = TSC[key] = { cv: cv, ox: cw / 2, oy: pad + h / 2, w: cw, h: chh };
    }
    c.save(); c.translate(x, y); if (opt.rot) c.rotate(opt.rot);
    const hw = w / 2, hh = h / 2, TH = w * 0.085, rd = w * 0.18;
    ART.shadow(c, 0, hh * 0.92, w * 0.5, 0.3);
    c.drawImage(sp.cv, -sp.ox, -sp.oy, sp.w, sp.h);
    if (opt.ring) { ART.rr(c, -hw - 3, -hh - 3, w + 6, h + TH + 6, rd + 4); c.lineWidth = 3.5; c.strokeStyle = opt.ring; c.stroke(); }
    c.restore();
  }
  function tileDraw(c, w, h, a, b, opt) {
    const hw = w / 2, hh = h / 2, TH = w * 0.085, rd = w * 0.18;
    const body = (g) => ART.rr(g, -hw, -hh, w, h + TH, rd), face = (g) => ART.rr(g, -hw, -hh, w, h, rd);
    const sg = c.createLinearGradient(-hw, hh - TH, hw, hh + TH); sg.addColorStop(0, opt.dim ? '#8a857d' : '#d7c9ad'); sg.addColorStop(1, opt.dim ? '#6e6a63' : '#a4967a');
    const fg = c.createLinearGradient(-hw, -hh, hw, hh); fg.addColorStop(0, opt.dim ? '#bdb6ad' : '#fff8ea'); fg.addColorStop(1, opt.dim ? '#9a948c' : '#e7dcc6');
    const parts = [[body, sg], [face, fg]];
    uni(c, parts, opt.lw ? opt.lw / 2 : 1.2);
    inpath(c, parts, (g) => {
      /* canto: arista por sombra, no por línea */
      let gr = g.createLinearGradient(0, hh - 2, 0, hh + TH); gr.addColorStop(0, 'rgba(0,0,0,.34)'); gr.addColorStop(0.35, 'rgba(0,0,0,.05)'); gr.addColorStop(1, 'rgba(0,0,0,.26)');
      g.fillStyle = gr; g.fillRect(-hw, hh - 2, w, TH + 2);
      /* barra central: ranura tallada (sombra + filo iluminado), nunca un trazo */
      gr = g.createLinearGradient(0, -h * 0.035, 0, h * 0.035); gr.addColorStop(0, 'rgba(0,0,0,.30)'); gr.addColorStop(0.55, 'rgba(0,0,0,.10)'); gr.addColorStop(1, 'rgba(255,255,255,.55)');
      g.fillStyle = gr; g.fillRect(-hw + w * 0.1, -h * 0.035, w - w * 0.2, h * 0.07);
      /* grano del hueso, determinista por ficha */
      let sd = (a * 7 + b) * 733 + 11; const rr = () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      for (let i = 0; i < 22; i++) { g.fillStyle = rr() < 0.5 ? 'rgba(150,130,95,.10)' : 'rgba(255,255,255,.3)'; g.fillRect(-hw + rr() * w, -hh + rr() * h, 2 + rr() * 6, 0.7); }
      gr = g.createLinearGradient(0, -hh, 0, -hh + h * 0.22); gr.addColorStop(0, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(-hw, -hh, w, h * 0.22);
    });
    half(c, 0, -h * 0.25, w, a); half(c, 0, h * 0.25, w, b);
  }
  function tileBack(x, y, w, h, rot) {
    c.save(); c.translate(x, y); if (rot) c.rotate(rot);
    const hw = w / 2, hh = h / 2, TH = w * 0.085, rd = w * 0.18;
    ART.shadow(c, 0, h * 0.46, w * 0.5, 0.28);
    const body = (g) => ART.rr(g, -hw, -hh, w, h + TH, rd), face = (g) => ART.rr(g, -hw, -hh, w, h, rd);
    const sg = c.createLinearGradient(-hw, hh - TH, hw, hh + TH); sg.addColorStop(0, '#3e3570'); sg.addColorStop(1, '#241d46');
    const fg = c.createLinearGradient(-hw, -hh, hw, hh); fg.addColorStop(0, '#5a4f8f'); fg.addColorStop(1, '#382f63');
    const parts = [[body, sg], [face, fg]];
    uni(c, parts, 1.15);
    inpath(c, parts, (g) => {
      let gr = g.createLinearGradient(0, hh - 2, 0, hh + TH); gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,.2)');
      g.fillStyle = gr; g.fillRect(-hw, hh - 2, w, TH + 2);
      const rg = g.createRadialGradient(0, 0, w * 0.06, 0, 0, w * 0.26); rg.addColorStop(0, ART.alpha('#a097ff', 0.55)); rg.addColorStop(0.7, ART.alpha('#a097ff', 0.18)); rg.addColorStop(1, ART.alpha('#a097ff', 0));
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, w * 0.26, 0, TAU); g.fill();
      gr = g.createLinearGradient(0, -hh, 0, -hh + h * 0.25); gr.addColorStop(0, 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(-hw, -hh, w, h * 0.25);
    });
    c.restore();
  }

  /* ---------- Pintado ---------- */
  function board() {
    ART.rr(c, BD.x, BD.y + 4, BD.w, BD.h, 20); c.fillStyle = OUT; c.fill();
    ART.rr(c, BD.x, BD.y, BD.w, BD.h, 20);
    const g = c.createLinearGradient(BD.x, BD.y, BD.x, BD.y + BD.h); g.addColorStop(0, '#2f6b4a'); g.addColorStop(1, '#1f4d36'); c.fillStyle = g; c.fill();
    c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    c.save(); ART.rr(c, BD.x, BD.y, BD.w, BD.h, 20); c.clip();
    c.fillStyle = 'rgba(255,255,255,.035)'; for (let q = 0; q < 30; q++) { const x = BD.x + ((q * 137) % BD.w), y = BD.y + ((q * 89 + 21) % BD.h); c.beginPath(); c.arc(x, y, 3 + (q % 5), 0, TAU); c.fill(); }
    c.restore();
    if (!S || !S.chain.length) { c.font = FONT(800, 20); c.fillStyle = 'rgba(255,255,255,.45)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('La mesa está vacía', BD.x + BD.w / 2, BD.y + BD.h / 2); return; }
    const L = layout(), an = anim;
    L.forEach((s, i) => {
      const pc = S.chain[i], dbl = pc.a === pc.b;
      const grow = an && an.pc === pc ? 1 + an.t * 1.4 : 1;
      const rot = dbl ? 0 : s.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      const isEnd = (i === 0 || i === L.length - 1) && L.length > 1;
      tileArt(s.x, s.y, s.w * grow, s.h * grow, pc.a, pc.b, { rot, ring: isEnd && phase === 'play' && !S.result ? ART.alpha('#ffd166', 0.8) : null });
    });
    /* rótulo de las puntas */
    if (L.length) {
      const tag = (s, v, tx) => { const y = s.y - s.L * 0.6; ART.rr(c, s.x - 22, y - 13, 44, 26, 9); c.fillStyle = ART.alpha('#1a1530', 0.82); c.fill(); c.lineWidth = 2; c.strokeStyle = '#ffd166'; c.stroke(); c.font = FONT(900, 16); c.fillStyle = '#ffd166'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(tx + v, s.x, y + 1); };
      tag(L[0], S.ends[0], '◀ '); if (L.length > 1) tag(L[L.length - 1], S.ends[1], '▶ ');
    }
  }
  function panel() {
    ART.rr(c, PAN.x, PAN.y + 4, PAN.w, PAN.h, 18); c.fillStyle = OUT; c.fill();
    ART.rr(c, PAN.x, PAN.y, PAN.w, PAN.h, 18);
    const g = c.createLinearGradient(0, PAN.y, 0, PAN.y + PAN.h); g.addColorStop(0, '#3a2c5e'); g.addColorStop(1, '#261c42'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    if (!S) return;
    /* marcador de parejas */
    const bw = PORT ? (PAN.w - 36) / 2 : PAN.w - 24, bh = 56, bx = PAN.x + 12, by = PAN.y + 10;
    for (let t = 0; t < 2; t++) {
      const x = PORT ? bx + t * (bw + 12) : bx, y = PORT ? by : by + t * (bh + 8), mine = humans().some((p) => DOM.team(p) === t);
      const col = k.pcol(t);
      ART.rr(c, x, y, bw, bh, 12); c.fillStyle = ART.alpha(col, 0.22); c.fill(); c.lineWidth = 2; c.strokeStyle = ART.alpha(col, 0.8); c.stroke();
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = FONT(800, 15); c.fillStyle = '#e6ddff';
      c.fillText(tname(t) + (mine && !k.party ? '' : ''), x + 12, y + 17);
      c.font = FONT(900, 26); c.fillStyle = '#fff'; c.fillText(String(S.score[t]), x + 12, y + 40);
      c.font = FONT(700, 13); c.fillStyle = '#bdb2e0'; c.textAlign = 'right'; c.fillText(`a ${TARGET}`, x + bw - 10, y + 40);
    }
    /* jugadores y fichas que les quedan */
    const ly = PORT ? by + bh + 8 : by + 2 * (bh + 8) + 10, lh = PORT ? 36 : 52, lw = PORT ? (PAN.w - 36) / 2 : PAN.w - 24;
    for (let p = 0; p < 4; p++) {
      const x = PORT ? PAN.x + 12 + (p % 2) * (lw + 12) : PAN.x + 12, y = PORT ? ly + Math.floor(p / 2) * (lh + 2) : ly + p * (lh + 6);
      const cur = S.cur === p && !S.result && phase !== 'over';
      if (!PORT) { ART.rr(c, x, y, lw, lh, 10); c.fillStyle = cur ? ART.alpha(k.pcol(p), 0.3) : 'rgba(0,0,0,.22)'; c.fill(); c.lineWidth = cur ? 3 : 1.5; c.strokeStyle = cur ? k.pcol(p) : ART.alpha('#ffffff', 0.12); c.stroke(); }
      c.beginPath(); c.arc(x + 16, y + lh / 2, 8, 0, TAU); ART.fillOut(c, k.pcol(p), 2);
      c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = FONT(cur ? 900 : 800, PORT ? 14 : 17); c.fillStyle = cur ? '#fff' : '#d8cff5';
      c.fillText(label(p), x + 30, y + lh * (PORT ? 0.5 : 0.36));
      const n = S.hands[p].length;
      if (PORT) { c.font = FONT(700, 13); c.fillStyle = '#bdb2e0'; c.textAlign = 'right'; c.fillText(`${n}`, x + lw - 8, y + lh * 0.5); }
      else { for (let i = 0; i < n; i++) tileBack(x + 34 + i * 13, y + lh * 0.72, 11, 21, 0); }
      if (cur) { c.fillStyle = k.pcol(p); c.beginPath(); const ax = x + lw - (PORT ? 22 : 16), ay = y + lh / 2; c.moveTo(ax + 5, ay - 7); c.lineTo(ax - 5, ay); c.lineTo(ax + 5, ay + 7); c.closePath(); ART.fillOut(c, k.pcol(p), 1.5); }
    }
  }
  /* Mano local (sin tele): fichas tocables de J1 */
  function handSlots() {
    if (!S) return [];
    const h = S.hands[0], n = Math.max(1, h.length);
    const sw = Math.min(PORT ? 62 : 68, (HND.w - 8) / n), th = Math.min(HND.h - 16, sw * 1.9);
    const x0 = HND.x + (HND.w - n * sw) / 2;
    return h.map((t, i) => ({ t, x: x0 + i * sw + sw / 2, y: HND.y + HND.h / 2, w: sw * 0.9, h: th }));
  }
  function hand() {
    if (!S || k.party) return;
    const slots = handSlots(), ms = S.cur === 0 && phase === 'play' && !S.result ? myMoves(0) : [];
    const ok = new Set(ms.map((m) => m.id));
    for (const s of slots) {
      const can = ok.has(s.t.id), on = sel === s.t.id;
      tileArt(s.x, s.y - (on ? 8 : 0), s.w, s.h, s.t.a, s.t.b, { dim: !can && ms.length > 0, ring: on ? '#ffd166' : can ? ART.alpha('#a8cf3f', 0.8) : null });
    }
    if (sel >= 0) {
      const sd = sidesFor(0, sel);
      if (sd.length === 2) { const L = layout(); if (L.length) { for (const [i, sside] of [[0, 'l'], [L.length - 1, 'r']]) { const s = L[i]; c.save(); c.globalAlpha = 0.45 + Math.sin(T * 6) * 0.2; ART.rr(c, s.x - s.L * 0.42, s.y - s.L * 0.42, s.L * 0.84, s.L * 0.84, 10); c.fillStyle = sside === 'l' ? '#5b8cff' : '#ff6fb5'; c.fill(); c.restore(); c.font = FONT(900, 15); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sside === 'l' ? '◀' : '▶', s.x, s.y); } } }
    }
  }
  function texts() {
    const tx = BD.x + BD.w / 2, ty = BD.y + BD.h - 42, maxw = BD.w - 20;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (msg) { fitFont(msg, maxw, 900, PORT ? 19 : 21); c.lineWidth = 5; c.strokeStyle = OUT; c.strokeText(msg, tx, ty); c.fillStyle = '#fff'; c.fillText(msg, tx, ty); }
    if (sub) { fitFont(sub, maxw, 700, PORT ? 15 : 16); c.lineWidth = 4; c.strokeStyle = OUT; c.strokeText(sub, tx, ty + 22); c.fillStyle = '#cfc4ee'; c.fillText(sub, tx, ty + 22); }
    if (banner && banner.t > 0) {
      /* franja alta del tablero, centrada en el tablero (no en el lienzo) y ajustada al ancho */
      const a = Math.min(1, banner.t), cx = BD.x + BD.w / 2, y = BD.y + Math.max(46, BD.h * 0.22);
      c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.textBaseline = 'middle';
      const fs = fitFont(banner.txt, BD.w - 56, 900, PORT ? 30 : 36);
      const wth = Math.min(BD.w - 8, c.measureText(banner.txt).width + 40), bh = fs + 26;
      ART.rr(c, cx - wth / 2, y - bh / 2, wth, bh, 16); c.fillStyle = ART.alpha('#1a1530', 0.86); c.fill(); c.lineWidth = 3; c.strokeStyle = banner.col; c.stroke();
      c.fillStyle = banner.col; c.fillText(banner.txt, cx, y + 1); c.restore();
    }
  }
  function draw() {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#26314e'); g.addColorStop(1, '#141c2f'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.03)'; for (let x = 0; x < W; x += 48) c.fillRect(x, 0, 20, H);
    board(); panel(); hand(); texts();
  }

  /* ---------- Entrada local ---------- */
  function tapHand() {
    const slots = handSlots(), x = k.ptr.x, y = k.ptr.y;
    for (const s of slots) if (Math.abs(x - s.x) < s.w * 0.6 && Math.abs(y - s.y) < s.h * 0.6) {
      const sd = sidesFor(0, s.t.id);
      if (!sd.length) { k.sfx('hurt'); return true; }
      if (sd.length === 1) { doPlay(0, s.t.id, sd[0]); return true; }
      sel = sel === s.t.id ? -1 : s.t.id; k.sfx('click'); return true;
    }
    if (sel >= 0) { /* toque en una punta */
      const L = layout(); if (L.length) {
        const near = (s) => Math.abs(x - s.x) < s.L * 0.55 && Math.abs(y - s.y) < s.L * 0.55;
        if (near(L[0])) { doPlay(0, sel, 'l'); return true; }
        if (near(L[L.length - 1])) { doPlay(0, sel, 'r'); return true; }
      }
    }
    return false;
  }
  function keyPick(p) {
    const ms = myMoves(p); if (!ms.length) { if (k.phit(p, 'a')) doPass(p); return; }
    const ids = []; for (const t of S.hands[p]) if (ms.some((m) => m.id === t.id)) ids.push(t.id);
    if (sel < 0 || !ids.includes(sel)) sel = ids[0];
    const d = (k.phit(p, 'right') ? 1 : 0) - (k.phit(p, 'left') ? 1 : 0);
    if (d) { sel = ids[(ids.indexOf(sel) + d + ids.length) % ids.length]; k.sfx('click'); }
    if (k.phit(p, 'a')) { const sd = sidesFor(p, sel); doPlay(p, sel, sd.length === 2 ? (k.pheld(p, 'up') ? 'l' : 'r') : sd[0]); }
    if (k.phit(p, 'b')) { const sd = sidesFor(p, sel); if (sd.length === 2) doPlay(p, sel, 'l'); }
  }

  /* ---------- Bucle ---------- */
  function update(dt) {
    T += dt;
    if (!k.gate(reset)) return;
    if (!S) reset();
    if (anim) { anim.t -= dt * 3.4; if (anim.t <= 0) anim = null; }
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    if (endGlow > 0) endGlow -= dt;
    if ((privT -= dt) <= 0) { privT = 0.15; sendPrivs(); }
    if (phase === 'over') return;
    if (phase === 'wait') { waitT -= dt; if (waitT <= 0) { phase = 'play'; waitFn && waitFn(); } return; }
    if (phase === 'hand') {
      waitT += dt;
      const go = waitT > (k.party ? 4.5 : 3.2) || k.hit.has('a') || k.ptr.hit || (k.party && k.party.some((q) => k.phit(q.p, 'a')));
      if (go) { waitT = 0; phase = 'play'; sel = -1; DOM.next(S); drain(); }
      return;
    }
    if (S.result) return;
    const p = S.cur;
    msg = isHum(p) ? (myMoves(p).length ? `${label(p)}: te toca` : `${label(p)}: no casas, pasa`) : `Juega ${label(p)}…`;
    sub = S.chain.length ? `Puntas: ${S.ends[0]} y ${S.ends[1]}` : 'Mesa vacía: abre quien tiene el doble seis';
    if (!isHum(p)) {
      if (!think) think = 0.6 + Math.random() * 0.4;
      if ((think -= dt) <= 0) { think = 0; const m = DOM.aiPick(S, p, lvl, Math.random); if (m) doPlay(p, m.id, m.side); else doPass(p); }
      return;
    }
    think = 0;
    if (!myMoves(p).length) { /* paso automático tras un momento, o con A */
      waitT += dt; if (waitT > 1.1 || k.phit(p, 'a') || (!k.party && k.ptr.hit)) { waitT = 0; doPass(p); } return;
    }
    waitT = 0;
    /* en la tele, si el jugador se despista 25 s, la mesa sigue sola */
    if (idleP !== p) { idleP = p; idleT = 0; } else idleT += dt;
    if (k.party && idleT > 25) { idleT = 0; const m = DOM.aiPick(S, p, lvl, Math.random); banner = { txt: `${label(p)} tarda: juega la mesa`, t: 1.6, col: '#ffc94d' }; if (m) doPlay(p, m.id, m.side); else doPass(p); return; }
    if (!k.party && k.ptr.hit && p === 0) { if (tapHand()) return; }
    keyPick(p);
  }

  addEventListener('resize', () => { clearTimeout(window.__dot); window.__dot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
  window.__dom = { get S() { return S; }, get phase() { return phase; }, DOM, score: (a, b) => { S.score[0] = a; S.score[1] = b; }, play: (p, id, s) => doPlay(p, id, s), pass: (p) => doPass(p) };
  k.show(CFG.title, (CFG.help || '') + '<br>Toca para jugar');
  k.run(update, draw);
})();
