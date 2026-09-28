/* Motor `ciudad`: dos juegos de rejilla y panel, un jugador.
 *   CFG.mode='cintas' → Fábrica de Cintas: colocas cintas, desvíos y máquinas de pintura sobre la
 *     rejilla, pulsas «Marcha» y ves si tu diseño lleva cada pieza a su caja. 20 niveles escritos a
 *     mano (tabla LV, más abajo) con progreso guardado por dificultad y final de verdad.
 *   CFG.mode='ciudad' → Ciudad de Bloques: construyes un barrio por casillas con presupuesto; cada
 *     edificio mueve el ánimo de los vecinos y los ingresos. 12 medallas y final cerrado (no es un
 *     incremental infinito): la partida acaba al conseguirlas todas o al agotar los meses.
 *
 * La tabla de niveles y el simulador son PUROS (no tocan Kit, ART ni el DOM) y viven entre las
 * marcas <LV> y </LV>: los scripts de Node los extraen para comprobar que los 20 niveles se
 * resuelven y con cuántas piezas como mínimo. No hay dependencias nuevas: todo va en este archivo.
 * Arte: 100 % por código, §8 «ley de la pieza única» (un trazado por objeto, relleno y contorneado
 * una sola vez), cel de 3 tonos con borde duro, sombra de contacto y sprites cacheados. */

/* <LV> ------------------------------------------------------------------------------------------
 * Reglas del simulador de Fábrica de Cintas (deterministas, sin azar):
 *  - Direcciones d: 0 derecha, 1 abajo, 2 izquierda, 3 arriba (en los mapas: > v < ^).
 *  - Cada «tic» toda pieza avanza una casilla en su dirección actual. Al entrar en una casilla:
 *      cinta   → toma su dirección.        pintora → se pinta de su color y toma su dirección.
 *      desvío  → sale recto y a la derecha alternativamente (recto en el primer paso).
 *      caja    → si el color coincide y aún le faltan piezas, se entrega; si no, se pierde.
 *      suelo vacío, muro, emisor o fuera del tablero → se pierde.
 *  - Se gana cuando todas las cajas están llenas y no queda ninguna pieza rodando.
 *  - Las cajas con n=0 son «cajas ajenas»: nada debe entrar en ellas.
 * Mapas: '.' suelo libre · '#' muro · '>v<^' cinta fija del nivel · '1'-'9' entidad (lista e).
 * Entidades: {t:'s',d,c,n,ev} emisor · {t:'b',c,n} caja · {t:'p',d,c} pintora fija.
 * inv: piezas disponibles [tipo, cantidad, color] — 'belt' cinta, 'split' desvío, 'paint' pintora.
 * min: mínimo de piezas comprobado por búsqueda exhaustiva (verificación en Node). */
