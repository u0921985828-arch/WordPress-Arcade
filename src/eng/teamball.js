/* teamball — deportes de equipo con balón físico, 1–4 humanos y CPU que rellena plazas.
 * Modos (CFG.mode): cenitales 'futbol' (2v2, pase A / tiro cargado B), 'hockey' (2v2 sobre patines, disco rápido),
 * 'coches' (2v2, saltar A / turbo B, balón gigante con altura), 'prisionero' (3v3, lanzar A / atrapar B);
 * laterales 'voley' (2v2, saque, tres toques como máximo) y 'cabezon' (1v1, cabezazos, chilenas y superdisparo).
 * Cenitales: en vertical el campo se gira (ataca hacia arriba) y en horizontal va apaisado; la física es la misma.
 * Plazas: equipo 0 = J1 y J3, equipo 1 = J2 y J4 (en 1v1: J1 contra J2). CPU mejora con victorias (localStorage cpu:<id>). */
const MODE = CFG.mode || 'futbol', SIDE = MODE === 'voley' || MODE === 'cabezon', OUT = ART.OUT, TAU = 6.2832;
const TS = MODE === 'prisionero' ? 3 : MODE === 'cabezon' ? 1 : 2, DUR = CFG.time || 120;
const VERT = !SIDE && innerHeight > innerWidth * 1.08;
const FW = 600, FH = 340, HUD = 56;
const W = SIDE ? 640 : VERT ? FH + 40 : FW + 40, H = SIDE ? 400 : VERT ? FW + HUD + 24 : FH + HUD + 20, OX = 20, OY = HUD + (VERT ? 4 : 0);
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#16122a' }), c = k.ctx;
const lite = ART.lite, dark = ART.dark;
const TEAM = [{ col: '#ff6b4a', name: CFG.t0 || 'Rojos' }, { col: '#3f8cff', name: CFG.t1 || 'Azules' }];
const CPUK = 'cpu:' + CFG.id;
const lsGet = (key, d) => { try { const v = localStorage.getItem(key); return v == null ? d : +v; } catch (e) { return d; } };
const lsSet = (key, v) => { try { localStorage.setItem(key, v); } catch (e) {} };
const clamp = k.clamp, hyp = Math.hypot, lerp = (a, b, q) => a + (b - a) * q;
const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
let skill = 0.4, B = [], ball, balls, score, clock, golden, phase, phT, msg, msgT, t = 0, kickTeam = 0, cdPend, lastTouch = null;
let goldT = 0, serveTeam = 0, serveIdx = [0, 0], touches = [0, 0], rounds = [0, 0], roundNo = 1;

/* ---------------- Utilidades de dibujo ---------------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function mk(w, h, draw) { const r = Math.min(3, Math.max(2, Math.ceil((k.scale || 1) * (devicePixelRatio || 1)))), cv = document.createElement('canvas'); cv.width = w * r; cv.height = h * r; const q = cv.getContext('2d'); q.scale(r, r); q.lineJoin = 'round'; q.lineCap = 'round'; draw(q); return cv; }
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/* Mundo → pantalla (cenitales). En vertical: giro de −90° (el equipo 0 ataca hacia arriba). */
const V = (x, y) => (VERT ? [OX + y, OY + FW - x] : [OX + x, OY + y]);
const SA = (a) => (VERT ? a - Math.PI / 2 : a);
const worldT = (g) => { if (VERT) { g.translate(OX, OY + FW); g.rotate(-Math.PI / 2); } else g.translate(OX, OY); };
/* Joystick de pantalla → dirección en el mundo */
function inDir(p) { const d = k.pdir(p); if (!d.x && !d.y) return null; let x = d.x, y = d.y; if (!SIDE && VERT) [x, y] = [-y, x]; const m = hyp(x, y); return { x: x / m, y: y / m }; }

/* ---------------- Plazas, equipos y control ---------------- */
function slotOf(team, i) { return TS === 1 ? (team === 0 ? 0 : 1) : i < 2 ? team + i * 2 : -1; } // equipo 0: J1,J3 · equipo 1: J2,J4 · 3.º siempre CPU
function mkBodies() {
  B = [];
  for (let tm = 0; tm < 2; tm++) for (let i = 0; i < TS; i++) { const s = slotOf(tm, i); B.push({ team: tm, i, slot: s, ctl: s >= 0 && k.human(s) ? s : -1, x: 0, y: 0, vx: 0, vy: 0, a: tm ? Math.PI : 0, st: 0, cd: 0, chg: -1, anim: 0, hair: ['#3a2a4a', '#8a4b2a', '#f2d15c', '#1a1530', '#c94f3a', '#5a3a2a'][(tm * 3 + i) % 6] }); }
}
function refreshCtl() { for (const b of B) b.ctl = b.slot >= 0 && k.human(b.slot) ? b.slot : -1; }
k.onParty = () => { if (k.st !== 'play') { reset(); return; } refreshCtl(); };
const nameOf = (b) => (b.ctl < 0 ? 'CPU' : k.party ? 'J' + (b.ctl + 1) : 'TÚ');
const humanTeam = () => { const h = B.filter((b) => b.ctl >= 0).map((b) => b.team); return h.length && h.every((x) => x === h[0]) ? h[0] : -1; };
const atk = (tm) => (tm === 0 ? 1 : -1); // sentido de ataque en x
/* Ventaja amable: un equipo solo de CPU que gana de 2 o más a un equipo con humanos afloja un poco (partidos igualados) */
function ease(b) { if (!score || B.some((o) => o.team === b.team && o.ctl >= 0) || !B.some((o) => o.team !== b.team && o.ctl >= 0)) return 1; const lead = score[b.team] - score[1 - b.team]; return lead >= 1 ? clamp(1 - 0.12 * lead, 0.5, 1) : 1; } // 1.23: afloja desde 1 gol de ventaja
const weakCpu = (b) => b.ctl < 0 && !B.some((o) => o.team === b.team && o.ctl >= 0); // 1.23: CPU rival (el compañero CPU de un humano juega como antes)

/* ---------------- Configuración por modo ---------------- */
const M = {
  futbol: { r: 11, br: 7, spd: 150, acc: 11, fr: 1.05, rest: 0.72, gw: 90, cut: 36, shot: [280, 620], pass: true },
  hockey: { r: 11, br: 6, spd: 190, acc: 3.2, fr: 0.4, rest: 0.9, gw: 76, cut: 64, shot: [300, 620], pass: true, skate: true },
  coches: { r: 16, br: 20, spd: 230, acc: 2, fr: 0.45, rest: 0.82, gw: 150, cut: 60, car: true },
  prisionero: { r: 11, br: 7, spd: 150, acc: 11, fr: 1.4, rest: 0.6, gw: 0, cut: 0 },
}[MODE] || {};
const GY0 = FH / 2 - (M.gw || 0) / 2, GY1 = FH / 2 + (M.gw || 0) / 2;
const SEG = [];
if (!SIDE) {
  const C = M.cut;
  SEG.push([C, 0, FW - C, 0], [C, FH, FW - C, FH]);
  if (M.gw) SEG.push([0, C, 0, GY0], [0, GY1, 0, FH - C], [FW, C, FW, GY0], [FW, GY1, FW, FH - C]); else SEG.push([0, C, 0, FH - C], [FW, C, FW, FH - C]);
  if (C) SEG.push([0, C, C, 0], [FW - C, 0, FW, C], [0, FH - C, C, FH], [FW - C, FH, FW, FH - C]);
}
function segHit(o, r, s, e) {
  const [ax, ay, bx, by] = s, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, q = clamp(((o.x - ax) * dx + (o.y - ay) * dy) / L, 0, 1);
  const px = ax + dx * q, py = ay + dy * q, ex = o.x - px, ey = o.y - py, d = hyp(ex, ey);
  if (d >= r || d === 0) return false;
  const nx = ex / d, ny = ey / d; o.x = px + nx * r; o.y = py + ny * r; const vn = o.vx * nx + o.vy * ny;
  if (vn < 0) { o.vx -= (1 + e) * vn * nx; o.vy -= (1 + e) * vn * ny; } return true;
}
function walls(o, r, e) { let hit = false; for (const s of SEG) if (segHit(o, r, s, e)) hit = true; for (const py of M.gw ? [GY0, GY1] : []) for (const px of [0, FW]) { const d = hyp(o.x - px, o.y - py); if (d < r + 3 && d > 0) { const nx = (o.x - px) / d, ny = (o.y - py) / d; o.x = px + nx * (r + 3); o.y = py + ny * (r + 3); const vn = o.vx * nx + o.vy * ny; if (vn < 0) { o.vx -= (1 + e) * vn * nx; o.vy -= (1 + e) * vn * ny; } hit = true; } } return hit; }
function keepIn(b) { // jugadores dentro del campo (y de su zona en balón prisionero)
  const r = M.r; let x0 = r, x1 = FW - r;
  if (MODE === 'prisionero') { const z = zoneOf(b); x0 = z[0] + r; x1 = z[1] - r; }
  b.x = clamp(b.x, x0, x1); b.y = clamp(b.y, r, FH - r);
  if (M.cut) walls(b, r, 0.1);
}

/* ---------------- Arranque de partido / saques ---------------- */
function reset() {
  skill = clamp(0.2 + lsGet(CPUK, 0) * 0.04, 0.2, 0.85); // 1.23: más fácil (subida 0.08→0.04 por victoria, tope 0.92→0.85)
  mkBodies(); score = [0, 0]; clock = DUR; golden = false; msg = ''; msgT = 0; rounds = [0, 0]; roundNo = 1; lastTouch = null;
  serveTeam = 0; serveIdx = [0, 0]; touches = [0, 0];
  kickTeam = Math.random() < 0.5 ? 0 : 1; kickoff(); cdPend = true;
}
function kickoff() {
  phase = 'kick'; phT = 1.1; lastTouch = null;
  if (MODE === 'voley') return voleyServe();
  if (MODE === 'cabezon') { B.forEach((b) => Object.assign(b, { x: b.team ? 470 : 170, y: GROUND, vx: 0, vy: 0, st: 0, kick: 0, sup: b.sup || 0 })); ball = { x: 320, y: 150, vx: (kickTeam ? 1 : -1) * 40, vy: 0, r: 13, spin: 0, fire: 0 }; return; }
  if (MODE === 'prisionero') {
    B.forEach((b) => { b.jail = false; b.hold = null; b.inv = 3; b.catchT = 0; b.cd = 0; b.st = 0; const z = zoneOf(b); b.x = (z[0] + z[1]) / 2 + atk(b.team) * -40; b.y = FH * (b.i + 1) / (TS + 1); b.vx = b.vy = 0; b.a = b.team ? Math.PI : 0; });
    balls = [0, 1, 2].map((i) => ({ x: FW / 2, y: FH * (i + 1) / 4, vx: 0, vy: 0, r: M.br, live: false, hold: null, thr: null, spin: 0 }));
    return;
  }
  const P0 = MODE === 'coches' ? [[0.14, 0.5], [0.3, 0.25]] : [[0.3, 0.36], [0.16, 0.66]];
  B.forEach((b) => { const P = P0[b.i] || P0[0], s = atk(b.team); let x = FW / 2 - s * (FW / 2 - P[0] * FW), y = FH * (b.team ? 1 - P[1] : P[1]);
    if (b.team === kickTeam && b.i === 0) { x = FW / 2 - s * (MODE === 'coches' ? 150 : 28); y = FH / 2; }
    Object.assign(b, { x, y, vx: 0, vy: 0, a: b.team ? Math.PI : 0, st: 0, cd: 0, chg: -1, sp: 0, z: 0, vz: 0, boost: b.boost == null ? 1 : Math.max(0.5, b.boost), slide: 0 }); });
  ball = { x: FW / 2, y: FH / 2, vx: 0, vy: 0, z: MODE === 'coches' ? 60 : 0, vz: 0, r: M.br, own: null, spin: 0, nt: null, ntT: 0 };
}
function goal(team, how) {
  score[team]++; phase = 'goal'; phT = 2; lastTouch = null; kickTeam = 1 - team;
  const [sx, sy] = SIDE ? [ball.x, ball.y] : V(ball.x, ball.y);
  msg = golden ? '¡Gol de oro!' : how || '¡GOL!'; msgT = 2; k.sfx('win'); k.shake(8); k.flash('rgba(255,255,255,.35)');
  k.confetti(TEAM[team].col, 90); k.burst(sx, sy, TEAM[team].col, 40, 280);
  if (golden) phT = 1.4;
}
function finish() {
  phase = 'end'; const d = score[0] - score[1], wt = d > 0 ? 0 : 1, ht = humanTeam();
  if (d === 0) { k.sfx('tick'); return k.win('¡Empate!', '#ffd166', `${TEAM[0].name} ${score[0]} – ${score[1]} ${TEAM[1].name}<br>Nadie marcó en la prórroga<br>Toca para la revancha`, 0); }
  if (!k.party && ht >= 0) lsSet(CPUK, Math.max(0, lsGet(CPUK, 0) + (wt === ht ? 1 : -0.5)));
  const unit = MODE === 'prisionero' ? 'rondas' : MODE === 'voley' ? 'puntos' : 'goles';
  const who = B.filter((b) => b.team === wt).map((b) => `<b style="color:${b.ctl >= 0 ? k.pcol(b.ctl) : '#d8d0f0'}">${nameOf(b)}</b>`).join(' y ');
  const head = ht === wt && !k.party ? '¡Victoria!' : ht === 1 - wt && !k.party ? 'Derrota' : `¡Ganan los ${TEAM[wt].name}!`;
  k.win(head, TEAM[wt].col, `${TEAM[0].name} ${score[0]} – ${score[1]} ${TEAM[1].name} (${unit})<br>${who}<br>Toca para la revancha`, Math.max(0, d * (ht === 1 ? -1 : 1)));
}

