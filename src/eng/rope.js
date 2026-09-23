/* Cut & Drop: corta las cuerdas (desliza a través de ellas) para que el caramelo caiga en la cesta */
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#1b2440' }), c = k.ctx;
const LEVELS = [
  { pins: [[180, 80]], basket: 180, stars: [[180, 300], [180, 420]] },
  { pins: [[90, 80], [270, 80]], basket: 260, stars: [[220, 380]] },
  { pins: [[60, 120], [300, 60]], basket: 90, stars: [[140, 300], [100, 470]] },
  { pins: [[180, 60], [40, 260], [320, 260]], basket: 60, stars: [[180, 200], [90, 420]] },
  { pins: [[40, 80], [180, 60], [320, 80]], basket: 300, stars: [[250, 330], [300, 460]] },
  { pins: [[300, 90], [60, 200]], basket: 280, bumper: [180, 420], stars: [[120, 300]] },
  { pins: [[80, 60], [280, 160], [80, 300]], basket: 180, stars: [[200, 250], [160, 460]] },
  { pins: [[180, 60]], basket: 300, bumper: [120, 360], stars: [[150, 280], [230, 460]], wind: 60 },
];
let lv, candy, ropes, stars, got, state, score, cutLine, t;
function build() {
  const L = LEVELS[(lv - 1) % LEVELS.length]; const cx = L.pins.reduce((s, p) => s + p[0], 0) / L.pins.length, cy = Math.max(...L.pins.map((p) => p[1])) + 110;
  candy = { x: cx, y: cy, ox: cx, oy: cy }; ropes = L.pins.map(([px, py]) => { const segs = [], n = 12; for (let i = 0; i <= n; i++) { const x = px + (cx - px) * i / n, y = py + (cy - py) * i / n; segs.push({ x, y, ox: x, oy: y }); } return { pin: [px, py], pts: segs, len: Math.hypot(cx - px, cy - py) / n * 0.98, cut: -1 }; });
  stars = L.stars.map(([x, y]) => ({ x, y, got: false })); got = 0; state = 'play'; t = 0;
}
function reset() { if (!lv || k.st === 'over' && state === 'lost') { lv = 1; score = 0; } build(); }
reset(); k.show(CFG.title, 'Desliza el dedo a través de las cuerdas para cortarlas. Mete el caramelo en la cesta y recoge estrellas.');
function segInt(a, b, p, q) { const d = (b.x - a.x) * (q.y - p.y) - (b.y - a.y) * (q.x - p.x); if (!d) return false; const u = ((p.x - a.x) * (q.y - p.y) - (p.y - a.y) * (q.x - p.x)) / d, v = ((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)) / d; return u >= 0 && u <= 1 && v >= 0 && v <= 1; }
let prev = null;
k.run((dt) => {
  if (!k.gate(reset) || state !== 'play') return;
  t += dt; const L = LEVELS[(lv - 1) % LEVELS.length], h = Math.min(dt, 1 / 60);
  if (k.ptr.down) { const cur = { x: k.ptr.x, y: k.ptr.y }; if (prev) for (const r of ropes) if (r.cut < 0) for (let i = 0; i < r.pts.length - 1; i++) if (segInt(prev, cur, r.pts[i], r.pts[i + 1])) { r.cut = i; k.sfx('shoot'); navigator.vibrate && navigator.vibrate(15); break; } prev = cur; } else prev = null;
  const all = [candy, ...ropes.flatMap((r) => r.pts.slice(1))];
  for (const p of all) { const vx = (p.x - p.ox) * 0.995, vy = (p.y - p.oy) * 0.995; p.ox = p.x; p.oy = p.y; p.x += vx + (L.wind || 0) * h * h * (p === candy ? 1 : 0.3); p.y += vy + 900 * h * h; }
  for (let it = 0; it < 12; it++) for (const r of ropes) { const pts = r.pts; pts[0].x = r.pin[0]; pts[0].y = r.pin[1]; const last = pts.length - 1;
    for (let i = 0; i < last; i++) { if (i === r.cut) continue; const a = pts[i], b = i + 1 === last ? candy : pts[i + 1]; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, diff = (d - r.len) / d; if (diff <= 0) continue; const wa = i === 0 ? 0 : 0.5, wb = i === 0 ? 1 : 0.5; a.x += dx * diff * wa; a.y += dy * diff * wa; b.x -= dx * diff * wb; b.y -= dy * diff * wb; } pts[last].x = candy.x; pts[last].y = candy.y; pts[0].x = r.pin[0]; pts[0].y = r.pin[1]; }
  if (L.bumper) { const [bx, by] = L.bumper, d = Math.hypot(candy.x - bx, candy.y - by); if (d < 34) { const nx = (candy.x - bx) / d, ny = (candy.y - by) / d; candy.x = bx + nx * 34; candy.y = by + ny * 34; candy.ox = candy.x - nx * 9; candy.oy = candy.y - ny * 9; } }
  if (candy.x < 14 || candy.x > 346) { candy.x = k.clamp(candy.x, 14, 346); candy.ox = candy.x + (candy.x - candy.ox) * 0.5; }
  for (const s of stars) if (!s.got && Math.hypot(s.x - candy.x, s.y - candy.y) < 26) { s.got = true; got++; k.sfx('coin'); k.burst(s.x, s.y, '#f2d15c', 14); }
  if (candy.y > 560 && candy.y < 600 && Math.abs(candy.x - L.basket) < 44 && candy.y - candy.oy > 0) { state = 'won'; score += 100 + got * 100; setTimeout(() => { k.st = 'over'; k.show('¡Dentro!', `${'★'.repeat(got)}${'☆'.repeat(stars.length - got)} · ${score} puntos<br>Toca para el siguiente nivel`); lv++; }, 400); }
  if (candy.y > 680) { state = 'lost'; k.lose(CFG.id, score, 'Se cayó', `Nivel ${lv}`); }
}, () => {
  const L = LEVELS[(lv - 1) % LEVELS.length]; k.clear(); k.text(`Nivel ${lv}`, 16, 14, 18); k.text(`${score}`, 344, 14, 18, '#f2d15c', 'right');
  for (const s of stars) if (!s.got) k.text('★', s.x, s.y - 14, 28, '#f2d15c', 'center');
  if (L.bumper) k.circle(L.bumper[0], L.bumper[1], 22, '#ff9ad5');
  if (L.wind) k.text('≋ viento →', 16, 40, 13, '#9fd8ff');
  c.fillStyle = '#c98a4b'; c.beginPath(); c.moveTo(L.basket - 46, 570); c.lineTo(L.basket + 46, 570); c.lineTo(L.basket + 34, 610); c.lineTo(L.basket - 34, 610); c.fill();
  c.lineWidth = 3; for (const r of ropes) { c.strokeStyle = '#e6d3a3'; c.beginPath(); r.pts.forEach((p, i) => { if (i === r.cut + 1 && r.cut >= 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); }); c.stroke(); k.circle(r.pin[0], r.pin[1], 7, '#8a86b5'); }
  k.circle(candy.x, candy.y, 16, '#ff5f7a'); k.circle(candy.x - 5, candy.y - 5, 5, '#ffd1dc');
});
