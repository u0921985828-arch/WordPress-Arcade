/* Paddle en vertical. CFG.mode: 'hockey' (Air Hockey a 7, mazo libre) | 'pong' (Ping Pong Reflex a 11 con 2 de diferencia)
 * Mesa cacheada con relieve, mazos/raquetas con brillo, disco con estela, pelota con altura y sombra, saque alterno en ping pong. */
const M = CFG.mode, HK = M === 'hockey', OUT = ART.OUT, R2 = 6.2832;
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: HK ? '#1c2447' : '#10263f' }), c = k.ctx;
const GOAL = 110, TO = 7, RAIL = 12, TX0 = 24, TX1 = 336, NETY = 320, PYME = 580, PYAI = 60;
let me, ai, puck, sMe, sAi, serveT, rally, trail, goalT, goalMe, tm, bounceMk, server;
function serverIsMe() { const tot = sMe + sAi; return (sMe >= 10 && sAi >= 10 ? tot : Math.floor(tot / 2)) % 2 === 0; }
function serve(dir) {
  trail = []; rally = 0; bounceMk = null;
  if (HK) { puck = { x: 180, y: 320, vx: k.rnd(-120, 120), vy: dir * 60, r: 16, bz: 0 }; serveT = 1; return; }
  server = serverIsMe(); const d = server ? -1 : 1, p = server ? me : ai; // la pelota sale de la raqueta de quien saca
  puck = { x: p.x, y: server ? PYME - 14 : PYAI + 14, vx: k.rnd(-90, 90), vy: d * 300, r: 9, from: server ? PYME : PYAI, bounced: false }; serveT = 0.9;
}
function reset() { me = { x: 180, y: HK ? 560 : PYME, px: 180, py: 560, r: HK ? 28 : 0, w: 80 }; ai = { x: 180, y: HK ? 80 : PYAI, px: 180, py: 80, r: HK ? 28 : 0, w: 80 }; sMe = 0; sAi = 0; tm = 0; goalT = 0; serve(1); }
reset(); k.show(CFG.title, HK ? 'Mueve tu mazo con el dedo (o flechas) y marca en la portería de arriba. Gana quien llegue a 7.' : 'Mueve la raqueta con el dedo (o flechas). Golpea en movimiento para dar efecto. Partido a 11 puntos con 2 de diferencia; el saque cambia cada 2 puntos.');
function goal(forMe) {
  if (forMe) sMe++; else sAi++; goalT = 1.3; goalMe = forMe;
  k.burst(puck.x, k.clamp(puck.y, 10, 630), forMe ? '#7cf7a0' : '#ff5f5f', 26, 220); k.sfx(forMe ? 'coin' : 'hurt'); k.shake(forMe ? 4 : 7); if (!forMe) k.flash('rgba(255,70,90,.25)');
  const TGT = HK ? TO : 11, fin = (sMe >= TGT || sAi >= TGT) && (HK || Math.abs(sMe - sAi) >= 2);
  if (fin) { k.st = 'over'; k.best(CFG.id, sMe > sAi ? sMe - sAi : 0); k.show(sMe > sAi ? '¡Ganaste!' : 'Perdiste', `${sMe} – ${sAi}<br>Toca para la revancha`); if (sMe < sAi) k.sfx('lose'); return; }
  if (!HK) { if (sMe >= 10 && sAi >= 10 && sMe === sAi) k.float('Iguales', 180, 360, '#fff27a'); else if (Math.max(sMe, sAi) >= 10 && Math.abs(sMe - sAi) >= 1) k.float(sMe > sAi ? 'Punto de partido' : 'Punto de partido CPU', 180, 360, '#fff27a'); }
  serve(forMe ? -1 : 1);
}

