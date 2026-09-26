/* Honda — tirachinas y proyectiles contra estructuras que se derrumban. Arte propio (ART).
 * CFG.mode: 'frutas' (1 jugador, niveles con solución comprobada por simulación) | 'caseta' (feria, 1–4 jugadores, 60 s).
 * Física propia: cajas sin rotación con subpasos, impulsos secuenciales, rozamiento y reposo (dormidas);
 * determinista (sin azar dentro del paso) para poder simular el nivel y garantizar que se puede terminar. */
const M = CFG.mode || 'frutas', OUT = ART.OUT, TAU = Math.PI * 2, lite = ART.lite, dark = ART.dark, alpha = ART.alpha;
const W = 760, H = 430, GY = H - 46, TOPB = 46;
const k = Kit({ w: W, h: H, title: CFG.title, bg: M === 'caseta' ? '#180f2e' : '#0f1a2e' }), c = k.ctx;
/* ---------- R5 §8 «pieza única» + cartoon de estudio (helpers locales) ----------
   uni(): contornea TODAS las partes y luego las rellena → solo sobrevive la silueta exterior.
   celp(): 3 tonos de borde duro (cel shading) recortados a la silueta, sin degradados.
   spec(): único óvalo especular.  contact(): sombra de contacto dura. */
function uni(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = ART.OUT; g.lineWidth = (ow || 1.5) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
}
function inpath(g, parts, fn) { g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip(); fn(g); g.restore(); }
function celp(g, parts, base, dx, dy) {
  inpath(g, parts, (h) => {
    const P = () => { h.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](h); h.fill(); };
    h.fillStyle = ART.dark(base, 0.24); P();
    h.translate(-dx, -dy); h.fillStyle = base; P();
    h.translate(-dx * 1.15, -dy * 1.15); h.fillStyle = ART.lite(base, 0.2); P();
  });
}
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.7 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); g.fill(); }
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
const TH = ART.THEMES[M === 'caseta' ? 'dusk' : 'meadow'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, q) => a + (b - a) * clamp(q, 0, 1);
const rs = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 4.5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function fit(s, max, size, min) { // reduce el cuerpo hasta que el texto cabe; si no, lo recorta
  let sz = size;
  for (; sz > (min || 9); sz--) { c.font = `800 ${sz}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; if (c.measureText(s).width <= max) return [s, sz]; }
  let out = s; while (out.length > 1) { out = out.slice(0, -1); c.font = `800 ${sz}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; if (c.measureText(out + '…').width <= max) return [out + '…', sz]; }
  return [out, sz];
}
function tw(s, size) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; return c.measureText(s).width; }
function mkCv(w, h, fn) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * 2); cv.height = Math.ceil(h * 2); const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; fn(g); return cv; }

