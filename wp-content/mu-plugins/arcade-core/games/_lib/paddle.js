/* Paddle en vertical. CFG.mode: 'hockey' (Air Hockey a 7, mazo libre) | 'pong' (Ping Pong Reflex a 11 con 2 de diferencia)
 * | 'four' (Disco a Cuatro Bandas) y 'fronton' (Frontón Vasco): ver paddleX() al final; los modos de siempre van en el bloque else.
 * Mesa cacheada con relieve, mazos/raquetas con brillo, disco con estela, pelota con altura y sombra, saque alterno en ping pong. */
if (CFG.mode === 'four' || CFG.mode === 'fronton') paddleX(); else {
const M = CFG.mode, HK = M === 'hockey', OUT = ART.OUT, R2 = 6.2832;
/* LAND: pantalla apaisada (tele, escritorio a pantalla completa) → la mesa se gira 90°: abajo (J1) a la izquierda, arriba (J2) a la derecha.
   La lógica sigue en coordenadas de mesa vertical 360×640; tp() pasa de mesa a lienzo y las teclas se giran con la vista. */
const LAND = innerWidth > innerHeight * 1.15;
if (LAND && window.CFG && !CFG.hud) CFG.hud = 'tr';
const k = Kit({ w: LAND ? 640 : 360, h: LAND ? 360 : 640, title: CFG.title, bg: HK ? '#1c2447' : '#10263f' }), c = k.ctx;
const GOAL = 110, TO = 7, RAIL = 12, TX0 = 24, TX1 = 336, NETY = 320, PYME = 580, PYAI = 60;
/* franja superior libre para pausa/sonido (vertical): la mesa se dibuja a escala SCL bajo ella */
const TOP = LAND ? 0 : 40, SCL = (640 - TOP) / 640, OXT = 180 * (1 - SCL);
const tp = (x, y) => (LAND ? [640 - y, x] : [OXT + x * SCL, TOP + y * SCL]);
const burstAt = (x, y, col, n, v) => { const [a, b] = tp(x, y); k.burst(a, b, col, n, v); }, floatAt = (txt, x, y, col) => { const [a, b] = tp(x, y); k.float(txt, a, b, col); };
/* teclas en coordenadas de mesa: en apaisado → (↑ pantalla = ← mesa, → pantalla = ↑ mesa, hacia el rival) */
const keyset = (S) => (LAND ? { l: S.has('up'), r: S.has('down'), u: S.has('right'), d: S.has('left') } : { l: S.has('left'), r: S.has('right'), u: S.has('up'), d: S.has('down') });
/* CPU: empieza floja (0,35; 1.23) y mejora con los puntos jugados del partido (+0,32 como máximo) y con cada victoria tuya (+0,02, hasta 5).
 * Si te saca 2 o más puntos afloja un poco. Antes: 0,55 + 0,03 por punto sin tope (1,15 al final de un partido largo). */
let CPU = 0; try { CPU = Math.min(5, +localStorage.getItem('cpu:' + CFG.id) || 0); } catch (e) { /* sin almacenamiento */ }
let me, ai, puck, sMe, sAi, serveT, rally, trail, goalT, goalMe, tm, bounceMk, server, aiOff = 0, meOff = 0, cdPend = false;
/* Modo tele: SLOT = [jugador abajo, jugador arriba] fijado al empezar el partido (J1 abajo/izquierda, J2 arriba/derecha).
   Un lado sin jugador, o cuyo jugador se ha ido, lo lleva la CPU; si vuelve (o llega otro), recupera el lado. */
let SLOT = [null, null];
const inParty = (p) => p !== null && !!(k.party && k.party.some((q) => q.p === p));
const HUM = (i) => inParty(SLOT[i]), VSM = () => SLOT[0] !== null && SLOT[1] !== null;
const MPX = () => SLOT.filter((p, i) => HUM(i)); /* compatibilidad (pruebas) */
const NM = (bot) => { const i = bot ? 0 : 1; if (!k.party && !VSM()) return bot ? 'Tú' : 'CPU'; return HUM(i) ? 'J' + (SLOT[i] + 1) : 'CPU'; };
const PC = (bot) => { const p = SLOT[bot ? 0 : 1]; return p !== null ? k.pcol(p) : null; };
const shade = (hx, f) => { const n = parseInt(hx.slice(1), 16); return '#' + [16, 8, 0].map((b) => Math.round(((n >> b) & 255) * f).toString(16).padStart(2, '0')).join(''); };
let serveWait = 0, serveHold = false;
function serverIsMe() { const tot = sMe + sAi; return (sMe >= 10 && sAi >= 10 ? tot : Math.floor(tot / 2)) % 2 === 0; }
function serve(dir) {
  trail = []; rally = 0; bounceMk = null; aiOff = 0;
  if (HK) { puck = { x: 180, y: 320, vx: k.rnd(-120, 120), vy: dir * 60, r: 16, bz: 0 }; serveT = 1; return; }
  server = serverIsMe(); const d = server ? -1 : 1, p = server ? me : ai; // la pelota sale de la raqueta de quien saca
  puck = { x: p.x, y: server ? PYME - 14 : PYAI + 14, vx: k.rnd(-90, 90), vy: d * (VSM() ? 380 : 250), r: 9, from: server ? PYME : PYAI, bounced: false }; serveT = 0.9; serveWait = 0;
}
function reset() { SLOT = k.party ? [k.party[0].p, k.party[1] ? k.party[1].p : null] : [null, null]; cdPend = !!k.party; me = { x: 180, y: HK ? 560 : PYME, px: 180, py: 560, r: HK ? 28 : 0, w: 80 }; ai = { x: 180, y: HK ? 80 : PYAI, px: 180, py: 80, r: HK ? 28 : 0, w: 80 }; sMe = 0; sAi = 0; tm = 0; goalT = 0; serve(1); }
k.onParty = () => { if (k.st !== 'play') return reset();
  for (const q of k.party || []) if (!SLOT.includes(q.p)) { const i = [0, 1].find((j) => !HUM(j)); if (i !== undefined) SLOT[i] = q.p; } };
reset(); k.show(CFG.title, HK ? 'Mueve tu mazo con el dedo (o flechas) y marca en la portería de arriba. Gana quien llegue a 7.' : 'Mueve la raqueta con el dedo (o flechas). Golpea en movimiento para dar efecto. Partido a 11 puntos con 2 de diferencia; el saque cambia cada 2 puntos.');
function goal(forMe) {
  if (forMe) sMe++; else sAi++; goalT = 1.3; goalMe = forMe;
  burstAt(puck.x, k.clamp(puck.y, 10, 630), forMe ? '#7cf7a0' : '#ff5f5f', 26, 220); k.sfx(forMe ? 'coin' : 'hurt'); k.shake(forMe ? 4 : 7); if (!forMe) k.flash('rgba(255,70,90,.25)');
  const TGT = HK ? TO : 11, fin = (sMe >= TGT || sAi >= TGT) && (HK || Math.abs(sMe - sAi) >= 2);
  if (fin && VSM()) { const bw = sMe > sAi, n = NM(bw); k.win(n === 'CPU' ? 'Gana la CPU' : `¡Gana ${n}!`, PC(bw), `<b style="color:${PC(true)}">${NM(true)} ${sMe}</b> – <b style="color:${PC(false)}">${sAi} ${NM(false)}</b><br>Toca para la revancha`, Math.max(sMe, sAi)); return; }
  if (fin) { k.st = 'over'; const mg = sMe > sAi ? sMe - sAi : 0, nr = NREC(mg), b = k.best(CFG.id, mg); k.show(sMe > sAi ? '¡Ganaste!' : 'Perdiste', `${nr}${sMe} – ${sAi} · Mejor victoria: ${b ? '+' + b : '—'}<br>Toca para la revancha`); if (sMe < sAi) k.sfx('lose'); else { k.sfx('win'); k.confetti(); CPU = Math.min(5, CPU + 1); try { localStorage.setItem('cpu:' + CFG.id, CPU); } catch (e) { /* sin almacenamiento */ } } return; }
  if (!HK) { if (sMe >= 10 && sAi >= 10 && sMe === sAi) floatAt('Iguales', 180, 360, '#fff27a'); else if (Math.max(sMe, sAi) >= 10 && Math.abs(sMe - sAi) >= 1) floatAt(sMe > sAi ? (VSM() ? 'Punto de partido ' + NM(true) : 'Punto de partido') : 'Punto de partido ' + NM(false), 180, 360, '#fff27a'); }
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
  if (cdPend) { cdPend = false; k.count(3); }
  if (k.counting()) return;
  const lvl = 0.35 + CPU * 0.02 + Math.min(0.32, (sMe + sAi) * (HK ? 0.026 : 0.016)) - (sAi - sMe >= 2 ? 0.1 : 0); // 1.23: más fácil (base 0,5→0,35, +0,04→+0,02 por victoria)
  me.px = me.x; me.py = me.y; ai.px = ai.x; ai.py = ai.y;
  const botHum = k.party ? HUM(0) : true;
  if (k.ptr.down && (botHum || !k.party)) { const qx = LAND ? k.ptr.y : (k.ptr.x - OXT) / SCL, qy = LAND ? 640 - k.ptr.x : (k.ptr.y - TOP) / SCL; me.x += (qx - me.x) * Math.min(1, dt * 25); if (HK) me.y += (qy - me.y) * Math.min(1, dt * 25); }
  const held = (i) => { const p = SLOT[i]; if (!k.party) return i ? null : k.held; if (!HUM(i)) return null; const S = new Set(k.pad(p).held); if (p === 0) for (const x of k.held) S.add(x); return S; };
  const drive = (m, S) => { const q = keyset(S); if (q.l) m.x -= 400 * dt; if (q.r) m.x += 400 * dt; if (HK) { if (q.u) m.y -= 400 * dt; if (q.d) m.y += 400 * dt; } };
  /* IA (arriba: la de siempre; abajo: la misma reflejada, para quien se va del mando) */
  const cpu = (m, top) => { const sp = (HK ? 330 : 280) * lvl, off = top ? aiOff : meOff, toward = top ? puck.vy < 0 : puck.vy > 0;
    const tx = toward || !HK ? puck.x - (HK ? 0 : off) : 180, ty = HK ? (top ? (puck.y < 320 && puck.vy < 80 ? puck.y - 20 : 90) : (puck.y > 320 && puck.vy > -80 ? puck.y + 20 : 550)) : m.y;
    m.x += k.clamp(tx - m.x, -sp * dt, sp * dt); m.y += k.clamp(ty - m.y, -sp * dt, sp * dt); };
  const H1 = held(0), H2 = held(1);
  if (H1) drive(me, H1); else if (k.party) cpu(me, false);
  me.x = k.clamp(me.x, HK ? RAIL + me.r : TX0 + 16, 360 - (HK ? RAIL + me.r : TX0 + 16)); me.y = HK ? k.clamp(me.y, 320 + me.r * 0.7, 628 - me.r) : PYME;
  if (H2) drive(ai, H2); else cpu(ai, true);
  ai.x = k.clamp(ai.x, HK ? RAIL + ai.r : TX0 + 16, 360 - (HK ? RAIL + ai.r : TX0 + 16)); ai.y = HK ? k.clamp(ai.y, RAIL + ai.r, 300) : PYAI;
  serveHold = false;
  if (!HK && k.party && serveT > 0) { /* modo tele: quien saca pulsa A (o toca); saque automático a los 5 s */
    const si = server ? 0 : 1, hs = SLOT[si];
    if (HUM(si)) { serveWait += dt; if (k.pad(hs).hit.has('a') || (hs === 0 && k.hit.has('a')) || (server && k.ptr.hit)) serveT = 0.001; else if (serveT < 0.4 && serveWait < 5) serveHold = true; } }
  if (serveT > 0) { if (!serveHold) serveT -= dt; if (!HK) { const p = server ? me : ai; puck.x = p.x; } return; }
  const steps = 4, h = dt / steps, WX0 = HK ? RAIL : TX0, WX1 = HK ? 360 - RAIL : TX1;
  for (let s = 0; s < steps; s++) { puck.x += puck.vx * h; puck.y += puck.vy * h; if (HK) { puck.vx *= 1 - 0.25 * h; puck.vy *= 1 - 0.25 * h; }
    if (puck.x < WX0 + puck.r || puck.x > WX1 - puck.r) { puck.vx *= -1; puck.x = k.clamp(puck.x, WX0 + puck.r, WX1 - puck.r); if (HK) { puck.bz = 0.15; k.sfx('click'); } }
    if (HK) { const inGoal = Math.abs(puck.x - 180) < GOAL / 2 - 4;
      if (puck.y < RAIL + puck.r) { if (inGoal) return goal(true); puck.vy = Math.abs(puck.vy); puck.y = RAIL + puck.r; k.sfx('click'); }
      if (puck.y > 628 - puck.r) { if (inGoal) return goal(false); puck.vy = -Math.abs(puck.vy); puck.y = 628 - puck.r; k.sfx('click'); }
      for (const m of [me, ai]) { const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy); if (d < m.r + puck.r && d > 0) { const nx = dx / d, ny = dy / d; puck.x = m.x + nx * (m.r + puck.r); puck.y = m.y + ny * (m.r + puck.r); const mvx = (m.x - m.px) / dt, mvy = (m.y - m.py) / dt; const rv = (puck.vx - mvx) * nx + (puck.vy - mvy) * ny;
        if (rv < 0) { puck.vx -= 1.9 * rv * nx; puck.vy -= 1.9 * rv * ny; k.sfx('hit'); puck.bz = 0.2; if (-rv > 500) burstAt(puck.x - nx * puck.r, puck.y - ny * puck.r, '#fff', 6, 120); }
        const spd = Math.hypot(puck.vx, puck.vy); const CAP = VSM() ? 900 : 780; if (spd > CAP) { puck.vx *= CAP / spd; puck.vy *= CAP / spd; }
        /* disco pillado contra la baranda: no puede salirse de la mesa → retrocede el mazo (antes se quedaba atascado fuera, en la esquina) */
        const cx = k.clamp(puck.x, WX0 + puck.r, WX1 - puck.r), cy = Math.abs(puck.x - 180) < GOAL / 2 - 4 ? puck.y : k.clamp(puck.y, RAIL + puck.r, 628 - puck.r);
        if (cx !== puck.x || cy !== puck.y) { puck.x = cx; puck.y = cy; m.x = puck.x - nx * (m.r + puck.r); m.y = puck.y - ny * (m.r + puck.r); } } } }
    else { for (const [p, dir] of [[me, -1], [ai, 1]]) { const py = p === me ? PYME : PYAI; if (Math.sign(puck.vy) === -dir && Math.abs(puck.y - py) < 10 && Math.abs(puck.x - p.x) < p.w / 2 + puck.r) { rally++; k.sfx('hit'); { const o = k.rnd(-34, 34) * (Math.random() < 0.1 + Math.min(0.35, rally * 0.02) ? 1.9 : 1); if (p === me) aiOff = o; else meOff = o; } /* la CPU apunta a un lado (devuelve con ángulo) y a veces calcula mal */ const spd = VSM() ? Math.min(1050, Math.hypot(puck.vx, puck.vy) * 1.1) : Math.min(700, Math.hypot(puck.vx, puck.vy) * 1.05) /* 1.23: 820→700 */; /* dos jugadores: bola más viva, puntos más cortos */ const off = (puck.x - p.x) / (p.w / 2), spin = (p.x - p.px) / dt * 0.25; puck.vx = off * spd * 0.7 + spin; puck.vy = dir * Math.sqrt(Math.max(1, spd * spd - puck.vx * puck.vx * 0.5)); puck.y = py + dir * 11; puck.from = py; puck.bounced = false; burstAt(puck.x, py, '#fff', 5, 90); if (rally > 0 && rally % 10 === 0) floatAt(`Rally ${rally}`, 180, 360, '#fff27a'); } }
      const tot = Math.abs(PYME - PYAI); if (!puck.bounced && Math.abs(puck.y - puck.from) / tot > 0.72) { puck.bounced = true; bounceMk = { x: puck.x, y: puck.y, t: 0.35 }; k.sfx('click'); }
      if (puck.y < 0) return goal(true); if (puck.y > 640) return goal(false); } }
  if (puck.bz) puck.bz = Math.max(0, puck.bz - dt);
  trail.push([puck.x, puck.y]); if (trail.length > 10) trail.shift();
}, () => {
  c.fillStyle = HK ? '#1c2447' : '#0c1d33'; c.fillRect(0, 0, k.w, k.h); c.save();
  if (LAND) c.transform(0, 1, -1, 0, 640, 0); else { c.translate(OXT, TOP); c.scale(SCL, SCL); }
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
    const hb = ballH(), below = puck.y > NETY, hx = LAND ? hb : 0, hy = LAND ? 0 : hb; /* la altura se ve hacia arriba de la pantalla */
    const drawBall = () => { const r = puck.r * (1 + hb / 70); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(puck.x + hy * 0.25, puck.y + 2 - hx * 0.25, puck.r * 0.9, puck.r * 0.5, 0, 0, R2); c.fill();
      const spd = Math.hypot(puck.vx, puck.vy); if (serveT <= 0 && spd > 350) trail.forEach(([x, y], i) => { c.globalAlpha = i / trail.length * 0.3; c.fillStyle = '#ffd08a'; c.beginPath(); c.arc(x - hx, y - hy, r * (0.3 + i / trail.length * 0.6), 0, R2); c.fill(); }); c.globalAlpha = 1;
      c.beginPath(); c.arc(puck.x - hx, puck.y - hy, r, 0, R2); ART.fillOut(c, '#ff9a3c', 2.2); c.fillStyle = '#ffd6a0'; c.beginPath(); c.arc(puck.x - hx - r * 0.3, puck.y - hy - r * 0.3, r * 0.4, 0, R2); c.fill(); };
    if (!below) drawBall();
    // red con malla y postes
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(TX0 - 10, NETY - 12, TX1 - TX0 + 20, 14); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); for (let x = TX0 - 8; x < TX1 + 10; x += 6) { c.moveTo(x, NETY - 12); c.lineTo(x, NETY + 2); } c.stroke();
    ART.rr(c, TX0 - 12, NETY - 15, TX1 - TX0 + 24, 5, 2); ART.fillOut(c, '#fff', 2); for (const x of [TX0 - 14, TX1 + 6]) { ART.rr(c, x, NETY - 18, 8, 22, 3); ART.fillOut(c, '#3a3f5c', 2); }
    if (below) drawBall();
    racket(ai, PYAI, -1, PC(false) || '#2a2f44'); racket(me, PYME, 1, PC(true) || '#e24b5b');
    if (!LAND) { label('Saque: ' + (server ? (k.party ? NM(true) : 'tú') : NM(false)), 12, 614, 13, '#cfe3ff');
      if (serveHold && k.st === 'play') label('A para sacar', 180, server ? 540 : 100, 16, '#fff27a', 'center'); if (rally > 3) label(`Rally ${rally}`, 348, 614, 13, '#fff27a', 'right'); }
  }
  const pop = (mine) => (goalT > 0.9 && goalMe === mine ? 1 + (goalT - 0.9) * 1.2 : 1);
  const colOf = (mine) => PC(mine) || (mine ? (HK ? '#6fb0ff' : '#ff8a8a') : (HK ? '#ff6b6b' : '#c9cbe0'));
  if (!LAND) {
    // marcador lateral junto a la línea central
    const bx = HK ? 20 : 4, by = 282; ART.rr(c, bx, by, 38, 76, 10); c.fillStyle = 'rgba(26,21,48,.78)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(bx + 6, by + 38, 26, 2);
    for (const [v, y, mine] of [[sAi, by + 20, false], [sMe, by + 57, true]]) { c.save(); c.translate(bx + 19, y); const s = pop(mine); c.scale(s, s); label(v, 0, 0, 24, colOf(mine), 'center', 'middle'); c.restore(); }
    if (goalT > 0 && k.st === 'play') { const p = 1.3 - goalT, s = p < 0.18 ? 0.4 + p / 0.18 * 0.8 : 1.2 - Math.min(0.2, (p - 0.18)); c.save(); c.translate(180, goalMe ? 250 : 400); c.scale(s, s); c.globalAlpha = Math.min(1, goalT / 0.3);
      if (VSM()) label((HK ? '¡Gol de ' : '¡Punto de ') + NM(goalMe) + '!', 0, 0, 38, PC(goalMe), 'center', 'middle');
      else label(HK ? (goalMe ? '¡GOL!' : 'Gol rival') : (goalMe ? '¡Punto!' : 'Punto ' + NM(false)), 0, 0, goalMe ? 44 : 30, goalMe ? '#7cf7a0' : '#ff7a8a', 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
  }
  c.restore();
  if (!LAND) { label(HK ? 'A 7 goles' : 'A 11 puntos', 12, 13, 12, HK ? '#cfd8ff' : '#cfe3ff'); return; }
  /* ---- marcador y rótulos en apaisado (lienzo 640×360, sin girar) ---- */
  const named = !!k.party;
  if (named) for (const [m, mine] of [[me, true], [ai, false]]) { const [X, Y] = tp(m.x, HK ? m.y : mine ? PYME : PYAI); label(NM(mine), X, Y - (HK ? 50 : 48), 16, colOf(mine), 'center'); }
  const n1 = NM(true), n2 = NM(false);
  c.font = '800 18px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const w1 = c.measureText(n1).width, w2 = c.measureText(n2).width, bw = 150 + w1 + w2;
  ART.rr(c, 320 - bw / 2, 3, bw, 40, 12); c.fillStyle = 'rgba(26,21,48,.85)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
  label(n1, 320 - bw / 2 + 12, 13, 18, colOf(true)); label(n2, 320 + bw / 2 - 12, 13, 18, colOf(false), 'right'); label('–', 320, 23, 22, '#fff', 'center', 'middle');
  for (const [v, x, mine] of [[sMe, 295, true], [sAi, 345, false]]) { c.save(); c.translate(x, 23); const s = pop(mine); c.scale(s, s); label(v, 0, 0, 28, colOf(mine), 'center', 'middle'); c.restore(); }
  label((HK ? 'A 7 goles' : 'A 11 puntos · 2 de diferencia') + (HK ? '' : ' · Saque: ' + (server ? (named ? n1 : 'tú') : n2)), 320, 358, 12, HK ? '#5a668f' : '#cfe3ff', 'center', 'bottom');
  if (!HK && serveHold && k.st === 'play') { const [X, Y] = tp(server ? me.x : ai.x, server ? PYME - 70 : PYAI + 70); label('A para sacar', X, Y, 16, '#fff27a', 'center', 'middle'); }
  if (!HK && rally > 3) label(`Rally ${rally}`, 628, 358, 13, '#fff27a', 'right', 'bottom');
  if (goalT > 0 && k.st === 'play') { const p = 1.3 - goalT, s = p < 0.18 ? 0.4 + p / 0.18 * 0.8 : 1.2 - Math.min(0.2, (p - 0.18)); c.save(); c.translate(320, 180); c.scale(s, s); c.globalAlpha = Math.min(1, goalT / 0.3);
    if (named && VSM()) label((HK ? '¡Gol de ' : '¡Punto de ') + NM(goalMe) + '!', 0, 0, 46, colOf(goalMe), 'center', 'middle');
    else label(HK ? (goalMe ? '¡GOL!' : 'Gol rival') : (goalMe ? '¡Punto!' : 'Punto ' + n2), 0, 0, goalMe ? 52 : 36, goalMe ? '#7cf7a0' : '#ff7a8a', 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
});

/* ¿la puntuación supera el récord guardado? (se consulta antes de que k.best lo actualice; mismo aviso que k.end) */
function NREC(s) { let b = 0; try { b = +localStorage.getItem(k.bkey(CFG.id)) || 0; } catch (e) {} if (s > b && b > 0) { k.confetti(); k.sfx('win'); return '<b style="color:#ffd166">¡Nuevo récord!</b><br>'; } return ''; }
}

/* =====================================================================================================
 * Modos nuevos (oleada 2), en código aparte para no tocar los de siempre:
 *  'four'    Disco a Cuatro Bandas: mesa cuadrada, 4 porterías y 4 palas (abajo J1, arriba J2, izquierda J3, derecha J4);
 *            cada gol quita una vida (CFG.lives, 3); sin vidas la portería se cierra; gana la última en pie. CPU rellena plazas.
 *  'fronton' Frontón Vasco: cancha cenital con frontis, pared izquierda y lado derecho abierto; turnos alternos (J1/J2 o CPU);
 *            la pelota debe dar en el frontis por encima de la chapa y botar entre las líneas de falta y pasa; el rival la
 *            devuelve de volea o tras un bote. Quien gana el tanto saca. Partido a CFG.to (15) tantos.
 * ===================================================================================================== */
function paddleX() {
  const FOUR = CFG.mode === 'four', OUT = ART.OUT, R2 = 6.2832;
  const LAND = innerWidth > innerHeight * 1.15;
  if (window.CFG && !CFG.hud) CFG.hud = 'bl';
  const W = LAND ? 640 : 360, H = LAND ? 360 : 640;
  const k = Kit({ w: W, h: H, title: CFG.title, bg: FOUR ? '#1c2447' : '#1d2433' }), c = k.ctx, clamp = k.clamp, hyp = Math.hypot;
  const lsGet = (key, d) => { try { const v = localStorage.getItem(key); return v == null ? d : +v; } catch (e) { return d; } };
  const lsSet = (key, v) => { try { localStorage.setItem(key, v); } catch (e) { /* sin almacenamiento */ } };
  const CPUK = 'cpu:' + CFG.id;
  function label(s, x, y, size, col, align, base) {
    c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'center'; c.textBaseline = base || 'middle';
    c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
  }
  function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; g.lineCap = 'round'; draw(g); return cv; }
  const pname = (p) => { if (!k.human(p)) return 'CPU'; if (!k.party) return 'Tú'; const q = k.party.find((x) => x.p === p); return (q && q.name) || 'J' + (p + 1); };
  if (FOUR) four(); else fronton();

  /* ------------------------------------------------------------------ Disco a Cuatro Bandas */
  function four() {
    const B = 340, OX = LAND ? 150 : 10, OY = LAND ? 12 : 188, GW = 150, G0 = (B - GW) / 2, G1 = G0 + GW, CUT = 44, PL = 68, PT = 13, INS = 22, PR = 11;
    const LIVES = CFG.lives || 3, MAXS = 560;
    /* lado i: 0 abajo, 1 arriba, 2 izquierda, 3 derecha; n = normal hacia dentro de la mesa */
    const SD = [{ n: [0, -1], hz: true }, { n: [0, 1], hz: true }, { n: [1, 0], hz: false }, { n: [-1, 0], hz: false }];
    let PL4 = [], puck, tm = 0, calm = 0, serveT = 0, goalT = 0, goalSide = -1, order = 0, cdPend = false, spd = 150, over = false, lastHit = -1;
    const pos = (s) => [[s.c, B - INS], [s.c, INS], [INS, s.c], [B - INS, s.c]][s.i];
    function reset() {
      PL4 = [0, 1, 2, 3].map((i) => ({ i, p: i, c: B / 2, pc: B / 2, lives: LIVES, out: false, outAt: 0, err: 0, flash: 0 }));
      puck = { x: B / 2, y: B / 2, vx: 0, vy: 0, r: PR, bz: 0 }; tm = 0; calm = 0; serveT = 1.6; order = 0; goalT = 0; over = false; lastHit = -1; spd = 150; cdPend = !!k.party; trail = [];
    }
    let trail = [];
    k.onParty = () => { if (k.st !== 'play') reset(); };
    const alive = () => PL4.filter((s) => !s.out);
    const lvl = () => clamp(0.3 + CPU * 0.03 + Math.min(0.3, tm / 150), 0.3, 0.85);
    let CPU = Math.min(8, lsGet(CPUK, 0));
    function launch() {
      const al = alive(); let cand = al.filter((s) => !k.human(s.p)); if (!cand.length || tm > 20) cand = al;
      const t = k.pick(cand), [gx, gy] = [[B / 2, B], [B / 2, 0], [0, B / 2], [B, B / 2]][t.i];
      const a = Math.atan2(gy - B / 2, gx - B / 2) + k.rnd(-0.45, 0.45), v = tm < 5 ? 150 : Math.max(170, spd * 0.8);
      puck.x = B / 2; puck.y = B / 2; puck.vx = Math.cos(a) * v; puck.vy = Math.sin(a) * v; k.sfx('pop');
    }
    function goal(s) {
      s.lives--; s.flash = 1; calm = 0; goalT = 1.2; goalSide = s.i; trail = [];
      k.burst(OX + puck.x, OY + puck.y, k.pcol(s.p), 24, 220); k.sfx(k.human(s.p) && !k.party ? 'hurt' : 'coin'); k.shake(k.human(s.p) ? 7 : 4);
      if (k.human(s.p) && !k.party) k.flash('rgba(255,70,90,.25)');
      if (s.lives <= 0) { s.out = true; s.outAt = ++order; k.sfx('explode'); k.float(pname(s.p) + ' eliminado', OX + B / 2, OY + B / 2 - 30, k.pcol(s.p)); }
      puck.x = B / 2; puck.y = B / 2; puck.vx = puck.vy = 0; serveT = 1.3;
      const al = alive();
      if (al.length <= 1 || (!k.party && s.p === 0 && s.out)) finish();
    }
    function finish() {
      over = true; const me = PL4[0];
      if (!k.party) {
        if (!me.out) { CPU = Math.min(8, CPU + 1); lsSet(CPUK, CPU); const b = k.best(CFG.id, me.lives); return k.win('¡Ganaste!', k.pcol(0), `Última portería en pie con ${me.lives} ${me.lives === 1 ? 'vida' : 'vidas'} · Mejor: ${b}<br>Toca para la revancha`, me.lives); }
        k.st = 'over'; k.sfx('lose'); return k.show('Eliminado', `Puesto ${5 - me.outAt}.º de 4<br>Toca para la revancha`);
      }
      k.podium(PL4.map((s) => ({ p: s.p, score: s.out ? s.outAt : 10 + s.lives })), { fmt: (v) => (v >= 10 ? `en pie (${v - 10} ${v - 10 === 1 ? 'vida' : 'vidas'})` : 'eliminado') });
    }
    const CORN = [[0, 0, 1, 1], [B, 0, -1, 1], [0, B, 1, -1], [B, B, -1, -1]];
    function physics(dt) {
      const steps = 4, h = dt / steps;
      for (let st = 0; st < steps; st++) {
        puck.x += puck.vx * h; puck.y += puck.vy * h;
        /* bandas y porterías */
        const inGx = puck.x > G0 + 4 && puck.x < G1 - 4, inGy = puck.y > G0 + 4 && puck.y < G1 - 4;
        const chk = (i, pen, inG, ref) => { const s = PL4[i]; if (pen <= 0) return false; if (inG && !s.out) { if (pen > PR * 2) { goal(s); return true; } return false; } ref(); puck.bz = 0.15; k.sfx('click'); return false; };
        if (chk(0, puck.y - (B - PR), inGx, () => { puck.y = B - PR; puck.vy = -Math.abs(puck.vy); })) return;
        if (chk(1, PR - puck.y, inGx, () => { puck.y = PR; puck.vy = Math.abs(puck.vy); })) return;
        if (chk(2, PR - puck.x, inGy, () => { puck.x = PR; puck.vx = Math.abs(puck.vx); })) return;
        if (chk(3, puck.x - (B - PR), inGy, () => { puck.x = B - PR; puck.vx = -Math.abs(puck.vx); })) return;
        /* esquinas en diagonal */
        for (const [cx, cy, sx, sy] of CORN) { const nx = sx / Math.SQRT2, ny = sy / Math.SQRT2, d = (puck.x - cx) * nx + (puck.y - cy) * ny - CUT / Math.SQRT2;
          if (d < PR) { puck.x += (PR - d) * nx; puck.y += (PR - d) * ny; const vn = puck.vx * nx + puck.vy * ny; if (vn < 0) { puck.vx -= 2 * vn * nx; puck.vy -= 2 * vn * ny; k.sfx('click'); } } }
        /* palas (cápsulas) */
        for (const s of PL4) { if (s.out) continue; const [px, py] = pos(s), hz = SD[s.i].hz, half = PL / 2 - PT / 2;
          const qx = hz ? clamp(puck.x, px - half, px + half) : px, qy = hz ? py : clamp(puck.y, py - half, py + half);
          const dx = puck.x - qx, dy = puck.y - qy, d = hyp(dx, dy), R = PR + PT / 2;
          if (d < R && d > 0.001) { const n = SD[s.i].n, ux = dx / d, uy = dy / d; puck.x = qx + ux * (R + 0.5); puck.y = qy + uy * (R + 0.5);
            const front = (puck.x - px) * n[0] + (puck.y - py) * n[1] > -2;
            if (front) { const along = hz ? puck.x - s.c : puck.y - s.c, off = clamp(along / (PL / 2), -1, 1), pv = (s.c - s.pc) / Math.max(dt, 0.001);
              const th = off * 0.85 + clamp(pv * 0.0012, -0.35, 0.35), t = hz ? [1, 0] : [0, 1];
              spd = Math.min(MAXS, Math.max(spd, Math.hypot(puck.vx, puck.vy)) * 1.04 + 4); const base = Math.min(MAXS, 200 + tm * 1.6); spd = Math.max(spd, tm < 5 ? 160 : base);
              puck.vx = (n[0] * Math.cos(th) + t[0] * Math.sin(th)) * spd; puck.vy = (n[1] * Math.cos(th) + t[1] * Math.sin(th)) * spd;
              lastHit = s.i; k.sfx('hit'); puck.bz = 0.2; if (Math.abs(pv) > 250) k.burst(OX + puck.x, OY + puck.y, '#fff', 6, 120);
            } else { const vn = puck.vx * ux + puck.vy * uy; if (vn < 0) { puck.vx -= 2 * vn * ux; puck.vy -= 2 * vn * uy; } } } }
      }
      /* sin trayectorias paralelas a una banda (el disco no se queda dando vueltas) */
      const v = hyp(puck.vx, puck.vy); if (v > 1) { if (Math.abs(puck.vx) < v * 0.22) puck.vx = Math.sign(puck.vx || 1) * v * 0.22; if (Math.abs(puck.vy) < v * 0.22) puck.vy = Math.sign(puck.vy || 1) * v * 0.22; const f = v / hyp(puck.vx, puck.vy); puck.vx *= f; puck.vy *= f; }
    }
    /* coordenada a lo largo del lado i donde llegará el disco (con rebotes en las otras bandas) */
    function predict(i) { const n = SD[i].n, vt = -(puck.vx * n[0] + puck.vy * n[1]); if (vt <= 10) return null;
      const dist = [B - INS - PR - puck.y, puck.y - INS - PR, puck.x - INS - PR, B - INS - PR - puck.x][i], t = Math.max(0, dist) / vt;
      let a = SD[i].hz ? puck.x + puck.vx * t : puck.y + puck.vy * t; const P = 2 * (B - 2 * PR); a -= PR; a = ((a % P) + P) % P; if (a > B - 2 * PR) a = P - a; return { a: a + PR, t }; }
    window.__four = () => ({ PL4, puck, tm, over, serveT }); /* pruebas */
    reset(); k.show(CFG.title, CFG.help);
    k.run((dt) => {
      goalT -= dt; for (const s of PL4) s.flash = Math.max(0, s.flash - dt); puck.bz = Math.max(0, (puck.bz || 0) - dt);
      if (!k.gate(reset)) return;
      if (cdPend) { cdPend = false; k.count(3); }
      if (k.counting() || over) return;
      tm += dt; if (serveT <= 0) calm += dt; const L = lvl(), noHum = !PL4.some((s) => !s.out && k.human(s.p));
      for (const s of PL4) { if (s.out) continue; s.pc = s.c;
        if (k.human(s.p)) { const d = k.pdir(s.p), hz = SD[s.i].hz; const m = hz ? d.x : d.y || (s.i === 2 ? d.x : -d.x); s.c += m * 380 * dt;
          if (!k.party && s.p === 0 && k.ptr.down) { const tx = k.ptr.x - OX; s.c += (tx - s.c) * Math.min(1, dt * 22); } }
        else { const pr = predict(s.i), sp = 150 + 240 * L; let tgt = B / 2;
          if (pr && pr.t < 0.5 + L * 1.2) tgt = pr.a + s.err; else s.err = k.rnd(-1, 1) * ((1 - L) * 48 + Math.min(70, Math.max(0, calm - (noHum ? 6 : 20)) * 4)); // sin goles un buen rato: la CPU se cansa y falla más
          s.c += clamp(tgt - s.c, -sp * dt, sp * dt); }
        s.c = clamp(s.c, CUT + PL / 2 - 8, B - CUT - PL / 2 + 8); }
      if (serveT > 0) { serveT -= dt; if (serveT <= 0) launch(); return; }
      physics(dt * (noHum ? 1.35 : 1)); if (over) return;
      trail.push([puck.x, puck.y]); if (trail.length > 10) trail.shift();
    }, draw);
    const TABLE = off(W, H, (g) => {
      g.fillStyle = '#1c2447'; g.fillRect(0, 0, W, H);
      g.save(); g.translate(OX, OY);
      ART.rr(g, -10, -10, B + 20, B + 20, 18); ART.fillOut(g, '#2d3a78', 3);
      g.beginPath(); g.moveTo(CUT, 0); g.lineTo(B - CUT, 0); g.lineTo(B, CUT); g.lineTo(B, B - CUT); g.lineTo(B - CUT, B); g.lineTo(CUT, B); g.lineTo(0, B - CUT); g.lineTo(0, CUT); g.closePath();
      const sg = g.createLinearGradient(0, 0, B, B); sg.addColorStop(0, '#f4fbff'); sg.addColorStop(0.5, '#dcecf7'); sg.addColorStop(1, '#eef7ff'); g.fillStyle = sg; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
      g.save(); g.clip();
      g.fillStyle = 'rgba(60,90,130,.22)'; for (let y = 10; y < B; y += 17) for (let x = 10 + ((y / 17) % 2) * 8; x < B; x += 17) g.fillRect(x, y, 1.6, 1.6);
      g.strokeStyle = '#e24b5b'; g.lineWidth = 3; g.beginPath(); g.arc(B / 2, B / 2, 46, 0, R2); g.stroke(); g.fillStyle = '#e24b5b'; g.beginPath(); g.arc(B / 2, B / 2, 6, 0, R2); g.fill();
      g.strokeStyle = 'rgba(58,123,213,.55)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(CUT, CUT); g.lineTo(B - CUT, B - CUT); g.moveTo(B - CUT, CUT); g.lineTo(CUT, B - CUT); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(0, 120); g.lineTo(120, 0); g.lineTo(170, 0); g.lineTo(0, 170); g.fill();
      g.restore();
      g.restore();
    });
    function barPad(s) {
      const [px, py] = pos(s), hz = SD[s.i].hz, w = hz ? PL : PT, h = hz ? PT : PL, col = k.pcol(s.p), x = OX + px - w / 2, y = OY + py - h / 2;
      c.fillStyle = 'rgba(20,30,60,.25)'; ART.rr(c, x + 3, y + 4, w, h, 6); c.fill();
      ART.rr(c, x, y, w, h, 6); const gr = c.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, ART.lite(col, 0.35)); gr.addColorStop(1, ART.dark(col, 0.15)); c.fillStyle = gr; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.5)'; if (hz) c.fillRect(x + 8, y + 3, w - 16, 2.5); else c.fillRect(x + 3, y + 8, 2.5, h - 16);
    }
    function draw() {
      c.drawImage(TABLE, 0, 0, W, H);
      /* porterías: abiertas (ranura con luz del color del jugador) o cerradas (barrera) */
      for (const s of PL4) { const col = k.pcol(s.p), hz = SD[s.i].hz, at = [[G0, B - 4], [G0, -10], [-10, G0], [B - 4, G0]][s.i], w = hz ? GW : 14, h = hz ? 14 : GW, x = OX + at[0], y = OY + at[1];
        if (s.out) { ART.rr(c, x, y, w, h, 5); c.fillStyle = '#5a5f7a'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); c.save(); ART.rr(c, x, y, w, h, 5); c.clip(); c.strokeStyle = '#ffd166'; c.lineWidth = 5; c.beginPath(); for (let q = -20; q < GW + 20; q += 16) { if (hz) { c.moveTo(x + q, y + h); c.lineTo(x + q + h, y); } else { c.moveTo(x, y + q); c.lineTo(x + w, y + q + w); } } c.stroke(); c.restore(); continue; }
        ART.rr(c, x, y, w, h, 5); c.fillStyle = '#0b0a18'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
        c.globalAlpha = 0.55 + 0.45 * s.flash * Math.abs(Math.sin(performance.now() / 60)); c.fillStyle = col; if (hz) c.fillRect(x + 6, y + (s.i === 0 ? 3 : h - 6), w - 12, 3); else c.fillRect(x + (s.i === 2 ? w - 6 : 3), y + 6, 3, h - 12); c.globalAlpha = 1;
        for (const q of [0, 1]) { const px = hz ? x + q * w : x + w / 2, py = hz ? y + h / 2 : y + q * h; c.beginPath(); c.arc(px, py, 5, 0, R2); ART.fillOut(c, '#f2d15c', 2); } }
      /* disco */
      const v = hyp(puck.vx, puck.vy); if (v > 260) trail.forEach(([x, y], i) => { c.globalAlpha = i / trail.length * 0.25; c.fillStyle = '#f2c230'; c.beginPath(); c.arc(OX + x, OY + y, PR * (0.5 + i / trail.length * 0.5), 0, R2); c.fill(); }); c.globalAlpha = 1;
      const pr = PR * (1 + (puck.bz || 0) * 0.6), X = OX + puck.x, Y = OY + puck.y, blink = serveT > 0 && Math.sin(performance.now() / 55) > 0;
      c.fillStyle = 'rgba(20,30,60,.25)'; c.beginPath(); c.ellipse(X + 3, Y + 5, pr, pr * 0.9, 0, 0, R2); c.fill();
      c.beginPath(); c.arc(X, Y + 3, pr, 0, R2); ART.fillOut(c, '#b8860f', 2.5); c.beginPath(); c.arc(X, Y, pr, 0, R2); ART.fillOut(c, blink ? '#fff6c0' : '#f2c230', 2.5);
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(X - pr * 0.35, Y - pr * 0.4, pr * 0.3, pr * 0.14, -0.5, 0, R2); c.fill();
      for (const s of PL4) if (!s.out) barPad(s);
      /* nombres junto a cada portería (dentro de la mesa) */
      for (const s of PL4) { if (s.out) continue; const [x, y] = [[B / 2, B - 44], [B / 2, 44], [44, B / 2], [B - 44, B / 2]][s.i]; c.globalAlpha = 0.8; label(pname(s.p), OX + x, OY + y, k.party ? 15 : 12, k.pcol(s.p)); c.globalAlpha = 1; }
      /* panel: jugadores y vidas */
      const rows = PL4.map((s, j) => (LAND ? [10, 64 + j * 44] : [14 + (j % 2) * 172, 82 + Math.floor(j / 2) * 44]));
      if (!LAND) label('Última portería en pie', W / 2, 44, 14, '#cfd8ff'); else { label('Última', 75, 22, 13, '#cfd8ff'); label('portería en pie', 75, 38, 13, '#cfd8ff'); }
      PL4.forEach((s, j) => { const [x, y] = rows[j], col = k.pcol(s.p), side = ['abajo', 'arriba', 'izq.', 'dcha.'][s.i];
        ART.rr(c, x, y - 15, LAND ? 130 : 160, 32, 9); c.fillStyle = s.out ? 'rgba(26,21,48,.45)' : 'rgba(26,21,48,.8)'; c.fill(); c.lineWidth = 2; c.strokeStyle = s.out ? '#3a3560' : col; c.stroke();
        label(pname(s.p), x + 8, y - 4, 13, s.out ? '#6f6a94' : col, 'left'); c.font = '700 10px ui-rounded,system-ui,sans-serif'; c.fillStyle = '#9f98c8'; c.textAlign = 'left'; c.fillText(side, x + 8, y + 9);
        for (let q = 0; q < LIVES; q++) { const hx = x + (LAND ? 122 : 150) - (LIVES - 1 - q) * 15 - 6, on = q < s.lives; c.beginPath(); c.arc(hx, y + 1, 5.5, 0, R2); ART.fillOut(c, on ? '#ff6f8e' : '#3a3560', 1.8); } });
      if (goalT > 0 && k.st === 'play' && goalSide >= 0) { const s = PL4[goalSide], p = 1.2 - goalT, sc = p < 0.18 ? 0.4 + p / 0.18 * 0.8 : 1.2 - Math.min(0.2, p - 0.18); c.save(); c.translate(OX + B / 2, OY + B / 2); c.scale(sc, sc); c.globalAlpha = Math.min(1, goalT / 0.3);
        label(s.out ? '¡Fuera ' + pname(s.p) + '!' : 'Gol a ' + pname(s.p), 0, 0, 30, k.pcol(s.p)); c.restore(); c.globalAlpha = 1; }
    }
  }

  /* ------------------------------------------------------------------ Frontón Vasco */
  function fronton() {
    const WALLY = 38, LX = 30, RX = 318, FALTA = 214, PASA = 540, BACK = 632, CHAPA = 9, GR = 230, EW = 0.86, REACH = 30, TO = CFG.to || 15;
    const TOP = LAND ? 0 : 40, SCL = (640 - TOP) / 640, OXT = 180 * (1 - SCL);
    const tp = (x, y) => (LAND ? [640 - y, x] : [OXT + x * SCL, TOP + y * SCL]);
    const keyset = (d) => (LAND ? { x: d.y, y: -d.x } : d);
    let CPU = Math.min(8, lsGet(CPUK, 0)), pl, ball, turn, server, score, phase, phT, msg = '', msgC = '#fff', msgT = 0, rally = 0, cdPend = false, marks = [], wallFx = [], waitT = 0, tm = 0, plan = null, planT = 0;
    const hum = (p) => k.human(p);
    const lvl = () => { const lead = score[1] - score[0]; return clamp(0.32 + CPU * 0.03 + Math.min(0.25, (score[0] + score[1]) * 0.012) - (!k.party && lead >= 3 ? 0.1 : 0), 0.25, 0.9); };
    function reset() {
      pl = [0, 1].map((p) => ({ p, x: p ? 230 : 140, y: p ? 520 : 440, px: 0, py: 0, sw: 0, anim: 0 }));
      score = [0, 0]; rally = 0; marks = []; wallFx = []; msgT = 0; tm = 0; cdPend = !!k.party;
      server = k.party ? (Math.random() < 0.5 ? 0 : 1) : 0; setServe();
    }
    k.onParty = () => { if (k.st !== 'play') reset(); };
    function setServe() {
      phase = 'serve'; waitT = 0; turn = server; plan = null;
      const s = pl[server], o = pl[1 - server]; s.x = 150; s.y = 450; o.x = 235; o.y = 540;
      ball = { x: s.x + 12, y: s.y - 14, z: 16, vx: 0, vy: 0, vz: 0, wall: false, bounces: 0, last: server };
    }
    function shoot(p, quality, serve) {
      const P = pl[p], o = pl[1 - p], isH = hum(p), L = lvl();
      let u = clamp(300 + rally * 9, 300, 500) * (isH ? 1 : 0.86 + 0.18 * L) * (serve ? 0.9 : 1);
      if (!isH && !k.party && score[0] + score[1] === 0 && rally < 2) u *= 0.85;
      let yb, xb, clean = true;
      if (isH) { const mv = (P.x - P.px) / Math.max(1e-3, lastDt), err = Math.abs(quality);
        yb = 370 + k.rnd(-50, 60) + (err > 0.6 ? k.rnd(-160, 190) * (err - 0.5) : 0); xb = 175 + clamp(mv * 0.32, -150, 150) + quality * 60 + k.rnd(-25, 25); clean = err < 0.75 || Math.random() > 0.5; }
      else { const e = (1 - L); yb = k.rnd(270, 480) + k.rnd(-1, 1) * e * 110; xb = (o.x < 175 ? k.rnd(215, 300) : k.rnd(60, 150)) + k.rnd(-1, 1) * e * 70; clean = Math.random() > 0.06 * e + 0.01; }
      if (serve) { yb = clamp(yb, 300, 470); xb = clamp(xb, 90, 270); }
      const z0 = Math.max(8, ball.z), d1 = Math.max(20, ball.y - WALLY), d2 = Math.max(40, yb - WALLY);
      let T = 1, vz = 0, t1 = 1;
      for (let i = 0; i < 14; i++) { t1 = d1 / u; const t2 = d2 / (u * EW); T = t1 + t2; vz = (GR * T * T / 2 - z0) / T; const hz = z0 + vz * t1 - GR * t1 * t1 / 2; if (!clean || hz > CHAPA + 10) break; u *= 0.93; }
      Object.assign(ball, { vx: (xb - ball.x) / T, vy: -u, vz, wall: false, bounces: 0, last: p }); turn = 1 - p; rally++; P.sw = 0.25; plan = null;
      const [sx, sy] = tp(ball.x, ball.y); k.burst(sx, sy, '#fff', 6, 110); k.sfx('hit');
      if (rally > 0 && rally % 8 === 0) float(`Peloteo ${rally}`, 180, 330, '#fff27a');
    }
    function float(t, x, y, col) { const [a, b] = tp(x, y); k.float(t, a, b, col); }
    function point(p, why) {
      if (phase !== 'play') return;
      score[p]++; rally = 0; server = p; msg = why; msgC = k.pcol(p); msgT = 1.5; phase = 'pt'; phT = 1.5;
      const [sx, sy] = tp(clamp(ball.x, 10, 350), clamp(ball.y, 40, 630)); k.burst(sx, sy, k.pcol(p), 18, 180);
      k.sfx(!k.party && p === 1 ? 'hurt' : 'coin'); if (!k.party && p === 1) k.shake(4);
      if (score[p] >= TO) finish(p);
    }
    function finish(p) {
      phase = 'end';
      if (!k.party || !(hum(0) && hum(1))) {
        const meWin = p === 0 && hum(0);
        if (!k.party || hum(0)) { if (meWin) { CPU = Math.min(8, CPU + 1); lsSet(CPUK, CPU); const b = k.best(CFG.id, score[0] - score[1]); return k.win(k.party ? `¡Gana ${pname(0)}!` : '¡Ganaste!', k.pcol(0), `${score[0]} – ${score[1]} · Mejor victoria: +${b}<br>Toca para la revancha`, score[0] - score[1]); }
          if (!k.party) { k.st = 'over'; k.sfx('lose'); return k.show('Perdiste', `${score[0]} – ${score[1]}<br>Toca para la revancha`); } }
      }
      k.win(`¡Gana ${pname(p)}!`, k.pcol(p), `<b style="color:${k.pcol(0)}">${pname(0)} ${score[0]}</b> – <b style="color:${k.pcol(1)}">${score[1]} ${pname(1)}</b><br>Toca para la revancha`, Math.abs(score[0] - score[1]));
    }
    function stepBall(b, h, ev) {
      b.x += b.vx * h; b.y += b.vy * h; b.vz -= GR * h; b.z += b.vz * h;
      if (b.y <= WALLY && b.vy < 0) { if (b.z < CHAPA) { if (ev) ev('chapa'); b.vy = Math.abs(b.vy) * 0.2; b.y = WALLY; } else { b.y = WALLY; b.vy = -b.vy * EW; b.wall = true; if (ev) ev('wall'); } }
      if (b.x <= LX + 6 && b.vx < 0) { b.x = LX + 6; b.vx = -b.vx * 0.85; if (ev) ev('side'); }
      if (b.x > RX + 8) { if (ev) ev('out'); }
      if (b.z <= 0 && b.vz < 0) { b.z = 0; b.vz = Math.max(40, -b.vz * 0.6); b.vx *= 0.9; b.vy *= 0.9; if (ev) ev('floor'); }
      if (b.y > BACK + 20 && ev) ev('back');
    }
    function onEv(t) {
      if (phase !== 'play') return;
      const b = ball, last = b.last, rcv = 1 - last;
      if (t === 'chapa') { k.sfx('hurt'); return point(rcv, '¡Chapa!'); }
      if (t === 'wall') { const [a, bb] = tp(b.x, WALLY); wallFx.push({ x: b.x, z: b.z, t: 0.4 }); k.sfx('click'); k.burst(a, bb, '#e8e2d0', 5, 70); return; }
      if (t === 'side') { k.sfx('click'); return; }
      if (t === 'out') return point(b.wall && b.bounces === 1 ? last : rcv, b.wall && b.bounces === 1 ? 'Tanto' : 'Fuera');
      if (t === 'back') return point(b.bounces === 1 ? last : rcv, b.bounces === 1 ? 'Tanto' : 'Pasa');
      if (t === 'floor') { marks.push({ x: b.x, y: b.y, t: 0.8 }); k.sfx('click');
        if (!b.wall) return point(rcv, 'No llega al frontis');
        if (b.bounces === 0) { if (b.y < FALTA) return point(rcv, 'Falta'); if (b.y > PASA) return point(rcv, 'Pasa'); b.bounces = 1; plan = null; return; }
        return point(last, rally > 6 ? '¡Tantazo!' : 'Tanto'); }
    }
    function predict(P) { const b = Object.assign({}, ball); let stop = false; const out = [];
      for (let i = 0; i < 180 && !stop; i++) { stepBall(b, 1 / 60, (t) => { if (t === 'floor' && b.wall) { b.bounces++; if (b.bounces >= 2) stop = true; } if (t === 'out' || t === 'back' || t === 'chapa') stop = true; });
        if (!stop && b.wall && b.vy > 0 && b.z < 46 && b.y > 150) out.push({ x: b.x, y: b.y, t: (i + 1) / 60 }); }
      return out; }
    let lastDt = 1 / 60;
    window.__fr = () => ({ pl, ball, score, phase, turn, rally, server }); /* pruebas */
    reset(); k.show(CFG.title, CFG.help);
    k.run((dt) => {
      msgT -= dt; marks = marks.filter((m) => (m.t -= dt) > 0); wallFx = wallFx.filter((f) => (f.t -= dt) > 0);
      if (!k.gate(reset)) return;
      if (cdPend) { cdPend = false; k.count(3); }
      if (k.counting() || phase === 'end') return;
      dt = Math.min(dt, 1 / 30); lastDt = dt; tm += dt; const L = lvl();
      /* movimiento */
      for (const P of pl) { P.px = P.x; P.py = P.y; P.sw = Math.max(0, P.sw - dt);
        if (phase === 'serve' && P.p === server) continue;
        if (hum(P.p)) { const d = keyset(k.pdir(P.p)); let mx = d.x, my = d.y;
          if (!k.party && P.p === 0 && k.ptr.down) { const qx = LAND ? k.ptr.y : (k.ptr.x - OXT) / SCL, qy = LAND ? 640 - k.ptr.x : (k.ptr.y - TOP) / SCL, ex = qx - P.x, ey = qy - P.y, m = hyp(ex, ey); if (m > 6) { mx = ex / m * Math.min(1, m / 30); my = ey / m * Math.min(1, m / 30); } }
          const m = hyp(mx, my); if (m > 1) { mx /= m; my /= m; } P.x += mx * 310 * dt; P.y += my * 310 * dt; }
        else { let tx = 180, ty = 520;
          if (phase === 'play' && turn === P.p && ball.wall !== undefined) { planT -= dt; if (!plan || planT <= 0) { planT = 0.12; const C = predict(P), sp = 190 + 150 * L; plan = C.find((q) => hyp(q.x - P.x, q.y - P.y) - REACH * 0.5 <= sp * Math.max(0, q.t - (0.3 - 0.2 * L))) || C[C.length - 1] || null; if (plan) plan = { x: plan.x + k.rnd(-1, 1) * (1 - L) * 14, y: plan.y + 8 }; } if (plan) { tx = plan.x; ty = plan.y; } }
          else if (phase === 'play') { const o = pl[1 - P.p]; tx = o.x < 180 ? 245 : 120; ty = 560; }
          else if (phase === 'serve') { tx = P.x; ty = P.y; }
          const sp = (190 + 150 * L) * (turn === P.p ? 1 : 0.6), ex = tx - P.x, ey = ty - P.y, m = hyp(ex, ey); if (m > 1) { P.x += ex / m * Math.min(m, sp * dt); P.y += ey / m * Math.min(m, sp * dt); } }
        P.x = clamp(P.x, LX + 14, RX + 26); P.y = clamp(P.y, 160, BACK - 8); P.anim += hyp(P.x - P.px, P.y - P.py) * 0.05; }
      if (phase === 'serve') { const s = pl[server]; ball.x = s.x + 12; ball.y = s.y - 14; ball.z = 14 + Math.abs(Math.sin(tm * 3)) * 12; waitT += dt;
        const go = hum(server) ? k.phit(server, 'a') || k.phit(server, 'b') || (!k.party && server === 0 && k.ptr.hit) || (!!k.party && waitT > 5) : waitT > 1.1;
        if (go) { phase = 'play'; shoot(server, hum(server) ? k.rnd(-0.2, 0.2) : 0, true); }
        return; }
      if (phase === 'pt') { phT -= dt; stepBall(ball, dt, null); if (phT <= 0) setServe(); return; }
      for (let i = 0; i < 3 && phase === 'play'; i++) stepBall(ball, dt / 3, onEv);
      if (phase !== 'play') return;
      /* golpe automático de quien tiene el turno */
      const P = pl[turn];
      if (ball.wall && ball.vy > 0 && ball.bounces <= 1 && ball.z < 64 && hyp(ball.x - P.x, ball.y - P.y) < REACH) shoot(turn, (ball.x - P.x) / REACH);
    }, draw);
    const COURT = off(360, 640, (g) => {
      g.fillStyle = '#1d2433'; g.fillRect(0, 0, 360, 640);
      // grada y zona de fuera (derecha)
      g.fillStyle = '#262c40'; g.fillRect(RX, 0, 360 - RX, 640); g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 50; y < 640; y += 26) g.fillRect(RX + 12, y, 360 - RX - 16, 12);
      // suelo
      const fg = g.createLinearGradient(0, WALLY, 0, 640); fg.addColorStop(0, '#6f9b82'); fg.addColorStop(1, '#4f7c66'); g.fillStyle = fg; g.fillRect(LX, WALLY, RX - LX, 640 - WALLY);
      g.fillStyle = 'rgba(255,255,255,.04)'; for (let y = WALLY; y < 640; y += 8) g.fillRect(LX, y, RX - LX, 3);
      // líneas de cuadro cada 58 px, falta y pasa marcadas
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; for (let y = WALLY + 58, n = 1; y < 640; y += 58, n++) { g.beginPath(); g.moveTo(LX, y); g.lineTo(RX, y); g.stroke(); g.fillStyle = '#2a3140'; g.font = '800 12px ui-rounded,system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), LX / 2, y); }
      for (const [y, t, col] of [[FALTA, 'FALTA', '#ff6f5e'], [PASA, 'PASA', '#ffd166']]) { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(LX, y); g.lineTo(RX, y); g.stroke(); g.fillStyle = col; g.font = '900 12px ui-rounded,system-ui,sans-serif'; g.textAlign = 'right'; g.fillText(t, RX - 6, y - 9); }
      g.strokeStyle = '#ff6f5e'; g.lineWidth = 4; g.beginPath(); g.moveTo(RX, WALLY); g.lineTo(RX, 640); g.stroke();
      // pared izquierda y frontis de piedra
      const stone = (x, y, w, h, base) => { g.fillStyle = base; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(26,21,48,.18)'; g.lineWidth = 1; for (let yy = y; yy < y + h; yy += 12) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); for (let xx = x + ((yy / 12) % 2) * 11; xx < x + w; xx += 22) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 12); g.stroke(); } } };
      stone(0, 0, LX, 640, '#c9c3b0'); stone(0, 0, RX, WALLY, '#dcd6c2');
      g.fillStyle = '#9aa3b8'; g.fillRect(LX, WALLY - 7, RX - LX, 7); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(LX, WALLY - 7, RX - LX, 2);
      g.strokeStyle = OUT; g.lineWidth = 3; g.beginPath(); g.moveTo(LX, 640); g.lineTo(LX, WALLY); g.lineTo(RX, WALLY); g.stroke(); g.strokeRect(0, 0, RX, WALLY); g.strokeRect(0, 0, LX, 640);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(LX, WALLY, RX - LX, 6); g.fillRect(LX, WALLY, 6, 640);
    });
    function drawPl(P) {
      const col = k.pcol(P.p), moving = hyp(P.x - P.px, P.y - P.py) > 0.5, sw = moving ? Math.sin(P.anim * 3) * 4 : 0, my = phase !== 'serve' && turn === P.p;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(P.x + 3, P.y + 8, 15, 6, 0, 0, R2); c.fill();
      if (my && phase === 'play') { c.beginPath(); c.ellipse(P.x, P.y + 3, 19, 14, 0, 0, R2); c.lineWidth = 3; c.strokeStyle = col; c.globalAlpha = 0.6 + 0.4 * Math.sin(performance.now() / 120); c.stroke(); c.globalAlpha = 1; }
      c.save(); c.translate(P.x, P.y); c.rotate(-Math.PI / 2);
      c.fillStyle = '#f4f4f8'; for (const q of [-1, 1]) { c.beginPath(); c.ellipse(q * sw - 2, q * 6, 5, 3.4, 0, 0, R2); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); }
      const ph = P.sw > 0 ? 2.2 - 3.2 * (1 - P.sw / 0.25) : 0.7, hx = Math.cos(ph) * 12, hy = 7 + Math.sin(ph) * 8;
      c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 8); c.lineTo(hx * 0.8, hy); c.stroke(); c.strokeStyle = '#ffd9b5'; c.lineWidth = 3; c.stroke();
      c.save(); c.translate(hx * 0.8, hy); c.rotate(ph); ART.rr(c, 0, -2.5, 9, 5, 2); ART.fillOut(c, '#6b4a2b', 1.6); ART.rr(c, 8, -6, 16, 12, 5); ART.fillOut(c, '#c98a4b', 2); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(11, -4, 10, 2); c.restore();
      c.beginPath(); c.ellipse(0, 0, 9, 12, 0, 0, R2); c.fillStyle = col; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = '#fff'; c.fillRect(-2, -11, 4, 22);
      c.beginPath(); c.arc(1, 0, 7.5, 0, R2); c.fillStyle = P.p ? '#8a4b2a' : '#3a2a4a'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
      c.beginPath(); c.arc(1, 0, 7.5, -0.7, 0.7); c.lineTo(1, 0); c.fillStyle = '#e24b5b'; c.fill();
      c.restore();
    }
    function draw() {
      c.fillStyle = '#1d2433'; c.fillRect(0, 0, W, H); c.save();
      if (LAND) c.transform(0, 1, -1, 0, 640, 0); else { c.translate(OXT, TOP); c.scale(SCL, SCL); }
      c.drawImage(COURT, 0, 0, 360, 640);
      for (const f of wallFx) { c.globalAlpha = f.t / 0.4; c.fillStyle = '#fff6d0'; c.beginPath(); c.ellipse(f.x, WALLY - 12, 10 + (0.4 - f.t) * 30, 6, 0, 0, R2); c.fill(); } c.globalAlpha = 1;
      for (const m of marks) { c.globalAlpha = m.t / 0.8; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.ellipse(m.x, m.y, 12 - m.t * 8, 5 - m.t * 3, 0, 0, R2); c.stroke(); } c.globalAlpha = 1;
      const objs = pl.map((P) => ({ y: P.y, f: () => drawPl(P) })); objs.push({ y: ball.y + 0.1, f: drawBall }); objs.sort((a, b) => a.y - b.y); objs.forEach((o) => o.f());
      c.restore();
      /* nombres y marcador (sin girar) */
      for (const P of pl) { const [x, y] = tp(P.x, P.y); label(pname(P.p), x, y - 26, k.party ? 15 : 11, k.pcol(P.p)); }
      const n0 = pname(0), n1 = pname(1);
      if (!LAND) { ART.rr(c, 8, 4, 344, 32, 10); c.fillStyle = 'rgba(26,21,48,.85)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
        label(n0, 18, 20, 15, k.pcol(0), 'left'); label(n1, 342, 20, 15, k.pcol(1), 'right'); label(`${score[0]} – ${score[1]}`, 180, 20, 20, '#fff'); label(`a ${TO}`, 238, 20, 11, '#9f98c8'); }
      else { ART.rr(c, 170, 3, 300, 34, 10); c.fillStyle = 'rgba(26,21,48,.85)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
        label(n0, 182, 20, 15, k.pcol(0), 'left'); label(n1, 458, 20, 15, k.pcol(1), 'right'); label(`${score[0]} – ${score[1]}`, 320, 20, 20, '#fff'); label(`Partido a ${TO} tantos`, 320, 350, 12, '#cfd8ff'); }
      if (phase === 'serve' && k.st === 'play' && hum(server) && !k.counting()) { const [x, y] = tp(pl[server].x, pl[server].y + 44); label(k.party ? 'A para sacar' : 'A o toca para sacar', clamp(x, 90, W - 90), clamp(y, 60, H - 20), 15, '#fff27a'); }
      if (phase === 'play' && k.st === 'play') { const P = pl[turn]; if (hum(P.p) && ball.wall) { const [x, y] = tp(P.x, P.y); label('¡Tuya!', x, y + 28, 12, k.pcol(P.p)); } }
      if (msgT > 0 && k.st === 'play') { c.save(); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, W / 2, H / 2 - 30, 34, msgC); c.restore(); }
    }
    function drawBall() {
      const r = 7 + Math.min(3, ball.z / 40), hx = LAND ? ball.z * 0.45 : 0, hy = LAND ? 0 : ball.z * 0.45;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(ball.x, ball.y + 2, r * 0.9, r * 0.5, 0, 0, R2); c.fill();
      const x = ball.x - hx, y = ball.y - hy; c.beginPath(); c.arc(x, y, r, 0, R2); const gr = c.createRadialGradient(x - 2, y - 2, 1, x, y, r); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#d9ccb0'); c.fillStyle = gr; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = '#a0522d'; c.lineWidth = 1.2; c.beginPath(); c.arc(x - r * 0.8, y, r * 0.75, -0.9, 0.9); c.stroke();
    }
  }
}
