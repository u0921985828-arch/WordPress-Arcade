/* Stack Tower 3D (isométrico): toca para soltar el bloque y apilarlo. Lo que sobresale se corta y cae. */
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#1b1f3b' }), c = k.ctx, OUT = ART.OUT;
/* --- Ley de la pieza única (R5, docs/REMASTER.md §8) + cartoon de estudio -----------------
   `unite(g, partes, ancho)` traza TODAS las partes y las rellena después: los contornos
   interiores quedan tapados y solo sobrevive la silueta. El detalle interior va recortado
   (`clipIn`), nunca con stroke; las separaciones internas se leen por sombra propia. */
const PZO = '#1a1530', OUTW = 1.5, INW = 0.7, INA = 0.6;
const _hx = (h) => { if (h[0] !== '#') { const m = h.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; } h = h.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _rgb = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
const PLT = (col, f) => _rgb(_hx(col).map((v) => v + (255 - v) * f));
const PDK = (col, f) => _rgb(_hx(col).map((v) => v * (1 - f)));
const PAL = (col, a) => { const q = _hx(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
/* partes = [[trazado, relleno, sombraDeContacto?]], en orden de profundidad */
function unite(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = PZO; g.lineWidth = (ow || OUTW) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) {
    const P = parts[i];
    if (P[2]) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); P[0](g); g.strokeStyle = PAL(PZO, 0.15); g.lineWidth = P[2]; g.stroke(); g.lineWidth = P[2] * 0.45; g.stroke(); g.restore(); }
    g.beginPath(); P[0](g); g.fillStyle = P[1]; g.fill();
  }
}
/* detalle recortado contra un trazado (en el lienzo vivo: recorte a secas, nunca source-atop) */
function clipIn(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* detalle de una pieza dentro de una caché (source-atop es barato en un lienzo pequeño) */
function within(g, path, fn) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* 3 planos de color con borde duro: sombra, base desplazada hacia la luz y plano de luz */
function cel3(g, path, base, o) {
  o = o || {}; const dx = o.dx == null ? 2.4 : o.dx, dy = o.dy == null ? 2.2 : o.dy, R = o.r || 200;
  g.save(); g.beginPath(); path(g); g.clip();
  g.fillStyle = PDK(base, o.sh == null ? 0.26 : o.sh); g.fillRect(-R, -R, R * 2, R * 2);
  g.save(); g.translate(-dx, -dy); g.beginPath(); path(g); g.fillStyle = base; g.fill(); g.restore();
  if (o.hi !== false) { g.save(); g.translate(-dx * 2.15, -dy * 2.15); g.beginPath(); path(g); g.fillStyle = PLT(base, o.lt == null ? 0.2 : o.lt); g.fill(); g.restore(); }
  g.restore();
}
/* óvalo especular (un único toque de luz por pieza) */
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = `rgba(255,255,255,${a == null ? 0.5 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.283); g.fill(); }
/* sombra de contacto dura bajo el objeto */
function contact(g, x, y, rx, ry, a) { g.fillStyle = `rgba(12,10,26,${a == null ? 0.3 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.283); g.fill(); }
/* velocidad del bloque: 125 → 340 u/s de forma suave hasta el piso 40 (antes 150 + 6 por piso hasta 360) */
const SPD = (n) => { const d = Math.min(1, n / 60); return 100 + 190 * d * d * (3 - 2 * d); }; // 1.23: más fácil (antes 125→340 hasta el piso 40)
let liveT = 0, blocks, cur, score, axis, dir, speed, perfect, falling, camY, hue, rings, t, flashB, best;
function reset() { blocks = [{ x: 0, z: 0, w: 120, d: 120, y: 0, hue: 200 }]; score = 0; axis = 'x'; speed = SPD(0); perfect = 0; falling = []; rings = []; camY = 0; hue = 200; t = 0; flashB = null; best = k.best(CFG.id, 0); spawn(); }
function spawn() { const top = blocks[blocks.length - 1]; axis = axis === 'x' ? 'z' : 'x'; hue = (hue + 12) % 360; cur = { x: axis === 'x' ? -180 : top.x, z: axis === 'z' ? -180 : top.z, w: top.w, d: top.d, y: top.y + 1, hue }; dir = 1; }
reset(); k.show(CFG.title, 'Toca para soltar el bloque. Lo que sobresale se corta. Encadena encajes perfectos para que el bloque vuelva a crecer. ¡Apila lo más alto posible!');
const ISO = (x, y, z) => [180 + (x - z) * 0.87, 470 - (x + z) * 0.5 - y * 24 + camY];
/* Fondo: estrellas y nubes deterministas (se desplazan con la cámara) */
const rs = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
/* Ley de la pieza única: el bloque es UN prisma, no tres caras apiladas. Se traza la silueta
   hexagonal una vez (un relleno, un contorno) y las tres caras se separan dentro por color,
   nunca por línea. Un óvalo especular y la luz de borde rematan el cartoon de estudio. */
function box(b, alpha, glow) { const { x, z, w, d } = b, y = b.y, hh = b.hh || 1, p = (xx, zz, yy) => ISO(xx, yy, zz);
  const Y = y + hh, T = [p(x, z, Y), p(x + w, z, Y), p(x + w, z + d, Y), p(x, z + d, Y)];
  const bl = p(x, z + d, y), bm = p(x + w, z + d, y), br = p(x + w, z, y);
  if (T[2][1] - 30 > 640 || bm[1] < -60) return;
  c.globalAlpha = alpha == null ? 1 : alpha;
  const hu = b.hue, top = b.dark ? '#57508a' : `hsl(${hu} 78% 68%)`, lft = b.dark ? '#3b3566' : `hsl(${hu} 64% 50%)`, rgt = b.dark ? '#282348' : `hsl(${hu} 56% 34%)`;
  const sil = (g) => { g.moveTo(T[0][0], T[0][1]); g.lineTo(T[1][0], T[1][1]); g.lineTo(br[0], br[1]); g.lineTo(bm[0], bm[1]); g.lineTo(bl[0], bl[1]); g.lineTo(T[3][0], T[3][1]); g.closePath(); };
  unite(c, [[sil, lft]], 1.5);
  clipIn(c, sil, (g) => {
    const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([a2, b2]) => g.lineTo(a2, b2)); g.closePath(); g.fill(); };
    poly([T[1], br, bm, T[2]], rgt);                       // cara derecha, en sombra
    poly(T, top);                                          // cara superior, a la luz
    g.fillStyle = 'rgba(12,10,26,.16)'; g.beginPath(); g.moveTo(bl[0], bl[1]); g.lineTo(bm[0], bm[1]); g.lineTo(bm[0], bm[1] - 7); g.lineTo(bl[0], bl[1] - 7); g.closePath(); g.fill();   // sombra propia en la base
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(T[3][0] + 3, T[3][1] - 1); g.lineTo(T[2][0], T[2][1] - 3); g.lineTo(T[1][0] - 3, T[1][1] - 1); g.stroke();   // luz de borde
    const sx = (T[0][0] + T[3][0]) / 2, sy = (T[0][1] + T[3][1]) / 2;
    if (w > 40) spec(g, sx + w * 0.13, sy + 2, Math.min(15, w * 0.15), Math.min(6, w * 0.07), -0.5, 0.34);   // un solo toque especular
  });
  if (glow) { c.globalAlpha = glow; c.fillStyle = '#fff'; c.beginPath(); T.forEach(([a2, b2]) => c.lineTo(a2, b2)); c.fill(); }
  c.globalAlpha = 1; }
