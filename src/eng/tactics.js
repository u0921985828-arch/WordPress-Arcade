/* Tácticas por turnos contra la IA con arte propio. CFG.hex = false (cuadrícula) | true (hexágonos)
 * Tablero en relieve cacheado, unidades por clase (caballero, arquera, mago), movimiento animado, flechas y hechizos, turno de la IA visible. */
/* disposición: vertical (móvil de pie) = tablero arriba y panel abajo, los bandos de abajo (tú) a arriba (IA); horizontal = panel lateral */
const PORT = innerHeight > innerWidth, HEX = !!CFG.hex, OUT = ART.OUT, R2 = 6.2832, W = PORT ? 400 : 640, H = PORT ? 720 : 480;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1d2036' }), c = k.ctx;
const COLS = PORT ? (HEX ? 9 : 8) : HEX ? 11 : 10, ROWS = PORT ? (HEX ? 9 : 10) : 8, S = HEX ? (PORT ? 27 : 26) : 46, DEP = 6; // S: lado (cuadrícula) o radio (hex); DEP: grosor del relieve
const OX = PORT ? (HEX ? 11 : 16) : 14, OY = PORT ? 70 : HEX ? 46 : 48; // en vertical, margen para que las cabezas de la fila 0 no queden bajo pausa/sonido
const PX = PORT ? W : 486, PY = PORT ? 562 : H; // panel lateral (horizontal) o inferior (vertical)
/* coordenadas de bando: a = avance desde tu lado (0) hacia la IA, b = lateral */
const LONG = PORT ? ROWS : COLS, SIDE = PORT ? COLS : ROWS, P = (a, b) => (PORT ? [b, ROWS - 1 - a] : [a, b]);
const endR = () => (PORT ? { x: 282, y: PY + 70, w: 110, h: 74 } : { x: PX + 4, y: H - 58, w: W - PX - 12, h: 44 });
const TYPES = { K: { n: 'Caballero', hp: 12, atk: 5, mv: 3, rg: 1, col: '#5ca8ff' }, A: { n: 'Arquera', hp: 8, atk: 4, mv: 3, rg: 3, col: '#5bc85a' }, M: { n: 'Mago', hp: 7, atk: 6, mv: 2, rg: 2, col: '#b98cff' } };
const AICOL = { K: '#e0564a', A: '#ff9a3d', M: '#c0527a' };
let units, rocks, sel, turn, level, score, reach, aiT, log, aiQueue = [], aiStep, aiFocus, projs, banner, cur, kbd, boardCv, tt = 0, endT;

const pos = (x, y) => HEX ? [OX + S + x * S * 1.5, OY + S * 0.866 + y * S * 1.732 + (x & 1) * S * 0.866] : [OX + x * S + S / 2, OY + y * S + S / 2];
function nbs(x, y) { if (!HEX) return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]; const o = x & 1; return [[x, y - 1], [x, y + 1], [x - 1, y - 1 + o], [x - 1, y + o], [x + 1, y - 1 + o], [x + 1, y + o]]; }
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const inb = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
const at = (x, y) => units.find((u) => u.hp > 0 && u.x === x && u.y === y);
const blocked = (x, y) => rocks.has(x + ',' + y) || at(x, y);
function search(sx, sy, pass) { const d = { [sx + ',' + sy]: 0 }, prev = {}, q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [nx, ny] of nbs(x, y)) { const kk = nx + ',' + ny; if (!inb(nx, ny) || d[kk] !== undefined || (pass && !pass(nx, ny))) continue; d[kk] = d[x + ',' + y] + 1; prev[kk] = [x, y]; q.push([nx, ny]); } } return { d, prev }; }
const dists = (sx, sy, pass) => search(sx, sy, pass).d;
const range = (a, b) => dists(a.x, a.y)[b.x + ',' + b.y];
const inRange = (a, b) => range(a, b) <= TYPES[a.t].rg;
function cellAt(px, py) { let best = null, bd = HEX ? S * 0.95 : S * 0.72; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const [cx, cy] = pos(x, y), d = HEX ? Math.hypot(px - cx, py - cy) : Math.max(Math.abs(px - cx), Math.abs(py - cy)) * 1.41; if (d < bd) { bd = d; best = [x, y]; } } return best; }

