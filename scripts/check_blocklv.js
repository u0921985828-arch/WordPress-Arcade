/* Verificador de los 20 niveles de bloques-10x10 (src/eng/blocklv.js).
 *
 *   node scripts/check_blocklv.js                 los 20 niveles × 3 dificultades, 16 partidas
 *   node scripts/check_blocklv.js 13              solo el nivel 13
 *   node scripts/check_blocklv.js 13 2 40         nivel 13, difícil, 40 partidas
 *   node scripts/check_blocklv.js all - 30 tune   saca además s2/s3 sugeridos por percentiles
 *
 * Juega con las REGLAS DEL JUEGO (BLOCKLV.make/place/stars del propio fichero de niveles: el
 * motor y este bot no pueden divergir). El bot mira la tanda entera (las piezas que quedan en
 * la bandeja, en cualquier orden) con búsqueda en haz y una evaluación razonable: progreso del
 * objetivo, urgencia de las bombas, líneas casi llenas alrededor de gemas y piedra, huecos
 * sueltos y sitio para las piezas grandes. Para imitar a jugadores distintos cada partida
 * reparte los pesos con ±30 % de ruido y a veces elige otra de las buenas; las partidas impares
 * son del perfil «a por las 3★» (prepara líneas en paralelo para hacer dobles). Si pierde y el
 * nivel tiene Deshacer, lo usa como una persona (vuelve una jugada y prueba otra); esa partida ya
 * no puede dar 3★. NOUNDO=1 lo desactiva. OFF=500 juega partidas distintas de las usadas para
 * escribir s2/s3 (así se comprobó la tabla).
 *
 * Por nivel y dificultad saca: % de victorias, piezas del percentil 25/50/75 de las partidas
 * ganadas, % de partidas que logran 2★ y 3★ con la tabla escrita, mecha mínima que quedó en las
 * bombas y duración estimada (2,2 s por pieza, ritmo humano medido a ojo en el navegador).
 * Avisa si un nivel no se gana lo suficiente, si las 2★ no salen en al menos un tercio de las
 * victorias o si las 3★ no salen nunca.
 */
const path = require('path');
const B = require(path.join(__dirname, '..', 'src', 'eng', 'blocklv.js'));
const LVS = B.L['bloques-10x10'];
const N = 10, NN = 100;
const DN = ['fácil', 'normal', 'difícil'];