/* ================= Física de cajas ================= */
const MAT = {
  madera: { dens: 0.95, tough: 210, col: '#c98a4b', e: 0.06, fr: 0.62 },
  hielo: { dens: 0.62, tough: 120, col: '#9fe7ff', e: 0.14, fr: 0.18 },
  piedra: { dens: 1.85, tough: 470, col: '#9a98ac', e: 0.03, fr: 0.7 },
  verdura: { dens: 0.8, tough: 85, col: '#a8cf3f', e: 0.1, fr: 0.5 },
  botella: { dens: 0.6, tough: 55, col: '#7fd8b0', e: 0.16, fr: 0.3 },
  suelo: { dens: 9, tough: 9e9, col: '#6b4329', e: 0.04, fr: 0.8 },
};
const G = 1280, SLEEPV = 11, SLEEPT = 0.45, DMG0 = 105;
let B = [], PR = [], SIM = false, t = 0, shakeQ = 0;
function mkBody(x, y, hw, hh, mat, o) {
  o = o || {}; const m = MAT[mat], area = (hw * hh * 4) / 484;
  const b = { x, y, hw, hh, vx: 0, vy: 0, mat, col: o.col || m.col, st: !!o.st, kind: o.kind || 'bloque',
    im: o.st ? 0 : 1 / Math.max(0.35, m.dens * area), hp: m.tough * Math.sqrt(area), slp: 0, dead: false, fl: 0, seed: B.length + 1, tilt: 0, down: false };
  b.max = b.hp; if (o.kind) b.kind = o.kind; if (o.thru) b.thru = true; B.push(b); return b;
}
function wake(b) { if (b.im) { b.slp = 0; b.zzz = false; } }
function hurt(b, imp) {
  if (b.st || b.dead || imp < DMG0) return;
  b.hp -= (imp - DMG0) * 1.35; b.fl = 0.18;
  if (b.hp <= 0) { b.dead = true; if (M === 'caseta' && b.kind === 'botella' && b.last && !b.down) { b.down = true; addPts(b.last, 150, b.x, b.y, '#7fd8b0'); } if (!SIM) { fxBurst(b.x, b.y, b.mat === 'verdura' ? '#a8cf3f' : b.col, 12, 150); k.sfx(b.mat === 'hielo' || b.mat === 'botella' ? 'pop' : 'explode'); shakeQ = Math.max(shakeQ, 3); } }
}
/* caja contra caja: eje de menor penetración, impulso normal y rozamiento tangencial */
function pair(a, b) {
  if (a.dead || b.dead || (!a.im && !b.im)) return;
  const dx = b.x - a.x, px = a.hw + b.hw - Math.abs(dx); if (px <= 0) return;
  const dy = b.y - a.y, py = a.hh + b.hh - Math.abs(dy); if (py <= 0) return;
  if (a.zzz && b.zzz) return;
  let nx = 0, ny = 0, pen;
  if (px < py) { nx = dx < 0 ? -1 : 1; pen = px; } else { ny = dy < 0 ? -1 : 1; pen = py; }
  const im = a.im + b.im, ea = MAT[a.mat], eb = MAT[b.mat], e = Math.min(ea.e, eb.e), fr = (ea.fr + eb.fr) / 2;
  const corr = Math.max(0, pen - 0.05) * 0.85 / im;
  a.x -= nx * corr * a.im; a.y -= ny * corr * a.im; b.x += nx * corr * b.im; b.y += ny * corr * b.im;
  const rvx = b.vx - a.vx, rvy = b.vy - a.vy, rv = rvx * nx + rvy * ny;
  if (rv < 0) {
    const j = -(1 + e) * rv / im;
    a.vx -= j * nx * a.im; a.vy -= j * ny * a.im; b.vx += j * nx * b.im; b.vy += j * ny * b.im;
    const imp = -rv; hurt(a, imp); hurt(b, imp);
    const tx = -ny, ty = nx, rt = rvx * tx + rvy * ty, jt = clamp(-rt / im, -j * fr, j * fr);
    a.vx -= jt * tx * a.im; a.vy -= jt * ty * a.im; b.vx += jt * tx * b.im; b.vy += jt * ty * b.im;
    if (imp > 30) { wake(a); wake(b); if (a.last && !b.last) b.last = a.last; else if (b.last && !a.last) a.last = b.last; }
  }
}
function groundHit(b) {
  if (b.st || b.dead) return;
  const low = b.y + b.hh - GY; if (low <= 0) return;
  b.y -= low * 0.9;
  if (b.vy > 0) { const imp = b.vy; b.vy = -b.vy * MAT[b.mat].e; hurt(b, imp * 0.9); }
  b.vx *= 1 - Math.min(0.5, MAT[b.mat].fr * 0.35);
}
function phStep(dt) {
  for (const b of B) { if (b.st || b.dead || b.zzz) continue; b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < -60 || b.x > W + 60) b.dead = true; }
  for (let it = 0; it < 3; it++) {
    for (let i = 0; i < B.length; i++) { const a = B[i]; if (a.dead) continue; for (let j = i + 1; j < B.length; j++) pair(a, B[j]); }
    for (const b of B) groundHit(b);
  }
  for (const b of B) {
    if (b.st || b.dead) continue;
    if (Math.abs(b.vx) + Math.abs(b.vy) < SLEEPV) { b.slp += dt; if (b.slp > SLEEPT) { b.zzz = true; b.vx = b.vy = 0; } } else { b.slp = 0; b.zzz = false; }
    b.fl = Math.max(0, b.fl - dt * 3);
    if (!b.st) { const lean = clamp(b.vx * 0.0016, -0.22, 0.22); b.tilt += (lean - b.tilt) * Math.min(1, dt * 6); }
  }
  for (const p of PR) {
    if (p.dead) continue;
    p.vy += G * 0.82 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life += dt;
    if (p.y + p.r > GY) { p.y = GY - p.r; const imp = p.vy; if (imp > 40) { p.vy = -imp * 0.3; p.vx *= 0.68; p.bounce++; } else { p.vy = 0; p.vx *= 0.9; } if (Math.abs(p.vx) < 12 && Math.abs(p.vy) < 12) p.rest += dt * 4; }
    if (p.x < -50 || p.x > W + 60 || p.life > 12 || p.rest > 1) p.dead = true;
    for (const b of B) {
      if (b.dead || b.thru) continue; /* la balda sujeta las botellas pero deja pasar los perdigones */
      const cx = clamp(p.x, b.x - b.hw, b.x + b.hw), cy = clamp(p.y, b.y - b.hh, b.y + b.hh);
      let dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
      if (d > p.r) continue;
      if (d < 0.0001) { dx = 0; dy = -1; d = 1; }
      const nx = dx / d, ny = dy / d, pen = p.r - d;
      const im = p.im + b.im; if (im <= 0) continue;
      p.x += nx * pen * (p.im / im) * 0.9; p.y += ny * pen * (p.im / im) * 0.9;
      b.x -= nx * pen * (b.im / im) * 0.9; b.y -= ny * pen * (b.im / im) * 0.9;
      const rv = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
      if (rv < 0) {
        const j = -(1 + 0.12) * rv / im;
        p.vx -= j * nx * p.im; p.vy -= j * ny * p.im; b.vx += j * nx * b.im; b.vy += j * ny * b.im;
        wake(b); if (p.own) b.last = p.own; const imp = -rv * (p.hard || 1); hurt(b, imp + 80);
        p.hits++; if (!SIM) { k.sfx('hit'); fxBurst(p.x, p.y, '#fff2c8', 5, 110); }
        if (p.pop) p.dead = true;
      }
    }
  }
  PR = PR.filter((p) => !p.dead);
  B = B.filter((b) => !b.dead || b.st);
}
const atRest = () => PR.length === 0 && B.every((b) => b.st || b.zzz || b.dead);
function fxBurst(x, y, col, n, v) { if (!SIM) k.burst(x, y, col, n, v); }

/* instantánea del estado para la simulación del generador */
function snap() { return { list: B.slice(), b: B.map((q) => [q.x, q.y, q.vx, q.vy, q.hp, q.dead ? 1 : 0, q.zzz ? 1 : 0, q.slp, q.tilt]) }; }
function restore(s) { B = s.list.slice(); for (let i = 0; i < B.length; i++) { const q = B[i], v = s.b[i]; q.x = v[0]; q.y = v[1]; q.vx = v[2]; q.vy = v[3]; q.hp = v[4]; q.dead = !!v[5]; q.zzz = !!v[6]; q.slp = v[7]; q.tilt = v[8]; } PR = []; }

/* ================= Modo FRUTAS: tirachinas contra fortalezas de verduras ================= */
const SX = 104, SY = GY - 104; // horquilla de la honda
const FRUIT = ['cereza', 'naranja', 'sandia', 'kiwi'];
const FR = { cereza: { r: 9, m: 0.6, hard: 1, col: '#ff4d6d' }, naranja: { r: 12, m: 1, hard: 1.15, col: '#ffa23d' }, sandia: { r: 17, m: 2.2, hard: 1.5, col: '#4fb14f' }, kiwi: { r: 11, m: 0.9, hard: 1.1, col: '#8fbf3f' } };
const VEG = ['tomate', 'berenjena', 'brocoli', 'pimiento'];
let level = 1, score = 0, ammo = [], shotIdx = 0, aim = 0.62, pw = 0, charging = false, dragging = false, flying = null, usedAb = false;
let restT = 0, clearT = 0, overT = 0, msg = '', msgT = 0, trail = [], vegs = [], shotsFired = 0, bestSc = 0, hintT = 0;

function addBlock(x, y, hw, hh, mat) { return mkBody(x, y, hw, hh, mat); }
function addVeg(x, y, kind) { const b = mkBody(x, y, 15, 16, 'verdura', { kind: 'verdura' }); b.veg = kind; vegs.push(b); return b; }
/* torre: columnas de tablones verticales, viga horizontal encima y verduras sobre la viga */
function tower(bx, floors, mat, top) {
  const colW = 9, colH = 33, span = 56;
  let base = GY;
  for (let f = 0; f < floors; f++) {
    addBlock(bx - span / 2, base - colH, colW, colH, mat);
    addBlock(bx + span / 2, base - colH, colW, colH, mat);
    addBlock(bx, base - colH * 2 - 9, span / 2 + colW + 2, 9, f === floors - 1 && top ? top : mat);
    if (f < floors - 1) addVegMaybe(bx, base - colH * 2 - 18 - 16);
    base -= colH * 2 + 18;
  }
  return base;
}
let vegQueue = 0;
function addVegMaybe(x, y) { if (vegQueue > 0) { vegQueue--; addVeg(x, y, VEG[(vegs.length + level) % VEG.length]); return true; } return false; }

