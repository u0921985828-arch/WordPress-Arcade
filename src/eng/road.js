/* Carretera pseudo-3D con arte propio. CFG.mode: 'race' (3 vueltas contra 6 rivales) | 'lanes' (runner de 3 carriles)
 * CFG.theme: 'rally' | 'neon' | 'canyon' | 'voxel' | 'skate'. Fondos y sprites cacheados en lienzos 2×; carretera pintada de lejos a cerca. */
const M = CFG.mode, TH = CFG.theme || 'rally', port = M === 'lanes', OUT = ART.OUT, RR = ART.rr, FO = ART.fillOut;
const W = port ? 360 : 640, H = port ? 640 : 360;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#000' }), c = k.ctx;
/* ---------- Ley de la pieza única (REMASTER §8) ----------
 * uni(): traza TODAS las partes y las rellena después, así los contornos interiores quedan
 * tapados y solo sobrevive el borde exterior. inw(): detalle interior recortado contra esa
 * misma silueta. Las separaciones internas se leen por sombra propia o cambio de color. */
function uni(g, parts, ow) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = ow * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); } }
const all = (parts) => (g) => { for (const p of parts) p(g); };
function inw(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
const rp = (g, x, y, w, h, r) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const PAL = {
  rally: { sky: ['#3f9bff', '#c4e8ff'], grass: ['#5cb24b', '#53a443'], rumble: ['#f4f4f4', '#d63a3a'], road: ['#6c6c78', '#666672'], lane: '#ffffff', fog: '#c4e8ff', deco: ['tree', 'pine', 'bush'], car: '#e53935' },
  neon: { sky: ['#07021c', '#4a0d6b'], grass: ['#120830', '#170b3a'], rumble: ['#ff2bd6', '#2bf0ff'], road: ['#1d1640', '#231b4c'], lane: '#2bf0ff', fog: '#3a0d5c', deco: ['lamp', 'palm', 'lamp'], car: '#ff2bd6' },
  canyon: { sky: ['#ff8047', '#ffe2ab'], grass: ['#e3a466', '#d8995b'], rumble: ['#fff4e0', '#9a3f1c'], road: ['#9a7560', '#926e59'], lane: '#ffe9c9', fog: '#ffd9a0', deco: ['cactus', 'rock', 'cactus'], car: '#2b6cff' },
  voxel: { sky: ['#4db8ff', '#dff5ff'], grass: ['#7ed957', '#6fcb4a'], rumble: ['#ffffff', '#ff9f1c'], road: ['#5b6ee1', '#5566d6'], lane: '#ffffff', fog: '#dff5ff', deco: ['vtree', 'vrock', 'vtree'], car: '#3fc1ff' },
  skate: { sky: ['#ff6fa8', '#ffd6a0'], grass: ['#b8bcc6', '#aeb2bc'], rumble: ['#f2d15c', '#3a3f4b'], road: ['#5d6270', '#575c69'], lane: '#f2d15c', fog: '#ffc9b8', deco: ['slamp', 'hydrant', 'planter'], car: '#ff5f7a' } }[TH];
const SEG = 200, RW = port ? 1500 : 2000, DRAW = 110, CAMH = 1000, CAMD = 0.84, PZ = CAMH * CAMD;
const HY = port ? 250 : 150, YS = port ? 390 : 210, PLY = port ? H - 110 : H - 34, PLZ = CAMD * CAMH * YS / (PLY - HY), CW = 0.28, GS = Math.round(PLZ / SEG);
let inv = 0, segs, len, pos, speed, px, py, pvy, cars, lap, time, score, lives, lane, maxSpeed, boost, over, place, drift, lastSeg;
let cd, skyX, dist, nextRow, coins, fx, driftT, bump, lean, hitT, vmax, lastHit;
/* ---------- Colores y niebla ---------- */
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const NF = 6, fogs = (col) => Array.from({ length: NF }, (_, i) => mix(col, PAL.fog, i / (NF - 1) * 0.85));
const GR = PAL.grass.map(fogs), RU = PAL.rumble.map(fogs), RD = PAL.road.map(fogs), LN = fogs(PAL.lane);
/* ---------- Pista ---------- */
function addRoad(n, curve, hill) { n = Math.round(n); const start = segs.length ? segs[segs.length - 1].y2 : 0; for (let i = 0; i < n; i++) { const y1 = start + hill * (1 - Math.cos(Math.PI * i / n)) / 2, y2 = start + hill * (1 - Math.cos(Math.PI * (i + 1) / n)) / 2; segs.push({ i: segs.length, curve: curve * Math.sin(Math.PI * i / n), y1, y2, items: [] }); } }
function buildTrack() {
  segs = [];
  if (M === 'race') { const R = [[50, 0, 0], [80, 3, 0], [60, 0, 1500], [70, -4, 0], [60, 0, -1500], [90, 5, 800], [50, -2, -800], [80, -5, 0], [60, 0, 1200], [60, 3, -1200], [60, 0, 0]];
    for (const [n, cv, hl] of R) { const a = segs.length; addRoad(n * (TH === 'canyon' ? 0.9 : 1), cv * (TH === 'neon' ? 1.3 : 1), hl);
      if (Math.abs(cv) >= 3) for (let i = a + 4; i < segs.length - 6; i += 7) segs[i].items.push({ t: 'chev', x: -Math.sign(cv) * 1.3, dir: Math.sign(cv), w: 0.34 }); }
    const last = segs[segs.length - 1].y2; addRoad(30, 0, -last);
    if (TH !== 'rally') for (let i = 40; i < segs.length; i += TH === 'neon' ? 60 : 45) segs[i].items.push({ t: 'boost', x: k.pick([-0.5, 0, 0.5]) }); }
  else { for (let b = 0; b < 30; b++) addRoad(50, k.pick([0, 0, 1.5, -1.5, 2.5, -2.5]), port ? k.pick([0, 0, 600, -600]) : 0); const last = segs[segs.length - 1].y2; addRoad(20, 0, -last); }
  segs.forEach((s) => { s.z1 = s.i * SEG; s.z2 = (s.i + 1) * SEG; }); len = segs.length * SEG;
  for (let i = 8; i < segs.length; i += k.ri(4, 9)) if (M === 'race' || Math.random() < 0.7) { if (segs[i].items.some((q) => q.t === 'chev')) continue; const kind = k.ri(0, 2), nm = PAL.deco[kind];
    segs[i].items.push({ t: 'deco', x: k.pick([-1, 1]) * k.rnd(port ? 1.25 : 1.35, port ? 1.8 : 2.3), kind, w: DW[nm] * k.rnd(0.85, 1.15) }); }
  if (M === 'race') segs[GS].items.push({ t: 'gate', x: 0, w: 2.6 }); // pórtico de salida/meta
}
const DW = { tree: 0.95, pine: 0.7, bush: 0.6, lamp: 0.3, palm: 0.9, cactus: 0.42, rock: 0.62, vtree: 0.7, vrock: 0.5, slamp: 0.28, hydrant: 0.2, planter: 0.62 };
function reset() { buildTrack(); pos = 0; speed = 0; px = 0; py = 0; pvy = 0; lap = 1; time = 0; score = 0; lives = LIVES; lane = 0; boost = 0; drift = 0; over = false; place = 7; lastSeg = 0;
  cd = M === 'race' ? 2.4 : 0; lastHit = null; skyX = 0; dist = 0; nextRow = 50; rowN = 0; coins = 0; fx = []; driftT = 0; bump = 0; lean = 0; hitT = 0; inv = 0;
  maxSpeed = M === 'race' ? (TH === 'neon' ? 13000 : TH === 'canyon' ? 10500 : 12000) : 5200;
  const cols = ['#ff6b6b', '#f2d15c', '#5ce1e6', '#b98cff', '#ffa94d', '#7cf7a0'];
  cars = M === 'race' ? cols.map((col, i) => { const z = PLZ + (Math.floor(i / 2) + 1) * SEG * 3; return { z, dist: z, x: i % 2 ? 0.45 : -0.45, tx: i % 2 ? 0.45 : -0.45, base: maxSpeed * (0.62 + CUP * 0.0175 + (5 - i) * 0.035) * RIV, sp: 0, col, img: TH === 'canyon' ? kartSpr(col, k.pick(['#fff', '#1a1530', '#f2d15c'])) : carSpr(col) }; }) : [];
  if (M === 'lanes') { speed = vmax = LV0 * maxSpeed * k.D.spd; placeRows(); }
  if (M === 'race' && CUP) k.float(`Copa ${CUP + 1}: rivales más rápidos`, W / 2, H * 0.3, '#f2d15c');
}
/* ---------- Filas de obstáculos (lanes): siempre queda un carril libre ---------- */
const LX = [-0.66, 0, 0.66]; let prevFree = 1, rowN = 0;
/* Dificultad en lanes: velocidad de 0,6× a 2× la base en ~3,5 min (suavizado), filas separadas en tiempo (0,8 s → 0,42 s) y respiro cada 10 filas */
const LV0 = 0.48, LV1 = 1.7, LT = 315, // 1.23: más fácil (antes 0,6 → 2 en 210 s; filas 0,8 → 0,42 s; 3 vidas)
  ease = (d) => d * d * (3 - 2 * d), lanesD = () => ease(Math.min(1, time / LT));
/* Dificultad seleccionable: en normal todos los factores valen 1 y nada cambia. */
const LIVES = 4 + k.D.life, RIV = 1 + k.D.cpu * 0.07;
/* Carreras: los rivales empiezan flojos y mejoran con cada victoria (hasta 4 copas) */
let CUP = 0; try { CUP = Math.min(4, +localStorage.getItem('cup:' + CFG.id) || 0); } catch (e) { /* sin almacenamiento */ } // el carril libre solo se desplaza uno por fila
function spawnRow(i) { const s = segs[i % segs.length], d = lanesD(), free = prevFree = k.clamp(prevFree + k.ri(-1, 1), 0, 2), n = Math.random() < (0.12 + d * 0.52) * k.D.rate ? 2 : 1;
  s.items = s.items.filter((q) => q.t === 'deco'); const used = k.shuffle([0, 1, 2].filter((j) => j !== free)).slice(0, n);
  for (const j of used) { const r = Math.random(); s.items.push(r < 0.45 ? { t: 'block', x: LX[j], w: 0.52 } : TH === 'skate' && r < 0.72 ? { t: 'ramp', x: LX[j], w: 0.5 } : { t: 'bar', x: LX[j], w: 0.58 }); }
  if (Math.random() < 0.75) for (let q = -2; q <= 2; q++) segs[(i + q + segs.length) % segs.length].items.push({ t: 'coin', x: LX[free], w: 0.16, ph: q }); }
function placeRows() { const ahead = Math.floor((dist + PLZ) / SEG) + DRAW - 4; while (nextRow < ahead) { spawnRow(nextRow); const e = lanesD(), v = Math.max(speed, vmax * 0.9); rowN++; nextRow += Math.max(8, Math.round((1.0 - 0.475 * e) * v / SEG / k.D.rate)) + (Math.random() < 0.3 ? 2 : 0) + (rowN % 10 === 0 ? Math.round(1.2 * v / SEG) : 0); } }
/* ---------- Sprites cacheados ---------- */
const mk = (w, h, f) => { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; g.lineCap = 'round'; f(g, w, h); return cv; };
const sh = (g, x, y, rx, ry) => { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.283); g.fill(); };
const dk = (col, t) => mix(col, '#000000', t), lt = (col, t) => mix(col, '#ffffff', t);
const ep = (g, x, y, rx, ry, rot) => { g.moveTo(x + rx * Math.cos(rot || 0), y + rx * Math.sin(rot || 0)); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.283); g.closePath(); };
const ply = (pts) => (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
const vgrad = (g, y0, y1, a, b) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
/* Coche visto por detrás. Carrocería = UNA silueta (techo y cuerpo fundidos con tangente
 * continua); las ruedas van aparte solo porque giran de verdad, y solo asoma su borde. */
function carSpr(col) { return mk(140, 96, (g) => { sh(g, 70, 88, 68, 7);
  for (const x of [7, 109]) { g.beginPath(); rp(g, x, 54, 24, 34, 8); FO(g, '#241e33', 1.5);
    inw(g, (q) => rp(q, x, 54, 24, 34, 8), (q) => { q.fillStyle = vgrad(q, 54, 88, 'rgba(255,255,255,.16)', 'rgba(0,0,0,.35)'); q.fillRect(x, 54, 24, 34); q.fillStyle = '#4e4860'; q.beginPath(); rp(q, x + 4, 64, 16, 14, 4); q.fill(); }); }
  const roof = (q) => { q.moveTo(32, 50); q.lineTo(42, 22); q.quadraticCurveTo(45, 15, 54, 15); q.lineTo(86, 15); q.quadraticCurveTo(95, 15, 98, 22); q.lineTo(108, 50); q.closePath(); };
  const body = (q) => rp(q, 5, 42, 130, 38, 13);
  uni(g, [[roof, dk(col, 0.3)], [body, col]], 1.6);
  inw(g, all([roof, body]), (q) => {
    q.fillStyle = '#243049'; q.beginPath(); q.moveTo(46, 22); q.lineTo(94, 22); q.lineTo(103, 44); q.lineTo(37, 44); q.fill();
    q.fillStyle = 'rgba(255,255,255,.3)'; q.beginPath(); q.moveTo(53, 24); q.lineTo(63, 24); q.lineTo(50, 42); q.lineTo(40, 42); q.fill();
    q.fillStyle = vgrad(q, 40, 56, 'rgba(0,0,0,.3)', 'rgba(0,0,0,0)'); q.fillRect(0, 40, 140, 16);   // sombra propia del techo sobre el capó
    q.fillStyle = vgrad(q, 43, 82, 'rgba(255,255,255,.26)', 'rgba(0,0,0,.26)'); q.fillRect(0, 43, 140, 40);
    for (const x of [11, 105]) { q.fillStyle = '#b51f33'; q.beginPath(); rp(q, x, 50, 24, 12, 4); q.fill(); q.fillStyle = '#ff4b5f'; q.beginPath(); rp(q, x + 2, 51.5, 20, 8, 3); q.fill(); q.fillStyle = '#ffd3d8'; q.beginPath(); rp(q, x + 4, 53, 8, 4, 2); q.fill(); }
    q.fillStyle = 'rgba(0,0,0,.3)'; q.beginPath(); rp(q, 8, 69, 124, 12, 5); q.fill();
    q.fillStyle = 'rgba(255,255,255,.14)'; q.fillRect(8, 69, 124, 1.6);
    q.fillStyle = '#efeadb'; q.beginPath(); rp(q, 57, 54, 26, 11, 3); q.fill(); q.fillStyle = 'rgba(26,21,48,.7)'; q.fillRect(62, 58, 16, 2.4); }); }); }
/* Kart: chasis, morro y respaldo son una sola pieza; el piloto (casco y hombros) es otra pieza
 * porque se mueve por su cuenta, y las ruedas otra porque giran. */
function kartSpr(col, helm) { return mk(130, 108, (g) => { sh(g, 65, 100, 62, 7);
  for (const x of [2, 98]) { g.beginPath(); rp(g, x, 58, 30, 42, 10); FO(g, '#241e33', 1.5);
    inw(g, (q) => rp(q, x, 58, 30, 42, 10), (q) => { q.fillStyle = vgrad(q, 58, 100, 'rgba(255,255,255,.16)', 'rgba(0,0,0,.36)'); q.fillRect(x, 58, 30, 42); q.fillStyle = '#4e4860'; q.beginPath(); rp(q, x + 5, 70, 20, 18, 5); q.fill(); }); }
  const hull = (q) => rp(q, 24, 70, 82, 22, 9);            // chasis
  const seat = (q) => rp(q, 37, 42, 56, 40, 13);           // respaldo + peto, fundidos al chasis
  const bumper = (q) => rp(q, 30, 84, 70, 14, 6);          // paragolpes
  uni(g, [[bumper, dk(col, 0.42)], [hull, dk(col, 0.22)], [seat, col]], 1.6);
  inw(g, all([hull, seat, bumper]), (q) => {
    q.fillStyle = vgrad(q, 42, 98, 'rgba(255,255,255,.3)', 'rgba(0,0,0,.3)'); q.fillRect(20, 42, 92, 58);
    q.fillStyle = 'rgba(0,0,0,.26)'; q.fillRect(20, 80, 92, 5);                                    // sombra propia del respaldo
    q.fillStyle = 'rgba(255,255,255,.26)'; q.beginPath(); rp(q, 44, 46, 8, 22, 4); q.fill();
    for (const x of [28, 92]) { q.fillStyle = '#ff3b4f'; q.beginPath(); rp(q, x, 86, 10, 9, 3); q.fill(); } });
  const head = (q) => { q.moveTo(48, 40); q.quadraticCurveTo(46, 20, 65, 20); q.quadraticCurveTo(84, 20, 82, 40); q.closePath(); };
  const helmet = (q) => ep(q, 65, 25, 18, 18);
  uni(g, [[head, dk(helm, 0.2)], [helmet, helm]], 1.6);
  inw(g, all([head, helmet]), (q) => {
    q.fillStyle = vgrad(q, 8, 44, 'rgba(255,255,255,.34)', 'rgba(0,0,0,.28)'); q.fillRect(44, 8, 44, 40);
    q.fillStyle = 'rgba(26,21,48,.55)'; q.beginPath(); rp(q, 54, 26, 22, 9, 4); q.fill();
    q.fillStyle = 'rgba(255,255,255,.4)'; q.beginPath(); q.ellipse(56, 17, 5, 7, -0.5, 0, 6.283); q.fill(); }); }); }
const DECO = {
  /* Cada decorado es UNA silueta: tronco y copa fundidos, facetas resueltas por color dentro
   * del recorte. Nada de contornos cerrados apilados. */
  tree: () => mk(120, 150, (g) => { sh(g, 60, 144, 46, 6);
    const trunk = (q) => { q.moveTo(50, 146); q.quadraticCurveTo(48, 110, 54, 82); q.lineTo(68, 82); q.quadraticCurveTo(73, 110, 71, 146); q.closePath(); };
    const crown = (q) => { ep(q, 60, 54, 38, 38); ep(q, 32, 80, 26, 26); ep(q, 88, 80, 26, 26); ep(q, 60, 90, 24, 24); };
    uni(g, [[trunk, '#7a4a2a'], [crown, '#3f9a45']], 1.5);
    inw(g, all([trunk, crown]), (q) => {
      q.fillStyle = '#5fbf5a'; q.beginPath(); q.arc(50, 44, 20, 0, 6.283); q.arc(30, 74, 11, 0, 6.283); q.fill();
      q.fillStyle = '#2f7d38'; q.beginPath(); q.arc(82, 88, 14, 0, 6.283); q.arc(66, 98, 10, 0, 6.283); q.fill();
      q.fillStyle = 'rgba(0,0,0,.22)'; q.beginPath(); q.ellipse(60, 92, 34, 12, 0, 0, 6.283); q.fill();
      q.fillStyle = 'rgba(255,255,255,.18)'; q.fillRect(50, 82, 5, 64); q.fillStyle = 'rgba(0,0,0,.24)'; q.fillRect(64, 82, 8, 64); }); }),
  pine: () => mk(90, 160, (g) => { sh(g, 45, 154, 34, 5);
    const trunk = (q) => rp(q, 38, 118, 14, 36, 4);
    const tiers = [0, 1, 2].map((i) => ply([[45, 8 + i * 34], [82 - i * 2, 70 + i * 26], [8 + i * 2, 70 + i * 26]]));
    uni(g, [[trunk, '#5a3a22'], [tiers[2], '#25703c'], [tiers[1], '#2a7d43'], [tiers[0], '#2f8a4a']], 1.5);
    inw(g, all([trunk, ...tiers]), (q) => {
      for (let i = 0; i < 3; i++) { q.fillStyle = 'rgba(0,0,0,.2)'; q.fillRect(0, 62 + i * 26, 90, 9); }
      q.fillStyle = 'rgba(255,255,255,.2)'; q.beginPath(); q.moveTo(45, 14); q.lineTo(32, 66); q.lineTo(41, 66); q.fill();
      q.fillStyle = 'rgba(0,0,0,.24)'; q.fillRect(47, 118, 6, 36); }); }),
  bush: () => mk(110, 70, (g) => { sh(g, 55, 64, 50, 6);
    const P = (q) => { ep(q, 30, 42, 21, 21); ep(q, 55, 32, 27, 27); ep(q, 82, 42, 21, 21); ep(q, 55, 54, 30, 14); };
    uni(g, [[P, '#4caa48']], 1.5);
    inw(g, P, (q) => { q.fillStyle = '#6fcf5f'; q.beginPath(); q.arc(48, 24, 12, 0, 6.283); q.fill();
      q.fillStyle = 'rgba(0,0,0,.24)'; q.fillRect(0, 54, 110, 16);
      q.fillStyle = '#ff6b8a'; for (const [a2, b2] of [[30, 38], [62, 26], [80, 44]]) { q.beginPath(); q.arc(a2, b2, 3.5, 0, 6.283); q.fill(); } }); }),
  lamp: () => mk(70, 230, (g) => { const gr = g.createRadialGradient(35, 30, 2, 35, 30, 34); gr.addColorStop(0, 'rgba(43,240,255,.9)'); gr.addColorStop(1, 'rgba(43,240,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 70, 70); sh(g, 35, 224, 18, 4);
    const P = (q) => { rp(q, 30, 36, 10, 188, 4); rp(q, 23, 210, 24, 14, 4); rp(q, 19, 22, 32, 18, 8); };
    uni(g, [[P, '#2a2050']], 1.5);
    inw(g, P, (q) => { q.fillStyle = '#bff9ff'; q.beginPath(); rp(q, 21, 24, 28, 13, 6); q.fill();
      q.fillStyle = '#ff2bd6'; q.fillRect(33, 52, 4, 158);
      q.fillStyle = 'rgba(255,255,255,.2)'; q.fillRect(30, 40, 3, 184); q.fillStyle = 'rgba(0,0,0,.3)'; q.fillRect(37, 40, 3, 184); }); }),
  palm: () => mk(130, 190, (g) => { sh(g, 60, 184, 26, 5);
    const trunk = (q) => { q.moveTo(52, 186); q.quadraticCurveTo(74, 110, 62, 44); q.lineTo(76, 44); q.quadraticCurveTo(88, 110, 70, 186); q.closePath(); };
    const frond = (i) => { const a = -Math.PI / 2 + (i - 2.5) * 0.62, ex = 69 + Math.cos(a) * 56, ey = 48 + Math.sin(a) * 40 + 22;
      return (q) => { q.moveTo(69, 40); q.quadraticCurveTo(69 + Math.cos(a) * 30, 44 + Math.sin(a) * 30 - 10, ex, ey); q.quadraticCurveTo(69 + Math.cos(a) * 24, 44 + Math.sin(a) * 18, 69, 54); q.closePath(); };
    };
    const fs = [0, 1, 2, 3, 4, 5].map(frond);
    uni(g, [[trunk, '#1b0f3a'], ...fs.map((f) => [f, '#1b0f3a'])], 1.5);
    inw(g, all([trunk, ...fs]), (q) => { q.strokeStyle = '#2bf0ff'; q.lineWidth = 1.2; q.globalAlpha = 0.75;
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.62; q.beginPath(); q.moveTo(69, 46); q.lineTo(69 + Math.cos(a) * 50, 48 + Math.sin(a) * 36 + 20); q.stroke(); }
      q.globalAlpha = 1; q.strokeStyle = '#ff2bd6'; q.beginPath(); q.moveTo(62, 186); q.quadraticCurveTo(80, 110, 69, 46); q.stroke(); }); }),
  cactus: () => mk(90, 150, (g) => { sh(g, 45, 145, 30, 5);
    const P = (q) => { rp(q, 33, 14, 24, 132, 12);
      q.moveTo(45, 92); q.lineTo(23, 92); q.quadraticCurveTo(15, 92, 15, 82); q.lineTo(15, 56); q.lineTo(29, 56); q.lineTo(29, 80); q.lineTo(45, 80); q.closePath();
      q.moveTo(45, 74); q.lineTo(67, 74); q.quadraticCurveTo(75, 74, 75, 64); q.lineTo(75, 40); q.lineTo(61, 40); q.lineTo(61, 62); q.lineTo(45, 62); q.closePath(); };
    uni(g, [[P, '#5cb257']], 1.5);
    inw(g, P, (q) => { q.fillStyle = 'rgba(0,0,0,.2)'; q.fillRect(48, 14, 4, 132); q.fillRect(22, 56, 3, 36); q.fillRect(68, 40, 3, 34);
      q.fillStyle = 'rgba(255,255,255,.26)'; q.beginPath(); rp(q, 36, 20, 5, 100, 2.5); q.fill(); q.beginPath(); rp(q, 16, 58, 4, 30, 2); q.fill();
      q.fillStyle = 'rgba(0,0,0,.26)'; q.fillRect(0, 126, 90, 24);
      q.fillStyle = '#ff5f7a'; q.beginPath(); q.arc(45, 17, 5, 0, 6.283); q.fill(); }); }),
  rock: () => mk(120, 90, (g) => { sh(g, 60, 84, 56, 6);
    const P = ply([[8, 82], [18, 36], [46, 12], [84, 18], [110, 46], [114, 82]]);
    uni(g, [[P, '#b0653a']], 1.5);
    inw(g, P, (q) => { q.fillStyle = '#d0875a'; q.beginPath(); q.moveTo(46, 12); q.lineTo(84, 18); q.lineTo(70, 44); q.lineTo(38, 40); q.fill();
      q.fillStyle = '#8a4a2a'; q.beginPath(); q.moveTo(70, 44); q.lineTo(110, 46); q.lineTo(114, 82); q.lineTo(72, 82); q.fill();
      q.fillStyle = 'rgba(0,0,0,.2)'; q.fillRect(0, 74, 120, 16); }); }),
  vtree: () => mk(100, 140, (g) => { sh(g, 50, 134, 40, 5);
    const trunk = (q) => rp(q, 42, 76, 16, 58, 3);
    const cube = ply([[14, 30], [50, 14], [86, 30], [86, 80], [50, 96], [14, 80]]);
    uni(g, [[trunk, '#6b4423'], [cube, '#3fb24f']], 1.5);
    inw(g, all([trunk, cube]), (q) => {
      q.fillStyle = '#7ee06a'; q.beginPath(); q.moveTo(14, 30); q.lineTo(50, 14); q.lineTo(86, 30); q.lineTo(50, 46); q.fill();
      q.fillStyle = '#2e8f3e'; q.beginPath(); q.moveTo(50, 46); q.lineTo(86, 30); q.lineTo(86, 80); q.lineTo(50, 96); q.fill();
      q.fillStyle = 'rgba(0,0,0,.26)'; q.fillRect(50, 76, 8, 58); q.fillStyle = 'rgba(255,255,255,.14)'; q.fillRect(42, 76, 4, 58); }); }),
  vrock: () => mk(90, 80, (g) => { sh(g, 45, 74, 40, 5);
    const P = ply([[10, 26], [45, 12], [80, 26], [80, 60], [45, 74], [10, 60]]);
    uni(g, [[P, '#9aa3b5']], 1.5);
    inw(g, P, (q) => { q.fillStyle = '#c9d0dc'; q.beginPath(); q.moveTo(10, 26); q.lineTo(45, 12); q.lineTo(80, 26); q.lineTo(45, 40); q.fill();
      q.fillStyle = '#7a8398'; q.beginPath(); q.moveTo(45, 40); q.lineTo(80, 26); q.lineTo(80, 60); q.lineTo(45, 74); q.fill(); }); }),
  slamp: () => mk(70, 220, (g) => { sh(g, 30, 214, 16, 4);
    const P = (q) => { rp(q, 26, 24, 9, 190, 4); rp(q, 19, 200, 23, 14, 4);
      q.moveTo(26.5, 30); q.quadraticCurveTo(26, 8, 52, 11); q.lineTo(56, 19); q.quadraticCurveTo(33, 16, 34, 34); q.closePath();
      rp(q, 43, 10, 24, 12, 5); };
    uni(g, [[P, '#4a5060']], 1.5);
    inw(g, P, (q) => { q.fillStyle = '#ffe38a'; q.beginPath(); rp(q, 45, 12, 20, 9, 4); q.fill();
      q.fillStyle = 'rgba(255,255,255,.2)'; q.fillRect(26, 30, 3, 184); q.fillStyle = 'rgba(0,0,0,.3)'; q.fillRect(32, 30, 3, 184); }); }),
  hydrant: () => mk(60, 80, (g) => { sh(g, 30, 75, 22, 4);
    const P = (q) => { rp(q, 14, 20, 32, 56, 8); ep(q, 30, 22, 15, 13); rp(q, 5, 36, 50, 13, 6); rp(q, 25, 6, 10, 12, 4); };
    uni(g, [[P, '#e53935']], 1.5);
    inw(g, P, (q) => { q.fillStyle = 'rgba(0,0,0,.24)'; q.beginPath(); rp(q, 5, 44, 50, 6, 3); q.fill(); q.fillRect(0, 66, 60, 14);
      q.fillStyle = 'rgba(255,255,255,.3)'; q.fillRect(19, 26, 5, 42); q.fillStyle = 'rgba(255,255,255,.22)'; q.beginPath(); rp(q, 8, 37, 44, 4, 2); q.fill(); }); }),
  planter: () => mk(110, 150, (g) => { sh(g, 55, 144, 50, 5);
    const pot = (q) => { q.moveTo(16, 110); q.lineTo(94, 110); q.lineTo(86, 146); q.lineTo(24, 146); q.closePath(); };
    const plant = (q) => { rp(q, 50, 64, 11, 52, 4); ep(q, 55, 50, 33, 30); ep(q, 34, 70, 21, 19); ep(q, 76, 70, 21, 19); };
    uni(g, [[plant, '#5cb85c'], [pot, '#8a8fa3']], 1.5);
    inw(g, all([plant, pot]), (q) => { q.fillStyle = '#7fd67a'; q.beginPath(); q.arc(46, 40, 13, 0, 6.283); q.fill();
      q.fillStyle = 'rgba(0,0,0,.2)'; q.beginPath(); q.ellipse(55, 82, 30, 11, 0, 0, 6.283); q.fill();
      q.fillStyle = 'rgba(255,255,255,.28)'; q.fillRect(16, 110, 78, 5);
      q.fillStyle = 'rgba(0,0,0,.26)'; q.fillRect(0, 132, 110, 18); }); }),
};
const SPR = {}; PAL.deco.forEach((n) => { if (!SPR[n]) SPR[n] = DECO[n](); });
const chevSpr = (dir) => mk(90, 110, (g) => { sh(g, 45, 106, 36, 4);
  const P = (q) => { rp(q, 21, 44, 8, 62, 3); rp(q, 61, 44, 8, 62, 3); rp(q, 4, 8, 82, 48, 7); };
  uni(g, [[P, '#8a8fa3']], 1.5);
  inw(g, P, (q) => { q.fillStyle = '#f4f4f4'; q.beginPath(); rp(q, 5, 9, 80, 46, 6); q.fill();
    q.fillStyle = '#d63a3a'; for (let i = 0; i < 3; i++) { const x0 = dir > 0 ? 14 + i * 22 : 76 - i * 22; q.beginPath(); q.moveTo(x0, 16); q.lineTo(x0 + dir * 12, 32); q.lineTo(x0, 48); q.lineTo(x0 + dir * 8, 48); q.lineTo(x0 + dir * 20, 32); q.lineTo(x0 + dir * 8, 16); q.fill(); }
    q.fillStyle = 'rgba(0,0,0,.2)'; q.fillRect(0, 50, 90, 8); q.fillStyle = 'rgba(0,0,0,.26)'; q.fillRect(25, 44, 4, 62); q.fillRect(65, 44, 4, 62); }); });
if (M === 'race') { SPR.chevR = chevSpr(1); SPR.chevL = chevSpr(-1);
  SPR.gate = mk(300, 150, (g) => {                       // pórtico: pilares y travesaño en una pieza
    const P = (q) => { rp(q, 10, 18, 18, 132, 4); rp(q, 272, 18, 18, 132, 4); rp(q, 4, 10, 292, 40, 9); };
    uni(g, [[P, '#e8e8f0']], 1.8);
    inw(g, P, (q) => { q.fillStyle = TH === 'neon' ? '#241a4a' : '#2c2742'; q.beginPath(); rp(q, 5, 11, 290, 38, 8); q.fill();
      for (let i = 0; i < 18; i++) for (let j = 0; j < 2; j++) { q.fillStyle = (i + j) % 2 ? '#fff' : OUT; q.fillRect(14 + i * 15, 16 + j * 14, 15, 14); }
      q.strokeStyle = TH === 'neon' ? '#2bf0ff' : '#f2d15c'; q.lineWidth = 2.4; q.strokeRect(12, 14, 276, 30);
      q.fillStyle = 'rgba(0,0,0,.28)'; q.fillRect(22, 18, 5, 132); q.fillRect(284, 18, 5, 132);
      q.fillStyle = 'rgba(255,255,255,.22)'; q.fillRect(10, 18, 3, 132); q.fillRect(272, 18, 3, 132); }); });
  SPR.player = TH === 'canyon' ? kartSpr(PAL.car, '#f2d15c') : carSpr(PAL.car); }
else { const vox = TH === 'voxel';
  SPR.block = mk(100, 104, (g) => { sh(g, 50, 98, 50, 6);
    const P = ply(vox ? [[10, 26], [22, 8], [78, 8], [90, 26], [90, 96], [10, 96]] : [[8, 32], [18, 10], [82, 10], [92, 32], [88, 96], [12, 96]]);
    uni(g, [[P, vox ? '#e64a19' : '#2f7d4a']], 1.6);
    inw(g, P, (q) => {
      if (vox) { q.fillStyle = '#ff8a50'; q.beginPath(); q.moveTo(10, 26); q.lineTo(22, 8); q.lineTo(78, 8); q.lineTo(90, 26); q.fill();
        q.fillStyle = '#ffd23f'; q.fillRect(10, 52, 80, 18); q.fillStyle = 'rgba(0,0,0,.22)'; q.fillRect(10, 68, 80, 4);
        q.fillStyle = OUT; q.font = '900 15px system-ui'; q.textAlign = 'center'; q.fillText('TNT', 50, 67); }
      else { q.fillStyle = '#3f8f5a'; q.beginPath(); q.moveTo(8, 32); q.lineTo(18, 10); q.lineTo(82, 10); q.lineTo(92, 32); q.fill();
        q.fillStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i < 4; i++) q.fillRect(20 + i * 18, 40, 6, 52);
        q.fillStyle = 'rgba(0,0,0,.28)'; q.fillRect(0, 32, 100, 4); q.beginPath(); rp(q, 12, 86, 14, 14, 3); q.fill(); q.beginPath(); rp(q, 74, 86, 14, 14, 3); q.fill(); }
      q.fillStyle = 'rgba(255,255,255,.18)'; q.fillRect(10, 34, 4, 62); q.fillStyle = 'rgba(0,0,0,.24)'; q.fillRect(84, 34, 6, 62); }); });
  SPR.bar = mk(120, 70, (g) => { sh(g, 60, 64, 58, 5);
    const P = (q) => { rp(q, 10, 16, 8, 48, 3); rp(q, 102, 16, 8, 48, 3); rp(q, 4, 12, 112, 20, 6); };
    uni(g, [[P, '#eceaf4']], 1.5);
    inw(g, P, (q) => { q.fillStyle = vox ? '#ff9f1c' : '#ff5f7a'; for (let i = 0; i < 5; i++) { q.beginPath(); q.moveTo(10 + i * 22, 14); q.lineTo(22 + i * 22, 14); q.lineTo(14 + i * 22, 30); q.lineTo(2 + i * 22, 30); q.fill(); }
      q.fillStyle = 'rgba(0,0,0,.24)'; q.fillRect(0, 27, 120, 5); q.fillRect(14, 16, 4, 48); q.fillRect(106, 16, 4, 48);
      q.fillStyle = 'rgba(255,255,255,.26)'; q.fillRect(4, 13, 112, 2.5); }); });
  SPR.ramp = mk(100, 64, (g) => { sh(g, 50, 58, 50, 5);
    const P = ply([[6, 58], [24, 8], [76, 8], [94, 58]]);
    uni(g, [[P, '#c98a4b']], 1.6);
    inw(g, P, (q) => { q.fillStyle = '#e3a767'; q.beginPath(); q.moveTo(24, 8); q.lineTo(76, 8); q.lineTo(78, 17); q.lineTo(22, 17); q.fill();
      q.fillStyle = 'rgba(0,0,0,.2)'; q.fillRect(0, 17, 100, 4); q.fillRect(0, 50, 100, 14);
      q.fillStyle = '#f2d15c'; for (let i = 0; i < 2; i++) { const y = 24 + i * 16; q.beginPath(); q.moveTo(50, y); q.lineTo(64, y + 12); q.lineTo(58, y + 12); q.lineTo(50, y + 6); q.lineTo(42, y + 12); q.lineTo(36, y + 12); q.fill(); } }); });
  SPR.coin = mk(40, 40, (g) => { const P = (q) => ep(q, 20, 20, 17, 17);
    uni(g, [[P, '#ffc928']], 1.6);
    inw(g, P, (q) => { q.fillStyle = '#e39b00'; q.beginPath(); q.arc(20, 20, 13, 0, 6.283); q.fill(); q.fillStyle = '#ffd34d'; q.beginPath(); q.arc(20, 20, 10, 0, 6.283); q.fill();
      q.fillStyle = 'rgba(255,255,255,.55)'; q.fillRect(12, 9, 4, 12); q.fillStyle = 'rgba(0,0,0,.18)'; q.beginPath(); q.arc(20, 30, 16, 0, 6.283); q.fill(); }); }); }
