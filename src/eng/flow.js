/* Flow Lines (plan Friv, vara de docs/VARA.md): une cada pareja de puntos con una tubería de su
 * color, sin cruzarlas, y llena todo el tablero.
 *
 * 20 tableros escritos en FLOWLV (src/eng/flowlv.js), todos con solución única demostrada por
 * scripts/check_flowlv.js con LAS MISMAS reglas que ejecuta este motor (FLOWLV.parse/canStep/solved).
 * Seis ideas nuevas de una en una: huecos (forma no rectangular), puentes, gemas de color,
 * portales, señal recta y señal codo; reloj en un tercio largo de la tabla. Deshacer, reiniciar
 * y pista en un toque; estrellas por trazos (1★ terminar · 2★ trazos ≤ objetivo · 3★ además sin
 * pista) y final de verdad en el 20. Lienzo fluido: el tablero se escala al hueco real.
 *
 * El tablero es un GRAFO de nodos (un puente son dos nodos: mitad horizontal y vertical). Cada
 * tubería es una lista de nodos que empieza siempre en uno de sus dos puntos. */
const OUT = ART.OUT, R2 = 6.2832;
const LVS = FLOWLV['flow-lines'];
const W = 480, H = 640;
const k = Kit({
  w: W, h: H, title: CFG.title, bg: '#141a33',
  fluid: { min: 0.42, max: 2.8, maxW: 1180, maxH: 940 },
  help: CFG.help || 'Arrastra desde un punto hasta el otro del mismo color. Las tuberías no se cruzan y hay que llenar todo el tablero.'
}), c = k.ctx;
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
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.7 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, R2); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, R2); g.fill(); }
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
const COL = ['#ff5f5f', '#4cc3ff', '#ffd23d', '#5fe08a', '#b77cff', '#ff9a3d', '#ff8ad0', '#5a78ff', '#b8e05a', '#f2f2f2'];
const CNAME = ['ROJO', 'AZUL', 'AMARILLO', 'VERDE', 'MORADO', 'NARANJA', 'ROSA', 'AÑIL', 'LIMA', 'BLANCO'];
const PCOL = { 1: '#5ce1e6', 2: '#ff6fd8', 3: '#ffd166' };

/* ---------- Estado ---------- */
let M, lv, G, level = 1, paths, own, drag = -1, snap = null, strokes = 0, hist = [], hintsLeft = 0, usedHint = false;
let timeLeft = 0, tPlay = 0, winT = 0, total = 0, combo = 0, cellsStroke = 0, tipT = 0, warn = null, conn = [], hinted = [], offs = [];
let winStars = 1, cur = [0, 0], kbd = false, lastTick = 99, msgT = 0, msg = '';
let S = 40, OX = 0, OY = 0, TOP = 74, BOT = 64, BY = 0, BTN = [], boardCv = null, bgCv = null, t = 0;
const BH = 44;

function loadLevel() {
  lv = LVS[Math.max(0, Math.min(LVS.length - 1, level - 1))];
  M = FLOWLV.parse(lv); G = FLOWLV.goals(lv, k.dif);
  paths = M.ends.map((e) => [e[0]]); own = new Int16Array(M.nodes.length);
  hist = []; strokes = 0; drag = -1; snap = null; combo = 0; k.chainReset();
  hintsLeft = G.p; usedHint = false; timeLeft = G.t; tPlay = 0; winT = 0; tipT = 5; warn = null; lastTick = 99; msgT = 0;
  conn = M.ends.map(() => 0); hinted = M.ends.map(() => 0); offs = [];
  cur = [M.nodes[M.ends[0][0]].x, M.nodes[M.ends[0][0]].y];
  reown(); layout();
}
function reset() { level = k.lv; total = 0; loadLevel(); }
k.levels(LVS.length, { start: (i) => { level = i; total = 0; loadLevel(); if (k.st === 'play') k.st = 'over'; } });
k.onDif = () => { if (k.st !== 'play') reset(); };
k.onSize = () => layout();

/* ---------- Reglas del tablero ---------- */
function reown() { own.fill(-1); for (let i = 0; i < paths.length; i++) for (const v of paths[i]) own[v] = i; }
const other = (col, v) => (M.ends[col][0] === v ? M.ends[col][1] : M.ends[col][0]);
function connected(col) { const pa = paths[col]; return pa.length > 1 && pa[pa.length - 1] === other(col, pa[0]); }
const filled = () => { let n = 0; for (let i = 0; i < own.length; i++) if (own[i] >= 0) n++; return n; };
/* Un portal en el que se ha entrado y del que no se ha salido deja la tubería a medias. */
const entered = (pa) => { const v = pa[pa.length - 1], n = M.nodes[v]; return n.tw >= 0 && (pa.length < 2 || pa[pa.length - 2] !== n.tw); };
/* Corte por otra tubería: lo que queda no puede acabar a la entrada de un portal. */
function cutAt(col, v) { const pa = paths[col], i = pa.indexOf(v); if (i < 0) return; const was = connected(col); paths[col] = pa.slice(0, Math.max(1, i)); while (paths[col].length > 1 && entered(paths[col])) paths[col].pop(); if (was) { combo = 0; k.chainReset(); } }
function cellOf(px, py) { const x = Math.floor((px - OX) / S), y = Math.floor((py - OY) / S); return M.cell[x + ',' + y] ? [x, y] : null; }
/* Nodo de la casilla (x,y) al que se llega desde el nodo h (los puentes eligen mitad por dirección). */
function nodeToward(h, x, y) { const nb = M.nodes[h].nb; for (let i = 0; i < nb.length; i++) { const n = M.nodes[nb[i][0]]; if (nb[i][1] < 4 && n.x === x && n.y === y) return nb[i][0]; } return -1; }
const ctr = (v) => [OX + (M.nodes[v].x + 0.5) * S, OY + (M.nodes[v].y + 0.5) * S];

