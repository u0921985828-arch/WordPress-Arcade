/* Resolutor de los 20 almacenes de sokoban-warehouse (src/eng/soklv.js).
 *
 *   node scripts/check_soklv.js            comprueba los 20 y saca la tabla de mínimos
 *   node scripts/check_soklv.js 7          solo el nivel 7 (y escribe la solución)
 *
 * BFS en anchura sobre (jugador, cajas, fosos tapados [, gemas]) con las REGLAS DEL JUEGO
 * (SOKLV.parse/step/won del propio fichero de niveles): el óptimo que saca es óptimo en
 * MOVIMIENTOS del jugador, que es lo que cuenta el marcador.
 *   m   mínimo sin recoger gemas
 *   mg  mínimo recogiendo todas las gemas (igual a m si el nivel no tiene)
 * Además avisa si s2/s3 (los objetivos de estrella escritos a mano) no dejan margen sobre el
 * mínimo, y si algún nivel no tiene solución.
 */
const path = require('path');
const SOKLV = require(path.join(__dirname, '..', 'src', 'eng', 'soklv.js'));
const LVS = SOKLV['sokoban-warehouse'];
const DIRS = ['up', 'down', 'left', 'right'];

function solve(lv, withGems) {
  const { map, st } = SOKLV.parse(lv);
  const allG = (1 << map.gems.length) - 1;
  const need = withGems ? allG : 0;
  const start = SOKLV.hash(map, st, withGems);
  const seen = new Map([[start, null]]);
  let q = [st], d = 0;
  if (SOKLV.won(map, st) && (st.g & need) === need) return { d: 0, path: [] };
  while (q.length) {
    const nq = []; d++;
    for (let i = 0; i < q.length; i++) {
      const cur = q[i], ch = SOKLV.hash(map, cur, withGems);
      for (let j = 0; j < 4; j++) {
        const r = SOKLV.step(map, cur, DIRS[j]);
        if (!r) continue;
        const h = SOKLV.hash(map, r.st, withGems);
        if (seen.has(h)) continue;
        seen.set(h, [ch, DIRS[j]]);
        if (SOKLV.won(map, r.st) && (r.st.g & need) === need) {
          /* reconstruye */
          const out = []; let k = h;
          while (seen.get(k)) { const [pv, mv] = seen.get(k); out.push(mv); k = pv; }
          return { d: d, path: out.reverse(), states: seen.size };
        }
        nq.push(r.st);
      }
    }
    q = nq;
    if (seen.size > 6e6) return { d: -1, over: true, states: seen.size };
  }
  return { d: -1, states: seen.size };
}

const only = process.argv[2] ? +process.argv[2] : 0;
let bad = 0; const ROUTES = {};
console.log('lv  nombre                 m    mg   s2(f/n/d)      s3(f/n/d)      gemas estados');
for (let i = 0; i < LVS.length; i++) {
  const n = i + 1; if (only && n !== only) continue;
  const lv = LVS[i], { map } = SOKLV.parse(lv);
  const a = solve(lv, false);
  const b = map.gems.length ? solve(lv, true) : a;
  const ok2 = lv.s2.every((v, j) => v >= a.d) && lv.s2[0] >= lv.s2[1] && lv.s2[1] >= lv.s2[2];
  const ok3 = lv.s3.every((v, j) => v >= b.d) && lv.s3[0] >= lv.s3[1] && lv.s3[1] >= lv.s3[2];
  const flag = (a.d < 0 || b.d < 0 ? ' SIN SOLUCION' : '') + (ok2 ? '' : ' s2<min') + (ok3 ? '' : ' s3<min') +
    (lv.m !== a.d ? ` m=${lv.m}≠${a.d}` : '') + (lv.mg !== b.d ? ` mg=${lv.mg}≠${b.d}` : '');
  if (flag) bad++;
  console.log(String(n).padStart(2) + '  ' + lv.n.padEnd(22) + String(a.d).padStart(3) + '  ' +
    String(b.d).padStart(4) + '  ' + JSON.stringify(lv.s2).padEnd(14) + ' ' + JSON.stringify(lv.s3).padEnd(14) +
    ' ' + map.gems.length + '     ' + (a.states || 0) + flag);
  ROUTES[n] = { m: a.d, mg: b.d, path: a.path || [], pathG: b.path || [] };
  if (only) { console.log('  ruta sin gemas (' + a.d + '):', (a.path || []).join(' ')); if (map.gems.length) console.log('  ruta con gemas (' + b.d + '):', (b.path || []).join(' ')); }
}
if (process.env.SOK_JSON) require('fs').writeFileSync(process.env.SOK_JSON, JSON.stringify(ROUTES));
console.log(bad ? `\n${bad} nivel(es) con problemas` : '\nTodos los niveles resueltos y con margen en s2/s3.');
process.exit(bad ? 1 : 0);
