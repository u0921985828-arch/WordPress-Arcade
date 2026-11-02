/* Resolutor de los retos de spider-solitaire, pyramid-solitaire y tripeaks-solitaire
 * (tablas S, P, T y retos del día DS, DP, DT de src/eng/cardlv.js).
 *
 *   node scripts/check_cardlv.js           comprueba las seis tablas
 *   node scripts/check_cardlv.js P 7       solo el reto 7 de la tabla P (y escribe la solución)
 *
 * Reparte cada reto EXACTAMENTE como dealLV() de src/eng/cards.js y lo resuelve con las reglas
 * del motor (las mismas que el jugador):
 *   - Pyramid: parejas de cartas libres que suman 13, la K sola, la de arriba del descarte cuenta
 *     como libre, robo de una en una y como mucho `rec` vueltas al mazo (nunca más de 2).
 *     Búsqueda en anchura: el mínimo es ÓPTIMO en movimientos (robar, reciclar y retirar cuentan 1).
 *   - TriPeaks: una arriba o abajo de la del montón, K y A enlazan, robo de una en una sin
 *     reciclar. Búsqueda en anchura: mínimo ÓPTIMO (jugar y robar cuentan 1).
 *   - Spider 2 palos (♠ ♥, 104 cartas contando las escaleras ya retiradas): mover una escalera
 *     del mismo palo sobre una carta de un punto más (cualquier palo) o a un hueco; repartir solo
 *     sin huecos; la escalera K→A del mismo palo se retira sola. Búsqueda en profundidad con
 *     tabla de transposiciones (por profundidad) y orden de jugadas, que sigue buscando rutas más
 *     cortas hasta 300 000 nodos; el mínimo es el MEJOR CONOCIDO (no óptimo).
 * Comprueba además que el reparto respeta la baraja (Spider: 4 copias de cada carta por palo;
 * Pyramid/TriPeaks: cartas distintas de una baraja de 52), que `min` coincide con lo que da el
 * resolutor (o lo mejora en Spider), que par ≥ min y que el reloj de la 2ª estrella en difícil
 * (tm × 0,85) deja al menos 1,2 s por movimiento del mínimo; y reproduce la solución paso a paso.
 */
const path = require('path');
const A52 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const dec = (ch) => { const v = A52.indexOf(ch); if (v < 0) throw new Error('carta ' + ch); return { r: (v % 13) + 1, s: (v / 13) | 0 }; };

