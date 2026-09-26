/* Dice Poker contra la banca: 3 tiradas, guarda los dados que quieras. Ranking español (Nada < Pareja < Doble pareja < Trío < Escalera < Full < Póker < Repóker).
 * Dados en relieve cacheados, tirada con saltos y giros, la banca tira a la vista y apuesta ajustable entre manos. */
const W = 480, H = 640, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#3b1d2e' }), c = k.ctx;
const HANDS = ['Nada', 'Pareja', 'Doble pareja', 'Trío', 'Escalera', 'Full', 'Póker', 'Repóker'];
let peak, hands, dice, held, rolls, chips, bet, bank, phase, msg, anim, nextBet, cur, kbd, bankShow, bankT, spin, face, result, dxs;
function rank(d) { const cnt = [0, 0, 0, 0, 0, 0, 0]; d.forEach((v) => cnt[v]++); const cs = cnt.filter((v) => v).sort((a, b) => b - a), s = [...d].sort().join('');
  if (cs[0] === 5) return [7]; if (cs[0] === 4) return [6]; if (cs[0] === 3 && cs[1] === 2) return [5]; if (s === '12345' || s === '23456') return [4]; if (cs[0] === 3) return [3]; if (cs[0] === 2 && cs[1] === 2) return [2]; if (cs[0] === 2) return [1]; return [0]; }
function tiebreak(d) { const cnt = [0, 0, 0, 0, 0, 0, 0]; d.forEach((v) => cnt[v]++); return [...d].sort((a, b) => cnt[b] - cnt[a] || b - a).reduce((s, v) => s * 7 + v, 0); }
/* Dados que forman la jugada (para resaltarlos) */
function part(d) { const r = rank(d)[0]; if (r === 4 || r === 7 || r === 5) return d.map(() => true); const cnt = [0, 0, 0, 0, 0, 0, 0]; d.forEach((v) => cnt[v]++); return d.map((v) => cnt[v] > 1); }
const PX = (i) => 76 + i * 82, PY = 330, PS = 68, BXs = (i) => 88 + i * 76, BYs = 150, BS = 54;
function roll() { k.sfx('shoot'); for (let i = 0; i < 5; i++) if (!held[i]) { dice[i] = k.ri(1, 6); spin[i] = (Math.random() < 0.5 ? -1 : 1) * k.rnd(6, 11); dxs[i] = k.rnd(-40, 40); } rolls++; anim = 0.75; }
function newRound() { dice = [1, 1, 1, 1, 1]; held = [false, false, false, false, false]; spin = [0, 0, 0, 0, 0]; dxs = [0, 0, 0, 0, 0]; face = [1, 1, 1, 1, 1]; rolls = 0; bet = Math.min(nextBet || 10, chips); nextBet = bet; bank = null; bankShow = null; result = 0; roll(); phase = 'player'; msg = 'Toca dados para guardarlos y vuelve a tirar'; cur = 5; }
function reset() { chips = 100; nextBet = 10; peak = 100; hands = 0; newRound(); }
reset(); k.show(CFG.title, 'Consigue mejor jugada que la banca en 3 tiradas. Toca los dados para guardarlos. Empiezas con 100 fichas y eliges la apuesta entre manos. Flechas + A con teclado.');
function bankPlay() { let d = [k.ri(1, 6), k.ri(1, 6), k.ri(1, 6), k.ri(1, 6), k.ri(1, 6)]; const nr = hands < 6 || Math.random() < 0.25 ? 1 : 2; /* 1.23: más fácil: la banca repite solo 1 vez en las 6 primeras manos (y a veces después) */ for (let r = 0; r < nr; r++) { const cnt = [0, 0, 0, 0, 0, 0, 0]; d.forEach((v) => cnt[v]++); const best = cnt.indexOf(Math.max(...cnt)); if (rank(d)[0] >= 4) break; d = d.map((v) => (v === best && cnt[best] > 1 ? v : k.ri(1, 6))); } return d; }
function stand() { bank = bankPlay(); phase = 'bank'; bankT = 1.1; bankShow = [1, 1, 1, 1, 1]; msg = 'La banca tira…'; k.sfx('shoot'); }
function settle() { const a = rank(dice)[0], b = rank(bank)[0]; const win = a > b || (a === b && tiebreak(dice) > tiebreak(bank)); const tie = a === b && tiebreak(dice) === tiebreak(bank);
  const delta = tie ? 0 : win ? Math.round(bet * (1 + Math.max(0, a - 2) * 0.5)) : -bet; chips = Math.round(chips + delta); hands++; peak = Math.max(peak, chips); k.best(CFG.id, chips); result = tie ? 0 : win ? 1 : -1;
  msg = tie ? 'Empate' : win ? `¡Ganas! ${HANDS[a]} contra ${HANDS[b]}` : `Pierdes: ${HANDS[a]} contra ${HANDS[b]}`; phase = 'done'; nextBet = Math.max(10, Math.min(nextBet, chips - (chips % 10) || 10));
  if (win) { k.sfx(a >= 5 ? 'win' : 'coin'); k.float(`+${delta}`, W - 70, 60, '#ffe27a'); k.burst(W - 60, 26, '#ffe27a', 14, 140); if (a >= 6) k.confetti(); } else if (!tie) { k.sfx('hurt'); k.float(`${delta}`, W - 70, 60, '#ff8a9a'); k.shake(4); } }
