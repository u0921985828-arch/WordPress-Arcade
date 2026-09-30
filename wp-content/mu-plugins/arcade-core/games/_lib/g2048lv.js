/* Retos a mano de 2048 (plan Friv, F3 · tanda 7). 20 desafíos escritos uno a uno: ninguno se
 * genera al azar y todos están verificados por simulación en Node
 * (scripts/check_g2048lv.js: jugador de heurística esquina + monotonía, cientos de partidas por
 * nivel y dificultad). Solo los usa 2048-classic; 2048-hex no mira la tabla.
 *
 * TABLERO — una cadena por fila, casillas separadas por espacios:
 *   .      hueco vacío                 2 4 8 …  ficha con ese valor
 *   #      muro (esa casilla no existe: nada entra ni sale)
 *   f8     ficha HELADA de valor 8 (no se mueve ni se junta; se descongela cuando
 *          dos fichas se funden en una casilla vecina)
 *   *      comodín: se une con CUALQUIER ficha y la duplica (comodín + comodín = 4)
 *   s8     ficha ATORNILLADA: no se desliza, pero SÍ se puede fundir con otra igual
 *          (al fundirse se suelta y vuelve a ser una ficha normal)
 *   t8     COFRE: se abre fundiendo encima de él; da puntos extra y cuenta para las 3★
 *   b8     BOMBA: lleva una mecha (campo `fuse`, en movimientos). Si llega a cero se pierde;
 *          se desactiva fundiéndola con otra ficha
 *
 * PARÁMETROS de cada reto:
 *   name   rótulo corto del reto            tip  lo que enseña (banner de los primeros segundos)
 *   g      lado de la rejilla (3, 4 o 5)    goal valor de ficha que hay que alcanzar
 *   need   cuántas fichas del objetivo hacen falta A LA VEZ (sin definir = 1)
 *   mv     límite de movimientos (0 = sin límite)
 *   gen    generador: sale una ficha extra cada `gen` movimientos (0 = ninguno)
 *   fuse   mecha de las bombas del tablero, en movimientos
 *   ban    direcciones prohibidas (['up'] = no se puede deslizar hacia arriba)
 *   sp     bolsa de fichas nuevas (sin definir = la de siempre, 2 y 4)
 *   b      tablero inicial (sin definir = dos fichas al azar, como el 2048 clásico)
 *   s2     movimientos como máximo para 2★, uno por dificultad [fácil, normal, difícil]
 *   s3     lo mismo para 3★; las 3★ piden además maestría: sin gastar rescate y con todos
 *          los cofres del tablero abiertos
 *
 * La dificultad ajusta después: en fácil el objetivo de los retos grandes baja a la mitad, hay
 * un 35 % más de movimientos y la mecha dura 4 movimientos más; en difícil quedan un 15 % menos
 * de movimientos, la mecha es 2 más corta y salen más cuatros.
 */
const G2048LV = {};

/* ---------------------------------------------------------------------------------------------
 * REGLAS PURAS (zona verificable desde Node: la usan igual el motor y el simulador de QA).
 * plan(cells, tiles, d, proj, dirs) calcula un deslizamiento completo sin tocar nada del dibujo.
 *   cells  lista de casillas [x,y] que existen (los muros simplemente no están)
 *   tiles  mapa 'x,y' → {v, w:comodín, fz:helada, bo:atornillada, ch:cofre, bomb:bomba, fu:mecha}
 *   d      dirección [dx,dy]      proj  vector de orden (en hexágono no es d)
 *   dirs   vecindario (para descongelar)
 * Devuelve {moved, gained, board, uf, opened, defused}: board es el tablero final, y cada casilla
 * dice qué ficha sobrevive (keep) y cuál se ha absorbido (eat) para poder animarlo.
 * ------------------------------------------------------------------------------------------- */