var DIRX = [1, 0, -1, 0], DIRY = [0, 1, 0, -1], DCH = '>v<^';
var LV = [
  { t: 'Una cinta recta', w: 5, h: 3, g: ['.....', '1...2', '.....'],
    e: [{ t: 's', d: 0, c: 'r', n: 3, ev: 5 }, { t: 'b', c: 'r', n: 3 }], inv: [['belt', 5]], min: 3 },
  { t: 'Dobla la esquina', w: 4, h: 4, g: ['1...', '....', '....', '...2'],
    e: [{ t: 's', d: 1, c: 'r', n: 3, ev: 6 }, { t: 'b', c: 'r', n: 3 }], inv: [['belt', 7]], min: 5 },
  { t: 'Dos emisores', w: 5, h: 5, g: ['1...3', '.....', '..2..', '.....', '.....'],
    e: [{ t: 's', d: 1, c: 'r', n: 2, ev: 7 }, { t: 'b', c: 'r', n: 4 }, { t: 's', d: 1, c: 'r', n: 2, ev: 7 }],
    inv: [['belt', 8]], min: 5 },
  { t: 'Rodea el muro', w: 6, h: 5, g: ['1>....', '..#...', '..#...', '..#...', '.....2'],
    e: [{ t: 's', d: 0, c: 'a', n: 3, ev: 6 }, { t: 'b', c: 'a', n: 3 }], inv: [['belt', 9]], min: 7 },
  { t: 'Caja ajena', w: 6, h: 5, g: ['1.....', '......', '..4...', '......', '.....2'],
    e: [{ t: 's', d: 1, c: 'b', n: 3, ev: 6 }, { t: 'b', c: 'b', n: 3 }, null, { t: 'b', c: 'v', n: 0 }],
    inv: [['belt', 10]], min: 8 },
  { t: 'La pintora', w: 6, h: 5, g: ['1.....', '......', '..5...', '......', '.....2'],
    e: [{ t: 's', d: 1, c: 'r', n: 3, ev: 7 }, { t: 'b', c: 'b', n: 3 }, null, null, { t: 'p', d: 1, c: 'b' }],
    inv: [['belt', 9]], min: 7 },
  { t: 'El desvío', w: 5, h: 5, g: ['..1..', '.....', '2....', '.....', '..3..'],
    e: [{ t: 's', d: 1, c: 'a', n: 4, ev: 6 }, { t: 'b', c: 'a', n: 2 }, { t: 'b', c: 'a', n: 2 }],
    inv: [['belt', 6], ['split', 2]], min: 4 },
  { t: 'Pinta y reparte', w: 7, h: 6, g: ['...1...', '.......', '..5....', '.......', '2.....3', '.......'],
    e: [{ t: 's', d: 1, c: 'r', n: 3, ev: 8 }, { t: 'b', c: 'b', n: 3 }, { t: 'b', c: 'r', n: 0 }, null, { t: 'p', d: 2, c: 'b' }],
    inv: [['belt', 12]], min: 5 },
  { t: 'Triple entrega', w: 7, h: 7, g: ['...1...', '.......', '.......', '.......', '.......', '2..3..4', '.......'],
    e: [{ t: 's', d: 1, c: 'a', n: 4, ev: 7 }, { t: 'b', c: 'a', n: 2 }, { t: 'b', c: 'a', n: 2 }, { t: 'b', c: 'a', n: 0 }],
    inv: [['belt', 14], ['split', 2]], min: 7 },
  { t: 'Reparto doble', w: 7, h: 6, g: ['...1...', '.......', '.......', '2.....3', '.......', '.......'],
    e: [{ t: 's', d: 1, c: 'r', n: 4, ev: 7 }, { t: 'b', c: 'r', n: 2 }, { t: 'b', c: 'r', n: 2 }],
    inv: [['belt', 12], ['split', 2]], min: 8 },
  { t: 'Tu propia pintora', w: 6, h: 6, g: ['1.....', '......', '......', '......', '......', '.....2'],
    e: [{ t: 's', d: 1, c: 'a', n: 3, ev: 8 }, { t: 'b', c: 'v', n: 3 }],
    inv: [['belt', 12], ['paint', 1, 'v']], min: 9 },
  { t: 'Pasillo estrecho', w: 7, h: 6, g: ['1......', '.#####.', '.#...#.', '.#.2.#.', '.#...#.', '.......'],
    e: [{ t: 's', d: 1, c: 'v', n: 3, ev: 7 }, { t: 'b', c: 'v', n: 3 }], inv: [['belt', 14]], min: 9 },
  { t: 'Dos cajas, dos colores', w: 7, h: 6, g: ['...1...', '.......', '..5....', '.......', '2.....3', '.......'],
    e: [{ t: 's', d: 1, c: 'r', n: 4, ev: 7 }, { t: 'b', c: 'b', n: 2 }, { t: 'b', c: 'r', n: 2 }, null, { t: 'p', d: 2, c: 'b' }],
    inv: [['belt', 12], ['split', 2]], min: 9 },
  { t: 'Dos colores', w: 7, h: 5, g: ['1.....2', '.......', '##...##', '.......', '3.....4'],
    e: [{ t: 's', d: 0, c: 'r', n: 3, ev: 6 }, { t: 'b', c: 'r', n: 3 }, { t: 's', d: 0, c: 'b', n: 3, ev: 6 }, { t: 'b', c: 'b', n: 3 }],
    inv: [['belt', 12]], min: 10 },
  { t: 'Dos líneas', w: 7, h: 7, g: ['1.....3', '.......', '..###..', '..###..', '..###..', '.......', '2.....4'],
    e: [{ t: 's', d: 1, c: 'r', n: 3, ev: 7 }, { t: 'b', c: 'r', n: 3 }, { t: 's', d: 1, c: 'b', n: 3, ev: 7 }, { t: 'b', c: 'b', n: 3 }],
    inv: [['belt', 16]], min: 10 },
  { t: 'Pintura y desvío', w: 7, h: 7, g: ['...1...', '.......', '.......', '..5....', '.......', '2.....3', '.......'],
    e: [{ t: 's', d: 1, c: 'a', n: 4, ev: 8 }, { t: 'b', c: 'v', n: 2 }, { t: 'b', c: 'a', n: 2 }, null, { t: 'p', d: 2, c: 'v' }],
    inv: [['belt', 14], ['split', 2]], min: 10 },
  { t: 'Cruce de muros', w: 7, h: 7, g: ['1......', '.#####.', '.......', '.#####.', '.......', '.#####.', '......2'],
    e: [{ t: 's', d: 1, c: 'r', n: 3, ev: 8 }, { t: 'b', c: 'r', n: 3 }], inv: [['belt', 16]], min: 11 },
  { t: 'Fábrica en zigzag', w: 7, h: 7, g: ['1......', '....##.', '.##....', '....##.', '.##....', '....##.', '......2'],
    e: [{ t: 's', d: 1, c: 'v', n: 3, ev: 8 }, { t: 'b', c: 'v', n: 3 }], inv: [['belt', 16]], min: 11 },
  { t: 'Sala de máquinas', w: 7, h: 8, g: ['1......', '.#####.', '.......', '.####..', '.......', '..####.', '.......', '......2'],
    e: [{ t: 's', d: 1, c: 'b', n: 3, ev: 9 }, { t: 'b', c: 'b', n: 3 }], inv: [['belt', 18]], min: 12 },
  { t: 'Turno de noche', w: 5, h: 6, g: ['..1..', '.....', '.....', '.....', '.....', '2...3'],
    e: [{ t: 's', d: 1, c: 'r', n: 4, ev: 8 }, { t: 'b', c: 'v', n: 2 }, { t: 'b', c: 'b', n: 2 }],
    inv: [['belt', 10], ['split', 1], ['paint', 1, 'v'], ['paint', 1, 'b']], min: 8 },
];
/* Construye el tablero de un nivel con las piezas colocadas por el jugador (place). */
function mkCells(lv, place) {
  var cells = [], boxes = [], srcs = [], y, x, ch, e;
  for (y = 0; y < lv.h; y++) for (x = 0; x < lv.w; x++) {
    ch = lv.g[y].charAt(x);
    if (ch === '#') cells.push({ t: '#' });
    else if (DCH.indexOf(ch) >= 0) cells.push({ t: 'belt', d: DCH.indexOf(ch), fix: 1 });
    else if (ch >= '1' && ch <= '9') {
      e = lv.e[+ch - 1];
      if (e.t === 's') { cells.push({ t: 's', d: e.d, c: e.c, n: e.n, ev: e.ev, made: 0, x: x, y: y }); srcs.push(cells[cells.length - 1]); }
      else if (e.t === 'b') { cells.push({ t: 'b', c: e.c, n: e.n, got: 0, x: x, y: y }); boxes.push(cells[cells.length - 1]); }
      else cells.push({ t: 'p', d: e.d, c: e.c, fix: 1 });
    } else cells.push({ t: '.' });
  }
  for (var i = 0; i < place.length; i++) {
    var p = place[i], idx = p.y * lv.w + p.x;
    if (!cells[idx] || cells[idx].t !== '.') continue;
    cells[idx] = p.t === 'split' ? { t: 'x', d: p.d, alt: 0 } : p.t === 'paint' ? { t: 'p', d: p.d, c: p.c } : { t: 'belt', d: p.d };
  }
  return { cells: cells, boxes: boxes, srcs: srcs, w: lv.w, h: lv.h };
}
/* Simulador por tics. step() → 'run' | 'win' | 'lost' (con .why y .at). */
function mkSim(lv, place) {
  var B = mkCells(lv, place), S = { b: B, t: 0, items: [], why: '', at: null };
  S.step = function () {
    var i, it, nx, ny, cell, idx, s;
    S.t++;
    for (i = 0; i < B.srcs.length; i++) {
      s = B.srcs[i];
      if (s.made < s.n && S.t % s.ev === 1) { s.made++; S.items.push({ x: s.x, y: s.y, px: s.x, py: s.y, d: s.d, c: s.c }); }
    }
    for (i = S.items.length - 1; i >= 0; i--) {
      it = S.items[i];
      it.px = it.x; it.py = it.y;
      nx = it.x + DIRX[it.d]; ny = it.y + DIRY[it.d];
      if (nx < 0 || ny < 0 || nx >= B.w || ny >= B.h) { S.why = 'fuera'; S.at = [nx, ny]; return 'lost'; }
      idx = ny * B.w + nx; cell = B.cells[idx];
      it.x = nx; it.y = ny;
      if (cell.t === 'b') {
        if (cell.c === it.c && cell.got < cell.n) { cell.got++; cell.fx = 1; S.items.splice(i, 1); }
        else { S.why = cell.n === 0 ? 'ajena' : 'color'; S.at = [nx, ny]; return 'lost'; }
      } else if (cell.t === 'belt') it.d = cell.d;
      else if (cell.t === 'p') { it.c = cell.c; it.d = cell.d; }
      else if (cell.t === 'x') { it.d = cell.alt ? (cell.d + 1) % 4 : cell.d; cell.alt = cell.alt ? 0 : 1; }
      else { S.why = cell.t === '.' ? 'suelo' : 'choque'; S.at = [nx, ny]; S.ad = it.d; return 'lost'; }
    }
    var full = 1;
    for (i = 0; i < B.boxes.length; i++) if (B.boxes[i].got < B.boxes[i].n) full = 0;
    for (i = 0; i < B.srcs.length; i++) if (B.srcs[i].made < B.srcs[i].n) full = 0;
    if (full && S.items.length === 0) return 'win';
    return 'run';
  };
  return S;
}
/* Partida completa sin dibujar: {r:'win'|'lost'|'time', t, why}. */
function runSim(lv, place, maxT) {
  var S = mkSim(lv, place), r, i, M = maxT || 300;
  for (i = 0; i < M; i++) { r = S.step(); if (r !== 'run') return { r: r, t: i, why: S.why, at: S.at, ad: S.ad }; }
  return { r: 'time', t: M, why: 'tiempo' };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { LV: LV, mkSim: mkSim, runSim: runSim, mkCells: mkCells, DIRX: DIRX, DIRY: DIRY };
/* </LV> ---------------------------------------------------------------------------------------- */

/* ============================================================================================
 * Runtime del juego (a partir de aquí ya se usan Kit y ART)
 * ========================================================================================== */
const M = CFG.mode, OUT = ART.OUT, R2 = 6.2832;
const W = 480, H = 660;
const TH = M === 'cintas'
  ? { bg: '#1d1834', floor: '#2b2450', line: '#3b3269', ac: '#ffc94d', panel: '#171232', pane2: '#241d45' }
  : { bg: '#1d2a26', floor: '#57883f', line: '#4a7536', ac: '#a8cf3f', panel: '#15211d', pane2: '#22332c' };
const COL = { r: '#ff6b6b', a: '#ffc94d', b: '#5b8cff', v: '#a8cf3f' };
const CNOM = { r: 'rojo', a: 'amarillo', b: 'azul', v: 'verde' };
const k = Kit({ w: W, h: H, title: CFG.title, bg: TH.bg }), c = k.ctx;

/* ---------- utilería de arte: §8 «ley de la pieza única» + cartoon de estudio ----------
 * uni(): traza y contornea TODAS las subformas de un objeto y sólo después las rellena en orden de
 * profundidad, así dentro de la silueta no sobrevive ningún contorno cerrado. Las separaciones
 * internas se leen por sombra propia (seam) o por cambio de color, nunca por stroke. */
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
function cvs(w, h) {
  const q = document.createElement('canvas');
  q.width = Math.max(1, Math.ceil(w * CDPR)); q.height = Math.max(1, Math.ceil(h * CDPR));
  const g = q.getContext('2d'); g.scale(CDPR, CDPR); g.lineJoin = 'round'; g.lineCap = 'round';
  return [q, g];
}
const SPR = {};
function spr(key, w, h, fn) {
  let q = SPR[key]; if (q) return q;
  const r = cvs(w, h); fn(r[1]); q = r[0]; q.iw = w; q.ih = h; SPR[key] = q; return q;
}
function blit(q, x, y) { c.drawImage(q, x, y, q.iw, q.ih); }
function uni(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = (ow || 1.5) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
}
function inpath(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* cel de 3 planos con borde duro (luz arriba-izquierda), recortado contra la propia silueta */
function cel(g, path, base, dx, dy) {
  dx = dx == null ? 2 : dx; dy = dy == null ? 2 : dy;
  inpath(g, path, (h) => {
    const P = () => { h.beginPath(); path(h); h.fill(); };
    h.fillStyle = ART.dark(base, 0.26); P();
    h.translate(-dx, -dy); h.fillStyle = base; P();
    h.translate(-dx * 1.2, -dy * 1.2); h.fillStyle = ART.lite(base, 0.22); P();
  });
}
/* separación interna por sombra propia, jamás por contorno */
function seam(g, path, base, fn, f) { inpath(g, path, (h) => { h.fillStyle = ART.dark(base, f == null ? 0.18 : f); fn(h); }); }
function tint(g, path, col, fn) { inpath(g, path, (h) => { h.fillStyle = col; fn(h); }); }
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.5 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, R2); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, R2); g.fill(); }
const rr = (g, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const rndf = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const FONT = (s) => '700 ' + s + 'px ui-rounded,"Trebuchet MS",system-ui,sans-serif';
function tw(s, size) { c.font = FONT(size); return c.measureText(s).width; }
/* rótulos que encogen y, si aún no caben, se abrevian: nada desborda su caja */
function fitSize(s, max, size, min) { let f = size; while (f > (min || 10) && tw(s, f) > max) f--; return f; }
function clipTxt(s, max, size) {
  if (tw(s, size) <= max) return s;
  let t = s; while (t.length > 1 && tw(t + '…', size) > max) t = t.slice(0, -1);
  return t + '…';
}
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms);

