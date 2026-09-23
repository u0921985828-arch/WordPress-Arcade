/* Darts Pro: 501. El punto de mira oscila; toca para lanzar. Termina exactamente en 0. */
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#16202e' }), c = k.ctx;
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5], CX = 180, CY = 300, R = 150;
let left, darts, turn, turnStart, thrown, aim, t, msg, msgT, hold;
function reset() { left = 501; darts = 0; turn = []; turnStart = 501; thrown = []; t = 0; msg = ''; msgT = 0; aim = { x: CX, y: CY }; }
function scoreAt(x, y) { const dx = x - CX, dy = y - CY, d = Math.hypot(dx, dy) / R; if (d > 1) return [0, 'Fuera']; if (d < 0.05) return [50, 'Bull 50', true]; if (d < 0.1) return [25, '25'];
  const ang = (Math.atan2(dx, -dy) * 180 / Math.PI + 360 + 9) % 360, n = ORDER[Math.floor(ang / 18)]; if (d > 0.58 && d < 0.65) return [n * 3, `T${n}`]; if (d > 0.93) return [n * 2, `D${n}`, true]; return [n, `${n}`]; }
reset(); k.show(CFG.title, 'Mantén pulsado para estabilizar la mira y suelta para lanzar. 501: baja a 0 exacto y cierra con un doble (anillo exterior) o el bull. Si te pasas, el turno se anula.');
k.run((dt) => {
  msgT -= dt; if (!k.gate(reset)) return; t += dt;
  const steady = k.ptr.down ? 0.45 : 1, amp = 34 * steady; hold = k.ptr.down;
  const bx = k.ptr.down ? k.ptr.x : aim.bx || CX, by = k.ptr.down ? k.ptr.y - 70 : aim.by || CY; aim.bx = k.clamp(bx, 20, 340); aim.by = k.clamp(by, 120, 480);
  aim.x = aim.bx + Math.sin(t * 2.3) * amp + Math.sin(t * 5.1) * amp * 0.3; aim.y = aim.by + Math.cos(t * 1.9) * amp + Math.sin(t * 4.3) * amp * 0.3;
  if (k.ptr.up || k.hit.has('a')) { const [pts, lbl, dbl] = scoreAt(aim.x, aim.y); thrown.push({ x: aim.x, y: aim.y }); darts++; k.sfx('hit'); k.burst(aim.x, aim.y, '#f2d15c', 6, 60); turn.push(lbl);
    if (left - pts < 0 || left - pts === 1 || (left - pts === 0 && !dbl)) { msg = '¡Pasado! Turno anulado'; msgT = 1.2; left = turnStart; turn = []; thrown = []; }
    else { left -= pts; msg = lbl; msgT = 0.8; if (left === 0) { k.st = 'over'; k.best(CFG.id, Math.max(1, 100 - darts)); k.show('¡Checkout!', `501 en ${darts} dardos<br>Toca para jugar otra vez`); return; } }
    if (turn.length >= 3) { turn = []; turnStart = left; setTimeout(() => (thrown = []), 600); } }
}, () => {
  k.clear(); const ring = (r, col) => k.circle(CX, CY, r * R, col); ring(1.08, '#222');
  for (let i = 0; i < 20; i++) { const a0 = (i * 18 - 99) * Math.PI / 180, a1 = a0 + Math.PI / 10; for (const [r0, r1, cols] of [[0.1, 0.58, ['#111', '#f3e7c9']], [0.58, 0.65, ['#d23a4a', '#2e8b57']], [0.65, 0.93, ['#111', '#f3e7c9']], [0.93, 1, ['#d23a4a', '#2e8b57']]]) { c.fillStyle = cols[i % 2]; c.beginPath(); c.arc(CX, CY, r1 * R, a0, a1); c.arc(CX, CY, r0 * R, a1, a0, true); c.fill(); }
    const am = a0 + Math.PI / 20; k.text(ORDER[i], CX + Math.cos(am) * R * 1.08 - 0, CY + Math.sin(am) * R * 1.08 - 7, 12, '#fff', 'center'); }
  ring(0.1, '#2e8b57'); ring(0.05, '#d23a4a');
  for (const d of thrown) { k.circle(d.x, d.y, 4, '#f2d15c'); k.rect(d.x - 1, d.y - 16, 2, 14, '#ccc'); }
  c.strokeStyle = hold ? '#7cf7a0' : '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(aim.x, aim.y, 10, 0, 6.283); c.moveTo(aim.x - 16, aim.y); c.lineTo(aim.x + 16, aim.y); c.moveTo(aim.x, aim.y - 16); c.lineTo(aim.x, aim.y + 16); c.stroke();
  k.text(left, 180, 500, 48, '#fff', 'center'); k.text(`Dardos ${darts}  ·  Turno: ${turn.join(' · ') || '—'}`, 180, 560, 14, '#b8c4d8', 'center'); if (msgT > 0) k.text(msg, 180, 70, 26, '#f2d15c', 'center');
});
