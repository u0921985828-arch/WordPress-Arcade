/* Penalty Flick con arte propio: desliza desde el balón hacia la portería. Largo = alto; un desliz curvo da efecto (engaña al portero).
 * Portero animado que adivina el lado y se estira hacia el balón (mejora con el nivel). Red que se deforma. Diana de escuadra = +3. 3 fallos y se acaba. */
const OUT = ART.OUT, R2 = 6.2832, W = 360, H = 640;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#2e8b3e' }), c = k.ctx;
const GX = 40, GY = 160, GW = 280, GH = 110, GL = GY + GH, SPOT = [180, 548], VP = [180, 120];
let ball, keeper, goals, pts, shots, misses, state, msg, msgT, msgC, level, target, path, net, cheer, kb, aimK, t = 0, bgCv;
function setup() { ball = { x: SPOT[0], y: SPOT[1] - 14, gy: SPOT[1], s: 1, e: 0, rot: 0, a: 1, h: 0 }; keeper = { x: 180, tx: 180, a: 0, ta: 0, dive: 0, delay: 0, dir: 0 }; state = 'aim'; path = [];
  target = level >= 2 ? { x: Math.random() < 0.5 ? GX + 34 : GX + GW - 34, y: GY + 30, r: 22 } : null; }
function reset() { goals = 0; pts = 0; shots = 0; misses = 0; level = 1; msg = ''; msgT = 0; cheer = 0; kb = false; aimK = { x: 180, y: 215 }; net = { a: 0, v: 0, x: 180, y: 220 }; setup(); }
/* ---------- Fondo cacheado: grada con público, vallas, césped en perspectiva y líneas ---------- */
function buildBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return v - Math.floor(v); };
  let gr = g.createLinearGradient(0, 0, 0, 130); gr.addColorStop(0, '#1b1840'); gr.addColorStop(1, '#3a2f6a'); g.fillStyle = gr; g.fillRect(0, 0, W, 130);
  for (let r = 0; r < 9; r++) { const y = 8 + r * 13; g.fillStyle = r % 2 ? '#2b2554' : '#322b60'; g.fillRect(0, y + 6, W, 7); for (let i = 0; i < 30; i++) { const x = i * 12.4 + (r % 2) * 6 + hr(i, r) * 3; g.fillStyle = ['#ff5f7a', '#f2d15c', '#5ce1e6', '#ffffff', '#7cf7a0', '#b98cff', '#ff9a3d'][Math.floor(hr(r, i) * 7)]; g.fillRect(x - 4, y + 4, 8, 7); g.fillStyle = ['#ffd1a3', '#e0a878', '#8a5a3b', '#f5c99a'][Math.floor(hr(i + 5, r) * 4)]; g.beginPath(); g.arc(x, y + 1, 3.6, 0, R2); g.fill(); } }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, W, 130);
  // vallas publicitarias
  const ads = [['ARCADE', '#6e62f5'], ['GOL', '#e0564a'], ['JUEGA', '#2a9e50'], ['PENALTI', '#f2b705']];
  for (let i = 0; i < 4; i++) { const x = i * 90; ART.rr(g, x + 2, 124, 86, 24, 3); ART.fillOut(g, ads[i][1], 2); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 4, 126, 82, 5); g.font = '900 13px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(ads[i][0], x + 45, 137); }
  // césped con franjas en perspectiva
  gr = g.createLinearGradient(0, 148, 0, H); gr.addColorStop(0, '#2f8f3f'); gr.addColorStop(1, '#3fae4c'); g.fillStyle = gr; g.fillRect(0, 148, W, H - 148);
  let y = 148, hgt = 10; for (let i = 0; y < H; i++) { if (i % 2) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, y, W, hgt); } y += hgt; hgt *= 1.22; }
  for (let i = 0; i < 1400; i++) { g.fillStyle = i % 2 ? 'rgba(0,50,0,.14)' : 'rgba(255,255,255,.07)'; const yy = 150 + hr(i, 3) * (H - 150); g.fillRect(hr(i, 7) * W, yy, 1.2, 1 + (yy - 150) / 160); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 148, W, 6);
  // líneas: gol, área pequeña, área grande, punto de penalti
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(0, GL); g.lineTo(W, GL); g.stroke();
  g.beginPath(); g.moveTo(GX - 30, GL); g.lineTo(GX - 44, GL + 44); g.lineTo(GX + GW + 44, GL + 44); g.lineTo(GX + GW + 30, GL); g.stroke();
  g.lineWidth = 3.5; g.beginPath(); g.moveTo(-40, GL); g.lineTo(-120, 640); g.moveTo(W + 40, GL); g.lineTo(W + 120, 640); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(SPOT[0], SPOT[1], 9, 4, 0, 0, R2); g.fill();
  // viñeta
  gr = g.createRadialGradient(W / 2, H * 0.55, 150, W / 2, H * 0.55, 420); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  bgCv = cv;
}
reset(); buildBg(); k.show(CFG.title, 'Desliza desde el balón hacia la portería: más largo = más alto, y un desliz curvo da efecto. Teclado: flechas para apuntar y A para chutar. Las dianas de escuadra valen +3. Fallas 3 y se acaba.');
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
    else { ball.vx = (ball.tx - 180) * 0.6; ball.vy = -120; ball.vh = 40; } }
  ball.res = kind;
}
k.run((dt) => {
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
  if (state === 'fly') { ball.e += dt * 2.3; const e = Math.min(1, ball.e), b = ball;
    b.x = b.from[0] + (b.tx - b.from[0]) * e + b.curve * (e * e * 0.5 + Math.sin(e * Math.PI) * 0.6); b.gy = b.from[1] + (GL + 2 - b.from[1]) * e;
    b.h = (GL - b.ty) * e + Math.sin(e * Math.PI) * 26; b.y = b.gy - 14 * (1 - e * 0.55) - Math.max(0, b.h); b.s = 1 - e * 0.55; b.rot += dt * 14;
    if (ball.e >= 1) { const bx = b.x, by = b.y, a = keeper.a, kx = keeper.x, p0 = [kx + Math.sin(a) * 12, GL - Math.cos(a) * 12], R = Math.min(115, 84 + level * 4), p1 = [kx + Math.sin(a) * R, GL - Math.cos(a) * R];
      const vx = p1[0] - p0[0], vy = p1[1] - p0[1], u = k.clamp(((bx - p0[0]) * vx + (by - p0[1]) * vy) / (vx * vx + vy * vy), 0, 1), dk = Math.hypot(bx - p0[0] - vx * u, by - p0[1] - vy * u);
      const post = (Math.abs(bx - GX) < 7 || Math.abs(bx - GX - GW) < 7) && by > GY - 6 && by < GL || Math.abs(by - GY) < 6 && bx > GX - 6 && bx < GX + GW + 6;
      const inGoal = bx > GX + 6 && bx < GX + GW - 6 && by > GY + 6 && by < GL;
      result(post ? 'post' : inGoal ? (dk < 20 * (keeper.dive > 0.5 ? 1 : 0.8) ? 'save' : 'goal') : 'miss'); } }
  else if (state === 'after') { const b = ball; b.rot += dt * 6;
    if (b.res === 'goal') { b.inNet = Math.min(1, b.inNet + dt * 3); if (b.inNet >= 1) { b.y = Math.min(GL - 12 - 3, b.y + 240 * dt); } else { b.x += (VP[0] - b.x) * dt * 0.8; b.y += (VP[1] - b.y) * dt * 0.8; b.s = Math.max(0.3, b.s - dt * 0.25); } }
    else { b.x += b.vx * dt; b.y += b.vy * dt - b.vh * dt; b.vh -= 400 * dt; b.s = b.res === 'miss' ? Math.max(0.2, b.s - dt * 0.3) : Math.min(1.1, b.s + dt * 0.25); if (b.res === 'miss') b.a = Math.max(0, b.a - dt * 1.2); }
    b.wait -= dt; if (b.wait <= 0) { if (misses >= 3) return k.lose(CFG.id, pts, 'Fin de la tanda', NREC(pts) + `${goals} goles de ${shots}`); setup(); } }
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
    c.strokeStyle = OUT; c.lineWidth = 11; c.beginPath(); c.moveTo(ax, ay); c.lineTo(hx, hy); c.stroke(); c.strokeStyle = '#ff9a3d'; c.lineWidth = 7; c.stroke();
    c.beginPath(); c.arc(hx, hy, 7.5, 0, R2); ART.fillOut(c, '#7cf7a0', 2); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(hx - 2, hy - 2, 2.5, 0, R2); c.fill(); }
  // camiseta
  ART.rr(c, -16, -66, 32, 32, 9); ART.fillOut(c, '#ff9a3d', 2.5); c.fillStyle = '#e06a1a'; c.fillRect(-15, -44, 30, 5); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(-11, -63, 5, 20);
  c.fillStyle = OUT; c.font = '900 12px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1', 0, -54);
  // cabeza
  c.beginPath(); c.arc(0, -77, 11, 0, R2); ART.fillOut(c, '#f5c99a', 2.5); c.fillStyle = '#5a3a22'; c.beginPath(); c.arc(0, -80, 11, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -77, 11, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  const look = state === 'aim' ? k.clamp((ball.x - 180) / 60, -1, 1) * 2 : kp.dir * 2; c.fillStyle = OUT; c.beginPath(); c.arc(-4 + look, -76, 1.8, 0, R2); c.arc(4 + look, -76, 1.8, 0, R2); c.fill();
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

/* ¿la puntuación supera el récord guardado? (se consulta antes de que k.lose/k.end lo actualicen) */
function NREC(s) { let b = 0; try { b = +localStorage.getItem('best:' + CFG.id) || 0; } catch (e) {} if (s > b && s > 0) { k.confetti(); return '¡Nuevo récord! · '; } return ''; }
