/* Plataformas laterales HD con arte propio (ART). T = 32 px; héroe 22×30 px (≈0,7×0,95 casillas).
 * CFG.theme, CFG.abil {wall,dash,sword,grapple,swing}, CFG.enemies (0-1), CFG.spikes (0-1)
 * CFG.mode 'race': carrera a 4 (1 humano + CPU o hasta 4 en la tele) por rondas con cámara que sigue al líder. */
const A = CFG.abil || {}, RACE = CFG.mode === 'race';
let TH = ART.THEMES[CFG.theme || 'meadow'];
let W = 640, H = 360;   /* caja de referencia; en modo fluido pasan a ser el lienzo visible */
const T = 32, MH = 16, HS = 1.24; /* HS: escala de dibujo del héroe (la caja de colisión no cambia) */
const k = Kit({ w: W, h: H, fluid: { min: 0.42, max: 2.6, maxH: 900 }, title: CFG.title, bg: TH.sky[0] }), c = k.ctx;
/* Lienzo elástico: el juego ocupa toda la pantalla y la cámara se ajusta al vuelo. */
k.onSize = (vw, vh) => { W = vw; H = vh; };
/* Cámara vertical: si la pantalla es más alta que el mapa, el suelo queda abajo
   del todo y el cielo llena el resto (nada de metros de tierra bajo los pies). */
const camY = (y) => (H >= MH * T ? MH * T - H : k.clamp(y, Math.min(0, MH * T - H), Math.max(0, MH * T - H)));
W = k.W; H = k.H;
/* Física ajustada a la escala de 32 px */
const G = 2300, JUMP = 830, CUT = 350, RUN = A.swing ? 250 : 285, FALL = 1100, COYOTE = 0.13, BUFFER = 0.15;
let map, MW, p, enemies, coins, anchors, decos, flag, check, checks = [], inv = 0, go = 0, cx = 0, cy = 0, level, lives, score, coinsGot, t, jumpBuf, coyote, rope, dashT, dashCd, swordT, dead, intro, landSq, spawn;
/* ---------- Gancho (docs/GANCHO.md) ------------------------------------------------------
   Todo lo que sigue es exclusivo de pixel-dash (PD). Los otros siete juegos del motor no ven
   ningún cambio: las variables valen 0/[] y las ramas están cerradas por `if (PD)`. */
const PD = CFG.id === 'pixel-dash';
let gems = [], rings = [], chain = 0, chainT = 0, mult = 1, died = false, pickGot = 0, lvPick = 0;
/* Verbos nuevos de pixel-dash: losas que se desmoronan, ascensores, montacargas, bloques a
   compás (plats), sierras sobre raíl (saws), muelles (springs) y el muro que avanza (wall).
   Nada de esto se crea fuera de PD: los otros siete juegos ven arrays vacíos. */
let plats = [], saws = [], springs = [], wall = null, waves = [], rocks = [], bs = null;
let lvT = 0, tgt = 0, lvName = '', lvTip = '', pdWarn = 0, wallGrd = null, wallGrdW = 0;
/* Compás: cada bloque está encendido el 66 % del ciclo y las dos fases van a medio ciclo, así
   que siempre hay un solape en el que las dos están: se cruza a saltitos, no de milagro. */
const QPER = 1.9, QON = 0.66;
const qPh = (b) => { let d = (t % QPER) / QPER - b.ph * 0.5; if (d < 0) d += 1; return d; };
const qOn = (b) => qPh(b) < QON;
const qLeft = (b) => (QON - qPh(b)) * QPER;   /* segundos que le quedan encendido */
const mulOf = (n) => (n >= 16 ? 5 : n >= 10 ? 4 : n >= 6 ? 3 : n >= 3 ? 2 : 1);
/* Partículas y textos de kit.js se pintan en coordenadas de pantalla: en un juego con cámara
   hay que restarle el desplazamiento o salen pegados al borde. */
