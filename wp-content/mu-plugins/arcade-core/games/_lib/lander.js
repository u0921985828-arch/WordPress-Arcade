/* Lunar Lander: módulo con llama y humo, terreno lunar con cráteres cacheado por nivel,
 * plataforma principal (x1) y plataforma estrecha de bonificación (x3), animación de choque antes del fin. */
const OUT = ART.OUT, R2 = 6.2832;
/* disposición: vertical (móvil de pie) = lienzo 360×640 con cielo alto; horizontal = 640×360 */
const PORT = innerHeight > innerWidth, W = PORT ? 360 : 640, H = PORT ? 640 : 360;
const G0 = PORT ? 560 : 300, GMIN = PORT ? 400 : 175, GMAX = PORT ? 610 : 340; // relieve: altura inicial y límites
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#05060d' }), c = k.ctx;
/* Dificultad por nivel: deriva inicial 25 % → 100 % (nivel 6), combustible 100 → 40, y márgenes de aterrizaje amplios al principio
 * (vertical 52 → 40, horizontal 31 → 25 desde el nivel 4). Antes: deriva completa, 92 de combustible y márgenes 40/25 desde el nivel 1. */
let VYL = 40, VXL = 25;
let s, ground, pads, fuel, maxFuel, score, level, landed, crash, smoke, debris, terrCv, tm, lastPts;
const rnd = (q) => { const x = Math.sin(q * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
function build() {
  // plataformas: principal (80 px, x1) y estrecha (40 px, x3) sin solaparse
  const a = PORT ? k.ri(2, 8) * 20 : k.ri(3, 13) * 20 + 40; let b; do b = k.ri(2, PORT ? W / 20 - 2 : 28) * 20; while (Math.abs(b + 20 - (a + 40)) < 110 || b < 20 || b + 40 > W - 20);
  pads = [{ x: a, w: 80, m: 1 }, { x: b, w: 40, m: 3 }];
  ground = []; let y = G0;
  for (let x = 0; x <= W; x += 20) { const p = pads.find((q) => x > q.x && x <= q.x + q.w); if (!p) y = k.clamp(y + k.rnd(-28, 28) + (y > GMAX - 20 ? -10 : 0), GMIN, GMAX); ground.push([x, y]); }
  for (const p of pads) { const py = ground[p.x / 20][1]; for (let i = p.x / 20; i <= (p.x + p.w) / 20; i++) ground[i][1] = py; p.y = py; }
  const v0 = Math.min(0.85, 0.2 + (level - 1) * 0.1); // 1.23: más fácil (antes 0.25+0.15/nivel, tope 1)
  s = { x: PORT ? 70 : 200, y: PORT ? 90 : 40, vx: (PORT ? 30 : 40) * v0, vy: 0, a: 0, thr: false }; maxFuel = fuel = Math.max(48, 124 - level * 7);
  VYL = Math.max(44, 58 - (level - 1) * 3); VXL = Math.max(28, 35 - (level - 1) * 1.5); landed = 0; crash = 0; smoke = []; debris = [];
  terrCv = off(W, H, (g) => {
    g.beginPath(); g.moveTo(0, H); ground.forEach(([x, yy]) => g.lineTo(x, yy)); g.lineTo(W, H); g.closePath();
    const gr = g.createLinearGradient(0, GMIN - 5, 0, H); gr.addColorStop(0, '#8d8fa8'); gr.addColorStop(1, '#3b3d56'); g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 22; i++) { const x = rnd(i + level * 31) * W, yy = gy(x) + 14 + rnd(i * 7 + level) * 120, r = 5 + rnd(i * 3.3) * 14; g.fillStyle = 'rgba(40,40,70,.35)'; g.beginPath(); g.ellipse(x, yy, r, r * 0.45, 0, 0, R2); g.fill(); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, yy + 1, r, r * 0.45, 0, 0.2, Math.PI - 0.2); g.stroke(); }
    for (let i = 0; i < 60; i++) { const x = rnd(i * 5 + level) * W; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, gy(x) + 6 + rnd(i) * 150, 2, 2); }
    g.restore();
    g.lineJoin = 'round'; g.beginPath(); ground.forEach(([x, yy]) => g.lineTo(x, yy)); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); ground.forEach(([x, yy]) => g.lineTo(x, yy + 3)); g.lineWidth = 2; g.strokeStyle = 'rgba(230,232,255,.45)'; g.stroke();
    // plataformas con franjas de peligro
    for (const p of pads) { g.fillStyle = '#4a4f70'; g.fillRect(p.x + 8, p.y, 6, 12); g.fillRect(p.x + p.w - 14, p.y, 6, 12);
      ART.rr(g, p.x - 2, p.y - 5, p.w + 4, 7, 2); g.save(); g.clip(); g.fillStyle = '#f2d15c'; g.fillRect(p.x - 2, p.y - 5, p.w + 4, 7); g.fillStyle = OUT; for (let x = p.x - 8; x < p.x + p.w + 4; x += 10) { g.beginPath(); g.moveTo(x, p.y + 2); g.lineTo(x + 5, p.y - 5); g.lineTo(x + 9, p.y - 5); g.lineTo(x + 4, p.y + 2); g.fill(); } g.restore();
      ART.rr(g, p.x - 2, p.y - 5, p.w + 4, 7, 2); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); }
  });
}
function gy(x) { for (let i = 0; i < ground.length - 1; i++) { const [x1, y1] = ground[i], [x2, y2] = ground[i + 1]; if (x >= x1 && x <= x2) return y1 + (y2 - y1) * (x - x1) / (x2 - x1); } return H; }
function reset() { score = 0; level = 1; tm = 0; lastPts = 0; build(); }
const SKY = off(W, H, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#04050f'); gr.addColorStop(1, '#161a3c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < (PORT ? 200 : 140); i++) { g.fillStyle = `rgba(255,255,255,${0.25 + rnd(i) * 0.7})`; const r = rnd(i + 9) < 0.1 ? 1.4 : 0.8; g.beginPath(); g.arc(rnd(i + 1) * W, rnd(i + 2) * (GMIN + 125), r, 0, R2); g.fill(); }
  // Tierra al fondo
  const ex = PORT ? 262 : 420, ey = PORT ? 150 : 92, er = 30; g.fillStyle = 'rgba(92,170,255,.15)'; g.beginPath(); g.arc(ex, ey, er + 8, 0, R2); g.fill();
  g.beginPath(); g.arc(ex, ey, er, 0, R2); g.fillStyle = '#3a86e0'; g.fill(); g.save(); g.clip(); g.fillStyle = '#5cc462'; for (const [x, y, w, h] of [[-18, -14, 18, 12], [4, -4, 16, 20], [-12, 10, 12, 8]]) { g.beginPath(); g.ellipse(ex + x, ey + y, w / 2 + 4, h / 2 + 2, 0.4, 0, R2); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(ex - er, ey - 4, er * 2, 3); g.fillStyle = 'rgba(0,0,20,.45)'; g.beginPath(); g.arc(ex + 14, ey + 8, er, 0, R2); g.fill(); g.restore();
  g.beginPath(); g.arc(ex, ey, er, 0, R2); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
  // colinas lejanas
  g.fillStyle = '#23264a'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 16) g.lineTo(x, GMIN + 35 - Math.sin(x / 90) * 26 - Math.sin(x / 37) * 8 - rnd(Math.floor(x / 16)) * 6); g.lineTo(W, H); g.fill();
});
reset();
/* al girar el móvil fuera de partida se recarga con la otra disposición */
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
k.show(CFG.title, '← → girar · ↑ o mantener pulsado = motor (el dedo también orienta la nave). Aterriza suave y recto en una plataforma: la estrecha vale el triple.');
function label(t, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(t, x, y); c.fillStyle = col || '#fff'; c.fillText(t, x, y);
}
function ship() {
  c.save(); c.translate(s.x, s.y); c.rotate(s.a); c.scale(1.2, 1.2);
  if (s.thr) { const L = 14 + Math.random() * 9; c.beginPath(); c.moveTo(-6, 7); c.quadraticCurveTo(0, 7 + L * 1.4, 6, 7); c.fillStyle = '#ff7a2f'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(-4, 7); c.quadraticCurveTo(0, 7 + L, 4, 7); c.fillStyle = '#ffd23d'; c.fill(); c.beginPath(); c.moveTo(-2, 7); c.quadraticCurveTo(0, 7 + L * 0.55, 2, 7); c.fillStyle = '#fff'; c.fill(); }
  // patas
  c.strokeStyle = OUT; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-7, 2); c.lineTo(-12, 10); c.moveTo(7, 2); c.lineTo(12, 10); c.stroke();
  c.strokeStyle = '#c9cede'; c.lineWidth = 2; c.stroke(); ART.rr(c, -15, 9, 7, 3, 1.5); ART.fillOut(c, '#c9cede', 1.5); ART.rr(c, 8, 9, 7, 3, 1.5); ART.fillOut(c, '#c9cede', 1.5);
  // tobera y etapa de descenso dorada
  c.beginPath(); c.moveTo(-4, 4); c.lineTo(4, 4); c.lineTo(6, 8); c.lineTo(-6, 8); c.closePath(); ART.fillOut(c, '#6a7090', 1.5);
  c.beginPath(); c.moveTo(-10, -2); c.lineTo(-8, -5); c.lineTo(8, -5); c.lineTo(10, -2); c.lineTo(10, 3); c.lineTo(8, 5); c.lineTo(-8, 5); c.lineTo(-10, 3); c.closePath(); ART.fillOut(c, '#e8b64a', 2);
  c.strokeStyle = 'rgba(120,70,0,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, -5); c.lineTo(-4, 5); c.moveTo(3, -5); c.lineTo(3, 5); c.stroke();
  // cabina
  c.beginPath(); c.moveTo(-8, -5); c.lineTo(-7, -12); c.lineTo(-3, -16); c.lineTo(3, -16); c.lineTo(7, -12); c.lineTo(8, -5); c.closePath(); ART.fillOut(c, '#eef0f8', 2);
  c.beginPath(); c.arc(0, -10, 3.2, 0, R2); ART.fillOut(c, '#3a86e0', 1.5); c.fillStyle = '#bfe3ff'; c.beginPath(); c.arc(-1, -11, 1.2, 0, R2); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(4, -16); c.lineTo(6, -21); c.stroke(); c.fillStyle = '#ff5f7a'; c.beginPath(); c.arc(6, -21, 1.6, 0, R2); c.fill();
  c.restore();
}
function footY() { return Math.min(gy((s.x + W) % W), gy((s.x - 12 + W) % W), gy((s.x + 12) % W)); }

