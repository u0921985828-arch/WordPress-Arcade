/* Columnas de Joyas (CFG.mode 'joyas'): caen columnas de tres gemas en un pozo de 7×14; se limpian las líneas de tres o
 * más del mismo color en horizontal, vertical y en las dos diagonales, y lo que queda cae y puede encadenar.
 * Arte propio: gemas cacheadas con forma distinta por color (también se distinguen sin ver el tono), pozo con marco.
 *
 * Plan Friv, F3 · tanda 4: si el slug tiene tabla en COLLV (src/eng/collv.js) el juego deja de ser una partida
 * infinita y pasa a 20 niveles escritos a mano, con objetivo propio, montón inicial, límite de columnas, piezas
 * especiales (arcoíris y bomba), piedras y cristales, progreso guardado por dificultad y final de verdad.
 * Sin tabla (cualquier otro juego del motor) se juega exactamente como antes.
 * Curva 1.19/1.23 del modo libre: nivel 1 muy lento y con 4 colores; el quinto color llega en el nivel 4 y el sexto en el 7. */
const OUT = ART.OUT, TAU = 6.2832, ID = CFG.id || 'columnas-de-joyas';
const HAND = (typeof COLLV !== 'undefined' && COLLV[ID]) || null;
const COLS = 7, ROWS = 14;
const RW = 360, RH = 640;   /* caja de referencia; con HAND el lienzo es fluido y manda k.W/k.H */
const HELP = 'Cae una columna de tres joyas. Muévela a los lados, tócala (o pulsa A) para rotar los colores y deslízala hacia abajo para soltarla. Tres iguales en línea —también en diagonal— desaparecen y lo de arriba cae: así se encadenan combos. La joya arcoíris limpia todas las del color donde aterriza y la bomba revienta las ocho casillas de alrededor. Las piedras solo se rompen si algo estalla pegado a ellas, y los cristales marcados no combinan: hay que bajarlos hasta el suelo.';
const k = Kit({
  w: RW, h: RH, title: CFG.title, bg: '#191134',
  fluid: HAND ? { min: 0.4, max: 2.9, maxW: 980, maxH: 940 } : false,
  help: HAND ? HELP : '',
}), c = k.ctx;

/* <LV> ----------------------------------------------------------------------------------------
   Reglas puras del pozo: no tocan el lienzo ni el kit, así que scripts/…/Node las carga entre las
   marcas <LV> y </LV> para verificar que los 20 niveles de collv.js son alcanzables.
   Una casilla es {c, rock, hp, cr, mark, pop, off}: c 0..5 color, -1 arcoíris, -2 bomba. */
const CDIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const isGem = (g) => !!g && g.c >= 0 && !g.rock && !g.cr && !g.ice;
function mkF(pre) {
  const F = []; for (let y = 0; y < ROWS; y++) F.push(new Array(COLS).fill(null));
  if (pre && pre.length) {
    const y0 = ROWS - pre.length;
    for (let i = 0; i < pre.length; i++) for (let x = 0; x < COLS; x++) {
      const ch = pre[i][x] || '.', y = y0 + i;
      if (ch === '#') F[y][x] = { c: -3, rock: 1, hp: 1, off: 0, pop: 0 };
      else if (ch === '@') F[y][x] = { c: -3, rock: 1, hp: 2, off: 0, pop: 0 };
      else if (ch === 'D') F[y][x] = { c: -4, cr: 1, off: 0, pop: 0 };
      else if (ch >= '1' && ch <= '6') F[y][x] = { c: +ch - 1, off: 0, pop: 0 };
      else if ('abcdef'.indexOf(ch) >= 0) F[y][x] = { c: 'abcdef'.indexOf(ch), ice: 1, off: 0, pop: 0 };
    }
  }
  return F;
}
/* marca todas las líneas de 3 o más (4 direcciones) */
function findMatches(F) {
  let any = false;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const a = F[y][x]; if (!isGem(a)) continue;
    for (let d = 0; d < 4; d++) {
      const dx = CDIRS[d][0], dy = CDIRS[d][1];
      let n = 1;
      for (;;) { const nx = x + dx * n, ny = y + dy * n; if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) break; const b = F[ny][nx]; if (!isGem(b) || b.c !== a.c) break; n++; }
      if (n >= 3) { for (let i = 0; i < n; i++) F[y + dy * i][x + dx * i].mark = 1; any = true; }
    }
  }
  return any;
}
/* Lo que toca (en cruz) algo que estalla: las piedras pierden dureza y el hielo se descongela.
   Devuelve {rock, ice} para que el juego y el simulador cuenten lo mismo. */
function hitRocks(F) {
  const hit = [], thaw = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const g = F[y][x]; if (!g || g.mark || (!g.rock && !g.ice)) continue;
    for (let d = 0; d < 4; d++) {
      const b = F[y + ORTHO[d][1]] && F[y + ORTHO[d][1]][x + ORTHO[d][0]];
      if (b && b.mark && !b.rock) { (g.rock ? hit : thaw).push(g); break; }
    }
  }
  for (let i = 0; i < hit.length; i++) { hit[i].hp--; hit[i].fx = 1; if (hit[i].hp <= 0) hit[i].mark = 1; }
  for (let i = 0; i < thaw.length; i++) { thaw[i].ice = 0; thaw[i].fx = 1; }
  return { rock: hit.length, ice: thaw.length };
}
/* bomba: revienta las 8 casillas de alrededor y la suya (los cristales aguantan) */
function blast(F, x, y) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const b = F[y + dy] && F[y + dy][x + dx]; if (!b || b.cr) continue;
    if (b.rock) b.hp = 0;
    b.ice = 0; b.mark = 1; n++;
  }
  return n;
}
/* arcoíris: limpia todas las joyas del color indicado (y las demás arcoíris) */
function wild(F, col) {
  let n = 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const g = F[y][x]; if (g && !g.rock && !g.cr && !g.ice && (g.c === col || g.c === -1)) { g.mark = 1; n++; } }
  return n;
}
/* rayo (pieza especial de la tanda 7): limpia la fila y la columna donde aterriza; los cristales
   aguantan, las piedras se rompen de golpe y el hielo se lleva la capa por delante. */
function ray(F, x, y) {
  let n = 0;
  for (let i = 0; i < COLS; i++) { const b = F[y] && F[y][i]; if (!b || b.cr || b.mark) continue; if (b.rock) b.hp = 0; b.ice = 0; b.mark = 1; n++; }
  for (let j = 0; j < ROWS; j++) { const b = F[j] && F[j][x]; if (!b || b.cr || b.mark) continue; if (b.rock) b.hp = 0; b.ice = 0; b.mark = 1; n++; }
  return n;
}
/* el suelo sube (niveles con `rise`): todo el pozo se desplaza una fila y entra una fila nueva
   de joyas del nivel con un hueco. Devuelve 1 si algo se sale por arriba (pozo desbordado). */
