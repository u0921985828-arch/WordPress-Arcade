/* Acción cenital con arte propio (ART). CFG.mode: 'dungeon' | 'crypt' | 'arena' | 'zombie' | 'brawl' | 'tank' | 'bounce' | 'coop' | 'castillo' | 'horda'
 * 'bounce': arena 1–4 por rondas, balas que rebotan 3 veces (tu propia bala te alcanza tras el primer rebote), una vida por ronda.
 * 'coop': mazmorra cooperativa 1–4 con clases, botín compartido y revivir al compañero caído quedándote a su lado.
 * 'castillo': el mismo motor cooperativo, pero la puerta de cada sala pide dos placas de presión pisadas a la vez; una está
 *   dentro de una alcoba con reja que solo se levanta mientras alguien pisa la otra, así que hay que repartirse (con un solo
 *   humano, el compañero CPU se coloca en la placa libre).
 * 'horda': asedio en un solo patio; los zombis entran por los bordes en oleadas cada vez mayores y entre oleada y oleada el
 *   equipo elige una mejora, sin puerta ni salas.
 * Salas con obstáculos en perspectiva 3/4, enemigos con IA propia, aviso antes de cada aparición,
 * botín (monedas y corazones), jefe cada 5 salas y una mejora a elegir entre tres al superar cada sala. */
const M = CFG.mode, land = CFG.land !== false, OUT = ART.OUT, R2 = 6.2832;
const W = land ? 640 : 480, H = land ? 360 : 480, X0 = 16, X1 = W - 16, Y0 = 38, Y1 = H - 16;
const TH = {
  dungeon: { f1: '#4b5066', f2: '#454a5f', grout: '#33374a', edge: '#23263a', top: '#8a90b0', face: '#555b7d', wall: 'brick', block: 'brick', light: 'torch', foes: ['bat', 'bat', 'eye'], boss: 'eye', door: true, label: 'Sala', shot: '#7df0ff', vig: 0.5 },
  crypt:   { f1: '#3d3549', f2: '#372f43', grout: '#28213a', edge: '#1c1729', top: '#7a6f94', face: '#4a4063', wall: 'brick', block: 'tomb', light: 'candle', foes: ['skel', 'skel', 'ghost'], boss: 'skel', door: true, label: 'Sala', vig: 0.62 },
  arena:   { f1: '#62b155', f2: '#5ba84e', edge: '#5d5770', top: '#b9b3c9', face: '#8a8398', wall: 'stone', block: 'rock', foes: ['slime'], boss: 'slime', grass: true, label: 'Oleada', shot: '#fff6a8', vig: 0.3 },
  zombie:  { f1: '#7c6c54', f2: '#75654e', edge: '#3a3026', top: '#c98a4b', face: '#8a5a33', wall: 'fence', block: 'crate', light: 'lamp', foes: ['zombie', 'zombie', 'zombie', 'brute'], boss: 'brute', dirt: true, label: 'Oleada', shot: '#ffd23d', vig: 0.5 },
  brawl:   { f1: '#a06e46', f2: '#976740', grout: '#6e4a2e', edge: '#3e2a1e', top: '#c9a27a', face: '#7e5236', wall: 'panel', block: 'crate', light: 'lantern', foes: ['thug', 'thug', 'brute'], boss: 'brute', plank: true, label: 'Oleada', vig: 0.4 },
  bounce:  { f1: '#39436e', f2: '#343e67', grout: '#262d52', edge: '#161a31', top: '#aab4de', face: '#5a6494', wall: 'panel', block: 'steel', light: 'lamp', foes: ['tank'], boss: 'tank', label: 'Ronda', vig: 0.45 },
  coop:    { f1: '#52506a', f2: '#4b4963', grout: '#36344b', edge: '#211f33', top: '#9690b4', face: '#5d5780', wall: 'brick', block: 'brick', light: 'torch', foes: ['bat', 'skel', 'eye', 'slime', 'ghost'], boss: 'eye', door: true, label: 'Sala', shot: '#7df0ff', vig: 0.5 },
  castillo:{ f1: '#5a5470', f2: '#524c68', grout: '#3a3550', edge: '#1e1b2e', top: '#a79fc4', face: '#63597f', wall: 'brick', block: 'brick', light: 'torch', foes: ['skel', 'bat', 'ghost', 'eye'], boss: 'skel', door: true, label: 'Sala', shot: '#7df0ff', vig: 0.55 },
  horda:   { f1: '#74654f', f2: '#6d5f4a', edge: '#332b22', top: '#c98a4b', face: '#8a5a33', wall: 'fence', block: 'crate', light: 'lamp', foes: ['zombie', 'zombie', 'zombie', 'brute'], boss: 'brute', dirt: true, label: 'Oleada', shot: '#ffd23d', vig: 0.5 },
  tank:    { f1: '#93b05e', f2: '#8ba757', edge: '#4f6330', top: '#d6cc9f', face: '#a89d70', wall: 'sand', block: 'sand', foes: ['tank'], boss: 'tank', grass: true, label: 'Batalla', vig: 0.3 },
}[M];
const k = Kit({ w: W, h: H, title: CFG.title, bg: TH.edge }), c = k.ctx;
const CASTLE = M === 'castillo', HORDE = M === 'horda';
const melee = M === 'crypt' || M === 'brawl', tankM = M === 'tank', BOUNCE = M === 'bounce', COOP = M === 'coop' || CASTLE || HORDE;
const ZQ = M === 'zombie' || HORDE; /* oleadas que entran por los bordes */
let hpMul = 1; /* coop: la vida de los enemigos escala con el nº de jugadores */
/* radio, vida, velocidad, puntos */
const FOE = { bat: [10, 2, 92, 15], eye: [12, 3, 50, 25], skel: [11, 3, 62, 20], ghost: [12, 2, 46, 25], slime: [16, 3, 56, 20], mini: [9, 1, 95, 10], zombie: [11, 2, 42, 15], brute: [17, 6, 36, 50], thug: [13, 3, 74, 20], tank: [15, 3, 58, 60] };
const RANGED = { eye: 1, ghost: 1, tank: 1 };
const FCOL = { bat: '#8a6fd1', eye: '#ff5f7a', skel: '#f4efe6', ghost: '#b98cff', slime: '#8be04a', mini: '#b6f36a', zombie: '#8fc26a', brute: ZQ ? '#6fa04f' : '#d9a27a', thug: '#e05a5a', tank: '#e0564a' };
const UP = {
  rate: ['Cadencia', '+25 % de ataques por segundo', () => { upg.rate += 0.25; }],
  dmg: ['Fuerza', '+50 % de daño', () => { upg.dmg += 0.5; }],
  speed: ['Botas', '+12 % de velocidad', () => { upg.speed += 0.12; }],
  hp: ['Corazón', '+1 de vida máxima', () => { p.max++; p.hp++; }],
  heal: ['Poción', 'Recupera toda la vida', () => { p.hp = p.max; }],
  multi: ['Abanico', '+1 proyectil por disparo', () => { upg.multi++; }],
  pierce: ['Perforar', 'Atraviesa un enemigo más', () => { upg.pierce++; }],
  reach: ['Alcance', '+25 % de alcance del golpe', () => { upg.reach += 0.25; }],
};
let p, foes, shots, eshots, walls, pend, drops, room, score, t, cool, upg, msgT, msg, swing, quota, spawnT, cleared, clearT, door, choice, floorCv, vigCv, bossF, kills;

/* ---------- Utilidades ---------- */
const wallAt = (x, y, r) => walls.find((w) => !w.open && x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h);
const rectHit = (x, y, r, ghost) => x - r < X0 || y - r < Y0 || x + r > X1 || y + r > Y1 || (!ghost && !!wallAt(x, y, r));
function move(o, dx, dy, ghost) { if (!rectHit(o.x + dx, o.y, o.r, ghost)) o.x += dx; if (!rectHit(o.x, o.y + dy, o.r, ghost)) o.y += dy; }
const angDiff = (a, b) => Math.abs(((a - b + 3 * Math.PI) % R2) - Math.PI);
function place(minD, edge) {
  for (let i = 0; i < 80; i++) {
    let x = k.rnd(X0 + 26, X1 - 26), y = k.rnd(Y0 + 26, Y1 - 26);
    if (edge) { const e = k.ri(0, 3); if (e === 0) x = X0 + 22; else if (e === 1) x = X1 - 22; else if (e === 2) y = Y0 + 22; else y = Y1 - 22; }
    if (!rectHit(x, y, 20) && Math.hypot(x - p.x, y - p.y) > minD) return [x, y];
  }
  return [p.x < W / 2 ? X1 - 40 : X0 + 40, p.y < H / 2 ? Y1 - 40 : Y0 + 40];
}
/* Curva de dificultad: 0 en la sala 1 → 1 hacia la sala 9 (suavizada). Velocidad, cadencia y balas enemigas escalan con ella. */
const ramp = () => { const d = Math.min(1, (room - 1) / 12); return d * d * (3 - 2 * d); };
const spK = () => 0.56 + 0.29 * ramp(), cdK = () => (1.6 - 0.6 * ramp()) / 0.75, bK = () => 0.64 + 0.16 * ramp(); // 1.23: más fácil (vel. ×0,8/×0,85, cadencia −25 %, balas −20 %)
function pickType() { const f = TH.foes; if (ZQ && Math.random() < room * 0.02) return 'brute'; return k.pick(f); }
function addFoe(type, x, y, boss) {
  const b = FOE[type], sc = 1 + (room - 1) * 0.12;
  const f = { type, x, y, r: b[0] * (boss ? 2.1 : 1), hp: Math.round(b[1] * sc * (boss ? 8 : 1) * hpMul), sp: b[2] * (boss ? 0.7 : 1) * spK(), pts: b[3] * (boss ? 10 : 1), cd: k.rnd(0.9, 2) * cdK(), cd2: 1.5, a: 0, body: 0, kx: 0, ky: 0, fl: 0, ph: Math.random() * 6, boss, dash: 0, warn: 0, face: 1 };
  f.max = f.hp; foes.push(f); if (boss) bossF = f; return f;
}
function queue(type, boss, edge) { const [x, y] = place(boss ? 190 : 150, edge); const t0 = room === 1 && !edge ? 2.2 : 1.2; pend.push({ type, x, y, t: t0 + (edge ? 0 : pend.length * 0.12), max: t0 + pend.length * 0.12, boss }); }
function buildRoom() {
  room++; walls = []; foes = []; shots = []; eshots = []; pend = []; drops = []; cleared = false; door = false; bossF = null; floorCv = null; clearT = 0;
  const isBoss = room % 5 === 0, nb = isBoss ? 2 : M === 'brawl' ? k.ri(0, 2) : M === 'arena' ? k.ri(1, 3) : k.ri(3, 6);
  for (let i = 0, tries = 0; i < nb && tries < 120; tries++) {
    const round = TH.block === 'rock', w = round ? k.pick([40, 50]) : k.pick(tankM || ZQ ? [30, 60, 90] : [40, 40, 80, 120]), h = round ? w : k.pick([30, 40, 60]);
    const x = Math.round(k.rnd(X0 + 50, X1 - 50 - w) / 10) * 10, y = Math.round(k.rnd(Y0 + 40, Y1 - 30 - h) / 10) * 10;
    if (walls.some((q) => x < q.x + q.w + 44 && x + w + 44 > q.x && y < q.y + q.h + 44 && y + h + 44 > q.y)) continue;
    if (x < p.x + 70 && x + w > p.x - 70 && y < p.y + 70 && y + h > p.y - 70) continue;
    if (TH.door && x + w > X1 - 80 && y < H / 2 + 56 && y + h > H / 2 - 56) continue;
    walls.push({ x, y, w, h, hp: (TH.block === 'crate' && ZQ) || (tankM && Math.random() < 0.5) ? 4 : 0, fl: 0, seed: Math.random() }); i++;
  }
  quota = 0;
  if (isBoss) { queue(TH.boss, true); if (ZQ) quota = 6; }
  else if (ZQ) { quota = 5 + room * 3; spawnT = 2.5; }
  else { const n = tankM ? Math.min(4, 1 + Math.ceil((room - 1) / 2)) : M === 'arena' ? Math.min(8, 2 + Math.round((room - 1) * 0.8)) : Math.min(11, 3 + Math.round((room - 1) * 1.1)); for (let i = 0; i < n; i++) queue(pickType()); }
  msg = `${TH.label} ${room}${isBoss ? ' · Jefe' : ''}`; msgT = 1.8;
}
function reset() {
  if (COOP) return coopReset();
  VS = BOUNCE ? k.players(4).map((q) => ({ pl: q.p, col: q.color, name: q.name, r: 11, wins: 0, kills: 0 })) : tankM && k.party && k.party.length >= 2 ? k.party.slice(0, 4).map((q) => ({ pl: q.p, col: k.pcol(q.p), name: 'J' + (q.p + 1), r: 11, wins: 0 })) : null;
  p = { x: TH.door ? X0 + 40 : W / 2, y: H / 2, r: 11, hp: 6, max: 6, a: 0, aim: 0, inv: 0, kx: 0, ky: 0, mv: false, face: 1, body: 0, recoil: 0 };
  room = 0; score = 0; t = 0; cool = 0; swing = 0; kills = 0; choice = null; upg = { rate: 1, dmg: 1, speed: 1, multi: 1, pierce: 0, reach: 1 }; if (VS) vsRound(true); else buildRoom();
}
/* ---------- Modo tele (fiesta): 2–4 tanques humanos, todos contra todos; gana quien gane 3 rondas.
   Si alguien se va, la CPU lleva su tanque hasta que vuelva; quien llega nuevo entra en la ronda siguiente. ---------- */
const inParty = (pl) => !!(k.party && k.party.some((x) => x.p === pl));
let vsCd = false, vsT = 0, vsZ = 0, VS = null, vsR = 0, vsBetween = 0, vsFreeze = 0, vsLast = null;
/* Reglas del duelo: tanques de Tank Duel (3 corazones, 1 rebote) o Tanques Rebote (1 vida por ronda, 3 rebotes, 2 balas en juego, a 4 rondas) */
const VSC = BOUNCE ? { hp: 1, win: 4, bnc: 3, max: 2, spd: 250, cool: 0.3, life: 7, zone: 22 } : { hp: 3, win: 3, bnc: 1, max: 99, spd: 380, cool: 0.55, life: 1.6, zone: 30 };
const VSWIN = VSC.win, VSHP = VSC.hp;
let cpuLv = 0; try { cpuLv = Math.max(0, Math.min(5, +localStorage.getItem('cpu:' + CFG.id) || 0)); } catch (e) {}
/* Tanques Rebote: obstáculos simétricos (se generan en un cuadrante y se reflejan), así ninguna esquina tiene ventaja */
function bounceWalls(SP) {
  const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, L = [], over = (b, q, m) => b.x < q.x + q.w + m && b.x + b.w + m > q.x && b.y < q.y + q.h + m && b.y + b.h + m > q.y;
  if (Math.random() < 0.75) { const w = k.pick([40, 60, 80]), h = k.pick([30, 40]); L.push({ x: cx - w / 2, y: cy - h / 2, w, h }); }
  for (let i = 0, tries = 0; i < 3 && tries < 300; tries++) {
    const w = k.pick([20, 30, 60, 90]), h = w >= 60 ? k.pick([20, 30]) : k.pick([40, 60, 80]);
    const x = Math.round(k.rnd(X0 + 50, cx - 26 - w) / 10) * 10, y = Math.round(k.rnd(Y0 + 40, cy - 26 - h) / 10) * 10;
    if (x < X0 + 46 || y < Y0 + 36) continue;
    const cand = [{ x, y, w, h }, { x: 2 * cx - x - w, y, w, h }, { x, y: 2 * cy - y - h, w, h }, { x: 2 * cx - x - w, y: 2 * cy - y - h, w, h }];
    if (cand.some((b) => L.some((q) => over(b, q, 46)))) continue;
    if (cand.some((b) => SP.some((sp) => over(b, { x: sp[0] - 34, y: sp[1] - 34, w: 68, h: 68 }, 20)))) continue;
    L.push(...cand); i++;
  }
  for (const b of L) walls.push({ x: b.x, y: b.y, w: b.w, h: b.h, hp: 0, fl: 0, seed: Math.random() });
}
/* Trayectoria de una bala con rebotes (vista previa del jugador y puntería de la CPU). Devuelve el primer tanque alcanzado. */
function simShot(x, y, a, own, maxB, len) {
  let vx = Math.cos(a), vy = Math.sin(a), b = 0; const pts = [[x, y]], st = 6;
  for (let d = 0; d < len; d += st) {
    const nx = x + vx * st, ny = y + vy * st;
    if (rectHit(nx, ny, 3)) { if (b >= maxB) break; b++; if (rectHit(nx, y, 3)) vx = -vx; else vy = -vy; pts.push([x, y]); continue; }
    x = nx; y = ny;
    for (let i = 0; i < VS.length; i++) { const q = VS[i]; if (!q.alive || (i === own && !b)) continue; if (Math.hypot(q.x - x, q.y - y) < q.r + 3) { pts.push([x, y]); return { hit: i, pts, b }; } }
  }
  pts.push([x, y]); return { hit: -1, pts, b };
}
const shotsOf = (i) => shots.reduce((n, s) => n + (s.own === i ? 1 : 0), 0);
/* CPU de Tanques Rebote: esquiva balas que vienen hacia ella, busca tiros con rebote (prueba ángulos y simula la trayectoria)
   y descarta los que la alcanzarían a ella. Mejora con cada victoria del jugador (cpu:<id>): más ángulos, menos error, más reflejos. */
function bounceCpu(q, dt, i) {
  const st = q.ai || (q.ai = { t: k.rnd(0.3, 0.8), plan: null, rest: 0 }), lv = cpuLv;
  let dodge = null;
  for (const s of shots) {
    if (s.own === i && !s.bn) continue;
    const rx = q.x - s.x, ry = q.y - s.y, sp = Math.hypot(s.vx, s.vy) || 1, tt = (rx * s.vx + ry * s.vy) / (sp * sp);
    if (tt < 0 || tt > 0.75) continue;
    const ex = s.x + s.vx * tt - q.x, ey = s.y + s.vy * tt - q.y; if (Math.hypot(ex, ey) > 30) continue;
    s.roll = s.roll || {}; if (s.roll[i] === undefined) s.roll[i] = Math.random() < 0.21 + lv * 0.05; if (!s.roll[i]) continue;
    const nx = -s.vy / sp, ny = s.vx / sp, side = ex * nx + ey * ny > 0 ? -1 : 1; dodge = [nx * side, ny * side]; break;
  }
  st.t -= dt; st.rest -= dt;
  if (st.t <= 0 && st.rest <= 0) {
    st.t = Math.max(0.3, 0.78 - lv * 0.035) * k.rnd(0.8, 1.3);
    const N = 13 + lv * 3; let best = null;
    for (let n = 0; n < N; n++) {
      const a = (n / N) * R2 + Math.random() * 0.1, sx = q.x + Math.cos(a) * 18, sy = q.y + Math.sin(a) * 18; if (rectHit(sx, sy, 3)) continue;
      const r = simShot(sx, sy, a, i, VSC.bnc, 520 + lv * 60);
      if (r.hit >= 0 && r.hit !== i) { const sc = -r.b * 0.5 - angDiff(a, q.aim) * 0.25 + Math.random() * 0.3; if (!best || sc > best.sc) best = { a, sc }; }
    }
    st.plan = best ? best.a + k.rnd(-1, 1) * Math.max(0.03, 0.14 - lv * 0.01) : null;
  }
  if (dodge) return [dodge[0], dodge[1], false, null];
  if (st.plan != null && shotsOf(i) < VSC.max) {
    const ok = angDiff(q.aim, st.plan) < 0.07 && q.cool <= 0;
    if (ok) { const a = st.plan; st.plan = null; st.rest = k.rnd(0.35, 0.9); return [0, 0, true, a]; }
    return [0, 0, false, st.plan];
  }
  const [mx, my] = vsCpu(q, dt); return [mx * 0.9, my * 0.9, false, null];
}
function bounceEnd(champ) {
  if (!k.party) { const hu = VS.find((q) => q.pl === 0); cpuLv = Math.max(0, Math.min(5, cpuLv + (champ === hu ? 1 : -1))); try { localStorage.setItem('cpu:' + CFG.id, cpuLv); } catch (e) {} }
  const solo = !k.party, head = solo ? (champ.pl === 0 ? '¡Has ganado!' : 'Gana la CPU') : champ.cpu ? 'Gana la CPU' : `¡Gana ${champ.name}!`;
  k.podium(VS.map((q) => ({ p: q.pl, score: q.wins, name: q.name })), { head, noTie: true, fmt: (n) => `${n} ronda${n === 1 ? '' : 's'}` });
}
function vsRound(first) {
  vsR = first ? 1 : vsR + 1; room = vsR; vsBetween = 0; vsFreeze = 1.3; vsLast = null; vsT = 0; vsZ = 0;
  walls = []; foes = []; shots = []; eshots = []; pend = []; drops = []; bossF = null; floorCv = null; quota = 0; cleared = true; door = false; choice = null;
  /* 2: esquinas opuestas; 3: arriba a los lados y abajo en el centro (misma distancia entre todos); 4: esquinas */
  const SP = VS.length === 3 ? [[X0 + 46, Y0 + 40], [X1 - 46, Y0 + 40], [W / 2, Y1 - 40]] : [[X0 + 46, Y0 + 40], [X1 - 46, Y1 - 40], [X1 - 46, Y0 + 40], [X0 + 46, Y1 - 40]];
  SP.forEach((sp) => sp.push(Math.atan2(H / 2 + 10 - sp[1], W / 2 - sp[0])));
  VS.forEach((q, i) => { const sp = SP[i]; q.cpu = BOUNCE ? !k.human(q.pl) : !inParty(q.pl); q.tAim = null; q.zt = 0; q.ai = null; Object.assign(q, { x: sp[0], y: sp[1], body: sp[2], a: sp[2], aim: sp[2], hp: VSHP, inv: 1.3, alive: true, kx: 0, ky: 0, cool: 0.4, recoil: 0, mv: false }); });
  if (BOUNCE) bounceWalls(SP);
  else for (let i = 0, tries = 0; i < 6 && tries < 200; tries++) {
    const w = k.pick([30, 60, 90]), h = k.pick([30, 40, 60]);
    const x = Math.round(k.rnd(X0 + 50, X1 - 50 - w) / 10) * 10, y = Math.round(k.rnd(Y0 + 30, Y1 - 30 - h) / 10) * 10;
    if (walls.some((q) => x < q.x + q.w + 44 && x + w + 44 > q.x && y < q.y + q.h + 44 && y + h + 44 > q.y)) continue;
    if (SP.some((sp) => x < sp[0] + 70 && x + w > sp[0] - 70 && y < sp[1] + 70 && y + h > sp[1] - 70)) continue;
    walls.push({ x, y, w, h, hp: Math.random() < 0.5 ? 4 : 0, fl: 0, seed: Math.random() }); i++;
  }
  msg = `Ronda ${vsR}`; msgT = 2.2; vsCd = true;
}
/* CPU del modo tele: persigue al rival más cercano, lo encara para disparar, se aparta si está muy cerca y rodea los muros */
function vsCpu(q, dt) {
  const st = q.ai || (q.ai = { mode: 'chase', t: 0, side: 1, px: q.x, py: q.y, stuck: 0 });
  const foes2 = VS.filter((o) => o !== q && o.alive); if (!foes2.length) return [0, 0, false];
  const tg = foes2.reduce((a, b) => (Math.hypot(a.x - q.x, a.y - q.y) < Math.hypot(b.x - q.x, b.y - q.y) ? a : b));
  const dx = tg.x - q.x, dy = tg.y - q.y, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  let los = true; for (let s2 = 0.1; s2 < 1; s2 += 0.06) if (wallAt(q.x + dx * s2, q.y + dy * s2, 3)) { los = false; break; }
  st.t -= dt; st.stuck = Math.hypot(q.x - st.px, q.y - st.py) < 20 * dt ? st.stuck + dt : 0; st.px = q.x; st.py = q.y;
  if (st.t <= 0 || st.stuck > 0.3) { st.t = 0.6 + Math.random() * 1.1; st.stuck = 0; st.side = Math.random() < 0.5 ? 1 : -1; st.mode = !los ? (Math.random() < 0.5 ? 'side' : 'chase') : d < 100 ? 'back' : Math.random() < 0.3 ? 'side' : 'chase'; }
  const off = angDiff(q.aim, ang); let a = st.mode === 'side' ? ang + st.side * 1.4 : st.mode === 'back' ? ang + Math.PI : ang;
  if (los && d < 330 && off > 0.3 && st.mode !== 'back') a = ang;
  return [Math.cos(a), Math.sin(a), los && off < 0.2 && d < 380 && Math.random() < 0.4];
}
const vsZone = () => { const R0 = Math.hypot((X1 - X0) / 2, (Y1 - Y0) / 2), Z = VSC.zone; return vsT <= Z ? R0 : Math.max(60, R0 - (R0 - 60) * Math.min(1, (vsT - Z) / 25)); };
function vsUpdate(dt) {
  if (BOUNCE && !vsBetween && VS.some((q) => !q.cpu) && !VS.some((q) => q.alive && !q.cpu)) dt *= 2; /* sin humanos vivos, la ronda corre al doble */
  for (const w of walls) w.fl -= dt;
  if (vsBetween) { vsBetween -= dt; if (vsBetween <= 0) vsRound(); }
  if (vsCd) { vsCd = false; k.count(3); }
  vsFreeze = k.counting() ? 1 : 0;
  /* zona que se cierra: a los 30 s de ronda el círculo seguro encoge; fuera de él se pierde un corazón cada 1,5 s (evita rondas eternas con tanques escondidos) */
  if (!vsFreeze && !vsBetween) { vsT += dt; if (vsT > VSC.zone && vsT - dt <= VSC.zone) { msg = '¡La zona se cierra!'; msgT = 2; k.sfx('lose'); }
    if (vsT > VSC.zone) { const zr = vsZone(); for (const q of VS) if (q.alive && Math.hypot(q.x - (X0 + X1) / 2, q.y - (Y0 + Y1) / 2) > zr) { q.zt = (q.zt || 0) + dt; if (q.zt > 1.5) { q.zt = 0; q.hp--; k.sfx('hurt'); k.burst(q.x, q.y, '#ff5f7a', 10, 120); if (q.hp <= 0) { q.alive = false; k.burst(q.x, q.y, q.col, 36, 260); k.sfx('explode'); k.shake(9); } } } else if (q.alive) q.zt = 0; } }
  VS.forEach((q, i) => {
    if (!q.alive) return;
    q.inv -= dt; q.cool -= dt; q.recoil = Math.max(0, q.recoil - dt);
    const pd = k.pad(q.pl), HS = new Set(pd.held); if (q.pl === 0 && !q.cpu) for (const x of k.held) HS.add(x); /* J1 también con teclado */
    let mx = 0, my = 0, cf = false, hold = false;
    if (q.cpu) { if (!vsBetween) { if (BOUNCE) { let ta; [mx, my, cf, ta] = bounceCpu(q, dt, i); q.tAim = ta; hold = ta != null; } else [mx, my, cf] = vsCpu(q, dt); } }
    else { if (HS.has('left')) mx--; if (HS.has('right')) mx++; if (HS.has('up')) my--; if (HS.has('down')) my++; }
    let ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    /* Tanques Rebote: mantener B = quieto y la cruceta gira solo la torreta */
    if (BOUNCE && !q.cpu) { hold = HS.has('b'); q.hold = hold; if (hold && ml > 0.1) q.tAim = Math.atan2(my, mx); else if (!hold && ml > 0.1) q.tAim = null; }
    if (hold) { mx = my = 0; ml = 0; }
    if (vsFreeze > 0) { mx = my = 0; }
    q.mv = ml > 0.1 && !vsFreeze; if (q.mv) { q.a = Math.atan2(my, mx); q.body += k.clamp(((q.a - q.body + 3 * Math.PI) % R2) - Math.PI, -8 * dt, 8 * dt); }
    const want = BOUNCE && q.tAim != null ? q.tAim : q.a;
    q.aim += k.clamp(((want - q.aim + 3 * Math.PI) % R2) - Math.PI, -(BOUNCE ? 7 : 10) * dt, (BOUNCE ? 7 : 10) * dt); /* la torreta apunta hacia donde te mueves */
    move(q, (mx * 130 + q.kx) * dt, (my * 130 + q.ky) * dt); const dec = Math.pow(0.002, dt); q.kx *= dec; q.ky *= dec;
    for (const o of VS) if (o !== q && o.alive) { const ex = q.x - o.x, ey = q.y - o.y, e = Math.hypot(ex, ey); if (e > 0 && e < q.r + o.r + 4) move(q, ex / e * 60 * dt, ey / e * 60 * dt); }
    if ((q.cpu ? cf : HS.has('a') || pd.hit.has('a')) && q.cool <= 0 && !vsFreeze && !vsBetween && (!BOUNCE || shotsOf(i) < VSC.max)) {
      const mzx = q.x + Math.cos(q.aim) * 18, mzy = q.y + Math.sin(q.aim) * 18;
      if (BOUNCE && rectHit(mzx, mzy, 3)) { q.cool = 0.2; k.sfx('click'); } /* cañón pegado al muro: no sale */
      else { q.cool = VSC.cool * (q.cpu ? 1.35 : 1); q.recoil = 0.1; k.sfx('shoot'); if (BOUNCE) k.burst(mzx, mzy, q.col, 5, 80);
        shots.push({ x: mzx, y: mzy, vx: Math.cos(q.aim) * VSC.spd, vy: Math.sin(q.aim) * VSC.spd, life: VSC.life, b: VSC.bnc, bn: 0, own: i, col: q.col, tr: [] }); }
    }
  });
  const bounce = (s) => { s.x -= s.vx * dt; s.y -= s.vy * dt; if (rectHit(s.x + s.vx * dt, s.y, 2)) s.vx *= -1; else s.vy *= -1; s.bn++; if (BOUNCE) { k.sfx('click'); k.burst(s.x, s.y, s.col, 4, 70); } };
  for (const s of shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) s.dead = true;
    if (s.tr) { s.tr.push(s.x, s.y); if (s.tr.length > 16) s.tr.splice(0, 2); }
    VS.forEach((q, i) => { if (s.dead || !q.alive || (i === s.own && (BOUNCE ? !s.bn : s.b > 0)) || Math.hypot(s.x - q.x, s.y - q.y) > q.r + 4) return; s.dead = true; if (q.inv > 0 && !BOUNCE) return; if (q.inv > 0 && vsFreeze) return;
      if (BOUNCE && q.hp - 1 <= 0) { if (i === s.own) k.float('¡Autogol!', q.x, q.y - 26, '#ffc928'); else VS[s.own].kills++; }
      q.hp--; q.inv = 0.6; const a = Math.atan2(s.vy, s.vx); q.kx = Math.cos(a) * 200; q.ky = Math.sin(a) * 200; k.sfx('hit'); k.shake(4); k.burst(q.x, q.y, q.col, 10, 150);
      if (q.hp <= 0) { q.alive = false; k.burst(q.x, q.y, q.col, 36, 260); k.burst(q.x, q.y, '#fff', 12, 160); k.sfx('explode'); k.shake(9); if (i !== s.own) k.float('¡Tanque destruido!', q.x, q.y - 26, VS[s.own].col); } });
    if (s.dead) continue;
    const w = wallAt(s.x, s.y, 3);
    if (w && w.hp) { s.dead = true; w.hp--; w.fl = 0.1; k.sfx('hit'); if (w.hp <= 0) { w.dead = true; k.burst(w.x + w.w / 2, w.y + w.h / 2, TH.top, 20, 200); k.sfx('explode'); } }
    else if (rectHit(s.x, s.y, 3)) { if (s.b > 0) { s.b--; bounce(s); } else { s.dead = true; k.burst(s.x, s.y, '#fff', 3, 60); } }
  }
  if (BOUNCE) for (let a = 0; a < shots.length; a++) for (let b = a + 1; b < shots.length; b++) { const s = shots[a], u = shots[b]; if (!s.dead && !u.dead && Math.hypot(s.x - u.x, s.y - u.y) < 8) { s.dead = u.dead = true; k.burst((s.x + u.x) / 2, (s.y + u.y) / 2, '#fff', 10, 140); k.sfx('pop'); } }
  shots = shots.filter((s) => !s.dead); walls = walls.filter((w) => !w.dead);
  const al = VS.filter((q) => q.alive);
  if (!vsBetween && al.length <= 1) {
    vsLast = al[0] || null; if (vsLast) { vsLast.wins++; k.sfx('win'); }
    const champ = VS.find((q) => q.wins >= VSWIN);
    if (champ && BOUNCE) return bounceEnd(champ);
    if (champ) { k.win(champ.cpu ? 'Gana la CPU' : `¡Gana ${champ.name}!`, champ.col, VS.map((q) => `<b style="color:${q.col}">${q.name} ${q.wins}</b>`).join(' · ') + '<br>Toca para la revancha', champ.wins); return; }
    vsBetween = 2; msg = vsLast ? `Ronda para ${vsLast.name}` : 'Ronda nula'; msgT = 1.8;
  }
}
function vsDraw() {
  if (!floorCv) floorCv = renderFloor(); if (!vigCv) vigCv = renderVig();
  c.drawImage(floorCv, 0, 0, W, H); lights();
  for (const w of [...walls].sort((a, b) => a.y + a.h - b.y - b.h)) block(w);
  if (BOUNCE && !vsBetween) VS.forEach((q, i) => { /* vista previa de la trayectoria (solo humanos): con B muestra todos los rebotes */
    if (!q.alive || q.cpu) return; const a = q.aim, sx = q.x + Math.cos(a) * 18, sy = q.y + Math.sin(a) * 18; if (rectHit(sx, sy, 3)) return;
    const r = simShot(sx, sy, a, -1, q.hold ? VSC.bnc : 1, q.hold ? 900 : 300);
    c.save(); c.setLineDash([3, 7]); c.lineDashOffset = -t * 40; c.lineCap = 'round'; c.globalAlpha = q.hold ? 0.8 : 0.45; c.strokeStyle = q.col; c.lineWidth = 3;
    c.beginPath(); r.pts.forEach((pt, j) => (j ? c.lineTo(pt[0], pt[1]) : c.moveTo(pt[0], pt[1]))); c.stroke(); c.restore();
    if (r.hit >= 0) { const o = VS[r.hit]; c.strokeStyle = q.col; c.lineWidth = 2.5; c.beginPath(); c.arc(o.x, o.y, 20 + Math.sin(t * 10) * 2, 0, R2); c.stroke(); }
  });
  for (const q of [...VS].sort((a, b) => a.y - b.y)) { if (!q.alive || (q.inv > 0 && !vsFreeze && Math.floor(q.inv * 14) % 2)) continue; shadow(q.x, q.y + 10, 10); tankSprite(q.x, q.y, q.body, q.aim, q.col, q.recoil, q.mv); label(q.name, q.x, Math.max(Y0 + 8, q.y - 34), 14, q.cpu ? '#e8e4f4' : q.col, 'center'); }
  for (const s of shots) {
    if (BOUNCE) { /* bola de energía del color del dueño con estela; parpadea en blanco cuando ya puede alcanzar a su dueño */
      c.lineCap = 'round'; for (let j = 2; j < s.tr.length; j += 2) { c.globalAlpha = (j / s.tr.length) * 0.5; c.strokeStyle = s.col; c.lineWidth = 2 + (j / s.tr.length) * 5; c.beginPath(); c.moveTo(s.tr[j - 2], s.tr[j - 1]); c.lineTo(s.tr[j], s.tr[j + 1]); c.stroke(); }
      c.globalAlpha = 0.3; c.fillStyle = s.col; c.beginPath(); c.arc(s.x, s.y, 10, 0, R2); c.fill(); c.globalAlpha = 1;
      c.beginPath(); c.arc(s.x, s.y, 5.5, 0, R2); ART.fillOut(c, s.bn && Math.floor(t * 12) % 2 ? '#fff' : s.col, 2); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(s.x - 1.5, s.y - 1.5, 2, 0, R2); c.fill();
      for (let j = 0; j < s.b - s.bn; j++) { c.fillStyle = '#fff'; c.beginPath(); c.arc(s.x - 5 + j * 5, s.y + 10, 1.6, 0, R2); c.fill(); }
      continue;
    }
    c.save(); c.translate(s.x, s.y); c.rotate(Math.atan2(s.vy, s.vx)); ART.rr(c, -6, -3, 12, 6, 3); ART.fillOut(c, s.col, 1.5); c.restore(); }
  if (vsT > VSC.zone) { const zr = vsZone(), zx = (X0 + X1) / 2, zy = (Y0 + Y1) / 2; c.save(); c.beginPath(); c.rect(0, 0, W, H); c.arc(zx, zy, zr, 0, R2, true); c.fillStyle = 'rgba(200,30,60,.28)'; c.fill();
    c.beginPath(); c.arc(zx, zy, zr, 0, R2); c.lineWidth = 4; c.setLineDash([14, 10]); c.lineDashOffset = -vsT * 30; c.strokeStyle = '#ff5f7a'; c.stroke(); c.restore(); }
  c.drawImage(vigCv, 0, 0, W, H);
  const pw = Math.min(150, (W - 20) / VS.length - 6);
  VS.forEach((q, i) => { const x = 10 + i * (pw + 6); ART.rr(c, x, 5, pw, 26, 9); c.fillStyle = q.alive ? 'rgba(26,21,48,.85)' : 'rgba(26,21,48,.45)'; c.fill(); c.lineWidth = 2; c.strokeStyle = q.col; c.stroke();
    label(q.name, x + 8, 10, 14, q.alive ? q.col : '#77708f');
    if (BOUNCE) for (let h = 0; h < VSC.max; h++) { c.beginPath(); c.arc(x + 50 + h * 14, 18, 5, 0, R2); ART.fillOut(c, q.alive && h < VSC.max - shotsOf(i) ? q.col : '#3a3552', 1.8); }
    else for (let h = 0; h < VSHP; h++) ART.heart(c, x + 44 + h * 17, 18, 0.85, h < q.hp && q.alive); label(`${q.wins}`, x + pw - 8, 9, 16, '#ffc928', 'right'); });
  label(BOUNCE ? `Ronda ${vsR} · gana quien llegue a ${VSWIN}` : `A ${VSWIN} rondas`, W - 14, Y1 + 1, 11, 'rgba(255,255,255,.85)', 'right');
  if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); c.font = '800 22px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(msg).width + 36, my = vsFreeze ? 44 : H / 2 - 64; ART.rr(c, W / 2 - mw / 2, my, mw, 40, 12); c.fillStyle = 'rgba(26,21,48,.82)'; c.fill(); label(msg, W / 2, my + 9, 22, vsLast ? vsLast.col : '#ffc928', 'center'); c.globalAlpha = 1; }
}
k.onParty = () => {
  if (COOP) return coopParty();
  if (BOUNCE) { if (k.st !== 'play') { reset(); return; } const pl = k.players(4); for (const q of VS) { q.cpu = pl[q.pl].cpu; q.name = pl[q.pl].name; q.ai = null; } return; }
  if (k.st !== 'play' || !VS) { if (k.st !== 'play') reset(); return; }
  for (const q of VS) { q.cpu = !inParty(q.pl); if (q.cpu) q.ai = null; }
  for (const x of k.party || []) if (VS.length < 4 && !VS.some((q) => q.pl === x.p)) VS.push({ pl: x.p, col: k.pcol(x.p), name: 'J' + (x.p + 1), r: 11, wins: 0, alive: false, hp: 0, cpu: false, x: -99, y: -99, body: 0, aim: 0 });
};
/* ---------- Mazmorra a Cuatro (CFG.mode 'coop'): 1–4 héroes con clase, salas con puerta, jefe cada 5 salas y botín compartido.
   Un héroe sin vida queda caído: un compañero a su lado lo levanta en 2,2 s (el clérigo más rápido y con su Plegaria al instante).
   Si caen todos, fin. Sin tele: tú (J1) + un compañero CPU; en la tele, los humanos ocupan plazas y la CPU rellena hasta 2.
   La dificultad escala con el nº de héroes: más enemigos por sala y más vida (hpMul). ---------- */
