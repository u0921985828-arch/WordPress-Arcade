/* Mahjong Solitaire: empareja fichas libres iguales. Disposiciones por nivel generadas por colocación inversa (siempre resolubles).
 * Fichas gruesas con cara y lateral cacheadas, símbolos dibujados, pistas, combos y barajado resoluble cuando no quedan parejas. */
const W = 640, H = 480, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#0f3a33' }), c = k.ctx;
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms); /* 1.23: la pantalla final espera si el juego está en pausa */
const TW = 44, TH = 56, DX = 6, DY = 7, OX = (W - 12 * TW) / 2, OY = 76, NT = 27;
/* 0-8 caracteres 1-9 · 9-14 círculos 1-6 · 15-19 bambúes 1-5 · 20-23 vientos E S O N · 24-26 dragones rojo, verde y blanco */
const SUITC = (t) => (t < 9 ? '#d5303e' : t < 15 ? '#2d6fd0' : t < 20 ? '#2a9a5a' : t < 24 ? '#22306e' : ['#d5303e', '#2a9a5a', '#2d6fd0'][t - 24]);
const NAMES = ['Tortuga', 'Pirámide', 'Puentes'];
let tiles, sel, score, level, done, hints, t, hint, shuf, combo, comboT, fly, dirty, cur, kbd, boardCv;
function layout() {
  const L = [], v = (level - 1) % 3;
  if (v === 0) { for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) if (!(y === 0 || y === 5) || (x > 1 && x < 10)) L.push([x, y, 0]); for (let y = 1; y < 5; y++) for (let x = 3; x < 9; x++) L.push([x, y, 1]); for (let y = 2; y < 4; y++) for (let x = 4; x < 8; x++) L.push([x, y, 2]); L.push([5.5, 2.5, 3]); }
  if (v === 1) { for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) if (!((x === 0 || x === 11) && (y === 0 || y === 5))) L.push([x, y, 0]); for (let y = 1; y < 5; y++) for (let x = 2; x < 10; x++) L.push([x, y, 1]); for (let y = 1.5; y < 4; y++) for (let x = 3.5; x < 8; x++) L.push([x, y, 2]); for (let x = 4.5; x < 7; x++) L.push([x, 2.5, 3]); }
  if (v === 2) { for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) if (!((x === 5 || x === 6) && (y === 0 || y === 5))) L.push([x, y, 0]); for (const bx of [1, 7]) { for (let y = 1; y < 5; y++) for (let x = bx; x < bx + 4; x++) L.push([x, y, 1]); for (let y = 2; y < 4; y++) for (let x = bx + 1; x < bx + 3; x++) L.push([x, y, 2]); L.push([bx + 1.5, 2.5, 3]); } for (let x = 5; x < 7; x++) L.push([x, 2.5, 1]); }
  return L;
}
const blocks = (a, b) => b.z === a.z + 1 && Math.abs(b.x - a.x) < 1 && Math.abs(b.y - a.y) < 1;
function free(tl, set) { if (set.some((o) => o !== tl && blocks(tl, o))) return false; const side = (dx) => set.some((o) => o !== tl && o.z === tl.z && Math.abs(o.y - tl.y) < 1 && Math.abs(o.x - (tl.x + dx)) < 0.5); return !side(-1) || !side(1); }
/* Colocación inversa: se retiran parejas libres del tablero lleno y se les asigna tipo → ese orden es una solución */
function assign(pos, types) {
  for (let tries = 0; tries < 60; tries++) { const rem = pos.map((p) => ({ x: p.x, y: p.y, z: p.z })), placed = []; let ok = true; const ts = k.shuffle(types.slice());
    for (const ty of ts) { const fr = rem.filter((p) => free(p, rem)); if (fr.length < 2) { ok = false; break; } k.shuffle(fr); const a = fr[0], b = fr[1]; a.t = ty; b.t = ty; placed.push(a, b); rem.splice(rem.indexOf(a), 1); rem.splice(rem.indexOf(b), 1); }
    if (ok) return placed; }
  return null;
}
function build() {
  tiles = null; let pos = layout().map(([x, y, z]) => ({ x, y, z })); if (pos.length % 2) pos.pop();
  const nT = Math.min(NT, 9 + (level - 1) * 4); /* nivel 1: 9 símbolos (más parejas a la vista) → 27 en el nivel 6 */
  tiles = assign(pos, [...Array(pos.length / 2).keys()].map((i) => i % nT)); if (!tiles || !tiles.length) return build();
  sel = null; done = false; hints = level <= 2 ? 6 : 4; shuf = level <= 2 ? 4 : 3; t = 0; hint = null; combo = 0; comboT = 0; fly = []; dirty = true;
}
function moves() { const fr = tiles.filter((q) => free(q, tiles)); for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length; j++) if (fr[i].t === fr[j].t) return [fr[i], fr[j]]; return null; }
/* Barajado que conserva la garantía: se reasignan los tipos restantes con colocación inversa */
function reshuffle() { const types = []; const cnt = {}; tiles.forEach((q) => (cnt[q.t] = (cnt[q.t] || 0) + 1)); for (const ty in cnt) for (let i = 0; i < cnt[ty] / 2; i++) types.push(+ty);
  const nt = assign(tiles, types); if (nt) { tiles = nt; sel = null; hint = null; dirty = true; } else k.lose(CFG.id, score, 'Sin parejas libres', `Nivel ${level}`); /* 1.23: si no se puede barajar, fin (antes se quedaba atascado) */ }
