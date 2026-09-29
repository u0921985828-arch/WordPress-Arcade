/* Niveles a mano de jewel-swap (plan Friv, F3, tanda 4).
 *
 * Este fichero lleva DOS cosas:
 *   1) M3  — las REGLAS PURAS del tablero (sin canvas, sin Kit): tablero, combinaciones,
 *            especiales, gravedad, objetivos y jugadas. match3.js las usa tal cual y solo
 *            se ocupa de dibujar y de animar. Node puede cargarlas con require() para
 *            simular partidas (marcas <LV> … </LV> y module.exports al final).
 *   2) SWAPLV — los 20 tableros escritos a mano.
 *
 * PLANTA — cada nivel es una lista de filas de la misma anchura:
 *   #  agujero (no hay casilla)      .  gema al azar
 *   1..6 gema de ese color fijo      o  gema sobre HIELO (1 capa)
 *   j  gema sobre GELATINA (1 capa)  J  gema sobre GELATINA (2 capas)
 *   x  COFRE (cae; se recoge al tocar el suelo de su columna)
 *   a  JAULA con animalillo (se abre con una combinación al lado o un especial)
 *
 * Regla de forma: las casillas de una columna tienen que ser seguidas (sin agujeros en
 * medio); si no, las gemas no podrían caer. El simulador lo comprueba.
 *
 * CAMPOS de cada nivel:
 *   n  nombre · i  la idea nueva que enseña · mv  movimientos (normal) · cols  colores
 *   o  objetivos: {t:'color',v,n} {t:'chest',n} {t:'ice'} {t:'jelly'} {t:'animal',n} {t:'score',n}
 *   st [1★,2★,3★] puntos · g la planta
 *
 * ESPECIALES: 4 en línea = RAYO (limpia su fila o su columna) · forma de L o T = BOMBA (3×3)
 * · 5 en línea = COMODÍN. Fusiones al intercambiar dos especiales: rayo+rayo = cruz,
 * rayo+bomba = tres filas y tres columnas, bomba+bomba = 5×5, comodín+gema = todas las de
 * ese color, comodín+rayo/bomba = todas las de ese color convertidas en ese especial,
 * comodín+comodín = el tablero entero.
 */
/* <LV> ------------------------------------------------------------------------------------------
   Zona pura: nada de aquí toca el DOM. Se prueba desde Node con scripts propios. */
