/* Tácticas por turnos contra la IA. CFG.hex = false (cuadrícula) | true (hexágonos) */
const HEX = !!CFG.hex, k = Kit({ w: 640, h: 480, title: CFG.title, bg: '#1d2036' }), c = k.ctx;
const COLS = HEX ? 11 : 10, ROWS = HEX ? 8 : 8, S = HEX ? 34 : 50, OX = HEX ? 70 : 70, OY = 50;
const TYPES = { K: { n: 'Caballero', hp: 12, atk: 5, mv: 3, rg: 1, col: '#5ce1e6' }, A: { n: 'Arquero', hp: 8, atk: 4, mv: 3, rg: 3, col: '#7cf7a0' }, M: { n: 'Mago', hp: 7, atk: 6, mv: 2, rg: 2, col: '#b98cff' } };
let units, rocks, sel, turn, level, score, reach, aiT, log;
const pos = (x, y) => HEX ? [OX + x * S * 1.5 + S, OY + y * S * 1.732 + (x % 2) * S * 0.866 + S] : [OX + x * S + S / 2, OY + y * S + S / 2];
function nbs(x, y) { if (!HEX) return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]; const o = x % 2; return [[x, y - 1], [x, y + 1], [x - 1, y - 1 + o], [x - 1, y + o], [x + 1, y - 1 + o], [x + 1, y + o]]; }
const inb = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
const at = (x, y) => units.find((u) => u.hp > 0 && u.x === x && u.y === y);
const blocked = (x, y) => rocks.has(x + ',' + y) || at(x, y);
function dists(sx, sy, pass) { const d = { [sx + ',' + sy]: 0 }, q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [nx, ny] of nbs(x, y)) { const kk = nx + ',' + ny; if (!inb(nx, ny) || d[kk] !== undefined || (pass && !pass(nx, ny))) continue; d[kk] = d[x + ',' + y] + 1; q.push([nx, ny]); } } return d; }
const range = (a, b) => dists(a.x, a.y)[b.x + ',' + b.y];
function build() {
  rocks = new Set(); for (let i = 0; i < 8 + level; i++) rocks.add(k.ri(2, COLS - 3) + ',' + k.ri(0, ROWS - 1));
  const mk = (t, x, y, team) => ({ t, x, y, team, hp: TYPES[t].hp + (team === 'ai' ? level - 1 : 0), max: TYPES[t].hp + (team === 'ai' ? level - 1 : 0), moved: false, acted: false });
  units = [mk('K', 0, 2, 'me'), mk('A', 0, 4, 'me'), mk('M', 0, 6, 'me'), mk('K', COLS - 1, 1, 'ai'), mk('K', COLS - 1, 5, 'ai'), mk('A', COLS - 1, 3, 'ai')];
  if (level > 1) units.push(mk('M', COLS - 1, 7, 'ai')); if (level > 3) units.push(mk('A', COLS - 2, 0, 'ai'));
  units.forEach((u) => rocks.delete(u.x + ',' + u.y)); turn = 'me'; sel = null; reach = null; log = 'Tu turno';
}
function attack(a, b) { b.hp -= TYPES[a.t].atk + k.ri(-1, 1); { const [bx2, by2] = pos(b.x, b.y); k.burst(bx2, by2, '#ff9a3c', 10); k.float(`-${TYPES[a.t].atk}`, bx2, by2 - 16, '#ff9a9a'); k.sfx('hit'); } a.acted = true; a.moved = true; log = `${TYPES[a.t].n} ataca (${Math.max(0, b.hp)} PV)`; if (b.hp <= 0) score += b.team === 'ai' ? 50 : 0; navigator.vibrate && navigator.vibrate(20); checkEnd(); }
function checkEnd() { if (!units.some((u) => u.team === 'ai' && u.hp > 0)) { score += 200 * level; level++; k.st = 'over'; k.show('¡Victoria!', `${score} puntos<br>Toca para la siguiente batalla`); } else if (!units.some((u) => u.team === 'me' && u.hp > 0)) { level = 1; k.lose(CFG.id, score, 'Derrota'); } }
function endTurn() { units.forEach((u) => { u.moved = false; u.acted = false; }); turn = 'ai'; sel = null; reach = null; aiT = 0.4; log = 'Turno de la IA'; }
function reset() { if (!level || k.st === 'over' && !units.some((u) => u.team === 'me' && u.hp > 0)) { level = 1; score = 0; } build(); }
level = 0; reset(); k.show(CFG.title, 'Toca una unidad tuya, luego una casilla azul para mover o un enemigo en rango para atacar. «Fin turno» cuando acabes.');
let aiQueue = [];
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (turn === 'ai') { aiT -= dt; if (aiT > 0) return; if (!aiQueue.length) aiQueue = units.filter((u) => u.team === 'ai' && u.hp > 0);
    const u = aiQueue.shift(); if (u && u.hp > 0) { const foes = units.filter((q) => q.team === 'me' && q.hp > 0); if (!foes.length) return;
      let tg = foes.filter((f) => range(u, f) <= TYPES[u.t].rg).sort((a, b) => a.hp - b.hp)[0];
      if (!tg) { const d = dists(u.x, u.y, (x, y) => !blocked(x, y)); const goal = foes.sort((a, b) => range(u, a) - range(u, b))[0]; let best = null, bv = 1e9;
        for (const [kk, v] of Object.entries(d)) if (v <= TYPES[u.t].mv) { const [x, y] = kk.split(',').map(Number); if (at(x, y) && at(x, y) !== u) continue; const dist = dists(x, y)[goal.x + ',' + goal.y]; const score2 = Math.abs(dist - TYPES[u.t].rg) + (dist < TYPES[u.t].rg ? 0.5 : 0); if (score2 < bv) { bv = score2; best = [x, y]; } }
        if (best) { u.x = best[0]; u.y = best[1]; } tg = foes.filter((f) => range(u, f) <= TYPES[u.t].rg).sort((a, b) => a.hp - b.hp)[0]; }
      if (tg) attack(u, tg); }
    aiT = 0.45; if (!aiQueue.length && k.st === 'play') { turn = 'me'; log = 'Tu turno'; units.forEach((q) => { q.moved = false; q.acted = false; }); } return; }
  if (!k.ptr.hit) return;
  if (k.ptr.y > 440 && k.ptr.x > 500) return endTurn();
  let cell = null; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const [px, py] = pos(x, y); if (Math.hypot(k.ptr.x - px, k.ptr.y - py) < S * 0.55) cell = [x, y]; } if (!cell) { sel = null; reach = null; return; }
  const u = at(...cell);
  if (u && u.team === 'me' && !u.acted) { sel = u; reach = u.moved ? {} : dists(u.x, u.y, (x, y) => !blocked(x, y)); return; }
  if (sel && u && u.team === 'ai' && range(sel, u) <= TYPES[sel.t].rg) { attack(sel, u); sel = null; reach = null; return; }
  if (sel && !u && reach && reach[cell.join()] !== undefined && reach[cell.join()] <= TYPES[sel.t].mv && !sel.moved) { sel.x = cell[0]; sel.y = cell[1]; sel.moved = true; reach = {}; return; }
  sel = null; reach = null;
}, () => {
  k.clear(); k.text(CFG.title, 12, 12, 20, '#f2d15c'); k.text(`Batalla ${level} · ${score} pts`, 628, 14, 15, '#fff', 'right');
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const [px, py] = pos(x, y); const kk = x + ',' + y; let col = (x + y) % 2 ? '#2a2f52' : '#262b4a';
    if (rocks.has(kk)) col = '#4a4466'; if (sel && reach && reach[kk] !== undefined && reach[kk] <= TYPES[sel.t].mv && !at(x, y)) col = '#2f5fa8';
    const tgt = sel && at(x, y) && at(x, y).team === 'ai' && range(sel, at(x, y)) <= TYPES[sel.t].rg; if (tgt) col = '#a83f4f';
    if (HEX) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(px + Math.cos(i * 1.047) * S * 0.95, py + Math.sin(i * 1.047) * S * 0.95); c.fill(); } else k.rect(px - S / 2 + 1, py - S / 2 + 1, S - 2, S - 2, col);
    if (rocks.has(kk)) k.circle(px, py, S * 0.3, '#6b6490'); }
  for (const u of units) if (u.hp > 0) { const [px, py] = pos(u.x, u.y), T = TYPES[u.t]; k.circle(px, py, S * 0.36, u.team === 'me' ? T.col : '#ff6b6b'); if (u === sel) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(px, py, S * 0.42, 0, 6.283); c.stroke(); }
    k.text(u.t === 'K' ? '⚔' : u.t === 'A' ? '➶' : '✦', px, py - 9, 15, '#1d2036', 'center'); k.rect(px - 14, py + S * 0.38, 28 * u.hp / u.max, 4, '#7cf7a0'); if (u.team === 'me' && u.acted) { c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.arc(px, py, S * 0.36, 0, 6.283); c.fill(); } }
  k.text(log, 14, 452, 14, '#cfd3ff'); k.rrect(500, 442, 130, 32, 16, turn === 'me' ? '#7cf7a0' : '#444'); k.text('Fin turno', 565, 450, 15, '#1d2036', 'center');
});