function build() {
  rocks = new Set(); for (let i = 0; i < 8 + level; i++) rocks.add(P(k.ri(2, LONG - 3), k.ri(0, SIDE - 1)).join());
  const mk = (t, x, y, team) => ({ t, x, y, team, hp: TYPES[t].hp + (team === 'ai' ? Math.min(8, level - 2) : 0), max: TYPES[t].hp + (team === 'ai' ? Math.min(8, level - 2) : 0), moved: false, acted: false, face: team === 'me' ? 1 : -1, hf: 0, ph: Math.random() * 6 });
  units = [mk('K', ...P(0, 2), 'me'), mk('A', ...P(0, 4), 'me'), mk('M', ...P(0, 6), 'me'), mk('K', ...P(LONG - 1, 1), 'ai'), mk('K', ...P(LONG - 1, 5), 'ai'), mk('A', ...P(LONG - 1, 3), 'ai')];
  if (level > 2) units.push(mk('M', ...P(LONG - 1, 7), 'ai')); if (level > 4) units.push(mk('A', ...P(LONG - 2, 0), 'ai'));
  units.forEach((u) => rocks.delete(u.x + ',' + u.y));
  // que ninguna unidad quede encerrada entre rocas
  const me = units[0], dd = dists(me.x, me.y, (x, y) => !rocks.has(x + ',' + y)); for (const u of units) if (dd[u.x + ',' + u.y] === undefined) { nbs(u.x, u.y).forEach(([x, y]) => rocks.delete(x + ',' + y)); }
  turn = 'me'; sel = null; reach = null; log = 'Tu turno: elige una unidad'; projs = []; aiQueue = []; aiStep = 0; aiFocus = null; endT = 0; cur = P(0, 2); kbd = false;
  banner = { txt: 'Batalla ' + level, t: 1.4 }; bake();
}
function reset() { if (!level || k.st === 'over' && !units.some((u) => u.team === 'me' && u.hp > 0)) { level = 1; score = 0; } build(); }
const busy = () => projs.length > 0 || units.some((u) => u.mv || u.lunge);

/* ---------- Acciones ---------- */
function moveTo(u, x, y) {
  const { prev } = search(u.x, u.y, (a, b) => !blocked(a, b)); const pts = [[x, y]]; let kk = x + ',' + y; while (prev[kk] && !(prev[kk][0] === u.x && prev[kk][1] === u.y)) { pts.unshift(prev[kk]); kk = prev[kk].join(); } pts.unshift([u.x, u.y]);
  u.mv = { pts: pts.map(([a, b]) => pos(a, b)), t: 0 }; u.x = x; u.y = y; u.moved = true; k.sfx('jump');
}
function attack(a, b) {
  const dmg = TYPES[a.t].atk + k.ri(-1, 1), [ax, ay] = pos(a.x, a.y), [bx, by] = pos(b.x, b.y); a.acted = true; a.moved = true; a.face = bx >= ax ? 1 : -1;
  const hit = () => { b.hp -= dmg; b.hf = 0.25; b.face = ax >= bx ? 1 : -1; k.burst(bx, by - 14, a.t === 'M' ? '#d9b3ff' : '#ff9a3c', 12, 140); k.float('-' + dmg, bx, by - 36, '#ff8a8a'); k.sfx('hit'); k.shake(3);
    log = `${TYPES[a.t].n} ${a.team === 'me' ? '' : 'rival '}golpea: -${dmg}`; if (b.hp <= 0) { b.dying = 0.6; k.burst(bx, by - 10, '#fff', 16, 180); k.sfx('explode'); log = `¡${TYPES[b.t].n} ${b.team === 'me' ? 'tuyo ' : 'rival '}derrotado!`; if (b.team === 'ai') { score += 50; k.float('+50', bx, by - 56, '#ffd23d'); } } checkEnd(); };
  if (a.t === 'K') { a.lunge = { dx: (bx - ax) * 0.45, dy: (by - ay) * 0.45, t: 0, done: false, hit }; k.sfx('shoot'); }
  else { projs.push({ kind: a.t, sx: ax, sy: ay - 18, ex: bx, ey: by - 16, t: 0, dur: 0.18 + Math.hypot(bx - ax, by - ay) / 520, hit }); k.sfx('shoot'); }
}
function checkEnd() {
  if (!units.some((u) => u.team === 'ai' && u.hp > 0)) { score += 200 * level; level++; k.st = 'over'; k.sfx('win'); k.confetti(); k.show('¡Victoria!', `${score} puntos · Récord ${k.best(CFG.id, score)}<br>Toca para la siguiente batalla`); }
  else if (!units.some((u) => u.team === 'me' && u.hp > 0)) { const b = level; level = 1; k.lose(CFG.id, score, 'Derrota', `Batalla ${b}`); }
}
function endTurn() { if (turn !== 'me' || busy()) return; units.forEach((u) => { u.moved = false; u.acted = false; }); turn = 'ai'; sel = null; reach = null; aiT = 0.5; aiStep = 0; aiQueue = units.filter((u) => u.team === 'ai' && u.hp > 0); log = 'Turno de la IA'; banner = { txt: 'Turno rival', t: 1, red: true }; k.sfx('click'); }
function selectUnit(u) { sel = u; reach = u.moved ? {} : dists(u.x, u.y, (x, y) => !blocked(x, y)); k.sfx('click'); log = `${TYPES[u.t].n}: ${u.moved ? 'ataca a un enemigo en rojo' : 'mueve a una casilla azul o ataca'}`; }
function tapCell(cell) {
  if (!cell) { sel = null; reach = null; return; }
  const u = at(...cell);
  if (u && u.team === 'me' && !u.acted) return selectUnit(u);
  if (sel && u && u.team === 'ai' && inRange(sel, u)) { attack(sel, u); sel = null; reach = null; return; }
  if (sel && !u && reach && reach[cell.join()] !== undefined && reach[cell.join()] <= TYPES[sel.t].mv && !sel.moved) { moveTo(sel, cell[0], cell[1]); reach = {};
    if (!units.some((q) => q.team === 'ai' && q.hp > 0 && inRange(sel, q))) { log = 'Sin enemigos a tu alcance'; sel.acted = true; sel = null; } else log = 'Elige un enemigo en rojo'; return; }
  if (u && u.team === 'ai') { log = `${TYPES[u.t].n} rival · ${Math.max(0, u.hp)}/${u.max} PV`; }
  sel = null; reach = null;
}
/* IA: una unidad cada vez, con foco visible */
/* IA que mejora con la batalla: al principio a veces no remata al más débil (1: 45 % → 100 % en la 7). */
function aiTarget(u) { const ok = units.filter((f) => f.team === 'me' && f.hp > 0 && inRange(u, f)); if (!ok.length) return null; return Math.random() < Math.min(1, 0.45 + (level - 1) * 0.1) ? ok.sort((a, b) => a.hp - b.hp)[0] : k.pick(ok); }
function aiThink(u) {
  const foes = units.filter((q) => q.team === 'me' && q.hp > 0); if (!foes.length) return null;
  let tg = foes.filter((f) => inRange(u, f)).sort((a, b) => a.hp - b.hp)[0]; if (tg) return { tg };
  const d = dists(u.x, u.y, (x, y) => !blocked(x, y)), goal = foes.sort((a, b) => range(u, a) - range(u, b))[0]; let best = null, bv = 1e9;
  for (const [kk, v] of Object.entries(d)) if (v <= TYPES[u.t].mv) { const [x, y] = kk.split(',').map(Number); if (at(x, y) && at(x, y) !== u) continue; const dist = dists(x, y)[goal.x + ',' + goal.y]; const s2 = Math.abs(dist - TYPES[u.t].rg) + (dist < TYPES[u.t].rg ? 0.5 : 0) + v * 0.01; if (s2 < bv) { bv = s2; best = [x, y]; } }
  return { move: best && (best[0] !== u.x || best[1] !== u.y) ? best : null };
}