/* ---------- mesas cacheadas */
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const TABLE = off(360, 640, (g) => {
  if (HK) {
    g.fillStyle = '#1c2447'; g.fillRect(0, 0, 360, 640);
    ART.rr(g, 2, 2, 356, 636, 26); ART.fillOut(g, '#2d3a78', 3); ART.rr(g, 5, 5, 350, 630, 23); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.stroke();
    ART.rr(g, RAIL, RAIL, 360 - RAIL * 2, 640 - RAIL * 2, 16); const sg = g.createLinearGradient(0, 0, 360, 640); sg.addColorStop(0, '#f4fbff'); sg.addColorStop(0.5, '#dcecf7'); sg.addColorStop(1, '#eef7ff'); g.fillStyle = sg; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
    g.save(); ART.rr(g, RAIL, RAIL, 360 - RAIL * 2, 640 - RAIL * 2, 16); g.clip();
    g.fillStyle = 'rgba(60,90,130,.22)'; for (let y = 26; y < 630; y += 18) for (let x = 24 + ((y / 18) % 2) * 9; x < 340; x += 18) g.fillRect(x, y, 1.6, 1.6);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(RAIL, 120); g.lineTo(140, RAIL); g.lineTo(200, RAIL); g.lineTo(RAIL, 220); g.fill();
    g.strokeStyle = '#e24b5b'; g.lineWidth = 4; g.beginPath(); g.moveTo(RAIL, 320); g.lineTo(348, 320); g.stroke(); g.beginPath(); g.arc(180, 320, 52, 0, R2); g.stroke(); g.fillStyle = '#e24b5b'; g.beginPath(); g.arc(180, 320, 7, 0, R2); g.fill();
    g.strokeStyle = '#3a7bd5'; g.lineWidth = 4; g.beginPath(); g.moveTo(RAIL, 190); g.lineTo(348, 190); g.moveTo(RAIL, 450); g.lineTo(348, 450); g.stroke();
    for (const [y, a0] of [[RAIL, 0], [628, Math.PI]]) { g.fillStyle = 'rgba(58,123,213,.18)'; g.beginPath(); g.arc(180, y, 72, a0, a0 + Math.PI); g.fill(); g.strokeStyle = '#3a7bd5'; g.lineWidth = 3; g.stroke(); }
    for (const [x, y] of [[90, 110], [270, 110], [90, 530], [270, 530]]) { g.strokeStyle = 'rgba(226,75,91,.6)'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 26, 0, R2); g.stroke(); g.fillStyle = '#e24b5b'; g.beginPath(); g.arc(x, y, 4, 0, R2); g.fill(); }
    g.restore();
    // porterías (ranuras en la baranda)
    for (const y of [0, 640 - RAIL - 4]) { ART.rr(g, 180 - GOAL / 2, y, GOAL, RAIL + 4, 5); g.fillStyle = '#0b0a18'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(180 - GOAL / 2 + 6, y + (y ? RAIL : 3), GOAL - 12, 2); }
    for (const x of [180 - GOAL / 2, 180 + GOAL / 2]) for (const y of [RAIL, 628]) { g.beginPath(); g.arc(x, y, 5, 0, R2); ART.fillOut(g, '#f2d15c', 2); }
  } else {
    let gr = g.createRadialGradient(180, 320, 60, 180, 320, 420); gr.addColorStop(0, '#244c78'); gr.addColorStop(1, '#0c1d33'); g.fillStyle = gr; g.fillRect(0, 0, 360, 640);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; for (let x = 0; x < 360; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 640); g.stroke(); }
    // patas y sombra de la mesa
    g.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(g, TX0 + 8, 52, TX1 - TX0, 556, 8); g.fill();
    ART.rr(g, TX0, 44, TX1 - TX0, 552, 6); g.fillStyle = '#1b62a8'; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    gr = g.createLinearGradient(0, 44, 0, 596); gr.addColorStop(0, 'rgba(255,255,255,.08)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.12)'); g.fillStyle = gr; g.fillRect(TX0 + 2, 46, TX1 - TX0 - 4, 548);
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(TX0 + 5, 49, TX1 - TX0 - 10, 542); g.lineWidth = 2; g.beginPath(); g.moveTo(180, 51); g.lineTo(180, 589); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(TX0 + 3, 596, TX1 - TX0 - 6, 6);
    // sombra de la red
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(TX0, NETY + 4, TX1 - TX0, 10);
  }
});
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function mallet(m, col, dark) {
  c.fillStyle = 'rgba(20,30,60,.25)'; c.beginPath(); c.ellipse(m.x + 4, m.y + 6, m.r, m.r * 0.9, 0, 0, R2); c.fill();
  c.beginPath(); c.arc(m.x, m.y + 3, m.r, 0, R2); ART.fillOut(c, dark, 3);
  c.beginPath(); c.arc(m.x, m.y, m.r - 1, 0, R2); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
  c.beginPath(); c.arc(m.x, m.y, m.r * 0.72, 0, R2); c.lineWidth = 3; c.strokeStyle = dark; c.stroke();
  c.beginPath(); c.arc(m.x, m.y - 2, m.r * 0.42, 0, R2); ART.fillOut(c, col, 2.5); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(m.x - m.r * 0.14, m.y - m.r * 0.22, m.r * 0.16, m.r * 0.1, -0.5, 0, R2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 3; c.beginPath(); c.arc(m.x, m.y, m.r * 0.86, 3.6, 4.6); c.stroke();
}
function racket(p, y, dir, col) {
  const tilt = k.clamp((p.x - p.px) * 0.02, -0.4, 0.4), bw = p.w / 2 - 5, bh = 21;
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(p.x + 6, y + 8, bw, bh, tilt, 0, R2); c.fill();
  c.save(); c.translate(p.x, y); c.rotate(tilt);
  ART.rr(c, -6, dir > 0 ? 14 : -40, 12, 26, 4); ART.fillOut(c, '#c98a4b', 2.5); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-6, dir > 0 ? 26 : -28, 12, 3);
  c.beginPath(); c.ellipse(0, 0, bw, bh, 0, 0, R2); ART.fillOut(c, '#e8c89a', 3); c.beginPath(); c.ellipse(0, 0, bw - 3, bh - 3, 0, 0, R2); c.fillStyle = col; c.fill();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-bw * 0.3, -bh * 0.45, bw * 0.35, 3.5, -0.2, 0, R2); c.fill(); c.restore();
}
function ballH() { if (!puck || puck.from === undefined) return 0; const tot = Math.abs(PYME - PYAI), p = k.clamp(Math.abs(puck.y - puck.from) / tot, 0, 1.2); return p < 0.72 ? Math.sin(Math.PI * p / 0.72) * 34 : Math.sin(Math.PI * Math.min(1, (p - 0.72) / 0.56)) * 20; }