/* ---------- Acciones ---------- */
function grabCell(cl) {
  if (!cl) return;
  const q = M.cell[cl[0] + ',' + cl[1]], n0 = M.nodes[q.ids[0]];
  snap = JSON.stringify(paths); cellsStroke = 0; offs = [];
  if (n0.end >= 0) {
    const e = n0.end, pa = paths[e];
    if (pa[pa.length - 1] === q.ids[0] && pa.length > 1) drag = e;   /* el extremo final de su tubería: se sigue desde ahí */
    else { if (connected(e)) { combo = 0; k.chainReset(); } paths[e] = [q.ids[0]]; drag = e; }
    k.sfx('click'); reown(); return;
  }
  /* casilla con tubería: se sigue desde ahí (en un puente, la tubería que acaba en él si la hay) */
  let pick = -1, best = -1;
  for (const id of q.ids) { const o = own[id]; if (o < 0) continue; const pa = paths[o], i = pa.lastIndexOf(id); const sc = i === pa.length - 1 ? 2 : 1; if (sc > best) { best = sc; pick = id; } }
  if (pick < 0) { drag = -1; snap = null; return; }
  const o = own[pick], pa = paths[o], i = pa.lastIndexOf(pick);
  if (connected(o) && i < pa.length - 1) { combo = 0; k.chainReset(); }
  paths[o] = pa.slice(0, i + 1); if (entered(paths[o])) paths[o].push(M.nodes[pick].tw);
  drag = o; reown(); k.sfx('click');
}
/* Retroceder: el dedo vuelve a una casilla de su propia tubería. */
function backTo(cl) {
  const pa = paths[drag]; let j = -1;
  for (let i = pa.length - 2; i >= 0; i--) { const n = M.nodes[pa[i]]; if (n.x === cl[0] && n.y === cl[1]) { j = i; break; } }
  if (j < 0) return false;
  const was = connected(drag);
  paths[drag] = pa.slice(0, j + 1); if (entered(paths[drag])) paths[drag].push(M.nodes[paths[drag][j]].tw);
  while (offs.length && paths[drag].length < offs[offs.length - 1][2]) offs.pop();
  if (was) { combo = 0; k.chainReset(); }
  reown(); k.sfx('pop'); return true;
}
/* Un paso de la cabeza de la tubería a la casilla vecina cl. Devuelve false si no se puede. */
function stepTo(cl) {
  const pa = paths[drag], h = pa[pa.length - 1], hn = M.nodes[h];
  if (hn.x === cl[0] && hn.y === cl[1]) return true;
  /* hacia delante si se puede (la otra mitad de un puente propio es un paso nuevo, no un retroceso) */
  const adj = Math.abs(hn.x - cl[0]) + Math.abs(hn.y - cl[1]) === 1, nx = adj ? nodeToward(h, cl[0], cl[1]) : -1;
  if (!(nx >= 0 && own[nx] !== drag && !connected(drag)) && backTo(cl)) return true;
  if (connected(drag)) return false;
  if (!adj || nx < 0) return false;
  const prev = pa.length > 1 ? pa[pa.length - 2] : -1;
  if (!FLOWLV.canStep(M, drag, prev, h, nx)) { blocked(h, nx); return false; }
  const o = own[nx];
  if (o === drag) return false;                         /* cruzarse con uno mismo solo por puente: ya es otro nodo */
  if (o >= 0) { if (M.nodes[nx].end >= 0) return false; cutAt(o, nx); }
  pa.push(nx); reown(); cellsStroke++;
  const [x, y] = ctr(nx); k.chime(Math.min(10, cellsStroke)); k.burst(x, y, COL[drag], 3, 50);
  if (M.nodes[nx].tw >= 0) {                            /* portal: sale por el otro */
    const tw = M.nodes[nx].tw, ot = own[tw]; if (ot >= 0 && ot !== drag) cutAt(ot, tw);
    pa.push(tw); reown();
    offs.push([M.nodes[tw].x - M.nodes[nx].x, M.nodes[tw].y - M.nodes[nx].y, pa.length]);
    const [x2, y2] = ctr(tw); k.burst(x, y, PCOL[portalNo(nx)] || '#5ce1e6', 12, 120); k.burst(x2, y2, PCOL[portalNo(nx)] || '#5ce1e6', 12, 120); k.sfx('jump');
  }
  if (M.nodes[nx].req === drag) { k.float('¡Gema!', x, y - S * 0.4, COL[drag]); k.sfx('coin'); }
  if (connected(drag)) closeColor(drag);
  return true;
}
function portalNo(v) { const n = M.nodes[v]; return M.cell[n.x + ',' + n.y].ch; }
/* Paso prohibido por una marca: se señala para que se entienda por qué. */
function blocked(h, nx) {
  const N = M.nodes[nx], Hn = M.nodes[h];
  if (N.req >= 0 && N.req !== drag) { warn = { v: nx, t: 0.45 }; say(`Esa gema es del ${CNAME[N.req].toLowerCase()}`); }
  else if (Hn.sign) { warn = { v: h, t: 0.45 }; say(Hn.sign === 1 ? 'Por la señal recta no se gira' : 'En la señal codo hay que girar'); }
  else if (Hn.tw >= 0) { warn = { v: h, t: 0.45 }; }
  else return;
  k.sfx('hit');
}
function say(s) { msg = s; msgT = 1.6; }
function closeColor(col) {
  combo++; conn[col] = 0.7;
  const pa = paths[col], [x1, y1] = ctr(pa[0]), [x2, y2] = ctr(pa[pa.length - 1]);
  k.burst(x1, y1, COL[col], 14, 150); k.burst(x2, y2, COL[col], 14, 150);
  const gain = 25 * combo; total += gain;
  k.float('+' + gain, x2, y2 - S * 0.5, '#ffd23d');
  k.reward('¡' + CNAME[col] + '!', COL[col]); k.hitstop(0.04); k.punch(0.05); k.sfx('coin');
  if (combo >= 2) k.combo(combo, k.W / 2, OY + S * M.NH + 14);
}
function release() {
  if (drag < 0) return;
  const changed = snap != null && snap !== JSON.stringify(paths);
  if (changed) { strokes++; hist.push(snap); if (hist.length > 80) hist.shift(); }
  drag = -1; snap = null; offs = [];
  checkWin(true);
}
function checkWin(talk) {
  if (winT) return;
  if (FLOWLV.solved(M, paths)) return win();
  if (talk && M.ends.every((_, i) => connected(i))) {
    const left = own.length - filled();
    say(left ? `Te faltan ${left} casilla${left === 1 ? '' : 's'} por llenar` : 'Alguna marca no se cumple');
  }
}
function undo() {
  if (!hist.length || winT) return;
  paths = JSON.parse(hist.pop()); reown(); combo = 0; k.chainReset(); k.sfx('pop');
}
function restart() {
  if (winT) return;
  paths = M.ends.map((e) => [e[0]]); reown(); hist = []; strokes = 0; combo = 0; k.chainReset(); timeLeft = G.t; tPlay = 0; lastTick = 99; k.sfx('pop');
}
/* Pista: coloca entera la primera tubería que no coincide con la solución escrita en la tabla. */
function decode(col) {
  const s = lv.s[col]; let v = M.ends[col][0]; const out = [v];
  for (const ch of s) { const d = 'RDLUP'.indexOf(ch); if (d === 4) v = M.nodes[v].tw; else { const nb = M.nodes[v].nb.find((q) => q[1] === d); v = nb[0]; } out.push(v); }
  return out;
}
function hint() {
  if (winT || !lv.s) return;
  if (hintsLeft <= 0) { say('No te quedan pistas'); k.sfx('hurt'); return; }
  for (let col = 0; col < M.nc; col++) {
    const want = decode(col), pa = paths[col];
    const same = pa.length === want.length && (pa.every((v, i) => v === want[i]) || pa.every((v, i) => v === want[want.length - 1 - i]));
    if (same) continue;
    hist.push(JSON.stringify(paths));
    for (const v of want) { const o = own[v]; if (o >= 0 && o !== col) cutAt(o, v); reown(); }
    paths[col] = want; reown();
    hintsLeft--; usedHint = true; hinted[col] = 1.2; conn[col] = 0.7;
    const [x, y] = ctr(want[want.length - 1]); k.burst(x, y, COL[col], 18, 140); k.sfx('coin');
    say(`Pista: así va el ${CNAME[col].toLowerCase()}`);
    checkWin(false); return;
  }
}
function win() {
  if (drag >= 0 && snap != null && snap !== JSON.stringify(paths)) { strokes++; hist.push(snap); }
  winT = 1.3; drag = -1; snap = null;
  const stars = strokes <= G.s3 && !usedHint ? 3 : strokes <= G.s2 ? 2 : 1;
  const gain = 200 + level * 30 + stars * 100 + (G.t ? Math.round(timeLeft) * 4 : 0);
  total += gain; winStars = stars;
  k.sfx('win'); k.confetti(); k.punch(0.16); k.flash('rgba(255,255,255,.3)');
  k.float('+' + gain, k.W / 2, OY + S * M.NH / 2 + 40, '#ffd23d');
}
function handDone() {
  const st = winStars, miss = [];
  if (strokes > G.s3) miss.push(`acabar en ${G.s3} trazos (has usado ${strokes})`);
  if (usedHint) miss.push('no usar pista');
  k.best(CFG.id, total);
  const extra = `${lv.n}<br>${strokes} trazo${strokes === 1 ? '' : 's'} · 2★ en ${G.s2} · 3★ en ${G.s3} sin pista` +
    (G.t ? `<br>Te sobraron ${Math.ceil(timeLeft)} s` : '') +
    (st === 3 ? ' · <b style="color:#ffd166">¡Bordado!</b>' : `<br>Para 3★ te falta: ${miss.join(' y ')}`);
  k.levelDone(total, extra, { stars: st });
}
function timeUp() {
  const left = own.length - filled(), nc = M.ends.filter((_, i) => !connected(i)).length;
  k.lose(CFG.id, total, 'Se acabó el tiempo', `Te faltaban ${left} casilla${left === 1 ? '' : 's'}${nc ? ` y ${nc} color${nc === 1 ? '' : 'es'} por unir` : ''}`);
}

