/* Motor `tren`: tres juegos de trenes.
 *   CFG.mode='vias'   → Vías del Valle: colocas tramos de vía en la rejilla para que la locomotora
 *     recoja los vagones EN ORDEN y llegue a la estación. Cruces, túneles y cambios de agujas.
 *     20 niveles escritos a mano (tabla LV) con el mínimo de piezas calculado por un resolutor
 *     propio (profundización iterativa sobre el recorrido del tren, verificado en Node).
 *   CFG.mode='metro'  → Metro en Hora Punta: dibujas líneas entre las estaciones que van
 *     apareciendo, pones trenes y mueves pasajeros con transbordos. 12 semanas escritas a mano con
 *     su objetivo y 12 medallas; la partida termina de verdad al acabar la semana 12.
 *   CFG.mode='choque' → Choque de Trenes: 1–4 jugadores en la tele. Cada uno lleva las agujas de su
 *     tren en un tablero compartido: carga tu mercancía, llévala a tu apeadero y no choques.
 *
 * Todo lo que se puede comprobar sin dibujar (la tabla de niveles, el simulador del tren, el
 * resolutor y el núcleo del metro) vive en la ZONA PURA de más abajo, entre <PURE> y </PURE>: no
 * toca Kit, ART, window ni el DOM, y se exporta con module.exports para verificarlo desde Node.
 * Arte: 100 % por código, §8 «ley de la pieza única» (un trazado por objeto, relleno y contorneado
 * una sola vez), cel de 3 tonos con borde duro, sprites cacheados a Math.min(2, devicePixelRatio);
 * ni shadowBlur, ni filter, ni gradientes dentro del bucle. */

/* <PURE> ========================================================================================
 * 1) VÍAS DEL VALLE — reglas deterministas (sin azar)
 * Direcciones d: 0 derecha, 1 abajo, 2 izquierda, 3 arriba (en los mapas: > v < ^).
 * Cada tic el tren avanza una casilla en su dirección actual. Al entrar en una casilla:
 *   vía      → toma su dirección.              cruce '+' → sigue recto.
 *   aguja    → sale recta la primera vez y girando a la derecha la siguiente, alternando.
 *   vagón n  → si es el que toca (n = recogidos+1) se engancha y el tren sigue recto; si le tocaba
 *              más tarde, descarrila (vagón fuera de orden); si ya está enganchado, pasa de largo.
 *   estación → si lleva todos los vagones, gana; si no, descarrila.
 *   túnel    → sale por el túnel gemelo con la misma dirección.
 *   cochera  → la casilla de salida: se cruza recta.
 *   suelo vacío, roca o fuera del tablero → descarrila.
 * Si el tren repite un estado, da vueltas para siempre: también se pierde.
 * Mapas: '.' suelo libre · '#' roca · '>v<^' vía fija · '+' cruce fijo · '1'-'9' entidad (lista e).
 * Entidades: {t:'L',d} cochera/salida · {t:'W',n} vagón · {t:'E'} estación · {t:'S',d} aguja fija
 *            · {t:'T',i} túnel (los dos del mismo i van emparejados).
 * inv: piezas disponibles [tipo, cantidad] — 'via' tramo de vía, 'aguja' cambio de agujas.
 * min: mínimo de piezas que calcula solveVias(); se guarda en la tabla y se comprueba en Node. */
var DIRX = [1, 0, -1, 0], DIRY = [0, 1, 0, -1], DCH = '>v<^';
var LV = [
  { t: 'Vía recta', w: 5, h: 3, g: ['.....', '1.2.3', '.....'],
    e: [{ t: 'L', d: 0 }, { t: 'W', n: 1 }, { t: 'E' }], inv: [['via', 4]], min: 2 },
  { t: 'La curva', w: 5, h: 4, g: ['1....', '.....', '....2', '....3'],
    e: [{ t: 'L', d: 0 }, { t: 'W', n: 1 }, { t: 'E' }], inv: [['via', 8]], min: 5 },
  { t: 'Dos vagones', w: 6, h: 5, g: ['1.....', '......', '.2....', '......', '...3.4'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'W', n: 2 }, { t: 'E' }], inv: [['via', 12]], min: 6 },
  { t: 'Rodea la roca', w: 6, h: 5, g: ['1>....', '..#...', '..#.2.', '..#...', '.....3'],
    e: [{ t: 'L', d: 0 }, { t: 'W', n: 1 }, { t: 'E' }], inv: [['via', 12]], min: 6 },
  { t: 'Por orden', w: 6, h: 5, g: ['1.....', '...3..', '......', '..2...', '.....4'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'W', n: 2 }, { t: 'E' }], inv: [['via', 14]], min: 12 },
  { t: 'El cruce', w: 7, h: 5, g: ['1..2...', '.......', '...+..3', '.......', '....4..'],
    e: [{ t: 'L', d: 0 }, { t: 'W', n: 1 }, { t: 'W', n: 2 }, { t: 'E' }], inv: [['via', 14]], min: 9 },
  { t: 'El cambio de agujas', w: 6, h: 6, g: ['1.....', '......', '..2...', '......', '....3.', '.....4'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'W', n: 2 }, { t: 'E' }], inv: [['via', 10], ['aguja', 2]], min: 7 },
  { t: 'El túnel', w: 7, h: 5, g: ['1..4...', '.......', '..###..', '....2..', '5.....3'],
    e: [{ t: 'L', d: 0 }, { t: 'W', n: 1 }, { t: 'E' }, { t: 'T', i: 1 }, { t: 'T', i: 1 }],
    inv: [['via', 14]], min: 8 },
  { t: 'Dos vueltas', w: 7, h: 6, g: ['1......', '.......', '..2....', '.......', '....3..', '......4'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'W', n: 2 }, { t: 'E' }], inv: [['via', 16], ['aguja', 1]], min: 8 },
  { t: 'Pasillo estrecho', w: 7, h: 6, g: ['1......', '.#####.', '.#...#.', '.#.2.#.', '.#...#.', '......3'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'E' }], inv: [['via', 18]], min: 13 },
  { t: 'Tres vagones', w: 7, h: 6, g: ['1...2..', '.......', '..3....', '.......', '.....4.', '......5'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 2 }, { t: 'W', n: 1 }, { t: 'W', n: 3 }, { t: 'E' }],
    inv: [['via', 18], ['aguja', 1]], min: 11 },
  { t: 'Cruce y roca', w: 7, h: 6, g: ['1......', '...#...', '..2+3..', '...#...', '.......', '.....4.'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'W', n: 2 }, { t: 'E' }], inv: [['via', 18]], min: 6 },
  { t: 'Doble túnel', w: 7, h: 6, g: ['1....2.', '.......', '4##.##5', '.......', '3......', '.......'],
    e: [{ t: 'L', d: 0 }, { t: 'W', n: 1 }, { t: 'E' }, { t: 'T', i: 1 }, { t: 'T', i: 1 }],
    inv: [['via', 16]], min: 7 },
  { t: 'Vuelta al valle', w: 7, h: 7, g: ['1......', '.......', '..2....', '...##..', '....3..', '.......', '......4'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'W', n: 2 }, { t: 'E' }], inv: [['via', 20], ['aguja', 1]], min: 9 },
  { t: 'La lanzadera', w: 7, h: 7, g: ['..1....', '.#...#.', '2..+..3', '.#...#.', '...4...', '.##.##.', '.....5.'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'W', n: 2 }, { t: 'W', n: 3 }, { t: 'E' }],
    inv: [['via', 26], ['aguja', 3]], min: 24 },
  { t: 'Zigzag', w: 7, h: 7, g: ['1......', '....##.', '.##....', '....##.', '.##...2', '.......', '......3'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'E' }], inv: [['via', 22]], min: 10 },
  { t: 'Estación central', w: 7, h: 7, g: ['1......', '.......', '..###..', '.2...3.', '..###..', '.......', '......4'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'W', n: 2 }, { t: 'E' }], inv: [['via', 24]], min: 9 },
  { t: 'Agujas dobles', w: 7, h: 7, g: ['1......', '.####..', '..2....', '..##.#.', '....3..', '.#..##.', '..4...5'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'W', n: 2 }, { t: 'W', n: 3 }, { t: 'E' }],
    inv: [['via', 22], ['aguja', 2]], min: 20 },
  { t: 'La gran maniobra', w: 8, h: 7, g: ['1.......', '..####..', '..2..3..', '..####..', '........', '..####..', '5.....4.'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'W', n: 2 }, { t: 'W', n: 3 }, { t: 'E' }],
    inv: [['via', 26], ['aguja', 1]], min: 16 },
  { t: 'Último tren del valle', w: 8, h: 8, g: ['1.......', '.#####..', '..2..7..', '..###...', '....6...', '..4.###.', '.####...', '.3.....5'],
    e: [{ t: 'L', d: 1 }, { t: 'W', n: 1 }, { t: 'W', n: 3 }, { t: 'W', n: 2 }, { t: 'E' }, { t: 'T', i: 1 }, { t: 'T', i: 1 }],
    inv: [['via', 26], ['aguja', 2]], min: 18 },
];
/* Tablero estático del nivel (sin las piezas del jugador): códigos por casilla.
 * bt: 0 suelo · 1 roca · 2 vía fija · 3 cruce · 4 cochera · 5 vagón · 6 estación · 7 aguja fija · 8 túnel */
