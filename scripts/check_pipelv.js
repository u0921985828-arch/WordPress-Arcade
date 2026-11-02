/* Verificador de los 20 tableros de pipe-connect (src/eng/pipelv.js).
 *
 *   node scripts/check_pipelv.js        comprueba los 20 y saca la tabla
 *   node scripts/check_pipelv.js 7      solo el nivel 7, con detalle del bot
 *
 * Usa las REGLAS DEL JUEGO del propio fichero de niveles (PIPELV.rules: parse, evalB, step, solve).
 * Comprueba en cada tablero:
 *   - formato: filas iguales, bocas coherentes con la planta (roca sin bocas, puente con las cuatro,
 *     válvula recta, casa con una sola boca, fuente con alguna) y que la solución guardada no tiene fugas;
 *   - SOLUCIÓN ÚNICA: el resolutor recorre todas las orientaciones posibles y encuentra exactamente
 *     una que cumple la regla del juego, y es la guardada (p);
 *   - que la posición de partida no está resuelta y cuántos giros hacen falta como mínimo;
 *   - los objetivos de 2★/3★ por dificultad (alcanzables: el mínimo los cumple por construcción);
 *   - con un BOT que juega con las mismas reglas del motor (el agua avanza con PIPELV.rules.step):
 *     arregla las casillas en orden de cercanía a la fuente con un ritmo humano por dificultad
 *     (pensar + girar), abre cada válvula cuando lo de detrás está listo, y tiene que terminar en las
 *     TRES dificultades sin fuga, mezcla, casa equivocada ni válvula reventada, con un margen de al
 *     menos 0,3 s entre arreglar una casilla y que le llegue el agua;
 *   - que la tabla tiene al menos 5 mecánicas presentadas de una en una y presión en ≥ 1/3.
 */
const path = require('path');
const PIPELV = require(path.join(__dirname, '..', 'src', 'eng', 'pipelv.js'));
const R = PIPELV.rules, LVS = PIPELV['pipe-connect'];

/* Ritmo del bot (segundos): pensar cada pieza que gira + cada giro. Fácil más lento, difícil más rápido. */
const THINK = [1.4, 1.1, 0.9], TAP = [0.4, 0.3, 0.25];

/* Orden de cercanía (en la solución) a las fuentes, por casillas. */
function order(B) {
  const dist = new Array(B.n).fill(1e9), q = [];
  for (const s of B.src) { dist[s] = 0; q.push(s); }
  while (q.length) { const i = q.shift(); for (let d = 0; d < 4; d++) if (B.sol[i] & (1 << d)) { const j = R.nb(B, i, d); if (j >= 0 && dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; q.push(j); } } }
  return { dist, list: [...Array(B.n).keys()].filter((i) => !B.rock[i]).sort((a, b) => dist[a] - dist[b] || a - b) };
}
/* Casillas que quedan detrás de cada válvula (no se llega a ellas desde la fuente sin cruzarla). */
function behind(B) {
  const out = {};
  for (let v = 0; v < B.n; v++) if (B.valve[v]) {
    const seen = new Uint8Array(B.n), q = [...B.src]; for (const s of q) seen[s] = 1;
    while (q.length) { const i = q.shift(); if (i === v) continue; for (let d = 0; d < 4; d++) if (B.sol[i] & (1 << d)) { const j = R.nb(B, i, d); if (j >= 0 && !seen[j]) { seen[j] = 1; q.push(j); } } }
    out[v] = [...Array(B.n).keys()].filter((i) => !B.rock[i] && !seen[i]);
  }
  return out;
}

