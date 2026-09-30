/* Verificación por BFS de los 20 tableros a mano de serpent-grid (snakelv.js).
 * Para cada nivel, en las DOS orientaciones (horizontal 17×13 y el mismo dibujo girado 90°,
 * que es lo que se juega en vertical) y en DOS escenarios (suelo frágil intacto y suelo
 * frágil hundido del todo, el peor caso), comprueba:
 *   1. hay una sola salida S y, si el objetivo pide puerta, una sola E;
 *   2. toda casilla libre tiene al menos DOS vecinas libres (nada de callejones sin salida);
 *   3. el suelo libre es conexo: desde la cabeza se llega a todas las llaves, gemas, a la
 *      puerta y a cualquier casilla donde pueda salir una manzana;
 *   4. hay pista libre por delante de la serpiente al arrancar (4 casillas en su dirección);
 *   5. los bichos de ronda (P) y el cazador (C) arrancan en casilla libre, y el carril del
 *      bicho tiene al menos 3 casillas por las que ir y volver;
 *   6. queda sitio de sobra para el objetivo de longitud.
 * Uso: node scripts/check_snakelv.js
 */
const LV = require('../src/eng/snakelv.js')['serpent-grid'];
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const RCW = { right: 'down', down: 'left', left: 'up', up: 'right' };
const WRAP_CW = { '': '', x: 'y', y: 'x', xy: 'xy' };
const rot = (m) => { const R = m.length, C = m[0].length, o = []; for (let x = 0; x < C; x++) { let s = ''; for (let y = R - 1; y >= 0; y--) s += m[y][x]; o.push(s); } return o; };
let bad = 0;
const fail = (n, tag, msg) => { console.log(`  x nivel ${n} [${tag}]: ${msg}`); bad++; };

function check(n, L, m, wrap, dir, sunk, tag) {
  const ROWS = m.length, COLS = m[0].length;
  const wrapX = wrap.indexOf('x') >= 0, wrapY = wrap.indexOf('y') >= 0;
  const at = (x, y) => m[y][x];
  const wall = (x, y) => {
    if (wrapX) x = (x + COLS) % COLS;
    if (wrapY) y = (y + ROWS) % ROWS;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
    const ch = at(x, y);
    return ch === '#' || (sunk && ch === '~');
  };
  const nb = (x, y) => {
    const o = [];
    for (const d of Object.values(DIRS)) {
      let nx = x + d[0], ny = y + d[1];
      if (wrapX) nx = (nx + COLS) % COLS;
      if (wrapY) ny = (ny + ROWS) % ROWS;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (wall(nx, ny)) continue;
      o.push([nx, ny]);
    }
    return o;
  };
  let S = null, E = null, nS = 0, nE = 0;
  const keys = [], gems = [], pats = [], hunts = [];
  let free = 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = at(x, y);
    if (ch === 'S') { S = [x, y]; nS++; }
    if (ch === 'E') { E = [x, y]; nE++; }
    if (ch === 'K') keys.push([x, y]);
    if (ch === 'G') gems.push([x, y]);
    if (ch === 'P') pats.push([x, y]);
    if (ch === 'C') hunts.push([x, y]);
    if (!wall(x, y)) free++;
  }
  if (nS !== 1) fail(n, tag, `hay ${nS} salidas S (debe haber 1)`);
  if ((L.go.exit ? 1 : 0) !== nE) fail(n, tag, `puerta E mal: go.exit=${!!L.go.exit} y hay ${nE}`);
  if (!S) return;
  // 2. sin callejones
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (wall(x, y)) continue;
    if (nb(x, y).length < 2) fail(n, tag, `callejon sin salida en (${x},${y})`);
  }
  // 3. conexo
  const seen = new Set([S.join()]), q = [S];
  while (q.length) { const [x, y] = q.pop(); for (const [nx, ny] of nb(x, y)) { const kk = nx + ',' + ny; if (!seen.has(kk)) { seen.add(kk); q.push([nx, ny]); } } }
  if (seen.size !== free) fail(n, tag, `suelo no conexo: ${seen.size} de ${free} casillas alcanzables`);
  for (const [x, y] of keys) if (!seen.has(x + ',' + y)) fail(n, tag, `llave (${x},${y}) inalcanzable`);
  for (const [x, y] of gems) if (!seen.has(x + ',' + y)) fail(n, tag, `gema (${x},${y}) inalcanzable`);
  if (E && !seen.has(E.join())) fail(n, tag, 'la puerta es inalcanzable');
  // 4. pista libre al arrancar
  const d = DIRS[dir];
  for (let i = 1; i <= 4; i++) {
    let x = S[0] + d[0] * i, y = S[1] + d[1] * i;
    if (wrapX) x = (x + COLS) % COLS;
    if (wrapY) y = (y + ROWS) % ROWS;
    if (wall(x, y)) { fail(n, tag, `sin pista libre al arrancar (choca a las ${i} casillas)`); break; }
  }
  // 5. bichos y cazador
  for (const [x, y] of pats) {
    if (wall(x, y)) fail(n, tag, `bicho de ronda en muro (${x},${y})`);
    let run = 1;
    for (let i = 1; i < COLS; i++) { const nx = wrapX ? (x + i) % COLS : x + i; if (nx >= COLS || wall(nx, y)) break; run++; }
    for (let i = 1; i < COLS; i++) { const nx = wrapX ? (x - i + COLS) % COLS : x - i; if (nx < 0 || wall(nx, y)) break; run++; }
    if (run < 3) fail(n, tag, `el carril del bicho (${x},${y}) solo tiene ${run} casillas`);
  }
  for (const [x, y] of hunts) if (wall(x, y)) fail(n, tag, `cazador en muro (${x},${y})`);
  // 6. sitio para la longitud pedida
  const need = (L.go.len || 0) + 6;
  if (need > free) fail(n, tag, `pide longitud ${L.go.len} y solo hay ${free} casillas libres`);
}

