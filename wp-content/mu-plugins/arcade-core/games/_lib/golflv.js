/* Niveles a mano de Mini Golf 3D (plan Friv · la vara). Solo los usa el juego 'mini-golf-3d';
 * Putt Island y Minigolf Party no miran esta tabla.
 *
 * ZONA PURA: este fichero no toca Kit, ART ni el DOM. Contiene la tabla de los 20 hoyos y la
 * física completa del minigolf, así que el mismo código que se juega es el que verifica el par
 * desde Node (scripts de comprobación: bot que se pasa los 20 en las 3 dificultades).
 *
 * MAPA — 12 columnas × 20 filas de 30 px. Las filas 0-1 y 19 se dejan libres (HUD y barra).
 *   ' '   fuera del recorrido (pared de madera)
 *   '.'   césped
 *   '~'   agua (si la bola se para ahí: +1 golpe y vuelve al sitio anterior)
 *   'a'   arena (frena mucho)
 *   'g'   barro pegajoso (frena muchísimo)
 *   '^v<>' cinta transportadora en esa dirección
 *   'R'   rampa: si entras con fuerza te lanza por el aire (pasa por encima del agua)
 *   'o'   seta rebotadora
 *   'I'   imán (tira de la bola cuando pasa cerca)
 *   'M'   molino (cuatro aspas que giran; su velocidad va en `ms`, la fase inicial en `ma`)
 *   '1'-'4' tubo: las dos casillas con el mismo número se teletransportan entre sí
 *   'T'   salida    'H'   copa
 *
 * HOYO: { n, name, par, tip, m:[20 filas], wind:[ax,ay], ms:[vel molinos], ma:[fase molinos] }
 * Estrellas: 1★ terminar dentro del máximo de golpes · 2★ hacer el par · 3★ birdie o menos y sin agua.
 * La dificultad cambia márgenes (golpes de sobra, viento, imán y velocidad de los molinos), nunca el trazado. */
