/* Paddle en vertical. CFG.mode: 'hockey' (Air Hockey a 7, mazo libre) | 'pong' (Ping Pong Reflex a 11 con 2 de diferencia)
 * Mesa cacheada con relieve, mazos/raquetas con brillo, disco con estela, pelota con altura y sombra, saque alterno en ping pong. */
const M = CFG.mode, HK = M === 'hockey', OUT = ART.OUT, R2 = 6.2832;
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: HK ? '#1c2447' : '#10263f' }), c = k.ctx;
const GOAL = 110, TO = 7, RAIL = 12, TX0 = 24, TX1 = 336, NETY = 320, PYME = 580, PYAI = 60;
/* franja superior libre para pausa/sonido: la mesa se dibuja a escala SCL bajo ella (sx/sy: mesa → pantalla) */
const TOP = 40, SCL = (640 - TOP) / 640, OXT = 180 * (1 - SCL), sx = (x) => OXT + x * SCL, sy = (y) => TOP + y * SCL;
/* CPU: empieza floja (0,5) y mejora con los puntos jugados del partido (+0,4 como máximo) y con cada victoria tuya (+0,04, hasta 5).
 * Si te saca 3 o más puntos afloja un poco. Antes: 0,55 + 0,03 por punto sin tope (1,15 al final de un partido largo). */
