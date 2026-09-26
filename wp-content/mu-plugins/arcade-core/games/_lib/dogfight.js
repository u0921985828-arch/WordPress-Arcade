/* Duelo de biplanos: combate aéreo lateral a cuatro (la CPU rellena las plazas vacías). El cielo da la vuelta por los lados.
 * Física: el avión apunta hacia donde marca el mando; subir frena y bajar acelera. Por debajo de cierta velocidad entra en pérdida:
 * el morro cae y los mandos apenas responden hasta recuperar velocidad. B = rizo (1,1 s, esquiva balas; recarga 3,5 s).
 * A = ametralladora (se recalienta). Cada ronda: el último en el aire gana; 3/2/1/0 puntos; 3 rondas y podio.
 * Táctil en solitario: el avión vuela hacia tu dedo y dispara mientras tocas. */
const OUT = ART.OUT, TAU = Math.PI * 2, lite = ART.lite, dark = ART.dark, alpha = ART.alpha, hyp = Math.hypot;
const W = 800, H = 450, GY = H - 38, ROUNDS = 3, LEN = 75;
const TH = ART.THEMES[CFG.theme || 'meadow'];
const k = Kit({ w: W, h: H, title: CFG.title, bg: TH.sky[0] }), c = k.ctx;
/* --- Ley de la pieza única (R5, docs/REMASTER.md §8) + cartoon de estudio -----------------
   `unite(g, partes, ancho)` traza TODAS las partes y las rellena después: los contornos
   interiores quedan tapados y solo sobrevive la silueta. El detalle interior va recortado
   (`clipIn`), nunca con stroke; las separaciones internas se leen por sombra propia. */
const PZO = '#1a1530', OUTW = 1.5, INW = 0.7, INA = 0.6;
const _hx = (h) => { if (h[0] !== '#') { const m = h.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; } h = h.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _rgb = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
const PLT = (col, f) => _rgb(_hx(col).map((v) => v + (255 - v) * f));
const PDK = (col, f) => _rgb(_hx(col).map((v) => v * (1 - f)));
const PAL = (col, a) => { const q = _hx(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
/* partes = [[trazado, relleno, sombraDeContacto?]], en orden de profundidad */
function unite(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = PZO; g.lineWidth = (ow || OUTW) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) {
    const P = parts[i];
    if (P[2]) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); P[0](g); g.strokeStyle = PAL(PZO, 0.15); g.lineWidth = P[2]; g.stroke(); g.lineWidth = P[2] * 0.45; g.stroke(); g.restore(); }
    g.beginPath(); P[0](g); g.fillStyle = P[1]; g.fill();
  }
}
/* detalle recortado contra un trazado (en el lienzo vivo: recorte a secas, nunca source-atop) */
function clipIn(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* detalle de una pieza dentro de una caché (source-atop es barato en un lienzo pequeño) */
function within(g, path, fn) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* 3 planos de color con borde duro: sombra, base desplazada hacia la luz y plano de luz */
function cel3(g, path, base, o) {
  o = o || {}; const dx = o.dx == null ? 2.4 : o.dx, dy = o.dy == null ? 2.2 : o.dy, R = o.r || 200;
  g.save(); g.beginPath(); path(g); g.clip();
  g.fillStyle = PDK(base, o.sh == null ? 0.26 : o.sh); g.fillRect(-R, -R, R * 2, R * 2);
  g.save(); g.translate(-dx, -dy); g.beginPath(); path(g); g.fillStyle = base; g.fill(); g.restore();
  if (o.hi !== false) { g.save(); g.translate(-dx * 2.15, -dy * 2.15); g.beginPath(); path(g); g.fillStyle = PLT(base, o.lt == null ? 0.2 : o.lt); g.fill(); g.restore(); }
  g.restore();
}
/* óvalo especular (un único toque de luz por pieza) */
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = `rgba(255,255,255,${a == null ? 0.5 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.283); g.fill(); }
/* sombra de contacto dura bajo el objeto */
function contact(g, x, y, rx, ry, a) { g.fillStyle = `rgba(12,10,26,${a == null ? 0.3 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.283); g.fill(); }
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t)), adiff = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let CPU = 0; try { CPU = Math.min(8, +localStorage.getItem('cpu:' + CFG.id) || 0); } catch (e) { /* sin almacenamiento */ }
const skill = () => Math.min(0.8, 0.2 + CPU * 0.06 + (round - 1) * 0.03);
const VSTALL = 82, VREC = 118, VMAX = 330, THR = 132, DRAG = 0.78, GRAV = 150;
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
const wdx = (a, b) => { let d = b - a; if (d > W / 2) d -= W; if (d < -W / 2) d += W; return d; };

