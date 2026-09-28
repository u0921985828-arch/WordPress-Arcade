/* triorul.js — reglas puras de Triángulos Numerados (triominós, marca blanca).
 * Sin dibujo ni Kit: se verifica en Node con simulaciones. */
var TRI = (function () {
  /* Rejilla triangular: celda (r,i). Apunta ARRIBA si (r+i) es par.
   * Esquinas en sentido horario: ARRIBA [cima, abajo-dcha, abajo-izq]; ABAJO [pico, arriba-izq, arriba-dcha]. */
  var up = function (r, i) { return ((r + i) & 1) === 0; };
  /* Vecinos y qué esquinas comparten: {dr, di, m:[[mía, suya], …]} */
  var NB_U = [{ dr: 0, di: -1, m: [[0, 2], [2, 0]] },
              { dr: 0, di: 1, m: [[0, 1], [1, 0]] },
              { dr: 1, di: 0, m: [[2, 1], [1, 2]] }];
  var NB_D = [{ dr: 0, di: -1, m: [[1, 0], [0, 1]] },
              { dr: 0, di: 1, m: [[2, 0], [0, 2]] },
              { dr: -1, di: 0, m: [[1, 2], [2, 1]] }];
  var nbs = function (r, i) { return up(r, i) ? NB_U : NB_D; };
  var key = function (r, i) { return r + ',' + i; };

  /* Baraja: las 56 combinaciones a<=b<=c con valores 0..5. */
  function deck(rndi) {
    var d = [], a, b, c;
    for (a = 0; a <= 5; a++) for (b = a; b <= 5; b++) for (c = b; c <= 5; c++) d.push([a, b, c]);
    for (var i = d.length - 1; i > 0; i--) { var j = rndi(i + 1), t = d[i]; d[i] = d[j]; d[j] = t; }
    return d;
  }
  var val = function (t) { return t[0] + t[1] + t[2]; };
  var triple = function (t) { return t[0] === t[1] && t[1] === t[2]; };
  var rot = function (t, k) { return [t[k % 3], t[(k + 1) % 3], t[(k + 2) % 3]]; };

  /* ¿Cabe el trío `v` (ya rotado, en orden de esquinas) en (r,i)? */
  function fits(board, r, i, v) {
    var ns = nbs(r, i), touch = 0, e;
    for (var n = 0; n < 3; n++) {
      var o = board[key(r + ns[n].dr, i + ns[n].di)];
      if (!o) continue;
      touch++;
      for (e = 0; e < 2; e++) if (v[ns[n].m[e][0]] !== o.v[ns[n].m[e][1]]) return -1;
    }
    return touch;
  }
  /* Celdas vacías pegadas a lo ya puesto. */
  function slots(board) {
    var out = [], seen = {}, kk;
    for (kk in board) {
      var p = kk.split(','), r = +p[0], i = +p[1], ns = nbs(r, i);
      for (var n = 0; n < 3; n++) {
        var rr = r + ns[n].dr, ii = i + ns[n].di, k2 = key(rr, ii);
        if (board[k2] || seen[k2]) continue;
        seen[k2] = 1; out.push([rr, ii]);
      }
    }
    return out;
  }
  /* Hexágonos completos que toca el vértice (R,K): 6 celdas alrededor. */
  function hexAt(board, R, K) {
    var cs = [[R, K - 1], [R, K], [R, K - 2], [R - 1, K], [R - 1, K - 1], [R - 1, K - 2]];
    for (var n = 0; n < 6; n++) if (!board[key(cs[n][0], cs[n][1])]) return 0;
    return 1;
  }
  function verts(r, i) {
    return up(r, i) ? [[r, i + 1], [r + 1, i], [r + 1, i + 2]] : [[r, i], [r, i + 2], [r + 1, i + 1]];
  }
  /* Puntos de colocar `v` en (r,i) (el tablero ya debe tenerlo puesto). */
  function score(board, r, i, v, touch) {
    var s = val(v), bonus = [];
    if (triple(v)) { s += v[0] === 0 ? 40 : 10; bonus.push(v[0] === 0 ? 'triple cero' : 'triple'); }
    if (touch >= 2) { s += 40; bonus.push('puente'); }
    var vs = verts(r, i), h = 0;
    for (var n = 0; n < 3; n++) if (hexAt(board, vs[n][0], vs[n][1])) h++;
    if (h) { s += 50 * h; bonus.push(h > 1 ? h + ' hexágonos' : 'hexágono'); }
    return { pts: s, bonus: bonus };
  }
  /* Todas las jugadas legales de una mano. */
  function moves(board, hand) {
    var out = [], sl = slots(board), n, h, k;
    if (!sl.length) sl = [[0, 0]];
    for (n = 0; n < sl.length; n++) for (h = 0; h < hand.length; h++) for (k = 0; k < 3; k++) {
      var v = rot(hand[h], k), t = fits(board, sl[n][0], sl[n][1], v);
      if (t < 0 || (t === 0 && Object.keys(board).length)) continue;
      out.push({ r: sl[n][0], i: sl[n][1], h: h, v: v, touch: t });
      if (triple(hand[h])) break; /* las tres rotaciones de un triple son la misma */
    }
    return out;
  }
  /* Simula la puntuación de una jugada sin ensuciar el tablero. */
  function rate(board, m) {
    board[key(m.r, m.i)] = { v: m.v };
    var s = score(board, m.r, m.i, m.v, m.touch);
    delete board[key(m.r, m.i)];
    return s;
  }
  /* Elección de la máquina: mejor jugada, con despistes según `skill` (0..1). */
  function ai(board, hand, skill, rnd) {
    var ms = moves(board, hand);
    if (!ms.length) return null;
    var best = null, bp = -1e9;
    for (var n = 0; n < ms.length; n++) {
      var p = rate(board, ms[n]).pts - val(hand[ms[n].h]) * 0.15 + rnd() * (1 - skill) * 30;
      if (p > bp) { bp = p; best = ms[n]; }
    }
    return best;
  }
  return { deck: deck, val: val, triple: triple, rot: rot, fits: fits, slots: slots, moves: moves,
           rate: rate, score: score, ai: ai, up: up, nbs: nbs, key: key, verts: verts, hexAt: hexAt };
})();
if (typeof module !== 'undefined') module.exports = TRI;
