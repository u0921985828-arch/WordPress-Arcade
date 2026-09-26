/* Minigolf con arte propio. CFG.mode: 'walls' (Mini Golf 3D: recorridos con paredes de madera) | 'island' (Putt Island: isla rodeada de agua)
 * | 'party' (Minigolf Party: 1–4 por turnos en horizontal, molinos, cintas y rampas sobre estanques; ver partyMain al final)
 * 9 hoyos, par 3, máximo 8 golpes por hoyo. Arrastra hacia atrás (desde cualquier punto) o flechas + A. Vista previa del primer tramo del tiro. */
const M = CFG.mode, PARTY = M === 'party', OUT = ART.OUT, R2 = 6.2832, W = PARTY ? 640 : 360, H = PARTY ? 360 : 640, T = PARTY ? 29 : 30, COLS = PARTY ? 22 : 12, ROWS = PARTY ? 11 : 20, OY = PARTY ? 40 : 22, MAXS0 = PARTY ? 6 : 8, PAR = 3;
const k = Kit({ w: W, h: H, title: CFG.title, bg: M === 'island' ? '#1d6fb3' : '#23402b' }), c = k.ctx;
/* Dificultad seleccionable: en normal life=0, rate=1 y cpu=0 → todo queda igual que siempre. */
const MAXS = MAXS0 + k.D.life, DC = k.D.cpu;
const TOPR = 2; // primera fila jugable: la franja superior queda libre para el marcador (la bandera no se tapa)
let grid, ball, hole, tee, holeN, strokes, total, pars, aiming, sunkT, lastPos, bumpers, sand, card, state, stT, course, kAng, kPow, kb, t = 0, msg, msgT, lastBump = 0;
function genHole() {
  for (let tries = 0; tries < 100; tries++) {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); bumpers = []; sand = new Set();
    const rooms = []; let cx = k.ri(2, 8), cy = 16; const nr = holeN <= 2 ? 3 : k.ri(3, 4);
    for (let i = 0; i < nr; i++) { const w = k.ri(3, 5), h = k.ri(3, 5); const x = k.clamp(cx - Math.floor(w / 2), 1, COLS - 1 - w), y = k.clamp(cy - Math.floor(h / 2), TOPR, ROWS - 1 - h); rooms.push([x, y, w, h]); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) grid[yy][xx] = 1;
      const [nx, ny] = [k.clamp(cx + k.ri(-5, 5), 2, COLS - 3), k.clamp(cy - k.ri(4, 6), TOPR, ROWS - 3)]; const sx = Math.sign(nx - cx), sy = Math.sign(ny - cy); let x2 = cx, y2 = cy; while (x2 !== nx) { grid[y2][x2] = grid[y2][x2 + 1] = 1; x2 += sx; } while (y2 !== ny) { grid[y2][x2] = grid[y2][x2 + 1 < COLS ? x2 + 1 : x2] = 1; y2 += sy; } cx = nx; cy = ny; }
    const first = rooms[0], last = rooms[rooms.length - 1]; tee = [(first[0] + first[2] / 2) * T, (first[1] + first[3] - 0.7) * T]; hole = [(last[0] + last[2] / 2) * T, (last[1] + 0.8) * T];
    if (Math.hypot(tee[0] - hole[0], tee[1] - hole[1]) < 200) continue;
    for (let i = 0; i < 1 + Math.floor(holeN / 3); i++) { const r = k.pick(rooms.slice(1, -1).length ? rooms.slice(1, -1) : rooms); const bx = (r[0] + k.rnd(1, r[2] - 1)) * T, by = (r[1] + k.rnd(1, r[3] - 1)) * T; if (Math.hypot(bx - hole[0], by - hole[1]) > 60 && Math.hypot(bx - tee[0], by - tee[1]) > 60) bumpers.push({ x: bx, y: by, r: 14, p: 0 }); }
    // búnkeres de arena: siempre en la isla, desde el hoyo 4 en paredes (nunca bajo el tee ni el hoyo)
    const ns = Math.round((M === 'island' ? Math.min(5, 1 + Math.floor(holeN * 0.67)) : holeN >= 5 ? 3 : 0) * k.D.rate);
    for (let i = 0; i < ns; i++) { const x = k.ri(0, COLS - 1), y = k.ri(0, ROWS - 1); if (grid[y][x] && Math.hypot((x + 0.5) * T - tee[0], (y + 0.5) * T - tee[1]) > 40 && Math.hypot((x + 0.5) * T - hole[0], (y + 0.5) * T - hole[1]) > 40) sand.add(x + ',' + y); }
    return;
  }
}
function place() { ball = { x: tee[0], y: tee[1], vx: 0, vy: 0, r: 7, s: 1, a: 1 }; lastPos = [...tee]; strokes = 0; sunkT = 0; state = 'aim'; kAng = Math.atan2(hole[1] - tee[1], hole[0] - tee[0]); kPow = 0.5; buildCourse(); }
function reset() { holeN = 1; total = 0; pars = 0; card = []; msg = ''; msgT = 0; kb = false; genHole(); place(); }
const isG = (x, y) => y >= 0 && y < ROWS && x >= 0 && x < COLS && grid[y][x] > 0; // 1 césped, 2 agua (solo party)
const solid = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || !grid[ty][tx]; };
const isWall = (x, y) => !isG(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => isG(x + dx, y + dy));
const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7 + holeN * 17.3) * 43758.5; return v - Math.floor(v); };
function uni(g, parts, ow) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = ow * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); } }
const all = (parts) => (g) => { for (const p of parts) p(g); };
function inw(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
const rp = (g, x, y, w, h, r) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const cp = (g, x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); g.closePath(); };
const ep2 = (g, x, y, rx, ry, rot) => { g.moveTo(x + rx * Math.cos(rot || 0), y + rx * Math.sin(rot || 0)); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.closePath(); };
const ply = (pts) => (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
/* hueso de ancho variable: baja por un costado, redondea la punta y vuelve por el otro, así
 * miembro y tronco se unen con tangente continua y sin escalón. */
function bone(pts, ws) {
  return (g) => {
    const n = pts.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i > 0 ? i - 1 : 0], b = pts[i < n - 1 ? i + 1 : n - 1];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
      L.push([pts[i][0] - ty * ws[i], pts[i][1] + tx * ws[i]]);
      R.push([pts[i][0] + ty * ws[i], pts[i][1] - tx * ws[i]]);
    }
    g.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(L[i][0], L[i][1], (L[i][0] + L[i + 1][0]) / 2, (L[i][1] + L[i + 1][1]) / 2);
    g.lineTo(L[n - 1][0], L[n - 1][1]);
    const e = pts[n - 1], w = ws[n - 1], a0 = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
    g.arc(e[0], e[1], w, a0, a0 - Math.PI, true);
    for (let i = n - 2; i > 0; i--) g.quadraticCurveTo(R[i][0], R[i][1], (R[i][0] + R[i - 1][0]) / 2, (R[i][1] + R[i - 1][1]) / 2);
    g.lineTo(R[0][0], R[0][1]);
    g.closePath();
  };
}
/* ---------- Recorrido cacheado a 2× (césped con franjas, paredes, agua, arena) ---------- */
function buildCourse() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = ROWS * T * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const cells = (fn) => { for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) fn(x, y); };
  if (M === 'island') {
    const gr = g.createLinearGradient(0, 0, 0, ROWS * T); gr.addColorStop(0, '#2a8bd0'); gr.addColorStop(1, '#16589a'); g.fillStyle = gr; g.fillRect(0, 0, W, ROWS * T);
    // sombra del agua bajo la isla, contorno y playa (unión de rectángulos redondeados)
    g.fillStyle = 'rgba(10,40,90,.35)'; cells((x, y) => { if (isG(x, y)) { ART.rr(g, x * T - 8, y * T - 2, T + 16, T + 16, 10); g.fill(); } });
    g.fillStyle = 'rgba(160,230,255,.35)'; cells((x, y) => { if (isG(x, y)) { ART.rr(g, x * T - 12, y * T - 12, T + 24, T + 24, 14); g.fill(); } });
    g.strokeStyle = OUT; g.lineWidth = 5; cells((x, y) => { if (isG(x, y)) { ART.rr(g, x * T - 7, y * T - 7, T + 14, T + 14, 10); g.stroke(); } });
    g.fillStyle = '#f1d88c'; cells((x, y) => { if (isG(x, y)) { ART.rr(g, x * T - 7, y * T - 7, T + 14, T + 14, 10); g.fill(); } });
    g.fillStyle = '#d9b865'; cells((x, y) => { if (isG(x, y)) for (let i = 0; i < 5; i++) g.fillRect(x * T - 5 + hr(x + i, y) * (T + 10), y * T - 5 + hr(y + i, x) * (T + 10), 1.6, 1.6); });
    g.strokeStyle = OUT; g.lineWidth = 3; cells((x, y) => { if (isG(x, y)) { ART.rr(g, x * T - 1, y * T - 1, T + 2, T + 2, 5); g.stroke(); } });
  } else {
    g.fillStyle = '#2b4a31'; g.fillRect(0, 0, W, ROWS * T);
    for (let i = 0; i < 420; i++) { g.fillStyle = i % 2 ? '#34583a' : '#243f2a'; g.fillRect(hr(i, 1) * W, hr(i, 2) * ROWS * T, 2, 3); }
    // arbustos y flores en las zonas libres
    cells((x, y) => { if (isG(x, y) || isWall(x, y)) return; const r = hr(x, y); const px = x * T + 15, py = y * T + 17;
      if (r < 0.22) { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px, py + 9, 14, 5, 0, 0, R2); g.fill();
        const L = (q) => cp(q, px - 7, py, 8), Rr = (q) => cp(q, px + 7, py, 8), Tp = (q) => cp(q, px, py - 6, 9), Tr = (q) => rp(q, px - 2.6, py + 2, 5.2, 9, 2);
        uni(g, [[Tr, '#6b4a2a'], [L, '#3f8a45'], [Rr, '#3f8a45'], [Tp, '#3f8a45']], 1.6);
        inw(g, all([Tr, L, Rr, Tp]), (q) => { q.fillStyle = '#5bb05f'; q.beginPath(); cp(q, px - 3, py - 9, 5.5); q.fill(); q.fillStyle = 'rgba(20,60,25,.20)'; q.beginPath(); rp(q, px - 16, py + 3, 32, 14, 6); q.fill(); }); }
      else if (r < 0.4) for (let i = 0; i < 3; i++) { const fx = x * T + 5 + hr(x + i, y + 3) * 20, fy = y * T + 5 + hr(x, y + i + 7) * 20; g.fillStyle = ['#ff8fb3', '#fff1a8', '#ffffff'][i]; g.beginPath(); for (let j = 0; j < 5; j++) g.arc(fx + Math.cos(j * 1.256) * 2.6, fy + Math.sin(j * 1.256) * 2.6, 1.8, 0, R2); g.fill(); g.fillStyle = '#f2b705'; g.fillRect(fx - 1, fy - 1, 2, 2); } });
  }
  // césped: franjas diagonales + moteado
  g.save(); g.beginPath(); cells((x, y) => { if (isG(x, y)) g.rect(x * T, y * T, T, T); }); g.clip();
  g.fillStyle = '#58bb55'; g.fillRect(0, 0, W, ROWS * T); g.fillStyle = '#4eae4d';
  for (let i = -30; i < 30; i++) { g.beginPath(); g.moveTo(i * 36, 0); g.lineTo(i * 36 + 18, 0); g.lineTo(i * 36 + 18 + ROWS * T * 0.6, ROWS * T); g.lineTo(i * 36 + ROWS * T * 0.6, ROWS * T); g.fill(); }
  for (let i = 0; i < 900; i++) { g.fillStyle = i % 3 ? 'rgba(20,80,20,.18)' : 'rgba(255,255,255,.12)'; g.fillRect(hr(i, 5) * W, hr(i, 9) * ROWS * T, 1.5, 2.5); }
  // sombras interiores junto a los bordes
  g.fillStyle = 'rgba(0,0,0,.16)'; cells((x, y) => { if (!isG(x, y)) return; if (!isG(x, y - 1)) g.fillRect(x * T, y * T, T, 7); if (!isG(x - 1, y)) g.fillRect(x * T, y * T, 5, T); });
  // arena
  for (const s of sand) { const [x, y] = s.split(',').map(Number); ART.rr(g, x * T + 2, y * T + 2, T - 4, T - 4, 9); ART.fillOut(g, '#ecd28a', 2); g.fillStyle = '#d0b066'; for (let i = 0; i < 6; i++) g.fillRect(x * T + 6 + hr(x + i, y) * 18, y * T + 6 + hr(y + i, x) * 18, 2, 2); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x * T + 7, y * T + 5, T - 14, 2); }
  if (PARTY) partyCourse(g);
  g.restore();
  // tee: alfombrilla
  ART.rr(g, tee[0] - 16, tee[1] - 12, 32, 24, 5); ART.fillOut(g, '#2f7d3a', 2); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.setLineDash([3, 3]); ART.rr(g, tee[0] - 12, tee[1] - 8, 24, 16, 3); g.stroke(); g.setLineDash([]);
  if (M !== 'island') {
    // paredes de madera en 3/4: tapa clara + frente visible hacia el césped
    cells((x, y) => { if (!isWall(x, y)) return; const px = x * T, py = y * T, face = !isWall(x, y + 1), fh = face ? 9 : 0;
      g.fillStyle = '#c98a4b'; g.fillRect(px, py, T, T - fh); g.fillStyle = 'rgba(120,70,30,.35)'; g.fillRect(px, py + (T - fh) / 2, T, 1.2);
      g.fillStyle = 'rgba(255,230,180,.35)'; if (!isWall(x, y - 1)) g.fillRect(px, py + 2, T, 3);
      if (face) { g.fillStyle = '#7a4a26'; g.fillRect(px, py + T - fh, T, fh); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(px, py + T - 3, T, 3); } });
    g.strokeStyle = OUT; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath();
    cells((x, y) => { if (!isWall(x, y)) return; const px = x * T, py = y * T;
      if (!isWall(x, y - 1)) { g.moveTo(px, py); g.lineTo(px + T, py); } if (!isWall(x, y + 1)) { g.moveTo(px, py + T); g.lineTo(px + T, py + T); g.moveTo(px, py + T - 9); g.lineTo(px + T, py + T - 9); }
      if (!isWall(x - 1, y)) { g.moveTo(px, py); g.lineTo(px, py + T); } if (!isWall(x + 1, y)) { g.moveTo(px + T, py); g.lineTo(px + T, py + T); } });
    g.stroke();
  }
  course = cv;
}
/* ---------- Física: un subpaso. real=false para la vista previa ---------- */
function step(b, h, real) { // real: true = bola en juego (efectos), false = vista previa (para en el primer rebote), 'sim' = simulación de la CPU
  const key = Math.floor(b.x / T) + ',' + Math.floor(b.y / T), air = PARTY && b.air > 0, inSand = !air && sand.has(key), fr = air ? 0.3 : inSand ? 3.4 : 1.05; b.vx -= b.vx * fr * h; b.vy -= b.vy * fr * h;
  const sp = Math.hypot(b.vx, b.vy); if (sp > 0 && sp < 30) { const f = Math.max(0, sp - 28 * h) / sp; b.vx *= f; b.vy *= f; }
  if (PARTY) { const r = partyStep(b, h, real, key, air); if (r) return r; }
  if (M === 'island') { b.x += b.vx * h; b.y += b.vy * h; if (solid(b.x, b.y)) return 'water'; }
  else { b.x += b.vx * h; if (solid(b.x + Math.sign(b.vx) * b.r, b.y)) { b.x -= b.vx * h; b.vx *= -0.8; if (real) { if (real === true) bump(Math.abs(b.vx)); } else return 'bounce'; }
    b.y += b.vy * h; if (solid(b.x, b.y + Math.sign(b.vy) * b.r)) { b.y -= b.vy * h; b.vy *= -0.8; if (real) { if (real === true) bump(Math.abs(b.vy)); } else return 'bounce'; }
    if (PARTY && !(b.air > 0)) { const q = grid[Math.floor(b.y / T)]; if (q && q[Math.floor(b.x / T)] === 2) return 'water'; } }
  for (const o of bumpers) { const d = Math.hypot(b.x - o.x, b.y - o.y); if (d < o.r + b.r) { const nx = (b.x - o.x) / d, ny = (b.y - o.y) / d, vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 2 * vn * nx * 1.05; b.vy -= 2 * vn * ny * 1.05; if (real) { if (real === true) { o.p = 1; k.sfx('pop'); k.burst(o.x + nx * o.r, o.y + ny * o.r + OY, '#ffc2cf', 6, 80); } } else return 'bounce'; } b.x = o.x + nx * (o.r + b.r); b.y = o.y + ny * (o.r + b.r); } }
  const dh = Math.hypot(b.x - hole[0], b.y - hole[1]), s2 = Math.hypot(b.vx, b.vy);
  if (PARTY) { const r = millStep(b, real); if (r) return r; }
  if (dh < 19 && dh > 0.5 && s2 < 300) { b.vx += (hole[0] - b.x) / dh * 300 * h; b.vy += (hole[1] - b.y) / dh * 300 * h; } // 1.23: copa algo más amable (16→19) // el borde de la copa atrae la bola lenta
  if (dh < 10.5 && s2 < 480) return 'hole';
  return null;
}
function bump(v) { if (v > 60 && t - lastBump > 0.06) { lastBump = t; k.sfx('click'); if (v > 300) k.shake(2); } }
function shoot(a, p) { ball.vx = Math.cos(a) * p * 900; ball.vy = Math.sin(a) * p * 900; strokes++; lastPos = [ball.x, ball.y]; state = 'roll'; k.sfx(p > 0.7 ? 'shoot' : 'click'); k.burst(ball.x, ball.y + OY + 4, '#b6f0a0', 5, 50); }
function endHole(n, txt, col) { strokes = n; card[holeN - 1] = n; total += n; pars += PAR; state = 'sink'; stT = 1.6; msg = txt; msgT = 1.6; if (col) k.float(txt, W / 2, 250, col); }
function holeName(n) { return n === 1 ? '¡Hoyo en uno!' : n === PAR - 2 ? '¡Eagle!' : n === PAR - 1 ? '¡Birdie!' : n === PAR ? 'Par' : n === PAR + 1 ? 'Bogey' : `+${n - PAR}`; }
if (!PARTY) { reset(); k.show(CFG.title, M === 'island' ? 'Arrastra hacia atrás para golpear (o ← → apuntar, ↑ ↓ fuerza, A golpear). Si cae al agua: +1 golpe. 9 hoyos, par 3, máximo 8 golpes.' : 'Arrastra hacia atrás para apuntar y golpear (o ← → apuntar, ↑ ↓ fuerza, A golpear). Rebota en las paredes. 9 hoyos, par 3, máximo 8 golpes.');
k.run((dt) => {
  t += dt; msgT -= dt; for (const o of bumpers) o.p = Math.max(0, o.p - dt * 4);
  if (!k.gate(reset)) return;
  if (state === 'sink') { ball.s = Math.max(0, ball.s - dt * 4); stT -= dt;
    if (stT <= 0) { if (holeN >= 9) { const diff = total - pars; k.st = 'over'; const sc = Math.max(0, 100 - diff * 5), nr = NREC(sc), b = k.best(CFG.id, sc); k.show(diff <= 0 ? '¡Recorrido completado!' : 'Recorrido completado', `${nr}${total} golpes (${diff > 0 ? '+' : ''}${diff} sobre par) · Récord ${b}<br>Toca para jugar otra vez`); return; }
      holeN++; genHole(); place(); ball.s = 0; state = 'intro'; stT = 0.5; k.sfx('start'); } return; }
  if (state === 'intro') { stT -= dt; ball.s = Math.min(1, 1 - stT / 0.5); if (stT <= 0) { ball.s = 1; state = 'aim'; } return; }
  if (state === 'splash') { stT -= dt; if (stT <= 0) { ball.x = lastPos[0]; ball.y = lastPos[1]; ball.vx = ball.vy = 0; ball.a = 1; k.sfx('pop'); k.burst(ball.x, ball.y + OY, '#fff', 8, 60);
      if (strokes >= MAXS) endHole(MAXS, 'Máximo de golpes', '#ff9a9a'); else state = 'aim'; } return; }
  if (state === 'aim') {
    if (k.ptr.hit) aiming = true;
    if (aiming && k.ptr.up) { aiming = false; const dx = k.ptr.sx - k.ptr.x, dy = k.ptr.sy - k.ptr.y, p = Math.min(1, Math.hypot(dx, dy) / 150); if (p > 0.05) shoot(Math.atan2(dy, dx), p); }
    if (k.held.has('left')) { kAng -= 1.8 * dt; kb = true; } if (k.held.has('right')) { kAng += 1.8 * dt; kb = true; }
    if (k.held.has('up')) { kPow = Math.min(1, kPow + 0.7 * dt); kb = true; } if (k.held.has('down')) { kPow = Math.max(0.08, kPow - 0.7 * dt); kb = true; }
    if (k.hit.has('a')) shoot(kAng, kPow);
    return;
  }
  // rodando
  const steps = 6; for (let s = 0; s < steps; s++) { const r = step(ball, dt / steps, true);
    if (r === 'water') { strokes++; state = 'splash'; stT = 0.8; ball.a = 0; ball.vx = ball.vy = 0; navigator.vibrate && navigator.vibrate(60); k.burst(ball.x, ball.y + OY, '#bfe8ff', 18, 140); k.float('+1 agua', ball.x, ball.y - 10, '#bfe8ff'); ball.splash = [ball.x, ball.y]; return; }
    if (r === 'hole') { ball.x = hole[0]; ball.y = hole[1]; ball.vx = ball.vy = 0; const n = strokes; endHole(n, holeName(n)); k.sfx(n < PAR ? 'win' : 'coin'); if (n < PAR) k.confetti(); k.burst(hole[0], hole[1] + OY, '#fff6a8', 16, 120); navigator.vibrate && navigator.vibrate(30); return; } }
  if (Math.hypot(ball.vx, ball.vy) < 5) { ball.vx = ball.vy = 0; if (strokes >= MAXS) endHole(MAXS, 'Máximo de golpes', '#ff9a9a'); else { state = 'aim'; kAng = Math.atan2(hole[1] - ball.y, hole[0] - ball.x); } }
}, () => {
  k.clear();
  c.drawImage(course, 0, OY, W, ROWS * T);
  if (M === 'island') { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.lineCap = 'round'; for (let i = 0; i < 26; i++) { const x = hr(i, 3) * W, y = OY + hr(i, 4) * ROWS * T, cx = Math.floor(x / T), cy = Math.floor(y / T); if ([0, 1, -1].some((d) => isG(cx + d, cy) || isG(cx, cy + d))) continue; const o = Math.sin(t * 1.6 + i) * 4; c.globalAlpha = 0.4 + 0.3 * Math.sin(t * 2 + i * 2); c.beginPath(); c.arc(x + o, y, 7, 3.6, 5.8); c.stroke(); } c.globalAlpha = 1; }
  c.save(); c.translate(0, OY);
  // copa
  const [hx, hy] = hole; drawCup();
  // setas rebotadoras
  drawBumpers();
  // bola
  if (ball.splash && state === 'splash') { const e = 1 - stT / 0.8; c.strokeStyle = `rgba(255,255,255,${1 - e})`; c.lineWidth = 3; c.beginPath(); c.ellipse(ball.splash[0], ball.splash[1], 6 + e * 26, 4 + e * 16, 0, 0, R2); c.stroke(); }
  drawBall(ball, state);
  // bandera ondeante (se aparta cuando la bola está cerca)
  drawFlag(Math.hypot(ball.x - hx, ball.y - hy) < 50 && state !== 'sink');
  // guía de tiro: vista previa del recorrido (hasta el primer rebote) + medidor de fuerza
  let aimA = null, aimP = 0;
  if (state === 'aim' && aiming && k.ptr.down) { const dx = k.ptr.sx - k.ptr.x, dy = k.ptr.sy - k.ptr.y; aimP = Math.min(1, Math.hypot(dx, dy) / 150); if (aimP > 0.05) aimA = Math.atan2(dy, dx); }
  else if (state === 'aim' && kb) { aimA = kAng; aimP = kPow; }
  drawGuide(ball, aimA, aimP);
  c.restore();
  // HUD
  panel(8, 6, 118, 42); label(`Hoyo ${holeN}/9`, 18, 11, 17); label(`Par ${PAR} · máx. ${MAXS}`, 18, 31, 11, '#b8f0a8');
  panel(W - 126, 6, 118, 42); label(`Golpes ${strokes}`, W - 18, 11, 17, strokes >= 6 ? '#ff9a9a' : '#f2d15c', 'right'); const diff = total - pars; label(`Total ${total} (${diff > 0 ? '+' : ''}${diff})`, W - 18, 31, 11, '#e6e1ff', 'right');
  // tarjeta de puntuación
  panel(8, H - 38, W - 16, 34); for (let i = 0; i < 9; i++) { const x = 16 + i * 37.5, v = card[i], cur = i === holeN - 1; ART.rr(c, x, H - 33, 32, 24, 6); c.fillStyle = v === undefined ? (cur ? 'rgba(242,209,92,.25)' : 'rgba(255,255,255,.08)') : v < PAR ? '#3aa845' : v === PAR ? '#4b6fd6' : '#c9474f'; c.fill(); if (cur) { c.lineWidth = 2; c.strokeStyle = '#f2d15c'; c.stroke(); }
    label(v === undefined ? String(i + 1) : String(v), x + 16, H - 29, v === undefined ? 11 : 15, v === undefined ? 'rgba(255,255,255,.55)' : '#fff', 'center'); }
  if (msgT > 0) { const e = Math.min(1, (1.6 - msgT) / 0.18), s = 0.6 + 0.4 * e + Math.sin(Math.min(1, e) * Math.PI) * 0.15; c.save(); c.translate(W / 2, 290); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, -20, 36, msg.startsWith('¡') ? '#f2d15c' : '#fff', 'center'); c.restore(); c.globalAlpha = 1; }
}); }
/* ---------- Piezas de dibujo compartidas (se llaman con el contexto ya desplazado OY) ---------- */
function drawCup() {
  const [hx, hy] = hole; c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(hx, hy + 1, 14, 11, 0, 0, R2); c.fill();
  c.beginPath(); c.ellipse(hx, hy, 11, 9, 0, 0, R2); ART.fillOut(c, '#101018', 2.5); c.fillStyle = '#3a3a48'; c.beginPath(); c.ellipse(hx, hy - 3, 9, 5, 0, Math.PI, R2); c.fill();
}
function drawBumpers() {
  for (const o of bumpers) { const s = 1 + o.p * 0.25; c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(o.x + 3, o.y + 6, o.r, o.r * 0.55, 0, 0, R2); c.fill();
    const D = (q) => cp(q, o.x, o.y, o.r * s);
    uni(c, [[D, o.p > 0.3 ? '#ff9fb2' : '#ff5f7a']], 1.25);
    inw(c, D, (q) => { q.fillStyle = 'rgba(120,20,50,.22)'; q.beginPath(); cp(q, o.x, o.y + 1.6, o.r * 0.6 * s); q.fill();
      q.fillStyle = '#ffe0e7'; q.beginPath(); cp(q, o.x, o.y, o.r * 0.55 * s); q.fill();
      q.fillStyle = 'rgba(255,255,255,.7)'; q.beginPath(); cp(q, o.x - 5 * s, o.y - 6 * s, 3); q.fill(); }); }
}
function drawBall(ball, state, col) {
  if (ball.a > 0 && ball.s > 0.02) { const z = ball.air > 0 ? Math.sin(Math.PI * (1 - ball.air / ball.airT)) * 16 : 0, r = ball.r * ball.s * (1 + z / 50), bx = ball.x, by = ball.y - z;
    if (state !== 'sink') { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(bx + 3 + z * 0.4, ball.y + 4, r * 1.05, r * 0.7, 0, 0, R2); c.fill(); }
    c.beginPath(); c.arc(bx, by, r, 0, R2); ART.fillOut(c, col || '#ffffff', 2); if (r > 3.5) { c.fillStyle = col ? ART.dark(col, 0.16) : '#d7dbe6'; c.beginPath(); c.arc(bx, by, r - 1, 0.2, 2.6); c.arc(bx - 1.5, by - 1.5, r - 2, 2.6, 0.2, true); c.fill();
    c.fillStyle = 'rgba(160,165,185,.7)'; for (const [ox, oy] of [[1.5, 1], [-1.5, 2.2], [2.8, -1.8]]) c.fillRect(bx + ox * r / 7 - 0.6, by + oy * r / 7 - 0.6, 1.2, 1.2); c.fillStyle = '#fff'; c.beginPath(); c.arc(bx - r * 0.35, by - r * 0.4, r * 0.28, 0, R2); c.fill(); } }
}
function drawFlag(near) {
  const [hx, hy] = hole; c.save(); c.translate(hx, hy); if (near) c.translate(0, -8); c.globalAlpha = near ? 0.55 : 1;
  const wv = Math.sin(t * 5) * 3;
  const mast = (q) => rp(q, -1.8, -50, 3.6, 50, 1.5);
  const pano = (q) => { q.moveTo(-0.6, -50); q.quadraticCurveTo(12, -47 + wv, 24, -44 + wv * 0.6); q.quadraticCurveTo(12, -39 - wv, -0.6, -34); q.closePath(); };
  uni(c, [[pano, '#ff4d5e'], [mast, '#f2f2f7']], 1.15);
  inw(c, all([mast, pano]), (q) => { q.fillStyle = 'rgba(120,10,40,.28)'; q.beginPath(); rp(q, -1, -50, 4.4, 50, 1.5); q.fill(); q.fillStyle = 'rgba(0,0,0,.16)'; q.beginPath(); rp(q, -1.8, -6, 3.6, 6, 1.5); q.fill(); });
  c.fillStyle = '#fff'; c.font = '800 9px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(holeN, 10, -42 + wv * 0.3); c.restore();
}
function drawGuide(b, aimA, aimP) {
  if (aimA !== null) { const ball = b; const col = `hsl(${120 - aimP * 120} 90% 60%)`, sim = { x: ball.x, y: ball.y, vx: Math.cos(aimA) * aimP * 900, vy: Math.sin(aimA) * aimP * 900, r: ball.r }; let bounces = 0;
    c.fillStyle = '#fff'; for (let i = 0; i < 90; i++) { let r = null; for (let j = 0; j < 3; j++) { r = step(sim, 1 / 180, false) || r; } if (r === 'bounce') bounces++; if (r === 'water' || r === 'hole' || bounces > 1 || Math.hypot(sim.vx, sim.vy) < 5) break; if (i % 4 === 0) { c.globalAlpha = 0.95 * (1 - i / 110); c.beginPath(); c.arc(sim.x, sim.y, Math.max(1.5, 3.6 - i / 50), 0, R2); ART.fillOut(c, '#fff', 1.2); } }
    c.globalAlpha = 1; c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.arc(ball.x, ball.y, 17, -Math.PI / 2, -Math.PI / 2 + aimP * R2); c.stroke(); c.strokeStyle = col; c.lineWidth = 4; c.stroke();
    // palo de golf detrás de la bola
    c.save(); c.translate(ball.x, ball.y); c.rotate(aimA); const pull = 12 + aimP * 26;
    const head = (q) => rp(q, -pull - 8, -7, 7, 14, 2), shaft = bone([[-pull - 5, -2], [-pull - 60, 18]], [2.2, 1.6]);
    uni(c, [[shaft, '#9aa2b5'], [head, '#c7ccd8']], 1.15);
    inw(c, all([head, shaft]), (q) => { q.fillStyle = 'rgba(30,30,60,.2)'; q.beginPath(); rp(q, -pull - 8, 2, 7, 5, 2); q.fill(); });
    c.restore(); }
}
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function panel(x, y, w, h) { ART.rr(c, x, y, w, h, 10); c.fillStyle = 'rgba(26,21,48,.72)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.14)'; c.stroke(); }

