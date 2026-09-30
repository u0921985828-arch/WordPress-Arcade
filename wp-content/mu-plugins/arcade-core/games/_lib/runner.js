/* Runners de un botón con arte propio (ART). CFG.mode: 'flap' | 'jump' | 'double' | 'gravity' | 'cave'; CFG.theme (ART.THEMES), CFG.pal (cueva).
 * Mundo en coordenadas absolutas (cam = distancia recorrida); casilla T = 32 px. */
const M = CFG.mode, port = M === 'flap', cave = M === 'cave', grav0 = M === 'gravity', dbl = M === 'double';
const TH = ART.THEMES[CFG.theme || (port ? 'meadow' : 'jungle')], OUT = ART.OUT, PAL = CFG.pal || ['#5ce1e6', '#ff5fa2', '#3b2a55'];
let W = port ? 360 : 640, H = port ? 640 : 360;
const T = 32;
/* Lienzo fluido (plan Friv): en los runners de suelo el ancho jugable se mantiene y lo que crece
   es el cielo, así que la pantalla se llena sin cambiar ni una pizca la dificultad. */
const FLU = !port && !cave && !grav0;
const k = Kit({ w: W, h: H, fluid: FLU ? { min: 0.3, max: 3.2 } : 0, title: CFG.title, bg: cave ? '#120c20' : TH.sky[0] }), c = k.ctx;
let FLOOR = H - 64;
const CEIL = 64, PX = port ? 110 : 150;
if (FLU) { W = k.W; H = k.H; FLOOR = H - 64;
  k.onSize = (vw, vh) => { const d = (vh - 64) - FLOOR; W = vw; H = vh; FLOOR = H - 64;
    if (!d) return;
    if (p) p.y += d;
    for (const o of obs || []) o.y += d;
    for (const q of coins || []) q.y += d;
  }; }
const G = 1500, JUMP = 560, JUMP2 = 520, CUT = 200, COYOTE = 0.12, BUFFER = 0.14;
/* Curva de dificultad según distancia: arranca a ~65 % y llega al máximo hacia los 3 min de buen juego.
 * V0/VMAX en px/s; DIST = px recorridos para dificultad 1 (vel. lineal en distancia → subida suave al principio). */
const V0 = cave ? 128 : grav0 ? 136 : 140, VMAX = cave ? 340 : grav0 ? 357 : dbl ? 417 : 400, DIST = cave ? 69000 : 78000; // 1.23: más fácil (×0,8 / ×0,85 / ×1,5)
const lvlOf = () => Math.min(1, cam / DIST), speedOf = () => (V0 + (VMAX - V0) * lvlOf()) * k.D.spd; /* k.D.spd: fácil ×0,8 · difícil ×1,18 */
let p, obs, coins, holes, decos, cav, bullets, rings, t, cam, speed, bonus, got, nx, jumps, grav, gs, dead, hover, coy, buf, sq, passed, mines, wing;
/* Tramos a mano (plan Friv): con tabla no hay generación al azar; el nivel termina en bandera. */
const RLV = (typeof RUNLV !== 'undefined' && RUNLV[CFG.id]) || null;
let goal = 0, lvNum = 1, lvSpeed = 0;
/* ---------- spike-run 1.40.2 (tanda 7): plataformas, rocas, muelles, prensas, gemas y
   puntos de control. Acotado por CFG.id: los otros cuatro runners no ven nada de esto. ---------- */
const SR = CFG.id === 'spike-run';
let LVR = null, cks = [], ckX = 0, ckGot = 0, ckGem = 0, srL = 3, died2 = 0, gems = 0, gemN = 0, chain = 0, chainT = 0, mult = 1, ckT = 0;
const srTgt = () => (LVR && LVR.co ? LVR.co[k.dif] : 0);
/* La prensa es un techo bajo y el suelo no se detiene: para que nunca haya una muerte
   injusta, mientras hay una prensa a menos de un salto de distancia el salto se bloquea
   (y el muelle no dispara). El juego te sujeta al suelo; tú solo corres. */