function riseRow(F, cols, rnd, CSz) {
  let over = 0;
  for (let x = 0; x < COLS; x++) if (F[0][x]) over = 1;
  if (over) return 1;
  for (let y = 0; y < ROWS - 1; y++) for (let x = 0; x < COLS; x++) { F[y][x] = F[y + 1][x]; if (F[y][x]) F[y][x].off = -(CSz || 1); }
  const gap = Math.floor(rnd() * COLS);
  for (let x = 0; x < COLS; x++) F[ROWS - 1][x] = x === gap ? null : { c: Math.floor(rnd() * cols), off: -(CSz || 1), pop: 0 };
  return 0;
}
function anyMark(F) { for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (F[y][x] && F[y][x].mark) return true; return false; }
/* saca lo marcado y devuelve la lista de casillas limpiadas */
function takeMarked(F) {
  const out = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const g = F[y][x]; if (g && g.mark) { out.push({ x: x, y: y, c: g.c, rock: !!g.rock, cr: !!g.cr }); F[y][x] = null; } }
  return out;
}
function gravity(F, CSz) {
  let moved = false;
  for (let x = 0; x < COLS; x++) {
    let w = ROWS - 1;
    for (let y = ROWS - 1; y >= 0; y--) if (F[y][x]) { if (y !== w) { F[w][x] = F[y][x]; F[w][x].off = (w - y) * (CSz || 1); F[y][x] = null; moved = true; } w--; }
  }
  return moved;
}
/* cristales que ya tocan el suelo (columna a columna) */
function floorCrystals(F) { const o = []; for (let x = 0; x < COLS; x++) { const g = F[ROWS - 1][x]; if (g && g.cr) o.push(x); } return o; }
const landRowOn = (F, x) => { let y = ROWS - 1; while (y >= 0 && F[y][x]) y--; return y; };
if (typeof module !== 'undefined' && module.exports) module.exports = { COLS: COLS, ROWS: ROWS, mkF: mkF, findMatches: findMatches, hitRocks: hitRocks, blast: blast, wild: wild, ray: ray, riseRow: riseRow, anyMark: anyMark, takeMarked: takeMarked, gravity: gravity, floorCrystals: floorCrystals, landRowOn: landRowOn, isGem: isGem };
/* </LV> -------------------------------------------------------------------------------------- */

/* ---------- R5 §8 «pieza única» + cartoon de estudio (helpers locales) ----------
   uni(): contornea TODAS las partes y luego las rellena → solo sobrevive la silueta exterior.
   celp(): 3 tonos de borde duro (cel shading) recortados a la silueta, sin degradados.
   spec(): único óvalo especular.  contact(): sombra de contacto dura. */
function uni(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = ART.OUT; g.lineWidth = (ow || 1.5) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
}
function inpath(g, parts, fn) { g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip(); fn(g); g.restore(); }
function celp(g, parts, base, dx, dy) {
  inpath(g, parts, (h) => {
    const P = () => { h.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](h); h.fill(); };
    h.fillStyle = ART.dark(base, 0.24); P();
    h.translate(-dx, -dy); h.fillStyle = base; P();
    h.translate(-dx * 1.15, -dy * 1.15); h.fillStyle = ART.lite(base, 0.2); P();
  });
}
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.7 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); g.fill(); }
const GEM = [
  { c: '#ff6fb5', s: 'diamante', n: 'rosas' }, { c: '#5b8cff', s: 'redonda', n: 'azules' }, { c: '#a8cf3f', s: 'cuadrada', n: 'verdes' },
  { c: '#ffc94d', s: 'gota', n: 'ámbar' }, { c: '#a097ff', s: 'hexagono', n: 'lilas' }, { c: '#ff7a59', s: 'estrella', n: 'corales' },
];
let F, piece, next, fall, score, level, cleared, chain, phase, phT, t, over, msg, msgT, hard, bgCv;
let LV = null, drops = 0, done = false, nGems = 0, nCol = 0, nChain = 0, nRock = 0, nCry = 0, bannerT = 0, lost = '';
/* Tanda 7 (vara de docs/VARA.md): hielo, rayo, suelo que sube, cuenta atrás, cadenas profundas,
   salvavidas a partir del nivel 11 y estrellas 1/2/3 por nivel y dificultad. */
let nIce = 0, nDeep = 0, nBig = 0, life = 0, lifeUsed = 0, tLeft = 0, riseIn = 0, stars = 1, deepMax = 0, rescueT = 0;
const spr = [];

/* ---------- disposición (fluida con niveles a mano) ---------- */
let CS = 34, X0 = 0, Y0 = 96, PX = 0, PGY = 0, POY = 0, PH = 0, sidePanel = false, TOPB = 66, BOTB = 52;
const PW = 150;
function layout() {
  TOPB = HAND ? (k.W < 420 ? 80 : 84) : 96;
  sidePanel = HAND ? k.W >= 560 : false;
  /* sin panel lateral la franja baja lleva objetivo y «Siguiente»; el botón de pausa de kit
     (CFG.hud 'bl') ocupa los 44 px de abajo a la izquierda, así que la franja se agranda. */
  BOTB = HAND ? (sidePanel ? 52 : 70) : 50;
  const avW = k.W - 26 - (sidePanel ? PW + 14 : 0), avH = k.H - TOPB - BOTB;
  CS = Math.max(13, Math.min(46, Math.floor(Math.min(avW / COLS, avH / ROWS))));
  const bw = COLS * CS, tot = bw + (sidePanel ? PW + 14 : 0);
  X0 = Math.round((k.W - tot) / 2);
  PX = X0 + bw + 14;
  Y0 = Math.round(TOPB + Math.max(0, (avH - ROWS * CS) / 2));
  /* panel lateral: rótulo + 3 joyas + objetivo (hasta 3 líneas) */
  const gh = CS * 0.8;
  PGY = Y0 + 34; POY = PGY + gh * 2 + gh * 0.7 + 18; PH = POY + 22 + 3 * 19 + 62 - (Y0 - 10);
  buildSprites(); bgCv = null;
}
const cx = (x) => X0 + x * CS + CS / 2, cy = (y) => Y0 + y * CS + CS / 2;
/* cadena en curso: se mantiene visible un momento tras el último estallido (§A3) */
let multV = 1, multT = 0;
const mult = () => (multT > 0 ? multV : 1);
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w * 2)); cv.height = Math.max(1, Math.ceil(h * 2)); const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
/* encoge el cuerpo del texto hasta que quepa en `max` */
function fitSize(s, size, max) {
  let z = size;
  c.font = `800 ${z}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  while (z > 8 && c.measureText(s).width > max) { z -= 1; c.font = `800 ${z}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; }
  return z;
}

