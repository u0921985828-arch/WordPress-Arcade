/* mancala.js — Mancala de Semillas (kalah 6×4). CFG.mode: 'kalah'
 * Reglas puras (MN, verificables bot contra bot): 12 hoyos (0–5 del jugador 1, 7–12 del jugador 2)
 * y dos graneros (6 y 13), 4 semillas por hoyo. En tu turno coges todas las semillas de uno de tus
 * hoyos y las vas sembrando de una en una en sentido contrario a las agujas del reloj, saltándote
 * SIEMPRE el granero del rival. Si la última semilla cae en tu granero repites turno. Si cae en un
 * hoyo TUYO que estaba vacío, te llevas esa semilla y todas las del hoyo de enfrente. Cuando un
 * jugador se queda sin semillas en su lado, el otro recoge las suyas y gana quien más tenga.
 * Disposición adaptable: vertical (dos columnas) u horizontal (dos filas); se recarga al girar
 * fuera de partida. 1–2 jugadores: en la tele juegan dos móviles, en solitario IA de 3 niveles. */
const MN = (() => {
  const ST = [6, 13], N = 14;
  const nuevo = (s) => { const p = new Int8Array(N); for (let i = 0; i < N; i++) p[i] = i === 6 || i === 13 ? 0 : (s || 4); return { p, t: 0, over: 0 }; };
  const mine = (g, pl) => (pl ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5]);
  const moves = (g) => (g.over ? [] : mine(g, g.t).filter((i) => g.p[i] > 0));
  const side = (g, pl) => mine(g, pl).reduce((a, i) => a + g.p[i], 0);
  /* Siembra el hoyo `i`. Devuelve {extra, cap, path} (path = hoyos tocados, para la animación). */
  function play(g, i) {
    const pl = g.t, foe = ST[1 - pl], own = ST[pl];
    let n = g.p[i], j = i; const path = [];
    g.p[i] = 0;
    while (n > 0) { j = (j + 1) % N; if (j === foe) continue; g.p[j]++; n--; path.push(j); }
    let extra = 0, cap = 0, capAt = -1;
    if (j === own) extra = 1;
    else if (g.p[j] === 1 && mine(g, pl).indexOf(j) >= 0) {
      const opp = 12 - j; /* 0↔12, 1↔11 … 5↔7 */
      if (g.p[opp] > 0) { cap = g.p[opp] + 1; capAt = j; g.p[own] += cap; g.p[opp] = 0; g.p[j] = 0; }
    }
    if (!side(g, 0) || !side(g, 1)) { /* barrido final */
      for (const pl2 of [0, 1]) for (const q of mine(g, pl2)) { g.p[ST[pl2]] += g.p[q]; g.p[q] = 0; }
      g.over = g.p[6] > g.p[13] ? 1 : g.p[13] > g.p[6] ? 2 : 3;
    } else if (!extra) g.t = 1 - pl;
    return { extra, cap, capAt, path, end: j };
  }
  const clone = (g) => ({ p: Int8Array.from(g.p), t: g.t, over: g.over });
  /* Valoración desde el punto de vista de `pl`. */
  function evalG(g, pl) {
    const me = ST[pl], yo = ST[1 - pl];
    let s = (g.p[me] - g.p[yo]) * 3 + (side(g, pl) - side(g, 1 - pl)) * 0.4;
    for (const i of mine(g, pl)) if (g.p[i] === 0 && g.p[12 - i] > 3) s += 0.6; /* trampas listas */
    return s;
  }
  let nodos = 0;
  function neg(g, pl, d, al, be) {
    if (g.over || d <= 0 || ++nodos > 30000) return evalG(g, pl);
    const ms = moves(g); if (!ms.length) return evalG(g, pl);
    let best = -1e9;
    for (const m of ms) { const h = clone(g); play(h, m);
      const v = h.over ? (h.over === 3 ? 0 : h.over - 1 === pl ? 500 : -500)
        : h.t === g.t ? neg(h, pl, d - 1, al, be) : -neg(h, 1 - pl, d - 1, -be, -al);
      if (v > best) best = v; if (v > al) al = v; if (al >= be) break; }
    return best;
  }
  const DEP = [2, 5, 8], ERR = [0.5, 0.18, 0.04];
  function ai(g, lvl, rnd) {
    rnd = rnd || Math.random; const L = Math.max(0, Math.min(2, lvl | 0)), ms = moves(g);
    if (!ms.length) return -1;
    if (rnd() < ERR[L]) return ms[Math.floor(rnd() * ms.length)];
    nodos = 0; const pl = g.t; let bv = -1e9, best = [];
    for (const m of ms) { const h = clone(g); play(h, m);
      const v = h.over ? (h.over === 3 ? 0 : h.over - 1 === pl ? 500 : -500)
        : h.t === pl ? neg(h, pl, DEP[L] - 1, -1e9, 1e9) : -neg(h, 1 - pl, DEP[L] - 1, -1e9, 1e9);
      if (v > bv + 0.2) { bv = v; best = [m]; } else if (Math.abs(v - bv) <= 0.2) best.push(m); }
    return best[Math.floor(rnd() * best.length)];
  }
  return { nuevo, moves, play, clone, side, evalG, ai, mine, ST };
})();
if (typeof module !== 'undefined') module.exports = MN;