function reset() { if (!level || (k.st === 'over' && !done)) { level = 1; score = 0; } build(); }
const sx = (q) => OX + q.x * TW - q.z * DX, sy = (q) => OY + q.y * TH - q.z * DY;
function pick(px, py) { const order = [...tiles].sort((a, b) => b.z - a.z || b.y - a.y || b.x - a.x); return order.find((q) => px > sx(q) && px < sx(q) + TW - 2 && py > sy(q) && py < sy(q) + TH - 2); }
function tap(tl) {
  if (!tl || !free(tl, tiles)) { if (tl) { k.sfx('hit'); k.shake(2); } sel = null; return; }
  if (sel && sel !== tl && sel.t === tl.t) {
    tiles = tiles.filter((q) => q !== sel && q !== tl); dirty = true; combo = comboT > 0 ? combo + 1 : 1; comboT = 4; const pts = 20 * Math.min(combo, 5); score += pts;
    const mx = (sx(sel) + sx(tl)) / 2 + TW / 2, my = (sy(sel) + sy(tl)) / 2 + TH / 2; for (const q of [sel, tl]) fly.push({ q, x: sx(q), y: sy(q), mx: mx - TW / 2, my: my - TH / 2, a: 0 });
    k.float(combo > 1 ? `Combo x${combo} +${pts}` : `+${pts}`, mx, my - 30, combo > 1 ? '#ffb0e0' : '#ffe27a'); k.sfx(combo > 2 ? 'coin' : 'pop'); sel = null; hint = null;
    if (!tiles.length) { done = true; const bonus = Math.max(100, 1000 - Math.floor(t) * 2); score += bonus; later(() => { k.st = 'over'; k.show('¡Tablero limpio!', `Nivel ${level} (${NAMES[(level - 1) % 3]}) · Bonus de tiempo ${bonus} · ${score} puntos · Récord ${k.best(CFG.id, score)}<br>Toca para el siguiente tablero`); level++; }, 700); }
    else if (!moves()) { if (shuf > 0) { shuf--; later(() => { reshuffle(); k.float('Sin parejas: barajando', W / 2, H / 2, '#fff'); k.sfx('shoot'); }, 450); } else later(() => k.lose(CFG.id, score, 'Sin parejas libres', `Nivel ${level}`), 450); }
  } else if (sel && sel !== tl) { sel = tl; k.sfx('click'); }
  else { sel = sel === tl ? null : tl; k.sfx('click'); }
}
function useHint() { if (hints > 0 && !hint) { hint = moves(); if (hint) { hints--; k.sfx('coin'); } } }
function nav(dir) { const fr = tiles.filter((q) => free(q, tiles)); if (!fr.length) return; if (!kbd || !cur || !tiles.includes(cur)) { kbd = true; cur = sel && tiles.includes(sel) ? sel : fr[0]; return; }
  const cx = sx(cur), cy = sy(cur); let best = null, bd = 1e9; for (const q of fr) { if (q === cur) continue; const dx = sx(q) - cx, dy = sy(q) - cy, al = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy, pe = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx); if (al < 5) continue; const s = al + pe * 2; if (s < bd) { bd = s; best = q; } }
  if (best) { cur = best; k.sfx('click'); } }