k.run((dt) => {
  t += dt;
  for (const f of falling) { f.vy += 26 * dt; f.y -= f.vy * dt; f[f.ax] += f.vx * dt; f.a -= dt * 0.7; } falling = falling.filter((f) => f.a > 0);
  for (const r of rings) r.t += dt * 1.6; rings = rings.filter((r) => r.t < 1); if (flashB) { flashB.g -= dt * 3; if (flashB.g <= 0) flashB = null; }
  camY += (Math.max(0, (blocks.length - 7) * 24) - camY) * Math.min(1, dt * 5);
  if (!k.gate(reset)) { liveT = 0; return; } liveT += dt;
  cur[axis] += dir * speed * dt; if (cur[axis] > 180) dir = -1; if (cur[axis] < -180) dir = 1;
  if ((k.ptr.hit || k.hit.has('a') || k.hit.has('up')) && liveT > 0.3) { /* el 2.º toque de un doble toque en «Jugar otra vez» no suelta el bloque */
    const top = blocks[blocks.length - 1], key = axis, size = axis === 'x' ? 'w' : 'd', delta = cur[key] - top[key];
    const [bx, by] = ISO(cur.x + cur.w / 2, cur.y + 1, cur.z + cur.d / 2);
    if (Math.abs(delta) < 6) { cur[key] = top[key]; perfect++; score += 2; rings.push({ b: { ...cur }, t: 0 }); k.sfx(perfect > 2 ? 'win' : 'coin'); k.burst(bx, by, '#fff', 16, 140);
      if (perfect >= 3) { const g = Math.min(12, 120 - cur[size]); cur[size] += g; cur[key] -= g / 2; }
      k.float(perfect > 1 ? `¡Perfecto! x${perfect}` : '¡Perfecto!', 180, by - 40, '#f2d15c'); navigator.vibrate && navigator.vibrate(15); }
    else { perfect = 0; const overlap = cur[size] - Math.abs(delta);
      if (overlap <= 0) { falling.push({ ...cur, vy: 0, vx: dir * speed * 0.6, ax: key, a: 1.6 }); cur = null; k.shake(6); return k.lose(CFG.id, score, 'Se cayó la torre', `${blocks.length - 1} pisos`); }
      const cut = { ...cur }; if (delta > 0) { cut[key] = cur[key] + overlap; cut[size] = delta; cur[size] = overlap; } else { cut[size] = -delta; cur[key] = top[key]; cur[size] = overlap; }
      falling.push({ ...cut, vy: 0, vx: Math.sign(delta) * 40, ax: key, a: 1.4 }); score += 1; k.sfx('pop'); k.shake(2); }
    blocks.push({ ...cur }); flashB = { b: blocks[blocks.length - 1], g: 0.7 }; speed = SPD(blocks.length - 1); spawn();
  }
}, () => {
  const lvl = blocks.length, g = c.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, `hsl(${(hue + 30) % 360} 45% ${Math.max(8, 30 - lvl * 0.4)}%)`); g.addColorStop(1, `hsl(${hue} 40% ${Math.max(14, 38 - lvl * 0.3)}%)`); c.fillStyle = g; c.fillRect(0, 0, 360, 640);
  // estrellas (aparecen con la altura) y nubes con paralaje
  const sa = Math.min(1, lvl / 30); if (sa > 0.05) { c.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { c.globalAlpha = sa * (0.3 + 0.7 * Math.abs(Math.sin(t * 1.3 + i))); c.fillRect(rs(i) * 360, ((rs(i + 50) * 900 + camY * 0.1) % 900) - 100, 2, 2); } c.globalAlpha = 1; }
  c.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 6; i++) { const y = ((rs(i + 7) * 1400 + camY * 0.4) % 1400) - 200, x = ((rs(i) * 500 + t * (8 + i * 3)) % 560) - 100; c.beginPath(); c.ellipse(x, y, 60, 16, 0, 0, 6.283); c.ellipse(x + 34, y - 10, 36, 14, 0, 0, 6.283); c.fill(); }
  // pedestal
  const base = blocks[0]; box({ x: base.x - 8, z: base.z - 8, w: base.w + 16, d: base.d + 16, y: -14, hh: 14, dark: 1 }, 1);
  for (const b of blocks) box(b, 1, flashB && flashB.b === b ? flashB.g : 0);
  for (const r of rings) { const b = r.b, e = r.t * 30, p = (xx, zz) => ISO(xx, b.y + 1, zz); c.globalAlpha = 1 - r.t; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); [p(b.x - e, b.z - e), p(b.x + b.w + e, b.z - e), p(b.x + b.w + e, b.z + b.d + e), p(b.x - e, b.z + b.d + e)].forEach(([a, bb]) => c.lineTo(a, bb)); c.closePath(); c.stroke(); c.globalAlpha = 1; }
  if (cur && (k.st === 'play' || k.st === 'ready')) { // sombra del bloque móvil sobre la torre
    const top = blocks[blocks.length - 1], p = (xx, zz) => ISO(xx, top.y + 1, zz), x0 = Math.max(cur.x, top.x), x1 = Math.min(cur.x + cur.w, top.x + top.w), z0 = Math.max(cur.z, top.z), z1 = Math.min(cur.z + cur.d, top.z + top.d);
    if (x1 > x0 && z1 > z0) { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); [p(x0, z0), p(x1, z0), p(x1, z1), p(x0, z1)].forEach(([a, bb]) => c.lineTo(a, bb)); c.fill(); }
    box(cur); }
  for (const f of falling) box(f, Math.min(1, Math.max(0, f.a)));
  label(String(score), 180, 64, 56, '#fff', 'center'); label(`${blocks.length - 1} pisos`, 180, 126, 16, 'rgba(255,255,255,.85)', 'center');
  if (best) label(`Récord ${best}`, 14, 14, 14, '#f2d15c');
  if (perfect > 1) label(`Perfecto x${perfect}`, 346, 14, 15, '#f2d15c', 'right');
  if (k.st === 'play' && blocks.length === 1) { c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5); label('Toca para soltar', 180, 540, 20, '#fff', 'center'); c.globalAlpha = 1; }
});