/* =====================================================================================
 *  CENITALES: fútbol, hockey, coches y balón prisionero
 * ===================================================================================== */
const goalX = (tm) => (tm === 0 ? FW : 0); // portería que ataca el equipo tm
function nearestMate(b) { return B.filter((o) => o !== b && o.team === b.team && (MODE !== 'prisionero' || !o.jail)).sort((p, q) => hyp(p.x - b.x, p.y - b.y) - hyp(q.x - b.x, q.y - b.y))[0]; }
function release(b, vx, vy) { ball.own = null; ball.vx = vx; ball.vy = vy; ball.nt = b; ball.ntT = 0.22; lastTouch = b; }
function doPass(b, to) {
  if (!to) return; const lx = to.x + to.vx * 0.35, ly = to.y + to.vy * 0.35, d = hyp(lx - ball.x, ly - ball.y) || 1, sp = clamp(d * 1.7 + 130, 230, 520);
  release(b, (lx - ball.x) / d * sp, (ly - ball.y) / d * sp); to.recv = 0.8; k.sfx('pop');
}
function doShot(b, dir, power) {
  const gx = goalX(b.team), gy = FH / 2; let ax = dir ? dir.x : Math.cos(b.a), ay = dir ? dir.y : Math.sin(b.a);
  const tx = gx - ball.x, ty = gy - ball.y, td = hyp(tx, ty) || 1;
  if ((ax * tx + ay * ty) / td > Math.cos(0.7)) { // ayuda de puntería: hacia un palo del lado al que apuntas
    const side = (ay - ty / td) >= 0 ? 1 : -1, py = gy + side * M.gw * 0.3 + (b.ctl < 0 ? k.rnd(-1, 1) * (1 - skill) * M.gw * (weakCpu(b) ? 0.7 * (3 - 2 * ease(b)) : 0.5) : 0), px = gx, pd = hyp(px - ball.x, py - ball.y) || 1;
    ax = lerp(ax, (px - ball.x) / pd, 0.7); ay = lerp(ay, (py - ball.y) / pd, 0.7); const m = hyp(ax, ay); ax /= m; ay /= m; }
  const sp = lerp(M.shot[0], M.shot[1], power); release(b, ax * sp, ay * sp); k.sfx(power > 0.7 ? 'shoot' : 'hit'); if (power > 0.8) { k.shake(4); k.float('¡Cañonazo!', ...V(ball.x, ball.y - 14), '#ffd166'); }
}
function tackle(b) { if (b.cd > 0 || b.st > 0) return; b.slide = 0.28; b.cd = 1; const sp = MODE === 'hockey' ? 330 : 300; b.vx = Math.cos(b.a) * sp; b.vy = Math.sin(b.a) * sp; k.sfx('jump'); }
function steal(from, by) {
  const a = Math.atan2(from.y - by.y, from.x - by.x) + k.rnd(-0.6, 0.6); ball.own = null; ball.vx = Math.cos(a) * 140 + by.vx * 0.4; ball.vy = Math.sin(a) * 140 + by.vy * 0.4; ball.nt = from; ball.ntT = 0.4;
  from.st = 0.6; k.sfx('hit'); k.shake(3); const [sx, sy] = V(from.x, from.y); k.burst(sx, sy, '#fff', 10, 120); k.float('¡Robo!', sx, sy - 20, TEAM[by.team].col);
}

/* ---------- IA fútbol / hockey ---------- */
function lineClear(b, gx) { // ¿hay hueco? ningún rival cerca de la línea de tiro hacia alguno de los palos
  return [GY0 + 14, FH / 2, GY1 - 14].some((gy) => { const dx = gx - b.x, dy = gy - b.y, L = dx * dx + dy * dy || 1;
    return B.every((o) => { if (o.team === b.team) return true; const q = clamp(((o.x - b.x) * dx + (o.y - b.y) * dy) / L, 0, 1); return hyp(b.x + dx * q - o.x, b.y + dy * q - o.y) > M.r + 16; }); });
}
function aiField(b, dt) {
  const own = ball.own, mate = nearestMate(b), sp = M.spd * (weakCpu(b) ? 0.72 + 0.28 * skill : 0.8 + 0.2 * skill) * ease(b), gx = goalX(b.team), s = atk(b.team);
  let tx = b.x, ty = b.y, run = 1;
  b.think = (b.think || 0) - dt;
  if (own === b) {
    const dg = hyp(gx - b.x, FH / 2 - b.y), foe = B.filter((o) => o.team !== b.team).sort((p, q) => hyp(p.x - b.x, p.y - b.y) - hyp(q.x - b.x, q.y - b.y))[0];
    const foeAhead = foe && hyp(foe.x - b.x, foe.y - b.y) < 70 && (foe.x - b.x) * s > -5;
    if (b.chg >= 0) { b.chg += dt; if (b.chg >= b.chgT) { doShot(b, null, clamp(b.chg / 0.8, 0.35, 1)); b.chg = -1; } }
    else if (b.passReq > 0 && mate) { doPass(b, mate); b.passReq = 0; }
    else if (dg < (MODE === 'hockey' ? 210 : 200) && Math.abs(b.y - FH / 2) < 150 && b.think <= 0 && (lineClear(b, gx) || dg < 60 || Math.random() < 0.08) && Math.random() < (weakCpu(b) ? (ease(b) ** 2 * 1.1 - 0.1) * (0.6 + 0.4 * skill) : ease(b) * 1.1 - 0.1)) { b.chg = 0; b.chgT = lerp(0.2, 0.55, dg / 260) + k.rnd(0, 0.15); b.a = Math.atan2(FH / 2 - b.y, gx - b.x); }
    else if (foeAhead && mate && b.think <= 0 && (mate.x - b.x) * s > -40 && !B.some((o) => o.team !== b.team && hyp(o.x - mate.x, o.y - mate.y) < 45) && Math.random() < 0.5 + skill * 0.4) { doPass(b, mate); }
    else { tx = gx; ty = FH / 2 + (b.y < FH / 2 ? -30 : 30); if (foeAhead) ty = b.y + (foe.y > b.y ? -90 : 90); }
    if (b.think <= 0) b.think = lerp(0.5, 0.15, skill);
  } else {
    const mates = B.filter((o) => o.team === b.team), chaser = mates.sort((p, q) => hyp(p.x - ball.x, p.y - ball.y) - hyp(q.x - ball.x, q.y - ball.y))[0];
    const teamHas = own && own.team === b.team;
    const hMate = MODE !== 'prisionero' && B.some((o) => o !== b && o.team === b.team && o.ctl >= 0), og0 = goalX(1 - b.team);
    if (hMate && own !== b && !(chaser === b && Math.abs(ball.x - og0) < FW * 0.4) && !(teamHas && Math.abs(own.x - og0) < FW * 0.35)) { // con compañero humano: la CPU cubre atrás
      tx = teamHas ? lerp(og0, ball.x, 0.45) : og0 + s * (26 + 0.14 * Math.abs(ball.x - og0)); ty = teamHas ? (ball.y < FH / 2 ? FH * 0.65 : FH * 0.35) : clamp(lerp(FH / 2, ball.y + ball.vy * 0.2, 0.65), GY0 - 12, GY1 + 12); run = 1; }
    else if (teamHas) { // apoyo: por delante si el poseedor está en su campo; si ataca, se queda de cierre algo retrasado y abierto
      const og = goalX(1 - b.team), adv = (own.x - og) * s; tx = adv < FW * 0.5 ? clamp(own.x + s * 130, 40, FW - 40) : clamp(own.x - s * (90 - 40 * skill), 40, FW - 40); ty = own.y < FH / 2 ? FH * 0.7 : FH * 0.3; run = 0.85; }
    else if (chaser === b || b.recv > 0 || (chaser.ctl >= 0 && hyp(b.x - ball.x, b.y - ball.y) < 60)) {
      const lead = own ? 0.15 : clamp(hyp(ball.vx, ball.vy) / 600, 0, 0.5); tx = ball.x + ball.vx * lead; ty = ball.y + ball.vy * lead;
      if (own && own.team !== b.team && hyp(own.x - b.x, own.y - b.y) < 42 && b.cd <= 0 && Math.random() < dt * (2 + skill * 6)) { b.a = Math.atan2(own.y - b.y, own.x - b.x); tackle(b); }
      if (!own) { tx -= s * 6; } // se coloca un poco por detrás para empujar hacia delante
    } else { const og = goalX(1 - b.team); tx = og + s * (26 + 0.14 * Math.abs(ball.x - og)); ty = clamp(lerp(FH / 2, ball.y + ball.vy * 0.2, 0.65), GY0 - 12, GY1 + 12); run = 1; } // portero: entre balón y portería
  }
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy);
  return d > 6 ? { x: dx / d * Math.min(1, d / 30) * run, y: dy / d * Math.min(1, d / 30) * run, sp } : null;
}

/* ---------- Cuerpo a pie o sobre patines ---------- */
function moveWalker(b, dir, dt, spd) {
  if (b.st > 0) { b.st -= dt; b.vx *= 1 - 4 * dt; b.vy *= 1 - 4 * dt; }
  else if (b.slide > 0) { b.slide -= dt; }
  else if (M.skate) { const ax = dir ? dir.x * 560 : 0, ay = dir ? dir.y * 560 : 0; b.vx += ax * dt; b.vy += ay * dt; const v = hyp(b.vx, b.vy), mx = spd; if (v > mx) { b.vx *= mx / v; b.vy *= mx / v; } if (!dir) { b.vx *= 1 - 1.4 * dt; b.vy *= 1 - 1.4 * dt; } }
  else { const tx = dir ? dir.x * spd : 0, ty = dir ? dir.y * spd : 0, f = Math.min(1, M.acc * dt); b.vx += (tx - b.vx) * f; b.vy += (ty - b.vy) * f; }
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (dir && b.st <= 0 && b.slide <= 0) { const ta = Math.atan2(dir.y, dir.x); b.a += wrapA(ta - b.a) * Math.min(1, 12 * dt); }
  b.anim += hyp(b.vx, b.vy) * dt * 0.06;
  keepIn(b);
}
function separate() {
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const p = B[i], q = B[j]; if (MODE === 'prisionero' && p.team !== q.team) continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = hyp(dx, dy), m = M.r * 2 + (M.car ? 2 : 0);
    if (d < m && d > 0) { const o = (m - d) / 2, nx = dx / d, ny = dy / d; p.x -= nx * o; p.y -= ny * o; q.x += nx * o; q.y += ny * o;
      if (M.car) { const rel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny; if (rel > 60) { const hard = rel > 220; p.sp *= 0.5; q.sp = Math.max(q.sp, rel * 0.4); k.sfx(hard ? 'hit' : 'pop'); if (hard) { q.st = 0.5; q.spin = 8; k.shake(4); const [sx, sy] = V(q.x, q.y); k.float('¡Choque!', sx, sy - 22, '#ffd166'); } } } } }
}