/* ---------------------------------------------------------------- suelo y nubes cacheados */
function mk(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const q = cv.getContext('2d'); q.scale(2, 2); fn(q); return cv; }
const rs = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const gh = (x) => GY + Math.sin(x * 0.011) * 6 + Math.sin(x * 0.037 + 1) * 3;
const GROUND = mk(W, H - GY + 20, (q) => {
  q.translate(0, -GY + 20);
  const path = () => { q.beginPath(); q.moveTo(0, H); for (let x = 0; x <= W; x += 8) q.lineTo(x, gh(x)); q.lineTo(W, H); q.closePath(); };
  path(); const g = q.createLinearGradient(0, GY - 10, 0, H); g.addColorStop(0, '#6cc85a'); g.addColorStop(1, '#3f8f45'); q.fillStyle = g; q.fill();
  q.save(); path(); q.clip();
  for (let i = 0; i < 9; i++) { const x = i * 95 + 20; q.fillStyle = i % 2 ? alpha('#f2d15c', 0.55) : alpha('#a8cf3f', 0.6); q.beginPath(); q.moveTo(x, H); q.lineTo(x + 30, GY + 6); q.lineTo(x + 90, GY + 6); q.lineTo(x + 70, H); q.fill(); }
  q.restore(); path(); q.lineWidth = 2.6; q.strokeStyle = OUT; q.stroke();
  /* granja, molino y árboles */
  const tree = (x, s) => { const y = gh(x) + 2; q.fillStyle = '#7a4a22'; q.fillRect(x - 2 * s, y - 10 * s, 4 * s, 10 * s); q.beginPath(); q.arc(x, y - 16 * s, 9 * s, 0, TAU); ART.fillOut(q, '#4fa860', 2); q.fillStyle = 'rgba(255,255,255,.25)'; q.beginPath(); q.arc(x - 3 * s, y - 19 * s, 3.5 * s, 0, TAU); q.fill(); };
  [40, 70, 230, 262, 520, 560, 700, 760].forEach((x, i) => tree(x, 0.8 + rs(i) * 0.5));
  { const x = 140, y = gh(x) + 2; ART.rr(q, x - 22, y - 22, 44, 22, 2); ART.fillOut(q, '#e0564e', 2.2); q.beginPath(); q.moveTo(x - 26, y - 21); q.lineTo(x, y - 38); q.lineTo(x + 26, y - 21); q.closePath(); ART.fillOut(q, '#8a4f3a', 2.2); ART.rr(q, x - 6, y - 14, 12, 14, 1); ART.fillOut(q, '#fff3d6', 1.6); q.strokeStyle = OUT; q.lineWidth = 1.2; q.beginPath(); q.moveTo(x - 6, y - 14); q.lineTo(x + 6, y); q.moveTo(x + 6, y - 14); q.lineTo(x - 6, y); q.stroke(); }
  { const x = 420, y = gh(x) + 2; q.beginPath(); q.moveTo(x - 9, y); q.lineTo(x - 5, y - 40); q.lineTo(x + 5, y - 40); q.lineTo(x + 9, y); q.closePath(); ART.fillOut(q, '#f5ead0', 2.2); q.beginPath(); q.arc(x, y - 42, 6, Math.PI, 0); ART.fillOut(q, '#8a4f3a', 2); ART.rr(q, x - 3, y - 12, 6, 12, 2); ART.fillOut(q, '#6b4329', 1.4); }
  { const x = 640, y = gh(x) + 2; for (let i = 0; i < 3; i++) { ART.rr(q, x - 30 + i * 22, y - 9, 18, 9, 3); ART.fillOut(q, '#f2d15c', 1.8); } }
});
const MILL = { x: 420, y: gh(420) - 40 };
const CLOUD = [0, 1, 2].map((v) => mk(170, 80, (q) => {
  const bl = [[40, 50, 26], [75, 40, 32], [112, 46, 27], [140, 55, 18], [58, 58, 20], [100, 60, 22]].map(([x, y, r]) => [x + rs(v * 7 + x) * 8, y + rs(v + y) * 5, r * (0.85 + rs(v * 3 + r) * 0.3)]);
  q.fillStyle = OUT; for (const [x, y, r] of bl) { q.beginPath(); q.arc(x, y, r + 2.5, 0, TAU); q.fill(); }
  for (const [x, y, r] of bl) { const g = q.createRadialGradient(x - r * 0.4, y - r * 0.5, 2, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dbe9f7'); q.fillStyle = g; q.beginPath(); q.arc(x, y, r, 0, TAU); q.fill(); }
}));

/* ---------------------------------------------------------------- estado */
let P = [], bullets = [], clouds = [], smoke = [], T = 0, rt = 0, round = 0, phase = 'play', btw = 0, cdPend = false, banner = null, bannerT = 0, order = [];
function mkPlayers() { P = k.players(4).map((q, i) => ({ i, p: q.p, col: q.color, name: q.cpu ? 'CPU ' + (i + 1) : q.name, cpu: q.cpu, pts: 0, wins: 0, kills: 0, gain: 0 })); }
function syncPlayers() { const pl = k.players(4); P.forEach((x, i) => { x.cpu = pl[i].cpu; x.name = pl[i].cpu ? 'CPU ' + (i + 1) : pl[i].name; x.col = pl[i].color; }); }
k.onParty = () => { if (k.st !== 'play') reset(); else syncPlayers(); };
const START = [[90, 130, 0], [710, 180, Math.PI], [90, 250, 0], [710, 300, Math.PI]];
function newRound() {
  round++; rt = 0; phase = 'play'; cdPend = true; bullets = []; smoke = []; order = []; banner = null;
  P.forEach((pl, i) => { const [x, y, a] = START[i]; Object.assign(pl, { x, y, a, v: 170, sink: 0, hp: 6, alive: true, down: false, spin: 0, stall: false, cd: 0, heat: 0, hot: false, loopT: 0, loopCd: 0, loopDir: 1, hurt: 0, prop: 0, gain: 0, ai: { t: 0, tgt: null, want: a }, lastHit: -1, rk: 0 }); });
  clouds = [0, 1, 2, 3, 4].map((i) => ({ x: k.rnd(0, W), y: 70 + i * 55 + k.rnd(-15, 15), v: k.rnd(6, 14), s: k.rnd(0.8, 1.25), kind: i % 3 }));
}
function reset() { mkPlayers(); round = 0; newRound(); }

/* ---------------------------------------------------------------- control */
function human(pl) {
  const d = k.pdir(pl.p), solo = !k.party && pl.p === 0;
  let x = d.x, y = d.y, fire = k.pheld(pl.p, 'a'), loop = k.phit(pl.p, 'b');
  if (solo && k.ptr.down) { const dx = wdx(pl.x, k.ptr.x), dy = k.ptr.y - pl.y; if (hyp(dx, dy) > 18) { x = dx; y = dy; } fire = true; }
  return { want: x || y ? Math.atan2(y, x) : null, fire, loop };
}
function AI(pl, dt) {
  const s = skill(), ai = pl.ai; ai.t -= dt;
  let tgt = ai.tgt; if (!tgt || !tgt.alive || tgt.down || ai.t <= 0) { let bd = 1e9; tgt = null; for (const o of P) if (o !== pl && o.alive && !o.down) { const d = hyp(wdx(pl.x, o.x), o.y - pl.y) * (o.cpu ? 1.15 : 1); if (d < bd) { bd = d; tgt = o; } } ai.tgt = tgt; }
  const o = { want: null, fire: false, loop: false };
  if (ai.t <= 0) { ai.t = lerp(0.45, 0.14, s) * k.rnd(0.8, 1.2); ai.noise = k.rnd(-1, 1) * (1 - s) * 0.5; }
  const dir = Math.cos(pl.a) >= 0 ? 1 : -1;
  if (tgt) { const dx = wdx(pl.x, tgt.x), dy = tgt.y - pl.y, d = hyp(dx, dy), tt = d / 480, lx = dx + Math.cos(tgt.a) * tgt.v * tt * s, ly = dy + (Math.sin(tgt.a) * tgt.v + tgt.sink) * tt * s;
    ai.want = Math.atan2(ly, lx) + ai.noise;
    const off = Math.abs(adiff(Math.atan2(ly, lx) - pl.a));
    o.fire = rt > 5 && d < 300 && off < 0.1 + (1 - s) * 0.12 && pl.heat < 0.7 && Math.sin(T * 2.2 + pl.i * 1.7) > 0.35 - s * 0.6; /* ráfagas con pausas */
    /* un rival pegado a la cola: rizo */
    for (const e of P) if (e !== pl && e.alive && !e.down) { const ex = wdx(e.x, pl.x), ey = pl.y - e.y, ed = hyp(ex, ey); if (ed < 130 && Math.abs(adiff(Math.atan2(ey, ex) - e.a)) < 0.3 && pl.loopCd <= 0 && Math.random() < dt * s * 3) o.loop = true; } }
  else ai.want = dir > 0 ? 0 : Math.PI;
  let want = ai.want;
  /* seguridad: suelo, techo y pérdida */
  const alt = gh(pl.x) - pl.y;
  if (alt < 95 + (1 - s) * 30 && Math.sin(pl.a) > -0.5) want = -Math.PI / 2 + dir * 0.6;
  else if (pl.y < 60) want = dir > 0 ? 0.35 : Math.PI - 0.35;
  if (pl.v < 115 && Math.sin(pl.a) < 0.2) want = dir > 0 ? 0.6 : Math.PI - 0.6;
  o.want = want; return o;
}
function shoot(pl) {
  const ca = Math.cos(pl.a), sa = Math.sin(pl.a), sp = pl.v + 430, j = k.rnd(-0.045, 0.045);
  bullets.push({ x: pl.x + ca * 18, y: pl.y + sa * 18, vx: Math.cos(pl.a + j) * sp, vy: Math.sin(pl.a + j) * sp + pl.sink, t: 0.72, own: pl.i, col: pl.col });
  pl.cd = 0.1; pl.heat += 0.075; if (pl.heat >= 1) { pl.hot = true; k.sfx('hurt'); }
  k.sfx('shoot');
}
function damage(pl, by, n) {
  if (!pl.alive || pl.down) return; pl.hp -= n; pl.hurt = 0.3; pl.lastHit = by;
  k.burst(pl.x, pl.y, '#ffd166', 5, 120); k.sfx('hit');
  if (pl.hp <= 0) { pl.down = true; pl.spin = (Math.random() < 0.5 ? -1 : 1) * 3; k.sfx('explode'); k.shake(5); k.float('¡Derribado!', pl.x, pl.y - 20, pl.col); if (by >= 0 && by !== pl.i) P[by].kills++; }
}
function crash(pl) {
  pl.alive = false; pl.down = false; order.push(pl.i);
  k.burst(pl.x, gh(pl.x) - 4, '#ffb347', 26, 240); k.burst(pl.x, gh(pl.x) - 4, pl.col, 14, 200); k.burst(pl.x, gh(pl.x) - 4, '#6b4329', 10, 160);
  k.sfx('explode'); k.shake(8); for (let i = 0; i < 8; i++) smoke.push({ x: pl.x + k.rnd(-8, 8), y: gh(pl.x) - 6, r: k.rnd(5, 10), t: k.rnd(0.8, 1.6), dark: 1 });
}
function fly(pl, inp, dt) {
  pl.cd -= dt; pl.loopCd -= dt; pl.hurt -= dt; pl.prop += dt * (20 + pl.v * 0.1);
  pl.heat = Math.max(0, pl.heat - (pl.hot ? 0.45 : 0.32) * dt); if (pl.hot && pl.heat < 0.35) pl.hot = false;
  if (pl.down) { /* cae en barrena */ pl.a += pl.spin * dt; pl.sink += 220 * dt; pl.v = Math.max(60, pl.v - 40 * dt);
    if (Math.random() < dt * 30) smoke.push({ x: pl.x, y: pl.y, r: 4, t: 0.9, dark: 1 }); }
  else if (pl.loopT > 0) { pl.loopT -= dt; pl.a += pl.loopDir * TAU / 1.1 * dt; pl.v = Math.max(pl.v, 165); pl.sink *= 0.9;
    if (Math.random() < dt * 40) smoke.push({ x: pl.x, y: pl.y, r: 3, t: 0.5 }); }
  else {
    if (inp.loop && pl.loopCd <= 0 && !pl.stall) { pl.loopT = 1.1; pl.loopCd = 3.5; pl.loopDir = Math.cos(pl.a) >= 0 ? -1 : 1; k.sfx('jump'); }
    if (inp.want != null) { const rate = pl.stall ? 0.9 : 2.9, d = adiff(inp.want - pl.a); pl.a += Math.max(-rate * dt, Math.min(rate * dt, d)); }
    if (pl.stall) { /* el morro cae */ const down = Math.PI / 2, d = adiff(down - pl.a); pl.a += Math.max(-1.6 * dt, Math.min(1.6 * dt, d)); }
    if (inp.fire && pl.cd <= 0 && !pl.hot) shoot(pl);
  }
  pl.a = adiff(pl.a);
  if (!pl.down) {
    pl.v += (THR - DRAG * pl.v + GRAV * Math.sin(pl.a)) * dt; if (pl.y < 26) pl.v -= 140 * dt; /* aire fino */
    pl.v = Math.max(20, Math.min(VMAX, pl.v));
    if (!pl.stall && pl.v < VSTALL && pl.loopT <= 0) { pl.stall = true; k.float('¡Pérdida!', pl.x, pl.y - 22, '#ffd166'); k.sfx('hurt'); }
    if (pl.stall && pl.v > VREC) pl.stall = false;
    pl.sink = pl.stall ? Math.min(220, pl.sink + 240 * dt) : pl.sink * Math.exp(-3 * dt);
  }
  pl.x += Math.cos(pl.a) * pl.v * dt; pl.y += Math.sin(pl.a) * pl.v * dt + pl.sink * dt;
  pl.x = (pl.x + W) % W; if (pl.y < 8) { pl.y = 8; if (Math.sin(pl.a) < 0) pl.a = adiff(Math.cos(pl.a) >= 0 ? 0.1 : Math.PI - 0.1); }
  if (!pl.down && pl.hp <= 2 && Math.random() < dt * 14) smoke.push({ x: pl.x - Math.cos(pl.a) * 10, y: pl.y, r: 3, t: 0.8, dark: pl.hp <= 1 ? 1 : 0 });
  if (pl.y > gh(pl.x) - 7) {
    if (rt < 5 && !pl.down) { pl.y = gh(pl.x) - 8; pl.a = Math.cos(pl.a) >= 0 ? -0.5 : Math.PI + 0.5; pl.v = Math.max(pl.v, 150); pl.sink = 0; pl.stall = false; k.sfx('jump'); }
    else crash(pl);
  }
  /* el molino es sólido */
  if (!pl.down && pl.alive && Math.abs(wdx(pl.x, MILL.x)) < 10 && pl.y > MILL.y - 4 && rt >= 5) crash(pl);
}

/* ---------------------------------------------------------------- rondas */
function endRound() {
  const key = (pl) => (pl.alive && !pl.down ? 100 + pl.hp : order.indexOf(pl.i)), o = P.slice().sort((a, b) => key(b) - key(a)), PT = [3, 2, 1, 0];
  o.forEach((pl, j) => { pl.gain = j && key(pl) === key(o[j - 1]) ? o[j - 1].gain : PT[j]; pl.pts += pl.gain; if (pl.gain === 3) pl.wins++; });
  phase = 'between'; btw = 3.4; const tie = o[1] && o[1].gain === o[0].gain;
  banner = { t: tie ? '¡Empate en el aire!' : `¡Ronda para ${o[0].name}!`, col: tie ? '#ffd166' : o[0].col, list: o }; bannerT = 3.4;
  k.sfx(!o[0].cpu || k.party ? 'win' : 'lose');
}
function finish() {
  const sc = (pl) => pl.pts * 1000 + pl.kills * 10 + pl.wins, best = Math.max(...P.map(sc)), win = P.filter((pl) => sc(pl) === best);
  if (win.length === 1) { CPU = win[0].cpu ? Math.max(0, CPU - 1) : Math.min(8, CPU + 1); try { localStorage.setItem('cpu:' + CFG.id, CPU); } catch (e) { /* sin almacenamiento */ } }
  k.podium(P.map((pl) => ({ p: pl.p, name: pl.name, score: sc(pl) })), { fmt: (v) => Math.floor(v / 1000) + ' pts · ' + Math.floor((v % 1000) / 10) + ' derribos', head: !k.party && win.length === 1 && !win[0].cpu ? '¡Has ganado!' : undefined });
}

reset(); k.show(CFG.title, CFG.help);
k.run((dt) => {
  T += dt; bannerT = Math.max(0, bannerT - dt);
  for (const cl of clouds) { cl.x += cl.v * dt; if (cl.x > W + 100) cl.x = -180; }
  for (const s of smoke) { s.t -= dt; s.r += dt * 9; s.y -= dt * 14; } smoke = smoke.filter((s) => s.t > 0);
  if (!k.gate(reset)) return;
  if (phase === 'between') { btw -= dt; for (const pl of P) if (pl.alive) fly(pl, { want: null }, dt); if (btw <= 0) { if (round >= ROUNDS) finish(); else newRound(); } return; }
  if (cdPend) { cdPend = false; k.count(3); }
  if (k.counting()) return;
  rt += dt;
  for (const pl of P) if (pl.alive) fly(pl, pl.down ? {} : pl.cpu ? AI(pl, dt) : human(pl), dt);
  for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt; b.x = (b.x + W) % W; if (b.y > gh(b.x)) { b.t = 0; k.burst(b.x, b.y, '#a0703f', 3, 60); }
    for (const pl of P) if (pl.i !== b.own && pl.alive && !pl.down && b.t > 0 && hyp(wdx(b.x, pl.x), b.y - pl.y) < 12) { b.t = 0; if (pl.loopT > 0 && Math.random() < 0.7) continue; damage(pl, b.own, 0.5); } }
  bullets = bullets.filter((b) => b.t > 0 && b.y > -20);
  /* choque entre aviones */
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const a = P[i], b = P[j]; if (!a.alive || !b.alive || a.down || b.down) continue; if (hyp(wdx(a.x, b.x), a.y - b.y) < 18 && rt > 5 && !(a.bump > T) && !(b.bump > T)) { damage(a, j, 2); damage(b, i, 2); a.bump = b.bump = T + 1.2; const up = a.y < b.y ? a : b, dn = up === a ? b : a; up.y -= 6; dn.y += 6; up.a = adiff(up.a - 0.9 * Math.sign(Math.cos(up.a) || 1)); dn.a = adiff(dn.a + 0.9 * Math.sign(Math.cos(dn.a) || 1)); k.shake(6); k.sfx('hurt'); } }
  const up = P.filter((pl) => pl.alive && !pl.down).length, falling = P.some((pl) => pl.alive && pl.down);
  if ((up <= 1 && !falling) || rt >= LEN) endRound();
}, draw);

