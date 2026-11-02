/* Niveles a mano de bloques-10x10 (plan Friv, vara de docs/VARA.md).
 *
 * Este fichero lleva DOS cosas:
 *   1) Las REGLAS PURAS del tablero (sin canvas ni Kit): piezas, colocación, borrado de filas
 *      y columnas, piedra, gemas, marcas, bombas, agujeros y rayo, objetivos y estrellas.
 *      rejilla.js las usa tal cual y solo dibuja y anima; scripts/check_blocklv.js las carga
 *      con require() y juega los 20 niveles con un bot (no pueden divergir).
 *   2) BLOCKLV.L — los 20 niveles escritos a mano.
 *
 * PLANTA — 10 filas de 10 caracteres:
 *   .  casilla vacía             #  AGUJERO (no existe: la fila se completa sin ella)
 *   x  bloque normal             1..8 bloque normal de ese color
 *   g  bloque con GEMA (se recoge al borrar su fila o su columna)
 *   s  PIEDRA (el primer borrado la agrieta y se queda; el segundo la rompe)
 *   b  BOMBA (cuenta las piezas que colocas; si llega a 0 se pierde. Se desactiva borrando
 *      su fila o su columna)      B  bomba de mecha larga (6 piezas más)
 *   +  casilla vacía con MARCA dorada (se cumple al poner un bloque encima)
 *
 * CAMPOS de cada nivel:
 *   n   nombre            i   lo que enseña (cartel de los primeros segundos)
 *   o   objetivos: [{t:'lines',n} {t:'score',n} {t:'gem',n?} {t:'stone'} {t:'mark'} {t:'bomb'}]
 *       (sin n = todos los del tablero)
 *   seed semilla de la bolsa (la misma en las tres dificultades: la ruta no cambia)
 *   pz  pesos de las familias de piezas [pequeñas, medianas, grandes]
 *   mv  piezas disponibles en normal (0 = sin límite)
 *   fz  mecha de las bombas en normal (piezas)
 *   gp  cada cuántas piezas viene una con gema dentro (0 = nunca)
 *   ray cada cuántas tandas la primera pieza es un RAYO (borra su fila y su columna enteras)
 *   ud  1 = hay botón Deshacer (desde la mitad de la tabla)
 *   mx  borrados múltiples (2+ líneas de una vez) que pide la maestría (3★); por defecto 1
 *   s2  piezas como máximo para 2★ [fácil, normal, difícil]
 *   s3  lo mismo para 3★, que además pide no deshacer y `mx` borrados múltiples
 *
 * DIFICULTAD (márgenes, nunca contenido): fácil da un 25 % más de piezas, 3 más de mecha y 3
 * deshacer; difícil un 10 % menos de piezas, 1 menos de mecha y 1 deshacer.
 */
/* <LV> ------------------------------------------------------------------------------------------
   Zona pura: nada de aquí toca el DOM. */