/* ---------- Fondo: cielo + dos capas de paralaje (cacheados) ---------- */
const LW = W * 2, rs = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const BG = (() => {
  const sky = mk(W, H, (g) => { const gr = g.createLinearGradient(0, 0, 0, HY); gr.addColorStop(0, PAL.sky[0]); gr.addColorStop(1, PAL.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, HY + 2); g.fillStyle = GR[0][NF - 1]; g.fillRect(0, HY, W, H - HY);
    if (TH === 'neon') { g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { g.globalAlpha = 0.3 + rs(i) * 0.7; g.fillRect(rs(i + 3) * W, rs(i + 7) * HY * 0.8, 1.5, 1.5); } g.globalAlpha = 1;
      const sx = W / 2, sy = HY - 26, r = port ? 60 : 70, sg = g.createLinearGradient(0, sy - r, 0, sy + r); sg.addColorStop(0, '#ffe45c'); sg.addColorStop(1, '#ff2b8a'); g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, r, 0, 6.283); g.fill();
      g.fillStyle = PAL.sky[1]; for (let i = 0; i < 6; i++) g.fillRect(sx - r, sy + 4 + i * 10, r * 2, 2 + i * 1.2); }
    else { const sx = W * 0.78, sy = HY * 0.36, gl = g.createRadialGradient(sx, sy, 4, sx, sy, 60); gl.addColorStop(0, 'rgba(255,250,210,.8)'); gl.addColorStop(1, 'rgba(255,250,210,0)'); g.fillStyle = gl; g.fillRect(sx - 60, sy - 60, 120, 120); g.fillStyle = '#fff6cf'; g.beginPath(); g.arc(sx, sy, 20, 0, 6.283); g.fill();
      if (TH !== 'canyon') { g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 4; i++) { const x = rs(i) * W, y = 22 + rs(i + 9) * HY * 0.35; if (TH === 'voxel') { g.fillRect(x, y, 56, 14); g.fillRect(x + 12, y - 10, 28, 12); } else { g.beginPath(); g.arc(x, y, 14, 0, 6.283); g.arc(x + 18, y - 7, 18, 0, 6.283); g.arc(x + 38, y, 13, 0, 6.283); g.fill(); } } } } });
  const layer = (draw) => mk(LW, HY + 4, (g) => { for (const o of [-LW, 0, LW]) { g.save(); g.translate(o, 0); draw(g); g.restore(); } });
  const hills = (g, base, amp, col, f1, f2) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, HY + 4); for (let x = 0; x <= LW; x += 8) g.lineTo(x, base - (Math.sin(x / LW * 6.283 * f1) * 0.5 + 0.5) * amp - Math.sin(x / LW * 6.283 * f2 + 1) * amp * 0.25); g.lineTo(LW, HY + 4); g.fill(); };
  let far, near;
  if (TH === 'rally') { far = layer((g) => { for (let i = 0; i < 7; i++) { const x = (i + rs(i) * 0.5) * LW / 7, h = 50 + rs(i + 2) * 40, w = 70 + rs(i + 4) * 40; g.fillStyle = '#7ea6d6'; g.beginPath(); g.moveTo(x - w, HY + 4); g.lineTo(x, HY - h); g.lineTo(x + w, HY + 4); g.fill(); g.fillStyle = '#6b93c4'; g.beginPath(); g.moveTo(x, HY - h); g.lineTo(x + w, HY + 4); g.lineTo(x + w * 0.2, HY + 4); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - w * 0.3, HY - h * 0.7); g.lineTo(x, HY - h); g.lineTo(x + w * 0.3, HY - h * 0.7); g.lineTo(x + w * 0.1, HY - h * 0.62); g.lineTo(x - w * 0.1, HY - h * 0.72); g.fill(); } });
    near = layer((g) => { hills(g, HY, 26, '#4c9a45', 5, 13); g.fillStyle = '#3d8a3a'; for (let i = 0; i < 40; i++) { const x = rs(i + 20) * LW, y = HY - 4 - rs(i) * 10; g.beginPath(); g.arc(x, y, 5 + rs(i + 1) * 4, 0, 6.283); g.fill(); } }); }
  else if (TH === 'neon') { far = layer((g) => { g.lineWidth = 2; for (let i = 0; i < 9; i++) { const x = (i + rs(i)) * LW / 9, h = 30 + rs(i + 2) * 40, w = 50 + rs(i + 4) * 30; g.fillStyle = '#2a0b4d'; g.strokeStyle = '#ff2bd6'; g.beginPath(); g.moveTo(x - w, HY + 4); g.lineTo(x, HY - h); g.lineTo(x + w, HY + 4); g.fill(); g.stroke(); g.strokeStyle = 'rgba(255,43,214,.35)'; g.beginPath(); g.moveTo(x, HY - h); g.lineTo(x - w * 0.2, HY + 4); g.moveTo(x, HY - h); g.lineTo(x + w * 0.3, HY + 4); g.stroke(); } });
    near = layer((g) => { for (let i = 0; i < 26; i++) { const x = i * LW / 26, w = LW / 26 - 4, h = 12 + rs(i + 30) * 34; g.fillStyle = '#150930'; g.fillRect(x, HY - h, w, h + 4); g.fillStyle = rs(i) > 0.5 ? '#2bf0ff' : '#ff2bd6'; for (let j = 0; j < h / 8 - 1; j++) for (let q = 0; q < w / 7 - 1; q++) if (rs(i * 31 + j * 7 + q) > 0.6) g.fillRect(x + 3 + q * 7, HY - h + 4 + j * 8, 3, 3); } }); }
  else if (TH === 'canyon') { far = layer((g) => { for (let i = 0; i < 6; i++) { const x = (i + rs(i)) * LW / 6, h = 36 + rs(i + 2) * 40, w = 40 + rs(i + 4) * 50; g.fillStyle = '#e2926a'; g.fillRect(x - w, HY - h, w * 2, h + 4); g.fillStyle = '#c9744f'; g.fillRect(x + w * 0.3, HY - h, w * 0.7, h + 4); g.fillStyle = '#f0ae84'; g.fillRect(x - w - 4, HY - h - 4, w * 2 + 8, 6); } });
    near = layer((g) => { hills(g, HY + 2, 22, '#b5582e', 7, 17); g.fillStyle = '#9a4524'; for (let i = 0; i < 14; i++) { const x = rs(i + 5) * LW; g.beginPath(); g.moveTo(x - 14, HY + 4); g.lineTo(x - 4, HY - 18 - rs(i) * 14); g.lineTo(x + 12, HY + 4); g.fill(); } }); }
  else if (TH === 'voxel') { far = layer((g) => { for (let x = 0; x < LW; x += 20) { const h = 20 + Math.round((Math.sin(x / LW * 6.283 * 3) * 0.5 + 0.5) * 3 + rs(x) * 1.5) * 12; g.fillStyle = '#8fd49a'; g.fillRect(x, HY - h, 20, h + 4); g.fillStyle = '#b3e6b9'; g.fillRect(x, HY - h, 20, 5); } });
    near = layer((g) => { for (let i = 0; i < 18; i++) { const x = rs(i + 40) * LW; g.fillStyle = '#4fae4a'; g.fillRect(x - 12, HY - 34, 24, 24); g.fillStyle = '#3d8f3a'; g.fillRect(x, HY - 34, 12, 24); g.fillStyle = '#6b4423'; g.fillRect(x - 3, HY - 10, 6, 14); } g.fillStyle = '#6fcb4a'; g.fillRect(0, HY - 2, LW, 6); }); }
  else { far = layer((g) => { for (let i = 0; i < 22; i++) { const x = i * LW / 22, w = LW / 22 - 2, h = 30 + rs(i + 8) * 60; g.fillStyle = '#c77aa8'; g.fillRect(x, HY - h, w, h + 4); } });
    near = layer((g) => { for (let i = 0; i < 14; i++) { const x = i * LW / 14 + rs(i) * 10, w = LW / 14 - 10, h = 26 + rs(i + 3) * 44; g.fillStyle = '#8a4f7d'; g.fillRect(x, HY - h, w, h + 4); g.fillStyle = '#6e3a66'; g.fillRect(x + w * 0.7, HY - h, w * 0.3, h + 4); g.fillStyle = '#ffd98a'; for (let j = 0; j < h / 10 - 1; j++) for (let q = 0; q < 3; q++) if (rs(i * 13 + j * 5 + q) > 0.45) g.fillRect(x + 5 + q * (w - 10) / 3, HY - h + 6 + j * 10, 4, 5); } }); }
  return { sky, far, near };
})();
function drawLayer(img, off) { const o = ((off % LW) + LW) % LW - LW; c.drawImage(img, o, 0, LW, HY + 4); c.drawImage(img, o + LW, 0, LW, HY + 4); }
/* ---------- Texto con contorno ---------- */
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
reset(); k.show(CFG.title, CFG.help);
const segAt = (z) => segs[Math.floor(((z % len) + len) % len / SEG)];
const hAt = (z) => { const s = segAt(z), f = (((z % len) + len) % len % SEG) / SEG; return s.y1 + (s.y2 - s.y1) * f; };
function eachSeg(z0, z1, fn) { for (let i = Math.floor(z0 / SEG); i <= Math.floor(z1 / SEG); i++) fn(segs[((i % segs.length) + segs.length) % segs.length]); }
function puff(x, y, col, n, vx, vy, r) { for (let i = 0; i < n && fx.length < 120; i++) fx.push({ x: x + k.rnd(-4, 4), y, vx: vx + k.rnd(-30, 30), vy: vy + k.rnd(-30, 10), r: r || k.rnd(4, 8), life: 0.5, col }); }
k.run((dt) => {
  for (const p of fx) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 14; p.life -= dt; } fx = fx.filter((p) => p.life > 0); hitT = Math.max(0, hitT - dt);
  if (!k.gate(reset)) return;
  const pct = speed / maxSpeed;
  if (M === 'race') {
    if (cd > -1) { const a = Math.ceil(cd); cd -= dt; if (a > 0 && Math.ceil(cd) !== a) k.sfx(cd <= 0 ? 'coin' : 'click'); if (cd > 0) return; }
    time += dt; const pSeg = segAt(pos + PLZ);
    const accel = k.held.has('up') || k.held.has('a') || k.ptr.down, brake = k.held.has('down') || k.held.has('b');
    let steer = (k.held.has('left') ? -1 : 0) + (k.held.has('right') ? 1 : 0); if (k.ptr.down) steer = k.clamp((k.ptr.x - W / 2) / (W * 0.25), -1, 1);
    lean += (steer - lean) * Math.min(1, dt * 8);
    const wasDrift = drift > 0.5; drift = TH === 'neon' && Math.abs(steer) > 0.6 && pct > 0.6 ? Math.min(1, drift + dt) : Math.max(0, drift - dt * 2);
    if (drift > 0.5) { driftT += dt; if (Math.random() < 0.5) puff(W / 2 + k.rnd(-40, 40), PLY - 6, 'rgba(230,220,255,.5)', 1, -lean * 80, -20); }
    else if (wasDrift) { if (driftT > 0.8) { boost = Math.min(1.2, driftT * 0.5); k.float('¡Mini turbo!', W / 2, PLY - 90, '#2bf0ff'); k.sfx('jump'); } driftT = 0; }
    px += steer * dt * 2.2 * pct * (1 + drift * 0.4); px -= pSeg.curve * pct * pct * dt * 0.33 * (1 - drift * 0.35);
    speed += (accel ? maxSpeed * 0.45 : -maxSpeed * 0.15) * dt; if (brake) speed -= maxSpeed * 0.8 * dt;
    if (Math.abs(px) > 1.05) { speed -= speed * 1.6 * dt * (TH === 'canyon' ? 1.4 : 1); bump = Math.sin(time * 40) * 2 * pct; if (pct > 0.15 && Math.random() < 0.6) puff(W / 2 + k.rnd(-50, 50), PLY - 4, TH === 'neon' ? 'rgba(255,43,214,.45)' : TH === 'canyon' ? 'rgba(214,150,90,.6)' : 'rgba(140,110,70,.5)', 1, 0, -40); } else bump = 0;
    if (boost > 0) { boost -= dt; speed += maxSpeed * dt; }
    speed = k.clamp(speed, 0, maxSpeed * (boost > 0 ? 1.35 : 1)); px = k.clamp(px, -2.4, 2.4);
    const z0 = pos + PLZ, adv = speed * dt;
    eachSeg(z0, z0 + adv, (s) => { for (const it of s.items) {
      if (it.t === 'boost' && Math.abs(px - it.x) < 0.3) { if (boost <= 0.3) { k.sfx('jump'); k.flash('rgba(43,240,255,.25)'); k.float('TURBO', W / 2, PLY - 90, '#2bf0ff'); } boost = 1.2; }
      if ((it.t === 'deco' || it.t === 'chev') && Math.abs(px - it.x) < it.w * 0.34 && speed > maxSpeed * 0.1) { speed = maxSpeed * 0.08; px += (px > 0 ? -1 : 1) * 0.12; k.sfx('hit'); k.shake(8); k.burst(W / 2, PLY - 30, '#fff', 10, 160); } } });
    for (const cr of cars) { cr.sp = cr.base * (1 + 0.04 * Math.sin(time * 0.5 + cr.base)); cr.dist += cr.sp * dt; cr.z = cr.dist % len;
      const behind = ((z0 - cr.z) % len + len) % len; if (behind < 900 && Math.abs(cr.x - px) < 0.3) cr.tx = k.clamp(px + (cr.x > px ? 0.45 : -0.45), -0.8, 0.8); else if (Math.random() < dt * 0.25) cr.tx = k.pick([-0.6, -0.2, 0.2, 0.6]);
      cr.x += (cr.tx - cr.x) * Math.min(1, dt * 1.5);
      const rel = ((cr.z - z0) % len + len) % len; if (rel < 170 && Math.abs(cr.x - px) < CW * 0.72 && speed > cr.sp) { speed = cr.sp * 0.85; px += (px >= cr.x ? 1 : -1) * 0.08; k.sfx('hit'); k.shake(4); hitT = 0.25; k.burst(W / 2, PLY - 40, '#ffd23f', 8, 120); } }
    const my = (lap - 1) * len + pos + PLZ; place = 1 + cars.filter((cr) => cr.dist > my).length;
    skyX += pSeg.curve * pct * dt * 60;
    const oldPos = pos; pos = (pos + adv) % len; if (pos < oldPos) { lap++; if (lap <= 3) { k.sfx('coin'); k.float(lap === 3 ? '¡Última vuelta!' : `Vuelta ${lap}`, W / 2, H * 0.35, '#f2d15c'); }
      else { over = true; const pts = Math.max(0, 7 - place) * 300 + Math.max(0, 180 - Math.floor(time)) * 10; k.st = 'over'; if (place === 1) try { CUP = Math.min(4, CUP + 1); localStorage.setItem('cup:' + CFG.id, CUP); } catch (e) { /* sin almacenamiento */ } k.end(CFG.id, pts, place === 1 ? '¡Victoria!' : `Llegaste ${place}º`, `Tiempo ${time.toFixed(1)} s`); if (place > 1) k.sfx('lose'); } }
  } else {
    time += dt; vmax = maxSpeed * (LV0 + (LV1 - LV0) * lanesD()) * k.D.spd; speed = Math.min(vmax, speed + 2500 * dt); const adv = speed * dt, z0 = dist + PLZ;
    const sw = k.swipe || (k.hit.has('left') ? 'left' : k.hit.has('right') ? 'right' : k.hit.has('up') || k.hit.has('a') ? 'up' : k.hit.has('down') ? 'down' : null);
    if (sw === 'left' && lane > -1) { lane--; k.sfx('click'); } if (sw === 'right' && lane < 1) { lane++; k.sfx('click'); }
    if ((sw === 'up' || k.tap) && py === 0) { pvy = 1700; k.sfx('jump'); } if (sw === 'down' && py > 0) pvy = Math.min(pvy, -2600);
    const tx = LX[lane + 1]; lean = k.clamp((tx - px) * 3, -1, 1); px += (tx - px) * Math.min(1, dt * 14);
    const air = py > 0; pvy -= 4200 * dt; py = Math.max(0, py + pvy * dt); if (py === 0) { if (air && pvy < -900) { puff(W / 2, PLY, 'rgba(255,255,255,.6)', 5, 0, -30); k.sfx('pop'); } pvy = 0; }
    score += adv / 100; inv -= dt;
    eachSeg(z0, z0 + adv, (s) => { for (const it of s.items) { if (it.hit || Math.abs(px - it.x) > (it.t === 'coin' ? 0.31 : 0.22)) continue;
      if (it.t === 'coin') { if (py > 260) continue; it.hit = true; coins++; score += 25; k.sfx('coin'); k.burst(W / 2, PLY - 50 - py * 0.16, '#ffd23f', 8, 120); }
      else if (it.t === 'ramp') { it.hit = true; pvy = 2400; score += 50; k.sfx('jump'); k.float('+50', W / 2, PLY - 110, '#f2d15c'); }
      else if (inv <= 0 && ((it.t === 'block' && py < 380) || (it.t === 'bar' && py < 110))) { it.hit = true; inv = 1.6 / k.D.dmg; lives--; speed *= 0.5; lastHit = { t: it.t, py, x: it.x, px }; hitT = 0.3; k.sfx('hurt'); k.shake(8); k.flash('rgba(255,60,80,.35)'); k.burst(W / 2, PLY - 40, '#fff', 14, 200);
        if (lives <= 0) return k.lose(CFG.id, Math.floor(score), 'Chocaste', `${Math.floor(score)} m · ${coins} monedas`); }
      else if (it.t === 'bar' && !it.hit) { it.hit = true; score += 10; } } });
    if (k.st !== 'play') return;
    eachSeg(z0 - SEG * 8, z0 - SEG * 5, (s) => { s.items = s.items.filter((q) => q.t === 'deco'); });
    dist += adv; pos = dist % len; placeRows(); skyX += segAt(pos + PLZ).curve * dt * 60;
  }
}, () => {
  const t = time;
  c.drawImage(BG.sky, 0, 0, W, H); drawLayer(BG.far, -skyX * 0.25); drawLayer(BG.near, -skyX * 0.6);
  const base = segAt(pos), bp = (pos % SEG) / SEG, camY = CAMH + hAt(pos + PLZ), N = segs.length;
  let x = 0, dx = -base.curve * bp; const pr = [];
  for (let n = 0; n <= DRAW; n++) { const s = segs[(base.i + n) % N], loop = base.i + n >= N ? len : 0;
    const z1 = s.z1 - (pos - loop), z2 = s.z2 - (pos - loop), s1 = CAMD / Math.max(1, z1), s2 = CAMD / Math.max(1, z2);
    pr.push({ s, z1, z2, x1: W / 2 + s1 * (x - px * RW) * W / 2, y1: HY - s1 * (s.y1 - camY) * YS, w1: s1 * RW * W / 2, x2: W / 2 + s2 * (x + dx - px * RW) * W / 2, y2: HY - s2 * (s.y2 - camY) * YS, w2: s2 * RW * W / 2 }); x += dx; dx += s.curve; }
  const quad = (x1, y1, w1, x2, y2, w2, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x1 - w1, y1); c.lineTo(x1 + w1, y1); c.lineTo(x2 + w2, y2); c.lineTo(x2 - w2, y2); c.fill(); };
  const lanes = M === 'lanes' ? [-0.33, 0.33] : [0]; let playerDone = false;
  for (let n = DRAW - 1; n >= 0; n--) { const p = pr[n], s = p.s; if (p.z2 <= 1) continue;
    if (p.y2 < p.y1 && p.y2 < H) { const f = Math.min(NF - 1, Math.floor(Math.pow(n / DRAW, 1.4) * NF)), alt = Math.floor(s.i / 3) % 2;
      c.fillStyle = GR[alt][f]; c.fillRect(0, p.y2, W, p.y1 - p.y2 + 1);
      if (TH === 'neon' && alt && s.i % 3 === 0) { c.fillStyle = 'rgba(255,43,214,.45)'; c.fillRect(0, p.y1 - 1, W, Math.max(1, p.w1 * 0.006)); }
      if (TH === 'skate' && s.i % 2 === 0) { c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, p.y1 - 1, W, Math.max(1, p.w1 * 0.004)); }
      quad(p.x1, p.y1, p.w1 * 1.14, p.x2, p.y2, p.w2 * 1.14, RU[alt][f]); quad(p.x1, p.y1, p.w1, p.x2, p.y2, p.w2, RD[alt][f]);
      if (alt) for (const lx of lanes) quad(p.x1 + p.w1 * lx, p.y1, p.w1 * 0.022, p.x2 + p.w2 * lx, p.y2, p.w2 * 0.022, LN[f]);
      if (s.i === GS && M === 'race') for (let q = 0; q < 8; q++) quad(p.x1 + p.w1 * (-0.875 + q * 0.25), p.y1, p.w1 * 0.125, p.x2 + p.w2 * (-0.875 + q * 0.25), p.y2, p.w2 * 0.125, q % 2 ? '#fff' : '#1a1530');
      for (const it of s.items) if (it.t === 'boost') { quad(p.x1 + p.w1 * it.x, p.y1, p.w1 * 0.15, p.x2 + p.w2 * it.x, p.y2, p.w2 * 0.15, '#1a1530'); quad(p.x1 + p.w1 * it.x, p.y1, p.w1 * 0.12, p.x2 + p.w2 * it.x, p.y2, p.w2 * 0.12, Math.floor(t * 8 + s.i) % 2 ? '#2bf0ff' : '#b8fbff'); } }
    // sprites del segmento (orden de pintor: lo cercano tapa lo lejano)
    const fade = n > DRAW * 0.8 ? (DRAW - n) / (DRAW * 0.2) : 1; if (fade < 1) c.globalAlpha = fade;
    for (const it of s.items) { if (it.t === 'boost' || p.z1 < 60) continue; let img = null, wy = 0, ww = it.w;
      if (it.t === 'deco') img = SPR[PAL.deco[it.kind]]; else if (it.t === 'chev') img = it.dir > 0 ? SPR.chevR : SPR.chevL; else if (it.t === 'gate') img = SPR.gate;
      else if (it.t === 'coin') { if (it.hit) continue; img = SPR.coin; wy = 0.12; ww = it.w * Math.max(0.2, Math.abs(Math.cos(t * 5 + it.ph))); }
      else if (!(it.hit && it.t !== 'bar')) img = SPR[it.t];
      if (!img) continue; const near = p.z1 < PLZ ? Math.max(0, (p.z1 - 200) / (PLZ - 200)) : 1; if (near <= 0) continue; if (near < 1) c.globalAlpha = near * fade; const w = p.w1 * ww, h = p.w1 * it.w * img.height / img.width; if (w < 0.6) continue;
      c.drawImage(img, p.x1 + p.w1 * it.x - w / 2, p.y1 - h - p.w1 * wy, w, h); c.globalAlpha = fade; }
    for (const cr of cars) { const off = ((cr.z - s.z1) % len + len) % len; if (off >= SEG || p.z1 < 80) continue;
      const f = off / SEG, sx = p.x1 + (p.x2 - p.x1) * f, sy = p.y1 + (p.y2 - p.y1) * f, sw = p.w1 + (p.w2 - p.w1) * f, w = sw * CW * (TH === 'canyon' ? 0.95 : 1), h = w * cr.img.height / cr.img.width;
      c.drawImage(cr.img, sx + sw * cr.x - w / 2, sy - h + (Math.sin(t * 20 + cr.base) > 0.9 ? -1 : 0), w, h); }
    c.globalAlpha = 1;
    if (!playerDone && p.z1 <= PLZ) { playerDone = true; drawPlayer(); }
  }
  if (!playerDone) drawPlayer();
  for (const q of fx) { c.globalAlpha = Math.max(0, q.life * 1.6); c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill(); } c.globalAlpha = 1;
  // líneas de velocidad (turbo)
  if (boost > 0 || (M === 'lanes' && speed > maxSpeed * 1.6)) { c.strokeStyle = boost > 0 ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i < 14; i++) { const a = Math.random() * 6.283, r0 = W * (0.35 + Math.random() * 0.2), r1 = r0 + 40 + Math.random() * 80; c.moveTo(W / 2 + Math.cos(a) * r0, HY + Math.sin(a) * r0 * 0.7); c.lineTo(W / 2 + Math.cos(a) * r1, HY + Math.sin(a) * r1 * 0.7); } c.stroke(); }
  hud();
});
/* ---------- Jugador ---------- */
function drawPlayer() {
  const pct = speed / maxSpeed, t = time;
  if (M === 'race') { const img = SPR.player, w = TH === 'canyon' ? 150 : 170, h = w * img.height / img.width, jig = pct > 0.05 ? Math.sin(t * 50) * pct * 0.8 : 0, y = PLY + bump + jig;
    c.save(); c.translate(W / 2, y); c.rotate(lean * 0.05 + drift * lean * 0.09); if (hitT > 0) c.translate(Math.sin(t * 90) * 4, 0);
    c.drawImage(img, -w / 2, -h, w, h);
    const brake = k.held.has('down') || k.held.has('b') || (!k.held.has('up') && !k.held.has('a') && !k.ptr.down && speed > 50);
    if (brake && TH !== 'canyon') { c.fillStyle = 'rgba(255,60,80,.55)'; for (const sx of [-0.64, 0.64]) { c.beginPath(); c.ellipse(sx * w / 2 * 0.95, -h * 0.4, 18, 10, 0, 0, 6.283); c.fill(); } }
    if (boost > 0 || drift > 0.5) for (const sx of [-0.22, 0.22]) { const fl = 10 + Math.random() * 10; c.fillStyle = '#ff8a3d'; c.beginPath(); c.ellipse(sx * w, -h * 0.12, 7, fl, 0, 0, 6.283); c.fill(); c.fillStyle = '#fff3a0'; c.beginPath(); c.ellipse(sx * w, -h * 0.14, 3.5, fl * 0.55, 0, 0, 6.283); c.fill(); }
    c.restore(); return; }
  const air = py > 0, y = PLY - py * 0.16, shs = Math.max(0.4, 1 - py / 900);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(W / 2, PLY, 30 * shs, 8 * shs, 0, 0, 6.283); c.fill();
  if (inv > 0 && Math.floor(inv * 12) % 2) return;
  c.save(); c.translate(W / 2, y); c.rotate(lean * 0.18); c.lineJoin = 'round';
  if (TH === 'skate') skater(t, air); else voxelGuy(t, air); c.restore();
}
/* Corredor: un cuerpo, no cajas apiladas. Brazos y piernas son partes del MISMO trazado
 * (se mueven, pero pertenecen a la silueta); solo la tabla del patinador va suelta. */