function mul(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------------- evaluación ---------------- */
const BIG = [B.FAM[12].rots[0], B.FAM[11].rots[0], B.FAM[11].rots[1]].map((cells) => { let w = 0, h = 0; for (const p of cells) { w = Math.max(w, p[0] + 1); h = Math.max(h, p[1] + 1); } return { cells, w, h }; });
function evalS(S, W) {
  if (S.won) return 1e7 - S.used * 100;
  if (S.lost === 'bomb') return -1e7;
  let v = 0;
  for (const o of S.obj) {
    const u = o.t === 'gem' ? 260 : o.t === 'stone' ? 200 : o.t === 'bomb' ? 420 : o.t === 'mark' ? 120 : o.t === 'lines' ? 80 : 1;
    v += Math.min(o.n, o.got) * u * W.obj;
  }
  /* empties por fila y columna (solo casillas reales) */
  const er = new Int8Array(N), ec = new Int8Array(N);
  let iso = 0, tr = 0, empt = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; if (S.h[i]) continue;
    const e = S.c[i] < 0;
    if (e) { er[y]++; ec[x]++; empt++;
      let free = 0;
      if (x > 0 && !S.h[i - 1] && S.c[i - 1] < 0) free++; if (x < N - 1 && !S.h[i + 1] && S.c[i + 1] < 0) free++;
      if (y > 0 && !S.h[i - N] && S.c[i - N] < 0) free++; if (y < N - 1 && !S.h[i + N] && S.c[i + N] < 0) free++;
      if (!free) iso++;
    }
    if (x < N - 1 && !S.h[i + 1] && (S.c[i + 1] < 0) !== e) tr++;
    if (y < N - 1 && !S.h[i + N] && (S.c[i + N] < 0) !== e) tr++;
  }
  /* el que va a por las 3★ prepara líneas en paralelo para cerrarlas de un golpe */
  if (W.setup) { let near = 0; for (let j = 0; j < N; j++) { if (er[j] > 0 && er[j] <= 3) near++; if (ec[j] > 0 && ec[j] <= 3) near++; } v += near * 12; }
  v += empt * 2 * W.room - iso * 14 * W.iso - tr * 1.2 * W.tr + S.multi * 90 * W.multi;
  for (const b of BIG) if (B.anyFit(S, b)) v += 18 * W.room;
  /* objetivos vivos en el tablero: cuanto menos le falte a su línea, mejor */
  const wantGem = S.obj.some((o) => o.t === 'gem' && o.got < o.n), wantSt = S.obj.some((o) => o.t === 'stone' && o.got < o.n);
  for (let i = 0; i < NN; i++) {
    if (S.c[i] < 0) continue; const kd = S.k[i]; if (kd === B.KN) continue;
    if (kd === B.KC && wantSt) v += 90 * W.obj;   /* piedra ya agrietada: medio camino */
    const m = Math.min(er[(i / N) | 0], ec[i % N]);
    if (kd === B.KB) { const f = Math.max(1, S.fu[i]); v -= m * 160 / f * W.bomb + (f <= m ? 3000 : 0); }
    else if (kd === B.KG && wantGem) v -= m * 9 * W.tgt;
    else if ((kd === B.KS || kd === B.KC) && wantSt) v -= m * 7 * W.tgt;
  }
  /* marcas pendientes con hueco libre al lado, para que quepa algo */
  if (S.obj.some((o) => o.t === 'mark' && o.got < o.n)) for (let i = 0; i < NN; i++) if (S.m[i] === 1 && S.c[i] >= 0) v -= 60;
  if (S.lost) v -= 5e5;
  return v;
}
/* ---------------- bot: haz sobre la tanda que queda ---------------- */
function decide(S, W, rnd, beam, ban) {
  let layer = [{ S, first: null, v: 0 }], best = null;
  for (let depth = 0; depth < 3; depth++) {
    const next = [];
    for (const st of layer) {
      const seen = new Set();
      for (let i = 0; i < 3; i++) {
        const pc = st.S.tray[i]; if (!pc) continue;
        const key = pc.ray + ':' + pc.cells.join(';') + ':' + pc.gem; if (seen.has(key)) continue; seen.add(key);
        for (let y = 0; y <= N - pc.h; y++) for (let x = 0; x <= N - pc.w; x++) {
          if (!B.fits(st.S, pc, x, y)) continue;
          if (!st.first && ban && ban.has(i + ',' + x + ',' + y)) continue;
          const c = B.clone(st.S); c.sim = true; B.place(c, i, x, y);
          const v = evalS(c, W) + (rnd() - 0.5) * W.noise;
          const node = { S: c, first: st.first || [i, x, y], v };
          if (!best || v > best.v) best = node;
          if (c.won || c.lost) continue;
          next.push(node);
        }
      }
    }
    if (!next.length) break;
    next.sort((a, b) => b.v - a.v);
    layer = next.slice(0, beam);
    /* despiste humano: a veces se queda con una jugada peor de las buenas */
    if (depth === 0 && !best.S.won && rnd() < W.eps && layer.length > 1) { const alt = layer[1 + Math.floor(rnd() * Math.min(3, layer.length - 1))]; best = alt; layer = [alt]; }
    if (best.S.won) break;
  }
  return best ? best.first : null;
}
function play(lv, dif, gs, beam) {
  const rnd = mul(gs * 977 + 31);
  const j = () => 0.7 + rnd() * 0.6;
  const W = { obj: j(), room: j(), iso: j(), tr: j(), bomb: j(), tgt: j(), noise: 8 + rnd() * 30, multi: gs % 2 ? 6 : 0.6, setup: gs % 2 ? 1 : 0, eps: 0.04 + rnd() * 0.12 };
  if (process.env.NOLIM) lv = Object.assign({}, lv, { mv: 0, fz: 99 });
  let S = B.make(lv, dif);
  let minFu = 99;
  /* Deshacer como lo usaría una persona: al perder, vuelve una jugada atrás y prueba otra
     (gasta uno de los deshacer de la dificultad; la partida ya no puede dar 3★). */
  const hist = [], bans = [];
  for (let t = 0; t < 600 && !S.won; t++) {
    if (S.lost) {
      if (!process.env.NOUNDO && S.undo > 0 && hist.length) { const u = S.undo - 1, ud = S.undid + 1, h = hist.pop(); S = h.S; S.undo = u; S.undid = ud; bans.length = hist.length; (bans[hist.length] = bans[hist.length] || new Set()).add(h.mv.join(',')); continue; }
      break;
    }
    const ban = bans[hist.length];
    const mv = decide(S, W, rnd, beam, ban);
    if (!mv) { S.lost = 'fit'; continue; }
    hist.push({ S: B.clone(S), mv }); if (hist.length > 12) { hist.shift(); bans.shift(); }
    bans.length = hist.length;
    B.place(S, mv[0], mv[1], mv[2]);
    for (let i = 0; i < NN; i++) if (S.c[i] >= 0 && S.k[i] === B.KB) minFu = Math.min(minFu, S.fu[i]);
  }
  return { undid: S.undid, won: S.won, lost: S.lost, used: S.used, multi: S.multi, stars: B.stars(S), minFu, score: S.score, left: B.left(S) };
}
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0);

