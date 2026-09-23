/* Battle Grid (hundir la flota) contra la IA, con arte propio.
 * Mar animado, radar con barrido, barcos dibujados, proyectiles con salpicadura o explosión y turno de la IA visible (mira que apunta). */
const OUT = ART.OUT, R2 = 6.2832, W = 480, H = 640;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#0e2238' }), c = k.ctx, N = 10, S = 34;
const SHIPS = [5, 4, 3, 3, 2], NAMES = ['Portaaviones', 'Acorazado', 'Crucero', 'Submarino', 'Destructor'];
const EX = 70, EY = 66, MX = 26, MY = 470, MS = 16;
let mine, theirs, myShips, theirShips, myShots, aiShots, turn, msg, aiT, targets, wins, placing, shells, fxs, cur, kbd, fired, aim, tt = 0, bgCv, msgT, lastAim;

function fleet() {
  const g = Array.from({ length: N }, () => Array(N).fill(-1)), ships = [];
  SHIPS.forEach((len, id) => { while (true) { const h = Math.random() < 0.5, x = k.ri(0, h ? N - len : N - 1), y = k.ri(0, h ? N - 1 : N - len); const cells = Array.from({ length: len }, (_, i) => [x + (h ? i : 0), y + (h ? 0 : i)]); if (cells.every(([cx, cy]) => g[cy][cx] === -1)) { cells.forEach(([cx, cy]) => (g[cy][cx] = id)); ships.push({ id, len, x, y, h }); break; } } });
  return { g, ships };
}
function sunk(g, shots, id) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === id && !shots[y][x]) return false; return true; }
function allSunk(g, shots) { return SHIPS.every((_, id) => sunk(g, shots, id)); }
function newMine() { const f = fleet(); mine = f.g; myShips = f.ships; }
function build() { newMine(); const f = fleet(); theirs = f.g; theirShips = f.ships; myShots = Array.from({ length: N }, () => Array(N).fill(0)); aiShots = Array.from({ length: N }, () => Array(N).fill(0)); turn = 'me'; say('Dispara al radar enemigo'); targets = []; shells = []; fxs = []; cur = [4, 4]; kbd = false; fired = 0; aim = null; lastAim = null; placing = true; }
function reset() { if (wins === undefined) wins = 0; build(); }
function say(t) { msg = t; msgT = 0.35; }
const ecell = (x, y) => [EX + x * S + S / 2, EY + y * S + S / 2], mcell = (x, y) => [MX + x * MS + MS / 2, MY + y * MS + MS / 2];

