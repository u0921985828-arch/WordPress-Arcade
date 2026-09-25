/* party.js — Marco de minijuegos de fiesta por rondas para 1–4 jugadores (la CPU rellena las plazas vacías).
 * CFG.mode: 'anvil' (Lluvia de Yunques) | 'duel' (Duelo del Oeste) | 'mash' (Carrera Machacabotones) |
 *           oleada 2 (3 rondas, 3-2-1 puntos): 'pump' (Globos a Presión) | 'simon' (Memoria de Semáforo) | 'rope' (Salta la Comba) |
 *           'fish' (Pesca Rápida) | 'statue' (Estatuas Musicales) | 'sheep' (Cuenta Ovejas) | 'sack' (Carrera de Sacos) |
 *           'pie' (Tartas al Blanco) | 'derby' (Caballitos de Feria) |
 *           'tug' (Tira y Afloja, 2 contra 2) |
 *           oleada 3: 'bowl' (Bolos Humanos) | 'bull' (Toro Mecánico) | 'egg' (Huevo en la Cuchara) | 'photo' (Foto de Grupo) |
 *           'relay' (Relevo de Cubos, cooperativo) | 'hotair' (Globo de Todos, cooperativo) | 'witch' (Tren de la Bruja) | 'mole' (Topo Burlón) | 'roulette' (Ruleta de Minijuegos: 10 rondas al azar con los anteriores
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
 * Oleada 2 — minijuegos de un solo modo (CFG.mode): pump, simon, rope, fish, statue, sheep, sack, pie, derby.
 * No entran en la ruleta (KEYS fija las 8 casillas originales).
 * ===================================================================================== */
const XP = [130, 310, 490, 670];
const AH = (p) => !cpu(p) && (k.pheld(p, 'a') || (p === 0 && !k.party && k.ptr.down));
/* Si ya no queda ningún humano en pie en un minijuego de eliminación, el resto se juega a velocidad ×3. */
const fastFwd = (ps) => !demo && ps.some((q) => !cpu(q.p)) && ps.every((q) => cpu(q.p) || q.out >= 0) && ps.filter((q) => q.out < 0).length > 1;
const rankBy = (ps, v) => ps.map((q) => ps.filter((o) => v(o) > v(q) + 1e-9).length);
function ffLabel() { label('Avance rápido', 400, H - 20, 18, '#c9c3ef'); }
function panelBox(x, y, w, h, cl) { panel(x, y, w, h, 16, 'rgba(26,21,48,.85)', 3); c.strokeStyle = cl; c.lineWidth = 4; ART.rr(c, x + 6, y + 6, w - 12, h - 12, 11); c.stroke(); }
function bunting(y, n, t0) {
  c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(0, y); for (let i = 0; i <= 20; i++) c.lineTo(i * 40, y + Math.sin(i * 0.9) * 4 + 6 * Math.sin(Math.PI * (i % 5) / 5)); c.stroke();
  const cs = ['#ff5a5f', '#ffd166', '#3fb6ea', '#5fbf45', '#b98cff'];
  for (let i = 0; i < n; i++) { const x = 20 + i * 800 / n, yy = y + 6 * Math.sin(Math.PI * ((x / 40) % 5) / 5) + Math.sin((x / 40) * 0.9) * 4, sw = Math.sin((t0 || t) * 2 + i) * 2;
    c.beginPath(); c.moveTo(x - 9, yy); c.lineTo(x + 9, yy); c.lineTo(x + sw, yy + 18); c.closePath(); ART.fillOut(c, cs[i % 5], 1.6); }
}

/* 9. GLOBOS A PRESIÓN — cada globo revienta en un punto secreto; gana el más grande sin reventar. */
function mgPump() {
  const GY = 400, TL = 16;
  const m = { name: 'Globos a Presión', help: 'A: bombazo de aire. B: te plantas. Gana el globo más grande sin reventar; tiembla cuando está cerca del límite.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, f: 0, lim: k.rnd(62, 100), st: 'pump', cd: 0, pT: 0, nextT: k.rnd(0.6, 1.2), tgt: 0 }));
  for (const q of ps) q.tgt = Math.max(28, q.lim - clamp(lerp(11, 3.5, SK()) + gauss() * lerp(5, 2.2, SK()), 0.6, 28));
  let T = 0, over = false, endT = 0;
  const wob = (q) => clamp((q.f - (q.lim - 16)) / 16, 0, 1), R = (q) => 14 + q.f * 0.72, BY = (q) => GY - 66 - R(q);
  const BTN = { x: 10, y: 404, w: 96, h: 30 };
  function pump(q) {
    if (q.st !== 'pump' || q.cd > 0 || over) return;
    q.cd = 0.16; q.pT = 0.16; q.f += k.rnd(2.4, 5.2);
    if (q.f > q.lim) { q.st = 'pop'; k.sfx('explode'); k.shake(4); k.burst(XP[q.p], BY(q), col(q.p), 26, 260); k.float('¡PUM!', XP[q.p], BY(q) - 20, '#fff'); }
    else if (!cpu(q.p)) k.sfx(wob(q) > 0.45 ? 'hit' : 'pop');
  }
  function plant(q) { if (q.st !== 'pump' || over) return; q.st = 'stop'; if (!cpu(q.p)) k.sfx('coin'); k.float('¡Me planto!', XP[q.p], BY(q) - R(q) - 14, col(q.p)); }
  m.update = (dt) => {
    T += dt;
    for (const q of ps) {
      q.cd -= dt; q.pT -= dt;
      if (q.st !== 'pump' || over) continue;
      if (cpu(q.p)) { if (T >= q.nextT) { if (q.f >= q.tgt) plant(q); else pump(q); q.nextT = T + k.rnd(0.22, 0.5); } }
      else {
        if (k.phit(q.p, 'b')) plant(q);
        else if (q.p === 0 && !k.party && k.ptr.hit && k.ptr.x > BTN.x && k.ptr.x < BTN.x + BTN.w && k.ptr.y > BTN.y - 6) plant(q);
        else if (A(q.p)) pump(q);
      }
    }
    if (!over && T > TL) for (const q of ps) if (q.st === 'pump') plant(q);
    if (!over && ps.every((q) => q.st !== 'pump')) { over = true; endT = 3; k.sfx('coin'); m.rank = rankBy(ps, (q) => (q.st === 'pop' ? -1 : q.f)); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  function bigBalloon(x, y, r, cl, w) {
    c.save(); c.translate(x + Math.sin(t * 43) * w * 3.2, y + Math.cos(t * 37) * w * 1.5);
    c.beginPath(); c.moveTo(-6, r + 7); c.lineTo(6, r + 7); c.lineTo(0, r - 3); c.closePath(); ART.fillOut(c, ART.dark(cl, 0.2), 2);
    c.beginPath(); c.ellipse(0, 0, r * 0.9, r, 0, 0, TAU);
    const gr = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r * 1.1); gr.addColorStop(0, ART.lite(cl, 0.5 + w * 0.2)); gr.addColorStop(0.6, cl); gr.addColorStop(1, ART.dark(cl, 0.28));
    c.fillStyle = gr; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-r * 0.4, -r * 0.45, r * 0.13, r * 0.26, -0.5, 0, TAU); c.fill();
    if (w > 0) { c.strokeStyle = `rgba(255,255,255,${0.35 + w * 0.5})`; c.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = 0.4 + i * 0.35; c.beginPath(); c.arc(0, 0, r * 0.78, a, a + 0.18); c.stroke(); } }
    c.restore();
  }
  m.draw = () => {
    ART.background(c, TH.meadow, W, GY, 0, 0, t); ground(GY, '#5ccf5a', '#3aa845'); bunting(52, 18);
    if (!over) label(`${Math.max(0, Math.ceil(TL - T))} s`, 400, 84, 22, '#fff');
    for (const q of ps) {
      const x = XP[q.p], push = q.pT > 0 ? q.pT / 0.16 : 0;
      // manguera, soporte y bomba
      c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 38, GY - 4); c.quadraticCurveTo(x + 18, GY + 6, x + 2, GY - 6); c.stroke(); c.strokeStyle = '#3a3456'; c.lineWidth = 3; c.stroke();
      ART.rr(c, x - 5, GY - 66, 10, 64, 4); ART.fillOut(c, '#c3ccd4', 2.4);
      const hy = GY - 64 - 22 * (1 - push);
      c.fillStyle = OUT; c.fillRect(x + 42, hy, 3, GY - 50 - hy);
      ART.rr(c, x + 30, hy - 5, 28, 8, 3); ART.fillOut(c, '#6b4329', 2);
      ART.rr(c, x + 34, GY - 52, 20, 52, 5); ART.fillOut(c, col(q.p), 2.6); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 37, GY - 48, 4, 42);
      guy(q.p, x + 74, GY, 1.2, { face: -1, state: 'idle', squash: push * 0.12 });
      if (q.st === 'pop') { for (let i = 0; i < 5; i++) { const a = i * 1.3 + q.p; c.save(); c.translate(x + Math.cos(a) * 12, GY - 72 + Math.sin(a) * 6); c.rotate(a); ART.rr(c, -6, -3, 12, 6, 3); ART.fillOut(c, col(q.p), 1.6); c.restore(); } label('¡Reventó!', x, GY - 110, 22, '#ff8a8a'); }
      else bigBalloon(x, BY(q), R(q), col(q.p), q.st === 'pump' ? wob(q) : 0);
      if (over) {
        c.setLineDash([6, 6]); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2.5; const rl = 14 + q.lim * 0.72; c.beginPath(); c.ellipse(x, GY - 66 - rl, rl * 0.9, rl, 0, 0, TAU); c.stroke(); c.setLineDash([]);
        label(q.st === 'pop' ? `0 / ${Math.round(q.lim)}` : `${Math.round(q.f)} / ${Math.round(q.lim)}`, x, GY - 30, 22, m.rank[q.p] === 0 ? '#7cf7a0' : '#fff');
        if (m.rank[q.p] === 0) star(x + 52, GY - 32, 12);
      } else if (q.st === 'stop') label('Plantado', x, GY - 30, 20, '#ffd166');
      tagDraw(q.p, x, 432);
    }
    if (!k.party && !demo && ps[0].st === 'pump' && !over) { panel(BTN.x, BTN.y - 6, BTN.w, BTN.h + 4, 10, '#ffd166', 2.5); label('Plantarse', BTN.x + BTN.w / 2, BTN.y + 9, 16, '#fff', 'center', 3.5); }
  };
  return m;
}

/* 10. MEMORIA DE SEMÁFORO — la secuencia de luces crece; quien falla queda fuera. */
function mgSimon() {
  const D4 = ['up', 'right', 'down', 'left'], LC = { up: '#ff5a5f', right: '#ffd166', down: '#5fbf45', left: '#3fb6ea' }, LP = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  const CX = 400, CY = 168, OFF = 62;
  const m = { name: 'Memoria de Semáforo', help: 'Repite las luces con el joystick: ↑ roja, → ámbar, ↓ verde, ← azul. Cada turno suma una; quien falla, fuera.', done: false, rank: null };
  const seq = [k.pick(D4), k.pick(D4), k.pick(D4)];
  const ps = [0, 1, 2, 3].map((p) => ({ p, out: -1, prog: 0, ok: false, fail: false, nextT: 0, wait: 0, lit: null, litT: 0 }));
  let st = 'show', sT = 0, lit = null, litT = 0, turn = 0, over = false, endT = 0, idx = -1;
  const SH = () => lerp(0.66, 0.4, ease((seq.length - 3) / 10));
  const errP = () => lerp(0.04, 0.012, SK()) + Math.max(0, seq.length - 4) * lerp(0.018, 0.008, SK());
  function press(q, d) {
    q.lit = d; q.litT = 0.22;
    if (d === seq[q.prog]) { q.prog++; q.wait = 0; if (!cpu(q.p)) k.sfx('click'); if (q.prog === seq.length) { q.ok = true; if (!cpu(q.p)) k.sfx('coin'); } }
    else { q.fail = true; k.sfx('hurt'); k.float('¡Fallo!', XP[q.p], 318, '#ff8a8a'); }
  }
  m.update = (dt) => {
    if (fastFwd(ps)) dt *= 3;
    sT += dt; litT -= dt; for (const q of ps) q.litT -= dt;
    if (over) { if ((endT -= dt) <= 0) m.done = true; return; }
    if (st === 'show') {
      const sh = SH(), i = Math.floor((sT - 0.7) / sh);
      if (i >= 0 && i < seq.length && i !== idx) { idx = i; lit = seq[i]; litT = sh * 0.7; if (!demo) k.sfx('tick'); }
      if (sT > 0.7 + seq.length * sh + 0.15) { idx = -1; st = 'input'; sT = 0; if (!demo) k.sfx('go');
        for (const q of ps) if (q.out < 0) { q.prog = 0; q.ok = false; q.fail = false; q.wait = 0; q.nextT = k.rnd(0.45, 0.9) * lerp(1.3, 0.8, SK()); } }
    } else if (st === 'input') {
      for (const q of ps) {
        if (q.out >= 0 || q.ok || q.fail) continue;
        q.wait += dt; let d = null;
        if (cpu(q.p)) { if (sT >= q.nextT) { d = Math.random() < errP() ? k.pick(D4.filter((x) => x !== seq[q.prog])) : seq[q.prog]; q.nextT = sT + lerp(0.62, 0.32, SK()) * k.rnd(0.75, 1.35); } }
        else {
          for (const x of D4) if (k.phit(q.p, x)) d = x;
          if (q.p === 0 && !k.party) { if (k.swipe) d = k.swipe; else if (k.ptr.hit) for (const x of D4) if (Math.hypot(k.ptr.x - (CX + LP[x][0] * OFF), k.ptr.y - (CY + LP[x][1] * OFF)) < 44) d = x; }
        }
        if (d) press(q, d);
        else if (q.wait > 4.5) { q.fail = true; k.sfx('hurt'); k.float('¡Tiempo!', XP[q.p], 318, '#ff8a8a'); }
      }
      if (ps.every((q) => q.out >= 0 || q.ok || q.fail)) {
        for (const q of ps) if (q.out < 0 && q.fail) q.out = turn * 100 + q.prog;
        turn++; st = 'res'; sT = 0;
        const alive = ps.filter((q) => q.out < 0).length;
        if (alive <= 1 || seq.length >= 16) { over = true; endT = 2.2; k.sfx('coin'); m.rank = rankBy(ps, (q) => (q.out < 0 ? 1e9 : q.out)); }
        else seq.push(k.pick(D4));
      }
    } else if (st === 'res' && sT > 1.1) { st = 'show'; sT = 0; }
  };
  m.draw = () => {
    ART.background(c, TH.dusk, W, H, 0, 0, t);
    // poste y caja del semáforo en cruz
    ART.rr(c, CX - 8, CY + 90, 16, 200, 5); ART.fillOut(c, '#3a3456', 2.5);
    for (const d of D4) { const [dx, dy] = LP[d]; ART.rr(c, CX + dx * OFF - 42, CY + dy * OFF - 42, 84, 84, 18); ART.fillOut(c, '#2a2244', 3); }
    ART.rr(c, CX - 40, CY - 40, 80, 80, 14); ART.fillOut(c, '#2a2244', 3);
    for (const d of D4) {
      const [dx, dy] = LP[d], x = CX + dx * OFF, y = CY + dy * OFF, on = litT > 0 && lit === d;
      if (on) { const g = c.createRadialGradient(x, y, 10, x, y, 80); g.addColorStop(0, LC[d]); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 0.55; c.fillStyle = g; c.beginPath(); c.arc(x, y, 80, 0, TAU); c.fill(); c.globalAlpha = 1; }
      c.beginPath(); c.arc(x, y, 31, 0, TAU); ART.fillOut(c, on ? ART.lite(LC[d], 0.25) : ART.dark(LC[d], 0.55), 3);
      c.fillStyle = on ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.14)'; c.beginPath(); c.ellipse(x - 10, y - 11, 8, 5, -0.6, 0, TAU); c.fill();
      if (!on) arrowGlyph(x, y, 13, d, 'rgba(255,255,255,.28)');
    }
    label(String(seq.length), CX, CY + 2, 30, '#fff');
    label(st === 'show' ? 'Mira las luces…' : st === 'input' ? '¡Repite!' : '', 160, 96, 28, '#fff');
    if (st === 'input') label(`${Math.max(0, Math.ceil(4.5 - Math.max(...ps.filter((q) => q.out < 0 && !q.ok && !q.fail).map((q) => q.wait), 0)))} s`, 160, 132, 20, '#ffd166');
    for (const q of ps) {
      const x = XP[q.p], y = 372;
      panelBox(x - 84, y - 70, 168, 128, col(q.p)); tagDraw(q.p, x, y - 70);
      const n = seq.length, gap = Math.min(18, 140 / n);
      for (let j = 0; j < n; j++) { const ax = x - (n - 1) * gap / 2 + j * gap; c.beginPath(); c.arc(ax, y - 30, Math.min(7, gap * 0.4), 0, TAU); ART.fillOut(c, q.out < 0 && st === 'input' && j < q.prog ? col(q.p) : '#3a3456', 1.5); }
      if (q.litT > 0 && q.lit) { c.beginPath(); c.arc(x, y + 6, 17, 0, TAU); ART.fillOut(c, LC[q.lit], 2.5); arrowGlyph(x, y + 6, 10, q.lit, '#fff'); }
      else label(q.out >= 0 ? 'Fuera' : q.fail ? '¡Fallo!' : q.ok ? '¡Bien!' : st === 'input' ? '…' : '', x, y + 6, 22, q.out >= 0 || q.fail ? '#ff8a8a' : q.ok ? '#7cf7a0' : '#fff');
      if (over && m.rank[q.p] === 0) star(x + 60, y - 48, 12);
      if (!cpu(q.p) && st === 'input' && q.out < 0) label('Tu turno', x, y + 38, 16, '#ffd166');
    }
    if (fastFwd(ps)) ffLabel();
  };
  return m;
}