const M3 = (function () {
  const EMPTY = -1, CHEST = 100, CAGE = 101, WILD = 102;
  const NONE = 0, RH = 1, RV = 2, BOMB = 3, WSP = 4;
  const isGem = (v) => v >= 0 && v < 90;

  /* generador reproducible para el simulador (mulberry32) */
  function rng(seed) { let t = seed >>> 0; return function () { t += 0x6D2B79F5; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

  const bump = (S, t, n) => { for (let i = 0; i < S.obj.length; i++) if (S.obj[i].t === t) S.obj[i].got = Math.min(S.obj[i].n, S.obj[i].got + (n || 1)); };
  const bumpColor = (S, v) => { for (let i = 0; i < S.obj.length; i++) if (S.obj[i].t === 'color' && S.obj[i].v === v) S.obj[i].got = Math.min(S.obj[i].n, S.obj[i].got + 1); };
  const bumpScore = (S) => { for (let i = 0; i < S.obj.length; i++) if (S.obj[i].t === 'score') S.obj[i].got = Math.min(S.obj[i].n, S.score); };
  const done = (S) => { for (let i = 0; i < S.obj.length; i++) if (S.obj[i].got < S.obj[i].n) return false; return true; };

  function make(lv, opt) {
    opt = opt || {};
    const g = lv.g, h = g.length; let w = 0;
    for (let i = 0; i < h; i++) w = Math.max(w, g[i].length);
    const S = {
      w: w, h: h, name: lv.n, tip: lv.i, st: lv.st || [0, 0, 0],
      nc: Math.max(4, Math.min(6, opt.colors || lv.cols || 6)),
      rand: opt.rand || Math.random, score: 0, combo: 0,
      mv: opt.moves != null ? opt.moves : lv.mv, mv0: 0,
      c: [], sp: [], ice: [], jl: [], bl: [], rr: [],
      top: [], bot: [], obj: [], forced: null, fspawn: null, last: null,
      won: false, lost: false, bad: null
    };
    S.mv0 = S.mv;
    for (let y = 0; y < h; y++) {
      S.c[y] = []; S.sp[y] = []; S.ice[y] = []; S.jl[y] = []; S.bl[y] = []; S.rr[y] = [];
      for (let x = 0; x < w; x++) {
        const ch = g[y].charAt(x) || '#';
        S.sp[y][x] = NONE; S.ice[y][x] = 0; S.jl[y][x] = 0; S.bl[y][x] = false; S.rr[y][x] = false; S.c[y][x] = EMPTY;
        if (ch === '#' || ch === ' ') { S.bl[y][x] = true; continue; }
        if (ch === 'x') { S.c[y][x] = CHEST; continue; }
        if (ch === 'a') { S.c[y][x] = CAGE; continue; }
        if (ch >= '1' && ch <= '6') { S.c[y][x] = Math.min(S.nc - 1, ch.charCodeAt(0) - 49); continue; }
        if (ch === 'o') S.ice[y][x] = 1;
        else if (ch === 'j') S.jl[y][x] = 1;
        else if (ch === 'J') S.jl[y][x] = 2;
        S.rr[y][x] = true; S.c[y][x] = (S.rand() * S.nc) | 0;
      }
    }
    for (let x = 0; x < w; x++) {
      let t = -1, b = -1;
      for (let y = 0; y < h; y++) if (!S.bl[y][x]) { if (t < 0) t = y; else if (y !== b + 1) S.bad = (S.bad || []).concat('columna ' + x + ' partida'); b = y; }
      S.top[x] = t; S.bot[x] = b;
    }
    let ic = 0, jc = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (S.ice[y][x]) ic++; jc += S.jl[y][x]; }
    S.obj = (lv.o || []).map(function (o) { return { t: o.t, v: o.v || 0, n: o.t === 'ice' ? ic : o.t === 'jelly' ? jc : o.n, got: 0 }; });
    /* el tablero no puede empezar con combinaciones hechas: se vuelven a tirar las gemas libres */
    for (let i = 0; i < 400; i++) {
      const cp = comps(S); if (!cp.length) break; let any = false;
      for (let a = 0; a < cp.length; a++) for (let b = 0; b < cp[a].cells.length; b++) {
        const idx = cp[a].cells[b], y = (idx / w) | 0, x = idx % w;
        if (S.rr[y][x]) { S.c[y][x] = (S.rand() * S.nc) | 0; any = true; }
      }
      if (!any) break;
    }
    let guard = 0; while (!hasMove(S) && guard++ < 200) shuffle(S);
    return S;
  }

  /* ---------- combinaciones ---------- */
  function lines(S) {
    const out = [];
    for (let y = 0; y < S.h; y++) { let x = 0; while (x < S.w) { const v = S.c[y][x]; if (!isGem(v)) { x++; continue; } let e = x; while (e + 1 < S.w && S.c[y][e + 1] === v) e++; if (e - x + 1 >= 3) out.push({ d: 0, y: y, a: x, b: e, v: v }); x = e + 1; } }
    for (let x = 0; x < S.w; x++) { let y = 0; while (y < S.h) { const v = S.c[y][x]; if (!isGem(v)) { y++; continue; } let e = y; while (e + 1 < S.h && S.c[e + 1][x] === v) e++; if (e - y + 1 >= 3) out.push({ d: 1, x: x, a: y, b: e, v: v }); y = e + 1; } }
    return out;
  }
  function comps(S) {
    const L = lines(S); if (!L.length) return [];
    const sets = L.map(function (l) { const a = []; if (l.d === 0) { for (let i = l.a; i <= l.b; i++) a.push(l.y * S.w + i); } else { for (let i = l.a; i <= l.b; i++) a.push(i * S.w + l.x); } return a; });
    const par = L.map(function (_, i) { return i; });
    const find = function (i) { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      if (L[i].v !== L[j].v) continue;
      let hit = false; for (let a = 0; a < sets[i].length && !hit; a++) if (sets[j].indexOf(sets[i][a]) >= 0) hit = true;
      if (hit) par[find(i)] = find(j);
    }
    const map = {};
    for (let i = 0; i < L.length; i++) { const r = find(i); (map[r] = map[r] || []).push(i); }
    const out = [];
    for (const r in map) {
      const ls = map[r], cs = {}; let hz = false, vt = false, ml = 0, bl = null;
      for (let q = 0; q < ls.length; q++) { const l = L[ls[q]]; if (l.d === 0) hz = true; else vt = true; const n = l.b - l.a + 1; if (n > ml) { ml = n; bl = l; } for (let a = 0; a < sets[ls[q]].length; a++) cs[sets[ls[q]][a]] = 1; }
      const cells = Object.keys(cs).map(Number);
      let sp = NONE;
      if (hz && vt) sp = BOMB; else if (ml >= 5) sp = WSP; else if (ml === 4) sp = (bl.d === 0 ? RH : RV);
      out.push({ cells: cells, sp: sp, v: L[ls[0]].v, mid: bl.d === 0 ? bl.y * S.w + ((bl.a + bl.b) >> 1) : ((bl.a + bl.b) >> 1) * S.w + bl.x });
    }
    return out;
  }
  function topColor(S) {
    const n = []; for (let i = 0; i < S.nc; i++) n.push(0);
    for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) if (isGem(S.c[y][x])) n[S.c[y][x]]++;
    let bi = 0; for (let i = 1; i < S.nc; i++) if (n[i] > n[bi]) bi = i; return bi;
  }
  function blast(S, x, y, sp, col) {
    const out = [], put = function (X, Y) { if (X >= 0 && Y >= 0 && X < S.w && Y < S.h && !S.bl[Y][X]) out.push(Y * S.w + X); };
    if (sp === RH) { for (let i = 0; i < S.w; i++) put(i, y); }
    else if (sp === RV) { for (let i = 0; i < S.h; i++) put(x, i); }
    else if (sp === BOMB) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(x + dx, y + dy); }
    else if (sp === WSP) { const t = col == null ? topColor(S) : col; for (let Y = 0; Y < S.h; Y++) for (let X = 0; X < S.w; X++) if (S.c[Y][X] === t) put(X, Y); }
    return out;
  }
  /* cierre de la cadena: cada especial que se limpia arrastra su explosión */
  function collect(S, seeds) {
    const seen = {}, st = seeds.slice(), out = [];
    while (st.length) {
      const i = st.pop(); if (seen[i]) continue;
      const y = (i / S.w) | 0, x = i % S.w;
      if (y < 0 || y >= S.h || x < 0 || x >= S.w || S.bl[y][x]) continue;
      const v = S.c[y][x];
      if (v === EMPTY || v === CHEST) continue;      /* el cofre aguanta la explosión */
      seen[i] = 1; out.push(i);
      const sp = S.sp[y][x];
      if (sp) { const b = blast(S, x, y, sp, isGem(v) ? v : null); for (let q = 0; q < b.length; q++) if (!seen[b[q]]) st.push(b[q]); }
    }
    return out;
  }
  function apply(S, cells, spawns) {
    S.combo++;
    const ev = { t: 'clear', cells: cells.slice(), spawns: spawns || [], freed: [], ice: [], jelly: [], pts: 0, combo: S.combo, big: false };
    const cage = {};
    for (let q = 0; q < cells.length; q++) {
      const i = cells[q], y = (i / S.w) | 0, x = i % S.w, v = S.c[y][x];
      if (v === CAGE) { cage[i] = 1; continue; }
      if (S.ice[y][x] > 0) { S.ice[y][x]--; ev.ice.push(i); bump(S, 'ice'); }
      if (S.jl[y][x] > 0) { S.jl[y][x]--; ev.jelly.push(i); bump(S, 'jelly'); }
      if (isGem(v)) bumpColor(S, v);
      if (S.sp[y][x]) ev.big = true;
      S.c[y][x] = EMPTY; S.sp[y][x] = NONE;
    }
    for (let q = 0; q < cells.length; q++) {
      const i = cells[q], y = (i / S.w) | 0, x = i % S.w;
      if (x > 0 && S.c[y][x - 1] === CAGE) cage[y * S.w + x - 1] = 1;
      if (x + 1 < S.w && S.c[y][x + 1] === CAGE) cage[y * S.w + x + 1] = 1;
      if (y > 0 && S.c[y - 1][x] === CAGE) cage[(y - 1) * S.w + x] = 1;
      if (y + 1 < S.h && S.c[y + 1][x] === CAGE) cage[(y + 1) * S.w + x] = 1;
    }
    for (const i in cage) { const q = +i, y = (q / S.w) | 0, x = q % S.w; S.c[y][x] = EMPTY; S.sp[y][x] = NONE; ev.freed.push(q); bump(S, 'animal'); }
    for (let q = 0; q < ev.spawns.length; q++) { const s = ev.spawns[q]; S.c[s.y][s.x] = s.sp === WSP ? WILD : s.v; S.sp[s.y][s.x] = s.sp; }
    ev.pts = (cells.length + ev.freed.length * 3) * 10 * S.combo;
    S.score += ev.pts; bumpScore(S);
    return ev;
  }
  function chests(S) {
    const out = [];
    for (let x = 0; x < S.w; x++) { const y = S.bot[x]; if (y >= 0 && S.c[y][x] === CHEST) { S.c[y][x] = EMPTY; out.push(y * S.w + x); bump(S, 'chest'); S.score += 300; bumpScore(S); } }
    return out;
  }
  function fall(S) {
    let moved = false;
    for (let x = 0; x < S.w; x++) {
      const t = S.top[x], b = S.bot[x]; if (t < 0) continue;
      let wr = b;
      for (let y = b; y >= t; y--) {
        const v = S.c[y][x]; if (v === EMPTY) continue;
        if (wr !== y) { S.c[wr][x] = v; S.sp[wr][x] = S.sp[y][x]; S.c[y][x] = EMPTY; S.sp[y][x] = NONE; moved = true; }
        wr--;
      }
      for (let y = wr; y >= t; y--) { S.c[y][x] = (S.rand() * S.nc) | 0; S.sp[y][x] = NONE; moved = true; }
    }
    return moved;
  }
  const swapc = (S, x1, y1, x2, y2) => { const v = S.c[y1][x1], p = S.sp[y1][x1]; S.c[y1][x1] = S.c[y2][x2]; S.sp[y1][x1] = S.sp[y2][x2]; S.c[y2][x2] = v; S.sp[y2][x2] = p; };
  const movable = (S, x, y) => !S.bl[y][x] && (isGem(S.c[y][x]) || S.c[y][x] === WILD);
  function valid(S, x1, y1, x2, y2) {
    if (x1 < 0 || y1 < 0 || x2 < 0 || y2 < 0 || x1 >= S.w || x2 >= S.w || y1 >= S.h || y2 >= S.h) return false;
    if (Math.abs(x1 - x2) + Math.abs(y1 - y2) !== 1) return false;
    if (!movable(S, x1, y1) || !movable(S, x2, y2)) return false;
    const a = S.sp[y1][x1], b = S.sp[y2][x2];
    if (a === WSP || b === WSP) return true;
    if (a && b) return true;
    swapc(S, x1, y1, x2, y2); const ok = comps(S).length > 0; swapc(S, x1, y1, x2, y2); return ok;
  }
  function findMove(S) {
    for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) {
      if (x + 1 < S.w && valid(S, x, y, x + 1, y)) return [x, y, x + 1, y];
      if (y + 1 < S.h && valid(S, x, y, x, y + 1)) return [x, y, x, y + 1];
    }
    return null;
  }
  const hasMove = (S) => !!findMove(S);
  function moves(S) {
    const out = [];
    for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) {
      if (x + 1 < S.w && valid(S, x, y, x + 1, y)) out.push([x, y, x + 1, y]);
      if (y + 1 < S.h && valid(S, x, y, x, y + 1)) out.push([x, y, x, y + 1]);
    }
    return out;
  }
  function shuffle(S) {
    const pool = [], pos = [];
    for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) if (isGem(S.c[y][x]) && !S.sp[y][x]) { pool.push(S.c[y][x]); pos.push([x, y]); }
    if (pool.length < 3) return false;
    for (let t = 0; t < 80; t++) {
      for (let i = pool.length - 1; i > 0; i--) { const j = (S.rand() * (i + 1)) | 0, q = pool[i]; pool[i] = pool[j]; pool[j] = q; }
      for (let i = 0; i < pos.length; i++) S.c[pos[i][1]][pos[i][0]] = pool[i];
      if (!comps(S).length && hasMove(S)) return true;
    }
    return false;
  }
  /* jugada del jugador: devuelve null si no vale, {t:'swap'} normal o {t:'fusion'} */
  function doSwap(S, x1, y1, x2, y2) {
    if (!valid(S, x1, y1, x2, y2)) return null;
    const a = S.sp[y1][x1], b = S.sp[y2][x2];
    S.mv--;
    const seeds = [], put = function (X, Y) { if (X >= 0 && Y >= 0 && X < S.w && Y < S.h && !S.bl[Y][X]) seeds.push(Y * S.w + X); };
    if (a === WSP || b === WSP) {
      const wx = a === WSP ? x1 : x2, wy = a === WSP ? y1 : y2, ox = a === WSP ? x2 : x1, oy = a === WSP ? y2 : y1;
      const osp = S.sp[oy][ox], ov = S.c[oy][ox];
      S.sp[wy][wx] = NONE; seeds.push(wy * S.w + wx);
      if (osp === WSP) { S.sp[oy][ox] = NONE; for (let Y = 0; Y < S.h; Y++) for (let X = 0; X < S.w; X++) put(X, Y); }
      else if (osp) { S.sp[oy][ox] = NONE; put(ox, oy); for (let Y = 0; Y < S.h; Y++) for (let X = 0; X < S.w; X++) if (S.c[Y][X] === ov && S.sp[Y][X] === NONE) { S.sp[Y][X] = osp === BOMB ? BOMB : (S.rand() < 0.5 ? RH : RV); put(X, Y); } }
      else { put(ox, oy); for (let Y = 0; Y < S.h; Y++) for (let X = 0; X < S.w; X++) if (S.c[Y][X] === ov) put(X, Y); }
      S.forced = seeds; S.last = null; return { t: 'fusion' };
    }
    if (a && b) {
      S.sp[y1][x1] = NONE; S.sp[y2][x2] = NONE;
      if (a === BOMB && b === BOMB) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) put(x2 + dx, y2 + dy); }
      else if (a === BOMB || b === BOMB) { for (let i = -1; i <= 1; i++) { for (let X = 0; X < S.w; X++) put(X, y2 + i); for (let Y = 0; Y < S.h; Y++) put(x2 + i, Y); } }
      else { for (let X = 0; X < S.w; X++) put(X, y2); for (let Y = 0; Y < S.h; Y++) put(x2, Y); }
      put(x1, y1); put(x2, y2);
      S.forced = seeds; S.last = null; return { t: 'fusion' };
    }
    swapc(S, x1, y1, x2, y2);
    S.last = [y1 * S.w + x1, y2 * S.w + x2];
    return { t: 'swap' };
  }
  /* un paso atómico del tablero: match3.js lo anima, el simulador lo encadena */
  function step(S) {
    if (S.forced) { const sd = S.forced; S.forced = null; const ev = apply(S, collect(S, sd), S.fspawn || []); S.fspawn = null; return ev; }
    const ch = chests(S); if (ch.length) return { t: 'chest', cells: ch };
    const cp = comps(S);
    if (cp.length) {
      const seeds = [], spawns = [];
      for (let q = 0; q < cp.length; q++) {
        const co = cp[q];
        for (let i = 0; i < co.cells.length; i++) seeds.push(co.cells[i]);
        if (co.sp) {
          let pos = -1;
          if (S.last) for (let i = 0; i < co.cells.length; i++) if (co.cells[i] === S.last[0] || co.cells[i] === S.last[1]) { pos = co.cells[i]; break; }
          if (pos < 0) pos = co.mid;
          spawns.push({ x: pos % S.w, y: (pos / S.w) | 0, sp: co.sp, v: co.v });
        }
      }
      return apply(S, collect(S, seeds), spawns);
    }
    if (fall(S)) return { t: 'fall' };
    S.combo = 0; S.last = null;
    if (done(S)) { S.won = true; return { t: 'win' }; }
    if (S.mv <= 0) { S.lost = true; return { t: 'lose' }; }
    if (!hasMove(S)) { shuffle(S); return { t: 'shuffle' }; }
    return { t: 'idle' };
  }
  function settle(S, cap) {
    let n = 0; for (;;) { const e = step(S); if (e.t === 'idle' || e.t === 'win' || e.t === 'lose') return e; if (++n > (cap || 4000)) return { t: 'idle' }; }
  }
  const stars = (S) => (S.score >= S.st[2] ? 3 : S.score >= S.st[1] ? 2 : 1);

  return {
    EMPTY: EMPTY, CHEST: CHEST, CAGE: CAGE, WILD: WILD,
    NONE: NONE, RH: RH, RV: RV, BOMB: BOMB, WSP: WSP,
    isGem: isGem, rng: rng, make: make, step: step, settle: settle, doSwap: doSwap,
    valid: valid, moves: moves, findMove: findMove, hasMove: hasMove, comps: comps,
    shuffle: shuffle, done: done, stars: stars, topColor: topColor, fall: fall, chests: chests
  };
})();
/* </LV> ---------------------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------------------------
   Los 20 tableros. Orden pensado por curva: cada uno enseña una idea y ninguno pide dos cosas
   nuevas a la vez. Los movimientos están ajustados con el simulador (cientos de partidas por
   nivel en Node con un jugador heurístico). */
