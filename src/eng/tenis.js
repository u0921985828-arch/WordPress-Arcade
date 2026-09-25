/* tenis — raqueta cenital con bote real (altura z), efecto según el momento del golpe y marcador oficial.
 * CFG.mode: 'tenis' (individual; dobles si hay 3–4 jugadores en la tele) | 'padel' (siempre 2v2, paredes de cristal y malla).
 * Marcador: 0-15-30-40, iguales y ventaja (pádel: punto de oro a 40-40), juego, set a CFG.games (4) con 2 de diferencia;
 * con empate a CFG.games, tie-break a 7 con 2 de diferencia (saque alterno cada 2 puntos). CFG.sets = sets para ganar (1).
 * Saque cruzado al cuadro (falta, doble falta, red = se repite). Un bote como máximo; fuera, red. Pádel: pared del rival antes
 * del bote = punto para quien recibe; tras el bote las paredes son juego; si sale por encima tras botar es punto; en el saque,
 * malla tras el bote = falta. Golpe (A): pronto → cruzado con liftado, a tiempo → «¡Perfecto!», tarde → cortado al paralelo.
 * B = globo. Sin pulsar, tras el bote se devuelve una bola blanda (bloqueo). Plazas: equipo 0 (abajo/izquierda) J1 y J3,
 * equipo 1 J2 y J4. La CPU mejora con las victorias (cpu:<id>) y durante el partido; afloja si gana de 2 juegos. */
const PADEL = CFG.mode === 'padel', OUT = ART.OUT, TAU = 6.2832, G = 9.8;
const L = PADEL ? 10 : 11.885, NETH = PADEL ? 0.88 : 0.914, SVC = PADEL ? 6.95 : 6.4, HWS = PADEL ? 5 : 4.115, HWD = PADEL ? 5 : 5.485;
const GAMES = CFG.games || 4, SETS = CFG.sets || 1, GOLD = PADEL && CFG.gold !== false;
const AX = PADEL ? 5.4 : HWD + 3, AY = PADEL ? 10.4 : L + 4.4; // media anchura / media longitud visibles
const VERT = innerHeight > innerWidth * 1.08;
const W = VERT ? 400 : 720, H = VERT ? 720 : 400, HUD = VERT ? 66 : 48;
const S = VERT ? Math.min((W - 14) / (2 * AX), (H - HUD - 14) / (2 * AY)) : Math.min((W - 14) / (2 * AY), (H - HUD - 10) / (2 * AX));
const CX = W / 2, CY = HUD + (H - HUD) / 2, ZK = 0.5, SC = S / 20;
if (window.CFG && !CFG.hud) CFG.hud = 'bl';
const k = Kit({ w: W, h: H, title: CFG.title, bg: PADEL ? '#101a30' : '#1b3a28' }), c = k.ctx;
const lite = ART.lite, dark = ART.dark, clamp = k.clamp, hyp = Math.hypot;
const CPUK = 'cpu:' + CFG.id;
const lsGet = (key, d) => { try { const v = localStorage.getItem(key); return v == null ? d : +v; } catch (e) { return d; } };
const lsSet = (key, v) => { try { localStorage.setItem(key, v); } catch (e) { /* sin almacenamiento */ } };
/* mundo (x lateral, y a lo largo; y>0 = campo del equipo 0) → pantalla */
const V = (x, y) => (VERT ? [CX + x * S, CY + y * S] : [CX - y * S, CY + x * S]);
const toW = (sx, sy) => (VERT ? [(sx - CX) / S, (sy - CY) / S] : [(sy - CY) / S, (CX - sx) / S]);
const sg = (t) => (t === 0 ? 1 : -1);
const PS = PADEL ? 5.3 : 6.6, REACH = PADEL ? 1.35 : 1.5, SWT = 0.3;
let skill = 0.3, P = [], ball, sc, phase, phT, next, msg = '', msg2 = '', msgT = 0, msgC = '#fff', sv, rally = 0, tm = 0, cdPend = false, DBL = false, played = 0, HW = HWS;
let marks = [], flashes = [], pver = 0, pcache = [null, null], firstPt = true;

/* ---------------- Utilidades ---------------- */
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'center'; c.textBaseline = base || 'middle';
  c.lineJoin = 'round'; c.lineWidth = size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function mk(w, h, draw) { const r = Math.min(3, Math.max(2, Math.ceil((k.scale || 1) * Math.min(2, devicePixelRatio || 1)))), cv = document.createElement('canvas'); cv.width = w * r; cv.height = h * r; const q = cv.getContext('2d'); q.scale(r, r); q.lineJoin = 'round'; q.lineCap = 'round'; draw(q); return cv; }
function worldT(g) { g.translate(CX, CY); if (!VERT) g.transform(0, 1, -1, 0, 0, 0); g.scale(S, S); }
/* dirección del jugador p en el mundo (el mando se lee en pantalla) */
function wdir(p) { const d = k.pdir(p); let x = d.x, y = d.y; if (!VERT) [x, y] = [y, -x]; const m = hyp(x, y); return m ? { x: x / m, y: y / m } : { x: 0, y: 0 }; }
const nameOf = (pl) => { if (pl.ctl < 0) return 'CPU'; if (!k.party) return 'Tú'; const q = k.party.find((x) => x.p === pl.ctl); return (q && q.name) || 'J' + (pl.ctl + 1); };
const team = (t) => P.filter((pl) => pl.team === t);
const teamName = (t) => { const m = team(t), h = m.filter((pl) => pl.ctl >= 0); if (!k.party && h.length) return DBL ? 'Tu pareja' : 'Tú'; if (!h.length) return DBL ? 'CPU' : 'CPU'; return m.map(nameOf).join(' y '); };
const shortName = (t) => { const m = team(t), h = m.filter((pl) => pl.ctl >= 0); if (!k.party) return h.length ? 'Tú' : 'CPU'; return h.length ? nameOf(h[0]) + (DBL && h.length > 1 ? '+' : '') : 'CPU'; };
const teamCol = (t) => { const m = team(t), h = m.find((pl) => pl.ctl >= 0); return k.pcol(h ? h.ctl : m[0].slot); };
const humanTeam = () => { const h = P.filter((pl) => pl.ctl >= 0).map((pl) => pl.team); return h.length && h.every((x) => x === h[0]) ? h[0] : -1; };
function say(a, b, col, t) { msg = a; msg2 = b || ''; msgC = col || '#fff'; msgT = t || 1.6; }