function buildLevel() {
  B = []; PR = []; vegs = []; trail = []; flying = null; usedAb = false; charging = false; dragging = false; pw = 0; shotIdx = 0; restT = 0; clearT = 0;
  const lv = Math.min(1, (level - 1) / 9);
  const nv = Math.min(6, 2 + Math.floor((level - 1) * 0.6)); vegQueue = nv;
  const mats = level < 2 ? ['madera'] : level < 4 ? ['madera', 'hielo'] : ['madera', 'hielo', 'piedra'];
  const nt = level < 2 ? 1 : level < 5 ? 2 : 3;
  const xs = nt === 1 ? [520] : nt === 2 ? [470, 610] : [430, 550, 672];
  for (let i = 0; i < nt; i++) {
    const mat = mats[(level + i) % mats.length], floors = 1 + (level >= 3 && i % 2 === 0 ? 1 : 0);
    const topb = level >= 5 && i === nt - 1 ? 'piedra' : mat;
    const y = tower(xs[i], floors, mat, topb);
    if (!addVegMaybe(xs[i], y - 16)) { if (level >= 4 && Math.random() < 0.5) addBlock(xs[i], y - 11, 22, 11, mat); }
  }
  // las verduras que falten se quedan a la vista, en el suelo entre torres (nivel 1 muy fácil)
  let g = 0;
  while (vegQueue > 0) { addVeg(clamp(360 + g * 78 + (g % 2 ? 26 : 0), 330, W - 40), GY - 16, VEG[(vegs.length + level) % VEG.length]); vegQueue--; g++; }
  const need = 3 + Math.min(3, Math.floor(level / 3)) + (nv > 3 ? 1 : 0);
  ammo = []; for (let i = 0; i < need; i++) ammo.push(FRUIT[level < 2 ? 1 : (i + level) % (level < 4 ? 2 : FRUIT.length)]);
  aim = 0.62; hintT = level === 1 ? 4 : 0;
  return lv;
}
/* ---- simulación del generador: ¿se puede terminar el nivel? ---- */
function simShot(ang, power, fruit) {
  const f = FR[fruit], sp = 330 + power * 620;
  PR = [{ x: SX, y: SY, vx: Math.cos(ang) * sp, vy: -Math.sin(ang) * sp, r: f.r, im: 1 / f.m, hard: f.hard, life: 0, rest: 0, hits: 0, bounce: 0 }];
  const dt = 1 / 60; let n = 0;
  while (n < 420) { phStep(dt); n++; if (n > 40 && atRest()) break; }
  for (let i = 0; i < 60; i++) phStep(dt); // que termine de asentarse
  return B.filter((b) => b.kind === 'verdura' && !b.dead).length;
}
function solvable(shots) {
  const was = SIM; SIM = true;
  const t0 = (window.performance && performance.now()) || Date.now();
  const start = snap(); let left = B.filter((b) => b.kind === 'verdura').length, ok = false;
  const ANG = [], NA = 13; for (let i = 0; i < NA; i++) ANG.push(0.12 + i * (1.28 / (NA - 1)));
  const POW = [0.55, 0.78, 1];
  let cur = start;
  for (let s = 0; s < shots && !ok; s++) {
    let bestN = left, bestSnap = null;
    for (const a of ANG) for (const q of POW) {
      restore(cur); const n = simShot(a, q, 'naranja');
      if (n < bestN) { bestN = n; bestSnap = snap(); }
      if (n === 0) { ok = true; break; }
      if (((window.performance && performance.now()) || Date.now()) - t0 > 420) break;
    }
    if (ok) break;
    if (!bestSnap) break;
    cur = bestSnap; left = bestN;
    if (((window.performance && performance.now()) || Date.now()) - t0 > 420) break;
  }
  restore(start); SIM = was; return ok;
}
function genLevel() {
  for (let try_ = 0; try_ < 6; try_++) {
    buildLevel();
    if (solvable(Math.max(2, ammo.length - 1))) return;
  }
  // salida segura: deja las verduras a la vista en el suelo (siempre se puede terminar)
  B = []; PR = []; vegs = [];
  const nv = Math.min(5, 2 + Math.floor((level - 1) * 0.5));
  for (let i = 0; i < nv; i++) addVeg(380 + i * 74, GY - 16, VEG[i % VEG.length]);
  for (let i = 0; i < nv - 1; i++) addBlock(417 + i * 74, GY - 33, 9, 33, 'madera');
  ammo = []; for (let i = 0; i < nv + 2; i++) ammo.push(FRUIT[i % 2]);
}
function resetFrutas() { score = 0; level = 1; shotsFired = 0; overT = 0; msgT = 0; bestSc = k.best(CFG.id, 0); genLevel(); }

