/* tiro.js — Puntería por turnos para 1–4 jugadores (la CPU rellena las plazas vacías). Lienzo 800×450.
 * CFG.mode 'petanca' (Petanca de Verano): vista cenital de un campo de tierra con desniveles (mapa de alturas: la bola
 *   rueda cuesta abajo). Boliche al azar lanzado por quien abre la mano; 3 bolas por jugador (2 si sois 3–4). Juega
 *   siempre quien NO tiene el punto (el más alejado; sin bolas tiradas va primero). Al acabar la mano, el que tiene la
 *   bola más cercana suma una por cada bola suya más cerca que la mejor del resto. Gana quien llega a 7 (o más puntos
 *   tras 9 manos). Tres tiros: Arrimar (rueda), Bombear (por alto, rueda poco) y Tirar (directo contra una bola).
 * CFG.mode 'arco' (Arco y Viento): tres distancias (30, 50 y 70 m) × 3 flechas por jugador. Mantén A para tensar, mueve
 *   la mira y suelta; el viento desvía la flecha (más cuanto más lejos) y la mira oscila con la respiración: calma en
 *   la pausa tras espirar; B aguanta la respiración unos segundos. Diana de 10 aros (X = 10 central, desempata).
 * Mando: joystick + A/B (tele, teclado, mando físico o virtual). Táctil: ver ayuda de cada modo.
 * CPU: nivel 0..10 en localStorage 'cpu:<id>' (sube media vez cuando le gana el único humano; baja si gana la CPU). */
