/* Solitarios: toca una carta para moverla al mejor sitio o arrástrala. CFG.mode: 'klondike' | 'spider' | 'freecell' | 'pyramid' | 'tripeaks'
 * Cartas cacheadas con relieve y figuras dibujadas, vuelo interpolado y volteo, pistas, autocompletar y cascada final. */
const M = CFG.mode, W = 480, H = 680, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#0c4a2e' }), c = k.ctx;
const RN = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const red = (cd) => cd.s === 1 || cd.s === 2;
let tab, stock, waste, found, cells, hs, moves, score, sel, done, removed, pyr, peaks, deals, recycles, streak, hist, comp, disc, time, auto, autoT, drag, hintT, hintR, cur, kbd, casc, newAsk, stuckT, uid = 0;
const CW = M === 'spider' ? 44 : M === 'freecell' ? 54 : M === 'tripeaks' ? 46 : 60, CH = Math.round(CW * 1.4), CR = Math.round(CW * 0.1), PAD = 5;
const NC = M === 'spider' ? 10 : M === 'freecell' ? 8 : 7, GAP = (W - NC * CW) / (NC + 1), colX = (i) => GAP + i * (CW + GAP);
const TOP = 58, TY = TOP + CH + 22, BOT = 632, BY = 640;
const SPAWN = { klondike: [colX(0), TOP], spider: [colX(9), TOP], freecell: [W / 2 - CW / 2, H + 30], pyramid: [70, 468], tripeaks: [130, 400] }[M];
function deck(n, suits) { const d = []; for (let i = 0; i < n; i++) for (const s of suits) for (let r = 1; r <= 13; r++) d.push({ r, s, up: false, id: uid++ }); return k.shuffle(d); }
function build() {
  moves = 0; sel = null; done = false; hist = []; found = [[], [], [], []]; cells = [null, null, null, null]; waste = []; streak = 0; comp = []; disc = []; time = 0;
  auto = false; autoT = 0; drag = null; hintT = 0; hintR = null; casc = null; newAsk = 0; stuckT = 0; AP.clear(); spawnQ = 0.25;
  if (M === 'klondike') { const d = deck(1, [0, 1, 2, 3]); tab = []; for (let i = 0; i < 7; i++) { tab.push(d.splice(0, i + 1)); tab[i][i].up = true; } stock = d; recycles = 0; }
  if (M === 'spider') { const d = deck(4, [0, 1]); tab = []; for (let i = 0; i < 10; i++) { tab.push(d.splice(0, i < 4 ? 6 : 5)); tab[i][tab[i].length - 1].up = true; } stock = d; removed = 0; }
  if (M === 'freecell') { const d = deck(1, [0, 1, 2, 3]); d.forEach((cd) => (cd.up = true)); tab = Array.from({ length: 8 }, () => []); d.forEach((cd, i) => tab[i % 8].push(cd)); stock = []; }
  if (M === 'pyramid') { const d = deck(1, [0, 1, 2, 3]); pyr = []; for (let r = 0; r < 7; r++) { pyr.push(d.splice(0, r + 1)); pyr[r].forEach((cd) => (cd.up = true)); } stock = d; recycles = 0; }
  if (M === 'tripeaks') { const d = deck(1, [0, 1, 2, 3]); peaks = [d.splice(0, 3), d.splice(0, 6), d.splice(0, 9), d.splice(0, 10)]; peaks[3].forEach((cd) => (cd.up = true)); stock = d; waste = [stock.pop()]; waste[0].up = true; }
}
function snapshot() { hist.push(JSON.stringify({ tab, stock, waste, found, cells, pyr, peaks, removed, recycles, score, streak, comp, disc })); if (hist.length > 80) hist.shift(); hintR = null; }
function undo() { if (!hist.length || auto) return; const s = JSON.parse(hist.pop()); ({ tab, stock, waste, found, cells, pyr, peaks, removed, recycles, score, streak, comp, disc } = s); moves++; sel = null; stuckT = 0; hintR = null; k.sfx('click'); }
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
function finishWin() { casc = null; k.st = 'over'; k.show('¡Ganaste!', `${moves} movimientos · ${fmt(time)} · ${score} puntos · Récord ${k.best(CFG.id, score)}<br>Toca para una partida nueva`); }
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
function showHint() { const h = findHint(); if (!h || !h[0]) { k.float(M === 'freecell' && cells.includes(null) ? 'Prueba a pasar una carta a una celda' : 'Sin movimientos útiles', W / 2, 600, '#ffe27a'); k.sfx('hurt'); return; } hintR = h.filter(Boolean); hintT = 2.4; k.sfx('click'); }

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
function suitPath(g, s, x, y, z) {
  g.save(); g.translate(x, y); g.scale(z, z); g.beginPath();
  if (s === 1) { g.moveTo(0, 0.45); g.bezierCurveTo(-0.15, 0.3, -0.52, 0.08, -0.52, -0.18); g.bezierCurveTo(-0.52, -0.42, -0.22, -0.52, 0, -0.28); g.bezierCurveTo(0.22, -0.52, 0.52, -0.42, 0.52, -0.18); g.bezierCurveTo(0.52, 0.08, 0.15, 0.3, 0, 0.45); }
  else if (s === 2) { g.moveTo(0, -0.5); g.quadraticCurveTo(0.12, -0.14, 0.4, 0); g.quadraticCurveTo(0.12, 0.14, 0, 0.5); g.quadraticCurveTo(-0.12, 0.14, -0.4, 0); g.quadraticCurveTo(-0.12, -0.14, 0, -0.5); }
  else if (s === 0) { g.moveTo(0, -0.5); g.bezierCurveTo(-0.15, -0.34, -0.52, -0.12, -0.52, 0.12); g.bezierCurveTo(-0.52, 0.34, -0.22, 0.4, -0.04, 0.2); g.lineTo(-0.16, 0.5); g.lineTo(0.16, 0.5); g.lineTo(0.04, 0.2); g.bezierCurveTo(0.22, 0.4, 0.52, 0.34, 0.52, 0.12); g.bezierCurveTo(0.52, -0.12, 0.15, -0.34, 0, -0.5); }
  else { for (const [cx, cy] of [[0, -0.24], [-0.23, 0.06], [0.23, 0.06]]) { g.moveTo(cx + 0.21, cy); g.arc(cx, cy, 0.21, 0, 6.283); } g.moveTo(-0.04, 0.05); g.lineTo(-0.15, 0.5); g.lineTo(0.15, 0.5); g.lineTo(0.04, 0.05); }
  g.closePath(); g.restore();
}
function suit(g, s, x, y, z, col) { suitPath(g, s, x, y, z); g.fillStyle = col; g.fill(); }
function sprite(fn) { const cv = document.createElement('canvas'); cv.width = (CW + PAD * 2) * 2; cv.height = (CH + PAD * 2) * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(PAD, PAD);
  g.fillStyle = 'rgba(0,0,0,.25)'; ART.rr(g, 0.5, 2.5, CW, CH, CR); g.fill(); fn(g); return cv; }
