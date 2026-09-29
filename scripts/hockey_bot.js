/* Bot de referencia del torneo de air-hockey (docs/VARA.md).
 * Juega los 20 partidos de hockeylv.js en las 3 dificultades con la física pura de HKSIM y
 * comprueba que se ganan y que los objetivos de 2 estrellas son alcanzables.
 *   node scripts/hockey_bot.js [repeticiones]
 */
const { HOCKEYLV, HKSIM } = require('../src/eng/hockeylv.js');
const N = parseInt(process.argv[2] || '12', 10);
const T = HOCKEYLV['air-hockey'];
let bad = 0;
for (let dif = 0; dif < 3; dif++) {
  const row = [];
  for (let i = 0; i < T.length; i++) {
    const lv = T[i];
    let win = 0, s2 = 0, s3 = 0, enc = 0;
    for (let r = 0; r < N; r++) {
      const m = HKSIM.match(lv, dif, 1000 + i * 97 + r * 7919, {});
      if (m.win) win++;
      enc += m.ai;
      const l2 = lv.s2 + (dif === 0 ? 1 : dif === 2 ? -1 : 0);
      const l3 = Math.max(0, lv.s3 + (dif === 0 ? 1 : dif === 2 ? -1 : 0));
      if (m.win && m.ai <= l2) s2++;
      if (m.win && m.ai <= l3) s3++;
    }
    const pw = win / N;
    const flag = pw < 0.8 ? ' <-- GANA POCO' : s2 / N < 0.4 ? ' <-- 2* DURO' : '';
    if (flag) bad++;
    row.push(`${String(i + 1).padStart(2)} ${lv.n.padEnd(10)} win ${(pw * 100).toFixed(0).padStart(3)}% 2* ${(s2 / N * 100).toFixed(0).padStart(3)}% 3* ${(s3 / N * 100).toFixed(0).padStart(3)}% enc ${(enc / N).toFixed(1)}${flag}`);
  }
  console.log('=== dificultad ' + dif + ' ===');
  console.log(row.join('\n'));
}
console.log(bad ? `\nFALLOS: ${bad}` : '\nOK: los 20 se ganan en las 3 dificultades con 2* alcanzable');
process.exit(bad ? 1 : 0);