/* ---------- Fútbol y hockey ---------- */
function stepField(dt) {
  for (const b of B) {
    b.recv = Math.max(0, (b.recv || 0) - dt); b.cd = Math.max(0, b.cd - dt); b.passReq = Math.max(0, (b.passReq || 0) - dt);
    let dir = null, spd = M.spd;
    if (b.ctl >= 0) {
      dir = inDir(b.ctl); const p = b.ctl;
      if (ball.own === b) {
        if (k.phit(p, 'a')) { if (TS > 1) doPass(b, nearestMate(b)); else doShot(b, dir, 0.3); }
        if (k.phit(p, 'b')) b.chg = 0;
        if (b.chg >= 0) { b.chg += dt; if (!k.pheld(p, 'b') || b.chg > 1.1) { doShot(b, dir, clamp(b.chg / 0.8, 0.2, 1)); b.chg = -1; } }
      } else {
        b.chg = -1;
        if (k.phit(p, 'b')) tackle(b);
        if (k.phit(p, 'a')) { const mate = nearestMate(b);
          if (mate && ball.own === mate && mate.ctl < 0) { mate.passReq = 0.6; k.float('¡Pásala!', ...V(b.x, b.y - 22), k.pcol(p)); }
          else if (mate && mate.ctl < 0 && hyp(mate.x - ball.x, mate.y - ball.y) < hyp(b.x - ball.x, b.y - ball.y)) { mate.ctl = b.ctl; b.ctl = -1; k.sfx('click'); } }
      }
    } else { const r = aiField(b, dt); if (r) { dir = { x: r.x, y: r.y }; spd = r.sp; } }
    if (b.chg >= 0) spd *= 0.6; else if (ball.own === b) spd *= 0.86; // con el balón se corre algo menos
    moveWalker(b, dir && hyp(dir.x, dir.y) > 0.05 ? dir : null, dt, spd * (dir ? Math.min(1, hyp(dir.x, dir.y) + 0.2) : 1));
    if (dir && b.chg >= 0 && b.ctl >= 0) b.a = Math.atan2(dir.y, dir.x);
  }
  separate();
  // balón
  ball.ntT = Math.max(0, ball.ntT - dt); if (ball.ntT <= 0) ball.nt = null;
  if (ball.own) {
    const o = ball.own, fx = Math.cos(o.a), fy = Math.sin(o.a), d = M.r + ball.r + 1;
    ball.x += (o.x + fx * d - ball.x) * Math.min(1, 18 * dt); ball.y += (o.y + fy * d - ball.y) * Math.min(1, 18 * dt); ball.vx = o.vx; ball.vy = o.vy; ball.spin += hyp(o.vx, o.vy) * dt * 0.1;
    // robo por contacto: un rival encima y el poseedor casi parado
    for (const q of B) if (q.team !== o.team && q.st <= 0 && hyp(q.x - ball.x, q.y - ball.y) < M.r + ball.r - 1 && (q.slide > 0 || Math.random() < dt * 1.5)) { steal(o, q); break; }
    if (o.st > 0) { ball.own = null; }
  } else {
    ball.x += ball.vx * dt; ball.y += ball.vy * dt; const f = Math.max(0, 1 - M.fr * dt); ball.vx *= f; ball.vy *= f; ball.spin += hyp(ball.vx, ball.vy) * dt * 0.1;
    if (walls(ball, ball.r, M.rest) && hyp(ball.vx, ball.vy) > 120) { k.sfx('click'); }
    const v = hyp(ball.vx, ball.vy);
    for (const q of B) { if (q === ball.nt || q.st > 0) continue; const dx = ball.x - q.x, dy = ball.y - q.y, d = hyp(dx, dy);
      const keeper = Math.abs(q.x - goalX(1 - q.team)) < 90 && q.y > GY0 - 30 && q.y < GY1 + 30, reach = M.r + ball.r + 3 + (keeper ? (weakCpu(q) ? 4 + 14 * skill : 18) : 0); // el que guarda la portería llega más lejos (estirada)
      if (d < reach) {
        const rel = hyp(ball.vx - q.vx, ball.vy - q.vy);
        if (keeper && d > M.r + ball.r + 3) { const [sx, sy] = V(q.x, q.y); k.float('¡Parada!', sx, sy - 20, TEAM[q.team].col); }
        if (rel < (MODE === 'hockey' ? 330 : 280) * (keeper ? (weakCpu(q) ? 1.15 + 0.45 * skill : 1.6) : 1) || q.slide > 0) { ball.own = q; q.chg = -1; lastTouch = q; if (q.recv > 0) q.recv = 0; k.sfx('click'); break; }
        const nx = dx / (d || 1), ny = dy / (d || 1), vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { ball.vx -= 1.6 * vn * nx; ball.vy -= 1.6 * vn * ny; ball.vx *= 0.6; ball.vy *= 0.6; } ball.x = q.x + nx * reach; ball.y = q.y + ny * reach; lastTouch = q; k.sfx('hit');
      } }
    if (v < 0.5) { ball.vx = ball.vy = 0; }
  }
  // gol
  if (ball.y > GY0 && ball.y < GY1 && (ball.x < -ball.r * 0.2 || ball.x > FW + ball.r * 0.2)) { ball.own = null; goal(ball.x < 0 ? 1 : 0); }
  else { ball.x = clamp(ball.x, -30, FW + 30); ball.y = clamp(ball.y, 2, FH - 2); }
}

/* ---------- Coches con balón ---------- */
function stepCars(dt) {
  for (const b of B) {
    let dir = null, turbo = false, jump = false;
    if (b.ctl >= 0) { dir = inDir(b.ctl); turbo = k.pheld(b.ctl, 'b'); jump = k.phit(b.ctl, 'a'); }
    else { const r = aiCar(b, dt); dir = r.dir; turbo = r.turbo; jump = r.jump; }
    if (b.st > 0) { b.st -= dt; b.a += (b.spin || 0) * dt; b.spin *= 1 - 3 * dt; dir = null; turbo = false; }
    const top = M.spd * (b.ctl < 0 ? (0.86 + 0.14 * skill) * ease(b) : 1);
    if (dir) { const ta = Math.atan2(dir.y, dir.x), df = wrapA(ta - b.a), turn = 3.6 - Math.min(1.4, Math.abs(b.sp) / 200); b.a += clamp(df, -turn * dt, turn * dt);
      const want = Math.abs(df) > 2.3 && b.sp < 80 ? -top * 0.45 : top * (Math.cos(df) > 0 ? 1 : 0.35); b.sp += (want - b.sp) * Math.min(1, M.acc * dt); }
    else b.sp *= 1 - 1.6 * dt;
    if (turbo && b.boost > 0.02 && b.st <= 0) { b.sp = Math.min(b.sp + 700 * dt, 380); b.boost = Math.max(0, b.boost - 0.55 * dt); b.fire = 0.1; } else b.boost = Math.min(1, b.boost + 0.1 * dt);
    b.fire = Math.max(0, (b.fire || 0) - dt);
    if (jump && b.z <= 0) { b.vz = 250; k.sfx('jump'); }
    b.vz -= 720 * dt; b.z = Math.max(0, b.z + b.vz * dt); if (b.z <= 0 && b.vz < 0) { if (b.vz < -150) k.sfx('click'); b.vz = 0; }
    b.vx = Math.cos(b.a) * b.sp; b.vy = Math.sin(b.a) * b.sp; b.x += b.vx * dt; b.y += b.vy * dt;
    const ox = b.x, oy = b.y; b.x = clamp(b.x, M.r, FW - M.r); b.y = clamp(b.y, M.r, FH - M.r); walls(b, M.r, 0);
    if (ox !== b.x || oy !== b.y) b.sp *= 0.7;
    b.anim += b.sp * dt;
  }
  separate();
  // balón gigante con altura
  const bl = ball; bl.vz -= 520 * dt; bl.z += bl.vz * dt; if (bl.z < 0) { bl.z = 0; if (bl.vz < -60) { bl.vz *= -0.62; k.sfx('click'); } else bl.vz = 0; }
  bl.x += bl.vx * dt; bl.y += bl.vy * dt; const f = Math.max(0, 1 - (bl.z > 1 ? 0.12 : M.fr) * dt); bl.vx *= f; bl.vy *= f; bl.spin += hyp(bl.vx, bl.vy) * dt * 0.05;
  if (bl.z > 70 && (bl.x < bl.r || bl.x > FW - bl.r)) { bl.x = clamp(bl.x, bl.r, FW - bl.r); bl.vx *= -M.rest; } // por encima del larguero rebota
  else if (walls(bl, bl.r, M.rest)) k.sfx('click');
  for (const b of B) { const dx = bl.x - b.x, dy = bl.y - b.y, d = hyp(dx, dy); if (d < bl.r + M.r && bl.z < b.z + 26) {
    const nx = dx / (d || 1), ny = dy / (d || 1), rel = (b.vx - bl.vx) * nx + (b.vy - bl.vy) * ny; bl.x = b.x + nx * (bl.r + M.r); bl.y = b.y + ny * (bl.r + M.r);
    if (rel > 0) { const imp = rel * 1.3 + 40; bl.vx += nx * imp; bl.vy += ny * imp; bl.vz += (b.z > 3 ? 230 : 40) + rel * 0.12; lastTouch = b; k.sfx(rel > 250 ? 'shoot' : 'hit'); if (rel > 250) { k.shake(4); k.burst(...V(bl.x, bl.y), '#fff', 12, 180); } } } }
  const sp = hyp(bl.vx, bl.vy); if (sp > 720) { bl.vx *= 720 / sp; bl.vy *= 720 / sp; }
  if (bl.y > GY0 && bl.y < GY1 && bl.z < 70 && (bl.x < -bl.r * 0.3 || bl.x > FW + bl.r * 0.3)) goal(bl.x < 0 ? 1 : 0, '¡GOLAZO!');
  else { bl.x = clamp(bl.x, -bl.r * 2, FW + bl.r * 2); bl.y = clamp(bl.y, bl.r, FH - bl.r); }
}
function aiCar(b, dt) {
  const bl = ball, gx = goalX(b.team), og = goalX(1 - b.team), s = atk(b.team);
  const mates = B.filter((o) => o.team === b.team), chaser = mates.sort((p, q) => hyp(p.x - bl.x, p.y - bl.y) - hyp(q.x - bl.x, q.y - bl.y))[0];
  const gdx = gx - bl.x, gdy = FH / 2 - bl.y, gd = hyp(gdx, gdy) || 1; let tx, ty, turbo = false, jump = false;
  if (chaser === b || (bl.x - og) * s < 150) {
    const behindX = bl.x - gdx / gd * (bl.r + 30), behindY = bl.y - gdy / gd * (bl.r + 30);
    const toB = hyp(bl.x - b.x, bl.y - b.y), align = ((bl.x - b.x) * gdx + (bl.y - b.y) * gdy) / (toB * gd || 1);
    if (align > 0.55) { tx = bl.x; ty = bl.y; turbo = align > 0.85 && toB < 240 && Math.random() < 0.3 + skill * 0.6; }
    else { tx = behindX; ty = behindY; if (hyp(tx - b.x, ty - b.y) > 40 && Math.abs((b.y - bl.y)) < bl.r + 18 && (b.x - bl.x) * s > 0) ty += (b.y < FH / 2 ? 1 : -1) * 60; }
    if (bl.z > 18 && toB < 60 && b.z <= 0 && Math.random() < 0.4 + skill * 0.5) jump = true;
  } else { tx = og + s * 45; ty = clamp(bl.y, GY0 + 10, GY1 - 10); if (hyp(bl.x - b.x, bl.y - b.y) < 110) { tx = bl.x; ty = bl.y; } }
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy);
  return { dir: d > 10 ? { x: dx / d, y: dy / d } : null, turbo, jump };
}

