#!/usr/bin/env node
/* Verificador de los 20 niveles a mano de Burbujas Arcoíris.
 *
 * Usa LAS MISMAS reglas que el juego: recorta la zona pura <BU> … </BU> de
 * src/eng/burbujas.js y la evalúa tal cual (nada de reimplementar el motor). Después juega
 * cada nivel en las tres dificultades con un tirador que mira un disparo por delante y
 * comprueba que los 20 se superan, cuántos tiros gasta y si las estrellas son alcanzables.
 *
 *   node scripts/check_burblv.js [partidas=12] [cal]
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------- reglas puras del motor ---------- */
const eng = fs.readFileSync(path.join(ROOT, 'src/eng/burbujas.js'), 'utf8');
const a = eng.indexOf('/* <BU>'), b = eng.indexOf('/* </BU>');
if (a < 0 || b < 0) { console.error('No encuentro la zona pura <BU> en burbujas.js'); process.exit(1); }
const mod = { exports: {} };
new Function('module', 'exports', eng.slice(a, b))(mod, mod.exports);
const BU = mod.exports.BU;
if (!BU) { console.error('La zona pura no exporta BU'); process.exit(1); }

const BURBLV = new Function(fs.readFileSync(path.join(ROOT, 'src/eng/burblv.js'), 'utf8') + '\n;return BURBLV;')();
const TABLE = BURBLV['burbujas-arcoiris'];

