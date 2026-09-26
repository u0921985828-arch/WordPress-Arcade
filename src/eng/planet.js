/* Planet Hopper: salta de planeta en planeta con gravedad. Planetas cacheados como sprites que giran; fondo con 3 capas de paralaje. */
const k = Kit({ w: 640, h: 360, title: CFG.title, bg: '#070818' }), c = k.ctx, OUT = ART.OUT;
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
let planets, p, cam, score, stars, gems, t, best, jet, walkT, land;
const mk = (w, h, f) => { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; f(g); return cv; };
const rs = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/* Sprite de planeta: roca con cráteres, gaseoso con bandas o helado; contorno y halo de atmósfera */
function skin(q) { const r = q.r, R = Math.ceil(r * 1.6), kind = q.kind, hue = q.hue, sd = q.hue * 7 + r;
  return mk(R * 2, R * 2, (g) => { const cx = R, cy = R; const at = g.createRadialGradient(cx, cy, r * 0.9, cx, cy, R); at.addColorStop(0, `hsla(${hue},90%,70%,.35)`); at.addColorStop(1, `hsla(${hue},90%,70%,0)`); g.fillStyle = at; g.fillRect(0, 0, R * 2, R * 2);
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.clip();
    const bg = g.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1); bg.addColorStop(0, `hsl(${hue},75%,${kind === 2 ? 88 : 70}%)`); bg.addColorStop(1, `hsl(${hue},60%,${kind === 2 ? 55 : 32}%)`); g.fillStyle = bg; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (kind === 1) { for (let i = 0; i < 6; i++) { g.fillStyle = `hsla(${(hue + (i % 2) * 30) % 360},70%,${i % 2 ? 40 : 75}%,.35)`; g.beginPath(); g.ellipse(cx, cy - r + (i + 0.5) * r / 3, r * 1.2, r * (0.08 + rs(sd + i) * 0.1), 0, 0, 6.283); g.fill(); } }
    else for (let i = 0; i < (kind === 2 ? 4 : 7); i++) { const a = rs(sd + i) * 6.283, dd = rs(sd + i + 9) * r * 0.75, cr = r * (0.1 + rs(sd + i + 3) * 0.16), x = cx + Math.cos(a) * dd, y = cy + Math.sin(a) * dd;
      g.fillStyle = `hsla(${hue},50%,${kind === 2 ? 70 : 25}%,.55)`; g.beginPath(); g.arc(x, y, cr, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x + cr * 0.25, y + cr * 0.25, cr * 0.7, 0.2, 2.2); g.lineTo(x + cr * 0.25, y + cr * 0.25); g.fill(); }
    g.restore(); }); }
function shade(r) { const R = Math.ceil(r * 1.6); return mk(R * 2, R * 2, (g) => { const cx = R, cy = R; g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.clip();
    g.fillStyle = 'rgba(10,5,30,.35)'; g.beginPath(); g.rect(cx - r, cy - r, r * 2, r * 2); g.arc(cx - r * 0.22, cy - r * 0.22, r * 1.02, 0, 6.283); g.fill('evenodd'); g.restore();
    g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(cx - r * 0.45, cy - r * 0.5, r * 0.18, r * 0.09, -0.7, 0, 6.283); g.fill(); }); }
const mkPlanet = (x, y, r, hue, i) => { const q = { x, y, r, hue, kind: i === 0 ? 0 : k.ri(0, 2), rot: k.rnd(-0.4, 0.4), ring: Math.random() < 0.2 }; q.img = skin(q); q.lit = shade(r); return q; };
/* Dificultad por planeta alcanzado (i): al principio planetas grandes, cercanos y a altura parecida; hacia el 40 más pequeños, lejanos y dispersos.
 * El astronauta camina más deprisa con el progreso (menos margen para elegir el momento del salto). Antes: todo fijo desde el primer salto. */
const ez = (i) => { const d = Math.min(1, i / 60); // 1.23: más fácil (antes i/40)
  return d * d * (3 - 2 * d); };