function pressNear(f) {
  const nose = cam + PX + 18;
  for (const q of obs) if (q.k === 'press' && q.x - nose < speed * 0.78 * (f || 1) && q.x + q.w > cam + PX) return q;
  return null;
}
function srChain(x, y, base, col) {
  chain++; chainT = 2.2; mult = Math.min(5, 1 + Math.floor(chain / 3));
  const pts = base * mult; bonus += pts; k.chime(chain); k.float('+' + pts, x, y, col);
  if (chain >= 4) k.combo(chain, x, y - 22);
}
function buildHand(n0) {
  lvNum = k.clamp(n0, 1, RLV.length);
  LVR = RLV[lvNum - 1]; if (SR) { cks = []; gemN = 0; }
  /* La velocidad del suelo NO cambia con la dificultad: aquí decide la ruta (a menos velocidad,
     el salto cubre menos suelo y un par de pinchos deja de poder saltarse). Los márgenes que sí
     cambian son las vidas, el aviso de rocas y bichos y el objetivo de monedas. */
  lvSpeed = (V0 + (VMAX - V0) * ((lvNum - 1) / (RLV.length - 1)) * 0.92) * (SR ? 1 : k.D.spd);
  /* Los respiros se escriben en casillas pero se juegan en tiempo: a más velocidad, más metros,
     para que el ritmo del diseño sea el mismo en el nivel 1 y en el 20. Y siempre hay pista de
     salida: nada mata en el primer segundo y medio. */
  const gs2 = Math.max(1, lvSpeed / 180);
  let x = 4 + Math.ceil(lvSpeed * 1.5 / T), last = { x: 4, n: 2 };
  for (const tk of (typeof LVR === 'string' ? LVR : LVR.s).split(' ').filter(Boolean)) {
    const n = +tk.slice(1) || 1, c0 = tk[0];
    if (c0 === '.') x += Math.round(n * gs2);
    else if (c0 === 's') { spikes(x, n); last = { x, n }; x += n; }
    else if (c0 === 'c' || c0 === 'C') { const hgt = c0 === 'C' ? 2 : 1;
      for (let i = 0; i < n; i++) { for (let j = 0; j < hgt; j++) obs.push({ k: 'crate', x: (x + i) * T, y: FLOOR - (j + 1) * T }); coins.push({ x: (x + i + 0.5) * T, y: FLOOR - hgt * T - 22 }); }
      last = { x, n }; x += n; }
    else if (c0 === 'h') { holes.push({ a: x, b: x + n }); last = { x, n }; x += n; }
    else if (c0 === 'f' || c0 === 'F') { const high = c0 === 'F';
      obs.push({ k: 'foe', x: x * T, y: high ? FLOOR - 96 : FLOOR - 26, w: 28, h: 26, vx: (high ? -30 : -60) * (0.45 + lvNum / RLV.length * 0.55) * k.D.spd, kind: TH.enemy, ph: 0, x0: x * T, arm: 0 });
      last = { x, n: 2 }; x += 3; }
    else if (c0 === 'o') coinArc(last.x - 1, n, 78, FLOOR - 26);
    else if (SR && c0 === 'p') { for (let i = 0; i < n; i++) obs.push({ k: 'plat', x: (x + i) * T, y: FLOOR - Math.round(2.3 * T) }); for (let i = 0; i < n; i++) coins.push({ x: (x + i + 0.5) * T, y: FLOOR - Math.round(2.3 * T) - 22 }); last = { x, n }; x += n; }
    else if (SR && c0 === 'r') { obs.push({ k: 'roll', x: (x + 2) * T, y: FLOOR - 30, w: 30, h: 30, a: 0, vx: -(70 + lvNum * 4) * k.D.spd, x0: (x + 2) * T, arm: 0 }); last = { x, n: 2 }; x += 4; }
    else if (SR && c0 === '^') { obs.push({ k: 'spring', x: x * T, y: FLOOR - 15, w: T, h: 15, sq: 0 }); last = { x, n: 1 }; x += 1; }
    else if (SR && c0 === 'P') { obs.push({ k: 'press', x: x * T, w: n * T, y: FLOOR - 84, ph: (x % 7) / 7 }); last = { x, n }; x += n; }
    else if (SR && c0 === 'G') { coins.push({ x: (x + 0.5) * T, y: FLOOR - Math.round(3.1 * T), gem: true }); gemN++; x += 1; }
    else if (SR && c0 === 'k') { cks.push(x * T); x += 1; }
    if (Math.random() < 0) x += 0;   /* sin azar: la tira es la del diseño */
  }
  for (let i = 3; i < x; i += 7) decos.push({ x: i * T + 16, s: (i % 5) / 5 });
  goal = (x + 5) * T; nx = 1e9;
}
function reset() {
  p = { y: port || cave ? H / 2 : FLOOR - 28, vy: 0, w: 18, h: 28, on: true, rot: 0 };
  obs = []; coins = []; holes = []; decos = []; bullets = []; rings = []; cav = [];
  t = 0; cam = 0; speed = port ? 140 : V0; bonus = 0; got = 0; jumps = 0; grav = 1; gs = 1; dead = 0; hover = port || cave; coy = 0; buf = 0; sq = 0; passed = 0; mines = 0; wing = 0;
  nx = port ? W + 200 : cave ? W + 200 : 28;
  if (cave) for (let x = -40; x <= W + 60; x += 20) cav.push({ x, top: 60, bot: H - 60, cr: Math.random() < 0.1 });
  if (!port && !cave) for (let i = 1; i < 20; i += k.ri(3, 6)) decos.push({ x: i * T + 16, s: Math.random() });
  if (RLV) { obs = []; coins = []; holes = []; decos = []; buildHand(k.lv);
    if (SR) { chain = 0; chainT = 0; mult = 1; ckT = 0;
      if (!srRe) { srL = 3 + k.D.life; died2 = 0; gems = 0; ckX = 0; ckGot = 0; ckGem = 0; }
      if (ckX) { cam = ckX; got = ckGot; gems = ckGem;
        obs = obs.filter((q) => q.x > cam - 40); coins = coins.filter((q) => q.x > cam + 40); holes = holes.filter((h) => h.b * T > cam + 40); } } }
}
let srRe = 0;
function srRespawn() { srRe = 1; reset(); srRe = 0; }
if (RLV) k.levels(RLV.length, { start: (i) => { lvNum = i; if (SR) { srL = 3 + k.D.life; died2 = 0; gems = 0; ckX = 0; ckGot = 0; ckGem = 0; } reset(); } });
reset(); k.show(CFG.title, CFG.help);
/* si el jugador cambia de nivel en la pantalla de inicio, la partida se prepara de nuevo con los valores de k.D */
k.onDif = () => { if (k.st !== 'play') reset(); };
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
  if (SR && RLV) { died2++; if (--srL > 0) { k.sfx('start'); return srRespawn(); }
    return k.lose(CFG.id, total(), 'Sin vidas', `Nivel ${lvNum} · ${metres()} m · ${got} moneda${got === 1 ? '' : 's'}`); }
  const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`, extra = port ? `${pl(passed, 'tronco')} · ${pl(got, 'moneda')}` : cave ? `${metres()} m · ${pl(mines, 'mina')}` : `${metres()} m · ${pl(got, 'moneda')}`;
  k.lose(CFG.id, total(), 'Fin', extra);
}
/* ---------- Generación de tramos (jump / double / gravity) ---------- */
function spikes(at, n, top) { for (let i = 0; i < n; i++) obs.push({ k: 'spike', x: (at + i) * T, top }); }
function coinArc(at, n, hgt, base) { for (let i = 0; i < n; i++) coins.push({ x: (at + i + 0.5) * T, y: (base || FLOOR - 26) - Math.sin((i + 0.5) / n * Math.PI) * hgt }); }
function pattern() {
  const x0 = nx, lvl = lvlOf(); let len = 1;
  if (grav0) {
    const top = Math.random() < 0.5, n = k.ri(1, 1 + Math.round(lvl * 3));
    spikes(x0, n, top); for (let i = 0; i < n; i++) coins.push({ x: (x0 + i + 0.5) * T, y: top ? FLOOR - 16 : CEIL + 16 });
    len = n; if (Math.random() < 0.15 + lvl * 0.45) { const g = Math.ceil(speed * (1.05 - lvl * 0.3) / T) + 1, m = k.ri(1, lvl < 0.3 ? 2 : 3); spikes(x0 + n + g, m, !top); len += g + m; }
  } else {
    const r = Math.random();
    if (r < 0.26) { const n = k.ri(1, dbl ? 2 + (lvl > 0.2) + (lvl > 0.5) : 2 + (lvl > 0.3)); spikes(x0, n); coinArc(x0 - 1, n + 2, 70 + n * 8); len = n; }
    else if (r < 0.46) {
      const hgt = Math.random() < 0.12 + lvl * 0.5 ? 2 : 1, n = k.ri(1, lvl < 0.15 ? 2 : 3), tail = Math.random() < 0.15 + lvl * 0.45 ? k.ri(1, lvl < 0.3 ? 1 : 2) : 0;
      for (let i = 0; i < n; i++) { for (let j = 0; j < hgt; j++) obs.push({ k: 'crate', x: (x0 + i) * T, y: FLOOR - (j + 1) * T }); coins.push({ x: (x0 + i + 0.5) * T, y: FLOOR - hgt * T - 22 }); }
      spikes(x0 + n, tail); len = n + tail;
    } else if (r < 0.64) { const n = k.ri(2, Math.max(2, Math.min(dbl ? 5 : 4, 2 + Math.floor((speed - 150) / (dbl ? 80 : 110))))); holes.push({ a: x0, b: x0 + n }); coinArc(x0 - 1, n + 2, 90); len = n; }
    else if (r < 0.82) {
      const high = dbl && Math.random() < 0.45, kind = TH.enemy;
      obs.push({ k: 'foe', x: (x0 + 2) * T, y: high ? FLOOR - 96 : FLOOR - 26, w: 28, h: 26, vx: (high ? -30 : -60) * (0.5 + lvl * 0.5) * k.D.spd, kind, ph: Math.random() * 6 });
      if (high) coinArc(x0, 5, 0, FLOOR - 20); len = 3;
    } else { const n = k.ri(5, 8), mid = Math.random() < 0.4 + lvl * 0.3; for (let i = 0; i < n; i++) coins.push({ x: (x0 + i + 0.5) * T, y: mid && Math.abs(i - n / 2) < 1 ? FLOOR - 90 : FLOOR - 20 }); if (mid) spikes(x0 + Math.floor(n / 2) - 1, 2); len = n; }
  }
  if (!grav0 && Math.random() < 0.5) decos.push({ x: (x0 + len + 2) * T + 16, s: Math.random() });
  passed++; nx = x0 + len + Math.ceil(speed * 1.25 * (k.rnd(0.6, 1.05) + (1 - lvl) * 0.55 + (passed % 12 === 0 ? 1.2 : 0)) / k.D.rate / T) + 2;
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
    const d = Math.min(1, passed / 135); speed = (112 + 84 * d) * k.D.spd;
    if (act()) { p.vy = -380; k.sfx('jump'); }
    p.vy += 1200 * dt; p.y += p.vy * dt; if (p.y < 14) { p.y = 14; p.vy = 0; }
    p.rot = k.clamp(p.vy / 650, -0.45, 1.3);
    if (p.y + 12 > FLOOR) { p.y = FLOOR - 12; return die(); }
    if (nx < cam + W + 80) {
      const gap = 200 - 62 * d, y = k.rnd(90, FLOOR - 70 - gap);
      obs.push({ k: 'log', x: nx, gy: y, gap, mv: passed > 20 ? Math.min(38, (passed - 20) * 0.8) * (Math.random() < 0.5 ? -1 : 1) : 0, ph: Math.random() * 6 });
      if (Math.random() < 0.55) coins.push({ x: nx + 64 + 73, y: y + gap / 2 + k.rnd(-30, 30) });
      nx += (235 - 25 * d) / k.D.rate;
    }
  } else if (cave) {
    speed = speedOf(); const lv = lvlOf();
    const hold = held(); p.vy += (hold ? -900 : 700) * dt; p.vy = k.clamp(p.vy, -300, 350); p.y += p.vy * dt; p.thr = hold;
    while (cav[cav.length - 1].x < cam + W + 40) { const l = cav[cav.length - 1], gap = 235 - 105 * lv, rough = 14 + 10 * lv, top = k.clamp(l.top + k.rnd(-rough, rough), 20, H - gap - 20); cav.push({ x: l.x + 20, top, bot: top + gap, cr: Math.random() < 0.1 }); }
    while (cav[1].x < cam - 40) cav.shift();
    const s = cav.find((q) => q.x <= px && q.x + 20 > px); if (s && (p.y - 7 < s.top || p.y + 7 > s.bot)) return die();
    if (Math.floor(t * 5) !== Math.floor((t - dt) * 5)) bullets.push({ x: px + 16, y: p.y });
    for (const b of bullets) b.x += (speed + 520) * dt;
    if (nx < cam + W + 40) {
      const l = cav[cav.length - 1]; obs.push({ k: 'mine', x: nx, y: k.rnd(l.top + 24, l.bot - 24), hp: 2, hit: 0, ph: Math.random() * 6 });
      if (Math.random() < 0.45) coins.push({ x: nx + 120, y: (l.top + l.bot) / 2, gem: true });
      nx += speed * 1.25 * (k.rnd(1, 2) + (1 - lv) * 0.7) / k.D.rate;
    }
  } else {
    /* Con tramos a mano la velocidad la marca el nivel, no la distancia recorrida. */
    speed = RLV ? lvSpeed : speedOf();
    if (!RLV) while (nx * T < cam + W + 120) pattern();
    if (RLV && cam + PX > goal) { const sc = total();
      if (SR) { const tg = srTgt(), ok = got >= tg, per = ok && gems >= gemN && died2 === 0;
        return k.levelDone(sc, `${got}/${tg} monedas · ${gems}/${gemN} gema${gemN === 1 ? '' : 's'}`, { stars: 1 + (ok ? 1 : 0) + (per ? 1 : 0) }); }
      return k.levelDone(sc, `${got} moneda${got === 1 ? '' : 's'}`); }
    if (SR) { chainT -= dt; if (chainT <= 0 && chain) { chain = 0; mult = 1; k.chainReset(); }
      if (ckT > 0) ckT -= dt;
      while (cks.length && cam + PX > cks[0]) { ckX = cks.shift(); ckGot = got; ckGem = gems; ckT = 1.6; k.sfx('win'); k.reward('Punto de control', '#7cf7a0'); } }
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
      if (buf > 0 && coy > 0 && SR && pressNear(1)) { buf = 0; }
      else if (buf > 0 && coy > 0) { p.vy = -JUMP; jumps = 1; buf = 0; coy = 0; p.on = false; sq = -0.2; k.sfx('jump'); k.burst(PX + p.w / 2, p.y + p.h, 'rgba(255,255,255,.8)', 5, 80); }
      else if (dbl && act() && !p.on && jumps < 2) { p.vy = -JUMP2; jumps = 2; buf = 0; k.sfx('jump'); rings.push({ x: PX + p.w / 2, y: p.y + p.h, t: 0 }); }
      if (!held() && p.vy < -CUT) p.vy = -CUT;
      p.vy += G * dt;
      const feet = p.y + p.h; let sup = Infinity;
      if (feet <= FLOOR + 6 && (!holeAt(Math.floor((px + 3) / T)) || !holeAt(Math.floor((px + p.w - 3) / T)))) sup = FLOOR;
      else if (feet > FLOOR + 4 && !holeAt(Math.floor((px + p.w) / T))) return die();
      for (const o of obs) if ((o.k === 'crate' || o.k === 'plat') && o.x < px + p.w - 2 && o.x + T > px + 2 && o.y >= feet - 6) sup = Math.min(sup, o.y);
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
    /* Bichos y rocas de spike-run: quietos fuera de pantalla hasta que el jugador se acerca.
       Así el encuentro cae siempre en la casilla escrita (antes se desplazaban desde el
       segundo 0 y en un nivel largo llegaban a cualquier sitio) y el margen —no la ruta—
       es lo que cambia con la dificultad. */
    if (SR && o.arm === 0) {
      const lead = 210 + 30 * (2 - k.dif);
      if (bx < o.x0 - lead) continue;
      o.arm = 1; o.x = o.x0 + lead * Math.abs(o.vx) / speed;
    }
    if (o.k === 'log') {
      o.top = k.clamp(o.gy + Math.sin(t * 1.6 + o.ph) * o.mv, 50, FLOOR - 60 - o.gap);
      if (!o.scored && o.x + 64 < bx - 12) { o.scored = true; passed++; k.sfx('coin'); }
      const cx = bx, cy = p.y, r = 9.5, inR = (x, y, w, h) => { const qx = k.clamp(cx, x, x + w), qy = k.clamp(cy, y, y + h); return (cx - qx) ** 2 + (cy - qy) ** 2 < r * r; };
      if (inR(o.x + 5, -40, 54, o.top + 43) || inR(o.x + 5, o.top + o.gap - 3, 54, FLOOR - o.top - o.gap + 3)) return die();
    } else if (o.k === 'spike') { if (o.top ? hitBox(o.x + 8.5, CEIL, 15, 15.5) : hitBox(o.x + 8.5, FLOOR - 15.5, 15, 15.5)) return die(); }
    else if (o.k === 'crate') { if (ox + bw - 5 > o.x && ox + 5 < o.x + T && by + bh - 6 > o.y && by + 3 < o.y + T) return die(); }
    else if (o.k === 'foe') {
      o.x += o.vx * dt; const fy = o.y + (o.y < FLOOR - 40 ? Math.sin(t * 3 + o.ph) * 10 : 0);
      if (hitBox(o.x + 5, fy + 6, o.w - 10, o.h - 7)) {
        if (p.vy > 0 && p.y + p.h - fy < 14) { o.dead = true; p.vy = -460; jumps = dbl ? 1 : jumps; bonus += 10; k.burst(o.x - cam + 14, fy + 12, '#fff', 16); k.float('+10', o.x - cam + 14, fy - 8, '#ffc928'); k.sfx('hit'); }
        else return die();
      }
    } else if (o.k === 'roll') {
      o.x += o.vx * dt; o.a += dt * 6;
      if (hitBox(o.x + 4, o.y + 4, o.w - 8, o.h - 8)) return die();
    } else if (o.k === 'spring') {
      if (o.sq > 0) o.sq -= dt * 3;
      if (ox + bw > o.x && ox < o.x + o.w && p.vy >= 0 && by + bh >= o.y - 4 && by + bh < o.y + 20 && !pressNear(1.7)) {
        p.vy = -960; p.on = false; jumps = 0; o.sq = 1; k.sfx('jump'); k.shake(2); rings.push({ x: PX + p.w / 2, y: o.y, t: 0 }); }
    } else if (o.k === 'press') {
      /* Prensa: techo bajo. No hay nada que esperar (el suelo no se detiene): se pasa por debajo
         corriendo, y mata si estás en el aire. Determinista, nunca una muerte injusta. */
      if (ox + bw > o.x + 3 && ox < o.x + o.w - 3 && by < o.y) return die();
    } else if (o.k === 'mine') {
      if (o.hit > 0) o.hit -= dt;
      for (const b of bullets) if (!b.dead && Math.abs(b.x - o.x) < 16 && Math.abs(b.y - o.y) < 16) { b.dead = true; o.hit = 0.1; if (--o.hp <= 0) { o.dead = true; mines++; bonus += 25; k.burst(o.x - cam, o.y, '#ff6b6b', 18, 220); k.burst(o.x - cam, o.y, '#ffc928', 8, 120); k.float('+25', o.x - cam, o.y - 14, '#ffc928'); k.sfx('explode'); k.shake(3); } else k.sfx('hit'); }
      if (!o.dead && (bx - o.x) ** 2 + (p.y - o.y) ** 2 < 19 * 19) return die();
    }
  }
  for (const co of coins) if (!co.got && Math.abs(co.x - (port || cave ? bx : bx + p.w / 2)) < 24 && Math.abs(co.y - (port || cave ? p.y : p.y + p.h / 2)) < 29) {
    co.got = true; got++; if (co.gem) bonus += 10; k.sfx('coin'); k.burst(co.x - cam, co.y, co.gem ? PAL[1] : '#ffc928', 7, 90);
    if (SR) { if (co.gem) { gems++; k.reward('¡Gema!', PAL[1]); } srChain(co.x - cam, co.y - 16, co.gem ? 50 : 10, co.gem ? PAL[1] : '#ffc928'); }
  }
  obs = obs.filter((o) => !o.dead && o.x > cam - 120); coins = coins.filter((q) => !q.got && q.x > cam - 40);
  holes = holes.filter((h) => h.b * T > cam - 40); decos = decos.filter((d) => d.x > cam - 80); bullets = bullets.filter((b) => !b.dead && b.x < cam + W + 20);
}, draw);
/* ---------- Dibujo ---------- */
/* --- Ley de la pieza única (R5, docs/REMASTER.md §8) -------------------------------
   `unite(g, partes, ancho)` traza TODAS las partes y las rellena después: los contornos
   interiores quedan tapados y solo sobrevive la silueta exterior. El detalle interior va
   recortado (`within` en caché, `clipIn` en el lienzo de partida), nunca con stroke. */
const OUTW = 1.1, INW = 0.65, INA = 0.62;
const _hx = (h) => { if (h[0] !== '#') { const m = h.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; } h = h.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _rgb = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
const LT = (col, f) => _rgb(_hx(col).map((v) => v + (255 - v) * f));
const DK = (col, f) => _rgb(_hx(col).map((v) => v * (1 - f)));
const MXC = (a, b, u) => { const x = _hx(a), y = _hx(b); return _rgb(x.map((v, i) => v + (y[i] - v) * u)); };
const AL = (col, a) => { const q = _hx(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
/* partes = [[trazado, relleno, sombraDeContacto?]], en orden de profundidad */
function unite(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = OUT; g.lineWidth = (ow || OUTW) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) {
    const P = parts[i];
    if (P[2]) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); P[0](g); g.strokeStyle = AL(OUT, 0.15); g.lineWidth = P[2]; g.stroke(); g.lineWidth = P[2] * 0.45; g.stroke(); g.restore(); }
    g.beginPath(); P[0](g); g.fillStyle = P[1]; g.fill();
  }
}
/* detalle de una pieza, recortado contra su propio trazado (caché: source-atop es barato) */
function within(g, path, fn) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* igual, para el lienzo de partida: recorte a secas (source-atop costaría un compuesto de pantalla completa) */
function clipIn(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
/* Caja: un cuerpo. El bastidor y la diagonal ya no son contornos cerrados dentro de la silueta,
   sino tablas separadas por su propia sombra. */
function crate(x, y) {
  const box = (g) => ART.rr(g, x + 1, y + 1, T - 2, T - 2, 4);
  const gr = c.createLinearGradient(x, y, x + T * 0.7, y + T); gr.addColorStop(0, LT(TH.plank, 0.2)); gr.addColorStop(0.55, TH.plank); gr.addColorStop(1, DK(TH.plank, 0.26));
  unite(c, [[box, gr]], 1.1);
  clipIn(c, box, (g) => {
    g.fillStyle = AL(OUT, 0.3);
    for (const yy of [y + 5.4, y + T - 7.4]) g.fillRect(x, yy, T, 2.2);
    for (const xx of [x + 5.4, x + T - 7.4]) g.fillRect(xx, y, 2.2, T);
    g.save(); g.translate(x + T / 2, y + T / 2); g.rotate(-0.785); g.fillRect(-T, -1.3, T * 2, 2.6); g.restore();
    g.fillStyle = AL('#ffffff', 0.26);
    for (const yy of [y + 7.6, y + T - 5.2]) g.fillRect(x, yy, T, 1.3);
    g.fillStyle = AL('#ffffff', 0.3); g.fillRect(x + 4, y + 3, T - 8, 2);
    g.fillStyle = AL(OUT, 0.16); g.fillRect(x + 1, y + T - 6, T - 2, 6);
  });
}
/* Tronco: fuste, corte y hojas son el MISMO tronco. Se trazan juntos y se rellenan después; los
   anillos del corte se leen por color, no por línea. */
function log(x, y0, y1, capY) {
  const d = capY > y0 + 20 ? 1 : -1;
  const trunk = (g) => ART.rr(g, x + 6, y0, 52, y1 - y0, 6);
  const cap = (g) => g.ellipse(x + 32, capY, 31, 9, 0, 0, 6.283);
  const leaf = (lx, a) => (g) => { const cx = lx, cy = capY - d * 12, co = Math.cos(a * d), si = Math.sin(a * d);
    const P = (ux, uy) => [cx + ux * co - uy * si, cy + ux * si + uy * co];
    const q = [P(-10, 0), P(-4, -5), P(6, -4.4), P(10, 0), P(4, 4.6), P(-5, 4.4)];
    g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) g.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[(i + 1) % q.length][0]) / 2, (q[i][1] + q[(i + 1) % q.length][1]) / 2); g.closePath(); };
  const gt = c.createLinearGradient(x + 6, 0, x + 58, 0); gt.addColorStop(0, '#7e5330'); gt.addColorStop(0.3, '#b87c47'); gt.addColorStop(0.68, '#a8703f'); gt.addColorStop(1, '#6f4726');
  unite(c, [[leaf(x + 6, -0.6), TH.top], [leaf(x + 58, 0.6), TH.top], [trunk, gt], [cap, '#f0cf96']], 1.15);
  clipIn(c, trunk, (g) => {
    g.fillStyle = AL(OUT, 0.18); for (let i = 0; i < 3; i++) for (let yy = y0 + 10 + i * 13; yy < y1 - 10; yy += 38) g.fillRect(x + 18 + i * 12, yy, 3, 20);
    g.fillStyle = AL('#ffffff', 0.18); g.fillRect(x + 11, y0 + 4, 5, Math.max(0, y1 - y0 - 8));
  });
  clipIn(c, cap, (g) => {
    for (const [rx, ry, col] of [[24, 7, '#e2bb7e'], [19, 5.5, '#f0cf96'], [13, 3.8, '#dcb375'], [8, 2.5, '#f3d9a6']]) { g.fillStyle = col; g.beginPath(); g.ellipse(x + 32, capY, rx, ry, 0, 0, 6.283); g.fill(); }
    g.fillStyle = AL(OUT, 0.2); g.beginPath(); g.ellipse(x + 34, capY + d * 2.4, 31, 9, 0, 0, 6.283); g.fill();
    g.fillStyle = AL('#ffffff', 0.3); g.beginPath(); g.ellipse(x + 26, capY - d * 3, 12, 2.6, 0, 0, 6.283); g.fill();
  });
}
/* Pájaro de una pieza: cola, cuerpo y pico comparten silueta (tangente seguida en la raíz de la
   cola y en la comisura del pico); el ala, que sí bate, va recortada dentro con su propia sombra. */
function bird(x, y, rot) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const tail = (g) => { g.moveTo(-9.6, -5.4); g.quadraticCurveTo(-16, -8.4, -21, -9); g.quadraticCurveTo(-21.6, -2, -20, 5); g.quadraticCurveTo(-15, 2.6, -9.6, 4.2); g.closePath(); };
  const body = (g) => g.ellipse(0, 0, 15, 13, 0, 0, 6.283);
  const beak = (g) => { g.moveTo(11.4, -2.4); g.quadraticCurveTo(18, -0.6, 22, 2.5); g.quadraticCurveTo(17.4, 5.4, 11.4, 7); g.closePath(); };
  const gb = c.createRadialGradient(-4, -6, 2, 1, 1, 19); gb.addColorStop(0, '#ffe98d'); gb.addColorStop(0.5, '#ffd23d'); gb.addColorStop(1, '#e09a17');
  unite(c, [[tail, '#ff9a3d'], [beak, '#ff7a2d'], [body, gb]], 1.1);
  clipIn(c, body, (g) => {
    g.fillStyle = '#fff3c4'; g.beginPath(); g.ellipse(2, 5.6, 9, 6, 0, 0, 6.283); g.fill();
    const wy = Math.sin(wing);
    g.fillStyle = AL(OUT, 0.26); g.beginPath(); g.ellipse(-3.4, 3.6 + wy * 2, 9.4, 5.9, -0.2 + wy * 0.45, 0, 6.283); g.fill();
    g.fillStyle = '#ffb13d'; g.beginPath(); g.ellipse(-4, 2 + wy * 2, 9, 5.5, -0.2 + wy * 0.45, 0, 6.283); g.fill();
    g.fillStyle = AL('#ffffff', 0.22); g.beginPath(); g.ellipse(-5.4, 0.4 + wy * 2, 5.4, 2.2, -0.2 + wy * 0.45, 0, 6.283); g.fill();
  });
  c.fillStyle = '#fff'; c.beginPath(); c.arc(6, -4, 5.2, 0, 6.283); c.fill();
  c.lineWidth = INW; c.strokeStyle = AL(OUT, INA); c.stroke();
  c.fillStyle = OUT; c.beginPath(); c.arc(7.6, -4, 2.4, 0, 6.283); c.fill();
  c.restore();
}
function ship(x, y) {
  c.save(); c.translate(x, y); c.rotate(dead ? p.rot : k.clamp(p.vy / 900, -0.35, 0.35));
  if (p.thr && !dead) { c.fillStyle = '#ffb13d'; c.beginPath(); c.moveTo(-13, -4); c.lineTo(-22 - Math.random() * 9, 0); c.lineTo(-13, 4); c.fill(); c.fillStyle = '#fff6c2'; c.beginPath(); c.moveTo(-13, -2); c.lineTo(-18 - Math.random() * 4, 0); c.lineTo(-13, 2); c.fill(); }
  const fin = (sd) => (g) => { g.moveTo(-3.4, sd * 5); g.quadraticCurveTo(-9, sd * 10.4, -14, sd * 15); g.lineTo(-11.6, sd * 5.6); g.closePath(); };
  const hull = (g) => { g.moveTo(19, 0); g.quadraticCurveTo(8, -11, -14, -8); g.quadraticCurveTo(-16.4, 0, -14, 8); g.quadraticCurveTo(8, 11, 19, 0); g.closePath(); };
  const gh = c.createLinearGradient(0, -9, 0, 9); gh.addColorStop(0, LT(PAL[0], 0.34)); gh.addColorStop(0.55, PAL[0]); gh.addColorStop(1, DK(PAL[0], 0.3));
  unite(c, [[fin(-1), PAL[1]], [fin(1), PAL[1]], [hull, gh]], 1.15);
  clipIn(c, hull, (g) => {
    g.fillStyle = AL(OUT, 0.26); g.fillRect(-14, 3.4, 34, 2); g.fillStyle = AL('#ffffff', 0.3); g.fillRect(-14, -5.4, 30, 1.8);
    g.fillStyle = '#e9fbff'; g.beginPath(); g.ellipse(4, -2.5, 6, 4, 0, 0, 6.283); g.fill();
    g.fillStyle = AL(OUT, 0.3); g.beginPath(); g.ellipse(5, -1, 6, 3, 0, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(2.4, -4, 2.4, 1.3, -0.3, 0, 6.283); g.fill();
  });
  c.restore();
}
function mine(o, x) {
  const r = 12, blink = Math.sin(t * 6 + o.ph) > 0.3;
  c.save(); c.translate(x, o.y + Math.sin(t * 2 + o.ph) * 3); c.rotate(t * 0.8 + o.ph);
  const base = o.hit > 0 ? '#fff' : '#5a5470';
  const spike = (a) => (g) => { const co = Math.cos(a), si = Math.sin(a);
    g.moveTo(co * r * 0.6 - si * 3.4, si * r * 0.6 + co * 3.4);
    g.quadraticCurveTo(co * r * 1.16 - si * 2, si * r * 1.16 + co * 2, co * r * 1.5, si * r * 1.5);
    g.quadraticCurveTo(co * r * 1.16 + si * 2, si * r * 1.16 - co * 2, co * r * 0.6 + si * 3.4, si * r * 0.6 - co * 3.4); g.closePath(); };
  const ball = (g) => g.arc(0, 0, r, 0, 6.283);
  const gm = c.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r * 1.25); gm.addColorStop(0, LT(base, 0.34)); gm.addColorStop(0.6, base); gm.addColorStop(1, DK(base, 0.34));
  const parts = []; for (let i = 0; i < 8; i++) parts.push([spike(i * Math.PI / 4), '#8a90a8']);
  parts.push([ball, gm]);
  unite(c, parts, 1.15);
  clipIn(c, ball, (g) => {
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(-4, -4, 4, 0, 6.283); g.fill();
    if (o.hp < 2) { g.fillStyle = AL(OUT, 0.5); g.beginPath(); g.moveTo(2, -10); g.lineTo(7.4, -2.4); g.lineTo(10, -6); g.lineTo(4.4, -2.4); g.closePath(); g.fill(); }
  });
  c.rotate(-(t * 0.8 + o.ph));
  c.beginPath(); c.arc(0, 0, 4, 0, 6.283); c.fillStyle = blink ? '#ff3b5c' : '#7a2233'; c.fill(); c.lineWidth = INW; c.strokeStyle = AL(OUT, INA); c.stroke();
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
    // las tres agujas son UN afloramiento: se trazan juntas y se rellenan después
    c.globalAlpha = 0.55;
    const spike3 = (ox, sc) => (g) => { const hh = h * sc, ww = 9 + sc * 6; g.moveTo(x + ox - ww, y - d * 6); g.lineTo(x + ox - ww * 0.7, y + d * hh * 0.75); g.lineTo(x + ox, y + d * hh); g.lineTo(x + ox + ww * 0.7, y + d * hh * 0.75); g.lineTo(x + ox + ww, y - d * 6); g.closePath(); };
    unite(c, [[-14, 0.6], [12, 0.75], [0, 1]].map(([ox, sc]) => [spike3(ox, sc), col]), 1.1);
    for (const [ox, sc] of [[-14, 0.6], [12, 0.75], [0, 1]]) clipIn(c, spike3(ox, sc), (g) => { const hh = h * sc; g.fillStyle = AL('#ffffff', 0.32); g.fillRect(x + ox - 2, y + d * hh * 0.15, 2.5, d * hh * 0.55); g.fillStyle = AL(OUT, 0.24); g.fillRect(x + ox + 3, y - d * 6, 20, d * hh * 1.2); });
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
    if (grav0) { c.save(); c.translate(0, CEIL); c.scale(1, -1); ART.tile(c, TH, 'ground', sx, 0, T, { top: true, flat: true }); ART.tile(c, TH, 'ground', sx, T, T, {}); c.restore(); }
  }
}
/* --- piezas propias de spike-run (una pieza, un trazo; §8 de REMASTER) --- */
function srPlat(x, y) {
  const pl = (g) => ART.rr(g, x, y, T, 13, 3);
  unite(c, [[pl, '#c98a4a']], 1.15);
  clipIn(c, pl, (g) => { g.fillStyle = AL('#ffffff', 0.3); g.fillRect(x, y, T, 3); g.fillStyle = AL(OUT, 0.24); g.fillRect(x, y + 8, T, 5); g.fillStyle = AL(OUT, 0.3); g.fillRect(x + T / 2 - 1, y, 2, 13); });
}
function srRoll(x, y, a) {
  c.save(); c.translate(x + 15, y + 15); c.rotate(a);
  const disc = (g) => g.arc(0, 0, 15, 0, 6.283);
  unite(c, [[disc, '#8b8f9e']], 1.2);
  clipIn(c, disc, (g) => { g.fillStyle = AL(OUT, 0.26); g.beginPath(); g.arc(4, 5, 11, 0, 6.283); g.fill(); g.fillStyle = AL('#ffffff', 0.3); g.beginPath(); g.arc(-5, -6, 4.5, 0, 6.283); g.fill(); g.fillStyle = AL(OUT, 0.22); g.fillRect(-15, -2, 8, 4); g.fillRect(7, -2, 8, 4); });
  c.restore();
}
function srSpring(x, y, sq) {
  const h = 15 - Math.max(0, sq) * 8, pad = (g) => ART.rr(g, x + 2, y + (15 - h), T - 4, h, 4);
  unite(c, [[pad, '#a8cf3f']], 1.15);
  clipIn(c, pad, (g) => { g.fillStyle = AL('#ffffff', 0.35); g.fillRect(x + 2, y + (15 - h), T - 4, 3); g.fillStyle = AL(OUT, 0.26); g.fillRect(x + 2, y + 15 - 4, T - 4, 4); });
}
function srPress(x, o) {
  const bob = Math.sin(t * 6 + o.ph * 6.283) * 3, top = Math.max(0, CEIL - 30), bot = o.y + bob;
  const blk = (g) => ART.rr(g, x + 2, top, o.w - 4, bot - top, 6);
  unite(c, [[blk, '#6b6f86']], 1.2);
  clipIn(c, blk, (g) => {
    g.fillStyle = AL('#ffffff', 0.22); g.fillRect(x + 2, top, o.w - 4, 4);
    g.fillStyle = AL(OUT, 0.32); g.fillRect(x + 2, bot - 12, o.w - 4, 12);
    g.fillStyle = '#ff6a4d'; g.fillRect(x + 2, bot - 5, o.w - 4, 4);
    g.fillStyle = AL(OUT, 0.3); for (let i = x + 8; i < x + o.w - 8; i += 14) g.fillRect(i, top, 4, bot - top - 14);
  });
}
function srCheck(x, on) {
  c.strokeStyle = on ? '#7cf7a0' : 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, FLOOR); c.lineTo(x, FLOOR - 56); c.stroke();
  const fl = (g) => { g.moveTo(x + 2, FLOOR - 56); g.lineTo(x + 26, FLOOR - 48); g.lineTo(x + 2, FLOOR - 38); g.closePath(); };
  unite(c, [[fl, on ? '#7cf7a0' : '#6b6f86']], 1.15);
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
    else if (o.k === 'plat') srPlat(Math.round(x), o.y);
    else if (o.k === 'roll') srRoll(x, o.y, o.a);
    else if (o.k === 'spring') srSpring(x, o.y, o.sq);
    else if (o.k === 'press') srPress(x, o);
  }
  if (SR && RLV) { const pn = pressNear(1); if (pn) { c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 10);
    label('¡NO SALTES!', W / 2, FLOOR - 118, 17, '#ff9a5c', 'center'); c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,154,92,.18)'; c.fillRect(0, FLOOR - 4, W, 4); } }
  if (SR) for (const cx of cks) { const x = cx - cam; if (x > -30 && x < W + 30) srCheck(x, false); }
  if (SR && ckX && ckX - cam > -30 && ckX - cam < W + 30) srCheck(ckX - cam, true);
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
  if (RLV && goal - cam < W + 40) ART.flag(c, goal - cam, FLOOR, t, '#ff5f7a', 100);
  // HUD
  if (port) { label(String(passed + got), W / 2, 58, 46, '#fff', 'center'); }
  else {
    if (cave) { mine({ y: 24, ph: 0, hp: 2, hit: 0 }, 24); label(`× ${mines}`, 44, 13, 18); }
    else { ART.coin(c, 22, 24, 0, 9); label(SR && srTgt() ? `${got}/${srTgt()}` : `× ${got}`, 38, 13, 18, SR && got >= srTgt() ? '#7cf7a0' : '#fff'); }
    if (SR && RLV) { for (let i = 0; i < srL; i++) ART.heart(c, 24 + i * 20, 48, 1, true);
      if (gemN) { gem(W / 2 - 22, 26); label(`${gems}/${gemN}`, W / 2 - 6, 16, 16, gems >= gemN ? '#7cf7a0' : '#fff'); }
      if (chain > 2) label(`x${mult}`, W / 2, 46, 15, '#ffd24d', 'center');
      if (ckT > 0) { c.globalAlpha = Math.min(1, ckT); label('Punto de control', W / 2, 74, 14, '#7cf7a0', 'center'); c.globalAlpha = 1; } }
    if (RLV) { const rest = Math.max(0, Math.ceil((goal - cam - PX) / T));
      label(`${rest} m`, W - 14, 12, 22, '#fff', 'right');
      label(`Nivel ${lvNum}/${RLV.length}`, W - 14, 38, 13, '#ffc928', 'right'); }
    else label(`${metres()} m`, W - 14, 12, 22, '#fff', 'right');
  }
  if (hover && k.st === 'play') { c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5); label(port ? 'Toca para aletear' : 'Mantén para subir', W / 2, port ? H * 0.62 : H - 110, port ? 20 : 18, '#fff', 'center'); c.globalAlpha = 1; }
}