/* ---------- botones (placa de una pieza, §8) ---------- */
let BTN = [];
function button(id, x, y, w, h, label, o) { o = o || {}; BTN.push({ id: id, x: x, y: y, w: w, h: h, label: label, o: o }); }
function drawBtn(b) {
  const o = b.o, on = !!o.on, col = o.col || (on ? TH.ac : '#4b4370'), dis = !!o.dis;
  c.save(); if (dis) c.globalAlpha = 0.45;
  const P = (g) => rr(g, b.x, b.y, b.w, b.h, 11);
  contact(c, b.x + b.w / 2, b.y + b.h + 2, b.w * 0.42, 3.5, 0.28);
  uni(c, [[P, col]], 1.5); cel(c, P, col, 2, 2);
  if (o.icon) o.icon(c, b.x, b.y, b.w, b.h);
  if (b.label) {
    const pad = o.icon ? 6 : 10, fs = fitSize(b.label, b.w - pad * 2, o.fs || 15, 9);
    const ty = o.icon ? b.y + b.h - 15 : b.y + (b.h - fs * 1.1) / 2;
    k.text(clipTxt(b.label, b.w - pad * 2, fs), b.x + b.w / 2, ty, fs, on ? '#241a05' : '#efeaff', 'center');
  }
  c.restore();
}
function hitBtn(x, y) { for (let i = 0; i < BTN.length; i++) { const b = BTN[i]; if (!b.o.dis && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; } return null; }

/* ============================================================================================
 * 1) FÁBRICA DE CINTAS
 * ========================================================================================== */
/* La franja de HUD deja libre la banda central (W/2 ± 44) por encima de y=64: ahí caen los botones
 * de pausa y sonido del reproductor cuando el lienzo ocupa todo el ancho (800×450, 768×1024). */
const HUDH = 84, PANH = M === 'cintas' ? 128 : 136, HFREE = 64;
const TICK = 0.34;                                   /* segundos por paso de la simulación */
let lv = null, place = [], sim = null, run = 0, tacc = 0, sel = 0, curD = 0;
let msg = '', msgT = 0, cur = [0, 0], kb = false, S = 48, GX = 0, GY = 0, doneT = 0, hit = null, inv = [];

function invLeft(i) {
  const it = inv[i], c0 = it[2] || '';
  let n = 0; for (let j = 0; j < place.length; j++) if (place[j].t === it[0] && (place[j].c || '') === c0) n++;
  return it[1] - n;
}
function cellAt(x, y) { for (let i = 0; i < place.length; i++) if (place[i].x === x && place[i].y === y) return place[i]; return null; }
function baseAt(x, y) { return lv.g[y].charAt(x); }
function layout() {
  const gh = H - HUDH - PANH;
  S = Math.min(Math.floor((W - 28) / lv.w), Math.floor((gh - 22) / lv.h), 84);
  GX = Math.round((W - S * lv.w) / 2); GY = Math.round(HUDH + (gh - S * lv.h) / 2);
}
function buildLv() {
  lv = LV[Math.max(0, Math.min(LV.length - 1, (k.lv || 1) - 1))];
  /* La tabla es la misma en las tres dificultades (todas las soluciones están verificadas con ella).
   * En Fácil se regalan dos cintas de más para poder dar algún rodeo; en Difícil el inventario es el
   * de la tabla y el mínimo puntúa el doble. Nunca se quitan piezas: la solución sigue existiendo. */
  inv = lv.inv.map((it) => it.slice());
  if (k.dif === 0) { const i = inv.findIndex((it) => it[0] === 'belt'); if (i >= 0) inv[i][1] += 2; }
  place = []; sim = null; run = 0; tacc = 0; msg = ''; msgT = 0; doneT = 0; sel = 0; curD = 0;
  cur = [0, 0]; hit = null;
  /* el cursor de teclado arranca en la primera casilla libre */
  for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) if (baseAt(x, y) === '.' && cur[0] === 0 && cur[1] === 0) { cur = [x, y]; y = lv.h; break; }
  layout();
}
function startRun() {
  if (run) { run = 0; sim = null; return; }
  sim = mkSim(lv, place); run = 1; tacc = 0; msg = ''; msgT = 0; k.sfx('start');
}
function pieceScore() {
  const tot = inv.reduce((s, it) => s + it[1], 0), used = place.length;
  return 100 + Math.max(0, tot - used) * 10 + (used <= lv.min ? (k.dif === 2 ? 300 : 150) : 0);
}
function cintasStep() {
  const r = sim.step();
  if (r === 'win') {
    run = 0; doneT = 0.01; k.sfx('win');
    const sc = pieceScore();
    later(() => k.levelDone(sc, `${place.length} pieza${place.length === 1 ? '' : 's'} · mínimo ${lv.min}`), 900);
  } else if (r === 'lost') {
    run = 0; k.sfx('hurt'); k.shake(6);
    const why = sim.why;
    msg = why === 'ajena' ? 'Esa caja es de otro color' : why === 'color' ? 'La caja no acepta ese color'
      : why === 'fuera' ? 'Una pieza se ha salido de la fábrica' : why === 'suelo' ? 'Falta cinta: la pieza se cae al suelo' : 'La pieza choca contra el muro';
    msgT = 3.2;
    if (sim.at) k.burst(GX + (sim.at[0] + 0.5) * S, GY + (sim.at[1] + 0.5) * S, '#ff6b6b', 14, 150);
  }
}
function cintasTap(x, y) {
  const b = hitBtn(x, y);
  if (b) {
    k.sfx('click');
    if (b.id === 'go') startRun();
    else if (b.id === 'rot') curD = (curD + 1) % 4;
    else if (b.id === 'clr') { place = []; sim = null; run = 0; msg = ''; }
    else if (b.id.indexOf('inv') === 0) { sel = +b.id.slice(3); kb = false; }
    return;
  }
  if (run) return;
  const gx = Math.floor((x - GX) / S), gy = Math.floor((y - GY) / S);
  if (gx < 0 || gy < 0 || gx >= lv.w || gy >= lv.h) return;
  cur = [gx, gy]; tapCell(gx, gy);
}
function tapCell(gx, gy) {
  if (baseAt(gx, gy) !== '.') { msg = 'Ahí no se puede construir'; msgT = 1.6; k.sfx('hit'); return; }
  const p = cellAt(gx, gy);
  if (p) {                                            /* ya hay pieza: girar y, tras la vuelta, quitar */
    if (p.d === 3 && p.turned) { place.splice(place.indexOf(p), 1); k.sfx('pop'); return; }
    p.d = (p.d + 1) % 4; if (p.d === 3) p.turned = 1; k.sfx('click'); curD = p.d; return;
  }
  const it = inv[sel];
  if (invLeft(sel) <= 0) { msg = 'No te quedan ' + (it[0] === 'belt' ? 'cintas' : it[0] === 'split' ? 'desvíos' : 'pintoras'); msgT = 2; k.sfx('hit'); return; }
  const np = { x: gx, y: gy, t: it[0], d: curD };
  if (it[2]) np.c = it[2];
  place.push(np); k.sfx('pop');
}
function cintasUpd(dt) {
  if (msgT > 0) msgT -= dt;
  if (doneT > 0) doneT += dt;
  if (run && sim) { tacc += dt; while (run && tacc >= TICK) { tacc -= TICK; cintasStep(); } }
  if (k.ptr.hit) cintasTap(k.ptr.x, k.ptr.y);
  if (k.hit.has('left')) { cur[0] = Math.max(0, cur[0] - 1); kb = true; }
  if (k.hit.has('right')) { cur[0] = Math.min(lv.w - 1, cur[0] + 1); kb = true; }
  if (k.hit.has('up')) { cur[1] = Math.max(0, cur[1] - 1); kb = true; }
  if (k.hit.has('down')) { cur[1] = Math.min(lv.h - 1, cur[1] + 1); kb = true; }
  if (k.hit.has('a')) { if (run) startRun(); else tapCell(cur[0], cur[1]); }
  if (k.hit.has('b')) { sel = (sel + 1) % inv.length; k.sfx('click'); }
}

