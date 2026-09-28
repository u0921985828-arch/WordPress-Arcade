/* FR — reglas puras de Fichas de Colores (estilo rummy de fichas, marca blanca).
 * 106 fichas: números 1–13 en 4 colores, dos juegos completos, más 2 comodines.
 * Combinaciones válidas: GRUPO (3 o 4 fichas del mismo número y colores distintos) y
 * ESCALERA (3 o más fichas seguidas del mismo color). Los comodines valen por cualquier ficha.
 * La primera bajada de cada jugador tiene que sumar 30 o más con fichas de su propia mano.
 * Verificable en Node: node -e "require('./src/eng/fichasrul.js')". */
var FR = (function () {
  var COLS = 4, NMAX = 13;
  function deck(rndi) {
    var t = [], id = 0, c, n, k;
    for (k = 0; k < 2; k++) for (c = 0; c < COLS; c++) for (n = 1; n <= NMAX; n++) t.push({ id: id++, c: c, n: n, j: 0 });
    t.push({ id: id++, c: -1, n: 0, j: 1 }); t.push({ id: id++, c: -1, n: 0, j: 1 });
    for (var i = t.length - 1; i > 0; i--) { var r = rndi(i + 1), tmp = t[i]; t[i] = t[r]; t[r] = tmp; }
    return t;
  }
  /* Devuelve null si la combinación no vale; si vale, {kind, vals} con el valor de cada ficha. */
  function info(ts) {
    if (!ts || ts.length < 3) return null;
    var nj = [], js = 0, i;
    for (i = 0; i < ts.length; i++) (ts[i].j ? js++ : nj.push(ts[i]));
    if (!nj.length) return null; /* sólo comodines no es combinación */
    /* grupo */
    if (ts.length <= COLS) {
      var n0 = nj[0].n, ok = true, seen = {};
      for (i = 0; i < nj.length; i++) { if (nj[i].n !== n0 || seen[nj[i].c]) { ok = false; break; } seen[nj[i].c] = 1; }
      if (ok) { var vg = []; for (i = 0; i < ts.length; i++) vg.push(n0); return { kind: 'grupo', vals: vg, n: n0 }; }
    }
    /* escalera */
    var c0 = nj[0].c, ns = [];
    for (i = 0; i < nj.length; i++) { if (nj[i].c !== c0) return null; ns.push(nj[i].n); }
    ns.sort(function (a, b) { return a - b; });
    for (i = 1; i < ns.length; i++) if (ns[i] === ns[i - 1]) return null;
    var lo = ns[0], hi = ns[ns.length - 1], span = hi - lo + 1;
    if (span > ts.length) return null;
    var gaps = span - nj.length, left = js - gaps;
    if (left < 0) return null;
    if (lo - 1 + (NMAX - hi) < left) return null;
    /* extiende primero hacia abajo lo que quepa */
    var down = Math.min(left, lo - 1), start = lo - down, end = hi + (left - down);
    if (end > NMAX) return null;
    /* reparte los valores en el orden en el que llegan las fichas */
    var used = {}, vals = new Array(ts.length), free = [];
    for (i = start; i <= end; i++) free.push(i);
    for (i = 0; i < ts.length; i++) if (!ts[i].j) { vals[i] = ts[i].n; used[ts[i].n] = 1; }
    var pool = free.filter(function (v) { return !used[v]; });
    for (i = 0; i < ts.length; i++) if (ts[i].j) vals[i] = pool.shift();
    return { kind: 'escalera', vals: vals, c: c0 };
  }
  var valid = function (ts) { return !!info(ts); };
  function value(ts) { var f = info(ts); if (!f) return 0; var s = 0; for (var i = 0; i < f.vals.length; i++) s += f.vals[i]; return s; }
  var tableOK = function (tb) { for (var i = 0; i < tb.length; i++) if (!valid(tb[i])) return false; return true; };
  var penalty = function (hand) { var s = 0; for (var i = 0; i < hand.length; i++) s += hand[i].j ? 30 : hand[i].n; return s; };

  /* ---- candidatos para la IA: todas las combinaciones que salen de una mano ---- */
  function cands(hand) {
    var out = [], i, j, c, n;
    var js = hand.filter(function (t) { return t.j; });
    var by = {};
    for (i = 0; i < hand.length; i++) { var t = hand[i]; if (t.j) continue; (by[t.c + ':' + t.n] = by[t.c + ':' + t.n] || []).push(t); }
    /* grupos */
    for (n = 1; n <= NMAX; n++) {
      var pick = [];
      for (c = 0; c < COLS; c++) { var a = by[c + ':' + n]; if (a && a.length) pick.push(a[0]); }
      if (pick.length >= 3) { out.push(pick.slice(0, 4)); if (pick.length === 4) for (i = 0; i < 4; i++) out.push(pick.filter(function (_, k) { return k !== i; })); }
      if (pick.length === 2 && js.length) out.push(pick.concat([js[0]]));
    }
    /* escaleras */
    for (c = 0; c < COLS; c++) {
      var have = [];
      for (n = 1; n <= NMAX; n++) { var b = by[c + ':' + n]; have.push(b && b.length ? b[0] : null); }
      for (i = 0; i < NMAX; i++) for (j = i + 2; j < NMAX; j++) {
        var run = [], holes = 0, okr = true;
        for (n = i; n <= j; n++) { if (have[n]) run.push(have[n]); else { holes++; if (holes > js.length) { okr = false; break; } run.push(js[holes - 1]); } }
        if (!okr) break;
        if (run.length >= 3 && valid(run)) out.push(run);
      }
    }
    return out;
  }
  /* Elige combinaciones sin fichas repetidas que sumen `need` o más (para la primera bajada). */
  function meld(hand, need) {
    var cs = cands(hand).map(function (s) { return { s: s, v: value(s) }; }).sort(function (a, b) { return b.v - a.v; });
    var best = null;
    function go(i, used, acc, sum) {
      if (sum >= need) { if (!best || sum > best.sum) best = { sets: acc.slice(), sum: sum }; return; }
      if (i >= cs.length || acc.length > 4) return;
      for (var k = i; k < cs.length; k++) {
        var s = cs[k].s, clash = false;
        for (var q = 0; q < s.length; q++) if (used[s[q].id]) { clash = true; break; }
        if (clash) continue;
        for (q = 0; q < s.length; q++) used[s[q].id] = 1;
        acc.push(s); go(k + 1, used, acc, sum + cs[k].v); acc.pop();
        for (q = 0; q < s.length; q++) used[s[q].id] = 0;
        if (best) return;
      }
    }
    go(0, {}, [], 0);
    return best;
  }
  /* Añade fichas de la mano a combinaciones ya puestas sin romperlas. */
  function extend(hand, table) {
    var moves = [];
    for (var h = 0; h < hand.length; h++) for (var s = 0; s < table.length; s++) {
      for (var p = 0; p <= table[s].length; p++) {
        var nw = table[s].slice(); nw.splice(p, 0, hand[h]);
        if (valid(nw)) { moves.push({ tile: hand[h], set: s, at: p }); p = table[s].length + 1; }
      }
    }
    return moves;
  }
  /* Coloca una ficha de la mano rehaciendo UNA combinación de la mesa (partir escaleras,
   * repartir en dos). Se prueban todas las particiones en una o dos combinaciones válidas. */
  function rebuild(hand, table) {
    for (var h = 0; h < hand.length; h++) for (var s = 0; s < table.length; s++) {
      var all = table[s].concat([hand[h]]), n = all.length;
      if (n > 9) continue;
      if (valid(all)) return { tile: hand[h], set: s, parts: [all] };
      for (var m = 1; m < (1 << n) - 1; m++) {
        var a = [], b = [], i;
        for (i = 0; i < n; i++) ((m >> i) & 1 ? a : b).push(all[i]);
        if (a.length < 3 || b.length < 3) continue;
        if (valid(a) && valid(b)) return { tile: hand[h], set: s, parts: [a, b] };
      }
    }
    return null;
  }
  /* Turno completo de la CPU sobre copias: baja si puede, coloca en lo que hay y encadena. */
  function cpuTurn(hand, table, melded) {
    var h = hand.slice(), tb = table.map(function (s) { return s.slice(); }), played = false, first = false;
    if (!melded) {
      var m = meld(h, 30);
      if (!m) return { hand: h, table: tb, played: false, melded: melded };
      for (var i = 0; i < m.sets.length; i++) { tb.push(m.sets[i].slice()); h = h.filter(function (t) { return m.sets[i].indexOf(t) < 0; }); }
      played = true; first = true; melded = true;
    }
    for (var pass = 0; pass < 14; pass++) {
      var mv = extend(h, tb);
      if (mv.length) { var b = mv[0]; tb[b.set].splice(b.at, 0, b.tile); h = h.filter(function (t) { return t !== b.tile; }); played = true; continue; }
      var rb = rebuild(h, tb);
      if (rb) { tb.splice(rb.set, 1); for (var q = 0; q < rb.parts.length; q++) tb.push(rb.parts[q]); h = h.filter(function (t) { return t !== rb.tile; }); played = true; continue; }
      var extra = meld(h, 1);
      if (extra) { for (var j = 0; j < extra.sets.length; j++) { var st = extra.sets[j]; tb.push(st.slice()); h = h.filter(function (t) { return st.indexOf(t) < 0; }); } played = true; continue; }
      break;
    }
    return { hand: h, table: tb, played: played, melded: melded, first: first };
  }
  return { rebuild: rebuild, cpuTurn: cpuTurn, deck: deck, info: info, valid: valid, value: value, tableOK: tableOK, penalty: penalty, cands: cands, meld: meld, extend: extend, COLS: COLS, NMAX: NMAX };
})();
if (typeof module !== 'undefined') module.exports = FR;
