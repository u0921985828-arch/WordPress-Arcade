/* Verificador de la campaña de tower-guard (docs/VARA.md).
 * Comprueba que los 20 mapas están bien dibujados (camino conexo de cada entrada a la meta) y
 * que se superan con una defensa razonable en las 3 dificultades, con las estrellas alcanzables.
 *   node scripts/td_bot.js
 */
const { TDLV, TDSIM } = require('../src/eng/tdlv.js');
const T = TDLV['tower-guard'];
let bad = 0;
/* --- 1) el mapa --- */
T.forEach((lv, i) => {
  const n = i + 1;
  if (lv.m.length !== 8 || lv.m.some((r) => r.length !== 12)) { console.log(`${n} ${lv.n}: MAPA con medidas raras`); bad++; return; }
  const M = TDSIM.parse(lv.m);
  if (!M.goal) { console.log(`${n} ${lv.n}: sin meta`); bad++; return; }
  if (!M.ent.length) { console.log(`${n} ${lv.n}: sin entrada`); bad++; return; }
  if (M.ent.some((e) => e[0] !== 0)) { console.log(`${n} ${lv.n}: entrada fuera del borde izquierdo`); bad++; }
  if (M.goal[0] !== 11) { console.log(`${n} ${lv.n}: meta fuera del borde derecho`); bad++; }
  if (M.paths.some((p) => !p)) { console.log(`${n} ${lv.n}: una entrada no llega a la meta`); bad++; }
  const build = lv.m.join('').split('').filter((ch) => ch === '.' || ch === 'o').length;
  if (build < 24) { console.log(`${n} ${lv.n}: solo ${build} casillas donde construir`); bad++; }
  lv.w.forEach((w) => TDSIM.spawnList(w));
});
/* --- 2) las oleadas --- */
for (let dif = 0; dif < 3; dif++) {
  console.log('=== dificultad ' + dif + ' ===');
  T.forEach((lv, i) => {
    const r = TDSIM.run(lv, dif);
    const s2 = Math.min(lv.lives - 1, Math.max(1, lv.s2 + (dif === 0 ? 1 : dif === 2 ? -1 : 0)));
    const ok = r.win && r.lives >= s2;
    if (!ok) bad++;
    console.log(`${String(i + 1).padStart(2)} ${lv.n.padEnd(22)} ${r.win ? 'gana' : 'PIERDE ol.' + r.wave} vidas ${String(r.lives).padStart(2)}/${lv.lives} torres ${r.towers || 0} oro ${r.gold || 0}${ok ? '' : '   <-- ' + (r.win ? 'sin 2★' : 'NO SUPERA')}`);
  });
}
console.log(bad ? `\nFALLOS: ${bad}` : '\nOK: los 20 mapas se superan en las 3 dificultades con 2★ alcanzable');
process.exit(bad ? 1 : 0);