/* ---------- Balón prisionero ---------- */
function zoneOf(b) { const j = b.jail; return b.team === 0 ? (j ? [566, 600] : [34, 300]) : (j ? [0, 34] : [300, 566]); }
function inField(b) { return !b.jail; }
function throwBall(b, dir) {
  const bl = b.hold; if (!bl) return;
  const foes = B.filter((o) => o.team !== b.team && inField(o));
  let tgt = null;
  if (dir) { let best = 0.85; for (const o of foes) { const dx = o.x - b.x, dy = o.y - b.y, d = hyp(dx, dy) || 1, cs = (dx * dir.x + dy * dir.y) / d; if (cs > best) { best = cs; tgt = o; } } }
  else tgt = foes.sort((p, q) => hyp(p.x - b.x, p.y - b.y) - hyp(q.x - b.x, q.y - b.y))[0];
  const sp = b.ctl >= 0 ? 440 : 330 + 110 * skill; let ax, ay;
  if (tgt) { const d = hyp(tgt.x - b.x, tgt.y - b.y), tt = d / sp, lx = tgt.x + tgt.vx * tt * (b.ctl >= 0 ? 0.6 : skill * 0.9), ly = tgt.y + tgt.vy * tt * (b.ctl >= 0 ? 0.6 : skill * 0.9), dd = hyp(lx - b.x, ly - b.y) || 1; ax = (lx - b.x) / dd; ay = (ly - b.y) / dd;
    if (b.ctl < 0) { const e = k.rnd(-1, 1) * (1 - skill) * 0.28, ca = Math.cos(e), sa = Math.sin(e); [ax, ay] = [ax * ca - ay * sa, ax * sa + ay * ca]; } }
  else if (dir) { ax = dir.x; ay = dir.y; } else { ax = atk(b.team); ay = 0; }
  b.hold = null; bl.hold = null; bl.live = true; bl.thr = b; bl.x = b.x + ax * (M.r + bl.r + 2); bl.y = b.y + ay * (M.r + bl.r + 2); bl.vx = ax * sp; bl.vy = ay * sp; b.a = Math.atan2(ay, ax); b.cd = 0.5; k.sfx('shoot');
}
function aiDodge(b, dt) {
  b.think = (b.think || 0) - dt; const z = zoneOf(b), s = atk(b.team);
  if (b.think > 0 && b.goal) return b.goal.dir;
  b.think = lerp(0.35, 0.1, skill) + k.rnd(0, 0.1);
  let tx = b.x, ty = b.y; b.goal = { dir: null };
  // ¿viene un balón vivo hacia mí?
  for (const bl of balls) { if (!bl.live || !bl.thr || bl.thr.team === b.team || b.jail) continue;
    const rx = b.x - bl.x, ry = b.y - bl.y, vv = bl.vx * bl.vx + bl.vy * bl.vy || 1, tc = (rx * bl.vx + ry * bl.vy) / vv; if (tc < 0 || tc > 0.7) continue;
    const cx = bl.x + bl.vx * tc - b.x, cy = bl.y + bl.vy * tc - b.y; if (hyp(cx, cy) > M.r + bl.r + 10) continue;
    if (!b.hold && b.cd <= 0 && Math.random() < 0.15 + skill * 0.45) { b.catchT = 0.38; b.cd = 1; b.goal = { dir: null }; return null; }
    const px = -bl.vy, py = bl.vx, pm = hyp(px, py) || 1, side = (cx * px + cy * py) > 0 ? -1 : 1; b.goal = { dir: { x: px / pm * side, y: py / pm * side } }; b.think = 0.25; return b.goal.dir; }
  if (b.hold) {
    b.holdT = (b.holdT || 0) + 0.2;
    if (b.jail || b.holdT > lerp(1.4, 0.5, skill) + k.rnd(0, 0.4)) { throwBall(b, null); b.holdT = 0; return null; }
    tx = b.jail ? (z[0] + z[1]) / 2 : (s > 0 ? z[1] - 40 : z[0] + 40); ty = clamp(b.y + k.rnd(-60, 60), 30, FH - 30);
  } else {
    const free = balls.filter((bl) => !bl.hold && (!bl.live || hyp(bl.vx, bl.vy) < 150) && bl.x > z[0] - 4 && bl.x < z[1] + 4 && !B.some((o) => o !== b && o.team === b.team && o.chase === bl));
    const tgt = free.sort((p, q) => hyp(p.x - b.x, p.y - b.y) - hyp(q.x - b.x, q.y - b.y))[0]; b.chase = tgt || null;
    if (tgt) { tx = tgt.x; ty = tgt.y; }
    else if (b.jail) { tx = (z[0] + z[1]) / 2; ty = clamp(b.y + k.rnd(-80, 80), 30, FH - 30); }
    else { tx = s > 0 ? z[0] + 40 + k.rnd(0, 90) : z[1] - 40 - k.rnd(0, 90); ty = k.rnd(40, FH - 40); }
  }
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy); b.goal = { dir: d > 8 ? { x: dx / d, y: dy / d } : null }; return b.goal.dir;
}
function stepDodge(dt) {
  for (const b of B) {
    b.cd = Math.max(0, b.cd - dt); b.catchT = Math.max(0, b.catchT - dt); b.inv = Math.max(0, b.inv - dt);
    let dir = null;
    if (b.ctl >= 0) { dir = inDir(b.ctl); if (k.phit(b.ctl, 'a') && b.hold) throwBall(b, dir); if (k.phit(b.ctl, 'b') && b.cd <= 0 && !b.hold) { b.catchT = 0.4; b.cd = 0.9; k.sfx('click'); } }
    else dir = aiDodge(b, dt);
    moveWalker(b, dir, dt, M.spd * (b.ctl < 0 ? 0.82 + 0.18 * skill : 1) * (b.catchT > 0 ? 0.35 : 1));
    if (b.hold) { b.hold.x = b.x + Math.cos(b.a) * (M.r + 4); b.hold.y = b.y + Math.sin(b.a) * (M.r + 4); }
  }
  separate();
  for (const bl of balls) {
    if (bl.hold) continue;
    bl.x += bl.vx * dt; bl.y += bl.vy * dt; const f = Math.max(0, 1 - (bl.live ? 0.25 : M.fr) * dt); bl.vx *= f; bl.vy *= f; bl.spin += hyp(bl.vx, bl.vy) * dt * 0.1;
    bl.x = clamp(bl.x, bl.r, FW - bl.r); bl.y = clamp(bl.y, bl.r, FH - bl.r);
    if (bl.x <= bl.r || bl.x >= FW - bl.r) { bl.vx *= -0.6; if (bl.live) bl.live = false; } if (bl.y <= bl.r || bl.y >= FH - bl.r) { bl.vy *= -0.6; bl.live = bl.live && hyp(bl.vx, bl.vy) > 250; }
    if (bl.live && hyp(bl.vx, bl.vy) < 170) bl.live = false;
    for (const b of B) {
      const d = hyp(bl.x - b.x, bl.y - b.y); if (d > M.r + bl.r + 2) continue;
      if (bl.live && bl.thr && bl.thr.team !== b.team && inField(b)) {
        if (b.catchT > 0 && !b.hold) { b.hold = bl; bl.hold = b; bl.live = false; b.catchT = 0; b.holdT = 0; k.sfx('coin'); const [sx, sy] = V(b.x, b.y); k.float('¡Atrapada!', sx, sy - 22, '#7cf7a0'); k.burst(sx, sy, '#7cf7a0', 14, 150); break; }
        if (b.inv > 0) { bl.vx *= -0.3; bl.vy *= -0.3; bl.live = false; break; }
        // ¡eliminado! a la cárcel, detrás del equipo rival
        const [sx, sy] = V(b.x, b.y); k.sfx('hurt'); k.shake(5); k.burst(sx, sy, TEAM[b.team].col, 22, 220); k.float('¡Tocado!', sx, sy - 22, '#ff5f7a');
        b.jail = true; if (b.hold) { b.hold.hold = null; b.hold = null; } const z = zoneOf(b); b.x = (z[0] + z[1]) / 2; b.inv = 0.8;
        const th = bl.thr; if (th.jail) { th.jail = false; const z2 = zoneOf(th); th.x = th.team ? z2[1] - 30 : z2[0] + 30; th.inv = 1.5; k.float('¡Liberado!', ...V(th.x, th.y - 22), '#7cf7a0'); k.sfx('coin'); }
        bl.vx *= -0.25; bl.vy *= -0.25; bl.live = false; if (golden) { roundEnd(th.team); return; } break;
      }
      if (!bl.live && !b.hold && b.catchT <= 0 && hyp(bl.vx, bl.vy) < 220 && b.cd <= 0.3 && bl.x >= zoneOf(b)[0] - 3 && bl.x <= zoneOf(b)[1] + 3) { b.hold = bl; bl.hold = b; b.holdT = 0; bl.vx = bl.vy = 0; k.sfx('pop'); break; }
    }
  }
  for (let tm = 0; tm < 2; tm++) if (!B.some((b) => b.team === tm && inField(b))) { roundEnd(1 - tm); return; }
}
function roundEnd(tm) {
  score[tm]++; phase = 'goal'; phT = 2; golden = false; clock = CFG.round || 60; roundNo++;
  msg = `¡Ronda para los ${TEAM[tm].name}!`; msgT = 2; k.sfx('win'); k.confetti(TEAM[tm].col, 90); k.flash('rgba(255,255,255,.3)');
}

/* =====================================================================================
 *  LATERALES: vóley playa y fútbol cabezón
 * ===================================================================================== */