let CPU = 0; try { CPU = Math.min(5, +localStorage.getItem('cpu:' + CFG.id) || 0); } catch (e) { /* sin almacenamiento */ }
let me, ai, puck, sMe, sAi, serveT, rally, trail, goalT, goalMe, tm, bounceMk, server, aiOff = 0;
/* Modo tele: J1 abajo (party[0]), J2 arriba (party[1]); si solo hay uno, arriba juega la CPU. */
const MPX = () => (k.party ? k.party.slice(0, 2).map((q) => q.p) : []);
const NM = (bot) => { const m = MPX(); return bot ? (m.length ? 'J' + (m[0] + 1) : 'Tú') : (m.length > 1 ? 'J' + (m[1] + 1) : 'CPU'); };
const PC = (bot) => { const m = MPX(); return bot ? (m.length ? k.pcol(m[0]) : null) : (m.length > 1 ? k.pcol(m[1]) : null); };
const shade = (hx, f) => { const n = parseInt(hx.slice(1), 16); return '#' + [16, 8, 0].map((b) => Math.round(((n >> b) & 255) * f).toString(16).padStart(2, '0')).join(''); };
let serveWait = 0, serveHold = false;
function serverIsMe() { const tot = sMe + sAi; return (sMe >= 10 && sAi >= 10 ? tot : Math.floor(tot / 2)) % 2 === 0; }
function serve(dir) {
  trail = []; rally = 0; bounceMk = null; aiOff = 0;
  if (HK) { puck = { x: 180, y: 320, vx: k.rnd(-120, 120), vy: dir * 60, r: 16, bz: 0 }; serveT = 1; return; }
  server = serverIsMe(); const d = server ? -1 : 1, p = server ? me : ai; // la pelota sale de la raqueta de quien saca
  puck = { x: p.x, y: server ? PYME - 14 : PYAI + 14, vx: k.rnd(-90, 90), vy: d * 300, r: 9, from: server ? PYME : PYAI, bounced: false }; serveT = 0.9; serveWait = 0;
}
function reset() { me = { x: 180, y: HK ? 560 : PYME, px: 180, py: 560, r: HK ? 28 : 0, w: 80 }; ai = { x: 180, y: HK ? 80 : PYAI, px: 180, py: 80, r: HK ? 28 : 0, w: 80 }; sMe = 0; sAi = 0; tm = 0; goalT = 0; serve(1); }
reset(); k.show(CFG.title, HK ? 'Mueve tu mazo con el dedo (o flechas) y marca en la portería de arriba. Gana quien llegue a 7.' : 'Mueve la raqueta con el dedo (o flechas). Golpea en movimiento para dar efecto. Partido a 11 puntos con 2 de diferencia; el saque cambia cada 2 puntos.');
function goal(forMe) {
  if (forMe) sMe++; else sAi++; goalT = 1.3; goalMe = forMe;
  k.burst(sx(puck.x), sy(k.clamp(puck.y, 10, 630)), forMe ? '#7cf7a0' : '#ff5f5f', 26, 220); k.sfx(forMe ? 'coin' : 'hurt'); k.shake(forMe ? 4 : 7); if (!forMe) k.flash('rgba(255,70,90,.25)');
  const TGT = HK ? TO : 11, fin = (sMe >= TGT || sAi >= TGT) && (HK || Math.abs(sMe - sAi) >= 2);
  if (fin && MPX().length > 1) { k.st = 'over'; const bw = sMe > sAi; tellOver(); k.show(`¡Gana ${NM(bw)}!`, `<b style="color:${PC(bw)}">${NM(true)} ${sMe} – ${sAi} ${NM(false)}</b><br>Toca para la revancha`); return; }
  if (fin) { k.st = 'over'; const mg = sMe > sAi ? sMe - sAi : 0, nr = NREC(mg), b = k.best(CFG.id, mg); k.show(sMe > sAi ? '¡Ganaste!' : 'Perdiste', `${nr}${sMe} – ${sAi} · Mejor victoria: ${b ? '+' + b : '—'}<br>Toca para la revancha`); if (sMe < sAi) k.sfx('lose'); else { k.sfx('win'); k.confetti(); CPU = Math.min(5, CPU + 1); try { localStorage.setItem('cpu:' + CFG.id, CPU); } catch (e) { /* sin almacenamiento */ } } return; }
  if (!HK) { if (sMe >= 10 && sAi >= 10 && sMe === sAi) k.float('Iguales', 180, sy(360), '#fff27a'); else if (Math.max(sMe, sAi) >= 10 && Math.abs(sMe - sAi) >= 1) k.float(sMe > sAi ? (MPX().length > 1 ? 'Punto de partido ' + NM(true) : 'Punto de partido') : 'Punto de partido ' + NM(false), 180, sy(360), '#fff27a'); }
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
  const lvl = 0.5 + CPU * 0.04 + Math.min(0.4, (sMe + sAi) * (HK ? 0.035 : 0.022)) - (sAi - sMe >= 3 ? 0.08 : 0);
  me.px = me.x; me.py = me.y; ai.px = ai.x; ai.py = ai.y;
  if (k.ptr.down) { const qx = (k.ptr.x - OXT) / SCL, qy = (k.ptr.y - TOP) / SCL; me.x += (qx - me.x) * Math.min(1, dt * 25); if (HK) me.y += (qy - me.y) * Math.min(1, dt * 25); }
  const mp = MPX(), H1 = mp.length ? k.pad(mp[0]).held : k.held, H2 = mp.length > 1 ? k.pad(mp[1]).held : null;
  if (H1.has('left')) me.x -= 400 * dt; if (H1.has('right')) me.x += 400 * dt; if (HK) { if (H1.has('up')) me.y -= 400 * dt; if (H1.has('down')) me.y += 400 * dt; }
  me.x = k.clamp(me.x, HK ? RAIL + me.r : TX0 + 16, 360 - (HK ? RAIL + me.r : TX0 + 16)); me.y = HK ? k.clamp(me.y, 320 + me.r * 0.7, 628 - me.r) : PYME;
  // IA
  const tx = puck.vy < 0 || !HK ? puck.x - (HK ? 0 : aiOff) : 180, ty = HK ? (puck.y < 320 && puck.vy < 80 ? puck.y - 20 : 90) : PYAI;
  if (H2) { if (H2.has('left')) ai.x -= 400 * dt; if (H2.has('right')) ai.x += 400 * dt; if (HK) { if (H2.has('up')) ai.y -= 400 * dt; if (H2.has('down')) ai.y += 400 * dt; } }
  else { const sp = (HK ? 330 : 280) * lvl; ai.x += k.clamp(tx - ai.x, -sp * dt, sp * dt); ai.y += k.clamp(ty - ai.y, -sp * dt, sp * dt); }
  ai.x = k.clamp(ai.x, HK ? RAIL + ai.r : TX0 + 16, 360 - (HK ? RAIL + ai.r : TX0 + 16)); ai.y = HK ? k.clamp(ai.y, RAIL + ai.r, 300) : PYAI;
  serveHold = false;
  if (!HK && mp.length && serveT > 0) { /* modo tele: quien saca pulsa A (o toca); saque automático a los 5 s */
    const hs = server ? mp[0] : mp[1];
    if (hs !== undefined) { serveWait += dt; if (k.pad(hs).hit.has('a') || (server && k.ptr.hit)) serveT = 0.001; else if (serveT < 0.4 && serveWait < 5) serveHold = true; } }
  if (serveT > 0) { if (!serveHold) serveT -= dt; if (!HK) { const p = server ? me : ai; puck.x = p.x; } return; }
  const steps = 4, h = dt / steps, WX0 = HK ? RAIL : TX0, WX1 = HK ? 360 - RAIL : TX1;
  for (let s = 0; s < steps; s++) { puck.x += puck.vx * h; puck.y += puck.vy * h; if (HK) { puck.vx *= 1 - 0.25 * h; puck.vy *= 1 - 0.25 * h; }
    if (puck.x < WX0 + puck.r || puck.x > WX1 - puck.r) { puck.vx *= -1; puck.x = k.clamp(puck.x, WX0 + puck.r, WX1 - puck.r); if (HK) { puck.bz = 0.15; k.sfx('click'); } }
    if (HK) { const inGoal = Math.abs(puck.x - 180) < GOAL / 2 - 4;
      if (puck.y < RAIL + puck.r) { if (inGoal) return goal(true); puck.vy = Math.abs(puck.vy); puck.y = RAIL + puck.r; k.sfx('click'); }
      if (puck.y > 628 - puck.r) { if (inGoal) return goal(false); puck.vy = -Math.abs(puck.vy); puck.y = 628 - puck.r; k.sfx('click'); }
      for (const m of [me, ai]) { const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy); if (d < m.r + puck.r && d > 0) { const nx = dx / d, ny = dy / d; puck.x = m.x + nx * (m.r + puck.r); puck.y = m.y + ny * (m.r + puck.r); const mvx = (m.x - m.px) / dt, mvy = (m.y - m.py) / dt; const rv = (puck.vx - mvx) * nx + (puck.vy - mvy) * ny;
        if (rv < 0) { puck.vx -= 1.9 * rv * nx; puck.vy -= 1.9 * rv * ny; k.sfx('hit'); puck.bz = 0.2; if (-rv > 500) k.burst(sx(puck.x - nx * puck.r), sy(puck.y - ny * puck.r), '#fff', 6, 120); }
        const spd = Math.hypot(puck.vx, puck.vy); if (spd > 900) { puck.vx *= 900 / spd; puck.vy *= 900 / spd; } } } }
    else { for (const [p, dir] of [[me, -1], [ai, 1]]) { const py = p === me ? PYME : PYAI; if (Math.sign(puck.vy) === -dir && Math.abs(puck.y - py) < 10 && Math.abs(puck.x - p.x) < p.w / 2 + puck.r) { rally++; k.sfx('hit'); if (p === me) aiOff = k.rnd(-34, 34) * (Math.random() < 0.1 + Math.min(0.35, rally * 0.02) ? 1.9 : 1); /* la CPU apunta a un lado (devuelve con ángulo) y a veces calcula mal */ const spd = Math.min(820, Math.hypot(puck.vx, puck.vy) * 1.05); const off = (puck.x - p.x) / (p.w / 2), spin = (p.x - p.px) / dt * 0.25; puck.vx = off * spd * 0.7 + spin; puck.vy = dir * Math.sqrt(Math.max(1, spd * spd - puck.vx * puck.vx * 0.5)); puck.y = py + dir * 11; puck.from = py; puck.bounced = false; k.burst(sx(puck.x), sy(py), '#fff', 5, 90); if (rally > 0 && rally % 10 === 0) k.float(`Rally ${rally}`, 180, sy(360), '#fff27a'); } }
      const tot = Math.abs(PYME - PYAI); if (!puck.bounced && Math.abs(puck.y - puck.from) / tot > 0.72) { puck.bounced = true; bounceMk = { x: puck.x, y: puck.y, t: 0.35 }; k.sfx('click'); }
      if (puck.y < 0) return goal(true); if (puck.y > 640) return goal(false); } }
  if (puck.bz) puck.bz = Math.max(0, puck.bz - dt);
  trail.push([puck.x, puck.y]); if (trail.length > 10) trail.shift();
}, () => {
  c.fillStyle = HK ? '#1c2447' : '#0c1d33'; c.fillRect(0, 0, 360, 640); c.save(); c.translate(OXT, TOP); c.scale(SCL, SCL);
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
    const c1 = PC(true), c2 = PC(false); mallet(ai, c2 || '#ff6b6b', c2 ? shade(c2, 0.6) : '#a8283a'); mallet(me, c1 || '#4f9bff', c1 ? shade(c1, 0.6) : '#1f4f9a');
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
    racket(ai, PYAI, -1, PC(false) || '#2a2f44'); racket(me, PYME, 1, PC(true) || '#e24b5b');
    label('Saque: ' + (server ? (MPX().length ? NM(true) : 'tú') : NM(false)), 12, 614, 13, '#cfe3ff');
    if (serveHold && k.st === 'play') label('A para sacar', 180, server ? 540 : 100, 16, '#fff27a', 'center'); if (rally > 3) label(`Rally ${rally}`, 348, 614, 13, '#fff27a', 'right');
  }
  // marcador lateral junto a la línea central
  const bx = HK ? 20 : 4, by = 282; ART.rr(c, bx, by, 38, 76, 10); c.fillStyle = 'rgba(26,21,48,.78)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(bx + 6, by + 38, 26, 2);
  const pop = (mine) => (goalT > 0.9 && goalMe === mine ? 1 + (goalT - 0.9) * 1.2 : 1);
  for (const [v, y, col, mine] of [[sAi, by + 20, PC(false) || (HK ? '#ff6b6b' : '#c9cbe0'), false], [sMe, by + 57, PC(true) || (HK ? '#6fb0ff' : '#ff8a8a'), true]]) { c.save(); c.translate(bx + 19, y); const s = pop(mine); c.scale(s, s); label(v, 0, 0, 24, col, 'center', 'middle'); c.restore(); }
  if (goalT > 0 && k.st === 'play') { const p = 1.3 - goalT, s = p < 0.18 ? 0.4 + p / 0.18 * 0.8 : 1.2 - Math.min(0.2, (p - 0.18)); c.save(); c.translate(180, goalMe ? 250 : 400); c.scale(s, s); c.globalAlpha = Math.min(1, goalT / 0.3);
    if (MPX().length > 1) label((HK ? '¡Gol de ' : '¡Punto de ') + NM(goalMe) + '!', 0, 0, 38, PC(goalMe), 'center', 'middle');
    else label(HK ? (goalMe ? '¡GOL!' : 'Gol rival') : (goalMe ? '¡Punto!' : 'Punto ' + NM(false)), 0, 0, goalMe ? 44 : 30, goalMe ? '#7cf7a0' : '#ff7a8a', 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
  c.restore();
  label(HK ? 'A 7 goles' : 'A 11 puntos', 12, 13, 12, HK ? '#cfd8ff' : '#cfe3ff');
});

function tellOver() { k.sfx('win'); k.confetti(); try { if (parent !== window) parent.postMessage({ type: 'arcade:over', score: Math.max(sMe, sAi) }, '*'); } catch (e) { /* sin portal */ } }
/* ¿la puntuación supera el récord guardado? (se consulta antes de que k.best lo actualice; mismo aviso que k.end) */
function NREC(s) { let b = 0; try { b = +localStorage.getItem('best:' + CFG.id) || 0; } catch (e) {} if (s > b && b > 0) { k.confetti(); k.sfx('win'); return '<b style="color:#ffd166">¡Nuevo récord!</b><br>'; } return ''; }
