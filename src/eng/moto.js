/* moto — motocross lateral con física de dos ruedas (oleada 2). CFG.mode:
 *  'motocross' Motocross de Colinas: la mejor de 3 mangas contra otro piloto (humano o CPU) por circuitos de lomas,
 *              rampas, mesas, fosos y baches. Inclinarse en el aire para aterrizar con las dos ruedas a la vez da turbo;
 *              una vuelta completa (mortal) da más. Caer de cabeza devuelve al último banderín.
 * Cuerpo rígido con dos ruedas de contacto elástico sobre un terreno en polilínea (subpasos de 1/240 s), tracción
 * trasera limitada por el agarre (el gas levanta la rueda delantera), freno en las dos ruedas e inclinación del piloto.
 * Dos humanos: pantalla partida arriba/abajo. Con uno, el rival de la CPU se ve como fantasma sobre la misma pista;
 * la CPU predice dónde va a caer y alinea la moto, con errores que se reducen con las victorias (cup:<id>). */
const M = CFG.mode || 'motocross', OUT = ART.OUT, TAU = Math.PI * 2;
const W = 720, H = 405;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#7fd4ff' }), c = k.ctx;
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
const { lite, dark, alpha, rr, fillOut, glint, shadow } = ART;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
function RNG(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
const fmtT = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
let CUP = 0; try { CUP = clamp(+localStorage.getItem('cup:' + CFG.id) || 0, 0, 5); } catch (e) { /* sin almacenamiento */ }
const skill = () => clamp(0.3 + CUP * 0.06, 0.3, 0.6);

/* ---------- Terreno ---------- */
const SEG = 8, X0 = -480, NAMES = ['Lomas del Pinar', 'Cañada al Atardecer', 'Selva de Barro'], THEMES = ['meadow', 'dusk', 'jungle'];
let T = null, SEED = 1;
function buildTrack(heat) {
  const rng = RNG(SEED + heat * 7777), LEN = 6400 + heat * 1300, E = [], marks = [];
  let e = 0;
  const add = (len, f) => { const n = Math.max(1, Math.round(len / SEG)), e0 = e; for (let i = 1; i <= n; i++) E.push(f(i / n, e0)); e = E[E.length - 1]; };
  add(-X0 + 520, () => 0); /* salida llana */
  add(260, (t, e0) => e0 + 26 * (1 - Math.cos(TAU * t)) / 2);
  add(160, (t, e0) => e0);
  const xNow = () => X0 + E.length * SEG;
  while (xNow() < LEN) {
    const d = clamp(xNow() / LEN, 0, 1) * (0.65 + heat * 0.18) + heat * 0.08, r = rng();
    if (r < 0.2) { const A = (0.35 + rng() * 0.65) * lerp(40, 120, d) * (rng() < 0.3 ? -0.7 : 1); add(lerp(380, 300, d) + rng() * 200, (t, e0) => e0 + A * (1 - Math.cos(TAU * t)) / 2); }
    else if (r < 0.42) { /* rampa y mesa (o foso si la dificultad es alta) */
      const Hk = lerp(34, 78, d) * (0.8 + rng() * 0.3), Lup = Hk * 1.9 + 20, pit = d > 0.35 && rng() < 0.3 + d * 0.4, top = pit ? lerp(170, 230, d) : lerp(220, 140, d) + rng() * 80;
      add(Lup, (t, e0) => e0 + Hk * Math.pow(t, 1.5));
      marks.push({ k: 'lip', x: xNow() });
      if (pit) { const D = Hk * 1.1; add(top, (t, e0) => e0 - D * t * t * (3 - 2 * t)); /* salto a bajada: aterrizaje en cuesta abajo */ }
      else add(top, (t, e0) => e0);
      add(Hk * 2.6 + 50, (t, e0) => e0 - Hk * (1 - Math.cos(Math.PI * t)) / 2);
    } else if (r < 0.58) { const n = 4 + Math.floor(rng() * 4), A = lerp(10, 20, d); add(n * 76, (t, e0) => e0 + A * (1 - Math.cos(TAU * t * n)) / 2); }
    else if (r < 0.74) { const dE = (rng() < 0.5 ? 1 : -1) * lerp(40, 110, d) * (0.6 + rng() * 0.4); add(Math.abs(dE) * 3 + 120, (t, e0) => e0 + dE * (1 - Math.cos(Math.PI * t)) / 2); }
    else if (r < 0.86) { /* salto doble: dos rampas seguidas */
      const Hk = lerp(26, 50, d); for (let j = 0; j < 2; j++) { add(Hk * 2 + 20, (t, e0) => e0 + Hk * Math.pow(t, 1.4)); marks.push({ k: 'lip', x: xNow() }); add(Hk * 2.4 + 50, (t, e0) => e0 - Hk * (1 - Math.cos(Math.PI * t)) / 2); } }
    else add(120 + rng() * 160, (t, e0) => e0);
    if (e > 260) add(e * 2.4, (t, e0) => e0 - e0 * 0.8 * (1 - Math.cos(Math.PI * t)) / 2); /* no subir para siempre */
    if (e < -220) add(-e * 2.4, (t, e0) => e0 - e0 * 0.8 * (1 - Math.cos(Math.PI * t)) / 2);
    add(40, (t, e0) => e0);
  }
  add(1400, (t, e0) => e0); /* meta y llano final */
  const Y = E.map((v) => -v), n = Y.length;
  const gy = (x) => { const f = (x - X0) / SEG, i = clamp(Math.floor(f), 0, n - 2), q = clamp(f - i, 0, 1); return Y[i] + (Y[i + 1] - Y[i]) * q; };
  const sl = (x) => { const f = (x - X0) / SEG, i = clamp(Math.floor(f), 0, n - 2); return (Y[i + 1] - Y[i]) / SEG; };
  const cps = []; for (let x = 1200; x < LEN - 300; x += 1300) { let xx = x; while (Math.abs(sl(xx)) > 0.12 && xx < x + 600) xx += SEG; cps.push(xx); }
  const deco = []; for (let x = 200; x < LEN + 1200; x += 180 + rng() * 260) deco.push({ x, k: rng() < 0.55 ? 'tree' : rng() < 0.5 ? 'bale' : 'tyre', seed: rng(), s: 0.7 + rng() * 0.4 });
  return { Y, n, gy, sl, LEN, cps, deco, marks, name: NAMES[heat], th: ART.THEMES[THEMES[heat]] };
}

/* ---------- Motos ---------- */
const G = 900, R = 11, KS = 700, CS = 30, IN = 430, WH = [[-21, 9], [21, 9]], HEAD = [-3, -31];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const rot = (th, o) => { const cs = Math.cos(th), sn = Math.sin(th); return [o[0] * cs - o[1] * sn, o[0] * sn + o[1] * cs]; };
let bikes, heat, phase, phT, raceT, finOrder, msg, msgT, cdPend = false, parts, CN = ['roja', 'azul'];
function mkBike(p) {
  const hu = k.human(p), q = k.party && k.party.find((x) => x.p === p);
  return { p, col: k.pcol(p), cpu: !hu, name: hu ? (q && q.name) || (k.party ? 'J' + (p + 1) : 'Tú') : 'CPU', wins: 0, times: [] };
}
function placeBike(b, x) {
  const s = T.sl(x), th = Math.atan(s); b.x = x; b.y = T.gy(x) - R - 9 - 2; b.vx = 0; b.vy = 0; b.th = th; b.w = 0;
  Object.assign(b, { wa: [0, 0], con: [0, 0], airT: 0, rotAir: 0, firstT: -1, boost: 0, crash: 0, ghostT: 0, gas: 0, brake: 0, lean: 0, rider: null, errB: 0, cpuT: 0, last: x, stuckT: 0 });
}
function startHeat() {
  T = buildTrack(heat); parts = []; finOrder = []; raceT = 0; phase = 'run'; phT = 0;
  bikes.forEach((b, i) => { placeBike(b, 30 - i * 4); b.fin = 0; b.cp = 30 - i * 4; b.time = 0; });
  msg = `Manga ${heat + 1} · ${T.name}`; msgT = 3; cdPend = true;
  cams = bikes.map((b) => ({ x: b.x + 200, y: b.y - 40 }));
}
let cams = [];
function reset() { demoOn = false; SEED = (Math.random() * 1e9) | 0; heat = 0; bikes = [0, 1].map(mkBike); startHeat(); }
k.onParty = () => {
  if (k.st !== 'play') { reset(); return; }
  for (const b of bikes) { const hu = k.human(b.p), q = k.party && k.party.find((x) => x.p === b.p); b.cpu = !hu; b.col = k.pcol(b.p); b.name = hu ? (q && q.name) || (k.party ? 'J' + (b.p + 1) : 'Tú') : 'CPU'; }
};
const humans = () => bikes.filter((b) => !b.cpu);

/* ---------- Entrada ---------- */
function humanIn(b) {
  let gas = k.pheld(b.p, 'a') || k.pheld(b.p, 'up'), brake = k.pheld(b.p, 'b') || k.pheld(b.p, 'down'), d = k.pdir(b.p), lean = d.x;
  if (!k.party && b.p === 0 && k.ptr.down) { gas = true; lean = k.ptr.x < W * 0.33 ? -1 : k.ptr.x > W * 0.67 ? 1 : 0; }
  return { gas: gas ? 1 : 0, brake: brake ? 1 : 0, lean };
}
function landing(b) {
  let x = b.x, y = b.y, vx = b.vx, vy = b.vy;
  for (let t = 0; t < 2.4; t += 0.03) { vy += G * 0.03; x += vx * 0.03; y += vy * 0.03; if (y > T.gy(x) - 20) return { x, t }; }
  return { x, t: 2.4 };
}
function cpuIn(b, dt) {
  const sk = skill(), air = !b.con[0] && !b.con[1] && b.airT > 0.06, ang = Math.atan(T.sl(b.x + 20));
  let gas = 1, brake = 0, lean = 0;
  b.cpuT -= dt;
  if (air) {
    if (b.airT < 0.1 && b.errB === 0) b.errB = (Math.random() * 2 - 1) * (1 - sk) * 0.5 + 1e-3;
    if (b.airT > 0.12 * (1 - sk) + 0.05) { const L = landing(b), e = wrap(Math.atan(T.sl(L.x)) + b.errB - b.th), wt = clamp(e / Math.max(0.22, L.t * 0.6), -5, 5);
      lean = clamp((wt - b.w) * 0.9, -1, 1); if (Math.abs(lean) < 0.15) lean = 0; }
    gas = 0.3;
  } else {
    b.errB = 0;
    const rel = wrap(b.th - ang), vT = (300 + sk * 110) * (1 + rubber(b));
    if (Math.hypot(b.vx, b.vy) > vT) gas = 0;
    if (rel < -0.45) { gas = 0; lean = 1; } else if (rel > 0.45) lean = -1; else if (Math.abs(rel) > 0.15) lean = Math.sign(-rel) * 0.5;
  }
  return { gas, brake, lean };
}
function rubber(b) { const hs = humans(); if (!b.cpu || !hs.length) return 0; const h = hs.reduce((a, q) => (q.x > a.x ? q : a)); return clamp((h.x - b.x) / 3000, -0.12, 0.06); }

/* ---------- Física ---------- */
function physics(b, h, inp) {
  let fx = 0, fy = G, tq = 0; const con = [0, 0];
  const vf = b.cpu ? (0.84 + CUP * 0.014) * (1 + rubber(b)) : 1, boost = b.boost > 0 ? 1.4 : 1;
  for (let i = 0; i < 2; i++) {
    const o = rot(b.th, WH[i]), px = b.x + o[0], py = b.y + o[1], vx = b.vx - b.w * o[1], vy = b.vy + b.w * o[0];
    const s = T.sl(px), nl = Math.sqrt(1 + s * s), nx = s / nl, ny = -1 / nl, tx = 1 / nl, ty = s / nl, dist = (T.gy(px) - py) / nl, pen = R - dist;
    if (pen <= 0) continue;
    con[i] = 1; const vn = vx * nx + vy * ny, vt = vx * tx + vy * ty;
    if (pen > R * 0.75) { const q = pen - R * 0.75; b.x += nx * q; b.y += ny * q; if (vn < 0) { b.vx -= nx * vn * 0.9; b.vy -= ny * vn * 0.9; } }
    const Fn = Math.max(0, KS * pen - CS * vn); let Ft = -vt * 0.35;
    if (i === 0 && inp.gas && b.crash <= 0) Ft += Math.min(620 * vf * boost * inp.gas, 1.6 * Fn + 60);
    if (inp.brake) Ft -= Math.sign(vt) * Math.min(Math.abs(vt) * 8, 700, 1.4 * Fn);
    const Fx = nx * Fn + tx * Ft, Fy = ny * Fn + ty * Ft;
    fx += Fx; fy += Fy; tq += o[0] * Fy - o[1] * Fx;
    b.wa[i] += vt / R * h;
  }
  const air = !con[0] && !con[1], v = Math.hypot(b.vx, b.vy), cd = 0.0026 / (vf * vf) * (b.boost > 0 ? 0.7 : 1);
  fx -= cd * b.vx * v; fy -= cd * b.vy * v * 0.3;
  if (b.crash <= 0) tq += inp.lean * (air ? 8.5 : 5.5) * IN;
  b.vx += fx * h; b.vy += fy * h; b.w += (tq / IN) * h; b.w *= Math.exp(-(air ? 0.35 : 1.6) * h); b.w = clamp(b.w, -14, 14);
  b.x += b.vx * h; b.y += b.vy * h; b.th += b.w * h;
  if (air) b.rotAir += b.w * h;
  return con;
}
function stepBike(b, dt) {
  if (b.fin) { b.gas = 0; }
  if (b.ghostT > 0) b.ghostT -= dt;
  if (b.boost > 0) b.boost -= dt;
  let inp = { gas: 0, brake: 0, lean: 0 };
  if (b.crash > 0) { b.crash -= dt; if (b.rider) { const r = b.rider; r.vy += G * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.w * dt; const g = T.gy(r.x) - 8; if (r.y > g) { r.y = g; r.vy *= -0.35; r.vx *= 0.7; r.w *= 0.6; } }
    if (b.crash <= 0) { placeBike(b, b.cp); b.ghostT = 1.2; if (!b.cpu) k.sfx('start'); } }
  else if (b.fin) inp = { gas: 0, brake: Math.hypot(b.vx, b.vy) > 80 ? 1 : 0, lean: 0 };
  else inp = b.cpu ? cpuIn(b, dt) : humanIn(b);
  b.gas = inp.gas; b.lean = inp.lean;
  const N = Math.max(1, Math.ceil(dt * 240)), h = dt / N, wasAir = !b.con[0] && !b.con[1];
  let con = [0, 0];
  for (let s = 0; s < N; s++) { const cc = physics(b, h, inp); con = [con[0] || cc[0], con[1] || cc[1]]; }
  b.con = con;
  const air = !con[0] && !con[1];
  if (air) { b.airT += dt; b.firstT = -1; }
  else if (b.crash <= 0) {
    if (wasAir && b.airT > 0.3 && b.firstT < 0) b.firstT = 0;
    if (b.firstT >= 0) { b.firstT += dt;
      if (con[0] && con[1]) { const ang = Math.atan(T.sl(b.x)), good = b.firstT <= 0.1 + dt && Math.abs(wrap(b.th - ang)) < 0.32, flip = Math.abs(b.rotAir) > TAU * 0.8;
        if (flip) { b.boost = 1.8; tell(b, '¡Mortal!', '#ffd166'); if (!b.cpu) { k.sfx('win'); k.flash('rgba(255,209,102,.35)'); } }
        else if (good && b.airT > 0.45) { b.boost = 1.0; tell(b, '¡Aterrizaje perfecto!', '#7cf7a0'); if (!b.cpu) k.sfx('coin'); }
        dust(b, 10); b.firstT = -1; b.airT = 0; b.rotAir = 0; b.th = wrap(b.th); }
      else if (b.firstT > 0.5) { b.firstT = -1; b.airT = 0; b.rotAir = 0; } }
    else { b.airT = 0; b.rotAir = 0; }
    b.th = wrap(b.th);
  }
  /* caída: la cabeza o el chasis tocan el suelo */
  if (b.crash <= 0 && !b.fin) { const hd = rot(b.th, HEAD), hx = b.x + hd[0], hy = b.y + hd[1];
    if (hy > T.gy(hx) - 3 || b.y > T.gy(b.x) - 2) crash(b); }
  if (b.crash <= 0 && con[0] && b.gas && Math.random() < 0.5) dust(b, 1);
  /* banderines */
  for (const x of T.cps) if (b.x > x && b.cp < x && b.crash <= 0) { b.cp = x; if (!b.cpu) { k.sfx('coin'); tell(b, 'Banderín', '#fff'); } }
  if (b.y > T.gy(b.x) + 200) crash(b);
  /* atascado (sin avanzar 5 s): vuelve al banderín */
  if (b.crash <= 0 && !b.fin) { if (b.x > b.last + 40) { b.last = b.x; b.stuckT = 0; } else if ((b.stuckT += dt) > 5) { placeBike(b, Math.max(b.cp, 30)); b.ghostT = 1.2; if (!b.cpu) tell(b, 'Al banderín', '#fff'); } }
}
function crash(b) {
  if (b.crash > 0) return; b.crash = 1.3; b.boost = 0;
  const hd = rot(b.th, HEAD); b.rider = { x: b.x + hd[0], y: b.y + hd[1], vx: b.vx * 0.6 + 40, vy: -220, a: b.th, w: 8 };
  for (let i = 0; i < 14; i++) addPart(b.x, b.y + 8, i % 2 ? '#c98f5a' : '#8a5a3b', 180, 0.6, 3);
  if (!b.cpu) { k.sfx('hurt'); k.shake(6); tell(b, '¡Al suelo!', '#ff8a8a'); }
}
const flo = [];
function tell(b, txt, col) { flo.push({ b, txt, col, t: 1.2 }); }
function dust(b, n) { const o = rot(b.th, WH[0]); for (let i = 0; i < n; i++) addPart(b.x + o[0] - 8, b.y + o[1] + 8, i % 2 ? '#d9b07a' : '#b98a5a', 70, 0.5, 3); }
function addPart(x, y, col, spd, life, r) { if (parts.length > 260) return; const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = Math.random() * spd; parts.push({ x, y, vx: Math.cos(a) * v - 30, vy: Math.sin(a) * v, life, max: life, col, r: r * (0.6 + Math.random() * 0.6) }); }

/* ---------- Bucle ---------- */
function sim(dt) {
  raceT += dt;
  for (const b of bikes) {
    stepBike(b, dt);
    if (!b.fin && b.x >= T.LEN) { b.fin = raceT; b.time = raceT; finOrder.push(b); if (!b.cpu) { k.sfx(finOrder.length === 1 ? 'win' : 'coin'); if (finOrder.length === 1) k.confetti(b.col, 50); } }
  }
  updCams(dt);
}
/* Demostración detrás de la pantalla de inicio: dos pilotos de la CPU (también da la miniatura). */
let demoOn = false;
function attract(dt) {
  if (!demoOn || finOrder.length || raceT > 60) { reset(); demoOn = true; for (const b of bikes) b.cpu = true; msgT = 0; cdPend = false; for (let i = 0; i < 80; i++) { sim(1 / 30); updParts(1 / 30); } updCams(0, true); }
  sim(Math.min(dt, 0.05)); updParts(dt);
}
function update(dt) {
  if (k.st === 'ready' && !k.party) attract(dt);
  else if (demoOn && k.st === 'play') reset();
  if (!k.gate(reset)) return;
  if (cdPend) { cdPend = false; k.count(3); }
  if (msgT > 0) msgT -= dt;
  for (let i = flo.length - 1; i >= 0; i--) { flo[i].t -= dt; if (flo[i].t <= 0) flo.splice(i, 1); }
  updParts(dt);
  if (phase === 'stand') { phT -= dt; if (phT <= 0 || (phT < 3.2 && (k.hit.has('a') || k.ptr.hit || (k.party && k.party.some((q) => k.phit(q.p, 'a')))))) nextHeat(); updCams(dt); return; }
  if (k.counting()) { updCams(dt, true); return; }
  sim(dt);
  const hs = humans(), first = finOrder[0];
  if (finOrder.length >= 2 || (hs.length && hs.every((b) => b.fin) && raceT - Math.max(...hs.map((b) => b.fin)) > 1.5) || (first && raceT - first.fin > 10) || raceT > 180) endHeat();
}
function updParts(dt) { for (const p of parts) { p.vy += 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1); }
function updCams(dt, snap) {
  bikes.forEach((b, i) => { const cm = cams[i], v = Math.hypot(b.vx, b.vy), tx = b.x + 150 + clamp(b.vx * 0.25, -60, 90), ty = Math.min(b.y, T.gy(b.x + 200)) - 20, f = snap ? 1 : Math.min(1, dt * 4);
    cm.x += (tx - cm.x) * f; cm.y += (ty - cm.y) * Math.min(1, dt * 3.2 + (snap ? 1 : 0)); void v; });
}
function endHeat() {
  const order = bikes.slice().sort((a, b) => (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.x - a.x));
  const w = order[0]; w.wins++; bikes.forEach((b) => { b.times[heat] = b.fin ? b.fin : null; }); lastW = w;
  phase = 'stand'; phT = 5; k.sfx(w.cpu ? 'coin' : 'win'); if (!w.cpu) k.confetti(w.col, 60);
}
let lastW = null;
function nextHeat() {
  if (bikes.some((b) => b.wins >= 2) || heat >= 2) return finish();
  heat++; startHeat();
}
function finish() {
  const champ = bikes.slice().sort((a, b) => b.wins - a.wins)[0], hw = !champ.cpu;
  if (!k.party || hw) { CUP = clamp(CUP + (hw ? 1 : k.party ? 0 : -1), 0, 5); try { localStorage.setItem('cup:' + CFG.id, CUP); } catch (e) { /* sin almacenamiento */ } }
  if (!k.party) k.best(CFG.id, bikes[0].wins);
  const rows = bikes.map((b) => ({ p: b.p, score: b.wins, name: b.cpu ? 'CPU ' + CN[b.p] : b.name }));
  const head = hw && !k.party ? '¡Campeón del motocross!' : champ.cpu ? '¡Gana la CPU!' : null;
  k.podium(rows, Object.assign({ fmt: (n) => `${n} manga${n === 1 ? '' : 's'}` }, head ? { head } : {}));
}

/* ---------- Dibujo ---------- */
function views() {
  const hs = humans();
  if (hs.length >= 2) return [{ x: 0, y: 0, w: W, h: H / 2, s: 0.62, b: bikes[0] }, { x: 0, y: H / 2, w: W, h: H / 2, s: 0.62, b: bikes[1] }];
  return [{ x: 0, y: 0, w: W, h: H, s: 0.88, b: hs[0] || bikes[0] }];
}
function drawView(v, tt) {
  const cm = cams[v.b.p], VW = v.w / v.s, VH = v.h / v.s, x0 = cm.x - VW / 2, x1 = cm.x + VW / 2, y0 = cm.y - VH / 2, y1 = cm.y + VH / 2;
  c.save(); c.beginPath(); c.rect(v.x, v.y, v.w, v.h); c.clip(); c.translate(v.x, v.y);
  ART.background(c, T.th, v.w, v.h, cm.x * v.s * 0.6, clamp(cm.y * 0.4, -120, 120), tt);
  c.translate(v.w / 2, v.h / 2); c.scale(v.s, v.s); c.translate(-cm.x, -cm.y);
  /* decorado de fondo sobre la línea del suelo */
  for (const d of T.deco) { if (d.x < x0 - 80 || d.x > x1 + 80) continue; const gy = T.gy(d.x) + 4;
    if (d.k === 'tree') { c.save(); c.translate(d.x, gy); c.scale(d.s, d.s); ART.deco(c, T.th, 0, 0, 32, d.seed); c.restore(); }
    else if (d.k === 'bale') { const P = (q) => rp(q, d.x - 18, gy - 22, 36, 22, 5);
      uni(c, [[P, '#e8c35a']], 1.1);
      inw(c, P, (q) => { q.fillStyle = 'rgba(120,80,20,.28)'; for (let i = 1; i < 3; i++) q.fillRect(d.x - 18 + i * 12 - 0.8, gy - 22, 1.6, 22);
        q.fillStyle = 'rgba(0,0,0,.2)'; q.fillRect(d.x - 18, gy - 6, 36, 6); q.fillStyle = 'rgba(255,255,255,.2)'; q.fillRect(d.x - 18, gy - 22, 36, 2); }); }
    else { const P = (q) => { for (let i = 0; i < 3; i++) ep2(q, d.x, gy - 6 - i * 9, 15, 5.5); };   // la pila de neumáticos, una sola silueta
      uni(c, [[P, '#2a2632']], 1.1);
      inw(c, P, (q) => { for (let i = 0; i < 3; i++) { q.fillStyle = i % 2 ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.24)'; q.fillRect(d.x - 16, gy - 11 - i * 9, 32, 4.5); }
        q.fillStyle = '#15121c'; q.beginPath(); q.ellipse(d.x, gy - 24, 7, 2.4, 0, 0, TAU); q.fill(); }); } }
  /* banderines, salida y meta */
  for (const x of T.cps) if (x > x0 - 60 && x < x1 + 60) ART.flag(c, x, T.gy(x) + 2, tt, v.b.cp >= x ? '#7cf7a0' : '#ffd166', 70);
  for (const [x, f] of [[30, 0], [T.LEN, 1]]) { if (x < x0 - 120 || x > x1 + 120) continue; const gy = T.gy(x);
    const posts = (q) => { rp(q, x - 43, gy - 110, 6, 112, 2); rp(q, x + 37, gy - 110, 6, 112, 2); };
    const banner = (q) => rp(q, x - 50, gy - 128, 100, 24, 6);
    uni(c, [[posts, '#d0d4e2'], [banner, f ? OUT : '#ff5a5f']], 1.2);
    inw(c, all([posts, banner]), (q) => {
      if (f) for (let i = 0; i < 14; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) { q.fillStyle = '#fff'; q.fillRect(x - 50 + i * 7.2, gy - 128 + j * 8, 7.2, 8); }
      q.fillStyle = 'rgba(0,0,0,.26)'; q.fillRect(x - 60, gy - 106, 120, 4);                 // sombra propia del cartel sobre los postes
      q.fillStyle = 'rgba(0,0,0,.22)'; q.fillRect(x - 38, gy - 110, 2, 112); q.fillRect(x + 42, gy - 110, 2, 112); });
    if (!f) { c.font = '900 14px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText('SALIDA', x, gy - 116); } }
  /* terreno */
  const i0 = clamp(Math.floor((x0 - 40 - X0) / SEG), 0, T.n - 1), i1 = clamp(Math.ceil((x1 + 40 - X0) / SEG), 0, T.n - 1), yb = y1 + 60;
  const path = () => { c.beginPath(); c.moveTo(X0 + i0 * SEG, yb); for (let i = i0; i <= i1; i++) c.lineTo(X0 + i * SEG, T.Y[i]); c.lineTo(X0 + i1 * SEG, yb); c.closePath(); };
  path(); const g = c.createLinearGradient(0, y0, 0, y1 + 60); g.addColorStop(0, '#c98a52'); g.addColorStop(1, '#7a4a2a'); c.fillStyle = g; c.fill();
  c.save(); path(); c.clip(); c.lineJoin = 'round';
  for (const [off, col, lw] of [[26, 'rgba(90,50,25,.35)', 10], [60, 'rgba(90,50,25,.25)', 14], [110, 'rgba(60,30,15,.25)', 22]]) { c.beginPath(); for (let i = i0; i <= i1; i += 2) { const X = X0 + i * SEG, Y = T.Y[i] + off; i === i0 ? c.moveTo(X, Y) : c.lineTo(X, Y); } c.lineWidth = lw; c.strokeStyle = col; c.stroke(); }
  c.fillStyle = 'rgba(255,230,190,.25)'; for (let i = i0 - (i0 % 6); i <= i1; i += 6) { const X = X0 + i * SEG; c.beginPath(); c.arc(X + ((i * 37) % 13), T.Y[clamp(i, 0, T.n - 1)] + 18 + ((i * 53) % 30), 2.2, 0, TAU); c.fill(); }
  c.restore();
  c.beginPath(); for (let i = i0; i <= i1; i++) { const X = X0 + i * SEG; i === i0 ? c.moveTo(X, T.Y[i]) : c.lineTo(X, T.Y[i]); }
  c.lineWidth = 9; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke(); c.lineWidth = 5; c.strokeStyle = T.th.top === '#b98cff' ? '#e0a86a' : '#e4b47a'; c.stroke();
  c.lineWidth = 2; c.strokeStyle = 'rgba(255,245,220,.6)'; c.save(); c.translate(0, -1.5); c.stroke(); c.restore();
  for (const m of T.marks) if (m.x > x0 && m.x < x1) { const gy = T.gy(m.x - 4); c.fillStyle = '#ff5a5f'; c.beginPath(); c.moveTo(m.x - 4, gy - 3); c.lineTo(m.x - 18, gy - 10); c.lineTo(m.x - 18, gy + 4); c.closePath(); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); }
  /* motos (primero el fantasma) */
  const order = bikes.slice().sort((a, b) => (a === v.b ? 1 : 0) - (b === v.b ? 1 : 0));
  for (const b of order) if (b.x > x0 - 80 && b.x < x1 + 80) drawBike(b, tt, b !== v.b);
  for (const p of parts) { c.globalAlpha = Math.min(1, p.life / p.max * 1.5) * 0.85; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); } c.globalAlpha = 1;
  for (const f of flo) if (f.b === v.b) { c.globalAlpha = Math.min(1, f.t * 2); c.save(); c.translate(f.b.x, f.b.y - 60 - (1.2 - f.t) * 26); c.scale(1 / v.s, 1 / v.s); label(f.txt, 0, 0, 17, f.col, 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
  c.restore();
}
/* La rueda gira de verdad: es la única pieza que se separa del chasis, y lleva solo el borde
 * que la separa. Llanta, radios y buje viven dentro del recorte, sin contornos nuevos. */
function wheel(x, y, a, ghost) {
  const P = (q) => cp(q, x, y, R);
  uni(c, [[P, '#2a2433']], 1.4);
  inw(c, P, (q) => {
    q.strokeStyle = '#8e97a6'; q.lineWidth = 1.4; q.beginPath(); q.arc(x, y, R - 3.2, 0, TAU); q.stroke();
    q.strokeStyle = '#c9d0de'; q.lineWidth = 1.1; q.beginPath(); for (let i = 0; i < 4; i++) { const w = a + i * Math.PI / 4; q.moveTo(x + Math.cos(w) * (R - 3.5), y + Math.sin(w) * (R - 3.5)); q.lineTo(x - Math.cos(w) * (R - 3.5), y - Math.sin(w) * (R - 3.5)); } q.stroke();
    q.fillStyle = 'rgba(0,0,0,.45)'; q.beginPath(); q.arc(x, y, 3.4, 0, TAU); q.fill();
    q.fillStyle = '#ffd166'; q.beginPath(); q.arc(x, y, 2.4, 0, TAU); q.fill();
    q.fillStyle = 'rgba(255,255,255,.1)'; q.beginPath(); q.arc(x - R * 0.3, y - R * 0.35, R * 0.45, 0, TAU); q.fill(); }); void ghost;
}
function drawBike(b, tt, ghost) {
  c.save(); if (ghost) c.globalAlpha = 0.45; else if (b.ghostT > 0 && Math.floor(tt * 14) % 2) c.globalAlpha = 0.5;
  const gyb = T.gy(b.x); if (!ghost && b.y > gyb - 90) shadow(c, b.x, gyb + 1, 26 * clamp(1 - (gyb - b.y) / 120, 0.3, 1), 0.22);
  c.translate(b.x, b.y); c.rotate(b.th); c.lineJoin = 'round'; c.lineCap = 'round';
  const col = b.col, [rw, fw] = WH;
  if (b.boost > 0 && !ghost) for (let i = 0; i < 3; i++) { c.fillStyle = alpha(i % 2 ? '#ffd166' : '#ff9a3d', 0.8); c.beginPath(); c.ellipse(-30 - i * 8 - Math.random() * 6, -2, 7, 3, 0, 0, TAU); c.fill(); }
  /* La moto es UNA pieza: chasis, horquilla, basculante, depósito, guardabarros, escape y
   * placa fundidos en un solo trazado. Solo las ruedas se separan, porque giran de verdad. */
  const fork = bone([[13, -11], [fw[0], fw[1]]], [2.6, 1.7]);
  const swing = bone([[-2, 2], [rw[0], rw[1]]], [2.8, 1.9]);
  const pipe = bone([[-16, -5], [-26, -8]], [2.4, 1.8]);
  const chasis = ply([[-18, -6], [-4, -9], [12, -12], [18, -8], [8, 4], [-6, 6]]);
  const tank = (q) => rp(q, -7, 0, 12, 7, 2);
  const fender = ply([[-22, -9], [-6, -11], [-6, -7], [-20, -5]]);
  const plate = ply([[14, -14], [24, -12], [20, -8]]);
  const g = c.createLinearGradient(0, -12, 0, 6); g.addColorStop(0, lite(col, 0.3)); g.addColorStop(1, dark(col, 0.2));
  const P = [[fork, '#c9d0de'], [swing, '#c9d0de'], [pipe, '#8e97a6'], [fender, '#2c2838'], [plate, '#ffffff'], [tank, '#5a5f6e'], [chasis, g]];
  uni(c, P, 1.55);
  inw(c, all(P.map((q) => q[0])), (q) => {
    q.fillStyle = 'rgba(0,0,0,.22)'; q.fillRect(-8, -0.6, 14, 1.6); q.fillRect(-7, -12, 2, 20);   // separaciones por sombra propia
    q.fillStyle = 'rgba(255,255,255,.18)'; q.beginPath(); q.moveTo(-16, -7.4); q.lineTo(14, -11.4); q.lineTo(14, -10); q.lineTo(-16, -6); q.fill();
    if (b.crash <= 0) { q.fillStyle = 'rgba(0,0,0,.3)'; q.beginPath(); q.ellipse(-3 + b.lean * 3.5, -8, 9, 4.5, 0, 0, TAU); q.fill(); } });
  wheel(rw[0], rw[1], b.wa[0], ghost); wheel(fw[0], fw[1], b.wa[1], ghost);
  c.fillStyle = OUT; c.font = '900 7px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(b.p + 1), 19, -11);
  /* piloto (si no ha salido volando) */
  if (b.crash <= 0) drawRider(col, b.lean * 3.5, 0, 0, 0);
  c.restore();
  if (b.crash > 0 && b.rider) { c.save(); if (ghost) c.globalAlpha = 0.45; c.translate(b.rider.x, b.rider.y); c.rotate(b.rider.a); drawRider(col, 0, 0, 31, 1); c.restore(); }
}
/* Piloto: un cuerpo articulado, no tubos apilados. Piernas, tronco, brazo y casco son partes
 * del MISMO trazado, con tangente continua en cadera y hombro. */
function drawRider(col, lean, ox, oy, loose) {
  c.save(); c.translate(ox + lean, oy); c.lineJoin = 'round'; c.lineCap = 'round';
  const leg = bone([[-5, -13], [2, -4], [-2, 3]], [3, 2.5, 2]);
  const torso = bone([[-6, -12], [-3.5, -19], [-1, -26]], [3.8, 3.4, 2.9]);
  const arm = bone([[-1, -24], [8, -16], [14 - lean - (loose ? 4 : 0), -14]], [2.3, 1.9, 1.7]);
  const head = (q) => cp(q, 1, -31, 6.5);
  const hg = c.createRadialGradient(-1, -34, 1, 1, -31, 7); hg.addColorStop(0, lite(col, 0.5)); hg.addColorStop(1, dark(col, 0.1));
  const P = [[leg, '#3a3558'], [arm, lite(col, 0.3)], [torso, col], [head, hg]];
  uni(c, P, 1.55);
  inw(c, all(P.map((q) => q[0])), (q) => {
    q.fillStyle = 'rgba(0,0,0,.24)'; q.beginPath(); q.ellipse(-3, -12.5, 5.5, 2.2, 0.3, 0, TAU); q.fill();   // cadera
    q.beginPath(); q.ellipse(0, -25, 4.4, 2, 0, 0, TAU); q.fill();                                            // cuello
    q.fillStyle = 'rgba(255,255,255,.2)'; q.beginPath(); q.ellipse(-4, -20, 1.8, 5, 0.2, 0, TAU); q.fill();
    q.fillStyle = '#1f2a4d'; q.beginPath(); rp(q, 2, -34, 6.5, 4, 1.5); q.fill(); glint(q, -1.5, -34, 1.6); });
  c.restore();
}
function drawHUD(v) {
  const b = v.b, small = v.h < 300, x = v.x + 8, y = v.y + 6, t = b.fin || raceT;
  rr(c, x, y, small ? 150 : 170, small ? 40 : 50, 10); c.fillStyle = 'rgba(20,16,36,.66)'; c.fill(); c.lineWidth = 2; c.strokeStyle = views().length > 1 ? b.col : OUT; c.stroke();
  label(fmtT(t), x + 8, y + 4, small ? 17 : 22, b.fin ? '#7cf7a0' : '#fff');
  const o = bikes.find((q) => q !== b); label(`${b.cpu ? 'CPU' : b.name} ${b.wins} – ${o.wins} ${o.cpu ? 'CPU' : o.name}`, x + 8, y + (small ? 23 : 29), small ? 11 : 13, '#c9c3e6');
  /* barra de progreso */
  const bx0 = v.x + 190, bx1 = v.x + v.w - 20, by = v.y + (small ? 20 : 24);
  rr(c, bx0 - 4, by - 5, bx1 - bx0 + 8, 10, 5); c.fillStyle = 'rgba(20,16,36,.5)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
  for (const x2 of T.cps) { const q = x2 / T.LEN; c.fillStyle = b.cp >= x2 ? '#7cf7a0' : '#ffd166'; c.fillRect(bx0 + q * (bx1 - bx0) - 1.5, by - 7, 3, 14); }
  for (const q2 of bikes.slice().sort((a) => (a === b ? 1 : -1))) { const q = clamp(q2.x / T.LEN, 0, 1); c.beginPath(); c.arc(bx0 + q * (bx1 - bx0), by, q2 === b ? 7 : 5, 0, TAU); c.fillStyle = q2.col; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); }
  if (b.boost > 0) label('TURBO', v.x + v.w - 20, by + 12, small ? 12 : 15, '#ffd166', 'right');
}
function drawStand() {
  const bw = Math.min(W - 40, 440), bh = 170, x = (W - bw) / 2, y = (H - bh) / 2;
  c.fillStyle = 'rgba(10,6,20,.55)'; c.fillRect(0, 0, W, H);
  rr(c, x, y, bw, bh, 18); const g = c.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, '#3a3160'); g.addColorStop(1, '#221c3d'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  label(`Manga ${heat + 1} para ${lastW.cpu ? 'la CPU' : lastW.name === 'Tú' ? 'ti' : lastW.name}`, W / 2, y + 16, 22, '#ffd166', 'center');
  bikes.forEach((b, i) => { const yy = y + 58 + i * 44; rr(c, x + 14, yy, bw - 28, 36, 10); c.fillStyle = alpha(b.col, 0.22); c.fill(); c.lineWidth = 2; c.strokeStyle = b.col; c.stroke();
    label(b.cpu ? 'CPU' : b.name, x + 26, yy + 9, 18, b.col); label(b.times[heat] ? fmtT(b.times[heat]) : 'sin llegar', x + bw - 120, yy + 11, 15, '#c9c3e6', 'right');
    for (let j = 0; j < 2; j++) { c.beginPath(); c.arc(x + bw - 66 + j * 22, yy + 18, 8, 0, TAU); c.fillStyle = j < b.wins ? '#ffd166' : 'rgba(255,255,255,.14)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); } });
}
function draw() {
  const tt = performance.now() / 1000;
  c.fillStyle = '#7fd4ff'; c.fillRect(0, 0, W, H);
  const vs = views(); for (const v of vs) drawView(v, tt);
  if (vs.length > 1) { c.fillStyle = OUT; c.fillRect(0, H / 2 - 2, W, 4); }
  if (phase === 'stand') drawStand(); else { for (const v of vs) drawHUD(v); if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); label(msg, W / 2, H * 0.3, 24, '#fff', 'center'); c.globalAlpha = 1; } }
}
reset();
k.show(CFG.title, CFG.help);
k.run(update, draw);
