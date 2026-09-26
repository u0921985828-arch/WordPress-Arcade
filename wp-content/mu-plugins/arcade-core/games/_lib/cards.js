/* Solitarios: toca una carta para moverla al mejor sitio o arrástrala. CFG.mode: 'klondike' | 'spider' | 'freecell' | 'pyramid' | 'tripeaks'
 * Cartas cacheadas con relieve y figuras dibujadas, vuelo interpolado y volteo, pistas, autocompletar y cascada final. */
const M = CFG.mode, W = 480, H = 680, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#07321f' }), c = k.ctx;
const RN = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const red = (cd) => cd.s === 1 || cd.s === 2;
let idleH = 0, tab, stock, waste, found, cells, hs, moves, score, sel, done, removed, pyr, peaks, deals, recycles, streak, hist, comp, disc, time, auto, autoT, drag, hintT, hintR, cur, kbd, casc, newAsk, stuckT, uid = 0;
const CW = M === 'spider' ? 44 : M === 'freecell' ? 54 : M === 'tripeaks' ? 46 : 60, CH = Math.round(CW * 1.4), CR = Math.round(CW * 0.1), PAD = 7;
const NC = M === 'spider' ? 10 : M === 'freecell' ? 8 : 7, GAP = (W - NC * CW) / (NC + 1), colX = (i) => GAP + i * (CW + GAP);
const TOP = 58, TY = TOP + CH + 22, BOT = 632, BY = 640;
const SPAWN = { klondike: [colX(0), TOP], spider: [colX(9), TOP], freecell: [W / 2 - CW / 2, H + 30], pyramid: [70, 468], tripeaks: [130, 400] }[M];
function deck(n, suits) { const d = []; for (let i = 0; i < n; i++) for (const s of suits) for (let r = 1; r <= 13; r++) d.push({ r, s, up: false, id: uid++ }); return k.shuffle(d); }
/* Dificultad: las REGLAS del solitario no se tocan (Spider 2 palos, Klondike robo 1, Pyramid 2 reciclados…);
   cambian las ayudas: pista automática al quedarse parado y cuántos deshacer quedan. */
const IDLEH = () => (k.dif === 0 ? 8 : k.dif === 2 ? 1e9 : 15);
const HINTT = () => (k.dif === 0 ? 4 : 2.4);
let undoLeft = Infinity;
function build() {
  undoLeft = k.dif === 2 ? 3 : Infinity;
  moves = 0; sel = null; done = false; hist = []; found = [[], [], [], []]; cells = [null, null, null, null]; waste = []; streak = 0; comp = []; disc = []; time = 0;
  auto = false; autoT = 0; drag = null; hintT = 0; hintR = null; casc = null; newAsk = 0; stuckT = 0; AP.clear(); spawnQ = 0.25;
  if (M === 'klondike') { const d = deck(1, [0, 1, 2, 3]); tab = []; for (let i = 0; i < 7; i++) { tab.push(d.splice(0, i + 1)); tab[i][i].up = true; } stock = d; recycles = 0; }
  if (M === 'spider') { const d = deck(4, [0, 1]); tab = []; for (let i = 0; i < 10; i++) { tab.push(d.splice(0, i < 4 ? 6 : 5)); tab[i][tab[i].length - 1].up = true; } stock = d; removed = 0; }
  if (M === 'freecell') { const d = deck(1, [0, 1, 2, 3]); d.forEach((cd) => (cd.up = true)); tab = Array.from({ length: 8 }, () => []); d.forEach((cd, i) => tab[i % 8].push(cd)); stock = []; }
  if (M === 'pyramid') { const d = deck(1, [0, 1, 2, 3]); pyr = []; for (let r = 0; r < 7; r++) { pyr.push(d.splice(0, r + 1)); pyr[r].forEach((cd) => (cd.up = true)); } stock = d; recycles = 0; }
  if (M === 'tripeaks') { const d = deck(1, [0, 1, 2, 3]); peaks = [d.splice(0, 3), d.splice(0, 6), d.splice(0, 9), d.splice(0, 10)]; peaks[3].forEach((cd) => (cd.up = true)); stock = d; waste = [stock.pop()]; waste[0].up = true; }
}
function snapshot() { hist.push(JSON.stringify({ tab, stock, waste, found, cells, pyr, peaks, removed, recycles, score, streak, comp, disc })); if (hist.length > 80) hist.shift(); hintR = null; }
function undo() { if (!hist.length || auto || undoLeft <= 0) { if (hist.length && undoLeft <= 0) { k.float('Sin deshacer', W / 2, 600, '#ffe27a'); k.sfx('hurt'); } return; } undoLeft--; const s = JSON.parse(hist.pop()); ({ tab, stock, waste, found, cells, pyr, peaks, removed, recycles, score, streak, comp, disc } = s); moves++; sel = null; stuckT = 0; hintR = null; k.sfx('click'); }
function flipTops() { if (tab) for (const col of tab) if (col.length && !col[col.length - 1].up) { col[col.length - 1].up = true; if (M === 'klondike') score += 5; } }
const fits = (f, cd) => (!f.length && cd.r === 1) || (f.length > 0 && f[f.length - 1].s === cd.s && f[f.length - 1].r === cd.r - 1);
function canFound(cd) { return found.findIndex((f) => fits(f, cd)); }
function tabOk(stack, col, kind) { const top = col[col.length - 1], b = stack[0]; if (!top) return kind === 'spider' ? true : b.r === 13 || M === 'freecell'; if (!top.up) return false; return top.r === b.r + 1 && (M === 'spider' ? true : red(top) !== red(b)); }
function validRun(stack) { for (let i = 0; i < stack.length - 1; i++) { const a = stack[i], b = stack[i + 1]; if (!b.up || a.r !== b.r + 1 || (M === 'spider' ? a.s !== b.s : red(a) === red(b))) return false; } return stack.every((q) => q.up); }
function freeCellCap(targetEmpty) { const fc = cells.filter((q) => !q).length, ec = tab.filter((q) => !q.length).length - (targetEmpty ? 1 : 0); return (fc + 1) * Math.pow(2, Math.max(0, ec)); }
/* ¿Se puede soltar el grupo en el destino? */
function canDrop(stack, from, d) {
  if (d.t === 'found') return M !== 'spider' && stack.length === 1 && from.t !== 'found' && fits(found[d.i], stack[0]);
  if (d.t === 'cell') return M === 'freecell' && stack.length === 1 && !cells[d.i] && from.t !== 'cell';
  if (from.t === 'tab' && from.i === d.i) return false;
  const col = tab[d.i]; if (!tabOk(stack, col, M)) return false;
  if (M === 'freecell' && stack.length > freeCellCap(!col.length)) return false;
  if (M === 'klondike' && !col.length && from.t === 'tab' && from.idx === 0) return false;
  return true;
}
function findDest(stack, from) {
  if (stack.length === 1 && M !== 'spider' && from.t !== 'found') { const f = canFound(stack[0]); if (f >= 0) return { t: 'found', i: f }; }
  const pri = (i) => (tab[i].length ? 0 : 2) + (M === 'spider' && tab[i].length && tab[i][tab[i].length - 1].s !== stack[0].s ? 1 : 0);
  const order = tab.map((col, i) => i).sort((a, b) => pri(a) - pri(b));
  for (const i of order) if (canDrop(stack, from, { t: 'tab', i })) return { t: 'tab', i };
  if (M === 'freecell' && stack.length === 1 && from.t !== 'cell') { const e = cells.indexOf(null); if (e >= 0) return { t: 'cell', i: e }; }
  return null;
}
function doMove(stack, from, d) {
  snapshot(); take(from, stack.length); hintR = null;
  if (d.t === 'found') { found[d.i].push(stack[0]); score += 10; k.sfx('pop'); const r = SL.found[d.i]; if (r) { k.float('+10', r.x + CW / 2, r.y + CH / 2, '#ffe27a'); k.burst(r.x + CW / 2, r.y + CH / 2, '#ffe27a', 8, 90); } }
  else if (d.t === 'cell') { cells[d.i] = stack[0]; k.sfx('click'); }
  else { tab[d.i].push(...stack); score += 5; k.sfx('click'); if (M === 'spider') checkRun(d.i); }
  checkWin(); if (!done && !auto && autoOk()) { auto = true; autoT = 0.35; k.float('Autocompletar', W / 2, H / 2, '#ffe27a'); }
}
function tryMove(stack, from) { const d = findDest(stack, from); if (!d) return false; doMove(stack, from, d); return true; }
function take(from, n) { if (from.t === 'tab') tab[from.i].splice(tab[from.i].length - n, n); else if (from.t === 'waste') waste.pop(); else if (from.t === 'cell') cells[from.i] = null; else if (from.t === 'found') found[from.i].pop(); flipTops(); moves++; }
function checkRun(i) { const col = tab[i]; if (col.length < 13) return; const run = col.slice(-13); if (run[0].r === 13 && validRun(run)) { comp.push(col.splice(-13)); removed++; score += 100; k.sfx('coin'); const x = colX(i) + CW / 2; k.burst(x, TY + 60, '#ffe27a', 16, 150); k.float('+100', x, TY + 40, '#ffe27a'); flipTops(); } }
/* Autocompletar: todas las cartas se pueden subir en orden */
function autoOk() { if (M === 'klondike') return !stock.length && !waste.length && tab.every((col) => col.every((q) => q.up)); if (M === 'freecell') return tab.every((col) => col.every((q, i) => !i || col[i - 1].r >= q.r)); return false; }
function autoStep() {
  const src = []; if (waste.length) src.push([waste[waste.length - 1], { t: 'waste' }]); cells.forEach((q, i) => q && src.push([q, { t: 'cell', i }])); tab.forEach((col, i) => col.length && src.push([col[col.length - 1], { t: 'tab', i, idx: col.length - 1 }]));
  src.sort((a, b) => a[0].r - b[0].r); for (const [cd, from] of src) { const f = canFound(cd); if (f >= 0) { doMove([cd], from, { t: 'found', i: f }); return true; } } return false;
}
function win() { done = true; auto = false; score += 500; startCascade(); }
function finishWin() { casc = null; k.st = 'over'; k.show('¡Ganaste!', `${moves} movimiento${moves === 1 ? "" : "s"} · ${fmt(time)} · ${score} puntos · Récord ${k.best(CFG.id, score)}<br>Toca para una partida nueva`); }
function checkWin() { if (done) return; if (M === 'spider' && removed === 8) win(); if ((M === 'klondike' || M === 'freecell') && found.every((f) => f.length === 13)) win(); if (M === 'pyramid' && pyr.every((r) => r.every((q) => !q))) win(); if (M === 'tripeaks' && peaks.every((r) => r.every((q) => !q))) win(); }
function pyrFree(r, j) { if (!pyr[r][j]) return false; if (r === 6) return true; return !pyr[r + 1][j] && !pyr[r + 1][j + 1]; }
function peakFree(r, j) { if (!peaks[r][j]) return false; if (r === 3) return true; const cov = r === 0 ? [2 * j, 2 * j + 1] : r === 1 ? [j + Math.floor(j / 2), j + Math.floor(j / 2) + 1] : [j, j + 1]; return cov.every((q) => !peaks[r + 1][q]); }
/* Sin jugadas posibles en Pyramid / TriPeaks → fin de partida */
function pyrPairs() { const fr = []; pyr.forEach((row, r) => row.forEach((q, j) => q && pyrFree(r, j) && fr.push(q))); if (waste.length) fr.push(waste[waste.length - 1]); const o = []; fr.forEach((a, i) => { if (a.r === 13) o.push([a]); for (let j = i + 1; j < fr.length; j++) if (a.r + fr[j].r === 13) o.push([a, fr[j]]); }); return o; }
function peakPlays() { const top = waste[waste.length - 1], o = []; peaks.forEach((row, r) => row.forEach((q, j) => { if (q && peakFree(r, j)) { const d = Math.abs(q.r - top.r); if (d === 1 || d === 12) o.push(q); } })); return o; }
function stuckCheck() { if (done) return; const st = M === 'pyramid' ? !stock.length && (recycles >= 2 || !waste.length) && !pyrPairs().length : M === 'tripeaks' ? !stock.length && !peakPlays().length : false; if (st) stuckT = 1.1; }
function reset() { score = 0; build(); }
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* ---------- Pistas ---------- */
const rc = (cd) => { const p = RC.get(cd.id); return p && { x: p.x, y: p.y, w: CW, h: CH }; };
const slotR = (r) => r && { x: r.x, y: r.y, w: CW, h: CH };
function findHint() {
  if (M === 'pyramid') { const p = pyrPairs()[0]; if (p) return p.map(rc); return stock.length || (recycles < 2 && waste.length) ? [slotR(SL.stock)] : null; }
  if (M === 'tripeaks') { const p = peakPlays()[0]; if (p) return [rc(p), rc(waste[waste.length - 1]) || slotR(SL.waste)]; return stock.length ? [slotR(SL.stock)] : null; }
  const cands = []; if (waste.length) cands.push([[waste[waste.length - 1]], { t: 'waste' }]); cells.forEach((q, i) => q && cands.push([[q], { t: 'cell', i }]));
  tab.forEach((col, i) => col.forEach((q, idx) => { if (q.up && validRun(col.slice(idx))) cands.push([col.slice(idx), { t: 'tab', i, idx }]); }));
  let best = null, bs = 0;
  for (const [st, from] of cands) {
    if (st.length === 1 && M !== 'spider') { const f = canFound(st[0]); if (f >= 0 && 10 > bs) { bs = 10; best = [rc(st[0]), slotR(SL.found[f])]; } }
    for (let i = 0; i < tab.length; i++) { if (!canDrop(st, from, { t: 'tab', i })) continue; let s = 4;
      if (from.t === 'tab') { const above = tab[from.i][from.idx - 1]; s = !above ? (tab[i].length ? 3 : 0) : !above.up ? 6 : validRun([above, st[0]]) ? 0 : 2; }
      if (!tab[i].length) s = Math.min(s, M === 'klondike' ? s : 1);
      if (M === 'spider' && tab[i].length && tab[i][tab[i].length - 1].s === st[0].s) s += 1;
      if (M === 'spider' && from.t === 'tab') { const ab = tab[from.i][from.idx - 1]; if (ab && ab.up && ab.r === st[0].r + 1) s = ab.s !== st[0].s && tab[i].length && tab[i][tab[i].length - 1].s === st[0].s ? 3 : 0; }
      if (s > bs) { bs = s; const col = tab[i]; best = [rc(st[0]), col.length ? rc(col[col.length - 1]) : slotR(SL.tab[i])]; } }
  }
  if (best) return best;
  // FreeCell: sugiere liberar la carta más baja que quede a menos profundidad usando una celda
  if (M === 'freecell' && cells.includes(null)) { let bi = -1, bv = 1e9; tab.forEach((col, i) => col.forEach((q, idx) => { const v = q.r * 3 + (col.length - 1 - idx) * 4; if (col.length > 1 && idx < col.length - 1 && v < bv) { bv = v; bi = i; } }));
    if (bi >= 0) { const col = tab[bi]; return [rc(col[col.length - 1]), slotR(SL.cells[cells.indexOf(null)])]; } }
  if ((M === 'klondike' && (stock.length || waste.length)) || (M === 'spider' && stock.length)) return [slotR(SL.stock)];
  return null;
}
function showHint() { const h = findHint(); if (!h || !h[0]) { k.float(M === 'freecell' && cells.includes(null) ? 'Prueba a pasar una carta a una celda' : 'Sin movimientos útiles', W / 2, 600, '#ffe27a'); k.sfx('hurt'); return; } hintR = h.filter(Boolean); hintT = HINTT(); k.sfx('click'); }

