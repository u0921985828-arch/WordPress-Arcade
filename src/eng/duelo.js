/* duelo.js — Lucha 1v1 lateral para 1–2 jugadores (la CPU ocupa la plaza libre). Lienzo 800×450.
 * CFG.mode:
 *  'paper' Puños de Papel: piedra, papel o tijera en tiempo real. A golpe alto, ↓+A golpe bajo, B agarre.
 *          Si los dos atacan a la vez: el bajo gana al alto, el agarre al bajo y el alto al agarre (contra ×1,5).
 *          ← guardia alta (para el alto), ← + ↓ guardia baja (para el bajo); el agarre rompe cualquier guardia. Al mejor de 3 rondas.
 *  'dojo'  Dojo Nocturno: kárate a un golpe (ippon). A puño (medio), B patada alta, ↓+B barrido. ← guardia alta (medio y alto),
 *          ← + ↓ guardia baja (medio y bajo), ↓ se agacha bajo la patada. Guardia justo a tiempo = parada. Gana quien llega a 5.
 *  'fence' Esgrima de Bolsillo: florete. ← → pasos, A estocada alta, ↓+A estocada baja, B parada en la línea (↓ = baja).
 *          Tras parar, la respuesta es rapidísima. Si los dos tocan: punto para quien atacó antes (prioridad); a la vez, nada.
 *          Salir por tu línea de fondo da el tocado al rival. 5 tocados.
 *  'box'   Guantes Gigantes: A directo, B cruzado, ↑+B gancho, ↓+A al cuerpo. ← guardia, ↓ esquiva agachado. Resistencia:
 *          golpear cansa y fallar cansa más; sin resistencia pegas flojo. 3 derribos = KO; si no, decisión a los puntos (3 asaltos).
 *  'sumo'  Sumo de Equilibrio: → empuja e inclina hacia delante, ← hacia atrás; A empujón, B esquiva lateral (henka), ↓ bajar el centro.
 *          Pierde quien sale del dohyo o se inclina demasiado y cae. Gana quien se lleva 3 combates.
 * CPU con reacción según nivel (0..9 en localStorage 'cpu:<id>', sube si ganas y baja si pierdes), que bloquea, castiga los fallos
 * y aprende tu golpe favorito. Los primeros 5 s de partida la CPU no ataca. */