function fire(ang, power) {
  const fruit = ammo[shotIdx] || 'naranja', f = FR[fruit], sp = 330 + power * 620;
  flying = { x: SX, y: SY, vx: Math.cos(ang) * sp, vy: -Math.sin(ang) * sp, r: f.r, im: 1 / f.m, hard: f.hard, life: 0, rest: 0, hits: 0, bounce: 0, fruit };
  PR.push(flying); trail = []; usedAb = false; shotIdx++; shotsFired++; k.sfx('shoot'); restT = 0;
}
function ability() {
  if (!flying || usedAb || flying.dead || flying.life < 0.12) return;
  usedAb = true; const f = flying;
  if (f.fruit === 'cereza') { for (let i = -1; i <= 1; i += 2) { const p = { x: f.x, y: f.y, vx: f.vx, vy: f.vy + i * 190, r: 8, im: 1 / 0.5, hard: 1, life: f.life, rest: 0, hits: 0, bounce: 0, fruit: 'cereza' }; PR.push(p); } k.sfx('pop'); }
  else if (f.fruit === 'naranja') { const m = Math.hypot(f.vx, f.vy) || 1; f.vx += f.vx / m * 330; f.vy += f.vy / m * 330; k.sfx('start'); }
  else if (f.fruit === 'sandia') { f.vy += 620; f.hard = 2.1; k.sfx('hurt'); }
  else { f.vy = -Math.abs(f.vy) - 180; f.vx *= 0.75; k.sfx('jump'); }
  fxBurst(f.x, f.y, FR[f.fruit].col, 10, 140);
}
function updFrutas(dt) {
  if (overT > 0) { overT -= dt; if (overT <= 0) k.lose(CFG.id, score, 'Sin munición', `Nivel ${level}`); return; }
  if (clearT > 0) { clearT -= dt; if (clearT <= 0) { level++; genLevel(); } return; }
  const live = vegs.filter((v) => !v.dead).length;
  // ---- puntería ----
  if (!flying) {
    if (k.ptr.down) {
      const dx = SX - k.ptr.x, dy = k.ptr.y - SY, d = Math.hypot(dx, dy);
      if (d > 8) { dragging = true; aim = Math.atan2(dy, dx); if (aim < -0.25) aim = -0.25; if (aim > 1.45) aim = 1.45; pw = clamp(d / 120, 0.12, 1); }
    } else if (dragging) { dragging = false; if (pw > 0.12) fire(aim, pw); pw = 0; }
    if (!dragging) {
      const up = k.held.has('up'), dn = k.held.has('down');
      if (up) aim = Math.min(1.45, aim + dt * 1.05); if (dn) aim = Math.max(-0.25, aim - dt * 1.05);
      if (k.held.has('a')) { charging = true; pw = Math.min(1, pw + dt * 0.95); }
      else if (charging) { charging = false; fire(aim, Math.max(0.25, pw)); pw = 0; }
    }
  } else if (k.hit.has('b') || k.hit.has('a') || k.tap || k.ptr.hit) ability();
  // ---- física ----
  const sub = 3; for (let i = 0; i < sub; i++) phStep(dt / sub);
  if (flying && !PR.includes(flying)) flying = null;
  if (flying) { trail.push([flying.x, flying.y]); if (trail.length > 70) trail.shift(); }
  const now = vegs.filter((v) => !v.dead).length;
  if (now < live) { const got = live - now; score += 800 * got; k.float(`+${800 * got}`, 380, 120, '#a8cf3f'); k.sfx('coin'); }
  if (now === 0) {
    const rest = Math.max(0, ammo.length - shotIdx); score += 500 * level + rest * 1200;
    clearT = 2; msg = rest ? `¡Nivel ${level} limpio! +${rest * 1200} por fruta sin usar` : `¡Nivel ${level} limpio!`; msgT = 2; k.sfx('win'); k.confetti(); return;
  }
  if (!flying && PR.length === 0) {
    restT += dt;
    if (restT > 1 && atRest() && shotIdx >= ammo.length) { overT = 1.2; msg = 'Te quedaste sin frutas'; msgT = 1.2; }
  }
  if (shakeQ > 0) { k.shake(shakeQ); shakeQ = 0; }
}

