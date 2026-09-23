/* Dice Poker contra la banca: 3 tiradas, guarda los dados que quieras */
const k = Kit({ w: 480, h: 640, title: CFG.title, bg: '#3b1d2e' }), c = k.ctx;
const HANDS = ['Nada', 'Pareja', 'Doble pareja', 'Trío', 'Escalera', 'Full', 'Póker', 'Repóker'];
let dice, held, rolls, chips, bet, bank, phase, msg, anim;
function rank(d) { const cnt = [0, 0, 0, 0, 0, 0, 0]; d.forEach((v) => cnt[v]++); const cs = cnt.filter((v) => v).sort((a, b) => b - a), s = [...d].sort().join('');
  if (cs[0] === 5) return [7]; if (cs[0] === 4) return [6]; if (cs[0] === 3 && cs[1] === 2) return [5]; if (s === '12345' || s === '23456') return [4]; if (cs[0] === 3) return [3]; if (cs[0] === 2 && cs[1] === 2) return [2]; if (cs[0] === 2) return [1]; return [0]; }
function tiebreak(d) { const cnt = [0, 0, 0, 0, 0, 0, 0]; d.forEach((v) => cnt[v]++); return [...d].sort((a, b) => cnt[b] - cnt[a] || b - a).reduce((s, v) => s * 7 + v, 0); }
function roll() { k.sfx('shoot'); for (let i = 0; i < 5; i++) if (!held[i]) dice[i] = k.ri(1, 6); rolls++; anim = 0.4; }
function newRound() { dice = [1, 1, 1, 1, 1]; held = [false, false, false, false, false]; rolls = 0; bet = Math.min(10, chips); roll(); phase = 'player'; msg = 'Toca dados para guardarlos y vuelve a tirar'; }
function reset() { chips = 100; newRound(); }
reset(); k.show(CFG.title, 'Consigue mejor jugada que la banca en 3 tiradas. Empiezas con 100 fichas; cada mano apuesta 10.');
function bankPlay() { let d = [k.ri(1, 6), k.ri(1, 6), k.ri(1, 6), k.ri(1, 6), k.ri(1, 6)]; for (let r = 0; r < 2; r++) { const cnt = [0, 0, 0, 0, 0, 0, 0]; d.forEach((v) => cnt[v]++); const best = cnt.indexOf(Math.max(...cnt)); if (rank(d)[0] >= 4) break; d = d.map((v) => (v === best && cnt[best] > 1 ? v : k.ri(1, 6))); } return d; }
k.run((dt) => {
  anim = Math.max(0, (anim || 0) - dt);
  if (!k.gate(reset)) return;
  if (!k.ptr.hit && !k.hit.has('a')) return;
  if (phase === 'done') { if (chips <= 0) return k.lose(CFG.id, 0, 'Sin fichas'); newRound(); return; }
  const di = [0, 1, 2, 3, 4].find((i) => Math.abs(k.ptr.x - (48 + i * 96)) < 40 && Math.abs(k.ptr.y - 330) < 40);
  if (di !== undefined && k.ptr.hit && rolls < 3) { held[di] = !held[di]; return; }
  const onRoll = k.ptr.y > 440 && k.ptr.y < 490 && k.ptr.x > 40 && k.ptr.x < 230, onStand = k.ptr.y > 440 && k.ptr.y < 490 && k.ptr.x > 250 && k.ptr.x < 440;
  if ((onRoll || k.hit.has('a')) && rolls < 3) { roll(); if (rolls < 3) return; }
  if (onStand || rolls >= 3) { bank = bankPlay(); const a = rank(dice)[0], b = rank(bank)[0]; const win = a > b || (a === b && tiebreak(dice) > tiebreak(bank)); const tie = a === b && tiebreak(dice) === tiebreak(bank);
    chips += tie ? 0 : win ? bet * (1 + Math.max(0, a - 2) * 0.5) : -bet; chips = Math.round(chips); k.best(CFG.id, chips);
    msg = tie ? 'Empate' : win ? `¡Ganas! ${HANDS[a]} contra ${HANDS[b]}` : `Pierdes: ${HANDS[a]} contra ${HANDS[b]}`; phase = 'done'; }
}, () => {
  k.clear(); k.text(CFG.title, 24, 20, 26, '#f2d15c'); k.text(`Fichas ${chips}`, 456, 26, 18, '#fff', 'right');
  const face = (x, y, v, s, hl) => { k.rrect(x - s / 2, y - s / 2, s, s, s * 0.18, hl ? '#ffe98a' : '#fbf6ee'); const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[v]; for (const [dx, dy] of P) k.circle(x + dx * s * 0.27, y + dy * s * 0.27, s * 0.09, '#3b1d2e'); };
  k.text('Banca', 240, 90, 15, '#e8c9d8', 'center'); if (phase === 'done') bank.forEach((v, i) => face(88 + i * 76, 150, v, 56)); else for (let i = 0; i < 5; i++) k.rrect(60 + i * 76, 122, 56, 56, 10, '#5a2c45');
  if (phase === 'done') k.text(HANDS[rank(bank)[0]], 240, 190, 16, '#fff', 'center');
  k.text('Tus dados', 240, 262, 15, '#e8c9d8', 'center');
  dice.forEach((v, i) => face(48 + i * 96, 330 + (anim > 0 && !held[i] ? Math.sin(anim * 40 + i) * 6 : 0), anim > 0 && !held[i] ? k.ri(1, 6) : v, 76, held[i]));
  held.forEach((h, i) => h && k.text('GUARDADO', 48 + i * 96, 376, 10, '#f2d15c', 'center'));
  k.text(HANDS[rank(dice)[0]], 240, 400, 20, '#fff', 'center');
  if (phase === 'player') { k.rrect(40, 440, 190, 50, 25, rolls < 3 ? '#7cf7a0' : '#555'); k.text(`🎲 Tirar (${3 - rolls})`, 135, 455, 17, '#1d1d1d', 'center'); k.rrect(250, 440, 190, 50, 25, '#f2d15c'); k.text('✋ Plantarse', 345, 455, 17, '#1d1d1d', 'center'); }
  k.text(msg, 240, 520, 15, '#fff', 'center'); if (phase === 'done') k.text('Toca para la siguiente mano', 240, 560, 14, '#e8c9d8', 'center');
});