/* Bot: devuelve { ok, why, t, slack, taps } */
function bot(lv, dif, verbose) {
  const B = R.parse(lv), m = R.start(B), clk = lv.w || 0, TS = R.TS[dif];
  const wt = clk ? clk[0] * TS : 0, ws = clk ? clk[1] * TS : 0, vh = (lv.vh || 0) * TS;
  const { list } = order(B), beh = behind(B);
  const S = R.wetStart(B); const done = new Uint8Array(B.n), fin = new Float64Array(B.n), wetT = new Float64Array(B.n).fill(-1);
  let T = 0, busy = 0, cur = -1, taps = 0, flowing = false, nextStep = wt, slack = 1e9, idx = 0;
  const DT = 0.01;
  const valveReady = (v) => beh[v].every((i) => B.fixed[i] || done[i]);
  for (let guard = 0; guard < 400 / DT; guard++) {
    /* acción del bot */
    if (T >= busy) {
      if (cur >= 0) {
        if (clk && R.wetCell(S, cur) && m[cur] !== B.sol[cur]) return { ok: false, why: 'el agua llegó antes a la casilla ' + cur, t: T };
        if (!(clk && R.wetCell(S, cur))) { m[cur] = B.sol[cur]; }
        done[cur] = 1; fin[cur] = T; cur = -1;
      }
      /* válvulas: se abren cuando lo de detrás está listo, o si la presión aprieta */
      let act = false;
      for (let v = 0; v < B.n && clk; v++) if (B.valve[v] && !S.open[v] && (valveReady(v) || (S.hold[v] > vh * 0.6))) { S.open[v] = 1; busy = T + TAP[dif]; taps++; act = true; break; }
      if (!act) {
        while (idx < list.length && (B.fixed[list[idx]] || done[list[idx]])) idx++;
        if (idx < list.length) { cur = list[idx]; const nd = R.need(B, m, cur); taps += nd; busy = T + THINK[dif] + TAP[dif] * nd; }
      }
    }
    /* agua */
    if (clk) {
      if (!flowing && T >= wt) { flowing = true; R.release(B, S); for (const s of B.src) { wetT[s] = T; if (m[s] !== B.sol[s]) return { ok: false, why: 'la fuente no estaba lista', t: T }; } }
      if (flowing && T >= nextStep) {
        nextStep += ws;
        const r = R.step(B, m, S);
        for (const u of r.fresh) { const i = u >> 1; if (wetT[i] < 0) { wetT[i] = T; if (done[i]) slack = Math.min(slack, T - fin[i]); } }
        if (r.fail) return { ok: false, why: r.fail.why + ' en la casilla ' + r.fail.i, t: T };
      }
      for (let v = 0; v < B.n; v++) if (B.valve[v] && !S.open[v] && S.wet[2 * v] >= 0) { S.hold[v] += DT; if (S.hold[v] >= vh) return { ok: false, why: 'revienta la válvula ' + v, t: T }; }
    }
    const ev = R.evalB(B, m, clk ? (i) => !S.open[i] : null);
    if (ev.ok) return { ok: true, t: T, slack: clk ? slack : null, taps, wt, ws };
    T += DT;
  }
  return { ok: false, why: 'no termina', t: T };
}

function format(lv) {
  const errs = [], h = lv.g.length, w = lv.g[0].length;
  for (const k of ['g', 'p', 'r']) { if (!lv[k] || lv[k].length !== h) errs.push(`${k}: ${lv[k] ? lv[k].length : 0} filas`); else lv[k].forEach((row, y) => { if (row.length !== w) errs.push(`${k}[${y}] mide ${row.length}`); }); }
  if (errs.length) return errs;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = lv.g[y][x], p = parseInt(lv.p[y][x], 16), r = +lv.r[y][x], at = `(${x},${y})`;
    if (!'.x#ABCabc+v'.includes(ch)) errs.push(`planta ${at} «${ch}»`);
    if (ch === '#' && p) errs.push(`roca con bocas ${at}`);
    if (ch !== '#' && !p) errs.push(`pieza sin bocas ${at}`);
    if (ch === '+' && p !== 15) errs.push(`puente que no es cruz ${at}`);
    if (ch === 'v' && p !== 5 && p !== 10) errs.push(`válvula no recta ${at}`);
    if ('abc'.includes(ch) && [1, 2, 4, 8].indexOf(p) < 0) errs.push(`casa con varias bocas ${at}`);
    if (ch !== '+' && p === 15) errs.push(`cruce de cuatro sin puente ${at}`);
    if (('x#+v'.includes(ch)) && r) errs.push(`pieza fija con giro ${at}`);
  }
  return errs;
}

