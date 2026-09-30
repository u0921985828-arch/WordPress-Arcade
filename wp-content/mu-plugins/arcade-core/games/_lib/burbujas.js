/* Burbujas y fusión (arte propio con ART, contorno #1a1530).
 * CFG.mode:
 *   'arcoiris' (Burbujas Arcoíris): lanzador sobre rejilla hexagonal, rebote en las paredes, racimos de 3+ que estallan,
 *                                   burbujas sueltas que caen y techo que baja cada varios disparos.
 *   'fruta'    (Fusión de Frutas):  gravedad hacia abajo en un tarro; dos frutas iguales se funden en la siguiente.
 *   'solar'    (Fusión Solar):      lo mismo con gravedad radial hacia el sol dentro de un anillo orbital.
 * Física de fusión: pasos fijos de 1/120 s, corrección posicional con relajación e impulsos amortiguados, velocidad
 * limitada y posición recortada dentro del recipiente en cada paso → ningún cuerpo puede salirse ni ganar energía. */
const OUT = ART.OUT, TAU = 6.2832, MODE = CFG.mode || 'arcoiris', ID = CFG.id || 'burbujas';
/* Niveles a mano: solo Burbujas Arcoíris (burblv.js). Los dos juegos de fusión no los miran. */
const HAND = (MODE === 'arcoiris' && typeof BURBLV !== 'undefined' && BURBLV[ID]) || null;
const W = 360, H = 640;
/* Solo Burbujas Arcoíris usa lienzo fluido: llena la pantalla y la columna de juego (360×640)
   se centra dentro, así la dificultad es idéntica en todos los tamaños. Los dos juegos de fusión
   siguen en la caja centrada de siempre. */