/* ---------- arte de la fábrica (todo en sprites cacheados) ---------- */
function beltSpr(d, kind, col) {
  const key = 'b' + d + kind + (col || '') + (S | 0);
  return spr(key, S, S, (g) => {
    const m = S * 0.5, base = kind === 'fix' ? '#6b6486' : '#8a83b8';
    g.translate(m, m); g.rotate(d * Math.PI / 2); g.translate(-m, -m);
    const P = (h) => { rr(h, S * 0.07, S * 0.19, S * 0.86, S * 0.62, S * 0.16); };
    contact(g, m, S * 0.86, S * 0.34, S * 0.06, 0.26);
    uni(g, [[P, base]], 1.4); cel(g, P, base, 1.8, 1.8);
    /* rodillos y galones: detalle interior recortado, sin ningún contorno cerrado */
    seam(g, P, base, (h) => { h.fillRect(S * 0.11, S * 0.2, S * 0.09, S * 0.6); h.fillRect(S * 0.8, S * 0.2, S * 0.09, S * 0.6); }, 0.22);
    tint(g, P, col || '#efe9ff', (h) => {
      for (let i = 0; i < 2; i++) {
        const x0 = S * (0.3 + i * 0.26);
        h.beginPath(); h.moveTo(x0, S * 0.3); h.lineTo(x0 + S * 0.13, S * 0.5); h.lineTo(x0, S * 0.7);
        h.lineTo(x0 - S * 0.05, S * 0.7); h.lineTo(x0 + S * 0.08, S * 0.5); h.lineTo(x0 - S * 0.05, S * 0.3); h.closePath(); h.fill();
      }
    });
    spec(g, S * 0.3, S * 0.27, S * 0.16, S * 0.035, 0, 0.3);
  });
}
function splitSpr(d) {
  return spr('x' + d + (S | 0), S, S, (g) => {
    const m = S * 0.5, base = '#ffb454';
    g.translate(m, m); g.rotate(d * Math.PI / 2); g.translate(-m, -m);
    /* cuerpo en L: dos subtrayectorias de la MISMA pieza (se contornean y luego se rellenan) */
    const P = (h) => { rr(h, S * 0.07, S * 0.19, S * 0.86, S * 0.62, S * 0.16); rr(h, S * 0.2, S * 0.42, S * 0.42, S * 0.5, S * 0.14); };
    contact(g, m, S * 0.9, S * 0.34, S * 0.06, 0.26);
    uni(g, [[P, base]], 1.4); cel(g, P, base, 1.8, 1.8);
    seam(g, P, base, (h) => { h.fillRect(S * 0.11, S * 0.2, S * 0.08, S * 0.6); }, 0.2);
    tint(g, P, '#3b2a10', (h) => {
      h.beginPath(); h.moveTo(S * 0.58, S * 0.34); h.lineTo(S * 0.76, S * 0.5); h.lineTo(S * 0.58, S * 0.66); h.closePath(); h.fill();
      h.beginPath(); h.moveTo(S * 0.28, S * 0.62); h.lineTo(S * 0.44, S * 0.8); h.lineTo(S * 0.28, S * 0.86); h.closePath(); h.fill();
    });
    spec(g, S * 0.32, S * 0.27, S * 0.15, S * 0.035, 0, 0.35);
  });
}
function paintSpr(d, col) {
  return spr('p' + d + col + (S | 0), S, S, (g) => {
    const m = S * 0.5, base = '#9aa2b8', paint = COL[col];
    g.translate(m, m); g.rotate(d * Math.PI / 2); g.translate(-m, -m);
    const P = (h) => { rr(h, S * 0.12, S * 0.16, S * 0.76, S * 0.68, S * 0.16); rr(h, S * 0.62, S * 0.06, S * 0.26, S * 0.3, S * 0.1); };
    contact(g, m, S * 0.9, S * 0.34, S * 0.06, 0.26);
    uni(g, [[P, base]], 1.5); cel(g, P, base, 2, 2);
    tint(g, P, paint, (h) => { rr(h, S * 0.22, S * 0.3, S * 0.4, S * 0.4, S * 0.1); h.fill(); });
    seam(g, P, base, (h) => { h.fillRect(S * 0.12, S * 0.72, S * 0.76, S * 0.08); }, 0.22);
    spec(g, S * 0.3, S * 0.26, S * 0.12, S * 0.035, 0, 0.4);
  });
}
function srcSpr(d, col) {
  return spr('s' + d + col + (S | 0), S, S, (g) => {
    const m = S * 0.5, base = '#7d7498';
    g.translate(m, m); g.rotate(d * Math.PI / 2); g.translate(-m, -m);
    /* tolva: una sola silueta (embudo + boca) */
    const P = (h) => {
      h.moveTo(S * 0.1, S * 0.12); h.lineTo(S * 0.9, S * 0.12); h.lineTo(S * 0.68, S * 0.56);
      h.lineTo(S * 0.86, S * 0.56); h.lineTo(S * 0.86, S * 0.84); h.lineTo(S * 0.14, S * 0.84);
      h.lineTo(S * 0.14, S * 0.56); h.lineTo(S * 0.32, S * 0.56); h.closePath();
    };
    contact(g, m, S * 0.88, S * 0.36, S * 0.06, 0.28);
    uni(g, [[P, base]], 1.5); cel(g, P, base, 2, 2);
    tint(g, P, COL[col], (h) => { rr(h, S * 0.26, S * 0.6, S * 0.48, S * 0.2, S * 0.07); h.fill(); });
    seam(g, P, base, (h) => { h.fillRect(S * 0.14, S * 0.52, S * 0.72, S * 0.05); }, 0.25);
    spec(g, S * 0.3, S * 0.2, S * 0.16, S * 0.04, 0, 0.35);
  });
}
function boxSpr(col, ajena) {
  return spr('c' + col + (ajena ? 'a' : '') + (S | 0), S, S, (g) => {
    const base = ajena ? '#6c6480' : '#c08a52';
    /* cajón de una pieza: caja + reborde superior fundidos */
    const P = (h) => { rr(h, S * 0.12, S * 0.24, S * 0.76, S * 0.62, S * 0.08); rr(h, S * 0.06, S * 0.16, S * 0.88, S * 0.16, S * 0.06); };
    contact(g, S * 0.5, S * 0.9, S * 0.36, S * 0.06, 0.3);
    uni(g, [[P, base]], 1.5); cel(g, P, base, 2, 2);
    seam(g, P, base, (h) => { h.fillRect(S * 0.12, S * 0.34, S * 0.76, S * 0.05); h.fillRect(S * 0.46, S * 0.34, S * 0.06, S * 0.52); }, 0.2);
    tint(g, P, ajena ? '#3a3350' : COL[col], (h) => { rr(h, S * 0.2, S * 0.46, S * 0.6, S * 0.3, S * 0.07); h.fill(); });
    spec(g, S * 0.32, S * 0.22, S * 0.16, S * 0.035, 0, 0.35);
  });
}
function wallSpr() {
  return spr('w' + (S | 0), S, S, (g) => {
    const base = '#4a4468';
    const P = (h) => rr(h, S * 0.05, S * 0.05, S * 0.9, S * 0.9, S * 0.12);
    uni(g, [[P, base]], 1.4); cel(g, P, base, 2, 2);
    seam(g, P, base, (h) => { h.fillRect(S * 0.05, S * 0.46, S * 0.9, S * 0.06); h.fillRect(S * 0.46, S * 0.05, S * 0.06, S * 0.41); h.fillRect(S * 0.26, S * 0.52, S * 0.06, S * 0.43); }, 0.18);
  });
}
function itemSpr(col, r) {
  return spr('i' + col + (r | 0), r * 2, r * 2, (g) => {
    const P = (h) => rr(h, 1.5, 1.5, r * 2 - 3, r * 2 - 3, r * 0.5);
    contact(g, r, r * 1.9, r * 0.7, r * 0.18, 0.28);
    uni(g, [[P, COL[col]]], 1.4); cel(g, P, COL[col], 1.6, 1.6);
    spec(g, r * 0.75, r * 0.6, r * 0.34, r * 0.16, -0.5, 0.55);
  });
}
function cintasDraw() {
  BTN = [];
  c.fillStyle = TH.bg; c.fillRect(0, 0, W, H);
  /* suelo de la nave: una placa con cel y rejilla por sombra propia */
  const P = (h) => rr(h, GX - 10, GY - 10, S * lv.w + 20, S * lv.h + 20, 16);
  uni(c, [[P, TH.floor]], 1.6); cel(c, P, TH.floor, 2.5, 2.5);
  seam(c, P, TH.floor, (h) => {
    for (let x = 1; x < lv.w; x++) h.fillRect(GX + x * S - 1, GY, 2, S * lv.h);
    for (let y = 1; y < lv.h; y++) h.fillRect(GX, GY + y * S - 1, S * lv.w, 2);
  }, 0.14);
  /* piezas fijas y colocadas */
  for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
    const ch = baseAt(x, y), X = GX + x * S, Y = GY + y * S;
    if (ch === '#') blit(wallSpr(), X, Y);
    else if (DCH.indexOf(ch) >= 0) blit(beltSpr(DCH.indexOf(ch), 'fix'), X, Y);
    else if (ch >= '1' && ch <= '9') {
      const e = lv.e[+ch - 1];
      if (e.t === 's') blit(srcSpr(e.d, e.c), X, Y);
      else if (e.t === 'b') blit(boxSpr(e.c, e.n === 0), X, Y);
      else blit(paintSpr(e.d, e.c), X, Y);
    }
  }
  for (let i = 0; i < place.length; i++) {
    const p = place[i], X = GX + p.x * S, Y = GY + p.y * S;
    blit(p.t === 'split' ? splitSpr(p.d) : p.t === 'paint' ? paintSpr(p.d, p.c) : beltSpr(p.d, 'own'), X, Y);
  }
  /* contadores de las cajas */
  for (let i = 0; i < lv.e.length; i++) {
    const e = lv.e[i]; if (!e || e.t !== 'b') continue;
    let px = -1, py = -1;
    for (let y = 0; y < lv.h; y++) { const q = lv.g[y].indexOf(String(i + 1)); if (q >= 0) { px = q; py = y; } }
    if (px < 0) continue;
    const got = sim ? (sim.b.cells[py * lv.w + px].got || 0) : 0;
    const t = e.n === 0 ? 'ajena' : got + '/' + e.n, fs = Math.max(10, Math.round(S * 0.24));
    const X = GX + px * S + S / 2, Y = GY + py * S + S * 0.28;
    const wpx = tw(t, fs) + 8;
    const PB = (h) => rr(h, X - wpx / 2, Y - 2, wpx, fs + 5, 6);
    uni(c, [[PB, '#1a1530']], 1); k.text(t, X, Y, fs, e.n === 0 ? '#ff9c9c' : '#fff', 'center');
  }
  /* piezas en movimiento (interpoladas entre casillas) */
  if (sim) {
    const f = Math.min(1, tacc / TICK), r = Math.max(6, S * 0.28);
    for (let i = 0; i < sim.items.length; i++) {
      const it = sim.items[i];
      const x = (it.px + (it.x - it.px) * f + 0.5) * S + GX, y = (it.py + (it.y - it.py) * f + 0.5) * S + GY;
      blit(itemSpr(it.c, r), x - r, y - r);
    }
  }
  /* cursor de teclado / mando */
  if (kb && !run) {
    c.strokeStyle = TH.ac; c.lineWidth = 3; c.beginPath(); rr(c, GX + cur[0] * S + 2, GY + cur[1] * S + 2, S - 4, S - 4, 8); c.stroke();
  }
  cintasHud();
  cintasPanel();
  if (doneT > 0) { c.fillStyle = 'rgba(12,8,26,' + Math.min(0.4, doneT * 0.7) + ')'; c.fillRect(0, 0, W, H); }
}
function cintasHud() {
  const half = W / 2 - 44 - 14;                       /* ancho libre a cada lado de la banda central */
  const tl = 'Nivel ' + k.lv + '/' + LV.length + ' · ' + lv.t;
  k.text(clipTxt(tl, half, 15), 14, 10, 15, '#efeaff');
  const used = place.length, tot = inv.reduce((s, it) => s + it[1], 0);
  const r1 = 'Piezas ' + used + '/' + tot, r2 = 'Mínimo ' + lv.min;
  k.text(clipTxt(r1, half, 15), W - 14, 10, 15, used > tot ? '#ff6b6b' : '#efeaff', 'right');
  k.text(clipTxt(r2, half, 13), W - 14, 32, 13, used <= lv.min ? TH.ac : '#a79ecb', 'right');
  const info = msgT > 0 ? msg : run ? 'Marcha: mira si cada pieza llega a su caja' : 'Toca una casilla para poner ' + (inv[sel][0] === 'belt' ? 'una cinta' : inv[sel][0] === 'split' ? 'un desvío' : 'una pintora') + '; tócala otra vez para girarla';
  const fs = fitSize(info, W - 28, 13, 10);
  k.text(clipTxt(info, W - 28, fs), 14, HFREE + 2, fs, msgT > 0 ? '#ff9c9c' : '#a79ecb');
}
function cintasPanel() {
  const y0 = H - PANH + 6, bw = Math.floor((W - 28 - 8 * (inv.length - 1)) / inv.length);
  for (let i = 0; i < inv.length; i++) {
    const it = inv[i], left = invLeft(i);
    const nm = it[0] === 'belt' ? 'Cinta' : it[0] === 'split' ? 'Desvío' : 'Pintora ' + CNOM[it[2]];
    button('inv' + i, 14 + i * (bw + 8), y0, bw, 56, nm + '  ' + left, {
      on: sel === i, fs: 13, icon: (g, x, y, w, h) => {
        const sz = Math.min(26, w * 0.4), q = it[0] === 'split' ? splitSpr(0) : it[0] === 'paint' ? paintSpr(0, it[2]) : beltSpr(0, 'own');
        g.drawImage(q, x + w / 2 - sz / 2, y + 5, sz, sz);
      }
    });
  }
  const y1 = y0 + 60, bw2 = Math.floor((W - 28 - 16) / 3);
  button('rot', 14, y1, bw2, 48, 'Girar ' + '→↓←↑'[curD], { dis: !!run, fs: 15 });
  button('clr', 14 + bw2 + 8, y1, bw2, 48, 'Limpiar', { dis: !!run || !place.length, fs: 15 });
  button('go', 14 + (bw2 + 8) * 2, y1, bw2, 48, run ? 'Parar' : 'Marcha', { on: !run, col: run ? '#ff8a5b' : TH.ac, fs: 16 });
  for (let i = 0; i < BTN.length; i++) drawBtn(BTN[i]);
}