function nextPlanet(l, i) { const e = ez(i), x = l.x + k.rnd(150 + 30 * e, 200 + 70 * e), y = k.clamp(l.y + k.rnd(-1, 1) * (50 + 110 * e), 90, 290), r = k.rnd(42 - 16 * e, 56 - 6 * e); return mkPlanet(x, y, r, k.ri(0, 360), i); }
function genPlanets() { planets = [mkPlanet(120, 200, 50, 200, 0)]; for (let i = 0; i < 60; i++) planets.push(nextPlanet(planets[i], i + 1)); gems = planets.slice(1).map((q) => ({ x: q.x + k.rnd(-60, 60), y: q.y - q.r - k.rnd(40, 80), got: false })); }
function reset() { genPlanets(); p = { on: planets[0], a: -Math.PI / 2, x: 0, y: 0, vx: 0, vy: 0 }; cam = 0; score = 0; t = 0; best = 0; jet = []; walkT = 0; land = 0; }
/* Fondo: nebulosa y 3 capas de estrellas en lienzos repetibles */
const BW = 1280, NEB = mk(BW, 360, (g) => { const gr = g.createLinearGradient(0, 0, 0, 360); gr.addColorStop(0, '#070818'); gr.addColorStop(1, '#140a2e'); g.fillStyle = gr; g.fillRect(0, 0, BW, 360);
  for (let i = 0; i < 7; i++) for (const o of [-BW, 0, BW]) { const x = rs(i) * BW + o, y = 60 + rs(i + 3) * 240, r = 120 + rs(i + 5) * 140, ng = g.createRadialGradient(x, y, 0, x, y, r); ng.addColorStop(0, `hsla(${[270, 320, 200, 250][i % 4]},80%,55%,.22)`); ng.addColorStop(1, 'hsla(0,0%,0%,0)'); g.fillStyle = ng; g.fillRect(x - r, y - r, r * 2, r * 2); } });