/* 11. SALTA LA COMBA — dos niños dan a la comba; salta con A cuando pasa por el suelo. */
function mgRope() {
  const X = [240, 348, 456, 564], GY = 388, HY = 346, TOP = 186, L0 = 78, L1 = 722, WARM = 3;
  const m = { name: 'Salta la Comba', help: 'Salta con A justo cuando la cuerda llega al suelo. Cada vez gira más rápido; si te engancha, fuera.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, h: 0, vy: 0, g: 0, air: false, out: -1, jumps: 0, trip: 0, plan: null, sq: 0 }));
  let T = 0, ph = 0, n = 0, over = false, endT = 0, flashT = 0;
  const per = () => lerp(1.8, 0.72, ease(T / 52));
  const airT = () => clamp(0.3 * per() + 0.16, 0.37, 0.56);
  function jump(q) { if (q.air || q.out >= 0 || q.trip > 0 || over) return; const ta = airT(); q.g = 8 * 72 / (ta * ta); q.vy = 4 * 72 / ta; q.air = true; if (!cpu(q.p)) k.sfx('jump'); }
  m.update = (dt) => {
    if (fastFwd(ps)) dt *= 3;
    T += dt; const P = per(), prev = ph; ph += dt * TAU / P; flashT -= dt;
    const toB = ((((Math.PI - ph) % TAU) + TAU) % TAU) * P / TAU; // segundos hasta el próximo paso por el suelo
    for (const q of ps) {
      q.trip -= dt; q.sq = Math.max(0, q.sq - dt * 2);
      if (q.air) { q.h += q.vy * dt; q.vy -= q.g * dt; if (q.h <= 0) { q.h = 0; q.air = false; q.sq = 0.28; } }
      if (q.out >= 0 || over) continue;
      if (cpu(q.p)) {
        if (!q.plan || q.plan.n !== n) q.plan = { n, err: gauss() * lerp(0.11, 0.045, SK()), miss: Math.random() < lerp(0.05, 0.012, SK()) + Math.max(0, 1.05 - P) * lerp(0.08, 0.03, SK()), done: false };
        if (!q.plan.done && !q.plan.miss && toB <= airT() / 2 + q.plan.err) { q.plan.done = true; jump(q); }
      } else if (A(q.p)) jump(q);
    }
    if (Math.floor((prev - Math.PI) / TAU) !== Math.floor((ph - Math.PI) / TAU)) {
      n++; if (!demo) k.sfx('tick');
      for (const q of ps) {
        if (q.out >= 0) continue;
        if (q.h < 14) {
          if (n <= WARM) { q.trip = 0.5; k.float('¡Casi!', X[q.p], GY - 90, '#ffd166'); }
          else { q.out = n; q.trip = 9; k.sfx('hurt'); k.burst(X[q.p], GY - 10, col(q.p), 12, 170); k.float('¡Enganchado!', X[q.p], GY - 90, '#ff8a8a'); }
        } else q.jumps++;
      }
      if (n === WARM) { flashT = 1.2; if (!demo) k.sfx('go'); }
    }
    const alive = ps.filter((q) => q.out < 0).length;
    if (!over && n > WARM && (alive <= 1 || T > 80)) { over = true; endT = 1.8; k.sfx('coin'); m.rank = rankBy(ps, (q) => (q.out < 0 ? 1e9 : q.out)); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  function rope(front) {
    const s = Math.sin(ph); if (front !== s > 0) return;
    const ym = (TOP + GY + 4) / 2 - Math.cos(ph) * (GY + 4 - TOP) / 2, cy = 2 * ym - HY;
    const h0 = [L0 + Math.sin(ph) * 5, HY - Math.cos(ph) * 8], h1 = [L1 - Math.sin(ph) * 5, HY - Math.cos(ph) * 8];
    c.lineCap = 'round'; c.beginPath(); c.moveTo(h0[0], h0[1]); c.quadraticCurveTo(400, cy, h1[0], h1[1]);
    c.strokeStyle = OUT; c.lineWidth = front ? 8 : 6; c.stroke(); c.strokeStyle = front ? '#ff9ad5' : '#c46a9e'; c.lineWidth = front ? 4.5 : 3; c.stroke();
    for (const h of [h0, h1]) { ART.rr(c, h[0] - 5, h[1] - 9, 10, 18, 4); ART.fillOut(c, '#6b4329', 2); }
  }
  m.draw = () => {
    ART.background(c, TH.sky, W, GY, 0, 0, t); ground(GY, '#e3c48f', '#c9a26a');
    c.fillStyle = 'rgba(120,80,40,.18)'; for (let i = 0; i < 14; i++) { c.beginPath(); c.ellipse((i * 131) % W, GY + 14 + ((i * 37) % 50), 18, 4, 0, 0, TAU); c.fill(); }
    ART.hero(c, 44, GY, 1.6, { face: 1, state: 'idle', t: t, col: '#b98cff' }); ART.hero(c, 756, GY, 1.6, { face: -1, state: 'idle', t: t + 1, col: '#ff9f43' });
    rope(false);
    for (const q of ps) {
      const x = X[q.p];
      if (q.out >= 0) { c.globalAlpha = 0.7; guy(q.p, x, GY + 34, 1.1, { face: 1, state: 'fall', squash: 0.6 }); c.globalAlpha = 1; for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; star(x + Math.cos(a) * 16, GY + 18 + Math.sin(a) * 5, 4.5); } continue; }
      if (q.air) ART.shadow(c, x, GY + 0.5, 12 * (1 - q.h / 160), 0.22);
      guy(q.p, x, GY - q.h, 1.5, { face: 1, state: q.air ? (q.vy > 0 ? 'jump' : 'fall') : q.trip > 0 ? 'fall' : 'idle', squash: q.sq });
      tagDraw(q.p, x, GY - q.h - 84);
    }
    rope(true);
    label(n <= WARM ? 'Calentamiento' : `Saltos: ${n - WARM}`, 400, 80, 28, n <= WARM ? '#ffd166' : '#fff');
    if (flashT > 0) label('¡Ahora va en serio!', 400, 120, 24, '#ff8a8a');
    for (const q of ps) if (over && m.rank[q.p] === 0) star(X[q.p], GY - 130, 13);
    if (fastFwd(ps)) ffLabel();
  };
  return m;
}

/* 12. PESCA RÁPIDA — flotadores en el mismo estanque; el pez gordo solo pica con dos flotadores cerca y hay que tirar a la vez. */
function mgFish() {
  const CX = 400, CY = 214, RX = 340, RY = 140, TL = 40, X = XP, TIP = 372;
  const m = { name: 'Pesca Rápida', help: 'Deja quieto el flotador y pulsa A cuando se hunda. El pez gordo pica con dos flotadores cerca: tirad a la vez.', done: false, rank: null };
  const inPond = (x, y, pad) => ((x - CX) / (RX - pad)) ** 2 + ((y - CY) / (RY - pad * 0.6)) ** 2 <= 1;
  const ps = [0, 1, 2, 3].map((p) => ({ p, x: X[p] * 0.8 + 80, y: 290, rest: 0, cd: 0, bite: null, pts: 0, tx: 0, ty: 0, aiT: 0, react: -1, fake: -1, mv: false, bob: 0 }));
  for (const q of ps) { q.tx = q.x; q.ty = q.y; }
  const fish = [], respawn = [], rings = []; let big = null, bigNext = 11, T = 0, over = false, endT = 0;
  function spawnFish(edge) {
    let x, y; do { x = k.rnd(CX - RX, CX + RX); y = k.rnd(CY - RY, CY + RY); } while (!inPond(x, y, edge ? 40 : 60));
    const gold = Math.random() < 0.1, sz = gold ? 1 : Math.random() < 0.3 ? 2 : 1;
    fish.push({ x, y, a: k.rnd(0, TAU), v: k.rnd(38, 58), sz, val: gold ? 3 : sz, gold, st: 'swim', tgt: null, tT: 0, turnT: 0, fade: edge ? 0 : 1 });
  }
  for (let i = 0; i < 7; i++) spawnFish(false);
  const ring = (x, y, r) => rings.push({ x, y, t: 0.6, r: r || 20 });
  function scare(x, y, rad) { for (const f of fish) if (Math.hypot(f.x - x, f.y - y) < rad && f.st !== 'bite') { if (f.tgt && f.tgt.bite === f) f.tgt.bite = null; f.st = 'flee'; f.tT = 0.8; f.a = Math.atan2(f.y - y, f.x - x); f.tgt = null; } }
  function pull(q) {
    if (over || q.cd > 0) return;
    if (q.bite === 'big') { big.press.add(q.p); if (!cpu(q.p)) k.sfx('pop'); return; }
    if (q.bite && q.bite.st === 'bite') {
      const f = q.bite; q.pts += f.val; fish.splice(fish.indexOf(f), 1); respawn.push(T + k.rnd(1, 2)); q.bite = null; q.cd = 0.5; q.rest = 0;
      k.float('+' + f.val, q.x, q.y - 26, f.gold ? '#ffd166' : '#fff'); k.burst(q.x, q.y, f.gold ? '#ffd166' : '#bfe8ff', 12, 150); ring(q.x, q.y, 26); if (!cpu(q.p)) k.sfx('coin'); return;
    }
    // tirón en falso: recoge y espanta
    q.cd = 0.7; q.rest = 0; ring(q.x, q.y, 18); scare(q.x, q.y, 110); if (q.bite) { q.bite = null; } if (!cpu(q.p)) k.sfx('click');
  }
  function aiTarget(q) {
    if (big && big.st === 'lurk') {
      const mate = ps.find((o) => o !== q && o.rest > 0.4 && Math.hypot(o.x - big.x, o.y - big.y) < 110);
      if (mate && Math.random() < lerp(0.5, 0.9, SK())) { const a = Math.atan2(q.y - big.y, q.x - big.x); q.tx = big.x + Math.cos(a) * 40; q.ty = big.y + Math.sin(a) * 30; return; }
    }
    if (q.rest > 0 && fish.some((f) => f.tgt === q)) return;
    if (q.rest > lerp(4, 2.2, SK())) {
      const free = fish.filter((f) => f.st === 'swim'); if (!free.length) return;
      const f = free.reduce((b, f2) => (Math.hypot(f2.x - q.x, f2.y - q.y) < Math.hypot(b.x - q.x, b.y - q.y) ? f2 : b));
      let tx = f.x + Math.cos(f.a) * 60 + k.rnd(-25, 25), ty = f.y + Math.sin(f.a) * 40 + k.rnd(-20, 20);
      if (!inPond(tx, ty, 30)) { tx = (tx + CX) / 2; ty = (ty + CY) / 2; }
      q.tx = tx; q.ty = ty;
    }
  }
  m.update = (dt) => {
    T += dt;
    while (respawn.length && respawn[0] <= T) { respawn.shift(); if (fish.length < 8) spawnFish(true); }
    for (let i = rings.length - 1; i >= 0; i--) if ((rings[i].t -= dt) <= 0) rings.splice(i, 1);
    // flotadores
    for (const q of ps) {
      q.cd -= dt; q.bob += dt;
      let d = { x: 0, y: 0 };
      if (!over && !q.bite) {
        if (cpu(q.p)) { q.aiT -= dt; if (q.aiT <= 0) { q.aiT = k.rnd(0.25, 0.5); aiTarget(q); } const dx = q.tx - q.x, dy = q.ty - q.y, mm = Math.hypot(dx, dy); if (mm > 6) d = { x: dx / mm, y: dy / mm }; }
        else d = dirOf(q.p, q.x, q.y);
      }
      q.mv = Math.hypot(d.x, d.y) > 0.15;
      if (q.mv) { const nx = q.x + d.x * 190 * dt, ny = q.y + d.y * 150 * dt; if (inPond(nx, ny, 22)) { q.x = nx; q.y = ny; } q.rest = 0; } else q.rest += dt;
      if (over) continue;
      if (cpu(q.p)) {
        if (q.fake >= 0 && (q.fake -= dt) < 0) pull(q);
        if (q.bite && q.react >= 0 && (q.react -= dt) < 0) pull(q);
      } else if (A(q.p)) pull(q);
    }
    // peces
    for (const f of fish) {
      f.fade = Math.min(1, f.fade + dt * 1.5);
      if (f.st === 'swim') {
        if ((f.turnT -= dt) <= 0) { f.a += k.rnd(-1.1, 1.1); f.turnT = k.rnd(0.6, 1.6); }
        const nx = f.x + Math.cos(f.a) * f.v * dt, ny = f.y + Math.sin(f.a) * f.v * dt;
        if (inPond(nx, ny, 26)) { f.x = nx; f.y = ny; } else f.a = Math.atan2(CY - f.y, CX - f.x) + k.rnd(-0.5, 0.5);
        if (!over && T > 1.5) for (const q of ps) if (q.rest > 0.6 && !q.bite && q.cd <= 0 && Math.hypot(q.x - f.x, q.y - f.y) < 140 && !fish.some((o) => o.tgt === q)) { f.st = 'go'; f.tgt = q; break; }
      } else if (f.st === 'go') {
        const q = f.tgt;
        if (q.rest < 0.2 || q.bite) { f.st = 'flee'; f.tT = 0.6; f.a += Math.PI; f.tgt = null; continue; }
        const dx = q.x - f.x, dy = q.y - f.y, mm = Math.hypot(dx, dy); f.a = Math.atan2(dy, dx);
        if (mm > 14) { f.x += dx / mm * 58 * dt; f.y += dy / mm * 58 * dt; }
        else { f.st = 'nib'; f.tT = k.rnd(0.5, 1.8); if (cpu(q.p) && Math.random() < lerp(0.22, 0.04, SK())) q.fake = k.rnd(0.15, 0.4); }
      } else if (f.st === 'nib') {
        const q = f.tgt; if (q.rest < 0.2 || (q.bite && q.bite !== f)) { f.st = 'flee'; f.tT = 0.6; f.tgt = null; continue; }
        if ((f.tT -= dt) <= 0) { f.st = 'bite'; f.tT = lerp(0.95, 0.75, ease(T / TL)); q.bite = f; q.fake = -1; q.react = cpu(q.p) ? (Math.random() < lerp(0.18, 0.04, SK()) ? 9 : lerp(0.55, 0.22, SK()) * k.rnd(0.8, 1.25)) : -1; ring(q.x, q.y, 14); if (!cpu(q.p)) k.sfx('tick'); }
      } else if (f.st === 'bite') {
        const q = f.tgt; if ((f.tT -= dt) <= 0) { q.bite = null; f.st = 'flee'; f.tT = 0.9; f.tgt = null; f.a = k.rnd(0, TAU); if (!cpu(q.p)) k.float('Se escapó', q.x, q.y - 26, '#ff8a8a'); }
      } else if (f.st === 'flee') {
        const nx = f.x + Math.cos(f.a) * 140 * dt, ny = f.y + Math.sin(f.a) * 140 * dt; if (inPond(nx, ny, 26)) { f.x = nx; f.y = ny; } else f.a += 2;
        if ((f.tT -= dt) <= 0) { f.st = 'swim'; f.tgt = null; }
      }
    }
    // pez gordo
    if (!big && !over && T >= bigNext && T < TL - 6) big = { x: k.rnd(CX - 180, CX + 180), y: k.rnd(CY - 50, CY + 50), a: k.rnd(0, TAU), life: 11, st: 'lurk', bT: 0, pair: [], press: new Set(), fade: 0 };
    if (big) {
      big.fade = Math.min(1, big.fade + dt); big.life -= dt;
      if (big.st === 'lurk') {
        big.a += Math.sin(T * 0.7) * dt * 0.8; const nx = big.x + Math.cos(big.a) * 22 * dt, ny = big.y + Math.sin(big.a) * 22 * dt; if (inPond(nx, ny, 80)) { big.x = nx; big.y = ny; } else big.a += Math.PI * 0.7;
        const near = ps.filter((q) => q.rest > 0.5 && !q.bite && q.cd <= 0 && Math.hypot(q.x - big.x, q.y - big.y) < 100).sort((a, b) => Math.hypot(a.x - big.x, a.y - big.y) - Math.hypot(b.x - big.x, b.y - big.y));
        if (near.length >= 2 && !over) {
          big.st = 'bite'; big.bT = 1.4; big.pair = near.slice(0, 2); big.press.clear();
          for (const q of big.pair) { for (const f of fish) if (f.tgt === q) { f.st = 'flee'; f.tT = 0.5; f.tgt = null; } q.bite = 'big'; q.fake = -1; q.react = cpu(q.p) ? (Math.random() < lerp(0.2, 0.05, SK()) ? 9 : lerp(0.6, 0.25, SK()) * k.rnd(0.8, 1.3)) : -1; ring(q.x, q.y, 30); }
          k.shake(3); if (!demo) k.sfx('hit');
        } else if (big.life <= 0) { ring(big.x, big.y, 50); big = null; bigNext = T + k.rnd(10, 14); }
      } else if (big.st === 'bite') {
        big.bT -= dt;
        if (big.pair.every((q) => big.press.has(q.p))) {
          for (const q of big.pair) { q.pts += 4; q.bite = null; q.cd = 0.6; q.rest = 0; k.float('+4', q.x, q.y - 30, '#ffd166'); }
          k.confetti('#ffd166', 40); k.shake(5); if (!demo) k.sfx('win'); k.float('¡Pez gordo!', big.x, big.y - 50, '#ffd166'); ring(big.x, big.y, 70); big = null; bigNext = T + k.rnd(11, 15);
        } else if (big.bT <= 0) { for (const q of big.pair) { q.bite = null; q.cd = 0.5; } k.float('¡Se escapó el gordo!', big.x, big.y - 50, '#ff8a8a'); ring(big.x, big.y, 60); big = null; bigNext = T + k.rnd(10, 14); }
      }
    }
    if (!over && T >= TL) { over = true; endT = 2.2; k.sfx('coin'); for (const q of ps) if (q.bite && q.bite !== 'big') q.bite = null; if (big) { for (const q of big.pair) q.bite = null; big = null; } m.rank = rankBy(ps, (q) => q.pts); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  function fishDraw(f) {
    c.save(); c.translate(f.x, f.y); c.rotate(f.a); c.globalAlpha = f.fade * (f.gold ? 0.85 : 0.55);
    const s = f.sz === 2 ? 1.35 : 1, wig = Math.sin(t * 12 + f.x) * 0.35;
    c.fillStyle = f.gold ? '#ffcf4a' : '#1d3a66';
    c.beginPath(); c.ellipse(0, 0, 15 * s, 6.5 * s, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-12 * s, 0); c.lineTo(-24 * s, -7 * s + wig * 6); c.lineTo(-24 * s, 7 * s + wig * 6); c.closePath(); c.fill();
    c.restore(); c.globalAlpha = 1;
  }
  m.draw = () => {
    ART.background(c, TH.jungle, W, 140, 0, 0, t); c.fillStyle = '#5ab04f'; c.fillRect(0, 110, W, H - 110);
    c.beginPath(); c.ellipse(CX, CY, RX, RY, 0, 0, TAU); const wg = c.createLinearGradient(0, CY - RY, 0, CY + RY); wg.addColorStop(0, '#5fc3ef'); wg.addColorStop(1, '#2a7fc0'); c.fillStyle = wg; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2; for (let i = 0; i < 7; i++) { const x = CX - 260 + i * 86, y = CY - 90 + ((i * 53) % 170), o = Math.sin(t + i) * 8; c.beginPath(); c.moveTo(x - 20 + o, y); c.quadraticCurveTo(x + o, y - 5, x + 20 + o, y); c.stroke(); }
    for (const [x, y] of [[112, 170], [680, 150], [590, 300], [200, 300]]) { c.beginPath(); c.moveTo(x, y); c.arc(x, y, 18, 0.3, TAU - 0.2); c.closePath(); ART.fillOut(c, '#4fb35c', 2.2); }
    for (const [x, y] of [[70, 230], [735, 240], [62, 180]]) for (let i = 0; i < 3; i++) { c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(x + i * 7, y); c.lineTo(x + i * 7 - 3, y - 36 - i * 6); c.stroke(); c.strokeStyle = '#3f9e6a'; c.lineWidth = 2.2; c.stroke(); ART.rr(c, x + i * 7 - 7, y - 50 - i * 6, 7, 16, 3); ART.fillOut(c, '#8a5a3b', 1.6); }
    if (big) { c.save(); c.translate(big.x, big.y); c.rotate(big.a); c.globalAlpha = big.fade * 0.6; c.fillStyle = '#0f2346'; const w = big.st === 'bite' ? Math.sin(t * 30) * 3 : 0;
      c.beginPath(); c.ellipse(w, 0, 52, 22, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-44, 0); c.lineTo(-78, -22); c.lineTo(-78, 22); c.closePath(); c.fill(); c.beginPath(); c.moveTo(0, -18); c.lineTo(-18, -34); c.lineTo(10, -20); c.fill(); c.restore(); c.globalAlpha = 1;
      if (big.st === 'bite') label('¡Tirad a la vez!', big.x, big.y - 58, 22, '#ffd166'); }
    for (const f of fish) fishDraw(f);
    for (const r of rings) { c.strokeStyle = `rgba(255,255,255,${r.t / 0.6})`; c.lineWidth = 2.5; c.beginPath(); c.ellipse(r.x, r.y, r.r * (1.6 - r.t), r.r * 0.55 * (1.6 - r.t), 0, 0, TAU); c.stroke(); }
    // muelle
    c.fillStyle = '#b27a44'; c.fillRect(0, 378, W, H - 378); c.strokeStyle = 'rgba(60,35,15,.45)'; c.lineWidth = 2; for (let x = 0; x < W; x += 46) { c.beginPath(); c.moveTo(x, 378); c.lineTo(x, H); c.stroke(); }
    c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 378); c.lineTo(W, 378); c.stroke();
    for (const q of ps) {
      const x = X[q.p], tipx = x + 16, tipy = TIP - 30;
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(tipx, tipy); c.quadraticCurveTo((tipx + q.x) / 2, Math.max(tipy, q.y) + 20, q.x, q.y); c.stroke();
      guy(q.p, x, 436, 1.25, { face: q.x >= x ? 1 : -1, state: 'idle' });
      c.strokeStyle = OUT; c.lineWidth = 4.5; c.beginPath(); c.moveTo(x + 6, 412); c.lineTo(tipx, tipy); c.stroke(); c.strokeStyle = '#8a5a3b'; c.lineWidth = 2.5; c.stroke();
      const biting = q.bite && (q.bite === 'big' || q.bite.st === 'bite'), nib = fish.some((f) => f.tgt === q && f.st === 'nib');
      const dy = biting ? 7 : nib ? Math.sin(t * 28) * 2 : Math.sin(q.bob * 3) * 1.2;
      c.save(); c.translate(q.x, q.y + dy);
      c.beginPath(); c.arc(0, 0, 9, 0, TAU); ART.fillOut(c, '#fff', 2.2);
      c.beginPath(); c.arc(0, 0, 9, Math.PI, TAU); c.closePath(); c.fillStyle = col(q.p); c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = OUT; c.fillRect(-1.5, -16, 3, 8);
      if (biting) { c.fillStyle = 'rgba(42,127,192,.85)'; c.fillRect(-12, 2, 24, 10); }
      c.restore();
      if (biting) label('!', q.x + 16, q.y - 18, 24, '#ffd166');
      label(String(q.pts), x + 46, 424, 24, over && m.rank[q.p] === 0 ? '#7cf7a0' : '#fff');
      tagDraw(q.p, x - 40, 402);
    }
    if (!over) label(`${Math.max(0, Math.ceil(TL - T))} s`, 400, 64, 22, '#fff');
  };
  return m;
}

/* 13. ESTATUAS MUSICALES — baila mientras suena; al «¡ALTO!», quieto. */
function mgStatue() {
  const F = { x0: 80, x1: 720, y0: 258, y1: 428 };
  const m = { name: 'Estatuas Musicales', help: 'Baila con el joystick mientras suena la música. Al «¡ALTO!», suelta todo: quien se mueva, fuera.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, x: 180 + p * 147, y: 340 + (p % 2) * 40, face: 1, mv: false, meter: 1, out: -1, tx: 0, ty: 0, aiT: 0, rt: 0, why: '' }));
  let T = 0, st = 'music', sT = 0, dur = k.rnd(5.8, 8), stops = 0, beat = 0, over = false, endT = 0, grace = 0.5, hold = 2;
  const notes = [];
  function out(q, why) { if (q.out >= 0) return; q.out = T; q.why = why; k.sfx('hurt'); k.burst(q.x, q.y - 20, col(q.p), 12, 160); k.float(why, q.x, q.y - 90, '#ff8a8a'); }
  const moving = (q) => { const d = k.pdir(q.p); return d.x || d.y || k.phit(q.p, 'a') || k.phit(q.p, 'b') || (q.p === 0 && !k.party && k.ptr.down); };
  m.update = (dt) => {
    if (fastFwd(ps)) dt *= 3;
    T += dt; sT += dt;
    if (st === 'music') {
      beat += dt; if (beat > 0.42) { beat = 0; if (!demo) k.sfx(Math.random() < 0.5 ? 'tick' : 'click'); notes.push({ x: 150 + k.rnd(-20, 20), y: 120, vx: k.rnd(-60, 60), t: 1.4, c: k.pick(['#ff9ad5', '#ffd166', '#7cf7a0', '#8fd3ff']) }); }
      if (sT >= dur && !over) { st = 'stop'; sT = 0; stops++; grace = lerp(0.55, 0.26, ease(stops / 7)); hold = k.rnd(1.8, 3); k.flash('rgba(255,90,95,.3)'); if (!demo) k.sfx('hit');
        for (const q of ps) q.rt = clamp(lerp(0.42, 0.24, SK()) + gauss() * lerp(0.08, 0.05, SK()), 0.14, 1); }
    } else if (sT >= hold && !over) { st = 'music'; sT = 0; dur = k.rnd(3.2, 7.2) * lerp(1, 0.75, ease(stops / 8)); if (!demo) k.sfx('start'); }
    for (let i = notes.length - 1; i >= 0; i--) { const n = notes[i]; n.t -= dt; n.x += n.vx * dt; n.y -= 40 * dt; if (n.t <= 0) notes.splice(i, 1); }
    for (const q of ps) {
      if (q.out >= 0) continue;
      let d = { x: 0, y: 0 };
      if (cpu(q.p)) {
        const dancing = st === 'music' || sT < q.rt;
        if (dancing) { q.aiT -= dt; if (q.aiT <= 0 || Math.hypot(q.tx - q.x, q.ty - q.y) < 10) { q.aiT = k.rnd(0.8, 1.8); q.tx = k.rnd(F.x0 + 20, F.x1 - 20); q.ty = k.rnd(F.y0 + 10, F.y1 - 10); } const dx = q.tx - q.x, dy = q.ty - q.y, mm = Math.hypot(dx, dy); if (mm > 4) d = { x: dx / mm, y: dy / mm }; }
        if (st === 'stop' && q.rt > grace && sT >= grace && !over) out(q, '¡Se movió!');
      } else {
        d = dirOf(q.p, q.x, q.y - 30);
        if (st === 'stop' && sT >= grace && moving(q) && !over) out(q, '¡Te moviste!');
      }
      if (q.out >= 0) continue;
      q.mv = Math.hypot(d.x, d.y) > 0.15; q.x = clamp(q.x + d.x * 160 * dt, F.x0, F.x1); q.y = clamp(q.y + d.y * 120 * dt, F.y0, F.y1); if (Math.abs(d.x) > 0.2) q.face = d.x > 0 ? 1 : -1;
      if (st === 'music' && !over) { if (q.mv) q.meter = Math.min(1, q.meter + dt * 0.8); else q.meter -= dt * (T < 5 ? 0.08 : 0.3 + 0.02 * stops); if (q.meter <= 0) out(q, '¡A bailar!'); }
    }
    const alive = ps.filter((q) => q.out < 0).length;
    if (!over && (alive <= 1 || T > 90)) { over = true; endT = 1.8; k.sfx('coin'); m.rank = rankBy(ps, (q) => (q.out < 0 ? 1e9 : q.out)); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  m.draw = () => {
    ART.background(c, TH.night, W, H, 0, 0, t);
    const on = st === 'music' && !over, cols = ['#6e62f5', '#ff6fb5', '#5b8cff', '#a8cf3f', '#ffc94d'], bt = Math.floor(T / 0.42);
    for (let r = 0; r < 5; r++) for (let i = 0; i < 12; i++) {
      const y0 = F.y0 - 12 + r * 38, y1 = y0 + 38, sh = (y) => (y - 200) / 250, xa = 400 + (i - 6) * 70 * (0.8 + sh(y0) * 0.5), xb = 400 + (i - 5) * 70 * (0.8 + sh(y0) * 0.5), xc = 400 + (i - 5) * 70 * (0.8 + sh(y1) * 0.5), xd = 400 + (i - 6) * 70 * (0.8 + sh(y1) * 0.5);
      c.beginPath(); c.moveTo(xa, y0); c.lineTo(xb, y0); c.lineTo(xc, y1); c.lineTo(xd, y1); c.closePath();
      c.fillStyle = on && (i + r + bt) % 3 === 0 ? cols[(i * 3 + r + bt) % 5] : (i + r) % 2 ? '#2d2452' : '#3a2f66'; c.fill(); c.strokeStyle = 'rgba(26,21,48,.8)'; c.lineWidth = 1.5; c.stroke();
    }
    // gramola
    const gx = 118, gy = 196;
    ART.rr(c, gx - 46, gy - 10, 92, 60, 10); ART.fillOut(c, '#a0703f', 3);
    c.beginPath(); c.ellipse(gx, gy - 12, 40, 9, 0, 0, TAU); ART.fillOut(c, '#1a1530', 2); c.fillStyle = on ? cols[bt % 5] : '#555'; c.beginPath(); c.ellipse(gx, gy - 12, 8, 2.5, 0, 0, TAU); c.fill();
    c.save(); c.translate(gx + 22, gy - 16); c.rotate(-0.5); c.beginPath(); c.moveTo(0, 0); c.lineTo(10, -40); c.lineTo(-30, -84); c.quadraticCurveTo(10, -104, 42, -70); c.lineTo(16, -42); c.closePath(); ART.fillOut(c, '#ffd166', 3); c.restore();
    for (const n of notes) { c.globalAlpha = Math.min(1, n.t); c.save(); c.translate(n.x, n.y); c.beginPath(); c.ellipse(0, 0, 7, 5, -0.4, 0, TAU); ART.fillOut(c, n.c, 1.8); c.fillStyle = OUT; c.fillRect(5, -22, 2.5, 22); c.restore(); c.globalAlpha = 1; }
    if (st === 'stop' && !over) { panel(250, 70, 300, 64, 18, '#ff5a5f', 4); label('¡ALTO!', 400, 103, 42, '#fff'); }
    else if (!over) label('¡A bailar!', 400, 100, 30, '#ffd166');
    for (const q of [...ps].sort((a, b) => a.y - b.y)) {
      if (q.out >= 0) { c.globalAlpha = 0.5; guy(q.p, q.x, q.y, 1.4, { face: q.face, state: 'fall', squash: 0.6 }); c.globalAlpha = 1; label('Fuera', q.x, q.y + 14, 16, '#ff8a8a'); continue; }
      const dance = st === 'music' && q.mv, frozen = st === 'stop' && !q.mv;
      guy(q.p, q.x, q.y, 1.5, { face: q.face, state: dance ? 'run' : q.mv ? 'run' : 'idle', t: frozen ? 0.3 : undefined, squash: dance ? Math.abs(Math.sin(T * 7.5)) * 0.08 : 0 });
      tagDraw(q.p, q.x, q.y - 92);
      c.fillStyle = 'rgba(26,21,48,.8)'; c.fillRect(q.x - 26, q.y + 8, 52, 8); c.fillStyle = q.meter > 0.35 ? '#7cf7a0' : '#ff8a8a'; c.fillRect(q.x - 25, q.y + 9, 50 * Math.max(0, q.meter), 6); c.strokeStyle = OUT; c.lineWidth = 1.5; c.strokeRect(q.x - 26, q.y + 8, 52, 8);
      if (over && m.rank[q.p] === 0) star(q.x + 28, q.y - 60, 12);
    }
    if (fastFwd(ps)) ffLabel();
  };
  return m;
}

/* 14. CUENTA OVEJAS — cuenta las que saltan la valla; las que vuelven restan y las cabras no cuentan. */
function mgSheep() {
  const lv = clamp(round || 1, 1, 3), GY = 318, FX = 400;
  const m = { name: 'Cuenta Ovejas', help: 'Cuenta las ovejas que saltan a la derecha; las que vuelven restan y las cabras no. A suma, B resta.', done: false, rank: null };
  const ev = []; let at = 1.2, count = 0, right = 0;
  const nEv = 8 + lv * 3 + k.ri(0, 3);
  for (let i = 0; i < nEv; i++) {
    let kind = 'r'; const r = Math.random();
    if (lv >= 2 && right > 1 && r < 0.18) kind = 'l'; else if (lv >= 2 && r < 0.32) kind = 'b'; else if ((lv >= 3 && r < 0.46) || (lv === 2 && r < 0.4)) kind = 'g';
    if (kind === 'r') { count++; right++; } else if (kind === 'l') { count--; right--; }
    ev.push({ at, kind }); at += lv >= 3 && Math.random() < 0.3 ? k.rnd(0.3, 0.45) : k.rnd(0.55, 1.25) * lerp(1.1, 0.85, (lv - 1) / 2);
  }
  const lastAt = at, SP = lerp(170, 220, (lv - 1) / 2);
  const ps = [0, 1, 2, 3].map((p) => ({ p, click: 0, cl: 0, g: 0, lock: -1, tgt: 0, stepT: 0, lockAt: 0 }));
  const sheep = []; let T = 0, st = 'show', sT = 0;
  m.update = (dt) => {
    T += dt; sT += dt;
    while (ev.length && ev[0].at <= T) { const e = ev.shift(); const l2r = e.kind !== 'l'; sheep.push({ kind: e.kind, x: l2r ? -50 : W + 50, dir: l2r ? 1 : -1, turn: 0, v: SP * k.rnd(0.9, 1.1), ph: k.rnd(0, 6) }); }
    for (let i = sheep.length - 1; i >= 0; i--) {
      const s = sheep[i];
      if (s.kind === 'b' && s.dir === 1 && s.x > FX - 70 && s.turn === 0) { s.turn = 0.7; }
      if (s.turn > 0) { s.turn -= dt; if (s.turn <= 0) { s.dir = -1; s.turn = -1; } continue; }
      s.x += s.dir * s.v * dt; s.ph += dt * s.v / 20;
      if (s.x < -80 || s.x > W + 80) sheep.splice(i, 1);
    }
    if (st === 'show') {
      for (const q of ps) if (!cpu(q.p)) {
        if (A(q.p)) { q.click++; q.cl = 0.18; k.sfx('click'); }
        if (k.phit(q.p, 'b')) { q.click = Math.max(0, q.click - 1); q.cl = 0.18; k.sfx('click'); }
      }
      for (const q of ps) q.cl -= dt;
      if (T > lastAt && !sheep.length) { st = 'guess'; sT = 0; k.sfx('start');
        for (const q of ps) { q.g = clamp(q.click, 0, 40); q.tgt = clamp(count + Math.round(gauss() * lerp(1.5, 0.45, SK()) * (0.8 + lv * 0.2)), 0, 40); q.lockAt = k.rnd(2, 5); if (cpu(q.p)) q.g = clamp(q.tgt + k.ri(-3, 3), 0, 40); } }
    } else if (st === 'guess') {
      for (const q of ps) { if (q.lock >= 0) continue;
        if (cpu(q.p)) { q.stepT -= dt; if (q.stepT <= 0 && q.g !== q.tgt) { q.g += Math.sign(q.tgt - q.g); q.stepT = 0.2; } if (q.g === q.tgt && sT > q.lockAt) q.lock = sT; }
        else {
          if (k.phit(q.p, 'up') || k.phit(q.p, 'right')) { q.g = Math.min(40, q.g + 1); k.sfx('click'); }
          if (k.phit(q.p, 'down') || k.phit(q.p, 'left')) { q.g = Math.max(0, q.g - 1); k.sfx('click'); }
          if (k.phit(q.p, 'a')) { q.lock = sT; k.sfx('pop'); }
          if (q.p === 0 && !k.party && k.ptr.hit && Math.abs(k.ptr.x - XP[0]) < 90 && k.ptr.y > 270) { const dx = k.ptr.x - XP[0]; if (dx < -28) q.g = Math.max(0, q.g - 1); else if (dx > 28) q.g = Math.min(40, q.g + 1); else q.lock = sT; k.sfx('click'); }
        } }
      if (ps.every((q) => q.lock >= 0) || sT > 12) { for (const q of ps) if (q.lock < 0) q.lock = 99; st = 'reveal'; sT = 0; k.sfx('coin');
        const v = (q) => Math.abs(q.g - count) * 100 + q.lock; m.rank = ps.map((q) => ps.filter((o) => v(o) < v(q) - 1e-9).length); }
    } else if (st === 'reveal' && sT > 2.8) m.done = true;
  };
  function sheepDraw(s) {
    const goat = s.kind === 'g', f = s.dir, jx = (s.x - (FX - 55)) / 110, jump = jx > 0 && jx < 1 ? Math.sin(Math.PI * jx) * 72 : 0, y = GY - jump, air = jump > 2;
    c.save(); c.translate(s.x, y); c.scale(f, 1);
    ART.shadow(c, 0, jump + 1, 22, air ? 0.12 : 0.22);
    const lg = air ? 0 : Math.sin(s.ph) * 5;
    for (const [lx, o] of [[-12, lg], [-6, -lg], [9, -lg], [14, lg]]) { c.strokeStyle = OUT; c.lineWidth = 4.5; c.beginPath(); c.moveTo(lx, -14); c.lineTo(lx + (air ? (lx < 0 ? -6 : 6) : o), 0); c.stroke(); c.strokeStyle = goat ? '#6b4329' : '#3a3050'; c.lineWidth = 2.5; c.stroke(); }
    if (goat) {
      c.beginPath(); c.ellipse(0, -22, 22, 12, 0, 0, TAU); ART.fillOut(c, '#c08a55', 2.6);
      c.beginPath(); c.moveTo(-20, -26); c.lineTo(-28, -34); c.lineTo(-22, -22); ART.fillOut(c, '#c08a55', 2);
      c.beginPath(); c.ellipse(24, -34, 9, 8, 0.3, 0, TAU); ART.fillOut(c, '#c08a55', 2.4);
      c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(22, -40); c.quadraticCurveTo(18, -56, 8, -54); c.stroke(); c.strokeStyle = '#e8e3ff'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.moveTo(28, -28); c.lineTo(31, -18); c.lineTo(25, -26); ART.fillOut(c, '#f5f1e6', 1.5);
      c.fillStyle = OUT; c.beginPath(); c.arc(27, -36, 1.8, 0, TAU); c.fill();
    } else {
      const puffs = [[-14, -24, 10], [-4, -30, 11], [8, -28, 11], [15, -20, 9], [0, -18, 11], [-12, -15, 8]];
      for (const [x, yy, r] of puffs) { c.beginPath(); c.arc(x, yy, r, 0, TAU); ART.fillOut(c, '#f5f1e6', 2.6); }
      for (const [x, yy, r] of puffs) { c.beginPath(); c.arc(x, yy, r - 1.4, 0, TAU); c.fillStyle = '#f5f1e6'; c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(-6, -34, 4, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(24, -28, 8, 10, 0.25, 0, TAU); ART.fillOut(c, '#3a3050', 2.4);
      c.beginPath(); c.ellipse(17, -34, 5, 2.6, -0.5, 0, TAU); ART.fillOut(c, '#3a3050', 1.6);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(26, -31, 2.2, 0, TAU); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(26.6, -31, 1.1, 0, TAU); c.fill();
    }
    c.restore();
  }
  m.draw = () => {
    ART.background(c, TH.meadow, W, GY, 0, 0, t); ground(GY - 4, '#6cc27a', '#4fa860');
    c.fillStyle = 'rgba(40,110,50,.25)'; for (let i = 0; i < 26; i++) { const x = (i * 71) % W, y = GY + 10 + ((i * 29) % 120); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3, y - 8); c.lineTo(x + 6, y); c.fill(); }
    const fence = () => { for (const dx of [-26, 26]) { ART.rr(c, FX + dx - 5, GY - 58, 10, 62, 3); ART.fillOut(c, '#a0703f', 2.4); } for (const y of [GY - 46, GY - 24]) { ART.rr(c, FX - 40, y, 80, 9, 3); ART.fillOut(c, '#c98a4b', 2.2); } };
    const back = sheep.filter((s) => s.dir < 0), front = sheep.filter((s) => s.dir > 0);
    back.forEach(sheepDraw); fence(); front.forEach(sheepDraw);
    if (st === 'show') {
      label(lv === 1 ? '¡Cuenta las ovejas que saltan!' : lv === 2 ? 'Ojo: las que vuelven restan y las cabras no cuentan' : 'Ronda final: ¡van en grupo!', 400, 80, lv === 1 ? 28 : 22, '#fff');
      for (const q of ps) { tagDraw(q.p, XP[q.p], 416); if (!cpu(q.p) && q.cl > 0) { c.beginPath(); c.arc(XP[q.p] + 40, 416, 9, 0, TAU); ART.fillOut(c, col(q.p), 2); } }
    } else {
      c.fillStyle = 'rgba(12,9,32,.35)'; c.fillRect(0, 0, W, H);
      label(st === 'guess' ? '¿Cuántas ovejas han pasado?' : `Pasaron ${count} ${count === 1 ? 'oveja' : 'ovejas'}`, 400, 108, 30, st === 'guess' ? '#fff' : '#ffd166');
      if (st === 'guess') label(`${Math.max(0, Math.ceil(12 - sT))} s`, 400, 146, 20, '#ffd166');
      for (const q of ps) {
        const x = XP[q.p], y = 330; panelBox(x - 86, y - 70, 172, 128, col(q.p)); tagDraw(q.p, x, y - 70);
        label(String(q.g), x, y - 8, 48, q.lock >= 0 ? col(q.p) : '#fff');
        if (st === 'guess') { if (q.lock < 0) { arrowGlyph(x - 58, y - 8, 14, 'left', '#9a93c4'); arrowGlyph(x + 58, y - 8, 14, 'right', '#9a93c4'); label('A: OK', x, y + 36, 18, '#ffd166'); } else label('¡Listo!', x, y + 36, 20, '#7cf7a0'); }
        else { const e = q.g - count; label(e === 0 ? '¡Exacto!' : (e > 0 ? '+' : '') + e, x, y + 36, 20, e === 0 ? '#7cf7a0' : '#ffd166'); if (m.rank[q.p] === 0) star(x + 60, y - 50, 12); }
      }
    }
  };
  return m;
}

/* 15. CARRERA DE SACOS — mantén A para cargar el salto; cuanto más cargas, más lejos… y más riesgo de caer de bruces. */
function mgSack() {
  const D = 3200, LY = [214, 270, 326, 382], SAFE = 0.72;
  const m = { name: 'Carrera de Sacos', help: 'Mantén A para cargar y suelta para saltar. Pasada la marca blanca puedes caer de bruces. Evita los charcos.', done: false, rank: null };
  const pud = []; for (let x = 520; x < D - 250; x += k.rnd(380, 520)) pud.push([x, x + k.rnd(70, 95)]);
  const inPud = (d) => pud.some(([a, b]) => d >= a && d <= b);
  const dist = (c0) => 40 + 230 * Math.pow(Math.min(c0, 1), 1.2);
  const ps = [0, 1, 2, 3].map((p) => ({ p, d: 0, c: 0, ch: false, air: 0, airT: 0, from: 0, to: 0, hop: 0, stun: 0, fin: -1, tgt: -1, fall: false, why: '' }));
  let T = 0, cam = 0, first = -1, over = false, endT = 0;
  function release(q) {
    const c0 = q.c; q.ch = false; q.c = 0; if (c0 < 0.04) return;
    const pf = c0 <= SAFE ? 0 : Math.min(0.9, Math.pow((c0 - SAFE) / 0.45, 1.3) * 0.85);
    q.from = q.d; q.to = q.d + dist(c0); q.airT = q.air = 0.3 + 0.25 * Math.min(c0, 1); q.hop = 18 + 44 * Math.min(c0, 1); q.fall = Math.random() < pf; q.tgt = -1;
    if (!cpu(q.p)) k.sfx('jump');
  }
  function aiPick(q) {
    const want = lerp(0.56, 0.72, SK()) + gauss() * lerp(0.1, 0.035, SK());
    let best = want, bc = 1e9;
    for (let c0 = 0.1; c0 <= 0.96; c0 += 0.04) { const land = q.d + dist(c0); const cost = Math.abs(c0 - want) + (inPud(land) ? 5 : 0) + (c0 > SAFE ? (c0 - SAFE) * 3 : 0); if (cost < bc) { bc = cost; best = c0; } }
    if (Math.random() > lerp(0.6, 0.95, SK())) best = want; // a veces no ve el charco
    q.tgt = clamp(best + gauss() * lerp(0.05, 0.02, SK()), 0.08, 1.2);
  }
  m.update = (dt) => {
    T += dt; let lead = 0;
    for (const q of ps) {
      q.stun -= dt;
      if (q.air > 0) {
        q.air -= dt; const pr = 1 - Math.max(0, q.air) / q.airT; q.d = lerp(q.from, q.to, pr);
        if (q.air <= 0) { q.d = q.to;
          if (q.fall) { q.stun = 1.3; q.why = 'bruces'; k.burst(110 + q.d - cam, LY[q.p] + 16, '#e6d6b0', 10, 120); if (!cpu(q.p)) { k.sfx('hurt'); k.float('¡De bruces!', 110 + q.d - cam, LY[q.p] - 40, '#ff8a8a'); } }
          else if (inPud(q.d)) { q.stun = 0.7; q.why = 'charco'; k.burst(110 + q.d - cam, LY[q.p] + 16, '#8fd3ff', 12, 150); if (!cpu(q.p)) { k.sfx('hit'); k.float('¡Chof!', 110 + q.d - cam, LY[q.p] - 40, '#8fd3ff'); } }
          else if (!cpu(q.p)) k.sfx('click');
        }
      } else if (q.fin < 0 && q.stun <= 0 && !over) {
        if (cpu(q.p)) { if (q.tgt < 0) aiPick(q); q.ch = true; q.c += dt * 1.3; if (q.c >= q.tgt) release(q); }
        else { const h = AH(q.p); if (h) { q.ch = true; q.c += dt * 1.3; if (q.c >= 1.25) release(q); } else if (q.ch) release(q); }
      } else if (q.stun > 0) { q.ch = false; q.c = 0; }
      if (q.fin < 0 && q.d >= D && q.air <= 0) { q.fin = T; if (first < 0) { first = T; k.sfx('win'); } else k.sfx('coin'); k.burst(110 + D - cam, LY[q.p] - 20, col(q.p), 18, 200); }
      lead = Math.max(lead, q.d);
    }
    if (!over && (ps.every((q) => q.fin >= 0) || (first >= 0 && T - first > 7) || T > 75)) { over = true; endT = 1.4; m.rank = rankBy(ps, (q) => (q.fin >= 0 ? 1e6 - q.fin : q.d)); }
    if (over && (endT -= dt) <= 0) m.done = true;
    cam += (clamp(lead - 380, 0, D - 540) - cam) * Math.min(1, dt * 5);
  };
  m.draw = () => {
    ART.background(c, TH.meadow, W, 200, cam * 0.6, 0, t);
    ground(190, '#8fd16a', '#6cb84f');
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; for (const y of [190, 242, 298, 354, 410]) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.fillStyle = '#4fa860'; c.fillRect(0, 414, W, H - 414); c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 414); c.lineTo(W, 414); c.stroke();
    for (const [a, b] of pud) { const x0 = 110 + a - cam, x1 = 110 + b - cam; if (x1 < -20 || x0 > W + 20) continue; for (let i = 0; i < 4; i++) { const y = LY[i] + 18; c.beginPath(); c.ellipse((x0 + x1) / 2, y, (x1 - x0) / 2, 9, 0, 0, TAU); ART.fillOut(c, '#5fb4e8', 2); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect((x0 + x1) / 2 - 12, y - 4, 16, 2.5); } }
    for (let m10 = 0; m10 <= 100; m10 += 25) { const x = 110 + m10 * D / 100 - cam; if (x < -40 || x > W + 40) continue;
      if (m10 === 100) { for (let i = 0; i < 11; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#fff' : OUT; c.fillRect(x + j * 11, 190 + i * 20.4, 11, 20.4); } ART.flag(c, x + 11, 190, t, '#ffd166', 64); }
      else { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - 1.5, 190, 3, 224); label(m10 + ' m', x, 430, 18, '#fff'); } }
    for (const q of ps) {
      const x = clamp(110 + q.d - cam, 26, W - 20), jy = q.air > 0 ? Math.sin(Math.PI * (1 - q.air / q.airT)) * q.hop : 0, y = LY[q.p] + 22 - jy;
      if (jy > 1) ART.shadow(c, x, LY[q.p] + 22.5, 13, 0.2);
      const fell = q.stun > 0 && q.why === 'bruces';
      c.save(); c.translate(x, y); if (fell) c.rotate(1.2);
      guy(q.p, 0, 0, 1.35, { face: 1, state: q.air > 0 ? 'jump' : 'idle', squash: q.ch ? Math.min(q.c, 1) * 0.22 : 0 });
      const sq = q.ch ? Math.min(q.c, 1) * 0.22 : 0;
      c.scale(1 + sq, 1 - sq); ART.rr(c, -14, -24, 28, 25, 7); ART.fillOut(c, '#c9a26a', 2.6); c.fillStyle = col(q.p); c.fillRect(-13, -24, 26, 5); c.strokeStyle = OUT; c.lineWidth = 1.6; c.strokeRect(-13, -24, 26, 5);
      c.strokeStyle = 'rgba(90,64,40,.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, -12); c.lineTo(-2, -6); c.moveTo(4, -14); c.lineTo(9, -8); c.stroke();
      c.restore();
      tagDraw(q.p, x, y - 70);
      if (q.fin >= 0) label(`${1 + ps.filter((o) => o.fin >= 0 && o.fin < q.fin).length}.º`, x + 30, y - 32, 22, '#ffd166');
      // medidor de carga
      if (q.ch && q.fin < 0) { const bx = x + 24, by = y - 46, bw = 60; panel(bx - 3, by - 3, bw + 6, 14, 5, 'rgba(26,21,48,.85)', 2); c.fillStyle = '#5fbf45'; c.fillRect(bx, by, bw * SAFE / 1.25, 8); c.fillStyle = '#ffb347'; c.fillRect(bx + bw * SAFE / 1.25, by, bw * (1 - SAFE) / 1.25, 8); c.fillStyle = '#ff5a5f'; c.fillRect(bx + bw / 1.25, by, bw * 0.25 / 1.25, 8);
        c.fillStyle = '#fff'; c.fillRect(bx + bw * SAFE / 1.25 - 1, by - 3, 2, 14); c.beginPath(); c.moveTo(bx + bw * Math.min(q.c, 1.25) / 1.25, by + 9); c.lineTo(bx + bw * Math.min(q.c, 1.25) / 1.25 - 5, by + 16); c.lineTo(bx + bw * Math.min(q.c, 1.25) / 1.25 + 5, by + 16); c.closePath(); ART.fillOut(c, '#fff', 1.5); }
    }
  };
  return m;
}

/* 16. TARTAS AL BLANCO — caseta de feria: dianas, patos y caras de rivales que dejan ciego 2 s. */
function mgPie() {
  const TL = 30, COLS = [170, 285, 400, 515, 630], ROWS = [150, 232, 314], FLY = 0.32;
  const m = { name: 'Tartas al Blanco', help: 'Apunta y lanza con A. Diana 1, pato 2, dorada 3. Si das a la cara de un rival, lo dejas ciego 2 s.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, x: COLS[[0, 4, 1, 3][p]], y: ROWS[1] + 20, cd: 0, blind: 0, pts: 0, aiT: 0, aim: null, wait: 0 }));
  const tg = [], pies = [], splats = []; let T = 0, nextS = 1.2, over = false, endT = 0;
  const free = () => { const used = new Set(tg.filter((g) => g.slot != null).map((g) => g.slot)); const all = []; for (let i = 0; i < 15; i++) if (!used.has(i)) all.push(i); return all; };
  function spawn() {
    const r = Math.random(), sl = free(); if (tg.length >= 6) return;
    if (r < 0.18 && !tg.some((g) => g.kind === 'duck')) { const row = k.ri(0, 2), d = Math.random() < 0.5 ? 1 : -1; tg.push({ kind: 'duck', row, x: d > 0 ? 110 : 690, y: ROWS[row], vx: d * lerp(90, 140, ease(T / TL)), up: 0, life: 99, val: 2, r: 26 }); return; }
    if (!sl.length) return;
    const s = k.pick(sl), x = COLS[s % 5], y = ROWS[Math.floor(s / 5)];
    if (r < 0.32 && T > 5) tg.push({ kind: 'face', slot: s, x, y, who: k.ri(0, 3), up: 0, life: 2.1, val: 1, r: 30 });
    else if (r < 0.44) tg.push({ kind: 'gold', slot: s, x, y, up: 0, life: 1.4, val: 3, r: 20 });
    else tg.push({ kind: 'd', slot: s, x, y, up: 0, life: k.rnd(2.1, 2.8), val: 1, r: 30 });
  }
  function throwPie(q, x, y) {
    if (q.cd > 0 || over) return;
    q.cd = 0.5; const e = q.blind > 0 ? 70 : 0;
    pies.push({ p: q.p, x0: XP[q.p], y0: 470, x1: clamp(x + (e ? k.rnd(-e, e) : 0), 60, 740), y1: clamp(y + (e ? k.rnd(-e, e) : 0), 80, 380), t: 0 });
    if (!cpu(q.p)) k.sfx('shoot');
  }
  function land(pi) {
    const q = ps[pi.p]; splats.push({ x: pi.x1, y: pi.y1, t: 1.4, a: k.rnd(0, TAU) });
    let hit = null; for (const g of tg) if (g.up > 0.6 && !g.hit && Math.hypot(g.x - pi.x1, g.y - 10 - pi.y1) < g.r) { if (g.kind === 'face' && g.who === q.p) continue; hit = g; break; }
    if (!hit) { if (!cpu(q.p)) k.sfx('pop'); return; }
    hit.hit = true; hit.life = Math.min(hit.life, 0.35); q.pts += hit.val;
    if (hit.kind === 'face') { const v = ps[hit.who]; v.blind = 2; k.float('¡Ciego!', hit.x, hit.y - 44, col(hit.who)); if (!cpu(v.p)) k.sfx('hurt'); }
    k.float('+' + hit.val, hit.x, hit.y - 30, hit.kind === 'gold' ? '#ffd166' : '#fff'); k.burst(hit.x, hit.y - 10, '#fff6e0', 12, 170);
    if (!cpu(q.p)) k.sfx(hit.kind === 'gold' ? 'coin' : 'hit');
  }
  function ai(q, dt) {
    if ((q.aiT -= dt) <= 0) {
      q.aiT = k.rnd(0.3, 0.6);
      const live = tg.filter((g) => !g.hit && g.up > 0.3 && !(g.kind === 'face' && g.who === q.p) && (g.kind === 'duck' || g.life > 0.5));
      if (live.length) { const sc = (g) => g.val * (g.kind === 'face' ? lerp(0.6, 1.4, SK()) : 1) - Math.hypot(g.x - q.x, g.y - q.y) / 260 + Math.random() * 0.6; q.aim = live.reduce((b, g) => (sc(g) > sc(b) ? g : b)); q.wait = lerp(0.35, 0.1, SK()) * k.rnd(0.7, 1.3); }
      else q.aim = null;
    }
    const g = q.aim; if (!g || g.hit || tg.indexOf(g) < 0) { q.aim = null; return; }
    const ax = g.x + (g.vx || 0) * FLY, ay = g.y - 10, dx = ax - q.x, dy = ay - q.y, mm = Math.hypot(dx, dy), sp = lerp(210, 330, SK()) * (q.blind > 0 ? 0.4 : 1);
    if (mm > 4) { q.x += dx / mm * Math.min(mm, sp * dt); q.y += dy / mm * Math.min(mm, sp * dt); }
    if (mm < lerp(18, 9, SK())) { q.wait -= dt; if (q.wait <= 0 && q.cd <= 0) { const e = lerp(22, 8, SK()); throwPie(q, q.x + gauss() * e, q.y + gauss() * e); q.aim = null; q.aiT = k.rnd(0.1, 0.3); } }
  }
  m.update = (dt) => {
    T += dt;
    if (!over && (nextS -= dt) <= 0) { spawn(); nextS = lerp(0.95, 0.5, ease(T / TL)) * k.rnd(0.8, 1.2); }
    for (let i = tg.length - 1; i >= 0; i--) {
      const g = tg[i];
      if (g.kind === 'duck' && !g.hit) { g.up = Math.min(1, g.up + dt * 4); g.x += g.vx * dt; if (g.x < 90 || g.x > 710) tg.splice(i, 1); continue; }
      g.life -= dt; g.up = g.life < 0.25 ? Math.max(0, g.life / 0.25) : Math.min(1, g.up + dt * 5); if (g.life <= 0) tg.splice(i, 1);
    }
    for (let i = pies.length - 1; i >= 0; i--) { const pi = pies[i]; pi.t += dt; if (pi.t >= FLY) { pies.splice(i, 1); land(pi); } }
    for (let i = splats.length - 1; i >= 0; i--) if ((splats[i].t -= dt) <= 0) splats.splice(i, 1);
    for (const q of ps) {
      q.cd -= dt; q.blind -= dt;
      if (over) continue;
      if (cpu(q.p)) ai(q, dt);
      else {
        const d = k.pdir(q.p), mm = Math.hypot(d.x, d.y) || 1; q.x = clamp(q.x + d.x / mm * 360 * dt, 60, 740); q.y = clamp(q.y + d.y / mm * 300 * dt, 80, 380);
        if (q.p === 0 && !k.party && k.ptr.hit && k.ptr.y < 400) { q.x = clamp(k.ptr.x, 60, 740); q.y = clamp(k.ptr.y, 80, 380); throwPie(q, q.x, q.y); }
        else if (k.phit(q.p, 'a')) throwPie(q, q.x, q.y);
      }
    }
    if (!over && T >= TL) { over = true; endT = 2; k.sfx('coin'); m.rank = rankBy(ps, (q) => q.pts); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  function target(g) {
    const s = g.up; if (s <= 0) return;
    c.save(); c.translate(g.x, g.y + 26); c.scale(1, s); c.translate(0, -26);
    if (g.kind === 'face') {
      c.save(); c.beginPath(); c.rect(-40, -60, 80, 72); c.clip(); guy(g.who, 0, 34, 2.1, { face: 1, state: 'idle' }); c.restore();
      c.strokeStyle = col(g.who); c.lineWidth = 4; ART.rr(c, -36, -52, 72, 64, 10); c.stroke();
    } else if (g.kind === 'duck') {
      c.beginPath(); c.ellipse(0, -2, 24, 15, 0, 0, TAU); ART.fillOut(c, '#ffd166', 2.6); const f = Math.sign(g.vx);
      c.beginPath(); c.arc(f * 16, -20, 11, 0, TAU); ART.fillOut(c, '#ffd166', 2.4);
      c.beginPath(); c.moveTo(f * 25, -22); c.lineTo(f * 36, -18); c.lineTo(f * 25, -15); c.closePath(); ART.fillOut(c, '#ff9f43', 1.8);
      c.fillStyle = OUT; c.beginPath(); c.arc(f * 19, -23, 2, 0, TAU); c.fill(); c.beginPath(); c.ellipse(-f * 4, -4, 10, 6, 0.2, 0, TAU); c.fillStyle = '#f0b93a'; c.fill();
    } else {
      ART.rr(c, -3, 0, 6, 22, 2); ART.fillOut(c, '#6b4329', 1.8);
      const R = g.kind === 'gold' ? 18 : 28, cs = g.kind === 'gold' ? ['#ffd166', '#fff6d0', '#ffb347'] : ['#ff5a5f', '#fff', '#ff5a5f'];
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -8, R * (1 - i * 0.3), 0, TAU); ART.fillOut(c, cs[i], i ? 1.8 : 2.8); }
      if (g.kind === 'gold') star(0, -8, 6, '#fff');
    }
    if (g.hit) { c.fillStyle = 'rgba(255,248,230,.95)'; c.beginPath(); c.arc(0, -10, g.r * 0.8, 0, TAU); c.fill(); }
    c.restore();
  }
  function splat(x, y, r, a, al) { c.globalAlpha = al; c.fillStyle = '#fff7e6'; c.strokeStyle = 'rgba(26,21,48,.35)'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i <= 12; i++) { const aa = a + i * TAU / 12, rr = r * (i % 2 ? 0.7 : 1); c.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); } c.closePath(); c.fill(); c.stroke(); c.globalAlpha = 1; }
  m.draw = () => {
    ART.background(c, TH.dusk, W, H, 0, 0, t);
    // caseta
    ART.rr(c, 80, 96, 640, 290, 10); ART.fillOut(c, '#6e4a7a', 4);
    for (let i = 0; i < 16; i++) { c.beginPath(); c.moveTo(80 + i * 40, 62); c.lineTo(120 + i * 40, 62); c.lineTo(120 + i * 40, 92); c.quadraticCurveTo(100 + i * 40, 108, 80 + i * 40, 92); c.closePath(); ART.fillOut(c, i % 2 ? '#fff' : '#ff5a5f', 2.2); }
    for (const y of ROWS) { c.fillStyle = '#4a2f55'; c.fillRect(90, y + 20, 620, 10); c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(90, y + 20, 620, 10); }
    for (let s = 0; s < 15; s++) { c.fillStyle = 'rgba(20,10,35,.55)'; c.beginPath(); c.ellipse(COLS[s % 5], ROWS[Math.floor(s / 5)] + 22, 30, 6, 0, 0, TAU); c.fill(); }
    for (const sp of splats) splat(sp.x, sp.y, 16, sp.a, Math.min(1, sp.t));
    for (const g of tg) target(g);
    // mostrador
    ART.rr(c, 60, 384, 680, 70, 8); ART.fillOut(c, '#b27a44', 4); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(64, 410, 672, 3);
    for (const q of ps) { tagDraw(q.p, XP[q.p] - 28, 412); label(String(q.pts), XP[q.p] + 36, 414, 26, over && m.rank[q.p] === 0 ? '#7cf7a0' : '#fff'); }
    for (const pi of pies) { const u = pi.t / FLY, x = lerp(pi.x0, pi.x1, u), y = lerp(pi.y0, pi.y1, u) - Math.sin(Math.PI * u) * 60, s = 1.5 - u * 0.9;
      c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.ellipse(0, 3, 16, 7, 0, 0, TAU); ART.fillOut(c, '#d9a86a', 2); c.beginPath(); c.ellipse(0, -1, 14, 6, 0, 0, TAU); ART.fillOut(c, '#fff7e6', 2); c.fillStyle = '#ff5a5f'; c.beginPath(); c.arc(0, -4, 3, 0, TAU); c.fill(); c.restore(); }
    for (const q of ps) {
      if (q.blind > 0) continue;
      c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.arc(q.x, q.y, 16, 0, TAU); c.stroke(); c.strokeStyle = col(q.p); c.lineWidth = 3.5; c.stroke();
      c.strokeStyle = col(q.p); c.lineWidth = 3; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(q.x + dx * 9, q.y + dy * 9); c.lineTo(q.x + dx * 22, q.y + dy * 22); c.stroke(); }
      label(String(q.p + 1), q.x + 20, q.y - 18, 14, col(q.p), 'center', 3);
    }
    for (const q of ps) if (q.blind > 0) { const al = Math.min(1, q.blind * 2); for (let i = 0; i < 6; i++) splat(q.x + Math.cos(i * 1.1 + q.p) * 50, q.y + Math.sin(i * 1.7 + q.p) * 36, 46 - i * 3, i + q.p, al * 0.96); label(tag(q.p) + ': ¡ciego!', q.x, q.y, 18, col(q.p)); }
    if (!over) label(`${Math.max(0, Math.ceil(TL - T))} s`, 400, 76, 22, '#fff');
  };
  return m;
}

/* 17. CABALLITOS DE FERIA — mete la bola en los agujeros para que avance tu caballo. */
function mgDerby() {
  const GOAL = 22, X = [110, 300, 490, 680], LN = [74, 112, 150, 188], BANDS = [[0.22, 0.44, 1], [0.54, 0.7, 2], [0.8, 0.9, 3]];
  const HOLES = { 1: [[-50, 382], [0, 382], [50, 382]], 2: [[-30, 330], [30, 330]], 3: [[0, 278]] };
  const m = { name: 'Caballitos de Feria', help: 'Pulsa A con la barra en una franja: amarilla 1 paso, naranja 2, roja 3. Fuera de franja, la bola vuelve.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, pts: 0, hx: 0, pw: k.rnd(0, 1), dir: 1, ball: null, cool: 0, fin: -1, tgt: null, gal: 0 }));
  let T = 0, over = false, endT = 0;
  const bandOf = (pw) => { for (const b of BANDS) if (pw >= b[0] && pw <= b[1]) return b[2]; return 0; };
  function roll(q) {
    if (q.ball || q.cool > 0 || over || q.fin >= 0) return;
    const v = bandOf(q.pw), h = v ? k.pick(HOLES[v]) : [k.rnd(-50, 50), q.pw > 0.9 ? 256 : q.pw > 0.7 ? 304 : q.pw > 0.44 ? 356 : 404];
    q.ball = { t: 0, v, hx: h[0], hy: h[1] }; q.tgt = null; if (!cpu(q.p)) k.sfx('click');
  }
  function planAI(q) {
    const r = Math.random(), p3 = lerp(0.15, 0.55, SK()), b = r < p3 ? BANDS[2] : r < p3 + 0.45 ? BANDS[1] : BANDS[0];
    q.tgt = clamp((b[0] + b[1]) / 2 + gauss() * lerp(0.1, 0.035, SK()) * (b[2] === 3 ? 1.2 : 1), 0.02, 0.98);
  }
  m.update = (dt) => {
    T += dt; const sp = lerp(0.85, 1.5, ease(T / 45));
    for (const q of ps) {
      const prev = q.pw; q.pw += q.dir * sp * dt; if (q.pw >= 1) { q.pw = 2 - q.pw; q.dir = -1; } if (q.pw <= 0) { q.pw = -q.pw; q.dir = 1; }
      q.cool -= dt; q.gal = Math.max(0, q.gal - dt);
      q.hx += (q.pts - q.hx) * Math.min(1, dt * 3); if (Math.abs(q.pts - q.hx) > 0.05) q.gal = 0.3;
      if (q.ball) {
        const b = q.ball; b.t += dt;
        if (b.t >= 0.5 && !b.scored) { b.scored = true; if (b.v && !over) { q.pts = Math.min(GOAL, q.pts + b.v); if (!cpu(q.p)) k.sfx(b.v === 3 ? 'coin' : 'pop'); k.float('+' + b.v, X[q.p] + b.hx, b.hy - 20, b.v === 3 ? '#ff8a8a' : '#ffd166'); } }
        if (b.t >= (b.v ? 0.9 : 1.2)) { q.ball = null; q.cool = 0.25; }
      } else if (!over && q.fin < 0 && T > 0.6) {
        if (cpu(q.p)) { if (q.tgt == null) planAI(q); if ((prev - q.tgt) * (q.pw - q.tgt) <= 0 && Math.random() < lerp(0.55, 0.9, SK())) roll(q); }
        else if (A(q.p)) roll(q);
      }
      if (q.fin < 0 && q.pts >= GOAL) { q.fin = T; if (!over) { k.confetti(col(q.p), 50); k.sfx('win'); } }
    }
    if (!over && (ps.some((q) => q.fin >= 0) || T > 100)) { over = true; endT = 2.2; m.rank = rankBy(ps, (q) => q.pts * 1000 + (q.fin >= 0 ? 500 - q.fin : 0)); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  function horse(x, y, cl, ph) {
    c.save(); c.translate(x, y);
    c.fillStyle = '#e8e3ff'; c.fillRect(-1.5, -52, 3, 52); c.strokeStyle = OUT; c.lineWidth = 1; c.strokeRect(-1.5, -52, 3, 52);
    for (const [lx, o] of [[-13, 0], [-8, 1.6], [9, 3.1], [14, 4.7]]) { const a = Math.sin(ph + o) * 0.5; c.save(); c.translate(lx, -14); c.rotate(a); c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 13); c.stroke(); c.strokeStyle = '#f5f1e6'; c.lineWidth = 3; c.stroke(); c.restore(); }
    c.beginPath(); c.moveTo(-18, -20); c.quadraticCurveTo(-30, -18, -28, -6); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 3; c.strokeStyle = cl; c.stroke();
    c.beginPath(); c.ellipse(0, -20, 20, 10, 0, 0, TAU); ART.fillOut(c, '#f5f1e6', 2.4);
    c.beginPath(); c.moveTo(12, -24); c.lineTo(20, -40); c.lineTo(28, -36); c.lineTo(18, -18); c.closePath(); ART.fillOut(c, '#f5f1e6', 2.2);
    c.save(); c.translate(27, -40); c.rotate(0.35); c.beginPath(); c.ellipse(0, 0, 10, 6, 0, 0, TAU); ART.fillOut(c, '#f5f1e6', 2.2); c.restore();
    c.beginPath(); c.moveTo(22, -46); c.lineTo(24, -52); c.lineTo(26, -45); ART.fillOut(c, '#f5f1e6', 1.6);
    c.beginPath(); c.moveTo(13, -26); c.quadraticCurveTo(14, -44, 22, -46); c.lineWidth = 4.5; c.strokeStyle = cl; c.stroke();
    ART.rr(c, -9, -30, 16, 11, 3); ART.fillOut(c, cl, 1.8);
    c.fillStyle = OUT; c.beginPath(); c.arc(28, -42, 1.6, 0, TAU); c.fill();
    c.restore();
  }
  m.draw = () => {
    c.fillStyle = '#40284a'; c.fillRect(0, 0, W, H); ART.background(c, TH.dusk, W, 60, 0, 0, t);
    // pista de caballos
    ART.rr(c, 20, 50, 760, 160, 12); ART.fillOut(c, '#3f9e6a', 3.5);
    for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'; c.fillRect(24, 54 + i * 38, 752, 38); }
    for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#fff' : OUT; c.fillRect(726, 54 + i * 9.5, 8, 9.5); c.fillStyle = i % 2 ? OUT : '#fff'; c.fillRect(734, 54 + i * 9.5, 8, 9.5); }
    for (const q of ps) { const x = 92 + (q.hx / GOAL) * 628; horse(x, LN[q.p] + 16, col(q.p), q.gal > 0 ? t * 16 : 0); label(String(q.pts), 40, LN[q.p] - 4, 18, col(q.p), 'center', 4); }
    // rampas
    for (const q of ps) {
      const x = X[q.p];
      c.beginPath(); c.moveTo(x - 70, 250); c.lineTo(x + 70, 250); c.lineTo(x + 86, 414); c.lineTo(x - 86, 414); c.closePath(); ART.fillOut(c, '#6e4a7a', 3);
      c.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 5; i++) c.fillRect(x - 70 - i * 3, 262 + i * 32, 140 + i * 6, 2);
      for (const v of [1, 2, 3]) for (const [hx, hy] of HOLES[v]) { c.beginPath(); c.ellipse(x + hx, hy, 15, 8, 0, 0, TAU); ART.fillOut(c, '#1a1530', 2); c.strokeStyle = ['', '#ffd166', '#ff9f43', '#ff5a5f'][v]; c.lineWidth = 3; c.beginPath(); c.ellipse(x + hx, hy, 18, 10, 0, 0, TAU); c.stroke(); }
      if (q.ball) { const b = q.ball, u = Math.min(1, b.t / 0.5); let bx, by, s = 1;
        if (b.t < 0.5) { bx = x + b.hx * u; by = lerp(430, b.hy, 1 - (1 - u) * (1 - u)); }
        else if (b.v) { bx = x + b.hx; by = b.hy; s = Math.max(0, 1 - (b.t - 0.5) / 0.25); }
        else { const w = (b.t - 0.5) / 0.7; bx = x + b.hx * (1 - w); by = lerp(b.hy, 430, w * w); }
        if (s > 0) { c.beginPath(); c.arc(bx, by - 4, 8 * s, 0, TAU); ART.fillOut(c, '#f5f1e6', 2); } }
      // barra de fuerza (horizontal, bajo la rampa)
      const bx = x - 76, by = 424, bw = 152;
      panel(bx - 3, by - 3, bw + 6, 18, 6, 'rgba(26,21,48,.9)', 2);
      for (const [a, b2, v] of BANDS) { c.fillStyle = ['', '#ffd166', '#ff9f43', '#ff5a5f'][v]; c.fillRect(bx + a * bw, by, (b2 - a) * bw, 12); }
      const nx = bx + q.pw * bw; c.beginPath(); c.moveTo(nx, by - 2); c.lineTo(nx - 6, by - 11); c.lineTo(nx + 6, by - 11); c.closePath(); ART.fillOut(c, '#fff', 1.8); c.fillStyle = '#fff'; c.fillRect(nx - 1.5, by, 3, 12);
      tagDraw(q.p, x, 240);
      if (over && m.rank[q.p] === 0) star(x + 64, 236, 12);
    }
  };
  return m;
}

/* =====================================================================================
 * Oleada 3 — ocho minijuegos nuevos de un solo modo (CFG.mode): bowl, bull, egg, photo,
 * relay (coop), hotair (coop), witch, mole. No entran en la ruleta (KEYS es fija).
 * ===================================================================================== */
const hitB = (p) => !cpu(p) && k.phit(p, 'b');
const heldB = (p) => !cpu(p) && k.pheld(p, 'b');
/* Rótulo que se encoge hasta caber en maxW (medida real, nunca desborda). */
function fit(s, x, y, size, cl, maxW, align, lw) {
  let sz = size; c.font = FONT(sz);
  while (sz > 9 && c.measureText(s).width > maxW) { sz--; c.font = FONT(sz); }
  label(s, x, y, sz, cl, align, lw); return sz;
}
/* Franja inferior con los puntos del minijuego (no invade la franja del marcador de arriba). */
function strip(vals, unit, hl) {
  if (phase === 'play' && k.counting()) return; /* el cartel de ronda ocupa esa franja */
  const n = 4, bw = 148, x0 = 8; /* acaba en x=612: no pisa el HUD de pausa/sonido (abajo a la derecha) */
  for (let p = 0; p < n; p++) {
    const x = x0 + p * (bw + 3), y = H - 40;
    panel(x, y, bw, 32, 10, 'rgba(26,21,48,.82)', 2.5);
    ART.rr(c, x + 5, y + 5, 12, 22, 5); ART.fillOut(c, col(p), 2);
    fit(tag(p), x + 23, y + 16, 15, '#fff', 40, 'left', 3);
    fit(String(vals[p]) + (unit || ''), x + bw - 7, y + 16, 18, hl && hl[p] ? '#ffd166' : '#fff', bw - 72, 'right', 3.5);
  }
}

/* 18. BOLOS HUMANOS — te haces bola y ruedas por la bolera; los bolos y los rivales suman. */
let LANE = null;
function mgBowl() {
  const F = { x0: 92, x1: 708, y0: 150, y1: 372 }, HOME = 392, TL = 38;
  const m = { name: 'Bolos Humanos', help: 'Apunta con el joystick, mantén A para coger impulso y suelta para rodar. Bolo 1 punto, el dorado 3, tumbar a un rival 2.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, x: XP[p], y: HOME, aim: -Math.PI / 2, pw: 0, ch: false, ball: null, pts: 0, stun: 0, back: 0, aiT: 0, want: 0, wantA: -Math.PI / 2, face: 1 }));
  const pins = [], marks = []; let T = 0, over = false, endT = 0, rack = 0, wait = 0;
  function newRack() {
    pins.length = 0; rack++; const gold = k.ri(0, 9);
    let i = 0; for (let r = 0; r < 4; r++) for (let j = 0; j <= r; j++, i++) pins.push({ x: 400 + (j - r / 2) * 40, y: 188 + r * 36, r: 12, down: 0, gold: i === gold, vx: 0, vy: 0, rot: 0, vr: 0 });
  }
  newRack();
  const standing = () => pins.filter((q) => !q.down);
  function award(q, n, txt, x, y) { q.pts += n; k.float(txt, x, y, col(q.p)); if (!cpu(q.p)) k.sfx('coin'); }
  function launch(q) {
    const sp = lerp(250, 560, Math.min(1, q.pw));
    q.ball = { x: q.x, y: HOME - 16, vx: Math.cos(q.aim) * sp, vy: Math.sin(q.aim) * sp, r: 15, sp: 0 };
    q.pw = 0; q.ch = false; if (!cpu(q.p)) k.sfx('shoot');
  }
  function aiPlan(q) {
    const st = standing(), foes = ps.filter((o) => o !== q && !o.ball && o.stun <= 0);
    let tx = 400, ty = 240;
    if (foes.length && Math.random() < lerp(0.12, 0.3, SK())) { const f = k.pick(foes); tx = f.x; ty = f.y - 14; }
    else if (st.length) { const g = st.reduce((a, b) => (Math.hypot(b.x - q.x, b.y - q.y) < Math.hypot(a.x - q.x, a.y - q.y) ? b : a)); tx = g.x; ty = g.y; }
    q.wantA = Math.atan2(ty - HOME, tx - q.x) + gauss() * lerp(0.26, 0.06, SK());
    q.want = clamp(0.62 + Math.abs(ty - HOME) / 700 + gauss() * 0.1, 0.35, 1);
  }
  m.update = (dt) => {
    T += dt; if (wait > 0 && (wait -= dt) <= 0) newRack();
    for (const q of ps) {
      q.stun -= dt; q.back -= dt;
      if (q.ball) {
        const b = q.ball; b.x += b.vx * dt; b.y += b.vy * dt;
        const kf = Math.exp(-1.15 * dt); b.vx *= kf; b.vy *= kf;
        if (b.x < F.x0 + b.r) { b.x = F.x0 + b.r; b.vx = Math.abs(b.vx) * 0.72; k.sfx('click'); }
        if (b.x > F.x1 - b.r) { b.x = F.x1 - b.r; b.vx = -Math.abs(b.vx) * 0.72; k.sfx('click'); }
        if (b.y < F.y0 + b.r) { b.y = F.y0 + b.r; b.vy = Math.abs(b.vy) * 0.72; }
        for (const pn of pins) {
          if (pn.down) continue; const d = Math.hypot(pn.x - b.x, pn.y - b.y);
          if (d < b.r + pn.r) {
            pn.down = 1; const a = Math.atan2(pn.y - b.y, pn.x - b.x);
            pn.vx = Math.cos(a) * 260 + b.vx * 0.3; pn.vy = Math.sin(a) * 260 + b.vy * 0.3; pn.vr = k.rnd(-14, 14);
            award(q, pn.gold ? 3 : 1, pn.gold ? '+3' : '+1', pn.x, pn.y - 26); k.sfx('pop'); k.burst(pn.x, pn.y, pn.gold ? '#ffd166' : '#fff', 8, 150);
            b.vx *= 0.9; b.vy *= 0.9;
          }
        }
        for (const o of ps) {
          if (o === q) continue;
          if (o.ball) { const ob = o.ball, d = Math.hypot(ob.x - b.x, ob.y - b.y);
            if (d < b.r + ob.r && d > 0.01) { const ux = (ob.x - b.x) / d, uy = (ob.y - b.y) / d, sp = Math.hypot(b.vx, b.vy);
              if (sp > Math.hypot(ob.vx, ob.vy)) award(q, 1, '¡Choque!', ob.x, ob.y - 30);
              ob.vx += ux * sp * 0.5; ob.vy += uy * sp * 0.5; b.vx -= ux * sp * 0.25; b.vy -= uy * sp * 0.25;
              const push = (b.r + ob.r - d) / 2; ob.x += ux * push; ob.y += uy * push; b.x -= ux * push; b.y -= uy * push; k.sfx('hit');
            } }
          else if (o.stun <= 0 && Math.hypot(o.x - b.x, o.y - 14 - b.y) < b.r + 16 && Math.hypot(b.vx, b.vy) > 90) {
            o.stun = 1.7; award(q, 2, '¡Bolo humano!', o.x, o.y - 70); k.sfx('hurt'); k.shake(6); k.burst(o.x, o.y - 20, col(o.p), 14, 200);
          }
        }
        if (Math.hypot(b.vx, b.vy) < 48 || b.y > HOME + 40) { marks.push({ x: b.x, y: b.y, t: 0.7, cl: col(q.p) }); q.ball = null; q.back = 0.45; q.x = XP[q.p]; }
      } else if (q.back <= 0 && q.stun <= 0 && !over) {
        if (cpu(q.p)) {
          q.aiT -= dt;
          if (!q.ch) { if (q.aiT <= 0) { aiPlan(q); q.ch = true; q.aiT = lerp(0.5, 0.2, SK()); } }
          else { q.aim += clamp(q.wantA - q.aim, -4 * dt, 4 * dt); q.pw += dt / 0.9; if (q.pw >= q.want) { launch(q); q.aiT = lerp(1.6, 0.5, SK()) * k.rnd(0.8, 1.2); } }
        } else {
          const d = dirOf(q.p, q.x, HOME);
          if (Math.hypot(d.x, d.y) > 0.3) { let a = Math.atan2(d.y, d.x); if (a > -0.25) a = -0.25; if (a < -Math.PI + 0.25) a = -Math.PI + 0.25; q.aim += clamp(a - q.aim, -6 * dt, 6 * dt); }
          if (AH(q.p)) { q.ch = true; q.pw = Math.min(1, q.pw + dt / 0.9); }
          else if (q.ch) launch(q);
        }
      }
      if (Math.cos(q.aim) > 0) q.face = 1; else q.face = -1;
    }
    for (const pn of pins) if (pn.down) { pn.x += pn.vx * dt; pn.y += pn.vy * dt; pn.vx *= Math.exp(-3 * dt); pn.vy *= Math.exp(-3 * dt); pn.rot += pn.vr * dt; pn.down = Math.min(1.6, pn.down + dt); }
    for (let i = marks.length - 1; i >= 0; i--) if ((marks[i].t -= dt) <= 0) marks.splice(i, 1);
    if (!standing().length && wait <= 0) { wait = 1; k.sfx('win'); k.float('¡Pleno! Bolos nuevos', 400, 250, '#ffd166'); }
    if (!over && T > TL) { over = true; endT = 1.6; m.rank = rankBy(ps, (q) => q.pts); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  function drawPin(pn) {
    c.save(); c.translate(pn.x, pn.y); if (pn.down) { c.rotate(pn.rot); c.globalAlpha = Math.max(0, 1 - (pn.down - 0.9) / 0.7); }
    const cl = pn.gold ? '#ffd166' : '#fff';
    c.beginPath(); c.moveTo(-8, 10); c.quadraticCurveTo(-11, -4, -5, -10); c.quadraticCurveTo(-7, -18, 0, -19); c.quadraticCurveTo(7, -18, 5, -10); c.quadraticCurveTo(11, -4, 8, 10); c.closePath(); ART.fillOut(c, cl, 2.4);
    c.fillStyle = '#ff5a5f'; c.fillRect(-6.4, -8, 12.8, 4); c.globalAlpha = 1; c.restore();
  }
  function drawBall(x, y, cl, rot) {
    ART.shadow(c, x, y + 13, 14, 0.25);
    c.beginPath(); c.arc(x, y, 15, 0, TAU); const g = c.createRadialGradient(x - 6, y - 7, 2, x, y, 17);
    g.addColorStop(0, ART.lite(cl, 0.5)); g.addColorStop(0.6, cl); g.addColorStop(1, ART.dark(cl, 0.3)); c.fillStyle = g; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
    c.save(); c.translate(x, y); c.rotate(rot || 0); ART.eyes(c, 0, -2, 2.6); c.restore();
  }
  m.draw = () => {
    if (!LANE) LANE = mk(W, H, (g) => {
      g.fillStyle = '#2a2350'; g.fillRect(0, 0, W, H);
      const lg = g.createLinearGradient(0, 120, 0, H); lg.addColorStop(0, '#c9954f'); lg.addColorStop(1, '#e6c48c');
      g.fillStyle = lg; g.fillRect(92, 120, 616, H - 120);
      g.strokeStyle = 'rgba(120,80,40,.3)'; g.lineWidth = 1.6; for (let x = 108; x < 700; x += 22) { g.beginPath(); g.moveTo(x, 120); g.lineTo(x, H); g.stroke(); }
      g.fillStyle = '#4b4270'; g.fillRect(56, 120, 36, H - 120); g.fillRect(708, 120, 36, H - 120);
      g.strokeStyle = OUT; g.lineWidth = 3; g.strokeRect(92, 120, 616, H - 120);
      g.fillStyle = '#3a3168'; g.fillRect(0, 0, W, 120);
      g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 5; i++) g.fillRect(120 + i * 130, 20, 90, 70);
      g.strokeStyle = 'rgba(26,21,48,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(92, 374); g.lineTo(708, 374); g.stroke();
      for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(26,21,48,.18)'; g.beginPath(); g.moveTo(130 + i * 106, 150); g.lineTo(136 + i * 106, 150); g.lineTo(146 + i * 106, 170); g.lineTo(140 + i * 106, 170); g.fill(); }
    });
    c.drawImage(LANE, 0, 0, W, H);
    for (const mk2 of marks) { c.globalAlpha = mk2.t; c.strokeStyle = mk2.cl; c.lineWidth = 3; c.beginPath(); c.arc(mk2.x, mk2.y, 20 * (1.4 - mk2.t), 0, TAU); c.stroke(); c.globalAlpha = 1; }
    for (const pn of pins) if (!pn.down) ART.shadow(c, pn.x, pn.y + 9, 9, 0.2);
    for (const pn of pins) if (pn.down) drawPin(pn);
    for (const pn of pins) if (!pn.down) drawPin(pn);
    for (const q of ps) {
      if (q.ball) { drawBall(q.ball.x, q.ball.y, col(q.p), T * 6); continue; }
      if (q.back > 0) continue;
      const st = q.stun > 0 ? 'fall' : 'idle';
      guy(q.p, q.x, HOME, 1.4, { face: q.face, state: st, squash: q.stun > 0 ? 0.7 : 0 });
      if (q.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; star(q.x + Math.cos(a) * 18, HOME - 24 + Math.sin(a) * 6, 4.5); }
      else {
        const L = 42 + 46 * q.pw;
        c.save(); c.translate(q.x, HOME - 16); c.rotate(q.aim);
        c.strokeStyle = 'rgba(26,21,48,.5)'; c.lineWidth = 8; c.beginPath(); c.moveTo(18, 0); c.lineTo(L, 0); c.stroke();
        c.strokeStyle = col(q.p); c.lineWidth = 4.5; c.beginPath(); c.moveTo(18, 0); c.lineTo(L, 0); c.stroke();
        c.beginPath(); c.moveTo(L + 12, 0); c.lineTo(L - 4, -7); c.lineTo(L - 4, 7); c.closePath(); ART.fillOut(c, col(q.p), 2.2); c.restore();
        if (q.ch) { panel(q.x - 26, HOME + 8, 52, 10, 5, 'rgba(26,21,48,.8)', 2); ART.rr(c, q.x - 23, HOME + 10, 46 * q.pw, 6, 3); ART.fillOut(c, q.pw > 0.85 ? '#ff5a5f' : '#a8cf3f', 1.6); }
      }
    }
    fit(`${Math.max(0, Math.ceil(TL - T))} s`, 400, 76, 24, '#fff', 200);
    strip(ps.map((q) => q.pts));
  };
  return m;
}

/* 19. TORO MECÁNICO — aguanta encima inclinándote al lado contrario de cada sacudida. */
function mgBull() {
  const CX = [100, 300, 500, 700], CY = 300, LIM = 0.82, WARM = 5;
  const m = { name: 'Toro Mecánico', help: 'El toro avisa con una flecha antes de sacudir: empuja el joystick al lado contrario. Si te inclinas demasiado, caes.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, th: k.rnd(-0.05, 0.05), w: 0, out: -1, fallT: 0, bull: 0, react: 0, hold: 0, lapse: 0, kickDir: 0 }));
  let T = 0, next = 3, tel = null, over = false, endT = 0, bt = 0;
  const grav = () => lerp(2.0, 4.8, ease(T / 55));
  const power = () => lerp(0.55, 1.75, ease(T / 50));
  function kick() {
    const dir = Math.random() < 0.5 ? -1 : 1, pw = power() * k.rnd(0.85, 1.2);
    tel = { dir, pw, t: lerp(0.62, 0.26, ease(T / 45)), max: lerp(0.62, 0.26, ease(T / 45)) };
    next = lerp(2.6, 1.15, ease(T / 55)) * k.rnd(0.85, 1.2);
  }
  m.update = (dt) => {
    if (fastFwd(ps)) dt *= 3;
    T += dt; bt += dt;
    if (T > WARM + 1.5 && !tel) { next -= dt; if (next <= 0) kick(); }
    if (tel) { tel.t -= dt; if (tel.t <= 0) { for (const q of ps) if (q.out < 0) { q.w += tel.dir * tel.pw; q.kickDir = tel.dir; q.bull = 0.35; } if (!demo) k.sfx('hit'); k.shake(3); tel = null; } }
    for (const q of ps) {
      q.bull = Math.max(0, q.bull - dt);
      if (q.out >= 0) { q.fallT += dt; continue; }
      let ctrl = 0;
      if (cpu(q.p)) {
        q.react -= dt; q.lapse -= dt;
        if (q.react <= 0) {
          q.react = lerp(0.3, 0.11, SK());
          q.hold = -Math.sign(q.th * 1.1 + q.w * 0.32 + gauss() * 0.05);
          if (tel && tel.t < 0.35 && Math.random() < lerp(0.45, 0.95, SK())) q.hold = -tel.dir; /* se prepara para la coz */
          if (Math.random() < lerp(0.16, 0.03, SK())) q.lapse = k.rnd(0.2, 0.5);
        }
        ctrl = q.lapse > 0 ? 0 : q.hold;
      } else { const d = dirOf(q.p, CX[q.p], CY); ctrl = Math.abs(d.x) > 0.2 ? Math.sign(d.x) : 0; }
      q.w += (grav() * Math.sin(q.th) + ctrl * 11) * dt;
      q.w *= Math.exp(-1.7 * dt); q.th += q.w * dt;
      if (Math.abs(q.th) > LIM) {
        if (T < WARM) { q.th = Math.sign(q.th) * LIM * 0.9; q.w *= -0.3; }
        else { q.out = T; q.fallT = 0; k.sfx('hurt'); k.burst(CX[q.p], CY - 40, col(q.p), 14, 190); k.float('¡Al suelo!', CX[q.p], CY - 90, '#ff8a8a'); }
      }
    }
    const alive = ps.filter((q) => q.out < 0).length;
    if (!over && T > WARM && (alive <= 1 || T > 75)) { over = true; endT = 1.6; m.rank = rankBy(ps, (q) => (q.out < 0 ? 1e9 : q.out)); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  function drawBull(x, y, th, buck) {
    const b = buck * 0.6;
    c.save(); c.translate(x, y + b * 18); c.rotate(th * 0.35 - b * 0.25);
    ART.shadow(c, 0, 48, 46, 0.24);
    ART.rr(c, -14, 14, 10, 34, 4); ART.fillOut(c, '#4b4270', 2.4); ART.rr(c, 6, 14, 10, 34, 4); ART.fillOut(c, '#4b4270', 2.4);
    c.beginPath(); c.ellipse(0, -4, 46, 28, 0, 0, TAU);
    const g = c.createLinearGradient(0, -32, 0, 24); g.addColorStop(0, '#8a5c3d'); g.addColorStop(1, '#5a3721'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    c.save(); c.translate(-44, -12); c.rotate(-0.25);
    c.beginPath(); c.ellipse(0, 0, 20, 15, 0, 0, TAU); ART.fillOut(c, '#6b4329', 2.6);
    c.beginPath(); c.moveTo(-6, -12); c.quadraticCurveTo(-16, -22, -6, -24); ART.fillOut(c, '#e8e3ff', 2.2);
    c.beginPath(); c.moveTo(6, -12); c.quadraticCurveTo(16, -22, 6, -24); ART.fillOut(c, '#e8e3ff', 2.2);
    c.fillStyle = OUT; c.beginPath(); c.arc(-6, -2, 2.4, 0, TAU); c.arc(6, -2, 2.4, 0, TAU); c.fill();
    c.fillStyle = '#ffd166'; c.beginPath(); c.arc(0, 6, 3, 0, TAU); c.fill(); c.restore();
    ART.rr(c, 30, -22, 10, 22, 4); ART.fillOut(c, '#6b4329', 2.2);
    ART.rr(c, -6, -33, 26, 9, 4); ART.fillOut(c, '#b05a4a', 2.2); /* silla */
    c.strokeStyle = OUT; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-2, -26); c.lineTo(-4, 6); c.moveTo(16, -26); c.lineTo(18, 6); c.stroke();
    c.restore();
  }
  m.draw = () => {
    ART.background(c, TH.dusk, W, 240, 0, 0, t); ground(240, '#b98a55', '#8a6238');
    c.fillStyle = 'rgba(26,21,48,.18)'; for (let i = 0; i < 20; i++) { c.beginPath(); c.ellipse((i * 173) % W, 260 + ((i * 61) % 170), 16, 4, 0, 0, TAU); c.fill(); }
    for (let i = 1; i < 4; i++) { c.strokeStyle = 'rgba(26,21,48,.22)'; c.lineWidth = 2; c.beginPath(); c.moveTo(i * 200, 244); c.lineTo(i * 200, H - 46); c.stroke(); }
    for (const q of ps) {
      const x = CX[q.p], out = q.out >= 0;
      drawBull(x, CY, out ? 0 : q.th, q.bull / 0.35);
      const ry = out ? CY + 40 - Math.min(38, q.fallT * 120) : CY - 28, rx = out ? x + Math.sign(q.th || 1) * Math.min(58, q.fallT * 150) : x + 2;
      c.save(); if (!out) { c.translate(x, CY + 4); c.rotate(q.th); c.translate(-x, -(CY + 4)); }
      guy(q.p, rx, out ? CY + 44 : ry, 1.35, { face: 1, state: out ? 'fall' : Math.abs(q.th) > 0.4 ? 'wall' : 'idle', squash: out ? 0.6 : 0 });
      c.restore();
      if (!out) {
        const bx = x - 42, by = 152;
        panel(bx, by, 84, 12, 6, 'rgba(26,21,48,.85)', 2);
        const f = clamp(q.th / LIM, -1, 1);
        ART.rr(c, x - 2 + Math.min(0, f * 40), by + 3, Math.abs(f) * 40 + 4, 6, 3); ART.fillOut(c, Math.abs(f) > 0.72 ? '#ff5a5f' : col(q.p), 1.6);
        c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, by + 1); c.lineTo(x, by + 11); c.stroke();
        tagDraw(q.p, x, 128);
      } else { fit('Fuera', x, 140, 20, '#ff8a8a', 180); }
    }
    if (tel) { const a = 0.4 + 0.6 * Math.sin(t * 22); for (const q of ps) if (q.out < 0) { c.globalAlpha = a; arrowGlyph(CX[q.p] + tel.dir * 66, CY - 18, 20, tel.dir > 0 ? 'right' : 'left', '#ffd166'); c.globalAlpha = 1; } }
    fit(T < WARM ? 'Calentamiento' : `${Math.floor(T - WARM)} s a caballo`, 400, 76, 24, T < WARM ? '#ffd166' : '#fff', 360);
    if (fastFwd(ps)) fit('Avance rápido', 400, 106, 18, '#c9c3ef', 300);
  };
  return m;
}

/* 20. HUEVO EN LA CUCHARA — corre deprisa pero sin que el huevo se te vaya de la cuchara. */
function mgEgg() {
  const D = 1750, LY = [200, 262, 324, 386], TL = 55;
  const m = { name: 'Huevo en la Cuchara', help: 'Mantén A para correr; al acelerar el huevo se va hacia atrás. Compénsalo con ← →. Si cae, pierdes 3 segundos.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, d: 0, v: 0, e: 0, ev: 0, drop: 0, fin: -1, run: false, aiT: 0, aim: 0, wob: 0, drops: 0 }));
  const bumps = []; for (let x = 260; x < D - 120; x += k.rnd(190, 300)) bumps.push(x);
  let T = 0, cam = 0, over = false, endT = 0, place = 0;
  m.update = (dt) => {
    T += dt;
    for (const q of ps) {
      if (q.fin >= 0) { q.v *= Math.exp(-3 * dt); q.d += q.v * dt; continue; }
      if (q.drop > 0) { q.drop -= dt; q.v *= Math.exp(-6 * dt); q.d += q.v * dt; if (q.drop <= 0) { q.e = 0; q.ev = 0; } continue; }
      let acc = 0, tilt = 0;
      if (cpu(q.p)) {
        q.aiT -= dt;
        if (q.aiT <= 0) { q.aiT = lerp(0.2, 0.09, SK()); q.aim = -clamp(q.e * 3 + q.ev * 0.8 + gauss() * lerp(0.5, 0.16, SK()), -1, 1); }
        tilt = q.aim; const safe = lerp(0.34, 0.6, SK()); q.run = Math.abs(q.e) < safe && Math.abs(q.ev) < 1.1;
        acc = q.run ? 1 : 0;
      } else {
        const d = dirOf(q.p, 400, 225); tilt = clamp(d.x, -1, 1); q.run = AH(q.p); acc = q.run ? 1 : 0;
      }
      const a = acc * 150 - 58;
      q.v = clamp(q.v + a * dt, 0, 205);
      q.d += q.v * dt;
      for (const bx of bumps) if (q.d - q.v * dt < bx && q.d >= bx) { q.ev += k.rnd(-1, 1) * 1.5; q.wob = 0.35; }
      q.wob = Math.max(0, q.wob - dt);
      q.ev += (tilt * 2.5 - Math.max(0, a) * 0.016) * dt;
      q.ev *= Math.exp(-0.55 * dt); q.e += q.ev * dt;
      if (Math.abs(q.e) > 1) {
        q.drop = 3; q.drops++; q.v = 0; q.e = Math.sign(q.e); k.sfx('hurt');
        const fx0 = clamp(100 + (q.d - cam), 70, W - 70);
        k.float('¡Se cayó!', fx0, LY[q.p] - 70, '#ff8a8a'); k.burst(fx0, LY[q.p] - 20, '#fff4c0', 10, 150);
      }
      if (q.d >= D) { q.d = D; q.fin = ++place; if (!cpu(q.p)) k.sfx('win'); else k.sfx('coin'); k.confetti(col(q.p), 26); }
    }
    const lead = Math.max(...ps.map((q) => q.d));
    /* la cámara sigue al humano (si lo hay) para que nunca se salga; los demás se marcan en los bordes */
    const me = ps.find((q) => !cpu(q.p));
    const tgt = me ? me.d - 230 : lead - 300;
    cam = clamp(lerp(cam, tgt, 1 - Math.exp(-4 * dt)), 0, D - 520);
    const done = ps.every((q) => q.fin >= 0);
    if (!over && (done || T > TL)) { over = true; endT = 1.6; m.rank = rankBy(ps, (q) => (q.fin >= 0 ? 1e6 - q.fin : q.d)); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  function drawSpoon(x, y, e, cl, drop) {
    c.save(); c.translate(x + 16, y - 34); c.rotate(clamp(e, -1, 1) * 0.3);
    ART.rr(c, -4, -2, 30, 6, 3); ART.fillOut(c, '#c9cede', 2);
    c.beginPath(); c.ellipse(28, 0, 15, 9, 0, 0, TAU); ART.fillOut(c, '#e8ecf7', 2.2);
    if (drop <= 0) { const ex = 28 - clamp(e, -1, 1) * 11;
      c.beginPath(); c.ellipse(ex, -9, 9, 11, clamp(e, -1, 1) * 0.3, 0, TAU);
      const g = c.createRadialGradient(ex - 3, -13, 1, ex, -9, 12); g.addColorStop(0, '#fffdf4'); g.addColorStop(1, '#e7d9b4'); c.fillStyle = g; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
    }
    c.restore();
    if (drop > 0) { const f = clamp(1 - drop / 3, 0, 1); c.save(); c.translate(x + 30, y - 6 - Math.sin(f * Math.PI) * 10); c.beginPath(); c.ellipse(0, 0, 10, 7, 0, 0, TAU); ART.fillOut(c, '#f4e6c4', 2); c.fillStyle = '#ffc94d'; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); c.restore(); }
  }
  m.draw = () => {
    ART.background(c, TH.meadow, W, 168, cam * 0.35, 0, t); ground(168, '#9ed46a', '#6fae4a');
    for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(26,21,48,.07)'; c.fillRect(0, LY[i] - 44, W, 56); }
    c.strokeStyle = 'rgba(26,21,48,.3)'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, LY[0] - 46 + i * 62); c.lineTo(W, LY[0] - 46 + i * 62); c.stroke(); }
    for (const bx of bumps) { const x = 100 + bx - cam; if (x > -20 && x < W + 20) for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(x, LY[i] + 6, 11, 5, 0, 0, TAU); ART.fillOut(c, '#a08a6a', 2); } }
    const fx = 100 + D - cam;
    if (fx < W + 60) { for (let i = 0; i < 4; i++) { c.fillStyle = '#fff'; for (let r = 0; r < 4; r++) for (let q2 = 0; q2 < 2; q2++) { c.fillStyle = (r + q2) % 2 ? '#fff' : OUT; c.fillRect(fx - 12 + q2 * 12, LY[i] - 44 + r * 14, 12, 14); } }
      c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(fx, LY[0] - 60); c.lineTo(fx, LY[3] + 14); c.stroke();
      fit('META', fx, LY[0] - 74, 22, '#ffd166', 120); }
    for (const q of ps) {
      const x = 100 + q.d - cam, y = LY[q.p];
      if (x < 30 || x > W - 58) { const bx = x < 30 ? 24 : W - 24; arrowGlyph(bx, y - 18, 13, x < 30 ? 'left' : 'right', col(q.p)); continue; }
      guy(q.p, x, y, 1.35, { face: 1, state: q.drop > 0 ? 'idle' : q.v > 40 ? 'run' : 'idle', squash: q.wob > 0 ? 0.12 : 0 });
      drawSpoon(x, y, q.e, col(q.p), q.drop);
      tagDraw(q.p, x, y - 76);
      if (q.drop > 0) fit(`¡Recogiendo! ${q.drop.toFixed(1)}`, x, y + 22, 15, '#ff8a8a', 150);
      if (q.fin >= 0) star(x, y - 100, 12);
    }
    for (let i = 0; i < 4; i++) { const q = ps[i], px = 8 + i * 196;
      panel(px, 56, 188, 16, 8, 'rgba(26,21,48,.8)', 2);
      ART.rr(c, px + 3, 59, 182 * clamp(q.d / D, 0, 1), 10, 5); ART.fillOut(c, col(i), 1.6); }
    fit(`${Math.max(0, Math.ceil(TL - T))} s`, 400, 96, 22, '#fff', 200);
    strip(ps.map((q) => (q.fin >= 0 ? ['1.º', '2.º', '3.º', '4.º'][q.fin - 1] : Math.round(q.d / D * 100) + '%')));
  };
  return m;
}

/* 21. FOTO DE GRUPO — colócate en tu silueta con la pose correcta antes del flash. */
function mgPhoto() {
  const F = { x0: 80, x1: 720, y0: 246, y1: 408 }, SHOTS = 5;
  const m = { name: 'Foto de Grupo', help: 'Corre a la silueta de tu color y haz la pose: A brazos arriba, B agachado, nada de pie. Suma quien esté listo al flash.', done: false, rank: null };
  const poseOf = (p) => (cpu(p) ? null : k.pheld(p, 'a') ? 'up' : k.pheld(p, 'b') ? 'down' : 'stand');
  const ps = [0, 1, 2, 3].map((p) => ({ p, x: 200 + p * 130, y: 340, face: 1, mv: false, pts: 0, got: null, pose: 'stand', aiT: 0, ox: 0, oy: 0, react: 0, want: 'stand' }));
  let shot = 0, spots = [], st = 'set', sT = 0, CD = 4, flash = 0, swapT = -1, swapped = false, over = false, endT = 0;
  const POSES = ['stand', 'up', 'down'];
  function newShot() {
    shot++; spots = []; swapped = false;
    for (let i = 0; i < 4; i++) {
      let x, y, tries = 0;
      do { x = k.rnd(F.x0 + 40, F.x1 - 40); y = k.rnd(F.y0, F.y1); tries++; } while (tries < 40 && spots.some((s) => Math.hypot(s.x - x, (s.y - y) * 1.6) < 132));
      spots.push({ x, y, pose: shot === 1 ? 'stand' : k.pick(POSES), p: i });
    }
    CD = lerp(4.4, 2.3, (shot - 1) / (SHOTS - 1)); sT = 0; st = 'set';
    swapT = shot >= 3 ? CD * 0.45 : -1;
    for (const q of ps) { q.got = null; q.react = 0; q.ox = gauss() * lerp(20, 5, SK()); q.oy = gauss() * lerp(14, 4, SK()); }
  }
  const spotOf = (p) => spots.find((s) => s.p === p);
  function doSwap() {
    const i = k.ri(0, 3); let j = k.ri(0, 3); if (j === i) j = (j + 1) % 4;
    const a = spots[i].p; spots[i].p = spots[j].p; spots[j].p = a;
    swapped = true; k.sfx('hit'); k.flash('rgba(255,209,102,.25)');
    for (const q of ps) q.react = lerp(0.95, 0.3, SK()) * (cpu(q.p) ? 1 : 0);
  }
  function shoot() {
    st = 'flash'; sT = 0; flash = 1; k.sfx('pop'); k.flash('rgba(255,255,255,.75)');
    for (const q of ps) {
      const s = spotOf(q.p), d = Math.hypot(q.x - s.x, (q.y - s.y) * 1.3), ok = d < 34, pok = q.pose === s.pose;
      const n = ok && pok ? 2 : ok || pok ? 1 : 0;
      q.pts += n; q.got = n;
      if (n) { k.float('+' + n, q.x, q.y - 80, n === 2 ? '#ffd166' : '#fff'); if (!cpu(q.p)) k.sfx('coin'); }
      else k.float('¡Movido!', q.x, q.y - 80, '#ff8a8a');
    }
  }
  newShot();
  m.update = (dt) => {
    sT += dt; flash = Math.max(0, flash - dt * 2.4);
    if (st === 'set') {
      if (swapT > 0 && sT >= swapT && !swapped) doSwap();
      for (const q of ps) {
        const s = spotOf(q.p); let d = { x: 0, y: 0 };
        if (cpu(q.p)) {
          q.react = Math.max(0, q.react - dt);
          const tgt = q.react > 0 ? null : s, left = CD - sT;
          if (tgt) { const dx = tgt.x + q.ox - q.x, dy = tgt.y + q.oy - q.y, mm = Math.hypot(dx, dy); if (mm > 6) d = { x: dx / mm, y: dy / mm }; }
          q.want = left < 0.75 && Math.random() < 0.5 ? s.pose : q.want;
          q.pose = left < 0.7 ? (Math.random() < lerp(0.4, 0.96, SK()) || q.want === s.pose ? s.pose : 'stand') : 'stand';
          if (left < 0.7 && Math.random() < lerp(0.35, 0.03, SK()) * dt * 6) q.pose = k.pick(POSES);
        } else { d = dirOf(q.p, q.x, q.y - 26); q.pose = poseOf(q.p); }
        const sp = q.pose === 'down' ? 110 : 205;
        q.x = clamp(q.x + d.x * sp * dt, F.x0 - 20, F.x1 + 20);
        q.y = clamp(q.y + d.y * sp * dt * 0.78, F.y0 - 40, F.y1 + 26);
        q.mv = Math.hypot(d.x, d.y) > 0.15; if (Math.abs(d.x) > 0.2) q.face = d.x > 0 ? 1 : -1;
      }
      if (sT >= CD) shoot();
    } else if (sT > 1.5) {
      if (shot >= SHOTS) { if (!over) { over = true; endT = 1.4; m.rank = rankBy(ps, (q) => q.pts); } }
      else newShot();
    }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  function poseIcon(x, y, pose, cl, s) {
    c.save(); c.translate(x, y); c.scale(s || 1, s || 1); c.lineWidth = 3; c.strokeStyle = cl; c.lineCap = 'round';
    c.beginPath(); c.arc(0, -16, 5, 0, TAU); c.stroke();
    if (pose === 'down') { c.beginPath(); c.moveTo(0, -11); c.lineTo(0, -2); c.moveTo(0, -2); c.lineTo(-7, 6); c.moveTo(0, -2); c.lineTo(7, 6); c.moveTo(0, -8); c.lineTo(-8, -4); c.moveTo(0, -8); c.lineTo(8, -4); c.stroke(); }
    else { c.beginPath(); c.moveTo(0, -11); c.lineTo(0, 2); c.moveTo(0, 2); c.lineTo(-6, 12); c.moveTo(0, 2); c.lineTo(6, 12); c.stroke();
      c.beginPath(); if (pose === 'up') { c.moveTo(0, -8); c.lineTo(-8, -18); c.moveTo(0, -8); c.lineTo(8, -18); } else { c.moveTo(0, -8); c.lineTo(-9, -3); c.moveTo(0, -8); c.lineTo(9, -3); } c.stroke(); }
    c.restore();
  }
  m.draw = () => {
    ART.background(c, TH.meadow, W, 232, 0, 0, t); ground(232, '#9ed46a', '#72ab52');
    c.fillStyle = 'rgba(26,21,48,.08)'; c.fillRect(0, 232, W, 8);
    /* fotógrafo */
    const cx = 400, cy = 176;
    ART.rr(c, cx - 8, cy + 16, 16, 46, 4); ART.fillOut(c, '#4b4270', 2.4);
    c.beginPath(); c.moveTo(cx - 26, cy + 62); c.lineTo(cx, cy + 18); c.lineTo(cx + 26, cy + 62); c.closePath(); ART.fillOut(c, '#4b4270', 2.4);
    ART.rr(c, cx - 34, cy - 20, 68, 40, 8); ART.fillOut(c, '#2f2a55', 3);
    c.beginPath(); c.arc(cx, cy, 13, 0, TAU); ART.fillOut(c, '#8fd3ff', 2.6);
    c.beginPath(); c.arc(cx - 4, cy - 4, 4, 0, TAU); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill();
    ART.rr(c, cx + 12, cy - 30, 22, 12, 4); ART.fillOut(c, flash > 0.4 ? '#fffbe0' : '#c9cede', 2.4);
    for (const s of spots) {
      c.save(); c.globalAlpha = 0.85;
      c.setLineDash([9, 6]); c.lineWidth = 3.5; c.strokeStyle = col(s.p);
      c.beginPath(); c.ellipse(s.x, s.y, 34, 21, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      c.globalAlpha = 0.22; c.fillStyle = col(s.p); c.fill(); c.globalAlpha = 1; c.restore();
      poseIcon(s.x, s.y - 34, s.pose, col(s.p), 1.15);
    }
    const ents = ps.map((q) => ({ y: q.y, f: () => {
      const st2 = q.pose === 'down' ? 'wall' : q.mv ? 'run' : 'idle';
      c.save(); if (q.pose === 'down') { c.translate(0, 10); }
      guy(q.p, q.x, q.y, q.pose === 'down' ? 1.15 : 1.45, { face: q.face, state: st2, squash: q.pose === 'down' ? 0.24 : 0 });
      c.restore();
      if (q.pose === 'up') { c.strokeStyle = col(q.p); c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(q.x - 9, q.y - 42); c.lineTo(q.x - 18, q.y - 62); c.moveTo(q.x + 9, q.y - 42); c.lineTo(q.x + 18, q.y - 62); c.stroke(); }
      tagDraw(q.p, q.x, q.y - 78);
      if (st === 'flash' && q.got != null) fit(q.got ? '+' + q.got : '0', q.x, q.y - 104, 24, q.got === 2 ? '#ffd166' : q.got ? '#fff' : '#ff8a8a', 90);
    } }));
    ents.sort((a, b) => a.y - b.y).forEach((e) => e.f());
    panel(300, 56, 200, 34, 12, 'rgba(26,21,48,.85)', 3);
    fit(`Foto ${shot} de ${SHOTS}`, 400, 73, 20, '#fff', 184);
    if (st === 'set') {
      const left = Math.max(0, CD - sT);
      fit(left > 1 ? String(Math.ceil(left)) : '¡Flash!', 400, 116, left > 1 ? 40 : 30, left < 1.2 ? '#ff5a5f' : '#ffd166', 260);
      if (swapped && sT < swapT + 1.2) fit('¡Cambio de sitios!', 400, 152, 24, '#ffd166', 360);
    }
    if (flash > 0) { c.fillStyle = `rgba(255,255,255,${flash * 0.5})`; c.fillRect(0, 0, W, H); }
    strip(ps.map((q) => q.pts));
  };
  return m;
}

/* 22. RELEVO DE CUBOS — cooperativo: llenad el barril pasándoos cubos sin derramarlos. */
function mgRelay() {
  const GY = 352, BD = [104, 252, 400, 548, 700], GOAL = 100, TL = 70, LITROS = 20;
  const m = { name: 'Relevo de Cubos', help: 'Cooperativo: muévete por tu tramo con ← →, coge el cubo con A y pásalo al siguiente. Mantén B para no derramar agua.', done: false, rank: null, teamHead: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, x: BD[p] + 30, v: 0, pv: 0, face: 1, bucket: null, liters: 0, aiT: 0, steady: false }));
  const bks = []; let T = 0, barrel = 0, spawnT = 1, over = false, endT = 0, spilled = 0, done = 0;
  const bucketAt = (i) => bks.find((b) => b.carrier === i);
  function spawn() { bks.push({ x: BD[0] + 6, y: GY, level: 1, sway: 0, swayV: 0, carrier: -1, carriers: [] }); }
  function grab(q, b) { b.carrier = q.p; if (!b.carriers.includes(q.p)) b.carriers.push(q.p); q.bucket = b; if (!cpu(q.p)) k.sfx('click'); }
  function pour(b) {
    const li = b.level * LITROS; barrel += li;
    for (const p of b.carriers) ps[p].liters += li / b.carriers.length;
    bks.splice(bks.indexOf(b), 1); done++;
    k.sfx('coin'); k.float('+' + Math.round(li) + ' L', BD[4] + 26, GY - 92, '#8fd3ff'); k.burst(BD[4] + 30, GY - 40, '#8fd3ff', 12, 160);
  }
  m.update = (dt) => {
    T += dt;
    spawnT -= dt;
    if (spawnT <= 0 && bks.filter((b) => b.carrier < 1).length < 1 && bks.length < 2 && !over) { spawn(); spawnT = 3.4; }
    for (const q of ps) {
      const lo = BD[q.p], hi = BD[q.p + 1], b = q.bucket;
      let d = 0; q.steady = false;
      if (cpu(q.p)) {
        q.aiT -= dt;
        if (b) { d = 1; q.steady = Math.abs(b.sway) > lerp(0.36, 0.24, SK()) || Math.abs(b.swayV) > 1.4; if (q.x > hi - 26) d = 0; }
        else { const free = bks.find((x) => x.carrier === -1 && q.p === 0) || (q.p > 0 && bucketAt(q.p - 1));
          const tx = q.p === 0 ? (free ? free.x : lo + 30) : lo + 14;
          d = Math.abs(tx - q.x) > 8 ? Math.sign(tx - q.x) : 0;
          if (free && Math.abs(free.x - q.x) < 42 && (q.p === 0 || free.x >= lo - 30)) { if (q.p === 0) grab(q, free); else if (free.carrier === q.p - 1 && free.x > lo - 40) grab(q, free); }
        }
      } else {
        const dd = dirOf(q.p, q.x, GY - 30); d = Math.abs(dd.x) > 0.2 ? dd.x : 0; q.steady = heldB(q.p);
        if (k.phit(q.p, 'a') || (q.p === 0 && !k.party && k.ptr.hit)) {
          const cand = bks.find((x) => x.carrier !== q.p && Math.abs(x.x - q.x) < 46 && (x.carrier === -1 ? q.p === 0 : x.carrier === q.p - 1));
          if (cand && !b) grab(q, cand);
        }
      }
      const cap = q.steady ? 96 : 208;
      q.pv = q.v; q.v = lerp(q.v, d * cap, 1 - Math.exp(-9 * dt));
      q.x = clamp(q.x + q.v * dt, lo - (q.p ? 34 : 14), hi + (q.p === 3 ? 36 : 34));
      if (Math.abs(q.v) > 12) q.face = q.v > 0 ? 1 : -1;
      if (b) {
        const acc = (q.v - q.pv) / Math.max(dt, 0.001);
        b.x = q.x + 20 * q.face; b.y = GY;
        b.swayV += (-9 * b.sway - acc * 0.0165) * dt;
        b.swayV *= Math.exp(-(q.steady ? 6.5 : 1.7) * dt);
        b.sway += b.swayV * dt;
        if (Math.abs(b.sway) > 0.5 && b.level > 0) {
          const s = (Math.abs(b.sway) - 0.5) * 1.15 * dt; b.level = Math.max(0, b.level - s); spilled += s * LITROS;
          if (Math.random() < 30 * s) k.burst(b.x + Math.sign(b.sway) * 12, GY - 34, '#8fd3ff', 2, 70);
        }
        if (q.p === 3 && q.x > BD[4] + 12) { q.bucket = null; pour(b); }
        else {
          const nxt = ps[q.p + 1];
          if (nxt && q.x > hi - 36 && Math.abs(nxt.x - q.x) < 56 && !nxt.bucket) {
            const ask = cpu(nxt.p) ? true : (k.phit(nxt.p, 'a') || (nxt.p === 0 && !k.party && k.ptr.hit));
            if (ask) { q.bucket = null; grab(nxt, b); k.float('¡Toma!', q.x, GY - 96, '#fff'); }
          }
        }
      }
    }
    for (const b of bks) if (b.carrier === -1) { b.sway *= Math.exp(-3 * dt); }
    if (!over && (T > TL || barrel >= GOAL)) {
      over = true; endT = 2; const win = barrel >= GOAL;
      m.teamHead = win ? '¡Barril lleno!' : `Se quedó en ${Math.round(barrel)} de ${GOAL} L`;
      m.rank = rankBy(ps, (q) => q.liters);
      if (win) { k.confetti('#8fd3ff', 60); k.sfx('win'); } else k.sfx('lose');
    }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  function drawBucket(b) {
    const sw = clamp(b.sway, -0.9, 0.9);
    c.save(); c.translate(b.x, b.y - 30); c.rotate(sw * 0.45);
    c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.arc(0, -14, 11, Math.PI, 0); c.stroke();
    c.beginPath(); c.moveTo(-13, -12); c.lineTo(13, -12); c.lineTo(10, 12); c.lineTo(-10, 12); c.closePath(); ART.fillOut(c, '#b8c0d8', 2.6);
    if (b.level > 0) { c.save(); c.beginPath(); c.moveTo(-13, -12); c.lineTo(13, -12); c.lineTo(10, 12); c.lineTo(-10, 12); c.closePath(); c.clip();
      const ly = 12 - 24 * b.level; c.fillStyle = '#5b8cff';
      c.beginPath(); c.moveTo(-14, ly + sw * 9); c.lineTo(14, ly - sw * 9); c.lineTo(14, 14); c.lineTo(-14, 14); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-14, ly + sw * 9 - 2, 28, 2.5); c.restore(); }
    c.restore();
  }
  m.draw = () => {
    ART.background(c, TH.meadow, W, GY - 96, 0, 0, t); ground(GY - 96, '#a8cf3f', '#7aa832');
    c.fillStyle = 'rgba(26,21,48,.06)'; for (let i = 0; i < 4; i++) c.fillRect(BD[i], GY - 96, 2, H - GY + 96);
    /* pozo */
    ART.rr(c, 40, GY - 56, 64, 56, 10); ART.fillOut(c, '#7c7395', 3);
    c.fillStyle = '#2b3a67'; ART.rr(c, 50, GY - 48, 44, 14, 6); c.fill();
    ART.rr(c, 66, GY - 104, 8, 50, 3); ART.fillOut(c, '#8b5a3c', 2.4);
    c.beginPath(); c.moveTo(28, GY - 100); c.lineTo(70, GY - 126); c.lineTo(112, GY - 100); c.closePath(); ART.fillOut(c, '#b05a4a', 2.8);
    fit('POZO', 70, GY - 140, 15, '#fff', 70);
    /* barril */
    const bx = BD[4] + 30;
    ART.rr(c, bx - 38, GY - 96, 76, 96, 14); ART.fillOut(c, '#b27a44', 3);
    c.save(); ART.rr(c, bx - 34, GY - 92, 68, 88, 12); c.clip();
    const lv = clamp(barrel / GOAL, 0, 1); c.fillStyle = '#5b8cff'; c.fillRect(bx - 34, GY - 4 - 88 * lv, 68, 88 * lv + 4);
    c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(bx - 34, GY - 6 - 88 * lv + Math.sin(t * 3) * 2, 68, 3); c.restore();
    c.fillStyle = '#8b5a3c'; c.fillRect(bx - 38, GY - 72, 76, 7); c.fillRect(bx - 38, GY - 34, 76, 7);
    c.strokeStyle = OUT; c.lineWidth = 3; ART.rr(c, bx - 38, GY - 96, 76, 96, 14); c.stroke();
    for (const b of bks) if (b.carrier === -1) drawBucket(b);
    for (const q of ps) {
      guy(q.p, q.x, GY, 1.4, { face: q.face, state: Math.abs(q.v) > 30 ? 'run' : 'idle' });
      if (q.bucket) drawBucket(q.bucket);
      tagDraw(q.p, q.x, GY - 82);
      if (q.steady) fit('despacio', q.x, GY + 16, 14, '#a8cf3f', 90);
    }
    /* barra de equipo */
    panel(200, 56, 400, 30, 12, 'rgba(26,21,48,.85)', 3);
    ART.rr(c, 206, 62, 388 * clamp(barrel / GOAL, 0, 1), 18, 9); ART.fillOut(c, '#5b8cff', 2);
    fit(`Barril ${Math.round(barrel)} / ${GOAL} L`, 400, 71, 18, '#fff', 380);
    fit(`${Math.max(0, Math.ceil(TL - T))} s · derramados ${Math.round(spilled)} L`, 400, 104, 18, '#e8e3ff', 420);
    strip(ps.map((q) => Math.round(q.liters) + ' L'));
  };
  return m;
}

/* 23. GLOBO DE TODOS — cooperativo: todos manejan el mismo globo aerostático. */
function mgHotair() {
  const BX = 250, TOP = 150, BOT = 320, TL = 58, SKY = 142, FLOOR = 378;
  const m = { name: 'Globo de Todos', help: 'Cooperativo: A enciende tu quemador (sube) y B suelta lastre (baja). Se suman los cuatro mandos. Esquivad los pájaros.', done: false, rank: null, teamHead: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, act: 0, ok: 0, bad: 0, fuel: 1 }));
  const birds = [], clouds = []; let y = 240, vy = 0, T = 0, hp = 5, inv = 0, nextB = 2.2, over = false, endT = 0, tick = 0, need = 0, dist = 0;
  for (let i = 0; i < 7; i++) clouds.push({ x: k.rnd(0, W), y: k.rnd(60, 340), s: k.rnd(0.6, 1.3) });
  function hurt(why) {
    if (inv > 0 || over) return; hp--; inv = 2.1; k.sfx('hurt'); k.shake(7); k.burst(BX, y, '#ff8a8a', 16, 200); k.float(why, BX, y - 70, '#ff8a8a');
  }
  m.update = (dt) => {
    T += dt; inv -= dt; dist += 165 * dt;
    for (const cl of clouds) { cl.x -= (26 + cl.s * 22) * dt; if (cl.x < -90) { cl.x = W + 90; cl.y = k.rnd(60, 340); } }
    nextB -= dt;
    if (nextB <= 0 && !over && T > 6) {
      const n = T > 26 && Math.random() < 0.45 ? 3 : 1, by = k.rnd(TOP + 20, BOT - 20);
      for (let i = 0; i < n; i++) birds.push({ x: W + 40 + i * 46, y: clamp(by + (i - 1) * 26 * (Math.random() < 0.5 ? 1 : 0), TOP + 10, BOT - 10), v: lerp(130, 250, ease(T / 50)) + k.rnd(-20, 20), fl: k.rnd(0, 6) });
      nextB = lerp(2.9, 1.35, ease(T / 46)) * k.rnd(0.85, 1.25);
    }
    let lift = 0;
    for (const q of ps) {
      if (cpu(q.p)) { /* la CPU decide en el bloque de coordinación, más abajo */ }
      else q.act = k.pheld(q.p, 'a') || (q.p === 0 && !k.party && k.ptr.down) ? -1 : heldB(q.p) ? 1 : 0;
    }
    /* qué conviene hacer ahora mismo */
    let nb = null; for (const b of birds) if (b.x > BX && b.x - BX < 320 && (!nb || b.x < nb.x)) nb = b;
    need = 0;
    if (nb && Math.abs(nb.y - y) < 54) need = nb.y > y ? -1 : 1;
    else if (y > BOT - 46) need = -1; else if (y < TOP + 46) need = 1;
    else if (vy < -110) need = 1; else if (vy > 110) need = -1;
    for (const q of ps) if (cpu(q.p)) {
      const sk = lerp(0.45, 0.9, SK());
      q.fuel -= dt; if (q.fuel <= 0) { q.fuel = lerp(0.42, 0.2, SK()); q.act = Math.random() < sk ? need : (Math.random() < 0.45 ? 0 : -need); if (need === 0 && Math.random() < 0.25) q.act = 0; }
    }
    for (const q of ps) { if (q.act === -1) lift -= 92; else if (q.act === 1) lift += 66; }
    vy += (128 + lift) * dt; vy *= Math.exp(-1.1 * dt); y += vy * dt;
    if (y < TOP) { y = TOP; vy = Math.max(vy, 40); hurt('¡Nubes!'); }
    if (y > BOT) { y = BOT; vy = Math.min(vy, -40); hurt('¡Rozáis el suelo!'); }
    for (let i = birds.length - 1; i >= 0; i--) {
      const b = birds[i]; b.x -= b.v * dt; b.y += Math.sin(T * 3 + b.fl) * 14 * dt;
      if (b.x < -50) { birds.splice(i, 1); continue; }
      if (Math.hypot((b.x - BX) * 1.15, (b.y - y) * 1.3) < 46) { birds.splice(i, 1); hurt('¡Pájaro!'); }
    }
    tick += dt;
    if (tick >= 0.3) { tick = 0; for (const q of ps) { if (q.act === need) q.ok++; else if (need !== 0 && q.act !== 0) q.bad++; } }
    if (!over && (T > TL || hp <= 0)) {
      over = true; endT = 2; const win = hp > 0;
      m.teamHead = win ? '¡Llegasteis enteros!' : 'El globo se quedó en tierra';
      m.rank = rankBy(ps, (q) => q.ok - q.bad * 0.5);
      if (win) { k.confetti('#ffc94d', 60); k.sfx('win'); } else k.sfx('lose');
    }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  function drawBalloon() {
    const bob = Math.sin(t * 2) * 3, yy = y + bob;
    ART.shadow(c, BX, BOT + 44, 40, 0.16);
    c.save(); c.translate(BX, yy); c.rotate(clamp(vy, -200, 200) * 0.00035);
    c.save(); c.beginPath(); c.ellipse(0, -8, 46, 52, 0, 0, TAU); c.clip();
    for (let i = 0; i < 4; i++) { /* gajos verticales del globo, uno por jugador */
      c.fillStyle = ps[i].act === -1 ? ART.lite(col(i), 0.35) : col(i);
      c.fillRect(-46 + i * 23, -62, 23.5, 108);
      c.fillStyle = 'rgba(26,21,48,.12)'; c.fillRect(-46 + i * 23 + 18, -62, 5, 108);
    }
    c.restore();
    c.beginPath(); c.ellipse(0, -8, 46, 52, 0, 0, TAU); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(-16, -26, 11, 18, -0.4, 0, TAU); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, 38); c.lineTo(-14, 54); c.moveTo(20, 38); c.lineTo(14, 54); c.stroke();
    ART.rr(c, -18, 54, 36, 26, 6); ART.fillOut(c, '#b27a44', 2.6);
    c.fillStyle = 'rgba(26,21,48,.25)'; c.fillRect(-18, 62, 36, 4);
    const burn = ps.filter((q) => q.act === -1).length;
    if (burn) { for (let i = 0; i < burn; i++) { const h = 12 + Math.sin(t * 22 + i) * 5 + i * 3;
      c.beginPath(); c.moveTo(-6 + i * 4, 52); c.quadraticCurveTo(-2 + i * 4, 52 - h, 2 + i * 4, 52); c.closePath(); ART.fillOut(c, i % 2 ? '#ffc94d' : '#ff9a3d', 1.4); } }
    const sand = ps.filter((q) => q.act === 1).length;
    if (sand) for (let i = 0; i < sand * 3; i++) { c.fillStyle = 'rgba(214,186,140,.8)'; c.fillRect(-10 + k.rnd(0, 20), 80 + ((t * 260 + i * 27) % 60), 2.5, 5); }
    for (let i = 0; i < 4; i++) { c.save(); c.translate(-11 + i * 7.5, 56); c.scale(0.42, 0.42); ART.hero(c, 0, 0, 1, { face: 1, state: 'idle', t: t + i, col: col(i) }); c.restore(); }
    c.restore();
    if (inv > 0 && Math.floor(inv * 10) % 2) { c.globalAlpha = 0.35; c.beginPath(); c.arc(BX, yy - 8, 60, 0, TAU); c.fillStyle = '#ff8a8a'; c.fill(); c.globalAlpha = 1; }
  }
  m.draw = () => {
    ART.background(c, TH.sky, W, H, dist * 0.25, 0, t);
    for (const cl of clouds) { c.globalAlpha = 0.65; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(cl.x, cl.y, 46 * cl.s, 20 * cl.s, 0, 0, TAU); c.ellipse(cl.x + 28 * cl.s, cl.y + 5 * cl.s, 30 * cl.s, 15 * cl.s, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
    c.fillStyle = 'rgba(80,70,140,.35)'; c.fillRect(0, 0, W, SKY);
    c.fillStyle = 'rgba(26,21,48,.22)'; c.fillRect(0, FLOOR, W, H - FLOOR);
    c.strokeStyle = 'rgba(255,90,95,.55)'; c.lineWidth = 3; c.setLineDash([12, 8]);
    c.beginPath(); c.moveTo(0, SKY); c.lineTo(W, SKY); c.moveTo(0, FLOOR); c.lineTo(W, FLOOR); c.stroke(); c.setLineDash([]);
    for (const b of birds) { c.save(); c.translate(b.x, b.y); const f = Math.sin(t * 13 + b.fl) * 0.6;
      c.beginPath(); c.ellipse(0, 0, 15, 9, 0, 0, TAU); ART.fillOut(c, '#5b4b8a', 2.4);
      c.beginPath(); c.moveTo(-2, -2); c.quadraticCurveTo(-14, -14 - f * 8, -22, -2 - f * 6); c.quadraticCurveTo(-12, 2, -2, 2); ART.fillOut(c, '#7a68b5', 2);
      c.beginPath(); c.moveTo(-2, -2); c.quadraticCurveTo(6, -16 + f * 8, 14, -4 + f * 6); c.quadraticCurveTo(6, 2, -2, 2); ART.fillOut(c, '#7a68b5', 2);
      c.beginPath(); c.moveTo(-14, 0); c.lineTo(-22, -3); c.lineTo(-22, 3); c.closePath(); ART.fillOut(c, '#ffc94d', 1.6);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-9, -2, 2.6, 0, TAU); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(-9.5, -2, 1.3, 0, TAU); c.fill(); c.restore(); }
    drawBalloon();
    panel(566, 54, 226, 34, 12, 'rgba(26,21,48,.85)', 3);
    for (let i = 0; i < 5; i++) ART.heart(c, 592 + i * 26, 71, 0.9, i < hp);
    fit(`${Math.max(0, Math.ceil(TL - T))} s`, 784, 71, 19, '#fff', 60, 'right');
    panel(14, 54, 250, 34, 12, 'rgba(26,21,48,.85)', 3);
    const txt = need === -1 ? 'Hace falta SUBIR' : need === 1 ? 'Hace falta BAJAR' : 'Mantened la altura';
    fit(txt, 139, 71, 20, need ? '#ffd166' : '#a8cf3f', 232);
    strip(ps.map((q) => q.ok), '', ps.map((q) => q.act !== 0));
    for (let i = 0; i < 4; i++) { const x = 8 + i * 151 + 112, yv = H - 24;
      if (ps[i].act === -1) { c.beginPath(); c.moveTo(x - 5, yv + 6); c.quadraticCurveTo(x, yv - 12, x + 5, yv + 6); c.closePath(); ART.fillOut(c, '#ffc94d', 1.6); }
      else if (ps[i].act === 1) { ART.rr(c, x - 6, yv - 6, 12, 12, 3); ART.fillOut(c, '#d6ba8c', 1.6); } }
  };
  return m;
}

/* 24. TREN DE LA BRUJA — agáchate con B o salta con A cuando llega el palo de la bruja. */
function mgWitch() {
  const PX = [250, 338, 426, 514], FY = 278, TL = 62, WARM = 6;
  const m = { name: 'Tren de la Bruja', help: 'El vagón no para. Palo alto: agáchate con B. Palo bajo: salta con A. Algunos cambian de altura. Dos golpes y caes.', done: false, rank: null };
  const ps = [0, 1, 2, 3].map((p) => ({ p, h: 0, vy: 0, air: false, duck: 0, hits: 0, out: -1, stun: 0, cleared: 0, plan: null, fallX: 0, fallY: 0 }));
  const obs = [], deco = []; let T = 0, next = 3, sp = 230, over = false, endT = 0, scroll = 0;
  for (let i = 0; i < 9; i++) deco.push({ x: k.rnd(0, W), k: k.ri(0, 2), y: k.rnd(104, 158), s: k.rnd(0.7, 1.2) });
  const speed = () => lerp(200, 430, ease(T / 52));
  function spawn() {
    const kind = Math.random() < 0.5 ? 'high' : 'low';
    obs.push({ x: W + 70, kind, flip: T > 16 && Math.random() < 0.3, done: false, fl: false, seen: {} });
    next = lerp(2.6, 1.35, ease(T / 50)) * k.rnd(0.9, 1.15);
  }
  function jump(q) { if (q.air || q.out >= 0 || q.stun > 0) return; q.air = true; q.vy = 340; q.duck = 0; if (!cpu(q.p)) k.sfx('jump'); }
  function hit(q, o) {
    if (T < WARM) { k.float('¡Uy!', PX[q.p], FY - 96, '#ffd166'); return; }
    q.hits++; q.stun = 1.2; q.air = false; q.h = 0; q.duck = 0;
    k.sfx('hurt'); k.shake(6); k.burst(PX[q.p], FY - 30, col(q.p), 12, 180);
    if (q.hits >= 2) { q.out = T; q.fallX = PX[q.p]; q.fallY = FY - 20; k.float('¡Fuera del tren!', PX[q.p], FY - 110, '#ff8a8a'); }
    else k.float('¡Golpe!', PX[q.p], FY - 100, '#ff8a8a');
  }
  m.update = (dt) => {
    if (fastFwd(ps)) dt *= 3;
    T += dt; sp = speed(); scroll += sp * dt;
    next -= dt; if (next <= 0 && !over) spawn();
    for (const o of obs) {
      o.x -= sp * dt;
      if (o.flip && !o.fl && o.x < 640) { o.fl = true; o.kind = o.kind === 'high' ? 'low' : 'high'; k.sfx('click'); }
    }
    for (const q of ps) {
      q.stun -= dt;
      if (q.out >= 0) { q.fallX -= sp * dt * 0.6; q.fallY = Math.min(H + 60, q.fallY + 220 * dt); continue; }
      if (cpu(q.p)) {
        const o = obs.find((x) => !x.done && x.x > PX[q.p] - 20);
        if (o) {
          if (!q.plan || q.plan.o !== o) q.plan = { o, rt: lerp(0.42, 0.2, SK()) * k.rnd(0.85, 1.15), miss: Math.random() < lerp(0.16, 0.04, SK()), acted: false, kind: null };
          const tta = (o.x - PX[q.p]) / sp;
          if (!q.plan.acted && tta < q.plan.rt && !q.plan.miss) { q.plan.acted = true; q.plan.kind = o.kind; if (o.kind === 'low') jump(q); }
          if (q.plan.acted && q.plan.kind === 'high' && tta > -0.22) q.duck = 0.2; else if (q.plan.acted && q.plan.kind === 'high') q.duck = 0;
        }
      } else {
        if ((k.phit(q.p, 'a') || (q.p === 0 && !k.party && k.ptr.hit)) && q.stun <= 0) jump(q);
        q.duck = !q.air && q.stun <= 0 && heldB(q.p) ? 0.2 : 0;
      }
      if (q.air) { q.h += q.vy * dt; q.vy -= 1180 * dt; if (q.h <= 0) { q.h = 0; q.air = false; q.vy = 0; } }
      q.duck = Math.max(0, q.duck - dt);
    }
    for (const o of obs) {
      for (const q of ps) {
        if (q.out >= 0 || o.seen[q.p]) continue;
        if (Math.abs(o.x - PX[q.p]) < 14) {
          o.seen[q.p] = 1;
          if (q.stun > 0) continue;
          if (o.kind === 'high' ? q.duck > 0 : q.h > 16) { q.cleared++; if (!cpu(q.p) && T > WARM) k.sfx('pop'); }
          else hit(q, o);
        }
      }
      if (o.x < 180) o.done = true;
    }
    for (let i = obs.length - 1; i >= 0; i--) if (obs[i].x < -80) obs.splice(i, 1);
    const alive = ps.filter((q) => q.out < 0).length;
    if (!over && T > WARM && (alive <= 1 || T > TL)) { over = true; endT = 1.7; m.rank = rankBy(ps, (q) => (q.out < 0 ? 1e6 + q.cleared : q.out)); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  m.draw = () => {
    ART.background(c, TH.night, W, 260, scroll * 0.4, 0, t);
    for (const d of deco) { const x = ((d.x - scroll * 0.7) % (W + 200) + W + 200) % (W + 200) - 100;
      c.save(); c.translate(x, d.y); c.scale(d.s, d.s);
      if (d.k === 0) { c.strokeStyle = 'rgba(232,227,255,.5)'; c.lineWidth = 2; for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(0, 0, i * 12, 0, Math.PI); c.stroke(); } for (let i = 0; i < 5; i++) { const a = Math.PI * i / 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 36, Math.sin(a) * 36); c.stroke(); } }
      else if (d.k === 1) { c.beginPath(); c.arc(0, 0, 18, 0, TAU); ART.fillOut(c, '#f0842a', 2.4); c.fillStyle = OUT; c.beginPath(); c.moveTo(-9, -3); c.lineTo(-3, -3); c.lineTo(-6, 3); c.closePath(); c.moveTo(9, -3); c.lineTo(3, -3); c.lineTo(6, 3); c.closePath(); c.fill(); c.fillRect(-8, 7, 16, 3); }
      else { c.beginPath(); c.ellipse(0, 0, 16, 11, 0, 0, TAU); ART.fillOut(c, '#e8e3ff', 2.2); c.fillStyle = OUT; c.beginPath(); c.arc(-5, -2, 2, 0, TAU); c.arc(5, -2, 2, 0, TAU); c.fill(); }
      c.restore(); }
    /* raíles y vagón */
    ground(FY + 44, '#3b2d5c', '#251b3f');
    c.strokeStyle = '#6a5a9a'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, FY + 66); c.lineTo(W, FY + 66); c.stroke();
    for (let i = 0; i < 18; i++) { const x = ((i * 60 - scroll * 0.9) % (W + 60) + W + 60) % (W + 60) - 30; c.fillStyle = '#4b3a72'; c.fillRect(x, FY + 58, 22, 18); }
    ART.rr(c, 198, FY, 384, 62, 12); ART.fillOut(c, '#5a3a72', 3);
    c.fillStyle = 'rgba(26,21,48,.3)'; c.fillRect(204, FY + 26, 372, 10);
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(204, FY + 3, 372, 5);
    for (const wx of [250, 340, 440, 530]) { c.save(); c.translate(wx, FY + 70); c.rotate(-scroll / 22);
      c.beginPath(); c.arc(0, 0, 17, 0, TAU); ART.fillOut(c, '#2f2a55', 3); c.strokeStyle = '#8b7ad0'; c.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(-Math.cos(a) * 13, -Math.sin(a) * 13); c.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); c.stroke(); } c.restore(); }
    ART.rr(c, 190, FY - 26, 26, 28, 8); ART.fillOut(c, '#6e62f5', 2.6);
    for (const o of obs) {
      const y = o.kind === 'high' ? FY - 66 : FY - 18;
      c.save(); c.translate(o.x, y); c.rotate(Math.sin(t * 6 + o.x * 0.01) * 0.06);
      ART.rr(c, -52, -4, 104, 8, 4); ART.fillOut(c, o.kind === 'high' ? '#b07ad8' : '#a8cf3f', 2.4);
      c.beginPath(); c.moveTo(46, -5); c.quadraticCurveTo(78, -17, 86, 0); c.quadraticCurveTo(78, 17, 46, 5); c.closePath(); ART.fillOut(c, '#c9a05a', 2.4);
      c.strokeStyle = 'rgba(26,21,48,.5)'; c.lineWidth = 1.4; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(50, i * 2.2); c.lineTo(82, i * 4.2); c.stroke(); }
      c.restore();
      if (T < 22) fit(o.kind === 'high' ? 'B agáchate' : 'A salta', o.x, y + (o.kind === 'high' ? -26 : 34), 16, o.kind === 'high' ? '#e0b6ff' : '#cbef7a', 160);
    }
    for (const q of ps) {
      const x = PX[q.p];
      if (q.out >= 0) { if (q.fallY < H + 40) guy(q.p, q.fallX, q.fallY, 1.3, { face: -1, state: 'fall', squash: 0.4 }); continue; }
      const duck = q.duck > 0, yy = FY - q.h;
      c.save(); guy(q.p, x, yy, duck ? 1.15 : 1.4, { face: 1, state: q.stun > 0 ? 'fall' : q.air ? (q.vy > 0 ? 'jump' : 'fall') : duck ? 'wall' : 'run', squash: duck ? 0.3 : 0 }); c.restore();
      if (q.stun > 0 && Math.floor(q.stun * 12) % 2) { c.globalAlpha = 0.4; c.beginPath(); c.arc(x, yy - 26, 26, 0, TAU); c.fillStyle = '#ff8a8a'; c.fill(); c.globalAlpha = 1; }
      tagDraw(q.p, x, yy - 86);
      for (let i = 0; i < 2; i++) { const hx = x - 9 + i * 18, hy = yy - 104; ART.heart(c, hx, hy, 0.5, i < 2 - q.hits); }
    }
    fit(T < WARM ? 'Calentamiento' : `${Math.floor(T - WARM)} s en el tren`, 400, 76, 24, T < WARM ? '#ffd166' : '#fff', 380);
    if (fastFwd(ps)) fit('Avance rápido', 400, 104, 18, '#c9c3ef', 300);
    strip(ps.map((q) => (q.out >= 0 ? 'fuera' : 2 - q.hits === 1 ? '1 vida' : '2 vidas')));
  };
  return m;
}

/* 25. TOPO BURLÓN — tú eres el topo: asoma cuando el martillo no mira. */
let HOLES = null;
function mgMole() {
  const CX = [200, 305, 410, 515, 620], RY = [230, 302, 374], NC = 5, NR = 3, TL = 42;
  const m = { name: 'Topo Burlón', help: 'Cambia de agujero con el joystick y mantén A para asomar: fuera sumas puntos. El martillo golpea lo que ve de frente. Zanahoria: 4.', done: false, rank: null };
  const hx = (i) => CX[i % NC], hy = (i) => RY[Math.floor(i / NC)];
  const ps = [0, 1, 2, 3].map((p) => ({ p, h: [0, 4, 10, 14][p], out: 0, want: false, stun: 0, pts: 0, mv: 0, aiT: 0, eat: 0, face: 1, hide: 0 }));
  const carrots = []; let T = 0, over = false, endT = 0, carT = 2.5;
  const ham = { x: 410, y: 150, ga: Math.PI / 2, gt: Math.PI / 2, st: 'look', tgt: -1, tel: 0, smash: 0, idle: 0, look: 0 };
  const seen = (i) => { const dx = hx(i) - ham.x, dy = hy(i) - ham.y, a = Math.atan2(dy, dx); let d = a - ham.ga; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return Math.abs(d) < 0.52 && Math.hypot(dx, dy) < 430; };
  const occupied = (i, not) => ps.some((q) => q !== not && q.h === i && q.stun <= 0);
  function smash() {
    const i = ham.tgt; k.shake(8); k.sfx('explode'); k.burst(hx(i), hy(i), '#8a5a3b', 16, 220);
    for (const q of ps) if (q.h === i && q.out > 0.35 && q.stun <= 0) {
      q.stun = 2.4; q.out = 0; q.pts = Math.max(0, q.pts - 3); k.sfx('hurt'); k.float('¡Martillazo! −3', hx(i), hy(i) - 56, '#ff8a8a');
    }
  }
  m.update = (dt) => {
    T += dt;
    /* martillo */
    if (ham.st === 'look') {
      ham.look -= dt; ham.idle += dt;
      if (ham.look <= 0) { ham.look = lerp(1.5, 0.75, ease(T / TL)) * k.rnd(0.7, 1.3); ham.gt = k.rnd(0.5, Math.PI - 0.5); }
      ham.ga += clamp(ham.gt - ham.ga, -2.1 * dt, 2.1 * dt);
      ham.x += (410 + Math.sin(T * 0.5) * 160 - ham.x) * Math.min(1, dt * 1.6);
      let best = -1;
      for (const q of ps) if (q.out > 0.45 && q.stun <= 0 && seen(q.h)) best = q.h;
      if (best >= 0 || ham.idle > lerp(3.4, 2, ease(T / TL))) {
        ham.tgt = best >= 0 ? best : k.ri(0, NC * NR - 1); ham.st = 'aim'; ham.tel = lerp(0.72, 0.42, ease(T / TL)); ham.idle = 0; k.sfx('tick');
      }
    } else if (ham.st === 'aim') {
      ham.tel -= dt;
      ham.x += (hx(ham.tgt) - ham.x) * Math.min(1, dt * 7);
      ham.y += (hy(ham.tgt) - 104 - ham.y) * Math.min(1, dt * 6);
      const a = Math.atan2(hy(ham.tgt) - ham.y, hx(ham.tgt) - ham.x); ham.ga += clamp(a - ham.ga, -5 * dt, 5 * dt);
      if (ham.tel <= 0) { ham.st = 'smash'; ham.smash = 0.3; smash(); }
    } else { ham.smash -= dt; if (ham.smash <= 0) { ham.st = 'look'; ham.y += (150 - ham.y) * 0.6; ham.gt = k.rnd(0.5, Math.PI - 0.5); ham.look = 0.4; } }
    ham.y += (((ham.st === 'aim' || ham.st === 'smash') ? hy(ham.tgt) - 104 : 150) - ham.y) * Math.min(1, dt * 5);
    /* zanahorias */
    carT -= dt;
    if (carT <= 0 && carrots.length < 2) { const free = []; for (let i = 0; i < NC * NR; i++) if (!carrots.some((z) => z.h === i)) free.push(i); carrots.push({ h: k.pick(free), t: 9 }); carT = 4.5; }
    for (let i = carrots.length - 1; i >= 0; i--) if ((carrots[i].t -= dt) <= 0) carrots.splice(i, 1);
    /* topos */
    for (const q of ps) {
      q.stun -= dt; q.mv -= dt;
      if (q.stun > 0) { q.out = Math.max(0, q.out - dt * 5); continue; }
      let dx = 0, dy = 0, want = false;
      if (cpu(q.p)) {
        q.aiT -= dt;
        const risky = seen(q.h) || (ham.st !== 'look' && ham.tgt === q.h);
        if (risky) q.hide = lerp(0.85, 0.25, SK()); else q.hide = Math.max(0, q.hide - dt);
        want = !risky && q.hide <= 0;
        if (q.aiT <= 0 && q.out < 0.2) {
          q.aiT = lerp(0.5, 0.22, SK());
          const z = carrots[0];
          let tgt = -1;
          if (z && !seen(z.h) && !occupied(z.h, q)) tgt = z.h;
          else if (risky) { const cand = []; for (let i = 0; i < NC * NR; i++) if (!seen(i) && !occupied(i, q)) cand.push(i); if (cand.length) tgt = cand.reduce((a, b) => (Math.hypot(hx(b) - hx(q.h), hy(b) - hy(q.h)) < Math.hypot(hx(a) - hx(q.h), hy(a) - hy(q.h)) ? b : a)); }
          if (tgt >= 0 && tgt !== q.h) { const cq = q.h % NC, rq = Math.floor(q.h / NC), ct = tgt % NC, rt = Math.floor(tgt / NC); if (ct !== cq) dx = Math.sign(ct - cq); else dy = Math.sign(rt - rq); }
        }
        if (Math.random() < lerp(0.35, 0.05, SK()) * dt) want = !want;
      } else {
        const d = dirOf(q.p, hx(q.h), hy(q.h) - 20);
        if (Math.abs(d.x) > 0.45 || Math.abs(d.y) > 0.45) { if (Math.abs(d.x) >= Math.abs(d.y)) dx = Math.sign(d.x); else dy = Math.sign(d.y); }
        want = k.pheld(q.p, 'a') || (q.p === 0 && !k.party && k.ptr.down);
      }
      if ((dx || dy) && q.mv <= 0 && q.out < 0.25) {
        const cq = q.h % NC, rq = Math.floor(q.h / NC), nc2 = clamp(cq + dx, 0, NC - 1), nr2 = clamp(rq + dy, 0, NR - 1), ni = nr2 * NC + nc2;
        if (ni !== q.h && !occupied(ni, q)) { q.h = ni; q.mv = 0.22; q.out = 0; q.face = dx >= 0 ? 1 : -1; if (!cpu(q.p)) k.sfx('click'); }
      }
      q.want = want;
      q.out = clamp(q.out + (want ? 5 : -7) * dt, 0, 1);
      if (q.out > 0.6) {
        q.pts += 1.25 * dt;
        const z = carrots.find((x) => x.h === q.h);
        if (z) { q.eat += dt; if (q.eat > 0.55) { carrots.splice(carrots.indexOf(z), 1); q.pts += 4; q.eat = 0; k.sfx('coin'); k.float('¡Zanahoria! +4', hx(q.h), hy(q.h) - 56, '#ffc94d'); } }
        else q.eat = 0;
      } else q.eat = 0;
    }
    if (!over && T > TL) { over = true; endT = 1.5; m.rank = rankBy(ps, (q) => Math.floor(q.pts)); }
    if (over && (endT -= dt) <= 0) m.done = true;
  };
  m.draw = () => {
    if (!HOLES) HOLES = mk(W, H, (g) => {
      const gr = g.createLinearGradient(0, 120, 0, H); gr.addColorStop(0, '#7db544'); gr.addColorStop(1, '#5c9434');
      g.fillStyle = gr; g.fillRect(0, 120, W, H - 120);
      g.fillStyle = 'rgba(26,21,48,.08)'; for (let i = 0; i < 70; i++) { const x = (i * 149) % W, y = 130 + ((i * 83) % (H - 140)); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y - 8); g.lineTo(x + 6, y); g.fill(); }
      for (let r = 0; r < 3; r++) for (let cc = 0; cc < 5; cc++) {
        const x = [200, 305, 410, 515, 620][cc], y = [230, 302, 374][r];
        g.beginPath(); g.ellipse(x, y + 6, 40, 17, 0, 0, TAU); g.fillStyle = '#6b4329'; g.fill();
        g.beginPath(); g.ellipse(x, y, 34, 14, 0, 0, TAU); g.fillStyle = '#2b1c14'; g.fill();
        g.lineWidth = 2.6; g.strokeStyle = '#1a1530'; g.stroke();
      }
    });
    ART.background(c, TH.meadow, W, 150, 0, 0, t);
    c.drawImage(HOLES, 0, 0, W, H);
    /* cono de visión */
    c.save(); c.globalAlpha = ham.st === 'look' ? 0.2 : 0.3; c.fillStyle = ham.st === 'look' ? '#ffd166' : '#ff5a5f';
    c.beginPath(); c.moveTo(ham.x, ham.y + 16); c.arc(ham.x, ham.y + 16, 420, ham.ga - 0.52, ham.ga + 0.52); c.closePath(); c.fill(); c.restore();
    for (const z of carrots) { const x = hx(z.h), y = hy(z.h) - 6;
      c.save(); c.translate(x + 20, y - 4); c.rotate(0.3);
      c.beginPath(); c.moveTo(0, 12); c.lineTo(-6, -8); c.lineTo(6, -8); c.closePath(); ART.fillOut(c, '#f0842a', 2);
      c.beginPath(); c.moveTo(0, -8); c.lineTo(-6, -18); c.moveTo(0, -8); c.lineTo(0, -20); c.moveTo(0, -8); c.lineTo(6, -18); c.strokeStyle = '#a8cf3f'; c.lineWidth = 3; c.stroke(); c.restore(); }
    for (const q of ps) {
      const x = hx(q.h), y = hy(q.h), o = q.out;
      c.save(); c.beginPath(); c.rect(x - 36, y - 92, 72, 92); c.clip();
      const by = y + 28 - o * 52;
      c.beginPath(); c.ellipse(x, by, 24, 26, 0, 0, TAU); ART.fillOut(c, ART.dark(col(q.p), 0.1), 2.8);
      c.beginPath(); c.ellipse(x, by + 12, 17, 13, 0, 0, TAU); ART.fillOut(c, ART.lite(col(q.p), 0.4), 2.2);
      c.beginPath(); c.ellipse(x + q.face * 4, by + 4, 8, 6, 0, 0, TAU); ART.fillOut(c, '#ff9ad5', 2);
      c.fillStyle = OUT; c.beginPath(); c.arc(x + q.face * 2 - 6, by + 1, 1.6, 0, TAU); c.arc(x + q.face * 2 + 8, by + 1, 1.6, 0, TAU); c.fill();
      if (q.stun > 0) { for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; star(x + Math.cos(a) * 16, by - 22 + Math.sin(a) * 5, 4); } }
      c.restore();
      c.beginPath(); c.ellipse(x, y, 34, 14, 0, 0, Math.PI); c.fillStyle = '#2b1c14'; c.fill(); /* borde delantero del agujero */
      c.strokeStyle = OUT; c.lineWidth = 2.6; c.beginPath(); c.ellipse(x, y, 34, 14, 0, 0, Math.PI); c.stroke();
      if (o > 0.5) tagDraw(q.p, x, y - 48 - o * 6);
    }
    /* martillo */
    c.save(); c.translate(ham.x, ham.y); const dn = ham.st === 'smash' ? 1 - ham.smash / 0.3 : 0, up = ham.st === 'aim' ? 0.4 : 0;
    c.rotate(-up + dn * 0.5);
    ART.rr(c, -7, 0, 14, 96, 6); ART.fillOut(c, '#8b5a3c', 3);
    ART.rr(c, -46, -34, 92, 44, 12); ART.fillOut(c, '#c9cede', 3.4);
    c.fillStyle = 'rgba(26,21,48,.18)'; c.fillRect(-46, -6, 92, 8);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-14, -14, 8, 0, TAU); c.arc(14, -14, 8, 0, TAU); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 2.2; c.beginPath(); c.arc(-14, -14, 8, 0, TAU); c.stroke(); c.beginPath(); c.arc(14, -14, 8, 0, TAU); c.stroke();
    const gx = Math.cos(ham.ga - Math.PI / 2 + up) * 3.6, gy = Math.sin(ham.ga - Math.PI / 2 + up) * 3.6;
    c.fillStyle = OUT; c.beginPath(); c.arc(-14 + gx, -14 + gy, 3.6, 0, TAU); c.arc(14 + gx, -14 + gy, 3.6, 0, TAU); c.fill();
    c.restore();
    if (ham.st === 'aim') { const x = hx(ham.tgt), y = hy(ham.tgt), f = 0.4 + 0.6 * Math.sin(t * 24);
      c.strokeStyle = `rgba(255,90,95,${f})`; c.lineWidth = 4; c.beginPath(); c.ellipse(x, y, 38, 16, 0, 0, TAU); c.stroke(); }
    fit(`${Math.max(0, Math.ceil(TL - T))} s`, 400, 86, 22, '#fff', 200);
    strip(ps.map((q) => Math.floor(q.pts)));
  };
  return m;
}

/* =====================================================================================
 * Marco: rondas, marcador, ruleta y podio
 * ===================================================================================== */
const MG = { anvil: mgAnvil, duel: mgDuel, mash: mgMash, tug: mgTug, balloons: mgBalloons, arrows: mgArrows, clock: mgClock, needle: mgNeedle,
  pump: mgPump, simon: mgSimon, rope: mgRope, fish: mgFish, statue: mgStatue, sheep: mgSheep, sack: mgSack, pie: mgPie, derby: mgDerby,
  bowl: mgBowl, bull: mgBull, egg: mgEgg, photo: mgPhoto, relay: mgRelay, hotair: mgHotair, witch: mgWitch, mole: mgMole };
const COOP = { relay: 1, hotair: 1 }; /* oleada 3: dos minijuegos cooperativos con resultado de equipo */
const KEYS = ['anvil', 'duel', 'mash', 'tug', 'balloons', 'arrows', 'clock', 'needle'], /* casillas de la ruleta (fijas) */ SHORT = { anvil: 'Yunques', duel: 'Duelo', mash: 'Carrera', tug: 'Cuerda', balloons: 'Globos', arrows: 'Flechas', clock: 'Reloj', needle: 'Diana' };
const NAMES = { anvil: 'Lluvia de Yunques', duel: 'Duelo del Oeste', mash: 'Carrera Machacabotones', tug: 'Tira y Afloja', balloons: 'Cuenta Globos', arrows: 'Flechas de Memoria', clock: 'Reloj a Ciegas', needle: 'Diana Oscilante' };
const WCOL = ['#6e62f5', '#ff5a5f', '#3fb6ea', '#ffd166', '#5fbf45', '#ff9ad5', '#f0842a', '#34b574'];
const RULE = { anvil: { rounds: 3, pts: [3, 2, 1, 0] }, mash: { rounds: 3, pts: [3, 2, 1, 0] }, duel: { to: 5, pts: [1, 0, 0, 0] }, tug: { to: 2, pts: [1, 0, 0, 0] }, roulette: { rounds: 10, pts: [3, 2, 1, 0] },
  /* modos largos (rondas de ~1 min): dos rondas para que la partida dure lo mismo que las demás */
  egg: { rounds: 2, pts: [3, 2, 1, 0] }, relay: { rounds: 2, pts: [3, 2, 1, 0] }, hotair: { rounds: 2, pts: [3, 2, 1, 0] }, witch: { rounds: 2, pts: [3, 2, 1, 0] } }[MODE] || { rounds: 3, pts: [3, 2, 1, 0] };
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
  let head = !r ? 'Ronda nula' : COOP[gKey] ? (G.teamHead || '¡Equipo!') : gKey === 'tug' ? teamHead(w[0] % 2) : w.length === 1 ? winTxt(w[0]) : w.length === 4 ? '¡Empate total!' : '¡Empate!';
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