/* ---------------- Partido ---------------- */
function mkPlayers() {
  P = []; const n = DBL ? 2 : 1;
  for (let t = 0; t < 2; t++) for (let i = 0; i < n; i++) { const slot = DBL ? t + i * 2 : t;
    P.push({ team: t, i, slot, ctl: k.human(slot) ? slot : -1, x: 0, y: sg(t) * L, vx: 0, vy: 0, sw: -1, swT: 'a', cool: 0, anim: 0, react: 0, tx: 0, ty: sg(t) * L,
      hair: ['#3a2a4a', '#8a4b2a', '#f2d15c', '#c94f3a'][slot % 4], skin: ['#ffd9b5', '#e9b48a', '#ffe0c4', '#c98a5e'][slot % 4] }); }
}
function refreshCtl() { for (const pl of P) pl.ctl = k.human(pl.slot) ? pl.slot : -1; }
function reset() {
  DBL = PADEL || !!CFG.dbl || !!(k.party && k.party.length >= 3); HW = DBL ? HWD : HWS;
  skill = clamp(0.25 + lsGet(CPUK, 0) * 0.05, 0.25, 0.8); played = 0; rally = 0; firstPt = true;
  mkPlayers();
  sc = { pts: [0, 0], games: [0, 0], sets: [0, 0], hist: [], tb: false, tbT0: 0, srvTeam: k.party ? (Math.random() < 0.5 ? 0 : 1) : 0, srvIdx: [0, 0] };
  marks = []; flashes = []; msgT = 0; cdPend = !!k.party;
  ball = { x: 0, y: L, z: 1, vx: 0, vy: 0, vz: 0, g: G, spin: 0, last: 0, bounces: 0, serve: false, net: false, age: 0, mark: null };
  setServe(false);
}
k.onParty = () => { if (k.st !== 'play') { reset(); return; } refreshCtl(); };
const srvTeam = () => (sc.tb ? (sc.pts[0] + sc.pts[1] === 0 ? sc.tbT0 : sc.tbT0 ^ (Math.floor((sc.pts[0] + sc.pts[1] + 1) / 2) % 2)) : sc.srvTeam);
const server = () => { const t = srvTeam(); return P.find((pl) => pl.team === t && (!DBL || pl.i === sc.srvIdx[t])); };
function setServe(second) {
  phase = 'serve'; ball.mark = null;
  const st = srvTeam(), s = sg(st), srv = server(), deuce = (sc.pts[0] + sc.pts[1]) % 2 === 0, sx = (deuce ? 1 : -1) * s * (DBL ? (PADEL ? 2.5 : 2.4) : 0.9);
  const box = -Math.sign(sx), rt = 1 - st, rs = sg(rt);
  sv = { t: 0, stage: 'hold', second: !!second, wait: 0, box, cpuHit: 0.53, st };
  for (const pl of P) { pl.vx = pl.vy = 0; pl.sw = -1; pl.cool = 0; pl.react = 0; }
  Object.assign(srv, { x: sx, y: s * (PADEL ? 7.9 : L + 0.35) });
  const rcv = DBL ? team(rt).find((pl) => pl.i === (deuce ? 0 : 1)) : team(rt)[0];
  Object.assign(rcv, { x: box * (PADEL ? 2.7 : DBL ? 3 : 2.3), y: rs * (PADEL ? 9 : L + 0.6) });
  if (DBL) { const sp = team(st).find((pl) => pl !== srv), rp = team(rt).find((pl) => pl !== rcv);
    Object.assign(sp, { x: -Math.sign(sx) * 2.6, y: s * (PADEL ? 3.3 : 3.2) }); Object.assign(rp, { x: -box * 2.6, y: rs * (PADEL ? 6.3 : SVC - 0.3) }); }
  for (const pl of P) { pl.tx = pl.x; pl.ty = pl.y; }
  Object.assign(ball, { x: srv.x + 0.3 * s, y: srv.y - 0.2 * s, z: 1, vx: 0, vy: 0, vz: 0, bounces: 0, serve: false, net: false, last: st, age: 0 });
}
function doServe(srv, err) {
  const s = sg(srv.team), hum = srv.ctl >= 0, aim = hum ? wdir(srv.ctl).x : k.rnd(-0.6, 0.6);
  let tx = sv.box * HWS * 0.5 + aim * HWS * 0.3 + k.rnd(-1, 1) * err * 1.8;
  const ty = -s * (SVC - (PADEL ? 1.7 : 1.4) + k.rnd(-0.3, 1) * err * 2.4);
  let v = PADEL ? (sv.second ? 8.5 : 9.5 + 2.5 * (1 - err)) : sv.second ? 12 : 14 + 7 * (1 - err);
  if (!hum) v *= 0.78 + 0.25 * skill;
  if (firstPt && !hum) v *= 0.8;
  if (!PADEL) ball.z = Math.max(1.8, ball.z + 0.4); else ball.z = 0.75;
  tx = clamp(tx, -HWS - 1.5, HWS + 1.5);
  launch(srv, tx, ty, v, sv.second ? 0.5 : 0.15, err < 0.55 || Math.random() > err * 0.8, 0);
  ball.serve = true; phase = 'play'; k.sfx('hit');
  const [px, py] = V(srv.x, srv.y); k.burst(px, py - 20 * SC, '#fff', 6, 110);
  if (hum && err < 0.12 && !sv.second && !PADEL) k.float('¡Saque perfecto!', px, py - 34 * SC, '#fff27a');
}
function nxt(t, f) { phase = 'pt'; phT = t; next = f; }
function pointTo(t, why) {
  if (phase !== 'play' && phase !== 'serve') return;
  rally = 0; firstPt = false; const won = sc.pts[t] + 1, lost = sc.pts[1 - t];
  const col = teamCol(t); k.sfx(humanTeam() === 1 - t && !k.party ? 'hurt' : 'coin');
  const [bx, by] = V(ball.x, ball.y); k.burst(bx, by, col, 14, 160);
  if (sc.tb) {
    sc.pts[t]++;
    if (sc.pts[t] >= 7 && sc.pts[t] - sc.pts[1 - t] >= 2) return gameTo(t, why, true);
    say(why, `Tie-break ${sc.pts[srvTeam()]}–${sc.pts[1 - srvTeam()]}`, col); return nxt(1.6, () => setServe(false));
  }
  sc.pts[t]++;
  if ((won >= 4 && won - lost >= 2) || (GOLD && won === 4 && lost === 3)) return gameTo(t, why);
  const a = sc.pts[0], b = sc.pts[1], st = srvTeam();
  let call;
  if (a >= 3 && b >= 3) call = a === b ? (GOLD ? 'Punto de oro' : 'Iguales') : 'Ventaja ' + shortName(a > b ? 0 : 1);
  else { const N = ['0', '15', '30', '40']; call = `${N[sc.pts[st]]}–${N[sc.pts[1 - st]]}`; if (sc.pts[st] === sc.pts[1 - st]) call = N[a] + ' iguales'; }
  say(why, call, col); nxt(1.6, () => setServe(false));
}
function gameTo(t, why, tbEnd) {
  sc.games[t]++; played++; sc.pts = [0, 0]; const col = teamCol(t);
  if (tbEnd || (sc.games[t] >= GAMES && sc.games[t] - sc.games[1 - t] >= 2)) return setTo(t, why);
  if (!sc.tb) { sc.srvIdx[sc.srvTeam] ^= 1; sc.srvTeam ^= 1; }
  if (sc.games[0] === GAMES && sc.games[1] === GAMES) { sc.tb = true; sc.tbT0 = sc.srvTeam; say(why, `Juego ${shortName(t)} · ¡Tie-break!`, col, 2); }
  else say(why, `Juego ${shortName(t)} · ${sc.games[0]}–${sc.games[1]}`, col, 2);
  k.sfx('win'); nxt(2, () => setServe(false));
}
function setTo(t, why) {
  sc.sets[t]++; sc.hist.push(sc.games.slice()); const wasTb = sc.tb; sc.games = [0, 0];
  if (wasTb) { sc.tb = false; sc.srvTeam = sc.tbT0 ^ 1; } else { sc.srvIdx[sc.srvTeam] ^= 1; sc.srvTeam ^= 1; }
  if (sc.sets[t] >= SETS) return finish(t);
  say(why, `Set para ${shortName(t)}`, teamCol(t), 2.2); k.sfx('win'); k.confetti(teamCol(t), 50); nxt(2.4, () => setServe(false));
}
function finish(t) {
  phase = 'end'; const ht = humanTeam(), hist = sc.hist.map((g) => `${g[0]}–${g[1]}`).join(' · ');
  const margin = sc.hist.reduce((a, g) => a + (g[t] - g[1 - t]), 0);
  const body = `<b style="color:${teamCol(0)}">${teamName(0)}</b> ${hist} <b style="color:${teamCol(1)}">${teamName(1)}</b>`;
  if (!k.party && ht >= 0) {
    if (t === ht) { lsSet(CPUK, Math.min(12, lsGet(CPUK, 0) + 1)); const b = k.best(CFG.id, margin); return k.win('¡Victoria!', teamCol(t), `${body}<br>Mejor victoria: +${b} juegos<br>Toca para la revancha`, margin); }
    lsSet(CPUK, Math.max(0, lsGet(CPUK, 0) - 0.5)); k.st = 'over'; k.sfx('lose'); return k.show('Derrota', `${body}<br>Toca para la revancha`);
  }
  k.win(`¡Gana ${teamName(t)}!`, teamCol(t), `${body}<br>Toca para la revancha`, margin);
}
function fault(why) {
  if (!sv.second) { say(why || 'Falta', 'Segundo saque', '#ffd166', 1.1); k.sfx('tick'); return nxt(1.1, () => setServe(true)); }
  pointTo(1 - sv.st, 'Doble falta');
}

