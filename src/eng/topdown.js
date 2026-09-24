/* Acción cenital con arte propio (ART). CFG.mode: 'dungeon' | 'crypt' | 'arena' | 'zombie' | 'brawl' | 'tank'
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
  tank:    { f1: '#93b05e', f2: '#8ba757', edge: '#4f6330', top: '#d6cc9f', face: '#a89d70', wall: 'sand', block: 'sand', foes: ['tank'], boss: 'tank', grass: true, label: 'Batalla', vig: 0.3 },
}[M];
const k = Kit({ w: W, h: H, title: CFG.title, bg: TH.edge }), c = k.ctx;
const melee = M === 'crypt' || M === 'brawl', tankM = M === 'tank';
/* radio, vida, velocidad, puntos */
const FOE = { bat: [10, 2, 92, 15], eye: [12, 3, 50, 25], skel: [11, 3, 62, 20], ghost: [12, 2, 46, 25], slime: [16, 3, 56, 20], mini: [9, 1, 95, 10], zombie: [11, 2, 42, 15], brute: [17, 6, 36, 50], thug: [13, 3, 74, 20], tank: [15, 3, 58, 60] };
const RANGED = { eye: 1, ghost: 1, tank: 1 };
const FCOL = { bat: '#8a6fd1', eye: '#ff5f7a', skel: '#f4efe6', ghost: '#b98cff', slime: '#8be04a', mini: '#b6f36a', zombie: '#8fc26a', brute: M === 'zombie' ? '#6fa04f' : '#d9a27a', thug: '#e05a5a', tank: '#e0564a' };
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
const wallAt = (x, y, r) => walls.find((w) => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h);
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
const ramp = () => { const d = Math.min(1, (room - 1) / 8); return d * d * (3 - 2 * d); };
const spK = () => 0.7 + 0.3 * ramp(), cdK = () => 1.6 - 0.6 * ramp(), bK = () => 0.8 + 0.2 * ramp();
function pickType() { const f = TH.foes; if (M === 'zombie' && Math.random() < room * 0.02) return 'brute'; return k.pick(f); }
function addFoe(type, x, y, boss) {
  const b = FOE[type], sc = 1 + (room - 1) * 0.12;
  const f = { type, x, y, r: b[0] * (boss ? 2.1 : 1), hp: Math.round(b[1] * sc * (boss ? 10 : 1)), sp: b[2] * (boss ? 0.7 : 1) * spK(), pts: b[3] * (boss ? 10 : 1), cd: k.rnd(0.9, 2) * cdK(), cd2: 1.5, a: 0, body: 0, kx: 0, ky: 0, fl: 0, ph: Math.random() * 6, boss, dash: 0, warn: 0, face: 1 };
  f.max = f.hp; foes.push(f); if (boss) bossF = f; return f;
}
function queue(type, boss, edge) { const [x, y] = place(boss ? 190 : 150, edge); const t0 = room === 1 && !edge ? 1.4 : 0.9; pend.push({ type, x, y, t: t0 + (edge ? 0 : pend.length * 0.12), max: t0 + pend.length * 0.12, boss }); }
function buildRoom() {
  room++; walls = []; foes = []; shots = []; eshots = []; pend = []; drops = []; cleared = false; door = false; bossF = null; floorCv = null; clearT = 0;
  const isBoss = room % 5 === 0, nb = isBoss ? 2 : M === 'brawl' ? k.ri(0, 2) : M === 'arena' ? k.ri(1, 3) : k.ri(3, 6);
  for (let i = 0, tries = 0; i < nb && tries < 120; tries++) {
    const round = TH.block === 'rock', w = round ? k.pick([40, 50]) : k.pick(tankM || M === 'zombie' ? [30, 60, 90] : [40, 40, 80, 120]), h = round ? w : k.pick([30, 40, 60]);
    const x = Math.round(k.rnd(X0 + 50, X1 - 50 - w) / 10) * 10, y = Math.round(k.rnd(Y0 + 40, Y1 - 30 - h) / 10) * 10;
    if (walls.some((q) => x < q.x + q.w + 44 && x + w + 44 > q.x && y < q.y + q.h + 44 && y + h + 44 > q.y)) continue;
    if (x < p.x + 70 && x + w > p.x - 70 && y < p.y + 70 && y + h > p.y - 70) continue;
    if (TH.door && x + w > X1 - 80 && y < H / 2 + 56 && y + h > H / 2 - 56) continue;
    walls.push({ x, y, w, h, hp: (TH.block === 'crate' && M === 'zombie') || (tankM && Math.random() < 0.5) ? 4 : 0, fl: 0, seed: Math.random() }); i++;
  }
  quota = 0;
  if (isBoss) { queue(TH.boss, true); if (M === 'zombie') quota = 6; }
  else if (M === 'zombie') { quota = 6 + room * 4; spawnT = 1.5; }
  else { const n = tankM ? Math.min(5, 1 + Math.ceil(room / 2)) : M === 'arena' ? Math.min(10, 2 + room) : Math.min(14, 3 + Math.round((room - 1) * 1.4)); for (let i = 0; i < n; i++) queue(pickType()); }
  msg = `${TH.label} ${room}${isBoss ? ' · Jefe' : ''}`; msgT = 1.8;
}
function reset() {
  VS = tankM && k.party && k.party.length >= 2 ? k.party.slice(0, 4).map((q) => ({ pl: q.p, col: k.pcol(q.p), name: 'J' + (q.p + 1), r: 11, wins: 0 })) : null;
  p = { x: TH.door ? X0 + 40 : W / 2, y: H / 2, r: 11, hp: 5, max: 5, a: 0, aim: 0, inv: 0, kx: 0, ky: 0, mv: false, face: 1, body: 0, recoil: 0 };
  room = 0; score = 0; t = 0; cool = 0; swing = 0; kills = 0; choice = null; upg = { rate: 1, dmg: 1, speed: 1, multi: 1, pierce: 0, reach: 1 }; if (VS) vsRound(true); else buildRoom();
}
/* ---------- Modo tele (fiesta): 2–4 tanques humanos, todos contra todos; gana quien gane 3 rondas.
   Si alguien se va, la CPU lleva su tanque hasta que vuelva; quien llega nuevo entra en la ronda siguiente. ---------- */
