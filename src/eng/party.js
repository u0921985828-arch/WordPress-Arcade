/* party.js — Marco de minijuegos de fiesta por rondas para 1–4 jugadores (la CPU rellena las plazas vacías).
 * CFG.mode: 'anvil' (Lluvia de Yunques) | 'duel' (Duelo del Oeste) | 'mash' (Carrera Machacabotones) |
 *           'tug' (Tira y Afloja, 2 contra 2) | 'roulette' (Ruleta de Minijuegos: 10 rondas al azar con los anteriores
 *           y 4 minijuegos propios: Cuenta Globos, Flechas de Memoria, Reloj a Ciegas y Diana Oscilante).
 * Cada minijuego es un objeto { name, help, update(dt), draw(), done, rank } — rank[p] = nº de jugadores que quedaron
 * estrictamente por delante (los empates comparten puesto) o null si la ronda no cuenta. El marco pone presentación,
 * cuenta atrás, marcador, resultado de la ronda, la ruleta y el podio final. Solo joystick + A/B (modo tele).
 * CPU: nivel 0..11 en localStorage 'cpu:<id>' (sube si gana un humano, baja si un humano queda último). */
const W = 800, H = 450, OUT = ART.OUT, TAU = 6.2832, NP = 4, TH = ART.THEMES;
const MODE = CFG.mode || 'roulette', ID = CFG.id || MODE;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1d1840' }), c = k.ctx;
const lerp = (a, b, q) => a + (b - a) * q, ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)), clamp = k.clamp;
const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); };
const FONT = (s, wt) => `${wt || 800} ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
function label(s, x, y, size, col, align, lw) {
  c.font = FONT(size); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = lw || size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function panel(x, y, w, h, r, fill, lw) { ART.rr(c, x, y, w, h, r); ART.fillOut(c, fill, lw || 3); }
function mk(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; g.lineCap = 'round'; draw(g); return cv; }

/* ---------------- Jugadores, CPU y entrada ---------------- */
let LV = 0; try { LV = clamp(+localStorage.getItem('cpu:' + ID) || 0, 0, 11); } catch (e) { /* sin almacenamiento */ }
const SK = () => -0.3 + LV * 0.1; /* 1.23: más fácil (antes LV/5: 0…1; ahora −0,3…0,8, media subida por victoria) */
let demo = true, t = 0;
const CNAME = ['roja', 'azul', 'amarilla', 'verde'];
const cpu = (p) => demo || !k.human(p);
const col = (p) => k.pcol(p);
const tag = (p) => (cpu(p) ? 'CPU' : k.party ? 'J' + (p + 1) : 'Tú');
const nm = (p) => (cpu(p) ? 'CPU ' + CNAME[p] : k.party ? 'J' + (p + 1) : 'Tú');
const winTxt = (p) => (nm(p) === 'Tú' ? '¡Ganas tú!' : `¡Gana ${nm(p)}!`);
k.onParty = () => { /* las plazas son fijas: quien se va lo sustituye la CPU con su color y sus puntos */ };
const A = (p) => !cpu(p) && (k.phit(p, 'a') || (p === 0 && !k.party && k.ptr.hit));
const dirOf = (p, x, y) => {
  let d = k.pdir(p);
  if (p === 0 && !k.party && k.ptr.down && x != null) { const dx = k.ptr.x - x, dy = k.ptr.y - y, m = Math.hypot(dx, dy); if (m > 10) d = { x: dx / m, y: dy / m }; }
  const m = Math.hypot(d.x, d.y); return m > 1 ? { x: d.x / m, y: d.y / m } : d;
};
function tagDraw(p, x, y) {
  const s = tag(p); c.font = FONT(18); const w = c.measureText(s).width + 16;
  c.beginPath(); c.moveTo(x - 6, y + 10); c.lineTo(x + 6, y + 10); c.lineTo(x, y + 18); c.closePath(); ART.fillOut(c, col(p), 2.5);
  panel(x - w / 2, y - 13, w, 26, 9, col(p), 2.5);
  c.fillStyle = OUT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, x, y + 1);
}
const guy = (p, x, y, s, o) => ART.hero(c, x, y, s, { face: o.face || 1, state: o.state || 'idle', t: o.t == null ? t + p * 0.7 : o.t, col: col(p), squash: o.squash || 0 });
function star(x, y, r, fill) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); ART.fillOut(c, fill || '#ffd166', 2); }

/* ---------------- Sprites cacheados ---------------- */
const ANVIL = mk(80, 58, (g) => { g.translate(40, 55);
  g.beginPath(); g.moveTo(-21, 0); g.lineTo(21, 0); g.lineTo(15, -10); g.lineTo(-15, -10); g.closePath(); ART.fillOut(g, '#3b4156', 2.6);
  g.beginPath(); g.moveTo(-11, -10); g.lineTo(11, -10); g.lineTo(9, -23); g.lineTo(-9, -23); g.closePath(); ART.fillOut(g, '#4a5168', 2.6);
  g.beginPath(); g.moveTo(-37, -38); g.quadraticCurveTo(-25, -39, -20, -44); g.lineTo(31, -44); g.lineTo(31, -32); g.lineTo(18, -23); g.lineTo(-16, -23); g.quadraticCurveTo(-23, -32, -37, -38); g.closePath();
  const gr = g.createLinearGradient(0, -44, 0, -23); gr.addColorStop(0, '#a3abc6'); gr.addColorStop(1, '#4d5470'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.8; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-15, -42, 42, 3);
  g.fillStyle = '#ffd166'; g.font = '900 10px ui-rounded,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1000 kg', 7, -31);
});
const BAL = {};
const balloon = (cl) => BAL[cl] || (BAL[cl] = mk(40, 74, (g) => {
  g.strokeStyle = 'rgba(26,21,48,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(20, 44); g.bezierCurveTo(15, 54, 25, 62, 19, 73); g.stroke();
  g.beginPath(); g.moveTo(16, 46); g.lineTo(24, 46); g.lineTo(20, 40); g.closePath(); ART.fillOut(g, ART.dark(cl, 0.2), 2);
  g.beginPath(); g.ellipse(20, 22, 15, 19, 0, 0, TAU); const gr = g.createRadialGradient(14, 14, 2, 20, 22, 22); gr.addColorStop(0, ART.lite(cl, 0.45)); gr.addColorStop(0.6, cl); gr.addColorStop(1, ART.dark(cl, 0.25)); g.fillStyle = gr; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(13, 13, 3.2, 6, -0.5, 0, TAU); g.fill();
}));
const PLAZA = mk(W, H, (g) => {
  const y0 = 172;
  g.fillStyle = '#6f6a8c'; g.fillRect(0, y0 - 26, W, 30);
  g.strokeStyle = 'rgba(26,21,48,.35)'; g.lineWidth = 1.5;
  for (let r = 0; r < 2; r++) for (let x = (r % 2) * 20; x < W; x += 40) g.strokeRect(x, y0 - 26 + r * 15, 40, 15);
  g.fillStyle = '#8c86ab'; g.fillRect(0, y0 - 30, W, 6); g.strokeStyle = OUT; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, y0 - 30); g.lineTo(W, y0 - 30); g.stroke();
  const fg = g.createLinearGradient(0, y0, 0, H); fg.addColorStop(0, '#a8916f'); fg.addColorStop(1, '#dcc9a5'); g.fillStyle = fg; g.fillRect(0, y0 + 4, W, H - y0);
  let y = y0 + 4, hh = 14, row = 0;
  while (y < H) { const bw = hh * 3.2; g.strokeStyle = 'rgba(90,64,40,.32)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    for (let x = (row % 2) * bw / 2; x < W; x += bw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + hh); g.stroke(); g.fillStyle = `rgba(255,255,255,${0.04 + ((x * 7 + row * 13) % 5) * 0.012})`; g.fillRect(x + 2, y + 2, bw - 4, hh - 4); }
    y += hh; hh *= 1.1; row++; }
  g.fillStyle = 'rgba(26,21,48,.25)'; g.fillRect(0, y0 + 4, W, 6);
  g.strokeStyle = OUT; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y0 + 4); g.lineTo(W, y0 + 4); g.stroke();
});
function drawHat(x, y, s, rot) {
  c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s);
  c.beginPath(); c.ellipse(0, 0, 15, 4.2, 0, 0, TAU); ART.fillOut(c, '#9a6636', 2.2);
  ART.rr(c, -8.5, -12, 17, 12, 5); ART.fillOut(c, '#b27a44', 2.2);
  c.fillStyle = '#5a3a22'; c.fillRect(-8, -4.5, 16, 3); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-6, -10.5, 3, 5);
  c.restore();
}
function drawGun(x, y, s, f, cl, droop, loaded) {
  c.save(); c.translate(x, y); c.scale(f * s, s); c.rotate(droop || 0);
  ART.rr(c, -3, -1, 6, 9, 2); ART.fillOut(c, ART.dark(cl, 0.35), 1.6);
  ART.rr(c, -5, -5, 17, 8, 3); ART.fillOut(c, ART.lite(cl, 0.25), 1.8);
  ART.rr(c, 11, -4, 10, 6, 2); ART.fillOut(c, '#e8e3ff', 1.6);
  if (loaded) { ART.rr(c, 20, -4.5, 5, 7, 1.5); ART.fillOut(c, '#d9a86a', 1.4); }
  c.restore();
}
function arrowGlyph(x, y, r, dir, fill) {
  const a = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir];
  c.save(); c.translate(x, y); c.rotate(a); c.beginPath();
  c.moveTo(r, 0); c.lineTo(0, -r * 0.85); c.lineTo(0, -r * 0.38); c.lineTo(-r * 0.9, -r * 0.38); c.lineTo(-r * 0.9, r * 0.38); c.lineTo(0, r * 0.38); c.lineTo(0, r * 0.85); c.closePath();
  ART.fillOut(c, fill || '#fff', Math.max(2, r * 0.12)); c.restore();
}
function ground(y, top, bot) { const gr = c.createLinearGradient(0, y, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); c.fillStyle = gr; c.fillRect(0, y, W, H - y); c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

/* =====================================================================================
 * 1. LLUVIA DE YUNQUES — sombras que crecen avisan del impacto; el último en pie gana.
 * ===================================================================================== */
function mgAnvil() {
  const F = { x0: 62, x1: 738, y0: 200, y1: 432 };
  const m = { name: 'Lluvia de Yunques', help: 'Aparta a tu muñeco de las sombras que crecen. A: acelerón.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, x: [260, 540, 260, 540][p], y: [262, 262, 372, 372][p], face: p % 2 ? -1 : 1, mv: false, out: -1, dT: 0, cd: 0, ax: 0, ay: 0, aiT: 0, dash: false }));
  const an = [], land = []; let el = 0, next = 3, over = false, endT = 0;
  const inside = (a, x, y, pad) => { const rx = a.R + pad, ry = rx * 0.55; return ((x - a.x) / rx) ** 2 + ((y - a.y) / ry) ** 2 < 1; };
  function spawn() {
    const d = ease(el / 60), alive = ps.filter((q) => q.out < 0), big = el > 18 && Math.random() < 0.14, R = big ? 50 : 30, T = lerp(2.0, 1.1, d);
    let x, y; if (alive.length && Math.random() < lerp(0.3, 0.5, d)) { const q = k.pick(alive); x = q.x + k.rnd(-30, 30); y = q.y + k.rnd(-16, 16); } else { x = k.rnd(F.x0 + 20, F.x1 - 20); y = k.rnd(F.y0 + 8, F.y1 - 8); }
    an.push({ x: clamp(x, F.x0 + 8, F.x1 - 8), y: clamp(y, F.y0 + 4, F.y1 - 4), R, T, t: T, big });
    next = lerp(1.2, 0.3, d) * k.rnd(0.8, 1.2) * (big ? 1.4 : 1);
  }
  function danger(x, y, react) { let s = 0; for (const a of an) { if (a.T - a.t < react) continue; const rx = a.R + 24, ry = rx * 0.6, e = ((x - a.x) / rx) ** 2 + ((y - a.y) / ry) ** 2; if (e < 1) s += (1.2 - e) * (3.2 - Math.min(2.6, a.t)); } return s; }
  function ai(q, dt) {
    q.aiT -= dt; if (q.aiT > 0) return; q.aiT = lerp(0.26, 0.1, SK()) * k.rnd(0.8, 1.3);
    const react = lerp(0.55, 0.15, SK()), cx = (F.x0 + F.x1) / 2, cy = (F.y0 + F.y1) / 2; let best = [q.x, q.y], bc = 1e9;
    for (let i = -1; i < 16; i++) { const a = i * TAU / 16, r = i < 0 ? 0 : 58, x = q.x + Math.cos(a) * r, y = q.y + Math.sin(a) * r * 0.7;
      if (x < F.x0 + 12 || x > F.x1 - 12 || y < F.y0 + 6 || y > F.y1 - 6) continue;
      const cost = danger(x, y, react) + danger((x + q.x) / 2, (y + q.y) / 2, react) * 0.5 + Math.hypot(x - cx, (y - cy) * 1.4) * 0.0025 + Math.random() * lerp(0.7, 0.12, SK());
      if (cost < bc) { bc = cost; best = [x, y]; } }
    q.ax = best[0]; q.ay = best[1]; q.dash = danger(q.x, q.y, react) > 1.3 && Math.random() < lerp(0.3, 0.85, SK());
  }
  function impact(a) {
    k.shake(a.big ? 9 : 5); k.sfx(a.big ? 'explode' : 'hit'); k.burst(a.x, a.y, '#e6d6b0', a.big ? 22 : 12, 200);
    land.push({ x: a.x, y: a.y, R: a.R, t: 1.3 });
    for (const q of ps) if (q.out < 0 && inside(a, q.x, q.y, cpu(q.p) ? 8 : 2)) { q.out = el; k.float('¡Plof!', q.x, q.y - 60, col(q.p)); k.burst(q.x, q.y - 10, col(q.p), 14, 220); }
  }
  m.update = (dt) => {
    el += dt;
    if (!over) { next -= dt; if (el > 1.6 && next <= 0) spawn(); }
    for (let i = an.length - 1; i >= 0; i--) { const a = an[i]; a.t -= dt; if (a.t <= 0) { an.splice(i, 1); impact(a); } }
    for (let i = land.length - 1; i >= 0; i--) if ((land[i].t -= dt) <= 0) land.splice(i, 1);
    for (const q of ps) {
      if (q.out >= 0) continue;
      let d;
      if (cpu(q.p)) { ai(q, dt); const dx = q.ax - q.x, dy = q.ay - q.y, mm = Math.hypot(dx, dy); d = mm > 5 ? { x: dx / mm, y: dy / mm } : { x: 0, y: 0 }; if (q.dash && q.cd <= 0 && mm > 5) { q.dT = 0.18; q.cd = 1.2; q.dash = false; } }
      else { d = dirOf(q.p, q.x, q.y - 24); if (A(q.p) && q.cd <= 0) { q.dT = 0.18; q.cd = 1.2; k.sfx('jump'); } }
      const sp = q.dT > 0 ? 440 : 175; q.dT -= dt; q.cd -= dt;
      q.x = clamp(q.x + d.x * sp * dt, F.x0, F.x1); q.y = clamp(q.y + d.y * sp * dt * 0.8, F.y0, F.y1);
      q.mv = Math.hypot(d.x, d.y) > 0.15; if (Math.abs(d.x) > 0.2) q.face = d.x > 0 ? 1 : -1;
      if (q.dT > 0) k.burst(q.x - q.face * 8, q.y, 'rgba(230,214,176,.8)', 1, 40);
    }
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const a = ps[i], b = ps[j]; if (a.out >= 0 || b.out >= 0) continue; const dx = b.x - a.x, dy = (b.y - a.y) * 1.6, dd = Math.hypot(dx, dy); if (dd < 26 && dd > 0.01) { const push = (26 - dd) / 2, ux = dx / dd, uy = dy / dd / 1.6; a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; } }
    const alive = ps.filter((q) => q.out < 0).length;
    if (!over && (alive <= 1 || el > 75)) { over = true; endT = 1.3; const v = (q) => (q.out < 0 ? 1e9 : q.out); m.rank = ps.map((q) => ps.filter((o) => v(o) > v(q)).length); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  m.draw = () => {
    ART.background(c, TH.castle, W, 190, 0, 0, t); c.drawImage(PLAZA, 0, 0, W, H);
    for (const a of an) { const g = 1 - a.t / a.T, r = a.R * (0.3 + 0.7 * g); c.fillStyle = `rgba(26,16,50,${0.18 + 0.4 * g})`; c.beginPath(); c.ellipse(a.x, a.y, r, r * 0.55, 0, 0, TAU); c.fill();
      if (a.t < 0.55) { c.strokeStyle = `rgba(255,90,95,${0.5 + 0.5 * Math.sin(t * 30)})`; c.lineWidth = 3; c.beginPath(); c.ellipse(a.x, a.y, a.R + 4, (a.R + 4) * 0.55, 0, 0, TAU); c.stroke(); } }
    const ents = [];
    for (const q of ps) ents.push({ y: q.y, f: () => {
      if (q.out >= 0) { c.globalAlpha = 0.9; guy(q.p, q.x, q.y, 1.55, { face: q.face, state: 'fall', squash: 0.72 }); c.globalAlpha = 1; for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; star(q.x + Math.cos(a) * 20, q.y - 14 + Math.sin(a) * 6, 5); } }
      else { guy(q.p, q.x, q.y, 1.55, { face: q.face, state: q.mv ? 'run' : 'idle' }); tagDraw(q.p, q.x, q.y - 72); } } });
    for (const l of land) ents.push({ y: l.y + 0.5, f: () => { const s = l.R / 30; c.globalAlpha = Math.min(1, l.t / 0.3); c.drawImage(ANVIL, l.x - 40 * s, l.y - 52 * s, 80 * s, 58 * s); c.globalAlpha = 1; } });
    ents.sort((a, b) => a.y - b.y).forEach((e) => e.f());
    for (const a of an) { const hgt = a.t * 560; if (hgt < 470) { const s = a.R / 30; c.drawImage(ANVIL, a.x - 40 * s, a.y - hgt - 52 * s, 80 * s, 58 * s); } }
    label(`${Math.floor(el)} s`, 16, H - 22, 20, '#fff', 'left');
  };
  return m;
}

/* =====================================================================================
 * 2. DUELO DEL OESTE — espera al «¡YA!» (hay palabras trampa); quien pulsa antes, queda fuera.
 * ===================================================================================== */
function mgDuel(o) {
  const draws = o.roul ? 3 : 1, m = { name: 'Duelo del Oeste', help: 'Espera al «¡YA!» y pulsa A el primero. Ojo con las palabras trampa: si disparas antes, pierdes.', done: false, rank: null };
  const POS = [[205, 322, 1], [595, 322, -1], [125, 398, 1], [675, 398, -1]];
  const ps = POS.map(([x, y, f], p) => ({ p, x, y, f, out: false, rt: null, hat: null, wins: 0, rts: [], cpuRT: 0, fooled: false }));
  const FAKE = ['¡YAK!', '¡YO-YO!', '¡YATE!', '¡YEGUA!', '¡YOGUR!', '¡YESO!'];
  let d = 0, st = 'wait', T = 0, goAt = 0, gT = 0, sT = 0, cue = '', fakeOn = false, fakes = [], winner = [], corks = [], weed = -60;
  function newDraw() {
    d++; st = 'wait'; T = 0; gT = 0; sT = 0; winner = []; corks = []; goAt = k.rnd(2.2, 4.6);
    fakes = []; const nF = matchN() + d > 1 ? k.ri(0, 2) : k.ri(0, 1);
    for (let i = 0; i < nF; i++) { const at = k.rnd(1.1, goAt - 0.6); if (at > 1 && fakes.every((f) => Math.abs(f.at - at) > 0.8)) fakes.push({ at, w: k.pick(FAKE) }); }
    for (const q of ps) { q.out = false; q.rt = null; q.hat = null; q.cpuRT = clamp(lerp(0.5, 0.25, SK()) + gauss() * lerp(0.08, 0.04, SK()), 0.17, 0.95); q.fooled = Math.random() < lerp(0.22, 0.06, SK()); }
  }
  function falseStart(q) { q.out = true; k.sfx('hit'); k.float('¡Antes de tiempo!', q.x, q.y - 80, '#ff8a8a'); k.burst(q.x + q.f * 22, q.y - 22, '#d9a86a', 6, 90); }
  function fire() {
    k.sfx('shoot'); k.sfx('pop'); k.shake(5);
    for (const w of winner) { w.wins++; w.rts.push(w.rt); corks.push({ x: w.x + w.f * 34, y: w.y - 20, vx: w.f * 900, life: 0.5 }); k.burst(w.x + w.f * 36, w.y - 20, '#fff4c0', 10, 160); }
    for (const q of ps) if (!winner.includes(q)) q.hat = { x: q.x + q.f * 0.6, y: q.y - 47, vx: k.rnd(-120, 120), vy: k.rnd(-330, -250), r: 0, vr: k.rnd(-9, 9) };
  }
  newDraw();
  m.update = (dt) => {
    T += dt; weed += dt * 90; if (weed > W + 60) weed = -60 - k.rnd(0, 400);
    if (st === 'wait') {
      fakeOn = false; cue = T < 0.9 ? '' : 'Preparados…';
      let curF = null; for (const f of fakes) if (T >= f.at && T < f.at + 0.55) { cue = f.w; fakeOn = true; curF = f; }
      for (const q of ps) { if (q.out) continue; const pr = cpu(q.p) ? !!(curF && q.fooled && T > curF.at + q.cpuRT * 0.9) : A(q.p); if (pr) falseStart(q); }
      if (T >= goAt) { st = 'go'; gT = 0; cue = '¡YA!'; k.sfx('go'); k.flash('rgba(255,230,120,.35)'); }
      if (ps.every((q) => q.out)) { st = 'void'; cue = 'Todos fuera'; }
    } else if (st === 'go') {
      gT += dt;
      const sh = ps.filter((q) => !q.out && (cpu(q.p) ? gT >= q.cpuRT : A(q.p)));
      if (sh.length) { winner = sh; for (const q of sh) q.rt = gT; fire(); st = 'shot'; }
      else if (gT > 2.5) { st = 'void'; cue = 'Nadie disparó'; }
    } else {
      sT += dt; if (st === 'shot') { gT += dt; for (const q of ps) if (!q.out && q.rt == null && (cpu(q.p) ? gT >= q.cpuRT : A(q.p))) q.rt = gT; }
      if (sT > 1.9 && !m.done) {
        if (d >= draws) { m.done = true;
          if (!o.roul) m.rank = winner.length ? ps.map((q) => (winner.includes(q) ? 0 : 1)) : null;
          else { const sc = (q) => q.wins * 10 - (q.rts.length ? q.rts.reduce((a, b) => a + b, 0) / q.rts.length : 5); m.rank = ps.map((q) => ps.filter((x) => sc(x) > sc(q) + 1e-9).length); }
        } else newDraw();
      }
    }
    for (const q of ps) if (q.hat) { const h = q.hat; h.vy += 900 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.r += h.vr * dt; if (h.y > q.y - 4) { h.y = q.y - 4; h.vy *= -0.3; h.vx *= 0.6; h.vr *= 0.5; } }
    for (let i = corks.length - 1; i >= 0; i--) { const q = corks[i]; q.x += q.vx * dt; if ((q.life -= dt) <= 0) corks.splice(i, 1); }
  };
  m.draw = () => {
    ART.background(c, TH.dusk, W, 300, 0, 0, t); ground(292, '#e0a867', '#b9773f');
    c.fillStyle = 'rgba(120,60,30,.25)'; for (let i = 0; i < 18; i++) { const x = (i * 97) % W, y = 305 + ((i * 53) % 140); c.beginPath(); c.ellipse(x, y, 16, 4, 0, 0, TAU); c.fill(); }
    // cactus y planta rodadora
    for (const [x, y, s] of [[60, 300, 1], [735, 296, 0.8]]) { c.save(); c.translate(x, y); c.scale(s, s); ART.rr(c, -9, -70, 18, 72, 9); ART.fillOut(c, '#3f9e6a', 2.6); ART.rr(c, -30, -48, 14, 26, 7); ART.fillOut(c, '#3f9e6a', 2.4); ART.rr(c, 16, -58, 14, 30, 7); ART.fillOut(c, '#3f9e6a', 2.4); c.restore(); }
    c.save(); c.translate(weed, 440); c.rotate(weed / 18); c.strokeStyle = '#8a5a2b'; c.lineWidth = 2.5; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(0, 0, 9 + (i % 3) * 3, i, i + 3.5); c.stroke(); } c.restore();
    // cartel
    const big = cue === '¡YA!' || fakeOn;
    c.fillStyle = '#6b4329'; c.fillRect(392, 150, 16, 140); c.strokeStyle = OUT; c.lineWidth = 2.5; c.strokeRect(392, 150, 16, 140);
    c.save(); c.translate(400, 140); const sc = big ? 1 + Math.max(0, 0.25 - (st === 'go' ? gT : 0)) : 1; c.scale(sc, sc);
    panel(-170, -58, 340, 116, 16, '#c98a4b', 3.5); c.fillStyle = 'rgba(0,0,0,.12)'; for (let i = -1; i < 2; i++) c.fillRect(-160, i * 36 - 3, 320, 3);
    if (cue) label(cue, 0, 2, big ? 64 : 38, big ? '#ffd166' : '#fff'); c.restore();
    if (o.roul) label(`Duelo ${d} de ${draws}`, 400, 272, 20, '#fff');
    // vaqueros
    for (const q of [...ps].sort((a, b) => a.y - b.y)) {
      const s = 1.5, hx = q.x + 0.6 * q.f * s, hy = q.y - 31.5 * s;
      if (q.out) c.globalAlpha = 0.6;
      guy(q.p, q.x, q.y, s, { face: q.f, state: q.out ? 'fall' : 'idle' });
      if (!q.hat) drawHat(hx, hy, s, -0.08 * q.f);
      drawGun(q.x + q.f * 13, q.y - 20, 1.25, q.f, col(q.p), q.out ? 0.9 : winner.includes(q) ? -0.35 : 0, !winner.includes(q) && !q.out);
      c.globalAlpha = 1;
      if (q.hat) drawHat(q.hat.x, q.hat.y, s, q.hat.r);
      tagDraw(q.p, q.x, q.y - 88);
      if (q.out) label('Fuera', q.x, q.y + 16, 18, '#ff8a8a');
      else if (q.rt != null && st !== 'wait') label(q.rt.toFixed(2).replace('.', ',') + ' s', q.x, q.y + 16, 20, winner.includes(q) ? '#ffd166' : '#fff');
      if (o.roul && q.wins) for (let i = 0; i < q.wins; i++) star(q.x - 14 + i * 14, q.y + 38, 6);
    }
    for (const q of corks) { ART.rr(c, q.x - 4, q.y - 4, 9, 8, 2); ART.fillOut(c, '#d9a86a', 1.6); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(q.x - Math.sign(q.vx) * 30, q.y); c.lineTo(q.x, q.y); c.stroke(); }
  };
  return m;
}

/* =====================================================================================
 * 3. CARRERA MACHACABOTONES — A y B alternos; la zancada depende del compás, no de la velocidad bruta.
 * ===================================================================================== */
function mgMash() {
  const D = 5600, LY = [214, 270, 326, 382], I = 150, m = { name: 'Carrera Machacabotones', help: 'Alterna A y B siguiendo el ritmo de las piernas: mantén la aguja en verde. Si machacas sin compás, tropiezas.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, d: 0, v: 0, last: null, lastT: -9, cad: 0, cadS: 0, stun: 0, fin: -1, nextT: k.rnd(0.05, 0.3), perf: 0, fb: '', fbT: 0 }));
  let T = 0, cam = 0, first = -1, over = false, endT = 0;
  const Ti = (q) => lerp(0.36, 0.2, ease(q.d / D * 1.15));
  const hum = (q) => !cpu(q.p);
  function stumble(q, why) { q.stun = 0.5; q.v *= 0.35; q.perf = 0; q.fb = why; q.fbT = 0.9; if (hum(q)) k.sfx('hurt'); else k.sfx('hit'); k.burst(110 + q.d - cam, LY[q.p] - 6, '#e6d6b0', 8, 120); }
  function press(q, key) {
    if (q.stun > 0 || q.fin >= 0) return;
    if (q.last === key) { stumble(q, '¡Mismo pie!'); q.lastT = T; return; }
    const dt = T - q.lastT; q.last = key; q.lastT = T;
    if (dt > 2) { q.v += I * 0.6; q.cad = 0.7; return; }
    const r = Ti(q) / dt; q.cad = r;
    if (r > 1.8) { stumble(q, '¡Pasado de vueltas!'); return; }
    const g = r >= 0.8 && r <= 1.25 ? 1 : r >= 0.6 && r < 0.8 ? 0.62 : r > 1.25 ? 0.35 : 0.3;
    q.v = Math.min(680, q.v + I * g);
    if (g === 1) { q.perf++; if (hum(q) && q.perf % 8 === 0) { q.fb = '¡Buen ritmo!'; q.fbT = 0.8; k.sfx('coin'); } } else q.perf = 0;
    if (hum(q)) k.sfx('click');
  }
  m.update = (dt) => {
    T += dt; let lead = 0;
    for (const q of ps) {
      if (q.fin < 0 && !over) {
        if (cpu(q.p)) { if (T >= q.nextT) { const want = q.last === 'a' ? 'b' : 'a'; press(q, Math.random() < lerp(0.035, 0.008, SK()) && q.last ? q.last : want); q.nextT = T + Ti(q) * lerp(1.14, 1.0, SK()) * (1 + gauss() * lerp(0.2, 0.08, SK())); } }
        else {
          if (k.phit(q.p, 'a')) press(q, 'a'); if (k.phit(q.p, 'b')) press(q, 'b');
          if (q.p === 0 && !k.party && k.ptr.hit) press(q, k.ptr.x < W / 2 ? 'a' : 'b');
        }
      }
      q.stun -= dt; q.fbT -= dt;
      q.v *= Math.exp(-(q.fin >= 0 ? 2.4 : 1.4) * dt); q.d += q.v * dt;
      q.cadS += ((T - q.lastT > Ti(q) * 1.9 ? Math.min(q.cad, Ti(q) / (T - q.lastT)) : q.cad) - q.cadS) * Math.min(1, dt * 10);
      if (q.fin < 0 && q.d >= D) { q.fin = T; if (first < 0) { first = T; k.sfx('win'); } else k.sfx('coin'); k.burst(110 + D - cam, LY[q.p] - 20, col(q.p), 18, 200); }
      lead = Math.max(lead, q.d);
    }
    if (!over && (ps.every((q) => q.fin >= 0) || (first >= 0 && T - first > 7) || T > 70)) {
      over = true; endT = 1.4; const v = (q) => (q.fin >= 0 ? 1e6 - q.fin : q.d); m.rank = ps.map((q) => ps.filter((o) => v(o) > v(q) + 1e-9).length);
    }
    if (over && (endT -= dt) <= 0) m.done = true;
    cam += (clamp(lead - 370, 0, D - 540) - cam) * Math.min(1, dt * 5);
  };
  m.draw = () => {
    ART.background(c, TH.meadow, W, 200, cam * 0.6, 0, t);
    c.fillStyle = '#5ccf5a'; c.fillRect(0, 178, W, 12); ground(190, '#c65a3e', '#a8432c');
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; for (const y of [190, 242, 298, 354, 410]) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.fillStyle = '#4fa860'; c.fillRect(0, 414, W, H - 414); c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 414); c.lineTo(W, 414); c.stroke();
    for (let m10 = 0; m10 <= 100; m10 += 10) { const x = 110 + m10 * D / 100 - cam; if (x < -40 || x > W + 40) continue;
      if (m10 === 100) { for (let i = 0; i < 11; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#fff' : OUT; c.fillRect(x + j * 11, 190 + i * 20.4, 11, 20.4); } ART.flag(c, x + 11, 190, t, '#ffd166', 64); }
      else { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - 1.5, 190, 3, 224); label(m10 + ' m', x, 430, 18, '#fff'); } }
    for (const q of ps) {
      const x = clamp(110 + q.d - cam, 26, W - 20), y = LY[q.p] + 20;
      guy(q.p, x, y, 1.35, { face: 1, state: q.stun > 0 ? 'fall' : q.v > 40 ? 'run' : 'idle', t: q.v > 40 ? q.d / 150 : t });
      tagDraw(q.p, x, y - 66);
      if (q.fin >= 0) label(`${m.rankOf(q)}.º`, x + 30, y - 28, 22, '#ffd166');
      if (q.fbT > 0) label(q.fb, x + 60, y - 50, 18, q.fb[1] === 'B' ? '#7cf7a0' : '#ff8a8a');
      // medidor de ritmo (derecha)
      const gx = 624, gy = y - 34, gw = 150; panel(gx - 4, gy - 4, gw + 8 + 52, 38, 10, 'rgba(26,21,48,.78)', 2.5);
      const zx = (r) => gx + clamp(r / 2, 0, 1) * gw;
      c.fillStyle = '#5a5570'; c.fillRect(gx, gy + 8, gw, 14);
      c.fillStyle = '#ffd166'; c.fillRect(zx(0.6), gy + 8, zx(1.5) - zx(0.6), 14);
      c.fillStyle = '#5fbf45'; c.fillRect(zx(0.8), gy + 8, zx(1.25) - zx(0.8), 14);
      c.fillStyle = '#ff5a5f'; c.fillRect(zx(1.8), gy + 8, gx + gw - zx(1.8), 14);
      const nx = zx(q.cadS); c.beginPath(); c.moveTo(nx, gy + 4); c.lineTo(nx - 6, gy - 4); c.lineTo(nx + 6, gy - 4); c.closePath(); ART.fillOut(c, '#fff', 2); c.fillStyle = '#fff'; c.fillRect(nx - 1.5, gy + 4, 3, 20);
      const nxt = q.last === 'a' ? 'b' : 'a';
      for (const [kk, bx] of [['a', gx + gw + 14], ['b', gx + gw + 36]]) { c.beginPath(); c.arc(bx, gy + 15, 10, 0, TAU); ART.fillOut(c, kk === nxt && q.fin < 0 ? col(q.p) : '#3a3456', 2); label(kk.toUpperCase(), bx, gy + 16, 14, '#fff', 'center', 3); }
    }
  };
  m.rankOf = (q) => 1 + ps.filter((o) => o.fin >= 0 && o.fin < q.fin).length;
  return m;
}

/* =====================================================================================
 * 4. TIRA Y AFLOJA — 2 contra 2 (J1+J3 contra J2+J4). A justo en el compás = tirón; fuera de compás = resbalón.
 * ===================================================================================== */
function mgTug() {
  const L = 124, m = { name: 'Tira y Afloja', help: 'J1 y J3 contra J2 y J4. Pulsa A justo cuando el aro se cierra sobre el nudo. Fuera de compás resbalas hacia el barro.', done: false, rank: null };
  const team = (p) => p % 2, dir = (p) => (team(p) ? 1 : -1);
  const ps = [0, 1, 2, 3].map((p) => ({ p, stun: 0, lastB: -9, next: null, flash: 0 }));
  let X = 0, V = 0, ph = 0, T = 0, P = 0.64, over = false, endT = 0, win = -1, beatF = 0, lastB = 0, drops = [];
  const px = (p) => 400 + dir(p) * (108 + (p < 2 ? 0 : 60)) + X;
  const plan = (b) => ({ b, at: b + clamp(gauss() * lerp(0.085, 0.038, SK()) / P, -0.4, 0.4), miss: Math.random() < lerp(0.12, 0.03, SK()) });
  function press(q) {
    if (q.stun > 0 || over) return;
    const b = Math.round(ph), e = (ph - b) * P;
    if (q.lastB === b) return slip(q, '¡Doble!');
    q.lastB = b;
    const ae = Math.abs(e); if (ae > 0.16) return slip(q, '¡Resbalón!');
    const pull = ae < 0.08 ? 1 : 0.55; V += dir(q.p) * pull * 30; q.flash = 0.25;
    if (!cpu(q.p)) { k.float(ae < 0.08 ? '¡Justo!' : 'Bien', px(q.p), 250, ae < 0.08 ? '#7cf7a0' : '#ffd166'); k.sfx(ae < 0.08 ? 'coin' : 'pop'); }
  }
  function slip(q, why) { q.stun = 0.4; V -= dir(q.p) * 20; k.float(why, px(q.p), 250, '#ff8a8a'); if (!cpu(q.p)) k.sfx('hurt'); k.burst(px(q.p), 372, '#7a5230', 6, 90); }
  m.update = (dt) => {
    T += dt; P = lerp(0.64, 0.42, ease(T / 26)); ph += dt / P;
    if (Math.floor(ph) !== lastB) { lastB = Math.floor(ph); beatF = 1; if (!over) k.sfx('tick'); }
    beatF = Math.max(0, beatF - dt * 4);
    for (const q of ps) {
      q.stun -= dt; q.flash -= dt;
      if (over) continue;
      if (cpu(q.p)) { if (!q.next || q.next.at < ph - 0.5) q.next = plan(Math.floor(ph) + 1); if (ph >= q.next.at) { if (!q.next.miss) press(q); q.next = plan(q.next.b + 1); } }
      else if (A(q.p)) press(q);
    }
    V *= Math.exp(-2.4 * dt); X += V * dt;
    if (!over) { if (X <= -L) win = 0; else if (X >= L) win = 1; else if (T > 32) win = X < 0 ? 0 : X > 0 ? 1 : k.ri(0, 1);
      if (win >= 0) { over = true; endT = 1.8; m.rank = ps.map((q) => (team(q.p) === win ? 0 : 2)); k.sfx('explode'); k.shake(6); k.burst(400, 380, '#6b4a2f', 30, 260); } }
    if (over) { V = (win ? 1 : -1) * 70; if ((endT -= dt) <= 0) m.done = true; }
    for (let i = drops.length - 1; i >= 0; i--) if ((drops[i].t -= dt) <= 0) drops.splice(i, 1);
    if (Math.random() < dt * 3) drops.push({ x: 400 + k.rnd(-60, 60), t: 0.6 });
  };
  m.draw = () => {
    ART.background(c, TH.jungle, W, 380, 0, 0, t); ground(370, '#5ab04f', '#3c8a3a');
    c.beginPath(); c.ellipse(400, 386, 92, 26, 0, 0, TAU); const mg = c.createRadialGradient(390, 380, 5, 400, 386, 92); mg.addColorStop(0, '#8a6038'); mg.addColorStop(1, '#5a3b20'); c.fillStyle = mg; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    for (const d of drops) { c.strokeStyle = `rgba(160,120,80,${d.t})`; c.lineWidth = 2; c.beginPath(); c.arc(d.x, 386, (0.6 - d.t) * 20, 0, TAU); c.stroke(); }
    for (const x of [400 - L, 400 + L]) { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x - 2, 360, 4, 20); }
    // cuerda
    const xl = px(2) - 16, xr = px(3) + 16, ry = 338;
    c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 11; c.beginPath(); c.moveTo(xl, ry); c.quadraticCurveTo(400 + X, ry + 10, xr, ry); c.stroke();
    c.strokeStyle = '#d8b27a'; c.lineWidth = 6.5; c.stroke(); c.strokeStyle = '#a07a45'; c.setLineDash([6, 8]); c.lineWidth = 3; c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(400 + X - 8, ry + 2); c.lineTo(400 + X + 8, ry + 2); c.lineTo(400 + X, ry + 26); c.closePath(); ART.fillOut(c, '#ff5a5f', 2.2);
    for (const q of ps) {
      const x = px(q.p), f = -dir(q.p), lean = dir(q.p) * (0.28 + (q.flash > 0 ? 0.12 : 0));
      c.save(); c.translate(x, 372); c.rotate(lean); guy(q.p, 0, 0, 1.6, { face: f, state: q.stun > 0 ? 'fall' : 'idle' }); c.restore();
      tagDraw(q.p, x, 278);
    }
    // compás: aro que se cierra sobre el nudo
    const fr = ph - Math.floor(ph), cx = 400, cy = 118;
    panel(cx - 120, cy - 64, 240, 128, 22, 'rgba(26,21,48,.55)', 2.5);
    c.beginPath(); c.arc(cx, cy, 24, 0, TAU); ART.fillOut(c, beatF > 0.5 ? '#ffe6a0' : '#ffd166', 3);
    label('A', cx, cy + 1, 22, '#fff', 'center', 4);
    c.strokeStyle = '#fff'; c.lineWidth = 5; c.globalAlpha = 0.35 + 0.65 * fr; c.beginPath(); c.arc(cx, cy, 24 + 36 * (1 - fr), 0, TAU); c.stroke(); c.globalAlpha = 1;
    if (beatF > 0) { c.strokeStyle = `rgba(255,209,102,${beatF})`; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, 28 + (1 - beatF) * 14, 0, TAU); c.stroke(); }
    label(`${tag(0)} + ${tag(2)}`, 150, 118, 24, col(0)); label(`${tag(1)} + ${tag(3)}`, 650, 118, 24, col(1));
    label(`${Math.max(0, Math.ceil(32 - T))} s`, 400, 430, 20, '#fff');
  };
  return m;
}

/* =====================================================================================
 * Minijuegos propios de la ruleta
 * ===================================================================================== */
/* 5. Cuenta Globos (conteo): cuenta los globos de tu color y marca el número. */
function mgBalloons() {
  const m = { name: 'Cuenta Globos', help: 'Cuenta solo los globos de TU color. Después elige el número con ↑ ↓ y confirma con A.', done: false, rank: null };
  const cnt = [0, 1, 2, 3].map(() => k.ri(3, 8)), sched = [];
  for (let p = 0; p < 4; p++) for (let i = 0; i < cnt[p]; i++) sched.push({ at: k.rnd(0.3, 7.8), cl: col(p) });
  for (let i = k.ri(3, 6); i > 0; i--) sched.push({ at: k.rnd(0.3, 7.8), cl: k.pick(['#ffffff', '#9a93c4']) });
  sched.sort((a, b) => a.at - b.at);
  const bs = [], ps = [0, 1, 2, 3].map((p) => ({ p, g: 3, lock: -1, tgt: 0, stepT: 0, lockAt: 0 }));
  let T = 0, st = 'show', sT = 0;
  const px = (p) => 100 + p * 200;
  m.update = (dt) => {
    T += dt; sT += dt;
    while (sched.length && sched[0].at <= T) { const s = sched.shift(); bs.push({ x: k.rnd(90, 710), y: H + 40, v: k.rnd(80, 115), cl: s.cl, ph: k.rnd(0, 6) }); }
    for (const b of bs) b.y -= b.v * dt;
    if (st === 'show' && T > 8 && bs.every((b) => b.y < -80)) { st = 'guess'; sT = 0; k.sfx('start');
      for (const q of ps) { q.tgt = clamp(cnt[q.p] + Math.round(gauss() * lerp(1.4, 0.5, SK())), 0, 20); q.lockAt = k.rnd(2, 5); } }
    else if (st === 'guess') {
      for (const q of ps) { if (q.lock >= 0) continue;
        if (cpu(q.p)) { q.stepT -= dt; if (q.stepT <= 0 && q.g !== q.tgt) { q.g += Math.sign(q.tgt - q.g); q.stepT = 0.18; k.sfx('click'); } if (q.g === q.tgt && sT > q.lockAt) q.lock = sT; }
        else {
          if (k.phit(q.p, 'up') || k.phit(q.p, 'right')) { q.g = Math.min(20, q.g + 1); k.sfx('click'); }
          if (k.phit(q.p, 'down') || k.phit(q.p, 'left')) { q.g = Math.max(0, q.g - 1); k.sfx('click'); }
          if (k.phit(q.p, 'a')) { q.lock = sT; k.sfx('pop'); }
          if (q.p === 0 && !k.party && k.ptr.hit && Math.abs(k.ptr.x - px(0)) < 95 && k.ptr.y > 300) { const dx = k.ptr.x - px(0); if (dx < -30) q.g = Math.max(0, q.g - 1); else if (dx > 30) q.g = Math.min(20, q.g + 1); else q.lock = sT; k.sfx('click'); }
        } }
      if (ps.every((q) => q.lock >= 0) || sT > 10) { for (const q of ps) if (q.lock < 0) q.lock = 99; st = 'reveal'; sT = 0; k.sfx('coin');
        const v = (q) => Math.abs(q.g - cnt[q.p]) * 100 + q.lock; m.rank = ps.map((q) => ps.filter((o) => v(o) < v(q) - 1e-9).length); }
    } else if (st === 'reveal' && sT > 2.6) m.done = true;
  };
  m.draw = () => {
    ART.background(c, TH.sky, W, H, 0, 0, t);
    for (const b of bs) c.drawImage(balloon(b.cl), b.x - 20 + Math.sin(t * 2 + b.ph) * 12, b.y - 22, 40, 74);
    if (st === 'show') label('¡Cuenta los de tu color!', 400, 80, 30, '#fff');
    else label(st === 'guess' ? '¿Cuántos globos de tu color?' : 'Resultado', 400, 110, 30, '#fff');
    if (st !== 'show') for (const q of ps) {
      const x = px(q.p), y = 330; panel(x - 88, y - 70, 176, 130, 16, 'rgba(26,21,48,.85)', 3);
      c.strokeStyle = col(q.p); c.lineWidth = 4; ART.rr(c, x - 82, y - 64, 164, 118, 12); c.stroke();
      tagDraw(q.p, x, y - 70);
      label(String(q.g), x, y - 8, 48, q.lock >= 0 ? col(q.p) : '#fff');
      if (st === 'guess') { if (q.lock < 0) { arrowGlyph(x - 58, y - 8, 14, 'left', '#9a93c4'); arrowGlyph(x + 58, y - 8, 14, 'right', '#9a93c4'); label('A: OK', x, y + 38, 18, '#ffd166'); } else label('¡Listo!', x, y + 38, 20, '#7cf7a0'); }
      else { label(`Había ${cnt[q.p]}`, x, y + 36, 20, q.g === cnt[q.p] ? '#7cf7a0' : '#ffd166'); if (m.rank[q.p] === 0) star(x + 60, y - 50, 12); }
    }
  };
  return m;
}
/* 6. Flechas de Memoria: repite la secuencia; un fallo te deja fuera. */
function mgArrows() {
  const DIRS = ['up', 'right', 'down', 'left'], L = 5, seq = Array.from({ length: L }, () => k.pick(DIRS));
  const m = { name: 'Flechas de Memoria', help: 'Memoriza las flechas y repítelas con el joystick. El primero que acierta las cinco gana; un fallo te deja fuera.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, prog: 0, fail: false, fin: -1, nextT: 0, ok: lerp(0.9, 0.975, SK()) }));
  let T = 0, st = 'show', sT = 0, bump = 0;
  const SH = 0.68;
  m.update = (dt) => {
    T += dt; sT += dt; bump = Math.max(0, bump - dt * 4);
    if (st === 'show') { const i = Math.floor((sT - 0.4) / SH); if (i >= 0 && i < L && Math.floor((sT - dt - 0.4) / SH) !== i) { bump = 1; k.sfx('tick'); } if (sT > 0.4 + L * SH + 0.3) { st = 'input'; sT = 0; k.sfx('go'); for (const q of ps) q.nextT = lerp(0.8, 0.45, SK()) * k.rnd(0.8, 1.3); } }
    else if (st === 'input') {
      for (const q of ps) { if (q.fail || q.fin >= 0) continue; let d = null;
        if (cpu(q.p)) { if (sT >= q.nextT) { d = Math.random() < q.ok ? seq[q.prog] : k.pick(DIRS.filter((x) => x !== seq[q.prog])); q.nextT = sT + lerp(0.7, 0.36, SK()) * k.rnd(0.75, 1.35); } }
        else { for (const x of DIRS) if (k.phit(q.p, x)) d = x; if (q.p === 0 && !k.party && k.swipe) d = k.swipe; }
        if (!d) continue;
        if (d === seq[q.prog]) { q.prog++; if (!cpu(q.p)) k.sfx('pop'); if (q.prog === L) { q.fin = sT; k.sfx('coin'); k.burst(100 + q.p * 200, 300, col(q.p), 16, 180); } }
        else { q.fail = true; k.sfx('hurt'); k.float('¡Fallo!', 100 + q.p * 200, 250, '#ff8a8a'); } }
      if (ps.every((q) => q.fail || q.fin >= 0) || sT > 9) { st = 'reveal'; sT = 0; const v = (q) => (q.fin >= 0 ? 100 - q.fin : q.prog); m.rank = ps.map((q) => ps.filter((o) => v(o) > v(q) + 1e-9).length); }
    } else if (st === 'reveal' && sT > 1.8) m.done = true;
  };
  m.draw = () => {
    ART.background(c, TH.night, W, H, 0, 0, t);
    if (st === 'show') {
      const i = Math.floor((sT - 0.4) / SH);
      label('Memoriza…', 400, 90, 30, '#fff');
      if (i >= 0 && i < L) { arrowGlyph(400, 220, 70 * (1 + bump * 0.15), seq[i], ['#ff5a5f', '#3fb6ea', '#ffd166', '#5fbf45', '#b98cff'][i]); label(`${i + 1} / ${L}`, 400, 320, 22, '#fff'); }
    } else {
      label(st === 'input' ? '¡Repite la secuencia!' : 'Resultado', 400, 90, 30, '#fff');
      if (st === 'input') label(`${Math.max(0, Math.ceil(9 - sT))} s`, 400, 130, 20, '#ffd166');
      for (const q of ps) { const x = 100 + q.p * 200, y = 300;
        panel(x - 90, y - 90, 180, 170, 16, 'rgba(26,21,48,.82)', 3); c.strokeStyle = col(q.p); c.lineWidth = 4; ART.rr(c, x - 84, y - 84, 168, 158, 12); c.stroke();
        tagDraw(q.p, x, y - 90);
        for (let j = 0; j < L; j++) { const ax = x - 64 + j * 32, ay = y - 30; c.beginPath(); c.arc(ax, ay, 13, 0, TAU); ART.fillOut(c, j < q.prog ? col(q.p) : '#3a3456', 2); if (j < q.prog || st === 'reveal') arrowGlyph(ax, ay, 9, seq[j], j < q.prog ? '#fff' : '#7a7496'); }
        if (q.fail) label('Fuera', x, y + 30, 26, '#ff8a8a'); else if (q.fin >= 0) label(q.fin.toFixed(1).replace('.', ',') + ' s', x, y + 30, 26, '#7cf7a0'); else label('…', x, y + 30, 26, '#fff');
        if (st === 'reveal' && m.rank[q.p] === 0) star(x, y + 60, 12); }
    }
  };
  return m;
}
/* 7. Reloj a Ciegas: el reloj se tapa a los 3 s; pulsa A cuando creas que marca 7,00. */
function mgClock() {
  const TG = 7, m = { name: 'Reloj a Ciegas', help: 'El reloj se tapa a los 3 segundos. Pulsa A cuando creas que marca exactamente 7 segundos.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, t: -1, at: TG + gauss() * lerp(0.55, 0.18, SK()) }));
  let T = 0, st = 'run', sT = 0;
  const err = (q) => (q.t < 0 ? 99 : Math.abs(q.t - TG));
  m.update = (dt) => {
    T += dt;
    if (st === 'run') { for (const q of ps) if (q.t < 0 && (cpu(q.p) ? T >= q.at : A(q.p))) { q.t = T; k.sfx('pop'); }
      if (ps.every((q) => q.t >= 0) || T > 12) { st = 'reveal'; sT = 0; k.sfx('coin'); m.rank = ps.map((q) => ps.filter((o) => err(o) < err(q) - 1e-9).length); } }
    else if ((sT += dt) > 3) m.done = true;
  };
  m.draw = () => {
    ART.background(c, TH.factory, W, H, 0, 0, t);
    const cx = 400, cy = 175, R = 92, vis = T < 3 || st === 'reveal';
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); ART.fillOut(c, '#f5f1e6', 5);
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * TAU / 10; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + Math.cos(a) * (R - 16), cy + Math.sin(a) * (R - 16)); c.lineTo(cx + Math.cos(a) * (R - 5), cy + Math.sin(a) * (R - 5)); c.stroke(); }
    ART.rr(c, cx - 14, cy - R - 22, 28, 18, 5); ART.fillOut(c, '#c3ccd4', 3);
    if (vis) { const a = -Math.PI / 2 + (T % 10) / 10 * TAU; c.strokeStyle = '#ff5a5f'; c.lineWidth = 5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * (R - 18), cy + Math.sin(a) * (R - 18)); c.stroke(); if (st !== 'reveal') label(T.toFixed(2).replace('.', ',') + ' s', cx, cy + 36, 22, '#1a1530', 'center', 1); }
    else { c.beginPath(); c.arc(cx, cy, R - 6, 0, TAU); ART.fillOut(c, '#6e62f5', 3); label('?', cx, cy, 80, '#fff'); }
    c.beginPath(); c.arc(cx, cy, 7, 0, TAU); ART.fillOut(c, '#1a1530', 1);
    label(st === 'run' ? (T < 3 ? 'Fíjate en el ritmo…' : 'Pulsa A a los 7 segundos') : 'Objetivo: 7,00 s', 400, 305, 26, st === 'run' ? '#fff' : '#ffd166');
    for (const q of ps) { const x = 100 + q.p * 200, y = 380;
      panel(x - 86, y - 36, 172, 70, 14, 'rgba(26,21,48,.85)', 3); c.strokeStyle = col(q.p); c.lineWidth = 4; ART.rr(c, x - 80, y - 30, 160, 58, 10); c.stroke();
      tagDraw(q.p, x, y - 40);
      if (st === 'reveal') { label(q.t < 0 ? 'Sin pulsar' : q.t.toFixed(2).replace('.', ',') + ' s', x, y + 4, 24, m.rank[q.p] === 0 ? '#7cf7a0' : '#fff'); if (m.rank[q.p] === 0) star(x + 70, y - 26, 11); }
      else label(q.t >= 0 ? '¡Pulsado!' : 'Esperando…', x, y + 4, 20, q.t >= 0 ? '#ffd166' : '#9a93c4'); }
  };
  return m;
}
/* 8. Diana Oscilante: para la aguja en el centro; tres intentos cada vez más rápidos. */
function mgNeedle() {
  const m = { name: 'Diana Oscilante', help: 'Detén la aguja con A lo más cerca posible del centro. Tres intentos, cada vez más rápidos.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, att: 0, ph: k.rnd(0, 6), x: 0, res: [], stopT: -1, aT: 0, thr: 0, f: 0 }));
  const newAtt = (q) => { q.f = [0.75, 1.0, 1.3][q.att] * k.rnd(0.94, 1.06); q.aT = 0; q.stopT = -1; q.thr = 0.03 + Math.abs(gauss()) * lerp(0.3, 0.09, SK()); };
  ps.forEach(newAtt);
  let T = 0, over = false, endT = 0;
  const tot = (q) => q.res.reduce((a, b) => a + b, 0);
  m.update = (dt) => {
    T += dt;
    for (const q of ps) {
      if (q.att >= 3) continue;
      if (q.stopT >= 0) { if (T - q.stopT > 0.9) { q.att++; if (q.att < 3) newAtt(q); } continue; }
      q.aT += dt; q.ph += dt * TAU * q.f; q.x = Math.sin(q.ph);
      if (over) continue;
      const pr = cpu(q.p) ? q.aT > 0.6 && Math.abs(q.x) < q.thr : A(q.p);
      if (pr) { q.stopT = T; const s = Math.round(100 * (1 - Math.abs(q.x))); q.res.push(s); k.float('+' + s, 400 + q.x * 240, 118 + q.p * 78, s >= 90 ? '#7cf7a0' : '#fff'); if (!cpu(q.p)) k.sfx(s >= 90 ? 'coin' : 'pop'); }
    }
    if (!over && (ps.every((q) => q.att >= 3) || T > 30)) { over = true; endT = 1.6; k.sfx('coin'); m.rank = ps.map((q) => ps.filter((o) => tot(o) > tot(q)).length); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  m.draw = () => {
    ART.background(c, TH.snow, W, H, 0, 0, t);
    for (const q of ps) { const y = 130 + q.p * 78, x0 = 160, x1 = 640, cx = 400;
      panel(40, y - 30, 720, 60, 14, 'rgba(26,21,48,.8)', 3);
      tagDraw(q.p, 80, y + 2);
      c.fillStyle = '#5a5570'; c.fillRect(x0, y - 12, x1 - x0, 24);
      c.fillStyle = '#ffd166'; c.fillRect(cx - 125, y - 12, 250, 24); c.fillStyle = '#5fbf45'; c.fillRect(cx - 62, y - 12, 124, 24); c.fillStyle = '#fff'; c.fillRect(cx - 12, y - 12, 24, 24);
      c.strokeStyle = OUT; c.lineWidth = 2.5; c.strokeRect(x0, y - 12, x1 - x0, 24);
      const nx = cx + q.x * 240; c.fillStyle = col(q.p); c.beginPath(); c.moveTo(nx, y - 16); c.lineTo(nx - 9, y - 28); c.lineTo(nx + 9, y - 28); c.closePath(); ART.fillOut(c, col(q.p), 2); c.fillStyle = OUT; c.fillRect(nx - 2, y - 16, 4, 32);
      label(String(tot(q)), 710, y + 1, 24, m.rank && m.rank[q.p] === 0 ? '#7cf7a0' : '#fff');
      label(`${Math.min(3, q.att + (q.stopT >= 0 && q.att < 3 ? 1 : 0))}/3`, 136, y + 1, 18, '#c9c3ef', 'center');
    }
    label('¡Para la aguja en el centro!', 400, 60, 28, '#fff');
  };
  return m;
}

/* =====================================================================================
 * Marco: rondas, marcador, ruleta y podio
 * ===================================================================================== */
const MG = { anvil: mgAnvil, duel: mgDuel, mash: mgMash, tug: mgTug, balloons: mgBalloons, arrows: mgArrows, clock: mgClock, needle: mgNeedle };
const KEYS = Object.keys(MG), SHORT = { anvil: 'Yunques', duel: 'Duelo', mash: 'Carrera', tug: 'Cuerda', balloons: 'Globos', arrows: 'Flechas', clock: 'Reloj', needle: 'Diana' };
const NAMES = { anvil: 'Lluvia de Yunques', duel: 'Duelo del Oeste', mash: 'Carrera Machacabotones', tug: 'Tira y Afloja', balloons: 'Cuenta Globos', arrows: 'Flechas de Memoria', clock: 'Reloj a Ciegas', needle: 'Diana Oscilante' };
const WCOL = ['#6e62f5', '#ff5a5f', '#3fb6ea', '#ffd166', '#5fbf45', '#ff9ad5', '#f0842a', '#34b574'];
const RULE = { anvil: { rounds: 3, pts: [3, 2, 1, 0] }, mash: { rounds: 3, pts: [3, 2, 1, 0] }, duel: { to: 5, pts: [1, 0, 0, 0] }, tug: { to: 2, pts: [1, 0, 0, 0] }, roulette: { rounds: 10, pts: [3, 2, 1, 0] } }[MODE] || { rounds: 3, pts: [3, 2, 1, 0] };
let G = null, gKey = MODE === 'roulette' ? 'anvil' : MODE, score = [0, 0, 0, 0], round = 0, seq = null, phase = 'intro', phT = 0, res = null, live = false, wRot = 0, wFrom = 0, wTo = 0;
const matchN = () => round;
function makeSeq() { const s = k.shuffle(KEYS.slice()); while (s.length < 10) { const x = k.pick(KEYS); if (x !== s[s.length - 1]) s.push(x); } return s; }
function reset() { demo = false; score = [0, 0, 0, 0]; round = 0; seq = MODE === 'roulette' ? makeSeq() : null; if (seq) toBoard(); else nextRound(); }
function nextRound() { round++; gKey = seq ? seq[round - 1] : MODE; G = MG[gKey]({ roul: !!seq }); phase = 'intro'; phT = 2.2; }
function toBoard() { phase = 'board'; phT = 3.4; const i = KEYS.indexOf(seq[round]); wFrom = wRot % TAU; wTo = -(i + 0.5) * TAU / 8 - TAU * 4; }
const over = () => (RULE.to ? Math.max(...score) >= RULE.to : round >= RULE.rounds);
function finishRound() {
  const r = G.rank, pts = [0, 0, 0, 0];
  if (r) for (let p = 0; p < 4; p++) pts[p] = RULE.pts[r[p]] || 0;
  for (let p = 0; p < 4; p++) score[p] += pts[p];
  const w = r ? [0, 1, 2, 3].filter((p) => r[p] === 0) : [];
  let head = !r ? 'Ronda nula' : gKey === 'tug' ? teamHead(w[0] % 2) : w.length === 1 ? winTxt(w[0]) : w.length === 4 ? '¡Empate total!' : '¡Empate!';
  res = { pts, w, head }; phase = 'result'; phT = 2.6;
  if (w.some((p) => !cpu(p))) k.sfx('win'); else if (r) k.sfx('lose');
  if (w.length) k.confetti(col(w[0]), 50);
}
function endMatch() {
  live = false;
  const rows = [0, 1, 2, 3].map((p) => ({ p, score: score[p], name: nm(p) })), top = Math.max(...score), low = Math.min(...score);
  const hs = [0, 1, 2, 3].filter((p) => !cpu(p));
  if (hs.some((p) => score[p] === top)) LV = Math.min(11, LV + 1); else if (hs.length && hs.every((p) => score[p] === low)) LV = Math.max(0, LV - 1);
  try { localStorage.setItem('cpu:' + ID, LV); } catch (e) { /* sin almacenamiento */ }
  const winners = [0, 1, 2, 3].filter((p) => score[p] === top);
  let head = null;
  if (MODE === 'tug') head = teamHead(winners[0] % 2);
  else if (winners.length === 1) head = winTxt(winners[0]);
  k.podium(rows, { head, noTie: MODE === 'tug', fmt: (s) => (MODE === 'tug' ? `${s} ${s === 1 ? 'ronda' : 'rondas'}` : `${s} ${s === 1 ? 'punto' : 'puntos'}`) });
}
function teamHead(tm) { return !k.party && !demo && tm === 0 ? '¡Gana tu equipo!' : `¡Gana el equipo ${tm ? 'azul' : 'rojo'}!`; }
function adBreak() { try { if (parent !== window) parent.postMessage({ type: 'arcade:adbreak' }, '*'); } catch (e) { /* sin padre */ } }

G = MG[gKey]({ roul: MODE === 'roulette' });
k.show(CFG.title, (CFG.help || '') + '<br>Toca para jugar');
k.run((dt) => {
  t += dt;
  if (!k.gate(() => {})) { if (k.st === 'ready') { if (MODE === 'roulette') wRot += dt * 0.7; else { G.update(dt); if (G.done) G = MG[gKey]({}); } } return; }
  if (!live) { live = true; reset(); }
  if (phase === 'intro') { if ((phT -= dt) <= 0) { phase = 'play'; k.count(3); } return; }
  if (phase === 'play') { if (k.counting()) return; G.update(dt); if (G.done) finishRound(); return; }
  if (phase === 'result') { G.update(dt); if ((phT -= dt) <= 0) { if (over()) endMatch(); else if (seq) { if (round % 3 === 0) adBreak(); toBoard(); } else nextRound(); } return; }
  if (phase === 'board') { phT -= dt; const q = 1 - (1 - clamp((3.4 - phT) / 2.5, 0, 1)) ** 3; wRot = wFrom + (wTo - wFrom) * q; if (phT <= 0) nextRound(); }
}, () => {
  const board = MODE === 'roulette' && (k.st === 'ready' || phase === 'board');
  if (board && (k.st === 'ready' || !G || round === 0)) ART.background(c, TH.night, W, H, 0, 0, t); else G.draw();
  if (board) drawBoard();
  if (!demo) hud();
  if (!board && !demo && k.st === 'play') {
    if (phase === 'intro' || (phase === 'play' && k.counting())) banner();
    if (phase === 'result' && res) {
      panel(200, 150, 400, 110, 20, 'rgba(26,21,48,.88)', 4);
      label(res.head, 400, 188, 32, res.w.length === 1 ? col(res.w[0]) : '#ffd166');
      label(res.pts.some((x) => x) ? [0, 1, 2, 3].filter((p) => res.pts[p]).map((p) => `${tag(p)} +${res.pts[p]}`).join('   ') : 'Nadie suma', 400, 232, 20, '#fff');
    }
  }
});
function hud() {
  for (let p = 0; p < 4; p++) {
    const x = 8 + p * 198, y = 6;
    panel(x, y, 188, 38, 12, 'rgba(26,21,48,.85)', 2.5);
    ART.rr(c, x + 4, y + 4, 60, 30, 9); ART.fillOut(c, col(p), 2);
    c.font = FONT(18); c.fillStyle = OUT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(tag(p), x + 34, y + 20);
    label(String(score[p]), x + 176, y + 20, 24, '#fff', 'right');
    const lead = Math.max(...score); if (lead > 0 && score[p] === lead) star(x + 84, y + 19, 10);
  }
}
function banner() {
  const small = phase === 'play';
  const y = small ? 400 : 190, h = small ? 58 : 150;
  panel(90, y - h / 2, 620, h, 22, 'rgba(26,21,48,.9)', 4);
  if (small) { c.font = FONT(18, 700); wrap(G.help, 400, y, 580, 22, '#fff'); return; }
  const sub = seq ? `Ronda ${round} de ${RULE.rounds}` : RULE.to ? `${MODE === 'tug' ? 'Ronda' : 'Duelo'} ${round} · gana quien llegue a ${RULE.to}` : `Ronda ${round} de ${RULE.rounds}`;
  label(sub, 400, y - 48, 20, '#ffd166');
  label(G.name, 400, y - 12, 36, '#fff');
  c.font = FONT(19, 700); wrap(G.help, 400, y + 36, 580, 23, '#e8e3ff');
}
function wrap(s, x, y, maxW, lh, fill) {
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (c.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; }
  if (cur) lines.push(cur);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fill;
  lines.forEach((l, i) => c.fillText(l, x, y + (i - (lines.length - 1) / 2) * lh));
}
function drawBoard() {
  c.fillStyle = 'rgba(12,9,32,.72)'; c.fillRect(0, 0, W, H);
  const cx = 590, cy = 250, R = 160, seg = TAU / 8;
  for (let i = 0; i < 8; i++) {
    const a0 = wRot + i * seg - Math.PI / 2;
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a0, a0 + seg); c.closePath(); c.fillStyle = WCOL[i]; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
    const am = a0 + seg / 2, flip = Math.cos(am) < 0; c.save(); c.translate(cx, cy); c.rotate(flip ? am + Math.PI : am); label(SHORT[KEYS[i]], flip ? -R * 0.6 : R * 0.6, 0, 18, '#fff', 'center', 4); c.restore();
  }
  c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.lineWidth = 6; c.strokeStyle = OUT; c.stroke();
  c.beginPath(); c.arc(cx, cy, 24, 0, TAU); ART.fillOut(c, '#f5f1e6', 3); star(cx, cy, 13);
  c.beginPath(); c.moveTo(cx - 16, cy - R - 20); c.lineTo(cx + 16, cy - R - 20); c.lineTo(cx, cy - R + 10); c.closePath(); ART.fillOut(c, '#fff', 3);
  if (k.st === 'ready') { label('Ruleta de Minijuegos', 200, 150, 30, '#fff'); for (let i = 0; i < 8; i++) label(SHORT[KEYS[i]], 110 + (i % 2) * 180, 205 + Math.floor(i / 2) * 44, 22, WCOL[i]); return; }
  label(`Ronda ${round + 1} de ${RULE.rounds}`, 200, 78, 26, '#ffd166');
  const order = [0, 1, 2, 3].sort((a, b) => score[b] - score[a]), mx = Math.max(1, ...score);
  order.forEach((p, i) => { const y = 130 + i * 58; panel(30, y - 22, 340, 46, 12, 'rgba(26,21,48,.9)', 2.5); tagDraw(p, 70, y + 1); if (score[p]) { ART.rr(c, 110, y - 9, 190 * score[p] / mx, 18, 8); ART.fillOut(c, col(p), 2); } label(String(score[p]), 356, y + 1, 24, '#fff', 'right'); });
  if (phT < 1 && seq && seq[round]) { panel(400, 390, 380, 50, 14, 'rgba(26,21,48,.92)', 3); label('Siguiente: ' + NAMES[seq[round]], 590, 415, 22, '#fff'); }
}
