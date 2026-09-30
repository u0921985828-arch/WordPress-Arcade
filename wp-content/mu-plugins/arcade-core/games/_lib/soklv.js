/* Almacenes a mano de sokoban-warehouse (plan Friv, F3, tandas 3 y 7).
 * 20 niveles dibujados uno a uno: ninguno se genera al azar y todos están verificados con un
 * resolutor propio (BFS sobre estados jugador+cajas+fosos+gemas, óptimo en MOVIMIENTOS del
 * jugador). El resolutor vive en scripts/check_soklv.js y usa EXACTAMENTE las reglas de este
 * fichero (SOKLV.parse/step/won), las mismas que ejecuta el motor: no hay dos verdades.
 *
 * PLANTA — cada nivel es una lista de filas de la misma anchura:
 *   #  muro                    (espacio)  suelo
 *   .  destino                 $  caja            *  caja sobre destino
 *   @  jugador                 +  jugador sobre destino
 *   o  FOSO abierto: el jugador no pasa; una caja empujada dentro lo tapa y desaparece
 *   _  SUELO ENGRASADO: la caja que entra sigue resbalando en ese sentido hasta chocar
 *   ~  caja que arranca sobre suelo engrasado    :  destino sobre suelo engrasado
 *   p  PLACA de presión        P  caja que arranca sobre una placa
 *   =  REJA: cerrada (muro) mientras alguna placa esté libre; abierta con todas pisadas
 *   > < ^ v  RODILLOS: la caja que está encima solo rueda en el sentido de la flecha
 *   X  SALIDA: con todas las marcas cubiertas hay que llegar a ella para cerrar el nivel
 *   c  GEMA: no estorba, está fuera de la ruta corta y es la condición de maestría (3★)
 *
 * CAMPOS de cada nivel:
 *   n  nombre del almacén (HUD)      i  la idea nueva que enseña (tarjeta de los primeros seg.)
 *   m  MÍNIMO de movimientos sin recoger gemas (resolutor)
 *   mg MÍNIMO recogiendo TODAS las gemas (resolutor; igual a m si no hay gemas)
 *   s2 objetivo de 2★ [fácil, normal, difícil]   s3 objetivo de 3★ [fácil, normal, difícil]
 *   u  DESHACERES disponibles [fácil, normal, difícil] (el recurso que aprieta; 0 = sin límite)
 *   g  la planta
 *
 * Los números de s2/s3 se fijaron con el mínimo medido: s3 = mg + 25/14/6 % + 3/2/1 (fácil,
 * normal, difícil) y s2 = m + 60/40/22 % + 8/5/3, nunca por debajo de s3. Así en fácil sobra
 * margen, en difícil hay que clavar casi la ruta óptima, y el reparto es el mismo criterio en
 * los 20 niveles. Cambiar una planta obliga a volver a pasar el resolutor.
 *
 * Estrellas: 1★ terminar · 2★ terminar en s2[dif] movimientos o menos · 3★ terminar en s3[dif]
 * o menos, con TODAS las gemas y SIN gastar un deshacer. Los números de s2/s3 están escritos a
 * mano nivel a nivel y dificultad a dificultad, partiendo de m/mg medidos por el resolutor.
 * Deshacer devuelve el movimiento (el contador baja) pero gasta una carga; reiniciar es gratis
 * y pone el contador a cero, así que la medalla solo cae con la ruta pensada.
 */
const SOKLV = {};

/* =============================================================================================
 * REGLAS PURAS (zona verificable desde Node). El motor y el resolutor llaman a lo mismo.
 * ============================================================================================= */
const SK_D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const SK_ARROW = { '>': 'right', '<': 'left', '^': 'up', v: 'down' };
const SKK = (x, y) => x + ',' + y;