var GOLFLV = (function () {
  var T = 30, COLS = 12, ROWS = 20, R2 = 6.2832, BELT = 300, MILL_L = 40, BALL_R = 7;

  var LV = [
    { name: 'Primer golpe', par: 2, tip: 'Arrastra hacia atrás desde la bola: cuanto más lejos, más fuerte. La copa solo se traga la bola que llega despacio.', m: [
      '            ',
      '            ',
      '    ....    ',
      '    .H..    ',
      '    ....    ',
      '    ....    ',
      '    ....    ',
      '    ....    ',
      '    ....    ',
      '    ....    ',
      '    ....    ',
      '    ....    ',
      '    ....    ',
      '    ....    ',
      '    ....    ',
      '    ....    ',
      '    .T..    ',
      '    ....    ',
      '            ',
      '            '] },

    { name: 'La ele', par: 3, tip: 'Las paredes de madera rebotan: apunta a la pared para doblar la esquina.', m: [
      '            ',
      '            ',
      '       ...  ',
      '       .H.  ',
      '       ...  ',
      '       ...  ',
      '  ........  ',
      '  ........  ',
      '  ........  ',
      '  ...       ',
      '  ...       ',
      '  ...       ',
      '  ...       ',
      '  ...       ',
      '  ...       ',
      '  ...       ',
      '  .T.       ',
      '  ...       ',
      '            ',
      '            '] },

    { name: 'Las setas', par: 3, tip: 'Las setas rosas devuelven la bola con más fuerza de la que llevaba: úsalas de atajo.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  H.......  ',
      '  ........  ',
      '  ..o..o..  ',
      '  ........  ',
      '  ........  ',
      '  .....o..  ',
      '  ......    ',
      '     ...    ',
      '  ........  ',
      '  ..o...o.  ',
      '  ........  ',
      '  ........  ',
      '  ....T...  ',
      '  ........  ',
      '            ',
      '            ',
      '            '] },

    { name: 'Arenas', par: 3, tip: 'La arena frena en seco: rodéala o pásala con fuerza, pero llega suave a la copa.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  ......H.  ',
      '  ........  ',
      '  .aaaa...  ',
      '  .aaaa...  ',
      '  ....      ',
      '  ....      ',
      '  ........  ',
      '  ..aaaa..  ',
      '  ..aaaa..  ',
      '  ........  ',
      '      ....  ',
      '      ....  ',
      '  ....T...  ',
      '  ........  ',
      '            ',
      '            ',
      '            '] },

    { name: 'El estanque', par: 4, tip: 'Dos puentes de césped, uno a cada lado. Si la bola acaba en el agua es un golpe de castigo.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  .H......  ',
      '  ........  ',
      '  ~~~~~..~  ',
      '  ~~~~~..~  ',
      '  ~~~~~..~  ',
      '  ........  ',
      '  ........  ',
      '  ~..~~~~~  ',
      '  ~..~~~~~  ',
      '  ........  ',
      '  ........  ',
      '  ........  ',
      '  .....T..  ',
      '  ........  ',
      '            ',
      '            ',
      '            '] },

    { name: 'El molino', par: 3, ms: [1.05], ma: [0], tip: 'Mira cómo giran las aspas y suelta el golpe cuando el hueco vaya a pasar por tu línea.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  ......H.  ',
      '  ........  ',
      '  ........  ',
      '  ...M....  ',
      '  ........  ',
      '  ....      ',
      '  ....      ',
      '  ........  ',
      '  ........  ',
      '      ....  ',
      '      ....  ',
      '  ........  ',
      '  ..T.....  ',
      '  ........  ',
      '            ',
      '            ',
      '            '] },

    { name: 'Cinta mecánica', par: 3, tip: 'Las cintas amarillas empujan la bola: ve a favor y cruza las de cara con fuerza.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  H.......  ',
      '  ........  ',
      '  ..>>>>..  ',
      '  ..>>>>..  ',
      '  ........  ',
      '      ....  ',
      '      ....  ',
      '  ........  ',
      '  ..^^^^..  ',
      '  ..^^^^..  ',
      '  ........  ',
      '  ....      ',
      '  ..T.      ',
      '  ....      ',
      '            ',
      '            ',
      '            '] },

    { name: 'Salto de rampa', par: 4, tip: 'El lago corta el recorrido: entra en la rampa de madera con fuerza y la bola volará por encima.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  ..H.....  ',
      '  ........  ',
      '  ........  ',
      '  ~~~~~~~~  ',
      '  ~~~~~~~~  ',
      '  ........  ',
      '  ...RR...  ',
      '  ...RR...  ',
      '  ........  ',
      '  ........  ',
      '  ........  ',
      '  ........  ',
      '  ....T...  ',
      '  ........  ',
      '            ',
      '            ',
      '            '] },

    { name: 'Por el tubo', par: 3, tip: 'Los tubos están emparejados: entra por uno y sales por el otro sin perder velocidad.', m: [
      '            ',
      '            ',
      '  ...  ...  ',
      '  .H.  .1.  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  .1.  ...  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  ...  .T.  ',
      '  ........  ',
      '  ........  ',
      '            ',
      '            '] },

    { name: 'Imán travieso', par: 4, tip: 'El imán azul tira de la bola cuando pasa cerca: pasa lejos de él, o muy rápido.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  ......H.  ',
      '  ........  ',
      '  ...I....  ',
      '  ........  ',
      '  ....      ',
      '  ....      ',
      '  ........  ',
      '  .....I..  ',
      '  ........  ',
      '      ....  ',
      '      ....  ',
      '  ........  ',
      '  ..T.....  ',
      '  ........  ',
      '            ',
      '            ',
      '            '] },

    { name: 'Viento del norte', par: 3, wind: [64, -18], tip: 'La manga de viento marca hacia dónde sopla: apunta un poco en contra.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  H.......  ',
      '  ........  ',
      '  ........  ',
      '  ....oo..  ',
      '  ........  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  ........  ',
      '  ........  ',
      '  ..oo....  ',
      '  ........  ',
      '  ........  ',
      '  ......T.  ',
      '  ........  ',
      '            ',
      '            ',
      '            '] },

    { name: 'Barrizal', par: 4, tip: 'El barro marrón se come casi toda la velocidad: busca los pasillos limpios.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  .......H  ',
      '  ........  ',
      '  gggg.ggg  ',
      '  gggg.ggg  ',
      '  ........  ',
      '  ...       ',
      '  ...       ',
      '  ........  ',
      '  ggg.gggg  ',
      '  ggg.gggg  ',
      '  ........  ',
      '       ...  ',
      '       T..  ',
      '  ........  ',
      '            ',
      '            ',
      '            '] },

    { name: 'Molino y laguna', par: 4, ms: [1.2], ma: [1.6], tip: 'Cruza la laguna por el puente del centro y luego espera al molino.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  .H......  ',
      '  ........  ',
      '  ....M...  ',
      '  ........  ',
      '  ........  ',
      '  ~~~..~~~  ',
      '  ~~~..~~~  ',
      '  ~~~..~~~  ',
      '  ........  ',
      '  ........  ',
      '  ....      ',
      '  ....      ',
      '  ..T.      ',
      '  ....      ',
      '            ',
      '            ',
      '            '] },

    { name: 'Cinta y arena', par: 4, tip: 'Una cinta te lleva a la derecha y otra a la izquierda: llega a la arena con la fuerza justa.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  .......H  ',
      '  ......aa  ',
      '  ........  ',
      '  <<<<<<..  ',
      '  <<<<<<..  ',
      '  ...       ',
      '  ...       ',
      '  ........  ',
      '  ..>>>>..  ',
      '  ..>>>>..  ',
      '  ........  ',
      '  .....     ',
      '  T....     ',
      '  .....     ',
      '            ',
      '            ',
      '            '] },

    { name: 'Tubos y setas', par: 4, tip: 'Dos parejas de tubos y setas junto a las bocas: de rebote se cuela sola.', m: [
      '            ',
      '            ',
      '  ...  ...  ',
      '  .H.  .2.  ',
      '  ...  ...  ',
      '  ..o  o..  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  .1.  ...  ',
      '  ...  ...  ',
      '  ...  ...  ',
      '  ..o  o..  ',
      '  ...  ...  ',
      '  ...  .T.  ',
      '  ...  ...  ',
      '  .2.  .1.  ',
      '  ........  ',
      '            ',
      '            '] },

    { name: 'Imán con viento', par: 4, wind: [-52, 0], tip: 'El viento sopla hacia la izquierda y el imán tira del centro: úsalos a tu favor.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  .H......  ',
      '  ........  ',
      '  ...I....  ',
      '  ........  ',
      '  ...       ',
      '  ...       ',
      '  ........  ',
      '  ...aaaa.  ',
      '  .....I..  ',
      '     .....  ',
      '     .....  ',
      '  ........  ',
      '  .......T  ',
      '  ........  ',
      '            ',
      '            ',
      '            '] },

    { name: 'Rampa y cinta', par: 4, tip: 'La cinta te da la velocidad que la rampa necesita para volar por encima del lago.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  ..H.....  ',
      '  ........  ',
      '  ~~~~~~~~  ',
      '  ~~~~~~~~  ',
      '  ........  ',
      '  ..RR....  ',
      '  ..RR....  ',
      '  ..^^....  ',
      '  ..^^....  ',
      '  ........  ',
      '  ........  ',
      '  ......    ',
      '  ....T.    ',
      '  ......    ',
      '            ',
      '            ',
      '            '] },

    { name: 'Barro y molino', par: 4, ms: [1.35], ma: [0.8], tip: 'Por el barro llegas despacio al molino; por la derecha llegas rápido pero justo a sus aspas.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  ....H...  ',
      '  ........  ',
      '  ..M.....  ',
      '  ........  ',
      '  .....     ',
      '  .....     ',
      '  gggggg..  ',
      '  gggggg..  ',
      '  ........  ',
      '     .....  ',
      '     .....  ',
      '  ........  ',
      '  ..T.....  ',
      '  ........  ',
      '            ',
      '            ',
      '            '] },

    { name: 'El circuito', par: 5, ms: [1.15], ma: [2.4], wind: [34, 0], tip: 'Rodea por abajo hasta el tubo, sal arriba a la derecha y cuélate entre las aspas.', m: [
      '            ',
      '            ',
      '  ........  ',
      '  .H....1.  ',
      '  ...M....  ',
      '  ........  ',
      '  ........  ',
      '  ...       ',
      '  ...       ',
      '  ........  ',
      '  ..>>>>..  ',
      '  ..>>>>..  ',
      '  ........  ',
      '  .aa..oo.  ',
      '  ........  ',
      '  .1..  .T  ',
      '  ........  ',
      '            ',
      '            ',
      '            '] },

    { name: 'Gran final', par: 5, ms: [1.3, -1.15], ma: [0, 2.1], wind: [-44, 0], tip: 'El hoyo grande: dos molinos, tubo, rampa sobre el lago, imanes y viento en contra. Suerte.', m: [
      '            ',
      '            ',
      '  ...  ...  ',
      '  .H.  .1.  ',
      '  ...  ...  ',
      '  .M.  ...  ',
      '  ........  ',
      '  ........  ',
      '  ~~~~~~~~  ',
      '  ~~~~~~~~  ',
      '  ........  ',
      '  ...RR...  ',
      '  ...RR...  ',
      '  ..^^^^..  ',
      '  .I....I.  ',
      '  ...M....  ',
      '  ........  ',
      '  .1..  .T  ',
      '            ',
      '            '] }
  ];

  /* ---------- construcción del hoyo ---------- */
  function build(n, dif) {
    var def = LV[Math.max(0, Math.min(LV.length - 1, (n | 0) - 1))];
    dif = dif == null ? 1 : dif;
    var H = { def: def, n: n, name: def.name, par: def.par, tip: def.tip || '',
      g: [], sand: {}, glue: {}, belts: {}, ramps: {}, tubes: {}, mag: [], bump: [], mills: [],
      wind: null, tee: null, hole: null, dif: dif };
    var tubePos = {}, y, x;
    for (y = 0; y < ROWS; y++) {
      H.g.push([]);
      for (x = 0; x < COLS; x++) {
        var row = def.m[y] || '', ch = row.charAt(x) || ' ', key = x + ',' + y, v = 1;
        if (ch === ' ') v = 0;
        else if (ch === '~') v = 2;
        else if (ch === 'a') H.sand[key] = 1;
        else if (ch === 'g') H.glue[key] = 1;
        else if (ch === '^') H.belts[key] = [0, -1];
        else if (ch === 'v') H.belts[key] = [0, 1];
        else if (ch === '<') H.belts[key] = [-1, 0];
        else if (ch === '>') H.belts[key] = [1, 0];
        else if (ch === 'R') H.ramps[key] = 1;
        else if (ch === 'o') H.bump.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, r: 13, p: 0 });
        else if (ch === 'I') H.mag.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, r: 82 });
        else if (ch === 'M') H.mills.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, L: MILL_L,
          a0: (def.ma && def.ma[H.mills.length]) || 0, sp: ((def.ms && def.ms[H.mills.length]) || 1.1) * (dif === 0 ? 0.8 : dif === 2 ? 1.2 : 1) });
        else if (ch >= '1' && ch <= '4') { if (!tubePos[ch]) tubePos[ch] = []; tubePos[ch].push([x, y]); }
        else if (ch === 'T') H.tee = [(x + 0.5) * T, (y + 0.5) * T];
        else if (ch === 'H') H.hole = [(x + 0.5) * T, (y + 0.5) * T];
        H.g[y].push(v);
      }
    }
    for (var d in tubePos) { var p = tubePos[d]; if (p.length === 2) {
      H.tubes[p[0][0] + ',' + p[0][1]] = { x: (p[1][0] + 0.5) * T, y: (p[1][1] + 0.5) * T, c: +d };
      H.tubes[p[1][0] + ',' + p[1][1]] = { x: (p[0][0] + 0.5) * T, y: (p[0][1] + 0.5) * T, c: +d }; } }
    var wf = dif === 0 ? 0.7 : dif === 2 ? 1.25 : 1;
    if (def.wind) H.wind = [def.wind[0] * wf, def.wind[1] * wf];
    H.magF = 780 * (dif === 0 ? 0.75 : dif === 2 ? 1.25 : 1);
    H.max = def.par + (dif === 0 ? 4 : dif === 2 ? 2 : 3);
    H.dist = bfs(H);
    return H;
  }

  var isG = function (H, x, y) { return y >= 0 && y < ROWS && x >= 0 && x < COLS && H.g[y][x] > 0; };
  var solid = function (H, x, y) { var tx = Math.floor(x / T), ty = Math.floor(y / T);
    return tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || !H.g[ty][tx]; };

  /* Coste al hoyo por casillas (Dijkstra con cubos): el agua cuesta 8 veces más que el césped, así
   * que la ruta seca manda, pero una zona que solo se alcanza saltando el agua sigue siendo alcanzable. */
  function cost(H, x, y) { var v = H.g[y][x]; if (!v) return 0; var kk = x + ',' + y;
    return v === 2 ? 8 : H.glue[kk] ? 3 : H.sand[kk] ? 2 : 1; }
  function bfs(H) {
    var D = [], y, x;
    for (y = 0; y < ROWS; y++) { D.push([]); for (x = 0; x < COLS; x++) D[y].push(-1); }
    var hx = Math.floor(H.hole[0] / T), hy = Math.floor(H.hole[1] / T);
    var buck = [], maxc = 0, N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var push = function (px, py, c) { if (!buck[c]) buck[c] = []; buck[c].push(px + py * COLS); if (c > maxc) maxc = c; };
    D[hy][hx] = 0; push(hx, hy, 0);
    for (var c = 0; c <= maxc; c++) { var q = buck[c]; if (!q) continue;
      for (var i = 0; i < q.length; i++) { var cx = q[i] % COLS, cy = (q[i] / COLS) | 0;
        if (D[cy][cx] !== c) continue;
        for (var j = 0; j < 4; j++) { var nx = cx + N[j][0], ny = cy + N[j][1];
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || !H.g[ny][nx]) continue;
          var nc = c + cost(H, nx, ny);
          if (D[ny][nx] < 0 || nc < D[ny][nx]) { D[ny][nx] = nc; push(nx, ny, nc); } }
        // los tubos acortan camino en los dos sentidos
        var tb = H.tubes[cx + ',' + cy];
        if (tb) { var tx2 = Math.floor(tb.x / T), ty2 = Math.floor(tb.y / T), nc2 = c + 1;
          if (D[ty2][tx2] < 0 || nc2 < D[ty2][tx2]) { D[ty2][tx2] = nc2; push(tx2, ty2, nc2); } } } }
    return D;
  }
  function distAt(H, x, y) {
    var r = H.dist[Math.floor(y / T)], v = r ? r[Math.floor(x / T)] : -1;
    if (v === undefined || v < 0) return 3000;
    return v * T + Math.hypot(x - H.hole[0], y - H.hole[1]) * 0.3;
  }

  function ev(b, s, v) { if (b.ev) b.ev.push([s, v]); }

  /* ---------- un subpaso de física. real: true bola en juego · false vista previa (para al primer rebote) ---------- */
  function step(H, b, h, tm, real) {
    var key = Math.floor(b.x / T) + ',' + Math.floor(b.y / T), air = b.air > 0;
    if (air) { b.air -= h; if (b.air <= 0) { b.air = 0; ev(b, 'land'); } }
    var fr = air ? 0.3 : H.glue[key] ? 6.2 : H.sand[key] ? 3.4 : 1.05;
    b.vx -= b.vx * fr * h; b.vy -= b.vy * fr * h;
    var sp = Math.hypot(b.vx, b.vy);
    if (sp > 0 && sp < 30) { var f = Math.max(0, sp - 28 * h) / sp; b.vx *= f; b.vy *= f; }
    if (H.wind) { b.vx += H.wind[0] * h; b.vy += H.wind[1] * h; }
    if (!air) {
      var bt = H.belts[key];
      if (bt) { b.vx += bt[0] * BELT * h; b.vy += bt[1] * BELT * h; }
      var i, m;
      for (i = 0; i < H.mag.length; i++) { m = H.mag[i];
        var dx = m.x - b.x, dy = m.y - b.y, d = Math.hypot(dx, dy);
        if (d < m.r && d > 1) { var g2 = H.magF * (1 - d / m.r) / d; b.vx += dx * g2 * h; b.vy += dy * g2 * h; } }
      if (H.ramps[key]) { var s2 = Math.hypot(b.vx, b.vy);
        if (s2 > 130) { var ns = Math.max(s2, 380); b.vx *= ns / s2; b.vy *= ns / s2; b.air = b.airT = 0.24 + ns / 1500; ev(b, 'ramp'); } }
    }
    if (b.tc > 0) b.tc -= h;
    b.x += b.vx * h;
    if (solid(H, b.x + (b.vx > 0 ? b.r : -b.r), b.y)) { b.x -= b.vx * h; b.vx *= -0.8; ev(b, 'bump', Math.abs(b.vx)); if (!real) return 'bounce'; }
    b.y += b.vy * h;
    if (solid(H, b.x, b.y + (b.vy > 0 ? b.r : -b.r))) { b.y -= b.vy * h; b.vy *= -0.8; ev(b, 'bump', Math.abs(b.vy)); if (!real) return 'bounce'; }
    var k2 = Math.floor(b.x / T) + ',' + Math.floor(b.y / T);
    if (!air) {
      var row = H.g[Math.floor(b.y / T)];
      if (row && row[Math.floor(b.x / T)] === 2) return 'water';
      var tb = H.tubes[k2];
      if (tb && !(b.tc > 0)) { b.x = tb.x; b.y = tb.y; b.tc = 0.34; ev(b, 'tube', tb.c); if (!real) return 'bounce'; }
    }
    var o, d2;
    for (var j = 0; j < H.bump.length; j++) { o = H.bump[j]; d2 = Math.hypot(b.x - o.x, b.y - o.y);
      if (d2 < o.r + b.r && d2 > 0) { var nx = (b.x - o.x) / d2, ny = (b.y - o.y) / d2, vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 2 * vn * nx * 1.05; b.vy -= 2 * vn * ny * 1.05; ev(b, 'pop', j); if (!real) return 'bounce'; }
        b.x = o.x + nx * (o.r + b.r); b.y = o.y + ny * (o.r + b.r); } }
    var mr = millStep(H, b, tm, real); if (mr) return mr;
    var dh = Math.hypot(b.x - H.hole[0], b.y - H.hole[1]), s3 = Math.hypot(b.vx, b.vy);
    if (dh < 19 && dh > 0.5 && s3 < 300) { b.vx += (H.hole[0] - b.x) / dh * 300 * h; b.vy += (H.hole[1] - b.y) / dh * 300 * h; }
    if (!air && dh < 10.5 && s3 < 190) return 'hole';
    /* la bola que llega lanzada bordea la copa y sale: hay que medir el golpe, no pegar fuerte */
    if (!air && dh < 13 && dh > 0.5 && s3 >= 190 && s3 < 560) {
      var lx = (b.x - H.hole[0]) / dh, ly = (b.y - H.hole[1]) / dh, lv = b.vx * lx + b.vy * ly;
      if (lv < 0) { b.vx -= 1.25 * lv * lx; b.vy -= 1.25 * lv * ly; b.vx *= 0.88; b.vy *= 0.88; ev(b, 'lip'); } }
    return null;
  }

  function millStep(H, b, tm, real) {
    for (var i = 0; i < H.mills.length; i++) { var m = H.mills[i], d0 = Math.hypot(b.x - m.x, b.y - m.y);
      if (d0 > m.L + b.r + 4) continue;
      var ang = m.a0 + m.sp * tm;
      if (d0 < 10 + b.r && d0 > 0.01) { var nx = (b.x - m.x) / d0, ny = (b.y - m.y) / d0, vn = b.vx * nx + b.vy * ny;
        b.x = m.x + nx * (10 + b.r); b.y = m.y + ny * (10 + b.r);
        if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; ev(b, 'mill', -vn); if (!real) return 'bounce'; }
        continue; }
      for (var j = 0; j < 4; j++) { var th = ang + j * Math.PI / 2, ux = Math.cos(th), uy = Math.sin(th),
          s = (b.x - m.x) * ux + (b.y - m.y) * uy;
        if (s < 0 || s > m.L) continue;
        var px = m.x + ux * s, py = m.y + uy * s, dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy);
        if (d >= b.r + 3 || d < 1e-6) continue;
        var n2x = dx / d, n2y = dy / d, vpx = -uy * m.sp * s, vpy = ux * m.sp * s,
          vn2 = (b.vx - vpx) * n2x + (b.vy - vpy) * n2y;
        b.x = px + n2x * (b.r + 3); b.y = py + n2y * (b.r + 3);
        if (vn2 < 0) { b.vx -= 1.7 * vn2 * n2x; b.vy -= 1.7 * vn2 * n2y; ev(b, 'mill', -vn2); if (!real) return 'bounce'; } } }
    return null;
  }

  /* ---------- simulación de un golpe completo (para el bot y para la CPU de ayuda) ---------- */
  function newBall(H, x, y) { return { x: x == null ? H.tee[0] : x, y: y == null ? H.tee[1] : y, vx: 0, vy: 0, r: BALL_R, air: 0, airT: 1, tc: 0 }; }
  function simShot(H, x, y, a, p, t0) {
    var b = newBall(H, x, y), h = 1 / 180, tm = t0 || 0;
    b.vx = Math.cos(a) * p * 900; b.vy = Math.sin(a) * p * 900;
    for (var i = 0; i < 1500; i++) { tm += h;
      var r = step(H, b, h, tm, true);
      if (r === 'hole') return { r: 'hole', t: tm, x: b.x, y: b.y, d: -1 };
      if (r === 'water') return { r: 'water', t: tm, x: b.x, y: b.y, d: distAt(H, x == null ? H.tee[0] : x, y == null ? H.tee[1] : y) + 240 };
      if (!(b.air > 0) && Math.hypot(b.vx, b.vy) < 5) break; }
    return { r: 'stop', t: tm, x: b.x, y: b.y, d: distAt(H, b.x, b.y) };
  }

  return { LV: LV, build: build, step: step, simShot: simShot, newBall: newBall, distAt: distAt,
    isG: isG, solid: solid, T: T, COLS: COLS, ROWS: ROWS, R: BALL_R, BELT: BELT };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = GOLFLV;   /* verificación desde Node */