function body(g, fill) { ART.rr(g, 0, 0, CW, CH, CR); g.fillStyle = fill; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke(); }
const PIPS = { 2: [[1, 0], [1, 1]], 3: [[1, 0], [1, 0.5], [1, 1]], 4: [[0, 0], [2, 0], [0, 1], [2, 1]], 5: [[0, 0], [2, 0], [1, 0.5], [0, 1], [2, 1]], 6: [[0, 0], [2, 0], [0, 0.5], [2, 0.5], [0, 1], [2, 1]],
  7: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [0, 1], [2, 1]], 8: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [1, 0.75], [0, 1], [2, 1]],
  9: [[0, 0], [2, 0], [0, 1 / 3], [2, 1 / 3], [1, 0.5], [0, 2 / 3], [2, 2 / 3], [0, 1], [2, 1]], 10: [[0, 0], [2, 0], [1, 1 / 6], [0, 1 / 3], [2, 1 / 3], [0, 2 / 3], [2, 2 / 3], [1, 5 / 6], [0, 1], [2, 1]] };
function index(g, cd, col) { const fs = Math.round(CW * 0.3), rs = RN[cd.r]; g.fillStyle = col; g.font = `800 ${fs}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; g.textAlign = 'left'; g.textBaseline = 'top';
  const w = g.measureText(rs).width, mx = CW * 0.4; g.save(); g.translate(CW * 0.07, CW * 0.06); if (w > mx) g.scale(mx / w, 1); g.fillText(rs, 0, 0); g.restore(); suit(g, cd.s, CW - CW * 0.17, CW * 0.06 + fs * 0.5, fs * 0.72, col); }
/* Retrato de figura (J, Q, K) dibujado por código */
function portrait(g, cd, col) {
  const x0 = CW * 0.17, y0 = CH * 0.24, w = CW * 0.66, h = CH * 0.58, px = CW / 2, r = w * 0.2, hy = y0 + h * 0.36, R = red(cd);
  ART.rr(g, x0, y0, w, h, 3); g.fillStyle = R ? '#fde6dc' : '#e2e8f8'; g.fill(); g.save(); g.clip();
  const robe = cd.r === 13 ? (R ? '#d5303e' : '#2f4a9a') : cd.r === 12 ? (R ? '#e0648a' : '#6a4bb0') : (R ? '#e0843a' : '#2f8a6a'), hair = cd.r === 12 ? (R ? '#e8a93a' : '#6b3a1e') : cd.r === 11 ? '#8a5028' : '#b9b3a8';
  if (cd.r === 12) { g.beginPath(); g.ellipse(px, hy + r * 0.5, r * 1.35, r * 1.6, 0, 0, 6.283); g.fillStyle = hair; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke(); }
  g.beginPath(); g.moveTo(px - w * 0.5, y0 + h + 1); g.quadraticCurveTo(px - w * 0.44, hy + r * 1.15, px, hy + r * 1.05); g.quadraticCurveTo(px + w * 0.44, hy + r * 1.15, px + w * 0.5, y0 + h + 1); g.closePath(); g.fillStyle = robe; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = '#f2c14e'; g.fillRect(px - w * 0.07, hy + r * 1.1, w * 0.14, h); g.strokeRect(px - w * 0.07, hy + r * 1.1, w * 0.14, h);
  g.beginPath(); g.arc(px, hy + r * 2.05, r * 0.55, 0, 6.283); g.fillStyle = '#fff'; g.fill(); g.stroke(); suit(g, cd.s, px, hy + r * 2.05, r * 0.7, col);
  g.beginPath(); g.arc(px, hy, r, 0, 6.283); g.fillStyle = '#f7c9a0'; g.fill(); g.stroke();
  if (cd.r === 13) { g.beginPath(); g.moveTo(px - r * 0.85, hy + r * 0.2); g.quadraticCurveTo(px - r * 0.7, hy + r * 1.45, px, hy + r * 1.6); g.quadraticCurveTo(px + r * 0.7, hy + r * 1.45, px + r * 0.85, hy + r * 0.2); g.quadraticCurveTo(px, hy + r * 0.75, px - r * 0.85, hy + r * 0.2); g.fillStyle = hair; g.fill(); g.stroke(); }
  if (cd.r === 12) { g.beginPath(); g.arc(px, hy, r, Math.PI * 1.05, Math.PI * 1.95); g.quadraticCurveTo(px, hy - r * 0.3, px - r * 0.98, hy - r * 0.15); g.fillStyle = hair; g.fill(); }
  if (cd.r === 11) { g.beginPath(); g.arc(px, hy, r, Math.PI, 0); g.closePath(); g.fillStyle = hair; g.fill(); g.stroke(); g.beginPath(); g.ellipse(px, hy - r * 0.75, r * 1.25, r * 0.42, -0.12, 0, 6.283); g.fillStyle = robe; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(px + r * 0.6, hy - r * 0.9); g.quadraticCurveTo(px + r * 1.8, hy - r * 2.2, px + r * 1.9, hy - r * 0.9); g.quadraticCurveTo(px + r * 1.3, hy - r * 1.4, px + r * 0.6, hy - r * 0.9); g.fillStyle = '#f2c14e'; g.fill(); g.stroke(); }
  if (cd.r >= 12) { const cw = cd.r === 13 ? r * 0.85 : r * 0.6, cb = hy - r * 0.72, ch = cd.r === 13 ? r * 0.8 : r * 0.5; g.beginPath(); g.moveTo(px - cw, cb); g.lineTo(px - cw, cb - ch * 0.6); g.lineTo(px - cw * 0.5, cb - ch * 0.25); g.lineTo(px, cb - ch); g.lineTo(px + cw * 0.5, cb - ch * 0.25); g.lineTo(px + cw, cb - ch * 0.6); g.lineTo(px + cw, cb); g.closePath(); g.fillStyle = '#f2c14e'; g.fill(); g.stroke();
    g.beginPath(); g.arc(px, cb - ch * 0.3, Math.max(1, r * 0.13), 0, 6.283); g.fillStyle = R ? '#3a7bd5' : '#e0304a'; g.fill(); }
  g.fillStyle = OUT; for (const d of [-1, 1]) { g.beginPath(); g.arc(px + d * r * 0.36, hy - r * 0.02, Math.max(0.8, r * 0.11), 0, 6.283); g.fill(); }
  g.fillStyle = 'rgba(255,110,110,.45)'; for (const d of [-1, 1]) { g.beginPath(); g.arc(px + d * r * 0.55, hy + r * 0.3, r * 0.16, 0, 6.283); g.fill(); }
  if (cd.r !== 13) { g.beginPath(); g.arc(px, hy + r * 0.3, r * 0.3, 0.2, Math.PI - 0.2); g.lineWidth = 0.9; g.strokeStyle = OUT; g.stroke(); }
  g.restore(); ART.rr(g, x0, y0, w, h, 3); g.lineWidth = 1.2; g.strokeStyle = col; g.stroke();
}
function mkFace(cd) {
  return sprite((g) => {
    body(g, '#fdfaf1'); const gr = g.createLinearGradient(0, 0, 0, CH); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(150,120,80,.14)'); ART.rr(g, 1, 1, CW - 2, CH - 2, CR); g.fillStyle = gr; g.fill();
    const col = red(cd) ? '#d5303e' : '#22203a'; index(g, cd, col); g.save(); g.translate(CW, CH); g.rotate(Math.PI); index(g, cd, col); g.restore();
    if (cd.r >= 11) portrait(g, cd, col);
    else if (cd.r === 1) { suit(g, cd.s, CW / 2, CH * 0.53, CW * 0.52, col); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(CW / 2 - CW * 0.1, CH * 0.47, CW * 0.05, 0, 6.283); g.fill(); }
    else if (CW >= 54) { const xs = [CW * 0.31, CW * 0.5, CW * 0.69], y0 = CH * 0.27, y1 = CH * 0.73, z = CW * 0.17;
      for (const [cx, f] of PIPS[cd.r]) { const x = xs[cx], y = y0 + (y1 - y0) * f; if (f > 0.5) { g.save(); g.translate(x, y); g.rotate(Math.PI); suit(g, cd.s, 0, 0, z, col); g.restore(); } else suit(g, cd.s, x, y, z, col); } }
    else { suit(g, cd.s, CW / 2, CH * 0.58, CW * 0.44, col); }
  });
}
const FC = {}, face = (cd) => FC[cd.r * 4 + cd.s] || (FC[cd.r * 4 + cd.s] = mkFace(cd));
const BACK = sprite((g) => {
  body(g, '#26358a'); const gr = g.createLinearGradient(0, 0, CW, CH); gr.addColorStop(0, '#4460d6'); gr.addColorStop(1, '#27368f'); ART.rr(g, 3, 3, CW - 6, CH - 6, CR * 0.7); g.fillStyle = gr; g.fill();
  g.save(); g.clip(); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1; g.beginPath(); for (let i = -CH; i < CW + CH; i += 7) { g.moveTo(i, 0); g.lineTo(i + CH, CH); g.moveTo(i, CH); g.lineTo(i + CH, 0); } g.stroke();
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, CW, CH * 0.35); g.restore();
  ART.rr(g, 3, 3, CW - 6, CH - 6, CR * 0.7); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.2; g.stroke();
  suitPath(g, 2, CW / 2, CH / 2, CW * 0.42); g.fillStyle = '#f2c14e'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
  suitPath(g, 2, CW / 2, CH / 2, CW * 0.2); g.fillStyle = '#fff3c4'; g.fill();
});
/* Tapete de fieltro con textura y viñeta (cacheado a 2×) */
const FELT = (() => { const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  let gr = g.createRadialGradient(W / 2, H * 0.42, 30, W / 2, H * 0.45, H * 0.75); gr.addColorStop(0, '#1d8150'); gr.addColorStop(1, '#0c4a2e'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.07)'; g.fillRect(Math.random() * W, Math.random() * H, 1, 1 + Math.random()); }
  g.strokeStyle = 'rgba(255,255,255,.025)'; g.lineWidth = 1; g.beginPath(); for (let y = 0; y < H; y += 3) { g.moveTo(0, y); g.lineTo(W, y + 2); } g.stroke();
  gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createLinearGradient(0, 0, 0, 52); gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 52);
  gr = g.createLinearGradient(0, BY - 10, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(0, BY - 10, W, H);
  return cv; })();
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function slot(r, kind) { if (!r) return; const { x, y } = r; c.fillStyle = 'rgba(0,0,0,.18)'; ART.rr(c, x, y, CW, CH, CR); c.fill(); c.setLineDash([5, 4]); c.strokeStyle = 'rgba(255,255,255,.34)'; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
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
  if (it.m) { c.fillStyle = 'rgba(0,0,0,.2)'; ART.rr(c, -CW / 2 + 4, -CH / 2 + 8, CW, CH, CR); c.fill(); }
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
    it.a = a; it.m = dist > 1.5 || it.o.drag; if (it.m) mv.push(it); else drawCard(it); }
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
  const H3 = hs.slice(-3); btn(16, 120, newAsk > 0 ? '¿Seguro?' : 'Nueva', 'new', true, H3[0]); btn(180, 120, 'Deshacer', 'undo', hist.length > 0, H3[1]); btn(344, 120, 'Pista', 'hint', true, H3[2]);
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

reset(); k.show(CFG.title, CFG.help);
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (done) { if (casc) { stepCascade(dt); if (casc.end || k.ptr.hit || k.hit.has('a')) finishWin(); } return; }
  time += dt; newAsk = Math.max(0, newAsk - dt); spawnQ = Math.max(0, spawnQ - dt); if (hintT > 0 && (hintT -= dt) <= 0) hintR = null;
  if (stuckT > 0 && (stuckT -= dt) <= 0) { k.lose(CFG.id, score, 'Sin movimientos', `${moves} movimientos`); return; }
  if (auto) { autoT -= dt; if (autoT <= 0) { autoT = 0.09; if (!autoStep()) auto = false; } return; }
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