reset(); k.show(CFG.title, 'Toca dos fichas iguales que estén libres (sin nada encima y con un lado libre). Encadena parejas rápido para hacer combos. B o el botón = pista.');
k.run((dt) => {
  for (const f of fly) f.a += dt * 3.2; fly = fly.filter((f) => { if (f.a >= 1 && !f.b) { f.b = 1; k.burst(f.mx + TW / 2, f.my + TH / 2, SUITC(f.q.t), 10, 130); } return f.a < 1.25; });
  if (!k.gate(reset) || done) return; t += dt; comboT = Math.max(0, comboT - dt); if (comboT <= 0) combo = 0;
  for (const d of ['left', 'right', 'up', 'down']) if (k.hit.has(d)) nav(d);
  if (k.hit.has('a')) { if (kbd && cur && tiles.includes(cur)) tap(cur); else nav('right'); }
  if (k.hit.has('b')) useHint();
  if (k.ptr.hit) { kbd = false; if (k.ptr.y > 432 && Math.abs(k.ptr.x - W / 2) < 80) return useHint(); tap(pick(k.ptr.x, k.ptr.y)); }
}, draw);

/* ================= Arte ================= */
function rrp(g, x, y, w, h, r) { ART.rr(g, x, y, w, h, r); }
function dotC(g, x, y, r, col) { /* círculo: anillos por color, sin contorno interior */
  g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fillStyle = ART.dark(col, 0.45); g.fill();
  g.beginPath(); g.arc(x, y - r * 0.08, r * 0.9, 0, 6.283); g.fillStyle = col; g.fill();
  g.beginPath(); g.arc(x, y, r * 0.6, 0, 6.283); g.fillStyle = '#fffaf0'; g.fill();
  g.beginPath(); g.arc(x, y, r * 0.34, 0, 6.283); g.fillStyle = col; g.fill();
  g.beginPath(); g.arc(x - r * 0.3, y - r * 0.34, r * 0.22, 0, 6.283); g.fillStyle = 'rgba(255,255,255,.5)'; g.fill(); }