const bur = (x, y, col, n, v) => k.burst(x - (PD ? cx : 0), y - (PD ? cy : 0), col, n, v);
const flo = (s, x, y, col) => k.float(s, x - (PD ? cx : 0), y - (PD ? cy : 0), col);
function ring(x, y, col, r) { if (rings.length > 14) rings.shift(); rings.push({ x, y, col, r, t: 0.42 }); }
function chainUp(x, y) {
  chain++; chainT = 2.8; const m2 = mulOf(chain);
  if (m2 > mult) { mult = m2; k.combo(mult, x - cx, y - cy - 26); k.punch(0.03); } else k.chime();
}
function chainBreak() { if (chain >= 3) flo('¡Cadena rota!', p.x + 11, p.y - 12, '#ff8a9a'); chain = 0; mult = 1; chainT = 0; k.chainReset(); }
const toGo = () => Math.max(1, Math.round((flag.x - p.x - 11) / T));
const tim = (s) => { s = Math.max(0, Math.round(s)); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s} s`; };
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = ART.OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
const tileAt = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (tx < 0 || tx >= MW) return 1; if (ty < 0 || ty >= MH) return 0; return map[ty][tx]; };
/* ---------- Niveles a mano (platlv.js) --------------------------------------------------
   Si el juego tiene tira de niveles diseñada, el azar no pinta nada: se lee la tira tal cual.
   Los que no la tienen siguen con el generador de siempre. */
const HAND = (typeof PLATLV !== 'undefined' && PLATLV[CFG.id]) || null;
let boss = null;
const TW = (tk) => { const n = +tk.slice(1) || 0; const c0 = tk[0];
  return c0 === 'f' || c0 === 'g' || c0 === 'x' || c0 === 'p' || c0 === 'P' || c0 === 'm' || c0 === 'M' || c0 === 'V' || c0 === 'q' || c0 === 's' ? n
    : c0 === 'u' || c0 === 'd' ? 4 : c0 === 'w' ? 8 : c0 === 'B' ? (PD ? 18 : 14) : 0; };
/* La tira puede venir suelta (los demás juegos) o dentro de un objeto con nombre, consejo y
   tiempos objetivo (pixel-dash). Se lee igual en los dos casos. */
const lvRow = (n0) => HAND[k.clamp(n0, 1, HAND.length) - 1];
function genHand(n0) {
  const row = lvRow(n0), str = typeof row === 'string' ? row : row.s;
  lvName = typeof row === 'string' ? '' : row.n || ''; lvTip = typeof row === 'string' ? '' : row.tip || '';
  tgt = typeof row === 'string' || !row.t ? 0 : row.t[k.dif] || row.t[1] || 0;
  const toks = str.split(' ').filter(Boolean);
  MW = 4 + toks.reduce((a, t) => a + TW(t), 0) + 9;
  map = Array.from({ length: MH }, () => Array(MW).fill(0));
  enemies = []; coins = []; anchors = []; decos = []; gems = []; boss = null;
  plats = []; saws = []; springs = []; waves = []; rocks = []; wall = null; bs = null;
  const col = (cx0, hh) => { for (let y = MH - hh; y < MH; y++) if (cx0 >= 0 && cx0 < MW) map[y][cx0] = 1; };
  let x = 0, h = 3, sx = 0, sw = 4, top = 3;   /* sx/sw/top: lo último colocado (para «e» y «c») */
  const flat = (n) => { sx = x; sw = n; top = h; for (let i = 0; i < n; i++) col(x + i, h); x += n; };
  flat(4);
  const lv01 = Math.min(1, (n0 - 1) / 16);
  for (const tk of toks) {
    const n = +tk.slice(1) || 0, c0 = tk[0];
    if (c0 === 'f') flat(n);
    else if (c0 === 'u') { h = Math.min(10, h + n); flat(4); }
    else if (c0 === 'd') { h = Math.max(2, h - n); flat(4); }
    else if (c0 === 'g') { sx = x; sw = n; top = h; x += n; }
    else if (c0 === 'x') { flat(n); for (let i = 1; i < n - 1; i++) map[MH - h - 1][sx + i] = 3; }
    else if (c0 === 'p') { sx = x; sw = n; top = h + 4; const py = MH - h - 5; for (let i = 0; i < n; i++) if (map[py]) map[py][x + i] = 2; x += n; }
    else if (c0 === 'w') { const nh = h + 5; for (let i = 0; i < 5; i++) col(x + i, h); for (let y = MH - nh - 1; y < MH - h - 3; y++) map[y][x + 1] = 1; x += 5; h = nh; flat(3); }
    /* ---- piezas nuevas de pixel-dash (nunca aparecen en las tiras de los otros juegos) ---- */
    else if (PD && c0 === 'm') { sx = x; sw = n; top = h;   /* grieta con losas que se desmoronan */
      for (let i = 0; i < n; i++) plats.push({ kd: 'm', x: (x + i) * T, y: (MH - h) * T, w: T, h: 15, st: 0, tm: 0, sh: 0 }); x += n; }
    else if (PD && c0 === 'M') { sx = x; sw = n; top = h;   /* ascensor de ida y vuelta */
      plats.push({ kd: 'M', x: x * T, y: (MH - h) * T, w: 3 * T, h: 15, a: x * T, b: (x + n - 3) * T, sp: 96, d: 1, dx: 0, dy: 0 }); x += n; }
    else if (PD && c0 === 'V') { sx = x; sw = n; top = h;   /* montacargas: sube 5 casillas */
      plats.push({ kd: 'V', x: x * T, y: (MH - h) * T, w: 3 * T, h: 15, a: (MH - h - 5) * T, b: (MH - h) * T, sp: 72, d: -1, dx: 0, dy: 0 }); x += n; }
    else if (PD && c0 === 'q') { sx = x; sw = n; top = h;   /* bloques a compás, fases alternas */
      for (let i = 0; i < n; i += 2) plats.push({ kd: 'q', x: (x + i) * T, y: (MH - h) * T, w: Math.min(2, n - i) * T, h: 15, ph: (i / 2) & 1 }); x += n; }
    else if (PD && c0 === 's') { flat(n);                   /* sierra sobre raíl a ras de suelo */
      saws.push({ x: (sx + 0.6) * T, y: (MH - h) * T - 17, a: sx * T + 20, b: (sx + n) * T - 20, sp: (122 + 34 * lv01) * k.D.spd, d: 1, r: 17 }); }
    else if (PD && c0 === '^') springs.push({ x: (sx + sw / 2) * T, y: (MH - top) * T, t: 0 });
    else if (PD && c0 === 'P') { sx = x; sw = n; top = h + 6; const py = MH - h - 7;  /* repisa alta */
      for (let i = 0; i < n; i++) if (map[py]) map[py][x + i] = 2; x += n; }
    else if (PD && c0 === 'E') enemies.push({ x: (sx + Math.max(1, sw - 3)) * T, y: (MH - top) * T - 24, w: 26, h: 24, vy: 0, ground: false, wall: 0,
      vx: 0, sp: (104 + 28 * lv01) * k.D.spd, min: sx * T, max: (sx + sw) * T - 26, alive: true, chase: 1, see: 0, face: -1 });
    else if (PD && c0 === 'W') wall = { x: 0, sp: (128 + 26 * n) * (0.86 + 0.14 * k.D.spd), n };
    else if (c0 === 'a') anchors.push({ x: x * T, y: (MH - h - 6) * T });
    else if (c0 === 'e') enemies.push({ x: (sx + 1) * T, y: (MH - top) * T - 24, w: 26, h: 24, vx: (46 + 26 * lv01) * k.D.spd, min: sx * T, max: (sx + sw) * T - 26, alive: true, fly: TH.enemy === 'bird' });
    else if (c0 === 'c') for (let i = 0; i < 4; i++) coins.push({ x: (sx + sw * (i + 0.5) / 4) * T, y: (MH - top - 1) * T - 8 - Math.sin((i + 0.5) / 4 * Math.PI) * 30 });
    /* C: reguero de monedas a ras de suelo sobre el último tramo (recompensa continua al correr) */
    /* En pixel-dash la ruta llana da poco: el reguero de suelo se queda en 2-4 monedas y el
       grueso del tesoro va en las repisas, las grietas y los compases (riesgo = premio). */
    else if (c0 === 'C') { const nc = PD ? k.clamp(Math.round(sw / 3.4), 2, 4) : k.clamp(Math.round(sw / 1.5), 2, 8); for (let i = 0; i < nc; i++) coins.push({ x: (sx + sw * (i + 0.5) / nc) * T, y: (MH - top) * T - 20 }); }
    /* G: gema del nivel, alta y a la vista: vale 250 y sube la cadena de golpe */
    else if (c0 === 'G') gems.push({ x: (sx + sw / 2) * T, y: (MH - top) * T - 76 });
    else if (c0 === 'k') checks.push({ x: x * T, y: (MH - h) * T, on: false });
    else if (c0 === 'B') {
      if (PD) { flat(18);   /* el Coloso: arena llana de 18 casillas y tres fases telegrafiadas */
        bs = { x: (x - 7) * T, y: (MH - h) * T - 64, w: 64, h: 64, gy: (MH - h) * T - 64, hp: 6, ph: 1, st: 'wait', tm: 1.1, nx: 'charge',
          vx: 0, iv: 0, face: -1, alive: true, sq: 0, min: (x - 17) * T, max: (x - 2) * T - 64 }; }
      else { flat(14); boss = { x: (x - 8) * T, y: (MH - h) * T - 54, w: 54, h: 54, vx: 100 * k.D.spd, min: (x - 13) * T, max: (x - 2) * T - 54, hp: 3, iv: 0, face: -1, alive: true }; }
    }
  }
  for (let i = 0; i < 9; i++) col(x + i, h);
  flag = { x: (x + 4) * T, y: (MH - h) * T, hidden: !!(boss || bs) };
  spawn = { x: 1.5 * T, y: (MH - 3) * T - 40 };
  for (let i = 0; i < 3; i++) if (!enemies.length || i < 1) decos.push({ x: (1.5 + i * 1.2) * T, y: (MH - 3) * T });
}
function gen() {
  if (HAND) return genHand(level);
  const lv = RACE ? Math.min(1, (level - 1) / 5) : Math.min(1, (level - 1) / 12); MW = RACE ? 120 + Math.min(level, 6) * 8 : 62 + Math.min(level, 12) * 16; map = Array.from({ length: MH }, () => Array(MW).fill(0)); enemies = []; coins = []; anchors = []; decos = []; gems = [];
  const col = (x, h) => { for (let y = MH - h; y < MH; y++) if (x >= 0 && x < MW) map[y][x] = 1; };
  const spare = []; // tramos aptos sin enemigo: garantizan un mínimo por nivel
  let x = 0, h = 3; for (; x < (RACE ? 20 : A.swing ? 14 : 7); x++) col(x, h); /* en la carrera, recta inicial de ~2 s sin peligros */
  for (let i = 3; i < 7; i++) coins.push({ x: (i + 0.5) * T, y: (MH - h - 1) * T - 6 - Math.sin((i - 3) / 3 * Math.PI) * 26 }); // arranque con algo que recoger
  if (!A.swing) decos.push({ x: 1.5 * T, y: (MH - h) * T });
  while (x < MW - 10) {
    let nh = A.swing ? k.clamp(h + k.ri(-2, 1), 2, 7) : k.clamp(h + k.ri(-2, lv < 0.25 ? 2 : 3), 2, 8); // en balanceo la isla siguiente no sube más de 1 casilla
    const r = Math.random();
    if (A.swing || r < 0.18 + lv * 0.14) {
      const gw = A.swing ? k.ri(5, lv < 0.25 ? 6 : 7) : A.dash && Math.random() < 0.2 + lv * 0.2 ? k.ri(5, 6) : k.ri(2, lv < 0.25 ? 3 : 4);
      if (A.grapple || A.swing) anchors.push({ x: (x + gw / 2) * T, y: (MH - Math.max(h, nh) - 5) * T }); // anilla sobre la orilla más alta
      for (let i = 0; i < gw; i += 2) coins.push({ x: (x + i + 0.5) * T, y: (MH - h - 3) * T - Math.sin(i / gw * Math.PI) * T * 1.5 });
      x += gw;
    }
    if (A.wall && Math.random() < 0.3 && h < 5) { // chimenea para salto de pared
      nh = h + 5; for (let i = 0; i < 5; i++) col(x + i, h);
      for (let y = MH - nh - 1; y < MH - h - 3; y++) map[y][x + 1] = 1;
      x += 5; for (let i = 0; i < 3; i++) col(x + i, nh); x += 3; h = nh; continue;
    }
    const seg = A.swing ? k.ri(2, 4) : k.ri(4, 9);
    for (let i = 0; i < seg; i++) {
      col(x + i, nh);
      if (CFG.spikes && i > 0 && i < seg - 1 && x > 16 && Math.random() < CFG.spikes * (0.32 + 0.48 * lv) * k.D.rate) map[MH - nh - 1][x + i] = 3;
      else if (Math.random() < 0.22) coins.push({ x: (x + i + 0.5) * T, y: (MH - nh - 1) * T - 6 });
      else if (Math.random() < 0.12 && !A.swing) decos.push({ x: (x + i + 0.5) * T, y: (MH - nh) * T });
    }
    const foe = () => ({ x: (x + 1) * T, y: (MH - nh) * T - 24, w: 26, h: 24, vx: (44 + 50 * lv) * k.D.spd * k.pick([-1, 1]), min: x * T, max: (x + seg) * T - 26, alive: true, fly: TH.enemy === 'bird' });
    if (CFG.enemies && seg >= 5 && x > 16) { if (Math.random() < CFG.enemies * (0.44 + 0.36 * lv) * k.D.rate) enemies.push(foe()); else spare.push(foe()); }
    if (Math.random() < 0.22 && !A.swing && seg >= 4) { const py = MH - nh - 4; for (let i = 1; i < 4; i++) if (map[py] && !map[py][x + i]) map[py][x + i] = 2; for (let i = 1; i < 4; i++) coins.push({ x: (x + i + 0.5) * T, y: (py - 1) * T + 10 }); }
    x += seg; h = nh;
    if (checks.length < 2 && x > MW * (checks.length + 1) / 3) checks.push({ x: (x - 2) * T, y: (MH - h) * T, on: false }); // 1.23: dos puntos de control
  }
  if (CFG.enemies) { k.shuffle(spare); while (enemies.length < 1 + Math.round(2 * lv * k.D.rate) && spare.length) enemies.push(spare.pop()); }
  for (; x < MW; x++) col(x, h); flag = { x: (MW - 5) * T, y: (MH - h) * T };
  spawn = { x: 3 * T, y: (MH - 3) * T - 40 };
}
/* Suelo bajo el personaje: la sombra proyectada se dibuja ahí y se encoge al saltar */
function groundY(o) { const tx = Math.floor((o.x + o.w / 2) / T); for (let ty = Math.max(0, Math.floor((o.y + o.h - 1) / T)); ty < MH; ty++) { const v = map[ty] && map[ty][tx]; if (v === 1 || v === 2 || v === 3) return ty * T; } return null; }
function mkP(s) { return { x: s.x, y: s.y, vx: 0, vy: 0, w: 22, h: 30, face: 1, ground: false, state: 'idle', wall: 0 }; }
function build() { check = null; checks = []; inv = 0; go = 0; gen(); p = mkP(spawn); t = 0; rope = null; dashT = 0; dashCd = 0; swordT = 0; jumpBuf = 0; coyote = 0; dead = 0; intro = 1.6; landSq = 0; cx = 0; cy = camY(MH * T - H);
  if (PD) { lvPick = coins.length + gems.length; pickGot = 0; chain = 0; chainT = 0; mult = 1; died = false; rings.length = 0; k.chainReset();
    lvT = 0; pdWarn = 0; if (wall) wall.x = spawn.x - 430; } }
/* Muerte barata (docs/GANCHO.md §A5): en pixel-dash se reaparece en el punto de control al
   momento y el cupo de intentos es generoso; perder cuesta tiempo, no la partida. */
function reset() { if (RACE) return raceNew(); level = HAND ? k.lv : 1; lives = (PD ? 9 : 4) + k.D.life; score = 0; coinsGot = 0; build(); }
function die() { if (dead || inv > 0) return; dead = PD ? 0.65 : 1.1; p.vy = -600; k.sfx('hurt'); k.shake(8); k.flash('rgba(255,60,80,.35)');
  if (PD) { k.hitstop(0.06); k.punch(0.06); bur(p.x + 11, p.y + 15, '#ff5f7a', 14, 150); if (!died) { died = true; flo('★ perdida', p.x + 11, p.y - 16, '#ff8a9a'); } chainBreak(); } }
function respawn() { lives--;
  /* Casi-victoria: al perder se dice cuánto faltaba, no se deja en «has perdido» a secas. */
  if (lives <= 0) return k.lose(CFG.id, score, 'Sin vidas', PD ? `Te faltaban ${toGo()} m para la bandera · ${pickGot}/${lvPick} tesoros` : `Nivel ${level} · ${coinsGot} moneda${coinsGot === 1 ? '' : 's'}`);
  if (PD) flo(`Te faltan ${toGo()} m`, p.x + 11, p.y - 30, '#ffd166');
  const s = check && check.on ? { x: check.x, y: check.y - 40 } : spawn; p = mkP(s); rope = null; dead = 0; dashT = 0; inv = 1.6 / k.D.dmg;
  /* El muro vuelve detrás del punto de control: reintentar no es reintentar ya perdido. */
  if (PD) { if (wall) wall.x = s.x - 430; waves.length = 0; rocks.length = 0;
    for (const b of plats) if (b.kd === 'm') { b.st = 0; b.tm = 0; b.sh = 0; }
    if (bs && bs.alive && p.x > bs.min - 200) { bs.st = 'wait'; bs.tm = 1.4; bs.x = k.clamp(bs.x, bs.min, bs.max); bs.y = bs.gy; bs.vx = 0; } } }
/* subpasos: a pocos FPS (dt hasta 0,05 s) una caída a 1100 px/s recorre 55 px y atravesaría tablones de 1 casilla */
function collide(o, dt) {
  const n = Math.min(4, Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy)) * dt / 20)) || 1;
  if (n === 1) return collide1(o, dt);
  let g = false, wl = 0; for (let i = 0; i < n; i++) { collide1(o, dt / n); g = g || o.ground; wl = wl || o.wall; } o.ground = g; o.wall = wl;
}
function collide1(o, dt) {
  o.x += o.vx * dt; o.wall = 0;
  for (const yy of [o.y + 2, o.y + o.h / 2, o.y + o.h - 2]) for (const xx of [o.x, o.x + o.w]) if (tileAt(xx, yy) === 1) {
    if (o.vx > 0 || xx === o.x + o.w) { o.x = Math.floor(xx / T) * T - o.w - 0.01; o.wall = 1; } else { o.x = Math.floor(xx / T) * T + T + 0.01; o.wall = -1; } o.vx = 0; }
  const oldB = o.y + o.h; o.y += o.vy * dt; const was = o.ground; o.ground = false;
  for (const xx of [o.x + 2, o.x + o.w - 2]) {
    const tb = tileAt(xx, o.y + o.h), tt = tileAt(xx, o.y);
    if (o.vy >= 0 && (tb === 1 || (tb === 2 && oldB <= Math.floor((o.y + o.h) / T) * T + 2))) { o.y = Math.floor((o.y + o.h) / T) * T - o.h; if (!was && o.vy > 300) { if (o === p) landSq = 0.18; else o.sq = 0.18; k.burst(o.x + o.w / 2, o.y + o.h, '#fff', 6, 70); } o.vy = 0; o.ground = true; }
    else if (o.vy < 0 && tt === 1) { o.y = Math.floor(o.y / T) * T + T; o.vy = 0; }
  }
}
/* ---------- Verbos nuevos de pixel-dash: física ------------------------------------------
   Las piezas móviles NO están en el mapa de casillas: son entidades y se resuelven aparte,
   así el colisionador de siempre (y con él los otros siete juegos) queda intacto. */
const pSolid = (b) => (b.kd === 'm' ? b.st !== 2 : b.kd === 'q' ? qOn(b) : true);
function updPlats(dt) {
  for (const b of plats) {
    b.dx = 0; b.dy = 0;
    if (b.kd === 'm') {
      if (b.st === 1) { b.tm -= dt; if (b.tm <= 0) { b.st = 2; b.tm = 3; bur(b.x + T / 2, b.y + 8, TH.plank, 7, 100); k.sfx('pop'); } }
      else if (b.st === 2) { b.tm -= dt; if (b.tm <= 0) { b.st = 0; bur(b.x + T / 2, b.y + 8, '#fff', 4, 50); } }
    } else if (b.kd === 'M') { const v = b.sp * k.D.spd * b.d * dt; b.x += v; b.dx = v;
      if (b.x <= b.a) { b.x = b.a; b.d = 1; } else if (b.x >= b.b) { b.x = b.b; b.d = -1; } }
    else if (b.kd === 'V') { const v = b.sp * k.D.spd * b.d * dt; b.y += v; b.dy = v;
      if (b.y <= b.a) { b.y = b.a; b.d = 1; } else if (b.y >= b.b) { b.y = b.b; b.d = -1; } }
  }
}
/* Aterrizaje sobre las piezas móviles (solo por arriba, como los tablones) y muelles. */
function ridePlats(pb0) {
  for (const b of plats) {
    if (!pSolid(b)) continue;
    const py0 = b.y - (b.dy || 0);
    if (p.vy >= -1 && p.x + p.w - 5 > b.x && p.x + 5 < b.x + b.w && pb0 <= py0 + 9 && p.y + p.h >= b.y - 0.5) {
      p.y = b.y - p.h; p.vy = 0; p.ground = true;
      if (b.dx) { const nx = p.x + b.dx; if (tileAt(nx, p.y + 6) !== 1 && tileAt(nx + p.w, p.y + 6) !== 1) p.x = nx; }
      if (b.kd === 'm' && b.st === 0) { b.st = 1; b.tm = 0.45; k.sfx('click'); }
    }
  }
  for (const s of springs) if (s.t <= 0 && p.vy >= 0 && Math.abs(p.x + 11 - s.x) < 30 && pb0 <= s.y + 7 && p.y + p.h >= s.y - 2) {
    p.y = s.y - p.h; p.vy = -1330; p.ground = false; s.t = 0.36;
    k.sfx('jump'); k.punch(0.04); bur(s.x, s.y - 6, '#a8e4ff', 12, 150); flo('¡Arriba!', s.x, s.y - 40, '#a8e4ff');
  }
}
/* Perseguidor: te ve, avisa («!») y va a por ti saltando huecos y escalones. Se pisa igual. */
function updChaser(e, dt) {
  const d = p.x - e.x, far = Math.abs(d) > 430;
  if (e.see <= 0 && !far && !dead) { e.see = 0.001; e.warn = 0.75; k.sfx('pop'); }
  if (e.warn > 0) { e.warn -= dt; e.vx = 0; }
  else if (far) e.vx *= 0.9;
  else { e.face = d > 0 ? 1 : -1; e.vx = e.face * e.sp; }
  e.vy = Math.min(e.vy + G * dt, FALL);
  const fx = e.x + (e.vx > 0 ? e.w + 6 : -6);
  if (e.ground && e.vx) {                       /* salta bordes y escalones, no se cae solo */
    const hole = tileAt(fx, e.y + e.h + 6) !== 1 && tileAt(fx, e.y + e.h + T) !== 1;
    if (hole || tileAt(fx, e.y + e.h - 6) === 1) e.vy = -700;
  }
  collide(e, dt);
  if (e.see > 0) e.see += dt;
}
/* Sierras, muelles, muro que avanza, ondas y rocas del jefe. Devuelve true si mata. */
function updPD(dt) {
  if (k.st === 'play') lvT += dt;
  for (const s of springs) if (s.t > 0) s.t -= dt;
  for (const w of saws) {
    w.x += w.sp * w.d * dt;
    if (w.x <= w.a) { w.x = w.a; w.d = 1; } else if (w.x >= w.b) { w.x = w.b; w.d = -1; }
    if (Math.abs(w.x - p.x - 11) < w.r + 8 && Math.abs(w.y - p.y - 16) < w.r + 13) { die(); return true; }
  }
  for (let i = waves.length - 1; i >= 0; i--) { const v = waves[i];
    v.x += v.d * 300 * k.D.spd * dt; v.t -= dt;
    if (v.t <= 0) { waves[i] = waves[waves.length - 1]; waves.pop(); continue; }
    if (Math.abs(v.x - p.x - 11) < 24 && p.y + p.h > v.gy - 30 && p.y + p.h <= v.gy + 8) { die(); return true; }
  }
  for (let i = rocks.length - 1; i >= 0; i--) { const r = rocks[i];
    if (r.w > 0) { r.w -= dt; continue; }
    r.vy = Math.min(r.vy + 1800 * dt, 900); r.y += r.vy * dt;
    if (Math.abs(r.x - p.x - 11) < 22 && Math.abs(r.y - p.y - 16) < 24) { die(); return true; }
    if (r.y >= r.gy) { bur(r.x, r.gy, '#6b5a8f', 9, 120); k.shake(3); rocks[i] = rocks[rocks.length - 1]; rocks.pop(); }
  }
  if (wall) {
    if (intro <= 0 && k.st === 'play') wall.x += wall.sp * dt;
    pdWarn = k.clamp(1 - (p.x - wall.x) / 380, 0, 1);
    if (p.x - wall.x < 26) { inv = 0; die(); return true; }
  }
  if (bs && bs.alive && updBoss(dt)) return true;
  return false;
}
/* El Coloso (nivel 20): tres fases, cada ataque con su aviso. Solo es vulnerable aturdido. */
function updBoss(dt) {
  const b = bs; b.iv -= dt; b.sq = Math.max(0, b.sq - dt);
  if (Math.abs(p.x - b.x) > 620 && b.st === 'wait') { b.tm = 0.8; return false; }
  b.tm -= dt;
  if (b.st === 'wait') {
    b.face = p.x < b.x ? -1 : 1; b.x = k.clamp(b.x + b.face * 46 * dt, b.min, b.max);
    if (b.tm <= 0) { const opts = b.ph === 1 ? ['charge'] : b.ph === 2 ? ['charge', 'slam'] : ['charge', 'slam', 'rocks'];
      b.pick = ((b.pick | 0) + 1) % opts.length; b.nx = opts[b.pick];
      b.st = 'tell'; b.tm = (b.ph === 3 ? 0.62 : 0.82) / k.D.spd; k.sfx('click'); bur(b.x + 32, b.y + b.h, '#c9bfff', 6, 70); }
  } else if (b.st === 'tell') {
    if (b.tm <= 0) {
      if (b.nx === 'charge') { b.st = 'charge'; b.vx = b.face * (320 + 62 * b.ph) * k.D.spd; b.tm = 2.6; k.sfx('shoot'); }
      else if (b.nx === 'slam') { b.st = 'slam'; b.vy = -850; b.vx = k.clamp(p.x - b.x, -230, 230) * 0.9; b.tm = 3; k.sfx('jump'); }
      else { b.st = 'rocks'; b.tm = 1.25; k.sfx('shoot');
        for (let i = 0; i < 4; i++) rocks.push({ x: k.clamp(p.x + 11 + (i - 1.5) * 84, b.min, b.max + 64), y: b.gy - 300, gy: b.gy + 60, vy: 0, w: 0.72 }); }
    }
  } else if (b.st === 'charge') {
    b.x += b.vx * dt;
    if (b.x <= b.min || b.x >= b.max || b.tm <= 0) { b.x = k.clamp(b.x, b.min, b.max); b.st = 'stun'; b.tm = 1.45 - 0.14 * b.ph;
      b.sq = 0.3; k.shake(7); k.sfx('hit'); bur(b.x + 32, b.y + b.h, '#8a7fb0', 12, 150); }
  } else if (b.st === 'slam') {
    b.vy += 2100 * dt; b.y += b.vy * dt; b.x = k.clamp(b.x + b.vx * dt, b.min, b.max);
    if (b.y >= b.gy) { b.y = b.gy; b.vy = 0; b.st = 'stun'; b.tm = 1.3 - 0.1 * b.ph; b.sq = 0.3;
      k.shake(9); k.punch(0.06); k.sfx('explode'); bur(b.x + 32, b.y + b.h, '#8a7fb0', 16, 180);
      waves.push({ x: b.x + 32, d: -1, t: 2.6, gy: b.gy + 64 }); waves.push({ x: b.x + 32, d: 1, t: 2.6, gy: b.gy + 64 }); }
  } else if (b.st === 'rocks') { if (b.tm <= 0) { b.st = 'stun'; b.tm = 1.1; } }
  else if (b.st === 'stun') { if (b.tm <= 0) { b.st = 'wait'; b.tm = 0.95; } }
  const hit = p.x + p.w > b.x + 10 && p.x < b.x + b.w - 10 && p.y + p.h > b.y + 12 && p.y < b.y + b.h - 4;
  if (hit && b.st === 'stun' && b.iv <= 0 && p.vy > 0 && p.y + p.h - b.y < 34) {
    b.hp--; b.iv = 0.8; p.vy = -700; const np = b.hp > 4 ? 1 : b.hp > 2 ? 2 : 3;
    k.hitstop(0.07); k.punch(0.07); k.shake(6); k.sfx('hit'); score += 300;
    ring(b.x + 32, b.y + 24, '#ff5f7a', 46); bur(b.x + 32, b.y + 22, '#ff5f7a', 22, 200); chainUp(b.x + 32, b.y);
    if (b.hp <= 0) { b.alive = false; flag.hidden = false; k.sfx('win'); k.confetti(); k.reward('¡VENCIDO!', '#ffd166'); flo('¡El Coloso cae!', b.x + 32, b.y, '#ffc928'); }
    else { if (np !== b.ph) { b.ph = np; k.reward(`¡FASE ${np}!`, '#ff8a9a'); k.flash('rgba(255,120,150,.3)'); b.st = 'wait'; b.tm = 1.1; }
      else k.reward(`¡${b.hp} MÁS!`, '#ffd166'); }
    return false;
  }
  if (hit && b.st !== 'stun' && b.iv <= 0) { die(); return true; }
  return false;
}
function upd(dt) {
  if (!k.gate(reset)) return;
  t += dt; intro -= dt; inv -= dt; landSq = Math.max(0, landSq - dt);
  if (PD) { if (chainT > 0) { chainT -= dt; if (chainT <= 0) { chain = 0; mult = 1; k.chainReset(); } }
    for (let i = rings.length - 1; i >= 0; i--) { rings[i].t -= dt; if (rings[i].t <= 0) { rings[i] = rings[rings.length - 1]; rings.pop(); } } }
  if (dead) { dead -= dt; p.vy += G * dt; p.y += p.vy * dt; if (dead <= 0) respawn(); return; }
  let L = k.held.has('left'), R = k.held.has('right'), J = k.hit.has('up') || k.hit.has('a'), JH = k.held.has('up') || k.held.has('a'), B = k.hit.has('b'), BH = k.held.has('b');
  if (A.grapple && !A.swing) { if (k.ptr.down) BH = true; if (k.ptr.hit) B = true; }
  if (A.swing) { if (J || B || k.ptr.hit || t > 3) go = 1; R = !!go; // 1.23: la carrera automática espera al primer toque (o 3 s)
    BH = BH || JH || k.ptr.down; B = B || J || k.ptr.hit; J = false; }
  dashCd -= dt; swordT -= dt; jumpBuf -= dt; coyote -= dt;
  if (J) jumpBuf = BUFFER;
  if (A.dash && B && dashCd <= 0) { dashT = 0.16; dashCd = 0.55; k.sfx('shoot'); }
  if (A.sword && (B || k.tap) && swordT <= -0.12) { swordT = 0.22; k.sfx('shoot'); }
  if ((A.grapple || A.swing) && B && !rope) { const an = anchors.filter((a) => a.y < p.y && Math.abs(a.x - p.x) < 330 && (a.x - p.x) * (A.swing ? 1 : p.face) > -60).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (an) { rope = { a: an, len: Math.hypot(an.x - p.x, an.y - p.y) }; k.sfx('jump'); } }
  if (rope && !BH) { rope = null; p.vy -= 200; p.vx *= 1.15; }
  const ax = (R ? 1 : 0) - (L ? 1 : 0); if (ax) p.face = ax;
  if (dashT > 0) { dashT -= dt; p.vx = p.face * 820; p.vy = 0; if (Math.random() < 0.6) k.burst(p.x + 11, p.y + 15, TH.hero === '#1a1530' ? '#b98cff' : TH.hero, 1, 30); }
  else if (rope) p.vx += ax * 500 * dt;
  else { const tgt = ax * RUN; p.vx += (tgt - p.vx) * Math.min(1, dt * (p.ground ? 18 : 8)); }
  const sliding = A.wall && !p.ground && p.wall && p.vy > 0 && ax === p.wall;
  if (dashT <= 0) p.vy = Math.min(p.vy + G * dt, sliding ? 170 : FALL);
  if (p.ground) coyote = COYOTE;
  if (jumpBuf > 0 && coyote > 0) { p.vy = -JUMP; jumpBuf = 0; coyote = 0; k.sfx('jump'); landSq = -0.15; k.burst(p.x + 11, p.y + 30, '#fff', 5, 60); }
  else if (jumpBuf > 0 && A.wall && !p.ground && (tileAt(p.x - 3, p.y + 15) === 1 || tileAt(p.x + p.w + 3, p.y + 15) === 1)) { const s = tileAt(p.x - 3, p.y + 15) === 1 ? 1 : -1; p.vy = -780; p.vx = s * 380; p.face = s; jumpBuf = 0; k.sfx('jump'); k.burst(p.x + (s > 0 ? 0 : 22), p.y + 15, '#fff', 6, 70); }
  if (!JH && p.vy < -CUT && !rope && !A.swing) p.vy = -CUT;
  if (rope) { const dx = p.x + 11 - rope.a.x, dy = p.y + 15 - rope.a.y, d = Math.hypot(dx, dy); if (d > rope.len) { const nx = dx / d, ny = dy / d, vd = p.vx * nx + p.vy * ny; if (vd > 0) { p.vx -= vd * nx; p.vy -= vd * ny; } p.x = rope.a.x + nx * rope.len - 11; p.y = rope.a.y + ny * rope.len - 15; } rope.len = Math.max(60, rope.len - 50 * dt); }
  const pb0 = p.y + p.h;
  if (PD) updPlats(dt);
  collide(p, dt);
  if (PD) { ridePlats(pb0); if (updPD(dt)) return; }
  p.state = !p.ground ? (sliding ? 'wall' : p.vy < 0 ? 'jump' : 'fall') : Math.abs(p.vx) > 30 ? 'run' : 'idle';
  // enemigos
  for (const e of enemies) if (e.alive) { if (PD && e.chase) updChaser(e, dt); else { e.x += e.vx * dt; if (e.x < e.min || e.x > e.max) { e.vx *= -1; e.x = k.clamp(e.x, e.min, e.max);
      /* Remate: al darse la vuelta se aplasta un instante y levanta polvo (nada cambia de golpe). */
      if (PD) { e.tn = 0.2; bur(e.x + 13, e.y + 24, TH.foe, 3, 45); } } }
    if (PD && e.tn > 0) e.tn = Math.max(0, e.tn - dt);
    const ey = e.fly ? e.y - 20 + Math.sin(t * 2 + e.min) * 16 : e.y, hit = p.x + p.w > e.x + 6 && p.x < e.x + e.w - 6 && p.y + p.h > ey + 7 && p.y < ey + e.h - 2;
    if (swordT > 0 && Math.abs(e.x + 13 - (p.x + 11 + p.face * 22)) < 30 && Math.abs(ey + 12 - p.y - 15) < 28) { e.alive = false; score += 100; k.burst(e.x + 13, ey + 12, '#fff', 16); k.float('+100', e.x + 13, ey); k.sfx('hit'); continue; }
    if (hit) { if ((p.vy > 0 && p.y + p.h - ey < 14) || dashT > 0) { e.alive = false; p.vy = -620;
      if (PD) { chainUp(e.x + 13, ey); const g2 = 100 * mult; score += g2; k.hitstop(0.05); k.punch(0.045); landSq = 0.24;
        bur(e.x + 13, ey + 12, TH.foe, 18, 160); ring(e.x + 13, ey + 12, TH.foe, 26); flo('+' + g2, e.x + 13, ey - 4, mult > 1 ? '#ffd166' : '#fff'); k.sfx('hit'); }
      else { score += 100; k.burst(e.x + 13, ey + 12, '#fff', 16); k.float('+100', e.x + 13, ey); k.sfx('hit'); } } else return die(); } }
  /* Jefe del nivel 20: tres impactos (pisotón o espada) y cae la muralla que tapa la bandera. */
  if (boss && boss.alive) {
    boss.iv -= dt;
    const dir = Math.abs(p.x - boss.x) < 420 ? Math.sign(p.x - boss.x) || 1 : Math.sign(boss.vx) || 1;
    boss.x += Math.abs(boss.vx) * dir * dt;
    if (boss.x < boss.min || boss.x > boss.max) boss.x = k.clamp(boss.x, boss.min, boss.max);
    boss.face = dir;
    const bh = p.x + p.w > boss.x + 8 && p.x < boss.x + boss.w - 8 && p.y + p.h > boss.y + 10 && p.y < boss.y + boss.h - 4;
    const sw = swordT > 0 && Math.abs(boss.x + boss.w / 2 - (p.x + 11 + p.face * 24)) < 48 && Math.abs(boss.y + boss.h / 2 - p.y - 15) < 46;
    if (boss.iv <= 0 && (sw || (bh && (p.vy > 0 && p.y + p.h - boss.y < 22)) || (bh && dashT > 0))) {
      boss.hp--; boss.iv = 0.9; if (!sw) p.vy = -640;
      if (PD) { k.hitstop(0.07); k.punch(0.06); ring(boss.x + boss.w / 2, boss.y + 24, '#ff5f7a', 44); bur(boss.x + boss.w / 2, boss.y + 20, '#ff5f7a', 22, 190); k.reward(boss.hp > 0 ? `¡${boss.hp} MÁS!` : '¡VENCIDO!', '#ffd166'); if (boss.hp > 0) flo(`Quedan ${boss.hp}`, boss.x + boss.w / 2, boss.y - 10, '#ffd166'); }
      else k.burst(boss.x + boss.w / 2, boss.y + 20, '#fff', 20);
      k.shake(6); k.sfx('hit'); score += 250;
      if (boss.hp <= 0) { boss.alive = false; flag.hidden = false; k.sfx('win'); k.confetti(); flo('¡Derrotado!', boss.x + boss.w / 2, boss.y, '#ffc928'); }
    } else if (bh && boss.iv <= 0) return die();
  }
  for (const co of coins) if (!co.got && Math.abs(co.x - p.x - 11) < 22 && Math.abs(co.y - p.y - 15) < 26) { co.got = true; coinsGot++;
    if (PD) { pickGot++; chainUp(co.x, co.y); const g2 = 10 * mult; score += g2; flo('+' + g2, co.x, co.y - 6, mult > 1 ? '#ffd166' : '#fff'); ring(co.x, co.y, '#ffd23d', 17); bur(co.x, co.y, '#ffc928', 7, 90); }
    else { score += 10; k.sfx('coin'); k.burst(co.x, co.y, '#ffc928', 6, 80); } }
  /* Gema: la recompensa gorda del nivel, con su propio remate. */
  if (PD) for (const gm of gems) if (!gm.got && Math.abs(gm.x - p.x - 11) < 26 && Math.abs(gm.y - p.y - 15) < 30) {
    gm.got = true; pickGot++; chainUp(gm.x, gm.y); const g2 = 250 * mult; score += g2;
    k.reward('¡GEMA!', '#7cf7a0'); flo('+' + g2, gm.x, gm.y - 30, '#7cf7a0'); k.hitstop(0.06); k.punch(0.07); k.shake(4); k.sfx('win');
    bur(gm.x, gm.y, '#7cf7a0', 22, 170); ring(gm.x, gm.y, '#7cf7a0', 34); ring(gm.x, gm.y, '#ffffff', 22); }
  for (const xx of [p.x + 7, p.x + p.w - 7]) if (tileAt(xx, p.y + p.h - 3) === 3) return die();
  if (p.y > MH * T + 60) { inv = 0; return die(); }
  for (const q of checks) if (!q.on && p.x > q.x - 10) { q.on = true; check = q;
    if (PD) { k.reward('¡CONTROL!', '#7cf7a0'); flo('Punto de control', q.x + 8, q.y - 62, '#7cf7a0'); k.chime(6); ring(q.x + 8, q.y - 40, '#7cf7a0', 40); bur(q.x + 8, q.y - 40, '#7cf7a0', 14, 120); }
    else { k.sfx('coin'); k.float('¡Punto de control!', q.x, q.y - 70, '#7cf7a0'); } }
  if (!flag.hidden && p.x > flag.x - 10) {
    score += 500 * level + coinsGot * 5;
    /* Estrellas: 1 terminar · 2 dentro del tiempo objetivo · 3 además todos los tesoros y
       sin recibir un golpe. Los tesoros que faltan están siempre en la ruta arriesgada. */
    if (PD) { const fast = !tgt || lvT <= tgt, all = pickGot >= lvPick;
      const st = fast ? (all && !died ? 3 : 2) : 1;
      k.reward('¡META!', '#ffd166'); k.punch(0.08); k.shake(5); bur(flag.x + 8, flag.y - 70, '#ffd166', 26, 210);
      const det = [`${tim(lvT)}${tgt ? ` / objetivo ${tim(tgt)}` : ''}`, `${pickGot}/${lvPick} tesoros`, died ? 'te han dado' : 'sin un rasguño'];
      const fal = []; if (!fast) fal.push(`acabar en ${tim(tgt)}`); if (!all) fal.push('todos los tesoros'); if (died) fal.push('sin recibir daño');
      const nxt = fal.length ? `<br>Para 3★ te falta: ${fal.join(', ')}` : '';
      return k.levelDone(score, det.join(' · ') + nxt, { stars: st }); }
    if (HAND) return k.levelDone(score, `${coinsGot} moneda${coinsGot === 1 ? '' : 's'} · ${lives} vida${lives === 1 ? '' : 's'}`);
    k.sfx('win'); k.confetti(); level++; const s = score, lv = lives, cg = coinsGot; build(); score = s; lives = lv; coinsGot = cg; return; }
  cx += (k.clamp(p.x - W * 0.38 + p.vx * 0.25, 0, Math.max(0, MW * T - W)) - cx) * Math.min(1, dt * 6);
  cy += (camY(p.y - H * 0.55) - cy) * Math.min(1, dt * 5);
}
/* ---------- Arte propio del gancho (solo pixel-dash) --------------------------------------
   Todo cacheado: la gema y el faro de la meta se pintan una vez en su lienzo y luego solo se
   copian. Ni un degradado ni un shadowBlur dentro del bucle. */
const RES = Math.min(2, window.devicePixelRatio || 1);
const mkCv = (w2, h2) => { const cv = document.createElement('canvas'); cv.width = Math.ceil(w2 * RES); cv.height = Math.ceil(h2 * RES); const g = cv.getContext('2d'); g.scale(RES, RES); return [cv, g]; };
let gemCv = null, beaconCv = null, coinFr = null;
/* Con el reguero de monedas hay muchas más en pantalla: se hornean 16 fotogramas del giro una
   sola vez y luego cada moneda es un drawImage (de 0,089 ms por moneda a ~0,008). */
const CFRM = 16, TAU2 = 6.28318;
function coinFrames() {
  if (coinFr) return coinFr;
  coinFr = [];
  for (let i = 0; i < CFRM; i++) { const tt = (i / CFRM) * TAU2 / 4, r = mkCv(28, 28), g = r[1];
    g.translate(14, 14 - Math.sin(tt * 3) * 2); ART.coin(g, 0, 0, tt, 8); coinFr.push(r[0]); }
  return coinFr;
}
function pdCoin(x, y) {
  const fr = coinFrames(); let a = (t * 4 + x * 0.05) % TAU2; if (a < 0) a += TAU2;
  c.drawImage(fr[((a / TAU2) * CFRM | 0) % CFRM], x - 14, y - 14 + Math.sin(t * 3 + x) * 2, 28, 28);
}
function gemSprite() {
  if (gemCv) return gemCv;
  const S = 36, r = mkCv(S, S), g = r[1]; g.translate(S / 2, S / 2); g.lineJoin = 'round';
  /* Pieza única (REMASTER §8): un solo trazado, relleno una vez y contorneado una vez;
     las facetas son sombra propia recortada dentro, nunca otro contorno. */
  const P = new Path2D(); P.moveTo(0, -15); P.lineTo(11.5, -4.5); P.lineTo(0, 15.5); P.lineTo(-11.5, -4.5); P.closePath();
  g.fillStyle = '#4fd8a0'; g.fill(P); g.lineWidth = 2.6; g.strokeStyle = ART.OUT; g.stroke(P);
  g.save(); g.clip(P);
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(0, -15); g.lineTo(11.5, -4.5); g.lineTo(0, -1.5); g.closePath(); g.fill();
  g.fillStyle = 'rgba(8,60,42,.34)'; g.beginPath(); g.moveTo(0, 15.5); g.lineTo(11.5, -4.5); g.lineTo(0, -1.5); g.closePath(); g.fill();
  g.fillStyle = 'rgba(8,60,42,.16)'; g.beginPath(); g.moveTo(0, 15.5); g.lineTo(-11.5, -4.5); g.lineTo(0, -1.5); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(-4.4, -7.4, 2, 3.2, -0.5, 0, 6.283); g.fill();
  g.restore(); gemCv = r[0]; return gemCv;
}
function beaconSprite() {
  if (beaconCv) return beaconCv;
  const r = mkCv(56, 220), g = r[1], gr = g.createLinearGradient(0, 220, 0, 0);
  gr.addColorStop(0, 'rgba(255,209,102,.5)'); gr.addColorStop(0.5, 'rgba(255,209,102,.15)'); gr.addColorStop(1, 'rgba(255,209,102,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(12, 220); g.lineTo(44, 220); g.lineTo(33, 0); g.lineTo(23, 0); g.closePath(); g.fill();
  beaconCv = r[0]; return beaconCv;
}
/* ---- Sprites de los verbos nuevos. Todos se hornean una vez (REMASTER §8: cada objeto es un
   trazado continuo, relleno una vez y contorneado una vez; el detalle interior va recortado). ---- */
let pdSpr = null;
function pdSprites() {
  if (pdSpr) return pdSpr;
  const O = ART.OUT, s = {};
  /* losa agrietada: una sola pieza de piedra con la grieta pintada dentro (sin contorno propio) */
  { const r = mkCv(T, 16), g = r[1]; const P = new Path2D();
    P.moveTo(1.5, 4); P.quadraticCurveTo(T / 2, 0.5, T - 1.5, 4); P.lineTo(T - 2.5, 12.5);
    P.quadraticCurveTo(T / 2, 15.5, 2.5, 12.5); P.closePath();
    g.fillStyle = '#9a7048'; g.fill(P); g.lineWidth = 2.2; g.lineJoin = 'round'; g.strokeStyle = O; g.stroke(P);
    g.save(); g.clip(P);
    g.fillStyle = 'rgba(255,255,255,.26)'; g.fillRect(0, 2, T, 3.5);
    g.fillStyle = 'rgba(40,22,10,.34)'; g.fillRect(0, 10, T, 6);
    g.strokeStyle = 'rgba(40,22,10,.6)'; g.lineWidth = 1.6; g.beginPath();
    g.moveTo(9, 2); g.lineTo(13, 8); g.lineTo(10, 14); g.moveTo(22, 3); g.lineTo(19, 9); g.lineTo(24, 14); g.stroke();
    g.restore(); s.crack = r[0]; }
  /* plataforma móvil: cuerpo único de metal con luz arriba y sombra abajo */
  { const w2 = 3 * T, r = mkCv(w2, 18), g = r[1]; const P = new Path2D();
    P.moveTo(3, 2); P.lineTo(w2 - 3, 2); P.quadraticCurveTo(w2 - 1, 2, w2 - 2, 6);
    P.lineTo(w2 - 8, 15); P.quadraticCurveTo(w2 - 10, 17, w2 - 13, 17); P.lineTo(13, 17);
    P.quadraticCurveTo(10, 17, 8, 15); P.lineTo(2, 6); P.quadraticCurveTo(1, 2, 3, 2); P.closePath();
    g.fillStyle = '#7f8ba8'; g.fill(P); g.lineWidth = 2.4; g.lineJoin = 'round'; g.strokeStyle = O; g.stroke(P);
    g.save(); g.clip(P);
    g.fillStyle = 'rgba(255,255,255,.34)'; g.fillRect(0, 1, w2, 4);
    g.fillStyle = 'rgba(20,16,40,.3)'; g.fillRect(0, 10, w2, 8);
    g.fillStyle = '#ffc928'; for (let i = 0; i < 5; i++) g.fillRect(10 + i * 18, 5.5, 9, 3);
    g.restore(); s.plat = r[0]; }
  /* bloque a compás: un cubo de energía, una pieza */
  { const w2 = 2 * T, r = mkCv(w2, 18), g = r[1]; const P = new Path2D();
    P.moveTo(4, 2); P.lineTo(w2 - 4, 2); P.quadraticCurveTo(w2 - 1, 2, w2 - 3, 9);
    P.lineTo(w2 - 6, 16); P.lineTo(6, 16); P.lineTo(3, 9); P.quadraticCurveTo(1, 2, 4, 2); P.closePath();
    g.fillStyle = '#6f63d8'; g.fill(P); g.lineWidth = 2.4; g.lineJoin = 'round'; g.strokeStyle = O; g.stroke(P);
    g.save(); g.clip(P);
    g.fillStyle = 'rgba(200,214,255,.55)'; g.fillRect(0, 1, w2, 4);
    g.fillStyle = 'rgba(20,16,40,.28)'; g.fillRect(0, 10, w2, 8);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(w2 / 2 - 8, 6, 16, 2.4);
    g.restore(); s.beat = r[0]; }
  /* sierra: disco dentado en una sola pieza, con el eje pintado dentro */
  { const R2 = 19, r = mkCv(R2 * 2 + 4, R2 * 2 + 4), g = r[1]; g.translate(R2 + 2, R2 + 2);
    const P = new Path2D();
    for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, rr = 17 - (i % 4 < 2 ? 0 : 4.5);
      if (i) P.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else P.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    P.closePath();
    g.fillStyle = '#c3ccdd'; g.fill(P); g.lineWidth = 2; g.lineJoin = 'round'; g.strokeStyle = O; g.stroke(P);
    g.save(); g.clip(P);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(-4, -5, 11, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(30,26,56,.34)'; g.beginPath(); g.arc(4, 6, 12, 0, 6.283); g.fill();
    g.fillStyle = '#6b7590'; g.beginPath(); g.arc(0, 0, 5.2, 0, 6.283); g.fill();
    g.restore(); s.saw = r[0]; }
  /* muelle: cuerpo único con la espiral dibujada dentro */
  { const r = mkCv(52, 30), g = r[1]; const P = new Path2D();
    P.moveTo(7, 28); P.lineTo(9, 13); P.quadraticCurveTo(10, 6, 26, 6); P.quadraticCurveTo(42, 6, 43, 13);
    P.lineTo(45, 28); P.closePath();
    g.fillStyle = '#4fb6e8'; g.fill(P); g.lineWidth = 2.6; g.lineJoin = 'round'; g.strokeStyle = O; g.stroke(P);
    g.save(); g.clip(P);
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(0, 4, 52, 6);
    g.fillStyle = 'rgba(12,44,72,.32)'; for (let i = 0; i < 3; i++) g.fillRect(0, 14 + i * 5, 52, 2.6);
    g.restore(); s.spring = r[0]; }
  /* roca del jefe: un canto rodado, una pieza */
  { const r = mkCv(40, 40), g = r[1]; g.translate(20, 20); const P = new Path2D();
    const pts = [[0, -16], [12, -11], [16, 2], [8, 15], [-6, 16], [-15, 5], [-13, -8]];
    P.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) P.lineTo(pts[i][0], pts[i][1]); P.closePath();
    g.fillStyle = '#7a6c9c'; g.fill(P); g.lineWidth = 2.4; g.lineJoin = 'round'; g.strokeStyle = O; g.stroke(P);
    g.save(); g.clip(P);
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(-5, -7, 11, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(24,18,48,.34)'; g.beginPath(); g.arc(6, 8, 13, 0, 6.283); g.fill();
    g.restore(); s.rock = r[0]; }
  pdSpr = s; return s;
}
function star(x, y, r, on) {
  c.beginPath();
  for (let q = 0; q < 10; q++) { const a = -Math.PI / 2 + q * Math.PI / 5, rr2 = q % 2 ? r * 0.46 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  c.closePath(); ART.fillOut(c, on ? '#ffd166' : '#443e63', 1.6);
}
/* Fondo vivo + jerarquía de color: un velo apaga cielo y decorado (lo jugable queda como lo
   más saturado de la pantalla) y encima flotan polen y pájaros con paralaje propio. */
function pdSky() {
  c.fillStyle = 'rgba(22,17,50,.2)'; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,248,214,.5)';
  for (let i = 0; i < 20; i++) {
    const sp = 0.16 + (i % 4) * 0.07, per = W + 60;
    let mx = (i * 713.3 + t * (13 + (i % 3) * 9) - cx * sp) % per; if (mx < 0) mx += per;
    const my = ((i * 227.7) % Math.max(60, H - 60)) + 30 + Math.sin(t * 0.9 + i) * 12;
    c.beginPath(); c.arc(mx - 30, my, 1.4 + (i % 3) * 0.7, 0, 6.283); c.fill();
  }
  c.strokeStyle = 'rgba(38,34,78,.34)'; c.lineWidth = 2; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const per = W + 160; let bx = (i * 280 + t * 20 - cx * 0.1) % per; if (bx < 0) bx += per; bx -= 80;
    const by = H * 0.12 + i * 22 + Math.sin(t * 0.7 + i * 2) * 7, fl = Math.sin(t * 6 + i * 1.7) * 4;
    c.beginPath(); c.moveTo(bx - 7, by + fl); c.lineTo(bx, by); c.lineTo(bx + 7, by + fl); c.stroke();
  }
}
/* ---- Pintado de los verbos nuevos, en coordenadas de mundo (dentro de la cámara) ---- */
function drwPD() {
  const S = pdSprites(), L = cx - 60, R2 = cx + W + 60;
  /* raíles de las sierras: el peligro se ve venir desde lejos */
  c.lineWidth = 3; c.strokeStyle = 'rgba(26,21,48,.5)'; c.lineCap = 'round';
  for (const w of saws) if (w.b > L && w.a < R2) { c.beginPath(); c.moveTo(w.a, w.y); c.lineTo(w.b, w.y); c.stroke(); }
  for (const b of plats) {
    if (b.x + b.w < L || b.x > R2) continue;
    if (b.kd === 'm') {
      if (b.st === 2) { c.globalAlpha = 0.22; c.drawImage(S.crack, b.x, b.y, T, 16); c.globalAlpha = 1; continue; }
      const sh = b.st === 1 ? Math.sin(b.tm * 62) * 2.2 : 0;   /* aviso: tiembla antes de caer */
      c.save(); c.translate(b.x + sh, b.y); if (b.st === 1) { c.globalAlpha = 0.55 + 0.45 * Math.sin(b.tm * 42); }
      c.drawImage(S.crack, 0, 0, T, 16); c.restore(); c.globalAlpha = 1;
    } else if (b.kd === 'q') {
      const on = qOn(b), fd = qLeft(b);
      if (!on) { c.globalAlpha = qPh(b) > 0.86 ? 0.3 + 0.3 * Math.sin(t * 34) : 0.16;   /* aviso de que vuelve */
        c.drawImage(S.beat, b.x, b.y, b.w, 18); c.globalAlpha = 1; continue; }
      c.globalAlpha = fd < 0.45 ? 0.55 + 0.45 * Math.sin(t * 34) : 1;
      c.drawImage(S.beat, b.x, b.y, b.w, 18); c.globalAlpha = 1;
    } else { c.drawImage(S.plat, b.x, b.y - 1, b.w, 18);
      /* sombra de contacto bajo el ascensor: se lee a qué altura va */
      c.globalAlpha = 0.18; c.fillStyle = ART.OUT; c.fillRect(b.x + 6, b.y + 17, b.w - 12, 3); c.globalAlpha = 1; }
  }
  for (const s of springs) if (s.x > L && s.x < R2) { const q = s.t > 0 ? Math.sin((s.t / 0.36) * Math.PI) : 0;
    c.save(); c.translate(s.x, s.y); c.scale(1 + q * 0.2, 1 - q * 0.45); c.drawImage(S.spring, -26, -28, 52, 30); c.restore(); }
  for (const w of saws) if (w.x > L && w.x < R2) { c.save(); c.translate(w.x, w.y); c.rotate(t * 9 * w.d); c.drawImage(S.saw, -21, -21, 42, 42); c.restore(); }
  /* aviso del perseguidor: «!» antes de arrancar */
  for (const e of enemies) if (e.alive && e.warn > 0 && e.x > L && e.x < R2) {
    const q = Math.min(1, (0.75 - e.warn) * 8); c.save(); c.translate(e.x + 13, e.y - 16 - q * 6); c.scale(q, q);
    label('!', 0, -10, 26, '#ff5f7a', 'center'); c.restore(); }
  if (bs && bs.alive && bs.x > L - 140 && bs.x < R2 + 140) drwBoss(S);
  for (const v of waves) { const q = k.clamp(v.t / 2.6, 0, 1);
    c.globalAlpha = 0.35 + 0.45 * q; c.fillStyle = '#c9bfff';
    c.beginPath(); c.moveTo(v.x - 20, v.gy); c.lineTo(v.x, v.gy - 26 - 6 * Math.sin(t * 20)); c.lineTo(v.x + 20, v.gy); c.closePath(); c.fill();
    c.globalAlpha = 1; }
  for (const r of rocks) {
    if (r.w > 0) { const q = 1 - r.w / 0.72;   /* telegrafía: la sombra crece en el suelo */
      c.globalAlpha = 0.2 + 0.5 * q; c.fillStyle = '#ff5f7a';
      c.beginPath(); c.ellipse(r.x, r.gy - 2, 16 + 8 * q, 5 + 2 * q, 0, 0, 6.283); c.fill(); c.globalAlpha = 1; continue; }
    c.save(); c.translate(r.x, r.y); c.rotate(r.y * 0.01); c.drawImage(S.rock, -20, -20, 40, 40); c.restore();
  }
  if (wall) {                                   /* muro de sombra que avanza desde atrás */
    const x1 = wall.x, x0 = Math.min(x1 - 40, cx - 80), y1 = MH * T + 200;
    c.fillStyle = 'rgba(18,12,40,.93)'; c.fillRect(x0, -400, x1 - x0, y1 + 400);
    c.fillStyle = '#4a3a86';
    for (let y = -400; y < y1; y += 28) { const w2 = 10 + 7 * Math.sin(y * 0.09 + t * 5);
      c.beginPath(); c.moveTo(x1, y); c.lineTo(x1 + w2, y + 14); c.lineTo(x1, y + 28); c.closePath(); c.fill(); }
    c.fillStyle = 'rgba(160,151,255,.4)'; c.fillRect(x1 - 4, -400, 4, y1 + 400);
  }
}
function drwBoss(S) {
  const b = bs, tell = b.st === 'tell', stun = b.st === 'stun';
  const sq = b.sq > 0 ? Math.sin((b.sq / 0.3) * Math.PI) * 0.18 : tell ? -0.12 * Math.sin((1 - b.tm) * 9) : 0;
  c.save(); c.translate(b.x + b.w / 2, b.y + b.h); c.scale(1 + sq, 1 - sq); c.translate(-(b.x + b.w / 2), -(b.y + b.h));
  if (b.iv > 0 && Math.floor(t * 20) % 2) c.globalAlpha = 0.5;
  ART.enemy(c, TH.enemy === 'bird' ? 'knight' : TH.enemy, b.x, b.y, b.w, b.h, { t, face: b.face || -1, big: 1 });
  c.globalAlpha = 1; c.restore();
  if (tell) { const q = k.clamp(1 - b.tm / 0.9, 0, 1);   /* aviso: «!» y aro que se cierra */
    c.strokeStyle = '#ff5f7a'; c.lineWidth = 3; c.globalAlpha = 0.85;
    c.beginPath(); c.arc(b.x + b.w / 2, b.y + b.h / 2, 70 - q * 34, 0, 6.283); c.stroke(); c.globalAlpha = 1;
    label('!', b.x + b.w / 2, b.y - 34, 28, '#ff5f7a', 'center'); }
  if (stun) { c.fillStyle = '#ffd166';           /* aturdido: estrellitas y flecha de «pisa aquí» */
    for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; c.beginPath(); c.arc(b.x + b.w / 2 + Math.cos(a) * 20, b.y - 12 + Math.sin(a) * 6, 3.2, 0, 6.283); c.fill(); }
    const dy = Math.sin(t * 7) * 4; c.beginPath();
    c.moveTo(b.x + b.w / 2, b.y - 26 + dy); c.lineTo(b.x + b.w / 2 - 10, b.y - 42 + dy); c.lineTo(b.x + b.w / 2 + 10, b.y - 42 + dy); c.closePath();
    ART.fillOut(c, '#7cf7a0', 2); }
}
function drw() {
  ART.background(c, TH, W, H, cx, cy, t);
  /* Modo fluido: si la pantalla es más alta que el mapa, el subsuelo continúa hasta el borde. */
  if (cy + H > MH * T) { c.fillStyle = TH.groundD; c.fillRect(0, MH * T - cy, W, cy + H - MH * T + 2); }
  if (PD) { c.save(); c.translate(-Math.round(cx), -Math.round(cy)); for (const d of decos) if (d.x > cx - 60 && d.x < cx + W + 60) ART.deco(c, TH, d.x, d.y, T); c.restore(); pdSky(); }
  c.save(); c.translate(-Math.round(cx), -Math.round(cy));
  const x0 = Math.max(0, Math.floor(cx / T) - 1), x1 = Math.min(MW, x0 + Math.ceil(W / T) + 3);
  if (!PD) for (const d of decos) if (d.x > cx - 60 && d.x < cx + W + 60) ART.deco(c, TH, d.x, d.y, T);
  for (let y = 0; y < MH; y++) for (let x = x0; x < x1; x++) { const v = map[y][x]; if (!v) continue;
    if (v === 1) ART.tile(c, TH, 'ground', x * T, y * T, T, { top: !map[y - 1] || map[y - 1][x] !== 1, left: x > 0 && map[y][x - 1] !== 1, right: x < MW - 1 && map[y][x + 1] !== 1 });
    else ART.tile(c, TH, v === 2 ? 'plank' : 'spike', x * T, y * T, T, {}); }
  if (PD) drwPD();
  for (const a of anchors) ART.anchor(c, a.x, a.y, t);
  for (const q of checks) ART.flag(c, q.x, q.y, t, q.on ? '#7cf7a0' : '#8a86b5', 60);
  /* Faro de la meta: se ve desde lejos, así la bandera nunca es una sorpresa. */
  if (PD && !flag.hidden) { c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 2.2); c.drawImage(beaconSprite(), flag.x - 20, flag.y - 220, 56, 220); c.globalAlpha = 1; }
  ART.flag(c, flag.x, flag.y, t, '#ff5f7a', 110);
  for (const co of coins) if (!co.got && co.x > cx - 20 && co.x < cx + W + 20) {
    if (PD) { if (co.ap == null) co.ap = t; const a2 = t - co.ap;
      if (a2 < 0.3) { const s2 = a2 < 0.18 ? (a2 / 0.18) * 1.15 : 1.15 - ((a2 - 0.18) / 0.12) * 0.15;
        c.save(); c.translate(co.x, co.y); c.scale(s2, s2); c.translate(-co.x, -co.y); pdCoin(co.x, co.y); c.restore(); continue; }
      pdCoin(co.x, co.y); continue; }
    ART.coin(c, co.x, co.y, t); }
  if (PD) for (const gm of gems) if (!gm.got && gm.x > cx - 40 && gm.x < cx + W + 40) {
    const by2 = gm.y + Math.sin(t * 2.6 + gm.x * 0.01) * 5;
    ART.glow(c, gm.x, by2, 26, '#7cf7a0', 0.22 + 0.1 * Math.sin(t * 3));
    c.save(); c.translate(gm.x, by2); c.rotate(Math.sin(t * 1.6 + gm.x * 0.01) * 0.16);
    const s2 = 1 + 0.06 * Math.sin(t * 3.4); c.scale(s2, 1 / s2); c.drawImage(gemSprite(), -18, -18, 36, 36); c.restore(); }
  for (const e of enemies) if (e.alive && e.x > cx - 40 && e.x < cx + W + 40) {
    const ey2 = e.fly ? e.y - 20 + Math.sin(t * 2 + e.min) * 16 : e.y;
    if (PD && e.tn > 0) { const q2 = Math.sin((e.tn / 0.2) * Math.PI) * 0.16;
      c.save(); c.translate(e.x + e.w / 2, ey2 + e.h); c.scale(1 + q2, 1 - q2); c.translate(-(e.x + e.w / 2), -(ey2 + e.h));
      ART.enemy(c, TH.enemy, e.x, ey2, e.w, e.h, { t, face: e.vx > 0 ? 1 : -1 }); c.restore(); }
    else ART.enemy(c, TH.enemy, e.x, ey2, e.w, e.h, { t, face: e.vx > 0 ? 1 : -1 }); }
  if (boss && boss.alive && Math.floor(boss.iv > 0 ? t * 12 : 0) % 2 === 0) ART.enemy(c, TH.enemy === 'bird' ? 'knight' : TH.enemy, boss.x, boss.y, boss.w, boss.h, { t, face: boss.face || -1, big: 1 });
  if (rope) { c.strokeStyle = ART.OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(rope.a.x, rope.a.y); c.lineTo(p.x + 11, p.y + 12); c.stroke(); c.strokeStyle = '#e6d3a3'; c.lineWidth = 2; c.stroke(); }
  if (dashT > 0) { c.globalAlpha = 0.35; ART.hero(c, p.x + 11 - p.face * 18, p.y + p.h, HS, { face: p.face, state: 'run', t, col: TH.hero }); c.globalAlpha = 1; }
  const sq = landSq > 0 ? landSq : landSq < 0 ? landSq : 0;
  if (inv > 0 && !dead && Math.floor(t * 12) % 2) c.globalAlpha = 0.45;
  ART.hero(c, p.x + 11, p.y + p.h, HS, { face: p.face, state: dead ? 'fall' : p.state, t, col: TH.hero, squash: sq, gy: dead ? null : groundY(p), sword: A.sword ? (swordT > 0 ? -1.6 + (0.22 - swordT) * 14 : 0.5) : 0 }); c.globalAlpha = 1;
  if (swordT > 0) { c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 4; c.beginPath(); c.arc(p.x + 11, p.y + 12, 30, p.face > 0 ? -1.3 : 1.8, p.face > 0 ? 1.1 : 4.2); c.stroke(); }
  if (PD) {
    /* Anillos de recogida: nada desaparece de golpe, todo deja su onda. */
    for (const rg of rings) { const q2 = 1 - rg.t / 0.42; c.globalAlpha = (rg.t / 0.42) * 0.85; c.strokeStyle = rg.col; c.lineWidth = 1 + 3 * (1 - q2); c.beginPath(); c.arc(rg.x, rg.y, rg.r * (0.25 + q2 * 0.9), 0, 6.283); c.stroke(); }
    c.globalAlpha = 1;
    /* Carácter: con la cadena alta el héroe va rodeado de chispas. */
    if (mult >= 3 && !dead) { c.fillStyle = mult >= 5 ? '#ff5fa2' : mult >= 4 ? '#ffd166' : '#7cf7a0';
      for (let i = 0; i < 3; i++) { const a2 = t * 5 + i * 2.094; c.beginPath(); c.arc(p.x + 11 + Math.cos(a2) * 20, p.y + 8 + Math.sin(a2 * 1.3) * 12, 2.6, 0, 6.283); c.fill(); } }
  }
  c.restore();
  ART.vignette(c, W, H);
  // HUD
  /* Pantalla estrecha (móvil en vertical): las monedas bajan a una segunda fila para no
     meterse bajo los botones de pausa y sonido, que van centrados arriba. */
  const nar = W < 560, hx = nar ? 20 : 22;
  /* Con 9 intentos no caben nueve corazones: en pixel-dash va uno con su cuenta. */
  if (PD) { ART.heart(c, hx, 22, 1.25, lives > 0); label(`× ${lives}`, hx + 13, 13, 17, lives <= 2 ? '#ff8a9a' : '#fff'); }
  else for (let i = 0; i < 4 + k.D.life; i++) ART.heart(c, hx + i * 24, 22, 1.25, i < lives);
  const cX = PD ? (nar ? hx + 8 : hx + 62) : nar ? hx + 8 : hx + (4 + k.D.life) * 24 + 12, cY = nar ? 50 : 22;
  ART.coin(c, cX, cY, 0, 8); label(PD ? `× ${pickGot}/${lvPick}` : `× ${coinsGot}`, cX + 12, cY - 9, 17, '#fff');
  label(`${score}`, W - 12, 8, 22, '#fff', 'right');
  label(HAND ? `Nivel ${level}/${HAND.length}` : `Nivel ${level}`, W - 12, 34, 13, '#ffc928', 'right');
  if (PD) {
    /* Estrellas en vivo: empiezas con las tres y se apagan si las pierdes. Se ve todo el rato
       qué te falta (tesoros) y qué te juegas (no recibir un golpe). */
    const sy = 62, fast = !tgt || lvT <= tgt, all = pickGot >= lvPick;
    for (let i = 0; i < 3; i++) star(W - 18 - (2 - i) * 20, sy, 8, i === 0 ? true : i === 1 ? fast : fast && all && !died);
    if (tgt) label(tim(Math.max(0, tgt - lvT)), W - 68, sy - 8, 13, fast ? (tgt - lvT < 8 ? '#ffd166' : '#7cf7a0') : '#ff8a9a', 'right');
    /* Cadena y multiplicador, con la barra que se vacía: engancha y duele perderla. */
    if (chain >= 2) {
      const cw = 128, cbx = (W - cw) / 2, cby = H - 54, cc = mult >= 5 ? '#ff5fa2' : mult >= 4 ? '#ffd166' : mult >= 3 ? '#7cf7a0' : '#a097ff';
      ART.rr(c, cbx, cby, cw, 28, 10); c.fillStyle = 'rgba(26,21,48,.8)'; c.fill(); c.lineWidth = 2; c.strokeStyle = cc; c.stroke();
      label(`CADENA ${chain}`, cbx + 10, cby + 5, 13, '#e8e4f4');
      label(`×${mult}`, cbx + cw - 10, cby + 3, 17, cc, 'right');
      c.fillStyle = cc; c.fillRect(cbx + 6, cby + 22, (cw - 12) * k.clamp(chainT / 2.8, 0, 1), 3);
    }
    /* Meta siempre visible: cuánto llevas del nivel y cuántos metros faltan. */
    const mby = H - 18, mbx = 18, mbw = W - 40, pr = k.clamp((p.x - spawn.x) / Math.max(1, flag.x - spawn.x), 0, 1);
    ART.rr(c, mbx - 3, mby - 3, mbw + 6, 14, 7); c.fillStyle = 'rgba(26,21,48,.75)'; c.fill();
    ART.rr(c, mbx, mby, Math.max(8, mbw * pr), 8, 4); c.fillStyle = flag.hidden ? '#ff5f7a' : '#7cf7a0'; c.fill();
    for (const q of checks) { const qx = mbx + mbw * k.clamp((q.x - spawn.x) / Math.max(1, flag.x - spawn.x), 0, 1); c.fillStyle = q.on ? '#7cf7a0' : '#8a86b5'; c.fillRect(qx - 1, mby - 2, 2, 12); }
    c.beginPath(); c.arc(mbx + mbw * pr, mby + 4, 6, 0, 6.283); ART.fillOut(c, TH.hero, 2);
    c.beginPath(); c.moveTo(mbx + mbw + 6, mby + 10); c.lineTo(mbx + mbw + 6, mby - 9); c.lineTo(mbx + mbw + 16, mby - 5); c.lineTo(mbx + mbw + 6, mby - 1); c.closePath(); ART.fillOut(c, flag.hidden ? '#8a86b5' : '#ff5f7a', 2);
    label(flag.hidden ? '¡Al jefe!' : `${toGo()} m`, W - 20, mby - 22, 13, '#ffe9a8', 'right');
    /* Amenaza: el borde izquierdo se tiñe según lo cerca que viene el muro (nunca sorprende). */
    if (wall && pdWarn > 0.02) {
      if (!wallGrd || wallGrdW !== W) { wallGrdW = W; wallGrd = c.createLinearGradient(0, 0, W * 0.45, 0);
        wallGrd.addColorStop(0, 'rgba(58,26,96,.75)'); wallGrd.addColorStop(1, 'rgba(58,26,96,0)'); }
      c.globalAlpha = pdWarn; c.fillStyle = wallGrd; c.fillRect(0, 0, W * 0.45, H); c.globalAlpha = 1;
      if (pdWarn > 0.5) label('¡EL MURO!', 18, H / 2 - 10, 16, '#ff8a9a'); }
  }
  /* Barra del jefe: solo mientras sigue en pie, centrada arriba y sin pisar el marcador. */
  if (boss && boss.alive && p.x > boss.min - 320) { const bw2 = Math.min(220, W - 180), bx2 = (W - bw2) / 2, by2 = (PD || nar) ? 76 : 14; /* PD: bajo los botones de pausa/sonido del reproductor */
    ART.rr(c, bx2 - 3, by2 - 3, bw2 + 6, 16, 8); c.fillStyle = 'rgba(26,21,48,.75)'; c.fill();
    c.fillStyle = '#ff5f7a'; c.fillRect(bx2, by2, bw2 * k.clamp(boss.hp / 3, 0, 1), 10);
    label('Jefe', bx2 + bw2 / 2, by2 + 16, 12, '#ffd7df', 'center'); }
  /* Barra del Coloso: una casilla por impacto y la fase en curso. */
  if (PD && bs && bs.alive && p.x > bs.min - 420) { const bw2 = Math.min(230, W - 170), bx2 = (W - bw2) / 2, by2 = 76, seg = bw2 / 6;
    ART.rr(c, bx2 - 4, by2 - 4, bw2 + 8, 18, 9); c.fillStyle = 'rgba(26,21,48,.8)'; c.fill();
    for (let i = 0; i < 6; i++) { c.fillStyle = i < bs.hp ? (bs.ph === 3 ? '#ff5f7a' : bs.ph === 2 ? '#ffa15f' : '#ffd166') : 'rgba(255,255,255,.12)';
      c.fillRect(bx2 + i * seg + 1.5, by2, seg - 3, 10); }
    label(`El Coloso · fase ${bs.ph}`, bx2 + bw2 / 2, by2 + 15, 12, '#ffd7df', 'center'); }
  if (intro > 0 && k.st === 'play') { c.globalAlpha = Math.min(1, intro);
    const iw = PD && lvName ? Math.min(W - 24, Math.max(260, lvTip.length * 7 + 40)) : 220, ih = PD && lvName ? 92 : 64;
    ART.rr(c, W / 2 - iw / 2, H / 2 - 38, iw, ih, 18); c.fillStyle = 'rgba(26,21,48,.85)'; c.fill();
    label(PD && lvName ? `${level}. ${lvName}` : `Nivel ${level}`, W / 2, H / 2 - 30, PD && lvName ? 24 : 30, '#fff', 'center');
    if (PD && lvName) { /* el consejo encoge hasta caber: en 360 px de ancho no se sale nunca */
      let ts = 12; const fnt = (n) => `800 ${n}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
      c.font = fnt(ts); while (ts > 8 && c.measureText(lvTip).width > iw - 22) { ts--; c.font = fnt(ts); }
      label(lvTip, W / 2, H / 2 - 2 + (12 - ts) / 2, ts, '#cfc8ea', 'center');
      if (tgt) label(`Objetivo 2★: ${tim(tgt)}`, W / 2, H / 2 + 22, 13, '#ffc928', 'center'); }
    else label(CFG.title, W / 2, H / 2 + 4, 14, '#ffc928', 'center');
    c.globalAlpha = 1; }
  gfx();
}
/* ---------- Remaster R1: capas para el compositor WebGL2 de kit.js ----------
   relief() = relieve del escenario y las figuras (de ahí salen las normales y la oclusión de
   contacto); glow() = lo que brilla (sol, monedas, banderas, estela del esprint, espada);
   light() = el sol del tema, el aura del héroe y las monedas cercanas. Sin WebGL2 no hace nada. */