const inParty = (pl) => !!(k.party && k.party.some((x) => x.p === pl));
let vsCd = false, vsT = 0, vsZ = 0, VS = null, vsR = 0, vsBetween = 0, vsFreeze = 0, vsLast = null;
const VSWIN = 3, VSHP = 3;
function vsRound(first) {
  vsR = first ? 1 : vsR + 1; room = vsR; vsBetween = 0; vsFreeze = 1.3; vsLast = null; vsT = 0; vsZ = 0;
  walls = []; foes = []; shots = []; eshots = []; pend = []; drops = []; bossF = null; floorCv = null; quota = 0; cleared = true; door = false; choice = null;
  /* 2: esquinas opuestas; 3: arriba a los lados y abajo en el centro (misma distancia entre todos); 4: esquinas */
  const SP = VS.length === 3 ? [[X0 + 46, Y0 + 40], [X1 - 46, Y0 + 40], [W / 2, Y1 - 40]] : [[X0 + 46, Y0 + 40], [X1 - 46, Y1 - 40], [X1 - 46, Y0 + 40], [X0 + 46, Y1 - 40]];
  SP.forEach((sp) => sp.push(Math.atan2(H / 2 + 10 - sp[1], W / 2 - sp[0])));
  VS.forEach((q, i) => { const sp = SP[i]; q.cpu = !inParty(q.pl); q.ai = null; Object.assign(q, { x: sp[0], y: sp[1], body: sp[2], a: sp[2], aim: sp[2], hp: VSHP, inv: 1.3, alive: true, kx: 0, ky: 0, cool: 0.4, recoil: 0, mv: false }); });
  for (let i = 0, tries = 0; i < 6 && tries < 200; tries++) {
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
  return [Math.cos(a), Math.sin(a), los && off < 0.2 && d < 380 && Math.random() < 0.6];
}
const vsZone = () => { const R0 = Math.hypot((X1 - X0) / 2, (Y1 - Y0) / 2); return vsT <= 30 ? R0 : Math.max(60, R0 - (R0 - 60) * Math.min(1, (vsT - 30) / 25)); };
function vsUpdate(dt) {
  for (const w of walls) w.fl -= dt;
  if (vsBetween) { vsBetween -= dt; if (vsBetween <= 0) vsRound(); }
  if (vsCd) { vsCd = false; k.count(3); }
  vsFreeze = k.counting() ? 1 : 0;
  /* zona que se cierra: a los 30 s de ronda el círculo seguro encoge; fuera de él se pierde un corazón cada 1,5 s (evita rondas eternas con tanques escondidos) */
  if (!vsFreeze && !vsBetween) { vsT += dt; if (vsT > 30 && vsT - dt <= 30) { msg = '¡La zona se cierra!'; msgT = 2; k.sfx('lose'); }
    if (vsT > 30) { const zr = vsZone(); for (const q of VS) if (q.alive && Math.hypot(q.x - (X0 + X1) / 2, q.y - (Y0 + Y1) / 2) > zr) { q.zt = (q.zt || 0) + dt; if (q.zt > 1.5) { q.zt = 0; q.hp--; k.sfx('hurt'); k.burst(q.x, q.y, '#ff5f7a', 10, 120); if (q.hp <= 0) { q.alive = false; k.burst(q.x, q.y, q.col, 36, 260); k.sfx('explode'); k.shake(9); } } } else if (q.alive) q.zt = 0; } }
  VS.forEach((q, i) => {
    if (!q.alive) return;
    q.inv -= dt; q.cool -= dt; q.recoil = Math.max(0, q.recoil - dt);
    const pd = k.pad(q.pl), HS = new Set(pd.held); if (q.pl === 0 && !q.cpu) for (const x of k.held) HS.add(x); /* J1 también con teclado */
    let mx = 0, my = 0, cf = false; if (q.cpu) { if (!vsBetween) [mx, my, cf] = vsCpu(q, dt); } else { if (HS.has('left')) mx--; if (HS.has('right')) mx++; if (HS.has('up')) my--; if (HS.has('down')) my++; }
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    if (vsFreeze > 0) { mx = my = 0; }
    q.mv = ml > 0.1 && !vsFreeze; if (q.mv) { q.a = Math.atan2(my, mx); q.body += k.clamp(((q.a - q.body + 3 * Math.PI) % R2) - Math.PI, -8 * dt, 8 * dt); }
    q.aim += k.clamp(((q.a - q.aim + 3 * Math.PI) % R2) - Math.PI, -10 * dt, 10 * dt); /* la torreta apunta hacia donde te mueves */
    move(q, (mx * 130 + q.kx) * dt, (my * 130 + q.ky) * dt); const dec = Math.pow(0.002, dt); q.kx *= dec; q.ky *= dec;
    for (const o of VS) if (o !== q && o.alive) { const ex = q.x - o.x, ey = q.y - o.y, e = Math.hypot(ex, ey); if (e > 0 && e < q.r + o.r + 4) move(q, ex / e * 60 * dt, ey / e * 60 * dt); }
    if ((q.cpu ? cf : HS.has('a') || pd.hit.has('a')) && q.cool <= 0 && !vsFreeze && !vsBetween) {
      q.cool = 0.55; q.recoil = 0.1; k.sfx('shoot');
      shots.push({ x: q.x + Math.cos(q.aim) * 18, y: q.y + Math.sin(q.aim) * 18, vx: Math.cos(q.aim) * 380, vy: Math.sin(q.aim) * 380, life: 1.6, b: 1, own: i, col: q.col });
    }
  });
  const bounce = (s) => { s.x -= s.vx * dt; s.y -= s.vy * dt; if (rectHit(s.x + s.vx * dt, s.y, 2)) s.vx *= -1; else s.vy *= -1; };
  for (const s of shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) s.dead = true;
    VS.forEach((q, i) => { if (s.dead || !q.alive || (i === s.own && s.b > 0) || Math.hypot(s.x - q.x, s.y - q.y) > q.r + 4) return; s.dead = true; if (q.inv > 0) return;
      q.hp--; q.inv = 0.6; const a = Math.atan2(s.vy, s.vx); q.kx = Math.cos(a) * 200; q.ky = Math.sin(a) * 200; k.sfx('hit'); k.shake(4); k.burst(q.x, q.y, q.col, 10, 150);
      if (q.hp <= 0) { q.alive = false; k.burst(q.x, q.y, q.col, 36, 260); k.burst(q.x, q.y, '#fff', 12, 160); k.sfx('explode'); k.shake(9); if (i !== s.own) k.float('¡Tanque destruido!', q.x, q.y - 26, VS[s.own].col); } });
    if (s.dead) continue;
    const w = wallAt(s.x, s.y, 3);
    if (w && w.hp) { s.dead = true; w.hp--; w.fl = 0.1; k.sfx('hit'); if (w.hp <= 0) { w.dead = true; k.burst(w.x + w.w / 2, w.y + w.h / 2, TH.top, 20, 200); k.sfx('explode'); } }
    else if (rectHit(s.x, s.y, 3)) { if (s.b > 0) { s.b--; bounce(s); } else { s.dead = true; k.burst(s.x, s.y, '#fff', 3, 60); } }
  }
  shots = shots.filter((s) => !s.dead); walls = walls.filter((w) => !w.dead);
  const al = VS.filter((q) => q.alive);
  if (!vsBetween && al.length <= 1) {
    vsLast = al[0] || null; if (vsLast) { vsLast.wins++; k.sfx('win'); }
    const champ = VS.find((q) => q.wins >= VSWIN);
    if (champ) { k.win(champ.cpu ? 'Gana la CPU' : `¡Gana ${champ.name}!`, champ.col, VS.map((q) => `<b style="color:${q.col}">${q.name} ${q.wins}</b>`).join(' · ') + '<br>Toca para la revancha', champ.wins); return; }
    vsBetween = 2; msg = vsLast ? `Ronda para ${vsLast.name}` : 'Ronda nula'; msgT = 1.8;
  }
}
function vsDraw() {
  if (!floorCv) floorCv = renderFloor(); if (!vigCv) vigCv = renderVig();
  c.drawImage(floorCv, 0, 0, W, H); lights();
  for (const w of [...walls].sort((a, b) => a.y + a.h - b.y - b.h)) block(w);
  for (const q of [...VS].sort((a, b) => a.y - b.y)) { if (!q.alive || (q.inv > 0 && !vsFreeze && Math.floor(q.inv * 14) % 2)) continue; shadow(q.x, q.y + 10, 10); tankSprite(q.x, q.y, q.body, q.aim, q.col, q.recoil, q.mv); label(q.cpu ? 'CPU' : q.name, q.x, q.y - 34, 14, q.cpu ? '#e8e4f4' : q.col, 'center'); }
  for (const s of shots) { c.save(); c.translate(s.x, s.y); c.rotate(Math.atan2(s.vy, s.vx)); ART.rr(c, -6, -3, 12, 6, 3); ART.fillOut(c, s.col, 1.5); c.restore(); }
  if (vsT > 30) { const zr = vsZone(), zx = (X0 + X1) / 2, zy = (Y0 + Y1) / 2; c.save(); c.beginPath(); c.rect(0, 0, W, H); c.arc(zx, zy, zr, 0, R2, true); c.fillStyle = 'rgba(200,30,60,.28)'; c.fill();
    c.beginPath(); c.arc(zx, zy, zr, 0, R2); c.lineWidth = 4; c.setLineDash([14, 10]); c.lineDashOffset = -vsT * 30; c.strokeStyle = '#ff5f7a'; c.stroke(); c.restore(); }
  c.drawImage(vigCv, 0, 0, W, H);
  const pw = Math.min(150, (W - 20) / VS.length - 6);
  VS.forEach((q, i) => { const x = 10 + i * (pw + 6); ART.rr(c, x, 5, pw, 26, 9); c.fillStyle = q.alive ? 'rgba(26,21,48,.85)' : 'rgba(26,21,48,.45)'; c.fill(); c.lineWidth = 2; c.strokeStyle = q.col; c.stroke();
    label(q.cpu ? 'CPU' : q.name, x + 8, 10, 14, q.alive ? q.col : '#77708f'); for (let h = 0; h < VSHP; h++) ART.heart(c, x + 44 + h * 17, 18, 0.85, h < q.hp && q.alive); label(`${q.wins}`, x + pw - 8, 9, 16, '#ffc928', 'right'); });
  label(`A ${VSWIN} rondas`, W - 14, Y1 + 1, 11, 'rgba(255,255,255,.85)', 'right');
  if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); c.font = '800 22px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(msg).width + 36, my = vsFreeze ? 44 : H / 2 - 64; ART.rr(c, W / 2 - mw / 2, my, mw, 40, 12); c.fillStyle = 'rgba(26,21,48,.82)'; c.fill(); label(msg, W / 2, my + 9, 22, vsLast ? vsLast.col : '#ffc928', 'center'); c.globalAlpha = 1; }
}
k.onParty = () => {
  if (k.st !== 'play' || !VS) { if (k.st !== 'play') reset(); return; }
  for (const q of VS) { q.cpu = !inParty(q.pl); if (q.cpu) q.ai = null; }
  for (const x of k.party || []) if (VS.length < 4 && !VS.some((q) => q.pl === x.p)) VS.push({ pl: x.p, col: k.pcol(x.p), name: 'J' + (x.p + 1), r: 11, wins: 0, alive: false, hp: 0, cpu: false, x: -99, y: -99, body: 0, aim: 0 });
};
reset(); k.show(CFG.title, CFG.help);
function hurt(n, sx, sy) {
  if (p.inv > 0 || k.st !== 'play') return;
  p.hp -= n; p.inv = 1; k.shake(6); k.flash('rgba(255,60,80,.3)'); k.sfx('hurt');
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
  if (quota > 0) { spawnT -= dt; if (spawnT <= 0 && foes.length + pend.length < 10 + room * 2) { spawnT = Math.max(0.4, 1.7 - room * 0.12); quota--; queue(pickType(), false, true); } }
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
    if (!s.dead && Math.hypot(s.x - p.x, s.y - p.y) < p.r + s.r - 2) { s.dead = true; hurt(1, s.x - s.vx, s.y - s.vy); }
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
    if (d < f.r + p.r - 2) hurt(f.type === 'brute' || f.boss ? 2 : 1, f.x, f.y);
  }
  foes = foes.filter((f) => !f.dead); shots = shots.filter((s) => !s.dead); eshots = eshots.filter((s) => !s.dead);
  // botín
  for (const d of drops) {
    d.t -= dt; const dd = Math.hypot(p.x - d.x, p.y - d.y) || 1;
    if (dd < 80 || cleared) { const v = cleared ? 420 : 280; d.x += (p.x - d.x) / dd * v * dt; d.y += (p.y - d.y) / dd * v * dt; }
    if (dd < 16) { d.got = true; if (d.k === 'coin') { score += d.v; k.sfx('coin'); k.float(`+${d.v}`, d.x, d.y - 10, '#ffc928'); } else { p.hp = Math.min(p.max, p.hp + 1); k.sfx('pop'); k.float('+1', d.x, d.y - 10, '#ff5f7a'); } }
  }
  drops = drops.filter((d) => !d.got && (d.t > 0 || cleared));
  // sala superada
  if (!cleared && !foes.length && !pend.length && quota <= 0) { cleared = true; clearT = 0; score += 50 * room; k.sfx('win'); if (TH.door) { door = true; msg = 'Sala despejada: sal por la puerta'; msgT = 2; } else { msg = `¡${TH.label} superada!`; msgT = 1.4; } }
  if (cleared) { clearT += dt; if (!TH.door && clearT > 1.2 && !drops.length) openChoice(); }
  if (door && p.x > X1 - 20 && Math.abs(p.y - H / 2) < 34) openChoice();
}, draw);

