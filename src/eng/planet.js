/* Planet Hopper: salta de planeta en planeta con gravedad. Planetas cacheados como sprites que giran; fondo con 3 capas de paralaje. */
const k = Kit({ w: 640, h: 360, title: CFG.title, bg: '#070818' }), c = k.ctx, OUT = ART.OUT;
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
const ez = (i) => { const d = Math.min(1, i / 40); return d * d * (3 - 2 * d); };
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
  if (p.on) { const q = p.on; p.a += dt * (120 + 70 * ez(best)) / q.r; walkT += dt; p.x = q.x + Math.cos(p.a) * (q.r + 8); p.y = q.y + Math.sin(p.a) * (q.r + 8);
    if (k.ptr.hit || k.hit.has('a') || k.hit.has('up')) { const nx = Math.cos(p.a), ny = Math.sin(p.a); p.vx = nx * 340; p.vy = ny * 340; p.on = null; p.from = q; k.sfx('jump'); for (let i = 0; i < 10; i++) jet.push({ x: p.x, y: p.y, vx: -nx * k.rnd(40, 140) + k.rnd(-40, 40), vy: -ny * k.rnd(40, 140) + k.rnd(-40, 40), l: 0.5, c: '#ffd9a0' }); } }
  else { for (const q of planets) { if (Math.abs(q.x - p.x) > 500) continue; const dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2); const f = q.r * q.r * (q === p.from ? 40 : 230) / d2; p.vx += dx / d * f * dt; p.vy += dy / d * f * dt;
      if (d < q.r + 8) { p.on = q; p.a = Math.atan2(p.y - q.y, p.x - q.x); k.sfx('pop'); land = 0.25; k.burst(p.x - cam, p.y, `hsl(${q.hue},80%,75%)`, 10, 100);
        if (q !== p.from) { const idx = planets.indexOf(q); if (idx > best) { const gain = (idx - best) * 50; score += gain; k.float(idx - best > 1 ? `¡Salto x${idx - best}! +${gain}` : `+${gain}`, p.x - cam, p.y - 30, '#7cf7a0'); best = idx; } } p.vx = p.vy = 0; break; } }
    p.x += p.vx * dt; p.y += p.vy * dt; if (Math.random() < 0.6) jet.push({ x: p.x, y: p.y, vx: -p.vx * 0.2 + k.rnd(-20, 20), vy: -p.vy * 0.2 + k.rnd(-20, 20), l: 0.4, c: '#9fe8ff' });
    if (p.y < -400 || p.y > 760 || p.x < cam - 300) return k.lose(CFG.id, score, 'Perdido en el espacio', `${best} planetas`); }
  for (const g of gems) if (!g.got && Math.hypot(g.x - p.x, g.y - p.y) < 20) { g.got = true; score += 25; k.sfx('coin'); k.burst(g.x - cam, g.y, '#f2d15c', 12); k.float('+25', g.x - cam, g.y - 16, '#f2d15c'); }
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
function astronaut() { const ang = p.on ? p.a + Math.PI / 2 : Math.atan2(p.vy, p.vx) + Math.PI / 2, air = !p.on, ph = walkT * 12;
  c.save(); c.translate(p.x, p.y); c.rotate(ang); c.lineJoin = 'round'; if (land > 0) c.scale(1 + land, 1 - land);
  const la = air ? -3 : Math.sin(ph) * 3, lb = air ? 3 : -Math.sin(ph) * 3;
  ART.rr(c, -6 + la * 0.6, 2, 5, 8, 2); ART.fillOut(c, '#e8ecf6', 1.8); ART.rr(c, 1 + lb * 0.6, 2, 5, 8, 2); ART.fillOut(c, '#e8ecf6', 1.8);
  ART.rr(c, -10, -9, 5, 12, 2); ART.fillOut(c, '#9aa3b5', 1.8);
  ART.rr(c, -7, -8, 14, 13, 5); ART.fillOut(c, '#f5f7ff', 2); c.fillStyle = '#ff5f7a'; c.fillRect(-2, -4, 4, 3);
  c.beginPath(); c.arc(0, -13, 8, 0, 6.283); ART.fillOut(c, '#f5f7ff', 2); ART.rr(c, -1, -17, 8, 7, 3.5); ART.fillOut(c, '#5ce1e6', 1.8); c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(1, -16, 2, 2);
  const arm = air ? -0.9 : Math.sin(ph + Math.PI) * 0.5; c.save(); c.translate(3, -5); c.rotate(arm); ART.rr(c, -2, 0, 4, 8, 2); ART.fillOut(c, '#e8ecf6', 1.6); c.restore();
  if (air) { c.fillStyle = '#ffb347'; c.beginPath(); c.ellipse(-8, 6 + Math.random() * 2, 2.5, 5 + Math.random() * 3, 0, 0, 6.283); c.fill(); }
  c.restore(); }