function gfx() {
  if (!k.gfx) return;
  const ox = -Math.round(cx), oy = -Math.round(cy), KL = ART.keyLight(TH, W, H, cy);
  k.relief((g) => {
    g.save(); g.translate(ox, oy);
    const x0 = Math.max(0, Math.floor(cx / T) - 1), x1 = Math.min(MW, x0 + Math.ceil(W / T) + 3);
    for (let y = 0; y < MH; y++) for (let x = x0; x < x1; x++) { const v = map[y][x]; if (!v) continue;
      g.fillStyle = v === 1 ? '#8c8c8c' : v === 2 ? '#b4b4b4' : '#a0a0a0';
      g.fillRect(x * T, y * T, T, v === 1 ? T : T * 0.45);
      if (v === 1 && (!map[y - 1] || map[y - 1][x] !== 1)) { g.fillStyle = '#a8a8a8'; g.fillRect(x * T, y * T, T, 7); } }
    g.fillStyle = '#c4c4c4';
    for (const a of anchors) { g.beginPath(); g.arc(a.x, a.y, 9, 0, 6.283); g.fill(); }
    for (const co of coins) if (!co.got && co.x > cx - 20 && co.x < cx + W + 20) { g.beginPath(); g.arc(co.x, co.y, 9, 0, 6.283); g.fill(); }
    if (PD) { g.fillStyle = '#b0b0b0';
      for (const b of plats) if (pSolid(b) && b.x + b.w > cx - 40 && b.x < cx + W + 40) g.fillRect(b.x, b.y, b.w, 16);
      g.fillStyle = '#c8c8c8';
      for (const w of saws) if (w.x > cx - 40 && w.x < cx + W + 40) { g.beginPath(); g.arc(w.x, w.y, 17, 0, 6.283); g.fill(); }
      for (const s of springs) if (s.x > cx - 40 && s.x < cx + W + 40) g.fillRect(s.x - 24, s.y - 24, 48, 24);
      if (bs && bs.alive) g.fillRect(bs.x + 4, bs.y + 4, bs.w - 8, bs.h - 4); }
    g.fillStyle = '#d2d2d2';
    for (const e of enemies) if (e.alive && e.x > cx - 40 && e.x < cx + W + 40) g.fillRect(e.x - 3, e.fly ? e.y - 20 : e.y, e.w + 6, e.h);
    g.fillStyle = '#f0f0f0'; if (!dead) g.fillRect(p.x + 2, p.y + 1, 18, p.h - 1); // cuerpo compacto del cartoon: la caja de relieve cubre la nueva silueta
    g.restore();
  });
  k.glow((g) => {
    ART.glow(g, KL.x, KL.y, 50, KL.col, 0.34);
    g.save(); g.translate(ox, oy);
    for (const co of coins) if (!co.got && co.x > cx - 20 && co.x < cx + W + 20) ART.glow(g, co.x, co.y, 15, '#ffd23d', 0.9);
    for (const gm of gems) if (!gm.got && gm.x > cx - 40 && gm.x < cx + W + 40) ART.glow(g, gm.x, gm.y, 26, '#7cf7a0', 0.95);
    ART.glow(g, flag.x + 8, flag.y - 78, 24, '#ff7f96', 0.55);
    if (PD) { for (const b of plats) if (b.kd === 'q' && qOn(b) && b.x + b.w > cx - 40 && b.x < cx + W + 40) ART.glow(g, b.x + b.w / 2, b.y + 8, 26, '#9c8cff', 0.5);
      for (const s of springs) if (s.x > cx - 40 && s.x < cx + W + 40) ART.glow(g, s.x, s.y - 14, 22, '#a8e4ff', 0.5);
      for (const r of rocks) if (r.w > 0) ART.glow(g, r.x, r.gy - 4, 20, '#ff5f7a', 0.5);
      if (bs && bs.alive && bs.st === 'tell') ART.glow(g, bs.x + 32, bs.y + 30, 48, '#ff5f7a', 0.6); }
    for (const q of checks) if (q.on) ART.glow(g, q.x + 8, q.y - 44, 20, '#7cf7a0', 0.6);
    if (dashT > 0) ART.glow(g, p.x + 11 - p.face * 14, p.y + 14, 34, '#a8e4ff', 0.8);
    if (swordT > 0) ART.glow(g, p.x + 11 + p.face * 26, p.y + 12, 28, '#ffffff', 0.85);
    if (inv > 0 && !dead) ART.glow(g, p.x + 11, p.y + 14, 26, '#ffd9e6', 0.35 + 0.25 * Math.sin(t * 22));
    g.restore();
  });
  k.light(KL.x, KL.y, KL.r * 0.5, KL.col, KL.i * 0.32);
  const hx = p.x + 11 - cx, hy = p.y + 14 - cy;
  k.light(hx, hy, 80, TH.hero, dashT > 0 ? 0.45 : 0.14);
  let n = 0;
  for (const co of coins) { if (n >= 4) break; if (co.got) continue; const sx = co.x - cx; if (sx < -14 || sx > W + 14 || Math.abs(co.x - p.x) > 240) continue; n++; k.light(sx, co.y - cy, 54, '#ffc928', 0.34); }
  if (swordT > 0) k.light(hx + p.face * 26, hy - 2, 70, '#ffffff', 0.7);
}
/* ---------- Carrera de Plataformas (CFG.mode 'race'): 4 corredores en el mismo nivel, la cámara sigue al que va primero.
   Quien se queda fuera por la izquierda, cae a un foso o toca pinchos/enemigos pierde la ronda. Gana la ronda quien toca
   la bandera o el último en pie; a 3 rondas, podio. A salta (mantén = más alto), B empujón; pisar a un rival lo aturde.
   La CPU sigue la ruta leyendo las columnas que tiene delante (fosos, escalones, pinchos, enemigos) y mejora con tus victorias. ---------- */
