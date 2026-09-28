/* Retos a mano de 2048 (plan Friv, F3 · tanda 3). 20 desafíos escritos uno a uno: ninguno se
 * genera al azar y todos están verificados por simulación (miles de partidas con un jugador de
 * heurística esquina + monotonía). Solo los usa 2048-classic; 2048-hex no los mira.
 *
 * TABLERO — una cadena por fila, casillas separadas por espacios:
 *   .      hueco vacío                 2 4 8 …  ficha con ese valor
 *   #      muro (esa casilla no existe: nada entra ni sale)
 *   f8     ficha HELADA de valor 8 (no se mueve ni se junta; se descongela cuando
 *          dos fichas se funden en una casilla vecina)
 *   *      comodín: se une con CUALQUIER ficha y la duplica (comodín + comodín = 4)
 *
 * PARÁMETROS de cada reto:
 *   name   rótulo corto del reto            tip  lo que enseña (banner de los primeros segundos)
 *   g      lado de la rejilla (3, 4 o 5)    goal valor de ficha que hay que alcanzar
 *   mv     límite de movimientos (0 = sin límite)
 *   ban    direcciones prohibidas (['up'] = no se puede deslizar hacia arriba)
 *   sp     bolsa de fichas nuevas (sin definir = la de siempre, 2 y 4)
 *   b      tablero inicial (sin definir = dos fichas al azar, como el 2048 clásico)
 *
 * La dificultad ajusta después: en fácil el objetivo de los retos grandes baja a la mitad y hay
 * un 35 % más de movimientos; en difícil quedan un 15 % menos y salen más cuatros.
 */
const G2048LV = {};

/* ---------------------------------------------------------------------------------------------
 * REGLAS PURAS (zona verificable desde Node: la usan igual el motor y el simulador de QA).
 * plan(cells, tiles, d, proj, dirs) calcula un deslizamiento completo sin tocar nada del dibujo.
 *   cells  lista de casillas [x,y] que existen (los muros simplemente no están)
 *   tiles  mapa 'x,y' → {v, w:comodín, fz:helada}
 *   d      dirección [dx,dy]      proj  vector de orden (en hexágono no es d)
 *   dirs   vecindario (para descongelar)
 * Devuelve {moved, gained, board, uf}: board es el tablero final, y cada casilla dice qué ficha
 * sobrevive (keep) y cuál se ha absorbido (eat) para poder animarlo.
 * ------------------------------------------------------------------------------------------- */
