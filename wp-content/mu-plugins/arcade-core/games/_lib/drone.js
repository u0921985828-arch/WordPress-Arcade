/* Drone Flight: atraviesa los anillos en 3D. Proyección en perspectiva (F / profundidad); el dron vuela en el plano z. */
const k = Kit({ w: 640, h: 360, title: CFG.title, bg: '#0a1030' }), c = k.ctx, F = 300, OUT = ART.OUT;
/* Dificultad: de 600 a 1400 u/s en ~3,5 min (suavizado); anillos más juntos, pequeños y desplazados con el progreso.
 * Antes: 900 u/s + 8/s sin tope, separación 900→600 y radio 140→90 a los 80-100 s. */
const V0 = 480, V1 = 1190, DIF = () => { const d = Math.min(1, t / 315); // 1.23: más fácil (antes 600→1400 en 210 s)
  return d * d * (3 - 2 * d); };
let d, rings, z, speed, score, lives, t, combo, parts, camX, camY, streaks, passed;
function reset() { d = { x: 0, y: 0, vx: 0, vy: 0 }; rings = []; z = 0; speed = V0; score = 0; lives = 4; t = 0; combo = 0; parts = []; camX = 0; camY = -50; streaks = []; passed = 0;
  // arranque justo: el primer anillo está frente al dron y los siguientes se separan poco a poco
  let rz = 2300, rx = 0, ry = 0; for (let i = 0; i < 12; i++) { const sc = Math.min(1, i / 5); rx = k.clamp(rx + k.rnd(-260, 260) * sc, -500, 500); ry = k.clamp(ry + k.rnd(-160, 160) * sc, -260, 260); rings.push({ x: rx, y: ry, z: rz, r: i < 3 ? 170 : 140 }); rz += i < 3 ? 1100 : 900; } }
reset(); k.show(CFG.title, 'Guía el dron a través de los anillos. Arrastra o usa las flechas. Pasar cerca del centro da más puntos y encadena combos.');
const mk = (w, h, f) => { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; f(g); return cv; };
const rs = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/* Cielo y montañas cacheados (las montañas se desplazan con la cámara) */
const SKY = mk(640, 190, (g) => { const gr = g.createLinearGradient(0, 0, 0, 190); gr.addColorStop(0, '#12195a'); gr.addColorStop(0.55, '#6a3f9e'); gr.addColorStop(1, '#ff9a6b'); g.fillStyle = gr; g.fillRect(0, 0, 640, 190);
  g.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { g.globalAlpha = (0.2 + rs(i) * 0.8) * (1 - rs(i + 5) * 0.6); g.fillRect(rs(i + 1) * 640, rs(i + 2) * 100, 1.5, 1.5); } g.globalAlpha = 1;
  const sg = g.createRadialGradient(470, 150, 5, 470, 150, 70); sg.addColorStop(0, 'rgba(255,230,160,1)'); sg.addColorStop(0.3, 'rgba(255,190,120,.8)'); sg.addColorStop(1, 'rgba(255,160,110,0)'); g.fillStyle = sg; g.fillRect(380, 60, 180, 130); });
