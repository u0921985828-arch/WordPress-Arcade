/* Rhythm Tap: toca los carriles cuando las notas llegan a la línea. Música generada con WebAudio.
 * Valoración PERFECTO / GENIAL / BIEN / FALLO, multiplicador por combo, precisión y barra de energía. */
const OUT = ART.OUT, R2 = 6.2832;
if (CFG.mode === 'drums') drumsGame(); else if (CFG.mode === 'dance') danceGame(); else if (CFG.mode === 'piano') pianoGame(); else {
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
/* ================= Flechas de Baile (CFG.mode 'dance'): 2–4 pistas de cuatro flechas =================
 * Todos bailan la misma coreografía: las flechas suben hasta los huecos de arriba; pulsa esa dirección al coincidir.
 * Dobles (dos direcciones a la vez, se hacen con la diagonal del joystick) y largas (mantener hasta el final).
 * PERFECTO / GENIAL / BIEN / FALLO; combo ×1..×4. Canción ≈100 s: 100 → 140 ppm. Pulsar sin flecha no penaliza.
 * Táctil (J1 en solitario): la pantalla se divide en cuatro columnas ← ↓ ↑ → (varios dedos, mantener para las largas).
 * La CPU ocupa las pistas libres y afina más con 'cpu:<id>'. */
function danceGame() {
  const W = 640, H = 360, TOPY = 76, SPEED = 200, SONG = 100, ID = CFG.id || 'flechas-de-baile', OUT = ART.OUT, R2 = 6.2832;
  const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1a0f33' }), c = k.ctx;
  const DIRS = ['left', 'down', 'up', 'right'], DCOL = ['#ff6fb5', '#5b8cff', '#a8cf3f', '#ffc94d'], ROT = [-Math.PI / 2, Math.PI, 0, Math.PI / 2];
  const JW = [0.05, 0.1, 0.15], JN = ['¡PERFECTO!', '¡GENIAL!', 'BIEN'], JC = ['#fff27a', '#7cf7a0', '#8fd3ff'], JP = [100, 70, 40], CNAME = ['roja', 'azul', 'amarilla', 'verde'];
  let P = [], notes = [], beats = [], t = 0, bpm = 100, nextBeat = 0, beatN = 0, over = false, overT = 0, LV = 0, rng = Math.random, busy = [0, 0, 0, 0], lastD = -1, touchUI = false;
  const lsGet = (key) => { try { return +localStorage.getItem(key) || 0; } catch (e) { return 0; } };
  const lsSet = (key, v) => { try { localStorage.setItem(key, v); } catch (e) { /* sin almacenamiento */ } };
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let q = Math.imul(a ^ (a >>> 15), 1 | a); q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q; return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(R2 * Math.random()); };
  const nLanes = () => (k.party ? Math.max(2, ...k.party.map((q) => q.p + 1)) : 2);
  /* ---------- música: bombo y charles sintetizados por pulso ---------- */
  let ac = null, kicked = 0;
  function audio() { if (k.muted()) return; if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* sin audio */ } if (ac && ac.state === 'suspended') ac.resume(); }
  function tone(f0, f1, d, when, vol, type) { if (!ac || k.muted()) return; const w0 = Math.max(ac.currentTime, when), o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, w0); o.frequency.exponentialRampToValueAtTime(f1, w0 + d * 0.8); g.gain.setValueAtTime(vol, w0); g.gain.exponentialRampToValueAtTime(0.001, w0 + d); o.connect(g).connect(ac.destination); o.start(w0); o.stop(w0 + d + 0.02); }
  const BASS = [55, 55, 65.4, 73.4, 49, 49, 58.3, 65.4];
  function music() { if (!ac || over || k.st !== 'play' || k.counting() || k.paused) return; for (let i = 0; i < beats.length; i++) { const b = beats[i]; if (b.at > kicked && b.at <= t + 0.12) { kicked = b.at; const w = ac.currentTime + Math.max(0, b.at - t); tone(130, 42, 0.2, w, 0.45); tone(BASS[(b.n >> 1) % 8] * 2, BASS[(b.n >> 1) % 8] * 2, 0.22, w + 0.01, 0.12, 'triangle'); tone(900, 700, 0.05, w + 60 / bpm / 2, 0.06, 'square'); } } }
  /* ---------- coreografía compartida ---------- */
  const tempo = (x) => 100 + 40 * Math.min(1, x / SONG);
  function pickDir(avoid) { for (let n = 0; n < 12; n++) { const d = (rng() * 4) | 0; if (busy[d] > nextBeat - 0.01 || avoid.indexOf(d) >= 0) continue; if (d === lastD && rng() < 0.6) continue; return d; } return -1; }
  function add(d, at, end) { const n = { d, time: at, end: end || 0, st: {}, hs: {}, id: notes.length }; notes.push(n); lastD = d; if (end) busy[d] = end + 0.15; return n; }
  function compose(upTo) {
    while (nextBeat < upTo && nextBeat < SONG) {
      const at = nextBeat, e = Math.min(1, at / SONG), beat = 60 / tempo(at), bar = beatN % 16; beats.push({ at, n: beatN }); beatN++;
      if (at >= 3 && !(bar >= 14 && Math.floor(beatN / 16) % 4 === 3)) {   // respiro al final de cada cuarta frase
        if (rng() < 0.55 + 0.35 * e) {
          if (at > 20 && rng() < 0.06 + 0.1 * e) { const a = pickDir([]), b = a >= 0 ? pickDir([a]) : -1; if (a >= 0) add(a, at).dbl = b >= 0; if (b >= 0) add(b, at).dbl = true; }
          else if (at > 12 && rng() < 0.1 + 0.05 * e) { const d = pickDir([]); if (d >= 0) add(d, at, at + beat * (1 + ((rng() * 2) | 0))); }
          else { const d = pickDir([]); if (d >= 0) add(d, at); }
        }
        if (at > 28 && bar % 4 !== 3 && rng() < (0.1 + 0.3 * e) * Math.min(1, (at - 28) / 30)) { const d = pickDir([]); if (d >= 0) add(d, at + beat / 2); }
      }
      nextBeat += beat;
    }
  }
  /* ---------- jugadores ---------- */
  function mk(pl) { return { p: pl.p, cpu: pl.cpu, name: pl.name, col: pl.color, score: 0, combo: 0, maxC: 0, cnt: [0, 0, 0, 0], judge: '', jc: '#fff', jt: 0, fl: [0, 0, 0, 0], plan: [], hold: [0, 0, 0, 0], rings: [] }; }
  const nm = (q) => (q.cpu ? 'CPU ' + CNAME[q.p % 4] : String(q.name).slice(0, 10));
  function setup() { const n = nLanes(), pl = k.players(n); if (P.length !== n) P = pl.map(mk); else P.forEach((q, i) => { q.cpu = pl[i].cpu; q.name = pl[i].name; q.col = pl[i].color; q.plan = []; }); }
  k.onParty = () => { if (k.st !== 'play') { P = []; setup(); } else setup(); };
  function reset() {
    LV = Math.min(10, lsGet('cpu:' + ID)); P = []; setup(); notes = []; beats = []; t = -0.2; nextBeat = 1.4; beatN = 0; over = false; overT = 0; busy = [0, 0, 0, 0]; lastD = -1; kicked = 0;
    rng = mulberry((Math.random() * 1e9) | 0); compose(8); k.count(3);
  }
  const mult = (q) => Math.min(4, 1 + Math.floor(q.combo / 10));
  const laneX = (q) => { const LW = W / P.length; return q.p * LW; };
  const colX = (q, d) => { const LW = W / P.length, cw = Math.min(58, (LW - 20) / 4); return laneX(q) + LW / 2 + (d - 1.5) * cw; };
  function say(q, s, col) { q.judge = s; q.jc = col; q.jt = 0.6; }
  function breakCombo(q, s) { if (q.combo >= 10 && !q.cpu) k.sfx('hurt'); q.combo = 0; say(q, s || 'FALLO', '#ff5f7a'); }
  function press(q, di) {
    q.fl[di] = 1; let best = null, bd = 9;
    for (const n of notes) { if (n.d !== di || n.st[q.p]) continue; const o = Math.abs(n.time - t); if (o < bd) { bd = o; best = n; } }
    if (!best || bd > JW[2]) return;
    const j = bd < JW[0] ? 0 : bd < JW[1] ? 1 : 2; best.st[q.p] = 'hit'; q.cnt[j]++; q.combo++; q.maxC = Math.max(q.maxC, q.combo); q.score += JP[j] * mult(q);
    say(q, JN[j], JC[j]); q.rings.push({ d: di, t: 0, big: j === 0 }); k.burst(colX(q, di), TOPY, j === 0 ? '#fff27a' : DCOL[di], j === 0 ? 8 : 5, 120);
    if (best.end) best.hs[q.p] = 'on';
    if (q.combo % 10 === 0 && q.combo <= 30) k.float(`x${mult(q)}`, laneX(q) + W / P.length / 2, 150, '#fff27a');
  }
  function cpuPlan(q, n) {
    const pMiss = Math.max(0.04, 0.18 - LV * 0.012), sig = Math.max(0.025, 0.075 - LV * 0.005);
    if (Math.random() < pMiss) return;
    const at = n.time + gauss() * sig; q.plan.push({ at, d: n.d, rel: n.end ? (Math.random() < Math.max(0.03, 0.15 - LV * 0.01) ? n.time + (n.end - n.time) * 0.5 : n.end + 0.05) : at + 0.08 });
    q.plan.sort((a, b) => a.at - b.at);
  }
  /* ---------- táctil en solitario: cuatro columnas de pantalla ---------- */
  const touches = new Map(), tHit = new Set();
  const zone = (e) => { const r = k.cv.getBoundingClientRect(), x = (e.clientX - r.left) / k.scale; return clampI(Math.floor(x / (W / 4)), 0, 3); };
  const clampI = (v, a, b) => Math.max(a, Math.min(b, v));
  addEventListener('pointerdown', (e) => { audio(); if (k.st !== 'play' || k.paused || k.party) return; if (e.pointerType !== 'mouse') touchUI = true; const z = zone(e); touches.set(e.pointerId, z); tHit.add(z); });
  addEventListener('pointermove', (e) => { if (!touches.has(e.pointerId)) return; const z = zone(e), was = touches.get(e.pointerId); if (z !== was) { touches.set(e.pointerId, z); tHit.add(z); } });
  const tUp = (e) => touches.delete(e.pointerId); addEventListener('pointerup', tUp); addEventListener('pointercancel', tUp);
  const tHeld = (d) => { for (const z of touches.values()) if (z === d) return true; return false; };
  /* ---------- bucle ---------- */
  function update(dt) {
    for (const q of P) { q.jt -= dt; for (let d = 0; d < 4; d++) q.fl[d] = Math.max(0, q.fl[d] - dt * 5); q.rings.forEach((r) => (r.t += dt)); q.rings = q.rings.filter((r) => r.t < 0.3); }
    if (!k.gate(reset)) { tHit.clear(); return; }
    if (k.counting()) { tHit.clear(); return; }
    audio();
    if (over) { overT += dt; if (overT > 1.4) finish(); return; }
    t += dt; bpm = tempo(t); compose(t + (H - TOPY) / SPEED + 0.4);
    for (const n of notes) if (!n.pl) { n.pl = 1; for (const q of P) if (q.cpu) cpuPlan(q, n); }
    while (beats.length && beats[0].at < t - 0.5) beats.shift();
    for (const q of P) {
      let held;
      if (q.cpu) {
        while (q.plan.length && q.plan[0].at <= t) { const pl = q.plan.shift(); press(q, pl.d); q.hold[pl.d] = pl.rel; }
        held = (d) => q.hold[d] > t;
      } else {
        const solo = q.p === 0 && !k.party;
        for (let d = 0; d < 4; d++) if (k.phit(q.p, DIRS[d]) || (solo && tHit.has(d))) press(q, d);
        held = (d) => k.pheld(q.p, DIRS[d]) || (solo && tHeld(d));
      }
      for (let d = 0; d < 4; d++) if (held(d)) q.fl[d] = Math.max(q.fl[d], 0.5);
      // largas: mantener hasta el final
      for (const n of notes) if (n.end && n.hs[q.p] === 'on') {
        if (t >= n.end) { n.hs[q.p] = 'ok'; q.score += 50 * mult(q); say(q, '¡AGUANTA!', '#fff27a'); q.rings.push({ d: n.d, t: 0, big: true }); }
        else if (!held(n.d) && t < n.end - 0.1) { n.hs[q.p] = 'drop'; breakCombo(q, 'SOLTADA'); }
      }
    }
    tHit.clear();
    for (const n of notes) if (t - n.time > JW[2]) for (const q of P) if (!n.st[q.p]) { n.st[q.p] = 'miss'; q.cnt[3]++; breakCombo(q); }
    notes = notes.filter((n) => t - Math.max(n.time, n.end) < 0.6);
    if (t >= SONG + 1.6) { over = true; overT = 0; k.sfx('win'); k.confetti(); }
  }
  function finish() {
    over = false; const rows = P.map((q) => ({ p: q.p, score: q.score, name: nm(q) })), hu = P.filter((q) => !q.cpu), top = Math.max(...rows.map((r) => r.score));
    if (hu.length === 1) { const win = hu[0].score === top && rows.filter((r) => r.score === top).length === 1; lsSet('cpu:' + ID, Math.max(0, Math.min(10, LV + (win ? 0.5 : -0.5)))); }
    k.podium(rows, { fmt: (v) => v + ' pts' });
  }
  /* ---------- arte ---------- */
  function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; draw(g); return cv; }
  function arrowPath(g, r) { g.beginPath(); g.moveTo(0, -r); g.lineTo(r, 0); g.lineTo(r * 0.42, 0); g.lineTo(r * 0.42, r * 0.9); g.lineTo(-r * 0.42, r * 0.9); g.lineTo(-r * 0.42, 0); g.lineTo(-r, 0); g.closePath(); }
  const SZ = 48, AR = 17;
  const SPR = DIRS.map((_, d) => [0, 1].map((kind) => off(SZ, SZ, (g) => {
    g.translate(SZ / 2, SZ / 2); g.rotate(ROT[d]); g.translate(0, -2);
    if (kind === 0) { arrowPath(g, AR); const gr = g.createLinearGradient(-AR, -AR, AR, AR); gr.addColorStop(0, ART.lite(DCOL[d], 0.35)); gr.addColorStop(1, ART.dark(DCOL[d], 0.2)); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
      g.save(); arrowPath(g, AR * 0.55); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill(); g.restore(); }
    else { arrowPath(g, AR); g.fillStyle = 'rgba(20,12,44,.75)'; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(210,200,255,.55)'; g.stroke(); }
  })));
  let BG = null, bgN = 0;
  function buildBG() {
    bgN = P.length; const n = P.length, LW = W / n;
    BG = off(W, H, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a1260'); gr.addColorStop(1, '#0c0624'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // pista de baile en perspectiva (baldosas de colores)
      for (let r = 0; r < 7; r++) for (let i = -2; i < 14; i++) { const y0 = 220 + r * r * 3.2 + r * 8, y1 = 220 + (r + 1) * (r + 1) * 3.2 + (r + 1) * 8, sc0 = 0.5 + r * 0.1, sc1 = 0.5 + (r + 1) * 0.1, x = (i - 6) * 56;
        g.fillStyle = ['#ff6fb5', '#5b8cff', '#a8cf3f', '#ffc94d', '#6e62f5'][(i + r * 2 + 25) % 5]; g.globalAlpha = 0.14 + ((i + r) % 2) * 0.08;
        g.beginPath(); g.moveTo(W / 2 + x * sc0, y0); g.lineTo(W / 2 + (x + 56) * sc0, y0); g.lineTo(W / 2 + (x + 56) * sc1, y1); g.lineTo(W / 2 + x * sc1, y1); g.closePath(); g.fill(); }
      g.globalAlpha = 1;
      for (const [x, col] of [[80, 'rgba(255,111,181,.12)'], [320, 'rgba(255,201,77,.1)'], [560, 'rgba(91,140,255,.12)']]) { g.fillStyle = col; g.beginPath(); g.moveTo(x - 5, 0); g.lineTo(x + 5, 0); g.lineTo(x + 100, H); g.lineTo(x - 100, H); g.fill(); }
      for (let i = 0; i < 50; i++) { const r = Math.sin(i * 91.7) * 43758.5, f = r - Math.floor(r); g.fillStyle = `rgba(255,255,255,${0.15 + f * 0.4})`; g.fillRect((i * 131) % W, (f * 997) % 180, 1.6, 1.6); }
      for (let p = 0; p < n; p++) { const x0 = p * LW; ART.rr(g, x0 + 6, 44, LW - 12, H - 50, 14); g.fillStyle = 'rgba(12,8,32,.7)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); }
    });
  }
  function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
  function spr(d, kind, x, y, s) { const z = SZ * (s || 1); c.drawImage(SPR[d][kind], x - z / 2, y - z / 2, z, z); }
  function draw() {
    music();
    if (!BG || bgN !== P.length) buildBG();
    c.drawImage(BG, 0, 0, W, H);
    const bp = ((t > 0 ? t : 0) * bpm / 60) % 1, pulse = t > 0 && k.st === 'play' && !over ? Math.pow(1 - bp, 3) : 0;
    const tv = k.st === 'ready' ? (notes.length ? notes[0].time - 0.9 : 0) : t, Y = (tm) => TOPY + (tm - tv) * SPEED;
    const LW = W / P.length;
    for (const q of P) {
      const x0 = laneX(q), xm = x0 + LW / 2, sc = Math.min(1.25, (Math.min(58, (LW - 20) / 4)) / 44);
      c.save(); ART.rr(c, x0 + 6, 44, LW - 12, H - 50, 14); c.clip();
      c.globalAlpha = 0.1 * pulse; c.fillStyle = q.col; c.fillRect(x0, 44, LW, H); c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,.07)'; for (const b of beats) { const y = Y(b.at); if (y > TOPY && y < H) c.fillRect(x0 + 12, y - 1, LW - 24, 2); }
      for (let d = 0; d < 4; d++) { spr(d, 1, colX(q, d), TOPY, sc * (1 + q.fl[d] * 0.12)); if (q.fl[d] > 0) { c.globalAlpha = q.fl[d] * 0.7; spr(d, 0, colX(q, d), TOPY, sc * (1 + q.fl[d] * 0.12)); c.globalAlpha = 1; } }
      // largas: cola detrás de la cabeza
      for (const n of notes) { if (!n.end) continue; const hs = n.hs[q.p], y1 = Y(n.end), y0 = hs === 'on' ? TOPY : Y(n.time); if (y0 > H + 30 || y1 < TOPY - 20 || hs === 'ok') continue; const x = colX(q, n.d), w = 16 * sc;
        c.globalAlpha = hs === 'drop' || n.st[q.p] === 'miss' ? 0.3 : 0.85; ART.rr(c, x - w / 2, Math.max(TOPY, y0), w, Math.max(0, y1 - Math.max(TOPY, y0)), w / 2); ART.fillOut(c, ART.alpha(DCOL[n.d], 0.8), 2); c.globalAlpha = 1; }
      // enlaces de dobles
      for (let i = 0; i < notes.length; i++) { const n = notes[i]; if (!n.dbl || n.st[q.p] === 'hit') continue; const m = notes[i + 1]; if (m && m.dbl && m.time === n.time && m.st[q.p] !== 'hit') { const y = Y(n.time); if (y < H + 20) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(colX(q, n.d), y); c.lineTo(colX(q, m.d), y); c.stroke(); } } }
      for (const n of notes) { const st = n.st[q.p]; if (st === 'hit' && !(n.end && n.hs[q.p] === 'on')) continue; const y = st === 'hit' ? TOPY : Y(n.time); if (y > H + 30 || y < TOPY - 40) continue;
        c.globalAlpha = st === 'miss' ? 0.3 : 1; spr(n.d, 0, colX(q, n.d), y, sc); c.globalAlpha = 1; }
      for (const r of q.rings) { const p = r.t / 0.3; c.globalAlpha = 1 - p; c.lineWidth = r.big ? 4 : 3; c.strokeStyle = r.big ? '#fff27a' : DCOL[r.d]; c.beginPath(); c.arc(colX(q, r.d), TOPY, (16 + p * (r.big ? 26 : 16)) * sc, 0, R2); c.stroke(); c.globalAlpha = 1; }
      c.restore();
      if (q.combo >= 5) { c.globalAlpha = 0.75; label(String(q.combo), xm, 196, 30, mult(q) >= 4 ? '#fff27a' : '#fff', 'center'); label('COMBO', xm, 220, 12, '#b8b0ff', 'center'); c.globalAlpha = 1; }
      if (q.jt > 0) { const p = 1 - q.jt / 0.6, s = p < 0.15 ? 0.6 + p / 0.15 * 0.5 : 1.1 - Math.min(0.1, (p - 0.15) * 0.4); c.save(); c.translate(xm, 138 - p * 8); c.scale(s, s); c.globalAlpha = Math.min(1, q.jt / 0.2); label(q.judge, 0, 0, LW < 200 ? 16 : 20, q.jc, 'center'); c.restore(); c.globalAlpha = 1; }
      // placa del jugador (arriba)
      ART.rr(c, x0 + 6, 4, LW - 12, 34, 10); ART.fillOut(c, 'rgba(26,21,48,.92)', 2.5); c.fillStyle = q.col; ART.rr(c, x0 + 10, 8, 5, 26, 2.5); c.fill();
      label(nm(q).slice(0, LW < 200 ? 7 : 10), x0 + 20, 21, 14, q.col); label(String(q.score), x0 + LW - (LW < 200 ? 16 : 52), 21, 16, '#fff', 'right');
      if (LW >= 200) label(`x${mult(q)}`, x0 + LW - 14, 21, 14, mult(q) > 1 ? '#fff27a' : '#8a86b5', 'right');
    }
    // progreso de la canción
    const pr = Math.max(0, Math.min(1, t / SONG)); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, 40, W, 3); c.fillStyle = '#b98cff'; c.fillRect(0, 40, W * pr, 3);
    // botones táctiles de J1 en solitario
    if (touchUI && !k.party && k.st === 'play') for (let d = 0; d < 4; d++) { const x = W / 8 + d * W / 4, on = tHeld(d); c.globalAlpha = on ? 0.9 : 0.45; ART.rr(c, x - W / 8 + 6, H - 44, W / 4 - 12, 38, 12); ART.fillOut(c, on ? ART.alpha(DCOL[d], 0.6) : 'rgba(26,21,48,.7)', 2); spr(d, 0, x, H - 25, 0.7); c.globalAlpha = 1; }
  }
  window.__da = { get P() { return P; }, get notes() { return notes; }, get t() { return t; } };
  reset();
  k.show(CFG.title || 'Flechas de Baile', 'Pulsa ← ↓ ↑ → cuando cada flecha que sube llegue a su hueco. Las dobles piden dos direcciones a la vez (usa la diagonal) y las largas hay que mantenerlas. PERFECTO, GENIAL o BIEN; el combo multiplica hasta ×4. En el móvil, la pantalla se divide en cuatro columnas: toca la de cada flecha.<br>Toca para jugar');
  k.run(update, draw);
}