LV.forEach((L, i) => {
  const n = i + 1;
  const okKeys = new Set(['name', 'tip', 'spd', 'ac', 'go', 'sp', 'wrap', 'd', 'th', 'tl', 'pv', 'cv', 't2', 't3', 'm']);
  for (const kk in L) if (!okKeys.has(kk)) fail(n, 'claves', `clave desconocida «${kk}»`);
  for (const s of ['t2', 't3']) {
    if (!Array.isArray(L[s]) || L[s].length !== 3) { fail(n, 'estrellas', `${s} debe ser [facil,normal,dificil]`); continue; }
    for (let d = 0; d < 3; d++) if (!(L[s][d] > 0)) fail(n, 'estrellas', `${s}[${d}] raro`);
  }
  if (Array.isArray(L.t2) && Array.isArray(L.t3)) for (let d = 0; d < 3; d++) if (L.t3[d] > L.t2[d]) fail(n, 'estrellas', `t3 mas flojo que t2 en dificultad ${d}`);
  if (L.go.gems) fail(n, 'claves', 'go.gems no se usa: las gemas son condicion de 3 estrellas, no objetivo');
  if (L.m.length !== 13 || L.m.some((r) => r.length !== 17)) fail(n, 'tablero', 'el dibujo debe ser 17x13');
  const chOK = new Set(['.', '#', 'S', 'K', 'E', 'G', '~', 'P', 'C']);
  L.m.forEach((r, y) => { for (const ch of r) if (!chOK.has(ch)) fail(n, 'tablero', `fila ${y}: caracter «${ch}» desconocido`); });
  for (const sunk of [false, true]) {
    const tg = sunk ? 'hundido' : 'intacto';
    check(n, L, L.m, L.wrap || '', L.d || 'right', sunk, 'horizontal ' + tg);
    check(n, L, rot(L.m), WRAP_CW[L.wrap || ''], RCW[L.d || 'right'], sunk, 'vertical ' + tg);
  }
});
console.log(bad ? `\n${bad} problema(s)` : `Los ${LV.length} tableros de serpent-grid pasan el BFS en las dos orientaciones, con el suelo fragil intacto y hundido.`);
process.exit(bad ? 1 : 0);