/* ================= Modo CASETA: tiro de feria, 1–4 jugadores, 60 s ================= */
const DUCKY = [GY - 208, GY - 164, GY - 120], TIME = 60;
let P = [], ducks = [], stars = [], time = 0, phase = 'play', overT2 = 0, rebuildT = 0, cd = 0, CPUW = 0;
try { CPUW = Math.min(8, +localStorage.getItem('cpu:' + CFG.id) || 0); } catch (e) { /* sin almacenamiento */ }
const skill = () => Math.min(0.78, 0.2 + CPUW * 0.055 + (TIME - time) / TIME * 0.12);
function nSeats() { return k.party ? Math.max(1, Math.max.apply(null, k.party.map((x) => x.p)) + 1) : Math.min(2, k.mpMax); }
function mkPlayers() { P = k.players(nSeats()).map((q, i) => ({ i, p: q.p, col: q.color, name: q.name, cpu: q.cpu, sc: 0, ammo: 6, rl: 0, cool: 0, x: 180 + i * 140, y: GY - 150, tx: 0, ty: 0, think: 0, kick: 0 })); }
function syncPlayers() { const pl = k.players(P.length); P.forEach((x, i) => { x.cpu = pl[i].cpu; x.name = pl[i].name; x.col = pl[i].color; }); }
function bottleStack(bx) {
  const sy = GY - 42, w = 9, h = 15;
  for (let row = 0; row < 2; row++) { const n = 3 - row; for (let i = 0; i < n; i++) mkBody(bx + (i - (n - 1) / 2) * (w * 2 + 4), sy - h - row * (h * 2 + 1), w, h, 'botella', { kind: 'botella' }); }
}
function buildFeria() {
  B = []; PR = []; ducks = []; stars = [];
  for (const bx of [250, 420, 590]) { mkBody(bx, GY - 34, 76, 8, 'suelo', { st: true, kind: 'balda', thru: true }); bottleStack(bx); }
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) ducks.push({ r, x: 60 + i * 190 + r * 60, y: DUCKY[r], dir: r % 2 ? -1 : 1, sp: 62 + r * 26, alive: true, tt: 0, fall: 0 });
}
function resetCaseta() { mkPlayers(); buildFeria(); time = TIME; phase = 'play'; overT2 = 0; rebuildT = 0; k.count && k.count(3); }
function shoot(pl, ang, power) {
  if (pl.ammo <= 0 || pl.cool > 0) return;
  pl.ammo--; pl.cool = 0.16; pl.kick = 0.2; if (pl.ammo === 0) pl.rl = 1.1;
  const sp = 720 * power;
  PR.push({ x: pl.x, y: GY - 12, vx: Math.cos(ang) * sp, vy: -Math.sin(ang) * sp, r: 5, im: 1 / 0.32, hard: 1.9, life: 0, rest: 0, hits: 0, bounce: 0, own: pl, pop: false });
  k.sfx('shoot');
}
function aimLead(pl, tg) { // adelanta el tiro según el tiempo de vuelo (dos pasadas)
  let tx = tg.x; const ty = tg.y;
  for (let i = 0; i < 2; i++) { const d = Math.hypot(tx - pl.x, (GY - 12) - ty); tx = tg.x + (tg.vx || 0) * (d / 700); }
  return [aimAt(pl, tx, ty), tx, ty];
}
function aimAt(pl, tx, ty) { // ángulo con compensación de la caída (tiro tenso)
  const dx = tx - pl.x, dy = (GY - 12) - ty, d = Math.hypot(dx, dy) || 1;
  return Math.atan2(dy + d * d * 0.00102, dx);
}
function addPts(pl, v, x, y, col) { pl.sc += v; k.float(`+${v}`, x, y - 14, col || pl.col); }
function updCaseta(dt) {
  if (phase === 'over') { overT2 -= dt; if (overT2 <= 0) { const win = P.slice().sort((a, b) => b.sc - a.sc)[0]; if (win && !win.cpu) { CPUW++; try { localStorage.setItem('cpu:' + CFG.id, CPUW); } catch (e) { /* sin almacenamiento */ } } k.podium(P.map((q) => ({ p: q.p, score: q.sc }))); phase = 'done'; } return; }
  if (phase !== 'play') return;
  time -= dt; if (time <= 0) { time = 0; phase = 'over'; overT2 = 1.4; k.sfx('win'); k.confetti(); return; }
  const soft = clamp((TIME - time) / 6, 0, 1); // arranque suave: los patos aceleran en los primeros 6 s
  for (const d of ducks) {
    if (!d.alive) { d.tt -= dt; d.fall = Math.min(1, d.fall + dt * 4); if (d.tt <= 0) { d.alive = true; d.fall = 0; d.x = d.dir > 0 ? -30 : W + 30; } continue; }
    d.x += d.dir * d.sp * (0.55 + 0.45 * soft) * dt;
    if (d.x < -40) d.x = W + 40; else if (d.x > W + 40) d.x = -40;
  }
  if (stars.length < 1 && Math.random() < dt * 0.35) stars.push({ x: k.rnd(120, W - 120), y: GY - 250, ph: 0, life: 7 });
  for (const s of stars) { s.ph += dt; s.life -= dt; s.y = GY - 250 + Math.sin(s.ph * 1.6) * 34; s.x += Math.cos(s.ph * 0.7) * 34 * dt; }
  stars = stars.filter((s) => s.life > 0 && !s.got);
  const sub = 3; for (let i = 0; i < sub; i++) phStep(dt / sub);
  // impactos de los perdigones en patos y estrellas
  for (const p of PR) {
    if (p.dead || !p.own) continue;
    for (const d of ducks) if (d.alive && Math.abs(p.x - d.x) < 23 && Math.abs(p.y - d.y) < 20) { d.alive = false; d.tt = 2.2; d.fall = 0; p.dead = true; addPts(p.own, 200 - d.r * 50, d.x, d.y); k.sfx('pop'); k.burst(d.x, d.y, '#ffc94d', 12, 150); break; }
    if (p.dead) continue;
    for (const s of stars) if (!s.got && Math.hypot(p.x - s.x, p.y - s.y) < 20) { s.got = true; p.dead = true; addPts(p.own, 500, s.x, s.y, '#ffc94d'); k.sfx('coin'); k.burst(s.x, s.y, '#ffc94d', 18, 190); }
  }
  PR = PR.filter((q) => !q.dead);
  // botellas derribadas
  for (const b of B) if (b.kind === 'botella' && !b.down && !b.st && b.y + b.hh > GY - 22) { b.down = true; const o = b.last || null; if (o) addPts(o, 150, b.x, b.y, '#7fd8b0'); }
  const st = B.filter((b) => b.kind === 'botella' && !b.dead && !b.down);
  if (!st.length) { rebuildT += dt; if (rebuildT > 1.6) { rebuildT = 0; B = B.filter((b) => b.kind !== 'botella'); for (const bx of [250, 420, 590]) bottleStack(bx); k.sfx('start'); } } else rebuildT = 0;
  // jugadores
  for (const pl of P) {
    pl.cool = Math.max(0, pl.cool - dt); pl.kick = Math.max(0, pl.kick - dt * 4);
    if (pl.rl > 0) { pl.rl -= dt; if (pl.rl <= 0) { pl.ammo = 6; k.sfx('click'); } }
    if (pl.cpu) {
      pl.think -= dt;
      if (pl.think <= 0 && pl.ammo > 0 && pl.cool <= 0) {
        pl.think = lerp(1.15, 0.42, skill()) + Math.random() * 0.3;
        const tg = pickTarget(pl); if (tg) { const err = (1 - skill()) * 40, [an] = aimLead(pl, { x: tg.x + (Math.random() - 0.5) * err, y: tg.y + (Math.random() - 0.5) * err, vx: tg.vx }); shoot(pl, an, 1); }
      }
      continue;
    }
    const d = k.pdir(pl.p); let mx = d.x, my = d.y;
    if (!k.party && k.ptr.down) { pl.tx = k.ptr.x; pl.ty = clamp(k.ptr.y, TOPB + 10, GY - 30); mx = my = 0; }
    else { pl.tx = clamp((pl.tx || pl.x) + mx * 420 * dt, 30, W - 30); pl.ty = clamp((pl.ty || GY - 150) + my * 380 * dt, TOPB + 10, GY - 30); }
    if (k.phit(pl.p, 'a') || (!k.party && (k.ptr.hit || k.hit.has('a')))) shoot(pl, aimAt(pl, pl.tx, pl.ty), 1);
    if (k.phit(pl.p, 'b') && pl.ammo < 6 && pl.rl <= 0) pl.rl = 0.9;
  }
  if (shakeQ > 0) { k.shake(shakeQ); shakeQ = 0; }
}
function pickTarget(pl) {
  let best = null, bv = 1e9;
  for (const d of ducks) if (d.alive) { const v = Math.abs(d.x - pl.x) + (2 - d.r) * 40; if (v < bv) { bv = v; best = { x: d.x, y: d.y, vx: d.dir * d.sp }; } }
  for (const s of stars) if (!s.got) { best = { x: s.x, y: s.y, vx: 0 }; break; }
  if (!best) { const b = B.find((q) => q.kind === 'botella' && !q.down); if (b) best = { x: b.x, y: b.y, vx: 0 }; }
  return best;
}

/* ================= Bucle ================= */
function reset() { t = 0; PR = []; shakeQ = 0; if (M === 'caseta') resetCaseta(); else resetFrutas(); }
reset(); k.show(CFG.title, CFG.help);
k.onParty = () => { if (M !== 'caseta') return; if (k.st !== 'play' || !P.length) reset(); else syncPlayers(); };
k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt; if (msgT > 0) msgT -= dt; if (hintT > 0) hintT -= dt;
  if (M === 'caseta') updCaseta(dt); else updFrutas(dt);
}, draw);