const CLS = {
  knight: { n: 'Caballero', hp: 7, sp: 150, melee: 1, reach: 44, cd: 0.42, dmg: 1.5, sk: 'Torbellino', skd: 'Golpe giratorio a tu alrededor', skcd: 5 },
  archer: { n: 'Arquera', hp: 5, sp: 178, reach: 360, cd: 0.34, dmg: 1, spd: 480, shot: '#ffe08a', sk: 'Lluvia', skd: 'Doce flechas en círculo', skcd: 5.5 },
  mage:   { n: 'Maga', hp: 5, sp: 160, reach: 330, cd: 0.62, dmg: 1.7, spd: 300, pierce: 2, shot: '#c9a8ff', sk: 'Escarcha', skd: 'Congela a los enemigos cercanos', skcd: 7 },
  cleric: { n: 'Clérigo', hp: 6, sp: 160, melee: 1, reach: 38, cd: 0.45, dmg: 1.2, sk: 'Plegaria', skd: 'Cura y levanta a los caídos cerca', skcd: 9 },
};
const CK = ['knight', 'archer', 'mage', 'cleric'];
let HE = [], lobby = null, fxs = [];
/* 'castillo': placas de presión. plates[0] está dentro de la alcoba, plates[1] fuera y su peso levanta la reja. */
let plates = [], gate = null, unlocked = false, ALC = null;
const inAlcove = (x, y, m) => !!ALC && x > ALC.x - m && x < ALC.x + ALC.w + m && y > ALC.y - m && y < ALC.y + ALC.h + m;
function castleSetup() {
  plates = []; gate = null; unlocked = false; ALC = null;
  if (room % 5 === 0) return; // sala de jefe: sin placas
  const IW = 62, IH = 54, TW = 12, ax = X0 + 46, ay = Math.random() < 0.5 ? Y0 + 26 : Y1 - 26 - IH;
  ALC = { x: ax, y: ay, w: IW, h: IH };
  walls = walls.filter((w) => !(w.x < ax + IW + 30 && w.x + w.w > ax - 30 && w.y < ay + IH + 30 && w.y + w.h > ay - 30));
  const push = (x, y, w, h, extra) => { const o = { x, y, w, h, hp: 0, fl: 0, seed: Math.random() }; if (extra) Object.assign(o, extra); walls.push(o); return o; };
  push(ax - TW, ay - TW, IW + TW * 2, TW); push(ax - TW, ay + IH, IW + TW * 2, TW); push(ax - TW, ay, TW, IH);
  gate = push(ax + IW, ay, TW, IH, { gate: 1, open: false });
  plates.push({ x: ax + IW / 2, y: ay + IH / 2, on: false, inn: 1 });
  let px = X1 - 90, py = H / 2;
  for (let i = 0; i < 40; i++) { const [a, b] = place(90); if (!inAlcove(a, b, 60) && a > ax + IW + 70) { px = a; py = b; break; } }
  plates.push({ x: px, y: py, on: false, inn: 0 });
  for (const q of pend) if (inAlcove(q.x, q.y, 24)) { for (let i = 0; i < 30; i++) { const [a, b] = place(60); if (!inAlcove(a, b, 24)) { q.x = a; q.y = b; break; } } }
}
function plateFor(h) { // placa a la que se dirige una CPU: la libre, empezando por la de fuera
  if (!plates.length || unlocked) return null;
  const mine = plates.find((q) => Math.hypot(h.x - q.x, h.y - q.y) < 24); if (mine) return mine;
  const free = plates.filter((q) => !HE.some((o) => o !== h && !o.down && Math.hypot(o.x - q.x, o.y - q.y) < 30));
  const out = free.find((q) => !q.inn); if (out) return out;
  return free.find((q) => q.inn && (gate ? gate.open : true)) || null;
}
function mkHero(q, cls) { return { pl: q.p, col: q.color, name: q.name, cpu: q.cpu, cls, x: X0 + 40, y: H / 2, r: 11, hp: CLS[cls].hp, max: CLS[cls].hp, inv: 0, kx: 0, ky: 0, mv: false, face: 1, a: 0, aim: 0, cool: 0, sk: 2, roll: 0, rollCd: 0, down: false, rev: 0, swing: 0, swingA: 0, ai: null, ph: Math.random() * 6 }; }
function coopReset() {
  VS = null; room = 0; score = 0; t = 0; kills = 0; choice = null; fxs = []; hpMul = 1; upg = { rate: 1, dmg: 1, speed: 1, multi: 1, pierce: 0, reach: 1 };
  const pl = k.players(4), top = Math.max(1, ...pl.filter((q) => !q.cpu).map((q) => q.p + 1));
  HE = pl.slice(0, Math.max(2, top)).map((q, i) => mkHero(q, CK[i]));
  lobby = { t: 12, ready: HE.map((h) => h.cpu) };
  p = { x: X0 + 40, y: H / 2, r: 11 }; walls = []; foes = []; shots = []; eshots = []; pend = []; drops = []; floorCv = null; door = false; cleared = true; quota = 0; msgT = 0; bossF = null;
}
function coopParty() {
  if (k.st !== 'play') { reset(); return; }
  const pl = k.players(4);
  for (const h of HE) { h.cpu = pl[h.pl].cpu; h.name = pl[h.pl].name; h.ai = null; if (lobby) lobby.ready[HE.indexOf(h)] = h.cpu; }
  for (const q of pl) if (!q.cpu && !HE.some((h) => h.pl === q.p)) { const h = mkHero(q, CK[q.p]); h.x = X0 + 40; h.y = H / 2; h.inv = 2; HE.push(h); if (lobby) lobby.ready.push(false); k.float('¡' + h.name + ' se une!', h.x + 30, Math.max(Y0 + 44, h.y - 30), h.col); }
  HE.sort((a, b) => a.pl - b.pl); if (lobby) lobby.ready = HE.map((h) => h.cpu);
  hpMul = 1 + 0.35 * (HE.length - 1);
}
function formation() { const n = HE.length; HE.forEach((h, i) => { h.x = X0 + 36 + (i % 2) * 18; h.y = H / 2 + (i - (n - 1) / 2) * 30; h.kx = h.ky = 0; }); }
function coopRoom() {
  TH.boss = HORDE ? 'brute' : CASTLE ? ((room + 1) % 10 === 0 ? 'eye' : 'skel') : (room + 1) % 10 === 0 ? 'skel' : 'eye';
  p = { x: X0 + 40, y: H / 2, r: 11 };
  buildRoom(); const n = HE.length;
  if (room % 5 === 0) { for (let i = 1; i < n; i++) queue(k.pick(TH.foes)); }
  else { const extra = Math.round(pend.length * 0.6 * (n - 1)); for (let i = 0; i < extra; i++) queue(pickType()); }
  if (quota > 0) quota = Math.round(quota * (1 + 0.45 * (n - 1)));
  if (CASTLE) castleSetup();
  formation();
}
function coopStart() { hpMul = 1 + 0.35 * (HE.length - 1); HE.forEach((h) => { const C = CLS[h.cls]; h.hp = h.max = C.hp; h.sk = 2; }); lobby = null; coopRoom(); k.count(3); }
function lobbyUpdate(dt) {
  lobby.t -= dt;
  HE.forEach((h, i) => {
    if (h.cpu) return; const L = k.phit(h.pl, 'left') || k.phit(h.pl, 'up'), R = k.phit(h.pl, 'right') || k.phit(h.pl, 'down');
    if (!lobby.ready[i] && (L || R)) { h.cls = CK[(CK.indexOf(h.cls) + (R ? 1 : 3)) % 4]; k.sfx('click'); }
    if (k.phit(h.pl, 'a')) { lobby.ready[i] = !lobby.ready[i]; k.sfx(lobby.ready[i] ? 'coin' : 'click'); }
    if (h.pl === 0 && !k.party && k.ptr.hit) { const cw = Math.min(150, (W - 40) / HE.length - 10), x0 = W / 2 - (HE.length * (cw + 10) - 10) / 2 + i * (cw + 10);
      if (k.ptr.x > x0 && k.ptr.x < x0 + cw && k.ptr.y > 70 && k.ptr.y < 290) { if (k.ptr.y > 240) { lobby.ready[i] = true; k.sfx('coin'); } else if (!lobby.ready[i]) { h.cls = CK[(CK.indexOf(h.cls) + 1) % 4]; k.sfx('click'); } } }
  });
  /* la CPU elige las clases que falten (prefiere no repetir) */
  HE.forEach((h, i) => { if (h.cpu) { const used = HE.filter((o) => !o.cpu).map((o) => o.cls), free = CK.filter((c2) => !used.includes(c2) && !HE.some((o, j) => j < i && o.cpu && o.cls === c2)); if (free.length && !free.includes(h.cls)) h.cls = free[0]; } });
  if (lobby.t <= 0 || lobby.ready.every(Boolean)) coopStart();
}
const nearFoe = (x, y) => { let n = null, nd = 1e9; for (const f of foes) { const d = Math.hypot(f.x - x, f.y - y); if (d < nd) { nd = d; n = f; } } return [n, nd]; };
function heroHurt(h, n, sx, sy) {
  if (h.inv > 0 || h.down || h.roll > 0) return;
  h.hp -= n; h.inv = 1.5; k.shake(5); k.sfx('hurt'); k.burst(h.x, h.y, h.col, 10, 150);
  if (sx !== undefined) { const a = Math.atan2(h.y - sy, h.x - sx); h.kx = Math.cos(a) * 280; h.ky = Math.sin(a) * 280; }
  if (h.hp <= 0) { h.hp = 0; h.down = true; h.rev = 0; k.flash('rgba(255,60,80,.25)'); k.float(`¡${h.name} ha caído!`, h.x, Math.max(Y0 + 44, h.y - 30), h.col); }
}
function skill(h) {
  const C = CLS[h.cls]; h.sk = C.skcd * (h.skMul || 1); k.sfx('explode'); k.shake(3);
  if (h.cls === 'knight') { fxs.push({ k: 'ring', x: h.x, y: h.y, r: 70 * upg.reach, t: 0.35, col: '#fff' }); for (const f of foes) { const d = Math.hypot(f.x - h.x, f.y - h.y); if (d < 70 * upg.reach + f.r) dmgFoe(f, 2 * upg.dmg, Math.atan2(f.y - h.y, f.x - h.x)); } }
  else if (h.cls === 'archer') for (let i = 0; i < 12; i++) { const a = (i / 12) * R2; shots.push({ x: h.x, y: h.y - 4, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, life: 0.9, b: 0, pierce: 1, hits: [], dmg: 1.2 * upg.dmg, col: C.shot, arrow: 1 }); }
  else if (h.cls === 'mage') { fxs.push({ k: 'ring', x: h.x, y: h.y, r: 130, t: 0.45, col: '#7df0ff' }); for (const f of foes) if (Math.hypot(f.x - h.x, f.y - h.y) < 130 + f.r) { f.frz = f.boss ? 1.2 : 2.6; dmgFoe(f, 1, Math.atan2(f.y - h.y, f.x - h.x)); } }
  else { fxs.push({ k: 'ring', x: h.x, y: h.y, r: 120, t: 0.5, col: '#ffd23d' }); for (const o of HE) if (Math.hypot(o.x - h.x, o.y - h.y) < 120) { if (o.down) revive(o, 2); else { o.hp = Math.min(o.max, o.hp + 2); k.float('+2', o.x, o.y - 26, '#7cf7a0'); } } }
  k.float(C.sk, h.x, Math.max(Y0 + 44, h.y - 40), '#ffc928');
}
function revive(h, hp) { h.down = false; h.hp = Math.min(h.max, hp); h.inv = 1.5; h.rev = 0; k.sfx('win'); k.burst(h.x, h.y, '#7cf7a0', 18, 160); k.float('¡Arriba!', h.x, h.y - 30, '#7cf7a0'); }
/* CPU aliada: esquiva, levanta a los caídos, pelea según su clase (cuerpo a cuerpo se acerca; a distancia mantiene 150–210 px) y no se aleja del líder humano */
function heroCpu(h, dt) {
  const st = h.ai || (h.ai = { side: Math.random() < 0.5 ? 1 : -1, t: 0, px: h.x, py: h.y, stuck: 0 }), C = CLS[h.cls];
  st.t -= dt; if (st.t <= 0) { st.t = k.rnd(1, 2.2); st.side *= -1; }
  st.stuck = Math.hypot(h.x - st.px, h.y - st.py) < 12 * dt ? st.stuck + dt : 0; st.px = h.x; st.py = h.y;
  const [nf, nd] = nearFoe(h.x, h.y), lead = HE.find((o) => !o.cpu && !o.down) || HE.find((o) => !o.down && o !== h);
  let mx = 0, my = 0, sk = false, roll = false;
  for (const s of eshots) { const rx = h.x - s.x, ry = h.y - s.y, sp = Math.hypot(s.vx, s.vy) || 1, tt = (rx * s.vx + ry * s.vy) / (sp * sp); if (tt < 0 || tt > 0.5) continue; const ex = s.x + s.vx * tt - h.x, ey = s.y + s.vy * tt - h.y; if (Math.hypot(ex, ey) < 22) { const nx = -s.vy / sp, ny = s.vx / sp, sd = ex * nx + ey * ny > 0 ? -1 : 1; return [nx * sd, ny * sd, false, h.rollCd <= 0 && Math.random() < 0.04]; } }
  const dn = HE.filter((o) => o.down).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];
  if (dn && (nd > 60 || !nf) && Math.hypot(dn.x - h.x, dn.y - h.y) < 400) { const dx = dn.x - h.x, dy = dn.y - h.y, d = Math.hypot(dx, dy); if (d > 16) { mx = dx / d; my = dy / d; } if (h.cls === 'cleric' && h.sk <= 0 && d < 110) sk = true; return [mx, my, sk, false]; }
  if (CASTLE && cleared && !unlocked && plates.length) { const tg = plateFor(h);
    if (tg) { const dx = tg.x - h.x, dy = tg.y - h.y, d = Math.hypot(dx, dy); return d > 9 ? [dx / d, dy / d, false, false] : [0, 0, false, false]; } }
  if (nf) {
    const a = Math.atan2(nf.y - h.y, nf.x - h.x);
    if (C.melee) { if (nd > C.reach * upg.reach * 0.7 + nf.r) { mx = Math.cos(a); my = Math.sin(a); } else { mx = Math.cos(a + 1.57 * st.side) * 0.4; my = Math.sin(a + 1.57 * st.side) * 0.4; } }
    else { const want = nd < 140 ? -1 : nd > 220 ? 1 : 0; mx = Math.cos(a) * want + Math.cos(a + 1.57) * st.side * 0.7; my = Math.sin(a) * want + Math.sin(a + 1.57) * st.side * 0.7; }
    const close = foes.filter((f) => Math.hypot(f.x - h.x, f.y - h.y) < (h.cls === 'archer' ? 240 : h.cls === 'mage' ? 125 : 70)).length;
    if (h.sk <= 0 && (close >= (h.cls === 'archer' ? 3 : 2) || (nf.boss && nd < 140))) sk = true;
    if (h.cls === 'cleric' && h.sk <= 0 && HE.some((o) => !o.down && o.hp <= 2 && Math.hypot(o.x - h.x, o.y - h.y) < 110)) sk = true;
    if (nf.boss && nf.warn > 0 && nd < 120 && h.rollCd <= 0) roll = true;
  }
  if (lead && lead !== h) { const dx = lead.x - h.x, dy = lead.y - h.y, d = Math.hypot(dx, dy); if (d > (nf ? 190 : 60)) { mx = mx * 0.3 + dx / d; my = my * 0.3 + dy / d; } }
  if (st.stuck > 0.25 && (mx || my)) { const a = Math.atan2(my, mx) + 1.4 * st.side; mx = Math.cos(a); my = Math.sin(a); }
  return [mx, my, sk, roll];
}
function coopApply(i) {
  const o = choice.opts[i]; k.sfx('pop'); choice = null;
  if (o === 'hp') HE.forEach((h) => { h.max++; h.hp++; }); else if (o === 'heal') HE.forEach((h) => { h.down = false; h.hp = h.max; }); else if (o === 'skill') HE.forEach((h) => { h.skMul = (h.skMul || 1) * 0.8; }); else UP[o][2]();
  HE.forEach((h) => { if (h.down) { h.down = false; h.hp = 1; h.inv = 1.5; } h.sk = Math.min(h.sk, 1); });
  coopRoom(); k.float(o === 'skill' ? 'Habilidad' : UP[o][0], W / 2, H / 2 - 20, '#ffc928');
}
UP.skill = ['Concentración', '−20 % de espera de la habilidad (A)', () => {}];
function coopChoice() { const pool = ['rate', 'dmg', 'speed', 'hp', 'heal', 'skill', 'reach', 'multi'].filter((o) => !(o === 'multi' && upg.multi >= 3) && !(o === 'heal' && HE.every((h) => h.hp >= h.max))); choice = { opts: k.shuffle(pool).slice(0, 3), sel: 1, t: 0 }; k.sfx('coin'); }
function coopUpdate(dt) {
  if (lobby) return lobbyUpdate(dt);
  for (const f of fxs) f.t -= dt; fxs = fxs.filter((f) => f.t > 0);
  if (k.counting()) return;
  if (choice) {
    choice.t += dt; if (choice.t < 0.35) return;
    for (const h of HE) { if (h.cpu) continue; if (k.phit(h.pl, 'left')) choice.sel = Math.max(0, choice.sel - 1); if (k.phit(h.pl, 'right')) choice.sel = Math.min(2, choice.sel + 1); if (k.phit(h.pl, 'a')) return coopApply(choice.sel); }
    if (!k.party && k.ptr.hit) for (let i = 0; i < 3; i++) if (k.ptr.x > cardX(i) && k.ptr.x < cardX(i) + CW && k.ptr.y > CY && k.ptr.y < CY + CHt) return coopApply(i);
    return;
  }
  for (const w of walls) w.fl -= dt;
  for (const q of pend) { q.t -= dt; if (q.t <= 0) { q.done = 1; addFoe(q.type, q.x, q.y, q.boss); k.burst(q.x, q.y, '#b98cff', 10, 120); } }
  pend = pend.filter((q) => !q.done);
  if (quota > 0) { spawnT -= dt; if (spawnT <= 0 && foes.length + pend.length < (8 + room * 2) * HE.length) { spawnT = Math.max(0.5, 2.1 - room * 0.12) / Math.max(1, HE.length * 0.6); quota--; queue(pickType(), false, true); } }
  /* héroes */
  for (const h of HE) {
    h.inv -= dt; h.cool -= dt; h.sk -= dt; h.swing -= dt; h.rollCd -= dt;
    if (h.down) { const helpers = HE.filter((o) => !o.down && Math.hypot(o.x - h.x, o.y - h.y) < 36); if (helpers.length) { h.rev += dt * helpers.reduce((s2, o) => s2 + (o.cls === 'cleric' ? 1.6 : 1), 0); if (Math.random() < 0.3) k.burst(h.x, h.y - 8, '#7cf7a0', 1, 40); } else h.rev = Math.max(0, h.rev - dt * 0.5); if (h.rev >= 2.2) revive(h, Math.ceil(h.max / 2)); continue; }
    const C = CLS[h.cls]; let mx = 0, my = 0, useSk = false, useRoll = false;
    if (h.cpu) [mx, my, useSk, useRoll] = heroCpu(h, dt);
    else { const d = k.pdir(h.pl); mx = d.x; my = d.y; useSk = k.phit(h.pl, 'a'); useRoll = k.phit(h.pl, 'b');
      if (h.pl === 0 && !k.party && k.ptr.down) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy, dd = Math.hypot(dx, dy); if (dd > 8) { mx = dx / Math.max(dd, 40); my = dy / Math.max(dd, 40); } }
      if (h.pl === 0 && !k.party && k.tap) useSk = true; }
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    h.mv = ml > 0.1; if (h.mv) h.a = Math.atan2(my, mx);
    if (useSk && h.sk <= 0) skill(h);
    if (useRoll && h.rollCd <= 0) { h.roll = 0.2; h.rollCd = 1; h.inv = Math.max(h.inv, 0.3); k.sfx('jump'); }
    if (h.roll > 0) { h.roll -= dt; move(h, Math.cos(h.a) * 400 * dt, Math.sin(h.a) * 400 * dt); if (Math.random() < 0.5) k.burst(h.x, h.y + 8, '#fff', 1, 30); }
    else move(h, (mx * C.sp * upg.speed + h.kx) * dt, (my * C.sp * upg.speed + h.ky) * dt);
    const dec = Math.pow(0.002, dt); h.kx *= dec; h.ky *= dec;
    const [nf, nd] = nearFoe(h.x, h.y);
    h.aim = nf && (C.melee || nd < C.reach) ? Math.atan2(nf.y - h.y, nf.x - h.x) : h.a; h.face = Math.cos(h.aim) < 0 ? -1 : 1;
    if (nf && h.cool <= 0) {
      if (C.melee) { const reach = C.reach * upg.reach; if (nd < reach + nf.r) { h.cool = C.cd / upg.rate; h.swing = 0.18; h.swingA = h.aim; k.sfx('shoot'); for (const f of foes) { const d = Math.hypot(f.x - h.x, f.y - h.y); if (d < reach + f.r && angDiff(Math.atan2(f.y - h.y, f.x - h.x), h.aim) < 1.25) dmgFoe(f, C.dmg * upg.dmg, Math.atan2(f.y - h.y, f.x - h.x)); } } }
      else if (nd < C.reach) { h.cool = C.cd / upg.rate; const n = upg.multi; for (let i = 0; i < n; i++) { const a = h.aim + (i - (n - 1) / 2) * 0.17; shots.push({ x: h.x + Math.cos(a) * 14, y: h.y - 4 + Math.sin(a) * 14, vx: Math.cos(a) * C.spd, vy: Math.sin(a) * C.spd, life: 1.3, b: 0, pierce: (C.pierce || 0) + upg.pierce, hits: [], dmg: C.dmg * upg.dmg, col: C.shot, arrow: h.cls === 'archer' }); } k.sfx('shoot'); }
    }
    for (const o of HE) if (o !== h && !o.down) { const ex = h.x - o.x, ey = h.y - o.y, e = Math.hypot(ex, ey); if (e > 0 && e < 20) move(h, ex / e * 50 * dt, ey / e * 50 * dt); }
  }
  /* proyectiles */
  for (const s of shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) s.dead = true;
    for (const f of foes) if (!s.dead && !f.dead && !s.hits.includes(f) && Math.hypot(s.x - f.x, s.y - f.y) < f.r + 4) { dmgFoe(f, s.dmg, Math.atan2(s.vy, s.vx)); s.hits.push(f); if (s.pierce-- <= 0) s.dead = true; }
    if (!s.dead && rectHit(s.x, s.y, 3)) { s.dead = true; k.burst(s.x, s.y, s.col, 3, 60); }
  }
  const liveH = HE.filter((h) => !h.down);
  for (const s of eshots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0 || rectHit(s.x, s.y, 3)) s.dead = true;
    for (const h of liveH) if (!s.dead && Math.hypot(s.x - h.x, s.y - h.y) < h.r * 0.85 + s.r - 2) { s.dead = true; heroHurt(h, 1, s.x - s.vx, s.y - s.vy); }
  }
  /* enemigos: persiguen al héroe en pie más cercano */
  for (const f of foes) {
    if (f.dead) continue;
    f.fl -= dt; f.cd -= dt; f.cd2 -= dt;
    if (f.frz > 0) { f.frz -= dt; move(f, f.kx * dt, f.ky * dt, true); const fd = Math.pow(0.002, dt); f.kx *= fd; f.ky *= fd; continue; }
    let tg = null, d = 1e9; for (const h of liveH) { const e = Math.hypot(h.x - f.x, h.y - f.y); if (e < d) { d = e; tg = h; } }
    if (!tg) break;
    const dx = tg.x - f.x, dy = tg.y - f.y, a = Math.atan2(dy, dx); f.a = a; f.face = dx < 0 ? -1 : 1; d = d || 1;
    let vx = 0, vy = 0; const ghost = f.type === 'ghost' || f.type === 'bat' || f.type === 'eye';
    if (f.boss && f.type === 'skel') {
      if (f.dash > 0) { f.dash -= dt; vx = f.dvx; vy = f.dvy; if (f.dash <= 0) f.cd = 2.2 * cdK(); }
      else if (f.warn > 0) { f.warn -= dt; if (f.warn <= 0) { f.dash = 0.5; f.dvx = Math.cos(a) * 440; f.dvy = Math.sin(a) * 440; k.sfx('jump'); } }
      else { vx = Math.cos(a) * f.sp; vy = Math.sin(a) * f.sp; if (f.cd <= 0) f.warn = 0.7; }
    } else if (f.boss) {
      vx = Math.cos(a) * f.sp * 0.6; vy = Math.sin(a) * f.sp * 0.6;
      if (f.cd <= 0) { f.cd = 2.8 * cdK(); for (let i = 0; i < 12; i++) fire(f, (i / 12) * R2 + t, 150); k.sfx('shoot'); }
      if (f.cd2 <= 0) { f.cd2 = 1.4 * cdK(); for (let i = -1; i <= 1; i++) fire(f, a + i * 0.2, 210); }
    } else if (RANGED[f.type]) {
      const want = 170, dir = d > want ? 1 : d < want - 50 ? -1 : 0, st2 = Math.sin(t * 0.9 + f.ph) * 0.8;
      vx = (Math.cos(a) * dir + Math.cos(a + 1.57) * st2) * f.sp; vy = (Math.sin(a) * dir + Math.sin(a + 1.57) * st2) * f.sp;
      if (f.cd <= 0 && d < 420) { f.cd = (f.type === 'ghost' ? 2.6 : 2.2) * cdK(); fire(f, a, 200); }
    } else {
      let s2 = f.sp; if (f.type === 'slime' || f.type === 'mini') s2 *= Math.sin(t * 5 + f.ph) > 0 ? 1.7 : 0.15;
      const wob = f.type === 'bat' ? Math.sin(t * 4 + f.ph) * 0.9 : 0; vx = Math.cos(a + wob) * s2; vy = Math.sin(a + wob) * s2;
    }
    for (const g of foes) if (g !== f && !g.dead) { const ex = f.x - g.x, ey = f.y - g.y, e = Math.hypot(ex, ey), m = f.r + g.r; if (e > 0 && e < m) { vx += ex / e * 70; vy += ey / e * 70; } }
    move(f, (vx + f.kx) * dt, (vy + f.ky) * dt, ghost); const fd = Math.pow(0.002, dt); f.kx *= fd; f.ky *= fd;
    f.mv = Math.hypot(vx, vy) > 5;
    for (const h of liveH) if (Math.hypot(h.x - f.x, h.y - f.y) < f.r + h.r * 0.85 - 2) heroHurt(h, f.type === 'brute' || f.boss ? 2 : 1, f.x, f.y);
  }
  foes = foes.filter((f) => !f.dead); shots = shots.filter((s) => !s.dead); eshots = eshots.filter((s) => !s.dead);
  /* botín compartido: las monedas suman al equipo y el corazón cura a quien lo coge */
  for (const dr of drops) {
    dr.t -= dt; let tg = null, dd = 1e9; for (const h of liveH) { const e = Math.hypot(h.x - dr.x, h.y - dr.y); if (e < dd) { dd = e; tg = h; } }
    if (!tg) continue;
    if (dd < 80 || cleared) { const v = cleared ? 420 : 280; dr.x += (tg.x - dr.x) / (dd || 1) * v * dt; dr.y += (tg.y - dr.y) / (dd || 1) * v * dt; }
    if (dd < 19) { dr.got = true; if (dr.k === 'coin') { score += dr.v; k.sfx('coin'); k.float(`+${dr.v}`, dr.x, dr.y - 10, '#ffc928'); } else { tg.hp = Math.min(tg.max, tg.hp + 1); k.sfx('pop'); k.float('+1', dr.x, dr.y - 10, '#ff5f7a'); } }
  }
  drops = drops.filter((dr) => !dr.got && (dr.t > 0 || cleared));
  if (CASTLE && plates.length) {
    for (const q of plates) { const on = liveH.some((h) => Math.hypot(h.x - q.x, h.y - q.y) < 22); if (on !== q.on) k.sfx(on ? 'click' : 'pop'); q.on = on; }
    if (gate) gate.open = unlocked || plates[1].on;
    if (!unlocked && cleared && plates.every((q) => q.on)) { unlocked = true; door = true; if (gate) gate.open = true; k.sfx('win'); k.flash('rgba(255,201,40,.22)'); msg = '¡Puerta abierta!'; msgT = 1.8; }
  }
  if (!liveH.length) { k.burst(W / 2, H / 2, '#ff5f7a', 30, 240); return k.lose(CFG.id, score, 'Equipo derrotado', `${TH.label} ${room} · ${kills} bajas · ${HE.length} héroes`); }
  if (!cleared && !foes.length && !pend.length && quota <= 0) { cleared = true; clearT = 0; score += 50 * room * HE.length; k.sfx('win');
    if (CASTLE && plates.length) { msg = 'Pisad las dos placas a la vez'; msgT = 2.6; }
    else if (!TH.door) { msg = `¡${TH.label} superada!`; msgT = 1.4; }
    else { door = true; msg = 'Sala despejada: salid por la puerta'; msgT = 2; } }
  if (cleared && !TH.door) { clearT += dt; if (clearT > 1.3) return coopChoice(); }
  if (door && liveH.some((h) => h.x > X1 - 22 && Math.abs(h.y - H / 2) < 36)) coopChoice(); /* los caídos se levantan con 1 corazón en la sala siguiente */
}
const CLSI = { knight: 'dmg', archer: 'multi', mage: 'rate', cleric: 'heal' };
function heroSprite(h, x, y, sc) {
  const C = CLS[h.cls], di = dirIdx(h.aim != null ? h.aim : 0);
  const pose = heroPose({ inv: h.down ? 0 : h.inv, swing: h.swing, recoil: h.cool > (C.cd || 1) - 0.12 ? 0.1 : 0, mv: h.mv && !h.down, ph: h.ph || 0 });
  blit(heroCv(h.col, h.cls, di, pose), x, y + 11 * sc, sc);
  const hd = heroHand(di, pose), hx = x + hd[0] * sc, hy = y + 11 * sc + hd[1] * sc;
  c.save(); c.translate(hx, hy); c.scale(sc, sc);
  if (h.cls === 'knight') {                                  // espadón con guarda
    c.rotate(h.aim + (h.swing > 0 ? -1.5 + (0.18 - h.swing) * 16 : 0.9));
    ART.rr(c, -2.2, -26, 4.4, 27, 2); ART.fillOut(c, '#dbe4f5', 2.2);
    c.fillStyle = AL('#ffffff', 0.6); c.fillRect(-1.5, -24, 1.5, 23);
    ART.rr(c, -7, 0, 14, 3.6, 1.6); ART.fillOut(c, '#ffc928', 1.8);
    c.beginPath(); c.arc(0, 5, 2.4, 0, R2); ART.fillOut(c, '#ffc928', 1.6);
  } else if (h.cls === 'archer') {                           // arco con cuerda tensada
    c.rotate(h.aim); c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.arc(2, 0, 12, -1.35, 1.35); c.stroke();
    c.strokeStyle = '#a0683c'; c.lineWidth = 2.8; c.stroke();
    c.strokeStyle = AL('#ffffff', 0.4); c.lineWidth = 1; c.beginPath(); c.arc(1, -1, 12, -1.35, 1.35); c.stroke();
    const px = h.cool > 0.2 ? 2 : -4;
    c.strokeStyle = '#f4efe6'; c.lineWidth = 1.4; c.beginPath();
    c.moveTo(2 + Math.cos(-1.35) * 12, Math.sin(-1.35) * 12); c.lineTo(px, 0); c.lineTo(2 + Math.cos(1.35) * 12, Math.sin(1.35) * 12); c.stroke();
    if (h.cool > 0.2) { c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.moveTo(px, 0); c.lineTo(px + 16, 0); c.stroke(); c.strokeStyle = '#c9a06a'; c.lineWidth = 1.2; c.stroke(); }
  } else if (h.cls === 'mage') {                             // báculo con gema
    c.rotate(h.aim * 0.25 - 0.35);
    ART.rr(c, -2, -26, 4, 28, 2); ART.fillOut(c, '#7a5230', 2);
    c.fillStyle = AL('#ffffff', 0.3); c.fillRect(-1.4, -24, 1.3, 24);
    c.beginPath(); c.arc(0, -29, 5.4, 0, R2); ART.fillOut(c, C.shot, 2.2);
    c.fillStyle = AL('#ffffff', 0.55); c.beginPath(); c.arc(-1.6, -30.6, 2, 0, R2); c.fill();
    c.globalAlpha = 0.3 + Math.sin(t * 6) * 0.14; c.fillStyle = C.shot; c.beginPath(); c.arc(0, -29, 10, 0, R2); c.fill(); c.globalAlpha = 1;
  } else {                                                   // maza del clérigo
    const swg = h.swing > 0 ? (0.18 - h.swing) * 14 - 1.2 : -0.4; c.rotate(h.aim + swg);
    ART.rr(c, -2, -19, 4, 20, 1.8); ART.fillOut(c, '#7a5230', 2);
    c.beginPath(); c.arc(0, -22, 5.6, 0, R2); ART.fillOut(c, '#c9d1e6', 2.2);
    c.fillStyle = AL('#ffffff', 0.5); c.beginPath(); c.arc(-1.8, -23.6, 2.2, 0, R2); c.fill();
    c.fillStyle = '#ffd23d'; c.fillRect(-1.2, -26, 2.4, 7); c.fillRect(-3.6, -23.8, 7.2, 2.4);
  }
  c.restore();
}
function coopHero(h) {
  if (h.down) {
    c.save(); c.translate(h.x, h.y + 6); c.globalAlpha = 0.85; c.rotate(Math.PI / 2 * h.face); c.scale(0.92, 0.92); blit(heroCv(h.col, h.cls, 2, 7), 0, 12, 1); c.restore(); c.globalAlpha = 1;
    const pr = Math.min(1, h.rev / 2.2); c.lineWidth = 5; c.strokeStyle = 'rgba(26,21,48,.7)'; c.beginPath(); c.arc(h.x, h.y, 22, 0, R2); c.stroke();
    c.strokeStyle = '#7cf7a0'; c.beginPath(); c.arc(h.x, h.y, 22, -Math.PI / 2, -Math.PI / 2 + pr * R2); c.stroke();
    if (Math.floor(t * 3) % 2) label('¡Ayuda!', h.x, h.y - 44, 14, h.col, 'center');
    return;
  }
  if (h.inv > 0 && h.roll <= 0 && Math.floor(h.inv * 14) % 2) return;
  c.strokeStyle = h.col; c.lineWidth = 3; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(h.x, h.y + 11, 14, 5.5, 0, 0, R2); c.stroke(); c.globalAlpha = 1;
  heroSprite(h, h.x, h.y, 1.06);
  label(h.name, h.x, Math.max(Y0 + 8, h.y - 40), 13, h.cpu ? '#e8e4f4' : h.col, 'center');
}
function drawPlate(q) {
  const on = q.on, r = 19;
  c.beginPath(); c.ellipse(q.x, q.y + 3, r + 2, (r + 2) * 0.6, 0, 0, R2); c.fillStyle = 'rgba(0,0,0,.3)'; c.fill();
  c.beginPath(); c.ellipse(q.x, q.y + (on ? 2 : 0), r, r * 0.6, 0, 0, R2); ART.fillOut(c, on ? '#7cf7a0' : '#8f88ad', 2.5);
  c.beginPath(); c.ellipse(q.x, q.y + (on ? 2 : 0), r * 0.6, r * 0.36, 0, 0, R2); c.strokeStyle = on ? '#1a1530' : 'rgba(26,21,48,.55)'; c.lineWidth = 2; c.stroke();
  if (!on && !unlocked) { c.globalAlpha = 0.45 + Math.sin(t * 5) * 0.2; c.strokeStyle = '#ffc928'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(q.x, q.y, r + 5, (r + 5) * 0.6, 0, 0, R2); c.stroke(); c.globalAlpha = 1; }
}
function drawGate(w) {
  const x = w.x, y = w.y, hh = w.h, op = w.open;
  c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(x + 4, y + 5, w.w, hh);
  c.fillStyle = op ? 'rgba(26,21,48,.35)' : '#2b2440'; c.fillRect(x, y, w.w, hh);
  c.strokeStyle = OUT; c.lineWidth = 2.5; c.strokeRect(x + 1, y + 1, w.w - 2, hh - 2);
  c.strokeStyle = op ? 'rgba(200,190,230,.35)' : '#c9c2e6'; c.lineWidth = 3;
  const n = op ? 2 : 5; for (let i = 0; i < n; i++) { const yy = y + 5 + i * ((hh - 10) / Math.max(1, n - 1)) * (op ? 0.25 : 1); c.beginPath(); c.moveTo(x + 2, yy); c.lineTo(x + w.w - 2, yy); c.stroke(); }
}
function coopDraw() {
  if (!floorCv) floorCv = renderFloor(); if (!vigCv) vigCv = renderVig();
  c.drawImage(floorCv, 0, 0, W, H); lights();
  if (lobby) {
    c.fillStyle = 'rgba(12,10,22,.7)'; c.fillRect(0, 0, W, H); label('Elegid clase', W / 2, 22, 26, '#fff', 'center');
    const n = HE.length, cw = Math.min(150, (W - 40) / n - 10), x0 = W / 2 - (n * (cw + 10) - 10) / 2;
    HE.forEach((h, i) => {
      const x = x0 + i * (cw + 10), y = 70, C = CLS[h.cls], rd = lobby.ready[i];
      ART.rr(c, x, y, cw, 220, 16); c.fillStyle = rd ? '#262046' : '#1b1733'; c.fill(); c.lineWidth = 3; c.strokeStyle = h.col; c.stroke();
      label(h.name, x + cw / 2, y + 10, 18, h.col, 'center');
      heroSprite({ ...h, face: 1, mv: false, inv: 0, down: false, aim: 0.25, swing: 0, cool: 0 }, x + cw / 2, y + 108, 1.3);
      label(C.n, x + cw / 2, y + 118, 17, '#fff', 'center'); wrap(`A: ${C.sk}. ${C.skd}`, x + cw / 2, y + 142, cw - 16, 12, '#aab0bf');
      for (let j = 0; j < C.hp; j++) ART.heart(c, x + cw / 2 - (C.hp - 1) * 7 + j * 14, y + 186, 0.7, true);
      if (!h.cpu && !rd) { label('◀', x + 8, y + 70, 18, '#fff'); label('▶', x + cw - 8, y + 70, 18, '#fff', 'right'); }
      ART.rr(c, x + 12, y + 198, cw - 24, 16, 8); c.fillStyle = rd ? '#5fbf45' : 'rgba(255,255,255,.12)'; c.fill(); label(rd ? '¡Listo!' : 'A: listo', x + cw / 2, y + 199, 12, '#fff', 'center');
    });
    label(`Empieza en ${Math.max(0, Math.ceil(lobby.t))} s`, W / 2, H - 40, 14, '#ffc928', 'center');
    return;
  }
  drawDoor();
  if (CASTLE) for (const q of plates) drawPlate(q);
  for (const w of [...walls].sort((a, b) => a.y + a.h - b.y - b.h)) { if (w.gate) drawGate(w); else block(w); }
  for (const q of pend) { const k2 = 1 - q.t / Math.max(q.max, 0.9); c.save(); c.translate(q.x, q.y); c.rotate(t * 4); c.globalAlpha = 0.35 + k2 * 0.5; c.strokeStyle = q.boss ? '#ff3b5c' : '#b98cff'; c.lineWidth = 3; c.setLineDash([6, 6]); c.beginPath(); c.arc(0, 0, (q.boss ? 30 : 16) * (0.5 + k2 * 0.5), 0, R2); c.stroke(); c.setLineDash([]); c.restore(); c.globalAlpha = 1; }
  for (const d of drops) { if (d.t < 2 && Math.floor(d.t * 8) % 2) continue; drawDrop(d); }
  const ents = foes.map((f) => ({ y: f.y, f })).concat(HE.map((h) => ({ y: h.y, h }))).sort((a, b) => a.y - b.y);
  for (const e of ents) if (e.h) coopHero(e.h); else { drawFoe(e.f); if (e.f.frz > 0) { c.globalAlpha = 0.45; c.fillStyle = '#9ff3ff'; c.beginPath(); c.arc(e.f.x, e.f.y - 4, e.f.r + 4, 0, R2); c.fill(); c.globalAlpha = 1; } }
  for (const s of shots) {
    if (s.arrow) { c.save(); c.translate(s.x, s.y); c.rotate(Math.atan2(s.vy, s.vx)); c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(-10, 0); c.lineTo(6, 0); c.stroke(); c.strokeStyle = '#e8d7b0'; c.lineWidth = 2; c.stroke(); c.beginPath(); c.moveTo(9, 0); c.lineTo(3, -4); c.lineTo(3, 4); c.closePath(); ART.fillOut(c, '#e8eef8', 1.5); c.restore(); continue; }
    c.globalAlpha = 0.35; c.fillStyle = s.col; c.beginPath(); c.arc(s.x - s.vx * 0.02, s.y - s.vy * 0.02, 8, 0, R2); c.fill(); c.globalAlpha = 1; c.beginPath(); c.arc(s.x, s.y, 5, 0, R2); ART.fillOut(c, s.col, 1.5);
  }
  for (const s of eshots) { c.beginPath(); c.arc(s.x, s.y, s.r, 0, R2); ART.fillOut(c, '#ff5f7a', 2); c.fillStyle = '#ffe0e6'; c.beginPath(); c.arc(s.x - 1, s.y - 1, s.r * 0.4, 0, R2); c.fill(); }
  for (const h of HE) if (h.swing > 0 && h.cls === 'cleric') { c.globalAlpha = h.swing / 0.18; c.strokeStyle = '#ffd23d'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(h.x, h.y - 4, 34 * upg.reach, h.swingA - 1, h.swingA + 1); c.stroke(); c.globalAlpha = 1; }
    else if (h.swing > 0 && h.cls === 'knight') { c.globalAlpha = h.swing / 0.18; c.strokeStyle = '#fff'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.arc(h.x, h.y - 4, 38 * upg.reach, h.swingA - 1.1, h.swingA + 1.1); c.stroke(); c.strokeStyle = h.col; c.lineWidth = 3; c.stroke(); c.globalAlpha = 1; }
  for (const f of fxs) { const k2 = f.t / 0.45; c.globalAlpha = Math.min(1, k2 * 1.5); c.strokeStyle = f.col; c.lineWidth = 6; c.beginPath(); c.arc(f.x, f.y, f.r * (1.15 - k2 * 0.4), 0, R2); c.stroke(); c.globalAlpha = 1; }
  c.drawImage(vigCv, 0, 0, W, H);
  /* marcador por héroe: vida, habilidad y color */
  const n = HE.length, pw = Math.min(140, (W - 110) / n - 6);
  HE.forEach((h, i) => { const x = 8 + i * (pw + 6); ART.rr(c, x, 4, pw, 30, 9); c.fillStyle = h.down ? 'rgba(80,20,40,.8)' : 'rgba(26,21,48,.85)'; c.fill(); c.lineWidth = 2; c.strokeStyle = h.col; c.stroke();
    { const nm = h.name; label(nm, x + 7, 7, fitLab(nm, 40, 12), h.col); } const hs = Math.min(10, (pw - 50) / Math.max(1, h.max));
    for (let j = 0; j < h.max; j++) ART.heart(c, x + 50 + j * hs, 13, 0.55, j < h.hp);
    const sk = Math.max(0, h.sk) / (CLS[h.cls].skcd * (h.skMul || 1)); ART.rr(c, x + 7, 24, pw - 14, 5, 2.5); c.fillStyle = 'rgba(255,255,255,.15)'; c.fill(); ART.rr(c, x + 7, 24, (pw - 14) * (1 - sk), 5, 2.5); c.fillStyle = sk <= 0 ? '#ffc928' : '#8a7fd8'; c.fill(); });
  coinIcon(W - 18, 19); label(`${score}`, W - 32, 10, 18, '#fff', 'right');
  label(`${TH.label} ${room}`, W - 14, Y1 + 1, 11, 'rgba(255,255,255,.85)', 'right');
  if (CASTLE && cleared && !unlocked && plates.length) { const ht = 'Pisad las dos placas a la vez'; label(ht, W / 2, Y1 + 1, fitLab(ht, W - 260, 11), '#ffc928', 'center'); }
  if (bossF && !bossF.dead) { const bw = Math.min(260, W - 160), x = W / 2 - bw / 2, y = Y1 + 3; c.fillStyle = OUT; c.fillRect(x - 2, y - 2, bw + 4, 12); c.fillStyle = '#5a1f2c'; c.fillRect(x, y, bw, 8); c.fillStyle = '#ff3b5c'; c.fillRect(x, y, bw * Math.max(0, bossF.hp) / bossF.max, 8); }
  if (msgT > 0 && !choice) { c.globalAlpha = Math.min(1, msgT * 2); c.font = '800 22px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(msg).width + 36; ART.rr(c, W / 2 - mw / 2, H / 2 - 64, mw, 40, 12); c.fillStyle = 'rgba(26,21,48,.82)'; c.fill(); label(msg, W / 2, H / 2 - 55, 22, '#ffc928', 'center'); c.globalAlpha = 1; }
  if (choice) {
    c.fillStyle = 'rgba(12,10,22,.72)'; c.fillRect(0, 0, W, H); label('Mejora para todo el equipo', W / 2, CY - 42, 22, '#fff', 'center');
    choice.opts.forEach((o, i) => {
      const x = cardX(i), sel = choice.sel === i, lift = sel ? -6 : 0;
      ART.rr(c, x, CY + lift, CW, CHt, 16); c.fillStyle = sel ? '#262046' : '#1b1733'; c.fill(); c.lineWidth = sel ? 3 : 2; c.strokeStyle = sel ? '#6e62f5' : 'rgba(255,255,255,.14)'; c.stroke();
      c.globalAlpha = Math.min(1, choice.t * 4); icon(o === 'skill' ? 'rate' : o, x + CW / 2, CY + 48 + lift); label(UP[o][0], x + CW / 2, CY + 86 + lift, 17, '#fff', 'center'); wrap(UP[o][1], x + CW / 2, CY + 116 + lift, CW - 20, 13, '#aab0bf'); c.globalAlpha = 1;
    });
  }
}

reset(); k.show(CFG.title, CFG.help);
function hurt(n, sx, sy) {
  if (p.inv > 0 || k.st !== 'play') return;
  p.hp -= n; p.inv = 1.5; k.shake(6); k.flash('rgba(255,60,80,.3)'); k.sfx('hurt');
  if (sx !== undefined) { const a = Math.atan2(p.y - sy, p.x - sx); p.kx = Math.cos(a) * 280; p.ky = Math.sin(a) * 280; }
  if (p.hp <= 0) { k.burst(p.x, p.y, '#5ce1e6', 30, 240); k.lose(CFG.id, score, 'Derrotado', `${TH.label} ${room} · ${kills} bajas`); }
}
function dmgFoe(f, n, a) {
  f.hp -= n; f.fl = 0.1; const kb = f.boss ? 30 : tankM ? 60 : 190; f.kx += Math.cos(a) * kb; f.ky += Math.sin(a) * kb; k.sfx('pop');
  if (f.hp <= 0 && !f.dead) kill(f);
}
function kill(f) {
  f.dead = true; kills++; score += f.pts; k.burst(f.x, f.y, FCOL[f.type], f.boss ? 50 : tankM ? 26 : 14, f.boss ? 300 : 180);
  k.sfx(f.boss || tankM || f.type === 'brute' ? 'explode' : 'hit');
  if (f.boss) { k.shake(10); k.float('¡Jefe derrotado!', f.x, f.y - 34, '#ffc928'); }
  if (f.type === 'slime') for (let i = 0; i < (f.boss ? 4 : 2); i++) { const a = i / (f.boss ? 4 : 2) * R2, m = addFoe(f.boss ? 'slime' : 'mini', f.x + Math.cos(a) * 10, f.y + Math.sin(a) * 10); m.kx = Math.cos(a) * 180; m.ky = Math.sin(a) * 180; }
  if (Math.random() < (f.boss ? 1 : 0.45)) drops.push({ k: 'coin', x: f.x, y: f.y, t: 9, v: f.boss ? 50 : 10 });
  if (Math.random() < (f.boss ? 1 : 0.07)) drops.push({ k: 'heart', x: f.x + 10, y: f.y + 4, t: 9 });
}
function fire(f, a, spd) { spd *= bK(); eshots.push({ x: f.x + Math.cos(a) * f.r, y: f.y + Math.sin(a) * f.r, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 3.5, b: tankM ? 1 : 0, r: f.boss ? 6 : 5 }); }
function openChoice() {
  const pool = ['rate', 'dmg', 'speed', 'hp', 'heal'].concat(melee ? ['reach'] : ['multi', 'pierce']).filter((o) => !(o === 'multi' && upg.multi >= 3) && !(o === 'heal' && p.hp >= p.max));
  choice = { opts: k.shuffle(pool).slice(0, 3), sel: 1, t: 0 }; k.sfx('coin');
}
const CW = land ? 160 : 132, CHt = 176, cardX = (i) => W / 2 + (i - 1) * (CW + 14) - CW / 2, CY = H / 2 - CHt / 2 + 14;
function apply(i) {
  const o = choice.opts[i]; UP[o][2](); k.sfx('pop'); choice = null;
  if (TH.door) { p.x = X0 + 30; p.y = H / 2; } p.kx = p.ky = 0; buildRoom(); k.float(UP[o][0], p.x, p.y - 34, '#ffc928');
}

/* ---------- Actualización ---------- */
k.run((dt) => {
  if (!k.gate(reset)) return;
  t += dt; msgT -= dt;
  if (VS) return vsUpdate(dt);
  if (COOP) return coopUpdate(dt);
  if (choice) {
    choice.t += dt; if (choice.t < 0.35) return;
    if (k.hit.has('left')) choice.sel = Math.max(0, choice.sel - 1); if (k.hit.has('right')) choice.sel = Math.min(2, choice.sel + 1);
    if (k.hit.has('a')) return apply(choice.sel);
    if (k.ptr.hit) for (let i = 0; i < 3; i++) if (k.ptr.x > cardX(i) && k.ptr.x < cardX(i) + CW && k.ptr.y > CY && k.ptr.y < CY + CHt) return apply(i);
    return;
  }
  p.inv -= dt; cool -= dt; swing -= dt; p.recoil = Math.max(0, p.recoil - dt);
  for (const w of walls) w.fl -= dt;
  let mx = 0, my = 0; if (k.held.has('left')) mx--; if (k.held.has('right')) mx++; if (k.held.has('up')) my--; if (k.held.has('down')) my++;
  if (k.ptr.down) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy, d = Math.hypot(dx, dy); if (d > 8) { mx = dx / Math.max(d, 40); my = dy / Math.max(d, 40); } }
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  p.mv = ml > 0.1; if (p.mv) { p.a = Math.atan2(my, mx); if (tankM) p.body += k.clamp(((p.a - p.body + 3 * Math.PI) % R2) - Math.PI, -8 * dt, 8 * dt); }
  const sp = (tankM ? 130 : 165) * upg.speed;
  move(p, (mx * sp + p.kx) * dt, (my * sp + p.ky) * dt); const dec = Math.pow(0.002, dt); p.kx *= dec; p.ky *= dec;
  // apariciones anunciadas
  for (const q of pend) { q.t -= dt; if (q.t <= 0) { q.done = 1; addFoe(q.type, q.x, q.y, q.boss); k.burst(q.x, q.y, '#b98cff', 10, 120); } }
  pend = pend.filter((q) => !q.done);
  if (quota > 0) { spawnT -= dt; if (spawnT <= 0 && foes.length + pend.length < 10 + room * 2) { spawnT = Math.max(0.5, 2.1 - room * 0.12); quota--; queue(pickType(), false, true); } }
  // objetivo más cercano
  let near = null, nd = 1e9; for (const f of foes) { const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < nd) { nd = d; near = f; } }
  p.aim = near && (melee || nd < 380) ? Math.atan2(near.y - p.y, near.x - p.x) : tankM ? p.body : p.a;
  p.face = Math.cos(p.aim) < 0 ? -1 : 1;
  if (melee) {
    const reach = (M === 'brawl' ? 38 : 44) * upg.reach, close = near && nd < reach + near.r;
    if ((k.held.has('a') || k.tap || close) && cool <= 0) {
      cool = (M === 'brawl' ? 0.32 : 0.42) / upg.rate; swing = 0.18; p.swingA = p.aim; k.sfx('shoot');
      for (const f of foes) { const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < reach + f.r && angDiff(Math.atan2(f.y - p.y, f.x - p.x), p.aim) < 1.25) dmgFoe(f, upg.dmg, Math.atan2(f.y - p.y, f.x - p.x)); }
    }
  } else {
    const trig = tankM ? k.held.has('a') || k.tap || (near && nd < 260) : near && nd < 380;
    if (trig && cool <= 0) {
      cool = (tankM ? 0.55 : 0.3) / upg.rate; const n = upg.multi, spd = tankM ? 380 : 440;
      for (let i = 0; i < n; i++) { const a = p.aim + (i - (n - 1) / 2) * 0.17; shots.push({ x: p.x + Math.cos(a) * 16, y: p.y - 4 + Math.sin(a) * 16, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1.4, b: tankM ? 1 : 0, pierce: upg.pierce, hits: [] }); }
      k.sfx('shoot'); p.recoil = 0.1;
    }
  }
  // proyectiles
  const bounce = (s) => { s.x -= s.vx * k._dt; s.y -= s.vy * k._dt; if (rectHit(s.x + s.vx * k._dt, s.y, 2)) s.vx *= -1; else s.vy *= -1; };
  k._dt = dt;
  for (const s of shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) s.dead = true;
    for (const f of foes) if (!s.dead && !f.dead && !s.hits.includes(f) && Math.hypot(s.x - f.x, s.y - f.y) < f.r + 4) { dmgFoe(f, upg.dmg, Math.atan2(s.vy, s.vx)); s.hits.push(f); if (s.pierce-- <= 0) s.dead = true; }
    if (s.dead) continue;
    const w = wallAt(s.x, s.y, 3);
    if (w && w.hp) { s.dead = true; w.hp--; w.fl = 0.1; k.sfx('hit'); if (w.hp <= 0) { w.dead = true; k.burst(w.x + w.w / 2, w.y + w.h / 2, TH.top, 20, 200); k.sfx('explode'); score += 5; } }
    else if (rectHit(s.x, s.y, 3)) { if (s.b > 0) { s.b--; bounce(s); } else { s.dead = true; k.burst(s.x, s.y, '#fff', 3, 60); } }
  }
  for (const s of eshots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) s.dead = true;
    const w = wallAt(s.x, s.y, 3);
    if (w && w.hp && tankM) { s.dead = true; w.hp--; w.fl = 0.1; if (w.hp <= 0) { w.dead = true; k.burst(w.x + w.w / 2, w.y + w.h / 2, TH.top, 20, 200); k.sfx('explode'); } }
    else if (rectHit(s.x, s.y, 3)) { if (s.b > 0) { s.b--; bounce(s); } else s.dead = true; }
    if (!s.dead && Math.hypot(s.x - p.x, s.y - p.y) < p.r * 0.85 + s.r - 2) { s.dead = true; hurt(1, s.x - s.vx, s.y - s.vy); }
  }
  walls = walls.filter((w) => !w.dead);
  // enemigos
  for (const f of foes) {
    if (f.dead) continue;
    f.fl -= dt; f.cd -= dt; f.cd2 -= dt;
    const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx); f.a = a; f.face = dx < 0 ? -1 : 1;
    let vx = 0, vy = 0; const ghost = f.type === 'ghost' || f.type === 'bat' || f.type === 'eye';
    if (f.boss && melee) {
      if (f.dash > 0) { f.dash -= dt; vx = f.dvx; vy = f.dvy; if (f.dash <= 0) f.cd = 2.2 * cdK(); }
      else if (f.warn > 0) { f.warn -= dt; if (f.warn <= 0) { f.dash = 0.5; f.dvx = Math.cos(a) * 440; f.dvy = Math.sin(a) * 440; k.sfx('jump'); } }
      else { vx = Math.cos(a) * f.sp; vy = Math.sin(a) * f.sp; if (f.cd <= 0) f.warn = 0.6; }
    } else if (f.boss) {
      vx = Math.cos(a) * f.sp * 0.6; vy = Math.sin(a) * f.sp * 0.6;
      if (f.cd <= 0) { f.cd = 2.6 * cdK(); for (let i = 0; i < 12; i++) fire(f, i / 12 * R2 + t, 150); k.sfx('shoot'); }
      if (f.cd2 <= 0) { f.cd2 = 1.3 * cdK(); for (let i = -1; i <= 1; i++) fire(f, a + i * 0.2, 210); }
    } else if (RANGED[f.type]) {
      const want = f.type === 'tank' ? 200 : 170, dir = d > want ? 1 : d < want - 50 ? -1 : 0, st = Math.sin(t * 0.9 + f.ph) * 0.8;
      vx = (Math.cos(a) * dir + Math.cos(a + 1.57) * st) * f.sp; vy = (Math.sin(a) * dir + Math.sin(a + 1.57) * st) * f.sp;
      if (f.cd <= 0 && d < 420) { f.cd = (f.type === 'tank' ? 2 : f.type === 'ghost' ? 2.6 : 2.1) * cdK(); fire(f, a, f.type === 'tank' ? 230 : 200); if (tankM) f.recoil = 0.12; }
    } else {
      let s2 = f.sp; if (f.type === 'slime' || f.type === 'mini') s2 *= Math.sin(t * 5 + f.ph) > 0 ? 1.7 : 0.15;
      const wob = f.type === 'bat' ? Math.sin(t * 4 + f.ph) * 0.9 : 0; vx = Math.cos(a + wob) * s2; vy = Math.sin(a + wob) * s2;
    }
    for (const g of foes) if (g !== f && !g.dead) { const ex = f.x - g.x, ey = f.y - g.y, e = Math.hypot(ex, ey), m = f.r + g.r; if (e > 0 && e < m) { vx += ex / e * 70; vy += ey / e * 70; } }
    move(f, (vx + f.kx) * dt, (vy + f.ky) * dt, ghost); const fd = Math.pow(0.002, dt); f.kx *= fd; f.ky *= fd;
    f.mv = Math.hypot(vx, vy) > 5; if (f.mv && f.type === 'tank') f.body += k.clamp(((Math.atan2(vy, vx) - f.body + 3 * Math.PI) % R2) - Math.PI, -5 * dt, 5 * dt);
    if (f.recoil) f.recoil = Math.max(0, f.recoil - dt);
    if (d < f.r + p.r * 0.85 - 2) hurt(f.type === 'brute' || f.boss ? 2 : 1, f.x, f.y);
  }
  foes = foes.filter((f) => !f.dead); shots = shots.filter((s) => !s.dead); eshots = eshots.filter((s) => !s.dead);
  // botín
  for (const d of drops) {
    d.t -= dt; const dd = Math.hypot(p.x - d.x, p.y - d.y) || 1;
    if (dd < 80 || cleared) { const v = cleared ? 420 : 280; d.x += (p.x - d.x) / dd * v * dt; d.y += (p.y - d.y) / dd * v * dt; }
    if (dd < 19) { d.got = true; if (d.k === 'coin') { score += d.v; k.sfx('coin'); k.float(`+${d.v}`, d.x, d.y - 10, '#ffc928'); } else { p.hp = Math.min(p.max, p.hp + 1); k.sfx('pop'); k.float('+1', d.x, d.y - 10, '#ff5f7a'); } }
  }
  drops = drops.filter((d) => !d.got && (d.t > 0 || cleared));
  // sala superada
  if (!cleared && !foes.length && !pend.length && quota <= 0) { cleared = true; clearT = 0; score += 50 * room; k.sfx('win'); if (TH.door) { door = true; msg = 'Sala despejada: sal por la puerta'; msgT = 2; } else { msg = `¡${TH.label} superada!`; msgT = 1.4; } }
  if (cleared) { clearT += dt; if (!TH.door && clearT > 1.2 && !drops.length) openChoice(); }
  if (door && p.x > X1 - 20 && Math.abs(p.y - H / 2) < 34) openChoice();
}, draw);