/* ---------- Acciones de toque ---------- */
function act(h) {
  if (!h) { sel = null; return; }
  if (h.a === 'undo') return undo();
  if (h.a === 'hint') return showHint();
  if (h.a === 'new') { if (newAsk > 0) { reset(); k.sfx('start'); } else { newAsk = 2.2; k.float('Toca otra vez para repartir', W / 2, 610, '#fff'); } return; }
  if (auto) return;
  if (h.a === 'stock') {
    if (M === 'klondike') { snapshot(); if (stock.length) { const cd = stock.pop(); cd.up = true; waste.push(cd); k.sfx('click'); } else if (waste.length) { stock = waste.reverse().map((q) => ({ ...q, up: false })); waste = []; score = Math.max(0, score - 20); k.sfx('pop'); } moves++; }
    if (M === 'spider' && stock.length) { if (!tab.every((q) => q.length)) { k.float('Llena antes las columnas vacías', W / 2, 600, '#ffe27a'); navigator.vibrate && navigator.vibrate(20); return; }
      snapshot(); tab.forEach((col, i) => { const cd = stock.pop(); cd.up = true; col.push(cd); const a = AP.get(cd.id); if (a) a.d = i * 0.05; }); tab.forEach((_, i) => checkRun(i)); moves++; k.sfx('shoot'); }
    if (M === 'pyramid') { if (stock.length) { snapshot(); const cd = stock.pop(); cd.up = true; waste.push(cd); moves++; k.sfx('click'); } else if (recycles < 2 && waste.length) { snapshot(); stock = waste.reverse(); stock.forEach((q) => (q.up = false)); waste = []; recycles++; moves++; k.sfx('pop'); } sel = null; stuckCheck(); }
    if (M === 'tripeaks' && stock.length) { snapshot(); const cd = stock.pop(); cd.up = true; waste.push(cd); streak = 0; moves++; k.sfx('click'); stuckCheck(); }
    checkWin(); return; }
  if (M === 'pyramid') { const cd = h.a === 'pyr' ? pyr[h.r][h.j] : h.a === 'waste' ? waste[waste.length - 1] : null; if (!cd) { sel = null; return; } const ref = h.a === 'pyr' ? { r: h.r, j: h.j } : { w: 1 };
    const rm = (q) => { let x; if (q.w) x = waste.pop(); else { x = pyr[q.r][q.j]; pyr[q.r][q.j] = null; } disc.push(x); const p = RC.get(x.id); if (p) k.burst(p.x + CW / 2, p.y + CH / 2, '#ffe27a', 8, 100); };
    const same = sel && JSON.stringify(sel) === JSON.stringify(ref);
    if (cd.r === 13) { snapshot(); rm(ref); score += 15; sel = null; moves++; k.sfx('coin'); }
    else if (sel && !same) { const o = sel.w ? waste[waste.length - 1] : pyr[sel.r][sel.j]; if (o && o.r + cd.r === 13) { snapshot(); rm(sel); rm(ref); score += 25; moves++; k.sfx('coin'); const p = RC.get(cd.id); if (p) k.float('+25', p.x + CW / 2, p.y, '#ffe27a'); } else { sel = ref; k.sfx('click'); return; } sel = null; }
    else { sel = same ? null : ref; k.sfx('click'); }
    checkWin(); stuckCheck(); return; }
  if (M === 'tripeaks') { if (h.a !== 'peak') return; const cd = peaks[h.r][h.j], top = waste[waste.length - 1]; const d = Math.abs(cd.r - top.r);
    if (d === 1 || d === 12) { snapshot(); peaks[h.r][h.j] = null; waste.push(cd); streak++; const pts = 10 * streak + (h.r === 0 ? 50 : 0); score += pts; const p = RC.get(cd.id); if (p) k.float(h.r === 0 ? `Cima +${pts}` : `+${pts}`, p.x + CW / 2, p.y, streak > 3 ? '#ffb0e0' : '#ffe27a');
      peaks.forEach((row, r) => row.forEach((q, j) => { if (q && peakFree(r, j)) q.up = true; })); moves++; k.sfx(streak > 3 ? 'coin' : 'pop'); checkWin(); stuckCheck(); }
    else navigator.vibrate && navigator.vibrate(20);
    return; }
  // Klondike / Spider / FreeCell: movimiento automático al mejor destino
  const g = grab(h); if (!g) return;
  if (!tryMove(g.stack, g.from)) navigator.vibrate && navigator.vibrate(20);
}
/* Grupo que se puede coger desde una zona */
function grab(h) {
  if (!h || auto) return null;
  if (h.a === 'tab') { const col = tab[h.i]; if (!col[h.idx] || !col[h.idx].up) return null; const stack = col.slice(h.idx); if (!validRun(stack)) return null; return { stack, from: { t: 'tab', i: h.i, idx: h.idx } }; }
  if (h.a === 'waste' && waste.length && M !== 'pyramid' && M !== 'tripeaks') return { stack: [waste[waste.length - 1]], from: { t: 'waste' } };
  if (h.a === 'cell' && cells[h.i]) return { stack: [cells[h.i]], from: { t: 'cell', i: h.i } };
  if (h.a === 'found' && M === 'klondike' && found[h.i].length) return { stack: [found[h.i][found[h.i].length - 1]], from: { t: 'found', i: h.i } };
  return null;
}
/* Destino bajo un punto al soltar */
function dropAt(x, y) {
  const inR = (r) => r && x >= r.x - GAP / 2 && x <= r.x + CW + GAP / 2 && y >= r.y - 10 && y <= r.y + CH + 10;
  for (let i = 0; i < 4; i++) { if (M !== 'spider' && inR(SL.found[i])) return { t: 'found', i }; if (M === 'freecell' && inR(SL.cells[i])) return { t: 'cell', i }; }
  if (y > TY - 30) for (let i = 0; i < tab.length; i++) { const r = SL.tab[i]; if (x >= r.x - GAP / 2 && x <= r.x + CW + GAP / 2) return { t: 'tab', i }; }
  return null;
}
const hitAt = (x, y) => hs && [...hs].reverse().find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
const hkey = (q) => q && `${q.a}|${q.i}|${q.idx}|${q.r}|${q.j}`;
function curH() { if (!hs || !hs.length) return null; const e = hs.find((q) => hkey(q) === cur); if (e) return e; const [a, i] = (cur || '').split('|'); const same = hs.filter((q) => q.a === a && String(q.i) === i && !q.dn); return same[same.length - 1] || hs.find((q) => !q.dn); }
function nav(dir) {
  const cu = curH(); if (!cu) return; if (!kbd) { kbd = true; cur = hkey(cu); return; }
  const cx = cu.x + cu.w / 2, cy = cu.y + Math.min(cu.h, 30) / 2; let best = null, bd = 1e9;
  for (const q of hs) { if (q === cu || q.dn) continue; const dx = q.x + q.w / 2 - cx, dy = q.y + Math.min(q.h, 30) / 2 - cy;
    const al = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy, pe = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx); if (al < 4) continue; const s = al + pe * 2.2; if (s < bd) { bd = s; best = q; } }
  if (best) { cur = hkey(best); k.sfx('click'); }
}