/* IA: remata en línea los impactos abiertos; si no hay, caza en damero */
function aiPick() {
  const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !aiShots[y][x], hits = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (aiShots[y][x] && mine[y][x] >= 0 && !sunk(mine, aiShots, mine[y][x])) hits.push([x, y]);
  if (hits.length) { let cand = [], bw = 0;
    for (const [x, y] of hits) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let nx = x + dx, ny = y + dy; const line = hits.some(([a, b]) => a === x - dx && b === y - dy); if (!free(nx, ny)) continue; const w = line ? 3 : 1; if (w > bw) { bw = w; cand = []; } if (w === bw) cand.push([nx, ny]); }
    if (cand.length) return k.pick(cand); }
  let cand = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (free(x, y) && (x + y) % 2 === 0) cand.push([x, y]);
  if (!cand.length) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (free(x, y)) cand.push([x, y]);
  return k.pick(cand);
}
function fireAt(x, y) { if (myShots[y][x] || shells.length) return; placing = false; fired++; const [cx, cy] = ecell(x, y); shells.push({ who: 'me', x, y, cx, cy, t: 0, dur: 0.42 }); k.sfx('shoot'); say('¡Fuego!'); }
function land(sh) {
  const me = sh.who === 'me', g = me ? theirs : mine, shots = me ? myShots : aiShots, cs = me ? S : MS; shots[sh.y][sh.x] = 1; const id = g[sh.y][sh.x];
  if (id >= 0) { k.burst(sh.cx, sh.cy, '#ffb13d', me ? 18 : 10, me ? 170 : 100); k.burst(sh.cx, sh.cy, '#5a5470', 6, 60); fxs.push({ k: 'boom', x: sh.cx, y: sh.cy, r: cs, life: 0.45, max: 0.45 }); k.sfx('explode'); k.shake(me ? 5 : 7);
    const s = sunk(g, shots, id);
    if (me) { say(s ? `¡Hundido! ${NAMES[id]} (${SHIPS[id]})` : '¡Tocado!'); if (s) { k.float('¡Hundido!', EX + S * 5, EY + S * 5, '#ffd23d'); k.sfx('coin'); } }
    else { say(s ? `La IA hundió tu ${NAMES[id].toLowerCase()}` : 'La IA te ha dado'); navigator.vibrate && navigator.vibrate(60); }
    if (allSunk(g, shots)) { k.st = 'over'; if (me) { wins++; k.sfx('win'); k.confetti(); k.show('¡Victoria!', `${fired} disparos · Racha: ${wins} · Récord ${k.best(CFG.id, wins)}<br>Toca para otra partida`); } else { k.show('Flota hundida', `Racha: ${wins} · Récord ${k.best(CFG.id, wins)}<br>Toca para otra partida`); k.sfx('lose'); wins = 0; } return; }
  } else { fxs.push({ k: 'splash', x: sh.cx, y: sh.cy, r: cs, life: 0.5, max: 0.5 }); k.burst(sh.cx, sh.cy, '#cfeeff', me ? 10 : 6, me ? 110 : 70); k.sfx('pop'); say(me ? 'Agua' : 'La IA falló. Tu turno'); }
  if (me) { turn = 'ai'; aiT = 0.4; aim = null; } else { turn = 'me'; if (id >= 0) say(msg + '. Tu turno'); }
}

reset();
k.show(CFG.title, 'Toca el radar de arriba para disparar. Hunde los 5 barcos enemigos antes de que hundan los tuyos. Teclado: flechas y A.');

k.run((dt) => {
  if (!k.gate(reset)) return;
  tt += dt; msgT = Math.max(0, msgT - dt);
  for (const e of fxs) e.life -= dt; fxs = fxs.filter((e) => e.life > 0);
  for (const sh of shells) { sh.t += dt; if (sh.t >= sh.dur) { sh.dead = true; land(sh); } } shells = shells.filter((s) => !s.dead);
  if (k.st !== 'play') return;
  if (turn === 'ai') { // la mira de la IA se desplaza hasta el objetivo y dispara
    if (shells.length) return; aiT -= dt; if (aiT > 0) return;
    if (!aim) { const [x, y] = aiPick(), [fx, fy] = lastAim || mcell(4.5, 4.5); aim = { x, y, fx, fy, t: 0 }; say('La IA apunta…'); }
    aim.t += dt / 0.6; if (aim.t < 1) return;
    const [cx, cy] = mcell(aim.x, aim.y); shells.push({ who: 'ai', x: aim.x, y: aim.y, cx, cy, t: 0, dur: 0.35 }); k.sfx('shoot'); aim.fired = true; lastAim = [cx, cy]; turn = 'wait'; return;
  }
  if (turn === 'wait') { if (!shells.length && turn === 'wait') turn = 'me'; return; }
  if (shells.length) return;
  const dir = k.hit.has('left') ? [-1, 0] : k.hit.has('right') ? [1, 0] : k.hit.has('up') ? [0, -1] : k.hit.has('down') ? [0, 1] : null;
  if (dir) { kbd = true; cur = [k.clamp(cur[0] + dir[0], 0, N - 1), k.clamp(cur[1] + dir[1], 0, N - 1)]; k.sfx('click'); }
  if (k.hit.has('a')) { kbd = true; if (!myShots[cur[1]][cur[0]]) fireAt(cur[0], cur[1]); }
  if (!k.ptr.hit) return; kbd = false;
  if (placing && k.ptr.x > 250 && k.ptr.y > H - 52) { newMine(); k.sfx('click'); say('Flota recolocada'); return; }
  const x = Math.floor((k.ptr.x - EX) / S), y = Math.floor((k.ptr.y - EY) / S); if (x < 0 || y < 0 || x >= N || y >= N) return;
  cur = [x, y]; if (myShots[y][x]) { k.sfx('hurt'); say('Ya disparaste ahí'); return; } fireAt(x, y);
}, draw);

