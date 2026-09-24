/* Rhythm Tap: toca los carriles cuando las notas llegan a la línea. Música generada con WebAudio.
 * Valoración PERFECTO / GENIAL / BIEN / FALLO, multiplicador por combo, precisión y barra de energía. */
const OUT = ART.OUT, R2 = 6.2832;
if (CFG.mode === 'drums') drumsGame(); else {
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#0d0a1f' }), c = k.ctx;
const LANES = 4, LW = 90, HITY = 530, SPEED = 420, COLS = ['#ff5f7a', '#f2d15c', '#5ce1e6', '#7cf7a0'], SCALE = [0, 3, 5, 7, 10, 12];
const JUD = [[0.05, 'PERFECTO', 100, 1, '#fff27a'], [0.09, 'GENIAL', 70, 0.8, '#7cf7a0'], [0.16, 'BIEN', 40, 0.5, '#5ce1e6']];
let ac, notes, beats, t, bpm, score, combo, maxCombo, hp, nextBeat, beatN, flash, judge, judgeT, judgeC, root, rings, accSum, accN, dead;
function audio() { if (k.muted()) return; if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freq, dur, type, vol, when) { if (!ac || k.muted()) return; const w0 = when || ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, w0); g.gain.exponentialRampToValueAtTime(0.001, w0 + dur); o.connect(g).connect(ac.destination); o.start(w0); o.stop(w0 + dur + 0.02); }
function kick(when) { if (!ac || k.muted()) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, when); o.frequency.exponentialRampToValueAtTime(40, when + 0.15); g.gain.setValueAtTime(0.5, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.2); o.connect(g).connect(ac.destination); o.start(when); o.stop(when + 0.22); }
function reset() { notes = []; beats = []; rings = []; t = 0; bpm = 100; score = 0; combo = 0; maxCombo = 0; hp = 100; nextBeat = 2.6; beatN = 0; flash = [0, 0, 0, 0]; judge = ''; judgeT = 0; judgeC = '#fff'; root = 220; accSum = 0; accN = 0; dead = 0; }
reset(); k.show(CFG.title, 'Toca cada carril cuando la nota cruce el anillo. Teclado: D F J K o flechas. Encadena combos para multiplicar y no dejes que se vacíe la barra.');
/* Entrada propia: varias teclas o dedos a la vez (el kit solo guarda un puntero) */
const KEYMAP = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
const pressed = [];
const keyIn = (code) => { if (KEYMAP[code] !== undefined && k.st === 'play' && !k.paused) pressed.push(KEYMAP[code]); };
addEventListener('keydown', (e) => { if (!e.repeat) keyIn(e.code); });
addEventListener('message', (e) => { const d = e.data; if (d && d.type === 'arcade:key' && d.event === 'keydown') keyIn(d.code);
  if (d && d.type === 'arcade:pkey' && d.down) keyIn({ left: 'ArrowLeft', down: 'ArrowDown', up: 'ArrowUp', right: 'ArrowRight' }[d.key]); }); /* mando de la tele (modo fiesta) */
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
  /* dificultad continua (1.23: más fácil): d 0→1 en 300 s (5 min). 72→140 ppm, densidad 0,32→0,77; corcheas desde 40 s y acordes desde 90 s, ambos con entrada gradual */
  audio(); t += dt; const d = Math.min(1, t / 300), e = d; bpm = 72 + 68 * e; const beat = 60 / bpm, travel = (HITY + 40) / SPEED;
  while (nextBeat < t + travel) { const at = nextBeat; beatN++; beats.push(at); if (ac) kick(ac.currentTime + Math.max(0, at - t)); const r = Math.random(), dens = 0.32 + 0.45 * e;
    if (r < dens) notes.push({ lane: k.ri(0, 3), time: at, pitch: k.pick(SCALE) });
    if (at > 40 && Math.random() < dens * 0.4 * Math.min(1, (at - 40) / 60)) notes.push({ lane: k.ri(0, 3), time: at + beat / 2, pitch: k.pick(SCALE) });
    if (at > 90 && Math.random() < 0.15 * Math.min(1, (at - 90) / 90)) { const l = k.ri(0, 2); notes.push({ lane: l, time: at, pitch: 0 }, { lane: l + 1, time: at, pitch: 7 }); }
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
    else if (!n || bd > 0.3) { hp -= 2; if (combo >= 10) k.sfx('hurt'); combo = 0; setJudge('FALLO', '#ff5f7a'); } }
  for (const n of notes) if (!n.hit && !n.miss && t - n.time > 0.16) { n.miss = true; hp -= 5 + 2.5 * Math.min(1, t / 300); miss(); }
  notes = notes.filter((n) => t - n.time < 0.6); beats = beats.filter((b) => t - b < 0.3);
  if (hp <= 0) { hp = 0; return k.lose(CFG.id, score, 'Te perdiste el ritmo', `${Math.floor(t)} s · Precisión ${acc()} % · Combo máx. ${maxCombo}`); }
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
}