const W = 800, H = 450, OUT = ART.OUT, TAU = 6.2832, MODE = CFG.mode === 'petanca' ? 'petanca' : 'arco', ID = CFG.id || MODE;
const k = Kit({ w: W, h: H, title: CFG.title, bg: MODE === 'petanca' ? '#5c8f45' : '#6ec0f0' }), c = k.ctx;
const lerp = (a, b, q) => a + (b - a) * q, clamp = k.clamp, ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); };
const FONT = (s) => `800 ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
function label(s, x, y, size, col, align, lw) { c.font = FONT(size); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = lw || size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function panel(x, y, w, h, r, fill, lw) { ART.rr(c, x, y, w, h, r); ART.fillOut(c, fill, lw || 2.5); }
function mk(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; g.lineCap = 'round'; draw(g); return cv; }
const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return v - Math.floor(v); };

/* ---------------- Jugadores, turnos y CPU ---------------- */
const LSK = 'cpu:' + ID; let LV = 0; try { LV = clamp(+localStorage.getItem(LSK) || 0, 0, 10); } catch (e) { /* sin almacenamiento */ }
const CNAME = ['roja', 'azul', 'amarilla', 'verde'];
let seats = [], PL = [], cur = 0, st = 'intro', stT = 0, t = 0, msg = '', msgT = 0, msgC = '#fff';
function nPl() { if (!k.party) return 2; return Math.max(2, ...k.party.map((q) => q.p + 1)); }
const nm = (i) => (seats[i].cpu ? 'CPU ' + CNAME[seats[i].p % 4] : String(seats[i].name).slice(0, 10));
const pc = (i) => k.pcol(seats[i].p);
const isCpu = (i) => seats[i].cpu;
k.onParty = () => { if (k.st === 'ready' || !PL.length) reset(); else seats = k.players(PL.length); }; // quien se va lo sustituye la CPU
function say(s, col, d) { msg = s; msgC = col || '#fff'; msgT = d || 1.3; }
function finish(rows, fmt) {
  k.st = 'over'; st = 'done'; const hum = seats.filter((q) => !q.cpu);
  if (hum.length === 1) { const top = rows.slice().sort((a, b) => b.score - a.score)[0], humWin = !seats[top.i].cpu && rows.filter((r) => r.score === top.score).length === 1;
    LV = clamp(LV + (humWin ? 0.5 : -0.5), 0, 10); try { localStorage.setItem(LSK, LV); } catch (e) { /* sin almacenamiento */ } }
  k.podium(rows.map((r) => ({ p: seats[r.i].p, score: r.score, name: nm(r.i) })), { fmt });
}
/* entrada del jugador en turno: humanos por mando/teclado; J1 en solitario también con el puntero */
const localPtr = (i) => !k.party && seats[i].p === 0 && !seats[i].cpu;
function banner(txt, sub, col) { const e = ease(Math.min(1, (1 - stT) / 0.2)); c.save(); c.translate(W / 2, H / 2 - 20); c.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e); c.globalAlpha = Math.min(1, stT / 0.25);
  panel(-190, -44, 380, 88, 18, 'rgba(26,21,48,.9)', 3); c.lineWidth = 3; c.strokeStyle = col; ART.rr(c, -186, -40, 372, 80, 15); c.stroke();
  label(txt, 0, -14, 28, col); if (sub) label(sub, 0, 20, 17, '#fff'); c.restore(); c.globalAlpha = 1; }
function drawMsg(y) { if (msgT <= 0) return; const e = Math.min(1, (1.3 - msgT) / 0.15), s = 0.5 + 0.5 * Math.min(1, e) + Math.sin(Math.min(1, e) * Math.PI) * 0.2; c.save(); c.translate(W / 2, y); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, 0, msg.length > 16 ? 26 : 34, msgC); c.restore(); c.globalAlpha = 1; }

/* =====================================================================================================
 * PETANCA
 * ===================================================================================================== */
const PX0 = 22, PY0 = 64, PX1 = 778, PY1 = 440, CX = 92, CY = 252, BR = 9, JR = 5.5, FR = 150, GS = 4000, TARGET = 7, MAXE = 9;
const STY = [{ n: 'Arrimar', sub: 'rueda hasta la bola', f: 0.3, T: 0.5, apex: 14 }, { n: 'Bombear', sub: 'cae alto y rueda poco', f: 0.82, T: 1.0, apex: 110 }, { n: 'Tirar', sub: 'directo contra una bola', f: 1, T: 0.46, apex: 34, v: 330 }];
let bumps = [], terrCv = null, balls = [], left = [], pts = [], endN = 0, opener = 0, aimA = 0, style = 0, gauge = 0, charging = false, chT = 0, aimT = 0, plan = null, settleT = 0, measure = null, throwerPose = 0, lastHold = -1;
const hgt = (x, y) => { let h = 0; for (const b of bumps) { const dx = x - b.x, dy = y - b.y; h += b.h * Math.exp(-(dx * dx + dy * dy) / (b.r * b.r)); } return h; };
function slope(x, y) { let gx = 0, gy = 0; for (const b of bumps) { const dx = x - b.x, dy = y - b.y, r2 = b.r * b.r, e = b.h * Math.exp(-(dx * dx + dy * dy) / r2) * -2 / r2; gx += e * dx; gy += e * dy; } return [-gx * GS, -gy * GS]; }
function makeTerrain() {
  bumps = []; const n = k.ri(4, 6);
  for (let i = 0; i < n; i++) bumps.push({ x: k.rnd(230, 740), y: k.rnd(PY0 + 30, PY1 - 30), r: k.rnd(55, 120), h: k.pick([-1, 1]) * k.rnd(0.45, 1) });
  terrCv = mk(W, H, (g) => {
    // césped y árboles del parque
    let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6fb356'); gr.addColorStop(1, '#4f9442'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 500; i++) { g.fillStyle = hr(i, 1) > 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,40,0,.1)'; g.fillRect(hr(i, 2) * W, hr(i, 3) * H, 2, 3); }
    // tierra: color según altura y luz desde arriba-izquierda (bloques de 4 px)
    const S = 4;
    for (let y = PY0; y < PY1; y += S) for (let x = PX0; x < PX1; x += S) {
      const h0 = hgt(x + 2, y + 2), [ax, ay] = slope(x + 2, y + 2), light = clamp(0.5 + (-ax - ay) / 2600, 0, 1), n2 = hr(x, y) * 0.08;
      const base = ART.mix('#c99a5e', '#f0d29a', clamp(0.5 + h0 * 0.35, 0, 1)); g.fillStyle = ART.mix(ART.dark(base, 0.18), ART.lite(base, 0.2), clamp(light + n2 - 0.04, 0, 1)); g.fillRect(x, y, S, S);
    }
    // curvas de nivel suaves
    g.globalAlpha = 0.16; g.fillStyle = '#5a3a1a';
    for (let y = PY0; y < PY1; y += 3) for (let x = PX0; x < PX1; x += 3) { const v = hgt(x, y) * 4; if (Math.abs(v - Math.round(v)) < 0.06 && Math.round(v) !== 0) g.fillRect(x, y, 2, 2); }
    g.globalAlpha = 1;
    // grava y piedrecitas
    for (let i = 0; i < 1400; i++) { const x = PX0 + hr(i, 7) * (PX1 - PX0), y = PY0 + hr(i, 8) * (PY1 - PY0); g.fillStyle = hr(i, 9) > 0.5 ? 'rgba(255,248,230,.45)' : 'rgba(90,60,30,.35)'; g.fillRect(x, y, 1.5, 1.5); }
    for (let i = 0; i < 40; i++) { const x = PX0 + 10 + hr(i, 11) * (PX1 - PX0 - 20), y = PY0 + 10 + hr(i, 12) * (PY1 - PY0 - 20); g.beginPath(); g.ellipse(x, y, 2.5, 1.8, hr(i, 13) * 3, 0, TAU); ART.fillOut(g, '#b9a88e', 1); }
    // tablas de madera del borde
    g.lineWidth = 8; g.strokeStyle = OUT; g.strokeRect(PX0 - 4, PY0 - 4, PX1 - PX0 + 8, PY1 - PY0 + 8); g.lineWidth = 5; g.strokeStyle = '#a8703c'; g.strokeRect(PX0 - 4, PY0 - 4, PX1 - PX0 + 8, PY1 - PY0 + 8);
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,230,190,.45)'; g.strokeRect(PX0 - 5.5, PY0 - 5.5, PX1 - PX0 + 11, PY1 - PY0 + 11);
    // copas de árbol (sombra de verano) en las esquinas
    for (const [x, y, r] of [[40, 30, 44], [250, 18, 34], [560, 22, 40], [770, 40, 46]]) { g.fillStyle = 'rgba(20,40,10,.25)'; g.beginPath(); g.arc(x + 10, y + 14, r, 0, TAU); g.fill(); g.beginPath(); g.arc(x, y, r, 0, TAU); ART.fillOut(g, '#3f8a3a', 3); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, TAU); g.fill(); }
    // círculo de lanzamiento
    g.lineWidth = 5; g.strokeStyle = OUT; g.beginPath(); g.arc(CX, CY, 25, 0, TAU); g.stroke(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
  });
}
const nBalls = () => (PL.length >= 3 ? 2 : 3);
function petReset() { seats = k.players(nPl()); PL = seats.map((q, i) => ({ i })); pts = PL.map(() => 0); endN = 0; opener = k.ri(0, PL.length - 1); makeTerrain(); startEnd(); }
function startEnd() {
  endN++; balls = []; left = PL.map(() => nBalls()); measure = null; cur = opener; style = 0; aimA = 0;
  const ang = k.rnd(-0.28, 0.28), d = k.rnd(330, 540), jx = CX + Math.cos(ang) * d, jy = clamp(CY + Math.sin(ang) * d, PY0 + 30, PY1 - 30);
  const j = { p: -1, x: CX, y: CY, z: 20, vx: 0, vy: 0, r: JR, m: 0.35, rot: 0 }; launch(j, jx, jy, { f: 0.9, T: 0.9, apex: 70 }, d * 0.9, Math.sqrt(2 * FR * d * 0.1)); balls.push(j);
  st = 'jack'; stT = 1; settleT = 0;
}
function launch(b, lx, ly, sty, _d, vland) { const dx = lx - b.x, dy = ly - b.y, L = Math.hypot(dx, dy) || 1; b.fly = { x0: b.x, y0: b.y, x1: lx, y1: ly, T: sty.T, t: 0, apex: sty.apex, ux: dx / L, uy: dy / L, v: vland }; }
/* lanzamiento del jugador en turno: gauge 0..1 → distancia total */
const distOf = (g) => 120 + g * 560;
function throwBall(i, a, g, s) {
  const S = STY[s], D = distOf(g), land = S.v ? D : D * S.f, vl = S.v || Math.sqrt(2 * FR * Math.max(0, D - land));
  const b = { p: i, x: CX + Math.cos(a) * 12, y: CY + Math.sin(a) * 12, z: 18, vx: 0, vy: 0, r: BR, m: 1, rot: 0 };
  launch(b, CX + Math.cos(a) * land, CY + Math.sin(a) * land, S, D, vl); balls.push(b); left[i]--; k.sfx('jump'); st = 'roll'; settleT = 0; throwerPose = 0.45; charging = false; plan = null;
}
function physics(dt) {
  const n = 4, h = dt / n;
  for (let s = 0; s < n; s++) {
    for (const b of balls) {
      if (b.fly) { const f = b.fly; f.t += h; const u = Math.min(1, f.t / f.T); b.x = lerp(f.x0, f.x1, u); b.y = lerp(f.y0, f.y1, u); b.z = f.apex * 4 * u * (1 - u) + 18 * (1 - u); b.rot += h * 8;
        if (u >= 1) { b.fly = null; b.z = 0; b.vx = f.ux * f.v; b.vy = f.uy * f.v; k.burst(b.x, b.y, '#d9b57a', f.apex > 60 ? 10 : 5, 60); k.sfx(b.p < 0 ? 'pop' : 'hit'); if (f.apex > 60) k.shake(2); } continue; }
      const sp = Math.hypot(b.vx, b.vy), [ax, ay] = slope(b.x, b.y), am = Math.hypot(ax, ay);
      if (sp < 2 && am < 28) { b.vx = b.vy = 0; continue; } // una bola parada no se mueve en una pendiente suave
      b.vx += ax * h; b.vy += ay * h; const s2 = Math.hypot(b.vx, b.vy), dec = FR * (b.p < 0 ? 1.15 : 1) * h;
      if (s2 <= dec) { b.vx = b.vy = 0; } else { b.vx *= (s2 - dec) / s2; b.vy *= (s2 - dec) / s2; }
      b.x += b.vx * h; b.y += b.vy * h; b.rot += s2 * h / b.r;
      if (b.x < PX0 + b.r) { b.x = PX0 + b.r; b.vx = Math.abs(b.vx) * 0.35; } if (b.x > PX1 - b.r) { b.x = PX1 - b.r; b.vx = -Math.abs(b.vx) * 0.35; k.sfx('click'); }
      if (b.y < PY0 + b.r) { b.y = PY0 + b.r; b.vy = Math.abs(b.vy) * 0.35; } if (b.y > PY1 - b.r) { b.y = PY1 - b.r; b.vy = -Math.abs(b.vy) * 0.35; }
    }
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) { const a = balls[i], b = balls[j]; if (a.fly || b.fly) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), rr = a.r + b.r;
      if (d < rr && d > 0) { const nx = dx / d, ny = dy / d, ov = rr - d, im = 1 / a.m + 1 / b.m; a.x -= nx * ov * (1 / a.m) / im; a.y -= ny * ov * (1 / a.m) / im; b.x += nx * ov * (1 / b.m) / im; b.y += ny * ov * (1 / b.m) / im;
        const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rv > 0) { const jj = (1 + 0.8) * rv / im; a.vx -= jj / a.m * nx; a.vy -= jj / a.m * ny; b.vx += jj / b.m * nx; b.vy += jj / b.m * ny; if (rv > 40) { k.sfx('click'); if (rv > 180) { k.burst((a.x + b.x) / 2, (a.y + b.y) / 2, '#fff', 8, 120); k.shake(3); } } } } }
  }
}
const jack = () => balls.find((b) => b.p < 0);
const moving = () => balls.some((b) => b.fly || Math.hypot(b.vx, b.vy) > 2);
function bestD() { const j = jack(), d = PL.map(() => Infinity); for (const b of balls) if (b.p >= 0) d[b.p] = Math.min(d[b.p], Math.hypot(b.x - j.x, b.y - j.y)); return d; }
function holder() { const d = bestD(); let h = -1, m = Infinity; d.forEach((v, i) => { if (v < m) { m = v; h = i; } }); return h; }
function nextThrower() {
  const d = bestD(), h = holder(), cand = PL.map((q, i) => i).filter((i) => left[i] > 0 && i !== h);
  if (!cand.length) return left[h] > 0 ? h : -1;
  cand.sort((a, b) => (d[b] - d[a]) || (((a - cur + PL.length) % PL.length) - ((b - cur + PL.length) % PL.length))); return cand[0];
}
function endScore() {
  const d = bestD(), h = holder(), j = jack(), others = Math.min(...d.filter((v, i) => i !== h)); const won = balls.filter((b) => b.p === h && Math.hypot(b.x - j.x, b.y - j.y) < others);
  pts[h] += won.length; opener = h; measure = { h, won, n: won.length }; st = 'measure'; stT = 2.6; k.sfx('coin'); say(`+${won.length} para ${nm(h)}`, pc(h), 2);
}
function petAfterSettle() {
  if (st === 'jack') { st = 'intro'; stT = 1.1; cur = opener; return; }
  if (measure) return; const h = holder(), was = cur;
  const n = nextThrower(); if (n < 0) return endScore();
  if (h >= 0) { if (lastHold !== h) say(h === cur ? '¡Tienes el punto!' : `Punto para ${nm(h)}`, pc(h), 1.1); lastHold = h; }
  cur = n; st = 'intro'; stT = 0.9; aimT = 0; if (n !== was) style = 0;
}
/* CPU: simula sus tiros (con los desniveles) y elige el que deja la bola más cerca; el error baja con su nivel */
function simStop(a, g, s) {
  const S = STY[s], D = distOf(g), land = S.v ? D : D * S.f, v = S.v || Math.sqrt(2 * FR * Math.max(0, D - land)); let x = CX + Math.cos(a) * land, y = CY + Math.sin(a) * land, vx = Math.cos(a) * v, vy = Math.sin(a) * v; const h = 1 / 60;
  for (let i = 0; i < 700; i++) { const [ax, ay] = slope(x, y), sp = Math.hypot(vx, vy); if (sp < 2 && Math.hypot(ax, ay) < 28) break; vx += ax * h; vy += ay * h; const s2 = Math.hypot(vx, vy), dec = FR * h; if (s2 <= dec) break; vx *= (s2 - dec) / s2; vy *= (s2 - dec) / s2; x += vx * h; y += vy * h;
    if (x < PX0 + BR || x > PX1 - BR || y < PY0 + BR || y > PY1 - BR) { x = clamp(x, PX0 + BR, PX1 - BR); y = clamp(y, PY0 + BR, PY1 - BR); break; } }
  return [x, y];
}
function cpuPlan() {
  const j = jack(), d = bestD(), h = holder(), sk = LV / 10; let best = null;
  // ¿tirar contra la bola rival que tiene el punto?
  if (h >= 0 && h !== cur && d[h] < 28 && Math.random() < 0.15 + sk * 0.4 && left[cur] > 0) {
    const tb = balls.filter((b) => b.p === h).sort((p, q) => Math.hypot(p.x - j.x, p.y - j.y) - Math.hypot(q.x - j.x, q.y - j.y))[0], D = Math.hypot(tb.x - CX, tb.y - CY);
    best = { a: Math.atan2(tb.y - CY, tb.x - CX), g: (D - 120) / 560, s: 2 };
  } else {
    const s = Math.random() < 0.3 + sk * 0.3 ? 1 : 0, a0 = Math.atan2(j.y - CY, j.x - CX); let bd = Infinity;
    for (let da = -0.16; da <= 0.1601; da += 0.02) for (let g = 0; g <= 1.0001; g += 0.02) { const [x, y] = simStop(a0 + da, g, s), e = Math.hypot(x - j.x, y - j.y); if (e < bd) { bd = e; best = { a: a0 + da, g, s }; } }
  }
  best.a += gauss() * (0.03 - sk * 0.02); best.g = clamp(best.g + gauss() * (0.04 - sk * 0.028), 0.02, 0.98); /* 1.23: CPU base floja */
  plan = { ...best, t: 0, stT: 0 };
}
function petUpdate(dt) {
  throwerPose = Math.max(0, throwerPose - dt);
  if (st === 'intro') { stT -= dt; if (stT <= 0) { st = 'aim'; aimT = 0; charging = false; gauge = 0; } return; }
  if (st === 'measure') { stT -= dt; if (stT <= 0) { if (pts.some((p) => p >= TARGET) || endN >= MAXE) return finish(PL.map((q, i) => ({ i, score: pts[i] })), (v) => `${v} puntos`); startEnd(); } return; }
  if (st === 'jack' || st === 'roll') { physics(dt); if (!moving()) { settleT += dt; if (settleT > 0.35) petAfterSettle(); } else settleT = 0; return; }
  if (st !== 'aim') return;
  aimT += dt; const p = seats[cur].p;
  if (charging) { chT += dt; const u = (chT / 0.8) % 2; gauge = u < 1 ? u : 2 - u; }
  if (isCpu(cur)) {
    if (!plan) cpuPlan(); plan.t += dt; if (plan.t < 0.5) return;
    if (style !== plan.s && (plan.stT += dt) > 0.3) { plan.stT = 0; style = (style + 1) % 3; k.sfx('click'); }
    const da = plan.a - aimA; if (Math.abs(da) > 0.004) { aimA += Math.sign(da) * Math.min(Math.abs(da), 0.6 * dt); return; }
    if (style !== plan.s) return;
    if (!charging) { charging = true; chT = 0; gauge = 0; k.sfx('click'); return; }
    if ((chT > 0.1 && Math.abs(gauge - plan.g) < 0.02) || (chT >= 1.6 && Math.abs(gauge - plan.g) < 0.035) || chT > 5) throwBall(cur, aimA, gauge, style);
    return;
  }
  const dy = k.pdir(p).y; aimA = clamp(aimA + dy * 0.55 * dt * (charging ? 0.4 : 1), -0.75, 0.75);
  if (k.phit(p, 'b')) { style = (style + 1) % 3; k.sfx('click'); }
  if (k.pheld(p, 'a')) { if (!charging) { charging = true; chT = 0; gauge = 0; k.sfx('click'); } }
  else if (charging && !(localPtr(cur) && k.ptr.down)) { throwBall(cur, aimA, gauge, style); return; }
  if (localPtr(cur)) {
    if (k.ptr.hit) { if (k.ptr.x > W - 190 && k.ptr.y > H - 64) { style = (style + 1) % 3; k.sfx('click'); k._skipUp = true; } else { charging = true; chT = 0; gauge = 0; k.sfx('click'); } }
    if (k.ptr.down && charging) aimA = clamp(Math.atan2(k.ptr.y - CY, Math.max(20, k.ptr.x - CX)), -0.75, 0.75);
  }
  if (aimT > 25) throwBall(cur, aimA, charging ? gauge : 0.5, style);
}
function drawBoule(b) {
  const z = b.z || 0, s = 1 + z / 110, r = b.r * s, x = b.x, y = b.y - z * 0.55;
  c.fillStyle = `rgba(40,25,10,${0.35 - Math.min(0.2, z / 400)})`; c.beginPath(); c.ellipse(b.x + 2 + z * 0.15, b.y + 3, b.r * (1 + z / 300), b.r * 0.7, 0, 0, TAU); c.fill();
  if (b.p < 0) { c.beginPath(); c.arc(x, y, r, 0, TAU); const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, 0.5, x, y, r); g.addColorStop(0, '#fff3a8'); g.addColorStop(1, '#f2a31b'); c.fillStyle = g; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); return; }
  const col = pc(b.p); c.beginPath(); c.arc(x, y, r, 0, TAU); const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, 0.5, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#c9d0de'); g.addColorStop(1, '#69718a'); c.fillStyle = g; c.fill();
  c.save(); c.clip(); c.strokeStyle = col; c.lineWidth = r * 0.55; c.beginPath(); const a = b.rot; c.moveTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2); c.lineTo(x - Math.cos(a) * r * 1.2, y - Math.sin(a) * r * 1.2); c.stroke(); c.restore();
  c.lineWidth = 2.2; c.strokeStyle = OUT; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.17, -0.6, 0, TAU); c.fill();
}
function petDraw() {
  c.drawImage(terrCv, 0, 0, W, H);
  const j = jack();
  // guía de puntería
  if (st === 'aim' && k.st === 'play') { const col = pc(cur), S = STY[style], ca = Math.cos(aimA), sa = Math.sin(aimA);
    c.setLineDash([6, 7]); c.lineWidth = 2.5; c.strokeStyle = ART.alpha('#ffffff', 0.75); c.beginPath(); c.moveTo(CX + ca * 28, CY + sa * 28); c.lineTo(CX + ca * 170, CY + sa * 170); c.stroke(); c.setLineDash([]);
    if (charging) { const D = distOf(gauge), land = S.v ? D : D * S.f; const lx = CX + ca * land, ly = CY + sa * land;
      for (let i = 1; i <= 14; i++) { const u = i / 15, x = lerp(CX, lx, u), y = lerp(CY, ly, u) - (S.apex * 4 * u * (1 - u)) * 0.55; c.globalAlpha = 0.85; c.beginPath(); c.arc(x, y, 2.6, 0, TAU); ART.fillOut(c, '#fff', 1.2); } c.globalAlpha = 1;
      c.lineWidth = 4; c.strokeStyle = OUT; c.beginPath(); c.arc(lx, ly, 9, 0, TAU); c.stroke(); c.lineWidth = 2.5; c.strokeStyle = col; c.stroke();
      if (!S.v) { const sx = CX + ca * D, sy = CY + sa * D; c.setLineDash([3, 4]); c.lineWidth = 2; c.strokeStyle = ART.alpha(col, 0.8); c.beginPath(); c.arc(sx, sy, 12, 0, TAU); c.stroke(); c.setLineDash([]); } } }
  // bolas (las que vuelan, encima)
  for (const b of balls) if (!b.fly) drawBoule(b); for (const b of balls) if (b.fly) drawBoule(b);
  // medición al terminar la mano
  if (measure && j) { const col = pc(measure.h); measure.won.forEach((b, n) => { c.setLineDash([4, 4]); c.lineWidth = 2.5; c.strokeStyle = col; c.beginPath(); c.moveTo(j.x, j.y); c.lineTo(b.x, b.y); c.stroke(); c.setLineDash([]); label(String(n + 1), b.x + 12, b.y - 14, 15, col); });
    c.lineWidth = 3; c.strokeStyle = '#fff'; c.beginPath(); c.arc(j.x, j.y, 14 + Math.sin(t * 6) * 2, 0, TAU); c.stroke(); }
  else if (j && st !== 'jack' && balls.length > 1) { const h = holder(); if (h >= 0) { c.lineWidth = 3; c.strokeStyle = ART.alpha(pc(h), 0.9); c.beginPath(); c.arc(j.x, j.y, 13 + Math.sin(t * 5) * 1.5, 0, TAU); c.stroke(); } }
  // jugador en el círculo
  if (k.st === 'play' && seats[cur]) ART.hero(c, CX - 30, CY + 10, 1.25, { face: 1, state: throwerPose > 0 ? 'jump' : 'idle', t, col: pc(cur) });
  // marcador
  const n = PL.length, cw = Math.min(190, (W - 150) / n);
  PL.forEach((q, i) => { const x = 8 + i * (cw + 6), me = i === cur && k.st === 'play'; panel(x, 6, cw, 50, 11, me ? ART.alpha(pc(i), 0.35) : 'rgba(26,21,48,.82)', me ? 3 : 2.5);
    c.beginPath(); c.arc(x + 17, 22, 8, 0, TAU); ART.fillOut(c, pc(i), 2); label(nm(i), x + 30, 22, 15, '#fff', 'left'); label(String(pts[i]), x + cw - 12, 22, 20, '#ffd166', 'right');
    for (let m = 0; m < nBalls(); m++) { c.globalAlpha = m < left[i] ? 1 : 0.25; drawBoule({ p: i, x: x + 17 + m * 17, y: 43, r: 6, rot: 0.6, z: 0 }); } c.globalAlpha = 1; });
  panel(W - 136, 6, 128, 50, 11, 'rgba(26,21,48,.82)'); label(`Mano ${endN}`, W - 72, 21, 16, '#fff'); label(`a ${TARGET} puntos`, W - 72, 41, 12, '#cfc8ff');
  // estilo de tiro
  if (st === 'aim' && k.st === 'play' && !isCpu(cur)) { panel(W - 186, H - 58, 178, 50, 11, 'rgba(26,21,48,.85)'); label(`B: ${STY[style].n}`, W - 97, H - 42, 17, '#ffd166'); label(STY[style].sub, W - 97, H - 22, 12, '#e6e1ff');
    // barra de fuerza
    const bx = 14, by = H - 58; panel(bx, by, 190, 50, 11, 'rgba(26,21,48,.85)'); ART.rr(c, bx + 10, by + 28, 170, 12, 6); c.fillStyle = '#1b1438'; c.fill(); if (charging) { ART.rr(c, bx + 10, by + 28, Math.max(12, 170 * gauge), 12, 6); c.fillStyle = pc(cur); c.fill(); }
    label(charging ? `${(distOf(gauge) / 50).toFixed(1)} m` : (k.party ? '↑↓ apunta · mantén A' : '↑↓ apunta · mantén A o toca'), bx + 95, by + 15, 13, '#fff'); }
  if (st === 'aim' && isCpu(cur) && k.st === 'play') label(`${nm(cur)} · ${STY[style].n}`, W - 110, H - 30, 16, pc(cur));
  if (st === 'intro' && k.st === 'play') banner(`Turno de ${nm(cur)}`, `Mano ${endN} · quedan ${left[cur]} bola${left[cur] === 1 ? '' : 's'}`, pc(cur));
  drawMsg(110);
}

/* =====================================================================================================
 * TIRO CON ARCO
 * ===================================================================================================== */
const DIST = [30, 50, 70], ARROWS = 3, TX = 430, TY = 206, RAD = { 30: 118, 50: 84, 70: 58 }, WMAX = { 30: 2, 50: 3.5, 70: 5 };
let rnd = 0, arrowN = 0, sx = 0, sy = 0, drift = { x: 0, y: 0, vx: 0, vy: 0 }, draw = 0, drawT = 0, breathT = 0, lung = 1, holdB = false, wind = 0, windT = 0, arrows = [], flying = null, score = [], xs = [], ends = [], cpuA = null, ptrLast = null, tired = 0;
const R = () => RAD[DIST[rnd]];
function arcReset() { seats = k.players(nPl()); PL = seats.map((q, i) => ({ i })); score = PL.map(() => 0); xs = PL.map(() => 0); ends = PL.map(() => [[], [], []]); rnd = 0; cur = 0; startTurn(); }
function startTurn() { arrowN = 0; arrows = []; st = 'intro'; stT = 1.2; newArrow(); }
function newArrow() { sx = k.rnd(-0.6, 0.6) * R(); sy = k.rnd(0.5, 0.9) * R(); drift = { x: 0, y: 0, vx: k.rnd(-1, 1), vy: k.rnd(-1, 1) }; draw = 0; drawT = 0; breathT = k.rnd(0, 4); lung = 1; holdB = false; tired = 0; wind = k.rnd(-1, 1) * WMAX[DIST[rnd]] * (0.35 + 0.65 * Math.random()); windT = 0; cpuA = null; ptrLast = null; }
const windNow = () => wind * (1 + 0.18 * Math.sin(windT * 1.7) + 0.08 * Math.sin(windT * 4.3));
const driftOf = (w) => w * Math.pow(DIST[rnd] / 70, 1.5) * 0.19 * R();
/* oscilación de la mira: respiración (4 s; calma tras espirar), aguantar con B (2,5 s), cansancio si tensas mucho rato */
function sway() {
  const ph = (breathT % 4) / 4, br = holdB ? (lung > 0 ? 0.12 : 1.7) : 0.18 + 0.82 * Math.pow(Math.sin(ph * Math.PI), 2);
  const amp = (4 + DIST[rnd] * 0.06) * (br + tired * 1.2) * (R() / 84);
  return [Math.sin(t * 1.9) * amp + Math.sin(t * 4.7) * amp * 0.35 + drift.x, Math.cos(t * 1.6) * amp * 0.8 + Math.sin(t * 3.9) * amp * 0.3 + drift.y, br];
}
function ringOf(d) { const r = d / R(); if (r > 1) return 0; return Math.max(1, 10 - Math.floor(r * 10)); }
function shoot() {
  const [wx, wy] = sway(), under = Math.max(0, 0.92 - draw) / 0.92, ix = sx + wx + driftOf(windNow()), iy = sy + wy + under * R() * 1.4, d = Math.hypot(ix, iy), pts = ringOf(d), X = d < R() * 0.05;
  flying = { x: ix, y: iy, t: 0, T: 0.35 + DIST[rnd] / 100, pts, X }; draw = 0; k.sfx('shoot'); st = 'fly';
}
function arcLand() {
  const f = flying; flying = null; const i = cur; arrows.push({ x: f.x, y: f.y, pts: f.pts, X: f.X, col: pc(i), wob: 1 });
  score[i] += f.pts; if (f.X) xs[i]++; ends[i][rnd].push(f.X ? 'X' : f.pts ? String(f.pts) : 'M');
  if (f.pts >= 10) { say(f.X ? '¡X! Pleno' : '¡10!', '#ffd166'); k.sfx('win'); k.burst(TX + f.x, TY + f.y, '#ffd166', 18, 140); } else if (f.pts >= 8) { say(`${f.pts}`, '#7cf7a0', 0.9); k.sfx('coin'); } else if (f.pts) { say(`${f.pts}`, '#fff', 0.9); k.sfx('hit'); } else { say('Fuera', '#ff9a9a', 0.9); k.sfx('hurt'); }
  k.shake(f.pts ? 2 : 0); arrowN++; st = 'after'; stT = 1.1;
}
function arcNext() {
  if (arrowN < ARROWS) { newArrow(); st = 'aim'; return; }
  cur++; if (cur >= PL.length) { cur = 0; if (rnd + 1 >= DIST.length) { cur = PL.length - 1; return finish(PL.map((q, i) => ({ i, score: score[i] * 100 + xs[i] })), (v) => `${Math.floor(v / 100)} puntos${v % 100 ? ` (${v % 100} X)` : ''}`); } rnd++; }
  startTurn();
}
function arcUpdate(dt) {
  windT += dt; for (const a of arrows) a.wob = Math.max(0, a.wob - dt * 3);
  if (st === 'intro') { stT -= dt; if (stT <= 0) st = 'aim'; return; }
  if (st === 'fly') { flying.t += dt; if (flying.t >= flying.T) arcLand(); return; }
  if (st === 'after') { stT -= dt; if (stT <= 0) arcNext(); return; }
  if (st !== 'aim') return;
  breathT += holdB ? 0 : dt; if (holdB) lung = Math.max(0, lung - dt / 2.5); else lung = Math.min(1, lung + dt / 3);
  // deriva lenta de la mira que hay que corregir
  drift.vx += gauss() * dt * 9; drift.vy += gauss() * dt * 9; drift.vx *= 0.97; drift.vy *= 0.97; drift.x = clamp(drift.x + drift.vx * dt * 3, -R() * 0.35, R() * 0.35); drift.y = clamp(drift.y + drift.vy * dt * 3, -R() * 0.35, R() * 0.35);
  if (draw >= 1) { drawT += dt; tired = Math.max(0, drawT - 7) * 0.25; }
  const p = seats[cur].p, spd = R() * 0.9;
  if (isCpu(cur)) { cpuArc(dt, spd); return; }
  const d = k.pdir(p); sx = clamp(sx + d.x * spd * dt, -R() * 1.6, R() * 1.6); sy = clamp(sy + d.y * spd * dt, -R() * 1.6, R() * 1.6);
  holdB = k.pheld(p, 'b') && draw > 0;
  let pull = k.pheld(p, 'a');
  if (localPtr(cur)) { if (k.ptr.down) { pull = true; if (ptrLast) { sx = clamp(sx + (k.ptr.x - ptrLast[0]) * 0.55, -R() * 1.6, R() * 1.6); sy = clamp(sy + (k.ptr.y - ptrLast[1]) * 0.55, -R() * 1.6, R() * 1.6); } ptrLast = [k.ptr.x, k.ptr.y]; } else ptrLast = null; }
  if (pull) { if (draw === 0) k.sfx('click'); draw = Math.min(1, draw + dt / 0.9); }
  else if (draw > 0) { if (draw > 0.25) shoot(); else draw = 0; }
}
function cpuArc(dt, spd) {
  const sk = LV / 10;
  if (!cpuA) cpuA = { t: 0, ex: gauss() * R() * (0.2 - sk * 0.12), ey: gauss() * R() * (0.18 - sk * 0.1), wait: k.rnd(0.2, 0.8), readW: 0.55 + sk * 0.4 + gauss() * 0.12 };
  cpuA.t += dt; const [wx, wy, br] = sway(), tx = -driftOf(windNow()) * cpuA.readW + cpuA.ex - (wx - drift.x) * 0, ty = cpuA.ey;
  const ax = tx - drift.x, ay = ty - drift.y, dx = ax - sx, dy = ay - sy, L = Math.hypot(dx, dy); if (L > 1) { const m = Math.min(L, spd * 0.8 * dt); sx += dx / L * m; sy += dy / L * m; }
  if (cpuA.t > 0.4) draw = Math.min(1, draw + dt / 0.9);
  if (draw >= 1 && L < 4 && cpuA.t > 1.2 + cpuA.wait && (br < 0.35 || cpuA.t > 6)) shoot();
}
/* arte cacheado: prado, diana y parapeto */
let arcBg = null, targetSpr = {};
function targetCv(r) { return targetSpr[r] || (targetSpr[r] = mk(r * 2 + 40, r * 2 + 40, (g) => { g.translate(r + 20, r + 20);
  const cols = ['#f4f1ea', '#f4f1ea', '#2a2735', '#2a2735', '#2f8fe0', '#2f8fe0', '#e5343f', '#e5343f', '#ffd23a', '#ffd23a'];
  // parapeto de paja
  g.beginPath(); g.arc(0, 0, r * 1.14, 0, TAU); ART.fillOut(g, '#d9b25a', 3); for (let i = 0; i < 90; i++) { const a = hr(i, 1) * TAU, d = r * (1.02 + hr(i, 2) * 0.1); g.strokeStyle = 'rgba(120,80,20,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.cos(a) * d, Math.sin(a) * d); g.lineTo(Math.cos(a + 0.05) * (d + 3), Math.sin(a + 0.05) * (d + 3)); g.stroke(); }
  for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(0, 0, r * (1 - i / 10), 0, TAU); g.fillStyle = cols[i]; g.fill(); g.lineWidth = 1; g.strokeStyle = i === 2 || i === 3 ? 'rgba(255,255,255,.5)' : 'rgba(26,21,48,.55)'; g.stroke(); }
  g.lineWidth = 1; g.strokeStyle = 'rgba(26,21,48,.6)'; g.beginPath(); g.arc(0, 0, r * 0.05, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-3, 0); g.lineTo(3, 0); g.moveTo(0, -3); g.lineTo(0, 3); g.stroke();
  g.lineWidth = 3; g.strokeStyle = OUT; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.14, 0, TAU); g.fill(); })); }
function arcArt() {
  arcBg = mk(W, H, (g) => {
    // suelo del campo (el cielo y colinas los pinta ART.background)
    const hy = 250; let gr = g.createLinearGradient(0, hy, 0, H); gr.addColorStop(0, '#8fd16a'); gr.addColorStop(1, '#4f9a3f'); g.fillStyle = gr; g.fillRect(0, hy, W, H - hy);
    for (let i = 0; i < 9; i++) { const y = hy + Math.pow(i / 9, 1.8) * (H - hy); g.fillStyle = i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,50,0,.06)'; g.fillRect(0, y, W, (H - hy) / 9 * (1 + i * 0.3)); }
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; for (const [a, b] of [[-0.6, -1.3], [0.6, 1.3]]) { g.beginPath(); g.moveTo(TX + a * 60, hy + 4); g.lineTo(TX + b * 260, H); g.stroke(); }
    for (let i = 0; i < 300; i++) { const y = hy + hr(i, 5) * (H - hy), s = 0.5 + (y - hy) / (H - hy) * 2; g.strokeStyle = 'rgba(40,90,30,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(hr(i, 6) * W, y); g.lineTo(hr(i, 6) * W + s, y - s * 3); g.stroke(); }
  });
}
function drawTarget() {
  const r = R(), dd = DIST[rnd], legH = 70 * r / 84 + 26;
  // caballete
  c.lineCap = 'round'; for (const [x0, x1] of [[-0.55, -0.85], [0.55, 0.85]]) { c.strokeStyle = OUT; c.lineWidth = 9 * r / 84 + 2; c.beginPath(); c.moveTo(TX + x0 * r, TY + r * 0.6); c.lineTo(TX + x1 * r, TY + r + legH); c.stroke(); c.strokeStyle = '#8a5a2c'; c.lineWidth = 6 * r / 84 + 1; c.stroke(); }
  ART.shadow(c, TX, TY + r + legH, r * 1.2, 0.25);
  c.drawImage(targetCv(r), TX - r - 20, TY - r - 20, r * 2 + 40, r * 2 + 40);
  panel(TX - 40, TY - r * 1.14 - 30, 80, 24, 8, 'rgba(26,21,48,.8)', 2); label(`${dd} m`, TX, TY - r * 1.14 - 18, 15, '#fff');
}
function drawArrowIn(a) { const x = TX + a.x, y = TY + a.y, wob = Math.sin(t * 40) * a.wob * 3;
  c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10 + wob, y + 7); c.stroke(); c.strokeStyle = '#e8d2a8'; c.lineWidth = 2.5; c.stroke();
  c.beginPath(); c.moveTo(x + 8 + wob, y + 5); c.lineTo(x + 16 + wob, y + 5); c.lineTo(x + 13 + wob, y + 11); c.closePath(); ART.fillOut(c, a.col, 1.5); c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fillStyle = OUT; c.fill(); }
function drawWind() {
  const w = windNow(), fx = 110, fy = 120, L = Math.min(1, Math.abs(w) / 5), dir = Math.sign(w) || 1;
  c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(fx, fy - 10); c.lineTo(fx, 250); c.stroke(); c.strokeStyle = '#d9dde8'; c.lineWidth = 3; c.stroke();
  // manga de viento: se estira con la fuerza
  const segs = 4; for (let i = 0; i < segs; i++) { const u0 = i / segs, u1 = (i + 1) / segs, len = 70, sag = (1 - L) * 36, fl = Math.sin(t * 9 + i) * (2 + L * 3);
    const x0 = fx + dir * len * u0 * (0.35 + 0.65 * L), x1 = fx + dir * len * u1 * (0.35 + 0.65 * L), y0 = fy + sag * u0 * u0 + fl, y1 = fy + sag * u1 * u1 + fl, h0 = 13 - u0 * 5, h1 = 13 - u1 * 5;
    c.beginPath(); c.moveTo(x0, y0 - h0); c.lineTo(x1, y1 - h1); c.lineTo(x1, y1 + h1); c.lineTo(x0, y0 + h0); c.closePath(); ART.fillOut(c, i % 2 ? '#fff' : '#ff5a3d', 2); }
  panel(fx - 62, 262, 124, 44, 10, 'rgba(26,21,48,.82)'); label(`${w > 0.05 ? '→' : w < -0.05 ? '←' : '·'} ${Math.abs(w).toFixed(1)} m/s`, fx, 277, 16, Math.abs(w) > 3 ? '#ff9a9a' : '#fff'); label('viento', fx, 295, 11, '#cfc8ff');
}
function drawBow() {
  // arco en primer plano (abajo a la derecha): se tensa con draw
  const bx = 690, by = 330, pull = draw * 46; c.save(); c.translate(bx, by); c.rotate(-0.12);
  c.lineCap = 'round'; c.lineWidth = 11; c.strokeStyle = OUT; c.beginPath(); c.moveTo(-8, -150); c.quadraticCurveTo(46 - pull * 0.2, -40, 20, 0); c.quadraticCurveTo(46 - pull * 0.2, 40, -8, 150); c.stroke();
  c.lineWidth = 7; c.strokeStyle = '#8a4b22'; c.stroke(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,220,170,.5)'; c.beginPath(); c.moveTo(-4, -140); c.quadraticCurveTo(40 - pull * 0.2, -40, 18, -6); c.stroke();
  c.strokeStyle = '#f4f1ea'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-8, -150); c.lineTo(-10 - pull, 0); c.lineTo(-8, 150); c.stroke();
  ART.rr(c, 12, -18, 22, 36, 7); ART.fillOut(c, '#3a2f5c', 2.5); // empuñadura
  if (st === 'aim' || st === 'intro') { c.lineWidth = 5; c.strokeStyle = OUT; c.beginPath(); c.moveTo(-10 - pull, 0); c.lineTo(70 - pull, -2); c.stroke(); c.lineWidth = 2.5; c.strokeStyle = '#e8d2a8'; c.stroke();
    c.beginPath(); c.moveTo(-8 - pull, 0); c.lineTo(4 - pull, -7); c.lineTo(8 - pull, 0); c.lineTo(4 - pull, 7); c.closePath(); ART.fillOut(c, pc(cur), 1.5); c.beginPath(); c.moveTo(70 - pull, -6); c.lineTo(82 - pull, -2); c.lineTo(70 - pull, 3); c.closePath(); ART.fillOut(c, '#b8c0d0', 1.5); }
  c.restore();
}
function arcDraw() {
  ART.background(c, ART.THEMES.meadow, W, 262, 0, 0, t); c.drawImage(arcBg, 0, 0, W, H);
  drawTarget(); for (const a of arrows) drawArrowIn(a);
  if (flying) { const u = flying.t / flying.T, e = u * u * (3 - 2 * u), x = lerp(640, TX + flying.x, e), y = lerp(330, TY + flying.y, e) - Math.sin(u * Math.PI) * 30, s = lerp(2.2, 0.5, e); c.save(); c.translate(x, y); c.scale(s, s); c.rotate(-0.2); c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(26, 4); c.stroke(); c.strokeStyle = '#e8d2a8'; c.lineWidth = 2.5; c.stroke(); c.restore(); }
  drawWind(); drawBow();
  // mira
  if (st === 'aim' && k.st === 'play') { const [wx, wy, br] = sway(), x = TX + sx + wx, y = TY + sy + wy, col = pc(cur), rr = 15;
    for (const [lw, cl] of [[5, OUT], [2.5, draw >= 1 ? col : '#fff']]) { c.strokeStyle = cl; c.lineWidth = lw; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.moveTo(x - rr - 9, y); c.lineTo(x - 5, y); c.moveTo(x + 5, y); c.lineTo(x + rr + 9, y); c.moveTo(x, y - rr - 9); c.lineTo(x, y - 5); c.moveTo(x, y + 5); c.lineTo(x, y + rr + 9); c.stroke(); }
    c.beginPath(); c.arc(x, y, 2.4, 0, TAU); c.fillStyle = col; c.fill();
    // tensión y respiración
    const px = 560, py = 16; panel(px, py, 230, 58, 11, 'rgba(26,21,48,.85)'); label('Tensión', px + 44, py + 15, 12, '#e6e1ff'); ART.rr(c, px + 82, py + 9, 138, 12, 6); c.fillStyle = '#1b1438'; c.fill(); if (draw > 0) { ART.rr(c, px + 82, py + 9, Math.max(12, 138 * draw), 12, 6); c.fillStyle = draw >= 1 ? (tired > 0 ? '#ff9a3d' : '#7cf7a0') : '#ffd166'; c.fill(); }
    label(holdB ? 'Aguantas' : 'Respira', px + 44, py + 40, 12, holdB ? '#5ce1e6' : '#e6e1ff'); ART.rr(c, px + 82, py + 34, 138, 12, 6); c.fillStyle = '#1b1438'; c.fill(); const calm = 1 - br; ART.rr(c, px + 82, py + 34, Math.max(12, 138 * (holdB ? lung : calm)), 12, 6); c.fillStyle = holdB ? '#5ce1e6' : calm > 0.7 ? '#7cf7a0' : '#8a86b5'; c.fill();
    if (!isCpu(cur) && arrowN === 0 && rnd === 0) label(k.party ? 'Mantén A para tensar · mueve la mira · suelta · B aguanta el aire' : 'Mantén A (o el dedo) para tensar, mueve la mira y suelta · B aguanta el aire', W / 2, H - 16, 14, '#fff'); }
  // marcador
  const n = PL.length; panel(8, 8, 228, 26 + n * 30, 11, 'rgba(26,21,48,.85)'); label(`Distancia ${rnd + 1}/3 · ${DIST[Math.min(rnd, 2)]} m`, 122, 22, 13, '#cfc8ff');
  PL.forEach((q, i) => { const y = 48 + i * 30, me = i === cur && k.st === 'play'; if (me) { ART.rr(c, 12, y - 13, 220, 26, 8); c.fillStyle = ART.alpha(pc(i), 0.3); c.fill(); } c.beginPath(); c.arc(26, y, 7, 0, TAU); ART.fillOut(c, pc(i), 2);
    label(nm(i), 40, y, 14, '#fff', 'left'); const e = ends[i][Math.min(rnd, 2)] || []; label(e.join(' '), 172, y, 12, '#ffd166', 'right'); label(String(score[i]), 226, y, 16, '#fff', 'right'); });
  if (st === 'intro' && k.st === 'play') banner(`Turno de ${nm(cur)}`, `${DIST[rnd]} m · ${ARROWS} flechas`, pc(cur));
  drawMsg(100);
}

/* ---------------- Bucle ---------------- */
function reset() { st = 'intro'; stT = 1; msgT = 0; if (MODE === 'petanca') petReset(); else arcReset(); }
if (MODE === 'arco') arcArt();
reset();
k.show(CFG.title, MODE === 'petanca'
  ? 'Acerca tus bolas al boliche. ↑ ↓ apuntan, B cambia el tiro (arrimar, bombear o tirar) y mantén A: suelta con la fuerza justa. El terreno tiene cuestas: la bola rueda hacia abajo. En el móvil, mantén el dedo donde quieras tirar y suelta.'
  : 'Mantén A para tensar el arco, mueve la mira con el joystick y suelta. El viento desvía la flecha y la mira oscila con la respiración: dispara en la calma o aguanta el aire con B. En el móvil, mantén el dedo, arrastra para apuntar y suelta.');
k.run((dt) => {
  t += dt; msgT -= dt; if (!k.gate(reset)) return;
  if (MODE === 'petanca') petUpdate(dt); else arcUpdate(dt);
}, () => { if (MODE === 'petanca') petDraw(); else arcDraw(); });
window.__ti = { get st() { return st; }, get cur() { return cur; }, get pts() { return MODE === 'petanca' ? pts : score; }, get balls() { return balls; }, get rnd() { return rnd; }, get endN() { return endN; } };