function boardVias(lv) {
  var n = lv.w * lv.h, bt = [], bd = [], bn = [], tw = [], tun = {}, i, x, y, ch, e, sx = 0, sy = 0, sd = 0, nw = 0;
  for (i = 0; i < n; i++) { bt.push(0); bd.push(0); bn.push(0); tw.push(-1); }
  for (y = 0; y < lv.h; y++) for (x = 0; x < lv.w; x++) {
    i = y * lv.w + x; ch = lv.g[y].charAt(x);
    if (ch === '#') bt[i] = 1;
    else if (ch === '+') bt[i] = 3;
    else if (DCH.indexOf(ch) >= 0) { bt[i] = 2; bd[i] = DCH.indexOf(ch); }
    else if (ch >= '1' && ch <= '9') {
      e = lv.e[+ch - 1];
      if (e.t === 'L') { bt[i] = 4; sx = x; sy = y; sd = e.d; }
      else if (e.t === 'W') { bt[i] = 5; bn[i] = e.n; if (e.n > nw) nw = e.n; }
      else if (e.t === 'E') bt[i] = 6;
      else if (e.t === 'S') { bt[i] = 7; bd[i] = e.d; }
      else { bt[i] = 8; if (tun[e.i] == null) tun[e.i] = i; else { tw[i] = tun[e.i]; tw[tun[e.i]] = i; } }
    }
  }
  return { w: lv.w, h: lv.h, bt: bt, bd: bd, bn: bn, tw: tw, sx: sx, sy: sy, sd: sd, nw: nw };
}
/* Rejilla de piezas del jugador a partir de la lista place [{x,y,t,d}]. */
function overlay(B, place) {
  var pt = [], pd = [], i;
  for (i = 0; i < B.w * B.h; i++) { pt.push(0); pd.push(0); }
  for (i = 0; i < place.length; i++) {
    var p = place[i], j = p.y * B.w + p.x;
    if (B.bt[j] !== 0) continue;
    pt[j] = p.t === 'aguja' ? 2 : 1; pd[j] = p.d;
  }
  return { pt: pt, pd: pd };
}
/* Simulador paso a paso. S.step() → 'run' | 'win' | 'lost' (con S.why y S.at). */
function mkTrain(lv, place) {
  var B = boardVias(lv), O = overlay(B, place), alt = [], seen = {}, i;
  for (i = 0; i < B.w * B.h; i++) alt.push(0);
  var S = { b: B, o: O, alt: alt, x: B.sx, y: B.sy, d: B.sd, wi: 0, nw: B.nw, t: 0, why: '', at: null, path: [[B.sx, B.sy]] };
  S.step = function () {
    var nx = S.x + DIRX[S.d], ny = S.y + DIRY[S.d], i2, t, base, a;
    S.t++;
    if (nx < 0 || ny < 0 || nx >= B.w || ny >= B.h) { S.why = 'fuera'; S.at = [nx, ny]; return 'lost'; }
    i2 = ny * B.w + nx; t = B.bt[i2];
    if (t === 1) { S.why = 'roca'; S.at = [nx, ny]; return 'lost'; }
    if (t === 0 && !O.pt[i2]) { S.why = 'suelo'; S.at = [nx, ny]; return 'lost'; }
    S.x = nx; S.y = ny;
    if (O.pt[i2] === 1) S.d = O.pd[i2];
    else if (O.pt[i2] === 2 || t === 7) {
      base = O.pt[i2] === 2 ? O.pd[i2] : B.bd[i2]; a = alt[i2];
      S.d = a ? (base + 1) % 4 : base; alt[i2] = a ? 0 : 1;
    } else if (t === 2) S.d = B.bd[i2];
    else if (t === 5) {
      if (B.bn[i2] === S.wi + 1) { S.wi++; S.got = 1; }
      else if (B.bn[i2] > S.wi) { S.why = 'orden'; S.at = [nx, ny]; return 'lost'; }
    } else if (t === 6) {
      if (S.wi === B.nw) { S.path.push([nx, ny]); return 'win'; }
      S.why = 'faltan'; S.at = [nx, ny]; return 'lost';
    } else if (t === 8 && B.tw[i2] >= 0) {
      S.path.push([nx, ny]);
      S.x = B.tw[i2] % B.w; S.y = (B.tw[i2] / B.w) | 0; S.jump = 1;
    }
    S.path.push([S.x, S.y]);
    if (S.path.length > 400) { S.why = 'vueltas'; S.at = [S.x, S.y]; return 'lost'; }
    var kk = S.x + ',' + S.y + ',' + S.d + ',' + S.wi + ',' + alt.join('');
    if (seen[kk]) { S.why = 'vueltas'; S.at = [S.x, S.y]; return 'lost'; }
    seen[kk] = 1;
    return 'run';
  };
  return S;
}
/* Partida completa sin dibujar. */
function runVias(lv, place, maxT) {
  var S = mkTrain(lv, place), r, i, M = maxT || 400;
  for (i = 0; i < M; i++) { r = S.step(); if (r !== 'run') return { r: r, t: i, why: S.why, at: S.at, wi: S.wi }; }
  return { r: 'lost', t: M, why: 'vueltas' };
}
/* Resolutor rápido: BFS 0-1 (Dijkstra con costes 0 y 1) sobre el estado
 *   posición · dirección · vagones enganchados · posición de las agujas,
 * pagando 1 pieza cada vez que el tren entra en una casilla de suelo. Devuelve el recorrido más
 * corto y la lista de piezas que lo construyen. Es el que fija el `min` de la tabla: el recorrido
 * se comprueba después con el simulador (tiene que terminar en 'win') y en los niveles pequeños se
 * confirma además con la búsqueda exhaustiva solveVias(), que sí prueba todas las combinaciones. */
function routeVias(lv) {
  var B = boardVias(lv), W = B.w, H = B.h, N = W * H, i;
  var ag = [];                                        /* casillas con aguja fija: su bit en la máscara */
  for (i = 0; i < N; i++) if (B.bt[i] === 7) ag.push(i);
  var AM = 1 << ag.length, NW = B.nw;
  var abit = {}; for (i = 0; i < ag.length; i++) abit[ag[i]] = 1 << i;
  var SZ = N * 4 * (NW + 1) * AM;
  var dist = new Int32Array(SZ).fill(-1), par = new Int32Array(SZ).fill(-1), pl = new Int32Array(SZ).fill(-1);
  var id = function (x, y, d, wi, am) { return (((y * W + x) * 4 + d) * (NW + 1) + wi) * AM + am; };
  var start = id(B.sx, B.sy, B.sd, 0, 0), dq = [start], head = 0, goal = -1;
  dist[start] = 0;
  while (head < dq.length) {
    var s = dq[head++]; if (s < 0) continue;
    var am = s % AM, r1 = (s - am) / AM, wi = r1 % (NW + 1), r2 = (r1 - wi) / (NW + 1);
    var d = r2 % 4, cell = (r2 - d) / 4, x = cell % W, y = (cell - x) / W;
    if (dist[s] < 0) continue;
    var nx = x + DIRX[d], ny = y + DIRY[d];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    var j = ny * W + nx, t = B.bt[j], nd = d, nwi = wi, nam = am, cst = 0, dd, ns, piece = -1;
    if (t === 1) continue;
    if (t === 0) {                                    /* suelo: hay que poner una pieza (coste 1) */
      for (dd = 0; dd < 4; dd++) {
        if (dd === (d + 2) % 4) continue;
        ns = id(nx, ny, dd, wi, am);
        if (dist[ns] < 0 || dist[ns] > dist[s] + 1) { dist[ns] = dist[s] + 1; par[ns] = s; pl[ns] = j * 4 + dd; dq.push(ns); }
      }
      continue;
    }
    if (t === 2) nd = B.bd[j];
    else if (t === 7) { var bit = abit[j], on = (am & bit) ? 1 : 0; nd = on ? (B.bd[j] + 1) % 4 : B.bd[j]; nam = am ^ bit; }
    else if (t === 5) { if (B.bn[j] === wi + 1) nwi = wi + 1; else if (B.bn[j] > wi) continue; }
    else if (t === 6) { if (wi === NW) { goal = s; break; } continue; }
    else if (t === 8 && B.tw[j] >= 0) { nx = B.tw[j] % W; ny = (B.tw[j] / W) | 0; }
    ns = id(nx, ny, nd, nwi, nam);
    if (dist[ns] < 0 || dist[ns] > dist[s] + cst) { dist[ns] = dist[s] + cst; par[ns] = s; pl[ns] = piece; dq.splice(head, 0, ns); }
  }
  if (goal < 0) return { min: -1, place: [] };
  var place = [], seenC = {}, s2 = goal, ok = 1;
  while (s2 >= 0) {
    if (pl[s2] >= 0) {
      var cj = (pl[s2] / 4) | 0, cd = pl[s2] % 4;
      if (seenC[cj] != null && seenC[cj] !== cd) ok = 0;
      if (seenC[cj] == null) { seenC[cj] = cd; place.push({ x: cj % W, y: (cj / W) | 0, t: 'via', d: cd }); }
    }
    s2 = par[s2];
  }
  return { min: place.length, place: place, ok: ok, cost: dist[goal] };
}
/* Búsqueda exhaustiva (profundización iterativa sobre el número de piezas). Prueba TODAS las
 * combinaciones y demuestra la minimalidad; se usa en Node sobre los niveles en los que termina en
 * un tiempo razonable. En cada casilla de suelo por la que pasa el tren se prueban las piezas que
 * quedan en el inventario; el resto del recorrido es determinista, así que basta con memorizar los
 * estados que ya fallaron. */
function solveVias(lv, cap) {
  var B = boardVias(lv), N = B.w * B.h, lim, i;
  var invLim = { via: 0, aguja: 0 };
  for (i = 0; i < lv.inv.length; i++) invLim[lv.inv[i][0]] = lv.inv[i][1];
  var top = Math.min(cap == null ? 22 : cap, invLim.via + invLim.aguja);
  var pt = [], pd = [], alt = [], used = { via: 0, aguja: 0, n: 0 }, seen = null, sol = null, nodes = 0;
  for (i = 0; i < N; i++) { pt.push(0); pd.push(0); alt.push(0); }
  function key(x, y, d, wi) {
    var s = x + ',' + y + ',' + d + ',' + wi + '|', j;
    for (j = 0; j < N; j++) if (pt[j]) s += j + ':' + pt[j] + pd[j] + ',';
    s += '|';
    for (j = 0; j < N; j++) if (pt[j] === 2 || B.bt[j] === 7) s += alt[j];
    return s;
  }
  function enter(nx, ny, d, wi, lim2, steps) {
    var i2 = ny * B.w + nx, t = B.bt[i2], base, a, r;
    if (t === 1) return false;
    if (pt[i2] === 1) d = pd[i2];
    else if (pt[i2] === 2 || t === 7) {
      base = pt[i2] === 2 ? pd[i2] : B.bd[i2]; a = alt[i2];
      d = a ? (base + 1) % 4 : base; alt[i2] = a ? 0 : 1;
      r = cont(nx, ny, d, wi, lim2, steps); alt[i2] = a; return r;
    } else if (t === 2) d = B.bd[i2];
    else if (t === 5) {
      if (B.bn[i2] === wi + 1) wi++;
      else if (B.bn[i2] > wi) return false;
    } else if (t === 6) return wi === B.nw;
    else if (t === 8 && B.tw[i2] >= 0) { nx = B.tw[i2] % B.w; ny = (B.tw[i2] / B.w) | 0; }
    return cont(nx, ny, d, wi, lim2, steps);
  }
  function cont(x, y, d, wi, lim2, steps) {
    if (steps > 300) return false;
    nodes++;
    var kk = key(x, y, d, wi);
    if (seen[kk]) return false;
    seen[kk] = 1;
    var nx = x + DIRX[d], ny = y + DIRY[d];
    if (nx < 0 || ny < 0 || nx >= B.w || ny >= B.h) return false;
    var i2 = ny * B.w + nx, ti, dd, nm, ok;
    if (B.bt[i2] === 0 && !pt[i2]) {
      if (used.n >= lim2) return false;
      for (ti = 0; ti < 2; ti++) {
        nm = ti ? 'aguja' : 'via';
        if (used[nm] >= invLim[nm]) continue;
        for (dd = 0; dd < 4; dd++) {
          if (ti === 0 && dd === (d + 2) % 4) continue;  /* devolver el tren por donde vino no sirve */
          pt[i2] = ti + 1; pd[i2] = dd; used[nm]++; used.n++;
          ok = enter(nx, ny, d, wi, lim2, steps + 1);
          if (ok) { sol.push({ x: nx, y: ny, t: nm, d: dd }); }
          pt[i2] = 0; pd[i2] = 0; used[nm]--; used.n--;
          if (ok) return true;
        }
      }
      return false;
    }
    return enter(nx, ny, d, wi, lim2, steps + 1);
  }
  for (lim = 0; lim <= top; lim++) {
    seen = {}; sol = [];
    if (cont(B.sx, B.sy, B.sd, 0, lim, 0)) return { min: lim, place: sol, nodes: nodes };
  }
  return { min: -1, place: [], nodes: nodes };
}

/* ------------------------------------------------------------------------------------------
 * 2) METRO EN HORA PUNTA — núcleo determinista (sin azar)
 * 12 semanas escritas a mano. Cada semana trae su plano de estaciones (x, y, forma, ritmo de
 * pasajeros), su presupuesto de vía, trenes y líneas, su duración y los viajeros que hay que
 * llevar. Los pasajeros NO salen al azar: cada estación emite el suyo en un instante fijo y con
 * un destino fijo (fórmula sobre el índice de la estación y el número de pasajero).
 * Formas: 0 círculo · 1 triángulo · 2 cuadrado · 3 estrella · 4 rombo · 5 cruz.
 * El plano vive en una rejilla de 12×9; el juego lo escala a la pantalla.
 * ---------------------------------------------------------------------------------------- */