/* ================= Piano de Colores (CFG.mode 'piano') =====================================================
 * Ocho teclas de colores (do re mi fa sol la si do) y melodías tradicionales o clásicas de dominio público.
 * Las notas caen sobre su tecla: toca (o pulsa A S D F G H J K) justo cuando llegan. PERFECTO / GENIAL / BIEN / FALLO,
 * multiplicador por combo hasta ×4, precisión y barra de energía. Multitoque: se pueden pulsar varias teclas a la vez.
 * Cinco melodías encadenadas, cada una un poco más rápida; al terminar la última se gana la partida. */
function pianoGame() {
  const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#120c2a' }), c = k.ctx;
  const LN = 8, LW = 360 / LN, HITY = 452, SPEED = 300, TAU = R2;
  const COLS = ['#ff5f7a', '#ff9e4d', '#ffd84d', '#a8cf3f', '#5ce1e6', '#5b8cff', '#a097ff', '#ff6fb5'];
  const NOM = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do'];
  const FRQ = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
  const BLACK = [0, 1, 3, 4, 5]; /* huecos con tecla negra detrás: do-re, re-mi, fa-sol, sol-la, la-si */
  const JU = [[0.055, 'PERFECTO', 100, 1, '#fff27a'], [0.1, 'GENIAL', 70, 0.8, '#7cf7a0'], [0.19, 'BIEN', 40, 0.5, '#5ce1e6']];
  /* melodías de dominio público, en una octava (0 = do). [grado, duración en tiempos]; -1 = silencio. */
  const SONGS = [
    { n: 'Martinillo', a: 'tradicional', bpm: 104, m: [[0,1],[1,1],[2,1],[0,1],[0,1],[1,1],[2,1],[0,1],[2,1],[3,1],[4,2],[2,1],[3,1],[4,2],[4,.5],[5,.5],[4,.5],[3,.5],[2,1],[0,1],[4,.5],[5,.5],[4,.5],[3,.5],[2,1],[0,1],[0,1],[4,1],[0,2],[-1,1]] },
    { n: 'Estrellita', a: 'tradicional', bpm: 108, m: [[0,1],[0,1],[4,1],[4,1],[5,1],[5,1],[4,2],[3,1],[3,1],[2,1],[2,1],[1,1],[1,1],[0,2],[4,1],[4,1],[3,1],[3,1],[2,1],[2,1],[1,2],[4,1],[4,1],[3,1],[3,1],[2,1],[2,1],[1,2],[0,1],[0,1],[4,1],[4,1],[5,1],[5,1],[4,2],[3,1],[3,1],[2,1],[2,1],[1,1],[1,1],[0,2],[-1,1]] },
    { n: 'Los pollitos', a: 'tradicional', bpm: 112, m: [[4,1],[4,1],[4,1],[4,1],[5,1],[4,1],[2,2],[4,1],[4,1],[4,1],[4,1],[5,1],[4,1],[2,2],[2,1],[2,1],[3,1],[4,1],[5,1],[4,1],[3,1],[2,2],[4,1],[4,1],[3,1],[2,1],[1,1],[0,2],[-1,1]] },
    { n: 'Himno de la alegría', a: 'Beethoven', bpm: 116, m: [[2,1],[2,1],[3,1],[4,1],[4,1],[3,1],[2,1],[1,1],[0,1],[0,1],[1,1],[2,1],[2,1.5],[1,.5],[1,2],[2,1],[2,1],[3,1],[4,1],[4,1],[3,1],[2,1],[1,1],[0,1],[0,1],[1,1],[2,1],[1,1.5],[0,.5],[0,2],[-1,1]] },
    { n: 'Canon', a: 'Pachelbel', bpm: 120, m: [[0,1],[7,1],[6,1],[5,1],[4,1],[3,1],[4,1],[5,1],[0,1],[7,1],[6,1],[5,1],[4,1],[3,1],[4,1],[2,1],[3,.5],[4,.5],[5,.5],[4,.5],[3,.5],[2,.5],[1,.5],[2,.5],[3,.5],[2,.5],[1,.5],[0,.5],[1,.5],[2,.5],[3,.5],[4,.5],[0,2],[-1,1]] },
  ];
  let ac, notes, t, si, score, combo, maxCombo, hp, flash, judge, judgeT, judgeC, rings, accSum, accN, songEnd, inter, done, hits;
  function audio() { if (k.muted()) return; if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} if (ac && ac.state === 'suspended') ac.resume(); }
  function tone(f, dur, type, vol) {
    if (!ac || k.muted()) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function loadSong(i) {
    const s = SONGS[i], bpm = s.bpm * (1 + 0.05 * i), beat = 60 / bpm;
    notes = []; let at = 3.4; /* 3,4 s de cortesía antes de la primera nota */
    for (const [d, dur] of s.m) { if (d >= 0) notes.push({ lane: d, time: at, dur: dur * beat }); at += dur * beat; }
    songEnd = at + 0.9; t = 0; hits = 0;
  }
  function reset() { si = 0; score = 0; combo = 0; maxCombo = 0; hp = 100; flash = new Array(LN).fill(0); judge = ''; judgeT = 0; judgeC = '#fff'; rings = []; accSum = 0; accN = 0; inter = 0; done = 0; loadSong(0); }
  reset();
  const acc = () => (accN ? Math.round(accSum / accN * 100) : 100);
  const mult = () => Math.min(4, 1 + Math.floor(combo / 8));
  const setJudge = (s, col) => { judge = s; judgeC = col; judgeT = 0.55; };
  /* entrada propia: multitoque y varias teclas a la vez */
  const KEYMAP = { KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3, KeyG: 4, KeyH: 5, KeyJ: 6, KeyK: 7, Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6, Digit8: 7 };
  const pressed = [];
  addEventListener('keydown', (e) => { if (e.repeat) return; const l = KEYMAP[e.code]; if (l !== undefined && k.st === 'play' && !k.paused) pressed.push(l); });
  addEventListener('message', (e) => { const d = e.data; if (d && d.type === 'arcade:key' && d.event === 'keydown') { const l = KEYMAP[d.code]; if (l !== undefined && k.st === 'play' && !k.paused) pressed.push(l); } });
  addEventListener('pointerdown', (e) => {
    audio(); if (k.st !== 'play' || k.paused) return;
    const r = k.cv.getBoundingClientRect(), x = (e.clientX - r.left) / k.scale, y = (e.clientY - r.top) / k.scale;
    if (y > 150 && x >= 0 && x < 360) pressed.push(Math.min(LN - 1, Math.max(0, Math.floor(x / LW))));
  });
  function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; draw(g); return cv; }
  function label(s, x, y, size, col, align, base) {
    c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
    c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
  }
  const BG = off(360, 640, (g) => {
    let gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, '#2b1a5e'); gr.addColorStop(0.5, '#170f36'); gr.addColorStop(1, '#0a0720'); g.fillStyle = gr; g.fillRect(0, 0, 360, 640);
    for (let i = 0; i < 60; i++) { const r = Math.sin(i * 77.3) * 43758.5, f = r - Math.floor(r); g.fillStyle = `rgba(255,255,255,${0.12 + f * 0.35})`; g.fillRect((i * 113) % 360, (f * 881) % 440, 1.6, 1.6); }
    for (let i = 0; i < LN; i++) {
      const x = i * LW; gr = g.createLinearGradient(0, 60, 0, HITY); gr.addColorStop(0, 'rgba(18,12,42,0)'); gr.addColorStop(0.3, 'rgba(18,12,42,.7)'); gr.addColorStop(1, 'rgba(14,10,34,.92)');
      g.fillStyle = gr; g.fillRect(x + 1.5, 60, LW - 3, HITY - 60);
      g.fillStyle = COLS[i]; g.globalAlpha = 0.3; g.fillRect(x + 1.5, 60, 1.5, HITY - 60); g.globalAlpha = 1;
    }
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, HITY - 18, 360, 36);
    /* teclado: blancas y, detrás, las negras (solo decorativas) */
    for (let i = 0; i < LN; i++) { const x = i * LW; ART.rr(g, x + 2, HITY + 6, LW - 4, 168, 8); ART.fillOut(g, '#f4f1ea', 2.6); ART.rr(g, x + 2, HITY + 6, LW - 4, 16, 8); g.fillStyle = ART.alpha(COLS[i], 0.85); g.fill(); }
    for (const b of BLACK) { const x = (b + 1) * LW; ART.rr(g, x - 11, HITY + 6, 22, 86, 5); ART.fillOut(g, '#241d44', 2.4); }
  });
  const NOTE = COLS.map((col) => off(LW, 40, (g) => {
    ART.rr(g, 5, 7, LW - 10, 24, 11); const lg = g.createLinearGradient(0, 7, 0, 31); lg.addColorStop(0, '#fff'); lg.addColorStop(0.2, col); lg.addColorStop(1, ART.dark(col, 0.2));
    g.fillStyle = lg; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.7)'; ART.rr(g, 10, 11, LW - 26, 4, 2); g.fill();
  }));
  const GREY = off(LW, 40, (g) => { ART.rr(g, 5, 7, LW - 10, 24, 11); ART.fillOut(g, '#4e4869', 2.4); });
  function hitLane(lane) {
    flash[lane] = 1; audio();
    let n = null, bd = 9;
    for (const q of notes) if (q.lane === lane && !q.hit && !q.miss && Math.abs(q.time - t) < bd) { bd = Math.abs(q.time - t); n = q; }
    if (n && bd < 0.19) {
      n.hit = true; hits++;
      const j = JU.find((q) => bd < q[0]) || JU[2];
      combo++; maxCombo = Math.max(maxCombo, combo);
      score += j[2] * mult(); accSum += j[3]; accN++; hp = Math.min(100, hp + (j[3] === 1 ? 3 : 2));
      setJudge(j[1], j[4]); tone(FRQ[lane], 0.55, 'triangle', 0.18); tone(FRQ[lane] * 2, 0.3, 'sine', 0.05);
      rings.push({ lane, t: 0, big: j[3] === 1 });
      k.burst(lane * LW + LW / 2, HITY, j[3] === 1 ? '#fff27a' : COLS[lane], j[3] === 1 ? 14 : 8, 160);
      if (combo && combo % 25 === 0) { k.float(`¡${combo} seguidas!`, 180, 260, '#fff27a'); k.sfx('coin'); }
    } else {
      tone(FRQ[lane] * 0.5, 0.18, 'sawtooth', 0.05);
      if (t > 3) { hp -= 2; if (combo >= 8) k.sfx('hurt'); combo = 0; setJudge('FALLO', '#ff5f7a'); }
    }
  }
  function update(dt) {
    judgeT -= dt; for (let i = 0; i < LN; i++) flash[i] = Math.max(0, flash[i] - dt * 4);
    rings.forEach((r) => (r.t += dt)); rings = rings.filter((r) => r.t < 0.4);
    if (!k.gate(reset)) { pressed.length = 0; return; }
    if (done) { pressed.length = 0; return; }
    if (inter > 0) { inter -= dt; pressed.length = 0; if (inter <= 0) loadSong(si); return; }
    t += dt;
    for (const lane of pressed.splice(0)) hitLane(lane);
    for (const n of notes) if (!n.hit && !n.miss && t - n.time > 0.19) { n.miss = true; hp -= 6; combo = 0; accN++; setJudge('FALLO', '#ff5f7a'); }
    if (hp <= 0) { hp = 0; done = 1; return k.lose(CFG.id, score, 'Se te fue la melodía', `${SONGS[si].n} · Precisión ${acc()} % · Combo máx. ${maxCombo}`); }
    if (t > songEnd) {
      const bonus = 200 + Math.round(hits * 8);
      score += bonus; k.float('+' + bonus, 180, 300, '#fff27a'); k.sfx('win'); k.confetti(COLS[si % LN], 60);
      si++;
      if (si >= SONGS.length) { done = 1; k.st = 'over'; k.confetti(); return k.end(CFG.id, score, '¡Concierto completo!', `${SONGS.length} melodías · Precisión ${acc()} % · Combo máx. ${maxCombo}`); }
      inter = 2.4;
    }
  }
  function draw() {
    c.drawImage(BG, 0, 0, 360, 640);
    for (let i = 0; i < LN; i++) if (flash[i] > 0) {
      c.globalAlpha = flash[i] * 0.45; c.fillStyle = COLS[i]; c.fillRect(i * LW + 2, 72, LW - 4, HITY - 72);
      c.globalAlpha = flash[i] * 0.85; ART.rr(c, i * LW + 2, HITY + 6, LW - 4, 168, 8); c.fillStyle = COLS[i]; c.fill(); c.globalAlpha = 1;
    }
    c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(0, HITY - 2, 360, 4);
    if (inter <= 0 && !done) {   // recortado bajo la cabecera: las notas salen de debajo del marcador, nunca encima
      c.save(); c.beginPath(); c.rect(0, 72, 360, HITY + 200 - 72); c.clip();
      for (const n of notes) {
        if (n.hit) continue;
        const y = HITY - (n.time - t) * SPEED; if (y < 46) continue;
        if (n.miss) { c.globalAlpha = Math.max(0, 1 - (t - n.time) * 2); c.drawImage(GREY, n.lane * LW, y - 20, LW, 40); c.globalAlpha = 1; }
        else c.drawImage(NOTE[n.lane], n.lane * LW, y - 20, LW, 40);
      }
      c.restore();
    }
    for (const r of rings) { const p = r.t / 0.4; c.globalAlpha = 1 - p; c.lineWidth = r.big ? 5 : 3; c.strokeStyle = r.big ? '#fff27a' : COLS[r.lane]; c.beginPath(); c.arc(r.lane * LW + LW / 2, HITY, 14 + p * (r.big ? 34 : 22), 0, TAU); c.stroke(); c.globalAlpha = 1; }
    for (let i = 0; i < LN; i++) label(NOM[i], i * LW + LW / 2, HITY + 150, 12, flash[i] ? '#1a1530' : '#6a6490', 'center', 'middle');
    if (combo >= 4) { c.globalAlpha = 0.8; label(String(combo), 180, 210, 50, mult() >= 4 ? '#fff27a' : '#fff', 'center', 'middle'); label('seguidas', 180, 248, 13, '#b8b0ff', 'center', 'middle'); c.globalAlpha = 1; }
    if (judgeT > 0) { const p = 1 - judgeT / 0.55, s = p < 0.15 ? 0.6 + p / 0.15 * 0.55 : 1.15 - Math.min(0.15, (p - 0.15) * 0.5); c.save(); c.translate(180, 320 - p * 10); c.scale(s, s); c.globalAlpha = Math.min(1, judgeT / 0.2); label(judge, 0, 0, 30, judgeC, 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
    const s = SONGS[si] || SONGS[SONGS.length - 1];
    label(score, 10, 8, 24, '#fff'); label(`x${mult()}`, 12, 36, 14, mult() > 1 ? '#fff27a' : '#8a86b5');
    label(`${acc()} %`, 350, 8, 18, '#5ce1e6', 'right'); label(`${si + (inter > 0 ? 1 : 0) > SONGS.length - 1 ? SONGS.length : si + 1}/${SONGS.length}`, 350, 30, 12, '#b8b0ff', 'right');
    label(s.n + ' · ' + s.a, 10, 56, 12, '#d8d4f5');
    const bw = 110, bx = 350 - bw; ART.rr(c, bx, 48, bw, 11, 5.5); ART.fillOut(c, '#1b1438', 2.4);
    const hw = Math.max(0, hp) / 100 * (bw - 4); if (hw > 1) { ART.rr(c, bx + 2, 50, hw, 7, 3.5); c.fillStyle = hp > 60 ? '#7cf7a0' : hp > 30 ? '#f2d15c' : '#ff5f7a'; c.fill(); }
    if (inter > 0) { c.fillStyle = 'rgba(10,7,26,.72)'; c.fillRect(0, 230, 360, 130); label('¡Melodía completa!', 180, 262, 22, '#fff27a', 'center'); label('Ahora: ' + (SONGS[si] ? SONGS[si].n : ''), 180, 300, 17, '#fff', 'center'); label(SONGS[si] ? SONGS[si].a : '', 180, 326, 13, '#b8b0ff', 'center'); }
    else if (t < 3.2 && k.st === 'play' && !done) { const n = Math.ceil(3.4 - t); label(n > 0 ? String(n) : '¡Ya!', 180, 300, 40, '#fff', 'center', 'middle'); }
    else if (k.st !== 'play') { /* antes de empezar: notas de muestra para que se vea de qué va */
      const DEMO = [[0, 150], [2, 230], [4, 200], [5, 300], [7, 260], [3, 380]];
      c.globalAlpha = 0.85; for (const [ln, y] of DEMO) c.drawImage(NOTE[ln], ln * LW, y - 20, LW, 40); c.globalAlpha = 1;
      label('Toca la melodía', 180, 430, 20, '#d8d4f5', 'center', 'middle');
    }
    if (!k.party) { const pr = Math.max(0, Math.min(1, t / songEnd)); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 72, 360, 3); c.fillStyle = COLS[si % LN]; c.fillRect(0, 72, 360 * pr, 3); }
  }
  window.__pi = { get notes() { return notes; }, get t() { return t; }, get score() { return score; }, get si() { return si; }, get hp() { return hp; },
    get flash() { return flash; }, get combo() { return combo; }, get acc() { return accN ? Math.round((accSum / accN) * 100) : 100; } };
  k.show(CFG.title || 'Piano de Colores', 'Ocho teclas de colores y melodías de siempre. Toca la tecla justo cuando su nota llega abajo; puedes usar varios dedos a la vez. Con teclado, A S D F G H J K (o del 1 al 8). Cinco melodías encadenadas, cada una un poco más rápida.<br>Toca para empezar');
  k.run(update, draw);
}
