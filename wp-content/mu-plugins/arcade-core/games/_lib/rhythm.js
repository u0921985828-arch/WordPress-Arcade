/* Rhythm Tap: toca los carriles cuando las notas llegan a la línea. Música generada con WebAudio.
 * Valoración PERFECTO / GENIAL / BIEN / FALLO, multiplicador por combo, precisión y barra de energía. */
const OUT = ART.OUT, R2 = 6.2832;
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#0d0a1f' }), c = k.ctx;
const LANES = 4, LW = 90, HITY = 530, SPEED = 420, COLS = ['#ff5f7a', '#f2d15c', '#5ce1e6', '#7cf7a0'], SCALE = [0, 3, 5, 7, 10, 12];
const JUD = [[0.05, 'PERFECTO', 100, 1, '#fff27a'], [0.09, 'GENIAL', 70, 0.8, '#7cf7a0'], [0.16, 'BIEN', 40, 0.5, '#5ce1e6']];
let ac, notes, beats, t, bpm, score, combo, maxCombo, hp, nextBeat, beatN, flash, judge, judgeT, judgeC, root, rings, accSum, accN, dead;
function audio() { if (k.muted()) return; if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freq, dur, type, vol, when) { if (!ac || k.muted()) return; const w0 = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, w0); g.gain.exponentialRampToValueAtTime(0.001, w0 + dur); o.connect(g).connect(ac.destination); o.start(w0); o.stop(w0 + dur + 0.02); }
function kick(when) { if (!ac || k.muted()) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, when); o.frequency.exponentialRampToValueAtTime(40, when + 0.15); g.gain.setValueAtTime(0.5, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.2); o.connect(g).connect(ac.destination); o.start(when); o.stop(when + 0.22); }
function reset() { notes = []; beats = []; rings = []; t = 0; bpm = 100; score = 0; combo = 0; maxCombo = 0; hp = 100; nextBeat = 1.5; beatN = 0; flash = [0, 0, 0, 0]; judge = ''; judgeT = 0; judgeC = '#fff'; root = 220; accSum = 0; accN = 0; dead = 0; }
reset(); k.show(CFG.title, 'Toca cada carril cuando la nota cruce el anillo. Teclado: D F J K o flechas. Encadena combos para multiplicar y no dejes que se vacíe la barra.');
/* Entrada propia: varias teclas o dedos a la vez (el kit solo guarda un puntero) */
const KEYMAP = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
const pressed = [];
const keyIn = (code) => { if (KEYMAP[code] !== undefined && k.st === 'play' && !k.paused) pressed.push(KEYMAP[code]); };
addEventListener('keydown', (e) => { if (!e.repeat) keyIn(e.code); });
addEventListener('message', (e) => { const d = e.data; if (d && d.type === 'arcade:key' && d.event === 'keydown') keyIn(d.code); });
addEventListener('pointerdown', (e) => { audio(); if (k.st !== 'play' || k.paused) return; const r = k.cv.getBoundingClientRect(), x = (e.clientX - r.left) / k.scale, y = (e.clientY - r.top) / k.scale; if (y > 200 && x >= 0 && x < 360) pressed.push(Math.min(3, Math.floor(x / LW))); });
const acc = () => (accN ? Math.round(accSum / accN * 100) : 100);
const mult = () => Math.min(4, 1 + Math.floor(combo / 10));
function setJudge(s, col) { judge = s; judgeC = col; judgeT = 0.55; }
function miss() { if (combo >= 10) k.sfx('hurt'); combo = 0; accN++; setJudge('FALLO', '#ff5f7a'); }

