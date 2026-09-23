/* Brick Breaker DX */
const k = Kit({ w: 480, h: 360, title: CFG.title, bg: '#16122b' }), c = k.ctx;
const COLS = ['#ff6b6b', '#ffa94d', '#f2d15c', '#7cf7a0', '#5ce1e6', '#b98cff'];
let pad, balls, bricks, drops, score, lives, level, wide;
function build() {
  bricks = []; const rows = Math.min(6, 3 + level);
  for (let r = 0; r < rows; r++) for (let i = 0; i < 10; i++) {
    if (level > 1 && Math.random() < 0.12) continue;
    bricks.push({ x: 20 + i * 44, y: 40 + r * 18, hp: r < level - 1 ? 2 : 1, col: COLS[r % 6] });
  }
  balls = [{ x: 240, y: 300, vx: 0, vy: 0, stuck: true }]; drops = [];
}
function reset() { pad = 240; score = 0; lives = 3; level = 1; wide = 0; build(); }
reset(); k.show(CFG.title, 'Arrastra o usa ← → para mover la pala. Toca o A para lanzar. Recoge las cápsulas.');
k.run((dt) => {
  if (!k.gate(reset)) return;
  const pw = wide > 0 ? 100 : 64; wide -= dt;
  if (k.ptr.down) pad += (k.ptr.x - pad) * Math.min(1, dt * 20);
  if (k.held.has('left')) pad -= 420 * dt; if (k.held.has('right')) pad += 420 * dt;
  pad = k.clamp(pad, pw / 2, 480 - pw / 2);
  for (const b of balls) {
    if (b.stuck) { b.x = pad; b.y = 330; if (k.hit.has('a') || k.tap || k.hit.has('up')) { b.stuck = false; b.vx = k.rnd(-120, 120); b.vy = -300 - level * 15; } continue; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < 5 || b.x > 475) { b.vx *= -1; b.x = k.clamp(b.x, 5, 475); }
    if (b.y < 5) { b.vy = Math.abs(b.vy); }
    if (b.vy > 0 && b.y > 332 && b.y < 344 && Math.abs(b.x - pad) < pw / 2 + 5) {
      const sp = Math.min(560, Math.hypot(b.vx, b.vy) * 1.02), a = (b.x - pad) / (pw / 2) * 1.05;
      b.vx = Math.sin(a) * sp; b.vy = -Math.cos(a) * sp; k.sfx('click');
    }
    for (const br of bricks) if (!br.dead && b.x > br.x - 5 && b.x < br.x + 45 && b.y > br.y - 5 && b.y < br.y + 21) {
      const ox = Math.min(b.x - br.x + 5, br.x + 45 - b.x), oy = Math.min(b.y - br.y + 5, br.y + 21 - b.y);
      if (ox < oy) b.vx *= -1; else b.vy *= -1;
      k.sfx('pop'); if (--br.hp <= 0) { br.dead = true; score += 10 * level; k.burst(br.x + 21, br.y + 8, br.col, 12); if (Math.random() < 0.14) drops.push({ x: br.x + 22, y: br.y + 8, t: Math.random() < 0.5 ? 'W' : 'M' }); }
      break;
    }
    if (b.y > 370) b.dead = true;
  }
  balls = balls.filter((b) => !b.dead); bricks = bricks.filter((b) => !b.dead);
  for (const d of drops) { d.y += 120 * dt; if (d.y > 330 && d.y < 350 && Math.abs(d.x - pad) < pw / 2 + 8) { d.dead = true; if (d.t === 'W') wide = 12; else if (balls[0]) { const b = balls[0]; balls.push({ ...b, vx: -b.vx || 150, vy: b.vy || -300, stuck: false }, { ...b, vx: b.vx * 0.5 + 90, vy: b.vy || -300, stuck: false }); } } if (d.y > 370) d.dead = true; }
  drops = drops.filter((d) => !d.dead);
  if (!balls.length) { if (--lives <= 0) return k.lose('brick-breaker', score); balls = [{ x: pad, y: 330, stuck: true }]; wide = 0; }
  if (!bricks.length) { level++; build(); }
}, () => {
  k.clear();
  for (const b of bricks) { k.rrect(b.x, b.y, 42, 16, 3, b.col); if (b.hp > 1) k.rect(b.x + 4, b.y + 6, 34, 4, 'rgba(0,0,0,.35)'); }
  for (const d of drops) { k.rrect(d.x - 12, d.y - 7, 24, 14, 7, d.t === 'W' ? '#5ce1e6' : '#ff5fa2'); k.text(d.t, d.x, d.y - 6, 11, '#16122b', 'center'); }
  const pw = wide > 0 ? 100 : 64; k.rrect(pad - pw / 2, 336, pw, 10, 5, '#f5f1e6');
  for (const b of balls) k.circle(b.x, b.y, 5, '#fff');
  k.text(score, 10, 10, 16); k.text(`Nv ${level}  ${'●'.repeat(Math.max(0, lives))}`, 470, 10, 14, '#b8b6e0', 'right');
});
