/* Verificador de los 20 pozos de columnas-de-joyas (src/eng/collv.js).
 * Carga las REGLAS PURAS del propio motor (el bloque entre las marcas <LV> y </LV> de
 * src/eng/columnas.js), monta un jugador voraz y juega cada nivel en las tres dificultades.
 * Comprueba que:
 *   1. el montón inicial no trae ninguna combinación hecha ni cristales ya en el suelo
 *   2. el objetivo se cumple dentro del límite de columnas (y del reloj, si lo hay)
 *   3. los márgenes de ★★ y ★★★ y la maestría (cadenas) son alcanzables
 * Uso: node scripts/check_collv.js [partidas]
 */
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'src', 'eng');
const eng = fs.readFileSync(path.join(SRC, 'columnas.js'), 'utf8');
const a = eng.indexOf('/* <LV>'), b = eng.indexOf('/* </LV>');
if (a < 0 || b < 0) throw new Error('no encuentro las marcas <LV>/</LV> en columnas.js');
/* COLS/ROWS se declaran justo antes del bloque puro: se copian tal cual. */
const dim = eng.match(/const COLS = \d+, ROWS = \d+;/);
if (!dim) throw new Error('no encuentro COLS/ROWS en columnas.js');
const pure = dim[0] + '\n' + eng.slice(a, b);
const R = (() => { const m = { exports: {} }; new Function('module', 'exports', pure)(m, m.exports); return m.exports; })();
const COLLV = new Function(fs.readFileSync(path.join(SRC, 'collv.js'), 'utf8') + '\n;return COLLV;')();
const LVS = COLLV['columnas-de-joyas'];
const { COLS, ROWS, mkF, findMatches, hitRocks, blast, wild, ray, riseRow, anyMark, takeMarked, gravity, floorCrystals, landRowOn, isGem } = R;

const RUNS = +(process.argv[2] || 14);
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (n) => Math.floor(rnd() * n);

/* --- mismos parámetros por dificultad que el motor --- */
const limNow = (L, d) => !L.lim ? 0 : Math.max(8, Math.round(L.lim * (d === 0 ? 1.35 : d === 2 ? 0.9 : 1)));
const upPar = (L) => L.go.surv != null;
const parNow = (L, d) => { const f = upPar(L) ? (d === 0 ? 0.8 : d === 2 ? 1.12 : 1) : (d === 0 ? 1.35 : d === 2 ? 0.9 : 1); return [Math.round(L.par[0] * f), Math.round(L.par[1] * f)]; };
const mastNow = (L, d) => Math.max(1, (L.mast || 1) + (d === 0 ? -1 : d === 2 ? 1 : 0));
const timeNow = (L, d) => !L.time ? 0 : Math.round(L.time * (d === 0 ? 1.3 : d === 2 ? 0.85 : 1));
const riseNow = (L, d) => !L.rise ? 0 : Math.max(4, L.rise + (d === 0 ? 3 : d === 2 ? -1 : 0));

function newPiece(L, d) {
  const g = [ri(L.cols), ri(L.cols), ri(L.cols)];
  const pr = (L.rain || 0) + (d === 0 ? 0.05 : d === 2 ? -0.02 : 0);
  const pb = (L.bomb || 0) + (d === 0 ? 0.04 : 0);
  const py = (L.ray || 0) + (d === 0 ? 0.03 : 0);
  const r = rnd();
  if (pr > 0 && r < pr) g[ri(3)] = -1;
  else if (pb > 0 && r < pr + pb) g[ri(3)] = -2;
  else if (py > 0 && r < pr + pb + py) g[ri(3)] = -5;
  return g;
}
const clone = (F) => F.map((row) => row.map((g) => (g ? Object.assign({}, g) : null)));