G2048LV.plan = function (cells, tiles, d, proj, dirs) {
  const K = (a) => a[0] + ',' + a[1], p = proj || d, valid = {};
  for (let i = 0; i < cells.length; i++) valid[K(cells[i])] = 1;
  const ord = cells.slice().sort((a, b) => (b[0] * p[0] + b[1] * p[1]) - (a[0] * p[0] + a[1] * p[1]));
  const board = {};
  for (let i = 0; i < cells.length; i++) { const kk = K(cells[i]), t = tiles[kk]; if (t) board[kk] = { v: t.v, w: !!t.w, fz: !!t.fz, keep: kk, eat: null, merged: false }; }
  let moved = false, gained = 0; const hit = [];
  for (let i = 0; i < ord.length; i++) {
    let cc = ord[i], ck = K(cc); const b = board[ck];
    if (!b || b.fz) continue;
    for (;;) {
      const nx = [cc[0] + d[0], cc[1] + d[1]], nk = K(nx);
      if (!valid[nk]) break;
      const o = board[nk];
      if (!o) { board[nk] = b; delete board[ck]; ck = nk; cc = nx; moved = true; continue; }
      if (!o.fz && !o.merged && (o.w || b.w || o.v === b.v)) {
        const nv = (o.w && b.w) ? 4 : Math.max(o.v, b.v) * 2;
        o.eat = b.keep; o.v = nv; o.w = false; o.merged = true;
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
  return { moved: moved, gained: gained, board: board, uf: uf };
};
/* ¿Queda alguna jugada legal? (mismas reglas que plan: la helada bloquea, el comodín liga con todo) */
G2048LV.alive = function (cells, tiles, dirs) {
  const K = (a) => a[0] + ',' + a[1];
  for (let i = 0; i < cells.length; i++) if (!tiles[K(cells[i])]) return true;
  for (let i = 0; i < cells.length; i++) {
    const a = tiles[K(cells[i])]; if (!a || a.fz) continue;
    for (let j = 0; j < dirs.length; j++) {
      const b = tiles[(cells[i][0] + dirs[j][0]) + ',' + (cells[i][1] + dirs[j][1])];
      if (b && !b.fz && (a.w || b.w || a.v === b.v)) return true;
    }
  }
  return false;
};
/* Lee una casilla del tablero escrito a mano. */
G2048LV.token = function (s) {
  if (s === '.' || s === '') return null;
  if (s === '#') return 'wall';
  if (s === '*') return { v: 0, w: true };
  if (s.charAt(0) === 'f') return { v: +s.slice(1), fz: true };
  return { v: +s };
};
/* Objetivo y movimientos según la dificultad (0 fácil, 1 normal, 2 difícil). */
G2048LV.tune = function (lv, dif) {
  return {
    goal: dif === 0 && lv.goal >= 512 ? lv.goal / 2 : lv.goal,
    mv: lv.mv ? Math.round(lv.mv * (dif === 0 ? 1.35 : dif === 2 ? 0.85 : 1)) : 0
  };
};

G2048LV.L = {
  '2048-classic': [
    /* ---- 1-4: lo básico. Sin límites ni trampas: se aprende a juntar y a ordenar. ---- */
    { /*  1 */ name: 'Primeros pasos', goal: 32, g: 4, mv: 0, tip: 'Desliza en cualquier dirección: las fichas del mismo número se juntan en una.', b: [
      '. . . .',
      '. 2 2 .',
      '. 4 4 .',
      '8 . . 8'] },
    { /*  2 */ name: 'Todo a la esquina', goal: 64, g: 4, mv: 0, tip: 'Truco de oro: manda siempre las fichas a la misma esquina y no la sueltes.', b: [
      '. . . .',
      '. . . .',
      '4 . . .',
      '2 2 4 8'] },
    { /*  3 */ name: 'Fila ordenada', goal: 64, g: 4, mv: 0, tip: 'Deja la fila de abajo ordenada de mayor a menor: así siempre hay una unión a mano.', b: [
      '. . . .',
      '. . . .',
      '. . 2 4',
      '2 4 8 16'] },
    { /*  4 */ name: 'Sube a 128', goal: 128, g: 4, mv: 0, tip: 'Dos 64 hacen 128. Guarda las fichas grandes juntas en la misma fila.', b: [
      '. . . .',
      '. . . .',
      '2 4 8 16',
      '4 8 16 32'] },
    /* ---- 5-6: rejilla de 3×3 y movimientos contados. ---- */
    { /*  5 */ name: 'Rejilla apretada', goal: 64, g: 3, mv: 0, tip: 'Nueve casillas nada más: no dejes fichas sueltas por el medio.', b: [
      '2 4 .',
      '. 2 .',
      '4 . 2'] },
    { /*  6 */ name: 'Movimientos contados', goal: 128, g: 4, mv: 70, tip: 'Ahora los movimientos se acaban. Que cada deslizamiento junte algo.', b: [
      '. . . .',
      '. . . .',
      '4 8 16 32',
      '2 4 8 64'] },
    /* ---- 7-9: muros de piedra y tablero de 5×5. ---- */
    { /*  7 */ name: 'Muros de piedra', goal: 128, g: 4, mv: 0, tip: 'La piedra no se mueve ni se junta: las fichas se paran al chocar con ella.', b: [
      '. . . .',
      '. . . .',
      '. . # .',
      '2 4 8 16'] },
    { /*  8 */ name: 'Tablero grande', goal: 256, g: 5, mv: 0, tip: 'Veinticinco casillas: más sitio para maniobrar, pero el objetivo sube.', b: [
      '. . . . .',
      '. . . . .',
      '. . 2 . .',
      '. 2 4 8 .',
      '2 4 8 16 .'] },
    { /*  9 */ name: 'Piedra y hueco', goal: 256, g: 5, mv: 300, tip: 'Cuatro muros parten el tablero. Trabaja por la fila de abajo.', b: [
      '. . . . .',
      '. # . . .',
      '. . . . .',
      '. . . # .',
      '2 . 4 . 8'] },
    /* ---- 10-11: prohibido subir. ---- */
    { /* 10 */ name: 'Prohibido subir', goal: 128, g: 4, mv: 0, ban: ['up'], tip: 'Aquí no puedes deslizar hacia arriba. Construye siempre hacia abajo.', b: [
      '. . . .',
      '. . . .',
      '2 4 . .',
      '4 8 16 .'] },
    { /* 11 */ name: 'Abajo y a un lado', goal: 256, g: 4, mv: 0, ban: ['up'], tip: 'Sin subir, la fila de abajo es tu suelo: llénala de mayor a menor.', b: [
      '. . . .',
      '. . . .',
      '. 2 4 8',
      '2 4 8 16'] },
    /* ---- 12-13: hielo. ---- */
    { /* 12 */ name: 'Fichas heladas', goal: 128, g: 4, mv: 0, tip: 'El hielo no se mueve. Junta dos fichas en una casilla vecina y se rompe.', b: [
      '. . . .',
      '. f4 . .',
      '. . f4 .',
      '2 4 8 16'] },
    { /* 13 */ name: 'Deshielo', goal: 256, g: 5, mv: 0, tip: 'Tres bloques de hielo en medio: rómpelos pronto o te cerrarán el paso.', b: [
      '. . . . .',
      '. f8 . f8 .',
      '. . f16 . .',
      '. . . . .',
      '2 4 8 16 32'] },
    /* ---- 14-15: comodines. ---- */
    { /* 14 */ name: 'Comodines', goal: 256, g: 4, mv: 0, sp: [2, 2, 2, 2, 2, 2, 4, 4, '*'], tip: 'La estrella se une con cualquier ficha y la duplica. Gástala en la más grande.', b: [
      '. . . .',
      '. . * .',
      '. 2 4 8',
      '2 4 8 16'] },
    { /* 15 */ name: 'Estrellas apretadas', goal: 128, g: 3, mv: 90, sp: [2, 2, 2, 2, 4, '*'], tip: 'Rejilla de 3×3 y movimientos contados: la estrella es tu salida de apuros.', b: [
      '2 4 .',
      '* . 2',
      '4 2 8'] },
    /* ---- 16-17: todo mezclado. ---- */
    { /* 16 */ name: 'Hielo y piedra', goal: 512, g: 5, mv: 0, tip: 'Muros que no se mueven e hielo que hay que romper. Paciencia y esquina.', b: [
      '. . . . .',
      '. # . # .',
      '. f16 . f16 .',
      '. . . . .',
      '2 4 8 16 32'] },
    { /* 17 */ name: 'Sin subir, con muro', goal: 256, g: 4, mv: 200, ban: ['up'], tip: 'Ni arriba ni por esa esquina: el muro te obliga a ordenar de otra manera.', b: [
      '. . . #',
      '. . . .',
      '. 2 4 .',
      '2 4 8 16'] },
    /* ---- 18-20: el 2048 de verdad, cada vez más alto. ---- */
    { /* 18 */ name: 'Rumbo a 512', goal: 512, g: 4, mv: 0, tip: 'Tablero limpio y objetivo serio. Elige una esquina y no deslices nunca contra ella.', b: [
      '. . . .',
      '. . . .',
      '. . . .',
      '2 . . 2'] },
    { /* 19 */ name: 'Rumbo a 1024', goal: 1024, g: 4, mv: 0, tip: 'Mantén la fila de abajo ordenada y guarda siempre una columna de repuesto.', b: [
      '. . . .',
      '. . . .',
      '. . . .',
      '2 . . 4'] },
    { /* 20 */ name: '2048 clásico', goal: 2048, g: 4, mv: 0, tip: 'El desafío completo: llega a 2048 en el tablero de siempre. Buena suerte.' }
  ]
};

if (typeof module !== 'undefined' && module.exports) module.exports = G2048LV;
