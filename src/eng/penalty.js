/* Penalty Flick con arte propio: desliza desde el balón hacia la portería. Largo = alto; un desliz curvo da efecto (engaña al portero).
 * Portero animado que adivina el lado y se estira hacia el balón (mejora con el nivel). Red que se deforma. Diana de escuadra = +3. 3 fallos y se acaba. */
const VS = CFG.mode === 'versus', OUT = ART.OUT, R2 = 6.2832, W = VS ? 640 : 360, H = VS ? 360 : 640, CX = W / 2;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#2e8b3e' }), c = k.ctx;
const GX = VS ? 170 : 40, GY = VS ? 96 : 160, GW = VS ? 300 : 280, GH = 110, GL = GY + GH, SPOT = VS ? [CX, 326] : [180, 548], VP = [CX, GY - 40];
let kcol = '#ff9a3d', ball, keeper, goals, pts, shots, misses, state, msg, msgT, msgC, level, target, path, net, cheer, kb, aimK, t = 0, bgCv;
function setup() { ball = { x: SPOT[0], y: SPOT[1] - 14, gy: SPOT[1], s: 1, e: 0, rot: 0, a: 1, h: 0 }; keeper = { x: CX, tx: CX, a: 0, ta: 0, dive: 0, delay: 0, dir: 0 }; state = 'aim'; path = [];
  target = level >= 2 ? { x: Math.random() < 0.5 ? GX + 34 : GX + GW - 34, y: GY + 30, r: 22 } : null; }