/* ---------- azar reproducible ---------- */
function mulberry(seed) { let x = seed >>> 0; return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- márgenes por dificultad (idénticos a loadLevel() del motor) ---------- */
const D3 = (v, d, def) => (Array.isArray(v) ? v[d] : (v == null ? def : v));
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
function margins(L, d) {
  return {
    cols: clamp((L.cols || 3) + (d === 0 ? -1 : d === 2 ? 1 : 0), 3, 6),
    push: L.push ? Math.max(3, D3(L.push, d, 0)) : 0,
    sec: L.sec ? Math.max(4, D3(L.sec, d, 0)) : 0,
    ammo: Math.max(1, D3(L.shots, d, 24)),
    par: (L.par && L.par[d]) || [Math.round(D3(L.shots, d, 24) * 0.8), Math.round(D3(L.shots, d, 24) * 0.6)],
    mast: L.mast ? D3(L.mast, d, 0) : 0,
    need: L.need ? D3(L.need, d, 0) : 0,
    boss: L.boss ? D3(L.boss, d, 0) : 0,
  };
}

/* ---------- clonado del estado ---------- */
function clone(S) {
  const G = new Array(S.G.length);
  for (let r = 0; r < S.G.length; r++) {
    const row = S.G[r], out = new Array(row.length);
    for (let i = 0; i < row.length; i++) { const q = row[i]; out[i] = q ? { c: q.c, t: q.t, pop: q.pop, hp: q.hp } : null; }
    G[r] = out;
  }
  return { G, par: S.par, cols: S.cols, freed: S.freed, dropped: S.dropped, treas: S.treas, combos: S.combos, drops: S.drops, bossHp: S.bossHp, bossMax: S.bossMax };
}

/* ---------- el tirador ---------- */
const NA = 131, A0 = -1.30, A1 = 1.30;
/* Peso de una jugada: manda el objetivo, después lo que revienta y baja, y se castiga
   acercarse a la línea rosa (igual que castiga el juego). */
function evalMove(S0, S1, L, M, put) {
  const g = L.goal;
  let v = 0;
  v += (S1.dropped - S0.dropped) * 260;
  v += (S1.freed - S0.freed) * 260;
  v += (S1.treas - S0.treas) * 220;
  v += (S1.combos - S0.combos) * (g === 'combo' ? 300 : 60);
  if (g === 'boss') v += (S0.bossHp - S1.bossHp) * 320;
  v += (lockHp(S0) - lockHp(S1)) * 190;
  /* castiga dejar burbujas solas: en «limpiar» son las que arruinan la partida */
  const w = g === 'clear' ? 1 : 0.35;
  v -= (lone(S1) - lone(S0)) * 26 * w;
  if (g === 'clear') v += (BU.left(S0) - BU.left(S1)) * 34;
  else v += (BU.left(S0) - BU.left(S1)) * 9;
  /* altura del montón: cuanto más abajo llega, peor (la línea rosa mata) */
  let deep = 0;
  for (let r = S1.G.length - 1; r >= 0; r--) { let any = 0; for (let i = 0; i < S1.G[r].length; i++) if (S1.G[r][i]) { any = 1; break; } if (any) { deep = r; break; } }
  v -= deep * (g === 'hold' ? 26 : 12);
  if (put.t === 'b') v -= 40;                     // no gastar la bomba en tonterías
  return v;
}
function lockHp(S) { let n = 0; for (let r = 0; r < S.G.length; r++) for (let i = 0; i < S.G[r].length; i++) { const q = S.G[r][i]; if (q && q.t === 'k') n += q.hp; } return n; }
/* Burbujas cuyo racimo de color mide 1 o 2: las que cuesta un mundo limpiar. */
function lone(S) {
  const seen = new Set(); let n = 0;
  for (let r = 0; r < S.G.length; r++) for (let i = 0; i < S.G[r].length; i++) {
    const q = S.G[r][i]; if (!q || !BU.MATCH[q.t] || seen.has(r + ',' + i)) continue;
    const cl = BU.cluster(S, r, i, q.c);
    for (const [a, b] of cl) seen.add(a + ',' + b);
    if (cl.length === 1) n += 2; else if (cl.length === 2) n += 1;
  }
  return n;
}
function bestMove(S, L, M, put) {
  const occ = BU.occOf(S, 0), seen = new Map();
  for (let n = 0; n < NA; n++) {
    const ang = A0 + (A1 - A0) * n / (NA - 1);
    const cell = BU.traceOcc(S, ang, 0, 6, occ);
    if (!cell) continue;
    const key = cell[0] + ',' + cell[1];
    if (!seen.has(key)) seen.set(key, { cell, ang });
  }
  BU.trimRows(S);
  let best = null, bv = -1e18;
  for (const { cell, ang } of seen.values()) {
    const S2 = clone(S);
    BU.land(S2, cell[0], cell[1], put);
    const v = evalMove(S, S2, L, M, put);
    if (v > bv) { bv = v; best = { cell, ang, S2 }; }
  }
  return best;
}

/* ---------- una partida ---------- */
/* Tiempo: 2,3 s por disparo (apuntar + vuelo + reventón) y 0,6 s más por derrumbe. */
function play(L, d, seed) {
  const M = margins(L, d), rnd = mulberry(seed);
  const S = BU.load(L, M.cols, M.boss); S.need = M.need;
  let ammo = M.ammo, ammo0 = M.ammo, shots = M.push, life = 0, secT = M.sec, time = 0;
  const pick = () => {
    const sp = L.spec || null;
    if (sp) { const q = rnd(); if (q < (sp.b || 0)) return { c: -1, t: 'b' }; if (q < (sp.b || 0) + (sp.r || 0)) return { c: -1, t: 'r' }; }
    const live = BU.liveColors(S);
    return { c: live.length ? live[Math.floor(rnd() * live.length)] : Math.floor(rnd() * M.cols), t: 'n' };
  };
  const push = () => { S.cols = M.cols; BU.push(S, rnd); shots = M.push; secT = M.sec; };
  for (let turn = 0; turn < 400; turn++) {
    if (BU.goalDone(S, L)) break;
    if (ammo <= 0) {
      if (!life && d >= 0 && L.__lv >= 11) { life = 1; const n = d === 0 ? 7 : 5; ammo += n; ammo0 += n; }
      else return { win: false, why: 'tiros', used: ammo0 - (ammo < 0 ? 0 : ammo), time, S, life };
    }
    const put = pick();
    const mv = bestMove(S, L, M, put);
    ammo--;
    let dt = 2.3;
    if (!mv) { time += dt; continue; }
    const before = BU.left(S);
    BU.land(S, mv.cell[0], mv.cell[1], put);
    if (BU.left(S) < before - 4) dt += 0.6;
    time += dt;
    if (M.push && --shots <= 0) push();
    if (M.sec) { secT -= dt; while (secT <= 0) { push(); secT -= 0; break; } }
    if (BU.goalDone(S, L)) break;
    if (BU.crossed(S, 0)) return { win: false, why: 'linea', used: ammo0 - ammo, time, S, life };
  }
  if (!BU.goalDone(S, L)) return { win: false, why: 'vueltas', used: ammo0 - ammo, time, S, life };
  const used = ammo0 - ammo, tre = BU.totals(L).tre;
  let stars = 1;
  if (used <= M.par[0]) stars = (used <= M.par[1] && !life && S.treas >= tre && S.combos >= M.mast) ? 3 : 2;
  return { win: true, used, time, S, stars, life };
}

/* ---------- comprobaciones estáticas ---------- */
let warn = 0;
const NAMES = ['fácil', 'normal', 'difícil'];
TABLE.forEach((L, i) => { L.__lv = i + 1; });
for (const L of TABLE) {
  const M1 = margins(L, 1), S = BU.load(L, M1.cols, M1.boss); S.need = M1.need;
  if (BU.crossed(S, 0)) { console.log(`AVISO L${L.__lv}: el montón inicial ya cruza la línea rosa`); warn++; }
  const tre = BU.totals(L).tre;
  if (L.goal === 'boss' && !L.boss) { console.log(`AVISO L${L.__lv}: objetivo 'boss' sin vida de jefe`); warn++; }
  { /* nada puede empezar colgando en el aire: se caería solo al primer reventón */
    const T = clone(S), loose = BU.detach(T);
    if (loose.length) { console.log(`AVISO L${L.__lv}: ${loose.length} casillas sin sujeción al cargar (${loose.map((q) => q.r + ',' + q.i).join(' ')})`); warn++; }
  }
  if (L.goal === 'rescue' || L.goal === 'drop') {
    let have = 0;
    for (const row of L.m) for (const ch of row) if (L.goal === 'rescue' ? 'ABCDEF'.indexOf(ch) >= 0 : ch === 'o') have++;
    const nd = Math.max(...[0,1,2].map((d) => margins(L, d).need));
    if (have < nd) { console.log(`AVISO L${L.__lv}: pide ${nd} y solo hay ${have} en el mapa`); warn++; }
  }
  if (L.mast && L.mast > 0 && L.goal === 'combo' && L.mast > L.need) { console.log(`AVISO L${L.__lv}: maestría por encima del objetivo`); warn++; }
  if (tre === 0 && /\+/.test(L.m.join(''))) { console.log(`AVISO L${L.__lv}: tesoros mal contados`); warn++; }
}

/* ---------- informe ---------- */
const N = parseInt(process.argv[2] || '12', 10);
const CAL = process.argv.indexOf('cal') > 0;
for (const L of TABLE) {
  const cells = [];
  for (let d = 0; d < 3; d++) {
    let win = 0, s2 = 0, s3 = 0, us = 0, tm = 0, fails = {};
    for (let n = 0; n < N; n++) {
      const r = play(L, d, 1000 + L.__lv * 977 + d * 131 + n * 7717);
      if (r.win) { win++; us += r.used; tm += r.time; if (r.stars >= 2) s2++; if (r.stars >= 3) s3++; }
      else fails[r.why] = (fails[r.why] || 0) + 1;
    }
    const pc = (v) => Math.round(v * 100 / N) + '%';
    const M = margins(L, d);
    cells.push(`${NAMES[d]} ${pc(win)} (★★ ${pc(s2)} ★★★ ${pc(s3)}, ${win ? (us / win).toFixed(1) : '-'} tiros de ${M.ammo}, ${win ? Math.round(tm / win) : '-'} s${Object.keys(fails).length ? ', ' + JSON.stringify(fails) : ''})`);
    if (win < N) warn++;
  }
  console.log(String(L.__lv).padStart(2) + ' ' + (L.name || '').padEnd(22) + ' ' + cells.join(' | '));
}
console.log('');
console.log(warn ? warn + ' avisos' : 'Todo correcto');
process.exit(0);