/* ---------------------------------------------------------------- dibujo */
function plane(pl) {
  const col = pl.col, fl = pl.hurt > 0 && Math.floor(pl.hurt * 20) % 2, left = Math.cos(pl.a) < 0;
  c.save(); c.translate(pl.x, pl.y); c.rotate(pl.a); if (left) c.scale(1, -1);
  const body = fl ? '#fff' : col;
  /* cola */ c.beginPath(); c.moveTo(-16, -1); c.lineTo(-22, -10); c.lineTo(-17, -10); c.lineTo(-11, -2); c.closePath(); ART.fillOut(c, dark(body, 0.12), 1.8);
  ART.rr(c, -22, 0, 9, 3, 1.5); ART.fillOut(c, dark(body, 0.2), 1.4);
  /* ala inferior */ ART.rr(c, -6, 3, 16, 4, 2); ART.fillOut(c, dark(body, 0.18), 1.8);
  /* fuselaje */ c.beginPath(); c.moveTo(-20, -1); c.quadraticCurveTo(-10, -6, 8, -5); c.lineTo(13, -4); c.quadraticCurveTo(16, 0, 13, 4); c.lineTo(8, 5); c.quadraticCurveTo(-10, 5, -20, 2); c.closePath(); ART.fillOut(c, body, 2);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-12, -4, 18, 1.6);
  c.fillStyle = '#fff'; c.beginPath(); c.arc(-6, 0.5, 2.6, 0, TAU); c.fill(); c.fillStyle = dark(body, 0.3); c.beginPath(); c.arc(-6, 0.5, 1.2, 0, TAU); c.fill();
  /* piloto */ c.beginPath(); c.arc(0, -7, 3.6, 0, TAU); ART.fillOut(c, '#8a5a3b', 1.6); c.fillStyle = '#5ce1e6'; c.fillRect(0.5, -9, 3, 2);
  c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-2, -6); c.quadraticCurveTo(-7, -8 + Math.sin(T * 18) * 2, -11, -6 + Math.sin(T * 18 + 1) * 2); c.stroke();
  /* ala superior y montantes */ c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-3, -5); c.lineTo(-3, -11); c.moveTo(6, -5); c.lineTo(6, -11); c.stroke();
  ART.rr(c, -8, -14, 20, 4, 2); ART.fillOut(c, lite(body, 0.12), 1.8);
  /* hélice */ ART.rr(c, 13.5, -2, 3, 4, 1); ART.fillOut(c, '#3d3752', 1.2);
  c.fillStyle = 'rgba(230,230,240,.55)'; c.beginPath(); c.ellipse(17, 0, 2, 9 * Math.abs(Math.sin(pl.prop)), 0, 0, TAU); c.fill();
  c.restore();
}
function drawHUD() {
  let x = 10;
  for (const pl of P) {
    const w = 92, dead = !pl.alive || pl.down; ART.rr(c, x, 8, w, 30, 9); ART.fillOut(c, 'rgba(26,21,48,.72)', 2);
    c.globalAlpha = dead ? 0.45 : 1; c.fillStyle = pl.col; ART.rr(c, x + 6, 13, 8, 8, 2); c.fill();
    c.font = '800 11px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(pl.name.slice(0, 9), x + 18, 17.5);
    for (let i = 0; i < 6; i++) { c.fillStyle = i < Math.ceil(Math.max(0, pl.hp)) ? pl.col : 'rgba(255,255,255,.15)'; ART.rr(c, x + 7 + i * 8, 26, 6, 6, 2); c.fill(); }
    label(pl.pts + '', x + w - 12, 28, 11, '#ffd166');
    if (!pl.cpu && pl.alive) { c.fillStyle = pl.hot ? '#ff5f7a' : 'rgba(255,255,255,.7)'; c.fillRect(x + 58, 25, 16 * Math.min(1, pl.heat), 3); }
    c.globalAlpha = 1; x += w + 6;
  }
  ART.rr(c, W - 92, 8, 84, 30, 9); ART.fillOut(c, 'rgba(26,21,48,.72)', 2); label(`Ronda ${round}/${ROUNDS}`, W - 50, 17, 11, '#fff');
  const left = Math.max(0, Math.ceil(LEN - rt)); label(phase === 'play' ? String(left) : '—', W - 50, 30, 12, left <= 10 ? '#ff8a6a' : '#cfe2f6');
}
function draw() {
  ART.background(c, TH, W, H, T * 12, 0, T);
  for (const cl of clouds) if (cl.kind === 2) c.drawImage(CLOUD[cl.kind], cl.x, cl.y - 40 * cl.s, 170 * cl.s, 80 * cl.s);
  c.drawImage(GROUND, 0, GY - 20, W, H - GY + 20);
  /* aspas del molino */
  c.save(); c.translate(MILL.x, MILL.y); c.rotate(T * 1.5); for (let i = 0; i < 4; i++) { c.rotate(TAU / 4); ART.rr(c, 2, -3, 20, 6, 2); ART.fillOut(c, '#fff3d6', 1.6); } c.beginPath(); c.arc(0, 0, 3, 0, TAU); ART.fillOut(c, '#8a4f3a', 1.4); c.restore();
  for (const s of smoke) { c.globalAlpha = Math.min(0.7, s.t); c.fillStyle = s.dark ? '#4a4458' : '#eef2f8'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); } c.globalAlpha = 1;
  c.lineCap = 'round'; for (const b of bullets) { c.strokeStyle = alpha(b.col, 0.55); c.lineWidth = 4; c.beginPath(); c.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); c.lineTo(b.x, b.y); c.stroke(); c.strokeStyle = '#fff6c2'; c.lineWidth = 2; c.stroke(); }
  for (const pl of P) if (pl.alive) {
    for (const ox of [0, -W, W]) { if (ox && Math.abs(pl.x + ox - W / 2) > W / 2 + 30) continue; const x0 = pl.x; pl.x += ox; plane(pl); pl.x = x0; }
    if (pl.stall && !pl.down) label('!', pl.x, pl.y - 22, 14, '#ffd166');
    if (!pl.cpu && !pl.down) { label(k.party ? pl.name.slice(0, 8) : 'Tú', pl.x, pl.y - 30, 11, pl.col); }
    if (pl.y < 0) { c.beginPath(); c.moveTo(pl.x, 4); c.lineTo(pl.x - 5, 12); c.lineTo(pl.x + 5, 12); c.closePath(); ART.fillOut(c, pl.col, 1.4); }
  }
  c.globalAlpha = 0.9; for (const cl of clouds) if (cl.kind !== 2) c.drawImage(CLOUD[cl.kind], cl.x, cl.y - 40 * cl.s, 170 * cl.s, 80 * cl.s); c.globalAlpha = 1;
  drawHUD();
  if (bannerT > 0 && banner && k.st === 'play') {
    c.globalAlpha = Math.min(1, bannerT * 2.5); c.font = '800 26px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(banner.t).width + 44, by = H * 0.32;
    ART.rr(c, W / 2 - mw / 2, by - 24, mw, 48, 14); ART.fillOut(c, 'rgba(26,21,48,.86)', 3); label(banner.t, W / 2, by + 1, 26, banner.col);
    if (banner.list) banner.list.forEach((pl, j) => label(`${pl.name} +${pl.gain}`, W / 2 - 180 + j * 120, by + 44, 14, pl.col));
    c.globalAlpha = 1;
  }
}