const GROUND = 352, NET = 320, NET_TOP = 222, GRAV_V = 520;
/* ---------- Vóley ---------- */
function voleyServe() {
  phase = 'serve'; phT = 0; touches = [0, 0]; lastTouch = null;
  const srv = B.filter((b) => b.team === serveTeam)[serveIdx[serveTeam] % 2];
  B.forEach((b) => { const s = b.team ? 1 : -1, front = b !== srv && b.team === serveTeam ? true : b.i === 1; Object.assign(b, { x: NET + s * (b === srv ? 285 : front ? 70 : 200), y: GROUND, vx: 0, vy: 0, st: 0, air: false, spike: 0 }); });
  if (serveTeam !== srv.team) {} ball = { x: srv.x + (srv.team ? -12 : 12), y: GROUND - 70, vx: 0, vy: 0, r: 11, spin: 0, srv, held: true };
}
function ballistic(x0, y0, x1, apexY) {
  const y1 = GROUND - 44, ay = Math.min(apexY, y0 - 10, y1 - 10), vy = -Math.sqrt(2 * GRAV_V * (y0 - ay)), tu = -vy / GRAV_V, td = Math.sqrt(2 * (y1 - ay) / GRAV_V);
  return [(x1 - x0) / (tu + td), vy];
}
function landX(yLevel) { // dónde cruzará el balón la altura yLevel al bajar
  let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy; for (let i = 0; i < 300; i++) { vy += GRAV_V / 60; x += vx / 60; y += vy / 60; if (vy > 0 && y >= yLevel) return x; if (Math.abs(x - NET) < ball.r && y > NET_TOP) vx = -vx * 0.5; } return x;
}
function voleyHit(b, spike, over, aimX) {
  const s = b.team ? 1 : -1, other = -s; touches[b.team]++; touches[1 - b.team] = 0; lastTouch = b; ball.held = false;
  if (touches[b.team] > 3) return point(1 - b.team, '¡Cuatro toques!');
  const [bx, by] = [ball.x, ball.y], wasSpike = ball.spk; ball.spk = false;
  if (Math.random() < (wasSpike ? (b.ctl >= 0 ? 0.3 : 0.55 - 0.3 * skill) : b.ctl >= 0 ? 0 : 0.1 - 0.06 * skill)) { // recepción de un remate: a veces el balón sale rebotado sin control
    ball.vx = k.rnd(-1, 1) * 220 + s * 60; ball.vy = -k.rnd(180, 320); k.sfx('hit'); k.float('¡Uy!', bx, by - 20, '#fff'); return; }
  if (spike) { ball.spk = true; const tx = NET + other * (60 + Math.random() * 180) + (aimX || 0) * 60, T0 = Math.abs(tx - bx) / 600; let vy = (GROUND - 20 - by - 0.5 * GRAV_V * T0 * T0) / T0; ball.vx = (tx - bx) / T0; ball.vy = Math.max(vy, -80);
    for (let it = 0; it < 10; it++) { const tn = (NET - bx) / ball.vx; if (tn <= 0 || by + ball.vy * tn + 0.5 * GRAV_V * tn * tn < NET_TOP - ball.r - 6) break; ball.vy -= 45; ball.vx *= 0.94; } /* que pase por encima de la red */ k.sfx('shoot'); k.shake(5); k.float('¡Remate!', bx, by - 20, '#ffd166'); k.burst(bx, by, '#fff', 14, 200); return; }
  let tx, apex;
  if (over || touches[b.team] >= 3) { tx = NET + other * (70 + Math.random() * 200) + (aimX || 0) * 70; apex = NET_TOP - 90 - Math.random() * 40; }
  else if (touches[b.team] === 1) { tx = NET + s * 110; apex = NET_TOP - 110; }
  else { tx = NET + s * 48; apex = NET_TOP - 120; }
  if (b.ctl < 0) tx += k.rnd(-1, 1) * (1 - skill) * 40;
  [ball.vx, ball.vy] = ballistic(bx, by, tx, apex); k.sfx('pop');
}
function point(tm, why) {
  if (phase !== 'play') return; score[tm]++; phase = 'goal'; phT = 1.6; msg = why || `Punto ${TEAM[tm].name}`; msgT = 1.6; k.sfx(why ? 'hurt' : 'coin'); k.burst(ball.x, Math.min(ball.y, GROUND - 6), TEAM[tm].col, 24, 200);
  if (serveTeam !== tm) { serveTeam = tm; serveIdx[tm]++; }
}
const PTS = CFG.pts || 7;
function voleyWon() { const a = score[0], b = score[1]; return (Math.max(a, b) >= PTS && Math.abs(a - b) >= 2) || Math.max(a, b) >= PTS + 4; }
function stepVoley(dt) {
  const srvP = ball.srv;
  if (phase === 'serve') {
    phT += dt; ball.x = srvP.x + (srvP.team ? -12 : 12); ball.y = GROUND - 70 + Math.sin(phT * 5) * 3;
    const go = srvP.ctl >= 0 ? (k.phit(srvP.ctl, 'a') || k.phit(srvP.ctl, 'b') || phT > 4) : phT > 1 + (1 - skill) * 0.6;
    if (go) { phase = 'play'; const other = srvP.team ? -1 : 1, tx = NET + other * (90 + Math.random() * 170); [ball.vx, ball.vy] = ballistic(ball.x, ball.y, tx, NET_TOP - 100 - Math.random() * 30); ball.held = false; lastTouch = srvP; touches = [0, 0]; k.sfx('jump'); }
  }
  for (const b of B) {
    const s = b.team ? 1 : -1, x0 = b.team ? NET + 16 : 16, x1 = b.team ? W - 16 : NET - 16;
    let mv = 0, jump = false, dive = false;
    if (b.ctl >= 0) { const d = k.pdir(b.ctl); mv = d.x; jump = k.phit(b.ctl, 'a') || k.phit(b.ctl, 'up'); b.wantOver = k.pheld(b.ctl, 'b'); b.aim = d.x * -s; }
    else if (phase === 'play' || phase === 'serve') { const r = aiVoley(b, dt); mv = r.mv; jump = r.jump; b.wantOver = r.over; b.aim = 0; }
    const spd = b.ctl >= 0 ? 235 : (190 + 45 * skill) * ease(b);
    b.vx += (mv * spd - b.vx) * Math.min(1, (b.air ? 5 : 14) * dt);
    if (jump && !b.air && b !== (phase === 'serve' ? srvP : null)) { b.vy = -520; b.air = true; k.sfx('jump'); }
    b.vy += 1300 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y >= GROUND) { if (b.air) k.burst(b.x, GROUND, '#f3dca0', 6, 60); b.y = GROUND; b.vy = 0; b.air = false; }
    b.x = clamp(b.x, x0, x1); b.anim += Math.abs(b.vx) * dt * 0.05;
    if (phase === 'serve' && b === srvP) b.x = NET + s * 285;
  }
  if (phase !== 'play') return;
  const bl = ball; bl.vy += GRAV_V * dt; bl.x += bl.vx * dt; bl.y += bl.vy * dt; bl.spin += bl.vx * dt * 0.05;
  // red
  if (Math.abs(bl.x - NET) < bl.r + 3 && bl.y > NET_TOP) { const side = bl.x < NET ? -1 : 1; if (bl.vx * side < 0 || true) { bl.x = NET + side * (bl.r + 3); bl.vx = -bl.vx * 0.35 || side * 20; k.sfx('click'); } }
  else { const d = hyp(bl.x - NET, bl.y - NET_TOP); if (d < bl.r + 4) { const nx = (bl.x - NET) / d, ny = (bl.y - NET_TOP) / d, vn = bl.vx * nx + bl.vy * ny; if (vn < 0) { bl.vx -= 1.7 * vn * nx; bl.vy -= 1.7 * vn * ny; } bl.x = NET + nx * (bl.r + 4); bl.y = NET_TOP + ny * (bl.r + 4); k.sfx('click'); } }
  if (bl.y < 20 && bl.vy < 0) bl.vy *= -0.5;
  // toques
  for (const b of B) { if (b === lastTouch) continue; const hx = b.x, hy = b.y - 46, d = hyp(bl.x - hx, bl.y - hy);
    if (d < 22 + bl.r) { const spike = b.air && bl.y < NET_TOP + 30 && Math.abs(b.x - NET) < 150 && (b.ctl >= 0 ? true : b.spikeI); voleyHit(b, spike, b.wantOver, b.aim); break; } }
  // suelo / fuera
  if (bl.y >= GROUND - bl.r) { const inL = bl.x > 8 && bl.x < NET, inR = bl.x > NET && bl.x < W - 8;
    if (inL || inR) point(inL ? 1 : 0); else point(lastTouch ? 1 - lastTouch.team : 0, '¡Fuera!'); bl.y = GROUND - bl.r; bl.vy = -bl.vy * 0.4; bl.vx *= 0.5; }
  if (bl.x < -40 || bl.x > W + 40) point(lastTouch ? 1 - lastTouch.team : 0, '¡Fuera!');
}
function aiVoley(b, dt) {
  const s = b.team ? 1 : -1, mates = B.filter((o) => o.team === b.team), mate = mates.find((o) => o !== b);
  b.think = (b.think || 0) - dt;
  if (b.think <= 0) { b.think = lerp(0.3, 0.08, skill); const lx = landX(GROUND - 46); b.px = lx + k.rnd(-1, 1) * (1 - skill) * (ball.spk ? 70 : touches[1 - b.team] >= 3 ? 48 : 30); }
  const mySide = (x) => (b.team ? x > NET : x < NET);
  let tx = NET + s * (b.i ? 80 : 200), jump = false; b.spikeI = false;
  if (phase === 'play' && mySide(b.px)) {
    const cand = mates.filter((o) => o !== lastTouch).sort((p, q) => Math.abs(p.x - b.px) - Math.abs(q.x - b.px))[0];
    if (cand === b) { tx = b.px + s * 6;
      if (touches[b.team] === 2 && Math.abs(b.px - NET) < 140 && Math.random() < 0.35 + skill * 0.55) { b.spikeI = true; const tUp = 0.36; // salta para rematar
        const T = 0.3, py = ball.y + ball.vy * T + 0.5 * GRAV_V * T * T, pxx = ball.x + ball.vx * T; if (!b.air && py > NET_TOP - 34 && py < NET_TOP + 22 && ball.vy > -120 && Math.abs(pxx - b.x) < 40) jump = true; tx = b.px + s * 14; }
    } else tx = touches[b.team] === 0 ? NET + s * 60 : NET + s * 150;
  } else if (phase === 'play' && lastTouch && lastTouch.team === b.team) tx = NET + s * (b === lastTouch ? 170 : 80);
  const dx = tx - b.x; return { mv: Math.abs(dx) < 5 ? 0 : clamp(dx / 30, -1, 1), jump, over: touches[b.team] >= 2 };
}

