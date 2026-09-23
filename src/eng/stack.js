/* Stack Tower 3D (isométrico): toca para soltar el bloque y apilarlo */
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#1b1f3b' }), c = k.ctx;
let blocks, cur, score, axis, dir, speed, perfect, falling, camY, hue;
function reset() { blocks = [{ x: 0, z: 0, w: 120, d: 120, y: 0, hue: 200 }]; score = 0; axis = 'x'; speed = 150; perfect = 0; falling = []; camY = 0; hue = 200; spawn(); }
function spawn() { const top = blocks[blocks.length - 1]; axis = axis === 'x' ? 'z' : 'x'; hue = (hue + 12) % 360; cur = { x: axis === 'x' ? -180 : top.x, z: axis === 'z' ? -180 : top.z, w: top.w, d: top.d, y: top.y + 1, hue }; dir = 1; }
reset(); k.show(CFG.title, 'Toca para soltar el bloque. Lo que sobresale se corta. ¡Apila lo más alto posible!');
const ISO = (x, y, z) => [180 + (x - z) * 0.87, 460 - (x + z) * 0.5 - y * 24 + camY];
function box(b, alpha) { const H = 24, { x, z, w, d } = b, y = b.y; const p = (xx, zz, yy) => ISO(xx, yy, zz); const top = [p(x, z, y + 1), p(x + w, z, y + 1), p(x + w, z + d, y + 1), p(x, z + d, y + 1)], L = [p(x, z + d, y + 1), p(x + w, z + d, y + 1), p(x + w, z + d, y), p(x, z + d, y)], R = [p(x + w, z, y + 1), p(x + w, z + d, y + 1), p(x + w, z + d, y), p(x + w, z, y)];
  c.globalAlpha = alpha || 1; const poly = (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([a, bb]) => c.lineTo(a, bb)); c.fill(); }; poly(top, `hsl(${b.hue} 70% 65%)`); poly(L, `hsl(${b.hue} 60% 45%)`); poly(R, `hsl(${b.hue} 60% 35%)`); c.globalAlpha = 1; }
k.run((dt) => {
  for (const f of falling) { f.vy += 30 * dt; f.y -= f.vy * dt; f.a -= dt; } falling = falling.filter((f) => f.a > 0);
  camY += (Math.max(0, (blocks.length - 6) * 24) - camY) * Math.min(1, dt * 5);
  if (!k.gate(reset)) return;
  cur[axis] += dir * speed * dt; if (cur[axis] > 180) dir = -1; if (cur[axis] < -180) dir = 1;
  if (k.ptr.hit || k.hit.has('a') || k.hit.has('up')) {
    const top = blocks[blocks.length - 1], key = axis, size = axis === 'x' ? 'w' : 'd'; const delta = cur[key] - top[key];
    if (Math.abs(delta) < 5) { cur[key] = top[key]; perfect++; k.sfx('coin'); { const [bx2, by2] = ISO(cur.x + cur.w / 2, cur.y + 1, cur.z + cur.d / 2); k.burst(bx2, by2, '#fff', 14, 120); } if (perfect >= 3) { cur[size] = Math.min(120, cur[size] + 6); } score += 2; navigator.vibrate && navigator.vibrate(15); }
    else { perfect = 0; const overlap = cur[size] - Math.abs(delta); if (overlap <= 0) { falling.push({ ...cur, vy: 0, a: 1.5 }); return k.lose(CFG.id, score, 'Se cayó la torre', `${blocks.length - 1} pisos`); }
      const cut = { ...cur }; if (delta > 0) { cut[key] = top[key] + cur[size] - Math.abs(delta) + (cur[key] - top[key]) - (cur[size] - overlap) + 0; cut[key] = cur[key] + overlap; cut[size] = Math.abs(delta); cur[size] = overlap; } else { cut[size] = Math.abs(delta); cur[key] = top[key]; cur[size] = overlap; }
      falling.push({ ...cut, vy: 0, a: 1.2 }); score += 1; k.sfx('pop'); }
    blocks.push({ ...cur }); speed = Math.min(360, speed + 6); spawn();
  }
}, () => {
  const g = c.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, `hsl(${hue} 40% 18%)`); g.addColorStop(1, '#0d0f1f'); c.fillStyle = g; c.fillRect(0, 0, 360, 640);
  const base = blocks[0]; for (let y = -8; y < 0; y++) box({ ...base, y, hue: 230 }, 0.6);
  for (const b of blocks) box(b); if (k.st === 'play' || k.st === 'ready') box(cur); for (const f of falling) box(f, Math.max(0, f.a));
  k.text(score, 180, 60, 48, '#fff', 'center'); if (perfect > 1) k.text(`Perfecto x${perfect}`, 180, 116, 16, '#f2d15c', 'center');
});
