/* esqrul.js — reglas puras de Esquinas de Colores (estilo Blokus, marca blanca).
 * Sin dibujo ni Kit: se verifica en Node. */
var ESQ = (function () {
  /* --- las 21 piezas (poliominós libres de 1 a 5 casillas) --- */
  function norm(cs) {
    var mx = 1e9, my = 1e9, n;
    for (n = 0; n < cs.length; n++) { if (cs[n][0] < mx) mx = cs[n][0]; if (cs[n][1] < my) my = cs[n][1]; }
    var o = cs.map(function (c) { return [c[0] - mx, c[1] - my]; });
    o.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    return o;
  }
  var sig = function (cs) { return cs.map(function (c) { return c[0] + ':' + c[1]; }).join('|'); };
  function tf(cs, t) {
    return cs.map(function (c) { var x = c[0], y = c[1];
      if (t & 4) { var s = x; x = y; y = s; }
      return [(t & 1) ? -x : x, (t & 2) ? -y : y]; });
  }
  function oris(cs) {
    var seen = {}, out = [];
    for (var t = 0; t < 8; t++) { var o = norm(tf(cs, t)), s = sig(o); if (!seen[s]) { seen[s] = 1; out.push(o); } }
    return out;
  }
  function build() {
    var lvl = [[[[0, 0]]]], all = [], L, seen, n, j, d;
    var D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (L = 1; L <= 5; L++) {
      var cur = lvl[L - 1], next = [], sn = {};
      for (n = 0; n < cur.length; n++) { var s2 = sig(norm(cur[n])); if (!sn['@' + s2]) { sn['@' + s2] = 1; all.push(norm(cur[n])); } }
      if (L === 5) break;
      seen = {};
      for (n = 0; n < cur.length; n++) for (j = 0; j < cur[n].length; j++) for (d = 0; d < 4; d++) {
        var nx = cur[n][j][0] + D[d][0], ny = cur[n][j][1] + D[d][1], dup = 0;
        for (var q = 0; q < cur[n].length; q++) if (cur[n][q][0] === nx && cur[n][q][1] === ny) dup = 1;
        if (dup) continue;
        var cs = norm(cur[n].concat([[nx, ny]])), key = null;
        var os = oris(cs); for (var o = 0; o < os.length; o++) { var s3 = sig(os[o]); if (key === null || s3 < key) key = s3; }
        if (seen[key]) continue; seen[key] = 1; next.push(cs);
      }
      lvl.push(next);
    }
    /* `all` trae una entrada por pieza libre: quedarse con una por forma canónica */
    var uniq = {}, out = [];
    for (n = 0; n < all.length; n++) {
      var os2 = oris(all[n]), kk = null;
      for (j = 0; j < os2.length; j++) { var s4 = sig(os2[j]); if (kk === null || s4 < kk) kk = s4; }
      if (uniq[kk]) continue; uniq[kk] = 1; out.push(os2);
    }
    out.sort(function (a, b) { return a[0].length - b[0].length; });
    return out;
  }
  var PIECES = build();

  /* --- tablero --- */
  var N = 20;
  var idx = function (x, y, n) { return y * n + x; };
  function nuevo(n, np) {
    n = n || N;
    var b = new Int8Array(n * n); b.fill(-1);
    var st = np === 2 ? [[4, 4], [n - 5, n - 5]] : [[0, 0], [n - 1, 0], [n - 1, n - 1], [0, n - 1]];
    return { n: n, b: b, np: np, st: st.slice(0, np), used: [], first: [] };
  }
  function fits(g, p, cells) {
    var n = g.n, own = 0, i, x, y;
    for (i = 0; i < cells.length; i++) {
      x = cells[i][0]; y = cells[i][1];
      if (x < 0 || y < 0 || x >= n || y >= n) return 0;
      if (g.b[idx(x, y, n)] >= 0) return 0;
      if (x > 0 && g.b[idx(x - 1, y, n)] === p) return 0;
      if (x < n - 1 && g.b[idx(x + 1, y, n)] === p) return 0;
      if (y > 0 && g.b[idx(x, y - 1, n)] === p) return 0;
      if (y < n - 1 && g.b[idx(x, y + 1, n)] === p) return 0;
      if ((x > 0 && y > 0 && g.b[idx(x - 1, y - 1, n)] === p) || (x < n - 1 && y > 0 && g.b[idx(x + 1, y - 1, n)] === p) ||
          (x > 0 && y < n - 1 && g.b[idx(x - 1, y + 1, n)] === p) || (x < n - 1 && y < n - 1 && g.b[idx(x + 1, y + 1, n)] === p)) own = 1;
    }
    if (g.first[p]) { /* ya ha jugado: hace falta contacto en esquina */ return own ? 1 : 0; }
    for (i = 0; i < cells.length; i++) if (cells[i][0] === g.st[p][0] && cells[i][1] === g.st[p][1]) return 1;
    return 0;
  }
  /* Casillas donde puede nacer la siguiente pieza. */
  function anchors(g, p) {
    if (!g.first[p]) return [g.st[p]];
    var n = g.n, out = [], seen = {}, x, y, d;
    var D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
      if (g.b[idx(x, y, n)] !== p) continue;
      for (d = 0; d < 4; d++) { var ax = x + D[d][0], ay = y + D[d][1];
        if (ax < 0 || ay < 0 || ax >= n || ay >= n || g.b[idx(ax, ay, n)] >= 0) continue;
        var kk = ax + ',' + ay; if (seen[kk]) continue; seen[kk] = 1; out.push([ax, ay]); }
    }
    return out;
  }
  /* Todas las jugadas legales de `p`. `left` = índices de piezas que le quedan. */
  function moves(g, p, left, cap) {
    var an = anchors(g, p), out = [], a, q, o, j;
    for (a = 0; a < an.length; a++) for (q = 0; q < left.length; q++) {
      var os = PIECES[left[q]];
      for (o = 0; o < os.length; o++) for (j = 0; j < os[o].length; j++) {
        var dx = an[a][0] - os[o][j][0], dy = an[a][1] - os[o][j][1];
        var cells = os[o].map(function (c) { return [c[0] + dx, c[1] + dy]; });
        if (!fits(g, p, cells)) continue;
        out.push({ p: p, pi: left[q], o: o, dx: dx, dy: dy, cells: cells });
        if (cap && out.length >= cap) return out;
      }
    }
    return out;
  }
  function play(g, m) {
    for (var i = 0; i < m.cells.length; i++) g.b[idx(m.cells[i][0], m.cells[i][1], g.n)] = m.p;
    g.first[m.p] = 1;
  }
  /* Valoración: piezas grandes primero, abrir esquinas propias y cerrar las del rival. */
  function rate(g, m, left) {
    var n = g.n, s = m.cells.length * 20, i, d, c = (n - 1) / 2;
    var D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (i = 0; i < m.cells.length; i++) {
      s -= (Math.abs(m.cells[i][0] - c) + Math.abs(m.cells[i][1] - c)) * 0.25;
      for (d = 0; d < 4; d++) { var ax = m.cells[i][0] + D[d][0], ay = m.cells[i][1] + D[d][1];
        if (ax >= 0 && ay >= 0 && ax < n && ay < n && g.b[idx(ax, ay, n)] < 0) s += 1.2; }
    }
    void left; return s;
  }
  function ai(g, p, left, skill, rnd) {
    var ms = moves(g, p, left, 4000);
    if (!ms.length) return null;
    var best = null, bp = -1e9;
    for (var i = 0; i < ms.length; i++) { var v = rate(g, ms[i], left) + rnd() * (1 - skill) * 45;
      if (v > bp) { bp = v; best = ms[i]; } }
    return best;
  }
  var size = function (pi) { return PIECES[pi][0].length; };
  function score(left, lastMono) {
    var s = 0; for (var i = 0; i < left.length; i++) s -= size(left[i]);
    if (!left.length) s += lastMono ? 20 : 15;
    return s;
  }
  return { PIECES: PIECES, nuevo: nuevo, fits: fits, anchors: anchors, moves: moves, play: play,
           rate: rate, ai: ai, size: size, score: score, idx: idx };
})();
if (typeof module !== 'undefined') module.exports = ESQ;