/* ---------------- Bola ---------------- */
function launch(pl, tx, ty, v, spin, fixNet, lob) {
  const b = ball, g = G * (1 + 0.55 * spin), dx = tx - b.x, dy = ty - b.y, d = Math.max(0.5, hyp(dx, dy));
  let T = 1, vz = 0;
  if (lob) { vz = Math.sqrt(2 * g * Math.max(0.6, lob - b.z)); T = (vz + Math.sqrt(vz * vz + 2 * g * b.z)) / g; }
  else for (let i = 0; i < 16; i++) {
    T = d / v; vz = (g * T * T / 2 - b.z) / T; if (!fixNet || b.y * ty >= 0) break;
    const tn = T * b.y / (b.y - ty), zn = b.z + vz * tn - g * tn * tn / 2; if (zn > NETH + 0.25) break; v *= 0.92;
  }
  Object.assign(b, { vx: dx / T, vy: dy / T, vz, g, spin, last: pl.team, bounces: 0, serve: false, net: false, age: 0 });
  pver++; b.mark = null; const f = firstBounce(); b.mark = f; b.markOut = f && !PADEL && (Math.abs(f.x) > HW + 0.04 || Math.abs(f.y) > L + 0.04); b.read = Math.random() < 0.55 + 0.45 * skill;
}
/* un paso de física; ev(tipo, info) recibe 'net', 'floor', 'wall' {side, mesh}, 'outside' */
function stepBall(b, dt, ev) {
  const py = b.y;
  b.x += b.vx * dt; b.y += b.vy * dt; b.vz -= b.g * dt; b.z += b.vz * dt;
  if ((py > 0) !== (b.y > 0) && Math.abs(b.x) < HWD + 0.9 && b.z < NETH) {
    b.y = py > 0 ? 0.08 : -0.08; b.vy *= -0.12; b.vx *= 0.3; b.vz = Math.min(0, b.vz) * 0.3; b.net = true; if (ev) ev('net');
  }
  if (b.z <= 0 && b.vz < 0) {
    b.z = 0; b.vz = Math.max(1.2, -b.vz * (0.7 - 0.08 * b.spin)); const f = 0.8 + 0.1 * b.spin; b.vx *= f; b.vy *= f; b.spin *= 0.5; b.g = G * (1 + 0.55 * b.spin);
    if (ev) ev('floor');
  }
  if (PADEL) {
    const r = 0.1;
    if (Math.abs(b.x) > 5 - r) { const mesh = Math.abs(b.y) < 6;
      if (b.z > (mesh ? 3 : 3)) { if (ev) ev('outside'); b.vx *= 1; } else { b.x = Math.sign(b.x) * (5 - r); b.vx = -b.vx * (mesh ? 0.35 : 0.72); b.vy *= mesh ? 0.7 : 0.92; b.vz *= 0.9; if (ev) ev('wall', { side: b.y > 0 ? 0 : 1, mesh }); } }
    if (Math.abs(b.y) > 10 - r) { const mesh = b.z > 3;
      if (b.z > 4) { if (ev) ev('outside'); } else { b.y = Math.sign(b.y) * (10 - r); b.vy = -b.vy * (mesh ? 0.35 : 0.72); b.vx *= mesh ? 0.7 : 0.92; b.vz *= 0.9; if (ev) ev('wall', { side: b.y > 0 ? 0 : 1, mesh }); } }
  }
}
function firstBounce() { const b = Object.assign({}, ball); let f = null; for (let i = 0; i < 300 && !f; i++) stepBall(b, 1 / 60, (t) => { if (t === 'floor') f = { x: b.x, y: b.y }; if (t === 'outside') f = f || { x: b.x, y: b.y, gone: 1 }; }); return f; }
/* candidatos de golpeo del equipo t: puntos de la trayectoria a buena altura, en su campo, antes del segundo bote */
function predict(t) {
  if (pcache[t] && pcache[t].ver === pver) return pcache[t].c;
  const b = Object.assign({}, ball), s = sg(t), out = []; let nb = b.bounces, stop = false;
  const ev = (ty) => { if (ty === 'floor') { if (b.y * s > 0) nb++; else stop = true; if (nb >= 2) stop = true; } if (ty === 'outside') stop = true; };
  for (let i = 0; i < 240 && !stop; i++) { stepBall(b, 1 / 60, ev); if (stop) break;
    if (b.y * s > 0.4 && b.z > 0.2 && b.z < 1.75 && (nb >= 1 || (!ball.serve && Math.abs(b.y) < 5.5))) out.push({ x: b.x, y: b.y, z: b.z, t: (i + 1) / 60, bn: nb >= 1 }); }
  pcache[t] = { ver: pver, c: out }; return out;
}
function onEvent(type, info) {
  if (phase !== 'play') return;
  const [bx, by] = V(ball.x, ball.y);
  if (type === 'net') { k.sfx('click'); k.burst(bx, by - NETH * S * ZK, '#fff', 5, 80); pver++; return; }
  if (type === 'wall') { flashes.push({ x: ball.x, y: ball.y, z: ball.z, t: 0.35, mesh: info.mesh }); k.sfx('click'); pver++;
    if (ball.bounces === 0 && info.side !== ball.last) return ball.serve ? fault('Pared') : pointTo(1 - ball.last, 'Pared sin bote');
    if (ball.serve && ball.bounces === 1 && info.mesh) return fault('Malla');
    return; }
  if (type === 'outside') { return ball.bounces ? pointTo(ball.last, '¡Por fuera!') : ball.serve ? fault('Fuera') : pointTo(1 - ball.last, 'Fuera'); }
  if (type === 'floor') {
    pver++; marks.push({ x: ball.x, y: ball.y, t: 0.8 }); k.sfx('click');
    const side = ball.y > 0 ? 0 : 1;
    if (ball.bounces === 0) {
      if (side === ball.last) return ball.serve ? fault(ball.net ? 'Red' : 'Falta') : pointTo(1 - ball.last, ball.net ? 'Red' : 'Fallo');
      if (ball.serve) {
        const rs = sg(1 - ball.last), inb = ball.y * rs > 0 && ball.y * rs <= SVC + 0.05 && ball.x * sv.box >= -0.05 && Math.abs(ball.x) <= HWS + 0.05;
        if (!inb) return fault('Falta');
        if (ball.net) { say('Red', 'Se repite el saque', '#ffd166', 1); return nxt(1, () => setServe(sv.second)); }
      } else if (!PADEL && (Math.abs(ball.x) > HW + 0.05 || Math.abs(ball.y) > L + 0.05)) return pointTo(side, 'Fuera');
      ball.bounces = 1; return;
    }
    const ace = ball.serve;
    return pointTo(ball.last, ace ? '¡Ace!' : rally > 6 ? '¡Qué punto!' : 'Punto');
  }
}