/* ---------- Escenario (se cachea por sala) ---------- */
function renderFloor() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  let sd = room * 7919 + 13; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  g.fillStyle = TH.edge; g.fillRect(0, 0, W, H);
  if (TH.plank) {
    for (let y = Y0, row = 0; y < Y1; y += 16, row++) { let x = X0 - (row % 3) * 40; while (x < X1) { const len = 80 + Math.floor(r() * 4) * 20; g.fillStyle = r() < 0.5 ? TH.f1 : TH.f2; g.fillRect(x, y, len, 16); g.fillStyle = TH.grout; g.fillRect(x, y + 15, len, 1.5); g.fillRect(x + len - 1.5, y, 1.5, 16); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 4, y + 7, 2, 2); g.fillRect(x + len - 7, y + 7, 2, 2); x += len; } }
  } else {
    for (let y = Y0, j = 0; y < Y1; y += 32, j++) for (let x = X0, i = 0; x < X1; x += 32, i++) {
      g.fillStyle = (i + j) % 2 ? TH.f1 : TH.f2; g.fillRect(x, y, 32, 32);
      g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${(r() * 0.05).toFixed(3)})`; g.fillRect(x, y, 32, 32);
      if (TH.grout) { g.fillStyle = TH.grout; g.fillRect(x, y, 32, 2); g.fillRect(x, y, 2, 32); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x + 2, y + 2, 30, 2); if (r() < 0.12) { g.strokeStyle = TH.grout; g.lineWidth = 1.5; g.beginPath(); const cx = x + 8 + r() * 16, cy = y + 8 + r() * 16; g.moveTo(cx, cy); g.lineTo(cx + 6, cy + 4); g.lineTo(cx + 9, cy + 11); g.stroke(); } }
      if (TH.grass) for (let n = 0; n < 3; n++) { const bx = x + r() * 28, by = y + 4 + r() * 26; g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.14)'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 2, by - 6); g.moveTo(bx + 3, by); g.lineTo(bx + 4, by - 5); g.stroke(); }
      if (TH.dirt) for (let n = 0; n < 2; n++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.1)'; g.beginPath(); g.ellipse(x + r() * 30, y + r() * 30, 2 + r() * 3, 1.5 + r() * 2, 0, 0, R2); g.fill(); }
    }
    if (TH.grass && r() < 2) for (let n = 0; n < 8; n++) { const fx = X0 + 20 + r() * (X1 - X0 - 40), fy = Y0 + 20 + r() * (Y1 - Y0 - 40); for (let q = 0; q < 5; q++) { g.fillStyle = M === 'tank' ? '#e8e0b0' : '#fff'; g.beginPath(); g.arc(fx + Math.cos(q * 1.26) * 3, fy + Math.sin(q * 1.26) * 3, 2.2, 0, R2); g.fill(); } g.fillStyle = '#ffd23d'; g.beginPath(); g.arc(fx, fy, 2, 0, R2); g.fill(); }
  }
  // sombra al pie del muro superior
  const sh = g.createLinearGradient(0, Y0, 0, Y0 + 22); sh.addColorStop(0, 'rgba(0,0,0,.38)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(X0, Y0, X1 - X0, 22);
  // muro superior (cara frontal)
  g.fillStyle = TH.face; g.fillRect(0, 8, W, Y0 - 8); g.fillStyle = TH.top; g.fillRect(0, 0, W, 10);
  g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 2;
  if (TH.wall === 'brick') for (let y = 12, row = 0; y < Y0; y += 9, row++) { g.beginPath(); g.moveTo(0, y + 9); g.lineTo(W, y + 9); g.stroke(); for (let x = (row % 2) * 12; x < W; x += 24) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 9); g.stroke(); } }
  else if (TH.wall === 'fence' || TH.wall === 'panel') for (let x = 0; x < W; x += TH.wall === 'fence' ? 16 : 48) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, Y0); g.stroke(); if (TH.wall === 'panel') { g.strokeRect(x + 6, 14, 36, Y0 - 20); } }
  else if (TH.wall === 'stone') for (let x = 0, n = 0; x < W; x += 28 + (n++ % 3) * 6) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, Y0); g.stroke(); }
  else if (TH.wall === 'sand') { for (let row = 0; row < 3; row++) for (let x = (row % 2) * 13 - 13; x < W; x += 26) { g.beginPath(); g.ellipse(x + 13, 14 + row * 9, 13, 6, 0, 0, R2); g.fillStyle = row % 2 ? '#c8bc8e' : '#d6cc9f'; g.fill(); g.stroke(); } }
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 8, W, 2);
  // laterales e inferior (vistos desde arriba)
  g.fillStyle = TH.top; g.fillRect(0, Y0, X0, H); g.fillRect(X1, Y0, W - X1, H); g.fillRect(0, Y1, W, H - Y1);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X0 - 3, Y0, 3, Y1 - Y0); g.fillRect(X1, Y0, 3, Y1 - Y0); g.fillRect(X0, Y1, X1 - X0, 3);
  g.strokeStyle = OUT; g.lineWidth = 3; g.strokeRect(X0 - 1.5, Y0 - 1.5, X1 - X0 + 3, Y1 - Y0 + 3); g.strokeRect(1.5, 1.5, W - 3, H - 3);
  return cv;
}
function renderVig() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72); gr.addColorStop(0, 'rgba(10,6,20,0)'); gr.addColorStop(1, `rgba(10,6,20,${TH.vig})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H); return cv;
}
function lights() {
  if (!TH.light) return;
  for (let x = 190; x < W - 120; x += 130) { // fuera de la zona del marcador
    const fl = 0.85 + Math.sin(t * 13 + x) * 0.08 + Math.sin(t * 7.3 + x * 2) * 0.07;
    c.globalAlpha = 0.09 * fl; c.fillStyle = TH.light === 'candle' ? '#b98cff' : '#ffb13d'; c.beginPath(); c.arc(x, Y0 + 6, 62 * fl, 0, R2); c.fill(); c.globalAlpha = 1;
    if (TH.light === 'torch') { ART.rr(c, x - 3, 14, 6, 16, 2); ART.fillOut(c, '#6b4329', 2); c.fillStyle = '#ff7a2d'; c.beginPath(); c.ellipse(x, 10, 5 * fl, 8 * fl, 0, 0, R2); c.fill(); c.fillStyle = '#ffd23d'; c.beginPath(); c.ellipse(x, 12, 2.6, 4.5 * fl, 0, 0, R2); c.fill(); }
    else if (TH.light === 'candle') { for (const o of [-6, 5]) { ART.rr(c, x + o - 2.5, 20 + (o > 0 ? 3 : 0), 5, 12, 1.5); ART.fillOut(c, '#efe6d0', 1.5); c.fillStyle = '#c9a8ff'; c.beginPath(); c.ellipse(x + o, 16 + (o > 0 ? 3 : 0), 2.4, 4 * fl, 0, 0, R2); c.fill(); } }
    else if (TH.light === 'lantern') { c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 12); c.stroke(); ART.rr(c, x - 8, 12, 16, 20, 7); ART.fillOut(c, '#e0463c', 2); c.fillStyle = 'rgba(255,220,120,.5)'; c.fillRect(x - 3, 15, 6, 14); }
    else if (TH.light === 'lamp') { ART.rr(c, x - 7, 12, 14, 12, 3); ART.fillOut(c, '#3a3a46', 2); c.fillStyle = `rgba(255,214,110,${0.7 * fl})`; c.fillRect(x - 4, 15, 8, 6); }
  }
}
function drawDoor() {
  if (!TH.door) return;
  const y = H / 2 - 30;
  c.fillStyle = door ? '#0d0a18' : TH.face; c.fillRect(X1 - 2, y, W - X1 + 2, 60); c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(X1 - 2, y, W - X1 + 2, 60);
  if (!door) { c.fillStyle = '#9a8f7a'; for (let i = 0; i < 4; i++) { ART.rr(c, X1 + 1, y + 6 + i * 14, W - X1 - 4, 5, 2); ART.fillOut(c, '#b5ab96', 1.5); } }
  else { const a = 0.5 + Math.sin(t * 5) * 0.3; c.fillStyle = `rgba(255,201,40,${a})`; c.beginPath(); c.moveTo(X1 - 34, H / 2 - 10); c.lineTo(X1 - 20, H / 2); c.lineTo(X1 - 34, H / 2 + 10); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); }
}
function block(w) {
  const { x, y } = w, bw = w.w, bh = w.h, fl = w.fl > 0, s = TH.block;
  c.fillStyle = 'rgba(0,0,0,.28)'; ART.rr(c, x + 5, y + 7, bw, bh, 6); c.fill();
  if (s === 'rock') {
    ART.rr(c, x, y - 6, bw, bh + 6, bw * 0.42); ART.fillOut(c, fl ? '#fff' : '#9a93ad', 2.5);
    c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(x + bw * 0.35, y + bh * 0.2, bw * 0.2, bh * 0.12, -0.4, 0, R2); c.fill();
    c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(x + bw * 0.6, y + bh * 0.72, bw * 0.28, bh * 0.14, 0, 0, R2); c.fill(); return;
  }
  if (s === 'sand') {
    for (let row = 0; row < Math.max(1, Math.round(bh / 12)); row++) for (let cx = x + (row % 2 ? 10 : 0); cx + 10 < x + bw + 2; cx += 20) { c.beginPath(); c.ellipse(cx + 10, y + row * 12 + 4, 11, 7, 0, 0, R2); ART.fillOut(c, fl ? '#fff' : row % 2 ? '#c8bc8e' : '#d6cc9f', 2); c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx + 4, y + row * 12 + 4); c.lineTo(cx + 16, y + row * 12 + 4); c.stroke(); }
    return;
  }
  const FH = 10, top = fl ? '#fff' : s === 'crate' ? TH.top : TH.top, face = s === 'crate' ? '#8a5a33' : TH.face;
  ART.rr(c, x, y + bh - FH - 2, bw, FH + 4, 3); ART.fillOut(c, face, 2.5);
  ART.rr(c, x, y - 8, bw, bh - FH + 6, 4); ART.fillOut(c, top, 2.5);
  const tx = x, ty = y - 8, th = bh - FH + 6;
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2;
  if (s === 'crate') { for (let yy = ty + 10; yy < ty + th - 4; yy += 10) { c.beginPath(); c.moveTo(tx + 3, yy); c.lineTo(tx + bw - 3, yy); c.stroke(); } c.strokeRect(tx + 4, ty + 4, bw - 8, th - 8); for (let xx = x + 12; xx < x + bw; xx += 12) { c.beginPath(); c.moveTo(xx, y + bh - FH); c.lineTo(xx, y + bh); c.stroke(); } }
  else if (s === 'tomb') { c.strokeRect(tx + 5, ty + 5, bw - 10, th - 10); c.fillStyle = 'rgba(0,0,0,.25)'; const cx = tx + bw / 2, cy = ty + th / 2; c.fillRect(cx - 2, cy - Math.min(12, th / 2 - 6), 4, Math.min(24, th - 12)); c.fillRect(cx - 7, cy - 5, 14, 4); }
  else { for (let yy = ty + 8, row = 0; yy < ty + th; yy += 8, row++) { c.beginPath(); c.moveTo(tx + 2, yy); c.lineTo(tx + bw - 2, yy); c.stroke(); } for (let xx = x + 12; xx < x + bw; xx += 16) { c.beginPath(); c.moveTo(xx, y + bh - FH); c.lineTo(xx, y + bh); c.stroke(); } }
  c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(tx + 4, ty + 3, bw - 8, 2);
  if (w.hp && w.hp < 4) { c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + bw * 0.3, ty + 3); c.lineTo(x + bw * 0.42, ty + th * 0.5); c.lineTo(x + bw * 0.34, ty + th - 3); if (w.hp < 3) { c.moveTo(x + bw * 0.7, ty + 3); c.lineTo(x + bw * 0.62, ty + th * 0.6); } c.stroke(); }
}