/* barra de progreso y fila de tres estrellas (marcador; §A1 y §A6 de GANCHO.md) */
function bar(x, y, w2, h2, v, col) {
  ART.rr(c, x, y, w2, h2, h2 / 2); c.fillStyle = 'rgba(12,8,28,.55)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.18)'; c.stroke();
  const ww = Math.max(0, Math.min(1, v)) * (w2 - 4);
  if (ww > 1) { ART.rr(c, x + 2, y + 2, ww, h2 - 4, (h2 - 4) / 2); c.fillStyle = col; c.fill(); }
}
function starRow(x, y, n, sz) {
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    for (let q = 0; q < 10; q++) { const a = -1.5708 + q * TAU / 10, rr = q % 2 ? sz * 0.42 : sz; c[q ? 'lineTo' : 'moveTo'](x + i * sz * 2.4 + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.lineWidth = 2.2; c.lineJoin = 'round'; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = i < n ? '#ffd166' : 'rgba(255,255,255,.16)'; c.fill();
  }
}
/* ---------- gemas, piedras y cristales cacheados ---------- */
function gemPath(g, s, r) {
  g.beginPath();
  if (s === 'diamante') { g.moveTo(0, -r); g.lineTo(r * 0.82, 0); g.lineTo(0, r); g.lineTo(-r * 0.82, 0); g.closePath(); }
  else if (s === 'redonda') g.arc(0, 0, r * 0.94, 0, TAU);
  else if (s === 'cuadrada') ART.rr(g, -r * 0.82, -r * 0.82, r * 1.64, r * 1.64, r * 0.26);
  else if (s === 'gota') { g.moveTo(0, -r); g.bezierCurveTo(r * 0.95, -r * 0.3, r * 0.8, r * 0.95, 0, r); g.bezierCurveTo(-r * 0.8, r * 0.95, -r * 0.95, -r * 0.3, 0, -r); }
  else if (s === 'hexagono') { for (let i = 0; i < 6; i++) { const a = -1.5708 + i * TAU / 6; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); } g.closePath(); }
  else { for (let i = 0; i < 10; i++) { const a = -1.5708 + i * TAU / 10, rr = i % 2 ? r * 0.44 : r; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); }
}
function gemSprite(i) {
  const o = GEM[i], r = CS * 0.42, S = CS + 6;
  return off(S, S, (g) => {
    g.translate(S / 2, S / 2);
    contact(g, 1, r * 0.78, r * 0.85, r * 0.24, 0.3);
    const parts = [[(h) => gemPath(h, o.s, r), o.c]];
    uni(g, parts, 1.5);
    celp(g, parts, o.c, r * 0.42, r * 0.42);
    spec(g, -r * 0.34, -r * 0.4, r * 0.26, r * 0.15, -0.6, 0.78);
  });
}
function rainbowSprite() {
  const r = CS * 0.42, S = CS + 6;
  return off(S, S, (g) => {
    g.translate(S / 2, S / 2);
    contact(g, 1, r * 0.78, r * 0.85, r * 0.24, 0.3);
    const gr = g.createLinearGradient(-r, -r, r, r);
    GEM.forEach((q, i) => gr.addColorStop(i / (GEM.length - 1), q.c));
    g.beginPath(); g.arc(0, 0, r * 0.94, 0, TAU); g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.fillStyle = gr; g.fill();
    spec(g, -r * 0.3, -r * 0.35, r * 0.3, r * 0.18, -0.6, 0.6);
    ART.glint(g, r * 0.25, r * 0.3, r * 0.34, '#fff');
  });
}
/* bomba: una sola silueta (cuerpo + mecha salen del mismo trazo) */
function bombSprite() {
  const r = CS * 0.4, S = CS + 6;
  return off(S, S, (g) => {
    g.translate(S / 2, S / 2 + r * 0.08);
    contact(g, 1, r * 0.82, r * 0.8, r * 0.22, 0.3);
    const body = (h) => {
      h.moveTo(r * 0.22, -r * 0.82);
      h.bezierCurveTo(r * 1.0, -r * 0.5, r * 1.0, r * 0.95, 0, r * 0.95);
      h.bezierCurveTo(-r * 1.0, r * 0.95, -r * 1.0, -r * 0.5, -r * 0.22, -r * 0.82);
      h.lineTo(-r * 0.22, -r * 1.02);
      h.bezierCurveTo(-r * 0.5, -r * 1.5, r * 0.32, -r * 1.45, r * 0.5, -r * 1.05);
      h.lineTo(r * 0.22, -r * 0.95); h.closePath();
    };
    const parts = [[body, '#3a3358']];
    uni(g, parts, 1.6);
    celp(g, parts, '#3a3358', r * 0.34, r * 0.34);
    g.fillStyle = '#ffc94d'; g.beginPath(); g.arc(r * 0.46, -r * 1.06, r * 0.2, 0, TAU); g.fill();
    spec(g, -r * 0.34, -r * 0.24, r * 0.24, r * 0.14, -0.6, 0.55);
  });
}
/* piedra: silueta única de canto rodado; la dura lleva vetas oscuras */
function rockSprite(hard2) {
  const r = CS * 0.44, S = CS + 6, base = hard2 ? '#6b5f8d' : '#8d86a8';
  return off(S, S, (g) => {
    g.translate(S / 2, S / 2);
    contact(g, 1, r * 0.8, r * 0.85, r * 0.22, 0.3);
    const body = (h) => {
      h.moveTo(-r * 0.92, -r * 0.2); h.lineTo(-r * 0.55, -r * 0.86); h.lineTo(r * 0.2, -r * 0.95);
      h.lineTo(r * 0.9, -r * 0.35); h.lineTo(r * 0.82, r * 0.55); h.lineTo(r * 0.15, r * 0.93);
      h.lineTo(-r * 0.6, r * 0.78); h.closePath();
    };
    const parts = [[body, base]];
    uni(g, parts, 1.6);
    celp(g, parts, base, r * 0.4, r * 0.4);
    inpath(g, parts, (h) => {
      h.strokeStyle = 'rgba(20,14,40,.38)'; h.lineWidth = Math.max(1.4, r * 0.13); h.lineCap = 'round';
      h.beginPath(); h.moveTo(-r * 0.45, -r * 0.1); h.lineTo(r * 0.05, r * 0.25); h.lineTo(r * 0.5, r * 0.05); h.stroke();
      if (hard2) { h.beginPath(); h.moveTo(-r * 0.2, -r * 0.7); h.lineTo(-r * 0.05, -r * 0.15); h.stroke(); }
    });
    spec(g, -r * 0.3, -r * 0.5, r * 0.24, r * 0.12, -0.5, 0.45);
  });
}
/* cristal marcado: prisma alto de una pieza con destello */
function crystalSprite() {
  const r = CS * 0.44, S = CS + 6, base = '#7cf7e0';
  return off(S, S, (g) => {
    g.translate(S / 2, S / 2);
    contact(g, 1, r * 0.84, r * 0.72, r * 0.2, 0.32);
    const body = (h) => { h.moveTo(0, -r * 1.0); h.lineTo(r * 0.62, -r * 0.3); h.lineTo(r * 0.42, r * 0.86); h.lineTo(-r * 0.42, r * 0.86); h.lineTo(-r * 0.62, -r * 0.3); h.closePath(); };
    const parts = [[body, base]];
    uni(g, parts, 1.6);
    celp(g, parts, base, r * 0.36, r * 0.36);
    inpath(g, parts, (h) => { h.fillStyle = 'rgba(20,14,40,.22)'; h.beginPath(); h.moveTo(0, -r); h.lineTo(r * 0.62, -r * 0.3); h.lineTo(r * 0.42, r * 0.86); h.lineTo(r * 0.1, r * 0.86); h.closePath(); h.fill(); });
    spec(g, -r * 0.22, -r * 0.42, r * 0.18, r * 0.34, -0.2, 0.7);
  });
}
/* rayo: una sola silueta de relámpago con tres tonos de borde duro (R5 §8) */
function raySprite() {
  const r = CS * 0.46, S = CS + 6, base = '#7cf7ff';
  return off(S, S, (g) => {
    g.translate(S / 2, S / 2);
    contact(g, 1, r * 0.8, r * 0.7, r * 0.2, 0.3);
    const body = (h) => {
      h.moveTo(r * 0.12, -r * 1.0); h.lineTo(-r * 0.74, r * 0.12); h.lineTo(-r * 0.12, r * 0.12);
      h.lineTo(-r * 0.4, r * 1.0); h.lineTo(r * 0.76, -r * 0.16); h.lineTo(r * 0.1, -r * 0.16); h.closePath();
    };
    const parts = [[body, base]];
    uni(g, parts, 1.6);
    celp(g, parts, base, r * 0.34, r * 0.34);
    spec(g, -r * 0.18, -r * 0.34, r * 0.16, r * 0.26, -0.4, 0.75);
  });
}
/* joya helada: la gema del color dentro de un bloque de hielo de una pieza */
function iceSprite(i) {
  const o = GEM[i], r = CS * 0.44, S = CS + 6;
  return off(S, S, (g) => {
    g.translate(S / 2, S / 2);
    contact(g, 1, r * 0.8, r * 0.85, r * 0.22, 0.3);
    const body = (h) => { ART.rr(h, -r * 0.92, -r * 0.92, r * 1.84, r * 1.84, r * 0.3); };
    const parts = [[body, '#bfe9ff']];
    uni(g, parts, 1.6);
    celp(g, parts, '#bfe9ff', r * 0.34, r * 0.34);
    inpath(g, parts, (h) => {
      h.globalAlpha = 0.72; h.translate(0, 0); h.fillStyle = o.c;
      gemPath(h, o.s, r * 0.58); h.fill();
      h.globalAlpha = 1;
      h.strokeStyle = 'rgba(255,255,255,.6)'; h.lineWidth = Math.max(1.4, r * 0.12); h.lineCap = 'round';
      h.beginPath(); h.moveTo(-r * 0.6, -r * 0.2); h.lineTo(-r * 0.1, -r * 0.7); h.stroke();
      h.beginPath(); h.moveTo(r * 0.2, r * 0.55); h.lineTo(r * 0.62, r * 0.1); h.stroke();
    });
    spec(g, -r * 0.4, -r * 0.5, r * 0.2, r * 0.12, -0.5, 0.6);
  });
}
function buildSprites() {
  spr.length = 0;
  for (let i = 0; i < GEM.length; i++) spr.push(gemSprite(i));
  spr.rain = rainbowSprite(); spr.bomb = bombSprite(); spr.ray = raySprite();
  spr.rock = rockSprite(false); spr.rockH = rockSprite(true); spr.cry = crystalSprite();
  spr.ice = []; for (let i = 0; i < GEM.length; i++) spr.ice.push(iceSprite(i));
}
function renderBg() {
  return off(k.W, k.H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, k.H); gr.addColorStop(0, '#332358'); gr.addColorStop(1, '#130d28'); g.fillStyle = gr; g.fillRect(0, 0, k.W, k.H);
    g.fillStyle = 'rgba(255,255,255,.04)';
    for (let i = 0; i < 46; i++) { const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * k.W, y = ((Math.sin(i * 78.233) * 43758.5453) % 1 + 1) % 1 * k.H; g.beginPath(); g.arc(x, y, 2 + (i % 5), 0, TAU); g.fill(); }
    const bw = COLS * CS, bh = ROWS * CS;
    ART.rr(g, X0 - 10, Y0 - 10, bw + 20, bh + 22, 16); ART.fillOut(g, '#463ac4', 3);
    ART.rr(g, X0 - 10, Y0 - 10, bw + 20, bh + 16, 16); ART.fillOut(g, '#6e62f5', 3);
    g.save(); ART.rr(g, X0, Y0, bw, bh, 8); g.clip();
    g.fillStyle = '#1d1540'; g.fillRect(X0, Y0, bw, bh);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { g.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.012)'; g.fillRect(X0 + x * CS, Y0 + y * CS, CS, CS); }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X0, Y0, bw, 6); g.fillRect(X0, Y0, 5, bh);
    g.restore();
    ART.rr(g, X0, Y0, bw, bh, 8); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
    if (sidePanel) { ART.rr(g, PX, Y0 - 10, PW, PH, 14); g.fillStyle = 'rgba(26,21,48,.6)'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = 'rgba(110,98,245,.7)'; g.stroke(); }
  });
}