var MSH = ['círculo', 'triángulo', 'cuadrado', 'estrella', 'rombo', 'cruz'];
/* st: [x, y, forma, ritmo en segundos, segundo en que abre] */
var MW = [
  { t: 'Dos barrios', dur: 80, need: 8, rail: 13, trains: 1, lines: 1,
    st: [[2, 4, 0, 9, 0], [5, 2, 1, 11, 0], [8, 5, 2, 12, 0]],
    med: { k: 'extra', v: 4, t: 'Lleva 4 viajeros de más' } },
  { t: 'El río', dur: 90, need: 12, rail: 21, trains: 1, lines: 1,
    st: [[1, 6, 0, 9, 0], [4, 3, 1, 10, 0], [7, 6, 2, 10, 0], [10, 3, 0, 12, 25]],
    med: { k: 'noov', v: 0, t: 'Sin ninguna estación desbordada' } },
  { t: 'Dos líneas', dur: 95, need: 14, rail: 26, trains: 2, lines: 2,
    st: [[1, 2, 0, 8, 0], [4, 5, 1, 9, 0], [7, 2, 2, 10, 0], [10, 5, 3, 11, 20], [4, 1, 0, 12, 40]],
    med: { k: 'rail', v: 19, t: 'Con 19 tramos de vía o menos' } },
  { t: 'Transbordo', dur: 100, need: 16, rail: 32, trains: 2, lines: 2,
    st: [[1, 4, 0, 8, 0], [4, 4, 1, 8, 0], [7, 4, 2, 9, 0], [4, 1, 3, 11, 15], [4, 7, 0, 11, 35], [10, 2, 1, 12, 55]],
    med: { k: 'extra', v: 6, t: 'Lleva 6 viajeros de más' } },
  { t: 'La estrella', dur: 105, need: 18, rail: 35, trains: 3, lines: 2,
    st: [[5, 4, 0, 7, 0], [1, 2, 1, 9, 0], [9, 2, 2, 9, 0], [1, 7, 3, 10, 18], [9, 7, 1, 10, 34], [5, 1, 2, 12, 55]],
    med: { k: 'noov', v: 0, t: 'Sin ninguna estación desbordada' } },
  { t: 'Cinturón', dur: 110, need: 20, rail: 41, trains: 3, lines: 3,
    st: [[2, 2, 0, 7, 0], [6, 1, 1, 8, 0], [10, 3, 2, 8, 0], [10, 7, 3, 9, 15], [6, 8, 0, 9, 30], [2, 6, 1, 10, 45], [6, 4, 4, 11, 60]],
    med: { k: 'rail', v: 29, t: 'Con 29 tramos de vía o menos' } },
  { t: 'Hora punta', dur: 110, need: 22, rail: 39, trains: 4, lines: 3,
    st: [[1, 4, 0, 6, 0], [4, 2, 1, 7, 0], [7, 6, 2, 7, 0], [10, 4, 3, 8, 0], [4, 7, 4, 9, 20], [7, 1, 0, 9, 40], [10, 8, 1, 10, 60]],
    med: { k: 'extra', v: 8, t: 'Lleva 8 viajeros de más' } },
  { t: 'Barrio nuevo', dur: 115, need: 24, rail: 42, trains: 4, lines: 3,
    st: [[1, 2, 0, 6, 0], [4, 4, 1, 6, 0], [7, 2, 2, 7, 0], [10, 4, 3, 7, 0], [1, 7, 4, 8, 18], [5, 8, 0, 9, 36], [9, 7, 1, 9, 54], [7, 5, 5, 11, 72]],
    med: { k: 'noov', v: 0, t: 'Sin ninguna estación desbordada' } },
  { t: 'Seis formas', dur: 120, need: 25, rail: 53, trains: 5, lines: 4,
    st: [[1, 3, 0, 6, 0], [4, 1, 1, 6, 0], [7, 3, 2, 6, 0], [10, 1, 3, 7, 0], [2, 7, 4, 7, 15], [6, 6, 5, 8, 30], [10, 6, 0, 8, 45], [5, 4, 1, 9, 60], [9, 8, 2, 10, 80]],
    med: { k: 'rail', v: 38, t: 'Con 38 tramos de vía o menos' } },
  { t: 'La diagonal', dur: 120, need: 28, rail: 56, trains: 5, lines: 4,
    st: [[1, 1, 0, 5, 0], [3, 3, 1, 6, 0], [5, 5, 2, 6, 0], [7, 7, 3, 6, 0], [10, 2, 4, 7, 12], [2, 7, 5, 7, 26], [10, 7, 0, 8, 42], [6, 1, 1, 8, 58], [8, 4, 2, 9, 76], [3, 5, 3, 10, 94]],
    med: { k: 'extra', v: 10, t: 'Lleva 10 viajeros de más' } },
  { t: 'Ciudad llena', dur: 125, need: 32, rail: 63, trains: 6, lines: 4,
    st: [[1, 2, 0, 5, 0], [4, 1, 1, 5, 0], [7, 2, 2, 5, 0], [10, 1, 3, 6, 0], [1, 6, 4, 6, 10], [4, 8, 5, 6, 22], [8, 7, 0, 7, 36], [11, 5, 1, 7, 50], [6, 4, 2, 8, 66], [3, 4, 3, 8, 84], [9, 4, 4, 9, 102]],
    med: { k: 'noov', v: 0, t: 'Sin ninguna estación desbordada' } },
  { t: 'El último tren', dur: 130, need: 36, rail: 78, trains: 6, lines: 5,
    st: [[1, 1, 0, 5, 0], [4, 2, 1, 5, 0], [7, 1, 2, 5, 0], [10, 2, 3, 5, 0], [1, 5, 4, 6, 8], [4, 7, 5, 6, 20], [7, 8, 0, 6, 32], [10, 6, 1, 6, 46], [5, 4, 2, 7, 60], [8, 4, 3, 7, 76], [2, 8, 4, 8, 92], [11, 8, 5, 8, 108]],
    med: { k: 'extra', v: 12, t: 'Lleva 12 viajeros de más' } },
];
/* 12 medallas: una por semana (el texto de MW[i].med). */
var MED = MW.map(function (w, i) { return { i: i, t: w.med.t }; });
var MCAP = 8, MQMAX = 10, MOVT = 16, MSPD = 2.6;   /* plazas por tren, cola máxima, aguante (s), celdas/s */

/* Ajuste por dificultad: 0 fácil, 1 normal, 2 difícil. */
function metroCfg(wi, dif) {
  var w = MW[Math.max(0, Math.min(MW.length - 1, wi))], f = dif === 0 ? 0 : dif === 2 ? 2 : 1;
  var needF = [0.75, 1, 1.15][f], durF = [1.2, 1, 0.94][f], rateF = [1.3, 1, 0.88][f], railF = [1.15, 1, 1][f];
  return {
    t: w.t, wi: wi, dur: Math.round(w.dur * durF), need: Math.round(w.need * needF),
    rail: Math.round(w.rail * railF), trains: w.trains + (f === 0 ? 1 : 0), lines: w.lines,
    med: w.med, dif: f,
    st: w.st.map(function (s) { return { x: s[0], y: s[1], sh: s[2], r: s[3] * rateF, at: s[4] }; }),
  };
}
/* Destino del pasajero n de la estación i: fijo, nunca la forma de la propia estación. */
function metroDest(cfg, i, n) {
  var own = cfg.st[i].sh, j, has = [];
  for (j = 0; j < cfg.st.length; j++) if (has.indexOf(cfg.st[j].sh) < 0) has.push(cfg.st[j].sh);
  has.sort(function (a, b) { return a - b; });
  var nsh = has.length, q = has[(i * 3 + n * 5 + 1) % nsh];
  if (q === own) q = has[(i * 3 + n * 5 + 2) % nsh];
  if (q === own && nsh > 1) q = has[(has.indexOf(own) + 1) % nsh];
  return q;
}
function mdist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
/* Longitud de vía de un plan (lista de líneas, cada una lista de índices de estación). */
function metroRail(cfg, lines) {
  var L = 0, i, j;
  for (i = 0; i < lines.length; i++) for (j = 1; j < lines[i].length; j++) L += mdist(cfg.st[lines[i][j - 1]], cfg.st[lines[i][j]]);
  return Math.round(L * 10) / 10;
}
/* Formas que sirve cada línea: directas y con un transbordo. */
function metroServe(cfg, lines) {
  var dir = [], i, j, a, b, s, q;
  for (i = 0; i < lines.length; i++) { s = {}; for (j = 0; j < lines[i].length; j++) s[cfg.st[lines[i][j]].sh] = 1; dir.push(s); }
  var tr = dir.map(function (o) { var r = {}, z; for (z in o) r[z] = 1; return r; });
  for (a = 0; a < lines.length; a++) for (b = 0; b < lines.length; b++) {
    if (a === b) continue;
    var sh = false;
    for (i = 0; i < lines[a].length && !sh; i++) if (lines[b].indexOf(lines[a][i]) >= 0) sh = true;
    if (sh) for (q in dir[b]) tr[a][q] = 1;
  }
  return { dir: dir, tr: tr };
}
/* Simulación de una semana. plan = {lines:[[idx…]], trains:[índice de línea por tren]}.
 * Determinista: el mismo plan da siempre el mismo resultado. Con opt.state devuelve el estado
 * vivo para poder dibujarlo (el juego llama a metroTick en vez de a esto). */
function metroSim(cfg, plan, opt) {
  opt = opt || {};
  var dt = opt.dt || 0.25, S = metroInit(cfg, plan), t;
  if (S.lost === 'sinlinea') return { ok: false, score: 0, lost: 'sinlinea', ov: 0, t: 0, rail: 0 };
  for (t = 0; t < cfg.dur && !S.lost; t += dt) metroTick(S, dt);
  return { ok: !S.lost && S.score >= cfg.need, score: S.score, lost: S.lost, ov: S.ovMax, ovAny: S.ovAny, t: S.t, rail: S.rail };
}
function metroInit(cfg, plan) {
  var lines = plan.lines.filter(function (l) { return l.length >= 2; }), i;
  var S = { cfg: cfg, lines: lines, st: null, tr: [], score: 0, t: 0, lost: '', ovMax: 0, ovAny: 0, rail: 0, sv: null };
  if (!lines.length) { S.lost = 'sinlinea'; return S; }
  S.sv = metroServe(cfg, lines);
  S.rail = metroRail(cfg, lines);
  /* líneas que pasan por cada estación: hacen falta para el transbordo */
  S.stLn = cfg.st.map(function () { return []; });
  for (i = 0; i < lines.length; i++) for (var j2 = 0; j2 < lines[i].length; j2++) if (S.stLn[lines[i][j2]].indexOf(i) < 0) S.stLn[lines[i][j2]].push(i);
  S.st = cfg.st.map(function (s) { return { sh: s.sh, q: [], n: 0, next: s.at + s.r, open: s.at, ov: 0 }; });
  for (i = 0; i < plan.trains.length; i++) S.tr.push({ ln: plan.trains[i] % lines.length, seg: 0, u: (i * 0.37) % 1, dir: 1, load: [], x: 0, y: 0 });
  return S;
}
function metroTick(S, dt) {
  var cfg = S.cfg, i, j;
  if (S.lost) return;
  S.t += dt;
  for (i = 0; i < S.st.length; i++) {
    var s = S.st[i];
    if (S.t < s.open) continue;
    while (S.t >= s.next) { s.q.push(metroDest(cfg, i, s.n)); s.n++; s.next += cfg.st[i].r; }
    if (s.q.length > MQMAX) { s.ov += dt; S.ovAny = 1; if (s.ov > S.ovMax) S.ovMax = s.ov; if (s.ov >= MOVT) S.lost = 'colapso'; }
    else s.ov = Math.max(0, s.ov - dt * 0.6);
  }
  for (i = 0; i < S.tr.length; i++) {
    var T = S.tr[i], L = S.lines[T.ln], a = cfg.st[L[T.seg]], b = cfg.st[L[T.seg + T.dir]];
    if (!b) { T.dir = -T.dir; b = cfg.st[L[T.seg + T.dir]]; if (!b) continue; }
    var d = mdist(a, b) || 0.001, guard = 40;
    T.u += (MSPD * dt) / d;
    while (T.u >= 1 && guard-- > 0) {
      T.u -= 1; T.seg += T.dir;
      if (T.seg <= 0) { T.seg = 0; T.dir = 1; }
      else if (T.seg >= L.length - 1) { T.seg = L.length - 1; T.dir = -1; }
      var si = L[T.seg], S2 = S.st[si];
      for (j = T.load.length - 1; j >= 0; j--) {
        if (T.load[j] === S2.sh) { T.load.splice(j, 1); S.score++; continue; }
        /* transbordo: si esta línea no llega a su forma pero aquí empalma con otra que sí, se baja */
        if (!S.sv.dir[T.ln][T.load[j]]) {
          var ls = S.stLn[si], okT = false;
          for (var z = 0; z < ls.length; z++) if (ls[z] !== T.ln && S.sv.dir[ls[z]][T.load[j]]) { okT = true; break; }
          if (okT) { S2.q.push(T.load[j]); T.load.splice(j, 1); }
        }
      }
      var free = MCAP - T.load.length;
      for (j = 0; j < S2.q.length && free > 0;) {
        if (S.sv.tr[T.ln][S2.q[j]]) { T.load.push(S2.q[j]); S2.q.splice(j, 1); free--; } else j++;
      }
      a = cfg.st[L[T.seg]]; b = cfg.st[L[T.seg + T.dir]];
      if (!b) { T.dir = -T.dir; b = cfg.st[L[T.seg + T.dir]]; }
      if (!b) { T.u = 0; break; }
      d = mdist(a, b) || 0.001;
    }
    if (b) { T.x = a.x + (b.x - a.x) * T.u; T.y = a.y + (b.y - a.y) * T.u; }
    else { T.x = a.x; T.y = a.y; }
  }
}
/* ¿Se ha ganado la medalla de la semana? */
function metroMedal(cfg, res) {
  var m = cfg.med;
  if (!res.ok) return false;
  if (m.k === 'extra') return res.score >= cfg.need + m.v;
  if (m.k === 'noov') return !res.ovAny;
  if (m.k === 'rail') return res.rail <= m.v;
  return false;
}
/* Plan «de jugador razonable»: reparte las estaciones entre las líneas disponibles, une cada
 * grupo por vecino más próximo y hace que todas pasen por la estación más céntrica (transbordo);
 * si se pasa del presupuesto de vía, recorta. Sirve para comprobar en Node que las 12 semanas se
 * superan en las 3 dificultades. */