/* ================= Dibujo ================= */
const GRASS = mkCv(W, H - GY + 8, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, H - GY + 8); gr.addColorStop(0, M === 'caseta' ? '#4a3a6a' : '#5cb85a'); gr.addColorStop(1, M === 'caseta' ? '#2a2044' : '#3d8e46');
  g.fillStyle = gr; g.fillRect(0, 0, W, H - GY + 8);
  g.fillStyle = 'rgba(26,21,48,.35)'; g.fillRect(0, 0, W, 4);
  for (let i = 0; i < 160; i++) { const x = rs(i) * W, y = 6 + rs(i + 9) * (H - GY - 6); g.fillStyle = M === 'caseta' ? 'rgba(255,255,255,.07)' : 'rgba(30,90,40,.4)'; g.fillRect(x, y, 2, 5); }
});
function drawBlock(b) {
  const m = MAT[b.mat], dmg = 1 - b.hp / b.max;
  c.save(); c.translate(b.x, b.y); c.rotate(b.tilt);
  c.fillStyle = 'rgba(20,12,40,.25)'; ART.rr(c, -b.hw + 2, -b.hh + 3, b.hw * 2, b.hh * 2, 4); c.fill();
  ART.rr(c, -b.hw, -b.hh, b.hw * 2, b.hh * 2, 4);
  const gr = c.createLinearGradient(-b.hw, -b.hh, b.hw, b.hh); gr.addColorStop(0, lite(b.col, 0.25)); gr.addColorStop(1, dark(b.col, 0.22));
  c.fillStyle = gr; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
  if (b.mat === 'madera') { c.strokeStyle = alpha('#6b4020', 0.45); c.lineWidth = 1.2; for (let i = 1; i < 4; i++) { const q = -b.hh + (b.hh * 2 * i) / 4; c.beginPath(); c.moveTo(-b.hw + 2, q); c.lineTo(b.hw - 2, q + 1); c.stroke(); } }
  else if (b.mat === 'piedra') { c.fillStyle = 'rgba(26,21,48,.22)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-b.hw + rs(b.seed + i) * b.hw * 2, -b.hh + rs(b.seed + i + 5) * b.hh * 2, 1.8, 0, TAU); c.fill(); } }
  else if (b.mat === 'hielo') { c.fillStyle = 'rgba(255,255,255,.35)'; ART.rr(c, -b.hw + 2.5, -b.hh + 2.5, b.hw * 0.7, b.hh * 1.1, 2); c.fill(); }
  if (dmg > 0.25) { c.strokeStyle = alpha('#1a1530', 0.55); c.lineWidth = 1.5; for (let i = 0; i < 2 + (dmg > 0.6 ? 2 : 0); i++) { const sx = -b.hw + rs(b.seed * 3 + i) * b.hw * 2, sy = -b.hh + rs(b.seed * 7 + i) * b.hh * 2; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 4 - rs(i) * 8, sy + 6); c.lineTo(sx + 1, sy + 11); c.stroke(); } }
  if (b.fl > 0) { c.fillStyle = `rgba(255,255,255,${b.fl * 2})`; ART.rr(c, -b.hw, -b.hh, b.hw * 2, b.hh * 2, 4); c.fill(); }
  c.restore();
}
function drawBottle(b) {
  c.save(); c.translate(b.x, b.y); c.rotate(b.tilt + (b.down ? 1.45 : 0));
  const w = b.hw * 2, h = b.hh * 2;
  c.beginPath(); c.moveTo(-w / 2, h / 2); c.lineTo(-w / 2, -h / 6); c.quadraticCurveTo(-w / 2, -h / 3, -w / 6, -h / 2.4);
  c.lineTo(-w / 6, -h / 2); c.lineTo(w / 6, -h / 2); c.lineTo(w / 6, -h / 2.4); c.quadraticCurveTo(w / 2, -h / 3, w / 2, -h / 6); c.lineTo(w / 2, h / 2); c.closePath();
  const gr = c.createLinearGradient(-w / 2, 0, w / 2, 0); gr.addColorStop(0, lite('#7fd8b0', 0.3)); gr.addColorStop(0.55, '#5fbf95'); gr.addColorStop(1, dark('#7fd8b0', 0.3));
  c.fillStyle = gr; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = '#ff6fb5'; ART.rr(c, -w / 6 - 1, -h / 2 - 3, w / 3 + 2, 4, 1.5); c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-w / 2 + 2.5, -h / 5, 2.2, h / 2.2);
  if (b.fl > 0) { c.fillStyle = `rgba(255,255,255,${b.fl * 2})`; ART.rr(c, -w / 2, -h / 2, w, h, 3); c.fill(); }
  c.restore();
}
const VCOL = { tomate: ['#ff5a4d', '#c22f2a'], berenjena: ['#8f5ad6', '#5c2f94'], brocoli: ['#57b85a', '#2f7a3a'], pimiento: ['#ffc94d', '#d99a12'] };
function drawVeg(b) {
  const col = VCOL[b.veg] || VCOL.tomate, hurtF = 1 - b.hp / b.max;
  c.save(); c.translate(b.x, b.y); c.rotate(b.tilt);
  ART.shadow(c, 0, b.hh + 1, 13, 0.25);
  const gr = c.createLinearGradient(-12, -14, 10, 14); gr.addColorStop(0, lite(col[0], 0.28)); gr.addColorStop(1, col[1]);
  if (b.veg === 'berenjena') { c.beginPath(); c.ellipse(0, 1, 12, 16, 0, 0, TAU); }
  else if (b.veg === 'brocoli') { c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.arc(Math.cos(a) * 7, Math.sin(a) * 6 - 2, 7.5, 0, TAU); } }
  else if (b.veg === 'pimiento') { c.beginPath(); c.moveTo(-13, -4); c.quadraticCurveTo(-11, 16, 0, 15); c.quadraticCurveTo(12, 15, 13, -4); c.quadraticCurveTo(6, -14, 0, -12); c.quadraticCurveTo(-7, -14, -13, -4); c.closePath(); }
  else { c.beginPath(); c.arc(0, 1, 15, 0, TAU); }
  c.fillStyle = gr; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
  c.strokeStyle = '#3f8f45'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -13); c.lineTo(0, -19); c.stroke();
  c.beginPath(); c.ellipse(-5, -17, 6, 3, -0.5, 0, TAU); c.ellipse(5, -17, 6, 3, 0.5, 0, TAU); ART.fillOut(c, '#4fae5a', 1.8);
  ART.eyes(c, 0, -2, 2.6);
  c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath();
  if (hurtF > 0.4) c.arc(0, 9, 4, Math.PI + 0.4, -0.4); else c.arc(0, 6, 4, 0.3, Math.PI - 0.3);
  c.stroke();
  if (b.fl > 0) { c.fillStyle = `rgba(255,255,255,${b.fl * 2})`; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.fill(); }
  c.restore();
}
function drawFruit(x, y, kind, s, ang) {
  const f = FR[kind]; c.save(); c.translate(x, y); c.rotate(ang || 0); c.scale(s || 1, s || 1);
  if (kind === 'cereza') { c.strokeStyle = '#4f8f3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-3, -6); c.quadraticCurveTo(0, -13, 4, -8); c.stroke();
    c.beginPath(); c.arc(-4, 1, 6, 0, TAU); ART.fillOut(c, '#ff4d6d', 2.2); c.beginPath(); c.arc(4, 3, 6, 0, TAU); ART.fillOut(c, '#e0304f', 2.2); }
  else if (kind === 'sandia') { c.beginPath(); c.arc(0, 0, 17, 0, TAU); ART.fillOut(c, '#4fb14f', 2.6); c.strokeStyle = '#2f7a3a'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, 0, 17, i * 1.57 - 0.35, i * 1.57 + 0.35); c.stroke(); } }
  else if (kind === 'kiwi') { c.beginPath(); c.ellipse(0, 0, 11, 9, 0, 0, TAU); ART.fillOut(c, '#8fbf3f', 2.2); c.fillStyle = '#d9f0a8'; c.beginPath(); c.ellipse(0, 0, 5, 4, 0, 0, TAU); c.fill(); c.fillStyle = OUT; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(Math.cos(i) * 5.5, Math.sin(i) * 4.5, 0.9, 0, TAU); c.fill(); } }
  else { c.beginPath(); c.arc(0, 0, 12, 0, TAU); ART.fillOut(c, '#ffa23d', 2.4); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-4, -4, 4, 2.5, -0.6, 0, TAU); c.fill(); c.strokeStyle = '#4f8f3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -11); c.lineTo(2, -15); c.stroke(); }
  c.restore();
}
function drawSling() {
  const bx = SX, by = GY;
  c.strokeStyle = '#8b5a2b'; c.lineWidth = 9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, SY + 16); c.stroke();
  c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, SY + 16); c.stroke();
  const arm = (sd) => { c.strokeStyle = '#8b5a2b'; c.lineWidth = 8; c.beginPath(); c.moveTo(bx, SY + 16); c.lineTo(bx + sd * 13, SY - 8); c.stroke(); };
  arm(-1); arm(1);
  const pulling = (!flying && (dragging || charging || pw > 0.02)), px = pulling ? bx - Math.cos(aim) * pw * 46 : bx, py = pulling ? SY + Math.sin(aim) * pw * 46 : SY - 6;
  c.strokeStyle = '#4a3324'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(bx - 13, SY - 8); c.lineTo(px, py); c.lineTo(bx + 13, SY - 8); c.stroke();
  if (!flying && shotIdx < ammo.length) drawFruit(px, py, ammo[shotIdx], 1, 0);
}
function drawTraj() {
  if (flying || shotIdx >= ammo.length) return;
  const power = dragging || charging ? pw : 0.55, sp = 330 + power * 620;
  let x = SX, y = SY, vx = Math.cos(aim) * sp, vy = -Math.sin(aim) * sp;
  c.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 34; i++) { for (let s = 0; s < 3; s++) { vy += G * 0.82 / 60; x += vx / 60; y += vy / 60; } if (y > GY || x > W) break; if (i % 2) continue; c.globalAlpha = 0.65 - i / 60; c.beginPath(); c.arc(x, y, 3 - i * 0.05, 0, TAU); c.fill(); }
  c.globalAlpha = 1;
}
function drawFeria() {
  // caseta de feria: toldo de rayas, postes y guirnaldas
  c.fillStyle = '#2a1e4a'; c.fillRect(0, 0, W, GY);
  for (let i = 0; i < 26; i++) { c.fillStyle = i % 2 ? alpha('#ff6fb5', 0.9) : alpha('#ffe9f4', 0.9); c.beginPath(); c.moveTo(i * 30, TOPB); c.lineTo(i * 30 + 30, TOPB); c.lineTo(i * 30 + 30, TOPB + 22); c.lineTo(i * 30 + 15, TOPB + 30); c.lineTo(i * 30, TOPB + 22); c.closePath(); c.fill(); }
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, TOPB + 34); c.quadraticCurveTo(W / 2, TOPB + 54, W, TOPB + 34); c.stroke();
  for (let i = 0; i < 16; i++) { const q = i / 15, x = q * W, y = TOPB + 34 + Math.sin(q * Math.PI) * 20; c.beginPath(); c.arc(x, y + 5, 4, 0, TAU); c.fillStyle = ['#ffc94d', '#5b8cff', '#a8cf3f', '#ff6fb5'][i % 4]; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke(); }
  for (const y of DUCKY) { c.fillStyle = 'rgba(26,21,48,.45)'; c.fillRect(0, y + 17, W, 6); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(0, y + 15, W, 2); }
}
function drawDuck(d) {
  c.save(); c.translate(d.x, d.y + d.fall * 26); c.scale(d.dir, 1); if (!d.alive) c.rotate(d.fall * 1.5);
  c.globalAlpha = d.alive ? 1 : Math.max(0, 1 - d.fall);
  c.beginPath(); c.ellipse(0, 2, 17, 11, 0, 0, TAU); ART.fillOut(c, '#ffc94d', 2.4);
  c.beginPath(); c.moveTo(-6, -2); c.quadraticCurveTo(-18, -6, -14, 4); c.quadraticCurveTo(-10, 6, -6, 2); c.closePath(); ART.fillOut(c, '#f0ae2a', 2);
  c.beginPath(); c.arc(11, -8, 8, 0, TAU); ART.fillOut(c, '#ffd869', 2.4);
  c.beginPath(); c.moveTo(17, -8); c.lineTo(26, -5); c.lineTo(17, -2); c.closePath(); ART.fillOut(c, '#ff8a3d', 2);
  c.fillStyle = OUT; c.beginPath(); c.arc(13, -10, 1.8, 0, TAU); c.fill();
  c.restore();
}
function drawGun(pl, i) {
  const y = GY - 8; c.save(); c.translate(pl.x, y);
  ART.shadow(c, 0, 8, 16, 0.3);
  const ang = pl.cpu ? -0.7 : Math.atan2((GY - 12) - (pl.ty || GY - 150), (pl.tx || pl.x + 60) - pl.x) * -1;
  c.save(); c.rotate(-ang + pl.kick * 0.6);
  ART.rr(c, -4, -6, 40, 9, 3); ART.fillOut(c, dark(pl.col, 0.15), 2.2);
  ART.rr(c, 26, -4, 12, 5, 2); ART.fillOut(c, '#c9c6d8', 1.8); c.restore();
  ART.rr(c, -12, -12, 24, 22, 6); ART.fillOut(c, pl.col, 2.6);
  c.fillStyle = 'rgba(255,255,255,.25)'; ART.rr(c, -9, -9, 8, 14, 3); c.fill();
  c.restore();
}
function drawCross(pl) {
  const x = pl.tx || pl.x, y = pl.ty || GY - 150;
  c.save(); c.translate(x, y); c.strokeStyle = OUT; c.lineWidth = 4.5;
  c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.stroke(); c.strokeStyle = pl.col; c.lineWidth = 2.6; c.stroke();
  c.beginPath(); c.moveTo(-19, 0); c.lineTo(-6, 0); c.moveTo(6, 0); c.lineTo(19, 0); c.moveTo(0, -19); c.lineTo(0, -6); c.moveTo(0, 6); c.lineTo(0, 19); c.strokeStyle = OUT; c.lineWidth = 4.5; c.stroke(); c.strokeStyle = pl.col; c.lineWidth = 2.4; c.stroke();
  c.restore();
}
function draw() {
  ART.background(c, TH, W, H, 0, 0, t);
  if (M === 'caseta') drawFeria();
  c.drawImage(GRASS, 0, GY - 8, W, H - GY + 8);
  for (const b of B) { if (b.dead) continue; if (b.kind === 'verdura') drawVeg(b); else if (b.kind === 'botella') drawBottle(b); else if (b.kind === 'balda') { c.fillStyle = '#6b4329'; ART.rr(c, b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2, 3); ART.fillOut(c, '#8b5a2b', 2.4); } else drawBlock(b); }
  if (M === 'frutas') {
    if (trail.length > 2) { c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(trail[0][0], trail[0][1]); for (const q of trail) c.lineTo(q[0], q[1]); c.stroke(); c.setLineDash([]); }
    drawTraj(); drawSling();
    for (const p of PR) drawFruit(p.x, p.y, p.fruit || 'naranja', 1, p.life * 7);
    hudFrutas();
  } else {
    for (const d of ducks) drawDuck(d);
    for (const s of stars) if (!s.got) { c.save(); c.translate(s.x, s.y); c.rotate(Math.sin(s.ph * 2) * 0.3); ART.glint(c, 0, 0, 17, '#ffc94d'); c.beginPath(); c.arc(0, 0, 8, 0, TAU); ART.fillOut(c, '#ffe9a8', 2.2); c.restore(); }
    for (const p of PR) { c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); ART.fillOut(c, '#e8e6f2', 1.8); }
    P.forEach(drawGun); for (const pl of P) if (!pl.cpu) drawCross(pl);
    hudCaseta();
  }
  if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); const [mt, ms] = fit(msg, W - 90, 22, 13), mw = tw(mt, ms) + 40;
    ART.rr(c, W / 2 - mw / 2, H / 2 - 32, mw, 46, 14); c.fillStyle = 'rgba(26,21,48,.88)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    label(mt, W / 2, H / 2 - 9, ms, '#ffc94d', 'center', 'middle'); c.globalAlpha = 1; }
}
function bar() { c.fillStyle = M === 'caseta' ? 'rgba(16,12,36,.92)' : 'rgba(16,12,36,.72)'; c.fillRect(0, 0, W, TOPB); c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(0, TOPB - 2, W, 2); }
function hudFrutas() {
  bar();
  label(`${score}`, 12, 15, 20, '#fff', 'left', 'middle');
  label(`Récord ${Math.max(bestSc, score)}`, 12, 34, 11, 'rgba(255,255,255,.72)', 'left', 'middle');
  const veg = vegs.filter((v) => !v.dead).length, mid = `Nivel ${level}`;
  label(mid, W / 2, 15, 17, '#a097ff', 'center', 'middle');
  label(`${veg} verdura${veg === 1 ? '' : 's'}`, W / 2, 34, 11, 'rgba(255,255,255,.72)', 'center', 'middle');
  const left = ammo.length - shotIdx, step = Math.min(30, (W / 2 - 60) / Math.max(1, ammo.length));
  for (let i = 0; i < ammo.length; i++) { c.globalAlpha = i < left ? 1 : 0.22; drawFruit(W - 22 - i * step, 23, ammo[ammo.length - 1 - i], Math.min(0.72, step / 42), 0); c.globalAlpha = 1; }
  if (!flying && (dragging || charging)) { const bw = 120; ART.rr(c, SX - bw / 2, GY + 12, bw, 9, 4); c.fillStyle = 'rgba(16,12,36,.8)'; c.fill(); ART.rr(c, SX - bw / 2 + 2, GY + 14, Math.max(4, (bw - 4) * pw), 5, 2); c.fillStyle = pw > 0.85 ? '#ff6fb5' : '#a8cf3f'; c.fill(); }
  if (hintT > 0 && !flying) { c.globalAlpha = Math.min(1, hintT); label('Arrastra hacia atrás y suelta', SX + 40, SY - 56, 15, '#ffc94d', 'left', 'middle'); c.globalAlpha = 1; }
  if (flying && !usedAb) { const ab = { cereza: 'divide', naranja: 'acelera', sandia: 'aplasta', kiwi: 'rebota' }[flying.fruit]; label(`Toca: ${ab}`, W / 2, H - 22, 14, '#ffc94d', 'center', 'middle'); }
}
function hudCaseta() {
  bar();
  const n = Math.max(1, P.length), avail = W - 96, cw = Math.min(170, avail / n);
  P.forEach((pl, i) => {
    const x = 10 + i * cw, inner = cw - 22;
    c.fillStyle = pl.col; ART.rr(c, x, 8, 11, 11, 3); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    const [nm, ns] = fit(String(pl.name), inner, 12, 9);
    label(nm, x + 16, 14, ns, '#fff', 'left', 'middle');
    const [sc, ss] = fit(`${pl.sc}`, inner, 15, 10);
    label(sc, x + 16, 30, ss, pl.col, 'left', 'middle');
    const ad = Math.min(8, inner / 7);
    for (let a = 0; a < 6; a++) { c.beginPath(); c.arc(x + 17 + a * ad, 41, Math.min(2.6, ad / 3), 0, TAU); c.fillStyle = a < pl.ammo ? '#e8e6f2' : 'rgba(255,255,255,.2)'; c.fill(); }
  });
  const s = Math.ceil(time);
  label(`${s}`, W - 14, 22, 24, s <= 10 && Math.floor(t * 4) % 2 ? '#ff6fb5' : '#fff', 'right', 'middle');
}