/* ---------- gráficos cacheados */
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const BG = off(360, 640, (g) => {
  let gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, '#2a1260'); gr.addColorStop(0.45, '#150b36'); gr.addColorStop(1, '#07051a'); g.fillStyle = gr; g.fillRect(0, 0, 360, 640);
  // focos del escenario
  for (const [x, col] of [[40, 'rgba(255,95,180,.16)'], [320, 'rgba(92,225,230,.16)']]) { g.fillStyle = col; g.beginPath(); g.moveTo(x - 6, 0); g.lineTo(x + 6, 0); g.lineTo(180 + (x - 180) * 0.2 + 70, 640); g.lineTo(180 + (x - 180) * 0.2 - 70, 640); g.fill(); }
  // estrellas
  for (let i = 0; i < 70; i++) { const r = Math.sin(i * 91.7) * 43758.5; const f = r - Math.floor(r); g.fillStyle = `rgba(255,255,255,${0.2 + f * 0.5})`; g.fillRect(((i * 97) % 360), (f * 997) % 640, 1.6, 1.6); }
  // carriles
  for (let i = 0; i < LANES; i++) { const x = i * LW; gr = g.createLinearGradient(0, 70, 0, 640); gr.addColorStop(0, 'rgba(20,14,48,0)'); gr.addColorStop(0.25, 'rgba(20,14,48,.75)'); gr.addColorStop(1, 'rgba(14,10,34,.95)'); g.fillStyle = gr; g.fillRect(x + 3, 70, LW - 6, 570);
    g.fillStyle = COLS[i]; g.globalAlpha = 0.35; g.fillRect(x + 3, 70, 2, 570); g.fillRect(x + LW - 5, 70, 2, 570); g.globalAlpha = 1; }
  // zona de golpeo
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, HITY - 26, 360, 52);
  // almohadillas táctiles inferiores
  for (let i = 0; i < LANES; i++) { ART.rr(g, i * LW + 8, 590, LW - 16, 40, 12); g.fillStyle = '#1e1745'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = COLS[i]; g.globalAlpha = 0.25; ART.rr(g, i * LW + 12, 594, LW - 24, 8, 4); g.fill(); g.globalAlpha = 1; }
});
const noteSpr = (col) => off(LW, 44, (g) => {
  const rg = g.createRadialGradient(LW / 2, 22, 4, LW / 2, 22, 44); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 0.45; g.fillStyle = rg; g.fillRect(0, 0, LW, 44); g.globalAlpha = 1;
  ART.rr(g, 9, 9, LW - 18, 26, 13); const lg = g.createLinearGradient(0, 9, 0, 35); lg.addColorStop(0, '#fff'); lg.addColorStop(0.18, col); lg.addColorStop(1, col); g.fillStyle = lg; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = 'rgba(0,0,0,.18)'; ART.rr(g, 13, 25, LW - 26, 7, 3.5); g.fill();
  g.fillStyle = 'rgba(255,255,255,.75)'; ART.rr(g, 18, 13, LW - 44, 5, 2.5); g.fill();
  g.beginPath(); g.arc(LW / 2, 22, 5, 0, R2); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
});
const SPR = COLS.map(noteSpr), GREY = noteSpr('#5a5670');
const GLOW = COLS.map((col) => off(LW, 300, (g) => { const lg = g.createLinearGradient(0, 300, 0, 0); lg.addColorStop(0, col); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(4, 0, LW - 8, 300); }));

function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}