G2048LV.plan = function (cells, tiles, d, proj, dirs) {
  const K = (a) => a[0] + ',' + a[1], p = proj || d, valid = {};
  for (let i = 0; i < cells.length; i++) valid[K(cells[i])] = 1;
  const ord = cells.slice().sort((a, b) => (b[0] * p[0] + b[1] * p[1]) - (a[0] * p[0] + a[1] * p[1]));
  const board = {};
  for (let i = 0; i < cells.length; i++) { const kk = K(cells[i]), t = tiles[kk]; if (t) board[kk] = { v: t.v, w: !!t.w, fz: !!t.fz, bo: !!t.bo, ch: !!t.ch, bomb: !!t.bomb, fu: t.fu || 0, keep: kk, eat: null, merged: false }; }
  let moved = false, gained = 0; const hit = [], opened = [], defused = [];
  for (let i = 0; i < ord.length; i++) {
    let cc = ord[i], ck = K(cc); const b = board[ck];
    if (!b || b.fz || b.bo) continue; /* helada y atornillada no se deslizan */
    for (;;) {
      const nx = [cc[0] + d[0], cc[1] + d[1]], nk = K(nx);
      if (!valid[nk]) break;
      const o = board[nk];
      if (!o) { board[nk] = b; delete board[ck]; ck = nk; cc = nx; moved = true; continue; }
      if (!o.fz && !o.merged && (o.w || b.w || o.v === b.v)) {
        const nv = (o.w && b.w) ? 4 : Math.max(o.v, b.v) * 2;
        o.eat = b.keep; o.v = nv; o.w = false; o.merged = true;
        if (o.ch || b.ch) { o.ch = false; opened.push(nk); }          /* cofre abierto */
        if (o.bomb || b.bomb) { o.bomb = false; o.fu = 0; defused.push(nk); } /* bomba desactivada */
        if (o.bo) o.bo = false;                                        /* tornillo suelto */
        gained += nv; delete board[ck]; moved = true; hit.push(nk);
      }
      break;
    }
  }
  const uf = [];
  if (hit.length && dirs) for (let i = 0; i < hit.length; i++) {
    const mc = hit[i].split(',').map(Number);
    for (let j = 0; j < dirs.length; j++) { const nk = (mc[0] + dirs[j][0]) + ',' + (mc[1] + dirs[j][1]), t = board[nk]; if (t && t.fz) { t.fz = false; uf.push(nk); } }
  }
  return { moved: moved, gained: gained, board: board, uf: uf, opened: opened, defused: defused };
};
/* ¿Queda alguna jugada legal? (mismas reglas que plan: la helada y la atornillada no se mueven,
   el comodín liga con todo, y un hueco solo salva si alguna ficha puede llegar a él) */
G2048LV.alive = function (cells, tiles, dirs) {
  const K = (a) => a[0] + ',' + a[1], valid = {};
  for (let i = 0; i < cells.length; i++) valid[K(cells[i])] = 1;
  for (let i = 0; i < cells.length; i++) {
    const a = tiles[K(cells[i])]; if (!a || a.fz || a.bo) continue;
    for (let j = 0; j < dirs.length; j++) {
      const nk = (cells[i][0] + dirs[j][0]) + ',' + (cells[i][1] + dirs[j][1]);
      if (!valid[nk]) continue;
      const b = tiles[nk];
      if (!b) return true;
      if (!b.fz && (a.w || b.w || a.v === b.v)) return true;
    }
  }
  return false;
};
/* Lee una casilla del tablero escrito a mano. */
G2048LV.token = function (s) {
  if (s === '.' || s === '') return null;
  if (s === '#') return 'wall';
  if (s === '*') return { v: 0, w: true };
  const c0 = s.charAt(0);
  if (c0 === 'f') return { v: +s.slice(1), fz: true };
  if (c0 === 's') return { v: +s.slice(1), bo: true };
  if (c0 === 't') return { v: +s.slice(1), ch: true };
  if (c0 === 'b') return { v: +s.slice(1), bomb: true };
  return { v: +s };
};
/* Objetivo, movimientos y mecha según la dificultad (0 fácil, 1 normal, 2 difícil). */
G2048LV.tune = function (lv, dif) {
  return {
    goal: dif === 0 && lv.goal >= 512 ? lv.goal / 2 : lv.goal,
    need: dif === 0 && lv.need > 1 ? lv.need - 1 : (lv.need || 1),
    mv: lv.mv ? Math.round(lv.mv * (dif === 0 ? 1.35 : dif === 2 ? 0.85 : 1)) : 0,
    fuse: lv.fuse ? lv.fuse + (dif === 0 ? 4 : dif === 2 ? -2 : 0) : 0,
    gen: lv.gen || 0
  };
};
/* Objetivos de estrella del reto para esta dificultad (movimientos como máximo).
 * Los números de s2/s3 se escribieron a mano a partir de scripts/check_g2048lv.js
 * (simulador en Node sobre las reglas del propio motor): s2 = p75 + 25 % y
 * s3 = p50 + 5 % de los movimientos de las partidas ganadas, por reto y dificultad.
 * Excepción declarada: el reto 20 en normal y difícil no se pudo simular a tiempo;
 * sus dos cifras son una estimación (el doble de la medida en fácil, que juega a 1024). */