if (require.main === module) {
  const only = +process.argv.slice(2).find((a) => /^\d+$/.test(a)) || 0;
  let bad = 0; const tab = [], seen = {}, intro = {};
  if (LVS.length !== 20) { console.log('AVISO: hay ' + LVS.length + ' tableros, no 20'); bad++; }
  let press = 0;
  LVS.forEach((lv, li) => {
    const n = li + 1; const errs = format(lv);
    if (lv.w) press++;
    /* mecánicas que aparecen por primera vez */
    const flat = lv.g.join(''), mech = { fija: /x/.test(flat), roca: /#/.test(flat), colores: (flat.match(/[ABC]/g) || []).length > 1, casas: /[abc]/.test(flat), puente: /\+/.test(flat), reloj: !!lv.w, valvula: /v/.test(flat) };
    for (const k in mech) if (mech[k] && !seen[k]) { seen[k] = n; (intro[n] = intro[n] || []).push(k); }
    if (only && only !== n) return;
    if (errs.length) { bad++; tab.push(`${String(n).padStart(2)} ${lv.n}: ${errs.join('; ')}`); return; }
    const B = R.parse(lv);
    const solEv = R.evalB(B, B.sol, null);
    if (!solEv.ok) errs.push('la solución guardada no cumple la regla');
    const t0 = Date.now(), r = R.solve(B, 2, 5e7), ms = Date.now() - t0;
    if (r.aborted) errs.push('resolutor sin terminar');
    else if (r.count !== 1) errs.push(r.count ? 'VARIAS soluciones' : 'SIN solución');
    else if (r.sols[0].some((v, i) => v !== B.sol[i])) errs.push('la única solución no es la guardada');
    const st = R.start(B); if (R.evalB(B, st, null).ok) errs.push('empieza resuelto');
    const gs = [0, 1, 2].map((d) => R.goals(B, d));
    const runs = [0, 1, 2].map((d) => bot(lv, d));
    runs.forEach((b, d) => { if (!b.ok) errs.push(`bot ${'FND'[d]}: ${b.why} (${b.t.toFixed(1)} s)`); else if (lv.w && b.slack < 0.3) errs.push(`bot ${'FND'[d]}: margen ${b.slack.toFixed(2)} s < 0,3`); });
    const fixedN = [...lv.g.join('')].filter((ch) => ch === 'x').length;
    if (errs.length) bad++;
    const fmt = (b) => (b.ok ? b.t.toFixed(0).padStart(3) + 's' + (lv.w ? '/' + b.slack.toFixed(1) : '') : ' --- ');
    tab.push(`${String(n).padStart(2)} ${(lv.n || '').padEnd(22)} ${B.w}x${B.h} fij ${String(fixedN).padStart(2)} min ${String(gs[1].min).padStart(3)} 2★ ${gs.map((g) => g.s2).join('/').padEnd(11)} 3★ ${gs.map((g) => g.s3).join('/').padEnd(11)} reloj ${lv.w ? lv.w.join('/') + (lv.vh ? ' v' + lv.vh : '') : '-'}`.padEnd(112) + ` bot F/N/D ${runs.map(fmt).join(' ')}  ${errs.length ? 'MAL: ' + errs.join('; ') : 'ÚNICA'} (${r.nodes} nodos, ${ms} ms)${intro[n] ? '  nuevo: ' + intro[n].join(', ') : ''}`);
    if (only) runs.forEach((b, d) => console.log('dif', d, JSON.stringify(b)));
  });
  console.log(tab.join('\n'));
  const nm = Object.keys(seen).length;
  if (!only) {
    console.log(`\nMecánicas: ${nm} (${Object.entries(seen).map(([k, v]) => k + ' n' + v).join(', ')}) · con reloj ${press}/20`);
    if (nm < 5) { console.log('AVISO: menos de 5 mecánicas'); bad++; }
    if (press * 3 < 20) { console.log('AVISO: presión en menos de 1/3'); bad++; }
    const multi = Object.values(intro).filter((a) => a.length > 1); if (multi.length) { console.log('AVISO: un nivel presenta dos mecánicas a la vez'); bad++; }
  }
  console.log(bad ? `\n${bad} tablero(s) con problemas` : '\nTodo correcto: los 20 tienen solución única y el bot los termina en las tres dificultades.');
  process.exit(bad ? 1 : 0);
}
module.exports = { bot, order, format };