function stick(g, x, y, h, col) { /* bambú: una caña, nudo por sombra */
  rrp(g, x - 3, y - h / 2, 6, h, 3); const gr = g.createLinearGradient(x - 3, 0, x + 3, 0); gr.addColorStop(0, ART.lite(col, 0.35)); gr.addColorStop(0.45, col); gr.addColorStop(1, ART.dark(col, 0.35));
  g.fillStyle = gr; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke();
  g.save(); rrp(g, x - 3, y - h / 2, 6, h, 3); g.clip();
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 3, y - 0.9, 6, 1.8); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 3, y + 0.9, 6, 0.8); g.restore(); }
function symbol(g, ty, cx, cy) {
  const col = SUITC(ty); g.lineJoin = 'round';
  if (ty < 9) { const n = ty + 1; g.font = '900 22px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = '#fffaf0'; g.strokeText(n, cx, cy - 9); g.fillStyle = '#22306e'; g.fillText(n, cx, cy - 9);
    rrp(g, cx - 10, cy + 5, 20, 15, 3); g.fillStyle = col; g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke(); g.strokeStyle = '#fffaf0'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - 6, cy + 9); g.lineTo(cx + 6, cy + 9); g.moveTo(cx, cy + 8); g.lineTo(cx, cy + 17); g.moveTo(cx - 6, cy + 16); g.quadraticCurveTo(cx, cy + 11, cx + 6, cy + 16); g.stroke(); return; }
  if (ty < 15) { const n = ty - 8, cols = ['#2d6fd0', '#2a9a5a', '#d5303e'];
    const P = { 1: [[0, 0]], 2: [[0, -10], [0, 10]], 3: [[-8, -12], [0, 0], [8, 12]], 4: [[-8, -9], [8, -9], [-8, 9], [8, 9]], 5: [[-8, -11], [8, -11], [0, 0], [-8, 11], [8, 11]], 6: [[-8, -13], [8, -13], [-8, 0], [8, 0], [-8, 13], [8, 13]] }[n];
    P.forEach(([dx, dy], i) => dotC(g, cx + dx, cy + dy, n === 1 ? 14 : n < 4 ? 7.5 : 6.5, n === 1 ? '#d5303e' : cols[(i + n) % 3])); if (n === 1) { g.beginPath(); g.arc(cx, cy, 18, 0, 6.283); g.strokeStyle = '#2a9a5a'; g.lineWidth = 2; g.stroke(); } return; }
  if (ty < 20) { const n = ty - 14, gr = '#2a9a5a', rd = '#d5303e';
    if (n === 1) { stick(g, cx, cy + 2, 34, gr); g.beginPath(); g.moveTo(cx + 2, cy - 8); g.quadraticCurveTo(cx + 14, cy - 18, cx + 13, cy - 4); g.quadraticCurveTo(cx + 8, cy - 8, cx + 2, cy - 8); g.fillStyle = gr; g.fill(); g.stroke(); g.beginPath(); g.arc(cx, cy - 16, 4, 0, 6.283); g.fillStyle = rd; g.fill(); g.stroke(); return; }
    const P = { 2: [[0, -10], [0, 10]], 3: [[0, -10], [-7, 10], [7, 10]], 4: [[-7, -10], [7, -10], [-7, 10], [7, 10]], 5: [[-10, -10], [10, -10], [0, 0], [-10, 10], [10, 10]] }[n];
    P.forEach(([dx, dy], i) => stick(g, cx + dx, cy + dy, 17, n === 5 && i === 2 ? rd : i === 0 && n === 3 ? rd : gr)); return; }
  if (ty < 24) { const d = ty - 20, L = ['E', 'S', 'O', 'N'][d], ang = [0, Math.PI / 2, Math.PI, -Math.PI / 2][d];
    g.beginPath(); g.arc(cx, cy + 8, 11, 0, 6.283); g.fillStyle = '#e9e2cf'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
    g.save(); g.translate(cx, cy + 8); g.rotate(ang); g.beginPath(); g.moveTo(10, 0); g.lineTo(-3, -4.5); g.lineTo(-3, 4.5); g.closePath(); g.fillStyle = '#d5303e'; g.fill(); g.stroke(); g.beginPath(); g.moveTo(-9, 0); g.lineTo(-3, -3); g.lineTo(-3, 3); g.closePath(); g.fillStyle = '#22306e'; g.fill(); g.restore();
    g.font = '900 17px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#22306e'; g.fillText(L, cx, cy - 13); return; }
  if (ty === 24) { g.beginPath(); g.moveTo(cx, cy - 20); g.bezierCurveTo(cx + 16, cy - 6, cx + 12, cy + 16, cx, cy + 20); g.bezierCurveTo(cx - 12, cy + 16, cx - 16, cy - 6, cx, cy - 20); g.fillStyle = '#d5303e'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.moveTo(cx, cy - 6); g.bezierCurveTo(cx + 7, cy + 2, cx + 5, cy + 12, cx, cy + 14); g.bezierCurveTo(cx - 5, cy + 12, cx - 7, cy + 2, cx, cy - 6); g.fillStyle = '#ffd05a'; g.fill(); return; }
  if (ty === 25) { for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2.094; g.save(); g.translate(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, 0, 6, 11, 0, 0, 6.283); g.fillStyle = '#2a9a5a'; g.fill(); g.lineWidth = 1.1; g.strokeStyle = OUT; g.stroke(); g.restore(); }
    g.beginPath(); g.arc(cx, cy, 4.5, 0, 6.283); g.fillStyle = '#ffd05a'; g.fill(); g.stroke(); return; }
  rrp(g, cx - 13, cy - 18, 26, 36, 3); g.lineWidth = 3; g.strokeStyle = '#2d6fd0'; g.stroke(); rrp(g, cx - 8, cy - 13, 16, 26, 2); g.lineWidth = 1.5; g.stroke();
}
/* --- Ley de la pieza única (§8): un trazado, un relleno, un contorno --- */
function uni(g, parts, ow) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = (ow || 1.1) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
  g.restore();
}
function inpath(g, parts, fn) { g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip(); fn(g); g.restore(); }
/* Ficha de mahjong: UNA pieza (cara de marfil + canto verde), no tres losas apiladas.
   El canto y la cara se separan por color y sombra propia, nunca por contorno. */