/* ================= Pyramid ================= */
const PYN = (rw) => (rw * (rw + 1)) / 2;
function pyDeal(lv) {
  const rw = lv.rw || 7, n = PYN(rw), cards = [...lv.d].map(dec);
  return { rw, pyr: cards.slice(0, n), stock: cards.slice(n), rec: lv.rec == null ? 2 : lv.rec };
}
/* hijos de la posición (r, j) en orden fila a fila */
const pIdx = (r, j) => PYN(r) + j;
function pySolve(lv, cap) {
  const D = pyDeal(lv), rw = D.rw, n = PYN(rw), R = D.pyr.map((c) => c.r), SR = D.stock.map((c) => c.r);
  const free = (mask, r, j) => { const i = pIdx(r, j); if (!(mask & (1 << i))) return false; if (r === rw - 1) return true; return !(mask & (1 << pIdx(r + 1, j))) && !(mask & (1 << pIdx(r + 1, j + 1))); };
  /* estado: máscara de la pirámide, mazo y descarte como cadenas de índices (un carácter por carta), vueltas */
  const full = (1 << n) - 1, ch = (i) => String.fromCharCode(65 + i), SRc = (c) => SR[c.charCodeAt(0) - 65];
  let S0 = ''; for (let i = 0; i < SR.length; i++) S0 += ch(i);
  const start = [full, S0, '', 0];
  const key = (s) => s[0] + s[1] + '|' + s[2] + s[3];
  const FL = [], FB = []; for (let r = 0; r < rw; r++) for (let j = 0; j <= r; j++) { FL.push(pIdx(r, j)); FB.push(r === rw - 1 ? 0 : (1 << pIdx(r + 1, j)) | (1 << pIdx(r + 1, j + 1))); }
  const seen = new Set([key(start)]), par = new Map(); let fr = [start], depth = 0, nodes = 0;
  while (fr.length) {
    const nx = [];
    for (const s of fr) {
      const [m, S, Wt, v] = s;
      if (m === 0) return { d: depth, path: rebuild(par, key(s)), n: nodes };
      nodes++; if (nodes > (cap || 6e6)) return null;
      const fl = []; for (let q = 0; q < FL.length; q++) { const i = FL[q]; if ((m >> i) & 1 && !(m & FB[q])) fl.push(i); }
      const wt = Wt.length ? SRc(Wt[Wt.length - 1]) : 0, Wp = Wt.slice(0, -1), out = [];
      for (const i of fl) if (R[i] === 13) out.push([[m & ~(1 << i), S, Wt, v], 'K' + i]);
      if (wt === 13) out.push([[m, S, Wp, v], 'Kw']);
      for (let a = 0; a < fl.length; a++) for (let b = a + 1; b < fl.length; b++) if (R[fl[a]] + R[fl[b]] === 13) out.push([[m & ~(1 << fl[a]) & ~(1 << fl[b]), S, Wt, v], 'p' + fl[a] + '+' + fl[b]]);
      if (wt) for (const i of fl) if (R[i] + wt === 13) out.push([[m & ~(1 << i), S, Wp, v], 'w+' + i]);
      if (S.length) out.push([[m, S.slice(0, -1), Wt + S[S.length - 1], v], 'draw']);
      else if (Wt.length && v < D.rec) out.push([[m, [...Wt].reverse().join(''), '', v + 1], 'rec']);
      for (const [q, mv] of out) { const kq = key(q); if (seen.has(kq)) continue; seen.add(kq); par.set(kq, [key(s), mv]); nx.push(q); }
    }
    fr = nx; depth++;
  }
  return null;
}
function rebuild(par, k) { const p = []; while (par.has(k)) { const [pk, mv] = par.get(k); p.push(mv); k = pk; } return p.reverse(); }
/* reproduce una ruta con un motor independiente, escrito como el de cards.js (pyr[r][j], waste, stock.pop) */
function pyReplay(lv, route) {
  const D = pyDeal(lv), rw = D.rw; const pyr = []; let q = 0;
  for (let r = 0; r < 7; r++) { pyr.push([]); for (let j = 0; j <= r; j++) pyr[r].push(r < rw ? D.pyr[q++] : null); }
  let stock = D.stock.slice(), waste = [], recycles = 0, moves = 0;
  const at = (i) => { let r = 0; while (PYN(r + 1) <= i) r++; return [r, i - PYN(r)]; };
  const pyrFree = (r, j) => { if (!pyr[r][j]) return false; if (r === 6) return true; return !pyr[r + 1][j] && !pyr[r + 1][j + 1]; };
  const rm = (i) => { const [r, j] = at(i); if (!pyrFree(r, j)) throw new Error('no libre ' + i); const c = pyr[r][j]; pyr[r][j] = null; return c; };
  for (const mv of route) {
    if (mv === 'draw') { if (!stock.length) throw new Error('mazo vacío'); waste.push(stock.pop()); }
    else if (mv === 'rec') { if (stock.length || recycles >= D.rec) throw new Error('reciclar'); stock = waste.reverse(); waste = []; recycles++; }
    else if (mv === 'Kw') { if (waste[waste.length - 1].r !== 13) throw new Error('Kw'); waste.pop(); }
    else if (mv[0] === 'K') { if (rm(+mv.slice(1)).r !== 13) throw new Error('K'); }
    else if (mv[0] === 'p') { const [a, b] = mv.slice(1).split('+').map(Number); const [ra, ja] = at(a), [rb, jb] = at(b); if (!pyrFree(ra, ja) || !pyrFree(rb, jb)) throw new Error('par no libre'); if (pyr[ra][ja].r + pyr[rb][jb].r !== 13) throw new Error('no suman'); rm(a); rm(b); }
    else if (mv[0] === 'w') { const i = +mv.slice(2), w = waste[waste.length - 1], [r, j] = at(i); if (!pyrFree(r, j) || w.r + pyr[r][j].r !== 13) throw new Error('w+'); waste.pop(); rm(i); }
    moves++;
  }
  return pyr.every((r) => r.every((x) => !x)) ? moves : -1;
}

