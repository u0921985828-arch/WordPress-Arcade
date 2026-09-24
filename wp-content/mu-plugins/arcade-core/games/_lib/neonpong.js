/* Neon Paddle: pong neón clásico de palas (tú a la izquierda, la IA a la derecha) a 7 puntos, contra una serie de rivales
 * cada vez más hábiles. El punto de impacto en la pala decide el ángulo; mover la pala al golpear da efecto (la bola curva)
 * y un golpe rápido es un remate. Mejoras en el centro para quien golpeó la bola: bola doble, pala larga, escudo.
 * En móvil vertical la pista se gira (tu pala abajo, la IA arriba); la lógica siempre usa coordenadas de pista 640×360. */
const OUT = ART.OUT, R2 = 6.2832, ID = CFG.id || 'neon-paddle';
const PORT = innerHeight > innerWidth, FW = 640, FH = 360, TOP = PORT ? 48 : 36;
const W = PORT ? FH : FW, H = PORT ? FW + TOP + 4 : FH + TOP, TO = 7;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#0a0b22' }), c = k.ctx;
const PX = 26, AX = FW - 26, PWID = 14, BR = 8;
const COL = { p: '#5ce1e6', a: '#ff5fa2' };
const RIVALS = [['Chispa', '#ff5fa2'], ['Voltio', '#ffb13d'], ['Prisma', '#b98cff'], ['Láser', '#7cf7a0'], ['Plasma', '#ff6b4a'], ['Quásar', '#ffe45c'], ['Nova', '#ff4dd2']];
const PU = { multi: 'Bola doble', long: 'Pala larga', shield: 'Escudo' };
let pad, balls, sp, sa, rival, score, serveT, serveDir, pu, puT, rings, trailT, endT, won, t, arenaCv, aiErr, aiAim, msg, msgT;

/* ---------- coordenadas: pista → pantalla ---------- */
const S = (x, y) => PORT ? [y, TOP + FW - x] : [x, y + TOP];
const F = (sx, sy) => PORT ? [TOP + FW - sy, sx] : [sx, sy - TOP];
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const rcol = () => RIVALS[(rival - 1) % RIVALS.length][1];
const rname = () => RIVALS[(rival - 1) % RIVALS.length][0] + (rival > RIVALS.length ? ' ' + (Math.floor((rival - 1) / RIVALS.length) + 1) : '');

/* ---------- pista cacheada (en coordenadas de pista) ---------- */
function renderArena() {
  COL.a = rcol();
  return off(FW, FH, (g) => {
    const gr = g.createLinearGradient(0, 0, FW, 0); gr.addColorStop(0, '#0d1838'); gr.addColorStop(0.5, '#120f33'); gr.addColorStop(1, '#241030'); g.fillStyle = gr; g.fillRect(0, 0, FW, FH);
    g.strokeStyle = 'rgba(110,98,245,.09)'; g.lineWidth = 1;
    for (let x = 0; x <= FW; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, FH); g.stroke(); }
    for (let y = 0; y <= FH; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(FW, y); g.stroke(); }
    // zonas de gol con brillo del color de cada lado
    for (const [x0, col, dir] of [[0, COL.p, 1], [FW, COL.a, -1]]) { const z = g.createLinearGradient(x0, 0, x0 + dir * 90, 0); z.addColorStop(0, col + '55'); z.addColorStop(1, col + '00'); g.fillStyle = z; g.fillRect(dir > 0 ? 0 : FW - 90, 0, 90, FH); }
    g.shadowBlur = 14; g.lineCap = 'round';
    g.shadowColor = '#8f86ff'; g.strokeStyle = 'rgba(190,185,255,.55)'; g.lineWidth = 3; g.setLineDash([14, 14]);
    g.beginPath(); g.moveTo(FW / 2, 12); g.lineTo(FW / 2, FH - 12); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.arc(FW / 2, FH / 2, 54, 0, R2); g.stroke();
    for (const [x, col] of [[3, COL.p], [FW - 3, COL.a]]) { g.shadowColor = col; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 10); g.lineTo(x, FH - 10); g.stroke(); }
    g.shadowBlur = 0;
    // bandas laterales con relieve y contorno
    for (const y of [0, FH - 8]) { ART.rr(g, -4, y - 2, FW + 8, 10, 4); ART.fillOut(g, '#2a2466', 2); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y + 1, FW, 2); }
  });
}