const W = 800, H = 450, OUT = ART.OUT, TAU = 6.2832, FLOOR = 388;
const MODE = ['paper', 'dojo', 'fence', 'box', 'sumo'].includes(CFG.mode) ? CFG.mode : 'dojo';
const ID = CFG.id || 'duelo';
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1d1840' }), c = k.ctx;
const lerp = (a, b, q) => a + (b - a) * q, ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)), clamp = k.clamp;
const FONT = (s, wt) => `${wt || 800} ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
function label(s, x, y, size, col, align, lw) {
  c.font = FONT(size); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = lw || size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function panel(x, y, w, h, r, fill, lw) { ART.rr(c, x, y, w, h, r); ART.fillOut(c, fill, lw || 3); }
const mkc = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };

/* ---------------- Reglas por modo ---------------- */
// su arranque, ac activo, rc recuperación (s); reach = alcance de centro a centro (px); h = altura del golpe
const MV = {
  paper: {
    hi:   { su: 0.26, ac: 0.1, rc: 0.26, reach: 122, h: 'hi', dmg: 12, push: 170, stun: 0.34 },
    lo:   { su: 0.26, ac: 0.1, rc: 0.28, reach: 126, h: 'lo', dmg: 12, push: 170, stun: 0.34 },
    grab: { su: 0.26, ac: 0.12, rc: 0.36, reach: 100, h: 'grab', dmg: 15, push: 300, stun: 0.55 },
  },
  dojo: {
    punch: { su: 0.13, ac: 0.08, rc: 0.3, reach: 116, h: 'mid' },
    kick:  { su: 0.24, ac: 0.1, rc: 0.38, reach: 150, h: 'hi' },
    sweep: { su: 0.22, ac: 0.1, rc: 0.42, reach: 144, h: 'lo' },
  },
  fence: {
    lhi: { su: 0.17, ac: 0.12, rc: 0.44, reach: 184, h: 'hi', lunge: 44 },
    llo: { su: 0.17, ac: 0.12, rc: 0.44, reach: 178, h: 'lo', lunge: 44 },
  },
  box: {
    jab:   { su: 0.1, ac: 0.08, rc: 0.22, reach: 124, h: 'hi', dmg: 5, push: 90, stun: 0.22, cost: 7 },
    cross: { su: 0.2, ac: 0.09, rc: 0.34, reach: 134, h: 'hi', dmg: 10, push: 160, stun: 0.34, cost: 15 },
    upper: { su: 0.25, ac: 0.1, rc: 0.42, reach: 104, h: 'up', dmg: 14, push: 190, stun: 0.48, cost: 20 },
    body:  { su: 0.16, ac: 0.08, rc: 0.3, reach: 116, h: 'lo', dmg: 7, push: 110, stun: 0.3, cost: 10 },
  },
  sumo: {},
}[MODE];
const CONF = {
  paper: { S: 1.25, gap: 190, walk: 150, min: 66, hp: 100, time: 60, need: 2, xl: 50, xr: 750 },
  dojo:  { S: 1.3, gap: 210, walk: 175, min: 72, pts: 5, time: 90, xl: 50, xr: 750 },
  fence: { S: 1.2, gap: 260, walk: 205, min: 76, pts: 5, time: 120, xl: 40, xr: 760, rear: [72, 728] },
  box:   { S: 1.3, gap: 200, walk: 170, min: 80, hp: 100, time: 60, rounds: 3, xl: 78, xr: 722 },
  sumo:  { S: 1.32, gap: 104, walk: 120, min: 96, need: 3, time: 40, xl: 60, xr: 740, ring: [150, 650] },
}[MODE];
const S = CONF.S;
const BEATS = { lo: 'hi', grab: 'lo', hi: 'grab' }, COUNTER = { hi: 'lo', lo: 'grab', grab: 'hi' };
const PCOL = { hi: '#ff6fb5', lo: '#5b8cff', grab: '#a8cf3f' };

/* ---------------- Jugadores y CPU ---------------- */
let LV = 0; try { LV = clamp(+localStorage.getItem('cpu:' + ID) || 0, 0, 9); } catch (e) { /* sin almacenamiento */ }
const SK = () => (0.175 + LV * 0.075) * (demo ? 0.85 : 1);
let demo = true, t = 0, live = false;
const cpu = (p) => demo || !k.human(p);
const col = (p) => k.pcol(p);
const nm = (p) => (cpu(p) ? 'CPU' : k.players(2)[p].name);
const tag = (p) => (cpu(p) ? 'CPU' : k.party ? 'J' + (p + 1) : 'Tú');
k.onParty = () => { /* la plaza de quien se va la ocupa la CPU sin cortar el combate */ };

function mkF(p) {
  return { p, x: 400 + (p ? 1 : -1) * CONF.gap / 2, vx: 0, iv: 0, face: p ? -1 : 1, hp: CONF.hp || 0, shown: CONF.hp || 0, pts: 0, wins: 0, stam: 100,
    mv: null, stun: 0, bstun: 0, guard: '', gT: 9, crouch: false, par: 0, parLine: 'hi', parRc: 0, rip: 0, kd: 0, dealt: 0, down: 0,
    lean: 0, low: false, fx: 0, hk: 0, hkcd: 0, cd: 0, fall: 0, fallDir: 0, walkPh: 0, hurtT: 0, pz: null, anim: Math.random() * 5,
    ai: { o: { fx: 0, dn: false, up: false, a: false, b: false }, seen: null, rt: 0, ok: false, def: null, defT: 0, cd: 1, plan: 'space', planT: 0, pun: null, hist: {}, histN: 0, think: 0, want: 0 } };
}
let F = [mkF(0), mkF(1)];
let phase = 'intro', phT = 1, round = 1, rtime = CONF.time, mclock = 0, banner = null, slow = 0, lamp = null, countN = 0, endT = -1, winner = -1, lastWhy = '';

/* ---------------- Entrada ---------------- */
function input(f) {
  if (cpu(f.p)) return f.ai.o;
  const d = k.pdir(f.p);
  return { fx: d.x * f.face, dn: d.y > 0.5, up: d.y < -0.5, a: k.phit(f.p, 'a'), b: k.phit(f.p, 'b') };
}
function chooseMove(inp) {
  if (MODE === 'paper') return inp.b ? 'grab' : inp.a ? (inp.dn ? 'lo' : 'hi') : null;
  if (MODE === 'dojo') return inp.a ? 'punch' : inp.b ? (inp.dn ? 'sweep' : 'kick') : null;
  if (MODE === 'fence') return inp.a ? (inp.dn ? 'llo' : 'lhi') : null;
  if (MODE === 'box') { if (inp.a) return inp.dn ? 'body' : inp.up ? 'upper' : 'jab'; if (inp.b) return inp.up ? 'upper' : inp.dn ? 'body' : 'cross'; }
  return null;
}
function startMove(f, key) {
  const d = MV[key]; let su = d.su;
  if (MODE === 'fence' && f.rip > 0) { su = 0.07; f.rip = 0; }
  let weak = false;
  if (MODE === 'box') { if (f.stam < d.cost) { weak = true; su *= 1.6; } f.stam = Math.max(0, f.stam - d.cost); }
  f.mv = { k: key, d, su, t: 0, t0: mclock, done: false, weak, x0: f.x };
  f.guard = ''; k.sfx(MODE === 'fence' ? 'click' : 'jump');
  const g = F[1 - f.p];
  if (!cpu(f.p) && cpu(g.p)) { const h = g.ai.hist; for (const q in h) h[q] *= 0.8; h[key] = (h[key] || 0) + 1; g.ai.histN = Object.values(h).reduce((a, b) => a + b, 0); }
}
const mph = (f) => { const m = f.mv; if (!m) return ''; return m.t < m.su ? 'su' : m.t < m.su + m.d.ac ? 'ac' : 'rc'; };

/* ---------------- Resolución de golpes ---------------- */
function inRange(a, b) { return Math.abs(a.x - b.x) <= a.mv.d.reach; }
const armed = (a, b) => a.mv && !a.mv.done && mph(a) === 'ac' && inRange(a, b) && b.down <= 0;
function defense(def, h) {
  // → 'hit' | 'block' | 'dodge' | 'parry'
  if (MODE === 'fence') { if (def.par > 0 && def.parLine === h) return 'parry'; return 'hit'; }
  const busy = def.mv || def.stun > 0;
  if (MODE === 'paper') {
    if (busy || h === 'grab') return 'hit';
    if (def.guard === 'hi' && h === 'hi' || def.guard === 'lo' && h === 'lo') return 'block';
    if (def.crouch && h === 'hi') return 'dodge';
    return 'hit';
  }
  if (MODE === 'dojo') {
    if (busy) return h === 'hi' && def.crouch ? 'dodge' : 'hit';
    if (def.guard === 'hi' && (h === 'mid' || h === 'hi') || def.guard === 'lo' && (h === 'mid' || h === 'lo')) return def.gT < 0.12 ? 'parry' : 'block';
    if (def.crouch && h === 'hi') return 'dodge';
    return 'hit';
  }
  if (MODE === 'box') {
    if (def.guard && !busy && (h === 'hi' || h === 'up')) return 'block';
    if (def.crouch && !def.mv && h === 'hi') return 'dodge';
    return 'hit';
  }
  return 'hit';
}
function spark(x, y, cl, big) { k.burst(x, y, cl || '#fff', big ? 16 : 9, big ? 260 : 170); k.shake(big ? 9 : 4); }
function hitPoint(a, b) { const h = a.mv.d.h; return { x: (a.x + b.x) / 2 + a.face * 14, y: FLOOR - S * (h === 'lo' ? 30 : h === 'hi' || h === 'up' ? 108 : 80) }; }
function strike(a, b, counter) {
  const m = a.mv, d = m.d; m.done = true;
  const out = counter ? 'hit' : defense(b, d.h), hp = hitPoint(a, b);
  if (out === 'dodge') { k.float('¡Esquiva!', b.x, FLOOR - 190, '#9fe8ff'); m.extra = 0.12; return; }
  if (out === 'block') {
    k.sfx('pop'); spark(hp.x, hp.y, '#cfd6ff'); a.iv = -a.face * 120; b.iv = -b.face * 90; b.bstun = 0.2; b.guardFlash = 0.2;
    if (MODE === 'box') { b.stam = Math.max(0, b.stam - 6); b.hp = Math.max(1, b.hp - 1); }
    if (MODE === 'paper') m.extra = 0.12;
    return;
  }
  if (out === 'parry') {
    k.sfx('coin'); spark(hp.x, hp.y, '#ffd166', true); k.float('¡Parada!', b.x, FLOOR - 200, '#ffd166');
    a.mv = null; a.stun = MODE === 'fence' ? 0.5 : 0.55; b.rip = 0.7; b.par = 0; b.parRc = 0; b.guard = ''; return;
  }
  // tocado
  b.hurtT = 0.3; b.mv = null; b.guard = ''; b.par = 0;
  if (MODE === 'dojo' || MODE === 'fence') {
    spark(hp.x, hp.y, col(a.p), true); k.flash('rgba(255,255,255,.3)'); k.sfx('explode');
    b.stun = 0.8; b.iv = -b.face * 160; lamp = { p: a.p, t: 1.6 };
    point(a.p, MODE === 'dojo' ? '¡Ippon!' : '¡Tocado!');
    return;
  }
  const mul = (counter ? 1.5 : 1) * (m.weak ? 0.5 : 1) * (MODE === 'box' && d.h === 'up' && b.crouch ? 1.4 : 1);
  const dmg = Math.round(d.dmg * mul);
  b.hp = Math.max(0, b.hp - dmg); a.dealt += dmg; b.stun = d.stun * (counter ? 1.3 : 1); b.iv = -b.face * d.push * (counter ? 1.3 : 1);
  if (MODE === 'box' && d.h === 'lo') b.stam = Math.max(0, b.stam - 12);
  spark(hp.x, hp.y, MODE === 'paper' ? col(a.p) : '#fff', dmg >= 12); k.sfx(dmg >= 12 ? 'hurt' : 'hit');
  if (counter) { k.float('¡Contra!', a.x, FLOOR - 205, PCOL[m.k] || '#ffd166'); k.flash('rgba(255,255,255,.25)'); }
  if (MODE === 'paper') paperBits(hp.x, hp.y, col(b.p), 8 + dmg);
  k.float('-' + dmg, b.x, FLOOR - 185, '#ffd166');
  if (b.hp <= 0) { if (MODE === 'box') knockdown(b, a); else roundWin(a.p, '¡Arrugado!'); }
}
function trade(a, b) {
  if (MODE === 'paper') {
    if (a.mv.k === b.mv.k) { clash(a, b); return; }
    if (BEATS[a.mv.k] === b.mv.k) strike(a, b, true); else strike(b, a, true);
    return;
  }
  if (MODE === 'dojo') { a.mv.done = b.mv.done = true; clash(a, b); k.float('¡Aiuchi!', 400, FLOOR - 220, '#fff'); return; }
  if (MODE === 'fence') {
    const dt0 = a.mv.t0 - b.mv.t0;
    if (Math.abs(dt0) < 0.05) { a.mv.done = b.mv.done = true; lamp = { p: -1, t: 1.4 }; k.sfx('hit'); spark(400, FLOOR - 110, '#fff');
      pointNone('Golpe doble: sin punto'); return; }
    strike(dt0 < 0 ? a : b, dt0 < 0 ? b : a); return;
  }
  // boxeo: intercambio, los dos cobran
  const bm = b.mv; strike(a, b); if (phase === 'fight') { b.mv = bm; strike(b, a); b.mv = null; }
}
function clash(a, b) {
  a.mv.done = b.mv.done = true; a.iv = -a.face * 180; b.iv = -b.face * 180; k.sfx('pop'); spark(400 + (a.x + b.x - 800) / 2, FLOOR - 100, '#fff', true);
}
function resolve() {
  const [a, b] = F;
  // Papel: quien ataca contra un arranque que le gana recibe la contra
  if (MODE === 'paper') for (const [x, y] of [[a, b], [b, a]]) if (armed(x, y) && y.mv && !y.mv.done && mph(y) === 'su' && BEATS[y.mv.k] === x.mv.k && Math.abs(x.x - y.x) <= y.mv.d.reach + 20) { x.mv.done = true; strike(y, x, true); return; }
  const aa = armed(a, b), bb = armed(b, a);
  if (aa && bb) trade(a, b); else if (aa) strike(a, b); else if (bb) strike(b, a);
}

/* ---------------- Puntos, rondas y final ---------------- */
function point(p, txt) {
  const f = F[p]; f.pts++; phase = 'pause'; phT = 1.5; slow = 0.45; banner = { txt, sub: `${F[0].pts} – ${F[1].pts}`, t: 1.5, col: col(p) };
  if (f.pts >= CONF.pts) { finish(p); phT = 1.5; }
}
function pointNone(txt) { phase = 'pause'; phT = 1.3; banner = { txt, sub: `${F[0].pts} – ${F[1].pts}`, t: 1.3, col: '#fff' }; }
function roundWin(p, txt) {
  if (phase !== 'fight' && phase !== 'down') return;
  if (p >= 0) F[p].wins++;
  const need = CONF.need || 2;
  phase = 'pause'; phT = 1.8; slow = 0.6; banner = { txt, sub: p >= 0 ? `Ronda para ${nm(p)}` : 'Ronda nula', t: 1.8, col: p >= 0 ? col(p) : '#fff' };
  k.sfx(p >= 0 ? 'win' : 'pop');
  if (p >= 0 && F[p].wins >= need) finish(p);
  else if (round >= (MODE === 'sumo' ? 9 : 5)) finish(F[0].wins === F[1].wins ? -1 : F[0].wins > F[1].wins ? 0 : 1);
}
function knockdown(b, a) {
  b.kd++; b.down = 1; b.mv = null; b.stun = 0; b.fallDir = -1; phase = 'down'; phT = 0; countN = 0;
  k.sfx('explode'); k.shake(12); k.flash('rgba(255,255,255,.35)');
  banner = { txt: b.kd >= 3 ? '¡KO!' : '¡Derribo!', sub: b.kd >= 3 ? `Gana ${nm(a.p)}` : `Derribo ${b.kd} de 3`, t: 1.6, col: col(a.p) };
  a.dealt += 15;
  if (b.kd >= 3) { finish(a.p); phase = 'pause'; phT = 2; }
}
function decision() {
  const [a, b] = F, sa = a.dealt, sb = b.dealt;
  const w = sa === sb ? -1 : sa > sb ? 0 : 1;
  banner = { txt: 'Decisión', sub: `${sa} – ${sb} puntos`, t: 2, col: w >= 0 ? col(w) : '#fff' };
  finish(w); phase = 'pause'; phT = 2;
}
function finish(w) { winner = w; endT = 1.6; }
function placeFighters() {
  F.forEach((f) => { f.x = 400 + (f.p ? 1 : -1) * CONF.gap / 2; f.vx = f.iv = 0; f.face = f.p ? -1 : 1; f.mv = null; f.stun = f.bstun = 0; f.guard = ''; f.par = f.parRc = f.rip = 0;
    f.down = 0; f.lean = 0; f.fall = 0; f.hk = f.hkcd = f.cd = 0; f.ai.def = null; f.ai.defT = 0; f.ai.seen = null; f.ai.cd = 0.6; f.hurtT = 0; });
}
function newRound(first) {
  placeFighters();
  if (!first) round++;
  if (CONF.hp) F.forEach((f) => { f.hp = f.shown = CONF.hp; f.stam = 100; });
  rtime = CONF.time; phase = 'intro'; phT = first ? 1.1 : 1.5;
  const t0 = { paper: `Ronda ${round}`, dojo: 'Rei', fence: 'En garde', box: `Asalto ${round}`, sumo: `Combate ${round}` }[MODE];
  banner = { txt: t0, sub: { paper: '¿Listos?', dojo: 'Saludo', fence: 'Prêts?', box: 'Al centro del ring', sumo: 'Shikiri: mirada fija' }[MODE], t: phT, col: '#ffd166' };
}
function resume() { placeFighters(); phase = 'intro'; phT = 0.9; banner = { txt: MODE === 'dojo' ? 'Hajime' : 'Allez', sub: `${F[0].pts} – ${F[1].pts}`, t: 0.9, col: '#ffd166' }; }
function reset() {
  demo = false; F = [mkF(0), mkF(1)]; round = 1; mclock = 0; lamp = null; endT = -1; winner = -1; slow = 0; bits.length = 0; newRound(true);
}
function endMatch() {
  const val = (f) => (MODE === 'box' ? (winner === f.p ? 100000 : 0) + f.dealt : (CONF.pts ? f.pts : f.wins) * 10 + (winner === f.p ? 1 : 0));
  const txt = (f) => (MODE === 'box' ? `${f.dealt} puntos · ${F[1 - f.p].kd} derribos` : CONF.pts ? `${f.pts} ${MODE === 'dojo' ? 'ippon' : f.pts === 1 ? 'tocado' : 'tocados'}` : `${f.wins} ${MODE === 'sumo' ? (f.wins === 1 ? 'combate' : 'combates') : f.wins === 1 ? 'ronda' : 'rondas'}`);
  const rows = F.map((f) => ({ p: f.p, score: val(f), name: nm(f.p) })), by = new Map(F.map((f) => [val(f), txt(f)]));
  const hum = F.filter((f) => !cpu(f.p));
  if (hum.length === 1 && winner >= 0) { LV = clamp(LV + (winner === hum[0].p ? 1 : -1), 0, 9); try { localStorage.setItem('cpu:' + ID, LV); } catch (e) { /* sin almacenamiento */ } }
  const head = winner < 0 ? '¡Empate!' : !cpu(winner) && !k.party && hum.length === 1 ? '¡Ganas tú!' : `¡Gana ${nm(winner)}!`;
  k.podium(rows, { head, fmt: (s) => by.get(s) || '', noTie: winner >= 0 });
}

/* ---------------- Actualización de cada luchador ---------------- */
function updF(f, g, dt, act) {
  f.anim += dt; f.hurtT = Math.max(0, f.hurtT - dt); f.guardFlash = Math.max(0, (f.guardFlash || 0) - dt);
  f.face = g.x >= f.x ? 1 : -1;
  if (MODE === 'box') f.shown += (f.hp - f.shown) * Math.min(1, dt * 3); else if (CONF.hp) f.shown += (f.hp - f.shown) * Math.min(1, dt * 4);
  if (MODE === 'sumo') { updSumo(f, g, dt, act); return; }
  if (f.down > 0) return;
  const inp = act ? input(f) : { fx: 0, dn: false, up: false, a: false, b: false };
  if (act && cpu(f.p)) ai(f, g, dt);
  f.rip = Math.max(0, f.rip - dt); f.bstun = Math.max(0, f.bstun - dt);
  if (f.par > 0) { f.par -= dt; if (f.par <= 0) f.parRc = 0.26; }
  else if (f.parRc > 0) f.parRc -= dt;
  if (MODE === 'box') f.stam = Math.min(100, f.stam + dt * (f.mv ? 0 : f.guard ? 9 : f.crouch ? 14 : 20));
  let want = 0;
  if (f.stun > 0) { f.stun -= dt; f.guard = ''; f.crouch = false; }
  else if (f.mv) {
    f.mv.t += dt; const m = f.mv, ph = mph(f);
    if (m.d.lunge) { const q = ph === 'su' ? 0 : ph === 'ac' ? ease((m.t - m.su) / m.d.ac) : 1 - ease((m.t - m.su - m.d.ac) / m.d.rc); f.lungeX = q * m.d.lunge; }
    if (ph === 'rc' && !m.done && !m.whiff) { m.whiff = true; m.extra = (m.extra || 0) + (MODE === 'fence' ? 0.18 : MODE === 'dojo' ? 0.12 : 0.06); if (MODE === 'box') f.stam = Math.max(0, f.stam - m.d.cost * 0.5); }
    if (m.t >= m.su + m.d.ac + m.d.rc + (m.extra || 0)) { f.mv = null; f.lungeX = 0; }
    f.guard = ''; f.crouch = MODE === 'dojo' && m.k === 'sweep' || MODE === 'box' && m.k === 'body';
  } else if (f.par > 0 || f.parRc > 0 || f.bstun > 0) {
    if (f.bstun <= 0 && f.par <= 0) f.guard = '';
  } else {
    const key = chooseMove(inp);
    if (key && f.bstun <= 0) startMove(f, key);
    else if (MODE === 'fence' && inp.b) { f.par = 0.2; f.parLine = inp.dn ? 'lo' : 'hi'; k.sfx('click'); }
    else {
      const was = f.guard;
      f.guard = MODE !== 'fence' && inp.fx < -0.3 ? (inp.dn && MODE !== 'box' ? 'lo' : 'hi') : '';
      if (f.guard !== was) f.gT = 0; else f.gT += dt;
      f.crouch = inp.dn && !f.guard;
      if (MODE === 'box' && inp.dn) f.crouch = true;
      if (!f.crouch || MODE === 'fence') want = inp.fx * CONF.walk * (inp.fx < 0 ? (f.guard ? 0.62 : 0.8) : 1);
    }
  }
  if (!f.mv) f.lungeX = 0;
  f.vx += (want * f.face - f.vx) * Math.min(1, dt * 14);
  if (Math.abs(want) > 1) f.walkPh += dt * 11 * Math.sign(want);
  f.iv *= Math.exp(-7 * dt);
  f.x += (f.vx + f.iv) * dt;
}
function separate() {
  const [a, b] = F; const lx = (f) => f.x + (f.lungeX || 0) * f.face;
  const d = lx(b) - lx(a), min = CONF.min;
  if (Math.abs(d) < min) { const push = (min - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1); a.x -= push; b.x += push; }
  for (const f of F) {
    if (f.x < CONF.xl) { f.x = CONF.xl; f.iv = Math.max(0, f.iv); }
    if (f.x > CONF.xr) { f.x = CONF.xr; f.iv = Math.min(0, f.iv); }
  }
  if (MODE === 'fence' && phase === 'fight') {
    const [r0, r1] = CONF.rear;
    for (const f of F) if (f.x < r0 && f.face > 0 || f.x > r1 && f.face < 0) { lamp = { p: 1 - f.p, t: 1.6 }; k.sfx('lose'); point(1 - f.p, '¡Salida de pista!'); return; }
  }
  if (MODE === 'box') for (const f of F) if (f.x <= CONF.xl + 1 || f.x >= CONF.xr - 1) f.rope = 0.25; else f.rope = Math.max(0, (f.rope || 0) - 1 / 60);
}

/* ---------------- Sumo ---------------- */
function updSumo(f, g, dt, act) {
  if (f.fall) { f.fall = Math.min(1, f.fall + dt * 2.2); return; }
  const inp = act ? input(f) : { fx: 0, dn: false, up: false, a: false, b: false };
  if (act && cpu(f.p)) aiSumo(f, g, dt);
  f.cd = Math.max(0, f.cd - dt); f.hkcd = Math.max(0, f.hkcd - dt); f.hk = Math.max(0, f.hk - dt); f.shoveT = Math.max(0, (f.shoveT || 0) - dt);
  f.low = inp.dn; f.fx = inp.fx;
  if (!act) { f.lean *= Math.exp(-3 * dt); return; }
  const ctrl = f.low ? 0.6 : 1;
  f.lean += inp.fx * 1.05 * dt * ctrl;
  const ex = Math.abs(f.lean) - 0.2; if (ex > 0) f.lean += Math.sign(f.lean) * ex * 1.5 * dt * (f.low ? 0.65 : 1);
  f.lean += Math.sin(f.anim * 2.1 + f.p * 2.4) * 0.06 * dt;
  const dist = Math.abs(g.x - f.x), contact = dist <= CONF.min + 3;
  if (!contact) f.vx += (inp.fx * f.face * CONF.walk * (f.low ? 0.55 : 1) - f.vx) * Math.min(1, dt * 6); else f.vx *= Math.exp(-8 * dt);
  if (inp.a && f.cd <= 0) {
    f.cd = 0.5; f.shoveT = 0.22;
    if (dist <= CONF.min + 26 && g.hk <= 0) { g.lean -= 0.3 * (g.low ? 0.5 : 1); g.iv = f.face * 250 * (g.low ? 0.55 : 1); f.lean += 0.06; k.sfx('hit'); k.shake(4); k.burst((f.x + g.x) / 2, FLOOR - 90, '#fff', 6, 140); }
    else if (g.hk > 0 && dist <= CONF.min + 40) { f.lean += 0.45; f.iv = f.face * 240; k.float('¡Henka!', g.x, FLOOR - 200, '#9fe8ff'); k.sfx('pop'); g.hk = 0; }
    else { f.iv = f.face * 260; f.lean += 0.24; k.sfx('jump'); }
  }
  if (inp.b && f.hkcd <= 0) { f.hk = 0.42; f.hkcd = 1.7; f.iv = -f.face * 150; k.sfx('pop'); }
  f.iv *= Math.exp(-5 * dt);
  f.x += (f.vx + f.iv) * dt;
}
function sumoContact(dt) {
  const [a, b] = F; if (a.fall || b.fall) return;
  const dist = b.x - a.x;
  // henka: quien empuja contra el hueco se va de bruces
  for (const [x, y] of [[a, b], [b, a]]) if (y.hk > 0 && x.fx > 0.3 && Math.abs(y.x - x.x) <= CONF.min + 8) { x.lean += 0.5; x.iv = x.face * 220; y.hk = 0; k.float('¡Henka!', y.x, FLOOR - 200, '#9fe8ff'); k.sfx('pop'); }
  if (dist > CONF.min + 3) return;
  const pw = (f, o) => { const str = cpu(f.p) && !demo ? lerp(0.78, 1, SK()) : 1; return str * (f.fx > 0 ? f.fx : f.fx * 0.35) * (1 - 0.55 * Math.max(0, Math.abs(f.lean) - 0.35)) * (f.low ? 1.18 : 1) + Math.max(0, f.lean) * 0.4 - (o.shoveT > 0 ? 0.5 : 0); };
  const pa = pw(a, b), pb = pw(b, a), net = pa - pb;
  const v = net * 95 * dt; a.x += v; b.x += v;
  a.lean -= Math.max(0, pb) * 0.42 * dt * (a.low ? 0.6 : 1); b.lean -= Math.max(0, pa) * 0.42 * dt * (b.low ? 0.6 : 1);
  a.lean += Math.max(0, pa) * 0.12 * dt; b.lean += Math.max(0, pb) * 0.12 * dt;
  a.strain = b.strain = Math.min(1, Math.abs(pa) + Math.abs(pb));
}
function sumoJudge() {
  const [r0, r1] = CONF.ring;
  for (const f of F) {
    const o = F[1 - f.p];
    if (Math.abs(f.lean) >= 1) { f.fall = 0.01; f.fallDir = Math.sign(f.lean); k.sfx('explode'); k.shake(10); roundWin(o.p, f.fallDir > 0 ? (o.hk > 0 || o.hkcd > 1 ? 'Hatakikomi' : 'Tsukiotoshi') : 'Oshitaoshi'); return; }
    if (f.x < r0 || f.x > r1) { f.fall = 0.01; f.fallDir = 0; k.sfx('hurt'); k.shake(6); roundWin(o.p, 'Oshidashi'); return; }
  }
}

/* ---------------- CPU ---------------- */
function aiDefend(f, g, key) {
  const o = f.ai.o, h = MV[key].h, r = Math.random();
  o.fx = 0; o.dn = false; o.up = false; o.a = o.b = false;
  if (MODE === 'paper') {
    if (r < 0.55 && !f.mv && Math.abs(f.x - g.x) <= MV[COUNTER[key]].reach) { o.a = COUNTER[key] !== 'grab'; o.b = COUNTER[key] === 'grab'; o.dn = COUNTER[key] === 'lo'; return 0.05; }
    if (h === 'grab') { o.fx = -1; return 0.5; }
    o.fx = -1; o.dn = h === 'lo'; return 0.55;
  }
  if (MODE === 'dojo') { if (h === 'hi' && r < 0.4) { o.dn = true; return 0.5; } o.fx = -1; o.dn = h === 'lo'; return 0.5; }
  if (MODE === 'fence') { if (r < 0.25 + 0.2 * SK() && f.x * f.face > (f.face > 0 ? CONF.rear[0] + 70 : -(CONF.rear[1] - 70))) { o.fx = -1; return 0.35; } o.b = true; o.dn = h === 'lo'; return 0.05; }
  if (MODE === 'box') { if (h === 'hi') { if (r < 0.5) o.dn = true; else o.fx = -1; return 0.45; } if (h === 'up') { o.fx = -1; return 0.5; } o.fx = -1; return 0.4; }
  return 0.3;
}
function aiAttackKey(f, g) {
  const ks = Object.keys(MV), sk = SK(), h = f.ai.hist;
  if (MODE === 'paper') {
    if (g.guard === 'hi' && Math.random() < sk) return Math.random() < 0.5 ? 'lo' : 'grab';
    if (g.guard === 'lo' && Math.random() < sk) return Math.random() < 0.5 ? 'hi' : 'grab';
    // contra el golpe favorito del rival
    const fav = Object.keys(h).sort((x, y) => h[y] - h[x])[0];
    if (fav && f.ai.histN > 2 && h[fav] / f.ai.histN > 0.45 && Math.random() < 0.3 + sk * 0.5) return COUNTER[fav];
    return k.pick(ks);
  }
  if (MODE === 'dojo') { if (g.guard === 'hi' && Math.random() < sk) return 'sweep'; if ((g.guard === 'lo' || g.crouch) && Math.random() < sk) return 'punch'; return k.pick(['punch', 'punch', 'kick', 'sweep']); }
  if (MODE === 'fence') { if (g.par > 0 || g.parRc > 0) return g.parLine === 'hi' ? 'llo' : 'lhi'; return Math.random() < 0.6 ? 'lhi' : 'llo'; }
  if (MODE === 'box') {
    if (f.stam < 25 && Math.random() < sk) return f.stam > 8 ? 'jab' : null;
    if (g.crouch && Math.random() < 0.3 + sk * 0.5) return 'upper';
    if (g.guard && Math.random() < 0.3 + sk * 0.5) return 'body';
    return k.pick(['jab', 'jab', 'cross', 'body', 'jab', 'upper']);
  }
  return null;
}
function press(o, key) {
  o.a = o.b = false; o.dn = false; o.up = false;
  if (MODE === 'paper') { o.b = key === 'grab'; o.a = !o.b; o.dn = key === 'lo'; }
  else if (MODE === 'dojo') { o.a = key === 'punch'; o.b = !o.a; o.dn = key === 'sweep'; }
  else if (MODE === 'fence') { o.a = true; o.dn = key === 'llo'; }
  else if (MODE === 'box') { if (key === 'jab') o.a = true; else if (key === 'cross') o.b = true; else if (key === 'upper') { o.b = true; o.up = true; } else { o.a = true; o.dn = true; } }
}
function ai(f, g, dt) {
  const A = f.ai, o = A.o, sk = SK(), calm = !demo && mclock < 5, dist = Math.abs(g.x - f.x);
  o.a = o.b = false; A.cd -= dt;
  // defensa sostenida
  if (A.defT > 0) { A.defT -= dt; if (A.defT <= 0) { o.fx = 0; o.dn = false; } return; }
  // amenaza: el rival arranca un golpe
  if (g.mv && !g.mv.done && mph(g) !== 'rc') {
    if (A.seen !== g.mv) {
      A.seen = g.mv; A.rt = lerp(0.32, 0.1, sk) + Math.random() * 0.07;
      const fav = A.histN > 2 ? (A.hist[g.mv.k] || 0) / A.histN : 0;
      A.ok = Math.random() < 0.22 + 0.58 * sk + (fav > 0.5 ? 0.12 + 0.25 * sk : 0);
      A.wrong = !A.ok && Math.random() < 0.5;
    }
    A.rt -= dt;
    const near = dist <= g.mv.d.reach + (MODE === 'fence' ? 20 : 30);
    const timing = MODE !== 'fence' || g.mv.t >= g.mv.su - 0.15;
    if (A.rt <= 0 && near && timing && !f.mv && f.stun <= 0) {
      A.rt = 99;
      if (A.ok) { A.defT = aiDefend(f, g, g.mv.k); if (A.defT > 0.1) A.defT += Math.random() * 0.1; return; }
      if (A.wrong) { const ks = Object.keys(MV).filter((q) => q !== g.mv.k); A.defT = aiDefend(f, g, k.pick(ks.length ? ks : [g.mv.k])); return; }
    }
  }
  o.fx = 0; o.dn = false; o.up = false;
  if (f.mv || f.stun > 0) return;
  // castigo: el rival falló o está aturdido
  const open = g.stun > 0.12 || g.mv && mph(g) === 'rc' && (g.mv.t < g.mv.su + g.mv.d.ac + g.mv.d.rc - 0.08) || g.parRc > 0.1;
  A.punT = (A.punT || 0) - dt;
  if (open && !calm && A.punT <= 0) {
    A.punT = 0.6;
    if (Math.random() < 0.12 + 0.8 * sk) {
      const ks = Object.keys(MV).filter((q) => MV[q].reach >= dist + 4).sort((x, y) => MV[x].su - MV[y].su);
      if (ks.length) { press(o, ks[0]); A.cd = lerp(1, 0.4, sk); return; }
    }
  }
  // neutro: plan de distancia y ataque
  A.planT -= dt;
  if (A.planT <= 0) {
    const agg = calm ? 0 : lerp(0.3, 0.72, sk);
    A.plan = Math.random() < agg ? 'attack' : Math.random() < 0.5 ? 'space' : 'bait';
    A.planT = k.rnd(0.5, 1.3); A.key = A.plan === 'attack' ? aiAttackKey(f, g) : null;
  }
  const gReach = Math.max(...Object.values(MV).map((m) => m.reach)), pref = gReach + 12;
  if (A.plan === 'attack' && A.key && A.cd <= 0) {
    const r = MV[A.key].reach - 8;
    if (dist > r) o.fx = 1;
    else { press(o, A.key); A.cd = lerp(1.3, 0.5, sk) + Math.random() * 0.4; A.plan = 'space'; A.planT = k.rnd(0.3, 0.8); if (MODE === 'box' && Math.random() < sk * 0.6) A.combo = 0.18; }
  } else if (A.plan === 'bait') { o.fx = dist > pref - 4 ? 1 : -1; if (MODE !== 'fence' && Math.random() < 0.3) o.fx = -1; }
  else { o.fx = dist < pref - 18 ? -1 : dist > pref + 26 ? 1 : 0; }
  if (MODE === 'fence') { if (f.face > 0 && f.x < CONF.rear[0] + 50 || f.face < 0 && f.x > CONF.rear[1] - 50) o.fx = Math.max(o.fx, 0.6); }
  if (A.combo > 0) { A.combo -= dt; if (A.combo <= 0 && dist < MV.cross.reach) press(o, 'cross'); }
}
function aiSumo(f, g, dt) {
  const A = f.ai, o = A.o, sk = SK(), calm = !demo && mclock < 5;
  o.a = o.b = false; A.think -= dt;
  const [r0, r1] = CONF.ring, back = f.face > 0 ? f.x - r0 : r1 - f.x, dist = Math.abs(g.x - f.x);
  if (A.think <= 0) {
    A.think = lerp(0.22, 0.07, sk) + Math.random() * 0.05;
    const safe = lerp(0.45, 0.62, sk), noise = (1 - sk) * 0.25 * (Math.random() - 0.5);
    let fx;
    if (f.lean > safe + noise) fx = -1;
    else if (f.lean < -0.3) fx = 1;
    else if (calm) fx = dist > CONF.min + 40 ? 0.6 : f.lean < 0.1 ? 0.5 : 0;
    else fx = f.lean < safe - 0.2 ? 1 : 0.4;
    o.fx = fx; o.dn = back < 70 || g.lean > 0.55 && Math.random() < sk;
    if (!calm && f.cd <= 0 && dist < CONF.min + 20 && (g.lean < -0.25 || back < 60) && f.lean < 0.5 && Math.random() < 0.25 + sk * 0.6) o.a = true;
    if (!calm && f.hkcd <= 0 && g.lean > 0.5 && g.fx > 0 && back > 90 && Math.random() < sk * 0.35) o.b = true;
  }
}

/* ---------------- Poses y dibujo de luchadores ---------------- */
const BASE = {
  paper: { hy: 52, lean: 0.08, ff: [18, 0], fb: [-20, 0], hf: [20, 6], hb: [12, 10], ht: 0 },
  dojo:  { hy: 50, lean: 0.06, ff: [24, 0], fb: [-24, 0], hf: [26, 12], hb: [6, 24], ht: 0 },
  fence: { hy: 47, lean: 0.02, ff: [26, 0], fb: [-26, 0], hf: [24, 8], hb: [-16, -30], ht: 0 },
  box:   { hy: 54, lean: 0.12, ff: [16, 0], fb: [-18, 0], hf: [20, -4], hb: [12, -2], ht: 0 },
  sumo:  { hy: 40, lean: 0.1, ff: [34, 0], fb: [-34, 0], hf: [30, 20], hb: [24, 24], ht: 0 },
}[MODE];
const SW = { // [arranque, golpe]
  hi: [{ hf: [2, 8], lean: -0.05 }, { hf: [58, -6], lean: 0.22, ff: [26, 0] }],
  lo: [{ hy: 44, ff: [10, -10] }, { hy: 46, ff: [64, -14], lean: -0.14, hf: [8, 4] }],
  grab: [{ hf: [8, 2], hb: [4, 6], lean: -0.02 }, { hf: [48, 8], hb: [44, 16], lean: 0.36, ff: [30, 0] }],
  punch: [{ hf: [8, 18] }, { hf: [62, 4], lean: 0.18, ff: [32, 0], hb: [-2, 26] }],
  kick: [{ ff: [8, -24], hy: 54, lean: -0.1 }, { ff: [68, -80], fb: [-10, 0], lean: -0.36, hy: 58, hf: [10, 2], hb: [-8, 10] }],
  sweep: [{ hy: 30, ff: [10, 0], lean: 0.2 }, { hy: 24, ff: [72, -4], fb: [-12, 0], lean: 0.28, hf: [16, 38], hb: [28, 42] }],
  lhi: [{ hf: [18, 4] }, { hy: 34, ff: [64, 0], fb: [-40, 0], hf: [66, -2], hb: [-30, 12], lean: 0.12 }],
  llo: [{ hf: [18, 8] }, { hy: 34, ff: [64, 0], fb: [-40, 0], hf: [62, 16], hb: [-30, 12], lean: 0.16 }],
  jab: [{ hf: [12, -2] }, { hf: [62, -12], lean: 0.2 }],
  cross: [{ hb: [2, -2], lean: -0.04 }, { hb: [64, -10], hf: [12, -10], lean: 0.32, ff: [22, 0] }],
  upper: [{ hy: 44, hf: [16, 16], lean: 0.2 }, { hy: 58, hf: [28, -44], lean: 0.02 }],
  body: [{ hy: 46, hf: [10, 10] }, { hy: 42, hf: [56, 18], lean: 0.32 }],
};
function targetPose(f) {
  const P = Object.assign({}, BASE, { ff: BASE.ff.slice(), fb: BASE.fb.slice(), hf: BASE.hf.slice(), hb: BASE.hb.slice(), rot: 0 });
  const set = (o) => { for (const q in o) P[q] = Array.isArray(o[q]) ? o[q].slice() : o[q]; };
  if (MODE === 'sumo') {
    P.lean = 0.12 + f.lean * 0.62; if (f.low) { P.hy -= 8; P.ff[0] += 4; P.fb[0] -= 4; }
    const push = F[1 - f.p] && Math.abs(F[1 - f.p].x - f.x) <= CONF.min + 6;
    if (push || f.fx > 0.3) { P.hf = [44, 6]; P.hb = [40, 12]; }
    if (f.shoveT > 0) { P.hf = [62, 0]; P.hb = [58, 6]; }
    if (f.fx < -0.3) { P.hf = [18, 26]; P.hb = [10, 28]; }
    if (f.hk > 0) { P.lean -= 0.1; P.hf = [-6, 18]; }
    if (f.fall) { const e = ease(f.fall); P.lean = lerp(P.lean, 0.05, e); P.hy = lerp(P.hy, 30, e); P.rot = (f.fallDir || -1) * e * 1.3; P.ht = -0.2; }
    return P;
  }
  const m = f.mv, ph = mph(f);
  if (f.down > 0) { set({ hy: 34, lean: 0, hf: [-4, 30], hb: [-8, 30] }); P.rot = -ease(Math.min(1, f.down)) * 1.3; return P; }
  if (m && SW[m.k]) { if (ph === 'su') set(SW[m.k][0]); else set(SW[m.k][1]); return P; }
  if (f.stun > 0) { set({ lean: -0.32, hf: [-4, -8], hb: [-12, -12], ht: -0.35, ff: [10, 0], fb: [-26, 0] }); return P; }
  if (MODE === 'fence' && (f.par > 0 || f.parRc > 0)) { set({ hf: f.parLine === 'lo' ? [22, 22] : [22, -14] }); return P; }
  if (f.guard === 'hi') { set(MODE === 'box' ? { hf: [16, -14], hb: [12, -10], lean: 0.04 } : { hf: [14, -8], hb: [10, -2], lean: 0 }); }
  if (f.guard === 'lo') set({ hy: 36, hf: [22, 24], hb: [14, 20], lean: 0.24 });
  if (f.crouch && !f.guard) set(MODE === 'box' ? { hy: 36, lean: 0.48, hf: [18, -8], hb: [12, -6] } : { hy: 34, lean: 0.3 });
  return P;
}
function stepPose(f, dt) {
  const T = targetPose(f); if (!f.pz) { f.pz = JSON.parse(JSON.stringify(T)); return; }
  const r = 1 - Math.exp(-(f.mv && mph(f) === 'ac' ? 38 : 20) * dt), P = f.pz;
  for (const q in T) { if (Array.isArray(T[q])) { P[q][0] += (T[q][0] - P[q][0]) * r; P[q][1] += (T[q][1] - P[q][1]) * r; } else P[q] += (T[q] - P[q]) * r; }
}
function ik(ax, ay, bx, by, l1, l2, sg) {
  let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy); const m = l1 + l2 - 0.01;
  if (d > m) { bx = ax + dx / d * m; by = ay + dy / d * m; d = m; }
  d = Math.max(d, Math.abs(l1 - l2) + 0.01); const a = Math.atan2(dy, dx), cb = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), an = a + sg * Math.acos(cb);
  return [ax + Math.cos(an) * l1, ay + Math.sin(an) * l1, bx, by];
}
function seg(pts, w, cl) {
  c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = w + 5; c.stroke(); c.strokeStyle = cl; c.lineWidth = w; c.stroke();
}
function paperSeg(x1, y1, x2, y2, w, cl) { // tira de papel doblada: dos caras de distinto tono
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, nx = -dy / d * w / 2, ny = dx / d * w / 2;
  c.beginPath(); c.moveTo(x1 + nx, y1 + ny); c.lineTo(x2 + nx, y2 + ny); c.lineTo(x2, y2); c.lineTo(x1, y1); c.closePath(); c.fillStyle = ART.lite(cl, 0.25); c.fill();
  c.beginPath(); c.moveTo(x1 - nx, y1 - ny); c.lineTo(x2 - nx, y2 - ny); c.lineTo(x2, y2); c.lineTo(x1, y1); c.closePath(); c.fillStyle = ART.dark(cl, 0.12); c.fill();
  c.beginPath(); c.moveTo(x1 + nx, y1 + ny); c.lineTo(x2 + nx, y2 + ny); c.lineTo(x2 - nx, y2 - ny); c.lineTo(x1 - nx, y1 - ny); c.closePath(); c.lineJoin = 'round'; c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
}
const SKIN = '#ffd9b5', SKIND = '#e8ad86', HAIR = '#2e2240';
function drawF(f) {
  const P = f.pz; if (!P) return;
  const cl = col(f.p), walk = Math.abs(f.vx) > 20 && !f.mv && f.stun <= 0 ? Math.sin(f.walkPh) : 0;
  const lx = f.x + (f.lungeX || 0) * f.face;
  c.save();
  // sombra
  c.fillStyle = 'rgba(20,12,40,.28)'; c.beginPath(); c.ellipse(lx, FLOOR + 3, (MODE === 'sumo' ? 64 : 42) * S * 0.8, 7, 0, 0, TAU); c.fill();
  c.translate(lx, FLOOR);
  if (MODE === 'sumo' && f.hk > 0) { c.translate(0, -10); c.globalAlpha = 0.72; }
  if (P.rot) c.rotate(P.rot * f.face);
  c.scale(f.face * S, S);
  if (f.hurtT > 0) c.translate(Math.sin(f.hurtT * 90) * 2, 0);
  const hip = [0, -P.hy], L = MODE === 'sumo' ? 40 : 46, cs = Math.cos(P.lean), sn = Math.sin(P.lean);
  const nk = [hip[0] + sn * L, hip[1] - cs * L];
  const shF = [nk[0] + 3 * cs, nk[1] + 7], shB = [nk[0] - 5 * cs, nk[1] + 6];
  const ha = P.lean + P.ht, head = [nk[0] + Math.sin(ha) * 17, nk[1] - Math.cos(ha) * 17];
  const ff = [P.ff[0] + walk * 7, P.ff[1] - Math.max(0, walk) * 5], fb = [P.fb[0] - walk * 7, P.fb[1] - Math.max(0, -walk) * 5];
  const legF = ik(hip[0] + 3, hip[1], ff[0], ff[1] - 4, 30, 30, -1), legB = ik(hip[0] - 3, hip[1], fb[0], fb[1] - 4, 30, 30, -1);
  const armF = ik(shF[0], shF[1], shF[0] + P.hf[0], shF[1] + P.hf[1], 25, 25, 1), armB = ik(shB[0], shB[1], shB[0] + P.hb[0], shB[1] + P.hb[1], 25, 25, 1);
  const st = STY[MODE];
  st.arm(shB, armB, cl, true); st.leg([hip[0] - 3, hip[1]], legB, cl, true);
  st.torso(hip, nk, P.lean, cl, f);
  st.leg([hip[0] + 3, hip[1]], legF, cl, false);
  st.head(head, ha, cl, f);
  st.arm(shF, armF, cl, false, f);
  c.restore();
  // indicador de golpe en Papel y equilibrio en Sumo
  if (MODE === 'paper' && f.mv && mph(f) === 'su') drawSign(lx, FLOOR - 190 * S / 1.25 - 10, f.mv.k, 1 - f.mv.t / f.mv.su);
}
function drawSign(x, y, key, q) {
  c.save(); c.translate(x, y); const s = 1 + q * 0.25; c.scale(s, s);
  c.beginPath(); c.arc(0, 0, 16, 0, TAU); ART.fillOut(c, PCOL[key], 3); c.fillStyle = OUT; c.strokeStyle = OUT; c.lineWidth = 3.4; c.lineCap = 'round';
  if (key === 'hi') { c.beginPath(); c.moveTo(0, 8); c.lineTo(0, -7); c.moveTo(-6, -1); c.lineTo(0, -8); c.lineTo(6, -1); c.stroke(); }
  else if (key === 'lo') { c.beginPath(); c.moveTo(0, -8); c.lineTo(0, 7); c.moveTo(-6, 1); c.lineTo(0, 8); c.lineTo(6, 1); c.stroke(); }
  else { c.beginPath(); c.arc(0, 2, 7, Math.PI, 0); c.moveTo(-7, 2); c.lineTo(-7, -6); c.moveTo(0, -5); c.lineTo(0, -9); c.moveTo(7, 2); c.lineTo(7, -6); c.stroke(); }
  c.restore();
}
function face(hx, hy, f, r) {
  const hurt = f.hurtT > 0 || f.stun > 0 || f.down > 0 || f.fall;
  c.fillStyle = OUT; c.strokeStyle = OUT; c.lineWidth = 1.8; c.lineCap = 'round';
  if (hurt) { for (const ex of [r * 0.33, r * 0.72]) { c.beginPath(); c.moveTo(hx + ex - 2.4, hy - 4); c.lineTo(hx + ex + 2.4, hy + 1); c.moveTo(hx + ex + 2.4, hy - 4); c.lineTo(hx + ex - 2.4, hy + 1); c.stroke(); } }
  else { for (const ex of [r * 0.33, r * 0.72]) { c.beginPath(); c.ellipse(hx + ex, hy - 1.5, 1.8, 2.8, 0, 0, TAU); c.fill(); }
    c.beginPath(); c.moveTo(hx + r * 0.16, hy - 7); c.lineTo(hx + r * 0.5, hy - 5.2); c.moveTo(hx + r * 0.6, hy - 5.2); c.lineTo(hx + r * 0.92, hy - 6.6); c.stroke(); }
  c.beginPath(); if (hurt) c.ellipse(hx + r * 0.55, hy + 6, 2.4, 2, 0, 0, TAU), c.fill(); else { c.moveTo(hx + r * 0.36, hy + 6); c.lineTo(hx + r * 0.78, hy + 5.4); c.stroke(); }
}
function fist(x, y, r, cl) { c.beginPath(); c.arc(x, y, r, 0, TAU); ART.fillOut(c, cl, 2.2); }
const STY = {
  paper: {
    arm(sh, a, cl, back) { const cc = back ? ART.dark(cl, 0.2) : cl; paperSeg(sh[0], sh[1], a[0], a[1], 9, cc); paperSeg(a[0], a[1], a[2], a[3], 8, cc);
      c.beginPath(); c.moveTo(a[2] - 6, a[3] - 5); c.lineTo(a[2] + 7, a[3]); c.lineTo(a[2] - 6, a[3] + 5); c.closePath(); ART.fillOut(c, '#fffaf0', 2); },
    leg(h, l, cl, back) { const cc = back ? '#d9cdb4' : '#f4ead2'; paperSeg(h[0], h[1], l[0], l[1], 11, cc); paperSeg(l[0], l[1], l[2], l[3], 10, cc);
      c.beginPath(); c.moveTo(l[2] - 6, l[3] + 4); c.lineTo(l[2] + 10, l[3] + 4); c.lineTo(l[2] - 2, l[3] - 5); c.closePath(); ART.fillOut(c, cc, 2); },
    torso(hip, nk, lean, cl) { c.save(); c.translate(hip[0], hip[1]); c.rotate(lean);
      c.beginPath(); c.moveTo(0, 4); c.lineTo(15, -30); c.lineTo(0, -48); c.lineTo(-15, -30); c.closePath(); c.fillStyle = cl; c.fill();
      c.beginPath(); c.moveTo(0, 4); c.lineTo(15, -30); c.lineTo(0, -48); c.closePath(); c.fillStyle = ART.dark(cl, 0.16); c.fill();
      c.beginPath(); c.moveTo(0, 4); c.lineTo(15, -30); c.lineTo(0, -48); c.lineTo(-15, -30); c.closePath(); c.lineJoin = 'round'; c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-15, -30); c.lineTo(15, -30); c.stroke(); c.restore(); },
    head(h, a, cl, f) { c.save(); c.translate(h[0], h[1]); c.rotate(a * 0.5);
      const pts = [[-12, -2], [-6, -15], [8, -14], [14, 0], [8, 12], [-8, 12]];
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = '#fffaf0'; c.fill();
      c.beginPath(); c.moveTo(-6, -15); c.lineTo(8, -14); c.lineTo(14, 0); c.lineTo(0, -2); c.closePath(); c.fillStyle = '#e9dfc8'; c.fill();
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
      c.beginPath(); c.moveTo(-6, -15); c.lineTo(-2, -24); c.lineTo(4, -14.5); ART.fillOut(c, cl, 2.2); // cresta doblada
      face(-2, 1, f, 13); c.restore(); },
  },
  dojo: {
    arm(sh, a, cl, back) { const g = back ? '#d7d3e6' : '#fbfaff'; seg([sh[0], sh[1], a[0], a[1], a[2] - (a[2] - a[0]) * 0.25, a[3] - (a[3] - a[1]) * 0.25], 10, g); seg([a[2] - (a[2] - a[0]) * 0.25, a[3] - (a[3] - a[1]) * 0.25, a[2], a[3]], 6, back ? SKIND : SKIN); fist(a[2], a[3], 5, back ? SKIND : SKIN); },
    leg(h, l, cl, back) { const g = back ? '#d7d3e6' : '#fbfaff'; seg([h[0], h[1], l[0], l[1], l[2], l[3] - 3], 13, g); c.beginPath(); c.ellipse(l[2] + 3, l[3], 7, 3.5, 0, 0, TAU); ART.fillOut(c, back ? SKIND : SKIN, 2); },
    torso(hip, nk, lean, cl) { c.save(); c.translate(hip[0], hip[1]); c.rotate(lean);
      ART.rr(c, -14, -50, 28, 54, 8); ART.fillOut(c, '#fbfaff', 2.6);
      c.fillStyle = '#e4e0f0'; c.beginPath(); c.moveTo(-14, -44); c.lineTo(2, -14); c.lineTo(-14, -8); c.closePath(); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, -50); c.lineTo(6, -18); c.moveTo(8, -50); c.lineTo(0, -32); c.stroke();
      c.fillStyle = SKIN; c.beginPath(); c.moveTo(-6, -50); c.lineTo(6, -50); c.lineTo(0, -38); c.closePath(); c.fill();
      ART.rr(c, -15, -8, 30, 7, 3); ART.fillOut(c, cl, 2); c.save(); c.translate(-10, -4); c.rotate(0.5 + Math.sin(t * 6) * 0.2);
      ART.rr(c, -2, 0, 5, 16, 2); ART.fillOut(c, cl, 1.6); c.restore(); c.restore(); },
    head(h, a, cl, f) { c.save(); c.translate(h[0], h[1]); c.rotate(a * 0.4);
      c.beginPath(); c.arc(0, 0, 14, 0, TAU); ART.fillOut(c, SKIN, 2.6);
      c.beginPath(); c.arc(-1, -3, 14.6, Math.PI * 0.95, Math.PI * 1.95); c.lineTo(12, -4); c.lineTo(-8, -2); c.closePath(); ART.fillOut(c, HAIR, 2.2);
      ART.rr(c, -15, -9, 29, 6, 3); ART.fillOut(c, cl, 1.8); // hachimaki
      c.save(); c.translate(-14, -6); c.rotate(2.6 + Math.sin(t * 7 + f.p) * 0.25); ART.rr(c, 0, -2, 16, 4, 2); ART.fillOut(c, cl, 1.4); c.rotate(0.35); ART.rr(c, 0, -2, 13, 4, 2); ART.fillOut(c, cl, 1.4); c.restore();
      face(-1, 2, f, 13); c.restore(); },
  },
  fence: {
    arm(sh, a, cl, back, f) { const g = back ? '#dcdcea' : '#ffffff'; seg([sh[0], sh[1], a[0], a[1], a[2], a[3]], 9, g);
      if (back) { fist(a[2], a[3], 4.5, '#f2f2f7'); return; }
      const dx = a[2] - a[0], dy = a[3] - a[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      const par = f && (f.par > 0 || f.parRc > 0), ang = par ? (f.parLine === 'lo' ? 0.9 : -0.9) : 0, bx = ux * Math.cos(ang) - uy * Math.sin(ang), by = ux * Math.sin(ang) + uy * Math.cos(ang);
      const L = 74; c.strokeStyle = OUT; c.lineWidth = 3.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(a[2], a[3]); c.lineTo(a[2] + bx * L, a[3] + by * L); c.stroke();
      c.strokeStyle = '#e8eef8'; c.lineWidth = 1.6; c.stroke(); c.fillStyle = '#9aa7b8'; c.beginPath(); c.arc(a[2] + bx * L, a[3] + by * L, 1.8, 0, TAU); c.fill();
      c.save(); c.translate(a[2] + bx * 4, a[3] + by * 4); c.rotate(Math.atan2(by, bx)); c.beginPath(); c.ellipse(0, 0, 3, 8, 0, 0, TAU); ART.fillOut(c, '#c9d3e4', 2); c.restore();
      fist(a[2], a[3], 4.5, '#f2f2f7'); },
    leg(h, l, cl, back) { const g = back ? '#dcdcea' : '#ffffff'; seg([h[0], h[1], l[0], l[1]], 12, g); seg([l[0], l[1], l[2], l[3] - 3], 10, back ? '#dcdcea' : '#f4f4fa');
      c.beginPath(); c.ellipse(l[2] + 3, l[3] - 1, 8, 4, 0, 0, TAU); ART.fillOut(c, '#5a5570', 2); },
    torso(hip, nk, lean, cl) { c.save(); c.translate(hip[0], hip[1]); c.rotate(lean);
      ART.rr(c, -13, -50, 26, 56, 8); ART.fillOut(c, '#ffffff', 2.6);
      c.save(); ART.rr(c, -13, -50, 26, 56, 8); c.clip(); c.fillStyle = ART.alpha(cl, 0.55); c.fillRect(-13, -44, 26, 36); c.fillStyle = 'rgba(255,255,255,.4)'; for (let i = -12; i < 14; i += 5) c.fillRect(i, -44, 1.4, 36); c.restore();
      c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.moveTo(6, -48); c.lineTo(6, 2); c.stroke(); c.restore(); },
    head(h, a, cl, f) { c.save(); c.translate(h[0], h[1]); c.rotate(a * 0.4);
      c.beginPath(); c.ellipse(0, 0, 13, 15, 0, 0, TAU); ART.fillOut(c, '#3c3a52', 2.6);
      c.save(); c.beginPath(); c.ellipse(0, 0, 13, 15, 0, 0, TAU); c.clip(); c.strokeStyle = 'rgba(200,210,235,.45)'; c.lineWidth = 1; for (let i = -14; i < 16; i += 3.4) { c.beginPath(); c.moveTo(i, -16); c.lineTo(i, 16); c.moveTo(-14, i); c.lineTo(14, i); c.stroke(); } c.restore();
      c.beginPath(); c.moveTo(-11, 9); c.quadraticCurveTo(0, 22, 12, 9); c.lineTo(10, 16); c.quadraticCurveTo(0, 26, -10, 16); c.closePath(); ART.fillOut(c, '#ffffff', 2);
      c.strokeStyle = cl; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 11.5, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(4, -4, 2.2, 1.6, 0, 0, TAU); c.ellipse(9, -3.5, 1.8, 1.4, 0, 0, TAU); c.fill();
      c.restore(); },
  },
  box: {
    arm(sh, a, cl, back) { seg([sh[0], sh[1], a[0], a[1], a[2], a[3]], 9, back ? SKIND : SKIN);
      const gc = back ? ART.dark(cl, 0.18) : cl; c.beginPath(); c.arc(a[2] + 3, a[3], 13, 0, TAU); const gr = c.createRadialGradient(a[2] - 2, a[3] - 5, 1, a[2] + 3, a[3], 14); gr.addColorStop(0, ART.lite(gc, 0.45)); gr.addColorStop(1, gc); c.fillStyle = gr; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
      c.beginPath(); c.ellipse(a[2] + 4, a[3] - 8, 6, 4, -0.3, 0, TAU); ART.fillOut(c, gc, 1.8); ART.rr(c, a[2] - 12, a[3] - 7, 7, 14, 3); ART.fillOut(c, '#ffffff', 1.8); },
    leg(h, l, cl, back) { seg([h[0], h[1], l[0], l[1], l[2], l[3] - 3], 12, back ? SKIND : SKIN); ART.rr(c, l[2] - 6, l[3] - 9, 15, 10, 3); ART.fillOut(c, back ? '#3a3258' : '#4a4270', 2); },
    torso(hip, nk, lean, cl) { c.save(); c.translate(hip[0], hip[1]); c.rotate(lean);
      ART.rr(c, -14, -50, 28, 50, 10); const g = c.createLinearGradient(-14, -50, 14, 0); g.addColorStop(0, '#ffe6cf'); g.addColorStop(1, SKIND); c.fillStyle = g; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = 'rgba(140,80,60,.45)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -40); c.lineTo(0, -16); c.moveTo(-8, -36); c.quadraticCurveTo(-2, -32, 0, -36); c.moveTo(8, -36); c.quadraticCurveTo(2, -32, 0, -36); c.stroke();
      ART.rr(c, -16, -10, 32, 22, 6); ART.fillOut(c, cl, 2.4); ART.rr(c, -16, -10, 32, 6, 3); ART.fillOut(c, '#ffffff', 1.8); c.restore(); },
    head(h, a, cl, f) { c.save(); c.translate(h[0], h[1]); c.rotate(a * 0.4);
      c.beginPath(); c.arc(0, 0, 14, 0, TAU); ART.fillOut(c, SKIN, 2.6);
      c.beginPath(); c.arc(-1, -2, 14.5, Math.PI * 0.9, Math.PI * 1.7); c.lineTo(-4, -8); c.closePath(); ART.fillOut(c, HAIR, 2);
      face(-1, 2, f, 13); if (!(f.hurtT > 0 || f.stun > 0 || f.down > 0)) { c.fillStyle = '#ffffff'; ART.rr(c, 3, 6, 8, 3.4, 1.5); c.fill(); }
      c.restore(); },
  },
  sumo: {
    arm(sh, a, cl, back) { seg([sh[0], sh[1], a[0], a[1], a[2], a[3]], 14, back ? SKIND : SKIN); fist(a[2] + 1, a[3], 7, back ? SKIND : SKIN); },
    leg(h, l, cl, back) { seg([h[0], h[1], l[0], l[1], l[2], l[3] - 4], 18, back ? SKIND : SKIN); c.beginPath(); c.ellipse(l[2] + 3, l[3] - 1, 10, 4.5, 0, 0, TAU); ART.fillOut(c, back ? SKIND : SKIN, 2); },
    torso(hip, nk, lean, cl) { c.save(); c.translate(hip[0], hip[1]); c.rotate(lean);
      c.beginPath(); c.ellipse(4, -22, 30, 33, 0, 0, TAU); const g = c.createRadialGradient(-6, -34, 4, 4, -22, 36); g.addColorStop(0, '#ffeedd'); g.addColorStop(0.6, SKIN); g.addColorStop(1, SKIND); c.fillStyle = g; c.fill(); c.lineWidth = 2.8; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = 'rgba(160,90,60,.4)'; c.lineWidth = 1.5; c.beginPath(); c.arc(14, -30, 8, 0.2, 1.8); c.stroke(); c.beginPath(); c.arc(20, -12, 3, 0, TAU); c.stroke();
      ART.rr(c, -26, -6, 56, 14, 6); ART.fillOut(c, cl, 2.4); c.fillStyle = ART.dark(cl, 0.25); for (let i = -20; i < 26; i += 9) c.fillRect(i, -4, 3, 10);
      for (let i = 0; i < 5; i++) { ART.rr(c, -8 + i * 6, 8, 3, 12, 1.4); ART.fillOut(c, ART.dark(cl, 0.1), 1.2); }
      c.restore(); },
    head(h, a, cl, f) { c.save(); c.translate(h[0], h[1] + 4); c.rotate(a * 0.4);
      c.beginPath(); c.arc(0, 0, 14, 0, TAU); ART.fillOut(c, SKIN, 2.6);
      c.beginPath(); c.arc(-1, -2, 14.4, Math.PI * 0.95, Math.PI * 1.95); c.lineTo(12, -3); c.lineTo(-10, 0); c.closePath(); ART.fillOut(c, '#1d1630', 2.2);
      c.beginPath(); c.ellipse(-4, -17, 7, 4.2, -0.4, 0, TAU); ART.fillOut(c, '#1d1630', 2); // moño
      face(-1, 3, f, 13); c.restore(); },
  },
};

/* ---------------- Papelitos (Papel) ---------------- */
const bits = [];
function paperBits(x, y, cl, n) { for (let i = 0; i < n && bits.length < 120; i++) { const a = Math.random() * TAU, v = 80 + Math.random() * 220; bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, r: Math.random() * TAU, vr: k.rnd(-8, 8), life: 0.9 + Math.random() * 0.6, col: Math.random() < 0.5 ? cl : '#fffaf0', s: 3 + Math.random() * 4 }); } }
function updBits(dt) { for (const b of bits) { b.vy += 420 * dt; b.vx *= 1 - 1.5 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt; b.life -= dt; if (b.y > FLOOR) { b.y = FLOOR; b.vy *= -0.2; b.vr *= 0.5; } } for (let i = bits.length - 1; i >= 0; i--) if (bits[i].life <= 0) bits.splice(i, 1); }
function drawBits() { for (const b of bits) { c.save(); c.globalAlpha = Math.min(1, b.life * 2); c.translate(b.x, b.y); c.rotate(b.r); c.beginPath(); c.moveTo(-b.s, -b.s * 0.6); c.lineTo(b.s, 0); c.lineTo(-b.s * 0.4, b.s * 0.7); c.closePath(); ART.fillOut(c, b.col, 1.2); c.restore(); } }

/* ---------------- Escenarios (capa estática cacheada ×2) ---------------- */
let stageCv = null;
function stage() {
  if (stageCv) return stageCv;
  stageCv = mkc(W * 2, H * 2); const g = stageCv.getContext('2d'); g.scale(2, 2);
  STAGE[MODE](g);
  return stageCv;
}
function tri(g, pts, fill, lw) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.lineJoin = 'round'; g.strokeStyle = OUT; g.stroke(); } }
const STAGE = {
  paper(g) {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fbeed3'); bg.addColorStop(1, '#ecd5aa'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(150,110,60,.08)'; for (let i = 0; i < 380; i++) { const x = (i * 97.3) % W, y = (i * 53.9) % FLOOR; g.fillRect(x, y, 2 + (i % 3), 1); }
    // sol de papel con rayos en zigzag
    g.save(); g.translate(640, 112); g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = i % 2 ? 44 : 56; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fillStyle = '#ffc94d'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fillStyle = '#ffdf85'; g.fill(); g.stroke(); g.restore();
    // nubes de papel
    for (const [x, y, s] of [[150, 90, 1], [420, 70, 0.8], [760, 170, 0.7]]) { g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(-50, 14); g.lineTo(-40, -6); g.lineTo(-16, -14); g.lineTo(6, -26); g.lineTo(30, -12); g.lineTo(50, 14); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke(); g.strokeStyle = 'rgba(26,21,48,.18)'; g.beginPath(); g.moveTo(-16, -14); g.lineTo(0, 14); g.moveTo(6, -26); g.lineTo(18, 14); g.stroke(); g.restore(); }
    // montañas plegadas
    const M = [[-40, 360, 150, 170, '#b6a4f0'], [120, 360, 300, 150, '#8fd3c1'], [300, 360, 470, 200, '#f5a3b5'], [480, 360, 640, 160, '#b6a4f0'], [620, 360, 820, 190, '#8fd3c1']];
    for (const [x0, y0, x1, top, cl] of M) { const mx = (x0 + x1) / 2; tri(g, [[x0, y0], [mx, top], [mx, y0]], ART.lite(cl, 0.15)); tri(g, [[mx, top], [x1, y0], [mx, y0]], ART.dark(cl, 0.15)); tri(g, [[x0, y0], [mx, top], [x1, y0]], 'rgba(0,0,0,0)', 2.6); }
    // grullas de papel colgadas
    for (const [x, y] of [[250, 150], [520, 120]]) { g.strokeStyle = 'rgba(26,21,48,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, y - 10); g.stroke(); tri(g, [[x - 22, y], [x, y - 12], [x + 4, y + 6]], '#ff6fb5', 2); tri(g, [[x + 22, y - 4], [x, y - 12], [x + 4, y + 6]], '#e35a9e', 2); tri(g, [[x - 22, y], [x - 30, y - 12], [x - 16, y - 2]], '#ff6fb5', 1.8); }
    // alfombrilla de corte
    g.fillStyle = '#3f9e7a'; g.fillRect(0, FLOOR - 10, W, H - FLOOR + 10); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1;
    for (let x = 0; x < W; x += 25) { g.beginPath(); g.moveTo(x, FLOOR - 10); g.lineTo(x + (x - 400) * 0.25, H); g.stroke(); }
    for (let y = FLOOR + 4; y < H; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = '#ffd24a'; g.fillRect(0, FLOOR - 12, W, 7); g.fillStyle = OUT; for (let x = 0; x < W; x += 10) g.fillRect(x, FLOOR - 12, 1.2, x % 50 ? 3 : 6);
    g.strokeStyle = OUT; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, FLOOR - 12); g.lineTo(W, FLOOR - 12); g.stroke();
  },
  dojo(g) {
    // pared de madera con gran ventanal (el cielo se pinta debajo cada fotograma)
    g.beginPath(); g.rect(0, 0, W, H); g.rect(100, 50, 600, 250); g.fillStyle = '#2b1b2c'; g.fill('evenodd');
    g.fillStyle = 'rgba(255,255,255,.03)'; for (let x = 0; x < W; x += 34) g.fillRect(x, 0, 2, 300);
    for (const [x, y, w, h] of [[88, 40, 624, 14], [88, 296, 624, 14], [88, 40, 14, 270], [698, 40, 14, 270], [396, 50, 8, 250]]) { ART.rr(g, x, y, w, h, 3); const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#8a5a3b'); gr.addColorStop(1, '#5e3a24'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke(); }
    g.strokeStyle = 'rgba(40,24,30,.75)'; g.lineWidth = 2; for (let x = 160; x < 700; x += 60) { if (Math.abs(x - 400) < 20) continue; g.beginPath(); g.moveTo(x, 54); g.lineTo(x, 110); g.stroke(); } g.beginPath(); g.moveTo(102, 110); g.lineTo(698, 110); g.stroke();
    // pergamino
    ART.rr(g, 30, 90, 40, 150, 4); ART.fillOut(g, '#f3ead6', 2.2); ART.rr(g, 26, 84, 48, 8, 3); ART.fillOut(g, '#6b4329', 2); ART.rr(g, 26, 238, 48, 8, 3); ART.fillOut(g, '#6b4329', 2);
    g.strokeStyle = OUT; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(42, 118); g.lineTo(58, 124); g.moveTo(50, 110); g.lineTo(48, 170); g.moveTo(40, 150); g.quadraticCurveTo(52, 160, 60, 146); g.moveTo(44, 190); g.lineTo(56, 210); g.stroke();
    g.fillStyle = '#e04a4a'; g.beginPath(); g.arc(50, 222, 5, 0, TAU); g.fill();
    // suelo de tatami/madera
    const fl = g.createLinearGradient(0, 310, 0, H); fl.addColorStop(0, '#7a4d2e'); fl.addColorStop(1, '#4a2b1a'); g.fillStyle = fl; g.fillRect(0, 310, W, H - 310);
    g.strokeStyle = 'rgba(30,15,10,.5)'; g.lineWidth = 1.5; for (let x = -800; x < 1600; x += 70) { g.beginPath(); g.moveTo(400 + (x - 400) * 0.45, 310); g.lineTo(x, H); g.stroke(); }
    for (const y of [330, 356, 390, 430]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = 'rgba(255,230,170,.08)'; g.beginPath(); g.ellipse(400, 380, 300, 30, 0, 0, TAU); g.fill();
    g.strokeStyle = OUT; g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, 310); g.lineTo(W, 310); g.stroke();
  },
  fence(g) {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#141a38'); bg.addColorStop(1, '#2c3566'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 34; i++) { const x = i * 25 + (r % 2) * 12, y = 214 + r * 22, cl = ['#3a2f6b', '#2a3a70', '#452c5e', '#23305c'][(i + r) % 4]; g.fillStyle = cl; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); g.fillRect(x - 11, y + 7, 22, 16); }
    for (let i = 0; i < 8; i++) { const x = i * 100; ART.rr(g, x + 4, 272, 92, 34, 4); g.fillStyle = i % 2 ? '#463ac4' : '#6e62f5'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(x + 20, 298); g.lineTo(x + 40, 280); g.lineTo(x + 60, 298); g.closePath(); g.fill(); }
    for (const x of [160, 400, 640]) { const gr = g.createRadialGradient(x, 0, 10, x, 250, 260); gr.addColorStop(0, 'rgba(255,255,230,.22)'); gr.addColorStop(1, 'rgba(255,255,230,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 20, 0); g.lineTo(x + 20, 0); g.lineTo(x + 170, 400); g.lineTo(x - 170, 400); g.closePath(); g.fill(); }
    g.fillStyle = '#1b1f3a'; g.fillRect(0, 306, W, H - 306);
    // pista
    const px0 = 20, px1 = 780, py = FLOOR - 16;
    g.beginPath(); g.moveTo(px0 + 18, py); g.lineTo(px1 - 18, py); g.lineTo(px1, py + 30); g.lineTo(px0, py + 30); g.closePath(); const pg = g.createLinearGradient(0, py, 0, py + 30); pg.addColorStop(0, '#c3ccd8'); pg.addColorStop(1, '#8e9aab'); g.fillStyle = pg; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
    const X = (x, y) => x + (x - 400) * (y - py) / 30 * 0.047;
    const zone = (a, b, cl) => { g.beginPath(); g.moveTo(X(a, py), py); g.lineTo(X(b, py), py); g.lineTo(X(b, py + 30), py + 30); g.lineTo(X(a, py + 30), py + 30); g.closePath(); g.fillStyle = cl; g.fill(); };
    zone(px0 + 20, 118, 'rgba(255,111,181,.35)'); zone(682, px1 - 20, 'rgba(255,111,181,.35)');
    for (const [x, w] of [[400, 3], [270, 2], [530, 2], [CONF.rear[0], 3.4], [CONF.rear[1], 3.4]]) { g.strokeStyle = '#ffffff'; g.lineWidth = w; g.beginPath(); g.moveTo(X(x, py), py + 1); g.lineTo(X(x, py + 30), py + 29); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(40, py + 2, 720, 2);
  },
  box(g) {
    const bg = g.createRadialGradient(400, 120, 40, 400, 200, 520); bg.addColorStop(0, '#3a2e6e'); bg.addColorStop(1, '#0f0c22'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 44; i++) { const x = i * 19 + (r % 2) * 9, y = 150 + r * 26 + Math.sin(i * 1.7) * 3; g.fillStyle = ['#2c2350', '#35295e', '#231c42'][(i + r) % 3]; g.beginPath(); g.arc(x, y, 7.5, 0, TAU); g.fill(); g.fillRect(x - 9, y + 5, 18, 16); }
    const gr = g.createRadialGradient(400, -40, 10, 400, 280, 300); gr.addColorStop(0, 'rgba(255,250,220,.38)'); gr.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(360, 0); g.lineTo(440, 0); g.lineTo(700, 400); g.lineTo(100, 400); g.closePath(); g.fill();
    // lona del ring
    g.beginPath(); g.moveTo(60, FLOOR - 26); g.lineTo(740, FLOOR - 26); g.lineTo(790, FLOOR + 14); g.lineTo(10, FLOOR + 14); g.closePath(); const lg = g.createLinearGradient(0, FLOOR - 26, 0, FLOOR + 14); lg.addColorStop(0, '#cfd9ec'); lg.addColorStop(1, '#a9b7d2'); g.fillStyle = lg; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = 'rgba(110,98,245,.25)'; g.beginPath(); g.ellipse(400, FLOOR - 6, 90, 14, 0, 0, TAU); g.fill();
    g.fillStyle = '#463ac4'; g.fillRect(10, FLOOR + 14, 780, H - FLOOR - 14); g.strokeStyle = OUT; g.strokeRect(10, FLOOR + 14, 780, H - FLOOR - 14);
    g.fillStyle = 'rgba(255,255,255,.18)'; for (let x = 40; x < 780; x += 90) { g.beginPath(); g.moveTo(x, FLOOR + 36); g.lineTo(x + 12, FLOOR + 24); g.lineTo(x + 24, FLOOR + 36); g.lineTo(x + 12, FLOOR + 48); g.closePath(); g.fill(); }
  },
  sumo(g) {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1810'); bg.addColorStop(1, '#4a2c1c'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 40; i++) { const x = i * 21 + (r % 2) * 10, y = 150 + r * 30; g.fillStyle = ['#5a3624', '#63402a', '#4e2e1e'][(i + r) % 3]; g.fillRect(x - 10, y + 6, 20, 18); g.fillStyle = '#2b1a14'; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); }
    // techo colgante (tsuriyane) con borlas
    tri(g, [[40, 0], [760, 0], [720, 44], [80, 44]], '#3b2f4e', 2.6); ART.rr(g, 70, 40, 660, 18, 3); ART.fillOut(g, '#6e3aa0', 2.4);
    g.fillStyle = '#ffc94d'; for (let x = 90; x < 720; x += 40) g.fillRect(x, 44, 14, 3);
    for (const [x, cl] of [[92, '#3fae5a'], [708, '#d8403a']]) { g.strokeStyle = OUT; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 58); g.lineTo(x, 90); g.stroke(); tri(g, [[x - 11, 90], [x + 11, 90], [x + 16, 150], [x - 16, 150]], cl, 2.4); ART.rr(g, x - 13, 84, 26, 10, 4); ART.fillOut(g, '#ffc94d', 2); }
    // dohyo
    const top = FLOOR - 6;
    tri(g, [[70, top], [730, top], [790, H], [10, H]], '#b98552', 2.6);
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let y = top + 18; y < H; y += 16) g.fillRect(20, y, 760, 2);
    g.beginPath(); g.moveTo(70, top); g.lineTo(730, top); g.lineTo(740, top + 14); g.lineTo(60, top + 14); g.closePath(); g.fillStyle = '#e8cf9e'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
    // tawara (sacos de paja) del borde y líneas de salida
    for (const x of CONF.ring) { ART.rr(g, x - 9, top - 8, 18, 12, 5); ART.fillOut(g, '#d9c27a', 2.2); g.strokeStyle = 'rgba(26,21,48,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 4, top - 7); g.lineTo(x - 4, top + 3); g.moveTo(x + 4, top - 7); g.lineTo(x + 4, top + 3); g.stroke(); }
    g.strokeStyle = 'rgba(217,194,122,.8)'; g.lineWidth = 4; g.beginPath(); g.moveTo(CONF.ring[0] + 10, top - 2); g.lineTo(CONF.ring[1] - 10, top - 2); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(372, top + 3, 12, 3); g.fillRect(416, top + 3, 12, 3);
  },
};
function drawStage() {
  if (MODE === 'dojo') { ART.background(c, ART.THEMES.night, W, 310, 0, 0, t); }
  c.drawImage(stage(), 0, 0, W, H);
  if (MODE === 'dojo') { // farolillos con brillo
    for (const x of [150, 650]) { const fl = 0.85 + Math.sin(t * 7 + x) * 0.08; const gr = c.createRadialGradient(x, 150, 4, x, 150, 90); gr.addColorStop(0, `rgba(255,190,90,${0.35 * fl})`); gr.addColorStop(1, 'rgba(255,190,90,0)'); c.fillStyle = gr; c.fillRect(x - 90, 60, 180, 180);
      c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 54); c.lineTo(x, 128); c.stroke(); c.beginPath(); c.ellipse(x, 150, 17, 23, 0, 0, TAU); ART.fillOut(c, '#ff9a4a', 2.4); c.fillStyle = `rgba(255,230,160,${0.6 * fl})`; c.beginPath(); c.ellipse(x - 4, 146, 7, 12, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(26,21,48,.5)'; c.lineWidth = 1.2; for (const dy of [-10, 0, 10]) { c.beginPath(); c.moveTo(x - 16, 150 + dy); c.lineTo(x + 16, 150 + dy); c.stroke(); } }
  }
  if (MODE === 'box') { // cuerdas y postes
    for (const [x, p] of [[40, 0], [760, 1]]) { ART.rr(c, x - 7, FLOOR - 150, 14, 140, 4); ART.fillOut(c, '#d6dbe8', 2.4); ART.rr(c, x - 10, FLOOR - 146, 20, 36, 5); ART.fillOut(c, col(p), 2.2); }
    for (const [h, cl] of [[46, '#ff6fb5'], [82, '#ffffff'], [118, '#5b8cff']]) { const sag = F.some((f) => f.rope > 0) ? Math.sin(t * 20) * 2 : 0; c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(40, FLOOR - 26 - h); c.quadraticCurveTo(400, FLOOR - 26 - h + 6 + sag, 760, FLOOR - 26 - h); c.stroke(); c.strokeStyle = cl; c.lineWidth = 3; c.stroke(); }
    if (Math.random() < 0.08) { const x = k.rnd(10, 790), y = k.rnd(140, 240); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }
  }
  if (MODE === 'fence' && lamp) { // lámparas de tocado
    const on = (p) => lamp.p === p || lamp.p === -1;
    for (const p of [0, 1]) { const x = p ? 440 : 360; c.beginPath(); c.arc(x, 66, 13, 0, TAU); ART.fillOut(c, on(p) ? (lamp.p === -1 ? '#ffffff' : col(p)) : '#2a2f55', 2.4); if (on(p)) { c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x - 4, 62, 4, 0, TAU); c.fill(); } }
  }
}

/* ---------------- HUD ---------------- */
function bar(x, y, w, h, q, cl, back, rev) {
  ART.rr(c, x, y, w, h, h / 2); c.fillStyle = back || 'rgba(26,21,48,.85)'; c.fill();
  const ww = Math.max(0, w * clamp(q, 0, 1)); if (ww > 1) { ART.rr(c, rev ? x + w - ww : x, y, ww, h, h / 2); c.fillStyle = cl; c.fill(); }
  ART.rr(c, x, y, w, h, h / 2); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
}
function hud() {
  for (const f of F) {
    const L = f.p === 0, x0 = L ? 12 : W - 312, cl = col(f.p);
    panel(x0, 8, 300, MODE === 'box' || MODE === 'sumo' ? 64 : 52, 14, 'rgba(26,21,48,.82)', 2.5);
    ART.rr(c, L ? x0 + 6 : x0 + 244, 14, 50, 26, 9); ART.fillOut(c, cl, 2); c.font = FONT(15); c.fillStyle = OUT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(tag(f.p), L ? x0 + 31 : x0 + 269, 28);
    const bx = L ? x0 + 64 : x0 + 8, bw = 228;
    if (CONF.hp) {
      bar(bx, 16, bw, 16, f.shown / CONF.hp, '#ffffff', null, !L);
      ART.rr(c, bx, 16, bw, 16, 8); c.save(); c.clip(); const ww = bw * clamp(f.hp / CONF.hp, 0, 1); c.fillStyle = f.hp < 30 ? '#ff6a6a' : MODE === 'paper' ? cl : '#7cf7a0'; c.fillRect(L ? bx : bx + bw - ww, 16, ww, 16); c.restore();
      ART.rr(c, bx, 16, bw, 16, 8); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
      if (MODE === 'box') { bar(bx, 38, bw * 0.7, 9, f.stam / 100, f.stam < 25 ? '#ffb05c' : '#5ce1e6', null, !L); for (let i = 0; i < 3; i++) { const cx = L ? bx + bw * 0.74 + 10 + i * 18 : bx + bw * 0.26 - 10 - i * 18; c.beginPath(); c.arc(cx, 43, 6, 0, TAU); ART.fillOut(c, i < f.kd ? '#ff6a6a' : '#3a3258', 1.8); } }
      const need = CONF.need || 2; for (let i = 0; i < need; i++) { const cx = L ? bx + 8 + i * 20 : bx + bw - 8 - i * 20; if (MODE === 'box') break; c.beginPath(); c.arc(cx, 42, 6, 0, TAU); ART.fillOut(c, i < f.wins ? '#ffd166' : '#3a3258', 1.8); }
    } else if (CONF.pts) {
      for (let i = 0; i < CONF.pts; i++) { const cx = L ? bx + 14 + i * 34 : bx + bw - 14 - i * 34; c.beginPath(); c.arc(cx, 30, 11, 0, TAU); ART.fillOut(c, i < f.pts ? cl : '#3a3258', 2.2); if (i < f.pts) { c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(cx - 3, 26, 3.5, 0, TAU); c.fill(); } }
    } else if (MODE === 'sumo') {
      // barra de equilibrio: el centro es estable; los extremos, caída
      const q = clamp(f.lean, -1, 1), mx = bx + bw / 2;
      ART.rr(c, bx, 16, bw, 18, 9); const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#ff6a6a'); g.addColorStop(0.22, '#ffd166'); g.addColorStop(0.4, '#7cf7a0'); g.addColorStop(0.6, '#7cf7a0'); g.addColorStop(0.78, '#ffd166'); g.addColorStop(1, '#ff6a6a'); c.fillStyle = g; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
      const nx = mx + q * f.face * (bw / 2 - 6); c.beginPath(); c.moveTo(nx, 12); c.lineTo(nx - 7, 4); c.lineTo(nx + 7, 4); c.closePath(); ART.fillOut(c, '#ffffff', 2); ART.rr(c, nx - 3, 13, 6, 24, 3); ART.fillOut(c, '#ffffff', 2);
      for (let i = 0; i < CONF.need; i++) { const cx = L ? bx + 10 + i * 22 : bx + bw - 10 - i * 22; c.beginPath(); c.arc(cx, 50, 7, 0, TAU); ART.fillOut(c, i < f.wins ? '#ffd166' : '#3a3258', 1.8); }
    }
  }
  // reloj central
  const left = Math.max(0, Math.ceil(rtime)); panel(362, 8, 76, 40, 12, 'rgba(26,21,48,.88)', 2.5);
  label(CONF.pts && rtime <= 0 ? 'Oro' : String(left), 400, 29, 22, rtime < 10 ? '#ff6a6a' : '#fff');
  if (MODE === 'paper') { // leyenda del triángulo
    panel(280, 412, 240, 30, 10, 'rgba(26,21,48,.75)', 2); c.font = FONT(13, 800); c.textBaseline = 'middle';
    const parts = [['Alto', PCOL.hi], ['›', '#fff'], ['Agarre', PCOL.grab], ['›', '#fff'], ['Bajo', PCOL.lo], ['›', '#fff'], ['Alto', PCOL.hi]]; let x = 292;
    for (const [s, cl] of parts) { c.fillStyle = cl; c.textAlign = 'left'; c.fillText(s, x, 428); x += c.measureText(s).width + 6; }
  }
}
function drawBanner() {
  if (!banner) return; const a = clamp(banner.t / 0.3, 0, 1);
  c.save(); c.globalAlpha = a; panel(250, 80, 300, 70, 20, 'rgba(26,21,48,.88)', 3.5);
  label(banner.txt, 400, 106, 30, banner.col || '#ffd166'); c.font = FONT(16, 700); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(banner.sub || '', 400, 134); c.restore();
}

/* ---------------- Bucle ---------------- */
function step(dt, act) {
  const [a, b] = F;
  if (banner && (banner.t -= dt) <= 0) banner = null;
  if (lamp && (lamp.t -= dt) <= 0) lamp = null;
  if (endT >= 0 && phase !== 'fight') { endT -= dt; F.forEach((f) => stepPose(f, dt)); F.forEach((f) => updF(f, F[1 - f.p], dt * 0.5, false)); if (endT < 0) { endT = -2; if (demo) { demoReset(); } else { live = false; endMatch(); } } return; }
  if (phase === 'intro') { phT -= dt; F.forEach((f) => updF(f, F[1 - f.p], dt, false)); if (phT <= 0) { phase = 'fight'; if (!banner || banner.t < 0.5) banner = null; banner = { txt: { paper: '¡Pelea!', dojo: '¡Hajime!', fence: '¡Allez!', box: '¡Box!', sumo: '¡Hakkeyoi!' }[MODE], sub: '', t: 0.7, col: '#7cf7a0' }; k.sfx('go'); } }
  else if (phase === 'pause') { const s = slow > 0 ? 0.3 : 1; slow -= dt; phT -= dt; F.forEach((f) => updF(f, F[1 - f.p], dt * s, false)); separate(); if (phT <= 0 && endT < 0) { if (CONF.pts) resume(); else newRound(false); } }
  else if (phase === 'down') {
    phT += dt; const fallen = F.find((f) => f.down > 0); F.forEach((f) => updF(f, F[1 - f.p], dt, false));
    if (fallen) { fallen.down = Math.min(1.2, fallen.down + dt * 2); const n = Math.floor(phT / 0.75); if (n > countN && n <= 5) { countN = n; k.sfx('tick'); } if (phT > 4) { fallen.down = 0; fallen.hp = fallen.shown = Math.max(35, 75 - 15 * fallen.kd); fallen.stam = 70; phase = 'fight'; placeFighters(); banner = { txt: '¡Box!', sub: '', t: 0.6, col: '#7cf7a0' }; } }
  } else if (phase === 'fight') {
    mclock += dt; rtime -= dt;
    updF(a, b, dt, act); updF(b, a, dt, act);
    if (MODE === 'sumo') { sumoContact(dt); separate(); sumoJudge(); }
    else { separate(); if (phase === 'fight') resolve(); }
    if (phase === 'fight' && rtime <= 0) {
      if (MODE === 'box') { if (round >= CONF.rounds) decision(); else { phase = 'pause'; phT = 1.6; banner = { txt: 'Fin del asalto', sub: `${a.dealt} – ${b.dealt} puntos`, t: 1.6, col: '#fff' }; k.sfx('tick'); } }
      else if (MODE === 'sumo') { phase = 'pause'; phT = 1.4; banner = { txt: 'Mizu-iri', sub: 'Pausa: se repite el combate', t: 1.4, col: '#9fe8ff' }; rtime = CONF.time; }
      else if (MODE === 'paper') roundWin(a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1, '¡Tiempo!');
      else if (CONF.pts && a.pts !== b.pts) { finish(a.pts > b.pts ? 0 : 1); phase = 'pause'; phT = 1.5; banner = { txt: '¡Tiempo!', sub: `${a.pts} – ${b.pts}`, t: 1.5, col: '#fff' }; }
      else rtime = 0; // punto de oro: sin reloj
    }
    if (CONF.pts && rtime < 0) rtime = 0;
  }
  F.forEach((f) => stepPose(f, dt));
}
function demoReset() { demo = true; F = [mkF(0), mkF(1)]; round = 1; mclock = 10; endT = -1; winner = -1; newRound(true); }
demoReset();
k.show(CFG.title, (CFG.help || '') + '<br>Toca para jugar');
k.run((dt) => {
  t += dt; updBits(dt);
  if (!k.gate(() => {})) { if (k.st === 'ready') step(dt, true); else F.forEach((f) => stepPose(f, dt)); return; }
  if (!live) { live = true; reset(); k.count(3); }
  if (k.counting()) { F.forEach((f) => { f.anim += dt; stepPose(f, dt); }); return; }
  step(dt, true);
}, () => {
  drawStage();
  const order = F.slice().sort((x, y) => (x.mv ? 1 : 0) - (y.mv ? 1 : 0));
  order.forEach(drawF);
  drawBits();
  if (!demo) hud();
  if (!k.counting()) drawBanner();
  if (phase === 'down' && countN > 0 && endT < 0) label(String(countN), 400, 215, 64, '#ffd166');
});