const inBtn = (x, y, bx, by, bw, bh) => x > bx && x < bx + bw && y > by && y < by + bh;
k.run((dt) => {
  if (anim > 0) { anim = Math.max(0, anim - dt); for (let i = 0; i < 5; i++) if (!held[i] && anim > 0.12 && Math.random() < dt * 18) face[i] = k.ri(1, 6); if (anim === 0) { face = dice.slice(); k.sfx('hit'); } }
  if (phase === 'bank') { bankT -= dt; if (Math.random() < dt * 16) bankShow = bankShow.map(() => k.ri(1, 6)); if (bankT <= 0) { bankShow = bank.slice(); k.sfx('hit'); settle(); } }
  if (!k.gate(reset)) return;
  const p = k.ptr, L = k.hit.has('left'), R = k.hit.has('right'), A = k.hit.has('a');
  if (phase === 'bank') return;
  if (phase === 'done') {
    if (L || R) { kbd = true; nextBet = k.clamp(nextBet + (R ? 10 : -10), 10, Math.max(10, chips)); k.sfx('click'); return; }
    if (p.hit && inBtn(p.x, p.y, 120, 566, 44, 40)) { nextBet = Math.max(10, nextBet - 10); k.sfx('click'); return; }
    if (p.hit && inBtn(p.x, p.y, 316, 566, 44, 40)) { nextBet = Math.min(Math.max(10, chips), nextBet + 10); k.sfx('click'); return; }
    if (p.hit || A) { if (chips <= 0) return k.lose(CFG.id, peak, 'Sin fichas', `${hands} manos · máximo ${peak} fichas`); newRound(); } return; }
  if (rolls >= 3 && anim === 0) return stand();
  if (anim > 0.2) return;
  // teclado: cursor sobre 5 dados + Tirar + Plantarse
  if (L || R) { kbd = true; cur = (cur + (R ? 1 : 6)) % 7; k.sfx('click'); }
  if (k.hit.has('up') || k.hit.has('down')) { kbd = true; cur = cur < 5 ? 5 : 2; }
  let act = null;
  if (A) act = kbd ? cur : 5;
  if (p.hit) { kbd = false; const di = [0, 1, 2, 3, 4].find((i) => Math.abs(p.x - PX(i)) < 40 && Math.abs(p.y - PY) < 46); if (di !== undefined) act = di; else if (inBtn(p.x, p.y, 40, 440, 190, 52)) act = 5; else if (inBtn(p.x, p.y, 250, 440, 190, 52)) act = 6; }
  if (act === null) return;
  if (act < 5) { if (rolls < 3) { held[act] = !held[act]; k.sfx(held[act] ? 'pop' : 'click'); } return; }
  if (act === 5 && rolls < 3) { roll(); return; }
  if (act === 6 || rolls >= 3) stand();
}, draw);

