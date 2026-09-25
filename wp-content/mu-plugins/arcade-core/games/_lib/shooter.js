/* Naves. CFG.mode: 'invaders' | 'vertical' | 'centipede' | 'bullethell'. Arte propio vectorial. */
const M = CFG.mode, land = M === 'invaders';
const W = land ? 480 : 360, H = land ? 400 : 640;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#070814' }), c = k.ctx, OUT = '#0d0b1c';
let p, shots, foes, eb, score, lives, wave, cool, inv, dirX, t, pt, calm, mush, bunkers, ufo, pups, power, shield, stars, banner, bannerT;
/* ---------------------------------------------------------------- arte */
function glow(col, blur) { c.shadowColor = col; c.shadowBlur = blur; }
const GSP = {};
function gspr(id) {
  if (GSP[id]) return GSP[id];
  const [w, h, glw, col] = { s: [3, 12, '#5ce1e6', '#bff6ff'], z: [3, 12, '#ff5c7a', '#ffe066'], r: [7, 7, '#ff5c7a', '#ff8fa3'], R: [9, 9, '#ff5c7a', '#ff8fa3'] }[id], P = 9, cw = w + P * 2, ch = h + P * 2;
  const cv = document.createElement('canvas'); cv.width = cw * 2; cv.height = ch * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(cw / 2, ch / 2);
  g.shadowColor = glw; g.shadowBlur = 8; g.fillStyle = col;
  if (id === 'r' || id === 'R') { g.beginPath(); g.arc(0, 0, w / 2, 0, 6.283); g.fill(); } else g.fillRect(-w / 2, -h / 2, w, h);
  return (GSP[id] = { cv, w: cw, h: ch, o: -cw / 2, q: -ch / 2 });
}
function ship(x, y, s, tilt) {
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(tilt * 0.25);
  const fl = 6 + Math.random() * 6; glow('#ff9a3c', 12); c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(-5, 12); c.lineTo(0, 12 + fl); c.lineTo(5, 12); c.fill(); c.shadowBlur = 0;
  c.beginPath(); c.moveTo(0, -18); c.lineTo(7, -4); c.lineTo(16, 8); c.lineTo(16, 13); c.lineTo(5, 10); c.lineTo(-5, 10); c.lineTo(-16, 13); c.lineTo(-16, 8); c.lineTo(-7, -4); c.closePath();
  c.fillStyle = '#dfe6f5'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = '#6e62f5'; c.beginPath(); c.moveTo(-16, 8); c.lineTo(-7, 2); c.lineTo(-7, 10); c.lineTo(-16, 13); c.fill(); c.beginPath(); c.moveTo(16, 8); c.lineTo(7, 2); c.lineTo(7, 10); c.lineTo(16, 13); c.fill();
  c.fillStyle = '#5ce1e6'; c.beginPath(); c.ellipse(0, -4, 3.5, 7, 0, 0, 6.283); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-1.5, -9, 1.5, 4);
  c.restore();
}
const EC = ['#f0647e', '#9b8afb', '#3cc7d0', '#e9b949'];
function alien(x, y, kind, fr, flash) {
  c.save(); c.translate(x, y); const col = flash ? '#fff' : EC[kind % 4]; c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 2;
  if (kind % 3 === 0) { c.beginPath(); c.ellipse(0, 0, 12, 8, 0, 0, 6.283); c.fill(); c.stroke(); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 7, 5); c.lineTo(s * (10 + fr * 3), 12); c.stroke(); } }
  else if (kind % 3 === 1) { c.beginPath(); c.moveTo(-12, 4); c.lineTo(-8, -8); c.lineTo(8, -8); c.lineTo(12, 4); c.lineTo(6, 8); c.lineTo(-6, 8); c.closePath(); c.fill(); c.stroke(); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 5, -8); c.lineTo(s * (7 + fr * 2), -13); c.stroke(); } }
  else { c.beginPath(); c.arc(0, 0, 10, Math.PI, 0); c.lineTo(10, 6); for (let i = 0; i < 4; i++) c.lineTo(10 - (i + 0.5) * 5, fr ? 10 : 7); c.lineTo(-10, 6); c.closePath(); c.fill(); c.stroke(); }
  c.fillStyle = '#fff'; c.beginPath(); c.arc(-4, -1, 3, 0, 6.283); c.arc(4, -1, 3, 0, 6.283); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(-4, 0, 1.4, 0, 6.283); c.arc(4, 0, 1.4, 0, 6.283); c.fill();
  c.restore();
}
function drone(x, y, r, big, flash) {
  c.save(); c.translate(x, y); c.rotate(t * (big ? 0.6 : 1.8)); c.strokeStyle = OUT; c.lineWidth = 2;
  c.fillStyle = flash ? '#fff' : big ? '#b35a6b' : '#5a5f7a'; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * 1.047; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
  c.rotate(-t * (big ? 0.6 : 1.8)); glow('#f0647e', 10); c.fillStyle = '#f0647e'; c.beginPath(); c.arc(0, 0, r * 0.35, 0, 6.283); c.fill(); c.shadowBlur = 0; c.restore();
}
function segment(x, y, head, flash) { c.fillStyle = flash ? '#fff' : head ? '#e9b949' : '#4cc38a'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 9, 0, 6.283); c.fill(); c.stroke(); if (head) { c.fillStyle = OUT; c.beginPath(); c.arc(x - 3, y + 2, 1.8, 0, 6.283); c.arc(x + 3, y + 2, 1.8, 0, 6.283); c.fill(); } }
function mushroom(x, y, hp) { const s = 0.5 + hp / 6; c.fillStyle = '#e8dcc8'; c.fillRect(x - 3, y, 6, 7); c.fillStyle = ['#553', '#a0527a', '#c05a8a', '#e0649a'][hp]; c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y + 1, 8 * s, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - 3 * s, y - 3 * s, 1.6, 0, 6.283); c.fill(); }
function boss(b, flash) {
  c.save(); c.translate(b.x, b.y); const r = b.r; c.strokeStyle = OUT; c.lineWidth = 3;
  c.fillStyle = flash ? '#fff' : '#3d3566'; c.beginPath(); c.moveTo(-r * 1.6, 0); c.lineTo(-r, -r * 0.6); c.lineTo(r, -r * 0.6); c.lineTo(r * 1.6, 0); c.lineTo(r, r * 0.7); c.lineTo(-r, r * 0.7); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#5a4f99'; c.fillRect(-r * 0.9, -r * 0.2, r * 1.8, r * 0.4); glow('#f0647e', 20); c.fillStyle = b.phase > 1 ? '#ff3b5c' : '#f0647e'; c.beginPath(); c.arc(0, 0, r * 0.38 + Math.sin(t * 6) * 2, 0, 6.283); c.fill(); c.shadowBlur = 0;
  for (const s of [-1, 1]) { c.fillStyle = '#2a2448'; c.fillRect(s * r * 1.1 - 5, r * 0.3, 10, r * 0.6); }
  c.restore();
}
/* Fondo cacheado a 2×: nebulosas, polvo estelar y planeta (espacio) o huerto nocturno (ciempiés) */
function mkCv(w, h) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); return [cv, g]; }
const BG = (() => {
  const [cv, g] = mkCv(W, H), R = (a, b) => a + Math.random() * (b - a);
  if (M === 'centipede') {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d1a14'); gr.addColorStop(0.55, '#15291c'); gr.addColorStop(1, '#1d3322'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { const x = R(0, W), y = R(0, H), r = R(30, 70), rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, i % 3 ? 'rgba(60,110,60,.18)' : 'rgba(90,70,50,.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.lineCap = 'round'; for (let i = 0; i < 260; i++) { const x = R(0, W), y = R(0, H), hh = R(4, 9), sh = y / H; g.strokeStyle = `rgba(${90 + sh * 60 | 0},${150 + sh * 60 | 0},${90 | 0},${0.25 + sh * 0.3})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + R(-2, 2), y - hh * 0.6, x + R(-4, 4), y - hh); g.stroke(); }
    for (let i = 0; i < 18; i++) { const x = R(8, W - 8), y = R(8, H - 8), r = R(3, 6); g.beginPath(); g.ellipse(x, y, r * 1.3, r, R(0, 3), 0, 6.283); g.fillStyle = '#3d4a44'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke(); g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(x - r * 0.4, y - r * 0.4, r * 0.4, 0, 6.283); g.fill(); }
    for (let i = 0; i < 22; i++) { const x = R(6, W - 6), y = R(H * 0.15, H - 6), col = ['#e0649a', '#f2d15c', '#9b8afb', '#fff'][i % 4]; g.globalAlpha = 0.55; for (let j = 0; j < 5; j++) { const a = j * 1.2566; g.fillStyle = col; g.beginPath(); g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2, 0, 6.283); g.fill(); } g.fillStyle = '#f2d15c'; g.beginPath(); g.arc(x, y, 1.4, 0, 6.283); g.fill(); g.globalAlpha = 1; }
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    return { cv };
  }
  const top = M === 'bullethell' ? '#12061c' : '#070814', bot = M === 'bullethell' ? '#2a0e33' : '#161038';
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const neb = M === 'bullethell' ? ['#ff3b7a', '#9b3bff', '#ff8a3c'] : ['#6e62f5', '#f0647e', '#3cc7d0'];
  for (let i = 0; i < 14; i++) { const x = R(-40, W + 40), y = R(-40, H + 40), r = R(60, 170), rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, neb[i % 3] + '30'); rg.addColorStop(0.5, neb[i % 3] + '12'); rg.addColorStop(1, neb[i % 3] + '00'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${R(0.1, 0.45)})`; const r = R(0.4, 1.1); g.fillRect(R(0, W), R(0, H), r, r); }
  // planeta (sprite aparte, se desplaza despacio)
  const PR = land ? 150 : 46, [pc, pg] = mkCv(PR * 2 + 60, PR * 2 + 60), cx = PR + 30, cy = PR + 30;
  const pcol = M === 'bullethell' ? ['#7a3b8f', '#3d1a4f'] : land ? ['#4b6fc9', '#1d2a5c'] : ['#e08a5a', '#6b3550'];
  const pgr = pg.createRadialGradient(cx - PR * 0.4, cy - PR * 0.4, PR * 0.1, cx, cy, PR); pgr.addColorStop(0, pcol[0]); pgr.addColorStop(1, pcol[1]);
  pg.beginPath(); pg.arc(cx, cy, PR, 0, 6.283); pg.fillStyle = pgr; pg.fill(); pg.save(); pg.clip();
  pg.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 5; i++) pg.fillRect(cx - PR, cy - PR * 0.7 + i * PR * 0.32, PR * 2, PR * 0.1);
  for (let i = 0; i < 7; i++) { const a = R(0, 6.28), d = R(0, PR * 0.8), r = R(PR * 0.06, PR * 0.16); pg.beginPath(); pg.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, 0, 6.283); pg.fillStyle = 'rgba(0,0,0,.18)'; pg.fill(); }
  pg.fillStyle = 'rgba(0,0,0,.35)'; pg.beginPath(); pg.arc(cx + PR * 0.35, cy + PR * 0.35, PR, 0, 6.283); pg.fill(); pg.restore();
  pg.lineWidth = 3; pg.strokeStyle = OUT; pg.beginPath(); pg.arc(cx, cy, PR, 0, 6.283); pg.stroke();
  if (!land) { pg.save(); pg.translate(cx, cy); pg.rotate(-0.35); pg.strokeStyle = 'rgba(255,220,180,.55)'; pg.lineWidth = 4; pg.beginPath(); pg.ellipse(0, 0, PR * 1.5, PR * 0.35, 0, 0.1, Math.PI - 0.1); pg.stroke(); pg.restore(); }
  const atm = pg.createRadialGradient(cx, cy, PR, cx, cy, PR + 22); atm.addColorStop(0, pcol[0] + '55'); atm.addColorStop(1, pcol[0] + '00'); pg.fillStyle = atm; pg.beginPath(); pg.arc(cx, cy, PR + 22, 0, 6.283); pg.arc(cx, cy, PR, 0, 6.283, true); pg.fill();
  return { cv, pc, PR };
})();
function background() {
  c.drawImage(BG.cv, 0, 0, W, H);
  if (BG.pc) { const s = BG.pc.width / 2; if (land) c.drawImage(BG.pc, W * 0.72 - s / 2, H - 70 - 30, s, s); else { const y = ((t * 7 + 120) % (H + s + 40)) - s / 2 - 20; c.drawImage(BG.pc, W * 0.7 - s / 2, y - s / 2, s, s); } }
  if (M === 'centipede') { for (let i = 0; i < 9; i++) { const x = (i * 97 + Math.sin(t * 0.5 + i) * 30 + W) % W, y = (i * 71 + Math.cos(t * 0.4 + i * 2) * 26 + H) % H, a = 0.35 + 0.35 * Math.sin(t * 3 + i * 1.7); c.fillStyle = `rgba(214,255,120,${a * 0.35})`; c.beginPath(); c.arc(x, y, 6, 0, 6.283); c.fill(); c.fillStyle = `rgba(240,255,190,${a})`; c.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); } return; }
  for (const s of stars) { const a = 0.3 + s.z * 0.7; c.fillStyle = `rgba(255,255,255,${a})`; const r = s.z * 2.2; c.fillRect(s.x - r / 2, s.y - r / 2, r, r); if (s.z > 0.85) { c.globalAlpha = 0.35 + 0.3 * Math.sin(t * 4 + s.x); c.fillRect(s.x - 4, s.y - 0.5, 8, 1); c.fillRect(s.x - 0.5, s.y - 4, 1, 8); c.globalAlpha = 1; } }
}
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
/* ---------------------------------------------------------------- lógica */
/* Dificultad 0→1: por tiempo jugado en starfall (máximo hacia los 3,5 min) y por oleada en el resto (máximo en la 9). */
const lerp = (a, b, q) => a + (b - a) * q, ease = (q) => q * q * (3 - 2 * q);
function diff() { return M === 'vertical' ? Math.min(1, pt / 315) : ease(Math.min(1, (wave - 1) / 12)); } // 1.23: más fácil (máx. 5,25 min / oleada 13)
function msg(txt) { banner = txt; bannerT = 1.8; }
function spawnWave() {
  wave++; foes = []; calm = wave === 1 ? 5 : 2;
  if (M === 'invaders') { const rows = 5, cols = 9; for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) foes.push({ x: 50 + i * 42, y: 60 + r * 30, r: 12, hp: 1, pts: [30, 20, 20, 10, 10][r], kind: r < 1 ? 1 : r < 3 ? 0 : 2, fr: 0 }); dirX = 1; if (wave === 1) makeBunkers(); msg(`Oleada ${wave}`); }
  if (M === 'centipede') { if (wave === 1) { mush = []; for (let i = 0; i < 34; i++) mush.push({ x: k.ri(1, 16) * 20 + 10, y: k.ri(3, 25) * 20 + 10, hp: 3 }); } for (let i = 0; i < Math.min(25, 9 + wave * 2); i++) foes.push({ x: 10 - i * 20, y: 30, r: 9, hp: 1, pts: i === 0 ? 100 : 20, dir: 1, seg: true, head: i === 0 }); msg(`Oleada ${wave}`); }
  if (M === 'bullethell' || (M === 'vertical' && wave % 3 === 0)) { const hp = M === 'bullethell' ? 112 + wave * 40 : 32 + wave * 10; foes.push({ x: W / 2, y: -60, ty: 110, r: 30, hp, max: hp, pts: 500 * wave, boss: true, a: 0, phase: 1 }); msg(M === 'bullethell' ? `Jefe ${wave}` : '¡Jefe!'); }
  else if (M === 'vertical') msg(`Oleada ${wave}`);
}
function makeBunkers() { bunkers = []; for (let b = 0; b < 4; b++) { const bx = 70 + b * 110, by = H - 100; for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) { if ((y === 4 && x > 2 && x < 5) || (y === 0 && (x === 0 || x === 7))) continue; bunkers.push({ x: bx + x * 5, y: by + y * 5 }); } } }
function reset() { p = { x: W / 2, y: H - 50, tilt: 0 }; shots = []; foes = []; eb = []; pups = []; score = 0; lives = 4; wave = 0; cool = 0; inv = 3; t = 0; pt = 0; calm = 0; power = 1; shield = 0; ufo = null; bunkers = []; stars = Array.from({ length: 70 }, () => ({ x: k.rnd(0, W), y: k.rnd(0, H), z: k.rnd(0.2, 1) })); spawnWave(); }
reset(); k.show(CFG.title, CFG.help);
function hitPlayer() { if (inv > 0) return; if (shield > 0) { shield = 0; inv = 1; k.sfx('hit'); k.burst(p.x, p.y, '#5ce1e6', 16); return; } lives--; inv = 2; eb = []; power = Math.max(1, power - 1); k.burst(p.x, p.y, '#ffb347', 30, 220); k.sfx('explode'); k.shake(8); k.flash('rgba(255,80,90,.35)'); if (lives <= 0) k.lose(CFG.id, Math.floor(score), 'Nave destruida', `Oleada ${wave}`); }
function killFoe(f) { f.dead = true; score += f.pts; k.burst(f.x, f.y, f.boss ? '#f0647e' : EC[(f.kind || 0) % 4], f.boss ? 70 : 14, f.boss ? 260 : 160); k.sfx(f.boss ? 'explode' : 'hit'); if (f.boss) { k.shake(12); k.float(`+${f.pts}`, f.x, f.y, '#e9b949'); pups.push({ x: f.x, y: f.y, t: 'P' }); }
  if (M === 'centipede' && f.seg) mush.push({ x: Math.round((f.x - 10) / 20) * 20 + 10, y: f.y, hp: 3 });
  if (M === 'vertical' && !f.boss && Math.random() < 0.08) pups.push({ x: f.x, y: f.y, t: Math.random() < 0.6 ? 'P' : 'S' }); }
k.run((dt) => {
  t += dt; for (const s of stars) { s.y += (20 + s.z * 90) * dt; if (s.y > H) { s.y = 0; s.x = k.rnd(0, W); } }
  bannerT -= dt;
  if (!k.gate(reset)) return;
  pt += dt; calm -= dt; const D = diff();
  const sp = 270, free = M !== 'invaders', ox = p.x;
  if (k.held.has('left')) p.x -= sp * dt; if (k.held.has('right')) p.x += sp * dt;
  if (free && k.held.has('up')) p.y -= sp * dt; if (free && k.held.has('down')) p.y += sp * dt;
  if (k.ptr.down) { p.x += (k.ptr.x - p.x) * Math.min(1, dt * 14); if (free) p.y += (k.ptr.y - 70 - p.y) * Math.min(1, dt * 14); }
  p.x = k.clamp(p.x, 16, W - 16); p.y = k.clamp(p.y, free ? H * 0.4 : H - 40, H - 30); p.tilt += (((p.x - ox) / Math.max(dt, 0.001)) / 300 - p.tilt) * Math.min(1, dt * 10);
  cool -= dt; inv -= dt; shield -= dt;
  const auto = M !== 'invaders' || k.ptr.down, rate = M === 'bullethell' ? 0.09 : M === 'invaders' ? 0.45 : 0.18;
  if ((k.held.has('a') || auto) && cool <= 0 && (M !== 'invaders' || shots.length < 2)) { cool = rate; const n = M === 'bullethell' ? 3 : Math.min(3, power);
    for (let i = 0; i < n; i++) shots.push({ x: p.x + (i - (n - 1) / 2) * 9, y: p.y - 16, vx: (i - (n - 1) / 2) * (M === 'bullethell' ? 40 : 60) }); if (M !== 'bullethell') k.sfx('shoot'); }
  for (const s of shots) { s.y -= 560 * dt; s.x += (s.vx || 0) * dt; }
  /* enemigos */
  if (M === 'invaders') {
    const alive = foes.length, sp2 = lerp(16, 34, D) + (45 - alive) * 2.7; let edge = false; const fr = Math.floor(t * (1 + (45 - alive) / 12)) % 2;
    for (const f of foes) { f.fr = fr; f.x += dirX * sp2 * dt; if (f.x < 16 || f.x > W - 16) edge = true; }
    if (edge) { dirX *= -1; for (const f of foes) { f.y += 10; f.x += dirX * 4; if (f.y > H - 72) return k.lose(CFG.id, Math.floor(score), 'Invadido', `Oleada ${wave}`); } }
    if (foes.length && calm <= 0 && Math.random() < dt * lerp(0.45, 2.25, D)) { const cols = {}; for (const f of foes) { const key = Math.round(f.x / 10); if (!cols[key] || cols[key].y < f.y) cols[key] = f; } const f = k.pick(Object.values(cols)); eb.push({ x: f.x, y: f.y + 10, vx: 0, vy: lerp(128, 208, D), zig: 1 }); }
    if (!ufo && Math.random() < dt * 0.06) ufo = { x: -30, y: 34, vx: 90, pts: k.pick([50, 100, 150, 300]) };
    if (ufo) { ufo.x += ufo.vx * dt; if (ufo.x > W + 40) ufo = null; }
    for (const s of shots) { if (ufo && !s.dead && Math.abs(s.x - ufo.x) < 18 && Math.abs(s.y - ufo.y) < 10) { s.dead = true; score += ufo.pts; k.float(`+${ufo.pts}`, ufo.x, ufo.y, '#e9b949'); k.burst(ufo.x, ufo.y, '#f0647e', 24); k.sfx('coin'); ufo = null; }
      for (const b of bunkers) if (!b.dead && !s.dead && s.x > b.x - 1 && s.x < b.x + 6 && s.y < b.y + 6 && s.y + 560 * dt > b.y) { b.dead = true; s.dead = true; } } /* barrido: a 560 px/s la bala avanza más que una celda por fotograma */
    for (const e of eb) for (const b of bunkers) if (!b.dead && !e.dead && e.x > b.x - 2 && e.x < b.x + 7 && e.y > b.y && e.y - e.vy * dt < b.y + 6) { b.dead = true; e.dead = true; k.burst(e.x, e.y, '#4cc38a', 3, 60); }
    for (const f of foes) for (const b of bunkers) if (!b.dead && Math.abs(f.x - b.x) < 14 && Math.abs(f.y - b.y) < 10) b.dead = true;
    bunkers = bunkers.filter((b) => !b.dead);
  } else if (M === 'vertical') {
    if (!foes.some((f) => f.boss) && calm <= 0 && Math.random() < dt * lerp(0.8, 2.56, D)) { const big = Math.random() < lerp(0.06, 0.22, D); foes.push({ x: k.rnd(24, W - 24), y: -20, r: big ? 18 : 12, hp: big ? 6 : 1, pts: big ? 60 : 15, vy: k.rnd(60, 120) * lerp(0.56, 0.98, D), ph: k.rnd(0, 6), big, kind: k.ri(0, 3) }); }
    for (const f of foes) { if (f.boss) continue; f.y += f.vy * dt; f.x += Math.sin(t * 2 + f.ph) * 45 * dt; if (f.big && f.y > 20 && Math.random() < dt * lerp(0.34, 0.75, D)) { const a = Math.atan2(p.y - f.y, p.x - f.x), v = lerp(112, 152, D); eb.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v }); } if (f.y > H + 30) f.dead = true; }
    if (!foes.some((f) => f.boss) && pt > wave * 26) spawnWave();
  } else if (M === 'centipede') {
    for (const f of foes) { if (f.spider) continue; f.x += f.dir * lerp(56, 128, D) * dt;
      const blocked = f.x < 10 || f.x > W - 10 || mush.some((m) => m.hp > 0 && Math.abs(m.x - f.x) < 14 && Math.abs(m.y - f.y) < 10);
      if (blocked) { f.dir *= -1; f.x = k.clamp(f.x, 10, W - 10); f.y += 20; if (f.y > H - 20) f.y = H * 0.62; }
      if (Math.hypot(f.x - p.x, f.y - p.y) < 17) hitPlayer(); }
    const segs = foes.filter((f) => f.seg); segs.forEach((f, i) => { if (i === 0 || !segs[i - 1] || Math.hypot(segs[i - 1].x - f.x, segs[i - 1].y - f.y) > 24) f.head = true; });
    for (const s of shots) for (const m of mush) if (m.hp > 0 && !s.dead && Math.abs(s.x - m.x) < 10 && Math.abs(s.y - m.y) < 10) { m.hp--; s.dead = true; score += 1; if (!m.hp) k.burst(m.x, m.y, '#e0649a', 6, 60); }
    if (calm <= -2 && Math.random() < dt * lerp(0.12, 0.4, D)) { const sx = Math.random() < 0.5 ? -10 : W + 10; foes.push({ x: sx, y: k.rnd(H * 0.6, H - 40), r: 11, hp: 1, pts: k.pick([300, 600, 900]), dir: sx < 0 ? 1 : -1, spider: true }); }
    for (const f of foes) if (f.spider) { f.x += f.dir * lerp(64, 98, D) * dt; f.y += Math.sin(t * 7 + f.x * 0.05) * 140 * dt; f.y = k.clamp(f.y, H * 0.55, H - 20); if (f.x < -20 || f.x > W + 20) f.dead = true; if (Math.hypot(f.x - p.x, f.y - p.y) < 17) hitPlayer(); mush.forEach((m) => { if (Math.abs(m.x - f.x) < 10 && Math.abs(m.y - f.y) < 10) m.hp = 0; }); }
  }
  for (const b of foes) if (b.boss) {
    b.y += (b.ty - b.y) * Math.min(1, dt * 1.5); b.a += dt; b.x = W / 2 + Math.sin(t * 0.7) * 110; b.phase = b.hp < b.max * 0.33 ? 3 : b.hp < b.max * 0.66 ? 2 : 1;
    /* no dispara hasta estar en posición; anillos y ráfagas crecen con la dificultad y con la fase */
    const n = Math.round(lerp(7, 18, D)) + b.phase * 2, rv = lerp(68, 88, D) + b.phase * 12, av = lerp(132, 168, D);
    if (b.y > b.ty - 25 && Math.random() < dt * (lerp(0.68, 1.28, D) + b.phase * lerp(0.38, 0.68, D))) for (let i = 0; i < n; i++) { const a = b.a * (b.phase === 3 ? 3 : 2) + i / n * 6.283; eb.push({ x: b.x, y: b.y, vx: Math.cos(a) * rv, vy: Math.sin(a) * rv }); }
    if (b.y > b.ty - 25 && Math.random() < dt * (lerp(0.38, 0.68, D) + b.phase * 0.26)) { const a = Math.atan2(p.y - b.y, p.x - b.x); for (let j = -1; j <= 1; j++) eb.push({ x: b.x, y: b.y, vx: Math.cos(a + j * 0.2) * av, vy: Math.sin(a + j * 0.2) * av }); }
    if (M === 'bullethell') score += dt * 5;
  }
  for (const s of shots) for (const f of foes) if (!f.dead && !s.dead && Math.hypot(s.x - f.x, s.y - f.y) < f.r + 4) { s.dead = true; f.flash = 0.06; if (--f.hp <= 0) killFoe(f); }
  for (const e of eb) { e.x += e.vx * dt; e.y += e.vy * dt; if (Math.hypot(e.x - p.x, e.y - p.y) < (M === 'bullethell' ? 4.25 : 9.4)) { e.dead = true; hitPlayer(); } }
  for (const f of foes) { f.flash = (f.flash || 0) - dt; if (!f.dead && !f.boss && M !== 'centipede' && Math.hypot(f.x - p.x, f.y - p.y) < f.r + 10) { killFoe(f); hitPlayer(); } }
  for (const u of pups) { u.y += 90 * dt; if (Math.hypot(u.x - p.x, u.y - p.y) < 26) { u.dead = true; k.sfx('coin'); if (u.t === 'P') { power = Math.min(3, power + 1); k.float('¡Disparo mejorado!', p.x, p.y - 30, '#5ce1e6'); } else { shield = 10; k.float('¡Escudo!', p.x, p.y - 30, '#9b8afb'); } } }
  shots = shots.filter((s) => !s.dead && s.y > -10); eb = eb.filter((e) => !e.dead && e.y > -20 && e.y < H + 20 && e.x > -20 && e.x < W + 20); foes = foes.filter((f) => !f.dead); pups = pups.filter((u) => !u.dead && u.y < H + 20);
  if (k.st === 'play' && M !== 'vertical' && !foes.some((f) => !f.spider)) { score += 200 * wave; k.float(`+${200 * wave}`, W / 2, H * 0.5, '#e9b949'); k.sfx('win'); k.confetti(); spawnWave(); }
  if (k.st === 'play' && M === 'vertical' && wave % 3 === 0 && !foes.some((f) => f.boss) && t > 3) { /* jefe vencido */ }
}, () => {
  background();
  if (M === 'centipede') for (const m of mush) if (m.hp > 0) mushroom(m.x, m.y, m.hp);
  if (bunkers) { c.fillStyle = OUT; for (const b of bunkers) c.fillRect(b.x - 1, b.y - 1, 7, 7); c.fillStyle = '#4cc38a'; for (const b of bunkers) c.fillRect(b.x, b.y, 5, 5); c.fillStyle = '#8ef0bd'; for (const b of bunkers) c.fillRect(b.x, b.y, 5, 1.5); }
  if (ufo) { c.save(); c.translate(ufo.x, ufo.y); c.fillStyle = '#f0647e'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 2, 20, 7, 0, 0, 6.283); c.fill(); c.stroke(); c.fillStyle = '#5ce1e6'; c.beginPath(); c.arc(0, -2, 8, Math.PI, 0); c.fill(); c.stroke(); for (let i = -2; i <= 2; i++) { c.fillStyle = Math.floor(t * 8 + i) % 2 ? '#fff' : '#e9b949'; c.fillRect(i * 7 - 1.5, 3, 3, 3); } c.restore(); }
  for (const f of foes) { const fl = f.flash > 0;
    if (f.boss) { boss(f, fl); const bw = Math.min(220, W - 150), bx = W / 2 - bw / 2; ART.rr(c, bx - 2, 54, bw + 4, 10, 5); ART.fillOut(c, 'rgba(12,10,24,.7)', 2); c.fillStyle = f.phase > 2 ? '#ff3b5c' : '#f0647e'; ART.rr(c, bx, 56, bw * Math.max(0, f.hp) / f.max, 6, 3); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(bx + 2, 56.5, Math.max(0, bw * f.hp / f.max - 4), 1.5); continue; }
    if (f.seg) segment(f.x, f.y, f.head, fl);
    else if (f.spider) { c.save(); c.translate(f.x, f.y); c.lineCap = 'round'; for (const [lw, col] of [[4, OUT], [2, '#c98a2a']]) { c.strokeStyle = col; c.lineWidth = lw; for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const ly = -6 + i * 4 + Math.sin(t * 20 + i + s) * 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(s * 9, ly - 5); c.lineTo(s * 15, ly + 2); c.stroke(); } }
      c.fillStyle = fl ? '#fff' : '#e9b949'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 1, 9, 8, 0, 0, 6.283); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(-3, -3, 2.5, 0, 6.283); c.fill();
      c.fillStyle = '#ff3b5c'; c.beginPath(); c.arc(-3, 2, 1.8, 0, 6.283); c.arc(3, 2, 1.8, 0, 6.283); c.fill(); c.restore(); }
    else if (M === 'invaders') alien(f.x, f.y, f.kind, f.fr, fl);
    else if (M === 'vertical') f.big ? drone(f.x, f.y, f.r, true, fl) : alien(f.x, f.y, f.kind, Math.floor(t * 4) % 2, fl); }
  for (const u of pups) { const col = u.t === 'P' ? '#5ce1e6' : '#9b8afb', b = 1 + Math.sin(t * 6) * 0.08; c.save(); c.translate(u.x, u.y); c.scale(b, b);
    c.globalAlpha = 0.3; c.fillStyle = col; c.beginPath(); c.arc(0, 0, 17, 0, 6.283); c.fill(); c.globalAlpha = 1;
    c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.roundRect ? c.roundRect(-11, -11, 22, 22, 7) : c.rect(-11, -11, 22, 22); c.fill(); c.stroke();
    c.fillStyle = OUT; c.beginPath(); if (u.t === 'P') { for (const dx of [-4, 4]) { c.moveTo(dx, -7); c.lineTo(dx + 4, 0); c.lineTo(dx - 4, 0); c.closePath(); c.rect(dx - 1.5, 0, 3, 6); } } else { c.moveTo(0, -7); c.lineTo(6, -4); c.lineTo(5, 3); c.lineTo(0, 7); c.lineTo(-5, 3); c.lineTo(-6, -4); c.closePath(); } c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(-8, -8, 10, 2.5); c.restore(); }
  // balas con brillo: sprites precalculados (shadowBlur en cada bala cuesta un desenfoque por figura y frame)
  const sh = gspr('s'); for (const s of shots) c.drawImage(sh.cv, s.x + sh.o, s.y - 1 + sh.q, sh.w, sh.h);
  const ez = gspr('z'), er = gspr(M === 'bullethell' ? 'R' : 'r'); for (const e of eb) { if (e.zig) c.drawImage(ez.cv, e.x + (Math.floor(e.y / 6) % 2 ? 2 : -2) + ez.o, e.y + ez.q, ez.w, ez.h); else c.drawImage(er.cv, e.x + er.o, e.y + er.q, er.w, er.h); }
  if (k.st === 'play' && !(inv > 0 && Math.floor(inv * 10) % 2)) { ship(p.x, p.y, 1, k.clamp(p.tilt, -1.5, 1.5)); if (shield > 0) { c.strokeStyle = `rgba(155,138,251,${0.5 + Math.sin(t * 8) * 0.2})`; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 26, 0, 6.283); c.stroke(); } if (M === 'bullethell') { c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, 3, 0, 6.283); c.fill(); } }
  label(String(Math.floor(score)), 12, 8, 22, '#fff'); for (let i = 0; i < lives; i++) ship(W - 18 - i * 22, 22, 0.55, 0);
  if (M === 'vertical' && power > 1) for (let i = 1; i < power; i++) { c.beginPath(); c.moveTo(18 + (i - 1) * 16, 36); c.lineTo(25 + (i - 1) * 16, 47); c.lineTo(11 + (i - 1) * 16, 47); c.closePath(); ART.fillOut(c, '#5ce1e6', 2); }
  if (bannerT > 0 && k.st === 'play') { c.globalAlpha = Math.min(1, bannerT); label(banner, W / 2, H * 0.42, 28, '#fff', 'center'); c.globalAlpha = 1; }
});
