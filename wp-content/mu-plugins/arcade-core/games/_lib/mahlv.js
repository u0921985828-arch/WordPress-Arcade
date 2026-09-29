/* Disposiciones a mano de mahjong-solitaire (plan Friv / la vara).
 *
 * 20 tableros DIBUJADOS UNO A UNO: ninguno se genera al azar. Cada capa es una rejilla de
 * texto (fila = y, carácter = x) y las capas van de abajo (0) arriba:
 *   #  ficha normal          .  hueco
 *   W  comodín (empareja con cualquier ficha libre)            — desde el nivel 6
 *   I  ficha helada (dos parejas cerca para romper el hielo)   — desde el nivel 9
 *   T  ficha con cuenta atrás (si llega a cero te quita segundos) — desde el nivel 12
 * Una capa puede empezar por '@dx,dy' para desplazarla media ficha (los puentes).
 *
 * CAMPOS de cada nivel:
 *   n  nombre del tablero          i  la idea nueva que enseña (tarjeta de inicio y HUD)
 *   s  símbolos distintos en juego (más símbolos = menos parejas a la vista)
 *   sec segundos de reloj en normal     t2  segundos para la 2ª estrella en normal
 *   sh  barajadas que necesitó el bot de referencia (0 = se limpia sin barajar nunca;
 *       comprobado con un resolutor con vuelta atrás en las tres dificultades)
 *   L   las capas
 *
 * SIEMPRE RESOLUBLE: el reparto de símbolos se hace por COLOCACIÓN INVERSA con semilla fija
 * por nivel (mismo tablero en cada intento): se retiran parejas libres del tablero lleno y a
 * cada pareja retirada se le da su símbolo; ese orden de retirada ES una solución.
 * El comodín solo añade jugadas (conserva su símbolo), el hielo se resquebraja solo si no
 * quedan jugadas y la cuenta atrás nunca bloquea: ninguna ficha especial rompe la garantía.
 */
