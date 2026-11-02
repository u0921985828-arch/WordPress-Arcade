/* Resolutor de las 20 estanterías de color-sort (src/eng/sortlv.js).
 *
 *   node scripts/check_sortlv.js          comprueba los 20 y saca la tabla de mínimos
 *   node scripts/check_sortlv.js 7        solo el nivel 7 (y escribe la solución)
 *
 * A* con la cota admisible «tramos de color − colores» (cada vertido quita como mucho un tramo)
 * sobre los estados del juego, con las REGLAS DEL JUEGO (SORTLV.parse/pour/won del propio fichero
 * de niveles): el mínimo que saca es óptimo en VERTIDOS, que es lo que cuenta el marcador.
 * Comprueba además:
 *   - que cada color tiene 4 bolas y que hay sitio para completarlo (un tubo de capacidad ≥ 4
 *     sin candado de ese mismo color);
 *   - que m (escrito a mano) coincide con el mínimo demostrado;
 *   - que s2 ≥ m en las tres dificultades y va de más a menos holgado;
 *   - que el límite de vertidos (lim) deja margen sobre s2 y el reloj (tm) da al menos 4 s por
 *     vertido mínimo;
 *   - que el óptimo usa cada artilugio que el nivel presenta como nuevo (candado, un solo uso,
 *     tubo de otra capacidad): la idea del nivel tiene que hacer falta.
 * Al final reproduce cada solución paso a paso con SORTLV.pour (una segunda verdad no hace falta,
 * pero así se demuestra que la ruta escrita es jugable).
 */
const path = require('path');
const SORTLV = require(path.join(__dirname, '..', 'src', 'eng', 'sortlv.js'));
const LVS = SORTLV['color-sort'];

const only = process.argv[2] ? +process.argv[2] : 0;
let bad = 0, presion = 0; const ROUTES = {};
console.log('lv  nombre                  m   s2(f/n/d)    lim(f/n/d)   reloj(f/n/d)   tubos colores nodos');
for (let i = 0; i < LVS.length; i++) {
  const n = i + 1; if (only && n !== only) continue;
  const lv = LVS[i], { map, st } = SORTLV.parse(lv), errs = [];
  for (const c of map.cols) {
    if (c !== '*' && map.cnt[c] !== 4) errs.push(`${c}=${map.cnt[c]} bolas`);
    if (!map.tubes.some((tb) => tb.cap >= map.cnt[c] && tb.lock !== c)) errs.push(`sin tubo para ${c}`);
  }
  const t0 = Date.now(), r = SORTLV.solve(map, st, { cap: 8e6 });
  if (!r) errs.push('SIN SOLUCION');
  const m = r ? r.d : -1;
  if (lv.m !== m) errs.push(`m=${lv.m}≠${m}`);
  const okS2 = lv.s2.every((v) => v >= m) && lv.s2[0] >= lv.s2[1] && lv.s2[1] >= lv.s2[2];
  if (!okS2) errs.push('s2<min');
  if (lv.lim) { presion++; if (!lv.lim.every((v, d) => v > lv.s2[d])) errs.push('lim≤s2'); }
  if (lv.tm) { presion++; if (!lv.tm.every((v) => v >= m * 4)) errs.push('reloj corto'); }
  if (lv.lim && lv.tm) presion--;
  if (r) {
    /* la ruta se reproduce con las reglas del juego */
    let s = st;
    for (const [a, b] of r.path) { const q = SORTLV.pour(map, s, a, b); if (!q) { errs.push('ruta rota'); break; } s = q.st; }
    if (!SORTLV.won(map, s)) errs.push('la ruta no gana');
    /* cada artilugio del nivel aparece en la ruta óptima */
    const touched = new Set(); r.path.forEach(([a, b]) => { touched.add(a); touched.add(b); });
    map.tubes.forEach((tb, j) => {
      if ((tb.lock || tb.one || tb.cap !== SORTLV.CAP) && !touched.has(j)) errs.push(`tubo ${j} (${tb.lock ? 'candado' : tb.one ? 'un uso' : 'cap ' + tb.cap}) sin usar`);
    });
  }
  if (errs.length) bad++;
  const f = (a) => (a ? JSON.stringify(a) : '-').padEnd(13);
  console.log(String(n).padStart(2) + '  ' + lv.n.padEnd(22) + String(m).padStart(3) + '  ' + f(lv.s2) + f(lv.lim) + f(lv.tm) + '  ' +
    String(map.tubes.length).padStart(4) + ' ' + String(map.cols.length).padStart(6) + ' ' + String(r ? r.n : 0).padStart(6) +
    ` ${Date.now() - t0}ms` + (errs.length ? '  ** ' + errs.join(', ') : ''));
  ROUTES[n] = r ? r.path : [];
  if (only && r) console.log('  ruta (' + m + '): ' + r.path.map((p) => p[0] + '>' + p[1]).join(' '));
}
if (process.env.SORT_JSON) require('fs').writeFileSync(process.env.SORT_JSON, JSON.stringify(ROUTES));
if (!only) console.log(`\nNiveles con presión (límite o reloj): ${presion} de ${LVS.length}` + (presion * 3 >= LVS.length ? '' : '  ** menos de un tercio'));
if (!only && presion * 3 < LVS.length) bad++;
console.log(bad ? `\n${bad} problema(s)` : '\nTodos los niveles resueltos, con su mínimo demostrado y margen en s2.');
process.exit(bad ? 1 : 0);