/* ============================================================================================
 * 2) CIUDAD DE BLOQUES
 * ========================================================================================== */
const GW = 9, GH = 8;
const TOOLS = [
  { t: 1, n: 'Calle', p: 20 }, { t: 2, n: 'Casa', p: 60 }, { t: 3, n: 'Tienda', p: 120 },
  { t: 4, n: 'Parque', p: 80 }, { t: 5, n: 'Fábrica', p: 200 }, { t: 0, n: 'Derribo', p: 15 },
];
const MEDALS = [
  { n: 'Primer vecino', d: 'Una casa pegada a la calle' },
  { n: 'Calle mayor', d: '8 tramos de calle' },
  { n: 'Zona verde', d: 'Un parque en el barrio' },
  { n: 'Comercio', d: 'Una tienda con 2 casas cerca' },
  { n: 'Veinte vecinos', d: '20 vecinos viviendo aquí' },
  { n: 'Buen ambiente', d: 'Ánimo de 85 o más' },
  { n: 'Caja fuerte', d: '600 € ahorrados' },
  { n: 'Renta de 60', d: '60 € de ingresos al mes' },
  { n: 'Cuarenta vecinos', d: '40 vecinos viviendo aquí' },
  { n: 'Polígono', d: 'Una fábrica y 90 € al mes' },
  { n: 'Todo conectado', d: '12 edificios, ninguno aislado' },
  { n: 'Barrio modelo', d: '60 vecinos con ánimo 80' },
];
const MESES = 36;
let cg = [], money = 0, vec = 0, mood = 75, renta = 0, month = 1, mt = 0, med = [], medT = 0, medN = -1;
let tool = 0, ccur = [4, 4], ckb = false, cmsg = '', cmsgT = 0, smoke = [], CS = 44, CX = 0, CY = 0, glow = 0;
const at = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH ? -1 : cg[y * GW + x]);
function ciudadBuild() {
  cg = new Array(GW * GH).fill(0);
  cg[3 * GW] = 1; cg[3 * GW + 1] = 1;                 /* entrada del barrio ya asfaltada */
  money = 420 + (k.dif === 0 ? 140 : k.dif === 2 ? -60 : 0);
  vec = 0; mood = 75; renta = 0; month = 1; mt = 0; med = MEDALS.map(() => 0); medT = 0; medN = -1;
  tool = 0; ccur = [2, 3]; cmsg = ''; cmsgT = 0; smoke = []; glow = 0;
  CS = Math.min(Math.floor((W - 24) / GW), Math.floor((H - HUDH - PANH - 20) / GH));
  CX = Math.round((W - CS * GW) / 2); CY = Math.round(HUDH + (H - HUDH - PANH - CS * GH) / 2);
  econ();
}
/* red de calles conectada con la entrada */
function net() {
  const seen = new Array(GW * GH).fill(0), q = [3 * GW];
  if (cg[3 * GW] !== 1) return seen;
  seen[3 * GW] = 1;
  while (q.length) {
    const i = q.pop(), x = i % GW, y = (i / GW) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + DIRX[d], ny = y + DIRY[d];
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const j = ny * GW + nx;
      if (!seen[j] && cg[j] === 1) { seen[j] = 1; q.push(j); }
    }
  }
  return seen;
}
function near(x, y, t, rad) {
  let n = 0;
  for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    if (Math.abs(dx) + Math.abs(dy) > rad) continue;
    if (at(x + dx, y + dy) === t) n++;
  }
  return n;
}
function conn(x, y, seen) {
  for (let d = 0; d < 4; d++) { const nx = x + DIRX[d], ny = y + DIRY[d]; if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && seen[ny * GW + nx]) return 1; }
  return 0;
}
/* Economía y ánimo: se recalculan a cada cambio, así el panel siempre dice la verdad. */
let stats = { casas: 0, casasC: 0, tiendas: 0, parques: 0, fabricas: 0, calles: 0, sueltos: 0, edif: 0 };
function econ() {
  const seen = net();
  let v = 0, msum = 0, mn = 0, s = { casas: 0, casasC: 0, tiendas: 0, parques: 0, fabricas: 0, calles: 0, sueltos: 0, edif: 0 };
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const t = at(x, y); if (!t) continue;
    if (t === 1) { s.calles++; continue; }
    s.edif++;
    const cn = conn(x, y, seen);
    if (!cn) s.sueltos++;
    if (t === 2) { s.casas++; if (cn) { s.casasC++; v += 4 + (near(x, y, 4, 1) ? 2 : 0); } }
    if (t === 3 && cn) s.tiendas++;
    if (t === 4) s.parques++;
    if (t === 5 && cn) s.fabricas++;
  }
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (at(x, y) !== 2) continue;
    let m = 74 + near(x, y, 4, 2) * 9 - near(x, y, 5, 2) * 16 + (near(x, y, 3, 2) ? 5 : -3) - (conn(x, y, seen) ? 0 : 18);
    m = Math.max(0, Math.min(100, m)); msum += m; mn++;
  }
  vec = v; mood = mn ? Math.round(msum / mn) : 75; stats = s;
  const f = mood / 72;
  renta = Math.round(v * 2.1 * f + s.tiendas * 15 * f + s.fabricas * 34 - s.calles * 1.2 - s.edif * 2);
}
function houseMood(x, y, seen) {
  seen = seen || net();
  let m = 74 + near(x, y, 4, 2) * 9 - near(x, y, 5, 2) * 16 + (near(x, y, 3, 2) ? 5 : -3) - (conn(x, y, seen) ? 0 : 18);
  return Math.max(0, Math.min(100, m));
}
function medalCheck() {
  const c0 = [
    stats.casasC >= 1, stats.calles >= 8, stats.parques >= 1,
    (() => { for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (at(x, y) === 3 && near(x, y, 2, 2) >= 2) return 1; return 0; })(),
    vec >= 20, mood >= 85 && stats.casasC >= 3, money >= 600, renta >= 60, vec >= 40,
    stats.fabricas >= 1 && renta >= 90, stats.edif >= 12 && stats.sueltos === 0, vec >= 60 && mood >= 80,
  ];
  for (let i = 0; i < med.length; i++) if (!med[i] && c0[i]) {
    med[i] = 1; medN = i; medT = 3.4; money += 100; k.sfx('coin'); k.confetti(null, 26); k.float('¡' + MEDALS[i].n + '! +100 €', W / 2, CY + 30, TH.ac);
  }
  if (med.every((q) => q)) endCity(1);
}
function nextGoal() {
  for (let i = 0; i < med.length; i++) if (!med[i]) return MEDALS[i].n + ': ' + MEDALS[i].d;
  return 'Todas las medallas conseguidas';
}
function endCity(win) {
  const sc = vec * 10 + med.reduce((a, b) => a + b, 0) * 250 + Math.max(0, money >> 1);
  const ex = vec + ' vecinos · ánimo ' + mood + ' · ' + med.reduce((a, b) => a + b, 0) + '/12 medallas';
  if (win) { k.st = 'over'; k.confetti(); later(() => k.end(CFG.id, sc, '¡Barrio modelo!', ex), 500); }
  else k.end(CFG.id, sc, 'Fin de los ' + MESES + ' meses', ex);
}
function build(x, y) {
  const t = TOOLS[tool], cell = at(x, y);
  if (t.t === 0) {
    if (cell <= 0) { cmsg = 'Ahí no hay nada que derribar'; cmsgT = 1.6; k.sfx('hit'); return; }
    if (money < t.p) { cmsg = 'No te llega para derribar'; cmsgT = 1.8; k.sfx('hit'); return; }
    money -= t.p; cg[y * GW + x] = 0; k.sfx('pop'); econ(); medalCheck(); return;
  }
  if (cell !== 0) { cmsg = 'Esa casilla ya está ocupada'; cmsgT = 1.6; k.sfx('hit'); return; }
  if (money < t.p) { cmsg = 'Te faltan ' + (t.p - money) + ' € para ' + t.n.toLowerCase(); cmsgT = 2.2; k.sfx('hit'); return; }
  money -= t.p; cg[y * GW + x] = t.t; k.sfx('click');
  k.float('-' + t.p + ' €', CX + (x + 0.5) * CS, CY + y * CS, '#ff9c9c');
  if (t.t === 5) smoke.push({ x: x, y: y, t: 0 });
  econ(); medalCheck();
}
function ciudadTap(x, y) {
  const b = hitBtn(x, y);
  if (b) { if (b.id.indexOf('t') === 0) { tool = +b.id.slice(1); k.sfx('click'); ckb = false; } return; }
  const gx = Math.floor((x - CX) / CS), gy = Math.floor((y - CY) / CS);
  if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return;
  ccur = [gx, gy]; build(gx, gy);
}
function ciudadUpd(dt) {
  if (cmsgT > 0) cmsgT -= dt;
  if (medT > 0) medT -= dt;
  glow += dt;
  mt += dt / (5.2 * (k.D.time || 1));
  while (mt >= 1) {
    mt -= 1; month++;
    money += renta;
    if (renta) k.float((renta > 0 ? '+' : '') + renta + ' €', W / 2, CY + 40, renta > 0 ? TH.ac : '#ff9c9c');
    medalCheck();
    if (money < -120) return k.lose(CFG.id, vec * 10 + med.reduce((a, b) => a + b, 0) * 250, 'Barrio en quiebra', 'Los gastos se comieron la caja');
    if (month > MESES) return endCity(0);
  }
  if (k.ptr.hit) ciudadTap(k.ptr.x, k.ptr.y);
  if (k.hit.has('left')) { ccur[0] = Math.max(0, ccur[0] - 1); ckb = true; }
  if (k.hit.has('right')) { ccur[0] = Math.min(GW - 1, ccur[0] + 1); ckb = true; }
  if (k.hit.has('up')) { ccur[1] = Math.max(0, ccur[1] - 1); ckb = true; }
  if (k.hit.has('down')) { ccur[1] = Math.min(GH - 1, ccur[1] + 1); ckb = true; }
  if (k.hit.has('a')) build(ccur[0], ccur[1]);
  if (k.hit.has('b')) { tool = (tool + 1) % TOOLS.length; k.sfx('click'); }
  for (let i = smoke.length - 1; i >= 0; i--) { smoke[i].t += dt; if (smoke[i].t > 3) smoke[i].t = 0; }
}

