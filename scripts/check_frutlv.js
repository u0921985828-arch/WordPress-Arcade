#!/usr/bin/env node
/* Verificador de los 20 niveles a mano de Fusión de Frutas.
 *
 * Usa LAS MISMAS reglas que el juego: carga src/eng/frutlv.js (zona pura FU: física, fusiones,
 * piedras, hielo, bombas y objetivos) tal cual, sin reimplementar nada. Juega cada nivel en las
 * tres dificultades con un jugador que prueba cada sitio posible para la fruta que le toca,
 * deja correr la física un segundo y se queda con el mejor; después deja pasar el tiempo de un
 * humano (TEMPO s por fruta) antes de soltar la siguiente.
 *
 * Comprueba que los 20 se superan, cuántas frutas gasta, cuánto dura a ritmo humano y si las
 * dos y tres estrellas (frutas usadas ≤ par, sin aviso de rebose) son alcanzables.
 *
 *   node scripts/check_frutlv.js [partidas=6] [nivel]
 */
const path = require('path');
const { FU, FRUTLV } = require(path.join(__dirname, '..', 'src/eng/frutlv.js'));
const TABLE = FRUTLV['fusion-de-frutas'];
const TEMPO = 1.5;           // segundos por fruta a ritmo humano (mover, apuntar, soltar)
const LOOK = 1.0;            // segundos de física que mira por delante cada candidato
const PEN_N = 25, PEN_M = 0.5; // castigo por pieza suelta y premio por masa en piezas grandes
/* DBG=1 imprime cada jugada; DUMP=1 enseña el tarro cuando el jugador se queda sin frutas. */

function topY(S) { let y = 1e9; for (const b of S.b) if (!b.fz && b.t !== FU.BOMB) y = Math.min(y, b.y - b.r); return y; }
function rimGap(S) { let g = 1e9; for (const b of S.b) if (!b.fz && b.t !== FU.BOMB) g = Math.min(g, FU.CEN.R - (Math.hypot(b.x - FU.CEN.x, b.y - FU.CEN.y) + b.r)); return g; }

function evalS(S0, S1, L, M, code) {
  if (S1.over) return -1e9;
  let v = 0;
  const h0 = FU.have(S0, L), h1 = FU.have(S1, L);
  const gw = L.goal === 'score' ? 1.2 : L.goal === 'reach' ? 4000 : 900;
  v += (Math.min(h1, M.need) - Math.min(h0, M.need)) * gw;
  v += (S1.score - S0.score) * 0.8;
  /* espacio libre: cuanto más alto el montón, peor */
  if (S1.orb) { const g = rimGap(S1); v -= Math.max(0, 70 - g) * 9; }
  else { const y = topY(S1), lim = S1.line + 150; v -= Math.max(0, lim - y) * 6; }
  v -= S1.danger * 500;
  /* menos piezas = más fundido; y premia tener piezas grandes */
  let nb = 0, mass = 0; for (const b of S1.b) if (b.t >= 0 && !b.fz) { nb++; mass += (1 << b.t) * b.t; }
  v -= nb * PEN_N; v += mass * PEN_M;
  /* parejas a punto: dos iguales cerca valen algo; más si son grandes */
  const B = S1.b;
  for (let i = 0; i < B.length; i++) {
    const a = B[i]; if (a.t < 0 || a.fz) continue;
    for (let j = i + 1; j < B.length; j++) {
      const b = B[j]; if (b.t !== a.t || b.fz) continue;
      const gap = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
      if (gap < 30) v += (6 + a.t * 5) * (1 - gap / 30);
    }
    /* fruta pegada al hielo: lo próximo que funda a su lado lo libera */
    for (const o of B) if (o.fz) { const gap = Math.hypot(a.x - o.x, a.y - o.y) - a.r - o.r; if (gap < 16) v += a.t >= o.t - 1 ? 34 : 6; }
  }
  /* la bomba, cerca de las piedras */
  if (code === FU.BOMB) v += (S1.broke - S0.broke) * 600;
  /* fruta pequeña enterrada bajo una grande: mala señal */
  if (!S1.orb) for (const a of B) if (a.t >= 0 && !a.fz) for (const b of B) if (b.t > a.t + 2 && !b.fz && b.y < a.y - a.r && Math.abs(b.x - a.x) < b.r) v -= 6;
  return v;
}
function candidates(S, code) {
  const out = [];
  if (S.orb) { for (let i = 0; i < 28; i++) out.push(-Math.PI / 2 + i * 2 * Math.PI / 28); return out; }
  const r = FU.radOf(code), lo = FU.BOX.l + r + 1, hi = FU.BOX.r - r - 1, n = 15;
  for (let i = 0; i < n; i++) out.push(lo + (hi - lo) * i / (n - 1));
  return out;
}
function play(L, d, seed, cal) {
  const M = FU.margins(L, d); if (cal) { M.n = 160; M.sec = 0; }
  const S = FU.load(L, d), seq = FU.seqOf(L, cal ? 160 : Math.max(...[].concat(L.n))), rnd = FU.rng(seed * 7919 + 13);
  let used = 0, time = 0;
  while (!FU.done(S, L, d)) {
    if (S.over) return { win: false, why: 'rebosa', used, time, S };
    if (M.sec && time >= M.sec) return { win: false, why: 'reloj', used, time, S };
    if (used >= M.n) {
      /* sin frutas: se espera a que el tarro se calme (las últimas fusiones aún cuentan) */
      for (let w = 0; w < 6 && !FU.done(S, L, d) && !S.over; w++) { FU.run(S, 0.5); time += 0.5; if (FU.calm(S) && w >= 2) break; }
      if (FU.done(S, L, d)) break;
      if (process.env.DUMP) console.log('ATASCO', S.b.map((b) => b.t + (b.fz ? '*' : '') + '@' + Math.round(b.x) + ',' + Math.round(b.y)).join(' '));
      return { win: false, why: 'frutas', used, time, S };
    }
    const code = seq[used];
    let best = null, bv = -1e18;
    for (const pos of candidates(S, code)) {
      const S2 = FU.clone(S); FU.drop(S2, code, pos); FU.run(S2, LOOK);
      const v = evalS(S, S2, L, M, code) + rnd() * 15;   // algo de ruido: cada partida es un jugador distinto
      if (v > bv) { bv = v; best = pos; }
    }
    if (process.env.DBG) console.log(used, code, Math.round(best), Math.round(bv), S.b.length, S.score);
    /* pulso humano: no suelta exactamente donde quería */
    best += S.orb ? (rnd() - 0.5) * 0.08 : (rnd() - 0.5) * 14;
    FU.drop(S, code, best); used++;
    /* el reloj del juego corre mientras la física se mueve */
    const n = Math.round(TEMPO / FU.SUB);
    for (let i = 0; i < n && !S.over; i++) { FU.step(S, FU.SUB); if (FU.done(S, L, d)) break; }
    time += TEMPO;
  }
  return { win: true, used, time, S, warned: S.warned };
}

