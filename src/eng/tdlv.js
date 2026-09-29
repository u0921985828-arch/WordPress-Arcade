/* Campaña de «tower-guard»: 20 mapas escritos a mano (plan Friv / docs/VARA.md).
 * Solo la usa tower-guard; maze-defense y hex-defense siguen con su mapa al azar de siempre.
 *
 * MAPA: 8 filas de 12 caracteres, siempre con la entrada en el borde IZQUIERDO y la meta en el
 * DERECHO. En horizontal se coloca tal cual (desplazado una columna); en vertical se TRASPONE
 * (x,y)→(y,x), así la entrada queda arriba y la meta abajo y el mismo dibujo sirve en las dos
 * orientaciones. Lo que sobra del tablero se marca como roca para que el mapa sea el diseñado.
 *   A  entrada · C  segunda entrada · B  meta
 *   =  camino · .  hierba (se puede construir) · #  roca (no)
 *   ~  camino de viento: por ahí corren un 60 % más
 *   n  camino en niebla: las torres NO pueden apuntar a lo que pasa por ahí
 *   o  atalaya: una torre construida ahí alcanza un 25 % más lejos
 *
 * OLEADAS: cada cadena es una oleada; grupos separados por coma, «<cantidad><tipo>»:
 *   n normal · f rápido · a acorazado · y volador (va en línea recta, se salta el camino)
 *   h sanador (cura a los de alrededor) · s cascarón (al morir se parte en dos)
 *   w talismán (inmune al hielo) · B jefe · K el Coloso (jefe final de 3 fases)
 * La vida de la oleada i es h0 + hs*i (escrita a mano, no una curva automática).
 *
 * ESTRELLAS: 1★ aguantar las oleadas · 2★ terminar con s2 vidas o más · 3★ con s3 o más
 * (s3 suele ser «sin una sola fuga»). La dificultad mueve oro y vida de los enemigos, no el mapa.
 *
 * El bloque <SIM> es puro (sin DOM): reproduce torres, enemigos y economía para que
 * scripts/td_bot.js compruebe en Node que cada mapa se supera con una defensa razonable.
 */
