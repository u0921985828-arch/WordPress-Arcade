/* Solitarios con "toque para mover". CFG.mode: 'klondike' | 'spider' | 'freecell' | 'pyramid' | 'tripeaks' */
const M = CFG.mode, k = Kit({ w: 480, h: 680, title: CFG.title, bg: '#0f5132' }), c = k.ctx;
const SUITS = ['♠', '♥', '♦', '♣'], RN = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const red = (cd) => cd.s === 1 || cd.s === 2;
let tab, stock, waste, found, cells, hs, moves, score, sel, done, removed, pyr, peaks, deals, recycles, streak, hist;
const CW = M === 'spider' ? 44 : M === 'freecell' ? 54 : 60, CH = Math.round(CW * 1.4);
function deck(n, suits) { const d = []; for (let i = 0; i < n; i++) for (const s of suits) for (let r = 1; r <= 13; r++) d.push({ r, s, up: false }); return k.shuffle(d); }
function build() {
  moves = 0; sel = null; done = false; hist = []; found = [[], [], [], []]; cells = [null, null, null, null]; waste = []; streak = 0;
  if (M === 'klondike') { const d = deck(1, [0, 1, 2, 3]); tab = []; for (let i = 0; i < 7; i++) { tab.push(d.splice(0, i + 1)); tab[i][i].up = true; } stock = d; recycles = 0; }
  if (M === 'spider') { const d = deck(4, [0, 1]); tab = []; for (let i = 0; i < 10; i++) { tab.push(d.splice(0, i < 4 ? 6 : 5)); tab[i][tab[i].length - 1].up = true; } stock = d; removed = 0; }
  if (M === 'freecell') { const d = deck(1, [0, 1, 2, 3]); d.forEach((cd) => (cd.up = true)); tab = Array.from({ length: 8 }, () => []); d.forEach((cd, i) => tab[i % 8].push(cd)); stock = []; }
  if (M === 'pyramid') { const d = deck(1, [0, 1, 2, 3]); d.forEach((cd) => (cd.up = true)); pyr = []; for (let r = 0; r < 7; r++) { pyr.push(d.splice(0, r + 1)); } stock = d; recycles = 0; }
  if (M === 'tripeaks') { const d = deck(1, [0, 1, 2, 3]); peaks = [d.splice(0, 3), d.splice(0, 6), d.splice(0, 9), d.splice(0, 10)]; peaks[3].forEach((cd) => (cd.up = true)); stock = d; waste = [stock.pop()]; waste[0].up = true; }
}
function snapshot() { hist.push(JSON.stringify({ tab, stock, waste, found, cells, pyr, peaks, removed, recycles, score, streak })); if (hist.length > 60) hist.shift(); }
function undo() { if (!hist.length) return; const s = JSON.parse(hist.pop()); ({ tab, stock, waste, found, cells, pyr, peaks, removed, recycles, score, streak } = s); moves++; sel = null; }
function flipTops() { if (tab) for (const col of tab) if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true; }
function canFound(cd) { return found.findIndex((f) => (!f.length && cd.r === 1 && (M !== 'freecell' || true)) || (f.length && f[f.length - 1].s === cd.s && f[f.length - 1].r === cd.r - 1)); }
function tabOk(stack, col, kind) { const top = col[col.length - 1], b = stack[0]; if (!top) return kind === 'spider' ? true : b.r === 13 || M === 'freecell'; if (!top.up) return false; return top.r === b.r + 1 && (M === 'spider' ? true : red(top) !== red(b)); }
function validRun(stack) { for (let i = 0; i < stack.length - 1; i++) { const a = stack[i], b = stack[i + 1]; if (!b.up || a.r !== b.r + 1 || (M === 'spider' ? a.s !== b.s : red(a) === red(b))) return false; } return stack.every((q) => q.up); }
function freeCellCap(targetEmpty) { const fc = cells.filter((q) => !q).length, ec = tab.filter((q) => !q.length).length - (targetEmpty ? 1 : 0); return (fc + 1) * Math.pow(2, Math.max(0, ec)); }
function tryMove(stack, from) {
  if (stack.length === 1 && M !== 'spider') { const f = canFound(stack[0]); if (f >= 0) { snapshot(); take(from, 1); found[f].push(stack[0]); score += 10; k.sfx('pop'); return true; } }
  const order = tab.map((col, i) => i).filter((i) => !(from.t === 'tab' && from.i === i)).sort((a, b) => (tab[a].length ? 0 : 1) - (tab[b].length ? 0 : 1));
  for (const i of order) { if (!tabOk(stack, tab[i], M)) continue; if (M === 'freecell' && stack.length > freeCellCap(!tab[i].length)) continue; if (M === 'klondike' && !tab[i].length && from.t === 'tab' && from.idx === 0) continue;
    snapshot(); take(from, stack.length); tab[i].push(...stack); score += 5; k.sfx('click'); if (M === 'spider') checkRun(i); return true; }
  if (M === 'freecell' && stack.length === 1 && from.t !== 'cell') { const e = cells.indexOf(null); if (e >= 0) { snapshot(); take(from, 1); cells[e] = stack[0]; return true; } }
  return false;
}
function take(from, n) { if (from.t === 'tab') tab[from.i].splice(tab[from.i].length - n, n); else if (from.t === 'waste') waste.pop(); else if (from.t === 'cell') cells[from.i] = null; else if (from.t === 'found') found[from.i].pop(); flipTops(); moves++; }
function checkRun(i) { const col = tab[i]; if (col.length < 13) return; const run = col.slice(-13); if (run[0].r === 13 && validRun(run)) { col.splice(-13); removed++; score += 100; k.sfx('coin'); flipTops(); } }
function win() { done = true; score += 500; setTimeout(() => { k.st = 'over'; k.show('¡Ganaste!', `${moves} movimientos · ${score} puntos · Récord ${k.best(CFG.id, score)}<br>Toca para una partida nueva`); }, 300); }
function checkWin() { if (M === 'spider' && removed === 8) win(); if ((M === 'klondike' || M === 'freecell') && found.every((f) => f.length === 13)) win(); if (M === 'pyramid' && pyr.every((r) => r.every((q) => !q))) win(); if (M === 'tripeaks' && peaks.every((r) => r.every((q) => !q))) win(); }
function pyrFree(r, j) { if (!pyr[r][j]) return false; if (r === 6) return true; return !pyr[r + 1][j] && !pyr[r + 1][j + 1]; }
function peakFree(r, j) { if (!peaks[r][j]) return false; if (r === 3) return true; const cov = r === 0 ? [2 * j, 2 * j + 1] : r === 1 ? [j + Math.floor(j / 2), j + Math.floor(j / 2) + 1] : [j, j + 1]; return cov.every((q) => !peaks[r + 1][q]); }
function reset() { score = 0; build(); }
reset(); k.show(CFG.title, CFG.help);
function card(x, y, cd, hl) {
  if (!cd.up) { k.rrect(x, y, CW, CH, 6, '#2d3e9e'); k.rrect(x + 4, y + 4, CW - 8, CH - 8, 4, '#3f55c9'); return; }
  k.rrect(x, y, CW, CH, 6, hl ? '#fff4b0' : '#fbfaf5'); const col = red(cd) ? '#d23a4a' : '#1d1d2b';
  k.text(RN[cd.r], x + 4, y + 3, CW < 50 ? 12 : 14, col); k.text(SUITS[cd.s], x + CW - 4, y + 3, CW < 50 ? 12 : 14, col, 'right'); k.text(SUITS[cd.s], x + CW / 2, y + CH / 2 - 12, CW < 50 ? 18 : 24, col, 'center');
}
function slot(x, y, label) { c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, CW - 2, CH - 2); if (label) k.text(label, x + CW / 2, y + CH / 2 - 8, 14, 'rgba(255,255,255,.4)', 'center'); }
k.run(() => {
  if (!k.gate(reset) || done) return;
  if (!k.ptr.up || !hs) return; if (Math.hypot(k.ptr.x - k.ptr.sx, k.ptr.y - k.ptr.sy) > 20) return;
  const h = [...hs].reverse().find((q) => k.ptr.x >= q.x && k.ptr.x <= q.x + q.w && k.ptr.y >= q.y && k.ptr.y <= q.y + q.h); if (!h) { sel = null; return; }
  if (h.a === 'undo') return undo();
  if (h.a === 'stock') {
    if (M === 'klondike') { snapshot(); if (stock.length) { const cd = stock.pop(); cd.up = true; waste.push(cd); } else if (waste.length) { stock = waste.reverse().map((q) => ({ ...q, up: false })); waste = []; score = Math.max(0, score - 20); } moves++; }
    if (M === 'spider' && stock.length && tab.every((q) => q.length)) { snapshot(); for (const col of tab) { const cd = stock.pop(); cd.up = true; col.push(cd); } tab.forEach((_, i) => checkRun(i)); moves++; }
    if (M === 'pyramid') { snapshot(); if (stock.length) { waste.push(stock.pop()); } else if (recycles < 2 && waste.length) { stock = waste.reverse(); waste = []; recycles++; } sel = null; moves++; }
    if (M === 'tripeaks' && stock.length) { snapshot(); const cd = stock.pop(); cd.up = true; waste.push(cd); streak = 0; moves++; }
    checkWin(); return; }
  if (M === 'pyramid') { const cd = h.a === 'pyr' ? pyr[h.r][h.j] : waste[waste.length - 1]; if (!cd) return; const ref = h.a === 'pyr' ? { r: h.r, j: h.j } : { w: 1 };
    const rm = (q) => { if (q.w) waste.pop(); else pyr[q.r][q.j] = null; };
    if (cd.r === 13) { snapshot(); rm(ref); score += 15; sel = null; }
    else if (sel && JSON.stringify(sel) !== JSON.stringify(ref)) { const o = sel.w ? waste[waste.length - 1] : pyr[sel.r][sel.j]; if (o && o.r + cd.r === 13) { snapshot(); if (sel.w && ref.w) return; rm(sel); rm(ref); score += 25; } sel = null; }
    else sel = ref; moves++; checkWin(); return; }
  if (M === 'tripeaks') { if (h.a !== 'peak') return; const cd = peaks[h.r][h.j], top = waste[waste.length - 1]; const d = Math.abs(cd.r - top.r); if (d === 1 || d === 12) { snapshot(); peaks[h.r][h.j] = null; waste.push(cd); streak++; score += 10 * streak; peaks.forEach((row, r) => row.forEach((q, j) => { if (q && peakFree(r, j)) q.up = true; })); moves++; checkWin(); } return; }
  // Klondike / Spider / FreeCell
  let stack, from;
  if (h.a === 'tab') { const col = tab[h.i]; if (!col[h.idx] || !col[h.idx].up) return; stack = col.slice(h.idx); if (!validRun(stack)) return; from = { t: 'tab', i: h.i, idx: h.idx }; }
  if (h.a === 'waste' && waste.length) { stack = [waste[waste.length - 1]]; from = { t: 'waste' }; }
  if (h.a === 'cell' && cells[h.i]) { stack = [cells[h.i]]; from = { t: 'cell', i: h.i }; }
  if (h.a === 'found' && found[h.i].length && M === 'klondike') { stack = [found[h.i][found[h.i].length - 1]]; from = { t: 'found', i: h.i }; if (tryMove(stack, from)) return; }
  if (stack && from.t !== 'found') { if (!tryMove(stack, from)) { if (navigator.vibrate) navigator.vibrate(20); } else checkWin(); }
}, () => {
  k.clear(); hs = [];
  const top = 60, gap = (480 - (M === 'spider' ? 10 : M === 'freecell' ? 8 : 7) * CW) / ((M === 'spider' ? 10 : M === 'freecell' ? 8 : 7) + 1);
  k.text(CFG.title, 12, 12, 18, '#f2d15c'); k.text(`${score} pts · ${moves} movs`, 468, 14, 14, '#fff', 'right');
  k.rrect(190, 646, 100, 28, 14, 'rgba(0,0,0,.3)'); k.text('↶ Deshacer', 240, 652, 13, '#fff', 'center'); hs.push({ x: 190, y: 646, w: 100, h: 28, a: 'undo' });
  const colX = (i) => gap + i * (CW + gap);
  if (M === 'klondike' || M === 'freecell' || M === 'spider') {
    if (M === 'klondike') { const sx = colX(0), wx = colX(1); if (stock.length) card(sx, top, { up: false }); else slot(sx, top, '↺'); hs.push({ x: sx, y: top, w: CW, h: CH, a: 'stock' }); if (waste.length) card(wx, top, waste[waste.length - 1]); hs.push({ x: wx, y: top, w: CW, h: CH, a: 'waste' });
      for (let i = 0; i < 4; i++) { const x = colX(3 + i); const f = found[i]; if (f.length) card(x, top, f[f.length - 1]); else slot(x, top, 'A'); hs.push({ x, y: top, w: CW, h: CH, a: 'found', i }); } }
    if (M === 'freecell') { for (let i = 0; i < 4; i++) { const x = colX(i); if (cells[i]) card(x, top, cells[i]); else slot(x, top); hs.push({ x, y: top, w: CW, h: CH, a: 'cell', i }); const fx = colX(4 + i); const f = found[i]; if (f.length) card(fx, top, f[f.length - 1]); else slot(fx, top, 'A'); } }
    if (M === 'spider') { const sx = 480 - CW - 10; if (stock.length) { card(sx, top, { up: false }); k.text(stock.length / 10, sx + CW / 2, top + CH + 4, 12, '#fff', 'center'); } hs.push({ x: sx, y: top, w: CW, h: CH, a: 'stock' }); k.text(`Completadas ${removed}/8`, 12, top + 10, 14, '#fff'); }
    const ty = top + CH + 24;
    tab.forEach((col, i) => { const x = colX(i); slot(x, ty); const avail = 640 - ty - CH - 10; let dn = 14, up = M === 'spider' ? 20 : 24; const need = col.reduce((s, q) => s + (q.up ? up : dn), 0); if (need > avail) { const f = avail / need; dn *= f; up *= f; }
      let y = ty; col.forEach((cd, idx) => { card(x, y, cd); hs.push({ x, y, w: CW, h: idx === col.length - 1 ? CH : (cd.up ? up : dn), a: 'tab', i, idx }); y += cd.up ? up : dn; }); if (!col.length) hs.push({ x, y: ty, w: CW, h: CH, a: 'tab', i, idx: 0 }); });
  }
  if (M === 'pyramid') { for (let r = 0; r < 7; r++) for (let j = 0; j <= r; j++) { const cd = pyr[r][j]; if (!cd) continue; const x = 240 - (r + 1) * (CW + 4) / 2 + j * (CW + 4), y = top + 30 + r * 46; const free = pyrFree(r, j); card(x, y, cd, sel && sel.r === r && sel.j === j); if (!free) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x, y, CW, CH); } if (free) hs.push({ x, y, w: CW, h: CH, a: 'pyr', r, j }); }
    const sy = 520; if (stock.length) card(140, sy, { up: false }); else slot(140, sy, recycles < 2 ? '↺' : '✕'); hs.push({ x: 140, y: sy, w: CW, h: CH, a: 'stock' }); if (waste.length) card(280, sy, waste[waste.length - 1], sel && sel.w); else slot(280, sy); hs.push({ x: 280, y: sy, w: CW, h: CH, a: 'waste' }); k.text('Empareja cartas que sumen 13 · K sola', 240, 620, 13, '#cfe', 'center'); }
  if (M === 'tripeaks') { const ox = [[0, 0, 0], [0, 0, 0, 0, 0, 0], [], []]; const X = (r, j) => r === 3 ? 12 + j * 44 : r === 2 ? 34 + j * 44 : r === 1 ? 56 + Math.floor(j / 2) * 132 + (j % 2) * 44 : 78 + j * 132;
    for (let r = 0; r < 4; r++) peaks[r].forEach((cd, j) => { if (!cd) return; const x = X(r, j), y = top + 40 + r * 44; card(x, y, cd); if (peakFree(r, j)) hs.push({ x, y, w: CW, h: CH, a: 'peak', r, j }); });
    const sy = 460; if (stock.length) { card(150, sy, { up: false }); k.text(stock.length, 180, sy + CH + 4, 13, '#fff', 'center'); } else slot(150, sy); hs.push({ x: 150, y: sy, w: CW, h: CH, a: 'stock' }); card(270, sy, waste[waste.length - 1]); if (streak > 1) k.text(`Racha x${streak}`, 240, 590, 18, '#f2d15c', 'center'); k.text('Toca cartas una arriba o abajo de la del montón', 240, 620, 13, '#cfe', 'center'); }
});