/* ---------- reglas ---------- */
/* Dificultad: en el modo libre un color menos o más; con niveles a mano los colores los manda el nivel. */
const colorsNow = () => HAND ? LV.cols : k.clamp(Math.min(GEM.length, level < 4 ? 4 : level < 7 ? 5 : 6) + (k.dif === 0 ? -1 : k.dif === 2 ? 1 : 0), 3, GEM.length);
const free = (x, y) => x >= 0 && x < COLS && y < ROWS && (y < 0 || !F[y][x]);
const limNow = () => !HAND || !LV.lim ? 0 : Math.max(8, Math.round(LV.lim * (k.dif === 0 ? 1.35 : k.dif === 2 ? 0.9 : 1)));
/* ★★/★★★: en los niveles de aguante se mide «joyas limpiadas» (más es mejor) y en el resto
   «columnas soltadas» (menos es mejor). Los dos márgenes se escalan con la dificultad igual que
   el límite, así exigir lo mismo cuesta lo mismo en fácil y en difícil. */
const upPar = () => !!(LV && LV.go && LV.go.surv != null);
function parNow() {
  const p = LV.par || [LV.lim || 30, Math.round((LV.lim || 30) * 0.8)];
  const f = upPar() ? (k.dif === 0 ? 0.8 : k.dif === 2 ? 1.12 : 1) : (k.dif === 0 ? 1.35 : k.dif === 2 ? 0.9 : 1);
  return [Math.max(1, Math.round(p[0] * f)), Math.max(1, Math.round(p[1] * f))];
}
const mastNow = () => Math.max(1, (LV.mast || 1) + (k.dif === 0 ? -1 : k.dif === 2 ? 1 : 0));
const timeNow = () => !LV.time ? 0 : Math.round(LV.time * (k.dif === 0 ? 1.3 : k.dif === 2 ? 0.85 : 1));
const riseNow = () => !LV.rise ? 0 : Math.max(4, LV.rise + (k.dif === 0 ? 3 : k.dif === 2 ? -1 : 0));
/* Salvavidas: desde el nivel 11 el pozo lleno no acaba la partida la primera vez — se vacían
   las dos filas de abajo y se sigue, pero se pierde la tercera estrella (§7 de VARA). */