/* ---------------- Golpes ---------------- */
function hittable(pl) {
  return phase === 'play' && ball.last !== pl.team && ball.y * sg(pl.team) > 0 && !(ball.serve && ball.bounces === 0) && ball.bounces <= 1 && ball.z < 2.7 && hyp(ball.x - pl.x, ball.y - pl.y) < REACH;
}
function lvl() { const lead = humanTeam() >= 0 ? sc.games[1 - humanTeam()] - sc.games[humanTeam()] : 0; return clamp(skill + Math.min(0.12, played * 0.02) - (lead >= 2 ? 0.12 : 0), 0.15, 0.92); }
function humanShot(pl, q, type) {
  const s = sg(pl.team), dq = q - 0.5, perf = Math.abs(dq) < 0.17, err = Math.max(0, Math.abs(dq) - 0.17) / 0.33, j = wdir(pl.ctl), fx = Math.sign(pl.x) || 1;
  let tx, ty = -s * L * (0.7 + k.rnd(-0.08, 0.08)), v, spin, lob = 0, word = null, wc = '#fff';
  if (type === 'block') { tx = k.rnd(-0.3, 0.3) * HW; ty = -s * L * 0.6; v = 10.5; spin = 0.1; }
  else if (type === 'b') { tx = j.x * HW * 0.5 + k.rnd(-0.4, 0.4); ty = -s * (L - 1.7); lob = PADEL ? 6.6 : 7.5; spin = -0.1; word = 'Globo'; }
  else if (ball.z > 1.85 && Math.abs(pl.y) < (PADEL ? 7 : 8)) { tx = j.x * HW * 0.6 - fx * HW * 0.3; ty = -s * L * 0.6; v = 22; spin = 0.3; word = '¡Remate!'; wc = '#ff9f68'; k.shake(4); }
  else if (perf) { tx = j.x ? j.x * HW * 0.72 : -fx * HW * 0.45; v = 18; spin = 0.6; word = '¡Perfecto!'; wc = '#fff27a'; }
  else if (dq > 0) { tx = -fx * HW * 0.7 + j.x * HW * 0.3; v = 14.5; spin = 0.4; word = 'Cruzado'; }
  else { tx = fx * HW * 0.62 + j.x * HW * 0.3; v = 13; spin = -0.45; word = 'Cortado'; }
  if (!perf && type !== 'block' && type !== 'b') { tx += k.rnd(-1, 1) * err * 1.8; ty += -s * k.rnd(-0.4, 1) * err * 2.6; }
  if (PADEL) v *= 0.72;
  v *= 1 + Math.min(0.2, rally * 0.015);
  launch(pl, tx, ty, v, spin, type === 'block' || perf || lob || Math.random() > err * 0.6, lob);
  hitFx(pl, word, wc);
}
function cpuShot(pl) {
  const s = sg(pl.team), e = lvl(), opp = team(1 - pl.team), ox = opp.reduce((a, o) => a + o.x, 0) / opp.length, oy = opp.reduce((a, o) => a + Math.abs(o.y), 0) / opp.length;
  let tx = -(Math.sign(ox) || (Math.random() < 0.5 ? 1 : -1)) * HW * k.rnd(0.3, 0.72), ty = -s * L * k.rnd(0.55, 0.82), v = (12 + 5 * e) * (firstPt ? 0.8 : 1), spin = k.rnd(-0.3, 0.6), lob = 0, word = null;
  if (ball.z > 1.85 && Math.abs(pl.y) < 7 && Math.random() < e) { v = PADEL ? 20 : 19; spin = 0.3; word = '¡Remate!'; ty = -s * L * 0.6; }
  else if (oy < 5 && Math.random() < (PADEL ? 0.55 : 0.35)) { lob = PADEL ? 6.4 : 7; ty = -s * (L - 1.8); spin = -0.1; word = 'Globo'; }
  const er = (1 - e) * 1.5; tx += k.rnd(-1, 1) * er; ty += -s * k.rnd(-0.5, 0.9) * er * 0.8;
  if (PADEL) v *= 0.72;
  v *= 1 + Math.min(0.2, rally * 0.015);
  launch(pl, tx, ty, v, spin, lob || Math.random() > 0.1 * (1 - e) + 0.02, lob);
  hitFx(pl, word, '#d8d0f0');
}
function hitFx(pl, word, col) {
  rally++; k.sfx('hit'); pl.sw = Math.max(pl.sw, SWT * 0.55); if (pl.swT === 'none') pl.swT = 'a';
  const [px, py] = V(ball.x, ball.y); k.burst(px, py - ball.z * S * ZK, '#fff', 6, 100);
  if (word) { const [x, y] = V(pl.x, pl.y); k.float(word, x, y - 34 * SC, col); }
  for (const o of P) if (o.team !== pl.team) o.react = Math.max(0.05, 0.32 - 0.2 * lvl());
}