const RWIN = 3, RTH = ['meadow', 'jungle', 'dusk', 'snow', 'castle', 'sky'];
let R = null, rcpu = 0; try { rcpu = Math.max(0, Math.min(5, +localStorage.getItem('cpu:' + CFG.id) || 0)); } catch (e) {}
function raceNew() { const pl = k.players(4); R = { rs: pl.map((q) => ({ pl: q.p, col: q.color, name: q.cpu ? 'CPU' : q.name, cpu: q.cpu, wins: 0 })), round: 0 }; raceRound(); }
function raceRound() {
  R.round++; level = R.round; TH = ART.THEMES[RTH[(R.round - 1) % RTH.length]]; check = null; checks = []; gen(); check = null;
  t = 0; cx = 0; cy = camY(MH * T - H); R.between = 0; R.win = null; R.scroll = 0; R.msg = `Ronda ${R.round}`; R.msgT = 2.4; R.cd = true; R.order = [];
  const ord = R.rs.map((r, i) => i).sort((a, b) => R.rs[b].wins - R.rs[a].wins || a - b); /* quien va ganando sale detrás */
  ord.forEach((ri, slot) => { const r = R.rs[ri]; Object.assign(r, mkP({ x: (0.6 + slot * 1.3) * T, y: (MH - 3) * T - 30 }), { out: false, dead: 0, jb: 0, co: 0, dashT: 0, dashCd: 0, stun: 0, sq: 0, ai: { miss: 0, hold: 0, lag: 0 }, face: 1 }); });
}
const colTop = (col) => { if (col < 0 || col >= MW) return 0; for (let y = 0; y < MH; y++) if (map[y][col] === 1) return y; return MH; };
function raceCpu(r, dt) {
  const lv = k.clamp(rcpu + k.D.cpu, 0, 5), ai = r.ai, fx = r.x + r.w, col = Math.floor((r.x + r.w / 2) / T), my = colTop(col);
  let jump = false, dash = false; ai.hold -= dt;
  if (r.ground) {
    for (let c2 = col + 1; c2 <= col + 3; c2++) {
      const tp = colTop(c2), edge = c2 * T - fx, spike = tp < MH && tp > 0 && map[tp - 1][c2] === 3;
      const need = tp === MH ? 6 : tp < my ? 26 : spike ? 22 : -1; /* foso: saltar en el borde; escalón: un poco antes */
      if (need >= 0) { if (ai.lag <= 0) ai.lag = Math.random() < Math.max(0.04, 0.17 - lv * 0.009) ? k.rnd(-18, 22) : k.rnd(-4, 4); if (edge < need + ai.lag) { jump = true; ai.lag = 0; } break; }
    }
    for (const e of enemies) if (e.alive && e.x > r.x && e.x - fx < 46 && Math.abs(e.y - r.y) < 40) jump = true;
  }
  if (jump) ai.hold = 0.32;
  for (const o of R.rs) if (o !== r && !o.out && !o.dead && o.x > r.x && o.x - fx < 18 && Math.abs(o.y - r.y) < 20 && r.dashCd <= 0 && Math.random() < 0.014 + lv * 0.005) dash = true;
  return { L: false, R: true, J: jump, JH: ai.hold > 0 || (!r.ground && r.vy < 0 && ai.hold > -0.05), B: dash, sp: 0.86 + lv * 0.009 };
}
function raceOut(r, why) { if (r.out) return; r.out = true; R.order.push(r); k.sfx('lose'); k.float(why, k.clamp(r.x, cx + 40, cx + W - 40), k.clamp(r.y, cy + 60, cy + H - 30), r.col); }
function raceUpdate(dt) {
  if (!k.gate(reset)) return;
  t += dt; R.msgT -= dt;
  if (R.cd) { R.cd = false; k.count(3); }
  if (k.counting()) return;
  if (R.between) { R.between -= dt; if (R.between <= 0) { const ch = R.rs.find((r) => r.wins >= RWIN); if (ch) return raceEnd(ch); raceRound(); } }
  const live = R.rs.filter((r) => !r.out);
  for (const r of R.rs) {
    if (r.out) continue; r.sq = Math.max(0, r.sq - dt);
    if (r.dead) { r.dead -= dt; r.vy += G * dt; r.y += r.vy * dt; if (r.dead <= 0) raceOut(r, '¡Fuera!'); continue; }
    let I;
    if (r.cpu) I = raceCpu(r, dt);
    else { I = { L: k.pheld(r.pl, 'left'), R: k.pheld(r.pl, 'right'), J: k.phit(r.pl, 'up') || k.phit(r.pl, 'a'), JH: k.pheld(r.pl, 'up') || k.pheld(r.pl, 'a'), B: k.phit(r.pl, 'b'), sp: 1 };
      if (r.pl === 0 && !k.party) { if (k.ptr.hit) I.J = true; if (k.ptr.down) { I.JH = true; } } }
    if (R.between) I = { L: false, R: false, J: false, JH: false, B: false, sp: 1 };
    r.jb -= dt; r.co -= dt; r.dashCd -= dt; r.stun -= dt;
    if (r.stun > 0) I = { L: false, R: false, J: false, JH: false, B: false, sp: 1 };
    if (I.J) r.jb = BUFFER;
    if (I.B && r.dashCd <= 0) { r.dashT = 0.14; r.dashCd = 1.3; k.sfx('shoot'); }
    const ax = (I.R ? 1 : 0) - (I.L ? 1 : 0); if (ax) r.face = ax;
    if (r.dashT > 0) { r.dashT -= dt; r.vx = r.face * 640; r.vy = Math.min(r.vy, 0); if (Math.random() < 0.6) k.burst(r.x + 11, r.y + 15, r.col, 1, 30); }
    else { const tgt = ax * RUN * I.sp; r.vx += (tgt - r.vx) * Math.min(1, dt * (r.ground ? 18 : 8)); }
    if (r.dashT <= 0) r.vy = Math.min(r.vy + G * dt, FALL);
    if (r.ground) r.co = COYOTE;
    if (r.jb > 0 && r.co > 0) { r.vy = -JUMP; r.jb = 0; r.co = 0; k.sfx('jump'); k.burst(r.x + 11, r.y + 30, '#fff', 4, 60); }
    if (!I.JH && r.vy < -CUT) r.vy = -CUT;
    collide(r, dt);
    r.state = !r.ground ? (r.vy < 0 ? 'jump' : 'fall') : Math.abs(r.vx) > 30 ? 'run' : 'idle';
    /* enemigos y pinchos */
    for (const e of enemies) if (e.alive) { const ey = e.fly ? e.y - 20 + Math.sin(t * 2 + e.min) * 16 : e.y;
      if (r.x + r.w > e.x + 3 && r.x < e.x + e.w - 3 && r.y + r.h > ey + 4 && r.y < ey + e.h) {
        if ((r.vy > 0 && r.y + r.h - ey < 14) || r.dashT > 0) { e.alive = false; r.vy = -620; k.burst(e.x + 13, ey + 12, '#fff', 14); k.sfx('hit'); }
        else { r.dead = 0.9; r.vy = -560; k.sfx('hurt'); k.burst(r.x + 11, r.y + 15, r.col, 14, 150); } } }
    if (!r.dead) for (const xx of [r.x + 4, r.x + r.w - 4]) if (tileAt(xx, r.y + r.h - 3) === 3) { r.dead = 0.9; r.vy = -560; k.sfx('hurt'); k.burst(r.x + 11, r.y + 15, r.col, 14, 150); break; }
    for (const co of coins) if (!co.got && Math.abs(co.x - r.x - 11) < 18 && Math.abs(co.y - r.y - 15) < 22) { co.got = true; if (!r.cpu) k.sfx('coin'); k.burst(co.x, co.y, '#ffc928', 5, 70); }
    if (r.y > MH * T + 40) raceOut(r, '¡Al foso!');
    if (!R.between && r.x > flag.x - 10) { R.win = r; r.wins++; R.between = 2.4; R.msg = `¡${r.cpu ? 'CPU' : r.name} llega a la meta!`; R.msgT = 2.4; k.sfx('win'); k.confetti(r.col, 60); }
  }
  /* choques entre corredores: pisar la cabeza aturde; de lado se empujan (el empujón con B lanza lejos) */
  for (const a of live) for (const b of live) if (a !== b && !a.dead && !b.dead && a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h) {
    if (a.vy > 0 && a.y + a.h - b.y < 14 && a.y < b.y) { a.vy = -560; b.stun = 0.6; b.vy = Math.max(b.vy, 200); b.sq = 0.25; k.sfx('pop'); k.burst(b.x + 11, b.y, '#fff', 8, 100); k.float('¡Plof!', b.x + 11, b.y - 16, a.col); }
    else { const s = a.x < b.x ? -1 : 1, f = a.dashT > 0 || b.dashT > 0 ? 420 : 60; a.vx = s * f * (b.dashT > 0 ? 1 : 0.5); if (b.dashT > 0 && a.dashT <= 0) { a.stun = 0.25; a.vy = -260; k.sfx('hit'); } }
  }
  /* cámara: sigue al líder y avanza sola despacio; quien queda a la izquierda del borde, fuera */
  const lead = live.filter((r) => !r.dead).sort((a, b) => b.x - a.x)[0];
  if (lead && !R.between) {
    R.scroll = Math.min(128, 20 + t * 2.3); const tx = k.clamp(Math.max(lead.x - W * 0.6, cx + R.scroll * dt), 0, Math.max(0, MW * T - W));
    cx += Math.max(0, tx - cx) * Math.min(1, dt * 5); cy += (camY(lead.y - H * 0.55) - cy) * Math.min(1, dt * 4);
    for (const r of live) if (!r.dead && r.x + r.w < cx - 2) raceOut(r, '¡Fuera de cámara!');
  }
  for (const e of enemies) if (e.alive) { e.x += e.vx * dt; if (e.x < e.min || e.x > e.max) { e.vx *= -1; e.x = k.clamp(e.x, e.min, e.max); } }
  const still = R.rs.filter((r) => !r.out);
  if (!R.between && still.length <= 1 && R.rs.length > 1) {
    const w = still[0] || R.order[R.order.length - 1]; R.win = w; w.wins++; R.between = 2.4; R.msg = `¡${w.cpu ? 'CPU' : w.name} aguanta más!`; R.msgT = 2.4; k.sfx('win'); k.confetti(w.col, 50);
  }
}
function raceEnd(ch) {
  if (!k.party) { const hu = R.rs.find((r) => r.pl === 0); rcpu = Math.max(0, Math.min(5, rcpu + (ch === hu ? 1 : -1))); try { localStorage.setItem('cpu:' + CFG.id, rcpu); } catch (e) {} }
  const head = !k.party ? (ch.pl === 0 ? '¡Has ganado la carrera!' : 'Gana la CPU') : ch.cpu ? 'Gana la CPU' : `¡Gana ${ch.name}!`;
  k.podium(R.rs.map((r) => ({ p: r.pl, score: r.wins, name: r.cpu ? 'CPU' : r.name })), { head, noTie: true, fmt: (n) => `${n} ronda${n === 1 ? '' : 's'}` });
}
function raceDraw() {
  ART.background(c, TH, W, H, cx, cy, t);
  /* Modo fluido: si la pantalla es más alta que el mapa, el subsuelo continúa hasta el borde. */
  if (cy + H > MH * T) { c.fillStyle = TH.groundD; c.fillRect(0, MH * T - cy, W, cy + H - MH * T + 2); }
  c.save(); c.translate(-Math.round(cx), -Math.round(cy));
  const x0 = Math.max(0, Math.floor(cx / T) - 1), x1 = Math.min(MW, x0 + Math.ceil(W / T) + 3);
  for (const d of decos) if (d.x > cx - 60 && d.x < cx + W + 60) ART.deco(c, TH, d.x, d.y, T);
  for (let y = 0; y < MH; y++) for (let x = x0; x < x1; x++) { const v = map[y][x]; if (!v) continue;
    if (v === 1) ART.tile(c, TH, 'ground', x * T, y * T, T, { top: !map[y - 1] || map[y - 1][x] !== 1, left: x > 0 && map[y][x - 1] !== 1, right: x < MW - 1 && map[y][x + 1] !== 1 });
    else ART.tile(c, TH, v === 2 ? 'plank' : 'spike', x * T, y * T, T, {}); }
  ART.flag(c, flag.x, flag.y, t, '#ffc928', 110);
  for (const co of coins) if (!co.got && co.x > cx - 20 && co.x < cx + W + 20) ART.coin(c, co.x, co.y, t);
  for (const e of enemies) if (e.alive && e.x > cx - 40 && e.x < cx + W + 40) ART.enemy(c, TH.enemy, e.x, e.fly ? e.y - 20 + Math.sin(t * 2 + e.min) * 16 : e.y, e.w, e.h, { t, face: e.vx > 0 ? 1 : -1 });
  for (const r of R.rs) { if (r.out) continue;
    if (r.dashT > 0) { c.globalAlpha = 0.35; ART.hero(c, r.x + 11 - r.face * 18, r.y + r.h, HS, { face: r.face, state: 'run', t, col: r.col }); c.globalAlpha = 1; }
    ART.hero(c, r.x + 11, r.y + r.h, HS, { face: r.face, state: r.dead ? 'fall' : r.state, t: t + r.pl * 0.3, col: r.col, squash: r.sq > 0 ? r.sq : 0, gy: r.dead ? null : groundY(r) });
    if (r.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; c.fillStyle = '#ffd23d'; c.beginPath(); c.arc(r.x + 11 + Math.cos(a) * 12, r.y - 6 + Math.sin(a) * 4, 3, 0, 6.283); c.fill(); }
    label(r.cpu ? 'CPU' : r.name, r.x + 11, r.y - 26, 14, r.cpu ? '#e8e4f4' : r.col, 'center'); }
  c.restore();
  ART.vignette(c, W, H);
  /* borde que elimina */
  const gr = c.createLinearGradient(0, 0, 28, 0); gr.addColorStop(0, `rgba(255,60,90,${0.3 + Math.sin(t * 6) * 0.08})`); gr.addColorStop(1, 'rgba(255,60,90,0)'); c.fillStyle = gr; c.fillRect(0, 0, 28, H);
  /* marcador: rondas ganadas y barra de progreso con la posición de cada uno */
  const pw = Math.min(140, (W - 20) / R.rs.length - 6);
  R.rs.forEach((r, i) => { const x = 10 + i * (pw + 6); ART.rr(c, x, 5, pw, 26, 9); c.fillStyle = r.out ? 'rgba(26,21,48,.45)' : 'rgba(26,21,48,.85)'; c.fill(); c.lineWidth = 2; c.strokeStyle = r.col; c.stroke();
    label(r.cpu ? 'CPU' : r.name, x + 8, 10, 14, r.out ? '#77708f' : r.col); for (let j = 0; j < RWIN; j++) { const sx = x + pw - 14 - (RWIN - 1 - j) * 16; c.beginPath(); for (let q = 0; q < 10; q++) { const a = -Math.PI / 2 + q * Math.PI / 5, rr = q % 2 ? 3 : 7; c.lineTo(sx + Math.cos(a) * rr, 18 + Math.sin(a) * rr); } c.closePath(); ART.fillOut(c, j < r.wins ? '#ffc928' : '#3a3552', 1.5); } });
  const bx = 110, bw = W - 150, by = H - 14; ART.rr(c, bx, by - 3, bw, 6, 3); c.fillStyle = 'rgba(26,21,48,.7)'; c.fill();
  c.fillStyle = '#ffc928'; c.fillRect(bx + bw - 3, by - 8, 3, 12);
  for (const r of R.rs) if (!r.out) { c.beginPath(); c.arc(bx + bw * k.clamp(r.x / flag.x, 0, 1), by, 6, 0, 6.283); ART.fillOut(c, r.col, 2); }
  if (R.msgT > 0) { c.globalAlpha = Math.min(1, R.msgT * 2); c.font = '800 24px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(R.msg).width + 40; ART.rr(c, W / 2 - mw / 2, 46, mw, 42, 12); c.fillStyle = 'rgba(26,21,48,.82)'; c.fill(); label(R.msg, W / 2, 54, 24, R.win ? R.win.col : '#ffc928', 'center'); c.globalAlpha = 1; }
}
k.onParty = () => { if (!RACE) return; if (k.st !== 'play' || !R) { reset(); return; } const pl = k.players(4); for (const r of R.rs) { r.cpu = pl[r.pl].cpu; r.name = r.cpu ? 'CPU' : pl[r.pl].name; } };
/* Niveles diseñados a mano (plan Friv): progreso guardado por dificultad en kit.js. */
if (HAND) k.levels(HAND.length, { start: (i) => { level = i; lives = (PD ? 9 : 4) + k.D.life; score = 0; coinsGot = 0; build(); } });
reset(); k.show(CFG.title, CFG.help);
/* si el jugador cambia de nivel en la pantalla de inicio, la partida se prepara de nuevo con los valores de k.D */
k.onDif = () => { if (k.st !== 'play') reset(); };
k.run(RACE ? raceUpdate : upd, RACE ? raceDraw : drw);