module.exports = { play, evalS, decide };
if (require.main === module) main();
function main() {
const args = process.argv.slice(2);
const only = args[0] && args[0] !== 'all' ? +args[0] : 0;
const onlyD = args[1] && args[1] !== '-' ? +args[1] : -1;
const games = +(args[2] || 16), tune = args[3] === 'tune', beam = +(args[4] || 5);
const MINW = [0.85, 0.8, 0.6];
const OFF = +(process.env.OFF || 0);   /* OFF=500: partidas distintas de las usadas para escribir s2/s3 */
let bad = 0;
const t0 = Date.now();
LVS.forEach((lv, li) => {
  if (only && li + 1 !== only) return;
  const S0 = B.make(lv, 1); if (S0.bad.length) { console.log(`Nivel ${li + 1}: PLANTA MAL — ${S0.bad.join('; ')}`); bad++; return; }
  const sug = [[], []];
  for (let d = 0; d < 3; d++) {
    if (onlyD >= 0 && d !== onlyD) continue;
    const R = []; for (let g = 0; g < games; g++) R.push(play(lv, d, g + 1 + li * 1000 + OFF, beam));
    const wins = R.filter((r) => r.won), used = wins.map((r) => r.used).sort((a, b) => a - b);
    const masters = wins.filter((r) => r.multi >= (lv.mx == null ? 1 : lv.mx)).map((r) => r.used).sort((a, b) => a - b);
    const w = wins.length / R.length, s2 = wins.filter((r) => r.stars >= 2).length, s3 = wins.filter((r) => r.stars >= 3).length;
    const fu = R.filter((r) => r.minFu < 99).map((r) => r.minFu).sort((a, b) => a - b);
    const why = {}; for (const r of R) if (!r.won) why[r.lost] = (why[r.lost] || 0) + 1;
    const warn = [];
    if (w < MINW[d]) warn.push(`gana poco (${Math.round(w * 100)} %)`);
    if (wins.length && s2 / wins.length < 0.33) warn.push('2★ casi imposible');
    if (wins.length && !s3) warn.push('3★ no sale nunca');
    if (warn.length) bad++;
    console.log(`N${String(li + 1).padStart(2)} ${DN[d].padEnd(7)} gana ${String(Math.round(w * 100)).padStart(3)} %  piezas p25/50/75 ${pct(used, 0.25)}/${pct(used, 0.5)}/${pct(used, 0.75)}` +
      ` (~${Math.round(pct(used, 0.5) * 2.2)} s)  2★ ${wins.length ? Math.round(s2 / wins.length * 100) : 0} %  3★ ${wins.length ? Math.round(s3 / wins.length * 100) : 0} %` +
      (fu.length ? `  mecha mín ${fu[0]}` : '') + (Object.keys(why).length ? '  pierde ' + JSON.stringify(why) : '') + (warn.length ? '  ⚠ ' + warn.join(', ') : ''));
    sug[0][d] = pct(used, [0.8, 0.6, 0.5][d]); sug[1][d] = pct(masters, [0.45, 0.3, 0.25][d]);
  }
  if (tune) console.log(`     sugerido: s2: [${sug[0].join(', ')}], s3: [${sug[1].join(', ')}]   (tabla: s2 ${JSON.stringify(lv.s2)} s3 ${JSON.stringify(lv.s3)})`);
});
console.log(bad ? `\n${bad} avisos.` : '\nTodo correcto.', `(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exitCode = bad ? 1 : 0;
}