function metroAuto(cfg) {
  var n = cfg.st.length, nl = Math.max(1, Math.min(cfg.lines, Math.floor(n / 2))), i, j;
  var order = []; for (i = 0; i < n; i++) order.push(i);
  order.sort(function (a, b) { return (cfg.st[a].x + cfg.st[a].y * 0.6) - (cfg.st[b].x + cfg.st[b].y * 0.6); });
  var groups = []; for (i = 0; i < nl; i++) groups.push([]);
  for (i = 0; i < order.length; i++) groups[i % nl].push(order[i]);
  var cx = 0, cy = 0; for (i = 0; i < n; i++) { cx += cfg.st[i].x; cy += cfg.st[i].y; }
  cx /= n; cy /= n;
  var hub = 0, bd = 1e9;
  for (i = 0; i < n; i++) { var d0 = Math.abs(cfg.st[i].x - cx) + Math.abs(cfg.st[i].y - cy); if (d0 < bd) { bd = d0; hub = i; } }
  for (i = 0; i < nl; i++) if (groups[i].indexOf(hub) < 0) groups[i].push(hub);
  var lines = groups.map(function (g) {
    if (g.length < 2) return g.slice();
    var rest = g.slice(1), path = [g[0]];
    while (rest.length) {
      var last = path[path.length - 1], bi = 0, b2 = 1e9;
      for (j = 0; j < rest.length; j++) { var d2 = mdist(cfg.st[last], cfg.st[rest[j]]); if (d2 < b2) { b2 = d2; bi = j; } }
      path.push(rest[bi]); rest.splice(bi, 1);
    }
    return path;
  }).filter(function (l) { return l.length >= 2; });
  var guard = 80;
  while (metroRail(cfg, lines) > cfg.rail && guard-- > 0) {
    var li = -1, bl = -1;
    for (i = 0; i < lines.length; i++) { var L2 = metroRail(cfg, [lines[i]]); if (lines[i].length > 2 && L2 > bl) { bl = L2; li = i; } }
    if (li < 0) break;
    var w0 = 0, wb = -1;
    for (j = 0; j < lines[li].length; j++) {
      var cut = lines[li].slice(); cut.splice(j, 1);
      var g2 = metroRail(cfg, [cut]); if (wb < 0 || g2 < wb) { wb = g2; w0 = j; }
    }
    lines[li].splice(w0, 1);
    lines = lines.filter(function (l) { return l.length >= 2; });
    if (!lines.length) break;
  }
  var trains = []; for (i = 0; i < cfg.trains; i++) trains.push(i % Math.max(1, lines.length));
  return { lines: lines, trains: trains };
}

/* ------------------------------------------------------------------------------------------
 * 3) CHOQUE DE TRENES — tablero compartido (reglas puras)
 * Rejilla de vías: cada casilla dice por dónde se puede salir. El tren avanza solo; el jugador
 * marca con el joystick hacia dónde quiere ir y en cada casilla se toma esa salida si existe.
 * '#' nada · '+' cruce (4 salidas) · '-' este-oeste · '|' norte-sur · 'a'…'d' apeadero del
 * jugador 0…3 (cruce con meta) · 'o' punto de carga.
 * ---------------------------------------------------------------------------------------- */
var CQ = [
  '.+---+---+---+---+.',
  '.|...|...|...|...|.',
  '.+---+---+---+---+.',
  '.|...|...|...|...|.',
  '.+---+---+---+---+.',
  '.|...|...|...|...|.',
  '.+---+---+---+---+.',
];
/* Nodos (los '+') y sus vecinos: el tablero es una rejilla de 5×4 nodos separados 4 y 2 casillas. */
function choqueNet() {
  var nx = 5, ny = 4, nodes = [], i, j;
  for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) nodes.push({ i: j * nx + i, cx: i, cy: j, nb: [-1, -1, -1, -1] });
  for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
    var n = nodes[j * nx + i];
    if (i < nx - 1) n.nb[0] = j * nx + i + 1;
    if (j < ny - 1) n.nb[1] = (j + 1) * nx + i;
    if (i > 0) n.nb[2] = j * nx + i - 1;
    if (j > 0) n.nb[3] = (j - 1) * nx + i;
  }
  return { nx: nx, ny: ny, nodes: nodes };
}
/* Los 4 apeaderos (una esquina por jugador) y los 6 puntos de carga fijos. */
var CDEP = [0, 4, 15, 19], CLOAD = [2, 6, 8, 10, 12, 17];
/* </PURE> ------------------------------------------------------------------------------------ */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LV: LV, DIRX: DIRX, DIRY: DIRY, boardVias: boardVias, overlay: overlay, mkTrain: mkTrain,
    runVias: runVias, routeVias: routeVias, solveVias: solveVias,
    MW: MW, MED: MED, MSH: MSH, metroCfg: metroCfg, metroSim: metroSim, metroAuto: metroAuto,
    metroRail: metroRail, metroInit: metroInit, metroTick: metroTick, metroMedal: metroMedal,
    choqueNet: choqueNet, CDEP: CDEP, CLOAD: CLOAD,
  };
}

/* ============================================================================================
 * Runtime (a partir de aquí ya se usan Kit y ART)
 * ========================================================================================== */
const M = CFG.mode, OUT = ART.OUT, R2 = 6.2832;
const TH = M === 'vias'
  ? { bg: '#1b2a24', floor: '#3f7a4a', line: '#356440', ac: '#ffc94d', panel: '#142019', pane2: '#1e3026', txt: '#eafbe8' }
  : M === 'metro'
    ? { bg: '#181a2e', floor: '#23264a', line: '#2e3260', ac: '#a097ff', panel: '#12142a', pane2: '#1d2040', txt: '#eae8ff' }
    : { bg: '#2a1c2e', floor: '#40304a', line: '#54406040', ac: '#ff6fb5', panel: '#1d1322', pane2: '#2b1e33', txt: '#fbeaf4' };
const k = Kit({ w: 480, h: 660, title: CFG.title, bg: TH.bg, fluid: { min: 0.42, max: 2.7 } }), c = k.ctx;
let W = k.W, H = k.H;

/* ---------- utilería de arte: §8 «ley de la pieza única» + cartoon de estudio ---------- */
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
function cvs(w, h) {
  const q = document.createElement('canvas');
  q.width = Math.max(1, Math.ceil(w * CDPR)); q.height = Math.max(1, Math.ceil(h * CDPR));
  const g = q.getContext('2d'); g.scale(CDPR, CDPR); g.lineJoin = 'round'; g.lineCap = 'round';
  return [q, g];
}
const SPR = {};
function spr(key, w, h, fn) {
  let q = SPR[key]; if (q) return q;
  const r = cvs(w, h); fn(r[1]); q = r[0]; q.iw = w; q.ih = h; SPR[key] = q; return q;
}
function blit(q, x, y) { c.drawImage(q, x, y, q.iw, q.ih); }
function uni(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = (ow || 1.5) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
}
function inpath(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
function cel(g, path, base, dx, dy) {
  dx = dx == null ? 2 : dx; dy = dy == null ? 2 : dy;
  inpath(g, path, (h) => {
    const P = () => { h.beginPath(); path(h); h.fill(); };
    h.fillStyle = ART.dark(base, 0.26); P();
    h.translate(-dx, -dy); h.fillStyle = base; P();
    h.translate(-dx * 1.2, -dy * 1.2); h.fillStyle = ART.lite(base, 0.22); P();
  });
}
function seam(g, path, base, fn, f) { inpath(g, path, (h) => { h.fillStyle = ART.dark(base, f == null ? 0.18 : f); fn(h); }); }
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.5 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, R2); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, R2); g.fill(); }
const rr = (g, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const FONT = (s) => '700 ' + s + 'px ui-rounded,"Trebuchet MS",system-ui,sans-serif';
function tw(s, size) { c.font = FONT(size); return c.measureText(s).width; }
function fitSize(s, max, size, min) { let f = size; while (f > (min || 9) && tw(s, f) > max) f--; return f; }
function clipTxt(s, max, size) {
  if (tw(s, size) <= max) return s;
  let t = s; while (t.length > 1 && tw(t + '…', size) > max) t = t.slice(0, -1);
  return t + '…';
}
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms);