const lifeStart = () => (k.lv >= 11 ? 1 : 0) + (k.dif === 0 ? 1 : 0);
function newPiece() {
  const nc = colorsNow(), g = [];
  for (let i = 0; i < 3; i++) g.push(k.ri(0, nc - 1));
  if (HAND) {
    const pr = (LV.rain || 0) + (k.dif === 0 ? 0.05 : k.dif === 2 ? -0.02 : 0), pb = (LV.bomb || 0) + (k.dif === 0 ? 0.04 : 0);
    const py = (LV.ray || 0) + (k.dif === 0 ? 0.03 : 0);
    const r = Math.random();
    if (pr > 0 && r < pr) g[k.ri(0, 2)] = -1;
    else if (pb > 0 && r < pr + pb) g[k.ri(0, 2)] = -2;
    else if (py > 0 && r < pr + pb + py) g[k.ri(0, 2)] = -5;
  } else if (level >= 3 && Math.random() < 0.06) g[k.ri(0, 2)] = -1;   /* comodín ocasional del modo libre */
  return g;
}
function spawn() {
  piece = { x: Math.floor(COLS / 2), y: 0, g: next || newPiece(), off: 0 };
  next = newPiece(); fall = 0; hard = false;
  if (!free(piece.x, 0)) fill();
}
/* Pozo lleno: salvavidas si queda, si no fin de nivel. */
function fill() {
  if (HAND && life > 0) {
    life--; lifeUsed = 1; rescueT = 1.2;
    for (let y = ROWS - 2; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (F[y][x] && !F[y][x].cr) { k.burst(cx(x), cy(y), '#ffd166', 7, 120); F[y][x] = null; }
    gravity(F, CS);
    msg = '¡Salvavidas!'; msgT = 1.6; k.sfx('win'); k.flash('rgba(255,209,102,.22)'); k.shake(6); k.punch(0.05);
    if (piece) piece.y = 0;
    return;
  }
  over = 0.001; k.sfx('hurt'); k.shake(8);
}
function startLevel() {
  LV = HAND[Math.max(0, Math.min(HAND.length - 1, (k.lv || 1) - 1))];
  level = k.lv || 1;
  F = mkF(LV.pre); gravity(F, CS);
  score = 0; cleared = 0; chain = 0; phase = 'fall'; phT = 0; t = 0; over = 0; msg = ''; msgT = 0; next = null;
  drops = 0; done = false; nGems = 0; nCol = 0; nChain = 0; nRock = 0; nCry = 0; lost = ''; bannerT = 2.6;
  multV = 1; multT = 0;
  nIce = 0; nDeep = 0; nBig = 0; lifeUsed = 0; life = lifeStart(); tLeft = timeNow(); riseIn = riseNow(); stars = 1; deepMax = 0; rescueT = 0;
  k.chainReset();
  spawn();
}
function reset() {
  if (HAND) return startLevel();
  F = mkF(null);
  score = 0; level = 1; cleared = 0; chain = 0; phase = 'fall'; phT = 0; t = 0; over = 0; msg = ''; msgT = 0; next = null;
  drops = 0; done = false; lost = '';
  spawn();
}
function stepSpeed() { return (HAND ? LV.spd : Math.max(0.16, 0.95 * Math.pow(0.86, level - 1))) / k.D.spd; }
const landRow = (x) => landRowOn(F, x);
function move(d) {
  if (phase !== 'fall' || over || done) return;
  const nx2 = piece.x + d;
  if (nx2 < 0 || nx2 >= COLS || landRow(nx2) < Math.ceil(piece.y)) return;
  piece.x = nx2; k.sfx('click');
}
function rotate() { if (phase !== 'fall' || over || done) return; piece.g = [piece.g[2], piece.g[0], piece.g[1]]; k.sfx('click'); }
function lock() {
  const y = Math.floor(piece.y);
  for (let i = 0; i < 3; i++) { const ry = y - i; if (ry < 0) { over = 0.001; k.sfx('hurt'); k.shake(8); return; } F[ry][piece.x] = { c: piece.g[i], pop: 0, off: 0 }; }
  k.sfx('hit'); drops++; if (HAND && LV.rise) riseIn--;
  /* piezas especiales: arcoíris limpia un color entero, bomba revienta su entorno */
  for (let i = 0; i < 3; i++) {
    const ry = y - i, g = F[ry] && F[ry][piece.x]; if (!g) continue;
    if (g.c === -1) {
      let col = -1;
      const below = F[y + 1] && F[y + 1][piece.x];
      if (below && isGem(below)) col = below.c;
      else for (let j = 0; j < 3; j++) { const o = F[y - j] && F[y - j][piece.x]; if (o && o.c >= 0) { col = o.c; break; } }
      if (col < 0) col = k.ri(0, colorsNow() - 1);
      g.mark = 1;
      if (wild(F, col)) { msg = '¡Arcoíris!'; msgT = 1.3; k.sfx('win'); k.flash('rgba(255,255,255,.18)'); }
    } else if (g.c === -2) {
      blast(F, piece.x, ry); msg = '¡Bomba!'; msgT = 1.2; k.sfx('explode'); k.shake(5); k.hitstop(0.05); k.punch(0.05);
    } else if (g.c === -5) {
      g.mark = 1; ray(F, piece.x, ry); msg = '¡Rayo!'; msgT = 1.3; k.sfx('explode'); k.shake(6); k.hitstop(0.06); k.punch(0.06);
      k.reward('¡RAYO!', '#7cf7ff'); k.flash('rgba(124,247,255,.2)');
    }
  }
  chain = 0; phase = 'check'; phT = 0;
}
function resolveMarks() {
  const cells = takeMarked(F);
  if (!cells.length) return 0;
  let gems = 0, rocks = 0, sx = 0, sy = 0, colHit = 0;
  for (let i = 0; i < cells.length; i++) {
    const q = cells[i]; sx += cx(q.x); sy += cy(q.y);
    if (q.rock) { rocks++; k.burst(cx(q.x), cy(q.y), '#b6aed0', 9, 130); }
    else { gems++; if (HAND && LV.go.gems != null && q.c === (LV.go.col || 0)) colHit++; k.burst(cx(q.x), cy(q.y), q.c < 0 ? '#fff' : GEM[q.c].c, 8, 120); }
  }
  chain++;
  const pts = (gems * 10 + rocks * 25) * chain * (1 + Math.floor(level / 4));
  score += pts; cleared += gems; nGems += gems; nRock += rocks; nCol += colHit;
  if (chain === 2) nChain++;
  if (chain === 3) nDeep++;
  if (gems >= 5) nBig++;
  if (chain > deepMax) deepMax = chain;
  multV = chain; multT = 2.2;
  const mx = sx / cells.length, my = sy / cells.length;
  k.float('+' + pts, mx, my - 14, chain > 1 ? '#a8cf3f' : '#fff');
  k.sfx(chain > 1 ? 'coin' : 'pop');
  /* Gancho (§B7 de docs/GANCHO.md): la nota sube con la cadena y el golpe crece con ella. */
  k.chime(chain - 1);
  if (chain > 1) { msg = 'Cadena x' + chain; msgT = 1.3; k.shake(2); k.combo(chain, mx, my - 40); k.hitstop(0.035 + Math.min(0.05, chain * 0.01)); }
  if (chain >= 3) { k.punch(0.04 + Math.min(0.06, chain * 0.012)); k.shake(3 + chain); }
  if (chain >= 4) { k.reward('¡CADENA x' + chain + '!', '#ffd166'); k.flash('rgba(255,220,120,.2)'); }
  else if (gems >= 7) { k.reward('¡RACIMO x' + gems + '!', '#7cf7a0'); k.hitstop(0.04); }
  if (!HAND) {
    const lv = Math.min(12, 1 + Math.floor(cleared / 22));
    if (lv > level) { level = lv; msg = 'Nivel ' + level; msgT = 1.6; k.sfx('win'); k.flash('rgba(255,255,255,.2)'); }
  }
  return cells.length;
}
/* cristales que llegan al suelo: se recogen con premio */
function collectCrystals() {
  const xs = floorCrystals(F); if (!xs.length) return 0;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    k.burst(cx(x), cy(ROWS - 1), '#7cf7e0', 18, 160); k.float('¡Cristal!', cx(x), cy(ROWS - 1) - 18, '#7cf7e0');
    F[ROWS - 1][x] = null; nCry++; score += 120;
  }
  k.sfx('coin'); k.flash('rgba(124,247,224,.18)'); k.hitstop(0.05); k.punch(0.05);
  k.reward(xs.length > 1 ? '¡' + xs.length + ' CRISTALES!' : '¡CRISTAL!', '#7cf7e0');
  return xs.length;
}
/* ---------- objetivo ---------- */
function goalLeft() {
  const g = LV.go, o = [];
  if (g.clear != null) o.push(['Joyas', Math.min(nGems, g.clear), g.clear]);
  if (g.gems != null) o.push([GEM[g.col || 0].n[0].toUpperCase() + GEM[g.col || 0].n.slice(1), Math.min(nCol, g.gems), g.gems]);
  if (g.combo != null) o.push(['Cadenas', Math.min(nChain, g.combo), g.combo]);
  if (g.cry != null) o.push(['Cristales', Math.min(nCry, g.cry), g.cry]);
  if (g.rock != null) o.push(['Piedras', Math.min(nRock, g.rock), g.rock]);
  if (g.ice != null) o.push(['Hielo', Math.min(nIce, g.ice), g.ice]);
  if (g.big != null) o.push(['Racimos', Math.min(nBig, g.big), g.big]);
  if (g.surv != null) o.push(['Columnas', Math.min(drops, g.surv), g.surv]);
  return o;
}
function goalMet() {
  const g = LV.go;
  if (g.clear != null && nGems < g.clear) return false;
  if (g.gems != null && nCol < g.gems) return false;
  if (g.combo != null && nChain < g.combo) return false;
  if (g.cry != null && nCry < g.cry) return false;
  if (g.rock != null && nRock < g.rock) return false;
  if (g.ice != null && nIce < g.ice) return false;
  if (g.big != null && nBig < g.big) return false;
  if (g.surv != null && drops < g.surv) return false;
  return true;
}
/* Progreso del objetivo en una sola cifra 0..1 (barra del marcador, §A1 de GANCHO.md). */
function goalFrac() {
  const o = goalLeft(); if (!o.length) return 0;
  let a = 0, b = 0; for (let i = 0; i < o.length; i++) { a += o[i][1]; b += o[i][2]; }
  return b ? a / b : 0;
}
/* Qué falta cuando se pierde (§A4 «casi-victoria»). */
function missText() {
  const o = goalLeft(), q = [];
  for (let i = 0; i < o.length; i++) if (o[i][1] < o[i][2]) q.push(`${o[i][2] - o[i][1]} de ${o[i][0].toLowerCase()}`);
  return q.length ? 'Te faltaba ' + q.join(' y ') : 'Ya lo tenías';
}
/* ★ superar · ★★ el margen del nivel · ★★★ el margen bordado + maestría (cadenas y sin salvavidas). */
function starsNow() {
  const p = parNow(), up = upPar(), v = up ? nGems : drops;
  let st = 1;
  if (up ? v >= p[0] : v <= p[0]) st = 2;
  if ((up ? v >= p[1] : v <= p[1]) && nChain >= mastNow() && !lifeUsed) st = 3;
  return st;
}
function starHint() {
  const p = parNow(), up = upPar(), v = up ? nGems : drops, st = starsNow();
  if (st >= 3) return '¡Bordado!';
  if (st === 2) return lifeUsed ? '★★★ sin salvavidas' : nChain < mastNow() ? `★★★ con ${mastNow() - nChain} cadena${mastNow() - nChain === 1 ? '' : 's'} más` : up ? `★★★ con ${p[1]} joyas` : `★★★ en ${p[1]} columnas`;
  return up ? `★★ con ${p[0]} joyas` : `★★ en ${p[0]} columnas`;
}
function doneLevel() {
  if (done) return;
  done = true; stars = starsNow(); k.best(ID, score);
  const p = parNow(), up = upPar();
  const line = up ? `${nGems} joyas` : `${drops} columnas`;
  const falta = stars < 3 ? ` · ${starHint()}` : '';
  k.reward('¡OBJETIVO!', '#7cf7a0');
  k.levelDone(score, `${line} · ${score} puntos · cadena más larga x${Math.max(1, deepMax)}${falta}`, { stars });
}
function checkGoal() {
  if (!HAND || done || over) return;
  if (goalMet()) { doneLevel(); return; }
  const lim = limNow();
  if (lim && drops >= lim) { lost = 'Se acabaron las columnas'; over = 0.001; k.sfx('lose'); }
}