/* ---------- arte del barrio ---------- */
function grassSpr(v) {
  return spr('g' + v + (CS | 0), CS, CS, (g) => {
    const base = v % 2 ? '#5d9143' : '#568a3e';
    const P = (h) => rr(h, 0.5, 0.5, CS - 1, CS - 1, 4);
    uni(g, [[P, base]], 0.9);
    seam(g, P, base, (h) => {
      for (let i = 0; i < 5; i++) {
        const rx = rndf(v * 9 + i) * CS, ry = rndf(v * 5 + i * 3) * CS;
        h.beginPath(); h.ellipse(rx, ry, CS * 0.07, CS * 0.04, 0.4, 0, R2); h.fill();
      }
    }, 0.1);
  });
}
function roadSpr() {
  return spr('rd' + (CS | 0), CS, CS, (g) => {
    const base = '#4c4a58';
    const P = (h) => rr(h, 0.5, 0.5, CS - 1, CS - 1, 3);
    uni(g, [[P, base]], 0.9); cel(g, P, base, 1.2, 1.2);
    tint(g, P, '#e9e2c4', (h) => { h.globalAlpha = 0.8; h.fillRect(CS * 0.44, CS * 0.12, CS * 0.12, CS * 0.22); h.fillRect(CS * 0.44, CS * 0.64, CS * 0.12, CS * 0.22); h.globalAlpha = 1; });
  });
}
function casaSpr(v) {
  return spr('ca' + v + (CS | 0), CS, CS, (g) => {
    const cols = ['#e8705c', '#f0a94d', '#6fb3e0', '#c98ae0'], base = cols[v % 4];
    /* casa de una sola pieza: tejado y cuerpo fundidos en un trazado continuo */
    const P = (h) => {
      const x0 = CS * 0.16, x1 = CS * 0.84, yr = CS * 0.42, yb = CS * 0.88;
      h.moveTo(x0, yr); h.lineTo(CS * 0.5, CS * 0.13); h.lineTo(x1, yr);
      h.lineTo(x1 - CS * 0.04, yr); h.lineTo(x1 - CS * 0.04, yb); h.lineTo(x0 + CS * 0.04, yb);
      h.lineTo(x0 + CS * 0.04, yr); h.closePath();
    };
    contact(g, CS * 0.5, CS * 0.9, CS * 0.32, CS * 0.055, 0.3);
    uni(g, [[P, base]], 1.4); cel(g, P, base, 1.6, 1.6);
    seam(g, P, base, (h) => { h.beginPath(); h.moveTo(CS * 0.16, CS * 0.44); h.lineTo(CS * 0.84, CS * 0.44); h.lineTo(CS * 0.84, CS * 0.5); h.lineTo(CS * 0.16, CS * 0.5); h.closePath(); h.fill(); }, 0.24);
    tint(g, P, '#3a2a22', (h) => { rr(h, CS * 0.43, CS * 0.62, CS * 0.16, CS * 0.26, CS * 0.03); h.fill(); });
    tint(g, P, '#ffe9a8', (h) => { rr(h, CS * 0.24, CS * 0.58, CS * 0.13, CS * 0.13, CS * 0.02); h.fill(); rr(h, CS * 0.63, CS * 0.58, CS * 0.13, CS * 0.13, CS * 0.02); h.fill(); });
    spec(g, CS * 0.38, CS * 0.27, CS * 0.1, CS * 0.03, -0.6, 0.4);
  });
}
function tiendaSpr() {
  return spr('ti' + (CS | 0), CS, CS, (g) => {
    const base = '#f0c24d';
    const P = (h) => { rr(h, CS * 0.16, CS * 0.3, CS * 0.68, CS * 0.58, CS * 0.05); rr(h, CS * 0.1, CS * 0.26, CS * 0.8, CS * 0.14, CS * 0.05); };
    contact(g, CS * 0.5, CS * 0.9, CS * 0.34, CS * 0.055, 0.3);
    uni(g, [[P, base]], 1.4); cel(g, P, base, 1.6, 1.6);
    tint(g, P, '#e0584f', (h) => { for (let i = 0; i < 4; i++) h.fillRect(CS * (0.12 + i * 0.2), CS * 0.26, CS * 0.1, CS * 0.14); });
    tint(g, P, '#2f4d63', (h) => { rr(h, CS * 0.22, CS * 0.48, CS * 0.34, CS * 0.2, CS * 0.03); h.fill(); });
    tint(g, P, '#3a2a22', (h) => { rr(h, CS * 0.62, CS * 0.5, CS * 0.16, CS * 0.38, CS * 0.03); h.fill(); });
    spec(g, CS * 0.3, CS * 0.52, CS * 0.1, CS * 0.03, -0.5, 0.45);
  });
}
function parqueSpr() {
  return spr('pa' + (CS | 0), CS, CS, (g) => {
    const tree = '#3f8b46', trunk = '#8a5a34';
    /* árbol: tronco y copa en un único trazado (tangente continua) */
    const P = (h) => {
      h.moveTo(CS * 0.44, CS * 0.86); h.lineTo(CS * 0.44, CS * 0.58);
      h.arc(CS * 0.5, CS * 0.42, CS * 0.26, Math.PI * 0.86, Math.PI * 0.14, false);
      h.lineTo(CS * 0.56, CS * 0.86); h.closePath();
    };
    contact(g, CS * 0.5, CS * 0.88, CS * 0.26, CS * 0.05, 0.3);
    uni(g, [[P, tree]], 1.4); cel(g, P, tree, 1.6, 1.6);
    tint(g, P, trunk, (h) => { rr(h, CS * 0.44, CS * 0.58, CS * 0.12, CS * 0.3, CS * 0.03); h.fill(); });
    const B = (h) => { h.moveTo(CS * 0.78, CS * 0.84); h.arc(CS * 0.74, CS * 0.76, CS * 0.1, 0, R2); };
    uni(g, [[B, '#4f9e4f']], 1.2); cel(g, B, '#4f9e4f', 1.2, 1.2);
    spec(g, CS * 0.4, CS * 0.32, CS * 0.09, CS * 0.035, -0.6, 0.4);
  });
}
function fabSpr() {
  return spr('fa' + (CS | 0), CS, CS, (g) => {
    const base = '#8d93a6';
    const P = (h) => { rr(h, CS * 0.12, CS * 0.42, CS * 0.76, CS * 0.46, CS * 0.05); rr(h, CS * 0.62, CS * 0.14, CS * 0.16, CS * 0.34, CS * 0.04); };
    contact(g, CS * 0.5, CS * 0.9, CS * 0.34, CS * 0.055, 0.3);
    uni(g, [[P, base]], 1.4); cel(g, P, base, 1.6, 1.6);
    seam(g, P, base, (h) => { h.fillRect(CS * 0.12, CS * 0.56, CS * 0.76, CS * 0.05); }, 0.2);
    tint(g, P, '#ff8a5b', (h) => { h.fillRect(CS * 0.62, CS * 0.16, CS * 0.16, CS * 0.07); });
    tint(g, P, '#31506b', (h) => { for (let i = 0; i < 3; i++) { rr(h, CS * (0.18 + i * 0.2), CS * 0.66, CS * 0.13, CS * 0.13, CS * 0.02); h.fill(); } });
    spec(g, CS * 0.3, CS * 0.47, CS * 0.1, CS * 0.03, -0.5, 0.4);
  });
}
function sadSpr() {
  return spr('sd' + (CS | 0), 16, 16, (g) => {
    const P = (h) => { h.moveTo(8, 1); h.lineTo(15, 14); h.lineTo(1, 14); h.closePath(); };
    uni(g, [[P, '#ff6b6b']], 1.2); cel(g, P, '#ff6b6b', 1, 1);
    tint(g, P, '#3a1020', (h) => { h.fillRect(7, 5, 2, 5); h.fillRect(7, 11, 2, 2); });
  });
}
function ciudadDraw() {
  BTN = [];
  c.fillStyle = TH.bg; c.fillRect(0, 0, W, H);
  const P = (h) => rr(h, CX - 8, CY - 8, CS * GW + 16, CS * GH + 16, 14);
  uni(c, [[P, '#3f6b30']], 1.6);
  const seen = net();
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const X = CX + x * CS, Y = CY + y * CS, t = at(x, y);
    blit(grassSpr((x * 7 + y * 13) % 4), X, Y);
    if (t === 1) blit(roadSpr(), X, Y);
    else if (t === 2) blit(casaSpr((x + y * 3) % 4), X, Y);
    else if (t === 3) blit(tiendaSpr(), X, Y);
    else if (t === 4) blit(parqueSpr(), X, Y);
    else if (t === 5) blit(fabSpr(), X, Y);
    if (t >= 2 && !conn(x, y, seen)) blit(sadSpr(), X + CS - 17, Y + 2);
    else if (t === 2 && houseMood(x, y, seen) < 55) blit(sadSpr(), X + CS - 17, Y + 2);
  }
  /* humo de las fábricas (se mueve → pieza suelta, permitido por §8) */
  for (let i = 0; i < smoke.length; i++) {
    const s = smoke[i]; if (at(s.x, s.y) !== 5) continue;
    for (let j = 0; j < 3; j++) {
      const t = (s.t + j) % 3, X = CX + (s.x + 0.7) * CS + Math.sin(t * 2) * CS * 0.07, Y = CY + (s.y + 0.16) * CS - t * CS * 0.22;
      c.fillStyle = 'rgba(230,230,240,' + (0.3 - t * 0.09).toFixed(2) + ')';
      c.beginPath(); c.arc(X, Y, CS * (0.06 + t * 0.05), 0, R2); c.fill();
    }
  }
  if (ckb) { c.strokeStyle = TH.ac; c.lineWidth = 3; c.beginPath(); rr(c, CX + ccur[0] * CS + 2, CY + ccur[1] * CS + 2, CS - 4, CS - 4, 7); c.stroke(); }
  ciudadHud(); ciudadPanel();
}
function bar(x, y, w, h, v, col) {
  const P = (g) => rr(g, x, y, w, h, h / 2);
  uni(c, [[P, '#241d45']], 1.1);
  if (v > 0) { const Q = (g) => rr(g, x + 1.5, y + 1.5, Math.max(h - 3, (w - 3) * v), h - 3, (h - 3) / 2); c.beginPath(); Q(c); c.fillStyle = col; c.fill(); }
}
function ciudadHud() {
  k.text(money + ' €', 14, 9, 19, money < 0 ? '#ff6b6b' : TH.ac);
  const rt = (renta >= 0 ? '+' : '') + renta + ' €/mes';
  k.text(rt, 14, 32, 13, renta >= 0 ? '#bfe08a' : '#ff9c9c');
  k.text('Mes ' + Math.min(month, MESES) + '/' + MESES, W - 14, 9, 15, '#efeaff', 'right');
  k.text('Medallas ' + med.reduce((a, b) => a + b, 0) + '/12', W - 14, 30, 13, '#a7c6a0', 'right');
  /* tercera fila, ya por debajo de los botones del reproductor */
  const vt = vec + (vec === 1 ? ' vecino' : ' vecinos');
  k.text(vt, 14, HFREE + 1, 14, '#efeaff');
  const bx = 14 + Math.max(90, tw(vt, 14) + 12);
  k.text('Ánimo', bx, HFREE + 2, 12, '#a7c6a0');
  bar(bx + 46, HFREE + 3, Math.max(40, W - 14 - (bx + 46)), 11, mood / 100, mood >= 80 ? '#a8cf3f' : mood >= 55 ? '#ffc94d' : '#ff6b6b');
  /* objetivo / aviso: una sola línea que se abrevia antes de desbordar */
  const info = cmsgT > 0 ? cmsg : medT > 0 && medN >= 0 ? '¡Medalla! ' + MEDALS[medN].n : nextGoal();
  const fs = fitSize(info, W - 28, 13, 10);
  k.text(clipTxt(info, W - 28, fs), W / 2, H - PANH + 4, fs, cmsgT > 0 ? '#ff9c9c' : medT > 0 ? TH.ac : '#c6e0b4', 'center');
}
function ciudadPanel() {
  const y0 = H - PANH + 22, bw = Math.floor((W - 28 - 16) / 3), bh = 47;
  for (let i = 0; i < TOOLS.length; i++) {
    const t = TOOLS[i], col = i % 3, row = (i / 3) | 0;
    button('t' + i, 14 + col * (bw + 8), y0 + row * (bh + 8), bw, bh, t.n + '  ' + t.p + ' €', {
      on: tool === i, fs: 14, dis: money < t.p,
      icon: (g, x, y, w, h) => {
        const sz = Math.min(23, h * 0.46), q = t.t === 1 ? roadSpr() : t.t === 2 ? casaSpr(0) : t.t === 3 ? tiendaSpr() : t.t === 4 ? parqueSpr() : t.t === 5 ? fabSpr() : sadSpr();
        g.drawImage(q, x + w / 2 - sz / 2, y + 3, sz, sz);
      }
    });
  }
  for (let i = 0; i < BTN.length; i++) drawBtn(BTN[i]);
}

/* ============================================================================================
 * bucle común
 * ========================================================================================== */
function reset() { if (M === 'cintas') buildLv(); else ciudadBuild(); }
const _upd = (dt) => { if (!k.gate(reset)) return; if (M === 'cintas') cintasUpd(dt); else ciudadUpd(dt); };
const _draw = () => { if (M === 'cintas') cintasDraw(); else ciudadDraw(); };
if (M === 'cintas') k.levels(LV.length, { start: (i) => { buildLv(); } });
reset();
k.run(_upd, _draw);
k.show(CFG.title, CFG.help);
/* ganchos de prueba (bots de Playwright): geometría de la rejilla y estado */
window.__g = { mode: M, W: W, H: H, get S() { return M === 'cintas' ? S : CS; }, get gx() { return M === 'cintas' ? GX : CX; }, get gy() { return M === 'cintas' ? GY : CY; }, get btn() { return BTN; }, get lv() { return lv; }, get place() { return place; }, get run() { return M === 'cintas' ? run : 0; }, get msg() { return M === 'cintas' ? msg : cmsg; }, get money() { return money; }, get med() { return med; } };