function mkTile(ty) { const cv = document.createElement('canvas'); cv.width = (TW + 10) * 2; cv.height = (TH + 12) * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(1, 1);
  const fw = TW - 2, fh = TH - 2;
  g.fillStyle = 'rgba(0,0,0,.26)'; rrp(g, DX + 1.5, DY + 3.5, fw, fh, 7); g.fill();
  const body = (q) => rrp(q, 0, 0, fw + DX, fh + DY, 7.5), face = (q) => rrp(q, 0, 0, fw, fh, 7);
  const bg = g.createLinearGradient(0, fh * 0.5, fw + DX, fh + DY); bg.addColorStop(0, '#cbb890'); bg.addColorStop(0.5, '#a89469'); bg.addColorStop(1, '#7c6a49');
  const fg = g.createLinearGradient(0, 0, fw * 0.8, fh); fg.addColorStop(0, '#fffdf6'); fg.addColorStop(0.55, '#f7eeda'); fg.addColorStop(1, '#e8dbbd');
  const parts = [[body, bg], [face, fg]];
  uni(g, parts, 1.55);
  inpath(g, parts, (q) => {
    /* canto: el marfil se vuelve verde por color; la arista, por sombra */
    let gr = q.createLinearGradient(fw - 2, 0, fw + DX, 0); gr.addColorStop(0, 'rgba(0,0,0,.34)'); gr.addColorStop(0.35, 'rgba(0,0,0,.06)'); gr.addColorStop(1, 'rgba(0,0,0,.28)');
    q.fillStyle = gr; q.fillRect(fw - 2, 4, DX + 2, fh + DY);
    gr = q.createLinearGradient(0, fh - 2, 0, fh + DY); gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(0.4, 'rgba(0,0,0,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.3)');
    q.fillStyle = gr; q.fillRect(4, fh - 2, fw + DX, DY + 2);
    /* veta del marfil (determinista, no un patrón repetido) */
    let sd = ty * 977 + 13; const rr = () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 26; i++) { const x = rr() * fw, y = rr() * fh, l = 3 + rr() * 9;
      q.fillStyle = rr() < 0.5 ? 'rgba(160,140,100,.10)' : 'rgba(255,255,255,.28)'; q.fillRect(x, y, l, 0.8); }
    gr = q.createLinearGradient(0, 0, 0, fh); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(0.12, 'rgba(255,255,255,0)'); gr.addColorStop(0.82, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.14)');
    q.fillStyle = gr; q.fillRect(0, 0, fw, fh);
  });
  g.save(); g.beginPath(); face(g); g.clip(); symbol(g, ty, fw / 2, fh / 2); g.restore(); return cv; }
const SPR = []; const spr = (ty) => SPR[ty] || (SPR[ty] = mkTile(ty));
const BG = (() => { const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  let gr = g.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H / 2, W * 0.7); gr.addColorStop(0, '#1d6b58'); gr.addColorStop(1, '#0b302a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1.5; for (let y = -20; y < H + 40; y += 40) for (let x = -20; x < W + 40; x += 40) { g.beginPath(); g.arc(x, y, 20, 0, Math.PI); g.stroke(); g.beginPath(); g.arc(x + 20, y + 20, 20, 0, Math.PI); g.stroke(); }
  for (let i = 0; i < 4000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.06)'; g.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
  gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createLinearGradient(0, 0, 0, 50); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 50); return cv; })();