const SWAPLV = {
  'jewel-swap': [
    /* ---- 1-3: lo básico. Tres en raya, dos encargos, el rayo. ---- */
    { n: 'Primeras gemas', i: 'Intercambia dos gemas vecinas para alinear tres del mismo color.', mv: 15, cols: 5,
      o: [{ t: 'color', v: 0, n: 10 }], st: [0, 800, 1300], g: [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......'] },
    { n: 'Dos encargos', i: 'A veces te piden dos colores: mira siempre los dos contadores.', mv: 20, cols: 5,
      o: [{ t: 'color', v: 0, n: 14 }, { t: 'color', v: 2, n: 14 }], st: [0, 1500, 1900], g: [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......'] },
    { n: 'El rayo', i: 'Cuatro en línea crean un RAYO: al estallar limpia su fila o su columna entera.', mv: 18, cols: 5,
      o: [{ t: 'color', v: 3, n: 24 }], st: [0, 2700, 3500], g: [
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
        '........'] },
    /* ---- 4-5: hielo. ---- */
    { n: 'Escarcha', i: 'El HIELO se rompe cuando combinas una gema encima. Hay que romperlo todo.', mv: 15, cols: 5,
      o: [{ t: 'ice' }], st: [0, 600, 1200], g: [
        '.......',
        '.......',
        '..ooo..',
        '..ooo..',
        '..ooo..',
        '.......',
        '.......'] },
    { n: 'Placa helada', i: 'El rayo rompe el hielo de una fila entera: guárdalo para donde más cunde.', mv: 22, cols: 5,
      o: [{ t: 'ice' }], st: [0, 1800, 2600], g: [
        '........',
        '........',
        'oooooooo',
        'oooooooo',
        '........',
        '........',
        '........',
        '........'] },
    /* ---- 6: bomba. ---- */
    { n: 'La bomba', i: 'Una combinación en L o en T deja una BOMBA que revienta las ocho casillas de al lado.', mv: 20, cols: 5,
      o: [{ t: 'color', v: 1, n: 30 }], st: [0, 2900, 4300], g: [
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
        '........'] },
    /* ---- 7-8: cofres. ---- */
    { n: 'Cofres', i: 'Los COFRES no se combinan: vacía lo que tienen debajo para que bajen al suelo.', mv: 26, cols: 5,
      o: [{ t: 'chest', n: 2 }], st: [0, 3500, 7500], g: [
        '........',
        '........',
        '..x..x..',
        '........',
        '........',
        '........',
        '........',
        '........'] },
    { n: 'Cofres en la nieve', i: 'Dos encargos a la vez: baja los cofres sin olvidarte del hielo.', mv: 34, cols: 5,
      o: [{ t: 'chest', n: 2 }, { t: 'ice' }], st: [0, 4700, 7100], g: [
        '........',
        '........',
        '.x..x..x',
        'oooooooo',
        '........',
        'oooooooo',
        '........',
        '........'] },
    /* ---- 9: comodín. ---- */
    { n: 'El comodín', i: 'Cinco en línea dan un COMODÍN: cámbialo por una gema y se van todas las de ese color.', mv: 22, cols: 5,
      o: [{ t: 'color', v: 2, n: 34 }], st: [0, 3800, 4600], g: [
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........'] },
    /* ---- 10-11: gelatina. ---- */
    { n: 'Gelatina', i: 'La GELATINA se quita combinando encima. Una capa, un toque.', mv: 22, cols: 5,
      o: [{ t: 'jelly' }], st: [0, 1500, 2100], g: [
        '.......',
        '.jjjjj.',
        '.j...j.',
        '.j...j.',
        '.j...j.',
        '.jjjjj.',
        '.......'] },
    { n: 'Gelatina doble', i: 'La gelatina oscura tiene DOS capas: hay que combinar dos veces encima.', mv: 28, cols: 5,
      o: [{ t: 'jelly' }], st: [0, 2600, 4000], g: [
        '........',
        '........',
        '..JJJJ..',
        '..JJJJ..',
        '..JJJJ..',
        '..JJJJ..',
        '........',
        '........'] },
    /* ---- 12-13: animalillos. ---- */
    { n: 'Animalillos', i: 'Las JAULAS se abren con una combinación justo al lado (o con un especial).', mv: 18, cols: 5,
      o: [{ t: 'animal', n: 2 }], st: [0, 400, 750], g: [
        '........',
        '........',
        '........',
        '..a..a..',
        '........',
        '........',
        '........',
        '........'] },
    { n: 'Rescate helado', i: 'Las jaulas también caen. Rompe el hielo y libera a los cuatro.', mv: 28, cols: 5,
      o: [{ t: 'animal', n: 4 }, { t: 'ice' }], st: [0, 1400, 2300], g: [
        '........',
        '..a..a..',
        '........',
        '.oo..oo.',
        '.oo..oo.',
        '........',
        '..a..a..',
        '........'] },
    /* ---- 14-19: tableros con forma. ---- */
    { n: 'La copa', i: 'El tablero ya no es un cuadrado: mira por dónde puede caer cada cosa.', mv: 36, cols: 5,
      o: [{ t: 'chest', n: 2 }], st: [0, 5300, 8200], g: [
        '.........',
        '.........',
        '...x.x...',
        '.........',
        '.........',
        '##.....##',
        '##.....##',
        '###...###'] },
    { n: 'La cruz', i: 'En los brazos entran pocas gemas: los especiales valen doble aquí.', mv: 38, cols: 5,
      o: [{ t: 'jelly' }], st: [0, 2800, 4400], g: [
        '###...###',
        '###...###',
        '###...###',
        'jjjJJJjjj',
        'jjjJJJjjj',
        'jjjJJJjjj',
        '###...###',
        '###...###',
        '###...###'] },
    { n: 'El pozo', i: 'Los cofres del cuello tienen que bajar hasta el fondo del pozo.', mv: 40, cols: 5,
      o: [{ t: 'chest', n: 3 }, { t: 'color', v: 0, n: 16 }], st: [0, 4800, 7000], g: [
        '###xxx###',
        '###...###',
        '##.....##',
        '##.....##',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........'] },
    { n: 'El panal', i: 'Hielo hasta en los rincones y dos jaulas: reparte bien los movimientos.', mv: 58, cols: 6,
      o: [{ t: 'ice' }, { t: 'animal', n: 2 }], st: [0, 5100, 7800], g: [
        '##ooooo##',
        '#o.....o#',
        'o...a...o',
        'o.......o',
        'o.......o',
        'o.......o',
        'o...a...o',
        '#o.....o#',
        '##ooooo##'] },
    { n: 'La bóveda', i: 'El techo se estrecha: arriba caben menos gemas, así que el trabajo se hace abajo.', mv: 34, cols: 5,
      o: [{ t: 'jelly' }, { t: 'chest', n: 2 }], st: [0, 3600, 6100], g: [
        '###...###',
        '##.....##',
        '#.......#',
        '..x...x..',
        '.........',
        '.........',
        '.jjjjjjj.',
        '.jjjjjjj.'] },
    { n: 'Todo a la vez', i: 'Hielo, gelatina y jaulas en el mismo tablero. Busca jugadas que sirvan para dos cosas.', mv: 44, cols: 6,
      o: [{ t: 'animal', n: 3 }, { t: 'jelly' }, { t: 'ice' }], st: [0, 4000, 5700], g: [
        '.........',
        '.ooooooo.',
        '.oJJJJJo.',
        '.oJ.a.Jo.',
        '.oJ...Jo.',
        '.oJ.a.Jo.',
        '.oJJJJJo.',
        '.ooooooo.',
        '...a.....'] },
    /* ---- 20: el remate. ---- */
    { n: 'El corazón del prisma', i: 'El último: cofres, gelatina doble, hielo y animalillos a la vez. Guarda los comodines para el final.', mv: 70, cols: 6,
      o: [{ t: 'chest', n: 2 }, { t: 'animal', n: 4 }, { t: 'jelly' }, { t: 'ice' }], st: [0, 6300, 9700], g: [
        '##.....##',
        '#.......#',
        '..x...x..',
        '.ooooooo.',
        '.oJJJJJo.',
        '.oJaaaJo.',
        '.ooooooo.',
        '#a.....a#',
        '##.....##'] }
  ]
};
/* Node (simulador y comprobaciones) */
if (typeof module !== 'undefined' && module.exports) module.exports = { M3: M3, SWAPLV: SWAPLV };