/* ---------- Escenario ilustrado (todo lo estático se cachea; en el bucle solo drawImage) ---------- */
const CV = (w, h) => { const q = document.createElement('canvas'); q.width = Math.max(1, Math.ceil(w)); q.height = Math.max(1, Math.ceil(h)); return q; };
const _hx = (h) => { if (h[0] !== '#') { const m = h.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; } h = h.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _rgb = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
const LT = (col, f) => _rgb(_hx(col).map((v) => v + (255 - v) * f));
const DK = (col, f) => _rgb(_hx(col).map((v) => v * (1 - f)));
const MXC = (a, b, u) => { const x = _hx(a), y = _hx(b); return _rgb(x.map((v, i) => v + (y[i] - v) * u)); };
const AL = (col, a) => { const q = _hx(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
const seeded = (s) => { let sd = (Math.floor(Math.abs(s) * 2147483646) % 2147483646) + 1; return () => (sd = (sd * 16807) % 2147483647) / 2147483647; };
const LPOS = []; if (TH.light) for (let x = 190; x < W - 120; x += 130) LPOS.push(x);
const LCOL = TH.light === 'candle' ? '#c9a8ff' : TH.light === 'lamp' ? '#ffd66e' : TH.light === 'lantern' ? '#ffb45a' : '#ffa64d';
const MOSS = MXC('#6f8f3e', TH.f1, 0.34), DAMP = !!TH.grout && !TH.grass && !TH.dirt && !TH.plank && (TH.light === 'torch' || TH.light === 'candle');

/* --- suelos por material --- */
function stoneFloor(g, r) {
  const grout = TH.grout || DK(TH.f2, 0.4);
  g.fillStyle = grout; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  for (let y = Y0, j = 0; y < Y1; y += 32, j++) for (let x = X0, i = 0; x < X1; x += 32, i++) {
    const tw = Math.min(32, X1 - x), th = Math.min(32, Y1 - y); if (tw < 6 || th < 6) continue;
    const px = x + 1.6, py = y + 1.6, pw = tw - 3.2, ph = th - 3.2;
    const odd = r() < 0.07, sunk = !odd && r() < 0.06;
    let base = MXC((i + j) % 2 ? TH.f1 : TH.f2, r() < 0.5 ? '#ffffff' : '#000000', 0.03 + r() * 0.15);
    if (odd) base = MXC(base, r() < 0.5 ? grout : LT(TH.f1, 0.22), 0.4 + r() * 0.35);
    if (sunk) base = DK(base, 0.16);
    g.save(); ART.rr(g, px, py, pw, ph, 2.6); g.clip();
    g.fillStyle = base; g.fillRect(px, py, pw, ph);
    // bisel: luz arriba-izquierda, sombra abajo-derecha (invertido si la losa está hundida)
    if (sunk) {
      g.fillStyle = AL('#000000', 0.26); g.fillRect(px, py, pw, 3); g.fillRect(px, py, 3, ph);
      g.fillStyle = AL('#ffffff', 0.07); g.fillRect(px, py + ph - 2.2, pw, 2.2); g.fillRect(px + pw - 2.2, py, 2.2, ph);
    } else {
      g.fillStyle = AL('#ffffff', 0.085); g.fillRect(px, py, pw, 2.4);
      g.fillStyle = AL('#ffffff', 0.05); g.fillRect(px, py, 2.4, ph);
      g.fillStyle = AL('#000000', 0.2); g.fillRect(px, py + ph - 2.6, pw, 2.6);
      g.fillStyle = AL('#000000', 0.13); g.fillRect(px + pw - 2.4, py, 2.4, ph);
    }
    // desgaste con ruido
    for (let q = 0, n = 4 + (r() * 5 | 0); q < n; q++) {
      const bx = px + r() * pw, by = py + r() * ph, rr0 = 0.7 + r() * 2.8;
      g.fillStyle = r() < 0.55 ? AL('#000000', 0.04 + r() * 0.07) : AL('#ffffff', 0.03 + r() * 0.05);
      g.beginPath(); g.ellipse(bx, by, rr0, rr0 * (0.45 + r() * 0.6), r() * 3, 0, R2); g.fill();
    }
    // esquina desconchada
    if (r() < 0.28) {
      const ex = r() < 0.5 ? px : px + pw, ey = r() < 0.5 ? py : py + ph, s1 = ex === px ? 1 : -1, s2 = ey === py ? 1 : -1, d = 3 + r() * 5;
      g.fillStyle = AL(grout, 0.92); g.beginPath(); g.moveTo(ex, ey + s2 * d); g.lineTo(ex + s1 * d * 0.6, ey + s2 * d * 0.5); g.lineTo(ex + s1 * d, ey); g.lineTo(ex, ey); g.closePath(); g.fill();
    }
    // grietas (con filo claro al lado, da relieve)
    if (r() < 0.18) {
      let cx = px + 3 + r() * (pw - 6), cy = py + 1; g.beginPath(); g.moveTo(cx, cy);
      for (let q = 0, n = 3 + (r() * 3 | 0); q < n; q++) { cx += (r() - 0.5) * 9; cy += 4 + r() * 7; g.lineTo(cx, cy); }
      g.lineWidth = 1.3; g.strokeStyle = AL('#000000', 0.32); g.stroke();
      g.save(); g.translate(-0.9, -0.9); g.lineWidth = 1; g.strokeStyle = AL('#ffffff', 0.07); g.stroke(); g.restore();
    }
    // musgo: más en las juntas junto a los muros
    const border = x < X0 + 36 || x + 32 > X1 - 36 || y < Y0 + 36 || y + 32 > Y1 - 36;
    if (DAMP && r() < (border ? 0.45 : 0.12)) {
      const mx = px + r() * pw, my = py + r() * ph;
      for (let q = 0, n = 5 + (r() * 6 | 0); q < n; q++) { g.fillStyle = AL(r() < 0.5 ? MOSS : DK(MOSS, 0.3), 0.1 + r() * 0.22); g.beginPath(); g.ellipse(mx + (r() - 0.5) * 16, my + (r() - 0.5) * 12, 1.4 + r() * 3, 1 + r() * 2, r() * 3, 0, R2); g.fill(); }
    }
    g.restore();
  }
  // grietas largas que cruzan varias losas (fuera del recorte por losa)
  for (let n = 0, m = 2 + (r() * 2 | 0); n < m; n++) {
    let cx = X0 + 20 + r() * (X1 - X0 - 40), cy = Y0 + 10 + r() * (Y1 - Y0 - 60);
    const dx = (r() - 0.5) * 1.4, seg = 5 + (r() * 4 | 0);
    g.beginPath(); g.moveTo(cx, cy);
    for (let q = 0; q < seg; q++) { cx += dx * 18 + (r() - 0.5) * 16; cy += 16 + r() * 20; g.lineTo(cx, cy); }
    g.lineWidth = 1.6; g.strokeStyle = AL('#000000', 0.3); g.stroke();
    g.save(); g.translate(-1.1, -1.1); g.lineWidth = 1; g.strokeStyle = AL('#ffffff', 0.07); g.stroke(); g.restore();
  }
  // charcos (cruzan las juntas, por eso van fuera del recorte)
  if (DAMP) for (let n = 0, m = 3 + (r() * 3 | 0); n < m; n++) {
    const bx = X0 + 24 + r() * (X1 - X0 - 48), by = Y0 + 24 + r() * (Y1 - Y0 - 48), rw = 7 + r() * 12, rh = rw * (0.42 + r() * 0.22), rot = (r() - 0.5) * 1.2;
    g.fillStyle = AL('#000000', 0.3); g.beginPath(); g.ellipse(bx, by, rw, rh, rot, 0, R2); g.fill();
    g.fillStyle = AL(LT(TH.top, 0.1), 0.17); g.beginPath(); g.ellipse(bx - rw * 0.18, by - rh * 0.2, rw * 0.62, rh * 0.5, rot, 0, R2); g.fill();
    g.strokeStyle = AL('#ffffff', 0.14); g.lineWidth = 1; g.beginPath(); g.ellipse(bx, by, rw, rh, rot, 3.5, 5.6); g.stroke();
  }
}
function grassFloor(g, r) {
  g.fillStyle = TH.f2; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  for (let n = 0; n < 90; n++) { const bx = X0 + r() * (X1 - X0), by = Y0 + r() * (Y1 - Y0), rw = 14 + r() * 32; g.fillStyle = r() < 0.5 ? AL(TH.f1, 0.38) : AL(LT(TH.f1, 0.14), 0.22); g.beginPath(); g.ellipse(bx, by, rw, rw * (0.45 + r() * 0.45), r() * 3, 0, R2); g.fill(); }
  for (let n = 0; n < 10; n++) { const bx = X0 + r() * (X1 - X0), by = Y0 + r() * (Y1 - Y0), rw = 10 + r() * 20; g.fillStyle = AL('#7a6440', 0.12 + r() * 0.1); g.beginPath(); g.ellipse(bx, by, rw, rw * 0.6, r() * 3, 0, R2); g.fill(); }
  for (let n = 0; n < 900; n++) {
    const bx = X0 + 2 + r() * (X1 - X0 - 4), by = Y0 + 4 + r() * (Y1 - Y0 - 6), h = 4 + r() * 5, lean = (r() - 0.5) * 5;
    g.strokeStyle = r() < 0.5 ? AL('#ffffff', 0.12 + r() * 0.12) : AL('#000000', 0.1 + r() * 0.12); g.lineWidth = 1.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + lean * 0.4, by - h * 0.6, bx + lean, by - h); g.stroke();
  }
  g.lineCap = 'butt';
  for (let n = 0; n < 9; n++) {
    const fx = X0 + 24 + r() * (X1 - X0 - 48), fy = Y0 + 24 + r() * (Y1 - Y0 - 48);
    g.fillStyle = AL('#000000', 0.16); g.beginPath(); g.ellipse(fx, fy + 4, 5, 2.2, 0, 0, R2); g.fill();
    for (let q = 0; q < 5; q++) { const a = q * 1.26 + r() * 0.2; g.beginPath(); g.arc(fx + Math.cos(a) * 3.2, fy + Math.sin(a) * 3.2, 2.3, 0, R2); ART.fillOut(g, M === 'tank' ? '#f2ead0' : '#ffffff', 1.2); }
    g.beginPath(); g.arc(fx, fy, 2.1, 0, R2); ART.fillOut(g, '#ffd23d', 1.2);
  }
}
function dirtFloor(g, r) {
  g.fillStyle = TH.f2; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  for (let n = 0; n < 130; n++) { const bx = X0 + r() * (X1 - X0), by = Y0 + r() * (Y1 - Y0), rw = 9 + r() * 20; g.fillStyle = r() < 0.5 ? AL(TH.f1, 0.3) : AL(DK(TH.f2, 0.14), 0.2); g.beginPath(); g.ellipse(bx, by, rw, rw * (0.4 + r() * 0.4), r() * 3, 0, R2); g.fill(); }
  for (let n = 0; n < 2; n++) { // rodadas de carro
    let bx = X0 + 40 + r() * (X1 - X0 - 80), by = Y0 + 6; g.beginPath(); g.moveTo(bx, by);
    for (let q = 0; q < 8; q++) { bx += (r() - 0.5) * 14; by += (Y1 - Y0) / 8; g.lineTo(bx, by); }
    g.strokeStyle = AL('#000000', 0.05); g.lineWidth = 9; g.stroke(); g.strokeStyle = AL('#000000', 0.05); g.lineWidth = 2.5; g.stroke();
  }
  for (let n = 0; n < 150; n++) { // guijarros con dos tonos
    const bx = X0 + 4 + r() * (X1 - X0 - 8), by = Y0 + 4 + r() * (Y1 - Y0 - 8), rw = 1.2 + r() * 2.6;
    g.fillStyle = AL('#000000', 0.2); g.beginPath(); g.ellipse(bx + 0.8, by + 1, rw, rw * 0.72, 0, 0, R2); g.fill();
    g.fillStyle = AL(r() < 0.5 ? '#cdbb96' : '#9f8c6c', 0.55); g.beginPath(); g.ellipse(bx, by, rw, rw * 0.72, 0, 0, R2); g.fill();
    g.fillStyle = AL('#ffffff', 0.22); g.beginPath(); g.ellipse(bx - rw * 0.3, by - rw * 0.3, rw * 0.4, rw * 0.28, -0.5, 0, R2); g.fill();
  }
  for (let n = 0; n < 26; n++) { // grietas de tierra seca y matojos
    const bx = X0 + 10 + r() * (X1 - X0 - 20), by = Y0 + 10 + r() * (Y1 - Y0 - 20);
    if (r() < 0.45) { let cx = bx, cy = by; g.beginPath(); g.moveTo(cx, cy); for (let q = 0; q < 4; q++) { cx += (r() - 0.5) * 16; cy += (r() - 0.5) * 16; g.lineTo(cx, cy); } g.strokeStyle = AL('#000000', 0.18); g.lineWidth = 1.2; g.stroke(); }
    else for (let q = 0; q < 5; q++) { g.strokeStyle = AL(q % 2 ? '#7d8a4a' : '#5d6a34', 0.5); g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx + q, by); g.lineTo(bx + q * 1.4 - 3 + r() * 2, by - 4 - r() * 4); g.stroke(); }
  }
  g.lineCap = 'butt';
}
function plankFloor(g, r) {
  for (let y = Y0, row = 0; y < Y1; y += 16, row++) {
    let x = X0 - (row % 3) * 40;
    while (x < X1) {
      const len = 80 + Math.floor(r() * 4) * 20, base = MXC(r() < 0.5 ? TH.f1 : TH.f2, r() < 0.5 ? '#ffffff' : '#000000', r() * 0.1);
      g.save(); g.beginPath(); g.rect(Math.max(X0, x), y, Math.min(len, X1 - Math.max(X0, x)), Math.min(16, Y1 - y)); g.clip();
      g.fillStyle = base; g.fillRect(x, y, len, 16);
      g.fillStyle = AL('#ffffff', 0.09); g.fillRect(x, y + 1, len, 2); // canto iluminado
      g.fillStyle = AL('#000000', 0.22); g.fillRect(x, y + 13.5, len, 2.5); // junta en sombra
      g.fillStyle = TH.grout; g.fillRect(x + len - 2, y, 2, 16);
      for (let q = 0; q < 5; q++) { // veta
        const vy = y + 3 + r() * 10; g.strokeStyle = r() < 0.5 ? AL('#000000', 0.09 + r() * 0.08) : AL('#ffffff', 0.05);
        g.lineWidth = 0.9; g.beginPath(); g.moveTo(x + 2, vy);
        for (let s = x + 2; s < x + len; s += 18) g.quadraticCurveTo(s + 9, vy + (r() - 0.5) * 2.6, s + 18, vy + (r() - 0.5) * 1.6);
        g.stroke();
      }
      if (r() < 0.45) { const nx = x + 14 + r() * (len - 28), ny = y + 4 + r() * 8; g.fillStyle = AL('#000000', 0.22); g.beginPath(); g.ellipse(nx, ny, 2.6, 1.8, 0.4, 0, R2); g.fill(); g.strokeStyle = AL('#000000', 0.14); g.lineWidth = 0.9; g.beginPath(); g.ellipse(nx, ny, 4.4, 3, 0.4, 0, R2); g.stroke(); }
      g.restore();
      for (const nx of [x + 4, x + len - 6]) { g.fillStyle = AL('#000000', 0.3); g.beginPath(); g.arc(nx, y + 8.4, 1.5, 0, R2); g.fill(); g.fillStyle = AL('#ffffff', 0.32); g.beginPath(); g.arc(nx - 0.4, y + 7.8, 0.8, 0, R2); g.fill(); }
      x += len;
    }
  }
}
/* charcos de luz de las antorchas y oclusión de los muros, horneados en el suelo */
function bakeLight(g) {
  g.save(); g.beginPath(); g.rect(X0, Y0, X1 - X0, Y1 - Y0); g.clip();
  if (LPOS.length) {
    g.globalCompositeOperation = 'lighter';
    for (const x of LPOS) { const gr = g.createRadialGradient(x, Y0 + 2, 4, x, Y0 + 2, 165); gr.addColorStop(0, AL(LCOL, 0.24)); gr.addColorStop(0.4, AL(LCOL, 0.1)); gr.addColorStop(1, AL(LCOL, 0)); g.fillStyle = gr; g.fillRect(x - 165, Y0 - 20, 330, 340); }
    g.globalCompositeOperation = 'source-over';
  }
  const dark = DAMP ? '6,4,16' : '10,8,20';
  const fw = X1 - X0, fh = Y1 - Y0, D = 26;
  let gr = g.createLinearGradient(X0, 0, X0 + D, 0); gr.addColorStop(0, `rgba(${dark},.4)`); gr.addColorStop(1, `rgba(${dark},0)`); g.fillStyle = gr; g.fillRect(X0, Y0, D, fh);
  gr = g.createLinearGradient(X1, 0, X1 - D, 0); gr.addColorStop(0, `rgba(${dark},.4)`); gr.addColorStop(1, `rgba(${dark},0)`); g.fillStyle = gr; g.fillRect(X1 - D, Y0, D, fh);
  gr = g.createLinearGradient(0, Y1, 0, Y1 - D); gr.addColorStop(0, `rgba(${dark},.4)`); gr.addColorStop(1, `rgba(${dark},0)`); g.fillStyle = gr; g.fillRect(X0, Y1 - D, fw, D);
  g.restore();
}
function wallTop(g, r) {
  // sombra proyectada del muro sobre el suelo
  const sh = g.createLinearGradient(0, Y0, 0, Y0 + 24); sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(X0, Y0, X1 - X0, 24);
  const face = TH.face, fg = g.createLinearGradient(0, 10, 0, Y0); fg.addColorStop(0, LT(face, 0.1)); fg.addColorStop(1, DK(face, 0.25));
  g.fillStyle = fg; g.fillRect(0, 8, W, Y0 - 8);
  g.save(); g.beginPath(); g.rect(0, 10, W, Y0 - 10); g.clip();
  if (TH.wall === 'brick') {
    g.fillStyle = DK(face, 0.4); g.fillRect(0, 10, W, Y0 - 10);
    for (let y = 10, row = 0; y < Y0; y += 9, row++) for (let x = -((row % 2) * 12); x < W; x += 24) {
      const tone = MXC(face, r() < 0.5 ? '#ffffff' : '#000000', r() * 0.16);
      g.fillStyle = tone; g.fillRect(x + 1.2, y + 1.2, 21.6, 6.6);
      g.fillStyle = AL('#ffffff', 0.14); g.fillRect(x + 1.2, y + 1.2, 21.6, 1.3);
      g.fillStyle = AL('#000000', 0.26); g.fillRect(x + 1.2, y + 6.6, 21.6, 1.2);
      if (r() < 0.35) { g.fillStyle = AL('#000000', 0.16); g.beginPath(); g.ellipse(x + 3 + r() * 18, y + 3 + r() * 4, 1.4 + r(), 1 + r() * 0.6, 0, 0, R2); g.fill(); }
      if (DAMP && r() < 0.1) { g.fillStyle = AL(MOSS, 0.18 + r() * 0.16); g.fillRect(x + 1.2, y + 5.5, 21.6, 2.3); }
    }
  } else if (TH.wall === 'fence') {
    g.fillStyle = DK(face, 0.45); g.fillRect(0, 10, W, Y0 - 10);
    for (let x = 0; x < W; x += 16) { const tone = MXC(face, r() < 0.5 ? '#ffffff' : '#000000', r() * 0.16); g.fillStyle = tone; g.fillRect(x + 1, 11, 14, Y0 - 12); g.fillStyle = AL('#ffffff', 0.16); g.fillRect(x + 1, 11, 2, Y0 - 12); g.fillStyle = AL('#000000', 0.3); g.fillRect(x + 12, 11, 3, Y0 - 12); for (let q = 0; q < 3; q++) { g.strokeStyle = AL('#000000', 0.1); g.lineWidth = 0.9; g.beginPath(); g.moveTo(x + 3 + q * 4, 11); g.lineTo(x + 3 + q * 4 + (r() - 0.5) * 3, Y0); g.stroke(); } }
    g.fillStyle = AL('#000000', 0.3); g.fillRect(0, 16, W, 3); g.fillRect(0, Y0 - 9, W, 3);
    g.fillStyle = AL(LT(face, 0.2), 0.7); g.fillRect(0, 15, W, 2); g.fillRect(0, Y0 - 10, W, 2);
  } else if (TH.wall === 'panel') {
    for (let x = 0; x < W; x += 48) {
      const tone = MXC(face, r() < 0.5 ? '#ffffff' : '#000000', r() * 0.12); g.fillStyle = tone; g.fillRect(x, 10, 48, Y0 - 10);
      g.strokeStyle = AL('#000000', 0.35); g.lineWidth = 2; g.strokeRect(x + 6, 14, 36, Y0 - 20);
      g.strokeStyle = AL('#ffffff', 0.14); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + 7, Y0 - 7); g.lineTo(x + 7, 15); g.lineTo(x + 41, 15); g.stroke();
      g.fillStyle = AL('#000000', 0.28); g.fillRect(x + 46, 10, 2.5, Y0 - 10);
      for (const [rx, ry] of [[x + 3, 14], [x + 45, 14], [x + 3, Y0 - 5], [x + 45, Y0 - 5]]) { g.fillStyle = AL('#000000', 0.4); g.beginPath(); g.arc(rx, ry, 1.6, 0, R2); g.fill(); g.fillStyle = AL('#ffffff', 0.3); g.beginPath(); g.arc(rx - 0.4, ry - 0.5, 0.8, 0, R2); g.fill(); }
    }
  } else if (TH.wall === 'stone') {
    g.fillStyle = DK(face, 0.35); g.fillRect(0, 10, W, Y0 - 10);
    for (let x = 0, n = 0; x < W; x += 28 + (n++ % 3) * 6) { const bw2 = 26 + (n % 3) * 6, tone = MXC(face, r() < 0.5 ? '#ffffff' : '#000000', r() * 0.16); ART.rr(g, x + 1.5, 11.5, bw2, Y0 - 14, 4); g.fillStyle = tone; g.fill(); g.fillStyle = AL('#ffffff', 0.14); g.fillRect(x + 3, 12.5, bw2 - 3, 1.6); g.fillStyle = AL('#000000', 0.24); g.fillRect(x + 3, Y0 - 5, bw2 - 3, 2); }
  } else if (TH.wall === 'sand') {
    for (let row = 0; row < 3; row++) for (let x = (row % 2) * 13 - 13; x < W; x += 26) { g.beginPath(); g.ellipse(x + 13, 14 + row * 9, 13, 6, 0, 0, R2); const tone = MXC(row % 2 ? '#c8bc8e' : '#d6cc9f', r() < 0.5 ? '#ffffff' : '#000000', r() * 0.12); g.fillStyle = tone; g.fill(); g.strokeStyle = AL('#000000', 0.28); g.lineWidth = 2; g.stroke(); g.fillStyle = AL('#ffffff', 0.2); g.beginPath(); g.ellipse(x + 11, 12 + row * 9, 7, 2.4, -0.2, 0, R2); g.fill(); }
  }
  g.restore();
  // canto superior (grosor del muro visto desde arriba)
  const cg = g.createLinearGradient(0, 0, 0, 11); cg.addColorStop(0, LT(TH.top, 0.2)); cg.addColorStop(1, DK(TH.top, 0.1));
  g.fillStyle = cg; g.fillRect(0, 0, W, 11);
  for (let x = 0; x < W; x += 34) { g.fillStyle = AL('#000000', 0.14); g.fillRect(x, 0, 1.6, 11); g.fillStyle = AL('#ffffff', 0.08); g.fillRect(x + 1.6, 0, 1.2, 11); }
  g.fillStyle = AL('#ffffff', 0.26); g.fillRect(0, 8.6, W, 1.8);
  g.fillStyle = AL('#000000', 0.3); g.fillRect(0, 10.4, W, 3);
}
function wallSides(g, r) {
  const strips = [[0, Y0, X0, H - Y0], [X1, Y0, W - X1, H - Y0], [0, Y1, W, H - Y1]];
  for (const [sx, sy, sw, shh] of strips) {
    g.fillStyle = TH.top; g.fillRect(sx, sy, sw, shh);
    const stp = 26;
    for (let y = sy; y < sy + shh; y += stp) for (let x = sx; x < sx + sw; x += stp) {
      const tone = MXC(TH.top, r() < 0.5 ? '#ffffff' : '#000000', r() * 0.13);
      g.fillStyle = tone; g.fillRect(x + 1, y + 1, Math.min(stp - 2, sx + sw - x - 2), Math.min(stp - 2, sy + shh - y - 2));
      g.fillStyle = AL('#ffffff', 0.12); g.fillRect(x + 1, y + 1, Math.min(stp - 2, sx + sw - x - 2), 1.4);
      g.fillStyle = AL('#000000', 0.2); g.fillRect(x + 1, y + stp - 2.4, Math.min(stp - 2, sx + sw - x - 2), 1.6);
      if (r() < 0.3) { g.fillStyle = AL('#000000', 0.12); g.beginPath(); g.ellipse(x + 4 + r() * 18, y + 4 + r() * 18, 1.4 + r() * 2, 1 + r() * 1.4, 0, 0, R2); g.fill(); }
    }
  }
  // arista interior: luz arriba-izquierda, sombra abajo-derecha
  g.fillStyle = AL('#ffffff', 0.1); g.fillRect(X0 - 3, Y0 - 3, X1 - X0 + 6, 2);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(X0 - 3.5, Y0, 3.5, Y1 - Y0); g.fillRect(X1, Y0, 3.5, Y1 - Y0); g.fillRect(X0, Y1, X1 - X0, 3.5);
  g.strokeStyle = OUT; g.lineWidth = 3; g.strokeRect(X0 - 1.5, Y0 - 1.5, X1 - X0 + 3, Y1 - Y0 + 3); g.strokeRect(1.5, 1.5, W - 3, H - 3);
}
function renderFloor() {
  const cv = CV(W * 2, H * 2), g = cv.getContext('2d'); g.scale(2, 2);
  const r = seeded((room * 7919 + 13) % 99991 / 99991 + 1e-4);
  g.fillStyle = TH.edge; g.fillRect(0, 0, W, H);
  if (TH.plank) plankFloor(g, r); else if (TH.grass) grassFloor(g, r); else if (TH.dirt) dirtFloor(g, r); else stoneFloor(g, r);
  bakeLight(g);
  wallTop(g, r); wallSides(g, r);
  return cv;
}
function renderVig() {
  const cv = CV(W, H), g = cv.getContext('2d');
  const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
  gr.addColorStop(0, 'rgba(10,6,20,0)'); gr.addColorStop(0.55, `rgba(10,6,20,${(TH.vig * 0.3).toFixed(3)})`); gr.addColorStop(1, `rgba(10,6,20,${TH.vig})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (const [cx, cy] of [[X0, Y0], [X1, Y0], [X0, Y1], [X1, Y1]]) { // penumbra en las esquinas de la sala
    const cg = g.createRadialGradient(cx, cy, 6, cx, cy, 140); cg.addColorStop(0, `rgba(6,4,14,${(TH.vig * 0.55).toFixed(3)})`); cg.addColorStop(1, 'rgba(6,4,14,0)');
    g.fillStyle = cg; g.fillRect(cx - 140, cy - 140, 280, 280);
  }
  return cv;
}
/* halo cacheado de las luces: en el bucle solo drawImage con alfa */
let glowCv = null, softCv = null;
function glowSprite() {
  const S = 72, q = CV(S, S), g = q.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, AL(LCOL, 0.5)); gr.addColorStop(0.3, AL(LCOL, 0.2)); gr.addColorStop(0.62, AL(LCOL, 0.055)); gr.addColorStop(1, AL(LCOL, 0));
  g.fillStyle = gr; g.fillRect(0, 0, S, S); return q;
}
let fixCv = null;
const FL1 = AL('#ff5a1e', 0.8), FL2 = AL('#c9a8ff', 0.85);
function fixSprite() { // parte fija de la luminaria (lo único que se anima es la llama)
  const FW = 36, FH2 = 42, q = CV(FW * 2, FH2 * 2), g = q.getContext('2d'); g.scale(2, 2); g.translate(FW / 2, 0);
  if (TH.light === 'torch') {
    g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, -4, 17, 9, 15, 3); g.fill();
    ART.rr(g, -3.4, 13, 6.8, 17, 2.4); ART.fillOut(g, '#6b4329', 2);
    g.fillStyle = AL('#ffffff', 0.22); g.fillRect(-2.6, 14, 2, 14);
    ART.rr(g, -6, 11, 12, 5, 2); ART.fillOut(g, '#4a4a58', 2); g.fillStyle = AL('#ffffff', 0.3); g.fillRect(-4.5, 11.8, 9, 1.4);
  } else if (TH.light === 'candle') {
    for (const o of [-6, 5]) { const yy = 20 + (o > 0 ? 3 : 0); g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, o - 2, yy + 1, 6, 12, 2); g.fill(); ART.rr(g, o - 2.5, yy, 5, 12, 1.5); ART.fillOut(g, '#efe6d0', 1.5); g.fillStyle = AL('#000000', 0.16); g.fillRect(o + 0.8, yy, 1.7, 12); }
  } else if (TH.light === 'lantern') {
    g.strokeStyle = OUT; g.lineWidth = 1.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 12); g.stroke();
    ART.rr(g, -8, 12, 16, 20, 7); ART.fillOut(g, '#e0463c', 2);
    g.fillStyle = AL('#ffffff', 0.25); ART.rr(g, -6, 14, 3.4, 15, 2); g.fill();
    g.fillStyle = AL('#000000', 0.22); ART.rr(g, 3, 14, 3.4, 15, 2); g.fill();
  } else if (TH.light === 'lamp') {
    ART.rr(g, -7.5, 11, 15, 13, 3.5); ART.fillOut(g, '#3a3a46', 2);
    g.fillStyle = AL('#ffffff', 0.25); g.fillRect(-6, 12, 12, 1.8);
  }
  return q;
}
function lights() {
  if (!TH.light) return;
  if (!glowCv) { glowCv = glowSprite(); fixCv = fixSprite(); }
  for (const x of LPOS) { const fl = 0.86 + Math.sin(t * 13 + x) * 0.08 + Math.sin(t * 7.3 + x * 2) * 0.07; c.globalAlpha = 0.7 * fl * fl; c.drawImage(glowCv, x - 36, Y0 - 34); }
  c.globalAlpha = 1;
  for (const x of LPOS) {
    const fl = 0.86 + Math.sin(t * 13 + x) * 0.08 + Math.sin(t * 7.3 + x * 2) * 0.07;
    c.drawImage(fixCv, x - 18, 0, 36, 42);
    if (TH.light === 'torch') {
      c.fillStyle = FL1; c.beginPath(); c.ellipse(x, 9, 6 * fl, 10 * fl, 0, 0, R2); c.fill();
      c.fillStyle = '#ff9a2d'; c.beginPath(); c.ellipse(x + Math.sin(t * 9) * 0.8, 10, 4 * fl, 7.4 * fl, 0, 0, R2); c.fill();
      c.fillStyle = '#ffe07a'; c.beginPath(); c.ellipse(x + Math.sin(t * 11) * 0.6, 11.4, 2.2, 4.4 * fl, 0, 0, R2); c.fill();
    } else if (TH.light === 'candle') {
      for (const o of [-6, 5]) { const yy = 20 + (o > 0 ? 3 : 0); c.fillStyle = FL2; c.beginPath(); c.ellipse(x + o, yy - 4, 3, 5.4 * fl, 0, 0, R2); c.fill(); c.fillStyle = '#efe0ff'; c.beginPath(); c.ellipse(x + o, yy - 3, 1.4, 3 * fl, 0, 0, R2); c.fill(); }
    } else if (TH.light === 'lantern') { c.fillStyle = `rgba(255,220,120,${0.35 + 0.35 * fl})`; c.fillRect(x - 3, 15, 6, 14); c.fillStyle = 'rgba(255,243,192,.8)'; c.fillRect(x - 1.4, 17, 2.8, 8); }
    else if (TH.light === 'lamp') { c.fillStyle = `rgba(255,214,110,${0.45 + 0.4 * fl})`; ART.rr(c, x - 4.5, 15, 9, 7, 2); c.fill(); c.fillStyle = 'rgba(255,244,204,.85)'; ART.rr(c, x - 2.6, 16, 5.2, 4, 1.5); c.fill(); }
  }
}
function drawDoor() {
  if (!TH.door) return;
  const y = H / 2 - 30;
  c.fillStyle = door ? '#0d0a18' : TH.face; c.fillRect(X1 - 2, y, W - X1 + 2, 60);
  if (door) { c.fillStyle = 'rgba(255,190,90,.14)'; c.fillRect(X1 - 26, y + 4, 26, 52); }
  c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(X1 - 2, y, W - X1 + 2, 60);
  if (!door) { for (let i = 0; i < 4; i++) { ART.rr(c, X1 + 1, y + 6 + i * 14, W - X1 - 4, 5, 2); ART.fillOut(c, '#b5ab96', 1.5); c.fillStyle = AL('#ffffff', 0.3); c.fillRect(X1 + 2, y + 6.6 + i * 14, W - X1 - 6, 1.4); } }
  else { const a = 0.5 + Math.sin(t * 5) * 0.3; c.fillStyle = `rgba(255,201,40,${a})`; c.beginPath(); c.moveTo(X1 - 34, H / 2 - 10); c.lineTo(X1 - 20, H / 2); c.lineTo(X1 - 34, H / 2 + 10); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); }
}

/* ---------- Obstáculos: sprite cacheado por obstáculo + sombra proyectada ---------- */
const BP = 14, BT = 18;
function variantOf(w) {
  const s = TH.block, sq = w.w <= 60 && Math.abs(w.w - w.h) <= 22, v = w.seed;
  if (s === 'rock' || s === 'sand' || s === 'steel') return s;
  if (s === 'tomb') return v < 0.62 ? 'tomb' : 'stone';
  if (s === 'crate') return sq ? (v < 0.44 ? 'crate' : v < 0.74 ? 'barrel' : 'sack') : (v < 0.72 ? 'crate' : 'sack');
  return sq ? (v < 0.5 ? 'stone' : v < 0.72 ? 'crate' : v < 0.88 ? 'barrel' : 'sack') : 'stone';
}
function rim(g, x, y, w2, h2, rd) { // luz de borde arriba-izquierda + filo frío abajo-derecha
  g.lineWidth = 2; g.strokeStyle = AL('#ffffff', 0.3); g.beginPath(); g.moveTo(x + 2, y + h2 * 0.55); g.lineTo(x + 2, y + rd); g.quadraticCurveTo(x + 2, y + 2, x + rd, y + 2); g.lineTo(x + w2 * 0.6, y + 2); g.stroke();
  g.strokeStyle = AL('#4a3f7a', 0.4); g.beginPath(); g.moveTo(x + w2 - 2, y + h2 * 0.45); g.lineTo(x + w2 - 2, y + h2 - rd); g.quadraticCurveTo(x + w2 - 2, y + h2 - 2, x + w2 - rd, y + h2 - 2); g.lineTo(x + w2 * 0.45, y + h2 - 2); g.stroke();
}
function sStone(g, bw, bh, fl, r) {
  const FH = 11, face = fl ? '#e9e6ff' : DK(MXC(TH.face, '#8d8474', 0.24), 0.14);
  const base = DK(MXC(MXC(TH.top, TH.face, 0.45), '#8d8474', 0.3), 0.14), top = fl ? '#ffffff' : MXC(base, r() < 0.5 ? '#ffffff' : '#000000', r() * 0.14);
  const ty = -9, th = bh - FH + 7;
  // cuerpo: canto frontal en sombra
  ART.rr(g, 0, ty + 4, bw, th + FH - 2, 5); ART.fillOut(g, face, 3);
  g.fillStyle = AL('#000000', 0.26); g.fillRect(2, bh - 5, bw - 4, 4);
  if (!fl) { // el canto también es piedra: hiladas y picado
    g.save(); ART.rr(g, 1.5, bh - FH - 1, bw - 3, FH + 1, 3); g.clip();
    for (let x2 = -8 + r() * 14; x2 < bw; x2 += 16 + r() * 16) { g.fillStyle = AL('#000000', 0.34); g.fillRect(x2, bh - FH - 2, 2.6, FH + 4); g.fillStyle = AL('#ffffff', 0.1); g.fillRect(x2 + 2.6, bh - FH - 2, 1.2, FH + 4); }
    for (let q = 0, n = 6 + (r() * 6 | 0); q < n; q++) { g.fillStyle = r() < 0.5 ? AL('#000000', 0.08 + r() * 0.1) : AL('#ffffff', 0.05 + r() * 0.07); g.beginPath(); g.ellipse(r() * bw, bh - FH + r() * FH, 1 + r() * 2.4, 0.7 + r() * 1.6, r() * 3, 0, R2); g.fill(); }
    g.restore();
  }
  // cara superior
  ART.rr(g, 0, ty, bw, th, 4.5);
  if (fl) g.fillStyle = '#ffffff'; else { const gr = g.createLinearGradient(0, ty, bw * 0.55, ty + th); gr.addColorStop(0, LT(top, 0.16)); gr.addColorStop(0.4, top); gr.addColorStop(1, DK(top, 0.28)); g.fillStyle = gr; }
  g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
  if (fl) return;
  g.save(); ART.rr(g, 1.8, ty + 1.8, bw - 3.6, th - 3.6, 3.5); g.clip();
  // sillería a soga: hiladas desplazadas, nunca una cruz centrada
  const rows = Math.max(1, Math.round(th / 19)), rh = th / rows, nom = bw / Math.max(bw >= 30 ? 2 : 1, Math.ceil(bw / 40));
  for (let j = 0; j < rows; j++) {
    const y = ty + j * rh;
    let x = j % 2 ? -nom * (0.35 + r() * 0.3) : -nom * (r() * 0.2);
    while (x < bw) {
      const cw = nom * (0.8 + r() * 0.6), xa = Math.max(0, x), xb = Math.min(bw, x + cw), aw = xb - xa;
      if (aw > 3) {
        // tono propio del sillar (variación fuerte: nunca dos iguales)
        g.fillStyle = AL(r() < 0.5 ? '#ffffff' : '#000000', 0.05 + r() * 0.17); g.fillRect(xa, y, aw, rh);
        const sg = g.createLinearGradient(0, y, 0, y + rh); sg.addColorStop(0, AL('#ffffff', 0.12)); sg.addColorStop(0.5, AL('#ffffff', 0)); sg.addColorStop(1, AL('#000000', 0.16)); g.fillStyle = sg; g.fillRect(xa, y, aw, rh);
        // junta: rehundida arriba/izquierda, filo iluminado debajo
        g.fillStyle = AL('#000000', 0.5); g.fillRect(x - 1.8, y, 3.6, rh); g.fillRect(xa, y - 1.8, aw, 3.6);
        g.fillStyle = AL('#ffffff', 0.17); g.fillRect(x + 1.7, y + 1.7, 1.4, rh - 1.7); g.fillRect(xa + 1.7, y + 1.7, aw - 1.7, 1.4);
        // mordida en una esquina del sillar
        if (r() < 0.34) { const ex = r() < 0.5 ? xa + 2 : xb - 2, ey = r() < 0.5 ? y + 2 : y + rh - 2, d = 3 + r() * 5;
          g.fillStyle = AL('#000000', 0.3); g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + (r() - 0.5) * d * 2, ey + (r() < 0.5 ? d : -d)); g.lineTo(ex + (r() < 0.5 ? d : -d), ey); g.closePath(); g.fill(); }
        // picado de la piedra
        for (let q = 0, n = 5 + (r() * 7 | 0); q < n; q++) { g.fillStyle = r() < 0.5 ? AL('#000000', 0.07 + r() * 0.11) : AL('#ffffff', 0.05 + r() * 0.08); g.beginPath(); g.ellipse(xa + r() * aw, y + r() * rh, 1 + r() * 3, 0.8 + r() * 2, r() * 3, 0, R2); g.fill(); }
      }
      x += cw;
    }
  }
  // grieta larga que cruza varias hiladas
  if (r() < 0.75) { let px = 4 + r() * (bw - 8), py = ty + 1; g.beginPath(); g.moveTo(px, py);
    for (let q = 0, n = 4 + (r() * 3 | 0); q < n; q++) { px += (r() - 0.5) * 12; py += th / 4 + r() * 6; g.lineTo(px, py); }
    g.lineWidth = 1.6; g.strokeStyle = AL('#000000', 0.42); g.stroke();
    g.save(); g.translate(-1.1, -1.1); g.lineWidth = 1; g.strokeStyle = AL('#ffffff', 0.13); g.stroke(); g.restore(); }
  // sombra interior en todo el borde de la cara superior
  g.strokeStyle = AL('#000000', 0.14); g.lineWidth = 4; ART.rr(g, 0, ty, bw, th, 4.5); g.stroke();
  // chaflán: filo de luz corto y roto arriba-izquierda (no un reflejo liso)
  g.fillStyle = AL('#ffffff', 0.17); g.fillRect(2, ty + 1, bw * (0.3 + r() * 0.25), 2); g.fillRect(1, ty + 2, 2, th * (0.45 + r() * 0.3));
  g.fillStyle = AL('#000000', 0.2); g.fillRect(0, ty + th - 3, bw, 3); g.fillRect(bw - 3, ty, 3, th);
  if (DAMP) for (let q = 0, n = 10 + (r() * 10 | 0); q < n; q++) { g.fillStyle = AL(r() < 0.5 ? MOSS : DK(MOSS, 0.35), 0.14 + r() * 0.22); g.beginPath(); g.ellipse(r() * bw, ty + th - r() * th * 0.3, 1.8 + r() * 4, 1.2 + r() * 2.4, 0, 0, R2); g.fill(); }
  g.restore();
  rim(g, 0, ty, bw, th, 4.5);
}
function sCrate(g, bw, bh, fl, r) {
  const FH = 10, wood = fl ? '#ffffff' : '#9a6134', face = fl ? '#e9e6ff' : '#6d4324';
  ART.rr(g, 0, bh - FH - 2, bw, FH + 4, 3); ART.fillOut(g, face, 2.5);
  const ty = -8, th = bh - FH + 6;
  ART.rr(g, 0, ty, bw, th, 4);
  if (fl) g.fillStyle = '#ffffff'; else { const gr = g.createLinearGradient(0, ty, bw * 0.5, ty + th); gr.addColorStop(0, LT(wood, 0.22)); gr.addColorStop(0.5, wood); gr.addColorStop(1, DK(wood, 0.22)); g.fillStyle = gr; }
  g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
  g.save(); ART.rr(g, 1.6, ty + 1.6, bw - 3.2, th - 3.2, 3); g.clip();
  if (!fl) {
    const nb = Math.max(2, Math.round(th / 11));
    for (let j = 0; j < nb; j++) { // tablas con veta
      const yy = ty + (th / nb) * j, hh = th / nb;
      g.fillStyle = MXC(wood, r() < 0.5 ? '#ffffff' : '#000000', r() * 0.12); g.fillRect(0, yy + 0.8, bw, hh - 1.6);
      g.fillStyle = AL('#ffffff', 0.13); g.fillRect(0, yy + 0.8, bw, 1.2);
      g.fillStyle = AL('#000000', 0.3); g.fillRect(0, yy + hh - 1.6, bw, 1.6);
      for (let q = 0; q < 3; q++) { const vy = yy + 2 + r() * (hh - 4); g.strokeStyle = AL('#000000', 0.1 + r() * 0.1); g.lineWidth = 0.9; g.beginPath(); g.moveTo(1, vy); for (let s = 1; s < bw; s += 14) g.quadraticCurveTo(s + 7, vy + (r() - 0.5) * 2.4, s + 14, vy + (r() - 0.5) * 1.6); g.stroke(); }
      if (r() < 0.4) { const nx = 6 + r() * (bw - 12), ny = yy + hh / 2; g.fillStyle = AL('#000000', 0.24); g.beginPath(); g.ellipse(nx, ny, 2.4, 1.7, 0.4, 0, R2); g.fill(); }
    }
    // refuerzos en aspa
    g.strokeStyle = AL('#5d3a1f', 0.85); g.lineWidth = 5; g.beginPath(); g.moveTo(3, ty + 3); g.lineTo(bw - 3, ty + th - 3); g.moveTo(bw - 3, ty + 3); g.lineTo(3, ty + th - 3); g.stroke();
    g.strokeStyle = AL('#ffffff', 0.12); g.lineWidth = 1.4; g.beginPath(); g.moveTo(3, ty + 2); g.lineTo(bw - 3, ty + th - 4); g.moveTo(bw - 3, ty + 2); g.lineTo(3, ty + th - 4); g.stroke();
  }
  g.restore();
  if (!fl) {
    // aros y cantoneras de metal
    g.strokeStyle = '#59503f'; g.lineWidth = 4; g.strokeRect(2.5, ty + 2.5, bw - 5, th - 5);
    g.strokeStyle = AL('#ffffff', 0.18); g.lineWidth = 1.2; g.strokeRect(2.5, ty + 1.8, bw - 5, th - 5);
    g.strokeStyle = OUT; g.lineWidth = 1.2; g.strokeRect(2.5, ty + 2.5, bw - 5, th - 5);
    for (const [rx, ry] of [[5, ty + 5], [bw - 5, ty + 5], [5, ty + th - 5], [bw - 5, ty + th - 5]]) { g.fillStyle = '#8b8270'; g.beginPath(); g.arc(rx, ry, 1.9, 0, R2); g.fill(); g.fillStyle = AL('#ffffff', 0.45); g.beginPath(); g.arc(rx - 0.5, ry - 0.6, 0.9, 0, R2); g.fill(); }
    rim(g, 0, ty, bw, th, 4);
  }
  // listones de la cara frontal
  g.strokeStyle = AL('#000000', 0.25); g.lineWidth = 2; for (let xx = 12; xx < bw; xx += 14) { g.beginPath(); g.moveTo(xx, bh - FH); g.lineTo(xx, bh); g.stroke(); }
}
function sBarrel(g, bw, bh, fl, r) {
  const ty = -10, th = bh + 4, wood = fl ? '#ffffff' : '#96632f', cx = bw / 2;
  ART.rr(g, 0, ty, bw, th, Math.min(bw, th) * 0.32);
  if (fl) g.fillStyle = '#ffffff'; else { const gr = g.createLinearGradient(0, 0, bw, 0); gr.addColorStop(0, DK(wood, 0.28)); gr.addColorStop(0.3, LT(wood, 0.2)); gr.addColorStop(0.62, wood); gr.addColorStop(1, DK(wood, 0.34)); g.fillStyle = gr; }
  g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
  g.save(); ART.rr(g, 1.6, ty + 1.6, bw - 3.2, th - 3.2, Math.min(bw, th) * 0.3); g.clip();
  if (!fl) {
    for (let x = 2; x < bw; x += bw / 6) { g.strokeStyle = AL('#000000', 0.22); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, ty); g.lineTo(x, ty + th); g.stroke(); g.strokeStyle = AL('#ffffff', 0.08); g.beginPath(); g.moveTo(x + 1.4, ty); g.lineTo(x + 1.4, ty + th); g.stroke(); }
    for (let q = 0; q < 10; q++) { const vy = ty + 3 + r() * (th - 6); g.strokeStyle = AL('#000000', 0.08 + r() * 0.08); g.lineWidth = 0.8; g.beginPath(); g.moveTo(2, vy); g.quadraticCurveTo(cx, vy + (r() - 0.5) * 3, bw - 2, vy); g.stroke(); }
    for (const fy of [ty + th * 0.2, ty + th * 0.76]) { // aros de metal
      g.fillStyle = AL('#000000', 0.45); g.fillRect(0, fy - 4.2, bw, 8.4);
      g.fillStyle = '#6d6350'; g.fillRect(0, fy - 3.2, bw, 6.4);
      g.fillStyle = AL('#ffffff', 0.42); g.fillRect(0, fy - 2.8, bw, 1.8);
      g.fillStyle = AL('#000000', 0.4); g.fillRect(0, fy + 1.6, bw, 1.8);
    }
  }
  g.restore();
  if (!fl) {
    // tapa vista en 3/4
    g.beginPath(); g.ellipse(cx, ty + 5, bw * 0.4, Math.max(3, th * 0.13), 0, 0, R2); const lg = g.createLinearGradient(cx - bw * 0.4, ty, cx + bw * 0.4, ty + 12); lg.addColorStop(0, LT(wood, 0.3)); lg.addColorStop(1, DK(wood, 0.12)); g.fillStyle = lg; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = AL('#000000', 0.2); g.lineWidth = 1; g.beginPath(); g.ellipse(cx, ty + 5, bw * 0.26, Math.max(2, th * 0.085), 0, 0, R2); g.stroke();
    g.strokeStyle = AL('#ffffff', 0.3); g.lineWidth = 2; g.beginPath(); g.ellipse(cx, ty + 5, bw * 0.4, Math.max(3, th * 0.13), 0, 3.5, 5.4); g.stroke();
  }
}
function sSack(g, bw, bh, fl, r) {
  const vert = bh > bw * 1.15, n = vert ? 2 : bw > 92 ? 3 : 2, put = [];
  for (let i = 0; i < n; i++) {
    if (vert) { const sw = i ? bw + 6 : bw * 0.78; put.push([(bw - sw) / 2 + (r() - 0.5) * 6, i ? bh * 0.42 - 4 : -10, sw, i ? bh * 0.62 + 6 : bh * 0.56]); }
    else put.push([(bw / n) * i - 3 + (r() - 0.5) * 3, -8 + (i % 2) * 6, bw / n + 6, bh + 6 - (i % 2) * 4]);
  }
  for (let i = 0; i < n; i++) {
    const [sx, sy, sw, sh2] = put[i], col = fl ? '#ffffff' : ['#c0a266', '#a88d57', '#cbb079'][i % 3];
    if (!fl) { g.fillStyle = AL('#000000', 0.22); g.beginPath(); g.ellipse(sx + sw / 2 + 2, sy + sh2 - 1, sw * 0.42, sh2 * 0.12, 0, 0, R2); g.fill(); }
    const cx = sx + sw / 2, cy = sy + sh2 * 0.58, rx = sw * 0.5, ry = sh2 * 0.42;
    g.beginPath(); // cuerpo: bolsa con hombros y cuello
    g.moveTo(cx - rx * 0.3, sy + sh2 * 0.14);
    g.bezierCurveTo(cx - rx, sy + sh2 * 0.22, cx - rx, cy + ry * 0.8, cx - rx * 0.45, sy + sh2 - 1);
    g.bezierCurveTo(cx - rx * 0.1, sy + sh2 + 1, cx + rx * 0.1, sy + sh2 + 1, cx + rx * 0.45, sy + sh2 - 1);
    g.bezierCurveTo(cx + rx, cy + ry * 0.8, cx + rx, sy + sh2 * 0.22, cx + rx * 0.3, sy + sh2 * 0.14);
    g.closePath();
    if (fl) g.fillStyle = '#ffffff'; else { const gr = g.createLinearGradient(cx - rx, sy, cx + rx * 0.7, sy + sh2); gr.addColorStop(0, LT(col, 0.26)); gr.addColorStop(0.5, col); gr.addColorStop(1, DK(col, 0.34)); g.fillStyle = gr; }
    g.fill(); g.lineWidth = 2.8; g.strokeStyle = OUT; g.stroke();
    if (!fl) {
      g.save(); g.clip();
      for (let q = 0; q < 4; q++) { const px = cx + (q - 1.5) * rx * 0.45; g.strokeStyle = AL('#000000', 0.15); g.lineWidth = 2.2; g.beginPath(); g.moveTo(px, sy + sh2 * 0.2); g.quadraticCurveTo(px + (r() - 0.5) * 7, cy, px + (r() - 0.5) * 5, sy + sh2); g.stroke(); g.strokeStyle = AL('#ffffff', 0.13); g.lineWidth = 1.2; g.beginPath(); g.moveTo(px - 2.2, sy + sh2 * 0.2); g.quadraticCurveTo(px - 2.2 + (r() - 0.5) * 7, cy, px - 2.2 + (r() - 0.5) * 5, sy + sh2); g.stroke(); }
      for (let q = 0; q < 26; q++) { g.fillStyle = AL(r() < 0.5 ? '#000000' : '#ffffff', 0.05 + r() * 0.05); g.fillRect(sx + r() * sw, sy + r() * sh2, 1.4, 1.4); }
      g.fillStyle = AL('#ffffff', 0.16); g.beginPath(); g.ellipse(cx - rx * 0.35, cy - ry * 0.45, rx * 0.34, ry * 0.3, -0.5, 0, R2); g.fill();
      g.restore();
    }
    // cuello atado
    const ny = sy + sh2 * 0.12;
    if (!fl) { g.fillStyle = '#8a7752'; } else g.fillStyle = '#ffffff';
    ART.rr(g, cx - rx * 0.34, ny - 4, rx * 0.68, 6, 2.4); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
    if (!fl) { g.fillStyle = AL('#ffffff', 0.3); g.fillRect(cx - rx * 0.3, ny - 3.4, rx * 0.6, 1.4); g.strokeStyle = OUT; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - rx * 0.16, ny - 4); g.lineTo(cx - rx * 0.26, ny - 8); g.moveTo(cx + rx * 0.16, ny - 4); g.lineTo(cx + rx * 0.3, ny - 7); g.stroke(); }
  }
}
function sRock(g, bw, bh, fl, r) {
  const cx = bw / 2, cy = bh / 2 - 4, rx = bw / 2, ry = bh / 2 + 3, pts = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * R2, d = 0.78 + r() * 0.26; pts.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d]); }
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= pts.length; i++) { const a = pts[i % pts.length], b = pts[(i + 1) % pts.length]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } g.closePath();
  if (fl) g.fillStyle = '#ffffff'; else { const gr = g.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.6, cy + ry); gr.addColorStop(0, '#c2bcd4'); gr.addColorStop(0.45, '#9a93ad'); gr.addColorStop(1, '#6e6885'); g.fillStyle = gr; }
  g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
  if (fl) return;
  g.save(); g.clip();
  g.fillStyle = AL('#ffffff', 0.22); g.beginPath(); g.ellipse(cx - rx * 0.28, cy - ry * 0.4, rx * 0.4, ry * 0.24, -0.4, 0, R2); g.fill();
  g.fillStyle = AL('#000000', 0.2); g.beginPath(); g.ellipse(cx + rx * 0.3, cy + ry * 0.45, rx * 0.5, ry * 0.3, 0.2, 0, R2); g.fill();
  for (let q = 0; q < 4; q++) { let px = cx + (r() - 0.5) * rx, py = cy - ry * 0.4; g.beginPath(); g.moveTo(px, py); for (let s = 0; s < 3; s++) { px += (r() - 0.5) * rx * 0.5; py += ry * 0.35; g.lineTo(px, py); } g.strokeStyle = AL('#000000', 0.2); g.lineWidth = 1.3; g.stroke(); g.save(); g.translate(-1, -1); g.strokeStyle = AL('#ffffff', 0.13); g.lineWidth = 1; g.stroke(); g.restore(); }
  for (let q = 0, n = 10; q < n; q++) { g.fillStyle = AL(q % 2 ? '#7f9b4a' : '#5c7434', 0.35); g.beginPath(); g.ellipse(cx + (r() - 0.5) * rx * 1.4, cy - ry * 0.5 + r() * ry * 0.5, 2 + r() * 4, 1.4 + r() * 2.4, 0, 0, R2); g.fill(); }
  g.restore();
}
function sTomb(g, bw, bh, fl, r) {
  sStone(g, bw, bh, fl, r);
  if (fl) return;
  const ty = -8, th = bh - 4, cx = bw / 2, cy = ty + th / 2;
  g.strokeStyle = AL('#000000', 0.3); g.lineWidth = 2; g.strokeRect(5, ty + 5, bw - 10, th - 10);
  g.strokeStyle = AL('#ffffff', 0.16); g.lineWidth = 1.2; g.strokeRect(5, ty + 4, bw - 10, th - 10);
  const ch = Math.min(26, th - 12), cw2 = Math.min(16, bw - 12);
  g.fillStyle = AL('#000000', 0.32); g.fillRect(cx - 2.4, cy - ch / 2, 4.8, ch); g.fillRect(cx - cw2 / 2, cy - ch * 0.16, cw2, 4.6);
  g.fillStyle = AL('#ffffff', 0.2); g.fillRect(cx - 3.4, cy - ch / 2, 1.4, ch); g.fillRect(cx - cw2 / 2, cy - ch * 0.16 - 1.2, cw2, 1.4);
}
function sSteel(g, bw, bh, fl, r) {
  const FH = 9;
  ART.rr(g, 0, bh - FH - 2, bw, FH + 4, 3); ART.fillOut(g, fl ? '#ffffff' : DK(TH.face, 0.12), 2.5);
  const ty = -7, th = bh - FH + 5;
  ART.rr(g, 0, ty, bw, th, 4);
  if (fl) g.fillStyle = '#ffffff'; else { const gr = g.createLinearGradient(0, ty, bw * 0.6, ty + th); gr.addColorStop(0, '#d7ddf6'); gr.addColorStop(0.42, '#aeb7dd'); gr.addColorStop(1, DK(TH.top, 0.22)); g.fillStyle = gr; }
  g.fill(); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
  if (fl) return;
  g.save(); ART.rr(g, 2, ty + 2, bw - 4, th - 4, 3); g.clip();
  g.strokeStyle = 'rgba(255,209,102,.5)'; g.lineWidth = 4;
  if (bw >= 40 || th >= 40) for (let d = -th; d < bw; d += 14) { g.beginPath(); g.moveTo(d, ty + th); g.lineTo(d + th, ty); g.stroke(); }
  g.strokeStyle = AL('#ffffff', 0.16); g.lineWidth = 1.2;
  if (bw >= 40 || th >= 40) for (let d = -th; d < bw; d += 14) { g.beginPath(); g.moveTo(d + 2, ty + th); g.lineTo(d + th + 2, ty); g.stroke(); }
  g.fillStyle = AL('#ffffff', 0.2); g.beginPath(); g.moveTo(0, ty + th * 0.2); g.lineTo(bw, ty + th * 0.05); g.lineTo(bw, ty + th * 0.2); g.lineTo(0, ty + th * 0.42); g.closePath(); g.fill();
  g.restore();
  for (const [rx, ry] of [[5, ty + 5], [bw - 5, ty + 5], [5, ty + th - 5], [bw - 5, ty + th - 5]]) { g.fillStyle = '#5a6288'; g.beginPath(); g.arc(rx, ry, 2, 0, R2); g.fill(); g.fillStyle = AL('#ffffff', 0.5); g.beginPath(); g.arc(rx - 0.5, ry - 0.6, 0.9, 0, R2); g.fill(); }
  rim(g, 0, ty, bw, th, 4);
}
function sSand(g, bw, bh, fl, r) {
  for (let row = 0; row < Math.max(1, Math.round(bh / 12)); row++) for (let cx = (row % 2 ? 10 : 0); cx + 10 < bw + 2; cx += 20) {
    const yy = row * 12 + 4, col = fl ? '#ffffff' : MXC(row % 2 ? '#c8bc8e' : '#d6cc9f', r() < 0.5 ? '#ffffff' : '#000000', r() * 0.12);
    g.beginPath(); g.ellipse(cx + 10, yy, 11, 7, 0, 0, R2); ART.fillOut(g, col, 2);
    if (fl) continue;
    g.fillStyle = AL('#ffffff', 0.28); g.beginPath(); g.ellipse(cx + 7, yy - 2.4, 6, 2.6, -0.25, 0, R2); g.fill();
    g.fillStyle = AL('#000000', 0.2); g.beginPath(); g.ellipse(cx + 12, yy + 3, 7, 2.4, 0.15, 0, R2); g.fill();
    g.strokeStyle = AL('#000000', 0.16); g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx + 4, yy); g.lineTo(cx + 16, yy); g.stroke();
  }
}
function blockSprite(w, fl) {
  const bw = w.w, bh = w.h, cv = CV((bw + BP * 2) * 2, (bh + BT + BP * 2) * 2), g = cv.getContext('2d');
  g.scale(2, 2); g.translate(BP, BT + BP);
  const r = seeded(w.seed || 0.37), v = variantOf(w);
  if (v === 'rock') sRock(g, bw, bh, fl, r);
  else if (v === 'sand') sSand(g, bw, bh, fl, r);
  else if (v === 'steel') sSteel(g, bw, bh, fl, r);
  else if (v === 'tomb') sTomb(g, bw, bh, fl, r);
  else if (v === 'crate') sCrate(g, bw, bh, fl, r);
  else if (v === 'barrel') sBarrel(g, bw, bh, fl, r);
  else if (v === 'sack') sSack(g, bw, bh, fl, r);
  else sStone(g, bw, bh, fl, r);
  return cv;
}
function blockShadow(w) {
  if (!w._sh) {
    const q = 0.3, pad = 16, sw = w.w + pad * 2, sh2 = w.h + pad * 2, cv = CV(sw * q, sh2 * q), g = cv.getContext('2d');
    g.scale(q, q); g.fillStyle = '#000'; ART.rr(g, pad, pad, w.w, w.h, 7); g.fill();
    w._sh = cv; w._pad = pad;
    let lx = W / 2; if (LPOS.length) { let bd = 1e9; for (const x of LPOS) { const d = Math.abs(x - (w.x + w.w / 2)); if (d < bd) { bd = d; lx = x; } } }
    w._dx = k.clamp((w.x + w.w / 2 - lx) / 7, -9, 9);
  }
  const pad = w._pad, sw = w.w + pad * 2, sh2 = w.h + pad * 2;
  c.globalAlpha = 0.5; c.drawImage(w._sh, w.x - pad + w._dx, w.y - pad + 10, sw * 1.02, sh2 * 1.1);
  c.globalAlpha = 1;
}
function block(w) {
  blockShadow(w);
  const fl = w.fl > 0, key = fl ? '_cvf' : '_cv';
  if (!w[key]) w[key] = blockSprite(w, fl);
  const cv = w[key];
  c.drawImage(cv, w.x - BP, w.y - BT - BP, cv.width / 2, cv.height / 2);
  if (w.hp && w.hp < 4) { // daño
    const ty = w.y - 8, th = w.h - 4;
    c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.moveTo(w.x + w.w * 0.3, ty + 3); c.lineTo(w.x + w.w * 0.42, ty + th * 0.5); c.lineTo(w.x + w.w * 0.34, ty + th - 3);
    if (w.hp < 3) { c.moveTo(w.x + w.w * 0.7, ty + 3); c.lineTo(w.x + w.w * 0.62, ty + th * 0.6); }
    c.stroke(); c.strokeStyle = AL('#ffffff', 0.18); c.lineWidth = 1.2; c.stroke();
  }
}

/* ---------- Personajes ---------- */
/* Rediseño: cada figura tiene silueta legible (cabeza, cuello, hombros, brazos y piernas separados),
   proporción cartoon (cabeza ≈ 1/2,8 del cuerpo), manos de mitón con pulgar, botas con suela, cara con
   iris/pupila/brillo y cejas que cambian de estado. 8 direcciones, ciclo de andar de 4 poses (contacto,
   paso bajo, paso alto, extensión), pose de ataque y pose de daño. Los enemigos se cachean por
   tipo/dirección/pose (el bucle solo hace drawImage); el héroe, que es único, va con rutas. */
const CSC = Math.min(2, window.devicePixelRatio || 1);
const SPR = {};
const Prr = (g, x, y, w, h, r) => ART.rr(g, x, y, w, h, r);
function Pfo(g, fill, lw) { g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); } }
/* lienzo cacheado; el origen (0,0) del dibujo es el punto de anclaje de la entidad */
function spr(key, w, h, oy, fn) {
  let q = SPR[key]; if (q) return q;
  q = SPR[key] = CV(w * CSC, h * CSC); const g = q.getContext('2d');
  g.scale(CSC, CSC); g.translate(w / 2, h - oy); g.lineJoin = 'round'; g.lineCap = 'round';
  fn(g); q.iw = w; q.ih = h; q.oy = oy; return q;
}
function blit(q, x, y, s, a) {
  s = s || 1; if (a != null) c.globalAlpha = a;
  c.drawImage(q, x - q.iw * s / 2, y - (q.ih - q.oy) * s, q.iw * s, q.ih * s);
  if (a != null) c.globalAlpha = 1;
}
function whiten(g, w, h) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,.88)'; g.fillRect(-w, -h * 2, w * 2, h * 3); g.globalCompositeOperation = 'source-over'; }
const D8 = 8, DSTEP = R2 / D8;
const dirIdx = (a) => ((Math.round(a / DSTEP) % D8) + D8) % D8;

/* ojos cartoon: blanco, iris, pupila y brillo; miran hacia (lx,ly) */
function eyePair(g, cx, cy, sep, r, lx, ly, o) {
  o = o || {};
  for (const s of [-1, 1]) {
    const ex = cx + s * sep, ey = cy;
    g.beginPath(); g.ellipse(ex, ey, r, r * (o.sq || 1), 0, 0, R2);
    g.fillStyle = o.white || '#fff'; g.fill(); g.lineWidth = r * 0.42; g.strokeStyle = OUT; g.stroke();
    if (o.shut) { g.beginPath(); g.moveTo(ex - r, ey); g.lineTo(ex + r, ey); g.lineWidth = r * 0.5; g.stroke(); continue; }
    const ix = ex + lx * r * 0.4, iy = ey + ly * r * 0.4 * (o.sq || 1);
    g.beginPath(); g.arc(ix, iy, r * 0.58, 0, R2); g.fillStyle = o.iris || '#3a4f8f'; g.fill();
    g.beginPath(); g.arc(ix, iy, r * 0.3, 0, R2); g.fillStyle = OUT; g.fill();
    g.beginPath(); g.arc(ix - r * 0.24, iy - r * 0.28, r * 0.21, 0, R2); g.fillStyle = '#fff'; g.fill();
  }
}
/* cejas: tilt>0 enfadado (borde interior bajo), tilt<0 preocupado */
function brows(g, cx, cy, sep, len, tilt, col, lw) {
  g.strokeStyle = col || OUT; g.lineWidth = lw || 2.2; g.lineCap = 'round';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * (sep - len / 2), cy + tilt); g.lineTo(cx + s * (sep + len / 2), cy - tilt); g.stroke(); }
}
/* mitón con pulgar: se dibuja el pulgar y encima la palma, así no se ve la línea interior */
function mitt(g, x, y, r, col, s) {
  g.beginPath(); g.arc(x + s * r * 0.7, y + r * 0.3, r * 0.48, 0, R2); Pfo(g, DK(col, 0.12), r * 0.42);
  g.beginPath(); g.arc(x, y, r, 0, R2); Pfo(g, col, r * 0.46);
  g.beginPath(); g.arc(x - r * 0.3, y - r * 0.34, r * 0.36, 0, R2); g.fillStyle = AL('#ffffff', 0.3); g.fill();
}
/* bota con caña, puntera y suela */
function boot(g, x, y, w, h, s, col) {
  Prr(g, x - w / 2, y - h, w + Math.abs(s) * w * 0.34, h, w * 0.34); Pfo(g, col, 2.2);
  g.save(); Prr(g, x - w / 2, y - h, w + Math.abs(s) * w * 0.34, h, w * 0.34); g.clip();
  g.fillStyle = AL('#ffffff', 0.16); g.fillRect(x - w / 2, y - h, w, h * 0.3);
  g.fillStyle = DK(col, 0.42); g.fillRect(x - w / 2 - 2, y - h * 0.3, w * 2, h * 0.3);
  g.restore();
  g.beginPath(); g.moveTo(x - w / 2, y - h * 0.26); g.lineTo(x + w / 2 + Math.abs(s) * w * 0.34, y - h * 0.26);
  g.lineWidth = 1.6; g.strokeStyle = AL('#000000', 0.45); g.stroke();
}

/* --- Héroe: aventurero encapuchado con bufanda; la capucha marca la silueta y la bufanda
   indica la velocidad (va con retardo respecto al cuerpo). Clases del cooperativo: casco del
   caballero, capucha con pluma de la arquera, sombrero puntiagudo de la maga, mitra del clérigo. */
const HSK = '#ffd3ad', HSKD = '#dca97f', HBOOT = '#7a4c2e';
/* poses: 0..3 andar · 4/5 respiración en reposo · 6 ataque · 7 daño */
function heroArt(g, o) {
  const col = o.col || '#5ce1e6', lite = LT(col, 0.34), dark = DK(col, 0.32);
  const hood = MXC(col, '#463ac4', 0.55), hoodL = LT(hood, 0.3), hoodD = DK(hood, 0.34);
  const dx = o.dx, dy = o.dy, back = dy < -0.4, fs = dx >= 0 ? 1 : -1, lat = Math.abs(dx);
  const cls = o.cls || 'hood', P = o.pose | 0, walk = P < 4, atk = P === 6, hurt = P === 7;
  const SWG = [1, 0.35, -1, -0.35], BOB = [-1.6, 0, -2.2, 0];
  const sw = walk ? SWG[P] : 0, bob = walk ? BOB[P] : P === 4 ? -0.8 : 0;
  const flow = hurt ? 1.4 : walk ? 1 : 0.3;                       // la capa va con retardo: marca la velocidad
  const wav = Math.sin(P * 1.7 + (o.ph || 0)) * 2.3 * flow;
  g.translate((hurt ? -2.8 : atk ? 1.8 : 0) * dx, bob);
  /* --- capa, por detrás de todo --- */
  g.beginPath();
  g.moveTo(-9, -33.5);
  g.quadraticCurveTo(-14.5 - dx * 3, -18 + wav, -11 - dx * 6, -3 + wav * 1.4);
  g.quadraticCurveTo(0, 1 + wav * 0.5, 11 - dx * 6, -3 - wav * 1.4);
  g.quadraticCurveTo(14.5 - dx * 3, -18 - wav, 9, -33.5); g.closePath();
  Pfo(g, back ? hood : hoodD, 2.8);
  if (back) { g.save(); g.clip(); g.fillStyle = AL(hoodL, 0.5); g.beginPath(); g.moveTo(-9, -34); g.lineTo(-1, -34); g.lineTo(-6, 1); g.lineTo(-13, -1); g.fill(); g.restore(); }
  /* --- piernas y botas --- */
  for (const s of [-1, 1]) {
    const off = sw * s * 4.4, lift = sw * s > 0 ? 2.8 : 0;
    g.beginPath(); g.moveTo(s * 5, -19); g.lineTo(s * 5.4 + off, -7 - lift);
    g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#473c66'; g.stroke();
    boot(g, s * 5.4 + off, -lift, 9.6, 7, dx, '#7a4c2e');
  }
  /* --- brazos: salen de la silueta del torso, con puño y mitón --- */
  const arm = (s, fr) => {
    const shx = s * 10.2, shy = -32.5;
    let hx = s * 13.8 - sw * s * 2.4, hy2 = -17.2 + sw * s * 2.6;
    if (atk && fr) { hx = s * 8.5 + dx * 13.5; hy2 = -27.5; }
    if (hurt) { hx = s * 16.5; hy2 = -34; }
    g.beginPath(); g.moveTo(shx, shy); g.quadraticCurveTo(s * 15.4, -26.5, hx, hy2);
    g.lineWidth = 8.6; g.strokeStyle = OUT; g.stroke();
    g.lineWidth = 5.4; g.strokeStyle = fr ? dark : DK(col, 0.46); g.stroke();
    g.lineWidth = 5.4; g.strokeStyle = AL(fr ? col : dark, 0.5);
    g.beginPath(); g.moveTo(shx, shy - 0.9); g.quadraticCurveTo(s * 15, -27.4, hx, hy2 - 0.9); g.stroke();
    mitt(g, hx, hy2, 3.7, HSK, s);
    return [hx, hy2];
  };
  arm(-fs, false);
  /* --- torso: hombros marcados, cintura y cinturón --- */
  g.beginPath();
  g.moveTo(-11, -30.5);
  g.quadraticCurveTo(-10.6, -34.8, -6.6, -35.4); g.lineTo(6.6, -35.4);
  g.quadraticCurveTo(10.6, -34.8, 11, -30.5);
  g.quadraticCurveTo(11.6, -24, 11.2, -17.4);
  g.quadraticCurveTo(0, -15.2, -11.2, -17.4);
  g.quadraticCurveTo(-11.6, -24, -11, -30.5); g.closePath();
  Pfo(g, col, 2.8);
  g.save(); g.clip();
  g.fillStyle = AL(lite, 0.8); g.beginPath(); g.moveTo(-12.5, -36); g.lineTo(-3, -36); g.lineTo(-6, -15); g.lineTo(-13, -15); g.fill();
  g.fillStyle = AL(dark, 0.62); g.fillRect(5, -37, 9, 24);
  if (!back) { g.fillStyle = AL(OUT, 0.26); g.beginPath(); g.ellipse(dx * 1.3, -33.4, 6, 3.2, 0, 0, R2); g.fill(); }  // sombra del cuello
  g.fillStyle = '#c98a4b'; g.fillRect(-13, -22.4, 26, 4.8);
  g.fillStyle = AL('#ffffff', 0.22); g.fillRect(-13, -22.4, 26, 1.4);
  g.fillStyle = AL('#000000', 0.28); g.fillRect(-13, -18.2, 26, 1.3);
  g.restore();
  Prr(g, -3.2, -23.4, 6.4, 6.4, 1.6); Pfo(g, '#ffc928', 1.8);
  /* --- bufanda: nudo al cuello y cola que vuela hacia atrás --- */
  g.beginPath();
  g.moveTo(-dx * 3 - 1, -35.5);
  g.quadraticCurveTo(-dx * 13, -34.5 + wav, -dx * 19, -28 + wav * 1.6);
  g.quadraticCurveTo(-dx * 13, -29.5 + wav * 0.4, -dx * 3 + 2, -32.5);
  g.closePath(); Pfo(g, '#ff6fb5', 2.2);
  Prr(g, -7, -38.4, 14, 5.2, 2.6); Pfo(g, '#ff6fb5', 2.4);
  g.fillStyle = AL('#ffffff', 0.3); g.fillRect(-6, -37.8, 12, 1.5);
  /* --- cabeza --- */
  const hy = -45, hr = 7.6, hx0 = dx * 1.3;
  if (cls !== 'knight') {                                          // pico de la capucha: cae hacia atrás
    const px = hx0 - dx * 12, py = hy - hr - 1 - (1 - lat) * 6 + wav;
    const cx = hx0 - dx * 6, cy = hy - hr - 3.5 + wav * 0.6;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx0 - dx, hy - 1); g.quadraticCurveTo(cx, cy, px, py);
    g.lineWidth = 12; g.strokeStyle = OUT; g.stroke();
    g.lineWidth = 8.6; g.strokeStyle = hoodD; g.stroke();
    g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(px, py, px - dx * 3, py - 0.5);
    g.lineWidth = 8; g.strokeStyle = OUT; g.stroke();
    g.lineWidth = 4.6; g.strokeStyle = hoodD; g.stroke();
  }
  g.beginPath(); g.ellipse(hx0, hy, hr, hr * 1.06, 0, 0, R2); Pfo(g, back || cls === 'knight' ? hood : HSK, 2.6);
  if (!back && cls !== 'knight') {
    g.beginPath(); g.arc(hx0 - 2.4, hy + 1, hr * 0.56, 0, R2); g.fillStyle = AL('#ffffff', 0.2); g.fill();
    g.beginPath(); g.arc(hx0 + 3.4, hy + 3.6, hr * 0.5, 0, R2); g.fillStyle = AL(HSKD, 0.6); g.fill();
  }
  headGear(g, { cls, back, wav, dx, lat, hx0, hy, hr, col, lite, dark, hood, hoodL, hoodD, atk, hurt });
  if (!back && cls !== 'knight') {
    const ey = hy + 1.6;
    eyePair(g, hx0, ey, 3.5, 2.6, dx * 0.5, dy * 0.45, { sq: hurt ? 0.4 : 1, shut: hurt, iris: '#2f4a8c' });
    brows(g, hx0, hy - 2.6, 3.5, 3.4, hurt ? -1.3 : atk ? 1.4 : 0.45, OUT, 1.6);
    g.beginPath();
    if (atk || hurt) { g.ellipse(hx0, hy + 5.8, 2.6, hurt ? 2.7 : 2.1, 0, 0, R2); Pfo(g, '#6b2b3a', 1.5); }
    else { g.arc(hx0, hy + 4.6, 2.2, 0.3, 2.84); g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke(); }
    g.beginPath(); g.arc(hx0 - 5.4, hy + 3.4, 1.5, 0, R2); g.arc(hx0 + 5.4, hy + 3.4, 1.5, 0, R2);
    g.fillStyle = AL('#ff8fa8', 0.42); g.fill();
  }
  arm(fs, true);
}
/* tocado por clase, encima de la cabeza ya dibujada */
function headGear(g, o) {
  const { cls, back, wav, dx, lat, hx0, hy, hr, hood, hoodL, hoodD } = o;
  if (cls === 'knight') {                                          // yelmo con visera, cimera y barboquejo
    g.beginPath(); g.arc(hx0, hy - 0.5, hr + 1.8, Math.PI, Math.PI * 2);
    g.lineTo(hx0 + hr + 1.8, hy + 4); g.quadraticCurveTo(hx0, hy + 7.5, hx0 - hr - 1.8, hy + 4);
    g.closePath(); Pfo(g, '#c9d1e6', 2.8);
    g.save(); g.clip();
    g.fillStyle = AL('#ffffff', 0.5); g.beginPath(); g.ellipse(hx0 - 3.2, hy - 4, 4.4, 5, 0.4, 0, R2); g.fill();
    g.fillStyle = AL('#5a6484', 0.5); g.fillRect(hx0 + 3, hy - 12, 10, 22);
    g.restore();
    if (!back) {
      g.fillStyle = OUT; Prr(g, hx0 - 6.6, hy - 1.4, 13.2, 3.4, 1.2); g.fill();
      g.fillStyle = AL('#7fe9ef', 0.8); Prr(g, hx0 - 5.6, hy - 0.8, 11.2, 1.7, 0.8); g.fill();
      g.strokeStyle = AL(OUT, 0.55); g.lineWidth = 1.4;
      for (const i of [-2, 0, 2]) { g.beginPath(); g.moveTo(hx0 + i * 2.4, hy + 3); g.lineTo(hx0 + i * 2.4, hy + 6); g.stroke(); }
      Prr(g, hx0 - 1.3, hy - 6.5, 2.6, 11.5, 1); Pfo(g, '#aab4cc', 1.6);
    }
    g.beginPath(); g.moveTo(hx0 - 2.2, hy - hr - 1.5);
    g.quadraticCurveTo(-dx * 5 + hx0, hy - hr - 11 + wav, -dx * 13 + hx0 - (1 - lat) * 2, hy - hr - 5 + wav);
    g.quadraticCurveTo(-dx * 5 + hx0, hy - hr - 3.5, hx0 + 2.2, hy - hr - 1.5); g.closePath(); Pfo(g, '#ff5f7a', 2.4);
  } else if (cls === 'mage') {                                     // sombrero puntiagudo con ala y estrella
    g.beginPath(); g.ellipse(hx0, hy - hr + 1, hr + 6.5, 4.4, 0, 0, R2); Pfo(g, hoodD, 2.6);
    g.fillStyle = AL('#ffffff', 0.16); g.beginPath(); g.ellipse(hx0 - 2, hy - hr, hr + 4, 2.4, 0, 0, R2); g.fill();
    g.beginPath(); g.moveTo(hx0 - hr - 0.5, hy - hr + 0.5);
    g.quadraticCurveTo(hx0 - 4 - dx * 4, hy - hr - 12, -dx * 10 + hx0, hy - hr - 21 + wav);
    g.quadraticCurveTo(hx0 + 3, hy - hr - 10, hx0 + hr + 0.5, hy - hr + 0.5);
    g.closePath(); Pfo(g, hood, 2.8);
    g.save(); g.clip(); g.fillStyle = AL(hoodL, 0.75);
    g.beginPath(); g.moveTo(hx0 - hr - 1, hy - hr + 1); g.quadraticCurveTo(hx0 - 5, hy - hr - 11, -dx * 9 + hx0, hy - hr - 19 + wav);
    g.lineTo(-dx * 4 + hx0, hy - hr - 13); g.quadraticCurveTo(hx0 - 1.5, hy - hr - 6, hx0 - 1.5, hy - hr + 1); g.closePath(); g.fill();
    g.restore();
    g.beginPath(); g.arc(-dx * 10 + hx0, hy - hr - 21 + wav, 2.6, 0, R2); Pfo(g, '#ffc928', 1.7);
  } else if (cls === 'cleric') {                                   // banda dorada de la capucha
    g.beginPath(); g.moveTo(hx0 - hr - 2, hy - 2.4); g.quadraticCurveTo(hx0, hy - hr - 4, hx0 + hr + 2, hy - 2.4);
    g.lineTo(hx0 + hr + 2, hy - 5.4); g.quadraticCurveTo(hx0, hy - hr - 7, hx0 - hr - 2, hy - 5.4); g.closePath();
    Pfo(g, '#ffc928', 2.2);
    g.beginPath(); g.arc(hx0, hy - hr - 4.4, 2.2, 0, R2); Pfo(g, '#fff2b8', 1.6);
  } else if (cls === 'archer') {                                   // pluma en la capucha
    g.beginPath(); g.moveTo(-dx * 4 + hx0, hy - hr - 2.5);
    g.quadraticCurveTo(-dx * 12, hy - hr - 14 + wav, -dx * 18 - (1 - lat) * 3, hy - hr - 8 + wav);
    g.quadraticCurveTo(-dx * 11, hy - hr - 5, -dx * 4 + hx0, hy - hr); g.closePath(); Pfo(g, '#a8cf3f', 2.2);
  }
  if (cls !== 'knight') {                                          // visera de la capucha, cae sobre la frente
    g.beginPath();
    g.moveTo(hx0 - hr - 1.7, hy + 3.2);
    g.quadraticCurveTo(hx0 - hr - 2.6, hy - hr - 4.4, hx0 + dx * 1.5, hy - hr - 4);
    g.quadraticCurveTo(hx0 + hr + 2.6, hy - hr - 4.4, hx0 + hr + 1.7, hy + 3.2);
    g.quadraticCurveTo(hx0 + hr * 0.7, hy - 5, hx0, hy - 6);
    g.quadraticCurveTo(hx0 - hr * 0.7, hy - 5, hx0 - hr - 1.7, hy + 3.2);
    g.closePath(); Pfo(g, hood, 2.8);
    g.save(); g.clip();
    g.fillStyle = AL(hoodL, 0.7); g.beginPath(); g.ellipse(hx0 - 4.2, hy - 6, 5.2, 4.4, 0.4, 0, R2); g.fill();
    g.fillStyle = AL('#000000', 0.18); g.fillRect(hx0 + 3.2, hy - hr - 7, 12, 16);
    g.restore();
    if (!back) { g.fillStyle = AL(OUT, 0.13); g.beginPath(); g.ellipse(hx0, hy - 4.9, hr * 0.7, 1.4, 0, 0, R2); g.fill(); }
    else { g.strokeStyle = AL(OUT, 0.3); g.lineWidth = 1.8; g.beginPath(); g.moveTo(hx0, hy - hr - 3); g.quadraticCurveTo(hx0 + 1.4, hy - 1, hx0, hy + 3); g.stroke();
      g.fillStyle = AL(hoodL, 0.45); g.beginPath(); g.ellipse(hx0 - 3.4, hy - 2, 3.6, 4.4, 0.3, 0, R2); g.fill(); }
  }
}
function heroCv(col, cls, di, pose) {
  const key = `h|${col}|${cls}|${di}|${pose}`;
  return spr(key, 76, 92, 22, (g) => {
    const a = di * DSTEP;
    heroArt(g, { col, cls, dx: Math.cos(a), dy: Math.sin(a), pose, ph: 0 });
  });
}
function heroPose(o) {
  if (o.inv > 1.15 && !o.roll) return 7;
  if ((o.swing || 0) > 0 || (o.recoil || 0) > 0.03) return 6;
  if (o.mv) return ((t * 8 + (o.ph || 0)) | 0) % 4;
  return ((t * 1.6 + (o.ph || 0)) | 0) % 2 + 4;
}
/* mano del héroe en la dirección di (para colgar el arma); se calcula una vez por dirección */
const HANDC = {};
function heroHand(di, pose) {
  const key = di + '|' + pose; let v = HANDC[key];
  if (!v) {
    const a = di * DSTEP, dx = Math.cos(a), walk = pose < 4, atk = pose === 6, hurt = pose === 7;
    const sw = walk ? [1, 0.35, -1, -0.35][pose] : 0, bob = walk ? [-1.6, 0, -2.2, 0][pose] : pose === 4 ? -0.8 : 0;
    const s = dx >= 0 ? 1 : -1, ox = (hurt ? -2.8 : atk ? 1.8 : 0) * dx;
    let hx = s * 15.6 - sw * s * 2.8, hy = -23 + sw * s * 2;
    if (atk) { hx = s * 8.5 + dx * 13.5; hy = -27.5; }
    if (hurt) { hx = s * 16.5; hy = -34; }
    v = HANDC[key] = [hx + ox, hy + bob];
  }
  return v;
}

/* humanoides (zombi, bruto, matón): mismo esqueleto que el héroe a otra escala, con su propia
   actitud — el zombi estira los brazos y arrastra un pie, el matón va en guardia de boxeo y el
   bruto se agacha con los puños juntos antes de embestir. */
function humanArt(g, o) {
  const skin = o.skin, shirt = o.shirt, pants = o.pants, B = o.bulk, kind = o.kind;
  const dx = o.dx, dy = o.dy, back = dy < -0.4, fs = dx >= 0 ? 1 : -1;
  const P = o.pose, walk = P < 4, atk = P === 4, hurt = P === 5;
  const sw = walk ? [1, 0.35, -1, -0.35][P] : 0, bob = walk ? [-1.6, 0, -2.2, 0][P] : 0;
  const shirtL = LT(shirt, 0.36), shirtD = DK(shirt, 0.36), skinD = DK(skin, 0.3);
  g.translate((atk ? 1.6 : hurt ? -2.4 : 0) * dx, bob + (kind === 'brute' && atk ? 4 : 0));
  for (const s of [-1, 1]) {                                  // piernas y botas
    const drag = kind === 'zombie' && s < 0 ? 0.3 : 1;
    const off = sw * s * 4.4 * drag, lift = sw * s > 0 ? 2.6 * drag : 0;
    g.beginPath(); g.moveTo(s * 5 * B, -19); g.lineTo(s * 5.4 * B + off, -7 - lift);
    g.lineWidth = 8 * B; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 5 * B; g.strokeStyle = pants; g.stroke();
    boot(g, s * 5.4 * B + off, -lift, 9.6 * B, 7, dx, o.boot || '#463a2c');
  }
  const arm = (s, fr) => {
    const shx = s * 10.2 * B, shy = -32.5;
    let hx = s * 15.6 * B - sw * s * 2.8, hy = -23 + sw * s * 2;
    if (kind === 'zombie') { hx = s * 8 * B + dx * 15; hy = -27 + dy * 7 + sw * s * 1.2; }
    else if (kind === 'thug') { hx = atk && fr ? s * 4 * B + dx * 17 : s * 8.6 * B + dx * 2; hy = atk && fr ? -29 : -30 + sw * s * 1.4; }
    else if (kind === 'brute') { hx = atk ? s * 7 * B + dx * 12 : s * 16.4 * B - sw * s * 2.4; hy = atk ? -22 : -21 + sw * s * 2; }
    if (hurt) { hx = s * 17 * B; hy = -34; }
    g.beginPath(); g.moveTo(shx, shy); g.quadraticCurveTo(s * 14.6 * B, -29, hx, hy);
    g.lineWidth = 8.4 * B; g.strokeStyle = OUT; g.stroke();
    g.lineWidth = 5.2 * B; g.strokeStyle = kind === 'zombie' ? skin : shirt; g.stroke();
    if (kind !== 'zombie') {                                  // antebrazo desnudo
      g.beginPath(); g.moveTo(shx + (hx - shx) * 0.48, shy + (hy - shy) * 0.48); g.lineTo(hx, hy);
      g.lineWidth = 5 * B; g.strokeStyle = skin; g.stroke();
    }
    mitt(g, hx, hy, (kind === 'zombie' ? 4.1 + dy * 1.1 : 4.1) * B, skin, s);
  };
  arm(-fs, false);
  g.beginPath();                                              // torso con hombros
  g.moveTo(-11 * B, -30.5);
  g.quadraticCurveTo(-10.6 * B, -34.8, -6.6 * B, -35.4); g.lineTo(6.6 * B, -35.4);
  g.quadraticCurveTo(10.6 * B, -34.8, 11 * B, -30.5);
  g.quadraticCurveTo(11.6 * B, -24, 11.2 * B, -17.4);
  g.quadraticCurveTo(0, -15.2, -11.2 * B, -17.4);
  g.quadraticCurveTo(-11.6 * B, -24, -11 * B, -30.5); g.closePath(); Pfo(g, shirt, 2.8);
  g.save(); g.clip();
  g.fillStyle = AL(shirtL, 0.7); g.beginPath(); g.moveTo(-12.5 * B, -36); g.lineTo(-4.6 * B, -36); g.lineTo(-7 * B, -15); g.lineTo(-13 * B, -15); g.fill();
  g.fillStyle = AL(shirtD, 0.5); g.beginPath(); g.moveTo(4.4 * B, -37); g.lineTo(13 * B, -37); g.lineTo(13 * B, -14); g.lineTo(6.6 * B, -14); g.closePath(); g.fill();
  if (!back) { g.fillStyle = AL(OUT, 0.26); g.beginPath(); g.ellipse(dx * 1.3, -33.4, 6 * B, 3.2, 0, 0, R2); g.fill(); }
  if (kind === 'zombie') {                                    // ropa rasgada
    g.fillStyle = AL('#000000', 0.32);
    g.beginPath(); g.moveTo(-6, -15); g.lineTo(-3, -24); g.lineTo(0, -15); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(4, -15); g.lineTo(6.5, -21); g.lineTo(9, -15); g.closePath(); g.fill();
    g.fillStyle = AL(skin, 0.85); g.beginPath(); g.ellipse(-2, -27, 3.4, 2.4, 0.3, 0, R2); g.fill();
  } else if (kind === 'brute') {                              // peto / correas
    g.fillStyle = AL('#000000', 0.22); g.fillRect(-12 * B, -25, 24 * B, 2.2);
    g.fillStyle = AL('#ffffff', 0.1); g.fillRect(-12 * B, -27.4, 24 * B, 1.6);
  }
  g.restore();
  if (kind === 'thug') {                                      // cinturón con hebilla
    Prr(g, -11.6 * B, -20.4, 23.2 * B, 4.4, 1.6); Pfo(g, '#2a2540', 2);
    Prr(g, -2.6, -20.8, 5.2, 5, 1.4); Pfo(g, '#ffc928', 1.6);
  }
  const hB = kind === 'brute' ? 1.16 : 1, hy = -45, hr = 7.6 * hB, hx0 = dx * 1.3;
  g.beginPath(); g.moveTo(-3.2 * B, -33); g.lineTo(3.2 * B, -33); g.lineTo(2.6, hy + hr * 0.6); g.lineTo(-2.6, hy + hr * 0.6); g.closePath(); Pfo(g, skinD, 2);
  g.beginPath(); g.ellipse(hx0, hy, hr, hr * (kind === 'zombie' ? 1.06 : 1), 0, 0, R2); Pfo(g, skin, 2.6);
  g.beginPath(); g.arc(hx0 - 2.4, hy - 2.2, hr * 0.56, 0, R2); g.fillStyle = AL('#ffffff', 0.18); g.fill();
  g.beginPath(); g.arc(hx0 + 3.2, hy + 3, hr * 0.5, 0, R2); g.fillStyle = AL(skinD, 0.55); g.fill();
  if (kind === 'zombie') {                                    // pelo a mechones
    g.beginPath(); g.moveTo(hx0 - hr, hy - 1.5);
    for (let i = 0; i <= 6; i++) g.lineTo(hx0 - hr + i * hr / 3, hy - hr - (i % 2 ? 2.2 : 0.2));
    g.lineTo(hx0 + hr, hy - 1.5); g.quadraticCurveTo(hx0, hy - hr * 0.4, hx0 - hr, hy - 1.5);
    g.closePath(); Pfo(g, '#4c3a2e', 2.2);
  } else if (kind === 'thug') {                               // pañuelo con nudo y coleta
    g.beginPath(); g.arc(hx0, hy - 0.5, hr + 0.4, Math.PI * 1.06, Math.PI * 1.94); g.closePath(); Pfo(g, '#3a2a4a', 2.2);
    g.beginPath(); g.moveTo(hx0 - hr - 1, hy - 3.4); g.quadraticCurveTo(hx0, hy - hr - 2.6, hx0 + hr + 1, hy - 3.4);
    g.lineTo(hx0 + hr + 1, hy - 6.6); g.quadraticCurveTo(hx0, hy - hr - 5.6, hx0 - hr - 1, hy - 6.6); g.closePath(); Pfo(g, '#e0402f', 2.2);
    g.beginPath(); g.moveTo(-dx * 4 + hx0, hy - 5.5); g.quadraticCurveTo(-dx * 12, hy - 6, -dx * 13, hy - 0.5);
    g.quadraticCurveTo(-dx * 8, hy - 3.2, -dx * 3 + hx0, hy - 3); g.closePath(); Pfo(g, '#e0402f', 1.8);
  } else if (kind === 'brute' && o.zq) {                      // bruto zombi: costurones
    g.strokeStyle = AL('#000000', 0.45); g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(hx0 - 5.4, hy - hr + 2.4); g.lineTo(hx0 + 5.4, hy - hr + 3.6); g.stroke();
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(hx0 + i * 2.6, hy - hr + 1); g.lineTo(hx0 + i * 2.6, hy - hr + 5); g.stroke(); }
    g.beginPath(); g.moveTo(hx0 - hr - 1.5, hy + 1); g.lineTo(hx0 - hr - 3.5, hy + 1); g.lineTo(hx0 - hr - 3.5, hy + 3.5); g.lineTo(hx0 - hr - 1.5, hy + 3.5); g.closePath(); Pfo(g, '#9aa0aa', 1.6);
    g.beginPath(); g.moveTo(hx0 + hr + 1.5, hy + 1); g.lineTo(hx0 + hr + 3.5, hy + 1); g.lineTo(hx0 + hr + 3.5, hy + 3.5); g.lineTo(hx0 + hr + 1.5, hy + 3.5); g.closePath(); Pfo(g, '#9aa0aa', 1.6);
  } else if (kind === 'brute') {                              // gorra plana del matón grande
    g.beginPath(); g.arc(hx0, hy - 1, hr + 0.6, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); Pfo(g, '#2a2540', 2.4);
    g.beginPath(); g.ellipse(hx0 + dx * 2, hy - hr + 1.6, hr + 2.6, 2.4, 0, 0, R2); Pfo(g, '#2a2540', 2.2);
    g.fillStyle = AL('#ffffff', 0.14); g.beginPath(); g.ellipse(hx0 - 3, hy - hr + 0.5, 3.6, 1.8, 0, 0, R2); g.fill();
  }
  if (!back) {
    const zo = kind === 'zombie';
    const ey = hy + (zo ? 0.4 : 1.2), er = hr * (zo ? 0.36 : 0.33), sep = hr * 0.46;
    eyePair(g, hx0, ey, sep, er, dx * 0.5, dy * 0.45, { sq: hurt ? 0.4 : zo ? 1.18 : 1, shut: hurt, iris: zo ? '#c8ff8a' : '#3a4f8f', white: zo ? '#e6f2cf' : '#fff' });
    brows(g, hx0, hy - hr * 0.42, sep, hr * 0.44, hurt ? -1.3 : atk ? 1.8 : zo ? -0.5 : 1, OUT, 1.9);
    g.beginPath();
    if (zo) {                                                 // mandíbula colgando con dientes
      g.ellipse(hx0, hy + hr * 0.6, 2.8, 3.6, 0, 0, R2); Pfo(g, '#4a2030', 1.6);
      g.fillStyle = '#eee6cf'; g.fillRect(hx0 - 2.2, hy + hr * 0.32, 4.4, 1.5);
      g.strokeStyle = AL(OUT, 0.5); g.lineWidth = 1.2; g.beginPath(); g.moveTo(hx0 + 3, hy + 2); g.lineTo(hx0 + 5.5, hy + 3.4); g.stroke();
    } else if (atk || hurt) { g.ellipse(hx0, hy + hr * 0.56, 3, hurt ? 2.8 : 2.4, 0, 0, R2); Pfo(g, '#6b2b3a', 1.6); }
    else { g.arc(hx0, hy + hr * 0.34, 2.6, 0.3, 2.84); g.lineWidth = 1.9; g.strokeStyle = OUT; g.stroke(); }
  }
  arm(fs, true);
}

/* --- Enemigos: cada uno con su lenguaje corporal ---
   bat: se encoge y echa las alas atrás antes de lanzarse · eye: entorna el párpado y se le enrojece
   el iris al disparar · skel: levanta el sable sobre la cabeza antes del tajo · ghost: se estira hacia
   delante con los brazos por delante · slime: se agacha (squash) antes de saltar · zombie: brazos
   estirados y arrastra un pie · brute: se agacha con los puños juntos antes de embestir · thug:
   guardia de boxeo y carga el puño. */
const SKIN = { zombie: '#8fc26a', brute: ZQ ? '#6fa04f' : '#e8b184', thug: '#f0c8a0' };
function foeArt(g, type, dx, dy, pose, col) {
  const back = dy < -0.4, front = dy > 0.25, lat = Math.abs(dx), fs = dx >= 0 ? 1 : -1;
  const atk = pose === 4, hurt = pose === 5, walk = pose < 4;
  const SWG = [1, 0.3, -1, -0.3], BOB = [-1.4, 0, -2, 0];
  const sw = walk ? SWG[pose] : 0, bob = walk ? BOB[pose] : 0;
  if (type === 'bat') {
    const flap = walk ? [1, 0.2, -0.9, 0.2][pose] : atk ? -1 : 0.6;
    g.translate(0, walk ? -flap * 2 : 0);
    for (const s of [-1, 1]) {                       // ala con dedos y membrana
      const ext = atk ? 0.55 : 1, up = flap * 7;
      g.beginPath(); g.moveTo(s * 5, -3);
      g.quadraticCurveTo(s * 15 * ext, -10 - up, s * 25 * ext, -6 - up * 1.4);
      g.quadraticCurveTo(s * 19 * ext, -1 - up * 0.5, s * 17 * ext, 2 - up * 0.6);
      g.quadraticCurveTo(s * 13 * ext, -1, s * 11 * ext, 2.5);
      g.quadraticCurveTo(s * 8 * ext, 0, s * 6, 4); g.closePath();
      Pfo(g, s === fs ? '#6b4aa0' : '#553a86', 2.4);
      g.strokeStyle = AL('#000000', 0.3); g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(s * 5, -3); g.lineTo(s * 17 * ext, 1.4 - up * 0.6);
      g.moveTo(s * 5, -3); g.lineTo(s * 11 * ext, 2 - up * 0.2); g.stroke();
    }
    for (const s of [-1, 1]) {                       // orejas grandes
      g.beginPath(); g.moveTo(s * 2.5, -6); g.quadraticCurveTo(s * 6, -16, s * 8.5, -13);
      g.quadraticCurveTo(s * 8, -7, s * 6.5, -4); g.closePath(); Pfo(g, col, 2.2);
      g.beginPath(); g.moveTo(s * 4, -7); g.quadraticCurveTo(s * 6, -13, s * 7.2, -11.5); g.closePath();
      g.fillStyle = AL('#ff9ad5', 0.5); g.fill();
    }
    g.beginPath(); g.ellipse(0, 0, 8.4, 8, 0, 0, R2); Pfo(g, col, 2.6);
    g.beginPath(); g.ellipse(-2.6, -2.6, 4.4, 3.8, 0.4, 0, R2); g.fillStyle = AL('#ffffff', 0.2); g.fill();
    g.beginPath(); g.ellipse(0, 3.4, 5, 3.4, 0, 0, R2); g.fillStyle = AL('#2b1f4a', 0.35); g.fill();   // pelaje del pecho
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 3, 7.2); g.lineTo(s * 4.4, 11.5); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 1.4; g.strokeStyle = '#c98a4b'; g.stroke(); }
    if (!back) {
      eyePair(g, 0, -1.4, 3.2, 2.5, dx * 0.5, dy * 0.4, { iris: '#ffc928', sq: hurt ? 0.5 : atk ? 0.8 : 1, shut: hurt });
      brows(g, 0, -5.6, 3.2, 3.2, atk ? 1.6 : 0.8, OUT, 1.8);
      g.beginPath(); g.moveTo(-3, 3); g.quadraticCurveTo(0, atk ? 7 : 5.4, 3, 3); Pfo(g, '#6b2b3a', 1.6);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-2.2, 3.2); g.lineTo(-1.1, 5.6); g.lineTo(-0.2, 3.2); g.fill();
      g.beginPath(); g.moveTo(2.2, 3.2); g.lineTo(1.1, 5.6); g.lineTo(0.2, 3.2); g.fill();
    }
  } else if (type === 'eye') {
    const lid = atk ? 0.4 : hurt ? 0.78 : 0.16;
    for (let i = 0; i < 4; i++) {                    // tentáculos que cuelgan y ondean
      const s = i < 2 ? -1 : 1, o2 = (i % 2) * 4 + 2, ph = walk ? [0, 1, 0, -1][pose] : 0;
      g.beginPath(); g.moveTo(s * o2, 8);
      g.quadraticCurveTo(s * (o2 + 3) + ph * 2, 15, s * (o2 + 1) + ph * 3.5, 21 + i % 2 * 2);
      g.lineWidth = 4.4; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2.4; g.strokeStyle = DK(col, 0.3); g.stroke();
    }
    g.beginPath(); g.arc(0, 0, 12, 0, R2); Pfo(g, '#f6f1e8', 2.8);
    g.save(); g.beginPath(); g.arc(0, 0, 12, 0, R2); g.clip();
    g.fillStyle = AL('#ffffff', 0.55); g.beginPath(); g.ellipse(-4.5, -4.5, 6, 5, 0.4, 0, R2); g.fill();
    g.fillStyle = AL('#8d7fb8', 0.42); g.beginPath(); g.ellipse(5, 5.5, 8, 7, 0.4, 0, R2); g.fill();
    g.strokeStyle = AL('#d4405e', 0.5); g.lineWidth = 1.2;                                  // venas
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.5; g.beginPath(); g.moveTo(Math.cos(a) * 11.6, Math.sin(a) * 11.6);
      g.quadraticCurveTo(Math.cos(a + 0.3) * 8, Math.sin(a + 0.3) * 8, Math.cos(a - 0.2) * 5.5, Math.sin(a - 0.2) * 5.5); g.stroke(); }
    const ix = dx * 4.4, iy = dy * 4.4;
    g.beginPath(); g.arc(ix, iy, 6.4, 0, R2); g.fillStyle = atk ? '#ff3b5c' : col; g.fill();
    g.lineWidth = 1.8; g.strokeStyle = AL(OUT, 0.5); g.stroke();
    g.beginPath(); g.arc(ix, iy, 3.2, 0, R2); g.fillStyle = OUT; g.fill();
    g.beginPath(); g.arc(ix - 2.2, iy - 2.4, 1.9, 0, R2); g.fillStyle = '#fff'; g.fill();
    g.fillStyle = '#5a4a86'; g.beginPath();                                                  // párpado
    g.moveTo(-13, -13); g.lineTo(13, -13); g.lineTo(13, -12 + lid * 24); g.quadraticCurveTo(0, -12 + lid * 30, -13, -12 + lid * 24); g.closePath(); g.fill();
    g.restore();
    g.beginPath(); g.moveTo(-12.4, -12 + lid * 24); g.quadraticCurveTo(0, -12 + lid * 30, 12.4, -12 + lid * 24);
    g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
    for (let i = -2; i <= 2; i++) {                  // pestañas/púas
      const a = -Math.PI / 2 + i * 0.42; g.beginPath(); g.moveTo(Math.cos(a) * 12, Math.sin(a) * 12 + lid * 6);
      g.lineTo(Math.cos(a) * 18, Math.sin(a) * 18 + lid * 6); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
    }
  } else if (type === 'skel') {
    g.translate(0, bob * 0.6);
    for (const s of [-1, 1]) {                       // piernas de hueso con pie
      const off = sw * s * 3.4;
      g.beginPath(); g.moveTo(s * 3.2, 1); g.lineTo(s * 4 + off, 8); g.lineTo(s * 4.4 + off * 1.3, 13.6);
      g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2.6; g.strokeStyle = '#efe8d4'; g.stroke();
      g.beginPath(); g.ellipse(s * 4.4 + off * 1.3 + dx * 1.6, 14.4, 4, 2.2, 0, 0, R2); Pfo(g, '#efe8d4', 2);
    }
    Prr(g, -5.6, -1.6, 11.2, 5, 2.2); Pfo(g, '#dcd4bd', 2.2);                                // pelvis
    g.beginPath(); g.moveTo(-6.6, -11); g.quadraticCurveTo(-8, -3, -5, -1); g.lineTo(5, -1);
    g.quadraticCurveTo(8, -3, 6.6, -11); g.closePath(); Pfo(g, '#efe8d4', 2.4);               // caja torácica
    g.strokeStyle = AL(OUT, 0.55); g.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-5.4 + i * 0.3, -8.6 + i * 2.6); g.quadraticCurveTo(0, -6.6 + i * 2.6, 5.4 - i * 0.3, -8.6 + i * 2.6); g.stroke(); }
    g.beginPath(); g.moveTo(0, -12); g.lineTo(0, -2); g.lineWidth = 2; g.strokeStyle = AL('#000000', 0.25); g.stroke();
    const arms = (s, fr) => {                        // brazos; el delantero sostiene el sable
      const up = fr && atk;
      const ex = s * 8.5 + (fr ? dx * 4 : 0), ey = -12.5;
      const hx = up ? ex + dx * 2 : ex + s * 2.5 + sw * s * -2, hy = up ? -26 : -5 + sw * s * 1.5;
      g.beginPath(); g.moveTo(s * 6.4, -10.6); g.quadraticCurveTo(ex + s * 2, -9, hx, hy);
      g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2.6; g.strokeStyle = '#efe8d4'; g.stroke();
      g.beginPath(); g.arc(hx, hy, 2.8, 0, R2); Pfo(g, '#efe8d4', 2);
      return [hx, hy];
    };
    arms(-fs, false);
    const hd = arms(fs, true);
    g.beginPath(); g.arc(0, -19.5, 8, 0, R2); Pfo(g, '#f6f0dd', 2.6);                        // cráneo
    Prr(g, -4.4, -15.4, 8.8, 5, 2); Pfo(g, '#f6f0dd', 2.2);                                  // mandíbula
    g.beginPath(); g.arc(-3, -22.5, 4, 0, R2); g.fillStyle = AL('#ffffff', 0.4); g.fill();
    if (!back) {
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 3.4, -20.4, 2.7, 3, 0, 0, R2); g.fillStyle = OUT; g.fill();
        g.beginPath(); g.arc(s * 3.4 + dx * 0.9, -20.2 + dy * 0.7, 1.4, 0, R2); g.fillStyle = hurt ? '#ffd23d' : '#ff5f5f'; g.fill(); }
      g.beginPath(); g.moveTo(-1.3, -16.4); g.lineTo(0, -14.4); g.lineTo(1.3, -16.4); g.closePath(); g.fillStyle = OUT; g.fill();
      g.strokeStyle = OUT; g.lineWidth = 1.4;                                                 // dientes
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 1.9, -13.2); g.lineTo(i * 1.9, -10.6); g.stroke(); }
      brows(g, 0, -25, 3.4, 3.4, atk ? 1.7 : 0.9, OUT, 1.9);
    }
    /* sable oxidado */
    g.save(); g.translate(hd[0], hd[1]); g.rotate(atk ? -1.1 * fs : 0.5 * fs);
    Prr(g, -1.4, -16, 2.8, 17, 1.2); Pfo(g, '#b9c2d6', 1.8);
    g.fillStyle = AL('#ffffff', 0.45); g.fillRect(-0.9, -15, 0.9, 15);
    Prr(g, -4, 0.4, 8, 2.4, 1); Pfo(g, '#c98a4b', 1.6); g.restore();
  } else if (type === 'ghost') {
    const lean2 = atk ? 3 : 0;
    g.beginPath();                                   // sábana con dobladillo ondulado
    g.moveTo(-11, 4);
    g.quadraticCurveTo(-12.5, -12, -3 + dx * 2, -17.5);
    g.quadraticCurveTo(6 + dx * 2, -18.5, 11, -6);
    g.quadraticCurveTo(12.5, 2, 11, 10);
    const wv = walk ? [0, 1, 0, -1][pose] : 0;
    for (let i = 0; i < 4; i++) { const x0 = 11 - i * 5.5; g.quadraticCurveTo(x0 - 2.7, 10 + (i % 2 ? -5 : 5) + wv * 1.6, x0 - 5.5, 10 + wv * (i % 2 ? 1 : -1)); }
    g.closePath(); Pfo(g, '#f0eaff', 2.8);
    g.save(); g.clip();
    g.fillStyle = AL('#b9a8e8', 0.55); g.fillRect(2, -20, 16, 36);
    g.fillStyle = AL('#ffffff', 0.7); g.beginPath(); g.ellipse(-5, -10, 6, 8, 0.3, 0, R2); g.fill();
    g.restore();
    for (const s of [-1, 1]) {                       // bracitos de tela por delante
      const ax = s * 13.5 + dx * lean2, ay = -1 + (atk ? -5 : 0) + sw * s * 1.4;
      g.beginPath(); g.moveTo(s * 7.5, -10); g.quadraticCurveTo(s * 13.5, -7, ax, ay);
      g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 4.4; g.strokeStyle = '#f0eaff'; g.stroke();
      g.beginPath(); g.arc(ax, ay, 3.6, 0, R2); Pfo(g, '#f0eaff', 2.2);
    }
    if (!back) {
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 4.6 + dx * 1.5, -9.5 + dy, 3.7, hurt ? 2 : atk ? 5.4 : 4.4, 0, 0, R2); g.fillStyle = OUT; g.fill();
        g.beginPath(); g.arc(s * 4.6 + dx * 2.6, -10.8 + dy, 1.6, 0, R2); g.fillStyle = AL(col, 0.95); g.fill(); }
      g.beginPath(); g.ellipse(dx * 1.5, -1.8 + dy, atk ? 3.8 : 2.8, atk ? 5 : 3.2, 0, 0, R2); g.fillStyle = OUT; g.fill();
    }
  } else if (type === 'slime') {
    const sq = atk ? 1.36 : hurt ? 0.88 : walk ? [1, 1.08, 1.02, 0.94][pose] : 1;   // agacharse antes de saltar
    const wv = 1 / sq, rw = 16 * wv, rh = 14 * sq;
    g.beginPath();                                   // cuerpo con goterón arriba
    g.moveTo(-rw, 8);
    g.quadraticCurveTo(-rw - 1.5, 8 - rh, -rw * 0.35, 8 - rh - 2.5);
    g.quadraticCurveTo(-rw * 0.1, 8 - rh - 7, rw * 0.15, 8 - rh - 2);
    g.quadraticCurveTo(rw + 1.5, 8 - rh + 1, rw, 8);
    g.quadraticCurveTo(rw * 0.55, 11.5, 0, 11.5); g.quadraticCurveTo(-rw * 0.55, 11.5, -rw, 8);
    g.closePath(); Pfo(g, col, 2.8);
    g.save(); g.clip();
    g.fillStyle = AL('#ffffff', 0.4); g.beginPath(); g.ellipse(-rw * 0.4, 8 - rh * 0.72, rw * 0.36, rh * 0.28, 0.4, 0, R2); g.fill();
    g.fillStyle = AL(DK(col, 0.45), 0.5); g.beginPath(); g.ellipse(rw * 0.55, 9, rw * 0.7, rh * 0.5, 0.2, 0, R2); g.fill();
    g.fillStyle = AL('#ffffff', 0.22); g.beginPath(); g.ellipse(0, 10.5, rw * 0.85, 2.4, 0, 0, R2); g.fill();
    for (let i = 0; i < 3; i++) { g.fillStyle = AL('#ffffff', 0.16); g.beginPath(); g.arc(-4 + i * 6, 8 - rh * (0.35 + i * 0.1), 2.2 - i * 0.4, 0, R2); g.fill(); }  // burbujas
    g.restore();
    if (!back) {
      const ey = 8 - rh * 0.52;
      eyePair(g, 0, ey, 5.4, 4, dx * 0.5, dy * 0.4, { sq: hurt ? 0.45 : 1, shut: hurt, iris: '#2c4a2a' });
      brows(g, 0, ey - 7, 5.4, 4.6, atk ? 1.8 : 0.7, OUT, 2);
      g.beginPath();
      if (atk) { g.ellipse(0, ey + 7, 3.6, 3, 0, 0, R2); Pfo(g, '#2f4a24', 1.6); }
      else { g.arc(0, ey + 5.4, 3.2, 0.25, 2.9); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); }
    }
  } else {                                           // humanoides: zombie, brute, thug
    const big = type === 'brute';
    const S = big ? 1.24 : type === 'thug' ? 1 : 0.92, feet = big ? 18 : type === 'thug' ? 15 : 14;
    g.translate(0, feet); g.scale(S, S);
    humanArt(g, {
      kind: type, dx, dy, pose,
      skin: SKIN[type] || '#e8b184',
      shirt: type === 'zombie' ? '#6b5a8c' : big ? (ZQ ? '#8c4a4a' : '#3b3552') : '#e05a5a',
      pants: type === 'thug' ? '#2a2540' : '#3b3552',
      boot: type === 'zombie' ? '#4a4030' : '#463a2c',
      bulk: big ? 1.16 : type === 'zombie' ? 0.94 : 1, zq: ZQ,
    });
  }
}
const FBOX = { bat: [64, 52, 26], eye: [52, 66, 30], skel: [48, 62, 20], ghost: [50, 56, 22], slime: [50, 52, 20], mini: [50, 52, 20], zombie: [58, 68, 26], brute: [86, 94, 34], thug: [64, 74, 28] };
function foeCv(type, col, di, pose) {
  const key = `f|${type}|${col}|${di}|${pose}`; if (SPR[key]) return SPR[key];
  const B = FBOX[type] || [56, 64, 22], a = di * DSTEP, base = type === 'mini' ? 'slime' : type;
  return spr(key, B[0], B[1], B[2], (g) => {
    foeArt(g, base, Math.cos(a), Math.sin(a), pose & 7, col);
    if (pose & 8) whiten(g, B[0], B[1]);
  });
}

/* ---------- sombras y botín ---------- */
function softSprite() {
  const S = 64, q = CV(S, S), g = q.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(0,0,0,.44)'); gr.addColorStop(0.45, 'rgba(0,0,0,.27)'); gr.addColorStop(0.78, 'rgba(0,0,0,.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); return q;
}
function shadow(x, y, r) { if (!softCv) softCv = softSprite(); c.drawImage(softCv, x - r * 1.7, y - r * 0.72, r * 3.4, r * 1.44); }
let dropCv = null;
function dropSprite() {
  const S = 56, q = CV(S, S), g = q.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(255,226,140,.55)'); gr.addColorStop(0.35, 'rgba(255,201,40,.2)'); gr.addColorStop(1, 'rgba(255,201,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); return q;
}
function drawDrop(d) { // botín con sombra y brillo
  if (!dropCv) dropCv = dropSprite();
  const yy = d.y + (d.k === 'coin' ? 0 : Math.sin(t * 4) * 2);
  shadow(d.x, d.y + 8, 6);
  c.globalAlpha = 0.55 + Math.sin(t * 5 + d.x) * 0.2; c.drawImage(dropCv, d.x - 14, yy - 14, 28, 28); c.globalAlpha = 1;
  if (d.k === 'coin') ART.coin(c, d.x, d.y, t, 7); else ART.heart(c, d.x, yy, 1.1, true);
}
function tankSprite(x, y, body, tur, col, recoil, mv) {
  c.save(); c.translate(x, y); c.rotate(body);
  for (const s of [-1, 1]) {
    ART.rr(c, -18, s * 11.5 - 5, 36, 10, 3.4); ART.fillOut(c, '#33333f', 2.4);
    c.save(); ART.rr(c, -18, s * 11.5 - 5, 36, 10, 3.4); c.clip();
    c.fillStyle = AL('#ffffff', 0.16); c.fillRect(-18, s * 11.5 - 5, 36, 3);
    c.fillStyle = AL('#000000', 0.3); c.fillRect(-18, s * 11.5 + 2.4, 36, 2.6);
    c.strokeStyle = AL('#ffffff', 0.22); c.lineWidth = 2; const off = mv ? (t * 40) % 6 : 0;
    for (let i = -18 + off; i < 19; i += 6) { c.beginPath(); c.moveTo(i, s * 11.5 - 5); c.lineTo(i, s * 11.5 + 5); c.stroke(); }
    c.restore();
    for (const wx of [-12, 0, 12]) { c.beginPath(); c.arc(wx, s * 11.5, 3, 0, R2); ART.fillOut(c, '#55556a', 1.6); }
  }
  ART.rr(c, -15, -9.5, 30, 19, 4.5); ART.fillOut(c, col, 2.8);
  c.save(); ART.rr(c, -15, -9.5, 30, 19, 4.5); c.clip();
  c.fillStyle = AL('#ffffff', 0.28); c.fillRect(-15, -9.5, 30, 4.4);
  c.fillStyle = AL('#000000', 0.26); c.fillRect(-15, 5, 30, 5);
  c.fillStyle = AL('#000000', 0.16); c.fillRect(-4, -10, 2.4, 20); c.fillRect(6, -10, 2.4, 20);
  c.restore();
  ART.rr(c, -14, -3, 5, 6, 1.6); ART.fillOut(c, '#2a2a36', 1.6);                       // rejilla del motor
  c.rotate(tur - body);
  ART.rr(c, 3 - recoil * 40, -3.4, 24, 6.8, 2.4); ART.fillOut(c, '#4a4a58', 2.2);
  c.fillStyle = AL('#ffffff', 0.25); c.fillRect(5 - recoil * 40, -2.6, 20, 1.8);
  ART.rr(c, 24 - recoil * 40, -4.4, 5, 8.8, 2); ART.fillOut(c, '#3a3a46', 2);           // bocacha
  c.beginPath(); c.arc(0, 0, 9, 0, R2); ART.fillOut(c, col, 2.8);
  c.fillStyle = AL('#ffffff', 0.34); c.beginPath(); c.arc(-2.6, -2.6, 4, 0, R2); c.fill();
  c.fillStyle = AL('#000000', 0.22); c.beginPath(); c.arc(2.4, 2.8, 3.4, 0, R2); c.fill();
  ART.rr(c, -9, -1.4, 4, 2.8, 1.2); ART.fillOut(c, '#2a2a36', 1.4);                     // escotilla
  c.restore();
}
function drawFoe(f) {
  const b = FOE[f.type][0], s = f.r / b, fl = f.fl > 0, col = fl ? '#fff' : FCOL[f.type];
  const fly = f.type === 'bat' || f.type === 'eye' || f.type === 'ghost';
  shadow(f.x, f.y + f.r * (fly ? 0.9 : 0.75), f.r * (fly ? 0.6 : 0.85));
  if (f.warn > 0) { c.globalAlpha = 0.5; c.strokeStyle = '#ff3b5c'; c.lineWidth = 3; c.beginPath(); c.arc(f.x, f.y, f.r + 8 + Math.sin(t * 30) * 3, 0, R2); c.stroke(); c.globalAlpha = 1; }
  if (f.type === 'tank') { tankSprite(f.x, f.y, f.body, f.a, col, f.recoil || 0, f.mv); if (f.boss) crown(f.x, f.y - f.r - 6); return; }
  const di = dirIdx(f.a || 0);
  let pose;
  if (fl) pose = 5;                                              // daño
  else if (f.dash > 0 || f.warn > 0 || (RANGED[f.type] && f.cd < 0.45)) pose = 4;  // aviso de ataque
  else if (f.mv || fly) pose = ((t * (fly ? 11 : 7) + f.ph) | 0) % 4;
  else pose = 1;
  const ph = t + f.ph, fly2 = f.type === 'bat' ? Math.sin(ph * 6) * 2 : f.type === 'eye' ? Math.sin(ph * 3) * 3 : f.type === 'ghost' ? Math.sin(ph * 2.6) * 3 : 0;
  const hop = (f.type === 'slime' || f.type === 'mini') && pose < 4 ? -Math.max(0, Math.sin(t * 5 + f.ph)) * 6 : 0;
  const q = foeCv(f.type, FCOL[f.type], di, pose | (fl ? 8 : 0));
  blit(q, f.x, f.y + (fly ? fly2 : 0) + hop, s, f.type === 'ghost' ? 0.9 : null);
  if (f.boss) crown(f.x, f.y - f.r * 1.55);
  else if (f.hp < f.max && f.max > 1) { const bw = f.r * 1.8; c.fillStyle = OUT; c.fillRect(f.x - bw / 2 - 1, f.y - f.r * 1.6 - 1, bw + 2, 5); c.fillStyle = '#ff5f7a'; c.fillRect(f.x - bw / 2, f.y - f.r * 1.6, bw * f.hp / f.max, 3); }
}
function crown(x, y) { c.beginPath(); c.moveTo(x - 10, y + 5); c.lineTo(x - 10, y - 4); c.lineTo(x - 5, y + 1); c.lineTo(x, y - 7); c.lineTo(x + 5, y + 1); c.lineTo(x + 10, y - 4); c.lineTo(x + 10, y + 5); c.closePath(); ART.fillOut(c, '#ffc928', 2); }
function drawHero() {
  if (p.inv > 0 && Math.floor(p.inv * 14) % 2) return;
  shadow(p.x, p.y + 11, 11);
  if (tankM) { tankSprite(p.x, p.y, p.body, p.aim, '#5ce1e6', p.recoil, p.mv); return; }
  const di = dirIdx(p.aim), pose = heroPose({ inv: p.inv, swing, recoil: p.recoil, mv: p.mv, ph: 0 });
  blit(heroCv('#5ce1e6', 'hood', di, pose), p.x, p.y + 11, 1.12);
  const hd = heroHand(di, pose), hx = p.x + hd[0], hy = p.y + 11 + hd[1];
  if (melee) {                                          // espada/puño del héroe en la mano delantera
    c.save(); c.translate(hx, hy);
    if (M === 'crypt') {
      c.rotate(p.aim + (swing > 0 ? -1.5 + (0.18 - swing) * 16 : 0.9));
      ART.rr(c, -2, -24, 4, 25, 1.8); ART.fillOut(c, '#dbe4f5', 2);
      c.fillStyle = AL('#ffffff', 0.6); c.fillRect(-1.3, -22, 1.3, 21);
      ART.rr(c, -6, 0, 12, 3.4, 1.4); ART.fillOut(c, '#ffc928', 1.8);
    } else { c.beginPath(); c.arc(0, 0, 5.4, 0, R2); ART.fillOut(c, '#ffd9b5', 2.2); }
    c.restore();
  } else {
    c.save(); c.translate(hx, hy); c.rotate(p.aim); const rc = p.recoil * 30;
    if (ZQ) { ART.rr(c, -2 - rc, -3.4, 22, 6.8, 2.4); ART.fillOut(c, '#4a4a58', 2.2); c.fillStyle = AL('#ffffff', 0.25); c.fillRect(0 - rc, -2.6, 16, 1.8); ART.rr(c, 1 - rc, 2, 6, 7, 1.6); ART.fillOut(c, '#3a3a46', 1.8); }
    else { ART.rr(c, -2 - rc, -2.4, 20, 4.8, 2.2); ART.fillOut(c, '#8a5a3b', 2); c.beginPath(); c.arc(20 - rc, 0, 4.4, 0, R2); ART.fillOut(c, TH.shot, 1.8); c.globalAlpha = 0.35 + Math.sin(t * 8) * 0.15; c.fillStyle = TH.shot; c.beginPath(); c.arc(20 - rc, 0, 9, 0, R2); c.fill(); c.globalAlpha = 1; }
    c.restore();
  }
}
function coinIcon(x, y) { ART.coin(c, x, y, 0, 8); }
function icon(o, x, y) {
  c.save(); c.translate(x, y);
  if (o === 'rate') { c.beginPath(); c.moveTo(4, -18); c.lineTo(-10, 2); c.lineTo(0, 2); c.lineTo(-4, 18); c.lineTo(10, -3); c.lineTo(0, -3); c.closePath(); ART.fillOut(c, '#ffc928', 2.5); }
  else if (o === 'dmg') { c.rotate(0.7); ART.rr(c, -3, -20, 6, 26, 2); ART.fillOut(c, '#e8eef8', 2); ART.rr(c, -10, 5, 20, 5, 2); ART.fillOut(c, '#ffc928', 2); ART.rr(c, -2.5, 10, 5, 9, 2); ART.fillOut(c, '#8a5a3b', 2); }
  else if (o === 'speed') { for (const dx of [-8, 4]) { c.beginPath(); c.moveTo(dx - 6, -12); c.lineTo(dx + 6, 0); c.lineTo(dx - 6, 12); c.lineTo(dx - 1, 0); c.closePath(); ART.fillOut(c, '#5ce1e6', 2); } }
  else if (o === 'hp') { ART.heart(c, 0, 2, 2.2, true); c.fillStyle = '#fff'; c.fillRect(8, -16, 10, 3); c.fillRect(11.5, -19.5, 3, 10); }
  else if (o === 'heal') { ART.rr(c, -4, -18, 8, 8, 2); ART.fillOut(c, '#c98a4b', 2); c.beginPath(); c.arc(0, 2, 12, 0, R2); ART.fillOut(c, '#ff5f7a', 2.5); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(-4, -2, 3.5, 0, R2); c.fill(); }
  else if (o === 'multi') { for (const a of [-0.45, 0, 0.45]) { c.beginPath(); c.arc(Math.sin(a) * 18, -Math.cos(a) * 14 + 6, 5, 0, R2); ART.fillOut(c, TH.shot || '#7df0ff', 2); } c.beginPath(); c.arc(0, 14, 5, 0, R2); ART.fillOut(c, '#8a5a3b', 2); }
  else if (o === 'pierce') { c.beginPath(); c.arc(4, 0, 10, 0, R2); ART.fillOut(c, '#ff5f7a', 2); c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(-18, 0); c.lineTo(18, 0); c.stroke(); c.strokeStyle = '#e8eef8'; c.lineWidth = 2.5; c.stroke(); c.beginPath(); c.moveTo(22, 0); c.lineTo(14, -6); c.lineTo(14, 6); c.closePath(); ART.fillOut(c, '#e8eef8', 2); }
  else if (o === 'reach') { c.strokeStyle = OUT; c.lineWidth = 9; c.beginPath(); c.arc(-8, 6, 20, -1.2, 0.6); c.stroke(); c.strokeStyle = '#e8eef8'; c.lineWidth = 5; c.stroke(); }
  c.restore();
}
function fitLab(s, maxW, size) { // cuerpo de letra que cabe de verdad (measureText), para nombres largos
  let z = size;
  while (z > 8) { c.font = `800 ${z}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; if (c.measureText(s).width <= maxW) break; z -= 1; }
  return z;
}
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function wrap(s, x, y, maxW, size, col) {
  c.font = `600 ${size}px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = col;
  let line = '', yy = y; for (const w of s.split(' ')) { const tl = line ? line + ' ' + w : w; if (c.measureText(tl).width > maxW && line) { c.fillText(line, x, yy); line = w; yy += size + 4; } else line = tl; } c.fillText(line, x, yy);
}
function draw() {
  if (VS) return vsDraw();
  if (COOP) return coopDraw();
  if (!floorCv) floorCv = renderFloor(); if (!vigCv) vigCv = renderVig();
  c.drawImage(floorCv, 0, 0, W, H); lights(); drawDoor();
  for (const w of [...walls].sort((a, b) => a.y + a.h - b.y - b.h)) block(w);
  for (const q of pend) { const k2 = 1 - q.t / Math.max(q.max, 0.9); c.save(); c.translate(q.x, q.y); c.rotate(t * 4); c.globalAlpha = 0.35 + k2 * 0.5; c.strokeStyle = q.boss ? '#ff3b5c' : '#b98cff'; c.lineWidth = 3; c.setLineDash([6, 6]); c.beginPath(); c.arc(0, 0, (q.boss ? 30 : 16) * (0.5 + k2 * 0.5), 0, R2); c.stroke(); c.setLineDash([]); c.fillStyle = q.boss ? 'rgba(255,59,92,.25)' : 'rgba(185,140,255,.25)'; c.fill(); c.restore(); c.globalAlpha = 1; }
  for (const d of drops) { if (d.t < 2 && Math.floor(d.t * 8) % 2) continue; drawDrop(d); }
  const ents = foes.map((f) => ({ y: f.y, f })).concat([{ y: p.y, hero: 1 }]).sort((a, b) => a.y - b.y);
  for (const e of ents) e.hero ? drawHero() : drawFoe(e.f);
  for (const s of shots) {
    if (tankM) { c.save(); c.translate(s.x, s.y); c.rotate(Math.atan2(s.vy, s.vx)); ART.rr(c, -6, -3, 12, 6, 3); ART.fillOut(c, '#3a3a46', 1.5); c.restore(); continue; }
    c.globalAlpha = 0.35; c.fillStyle = TH.shot; c.beginPath(); c.arc(s.x - s.vx * 0.02, s.y - s.vy * 0.02, 6, 0, R2); c.fill(); c.globalAlpha = 1;
    c.beginPath(); c.arc(s.x, s.y, 3.8, 0, R2); ART.fillOut(c, TH.shot, 1.5);
  }
  for (const s of eshots) { c.beginPath(); c.arc(s.x, s.y, s.r, 0, R2); ART.fillOut(c, tankM ? '#3a3a46' : '#ff5f7a', 2); if (!tankM) { c.fillStyle = '#ffe0e6'; c.beginPath(); c.arc(s.x - 1, s.y - 1, s.r * 0.4, 0, R2); c.fill(); } }
  if (swing > 0 && M === 'crypt') { const a = p.swingA, rr = 38 * upg.reach; c.globalAlpha = swing / 0.18; c.strokeStyle = '#fff'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.arc(p.x, p.y - 4, rr, a - 1.1, a + 1.1); c.stroke(); c.strokeStyle = '#7df0ff'; c.lineWidth = 3; c.stroke(); c.globalAlpha = 1; }
  if (swing > 0 && M === 'brawl') { const a = p.swingA; c.globalAlpha = swing / 0.18; c.strokeStyle = '#ffd23d'; c.lineWidth = 4; c.lineCap = 'round'; for (const da of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(p.x + Math.cos(a + da) * 22, p.y - 6 + Math.sin(a + da) * 22); c.lineTo(p.x + Math.cos(a + da) * 34 * upg.reach, p.y - 6 + Math.sin(a + da) * 34 * upg.reach); c.stroke(); } c.globalAlpha = 1; }
  c.drawImage(vigCv, 0, 0, W, H);
  if (k.ptr.down && !choice) { c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2; c.beginPath(); c.arc(k.ptr.sx, k.ptr.sy, 40, 0, R2); c.stroke(); k.circle(k.ptr.sx + k.clamp(k.ptr.x - k.ptr.sx, -40, 40), k.ptr.sy + k.clamp(k.ptr.y - k.ptr.sy, -40, 40), 14, 'rgba(255,255,255,.35)'); }
  // HUD
  if (p.max <= 7) for (let i = 0; i < p.max; i++) ART.heart(c, 18 + i * 21, 19, 1.1, i < p.hp); // con muchas vidas, icono + número para no invadir el centro
  else { ART.heart(c, 18, 19, 1.1, true); label(`${Math.max(0, p.hp)}/${p.max}`, 32, 10, 18, '#fff'); }
  coinIcon(W - 18, 19); label(`${score}`, W - 32, 10, 18, '#fff', 'right');
  label(`${TH.label} ${room}`, W - 14, Y1 + 1, 11, 'rgba(255,255,255,.85)', 'right');
  if (bossF && !bossF.dead) { const bw = Math.min(260, W - 160), x = W / 2 - bw / 2, y = Y1 + 3; c.fillStyle = OUT; c.fillRect(x - 2, y - 2, bw + 4, 12); c.fillStyle = '#5a1f2c'; c.fillRect(x, y, bw, 8); c.fillStyle = '#ff3b5c'; c.fillRect(x, y, bw * Math.max(0, bossF.hp) / bossF.max, 8); }
  if (msgT > 0 && !choice) { c.globalAlpha = Math.min(1, msgT * 2); c.font = '800 22px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(msg).width + 36; ART.rr(c, W / 2 - mw / 2, H / 2 - 64, mw, 40, 12); c.fillStyle = 'rgba(26,21,48,.82)'; c.fill(); label(msg, W / 2, H / 2 - 55, 22, '#ffc928', 'center'); c.globalAlpha = 1; }
  if (choice) {
    c.fillStyle = 'rgba(12,10,22,.72)'; c.fillRect(0, 0, W, H); label('Elige una mejora', W / 2, CY - 42, 24, '#fff', 'center');
    choice.opts.forEach((o, i) => {
      const x = cardX(i), sel = choice.sel === i, lift = sel ? -6 : 0;
      ART.rr(c, x, CY + lift, CW, CHt, 16); c.fillStyle = sel ? '#262046' : '#1b1733'; c.fill(); c.lineWidth = sel ? 3 : 2; c.strokeStyle = sel ? '#6e62f5' : 'rgba(255,255,255,.14)'; c.stroke();
      c.globalAlpha = Math.min(1, choice.t * 4); icon(o, x + CW / 2, CY + 48 + lift); label(UP[o][0], x + CW / 2, CY + 86 + lift, 18, '#fff', 'center'); wrap(UP[o][1], x + CW / 2, CY + 116 + lift, CW - 20, 13, '#aab0bf'); c.globalAlpha = 1;
    });
  }
}
