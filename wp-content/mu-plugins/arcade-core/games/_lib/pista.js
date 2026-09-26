/* pista.js — Pruebas de habilidad con técnica de pulsación para 1–4 jugadores (la CPU rellena las plazas). Lienzo 800×450.
 * CFG.mode 'atletismo' (Juegos de Pista): 100 m lisos, 100 m vallas, salto de longitud y jabalina, puntos por puesto
 * en cada prueba (5-3-2-1) y podio final.
 * Técnica de carrera: cada zancada pide el pie contrario (I = ← o A, D = → o B). La zancada «madura» con un ritmo que
 * sube con la velocidad (anillo del carril): pulsar en la zona verde acelera mucho, pronto o tarde acelera poco,
 * machacar (pulsar antes de tiempo) casi no suma y repetir pie hace tropezar. Salida: pulsar antes del disparo = +0,3 s.
 * Vallas (13 m y cada 8,5 m): ↑ salta; se pasa limpia si la valla queda en el centro del salto, si no se derriba y frena.
 * Longitud (tabla a 40 m) y jabalina (línea a 30 m): mantén ↑ para subir el ángulo y suelta para saltar/lanzar; pasarse
 * de la tabla o la línea es nulo. 3 intentos por cabeza, cuenta el mejor. Distancia = f(velocidad, ángulo ideal ≈20°/37°).
 * Táctil (solo J1 fuera de la tele): mitad izquierda I, derecha D, franja superior ↑.
 * CPU: nivel 0..10 en localStorage 'cpu:<id>' (ritmo más o menos preciso; sube media vez cuando le gana el único humano). */