function reset() { goals = 0; pts = 0; shots = 0; misses = 0; level = 1; msg = ''; msgT = 0; cheer = 0; kb = false; aimK = { x: CX, y: 215 }; net = { a: 0, v: 0, x: CX, y: 220 }; setup(); }
/* ---------- Fondo cacheado: grada con público, vallas, césped en perspectiva y líneas ---------- */
function buildBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return v - Math.floor(v); };
  const AY = VS ? 58 : 124, GS = AY + 24, NR = VS ? 4 : 9; // vallas, inicio del césped, filas de público
  let gr = g.createLinearGradient(0, 0, 0, AY + 6); gr.addColorStop(0, '#1b1840'); gr.addColorStop(1, '#3a2f6a'); g.fillStyle = gr; g.fillRect(0, 0, W, AY + 6);
  for (let r = 0; r < NR; r++) { const y = 8 + r * 13; g.fillStyle = r % 2 ? '#2b2554' : '#322b60'; g.fillRect(0, y + 6, W, 7); for (let i = 0; i < Math.ceil(W / 12); i++) { const x = i * 12.4 + (r % 2) * 6 + hr(i, r) * 3; g.fillStyle = ['#ff5f7a', '#f2d15c', '#5ce1e6', '#ffffff', '#7cf7a0', '#b98cff', '#ff9a3d'][Math.floor(hr(r, i) * 7)]; g.fillRect(x - 4, y + 4, 8, 7); g.fillStyle = ['#ffd1a3', '#e0a878', '#8a5a3b', '#f5c99a'][Math.floor(hr(i + 5, r) * 4)]; g.beginPath(); g.arc(x, y + 1, 3.6, 0, R2); g.fill(); } }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, W, AY + 6);
  // vallas publicitarias
  const ads = [['ARCADE', '#6e62f5'], ['GOL', '#e0564a'], ['JUEGA', '#2a9e50'], ['PENALTI', '#f2b705']];
  for (let i = 0; i < Math.ceil(W / 90); i++) { const x = i * 90 - (VS ? 10 : 0), a = ads[i % 4]; ART.rr(g, x + 2, AY, 86, 24, 3); ART.fillOut(g, a[1], 2); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 4, AY + 2, 82, 5); g.font = '900 13px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(a[0], x + 45, AY + 13); }
  // césped con franjas en perspectiva
  gr = g.createLinearGradient(0, GS, 0, H); gr.addColorStop(0, '#2f8f3f'); gr.addColorStop(1, '#3fae4c'); g.fillStyle = gr; g.fillRect(0, GS, W, H - GS);
  let y = GS, hgt = VS ? 7 : 10; for (let i = 0; y < H; i++) { if (i % 2) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, y, W, hgt); } y += hgt; hgt *= 1.22; }
  for (let i = 0; i < 1400; i++) { g.fillStyle = i % 2 ? 'rgba(0,50,0,.14)' : 'rgba(255,255,255,.07)'; const yy = GS + 2 + hr(i, 3) * (H - GS - 2); g.fillRect(hr(i, 7) * W, yy, 1.2, 1 + (yy - GS - 2) / 160); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, GS, W, 6);
  // líneas: gol, área pequeña, área grande, punto de penalti
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(0, GL); g.lineTo(W, GL); g.stroke();
  g.beginPath(); g.moveTo(GX - 30, GL); g.lineTo(GX - 44, GL + 44); g.lineTo(GX + GW + 44, GL + 44); g.lineTo(GX + GW + 30, GL); g.stroke();
  g.lineWidth = 3.5; g.beginPath(); g.moveTo(GX - 80, GL); g.lineTo(GX - 160, H); g.moveTo(GX + GW + 80, GL); g.lineTo(GX + GW + 160, H); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(SPOT[0], SPOT[1], 9, 4, 0, 0, R2); g.fill();
  // viñeta
  gr = g.createRadialGradient(W / 2, H * 0.55, VS ? 200 : 150, W / 2, H * 0.55, VS ? 460 : 420); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  bgCv = cv;
}
if (!VS) { reset(); buildBg(); k.show(CFG.title, 'Desliza desde el balón hacia la portería: más largo = más alto, y un desliz curvo da efecto. Teclado: flechas para apuntar y A para chutar. Las dianas de escuadra valen +3. Fallas 3 y se acaba.'); }
function shoot(tx, ty, curve) {
  ball.from = [ball.x, ball.gy]; ball.tx = tx; ball.ty = ty; ball.curve = curve; ball.e = 0; state = 'fly'; shots++; k.sfx('shoot');
  // el portero lee la dirección inicial (sin el efecto) y se lanza tras un pequeño retraso
  const skill = Math.min(0.75, 0.06 + level * 0.09), px = tx - curve * 0.5, py = ty, guess = Math.random() < skill;
  const ex = guess ? px + k.rnd(-1, 1) * (40 - Math.min(25, level * 3)) : 180 + k.pick([-1, 1, 0]) * k.rnd(40, 130), ey = guess ? py : k.rnd(GY + 30, GL - 20);
  keeper.dir = Math.sign(ex - 180); keeper.tx = 180 + k.clamp(ex - 180, -40, 40); keeper.ta = Math.atan2(ex - keeper.tx, GL - ey) * (Math.abs(ex - 180) < 25 ? 0.2 : 1); keeper.ta = k.clamp(keeper.ta, -1.35, 1.35); keeper.delay = Math.max(0.05, 0.22 - level * 0.02); keeper.dive = 0;
}
function result(kind) {
  state = 'after'; ball.wait = 1.4; msgT = 1.3;
  if (kind === 'goal') { goals++; const bonus = target && Math.hypot(ball.x - target.x, ball.y - target.y) < target.r + 4; const p = bonus ? 3 : 1; pts += p; msg = bonus ? '¡ESCUADRA! +3' : '¡GOOOL!'; msgC = '#f2d15c'; k.sfx('win'); k.confetti(); cheer = 1.4; if (bonus) { k.burst(target.x, target.y, '#f2d15c', 22, 180); target.hit = 1; } if (goals % 3 === 0) { level++; k.float(`Nivel ${level}`, 180, 330, '#7cf7a0'); }
    net.x = ball.x; net.y = ball.y; net.v = 9; ball.inNet = 0; }
  else { misses++; msgC = '#fff'; msg = kind === 'save' ? '¡Parada!' : kind === 'post' ? '¡Al palo!' : 'Fuera'; navigator.vibrate && navigator.vibrate(60);
    if (kind === 'save' || kind === 'post') { ball.vx = k.rnd(-160, 160); ball.vy = k.rnd(80, 220); ball.vh = k.rnd(60, 180); k.burst(ball.x, ball.y, '#fff', 10, 120); if (kind === 'post') k.sfx('hit'); }
    else { ball.vx = (ball.tx - CX) * 0.6; ball.vy = -120; ball.vh = 40; } }
  ball.res = kind;
}
if (!VS) k.run((dt) => {
  t += dt; msgT -= dt; cheer = Math.max(0, cheer - dt); net.v += (-net.a * 180 - net.v * 9) * dt; net.a += net.v * dt; if (target && target.hit) target.hit = Math.max(0, target.hit - dt);
  if (!k.gate(reset)) return;
  if (state === 'aim') {
    if (k.ptr.down && k.ptr.sy > 400) path.push([k.ptr.x, k.ptr.y]);
    if (k.ptr.up && k.ptr.sy > 400) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy;
      if (dy < -40) { // efecto: desviación máxima del recorrido respecto a la cuerda
        let dev = 0; const L = Math.hypot(dx, dy); for (const [x, y] of path) { const d = ((x - k.ptr.sx) * dy - (y - k.ptr.sy) * dx) / L; if (Math.abs(d) > Math.abs(dev)) dev = d; }
        shoot(180 + dx * 1.3, GL + 40 + dy * 0.45, k.clamp(-dev * 1.4, -70, 70)); }
      path = []; }
    if (k.held.has('left')) { aimK.x -= 160 * dt; kb = true; } if (k.held.has('right')) { aimK.x += 160 * dt; kb = true; } if (k.held.has('up')) { aimK.y -= 110 * dt; kb = true; } if (k.held.has('down')) { aimK.y += 110 * dt; kb = true; }
    aimK.x = k.clamp(aimK.x, 10, 350); aimK.y = k.clamp(aimK.y, GY - 50, GL - 8);
    if (k.hit.has('a')) shoot(aimK.x, aimK.y, 0);
  }
  if (state === 'fly' || state === 'after') { keeper.delay -= dt; if (keeper.delay <= 0 && keeper.dive < 1) { keeper.dive = Math.min(1, keeper.dive + dt * 3.4); keeper.x += (keeper.tx - keeper.x) * Math.min(1, dt * 7); keeper.a += (keeper.ta - keeper.a) * Math.min(1, dt * 9); } }
  if (state === 'fly') { const r = flyStep(dt); if (r) result(r); }
  else if (state === 'after') { const b = ball; afterMove(dt);
    b.wait -= dt; if (b.wait <= 0) { if (misses >= 3) return k.lose(CFG.id, pts, 'Fin de la tanda', `${goals} goles de ${shots}`); setup(); } }
}, () => {
  c.drawImage(bgCv, 0, cheer > 0 ? -Math.abs(Math.sin(t * 16)) * 3 : 0, W, H);
  drawGoalBack();
  if (state === 'after' && ball.res === 'goal') drawBall();
  drawKeeper();
  drawPosts();
  if (target) { const s = 1 + (target.hit || 0) * 0.5 + Math.sin(t * 5) * 0.05; c.save(); c.translate(target.x, target.y); c.scale(s, s); c.globalAlpha = 0.9; for (const [r, col] of [[1, '#ff4d5e'], [0.66, '#fff'], [0.33, '#ff4d5e']]) { c.beginPath(); c.arc(0, 0, target.r * r, 0, R2); c.fillStyle = col; c.fill(); } c.lineWidth = 2; c.strokeStyle = OUT; c.beginPath(); c.arc(0, 0, target.r, 0, R2); c.stroke(); c.restore(); c.globalAlpha = 1; label('+3', target.x, target.y + target.r + 2, 11, '#f2d15c', 'center'); }
  if (!(state === 'after' && ball.res === 'goal')) drawBall();
  // guía de disparo
  if (state === 'aim' && k.ptr.down && k.ptr.sy > 400 && path.length > 1) { c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(26,21,48,.6)'; c.lineWidth = 9; c.beginPath(); path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke();
    const dy = k.ptr.y - k.ptr.sy, dx = k.ptr.x - k.ptr.sx; if (dy < -40) { const tx = 180 + dx * 1.3, ty = GL + 40 + dy * 0.45; c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(tx, ty, 9, 0, R2); c.stroke(); } }
  if (state === 'aim' && kb) { c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.arc(aimK.x, aimK.y, 11, 0, R2); c.stroke(); c.strokeStyle = '#f2d15c'; c.lineWidth = 2.5; c.stroke(); c.beginPath(); c.moveTo(aimK.x - 16, aimK.y); c.lineTo(aimK.x + 16, aimK.y); c.moveTo(aimK.x, aimK.y - 16); c.lineTo(aimK.x, aimK.y + 16); c.stroke(); }
  if (state === 'aim' && !k.ptr.down && !kb && shots === 0) { const e = (t % 1.4) / 1.4; c.globalAlpha = 1 - e; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(180, 520); c.lineTo(180, 520 - e * 120); c.stroke(); c.beginPath(); c.moveTo(172, 528 - e * 120); c.lineTo(180, 518 - e * 120); c.lineTo(188, 528 - e * 120); c.stroke(); c.globalAlpha = 1; }
  // HUD
  panel(8, 6, 112, 44); label(`${pts}`, 20, 10, 24, '#f2d15c'); label(`Nivel ${level}`, 108, 12, 11, '#b8f0a8', 'right'); label(`${goals}/${shots} goles`, 108, 30, 11, '#e6e1ff', 'right');
  panel(W - 112, 6, 104, 44); for (let i = 0; i < 3; i++) { const x = W - 88 + i * 32, y = 28; miniBall(x, y, 11, i < misses ? 0.35 : 1); if (i < misses) { c.strokeStyle = OUT; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 8, y - 8); c.lineTo(x + 8, y + 8); c.moveTo(x + 8, y - 8); c.lineTo(x - 8, y + 8); c.stroke(); c.strokeStyle = '#ff4d5e'; c.lineWidth = 3.5; c.stroke(); } }
  if (msgT > 0) { const e = Math.min(1, (1.3 - msgT) / 0.16), s = 0.5 + 0.5 * e + Math.sin(e * Math.PI) * 0.2; c.save(); c.translate(W / 2, 360); c.scale(s, s); c.rotate(-0.05); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, -22, 42, msgC, 'center'); c.restore(); c.globalAlpha = 1; }
});
/* ---------- Vuelo del balón (compartido por los dos modos) ---------- */
function flyStep(dt) { ball.e += dt * 2.3 * (ball.sp || 1); const e = Math.min(1, ball.e), b = ball;
    b.x = b.from[0] + (b.tx - b.from[0]) * e + b.curve * (e * e * 0.5 + Math.sin(e * Math.PI) * 0.6); b.gy = b.from[1] + (GL + 2 - b.from[1]) * e;
    b.h = (GL - b.ty) * e + Math.sin(e * Math.PI) * 26; b.y = b.gy - 14 * (1 - e * 0.55) - Math.max(0, b.h); b.s = 1 - e * 0.55; b.rot += dt * 14;
    if (ball.e >= 1) { const bx = b.x, by = b.y, a = keeper.a, kx = keeper.x, p0 = [kx + Math.sin(a) * 12, GL - Math.cos(a) * 12], R = Math.min(115, 84 + level * 4), p1 = [kx + Math.sin(a) * R, GL - Math.cos(a) * R];
      const vx = p1[0] - p0[0], vy = p1[1] - p0[1], u = k.clamp(((bx - p0[0]) * vx + (by - p0[1]) * vy) / (vx * vx + vy * vy), 0, 1), dk = Math.hypot(bx - p0[0] - vx * u, by - p0[1] - vy * u);
      const post = (Math.abs(bx - GX) < 7 || Math.abs(bx - GX - GW) < 7) && by > GY - 6 && by < GL || Math.abs(by - GY) < 6 && bx > GX - 6 && bx < GX + GW + 6;
      const inGoal = bx > GX + 6 && bx < GX + GW - 6 && by > GY + 6 && by < GL;
      return post ? 'post' : inGoal ? (dk < 20 * (keeper.dive > 0.5 ? 1 : 0.8) ? 'save' : 'goal') : 'miss'; }
  return null; }