/* ---------- estado ---------- */
function newPad(side) { return { y: FH / 2, vy: 0, h: 70, th: 70, longT: 0, shield: false, hitT: 0, side }; }
function serve() { balls = []; serveT = 0.9; }
function launch() {
  const a = k.rnd(-0.45, 0.45), v = 200 + Math.min(rival - 1, 12) * 11; // 1.23: más fácil (250→200)
  balls.push({ x: FW / 2, y: FH / 2 + k.rnd(-40, 40), vx: Math.cos(a) * v * serveDir, vy: Math.sin(a) * v, spin: 0, last: null, trail: [], rot: 0, smash: 0 });
  k.sfx('jump');
}
function reset() {
  if (won) { rival++; won = false; } else { rival = 1; score = 0; }
  pad = { p: newPad('p'), a: newPad('a') }; sp = sa = 0; pu = null; puT = 6; rings = []; endT = 0; t = 0; msgT = 0; aiErr = 0; aiAim = 0;
  serveDir = -1; arenaCv = renderArena(); serve();
}

/* ---------- mejoras ---------- */
function grant(side, kind) {
  const p = pad[side], [sx, sy] = S(pu.x, pu.y);
  k.burst(sx, sy, COL[side], 18, 170); k.sfx(side === 'p' ? 'coin' : 'hit');
  if (kind === 'long') { p.longT = 9; p.th = 112; }
  else if (kind === 'shield') p.shield = true;
  else { const b = balls[0]; if (b) balls.push({ ...b, vy: -b.vy || 120, trail: [], spin: -b.spin }); }
  msg = (side === 'p' ? '' : rname() + ': ') + PU[kind]; msgT = 1.6;
  pu = null; puT = k.rnd(7, 11);
}

/* ---------- IA ---------- */
const LV = () => Math.min(9, 1 + (rival - 1) * 0.67); // 1.23: la IA sube de nivel más despacio
function aiTarget() {
  let best = null, bt = 1e9;
  for (const b of balls) if (b.vx > 0) { const tt = (AX - PWID / 2 - BR - b.x) / b.vx; if (tt < bt) { bt = tt; best = b; } }
  if (!best) return FH / 2 + Math.sin(t * 0.8) * 20;
  const L = LV();
  if (best.x < FW * Math.max(0.12, 0.62 - L * 0.055)) return pad.a.y + (FH / 2 - pad.a.y) * 0.02;
  // predicción con rebotes (sin efecto) + error que baja con el nivel + apuntar con el borde en niveles altos
  const span = FH - 2 * BR; let yy = best.y + best.vy * bt - BR; yy = ((yy % (2 * span)) + 2 * span) % (2 * span); if (yy > span) yy = 2 * span - yy;
  return yy + BR + aiErr + aiAim * pad.a.h * 0.32;
}
function rollAI() { const L = LV(); aiErr = k.rnd(-1, 1) * Math.max(14, 100 - L * 9); aiAim = L >= 3 ? (pad.p.y < FH / 2 ? -1 : 1) * k.rnd(0.3, 1) : 0; }