/* ================= Tambores de Fiesta (CFG.mode 'drums'): 4 tamborileros, misma partitura =================
 * Cada columna = un jugador con dos tambores (A izquierda, B derecha). Notas simples, golpes dobles (A+B a la vez) y
 * redobles (barra larga: cada golpe suma). PERFECTO / BIEN / FALLO, multiplicador ×4, golpe sin nota rompe el combo.
 * Canción ≈2 min: 92 → 132 ppm. La CPU ocupa las plazas libres y afina más con 'cpu:<id>'. */
function drumsGame() {
  const W = 640, H = 360, NP = 4, CW = 160, TOP = 34, HITY = 262, SPEED = 190, SONG = 118, ID = CFG.id || 'tambores-de-fiesta';
  const k = Kit({ w: W, h: H, title: CFG.title, bg: '#120a2a' }), c = k.ctx;
  const CA = '#ff8a3c', CB = '#45c8ff', CD = '#ffd166', JW = [0.055, 0.12, 0.16];
  let P = [], notes = [], beats = [], t = 0, bpm = 92, songT = 0, nextBeat = 0, beatN = 0, over = false, overT = 0, cpuLv = 0, ac = null, seed = 1, rng = Math.random;
  const lsGet = (key) => { try { return +localStorage.getItem(key) || 0; } catch (e) { return 0; } };
  const lsSet = (key, v) => { try { localStorage.setItem(key, v); } catch (e) { /* sin almacenamiento */ } };
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let q = Math.imul(a ^ (a >>> 15), 1 | a); q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q; return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
  /* ---------- sonido ---------- */
  function audio() { if (k.muted()) return; if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* sin audio */ } if (ac && ac.state === 'suspended') ac.resume(); }
  function drum(kind, when, vol) {
    if (!ac || k.muted()) return; const w0 = Math.max(ac.currentTime, when || 0), o = ac.createOscillator(), g = ac.createGain();
    const f0 = kind === 'kick' ? 130 : kind === 'a' ? 210 : 820, f1 = kind === 'kick' ? 42 : kind === 'a' ? 95 : 560, d = kind === 'b' ? 0.07 : 0.2;
    o.type = kind === 'b' ? 'triangle' : 'sine'; o.frequency.setValueAtTime(f0, w0); o.frequency.exponentialRampToValueAtTime(f1, w0 + d * 0.8);
    g.gain.setValueAtTime(vol || 0.4, w0); g.gain.exponentialRampToValueAtTime(0.001, w0 + d); o.connect(g).connect(ac.destination); o.start(w0); o.stop(w0 + d + 0.02);
  }
  /* ---------- partitura compartida: se genera por delante del tiempo actual ---------- */
  const tempo = (x) => 92 + 40 * Math.min(1, x / SONG);
  function compose(upTo) {
    while (nextBeat < upTo && nextBeat < SONG) {
      const at = nextBeat, e = Math.min(1, at / SONG), beat = 60 / tempo(at), bar = beatN % 16; beatN++; beats.push(at);
      const roll = at > 20 && bar >= 12 && Math.floor(beatN / 16) % 3 === 2;   // redoble al final de cada tercera frase
      if (roll) { if (bar === 12) notes.push({ kind: 'roll', time: at, end: at + beat * 3.2, hits: {}, id: notes.length }); }
      else if (at >= 3) {
        const dens = 0.58 + 0.34 * e, r = rng();
        if (r < dens) {
          const dbl = at > 25 && rng() < 0.08 + 0.1 * e;
          notes.push({ kind: dbl ? 'ab' : rng() < 0.5 ? 'a' : 'b', time: at, st: {}, id: notes.length });
        }
        if (at > 18 && bar % 4 !== 3 && rng() < (0.12 + 0.35 * e) * Math.min(1, (at - 18) / 30)) notes.push({ kind: rng() < 0.5 ? 'a' : 'b', time: at + beat / 2, st: {}, id: notes.length });
      }
      nextBeat += beat;
    }
  }
  /* ---------- jugadores ---------- */
  function mk(pl) { return { p: pl.p, cpu: pl.cpu, name: pl.name, col: pl.color, score: 0, combo: 0, maxC: 0, perf: 0, good: 0, miss: 0, rollN: 0, judge: '', jc: '#fff', jt: 0, fa: 0, fb: 0, plan: [], pend: null, rings: [] }; }
  function setup() { const pl = k.players(NP); if (P.length !== NP) P = pl.map(mk); else P.forEach((q, i) => { q.cpu = pl[i].cpu; q.name = pl[i].name; q.col = pl[i].color; q.plan = []; }); }
  k.onParty = () => setup();
  function reset() {
    cpuLv = Math.min(10, lsGet('cpu:' + ID)); P = []; setup(); notes = []; beats = []; t = -0.2; songT = 0; nextBeat = 1.2; beatN = 0; over = false; overT = 0;
    seed = (Math.random() * 1e9) | 0; rng = mulberry(seed); kicked = 0; compose(7); k.count(3);
  }
  const mult = (q) => Math.min(4, 1 + Math.floor(q.combo / 10));
  function say(q, s, col) { q.judge = s; q.jc = col; q.jt = 0.6; }
  function award(q, n, off, x) {
    const pf = off < JW[0], pts = (pf ? 100 : 50) * mult(q); q.combo++; q.maxC = Math.max(q.maxC, q.combo); q.score += pts; if (pf) q.perf++; else q.good++;
    say(q, pf ? '¡PERFECTO!' : 'BIEN', pf ? '#fff27a' : '#7cf7a0'); q.rings.push({ x, t: 0, big: pf, col: n.kind === 'ab' ? CD : n.kind === 'a' ? CA : CB });
    k.burst(x, HITY, pf ? '#fff27a' : '#ffffff', pf ? 10 : 6, 140);
    if (q.combo % 10 === 0 && q.combo <= 30) k.float(`x${mult(q)}`, q.p * CW + CW / 2, 120, '#fff27a');
  }
  function breakCombo(q, s) { if (q.combo >= 10 && !q.cpu) k.sfx('hurt'); q.combo = 0; say(q, s || 'FALLO', '#ff5f7a'); }
  /* golpe de un jugador en un tambor ('a' | 'b') */
  function hit(q, d) {
    if (d === 'a') q.fa = 1; else q.fb = 1;
    if (!q.cpu) drum(d, 0, 0.35);
    const x0 = q.p * CW, lx = x0 + (d === 'a' ? 52 : 108);
    const roll = notes.find((n) => n.kind === 'roll' && t >= n.time - 0.05 && t <= n.end + 0.05);
    if (roll) { roll.hits[q.p] = (roll.hits[q.p] || 0) + 1; q.rollN++; q.score += 10 * mult(q); q.rings.push({ x: lx, t: 0, big: false, col: CD }); if (roll.hits[q.p] % 5 === 0) say(q, `¡${roll.hits[q.p]}!`, CD); return; }
    let best = null, bd = 9;
    for (const n of notes) { if (n.kind === 'roll' || n.st[q.p]) continue; if (n.kind !== 'ab' && n.kind !== d) continue; const o = Math.abs(n.time - t); if (o < bd) { bd = o; best = n; } }
    if (best && bd < JW[1]) {
      if (best.kind === 'ab') {
        const pd = q.pend && q.pend.n === best ? q.pend : null;
        if (pd && pd.d !== d) { best.st[q.p] = 'hit'; q.pend = null; award(q, best, Math.max(bd, pd.off), x0 + CW / 2); }
        else q.pend = { n: best, d, off: bd, t };
      } else { best.st[q.p] = 'hit'; award(q, best, bd, lx); }
      return;
    }
    if (!best || bd > JW[2] + 0.08) breakCombo(q);   // golpe sin nota cerca: rompe el combo
  }
  /* CPU: planifica sus golpes al aparecer cada nota (acierta, se adelanta/retrasa o falla según su nivel) */
  function cpuPlan(q, n) {
    const pMiss = Math.max(0.05, 0.2 - cpuLv * 0.012), pPerf = Math.min(0.7, 0.28 + cpuLv * 0.035) /* 1.23: CPU más fallona */, r = Math.random();
    if (n.kind === 'roll') { const rate = 7 + cpuLv * 0.6; for (let x = n.time + 0.05; x < n.end; x += 1 / rate * (0.8 + Math.random() * 0.4)) q.plan.push({ at: x, d: Math.random() < 0.5 ? 'a' : 'b' }); return; }
    if (r < pMiss) { if (Math.random() < 0.3) q.plan.push({ at: n.time + 0.2 + Math.random() * 0.1, d: Math.random() < 0.5 ? 'a' : 'b' }); return; }
    const off = (r < pMiss + pPerf ? 0.035 : 0.1) * (Math.random() * 2 - 1);
    if (n.kind === 'ab') q.plan.push({ at: n.time + off, d: 'a' }, { at: n.time + off + 0.01, d: 'b' }); else q.plan.push({ at: n.time + off, d: n.kind });
  }
  /* ---------- toque en solitario: mitad izquierda = A, derecha = B (varios dedos) ---------- */
  const taps = [];
  addEventListener('pointerdown', (e) => { audio(); if (k.st !== 'play' || k.paused || k.party) return; const r = k.cv.getBoundingClientRect(), x = (e.clientX - r.left) / k.scale; taps.push(x < W / 2 ? 'a' : 'b'); });
  /* ---------- bucle ---------- */
  function update(dt) {
    for (const q of P) { q.jt -= dt; q.fa = Math.max(0, q.fa - dt * 5); q.fb = Math.max(0, q.fb - dt * 5); q.rings.forEach((r) => (r.t += dt)); q.rings = q.rings.filter((r) => r.t < 0.35); }
    if (!k.gate(reset)) { taps.length = 0; return; }
    if (k.counting()) { taps.length = 0; return; }
    audio();
    if (over) { overT += dt; if (overT > 1.4) finish(); return; }
    t += dt; bpm = tempo(t);
    compose(t + (HITY - TOP) / SPEED + 0.3);
    for (const n of notes) if (!n.pl) { n.pl = 1; for (const q of P) if (q.cpu) cpuPlan(q, n); }
    while (beats.length && beats[0] < t - 0.3) beats.shift();
    // entrada: humanos por mando/teclado (A/B o ← →), J1 en solitario también con toques
    for (const q of P) {
      if (q.cpu) { while (q.plan.length && q.plan[0].at <= t) hit(q, q.plan.shift().d); continue; }
      if (k.phit(q.p, 'a') || k.phit(q.p, 'left')) hit(q, 'a');
      if (k.phit(q.p, 'b') || k.phit(q.p, 'right')) hit(q, 'b');
      if (q.p === 0 && !k.party) for (const d of taps) hit(q, d);
    }
    taps.length = 0;
    // notas pasadas sin golpe = fallo (el golpe doble a medias también)
    for (const n of notes) if (n.kind !== 'roll' && t - n.time > JW[1]) for (const q of P) if (!n.st[q.p]) { n.st[q.p] = 'miss'; q.miss++; if (q.pend && q.pend.n === n) q.pend = null; breakCombo(q); }
    notes = notes.filter((n) => t - (n.end || n.time) < 0.7);
    if (t >= SONG + 1.5) { over = true; overT = 0; k.sfx('win'); k.confetti(); }
  }
  // bombo: se programa por pulso con WebAudio (más preciso que por fotograma)
  let kicked = 0;
  function kicks() { if (!ac || over || k.st !== 'play' || k.counting() || k.paused) return; for (const b of beats) if (b > kicked && b <= t + 0.12) { kicked = b; drum('kick', ac.currentTime + Math.max(0, b - t), 0.5); } }
  function finish() {
    over = false; const rows = P.map((q) => ({ p: q.p, score: q.score })), hu = P.filter((q) => !q.cpu), top = Math.max(...rows.map((r) => r.score));
    if (hu.length === 1 && hu[0].score === top) lsSet('cpu:' + ID, Math.min(10, cpuLv + 0.5));
    k.podium(rows, { fmt: (v) => v + ' pts', head: hu.length === 1 && hu[0].score === top && rows.filter((r) => r.score === top).length === 1 ? '¡Has ganado!' : undefined });
  }
  /* ---------- dibujo ---------- */
  function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
  const BG = off(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2b1460'); gr.addColorStop(0.6, '#170b3a'); gr.addColorStop(1, '#0a0620'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (const [x, col] of [[60, 'rgba(255,95,180,.13)'], [320, 'rgba(255,209,102,.1)'], [580, 'rgba(92,225,230,.13)']]) { g.fillStyle = col; g.beginPath(); g.moveTo(x - 5, 0); g.lineTo(x + 5, 0); g.lineTo(x + 90, H); g.lineTo(x - 90, H); g.fill(); }
    for (let i = 0; i < 60; i++) { const r = Math.sin(i * 91.7) * 43758.5, f = r - Math.floor(r); g.fillStyle = `rgba(255,255,255,${0.15 + f * 0.4})`; g.fillRect((i * 131) % W, (f * 997) % 200, 1.6, 1.6); }
    for (let p = 0; p < NP; p++) {
      const x0 = p * CW; ART.rr(g, x0 + 6, TOP, CW - 12, HITY - TOP + 26, 14); g.fillStyle = 'rgba(14,9,36,.78)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
      for (const lx of [52, 108]) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x0 + lx - 22, TOP + 4, 44, HITY - TOP - 4); }
    }
  });
  function label(s, x, y, size, col, align, base) {
    c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
    c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
  }
  function drumHead(x, y, col, fl, key) {
    const s = 1 + fl * 0.12;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y + 16, 24, 7, 0, 0, R2); c.fill();
    c.beginPath(); c.ellipse(x, y + 6, 23 * s, 12 * s, 0, 0, R2); ART.fillOut(c, ART.dark(col, 0.35), 2.5);
    c.beginPath(); c.ellipse(x, y, 23 * s, 12 * s, 0, 0, R2); ART.fillOut(c, col, 2.5);
    c.beginPath(); c.ellipse(x, y - 1, 17 * s, 8 * s, 0, 0, R2); c.fillStyle = fl ? '#fff' : '#f4ecd8'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
    label(key, x, y - 1, 12, fl ? col : '#6d6590', 'center', 'middle');
  }
  function noteDot(x, y, col, r) {
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(x + 1.5, y + 3, r, 0, R2); c.fill();
    c.beginPath(); c.arc(x, y, r, 0, R2); ART.fillOut(c, col, 2.5);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.38, r * 0.42, r * 0.24, -0.4, 0, R2); c.fill();
  }
  function draw() {
    kicks();
    c.drawImage(BG, 0, 0, W, H);
    const bp = ((t > 0 ? t : 0) * bpm / 60) % 1, pulse = t > 0 && k.st === 'play' ? Math.pow(1 - bp, 3) : 0;
    const tv = k.st === 'ready' ? (notes.length ? notes[0].time - 0.3 : 0) : t, Y = (tm) => HITY - (tm - tv) * SPEED;   // en la portada ya se ven notas bajando
    for (const q of P) {
      const x0 = q.p * CW, xa = x0 + 52, xb = x0 + 108, xm = x0 + CW / 2;
      c.save(); ART.rr(c, x0 + 6, TOP, CW - 12, HITY - TOP + 26, 14); c.clip();
      c.globalAlpha = 0.12 * pulse; c.fillStyle = q.col; c.fillRect(x0, TOP, CW, HITY); c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,.1)'; for (const b of beats) { const y = Y(b); if (y > TOP && y < HITY) c.fillRect(x0 + 12, y - 1, CW - 24, 2); }
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x0 + 8, HITY - 2, CW - 16, 4);
      for (const n of notes) {
        if (n.kind === 'roll') { const y1 = Y(n.time), y2 = Y(n.end); if (y1 < TOP - 20) continue; const top = Math.max(TOP - 20, y2), hh = Math.max(0, Math.min(HITY + 20, y1) - top);
          if (hh <= 0) continue; ART.rr(c, xa - 18, top, xb - xa + 36, Math.max(36, y1 - top + 18), 18); c.fillStyle = ART.alpha(CD, t >= n.time && t <= n.end ? 0.75 : 0.5); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
          if (y1 > TOP + 10 && y1 < HITY + 10) label('REDOBLE', xm, Math.min(y1, HITY) - 10, 14, '#fff', 'center', 'middle'); continue; }
        const st = n.st[q.p]; if (st === 'hit') continue; const y = Y(n.time); if (y < TOP - 20 || y > H) continue;
        if (st === 'miss') c.globalAlpha = 0.35;
        if (n.kind === 'ab') { ART.rr(c, xa - 16, y - 10, xb - xa + 32, 20, 10); ART.fillOut(c, CD, 2.5); noteDot(xa, y, CA, 11); noteDot(xb, y, CB, 11); }
        else noteDot(n.kind === 'a' ? xa : xb, y, n.kind === 'a' ? CA : CB, 14);
        c.globalAlpha = 1;
      }
      c.restore();
      drumHead(xa, HITY + 2, CA, q.fa, 'A'); drumHead(xb, HITY + 2, CB, q.fb, 'B');
      for (const r of q.rings) { const p = r.t / 0.35; c.globalAlpha = 1 - p; c.lineWidth = r.big ? 5 : 3; c.strokeStyle = r.big ? '#fff27a' : r.col; c.beginPath(); c.arc(r.x, HITY, 18 + p * (r.big ? 30 : 20), 0, R2); c.stroke(); c.globalAlpha = 1; }
      if (q.combo >= 5) { c.globalAlpha = 0.7; label(String(q.combo), xm, 88, 30, mult(q) >= 4 ? '#fff27a' : '#fff', 'center', 'middle'); label('COMBO', xm, 110, 12, '#b8b0ff', 'center', 'middle'); c.globalAlpha = 1; }
      if (q.jt > 0) { const p = 1 - q.jt / 0.6, s = p < 0.15 ? 0.6 + p / 0.15 * 0.5 : 1.1 - Math.min(0.1, (p - 0.15) * 0.4); c.save(); c.translate(xm, 160 - p * 8); c.scale(s, s); c.globalAlpha = Math.min(1, q.jt / 0.2); label(q.judge, 0, 0, 20, q.jc, 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
      // placa del jugador (abajo)
      ART.rr(c, x0 + 8, 300, CW - 16, 54, 12); ART.fillOut(c, 'rgba(26,21,48,.9)', 2.5); c.fillStyle = q.col; ART.rr(c, x0 + 12, 304, 6, 46, 3); c.fill();
      label(q.name.slice(0, 8), x0 + 24, 305, 18, q.col); label(String(q.score), x0 + 24, 327, 22, '#fff');
      label(`x${mult(q)}`, x0 + CW - 14, 329, 18, mult(q) > 1 ? '#fff27a' : '#8a86b5', 'right');
    }
    // progreso de la canción (arriba, a los lados de la pausa)
    const pr = Math.max(0, Math.min(1, t / SONG)); ART.rr(c, 10, 12, 250, 10, 5); c.fillStyle = '#1b1438'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    if (pr > 0) { ART.rr(c, 12, 14, 246 * pr, 6, 3); c.fillStyle = '#b98cff'; c.fill(); }
    label(`${Math.round(bpm)} ppm`, W - 12, 8, 16, '#c9c3ff', 'right');
  }
  window.__dr = { get P() { return P; }, get notes() { return notes; }, get t() { return t; } };
  reset();
  k.show(CFG.title || 'Tambores de Fiesta', 'Golpea el tambor A o B cuando la nota llegue a su parche. Las barras amarillas piden los dos a la vez y en los redobles cuenta cada golpe. Teclado: A = Espacio/Z/←, B = X/→. En pantalla táctil: mitad izquierda A, derecha B.<br>Toca para jugar');
  k.run(update, draw);
}