const BLOCKLV = (function () {
  const N = 10, NN = 100;
  /* tipos de casilla ocupada */
  const KN = 0, KG = 1, KS = 2, KC = 3, KB = 4;
  /* familias: [celdas, color, nivel] (0 pequeñas, 1 medianas, 2 grandes) */
  const SHAPES = [
    [[[0, 0]], 7, 0], [[[0, 0], [1, 0]], 3, 0], [[[0, 0], [1, 0], [2, 0]], 4, 0], [[[0, 0], [0, 1], [1, 1]], 2, 0],
    [[[0, 0], [1, 0], [0, 1], [1, 1]], 2, 1], [[[0, 0], [1, 0], [2, 0], [3, 0]], 4, 1], [[[0, 0], [0, 1], [0, 2], [1, 2]], 1, 1],
    [[[1, 0], [1, 1], [1, 2], [0, 2]], 5, 1], [[[0, 0], [1, 0], [2, 0], [1, 1]], 6, 1], [[[1, 0], [2, 0], [0, 1], [1, 1]], 3, 1], [[[0, 0], [1, 0], [1, 1], [2, 1]], 0, 1],
    [[[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], 0, 2], [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], 5, 2],
    [[[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], 1, 2], [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], 6, 2]
  ];
  const FAM = SHAPES.map(function (sh) {
    const seen = {}, rots = []; let s = sh[0];
    for (let r = 0; r < 4; r++) {
      let mx = 99, my = 99; for (const p of s) { mx = Math.min(mx, p[0]); my = Math.min(my, p[1]); }
      const n = s.map(function (p) { return [p[0] - mx, p[1] - my]; }).sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
      const key = n.join(';'); if (!seen[key]) { seen[key] = 1; rots.push(n); }
      s = s.map(function (p) { return [-p[1], p[0]]; });
    }
    return { rots: rots, ci: sh[1], tier: sh[2] };
  });
  const mkPiece = function (cells, ci) {
    let w = 0, h = 0; for (const p of cells) { w = Math.max(w, p[0] + 1); h = Math.max(h, p[1] + 1); }
    return { cells: cells, ci: ci, w: w, h: h, gem: -1, ray: false };
  };
  /* generador reproducible con estado explícito (se puede copiar para deshacer) */
  function rnd(S) {
    S.rs = (S.rs + 0x6D2B79F5) | 0; let t = S.rs;
    t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const DMV = [1.25, 1, 0.9], DFZ = [3, 0, -1], DUD = [3, 2, 1];

  function make(lv, dif) {
    dif = dif == null ? 1 : dif;
    const S = {
      lv: lv, dif: dif, c: new Int8Array(NN).fill(-1), k: new Int8Array(NN), h: new Uint8Array(NN), m: new Uint8Array(NN),
      fu: new Int8Array(NN), rs: (lv.seed | 0) * 7919 + 13, tray: [null, null, null], trayN: 0, drawn: 0,
      used: 0, mv: lv.mv ? Math.max(4, Math.round(lv.mv * DMV[dif])) : 0, fz: Math.max(3, (lv.fz || 10) + DFZ[dif]),
      undo: lv.ud ? DUD[dif] : 0, undid: 0, score: 0, lines: 0, streak: 0, since: 0, multi: 0,
      gems: 0, stones: 0, bombs: 0, marks: 0, won: false, lost: '', obj: [], bad: []
    };
    const g = lv.g;
    if (!g || g.length !== N) S.bad.push('la planta no tiene 10 filas');
    for (let y = 0; y < N; y++) {
      const row = (g && g[y]) || '';
      if (row.length !== N) S.bad.push('fila ' + y + ' mide ' + row.length);
      for (let x = 0; x < N; x++) {
        const ch = row.charAt(x) || '.', i = y * N + x;
        if (ch === '#') S.h[i] = 1;
        else if (ch === '+') S.m[i] = 1;
        else if (ch === 'x') S.c[i] = (x * 3 + y * 5 + (lv.seed | 0)) % 8;
        else if (ch >= '1' && ch <= '8') S.c[i] = ch.charCodeAt(0) - 49;
        else if (ch === 'g') { S.c[i] = 6; S.k[i] = KG; }
        else if (ch === 's') { S.c[i] = 8; S.k[i] = KS; }
        else if (ch === 'b' || ch === 'B') { S.c[i] = 0; S.k[i] = KB; S.fu[i] = S.fz + (ch === 'B' ? 6 : 0); }
        else if (ch !== '.') S.bad.push('carácter raro «' + ch + '» en ' + x + ',' + y);
      }
    }
    for (const o of lv.o) {
      let n = o.n;
      if (n == null) n = o.t === 'gem' ? count(S, KG) : o.t === 'stone' ? count(S, KS) : o.t === 'bomb' ? count(S, KB) : o.t === 'mark' ? countM(S) : 0;
      if (!n) S.bad.push('objetivo ' + o.t + ' sin nada que hacer');
      S.obj.push({ t: o.t, n: n, got: 0 });
    }
    newTray(S);
    return S;
  }
  function count(S, kind) { let n = 0; for (let i = 0; i < NN; i++) if (S.c[i] >= 0 && S.k[i] === kind) n++; return n; }
  function countM(S) { let n = 0; for (let i = 0; i < NN; i++) if (S.m[i] === 1) n++; return n; }
  function clone(S) {
    const o = Object.assign({}, S);
    o.c = S.c.slice(); o.k = S.k.slice(); o.h = S.h; o.m = S.m.slice(); o.fu = S.fu.slice();
    o.tray = S.tray.slice(); o.obj = S.obj.map(function (q) { return { t: q.t, n: q.n, got: q.got }; });
    return o;
  }

  /* ---------------- piezas ---------------- */
  function draw1(S) {
    const pz = S.lv.pz || [3, 2, 1];
    /* bolsa amable: con el tablero apretado salen menos piezas grandes (igual en las tres
       dificultades, así que no cambia la ruta) */
    let free = 0; for (let i = 0; i < NN; i++) if (!S.h[i] && S.c[i] < 0) free++;
    const tight = free < 34 ? [1, 0.55, 0.2] : free < 48 ? [1, 0.8, 0.5] : [1, 1, 1];
    let tot = 0; const wt = FAM.map(function (f) { const w = pz[f.tier] * tight[f.tier] / (f.tier === 0 ? 4 : f.tier === 1 ? 7 : 4); tot += w; return w; });
    let x = rnd(S) * tot, i = 0; while (i < FAM.length - 1 && x > wt[i]) x -= wt[i++];
    const f = FAM[i], p = mkPiece(f.rots[Math.floor(rnd(S) * f.rots.length)], f.ci);
    S.drawn++;
    if (S.lv.gp && S.drawn % S.lv.gp === 0) p.gem = Math.floor(rnd(S) * p.cells.length);
    return p;
  }
  const rayPiece = function () { const p = mkPiece([[0, 0]], 2); p.ray = true; return p; };
  function newTray(S) {
    S.trayN++;
    let set = null;
    const r0 = S.rs, d0 = S.drawn;
    for (let a = 0; a < 14; a++) {
      set = [draw1(S), draw1(S), draw1(S)];
      if (solvable(S, set)) break;
      if (a === 13) { S.rs = r0; S.drawn = d0; set = [draw1(S), draw1(S), draw1(S)]; } /* sin tanda justa: la primera */
    }
    if (S.lv.ray && S.trayN % S.lv.ray === 0) set[0] = rayPiece();
    S.tray = set;
  }
  function fitsC(c, h, pc, x, y) {
    if (x < 0 || y < 0 || x + pc.w > N || y + pc.h > N) return false;
    for (const p of pc.cells) { const i = (y + p[1]) * N + x + p[0]; if (h[i] || c[i] >= 0) return false; }
    return true;
  }
  const fits = function (S, pc, x, y) { return fitsC(S.c, S.h, pc, x, y); };
  function anyFit(S, pc, c) { c = c || S.c; for (let y = 0; y <= N - pc.h; y++) for (let x = 0; x <= N - pc.w; x++) if (fitsC(c, S.h, pc, x, y)) return true; return false; }
  /* filas y columnas llenas (las que tienen alguna casilla de verdad) */
  function fullLines(c, h) {
    const rows = [], cols = [];
    for (let j = 0; j < N; j++) {
      let r = true, rr = 0, q = true, qq = 0;
      for (let t = 0; t < N; t++) {
        const a = j * N + t, b = t * N + j;
        if (!h[a]) { rr++; if (c[a] < 0) r = false; }
        if (!h[b]) { qq++; if (c[b] < 0) q = false; }
      }
      if (r && rr) rows.push(j); if (q && qq) cols.push(j);
    }
    return [rows, cols];
  }
  /* colocación rápida para comprobar que una tanda cabe entera (voraz: borrar y pegarse) */
  function greedy(S, c, k, pc) {
    let bs = -1, bx = -1, by = -1;
    for (let y = 0; y <= N - pc.h; y++) for (let x = 0; x <= N - pc.w; x++) {
      if (!fitsC(c, S.h, pc, x, y)) continue;
      const t = c.slice(); for (const p of pc.cells) t[(y + p[1]) * N + x + p[0]] = 1;
      const fl = fullLines(t, S.h); let s = (fl[0].length + fl[1].length) * 20;
      for (const p of pc.cells) for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + p[0] + d[0], Y = y + p[1] + d[1]; if (X < 0 || Y < 0 || X >= N || Y >= N || S.h[Y * N + X] || t[Y * N + X] >= 0) s++; }
      if (s > bs) { bs = s; bx = x; by = y; }
    }
    if (bx < 0) return null;
    const out = c.slice(), ko = k.slice(); for (const p of pc.cells) out[(by + p[1]) * N + bx + p[0]] = 1;
    clearC(S, out, ko, fullLines(out, S.h));
    return [out, ko];
  }
  function clearC(S, c, k, fl) {
    const hit = new Uint8Array(NN);
    for (const y of fl[0]) for (let x = 0; x < N; x++) hit[y * N + x] = 1;
    for (const x of fl[1]) for (let y = 0; y < N; y++) hit[y * N + x] = 1;
    for (let i = 0; i < NN; i++) if (hit[i] && c[i] >= 0 && !S.h[i]) { if (k[i] === KS) k[i] = KC; else { c[i] = -1; k[i] = KN; } }
  }
  function solvable(S, set) {
    const P = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    for (const o of P) { let st = [S.c, S.k]; for (const i of o) { st = greedy(S, st[0], st[1], set[i]); if (!st) break; } if (st) return true; }
    return false;
  }

  /* ---------------- jugada ----------------
     Devuelve el evento para animar, o null si no cabe. */
  function place(S, i, x, y) {
    const pc = S.tray[i]; if (!pc || S.won || S.lost || !fits(S, pc, x, y)) return null;
    const ev = { piece: pc, x: x, y: y, cells: [], cleared: [], rows: [], cols: [], n: 0, pts: 0, gems: 0, cracks: 0, broke: 0, defused: 0, marks: 0, boom: -1, ray: pc.ray, clean: false, streak: 0 };
    for (let q = 0; q < pc.cells.length; q++) {
      const p = pc.cells[q], j = (y + p[1]) * N + x + p[0];
      S.c[j] = pc.ray ? 2 : pc.ci; S.k[j] = q === pc.gem ? KG : KN; ev.cells.push(j);
      if (S.m[j] === 1) { S.m[j] = 2; ev.marks++; }
    }
    S.tray[i] = null; S.used++; S.score += pc.cells.length;
    let fl = fullLines(S.c, S.h);
    if (pc.ray) {
      if (fl[0].indexOf(y) < 0) fl[0].push(y);
      if (fl[1].indexOf(x) < 0) fl[1].push(x);
    }
    ev.rows = fl[0]; ev.cols = fl[1]; ev.n = fl[0].length + fl[1].length;
    if (ev.n) {
      const hit = new Uint8Array(NN);
      for (const yy of fl[0]) for (let xx = 0; xx < N; xx++) hit[yy * N + xx] = 1;
      for (const xx of fl[1]) for (let yy = 0; yy < N; yy++) hit[yy * N + xx] = 1;
      for (let j = 0; j < NN; j++) {
        if (!hit[j] || S.h[j] || S.c[j] < 0) continue;
        const kd = S.k[j];
        ev.cleared.push({ i: j, c: S.c[j], k: kd });
        if (kd === KS) { S.k[j] = KC; ev.cracks++; continue; }
        if (kd === KC) ev.broke++;
        else if (kd === KG) ev.gems++;
        else if (kd === KB) ev.defused++;
        S.c[j] = -1; S.k[j] = KN; S.fu[j] = 0;
      }
      S.streak = S.since <= 2 && S.used > 1 && S.streak >= 0 ? S.streak + 1 : 1; S.since = 0;
      S.lines += ev.n; if (ev.n >= 2) S.multi++;
      ev.pts = Math.round(10 * ev.n * (ev.n + 1) / 2 * (1 + (S.streak - 1) * 0.5));
      let empty = true; for (let j = 0; j < NN; j++) if (!S.h[j] && S.c[j] >= 0) { empty = false; break; }
      if (empty) { ev.clean = true; ev.pts += 300; }
    } else { S.since++; if (S.since >= 3) S.streak = 0; }
    ev.streak = S.streak;
    ev.pts += ev.gems * 50 + ev.cracks * 20 + ev.broke * 40 + ev.defused * 100 + ev.marks * 15;
    S.score += ev.pts;
    S.gems += ev.gems; S.stones += ev.broke; S.bombs += ev.defused; S.marks += ev.marks;
    /* las bombas que siguen vivas queman una pieza de mecha */
    for (let j = 0; j < NN; j++) if (S.c[j] >= 0 && S.k[j] === KB) { S.fu[j]--; if (S.fu[j] <= 0 && ev.boom < 0) ev.boom = j; }
    for (const o of S.obj) {
      const v = o.t === 'lines' ? S.lines : o.t === 'score' ? S.score : o.t === 'gem' ? S.gems : o.t === 'stone' ? S.stones : o.t === 'bomb' ? S.bombs : o.t === 'mark' ? S.marks : 0;
      o.got = Math.min(o.n, v);
    }
    if (S.obj.every(function (o) { return o.got >= o.n; })) { S.won = true; ev.boom = -1; return ev; }
    if (ev.boom >= 0) { S.lost = 'bomb'; return ev; }
    if (S.sim) return ev;   /* el bot del verificador mira jugadas sin rellenar la bandeja */
    if (S.tray.every(function (p) { return !p; })) newTray(S);
    if (S.mv && S.used >= S.mv) { S.lost = 'mv'; return ev; }
    if (!S.tray.some(function (p) { return p && anyFit(S, p); })) S.lost = 'fit';
    return ev;
  }
  /* estrellas: 1 terminar · 2 piezas ≤ s2 · 3 piezas ≤ s3 + sin deshacer + borrados múltiples */
  function stars(S) {
    if (!S.won) return 0;
    const lv = S.lv, d = S.dif;
    const in3 = lv.s3 && S.used <= lv.s3[d], mast = !S.undid && S.multi >= (lv.mx == null ? 1 : lv.mx);
    return in3 && mast ? 3 : lv.s2 && S.used <= lv.s2[d] ? 2 : 1;
  }
  function left(S) { return S.obj.filter(function (o) { return o.got < o.n; }).map(function (o) { return { t: o.t, n: o.n - o.got }; }); }

  /* ================================================================ LOS 20 NIVELES */
  const L = [
    /* ---- 1-2: lo básico ---- */
    { n: 'Primeras líneas', i: 'Arrastra las piezas al tablero. Llena una fila o una columna entera y se borra.', o: [{ t: 'lines', n: 6 }], seed: 101, pz: [4, 3, 0], mv: 0, mx: 0, s2: [22, 21, 20], s3: [20, 18, 18], g: [
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      'x.........',
      'xxxxxx.xxx',
      'xxxx.xxxxx',
      'xxxxxxxx..'] },
    { n: 'Doble golpe', i: 'Si una pieza llena dos líneas a la vez valen mucho más. Hacer al menos un doble es parte de las tres estrellas.', o: [{ t: 'lines', n: 9 }], seed: 202, pz: [3, 3, 0], mv: 0, s2: [28, 27, 26], s3: [26, 24, 23], g: [
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      'xxxxxxxx..',
      'xxxxxxxx..',
      '..........',
      'xx..xxxxxx',
      'xx..xxxxxx'] },
    /* ---- 3: GEMAS ---- */
    { n: 'Gemas', i: 'NUEVO: gemas metidas en los bloques. Borra su fila o su columna para soltarlas.', o: [{ t: 'gem' }], seed: 303, pz: [4, 3, 0], mv: 0, s2: [23, 19, 17], s3: [13, 13, 12], g: [
      'g.........',
      '..........',
      '.........g',
      '.........x',
      '..........',
      'xxxgxxx...',
      '..........',
      'x.........',
      'xxxxxgx..x',
      'gxxxxxxxg.'] },
    /* ---- 4: PIEZAS CONTADAS (presión) ---- */
    { n: 'Piezas contadas', i: 'NUEVO: las piezas están contadas. Mira el contador: si se acaban antes del objetivo, se pierde.', o: [{ t: 'lines', n: 9 }], seed: 404, pz: [3, 3, 1], mv: 42, s2: [29, 28, 27], s3: [26, 23, 23], g: [
      '..........',
      '..........',
      '..........',
      '..........',
      'x........x',
      'xx......xx',
      'xxx....xxx',
      'xxxx..xxxx',
      'xxxx..xxxx',
      'xxxxx.xxxx'] },
    /* ---- 5: PIEDRA ---- */
    { n: 'Piedra', i: 'NUEVO: la piedra aguanta dos borrados. El primero la agrieta y se queda; el segundo la rompe. Fila y columna a la vez la rompen de golpe.', o: [{ t: 'stone' }], seed: 505, pz: [4, 3, 0], mv: 0, s2: [34, 26, 24], s3: [24, 23, 23], g: [
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      '.........x',
      '.........x',
      'xxsxxxx..x',
      'xxxxxxxs.x',
      'sxxx....x.'] },
    /* ---- 6: piezas con gema + contadas ---- */
    { n: 'Lluvia de gemas', i: 'NUEVO: algunas piezas traen una gema dentro. Ponla donde puedas borrar su línea pronto.', o: [{ t: 'gem', n: 6 }], seed: 606, pz: [3, 3, 1], mv: 36, gp: 4, s2: [31, 28, 27], s3: [28, 26, 26], g: [
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      'xx......xx',
      'xxx....xxx',
      'xxxx..xxxx',
      'xxxx..xxxx'] },
    /* ---- 7: MARCAS ---- */
    { n: 'Marcas doradas', i: 'NUEVO: las casillas con marca dorada se cumplen al poner un bloque encima. Cúbrelas todas y borra 6 líneas.', o: [{ t: 'mark' }, { t: 'lines', n: 6 }], seed: 707, pz: [3, 3, 1], mv: 0, s2: [31, 28, 28], s3: [30, 27, 27], g: [
      '+........+',
      '.+......+.',
      '..........',
      '..........',
      '....++....',
      '....++....',
      '..........',
      '..........',
      '.+......+.',
      '+........+'] },
    /* ---- 8: marcas + piedra, contadas ---- */
    { n: 'Marcas en la cantera', i: 'Marcas y piedra a la vez, con las piezas contadas. Cada piedra está en una fila con bloques: termínala dos veces.', o: [{ t: 'mark' }, { t: 'stone' }], seed: 808, pz: [4, 3, 0], mv: 44, s2: [41, 31, 29], s3: [31, 27, 26], g: [
      '+........+',
      '..........',
      '..........',
      '...sxxx...',
      '..........',
      '..........',
      '...xxxs...',
      '..........',
      '..........',
      '+...++...+'] },
    /* ---- 9: BOMBA (presión) ---- */
    { n: 'La bomba', i: 'NUEVO: la bomba cuenta las piezas que colocas. Borra su fila o su columna antes de que llegue a cero.', o: [{ t: 'bomb' }, { t: 'lines', n: 6 }], seed: 909, pz: [4, 3, 0], mv: 0, fz: 11, mx: 0, s2: [29, 28, 27], s3: [24, 23, 22], g: [
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      'xxxb......',
      '..........',
      '..........',
      '......Bxxx'] },
    /* ---- 10: bombas + piedra; aparece Deshacer ---- */
    { n: 'Mecha en la piedra', i: 'Desde aquí tienes botón Deshacer (no vale para las 3★). Dos bombas y piedra: la piedra no deja cerrar la línea a la primera.', o: [{ t: 'bomb' }, { t: 'stone' }], seed: 1010, pz: [3, 3, 1], mv: 0, fz: 12, ud: 1, s2: [37, 34, 31], s3: [30, 30, 30], g: [
      '..........',
      '..........',
      '..s.......',
      '..x.......',
      '..x....B..',
      '..b.......',
      '..........',
      '.......s..',
      '..........',
      'xxxs..sxxx'] },
    /* ---- 11: AGUJEROS ---- */
    { n: 'Agujeros', i: 'NUEVO: las casillas negras no existen. Una fila está completa cuando se llenan las que sí hay.', o: [{ t: 'lines', n: 11 }], seed: 1111, pz: [4, 3, 1], mv: 0, ud: 1, s2: [32, 31, 29], s3: [28, 27, 27], g: [
      '##......##',
      '#........#',
      '..........',
      '....##....',
      '...####...',
      '...####...',
      '....##....',
      '..........',
      '#........#',
      '##......##'] },
    /* ---- 12: agujeros + gemas, contadas ---- */
    { n: 'Islas de gemas', i: 'Gemas en islas rodeadas de agujeros. Las filas cortas se llenan antes: aprovéchalas.', o: [{ t: 'gem' }, { t: 'lines', n: 8 }], seed: 1212, pz: [4, 3, 1], mv: 34, ud: 1, s2: [23, 22, 21], s3: [17, 17, 17], g: [
      'g........g',
      '..........',
      '..........',
      '###....###',
      '###.gg.###',
      '###....###',
      '..........',
      '.x......x.',
      'xg......gx',
      'xx......xx'] },
    /* ---- 13: RAYO ---- */
    { n: 'El rayo', i: 'NUEVO: la pieza del rayo borra su fila y su columna enteras al momento, estén llenas o no. Úsala contra la piedra.', o: [{ t: 'stone' }], seed: 1313, pz: [3, 3, 1], mv: 0, ray: 2, ud: 1, s2: [22, 22, 20], s3: [20, 17, 17], g: [
      '..........',
      '.s......s.',
      '..........',
      '..........',
      '....ss....',
      '..........',
      '..........',
      '..........',
      '.s......s.',
      '..........'] },
    /* ---- 14: rayo contra bombas, contadas ---- */
    { n: 'Rayos y mechas', i: 'Tres bombas lejos unas de otras y diez líneas que borrar. Guarda el rayo para la que vaya peor de mecha.', o: [{ t: 'bomb' }, { t: 'lines', n: 10 }], seed: 1414, pz: [3, 3, 1], mv: 44, fz: 12, ray: 3, ud: 1, s2: [32, 28, 25], s3: [25, 25, 24], g: [
      'b.........',
      '..........',
      '..........',
      '..........',
      '.....B....',
      '..........',
      '..........',
      '..........',
      '..........',
      '.........B'] },
    /* ---- 15: agujeros + marcas, contadas ---- */
    { n: 'Laberinto dorado', i: 'Marcas metidas en un laberinto de agujeros, con las piezas justas. Piensa en qué forma cabe en cada pasillo.', o: [{ t: 'mark' }, { t: 'lines', n: 8 }], seed: 1515, pz: [4, 3, 0], mv: 43, ud: 1, s2: [33, 31, 30], s3: [30, 27, 27], g: [
      '+...#....+',
      '....#.....',
      '....#.....',
      '..........',
      '###....###',
      '..+....+..',
      '..........',
      '.....#....',
      '.....#....',
      '+....#...+'] },
    /* ---- 16: la mina: gemas en piedra + bomba ---- */
    { n: 'La mina', i: 'Las gemas están encerradas en piedra y una bomba vigila la galería. Primero la mecha, después el tesoro.', o: [{ t: 'gem' }, { t: 'bomb' }], seed: 1616, pz: [3, 3, 1], mv: 0, fz: 17, ud: 1, s2: [31, 23, 22], s3: [24, 22, 21], g: [
      '..........',
      '..........',
      '.g......g.',
      '..........',
      '..........',
      '...sgs....',
      '..........',
      'Bxxx......',
      'xxsg..gsxx',
      'xxxx..xxxx'] },
    /* ---- 17: cadena de bombas + piezas con gema ---- */
    { n: 'Reacción en cadena', i: 'Tres bombas con mechas distintas y gemas que llegan en las piezas. Desactiva por orden de urgencia.', o: [{ t: 'bomb' }, { t: 'gem', n: 3 }], seed: 1717, pz: [3, 3, 1], mv: 52, fz: 16, gp: 4, ud: 1, s2: [21, 20, 20], s3: [20, 20, 20], g: [
      '..........',
      '.B..xx....',
      '..........',
      '..........',
      'xx....b...',
      '..........',
      '..........',
      '..........',
      '....xx..B.',
      '..........'] },
    /* ---- 18: el cruce: agujeros en cruz + rayo + marcas + piedra ---- */
    { n: 'El cruce', i: 'Un tablero partido en cuatro con marcas en los rincones y piedra cerca del centro. El rayo atraviesa los agujeros. Además, 8 líneas.', o: [{ t: 'mark' }, { t: 'stone' }, { t: 'lines', n: 8 }], seed: 1818, pz: [4, 3, 1], mv: 38, ray: 3, ud: 1, mx: 2, s2: [20, 19, 19], s3: [18, 16, 16], g: [
      '+...##...+',
      '....##....',
      '..........',
      '...s......',
      '##......##',
      '##......##',
      '......s...',
      '..........',
      '....##....',
      '+...##...+'] },
    /* ---- 19: todo a la vez ---- */
    { n: 'Todo a la vez', i: 'Gemas, piedra, marcas y una bomba, con las piezas contadas. Ordena: mecha, gemas, piedra y marcas.', o: [{ t: 'gem' }, { t: 'stone' }, { t: 'mark' }, { t: 'bomb' }], seed: 1919, pz: [3, 3, 1], mv: 46, fz: 17, ud: 1, s2: [34, 31, 28], s3: [33, 30, 27], g: [
      '..........',
      '..........',
      '..g....s..',
      '..........',
      'xx..B.....',
      '..........',
      '..s....g..',
      '..........',
      '..........',
      '+xxxx.xxx+'] },
    /* ---- 20: FINAL ---- */
    { n: 'El Gran Prisma', i: 'El final. El prisma roto guarda sus gemas tras piedra y bombas, con las piezas justas y el rayo de tu parte.', o: [{ t: 'gem' }, { t: 'stone' }, { t: 'bomb' }], seed: 2020, pz: [4, 3, 0], mv: 54, fz: 15, ray: 3, ud: 1, s2: [29, 27, 26], s3: [26, 25, 24], g: [
      '###....###',
      '##......##',
      '#...gg...#',
      '...s..s...',
      '..b....B..',
      '..........',
      '...s..s...',
      '#...gg...#',
      '##......##',
      '###....###'] }
  ];

  return { N: N, KN: KN, KG: KG, KS: KS, KC: KC, KB: KB, FAM: FAM, L: { 'bloques-10x10': L },
    make: make, clone: clone, fits: fits, anyFit: anyFit, place: place, stars: stars, left: left, fullLines: fullLines, rnd: rnd };
})();
/* </LV> */
if (typeof module !== 'undefined' && module.exports) module.exports = BLOCKLV;