function afterMove(dt) { const b = ball; b.rot += dt * 6;
    if (b.res === 'goal') { b.inNet = Math.min(1, b.inNet + dt * 3); if (b.inNet >= 1) { b.y = Math.min(GL - 12 - 3, b.y + 240 * dt); } else { b.x += (VP[0] - b.x) * dt * 0.8; b.y += (VP[1] - b.y) * dt * 0.8; b.s = Math.max(0.3, b.s - dt * 0.25); } }
    else { b.x += b.vx * dt; b.y += b.vy * dt - b.vh * dt; b.vh -= 400 * dt; b.s = b.res === 'miss' ? Math.max(0.2, b.s - dt * 0.3) : Math.min(1.1, b.s + dt * 0.25); if (b.res === 'miss') b.a = Math.max(0, b.a - dt * 1.2); } }
/* ---------- Portería: red deformable (fondo, laterales, techo) y postes ---------- */
function netPt(x, y) { const d2 = (x - net.x) ** 2 + (y - net.y) ** 2, a = net.a * Math.exp(-d2 / 2600); return [x + (VP[0] - x) * a * 0.3, y + (VP[1] - y) * a * 0.3 + a * 10]; }
function drawGoalBack() {
  const bx0 = GX + 16, bx1 = GX + GW - 16, by0 = GY - 18, by1 = GL - 12;
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.moveTo(GX, GL); c.lineTo(bx0, by1); c.lineTo(bx1, by1); c.lineTo(GX + GW, GL); c.fill();
  c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; const NX = 20, NY = 9;
  for (let i = 0; i <= NX; i++) { c.beginPath(); for (let j = 0; j <= NY; j++) { const [x, y] = netPt(bx0 + (bx1 - bx0) * i / NX, by0 + (by1 - by0) * j / NY); j ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  for (let j = 0; j <= NY; j++) { c.beginPath(); for (let i = 0; i <= NX; i++) { const [x, y] = netPt(bx0 + (bx1 - bx0) * i / NX, by0 + (by1 - by0) * j / NY); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  // laterales y techo
  c.strokeStyle = 'rgba(255,255,255,.4)';
  for (let i = 1; i < 5; i++) { const f = i / 5; c.beginPath(); c.moveTo(GX + (bx0 - GX) * f, GY + (by0 - GY) * f); c.lineTo(GX + (bx0 - GX) * f, GL + (by1 - GL) * f); c.moveTo(GX + GW + (bx1 - GX - GW) * f, GY + (by0 - GY) * f); c.lineTo(GX + GW + (bx1 - GX - GW) * f, GL + (by1 - GL) * f); c.stroke(); }
  for (let j = 1; j < 6; j++) { const y = GY + (GL - GY) * j / 6, yb = by0 + (by1 - by0) * j / 6; c.beginPath(); c.moveTo(GX, y); c.lineTo(bx0, yb); c.moveTo(GX + GW, y); c.lineTo(bx1, yb); c.stroke(); }
  for (let i = 1; i < 14; i++) { const x = GX + GW * i / 14, xb = bx0 + (bx1 - bx0) * i / 14; c.beginPath(); c.moveTo(x, GY); c.lineTo(xb, by0); c.stroke(); }
  // marco trasero
  c.strokeStyle = '#c9ccd8'; c.lineWidth = 3; c.beginPath(); c.moveTo(bx0, by1); c.lineTo(bx0, by0); c.lineTo(bx1, by0); c.lineTo(bx1, by1); c.moveTo(GX, GY); c.lineTo(bx0, by0); c.moveTo(GX + GW, GY); c.lineTo(bx1, by0); c.stroke();
}
function drawPosts() {
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(GX, GL + 2, 9, 3, 0, 0, R2); c.ellipse(GX + GW, GL + 2, 9, 3, 0, 0, R2); c.fill();
  c.beginPath(); c.moveTo(GX - 4, GL); c.lineTo(GX - 4, GY - 4); c.lineTo(GX + GW + 4, GY - 4); c.lineTo(GX + GW + 4, GL); c.lineTo(GX + GW - 3, GL); c.lineTo(GX + GW - 3, GY + 3); c.lineTo(GX + 3, GY + 3); c.lineTo(GX + 3, GL); c.closePath(); ART.fillOut(c, '#ffffff', 2.5);
  c.fillStyle = 'rgba(150,160,190,.45)'; c.fillRect(GX + 0.5, GY, 2.5, GL - GY); c.fillRect(GX + GW + 0.5, GY, 2.5, GL - GY); c.fillRect(GX, GY + 0.5, GW, 2.5);
}
/* ---------- Portero: balanceo en espera, estirada con los brazos por encima de la cabeza ---------- */
function drawKeeper() {
  const kp = keeper, d = kp.dive, idle = state === 'aim' ? Math.sin(t * 3) : 0, lift = Math.sin(Math.min(1, d) * Math.PI * 0.8) * 18 * Math.min(1, Math.abs(kp.a) * 1.5);
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(kp.x + Math.sin(kp.a) * 40 * d, GL + 2, 26 + 30 * d * Math.abs(Math.sin(kp.a)), 5, 0, 0, R2); c.fill();
  c.save(); c.translate(kp.x + idle * 6, GL - lift - Math.abs(Math.sin(t * 6)) * (state === 'aim' ? 2 : 0)); c.rotate(kp.a * Math.min(1, d * 1.3));
  const arm = d > 0 ? Math.min(1, d * 1.6) : 0; // 0 = brazos abiertos, 1 = estirados por encima
  // piernas
  c.lineCap = 'round'; for (const s of [-1, 1]) { c.strokeStyle = OUT; c.lineWidth = 10; c.beginPath(); c.moveTo(s * 7, -30); c.lineTo(s * (11 + arm * 2), -3); c.stroke(); c.strokeStyle = '#1a1530'; c.lineWidth = 6.5; c.stroke(); c.strokeStyle = '#f2f2f7'; c.lineWidth = 6; c.beginPath(); c.moveTo(s * (10 + arm * 2), -14); c.lineTo(s * (11 + arm * 2), -5); c.stroke();
    ART.rr(c, s * (11 + arm * 2) - 6, -6, 12, 6, 3); ART.fillOut(c, '#1a1530', 1.5); }
  ART.rr(c, -13, -38, 26, 12, 4); ART.fillOut(c, '#1a1530', 2); // pantalón
  // brazos
  for (const s of [-1, 1]) { const ang = (1 - arm) * (s * 1.9) + arm * (s * 0.25), ax = s * 13, ay = -60, L = 30, hx = ax + Math.sin(ang) * L, hy = ay - Math.cos(ang) * L;
    c.strokeStyle = OUT; c.lineWidth = 11; c.beginPath(); c.moveTo(ax, ay); c.lineTo(hx, hy); c.stroke(); c.strokeStyle = kcol; c.lineWidth = 7; c.stroke();
    c.beginPath(); c.arc(hx, hy, 7.5, 0, R2); ART.fillOut(c, '#7cf7a0', 2); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(hx - 2, hy - 2, 2.5, 0, R2); c.fill(); }
  // camiseta
  ART.rr(c, -16, -66, 32, 32, 9); ART.fillOut(c, kcol, 2.5); c.fillStyle = kcol === '#ff9a3d' ? '#e06a1a' : ART.dark(kcol, 0.25); c.fillRect(-15, -44, 30, 5); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(-11, -63, 5, 20);
  c.fillStyle = OUT; c.font = '900 12px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1', 0, -54);
  // cabeza
  c.beginPath(); c.arc(0, -77, 11, 0, R2); ART.fillOut(c, '#f5c99a', 2.5); c.fillStyle = '#5a3a22'; c.beginPath(); c.arc(0, -80, 11, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -77, 11, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  const look = state === 'aim' ? k.clamp((ball.x - CX) / 60, -1, 1) * 2 : kp.dir * 2; c.fillStyle = OUT; c.beginPath(); c.arc(-4 + look, -76, 1.8, 0, R2); c.arc(4 + look, -76, 1.8, 0, R2); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); if (d > 0.2) c.arc(look, -70, 2.5, 0, R2); else { c.moveTo(-3 + look, -70); c.lineTo(3 + look, -70); } c.stroke();
  c.restore();
}
function miniBall(x, y, r, a) { c.globalAlpha = a; c.beginPath(); c.arc(x, y, r, 0, R2); ART.fillOut(c, '#fff', 2); c.fillStyle = OUT; c.beginPath(); for (let i = 0; i < 5; i++) { const an = -Math.PI / 2 + i * R2 / 5; c.lineTo(x + Math.cos(an) * r * 0.4, y + Math.sin(an) * r * 0.4); } c.fill(); c.globalAlpha = 1; }
function drawBall() {
  const b = ball, r = 14 * b.s; if (b.a <= 0) return; c.globalAlpha = b.a;
  if (state !== 'after' || b.res !== 'goal') { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(b.x, (state === 'fly' ? b.gy : b.y + r) + 1, r * 1.05, r * 0.38, 0, 0, R2); c.fill(); }
  c.save(); c.translate(b.x, b.y); c.beginPath(); c.arc(0, 0, r, 0, R2); c.fillStyle = '#fff'; c.fill(); c.save(); c.clip();
  c.fillStyle = OUT; const ro = b.rot; for (let i = 0; i < 6; i++) { const cx = i ? Math.cos(ro + i * R2 / 5) * r * 0.78 : Math.sin(ro * 0.5) * r * 0.15, cy = i ? Math.sin(ro * 0.7 + i * R2 / 5) * r * 0.78 : Math.cos(ro * 0.5) * r * 0.15, pr = i ? r * 0.3 : r * 0.36;
    c.beginPath(); for (let j = 0; j < 5; j++) { const an = ro * 0.3 + i + j * R2 / 5; c.lineTo(cx + Math.cos(an) * pr, cy + Math.sin(an) * pr); } c.fill(); }
  c.fillStyle = 'rgba(40,40,80,.22)'; c.beginPath(); c.arc(r * 0.35, r * 0.35, r, 0, R2); c.arc(-r * 0.1, -r * 0.1, r, 0, R2, true); c.fill('evenodd'); c.restore();
  c.beginPath(); c.arc(0, 0, r, 0, R2); c.lineWidth = Math.max(1.2, 2.5 * b.s); c.strokeStyle = OUT; c.stroke(); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(-r * 0.4, -r * 0.45, r * 0.22, 0, R2); c.fill(); c.restore(); c.globalAlpha = 1;
}
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function panel(x, y, w, h) { ART.rr(c, x, y, w, h, 10); c.fillStyle = 'rgba(26,21,48,.72)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.14)'; c.stroke(); }

/* ================= Penaltis Cara a Cara (CFG.mode 'versus') =================
 * Tanda 1 contra 1: 5 penaltis por cabeza alternando tirador y portero; si hay empate, muerte súbita por parejas.
 * Tirador: mantiene una dirección (zona) y carga la fuerza manteniendo A; suelta para chutar (fuerza excesiva = se va alto, floja = el portero llega).
 * Portero: la dirección que mantenga al chutar el rival es hacia donde se lanza. Nada se dibuja de lo que eligen si ambos son humanos (en la tele no hay chivatos).
 * Sin segundo humano, la CPU ocupa la plaza: guarda el nivel en localStorage (cpu:<id>) y lee las manías del rival. */
function vsMain() {
  level = 5; const LS = 'cpu:' + CFG.id; let lvl = 0; try { lvl = +localStorage.getItem(LS) || 0; } catch (e) {}
  let seats, kicks, first = 0, sh = 0, kp = 1, pw = 0, pwOn = false, pwT = 0, aimT = 0, runT = 0, readT = -1, introT = 0, over = false, cpuT = 0, cpuZ = null, cpuPw = 0.7, tapZ = null, flick = null, kz = null, shotZ = null, hist = [[], []], started = false, endT = 0;
  const seat = () => (seats = k.players(2)), nm = (p) => (seats[p].cpu ? 'CPU' : String(seats[p].name).slice(0, 8));
  const goalsOf = (p) => kicks[p].filter(Boolean).length;
  const AIM_MAX = 8;
  function nextKick() { ball = { x: SPOT[0], y: SPOT[1] - 14, gy: SPOT[1], s: 1, e: 0, rot: 0, a: 1, h: 0, sp: 1 }; keeper = { x: CX, tx: CX, a: 0, ta: 0, dive: 0, delay: 99, dir: 0 };
    sh = kicks[0].length === kicks[1].length ? first : kicks[0].length < kicks[1].length ? 0 : 1; kp = 1 - sh; kcol = k.pcol(kp);
    state = 'intro'; introT = 1.2; pw = 0; pwOn = false; pwT = 0; aimT = 0; runT = 0; readT = -1; cpuT = k.rnd(1.1, 2.3); cpuZ = null; tapZ = null; flick = null; kz = null; shotZ = null; path = []; }
  function reset() { seat(); kicks = [[], []]; hist = [[], []]; over = false; endT = 0; msg = ''; msgT = 0; cheer = 0; net = { a: 0, v: 0, x: CX, y: 220 }; nextKick(); k.count(3); }
  k.onParty = () => seat();
  /* zona (x −1..1, y 0 abajo / 1 arriba) → punto de la portería, con error según la fuerza */
  function aimPoint(z, p, exact) { let tx = CX + z.x * (GW / 2 - 34), ty = z.y ? GY + 26 : GL - 20; if (exact) return [tx, ty];
    const err = 7 + Math.max(0, p - 0.8) * 150 + Math.max(0, 0.3 - p) * 40; tx += k.rnd(-1, 1) * err; ty += k.rnd(-1, 0.5) * err * 0.7 - Math.max(0, p - 0.9) * 150; return [tx, ty]; }
  const zoneOf = (p) => { const d = k.pdir(p); return { x: d.x, y: d.y < 0 ? 1 : 0 }; };
  function kick() { // el tirador golpea: se fija la zona y el balón sale
    let z, tx, ty, curve = 0, p = pw;
    if (seats[sh].cpu) { z = cpuZ; p = cpuPw; [tx, ty] = aimPoint(z, p); }
    else if (flick) { [tx, ty, curve] = flick; p = 0.72; z = { x: tx < CX - 50 ? -1 : tx > CX + 50 ? 1 : 0, y: ty < GY + 55 ? 1 : 0 }; }
    else { z = zoneOf(sh); [tx, ty] = aimPoint(z, p); }
    shotZ = z; hist[sh].push(z.x); ball.from = [ball.x, ball.gy]; ball.tx = tx; ball.ty = ty; ball.curve = curve; ball.e = 0; ball.sp = 0.75 + p * 0.75; state = 'fly'; k.sfx('shoot'); k.shake(2); k.burst(ball.x, ball.gy, '#b6f0a0', 8, 90);
    if (seats[kp].cpu) { // la CPU adivina: acierta más con nivel alto, lee las manías del tirador y no falla con los tiros flojos
      const hs = hist[sh].slice(-6), fav = hs.length >= 3 ? Math.sign(hs.reduce((a, b) => a + b, 0)) : 0, right = Math.random() < Math.min(0.5, 0.26 + lvl * 0.035) || p < 0.28;
      kz = right ? { x: z.x, y: z.y } : { x: fav && Math.random() < 0.5 ? fav : k.pick([-1, 0, 1]), y: Math.random() < 0.45 ? 1 : 0 }; dive(kz, 0.12); }
    else readT = 0.1; } // el humano tiene una décima de reacción
  function dive(z, delay) { const [ex, ey] = aimPoint(z, 0, true); keeper.dir = z.x; keeper.tx = CX + k.clamp(ex - CX, -40, 40); keeper.ta = k.clamp(Math.atan2(ex - keeper.tx, GL - ey) * (z.x ? 1 : 0.2), -1.35, 1.35); keeper.delay = delay; keeper.dive = 0; }
  function vsResult(kind) {
    state = 'after'; ball.wait = 1.5; msgT = 1.3; ball.res = kind; const gol = kind === 'goal'; kicks[sh].push(gol);
    if (gol) { msg = '¡GOOOL!'; msgC = k.pcol(sh); k.sfx('win'); k.confetti(k.pcol(sh), 60); cheer = 1.4; net.x = ball.x; net.y = ball.y; net.v = 9; ball.inNet = 0; }
    else { msg = kind === 'save' ? '¡Parada!' : kind === 'post' ? '¡Al palo!' : 'Fuera'; msgC = kind === 'save' ? k.pcol(kp) : '#fff'; navigator.vibrate && navigator.vibrate(60);
      if (kind === 'save' || kind === 'post') { ball.vx = k.rnd(-160, 160); ball.vy = k.rnd(80, 220); ball.vh = k.rnd(60, 180); k.burst(ball.x, ball.y, '#fff', 10, 120); if (kind === 'post') k.sfx('hit'); else { k.sfx('pop'); k.burst(ball.x, ball.y, k.pcol(kp), 16, 150); } }
      else { ball.vx = (ball.tx - CX) * 0.6; ball.vy = -120; ball.vh = 40; } } }
  function decided() { const a = kicks[0], b = kicks[1], ga = goalsOf(0), gb = goalsOf(1);
    if (a.length <= 5 && b.length <= 5) { if (ga + 5 - a.length < gb) return 1; if (gb + 5 - b.length < ga) return 0; }
    if (a.length === b.length && a.length >= 5 && ga !== gb) return ga > gb ? 0 : 1; return -1; }
  function finish(w) { over = true; const vsCPU = seats[0].cpu !== seats[1].cpu; if (vsCPU) { lvl = seats[w].cpu ? Math.max(0, lvl - 1) : Math.min(6, lvl + 1); try { localStorage.setItem(LS, lvl); } catch (e) {} }
    first = 1 - first; k.podium([{ p: 0, score: goalsOf(0) }, { p: 1, score: goalsOf(1) }], { head: `¡${nm(w)} gana la tanda!`, noTie: true, fmt: (v) => `${v} ${v === 1 ? 'gol' : 'goles'}` }); }
  reset(); buildBg();
  k.show(CFG.title, 'Tanda de 5 penaltis por cabeza y, si hay empate, muerte súbita. Chutas: mantén una dirección (arriba = por alto) y deja A pulsado para cargar; suelta en la franja verde. Paras: mantén hacia dónde te lanzas cuando el rival golpea. En el móvil también puedes deslizar para chutar y tocar un lado de la portería para parar.');
  k.run((dt) => {
    t += dt; msgT -= dt; cheer = Math.max(0, cheer - dt); net.v += (-net.a * 180 - net.v * 9) * dt; net.a += net.v * dt;
    if (!k.gate(reset)) return; started = true;
    if (k.counting()) return;
    if (over) return;
    if (state === 'intro') { introT -= dt; if (introT <= 0) state = 'aim'; return; }
    if (state === 'aim') { aimT += dt;
      // portero humano en el móvil local: toca un lado de la portería
      if (!k.party && !seats[kp].cpu && k.ptr.hit && k.ptr.y < GL + 30) tapZ = { x: k.ptr.x < CX - GW / 6 ? -1 : k.ptr.x > CX + GW / 6 ? 1 : 0, y: k.ptr.y < GY + GH / 2 ? 1 : 0 };
      if (seats[sh].cpu) { cpuT -= dt; if (!cpuZ) { const hk = hist[kp].slice(-4); const bias = lvl > 1 && hk.length ? -Math.sign(hk.reduce((a, b) => a + b, 0)) : 0; cpuZ = { x: bias && Math.random() < 0.3 ? bias : k.pick([-1, -1, 0, 1, 1]), y: Math.random() < 0.4 ? 1 : 0 }; cpuPw = k.clamp(0.66 + (Math.random() - 0.5) * Math.max(0.12, 0.5 - lvl * 0.06), 0.25, 0.97); }
        if (cpuT < 0.9) { pwOn = true; pwT += dt; pw = Math.min(cpuPw, pwT * 1.1); } if (cpuT <= 0) { runT = 0.35; state = 'run'; } }
      else { const p = sh;
        if (!k.party && k.ptr.down && k.ptr.sy > GL + 40) path.push([k.ptr.x, k.ptr.y]);
        if (!k.party && k.ptr.up && k.ptr.sy > GL + 40) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy;
          if (dy < -30) { let dev = 0; const L = Math.hypot(dx, dy); for (const [x, y] of path) { const d = ((x - k.ptr.sx) * dy - (y - k.ptr.sy) * dx) / L; if (Math.abs(d) > Math.abs(dev)) dev = d; } flick = [CX + dx * 1.6, GL + 20 + dy * 0.8, k.clamp(-dev * 1.4, -60, 60)]; runT = 0.3; state = 'run'; }
          path = []; }
        if (k.pheld(p, 'a')) { if (!pwOn) { pwOn = true; pwT = 0; k.sfx('click'); } pwT += dt; const u = (pwT * 0.65) % 2; pw = u < 1 ? u : 2 - u; }
        else if (pwOn) { runT = 0.3; state = 'run'; }
        if (aimT > AIM_MAX && state === 'aim') { if (!pwOn) pw = 0.5; runT = 0.3; state = 'run'; } }
      return; }
    if (state === 'run') { runT -= dt; if (runT <= 0) kick(); return; }
    if (state === 'fly' || state === 'after') {
      if (readT >= 0 && state === 'fly') { readT -= dt; if (readT < 0) { let z = zoneOf(kp); if (!z.x && !z.y && tapZ) z = tapZ; kz = z; dive(z, 0.02); } }
      keeper.delay -= dt; if (keeper.delay <= 0 && keeper.dive < 1) { keeper.dive = Math.min(1, keeper.dive + dt * 3.4); keeper.x += (keeper.tx - keeper.x) * Math.min(1, dt * 7); keeper.a += (keeper.ta - keeper.a) * Math.min(1, dt * 9); } }
    if (state === 'fly') { const r = flyStep(dt); if (r) vsResult(r); }
    else if (state === 'after') { afterMove(dt); ball.wait -= dt; if (ball.wait <= 0) { const w = decided(); if (w >= 0) finish(w); else nextKick(); } }
  }, () => {
    c.drawImage(bgCv, 0, cheer > 0 ? -Math.abs(Math.sin(t * 16)) * 3 : 0, W, H);
    drawGoalBack(); if (state === 'after' && ball.res === 'goal') drawBall();
    drawKeeper(); drawPosts();
    if (!(state === 'after' && ball.res === 'goal')) drawBall();
    drawShooter();
    const hideAim = !seats[0].cpu && !seats[1].cpu && k.party; // dos humanos en la tele: nada de pistas
    if (state === 'aim' && !seats[sh].cpu && !hideAim && !k.counting()) { const z = zoneOf(sh), [tx, ty] = aimPoint(z, 0, true); c.globalAlpha = 0.85; c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.arc(tx, ty, 13, 0, R2); c.stroke(); c.strokeStyle = k.pcol(sh); c.lineWidth = 3; c.stroke(); c.beginPath(); c.moveTo(tx - 19, ty); c.lineTo(tx + 19, ty); c.moveTo(tx, ty - 19); c.lineTo(tx, ty + 19); c.stroke(); c.globalAlpha = 1; }
    if (state === 'aim' && !seats[kp].cpu && !hideAim && !k.counting()) { let z = zoneOf(kp); if (!z.x && !z.y && tapZ) z = tapZ; const [ex, ey] = aimPoint(z, 0, true); c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 6); c.fillStyle = k.pcol(kp); c.beginPath(); c.arc(ex, ey, 20, 0, R2); c.fill(); c.globalAlpha = 1; label('Te lanzas aquí', ex, ey + 20, 12, '#fff', 'center'); }
    if (state === 'aim' && !k.party && !seats[sh].cpu && k.ptr.down && k.ptr.sy > GL + 40 && path.length > 1) { c.lineCap = 'round'; c.strokeStyle = 'rgba(26,21,48,.6)'; c.lineWidth = 9; c.beginPath(); path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke(); }
    vsHud();
    if (msgT > 0) { const e = Math.min(1, (1.3 - msgT) / 0.16), s = 0.5 + 0.5 * e + Math.sin(e * Math.PI) * 0.2; c.save(); c.translate(CX, 250); c.scale(s, s); c.rotate(-0.05); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, -22, 40, msgC, 'center'); c.restore(); c.globalAlpha = 1; }
    if (state === 'intro' && !k.counting() && k.st === 'play') { const e = Math.min(1, (1.2 - introT) / 0.2); c.save(); c.translate(CX, 210); c.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e); c.globalAlpha = Math.min(1, introT / 0.25); ART.rr(c, -150, -34, 300, 68, 16); c.fillStyle = 'rgba(26,21,48,.82)'; c.fill(); c.lineWidth = 3; c.strokeStyle = k.pcol(sh); c.stroke();
      label(`${nm(sh)} chuta`, 0, -28, 26, k.pcol(sh), 'center'); label(`${nm(kp)} para`, 0, 4, 20, k.pcol(kp), 'center'); c.restore(); c.globalAlpha = 1; }
  });
  function vsHud() {
    const pw0 = 250; panel(CX - pw0, 4, pw0 * 2, 50);
    label(`${goalsOf(0)} – ${goalsOf(1)}`, CX, 10, 26, '#fff', 'center');
    const sd = Math.max(kicks[0].length, kicks[1].length) > 5;
    if (sd) label('Muerte súbita', CX, 38, 11, '#ffd166', 'center');
    for (const p of [0, 1]) { const dir = p ? 1 : -1, x0 = CX + dir * 60, col = k.pcol(p), act = k.st === 'play' && !over && (sh === p || kp === p);
      label(nm(p), CX + dir * 240, 8, 18, col, p ? 'right' : 'left'); label(sh === p ? 'chuta' : 'para', CX + dir * 240, 31, 12, act ? '#fff' : '#cfd6ff', p ? 'right' : 'left');
      const ks = kicks[p], off = Math.max(0, ks.length - 5); for (let i = 0; i < 5; i++) { const v = ks[off + i], x = x0 + dir * (i * 19 + 8), y = 29; c.beginPath(); c.arc(x, y, 7.5, 0, R2); ART.fillOut(c, v === undefined ? 'rgba(255,255,255,.14)' : v ? '#5fd35f' : '#ff4d5e', 1.8);
        if (v === true) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3.5, y); c.lineTo(x - 1, y + 3); c.lineTo(x + 4, y - 3); c.stroke(); } else if (v === false) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3, y - 3); c.lineTo(x + 3, y + 3); c.moveTo(x + 3, y - 3); c.lineTo(x - 3, y + 3); c.stroke(); } } }
    // barra de fuerza (franja verde = tiro limpio; roja = se va alto)
    if ((state === 'aim' || state === 'run') && pwOn && k.st === 'play') { const bx = CX + 70, by = 250, bh = 90; ART.rr(c, bx - 2, by - 2, 22, bh + 4, 6); c.fillStyle = 'rgba(26,21,48,.8)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = 'rgba(95,211,95,.45)'; c.fillRect(bx + 2, by + bh * (1 - 0.8), 14, bh * 0.35); c.fillStyle = 'rgba(255,77,94,.45)'; c.fillRect(bx + 2, by, 14, bh * 0.2);
      const hh = bh * pw; c.fillStyle = pw > 0.85 ? '#ff4d5e' : pw > 0.45 ? '#5fd35f' : '#ffd166'; c.fillRect(bx + 4, by + bh - hh, 10, hh); label('Fuerza', bx + 9, by + bh + 4, 11, '#fff', 'center'); }
    if (state === 'aim' && !seats[sh].cpu && k.st === 'play' && !k.counting()) { const f = Math.max(0, 1 - aimT / AIM_MAX); c.fillStyle = 'rgba(26,21,48,.6)'; c.fillRect(CX - 100, 58, 200, 6); c.fillStyle = f < 0.3 ? '#ff4d5e' : k.pcol(sh); c.fillRect(CX - 100, 58, 200 * f, 6);
      if (!pwOn && aimT < 3 && kicks[0].length + kicks[1].length < 2) label(k.party ? 'Mantén dirección + A, suelta para chutar' : 'Flechas + mantén A (o desliza)', CX, 68, 14, '#fff', 'center'); }
  }
  /* Tirador de espaldas junto al balón (color del jugador): carrerilla y golpeo */
  function drawShooter() { const col = k.pcol(sh), run = state === 'run' ? 1 - runT / 0.3 : state === 'fly' || state === 'after' ? 1 : 0, kickA = state === 'fly' ? Math.min(1, ball.e * 3) : state === 'after' ? 1 : 0;
    const x = CX - 46 + run * 26, y = H - 4 - Math.abs(Math.sin(run * Math.PI * 2)) * 4 * (state === 'run' ? 1 : 0), s = 1.05;
    c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 0, 20, 5, 0, 0, R2); c.fill();
    c.lineCap = 'round'; const legs = [[-7, state === 'run' ? Math.sin(run * 12) * 6 : 0], [7, kickA ? -18 * kickA : state === 'run' ? -Math.sin(run * 12) * 6 : 0]];
    for (const [lx, sw] of legs) { c.strokeStyle = OUT; c.lineWidth = 11; c.beginPath(); c.moveTo(lx * 0.8, -34); c.lineTo(lx + sw, -4); c.stroke(); c.strokeStyle = '#f5c99a'; c.lineWidth = 7; c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.beginPath(); c.moveTo(lx + sw * 0.6, -14); c.lineTo(lx + sw, -5); c.stroke(); ART.rr(c, lx + sw - 6, -7, 12, 7, 3); ART.fillOut(c, '#1a1530', 1.5); }
    ART.rr(c, -14, -44, 28, 13, 4); ART.fillOut(c, '#1d2238', 2);
    for (const sd of [-1, 1]) { const sw = state === 'run' ? Math.sin(run * 12) * 10 * sd : 0; c.strokeStyle = OUT; c.lineWidth = 10; c.beginPath(); c.moveTo(sd * 14, -66); c.lineTo(sd * 20 + sw * 0.3, -44 + sw * 0.4); c.stroke(); c.strokeStyle = col; c.lineWidth = 6; c.stroke(); c.beginPath(); c.arc(sd * 20 + sw * 0.3, -42 + sw * 0.4, 4, 0, R2); ART.fillOut(c, '#f5c99a', 1.5); }
    ART.rr(c, -16, -72, 32, 32, 9); ART.fillOut(c, col, 2.5); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(-12, -69, 5, 24);
    c.fillStyle = '#fff'; c.font = '900 15px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = OUT; c.lineWidth = 3; c.strokeText(String(sh + 1) + '0', 0, -56); c.fillText(String(sh + 1) + '0', 0, -56);
    c.beginPath(); c.arc(0, -82, 11, 0, R2); ART.fillOut(c, '#5a3a22', 2.5); c.fillStyle = '#f5c99a'; c.beginPath(); c.arc(0, -75, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.fill();
    c.restore(); }
}
if (VS) vsMain();