/* parse(lv) → mapa estático + estado inicial. El mapa no cambia nunca durante la partida. */
SOKLV.parse = function (lv) {
  const g = lv.g, NH = g.length; let NW = 0;
  for (let i = 0; i < NH; i++) NW = Math.max(NW, g[i].length);
  const map = { NW: NW, NH: NH, wall: {}, goals: [], pit: {}, ice: {}, plate: [], gate: [], roll: {}, exitC: null, gems: [] };
  const st = { p: [1, 1], b: [], f: {}, g: 0 };
  for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) {
    const ch = g[y][x] || ' ', K = SKK(x, y);
    if (ch === '#') { map.wall[K] = 1; continue; }
    if (ch === '.' || ch === '*' || ch === '+' || ch === ':') map.goals.push([x, y]);
    if (ch === 'o') map.pit[K] = 1;
    if (ch === '_' || ch === '~' || ch === ':') map.ice[K] = 1;
    if (ch === 'p' || ch === 'P') map.plate.push([x, y]);
    if (ch === '=') map.gate.push([x, y]);
    if (SK_ARROW[ch]) map.roll[K] = SK_ARROW[ch];
    if (ch === 'X') map.exitC = [x, y];
    if (ch === 'c') map.gems.push([x, y]);
    if (ch === '$' || ch === '*' || ch === '~' || ch === 'P') st.b.push([x, y]);
    if (ch === '@' || ch === '+') st.p = [x, y];
  }
  map.gateSet = {}; for (let i = 0; i < map.gate.length; i++) map.gateSet[SKK(map.gate[i][0], map.gate[i][1])] = 1;
  return { map: map, st: st };
};
/* La reja está abierta cuando TODAS las placas tienen una caja encima. */
SOKLV.gateOpen = function (map, st) {
  if (!map.plate.length) return true;
  for (let i = 0; i < map.plate.length; i++) {
    const p = map.plate[i]; let on = false;
    for (let j = 0; j < st.b.length; j++) if (st.b[j][0] === p[0] && st.b[j][1] === p[1]) { on = true; break; }
    if (!on) return false;
  }
  return true;
};
const skBoxAt = (st, x, y) => { for (let i = 0; i < st.b.length; i++) if (st.b[i][0] === x && st.b[i][1] === y) return i; return -1; };
SOKLV.boxAt = skBoxAt;
/* Casilla sólida para el jugador o para una caja. */
function skSolid(map, st, x, y, open) {
  const K = SKK(x, y);
  if (x < 0 || y < 0 || x >= map.NW || y >= map.NH) return true;
  if (map.wall[K]) return true;
  if (map.gateSet[K] && !open) return true;
  return false;
}
const skPitOpen = (map, st, x, y) => !!map.pit[SKK(x, y)] && !st.f[SKK(x, y)];

/* step(map, st, dirName) → null si el movimiento no es legal, o
 *   { st: estadoNuevo, push: bool, path: [[x,y]…] recorrido de la caja, fell: bool, gem: idx|-1 }
 * El recorrido sirve al motor para animar el resbalón; el resolutor solo mira st. */