/* ---------- botones ---------- */
let BTN = [];
function button(id, x, y, w, h, label, o) { o = o || {}; BTN.push({ id: id, x: x, y: y, w: w, h: h, label: label, o: o }); }
function drawBtn(b) {
  const o = b.o, on = !!o.on, col = o.col || (on ? TH.ac : '#4b4370'), dis = !!o.dis;
  c.save(); if (dis) c.globalAlpha = 0.42;
  const P = (g) => rr(g, b.x, b.y, b.w, b.h, 11);
  contact(c, b.x + b.w / 2, b.y + b.h + 2, b.w * 0.42, 3.5, 0.28);
  uni(c, [[P, col]], 1.5); cel(c, P, col, 2, 2);
  if (o.icon) o.icon(c, b.x, b.y, b.w, b.h);
  if (b.label) {
    const pad = o.icon ? 6 : 9, fs = fitSize(b.label, b.w - pad * 2, o.fs || 15, 9);
    const ty = o.icon ? b.y + b.h - fs - 4 : b.y + (b.h - fs * 1.1) / 2;
    k.text(clipTxt(b.label, b.w - pad * 2, fs), b.x + b.w / 2, ty, fs, on ? '#241a05' : '#efeaff', 'center');
  }
  c.restore();
}
function hitBtn(x, y) { for (let i = 0; i < BTN.length; i++) { const b = BTN[i]; if (!b.o.dis && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; } return null; }
/* La banda central de arriba (W/2 ± 46, por encima de y=60) la ocupan los botones de pausa y
 * sonido del reproductor: ningún rótulo propio entra ahí. */
const HFREE = 60;

/* ---------- piezas de arte comunes: locomotora y vagón (una pieza + ruedas) ---------- */
function locoSpr(S, col) {
  return spr('lo' + S + col, S, S, (g) => {
    const s = S / 32;
    contact(g, S / 2, S * 0.84, S * 0.33, S * 0.09, 0.32);
    const body = (h) => {
      h.moveTo(5 * s, 22 * s); h.lineTo(5 * s, 13 * s); h.quadraticCurveTo(5 * s, 10 * s, 9 * s, 10 * s);
      h.lineTo(13 * s, 10 * s); h.lineTo(13 * s, 7 * s); h.quadraticCurveTo(13 * s, 5 * s, 16 * s, 5 * s);
      h.lineTo(23 * s, 5 * s); h.quadraticCurveTo(26 * s, 5 * s, 26 * s, 8 * s);
      h.lineTo(26 * s, 22 * s); h.closePath();
    };
    const chim = (h) => { h.moveTo(7 * s, 12 * s); h.lineTo(7 * s, 7 * s); h.quadraticCurveTo(7 * s, 5 * s, 9.5 * s, 5 * s); h.quadraticCurveTo(12 * s, 5 * s, 12 * s, 7 * s); h.lineTo(12 * s, 12 * s); h.closePath(); };
    uni(g, [[chim, ART.dark(col, 0.3)], [body, col]], 1.5 * Math.max(0.7, s));
    cel(g, body, col, 2 * s, 2 * s);
    seam(g, body, col, (h) => { h.fillRect(13 * s, 10 * s, 1.6 * s, 12 * s); });
    g.fillStyle = '#9fe6ff'; g.beginPath(); rr(g, 16 * s, 8.5 * s, 8 * s, 6 * s, 2 * s); g.fill();
    spec(g, 18 * s, 10 * s, 2.2 * s, 1.2 * s, -0.4, 0.55);
    const wh = (h, x) => { h.moveTo(x + 3.2 * s, 24 * s); h.arc(x, 24 * s, 3.2 * s, 0, R2); };
    uni(g, [[(h) => wh(h, 9 * s), '#2b2450'], [(h) => wh(h, 21 * s), '#2b2450']], 1.2 * Math.max(0.7, s));
    g.fillStyle = ART.lite(col, 0.3);
    g.beginPath(); g.arc(9 * s, 24 * s, 1.1 * s, 0, R2); g.arc(21 * s, 24 * s, 1.1 * s, 0, R2); g.fill();
  });
}
function wagonSpr(S, col) {
  return spr('wg' + S + col, S, S, (g) => {
    const s = S / 32;
    contact(g, S / 2, S * 0.84, S * 0.3, S * 0.08, 0.28);
    const body = (h) => { rr(h, 6 * s, 10 * s, 20 * s, 12 * s, 3 * s); };
    uni(g, [[body, col]], 1.5 * Math.max(0.7, s)); cel(g, body, col, 2 * s, 2 * s);
    seam(g, body, col, (h) => { h.fillRect(15 * s, 10 * s, 1.5 * s, 12 * s); });
    const wh = (h, x) => { h.moveTo(x + 2.8 * s, 23.5 * s); h.arc(x, 23.5 * s, 2.8 * s, 0, R2); };
    uni(g, [[(h) => wh(h, 10 * s), '#2b2450'], [(h) => wh(h, 22 * s), '#2b2450']], 1.2 * Math.max(0.7, s));
  });
}

/* ============================================================================================
 * 1) VÍAS DEL VALLE
 * ========================================================================================== */
let vLv = null, vPlace = [], vSel = 0, vRun = 0, vSim = null, vAcc = 0, vMsg = '', vMsgT = 0;
let vS = 40, vGX = 0, vGY = 0, vCur = [0, 0], vKb = false, vHudH = 80, vPanH = 104, vDone = 0;
const VTYPE = ['via', 'aguja'];
function vBase(x, y) { return vLv.g[y].charAt(x); }
function vAt(x, y) { for (let i = 0; i < vPlace.length; i++) if (vPlace[i].x === x && vPlace[i].y === y) return vPlace[i]; return null; }
function vLeft(t) {
  let cap = 0; for (let i = 0; i < vLv.inv.length; i++) if (vLv.inv[i][0] === t) cap = vLv.inv[i][1];
  if (k.dif === 0) cap += t === 'via' ? 3 : 1;          /* en Fácil sobran piezas para dar rodeos */
  let n = 0; for (let i = 0; i < vPlace.length; i++) if (vPlace[i].t === t) n++;
  return cap - n;
}
function vLayout() {
  W = k.W; H = k.H;
  vHudH = H < 520 ? 66 : 80; vPanH = H < 520 ? 88 : 104;
  const gh = H - vHudH - vPanH;
  vS = Math.max(16, Math.min(Math.floor((W - 26) / vLv.w), Math.floor((gh - 16) / vLv.h), 74));
  vGX = Math.round((W - vS * vLv.w) / 2); vGY = Math.round(vHudH + (gh - vS * vLv.h) / 2);
}
function vBuild() {
  vLv = LV[Math.max(0, Math.min(LV.length - 1, (k.lv || 1) - 1))];
  vPlace = []; vRun = 0; vSim = null; vAcc = 0; vMsg = ''; vMsgT = 0; vSel = 0; vDone = 0;
  vCur = [0, 0];
  for (let y = 0; y < vLv.h && !vCur[0] && !vCur[1]; y++) for (let x = 0; x < vLv.w; x++) if (vBase(x, y) === '.') { vCur = [x, y]; break; }
  vLayout();
}
function vStart() {
  if (vRun) { vRun = 0; vSim = null; return; }
  vSim = mkTrain(vLv, vPlace); vRun = 1; vAcc = 0; vMsg = ''; k.sfx('start');
}
const VWHY = { fuera: 'El tren se sale del valle', roca: 'Ha chocado con una roca', suelo: 'Falta vía aquí',
  orden: 'Ese vagón no toca todavía', faltan: 'Llega a la estación sin todos los vagones', vueltas: 'Se ha quedado dando vueltas' };
function vUpd(dt) {
  if (vMsgT > 0) vMsgT -= dt;
  if (vRun !== 1 || !vSim) return;          /* al ganar (vRun 2) el tren se para en la estación */
  const paso = 0.30 / (k.dif === 2 ? 1.15 : 1);
  vAcc += dt;
  while (vAcc >= paso && vRun) {
    vAcc -= paso;
    const r = vSim.step();
    if (r === 'win') {
      vRun = 2; vDone = 1;
      const used = vPlace.length, extra = used - vLv.min;
      const pts = 200 + Math.max(0, 300 - extra * 25) + (k.dif === 2 ? 150 : k.dif === 1 ? 75 : 0);
      k.sfx('win');
      later(() => k.levelDone(pts, 'Has usado <b>' + used + '</b> piezas' + (extra === 0 ? ' · <b>¡el mínimo!</b>' : ' (el mínimo es ' + vLv.min + ')')), 700);
      return;
    }
    if (r === 'lost') {
      vRun = 0; vMsg = VWHY[vSim.why] || 'El tren descarrila'; vMsgT = 3.4;
      k.sfx('hurt'); k.shake(5); vSim = null; return;
    }
  }
}
function vTapCell(x, y) {
  if (vRun || x < 0 || y < 0 || x >= vLv.w || y >= vLv.h) return;
  if (vBase(x, y) !== '.') { vMsg = 'Ahí no cabe ninguna pieza'; vMsgT = 2; return; }
  const p = vAt(x, y), t = VTYPE[vSel];
  if (!p) {
    if (vLeft(t) <= 0) { vMsg = 'No te quedan piezas de ese tipo'; vMsgT = 2.2; k.sfx('hurt'); return; }
    vPlace.push({ x: x, y: y, t: t, d: 0 }); k.sfx('click'); return;
  }
  if (p.t !== t) { p.t = t; p.d = 0; k.sfx('click'); return; }
  if (p.d < 3) { p.d++; k.sfx('pop'); return; }
  vPlace.splice(vPlace.indexOf(p), 1); k.sfx('click');
}
function vPanel() {
  BTN = [];
  const y0 = H - vPanH + 8, bh = Math.min(42, vPanH - 50), gap = 7;
  const bw = Math.floor((W - 24 - gap) / 2);
  button('via', 12, y0, bw, bh, 'Vía × ' + vLeft('via'), { on: vSel === 0, fs: 15, dis: !!vRun });
  button('agu', 12 + bw + gap, y0, bw, bh, 'Aguja × ' + vLeft('aguja'), { on: vSel === 1, fs: 15, dis: !!vRun || vLeft('aguja') + vPlace.filter((p) => p.t === 'aguja').length <= 0 });
  const y1 = y0 + bh + 7, bh2 = Math.min(38, H - (y1 + 8));
  const bw2 = Math.floor((W - 24 - gap) / 2);
  button('go', 12, y1, bw2, bh2, vRun === 1 ? 'Parar' : 'Arrancar', { fs: 15, col: vRun === 1 ? '#ff6b6b' : '#a8cf3f', dis: vRun === 2 });
  button('clr', 12 + bw2 + gap, y1, bw2, bh2, 'Quitar todo', { fs: 14, dis: !!vRun || !vPlace.length });
}
function vTileSpr(kind, S) {
  return spr('vt' + kind + S, S, S, (g) => {
    const s = S / 40;
    if (kind === 'rock') {
      const P = (h) => { h.moveTo(6 * s, 33 * s); h.lineTo(9 * s, 14 * s); h.quadraticCurveTo(20 * s, 5 * s, 31 * s, 13 * s); h.lineTo(34 * s, 33 * s); h.closePath(); };
      uni(g, [[P, '#6f6a86']], 1.5 * s); cel(g, P, '#6f6a86', 2.4 * s, 2.4 * s);
      seam(g, P, '#6f6a86', (h) => { h.fillRect(18 * s, 14 * s, 2 * s, 19 * s); });
    } else if (kind === 'floor') {
      g.fillStyle = TH.floor; g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, S, 2 * s);
      g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, S - 2 * s, S, 2 * s);
    }
  });
}
/* Una pieza de vía: traviesas + dos carriles, dibujados como un objeto (§8). */
function vRailSpr(from, to, S, col) {
  return spr('vr' + from + to + S + col, S, S, (g) => {
    const m = S / 2, hw = S * 0.20, pts = [];
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const A = dirs[from], B = dirs[to];
    g.strokeStyle = col; g.lineCap = 'butt';
    g.lineWidth = S * 0.42;
    g.beginPath();
    g.moveTo(m + A[0] * m, m + A[1] * m); g.quadraticCurveTo(m, m, m + B[0] * m, m + B[1] * m); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.24)'; g.lineWidth = S * 0.42;
    g.setLineDash([S * 0.09, S * 0.13]);
    g.beginPath(); g.moveTo(m + A[0] * m, m + A[1] * m); g.quadraticCurveTo(m, m, m + B[0] * m, m + B[1] * m); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = '#d8d3ea'; g.lineWidth = Math.max(1.2, S * 0.05);
    for (const o of [-hw, hw]) {
      g.beginPath();
      g.moveTo(m + A[0] * m - A[1] * o, m + A[1] * m + A[0] * o);
      g.quadraticCurveTo(m - (A[1] + B[1]) * o * 0.5, m + (A[0] + B[0]) * o * 0.5, m + B[0] * m - B[1] * o, m + B[1] * m + B[0] * o);
      g.stroke();
    }
    void pts;
  });
}
function vDrawTile(x, y, S, X, Y) {
  const ch = vBase(x, y), i = y * vLv.w + x;
  blit(vTileSpr('floor', S), X, Y);
  if (ch === '#') { blit(vTileSpr('rock', S), X, Y); return; }
  const p = vAt(x, y);
  if (ch === '+') { blit(vRailSpr(0, 2, S, '#7c6a4e'), X, Y); blit(vRailSpr(1, 3, S, '#7c6a4e'), X, Y); return; }
  if ('>v<^'.indexOf(ch) >= 0) { const d = '>v<^'.indexOf(ch); blit(vRailSpr((d + 2) % 4, d, S, '#7c6a4e'), X, Y); return; }
  if (p) {
    const col = p.t === 'aguja' ? '#a97b3c' : '#7c6a4e';
    blit(vRailSpr((p.d + 2) % 4, p.d, S, col), X, Y);
    if (p.t === 'aguja') { blit(vRailSpr((p.d + 2) % 4, (p.d + 1) % 4, S, col), X, Y); }
    const a = ['→', '↓', '←', '↑'][p.d];
    k.text(a, X + S - S * 0.16, Y + S * 0.04, Math.max(9, S * 0.26), p.t === 'aguja' ? '#ffd98a' : '#ffffffcc', 'right');
  }
  if (ch >= '1' && ch <= '9') {
    const e = vLv.e[+ch - 1];
    if (e.t === 'L') vDepot(X, Y, S, e.d);
    else if (e.t === 'W') vWagon(X, Y, S, e.n, vSim ? vSim.wi : 0);
    else if (e.t === 'E') vStation(X, Y, S);
    else if (e.t === 'S') { blit(vRailSpr((e.d + 2) % 4, e.d, S, '#a97b3c'), X, Y); blit(vRailSpr((e.d + 2) % 4, (e.d + 1) % 4, S, '#a97b3c'), X, Y); }
    else vTunnel(X, Y, S, e.i);
  }
  void i;
}
function vDepot(X, Y, S, d) {
  blit(spr('vdep' + S, S, S, (g) => {
    const s = S / 40;
    const P = (h) => { h.moveTo(5 * s, 34 * s); h.lineTo(5 * s, 18 * s); h.lineTo(20 * s, 7 * s); h.lineTo(35 * s, 18 * s); h.lineTo(35 * s, 34 * s); h.closePath(); };
    uni(g, [[P, '#8a5c3b']], 1.6 * s); cel(g, P, '#8a5c3b', 2.4 * s, 2.4 * s);
    seam(g, P, '#8a5c3b', (h) => { h.fillRect(5 * s, 18 * s, 30 * s, 1.8 * s); });
    g.fillStyle = '#2b2450'; g.beginPath(); rr(g, 13 * s, 21 * s, 14 * s, 13 * s, 2 * s); g.fill();
  }), X, Y);
  k.text(['→', '↓', '←', '↑'][d], X + S / 2, Y + S * 0.56, Math.max(10, S * 0.3), '#ffd98a', 'center');
}
function vWagon(X, Y, S, n, got) {
  const on = n <= got;
  c.save(); if (on) c.globalAlpha = 0.4;
  blit(wagonSpr(Math.round(S * 0.9), ['#ff6b6b', '#ffc94d', '#5b8cff', '#a8cf3f', '#ff6fb5'][(n - 1) % 5]), X + S * 0.05, Y + S * 0.05);
  c.restore();
  k.text(String(n), X + S / 2, Y + S * 0.02, Math.max(10, S * 0.28), '#ffffff', 'center');
}
function vStation(X, Y, S) {
  blit(spr('vsta' + S, S, S, (g) => {
    const s = S / 40;
    const P = (h) => { h.moveTo(4 * s, 34 * s); h.lineTo(4 * s, 16 * s); h.lineTo(20 * s, 6 * s); h.lineTo(36 * s, 16 * s); h.lineTo(36 * s, 34 * s); h.closePath(); };
    uni(g, [[P, '#c9d3ea']], 1.6 * s); cel(g, P, '#c9d3ea', 2.4 * s, 2.4 * s);
    seam(g, P, '#c9d3ea', (h) => { h.fillRect(4 * s, 22 * s, 32 * s, 1.6 * s); });
    g.fillStyle = '#463ac4'; g.beginPath(); rr(g, 14 * s, 24 * s, 12 * s, 10 * s, 1.8 * s); g.fill();
    spec(g, 12 * s, 13 * s, 4 * s, 2 * s, -0.5, 0.45);
  }), X, Y);
}
function vTunnel(X, Y, S, i) {
  blit(spr('vtun' + S + i, S, S, (g) => {
    const s = S / 40;
    const P = (h) => { h.moveTo(5 * s, 34 * s); h.lineTo(5 * s, 20 * s); h.quadraticCurveTo(20 * s, 5 * s, 35 * s, 20 * s); h.lineTo(35 * s, 34 * s); h.closePath(); };
    uni(g, [[P, '#5c6b85']], 1.6 * s); cel(g, P, '#5c6b85', 2.4 * s, 2.4 * s);
    g.fillStyle = '#100c22'; g.beginPath();
    g.moveTo(12 * s, 34 * s); g.lineTo(12 * s, 22 * s); g.quadraticCurveTo(20 * s, 12 * s, 28 * s, 22 * s); g.lineTo(28 * s, 34 * s); g.closePath(); g.fill();
  }), X, Y);
}
function vDraw() {
  c.fillStyle = TH.bg; c.fillRect(0, 0, W, H);
  for (let y = 0; y < vLv.h; y++) for (let x = 0; x < vLv.w; x++) vDrawTile(x, y, vS, vGX + x * vS, vGY + y * vS);
  /* recorrido recorrido por el tren */
  if (vSim && vSim.path.length > 1) {
    c.strokeStyle = 'rgba(255,201,77,.35)'; c.lineWidth = Math.max(2, vS * 0.1); c.beginPath();
    for (let i = 0; i < vSim.path.length; i++) {
      const p = vSim.path[i], X = vGX + p[0] * vS + vS / 2, Y = vGY + p[1] * vS + vS / 2;
      i ? c.lineTo(X, Y) : c.moveTo(X, Y);
    }
    c.stroke();
  }
  if (vSim) {
    const S2 = Math.round(vS * 0.86);
    blit(locoSpr(S2, '#ff6b6b'), vGX + vSim.x * vS + (vS - S2) / 2, vGY + vSim.y * vS + (vS - S2) / 2);
  }
  if (vKb && !vRun) {
    c.strokeStyle = TH.ac; c.lineWidth = 3;
    c.beginPath(); rr(c, vGX + vCur[0] * vS + 2, vGY + vCur[1] * vS + 2, vS - 4, vS - 4, 7); c.stroke();
  }
  /* HUD */
  const used = vPlace.length;
  k.text('Nivel ' + k.lv + '/' + LV.length, 12, 8, 17, TH.ac);
  k.text(clipTxt(vLv.t, W / 2 - 60, 14), 12, 30, 14, TH.txt);
  k.text('Piezas ' + used + ' · mínimo ' + vLv.min, W - 12, 8, 15, used <= vLv.min ? '#a8cf3f' : TH.txt, 'right');
  k.text('Vagones ' + (vSim ? vSim.wi : 0) + '/' + vLv.e.filter((e) => e && e.t === 'W').length, W - 12, 30, 13, '#cfe6c9', 'right');
  const info = vMsgT > 0 ? vMsg : 'Coloca vías, recoge los vagones por orden y llega a la estación';
  const fs = fitSize(info, W - 24, 13, 9);
  k.text(clipTxt(info, W - 24, fs), W / 2, vHudH - fs - 5, fs, vMsgT > 0 ? '#ff9c9c' : '#bfe0d6', 'center');
  vPanel();
  for (let i = 0; i < BTN.length; i++) drawBtn(BTN[i]);
}
function vPointer() {
  if (!k.ptr.hit) return;
  const b = hitBtn(k.ptr.x, k.ptr.y);
  if (b) {
    k.sfx('click');
    if (b.id === 'via') vSel = 0;
    else if (b.id === 'agu') vSel = 1;
    else if (b.id === 'go') vStart();
    else if (b.id === 'clr') { vPlace = []; vSim = null; }
    return;
  }
  vKb = false;
  vTapCell(Math.floor((k.ptr.x - vGX) / vS), Math.floor((k.ptr.y - vGY) / vS));
}
function vKeys() {
  const mv = (dx, dy) => { vKb = true; vCur = [Math.max(0, Math.min(vLv.w - 1, vCur[0] + dx)), Math.max(0, Math.min(vLv.h - 1, vCur[1] + dy))]; };
  if (k.hit.has('left')) mv(-1, 0);
  if (k.hit.has('right')) mv(1, 0);
  if (k.hit.has('up')) mv(0, -1);
  if (k.hit.has('down')) mv(0, 1);
  if (k.hit.has('a')) { if (vKb) vTapCell(vCur[0], vCur[1]); else { vKb = true; } }
  if (k.hit.has('b')) { vSel = 1 - vSel; k.sfx('click'); }
}