function voxelGuy(t, air) {
  const ph = air ? 0 : Math.sin(t * 16), a = air ? 9 : Math.max(0, ph * 9), b = air ? 5 : Math.max(0, -ph * 9);
  const leg = (x, lift) => (q) => { rp(q, x, -32, 13, 32 - lift, 4); rp(q, x - 2, -8 - lift, 17, 8, 3); };
  const arm = (x, sw) => (q) => { rp(q, x, -58 + sw, 10, 28, 4); rp(q, x - 0.5, -34 + sw, 11, 9, 4); };
  const torso = (q) => { q.moveTo(-17, -26); q.lineTo(-16, -54); q.quadraticCurveTo(-16, -59, -10, -59); q.lineTo(10, -59); q.quadraticCurveTo(16, -59, 16, -54); q.lineTo(17, -26); q.closePath(); };
  const head = (q) => rp(q, -15, -89, 30, 32, 6);
  const P = [[arm(-25, -b * 0.6), '#2f93c9'], [arm(16, -a * 0.6), '#2f93c9'], [leg(-15, a), '#3b4a8c'], [leg(3, b), '#3b4a8c'], [torso, '#3fc1ff'], [head, '#ffd1a3']];
  uni(c, P, 1.15);
  inw(c, all(P.map((q) => q[0])), (q) => {
    q.fillStyle = 'rgba(0,0,0,.26)'; q.fillRect(-26, -60, 52, 4);                    // sombra propia bajo el cuello
    q.fillStyle = 'rgba(0,0,0,.22)'; q.fillRect(-26, -28, 52, 3.5);                  // cadera
    q.fillStyle = vgrad(q, -90, 0, 'rgba(255,255,255,.22)', 'rgba(0,0,0,.24)'); q.fillRect(-30, -90, 60, 92);
    q.fillStyle = 'rgba(0,0,0,.22)'; q.fillRect(6, -59, 11, 34);
    q.fillStyle = '#5a3a22'; q.beginPath(); rp(q, -16, -90, 32, 16, 6); q.fill(); q.fillStyle = '#7a5232'; q.beginPath(); rp(q, -14, -88, 28, 7, 4); q.fill();
    q.fillStyle = OUT; q.beginPath(); q.ellipse(-6, -70, 2, 2.6, 0, 0, 6.283); q.ellipse(6, -70, 2, 2.6, 0, 0, 6.283); q.fill();
    q.fillStyle = 'rgba(0,0,0,.3)'; q.fillRect(-18, -10 - a, 18, 3); q.fillRect(1, -10 - b, 18, 3); });
}
function skater(t, air) { const wob = Math.sin(t * 3) * 0.08, kick = air ? Math.sin(t * 9) * 0.25 : 0;
  c.save(); c.rotate(kick);                                                          // la tabla gira por su cuenta: pieza aparte
  const wheels = (q) => { ep(q, -18, -3, 5.5, 5.5); ep(q, 18, -3, 5.5, 5.5); };
  const deck = (q) => { rp(q, -29, -17, 58, 8, 4); rp(q, -9, -11, 18, 5, 2); };
  uni(c, [[wheels, '#f4f1e6'], [deck, '#3a2a4a']], 1.15);
  inw(c, deck, (q) => { q.fillStyle = '#ff5f7a'; q.fillRect(-21, -15.5, 42, 2.4); q.fillStyle = 'rgba(255,255,255,.2)'; q.fillRect(-29, -17, 58, 1.6); });
  c.restore();
  const crouch = air ? 6 : 0;
  const leg = (x) => (q) => { rp(q, x, -46 + crouch, 13, 33 - crouch, 5); rp(q, x - 2, -19, 17, 8, 3.5); };
  const body = (q) => { q.moveTo(-17, -14); q.lineTo(-17, -32); q.quadraticCurveTo(-17, -46, 0, -46); q.quadraticCurveTo(17, -46, 17, -32); q.lineTo(17, -14); q.closePath(); };
  const arm = (s2) => { const ang = s2 * (1.1 + Math.sin(t * 3 + s2) * 0.15), ox = s2 * 13, oy = -66 + crouch;
    const ex = ox + Math.sin(ang) * 24, ey = oy + Math.cos(ang) * 24;
    return (q) => { q.moveTo(ox - 4.5, oy); q.lineTo(ex - 4.5, ey); q.arc(ex, ey, 4.5, Math.atan2(ey - oy, ex - ox) - Math.PI / 2 + Math.PI, Math.atan2(ey - oy, ex - ox) - Math.PI / 2, true); q.lineTo(ox + 4.5, oy); q.closePath(); ep(q, ex, ey, 5, 5); }; };
  const head = (q) => { ep(q, 0, -76 + crouch, 12.5, 12.5); rp(q, -13, -84 + crouch, 26, 13, 6); };
  const P = [[arm(-1), '#ff6fa8'], [arm(1), '#ff6fa8'], [leg(-18), '#3b4a8c'], [leg(5), '#3b4a8c'], [body, '#ff6fa8'], [head, '#ffd1a3']];
  uni(c, P, 1.15);
  inw(c, all(P.map((q) => q[0])), (q) => {
    q.fillStyle = vgrad(q, -90, -8, 'rgba(255,255,255,.22)', 'rgba(0,0,0,.24)'); q.fillRect(-46, -90, 92, 84);
    q.fillStyle = 'rgba(0,0,0,.24)'; q.fillRect(-26, -47 + crouch, 52, 3.5); q.fillRect(-26, -16, 52, 3);
    q.fillStyle = '#e0508d'; q.beginPath(); rp(q, -12, -46 + crouch, 24, 11, 5); q.fill();
    q.fillStyle = '#3fc1ff'; q.beginPath(); q.arc(0, -79 + crouch, 13, Math.PI, 0); q.fill(); q.fillStyle = 'rgba(0,0,0,.22)'; q.fillRect(-14, -72 + crouch, 28, 3);
    q.fillStyle = OUT; q.beginPath(); q.ellipse(-4, -74 + crouch, 1.8, 2.4, 0, 0, 6.283); q.ellipse(5, -74 + crouch, 1.8, 2.4, 0, 0, 6.283); q.fill(); });
}
/* ---------- HUD ---------- */
function hud() {
  if (M === 'race') {
    label(`Vuelta ${Math.min(3, lap)}/3`, 12, 10, 18); label(`${time.toFixed(1)} s`, 12, 34, 14, '#d8d4f0');
    label(`${place}º`, W - 44, 6, 34, place === 1 ? '#f2d15c' : '#fff', 'right'); label('/7', W - 12, 20, 16, '#d8d4f0', 'right');
    // velocímetro
    const cx = 62, cy = H - 18, r = 44, v = Math.min(1.35, speed / maxSpeed);
    c.fillStyle = 'rgba(26,21,48,.75)'; c.beginPath(); c.arc(cx, cy, r + 6, Math.PI, 0); c.closePath(); c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(cx, cy, r - 4, Math.PI, 0); c.stroke();
    c.strokeStyle = boost > 0 ? '#2bf0ff' : v > 0.85 ? '#ff5f7a' : '#f2d15c'; c.beginPath(); c.arc(cx, cy, r - 4, Math.PI, Math.PI + Math.PI * Math.min(1, v / 1.35)); c.stroke();
    const na = Math.PI + Math.PI * Math.min(1, v / 1.35); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(na) * (r - 12), cy + Math.sin(na) * (r - 12)); c.stroke();
    label(`${Math.round(speed / 50)}`, cx, cy - 26, 16, '#fff', 'center'); label('km/h', cx + r + 10, cy - 16, 11, '#d8d4f0');
    if (drift > 0.5) label('DERRAPE', W / 2, 44, 22, '#2bf0ff', 'center');
    if (cd > -0.9 && M === 'race' && k.st === 'play') { const n = Math.ceil(cd); c.fillStyle = 'rgba(26,21,48,.85)'; RR(c, W / 2 - 70, 60, 140, 44, 14); c.fill();
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(W / 2 - 40 + i * 40, 82, 13, 0, 6.283); FO(c, cd <= 0 ? '#7cf7a0' : i < 4 - n ? '#ff4d6d' : '#3a3358', 2.5); }
      label(cd > 0 ? String(n) : '¡YA!', W / 2, 112, 34, cd > 0 ? '#fff' : '#7cf7a0', 'center'); }
  } else {
    label(`${Math.floor(score)}`, 14, 10, 28); ART.coin(c, 24, 58, time, 9); label(`${coins}`, 40, 48, 18, '#ffe27a');
    for (let i = 0; i < LIVES; i++) ART.heart(c, W - 22 - i * 28, 26, 1.5, i < lives);
    if (time < 3 && k.st === 'play') { c.globalAlpha = Math.min(1, 3 - time); label('Desliza para cambiar de carril', W / 2, H * 0.3, 17, '#fff', 'center'); label('Toca para saltar', W / 2, H * 0.3 + 26, 17, '#fff', 'center'); c.globalAlpha = 1; }
  }
}