const MW = 1280, MTN = mk(MW, 70, (g) => { for (const [col, amp, f1, f2, base] of [['#5a3a7a', 40, 5, 13, 60], ['#3b2a5c', 26, 9, 21, 70]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, 70); for (let x = 0; x <= MW; x += 8) g.lineTo(x, base - (Math.abs(Math.sin(x / MW * Math.PI * f1)) * amp) - Math.sin(x / MW * 6.283 * f2) * 6); g.lineTo(MW, 70); g.fill(); } });
const TREE = mk(60, 90, (g) => { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(30, 86, 22, 4, 0, 0, 6.283); g.fill(); ART.rr(g, 26, 58, 8, 28, 3); ART.fillOut(g, '#5a3a22', 2); for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(30, 4 + i * 18); g.lineTo(52 - i * 2, 40 + i * 14); g.lineTo(8 + i * 2, 40 + i * 14); g.closePath(); ART.fillOut(g, ['#2f8a5a', '#28794f', '#216a45'][i], 2); } });
const P = (x, y, zz) => { const s = F / Math.max(1, zz - z + 250); return [320 + (x - camX) * s, 180 + (y - camY) * s, s]; };
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
k.run((dt) => {
  for (const s of streaks) s.l -= dt; streaks = streaks.filter((s) => s.l > 0);
  if (!k.gate(reset)) return;
  t += dt; const e = DIF(); speed = V0 + (V1 - V0) * e; z += speed * dt;
  let ax = (k.held.has('right') ? 1 : 0) - (k.held.has('left') ? 1 : 0), ay = (k.held.has('down') ? 1 : 0) - (k.held.has('up') ? 1 : 0);
  if (k.ptr.down) { ax = k.clamp((k.ptr.x - k.ptr.sx) / 60, -1, 1); ay = k.clamp((k.ptr.y - k.ptr.sy) / 60, -1, 1); }
  d.vx += (ax * 900 - d.vx) * Math.min(1, dt * 4); d.vy += (ay * 700 - d.vy) * Math.min(1, dt * 4); d.x = k.clamp(d.x + d.vx * dt, -600, 600); d.y = k.clamp(d.y + d.vy * dt, -320, 320);
  camX += (d.x * 0.85 - camX) * Math.min(1, dt * 8); camY += (d.y * 0.85 - 50 - camY) * Math.min(1, dt * 8);
  for (const r of rings) if (!r.done && r.z < z) { r.done = true; r.pt = 0.5; const dist = Math.hypot(d.x - r.x, d.y - r.y), [sx, sy] = P(r.x, r.y, r.z);
    if (dist < r.r * 1.15) { combo++; passed++; const center = dist < r.r * 0.35, pts = Math.round((center ? 100 : 50) * (1 + combo * 0.1)); score += pts; r.ok = true; k.sfx(center ? 'win' : 'coin');
      k.burst(sx, sy, center ? '#f2d15c' : '#5ce1e6', center ? 24 : 12, 220); k.float(center ? `¡Centro! +${pts}` : `+${pts}`, sx, sy - 40, center ? '#f2d15c' : '#fff'); }
    else { combo = 0; lives--; r.miss = true; navigator.vibrate && navigator.vibrate(110); k.float('¡Fallo!', 320, 120, '#ff5f7a'); if (lives <= 0) return k.lose(CFG.id, score, 'Sin batería', `${passed} anillos`); } }
  for (const r of rings) if (r.pt) r.pt = Math.max(0, r.pt - dt);
  rings = rings.filter((r) => r.z > z - 240); while (rings.length < 12) { const l = rings[rings.length - 1]; const e2 = DIF(), sx = 150 + 130 * e2, sy = 90 + 80 * e2; rings.push({ x: k.clamp(l.x + k.rnd(-sx, sx), -520, 520), y: k.clamp(l.y + k.rnd(-sy, sy), -270, 270), z: l.z + 1050 - 250 * e2, r: 150 - 50 * e2 }); }
  if (Math.random() < dt * 20) { const a = Math.random() * 6.283; streaks.push({ a, r: 120 + Math.random() * 200, l: 0.25 }); }
}, () => {
  c.drawImage(SKY, 0, 0, 640, 190); const mo = ((-camX * 0.08) % MW + MW) % MW - MW; c.drawImage(MTN, mo, 120, MW, 70); c.drawImage(MTN, mo + MW, 120, MW, 70);
  // suelo: franjas en perspectiva
  const GY = 400; c.fillStyle = '#2c5a3a'; c.fillRect(0, 186, 640, 174);
  const b0 = Math.floor(z / 300) * 300; for (let i = 30; i >= 0; i--) { const gz = b0 + i * 300, [, y1] = P(0, GY, gz), [, y2] = P(0, GY, gz + 300); if (y1 < 180) continue; c.fillStyle = (Math.floor(gz / 300) % 2) ? '#3f7a4a' : '#356b41'; c.fillRect(0, y2, 640, y1 - y2 + 1); }
  c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1; c.beginPath(); for (let xx = -3000; xx <= 3000; xx += 400) { const [x1, y1] = P(xx, GY, z + 20), [x2, y2] = P(xx, GY, z + 9000); c.moveTo(x1, y1); c.lineTo(x2, y2); } c.stroke();
  const hz = c.createLinearGradient(0, 180, 0, 215); hz.addColorStop(0, 'rgba(255,170,130,.55)'); hz.addColorStop(1, 'rgba(255,170,130,0)'); c.fillStyle = hz; c.fillRect(0, 180, 640, 35);
  // árboles laterales (dan sensación de velocidad)
  const tb = Math.floor(z / 600) * 600; for (let i = 16; i >= 0; i--) { const tz = tb + i * 600; for (const sd of [-1, 1]) { const tx = sd * (900 + rs(tz / 600 + sd) * 900), [x, y, s] = P(tx, GY, tz); if (s <= 0 || tz < z - 200) continue; const w = 60 * s * 1.6, h = 90 * s * 1.6; if (x + w < 0 || x - w > 640) continue; c.drawImage(TREE, x - w / 2, y - h, w, h); } }
  const next = rings.find((q) => !q.done), ringAt = (r) => { const [x, y, s] = P(r.x, r.y, r.z), rad = r.r * s; if (rad < 1.5 || y - rad > 420) return; const lw = Math.max(2, 22 * s), a = r.done ? Math.max(0, r.pt * 2) : Math.min(1, (6500 - (r.z - z)) / 1500);
    if (a <= 0) return; c.globalAlpha = a; c.lineWidth = lw + 4; c.strokeStyle = OUT; c.beginPath(); c.arc(x, y, rad, 0, 6.283); c.stroke();
    const col = r.ok ? '#7cf7a0' : r.miss ? '#ff5f7a' : r === next ? '#f2d15c' : '#5ce1e6'; c.lineWidth = lw; c.strokeStyle = col; c.stroke();
    c.lineWidth = Math.max(1, lw * 0.3); c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x, y, rad - lw * 0.15, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
    if (r === next) { c.globalAlpha = a * (0.3 + 0.2 * Math.sin(t * 8)); c.lineWidth = lw * 2.2; c.strokeStyle = '#f2d15c'; c.beginPath(); c.arc(x, y, rad, 0, 6.283); c.stroke(); } c.globalAlpha = 1; };
  const far = rings.filter((r) => r.z >= z).sort((a, b) => b.z - a.z), near = rings.filter((r) => r.z < z);
  far.forEach(ringAt);
  // sombra en el suelo y dron
  const [shx, shy, shs] = P(d.x, GY, z); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(shx, shy, 40 * shs, 9 * shs, 0, 0, 6.283); c.fill();
  const [dx, dy, ds] = P(d.x, d.y, z); drawDrone(dx, dy, ds * 0.85, d.vx / 3000, d.vy / 2600);
  near.forEach(ringAt);
  // estelas de velocidad
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.beginPath(); for (const s of streaks) { const r0 = s.r + (0.25 - s.l) * 900; c.moveTo(320 + Math.cos(s.a) * r0, 180 + Math.sin(s.a) * r0 * 0.6); c.lineTo(320 + Math.cos(s.a) * (r0 + 40), 180 + Math.sin(s.a) * (r0 + 40) * 0.6); } c.stroke();
  // flecha hacia el próximo anillo si queda fuera de la vista
  if (next && k.st === 'play') { const [nx, ny] = P(next.x, next.y, next.z); if (nx < 20 || nx > 620 || ny < 20 || ny > 340) { const a = Math.atan2(ny - 180, nx - 320), ex = k.clamp(nx, 30, 610), ey = k.clamp(ny, 50, 330); c.save(); c.translate(ex, ey); c.rotate(a); c.beginPath(); c.moveTo(14, 0); c.lineTo(-8, -10); c.lineTo(-8, 10); c.closePath(); ART.fillOut(c, '#f2d15c', 2.5); c.restore(); } }
  // HUD
  label(`${score}`, 14, 10, 26); for (let i = 0; i < 4; i++) battery(626 - 34 - i * 40, 14, i < lives);
  if (combo > 1) label(`Combo x${combo}`, 320, 56, 18, '#f2d15c', 'center');
});
function battery(x, y, full) { ART.rr(c, x, y, 30, 16, 4); ART.fillOut(c, full ? '#2a2248' : 'rgba(42,34,72,.5)', 2.5); c.fillStyle = OUT; c.fillRect(x + 30, y + 4, 4, 8); if (full) { c.fillStyle = '#7cf7a0'; for (let i = 0; i < 3; i++) c.fillRect(x + 4 + i * 8, y + 4, 6, 8); } }
function drawDrone(x, y, s, roll, pitch) {
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(roll); c.lineJoin = 'round';
  const spin = t * 60, sy = 1 - Math.abs(pitch) * 0.3;
  // brazos
  for (const sd of [-1, 1]) { ART.rr(c, sd > 0 ? 10 : -46, -3 + pitch * 4, 36, 6, 3); ART.fillOut(c, '#3a3358', 2); }
  // rotores (difuminado giratorio)
  for (const sd of [-1, 1]) { const rx = sd * 44, ry = -12 + pitch * 6; ART.rr(c, rx - 3, ry, 6, 12, 2); ART.fillOut(c, '#3a3358', 2);
    c.fillStyle = 'rgba(220,235,255,.35)'; c.beginPath(); c.ellipse(rx, ry, 24, 5 * sy, 0, 0, 6.283); c.fill(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(rx + Math.cos(spin + sd) * 22, ry + Math.sin(spin + sd) * 4); c.lineTo(rx - Math.cos(spin + sd) * 22, ry - Math.sin(spin + sd) * 4); c.stroke(); }
  // cuerpo
  ART.rr(c, -22, -12, 44, 22, 10); ART.fillOut(c, '#f4f6ff', 2.5); ART.rr(c, -14, -8, 28, 9, 4); ART.fillOut(c, '#5ce1e6', 2); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-10, -7, 6, 3);
  c.beginPath(); c.arc(0, 12, 6, 0, 6.283); ART.fillOut(c, '#2a2248', 2); c.fillStyle = '#5ce1e6'; c.beginPath(); c.arc(1, 11, 2, 0, 6.283); c.fill();
  c.fillStyle = Math.sin(t * 10) > 0 ? '#ff4d6d' : '#7a2436'; c.beginPath(); c.arc(-18, 2, 2.5, 0, 6.283); c.fill(); c.fillStyle = Math.sin(t * 10) > 0 ? '#3a8a55' : '#7cf7a0'; c.beginPath(); c.arc(18, 2, 2.5, 0, 6.283); c.fill();
  c.restore(); }