/* --- coloca la columna y resuelve toda la cascada; devuelve los contadores del turno --- */
function place(F, x, g, L) {
  const y = landRowOn(F, x);
  const st = { gems: 0, rocks: 0, col: 0, cry: 0, ice: 0, chain: 0, steps: 0, dead: 0, big: 0, big4: 0 };
  if (y < 2) { st.dead = 1; return st; }
  for (let i = 0; i < 3; i++) F[y - i][x] = { c: g[i], off: 0, pop: 0 };
  for (let i = 0; i < 3; i++) {
    const ry = y - i, cell = F[ry][x];
    if (!cell) continue;
    if (cell.c === -1) {
      let col = -1;
      const below = F[y + 1] && F[y + 1][x];
      if (below && isGem(below)) col = below.c;
      else for (let j = 0; j < 3; j++) { const o = F[y - j] && F[y - j][x]; if (o && o.c >= 0) { col = o.c; break; } }
      if (col < 0) col = ri(L.cols);
      cell.mark = 1; wild(F, col);
    } else if (cell.c === -2) blast(F, x, ry);
    else if (cell.c === -5) { cell.mark = 1; ray(F, x, ry); }
  }
  for (;;) {
    let any = anyMark(F);
    if (findMatches(F)) any = true;
    if (any) {
      const h = hitRocks(F); st.ice += h.ice;
      const cells = takeMarked(F);
      st.chain++; st.steps++;
      let gm = 0;
      for (const q of cells) { if (q.rock) st.rocks++; else { gm++; st.gems++; if (L.go.gems != null && q.c === (L.go.col || 0)) st.col++; } }
      if (gm >= 5) st.big++;
      if (gm >= 4) st.big4++;
      gravity(F, 1);
    } else {
      const xs = floorCrystals(F);
      if (xs.length) { for (const cxx of xs) F[ROWS - 1][cxx] = null; st.cry += xs.length; st.steps++; gravity(F, 1); }
      else break;
    }
  }
  return st;
}

/* --- heurística: progreso del objetivo, cadenas y pozo bajo --- */
function goalGain(L, st) {
  const g = L.go; let v = 0;
  if (g.clear != null) v += st.gems / g.clear;
  if (g.gems != null) v += (st.col * 3) / g.gems;
  if (g.combo != null) v += (st.chain >= 2 ? 1 : 0) / g.combo;
  if (g.big != null) v += (st.big ? 1 : 0) / g.big;
  if (g.cry != null) v += st.cry / g.cry;
  if (g.rock != null) v += st.rocks / g.rock;
  if (g.ice != null) v += st.ice / g.ice;
  return v;
}
function shape(F) {
  const h = [];
  for (let x = 0; x < COLS; x++) { let y = 0; while (y < ROWS && !F[y][x]) y++; h.push(ROWS - y); }
  let bump = 0; for (let x = 1; x < COLS; x++) bump += Math.abs(h[x] - h[x - 1]);
  let pairs = 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const p = F[y][x]; if (!isGem(p)) continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const q = F[y + dy] && F[y + dy][x + dx]; if (isGem(q) && q.c === p.c) pairs++; }
  }
  return { max: Math.max(...h), sum: h.reduce((a2, v) => a2 + v, 0), bump, pairs };
}
function bestMove(F, g, L) {
  let bv = -1e9, bx = 3, br = 0;
  for (let r = 0; r < 3; r++) {
    const gg = r === 0 ? g : r === 1 ? [g[2], g[0], g[1]] : [g[1], g[2], g[0]];
    for (let x = 0; x < COLS; x++) {
      const C = clone(F), st = place(C, x, gg, L);
      if (st.dead) continue;
      const sh = shape(C);
      let v = 900 * goalGain(L, st) + 6 * st.gems + 30 * st.rocks + 260 * st.cry + 26 * st.ice
        + 30 * (st.chain > 1 ? (st.chain - 1) * (st.chain - 1) : 0)
        - 7 * sh.max - 1.2 * sh.sum - 3 * sh.bump + 2.2 * sh.pairs;
      if (sh.max >= ROWS - 3) v -= 400;
      if (v > bv) { bv = v; bx = x; br = r; }
    }
  }
  return { x: bx, r: br, ok: bv > -1e8 };
}