const W = 800, H = 450, OUT = ART.OUT, TAU = 6.2832, ID = CFG.id || 'pista', PXM = 30, VMAX = 12.2;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#6ec0f0' }), c = k.ctx;
const lerp = (a, b, q) => a + (b - a) * q, clamp = k.clamp;
const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); };
const FONT = (s) => `800 ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
function label(s, x, y, size, col, align, lw) { c.font = FONT(size); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = lw || size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function panel(x, y, w, h, r, fill, lw) { ART.rr(c, x, y, w, h, r); ART.fillOut(c, fill, lw || 2.5); }
function mk(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; g.lineCap = 'round'; draw(g); return cv; }
const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return v - Math.floor(v); };
const fmtT = (s) => (s == null ? 'No acaba' : s.toFixed(2).replace('.', ',') + ' s'), fmtM = (m) => (m == null ? 'Nulo' : m.toFixed(2).replace('.', ',') + ' m');

/* ---------------- Jugadores y CPU ---------------- */
const LSK = 'cpu:' + ID; let LV = 0; try { LV = clamp(+localStorage.getItem(LSK) || 0, 0, 10); } catch (e) { /* sin almacenamiento */ }
const CNAME = ['roja', 'azul', 'amarilla', 'verde'];
let seats = [], PL = [], t = 0, msg = '', msgT = 0, msgC = '#fff';
function nPl() { if (!k.party) return 2; return Math.max(2, ...k.party.map((q) => q.p + 1)); }
const nm = (i) => (seats[i].cpu ? 'CPU ' + CNAME[seats[i].p % 4] : String(seats[i].name).slice(0, 10));
const pc = (i) => k.pcol(seats[i].p);
const isCpu = (i) => seats[i].cpu;
k.onParty = () => { if (k.st === 'ready' || !PL.length) reset(); else seats = k.players(PL.length); };
function say(s, col, d) { msg = s; msgC = col || '#fff'; msgT = d || 1.3; }

/* ---------------- Entrada: mando/teclado por jugador + zonas táctiles de J1 ---------------- */
const TZ = { L: 0, R: 0, U: 0, uh: new Set() };
const zoneOf = (e) => { const r = k.cv.getBoundingClientRect(), x = (e.clientX - r.left) / k.scale, y = (e.clientY - r.top) / k.scale; return y < H * 0.4 ? 'U' : x < W / 2 ? 'L' : 'R'; };
addEventListener('pointerdown', (e) => { if (k.party || k.st !== 'play' || k.paused) return; const z = zoneOf(e); if (z === 'U') { TZ.U = 1; TZ.uh.add(e.pointerId); } else TZ[z] = 1; });
const tzUp = (e) => TZ.uh.delete(e.pointerId); addEventListener('pointerup', tzUp); addEventListener('pointercancel', tzUp);
const local = (i) => !k.party && seats[i].p === 0 && !seats[i].cpu;
function inp(i) { const p = seats[i].p, lo = local(i);
  return { L: k.phit(p, 'left') || k.phit(p, 'a') || (lo && TZ.L), R: k.phit(p, 'right') || k.phit(p, 'b') || (lo && TZ.R), U: k.phit(p, 'up') || (lo && TZ.U), UH: k.pheld(p, 'up') || (lo && TZ.uh.size > 0) }; }
const anyA = () => seats.some((q, i) => !q.cpu && k.phit(q.p, 'a')) || k.ptr.hit;

/* ---------------- Zancada (común a carreras y carrerillas) ---------------- */
const cad = (v) => 2.1 + v * 0.2;           // zancadas por segundo según la velocidad
function mkRunner(i) { return { i, x: 0, v: 0, ph: 0.6, foot: 'L', anim: 0, air: null, stum: 0, fin: null, fs: 0, go: false, q: '', qT: 0, ang: 0, hold: false, done: false, cpu: null }; }
function stride(r, foot) {
  if (r.air) return;
  if (foot !== r.foot) { r.v *= 0.93; r.stum = 0.18; r.q = '¡Tropiezo!'; r.qT = 0.5; if (!isCpu(r.i)) k.sfx('hurt'); return; }
  const ph = r.ph, gap = VMAX - r.v; let q;
  if (ph < 0.45) { r.v = Math.max(0, r.v + gap * 0.016 - r.v * 0.013); q = ''; }
  else if (Math.abs(ph - 1) < 0.1) { r.v += gap * 0.16 + 0.22; q = '¡Ritmo!'; }
  else if (ph >= 0.75 && ph <= 1.25) { r.v += gap * 0.11; q = 'Bien'; }
  else { r.v += gap * 0.045; q = ph < 0.75 ? 'Pronto' : 'Tarde'; }
  if (r.stum > 0) r.v *= 0.97;
  r.v = Math.min(VMAX, r.v); r.ph = 0; r.foot = foot === 'L' ? 'R' : 'L'; if (q) { r.q = q; r.qT = 0.35; }
}
function runTick(r, dt) {
  r.stum = Math.max(0, r.stum - dt); r.qT -= dt;
  if (r.air) { r.air.t += dt; r.v = Math.max(0, r.v - 0.25 * dt); } else { r.ph += cad(r.v) * dt; if (r.ph > 1.5) r.v = Math.max(0, r.v - 3 * dt); }
  r.v = Math.max(0, r.v - (0.3 + 0.004 * r.v * r.v) * dt); r.x += r.v * dt; r.anim += dt * (0.25 + r.v / 10.5);
}
/* CPU: pulsa el pie correcto cerca del centro de la zona; su precisión sube con el nivel */
function cpuRun(r, dt) {
  if (!r.cpu) r.cpu = { at: 1 + gauss() * cpuSig() };
  if (r.air) return;
  if (r.ph >= r.cpu.at) { if (Math.random() < 0.035 - LV * 0.002) stride(r, r.foot === 'L' ? 'R' : 'L'); else stride(r, r.foot); r.cpu.at = clamp(1 + gauss() * cpuSig(), 0.5, 1.45); }
}
const cpuSig = () => 0.26 - LV * 0.013; /* 1.23: CPU base floja */

/* ---------------- Pruebas ---------------- */
const EV = [
  { id: '100', n: '100 m lisos', race: true, help: 'Alterna I y D al ritmo del anillo de tu carril: en la zona verde aceleras de verdad; machacar no sirve. Sal con el disparo, no antes.' },
  { id: 'vallas', n: '100 m vallas', race: true, hurdles: true, help: 'Como los 100 m, y ↑ para saltar cada valla: despega unos dos metros antes para pasarla limpia.' },
  { id: 'long', n: 'Salto de longitud', field: true, XB: 40, amax: 45, ideal: 20, help: 'Coge carrerilla y, antes de la tabla, mantén ↑ para subir el ángulo (lo ideal ronda 20°). Suelta para saltar sin pisar la línea.' },
  { id: 'jav', n: 'Jabalina', field: true, XB: 30, amax: 60, ideal: 37, help: 'Coge carrerilla y mantén ↑ para subir el ángulo (lo ideal ronda 37°). Suelta para lanzar antes de la línea roja.' },
];
const HX = [...Array(10).keys()].map((n) => 13 + n * 8.5), PTS = [5, 3, 2, 1], TRIES = 3;
let ev = 0, phase = 'card', phT = 0, R = [], hurd = [], raceT = 0, gunT = 0, camX = 0, total = [], res = [], tri = 0, turn = 0, ath = null, obj = null, marks = [];
function reset() { seats = k.players(nPl()); PL = seats.map((q, i) => ({ i })); total = PL.map(() => 0); ev = 0; startEvent(); msgT = 0; }
function startEvent() { phase = 'card'; phT = 3.2; res = PL.map(() => null); tri = 0; turn = 0; marks = []; camX = -6; if (EV[ev].race) setupRace(); else setupField(); }
/* ---- carreras (simultáneas, 4 calles) ---- */
function setupRace() { R = PL.map((q, i) => mkRunner(i)); hurd = PL.map(() => HX.map((x) => ({ x, down: 0 }))); raceT = 0; gunT = k.rnd(1.1, 2.1); camX = -6; }
function raceUpdate(dt) {
  if (phase === 'marks') { phT -= dt; if (phT <= 0) { phase = 'set'; phT = gunT; k.sfx('tick'); } }
  else if (phase === 'set') { phT -= dt; if (phT <= 0) { phase = 'run'; raceT = 0; k.sfx('shoot'); k.flash('rgba(255,255,255,.4)'); k.shake(3); R.forEach((r) => { if (isCpu(r.i)) r.cpu = { at: 1, react: k.rnd(0.14, 0.3) - LV * 0.006 }; }); } }
  const running = phase === 'run' || phase === 'end';
  if (running) raceT += dt;
  for (const r of R) {
    const cpu = isCpu(r.i), I = cpu ? null : inp(r.i);
    if (!running) { if (phase === 'set' && I && (I.L || I.R) && !r.fs) { r.fs = 0.3; say(`Salida nula de ${nm(r.i)}: +0,3 s`, '#ff9a9a', 1.4); k.sfx('hurt'); } continue; }
    if (!r.go) { const can = raceT >= r.fs + (cpu ? (r.cpu && r.cpu.react) || 0.2 : 0); if (!can) continue; if (cpu || I.L || I.R) { r.go = true; r.v = 1.6; r.ph = 0.5; if (!cpu && I.R) r.foot = 'L'; } else continue; }
    if (r.fin == null || r.x < 106) {
      if (cpu) { cpuRun(r, dt); if (EV[ev].hurdles && !r.air) { const nx = hurd[r.i].find((h) => h.x > r.x && !h.down); if (nx) { if (!r.cpu.jd) r.cpu.jd = 0.5 * r.v * airT(r.v) + gauss() * (0.9 - LV * 0.05); if (nx.x - r.x <= r.cpu.jd) { jump(r); r.cpu.jd = 0; } } } }
      else { if (I.L) stride(r, 'L'); if (I.R) stride(r, 'R'); if (EV[ev].hurdles && I.U) jump(r); }
    }
    const x0 = r.x; runTick(r, dt); if (r.fin != null) r.v = Math.max(0, r.v - 6 * dt);
    if (r.air && r.air.t >= r.air.T) { r.air = null; r.ph = 0.7; k.burst(laneX(r.x), laneY(r.i), '#e8a07a', 4, 40); }
    if (EV[ev].hurdles) for (const h of hurd[r.i]) if (!h.down && x0 < h.x && r.x >= h.x) {
      const u = r.air ? r.air.t / r.air.T : -1, hh = u >= 0 ? 4 * u * (1 - u) : 0;
      if (hh < 0.55) { h.down = 0.01; r.v *= r.air ? 0.8 : 0.5; r.stum = r.air ? 0.2 : 0.4; r.q = r.air ? 'Valla tocada' : '¡Choque!'; r.qT = 0.7; k.sfx('hit'); if (!isCpu(r.i)) k.shake(3); } }
    if (r.fin == null && r.x >= 100) { r.fin = raceT - (r.x - 100) / Math.max(1, r.v); k.sfx(R.filter((q) => q.fin != null).length === 1 ? 'win' : 'coin'); k.burst(laneX(100), laneY(r.i) - 30, pc(r.i), 16, 150); }
    for (const h of hurd[r.i]) if (h.down) h.down = Math.min(1, h.down + dt * 5);
  }
  if (phase === 'run') { const lead = Math.max(...R.map((r) => r.x)); camX += (lead - 17 - camX) * Math.min(1, dt * 4); camX = clamp(camX, -6, 96);
    const done = R.every((r) => r.fin != null), fins = R.filter((r) => r.fin != null).map((r) => r.fin);
    if (done || (fins.length && raceT > Math.min(...fins) + 9) || raceT > 45) { phase = 'end'; phT = 1.4; } }
  if (phase === 'end') { const lead = Math.max(...R.map((r) => r.x)); camX += (Math.min(lead, 104) - 17 - camX) * Math.min(1, dt * 4); camX = clamp(camX, -6, 96); }
  if (phase === 'end') { phT -= dt; if (phT <= 0) raceResults(); }
}
const airT = (v) => 0.42 + v * 0.012;
function jump(r) { if (r.air || !r.go) return; r.air = { t: 0, T: airT(r.v) }; if (!isCpu(r.i)) k.sfx('jump'); }
function raceResults() { res = R.map((r) => r.fin); award(res.map((v) => (v == null ? Infinity : v)), true); }
/* puntos por puesto (empates comparten) */
function award(vals, asc) {
  const order = vals.map((v, i) => i).sort((a, b) => (asc ? vals[a] - vals[b] : vals[b] - vals[a]));
  const place = PL.map(() => 0); order.forEach((i, n) => { place[i] = n > 0 && vals[i] === vals[order[n - 1]] ? place[order[n - 1]] : n; });
  const bad = (v) => (asc ? v === Infinity : v <= 0);
  PL.forEach((q, i) => { q.place = bad(vals[i]) ? PL.length - 1 : place[i]; q.got = bad(vals[i]) ? 0 : PTS[place[i]] || 0; total[i] += q.got; });
  phase = 'results'; phT = 5; k.sfx('fanfare');
}
/* ---- saltos y lanzamientos (por turnos) ---- */
function setupField() { res = PL.map(() => null); PL.forEach((q) => { q.tries = []; }); tri = 0; turn = 0; }
function startAttempt() { ath = mkRunner(turn); ath.x = 0; obj = null; phase = 'ready'; phT = 1.2; camX = -8; }
function fieldUpdate(dt) {
  const E = EV[ev];
  if (phase === 'ready') { phT -= dt; camX += (ath.x - 8 - camX) * Math.min(1, dt * 5); if (phT <= 0) { phase = 'runup'; phT = 0; ath.go = false; } return; }
  if (phase === 'runup') {
    const cpu = isCpu(ath.i), I = cpu ? null : inp(ath.i);
    if (cpu) { if (!ath.cpu) { const sk = LV / 10, th = clamp(E.ideal + gauss() * (7 - sk * 4), 5, E.amax), xr = E.XB - Math.abs(gauss()) * (0.7 - sk * 0.4) - 0.1 + (Math.random() < 0.1 - sk * 0.06 ? 0.4 : 0); ath.cpu = { at: 1, th, xr }; ath.go = true; ath.v = 1.5; }
      cpuRun(ath, dt); const RATE = 55; if (!ath.hold && ath.x >= ath.cpu.xr - ath.v * (ath.cpu.th / RATE)) ath.hold = true; if (ath.hold) { ath.ang += RATE * dt; if (ath.ang >= ath.cpu.th) takeoff(); } }
    else { if (!ath.go && (I.L || I.R)) { ath.go = true; ath.v = 1.5; ath.ph = 0.5; if (I.R) ath.foot = 'L'; }
      if (ath.go) { if (I.L) stride(ath, 'L'); if (I.R) stride(ath, 'R'); }
      if (I.UH && ath.go) { if (!ath.hold) { ath.hold = true; k.sfx('click'); } ath.ang = Math.min(E.amax, ath.ang + 55 * dt); } else if (ath.hold) takeoff(); }
    if (phase === 'runup') { runTick(ath, dt); phT += dt; if (ath.x > E.XB + 1.2) foul('Te pasaste'); else if (phT > 25) foul('Sin tiempo'); }
    camX += (ath.x - 8 - camX) * Math.min(1, dt * 5); return;
  }
  if (phase === 'air') {
    obj.t += dt; const u = Math.min(1, obj.t / obj.T); obj.x = lerp(obj.x0, obj.x1, u); obj.y = 4 * u * (1 - u) * obj.hmax; obj.u = u;
    ath.v = Math.max(0, ath.v - (E.id === 'jav' ? 8 : 0) * dt); if (E.id === 'jav') { ath.x += ath.v * dt; ath.anim += dt * ath.v / 10; } else { ath.x = obj.x; }
    camX += (obj.x - (E.id === 'jav' ? 14 : 8) - camX) * Math.min(1, dt * 6);
    if (u >= 1) { const m = obj.foul ? null : Math.max(0, obj.x1 - E.XB); land(m); }
    return;
  }
  if (phase === 'shown') { phT -= dt; if (phT <= 0) nextAttempt(); }
}
function takeoff() {
  const E = EV[ev], a = ath, fl = a.x > E.XB; a.hold = false;
  const th = a.ang, v = a.v; let D, hmax, T;
  if (E.id === 'long') { D = 0.083 * v * v * Math.exp(-Math.pow((th - E.ideal) / 15, 2)) + 0.4; hmax = Math.max(0.3, D * Math.tan(th * Math.PI / 180) * 0.25); T = 0.45 + D * 0.06; }
  else { const vr = 15 + 2.4 * v; D = 0.66 * vr * vr / 9.8 * Math.exp(-Math.pow((th - E.ideal) / 17, 2)) + 3; hmax = Math.max(1, D * Math.tan(th * Math.PI / 180) * 0.25); T = 1.1 + D / 45; }
  obj = { x0: a.x, x1: a.x + D, x: a.x, y: 0, t: 0, T, hmax, foul: fl, u: 0, th }; phase = 'air'; k.sfx('jump');
  if (fl) { say('¡Nulo! Pisaste la línea', '#ff9a9a', 1.6); k.sfx('hurt'); }
}
function foul(why) { obj = null; phase = 'shown'; phT = 1.6; say(`Nulo · ${why}`, '#ff9a9a', 1.5); k.sfx('hurt'); PL[turn].tries.push(null); ath.v = Math.max(0, ath.v * 0.3); }
function land(m) {
  PL[turn].tries.push(m); phase = 'shown'; phT = 1.8;
  if (m != null) { const best = Math.max(...PL.map((q) => Math.max(0, ...q.tries.filter((v) => v != null)))); marks.push({ x: obj.x1, i: turn, m });
    say(fmtM(m), m >= best ? '#ffd166' : '#fff', 1.5); k.sfx(m >= best ? 'win' : 'coin'); k.burst(sx(obj.x1), groundY() , EV[ev].id === 'long' ? '#f2d79a' : '#6fbf4f', 14, 110); if (EV[ev].id === 'long') k.shake(2); }
}
function nextAttempt() {
  turn++; if (turn >= PL.length) { turn = 0; tri++; }
  if (tri >= TRIES) { res = PL.map((q) => { const v = q.tries.filter((x) => x != null); return v.length ? Math.max(...v) : null; }); award(res.map((v) => (v == null ? 0 : v)), false); return; }
  startAttempt();
}
function nextEvent() { if (ev + 1 >= EV.length) { k.st = 'over'; phase = 'done'; const hum = seats.filter((q) => !q.cpu);
    if (hum.length === 1) { const top = Math.max(...total), hi = total.indexOf(top), humWin = !seats[hi].cpu && total.filter((v) => v === top).length === 1; LV = clamp(LV + (humWin ? 0.5 : -0.5), 0, 10); try { localStorage.setItem(LSK, LV); } catch (e) { /* sin almacenamiento */ } }
    k.podium(PL.map((q, i) => ({ p: seats[i].p, score: total[i], name: nm(i) })), { fmt: (v) => `${v} ${v === 1 ? 'punto' : 'puntos'}` }); return; }
  ev++; startEvent(); }

/* ---------------- Bucle ---------------- */
function update(dt) {
  t += dt; msgT -= dt;
  if (!k.gate(reset)) { TZ.L = TZ.R = TZ.U = 0; return; }
  if (phase === 'card') { phT -= dt; if (phT <= 0 || (phT < 2.4 && anyA())) { if (EV[ev].race) { phase = 'marks'; phT = 1.1; } else startAttempt(); } }
  else if (phase === 'results') { phT -= dt; if (phT <= 0 || (phT < 3.8 && anyA())) nextEvent(); }
  else if (EV[ev].race) raceUpdate(dt); else fieldUpdate(dt);
  TZ.L = TZ.R = TZ.U = 0;
}

/* ---------------- Dibujo ---------------- */
const TOPY = 206, LANE = 50, groundY = () => 356;
const laneY = (i) => TOPY + 40 + i * (PL.length > 2 ? 46 : 64);
const laneX = (x) => 150 + (x - camX) * PXM;
const sx = (x) => 150 + (x - camX) * PXM;
const STANDS = mk(640, 150, (g) => {
  g.fillStyle = '#4a4f7a'; g.fillRect(0, 0, 640, 150); for (let r = 0; r < 7; r++) { g.fillStyle = r % 2 ? '#565b8a' : '#4d5282'; g.fillRect(0, 16 + r * 18, 640, 18); }
  for (let r = 0; r < 7; r++) for (let i = 0; i < 64; i++) { const x = i * 10 + (r % 2) * 5 + hr(i, r) * 3, y = 30 + r * 18, cl = ['#ff5fa2', '#ffd166', '#5ce1e6', '#7cf7a0', '#ffffff', '#ff8a3c', '#b98cff'][Math.floor(hr(i, r + 9) * 7)];
    if (hr(i, r + 3) < 0.18) continue; g.fillStyle = cl; g.beginPath(); g.arc(x, y - 6, 3.2, 0, TAU); g.fill(); g.fillRect(x - 3.5, y - 3, 7, 6); }
  g.fillStyle = '#2e3052'; g.fillRect(0, 0, 640, 14); g.fillStyle = '#ffd166'; for (let x = 0; x < 640; x += 80) g.fillRect(x + 10, 4, 50, 6);
  g.fillStyle = '#23254a'; g.fillRect(0, 140, 640, 10); g.fillStyle = OUT; g.fillRect(0, 148, 640, 2);
});
function drawStadium(field) {
  ART.background(c, ART.THEMES.meadow, W, 120, camX * 3, 0, t);
  const off = -((camX * PXM * 0.5) % 640 + 640) % 640; for (let x = off; x < W; x += 640) c.drawImage(STANDS, x, 60, 640, 150);
  // pista
  const y0 = TOPY; let gr = c.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, '#d1603f'); gr.addColorStop(1, '#b44a2f'); c.fillStyle = gr; c.fillRect(0, y0, W, 210);
  c.fillStyle = '#5fae4a'; c.fillRect(0, y0 + 210, W, H - y0 - 210); c.fillStyle = OUT; c.fillRect(0, y0 - 2, W, 3); c.fillRect(0, y0 + 208, W, 3);
  if (!field) { const n = PL.length; for (let i = 0; i <= n; i++) { const y = (i === 0 ? y0 + 10 : laneY(i - 1) + (PL.length > 2 ? 23 : 32)); c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(0, y - 1, W, 2); } }
  // marcas cada 10 m
  const m0 = Math.floor(camX / 10) * 10; for (let m = m0; m < camX + W / PXM; m += 10) { if (m < 0 || (!field && m > 100)) continue; const x = sx(m); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - 1, y0 + 10, 2, 196); label(String(m), x, y0 + 200, 11, '#fff'); }
}
/* ---------- Ley de la pieza única (REMASTER §8) ----------
 * uni(): traza TODAS las partes y las rellena después, así los contornos interiores quedan
 * tapados y solo sobrevive el borde exterior de la silueta. inw(): detalle interior recortado
 * contra esa silueta. Las separaciones internas se leen por sombra propia o por cambio de
 * color, nunca por stroke. Una pieza solo se separa cuando se mueve de verdad. */
function uni(g, parts, ow) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = ow * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); } }
const all = (parts) => (g) => { for (const p of parts) p(g); };
function inw(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
const rp = (g, x, y, w, h, r) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const cp = (g, x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); g.closePath(); };
const ep2 = (g, x, y, rx, ry, rot) => { g.moveTo(x + rx * Math.cos(rot || 0), y + rx * Math.sin(rot || 0)); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.closePath(); };
const ply = (pts) => (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
/* hueso de ancho variable: baja por un costado, redondea la punta y vuelve por el otro, así
 * miembro y tronco se unen con tangente continua y sin escalón. */
function bone(pts, ws) {
  return (g) => {
    const n = pts.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i > 0 ? i - 1 : 0], b = pts[i < n - 1 ? i + 1 : n - 1];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
      L.push([pts[i][0] - ty * ws[i], pts[i][1] + tx * ws[i]]);
      R.push([pts[i][0] + ty * ws[i], pts[i][1] - tx * ws[i]]);
    }
    g.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(L[i][0], L[i][1], (L[i][0] + L[i + 1][0]) / 2, (L[i][1] + L[i + 1][1]) / 2);
    g.lineTo(L[n - 1][0], L[n - 1][1]);
    const e = pts[n - 1], w = ws[n - 1], a0 = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
    g.arc(e[0], e[1], w, a0, a0 - Math.PI, true);
    for (let i = n - 2; i > 0; i--) g.quadraticCurveTo(R[i][0], R[i][1], (R[i][0] + R[i - 1][0]) / 2, (R[i][1] + R[i - 1][1]) / 2);
    g.lineTo(R[0][0], R[0][1]);
    g.closePath();
  };
}
function drawHurdle(x, y, s, down) {
  c.save(); c.translate(x, y); c.scale(s, s); if (down) c.rotate(down * 1.3);
  const pA = bone([[-2, 0], [-2, -28]], [1.6, 1.4]), pB = bone([[6, 0], [6, -28]], [1.6, 1.4]), bar = (q) => rp(q, -6, -34, 16, 9, 2);
  uni(c, [[pA, '#e8ecf5'], [pB, '#e8ecf5'], [bar, '#fff']], 1.15);
  inw(c, all([pA, pB, bar]), (q) => { q.fillStyle = '#e5343f'; q.beginPath(); rp(q, -2, -33, 4, 7, 1); q.fill(); q.beginPath(); rp(q, 5, -33, 3, 7, 1); q.fill();
    q.fillStyle = 'rgba(26,21,48,.18)'; q.beginPath(); rp(q, -6, -26, 16, 3, 1.2); q.fill(); });
  c.restore();
}
function drawRunner(r, x, y, s) {
  const hh = r.air ? 4 * (r.air.t / r.air.T) * (1 - r.air.t / r.air.T) * 34 : 0;
  ART.shadow(c, x, y + 2, 12 * s * (1 - hh / 90), 0.3);
  ART.hero(c, x, y - hh, s, { face: 1, state: r.air ? (r.air.t < r.air.T / 2 ? 'jump' : 'fall') : r.v > 0.4 ? 'run' : 'idle', t: r.anim, col: pc(r.i), squash: r.stum > 0 ? 0.2 : 0 });
}
function ringHUD(r, x, y) {
  // anillo de ritmo: se llena con la zancada; la zona verde es el momento de pulsar el pie indicado
  const ph = Math.min(1.5, r.ph) / 1.5; c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.arc(x, y, 14, 0, TAU); c.stroke(); c.lineWidth = 4; c.strokeStyle = '#2b2552'; c.stroke();
  c.strokeStyle = '#46c46a'; c.beginPath(); c.arc(x, y, 14, -Math.PI / 2 + TAU * 0.75 / 1.5, -Math.PI / 2 + TAU * 1.25 / 1.5); c.stroke();
  c.strokeStyle = '#b6ff9a'; c.beginPath(); c.arc(x, y, 14, -Math.PI / 2 + TAU * 0.9 / 1.5, -Math.PI / 2 + TAU * 1.1 / 1.5); c.stroke();
  const a = -Math.PI / 2 + TAU * ph; c.beginPath(); c.arc(x + Math.cos(a) * 14, y + Math.sin(a) * 14, 4.5, 0, TAU); ART.fillOut(c, '#fff', 1.5);
  label(r.foot === 'L' ? 'I' : 'D', x, y + 1, 13, r.ph > 0.75 && r.ph < 1.25 ? '#b6ff9a' : '#fff');
}
function drawRace() {
  drawStadium(false); const n = PL.length, s = n > 2 ? 1.25 : 1.45;
  // salida y meta
  for (const [m, col] of [[0, '#fff'], [100, '#fff']]) { const x = sx(m); if (x < -20 || x > W + 20) continue; c.fillStyle = col; c.fillRect(x - 2, TOPY + 10, 4, 196); if (m === 100) for (let yy = TOPY + 10; yy < TOPY + 206; yy += 8) { c.fillStyle = (yy / 8) % 2 < 1 ? '#1a1530' : '#fff'; c.fillRect(x + 2, yy, 6, 8); } }
  if (sx(100) < W + 40 && sx(100) > -40) { label('META', sx(100), TOPY + 22, 14, '#ffd166'); }
  R.forEach((r, i) => { const y = laneY(i);
    if (EV[ev].hurdles) for (const h of hurd[i]) { const x = sx(h.x); if (x > -30 && x < W + 30) drawHurdle(x, y, s * 0.9, h.down); }
    const x = sx(r.x); if (x > -30 && x < W + 30) drawRunner(r, x, y, s); else if (x <= -30) { c.beginPath(); c.moveTo(14, y - 16); c.lineTo(30, y - 24); c.lineTo(30, y - 8); c.closePath(); ART.fillOut(c, pc(i), 2); }
    if (r.qT > 0 && x > 0 && x < W) label(r.q, x, y - 70 * s / 1.45, 13, r.q === '¡Ritmo!' ? '#b6ff9a' : r.q === 'Bien' ? '#fff' : '#ffb0a0'); });
  // placas de calle (izquierda) con anillo de ritmo y velocidad
  R.forEach((r, i) => { const y = laneY(i) - 18, col = pc(i); panel(6, y - 16, 136, 34, 10, 'rgba(26,21,48,.86)', 2.5); c.fillStyle = col; ART.rr(c, 10, y - 12, 5, 26, 2.5); c.fill();
    label(nm(i), 20, y - 5, 12, col, 'left'); if (r.fin != null) label(fmtT(r.fin), 20, y + 9, 12, '#ffd166', 'left'); else { ART.rr(c, 20, y + 6, 70, 6, 3); c.fillStyle = '#1b1438'; c.fill(); ART.rr(c, 20, y + 6, Math.max(6, 70 * r.v / VMAX), 6, 3); c.fillStyle = col; c.fill(); }
    if (!isCpu(i) && r.fin == null) ringHUD(r, 120, y + 1); });
  // barra de progreso y crono
  panel(150, 8, 500, 34, 10, 'rgba(26,21,48,.86)'); ART.rr(c, 164, 20, 400, 10, 5); c.fillStyle = '#2b2552'; c.fill();
  R.forEach((r, i) => { const x = 164 + clamp(r.x / 100, 0, 1) * 400; c.beginPath(); c.arc(x, 25, 7, 0, TAU); ART.fillOut(c, pc(i), 2); });
  label(phase === 'run' || phase === 'end' ? raceT.toFixed(2).replace('.', ',') : '0,00', 630, 25, 16, '#fff', 'right');
  if (phase === 'marks') bigText('En sus marcas…', '#fff'); else if (phase === 'set') bigText('Listos…', '#ffd166'); else if (phase === 'run' && raceT < 0.7) bigText('¡YA!', '#7cf7a0');
}
function bigText(s, col) { c.save(); c.translate(W / 2, 150); label(s, 0, 0, 40, col); c.restore(); }
function drawField() {
  const E = EV[ev]; drawStadium(true); const gy = groundY();
  // pasillo, tabla/línea y foso o césped
  c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(0, gy - 26, W, 2); c.fillRect(0, gy + 22, W, 2);
  if (E.id === 'long') { const x0 = sx(E.XB + 1), x1 = sx(E.XB + 10.5); ART.rr(c, x0, gy - 24, x1 - x0, 48, 8); ART.fillOut(c, '#f2d79a', 2.5); c.fillStyle = 'rgba(160,120,60,.25)'; for (let i = 0; i < 60; i++) c.fillRect(x0 + hr(i, 1) * (x1 - x0), gy - 20 + hr(i, 2) * 40, 2, 2);
    for (let m = 5; m <= 9; m++) { const x = sx(E.XB + m); label(`${m} m`, x, gy + 36, 11, '#fff'); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x - 1, gy + 22, 2, 6); }
    const bx = sx(E.XB); c.fillStyle = '#fff'; c.fillRect(bx - 12, gy - 24, 12, 48); c.fillStyle = '#e5343f'; c.fillRect(bx, gy - 24, 3, 48); c.strokeStyle = OUT; c.lineWidth = 1.5; c.strokeRect(bx - 12, gy - 24, 15, 48); }
  else { const lx = sx(E.XB); c.fillStyle = '#6fbf4f'; c.fillRect(Math.max(0, lx), gy - 26, W, 50); c.fillStyle = '#e5343f'; c.fillRect(lx - 3, gy - 26, 6, 50);
    for (let m = 20; m <= 110; m += 10) { const x = sx(E.XB + m); if (x < lx || x > W + 20) continue; c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(x - 1, gy - 26, 2, 50); label(`${m}`, x, gy + 36, 11, '#fff'); } }
  // marcas de los intentos buenos
  for (const mk2 of marks) { const x = sx(mk2.x); if (x < -10 || x > W + 10) continue; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(x, gy); c.lineTo(x, gy - 28); c.stroke(); c.beginPath(); c.moveTo(x, gy - 28); c.lineTo(x + 14, gy - 23); c.lineTo(x, gy - 18); c.closePath(); ART.fillOut(c, pc(mk2.i), 1.5); }
  // atleta y objeto
  if (ath) { const s = 1.6, x = sx(ath.x); let yOff = 0;
    if (phase === 'air' && E.id === 'long') { yOff = obj.y * PXM * 2.2; ART.shadow(c, x, gy + 2, 16, 0.3); ART.hero(c, x, gy - yOff, s, { face: 1, state: obj.u < 0.5 ? 'jump' : 'fall', t: ath.anim, col: pc(ath.i) }); }
    else { drawRunner(ath, x, gy, s); if (E.id === 'jav' && phase !== 'air' && phase !== 'shown') javelin(x - 8, gy - 44, -(ath.hold ? ath.ang : 8) * Math.PI / 180); }
    if (phase === 'air' && E.id === 'jav') { const u = obj.u, jx = sx(obj.x), jy = gy - 40 - obj.y * PXM * 0.5, slope = obj.hmax * 4 * (1 - 2 * u) / (obj.x1 - obj.x0), a = Math.atan2(-slope * 0.5 * PXM, PXM); javelin(jx, jy, a); ART.shadow(c, jx, gy + 2, 18, 0.2); }
    if (phase === 'shown' && E.id === 'jav' && obj && !obj.foul) javelin(sx(obj.x1), gy - 12, 0.5);
    if (ath.hold) { const a = ath.ang; panel(x - 44, gy - 118, 88, 30, 9, 'rgba(26,21,48,.88)'); label(`${Math.round(a)}°`, x, gy - 103, 17, Math.abs(a - E.ideal) < 5 ? '#7cf7a0' : '#fff'); }
    if (phase === 'runup' && !isCpu(ath.i)) ringHUD(ath, x + 44, gy - 80); if (ath.qT > 0) label(ath.q, x, gy - 104, 13, '#b6ff9a'); }
  // tabla de intentos
  panel(8, 8, 300, 28 + PL.length * 24, 10, 'rgba(26,21,48,.86)'); label(`${E.n} · intento ${Math.min(tri + 1, TRIES)}/${TRIES}`, 158, 21, 13, '#cfc8ff');
  PL.forEach((q, i) => { const y = 44 + i * 24, me = i === turn && phase !== 'results'; if (me) { ART.rr(c, 12, y - 11, 292, 22, 7); c.fillStyle = ART.alpha(pc(i), 0.3); c.fill(); } label(nm(i), 20, y, 13, pc(i), 'left');
    for (let n = 0; n < TRIES; n++) { const v = q.tries[n]; label(v === undefined ? '–' : v == null ? 'X' : v.toFixed(2).replace('.', ','), 150 + n * 52, y, 12, v == null && v !== undefined ? '#ff9a9a' : '#fff'); } });
  if (phase === 'ready') { c.save(); c.translate(W / 2, 150); panel(-170, -36, 340, 72, 16, 'rgba(26,21,48,.9)', 3); label(`Turno de ${nm(turn)}`, 0, -12, 24, pc(turn)); label(`Intento ${tri + 1} de ${TRIES}`, 0, 16, 15, '#fff'); c.restore(); }
}
function javelin(x, y, a) { c.save(); c.translate(x, y); c.rotate(a); c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(-34, 0); c.lineTo(34, 0); c.stroke(); c.strokeStyle = '#e8ecf5'; c.lineWidth = 2.5; c.stroke(); c.strokeStyle = '#ffd166'; c.lineWidth = 3; c.beginPath(); c.moveTo(-4, 0); c.lineTo(6, 0); c.stroke(); c.fillStyle = OUT; c.beginPath(); c.moveTo(34, -2.5); c.lineTo(42, 0); c.lineTo(34, 2.5); c.fill(); c.restore(); }
function drawCard() {
  const E = EV[ev]; c.fillStyle = 'rgba(12,8,30,.55)'; c.fillRect(0, 0, W, H); c.save(); c.translate(W / 2, H / 2); const e = Math.min(1, (3.2 - phT) / 0.25); c.scale(0.8 + 0.2 * e, 0.8 + 0.2 * e);
  panel(-300, -110, 600, 220, 20, 'rgba(26,21,48,.95)', 3); label(`Prueba ${ev + 1} de ${EV.length}`, 0, -80, 15, '#cfc8ff'); label(E.n, 0, -48, 34, '#ffd166');
  wrap(E.help, 0, 0, 520, 17, 24); label(k.party ? 'A para empezar' : 'Toca o pulsa A para empezar', 0, 86, 14, '#b8b0ff'); c.restore();
}
function wrap(s, x, y, maxW, size, lh) { c.font = FONT(size); const words = s.split(' '), lines = []; let ln = ''; for (const w of words) { const tt = ln ? ln + ' ' + w : w; if (c.measureText(tt).width > maxW && ln) { lines.push(ln); ln = w; } else ln = tt; } if (ln) lines.push(ln); lines.forEach((l, i) => label(l, x, y + (i - (lines.length - 1) / 2) * lh, size, '#fff')); }
function drawResults() {
  const E = EV[ev]; c.fillStyle = 'rgba(12,8,30,.6)'; c.fillRect(0, 0, W, H); c.save(); c.translate(W / 2, H / 2);
  const n = PL.length, hh = 110 + n * 40; panel(-260, -hh / 2, 520, hh, 20, 'rgba(26,21,48,.95)', 3); label(E.n, 0, -hh / 2 + 30, 26, '#ffd166');
  const order = PL.map((q, i) => i).sort((a, b) => PL[a].place - PL[b].place);
  order.forEach((i, r) => { const y = -hh / 2 + 76 + r * 40, q = PL[i], med = ['#ffd166', '#d6dbe8', '#e0995a'][q.place];
    if (med && q.got) { c.beginPath(); c.arc(-220, y, 13, 0, TAU); ART.fillOut(c, med, 2.5); label(String(q.place + 1), -220, y + 1, 13, OUT, 'center', 1); } else label(String(q.place + 1), -220, y, 15, '#8a86b5');
    label(nm(i), -196, y, 18, pc(i), 'left'); label(E.race ? fmtT(res[i]) : fmtM(res[i]), 90, y, 17, '#fff', 'right'); label(`+${q.got}`, 150, y, 17, '#7cf7a0', 'right'); label(`${total[i]} pts`, 240, y, 16, '#ffd166', 'right'); });
  c.restore();
}
function draw() {
  if (EV[ev].race) drawRace(); else drawField();
  if (k.st === 'play' && phase === 'card') drawCard();
  if (phase === 'results') drawResults();
  if (msgT > 0) { c.save(); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, W / 2, 190, 24, msgC); c.restore(); c.globalAlpha = 1; }
}
reset();
k.show(CFG.title, 'Cuatro pruebas: 100 m, vallas, longitud y jabalina. Corre alternando I y D (← → o A/B) al ritmo del anillo, no machacando; ↑ salta las vallas y, mantenido, elige el ángulo del salto o del lanzamiento. En el móvil: mitad izquierda I, derecha D y arriba ↑.');
k.run(update, draw);
window.__pi = { get ev() { return ev; }, get phase() { return phase; }, get R() { return R; }, get ath() { return ath; }, get total() { return total; }, get PL() { return PL; } };