k.run((dt) => {
  tm += dt; goalT -= dt; if (bounceMk) { bounceMk.t -= dt; if (bounceMk.t <= 0) bounceMk = null; }
  if (!k.gate(reset)) return;
  const lvl = 0.55 + (sMe + sAi) * 0.03;
  me.px = me.x; me.py = me.y; ai.px = ai.x; ai.py = ai.y;
  if (k.ptr.down) { me.x += (k.ptr.x - me.x) * Math.min(1, dt * 25); if (HK) me.y += (k.ptr.y - me.y) * Math.min(1, dt * 25); }
  if (k.held.has('left')) me.x -= 400 * dt; if (k.held.has('right')) me.x += 400 * dt; if (HK) { if (k.held.has('up')) me.y -= 400 * dt; if (k.held.has('down')) me.y += 400 * dt; }
  me.x = k.clamp(me.x, HK ? RAIL + me.r : TX0 + 16, 360 - (HK ? RAIL + me.r : TX0 + 16)); me.y = HK ? k.clamp(me.y, 320 + me.r * 0.7, 628 - me.r) : PYME;
  // IA
  const tx = puck.vy < 0 || !HK ? puck.x : 180, ty = HK ? (puck.y < 320 && puck.vy < 80 ? puck.y - 20 : 90) : PYAI;
  const sp = (HK ? 330 : 280) * lvl; ai.x += k.clamp(tx - ai.x, -sp * dt, sp * dt); ai.y += k.clamp(ty - ai.y, -sp * dt, sp * dt);
  ai.x = k.clamp(ai.x, HK ? RAIL + ai.r : TX0 + 16, 360 - (HK ? RAIL + ai.r : TX0 + 16)); ai.y = HK ? k.clamp(ai.y, RAIL + ai.r, 300) : PYAI;
  if (serveT > 0) { serveT -= dt; if (!HK) { const p = server ? me : ai; puck.x = p.x; } return; }
  const steps = 4, h = dt / steps, WX0 = HK ? RAIL : TX0, WX1 = HK ? 360 - RAIL : TX1;
  for (let s = 0; s < steps; s++) { puck.x += puck.vx * h; puck.y += puck.vy * h; if (HK) { puck.vx *= 1 - 0.25 * h; puck.vy *= 1 - 0.25 * h; }
    if (puck.x < WX0 + puck.r || puck.x > WX1 - puck.r) { puck.vx *= -1; puck.x = k.clamp(puck.x, WX0 + puck.r, WX1 - puck.r); if (HK) { puck.bz = 0.15; k.sfx('click'); } }
    if (HK) { const inGoal = Math.abs(puck.x - 180) < GOAL / 2 - 4;
      if (puck.y < RAIL + puck.r) { if (inGoal) return goal(true); puck.vy = Math.abs(puck.vy); puck.y = RAIL + puck.r; k.sfx('click'); }
      if (puck.y > 628 - puck.r) { if (inGoal) return goal(false); puck.vy = -Math.abs(puck.vy); puck.y = 628 - puck.r; k.sfx('click'); }
      for (const m of [me, ai]) { const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy); if (d < m.r + puck.r && d > 0) { const nx = dx / d, ny = dy / d; puck.x = m.x + nx * (m.r + puck.r); puck.y = m.y + ny * (m.r + puck.r); const mvx = (m.x - m.px) / dt, mvy = (m.y - m.py) / dt; const rv = (puck.vx - mvx) * nx + (puck.vy - mvy) * ny;
        if (rv < 0) { puck.vx -= 1.9 * rv * nx; puck.vy -= 1.9 * rv * ny; k.sfx('hit'); puck.bz = 0.2; if (-rv > 500) k.burst(puck.x - nx * puck.r, puck.y - ny * puck.r, '#fff', 6, 120); }
        const spd = Math.hypot(puck.vx, puck.vy); if (spd > 900) { puck.vx *= 900 / spd; puck.vy *= 900 / spd; } } } }
    else { for (const [p, dir] of [[me, -1], [ai, 1]]) { const py = p === me ? PYME : PYAI; if (Math.sign(puck.vy) === -dir && Math.abs(puck.y - py) < 10 && Math.abs(puck.x - p.x) < p.w / 2 + puck.r) { rally++; k.sfx('hit'); const spd = Math.min(820, Math.hypot(puck.vx, puck.vy) * 1.05); const off = (puck.x - p.x) / (p.w / 2), spin = (p.x - p.px) / dt * 0.25; puck.vx = off * spd * 0.7 + spin; puck.vy = dir * Math.sqrt(Math.max(1, spd * spd - puck.vx * puck.vx * 0.5)); puck.y = py + dir * 11; puck.from = py; puck.bounced = false; k.burst(puck.x, py, '#fff', 5, 90); if (rally > 0 && rally % 10 === 0) k.float(`Rally ${rally}`, 180, 360, '#fff27a'); } }
      const tot = Math.abs(PYME - PYAI); if (!puck.bounced && Math.abs(puck.y - puck.from) / tot > 0.72) { puck.bounced = true; bounceMk = { x: puck.x, y: puck.y, t: 0.35 }; k.sfx('click'); }
      if (puck.y < 0) return goal(true); if (puck.y > 640) return goal(false); } }
  if (puck.bz) puck.bz = Math.max(0, puck.bz - dt);
  trail.push([puck.x, puck.y]); if (trail.length > 10) trail.shift();
}, () => {
  c.drawImage(TABLE, 0, 0, 360, 640);
  if (HK) {
    // luz de gol en la portería
    if (goalT > 0) { c.globalAlpha = Math.min(1, goalT) * (0.5 + 0.5 * Math.sin(tm * 20)); c.fillStyle = goalMe ? '#7cf7a0' : '#ff5f5f'; ART.rr(c, 180 - GOAL / 2 - 6, goalMe ? 0 : 624, GOAL + 12, 16, 6); c.fill(); c.globalAlpha = 1; }
    // estela y disco
    const spd = Math.hypot(puck.vx, puck.vy); if (spd > 260) trail.forEach(([x, y], i) => { c.globalAlpha = i / trail.length * 0.25 * Math.min(1, (spd - 260) / 300); c.fillStyle = '#f2c230'; c.beginPath(); c.arc(x, y, puck.r * (0.5 + i / trail.length * 0.5), 0, R2); c.fill(); }); c.globalAlpha = 1;
    const pb = 1 + (puck.bz || 0) * 0.6, pr = puck.r * pb, blink = serveT > 0 && Math.sin(tm * 18) > 0;
    c.fillStyle = 'rgba(20,30,60,.25)'; c.beginPath(); c.ellipse(puck.x + 3, puck.y + 5, pr, pr * 0.9, 0, 0, R2); c.fill();
    c.beginPath(); c.arc(puck.x, puck.y + 3, pr, 0, R2); ART.fillOut(c, '#b8860f', 2.5); c.beginPath(); c.arc(puck.x, puck.y, pr, 0, R2); ART.fillOut(c, blink ? '#fff6c0' : '#f2c230', 2.5);
    c.beginPath(); c.arc(puck.x, puck.y, pr * 0.6, 0, R2); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2; c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(puck.x - pr * 0.35, puck.y - pr * 0.4, pr * 0.3, pr * 0.14, -0.5, 0, R2); c.fill();
    mallet(ai, '#ff6b6b', '#a8283a'); mallet(me, '#4f9bff', '#1f4f9a');
  } else {
    // red
    if (bounceMk) { c.globalAlpha = bounceMk.t / 0.35; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.ellipse(bounceMk.x, bounceMk.y, 14 - bounceMk.t * 20, 6 - bounceMk.t * 8, 0, 0, R2); c.stroke(); c.globalAlpha = 1; }
    const hb = ballH(), below = puck.y > NETY;
    const drawBall = () => { const r = puck.r * (1 + hb / 70); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(puck.x + hb * 0.25, puck.y + 2, puck.r * 0.9, puck.r * 0.5, 0, 0, R2); c.fill();
      const spd = Math.hypot(puck.vx, puck.vy); if (serveT <= 0 && spd > 350) trail.forEach(([x, y], i) => { c.globalAlpha = i / trail.length * 0.3; c.fillStyle = '#ffd08a'; c.beginPath(); c.arc(x, y - hb, r * (0.3 + i / trail.length * 0.6), 0, R2); c.fill(); }); c.globalAlpha = 1;
      c.beginPath(); c.arc(puck.x, puck.y - hb, r, 0, R2); ART.fillOut(c, '#ff9a3c', 2.2); c.fillStyle = '#ffd6a0'; c.beginPath(); c.arc(puck.x - r * 0.3, puck.y - hb - r * 0.3, r * 0.4, 0, R2); c.fill(); };
    if (!below) drawBall();
    // red con malla y postes
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(TX0 - 10, NETY - 12, TX1 - TX0 + 20, 14); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); for (let x = TX0 - 8; x < TX1 + 10; x += 6) { c.moveTo(x, NETY - 12); c.lineTo(x, NETY + 2); } c.stroke();
    ART.rr(c, TX0 - 12, NETY - 15, TX1 - TX0 + 24, 5, 2); ART.fillOut(c, '#fff', 2); for (const x of [TX0 - 14, TX1 + 6]) { ART.rr(c, x, NETY - 18, 8, 22, 3); ART.fillOut(c, '#3a3f5c', 2); }
    if (below) drawBall();
    racket(ai, PYAI, -1, '#2a2f44'); racket(me, PYME, 1, '#e24b5b');
    label(server ? 'Saque: tú' : 'Saque: CPU', 12, 614, 13, '#cfe3ff'); if (rally > 3) label(`Rally ${rally}`, 348, 614, 13, '#fff27a', 'right');
  }
  // marcador lateral junto a la línea central
  const bx = HK ? 20 : 4, by = 282; ART.rr(c, bx, by, 38, 76, 10); c.fillStyle = 'rgba(26,21,48,.78)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(bx + 6, by + 38, 26, 2);
  const pop = (mine) => (goalT > 0.9 && goalMe === mine ? 1 + (goalT - 0.9) * 1.2 : 1);
  for (const [v, y, col, mine] of [[sAi, by + 20, HK ? '#ff6b6b' : '#c9cbe0', false], [sMe, by + 57, HK ? '#6fb0ff' : '#ff8a8a', true]]) { c.save(); c.translate(bx + 19, y); const s = pop(mine); c.scale(s, s); label(v, 0, 0, 24, col, 'center', 'middle'); c.restore(); }
  label(HK ? 'A 7 goles' : 'A 11 puntos', 12, HK ? 18 : 14, 12, HK ? '#cfd8ff' : '#cfe3ff');
  if (goalT > 0 && k.st === 'play') { const p = 1.3 - goalT, s = p < 0.18 ? 0.4 + p / 0.18 * 0.8 : 1.2 - Math.min(0.2, (p - 0.18)); c.save(); c.translate(180, goalMe ? 250 : 400); c.scale(s, s); c.globalAlpha = Math.min(1, goalT / 0.3);
    label(HK ? (goalMe ? '¡GOL!' : 'Gol rival') : (goalMe ? '¡Punto!' : 'Punto CPU'), 0, 0, goalMe ? 44 : 30, goalMe ? '#7cf7a0' : '#ff7a8a', 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
});