/* ---------- física ---------- */
function hitPad(b, p, px, dir) {
  const plane = px + dir * (PWID / 2 + BR), prevX = b.x - b.vx * (1 / 60);
  if (!(dir > 0 ? b.vx < 0 && b.x <= plane && prevX >= plane - 30 : b.vx > 0 && b.x >= plane && prevX <= plane + 30)) return;
  if (Math.abs(b.y - p.y) > p.h / 2 + BR) return;
  const o = k.clamp((b.y - p.y) / (p.h / 2), -1, 1), spd = Math.hypot(b.vx, b.vy), smash = Math.abs(p.vy) > 650;
  const nv = Math.min(510 + Math.min(rival - 1, 12) * 22, spd * 1.045 + (smash ? 90 : 0)), a = o * 1.0;
  b.vx = Math.cos(a) * nv * dir; b.vy = Math.sin(a) * nv; b.x = plane; b.last = p.side;
  b.spin = k.clamp(p.vy / 1500, -0.7, 0.7); b.smash = smash ? 1 : 0; p.hitT = 0.18;
  const [sx, sy] = S(b.x, b.y); k.burst(sx, sy, COL[p.side], smash ? 16 : 8, smash ? 220 : 120);
  rings.push({ x: b.x, y: b.y, r: 6, a: 1, col: COL[p.side] });
  k.sfx(smash ? 'shoot' : 'click'); if (smash) { k.shake(4); k.float('¡Remate!', sx, sy - 20, COL[p.side]); }
  if (p.side === 'p') rollAI();
}
function goal(b, scorer) {
  const [sx, sy] = S(scorer === 'p' ? FW - 4 : 4, b.y);
  if (scorer === 'p') { sp++; score += 10; k.sfx('coin'); k.float('¡Punto!', PORT ? W / 2 : sx - 60, PORT ? sy + 40 : sy, COL.p); }
  else { sa++; k.sfx('hurt'); }
  k.shake(10); k.flash(scorer === 'p' ? 'rgba(92,225,230,.25)' : 'rgba(255,80,140,.25)');
  k.burst(sx, sy, COL[scorer], 30, 260); k.burst(sx, sy, '#fff', 12, 180);
  for (let i = 0; i < 3; i++) rings.push({ x: scorer === 'p' ? FW : 0, y: b.y, r: 8 + i * 18, a: 1, col: COL[scorer], big: 1 });
  serveDir = scorer === 'p' ? 1 : -1;
  if (sp >= TO || sa >= TO) endT = 1.1;
}
function update(dt) {
  t += dt; msgT = Math.max(0, msgT - dt);
  for (const r of rings) { r.r += (r.big ? 260 : 120) * dt; r.a -= dt * (r.big ? 1.3 : 2.5); } rings = rings.filter((r) => r.a > 0);
  if (endT > 0) {
    endT -= dt;
    if (endT <= 0) {
      if (sp >= TO) { won = true; score += 100; k.st = 'over'; k.best(ID, score); k.show('¡Ganaste!', `${sp} – ${sa} contra ${rname()} · Puntos: ${score} · Siguiente: Rival ${rival + 1}<br>Toca para seguir`); }
      else k.lose(ID, score, 'Perdiste', `${sp} – ${sa} contra ${rname()} · Rival ${rival}`);
    }
    return;
  }
  // tu pala: arrastrar (sigue al dedo) o teclas
  const P = pad.p, oy = P.y;
  if (k.ptr.down) { const [, fy] = F(k.ptr.x, k.ptr.y); P.y += (fy - P.y) * Math.min(1, dt * 22); }
  const kd = (k.held.has('down') || (PORT && k.held.has('right')) ? 1 : 0) - (k.held.has('up') || (PORT && k.held.has('left')) ? 1 : 0);
  P.y += kd * 440 * dt;
  // IA
  const A = pad.a, ay = A.y, L = LV(), aiSp = Math.min(610, 160 + L * 50), tgt = aiTarget();
  A.y += k.clamp(tgt - A.y, -aiSp * dt, aiSp * dt);
  for (const p of [P, A]) {
    p.y = k.clamp(p.y, p.h / 2 + 8, FH - p.h / 2 - 8); p.vy = (p.y - (p === P ? oy : ay)) / Math.max(dt, 0.001);
    if (p.longT > 0 && (p.longT -= dt) <= 0) p.th = 70;
    p.h += (p.th - p.h) * Math.min(1, dt * 8); p.hitT = Math.max(0, p.hitT - dt);
  }
  // saque
  if (!balls.length) { serveT -= dt; if (serveT <= 0) launch(); }
  // mejoras
  if (!pu && (puT -= dt) <= 0) pu = { x: FW / 2 + k.rnd(-70, 70), y: k.rnd(60, FH - 60), vy: k.pick([-40, 40]), kind: k.pick(Object.keys(PU)), life: 9, pop: 0 };
  if (pu) { pu.pop = Math.min(1, pu.pop + dt * 3); pu.y += pu.vy * dt; if (pu.y < 40 || pu.y > FH - 40) pu.vy *= -1; if ((pu.life -= dt) <= 0) { pu = null; puT = 6; } }
  // bolas
  for (const b of balls) {
    b.vy += b.spin * 900 * dt; b.spin *= 1 - 1.4 * dt; b.smash = Math.max(0, b.smash - dt * 0.8);
    if (Math.abs(b.vy) > Math.abs(b.vx) * 1.7) b.vy = Math.sign(b.vy) * Math.abs(b.vx) * 1.7;
    b.x += b.vx * dt; b.y += b.vy * dt; b.rot += (b.spin * 12 + 2) * dt;
    if (b.y < BR + 8) { b.y = BR + 8; b.vy = Math.abs(b.vy); b.spin *= -0.5; k.sfx('click'); rings.push({ x: b.x, y: 8, r: 4, a: 0.7, col: '#bdb8ff' }); }
    if (b.y > FH - BR - 8) { b.y = FH - BR - 8; b.vy = -Math.abs(b.vy); b.spin *= -0.5; k.sfx('click'); rings.push({ x: b.x, y: FH - 8, r: 4, a: 0.7, col: '#bdb8ff' }); }
    hitPad(b, P, PX, 1); hitPad(b, A, AX, -1);
    // escudos
    if (b.x < BR + 6 && b.vx < 0 && P.shield) { P.shield = false; b.vx = Math.abs(b.vx); b.x = BR + 6; k.sfx('hit'); const [sx, sy] = S(4, b.y); k.burst(sx, sy, COL.p, 20, 200); }
    if (b.x > FW - BR - 6 && b.vx > 0 && A.shield) { A.shield = false; b.vx = -Math.abs(b.vx); b.x = FW - BR - 6; k.sfx('hit'); const [sx, sy] = S(FW - 4, b.y); k.burst(sx, sy, COL.a, 20, 200); }
    if (pu && b.last && Math.hypot(b.x - pu.x, b.y - pu.y) < BR + 16) grant(b.last, pu.kind);
    b.trail.push([b.x, b.y]); if (b.trail.length > 14) b.trail.shift();
    if (b.x < -14) { b.dead = true; goal(b, 'a'); } else if (b.x > FW + 14) { b.dead = true; goal(b, 'p'); }
  }
  balls = balls.filter((b) => !b.dead);
  if (!balls.length && serveT <= 0 && !endT) serve();
}

