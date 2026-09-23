/* Frog Crossing */
const k = Kit({ w: 416, h: 480, title: CFG.title, bg: '#101b2e' }), c = k.ctx, S = 32, COLS = 13;
let f, lanes, homes, score, lives, level, timer, best;
function build() {
  lanes = []; const sp = 1 + level * 0.18;
  for (let r = 1; r <= 5; r++) lanes[r] = { type: 'river', dir: r % 2 ? 1 : -1, sp: (40 + r * 12) * sp, items: [] };
  for (let r = 7; r <= 11; r++) lanes[r] = { type: 'road', dir: r % 2 ? -1 : 1, sp: (50 + (r - 6) * 14) * sp, items: [] };
  for (const [r, L] of lanes.entries()) { if (!L) continue; const len = L.type === 'river' ? k.ri(3, 5) : k.ri(1, 2); for (let x = k.rnd(0, 60); x < 416 + 200; x += (len + k.ri(2, 4)) * S) L.items.push({ x, w: len * S }); }
  homes = [0, 1, 2, 3, 4].map((i) => ({ x: 16 + i * 88, filled: false })); place();
}
function place() { f = { x: 6, y: 12, fx: 6 * S, t: 0 }; timer = 30; best = 12; }
function reset() { score = 0; lives = 3; level = 1; build(); }
reset(); k.show(CFG.title, 'Cruza la carretera y el río hasta las 5 casas. Desliza o usa las flechas.');
function die() { lives--; navigator.vibrate && navigator.vibrate(100); if (lives <= 0) return k.lose('frog-crossing', score, 'Aplastado', `Nivel ${level}`); place(); }
k.run((dt) => {
  if (!k.gate(reset)) return;
  const d = k.swipe || (k.tap ? 'up' : null) || ['up', 'down', 'left', 'right'].find((q) => k.hit.has(q));
  if (d) { k.sfx('jump'); if (d === 'up') f.y--; if (d === 'down') f.y = Math.min(12, f.y + 1); if (d === 'left') f.fx -= S; if (d === 'right') f.fx += S; if (f.y < best) { best = f.y; score += 10; } }
  f.fx = k.clamp(f.fx, 0, 416 - S); timer -= dt; if (timer <= 0) return die();
  for (const L of lanes) if (L) for (const it of L.items) { it.x += L.dir * L.sp * dt; const span = L.items.length ? 416 + 240 : 0; if (L.dir > 0 && it.x > 416 + 40) it.x -= span; if (L.dir < 0 && it.x + it.w < -40) it.x += span; }
  const L = lanes[f.y], cx = f.fx + S / 2;
  if (L && L.type === 'road' && L.items.some((it) => cx + 10 > it.x && cx - 10 < it.x + it.w)) return die();
  if (L && L.type === 'river') { const log = L.items.find((it) => cx > it.x && cx < it.x + it.w); if (!log) return die(); f.fx += L.dir * L.sp * dt; if (f.fx < -8 || f.fx > 416 - S + 8) return die(); }
  if (f.y === 0) { const h = homes.find((q) => Math.abs(q.x + 20 - cx) < 24 && !q.filled); if (!h) return die(); h.filled = true; score += 50 + Math.floor(timer) * 5;
    if (homes.every((q) => q.filled)) { score += 500; level++; build(); } else place(); }
}, () => {
  k.clear(); k.rect(0, S, 416, 5 * S, '#1d4e89'); k.rect(0, 6 * S, 416, S, '#3d2f6b'); k.rect(0, 12 * S, 416, S, '#3d2f6b'); k.rect(0, 0, 416, S, '#1f5a3a');
  for (const h of homes) { k.rect(h.x, 2, 40, S - 4, '#12301f'); if (h.filled) k.circle(h.x + 20, S / 2, 10, '#7cf7a0'); }
  for (const [r, L] of lanes.entries()) if (L) for (const it of L.items) { if (L.type === 'river') k.rrect(it.x, r * S + 5, it.w, S - 10, 8, '#8b5a2b'); else { k.rrect(it.x, r * S + 5, it.w, S - 10, 6, ['#ff6b6b', '#f2d15c', '#5ce1e6', '#b98cff', '#ffa94d'][r % 5]); k.rect(it.x + (L.dir > 0 ? it.w - 10 : 4), r * S + 9, 6, S - 18, '#fff9'); } }
  k.circle(f.fx + S / 2, f.y * S + S / 2, 12, '#7cf7a0'); k.circle(f.fx + S / 2 - 5, f.y * S + S / 2 - 7, 3, '#101b2e'); k.circle(f.fx + S / 2 + 5, f.y * S + S / 2 - 7, 3, '#101b2e');
  k.rect(0, 13 * S, 416, 64, '#101b2e'); k.text(`${score}`, 10, 13 * S + 10, 18); k.text(`${'♥'.repeat(Math.max(0, lives))}  Nv ${level}`, 406, 13 * S + 10, 16, '#ff9ad5', 'right');
  k.rect(10, 13 * S + 40, timer / 30 * 396, 8, timer > 8 ? '#7cf7a0' : '#ff6b6b');
});