function update(dt) {
  t += dt; msgT = Math.max(0, msgT - dt); bannerT = Math.max(0, bannerT - dt); rescueT = Math.max(0, rescueT - dt); multT = Math.max(0, multT - dt);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const g = F && F[y][x]; if (!g) continue; const o0 = g.off || 0; g.off = o0 > 0 ? Math.max(0, o0 - dt * 900) : Math.min(0, o0 + dt * 900); if (g.mark) g.pop += dt; if (g.fx) g.fx = Math.max(0, g.fx - dt * 2.4); }
  if (!k.gate(reset)) return;
  if (done) return;
  if (over) {
    over += dt;
    if (over > 1.2) k.lose(ID, score, lost || 'El pozo se llenó', HAND ? `${missText()} · nivel ${level}/${HAND.length}` : `Nivel ${level} · ${cleared} gemas`);
    return;
  }
  /* Cuenta atrás de los niveles con reloj (presión real, §3 de VARA). */
  if (HAND && LV.time) {
    tLeft -= dt;
    if (tLeft <= 0) { tLeft = 0; lost = 'Se acabó el tiempo'; over = 0.001; k.sfx('lose'); k.shake(8); return; }
    if (tLeft < 10 && Math.floor(tLeft + dt) !== Math.floor(tLeft)) k.sfx('hurt');
  }
  if (phase === 'fall') {
    if (k.hit.has('left')) move(-1);
    if (k.hit.has('right')) move(1);
    if (k.hit.has('a') || k.hit.has('up')) rotate();
    if (k.hit.has('b')) { hard = true; k.sfx('shoot'); }
    /* gesto: arrastrar a los lados mueve, tocar gira, deslizar abajo suelta */
    const p = k.ptr;
    if (p.hit) { piece.ax = p.x; piece.ay = p.y; piece.moved = false; }
    if (p.down && piece.ax != null) {
      const dx = p.x - piece.ax, dy = p.y - piece.ay;
      if (Math.abs(dx) > CS * 0.8) { move(dx > 0 ? 1 : -1); piece.ax = p.x; piece.moved = true; }
      else if (dy > CS * 2.2) { hard = true; piece.moved = true; piece.ax = null; }
    }
    if (p.up) { if (!piece.moved && piece.ax != null) rotate(); piece.ax = null; }
    const soft = k.held.has('down') || (k.ptr.down && piece.ax == null);
    const sp = hard ? 42 : soft ? 14 : 1 / stepSpeed();
    piece.y += sp * dt;
    const lim = landRow(piece.x);
    if (piece.y >= lim) { piece.y = lim; if (hard) score += 2; lock(); }
  } else if (phase === 'check') {
    let any = anyMark(F);
    if (findMatches(F)) any = true;
    if (any) { const h = hitRocks(F); if (h.ice) { nIce += h.ice; k.sfx('pop'); } phase = 'flash'; phT = 0; }
    else if (collectCrystals()) { phase = 'gravity'; phT = 0; gravity(F, CS); }
    else {
      if (!chain) k.chainReset();
      checkGoal();
      if (!done && !over) {
        /* el suelo sube cada `rise` columnas: se avisa una columna antes (§2, nada castiga sin telegrafiar) */
        if (HAND && LV.rise) {
          if (riseIn <= 0) {
            riseIn = riseNow();
            if (riseRow(F, LV.cols, Math.random, CS)) { lost = 'El pozo se desbordó'; over = 0.001; k.sfx('hurt'); k.shake(9); return; }
            msg = '¡Sube el suelo!'; msgT = 1.4; k.sfx('hit'); k.shake(5);
            phase = 'check'; phT = 0; return;
          }
          if (riseIn === 1) { msg = 'Sube el suelo…'; msgT = 1.1; }
        }
        phase = 'fall'; spawn();
      }
    }
  } else if (phase === 'flash') {
    phT += dt; if (phT > 0.28) { resolveMarks(); phase = 'gravity'; phT = 0; gravity(F, CS); }
  } else if (phase === 'gravity') {
    phT += dt; if (phT > 0.2) { phase = 'check'; phT = 0; }
  }
}