/* ---------- dibujo ---------- */
function paddle(p, x) {
  const h = p.h, col = COL[p.side], bump = p.hitT > 0 ? (p.side === 'p' ? -1 : 1) * p.hitT * 14 : 0, px = x + bump;
  c.globalAlpha = 0.22 + (p.hitT > 0 ? 0.3 : 0); c.fillStyle = col; ART.rr(c, px - 13, p.y - h / 2 - 6, 26, h + 12, 13); c.fill(); c.globalAlpha = 1;
  ART.rr(c, px - PWID / 2, p.y - h / 2, PWID, h, 7); ART.fillOut(c, col, 2.5);
  c.fillStyle = 'rgba(255,255,255,.75)'; ART.rr(c, px - 2, p.y - h / 2 + 6, 4, h - 12, 2); c.fill();
  c.fillStyle = 'rgba(26,21,48,.35)'; ART.rr(c, px + (p.side === 'p' ? 2 : -6), p.y - h / 2 + 5, 4, h - 10, 2); c.fill();
  if (p.shield) { const sx = p.side === 'p' ? 5 : FW - 5; c.globalAlpha = 0.55 + Math.sin(t * 8) * 0.2; c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx, 14); c.lineTo(sx, FH - 14); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1; }
}
function puIcon(kind, x, y, s, col) {
  c.save(); c.translate(x, y); c.scale(s, s); if (PORT) c.rotate(Math.PI / 2);
  c.fillStyle = col;
  if (kind === 'multi') { for (const dx of [-5, 5]) { c.beginPath(); c.arc(dx, 0, 4.2, 0, R2); ART.fillOut(c, '#fff', 1.6); } }
  else if (kind === 'long') { ART.rr(c, -3, -9, 6, 18, 3); ART.fillOut(c, '#fff', 1.6); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-7, -7); c.lineTo(-7, 7); c.moveTo(7, -7); c.lineTo(7, 7); c.stroke(); }
  else { c.beginPath(); c.moveTo(0, -9); c.lineTo(8, -5); c.lineTo(7, 3); c.quadraticCurveTo(4, 8, 0, 10); c.quadraticCurveTo(-4, 8, -7, 3); c.lineTo(-8, -5); c.closePath(); ART.fillOut(c, '#fff', 1.6); }
  c.restore();
}
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function draw() {
  c.fillStyle = '#0a0b22'; c.fillRect(0, 0, W, H);
  // marcadores grandes y tenues dentro de la pista (en pantalla, sin girar)
  c.save(); if (PORT) { c.translate(0, TOP + FW); c.rotate(-Math.PI / 2); } else c.translate(0, TOP);
  c.drawImage(arenaCv, 0, 0, FW, FH);
  c.restore();
  c.globalAlpha = 0.28; c.font = '800 64px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (PORT) { c.fillStyle = COL.a; c.fillText(sa, W / 2, TOP + FW / 2 - 60); c.fillStyle = COL.p; c.fillText(sp, W / 2, TOP + FW / 2 + 62); }
  else { c.fillStyle = COL.p; c.fillText(sp, FW / 2 - 70, TOP + FH / 2); c.fillStyle = COL.a; c.fillText(sa, FW / 2 + 70, TOP + FH / 2); }
  c.globalAlpha = 1;
  c.save(); if (PORT) { c.translate(0, TOP + FW); c.rotate(-Math.PI / 2); } else c.translate(0, TOP);
  for (const r of rings) { c.globalAlpha = Math.max(0, r.a); c.strokeStyle = r.col; c.lineWidth = r.big ? 5 : 3; c.beginPath(); c.arc(r.x, r.y, r.r, 0, R2); c.stroke(); }
  c.globalAlpha = 1;
  if (pu) {
    const s = pu.pop < 1 ? Math.sin(pu.pop * 2.1) * 1.15 : 1 + Math.sin(t * 5) * 0.06, blink = pu.life < 2 && Math.floor(pu.life * 8) % 2;
    if (!blink) {
      c.save(); c.translate(pu.x, pu.y); c.scale(s, s); c.rotate(Math.sin(t * 2) * 0.15);
      c.globalAlpha = 0.25; c.fillStyle = '#6e62f5'; c.beginPath(); c.arc(0, 0, 24, 0, R2); c.fill(); c.globalAlpha = 1;
      c.beginPath(); c.arc(0, 0, 16, 0, R2); ART.fillOut(c, '#6e62f5', 2.5); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.arc(-4, -6, 6, 0, R2); c.fill();
      c.restore(); puIcon(pu.kind, pu.x, pu.y, s * 0.95, '#fff');
    }
  }
  paddle(pad.p, PX); paddle(pad.a, AX);
  if (!balls.length && k.st === 'play' && !endT) { const a = 0.4 + Math.abs(Math.sin(t * 8)) * 0.6; c.globalAlpha = a; c.beginPath(); c.arc(FW / 2, FH / 2, BR, 0, R2); ART.fillOut(c, '#fff', 2.5); c.globalAlpha = 1; }
  for (const b of balls) {
    const col = b.last ? COL[b.last] : '#d9d6ff';
    b.trail.forEach(([x, y], i) => { const f = i / b.trail.length; c.globalAlpha = f * (b.smash ? 0.7 : 0.4); c.fillStyle = b.smash ? '#ffb347' : col; c.beginPath(); c.arc(x, y, BR * (0.3 + f * 0.7), 0, R2); c.fill(); });
    c.globalAlpha = 0.3; c.fillStyle = col; c.beginPath(); c.arc(b.x, b.y, BR + 6, 0, R2); c.fill(); c.globalAlpha = 1;
    c.beginPath(); c.arc(b.x, b.y, BR, 0, R2); ART.fillOut(c, '#fff', 2.5);
    c.save(); c.translate(b.x, b.y); c.rotate(b.rot); c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, BR - 3, -0.9, 0.9); c.stroke(); c.restore();
  }
  c.restore();
  // franja superior: tú / rival (centro libre para pausa y sonido)
  const y0 = PORT ? 12 : 8;
  label(PORT ? 'Tú' : `Tú ${sp}`, 12, y0, PORT ? 17 : 18, COL.p);
  label(PORT ? rname() : `${sa} ${rname()}`, W - 12, y0, PORT ? 17 : 18, COL.a, 'right');
  label(`Rival ${rival} · a ${TO}`, W - 12, y0 + (PORT ? 20 : 20), 11, 'rgba(255,255,255,.7)', 'right');
  if (PORT) label(`${sp} – ${sa}`, 12, y0 + 20, 11, 'rgba(255,255,255,.7)');
  for (const [p, x0, al] of [[pad.p, 12, 'left'], [pad.a, W - 12, 'right']]) if (p.longT > 0 && !PORT) { label(`Pala larga ${Math.ceil(p.longT)}`, x0 + (al === 'left' ? 64 : -110), y0 + 4, 10, COL[p.side], al); }
  if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); const [mx, my] = PORT ? [W / 2, TOP + FW / 2] : [W / 2, TOP + FH - 44]; c.font = '800 16px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(msg).width + 28; ART.rr(c, mx - mw / 2, my - 15, mw, 30, 10); c.fillStyle = 'rgba(26,21,48,.85)'; c.fill(); label(msg, mx, my - 8, 16, '#fff', 'center'); c.globalAlpha = 1; }
}

won = false; reset();
k.show(CFG.title || 'Neon Paddle', 'Arrastra el dedo o usa las flechas para mover tu pala. Golpea con el borde para abrir el ángulo y mueve la pala al golpear para dar efecto. Toca las mejoras con la bola. Gana el primero a 7.<br>Toca para empezar');
k.run((dt) => { if (!k.gate(reset)) { t += dt; return; } update(dt); }, draw);
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