SOKLV.step = function (map, st, dn) {
  const d = SK_D[dn]; if (!d) return null;
  const open = SOKLV.gateOpen(map, st);
  const nx = st.p[0] + d[0], ny = st.p[1] + d[1];
  if (skSolid(map, st, nx, ny, open)) return null;
  const bi = skBoxAt(st, nx, ny);
  const nb = []; for (let i = 0; i < st.b.length; i++) nb.push([st.b[i][0], st.b[i][1]]);
  const nf = {}; for (const kk in st.f) nf[kk] = 1;
  let push = false, path = null, fell = false;
  if (bi >= 0) {
    const rl = map.roll[SKK(nx, ny)];
    if (rl && rl !== dn) return null;                        /* rodillo: solo en su sentido */
    let cx = nx + d[0], cy = ny + d[1];
    if (skSolid(map, st, cx, cy, open) || skBoxAt(st, cx, cy) >= 0) return null;
    push = true; path = [[nx, ny]];
    for (;;) {
      path.push([cx, cy]);
      if (skPitOpen(map, st, cx, cy)) { nf[SKK(cx, cy)] = 1; fell = true; break; }
      if (!map.ice[SKK(cx, cy)]) break;                      /* solo resbala mientras pise grasa */
      const rl2 = map.roll[SKK(cx, cy)]; if (rl2 && rl2 !== dn) break;
      const ax = cx + d[0], ay = cy + d[1];
      if (skSolid(map, st, ax, ay, open) || skBoxAt(st, ax, ay) >= 0) break;
      cx = ax; cy = ay;
    }
    if (fell) nb.splice(bi, 1); else { nb[bi][0] = cx; nb[bi][1] = cy; }
  } else if (skPitOpen(map, st, nx, ny)) return null;        /* el jugador no cae al foso */
  const ns = { p: [nx, ny], b: nb, f: nf, g: st.g };
  /* Una reja que se cierra no puede tragarse a nadie: el movimiento queda prohibido. */
  if (map.gate.length && !SOKLV.gateOpen(map, ns)) {
    if (map.gateSet[SKK(nx, ny)]) return null;
    for (let i = 0; i < nb.length; i++) if (map.gateSet[SKK(nb[i][0], nb[i][1])]) return null;
  }
  let gem = -1;
  for (let i = 0; i < map.gems.length; i++) if (map.gems[i][0] === nx && map.gems[i][1] === ny && !(ns.g & (1 << i))) { ns.g |= (1 << i); gem = i; }
  return { st: ns, push: push, path: path, fell: fell, gem: gem };
};
/* ¿Resuelto? Todas las marcas cubiertas y, si hay salida, el jugador en ella. */
SOKLV.won = function (map, st) {
  for (let i = 0; i < map.goals.length; i++) {
    const q = map.goals[i]; if (skBoxAt(st, q[0], q[1]) < 0) return false;
  }
  if (map.exitC && (st.p[0] !== map.exitC[0] || st.p[1] !== map.exitC[1])) return false;
  return true;
};
/* Todas las marcas cubiertas (para avisar «ya solo falta salir»). */
SOKLV.goalsDone = function (map, st) {
  for (let i = 0; i < map.goals.length; i++) { const q = map.goals[i]; if (skBoxAt(st, q[0], q[1]) < 0) return false; }
  return true;
};
/* Firma de estado para el resolutor (y para el aviso de atasco). */
SOKLV.hash = function (map, st, withGems) {
  const bs = st.b.map((b) => b[0] + ':' + b[1]).sort().join('|');
  const fs = Object.keys(st.f).sort().join('|');
  return st.p[0] + ',' + st.p[1] + '/' + bs + '/' + fs + (withGems ? '/' + st.g : '');
};
/* Casilla donde una caja queda muerta (esquina de muros sin marca). Se pinta en fácil.
 * Con fosos, hielo y rejas la trampa deja de ser una regla exacta, así que solo se marcan las
 * esquinas de muro duro: es una ayuda, no una garantía. */
SOKLV.deadCells = function (map) {
  const out = {}, isW = (x, y) => x < 0 || y < 0 || x >= map.NW || y >= map.NH || !!map.wall[SKK(x, y)];
  const isGoal = (x, y) => map.goals.some((q) => q[0] === x && q[1] === y);
  for (let y = 1; y < map.NH - 1; y++) for (let x = 1; x < map.NW - 1; x++) {
    const K = SKK(x, y);
    if (map.wall[K] || map.pit[K] || map.ice[K] || map.gateSet[K] || map.roll[K] || isGoal(x, y)) continue;
    if ((isW(x, y - 1) || isW(x, y + 1)) && (isW(x - 1, y) || isW(x + 1, y))) out[K] = 1;
  }
  return out;
};
/* Objetivos de estrella del nivel para esta dificultad (movimientos como máximo). */
SOKLV.stars = function (lv, dif) {
  const d = Math.max(0, Math.min(2, dif | 0));
  return { s2: (lv.s2 && lv.s2[d]) || 0, s3: (lv.s3 && lv.s3[d]) || 0 };
};

/* =============================================================================================
 * LOS 20 ALMACENES. Curva: una idea nueva cada vez y nunca dos a la vez.
 *   1-4   empujar, rodear, no arrinconar        5-7   FOSO
 *   8-10  SUELO ENGRASADO                       11-12 RODILLOS
 *   13-15 PLACA Y REJA                          16-17 SALIDA
 *   18-20 todo mezclado y el gran almacén final
 * Las gemas aparecen desde el 6 y siempre fuera de la ruta corta: el que va a lo fácil termina
 * el nivel, pero no saca la tercera estrella.
 * ============================================================================================= */