/* ---------- pintado ---------- */
function sprOf(g) { return g.rock ? (g.hp > 1 ? spr.rockH : spr.rock) : g.cr ? spr.cry : g.ice ? spr.ice[g.c] : g.c === -1 ? spr.rain : g.c === -2 ? spr.bomb : g.c === -5 ? spr.ray : spr[g.c]; }
function drawCell(x, y, g, s, alphaV) {
  const cv = sprOf(g), S = (CS + 6) * (s || 1);
  if (alphaV != null) c.globalAlpha = alphaV;
  c.drawImage(cv, x - S / 2, y - S / 2, S, S);
  c.globalAlpha = 1;
}
function drawPieceGem(x, y, col, s) {
  const cv = col === -1 ? spr.rain : col === -2 ? spr.bomb : col === -5 ? spr.ray : spr[col], S = (CS + 6) * (s || 1);
  c.drawImage(cv, x - S / 2, y - S / 2, S, S);
}
function hud() {
  const L = k.ex(12), R = k.ex2(12), narrow = k.W < 400;
  if (HAND) {
    label(`Nivel ${level}/${HAND.length}`, L, k.ey(2), narrow ? 16 : 19, '#fff');
    const nm = fitSize(LV.name, narrow ? 12 : 13, k.W * 0.4);
    label(LV.name, L, k.ey(narrow ? 22 : 25), nm, '#cfc8ff');
    label(String(score), R, k.ey(2), narrow ? 16 : 19, '#ffc94d', 'right');
    const lim = limNow();
    const sub = lim ? `Columnas ${Math.max(0, lim - drops)}` : `${drops} columnas`;
    label(sub, R, k.ey(narrow ? 22 : 25), narrow ? 11 : 12, lim && lim - drops <= 5 ? '#ff8a8a' : 'rgba(255,255,255,.7)', 'right');
    if (!sidePanel) {
      /* fila 3: barra de objetivo a la izquierda y las tres estrellas a la derecha.
         El centro de arriba se deja libre: ahí pone el reproductor su botón de pausa. */
      const bw = Math.min(124, k.W * 0.34);
      bar(L, k.ey(42), bw, 10, goalFrac(), '#a8cf3f');
      starRow(R - 2 - 2 * 7 * 2.4, k.ey(47), starsNow(), 7);
      /* fila 4: lo que falta para la estrella siguiente y el reloj / salvavidas */
      label(starHint(), L, k.ey(58), narrow ? 11 : 12, 'rgba(255,255,255,.66)');
      const rr = [];
      if (LV.time) rr.push(`${Math.ceil(tLeft)} s`);
      if (life > 0) rr.push('Salvavidas ' + life);
      if (rr.length) label(rr.join(' · '), R, k.ey(58), narrow ? 12 : 13, LV.time && tLeft < 12 ? '#ff8a8a' : '#ffd166', 'right');
      if (mult() > 1) label('Cadena x' + mult(), L + bw + 8, k.ey(40), narrow ? 12 : 13, mult() >= 4 ? '#ff5fa2' : '#ffd166');
      /* objetivo en la franja baja */
      const gt = goalLeft().map((o) => `${o[0]} ${o[1]}/${o[2]}`).join('  ·  ');
      const gs = fitSize(gt, narrow ? 13 : 15, k.W - 24);
      label(gt, k.W / 2, Math.min(k.ey2(52), Y0 + ROWS * CS + 16), gs, '#a8cf3f', 'center');
    }
  } else {
    label(String(score), L, k.ey(10), 26, '#fff');
    label('Récord ' + Math.max(k.best(ID, 0), score), L, k.ey(40), 11, 'rgba(255,255,255,.65)');
    label('Nivel ' + level, R, k.ey(10), 16, '#ffc94d', 'right');
    label(cleared + ' gemas', R, k.ey(32), 12, 'rgba(255,255,255,.65)', 'right');
  }
}
function nextBox() {
  if (!next) return;
  if (sidePanel) {
    const px = PX + PW / 2;
    label('Siguiente', px, Y0 + 2, 13, 'rgba(255,255,255,.75)', 'center');
    for (let i = 0; i < 3; i++) drawPieceGem(px, PGY + i * (CS * 0.8), next[i], 0.78);
    const rows = goalLeft();
    label('Objetivo', px, POY, 13, 'rgba(255,255,255,.75)', 'center');
    for (let i = 0; i < rows.length; i++) label(`${rows[i][0]} ${rows[i][1]}/${rows[i][2]}`, px, POY + 22 + i * 19, 13, '#a8cf3f', 'center');
    const by = POY + 22 + rows.length * 19 + 6;
    bar(PX + 14, by, PW - 28, 11, goalFrac(), '#a8cf3f');
    starRow(px - 9 * 2.4, by + 26, starsNow(), 9);
    const hs = fitSize(starHint(), 11, PW - 16);
    label(starHint(), px, by + 40, hs, 'rgba(255,255,255,.7)', 'center');
    if (LV.time) label(`${Math.ceil(tLeft)} s`, px, by + 56, 15, tLeft < 12 ? '#ff8a8a' : '#ffd166', 'center');
    else if (life > 0) label('Salvavidas ' + life, px, by + 56, 12, '#ffd166', 'center');
    if (mult() > 1) label('Cadena x' + mult(), px, by + 74, 14, mult() >= 4 ? '#ff5fa2' : '#ffd166', 'center');
  } else if (HAND) {
    /* abajo a la DERECHA: abajo a la izquierda están los botones de pausa y sonido de kit */
    const by = k.ey2(26), gw = Math.min(28, CS * 0.68), xr = k.ex2(10);
    label('Siguiente', xr - 3 * gw - 8, by - 6, 11, 'rgba(255,255,255,.6)', 'right');
    for (let i = 0; i < 3; i++) drawPieceGem(xr - 3 * gw + i * gw + gw / 2, by, next[i], Math.min(0.6, gw / (CS + 6) * 0.95));
  } else {
    label('Siguiente', k.W / 2, 50, 11, 'rgba(255,255,255,.6)', 'center');
    for (let i = 0; i < 3; i++) drawPieceGem(k.W / 2 - 34 + i * 34, 77, next[i], 0.62);
  }
}
function banner() {
  if (!HAND || bannerT <= 0 || k.st !== 'play') return;
  const a = Math.min(1, bannerT * 1.6);
  c.globalAlpha = a;
  const ts = fitSize(LV.tip, k.W < 400 ? 12 : 14, k.W - 44);
  /* con panel lateral el consejo baja: arriba están «Siguiente» y el objetivo */
  const tw = c.measureText(LV.tip).width + 26, by = Y0 + ROWS * CS * (sidePanel ? 0.62 : 0.36);
  ART.rr(c, k.W / 2 - tw / 2, by, tw, ts + 16, 10); c.fillStyle = 'rgba(26,21,48,.86)'; c.fill();
  c.lineWidth = 2; c.strokeStyle = 'rgba(110,98,245,.8)'; c.stroke();
  label(LV.tip, k.W / 2, by + 8, ts, '#ffd166', 'center');
  c.globalAlpha = 1;
}
function draw() {
  if (!bgCv) bgCv = renderBg();
  c.drawImage(bgCv, 0, 0, k.W, k.H);
  c.save(); ART.rr(c, X0, Y0, COLS * CS, ROWS * CS, 8); c.clip();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const g = F[y][x]; if (!g) continue;
    const fl = g.mark ? 1 + Math.sin(g.pop * 40) * 0.12 : g.fx ? 1 + g.fx * 0.1 : 1;
    drawCell(cx(x), cy(y) - g.off, g, fl, g.mark && Math.floor(g.pop * 20) % 2 ? 0.5 : 1);
  }
  if (phase === 'fall' && !over && !done && k.st === 'play') {
    let ly = Math.floor(piece.y); while (!free(piece.x, ly + 1)) ly--;
    for (let i = 0; i < 3; i++) if (ly - i >= 0) { c.globalAlpha = 0.18; drawPieceGem(cx(piece.x), cy(ly - i), piece.g[i], 0.9); c.globalAlpha = 1; }
    for (let i = 0; i < 3; i++) { const y = Y0 + (piece.y - i) * CS + CS / 2; if (y > Y0 - CS) drawPieceGem(cx(piece.x), y, piece.g[i], 1); }
  }
  c.restore();
  hud(); nextBox(); banner();
  if (msgT > 0) {
    /* aviso dentro del pozo: el centro de la franja de arriba lo usa el botón de pausa del reproductor */
    c.globalAlpha = Math.min(1, msgT * 2);
    const wc = X0 + COLS * CS / 2;  /* centrado en el pozo: con panel lateral no lo pisa */
    const ms = fitSize(msg, k.W < 400 ? 17 : 20, (sidePanel ? COLS * CS : k.W) - 40), my = Y0 + ROWS * CS * 0.16;
    const mw = c.measureText(msg).width;
    ART.rr(c, wc - mw / 2 - 12, my - 5, mw + 24, ms + 12, 9); c.fillStyle = 'rgba(26,21,48,.8)'; c.fill();
    label(msg, wc, my, ms, '#a8cf3f', 'center');
    c.globalAlpha = 1;
  }
}