const TDLV = {
  'tower-guard': [
    { n: 'El Sendero', i: 'Toca la hierba y construye. Las flechas paran a los primeros bichos.', tip: 'Junta dos ballestas en el mismo recodo antes de repartirlas por el mapa.',
      m: ['............', '............', '............', 'A==========B', '............', '............', '............', '............'],
      gold: 190, lives: 20, spd: 0.62, h0: 20, hs: 9, s2: 18, s3: 20,
      w: ['5n', '7n', '8n', '9n', '10n'] },
    { n: 'La Ele', i: 'NUEVO: mejorar. Una torre de nivel 2 vale más que dos torres sueltas.', tip: 'El codo del camino es oro: desde ahí una torre cubre los dos tramos.',
      m: ['............', '............', 'A=====......', '.....=......', '.....======B', '............', '............', '............'],
      gold: 200, lives: 20, spd: 0.64, h0: 24, hs: 11, s2: 18, s3: 20,
      w: ['6n', '8n', '10n', '6n,3f', '12n'] },
    { n: 'Serpiente', i: 'Camino largo: aquí el hielo rinde, porque los bichos pasan dos veces cerca.', tip: 'Pon el hielo al principio y las ballestas después: llegan lentos al tramo de fuego.',
      m: ['A=========..', '.........=..', '.........=..', '..========..', '..=.........', '..=.........', '..=========B', '............'],
      gold: 210, lives: 20, spd: 0.66, h0: 28, hs: 13, s2: 18, s3: 20,
      w: ['8n', '10n', '6n,4f', '12n', '8n,4a', '14n'] },
    { n: 'Cantera', i: 'NUEVO: rocas. Hay menos sitio donde construir, así que elige bien.', tip: 'Con poco sitio, mejora en vez de repartir: el alcance sube con el nivel.',
      m: ['..#.....#...', 'A======#....', '......=.#...', '..#...=.....', '..#...=====.', '..........=.', '..#.......=B', '....#.......'],
      gold: 215, lives: 20, spd: 0.68, h0: 32, hs: 15, s2: 18, s3: 20,
      w: ['9n', '11n', '7n,4f', '9n,4a', '13n', '8n,6f'] },
    { n: 'Atalayas', i: 'NUEVO: la atalaya (la loma clara). La torre que se sube a ella alcanza más.', tip: 'Una ballesta en la atalaya cubre medio mapa: mejórala hasta el 3.',
      m: ['............', '..o......o..', 'A=========..', '.........=..', '..o......=..', '..========..', '..=........o', '..=========B'],
      gold: 220, lives: 20, spd: 0.7, h0: 36, hs: 17, s2: 18, s3: 20,
      w: ['10n', '8n,4f', '12n', '9n,5a', '14n', '10n,6f', '12n,4a'] },
    { n: 'Cuesta del Viento', i: 'NUEVO: el tramo de viento. Ahí corren mucho más: no cuentes con pillarlos.', tip: 'No pongas nada mirando al viento: coloca las torres justo ANTES y justo DESPUÉS.',
      m: ['............', 'A=====~~~==.', '..........=.', '..=========.', '..=.........', '..==~~~====.', '..........=.', '..........=B'],
      gold: 230, lives: 20, spd: 0.7, h0: 40, hs: 19, s2: 17, s3: 20,
      w: ['10n', '12n', '8n,5f', '14n', '10n,5a', '12n,6f', '10n,6a'] },
    { n: 'Bosque de Niebla', i: 'NUEVO: la niebla. Dentro no se ve nada y las torres no pueden apuntar.', tip: 'La niebla es un regalo para el enemigo: concentra el fuego en la salida del banco de niebla.',
      m: ['....#.......', 'A=======....', '.......=....', '.......=....', '..nnnnn=....', '..=.........', '..=========.', '..........=B'],
      gold: 240, lives: 20, spd: 0.7, h0: 44, hs: 21, s2: 17, s3: 20,
      w: ['11n', '13n', '9n,5f', '15n', '11n,6a', '13n,6f', '12n,6a'] },
    { n: 'Doble Puerta', i: 'NUEVO: dos entradas. Los bichos llegan por arriba y por abajo a la vez.', tip: 'No dobles la defensa: fortifica el tramo común, donde se juntan las dos rutas.',
      m: ['............', 'A========...', '........=...', '........===B', '........=...', 'C========...', '............', '............'],
      gold: 250, lives: 20, spd: 0.7, h0: 46, hs: 22, s2: 17, s3: 20,
      w: ['12n', '14n', '10n,6f', '16n', '12n,6a', '14n,8f', '12n,8a'] },
    { n: 'Los Voladores', i: 'NUEVO: voladores. Cruzan el mapa en línea recta y se saltan todo el camino.', tip: 'Deja una torre en el centro del mapa: los voladores pasan por encima, no por la carretera.',
      m: ['............', '..#......#..', 'A=====......', '.....=......', '.....=====..', '.........=..', '..#......=..', '.........==B'],
      gold: 255, lives: 20, spd: 0.7, h0: 48, hs: 23, s2: 17, s3: 20,
      w: ['12n', '10n,5y', '14n', '8y', '12n,7a', '10n,8y', '14n,8f'] },
    { n: 'Jefe de la Cantera', i: 'El primer jefe. Aguanta ocho oleadas y prepárale una emboscada.', tip: 'Guarda oro para la última: un cañón de nivel 3 le quita la mitad de un golpe.',
      m: ['..#.....#...', 'A==========.', '..........=.', '..#.......=.', '..=========.', '..=.........', '..=========B', '....#...#...'],
      gold: 260, lives: 20, spd: 0.7, h0: 50, hs: 24, s2: 17, s3: 20,
      w: ['12n', '14n', '10n,6f', '16n', '12n,7a', '14n,8f', '10n,6a,4y', '1B,10n'] },
    { n: 'El Sanador', i: 'NUEVO: el sanador. Cura a los que lleva al lado: hay que matarlo a él primero.', tip: 'Los rayos encadenan: son la respuesta a un grupo con sanador dentro.',
      m: ['A==========.', '..........=.', '..=========.', '..=.........', '..=========.', '..........=.', '..........=B', '............'],
      gold: 265, lives: 20, spd: 0.72, h0: 52, hs: 25, s2: 16, s3: 20,
      w: ['13n', '11n,2h', '15n', '12n,3h', '13n,7a', '10n,3h,6f', '14n,8a', '12n,4h,6y'] },
    { n: 'Cascarones', i: 'NUEVO: los cascarones. Al romperse salen dos crías: no te fíes de la cuenta.', tip: 'El cañón salpica: un solo disparo bien puesto revienta al cascarón y a sus crías.',
      m: ['............', 'A=====......', '.....=......', '.....======.', '..........=.', '..=========.', '..=.........', '..=========B'],
      gold: 270, lives: 20, spd: 0.72, h0: 54, hs: 26, s2: 16, s3: 20,
      w: ['13n', '10n,4s', '16n', '12n,6s', '14n,8a', '10n,6s,6f', '12n,6s,4y', '16n,8a'] },
    { n: 'Talismán', i: 'NUEVO: los del talismán. El hielo no les hace nada: hay que frenarlos a golpes.', tip: 'Contra el talismán manda el daño puro: ballestas mejoradas en la atalaya.',
      m: ['...o....o...', 'A=========..', '.........=..', '..o......=..', '..========..', '..=.o....o..', '..=========.', '..........=B'],
      gold: 275, lives: 20, spd: 0.72, h0: 56, hs: 27, s2: 16, s3: 20,
      w: ['14n', '10n,5w', '16n', '12n,6w', '14n,8a', '10n,6w,6f', '12n,4h,6w', '18n,8a'] },
    { n: 'Caracol', i: 'El camino más largo del mapa: aquí una torre bien puesta dispara cuatro veces.', tip: 'Busca las casillas por donde el camino pasa dos veces: valen por dos torres.',
      m: ['A=========..', '.........=..', '..========..', '..=.........', '..========..', '.........=..', '..========..', '..=========B'],
      gold: 275, lives: 20, spd: 0.74, h0: 60, hs: 29, s2: 16, s3: 20,
      w: ['14n', '16n', '12n,6f', '18n', '14n,8a', '12n,4h,6s', '16n,8w', '14n,6a,6y', '20n,8f'] },
    { n: 'Niebla Doble', i: 'Niebla en las DOS entradas. Media ruta es ciega: el final tiene que doler.', tip: 'Todo el presupuesto al tramo final: es el único sitio donde se ve al enemigo.',
      m: ['............', 'A======nnn=.', '..........=.', '..........=B', '..........=.', 'C======nnn=.', '............', '............'],
      gold: 485, lives: 20, spd: 0.74, h0: 62, hs: 22, s2: 16, s3: 20,
      w: ['15n', '17n', '12n,7f', '19n', '15n,8a', '12n,4h,7f', '16n,8w', '14n,6s,6y', '20n,10a'] },
    { n: 'Viento y Atalaya', i: 'Dos tramos de viento y tres atalayas: las torres altas son las únicas que llegan.', tip: 'Sube a la atalaya un rayo: encadena a todo el grupo mientras cruza el viento.',
      m: ['...o.....o..', 'A===~~~===..', '.........=..', '..o......=..', '..===~~~==..', '..=.........', '..=========.', '..o.......=B'],
      gold: 310, lives: 20, spd: 0.74, h0: 64, hs: 31, s2: 15, s3: 20,
      w: ['16n', '18n', '13n,7f', '20n', '16n,9a', '13n,4h,7s', '17n,9w', '15n,7a,7y', '22n,10f'] },
    { n: 'Enjambre', i: 'Camino corto y oleadas enormes: aquí manda la cadencia, no el daño.', tip: 'Muchas ballestas baratas de nivel 2 matan más enjambre que un cañón de nivel 3.',
      m: ['............', '..#......#..', 'A=========..', '.........=..', '.........=..', '.........==B', '..#......#..', '............'],
      gold: 500, lives: 20, spd: 0.76, h0: 62, hs: 30, s2: 15, s3: 20,
      w: ['18n', '22n', '16n,10f', '26n', '20n,10a', '16n,6h,10f', '22n,10w', '18n,10s,8y', '28n,12f'] },
    { n: 'Fortaleza', i: 'Poco oro y casi nada de hierba: cada moneda tiene que salir cara.', tip: 'Vende lo que ya no llega: el 60 % vuelve a tu bolsa y sirve para mejorar lo bueno.',
      m: ['##..#...#.##', 'A=========..', '#........=.#', '#.#......=.#', '..========..', '..=......#..', '..=========B', '##..#...#.##'],
      gold: 410, lives: 20, spd: 0.76, h0: 66, hs: 32, s2: 15, s3: 20,
      w: ['16n', '19n', '14n,8f', '21n', '17n,9a', '14n,5h,8s', '18n,9w', '16n,8a,8y', '24n,12f'] },
    { n: 'Asedio', i: 'Dos puertas, viento, niebla y atalaya. Todo lo aprendido, a la vez.', tip: 'Las dos rutas se juntan al final: haz de ese cruce una picadora.',
      m: ['A=======....', '.......=....', '..~~~~~=....', '..=.o...o...', '..====nn===B', '..~~~~~~~=..', '.........=..', 'C=========..'],
      gold: 530, lives: 20, spd: 0.76, h0: 70, hs: 34, s2: 15, s3: 20,
      w: ['16n', '18n', '14n,6f', '20n', '16n,9a', '14n,5h,7s', '17n,9w', '15n,8a,6y', '1B,14n', '20n,10f'] },
    { n: 'El Coloso del Prisma', i: 'LA FINAL: diez oleadas y el Coloso, que a media vida llama a los suyos y se acelera.', tip: 'Guarda 300 de oro para la última oleada: el Coloso se come una defensa justa.',
      m: ['A=====......', '.....=......', '.....======.', '..o....o..=.', '..=========.', '..=.........', '..=========.', '..........=B'],
      gold: 360, lives: 20, spd: 0.76, h0: 72, hs: 31, s2: 15, s3: 20,
      w: ['18n', '21n', '16n,9f', '23n', '18n,10a', '16n,6h,9s', '20n,10w', '18n,10a,9y', '1B,18n,8f', '1K,14n,8a'] },
  ],
};