/* ================= Arte ================= */
/* --- color: mezcla en hexadecimal (solo en construcción de sprites) --- */
const hx2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function cmix(a, b, t) { const A = rgbOf(a), B = rgbOf(b); return '#' + hx2(A[0] + (B[0] - A[0]) * t) + hx2(A[1] + (B[1] - A[1]) * t) + hx2(A[2] + (B[2] - A[2]) * t); }
const LT = (h, t) => cmix(h, '#ffffff', t), DK = (h, t) => cmix(h, OUT, t);
/* ruido determinista (misma baraja siempre igual) */
let _sd = 1; const sr = () => ((_sd = (_sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const DT = CW >= 52; /* cartas grandes: admiten detalle fino */
const rrSub = (g, x, y, w, h, r) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

function suitPath(g, s, x, y, z) {
  g.save(); g.translate(x, y); g.scale(z, z); g.beginPath();
  if (s === 1) { g.moveTo(0, 0.45); g.bezierCurveTo(-0.15, 0.3, -0.52, 0.08, -0.52, -0.18); g.bezierCurveTo(-0.52, -0.42, -0.22, -0.52, 0, -0.28); g.bezierCurveTo(0.22, -0.52, 0.52, -0.42, 0.52, -0.18); g.bezierCurveTo(0.52, 0.08, 0.15, 0.3, 0, 0.45); }
  else if (s === 2) { g.moveTo(0, -0.5); g.quadraticCurveTo(0.12, -0.14, 0.4, 0); g.quadraticCurveTo(0.12, 0.14, 0, 0.5); g.quadraticCurveTo(-0.12, 0.14, -0.4, 0); g.quadraticCurveTo(-0.12, -0.14, 0, -0.5); }
  else if (s === 0) { g.moveTo(0, -0.5); g.bezierCurveTo(-0.15, -0.34, -0.52, -0.12, -0.52, 0.12); g.bezierCurveTo(-0.52, 0.34, -0.22, 0.4, -0.04, 0.2); g.lineTo(-0.16, 0.5); g.lineTo(0.16, 0.5); g.lineTo(0.04, 0.2); g.bezierCurveTo(0.22, 0.4, 0.52, 0.34, 0.52, 0.12); g.bezierCurveTo(0.52, -0.12, 0.15, -0.34, 0, -0.5); }
  else { for (const [cx, cy] of [[0, -0.24], [-0.23, 0.06], [0.23, 0.06]]) { g.moveTo(cx + 0.21, cy); g.arc(cx, cy, 0.21, 0, 6.283); } g.moveTo(-0.04, 0.05); g.lineTo(-0.15, 0.5); g.lineTo(0.15, 0.5); g.lineTo(0.04, 0.05); }
  g.closePath(); g.restore();
}
/* palo con volumen: degradado diagonal (luz arriba-izquierda), contorno y brillo */
function suit(g, s, x, y, z, col) {
  const gr = g.createLinearGradient(x - z * 0.45, y - z * 0.5, x + z * 0.45, y + z * 0.5);
  gr.addColorStop(0, LT(col, 0.44)); gr.addColorStop(0.42, col); gr.addColorStop(1, DK(col, 0.34));
  suitPath(g, s, x, y, z); g.fillStyle = gr; g.fill();
  if (z >= 7) {
    suitPath(g, s, x, y, z); g.lineWidth = Math.max(0.55, z * 0.04); g.strokeStyle = DK(col, 0.52); g.stroke();
    g.save(); suitPath(g, s, x, y, z); g.clip(); g.fillStyle = 'rgba(255,255,255,.34)';
    g.beginPath(); g.ellipse(x - z * 0.18, y - z * 0.19, z * 0.12, z * 0.2, -0.6, 0, 6.283); g.fill(); g.restore();
  }
}
/* textura de papel (una sola vez, se tesela con desfase por carta) */
const PAPER = (() => { const n = 72, cv = document.createElement('canvas'); cv.width = cv.height = n; const g = cv.getContext('2d');
  const im = g.createImageData(n, n); _sd = 17;
  for (let i = 0; i < n * n; i++) { const v = 118 + (sr() - 0.5) * 120, o = i * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = v; im.data[o + 3] = 20; }
  g.putImageData(im, 0, 0); return cv; })();
/* sprite de carta: sombra proyectada suave (varias pasadas, sin shadowBlur) */
function sprite(fn) { const cv = document.createElement('canvas'); cv.width = (CW + PAD * 2) * 2; cv.height = (CH + PAD * 2) * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(PAD, PAD);
  for (let i = 5; i >= 0; i--) { const s = i * 0.95; g.fillStyle = 'rgba(6,26,17,.055)'; ART.rr(g, -s * 0.55, 1.5 + i * 0.35 - s * 0.5, CW + s * 1.1, CH + s, CR + s * 0.5); g.fill(); }
  fn(g); return cv; }
/* cuerpo de la carta: papel con grano, bisel y brillo de borde */
function body(g, fill, seed) {
  ART.rr(g, 0, 0, CW, CH, CR);
  const gr = g.createLinearGradient(0, 0, CW * 0.55, CH); gr.addColorStop(0, LT(fill, 0.6)); gr.addColorStop(0.4, fill); gr.addColorStop(1, cmix(fill, '#b09a76', 0.34));
  g.fillStyle = gr; g.fill();
  g.save(); ART.rr(g, 0, 0, CW, CH, CR); g.clip();
  const ox = -((seed || 0) * 13 % 60), oy = -((seed || 0) * 29 % 60);
  for (let x = ox; x < CW; x += 72) for (let y = oy; y < CH; y += 72) g.drawImage(PAPER, x, y);
  g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.moveTo(0.8, CH - CR); g.lineTo(0.8, CR); g.quadraticCurveTo(0.8, 0.8, CR, 0.8); g.lineTo(CW - CR, 0.8); g.stroke();
  g.lineWidth = 1.4; g.strokeStyle = 'rgba(96,74,44,.3)'; g.beginPath(); g.moveTo(CW - 0.8, CR); g.lineTo(CW - 0.8, CH - CR); g.quadraticCurveTo(CW - 0.8, CH - 0.8, CW - CR, CH - 0.8); g.lineTo(CR, CH - 0.8); g.stroke();
  g.restore();
  ART.rr(g, 0.6, 0.6, CW - 1.2, CH - 1.2, CR); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
}
const PIPS = { 2: [[1, 0], [1, 1]], 3: [[1, 0], [1, 0.5], [1, 1]], 4: [[0, 0], [2, 0], [0, 1], [2, 1]], 5: [[0, 0], [2, 0], [1, 0.5], [0, 1], [2, 1]], 6: [[0, 0], [2, 0], [0, 0.5], [2, 0.5], [0, 1], [2, 1]],
  7: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [0, 1], [2, 1]], 8: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [1, 0.75], [0, 1], [2, 1]],
  9: [[0, 0], [2, 0], [0, 1 / 3], [2, 1 / 3], [1, 0.5], [0, 2 / 3], [2, 2 / 3], [0, 1], [2, 1]], 10: [[0, 0], [2, 0], [1, 1 / 6], [0, 1 / 3], [2, 1 / 3], [0, 2 / 3], [2, 2 / 3], [1, 5 / 6], [0, 1], [2, 1]] };
/* índice de esquina: lo más importante, se lee antes que el adorno */
const IY = CW * 0.035, IFS = Math.round(CW * 0.3);
function index(g, cd, col) { const fs = IFS, rs = RN[cd.r];
  g.font = `800 ${fs}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; g.textAlign = 'left'; g.textBaseline = 'top';
  const w = g.measureText(rs).width, mx = CW * 0.42; g.save(); g.translate(CW * 0.065, IY); if (w > mx) g.scale(mx / w, 1);
  g.fillStyle = 'rgba(120,95,60,.22)'; g.fillText(rs, 0.7, 0.9); g.fillStyle = col; g.fillText(rs, 0, 0);
  /* la Q necesita su rabito aunque la fuente de respaldo lo dibuje corto: se refuerza a mano */
  if (cd.r === 12) { g.lineCap = 'round'; g.lineWidth = Math.max(1.2, fs * 0.12); g.strokeStyle = col;
    g.beginPath(); g.moveTo(w * 0.56, fs * 0.6); g.lineTo(w * 0.82, fs * 0.84); g.stroke(); g.lineCap = 'butt'; }
  g.restore();
  suit(g, cd.s, CW - CW * 0.16, IY + fs * 0.46, fs * 0.7, col);
}
/* --- figuras J/Q/K: medio cuerpo, simetría especular como una baraja real --- */
/* Ley de la pieza única: melena, manto, cuello, collar, cabeza, pelo, barba y corona forman
   UNA sola silueta (trazo una vez, relleno una vez). El detalle interior va recortado. */
function uni(g, parts, ow) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = ow * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
  g.restore(); }
function inpath(g, parts, fn) { g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip(); fn(g); g.restore(); }
function half(g, cd, col, x0, y0, w, h) {
  const cx = x0 + w / 2, R = red(cd), K = cd.r === 13, Q = cd.r === 12, J = cd.r === 11, yb = y0 + h + 0.5;
  const robe = K ? (R ? '#c62a3e' : '#2e4a9c') : Q ? (R ? '#d5437f' : '#5b46b8') : (R ? '#d1762a' : '#2a8c66');
  const gold = '#e5b13c', skin = '#f7cba4', hair = K ? '#cfc6b2' : Q ? (R ? '#e9b148' : '#8b5230') : '#a8642f';
  const rh = h * 0.285, hy = y0 + h * 0.42, sy = y0 + h * 0.70, lw = Math.max(0.7, h * 0.036);
  g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = OUT;
  /* objeto que sostiene: pieza aparte de verdad (la mano lo mueve), conserva su borde */
  if (DT) {
    const ix = cx - w * 0.36, it0 = hy + rh * 0.1;
    if (K) { const bg = g.createLinearGradient(ix - 2, 0, ix + 2, 0); bg.addColorStop(0, '#f2f4fb'); bg.addColorStop(0.5, '#c3c9dd'); bg.addColorStop(1, '#8d94ad');
      const blade = (q) => { q.moveTo(ix - h * 0.04, it0); q.lineTo(ix, it0 - h * 0.09); q.lineTo(ix + h * 0.04, it0); q.lineTo(ix + h * 0.028, yb); q.lineTo(ix - h * 0.028, yb); q.closePath(); };
      const guard = (q) => ART.rr(q, ix - h * 0.09, it0 + h * 0.06, h * 0.18, h * 0.05, h * 0.012);
      uni(g, [[blade, bg], [guard, gold]], lw); }
    else if (Q) { g.beginPath(); g.moveTo(ix, yb); g.quadraticCurveTo(ix - h * 0.04, it0 + h * 0.2, ix, it0 + h * 0.02); g.lineWidth = lw * 1.3; g.strokeStyle = '#3f8a4a'; g.stroke(); g.strokeStyle = OUT; g.lineWidth = lw;
      const pet = [], ptl = R ? '#ffd9e8' : '#dcd6ff';
      for (let a = 0; a < 5; a++) { const an = a * 1.2566 - 0.6; pet.push([(q) => q.ellipse(ix + Math.cos(an) * rh * 0.36, it0 - rh * 0.12 + Math.sin(an) * rh * 0.36, rh * 0.26, rh * 0.19, an, 0, 6.283), ptl]); }
      pet.push([(q) => q.arc(ix, it0 - rh * 0.12, rh * 0.2, 0, 6.283), gold]);
      uni(g, pet, lw); }
    else { g.beginPath(); g.moveTo(ix, yb); g.lineTo(ix, it0 - h * 0.02); g.lineWidth = lw * 1.7; g.strokeStyle = '#7a4f28'; g.stroke(); g.lineWidth = lw; g.strokeStyle = OUT;
      g.beginPath(); g.moveTo(ix, it0 - h * 0.05); g.lineTo(ix + h * 0.085, it0 + h * 0.07); g.lineTo(ix, it0 + h * 0.16); g.closePath();
      const ag = g.createLinearGradient(ix, it0 - h * 0.05, ix + h * 0.085, it0 + h * 0.16); ag.addColorStop(0, '#eef1f8'); ag.addColorStop(1, '#9aa1b8'); g.fillStyle = ag; g.fill(); g.stroke(); }
  }
  /* ---- partes de la silueta, de atrás a delante ---- */
  const parts = [];
  const rg = g.createLinearGradient(cx - w * 0.45, sy, cx + w * 0.45, yb); rg.addColorStop(0, LT(robe, 0.36)); rg.addColorStop(0.4, robe); rg.addColorStop(1, DK(robe, 0.34));
  const sg = g.createLinearGradient(cx - rh, hy - rh, cx + rh, hy + rh); sg.addColorStop(0, LT(skin, 0.35)); sg.addColorStop(0.5, skin); sg.addColorStop(1, DK(skin, 0.28));
  const pMane = (q) => q.ellipse(cx, hy + rh * 0.45, rh * 1.42, rh * 1.5, 0, 0, 6.283);
  if (!J) parts.push([pMane, DK(hair, 0.25)]);
  const pRobe = (q) => { q.moveTo(cx - w * 0.44, yb); q.lineTo(cx - w * 0.40, sy + h * 0.09);
    q.quadraticCurveTo(cx - w * 0.36, sy - h * 0.02, cx - w * 0.15, sy - h * 0.03); q.lineTo(cx + w * 0.15, sy - h * 0.03);
    q.quadraticCurveTo(cx + w * 0.36, sy - h * 0.02, cx + w * 0.40, sy + h * 0.09); q.lineTo(cx + w * 0.44, yb); q.closePath(); };
  parts.push([pRobe, rg]);
  const pNeck = (q) => { q.moveTo(cx - rh * 0.38, hy + rh * 0.55); q.lineTo(cx + rh * 0.38, hy + rh * 0.55); q.lineTo(cx + rh * 0.3, sy + h * 0.01); q.lineTo(cx - rh * 0.3, sy + h * 0.01); q.closePath(); };
  parts.push([pNeck, DK(skin, 0.2)]);
  let pRuff = null;
  if (Q) { pRuff = (q) => { for (let i = -3; i <= 3; i++) { q.moveTo(cx + i * w * 0.072 + w * 0.058, sy - h * 0.025); q.arc(cx + i * w * 0.072, sy - h * 0.025, w * 0.058, Math.PI * 0.9, Math.PI * 2.1); q.closePath(); } };
    parts.push([pRuff, '#f6f1e2']); }
  else if (K) { pRuff = (q) => { for (let i = -3; i <= 3; i++) { q.moveTo(cx + i * w * 0.074 + w * 0.058, sy - h * 0.02); q.arc(cx + i * w * 0.074, sy - h * 0.02, w * 0.058, 0, 6.283); } };
    parts.push([pRuff, '#f1ebdb']); }
  const pHead = (q) => q.ellipse(cx, hy, rh * 0.88, rh, 0, 0, 6.283);
  parts.push([pHead, sg]);
  if (J || Q) parts.push([(q) => { q.ellipse(cx, hy - rh * 0.52, rh * 0.9, rh * 0.5, 0, Math.PI * 1.02, Math.PI * 1.98); q.closePath(); }, hair]);
  if (Q) for (const d of [-1, 1]) parts.push([(q) => q.ellipse(cx + d * rh * 0.92, hy + rh * 0.18, rh * 0.32, rh * 0.62, d * 0.18, 0, 6.283), hair]);
  let cwid = 0, cb = 0, chh = 0;
  if (K) { const bg3 = g.createLinearGradient(cx - rh, hy, cx + rh, hy + rh * 1.6); bg3.addColorStop(0, LT(hair, 0.3)); bg3.addColorStop(1, DK(hair, 0.2));
    parts.push([(q) => { q.moveTo(cx - rh * 0.72, hy + rh * 0.18); q.quadraticCurveTo(cx - rh * 0.6, hy + rh * 1.35, cx, hy + rh * 1.5); q.quadraticCurveTo(cx + rh * 0.6, hy + rh * 1.35, cx + rh * 0.72, hy + rh * 0.18);
      q.quadraticCurveTo(cx, hy + rh * 0.66, cx - rh * 0.72, hy + rh * 0.18); q.closePath(); }, bg3]); }
  if (!J) {
    cwid = K ? rh * 1.2 : rh * 1.0; cb = hy - rh * 0.72; chh = K ? rh * 1.35 : rh * 1.0;
    const cg = g.createLinearGradient(cx - cwid, cb - chh, cx + cwid, cb); cg.addColorStop(0, LT(gold, 0.55)); cg.addColorStop(0.45, gold); cg.addColorStop(1, DK(gold, 0.32));
    parts.push([(q) => { q.moveTo(cx - cwid, cb); q.lineTo(cx - cwid, cb - chh * 0.5); q.lineTo(cx - cwid * 0.5, cb - chh * 0.18); q.lineTo(cx, cb - chh);
      q.lineTo(cx + cwid * 0.5, cb - chh * 0.18); q.lineTo(cx + cwid, cb - chh * 0.5); q.lineTo(cx + cwid, cb); q.closePath(); }, cg]);
  } else {
    const hg = g.createLinearGradient(cx - rh, hy - rh * 1.4, cx + rh, hy - rh * 0.5); hg.addColorStop(0, LT(robe, 0.4)); hg.addColorStop(1, DK(robe, 0.28));
    parts.push([(q) => q.ellipse(cx - rh * 0.1, hy - rh * 0.95, rh * 1.22, rh * 0.48, -0.16, 0, 6.283), hg]);
    parts.push([(q) => { q.moveTo(cx + rh * 0.55, hy - rh * 1.05); q.quadraticCurveTo(cx + rh * 1.7, hy - rh * 2.3, cx + rh * 1.85, hy - rh * 0.95);
      q.quadraticCurveTo(cx + rh * 1.2, hy - rh * 1.45, cx + rh * 0.55, hy - rh * 1.05); q.closePath(); }, cmix(gold, '#ffffff', 0.35)]);
  }
  uni(g, parts, lw);
  /* ---- detalle interior, recortado contra la silueta: nunca contornos cerrados ---- */
  inpath(g, parts, (q) => {
    q.lineJoin = 'round'; q.lineCap = 'round';
    /* pliegues del manto */
    q.save(); q.beginPath(); pRobe(q); q.clip();
    q.lineWidth = lw * 0.9;
    for (const [dx, tone] of [[-0.3, DK(robe, 0.4)], [0.12, DK(robe, 0.3)], [0.3, LT(robe, 0.3)], [-0.12, LT(robe, 0.22)]]) {
      q.strokeStyle = tone; q.beginPath(); q.moveTo(cx + w * dx, sy); q.quadraticCurveTo(cx + w * dx * 1.25, sy + h * 0.2, cx + w * dx * 1.35, yb); q.stroke(); }
    /* solapas en V */
    q.lineWidth = lw * 0.9; q.strokeStyle = DK(robe, 0.5);
    q.beginPath(); q.moveTo(cx - w * 0.15, sy); q.lineTo(cx, sy + h * 0.16); q.lineTo(cx + w * 0.15, sy); q.stroke();
    q.strokeStyle = LT(robe, 0.35); q.beginPath(); q.moveTo(cx - w * 0.15, sy + h * 0.04); q.lineTo(cx, sy + h * 0.2); q.lineTo(cx + w * 0.15, sy + h * 0.04); q.stroke();
    if (J) { q.beginPath(); q.moveTo(cx - w * 0.17, sy - h * 0.05); q.lineTo(cx, sy + h * 0.1); q.lineTo(cx + w * 0.17, sy - h * 0.05); q.closePath(); q.fillStyle = LT(robe, 0.55); q.fill(); }
    q.fillStyle = gold; for (const d of [0.3, 0.6]) { q.beginPath(); q.arc(cx, sy + h * (0.2 + d * 0.3), Math.max(0.7, h * 0.022), 0, 6.283); q.fill(); }
    q.restore();
    /* sombra propia bajo el collar y bajo la barbilla: separa por luz, no por línea */
    const nsh = q.createLinearGradient(0, hy + rh * 0.35, 0, hy + rh * 1.0); nsh.addColorStop(0, 'rgba(26,21,48,.34)'); nsh.addColorStop(1, 'rgba(26,21,48,0)');
    q.fillStyle = nsh; q.fillRect(cx - rh * 0.5, hy + rh * 0.35, rh, rh * 0.7);
    if (pRuff) { q.save(); q.beginPath(); pRuff(q); q.clip();
      /* bolas del collar: se leen por sombra entre ellas */
      for (let i = -3; i <= 3; i++) { const bx = cx + i * w * (K ? 0.074 : 0.072), by = sy - h * (K ? 0.02 : 0.025), br = w * 0.058;
        const bg2 = q.createRadialGradient(bx - br * 0.3, by - br * 0.35, br * 0.1, bx, by, br * 1.05);
        bg2.addColorStop(0, '#ffffff'); bg2.addColorStop(0.62, i % 2 ? '#f4eee0' : '#e3dbc6'); bg2.addColorStop(1, 'rgba(26,21,48,.34)');
        q.beginPath(); q.arc(bx, by, br, 0, 6.283); q.fillStyle = bg2; q.fill(); }
      q.restore(); }
    /* cara */
    q.save(); q.beginPath(); pHead(q); q.clip();
    const fsh = q.createRadialGradient(cx - rh * 0.3, hy - rh * 0.4, rh * 0.15, cx, hy, rh * 1.25);
    fsh.addColorStop(0, 'rgba(255,255,255,.28)'); fsh.addColorStop(0.65, 'rgba(255,255,255,0)'); fsh.addColorStop(1, 'rgba(26,21,48,.22)');
    q.fillStyle = fsh; q.fillRect(cx - rh, hy - rh * 1.1, rh * 2, rh * 2.2);
    q.restore();
    q.fillStyle = OUT;
    for (const d of [-1, 1]) { q.beginPath(); q.ellipse(cx + d * rh * 0.34, hy - rh * 0.03, Math.max(0.6, rh * 0.11), Math.max(0.8, rh * 0.15), 0, 0, 6.283); q.fill(); }
    q.lineWidth = Math.max(0.6, rh * 0.1); q.strokeStyle = DK(hair, 0.35);
    for (const d of [-1, 1]) { q.beginPath(); q.moveTo(cx + d * rh * 0.55, hy - rh * 0.34); q.quadraticCurveTo(cx + d * rh * 0.34, hy - rh * 0.46, cx + d * rh * 0.16, hy - rh * 0.32); q.stroke(); }
    q.strokeStyle = DK(skin, 0.5); q.beginPath(); q.moveTo(cx, hy - rh * 0.05); q.lineTo(cx - rh * 0.09, hy + rh * 0.25); q.stroke();
    q.fillStyle = 'rgba(224,96,96,.3)'; for (const d of [-1, 1]) { q.beginPath(); q.ellipse(cx + d * rh * 0.6, hy + rh * 0.3, rh * 0.2, rh * 0.13, 0, 0, 6.283); q.fill(); }
    if (K) { q.lineWidth = lw * 0.9; q.strokeStyle = DK(hair, 0.35); q.beginPath(); q.moveTo(cx - rh * 0.5, hy + rh * 0.34); q.quadraticCurveTo(cx, hy + rh * 0.6, cx + rh * 0.5, hy + rh * 0.34); q.stroke(); }
    else { q.lineWidth = Math.max(0.6, rh * 0.11); q.strokeStyle = DK('#c8607a', 0.15); q.beginPath(); q.arc(cx, hy + rh * 0.28, rh * 0.3, 0.35, Math.PI - 0.35); q.stroke(); }
    /* corona: banda y joyas por color, sin contorno */
    if (!J) {
      q.fillStyle = cmix(gold, '#ffffff', 0.5); q.fillRect(cx - cwid, cb - chh * 0.22, cwid * 2, Math.max(0.8, chh * 0.13));
      const bsh = q.createLinearGradient(0, cb - chh * 0.09, 0, cb + chh * 0.05); bsh.addColorStop(0, 'rgba(26,21,48,.3)'); bsh.addColorStop(1, 'rgba(26,21,48,0)');
      q.fillStyle = bsh; q.fillRect(cx - cwid, cb - chh * 0.09, cwid * 2, chh * 0.16);
      for (const [d, jc] of [[0, R ? '#3f7fd8' : '#e03a52'], [-0.62, '#54c98a'], [0.62, '#54c98a']]) {
        if (d && !DT) continue; const jx = cx + d * cwid, jy = cb - chh * 0.42, jr = Math.max(0.8, rh * 0.15);
        const jg = q.createRadialGradient(jx - jr * 0.3, jy - jr * 0.3, jr * 0.12, jx, jy, jr);
        jg.addColorStop(0, cmix(jc, '#ffffff', 0.55)); jg.addColorStop(0.6, jc); jg.addColorStop(1, DK(jc, 0.4));
        q.beginPath(); q.arc(jx, jy, jr, 0, 6.283); q.fillStyle = jg; q.fill(); }
    } else {
      const jx = cx - rh * 0.75, jy = hy - rh * 1.02, jr = Math.max(0.9, rh * 0.2);
      const jg = q.createRadialGradient(jx - jr * 0.3, jy - jr * 0.3, jr * 0.12, jx, jy, jr); jg.addColorStop(0, LT(gold, 0.6)); jg.addColorStop(0.6, gold); jg.addColorStop(1, DK(gold, 0.4));
      q.beginPath(); q.arc(jx, jy, jr, 0, 6.283); q.fillStyle = jg; q.fill();
    }
  });
}
function court(g, cd, col) {
  const R = red(cd), mx = CW * 0.12, y0 = CH * 0.235, y1 = CH * 0.765, pw = CW - mx * 2, ph = y1 - y0, cx = CW / 2, cy = (y0 + y1) / 2;
  const bg = R ? '#fdeee7' : '#eceffa';
  ART.rr(g, mx, y0, pw, ph, 2.5); g.fillStyle = bg; g.fill();
  g.save(); ART.rr(g, mx, y0, pw, ph, 2.5); g.clip();
  g.strokeStyle = cmix(bg, col, 0.11); g.lineWidth = 0.7; g.beginPath();
  for (let i = -ph; i < pw + ph; i += 5.5) { g.moveTo(mx + i, y0); g.lineTo(mx + i + ph, y1); }
  g.stroke();
  half(g, cd, col, mx, y0, pw, ph / 2);
  g.save(); g.translate(cx, cy); g.rotate(Math.PI); g.translate(-cx, -cy); half(g, cd, col, mx, y0, pw, ph / 2); g.restore();
  const bh = Math.max(1.8, ph * 0.045); g.fillStyle = cmix(col, '#1a1530', 0.25); g.fillRect(mx, cy - bh / 2, pw, bh);
  g.fillStyle = 'rgba(229,177,60,.9)'; g.fillRect(mx, cy - bh / 2, pw, 0.7); g.fillRect(mx, cy + bh / 2 - 0.7, pw, 0.7);
  g.restore();
  ART.rr(g, mx, y0, pw, ph, 2.5); g.lineWidth = 1.3; g.strokeStyle = col; g.stroke();
  ART.rr(g, mx + 1.7, y0 + 1.7, pw - 3.4, ph - 3.4, 1.5); g.lineWidth = 0.6; g.strokeStyle = cmix(col, bg, 0.52); g.stroke();
}
/* as: palo grande con marco ornamental */
function ace(g, cd, col) {
  const cx = CW / 2, cy = CH * 0.545, pale = cmix(col, '#fdfaf1', 0.45);
  g.strokeStyle = pale; g.lineWidth = 1;
  g.beginPath(); g.ellipse(cx, cy, CW * 0.37, CH * 0.28, 0, 0, 6.283); g.stroke();
  g.beginPath(); g.ellipse(cx, cy, CW * 0.325, CH * 0.245, 0, 0, 6.283); g.stroke();
  g.lineWidth = 0.9;
  for (const d of [-1, 1]) for (const v of [-1, 1]) {
    g.beginPath(); g.moveTo(cx + d * CW * 0.3, cy + v * CH * 0.2);
    g.bezierCurveTo(cx + d * CW * 0.5, cy + v * CH * 0.24, cx + d * CW * 0.46, cy + v * CH * 0.05, cx + d * CW * 0.33, cy + v * CH * 0.09); g.stroke();
    g.beginPath(); g.arc(cx + d * CW * 0.34, cy + v * CH * 0.115, CW * 0.022, 0, 6.283); g.fillStyle = pale; g.fill();
  }
  suit(g, cd.s, cx, cy, CW * 0.6, col);
}
function mkFace(cd) {
  return sprite((g) => {
    body(g, '#fdfaf1', cd.r * 4 + cd.s);
    const col = red(cd) ? '#cf2439' : '#221f3c';
    if (cd.r >= 11) court(g, cd, col);
    else if (cd.r === 1) ace(g, cd, col);
    else if (CW >= 54) { const xs = [CW * 0.31, CW * 0.5, CW * 0.69], y0 = CH * 0.27, y1 = CH * 0.73, z = CW * 0.18;
      for (const [cx, f] of PIPS[cd.r]) { const x = xs[cx], y = y0 + (y1 - y0) * f; if (f > 0.5) { g.save(); g.translate(x, y); g.rotate(Math.PI); suit(g, cd.s, 0, 0, z, col); g.restore(); } else suit(g, cd.s, x, y, z, col); } }
    else { suit(g, cd.s, CW / 2, CH * 0.58, CW * 0.46, col); }
    index(g, cd, col); g.save(); g.translate(CW, CH); g.rotate(Math.PI); index(g, cd, col); g.restore();
  });
}
const FC = {}, face = (cd) => FC[cd.r * 4 + cd.s] || (FC[cd.r * 4 + cd.s] = mkFace(cd));
/* reverso: borde blanco, celosía de rombos entrelazados y medallón */
const BACK = sprite((g) => {
  body(g, '#f6f3ea', 3);
  const ix = 3.2, iy = 3.2, iw = CW - 6.4, ih = CH - 6.4, ir = Math.max(2, CR * 0.7);
  ART.rr(g, ix, iy, iw, ih, ir);
  const gr = g.createLinearGradient(ix, iy, ix + iw, iy + ih); gr.addColorStop(0, '#5a4ee0'); gr.addColorStop(0.5, '#463ac4'); gr.addColorStop(1, '#241e6b');
  g.fillStyle = gr; g.fill();
  g.save(); ART.rr(g, ix, iy, iw, ih, ir); g.clip();
  const s = Math.max(5, CW * 0.115);
  for (let y = iy - s; y < iy + ih + s; y += s) for (let x = ix - s; x < ix + iw + s; x += s) {
    const on = ((Math.round((x - ix) / s) + Math.round((y - iy) / s)) & 1) === 0;
    g.beginPath(); g.moveTo(x + s / 2, y); g.lineTo(x + s, y + s / 2); g.lineTo(x + s / 2, y + s); g.lineTo(x, y + s / 2); g.closePath();
    g.fillStyle = on ? 'rgba(160,151,255,.34)' : 'rgba(26,21,48,.26)'; g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 0.7; g.beginPath();
  for (let i = -ih; i < iw + ih; i += s) { g.moveTo(ix + i, iy); g.lineTo(ix + i + ih, iy + ih); g.moveTo(ix + i, iy + ih); g.lineTo(ix + i + ih, iy); }
  g.stroke();
  const lg = g.createLinearGradient(ix, iy, ix + iw * 0.5, iy + ih * 0.6); lg.addColorStop(0, 'rgba(255,255,255,.22)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lg; g.fillRect(ix, iy, iw, ih);
  g.restore();
  ART.rr(g, ix, iy, iw, ih, ir); g.lineWidth = 1.1; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
  ART.rr(g, ix + 2, iy + 2, iw - 4, ih - 4, ir * 0.7); g.lineWidth = 0.8; g.strokeStyle = 'rgba(229,177,60,.75)'; g.stroke();
  /* medallón central */
  const cx = CW / 2, cy = CH / 2, mr = CW * 0.24;
  const mg = g.createRadialGradient(cx - mr * 0.3, cy - mr * 0.35, mr * 0.15, cx, cy, mr); mg.addColorStop(0, '#6a5ff0'); mg.addColorStop(1, '#241e6b');
  g.beginPath(); g.arc(cx, cy, mr, 0, 6.283); g.fillStyle = mg; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#e5b13c'; g.stroke();
  for (const [z, cl] of [[mr * 1.15, '#e5b13c'], [mr * 0.62, '#fff3c4']]) {
    g.beginPath(); g.moveTo(cx, cy - z); g.quadraticCurveTo(cx + z * 0.22, cy - z * 0.22, cx + z, cy); g.quadraticCurveTo(cx + z * 0.22, cy + z * 0.22, cx, cy + z);
    g.quadraticCurveTo(cx - z * 0.22, cy + z * 0.22, cx - z, cy); g.quadraticCurveTo(cx - z * 0.22, cy - z * 0.22, cx, cy - z); g.closePath();
    g.fillStyle = cl; g.fill(); if (cl === '#e5b13c') { g.lineWidth = 0.9; g.strokeStyle = DK('#e5b13c', 0.45); g.stroke(); }
  }
});
/* sombra suelta para cartas en movimiento / arrastre (cacheada, sin shadowBlur) */
const SHW = Math.round(CW * 0.26), SHADOW = (() => { const cv = document.createElement('canvas'); cv.width = (CW + SHW * 2) * 2; cv.height = (CH + SHW * 2) * 2;
  const g = cv.getContext('2d'); g.scale(2, 2); g.translate(SHW, SHW);
  for (let i = 9; i >= 0; i--) { const s = i * (SHW / 9); g.fillStyle = 'rgba(4,20,13,.05)'; ART.rr(g, -s * 0.5, -s * 0.5, CW + s, CH + s, CR + s * 0.5); g.fill(); }
  return cv; })();
/* Tapete: fieltro con grano procedural, ribete de cuero con costuras, luz cenital y viñeta */
const FELT = (() => { const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  let gr = g.createRadialGradient(W * 0.42, H * 0.33, 20, W * 0.5, H * 0.46, H * 0.82);
  gr.addColorStop(0, '#2e9c66'); gr.addColorStop(0.45, '#18784b'); gr.addColorStop(1, '#073a24'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* moteado de baja frecuencia: nubes de tono (ruido pequeño ampliado) */
  const mot = document.createElement('canvas'); mot.width = 26; mot.height = 38; const mg = mot.getContext('2d');
  const mi = mg.createImageData(26, 38); _sd = 1234;
  for (let i = 0; i < 26 * 38; i++) { const v = 70 + sr() * 185, o2 = i * 4; mi.data[o2] = mi.data[o2 + 1] = mi.data[o2 + 2] = v; mi.data[o2 + 3] = 255; }
  mg.putImageData(mi, 0, 0);
  g.globalCompositeOperation = 'overlay';
  g.globalAlpha = 0.26; g.drawImage(mot, 0, 0, W, H);
  g.globalAlpha = 0.16; g.drawImage(mot, -70, -90, W * 1.55, H * 1.55);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  /* grano: dos octavas de ruido determinista */
  const nz = document.createElement('canvas'); nz.width = W; nz.height = H; const ng = nz.getContext('2d');
  const im = ng.createImageData(W, H); _sd = 99;
  for (let i = 0; i < W * H; i++) { const v = sr() * 255, o = i * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = v; im.data[o + 3] = 30; }
  ng.putImageData(im, 0, 0);
  g.globalAlpha = 0.85; g.drawImage(nz, 0, 0, W, H);
  g.globalAlpha = 0.5; g.drawImage(nz, -40, -60, W * 1.9, H * 1.9);
  g.globalAlpha = 1;
  /* fibras del fieltro */
  g.lineWidth = 1; g.lineCap = 'round'; _sd = 5;
  for (let i = 0; i < 2600; i++) { const x = sr() * W, y = sr() * H, a = (sr() - 0.5) * 1.1 + (sr() < 0.5 ? 0 : Math.PI), l = 2 + sr() * 5;
    g.strokeStyle = sr() < 0.5 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.06)';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.35); g.stroke(); }
  g.lineCap = 'butt';
  /* luz cenital suave */
  gr = g.createRadialGradient(W * 0.44, H * 0.3, 10, W * 0.44, H * 0.34, W * 0.72);
  gr.addColorStop(0, 'rgba(255,248,214,.2)'); gr.addColorStop(0.55, 'rgba(255,248,214,.05)'); gr.addColorStop(1, 'rgba(255,248,214,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* viñeta */
  gr = g.createRadialGradient(W / 2, H * 0.48, H * 0.26, W / 2, H * 0.5, H * 0.74);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(2,14,9,.16)'); gr.addColorStop(1, 'rgba(2,14,9,.72)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* ribete de cuero con costura */
  const BW = Math.max(3, Math.min(8, GAP - 1)), leather = '#5b3f29';
  g.save(); g.beginPath(); g.rect(0, 0, W, H); rrSub(g, BW, BW, W - BW * 2, H - BW * 2, 9); g.clip('evenodd');
  gr = g.createLinearGradient(0, 0, W * 0.6, H); gr.addColorStop(0, LT(leather, 0.34)); gr.addColorStop(0.42, leather); gr.addColorStop(1, DK(leather, 0.42));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  _sd = 31;
  for (let i = 0; i < 1800; i++) { const x = sr() * W, y = sr() * H; g.fillStyle = sr() < 0.5 ? 'rgba(255,225,190,.07)' : 'rgba(0,0,0,.1)'; g.fillRect(x, y, 1, 1 + sr()); }
  g.strokeStyle = 'rgba(255,230,196,.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0.5, H); g.lineTo(0.5, 0.5); g.lineTo(W - 0.5, 0.5); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(W - 0.5, 0); g.lineTo(W - 0.5, H - 0.5); g.lineTo(0, H - 0.5); g.stroke();
  g.restore();
  /* costuras + sombra interior del ribete sobre el fieltro */
  g.save(); ART.rr(g, BW + 0.6, BW + 0.6, W - BW * 2 - 1.2, H - BW * 2 - 1.2, 8); g.lineWidth = 1.3; g.setLineDash([3.5, 3]); g.strokeStyle = 'rgba(240,214,150,.55)'; g.stroke(); g.setLineDash([]);
  for (let i = 0; i < 7; i++) { ART.rr(g, BW + 1.4 + i * 1.2, BW + 1.4 + i * 1.2, W - BW * 2 - 2.8 - i * 2.4, H - BW * 2 - 2.8 - i * 2.4, 8); g.lineWidth = 2; g.strokeStyle = `rgba(0,0,0,${0.2 - i * 0.027})`; g.stroke(); }
  g.restore();
  /* bandas de contraste para el HUD y los botones */
  gr = g.createLinearGradient(0, 0, 0, 54); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(BW, BW, W - BW * 2, 54 - BW);
  gr = g.createLinearGradient(0, BY - 14, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.42)'); g.fillStyle = gr; g.fillRect(BW, BY - 14, W - BW * 2, H - BY + 14 - BW);
  return cv; })();
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
const SLOTC = (() => { const cv = document.createElement('canvas'); cv.width = (CW + 6) * 2; cv.height = (CH + 6) * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(3, 3);
  ART.rr(g, 0, 0, CW, CH, CR); g.fillStyle = 'rgba(0,0,0,.22)'; g.fill();
  g.save(); ART.rr(g, 0, 0, CW, CH, CR); g.clip();
  for (let i = 0; i < 5; i++) { ART.rr(g, -1 + i * 0.8, -2 + i * 1.1, CW + 2 - i * 1.6, CH + 2 - i * 1.6, CR); g.lineWidth = 2; g.strokeStyle = `rgba(0,0,0,${0.13 - i * 0.022})`; g.stroke(); }
  g.restore();
  ART.rr(g, 0.6, 0.6, CW - 1.2, CH - 1.2, CR); g.setLineDash([5, 4]); g.lineWidth = 1.4; g.strokeStyle = 'rgba(255,255,255,.34)'; g.stroke(); g.setLineDash([]);
  g.beginPath(); g.moveTo(CR, CH - 0.5); g.lineTo(CW - CR, CH - 0.5); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.14)'; g.stroke();
  return cv; })();
function slot(r, kind) { if (!r) return; const { x, y } = r; c.drawImage(SLOTC, x - 3, y - 3, CW + 6, CH + 6);
  const cx = x + CW / 2, cy = y + CH / 2; c.fillStyle = c.strokeStyle = 'rgba(255,255,255,.34)';
  if (kind === 'A' || kind === 'K') { c.font = `800 ${Math.round(CW * 0.4)}px ui-rounded,system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(kind, cx, cy); }
  if (kind === 'redo') { c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, CW * 0.2, -1.2, 4.2); c.stroke(); const a = -1.2, ex = cx + Math.cos(a) * CW * 0.2, ey = cy + Math.sin(a) * CW * 0.2; c.beginPath(); c.moveTo(ex + 6, ey - 2); c.lineTo(ex - 3, ey - 6); c.lineTo(ex - 1, ey + 4); c.closePath(); c.fill(); }
  if (kind === 'x') { c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 8, cy - 8); c.lineTo(cx + 8, cy + 8); c.moveTo(cx + 8, cy - 8); c.lineTo(cx - 8, cy + 8); c.stroke(); }
  if (kind === 'cell') { c.lineWidth = 2; ART.rr(c, cx - 7, cy - 9, 14, 18, 3); c.stroke(); }
}
function btn(x, w, txt, icon, on, h) { const y = BY, hh = 34, hv = h && hitAt(k.ptr.x, k.ptr.y) === h && !k.ptr.down;
  ART.rr(c, x, y + 3, w, hh, 12); c.fillStyle = OUT; c.fill(); ART.rr(c, x, y, w, hh, 12); ART.fillOut(c, !on ? '#8d8a97' : hv ? '#fff3c4' : '#f4e6c4', 2);
  c.fillStyle = 'rgba(255,255,255,.5)'; ART.rr(c, x + 5, y + 3, w - 10, 7, 4); c.fill();
  const ix = x + 20, iy = y + hh / 2; c.strokeStyle = c.fillStyle = OUT; c.lineWidth = 2.5; c.lineCap = 'round';
  if (icon === 'undo') { c.beginPath(); c.arc(ix + 2, iy + 2, 7, -Math.PI * 0.9, Math.PI * 0.55); c.stroke(); c.beginPath(); c.moveTo(ix - 9, iy - 4); c.lineTo(ix - 3, iy - 10); c.lineTo(ix - 1, iy - 1); c.closePath(); c.fill(); }
  if (icon === 'hint') { c.beginPath(); c.arc(ix, iy - 3, 7, 0, 6.283); c.fillStyle = '#ffd84a'; c.fill(); c.lineWidth = 2; c.stroke(); c.fillStyle = OUT; c.fillRect(ix - 4, iy + 5, 8, 4); }
  if (icon === 'new') { c.lineWidth = 2; for (const [dx, a] of [[-4, -0.2], [3, 0.15]]) { c.save(); c.translate(ix + dx, iy); c.rotate(a); ART.rr(c, -6, -8, 12, 16, 2); c.fillStyle = '#fff'; c.fill(); c.stroke(); c.restore(); } }
  c.lineCap = 'butt'; c.fillStyle = OUT; c.font = '800 14px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x + w / 2 + 10, y + hh / 2 + 1);
}