level = 0; reset();
/* al girar el móvil fuera de partida se recarga con la otra disposición */
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
k.show(CFG.title, 'Toca una unidad tuya, luego una casilla azul para mover o un enemigo en rojo para atacar. «Fin turno» cuando acabes. Teclado: flechas, A y X.');

k.run((dt) => {
  if (!k.gate(reset)) return;
  tt += dt; if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
  /* animaciones */
  for (const u of units) { u.hf = Math.max(0, u.hf - dt); if (u.dying) u.dying = Math.max(0, u.dying - dt);
    if (u.mv) { u.mv.t += dt * 7; if (u.mv.t >= u.mv.pts.length - 1) u.mv = null; else { const i = Math.floor(u.mv.t), a = u.mv.pts[i], b = u.mv.pts[i + 1]; if (b[0] !== a[0]) u.face = Math.sign(b[0] - a[0]); } }
    if (u.lunge) { const l = u.lunge; l.t += dt; if (l.t > 0.12 && !l.done) { l.done = true; l.hit(); } if (l.t >= 0.3) u.lunge = null; } }
  for (const p of projs) { p.t += dt; if (p.t >= p.dur) { p.dead = true; p.hit(); } } projs = projs.filter((p) => !p.dead);
  if (k.st !== 'play') return;
  /* turno de la IA */
  if (turn === 'ai') {
    if (busy()) return; aiT -= dt; if (aiT > 0) return;
    while (aiQueue.length && aiQueue[0].hp <= 0) aiQueue.shift();
    const u = aiQueue[0];
    if (!u) { turn = 'me'; aiFocus = null; log = 'Tu turno'; banner = { txt: 'Tu turno', t: 1 }; units.forEach((q) => { q.moved = false; q.acted = false; }); return; }
    if (aiStep === 0) { aiFocus = u; aiStep = 1; aiT = 0.35; log = `${TYPES[u.t].n} rival piensa…`; }
    else if (aiStep === 1) { const pl = aiThink(u); aiStep = 2; aiT = 0.15; if (pl && pl.move) moveTo(u, pl.move[0], pl.move[1]); }
    else { const tg = aiTarget(u); if (tg) attack(u, tg); aiQueue.shift(); aiStep = 0; aiT = 0.3; }
    return;
  }
  /* turno propio */
  if (busy()) return;
  if (!units.some((u) => u.team === 'me' && u.hp > 0 && !u.acted)) { endT += dt; if (endT > 0.5) { endT = 0; endTurn(); } return; } else endT = 0;
  const dir = k.hit.has('left') ? [-1, 0] : k.hit.has('right') ? [1, 0] : k.hit.has('up') ? [0, -1] : k.hit.has('down') ? [0, 1] : null;
  if (dir) { kbd = true; cur = [k.clamp(cur[0] + dir[0], 0, COLS - 1), k.clamp(cur[1] + dir[1], 0, ROWS - 1)]; }
  if (k.hit.has('a')) { kbd = true; tapCell(cur.slice()); }
  if (k.hit.has('b')) endTurn();
  if (!k.ptr.hit) return; kbd = false;
  { const r = endR(); if (k.ptr.x > r.x - 4 && k.ptr.x < r.x + r.w + 4 && k.ptr.y > r.y - 6 && k.ptr.y < r.y + r.h + 6) return endTurn(); }
  const cell = cellAt(k.ptr.x, k.ptr.y); if (cell) cur = cell; tapCell(cell);
}, draw);

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function shape(g, x, y, inset) { if (HEX) { g.beginPath(); for (let i = 0; i < 6; i++) g.lineTo(x + Math.cos(i * 1.0472) * (S - inset), y + Math.sin(i * 1.0472) * (S - inset)); g.closePath(); } else ART.rr(g, x - S / 2 + inset, y - S / 2 + inset, S - inset * 2, S - inset * 2, 5); }
/* fondo + tablero en relieve, cacheado a 2× por batalla */
function bake() {
  boardCv = document.createElement('canvas'); boardCv.width = W * 2; boardCv.height = H * 2; const g = boardCv.getContext('2d'); g.scale(2, 2);
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2b2f57'); gr.addColorStop(1, '#171a31'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(rnd(i) * W, rnd(i + 5) * H, 20 + rnd(i + 9) * 60, 0, R2); g.fill(); }
  const cells = []; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) cells.push([x, y, ...pos(x, y)]); cells.sort((a, b) => a[3] - b[3]);
  // sombra del tablero
  g.fillStyle = 'rgba(0,0,0,.35)'; for (const [, , px, py] of cells) { shape(g, px + 4, py + DEP + 6, -1); g.fill(); }
  for (const [x, y, px, py] of cells) {
    const r = rnd(x * 13 + y * 7 + level), base = (x + y) % 2 ? [120, 190, 100] : [108, 178, 92], v = (r - 0.5) * 14, col = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v * 0.6 | 0})`;
    shape(g, px, py + DEP, 0); ART.fillOut(g, '#6b4a2f', 2); shape(g, px, py, 0); ART.fillOut(g, col, 2);
    g.fillStyle = 'rgba(255,255,255,.14)'; shape(g, px, py - 1, 4); g.fill(); shape(g, px, py + 1, 5); g.fillStyle = col; g.fill();
    for (let i = 0; i < 4; i++) { const bx = px + (rnd(x + i * 3 + y * 11) - 0.5) * S * 0.9, by = py + (rnd(x * 5 + i + y) - 0.5) * S * 0.7; g.strokeStyle = 'rgba(40,100,40,.45)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 1.5, by - 4); g.moveTo(bx, by); g.lineTo(bx + 1.5, by - 4); g.stroke(); }
    if (rnd(x * 3 + y * 17) < 0.12) { g.fillStyle = ['#fff6c2', '#ff9ad5', '#fff'][x % 3]; g.beginPath(); g.arc(px + S * 0.2, py + S * 0.15, 2, 0, R2); g.fill(); }
  }
  // obstáculos: rocas y árboles
  for (const [x, y, px, py] of cells) { if (!rocks.has(x + ',' + y)) continue; const s = HEX ? 0.9 : 1;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px, py + 9 * s, 16 * s, 6 * s, 0, 0, R2); g.fill();
    if (rnd(x * 7 + y * 3 + level) < 0.55) { g.beginPath(); g.moveTo(px - 16 * s, py + 9 * s); g.quadraticCurveTo(px - 17 * s, py - 12 * s, px - 2 * s, py - 15 * s); g.quadraticCurveTo(px + 16 * s, py - 12 * s, px + 16 * s, py + 9 * s); g.closePath(); ART.fillOut(g, '#8f8ca6', 2.5); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(px - 6 * s, py - 7 * s, 5 * s, 3 * s, -0.4, 0, R2); g.fill(); g.strokeStyle = 'rgba(26,21,48,.4)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + 3 * s, py - 8 * s); g.lineTo(px + 7 * s, py + 3 * s); g.stroke(); }
    else { g.save(); g.translate(px, py + 10 * s); g.scale(0.62 * s, 0.62 * s); ART.deco(g, { deco: 'tree', near: '#3f9e4a' }, 0, 0, 32, 0); g.restore(); } }
  // panel lateral y barra superior
  if (PORT) { ART.rr(g, 8, PY, 266, H - PY - 8, 12); ART.fillOut(g, '#262a4c', 2.5); ART.rr(g, 12, PY + 4, 258, 18, 8); g.fillStyle = 'rgba(255,255,255,.06)'; g.fill(); }
  else { ART.rr(g, PX + 4, OY - 4, W - PX - 12, H - OY - 72, 12); ART.fillOut(g, '#262a4c', 2.5); ART.rr(g, PX + 8, OY, W - PX - 20, 18, 8); g.fillStyle = 'rgba(255,255,255,.06)'; g.fill(); }
  gr = g.createLinearGradient(0, 0, 0, 34); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 34);
}
/* soldado por clase; team 'me' humano, 'ai' trasgo */
function drawUnit(u, x, y, s, alpha) {
  const T = TYPES[u.t], me = u.team === 'me', col = me ? T.col : AICOL[u.t], skin = me ? '#ffd9b5' : '#8fd06a', f = u.face;
  const bob = Math.sin(tt * 3 + u.ph) * 1.2, fl = u.hf > 0 ? Math.sin(u.hf * 60) * 3 : 0;
  c.save(); c.translate(x + fl, y); c.globalAlpha = alpha;
  c.fillStyle = me ? 'rgba(92,168,255,.55)' : 'rgba(255,80,80,.5)'; c.beginPath(); c.ellipse(0, 2, 16 * s, 6 * s, 0, 0, R2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.5; c.stroke();
  c.scale(s * f, s); c.translate(0, bob);
  const walk = u.mv ? Math.sin(tt * 22) * 3 : 0;
  // piernas
  [[-4, walk], [4, -walk]].forEach(([lx, w]) => { ART.rr(c, lx - 3 + w * 0.3, -9, 6, 9, 2.5); ART.fillOut(c, me ? '#2c2748' : '#3d2a1e', 2); });
  // capa trasera / carcaj
  if (u.t === 'A') { ART.rr(c, -12, -26, 6, 16, 2); ART.fillOut(c, '#8a5a33', 2); c.strokeStyle = '#f4efe6'; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-11 + i * 2, -26); c.lineTo(-11 + i * 2, -30); c.stroke(); } }
  if (u.t === 'M') { c.beginPath(); c.moveTo(-5, -24); c.quadraticCurveTo(-14, -12, -12, -2); c.lineTo(0, -4); c.closePath(); ART.fillOut(c, col, 2); }
  // cuerpo
  ART.rr(c, -9, -24, 18, 17, 6); ART.fillOut(c, u.t === 'K' ? '#b8c0d2' : col); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(-6, -22, 4, 11);
  if (u.t === 'K') { c.fillStyle = col; c.fillRect(-9, -15, 18, 4); }
  // cabeza
  c.beginPath(); c.arc(1, -33, 9.5, 0, R2); ART.fillOut(c, skin);
  if (!me) { c.beginPath(); c.moveTo(-6, -35); c.lineTo(-15, -40); c.lineTo(-8, -30); ART.fillOut(c, skin, 2); }
  c.fillStyle = OUT; const bl = Math.sin(tt * 2.1 + u.ph) > 0.97 ? 0.2 : 1; c.beginPath(); c.ellipse(5, -33, 1.6, 2.4 * bl, 0, 0, R2); c.ellipse(0.5, -33, 1.4, 2.2 * bl, 0, 0, R2); c.fill();
  if (!me) { c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-1, -37); c.lineTo(3, -36); c.moveTo(4, -36.5); c.lineTo(7, -37.5); c.stroke(); }
  // equipo por clase
  const att = u.lunge ? Math.sin(Math.min(1, u.lunge.t / 0.3) * Math.PI) : 0;
  if (u.t === 'K') { // yelmo, escudo y espada
    c.beginPath(); c.arc(1, -35, 10.5, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(11, -31); c.lineTo(-9, -31); ART.fillOut(c, '#c7cedc', 2); c.fillStyle = OUT; c.fillRect(2, -35, 9, 2.5);
    c.beginPath(); c.moveTo(-2, -45); c.quadraticCurveTo(-8, -54, -14, -46); c.quadraticCurveTo(-8, -48, -3, -43); ART.fillOut(c, col, 1.8);
    c.save(); c.translate(9, -18); c.rotate(-0.6 + att * 1.9); ART.rr(c, -1.5, -24, 5, 22, 2); ART.fillOut(c, '#eef2f8', 2); ART.rr(c, -4, -3, 11, 4, 1.5); ART.fillOut(c, '#f2d15c', 1.5); c.restore();
    c.beginPath(); c.arc(-3, -15, 7.5, 0, R2); ART.fillOut(c, col, 2); c.beginPath(); c.arc(-3, -15, 3, 0, R2); ART.fillOut(c, '#f2d15c', 1.5);
  } else if (u.t === 'A') { // capucha y arco
    c.beginPath(); c.arc(1, -34, 11, Math.PI * 0.9, Math.PI * 2.05); c.lineTo(10, -29); c.quadraticCurveTo(0, -38, -9, -28); c.closePath(); ART.fillOut(c, col, 2);
    c.beginPath(); c.moveTo(-9, -32); c.lineTo(-15, -26); c.lineTo(-8, -27); ART.fillOut(c, col, 1.8);
    c.save(); c.translate(11, -18); c.beginPath(); c.arc(0, 0, 11, -1.25, 1.25); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 2.6; c.strokeStyle = '#c98a4b'; c.stroke();
    c.strokeStyle = '#f4efe6'; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.cos(-1.25) * 11, Math.sin(-1.25) * 11); c.lineTo(-2, 0); c.lineTo(Math.cos(1.25) * 11, Math.sin(1.25) * 11); c.stroke(); c.restore();
  } else { // sombrero picudo y bastón
    c.beginPath(); c.moveTo(-10, -38); c.quadraticCurveTo(0, -46, 12, -38); c.lineTo(12, -36); c.lineTo(-10, -36); ART.fillOut(c, col, 2);
    c.beginPath(); c.moveTo(-6, -39); c.quadraticCurveTo(2, -52, -4, -60); c.quadraticCurveTo(6, -52, 8, -39); ART.fillOut(c, col, 2); c.fillStyle = '#f2d15c'; c.fillRect(-5, -42, 12, 2.5);
    c.save(); c.translate(11, -10); ART.rr(c, -1.5, -30, 4, 34, 2); ART.fillOut(c, '#8a5a33', 1.8); const gl = 0.5 + Math.sin(tt * 5 + u.ph) * 0.2; c.fillStyle = me ? `rgba(200,160,255,${gl})` : `rgba(255,120,160,${gl})`; c.beginPath(); c.arc(0.5, -33, 8, 0, R2); c.fill(); c.beginPath(); c.arc(0.5, -33, 4.5, 0, R2); ART.fillOut(c, me ? '#e6d4ff' : '#ffc0d4', 1.8); c.restore();
  }
  if (u.hf > 0.12) { c.globalAlpha = alpha * 0.6; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -24, 13, 22, 0, 0, R2); c.fill(); }
  c.restore();
}
function hpBar(u, x, y) { const w = 30, q = Math.max(0, u.hp / u.max); c.fillStyle = OUT; ART.rr(c, x - w / 2 - 2, y - 2, w + 4, 8, 3); c.fill(); c.fillStyle = '#4a1f2a'; c.fillRect(x - w / 2, y, w, 4); c.fillStyle = u.team === 'me' ? (q > 0.35 ? '#7cf06a' : '#ffd23d') : '#ff5f5f'; c.fillRect(x - w / 2, y, w * q, 4); }
function unitScreen(u) { let [x, y] = pos(u.x, u.y);
  if (u.mv) { const i = Math.min(Math.floor(u.mv.t), u.mv.pts.length - 2), q = u.mv.t - i, a = u.mv.pts[i], b = u.mv.pts[i + 1]; x = a[0] + (b[0] - a[0]) * q; y = a[1] + (b[1] - a[1]) * q - Math.abs(Math.sin(q * Math.PI)) * 5; }
  if (u.lunge) { const q = Math.sin(Math.min(1, u.lunge.t / 0.3) * Math.PI); x += u.lunge.dx * q; y += u.lunge.dy * q; }
  return [x, y + (HEX ? 8 : 10)]; }
function draw() {
  c.drawImage(boardCv, 0, 0, W, H);
  const pulse = 0.5 + Math.sin(tt * 5) * 0.2, rd = sel ? dists(sel.x, sel.y) : null;
  // casillas resaltadas
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const [px, py] = pos(x, y), kk = x + ',' + y, u = at(x, y);
    if (sel && reach && !sel.moved && reach[kk] !== undefined && reach[kk] <= TYPES[sel.t].mv && reach[kk] > 0 && !u) { shape(c, px, py, 3); c.fillStyle = `rgba(80,160,255,${pulse * 0.7})`; c.fill(); c.strokeStyle = '#bfe0ff'; c.lineWidth = 2; c.stroke(); }
    else if (sel && !u && !rocks.has(kk) && rd[kk] <= TYPES[sel.t].rg) { c.fillStyle = 'rgba(255,120,120,.35)'; c.beginPath(); c.arc(px, py, 3, 0, R2); c.fill(); }
    if (sel && u && u.team === 'ai' && rd[kk] <= TYPES[sel.t].rg) { shape(c, px, py, 3); c.fillStyle = `rgba(255,70,90,${pulse * 0.75})`; c.fill(); c.strokeStyle = '#ffd0d0'; c.lineWidth = 2; c.stroke(); } }
  // cursor (teclado / ratón) y foco de la IA
  const hov = kbd ? cur : (!k.ptr.down && cellAt(k.ptr.x, k.ptr.y));
  if (hov && turn === 'me') { const [px, py] = pos(...hov); shape(c, px, py, 2); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2.5; c.stroke(); }
  if (sel) { const [px, py] = pos(sel.x, sel.y); shape(c, px, py, 2); c.strokeStyle = '#ffd23d'; c.lineWidth = 3; c.stroke(); }
  if (aiFocus && turn === 'ai' && aiFocus.hp > 0) { const [px, py] = unitScreen(aiFocus); c.strokeStyle = '#ff5f5f'; c.lineWidth = 3; c.beginPath(); c.ellipse(px, py - 8, 20, 8, 0, 0, R2); c.stroke(); c.beginPath(); c.moveTo(px - 6, py - 70 + Math.sin(tt * 8) * 3); c.lineTo(px + 6, py - 70 + Math.sin(tt * 8) * 3); c.lineTo(px, py - 62 + Math.sin(tt * 8) * 3); c.closePath(); ART.fillOut(c, '#ff5f5f', 2); }
  // unidades por profundidad
  const list = units.filter((u) => u.hp > 0 || u.dying > 0).map((u) => [u, ...unitScreen(u)]).sort((a, b) => a[2] - b[2]);
  const s = HEX ? 0.86 : 1;
  for (const [u, x, y] of list) { const done = u.team === 'me' && u.acted && turn === 'me', al = u.hp > 0 ? (done ? 0.55 : 1) : u.dying / 0.6; drawUnit(u, x, y - (HEX ? 8 : 10), s, al); if (u.hp > 0) hpBar(u, x, y - (HEX ? 3 : 2)); }
  // proyectiles
  for (const p of projs) { const q = p.t / p.dur, x = p.sx + (p.ex - p.sx) * q, y = p.sy + (p.ey - p.sy) * q - Math.sin(q * Math.PI) * (p.kind === 'A' ? 26 : 8);
    if (p.kind === 'A') { const a = Math.atan2(p.ey - p.sy - Math.cos(q * Math.PI) * 26 * Math.PI, p.ex - p.sx); c.save(); c.translate(x, y); c.rotate(a); c.strokeStyle = OUT; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-10, 0); c.lineTo(6, 0); c.stroke(); c.strokeStyle = '#f4efe6'; c.lineWidth = 1.6; c.stroke(); c.beginPath(); c.moveTo(9, 0); c.lineTo(3, -3.5); c.lineTo(3, 3.5); c.closePath(); ART.fillOut(c, '#c7d0da', 1); c.restore(); }
    else { c.fillStyle = 'rgba(210,170,255,.35)'; c.beginPath(); c.arc(x, y, 11, 0, R2); c.fill(); for (let i = 1; i < 4; i++) { const q2 = Math.max(0, q - i * 0.06); c.globalAlpha = 0.5 - i * 0.12; c.beginPath(); c.arc(p.sx + (p.ex - p.sx) * q2, p.sy + (p.ey - p.sy) * q2 - Math.sin(q2 * Math.PI) * 8, 5 - i, 0, R2); c.fillStyle = '#e6d4ff'; c.fill(); } c.globalAlpha = 1; c.beginPath(); c.arc(x, y, 5.5, 0, R2); ART.fillOut(c, '#f4ecff', 2); } }
  // HUD
  label('Batalla ' + level, 14, 20, 20, '#f2d15c'); label(score + ' pts', PX - (PORT ? 14 : 8), 20, 17, '#fff', 'right');
  const info = sel || (hov && at(...hov)) || (aiFocus && turn === 'ai' && aiFocus.hp > 0 ? aiFocus : null);
  if (PORT) return drawPanelV(info);
  // panel: ficha de la unidad
  const cx = PX + (W - PX - 8) / 2;
  if (info) { const T = TYPES[info.t], me = info.team === 'me';
    label(me ? 'Tu unidad' : 'Rival', cx, OY + 5, 11, me ? '#9fd0ff' : '#ff9a9a', 'center');
    drawUnit(info, cx, OY + 92, 1.35, 1); label(T.n, cx, OY + 112, 16, '#fff', 'center');
    hpBar(info, cx, OY + 128); label(`${Math.max(0, info.hp)} / ${info.max} PV`, cx, OY + 146, 12, '#d8d0f0', 'center');
    [['Ataque', T.atk], ['Movim.', T.mv], ['Alcance', T.rg]].forEach(([n, v], i) => { const y = OY + 172 + i * 24; ART.rr(c, PX + 16, y - 10, W - PX - 40, 20, 7); c.fillStyle = 'rgba(255,255,255,.07)'; c.fill(); label(n, PX + 22, y, 12, '#cfd3ff'); label(String(v), W - 30, y, 14, '#ffd23d', 'right'); });
    if (me && turn === 'me') label(info.acted ? 'Ya ha actuado' : info.moved ? 'Puede atacar' : 'Lista', cx, OY + 252, 12, info.acted ? '#8b91a1' : '#7cf06a', 'center'); }
  else { label('Unidades', cx, OY + 5, 11, '#cfd3ff', 'center');
    const mine = units.filter((u) => u.team === 'me' && u.hp > 0), foes = units.filter((u) => u.team === 'ai' && u.hp > 0);
    mine.forEach((u, i) => drawUnit(u, PX + 34 + i * 40, OY + 88, 0.8, u.acted && turn === 'me' ? 0.5 : 1)); foes.forEach((u, i) => drawUnit(u, PX + 30 + (i % 3) * 40, OY + 172 + Math.floor(i / 3) * 62, 0.8, 1));
    label('Tuyas', cx, OY + 104, 11, '#9fd0ff', 'center'); label('Rivales', cx, OY + 124, 11, '#ff9a9a', 'center'); }
  // registro y botón de fin de turno
  label(log, 14, H - 22, 14, '#e6e2ff');
  const on = turn === 'me' && !busy(); ART.rr(c, PX + 4, H - 58, W - PX - 12, 44, 14); ART.fillOut(c, on ? '#5bc85a' : '#4a4466', 2.5);
  if (on) { ART.rr(c, PX + 8, H - 55, W - PX - 20, 16, 8); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill(); }
  label(turn === 'me' ? 'Fin turno' : 'IA…', PX + 4 + (W - PX - 12) / 2, H - 36, 16, on ? '#fff' : '#b8b2d0', 'center');
  // aviso de turno
  drawBanner();
}
function drawBanner() {
  if (banner) { const q = banner.t, a = Math.min(1, q / 0.25, (1.4 - q) / 0.15 + 0.3), sc = 1 + Math.max(0, q - 1.1) * 0.6; c.save(); c.globalAlpha = Math.max(0, a); c.translate(PX / 2, PORT ? (OY + PY) / 2 - 10 : H / 2 - 10); c.scale(sc, sc);
    ART.rr(c, -120, -28, 240, 56, 16); ART.fillOut(c, banner.red ? '#8a2b3a' : '#2d4a8a', 3); label(banner.txt, 0, 1, 26, '#fff', 'center'); c.restore(); }
}
/* panel inferior (vertical): ficha de unidad a la izquierda, turno y botón a la derecha */
function drawPanelV(info) {
  const x0 = 8, y0 = PY;
  if (info) { const T = TYPES[info.t], me = info.team === 'me';
    label(me ? 'Tu unidad' : 'Rival', x0 + 14, y0 + 13, 11, me ? '#9fd0ff' : '#ff9a9a');
    if (me && turn === 'me') label(info.acted ? 'Ya ha actuado' : info.moved ? 'Puede atacar' : 'Lista', x0 + 252, y0 + 13, 11, info.acted ? '#8b91a1' : '#7cf06a', 'right');
    drawUnit(info, x0 + 50, y0 + 118, 1.4, 1); label(T.n, x0 + 100, y0 + 40, 17, '#fff');
    hpBar(info, x0 + 117, y0 + 58); label(`${Math.max(0, info.hp)} / ${info.max} PV`, x0 + 142, y0 + 61, 12, '#d8d0f0');
    [['Ataque', T.atk], ['Movim.', T.mv], ['Alcance', T.rg]].forEach(([n, v], i) => { const y = y0 + 86 + i * 22; ART.rr(c, x0 + 96, y - 9, 158, 18, 7); c.fillStyle = 'rgba(255,255,255,.07)'; c.fill(); label(n, x0 + 104, y, 12, '#cfd3ff'); label(String(v), x0 + 246, y, 14, '#ffd23d', 'right'); }); }
  else { const mine = units.filter((u) => u.team === 'me' && u.hp > 0), foes = units.filter((u) => u.team === 'ai' && u.hp > 0);
    label('Tuyas', x0 + 14, y0 + 13, 11, '#9fd0ff'); mine.forEach((u, i) => drawUnit(u, x0 + 34 + i * 40, y0 + 76, 0.8, u.acted && turn === 'me' ? 0.5 : 1));
    label('Rivales', x0 + 14, y0 + 88, 11, '#ff9a9a'); foes.forEach((u, i) => drawUnit(u, x0 + 34 + i * 38, y0 + 146, 0.8, 1)); }
  label(log, W / 2, PY - 14, 14, '#e6e2ff', 'center');
  label(turn === 'me' ? 'Tu turno' : 'Turno rival', 337, PY + 22, 15, turn === 'me' ? '#9fd0ff' : '#ff9a9a', 'center');
  const mine = units.filter((u) => u.team === 'me' && u.hp > 0), left = mine.filter((u) => !u.acted).length;
  if (turn === 'me') label(`${left} por actuar`, 337, PY + 44, 11, '#cfd3ff', 'center');
  const r = endR(), on = turn === 'me' && !busy(); ART.rr(c, r.x, r.y, r.w, r.h, 14); ART.fillOut(c, on ? '#5bc85a' : '#4a4466', 2.5);
  if (on) { ART.rr(c, r.x + 4, r.y + 3, r.w - 8, 20, 8); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill(); }
  label(turn === 'me' ? 'Fin turno' : 'IA…', r.x + r.w / 2, r.y + r.h / 2 + 1, 17, on ? '#fff' : '#b8b2d0', 'center');
  drawBanner();
}