G2048LV.stars = function (lv, dif) {
  const d = Math.max(0, Math.min(2, dif | 0));
  return { s2: (lv.s2 && lv.s2[d]) || 0, s3: (lv.s3 && lv.s3[d]) || 0 };
};

G2048LV.L = {
  '2048-classic': [
    /* ---- 1-4: lo básico. Sin límites ni trampas: se aprende a juntar y a ordenar. ---- */
    { /*  1 */ name: 'Primeros pasos', goal: 32, g: 4, mv: 0, s2: [15, 15, 15], s3: [12, 12, 11], tip: 'Desliza en cualquier dirección: las fichas del mismo número se juntan en una.', b: [
      '. . . .',
      '. 2 2 .',
      '. 4 4 .',
      '8 . . 8'] },
    { /*  2 */ name: 'Todo a la esquina', goal: 64, g: 4, mv: 0, s2: [43, 42, 40], s3: [34, 33, 32], tip: 'Truco de oro: manda siempre las fichas a la misma esquina y no la sueltes.', b: [
      '. . . .',
      '. . . .',
      '4 . . .',
      '2 2 4 8'] },
    { /*  3 */ name: 'Fila ordenada', goal: 128, g: 4, mv: 0, s2: [74, 70, 67], s3: [58, 56, 53], tip: 'Deja la fila de abajo ordenada de mayor a menor: así siempre hay una unión a mano.', b: [
      '. . . .',
      '. . . .',
      '. . 2 4',
      '2 4 8 16'] },
    { /*  4 */ name: 'Rejilla apretada', goal: 64, g: 3, mv: 0, s2: [42, 40, 38], s3: [33, 32, 30], tip: 'Nueve casillas nada más: no dejes fichas sueltas por el medio.', b: [
      '2 4 .',
      '. 2 .',
      '4 . 2'] },
    /* ---- 5-10: las cinco trampas de siempre, una por reto. ---- */
    { /*  5 */ name: 'Movimientos contados', goal: 128, g: 4, mv: 70, s2: [24, 20, 24], s3: [13, 12, 13], tip: 'Ahora los movimientos se acaban. Que cada deslizamiento junte algo.', b: [
      '. . . .',
      '. . . .',
      '4 8 16 32',
      '2 4 8 64'] },
    { /*  6 */ name: 'Muros de piedra', goal: 128, g: 4, mv: 0, s2: [122, 119, 114], s3: [83, 82, 76], tip: 'La piedra no se mueve ni se junta: las fichas se paran al chocar con ella.', b: [
      '. . . .',
      '. . . .',
      '. . # .',
      '2 4 8 16'] },
    { /*  7 */ name: 'Prohibido subir', goal: 128, g: 4, mv: 0, ban: ['up'], s2: [75, 72, 69], s3: [59, 57, 54], tip: 'Aquí no puedes deslizar hacia arriba. Construye siempre hacia abajo.', b: [
      '. . . .',
      '. . . .',
      '2 4 . .',
      '4 8 16 .'] },
    { /*  8 */ name: 'Fichas heladas', goal: 128, g: 4, mv: 0, s2: [87, 85, 79], s3: [62, 61, 56], tip: 'El hielo no se mueve. Junta dos fichas en una casilla vecina y se rompe.', b: [
      '. . . .',
      '. f4 . .',
      '. . f4 .',
      '2 4 8 16'] },
    { /*  9 */ name: 'Comodines', goal: 256, g: 4, mv: 0, sp: [2, 2, 2, 2, 2, 2, 4, 4, '*'], s2: [109, 107, 110], s3: [67, 67, 72], tip: 'La estrella se une con cualquier ficha y la duplica. Gástala en la más grande.', b: [
      '. . . .',
      '. . * .',
      '. 2 4 8',
      '2 4 8 16'] },
    { /* 10 */ name: 'Tablero grande', goal: 256, g: 5, mv: 0, s2: [155, 153, 144], s3: [119, 120, 112], tip: 'Veinticinco casillas: más sitio para maniobrar, pero el objetivo sube.', b: [
      '. . . . .',
      '. . . . .',
      '. . 2 . .',
      '. 2 4 8 .',
      '2 4 8 16 .'] },
    /* ---- 11-15: las cinco mecánicas nuevas, de una en una. ---- */
    { /* 11 */ name: 'Fichas atornilladas', goal: 128, g: 4, mv: 0, s2: [69, 70, 68], s3: [56, 57, 53], tip: 'La ficha atornillada no se desliza, pero SÍ se funde: llévale una igual y se suelta.', b: [
      '. . . .',
      '. s4 . .',
      '. . s4 .',
      '2 4 8 16'] },
    { /* 12 */ name: 'Cofres', goal: 256, g: 4, mv: 0, s2: [144, 147, 132], s3: [118, 120, 104], tip: 'El cofre se abre fundiendo encima de él. Ábrelos todos: son la tercera estrella.', b: [
      't4 . . t4',
      '. . . .',
      '. . 2 4',
      '2 4 8 16'] },
    { /* 13 */ name: 'La bomba', goal: 128, g: 4, mv: 0, fuse: 14, s2: [68, 69, 65], s3: [55, 56, 50], tip: 'La bomba lleva mecha: si llega a cero, se acabó. Fúndela con otra igual y la apagas.', b: [
      '. . . .',
      '. b4 . .',
      '. 2 4 .',
      '2 4 8 16'] },
    { /* 14 */ name: 'El generador', goal: 256, g: 4, mv: 0, gen: 5, s2: [129, 127, 113], s3: [103, 103, 93], tip: 'Cada cinco movimientos entra una ficha de más: no dejes que se te llene el tablero.', b: [
      '. . . .',
      '. . . .',
      '. . 2 4',
      '2 4 8 16'] },
    { /* 15 */ name: 'Objetivo doble', goal: 128, g: 5, mv: 0, need: 3, s2: [140, 313, 280], s3: [112, 247, 227], tip: 'No vale una: hacen falta TRES fichas del objetivo vivas a la vez en el tablero.', b: [
      '. . . . .',
      '. . . . .',
      '. . 2 . .',
      '. 2 4 8 .',
      '2 4 8 16 32'] },
    /* ---- 16-19: mezclas. Cada reto junta dos o tres trampas. ---- */
    { /* 16 */ name: 'Almacén con columnas', goal: 256, g: 5, mv: 0, gen: 7, s2: [123, 123, 114], s3: [101, 97, 93], tip: 'Dos columnas de piedra y un generador: ordena por la fila de abajo y no la sueltes.', b: [
      '. . . . .',
      '. # . # .',
      '. . . . .',
      '. . . . .',
      '2 4 8 16 32'] },
    { /* 17 */ name: 'Hielo y tornillos', goal: 256, g: 5, mv: 170, s2: [134, 138, 129], s3: [104, 107, 100], tip: 'Hielo que hay que romper y tornillos que hay que soltar, con los movimientos contados.', b: [
      '. . . . .',
      '. f8 . s8 .',
      '. . . . .',
      '. . 2 4 .',
      '2 4 8 16 32'] },
    { /* 18 */ name: 'Bomba sin subir', goal: 256, g: 4, mv: 0, fuse: 18, ban: ['up'], sp: [2, 2, 2, 2, 2, 4, 4, '*'], s2: [107, 123, 115], s3: [66, 63, 45], tip: 'Bomba encendida, prohibido subir y alguna estrella en la bolsa. Apaga primero.', b: [
      '. . . .',
      '. . b8 .',
      '. 2 4 8',
      '2 4 8 16'] },
    { /* 19 */ name: 'Cofres y generador', goal: 512, g: 5, mv: 0, gen: 8, s2: [115, 244, 272], s3: [91, 196, 207], tip: 'Objetivo serio, dos cofres en las esquinas de arriba y fichas que no dejan de entrar.', b: [
      't8 . . . t8',
      '. . . . .',
      '. . . . .',
      '. 2 4 8 .',
      '2 4 8 16 32'] },
    /* ---- 20: el desafío completo. ---- */
    { /* 20 */ name: '2048 clásico', goal: 2048, g: 4, mv: 0, s2: [674, 1350, 1250], s3: [533, 1080, 1020], tip: 'El desafío completo: llega a 2048 en el tablero de siempre. Buena suerte.' }
  ]
};

if (typeof module !== 'undefined' && module.exports) module.exports = G2048LV;