/* ================= Dibujo: disposición + cartas interpoladas ================= */
const AP = new Map(); let L = [], RC = new Map(), SL = {}, spawnQ = 0, lastT = 0;
function put(cd, x, y, o) { L.push({ cd, x, y, o: o || {} }); RC.set(cd.id, { x, y }); }
function pile(arr, x, y, dx, dy, per) { arr.forEach((cd, i) => put(cd, x - Math.floor(i / per) * dx, y - Math.floor(i / per) * dy)); }
function layout() {
  L = []; hs = []; RC = new Map(); SL = { found: [], cells: [], tab: [] }; const gone = casc ? casc.gone : null, P = k.ptr;
  const dragged = drag && drag.moved && drag.ids ? drag.ids : null, pushH = (q) => hs.push(q);
  if (M === 'klondike' || M === 'freecell' || M === 'spider') {
    if (M === 'klondike') { const sx = colX(0), wx = colX(1); SL.stock = { x: sx, y: TOP }; SL.waste = { x: wx, y: TOP };
      pile(stock, sx, TOP, 0, 1.2, 6); pushH({ x: sx, y: TOP, w: CW, h: CH, a: 'stock', card: 1 });
      waste.forEach((cd) => !(dragged && dragged.has(cd.id)) && put(cd, wx, TOP)); pushH({ x: wx, y: TOP, w: CW, h: CH, a: 'waste', card: 1 });
      for (let i = 0; i < 4; i++) { const x = colX(3 + i); SL.found[i] = { x, y: TOP }; found[i].forEach((cd) => !(dragged && dragged.has(cd.id)) && !(gone && gone.has(cd.id)) && put(cd, x, TOP)); pushH({ x, y: TOP, w: CW, h: CH, a: 'found', i, card: 1 }); } }
    if (M === 'freecell') for (let i = 0; i < 4; i++) { const x = colX(i); SL.cells[i] = { x, y: TOP }; if (cells[i] && !(dragged && dragged.has(cells[i].id))) put(cells[i], x, TOP); pushH({ x, y: TOP, w: CW, h: CH, a: 'cell', i, card: 1 });
      const fx = colX(4 + i); SL.found[i] = { x: fx, y: TOP }; found[i].forEach((cd) => !(gone && gone.has(cd.id)) && put(cd, fx, TOP)); }
    if (M === 'spider') { const sx = colX(9); SL.stock = { x: sx, y: TOP }; stock.forEach((cd, i) => put(cd, sx - (4 - Math.floor(i / 10)) * 7, TOP)); pushH({ x: sx - 28, y: TOP, w: CW + 28, h: CH, a: 'stock', card: 1 });
      comp.forEach((run, n) => run.forEach((cd) => !(gone && gone.has(cd.id)) && put(cd, colX(0) + n * 9, TOP))); }
    tab.forEach((col, i) => { const x = colX(i); SL.tab[i] = { x, y: TY }; const avail = BOT - TY - CH; let dn = M === 'spider' ? 9 : 12, up = M === 'spider' ? 20 : 24;
      const need = col.slice(0, -1).reduce((s, q) => s + (q.up ? up : dn), 0); if (need > avail) { const f = avail / need; dn *= f; up *= f; }
      let y = TY; col.forEach((cd, idx) => { const st = idx === col.length - 1 ? CH : cd.up ? up : dn; if (!(dragged && dragged.has(cd.id))) put(cd, x, y); pushH({ x, y, w: CW, h: st, a: 'tab', i, idx, card: 1, dn: !cd.up }); y += cd.up ? up : dn; });
      if (!col.length) pushH({ x, y: TY, w: CW, h: CH, a: 'tab', i, idx: 0, card: 1 }); });
    if (dragged) drag.stack.forEach((cd, i) => put(cd, P.x - drag.ox, P.y - drag.oy + i * (M === 'spider' ? 20 : 24), { drag: 1 }));
  }
  if (M === 'pyramid') { for (let r = 0; r < 7; r++) for (let j = 0; j <= r; j++) { const cd = pyr[r][j]; if (!cd) continue; const x = W / 2 - (r + 1) * (CW + 4) / 2 + j * (CW + 4) + 2, y = 72 + r * 46; const free = pyrFree(r, j);
      put(cd, x, y, { hl: sel && sel.r === r && sel.j === j, dim: !free }); if (free) pushH({ x, y, w: CW, h: CH, a: 'pyr', r, j, card: 1 }); }
    const sy = 468; SL.stock = { x: 70, y: sy }; SL.waste = { x: 170, y: sy }; SL.disc = { x: 350, y: sy };
    pile(stock, 70, sy, 0, 1.2, 5); pushH({ x: 70, y: sy, w: CW, h: CH, a: 'stock', card: 1 }); waste.forEach((cd, i) => put(cd, 170, sy, { hl: i === waste.length - 1 && sel && sel.w })); pushH({ x: 170, y: sy, w: CW, h: CH, a: 'waste', card: 1 });
    disc.forEach((cd, i) => !(gone && gone.has(cd.id)) && put(cd, 350 + (i % 2) * 2, sy - Math.floor(i / 4) * 0.8)); }
  if (M === 'tripeaks') { const P0 = 47, x0 = (W - 9 * P0 - CW) / 2, X = (r, j) => r === 3 ? x0 + j * P0 : r === 2 ? x0 + P0 / 2 + j * P0 : r === 1 ? x0 + P0 + Math.floor(j / 2) * 3 * P0 + (j % 2) * P0 : x0 + 1.5 * P0 + j * 3 * P0;
    for (let r = 0; r < 4; r++) peaks[r].forEach((cd, j) => { if (!cd) return; const x = X(r, j), y = 96 + r * 40; put(cd, x, y); if (peakFree(r, j)) pushH({ x, y, w: CW, h: CH, a: 'peak', r, j, card: 1 }); });
    const sy = 400; SL.stock = { x: 130, y: sy }; SL.waste = { x: 300, y: sy }; pile(stock, 130, sy, 0, 1.2, 4); pushH({ x: 130, y: sy, w: CW, h: CH, a: 'stock', card: 1 });
    waste.forEach((cd) => !(gone && gone.has(cd.id)) && put(cd, 300, sy)); }
  hs.push({ x: 16, y: BY, w: 120, h: 36, a: 'new' }, { x: 180, y: BY, w: 120, h: 36, a: 'undo' }, { x: 344, y: BY, w: 120, h: 36, a: 'hint' });
}
function drawCard(it) {
  const a = it.a, cd = it.cd, p = 1 - a.f, sx = a.f > 0 ? Math.max(0.04, Math.abs(Math.cos(p * Math.PI))) : 1, up = a.f > 0 ? (p < 0.5 ? !cd.up : cd.up) : cd.up, lift = it.m ? 1.06 : 1;
  c.save(); c.translate(a.x + CW / 2, a.y + CH / 2); c.scale(sx * lift, lift);
  const o = it.o.drag ? 1.5 : it.dd > 5 ? Math.min(1, it.dd / 22) : 0;
  if (o) c.drawImage(SHADOW, -CW / 2 - SHW + 3 * o, -CH / 2 - SHW + 7 * o, CW + SHW * 2, CH + SHW * 2);
  c.drawImage(up ? face(cd) : BACK, -CW / 2 - PAD, -CH / 2 - PAD, CW + PAD * 2, CH + PAD * 2);
  if (it.o.dim) { c.fillStyle = 'rgba(8,30,20,.3)'; ART.rr(c, -CW / 2, -CH / 2, CW, CH, CR); c.fill(); }
  if (it.o.hl) { c.strokeStyle = '#ffd84a'; c.lineWidth = 3.5; ART.rr(c, -CW / 2 - 1.5, -CH / 2 - 1.5, CW + 3, CH + 3, CR + 1); c.stroke(); }
  c.restore();
}
function draw() {
  const now = performance.now(), dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
  c.drawImage(FELT, 0, 0, W, H); layout();
  // huecos
  if (SL.stock) slot(SL.stock, M === 'klondike' ? 'redo' : M === 'pyramid' ? (recycles < 2 ? 'redo' : 'x') : '');
  if (SL.waste) slot(SL.waste); if (SL.disc) slot(SL.disc); SL.found.forEach((r) => slot(r, 'A')); SL.cells.forEach((r) => slot(r, 'cell')); SL.tab.forEach((r) => slot(r, M === 'klondike' ? 'K' : ''));
  if (M === 'spider' && !comp.length) slot({ x: colX(0), y: TOP }, 'K');
  // cartas: las que vuelan se pintan encima
  const kk = 1 - Math.exp(-dt * 13), mv = [];
  for (const it of L) { let a = AP.get(it.cd.id); const [spx, spy] = SPAWN;
    if (!a) { const far = Math.hypot(it.x - spx, it.y - spy) > 2; a = { x: spx, y: spy, up: far ? false : it.cd.up, f: 0, d: far ? (spawnQ += M === 'spider' ? 0.012 : 0.02) : 0 }; AP.set(it.cd.id, a); }
    if (it.o.drag) { a.x = it.x; a.y = it.y; a.d = 0; } else if (a.d > 0) a.d -= dt; else { a.x += (it.x - a.x) * kk; a.y += (it.y - a.y) * kk; if (Math.abs(it.x - a.x) < 0.3 && Math.abs(it.y - a.y) < 0.3) { a.x = it.x; a.y = it.y; } }
    const dist = Math.hypot(it.x - a.x, it.y - a.y); if (a.up !== it.cd.up && a.d <= 0 && dist < 40) { a.up = it.cd.up; a.f = 1; } if (a.f > 0) a.f = Math.max(0, a.f - dt * 5);
    it.a = a; it.dd = dist; it.m = dist > 1.5 || it.o.drag; if (it.m) mv.push(it); else drawCard(it); }
  mv.forEach(drawCard);
  if (casc) c.drawImage(casc.cv, 0, 0, W, H);
  // pista y cursor de teclado
  if (hintR) { const pu = 0.75 + 0.25 * Math.sin(now / 120); c.strokeStyle = `rgba(255,216,74,${pu})`; c.lineWidth = 4; hintR.forEach((r) => { ART.rr(c, r.x - 3, r.y - 3, r.w + 6, r.h + 6, CR + 3); c.stroke(); }); }
  if (kbd && !done) { const q = curH(); if (q) { const hh = q.card ? CH : q.h; c.strokeStyle = '#5ce1e6'; c.lineWidth = 3; c.setLineDash([6, 4]); ART.rr(c, q.x - 3, q.y - 3, q.w + 6, hh + 6, 8); c.stroke(); c.setLineDash([]); } }
  // HUD
  label(CFG.title, 12, 12, 15, '#ffe27a'); label(`${score} pts`, W - 12, 8, 18, '#fff', 'right'); label(`${moves} movs · ${fmt(time || 0)}`, W - 12, 31, 12, '#cfe9d8', 'right');
  if (M === 'spider') { label(`${removed}/8 escaleras`, W / 2 - 6, TOP + CH / 2 - 8, 14, '#fff', 'center'); label(`${stock.length / 10} repartos`, colX(9) + CW / 2 - 14, TOP + CH + 3, 11, '#cfe9d8', 'center'); }
  if (M === 'klondike' && stock.length) label(String(stock.length), colX(0) + CW / 2, TOP + CH + 3, 11, '#cfe9d8', 'center');
  if (M === 'pyramid') { label(`Mazo ${stock.length} · Reciclados ${recycles}/2`, 70 + CW / 2, 468 + CH + 6, 12, '#cfe9d8', 'left'); label('Parejas que sumen 13 · la K sola', W / 2, 598, 13, '#fff', 'center'); label('A=1  J=11  Q=12  K=13', 350 + CW / 2, 468 + CH + 6, 11, '#cfe9d8', 'center'); }
  if (M === 'tripeaks') { label(`${stock.length}`, 130 + CW / 2, 400 + CH + 6, 13, '#cfe9d8', 'center'); label('Una arriba o abajo · K y A enlazan', W / 2, 598, 13, '#fff', 'center');
    if (streak > 1) { const s = 1 + 0.08 * Math.sin(now / 90); c.save(); c.translate(W / 2, 520); c.scale(s, s); label(`Racha x${streak}`, 0, -12, 24, streak > 4 ? '#ffb0e0' : '#ffe27a', 'center'); c.restore(); } }
  if (auto) label('Autocompletando…', W / 2, BY - 26, 14, '#ffe27a', 'center');
  const H3 = hs.slice(-3); btn(16, 120, newAsk > 0 ? '¿Seguro?' : 'Nueva', 'new', true, H3[0]); btn(180, 120, 'Deshacer', 'undo', hist.length > 0 && undoLeft > 0, H3[1]); btn(344, 120, 'Pista', 'hint', true, H3[2]);
}
/* ---------- Cascada de celebración ---------- */
function startCascade() {
  let q = []; if (M === 'spider') { comp.forEach((run) => q.push(run[0])); comp.forEach((run) => q.push(...run.slice(1))); } else if (M === 'pyramid') q = disc.slice().reverse(); else if (M === 'tripeaks') q = waste.slice().reverse();
  else for (let r = 12; r >= 0; r--) for (let i = 0; i < 4; i++) if (found[i][r]) q.push(found[i][r]);
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  casc = { cv, g, q, fl: [], gone: new Set(), t: 0, next: 0.4, end: false }; k.sfx('win');
}
function stepCascade(dt) {
  const C = casc; C.t += dt; C.next -= dt;
  if (C.next <= 0 && C.q.length) { C.next = 0.08; const cd = C.q.shift(), a = AP.get(cd.id) || { x: W / 2, y: TOP }; C.gone.add(cd.id); C.fl.push({ cd, x: a.x, y: a.y, vx: (Math.random() < 0.5 ? -1 : 1) * k.rnd(150, 300), vy: -k.rnd(40, 320) }); }
  for (const f of C.fl) { f.vy += 1100 * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.y > H - CH) { f.y = H - CH; f.vy *= -0.72; if (Math.abs(f.vy) < 90) f.vy = -k.rnd(250, 420); }
    C.g.drawImage(face(f.cd), f.x - PAD, f.y - PAD, CW + PAD * 2, CH + PAD * 2); }
  C.fl = C.fl.filter((f) => f.x > -CW - 10 && f.x < W + 10); if ((!C.q.length && !C.fl.length) || C.t > 7) C.end = true;
}