/* ---------- Disposición (lienzo fluido) ---------- */
/* Vertical: marcador arriba, tablero y botones abajo. Apaisado: los botones pasan a una columna a
   la derecha y el tablero gana todo el alto. La casilla se escala al hueco real. */
let WIDE = false;
function layout() {
  if (!M) return;
  const narrow = k.W < 420;
  TOP = narrow ? 70 : 74;
  WIDE = k.W >= k.H * 1.25;
  if (WIDE) {
    const bw = Math.round(Math.max(120, Math.min(170, k.W * 0.18))), bx = Math.round(k.ex2(16) - bw);
    const availW = bx - 36, availH = k.H - TOP - 30;
    S = Math.max(22, Math.floor(Math.min(availW / M.NW, availH / M.NH, 92)));
    OX = Math.round(12 + (availW - S * M.NW) / 2 + 12); OY = Math.round(TOP + 14 + (availH - S * M.NH) / 2);
    const y0 = Math.round(Math.max(TOP + 14, (k.H + TOP) / 2 - (BH * 3 + 20) / 2));
    BTN = [['undo', bx, y0, bw], ['restart', bx, y0 + BH + 10, bw], ['hint', bx, y0 + 2 * (BH + 10), bw]];
    BY = k.H;
  } else {
    BOT = BH + 22;
    const availW = k.W - 24, availH = k.H - TOP - BOT - 26;
    S = Math.max(22, Math.floor(Math.min(availW / M.NW, availH / M.NH, 92)));
    OX = Math.round((k.W - S * M.NW) / 2); OY = Math.round(TOP + 12 + (availH - S * M.NH) / 2);
    BY = Math.round(k.H - BH - 12);
    const bw = Math.round(Math.max(96, Math.min(160, (k.W - 40) / 3)));
    const x0 = Math.round(k.W / 2 - bw * 1.5 - 8);
    BTN = [['undo', x0, BY, bw], ['restart', x0 + bw + 8, BY, bw], ['hint', x0 + 2 * (bw + 8), BY, bw]];
  }
  boardCv = renderBoard(); bgCv = null;
}
function btnAt(x, y) { const b = BTN.find((q) => x > q[1] && x < q[1] + q[3] && y > q[2] - 4 && y < q[2] + BH + 4); return b ? b[0] : null; }

