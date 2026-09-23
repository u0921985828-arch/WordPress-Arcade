/* Reflex Grid: toca los objetivos antes de que desaparezcan, evita las bombas. 60 s */
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#191530' }), c = k.ctx;
let N, cells, time, score, combo, spawnT, fx, lvl;
function reset() { N = 3; cells = Array(16).fill(null); time = 60; score = 0; combo = 0; spawnT = 0.5; fx = []; lvl = 1; }
reset(); k.show(CFG.title, 'Toca los objetivos de colores lo más rápido posible. ¡No toques las bombas! 60 segundos.');
const cellR = (i) => { const S = 300 / N; return [30 + (i % N) * S, 170 + Math.floor(i / N) * S, S]; };
k.run((dt) => {
  fx.forEach((f) => (f.t -= dt)); fx = fx.filter((f) => f.t > 0);
  if (!k.gate(reset)) return; time -= dt; if (time <= 0) return k.lose(CFG.id, score, '¡Tiempo!');
  if (score > 1500 && N === 3) { N = 4; cells = Array(16).fill(null); lvl = 2; }
  spawnT -= dt; if (spawnT <= 0) { spawnT = Math.max(0.28, 0.8 - (60 - time) * 0.009); const free = [...Array(N * N).keys()].filter((i) => !cells[i]); if (free.length) { const i = k.pick(free); const bomb = Math.random() < 0.18, gold = !bomb && Math.random() < 0.1; cells[i] = { life: Math.max(0.55, 1.4 - (60 - time) * 0.012) * (gold ? 0.6 : 1), max: 1, bomb, gold }; cells[i].max = cells[i].life; } }
  for (let i = 0; i < N * N; i++) if (cells[i]) { cells[i].life -= dt; if (cells[i].life <= 0) { if (!cells[i].bomb) combo = 0; cells[i] = null; } }
  if (k.ptr.hit) { for (let i = 0; i < N * N; i++) { const [x, y, S] = cellR(i); if (k.ptr.x > x && k.ptr.x < x + S && k.ptr.y > y && k.ptr.y < y + S) { const q = cells[i];
    if (q && q.bomb) { score = Math.max(0, score - 100); time -= 3; combo = 0; fx.push({ x: x + S / 2, y: y + S / 2, t: 0.6, txt: '-3 s', col: '#ff5f5f' }); navigator.vibrate && navigator.vibrate(120); }
    else if (q) { k.burst(x + S / 2, y + S / 2, q.gold ? '#f2d15c' : '#5ce1e6', 12); k.sfx(q.gold ? 'coin' : 'pop'); combo++; const pts = (q.gold ? 50 : 10) * (1 + Math.floor(combo / 5)); score += pts; if (q.gold) time += 2; fx.push({ x: x + S / 2, y: y + S / 2, t: 0.5, txt: `+${pts}`, col: q.gold ? '#f2d15c' : '#fff' }); }
    else combo = 0; cells[i] = null; } } }
}, () => {
  k.clear(); k.text(score, 30, 40, 40); k.text(`${Math.ceil(Math.max(0, time))} s`, 330, 50, 24, time < 10 ? '#ff6b6b' : '#fff', 'right'); if (combo >= 5) k.text(`Combo x${1 + Math.floor(combo / 5)}`, 180, 110, 20, '#f2d15c', 'center');
  for (let i = 0; i < N * N; i++) { const [x, y, S] = cellR(i); k.rrect(x + 5, y + 5, S - 10, S - 10, 18, '#251f48'); const q = cells[i]; if (!q) continue; const p = q.life / q.max, r = (S / 2 - 14) * Math.min(1, (1 - p) * 8);
    if (q.bomb) { k.circle(x + S / 2, y + S / 2, r, '#222'); k.rect(x + S / 2 - 2, y + S / 2 - r - 8, 4, 10, '#aaa'); k.circle(x + S / 2 + 2, y + S / 2 - r - 10, 4, '#ff9a3c'); }
    else { k.circle(x + S / 2, y + S / 2, r, q.gold ? '#f2d15c' : '#5ce1e6'); k.circle(x + S / 2, y + S / 2, r * 0.55, '#fff'); k.circle(x + S / 2, y + S / 2, r * 0.25, q.gold ? '#f2d15c' : '#ff5f7a'); }
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.beginPath(); c.arc(x + S / 2, y + S / 2, S / 2 - 8, -1.57, -1.57 + 6.283 * p); c.stroke(); }
  for (const f of fx) k.text(f.txt, f.x, f.y - 20 - (0.6 - f.t) * 40, 20, f.col, 'center');
});