function play(L, d, lvIdx) {
  const F = mkF(L.pre); gravity(F, 1);
  const lim = limNow(L, d), T = timeNow(L, d), RI0 = riseNow(L, d);
  let drops = 0, nGems = 0, nCol = 0, nChain = 0, nDeep = 0, nBig = 0, nRock = 0, nCry = 0, nIce = 0;
  let riseIn = RI0, life = (lvIdx >= 11 ? 1 : 0) + (d === 0 ? 1 : 0), lifeUsed = 0, time = 0;
  const met = () => {
    const g = L.go;
    if (g.clear != null && nGems < g.clear) return false;
    if (g.gems != null && nCol < g.gems) return false;
    if (g.combo != null && nChain < g.combo) return false;
    if (g.big != null && nBig < g.big) return false;
    if (g.cry != null && nCry < g.cry) return false;
    if (g.rock != null && nRock < g.rock) return false;
    if (g.ice != null && nIce < g.ice) return false;
    if (g.surv != null && drops < g.surv) return false;
    return true;
  };
  for (;;) {
    if (met()) break;
    if (lim && drops >= lim) return { win: 0, why: 'limite', drops, nGems, nChain, time };
    if (T && time >= T) return { win: 0, why: 'reloj', drops, nGems, nChain, time };
    const g = newPiece(L, d), mv = bestMove(F, g, L);
    if (!mv.ok) {
      if (life > 0) { life--; lifeUsed = 1; for (let y = ROWS - 2; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (F[y][x] && !F[y][x].cr) F[y][x] = null; gravity(F, 1); continue; }
      return { win: 0, why: 'lleno', drops, nGems, nChain, time };
    }
    const gg = mv.r === 0 ? g : mv.r === 1 ? [g[2], g[0], g[1]] : [g[1], g[2], g[0]];
    const st = place(F, mv.x, gg, L);
    drops++; riseIn--; time += 1.6 + 0.5 * st.steps;
    nGems += st.gems; nCol += st.col; nRock += st.rocks; nCry += st.cry; nIce += st.ice;
    if (st.chain >= 2) nChain++;
    if (st.chain >= 3) nDeep++;
    nBig += st.big;
    if (st.dead) {
      if (life > 0) { life--; lifeUsed = 1; for (let y = ROWS - 2; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (F[y][x] && !F[y][x].cr) F[y][x] = null; gravity(F, 1); continue; }
      return { win: 0, why: 'lleno', drops, nGems, nChain, time };
    }
    if (L.rise && riseIn <= 0) {
      riseIn = RI0;
      if (riseRow(F, L.cols, rnd, 1)) {
        if (life > 0) { life--; lifeUsed = 1; for (let y = ROWS - 2; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (F[y][x] && !F[y][x].cr) F[y][x] = null; gravity(F, 1); }
        else return { win: 0, why: 'desborde', drops, nGems, nChain, time };
      }
      for (;;) { let any = anyMark(F); if (findMatches(F)) any = true; if (!any) break; const h = hitRocks(F); nIce += h.ice; const cells = takeMarked(F); for (const q of cells) { if (q.rock) nRock++; else { nGems++; if (L.go.gems != null && q.c === (L.go.col || 0)) nCol++; } } gravity(F, 1); }
    }
  }
  const p = parNow(L, d), up = upPar(L), v = up ? nGems : drops;
  let stars = 1;
  if (up ? v >= p[0] : v <= p[0]) stars = 2;
  if ((up ? v >= p[1] : v <= p[1]) && nChain >= mastNow(L, d) && !lifeUsed) stars = 3;
  return { win: 1, drops, nGems, nChain, nDeep, stars, time, lifeUsed };
}

/* --- modo calibración: `node scripts/check_collv.js cal 26` --- */
if (process.argv[2] === 'cal') {
  const N = +(process.argv[3] || 26), RN = +(process.argv[4] || 10);
  const DN0 = ['F', 'N', 'D'];
  for (let i = 0; i < LVS.length; i++) {
    const L = LVS[i], out = [];
    for (let d = 0; d < 3; d++) {
      const acc = { gems: 0, col: 0, ch: 0, dp: 0, bg: 0, b4: 0, rock: 0, cry: 0, ice: 0, t: 0, dead: 0 };
      for (let n = 0; n < RN; n++) {
        const F = mkF(L.pre); gravity(F, 1);
        let riseIn = riseNow(L, d); const RI0 = riseIn;
        for (let q = 0; q < N; q++) {
          const g = newPiece(L, d), mv = bestMove(F, g, L);
          if (!mv.ok) { acc.dead++; break; }
          const gg = mv.r === 0 ? g : mv.r === 1 ? [g[2], g[0], g[1]] : [g[1], g[2], g[0]];
          const st = place(F, mv.x, gg, L);
          if (st.dead) { acc.dead++; break; }
          riseIn--;
          acc.gems += st.gems; acc.col += st.col; acc.rock += st.rocks; acc.cry += st.cry; acc.ice += st.ice;
          if (st.chain >= 2) acc.ch++; if (st.chain >= 3) acc.dp++; acc.bg += st.big; acc.b4 += st.big4;
          acc.t += 1.6 + 0.5 * st.steps;
          if (L.rise && riseIn <= 0) { riseIn = RI0; riseRow(F, L.cols, rnd, 1); for (;;) { let any = anyMark(F); if (findMatches(F)) any = true; if (!any) break; const h = hitRocks(F); acc.ice += h.ice; const cs = takeMarked(F); for (const qq of cs) { if (qq.rock) acc.rock++; else acc.gems++; } gravity(F, 1); } }
        }
      }
      const f = (v) => (v / RN).toFixed(1);
      out.push(`${DN0[d]} j${f(acc.gems)} c${f(acc.col)} x2:${f(acc.ch)} x3:${f(acc.dp)} R5:${f(acc.bg)} R4:${f(acc.b4)} p${f(acc.rock)} D${f(acc.cry)} h${f(acc.ice)} ${f(acc.t)}s${acc.dead ? ' †' + acc.dead : ''}`);
    }
    console.log(`${String(i + 1).padStart(2)} ${L.name.padEnd(22)} ${out.join(' | ')}`);
  }
  process.exit(0);
}

/* --- 1. el montón inicial está limpio --- */
let bad = 0;
LVS.forEach((L, i) => {
  const F = mkF(L.pre); gravity(F, 1);
  if (findMatches(F)) { console.log(`✗ nivel ${i + 1} (${L.name}): el montón inicial ya trae una combinación`); bad++; }
  if (floorCrystals(F).length) { console.log(`✗ nivel ${i + 1} (${L.name}): hay un cristal ya en el suelo`); bad++; }
});

/* --- 2. se supera en las tres dificultades --- */
const DN = ['fácil', 'normal', 'difícil'];
for (let i = 0; i < LVS.length; i++) {
  const L = LVS[i], out = [];
  for (let d = 0; d < 3; d++) {
    let win = 0, s2 = 0, s3 = 0, dr = 0, tm = 0, why = {};
    for (let n = 0; n < RUNS; n++) {
      const r = play(L, d, i + 1);
      if (r.win) { win++; dr += r.drops; tm += r.time; if (r.stars >= 2) s2++; if (r.stars >= 3) s3++; }
      else why[r.why] = (why[r.why] || 0) + 1;
    }
    const pc = Math.round(100 * win / RUNS);
    out.push(`${DN[d]} ${pc}% (★★ ${Math.round(100 * s2 / RUNS)}% ★★★ ${Math.round(100 * s3 / RUNS)}%${win ? `, ${(dr / win).toFixed(1)} col, ${(tm / win).toFixed(0)} s` : ''}${Object.keys(why).length ? ', ' + JSON.stringify(why) : ''})`);
    if (pc < 100 || s2 === 0) bad++;
  }
  console.log(`${String(i + 1).padStart(2)} ${L.name.padEnd(22)} ${out.join(' | ')}`);
}
console.log(bad ? `\n${bad} avisos` : '\nTodo correcto');