k.run((dt) => {
  judgeT -= dt; flash = flash.map((f) => Math.max(0, f - dt * 4)); rings.forEach((r) => (r.t += dt)); rings = rings.filter((r) => r.t < 0.4);
  if (!k.gate(reset)) { pressed.length = 0; return; }
  audio(); t += dt; bpm = Math.min(170, 100 + t * 0.8); const beat = 60 / bpm, travel = (HITY + 40) / SPEED;
  while (nextBeat < t + travel) { const at = nextBeat; beatN++; beats.push(at); if (ac) kick(ac.currentTime + Math.max(0, at - t)); const r = Math.random(), dens = Math.min(0.9, 0.45 + t / 200);
    if (r < dens) notes.push({ lane: k.ri(0, 3), time: at, pitch: k.pick(SCALE) });
    if (t > 20 && Math.random() < dens * 0.4) notes.push({ lane: k.ri(0, 3), time: at + beat / 2, pitch: k.pick(SCALE) });
    if (t > 40 && Math.random() < 0.15) { const l = k.ri(0, 2); notes.push({ lane: l, time: at, pitch: 0 }, { lane: l + 1, time: at, pitch: 7 }); }
    nextBeat += beat; }
  // quita notas duplicadas en el mismo carril y momento
  const seen = {}; notes = notes.filter((n) => { const key = n.lane + ':' + Math.round(n.time * 100); if (seen[key]) return false; seen[key] = 1; return true; });
  const taps = pressed.splice(0);
  for (const lane of taps) { if (lane < 0 || lane > 3) continue; flash[lane] = 1; let n = null, bd = 9;
    for (const q of notes) if (q.lane === lane && !q.hit && !q.miss && Math.abs(q.time - t) < bd) { bd = Math.abs(q.time - t); n = q; }
    if (n && bd < 0.16) { n.hit = true; const j = JUD.find((q) => bd < q[0]); combo++; maxCombo = Math.max(maxCombo, combo); const pts = j[2] * mult(); score += pts; accSum += j[3]; accN++;
      hp = Math.min(100, hp + (j[3] === 1 ? 4 : 2)); setJudge(j[1], j[4]); tone(root * Math.pow(2, n.pitch / 12) * 2, 0.25, 'triangle', 0.15);
      rings.push({ lane, t: 0, col: COLS[lane], big: j[3] === 1 }); k.burst(lane * LW + LW / 2, HITY, j[3] === 1 ? '#fff27a' : COLS[lane], j[3] === 1 ? 14 : 8, 170);
      if (combo % 50 === 0) { k.float(`¡${combo} COMBO!`, 180, 300, '#fff27a'); k.sfx('coin'); } else if (combo % 10 === 0 && combo <= 30) k.float(`x${mult()}`, 180, 300, '#fff27a'); }
    else if (!n || bd > 0.3) { hp -= 3; if (combo >= 10) k.sfx('hurt'); combo = 0; setJudge('FALLO', '#ff5f7a'); } }
  for (const n of notes) if (!n.hit && !n.miss && t - n.time > 0.16) { n.miss = true; hp -= 9; miss(); }
  notes = notes.filter((n) => t - n.time < 0.6); beats = beats.filter((b) => t - b < 0.3);
  if (hp <= 0) { hp = 0; return k.lose(CFG.id, score, 'Te perdiste el ritmo', NREC(score) + `${Math.floor(t)} s · Precisión ${acc()} % · Combo máx. ${maxCombo}`); }
}, () => {
  c.drawImage(BG, 0, 0, 360, 640);
  const bp = (t * bpm / 60) % 1, pulse = t > 0 ? Math.pow(1 - bp, 3) : 0;
  // resplandor al ritmo
  c.globalAlpha = 0.18 * pulse; c.fillStyle = '#b98cff'; c.fillRect(0, 70, 360, 570); c.globalAlpha = 1;
  // líneas de compás
  c.fillStyle = 'rgba(255,255,255,.12)'; for (const b of beats) { const y = HITY - (b - t) * SPEED; if (y > 70 && y < HITY) c.fillRect(6, y - 1, 348, 2); }
  // brillo del carril pulsado
  for (let i = 0; i < LANES; i++) if (flash[i]) { c.globalAlpha = flash[i] * 0.55; c.drawImage(GLOW[i], i * LW, HITY - 300, LW, 300); c.globalAlpha = 1; }
  // receptores
  for (let i = 0; i < LANES; i++) { const x = i * LW + LW / 2, s = 1 + flash[i] * 0.12 + pulse * 0.05;
    c.beginPath(); c.arc(x, HITY, 26 * s, 0, R2); c.fillStyle = flash[i] ? COLS[i] : 'rgba(20,14,48,.9)'; c.fill(); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 3; c.strokeStyle = COLS[i]; c.stroke();
    c.beginPath(); c.arc(x, HITY, 12 * s, 0, R2); c.fillStyle = flash[i] ? '#fff' : 'rgba(255,255,255,.12)'; c.fill();
    // almohadilla táctil
    c.globalAlpha = 0.35 + flash[i] * 0.65; c.fillStyle = COLS[i]; ART.rr(c, i * LW + 12, 594 + flash[i] * 2, LW - 24, 32, 9); c.fill(); c.globalAlpha = 1;
    label('DFJK'[i], x, 610 + flash[i] * 2, 15, flash[i] ? '#fff' : '#d8d4f5', 'center', 'middle'); }
  // notas
  for (const n of notes) { if (n.hit) continue; const y = HITY - (n.time - t) * SPEED; if (y < 40) continue;
    if (n.miss) { c.globalAlpha = Math.max(0, 1 - (t - n.time) * 2); c.drawImage(GREY, n.lane * LW, y - 22, LW, 44); c.globalAlpha = 1; }
    else c.drawImage(SPR[n.lane], n.lane * LW, y - 22, LW, 44); }
  // anillos de acierto
  for (const r of rings) { const p = r.t / 0.4; c.globalAlpha = 1 - p; c.lineWidth = r.big ? 6 : 4; c.strokeStyle = r.big ? '#fff27a' : r.col; c.beginPath(); c.arc(r.lane * LW + LW / 2, HITY, 26 + p * (r.big ? 40 : 26), 0, R2); c.stroke(); c.globalAlpha = 1; }
  // combo grande de fondo
  if (combo >= 5) { c.globalAlpha = 0.85; label(combo, 180, 230, 54, mult() >= 4 ? '#fff27a' : '#fff', 'center', 'middle'); label('COMBO', 180, 268, 15, '#b8b0ff', 'center', 'middle'); c.globalAlpha = 1; }
  // valoración con "pop"
  if (judgeT > 0) { const p = 1 - judgeT / 0.55, s = p < 0.15 ? 0.6 + p / 0.15 * 0.55 : 1.15 - Math.min(0.15, (p - 0.15) * 0.5); c.save(); c.translate(180, 340 - p * 10); c.scale(s, s); c.globalAlpha = Math.min(1, judgeT / 0.2); label(judge, 0, 0, 32, judgeC, 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
  // HUD
  label(score, 12, 10, 26, '#fff'); label(`x${mult()}`, 14, 40, 15, mult() > 1 ? '#fff27a' : '#8a86b5');
  label(`${acc()} %`, 348, 10, 20, '#5ce1e6', 'right'); label('precisión', 348, 34, 11, '#b8b0ff', 'right');
  // barra de energía
  const bw = 96, bx = 348 - bw; ART.rr(c, bx, 52, bw, 12, 6); c.fillStyle = '#1b1438'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
  const hw = Math.max(0, hp) / 100 * (bw - 4); if (hw > 1) { ART.rr(c, bx + 2, 54, hw, 8, 4); c.fillStyle = hp > 60 ? '#7cf7a0' : hp > 30 ? '#f2d15c' : '#ff5f7a'; c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(bx + 5, 55, Math.max(0, hw - 6), 2); }
});

/* ¿la puntuación supera el récord guardado? (se consulta antes de que k.lose/k.end lo actualicen) */
function NREC(s) { let b = 0; try { b = +localStorage.getItem('best:' + CFG.id) || 0; } catch (e) {} if (s > b && s > 0) { k.confetti(); return '¡Nuevo récord! · '; } return ''; }