const k = Kit({ w: W, h: H, title: CFG.title, bg: MODE === 'solar' ? '#0c0a1f' : MODE === 'fruta' ? '#241a3d' : '#1b1436',
  fluid: MODE === 'arcoiris' ? { min: 0.42, max: 2.7 } : false }), c = k.ctx;
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
function celm(g, parts, dx, dy) { for (let i = 0; i < parts.length; i++) celp(g, [parts[i]], parts[i][1], dx, dy); }
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.7 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); g.fill(); }
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const R2 = (q) => { const x = Math.sin(q * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* <BU> ===== Reglas puras de Burbujas Arcoíris =========================================
 * Esta zona no toca el lienzo, ni kit.js, ni ART: recibe un estado S y devuelve QUÉ ha
 * pasado (listas de casillas), y el motor se encarga de pintarlo. La usa tal cual
 * scripts/check_burblv.js para jugar los 20 niveles en Node, así que las reglas del juego
 * y las del verificador son literalmente el mismo código.
 *
 * Casillas:  n normal · i hielo (dos tríos) · c atrapada · r arcoíris · b bomba
 *            s piedra · o objeto que hay que bajar · t tesoro (bajarlo también, cuenta
 *            para la maestría) · k cerrojo (solo lo abren racimos de 5+) · j jefe.
 * Estado S:  { G, par, cols, freed, dropped, treas, combos, drops, bossHp, bossMax }
 */
const BU = (function () {
  const R = 19, RS = 33, COLS = 9, X0 = (360 - COLS * 2 * R) / 2, TOP = 84, H = 640;
  const LINE = H - 104, LX = 360 / 2, LY = H - 56;
  const POP = { n: 1, i: 1, c: 1, r: 1, b: 1 };      // lo que cuenta como burbuja viva
  const MATCH = { n: 1, i: 1, c: 1 };                // lo que tiene color propio
  const FALLS = { n: 1, i: 1, c: 1, r: 1, b: 1, s: 1, o: 1, t: 1, k: 1 };  // el jefe no cae

  function mkCell(ch) {
    let d = '123456'.indexOf(ch); if (d >= 0) return { c: d, t: 'n', pop: 1 };
    d = 'abcdef'.indexOf(ch); if (d >= 0) return { c: d, t: 'i', pop: 1 };
    d = 'ABCDEF'.indexOf(ch); if (d >= 0) return { c: d, t: 'c', pop: 1 };
    if (ch === '#') return { c: -1, t: 's', pop: 1 };
    if (ch === '?') return { c: -1, t: 'r', pop: 1 };
    if (ch === '*') return { c: -1, t: 'b', pop: 1 };
    if (ch === 'o') return { c: -1, t: 'o', pop: 1 };
    if (ch === '+') return { c: -1, t: 't', pop: 1 };
    if (ch === 'L') return { c: -1, t: 'k', hp: 1, pop: 1 };
    if (ch === 'J') return { c: -1, t: 'j', hp: 1, pop: 1 };
    return null;
  }
  const rowPar = (S, r) => (r + S.par) & 1;
  const rowLen = (S, r) => (rowPar(S, r) ? COLS - 1 : COLS);
  const cellX = (S, r, i) => X0 + R + i * 2 * R + (rowPar(S, r) ? R : 0);
  const cellY = (r) => TOP + R + r * RS;
  const at = (S, r, i) => (S.G[r] && S.G[r][i]) || null;
  const same = (cell, col) => !!cell && (cell.t === 'r' || (MATCH[cell.t] && cell.c === col));

  function neighbors(S, r, i) {
    const out = [], odd = rowPar(S, r), G = S.G;
    const add = (rr, ii) => { if (rr >= 0 && rr < G.length && ii >= 0 && ii < G[rr].length) out.push(rr, ii); };
    add(r, i - 1); add(r, i + 1);
    add(r - 1, odd ? i : i - 1); add(r - 1, odd ? i + 1 : i);
    add(r + 1, odd ? i : i - 1); add(r + 1, odd ? i + 1 : i);
    return out;
  }
  /* Racimo conectado. col == null → todo lo que toque (se usa para medir la sujeción). */
  function cluster(S, r, i, col) {
    const seen = new Set([r + ',' + i]), q = [r, i], out = [[r, i]];
    while (q.length) {
      const b = q.pop(), a = q.pop(), nb = neighbors(S, a, b);
      for (let n = 0; n < nb.length; n += 2) {
        const x = nb[n], y = nb[n + 1], key = x + ',' + y, cell = at(S, x, y);
        if (cell && !seen.has(key) && (col == null || same(cell, col))) { seen.add(key); q.push(x, y); out.push([x, y]); }
      }
    }
    return out;
  }
  function ensureRows(S, r) { while (S.G.length <= r) { const n = S.G.length; S.G.push(new Array(rowLen(S, n)).fill(null)); } }
  function trimRows(S) {
    while (S.G.length > 1) {
      const row = S.G[S.G.length - 1]; let e = 1;
      for (let i = 0; i < row.length; i++) if (row[i]) { e = 0; break; }
      if (!e) break; S.G.pop();
    }
  }
  /* Casilla libre más cercana al punto de contacto (pegada a algo, o en la primera fila). */
  function snapTo(S, x, y) {
    let best = null, bd = 1e9; const lim = S.G.length;
    for (let r = 0; r <= lim; r++) {
      ensureRows(S, r);
      for (let i = 0; i < S.G[r].length; i++) {
        if (S.G[r][i]) continue;
        if (r > 0) { const nb = neighbors(S, r, i); let ok = 0; for (let n = 0; n < nb.length; n += 2) if (at(S, nb[n], nb[n + 1])) { ok = 1; break; } if (!ok) continue; }
        const d = (cellX(S, r, i) - x) ** 2 + (cellY(r) - y) ** 2;
        if (d < bd) { bd = d; best = [r, i]; }
      }
    }
    return best;
  }
  /* Trayectoria: misma física que el disparo del motor (rebote en las dos paredes). */
  function trace(S, ang, slide, step) {
    const occ = [];
    for (let r = 0; r < S.G.length; r++) for (let i = 0; i < S.G[r].length; i++) if (S.G[r][i]) occ.push(cellX(S, r, i), cellY(r) - slide);
    return traceOcc(S, ang, slide, step, occ);
  }
  function occOf(S, slide) {
    const occ = [];
    for (let r = 0; r < S.G.length; r++) for (let i = 0; i < S.G[r].length; i++) if (S.G[r][i]) occ.push(cellX(S, r, i), cellY(r) - slide);
    return occ;
  }
  function traceOcc(S, ang, slide, step, occ) {
    const RR = (2 * R - 4) ** 2, st = step || 4;
    let x = LX, y = LY - 22, vx = Math.sin(ang), vy = -Math.cos(ang);
    for (let s = 0; s < 1400; s++) {
      x += vx * st; y += vy * st;
      if (x < X0 + R) { x = X0 + R; vx = Math.abs(vx); }
      if (x > 360 - X0 - R) { x = 360 - X0 - R; vx = -Math.abs(vx); }
      let hit = y - R <= TOP - 2;
      if (!hit) for (let q = 0; q < occ.length; q += 2) { const dx = occ[q] - x, dy = occ[q + 1] - y; if (dx * dx + dy * dy < RR) { hit = true; break; } }
      if (hit) return snapTo(S, x, y + slide);
      if (y < -60) return null;
    }
    return null;
  }
  /* Quita una casilla y apunta lo que valga para el objetivo. */
  function rm(S, r, i, out) {
    const cell = S.G[r][i]; if (!cell) return null;
    S.G[r][i] = null;
    if (cell.t === 'c') S.freed++;
    if (cell.t === 'o') S.dropped++;
    if (cell.t === 't') S.treas++;
    if (out) out.push({ r, i, cell });
    return cell;
  }
  /* Todo lo que se queda sin sujeción cae (el jefe ancla igual que el techo). */
  function detach(S) {
    const keep = new Set(), G = S.G;
    for (let i = 0; i < (G[0] || []).length; i++) if (G[0][i]) for (const [a, b] of cluster(S, 0, i, null)) keep.add(a + ',' + b);
    for (let r = 0; r < G.length; r++) for (let i = 0; i < G[r].length; i++) if (G[r][i] && G[r][i].t === 'j') for (const [a, b] of cluster(S, r, i, null)) keep.add(a + ',' + b);
    const loose = [];
    for (let r = 0; r < G.length; r++) for (let i = 0; i < G[r].length; i++) if (G[r][i] && !keep.has(r + ',' + i) && FALLS[G[r][i].t]) loose.push([r, i]);
    loose.sort((p, q) => p[0] - q[0]);
    const out = [];
    for (const [r, i] of loose) rm(S, r, i, out);
    return out;
  }
  /* Bombas: cualquiera pegada a algo que acaba de estallar revienta a sus seis vecinas. */
  function blast(S, seeds) {
    const q = [], done = new Set(), out = [];
    for (const [a, b] of seeds) { const cell = at(S, a, b); if (cell && cell.t === 'b') q.push([a, b]); }
    while (q.length) {
      const [a, b] = q.pop(), key = a + ',' + b;
      if (done.has(key)) continue; done.add(key);
      const cell = at(S, a, b); if (!cell || cell.t !== 'b') continue;
      rm(S, a, b, out);
      const nb = neighbors(S, a, b);
      for (let n = 0; n < nb.length; n += 2) {
        const x = nb[n], y = nb[n + 1], q2 = at(S, x, y); if (!q2) continue;
        if (q2.t === 'b') { q.push([x, y]); continue; }
        if (q2.t === 'j') { hitBoss(S, 3, out); continue; }
        if (q2.t === 'k') { hitLock(S, x, y, 2, out); continue; }
        if (q2.t === 't' || q2.t === 'o') continue;          // el objeto y el tesoro hay que bajarlos
        rm(S, x, y, out);
      }
    }
    return out;
  }
  /* Cerrojo: solo lo abren los racimos grandes (5+) y las bombas. */
  function hitLock(S, r, i, dmg, out) {
    const cell = at(S, r, i); if (!cell || cell.t !== 'k') return 0;
    cell.hp -= dmg;
    if (cell.hp <= 0) { rm(S, r, i, out); return 1; }
    return 0;
  }
  function hitBoss(S, dmg, out) {
    if (S.bossHp <= 0) return 0;
    S.bossHp = Math.max(0, S.bossHp - dmg);
    if (S.bossHp === 0) {
      for (let r = 0; r < S.G.length; r++) for (let i = 0; i < S.G[r].length; i++) if (S.G[r][i] && S.G[r][i].t === 'j') rm(S, r, i, out);
    }
    return dmg;
  }
  /* Reventar el racimo de la casilla (r,i) del color col. Devuelve el parte completo. */
  function popAt(S, r, i, col) {
    const cl = cluster(S, r, i, col);
    const rep = { clen: cl.length, iced: [], dead: [], boom: [], loose: [], locks: 0, bossDmg: 0, big: 0 };
    if (cl.length < 3) return rep;
    const dead = [];
    for (const [a, b] of cl) {
      const cell = S.G[a][b];
      if (cell.t === 'i') { cell.t = 'n'; cell.pop = 0.25; rep.iced.push([a, b]); continue; }
      dead.push([a, b]);
    }
    for (const [a, b] of dead) rm(S, a, b, rep.dead);
    const big = cl.length >= 5;
    if (big) { S.combos++; rep.big = 1; }
    const seen = new Set();
    for (const [a, b] of dead) {
      const nb = neighbors(S, a, b);
      for (let n = 0; n < nb.length; n += 2) {
        const x = nb[n], y = nb[n + 1], key = x + ',' + y; if (seen.has(key)) continue; seen.add(key);
        const q2 = at(S, x, y); if (!q2) continue;
        if (q2.t === 'b') { const o = blast(S, [[x, y]]); for (const z of o) rep.boom.push(z); }
        else if (q2.t === 'j') rep.bossDmg += hitBoss(S, 1, rep.dead);
        else if (q2.t === 'k' && big) rep.locks += hitLock(S, x, y, 1, rep.dead);
      }
    }
    rep.loose = detach(S);
    return rep;
  }
  /* Aterrizaje de un disparo ya colocado en (r,i). put = { c, t } ('n' | 'r' | 'b'). */
  function land(S, r, i, put) {
    ensureRows(S, r);
    if (put.t === 'b') {
      S.G[r][i] = { c: -1, t: 'b', pop: 1 };
      const rep = { clen: 0, iced: [], dead: [], boom: blast(S, [[r, i]]), loose: [], locks: 0, bossDmg: 0, big: 0, bomb: 1 };
      rep.loose = detach(S);
      trimRows(S);
      return rep;
    }
    let col = put.c;
    S.G[r][i] = { c: col, t: put.t === 'r' ? 'r' : 'n', pop: 0 };
    if (put.t === 'r') { col = rbColor(S, r, i); if (col < 0) col = 0; }
    const rep = popAt(S, r, i, col);
    rep.col = col;
    trimRows(S);
    return rep;
  }
  /* Color efectivo de un arcoíris: el del racimo vecino más grande. */
  function rbColor(S, r, i) {
    let best = -1, bn = 0; const nb = neighbors(S, r, i);
    for (let n = 0; n < nb.length; n += 2) {
      const q = at(S, nb[n], nb[n + 1]); if (!q || !MATCH[q.t]) continue;
      const cn = cluster(S, nb[n], nb[n + 1], q.c).length;
      if (cn > bn) { bn = cn; best = q.c; }
    }
    return best;
  }
  /* El techo baja una fila. rnd() debe devolver 0..1. */
  function push(S, rnd) {
    S.drops++; S.par ^= 1;
    const a = [];
    for (let i = 0; i < rowLen(S, 0); i++) a.push({ c: Math.min(S.cols - 1, Math.floor(rnd() * S.cols)), t: 'n', pop: 0 });
    S.G.unshift(a);
    return a;
  }
  function left(S) { let n = 0; for (let r = 0; r < S.G.length; r++) for (let i = 0; i < S.G[r].length; i++) { const q = S.G[r][i]; if (q && POP[q.t]) n++; } return n; }
  function crossed(S, slide) {
    for (let r = 0; r < S.G.length; r++) for (let i = 0; i < S.G[r].length; i++) if (S.G[r][i] && cellY(r) + R - slide > LINE) return true;
    return false;
  }
  /* Cuántas casillas cuentan para «limpiar» y cuántos tesoros hay en el mapa. */
  function totals(L) {
    let tot = 0, tre = 0;
    for (const row of L.m) for (const ch of row) {
      if ('123456abcdefABCDEF?*'.indexOf(ch) >= 0) tot++;
      if (ch === '+') tre++;
    }
    return { tot, tre };
  }
  function load(L, cols, boss) {
    const S = { G: [], par: 0, cols, freed: 0, dropped: 0, treas: 0, combos: 0, drops: 0, bossHp: 0, bossMax: 0 };
    const bhp = boss || L.boss || 0;
    for (let r = 0; r < L.m.length; r++) {
      const row = [];
      for (let q = 0; q < rowLen(S, r); q++) row.push(mkCell(L.m[r][q] || '.'));
      S.G.push(row);
    }
    if (bhp) { S.bossHp = S.bossMax = bhp; for (let r = 0; r < S.G.length; r++) for (let i = 0; i < S.G[r].length; i++) if (S.G[r][i] && S.G[r][i].t === 'j') S.G[r][i].hp = bhp; }
    return S;
  }
  function goalHave(S, L) {
    const g = L.goal;
    if (g === 'drop') return S.dropped;
    if (g === 'rescue') return S.freed;
    if (g === 'hold') return S.drops;
    if (g === 'combo') return S.combos;
    if (g === 'boss') return (S.bossMax - S.bossHp);
    return 0;
  }
  function goalNeed(S, L) {
    const g = L.goal;
    if (g === 'clear') return 0;
    if (g === 'boss') return S.bossMax;
    return S.need != null ? S.need : (L.need || 0);
  }
  function goalDone(S, L) { return L.goal === 'clear' ? left(S) === 0 : goalHave(S, L) >= goalNeed(S, L); }
  /* Colores vivos en el tablero: en los niveles a mano SIEMPRE se dispara uno de ellos, así
     ningún objetivo se vuelve imposible por mala suerte. */
  function liveColors(S) {
    const live = [];
    for (let r = 0; r < S.G.length; r++) for (let i = 0; i < S.G[r].length; i++) { const q = S.G[r][i]; if (q && MATCH[q.t] && live.indexOf(q.c) < 0) live.push(q.c); }
    return live;
  }
  const GEO = { R, RS, COLS, X0, TOP, LINE, LX, LY, H };
  return { GEO, POP, MATCH, mkCell, rowPar, rowLen, cellX, cellY, at, same, neighbors, cluster, ensureRows, trimRows,
    snapTo, trace, traceOcc, occOf, rm, detach, blast, popAt, land, rbColor, push, left, crossed, totals, load,
    goalHave, goalNeed, goalDone, liveColors, hitLock, hitBoss };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = { BU };
/* </BU> ============================================================================== */

if (MODE === 'arcoiris') arcoiris(); else fusion();

/* ===================================================================== Burbujas Arcoíris ===== */
function arcoiris() {
  /* Lienzo fluido: la columna de juego mide siempre 360×640 (misma dificultad en todas las
     pantallas) y se centra en (OX,OY); lo que sobra se llena de decorado y marcador. */
  const R = BU.GEO.R, RS = BU.GEO.RS, COLS = BU.GEO.COLS, X0 = BU.GEO.X0, TOP = BU.GEO.TOP, LINE = BU.GEO.LINE, LX = BU.GEO.LX, LY = BU.GEO.LY;
  const FLOORY = LINE + 34;                               // donde revientan las burbujas que caen
  let OX = 0, OY = 0, SIDE = 0, UP = 0;
  /* UP: si la pantalla es mas alta que la caja, el HUD estrecho sube al margen libre y deja
     de pisar el remate del techo; sin margen se queda donde estaba. */
  function relayout() { OX = Math.round(k.ox); OY = Math.round(k.oy); const m = (k.W - W) / 2; SIDE = m >= 148 ? Math.min(206, m - 10) : 0; UP = Math.round(Math.min(26, Math.max(0, (k.H - H) / 2 - 6))); }
  k.onSize = relayout; relayout();

  const COL = [
    { c: '#ff6fb5', s: 'star' }, { c: '#5b8cff', s: 'dot' }, { c: '#a8cf3f', s: 'leaf' },
    { c: '#ffc94d', s: 'ring' }, { c: '#a097ff', s: 'tri' }, { c: '#ff7a59', s: 'cross' },
  ];
  /* Tipos de casilla: 'n' normal · 'i' hielo (dos tríos) · 'c' atrapada · 's' piedra ·
     'r' arcoíris (comodín) · 'b' bomba · 'o' objeto que hay que bajar. */
  const POPPABLE = BU.POP;
  let S = null, G = null, ang, cur, next, shot, shots, score, over, slide, fallers, t, msg, msgT, sprite = [];
  let LV = null, ammo = 0, ammo0 = 0, need = 0, won = 0, lvCols = 3, lvPush = 0, tip = null, tipT = 0;
  let lvSec = 0, lvTre = 0, lvMast = 0, lifeUsed = 0, secT = 0, secWarn = 0;
  let chain = 0, mult = 1, pops = [], flo = [], gridV = 0, aimC = null, aimA = 1e9, aimV = -1, aimS = -1;
  let par2 = 0, par3 = 0, stars = 0, warn = 0, fireT = 0, mood = 0, moodT = 0, flashT = 0, flashC = '#fff';
  let winStage = 0, winT = 0, winQ = [], bonus = 0, swapT = 0;
  const lp = { x: LX, y: LY };
  /* Toda la rejilla vive en el bloque puro <BU>: aquí solo quedan atajos de lectura. */
  const rowPar = (r) => BU.rowPar(S, r);
  const rowLen = (r) => BU.rowLen(S, r);
  const cellX = (r, i) => BU.cellX(S, r, i);
  const cellY = BU.cellY;

  /* ---------- textos flotantes propios (los de kit.js se recortan a la caja de referencia,
     que en modo fluido no coincide con la pantalla) ---------- */
  function fl(txt, x, y, col, s) { if (flo.length < 40) flo.push({ txt: String(txt), x: x + OX, y: y + OY, col: col || '#fff', t: 0.95, s: s || 18 }); }
  function flash(col, dur) { flashC = col; flashT = dur || 0.2; }

  const SS = R * 2 + 8;
  for (let i = 0; i < COL.length; i++) sprite.push(bubbleSprite(COL[i]));
  const spIce = COL.map((cc, i) => coat(sprite[i], 'i'));
  const spCap = COL.map((cc, i) => coat(sprite[i], 'c'));
  const spStone = plainSprite('s'), spRb = plainSprite('r'), spBomb = plainSprite('b'), spObj = plainSprite('o');
  const spTre = plainSprite('t'), spLock = plainSprite('k1'), spBoss = plainSprite('j');
  function bubbleSprite(cc) {
    const S = SS;
    return off(S, S, (g) => {
      g.translate(S / 2, S / 2);
      contact(g, 0, R * 0.86, R * 0.78, R * 0.22, 0.28);
      const parts = [[(h) => { h.moveTo(R - 1, 0); h.arc(0, 0, R - 1, 0, TAU); }, cc.c]];
      uni(g, parts, 1.5);
      celp(g, parts, cc.c, R * 0.42, R * 0.42);
      spec(g, -R * 0.34, -R * 0.4, R * 0.3, R * 0.19, -0.6, 0.72);
      spec(g, R * 0.36, R * 0.3, R * 0.15, R * 0.1, 0.5, 0.3);
      // símbolo interior (también distingue los colores sin depender del tono)
      g.fillStyle = ART.dark(cc.c, 0.55); g.strokeStyle = ART.dark(cc.c, 0.55); g.lineWidth = 2.6; g.lineCap = 'round';
      const s = cc.s;
      if (s === 'star') { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -1.5708 + i * TAU / 10, rr = i % 2 ? 3 : 7.5; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr + 1); } g.closePath(); g.fill(); }
      else if (s === 'dot') { g.beginPath(); g.arc(0, 1, 5, 0, TAU); g.fill(); }
      else if (s === 'leaf') { g.beginPath(); g.moveTo(0, -7); g.quadraticCurveTo(7, -1, 0, 8); g.quadraticCurveTo(-7, -1, 0, -7); g.fill(); }
      else if (s === 'ring') { g.beginPath(); g.arc(0, 1, 5.5, 0, TAU); g.stroke(); }
      else if (s === 'tri') { g.beginPath(); g.moveTo(0, -6.5); g.lineTo(6.5, 5); g.lineTo(-6.5, 5); g.closePath(); g.fill(); }
      else { g.beginPath(); g.moveTo(-5, -5); g.lineTo(5, 5); g.moveTo(5, -5); g.lineTo(-5, 5); g.stroke(); }
    });
  }
  /* Capa sobre una burbuja ya dibujada: hielo (cristal) o jaula de la atrapada. */
  function coat(base, kind) {
    const S = SS;
    return off(S, S, (g) => {
      g.drawImage(base, 0, 0, S, S); g.translate(S / 2, S / 2);
      if (kind === 'i') {
        g.beginPath(); g.arc(0, 0, R - 1, 0, TAU); g.fillStyle = 'rgba(196,234,255,.58)'; g.fill();
        g.lineWidth = 2.6; g.strokeStyle = 'rgba(232,248,255,.9)'; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.55)';
        g.beginPath(); g.moveTo(-R * 0.6, -R * 0.2); g.lineTo(-R * 0.1, -R * 0.7); g.lineTo(R * 0.15, -R * 0.4); g.lineTo(-R * 0.35, R * 0.15); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(R * 0.15, R * 0.1); g.lineTo(R * 0.6, -R * 0.15); g.lineTo(R * 0.45, R * 0.45); g.closePath(); g.fill();
      } else {
        g.lineWidth = 3.4; g.strokeStyle = ART.OUT; g.beginPath(); g.arc(0, 0, R - 2.4, 0, TAU); g.stroke();
        g.lineWidth = 2.2; g.strokeStyle = '#ffd166'; g.beginPath(); g.arc(0, 0, R - 2.4, 0, TAU); g.stroke();
        g.fillStyle = '#ffd166';
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.beginPath(); g.arc(Math.cos(a) * (R - 2.4), Math.sin(a) * (R - 2.4), 2.4, 0, TAU); g.fill(); }
      }
    });
  }
  /* Piezas sin color propio: piedra, arcoíris, bomba y objeto. Todas de una sola silueta (R5 §8). */
  function plainSprite(kind) {
    const S = SS;
    return off(S, S, (g) => {
      g.translate(S / 2, S / 2);
      contact(g, 0, R * 0.86, R * 0.78, R * 0.22, 0.28);
      if (kind === 's') {
        const parts = [[(h) => { h.moveTo(R - 1, 0); for (let i = 1; i <= 8; i++) { const a = i * TAU / 8, rr = (R - 1) * (0.9 + 0.1 * ((i * 5) % 3)); h.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } h.closePath(); }, '#8f89b5']];
        uni(g, parts, 1.6); celp(g, parts, '#8f89b5', R * 0.4, R * 0.4);
        g.strokeStyle = 'rgba(30,22,60,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-R * 0.4, -R * 0.1); g.lineTo(0, R * 0.25); g.lineTo(R * 0.45, -R * 0.05); g.stroke();
        spec(g, -R * 0.32, -R * 0.42, R * 0.24, R * 0.14, -0.6, 0.45);
      } else if (kind === 'r') {
        const parts = [[(h) => { h.moveTo(R - 1, 0); h.arc(0, 0, R - 1, 0, TAU); }, '#fff']];
        uni(g, parts, 1.6);
        inpath(g, parts, (h) => {
          for (let i = 0; i < 6; i++) { h.fillStyle = COL[i].c; h.beginPath(); h.moveTo(0, 0); h.arc(0, 0, R, i * TAU / 6 - 1.5708, (i + 1) * TAU / 6 - 1.5708); h.closePath(); h.fill(); }
          h.fillStyle = 'rgba(255,255,255,.3)'; h.beginPath(); h.arc(0, 0, R * 0.42, 0, TAU); h.fill();
        });
        spec(g, -R * 0.34, -R * 0.4, R * 0.28, R * 0.17, -0.6, 0.72);
      } else if (kind === 'b') {
        const parts = [
          [(h) => { h.moveTo(R * 0.16, -R * 0.94); h.quadraticCurveTo(R * 0.62, -R * 1.14, R * 0.58, -R * 0.62); }, '#ffb36b'],
          [(h) => { h.moveTo(R - 1, 0); h.arc(0, 0, R - 1, 0, TAU); }, '#3b3163'],
        ];
        uni(g, parts, 1.6); celp(g, [parts[1]], '#3b3163', R * 0.4, R * 0.4);
        g.fillStyle = '#ffd166';
        g.beginPath(); for (let i = 0; i < 8; i++) { const a = -1.5708 + i * TAU / 8, rr = i % 2 ? R * 0.2 : R * 0.52; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
        spec(g, -R * 0.36, -R * 0.42, R * 0.24, R * 0.14, -0.6, 0.5);
      } else if (kind === 't') {
        /* Tesoro: cristal facetado de una sola silueta; las caras se marcan por tono (§8). */
        const u = R * 0.72, C0 = '#7cf7ff';
        const parts = [[(h) => { h.moveTo(0, -u * 1.24); h.lineTo(u * 0.92, -u * 0.34); h.lineTo(u * 0.56, u * 1.16); h.lineTo(-u * 0.56, u * 1.16); h.lineTo(-u * 0.92, -u * 0.34); h.closePath(); }, C0]];
        uni(g, parts, 1.7);
        inpath(g, parts, (h) => {
          h.fillStyle = ART.dark(C0, 0.34); h.beginPath(); h.moveTo(0, -u * 1.3); h.lineTo(u, -u * 0.3); h.lineTo(u * 0.6, u * 1.2); h.lineTo(0, u * 1.2); h.closePath(); h.fill();
          h.fillStyle = ART.lite(C0, 0.4); h.beginPath(); h.moveTo(0, -u * 1.3); h.lineTo(-u, -u * 0.3); h.lineTo(-u * 0.2, -u * 0.1); h.closePath(); h.fill();
          h.fillStyle = ART.dark(C0, 0.18); h.beginPath(); h.moveTo(-u, -u * 0.3); h.lineTo(-u * 0.6, u * 1.2); h.lineTo(0, u * 1.2); h.lineTo(-u * 0.2, -u * 0.1); h.closePath(); h.fill();
        });
        spec(g, -u * 0.34, -u * 0.5, u * 0.26, u * 0.15, -0.6, 0.85);
      } else if (kind === 'k1') {
        /* Cerrojo: candado de una pieza (arco + cuerpo en el mismo trazo). */
        const C0 = '#ff9a3d', u = R * 0.9;
        const parts = [[(h) => {
          h.moveTo(-u * 0.82, u * 0.92); h.lineTo(-u * 0.82, -u * 0.1);
          h.lineTo(-u * 0.52, -u * 0.1); h.arc(0, -u * 0.12, u * 0.52, Math.PI, 0); h.lineTo(u * 0.52, -u * 0.1);
          h.lineTo(u * 0.82, -u * 0.1); h.lineTo(u * 0.82, u * 0.92); h.closePath();
        }, C0]];
        uni(g, parts, 1.7); celp(g, parts, C0, u * 0.34, u * 0.34);
        inpath(g, parts, (h) => {
          h.fillStyle = ART.dark(C0, 0.62); h.beginPath(); h.arc(0, u * 0.36, u * 0.2, 0, TAU); h.fill();
          h.beginPath(); h.moveTo(-u * 0.09, u * 0.36); h.lineTo(u * 0.09, u * 0.36); h.lineTo(u * 0.05, u * 0.76); h.lineTo(-u * 0.05, u * 0.76); h.closePath(); h.fill();
          });
        spec(g, -u * 0.44, u * 0.14, u * 0.18, u * 0.1, -0.5, 0.45);
      } else if (kind === 'j') {
        /* Guardián del Prisma: silueta angular única con un ojo. */
        const C0 = '#ff5fa2', u = R * 0.98;
        const parts = [[(h) => {
          h.moveTo(0, -u); h.lineTo(u * 0.72, -u * 0.6); h.lineTo(u * 0.92, u * 0.2);
          h.lineTo(u * 0.4, u * 0.94); h.lineTo(-u * 0.4, u * 0.94); h.lineTo(-u * 0.92, u * 0.2);
          h.lineTo(-u * 0.72, -u * 0.6); h.closePath();
        }, C0]];
        uni(g, parts, 1.9); celp(g, parts, C0, u * 0.36, u * 0.36);
        inpath(g, parts, (h) => {
          h.fillStyle = '#1a1530'; h.beginPath(); h.ellipse(0, u * 0.02, u * 0.46, u * 0.33, 0, 0, TAU); h.fill();
          h.fillStyle = '#ffe9a8'; h.beginPath(); h.ellipse(0, u * 0.02, u * 0.26, u * 0.24, 0, 0, TAU); h.fill();
          h.fillStyle = '#1a1530'; h.beginPath(); h.ellipse(0, u * 0.02, u * 0.11, u * 0.2, 0, 0, TAU); h.fill();
        });
        spec(g, -u * 0.36, -u * 0.5, u * 0.22, u * 0.13, -0.6, 0.6);
      } else {
        const u = R * 0.62;
        const parts = [[(h) => { h.moveTo(0, -u * 1.5); h.lineTo(u * 1.25, -u * 0.72); h.lineTo(u * 1.25, u * 0.72); h.lineTo(0, u * 1.5); h.lineTo(-u * 1.25, u * 0.72); h.lineTo(-u * 1.25, -u * 0.72); h.closePath(); }, '#ffc94d']];
        uni(g, parts, 1.7);
        inpath(g, parts, (h) => {
          h.fillStyle = ART.dark('#ffc94d', 0.3); h.beginPath(); h.moveTo(0, 0); h.lineTo(u * 1.3, -u * 0.75); h.lineTo(u * 1.3, u * 0.75); h.lineTo(0, u * 1.55); h.closePath(); h.fill();
          h.fillStyle = ART.lite('#ffc94d', 0.35); h.beginPath(); h.moveTo(0, 0); h.lineTo(0, -u * 1.55); h.lineTo(-u * 1.3, -u * 0.75); h.closePath(); h.fill();
        });
        spec(g, -u * 0.5, -u * 0.62, u * 0.3, u * 0.17, -0.6, 0.7);
      }
    });
  }
  /* ---------- decorado ---------- */
  /* Telón de fondo: se estira a la pantalla entera (color desaturado, jerarquía §B10). */
  const sky = off(180, 320, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, '#2a2056'); gr.addColorStop(0.55, '#1c1540'); gr.addColorStop(1, '#100c26');
    g.fillStyle = gr; g.fillRect(0, 0, 180, 320);
    g.fillStyle = 'rgba(160,151,255,.055)';
    for (let i = 0; i < 34; i++) { g.beginPath(); g.arc(R2(i) * 180, R2(i + 31) * 320, 3 + R2(i + 7) * 13, 0, TAU); g.fill(); }
  });
  /* Tubo de cristal: marco, brillo lateral y sombra interior. Una sola pieza (R5 §8). */
  const tube = off(W, H, (g) => {
    g.fillStyle = 'rgba(12,8,28,.42)'; ART.rr(g, 8, TOP - 14, W - 16, LINE - TOP + 24, 18); g.fill();
    ART.rr(g, 8, TOP - 14, W - 16, LINE - TOP + 24, 18); g.lineWidth = 5; g.strokeStyle = 'rgba(160,151,255,.4)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.07)'; ART.rr(g, 15, TOP - 4, 7, LINE - TOP + 4, 4); g.fill();
    g.fillStyle = 'rgba(255,255,255,.04)'; ART.rr(g, W - 25, TOP + 40, 5, LINE - TOP - 60, 3); g.fill();
  });
  /* Techo dentado: la barra que baja. Silueta única con dientes. */
  const ceil = off(W, 30, (g) => {
    g.beginPath(); g.moveTo(6, 0); g.lineTo(W - 6, 0); g.lineTo(W - 6, 13);
    for (let i = 0; i < 12; i++) { const x = W - 6 - (i + 0.5) * (W - 12) / 12; g.lineTo(x, 13 + (i % 2 ? 9 : 5)); g.lineTo(x - (W - 12) / 24, 13); }
    g.lineTo(6, 13); g.closePath();
    g.lineJoin = 'round'; g.lineWidth = 3.4; g.strokeStyle = ART.OUT; g.stroke();
    g.fillStyle = '#463ac4'; g.fill();
    g.save(); g.clip(); g.fillStyle = ART.lite('#463ac4', 0.34); g.fillRect(0, 0, W, 6); g.fillStyle = ART.dark('#463ac4', 0.3); g.fillRect(0, 12, W, 20); g.restore();
  });
  /* Burbujas del fondo (decorado que respira, §B9) */
  const amb = []; for (let i = 0; i < 12; i++) amb.push({ x: R2(i) * W, y: R2(i + 5) * H, r: 5 + R2(i + 11) * 16, v: 12 + R2(i + 17) * 22, a: 0.05 + R2(i + 23) * 0.06 });

  /* Dificultad: colores en juego y disparos antes de que baje el techo (partida sin fin). */
  function colorsNow() { return k.clamp(Math.min(COL.length, 3 + Math.floor(S.drops / 4)) + (k.dif === 0 ? -1 : k.dif === 2 ? 1 : 0), 3, COL.length); }
  const SH0 = () => Math.round(7 / k.D.rate);
  const palette = () => (HAND ? lvCols : colorsNow());
  function pickColor() {
    const pool = BU.liveColors(S);
    if (HAND) return pool.length ? k.pick(pool) : k.ri(0, lvCols - 1);
    return pool.length && Math.random() < 0.85 ? k.pick(pool) : k.ri(0, colorsNow() - 1);
  }
  /* Burbuja cargada: color normal o, en los niveles que lo permiten, bomba / arcoíris. */
  function pickShot() {
    const sp = (HAND && LV && LV.spec) || null;
    if (sp) { const q = Math.random(); if (q < (sp.b || 0)) return { c: -1, t: 'b' }; if (q < (sp.b || 0) + (sp.r || 0)) return { c: -1, t: 'r' }; }
    return { c: pickColor(), t: 'n' };
  }
  function common() {
    score = 0; over = 0; slide = 0; fallers = []; pops = []; flo = []; t = 0;
    msg = ''; msgT = 0; shot = null; ang = 0; chain = 0; mult = 1; gridV++; aimV = -1; warn = 0; fireT = 0;
    mood = 0; moodT = 0; flashT = 0; winStage = 0; winT = 0; winQ = []; bonus = 0; stars = 0; swapT = 0;
    lifeUsed = 0; secT = 0; secWarn = 0;
    k.chainReset();
  }
  function reset() {
    if (HAND) return loadLevel(k.lv);
    LV = null; won = 0; tipT = 0; ammo = 0; ammo0 = 0; par2 = par3 = 0; lvSec = 0; lvTre = 0; lvMast = 0;
    S = { G: [], par: 0, cols: 3, freed: 0, dropped: 0, treas: 0, combos: 0, drops: 0, bossHp: 0, bossMax: 0 };
    G = S.G; common(); shots = SH0();
    S.cols = colorsNow();
    for (let r = 0; r < 5; r++) { S.G.push([]); for (let i = 0; i < rowLen(r); i++) S.G[r].push(r < 4 || Math.random() < 0.45 ? { c: k.ri(0, 2), t: 'n', pop: 1 } : null); }
    cur = pickShot(); next = pickShot();
  }
  /* ---------- Niveles a mano (solo burbujas-arcoiris) ---------- */
  /* La dificultad NO cambia la ruta: el mapa, el objetivo y las mecánicas son los mismos en
     las tres. Solo cambian los márgenes (tiros, colores, ritmo del techo y pares), y están
     escritos a mano nivel por nivel en burblv.js. */
  const D3 = (v, def) => (Array.isArray(v) ? v[k.dif] : (v == null ? def : v));
  function loadLevel(i) {
    LV = HAND[k.clamp(i | 0, 1, HAND.length) - 1];
    lvCols = k.clamp((LV.cols || 3) + (k.dif === 0 ? -1 : k.dif === 2 ? 1 : 0), 3, COL.length);
    lvPush = LV.push ? Math.max(3, D3(LV.push, 0)) : 0;
    lvSec = LV.sec ? Math.max(4, D3(LV.sec, 0)) : 0;
    ammo = ammo0 = Math.max(1, D3(LV.shots, 24));
    /* Estrellas: ★ superarlo · ★★ en ≤ par2 tiros · ★★★ en ≤ par3 tiros, con todos los
       tesoros bajados, los racimos grandes pedidos y sin gastar el salvavidas. */
    const pp = (LV.par && LV.par[k.dif]) || [Math.round(ammo * 0.8), Math.round(ammo * 0.6)];
    par2 = Math.max(1, pp[0]); par3 = Math.max(1, pp[1]);
    lvMast = LV.mast ? D3(LV.mast, 0) : 0;
    need = LV.need ? D3(LV.need, 0) : 0;
    S = BU.load(LV, lvCols, LV.boss ? D3(LV.boss, 0) : 0); S.need = need; G = S.G;
    lvTre = BU.totals(LV).tre;
    common(); shots = lvPush; secT = lvSec; won = 0;
    cur = pickShot(); next = pickShot();
    tip = LV.tip || ''; tipT = tip ? 4.8 : 0;
  }
  const used = () => ammo0 - ammo;
  const treasOK = () => S.treas >= lvTre;
  function starsNow() {
    if (used() > par2) return 1;
    return (used() <= par3 && !lifeUsed && treasOK() && S.combos >= lvMast) ? 3 : 2;
  }
  /* Qué le falta para las tres estrellas (se dice en el marcador, §A6). */
  function starHint() {
    if (used() > par2) return 'A por la siguiente';
    if (!treasOK()) return `Tesoros ${S.treas}/${lvTre}`;
    if (S.combos < lvMast) return `Racimos de 5: ${S.combos}/${lvMast}`;
    if (lifeUsed) return 'Salvavidas gastado';
    if (used() > par3) return `★★★ en ${par3} tiros`;
    return '¡Bordado!';
  }
  function goalText() {
    if (!LV) return '';
    if (LV.goal === 'drop') return 'Baja los objetos';
    if (LV.goal === 'rescue') return 'Rescata atrapadas';
    if (LV.goal === 'hold') return 'Aguanta el techo';
    if (LV.goal === 'combo') return 'Racimos de cinco';
    if (LV.goal === 'boss') return 'Rompe el Guardián';
    return 'Limpia el tubo';
  }
  function goalHave() { return !LV ? 0 : LV.goal === 'clear' ? (goalTot() - left()) : BU.goalHave(S, LV); }
  /* En «limpiar» el total crece si el tubo se llena más de lo que estaba: así la barra nunca
     retrocede por debajo de cero y siempre dice cuánto queda de verdad. */
  function goalTot() { return !LV ? 1 : LV.goal === 'clear' ? Math.max(LV._tot || 1, left()) : BU.goalNeed(S, LV); }
  function goalMiss() { return Math.max(0, goalTot() - goalHave()); }
  function missText() {
    if (!LV) return '';
    const m = goalMiss();
    if (LV.goal === 'drop') return `Te faltaba${m === 1 ? '' : 'n'} ${m} objeto${m === 1 ? '' : 's'}`;
    if (LV.goal === 'rescue') return `Te faltaba${m === 1 ? '' : 'n'} ${m} rescate${m === 1 ? '' : 's'}`;
    if (LV.goal === 'hold') return `Te faltaba${m === 1 ? '' : 'n'} ${m} bajada${m === 1 ? '' : 's'}`;
    if (LV.goal === 'combo') return `Te faltaba${m === 1 ? '' : 'n'} ${m} racimo${m === 1 ? '' : 's'}`;
    if (LV.goal === 'boss') return `Al Guardián le quedaba${S.bossHp === 1 ? '' : 'n'} ${S.bossHp} golpe${S.bossHp === 1 ? '' : 's'}`;
    const q = left();
    return `Te quedaba${q === 1 ? '' : 'n'} ${q} burbuja${q === 1 ? '' : 's'}`;
  }
  const left = () => BU.left(S);
  const goalDone = () => (LV ? BU.goalDone(S, LV) : false);
  const neighbors = (r, i) => { const nb = BU.neighbors(S, r, i), out = []; for (let n = 0; n < nb.length; n += 2) out.push([nb[n], nb[n + 1]]); return out; };
  const at = (r, i) => BU.at(S, r, i);
  const same = BU.same;
  const ensureRows = (r) => BU.ensureRows(S, r);
  const trimRows = () => BU.trimRows(S);
  const snapTo = (x, y) => BU.snapTo(S, x, y);
  const cluster = (r, i, col) => BU.cluster(S, r, i, col);
  const cellCol = (cell) => (cell.c >= 0 ? COL[cell.c].c : cell.t === 'b' ? '#ffd166' : cell.t === 'o' ? '#ffc94d' : cell.t === 't' ? '#7cf7ff' : cell.t === 'k' ? '#ff9a3d' : cell.t === 'j' ? '#ff5fa2' : '#cdd3ef');
  /* ---------- efectos de un parte de BU (nada desaparece de golpe, §B8) ---------- */
  function fxCells(list, col, n, vel) {
    for (const q of list) {
      const x = cellX(q.r, q.i), y = cellY(q.r) - slide;
      if (pops.length < 90) pops.push({ x, y, cell: q.cell, t: 0 });
      k.burst(x + OX, y + OY, col || cellCol(q.cell), n || 7, vel || 130);
    }
    if (list.length) gridV++;
  }
  function fxFall(list) {
    for (let n = 0; n < list.length; n++) {
      const q = list[n];
      fallers.push({ x: cellX(q.r, q.i), y: cellY(q.r) - slide, vx: k.rnd(-50, 50), vy: -70 - Math.random() * 40, cell: q.cell, rot: 0, vr: k.rnd(-5, 5), d: n * 0.035, n: n + 1 });
    }
    if (list.length) gridV++;
  }
  /* Puntuación de un derrumbe: cada burbuja que cae vale más que la anterior. */
  const dropPts = (n) => 20 * Math.min(12, n);
  /* Remate común de un disparo que ha hecho algo: cadena, multiplicador, sacudida y cartel. */
  function reward(pts, cx, cy, clen, boom, drop, extra) {
    chain++; mult = Math.min(5, 1 + (chain >> 1));
    const tot = Math.round(pts * mult);
    score += tot;
    fl('+' + tot, cx, cy - 22, drop ? '#ffd166' : '#fff', drop ? 22 : 18);
    if (mult > 1) fl('x' + mult, cx + 26, cy - 44, mult >= 4 ? '#ff5fa2' : mult >= 3 ? '#ffd166' : '#7cf7a0', 16);
    k.chime();
    if (clen >= 5 || boom || drop >= 3) k.hitstop(0.04);
    if (drop >= 3 || boom >= 4) { k.punch(0.04 + Math.min(0.08, drop * 0.006)); k.shake(4 + Math.min(6, drop)); }
    if (extra) k.reward(extra[0], extra[1]);
    else if (drop >= 4) { k.reward('¡DERRUMBE x' + drop + '!', '#ffd166'); flash('rgba(255,220,120,.25)', 0.18); }
    else if (boom >= 5) k.reward('¡BOMBAZO!', '#ff9a3d');
    else if (clen >= 6) k.reward('¡RACIMO x' + clen + '!', '#7cf7a0');
    mood = 1; moodT = 0.9;
    return tot;
  }
  /* Traduce un parte del bloque puro en efectos y puntos. */
  function payRep(rep, r, i) {
    if (rep.clen && rep.clen < 3 && !rep.bomb) { k.sfx('click'); return 0; }
    for (const q of rep.iced) k.burst(cellX(q[0], q[1]) + OX, cellY(q[0]) - slide + OY, '#cfeeff', 6, 100);
    fxCells(rep.dead);
    fxCells(rep.boom, '#ffd166', 16, 220);
    if (rep.boom.length) k.shake(3);
    fxFall(rep.loose);
    const boom = rep.boom.length, drop = rep.loose.length;
    let extra = null;
    if (rep.bossDmg) extra = [S.bossHp ? 'GOLPE ' + (S.bossMax - S.bossHp) + '/' + S.bossMax : '¡GUARDIÁN ROTO!', '#ff5fa2'];
    else if (rep.locks) extra = ['¡CERROJO ABIERTO!', '#ff9a3d'];
    else if (rep.treas) extra = ['¡TESORO!', '#7cf7ff'];
    const pts = (rep.clen >= 3 ? rep.clen * 10 : 0) + boom * 15 + rep.bossDmg * 40 + rep.locks * 30;
    k.sfx(drop || boom ? 'explode' : 'pop');
    reward(pts, cellX(r, i), cellY(r) - slide, rep.clen, boom, drop, extra);
    return rep.clen || boom;
  }
  function popAt(r, i, col) {
    const t0 = S.treas, rep = BU.popAt(S, r, i, col);
    rep.treas = S.treas - t0;
    if (rep.clen < 3) { k.sfx('click'); return 0; }
    payRep(rep, r, i);
    return rep.clen;
  }
  function pushRow() {
    S.cols = palette();
    BU.push(S, Math.random); slide = RS; gridV++;
    shots = HAND ? lvPush : Math.max(Math.round(4 / k.D.rate), SH0() - Math.floor(S.drops / 3));
    secT = lvSec; secWarn = 0;
    k.sfx('hit'); k.shake(4); warn = 0;
    if (LV && LV.goal === 'hold') fl('Bajada ' + Math.min(S.drops, need) + '/' + need, LX, TOP + 40, '#ff6fb5', 20);
  }
  /* Salvavidas (desde el nivel 11): la primera vez que se acaban los tiros sin objetivo
     cumplido, regala unos cuantos. Deja las tres estrellas fuera de alcance. */
  function lifesaver() {
    if (lifeUsed || !HAND || k.lv < 11) return 0;
    lifeUsed = 1; const n = k.dif === 0 ? 7 : 5;
    ammo += n; ammo0 += n;
    msg = '¡Salvavidas! +' + n; msgT = 2.2;
    k.reward('¡SALVAVIDAS!', '#7cf7a0'); k.sfx('coin'); k.punch(0.05); flash('rgba(160,255,190,.2)', 0.22);
    return 1;
  }
  function dry() {
    if (lifesaver()) return;
    over = 1; msg = 'Sin disparos'; msgT = 2; k.sfx('lose'); mood = -1; moodT = 3;
  }
  function fire() {
    if (shot || over || won || k.st !== 'play') return;
    if (HAND && ammo <= 0) return;
    shot = { x: LX, y: LY - 22, vx: Math.sin(ang) * 660, vy: -Math.cos(ang) * 660, cell: cur };
    cur = next; next = pickShot(); if (HAND) ammo--;
    k.sfx('shoot'); fireT = 1; aimV = -1;
  }
  function stepShot(dt) {
    const steps = Math.ceil(Math.hypot(shot.vx, shot.vy) * dt / 5) || 1;
    for (let s = 0; s < steps && shot; s++) {
      shot.x += shot.vx * dt / steps; shot.y += shot.vy * dt / steps;
      if (shot.x < X0 + R) { shot.x = X0 + R; shot.vx = Math.abs(shot.vx); k.sfx('click'); k.burst(shot.x + OX, shot.y + OY, '#a097ff', 4, 80); }
      if (shot.x > W - X0 - R) { shot.x = W - X0 - R; shot.vx = -Math.abs(shot.vx); k.sfx('click'); k.burst(shot.x + OX, shot.y + OY, '#a097ff', 4, 80); }
      let hit = shot.y - R <= TOP - 2;
      if (!hit) for (let r = 0; r < S.G.length && !hit; r++) for (let i = 0; i < S.G[r].length; i++) {
        if (!S.G[r][i]) continue;
        const dx = cellX(r, i) - shot.x, dy = cellY(r) - slide - shot.y;
        if (dx * dx + dy * dy < (2 * R - 4) ** 2) { hit = true; break; }
      }
      if (hit) land();
    }
  }
  const rbColor = (r, i) => BU.rbColor(S, r, i);
  function land() {
    const cell = snapTo(shot.x, shot.y + slide), put = shot.cell; shot = null;
    if (!cell) return;
    const [r, i] = cell; gridV++;
    const t0 = S.treas, rep = BU.land(S, r, i, put);
    rep.treas = S.treas - t0;
    if (rep.bomb) { k.shake(6); payRep(rep, r, i); }
    else if (rep.clen >= 3) payRep(rep, r, i);
    else {                                                // tiro desperdiciado: se pierde la cadena
      if (chain > 0) { chain = 0; mult = 1; k.chainReset(); }
      /* Consuelo: si al menos ha pegado con su color, algo se gana (§A2: nunca seis segundos
         sin recompensa). Es poco, para que no compense fallar. */
      let touch = 0;
      for (const [a, b] of neighbors(r, i)) if (same(at(a, b), rep.col)) touch++;
      if (touch) { score += 5; fl('+5', cellX(r, i), cellY(r) - slide - 18, 'rgba(255,255,255,.8)', 14); }
      k.sfx('click');
      if (!HAND && --shots <= 0) pushRow();
    }
    if (!HAND && (rep.clen >= 3 || rep.bomb)) shots = Math.max(shots, 1);
    if (HAND && lvPush && --shots <= 0) pushRow();
    if (HAND && goalDone()) { startWin(); return; }
    if (BU.crossed(S, slide)) over = 1;
    if (over) { k.sfx('hurt'); k.shake(9); mood = -1; moodT = 3; flash('rgba(255,90,140,.3)', 0.3); }
    else if (HAND && ammo <= 0 && !fallers.length) dry();
  }
  /* ---------- victoria: lluvia de lo que queda + bonus + estrellas (§B11) ---------- */
  function startWin() {
    won = 1; winStage = 1; winT = 0; winQ = []; stars = starsNow();
    for (let r = G.length - 1; r >= 0; r--) for (let i = 0; i < G[r].length; i++) if (G[r][i]) winQ.push([r, i]);
    bonus = Math.max(0, ammo) * 40;
    k.sfx('win'); k.reward('¡OBJETIVO!', '#7cf7a0'); flash('rgba(160,255,190,.22)', 0.25);
  }
  function stepWin(dt) {
    winT += dt;
    if (winStage === 1) {
      while (winQ.length && winT > 0.05) {
        winT -= 0.05; const [r, i] = winQ.pop(); const cell = G[r][i]; if (!cell) continue;
        G[r][i] = null;
        fallers.push({ x: cellX(r, i), y: cellY(r) - slide, vx: k.rnd(-70, 70), vy: -90, cell, rot: 0, vr: k.rnd(-6, 6), d: 0, n: 1 });
      }
      if (!winQ.length) { winStage = 2; winT = 0; }
    } else if (winStage === 2) {
      if (winT > 0.45 && !fallers.length) {
        winStage = 3; winT = 0;
        if (bonus) { score += bonus; fl('Bonus +' + bonus, LX, LINE - 90, '#ffd166', 24); k.sfx('coin'); }
      }
    } else if (winStage === 3 && winT > 0.8) {
      winStage = 4; k.best(ID, score);
      k.levelDone(score, `${goalText()} · ${score} puntos · ${used()} tiro${used() === 1 ? '' : 's'} usado${used() === 1 ? '' : 's'}${stars < 3 ? ` · ★★★ en ${par3}` : ''}`, { stars });
    }
  }
  /* ---------- puntería: trayectoria, burbuja fantasma y racimo que reventaría ---------- */
  function predict() {
    if (aimV === gridV && aimS === slide && Math.abs(aimA - ang) < 0.004) return aimC;
    aimA = ang; aimV = gridV; aimS = slide;
    const occ = [], RR = (2 * R - 4) ** 2, pts = [];
    for (let r = 0; r < G.length; r++) for (let i = 0; i < G[r].length; i++) if (G[r][i]) occ.push(cellX(r, i), cellY(r) - slide);
    let x = LX, y = LY - 22, vx = Math.sin(ang), vy = -Math.cos(ang), cell = null;
    pts.push(x, y);
    for (let s = 0; s < 900; s++) {
      x += vx * 5; y += vy * 5;
      if (x < X0 + R) { x = X0 + R; vx = -vx; pts.push(x, y); }
      else if (x > W - X0 - R) { x = W - X0 - R; vx = -vx; pts.push(x, y); }
      let hit = y - R <= TOP - 2;
      if (!hit) for (let q = 0; q < occ.length; q += 2) { const dx = occ[q] - x, dy = occ[q + 1] - y; if (dx * dx + dy * dy < RR) { hit = true; break; } }
      if (hit) { cell = snapTo(x, y + slide); break; }
      if (y < -60) break;
    }
    pts.push(x, y);
    let mark = null, n = 0;
    if (cell && cur && cur.t !== 'b') {
      const [r, i] = cell; ensureRows(r);
      const save = G[r][i];
      let col = cur.c;
      G[r][i] = { c: col, t: cur.t === 'r' ? 'r' : 'n', pop: 1 };
      if (cur.t === 'r') { const cc = rbColor(r, i); if (cc >= 0) col = cc; }
      const cl = cluster(r, i, col);
      if (cl.length >= 3) { mark = cl; n = cl.length; }
      G[r][i] = save;
    }
    trimRows();
    aimC = { pts, cell, mark, n };
    return aimC;
  }
  function update(dt) {
    t += dt;
    if (!k.gate(reset)) return;
    slide = Math.max(0, slide - dt * 90);
    for (let r = 0; r < G.length; r++) for (const cell of G[r]) if (cell) cell.pop = Math.min(1, cell.pop + dt * 5);
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt * 4.6; if (pops[i].t >= 1) { pops[i] = pops[pops.length - 1]; pops.pop(); } }
    for (let i = flo.length - 1; i >= 0; i--) { const f = flo[i]; f.t -= dt; f.y -= 36 * dt; if (f.t <= 0) { flo[i] = flo[flo.length - 1]; flo.pop(); } }
    flashT = Math.max(0, flashT - dt); moodT = Math.max(0, moodT - dt); if (!moodT) mood = 0;
    fireT = Math.max(0, fireT - dt * 3.4); swapT = Math.max(0, swapT - dt * 4);
    /* burbujas que caen: gravedad, rebote en las paredes y reventón al llegar al suelo */
    for (let i = fallers.length - 1; i >= 0; i--) {
      const f = fallers[i];
      if (f.d > 0) { f.d -= dt; continue; }
      f.vy += 1500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      if (f.x < X0 + R) { f.x = X0 + R; f.vx = Math.abs(f.vx) * 0.6; }
      if (f.x > W - X0 - R) { f.x = W - X0 - R; f.vx = -Math.abs(f.vx) * 0.6; }
      if (f.y >= FLOORY) {
        k.burst(f.x + OX, FLOORY + OY, cellCol(f.cell), 12, 190);
        if (pops.length < 90) pops.push({ x: f.x, y: FLOORY, cell: f.cell, t: 0 });
        if (!won) { const p = Math.round(dropPts(f.n) * mult); score += p; fl('+' + p, f.x, FLOORY - 16, '#ffd166', 16); }
        else { score += 30; }
        k.chime(); k.sfx('pop');
        fallers[i] = fallers[fallers.length - 1]; fallers.pop();
      }
    }
    msgT = Math.max(0, msgT - dt); tipT = Math.max(0, tipT - dt);
    if (won) { stepWin(dt); return; }
    if (over) {
      over += dt;
      if (over > 1.4) k.lose(ID, score, HAND ? (ammo <= 0 ? 'Sin disparos' : 'Se llenó el tubo') : 'Se llenó el tubo',
        HAND ? `${missText()} · nivel ${k.lv}/${HAND.length}` : `${S.drops} bajadas del techo`);
      return;
    }
    // puntería: ratón/dedo apuntan hacia el punto tocado; cruceta y flechas giran
    const p = k.ptr, px = p.x - OX, py = p.y - OY;
    if (p.x !== lp.x || p.y !== lp.y) { lp.x = p.x; lp.y = p.y; if (py < LY - 6) ang = k.clamp(Math.atan2(px - LX, LY - py), -1.34, 1.34); }
    if (k.held.has('left')) ang = k.clamp(ang - 2.1 * dt, -1.34, 1.34);
    if (k.held.has('right')) ang = k.clamp(ang + 2.1 * dt, -1.34, 1.34);
    if (k.hit.has('a') || k.hit.has('up') || (p.up && py < LY - 10)) fire();
    if (k.hit.has('b') || k.hit.has('down')) { const q = cur; cur = next; next = q; k.sfx('click'); swapT = 1; aimV = -1; }
    if (shot) stepShot(dt);
    if (HAND && lvPush && shots === 1 && warn === 0) { warn = 1; k.sfx('hurt'); fl('¡Baja el techo!', LX, TOP + 26, '#ff6fb5', 19); }
    /* Techo a reloj (desde el nivel 16): baja aunque no dispares. Presión de verdad. */
    if (HAND && lvSec && !shot) {
      secT -= dt;
      if (secT <= 2 && !secWarn) { secWarn = 1; k.sfx('hurt'); fl('¡Baja el techo!', LX, TOP + 26, '#ff6fb5', 19); }
      if (secT <= 0) pushRow();
    }
    if (HAND && ammo <= 0 && !shot && !fallers.length && !over) dry();
  }
  function cellSprite(cell) {
    if (cell.t === 't') return spTre;
    if (cell.t === 'k') return spLock;
    if (cell.t === 'j') return spBoss;
    if (cell.t === 'i') return spIce[cell.c];
    if (cell.t === 'c') return spCap[cell.c];
    if (cell.t === 's') return spStone;
    if (cell.t === 'r') return spRb;
    if (cell.t === 'b') return spBomb;
    if (cell.t === 'o') return spObj;
    return sprite[cell.c];
  }
  function drawCell(x, y, cell, s, rot) {
    const S = SS * (s == null ? 1 : s);
    if (rot) { c.save(); c.translate(x, y); c.rotate(rot); c.drawImage(cellSprite(cell), -S / 2, -S / 2, S, S); c.restore(); }
    else c.drawImage(cellSprite(cell), x - S / 2, y - S / 2, S, S);
  }
  /* ---------- el cañón: un bicho con cara que mira adonde apunta (§B12) ---------- */
  const body = off(70, 64, (g) => {
    g.translate(35, 40);
    contact(g, 0, 20, 26, 7, 0.34);
    const parts = [[(h) => {                       // una sola silueta: cuerpo + patas + orejas
      h.moveTo(-26, 4); h.quadraticCurveTo(-28, -18, -12, -22); h.quadraticCurveTo(-10, -34, -2, -25);
      h.quadraticCurveTo(0, -26, 2, -25); h.quadraticCurveTo(10, -34, 12, -22); h.quadraticCurveTo(28, -18, 26, 4);
      h.quadraticCurveTo(26, 22, 0, 22); h.quadraticCurveTo(-26, 22, -26, 4); h.closePath();
    }, '#6e62f5']];
    uni(g, parts, 1.7); celp(g, parts, '#6e62f5', 9, 9);
    spec(g, -12, -12, 8, 5, -0.6, 0.42);
  });
  const barrel = off(34, 52, (g) => {
    g.translate(17, 44);
    const parts = [[(h) => { h.moveTo(-11, 4); h.quadraticCurveTo(-13, -30, -8, -38); h.quadraticCurveTo(0, -42, 8, -38); h.quadraticCurveTo(13, -30, 11, 4); h.quadraticCurveTo(0, 9, -11, 4); h.closePath(); }, '#463ac4']];
    uni(g, parts, 1.7); celp(g, parts, '#463ac4', 6, 8);
    g.fillStyle = 'rgba(255,255,255,.22)'; ART.rr(g, -7, -34, 5, 30, 2.5); g.fill();
  });
  function face(x, y, look) {
    const ex = Math.sin(look) * 3.6, ey = -Math.cos(look) * 1.6 - 1;
    const blink = (t % 4.2) > 4.06 ? 0.15 : 1;
    for (const s of [-1, 1]) {
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x + s * 8.5, y - 4, 5.4, 6 * blink, 0, 0, TAU); c.fill();
      c.fillStyle = ART.OUT; c.beginPath(); c.ellipse(x + s * 8.5 + ex, y - 4 + ey, 2.7, 3 * blink, 0, 0, TAU); c.fill();
      if (mood < 0) { c.strokeStyle = ART.OUT; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + s * 13, y - 13); c.lineTo(x + s * 4.5, y - 10); c.stroke(); }
    }
    c.strokeStyle = ART.OUT; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath();
    if (mood > 0) { c.arc(x, y + 5, 5.5, 0.3, 2.84); }
    else if (mood < 0) { c.arc(x, y + 12, 5.5, 3.44, 6.0); }
    else { c.moveTo(x - 4, y + 7); c.lineTo(x + 4, y + 7); }
    c.stroke();
  }
  /* ---------- marcador ---------- */
  function bar(x, y, w2, h2, v, col) {
    ART.rr(c, x, y, w2, h2, h2 / 2); c.fillStyle = 'rgba(12,8,28,.55)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.18)'; c.stroke();
    const ww = Math.max(0, Math.min(1, v)) * (w2 - 4);
    if (ww > 1) { ART.rr(c, x + 2, y + 2, ww, h2 - 4, (h2 - 4) / 2); c.fillStyle = col; c.fill(); }
  }
  function starRow(x, y, n, s) {
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      for (let q = 0; q < 10; q++) { const a = -1.5708 + q * TAU / 10, rr = q % 2 ? s * 0.42 : s; const xx = x + i * s * 2.4 + Math.cos(a) * rr, yy = y + Math.sin(a) * rr; c[q ? 'lineTo' : 'moveTo'](xx, yy); }
      c.closePath(); c.lineWidth = 2.4; c.lineJoin = 'round'; c.strokeStyle = ART.OUT; c.stroke();
      c.fillStyle = i < n ? '#ffd166' : 'rgba(255,255,255,.16)'; c.fill();
    }
  }
  function panel(x, y, w2, h2) { ART.rr(c, x, y, w2, h2, 14); c.fillStyle = 'rgba(16,11,38,.72)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(160,151,255,.28)'; c.stroke(); }
  function hud() {
    if (!HAND) {
      label(String(score), OX + 14, OY + 10, 24, '#fff');
      label('Récord ' + Math.max(k.best(ID, 0), score), OX + 14, OY + 36, 11, 'rgba(255,255,255,.65)');
      label('Techo', OX + W - 14, OY + 10, 12, 'rgba(255,255,255,.7)', 'right');
      for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(OX + W - 14 - i * 12, OY + 34, 4, 0, TAU); ART.fillOut(c, i < shots ? '#a8cf3f' : 'rgba(255,255,255,.18)', 1.5); }
      return;
    }
    const st = starsNow(), hv = goalHave(), tt = goalTot();
    if (SIDE) {                                    // pantalla ancha: dos paneles a los lados
      const lw = SIDE - 8, lx = k.ex(10), rx = k.ex2(10 + lw);
      panel(lx, k.ey(14), lw, 150);
      label(`Nivel ${k.lv}/${HAND.length}`, lx + 14, k.ey(28), 20, '#fff');
      label(goalText(), lx + 14, k.ey(54), 14, '#a8cf3f');
      bar(lx + 14, k.ey(76), lw - 28, 13, tt ? hv / tt : 0, '#a8cf3f');
      label(`${Math.min(hv, tt)} de ${tt}`, lx + 14, k.ey(93), 13, 'rgba(255,255,255,.8)');
      starRow(lx + 24, k.ey(126), st, 10);
      label(starHint(), lx + 14, k.ey(140), 12, st < 3 ? 'rgba(255,255,255,.65)' : '#ffd166');
      panel(rx, k.ey(14), lw, 150);
      label(`${ammo}`, rx + 14, k.ey(26), 30, ammo <= 3 ? '#ff6fb5' : '#fff');
      label('tiros', rx + 14 + c.measureText(String(ammo)).width + 8, k.ey(42), 13, 'rgba(255,255,255,.7)');
      label(`Usados ${used()} · ★★ ${par2}`, rx + 14, k.ey(62), 12, used() <= par3 ? '#7cf7a0' : used() <= par2 ? '#ffd166' : 'rgba(255,255,255,.55)');
      label(`${score} puntos`, rx + 14, k.ey(82), 15, '#fff');
      if (mult > 1) label(`Cadena x${mult}`, rx + 14, k.ey(104), 15, mult >= 4 ? '#ff5fa2' : '#ffd166');
      if (lvSec) { label('Techo en ' + Math.max(0, Math.ceil(secT)) + ' s', rx + 14, k.ey(126), 13, secT <= 3 ? '#ff6fb5' : 'rgba(255,255,255,.75)'); bar(rx + 14, k.ey(144), lw - 28, 9, lvSec ? secT / lvSec : 0, secT <= 3 ? '#ff6fb5' : '#a097ff'); }
      else if (lvPush) { label('Techo', rx + 14, k.ey(126), 12, 'rgba(255,255,255,.6)'); for (let i = 0; i < Math.min(lvPush, 8); i++) { c.beginPath(); c.arc(rx + 22 + i * 13, k.ey(146), 4.6, 0, TAU); ART.fillOut(c, i < shots ? (shots === 1 ? '#ff6fb5' : '#a8cf3f') : 'rgba(255,255,255,.16)', 1.6); } }
      else label('Sin techo', rx + 14, k.ey(126), 12, 'rgba(255,255,255,.55)');
      return;
    }
    /* Pantalla estrecha: cuatro filas en la franja de 84 px sobre el tubo. El centro de arriba
       se deja libre: ahí pone el reproductor su botón de pausa cuando no cabe fuera. */
    const HY = OY - UP;
    label(`Nivel ${k.lv}/${HAND.length}`, OX + 12, HY + 3, 16, '#fff');
    label(`${ammo} tiro${ammo === 1 ? '' : 's'}`, OX + W - 12, HY + 2, 17, ammo <= 3 ? '#ff6fb5' : '#fff', 'right');
    label(goalText(), OX + 12, HY + 23, 12, '#a8cf3f');
    label(starHint(), OX + W - 12, HY + 24, 11, st < 3 ? 'rgba(255,255,255,.62)' : '#ffd166', 'right');
    bar(OX + 12, HY + 40, 112, 11, tt ? hv / tt : 0, '#a8cf3f');
    label(`${Math.min(hv, tt)}/${tt}`, OX + 128, HY + 40, 12, 'rgba(255,255,255,.85)');
    if (lvSec) label(Math.max(0, Math.ceil(secT)) + ' s', OX + W - 14, HY + 38, 15, secT <= 3 ? '#ff6fb5' : 'rgba(255,255,255,.8)', 'right');
    else if (lvPush) { for (let i = 0; i < Math.min(lvPush, 8); i++) { c.beginPath(); c.arc(OX + W - 16 - i * 12, HY + 45, 4, 0, TAU); ART.fillOut(c, i < shots ? (shots === 1 ? '#ff6fb5' : '#a8cf3f') : 'rgba(255,255,255,.16)', 1.5); } }
    label(`${score}`, OX + 12, HY + 58, 14, 'rgba(255,255,255,.8)');
    if (mult > 1) label(`Cadena x${mult}`, OX + 84, HY + 59, 13, mult >= 4 ? '#ff5fa2' : '#ffd166');
    starRow(OX + W - 58, HY + 64, st, 7.5);
  }
  function draw() {
    // fondo estirado a toda la pantalla + burbujas que suben (§B9)
    c.drawImage(sky, 0, 0, k.W, k.H);
    for (const a of amb) {
      a.y -= a.v * 0.016; if (a.y < -a.r) { a.y = k.H + a.r; a.x = Math.random() * k.W; }
      if (a.x > k.W) a.x = Math.random() * k.W;
      c.globalAlpha = a.a; c.fillStyle = '#a097ff'; c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill();
      c.globalAlpha = a.a * 1.6; c.beginPath(); c.arc(a.x - a.r * 0.3, a.y - a.r * 0.35, a.r * 0.24, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
    c.save(); c.translate(OX, OY);
    c.drawImage(tube, 0, 0, W, H);
    // línea de peligro
    c.save(); c.setLineDash([9, 7]); c.lineDashOffset = -t * 18; c.lineWidth = 2.5;
    const dg = !over && !won && nearLine();
    c.strokeStyle = dg ? `rgba(255,90,140,${0.65 + 0.3 * Math.sin(t * 9)})` : 'rgba(255,111,181,.55)';
    c.beginPath(); c.moveTo(12, LINE); c.lineTo(W - 12, LINE); c.stroke(); c.restore();
    // techo
    c.drawImage(ceil, 0, TOP - 24 - slide * 0.3, W, 30);
    // guía de puntería: trayectoria animada, burbuja fantasma y racimo que reventaría
    if (!shot && !over && !won && k.st === 'play' && (!HAND || ammo > 0)) {
      const a = predict();
      c.save(); c.setLineDash([7, 9]); c.lineDashOffset = -t * 60; c.lineWidth = 3; c.lineCap = 'round';
      c.strokeStyle = a.n >= 3 ? 'rgba(168,207,63,.85)' : 'rgba(255,255,255,.34)';
      c.beginPath(); c.moveTo(a.pts[0], a.pts[1]); for (let i = 2; i < a.pts.length; i += 2) c.lineTo(a.pts[i], a.pts[i + 1]); c.stroke(); c.restore();
      if (a.cell) {
        const gx = cellX(a.cell[0], a.cell[1]), gy = cellY(a.cell[0]) - slide;
        c.globalAlpha = 0.42; drawCell(gx, gy, cur, 0.9); c.globalAlpha = 1;
        c.lineWidth = 2.4; c.strokeStyle = a.n >= 3 ? '#a8cf3f' : 'rgba(255,255,255,.5)';
        c.beginPath(); c.arc(gx, gy, R + 2 + Math.sin(t * 6) * 1.6, 0, TAU); c.stroke();
      }
      if (a.mark && k.dif < 2) {
        c.lineWidth = 3; c.strokeStyle = `rgba(168,207,63,${0.5 + 0.35 * Math.sin(t * 7)})`;
        for (const [r, i] of a.mark) { const y = cellY(r) - slide; if (y < TOP - R) continue; c.beginPath(); c.arc(cellX(r, i), y, R + 1, 0, TAU); c.stroke(); }
        if (a.cell) label(String(a.n), cellX(a.cell[0], a.cell[1]), cellY(a.cell[0]) - slide - R - 20, 17, '#a8cf3f', 'center');
      }
    }
    c.save(); c.beginPath(); c.rect(0, TOP - 6, W, H - TOP + 6); c.clip();  // las filas nuevas salen de debajo del techo
    for (let r = 0; r < G.length; r++) for (let i = 0; i < G[r].length; i++) {
      const cell = G[r][i]; if (!cell) continue;
      const y = cellY(r) - slide; if (y < TOP - R) continue;
      drawCell(cellX(r, i), y, cell, cell.pop < 1 ? 0.55 + 0.6 * Math.sin(cell.pop * 2.1) : 1);
    }
    // reventones: escala 1 → 1,35 y se apagan (§B8)
    for (const p of pops) { c.globalAlpha = 1 - p.t; drawCell(p.x, p.y, p.cell, 1 + p.t * 0.35); }
    c.globalAlpha = 1;
    c.restore();
    /* Barra del Guardián: solo sale cuando está en el tubo (§A1 meta visible). */
    if (S.bossMax && S.bossHp > 0) {
      let bx = LX, by = TOP + 30;
      for (let r = 0; r < G.length; r++) for (let i = 0; i < G[r].length; i++) if (G[r][i] && G[r][i].t === 'j') { bx = cellX(r, i); by = cellY(r) - slide; }
      const wv = 74, yy = Math.max(TOP + 4, by - R - 16);
      bar(bx - wv / 2, yy, wv, 9, S.bossHp / S.bossMax, '#ff5fa2');
      label('GUARDIÁN', bx, yy - 15, 11, '#ff9ecb', 'center');
    }
    for (const f of fallers) if (f.d <= 0) drawCell(f.x, f.y, f.cell, 1, f.rot);
    if (shot) drawCell(shot.x, shot.y, shot.cell, 1);
    // cañón con cara
    const rec = fireT * 7, look = ang;
    c.save(); c.translate(LX, LY + 4 + rec * 0.5); c.rotate(ang);
    c.drawImage(barrel, -17, -44 - 4 + rec, 34, 52);
    c.restore();
    c.save(); c.translate(LX, LY + 10); const sq = 1 + fireT * 0.12; c.scale(sq, 2 - sq);
    c.drawImage(body, -35, -40, 70, 64); c.restore();
    face(LX, LY + 8, look);
    if (!shot && !over && !won && (!HAND || ammo > 0)) drawCell(LX + Math.sin(ang) * 30, LY + 6 - Math.cos(ang) * 30, cur, 0.92 - fireT * 0.2);
    /* Siguiente burbuja + aviso de que se puede cambiar. Va abajo a la DERECHA: la esquina
       de abajo a la izquierda la ocupan la pausa y el sonido del reproductor (CFG.hud='bl'). */
    const nx = W - 34, ny = LY - 12;
    label('Siguiente', nx, ny - 32, 10, 'rgba(255,255,255,.7)', 'center');
    c.beginPath(); c.arc(nx, ny, 19, 0, TAU); c.fillStyle = 'rgba(16,11,38,.66)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(160,151,255,.4)'; c.stroke();
    drawCell(nx, ny, next, 0.6 + swapT * 0.28);
    const sx = nx - 15, sy = ny + 20;
    c.beginPath(); c.arc(sx, sy, 11, 0, TAU); c.fillStyle = 'rgba(70,58,196,.9)'; c.fill(); c.lineWidth = 2; c.strokeStyle = ART.OUT; c.stroke();
    c.lineWidth = 2.2; c.lineCap = 'round'; c.strokeStyle = '#fff'; c.beginPath(); c.arc(sx, sy, 5.4, 0.7, 5.3); c.stroke();
    c.beginPath(); c.moveTo(sx + 6.2, sy - 4.6); c.lineTo(sx + 2, sy - 0.6); c.lineTo(sx + 7.6, sy + 0.8); c.closePath(); c.fillStyle = '#fff'; c.fill();
    c.restore();
    hud();
    // consejo del nivel
    if (tipT > 0 && LV && tip) {
      c.globalAlpha = Math.min(1, tipT);
      const lines = wrapTip(tip, W - 52, 13), bw = W - 40, bx = OX + 20, by = OY + LINE - 26 - lines.length * 17;
      c.fillStyle = 'rgba(20,14,44,.86)'; ART.rr(c, bx, by, bw, lines.length * 17 + 16, 12); c.fill();
      c.lineWidth = 2; c.strokeStyle = 'rgba(160,151,255,.35)'; c.stroke();
      for (let i = 0; i < lines.length; i++) label(lines[i], OX + W / 2, by + 8 + i * 17, 13, '#e8e4ff', 'center');
      c.globalAlpha = 1;
    }
    if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); label(msg, OX + W / 2, OY + LINE - 62, 22, '#ffd166', 'center'); c.globalAlpha = 1; }
    // textos flotantes propios (en coordenadas de pantalla: el modo fluido los recorta de otro modo)
    for (const f of flo) { c.globalAlpha = Math.min(1, f.t / 0.3); label(f.txt, f.x, f.y, f.s, f.col, 'center'); }
    c.globalAlpha = 1;
    if (flashT > 0) { c.globalAlpha = flashT * 3; c.fillStyle = flashC; c.fillRect(0, 0, k.W, k.H); c.globalAlpha = 1; }
  }
  /* ¿hay algo a menos de dos filas de la línea de peligro? (aviso, §A1) */
  function nearLine() {
    for (let r = G.length - 1; r >= 0; r--) for (let i = 0; i < G[r].length; i++) if (G[r][i]) return cellY(r) + R > LINE - RS * 1.6;
    return false;
  }
  function wrapTip(s, maxW, size) {
    c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
    const words = s.split(' '), out = []; let line = '';
    for (const w of words) { const q = line ? line + ' ' + w : w; if (c.measureText(q).width > maxW && line) { out.push(line); line = w; } else line = q; }
    if (line) out.push(line);
    return out;
  }
  /* Trayectoria pura (misma física que stepShot) — la usan las pruebas automáticas. */
  function trace(a) {
    const occ = [], RR = (2 * R - 4) ** 2;
    for (let r = 0; r < G.length; r++) for (let i = 0; i < G[r].length; i++) if (G[r][i]) occ.push(cellX(r, i), cellY(r) - slide);
    let x = LX, y = LY - 22, vx = Math.sin(a), vy = -Math.cos(a);
    for (let s = 0; s < 1200; s++) {
      x += vx * 4; y += vy * 4;
      if (x < X0 + R) { x = X0 + R; vx = Math.abs(vx); }
      if (x > W - X0 - R) { x = W - X0 - R; vx = -Math.abs(vx); }
      let hit = y - R <= TOP - 2;
      if (!hit) for (let q = 0; q < occ.length; q += 2) { const dx = occ[q] - x, dy = occ[q + 1] - y; if (dx * dx + dy * dy < RR) { hit = true; break; } }
      if (hit) return snapTo(x, y + slide);
      if (y < -60) return null;
    }
    return null;
  }
  window.__bu = {
    get G() { return G; }, get score() { return score; }, get shot() { return shot; }, fire, get over() { return over; },
    get shots() { return shots; }, get colores() { return palette(); }, get ammo() { return ammo; }, get cur() { return cur; },
    get next() { return next; }, get lv() { return LV; }, get won() { return won; }, get par() { return S.par; },
    get fallers() { return fallers; }, get stars() { return stars; }, get used() { return used(); },
    get par2() { return par2; }, get par3() { return par3; }, get chain() { return mult; }, get done() { return goalDone(); },
    get need() { return goalTot(); }, get have() { return goalHave(); },
    get treas() { return S.treas; }, get tre() { return lvTre; }, get combos() { return S.combos; },
    get boss() { return S.bossHp; }, get life() { return lifeUsed; }, get sec() { return secT; },
    get goal() { return LV ? LV.goal : ''; }, get mast() { return lvMast; }, get S() { return S; },
    aim: (a) => { ang = k.clamp(a, -1.34, 1.34); }, trace, swap: () => { const q = cur; cur = next; next = q; },
  };
  k.onDif = () => { if (k.st !== 'play') reset(); };
  if (HAND) for (const L of HAND) L._tot = BU.totals(L).tot;
  if (HAND) k.levels(HAND.length, { start: (i) => loadLevel(i) });
  reset();
  k.show(CFG.title || 'Burbujas Arcoíris', HAND
    ? 'Veinte tubos dibujados a mano. Apunta, rebota en las paredes y junta tres iguales: lo que se queda colgando se derrumba y vale el doble. Piedra, hielo, objetos, tesoros, cerrojos que solo abren los racimos de cinco, bombas, arcoíris, techos a reloj y, al final, el Guardián del Prisma. Cada nivel tiene su objetivo, sus tiros contados y sus tres estrellas.'
    : 'Apunta con el dedo o el ratón y suelta para lanzar. Tres burbujas iguales estallan y las que se quedan sueltas caen. Cada pocos disparos baja el techo: no dejes que llegue a la línea rosa.<br>Toca para jugar');
  k.run(update, draw);
}