/* ¿la puntuación supera el récord guardado? (se consulta antes de que k.best lo actualice; mismo aviso que k.end) */
function NREC(s) { let b = 0; try { b = +localStorage.getItem(k.bkey(CFG.id)) || 0; } catch (e) {} if (s > b && b > 0) { k.confetti(); k.sfx('win'); return '<b style="color:#ffd166">¡Nuevo récord!</b><br>'; } return ''; }

/* ================= Minigolf Party (CFG.mode 'party') =================
 * 1–4 jugadores por turnos (rotación entre quienes no han embocado), 9 hoyos en horizontal que van de izquierda a derecha.
 * Obstáculos: molinos (aspas que giran y empujan), cintas transportadoras, rampas de salto sobre estanques (+1 si caes al agua), setas y arena.
 * Mando: ← → gira la flecha (acelera al mantener), ↑ ↓ ajuste fino, A mantenido = fuerza que sube y baja; se suelta para golpear (B cancela).
 * La CPU prueba ~300 golpes con el mismo simulador (incluye el giro de los molinos) y elige el que deja la bola más cerca por el camino;
 * su error de puntería baja con su nivel (cpu:<id>, sube cuando le ganas y baja cuando pierdes). Todos los generadores dejan un camino seco al hoyo. */
let belts = new Map(), ramps = new Map(), mills = [], dmap = null;
const BELT = 300;
function partyStep(b, h, real, key, air) {
  if (real !== true) b.t = (b.t || 0) + h;
  if (air) { b.air -= h; if (b.air <= 0) { b.air = 0; if (real === true) { k.sfx('hit'); k.burst(b.x, b.y + OY + 4, '#d8f5c8', 6, 60); } } return null; }
  const bt = belts.get(key); if (bt) { b.vx += bt[0] * BELT * h; b.vy += bt[1] * BELT * h; }
  const rp = ramps.get(key);
  if (rp && b.vx * rp[0] + b.vy * rp[1] > 120) { const s = Math.hypot(b.vx, b.vy), ns = Math.max(s, 340); b.vx *= ns / s; b.vy *= ns / s; b.air = b.airT = 0.2 + ns / 1600; if (real === true) k.sfx('jump'); }
  return null;
}
function millStep(b, real) {
  for (const m of mills) { const d0 = Math.hypot(b.x - m.x, b.y - m.y); if (d0 > m.L + b.r + 4) continue;
    const ang = m.a0 + m.sp * (t + (real === true ? 0 : b.t || 0));
    if (d0 < 10 + b.r && d0 > 0.01) { const nx = (b.x - m.x) / d0, ny = (b.y - m.y) / d0, vn = b.vx * nx + b.vy * ny; b.x = m.x + nx * (10 + b.r); b.y = m.y + ny * (10 + b.r); if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; if (!real) return 'bounce'; if (real === true) bump(-vn); } continue; }
    for (let i = 0; i < 4; i++) { const th = ang + i * Math.PI / 2, ux = Math.cos(th), uy = Math.sin(th), s = (b.x - m.x) * ux + (b.y - m.y) * uy; if (s < 0 || s > m.L) continue;
      const px = m.x + ux * s, py = m.y + uy * s, dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy); if (d >= b.r + 3 || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d, vpx = -uy * m.sp * s, vpy = ux * m.sp * s, vn = (b.vx - vpx) * nx + (b.vy - vpy) * ny;
      b.x = px + nx * (b.r + 3); b.y = py + ny * (b.r + 3);
      if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; if (!real) return 'bounce'; if (real === true && t - lastBump > 0.08) { lastBump = t; k.sfx('hit'); k.shake(1.5); } } } }
  return null;
}
/* estanques y rampas dentro del césped (lienzo del recorrido, ya recortado al césped) */
function partyCourse(g) {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (grid[y][x] !== 2) continue; const px = x * T, py = y * T;
    g.fillStyle = '#8c8676'; g.fillRect(px, py, T, T);
    ART.rr(g, px + 2, py + 1, T - 4, T - 2, 8); const gr = g.createLinearGradient(0, py, 0, py + T); gr.addColorStop(0, '#2372c0'); gr.addColorStop(1, '#3b9be6'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.6; g.beginPath(); g.arc(px + 9 + hr(x, y) * 8, py + 10 + hr(y, x) * 8, 4, 3.6, 5.8); g.stroke(); g.beginPath(); g.arc(px + 18, py + 21, 3, 3.6, 5.8); g.stroke(); }
  for (const [kk, d] of ramps) { const [x, y] = kk.split(',').map(Number), px = x * T, py = y * T;
    const gr = g.createLinearGradient(px, 0, px + T, 0); gr.addColorStop(0, '#9a5f2e'); gr.addColorStop(1, '#e7a862'); ART.rr(g, px + 1, py + 1, T - 2, T - 2, 4); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = 'rgba(255,240,210,.45)'; for (let i = 0; i < 3; i++) g.fillRect(px + 4 + i * 8, py + 3, 2, T - 6);
    g.fillStyle = '#fff'; g.strokeStyle = OUT; g.lineWidth = 1.6; g.beginPath(); g.moveTo(px + 9, py + 8); g.lineTo(px + 20, py + T / 2); g.lineTo(px + 9, py + T - 8); g.lineTo(px + 13, py + T / 2); g.closePath(); g.fill(); g.stroke(); }
}
function partyMain() {
  const LS = 'cpu:' + CFG.id, POW = [0.18, 0.3, 0.42, 0.55, 0.7, 0.85, 1];
  const FEAT = [['bump'], ['belt'], ['mill'], ['ramp'], ['mill', 'sand'], ['belt', 'ramp'], ['mill', 'belt'], ['ramp', 'mill', 'sand'], ['belt', 'ramp', 'mill']];
  let lvl = 0; try { lvl = +localStorage.getItem(LS) || 0; } catch (e) {}
  let PL = [], seats = [], cur = 0, pst = 'intro', stT = 0, started = false, rotV = 0, chg = false, pw = 0, pwPh = 0, aimA = 0, aimT = 0, rollT = 0, ai = null, drag = false, cardSkip = 0;
  const cellOf = (x, y) => Math.floor(x / T) + ',' + Math.floor(y / T);
  const far = (x, y, d) => Math.hypot((x + 0.5) * T - tee[0], (y + 0.5) * T - tee[1]) > d && Math.hypot((x + 0.5) * T - hole[0], (y + 0.5) * T - hole[1]) > d;
  function bfs(fromX, fromY, pass) { const D = Array.from({ length: ROWS }, () => Array(COLS).fill(-1)), q = [[fromX, fromY]]; D[fromY][fromX] = 0;
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || D[ny][nx] >= 0 || !pass(grid[ny][nx])) continue; D[ny][nx] = D[y][x] + 1; q.push([nx, ny]); } }
    return D; }
  function genP() {
    const feats = FEAT[holeN - 1] || FEAT[8];
    for (let tries = 0; tries < 400; tries++) {
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); bumpers = []; sand = new Set(); belts = new Map(); ramps = new Map(); mills = [];
      const rooms = []; let cx = k.ri(2, 3), cy = k.ri(2, ROWS - 3);
      for (;;) { const w = k.ri(3, 5), h = k.ri(3, 5), x = k.clamp(cx - (w >> 1), 1, COLS - 1 - w), y = k.clamp(cy - (h >> 1), 1, ROWS - 1 - h);
        rooms.push([x, y, w, h]); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) grid[yy][xx] = 1;
        if (cx >= COLS - 5) break;
        const nx = k.clamp(cx + k.ri(4, 7), 2, COLS - 3), ny = k.clamp(cy + k.ri(-4, 4), 1, ROWS - 3);
        for (let xx = Math.min(cx, nx); xx <= Math.max(cx, nx); xx++) grid[cy][xx] = grid[cy + 1][xx] = 1;
        for (let yy = Math.min(cy, ny); yy <= Math.max(cy, ny) + 1; yy++) grid[yy][nx] = grid[yy][nx + 1] = 1;
        cx = nx; cy = ny; }
      const f = rooms[0], l = rooms[rooms.length - 1]; tee = [(f[0] + 0.75) * T, (f[1] + f[3] / 2) * T]; hole = [(l[0] + l[2] - 0.75) * T, (l[1] + l[3] / 2) * T];
      if (hole[0] - tee[0] < 360) continue;
      const mid = rooms.slice(1, -1), used = new Set(), occ = new Set(); let ok = true;
      const room = () => { const free = mid.filter((r) => !used.has(r)); const r = k.pick(free.length ? free : mid); used.add(r); return r; };
      for (const ft of feats) {
        if (ft === 'belt') { const r = room(), w2 = r[2] >= 4 ? 2 : 1, x0 = r[0] + k.ri(0, r[2] - w2), dir = k.pick([-1, 1]);
          for (let xx = x0; xx < x0 + w2; xx++) for (let yy = r[1]; yy < r[1] + r[3]; yy++) if (grid[yy][xx] === 1 && far(xx, yy, 45) && !occ.has(xx + ',' + yy)) { belts.set(xx + ',' + yy, [0, dir]); occ.add(xx + ',' + yy); } }
        else if (ft === 'mill') { const r = room(), mx = (r[0] + r[2] / 2) * T, my = (r[1] + r[3] / 2) * T, L = k.clamp(Math.min(r[2], r[3]) * T / 2 - 4, 32, 46);
          if (Math.hypot(mx - tee[0], my - tee[1]) < L + 30 || Math.hypot(mx - hole[0], my - hole[1]) < L + 30 || occ.has(cellOf(mx, my))) { ok = false; break; }
          mills.push({ x: mx, y: my, L, a0: k.rnd(0, R2), sp: k.pick([-1, 1]) * (0.7 + holeN * 0.05) }); occ.add(cellOf(mx, my)); }
        else if (ft === 'ramp') { const r = room(); if (r[2] < 3) { ok = false; break; } const xw = r[0] + k.ri(1, r[2] - 2), top = Math.random() < 0.5, y0 = r[1] + (top ? 1 : 0), y1 = r[1] + r[3] - (top ? 0 : 1);
          for (let yy = y0; yy < y1; yy++) { if (grid[yy][xw] !== 1 || grid[yy][xw - 1] !== 1 || occ.has(xw + ',' + yy) || occ.has(xw - 1 + ',' + yy) || !far(xw, yy, 50) || !far(xw - 1, yy, 40)) continue;
            grid[yy][xw] = 2; ramps.set(xw - 1 + ',' + yy, [1, 0]); occ.add(xw + ',' + yy); occ.add(xw - 1 + ',' + yy); }
          if (!ramps.size) { ok = false; break; } }
        else if (ft === 'sand') for (let i = 0; i < 3; i++) { const x = k.ri(1, COLS - 2), y = k.ri(1, ROWS - 2); if (grid[y][x] === 1 && !occ.has(x + ',' + y) && far(x, y, 45)) { sand.add(x + ',' + y); occ.add(x + ',' + y); } }
      }
      if (!ok) continue;
      const nb = feats.includes('bump') ? 2 : k.ri(0, 1);
      for (let i = 0; i < nb * 4 && bumpers.length < nb; i++) { const r = k.pick(mid.length ? mid : rooms), bx = (r[0] + k.rnd(0.6, r[2] - 0.6)) * T, by = (r[1] + k.rnd(0.6, r[3] - 0.6)) * T;
        if (Math.hypot(bx - hole[0], by - hole[1]) > 60 && Math.hypot(bx - tee[0], by - tee[1]) > 60 && !occ.has(cellOf(bx, by)) && mills.every((m) => Math.hypot(bx - m.x, by - m.y) > m.L + 24)) { bumpers.push({ x: bx, y: by, r: 13, p: 0 }); occ.add(cellOf(bx, by)); } }
      // camino seco garantizado del tee al hoyo (las rampas son un atajo, nunca obligatorias)
      const tx = Math.floor(tee[0] / T), ty = Math.floor(tee[1] / T), hx = Math.floor(hole[0] / T), hy = Math.floor(hole[1] / T);
      if (bfs(tx, ty, (v) => v === 1)[hy][hx] < 0) continue;
      dmap = bfs(hx, hy, (v) => v > 0);
      return;
    }
  }
  const nPl = () => (k.party ? Math.max(2, ...k.party.map((q) => q.p + 1)) : 2);
  const nm = (i) => (seats[i].cpu ? 'CPU' : String(seats[i].name).slice(0, 8));
  function resetP() { seats = k.players(nPl()); PL = seats.map((q) => ({ p: q.p, card: [], tot: 0, n: 0, done: false, b: null, last: null })); holeN = 1; msgT = 0; msg = ''; newHole(); }
  function newHole() { genP(); buildCourse(); const n = PL.length;
    PL.forEach((q, i) => { q.b = { x: tee[0], y: tee[1] + (i - (n - 1) / 2) * 9, vx: 0, vy: 0, r: 7, s: 1, a: 1, air: 0, airT: 1 }; q.n = 0; q.done = false; q.last = [q.b.x, q.b.y]; });
    cur = (holeN - 1) % n; startTurn(); k.sfx('start'); }
  function startTurn() { const B = PL[cur].b; pst = 'intro'; stT = 1.0; aimA = Math.atan2(hole[1] - B.y, hole[0] - B.x); chg = false; pw = 0; aimT = 0; ai = null; rotV = 0; drag = false; }
  function nextTurn() { const n = PL.length; for (let d = 1; d <= n; d++) { const i = (cur + d) % n; if (!PL[i].done) { cur = i; return startTurn(); } } pst = 'card'; stT = 4.5; cardSkip = 0; }
  function shootP(a, p) { const q = PL[cur], B = q.b; p = Math.max(0.05, p); B.vx = Math.cos(a) * p * 900; B.vy = Math.sin(a) * p * 900; q.n++; q.last = [B.x, B.y]; pst = 'roll'; rollT = 0; chg = false;
    k.sfx(p > 0.7 ? 'shoot' : 'click'); k.burst(B.x, B.y + OY + 4, '#b6f0a0', 5, 50); }
  function holeOut(q, n, max) { q.done = true; q.card[holeN - 1] = n; q.tot += n; pst = 'sink'; stT = 1.3; msg = max ? 'Máximo de golpes' : holeName(n); msgT = 1.6;
    if (max) { k.sfx('lose'); q.b.a = 0; } else { k.sfx(n < PAR ? 'win' : 'coin'); if (n < PAR) k.confetti(); k.burst(hole[0], hole[1] + OY, '#fff6a8', 16, 120); } }
  function finishP() { const rows = PL.map((q) => ({ p: q.p, score: q.tot })), hum = seats.filter((q) => !q.cpu);
    if (hum.length === 1 && hum.length < seats.length) { const best = rows.slice().sort((a, b) => a.score - b.score)[0]; lvl = seats[best.p].cpu ? Math.max(0, lvl - 1) : Math.min(5.5, lvl + 0.5); try { localStorage.setItem(LS, lvl); } catch (e) {} }
    k.podium(rows, { asc: true, fmt: (v) => `${v} golpes (${v - 27 > 0 ? '+' : ''}${v - 27})` }); }
  k.onParty = () => { if (PL.length) seats = k.players(PL.length); };
  /* ---- CPU: búsqueda de golpe con el simulador ---- */
  const stopped = (b) => { const sp = Math.hypot(b.vx, b.vy); if (sp < 5) return true; const bt = belts.get(cellOf(b.x, b.y)); return !!bt && sp < 60 && solid(b.x + bt[0] * (b.r + 3), b.y + bt[1] * (b.r + 3)); };
  const distAt = (x, y) => { const r = dmap[Math.floor(y / T)], v = r ? r[Math.floor(x / T)] : -1; return v === undefined || v < 0 ? 3000 : v * T + Math.hypot(x - hole[0], y - hole[1]) * 0.3; };
  function simShot(B, a, p, t0) { const s = { x: B.x, y: B.y, vx: Math.cos(a) * p * 900, vy: Math.sin(a) * p * 900, r: B.r, t: t0, air: 0, airT: 1 };
    for (let i = 0; i < 1300; i++) { const r = step(s, 1 / 180, 'sim'); if (r === 'hole') return -1000 + i * 0.01; if (r === 'water') return distAt(B.x, B.y) + 150; if (!(s.air > 0) && stopped(s)) break; }
    return distAt(s.x, s.y); }
  function cpuAim(dt) { const B = PL[cur].b;
    if (!ai) { ai = { i: 0, top: [], c: [], at: t + 2.4 }; const base = Math.atan2(hole[1] - B.y, hole[0] - B.x);
      for (let d = -3; d <= 3; d++) for (const p of POW) ai.c.push([base + d * 0.05, p]);
      for (let a = 0; a < 36; a++) for (const p of POW) ai.c.push([base + (a + 0.5) * R2 / 36, p]); }
    if (ai.i < ai.c.length) { const t0 = performance.now();
      while (ai.i < ai.c.length && performance.now() - t0 < 6) { const [a, p] = ai.c[ai.i++], sc = simShot(B, a, p, ai.at - t); ai.top.push([a, p, sc]); }
      if (ai.i >= ai.c.length) { ai.top.sort((x, y) => x[2] - y[2]); const lv = k.clamp(lvl + DC, -1.5, 6.5), pool = ai.top.filter((x) => x[2] < ai.top[0][2] + 50).slice(0, lv < 2 ? 3 : 1), ch = k.pick(pool);
        const eA = 0.12 - lv * 0.013, eP = 0.16 - lv * 0.017; /* 1.23: CPU más fallona */ ai.ta = ch[0] + k.rnd(-1, 1) * eA; ai.tp = k.clamp(ch[1] * (1 + k.rnd(-1, 1) * eP), 0.08, 1); ai.ready = true; }
      return; }
    let d = Math.atan2(Math.sin(ai.ta - aimA), Math.cos(ai.ta - aimA)); aimA += Math.sign(d) * Math.min(Math.abs(d), dt * 4);
    chg = true; pw = ai.tp * k.clamp(1 - (ai.at - t) / 0.8, 0, 1);
    if (t >= ai.at) { aimA = ai.ta; shootP(ai.ta, ai.tp); } }
  function humanAim(dt) { const q = PL[cur], p = q.p, B = q.b, Lh = k.pheld(p, 'left'), Rh = k.pheld(p, 'right');
    if (Lh !== Rh) { rotV = Math.min(2.4, rotV + dt * 2.6); aimA += (Rh ? 1 : -1) * (0.35 + rotV) * dt; } else rotV = 0;
    if (k.pheld(p, 'up')) aimA -= 0.28 * dt; if (k.pheld(p, 'down')) aimA += 0.28 * dt;
    if (!chg && k.phit(p, 'a')) { chg = true; pwPh = 0; k.sfx('click'); }
    if (chg) { pwPh += dt / 1.15; const ph = pwPh % 2; pw = Math.max(0.05, ph < 1 ? ph : 2 - ph);
      if (k.phit(p, 'b')) { chg = false; pw = 0; } else if (!k.pheld(p, 'a')) return shootP(aimA, pw); }
    if (!k.party && p === 0) { // móvil: arrastrar hacia atrás desde cualquier punto
      if (k.ptr.hit) drag = true;
      if (drag && k.ptr.down) { const dx = k.ptr.sx - k.ptr.x, dy = k.ptr.sy - k.ptr.y; if (Math.hypot(dx, dy) > 8) aimA = Math.atan2(dy, dx); }
      if (drag && k.ptr.up) { drag = false; const dx = k.ptr.sx - k.ptr.x, dy = k.ptr.sy - k.ptr.y, pp = Math.min(1, Math.hypot(dx, dy) / 150); if (pp > 0.05) return shootP(Math.atan2(dy, dx), pp); } }
    if (aimT > 25 && !chg) shootP(aimA, 0.45); }
  function update(dt) {
    t += dt; msgT -= dt; for (const o of bumpers) o.p = Math.max(0, o.p - dt * 4);
    if (!k.gate(resetP)) return;
    if (!started) { started = true; resetP(); }
    const q = PL[cur], B = q.b;
    if (pst === 'intro') { stT -= dt; if (stT <= 0) pst = 'aim'; return; }
    if (pst === 'aim') { aimT += dt; if (seats[cur].cpu) cpuAim(dt); else humanAim(dt); return; }
    if (pst === 'sink') { B.s = Math.max(0, B.s - dt * 4); stT -= dt; if (stT <= 0) { B.s = 0; nextTurn(); } return; }
    if (pst === 'splash') { stT -= dt; if (stT <= 0) { B.x = q.last[0]; B.y = q.last[1]; B.vx = B.vy = 0; B.a = 1; k.sfx('pop'); k.burst(B.x, B.y + OY, '#fff', 8, 60); if (q.n >= MAXS) holeOut(q, MAXS, true); else nextTurn(); } return; }
    if (pst === 'card') { stT -= dt; cardSkip += dt; const skip = cardSkip > 1 && (seats.some((s) => !s.cpu && k.phit(s.p, 'a')) || (!k.party && k.ptr.hit));
      if (stT <= 0 || skip) { if (holeN >= 9) { pst = 'done'; finishP(); } else { holeN++; newHole(); } } return; }
    if (pst !== 'roll') return;
    rollT += dt;
    for (let s = 0; s < 6; s++) { const r = step(B, dt / 6, true);
      if (r === 'water') { q.n++; pst = 'splash'; stT = 0.8; B.a = 0; B.vx = B.vy = 0; B.air = 0; B.splash = [B.x, B.y]; k.sfx('hurt'); k.burst(B.x, B.y + OY, '#bfe8ff', 18, 140); k.float('+1 agua', B.x, B.y + OY - 10, '#bfe8ff'); return; }
      if (r === 'hole') { B.x = hole[0]; B.y = hole[1]; B.vx = B.vy = 0; B.air = 0; holeOut(q, q.n); return; } }
    if (!(B.air > 0) && (stopped(B) || rollT > 12)) { B.vx = B.vy = 0; if (q.n >= MAXS) holeOut(q, MAXS, true); else nextTurn(); }
  }
  /* ---- dibujo ---- */
  function drawBelts() { for (const [kk, d] of belts) { const [x, y] = kk.split(',').map(Number), px = x * T, py = y * T;
      c.save(); c.beginPath(); c.rect(px, py, T, T); c.clip(); c.fillStyle = '#4a4f63'; c.fillRect(px, py, T, T); c.fillStyle = '#3a3e50'; c.fillRect(px, py, 3, T); c.fillRect(px + T - 3, py, 3, T);
      const o = ((t * 40 * d[1]) % 12 + 12) % 12; c.strokeStyle = '#f2d15c'; c.lineWidth = 3; c.lineCap = 'round';
      for (let yy = py - 12 + o; yy < py + T + 12; yy += 12) { c.beginPath(); c.moveTo(px + 7, yy - d[1] * 4); c.lineTo(px + T / 2, yy + d[1] * 2); c.lineTo(px + T - 7, yy - d[1] * 4); c.stroke(); }
      c.restore(); c.strokeStyle = 'rgba(26,21,48,.6)'; c.lineWidth = 1; c.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1); } }
  function drawMills() { for (const m of mills) { const ang = m.a0 + m.sp * t;
      c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.arc(m.x + 4, m.y + 6, 12, 0, R2); c.fill();
      for (let i = 0; i < 4; i++) { c.save(); c.translate(m.x, m.y); c.rotate(ang + i * Math.PI / 2);
        c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(8, 2, m.L - 8, 8);
        ART.rr(c, 6, -5, m.L - 6, 10, 3); ART.fillOut(c, '#f4efe2', 2); c.strokeStyle = '#9a6a3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(8, 0); c.lineTo(m.L - 2, 0); for (let s = 14; s < m.L - 2; s += 9) { c.moveTo(s, -5); c.lineTo(s, 5); } c.stroke(); c.restore(); }
      c.beginPath(); c.arc(m.x, m.y, 10, 0, R2); ART.fillOut(c, '#d9534f', 2.5); c.beginPath(); c.arc(m.x, m.y, 4, 0, R2); ART.fillOut(c, '#ffd166', 1.5); } }
  function drawCard() {
    c.fillStyle = 'rgba(12,10,28,.72)'; c.fillRect(0, 0, W, H); const n = PL.length, rh = 34, tw = 560, th = 70 + rh * (n + 1), x0 = (W - tw) / 2, y0 = (H - th) / 2;
    ART.rr(c, x0, y0, tw, th, 16); c.fillStyle = '#231d44'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#6e62f5'; c.stroke();
    label(holeN >= 9 ? 'Tarjeta final' : `Tarjeta · tras el hoyo ${holeN}`, W / 2, y0 + 14, 22, '#f2d15c', 'center');
    const cx0 = x0 + 118, cw = 38, hy = y0 + 52; for (let i = 0; i < 9; i++) label(String(i + 1), cx0 + i * cw + cw / 2, hy, 18, i === holeN - 1 ? '#f2d15c' : 'rgba(255,255,255,.6)', 'center'); label('Total', x0 + tw - 20, hy, 18, '#e6e1ff', 'right');
    PL.forEach((q, j) => { const y = hy + rh * (j + 1); c.fillStyle = k.pcol(q.p); c.beginPath(); c.arc(x0 + 26, y + 10, 8, 0, R2); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); label(nm(j), x0 + 40, y, 18, k.pcol(q.p));
      for (let i = 0; i < 9; i++) { const v = q.card[i]; if (v === undefined) continue; const bx = cx0 + i * cw + 3; ART.rr(c, bx, y - 3, cw - 6, 26, 6); c.fillStyle = v < PAR ? '#3aa845' : v === PAR ? '#4b6fd6' : '#c9474f'; c.fill(); label(String(v), bx + (cw - 6) / 2, y, 18, '#fff', 'center'); }
      const d = q.tot - PAR * Math.min(9, q.card.length); label(`${q.tot} (${d > 0 ? '+' : ''}${d})`, x0 + tw - 20, y, 18, '#fff', 'right'); });
    if (cardSkip > 1 && seats.some((s) => !s.cpu)) label(k.party ? 'A: seguir' : 'A o toca: seguir', W / 2, y0 + th - 22, 14, 'rgba(255,255,255,.55)', 'center');
  }
  function draw() {
    k.clear(); c.drawImage(course, 0, OY, W, ROWS * T);
    c.save(); c.translate(0, OY);
    drawBelts(); drawCup(); drawBumpers(); drawMills();
    PL.forEach((q, i) => { if (i === cur || !q.b) return; c.globalAlpha = 0.6; drawBall(q.b, 'x', k.pcol(q.p)); c.globalAlpha = 1; });
    const q = PL[cur]; if (q && q.b) { const B = q.b;
      if (B.splash && pst === 'splash') { const e = 1 - stT / 0.8; c.strokeStyle = `rgba(255,255,255,${1 - e})`; c.lineWidth = 3; c.beginPath(); c.ellipse(B.splash[0], B.splash[1], 6 + e * 26, 4 + e * 16, 0, 0, R2); c.stroke(); }
      if ((pst === 'aim' || pst === 'intro') && B.a) { c.strokeStyle = k.pcol(q.p); c.lineWidth = 3; c.globalAlpha = 0.5 + 0.4 * Math.sin(t * 6); c.beginPath(); c.arc(B.x, B.y, 12 + Math.sin(t * 6) * 2, 0, R2); c.stroke(); c.globalAlpha = 1; }
      drawBall(B, pst, k.pcol(q.p));
      drawFlag(Math.hypot(B.x - hole[0], B.y - hole[1]) < 50 && pst !== 'sink');
      if (pst === 'aim') { if (chg || drag) drawGuide(B, aimA, drag ? Math.min(1, Math.hypot(k.ptr.sx - k.ptr.x, k.ptr.sy - k.ptr.y) / 150) : pw);
        else { c.save(); c.translate(B.x, B.y); c.rotate(aimA); c.fillStyle = k.pcol(q.p); c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(16, -7); c.lineTo(52, -7); c.lineTo(52, -13); c.lineTo(68, 0); c.lineTo(52, 13); c.lineTo(52, 7); c.lineTo(16, 7); c.closePath(); c.fill(); c.stroke(); c.restore(); }
        if (!seats[cur].cpu && aimT > 18) label(String(Math.ceil(25 - aimT)), B.x, B.y - 40, 20, '#ff9a9a', 'center'); } }
    c.restore();
    // barra superior: hoyo, turno y totales
    c.fillStyle = 'rgba(26,21,48,.92)'; c.fillRect(0, 0, W, OY); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, OY - 2, W, 2);
    label(`Hoyo ${holeN}/9 · Par ${PAR}`, 10, 10, 18, '#b8f0a8');
    if (q) { const cx = 262; c.fillStyle = k.pcol(q.p); c.beginPath(); c.arc(cx - 12, 20, 8, 0, R2); c.fill(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke(); label(`${nm(cur)} · golpe ${Math.min(MAXS, q.n + (pst === 'aim' || pst === 'intro' ? 1 : 0))}`, cx, 10, 18, '#fff'); }
    PL.forEach((pq, i) => { const w = 50, x = W - 8 - (PL.length - i) * (w + 4); ART.rr(c, x, 6, w, 28, 7); c.fillStyle = i === cur ? k.pcol(pq.p) : 'rgba(255,255,255,.1)'; c.fill(); c.lineWidth = 2; c.strokeStyle = k.pcol(pq.p); c.stroke();
      label(String(pq.tot + (pq.done ? 0 : pq.n)), x + w / 2, 10, 18, '#fff', 'center'); });
    if (pst === 'intro' && q) { const e = Math.min(1, (1 - stT) / 0.2); c.save(); c.globalAlpha = Math.min(1, stT / 0.25 + 0.2); c.translate(W / 2, H / 2 - 10); c.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e);
      label(q.n === 0 && PL.every((x) => x.n === 0) ? `Hoyo ${holeN}` : 'Turno', 0, -44, 22, '#fff', 'center'); label(seats[cur].cpu ? 'CPU' : nm(cur), 0, -18, 34, k.pcol(q.p), 'center'); c.restore(); }
    if (pst === 'aim' && q && !seats[cur].cpu && holeN <= 2 && aimT < 6) { const s = k.party ? '← → apuntar · mantén A y suelta para golpear' : 'Arrastra hacia atrás · o ← → y mantén A'; ART.rr(c, W / 2 - 230, H - 38, 460, 30, 10); c.fillStyle = 'rgba(26,21,48,.8)'; c.fill(); label(s, W / 2, H - 33, 18, '#fff', 'center'); }
    if (msgT > 0) { const e = Math.min(1, (1.6 - msgT) / 0.18), s = 0.6 + 0.4 * e + Math.sin(Math.min(1, e) * Math.PI) * 0.15; c.save(); c.translate(W / 2, H / 2); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, -20, 36, msg.startsWith('¡') ? '#f2d15c' : '#fff', 'center'); c.restore(); c.globalAlpha = 1; }
    if (pst === 'card') drawCard();
  }
  window.__golf = () => ({ pst, cur, holeN, cpu: !!(seats[cur] && seats[cur].cpu), p: PL[cur] ? PL[cur].p : 0, tot: PL.map((q) => q.tot), n: PL.map((q) => q.n) }); // para pruebas
  resetP();
  k.show(CFG.title, 'Minigolf por turnos para 1–4: nueve hoyos locos con molinos, cintas y rampas sobre estanques. Joystick ← → gira la flecha (↑ ↓ ajuste fino); mantén A y suelta cuando la fuerza sea la justa. Si caes al agua, +1 golpe. Gana quien sume menos golpes.');
  k.run(update, draw);
}
if (PARTY) partyMain();