/* ================= TriPeaks ================= */
const TROWS = [3, 6, 9, 10];
function tCov(r, j) { return r === 0 ? [2 * j, 2 * j + 1] : r === 1 ? [j + Math.floor(j / 2), j + Math.floor(j / 2) + 1] : [j, j + 1]; }
function tDeal(lv) {
  const m = lv.m || '1'.repeat(28), cards = [...lv.d].map(dec), pos = []; let q = 0;
  for (let r = 0, o = 0; r < 4; r++) for (let j = 0; j < TROWS[r]; j++, o++) if (m[o] === '1') pos.push([r, j, cards[q++]]);
  const stock = cards.slice(q), w0 = stock.pop();
  return { pos, stock, w0 };
}
function tSolve(lv, cap) {
  const D = tDeal(lv), N = D.pos.length, id = {}; D.pos.forEach(([r, j], i) => (id[r + ',' + j] = i));
  const cov = D.pos.map(([r, j]) => (r === 3 ? [] : tCov(r, j).map((x) => id[(r + 1) + ',' + x]).filter((x) => x != null)));
  const RK = D.pos.map((p) => p[2].r), SR = D.stock.map((c) => c.r);
  const full = (2 ** N) - 1;
  /* estado: máscara (cartas que quedan), cuántas quedan en el mazo, rango de la de arriba */
  const start = [full, SR.length, D.w0.r];
  const key = (s) => s[0] * 4096 + s[1] * 16 + s[2];
  const seen = new Set([key(start)]), par = new Map(); let fr = [start], depth = 0, nodes = 0;
  while (fr.length) {
    const nx = [];
    for (const s of fr) {
      if (s[0] === 0) return { d: depth, path: rebuildT(par, key(s)), n: nodes };
      nodes++; if (nodes > (cap || 2e7)) return null;
      const out = [];
      for (let i = 0; i < N; i++) { const b = 2 ** i; if (!(Math.floor(s[0] / b) % 2)) continue; if (cov[i].some((x) => Math.floor(s[0] / 2 ** x) % 2)) continue;
        const d = Math.abs(RK[i] - s[2]); if (d === 1 || d === 12) out.push([[s[0] - b, s[1], RK[i]], 'c' + i]); }
      if (s[1] > 0) out.push([[s[0], s[1] - 1, SR[s[1] - 1]], 'draw']);
      for (const [q, mv] of out) { const kq = key(q); if (seen.has(kq)) continue; seen.add(kq); par.set(kq, [key(s), mv]); nx.push(q); }
    }
    fr = nx; depth++;
  }
  return null;
}
function rebuildT(par, k) { const p = []; while (par.has(k)) { const [pk, mv] = par.get(k); p.push(mv); k = pk; } return p.reverse(); }
function tReplay(lv, route) {
  const D = tDeal(lv), peaks = TROWS.map((n) => Array(n).fill(null));
  D.pos.forEach(([r, j, c]) => (peaks[r][j] = c));
  const peakFree = (r, j) => { if (!peaks[r][j]) return false; if (r === 3) return true; return tCov(r, j).every((q) => !peaks[r + 1][q]); };
  const stock = D.stock.slice(), waste = [D.w0]; let moves = 0;
  for (const mv of route) {
    if (mv === 'draw') { if (!stock.length) throw new Error('mazo'); waste.push(stock.pop()); }
    else { const [r, j] = D.pos[+mv.slice(1)], c = peaks[r][j], t = waste[waste.length - 1]; if (!peakFree(r, j)) throw new Error('no libre'); const d = Math.abs(c.r - t.r); if (d !== 1 && d !== 12) throw new Error('no enlaza'); peaks[r][j] = null; waste.push(c); }
    moves++;
  }
  return peaks.every((r) => r.every((x) => !x)) ? moves : -1;
}