/* ===================================================================== Fusión (frutas / solar) ===== */
function fusion() {
  const SOLAR = MODE === 'solar';
  const BOX = { l: 32, r: W - 32, top: 168, bot: H - 34 };
  const CEN = { x: W / 2, y: 348, R: 166, sun: 30 };
  const G0 = 1500, GS = 900;                         // gravedad recta / radial
  const SUB = 1 / 120, MAXV = 900, ITER = 8;
  const FRUIT = [
    { n: 'Cereza', r: 12, c: '#ff5470', d: 'stem' }, { n: 'Fresa', r: 16, c: '#ff3f6e', d: 'seeds' },
    { n: 'Uva', r: 21, c: '#a097ff', d: 'stem' }, { n: 'Mandarina', r: 26, c: '#ff9a3d', d: 'wedge' },
    { n: 'Naranja', r: 32, c: '#ff7a1f', d: 'wedge' }, { n: 'Kiwi', r: 39, c: '#a8cf3f', d: 'seeds' },
    { n: 'Manzana', r: 47, c: '#ff4d5e', d: 'stem' }, { n: 'Pomelo', r: 56, c: '#ff6fb5', d: 'wedge' },
    { n: 'Melocotón', r: 66, c: '#ffb36b', d: 'stem' }, { n: 'Melón', r: 77, c: '#d6e86a', d: 'stripe' },
    { n: 'Sandía', r: 89, c: '#5bbd63', d: 'stripe' },
  ];
  const PLAN = [
    { n: 'Polvo', r: 10, c: '#b9b4d6', d: 'rock' }, { n: 'Asteroide', r: 13, c: '#8f89b5', d: 'rock' },
    { n: 'Luna', r: 17, c: '#dfe2f2', d: 'rock' }, { n: 'Mercurio', r: 21, c: '#c08a5a', d: 'rock' },
    { n: 'Marte', r: 26, c: '#e0674a', d: 'rock' }, { n: 'Tierra', r: 32, c: '#5b8cff', d: 'earth' },
    { n: 'Neptuno', r: 39, c: '#5fc7ff', d: 'bands' }, { n: 'Júpiter', r: 47, c: '#ffc94d', d: 'bands' },
    { n: 'Saturno', r: 56, c: '#ffd9a0', d: 'ring' }, { n: 'Enana roja', r: 66, c: '#ff7a59', d: 'star' },
    { n: 'Estrella', r: 78, c: '#fff1a8', d: 'star' },
  ];
  const T = SOLAR ? PLAN : FRUIT;
  /* Dificultad: cuántos tamaños distintos pueden salir (menos variedad = más fácil fusionar). */
  const MS = () => k.clamp((SOLAR ? 3 : 4) + (k.dif === 0 ? -1 : k.dif === 2 ? 1 : 0), 2, T.length - 2);
  let B, score, best5, aim, cur, next, cool, over, danger, t, seq, spr = [];

  for (let i = 0; i < T.length; i++) spr.push(sprite(i));
  function sprite(i) {
    const o = T[i], r = o.r, S = r * 2 + 10;
    return off(S, S, (g) => {
      g.translate(S / 2, S / 2);
      if (o.d === 'ring') { g.save(); g.rotate(-0.35); g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 0.42, 0, 0, TAU); g.lineWidth = r * 0.22; g.strokeStyle = ART.dark('#ffd9a0', 0.25); g.stroke(); g.restore(); }
      contact(g, 0, r * 0.9, r * 0.8, r * 0.2, 0.26);
      const bparts = [[(h) => { h.moveTo(r, 0); h.arc(0, 0, r, 0, TAU); }, o.c]];
      uni(g, bparts, 1.6);
      celp(g, bparts, o.c, r * 0.4, r * 0.4);
      g.save(); g.beginPath(); g.arc(0, 0, r - 1, 0, TAU); g.clip();
      const D = ART.dark(o.c, 0.34), L = ART.lite(o.c, 0.4);
      if (o.d === 'stripe') { g.strokeStyle = D; g.lineWidth = r * 0.17; for (let j = -3; j <= 3; j++) { g.beginPath(); g.moveTo(j * r * 0.42, -r); g.quadraticCurveTo(j * r * 0.55, 0, j * r * 0.42, r); g.stroke(); } }
      else if (o.d === 'seeds') { g.fillStyle = D; for (let j = 0; j < 9; j++) { const a = j * 0.7, rr = r * (0.3 + (j % 3) * 0.22); g.beginPath(); g.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.07 + 1, r * 0.11 + 1.4, a, 0, TAU); g.fill(); } }
      else if (o.d === 'wedge') { g.strokeStyle = ART.alpha('#ffffff', 0.35); g.lineWidth = 2; for (let j = 0; j < 6; j++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(j * 1.05) * r, Math.sin(j * 1.05) * r); g.stroke(); } }
      else if (o.d === 'bands') { g.fillStyle = ART.alpha(D, 0.55); for (let j = -2; j <= 2; j++) { g.beginPath(); g.ellipse(0, j * r * 0.42, r, r * 0.13, 0, 0, TAU); g.fill(); } }
      else if (o.d === 'earth') { g.fillStyle = '#a8cf3f'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.1, r * 0.42, r * 0.3, 0.4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(r * 0.35, r * 0.35, r * 0.3, r * 0.22, -0.3, 0, TAU); g.fill(); }
      else if (o.d === 'rock') { g.fillStyle = ART.alpha(D, 0.7); for (let j = 0; j < 5; j++) { const a = j * 1.4, rr = r * 0.55; g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * (0.1 + R2(i * 7 + j) * 0.12), 0, TAU); g.fill(); } }
      else if (o.d === 'star') { g.fillStyle = ART.alpha(L, 0.8); for (let j = 0; j < 7; j++) { const a = j * 0.9; g.beginPath(); g.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.16, 0, TAU); g.fill(); } }
      g.restore();
      spec(g, -r * 0.33, -r * 0.4, r * 0.28, r * 0.17, -0.6, 0.62);
      if (!SOLAR && (o.d === 'stem')) { g.strokeStyle = '#7a4a2a'; g.lineWidth = Math.max(2, r * 0.09); g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -r + 2); g.lineTo(r * 0.12, -r - r * 0.22); g.stroke(); g.beginPath(); g.ellipse(r * 0.3, -r - r * 0.16, r * 0.26, r * 0.12, -0.45, 0, TAU); ART.fillOut(g, '#5ccf5a', 1.8); }
      // carita amable en las piezas grandes
      if (r >= 26) {
        const ey = r * 0.1;
        for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(s * r * 0.3, ey, r * 0.13, 0, TAU); g.fill(); g.fillStyle = OUT; g.beginPath(); g.arc(s * r * 0.3 + r * 0.04, ey, r * 0.07, 0, TAU); g.fill(); }
        g.strokeStyle = OUT; g.lineWidth = Math.max(1.8, r * 0.05); g.lineCap = 'round'; g.beginPath(); g.arc(0, ey + r * 0.12, r * 0.22, 0.5, 2.64); g.stroke();
      }
    });
  }
  const bg = off(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    if (SOLAR) { gr.addColorStop(0, '#191140'); gr.addColorStop(1, '#070515'); } else { gr.addColorStop(0, '#3a2b63'); gr.addColorStop(1, '#1a1230'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (SOLAR) { g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 70; i++) { const s = R2(i) * 1.6 + 0.4; g.globalAlpha = 0.3 + R2(i + 5) * 0.6; g.beginPath(); g.arc(R2(i + 11) * W, R2(i + 23) * H, s, 0, TAU); g.fill(); } g.globalAlpha = 1; }
    else { g.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(R2(i) * W, R2(i + 3) * H, 8 + R2(i + 9) * 22, 0, TAU); g.fill(); } }
  });

  function reset() {
    B = []; score = 0; over = 0; danger = 0; t = 0; cool = 0; seq = 0;
    aim = SOLAR ? -1.5708 : W / 2;
    cur = k.ri(0, MS() - 1); next = k.ri(0, MS() - 1);
  }
  function add(tier, x, y, vx, vy) { const b = { t: tier, r: T[tier].r, x, y, vx: vx || 0, vy: vy || 0, age: 0, pop: 0, id: ++seq }; B.push(b); return b; }
  function drop() {
    if (cool > 0 || over) return;
    if (SOLAR) { const r = CEN.R - T[cur].r - 2; add(cur, CEN.x + Math.cos(aim) * r, CEN.y + Math.sin(aim) * r, -Math.cos(aim) * 60, -Math.sin(aim) * 60); }
    else add(cur, k.clamp(aim, BOX.l + T[cur].r + 1, BOX.r - T[cur].r - 1), BOX.top - 26, 0, 40);
    cur = next; next = k.ri(0, MS() - 1); cool = 0.45; k.sfx('pop');
  }
  /* ---------- física: pasos fijos, impulsos amortiguados y recorte dentro del recipiente ---------- */
  function clampIn(b) {
    if (SOLAR) {
      const dx = b.x - CEN.x, dy = b.y - CEN.y; let d = Math.hypot(dx, dy);
      if (d < 1e-4) { b.x += 0.1; d = 0.1; }
      const nx = dx / d, ny = dy / d, out = CEN.R - b.r, inn = CEN.sun + b.r;
      if (d > out) { b.x = CEN.x + nx * out; b.y = CEN.y + ny * out; const vn = b.vx * nx + b.vy * ny; if (vn > 0) { b.vx -= vn * 1.35 * nx; b.vy -= vn * 1.35 * ny; } }
      else if (d < inn) { b.x = CEN.x + nx * inn; b.y = CEN.y + ny * inn; const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= vn * 1.35 * nx; b.vy -= vn * 1.35 * ny; } }
    } else {
      if (b.x < BOX.l + b.r) { b.x = BOX.l + b.r; if (b.vx < 0) b.vx *= -0.25; }
      if (b.x > BOX.r - b.r) { b.x = BOX.r - b.r; if (b.vx > 0) b.vx *= -0.25; }
      if (b.y > BOX.bot - b.r) { b.y = BOX.bot - b.r; if (b.vy > 0) b.vy *= -0.18; b.vx *= 0.9; }
      if (b.y < -200) b.y = -200;
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAXV) { b.vx *= MAXV / sp; b.vy *= MAXV / sp; }
    if (!isFinite(b.x) || !isFinite(b.y)) { b.x = SOLAR ? CEN.x : (BOX.l + BOX.r) / 2; b.y = SOLAR ? CEN.y - CEN.sun - b.r - 1 : BOX.bot - b.r; b.vx = b.vy = 0; }
  }
  function merges() {
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], b = B[j];
      if (a.t !== b.t || a.t >= T.length - 1 || a.dead || b.dead || a.age < 0.08 || b.age < 0.08) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > a.r + b.r + 0.6) continue;                 // fusiona al tocarse: el solver deja las piezas justo en contacto
      a.dead = b.dead = true;
      const nt = a.t + 1, n = add(nt, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.vx + b.vx) / 2, (a.vy + b.vy) / 2);
      clampIn(n); n.pop = 1; const pts = (nt + 1) * (nt + 2) / 2; score += pts;
      k.burst(n.x, n.y, T[nt].c, 12, 150); k.float('+' + pts, n.x, n.y - n.r - 8, '#ffd166');
      k.sfx(nt >= 7 ? 'win' : 'coin'); if (nt >= 6) k.shake(3);
      if (nt === T.length - 1) { k.confetti(T[nt].c, 40); k.flash('rgba(255,255,255,.25)'); }
    }
    if (B.some((b) => b.dead)) B = B.filter((b) => !b.dead);
  }
  function step(dt) {
    for (const b of B) {
      b.age += dt;
      if (SOLAR) { const dx = CEN.x - b.x, dy = CEN.y - b.y, d = Math.hypot(dx, dy) || 1; b.vx += dx / d * GS * dt; b.vy += dy / d * GS * dt; }
      else b.vy += G0 * dt;
      const dg = Math.pow(0.999, dt * 60); b.vx *= dg; b.vy *= dg;
      b.x += b.vx * dt; b.y += b.vy * dt;
      clampIn(b);
    }
    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j], dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy); const sum = a.r + b.r;
        if (d >= sum || d < 1e-6) { if (d < 1e-6) { b.x += 0.3; b.y -= 0.3; } continue; }
        const nx = dx / d, ny = dy / d, ov = sum - d;
        const ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
        const corr = Math.max(0, ov - 0.05) * 0.85;
        a.x -= nx * corr * (mb / tot); a.y -= ny * corr * (mb / tot);
        b.x += nx * corr * (ma / tot); b.y += ny * corr * (ma / tot);
        if (it === 0) {           // impulso normal con restitución baja y rozamiento tangencial
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            const jn = -(1 + 0.08) * vn / (1 / ma + 1 / mb);
            a.vx -= jn * nx / ma; a.vy -= jn * ny / ma; b.vx += jn * nx / mb; b.vy += jn * ny / mb;
            const tx = -ny, ty = nx, vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty, jt = -vt * 0.22 / (1 / ma + 1 / mb);
            a.vx -= jt * tx / ma; a.vy -= jt * ty / ma; b.vx += jt * tx / mb; b.vy += jt * ty / mb;
          }
        }
      }
      for (const b of B) clampIn(b);
    }
    merges();
  }
  function outside(b) {
    if (SOLAR) return Math.hypot(b.x - CEN.x, b.y - CEN.y) + b.r > CEN.R + 1.5;
    return b.x - b.r < BOX.l - 1.5 || b.x + b.r > BOX.r + 1.5 || b.y + b.r > BOX.bot + 1.5;
  }
  function peril() {
    // pieza quieta rozando el borde de salida (aro exterior o boca del tarro)
    for (const b of B) {
      if (b.age < 1.2 || Math.hypot(b.vx, b.vy) > 45) continue;
      if (SOLAR) { if (Math.hypot(b.x - CEN.x, b.y - CEN.y) + b.r > CEN.R - 6) return true; }
      else if (b.y - b.r < BOX.top + 4) return true;
    }
    return false;
  }
  function update(dt) {
    t += dt;
    for (const b of B) b.pop = Math.max(0, b.pop - dt * 4);
    if (!k.gate(reset)) return;
    cool = Math.max(0, cool - dt);
    if (over) { over += dt; if (over > 1.1) k.lose(ID, score, SOLAR ? 'El anillo se llenó' : 'El tarro rebosa', `Mayor: ${T[Math.max(0, ...B.map((b) => b.t))].n}`); return; }
    // control: dedo/ratón coloca la pieza (ángulo en el modo solar), cruceta y flechas la mueven
    const p = k.ptr;
    if (SOLAR) {
      if (p.down || p.hit) aim = Math.atan2(p.y - CEN.y, p.x - CEN.x);
      const d = (k.held.has('right') ? 1 : 0) - (k.held.has('left') ? 1 : 0); if (d) aim += d * 1.6 * dt;
    } else {
      if (p.down || p.hit) aim = p.x;
      const d = (k.held.has('right') ? 1 : 0) - (k.held.has('left') ? 1 : 0); if (d) aim = k.clamp(aim + d * 260 * dt, BOX.l, BOX.r);
    }
    if (p.up || k.hit.has('a') || k.hit.has('down') || k.hit.has('up')) drop();
    let n = 0; for (let acc = dt; acc > 0 && n < 5; acc -= SUB, n++) step(Math.min(SUB, acc));
    if (t > 5 && peril()) { danger += dt; if (danger > 2.2) { over = 0.001; k.sfx('hurt'); k.shake(7); } } else danger = Math.max(0, danger - dt * 1.5);
  }
  function drawBody(b) {
    const S = (b.r * 2 + 10) * (1 + b.pop * 0.22);
    c.save(); c.translate(b.x, b.y);
    if (SOLAR) c.rotate(Math.atan2(b.y - CEN.y, b.x - CEN.x) + 1.5708);
    c.drawImage(spr[b.t], -S / 2, -S / 2, S, S); c.restore();
  }
  function draw() {
    c.drawImage(bg, 0, 0, W, H);
    if (SOLAR) {
      c.beginPath(); c.arc(CEN.x, CEN.y, CEN.R, 0, TAU); c.lineWidth = 6; c.strokeStyle = danger > 0.6 ? '#ff6fb5' : 'rgba(160,151,255,.5)'; c.stroke();
      c.beginPath(); c.arc(CEN.x, CEN.y, CEN.R - 4, 0, TAU); c.fillStyle = 'rgba(110,98,245,.07)'; c.fill();
      const gr = c.createRadialGradient(CEN.x, CEN.y, 4, CEN.x, CEN.y, CEN.sun * 2.2);
      gr.addColorStop(0, '#fff6c2'); gr.addColorStop(0.4, '#ffc94d'); gr.addColorStop(1, 'rgba(255,201,77,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(CEN.x, CEN.y, CEN.sun * 2.2, 0, TAU); c.fill();
      c.beginPath(); c.arc(CEN.x, CEN.y, CEN.sun, 0, TAU); ART.fillOut(c, '#ffd23d', 2.6);
      for (const s of [-1, 1]) { c.beginPath(); c.arc(CEN.x + s * 9, CEN.y - 3, 3, 0, TAU); c.fillStyle = OUT; c.fill(); }
      c.strokeStyle = OUT; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.arc(CEN.x, CEN.y + 2, 7, 0.5, 2.64); c.stroke();
    } else {
      ART.rr(c, BOX.l - 10, BOX.top - 6, BOX.r - BOX.l + 20, BOX.bot - BOX.top + 16, 22);
      c.lineWidth = 8; c.strokeStyle = 'rgba(160,151,255,.4)'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.04)'; c.fill();
      c.save(); c.setLineDash([9, 8]); c.lineWidth = 3; c.strokeStyle = danger > 0.6 ? '#ff6fb5' : 'rgba(255,255,255,.35)';
      c.beginPath(); c.moveTo(BOX.l - 6, BOX.top); c.lineTo(BOX.r + 6, BOX.top); c.stroke(); c.restore();
    }
    for (const b of B) drawBody(b);
    // pieza en espera
    if (!over && k.st === 'play') {
      const r = T[cur].r;
      if (SOLAR) { const d = CEN.R + 22, x = CEN.x + Math.cos(aim) * d, y = CEN.y + Math.sin(aim) * d; drawBody({ x, y, r, t: cur, pop: 0 });
        c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.setLineDash([5, 8]); c.beginPath(); c.moveTo(x, y); c.lineTo(CEN.x, CEN.y); c.stroke(); c.setLineDash([]); }
      else { const x = k.clamp(aim, BOX.l + r, BOX.r - r); drawBody({ x, y: BOX.top - 26, r, t: cur, pop: 0 });
        c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2; c.setLineDash([5, 8]); c.beginPath(); c.moveTo(x, BOX.top - 26 + r); c.lineTo(x, BOX.bot); c.stroke(); c.setLineDash([]); }
    }
    // marcador
    label(String(score), 14, 10, 26, '#fff');
    label('Récord ' + Math.max(k.best(ID, 0), score), 14, 40, 11, 'rgba(255,255,255,.65)');
    const nr = Math.min(20, T[next].r), S = (T[next].r * 2 + 10) * nr / T[next].r;
    c.drawImage(spr[next], W - 30 - S / 2, 24 - S / 2 + 6, S, S);
    label('Siguiente', W - 30, 44, 10, 'rgba(255,255,255,.65)', 'center');
    if (danger > 0.6 && !over) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 12); label('¡Cuidado!', W / 2, SOLAR ? 108 : BOX.top - 52, 18, '#ff6fb5', 'center'); c.globalAlpha = 1; }
  }
  /* pruebas: simulación sin dibujar (window.__fu.sim(n) devuelve cuántos cuerpos se salieron) */
  window.__fu = {
    get B() { return B; }, get score() { return score; }, T, BOX, CEN, SOLAR, drop, get ms() { return MS(); },
    sim(n, every) {
      let bad = 0;
      for (let i = 0; i < n; i++) {
        if (every && i % every === 0) { cool = 0; aim = SOLAR ? Math.random() * TAU : k.rnd(BOX.l + 20, BOX.r - 20); drop(); }
        step(SUB);
        for (const b of B) if (outside(b)) bad++;
      }
      return bad;
    },
  };
  k.onDif = () => { if (k.st !== 'play') reset(); };
  reset();
  k.show(CFG.title || (SOLAR ? 'Fusión Solar' : 'Fusión de Frutas'),
    SOLAR ? 'Gira alrededor del anillo y suelta planetas hacia el sol. Dos iguales se funden en el siguiente. Si el montón toca el anillo, se acabó.<br>Toca para jugar'
      : 'Mueve la fruta y suéltala en el tarro. Dos frutas iguales se funden en la siguiente, más grande. Si el montón rebosa por la boca, se acabó.<br>Toca para jugar');
  k.run(update, draw);
}
