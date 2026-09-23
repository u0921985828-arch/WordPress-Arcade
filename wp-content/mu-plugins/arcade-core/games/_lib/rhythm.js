/* Rhythm Tap: toca los carriles cuando las notas llegan a la línea. Música generada con WebAudio. */
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#0d0a1f' }), c = k.ctx;
const LANES = 4, LW = 90, HITY = 540, SPEED = 420, COLS = ['#ff5f7a', '#f2d15c', '#5ce1e6', '#7cf7a0'], SCALE = [0, 3, 5, 7, 10, 12];
let ac, notes, t, bpm, score, combo, hp, nextBeat, beatN, flash, judge, judgeT, root;
function audio() { if (k.muted()) return; if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freq, dur, type, vol, when) { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, when || ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, (when || ac.currentTime) + dur); o.connect(g).connect(ac.destination); o.start(when); o.stop((when || ac.currentTime) + dur + 0.02); }
function kick(when) { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, when); o.frequency.exponentialRampToValueAtTime(40, when + 0.15); g.gain.setValueAtTime(0.5, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.2); o.connect(g).connect(ac.destination); o.start(when); o.stop(when + 0.22); }
function reset() { notes = []; t = 0; bpm = 100; score = 0; combo = 0; hp = 100; nextBeat = 1.5; beatN = 0; flash = [0, 0, 0, 0]; judge = ''; judgeT = 0; root = 220; }
reset(); k.show(CFG.title, 'Toca cada carril cuando la nota cruce la línea. Teclado: D F J K o flechas. No dejes que se vacíe la barra.');
const KEYMAP = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
const pressed = [];
addEventListener('keydown', (e) => { if (KEYMAP[e.code] !== undefined && !e.repeat) pressed.push(KEYMAP[e.code]); });
addEventListener('pointerdown', () => audio());
k.run((dt) => {
  judgeT -= dt; flash = flash.map((f) => Math.max(0, f - dt * 4));
  if (!k.gate(reset)) { pressed.length = 0; return; }
  audio(); t += dt; bpm = Math.min(170, 100 + t * 0.8); const beat = 60 / bpm, travel = HITY / SPEED;
  while (nextBeat < t + travel) { const at = nextBeat; beatN++; if (ac) kick(ac.currentTime + (at - t)); const r = Math.random(), dens = Math.min(0.9, 0.45 + t / 200);
    if (r < dens) notes.push({ lane: k.ri(0, 3), time: at, pitch: k.pick(SCALE) }); if (t > 20 && Math.random() < dens * 0.4) notes.push({ lane: k.ri(0, 3), time: at + beat / 2, pitch: k.pick(SCALE) }); if (t > 40 && Math.random() < 0.15) { const l = k.ri(0, 2); notes.push({ lane: l, time: at, pitch: 0 }, { lane: l + 1, time: at, pitch: 7 }); }
    nextBeat += beat; }
  const taps = [...pressed]; pressed.length = 0; if (k.ptr.hit && k.ptr.y > 200) taps.push(Math.floor(k.ptr.x / LW));
  for (const lane of taps) { if (lane < 0 || lane > 3) continue; flash[lane] = 1; const n = notes.filter((q) => q.lane === lane && !q.hit).sort((a, b) => Math.abs(a.time - t) - Math.abs(b.time - t))[0];
    if (n && Math.abs(n.time - t) < 0.16) { n.hit = true; const perfect = Math.abs(n.time - t) < 0.06; combo++; score += (perfect ? 100 : 50) * (1 + Math.floor(combo / 10)); hp = Math.min(100, hp + 3); judge = perfect ? 'PERFECTO' : 'BIEN'; judgeT = 0.5; tone(root * Math.pow(2, n.pitch / 12) * 2, 0.25, 'triangle', 0.15); }
    else { combo = 0; hp -= 4; judge = 'FALLO'; judgeT = 0.4; } }
  for (const n of notes) if (!n.hit && !n.miss && t - n.time > 0.16) { n.miss = true; combo = 0; hp -= 9; judge = 'FALLO'; judgeT = 0.4; }
  notes = notes.filter((n) => t - n.time < 0.5);
  if (hp <= 0) return k.lose(CFG.id, score, 'Te perdiste el ritmo', `${Math.floor(t)} s`);
}, () => {
  k.clear(); for (let i = 0; i < LANES; i++) { k.rect(i * LW, 0, LW - 2, 640, flash[i] ? `rgba(255,255,255,${0.05 + flash[i] * 0.1})` : '#140f2b'); }
  const pulse = ((t * bpm / 60) % 1); c.fillStyle = `rgba(185,140,255,${0.25 * (1 - pulse)})`; c.fillRect(0, HITY - 4, 360, 8);
  k.rect(0, HITY - 2, 360, 4, '#fff');
  for (const n of notes) { if (n.hit) continue; const y = HITY - (n.time - t) * SPEED; k.rrect(n.lane * LW + 8, y - 12, LW - 18, 24, 12, n.miss ? '#444' : COLS[n.lane]); }
  for (let i = 0; i < LANES; i++) { k.circle(i * LW + LW / 2, HITY + 50, 26, flash[i] ? COLS[i] : '#241d45'); k.text('DFJK'[i], i * LW + LW / 2, HITY + 42, 14, flash[i] ? '#0d0a1f' : '#8a86b5', 'center'); }
  k.text(score, 12, 12, 24); k.text(combo > 1 ? `${combo} combo` : '', 348, 16, 16, '#f2d15c', 'right'); k.rect(12, 46, 336 * Math.max(0, hp) / 100, 6, hp > 30 ? '#7cf7a0' : '#ff5f7a');
  if (judgeT > 0) k.text(judge, 180, 300, 30, judge === 'FALLO' ? '#ff5f7a' : '#fff', 'center');
});