/* ============================================================================================
 * 2) METRO EN HORA PUNTA
 * ========================================================================================== */
const MCOL = ['#ff6b6b', '#5b8cff', '#a8cf3f', '#ffc94d', '#ff6fb5'];
let mCfg = null, mPlan = null, mSt = null, mPhase = 0, mLine = 0, mMsg = '', mMsgT = 0;
let mGX = 0, mGY = 0, mGS = 40, mGSY = 40, mHudH = 76, mPanH = 116, mEnd = 0;
function mLayout() {
  W = k.W; H = k.H;
  mHudH = H < 520 ? 64 : 76; mPanH = H < 520 ? 96 : 116;
  const gh = H - mHudH - mPanH;
  mGS = Math.max(14, Math.min(Math.floor((W - 34) / 12), Math.floor((gh - 20) / 9), 74));
  /* en pantallas altas el plano se estira a lo alto en vez de dejar medio lienzo vacío */
  mGSY = Math.max(mGS, Math.min(Math.floor((gh - 20) / 9), Math.round(mGS * 1.7)));
  mGX = Math.round((W - mGS * 12) / 2 + mGS / 2); mGY = Math.round(mHudH + (gh - mGSY * 9) / 2 + mGSY / 2);
}
function mBuild() {
  mCfg = metroCfg((k.lv || 1) - 1, k.dif);
  mPlan = { lines: [], trains: [] };
  for (let i = 0; i < mCfg.lines; i++) mPlan.lines.push([]);
  mSt = null; mPhase = 0; mLine = 0; mMsg = ''; mMsgT = 0; mEnd = 0;
  mLayout();
}
function mSX(s) { return mGX + s.x * mGS; }
function mSY(s) { return mGY + s.y * mGSY; }
function mOpen(i) { return mSt ? mSt.t >= mCfg.st[i].at : mCfg.st[i].at <= 0; }
function mRailUsed() { return metroRail(mCfg, mPlan.lines.filter((l) => l.length >= 2)); }
function mToggle(i) {
  if (mEnd) return;
  const L = mPlan.lines[mLine], at = L.indexOf(i);
  if (at >= 0) { L.splice(at, 1); k.sfx('pop'); mSync(); return; }
  if (!mOpen(i)) { mMsg = 'Esa estación todavía no ha abierto'; mMsgT = 2.2; return; }
  L.push(i);
  if (mRailUsed() > mCfg.rail) { L.pop(); mMsg = 'No te queda vía suficiente'; mMsgT = 2.4; k.sfx('hurt'); return; }
  k.sfx('click'); mSync();
}
/* Al cambiar el plano en marcha se rehace el estado conservando lo llevado y las colas. */
function mSync() {
  if (!mSt) return;
  const old = mSt, plan = { lines: mPlan.lines.filter((l) => l.length >= 2), trains: mPlan.trains.slice() };
  if (!plan.lines.length) { mSt.lines = []; return; }
  const S = metroInit(mCfg, plan);
  if (S.lost) return;
  S.t = old.t; S.score = old.score; S.ovMax = old.ovMax; S.ovAny = old.ovAny;
  for (let i = 0; i < S.st.length && i < old.st.length; i++) { S.st[i].q = old.st[i].q; S.st[i].n = old.st[i].n; S.st[i].next = old.st[i].next; S.st[i].ov = old.st[i].ov; }
  mSt = S;
}
function mStart() {
  const lines = mPlan.lines.filter((l) => l.length >= 2);
  if (!lines.length) { mMsg = 'Une al menos dos estaciones'; mMsgT = 2.4; k.sfx('hurt'); return; }
  if (!mPlan.trains.length) { mMsg = 'Pon al menos un tren'; mMsgT = 2.4; k.sfx('hurt'); return; }
  mSt = metroInit(mCfg, { lines: lines, trains: mPlan.trains });
  mPhase = 1; k.sfx('start');
}
function mAddTrain() {
  if (mPlan.trains.length >= mCfg.trains) { mMsg = 'No te quedan trenes'; mMsgT = 2; return; }
  const lines = mPlan.lines.filter((l) => l.length >= 2);
  if (!lines.length) { mMsg = 'Primero une dos estaciones'; mMsgT = 2.2; return; }
  let li = 0, n = 0;
  for (let i = 0; i < mPlan.lines.length; i++) if (mPlan.lines[i].length >= 2) { if (i === mLine) { li = n; break; } n++; }
  mPlan.trains.push(li); k.sfx('coin'); mSync();
}
function mUpd(dt) {
  if (mMsgT > 0) mMsgT -= dt;
  if (mPhase !== 1 || !mSt || mEnd) return;
  metroTick(mSt, Math.min(dt, 0.08));
  if (mSt.lost || mSt.t >= mCfg.dur) {
    mEnd = 1;
    const res = { ok: !mSt.lost && mSt.score >= mCfg.need, score: mSt.score, lost: mSt.lost, ov: mSt.ovMax, ovAny: mSt.ovAny, rail: mSt.rail };
    if (res.ok) {
      const med = metroMedal(mCfg, res);
      const pts = res.score * 10 + (med ? 250 : 0) + (k.dif === 2 ? 200 : k.dif === 1 ? 100 : 0);
      k.sfx('win');
      later(() => k.levelDone(pts, 'Has llevado <b>' + res.score + '</b> viajeros' + (med ? '<br><b>¡Medalla!</b> ' + mCfg.med.t : '')), 650);
    } else {
      k.sfx('lose');
      later(() => k.lose(CFG.id, mSt.score, mSt.lost === 'colapso' ? 'Colapso en una estación' : 'Se acabó la semana',
        'Has llevado ' + mSt.score + ' de ' + mCfg.need + ' viajeros'), 500);
    }
  }
}
function mShape(g, sh, x, y, r, col) {
  g.beginPath();
  if (sh === 0) g.arc(x, y, r, 0, R2);
  else if (sh === 1) { g.moveTo(x, y - r); g.lineTo(x + r, y + r * 0.8); g.lineTo(x - r, y + r * 0.8); g.closePath(); }
  else if (sh === 2) { rr(g, x - r, y - r, r * 2, r * 2, r * 0.3); }
  else if (sh === 3) { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r * 0.46 : r; const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); }
  else if (sh === 4) { g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); }
  else { const q = r * 0.36; g.moveTo(x - q, y - r); g.lineTo(x + q, y - r); g.lineTo(x + q, y - q); g.lineTo(x + r, y - q); g.lineTo(x + r, y + q); g.lineTo(x + q, y + q); g.lineTo(x + q, y + r); g.lineTo(x - q, y + r); g.lineTo(x - q, y + q); g.lineTo(x - r, y + q); g.lineTo(x - r, y - q); g.lineTo(x - q, y - q); g.closePath(); }
  if (col) { g.fillStyle = col; g.fill(); }
}
function mStaSpr(sh, S) {
  return spr('mst' + sh + S, S, S, (g) => {
    const r = S * 0.34, P = (h) => mShape(h, sh, S / 2, S / 2, r);
    contact(g, S / 2, S * 0.5 + r * 0.9, r * 0.9, r * 0.22, 0.3);
    uni(g, [[P, '#f4f2ff']], 1.5); cel(g, P, '#f4f2ff', 1.6, 1.6);
  });
}
function mDraw() {
  c.fillStyle = TH.bg; c.fillRect(0, 0, W, H);
  /* fondo de la ciudad: manzanas cacheadas */
  c.fillStyle = TH.floor;
  c.fillRect(mGX - mGS * 0.6, mGY - mGSY * 0.6, mGS * 12, mGSY * 9);
  c.strokeStyle = TH.line; c.lineWidth = 1;
  for (let x = 0; x <= 12; x++) { c.beginPath(); c.moveTo(mGX - mGS * 0.6 + x * mGS, mGY - mGSY * 0.6); c.lineTo(mGX - mGS * 0.6 + x * mGS, mGY - mGSY * 0.6 + mGSY * 9); c.stroke(); }
  for (let y = 0; y <= 9; y++) { c.beginPath(); c.moveTo(mGX - mGS * 0.6, mGY - mGSY * 0.6 + y * mGSY); c.lineTo(mGX - mGS * 0.6 + mGS * 12, mGY - mGSY * 0.6 + y * mGSY); c.stroke(); }
  /* líneas */
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 0; i < mPlan.lines.length; i++) {
    const L = mPlan.lines[i]; if (L.length < 2) continue;
    c.strokeStyle = MCOL[i % MCOL.length]; c.lineWidth = Math.max(3, mGS * 0.16);
    c.beginPath();
    for (let j = 0; j < L.length; j++) { const s = mCfg.st[L[j]]; j ? c.lineTo(mSX(s), mSY(s)) : c.moveTo(mSX(s), mSY(s)); }
    c.stroke();
  }
  /* trenes */
  if (mSt) for (let i = 0; i < mSt.tr.length; i++) {
    const T = mSt.tr[i], S2 = Math.round(mGS * 0.7);
    blit(locoSpr(S2, MCOL[T.ln % MCOL.length]), mGX + T.x * mGS - S2 / 2, mGY + T.y * mGSY - S2 / 2);
    if (T.load.length) k.text(String(T.load.length), mGX + T.x * mGS, mGY + T.y * mGSY - S2 * 0.72, Math.max(9, mGS * 0.26), '#fff', 'center');
  }
  /* estaciones y colas */
  for (let i = 0; i < mCfg.st.length; i++) {
    const s = mCfg.st[i]; if (!mOpen(i)) continue;
    const S2 = Math.round(mGS * 1.05);
    blit(mStaSpr(s.sh, S2), mSX(s) - S2 / 2, mSY(s) - S2 / 2);
    const q = mSt ? mSt.st[i].q : [];
    if (q.length) {
      const r = Math.max(2.4, mGS * 0.11), n = Math.min(q.length, 10);
      for (let j = 0; j < n; j++) mShape(c, q[j], mSX(s) - mGS * 0.44 + (j % 5) * r * 2.3, mSY(s) + mGS * 0.46 + ((j / 5) | 0) * r * 2.3, r, q.length > MQMAX ? '#ff6b6b' : '#ffe9a8');
      if (q.length > 10) k.text('+' + (q.length - 10), mSX(s) + mGS * 0.5, mSY(s) + mGS * 0.36, Math.max(8, mGS * 0.22), '#ffb3b3');
    }
    if (mSt && mSt.st[i].ov > 0.4) {
      const f = mSt.st[i].ov / MOVT;
      c.strokeStyle = '#ff6b6b'; c.lineWidth = Math.max(2, mGS * 0.08);
      c.beginPath(); c.arc(mSX(s), mSY(s), mGS * 0.6, -Math.PI / 2, -Math.PI / 2 + R2 * Math.min(1, f)); c.stroke();
    }
    if (mLine >= 0 && mPlan.lines[mLine].indexOf(i) >= 0) {
      c.strokeStyle = MCOL[mLine % MCOL.length]; c.lineWidth = 2;
      c.beginPath(); c.arc(mSX(s), mSY(s), mGS * 0.52, 0, R2); c.stroke();
    }
  }
  /* HUD */
  k.text('Semana ' + k.lv + '/' + MW.length, 12, 8, 17, TH.ac);
  k.text(clipTxt(mCfg.t, W / 2 - 60, 14), 12, 30, 14, TH.txt);
  const sc = mSt ? mSt.score : 0;
  k.text('Viajeros ' + sc + '/' + mCfg.need, W - 12, 8, 16, sc >= mCfg.need ? '#a8cf3f' : TH.txt, 'right');
  const tl = mSt ? Math.max(0, Math.ceil(mCfg.dur - mSt.t)) : mCfg.dur;
  k.text('Quedan ' + tl + ' s · vía ' + Math.round(mRailUsed()) + '/' + mCfg.rail, W - 12, 30, 13, '#c9c4ee', 'right');
  const info = mMsgT > 0 ? mMsg : mPhase ? mCfg.med.t : 'Une estaciones con la línea elegida, pon trenes y abre el metro';
  const fs = fitSize(info, W - 24, 13, 9);
  k.text(clipTxt(info, W - 24, fs), W / 2, mHudH - fs - 5, fs, mMsgT > 0 ? '#ff9c9c' : '#bfbce6', 'center');
  mPanel();
  for (let i = 0; i < BTN.length; i++) drawBtn(BTN[i]);
}
function mPanel() {
  BTN = [];
  const y0 = H - mPanH + 8, gap = 6;
  const bw = Math.floor((W - 24 - gap * (mCfg.lines - 1)) / mCfg.lines), bh = Math.min(38, mPanH - 56);
  for (let i = 0; i < mCfg.lines; i++) {
    button('L' + i, 12 + i * (bw + gap), y0, bw, bh, 'L' + (i + 1), { on: mLine === i, col: mLine === i ? MCOL[i % MCOL.length] : '#3a3566', fs: 15 });
  }
  const y1 = y0 + bh + 7, bh2 = Math.min(38, H - (y1 + 8)), bw2 = Math.floor((W - 24 - gap) / 2);
  button('tr', 12, y1, bw2, bh2, 'Tren +  (' + (mCfg.trains - mPlan.trains.length) + ')', { fs: 14, dis: mPlan.trains.length >= mCfg.trains });
  button('go', 12 + bw2 + gap, y1, bw2, bh2, mPhase ? 'En marcha' : 'Abrir metro', { fs: 14, col: mPhase ? '#3a3566' : '#a8cf3f', dis: !!mPhase });
}
function mPointer() {
  if (!k.ptr.hit) return;
  const b = hitBtn(k.ptr.x, k.ptr.y);
  if (b) {
    k.sfx('click');
    if (b.id.charAt(0) === 'L') mLine = +b.id.slice(1);
    else if (b.id === 'tr') mAddTrain();
    else if (b.id === 'go') mStart();
    return;
  }
  let best = -1, bd = mGS * 0.75;
  for (let i = 0; i < mCfg.st.length; i++) {
    const s = mCfg.st[i], d = Math.hypot(k.ptr.x - mSX(s), k.ptr.y - mSY(s));
    if (d < bd) { bd = d; best = i; }
  }
  if (best >= 0) mToggle(best);
}
function mKeys() {
  if (k.hit.has('b')) { mLine = (mLine + 1) % mCfg.lines; k.sfx('click'); }
  if (k.hit.has('a')) { if (!mPhase) mStart(); else mAddTrain(); }
}