const STARS = [0, 1, 2].map((l) => mk(BW, 360, (g) => { for (let i = 0; i < 70 - l * 15; i++) { const x = rs(i * 3 + l * 100) * BW, y = rs(i * 3 + l * 100 + 1) * 360, s = 1 + l * 0.7; g.fillStyle = l === 2 ? '#fff' : `rgba(255,255,255,${0.35 + l * 0.25})`; g.fillRect(x, y, s, s); if (l === 2 && i % 5 === 0) { g.fillRect(x - 3, y + s / 2 - 0.5, 6 + s, 1); g.fillRect(x + s / 2 - 0.5, y - 3, 1, 6 + s); } } }));
const wrap = (img, off) => { const o = ((off % BW) + BW) % BW - BW; c.drawImage(img, o, 0, BW, 360); c.drawImage(img, o + BW, 0, BW, 360); };
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
reset(); k.show(CFG.title, 'Tu astronauta camina solo por el planeta. Toca para saltar y deja que la gravedad te lleve al siguiente. Recoge los cristales.');
k.run((dt) => {
  for (const j of jet) { j.x += j.vx * dt; j.y += j.vy * dt; j.l -= dt; } jet = jet.filter((j) => j.l > 0); land = Math.max(0, land - dt);
  if (!k.gate(reset)) return; t += dt;
  if (p.on) { const q = p.on; p.a += dt * (96 + 60 * ez(best)) / q.r; walkT += dt; p.x = q.x + Math.cos(p.a) * (q.r + 8); p.y = q.y + Math.sin(p.a) * (q.r + 8);
    if (k.ptr.hit || k.hit.has('a') || k.hit.has('up')) { const nx = Math.cos(p.a), ny = Math.sin(p.a); p.vx = nx * 340; p.vy = ny * 340; p.on = null; p.from = q; k.sfx('jump'); for (let i = 0; i < 10; i++) jet.push({ x: p.x, y: p.y, vx: -nx * k.rnd(40, 140) + k.rnd(-40, 40), vy: -ny * k.rnd(40, 140) + k.rnd(-40, 40), l: 0.5, c: '#ffd9a0' }); } }
  else { for (const q of planets) { if (Math.abs(q.x - p.x) > 500) continue; const dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2); const f = q.r * q.r * (q === p.from ? 40 : 230) / d2; p.vx += dx / d * f * dt; p.vy += dy / d * f * dt;
      if (d < q.r + 8) { p.on = q; p.air = 0; p.a = Math.atan2(p.y - q.y, p.x - q.x); k.sfx('pop'); land = 0.25; k.burst(p.x - cam, p.y, `hsl(${q.hue},80%,75%)`, 10, 100);
        if (q !== p.from) { const idx = planets.indexOf(q); if (idx > best) { const gain = (idx - best) * 50; score += gain; k.float(idx - best > 1 ? `¡Salto x${idx - best}! +${gain}` : `+${gain}`, p.x - cam, p.y - 30, '#7cf7a0'); best = idx; } } p.vx = p.vy = 0; break; } }
    p.x += p.vx * dt; p.y += p.vy * dt; if (Math.random() < 0.6) jet.push({ x: p.x, y: p.y, vx: -p.vx * 0.2 + k.rnd(-20, 20), vy: -p.vy * 0.2 + k.rnd(-20, 20), l: 0.4, c: '#9fe8ff' });
    p.air = (p.air || 0) + dt; /* órbita cerrada sin tocar planeta: no puede durar para siempre */
    if (p.y < -400 || p.y > 760 || p.x < cam - 300 || p.air > 9) return k.lose(CFG.id, score, 'Perdido en el espacio', `${best} planetas`); }
  for (const g of gems) if (!g.got && Math.hypot(g.x - p.x, g.y - p.y) < 24) { g.got = true; score += 25; k.sfx('coin'); k.burst(g.x - cam, g.y, '#f2d15c', 12); k.float('+25', g.x - cam, g.y - 16, '#f2d15c'); }
  cam += (p.x - 220 - cam) * Math.min(1, dt * 2);
  if (best >= planets.length - 5) { const l = planets[planets.length - 1]; for (let i = 0; i < 20; i++) { const q = nextPlanet(planets[planets.length - 1], planets.length); planets.push(q); gems.push({ x: q.x, y: q.y - q.r - 60, got: false }); } }
}, () => {
  wrap(NEB, -cam * 0.05); wrap(STARS[0], -cam * 0.1); wrap(STARS[1], -cam * 0.2); wrap(STARS[2], -cam * 0.35);
  c.save(); c.translate(-cam, 0);
  // cometa decorativo
  const cx = cam + ((t * 90) % 1400) - 200, cy = 40 + ((t * 90) % 1400) * 0.12; const cg = c.createLinearGradient(cx - 80, cy - 10, cx, cy); cg.addColorStop(0, 'rgba(160,230,255,0)'); cg.addColorStop(1, 'rgba(200,240,255,.7)'); c.strokeStyle = cg; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 80, cy - 10); c.lineTo(cx, cy); c.stroke();
  for (const q of planets) { if (q.x < cam - 120 || q.x > cam + 760) continue; const R = q.img.width / 4;
    if (q.ring) { c.strokeStyle = `hsla(${(q.hue + 40) % 360},70%,75%,.8)`; c.lineWidth = 4; c.beginPath(); c.ellipse(q.x, q.y, q.r * 1.7, q.r * 0.35, -0.3, Math.PI, 6.283); c.stroke(); }
    c.save(); c.translate(q.x, q.y); c.rotate(t * q.rot); c.drawImage(q.img, -R, -R, R * 2, R * 2); c.restore(); c.drawImage(q.lit, q.x - R, q.y - R, R * 2, R * 2);
    if (q.ring) { c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.ellipse(q.x, q.y, q.r * 1.7, q.r * 0.35, -0.3, 0, Math.PI); c.stroke(); c.strokeStyle = `hsla(${(q.hue + 40) % 360},70%,75%,.95)`; c.lineWidth = 4; c.stroke(); }
    if (q === p.on && land > 0) { c.strokeStyle = `rgba(255,255,255,${land * 3})`; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, q.r + 8 + (0.25 - land) * 60, 0, 6.283); c.stroke(); } }
  for (const g of gems) if (!g.got && g.x > cam - 40 && g.x < cam + 680) { const y = g.y + Math.sin(t * 3 + g.x) * 4, s = 1 + Math.sin(t * 5 + g.x) * 0.08; c.save(); c.translate(g.x, y); c.scale(s, s);
    c.fillStyle = 'rgba(242,209,92,.25)'; c.beginPath(); c.arc(0, 0, 14, 0, 6.283); c.fill(); c.beginPath(); c.moveTo(0, -10); c.lineTo(7, -2); c.lineTo(0, 10); c.lineTo(-7, -2); c.closePath(); ART.fillOut(c, '#f2d15c', 2); c.fillStyle = '#fff6c2'; c.beginPath(); c.moveTo(0, -8); c.lineTo(3, -2); c.lineTo(-3, -2); c.fill(); c.restore(); }
  for (const j of jet) { c.globalAlpha = j.l * 2; c.fillStyle = j.c; c.beginPath(); c.arc(j.x, j.y, 2 + (0.5 - j.l) * 6, 0, 6.283); c.fill(); } c.globalAlpha = 1;
  // trayectoria prevista
  if (p.on && k.st === 'play') { let x = p.x, y = p.y, vx = Math.cos(p.a) * 340, vy = Math.sin(p.a) * 340; for (let i = 0; i < 70; i++) { let hit = false; for (const q of planets) { if (Math.abs(q.x - x) > 500) continue; const dx = q.x - x, dy = q.y - y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2); if (d < q.r + 6 && q !== p.on) { hit = true; break; } const f = q.r * q.r * (q === p.on ? 40 : 230) / d2; vx += dx / d * f / 60; vy += dy / d * f / 60; }
      if (hit) { c.strokeStyle = 'rgba(124,247,160,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 6, 0, 6.283); c.stroke(); break; } x += vx / 60; y += vy / 60; if (i % 3 === 0) { c.fillStyle = `rgba(255,255,255,${0.7 - i / 110})`; c.beginPath(); c.arc(x, y, 2.2, 0, 6.283); c.fill(); } } }
  astronaut(); c.restore();
  label(`${score}`, 14, 10, 26); label(`Planetas ${best}`, 626, 12, 17, '#b8b6e0', 'right');
  if (k.st === 'play' && t < 3) { c.globalAlpha = Math.min(1, 3 - t); label('Toca para saltar', 320, 300, 20, '#fff', 'center'); c.globalAlpha = 1; }
});
/* Ley de la pieza única: el astronauta era casco + torso + mochila + 2 piernas + brazo, cada uno
   con su contorno cerrado (7 chapas). Ahora es UNA silueta (unite traza todo y rellena después) y
   las piernas/el brazo, que sí se mueven, se separan por sombra propia, no por línea.
   Cartoon de estudio: casco grande (media figura), botas y manopla gruesas, 3 tonos por pieza con
   borde duro, un óvalo especular en el casco y sombra de contacto dura bajo las botas. */