const N = +process.argv[2] || 6, ONLY = +process.argv[3] || 0, CAL = process.argv.includes('cal');
if (CAL) {
  /* Calibrado: frutas sin límite y sin reloj; dice cuántas gasta el jugador para escribir n, par y sec. */
  for (let li = 0; li < TABLE.length; li++) {
    if (ONLY && ONLY !== li + 1) continue;
    const L = TABLE[li], out = [];
    for (let d = 0; d < 3; d++) {
      const u = [], w = []; let fail = 0;
      for (let s = 1; s <= N; s++) { const r = play(L, d, s + li * 100 + d * 1000, 1); if (r.win) { u.push(r.used); if (r.warned) w.push(1); } else fail++; }
      u.sort((a, b) => a - b);
      const q = (p) => (u.length ? u[Math.min(u.length - 1, Math.floor(p * u.length))] : '-');
      out.push(`${['F', 'N', 'D'][d]} p10 ${q(0.1)} p25 ${q(0.25)} p50 ${q(0.5)} p90 ${q(0.9)} max ${q(0.999)} avisos ${w.length} fallos ${fail}`);
    }
    console.log(String(li + 1).padStart(2), L.name.padEnd(22), out.join(' | '));
  }
  process.exit(0);
}
const DN = ['fácil', 'normal', 'difícil'];
let bad = 0;
const t0 = Date.now();
for (let li = 0; li < TABLE.length; li++) {
  if (ONLY && ONLY !== li + 1) continue;
  const L = TABLE[li];
  const row = [];
  for (let d = 0; d < 3; d++) {
    const M = FU.margins(L, d);
    let wins = 0, s2 = 0, s3 = 0, u = [], tm = [], why = {};
    for (let s = 1; s <= N; s++) {
      const r = play(L, d, s + li * 100 + d * 1000);
      if (r.win) { wins++; u.push(r.used); tm.push(r.time); if (r.used <= M.par2) s2++; if (r.used <= M.par3 && !r.warned) s3++; }
      else why[r.why] = (why[r.why] || 0) + 1;
    }
    u.sort((a, b) => a - b); tm.sort((a, b) => a - b);
    const med = (a) => (a.length ? a[a.length >> 1] : '-');
    const pct = Math.round(wins / N * 100);
    const flag = (pct < 80 || (wins && s2 === 0)) ? '  <<<' : '';
    if (flag) bad++;
    row.push(`${DN[d]} ${pct}% usa ${med(u)}/${M.n} (★★≤${M.par2} ${s2}/${N}, ★★★≤${M.par3} ${s3}/${N}) ${med(tm)}s${Object.keys(why).length ? ' fallos ' + JSON.stringify(why) : ''}${flag}`);
  }
  console.log(`${String(li + 1).padStart(2)} ${L.name}\n    ${row.join('\n    ')}`);
}
console.log(bad ? `\n${bad} filas por ajustar` : '\nTodo correcto: los niveles se superan y las ★★ son alcanzables.');
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(bad ? 1 : 0);