k.onDif = () => { if (k.st !== 'play') reset(); };
reset(); k.show(CFG.title, CFG.help);
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (done) { if (casc) { stepCascade(dt); if (casc.end || k.ptr.hit || k.hit.has('a')) finishWin(); } return; }
  time += dt; newAsk = Math.max(0, newAsk - dt); spawnQ = Math.max(0, spawnQ - dt); if (hintT > 0 && (hintT -= dt) <= 0) hintR = null;
  if (stuckT > 0 && (stuckT -= dt) <= 0) { k.lose(CFG.id, score, 'Sin movimientos', `${moves} movimiento${moves === 1 ? "" : "s"}`); return; }
  if (auto) { autoT -= dt; if (autoT <= 0) { autoT = 0.09; if (!autoStep()) auto = false; } return; }
  /* 1.23: más fácil — pista automática tras 15 s sin tocar */
  if (k.ptr.down || k.held.size) idleH = 0; else if ((idleH += dt) > IDLEH() && !hintR && !stuckT) { idleH = -30; const h = findHint(); if (h && h[0]) { hintR = h.filter(Boolean); hintT = HINTT(); } }
  for (const d of ['left', 'right', 'up', 'down']) if (k.hit.has(d)) nav(d);
  if (k.hit.has('a')) { if (kbd) act(curH()); else nav('right'); }
  if (k.hit.has('b')) undo();
  const p = k.ptr;
  if (p.hit) { kbd = false; const h = hitAt(p.x, p.y), g = grab(h); drag = g ? { ...g, h, ox: p.x - h.x, oy: p.y - h.y, ids: new Set(g.stack.map((q) => q.id)), moved: false } : { h }; }
  if (drag && drag.stack && p.down && Math.hypot(p.x - p.sx, p.y - p.sy) > 8) drag.moved = true;
  if (p.up && drag) { const dr = drag; drag = null;
    if (dr.stack && Math.hypot(p.x - p.sx, p.y - p.sy) > 12) { const d = dropAt(p.x - dr.ox + CW / 2, p.y - dr.oy + CH / 2) || dropAt(p.x, p.y);
      if (d && canDrop(dr.stack, dr.from, d)) doMove(dr.stack, dr.from, d); else if (!(d && d.t === 'tab' && dr.from.t === 'tab' && d.i === dr.from.i)) navigator.vibrate && navigator.vibrate(20); }
    else if (Math.hypot(p.x - p.sx, p.y - p.sy) <= 20) act(hitAt(p.x, p.y) || dr.h); }
}, draw);