/* ---------- Dibujo ---------- */
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function bake() {
  bgCv = document.createElement('canvas'); bgCv.width = W * 2; bgCv.height = H * 2; const g = bgCv.getContext('2d'); g.scale(2, 2);
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#123a5e'); gr.addColorStop(0.55, '#0e2f4f'); gr.addColorStop(1, '#0a2440'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(160,210,255,.07)'; g.lineWidth = 2; for (let i = 0; i < 70; i++) { const x = rnd(i) * W, y = rnd(i + 3) * H, w = 10 + rnd(i + 7) * 24; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 4, x + w, y); g.stroke(); }
  // radar enemigo
  ART.rr(g, EX - 8, EY - 8, N * S + 16, N * S + 16, 12); ART.fillOut(g, '#2c3e55', 3);
  gr = g.createRadialGradient(EX + N * S / 2, EY + N * S / 2, 20, EX + N * S / 2, EY + N * S / 2, N * S * 0.75); gr.addColorStop(0, '#0f4a5e'); gr.addColorStop(1, '#0a2c40'); g.fillStyle = gr; g.fillRect(EX, EY, N * S, N * S);
  g.strokeStyle = 'rgba(120,230,210,.22)'; g.lineWidth = 1; for (let i = 0; i <= N; i++) { g.beginPath(); g.moveTo(EX + i * S + 0.5, EY); g.lineTo(EX + i * S + 0.5, EY + N * S); g.moveTo(EX, EY + i * S + 0.5); g.lineTo(EX + N * S, EY + i * S + 0.5); g.stroke(); }
  g.strokeStyle = 'rgba(120,230,210,.12)'; g.lineWidth = 1.5; for (let r = 1; r <= 3; r++) { g.beginPath(); g.arc(EX + N * S / 2, EY + N * S / 2, r * N * S / 6.5, 0, R2); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.2)'; for (let i = 0; i < 4; i++) g.fillRect([EX - 4, EX + N * S, EX - 4, EX + N * S][i], [EY - 4, EY - 4, EY + N * S, EY + N * S][i], 4, 4);
  g.font = '800 12px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#8fc6e0';
  for (let i = 0; i < N; i++) { g.fillText('ABCDEFGHIJ'[i], EX + i * S + S / 2, EY - 18); g.fillText(String(i + 1), EX - 22, EY + i * S + S / 2); }
  // mar propio
  ART.rr(g, MX - 5, MY - 5, N * MS + 10, N * MS + 10, 8); ART.fillOut(g, '#2c3e55', 2.5);
  gr = g.createLinearGradient(0, MY, 0, MY + N * MS); gr.addColorStop(0, '#2a7fb8'); gr.addColorStop(1, '#1d5f92'); g.fillStyle = gr; g.fillRect(MX, MY, N * MS, N * MS);
  g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1; for (let i = 0; i <= N; i++) { g.beginPath(); g.moveTo(MX + i * MS + 0.5, MY); g.lineTo(MX + i * MS + 0.5, MY + N * MS); g.moveTo(MX, MY + i * MS + 0.5); g.lineTo(MX + N * MS, MY + i * MS + 0.5); g.stroke(); }
  // panel derecho
  ART.rr(g, 212, MY - 5, W - 226, N * MS + 10, 10); ART.fillOut(g, '#1b3350', 2.5);
}
/* barco visto desde arriba; cs = tamaño de casilla */
function ship(sh, ox, oy, cs, st) {
  const L = sh.len * cs; c.save(); c.translate(ox + sh.x * cs, oy + sh.y * cs); if (!sh.h) { c.translate(cs, 0); c.rotate(Math.PI / 2); }
  const w = cs * 0.72, y0 = (cs - w) / 2, pad = cs * 0.1, hull = st === 'sunk' ? '#4a4458' : '#9aa3b5', deck = st === 'sunk' ? '#5d5670' : '#c7cedc';
  if (st !== 'sunk') { c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(pad, cs / 2, cs * 0.25, w * 0.55, 0, 0, R2); c.fill(); }
  c.beginPath(); c.moveTo(pad, y0 + 3); c.lineTo(L - cs * 0.55, y0); c.quadraticCurveTo(L - pad * 0.5, cs / 2, L - cs * 0.55, y0 + w); c.lineTo(pad, y0 + w - 3); c.quadraticCurveTo(pad - 3, cs / 2, pad, y0 + 3); c.closePath(); ART.fillOut(c, hull, cs > 20 ? 2.2 : 1.6);
  ART.rr(c, pad + 3, y0 + w * 0.22, L - cs * 0.9, w * 0.56, w * 0.2); c.fillStyle = deck; c.fill();
  // superestructura y torretas
  const bx = pad + (sh.len - 1) * cs * 0.4; ART.rr(c, bx, y0 + w * 0.28, cs * 0.55, w * 0.44, 2); ART.fillOut(c, st === 'sunk' ? '#3a3448' : '#7b8497', 1.2);
  for (let i = 0; i < sh.len - 2; i++) { const tx = pad + cs * 0.5 + i * cs * (sh.len > 3 ? 1.05 : 0.9) + (i >= 1 ? cs * 0.6 : 0); if (tx > L - cs * 0.6) break; c.beginPath(); c.arc(tx, cs / 2, w * 0.2, 0, R2); ART.fillOut(c, st === 'sunk' ? '#3a3448' : '#5d6275', 1.2); c.fillStyle = OUT; c.fillRect(tx, cs / 2 - 1, w * 0.32, 2); }
  c.restore();
}
function fire(x, y, s) { const f = Math.sin(tt * 18 + x * 3 + y) * 0.15 + 1; c.fillStyle = 'rgba(40,30,40,.35)'; c.beginPath(); c.arc(x + 2 * s, y - 7 * s - (tt * 10 + x) % 6 * s, 4 * s, 0, R2); c.fill();
  c.beginPath(); c.moveTo(x - 5 * s, y + 4 * s); c.quadraticCurveTo(x - 6 * s, y - 4 * s, x, y - 10 * s * f); c.quadraticCurveTo(x + 6 * s, y - 4 * s, x + 5 * s, y + 4 * s); c.closePath(); ART.fillOut(c, '#ff7a2d', 1.5); c.beginPath(); c.moveTo(x - 2.5 * s, y + 3 * s); c.quadraticCurveTo(x, y - 5 * s * f, x + 2.5 * s, y + 3 * s); c.fillStyle = '#ffe07a'; c.fill(); }