level = k.lv; loadLevel();
k.show(CFG.title, 'Une cada pareja de puntos con una tubería de su color y llena todo el tablero. 20 tableros, cada uno con una sola solución.');

/* ---------- Bucle ---------- */
k.run((dt) => {
  t += dt;
  for (let i = 0; i < conn.length; i++) { if (conn[i] > 0) conn[i] -= dt; if (hinted[i] > 0) hinted[i] -= dt; }
  if (warn) { warn.t -= dt; if (warn.t <= 0) warn = null; }
  if (msgT > 0) msgT -= dt;
  if (!k.gate(reset)) return;
  if (winT > 0) { winT -= dt; if (winT <= 0) { winT = 0; handDone(); } return; }
  if (tipT > 0) tipT -= dt;
  tPlay += dt;
  if (G.t) {
    timeLeft -= dt;
    const s = Math.ceil(timeLeft); if (s <= 10 && s < lastTick && s > 0) { lastTick = s; k.sfx('click'); }
    if (timeLeft <= 0) { timeLeft = 0; drag = -1; return timeUp(); }
  }
  /* --- dedo: agarre en el punto de partida (sx,sy), luego se sigue hasta (x,y). Si el toque
     entero cabe en un fotograma (hit y up a la vez), se procesa igual: agarre, recorrido, suelta. */
  const p = k.ptr;
  if (p.hit) {
    kbd = false;
    const b = btnAt(p.sx, p.sy);
    if (b === 'undo') undo(); else if (b === 'restart') restart(); else if (b === 'hint') hint();
    else { grabCell(cellOf(p.sx, p.sy)); if (tipT > 1) tipT = 1; }
  }
  if (drag >= 0 && !kbd && (p.down || p.up)) follow(p.x, p.y);
  if (p.up && !kbd) release();
  /* --- teclado / mando: flechas mueven el cursor; A engancha y suelta; B deshace */
  const DV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  for (const d in DV) if (k.hit.has(d)) {
    kbd = true;
    if (drag >= 0) { const pa = paths[drag], h = M.nodes[pa[pa.length - 1]], nc2 = [h.x + DV[d][0], h.y + DV[d][1]]; if (M.cell[nc2[0] + ',' + nc2[1]]) stepTo(nc2); const h2 = M.nodes[paths[drag][paths[drag].length - 1]]; cur = [h2.x, h2.y]; }
    else { let x = cur[0], y = cur[1]; for (let s = 0; s < Math.max(M.NW, M.NH); s++) { x += DV[d][0]; y += DV[d][1]; if (x < 0 || y < 0 || x >= M.NW || y >= M.NH) break; if (M.cell[x + ',' + y]) { cur = [x, y]; break; } } }
  }
  if (k.hit.has('a')) { kbd = true; if (drag >= 0) release(); else { grabCell(cur); } }
  if (k.hit.has('b')) { if (drag >= 0) release(); undo(); }
  if (!winT && drag >= 0) checkWin(false);
}, draw);

/* El dedo arrastra: se avanza casilla a casilla hacia él (un gesto rápido no se salta casillas).
   En un portal se puede seguir sin soltar (llevando el dedo hasta la salida) o soltar y seguir
   tirando desde la salida, que es donde queda la cabeza de la tubería. */
function follow(px, py) {
  const raw = cellOf(px, py) || [Math.floor((px - OX) / S), Math.floor((py - OY) / S)];
  const pa0 = paths[drag];
  while (offs.length && pa0.length < offs[offs.length - 1][2]) offs.pop();
  let tx = raw[0], ty = raw[1];
  if (offs.length) {
    /* Tras cruzar un portal la tubería sigue en la salida y el dedo se ha quedado en la entrada.
       Mientras el dedo no llegue junto a la salida no se toca nada (puede cruzar el tablero sin
       estropear otras tuberías); si vuelve a la casilla de antes del portal, se deshace el salto. */
    const h0 = M.nodes[pa0[pa0.length - 1]], o = offs[offs.length - 1], bf = M.nodes[pa0[o[2] - 3]];
    if (Math.abs(raw[0] - h0.x) + Math.abs(raw[1] - h0.y) <= 1) offs = [];
    else { if (bf && bf.x === raw[0] && bf.y === raw[1]) { backTo(raw); offs = []; } return; }
  }
  for (let guard = 0; guard < 24 && drag >= 0; guard++) {
    const pa = paths[drag], h = M.nodes[pa[pa.length - 1]];
    if (h.x === tx && h.y === ty) return;
    const fw = Math.abs(tx - h.x) + Math.abs(ty - h.y) === 1 ? nodeToward(pa[pa.length - 1], tx, ty) : -1;
    if (M.cell[tx + ',' + ty] && !(fw >= 0 && own[fw] !== drag)) { let mine = false; for (let i = 0; i < pa.length - 1; i++) { const n = M.nodes[pa[i]]; if (n.x === tx && n.y === ty) { mine = true; break; } } if (mine) { backTo([tx, ty]); return; } }
    const dx = tx - h.x, dy = ty - h.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) return;          /* demasiado lejos (p. ej. justo tras un portal): se espera */
    let nx = h.x, ny = h.y;
    const prevN = pa.length > 1 ? M.nodes[pa[pa.length - 2]] : null, hor = prevN ? prevN.y === h.y : true;
    if (Math.abs(dx) > Math.abs(dy) || (Math.abs(dx) === Math.abs(dy) && hor)) nx += Math.sign(dx); else ny += Math.sign(dy);
    if (!M.cell[nx + ',' + ny]) { if (dx && dy) { nx = h.x; ny = h.y; if (Math.abs(dx) > Math.abs(dy) || (Math.abs(dx) === Math.abs(dy) && hor)) ny += Math.sign(dy); else nx += Math.sign(dx); if (!M.cell[nx + ',' + ny]) return; } else return; }
    const before = paths[drag].length;
    if (!stepTo([nx, ny])) return;
    if (paths[drag].length === before) return;
    if (offs.length && offs[offs.length - 1][2] === paths[drag].length) return;   /* acaba de cruzar un portal: se espera al dedo */
  }
}