/* ---------- Fútbol cabezón ---------- */
const CG = { x: 56, bar: 250 }; // portería: ancho y altura del larguero
function stepHead(dt) {
  const bl = ball;
  for (const b of B) {
    const s = atk(b.team); let mv = 0, jump = false, kick = false;
    if (b.ctl >= 0) { const d = k.pdir(b.ctl); mv = d.x; jump = k.phit(b.ctl, 'a') || k.phit(b.ctl, 'up'); kick = k.phit(b.ctl, 'b'); }
    else { const r = aiHead(b, dt); mv = r.mv; jump = r.jump; kick = r.kick; }
    if (b.st > 0) { b.st -= dt; mv = 0; jump = false; kick = false; }
    const spd = b.ctl >= 0 ? 250 : (205 + 45 * skill) * ease(b);
    b.vx += (mv * spd - b.vx) * Math.min(1, (b.y < GROUND ? 6 : 16) * dt);
    if (jump && b.y >= GROUND) { b.vy = -560; k.sfx('jump'); }
    b.vy += 1500 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y >= GROUND) { b.y = GROUND; b.vy = 0; }
    b.x = clamp(b.x, CG.x + 16, W - CG.x - 16); b.anim += Math.abs(b.vx) * dt * 0.05;
    b.kick = Math.max(0, (b.kick || 0) - dt); if (kick && b.kick <= 0) { b.kick = 0.24; b.kicked = false; }
    if (b.kick > 0.1 && !b.kicked) { const fx = b.x + s * 26, fy = b.y - 14, d = hyp(bl.x - fx, bl.y - fy);
      const over = b.y < GROUND - 20 && bl.y < b.y - 62 && Math.abs(bl.x - b.x) < 46;
      if (d < 20 + bl.r || over) { b.kicked = true; const sup = b.sup >= 1;
        if (sup) { bl.vx = s * 900; bl.vy = -60; bl.fire = 1.3; b.sup = 0; k.sfx('explode'); k.shake(8); k.float('¡Superdisparo!', bl.x, bl.y - 26, '#ff9f5a'); }
        else if (over) { bl.vx = s * 640; bl.vy = 160; k.sfx('shoot'); k.float('¡Chilena!', bl.x, bl.y - 26, '#ffd166'); k.shake(4); }
        else { bl.vx = s * k.rnd(320, 440) + b.vx * 0.3; bl.vy = -k.rnd(300, 440); k.sfx('hit'); }
        b.sup = Math.min(1, (b.sup || 0) + (sup ? 0 : 0.16)); lastTouch = b; k.burst(bl.x, bl.y, '#fff', 10, 150); } }
  }
  // choque entre jugadores
  if (B.length === 2) { const [p, q] = B, dx = q.x - p.x; if (Math.abs(dx) < 40 && Math.abs(p.y - q.y) < 60) { const o = (40 - Math.abs(dx)) / 2 * Math.sign(dx || 1); p.x -= o; q.x += o; } }
  // balón
  bl.fire = Math.max(0, bl.fire - dt); bl.vy += (bl.fire > 0 ? 200 : 900) * dt; bl.x += bl.vx * dt; bl.y += bl.vy * dt; bl.spin += bl.vx * dt * 0.05; bl.vx *= 1 - 0.15 * dt;
  if (bl.y > GROUND - bl.r) { bl.y = GROUND - bl.r; if (bl.vy > 80) k.sfx('click'); bl.vy = -bl.vy * 0.72; bl.vx *= 0.94; if (Math.abs(bl.vy) < 40) { bl.vy = 0; bl.vx *= 1 - 0.9 * dt; } }
  if (bl.y < 34 + bl.r) { bl.y = 34 + bl.r; bl.vy = Math.abs(bl.vy) * 0.8; }
  for (const side of [0, 1]) { // larguero y fondo por encima
    const gx0 = side ? W - CG.x : 0, gx1 = side ? W : CG.x;
    if (bl.x + bl.r > gx0 && bl.x - bl.r < gx1 && Math.abs(bl.y - CG.bar) < bl.r + 4) { bl.vy = bl.y < CG.bar ? -Math.abs(bl.vy) * 0.8 : Math.abs(bl.vy) * 0.8; bl.y = CG.bar + (bl.y < CG.bar ? -1 : 1) * (bl.r + 4); k.sfx('click'); }
    if (bl.y < CG.bar && ((side === 0 && bl.x - bl.r < 0) || (side === 1 && bl.x + bl.r > W))) { bl.vx = -bl.vx * 0.3; bl.vy *= 0.6; bl.x = side ? W - bl.r : bl.r; k.sfx('click'); } // la grada amortigua
  }
  for (const b of B) { // cabeza y cuerpo
    for (const [cx, cy, r, e] of [[b.x, b.y - 52, 26, 0.9], [b.x, b.y - 16, 16, 0.5]]) { const dx = bl.x - cx, dy = bl.y - cy, d = hyp(dx, dy);
      if (d < r + bl.r && d > 0) { const nx = dx / d, ny = dy / d, rel = (bl.vx - b.vx) * nx + (bl.vy - b.vy) * ny; bl.x = cx + nx * (r + bl.r); bl.y = cy + ny * (r + bl.r);
        if (rel < 0) { bl.vx -= (1 + e) * rel * nx; bl.vy -= (1 + e) * rel * ny; if (e > 0.8) { bl.vx += atk(b.team) * 60 + b.vx * 0.2; bl.vy += b.vy * 0.4 - 60; b.sup = Math.min(1, (b.sup || 0) + 0.06); k.sfx('pop'); } lastTouch = b; if (bl.vx * atk(b.team) < -240) bl.vx = -atk(b.team) * 240; } // rebote hacia la propia portería: suave
        if (bl.fire > 0 && lastTouch && lastTouch.team !== b.team) { b.st = 1; b.vx = atk(lastTouch.team) * 300; k.sfx('hurt'); k.float('¡Aturdido!', b.x, b.y - 90, '#ff9f5a'); bl.fire = 0; } } }
  }
  const sp = hyp(bl.vx, bl.vy); if (sp > 950) { bl.vx *= 950 / sp; bl.vy *= 950 / sp; }
  if (phase !== 'play') { if (bl.x < CG.x) bl.vx *= 1 - 4 * dt, bl.x = Math.max(bl.x, bl.r); } // celebración: el balón se queda en la red
  else if (bl.y > CG.bar + 4 && bl.x + bl.r < CG.x - 4) goal(1); else if (bl.y > CG.bar + 4 && bl.x - bl.r > W - CG.x + 4) goal(0);
  bl.x = clamp(bl.x, bl.r, W - bl.r);
}
function aiHead(b, dt) {
  const s = atk(b.team), bl = ball, ownG = b.team ? W - CG.x : CG.x; b.think = (b.think || 0) - dt;
  if (b.think <= 0) { b.think = lerp(0.28, 0.07, skill); b.tx = bl.x + bl.vx * 0.2 - s * 26; if ((bl.x - b.x) * s < -10) b.tx = bl.x - s * 40; // el balón a su espalda: vuelve
    if ((bl.x - ownG) * s < 150 && bl.vx * s < 0) b.tx = Math.min(Math.max(bl.x - s * 30, CG.x + 20), W - CG.x - 20);
    if (bl.vx * s < -170 && (b.x - ownG) * s > 40 && Math.random() < 0.5 + skill * 0.5) b.tx = ownG + s * 36; // disparo hacia mi portería: vuelvo a taparla
    const foe = B.find((o) => o.team !== b.team); // el rival llega antes al balón (y lo tiene de cara): me repliego a tapar la portería
    if (foe && Math.abs(foe.x - bl.x) + 10 < Math.abs(b.x - bl.x) && (bl.x - foe.x) * s < 10 && Math.random() < 0.45 + skill * 0.5) b.tx = lerp(ownG + s * 40, bl.x, 0.22);
    b.tx += k.rnd(-1, 1) * (1 - skill) * 20; }
  const dx = b.tx - b.x, mv = Math.abs(dx) < 6 ? 0 : clamp(dx / 24, -1, 1);
  const near = Math.abs(bl.x - b.x) < 70, jump = near && bl.y < b.y - 80 && bl.y > b.y - 200 && bl.vy > -100 && Math.random() < 0.3 + skill * 0.6;
  const kick = hyp(bl.x - (b.x + s * 26), bl.y - (b.y - 14)) < 34 + skill * 6 && Math.random() < 0.4 + skill * 0.5 || (b.y < GROUND - 30 && bl.y < b.y - 62 && Math.abs(bl.x - b.x) < 40 && Math.random() < skill * 0.5);
  return { mv, jump, kick };
}

/* =====================================================================================
 *  Bucle
 * ===================================================================================== */
reset(); k.show(CFG.title, CFG.help);
addEventListener('resize', () => { if (!SIDE && k.st !== 'play' && !k.party && (innerHeight > innerWidth * 1.08) !== VERT) location.reload(); });
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (cdPend) { cdPend = false; k.count(3); }
  t += dt; msgT = Math.max(0, msgT - dt);
  if (k.counting()) return;
  if (phase === 'end') return;
  if (phase === 'kick') { phT -= dt; if (phT <= 0) phase = 'play'; return; }
  if (phase === 'goal') {
    phT -= dt; if (MODE === 'voley' || MODE === 'cabezon') { if (MODE === 'voley') { ball.vy += GRAV_V * dt; ball.x += ball.vx * dt; ball.y = Math.min(GROUND - ball.r, ball.y + ball.vy * dt); ball.vx *= 1 - 3 * dt; } else stepHead(dt); }
    if (phT <= 0) {
      if (MODE === 'voley') { if (voleyWon()) return finish(); voleyServe(); return; }
      if (MODE === 'prisionero') { if (Math.max(...score) >= (CFG.wins || 2)) return finish(); kickoff(); return; }
      if (golden || clock <= 0) return finish();
      kickoff();
    }
    return;
  }
  // reloj del partido (el vóley va por puntos)
  if (MODE !== 'voley' && phase === 'play') {
    clock -= dt;
    if (clock <= 0 && !golden) {
      if (MODE === 'prisionero') { const n = [0, 1].map((tm) => B.filter((b) => b.team === tm && inField(b)).length); if (n[0] !== n[1]) return roundEnd(n[0] > n[1] ? 0 : 1); golden = true; goldT = 0; msg = '¡Bola de oro! El próximo tocado decide'; msgT = 2.5; k.sfx('tick'); }
      else if (score[0] === score[1]) { golden = true; goldT = 0; msg = '¡Prórroga: gol de oro!'; msgT = 2.5; k.sfx('tick'); }
      else return finish();
    }
  }
  if (golden && phase === 'play' && (goldT += dt) > 60) { if (MODE !== 'prisionero') return finish(); golden = false; clock = CFG.round || 60; msg = 'Ronda nula'; msgT = 2; kickoff(); return; } // la prórroga no es eterna: a los 60 s, empate
  if (MODE === 'futbol' || MODE === 'hockey') stepField(dt);
  else if (MODE === 'coches') stepCars(dt);
  else if (MODE === 'prisionero') stepDodge(dt);
  else if (MODE === 'voley') stepVoley(dt);
  else stepHead(dt);
}, draw);

/* =====================================================================================
 *  Dibujo
 * ===================================================================================== */