function order(a, b) { return a.z - b.z || a.y - b.y || a.x - b.x; }
function renderBoard() { if (!boardCv) { boardCv = document.createElement('canvas'); boardCv.width = W * 2; boardCv.height = H * 2; } const g = boardCv.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, W, H);
  for (const q of [...tiles].sort(order)) { const x = sx(q), y = sy(q); g.drawImage(spr(q.t), x - 1, y - 1, TW + 10, TH + 12); if (!free(q, tiles)) { g.fillStyle = 'rgba(20,45,38,.3)'; rrp(g, x, y, TW - 2, TH - 2, 7); g.fill(); } }
  dirty = false; }
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function ring(q, col, lw, lift) { const x = sx(q), y = sy(q) - (lift || 0); c.strokeStyle = col; c.lineWidth = lw; rrp(c, x - 2, y - 2, TW + 2, TH + 2, 9); c.stroke(); }
function draw() {
  const now = performance.now() / 1000; c.drawImage(BG, 0, 0, W, H); if (dirty) renderBoard(); c.drawImage(boardCv, 0, 0, W, H);
  // ficha bajo el puntero / seleccionada: se eleva
  const hov = !kbd && k.st === 'play' && !k.ptr.down ? pick(k.ptr.x, k.ptr.y) : null;
  for (const q of [hov, kbd ? cur : null, sel]) if (q && tiles.includes(q) && free(q, tiles)) { const l = q === sel ? 4 : 2; c.drawImage(spr(q.t), sx(q) - 1, sy(q) - 1 - l, TW + 10, TH + 12); if (q === sel) { c.fillStyle = 'rgba(255,226,122,.28)'; rrp(c, sx(q), sy(q) - l, TW - 2, TH - 2, 7); c.fill(); ring(q, '#ffd84a', 3.5, l); } else if (q === cur && kbd) ring(q, '#5ce1e6', 3, l); else ring(q, 'rgba(255,255,255,.7)', 2, l); }
  if (hint) for (const q of hint) if (tiles.includes(q)) ring(q, `rgba(124,247,160,${0.6 + 0.4 * Math.sin(now * 8)})`, 4);
  // parejas que vuelan al centro y desaparecen
  for (const f of fly) { const e = Math.min(1, f.a), ee = e * e * (3 - 2 * e), x = f.x + (f.mx - f.x) * ee, y = f.y + (f.my - f.y) * ee - Math.sin(e * Math.PI) * 30, s = f.a > 1 ? 1 + (f.a - 1) * 2 : 1 + e * 0.15;
    c.save(); c.globalAlpha = f.a > 1 ? Math.max(0, 1 - (f.a - 1) * 4) : 1; c.translate(x + TW / 2, y + TH / 2); c.scale(s, s); c.drawImage(spr(f.q.t), -TW / 2 - 1, -TH / 2 - 1, TW + 10, TH + 12); c.restore(); }
  // HUD
  label(CFG.title, 12, 10, 18, '#ffe27a'); label(`Nivel ${level} · ${NAMES[(level - 1) % 3]}`, 12, 32, 12, '#bfe6d6');
  label(`${score}`, W - 12, 8, 20, '#fff', 'right'); label(`Fichas ${tiles.length} · ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, W - 12, 32, 12, '#bfe6d6', 'right');
  if (combo > 1) { const s = 1 + 0.06 * Math.sin(now * 12); c.save(); c.translate(90, 452); c.scale(s, s); label(`Combo x${combo}`, 0, -10, 18, '#ffb0e0', 'center'); c.globalAlpha = 0.8; c.fillStyle = '#ffb0e0'; c.fillRect(-40, 12, 80 * comboT / 4, 4); c.restore(); }
  label(`Barajados ${shuf}`, W - 16, 448, 12, '#bfe6d6', 'right');
  const bx = W / 2 - 75, by = 436, on = hints > 0; rrp(c, bx, by + 3, 150, 34, 14); c.fillStyle = OUT; c.fill(); rrp(c, bx, by, 150, 34, 14); ART.fillOut(c, on ? '#f4e6c4' : '#8d8a97', 2); c.fillStyle = 'rgba(255,255,255,.5)'; rrp(c, bx + 6, by + 3, 138, 7, 4); c.fill();
  c.beginPath(); c.arc(bx + 24, by + 14, 7, 0, 6.283); c.fillStyle = '#ffd84a'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); c.fillStyle = OUT; c.fillRect(bx + 20, by + 22, 8, 4);
  c.font = '800 15px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`Pista (${hints})`, bx + 86, by + 18);
}