/* ---------- Personajes ---------- */
function shadow(x, y, r) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x, y, r, r * 0.4, 0, 0, R2); c.fill(); }
function humanoid(r, skin, shirt, pants, o) {
  const wk = o.mv ? Math.sin(t * 12 + o.ph) : 0, f = o.face;
  for (const s of [-1, 1]) { ART.rr(c, s * r * 0.38 - r * 0.2 + (s * wk * r * 0.12), r * 0.25, r * 0.4, r * 0.7 - (s * wk > 0 ? r * 0.12 : 0), r * 0.15); ART.fillOut(c, pants, 1.8); }
  ART.rr(c, -r * 0.72, -r * 0.55, r * 1.44, r * 1.02, r * 0.35); ART.fillOut(c, shirt, 2);
  if (o.zombie) { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.moveTo(-r * 0.5, r * 0.45); c.lineTo(-r * 0.3, r * 0.1); c.lineTo(-r * 0.1, r * 0.45); c.fill(); }
  if (o.zombie) for (const s of [-1, 1]) { ART.rr(c, f > 0 ? r * 0.1 : -r * 1.05, -r * 0.42 + s * r * 0.22 + wk * s * 2, r * 0.95, r * 0.3, r * 0.14); ART.fillOut(c, skin, 1.8); }
  else for (const s of [-1, 1]) { const sw = o.punch && s === f ? r * 0.9 : wk * s * r * 0.2; c.beginPath(); c.arc(s * r * 0.8 + (s === f ? sw : 0), -r * 0.1 - (s === f && o.punch ? r * 0.2 : 0), r * 0.26, 0, R2); ART.fillOut(c, skin, 1.8); }
  c.beginPath(); c.arc(0, -r * 0.98, r * 0.62, 0, R2); ART.fillOut(c, skin, 2);
  if (o.band) { c.fillStyle = o.band; c.fillRect(-r * 0.6, -r * 1.25, r * 1.2, r * 0.2); c.beginPath(); c.moveTo(-f * r * 0.55, -r * 1.2); c.lineTo(-f * r * 1.0, -r * 1.35 + Math.sin(t * 10) * 2); c.lineTo(-f * r * 0.95, -r * 1.05); c.fill(); }
  if (o.hair) { c.beginPath(); c.arc(0, -r * 1.05, r * 0.63, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); ART.fillOut(c, o.hair, 1.8); }
  c.fillStyle = o.eye || OUT; for (const s of [-0.5, 0.35]) { c.beginPath(); c.arc(f * r * 0.22 + s * r * 0.5, -r * 0.98, r * (o.zombie ? 0.1 : 0.09), 0, R2); c.fill(); }
  if (o.zombie) { c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(f * r * 0.05, -r * 0.7); c.lineTo(f * r * 0.35, -r * 0.72); c.stroke(); }
}
function tankSprite(x, y, body, tur, col, recoil, mv) {
  c.save(); c.translate(x, y); c.rotate(body);
  for (const s of [-1, 1]) { ART.rr(c, -17, s * 11 - 4.5, 34, 9, 3); ART.fillOut(c, '#3a3a46', 2); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1.5; const off = mv ? (t * 40) % 6 : 0; for (let i = -15 + off; i < 16; i += 6) { c.beginPath(); c.moveTo(i, s * 11 - 3); c.lineTo(i, s * 11 + 3); c.stroke(); } }
  ART.rr(c, -14, -9, 28, 18, 4); ART.fillOut(c, col, 2.5); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(-11, -7, 22, 3); c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(-11, 4, 22, 3);
  c.rotate(tur - body); ART.rr(c, 2 - recoil * 40, -3, 22, 6, 2); ART.fillOut(c, '#4a4a58', 2);
  c.beginPath(); c.arc(0, 0, 8, 0, R2); ART.fillOut(c, col, 2.5); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.arc(-2, -2, 3, 0, R2); c.fill();
  c.restore();
}
function drawFoe(f) {
  const b = FOE[f.type][0], s = f.r / b, fl = f.fl > 0, col = fl ? '#fff' : FCOL[f.type], fly = f.type === 'bat' || f.type === 'eye' || f.type === 'ghost';
  shadow(f.x, f.y + f.r * (fly ? 0.9 : 0.75), f.r * (fly ? 0.6 : 0.85));
  if (f.warn > 0) { c.globalAlpha = 0.5; c.strokeStyle = '#ff3b5c'; c.lineWidth = 3; c.beginPath(); c.arc(f.x, f.y, f.r + 8 + Math.sin(t * 30) * 3, 0, R2); c.stroke(); c.globalAlpha = 1; }
  if (f.type === 'tank') { tankSprite(f.x, f.y, f.body, f.a, col, f.recoil || 0, f.mv); if (f.boss) crown(f.x, f.y - f.r - 6); return; }
  c.save(); c.translate(f.x, f.y); c.scale(s, s);
  const ph = t + f.ph;
  if (f.type === 'bat') {
    c.translate(0, -8 + Math.sin(ph * 6) * 2); const fl2 = Math.sin(ph * 22);
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 5, -2); c.quadraticCurveTo(sd * 14, -10 - fl2 * 6, sd * 20, -2 - fl2 * 8); c.lineTo(sd * 15, 1); c.lineTo(sd * 11, -1); c.lineTo(sd * 7, 4); c.closePath(); ART.fillOut(c, fl ? '#fff' : '#5b3f8a', 2); }
    c.beginPath(); c.arc(0, 0, 8, 0, R2); ART.fillOut(c, col, 2.2);
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 3, -6); c.lineTo(sd * 6, -12); c.lineTo(sd * 7, -5); c.fill(); }
    c.fillStyle = '#ffd23d'; c.beginPath(); c.arc(-3, -1, 2, 0, R2); c.arc(3, -1, 2, 0, R2); c.fill();
  } else if (f.type === 'eye') {
    c.translate(0, -6 + Math.sin(ph * 3) * 3);
    c.beginPath(); c.arc(0, 0, 12, 0, R2); ART.fillOut(c, fl ? '#fff' : '#f4efe6', 2.5);
    c.strokeStyle = 'rgba(220,60,80,.55)'; c.lineWidth = 1.2; for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; c.beginPath(); c.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); c.lineTo(Math.cos(a + 0.2) * 7, Math.sin(a + 0.2) * 7); c.stroke(); }
    const ix = Math.cos(f.a) * 4, iy = Math.sin(f.a) * 4; c.beginPath(); c.arc(ix, iy, 6, 0, R2); ART.fillOut(c, col, 1.8); c.fillStyle = OUT; c.beginPath(); c.arc(ix * 1.2, iy * 1.2, 3, 0, R2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(ix - 2, iy - 2, 1.5, 0, R2); c.fill();
    c.fillStyle = '#6b4fa0'; c.beginPath(); c.arc(0, 0, 12.5, Math.PI * 1.1, Math.PI * 1.9); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
  } else if (f.type === 'skel') {
    const wk = f.mv ? Math.sin(ph * 12) : 0;
    c.strokeStyle = OUT; c.lineCap = 'round'; for (const sd of [-1, 1]) { c.lineWidth = 5; c.beginPath(); c.moveTo(sd * 3, 3); c.lineTo(sd * 4 + sd * wk * 2, 11); c.stroke(); c.lineWidth = 2.5; c.strokeStyle = '#e8e2d0'; c.stroke(); c.strokeStyle = OUT; }
    ART.rr(c, -6.5, -6, 13, 11, 4); ART.fillOut(c, fl ? '#fff' : '#e8e2d0', 2); c.strokeStyle = 'rgba(26,21,48,.5)'; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-4, -3 + i * 3); c.lineTo(4, -3 + i * 3); c.stroke(); }
    for (const sd of [-1, 1]) { c.strokeStyle = OUT; c.lineWidth = 4.5; c.beginPath(); c.moveTo(sd * 6, -4); c.lineTo(f.face * 9 + sd * 2, -2 + sd * 3 + wk * 2); c.stroke(); c.strokeStyle = '#e8e2d0'; c.lineWidth = 2; c.stroke(); }
    c.beginPath(); c.arc(0, -13, 8, 0, R2); ART.fillOut(c, col, 2.2); ART.rr(c, -4, -8, 8, 5, 2); ART.fillOut(c, col, 1.8);
    c.fillStyle = OUT; c.beginPath(); c.arc(f.face * 2 - 3, -13, 2.4, 0, R2); c.arc(f.face * 2 + 3, -13, 2.4, 0, R2); c.fill(); c.fillStyle = '#ff5f5f'; c.beginPath(); c.arc(f.face * 2 - 3, -13, 1, 0, R2); c.arc(f.face * 2 + 3, -13, 1, 0, R2); c.fill();
  } else if (f.type === 'ghost') { c.globalAlpha = 0.88; ART.enemy(c, 'ghost', -12, -14, 24, 24, { t: ph, face: f.face, col }); c.globalAlpha = 1; }
  else if (f.type === 'slime' || f.type === 'mini') { const hop = Math.max(0, Math.sin(t * 5 + f.ph)) * 5; c.translate(0, -hop); ART.enemy(c, 'slime', -b, -b * 0.8, b * 2, b * 1.7, { t: ph, face: f.face, col }); }
  else if (f.type === 'zombie') humanoid(b, fl ? '#fff' : '#8fc26a', '#6b5a8c', '#3b3552', { mv: f.mv, ph: f.ph, face: f.face, zombie: true, eye: '#ff3b3b' });
  else if (f.type === 'brute') M === 'zombie' ? humanoid(b, fl ? '#fff' : '#6fa04f', '#8c4a4a', '#3b3552', { mv: f.mv, ph: f.ph, face: f.face, zombie: true, eye: '#ffd23d' }) : humanoid(b, fl ? '#fff' : '#d9a27a', '#3b3552', '#2a2540', { mv: f.mv, ph: f.ph, face: f.face, punch: f.dash > 0 });
  else if (f.type === 'thug') humanoid(b, fl ? '#fff' : '#f0c8a0', '#e05a5a', '#2a2540', { mv: f.mv, ph: f.ph, face: f.face, band: '#1a1530', hair: '#3a2a4a', punch: Math.sin(ph * 3) > 0.9 });
  c.restore();
  if (f.boss) crown(f.x, f.y - f.r * 1.55);
  else if (f.hp < f.max && f.max > 1) { const bw = f.r * 1.8; c.fillStyle = OUT; c.fillRect(f.x - bw / 2 - 1, f.y - f.r * 1.6 - 1, bw + 2, 5); c.fillStyle = '#ff5f7a'; c.fillRect(f.x - bw / 2, f.y - f.r * 1.6, bw * f.hp / f.max, 3); }
}
function crown(x, y) { c.beginPath(); c.moveTo(x - 10, y + 5); c.lineTo(x - 10, y - 4); c.lineTo(x - 5, y + 1); c.lineTo(x, y - 7); c.lineTo(x + 5, y + 1); c.lineTo(x + 10, y - 4); c.lineTo(x + 10, y + 5); c.closePath(); ART.fillOut(c, '#ffc928', 2); }
function drawHero() {
  if (p.inv > 0 && Math.floor(p.inv * 14) % 2) return;
  shadow(p.x, p.y + 10, 10);
  if (tankM) { tankSprite(p.x, p.y, p.body, p.aim, '#5ce1e6', p.recoil, p.mv); return; }
  const sword = M === 'crypt' ? (swing > 0 ? -1.9 + (0.18 - swing) * 18 : 0.6) : 0;
  ART.hero(c, p.x, p.y + 11, 0.72, { face: p.face, state: p.mv ? 'run' : 'idle', t, col: '#5ce1e6', sword });
  if (M === 'brawl' && swing > 0) { const a = p.swingA, d = 14 + (0.18 - swing) * 90; c.beginPath(); c.arc(p.x + Math.cos(a) * d, p.y - 6 + Math.sin(a) * d, 6, 0, R2); ART.fillOut(c, '#ffd9b5', 2); }
  if (!melee) {
    c.save(); c.translate(p.x + p.face * 2, p.y - 6); c.rotate(p.aim); const rc = p.recoil * 30;
    if (M === 'zombie') { ART.rr(c, 2 - rc, -3, 16, 6, 2); ART.fillOut(c, '#4a4a58', 2); ART.rr(c, 4 - rc, 1, 5, 6, 1.5); ART.fillOut(c, '#3a3a46', 1.5); }
    else { ART.rr(c, 2 - rc, -2, 17, 4, 2); ART.fillOut(c, '#8a5a3b', 1.8); c.beginPath(); c.arc(20 - rc, 0, 4, 0, R2); ART.fillOut(c, TH.shot, 1.8); c.globalAlpha = 0.35 + Math.sin(t * 8) * 0.15; c.fillStyle = TH.shot; c.beginPath(); c.arc(20 - rc, 0, 8, 0, R2); c.fill(); c.globalAlpha = 1; }
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
  if (!floorCv) floorCv = renderFloor(); if (!vigCv) vigCv = renderVig();
  c.drawImage(floorCv, 0, 0, W, H); lights(); drawDoor();
  for (const w of [...walls].sort((a, b) => a.y + a.h - b.y - b.h)) block(w);
  for (const q of pend) { const k2 = 1 - q.t / Math.max(q.max, 0.9); c.save(); c.translate(q.x, q.y); c.rotate(t * 4); c.globalAlpha = 0.35 + k2 * 0.5; c.strokeStyle = q.boss ? '#ff3b5c' : '#b98cff'; c.lineWidth = 3; c.setLineDash([6, 6]); c.beginPath(); c.arc(0, 0, (q.boss ? 30 : 16) * (0.5 + k2 * 0.5), 0, R2); c.stroke(); c.setLineDash([]); c.fillStyle = q.boss ? 'rgba(255,59,92,.25)' : 'rgba(185,140,255,.25)'; c.fill(); c.restore(); c.globalAlpha = 1; }
  for (const d of drops) { if (d.t < 2 && Math.floor(d.t * 8) % 2) continue; if (d.k === 'coin') ART.coin(c, d.x, d.y, t, 7); else ART.heart(c, d.x, d.y + Math.sin(t * 4) * 2, 1.1, true); }
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