/* ================= Arte ================= */
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
const DC = {};
function uni(g, parts, ow) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = (ow || 1.1) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
  g.restore(); }
function inpath(g, parts, fn) { g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip(); fn(g); g.restore(); }
function dieSpr(v, s) { const key = v + '_' + s; if (DC[key]) return DC[key]; const cv = document.createElement('canvas'), P = 6; cv.width = cv.height = (s + P * 2) * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(P + s / 2, P + s / 2);
  const r = s * 0.2, h = s / 2, TH = s * 0.1;
  /* Ley de la pieza única: cuerpo (cara + canto) en un solo trazado, relleno y contorneado una vez */
  const body = (q) => ART.rr(q, -h, -h, s, s + TH, r), face = (q) => ART.rr(q, -h, -h, s, s, r);
  const fg = g.createLinearGradient(-h, -h, h, h); fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, '#ece2d2');
  const parts = [[body, '#c9bca8'], [face, fg]];
  uni(g, parts, 1.1);
  inpath(g, parts, (q) => {
    /* junta cara/canto por sombra propia, no por stroke */
    const sg = q.createLinearGradient(0, h - TH * 1.6, 0, h + TH); sg.addColorStop(0, 'rgba(26,21,48,0)'); sg.addColorStop(0.45, 'rgba(26,21,48,.20)'); sg.addColorStop(1, 'rgba(26,21,48,.42)');
    q.fillStyle = sg; q.fillRect(-h, h - TH * 1.8, s, TH * 2.8);
    /* luz superior */
    const lg = q.createLinearGradient(0, -h, 0, -h + s * 0.3); lg.addColorStop(0, 'rgba(255,255,255,.75)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    q.fillStyle = lg; q.fillRect(-h, -h, s, s * 0.3);
    /* luz de borde izquierda */
    const eg = q.createLinearGradient(-h, 0, -h + s * 0.22, 0); eg.addColorStop(0, 'rgba(255,255,255,.34)'); eg.addColorStop(1, 'rgba(255,255,255,0)');
    q.fillStyle = eg; q.fillRect(-h, -h, s * 0.22, s + TH);
  });
  /* puntos taladrados: anillo claro de canto + degradado radial (luz abajo-derecha) */
  const cy = 0; const dark = v === 1 ? '#7d1420' : '#120b17', mid = v === 1 ? '#d5303e' : '#332438';
  for (const [dx, dy] of PIPS[v]) { const x = dx * s * 0.26, y = cy + dy * s * 0.24, pr = s * (v === 1 ? 0.13 : 0.085);
    g.beginPath(); g.arc(x, y + pr * 0.22, pr * 1.06, 0, 6.283); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill();
    const pg = g.createRadialGradient(x + pr * 0.35, y + pr * 0.35, pr * 0.1, x, y, pr); pg.addColorStop(0, mid); pg.addColorStop(0.62, dark); pg.addColorStop(1, dark);
    g.beginPath(); g.arc(x, y, pr, 0, 6.283); g.fillStyle = pg; g.fill(); }
  return (DC[key] = cv); }