if (typeof Kit === 'function') (() => {
  const OUT = ART.OUT, R2 = 6.2832;
  const PORT = innerHeight > innerWidth, W = PORT ? 460 : 720, H = PORT ? 720 : 460;
  const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1a2436' }), c = k.ctx;
  const LS = 'cpu:' + CFG.id; let lvl = 0; try { lvl = +localStorage.getItem(LS) || 0; } catch (e) {}
  const LVL = ['Fácil', 'Normal', 'Difícil'];
  let g, seats, series = [0, 0], first = 0, cur = 0, kbd = false, think = 0, pick = -1;
  let anim = null, msg = '', msgT = 0, tN = 0, pend = 0, endT = 0, started = false;
  const seat = () => (seats = k.players(2));
  const nameOf = (p) => (seats[p].cpu ? 'CPU' : String(seats[p].name).slice(0, 8));
  const human = (p) => !seats[p].cpu;
  k.onParty = () => seat();

  /* --- geometría: 12 hoyos + 2 graneros (elipse propia por hoyo, sin solapes) ---- */
  const BX = PORT ? 42 : 92, BY = PORT ? 104 : 86;
  const BW = W - BX * 2, BH = PORT ? 534 : 300;
  const R = PORT ? 28 : 26, SR = 32;
  const POS = new Array(14);
  if (PORT) {
    const cx0 = BX + BW * 0.28, cx1 = BX + BW * 0.72;
    const top = BY + 110, dy = (BH - 220) / 5;
    for (let i = 0; i < 6; i++) POS[i] = { x: cx1, y: top + (5 - i) * dy, rx: R, ry: R };
    POS[6] = { x: cx1, y: BY + 40, rx: SR * 1.7, ry: SR, big: 1 };
    for (let i = 0; i < 6; i++) POS[7 + i] = { x: cx0, y: top + i * dy, rx: R, ry: R };
    POS[13] = { x: cx0, y: BY + BH - 40, rx: SR * 1.7, ry: SR, big: 1 };
  } else {
    const cy0 = BY + BH * 0.76, cy1 = BY + BH * 0.24;
    const left = BX + 112, dx = (BW - 236) / 5;
    for (let i = 0; i < 6; i++) POS[i] = { x: left + i * dx, y: cy0, rx: R, ry: R };
    POS[6] = { x: BX + BW - 48, y: BY + BH / 2, rx: SR, ry: SR * 1.9, big: 1 };
    for (let i = 0; i < 6; i++) POS[7 + i] = { x: left + (5 - i) * dx, y: cy1, rx: R, ry: R };
    POS[13] = { x: BX + 48, y: BY + BH / 2, rx: SR, ry: SR * 1.9, big: 1 };
  }
  const oval = (h, P, o) => { h.beginPath(); h.ellipse(P.x, P.y, P.rx + (o || 0), P.ry + (o || 0), 0, 0, 6.2832); };

  /* --- arte: tablero de una pieza, cacheado ----------------------------- */
  const BG = (() => {
    const q0 = document.createElement('canvas'), D = Math.min(2, devicePixelRatio || 1);
    q0.width = W * D; q0.height = H * D; const q = q0.getContext('2d'); q.scale(D, D);
    const sky = q.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#26324c'); sky.addColorStop(1, '#131a2b');
    q.fillStyle = sky; q.fillRect(0, 0, W, H);
    q.fillStyle = 'rgba(255,255,255,.028)';
    for (let y = 0; y < H; y += 38) for (let x = (y / 38) % 2 * 19; x < W; x += 38) q.fillRect(x, y, 19, 19);
    /* el tablero es un solo trazo: rectángulo redondeado con las orejas de los graneros */
    const path = (h) => ART.rr(h, BX - 16, BY - 16, BW + 32, BH + 32, PORT ? 40 : 46);
    q.save(); q.translate(0, 9); q.beginPath(); path(q); q.fillStyle = 'rgba(8,6,20,.45)'; q.fill(); q.restore();
    q.beginPath(); path(q); q.lineJoin = 'round'; q.lineWidth = 5; q.strokeStyle = OUT; q.stroke();
    const wood = q.createLinearGradient(0, BY - 16, PORT ? 0 : BX + BW, PORT ? BY + BH : BY + BH);
    wood.addColorStop(0, '#a9773f'); wood.addColorStop(0.55, '#8a5d30'); wood.addColorStop(1, '#5e3c1e');
    q.fillStyle = wood; q.fill();
    q.save(); q.beginPath(); path(q); q.clip();
    q.strokeStyle = 'rgba(58,30,6,.22)'; q.lineWidth = 1.6;
    for (let i = 0; i < 16; i++) { const o = BY - 20 + i * ((BH + 50) / 15); q.beginPath();
      if (PORT) { q.moveTo(BX - 20, o); q.bezierCurveTo(BX + BW * 0.35, o + 7, BX + BW * 0.65, o - 7, BX + BW + 20, o + 3); }
      else { const x = BX - 20 + i * ((BW + 50) / 15); q.moveTo(x, BY - 20); q.bezierCurveTo(x + 7, BY + BH * 0.35, x - 7, BY + BH * 0.65, x + 3, BY + BH + 20); }
      q.stroke(); }
    /* brillo superior izquierdo, cel shading de dos tonos */
    q.fillStyle = 'rgba(255,236,200,.13)'; q.fillRect(BX - 16, BY - 16, BW + 32, PORT ? 60 : 44);
    q.restore();
    /* hoyos tallados */
    for (let i = 0; i < 14; i++) { const P = POS[i];
      oval(q, P, 4); q.fillStyle = '#3d2610'; q.fill(); q.lineWidth = 3; q.strokeStyle = OUT; q.stroke();
      q.save(); oval(q, P, 4); q.clip();
      q.fillStyle = 'rgba(0,0,0,.35)'; q.beginPath(); q.ellipse(P.x - P.rx * 0.16, P.y - P.ry * 0.2, P.rx, P.ry, 0, 0, R2); q.fill();
      q.fillStyle = 'rgba(255,220,170,.10)'; q.beginPath(); q.ellipse(P.x + P.rx * 0.3, P.y + P.ry * 0.34, P.rx * 0.9, P.ry * 0.9, 0, 0, R2); q.fill();
      q.restore(); }
    return q0; })();

  /* semillas: una pieza, tres tonos, cacheadas por color */
  const SEED = {};
  function seed(col) { if (SEED[col]) return SEED[col];
    const s = 9, D = Math.min(2, devicePixelRatio || 1), cv = document.createElement('canvas');
    cv.width = cv.height = s * 2 * D; const q = cv.getContext('2d'); q.scale(D, D); q.translate(s, s);
    const path = (h) => { h.beginPath(); h.ellipse(0, 0, s * 0.78, s * 0.62, -0.5, 0, R2); };
    path(q); q.lineWidth = 2.6; q.lineJoin = 'round'; q.strokeStyle = OUT; q.stroke(); q.fillStyle = col; q.fill();
    q.save(); path(q); q.clip();
    q.fillStyle = ART.dark(col, 0.22); q.beginPath(); q.ellipse(s * 0.24, s * 0.26, s * 0.7, s * 0.6, -0.5, 0, R2); q.fill();
    q.restore();
    q.fillStyle = 'rgba(255,255,255,.55)'; q.beginPath(); q.ellipse(-s * 0.22, -s * 0.26, s * 0.2, s * 0.13, -0.5, 0, R2); q.fill();
    return (SEED[col] = cv); }
  const COLS = ['#ffc94d', '#a8cf3f', '#ff9a6f', '#8fd6ff', '#d3b0ff'];
  const rnd1 = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  function drawSeeds(i, n) { if (n <= 0) return;
    const P = POS[i], m = Math.min(n, P.big ? 22 : 11);
    for (let j = 0; j < m; j++) { const a = rnd1(i * 31 + j) * R2, d = Math.sqrt(rnd1(i * 57 + j * 3 + 1));
      const sx = P.x + Math.cos(a) * d * (P.rx - 12), sy = P.y + Math.sin(a) * d * (P.ry - 12);
      const cv = seed(COLS[(i * 7 + j) % COLS.length]); c.drawImage(cv, sx - 9, sy - 9, 18, 18); } }

  function label(t, x, y, size, col, align, base) {
    c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
    c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(t, x, y); c.fillStyle = col || '#fff'; c.fillText(t, x, y); }
  const say = (t, col) => { msg = t; msgT = 1.8; void col; };

  /* --- partida ----------------------------------------------------------- */
  function newGame() { g = MN.nuevo(4); g.t = first; first = 1 - first; anim = null; think = 0; pick = -1; pend = 0; endT = 0; cur = g.t ? 7 : 0; }
  function resetG() { series = [0, 0]; seat(); first = 0; newGame(); k.count(3); }
  function sow(i) {
    if (anim || g.over || MN.moves(g).indexOf(i) < 0) return false;
    const n = g.p[i], from = g.t;
    const r = MN.play(g, i);
    /* la animación arranca en el estado previo (con el hoyo de origen ya vacío) y va sumando:
       se deshace primero la captura y después el reparto, en orden inverso al de MN.play(). */
    const sh = Int8Array.from(g.p);
    if (r.cap) { sh[MN.ST[from]] -= r.cap; sh[r.capAt] = 1; sh[12 - r.capAt] = r.cap - 1; }
    for (const q of r.path) sh[q]--;
    anim = { path: r.path.slice(), k: 0, t: 0, from, r, shown: sh };
    if (r.cap) anim.hold = { at: r.capAt, opp: 12 - r.capAt, n: r.cap };
    void n;
    k.sfx('pop');
    return true; }
  function stepAnim(dt) {
    anim.t += dt;
    const sp = 0.085;
    while (anim.k < anim.path.length && anim.t > sp) { anim.t -= sp; anim.shown[anim.path[anim.k]]++; anim.k++; k.sfx('click'); }
    if (anim.k < anim.path.length) return;
    if (anim.hold && anim.t > 0.22) { const h = anim.hold; anim.shown[h.at] = 0; anim.shown[h.opp] = 0; anim.shown[MN.ST[anim.from]] += h.n;
      k.burst(POS[h.at].x, POS[h.at].y, '#ffe27a', 18, 170); k.float(`+${h.n}`, POS[MN.ST[anim.from]].x, POS[MN.ST[anim.from]].y - 30, '#ffe27a'); k.sfx('coin'); anim.hold = null; anim.t = 0; return; }
    if (anim.hold) return;
    if (anim.t < 0.2) return;
    const r = anim.r;
    anim = null;
    if (g.over) { pend = 1; return; }
    if (r.extra) { say(human(g.t) ? '¡Otra vez!' : 'La CPU repite'); k.sfx('win'); }
    cur = g.t ? 7 : 0; think = 0; pick = -1; }

  function finish() {
    const rows = [{ p: 0, score: series[0] }, { p: 1, score: series[1] }];
    if (g.over === 3) return k.podium(rows, { head: '¡Empate!', noTie: true, fmt: (v) => `${v} ${v === 1 ? 'partida' : 'partidas'}`, go: 'Toca para la siguiente' });
    const wp = g.over - 1; series[wp]++;
    const vsCPU = seats[0].cpu !== seats[1].cpu, hp = seats[0].cpu ? 1 : 0;
    if (vsCPU) { if (wp === hp) lvl = Math.min(2, lvl + 0.5); else lvl = Math.max(0, lvl - 1); try { localStorage.setItem(LS, lvl); } catch (e) {} }
    k.podium([{ p: 0, score: series[0] }, { p: 1, score: series[1] }], { head: `¡Gana ${nameOf(wp)}!`, noTie: true, fmt: (v) => `${v} ${v === 1 ? 'partida' : 'partidas'}`, go: 'Toca para la siguiente' }); }

  const help = CFG.help || 'Coge las semillas de uno de tus hoyos y siémbralas una a una hacia tu granero. Si la última cae en tu granero repites; si cae en un hoyo tuyo vacío, te llevas las de enfrente.';
  resetG();
  addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
  k.show(CFG.title, help);
  const again = () => { seat(); newGame(); k.count(2); };

  k.run((dt) => {
    tN += dt; if (msgT > 0) msgT -= dt;
    if (!k.gate(started ? again : resetG)) return; started = true;
    if (k.counting()) return;
    if (anim) return stepAnim(dt);
    if (pend) { endT += dt; if (endT === dt && g.over !== 3) { k.sfx('win'); k.confetti(k.pcol(g.over - 1)); } if (endT > 1.2) { finish(); pend = 0; } return; }
    if (g.over) return;
    const p = g.t;
    if (!human(p)) { think += dt; if (pick < 0 && think > 0.35) pick = MN.ai(g, k.clamp(lvl + k.D.cpu, 0, 2)); if (pick >= 0 && think > 0.75) { sow(pick); pick = -1; } return; }
    const ms = MN.moves(g), base = p ? 7 : 0;
    const step = (d) => { for (let n = 1; n <= 6; n++) { const i = base + ((cur - base + d * n) % 6 + 6) % 6; if (g.p[i] > 0) { cur = i; kbd = true; k.sfx('click'); return; } } };
    if (k.phit(p, PORT ? 'up' : 'left')) step(p ? 1 : -1);
    if (k.phit(p, PORT ? 'down' : 'right')) step(p ? -1 : 1);
    if (k.phit(p, 'a')) { if (!sow(cur)) { k.sfx('hit'); say('Ese hoyo está vacío'); } }
    if (!k.party && k.ptr.hit && p === 0) { kbd = false;
      for (const i of [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12]) { const P = POS[i];
        if (Math.hypot((k.ptr.x - P.x) / (P.rx + 8), (k.ptr.y - P.y) / (P.ry + 8)) > 1) continue;
        if (ms.indexOf(i) < 0) { k.sfx('hit'); k.float(g.p[i] ? 'No es tuyo' : 'Vacío', P.x, P.y - 26, '#ff9aa8'); return; }
        sow(i); return; } }
  }, () => {
    c.drawImage(BG, 0, 0, W, H);
    const view = anim ? anim.shown : g.p;
    const turnCol = k.pcol(g.t);
    /* hoyos jugables resaltados */
    if (!g.over && !anim && !k.counting()) for (const i of MN.moves(g)) { const P = POS[i];
      oval(c, P, 7); c.lineWidth = 3.4; c.strokeStyle = ART.alpha(turnCol, 0.5 + 0.3 * Math.sin(tN * 5)); c.stroke(); }
    /* aro del color de cada jugador en su granero */
    for (const p of [0, 1]) { oval(c, POS[MN.ST[p]], 6); c.lineWidth = 3; c.strokeStyle = ART.alpha(k.pcol(p), 0.55); c.stroke(); }
    for (let i = 0; i < 14; i++) { const P = POS[i]; drawSeeds(i, view[i]);
      const n = view[i]; if (n > 0) label(String(n), P.x, P.y, P.big ? 26 : 18, i === 6 ? k.pcol(0) : i === 13 ? k.pcol(1) : '#fff', 'center', 'middle'); }
    if (kbd && !g.over && !anim && human(g.t)) { const P = POS[cur];
      oval(c, P, 11); c.lineWidth = 3.5; c.strokeStyle = '#ffe27a'; c.stroke(); }
    /* marcadores */
    /* en horizontal el reproductor deja pausa y sonido arriba al centro: el título se omite */
    if (PORT) label(CFG.title, W / 2, 10, 21, '#ffe27a', 'center');
    for (const p of [0, 1]) { const act = k.st === 'play' && !g.over && g.t === p, col = k.pcol(p);
      const x = p ? W - 8 : 8, al = p ? 'right' : 'left';
      const y = PORT ? 44 : 44;
      label(`${nameOf(p)}${seats && seats[p].cpu ? ' · ' + LVL[k.clamp(lvl + k.D.cpu, 0, 2) | 0] : ''}`, x, y, 15, act ? col : 'rgba(255,255,255,.65)', al);
      const sd = view[MN.ST[p]];
      label(`${sd} ${sd === 1 ? 'semilla' : 'semillas'} · ${series[p]}`, x, y + 20, 14, act ? '#fff' : 'rgba(255,255,255,.5)', al); }
    const st = g.over ? '' : anim ? '' : human(g.t) ? 'Toca uno de tus hoyos' : 'La CPU piensa' + '.'.repeat(1 + Math.floor(tN * 3) % 3);
    label(msgT > 0 ? msg : st, W / 2, H - 34, 17, msgT > 0 ? '#ffe27a' : turnCol, 'center');
  });
  window.__mn = { MN, get g() { return g; }, sow };
})();