function draw() {
  if (!bgCv) bake(); c.drawImage(bgCv, 0, 0, W, H);
  // olas animadas
  c.strokeStyle = 'rgba(200,235,255,.16)'; c.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = (rnd(i) * (W + 60) + tt * (8 + rnd(i + 1) * 10)) % (W + 60) - 30, y = rnd(i + 2) * H, a = Math.sin(tt * 2 + i) * 2; if (y > EY - 12 && y < EY + N * S + 12 && x > EX - 40 && x < EX + N * S + 10) continue; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8, y - 4 - a, x + 16, y); c.stroke(); }
  // barrido de radar
  const cx0 = EX + N * S / 2, cy0 = EY + N * S / 2, ang = tt * 1.2; c.save(); c.beginPath(); c.rect(EX, EY, N * S, N * S); c.clip();
  c.fillStyle = 'rgba(120,255,210,.07)'; c.beginPath(); c.moveTo(cx0, cy0); c.arc(cx0, cy0, N * S, ang - 0.5, ang); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(120,255,210,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx0, cy0); c.lineTo(cx0 + Math.cos(ang) * N * S, cy0 + Math.sin(ang) * N * S); c.stroke();
  // barcos enemigos hundidos (o todos al perder)
  const over = k.st === 'over' && !allSunk(theirs, myShots);
  for (const sh of theirShips) { const sk = sunk(theirs, myShots, sh.id); if (sk || over) { c.globalAlpha = sk ? 1 : 0.5; ship(sh, EX, EY, S, 'sunk'); c.globalAlpha = 1; } }
  // disparos propios
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!myShots[y][x]) continue; const [px, py] = ecell(x, y), id = theirs[y][x];
    if (id >= 0) { c.fillStyle = 'rgba(255,80,60,.28)'; c.fillRect(px - S / 2 + 1, py - S / 2 + 1, S - 2, S - 2); if (!sunk(theirs, myShots, id)) fire(px, py + 4, 1.1); else { c.strokeStyle = '#ff5f5f'; c.lineWidth = 3; c.beginPath(); c.moveTo(px - 6, py - 6); c.lineTo(px + 6, py + 6); c.moveTo(px + 6, py - 6); c.lineTo(px - 6, py + 6); c.stroke(); } }
    else { c.strokeStyle = 'rgba(200,240,255,.5)'; c.lineWidth = 1.5; c.beginPath(); c.arc(px, py, 7 + Math.sin(tt * 3 + x + y) * 1.5, 0, R2); c.stroke(); c.beginPath(); c.arc(px, py, 3.5, 0, R2); ART.fillOut(c, '#e8f6ff', 1.5); } }
  c.restore();
  // mira del jugador
  const hov = kbd ? cur : (() => { const x = Math.floor((k.ptr.x - EX) / S), y = Math.floor((k.ptr.y - EY) / S); return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null; })();
  if (hov && turn === 'me' && k.st === 'play' && !shells.length) { const [px, py] = ecell(...hov), bad = myShots[hov[1]][hov[0]], r = 12 + Math.sin(tt * 6) * 1.5; c.strokeStyle = bad ? 'rgba(255,120,120,.8)' : '#ffd23d'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(px, py, r, 0, R2); c.stroke(); c.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.moveTo(px + dx * (r - 5), py + dy * (r - 5)); c.lineTo(px + dx * (r + 5), py + dy * (r + 5)); } c.stroke(); }
  // flota propia
  for (const sh of myShips) ship(sh, MX, MY, MS, sunk(mine, aiShots, sh.id) ? 'sunk' : '');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!aiShots[y][x]) continue; const [px, py] = mcell(x, y); if (mine[y][x] >= 0) { if (!sunk(mine, aiShots, mine[y][x])) fire(px, py + 3, 0.6); else { c.strokeStyle = '#ff5f5f'; c.lineWidth = 2; c.beginPath(); c.moveTo(px - 4, py - 4); c.lineTo(px + 4, py + 4); c.moveTo(px + 4, py - 4); c.lineTo(px - 4, py + 4); c.stroke(); } } else { c.beginPath(); c.arc(px, py, 2.5, 0, R2); ART.fillOut(c, '#e8f6ff', 1.2); } }
  // mira de la IA
  if (aim && !aim.fired) { const q = Math.min(1, aim.t), e = q * q * (3 - 2 * q), [tx, ty] = mcell(aim.x, aim.y), ax = aim.fx + (tx - aim.fx) * e, ay = aim.fy + (ty - aim.fy) * e; c.strokeStyle = '#ff5f5f'; c.lineWidth = 2; c.beginPath(); c.arc(ax, ay, 9, 0, R2); c.stroke(); c.beginPath(); c.moveTo(ax - 13, ay); c.lineTo(ax + 13, ay); c.moveTo(ax, ay - 13); c.lineTo(ax, ay + 13); c.stroke(); }
  // proyectiles en caída con sombra
  for (const sh of shells) { const q = sh.t / sh.dur, s = sh.who === 'me' ? 1 : 0.6, hgt = (1 - q) * 160 * s;
    c.fillStyle = `rgba(0,0,0,${0.15 + q * 0.3})`; c.beginPath(); c.ellipse(sh.cx, sh.cy, 7 * s * (0.4 + q * 0.6), 3 * s * (0.4 + q * 0.6), 0, 0, R2); c.fill();
    c.save(); c.translate(sh.cx, sh.cy - hgt); c.scale(s, s); c.beginPath(); c.moveTo(0, 9); c.quadraticCurveTo(5, 2, 4, -6); c.lineTo(-4, -6); c.quadraticCurveTo(-5, 2, 0, 9); ART.fillOut(c, '#5d6275', 2); c.fillStyle = '#e0564a'; c.fillRect(-4, -9, 8, 3); c.restore(); }
  // efectos de impacto
  for (const e of fxs) { const q = 1 - e.life / e.max;
    if (e.k === 'splash') { c.strokeStyle = `rgba(230,248,255,${1 - q})`; c.lineWidth = 3; c.beginPath(); c.ellipse(e.x, e.y, e.r * 0.2 + q * e.r * 0.6, (e.r * 0.2 + q * e.r * 0.6) * 0.6, 0, 0, R2); c.stroke();
      const hh = Math.sin(Math.min(1, q * 1.6) * Math.PI) * e.r * 0.8; c.fillStyle = `rgba(230,248,255,${0.9 - q * 0.6})`; c.beginPath(); c.moveTo(e.x - e.r * 0.2, e.y); c.quadraticCurveTo(e.x - e.r * 0.1, e.y - hh, e.x, e.y - hh * 1.1); c.quadraticCurveTo(e.x + e.r * 0.1, e.y - hh, e.x + e.r * 0.2, e.y); c.fill(); }
    else { const r = e.r * (0.3 + q * 0.8); c.globalAlpha = 1 - q; c.beginPath(); c.arc(e.x, e.y, r, 0, R2); c.fillStyle = '#ffb13d'; c.fill(); c.beginPath(); c.arc(e.x, e.y, r * 0.6, 0, R2); c.fillStyle = '#fff3b0'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, r, 0, R2); c.stroke(); c.globalAlpha = 1; } }
  // HUD
  const left = SHIPS.filter((_, id) => !sunk(theirs, myShots, id)).length;
  label('Racha ' + wins, 14, 22, 18, '#f2d15c'); label(`Disparos ${fired}`, W - 14, 22, 16, '#cfe8ff', 'right');
  const pop = 1 + msgT * 0.6; c.save(); c.translate(W / 2, EY + N * S + 28); c.scale(pop, pop); label(msg, 0, 0, 16, msg.startsWith('¡') ? '#ffd23d' : '#fff', 'center'); c.restore();
  label('Tu flota', MX, MY - 14, 13, '#b8d4f0');
  // panel: estado del turno y flota enemiga
  const tx = 224; label(turn === 'me' ? 'Tu turno' : 'Turno de la IA', tx, MY + 12, 15, turn === 'me' ? '#7cf06a' : '#ff9a9a');
  label(`Enemigos a flote: ${left}`, tx, MY + 34, 12, '#cfe8ff');
  SHIPS.forEach((len, id) => { const y = MY + 48 + id * 20, sk = sunk(theirs, myShots, id); c.globalAlpha = sk ? 0.45 : 1; ship({ len, x: 0, y: 0, h: true }, tx, y, 15, sk ? 'sunk' : ''); c.globalAlpha = 1;
    c.font = '700 11px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; c.fillStyle = sk ? '#ff8a8a' : '#cfe8ff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(NAMES[id], tx + 82, y + 8);
    if (sk) { c.strokeStyle = '#ff5f5f'; c.lineWidth = 2; c.beginPath(); c.moveTo(tx, y + 8); c.lineTo(tx + len * 15, y + 8); c.stroke(); } });
  if (placing && turn === 'me') { const bx = 262, by = H - 46, bw = W - bx - 22; ART.rr(c, bx, by, bw, 30, 10); ART.fillOut(c, '#3d7fd0', 2.2); ART.rr(c, bx + 3, by + 3, bw - 6, 10, 5); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill(); label('Recolocar flota', bx + bw / 2, by + 15, 13, '#fff', 'center'); }
}