/* ---------------- Movimiento ---------------- */
function home(pl) {
  const s = sg(pl.team), mine = ball.last === pl.team && phase === 'play';
  if (!DBL) return [clamp(ball.x * 0.35, -2, 2), s * (L + 0.5)];
  const side = (pl.i === 0 ? 1 : -1) * s;
  if (PADEL) return [side * 2.5, s * (mine ? 5 : 7.4)];
  return [side * 2.6, s * (mine ? L * 0.55 : L * 0.8)];
}
function planTeam(t) {
  const m = team(t), cpus = m.filter((pl) => pl.ctl < 0);
  if (!cpus.length) return;
  for (const pl of cpus) [pl.tx, pl.ty] = home(pl);
  if (phase !== 'play' || ball.last === t) return;
  const C = predict(t); if (!C.length) return;
  const e = lvl(), spd = PS * (0.66 + 0.3 * e);
  const opts = m.map((pl) => { let pick = null, worst = null; const net = Math.abs(pl.y) < 5;
    for (let i = 0; i < C.length; i += 2) { const cd = C[i]; if (!cd.bn && !net) continue; const need = Math.max(0, hyp(cd.x - pl.x, cd.y - pl.y) - REACH * 0.6), slack = cd.t - need / (pl.ctl >= 0 ? PS : spd) - pl.react;
      if (slack >= 0) { pick = cd; break; } if (!worst || slack > worst.slack) worst = { cd, slack }; }
    return { pl, cd: pick || (worst && worst.cd), ok: !!pick, score: pick ? pick.t : worst ? 100 - worst.slack : 1e9 }; });
  /* en dobles cada uno cubre su mitad (derecha i=0, izquierda i=1); solo invade la del compañero si este no llega */
  const mine = (o) => !DBL || !o.cd || o.cd.x * (o.pl.i === 0 ? 1 : -1) * sg(t) >= -0.6;
  let best = null;
  for (const o of opts) { if (!o.cd) continue; const other = opts.find((q) => q !== o), oOk = other && other.ok && mine(other);
    const v = o.score + (mine(o) ? 0 : oOk ? 50 : 3); if (!best || v < best.v) best = Object.assign({ v }, o); }
  if (!best) return;
  if (best.pl.ctl >= 0) { // el humano va a por ella: el compañero CPU cubre su mitad
    return; }
  if (ball.markOut && ball.bounces === 0 && ball.read && !PADEL) return; // la deja: va fuera
  best.pl.tx = best.cd.x - (Math.sign(best.cd.x - best.pl.x) || 0) * 0.2; best.pl.ty = best.cd.y;
  best.pl.chase = true;
}
function movePlayers(dt) {
  planT -= dt; if (planT <= 0) { planT = 0.1; P.forEach((pl) => { pl.chase = false; }); planTeam(0); planTeam(1); }
  const srv = phase === 'serve' ? server() : null;
  for (const pl of P) {
    pl.react = Math.max(0, pl.react - dt); pl.cool = Math.max(0, pl.cool - dt);
    let dx = 0, dy = 0, sp = PS;
    if (pl === srv) { pl.vx = pl.vy = 0; continue; }
    if (pl.ctl >= 0) { const d = wdir(pl.ctl); dx = d.x; dy = d.y;
      if (!k.party && pl.ctl === 0 && k.ptr.down && phase !== 'serve') { const [wx, wy] = toW(k.ptr.x, k.ptr.y), ex = wx - pl.x, ey = wy - pl.y, m = hyp(ex, ey); if (m > 0.3) { dx = ex / m * Math.min(1, m); dy = ey / m * Math.min(1, m); } } }
    else { const ex = pl.tx - pl.x, ey = pl.ty - pl.y, m = hyp(ex, ey); sp = PS * (0.66 + 0.3 * lvl()) * (pl.chase ? 1 : 0.7); if (m > 0.08 && pl.react <= 0) { dx = ex / m * Math.min(1, m / 0.6); dy = ey / m * Math.min(1, m / 0.6); } }
    const f = Math.min(1, dt * 14); pl.vx += (dx * sp - pl.vx) * f; pl.vy += (dy * sp - pl.vy) * f;
    pl.x += pl.vx * dt; pl.y += pl.vy * dt; const s = sg(pl.team);
    if (PADEL) { pl.x = clamp(pl.x, -4.7, 4.7); pl.y = s * clamp(pl.y * s, 0.45, 9.7); } else { pl.x = clamp(pl.x, -AX + 0.4, AX - 0.4); pl.y = s * clamp(pl.y * s, 0.5, AY - 0.4); }
    pl.anim += hyp(pl.vx, pl.vy) * dt;
  }
}
let planT = 0;
function strokes(dt) {
  for (const pl of P) {
    if (pl.sw >= 0) { pl.sw += dt; if (pl.sw > SWT) { pl.sw = -1; pl.cool = 0.15; } }
    if (phase !== 'play') continue;
    if (pl.ctl >= 0) {
      const hitA = k.phit(pl.ctl, 'a') || (!k.party && pl.ctl === 0 && k.ptr.hit), hitB = k.phit(pl.ctl, 'b');
      if ((hitA || hitB) && pl.sw < 0 && pl.cool <= 0) { pl.sw = 0; pl.swT = hitB ? 'b' : 'a'; k.sfx('click'); }
      if (pl.sw >= 0 && pl.sw <= SWT && hittable(pl)) { humanShot(pl, pl.sw / SWT, pl.swT); pl.sw = Math.max(pl.sw, SWT * 0.55); continue; }
      if (pl.sw < 0 && pl.cool <= 0 && ball.bounces === 1 && hittable(pl) && hyp(ball.x - pl.x, ball.y - pl.y) < REACH * 0.8 && ball.z < 1.9) { pl.sw = SWT * 0.4; pl.swT = 'a'; humanShot(pl, 0.5, 'block'); }
    } else if (hittable(pl) && hyp(ball.x - pl.x, ball.y - pl.y) < REACH * 0.95) {
      const net = Math.abs(pl.y) < 5.5;
      if (ball.bounces === 0 && !net && ball.z < 1.85) continue; // desde el fondo espera al bote
      if (ball.bounces === 0 && ball.markOut && ball.read && !PADEL) continue; // la deja pasar: va fuera
      pl.sw = 0.001; pl.swT = 'a'; cpuShot(pl);
    }
  }
}
function serveUpdate(dt) {
  const srv = server(), hum = srv.ctl >= 0; sv.t += dt; sv.wait += dt;
  const s = sg(srv.team);
  if (sv.stage === 'hold') {
    ball.x = srv.x + 0.3 * s; ball.y = srv.y - 0.25 * s; ball.z = 1; ball.vz = 0;
    const go = hum ? k.phit(srv.ctl, 'a') || k.phit(srv.ctl, 'b') || (!k.party && srv.ctl === 0 && k.ptr.hit) || (!!k.party && sv.wait > 5) : sv.t > (firstPt ? 1.6 : 1.1);
    if (!go) return;
    if (PADEL) { srv.sw = 0.01; srv.swT = 'a'; ball.z = 0.7; return doServe(srv, hum ? (sv.wait > 5 && k.party ? 0.3 : k.rnd(0, 0.15)) : k.rnd(0, 0.5 * (1 - lvl()) + 0.05) * (sv.second ? 0.3 : 1)); }
    sv.stage = 'toss'; sv.t = 0; ball.vz = 5.2; ball.z = 1.2; k.sfx('click');
    sv.cpuHit = 0.53 + k.rnd(-1, 1) * (sv.second ? 0.06 : 0.3 * (1 - lvl()) + 0.03); sv.auto = hum && !!k.party && sv.wait > 5;
    return;
  }
  ball.vz -= G * dt; ball.z += ball.vz * dt;
  const trig = hum ? (sv.auto ? sv.t >= 0.45 : k.phit(srv.ctl, 'a') || k.phit(srv.ctl, 'b') || (!k.party && srv.ctl === 0 && k.ptr.hit)) : sv.t >= sv.cpuHit;
  if (trig) { srv.sw = SWT * 0.3; srv.swT = 'a'; const err = Math.min(1, Math.abs(sv.t - 0.53) / 0.45) * (sv.second ? 0.4 : 1); return doServe(srv, err); }
  if (ball.z < 1.1 && ball.vz < 0) { sv.stage = 'hold'; sv.t = 0; sv.wait = Math.min(sv.wait, 3); }
}