const MAHLV = (function () {
/* <LV> ---- zona pura (se puede requerir desde Node para verificar) ---- */
const G = {
  'mahjong-solitaire': [
    /* ---- 1-5: lo básico. Lado libre, pisos, puentes y muros. ---- */
    { n: 'Primeros pasos', i: 'Solo se cogen fichas con un lado libre: la izquierda o la derecha despejada.', s: 6, sec: 92, t2: 58, sh: 0, L: [
      ['######',
       '######',
       '######',
       '######'] ] },
    { n: 'Dos pisos', i: 'Una ficha con algo encima no se puede coger. Empieza por arriba.', s: 8, sec: 136, t2: 88, sh: 0, L: [
      ['########',
       '########',
       '########',
       '########'],
      ['........',
       '..####..',
       '..####..',
       '........'] ] },
    { n: 'La torre', i: 'La cima se despeja sola: cada piso que quitas abre el de abajo.', s: 9, sec: 148, t2: 95, sh: 0, L: [
      ['########',
       '########',
       '########',
       '########'],
      ['........',
       '..####..',
       '..####..',
       '........'],
      ['........',
       '...##...',
       '...##...',
       '........'] ] },
    { n: 'El puente', i: 'El puente va a media ficha: tapa dos filas a la vez.', s: 10, sec: 182, t2: 118, sh: 0, L: [
      ['############',
       '############',
       '############',
       '############'],
      ['@0,0.5',
       '....####....',
       '....####....'] ] },
    { n: 'Doble muro', i: 'Dos muros y un pasillo: los cantos del pasillo siempre están libres.', s: 10, sec: 182, t2: 118, sh: 0, L: [
      ['#####..#####',
       '#####..#####',
       '#####..#####',
       '#####..#####'],
      ['............',
       '.###....###.',
       '.###....###.',
       '............'],
      ['............',
       '..#......#..',
       '..#......#..',
       '............'] ] },
    /* ---- 6-8: el comodín. ---- */
    { n: 'El comodín', i: 'La ficha dorada es COMODÍN: hace pareja con cualquier ficha libre.', s: 9, sec: 172, t2: 110, sh: 0, L: [
      ['#W######W#',
       '##########',
       '##########',
       '##########'],
      ['..........',
       '..######..',
       '..######..',
       '..........'] ] },
    { n: 'Cuatro comodines', i: 'Guarda los comodines para el final: valen más cuando quedan pocas fichas.', s: 10, sec: 198, t2: 126, sh: 0, L: [
      ['W##########W',
       '##.######.##',
       '##.######.##',
       'W##########W'],
      ['............',
       '...######...',
       '...######...',
       '............'],
      ['............',
       '.....##.....',
       '.....##.....',
       '............'] ] },
    { n: 'La herradura', i: 'Un tablero con hueco dentro: se abre por el centro y por los bordes.', s: 10, sec: 198, t2: 128, sh: 0, L: [
      ['############',
       '####....####',
       '####....####',
       '####....####',
       '############'],
      ['............',
       '.##......##.',
       '.##......##.',
       '.##......##.',
       '............'],
      ['............',
       '............',
       '.#........#.',
       '............',
       '............'] ] },
    /* ---- 9-11: el hielo. ---- */
    { n: 'Hielo en la orilla', i: 'La ficha HELADA no se coge: rompe el hielo quitando dos parejas a su lado.', s: 10, sec: 198, t2: 128, sh: 0, L: [
      ['I##########I',
       '############',
       '############',
       '############'],
      ['............',
       '...######...',
       '...######...',
       '............'],
      ['............',
       '............',
       '.....##.....',
       '............'] ] },
    { n: 'Torre helada', i: 'Hielo arriba del todo: para romperlo hay que trabajar en la cumbre.', s: 11, sec: 232, t2: 150, sh: 0, L: [
      ['############',
       '############',
       '############',
       '############'],
      ['............',
       '..I######I..',
       '..########..',
       '............'],
      ['............',
       '....####....',
       '....####....',
       '............'],
      ['............',
       '.....##.....',
       '............',
       '............'] ] },
    { n: 'El abanico', i: 'Las puntas del abanico se abren primero; el centro es lo último.', s: 11, sec: 232, t2: 150, sh: 0, L: [
      ['...#######...',
       '..#########..',
       '.###########.',
       '#############',
       '#############'],
      ['.............',
       '....#####....',
       '...#######...',
       '..#########..',
       '.............'] ] },
    /* ---- 12-14: la cuenta atrás. ---- */
    { n: 'Cuenta atrás', i: 'La ficha del RELOJ estalla si llega a cero y te quita segundos. Quítala pronto.', s: 12, sec: 244, t2: 158, sh: 0, L: [
      ['############',
       '############',
       '############',
       '############',
       '############'],
      ['............',
       '...T####T...',
       '...######...',
       '...######...',
       '............'] ] },
    { n: 'Puente con prisa', i: 'Los relojes viajan en el puente: cruzarlo es lo primero.', s: 12, sec: 250, t2: 162, sh: 0, L: [
      ['##############',
       '##############',
       '##############',
       '##############'],
      ['..............',
       '.####....####.',
       '.####....####.',
       '..............'],
      ['@0,0.5',
       '..............',
       '...T######T...'] ] },
    { n: 'La mariposa', i: 'Dos alas iguales: lo que abres en un ala te sirve para la otra.', s: 13, sec: 262, t2: 170, sh: 0, L: [
      ['####.....####',
       '######.######',
       '#############',
       '######.######',
       '####.....####'],
      ['.............',
       '.####...####.',
       '..#########..',
       '.####...####.',
       '.............'],
      ['.............',
       '.............',
       '....######...',
       '.............',
       '.............'] ] },
    /* ---- 15-19: todo junto y tableros grandes. ---- */
    { n: 'Hielo y comodín', i: 'Hielo arriba y comodines abajo: el comodín también rompe el hielo si llega libre.', s: 14, sec: 284, t2: 184, sh: 0, L: [
      ['W##########W',
       '############',
       '############',
       '############',
       '############'],
      ['............',
       '..I######I..',
       '..########..',
       '..########..',
       '............'],
      ['............',
       '............',
       '....####....',
       '....####....',
       '............'] ] },
    { n: 'La pirámide', i: 'Cuatro pisos, cada uno más pequeño. Se baja desde la punta.', s: 14, sec: 296, t2: 192, sh: 0, L: [
      ['############',
       '############',
       '############',
       '############'],
      ['............',
       '.##########.',
       '.##########.',
       '............'],
      ['............',
       '..########..',
       '..########..',
       '............'],
      ['............',
       '...######...',
       '...######...',
       '............'] ] },
    { n: 'Reloj helado', i: 'Relojes y hielo a la vez: decide qué corre más prisa.', s: 15, sec: 296, t2: 192, sh: 0, L: [
      ['############',
       '############',
       '############',
       '############',
       '############'],
      ['............',
       '.T########T.',
       '.##########.',
       '.I########I.',
       '............'],
      ['............',
       '............',
       '...######...',
       '............',
       '............'] ] },
    { n: 'Dos torres', i: 'Dos torres y un patio: sube por las dos a la vez o te quedarás sin parejas.', s: 15, sec: 312, t2: 202, sh: 0, L: [
      ['##############',
       '##############',
       'W####....####W',
       '##############',
       '##############'],
      ['..............',
       '.####....####.',
       '.####....####.',
       '.####....####.',
       '..............'],
      ['..............',
       '..............',
       '..##......##..',
       '..##......##..',
       '..............'],
      ['..............',
       '..............',
       '..##......##..',
       '..............',
       '..............'] ] },
    { n: 'El laberinto', i: 'Rejilla con callejones: casi todo tiene un lado libre, pero hay pocas parejas.', s: 16, sec: 322, t2: 210, sh: 0, L: [
      ['#############',
       '#.#.#.#.#.#.#',
       '#############',
       '#.#.#.#.#.#.#',
       '#############',
       '#############'],
      ['.###########.',
       '.............',
       '.###########.',
       '.............',
       '.............',
       '.............'],
      ['..T#######T..',
       '.............',
       '..I#######I..',
       '.............',
       '.............',
       '.............'] ] },
    { n: 'El dragón', i: 'El reto grande: 140 fichas con comodines, hielo y relojes. Aquí se acaba el juego.', s: 18, sec: 420, t2: 277, sh: 0, L: [
      ['..W########W..',
       '.############.',
       '#.##########.#',
       '##############',
       '#.##########.#',
       '.############.',
       '..W########W..'],
      ['..............',
       '...I######I...',
       '..##########..',
       '..##########..',
       '..##########..',
       '...########...',
       '..............'],
      ['..............',
       '..............',
       '.....T##T.....',
       '.....####.....',
       '.....####.....',
       '..............',
       '..............'] ] }
  ]
};

/* ---- utilidades puras: las mismas reglas en el juego y en el verificador ---- */
const EPS = 1e-6;
function rngOf(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function parse(lv) {
  const P = [];
  for (let z = 0; z < lv.L.length; z++) {
    let rows = lv.L[z], ox = 0, oy = 0;
    if (typeof rows[0] === 'string' && rows[0].charAt(0) === '@') { const m = rows[0].slice(1).split(','); ox = +m[0] || 0; oy = +m[1] || 0; rows = rows.slice(1); }
    for (let ry = 0; ry < rows.length; ry++) { const row = rows[ry];
      for (let x = 0; x < row.length; x++) { const ch = row.charAt(x); if (ch === '.' || ch === ' ') continue; P.push({ x: x + ox, y: ry + oy, z: z, c: ch }); } }
  }
  return P;
}
/* Una ficha está libre si no tiene nada encima y le falta el vecino de un lado. */
function freeIn(tl, set) {
  let L = false, R = false;
  for (let i = 0; i < set.length; i++) { const o = set[i]; if (o === tl) continue;
    if (o.z === tl.z + 1) { if (Math.abs(o.x - tl.x) < 1 - EPS && Math.abs(o.y - tl.y) < 1 - EPS) return false; continue; }
    if (o.z !== tl.z || Math.abs(o.y - tl.y) >= 1 - EPS) continue;
    if (o.x < tl.x - EPS && o.x > tl.x - 1 - EPS) L = true; else if (o.x > tl.x + EPS && o.x < tl.x + 1 + EPS) R = true; }
  return !L || !R;
}
/* Colocación inversa: se retiran parejas libres del tablero lleno y se les da símbolo.
   El orden de retirada ES una solución, así que el tablero siempre se puede terminar. */
function assign(pos, types, rnd) {
  const shuf = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  for (let tries = 0; tries < 300; tries++) {
    const rem = pos.map((p) => ({ x: p.x, y: p.y, z: p.z, c: p.c })), out = []; let ok = true;
    const ts = shuf(types.slice());
    for (let n = 0; n < ts.length; n++) {
      const fr = []; for (let i = 0; i < rem.length; i++) if (freeIn(rem[i], rem)) fr.push(rem[i]);
      if (fr.length < 2) { ok = false; break; }
      shuf(fr); const a = fr[0], b = fr[1]; a.t = ts[n]; b.t = ts[n]; out.push(a, b);
      rem.splice(rem.indexOf(a), 1); rem.splice(rem.indexOf(b), 1);
    }
    if (ok && !rem.length) return out;
  }
  return null;
}
/* Tablero del nivel idx (1..20). Semilla fija: el mismo tablero en cada intento. */
function build(slug, idx) {
  const list = G[slug]; if (!list) return null;
  const lv = list[idx - 1]; if (!lv) return null;
  const pos = parse(lv); if (pos.length % 2) return null;
  const rnd = rngOf(0x5eed + idx * 7919 + pos.length * 131 + lv.s * 17);
  const types = []; for (let i = 0; i < pos.length / 2; i++) types.push(i % lv.s);
  const sol = assign(pos, types, rnd); if (!sol) return null;
  let cols = 0, rows = 0, mz = 0;
  for (let i = 0; i < pos.length; i++) { cols = Math.max(cols, pos[i].x + 1); rows = Math.max(rows, pos[i].y + 1); mz = Math.max(mz, pos[i].z); }
  return { lv: lv, sol: sol, cols: cols, rows: rows, mz: mz, n: pos.length };
}
/* </LV> */
return { G: G, build: build, parse: parse, free: freeIn, rngOf: rngOf, assign: assign };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MAHLV; /* para el verificador en Node */