/* ---------- Gráficos ---------- */
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function fit(s, size, maxW) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; let z = size; while (z > 10 && c.measureText(s).width > maxW) { z--; c.font = `800 ${z}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; } return z; }
function renderBg() {
  const BW = Math.ceil(k.W), BHh = Math.ceil(k.H), cv = document.createElement('canvas');
  cv.width = Math.ceil(BW * CDPR); cv.height = Math.ceil(BHh * CDPR); const g = cv.getContext('2d'); g.scale(CDPR, CDPR);
  const gr = g.createLinearGradient(0, 0, 0, BHh); gr.addColorStop(0, '#242c58'); gr.addColorStop(1, '#0f1328'); g.fillStyle = gr; g.fillRect(0, 0, BW, BHh);
  /* rejilla de fondo con variación determinista: plano técnico apagado */
  g.strokeStyle = 'rgba(255,255,255,.03)'; g.lineWidth = 1;
  for (let x = 0; x < BW; x += 24) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, BHh); g.stroke(); }
  for (let y = 0; y < BHh; y += 24) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(BW, y + 0.5); g.stroke(); }
  const vg = g.createRadialGradient(BW / 2, BHh / 2, Math.min(BW, BHh) * 0.3, BW / 2, BHh / 2, Math.max(BW, BHh) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, BW, BHh);
  /* panel del marcador */
  const px = k.ex(10), pw = k.ex2(10) - px;
  g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, px, 12, pw, TOP - 12, 16); g.fill();
  ART.rr(g, px, 8, pw, TOP - 12, 16); ART.fillOut(g, '#2e3870', 3);
  g.fillStyle = 'rgba(255,255,255,.07)'; ART.rr(g, px + 10, 12, pw - 20, 5, 3); g.fill();
  return cv;
}
/* Tablero horneado: una sola silueta (todas las casillas engordadas, contorno una vez) y las losas. */
function renderBoard() {
  const PAD = 12, bw = M.NW * S + PAD * 2, bh = M.NH * S + PAD * 2, cv = document.createElement('canvas');
  cv.width = Math.ceil(bw * CDPR); cv.height = Math.ceil(bh * CDPR); const g = cv.getContext('2d'); g.scale(CDPR, CDPR); g.translate(PAD, PAD);
  cv._w = bw; cv._h = bh; cv._p = PAD;
  const cells = Object.keys(M.cell).map((q) => q.split(',').map(Number));
  const each = (fn) => { for (const [x, y] of cells) fn(x, y, M.cell[x + ',' + y]); };
  g.fillStyle = 'rgba(8,6,20,.45)'; each((x, y) => { ART.rr(g, x * S - 6, y * S - 1, S + 12, S + 12, 10); g.fill(); });           /* sombra proyectada */
  g.fillStyle = OUT; each((x, y) => { ART.rr(g, x * S - 8, y * S - 8, S + 16, S + 16, 12); g.fill(); });                         /* contorno exterior único */
  g.fillStyle = '#3a4680'; each((x, y) => { ART.rr(g, x * S - 5, y * S - 5, S + 10, S + 10, 9); g.fill(); });                     /* marco */
  g.fillStyle = '#4a58a0'; each((x, y) => { ART.rr(g, x * S - 5, y * S - 5, S + 10, 4, 3); g.fill(); });                           /* luz de arriba */
  g.fillStyle = '#121733'; each((x, y) => { ART.rr(g, x * S - 1.5, y * S - 1.5, S + 3, S + 3, 7); g.fill(); });                   /* foso */
  each((x, y, q) => {
    const n = ((x * 73 + y * 151) % 7) / 7, base = q.ch === '+' ? '#1d3352' : (x + y) % 2 ? '#1f2750' : '#1b2246';
    ART.rr(g, x * S + 1.5, y * S + 1.5, S - 3, S - 3, 6); g.fillStyle = base; g.fill();
    g.fillStyle = 'rgba(255,255,255,' + (0.025 + n * 0.02) + ')'; ART.rr(g, x * S + 3, y * S + 3, S - 6, S * 0.22, 4); g.fill();
    if (q.ch === '+') {   /* puente: surco en cruz para leer que por ahí se cruzan dos tuberías */
      g.fillStyle = 'rgba(120,170,255,.16)'; const w = S * 0.36;
      g.fillRect(x * S + 2, y * S + (S - w) / 2, S - 4, w); g.fillRect(x * S + (S - w) / 2, y * S + 2, w, S - 4);
      g.fillStyle = 'rgba(255,255,255,.18)'; for (const [a, b] of [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]]) { g.beginPath(); g.arc(x * S + a * S, y * S + b * S, S * 0.05, 0, R2); g.fill(); }
    }
  });
  return cv;
}
/* Sprites cacheados (pieza única: silueta continua, cel shading de 3 tonos, un brillo). */
const SPR = {};
function sprite(key, R, fn) { let q = SPR[key]; if (q) return q; const d = Math.ceil(R * 2 * CDPR); q = document.createElement('canvas'); q.width = q.height = d; const g = q.getContext('2d'); g.scale(d / (R * 2), d / (R * 2)); g.translate(R, R); fn(g); q._R = R; SPR[key] = q; return q; }
const blit = (q, x, y, sc, rot) => { const R = q._R * (sc || 1); if (rot) { c.save(); c.translate(x, y); c.rotate(rot); c.drawImage(q, -R, -R, R * 2, R * 2); c.restore(); } else c.drawImage(q, x - R, y - R, R * 2, R * 2); };
function endSprite(i, r) {
  return sprite('e' + i + '|' + Math.round(r), r * 1.5, (g) => {
    const body = (h) => { h.moveTo(r, 0); h.arc(0, 0, r, 0, R2); }, parts = [[body, COL[i]]];
    contact(g, 0, r * 0.88, r * 0.78, r * 0.24, 0.32); uni(g, parts, 1.5); celp(g, parts, COL[i], r * 0.42, r * 0.42);
    spec(g, -r * 0.4, -r * 0.5, r * 0.26, r * 0.14, -0.6, 0.72);
  });
}
function gemSprite(i, r) {
  return sprite('g' + i + '|' + Math.round(r), r * 1.6, (g) => {
    const body = (h) => { h.moveTo(0, -r); h.lineTo(r * 0.85, -r * 0.2); h.lineTo(0, r); h.lineTo(-r * 0.85, -r * 0.2); h.closePath(); }, parts = [[body, COL[i]]];
    contact(g, 0, r * 0.95, r * 0.6, r * 0.18, 0.35); uni(g, parts, 1.3); celp(g, parts, COL[i], r * 0.3, r * 0.3);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(-r * 0.85, -r * 0.2); g.lineTo(r * 0.85, -r * 0.2); g.lineTo(0, -r); g.closePath(); g.fill();
    spec(g, -r * 0.22, -r * 0.45, r * 0.16, r * 0.08, -0.6, 0.8);
  });
}
function signSprite(type, ok, r) {
  return sprite('s' + type + (ok ? 1 : 0) + '|' + Math.round(r), r * 1.6, (g) => {
    const base = type === 1 ? (ok ? '#e9fff1' : '#f4f1ff') : (ok ? '#2f6b4a' : '#2a2346');
    const body = (h) => { h.moveTo(r, 0); h.arc(0, 0, r, 0, R2); }, parts = [[body, base]];
    contact(g, 0, r * 0.9, r * 0.7, r * 0.2, 0.35); uni(g, parts, 1.3); celp(g, parts, base, r * 0.3, r * 0.3);
    g.strokeStyle = type === 1 ? '#2a2346' : '#f4f1ff'; g.lineWidth = r * 0.26; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    if (type === 1) { g.moveTo(-r * 0.48, -r * 0.2); g.lineTo(r * 0.48, -r * 0.2); g.moveTo(-r * 0.48, r * 0.22); g.lineTo(r * 0.48, r * 0.22); }
    else { g.moveTo(-r * 0.36, -r * 0.5); g.lineTo(-r * 0.36, r * 0.3); g.lineTo(r * 0.48, r * 0.3); }
    g.stroke();
    spec(g, -r * 0.38, -r * 0.48, r * 0.2, r * 0.1, -0.6, type === 1 ? 0.9 : 0.45);
  });
}
function portalSprite(no, r) {
  return sprite('p' + no + '|' + Math.round(r), r * 1.3, (g) => {
    const col = PCOL[no] || '#5ce1e6';
    g.fillStyle = OUT; g.beginPath(); g.arc(0, 0, r * 1.08, 0, R2); g.fill();
    g.fillStyle = ART.dark(col, 0.55); g.beginPath(); g.arc(0, 0, r * 0.95, 0, R2); g.fill();
    g.strokeStyle = col; g.lineCap = 'round';
    for (let a = 0; a < 3; a++) { g.lineWidth = r * 0.16; g.beginPath(); for (let s = 0; s <= 14; s++) { const u = s / 14, ang = a * 2.094 + u * 3.2, rr = r * (0.88 - u * 0.72); s ? g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr) : g.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.14, 0, R2); g.fill();
  });
}
/* Ojos de los puntos y de la cabeza de la tubería: miran hacia donde van (personaje con carácter). */
function eyes(x, y, r, lx, ly, happy) {
  const ex = r * 0.34, ey = -r * 0.08, er = r * 0.24;
  if (happy) { c.strokeStyle = OUT; c.lineWidth = Math.max(1.5, r * 0.14); c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * ex, y + ey + er * 0.3, er * 0.7, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); } return; }
  const d = Math.hypot(lx, ly) || 1, ox = lx / d * er * 0.42, oy = ly / d * er * 0.42;
  for (const s of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x + s * ex, y + ey, er * 0.8, er, 0, 0, R2); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(x + s * ex + ox, y + ey + oy, er * 0.48, 0, R2); c.fill(); }
}
/* Trozos dibujables de una tubería: se parte en cada salto de portal. */
function segs(pa) { const out = []; let curS = [pa[0]]; for (let i = 1; i < pa.length; i++) { if (M.nodes[pa[i - 1]].tw === pa[i]) { out.push(curS); curS = [pa[i]]; } else curS.push(pa[i]); } out.push(curS); return out; }
function strokePoly(sg, w, col, dy) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); for (let i = 0; i < sg.length; i++) { const [x, y] = ctr(sg[i]); i ? c.lineTo(x, y + (dy || 0)) : c.moveTo(x, y + (dy || 0)); } if (sg.length === 1) { const [x, y] = ctr(sg[0]); c.lineTo(x + 0.01, y + (dy || 0)); } c.stroke(); }
let bokeh = null;
function draw() {
  if (!M) return;
  if (!bgCv) bgCv = renderBg();
  c.drawImage(bgCv, 0, 0, k.W, k.H);
  /* fondo vivo: luces suaves que flotan (desaturadas: lo jugable manda) */
  if (!bokeh) { bokeh = []; for (let i = 0; i < 9; i++) bokeh.push([((i * 0.37) % 1), ((i * 0.61 + 0.2) % 1), 30 + (i % 4) * 22, 0.2 + (i % 3) * 0.12, i * 1.7]); }
  for (const b of bokeh) { const x = ((b[0] + t * 0.006 * b[3]) % 1) * k.W, y = b[1] * k.H + Math.sin(t * b[3] + b[4]) * 18; c.globalAlpha = 0.05; c.fillStyle = '#8fa0ff'; c.beginPath(); c.arc(x, y, b[2], 0, R2); c.fill(); }
  c.globalAlpha = 1;
  c.drawImage(boardCv, OX - boardCv._p, OY - boardCv._p, boardCv._w, boardCv._h);
  const wave = winT ? (1.3 - winT) : 0;
  /* tinte de las casillas ocupadas */
  for (let col = 0; col < paths.length; col++) { const pa = paths[col]; if (pa.length < 2) continue; c.fillStyle = COL[col]; c.globalAlpha = connected(col) ? 0.2 : 0.1; for (const v of pa) { const n = M.nodes[v]; if (n.p === 2) continue; ART.rr(c, OX + n.x * S + 2, OY + n.y * S + 2, S - 4, S - 4, 6); c.fill(); } }
  c.globalAlpha = 1;
  /* portales (giran) */
  for (const id in M.cell) { const q = M.cell[id]; if (q.ch >= '1' && q.ch <= '9') { const n = M.nodes[q.ids[0]], warnIt = warn && warn.v === q.ids[0]; blit(portalSprite(q.ch, S * 0.36), OX + (n.x + 0.5) * S, OY + (n.y + 0.5) * S, warnIt ? 1.15 : 1, t * 2.2 * (q.ch === '2' ? -1 : 1)); } }
  /* tuberías: contorno, color y brillo (cada trozo de una vez: pieza única) */
  c.lineCap = 'round'; c.lineJoin = 'round';
  const pw = S * 0.38;
  for (let col = 0; col < paths.length; col++) {
    const pa = paths[col]; if (pa.length < 2) continue;
    const pulse = winT ? 1 + 0.18 * Math.max(0, Math.sin(wave * 9 - col * 0.8)) : hinted[col] > 0 ? 1 + 0.2 * Math.sin(t * 20) : 1, w = pw * pulse;
    for (const sg of segs(pa)) { strokePoly(sg, w + 6, OUT); strokePoly(sg, w, COL[col]); strokePoly(sg, w * 0.26, 'rgba(255,255,255,.42)', -w * 0.2); }
  }
  /* puentes: la mitad horizontal pasa por encima, con sombra sobre la de abajo */
  for (const id in M.cell) {
    const q = M.cell[id]; if (q.ch !== '+') continue;
    const hN = q.ids[0], o = own[hN]; if (o < 0) continue;
    const n = M.nodes[hN], x0 = OX + n.x * S, y = OY + (n.y + 0.5) * S, w = pw * (winT ? 1 + 0.18 * Math.max(0, Math.sin(wave * 9 - o * 0.8)) : 1);
    c.fillStyle = 'rgba(8,6,20,.45)'; c.fillRect(x0 + 1, y - w / 2 - 1, S - 2, w + 8);
    c.fillStyle = OUT; c.fillRect(x0, y - w / 2 - 3, S, w + 6);
    c.fillStyle = COL[o]; c.fillRect(x0, y - w / 2, S, w);
    c.fillStyle = 'rgba(255,255,255,.42)'; c.fillRect(x0, y - w * 0.33, S, w * 0.26);
  }
  /* marcas: gemas y señales (encima de la tubería para que se lean siempre) */
  for (const n of M.nodes) {
    if (n.req < 0 && !n.sign) continue;
    const x = OX + (n.x + 0.5) * S, y = OY + (n.y + 0.5) * S, w2 = warn && warn.v === n.id ? Math.sin(t * 50) * 3 : 0;
    if (n.req >= 0) { const ok = own[n.id] === n.req; if (ok) { c.globalAlpha = 0.35 + 0.2 * Math.sin(t * 5); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, S * 0.3, 0, R2); c.fill(); c.globalAlpha = 1; } blit(gemSprite(n.req, S * 0.2), x + w2, y, ok ? 1 + 0.06 * Math.sin(t * 6) : 1); if (w2) { c.strokeStyle = '#ff6f8a'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, S * 0.36, 0, R2); c.stroke(); } }
    else { const ok = signOk(n.id); blit(signSprite(n.sign, ok, S * 0.19), x + w2, y); if (w2) { c.strokeStyle = '#ff6f8a'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, S * 0.34, 0, R2); c.stroke(); } }
  }
  /* puntos con cara: miran a su pareja o a la cabeza de su tubería; contentos al unirse */
  for (let col = 0; col < M.nc; col++) {
    const ok = connected(col), pa = paths[col], hd = pa[pa.length - 1];
    for (const v of M.ends[col]) {
      const [x, y] = ctr(v), r = S * 0.33, gl = conn[col] > 0 ? conn[col] : 0;
      if (ok || gl) { c.globalAlpha = Math.min(0.6, 0.22 + 0.1 * Math.sin(t * 4 + col) + gl); c.fillStyle = COL[col]; c.beginPath(); c.arc(x, y, r * 1.45 + gl * 16, 0, R2); c.fill(); c.globalAlpha = 1; }
      const sc = gl ? 1 + gl * 0.25 : 1; blit(endSprite(col, r), x, y, sc);
      const tg = drag === col && hd !== v ? ctr(hd) : ctr(other(col, v));
      eyes(x, y, r * sc, tg[0] - x, tg[1] - y, ok);
    }
  }
  /* cabeza de la tubería que se está dibujando: una gota con ojos que mira hacia el dedo */
  if (drag >= 0) {
    const pa = paths[drag], hd = pa[pa.length - 1];
    if (M.nodes[hd].end < 0) { const [x, y] = ctr(hd), r = S * 0.24; c.fillStyle = OUT; c.beginPath(); c.arc(x, y, r + 2.5, 0, R2); c.fill(); c.fillStyle = COL[drag]; c.beginPath(); c.arc(x, y, r, 0, R2); c.fill(); eyes(x, y, r, k.ptr.x - x, k.ptr.y - y, false); }
    if (!kbd && k.ptr.down) { c.globalAlpha = 0.22; c.fillStyle = COL[drag]; c.beginPath(); c.arc(k.ptr.x, k.ptr.y, S * 0.62, 0, R2); c.fill(); c.globalAlpha = 1; }
  }
  if (kbd && !winT) { const x = OX + cur[0] * S, y = OY + cur[1] * S; c.strokeStyle = drag >= 0 ? COL[drag] : '#fff'; c.lineWidth = 3; c.setLineDash([6, 4]); ART.rr(c, x + 2, y + 2, S - 4, S - 4, 8); c.stroke(); c.setLineDash([]); }
  drawHud(); drawButtons();
  if (winT) { const a = Math.min(1, (1.3 - winT) * 4); c.save(); c.globalAlpha = a; c.translate(k.W / 2, OY + S * M.NH / 2); const sc = 0.7 + 0.3 * a; c.scale(sc, sc); label(level === LVS.length ? '¡Lo has llenado todo!' : '¡Tablero completo!', 0, 0, Math.min(36, k.W / 12), '#fff38a', 'center', 'middle'); c.restore(); }
}
function signOk(v) {
  const o = own[v]; if (o < 0) return false; const pa = paths[o], i = pa.indexOf(v); if (i <= 0 || i >= pa.length - 1) return false;
  const a = FLOWLV.dirOf(M, pa[i - 1], v), b = FLOWLV.dirOf(M, v, pa[i + 1]); return M.nodes[v].sign === 1 ? a === b : a % 2 !== b % 2;
}
function drawHud() {
  const L = k.ex(24), R = k.ex2(24), narrow = k.W < 420;
  const nconn = M.ends.filter((_, i) => connected(i)).length, pct = Math.floor(filled() / own.length * 100);
  c.font = '800 11px ui-rounded,"Trebuchet MS",sans-serif'; c.textBaseline = 'top'; c.textAlign = 'left'; c.fillStyle = '#aab4ea';
  c.fillText(`NIVEL ${level} / ${LVS.length}`, L, 16);
  const tw = G.t ? 86 : 0;
  /* sin el reproductor del portal, kit pinta pausa y sonido arriba en el centro: el título no lo pisa */
  const cx = !k.extHud && !k.party ? k.W / 2 - 54 : R - tw - 8;
  label(lv.n, L, 30, fit(lv.n, narrow ? 17 : 19, Math.min(R - tw - 8, cx) - L), '#fff');
  if (G.t) {
    const s = Math.max(0, Math.ceil(timeLeft)), low = timeLeft < 10, txt = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    const sc = low ? 1 + 0.08 * Math.max(0, Math.sin(t * 12)) : 1;
    c.save(); c.translate(R - 34, 34); c.scale(sc, sc);
    ART.rr(c, -44, -18, 88, 36, 12); ART.fillOut(c, low ? '#7a2034' : '#232a58', 2.5);
    label(txt, 4, 1, 21, low ? '#ffd0d0' : '#fff', 'center', 'middle');
    c.fillStyle = low ? '#ff9aa8' : '#9aa6e6'; c.beginPath(); c.arc(-28, 0, 7, 0, R2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(-28, 0); c.lineTo(-28, -5); c.moveTo(-28, 0); c.lineTo(-24, 2); c.stroke();
    c.restore();
  }
  /* segunda fila: metas visibles (flujos, lleno y trazos frente al objetivo). La idea del nivel
     (primeros segundos) y los avisos ocupan esa fila un momento, sin tapar el tablero. */
  const y = TOP - 22;
  const note = msgT > 0 && !winT ? [msg, '#ffd0a0', Math.min(1, msgT / 0.3)] : tipT > 0 && !winT && lv.i ? [lv.i, '#fff38a', Math.min(1, tipT / 0.5)] : null;
  if (note) { c.save(); c.globalAlpha = note[2]; label(note[0], k.W / 2, y - 1, fit(note[0], narrow ? 13 : 15, R - L), note[1], 'center'); c.restore(); if (note[2] >= 1) return drawBar(pct); c.globalAlpha = 1 - note[2]; }
  const barRoom = OY + S * M.NH + 24 < Math.min(BY, k.H) - 4;
  const s1 = `Flujos ${nconn}/${M.nc}` + (barRoom ? '' : ` · ${pct} %`), s3 = `Trazos ${strokes}/${strokes <= G.s3 && !usedHint ? G.s3 : G.s2}`;
  const z = narrow ? 13 : 14;
  label(s1, L, y, z, nconn === M.nc ? '#7cf7a0' : '#ffd23d');
  label(s3, R, y, z, strokes <= G.s3 && !usedHint ? '#ffd166' : strokes <= G.s2 ? '#cfd6ff' : '#ff9aa8', 'right');
  c.globalAlpha = 1; drawBar(pct);
}
/* barra de llenado bajo el tablero: meta visible */
function drawBar(pct) {
  const bx = OX, bw = S * M.NW, by = OY + S * M.NH + 10;
  if (by + 14 < Math.min(BY, k.H) - 4) {
    const tw2 = 52, bb = bw - tw2;
    c.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(c, bx, by, bb, 8, 4); c.fill(); c.fillStyle = pct === 100 ? '#7cf7a0' : '#a097ff'; ART.rr(c, bx, by, Math.max(8, bb * pct / 100), 8, 4); c.fill();
    label(pct + ' %', bx + bw, by - 5, 15, pct === 100 ? '#7cf7a0' : '#fff', 'right');
  }
}
function drawButtons() {
  for (const [kind, x, BY, w] of BTN) {
    const off = kind === 'undo' ? !hist.length : kind === 'hint' ? hintsLeft <= 0 || !lv.s : false;
    c.globalAlpha = off ? 0.45 : 1;
    c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, x, BY + 4, w, BH, 14); c.fill();
    ART.rr(c, x, BY, w, BH, 14); ART.fillOut(c, kind === 'undo' ? '#6e62f5' : kind === 'restart' ? '#e0795a' : '#2f9e6a', 2.5);
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x + 12, BY + 4, w - 24, 4);
    const txt = kind === 'undo' ? 'Deshacer' : kind === 'restart' ? 'Reiniciar' : `Pista ${hintsLeft}`;
    label(txt, x + w / 2, BY + BH / 2 + 1, fit(txt, 16, w - 16), '#fff', 'center', 'middle');
    c.globalAlpha = 1;
  }
}