/* ============================================================================================
 * 3) CHOQUE DE TRENES (1–4 en la tele)
 * ========================================================================================== */
const NET = choqueNet();
let cPl = [], cTr = [], cCargo = [], cT = 0, cDur = 90, cGS = 60, cCX = 0, cCY = 0, cHudH = 56, cEnd = 0, cSpawn = 0;
function cLayout() {
  W = k.W; H = k.H;
  cHudH = H < 420 ? 44 : 56;
  /* los apeaderos de las esquinas sobresalen 0,3 casillas: hay que dejarles margen */
  cGS = Math.max(28, Math.min(Math.floor((W - 76) / (NET.nx - 1)), Math.floor((H - cHudH - 76) / (NET.ny - 1)), 150));
  cCX = Math.round((W - cGS * (NET.nx - 1)) / 2); cCY = Math.round(cHudH + (H - cHudH - cGS * (NET.ny - 1)) / 2);
}
function cNX(n) { return cCX + NET.nodes[n].cx * cGS; }
function cNY(n) { return cCY + NET.nodes[n].cy * cGS; }
function cBuild() {
  cPl = k.players(Math.max(1, Math.min(4, k.mpMax || 1)));
  cTr = cPl.map((p, i) => ({ p: p.p, cpu: p.cpu, node: CDEP[i % 4], to: -1, u: 0, d: 0, cargo: 0, score: 0, stun: 0, inv: 0, want: -1 }));
  for (const T of cTr) { T.to = NET.nodes[T.node].nb.find((n) => n >= 0); T.d = NET.nodes[T.node].nb.indexOf(T.to); }
  cCargo = []; cT = 0; cEnd = 0; cSpawn = 0;
  cDur = Math.round(90 * (k.dif === 0 ? 1.15 : k.dif === 2 ? 0.9 : 1));
  for (let i = 0; i < Math.min(4, cPl.length) + 1; i++) cAddCargo();
  cLayout();
}
function cAddCargo() {
  const free = CLOAD.filter((n) => !cCargo.some((g) => g.n === n));
  if (!free.length) return;
  const n = free[k.ri(0, free.length - 1)];
  cCargo.push({ n: n, own: k.ri(0, Math.max(0, cTr.length - 1)) });
}
function cNext(T) {
  const N = NET.nodes[T.to], nb = N.nb;
  let want = -1;
  if (T.cpu) want = cBotDir(T);
  else {
    const d = k.pdir(T.p);
    if (d.x > 0) want = 0; else if (d.x < 0) want = 2;
    else if (d.y > 0) want = 1; else if (d.y < 0) want = 3;
    if (T.want >= 0) want = T.want;
  }
  T.want = -1;
  if (want >= 0 && nb[want] >= 0 && nb[want] !== T.node) return want;
  if (nb[T.d] >= 0) return T.d;                       /* seguir recto */
  for (let i = 0; i < 4; i++) { const q = (T.d + 1 + i) % 4; if (nb[q] >= 0 && nb[q] !== T.node) return q; }
  return (T.d + 2) % 4;
}
function cTarget(T) {
  if (T.cargo) return CDEP[cTr.indexOf(T) % 4];
  const mine = cCargo.filter((g) => g.own === cTr.indexOf(T));
  const pool = mine.length ? mine : cCargo;
  if (!pool.length) return CDEP[cTr.indexOf(T) % 4];
  let b = pool[0], bd = 1e9;
  for (const g of pool) {
    const d = Math.abs(NET.nodes[g.n].cx - NET.nodes[T.to].cx) + Math.abs(NET.nodes[g.n].cy - NET.nodes[T.to].cy);
    if (d < bd) { bd = d; b = g; }
  }
  return b.n;
}
function cBotDir(T) {
  const tg = cTarget(T), N = NET.nodes[T.to], skill = 0.55 + 0.15 * (k.D ? k.D.cpu || 1 : 1);
  if (k.rnd() > skill) return -1;
  let best = -1, bd = 1e9;
  for (let i = 0; i < 4; i++) {
    const n = N.nb[i]; if (n < 0 || n === T.node) continue;
    const d = Math.abs(NET.nodes[n].cx - NET.nodes[tg].cx) + Math.abs(NET.nodes[n].cy - NET.nodes[tg].cy);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function cUpd(dt) {
  if (cEnd) return;
  cT += dt;
  cSpawn -= dt;
  if (cSpawn <= 0) { cAddCargo(); cSpawn = 4.5; }
  const spd = 1.5 * (k.dif === 2 ? 1.18 : k.dif === 0 ? 0.88 : 1);
  for (const T of cTr) {
    if (T.inv > 0) T.inv -= dt;
    if (T.stun > 0) { T.stun -= dt; continue; }
    if (!T.cpu) {
      const d = k.pdir(T.p);
      if (d.x > 0) T.want = 0; else if (d.x < 0) T.want = 2;
      else if (d.y > 0) T.want = 1; else if (d.y < 0) T.want = 3;
    }
    T.u += spd * dt;
    while (T.u >= 1) {
      T.u -= 1; T.node = T.to;
      const idx = cTr.indexOf(T);
      const gi = cCargo.findIndex((g) => g.n === T.node);
      if (gi >= 0 && !T.cargo && cCargo[gi].own === idx) { T.cargo = 1; cCargo.splice(gi, 1); k.sfx('coin'); }
      if (T.cargo && T.node === CDEP[idx % 4]) { T.cargo = 0; T.score++; k.sfx('win'); k.float('+1', cNX(T.node), cNY(T.node) - 18, k.pcol(T.p)); }
      T.d = cNext(T); T.to = NET.nodes[T.node].nb[T.d];
      if (T.to < 0) { T.d = (T.d + 2) % 4; T.to = NET.nodes[T.node].nb[T.d]; }
      if (T.to < 0) { T.to = T.node; T.u = 0; break; }
    }
  }
  /* choques */
  for (let i = 0; i < cTr.length; i++) for (let j = i + 1; j < cTr.length; j++) {
    const A = cTr[i], B = cTr[j];
    if (A.stun > 0 || B.stun > 0 || A.inv > 0 || B.inv > 0) continue;
    const ax = cPX(A), ay = cPY(A), bx = cPX(B), by = cPY(B);
    if (Math.hypot(ax - bx, ay - by) < cGS * 0.28) {
      A.stun = B.stun = 1.7; A.cargo = B.cargo = 0; A.inv = B.inv = 3.4;
      cBack(A); cBack(B);                              /* dan marcha atrás: si no, chocarían sin parar */
      k.sfx('explode'); k.shake(8); k.burst((ax + bx) / 2, (ay + by) / 2, '#ffc94d', 18, 190);
    }
  }
  if (cT >= cDur) {
    cEnd = 1;
    later(() => k.podium(cTr.map((T) => ({ p: T.p, score: T.score })), { head: null, go: 'Toca para la revancha' }), 500);
  }
}
function cBack(T) {
  const a = T.node; T.node = T.to; T.to = a; T.u = 1 - T.u;
  T.d = NET.nodes[T.node].nb.indexOf(T.to); if (T.d < 0) T.d = 0;
  T.want = -1;
}
function cPX(T) { return cNX(T.node) + (cNX(T.to) - cNX(T.node)) * T.u; }
function cPY(T) { return cNY(T.node) + (cNY(T.to) - cNY(T.node)) * T.u; }
function cDraw() {
  c.fillStyle = TH.bg; c.fillRect(0, 0, W, H);
  /* red de vías: un solo trazo grueso + traviesas */
  c.strokeStyle = '#3a2c44'; c.lineWidth = Math.max(8, cGS * 0.2); c.lineCap = 'round';
  for (let i = 0; i < NET.nodes.length; i++) for (let d = 0; d < 2; d++) {
    const n = NET.nodes[i].nb[d]; if (n < 0) continue;
    c.beginPath(); c.moveTo(cNX(i), cNY(i)); c.lineTo(cNX(n), cNY(n)); c.stroke();
  }
  c.strokeStyle = '#8f88a8'; c.lineWidth = Math.max(1.4, cGS * 0.03);
  for (let i = 0; i < NET.nodes.length; i++) for (let d = 0; d < 2; d++) {
    const n = NET.nodes[i].nb[d]; if (n < 0) continue;
    for (const o of [-cGS * 0.06, cGS * 0.06]) {
      const dx = d === 0 ? 0 : o, dy = d === 0 ? o : 0;
      c.beginPath(); c.moveTo(cNX(i) + dx, cNY(i) + dy); c.lineTo(cNX(n) + dx, cNY(n) + dy); c.stroke();
    }
  }
  /* apeaderos */
  for (let i = 0; i < cTr.length; i++) {
    const n = CDEP[i % 4], col = k.pcol(cTr[i].p), r = cGS * 0.3;
    const P = (g) => rr(g, cNX(n) - r, cNY(n) - r, r * 2, r * 2, r * 0.4);
    uni(c, [[P, col]], 1.5); cel(c, P, col, 2, 2);
    k.text(String(i + 1), cNX(n), cNY(n) - r * 0.6, Math.max(11, r * 0.9), '#1a1530', 'center');
  }
  /* mercancías */
  for (const g of cCargo) {
    const col = k.pcol(cTr[g.own] ? cTr[g.own].p : 0), r = cGS * 0.16;
    const P = (h) => rr(h, cNX(g.n) - r, cNY(g.n) - r - cGS * 0.22, r * 2, r * 2, r * 0.3);
    uni(c, [[P, col]], 1.3); cel(c, P, col, 1.4, 1.4);
  }
  /* trenes */
  for (const T of cTr) {
    const S2 = Math.round(cGS * 0.46), x = cPX(T) - S2 / 2, y = cPY(T) - S2 / 2;
    c.save(); if (T.stun > 0) c.globalAlpha = 0.45 + 0.35 * Math.sin(cT * 22);
    blit(locoSpr(S2, k.pcol(T.p)), x, y);
    if (T.cargo) { const r = S2 * 0.2; const P = (h) => rr(h, cPX(T) - r, cPY(T) - S2 * 0.62, r * 2, r * 2, r * 0.3); uni(c, [[P, '#ffc94d']], 1.2); }
    c.restore();
  }
  /* HUD: marcador en una fila, dejando libre el centro de arriba */
  const n = cTr.length, half = Math.floor(n / 2) || 1;
  for (let i = 0; i < n; i++) {
    const left = i < Math.ceil(n / 2);
    const idx = left ? i : i - Math.ceil(n / 2);
    const x = left ? 12 + idx * 86 : W - 12 - (n - 1 - i) * 86;
    const nm = clipTxt(cPl[i].name, 74, 13);
    k.text(nm, x, 8, 13, k.pcol(cTr[i].p), left ? 'left' : 'right');
    k.text(String(cTr[i].score), x, 25, 18, '#fff', left ? 'left' : 'right');
  }
  void half;
  const tl = Math.max(0, Math.ceil(cDur - cT));
  k.text(tl + ' s', W / 2, H - 26, 20, tl <= 10 ? '#ff6b6b' : TH.txt, 'center');
}

/* ============================================================================================
 * bucle común
 * ========================================================================================== */
function reset() { if (M === 'vias') vBuild(); else if (M === 'metro') mBuild(); else cBuild(); }
k.onSize = () => { W = k.W; H = k.H; if (M === 'vias' && vLv) vLayout(); else if (M === 'metro' && mCfg) mLayout(); else if (M === 'choque') cLayout(); };
const _upd = (dt) => {
  if (!k.gate(reset)) return;
  if (M === 'vias') { vPointer(); vKeys(); vUpd(dt); }
  else if (M === 'metro') { mPointer(); mKeys(); mUpd(dt); }
  else cUpd(dt);
};
const _draw = () => { if (M === 'vias') vDraw(); else if (M === 'metro') mDraw(); else cDraw(); };
if (M === 'vias') k.levels(LV.length, { start: () => vBuild() });
else if (M === 'metro') k.levels(MW.length, { start: () => mBuild() });
/* si la sala de la tele llega (o cambia) antes de empezar, se rehace el reparto de trenes */
k.onParty = () => { if (M === 'choque' && k.st !== 'play') cBuild(); };
reset();
k.run(_upd, _draw);
k.show(CFG.title, CFG.help);
/* ganchos de prueba (bots de Playwright) */
window.__t = {
  mode: M,
  get W() { return W; }, get H() { return H; },
  get btn() { return BTN; },
  get lv() { return vLv; }, get place() { return vPlace; }, get run() { return vRun; }, get msg() { return vMsg; },
  get gx() { return vGX; }, get gy() { return vGY; }, get S() { return vS; },
  get vsim() { return vSim ? { x: vSim.x, y: vSim.y, wi: vSim.wi } : null; }, get vdone() { return vDone; },
  solve: () => { if (M !== 'vias') return false; const r = routeVias(vLv); if (r.min < 0) return false; vPlace = r.place.slice(); return true; },
  get mcfg() { return mCfg; }, get mplan() { return mPlan; }, get mst() { return mSt; },
  mauto: () => { if (M !== 'metro') return false; const p = metroAuto(mCfg); mPlan.lines = []; for (let i = 0; i < mCfg.lines; i++) mPlan.lines.push(p.lines[i] ? p.lines[i].slice() : []); mPlan.trains = p.trains.slice(); return true; },
  mstart: () => { if (M === 'metro') mStart(); },
  mfast: (sec) => { if (M !== 'metro') return false; const n = Math.round((sec || 60) / 0.08); for (let i = 0; i < n && !mEnd; i++) mUpd(0.08); return true; },
  vgo: () => { if (M === 'vias') vStart(); },
  vfast: () => { if (M !== 'vias') return 0; for (let i = 0; i < 400 && vRun === 1; i++) vUpd(0.32); return vRun; },
  get ctr() { return cTr; }, get ccargo() { return cCargo; }, get ct() { return cT; },
  cfast: () => { if (M === 'choque') cT = cDur - 1; },
};
