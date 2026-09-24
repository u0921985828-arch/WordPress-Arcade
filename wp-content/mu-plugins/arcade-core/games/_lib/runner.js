/* Runners de un botón con arte propio (ART). CFG.mode: 'flap' | 'jump' | 'double' | 'gravity' | 'cave'; CFG.theme (ART.THEMES), CFG.pal (cueva).
 * Mundo en coordenadas absolutas (cam = distancia recorrida); casilla T = 32 px. */
const M = CFG.mode, port = M === 'flap', cave = M === 'cave', grav0 = M === 'gravity', dbl = M === 'double';
const TH = ART.THEMES[CFG.theme || (port ? 'meadow' : 'jungle')], OUT = ART.OUT, PAL = CFG.pal || ['#5ce1e6', '#ff5fa2', '#3b2a55'];
const W = port ? 360 : 640, H = port ? 640 : 360, T = 32;
const k = Kit({ w: W, h: H, title: CFG.title, bg: cave ? '#120c20' : TH.sky[0] }), c = k.ctx;
const FLOOR = H - 64, CEIL = 64, PX = port ? 110 : 150;
const G = 1500, JUMP = 560, JUMP2 = 520, CUT = 200, COYOTE = 0.08, BUFFER = 0.12;
let p, obs, coins, holes, decos, cav, bullets, rings, t, cam, speed, bonus, got, nx, jumps, grav, gs, dead, hover, coy, buf, sq, passed, mines, wing;
function reset() {
  p = { y: port || cave ? H / 2 : FLOOR - 28, vy: 0, w: 18, h: 28, on: true, rot: 0 };
  obs = []; coins = []; holes = []; decos = []; bullets = []; rings = []; cav = [];
  t = 0; cam = 0; speed = port ? 150 : cave ? 240 : 260; bonus = 0; got = 0; jumps = 0; grav = 1; gs = 1; dead = 0; hover = port || cave; coy = 0; buf = 0; sq = 0; passed = 0; mines = 0; wing = 0;
  nx = port ? W + 60 : cave ? W : 22;
  if (cave) for (let x = -40; x <= W + 60; x += 20) cav.push({ x, top: 60, bot: H - 60, cr: Math.random() < 0.1 });
  if (!port && !cave) for (let i = 1; i < 20; i += k.ri(3, 6)) decos.push({ x: i * T + 16, s: Math.random() });
}
reset(); k.show(CFG.title, CFG.help);
const act = () => k.hit.has('a') || k.hit.has('up') || k.ptr.hit;
const held = () => k.held.has('a') || k.held.has('up') || k.ptr.down;
const holeAt = (i) => holes.some((h) => i >= h.a && i < h.b);
const metres = () => Math.floor(cam / T);
const total = () => port ? passed + got : metres() + got * 5 + bonus;
function die() {
  if (dead) return; dead = 0.9; p.vy = port ? -300 : grav0 ? -380 * grav : -420; k.sfx('hurt'); k.shake(8); k.flash('rgba(255,70,90,.35)');
  k.burst(PX + p.w / 2, p.y + (port || cave ? 0 : p.h / 2), '#fff', 22, 240);
}
function finish() {
  const extra = port ? `${passed} troncos · ${got} monedas` : cave ? `${metres()} m · ${mines} minas` : `${metres()} m · ${got} monedas`;
  k.lose(CFG.id, total(), 'Fin', extra);
}
/* ---------- Generación de tramos (jump / double / gravity) ---------- */
function spikes(at, n, top) { for (let i = 0; i < n; i++) obs.push({ k: 'spike', x: (at + i) * T, top }); }
function coinArc(at, n, hgt, base) { for (let i = 0; i < n; i++) coins.push({ x: (at + i + 0.5) * T, y: (base || FLOOR - 26) - Math.sin((i + 0.5) / n * Math.PI) * hgt }); }
function pattern() {
  const x0 = nx, lvl = Math.min(1, t / 80); let len = 1;
  if (grav0) {
    const top = Math.random() < 0.5, n = k.ri(1, 2 + Math.round(lvl * 2));
    spikes(x0, n, top); for (let i = 0; i < n; i++) coins.push({ x: (x0 + i + 0.5) * T, y: top ? FLOOR - 16 : CEIL + 16 });
    len = n; if (Math.random() < 0.3 + lvl * 0.3) { const g = Math.ceil(speed * 0.75 / T) + 1, m = k.ri(1, 3); spikes(x0 + n + g, m, !top); len += g + m; }
  } else {
    const r = Math.random();
    if (r < 0.26) { const n = k.ri(1, dbl ? 4 : 2 + (lvl > 0.3)); spikes(x0, n); coinArc(x0 - 1, n + 2, 70 + n * 8); len = n; }
    else if (r < 0.46) {
      const hgt = Math.random() < 0.3 + lvl * 0.35 ? 2 : 1, n = k.ri(1, 3), tail = Math.random() < 0.3 + lvl * 0.3 ? k.ri(1, 2) : 0;
      for (let i = 0; i < n; i++) { for (let j = 0; j < hgt; j++) obs.push({ k: 'crate', x: (x0 + i) * T, y: FLOOR - (j + 1) * T }); coins.push({ x: (x0 + i + 0.5) * T, y: FLOOR - hgt * T - 22 }); }
      spikes(x0 + n, tail); len = n + tail;
    } else if (r < 0.64) { const n = k.ri(2, dbl ? 5 : Math.min(4, 2 + Math.floor(speed / 150))); holes.push({ a: x0, b: x0 + n }); coinArc(x0 - 1, n + 2, 90); len = n; }
    else if (r < 0.82) {
      const high = dbl && Math.random() < 0.45, kind = TH.enemy;
      obs.push({ k: 'foe', x: (x0 + 2) * T, y: high ? FLOOR - 96 : FLOOR - 26, w: 28, h: 26, vx: high ? -30 : -60, kind, ph: Math.random() * 6 });
      if (high) coinArc(x0, 5, 0, FLOOR - 20); len = 3;
    } else { const n = k.ri(5, 8), mid = Math.random() < 0.4 + lvl * 0.3; for (let i = 0; i < n; i++) coins.push({ x: (x0 + i + 0.5) * T, y: mid && Math.abs(i - n / 2) < 1 ? FLOOR - 90 : FLOOR - 20 }); if (mid) spikes(x0 + Math.floor(n / 2) - 1, 2); len = n; }
  }
  if (!grav0 && Math.random() < 0.5) decos.push({ x: (x0 + len + 2) * T + 16, s: Math.random() });
  nx = x0 + len + Math.ceil(speed * k.rnd(0.6, 1.05) / T) + 2;
}
/* ---------- Actualización ---------- */
k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt; wing += dt * (port && p.vy < 0 ? 26 : 9); sq *= Math.pow(0.001, dt);
  for (const r of rings) r.t += dt; rings = rings.filter((r) => r.t < 0.35);
  if (dead) { dead -= dt; p.vy += (grav0 ? G * grav : 1300) * dt; p.y += p.vy * dt; p.rot += dt * 9; if (dead <= 0) finish(); return; }
  if (hover) { if (act() || held()) hover = false; else { p.y = H / 2 + Math.sin(t * 4) * 8; p.vy = 0; cam += 60 * dt; return; } }
  const px = cam + PX;
  if (port) {
    speed = Math.min(230, 150 + passed * 1.5);
    if (act()) { p.vy = -380; k.sfx('jump'); }
    p.vy += 1200 * dt; p.y += p.vy * dt; if (p.y < 14) { p.y = 14; p.vy = 0; }
    p.rot = k.clamp(p.vy / 650, -0.45, 1.3);
    if (p.y + 12 > FLOOR) { p.y = FLOOR - 12; return die(); }
    if (nx < cam + W + 80) {
      const gap = Math.max(138, 190 - passed * 1.6), y = k.rnd(90, FLOOR - 70 - gap);
      obs.push({ k: 'log', x: nx, gy: y, gap, mv: passed > 12 ? Math.min(45, (passed - 10) * 2) * (Math.random() < 0.5 ? -1 : 1) : 0, ph: Math.random() * 6 });
      if (Math.random() < 0.55) coins.push({ x: nx + 64 + 73, y: y + gap / 2 + k.rnd(-30, 30) });
      nx += 210;
    }
  } else if (cave) {
    speed = Math.min(420, speed + dt * 5);
    const hold = held(); p.vy += (hold ? -900 : 700) * dt; p.vy = k.clamp(p.vy, -300, 350); p.y += p.vy * dt; p.thr = hold;
    while (cav[cav.length - 1].x < cam + W + 40) { const l = cav[cav.length - 1], gap = Math.max(130, 220 - t * 2), top = k.clamp(l.top + k.rnd(-24, 24), 20, H - gap - 20); cav.push({ x: l.x + 20, top, bot: top + gap, cr: Math.random() < 0.1 }); }
    while (cav[1].x < cam - 40) cav.shift();
    const s = cav.find((q) => q.x <= px && q.x + 20 > px); if (s && (p.y - 8 < s.top || p.y + 8 > s.bot)) return die();
    if (Math.floor(t * 5) !== Math.floor((t - dt) * 5)) bullets.push({ x: px + 16, y: p.y });
    for (const b of bullets) b.x += (speed + 520) * dt;
    if (nx < cam + W + 40) {
      const l = cav[cav.length - 1]; obs.push({ k: 'mine', x: nx, y: k.rnd(l.top + 24, l.bot - 24), hp: 2, hit: 0, ph: Math.random() * 6 });
      if (Math.random() < 0.45) coins.push({ x: nx + 120, y: (l.top + l.bot) / 2, gem: true });
      nx += speed * k.rnd(1, 2);
    }
  } else {
    speed = Math.min(grav0 ? 460 : 520, speed + dt * 5);
    while (nx * T < cam + W + 120) pattern();
    if (grav0) {
      coy = p.on ? COYOTE : coy - dt; buf = act() ? BUFFER : buf - dt;
      if (buf > 0 && coy > 0) { grav *= -1; buf = 0; coy = 0; p.on = false; k.sfx('jump'); rings.push({ x: PX + p.w / 2, y: p.y + p.h / 2, t: 0 }); }
      p.vy = k.clamp(p.vy + G * 1.1 * grav * dt, -720, 720); p.y += p.vy * dt;
      const was = p.on; p.on = false;
      if (p.y + p.h >= FLOOR) { p.y = FLOOR - p.h; p.vy = 0; p.on = grav > 0; }
      if (p.y <= CEIL) { p.y = CEIL; p.vy = 0; p.on = grav < 0; }
      if (p.on && !was) { sq = 0.22; k.burst(PX + p.w / 2, grav > 0 ? FLOOR : CEIL, 'rgba(255,255,255,.7)', 5, 70); }
    } else {
      coy = p.on ? COYOTE : coy - dt; buf = act() ? BUFFER : buf - dt;
      if (buf > 0 && coy > 0) { p.vy = -JUMP; jumps = 1; buf = 0; coy = 0; p.on = false; sq = -0.2; k.sfx('jump'); k.burst(PX + p.w / 2, p.y + p.h, 'rgba(255,255,255,.8)', 5, 80); }
      else if (dbl && act() && !p.on && jumps < 2) { p.vy = -JUMP2; jumps = 2; buf = 0; k.sfx('jump'); rings.push({ x: PX + p.w / 2, y: p.y + p.h, t: 0 }); }
      if (!held() && p.vy < -CUT) p.vy = -CUT;
      p.vy += G * dt;
      const feet = p.y + p.h; let sup = Infinity;
      if (feet <= FLOOR + 6 && (!holeAt(Math.floor((px + 3) / T)) || !holeAt(Math.floor((px + p.w - 3) / T)))) sup = FLOOR;
      else if (feet > FLOOR + 4 && !holeAt(Math.floor((px + p.w) / T))) return die();
      for (const o of obs) if (o.k === 'crate' && o.x < px + p.w - 2 && o.x + T > px + 2 && o.y >= feet - 6) sup = Math.min(sup, o.y);
      const ny = p.y + p.vy * dt, was = p.on;
      if (p.vy >= 0 && ny + p.h >= sup) { p.y = sup - p.h; p.vy = 0; p.on = true; jumps = 0; if (!was) { sq = 0.25; k.burst(PX + p.w / 2, sup, 'rgba(255,255,255,.7)', 5, 70); } }
      else { p.y = ny; p.on = false; if (was && jumps === 0 && dbl) jumps = 1; }
      if (p.y > H + 40) { dead = 0.35; k.sfx('hurt'); return; }
    }
  }
  cam += speed * dt;
  /* colisiones y recogidas */
  const bx = cam + PX, by = port || cave ? p.y - 11 : p.y, bw = port || cave ? 22 : p.w, bh = port || cave ? 22 : p.h, ox = port || cave ? bx - 11 : bx;
  const hitBox = (x, y, w, h) => ox + bw > x && ox < x + w && by + bh > y && by < y + h;
  for (const o of obs) {
    if (o.dead) continue;
    if (o.k === 'log') {
      o.top = k.clamp(o.gy + Math.sin(t * 1.6 + o.ph) * o.mv, 50, FLOOR - 60 - o.gap);
      if (!o.scored && o.x + 64 < bx - 12) { o.scored = true; passed++; k.sfx('coin'); }
      const cx = bx, cy = p.y, r = 11, inR = (x, y, w, h) => { const qx = k.clamp(cx, x, x + w), qy = k.clamp(cy, y, y + h); return (cx - qx) ** 2 + (cy - qy) ** 2 < r * r; };
      if (inR(o.x + 5, -40, 54, o.top + 43) || inR(o.x + 5, o.top + o.gap - 3, 54, FLOOR - o.top - o.gap + 3)) return die();
    } else if (o.k === 'spike') { if (o.top ? hitBox(o.x + 7, CEIL, 18, 18) : hitBox(o.x + 7, FLOOR - 18, 18, 18)) return die(); }
    else if (o.k === 'crate') { if (ox + bw - 3 > o.x && ox + 3 < o.x + T && by + bh - 4 > o.y && by + 3 < o.y + T) return die(); }
    else if (o.k === 'foe') {
      o.x += o.vx * dt; const fy = o.y + (o.y < FLOOR - 40 ? Math.sin(t * 3 + o.ph) * 10 : 0);
      if (hitBox(o.x + 3, fy + 4, o.w - 6, o.h - 4)) {
        if (p.vy > 0 && p.y + p.h - fy < 14) { o.dead = true; p.vy = -460; jumps = dbl ? 1 : jumps; bonus += 10; k.burst(o.x - cam + 14, fy + 12, '#fff', 16); k.float('+10', o.x - cam + 14, fy - 8, '#ffc928'); k.sfx('hit'); }
        else return die();
      }
    } else if (o.k === 'mine') {
      if (o.hit > 0) o.hit -= dt;
      for (const b of bullets) if (!b.dead && Math.abs(b.x - o.x) < 16 && Math.abs(b.y - o.y) < 16) { b.dead = true; o.hit = 0.1; if (--o.hp <= 0) { o.dead = true; mines++; bonus += 25; k.burst(o.x - cam, o.y, '#ff6b6b', 18, 220); k.burst(o.x - cam, o.y, '#ffc928', 8, 120); k.float('+25', o.x - cam, o.y - 14, '#ffc928'); k.sfx('explode'); k.shake(3); } else k.sfx('hit'); }
      if (!o.dead && (bx - o.x) ** 2 + (p.y - o.y) ** 2 < 22 * 22) return die();
    }
  }
  for (const co of coins) if (!co.got && Math.abs(co.x - (port || cave ? bx : bx + p.w / 2)) < 20 && Math.abs(co.y - (port || cave ? p.y : p.y + p.h / 2)) < 24) {
    co.got = true; got++; if (co.gem) bonus += 10; k.sfx('coin'); k.burst(co.x - cam, co.y, co.gem ? PAL[1] : '#ffc928', 7, 90);
  }
  obs = obs.filter((o) => !o.dead && o.x > cam - 120); coins = coins.filter((q) => !q.got && q.x > cam - 40);
  holes = holes.filter((h) => h.b * T > cam - 40); decos = decos.filter((d) => d.x > cam - 80); bullets = bullets.filter((b) => !b.dead && b.x < cam + W + 20);
}, draw);
/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function crate(x, y) {
  ART.rr(c, x + 1, y + 1, T - 2, T - 2, 4); ART.fillOut(c, TH.plank, 2.5);
  c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 2; c.strokeRect(x + 6, y + 6, T - 12, T - 12);
  c.beginPath(); c.moveTo(x + 7, y + T - 7); c.lineTo(x + T - 7, y + 7); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x + 5, y + 4, T - 10, 2);
}
function log(x, y0, y1, capY) {
  ART.rr(c, x + 6, y0, 52, y1 - y0, 6); ART.fillOut(c, '#a8703f', 3);
  c.fillStyle = 'rgba(0,0,0,.16)'; for (let i = 0; i < 3; i++) for (let yy = y0 + 10 + i * 13; yy < y1 - 10; yy += 38) c.fillRect(x + 18 + i * 12, yy, 3, 20);
  c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x + 11, y0 + 4, 5, Math.max(0, y1 - y0 - 8));
  c.beginPath(); c.ellipse(x + 32, capY, 31, 9, 0, 0, 6.283); ART.fillOut(c, '#f0cf96', 3);
  c.strokeStyle = '#c99a5a'; c.lineWidth = 2; c.beginPath(); c.ellipse(x + 32, capY, 19, 5.5, 0, 0, 6.283); c.stroke(); c.beginPath(); c.ellipse(x + 32, capY, 8, 2.5, 0, 0, 6.283); c.stroke();
  const d = capY > y0 + 20 ? 1 : -1; // hojas junto al corte
  for (const [lx, a] of [[x + 6, -0.6], [x + 58, 0.6]]) { c.save(); c.translate(lx, capY - d * 12); c.rotate(a * d); c.beginPath(); c.ellipse(0, 0, 10, 5, 0, 0, 6.283); ART.fillOut(c, TH.top, 2); c.restore(); }
}
function bird(x, y, rot) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath(); c.moveTo(-11, -3); c.lineTo(-21, -9); c.lineTo(-20, 5); c.closePath(); ART.fillOut(c, '#ff9a3d', 2);
  c.beginPath(); c.ellipse(0, 0, 15, 13, 0, 0, 6.283); ART.fillOut(c, '#ffd23d', 2.5);
  c.fillStyle = '#fff3c4'; c.beginPath(); c.ellipse(2, 5, 9, 6, 0, 0, 6.283); c.fill();
  c.beginPath(); c.arc(6, -4, 5.2, 0, 6.283); ART.fillOut(c, '#fff', 2); c.fillStyle = OUT; c.beginPath(); c.arc(7.6, -4, 2.4, 0, 6.283); c.fill();
  c.beginPath(); c.moveTo(12, -1); c.lineTo(22, 2.5); c.lineTo(12, 6.5); c.closePath(); ART.fillOut(c, '#ff7a2d', 2);
  const wy = Math.sin(wing); c.beginPath(); c.ellipse(-4, 2 + wy * 2, 9, 5.5, -0.2 + wy * 0.45, 0, 6.283); ART.fillOut(c, '#ffb13d', 2);
  c.restore();
}
function ship(x, y) {
  c.save(); c.translate(x, y); c.rotate(dead ? p.rot : k.clamp(p.vy / 900, -0.35, 0.35));
  if (p.thr && !dead) { c.fillStyle = '#ffb13d'; c.beginPath(); c.moveTo(-13, -4); c.lineTo(-22 - Math.random() * 9, 0); c.lineTo(-13, 4); c.fill(); c.fillStyle = '#fff6c2'; c.beginPath(); c.moveTo(-13, -2); c.lineTo(-18 - Math.random() * 4, 0); c.lineTo(-13, 2); c.fill(); }
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-4, s * 6); c.lineTo(-14, s * 15); c.lineTo(-12, s * 6); c.closePath(); ART.fillOut(c, PAL[1], 2); }
  c.beginPath(); c.moveTo(19, 0); c.quadraticCurveTo(8, -11, -14, -8); c.lineTo(-14, 8); c.quadraticCurveTo(8, 11, 19, 0); ART.fillOut(c, PAL[0], 2.5);
  c.beginPath(); c.ellipse(4, -2.5, 6, 4, 0, 0, 6.283); ART.fillOut(c, '#e9fbff', 2); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-10, -5, 10, 2);
  c.restore();
}
function mine(o, x) {
  const r = 12, blink = Math.sin(t * 6 + o.ph) > 0.3;
  c.save(); c.translate(x, o.y + Math.sin(t * 2 + o.ph) * 3); c.rotate(t * 0.8 + o.ph);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); c.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45); c.stroke(); c.strokeStyle = '#9aa0b8'; c.lineWidth = 2.5; c.stroke(); }
  c.beginPath(); c.arc(0, 0, r, 0, 6.283); ART.fillOut(c, o.hit > 0 ? '#fff' : '#5a5470', 2.5); c.rotate(-(t * 0.8 + o.ph));
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(-4, -4, 4, 0, 6.283); c.fill();
  c.beginPath(); c.arc(0, 0, 4, 0, 6.283); ART.fillOut(c, blink ? '#ff3b5c' : '#7a2233', 1.5);
  if (o.hp < 2) { c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(3, -9); c.lineTo(6, -3); c.lineTo(9, -5); c.stroke(); }
  c.restore();
}
function gem(x, y) { c.save(); c.translate(x, y + Math.sin(t * 3 + x) * 3); c.beginPath(); c.moveTo(0, -10); c.lineTo(8, -2); c.lineTo(0, 10); c.lineTo(-8, -2); c.closePath(); ART.fillOut(c, PAL[1], 2); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(0, -7); c.lineTo(3.5, -2); c.lineTo(0, -1); c.closePath(); c.fill(); c.restore(); }
function caveBg() {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1436'); g.addColorStop(0.5, '#2a1b47'); g.addColorStop(1, '#140d24'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const layer = (par, amp, base, col, seed) => { c.fillStyle = col; for (const top of [1, 0]) { c.beginPath(); c.moveTo(0, top ? 0 : H); for (let x = 0; x <= W + 20; x += 20) { const wx = x + cam * par, y = base + Math.sin(wx / 90 + seed) * amp + Math.sin(wx / 37 + seed * 2) * amp * 0.4; c.lineTo(x, top ? y : H - y); } c.lineTo(W, top ? 0 : H); c.fill(); } };
  layer(0.15, 22, 70, '#261a42', 1);
  // cristales gigantes lejanos (paralaje) con halo
  for (let i = 0; i < 5; i++) {
    const span = W + 260, x = ((i * 233 - cam * 0.22) % span + span) % span - 130, top = i % 2 === 0, h = 46 + (i * 37) % 40, y = top ? 40 : H - 40, d = top ? 1 : -1, col = PAL[i % 2];
    const hg = c.createRadialGradient(x, y + d * h * 0.5, 0, x, y + d * h * 0.5, h); hg.addColorStop(0, col + '38'); hg.addColorStop(1, col + '00'); c.fillStyle = hg; c.fillRect(x - h, y + d * h * 0.5 - h, h * 2, h * 2);
    c.globalAlpha = 0.55; for (const [ox, sc] of [[-14, 0.6], [12, 0.75], [0, 1]]) { const hh = h * sc, ww = 9 + sc * 6; c.beginPath(); c.moveTo(x + ox - ww, y - d * 6); c.lineTo(x + ox - ww * 0.7, y + d * hh * 0.75); c.lineTo(x + ox, y + d * hh); c.lineTo(x + ox + ww * 0.7, y + d * hh * 0.75); c.lineTo(x + ox + ww, y - d * 6); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = '#1a1530'; c.stroke(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + ox - 2, y + d * hh * 0.15, 2.5, d * hh * 0.55); }
    c.globalAlpha = 1;
  }
  layer(0.35, 18, 44, '#2f2150', 4);
  c.globalAlpha = 0.5; for (let i = 0; i < 14; i++) { const x = ((i * 97 - cam * 0.25) % (W + 40) + W + 40) % (W + 40) - 20, y = 90 + ((i * 53) % 180); c.fillStyle = i % 2 ? PAL[0] : PAL[1]; c.globalAlpha = 0.25 + 0.2 * Math.sin(t * 2 + i); c.fillRect(x, y, 2, 2); } c.globalAlpha = 1;
}
function caveWalls() {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a2a5c'); g.addColorStop(0.3, '#6a52a0'); g.addColorStop(0.7, '#6a52a0'); g.addColorStop(1, '#3a2a5c');
  for (const top of [true, false]) {
    const path = () => { c.beginPath(); c.moveTo(cav[0].x - cam, top ? -5 : H + 5); for (const s of cav) c.lineTo(s.x - cam, top ? s.top : s.bot); c.lineTo(cav[cav.length - 1].x - cam + 20, top ? -5 : H + 5); c.closePath(); };
    path(); c.fillStyle = g; c.fill(); c.save(); c.clip(); c.fillStyle = 'rgba(26,21,48,.28)';
    for (const s of cav) { const n = Math.floor(s.x / 20); if (n % 3) continue; const x = s.x - cam + 10, y = top ? s.top - 14 - (n % 7) * 5 : s.bot + 14 + (n % 5) * 6; c.beginPath(); c.ellipse(x, y, 7 + (n % 4), 4, 0, 0, 6.283); c.fill(); }
    c.restore(); path(); c.lineJoin = 'round'; c.lineWidth = 8; c.strokeStyle = '#9b84d6'; c.stroke(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  }
  for (const s of cav) if (s.cr) for (const top of [true, false]) {
    const x = s.x - cam + 10, y = top ? s.top : s.bot, d = top ? 1 : -1;
    c.beginPath(); c.moveTo(x - 5, y - d * 4); c.lineTo(x - 2, y + d * 7); c.lineTo(x + 2, y + d * 5); c.lineTo(x + 5, y - d * 4); c.closePath(); ART.fillOut(c, top ? PAL[0] : PAL[1], 1.5);
  }
}
function ground() {
  const i0 = Math.floor(cam / T) - 1;
  for (let i = i0; i < i0 + W / T + 3; i++) {
    if (holeAt(i)) continue; const sx = Math.round(i * T - cam), L = holeAt(i - 1), R = holeAt(i + 1);
    ART.tile(c, TH, 'ground', sx, FLOOR, T, { top: true, left: L, right: R }); ART.tile(c, TH, 'ground', sx, FLOOR + T, T, { left: L, right: R });
    if (grav0) { c.save(); c.translate(0, CEIL); c.scale(1, -1); ART.tile(c, TH, 'ground', sx, 0, T, { top: true }); ART.tile(c, TH, 'ground', sx, T, T, {}); c.restore(); }
  }
}
function draw() {
  if (cave) caveBg(); else ART.background(c, TH, W, H, cam, 0, t);
  if (!port && !cave) for (const d of decos) { const i = Math.floor(d.x / T); if (!holeAt(i) && !grav0) ART.deco(c, TH, d.x - cam, FLOOR, T, d.s); }
  if (port) {
    for (const o of obs) { const x = o.x - cam, top = o.top !== undefined ? o.top : o.gy; log(x, -20, top, top); log(x, top + o.gap, FLOOR + 10, top + o.gap); }
    for (let i = Math.floor(cam / T) - 1; i < Math.floor(cam / T) + W / T + 2; i++) { const sx = Math.round(i * T - cam); ART.tile(c, TH, 'ground', sx, FLOOR, T, { top: true }); ART.tile(c, TH, 'ground', sx, FLOOR + T, T, {}); }
  } else if (cave) caveWalls(); else ground();
  for (const o of obs) {
    const x = o.x - cam; if (x < -70 || x > W + 70) continue;
    if (o.k === 'spike') { if (o.top) { c.save(); c.translate(x, CEIL); c.scale(1, -1); ART.tile(c, TH, 'spike', 0, -T, T, {}); c.restore(); } else ART.tile(c, TH, 'spike', x, FLOOR - T, T, {}); }
    else if (o.k === 'crate') crate(Math.round(x), o.y);
    else if (o.k === 'foe') ART.enemy(c, o.kind, x, o.y + (o.y < FLOOR - 40 ? Math.sin(t * 3 + o.ph) * 10 : 0), o.w, o.h, { t: t + o.ph, face: -1 });
    else if (o.k === 'mine') mine(o, x);
  }
  for (const co of coins) { const x = co.x - cam; if (x > -20 && x < W + 20) co.gem ? gem(x, co.y) : ART.coin(c, x, co.y, t); }
  for (const b of bullets) { const x = b.x - cam; c.fillStyle = 'rgba(255,240,180,.3)'; ART.rr(c, x - 4, b.y - 4, 18, 8, 4); c.fill(); c.fillStyle = '#fff6c2'; ART.rr(c, x, b.y - 1.5, 11, 3, 1.5); c.fill(); }
  for (const r of rings) { c.globalAlpha = 1 - r.t / 0.35; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.ellipse(r.x, r.y, 8 + r.t * 90, 3 + r.t * 30, 0, 0, 6.283); c.stroke(); c.globalAlpha = 1; }
  // jugador
  if (port) bird(PX, p.y, dead ? p.rot : p.rot);
  else if (cave) ship(PX, p.y);
  else {
    const cx = PX + p.w / 2, cy = p.y + p.h / 2, state = dead ? 'fall' : p.on ? 'run' : p.vy * (grav0 ? grav : 1) < 0 ? 'jump' : 'fall';
    gs += (grav - gs) * Math.min(1, k.st === 'play' ? 0.3 : 1);
    c.save(); c.translate(cx, cy); if (dead) c.rotate(p.rot * 0.5); c.scale(1, grav0 ? gs || 0.01 : 1);
    ART.hero(c, 0, p.h / 2 + 1, 0.9, { face: 1, state, t, col: TH.hero, squash: sq });
    c.restore();
  }
  // HUD
  if (port) { label(String(passed + got), W / 2, 58, 46, '#fff', 'center'); }
  else {
    if (cave) { mine({ y: 24, ph: 0, hp: 2, hit: 0 }, 24); label(`× ${mines}`, 44, 13, 18); }
    else { ART.coin(c, 22, 24, 0, 9); label(`× ${got}`, 38, 13, 18); }
    label(`${metres()} m`, W - 14, 12, 22, '#fff', 'right');
  }
  if (hover && k.st === 'play') { c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5); label(port ? 'Toca para aletear' : 'Mantén para subir', W / 2, port ? H * 0.62 : H - 110, port ? 20 : 18, '#fff', 'center'); c.globalAlpha = 1; }
}
