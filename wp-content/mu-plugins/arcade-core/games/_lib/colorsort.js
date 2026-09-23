/* Color Sort: pasa capas de color entre tubos hasta que cada tubo tenga un solo color */
const k = Kit({ w: 480, h: 640, title: CFG.title, bg: '#15122a' }), c = k.ctx, CAP = 4;
const COL = ['#ff5f5f', '#5ce1e6', '#f2d15c', '#7cf7a0', '#b98cff', '#ffa94d', '#ff9ad5', '#6c8cff', '#c7f464'];
let tubes, sel, level, moves, done, hist, pour;
function build() { const n = Math.min(9, 3 + level); const all = []; for (let i = 0; i < n; i++) for (let j = 0; j < CAP; j++) all.push(i); k.shuffle(all); tubes = []; for (let i = 0; i < n; i++) tubes.push(all.slice(i * CAP, i * CAP + CAP)); tubes.push([], []); sel = null; moves = 0; done = false; hist = []; if (tubes.every((t) => !t.length || (t.length === CAP && t.every((v) => v === t[0])))) build(); }
function layout(i) { const n = tubes.length, perRow = Math.min(n, 6), rows = Math.ceil(n / perRow), row = Math.floor(i / perRow), inRow = Math.min(perRow, n - row * perRow), col = i % perRow; const w = 62; return [240 - inRow * w / 2 + col * w + 8, 150 + row * 230 - (rows === 1 ? -60 : 0), 46, 190]; }
function canPour(a, b) { const A = tubes[a], B = tubes[b]; return a !== b && A.length && B.length < CAP && (!B.length || B[B.length - 1] === A[A.length - 1]); }
function doPour(a, b) { hist.push(JSON.stringify(tubes)); const A = tubes[a], B = tubes[b], col = A[A.length - 1]; while (A.length && A[A.length - 1] === col && B.length < CAP) B.push(A.pop()); moves++; pour = { b, t: 0.25 }; k.sfx('pop');
  if (tubes.every((t) => !t.length || (t.length === CAP && t.every((v) => v === t[0])))) { done = true; setTimeout(() => { k.st = 'over'; k.show('¡Ordenado!', `Nivel ${level} en ${moves} movimientos<br>Toca para el siguiente`); level++; }, 500); } }
function reset() { if (!level) level = 1; build(); }
reset(); k.show(CFG.title, 'Toca un tubo y luego otro para verter el color de arriba. Solo se puede verter sobre el mismo color o en un tubo vacío.');
k.run((dt) => { if (pour) { pour.t -= dt; if (pour.t <= 0) pour = null; }
  if (!k.gate(reset) || done) return;
  if (k.ptr.hit) { if (k.ptr.y > 590) { if (hist.length) { tubes = JSON.parse(hist.pop()); moves++; } sel = null; return; }
    const i = tubes.findIndex((_, j) => { const [x, y, w, h] = layout(j); return k.ptr.x > x - 6 && k.ptr.x < x + w + 6 && k.ptr.y > y - 20 && k.ptr.y < y + h + 10; });
    if (i < 0) sel = null; else if (sel === null) { if (tubes[i].length) sel = i; } else { if (canPour(sel, i)) doPour(sel, i); sel = null; } } }, () => {
  k.clear(); k.text(CFG.title, 20, 24, 24, '#f2d15c'); k.text(`Nivel ${level} · Movs ${moves}`, 460, 28, 16, '#fff', 'right');
  tubes.forEach((t, i) => { let [x, y, w, h] = layout(i); if (sel === i) y -= 18; c.strokeStyle = sel === i ? '#fff' : '#8a86b5'; c.lineWidth = 3; k.rrect(x, y, w, h, 20, '#221d3f');
    t.forEach((v, j) => { const lh = (h - 14) / CAP; k.rrect(x + 5, y + h - 7 - (j + 1) * lh, w - 10, lh - 2, j === 0 ? 14 : 4, COL[v]); });
    c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 20) : c.rect(x, y, w, h); c.stroke(); if (pour && pour.b === i) k.circle(x + w / 2, y - 10, 5, '#fff'); });
  k.rrect(170, 596, 140, 32, 16, '#2e2856'); k.text('↶ Deshacer', 240, 604, 15, '#fff', 'center');
});