layout();
k.onSize = () => { layout(); };
k.onDif = () => { if (k.st !== 'play') reset(); };
/* Niveles a mano (plan Friv): menú, rejilla de niveles y progreso por dificultad los pone kit.js.
   Saltar de nivel desde la pausa deja el arranque pendiente: pasamos por 'over' para que el gate
   lo consuma y no reinicie encima de la tarjeta de nivel superado. */
if (HAND) k.levels(HAND.length, { start: () => { startLevel(); if (k.st === 'play') k.st = 'over'; } });
reset();
window.__co = {
  get F() { return F; }, get piece() { return piece; }, get score() { return score; }, get level() { return level; },
  get phase() { return phase; }, get LV() { return LV; }, get drops() { return drops; }, get nGems() { return nGems; },
  get nCol() { return nCol; }, get nChain() { return nChain; }, get nRock() { return nRock; }, get nCry() { return nCry; },
  get nIce() { return nIce; }, get nDeep() { return nDeep; }, get nBig() { return nBig; }, get done() { return done; }, get over() { return over; },
  get stars() { return stars; }, get par() { return parNow(); }, get mast() { return mastNow(); }, get lim() { return limNow(); },
  get tLeft() { return tLeft; }, get life() { return life; }, get next() { return next; }, get goal() { return goalLeft(); },
  move: move, rotate: rotate, drop: () => { hard = true; },
};
k.show(CFG.title || 'Columnas de Joyas', HAND
  ? '20 pozos dibujados a mano. Cada uno pide algo distinto: limpiar un color, bajar los cristales al suelo, romper piedras, encadenar combos o aguantar el chaparrón.'
  : 'Cae una columna de tres gemas. Muévela a los lados, tócala para rotar los colores y deslízala hacia abajo para soltarla. Tres iguales en línea (también en diagonal) desaparecen y lo de arriba cae: así se encadenan combos.<br>Toca para jugar');
k.run(update, draw);