/* ================= Spider ================= */
function sDeal(lv) {
  const cards = [...lv.d].map(dec), tab = []; let i = 0; const u = lv.u || 1;
  for (const n of lv.p) { const pile = cards.slice(i, i + n).map((c, q) => ({ ...c, up: q >= n - u })); i += n; tab.push(pile); }
  while (tab.length < 10) tab.push([]);
  const stock = cards.slice(i);
  /* escaleras ya retiradas: lo que falta de cada palo para tener 4 escaleras de ♠ y 4 de ♥ */
  const per = [0, 0]; cards.forEach((c) => per[c.s]++);
  return { tab, stock, done: [4 - per[0] / 13, 4 - per[1] / 13] };
}
/* codificación compacta: carta = s*13 + r-1 (0..25), +32 si está boca abajo */
function sSolve(lv, opt) {
  opt = opt || {}; const cap = opt.cap || 3e6, D = sDeal(lv);
  const tab = D.tab.map((col) => col.map((c) => c.s * 13 + c.r - 1 + (c.up ? 0 : 32)));
  const stock = D.stock.map((c) => c.s * 13 + c.r - 1);
  let stockN = stock.length, removed = 0; const need = D.tab.reduce((s, c) => s + c.length, 0) + stock.length;
  const total = need / 13; const seen = new Map(), route = []; let nodes = 0, best = null;
  const R = (x) => (x & 31) % 13, S = (x) => ((x & 31) / 13) | 0, UP = (x) => x < 32;
  const key = () => tab.map((c) => c.join('.')).join('/') + '#' + stockN;
  /* comprueba y retira escalera completa en la columna i; devuelve la escalera o null */
  function runAt(i) { const c = tab[i]; if (c.length < 13) return null; const t = c.length - 13; const s0 = c[t]; if (!UP(s0) || R(s0) !== 12) return null;
    for (let q = t + 1; q < c.length; q++) { const a = c[q - 1], b = c[q]; if (!UP(b) || S(a) !== S(b) || R(a) !== R(b) + 1) return null; } return c.splice(t, 13); }
  function flip(i) { const c = tab[i]; if (c.length && !UP(c[c.length - 1])) { c[c.length - 1] -= 32; return true; } return false; }
  function moves() {
    const out = [];
    const empties = []; tab.forEach((c, i) => !c.length && empties.push(i));
    for (let i = 0; i < 10; i++) { const c = tab[i]; if (!c.length) continue;
      /* inicio de la escalera movible más larga */
      let st = c.length - 1; while (st > 0 && UP(c[st - 1]) && S(c[st - 1]) === S(c[st]) && R(c[st - 1]) === R(c[st]) + 1) st--;
      for (let a = st; a < c.length; a++) { const b = c[a], above = a > 0 ? c[a - 1] : -1, len = c.length - a;
        const natural = above >= 0 && UP(above) && R(above) === R(b) + 1; /* ya está sobre su carta */
        for (let j = 0; j < 10; j++) { if (j === i || !tab[j].length) continue; const t = tab[j][tab[j].length - 1];
          if (R(t) !== R(b) + 1) continue;
          const suited = S(t) === S(b); let sc;
          if (natural && !(suited && S(above) !== S(b))) continue; /* no rompe un enlace por otro igual */
          if (suited) sc = 50 + len + (a === 0 ? 20 : 0) + (above >= 0 && !UP(above) ? 30 : 0);
          else { if (a !== st) continue; /* escalera entera al cambiar de palo */ if (!(a === 0 || (above >= 0 && !UP(above)))) continue; sc = 20 + (above >= 0 && !UP(above) ? 30 : 0) + (a === 0 ? 10 : 0); }
          out.push([sc, i, a, j]); }
        if (empties.length && a > 0 && (a === st)) { const sc = (!UP(above) ? 15 : 5) + (natural ? -20 : 0); if (!natural || S(above) !== S(b)) out.push([sc, i, a, empties[0]]); }
      } }
    out.sort((x, y) => y[0] - x[0]);
    return out;
  }
  function dfs(depth) {
    if (removed === total) { if (!best || route.length < best.length) best = route.slice(); return true; }
    if (++nodes > cap) return false;
    if (best && depth + 1 >= best.length) return false;
    const k = key(), sd = seen.get(k); if (sd != null && sd <= depth) return false; seen.set(k, depth);
    for (const [, i, a, j] of moves()) {
      const run = tab[i].splice(a); const fl = flip(i); tab[j].push(...run); const done = runAt(j); let fl2 = false; if (done) { removed++; fl2 = flip(j); }
      route.push(['m', i, a, j]);
      if (dfs(depth + 1) && !opt.improve) return true;
      route.pop();
      if (done) { if (fl2) tab[j][tab[j].length - 1] += 32; tab[j].push(...done); removed--; }
      tab[j].splice(tab[j].length - run.length); if (fl) tab[i][tab[i].length - 1] += 32; tab[i].push(...run);
      if (nodes > cap) return !!best;
    }
    if (stockN && tab.every((c) => c.length)) {
      const got = [], fls = [];
      for (let i = 0; i < 10; i++) tab[i].push(stock[--stockN]);
      for (let i = 0; i < 10; i++) { const d = runAt(i); got.push(d); fls.push(d ? flip(i) : false); if (d) removed++; }
      route.push(['d']);
      if (dfs(depth + 1) && !opt.improve) return true;
      route.pop();
      for (let i = 9; i >= 0; i--) { if (got[i]) { if (fls[i]) tab[i][tab[i].length - 1] += 32; tab[i].push(...got[i]); removed--; } }
      for (let i = 9; i >= 0; i--) tab[i].pop(); stockN += 10;
    }
    return !!best;
  }
  dfs(0);
  return best ? { d: best.length, path: best, n: nodes } : null;
}
/* reproduce una ruta con reglas escritas como las de cards.js (tabOk/validRun/checkRun) */
function sReplay(lv, route) {
  const D = sDeal(lv), tab = D.tab.map((c) => c.map((x) => ({ ...x }))), stock = D.stock.map((x) => ({ ...x, up: false }));
  let removed = D.done[0] + D.done[1], moves = 0;
  const validRun = (st) => { for (let i = 0; i < st.length - 1; i++) { const a = st[i], b = st[i + 1]; if (!b.up || a.r !== b.r + 1 || a.s !== b.s) return false; } return st.every((q) => q.up); };
  const flipTops = () => tab.forEach((c) => { if (c.length && !c[c.length - 1].up) c[c.length - 1].up = true; });
  const checkRun = (i) => { const c = tab[i]; if (c.length < 13) return; const run = c.slice(-13); if (run[0].r === 13 && validRun(run)) { c.splice(-13); removed++; flipTops(); } };
  for (const mv of route) {
    if (mv[0] === 'd') { if (!stock.length || !tab.every((c) => c.length)) throw new Error('reparto'); tab.forEach((c) => { const x = stock.pop(); x.up = true; c.push(x); }); tab.forEach((_, i) => checkRun(i)); }
    else { const [, i, a, j] = mv, st = tab[i].slice(a); if (!validRun(st)) throw new Error('no es escalera'); const top = tab[j][tab[j].length - 1];
      if (top && !(top.up && top.r === st[0].r + 1)) throw new Error('no encaja'); tab[i].splice(a); flipTops(); tab[j].push(...st); checkRun(j); }
    moves++;
  }
  return removed === 8 ? moves : -1;
}