SOKLV['sokoban-warehouse'] = [
  /* ---- 1-4: escuela. Empujar, rodear, no arrinconar. ---- */
  { n: 'Primer empujón', i: 'Las cajas solo se EMPUJAN: ponte detrás y avanza.', m: 10, mg: 10, s2: [24, 19, 15], s3: [15, 13, 12], u: [0, 0, 0], g: [
    '##########',
    '#        #',
    '#  . . . #',
    '#  $ $ $ #',
    '#   @    #',
    '#        #',
    '##########'] },
  { n: 'Por el pasillo', i: 'Mientras empujes en línea recta, la caja te sigue el paso.', m: 18, mg: 18, s2: [37, 30, 25], s3: [25, 23, 20], u: [0, 0, 0], g: [
    '###########',
    '#         #',
    '# @ $    .#',
    '#         #',
    '#   $    .#',
    '#         #',
    '###########'] },
  { n: 'Da la vuelta', i: 'Para empujar hacia abajo hay que ponerse arriba del todo.', m: 17, mg: 17, s2: [35, 29, 24], s3: [24, 21, 19], u: [0, 0, 0], g: [
    '##########',
    '#        #',
    '#  $     #',
    '#  .     #',
    '#   @ $  #',
    '#  .     #',
    '#  $  .  #',
    '#        #',
    '##########'] },
  { n: 'La esquina mata', i: 'Una caja en una esquina ya no sale: llévala pegada al muro.', m: 21, mg: 21, s2: [42, 34, 29], s3: [29, 26, 23], u: [0, 0, 0], g: [
    '##########',
    '#        #',
    '#  ####  #',
    '#  $  .  #',
    '#  @     #',
    '#     $  #',
    '#  .     #',
    '#     $  #',
    '#  .     #',
    '##########'] },
  /* ---- 5-7: el FOSO. Una caja dentro lo tapa y desaparece. ---- */
  { n: 'El foso', i: 'El foso no se cruza. Tira una caja dentro y lo habrás tapado para siempre.', m: 24, mg: 24, s2: [46, 39, 32], s3: [33, 29, 26], u: [0, 0, 0], g: [
    '###########',
    '#####.#####',
    '#####o#####',
    '#         #',
    '# $  $  $ #',
    '#    @    #',
    '#  .      #',
    '###########'] },
  { n: 'Dos fosos', i: 'Cuenta las cajas: las que sobran son las que tapan fosos.', m: 26, mg: 34, s2: [50, 41, 37], s3: [45, 41, 37], u: [0, 0, 0], g: [
    '###########',
    '#    c    #',
    '####.######',
    '####o######',
    '####o######',
    '# $ $ $   #',
    '#    @    #',
    '###########'] },
  { n: 'Elige bien', i: 'Te sobra una caja: decide cuál gastas antes de empujar la primera.', m: 20, mg: 22, s2: [40, 33, 27], s3: [31, 27, 24], u: [0, 0, 0], g: [
    '##########',
    '####.#####',
    '####o#####',
    '#        #',
    '# $ $  $ #',
    '#c       #',
    '#   @  . #',
    '##########'] },
  /* ---- 8-10: SUELO ENGRASADO. La caja resbala; hay que saber dónde para. ---- */
  { n: 'Suelo engrasado', i: 'Sobre la grasa la caja no se para: sigue hasta chocar con algo.', m: 13, mg: 15, s2: [29, 23, 19], s3: [22, 19, 17], u: [6, 4, 2], g: [
    '###########',
    '#         #',
    '#  $____. #',
    '#         #',
    '#  $____. #',
    '#         #',
    '#  $____. #',
    '#c   @    #',
    '###########'] },
  { n: 'Frena la caja', i: 'Una caja para a otra: coloca primero el tope y resbala después.', m: 21, mg: 24, s2: [42, 34, 29], s3: [33, 29, 26], u: [6, 4, 2], g: [
    '##########',
    '#        #',
    '#     $  #',
    '# @$_:__ #',
    '#     #  #',
    '#  $     #',
    '#      . #',
    '#       c#',
    '##########'] },
  { n: 'Grasa y foso', i: 'Una caja que resbala también cae al foso: gasta una y pasa la otra.', m: 24, mg: 28, s2: [46, 39, 32], s3: [38, 34, 31], u: [6, 4, 2], g: [
    '###########',
    '#   c      ',
    '#       ###',
    '#  $___o.##',
    '#       ###',
    '#  $   $  #',
    '#    .    #',
    '#    @    #',
    '###########'] },
  /* ---- 11-12: RODILLOS. La caja de encima solo rueda hacia donde apunta la flecha. ---- */
  { n: 'Rodillos', i: 'El rodillo es de una sola dirección: por ahí la caja solo baja.', m: 37, mg: 40, s2: [67, 57, 48], s3: [53, 48, 43], u: [6, 4, 2], g: [
    '###########',
    '#c .   .  #',
    '#         #',
    '#         #',
    '###v### ###',
    '#         #',
    '#  $    $ #',
    '#    @    #',
    '###########'] },
  { n: 'Rodillo y grasa', i: 'Rodillo y grasa juntos: piensa el sentido antes de empujar.', m: 23, mg: 27, s2: [45, 37, 31], s3: [37, 33, 30], u: [6, 4, 2], g: [
    '###########',
    '#      :  #',
    '#      : c#',
    '#      _  #',
    '###v### ###',
    '#         #',
    '#  $    $ #',
    '#    @    #',
    '###########'] },
  /* ---- 13-15: PLACA Y REJA. La reja se abre mientras las placas estén pisadas. ---- */
  { n: 'La placa', i: 'Una caja sobre la placa abre la reja. Mientras esté encima, se pasa.', m: 17, mg: 23, s2: [35, 29, 25], s3: [32, 28, 25], u: [6, 4, 2], g: [
    '###########',
    '####.######',
    '####=######',
    '#        c#',
    '# p    .  #',
    '#  $ $ $  #',
    '#    @    #',
    '###########'] },
  { n: 'Dos placas', i: 'Con dos placas la reja pide las dos pisadas a la vez.', m: 22, mg: 24, s2: [43, 36, 30], s3: [33, 29, 26], u: [6, 4, 2], g: [
    '###########',
    '####.######',
    '####=######',
    '#         #',
    '# p     p #',
    '#  $ $ $  #',
    '#   @    c#',
    '###########'] },
  { n: 'Placa y foso', i: 'A la placa solo se llega por el foso: una caja se queda en el camino.', m: 29, mg: 31, s2: [54, 46, 38], s3: [42, 37, 34], u: [6, 4, 2], g: [
    '###########',
    '####.######',
    '####=######',
    '###      c#',
    '#po       #',
    '###$ $ $  #',
    '#    @    #',
    '###########'] },
  /* ---- 16-17: SALIDA. Con todo colocado hay que llegar a la puerta. ---- */
  { n: 'La salida', i: 'Con todas las marcas cubiertas, corre a la puerta verde y cierra el turno.', m: 30, mg: 34, s2: [56, 47, 40], s3: [45, 41, 37], u: [6, 4, 2], g: [
    '###########',
    '#     c   #',
    '#  . . .  #',
    '#         #',
    '# $  $  $ #',
    '#    @    #',
    '#         #',
    '#X        #',
    '###########'] },
  { n: 'Puerta al fondo', i: 'La puerta está al otro lado del foso: te tocará tapar el foso para salir.', m: 18, mg: 22, s2: [37, 30, 25], s3: [31, 27, 24], u: [6, 4, 2], g: [
    '###########',
    '#   c     #',
    '#   . .   #',
    '#   $ $ $ #',
    '#    @    #',
    '#####o#####',
    '#####X#####',
    '###########'] },
  /* ---- 18-20: todo mezclado y el gran almacén final. ---- */
  { n: 'Turno doble', i: 'Grasa, rodillo, foso y salida: un plan entero de una sola vez.', m: 46, mg: 52, s2: [82, 69, 59], s3: [68, 61, 56], u: [5, 3, 2], g: [
    '###########',
    '#X     :  #',
    '#      : c#',
    '#      _  #',
    '###v###o###',
    '#         #',
    '# $ $   $ #',
    '#    @    #',
    '###########'] },
  { n: 'Reja y salida', i: 'Placa, rodillo de subida y puerta: ordena los tres pasos.', m: 42, mg: 44, s2: [75, 64, 54], s3: [58, 52, 48], u: [5, 3, 2], g: [
    '###########',
    '#X  #.#   #',
    '#   #=#   #',
    '#      .  #',
    '#####^## ##',
    '#   p    c#',
    '#  $ $ $  #',
    '#    @    #',
    '###########'] },
  { n: 'El gran almacén', i: 'Todo junto y una última puerta. Mira el fondo antes de tocar nada.', m: 31, mg: 41, s2: [58, 49, 44], s3: [54, 49, 44], u: [5, 3, 2], g: [
    '###########',
    '#X  #.#   #',
    '#   #=#  c#',
    '#         #',
    '#####^#####',
    '#.___   p #',
    '# $ o $ $ #',
    '#     @   #',
    '###########'] }
];

if (typeof module !== 'undefined' && module.exports) module.exports = SOKLV; /* para el resolutor en Node */