/* <SIM> --------------------------------------------------------------------------------
 * Zona pura (sin DOM): mismas torres, mismos enemigos y misma economía que el motor.
 * La usa scripts/td_bot.js para comprobar que los 20 mapas se superan con una defensa
 * razonable (no óptima) en las 3 dificultades. Si se toca el balance de td.js, tocar aquí igual. */
const TDSIM = (() => {
  const TOWERS = [
    { n: 'Ballesta', cost: 50, r: 96, rate: 0.55, dmg: 9, kind: 'arrow' },
    { n: 'Cañón', cost: 90, r: 84, rate: 1.3, dmg: 24, splash: 42, kind: 'cannon' },
    { n: 'Hielo', cost: 70, r: 80, rate: 0.9, dmg: 4, slow: 1.6, kind: 'ice' },
    { n: 'Rayo', cost: 120, r: 90, rate: 1.15, dmg: 13, chain: 3, kind: 'zap' },
  ];
  /* vida relativa, velocidad (casillas/s), oro, blindaje */
  const FT = {
    norm: { hp: 1, sp: 1.35, gold: 5 }, fast: { hp: 0.55, sp: 2.5, gold: 5 },
    armor: { hp: 1.7, sp: 0.95, gold: 11, armor: 2 }, fly: { hp: 0.8, sp: 1.5, gold: 7, fly: 1 },
    heal: { hp: 1.4, sp: 1.1, gold: 12, heal: 6 }, split: { hp: 1.5, sp: 1.15, gold: 8, split: 2 },
    ward: { hp: 1.6, sp: 1.2, gold: 9, ward: 1 }, boss: { hp: 9, sp: 0.62, gold: 60, big: 5 },
    king: { hp: 26, sp: 0.55, gold: 140, big: 10, king: 1 },
  };
  const LET = { n: 'norm', f: 'fast', a: 'armor', y: 'fly', h: 'heal', s: 'split', w: 'ward', B: 'boss', K: 'king' };
  const CELL = 40;                                     /* px por casilla, como el motor */
  const stat = (t, lv, high) => ({ r: (TOWERS[t].r * (1 + (lv - 1) * 0.14) * (high ? 1.25 : 1)) / CELL, dmg: TOWERS[t].dmg * (1 + (lv - 1) * 0.65), rate: TOWERS[t].rate * (1 - (lv - 1) * 0.1) });
  const upCost = (t, lv) => Math.round(TOWERS[t].cost * 0.7 * lv);

  /* ---- mapa: rejilla, caminos y casillas especiales ---- */
  function parse(m) {
    const H = m.length, W = m[0].length, cellT = [], ent = [];
    let goal = null;
    for (let y = 0; y < H; y++) { cellT.push([]); for (let x = 0; x < W; x++) { const ch = m[y][x]; cellT[y].push(ch); if (ch === 'A' || ch === 'C') ent.push([x, y]); if (ch === 'B') goal = [x, y]; } }
    const road = (x, y) => x >= 0 && y >= 0 && x < W && y < H && '=~nABC'.includes(cellT[y][x]);
    if (!goal || !ent.length) return { W, H, cellT, ent, goal, paths: [] };
    const paths = ent.map((s) => {                      /* BFS por casillas de camino */
      const prev = {}, q = [s], seen = new Set([s.join()]);
      while (q.length) {
        const cu = q.shift();
        if (cu[0] === goal[0] && cu[1] === goal[1]) { const out = [cu]; let kk = cu.join(); while (prev[kk]) { out.unshift(prev[kk]); kk = prev[kk].join(); } return out; }
        for (const [nx, ny] of [[cu[0] + 1, cu[1]], [cu[0] - 1, cu[1]], [cu[0], cu[1] + 1], [cu[0], cu[1] - 1]]) { const kk = nx + ',' + ny; if (!road(nx, ny) || seen.has(kk)) continue; seen.add(kk); prev[kk] = cu; q.push([nx, ny]); }
      }
      return null;
    });
    return { W, H, cellT, ent, goal, paths };
  }
  const fogAt = (M, p) => M.cellT[p[1]][p[0]] === 'n';
  const windAt = (M, p) => M.cellT[p[1]][p[0]] === '~';

  /* ---- planificador: una defensa razonable, no óptima ----
   * Puntúa cada (casilla, torre) por las casillas de camino visibles que cubre y por el daño por
   * segundo que aporta por moneda; también valora mejorar lo que ya tiene. Compra lo mejor
   * mientras le quede oro. No conoce las oleadas futuras: es lo que haría un jugador sensato. */
  function coverage(M, x, y, r) {
    let n = 0;
    for (const P of M.paths) if (P) for (const p of P) { if (fogAt(M, p)) continue; if (Math.hypot(p[0] - x, p[1] - y) <= r) n += windAt(M, p) ? 0.4 : 1; }
    return n;
  }
  function plan(M, S) {
    let moved = true;
    while (moved) {
      moved = false;
      let best = null, bs = 0;
      for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) {
        const ch = M.cellT[y][x]; if (ch !== '.' && ch !== 'o') continue;
        if (S.towers.some((q) => q.x === x && q.y === y)) continue;
        for (let t = 0; t < 4; t++) {
          const T = TOWERS[t]; if (T.cost > S.gold) continue;
          const st = stat(t, 1, ch === 'o'), cov = coverage(M, x, y, st.r); if (cov < 1.2) continue;
          const dps = st.dmg / st.rate * (t === 1 ? 1.6 : t === 3 ? 1.9 : t === 2 ? 0.9 : 1);
          const sc = dps * Math.min(cov, 9) / T.cost;
          if (sc > bs) { bs = sc; best = { kind: 'build', x, y, t, high: ch === 'o' }; }
        }
      }
      for (const q of S.towers) {
        if (q.lv >= 3) continue; const cost = upCost(q.t, q.lv); if (cost > S.gold) continue;
        const a = stat(q.t, q.lv, q.high), b = stat(q.t, q.lv + 1, q.high);
        const dps = (x) => x.dmg / x.rate * (q.t === 1 ? 1.6 : q.t === 3 ? 1.9 : q.t === 2 ? 0.9 : 1);
        const sc = (dps(b) - dps(a)) * Math.min(coverage(M, q.x, q.y, b.r), 9) / cost * 1.15;
        if (sc > bs) { bs = sc; best = { kind: 'up', q }; }
      }
      if (!best) break;
      if (best.kind === 'build') { S.gold -= TOWERS[best.t].cost; S.towers.push({ x: best.x, y: best.y, t: best.t, lv: 1, cd: 0, high: best.high }); }
      else { S.gold -= upCost(best.q.t, best.q.lv); best.q.lv++; }
      moved = true;
    }
  }

  /* ---- combate ---- */
  function spawnList(str) {
    const out = [];
    for (const g of str.split(',')) { const mm = /^(\d+)([nfayhswBK])$/.exec(g.trim()); if (!mm) throw new Error('grupo ilegible: ' + g); for (let i = 0; i < +mm[1]; i++) out.push(LET[mm[2]]); }
    /* se mezclan alternando grupos para que no lleguen en bloques limpios */
    const by = {}; for (const t of out) (by[t] = by[t] || []).push(t);
    const keys = Object.keys(by), mix = []; let any = true;
    while (any) { any = false; for (const kk of keys) if (by[kk].length) { mix.push(by[kk].pop()); any = true; } }
    return mix;
  }
  function run(lv, dif, opt) {
    opt = opt || {};
    const M = parse(lv.m);
    if (M.paths.some((p) => !p)) return { win: false, why: 'mapa sin camino' };
    const gm = dif === 0 ? 1.25 : dif === 2 ? 0.85 : 1, hm = dif === 0 ? 0.85 : dif === 2 ? 1.15 : 1;
    const S = { gold: Math.round(lv.gold * gm), towers: [] };
    let lives = lv.lives, foes = [], t = 0;
    const dt = 1 / 20;
    const flyLen = (e) => Math.hypot(M.goal[0] - e[0], M.goal[1] - e[1]);
    for (let wi = 0; wi < lv.w.length; wi++) {
      plan(M, S);
      const hp0 = Math.round((lv.h0 + lv.hs * wi) * hm);
      const q = spawnList(lv.w[wi]); let si = 0, spawnT = 0;
      let guard = 0;
      while ((si < q.length || foes.length) && guard++ < 20000) {
        t += dt;
        spawnT -= dt;
        if (si < q.length && spawnT <= 0) {
          const ty = q[si++], T = FT[ty], pi = si % M.paths.length;
          spawnT = ty === 'fast' ? 0.42 : ty === 'boss' || ty === 'king' ? 1.4 : 0.66;
          foes.push({ ty, hp: hp0 * T.hp, max: hp0 * T.hp, d: 0, pi, slow: 0, sum: 0, rage: 1 });
        }
        /* enemigos */
        for (const f of foes) {
          const T = FT[f.ty];
          const P = M.paths[f.pi] || M.paths[0];
          const L = T.fly ? flyLen(M.ent[f.pi % M.ent.length]) : P.length - 1;
          let sp = T.sp * lv.spd * f.rage;
          if (!T.fly) { const cell = P[Math.min(P.length - 1, Math.floor(f.d))]; if (windAt(M, cell)) sp *= 1.6; }
          if (f.slow > 0 && !T.ward) sp *= 0.5;
          f.slow -= dt; f.d += sp * dt;
          if (T.heal) for (const o of foes) if (o !== f && !o.dead && dist(M, f, o) < 2.2) o.hp = Math.min(o.max, o.hp + T.heal * dt);
          if (f.d >= L) { f.dead = true; f.leak = true; lives -= T.big || 1; }
          if (T.king && !f.p2 && f.hp < f.max * 0.66) { f.p2 = 1; f.rage = 1.25; for (let i = 0; i < 4; i++) foes.push({ ty: 'fast', hp: hp0 * 0.55, max: hp0 * 0.55, d: f.d, pi: f.pi, slow: 0, rage: 1 }); }
          if (T.king && !f.p3 && f.hp < f.max * 0.33) { f.p3 = 1; f.rage = 1.5; for (let i = 0; i < 4; i++) foes.push({ ty: 'armor', hp: hp0 * 1.7, max: hp0 * 1.7, d: f.d, pi: f.pi, slow: 0, rage: 1 }); }
        }
        /* torres */
        for (const tw of S.towers) {
          tw.cd -= dt; if (tw.cd > 0) continue;
          const st = stat(tw.t, tw.lv, tw.high), T = TOWERS[tw.t];
          let tg = null, bp = -1;
          for (const f of foes) { if (f.dead) continue; const p = pos(M, f); if (!p || (p.fog && !FT[f.ty].fly)) continue; if (Math.hypot(p.x - tw.x, p.y - tw.y) > st.r) continue; if (f.d > bp) { bp = f.d; tg = f; } }
          if (!tg) continue;
          tw.cd = st.rate;
          const dmg = st.dmg * 0.9;                       /* 0,9: el tiempo de vuelo del proyectil, a favor del jugador real */
          if (T.kind === 'cannon') { const c0 = pos(M, tg); for (const f of foes) { if (f.dead) continue; const p = pos(M, f); if (p && Math.hypot(p.x - c0.x, p.y - c0.y) <= T.splash / CELL * (1 + (tw.lv - 1) * 0.15)) hurt(f, dmg); } }
          else if (T.kind === 'zap') { const hit = [tg]; let last = tg; for (let j = 1; j < T.chain + tw.lv - 1; j++) { const lp = pos(M, last); const nx = foes.find((f) => !f.dead && !hit.includes(f) && pos(M, f) && Math.hypot(pos(M, f).x - lp.x, pos(M, f).y - lp.y) < 70 / CELL); if (!nx) break; hit.push(nx); last = nx; } hit.forEach((f, j) => hurt(f, dmg * (j ? 0.7 : 1))); }
          else { hurt(tg, dmg); if (T.slow && !FT[tg.ty].ward) tg.slow = T.slow + (tw.lv - 1) * 0.5; }
        }
        for (const f of foes) if (!f.dead && f.hp <= 0) {
          f.dead = true; S.gold += FT[f.ty].gold + Math.floor((wi + 1) / 2);
          const sp = FT[f.ty].split; if (sp) for (let i = 0; i < sp; i++) foes.push({ ty: 'norm', hp: f.max * 0.35, max: f.max * 0.35, d: f.d, pi: f.pi, slow: 0, rage: 1 });
        }
        foes = foes.filter((f) => !f.dead);
        if (lives <= 0) return { win: false, lives: 0, wave: wi + 1 };
      }
      S.gold += 30 + (wi + 1) * 8;
    }
    return { win: lives > 0, lives, wave: lv.w.length, gold: S.gold, towers: S.towers.length };
    function hurt(f, d) { f.hp -= Math.max(1, d - (FT[f.ty].armor || 0)); }
    function pos(M2, f) {
      const T = FT[f.ty];
      if (T.fly) { const e = M2.ent[f.pi % M2.ent.length], L = flyLen(e) || 1, q = Math.min(1, f.d / L); return { x: e[0] + (M2.goal[0] - e[0]) * q, y: e[1] + (M2.goal[1] - e[1]) * q, fog: false }; }
      const P = M2.paths[f.pi] || M2.paths[0], i = Math.min(P.length - 1, Math.floor(f.d)), j = Math.min(P.length - 1, i + 1), q = f.d - i;
      return { x: P[i][0] + (P[j][0] - P[i][0]) * q, y: P[i][1] + (P[j][1] - P[i][1]) * q, fog: fogAt(M2, P[i]) };
    }
    function dist(M2, a, b) { const p = pos(M2, a), q = pos(M2, b); return p && q ? Math.hypot(p.x - q.x, p.y - q.y) : 1e9; }
  }
  return { run, parse, spawnList, TOWERS, FT, LET };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { TDLV, TDSIM }; /* verificador en Node */
/* </SIM> */