let FIELD = null;
function fieldArt() {
  return mk(W, H, (g) => {
    g.fillStyle = '#1f1a33'; g.fillRect(0, 0, W, H);
    // entorno: adoquines de plaza (fútbol, prisionero), pista de barrio (hockey), arena de neón (coches)
    for (let i = 0; i < 220; i++) { const x = rnd(i) * W, y = rnd(i + 50) * H; g.fillStyle = `rgba(255,255,255,${0.02 + rnd(i + 9) * 0.03})`; g.fillRect(x, y, 10, 6); }
    g.save(); worldT(g);
    const C = M.cut, path = () => { g.beginPath(); if (C) { g.moveTo(C, 0); g.lineTo(FW - C, 0); g.lineTo(FW, C); g.lineTo(FW, FH - C); g.lineTo(FW - C, FH); g.lineTo(C, FH); g.lineTo(0, FH - C); g.lineTo(0, C); g.closePath(); } else g.rect(0, 0, FW, FH); };
    // redes de las porterías (fuera del campo)
    if (M.gw) for (const s of [0, 1]) { const x0 = s ? FW : -22; ART.rr(g, x0, GY0 - 4, 22, M.gw + 8, 5); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; for (let y = GY0; y < GY1; y += 8) { g.beginPath(); g.moveTo(x0 + 2, y); g.lineTo(x0 + 20, y); g.stroke(); } for (let x = 0; x < 22; x += 7) { g.beginPath(); g.moveTo(x0 + x, GY0); g.lineTo(x0 + x, GY1); g.stroke(); } }
    path(); g.save(); g.clip();
    if (MODE === 'futbol') { for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#47b358' : '#52c063'; g.fillRect(i * FW / 12, 0, FW / 12 + 1, FH); } }
    else if (MODE === 'hockey') { const gr = g.createLinearGradient(0, 0, 0, FH); gr.addColorStop(0, '#dfe9f5'); gr.addColorStop(1, '#c4d4e8'); g.fillStyle = gr; g.fillRect(0, 0, FW, FH); for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.beginPath(); const x = rnd(i) * FW, y = rnd(i + 3) * FH; g.moveTo(x, y); g.lineTo(x + 30, y + 4); g.stroke(); } }
    else if (MODE === 'coches') { g.fillStyle = '#2b2d4a'; g.fillRect(0, 0, FW, FH); g.strokeStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < FW; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, FH); g.stroke(); } for (let y = 0; y < FH; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(FW, y); g.stroke(); } }
    else { for (let i = 0; i < 26; i++) { g.fillStyle = i % 2 ? '#d9a066' : '#cf955a'; g.fillRect(0, i * FH / 26, FW, FH / 26 + 1); } for (let i = 0; i < 26; i++) { g.strokeStyle = 'rgba(120,70,30,.25)'; g.beginPath(); const y = i * FH / 26, x = rnd(i) * FW; g.moveTo(x, y); g.lineTo(x, y + FH / 26); g.stroke(); }
      g.fillStyle = 'rgba(255,107,74,.28)'; g.fillRect(566, 0, 34, FH); g.fillStyle = 'rgba(63,140,255,.28)'; g.fillRect(0, 0, 34, FH);
      for (const x0 of [0, 566]) { g.strokeStyle = 'rgba(26,21,48,.25)'; g.lineWidth = 3; for (let y = -40; y < FH; y += 14) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 34, y + 34); g.stroke(); } } }
    g.restore();
    // líneas
    const LC = MODE === 'hockey' ? '#d94a5a' : MODE === 'coches' ? 'rgba(92,225,230,.7)' : 'rgba(255,255,255,.85)';
    g.strokeStyle = LC; g.lineWidth = 3;
    g.beginPath(); g.moveTo(FW / 2, 0); g.lineTo(FW / 2, FH); g.stroke();
    if (MODE !== 'prisionero') { g.beginPath(); g.arc(FW / 2, FH / 2, 46, 0, TAU); g.stroke(); g.fillStyle = LC; g.beginPath(); g.arc(FW / 2, FH / 2, 4, 0, TAU); g.fill(); }
    if (MODE === 'futbol') { g.strokeStyle = 'rgba(255,255,255,.85)'; g.strokeRect(0, FH / 2 - 90, 70, 180); g.strokeRect(FW - 70, FH / 2 - 90, 70, 180); g.beginPath(); g.arc(70, FH / 2, 30, -1.2, 1.2); g.stroke(); g.beginPath(); g.arc(FW - 70, FH / 2, 30, Math.PI - 1.2, Math.PI + 1.2); g.stroke(); }
    if (MODE === 'hockey') { g.strokeStyle = '#3f6fd9'; g.lineWidth = 4; for (const x of [FW * 0.33, FW * 0.67]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, FH); g.stroke(); } g.strokeStyle = '#d94a5a'; g.lineWidth = 2; for (const [x, y] of [[110, 90], [110, 250], [490, 90], [490, 250]]) { g.beginPath(); g.arc(x, y, 30, 0, TAU); g.stroke(); } g.fillStyle = 'rgba(63,111,217,.3)'; g.beginPath(); g.arc(0, FH / 2, 50, -Math.PI / 2, Math.PI / 2); g.fill(); g.beginPath(); g.arc(FW, FH / 2, 50, Math.PI / 2, Math.PI * 1.5); g.fill(); }
    if (MODE === 'coches') { for (const [x, y] of [[80, 50], [80, 290], [520, 50], [520, 290], [300, 30], [300, 310]]) { g.fillStyle = 'rgba(255,209,102,.25)'; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,209,102,.6)'; g.lineWidth = 2; g.stroke(); } g.fillStyle = 'rgba(255,107,74,.15)'; g.fillRect(0, GY0, 60, M.gw); g.fillStyle = 'rgba(63,140,255,.15)'; g.fillRect(FW - 60, GY0, 60, M.gw); }
    if (MODE === 'prisionero') { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; for (const x of [34, 566]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, FH); g.stroke(); } g.beginPath(); g.arc(FW / 2, FH / 2, 40, 0, TAU); g.stroke(); }
    // vallas
    path(); g.lineWidth = 9; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 5; g.strokeStyle = MODE === 'hockey' ? '#ffd166' : MODE === 'coches' ? '#5ce1e6' : MODE === 'futbol' ? '#f5f1e6' : '#8a5a3b'; g.stroke();
    if (M.gw) for (const x of [0, FW]) for (const y of [GY0, GY1]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); }
    g.restore();
  });
}
function sideArt() {
  return mk(W, H, (g) => {
    if (MODE === 'voley') {
      ART.background(g, ART.THEMES.jungle, W, H, 0, 70, 0);
      const sea = g.createLinearGradient(0, 270, 0, GROUND); sea.addColorStop(0, '#3fb6ea'); sea.addColorStop(1, '#8fe3f0'); g.fillStyle = sea; g.fillRect(0, 280, W, GROUND - 280);
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); const x = rnd(i) * W, y = 290 + rnd(i + 4) * 50; g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 22, y); g.stroke(); }
      const sand = g.createLinearGradient(0, GROUND - 10, 0, H); sand.addColorStop(0, '#f6dfa4'); sand.addColorStop(1, '#e0bd72'); g.fillStyle = sand; g.beginPath(); g.moveTo(0, GROUND - 6); g.quadraticCurveTo(W / 2, GROUND - 16, W, GROUND - 6); g.lineTo(W, H); g.lineTo(0, H); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
      for (let i = 0; i < 80; i++) { g.fillStyle = 'rgba(160,110,50,.3)'; g.fillRect(rnd(i + 20) * W, GROUND + rnd(i + 30) * 44, 2, 2); }
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(8, GROUND + 4); g.lineTo(W - 8, GROUND + 4); g.stroke();
      // red: poste + malla en ligera perspectiva
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(NET + 10, GROUND + 3, 26, 5, 0, 0, TAU); g.fill();
      const pole = g.createLinearGradient(NET - 5, 0, NET + 5, 0); pole.addColorStop(0, '#8a6a4a'); pole.addColorStop(1, '#4a3626');
      g.fillStyle = pole; ART.rr(g, NET - 5, NET_TOP - 14, 10, GROUND - NET_TOP + 18, 4); g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
      const NW = 16, ND = 74; g.save(); g.beginPath(); g.moveTo(NET - NW / 2, NET_TOP); g.lineTo(NET + NW / 2, NET_TOP - 6); g.lineTo(NET + NW / 2, NET_TOP + ND - 6); g.lineTo(NET - NW / 2, NET_TOP + ND); g.closePath();
      g.fillStyle = 'rgba(20,20,40,.28)'; g.fill(); g.clip(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1;
      for (let y = NET_TOP - 8; y < NET_TOP + ND + 8; y += 7) { g.beginPath(); g.moveTo(NET - NW / 2, y); g.lineTo(NET + NW / 2, y - 6); g.stroke(); }
      for (let x = NET - NW / 2; x <= NET + NW / 2; x += 4) { g.beginPath(); g.moveTo(x, NET_TOP - 10); g.lineTo(x, NET_TOP + ND + 4); g.stroke(); }
      g.restore(); g.lineWidth = 1.6; g.strokeStyle = OUT; g.beginPath(); g.moveTo(NET - NW / 2, NET_TOP); g.lineTo(NET + NW / 2, NET_TOP - 6); g.lineTo(NET + NW / 2, NET_TOP + ND - 6); g.lineTo(NET - NW / 2, NET_TOP + ND); g.closePath(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(NET - NW / 2 - 2, NET_TOP - 3); g.lineTo(NET + NW / 2 + 2, NET_TOP - 10); g.lineTo(NET + NW / 2 + 2, NET_TOP - 3); g.lineTo(NET - NW / 2 - 2, NET_TOP + 4); g.closePath(); g.fill(); g.lineWidth = 1.8; g.stroke();
      g.fillStyle = '#ff6b4a'; g.beginPath(); g.arc(NET, NET_TOP - 16, 4, 0, TAU); g.fill(); g.lineWidth = 1.5; g.stroke();
    } else {
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#20194a'); sky.addColorStop(1, '#5a3f8a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // grada con público
      for (let row = 0; row < 5; row++) { const y = 110 + row * 30; g.fillStyle = row % 2 ? '#3a2d66' : '#43357a'; g.fillRect(0, y, W, 30);
        for (let i = 0; i < 34; i++) { const x = i * 19 + (row % 2) * 9, cc = ['#ff6b4a', '#3f8cff', '#ffd166', '#f5f1e6', '#7cf7a0'][Math.floor(rnd(i * 7 + row) * 5)]; g.fillStyle = cc; g.beginPath(); g.arc(x + 8, y + 12, 7, 0, TAU); g.fill(); g.fillStyle = '#ffd9b5'; g.beginPath(); g.arc(x + 8, y + 3, 5, 0, TAU); g.fill(); } }
      for (const x of [60, 580]) { g.fillStyle = '#e0e4ff'; g.fillRect(x - 3, 20, 6, 90); g.fillStyle = '#fff6c8'; ART.rr(g, x - 26, 10, 52, 20, 5); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); }
      const gr = g.createLinearGradient(0, 260, 0, H); gr.addColorStop(0, '#4fbf5a'); gr.addColorStop(1, '#2f8f45'); g.fillStyle = gr; g.fillRect(0, 262, W, H - 262);
      for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)'; g.fillRect(i * W / 10, 262, W / 10, GROUND - 262); }
      g.fillStyle = '#f5f1e6'; g.fillRect(W / 2 - 1.5, 262, 3, GROUND - 262); g.fillRect(0, GROUND, W, 3);
      g.fillStyle = '#2a7d3d'; g.fillRect(0, GROUND + 3, W, H - GROUND);
      // porterías
      for (const s of [0, 1]) { const x0 = s ? W - CG.x : 0; g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x0, CG.bar, CG.x, GROUND - CG.bar);
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; for (let x = x0; x <= x0 + CG.x; x += 8) { g.beginPath(); g.moveTo(x, CG.bar); g.lineTo(x, GROUND); g.stroke(); } for (let y = CG.bar; y <= GROUND; y += 8) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + CG.x, y); g.stroke(); }
        g.fillStyle = '#fff'; ART.rr(g, x0 - 2, CG.bar - 5, CG.x + 4, 9, 3); g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke(); const px = s ? x0 : x0 + CG.x - 6; ART.rr(g, px, CG.bar, 6, GROUND - CG.bar, 2); g.fill(); g.stroke(); }
    }
  });
}
function drawBall(x, y, r, spin, kind, z) {
  if (z !== undefined) { ART.shadow(c, x, y + r * 0.5, r * (1 - Math.min(0.5, z / 250)), 0.3); y -= z; }
  c.save(); c.translate(x, y);
  if (kind === 'puck') { c.beginPath(); c.ellipse(0, 0, r + 1, r, 0, 0, TAU); c.fillStyle = '#23203a'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#000'; c.stroke(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-2, -2, r * 0.5, r * 0.3, 0, 0, TAU); c.fill(); c.restore(); return; }
  c.beginPath(); c.arc(0, 0, r, 0, TAU); const gr = c.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r); const base = kind === 'dodge' ? '#ff5f7a' : kind === 'voley' ? '#fff4b8' : '#ffffff';
  gr.addColorStop(0, '#fff'); gr.addColorStop(1, dark(base, 0.12)); c.fillStyle = gr; c.fill(); c.save(); c.clip(); c.rotate(spin);
  if (kind === 'voley') { c.strokeStyle = '#3fb6ea'; c.lineWidth = r * 0.28; for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.beginPath(); c.arc(r * 0.9, 0, r * 0.9, 2.2, 4.1); c.stroke(); } }
  else if (kind === 'dodge') { c.strokeStyle = '#ffd166'; c.lineWidth = r * 0.3; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke(); }
  else { c.fillStyle = kind === 'car' ? '#6e62f5' : '#1a1530'; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; c.beginPath(); c.arc(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.26, 0, TAU); c.fill(); } c.beginPath(); c.arc(0, 0, r * 0.3, 0, TAU); c.fill(); }
  c.restore(); c.lineWidth = Math.max(2, r * 0.14); c.strokeStyle = OUT; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.45, r * 0.3, r * 0.18, -0.5, 0, TAU); c.fill();
  c.restore();
}
function ringCol(b) { return b.ctl >= 0 ? k.pcol(b.ctl) : null; }
function drawWalker(b) { // cenital: cuerpo con camiseta del equipo, cabeza con pelo, brazos y pies que se mueven
  const [x, y] = V(b.x, b.y), a = SA(b.a), jc = TEAM[b.team].col, rc = ringCol(b), sw = Math.sin(b.anim * 3) * 5, jail = b.jail;
  c.save(); if (jail) c.globalAlpha = 0.75; if (b.inv > 0 && Math.floor(b.inv * 10) % 2) c.globalAlpha = 0.45;
  ART.shadow(c, x + 2, y + 8, 13, 0.28);
  if (rc) { c.beginPath(); c.ellipse(x, y + 3, 16, 11, 0, 0, TAU); c.lineWidth = 3.5; c.strokeStyle = rc; c.stroke(); }
  if (b.catchT > 0) { c.beginPath(); c.arc(x, y, 19, 0, TAU); c.lineWidth = 3; c.strokeStyle = '#7cf7a0'; c.stroke(); }
  c.translate(x, y); c.rotate(a);
  c.fillStyle = '#3a3258'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * sw * 0.8 + 2, s * 6, 5, 3.4, 0, 0, TAU); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); }
  if (MODE === 'hockey') { c.strokeStyle = OUT; c.lineWidth = 4.5; c.beginPath(); c.moveTo(2, 8); c.lineTo(20, 10); c.stroke(); c.strokeStyle = '#c98a4b'; c.lineWidth = 2.5; c.stroke(); c.fillStyle = '#1a1530'; ART.rr(c, 17, 8, 8, 6, 2); c.fill(); }
  for (const s of [-1, 1]) { c.beginPath(); c.arc(-s * sw * 0.5 + 1, s * 11, 4, 0, TAU); c.fillStyle = '#ffd9b5'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke(); }
  c.beginPath(); c.ellipse(0, 0, 9, 12, 0, 0, TAU); const gr = c.createLinearGradient(-9, -12, 9, 12); gr.addColorStop(0, lite(jc, 0.3)); gr.addColorStop(1, dark(jc, 0.2)); c.fillStyle = gr; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
  c.beginPath(); c.arc(1, 0, 7.5, 0, TAU); c.fillStyle = MODE === 'hockey' ? jc : b.hair; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
  c.beginPath(); c.arc(4, 0, 4.2, -1.3, 1.3); c.fillStyle = '#ffd9b5'; c.fill();
  if (MODE === 'hockey') { c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke(); }
  c.restore();
  if (b.chg >= 0) { const q = clamp(b.chg / 0.8, 0, 1); c.fillStyle = 'rgba(26,21,48,.8)'; ART.rr(c, x - 16, y + 16, 32, 6, 3); c.fill(); c.fillStyle = q > 0.9 ? '#ff5f7a' : '#ffd166'; ART.rr(c, x - 15, y + 17, 30 * q, 4, 2); c.fill(); }
  label(nameOf(b), x, y - 22 - (k.party ? 3 : 0), k.party ? 18 : 12, rc || '#d8d0f0');
}
function drawCar(b) {
  const [x, y] = V(b.x, b.y), a = SA(b.a), jc = TEAM[b.team].col, rc = ringCol(b), z = b.z;
  ART.shadow(c, x + 3, y + 8, 20 - Math.min(8, z / 8), 0.3);
  if (rc) { c.beginPath(); c.ellipse(x, y + 4, 24, 15, 0, 0, TAU); c.lineWidth = 3.5; c.strokeStyle = rc; c.stroke(); }
  c.save(); c.translate(x, y - z); c.rotate(a); const sc = 1 + z / 200; c.scale(sc, sc);
  if (b.fire > 0) { for (let i = 0; i < 3; i++) { c.fillStyle = ['#ffd166', '#ff9f5a', '#ff5f7a'][i]; c.beginPath(); c.ellipse(-22 - i * 5 - Math.random() * 4, 0, 8 - i * 2, 4 - i, 0, 0, TAU); c.fill(); } }
  c.fillStyle = '#1a1530'; for (const [wx, wy] of [[-10, -11], [10, -11], [-10, 11], [10, 11]]) { ART.rr(c, wx - 5, wy - 3, 10, 6, 2); c.fill(); }
  ART.rr(c, -19, -10, 38, 20, 7); const gr = c.createLinearGradient(0, -10, 0, 10); gr.addColorStop(0, lite(jc, 0.3)); gr.addColorStop(1, dark(jc, 0.25)); c.fillStyle = gr; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
  ART.rr(c, -6, -7, 14, 14, 4); c.fillStyle = '#9ad8ff'; c.fill(); c.lineWidth = 1.8; c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-3, -5, 3, 10);
  c.fillStyle = '#fff'; c.fillRect(-18, -2, 10, 4); c.fillStyle = '#fff6c8'; c.fillRect(15, -8, 3, 4); c.fillRect(15, 4, 3, 4);
  c.restore();
  // turbo
  c.fillStyle = 'rgba(26,21,48,.8)'; ART.rr(c, x - 14, y + 16, 28, 5, 2.5); c.fill(); c.fillStyle = '#ffd166'; ART.rr(c, x - 13, y + 17, 26 * b.boost, 3, 1.5); c.fill();
  label(nameOf(b), x, y - 26 - z - (k.party ? 3 : 0), k.party ? 18 : 12, rc || '#d8d0f0');
}
function drawSidePlayer(b) { // lateral: cabezón (cabeza grande) o jugador de playa
  const big = MODE === 'cabezon', jc = TEAM[b.team].col, rc = ringCol(b), s = MODE === 'cabezon' ? atk(b.team) : b.team ? -1 : 1, x = b.x, y = b.y, sw = Math.sin(b.anim * 3), air = y < GROUND - 2;
  ART.shadow(c, x, GROUND + 4, 18 - Math.min(10, (GROUND - y) / 12), 0.3);
  if (rc) { c.beginPath(); c.ellipse(x, GROUND + 4, 24, 6, 0, 0, TAU); c.lineWidth = 3; c.strokeStyle = rc; c.stroke(); }
  c.save(); c.translate(x, y); if (b.st > 0) c.rotate(Math.sin(t * 30) * 0.2);
  // piernas
  const kick = big && b.kick > 0 ? Math.sin((1 - b.kick / 0.24) * Math.PI) : 0;
  for (const i of [0, 1]) { const back = i === 1, lx = (back ? -5 : 5) * s + (air ? 0 : sw * (back ? -6 : 6)), ang = !back && kick ? kick * 1.3 : 0;
    c.save(); c.translate(back ? -4 * s : 4 * s, big ? -14 : -24); c.rotate(-ang * s); c.strokeStyle = OUT; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(lx - (back ? -4 : 4) * s, big ? 12 : 22); c.stroke(); c.strokeStyle = back ? dark('#ffd9b5', 0.2) : '#ffd9b5'; c.lineWidth = 5; c.stroke();
      c.fillStyle = big ? '#1a1530' : '#ffd9b5'; ART.rr(c, lx - (back ? -4 : 4) * s - 5 + s * 2, (big ? 12 : 22) - 3, 11, 6, 3); c.fill(); c.restore(); }
  // cuerpo
  const by = big ? -30 : -44, bh = big ? 18 : 24; ART.rr(c, -11, by, 22, bh, 7); const gr = c.createLinearGradient(-11, by, 11, by + bh); gr.addColorStop(0, lite(jc, 0.3)); gr.addColorStop(1, dark(jc, 0.2)); c.fillStyle = gr; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
  if (!big) { c.strokeStyle = OUT; c.lineWidth = 7; const up = air || Math.abs(ball.x - x) < 50 && ball.y < y - 40; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 8, -40); c.lineTo(sd * 8 + (up ? sd * 4 : sd * 6), up ? -64 : -22); c.stroke(); } c.strokeStyle = '#ffd9b5'; c.lineWidth = 4; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 8, -40); c.lineTo(sd * 8 + (up ? sd * 4 : sd * 6), up ? -64 : -22); c.stroke(); } }
  // cabeza
  const hr = big ? 26 : 12, hy = big ? -52 : -58;
  c.beginPath(); c.arc(0, hy, hr, 0, TAU); const gh = c.createRadialGradient(-hr * 0.4, hy - hr * 0.4, 2, 0, hy, hr); gh.addColorStop(0, '#ffe7cc'); gh.addColorStop(1, '#eab08c'); c.fillStyle = gh; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
  c.beginPath(); c.arc(0, hy, hr, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(hr * 0.7 * -s, hy - hr * 0.2); c.closePath(); c.fillStyle = b.hair; c.fill(); c.lineWidth = 2; c.stroke();
  if (big) { c.fillStyle = jc; ART.rr(c, -hr, hy - hr * 0.55, hr * 2, hr * 0.28, 4); c.fill(); c.lineWidth = 1.6; c.stroke(); }
  const ex = s * hr * 0.35, ey = hy - (big ? 2 : 0); for (const d of [-1, 1]) { c.beginPath(); c.ellipse(ex + d * hr * 0.28, ey, hr * 0.15, hr * 0.2, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); c.beginPath(); c.arc(ex + d * hr * 0.28 + s * hr * 0.05, ey + 1, hr * 0.08, 0, TAU); c.fillStyle = OUT; c.fill(); }
  c.beginPath(); c.arc(ex, hy + hr * 0.42, hr * 0.18, 0.1, Math.PI - 0.1); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
  c.restore();
  label(nameOf(b), x, y + (big ? -92 : -84), k.party ? 18 : 13, rc || '#d8d0f0');
  if (big) { const q = b.sup || 0; c.fillStyle = 'rgba(26,21,48,.8)'; ART.rr(c, x - 22, y - 108, 44, 6, 3); c.fill(); c.fillStyle = q >= 1 ? (Math.floor(t * 8) % 2 ? '#ff5f7a' : '#ffd166') : '#ff9f5a'; ART.rr(c, x - 21, y - 107, 42 * q, 4, 2); c.fill(); }
}
function hud() {
  const g = c.createLinearGradient(0, 0, 0, 46); g.addColorStop(0, 'rgba(26,21,48,.95)'); g.addColorStop(1, 'rgba(26,21,48,.75)'); c.fillStyle = g; ART.rr(c, W / 2 - 150, 4, 300, k.party ? 50 : 40, 12); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
  for (const tm of [0, 1]) { const x = W / 2 + (tm ? 1 : -1) * 104; ART.rr(c, x - 40, 10, 80, 28, 9); c.fillStyle = TEAM[tm].col; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); label(TEAM[tm].name.toUpperCase(), x, 24, k.party ? 18 : 14, '#fff'); }
  label(`${score[0]} – ${score[1]}`, W / 2, 20, 22, '#fff');
  let sub; if (MODE === 'voley') sub = `a ${PTS} · saca ${TEAM[serveTeam].name.toLowerCase()}`; else if (golden) sub = MODE === 'prisionero' ? 'bola de oro' : 'gol de oro'; else sub = `${MODE === 'prisionero' ? 'ronda ' + roundNo + ' · ' : ''}${Math.floor(Math.max(0, clock) / 60)}:${String(Math.floor(Math.max(0, clock) % 60)).padStart(2, '0')}`;
  label(sub, W / 2, k.party ? 41 : 37, k.party ? 17 : 12, golden ? '#ffd166' : '#d8d0f0');
  if (msgT > 0 || phase === 'serve') { const m = phase === 'serve' && msgT <= 0 ? (ball.srv.ctl >= 0 ? `Saca ${nameOf(ball.srv)}: pulsa A` : '') : msg; if (m) {
    c.globalAlpha = Math.min(1, (msgT || 1) * 2); c.font = '900 26px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(m).width + 40, my = SIDE ? 80 : H / 2 + (VERT ? -40 : 0);
    ART.rr(c, W / 2 - mw / 2, my - 24, mw, 48, 14); c.fillStyle = 'rgba(26,21,48,.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffd166'; c.stroke(); label(m, W / 2, my, 24, '#fff'); c.globalAlpha = 1; } }
}
function draw() {
  if (!FIELD) FIELD = SIDE ? sideArt() : fieldArt();
  c.drawImage(FIELD, 0, 0, W, H);
  if (SIDE) {
    if (MODE === 'voley') { const bl = ball; ART.shadow(c, bl.x, GROUND + 2, Math.max(4, 12 - (GROUND - bl.y) / 30), 0.25); }
    for (const b of B) drawSidePlayer(b);
    if (MODE === 'cabezon' && ball.fire > 0) { for (let i = 0; i < 4; i++) { c.globalAlpha = 0.5 - i * 0.1; c.fillStyle = i % 2 ? '#ffd166' : '#ff5f7a'; c.beginPath(); c.arc(ball.x - ball.vx * 0.012 * i, ball.y - ball.vy * 0.012 * i, ball.r * (1 - i * 0.15), 0, TAU); c.fill(); } c.globalAlpha = 1; }
    drawBall(ball.x, ball.y, ball.r, ball.spin, MODE === 'voley' ? 'voley' : 'ball');
    if (MODE === 'voley' && phase === 'play') { const tm = ball.x < NET ? 0 : 1, n = touches[tm]; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(W / 2 + (tm ? 60 : -60) + (i - 1) * 14, 60, 5, 0, TAU); c.fillStyle = i < n ? TEAM[tm].col : 'rgba(255,255,255,.25)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); } }
  } else {
    const list = B.slice().sort((p, q) => V(p.x, p.y)[1] - V(q.x, q.y)[1]);
    if (MODE === 'prisionero') for (const bl of balls) if (!bl.hold) { const [x, y] = V(bl.x, bl.y); if (bl.live) { c.globalAlpha = 0.35; c.strokeStyle = '#fff'; c.lineWidth = bl.r * 1.4; c.beginPath(); const [px, py] = V(bl.x - bl.vx * 0.05, bl.y - bl.vy * 0.05); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); c.globalAlpha = 1; } drawBall(x, y, bl.r, bl.spin, 'dodge'); }
    if (MODE !== 'prisionero' && MODE !== 'coches') { const [x, y] = V(ball.x, ball.y); const v = hyp(ball.vx, ball.vy); if (!ball.own && v > 380) { c.globalAlpha = 0.3; c.strokeStyle = '#fff'; c.lineWidth = ball.r * 1.5; c.beginPath(); const [px, py] = V(ball.x - ball.vx * 0.05, ball.y - ball.vy * 0.05); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); c.globalAlpha = 1; } ART.shadow(c, x + 2, y + 4, ball.r, 0.25); drawBall(x, y, ball.r, ball.spin, MODE === 'hockey' ? 'puck' : 'ball'); }
    for (const b of list) M.car ? drawCar(b) : drawWalker(b);
    if (MODE === 'prisionero') for (const b of B) if (b.hold) { const [x, y] = V(b.hold.x, b.hold.y); drawBall(x, y, b.hold.r, 0, 'dodge'); }
    if (MODE === 'coches') { const [x, y] = V(ball.x, ball.y); drawBall(x, y, ball.r, ball.spin, 'car', ball.z); }
  }
  hud();
}