function die(x, y, v, s, o) { o = o || {}; const lift = o.lift || 0;
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y + s * 0.5, s * 0.46 * (1 - Math.min(0.4, lift / 150)), s * 0.12, 0, 0, 6.283); c.fill();
  if (o.glow) { c.fillStyle = o.glow; c.beginPath(); c.arc(x, y - lift, s * 0.72, 0, 6.283); c.fill(); }
  c.save(); c.translate(x, y - lift); c.rotate(o.rot || 0); c.drawImage(dieSpr(v, s), -s / 2 - 6, -s / 2 - 6, s + 12, s + 12); c.restore();
  if (o.ring) { c.strokeStyle = o.ring; c.lineWidth = 3.5; ART.rr(c, x - s / 2 - 4, y - lift - s / 2 - 4, s + 8, s + 8, s * 0.24); c.stroke(); } }
const BG = (() => { const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4a2438'); gr.addColorStop(1, '#2a1220'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // mesa de fieltro con borde de madera
  ART.rr(g, 14, 62, W - 28, 470, 30); gr = g.createLinearGradient(0, 62, 0, 532); gr.addColorStop(0, '#9a5a32'); gr.addColorStop(1, '#6b3a1e'); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
  g.strokeStyle = 'rgba(255,220,170,.18)'; g.lineWidth = 1; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(24, 70 + i * 38); g.bezierCurveTo(160, 64 + i * 38, 320, 78 + i * 38, W - 24, 70 + i * 38); g.stroke(); }
  ART.rr(g, 28, 76, W - 56, 442, 20); gr = g.createRadialGradient(W / 2, 300, 40, W / 2, 300, 300); gr.addColorStop(0, '#1d8150'); gr.addColorStop(1, '#0d4a2e'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
  g.save(); g.clip(); for (let i = 0; i < 5000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.07)'; g.fillRect(28 + Math.random() * (W - 56), 76 + Math.random() * 442, 1, 1.5); }
  g.strokeStyle = 'rgba(255,240,200,.28)'; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(44, 232); g.lineTo(W - 44, 232); g.stroke(); g.setLineDash([]);
  ART.rr(g, 44, 268, W - 88, 124, 18); g.strokeStyle = 'rgba(255,240,200,.2)'; g.lineWidth = 2; g.stroke(); g.restore();
  gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); return cv; })();
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
const CHC = {};
function chip(x, y, r, col) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), key = Math.round(r * 2) / 2 + '|' + col + '|' + dpr;
  let sp = CHC[key];
  if (!sp) { const w = r * 3, h = r * 3.2, cv = document.createElement('canvas');
    cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
    const g = cv.getContext('2d'); g.scale(dpr, dpr); g.translate(w / 2, h / 2);
    chipDraw(g, 0, 0, r, col); sp = CHC[key] = { cv: cv, ox: w / 2, oy: h / 2, w: w, h: h }; }
  c.drawImage(sp.cv, x - sp.ox, y - sp.oy, sp.w, sp.h);
}
function chipDraw(c, x, y, r, col) { const TH = r * 0.26;
  /* pieza única: canto + cara en un trazado, sectores por color, sin contornos interiores */
  const side = (g) => g.ellipse(x, y + TH, r, r * 0.97, 0, 0, 6.283), top = (g) => g.arc(x, y, r, 0, 6.283);
  const sg = c.createLinearGradient(x, y, x, y + TH + r); sg.addColorStop(0, ART.dark(col, 0.32)); sg.addColorStop(1, ART.dark(col, 0.55));
  const parts = [[side, sg], [top, col]];
  uni(c, parts, 1.1);
  inpath(c, parts, (g) => {
    g.save(); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.clip();
    /* sectores blancos del borde por cambio de color */
    g.fillStyle = 'rgba(255,255,255,.92)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, i * 1.047 + 0.12, i * 1.047 + 0.63); g.closePath(); g.fill(); }
    /* disco central: mismo color, se separa por sombra propia */
    g.beginPath(); g.arc(x, y, r * 0.58, 0, 6.283); g.fillStyle = col; g.fill();
    const rg = g.createRadialGradient(x, y, r * 0.42, x, y, r * 0.6); rg.addColorStop(0, 'rgba(26,21,48,0)'); rg.addColorStop(1, 'rgba(26,21,48,.34)');
    g.beginPath(); g.arc(x, y, r * 0.6, 0, 6.283); g.fillStyle = rg; g.fill();
    g.restore();
    /* junta cara/canto y luz superior */
    const jg = g.createLinearGradient(x, y + r * 0.45, x, y + r + TH); jg.addColorStop(0, 'rgba(26,21,48,0)'); jg.addColorStop(1, 'rgba(26,21,48,.4)');
    g.fillStyle = jg; g.fillRect(x - r, y + r * 0.45, r * 2, r + TH);
    const lg = g.createLinearGradient(x, y - r, x, y - r * 0.2); lg.addColorStop(0, 'rgba(255,255,255,.42)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg; g.fillRect(x - r, y - r, r * 2, r * 0.8);
  }); }
function button(x, y, w, h, txt, col, on, focus, icon) { const pr = on && k.ptr.down && inBtn(k.ptr.x, k.ptr.y, x, y, w, h) ? 3 : 0;
  ART.rr(c, x, y + 4, w, h, h / 2); c.fillStyle = OUT; c.fill(); ART.rr(c, x, y + pr, w, h, h / 2); ART.fillOut(c, on ? col : '#7d7486', 2.5); c.fillStyle = 'rgba(255,255,255,.4)'; ART.rr(c, x + 10, y + pr + 4, w - 20, 9, 5); c.fill();
  if (icon === 'dice') { for (const [dx, a] of [[-7, -0.3], [6, 0.25]]) { c.save(); c.translate(x + 30 + dx, y + pr + h / 2); c.rotate(a); ART.rr(c, -8, -8, 16, 16, 4); ART.fillOut(c, '#fff', 1.8); c.fillStyle = OUT; c.beginPath(); c.arc(-3, -3, 1.8, 0, 6.283); c.arc(3, 3, 1.8, 0, 6.283); c.fill(); c.restore(); } }
  if (icon === 'hand') { c.save(); c.translate(x + 28, y + pr + h / 2); ART.rr(c, -8, -4, 16, 14, 5); ART.fillOut(c, '#f7c9a0', 1.8); for (let i = 0; i < 4; i++) { ART.rr(c, -8 + i * 4.2, -13 + (i === 0 || i === 3 ? 3 : 0), 3.6, 12, 1.8); ART.fillOut(c, '#f7c9a0', 1.4); } c.restore(); }
  c.font = '800 17px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; c.fillText(txt, x + w / 2 + 14, y + pr + h / 2 + 1);
  if (focus) { c.strokeStyle = '#5ce1e6'; c.lineWidth = 3; c.setLineDash([6, 4]); ART.rr(c, x - 5, y - 5, w + 10, h + 12, h / 2 + 5); c.stroke(); c.setLineDash([]); } }
function draw() {
  const now = performance.now() / 1000; c.drawImage(BG, 0, 0, W, H);
  label(CFG.title, 16, 14, 20, '#ffe27a'); chip(W - 30, 26, 13, '#d5303e'); label(`${chips}`, W - 50, 14, 20, '#fff', 'right');
  // banca
  label('Banca', W / 2, 90, 15, '#f3d9e5', 'center');
  for (let i = 0; i < 5; i++) { const x = BXs(i); if (bankShow) { const rl = phase === 'bank'; die(x + (rl ? Math.sin(now * 30 + i) * 3 : 0), BYs, bankShow[i], BS, { rot: rl ? Math.sin(now * 20 + i * 2) * 0.5 : 0, lift: rl ? Math.abs(Math.sin(now * 14 + i)) * 14 : 0, glow: phase === 'done' && part(bank)[i] ? 'rgba(255,226,122,.25)' : null }); }
    else { c.fillStyle = 'rgba(0,0,0,.22)'; ART.rr(c, x - BS / 2, BYs - BS / 2, BS, BS, 11); c.fill(); c.strokeStyle = 'rgba(255,255,255,.15)'; c.lineWidth = 2; c.stroke(); } }
  if (phase === 'done') label(HANDS[rank(bank)[0]], W / 2, 196, 16, '#fff', 'center');
  // jugador
  label('Tus dados', W / 2, 244, 15, '#f3d9e5', 'center');
  const pp = anim === 0 ? part(dice) : null, rk = rank(dice)[0];
  for (let i = 0; i < 5; i++) { const rl = anim > 0 && !held[i], pr = rl ? 1 - anim / 0.75 : 1, bounce = rl ? Math.abs(Math.sin(pr * Math.PI * 2.5)) * (1 - pr) * 70 : 0;
    const x = PX(i) + (rl ? dxs[i] * (1 - pr) * (1 - pr) : 0), lift = bounce + (held[i] ? 10 + Math.sin(now * 3 + i) * 2 : 0);
    die(x, PY, rl ? face[i] : dice[i], PS, { rot: rl ? spin[i] * (1 - pr) * (1 - pr) : 0, lift, ring: held[i] ? '#ffd84a' : kbd && cur === i && phase === 'player' ? '#5ce1e6' : null, glow: pp && pp[i] && rk > 0 ? 'rgba(255,226,122,.22)' : null });
    if (held[i]) { ART.rr(c, PX(i) - 33, PY + 42, 66, 17, 8); ART.fillOut(c, '#ffd84a', 1.8); c.font = '800 10px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; c.fillText('GUARDADO', PX(i), PY + 51); } }
  if (anim === 0) { const s = rk >= 5 ? 1 + 0.05 * Math.sin(now * 8) : 1; c.save(); c.translate(W / 2, 404); c.scale(s, s); label(HANDS[rk], 0, 0, 22, rk >= 5 ? '#ffe27a' : '#fff', 'center'); c.restore(); }
  if (phase === 'player') { button(40, 440, 190, 52, `Tirar (${3 - rolls})`, '#7cf7a0', rolls < 3 && anim === 0, kbd && cur === 5, 'dice'); button(250, 440, 190, 52, 'Plantarse', '#f2d15c', anim === 0, kbd && cur === 6, 'hand');
    for (let r = 0; r < 3; r++) { c.beginPath(); c.arc(W / 2 - 16 + r * 16, 510, 5, 0, 6.283); ART.fillOut(c, r < 3 - rolls ? '#7cf7a0' : 'rgba(255,255,255,.15)', 1.5); } }
  const mc = phase === 'done' ? (result > 0 ? '#ffe27a' : result < 0 ? '#ff8a9a' : '#fff') : '#fff';
  label(msg, W / 2, phase === 'player' ? 548 : 470, phase === 'done' ? 18 : 14, mc, 'center');
  // apuesta
  const by = 566; if (phase === 'done') { label('Apuesta de la próxima mano', W / 2, 544, 13, '#f3d9e5', 'center');
    for (const [x, t] of [[120, '−'], [316, '+']]) { ART.rr(c, x, by + 3, 44, 38, 12); c.fillStyle = OUT; c.fill(); ART.rr(c, x, by, 44, 38, 12); ART.fillOut(c, '#f4e6c4', 2); c.fillStyle = OUT; c.font = '900 24px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x + 22, by + 20); }
    for (let i = 0; i < Math.min(5, nextBet / 10); i++) chip(206, by + 26 - i * 5, 12, ['#d5303e', '#2d6fd0', '#2a9a5a', '#ffb13d', '#b98cff'][i]); label(`${nextBet}`, 262, by + 8, 22, '#fff', 'center');
    label(chips <= 0 ? 'Sin fichas: toca para terminar' : 'Toca la mesa para la siguiente mano', W / 2, 614, 13, '#f3d9e5', 'center'); }
  else { chip(W / 2 - 40, 590, 11, '#d5303e'); label(`Apuesta ${bet}`, W / 2 - 22, 581, 15, '#fff'); }
}
