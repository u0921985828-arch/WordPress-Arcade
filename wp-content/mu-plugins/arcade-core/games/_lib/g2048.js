/* 2048 (CFG.hex = false|true) */
const HEX = !!CFG.hex, k = Kit({ w: 480, h: 560, title: CFG.title, bg: '#1d1830' }), c = k.ctx;
const COL = { 2: '#efe6d8', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
let cells, tiles, score, anim;
const SQ_D = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };
const HX_D = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
function px(cl) { if (!HEX) return [60 + cl[0] * 95 + 47, 130 + cl[1] * 95 + 47]; return [240 + 50 * Math.sqrt(3) * (cl[0] + cl[1] / 2), 330 + 50 * 1.5 * cl[1]]; }
function build() { cells = []; if (HEX) { for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) cells.push([q, r]); } else for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) cells.push([x, y]); }
const key = (a) => a[0] + ',' + a[1];
function add() { const empty = cells.filter((cl) => !tiles[key(cl)]); if (!empty.length) return; const cl = k.pick(empty); tiles[key(cl)] = { v: Math.random() < 0.9 ? 2 : 4, pop: 0 }; }
function slide(d) {
  const [dx, dy] = d, vp = HEX ? [Math.sqrt(3) * (dx + dy / 2), 1.5 * dy] : [dx, dy];
  const order = [...cells].sort((a, b) => { const pa = HEX ? [Math.sqrt(3) * (a[0] + a[1] / 2), 1.5 * a[1]] : a, pb = HEX ? [Math.sqrt(3) * (b[0] + b[1] / 2), 1.5 * b[1]] : b; return (pb[0] * vp[0] + pb[1] * vp[1]) - (pa[0] * vp[0] + pa[1] * vp[1]); });
  const valid = new Set(cells.map(key)), merged = new Set(); let moved = false;
  for (const cl of order) { const t = tiles[key(cl)]; if (!t) continue; let cur = cl;
    while (true) { const nx = [cur[0] + dx, cur[1] + dy], nk = key(nx); if (!valid.has(nk)) break; const o = tiles[nk];
      if (!o) { tiles[nk] = t; delete tiles[key(cur)]; cur = nx; moved = true; continue; }
      if (o.v === t.v && !merged.has(nk)) { o.v *= 2; o.pop = 0.15; score += o.v; { const [bx2, by2] = px(nx); k.burst(bx2, by2, COL[o.v] || '#edc22e', o.v >= 128 ? 16 : 6, 110); } merged.add(nk); delete tiles[key(cur)]; moved = true; } break; } }
  if (moved) { k.sfx(merged.size ? 'pop' : 'click'); add(); if (Object.values(tiles).some((q) => q.v >= 2048) && !anim) { anim = 1; k.show('¡2048!', 'Sigue jugando para más puntos'); setTimeout(() => k.hide(), 1400); } if (!canMove()) k.lose(CFG.id, score, 'Sin movimientos'); }
}
function canMove() { if (cells.some((cl) => !tiles[key(cl)])) return true; const dirs = HEX ? HX_D : Object.values(SQ_D); return cells.some((cl) => dirs.some(([dx, dy]) => { const o = tiles[key([cl[0] + dx, cl[1] + dy])]; return o && o.v === tiles[key(cl)].v; })); }
function reset() { build(); tiles = {}; score = 0; anim = 0; add(); add(); }
reset(); k.show(CFG.title, HEX ? 'Desliza en 6 direcciones (teclado: flechas + Q E Z C) para unir fichas iguales.' : 'Desliza o usa las flechas para unir fichas iguales. Llega a 2048.');
const HEXKEY = { KeyQ: 2, KeyE: 1, KeyZ: 4, KeyC: 5 };
addEventListener('keydown', (e) => { if (HEX && k.st === 'play' && HEXKEY[e.code] !== undefined) slide(HX_D[HEXKEY[e.code]]); });
k.run((dt) => {
  for (const t of Object.values(tiles)) t.pop = Math.max(0, t.pop - dt);
  if (!k.gate(reset)) return;
  if (k.ptr.up) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy; if (Math.hypot(dx, dy) * k.scale > 24) {
    if (HEX) { const a = Math.atan2(-dy, dx); const i = ((Math.round(a / (Math.PI / 3)) % 6) + 6) % 6; /* 0=E,1=NE,2=NW,3=W,4=SW,5=SE */ slide([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]][i]); }
    else slide(SQ_D[Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')]); } }
  if (!HEX) for (const d of ['up', 'down', 'left', 'right']) if (k.hit.has(d)) slide(SQ_D[d]);
  if (HEX) { if (k.hit.has('left')) slide([-1, 0]); if (k.hit.has('right')) slide([1, 0]); if (k.hit.has('up')) slide([0, -1]); if (k.hit.has('down')) slide([0, 1]); }
}, () => {
  k.clear(); k.text(CFG.title, 30, 30, 28, '#f2d15c'); k.text(`${score}`, 450, 34, 24, '#fff', 'right'); k.text(`Récord ${k.best(CFG.id, 0)}`, 450, 64, 13, '#b8b6e0', 'right');
  for (const cl of cells) { const [x, y] = px(cl), t = tiles[key(cl)], s = (t && t.pop > 0 ? 1.08 : 1);
    if (HEX) { const hexp = (r, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.fill(); }; hexp(48, '#2e2748'); if (t) hexp(44 * s, COL[t.v] || '#3c3a32'); }
    else { k.rrect(x - 44, y - 44, 88, 88, 10, '#2e2748'); if (t) k.rrect(x - 44 * s, y - 44 * s, 88 * s, 88 * s, 10, COL[t.v] || '#3c3a32'); }
    if (t) k.text(t.v, x, y - (t.v > 999 ? 11 : 15), t.v > 999 ? 22 : 30, t.v <= 4 ? '#5a4f45' : '#fff', 'center'); }
});