const API = { dec, pyDeal, pySolve, pyReplay, tDeal, tSolve, tReplay, sDeal, sSolve, sReplay };
module.exports = API;

/* ================= Comprobación de las tablas ================= */
if (require.main === module) {
  const CARDLV = require(path.join(__dirname, '..', 'src', 'eng', 'cardlv.js'));
  const onlyT = process.argv[2], onlyN = process.argv[3] ? +process.argv[3] : 0;
  let bad = 0, total = 0;
  for (const T of ['S', 'P', 'T', 'DS', 'DP', 'DT']) {
    if (onlyT && onlyT !== T) continue;
    const g = T[T.length - 1], tab = CARDLV[T];
    if (!tab || tab.length !== 20) { console.log(`${T}: la tabla no tiene 20 retos`); bad++; continue; }
    console.log(`\n== ${T} ==   n  nombre                     min  par  tm(f/n/d)        nodos`);
    tab.forEach((lv, i) => {
      const n = i + 1; if (onlyN && n !== onlyN) return; total++;
      const errs = [], t0 = Date.now();
      /* baraja */
      const cs = [...lv.d];
      if (g === 'S') { const cnt = {}; cs.forEach((ch) => (cnt[ch] = (cnt[ch] || 0) + 1));
        if (cs.some((ch) => A52.indexOf(ch) >= 26)) errs.push('palo fuera de ♠♥');
        const per = [0, 0]; cs.forEach((ch) => per[(A52.indexOf(ch) / 13) | 0]++);
        if (per[0] % 13 || per[1] % 13) errs.push('escaleras incompletas');
        for (let v = 0; v < 26; v++) { const want = (per[(v / 13) | 0] / 13); if ((cnt[A52[v]] || 0) !== want) errs.push(`${A52[v]}×${cnt[A52[v]] || 0}`); }
        const tabN = lv.p.reduce((s, x) => s + x, 0); if ((cs.length - tabN) % 10) errs.push('mazo no múltiplo de 10'); if (lv.p.length > 10) errs.push('más de 10 columnas'); }
      else { if (new Set(cs).size !== cs.length) errs.push('carta repetida'); }
      if (g === 'P' && lv.rec != null && lv.rec > 2) errs.push('más de 2 reciclados');
      if (g === 'P' && cs.length < PYN(lv.rw || 7)) errs.push('faltan cartas');
      if (g === 'T') { const m = lv.m || '1'.repeat(28); if (m.length !== 28) errs.push('máscara'); const nl = [...m].filter((x) => x === '1').length; if (cs.length < nl + 1) errs.push('sin mazo'); }
      /* resolver */
      const r = g === 'P' ? pySolve(lv) : g === 'T' ? tSolve(lv) : sSolve(lv, { cap: 3e5, improve: true });
      if (!r) errs.push('SIN SOLUCIÓN');
      else {
        const rp = g === 'P' ? pyReplay(lv, r.path) : g === 'T' ? tReplay(lv, r.path) : sReplay(lv, r.path);
        if (rp !== r.d) errs.push('la ruta no gana al reproducirla');
        if (g === 'S' ? r.d > lv.min : r.d !== lv.min) errs.push(`min=${lv.min}≠${r.d}`);
      }
      if (lv.par < lv.min) errs.push('par<min');
      if (lv.tm * 0.85 < lv.min * 1.2) errs.push('reloj de 2★ corto en difícil');
      if (!T.startsWith('D') && !lv.e) errs.push('sin cartel de escuela');
      if (errs.length) bad++;
      console.log(`      ${String(n).padStart(2)}  ${lv.n.padEnd(26)} ${String(lv.min).padStart(4)} ${String(lv.par).padStart(4)}  ${[1.55, 1.15, 0.85].map((f) => Math.round(lv.tm * f)).join('/').padEnd(15)} ${String(r ? r.n : 0).padStart(8)} ${Date.now() - t0}ms` + (errs.length ? '  ** ' + errs.join(', ') : ''));
      if (onlyN && r) console.log(JSON.stringify(r.path));
    });
  }
  console.log(bad ? `\n${bad} de ${total} con fallos` : `\nTodo correcto (${total} repartos verificados)`);
  process.exit(bad ? 1 : 0);
}