reset(); k.show(CFG.title, CFG.help || 'Muévete con las flechas y pulsa A para golpear. B lanza un globo.');

k.run((dt) => {
  tm += dt; msgT -= dt; marks = marks.filter((m) => (m.t -= dt) > 0); flashes = flashes.filter((f) => (f.t -= dt) > 0);
  if (!k.gate(reset)) return;
  if (cdPend) { cdPend = false; k.count(3); }
  if (k.counting() || phase === 'end') return;
  dt = Math.min(dt, 1 / 30);
  movePlayers(dt);
  if (phase === 'serve') { strokes(dt); return serveUpdate(dt); }
  if (phase === 'pt') { strokes(dt); stepBall(ball, dt, null); phT -= dt; if (phT <= 0) { const f = next; next = null; if (f) f(); } return; }
  const n = 3, h = dt / n; ball.age += dt;
  for (let i = 0; i < n && phase === 'play'; i++) stepBall(ball, h, onEvent);
  if (phase === 'play' && ball.age > 14) pointTo(1 - ball.last, 'Bola perdida');
  strokes(dt);
}, draw);

/* ---------------- Dibujo ---------------- */
const COURT = mk(W, H, (g) => {
  g.fillStyle = PADEL ? '#101a30' : '#1b3a28'; g.fillRect(0, 0, W, H);
  g.save(); worldT(g);
  const lw = 0.09;
  if (!PADEL) {
    g.fillStyle = '#3d7d52'; g.fillRect(-AX, -AY, AX * 2, AY * 2);
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let y = -AY; y < AY; y += 1.4) g.fillRect(-AX, y, AX * 2, 0.7);
    g.fillStyle = '#2f68b4'; g.fillRect(-HWD - 0.6, -L - 1.2, (HWD + 0.6) * 2, (L + 1.2) * 2);
    const gr = g.createLinearGradient(-HWD, -L, HWD, L); gr.addColorStop(0, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(0,0,0,.08)'); g.fillStyle = gr; g.fillRect(-HWD - 0.6, -L - 1.2, (HWD + 0.6) * 2, (L + 1.2) * 2);
    g.strokeStyle = '#fff'; g.lineWidth = lw;
    g.strokeRect(-HWD, -L, HWD * 2, L * 2); g.beginPath(); g.moveTo(-HWS, -L); g.lineTo(-HWS, L); g.moveTo(HWS, -L); g.lineTo(HWS, L);
    g.moveTo(-HWS, -SVC); g.lineTo(HWS, -SVC); g.moveTo(-HWS, SVC); g.lineTo(HWS, SVC); g.moveTo(0, -SVC); g.lineTo(0, SVC);
    g.moveTo(0, -L); g.lineTo(0, -L + 0.3); g.moveTo(0, L); g.lineTo(0, L - 0.3); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-HWD - 0.9, 0.05, (HWD + 0.9) * 2, 0.35);
  } else {
    g.fillStyle = '#2767c9'; g.fillRect(-5, -10, 10, 20);
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let x = -5; x < 5; x += 0.5) g.fillRect(x, -10, 0.25, 20);
    g.strokeStyle = '#fff'; g.lineWidth = lw; g.beginPath(); g.moveTo(-5, -SVC); g.lineTo(5, -SVC); g.moveTo(-5, SVC); g.lineTo(5, SVC); g.moveTo(0, -SVC - 0.2); g.lineTo(0, SVC + 0.2); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-5, 0.05, 10, 0.3);
    // paredes: cristal al fondo y 4 m laterales, malla en el resto
    const T = 0.28;
    const glass = (x, y, w, h) => { g.fillStyle = 'rgba(170,220,255,.38)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.05; g.strokeRect(x, y, w, h); };
    const mesh = (x, y, w, h) => { g.fillStyle = '#2b3350'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(200,210,240,.45)'; g.lineWidth = 0.03; g.beginPath(); for (let q = 0; q < Math.max(w, h); q += 0.22) { if (w > h) { g.moveTo(x + q, y); g.lineTo(x + q + h, y + h); } else { g.moveTo(x, y + q); g.lineTo(x + w, y + q + w); } } g.stroke(); };
    glass(-5 - T, -10 - T, 10 + T * 2, T); glass(-5 - T, 10, 10 + T * 2, T);
    for (const sx of [-5 - T, 5]) { glass(sx, -10, T, 4); glass(sx, 6, T, 4); mesh(sx, -6, T, 12); }
    g.fillStyle = '#1a1530'; for (const sx of [-5 - T, 5]) for (const y of [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10]) g.fillRect(sx, y - 0.08, T, 0.16);
    for (const sy of [-10 - T, 10]) for (const x of [-5, -2.5, 0, 2.5, 5]) g.fillRect(x - 0.08, sy, 0.16, T);
    g.strokeStyle = OUT; g.lineWidth = 0.08; g.strokeRect(-5 - T, -10 - T, 10 + T * 2, 20 + T * 2);
  }
  g.restore();
});
function drawNet() {
  const nx = PADEL ? 5 : HWD + 0.9, [ax, ay] = V(-nx, 0), [bx, by] = V(nx, 0), hh = NETH * S * ZK;
  if (VERT) {
    c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(ax, ay - hh, bx - ax, hh);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); for (let x = ax; x < bx; x += 5) { c.moveTo(x, ay - hh); c.lineTo(x, ay); } c.stroke();
    ART.rr(c, ax - 2, ay - hh - 3, bx - ax + 4, 4, 2); ART.fillOut(c, '#fff', 1.5);
    for (const x of [ax - 4, bx]) { ART.rr(c, x, ay - hh - 5, 5, hh + 6, 2); ART.fillOut(c, '#3a3f5c', 1.5); }
  } else {
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(ax - 2, ay - hh, 4, by - ay + hh);
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1; c.beginPath(); for (let y = ay; y < by; y += 5) { c.moveTo(ax - 2, y - hh); c.lineTo(ax + 2, y); } c.stroke();
    ART.rr(c, ax - 2, ay - hh - 2, 4, by - ay + 4, 2); ART.fillOut(c, '#fff', 1.2);
    for (const y of [ay - 4, by]) { ART.rr(c, ax - 3, y - hh, 6, hh + 5, 2); ART.fillOut(c, '#3a3f5c', 1.5); }
  }
}
function drawPlayer(pl) {
  const [x, y] = V(pl.x, pl.y), s = sg(pl.team), col = k.pcol(pl.slot), [fx, fy] = V(pl.x, pl.y - s), a = Math.atan2(fy - y, fx - x), sc = SC * 1.05;
  const moving = hyp(pl.vx, pl.vy) > 0.5, sw = moving ? Math.sin(pl.anim * 5) * 4 : 0;
  ART.shadow(c, x + 2, y + 8 * sc, 13 * sc, 0.3);
  if (pl.ctl >= 0 && k.party) { c.beginPath(); c.ellipse(x, y + 3 * sc, 17 * sc, 12 * sc, 0, 0, TAU); c.lineWidth = 3; c.strokeStyle = col; c.stroke(); }
  c.save(); c.translate(x, y); c.rotate(a); c.scale(sc, sc);
  c.fillStyle = '#f4f4f8'; for (const q of [-1, 1]) { c.beginPath(); c.ellipse(q * sw * 0.8 - 1, q * 6, 5, 3.4, 0, 0, TAU); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); }
  // brazo y raqueta (mano derecha = +y local)
  let ph = 0.7; if (pl.sw >= 0) { const q = clamp(pl.sw / SWT, 0, 1), e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2; ph = pl.swT === 'b' ? 2.4 - 3 * e : 2.3 - 3.5 * e; }
  const hx = Math.cos(ph) * 12, hy = 7 + Math.sin(ph) * 8;
  c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 8); c.lineTo(hx * 0.8, hy); c.stroke(); c.strokeStyle = pl.skin; c.lineWidth = 3; c.stroke();
  c.save(); c.translate(hx * 0.8, hy); c.rotate(ph);
  c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(9, 0); c.stroke(); c.strokeStyle = PADEL ? '#222' : '#c98a4b'; c.lineWidth = 2.2; c.stroke();
  if (PADEL) { ART.rr(c, 8, -6.5, 14, 13, 6); ART.fillOut(c, col, 1.8); c.fillStyle = 'rgba(26,21,48,.45)'; for (const [u, v] of [[12, -2.5], [16, -2.5], [12, 2.5], [16, 2.5], [19, 0]]) { c.beginPath(); c.arc(u, v, 1, 0, TAU); c.fill(); } }
  else { c.beginPath(); c.ellipse(15, 0, 7.5, 6, 0, 0, TAU); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 0.7; c.beginPath(); for (let u = 10; u <= 20; u += 2.5) { c.moveTo(u, -5); c.lineTo(u, 5); } for (let v = -4; v <= 4; v += 2.5) { c.moveTo(8.5, v); c.lineTo(21.5, v); } c.stroke(); c.beginPath(); c.ellipse(15, 0, 7.5, 6, 0, 0, TAU); c.lineWidth = 1.4; c.strokeStyle = col; c.stroke(); }
  c.restore();
  c.beginPath(); c.arc(-1, -9, 3.6, 0, TAU); c.fillStyle = pl.skin; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
  c.beginPath(); c.ellipse(0, 0, 8.5, 11, 0, 0, TAU); const gr = c.createLinearGradient(-8, -11, 8, 11); gr.addColorStop(0, lite(col, 0.3)); gr.addColorStop(1, dark(col, 0.2)); c.fillStyle = gr; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
  c.beginPath(); c.arc(1, 0, 7, 0, TAU); c.fillStyle = pl.hair; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
  c.beginPath(); c.arc(1, 0, 7, -0.6, 0.6); c.lineTo(1, 0); c.fillStyle = '#fff'; c.fill(); // visera / cinta
  c.beginPath(); c.arc(4, 0, 3.6, -1.2, 1.2); c.fillStyle = pl.skin; c.fill();
  c.restore();
  label(nameOf(pl), x, y - 22 * sc - 4, k.party ? 15 : 11, pl.ctl >= 0 ? col : '#d8d0f0');
}
function drawBall() {
  const [x, y] = V(ball.x, ball.y), r = Math.max(4.5, 0.2 * S), zz = ball.z * S * ZK;
  ART.shadow(c, x + 1, y + 1, r * (1 - Math.min(0.4, ball.z / 10)), 0.35);
  c.save(); c.translate(x, y - zz);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); const gr = c.createRadialGradient(-r * 0.4, -r * 0.4, 0.5, 0, 0, r); gr.addColorStop(0, '#f6ffb0'); gr.addColorStop(1, '#b9d42a'); c.fillStyle = gr; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1; c.beginPath(); c.arc(-r * 0.9, 0, r * 0.8, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(r * 0.9, 0, r * 0.8, Math.PI - 0.9, Math.PI + 0.9); c.stroke();
  c.restore();
}
function drawHud() {
  c.fillStyle = 'rgba(16,12,34,.92)'; c.fillRect(0, 0, W, HUD); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(0, HUD - 2, W, 2);
  const rows = VERT ? [20, 46] : [14, 34], fs = VERT ? 16 : 14, st = srvTeam(), bw = VERT ? W - 16 : 420, x0 = 8;
  ART.rr(c, x0, 4, bw, HUD - 8, 8); c.fillStyle = 'rgba(255,255,255,.05)'; c.fill();
  const cp = x0 + bw - 36, cg = cp - 40;
  for (let t = 0; t < 2; t++) { const y = rows[t], col = teamCol(t);
    ART.rr(c, x0 + 8, y - 6, 12, 12, 3); ART.fillOut(c, col, 1.5);
    label(teamName(t), x0 + 26, y, fs, col, 'left');
    if (st === t && (phase === 'serve' || phase === 'play')) { c.beginPath(); c.arc(cg - 34, y, 5, 0, TAU); ART.fillOut(c, '#d9f24a', 1.5); }
    sc.hist.forEach((g, i) => label(String(g[t]), cg - 60 - (sc.hist.length - 1 - i) * 18, y, fs - 2, '#9f98c8'));
    label(String(sc.games[t]), cg, y, fs + 1, '#fff');
    ART.rr(c, cp - 20, y - 10, 42, 20, 5); c.fillStyle = '#6e62f5'; c.fill();
    const a = sc.pts[t], b = sc.pts[1 - t];
    const pt = sc.tb ? String(a) : a >= 3 && b >= 3 ? (a > b ? 'AD' : '40') : ['0', '15', '30', '40'][Math.min(3, a)];
    label(pt, cp + 1, y, fs, '#fff');
  }
  if (!VERT) { label(sc.tb ? 'Tie-break a 7' : `Set a ${GAMES} juegos${GOLD ? ' · punto de oro' : ''}`, (x0 + bw + W) / 2 + 4, HUD / 2, 12, '#9f98c8'); }
}
function draw() {
  c.drawImage(COURT, 0, 0, W, H);
  for (const m of marks) { const [x, y] = V(m.x, m.y); c.globalAlpha = m.t / 0.8 * 0.7; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, 7 * SC + (0.8 - m.t) * 8, 3.5 * SC + (0.8 - m.t) * 4, 0, 0, TAU); c.stroke(); } c.globalAlpha = 1;
  for (const f of flashes) { const [x, y] = V(f.x, f.y); c.globalAlpha = f.t / 0.35; c.fillStyle = f.mesh ? '#c8d0ff' : '#e8f8ff'; c.beginPath(); c.arc(x, y - f.z * S * ZK, 10 + (0.35 - f.t) * 40, 0, TAU); c.fill(); } c.globalAlpha = 1;
  // marca de bote previsto (ayuda) si la bola va hacia un equipo con humanos
  if (phase === 'play' && ball.mark && ball.bounces === 0 && !ball.mark.gone && team(1 - ball.last).some((pl) => pl.ctl >= 0)) { const [x, y] = V(ball.mark.x, ball.mark.y), p = 0.6 + 0.4 * Math.sin(tm * 12); c.globalAlpha = 0.45 * p; c.strokeStyle = '#fff27a'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 8 * SC, 4 * SC, 0, 0, TAU); c.stroke(); c.globalAlpha = 1; }
  const objs = P.map((pl) => ({ y: V(pl.x, pl.y)[1], f: () => drawPlayer(pl), back: pl.y < 0 }));
  objs.push({ y: V(ball.x, ball.y)[1] + 0.1, f: drawBall, back: ball.y < 0 });
  objs.sort((a, b) => a.y - b.y);
  if (VERT) { objs.filter((o) => o.back).forEach((o) => o.f()); drawNet(); objs.filter((o) => !o.back).forEach((o) => o.f()); }
  else { drawNet(); objs.forEach((o) => o.f()); }
  // indicaciones de saque
  if (phase === 'serve' && k.st === 'play' && !k.counting()) { const srv = server(); if (srv.ctl >= 0) { const [x, y] = V(srv.x, srv.y), up = VERT && srv.team === 0 ? -1 : 1;
    const t = PADEL || sv.stage === 'hold' ? (k.party ? 'A para sacar' : 'A o toca para sacar') : '¡A otra vez para golpear!';
    label(t, clamp(x, 90, W - 90), clamp(y + up * 44 * SC, HUD + 16, H - 14), 14, '#fff27a'); } }
  drawHud();
  if (msgT > 0 && k.st === 'play') { const a = Math.min(1, msgT / 0.3), s = msgT > 1.3 ? 1 + (msgT - 1.3) * 0.8 : 1; c.save(); c.globalAlpha = a; c.translate(W / 2, CY - (VERT ? 60 : 20)); c.scale(s, s);
    label(msg, 0, 0, VERT ? 34 : 38, msgC); if (msg2) label(msg2, 0, VERT ? 36 : 38, VERT ? 22 : 24, '#fff'); c.restore(); }
}