const ASPR = {}, ASC = Math.min(2, window.devicePixelRatio || 1) * 2.2, AW = 40, AH = 46, AOX = 20, AOY = 28;
const rrp = (x, y, w, h, r) => (g) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
function astroSpr(ph, air) {
  const key = air ? 'a' : 'w' + ph;
  if (ASPR[key]) return ASPR[key];
  const cv = document.createElement('canvas'); cv.width = AW * ASC; cv.height = AH * ASC;
  const g = cv.getContext('2d'); g.scale(ASC, ASC); g.translate(AOX, AOY); g.lineJoin = 'round'; g.lineCap = 'round';
  const la = air ? -3.2 : Math.sin(ph / 8 * 6.283) * 3.4, lb = -la;
  const arm = air ? -0.95 : Math.sin(ph / 8 * 6.283 + Math.PI) * 0.55;
  const SUIT = '#eef1fb', DKS = PDK(SUIT, 0.2), PACK = '#8d96ab';
  const legB = rrp(-7.4 + lb * 0.7, 1, 6.4, 10.5, 3), legF = rrp(0.6 + la * 0.7, 1, 6.4, 10.5, 3);
  const pack = rrp(-11, -9.5, 6, 13, 2.6);
  const torso = rrp(-7.4, -8.5, 14.8, 14, 5.6);
  const helm = (q) => { q.moveTo(8.4, -13); q.arc(0, -13, 8.4, 0, 6.283); };
  const ax = 3.4, ay = -5.4, ex = ax + Math.sin(arm + 1.1) * 8.2, ey = ay + Math.cos(arm + 1.1) * 8.2;
  const armP = (q) => { q.moveTo(ax, ay - 2.6); q.lineTo(ex, ey - 2.4); q.lineTo(ex, ey + 2.4); q.lineTo(ax, ay + 2.6); q.closePath(); q.moveTo(ex + 3, ey); q.arc(ex, ey, 3, 0, 6.283); };
  unite(g, [[legB, DKS], [pack, PDK(PACK, 0.18)], [torso, SUIT], [helm, SUIT], [legF, SUIT], [armP, SUIT]], 1.5);
  // separaciones internas: solo por sombra propia (nunca con stroke)
  within(g, legB, (q) => { q.fillStyle = PAL(PZO, 0.3); q.fillRect(-16, -2, 32, 16); });
  within(g, pack, (q) => { q.fillStyle = PAL(PZO, 0.22); q.fillRect(-16, -14, 32, 22); q.fillStyle = '#ffc94d'; q.fillRect(-10.4, -6.5, 4.4, 2.2); });
  within(g, torso, (q) => {
    cel3(q, torso, SUIT, { dx: 2, dy: 1.8, r: 40, sh: 0.2, lt: 0.14 });
    q.fillStyle = '#6e62f5'; q.fillRect(-7.6, -2.6, 15.2, 2.8);                    // franja de color, sin contorno
    q.fillStyle = '#ff5f7a'; q.fillRect(-2.2, -6.4, 4.4, 3);
    q.fillStyle = PAL(PZO, 0.2); q.fillRect(-7.6, 3.4, 15.2, 3);                   // sombra propia bajo el pecho
  });
  within(g, helm, (q) => {
    cel3(q, helm, SUIT, { dx: 2.4, dy: 2.2, r: 40, sh: 0.22, lt: 0.16 });
    q.fillStyle = '#2f9fb8'; q.beginPath(); q.ellipse(0.8, -13.4, 6.2, 5.2, 0, 0, 6.283); q.fill();
    q.fillStyle = '#5ce1e6'; q.beginPath(); q.ellipse(0.4, -14.2, 5.6, 4.4, 0, 0, 6.283); q.fill();
    spec(q, -2.2, -16.4, 2.4, 1.5, -0.6, 0.85);                                    // un solo toque especular
    q.fillStyle = PAL(PZO, 0.18); q.beginPath(); q.ellipse(0, -8.6, 8.4, 3, 0, 0, 6.283); q.fill();
  });
  within(g, legF, (q) => { q.fillStyle = PAL(PZO, 0.16); q.fillRect(-16, 7, 32, 8); });
  within(g, armP, (q) => { q.fillStyle = PAL(PZO, 0.14); q.beginPath(); q.arc(ex, ey + 1.6, 3, 0, 6.283); q.fill(); });
  cv.k = key; return (ASPR[key] = cv);
}
function astronaut() { const ang = p.on ? p.a + Math.PI / 2 : Math.atan2(p.vy, p.vx) + Math.PI / 2, air = !p.on;
  const ph = ((Math.round(walkT * 12 / 6.283 * 8) % 8) + 8) % 8;
  c.save(); c.translate(p.x, p.y); c.rotate(ang); if (land > 0) c.scale(1 + land, 1 - land);
  if (!air) contact(c, 0, 12, 8.5, 2.6, 0.32);                                     // sombra de contacto dura
  if (air) { c.fillStyle = '#ffb347'; c.beginPath(); c.ellipse(-8, 6 + Math.random() * 2, 2.5, 5 + Math.random() * 3, 0, 0, 6.283); c.fill(); }
  const q = astroSpr(ph, air ? 1 : 0);
  c.drawImage(q, -AOX, -AOY, AW, AH);
  c.restore(); }