k.run((dt) => {
  tm += dt;
  for (const p of smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 2; p.vy *= 1 - dt * 2; p.t -= dt; p.r += dt * 10; } smoke = smoke.filter((p) => p.t > 0);
  for (const d of debris) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 30 * dt; d.a += d.va * dt; if (d.y > gy(k.clamp(d.x, 0, W))) { d.y = gy(k.clamp(d.x, 0, W)); d.vy *= -0.3; d.vx *= 0.6; d.va *= 0.5; } }
  if (!k.gate(reset)) return;
  if (crash) { crash -= dt; if (crash <= 0) return k.lose(CFG.id, score, 'Estrellado', `Nivel ${level}`); return; }
  if (landed) { landed -= dt; if (landed <= 0) { level++; build(); } return; }
  if (k.held.has('left')) s.a -= 2.5 * dt; if (k.held.has('right')) s.a += 2.5 * dt;
  if (k.ptr.down) s.a += k.clamp((k.ptr.x - W / 2) / (W / 2) * 1.2 - s.a, -2.5 * dt, 2.5 * dt);
  s.thr = (k.held.has('up') || k.held.has('a') || k.ptr.down) && fuel > 0;
  if (s.thr) { s.vx += Math.sin(s.a) * 70 * dt; s.vy -= Math.cos(s.a) * 70 * dt; fuel = Math.max(0, fuel - 12 * dt);
    if (Math.random() < dt * 40) { const d = 24 + Math.random() * 8; smoke.push({ x: s.x - Math.sin(s.a) * d, y: s.y + Math.cos(s.a) * d, vx: -Math.sin(s.a) * 60 + k.rnd(-15, 15) + s.vx * 0.3, vy: Math.cos(s.a) * 60 + s.vy * 0.3, r: 3, t: 0.7 }); } }
  s.vy += 25 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.x = (s.x + W) % W;
  if (s.y + 13 >= footY()) {
    const p = pads.find((q) => s.x > q.x + 5 && s.x < q.x + q.w - 5), ok = p && s.vy < VYL && Math.abs(s.vx) < VXL && Math.abs(s.a) < 0.36;
    if (ok) { const soft = s.vy < 15; lastPts = Math.round((100 + fuel * 5) * level * p.m * (soft ? 1.5 : 1)); score += lastPts; landed = 2; s.thr = false; s.y = p.y - 13; s.vy = 0; s.vx = 0; s.a = 0;
      k.sfx('win'); k.confetti(); k.burst(s.x, p.y, '#dfe6f2', 14, 90); k.float(`+${lastPts}`, s.x, s.y - 30, '#fff27a'); if (soft) k.float('¡Suave! x1,5', s.x, s.y - 52, '#7cf7a0'); }
    else { crash = 1.1; s.thr = false; k.burst(s.x, s.y, '#ffb347', 50, 240); k.burst(s.x, s.y, '#fff', 20, 160); k.sfx('explode'); k.shake(10); k.flash('rgba(255,160,60,.4)');
      for (let i = 0; i < 9; i++) debris.push({ x: s.x, y: s.y - 4, vx: k.rnd(-90, 90), vy: k.rnd(-110, -20), a: 0, va: k.rnd(-8, 8), w: k.rnd(3, 7), col: k.pick(['#e8b64a', '#eef0f8', '#c9cede']) });
      for (let i = 0; i < 12; i++) smoke.push({ x: s.x + k.rnd(-8, 8), y: s.y, vx: k.rnd(-30, 30), vy: k.rnd(-40, -10), r: 6, t: 1.2 }); }
  }
}, () => {
  c.drawImage(SKY, 0, 0, W, H);
  for (let i = 0; i < 6; i++) { c.globalAlpha = Math.max(0, Math.sin(tm * 2 + i * 1.7)); c.fillStyle = '#fff'; const x = rnd(i + 500) * W, y = rnd(i + 600) * (GMIN - 25); c.fillRect(x - 3, y - 0.5, 6, 1); c.fillRect(x - 0.5, y - 3, 1, 6); } c.globalAlpha = 1;
  c.drawImage(terrCv, 0, 0, W, H);
  // luces de las plataformas y multiplicador
  for (const p of pads) { const on = Math.sin(tm * 6 + p.x) > 0; for (const x of [p.x, p.x + p.w]) { c.fillStyle = on ? '#7cf7a0' : '#2c5a3a'; c.beginPath(); c.arc(x, p.y - 7, 2.6, 0, R2); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); }
    label(`x${p.m}`, p.x + p.w / 2, p.y - 24 - Math.sin(tm * 3) * 2, 14, p.m > 1 ? '#fff27a' : '#dfe6ff', 'center'); }
  for (const p of smoke) { c.globalAlpha = Math.min(0.6, p.t); c.fillStyle = '#b8bcd4'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, R2); c.fill(); } c.globalAlpha = 1;
  if (!crash) {
    // sombra en el suelo según la altura
    const gh = footY(), alt = gh - s.y; if (alt < 140) { c.globalAlpha = (1 - alt / 140) * 0.45; c.fillStyle = '#000'; c.beginPath(); c.ellipse(s.x, gh, 14 * (1 - alt / 280), 3, 0, 0, R2); c.fill(); c.globalAlpha = 1; }
    ship();
  }
  for (const d of debris) { c.save(); c.translate(d.x, d.y); c.rotate(d.a); c.fillStyle = d.col; c.fillRect(-d.w / 2, -d.w / 3, d.w, d.w * 0.66); c.strokeStyle = OUT; c.lineWidth = 1.2; c.strokeRect(-d.w / 2, -d.w / 3, d.w, d.w * 0.66); c.restore(); }
  // HUD: nivel y puntos (izquierda), combustible, velocidades (derecha)
  label(`Nivel ${level}`, 12, 8, 14, '#cfd8ff'); label(score, 12, 26, 20, '#fff');
  ART.rr(c, 12, 54, 124, 12, 6); c.fillStyle = 'rgba(20,20,40,.8)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); const fw = fuel / maxFuel * 120; if (fw > 1) { ART.rr(c, 14, 56, fw, 8, 4); c.fillStyle = fuel / maxFuel > 0.25 ? '#7cf7a0' : Math.sin(tm * 10) > 0 ? '#ff6b6b' : '#a33'; c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(17, 57, Math.max(0, fw - 6), 2); }
  if (PORT) label('Combustible', 12, 70, 11, '#b8b6e0'); else label('Combustible', 140, 53, 11, '#b8b6e0');
  const bv = s.vy > VYL, bh = Math.abs(s.vx) > VXL, ba = Math.abs(s.a) > 0.36;
  const row = (txt, v, bad, y) => { label(txt, W - (PORT ? 66 : 80), y, 11, '#b8b6e0', 'right'); label(v, W - (PORT ? 8 : 12), y - 2, 14, bad ? '#ff6b6b' : '#7cf7a0', 'right'); };
  row('Vertical', Math.round(s.vy), bv, 10); row('Horizontal', Math.round(Math.abs(s.vx)), bh, 28); row('Inclinación', `${Math.round(Math.abs(s.a) * 57)}°`, ba, 46);
  if (landed) { const p = 2 - landed, sc = p < 0.2 ? 0.5 + p * 3 : 1.1; c.save(); c.translate(W / 2, PORT ? 230 : 130); c.scale(sc, sc); label('¡Aterrizaje!', 0, 0, 34, '#fff27a', 'center', 'middle'); label(`+${lastPts}`, 0, 34, 20, '#fff', 'center', 'middle'); c.restore(); }
  if (k.st === 'play' && fuel <= 0 && !landed && !crash) label('Sin combustible', W / 2, PORT ? 250 : 150, 18, '#ff6b6b', 'center');
});
