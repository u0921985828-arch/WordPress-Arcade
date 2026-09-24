/* Minigolf con arte propio. CFG.mode: 'walls' (Mini Golf 3D: recorridos con paredes de madera) | 'island' (Putt Island: isla rodeada de agua)
 * | 'party' (Minigolf Party: 1–4 por turnos en horizontal, molinos, cintas y rampas sobre estanques; ver partyMain al final)
 * 9 hoyos, par 3, máximo 8 golpes por hoyo. Arrastra hacia atrás (desde cualquier punto) o flechas + A. Vista previa del primer tramo del tiro. */
const M = CFG.mode, PARTY = M === 'party', OUT = ART.OUT, R2 = 6.2832, W = PARTY ? 640 : 360, H = PARTY ? 360 : 640, T = PARTY ? 29 : 30, COLS = PARTY ? 22 : 12, ROWS = PARTY ? 11 : 20, OY = PARTY ? 40 : 22, MAXS = PARTY ? 6 : 8, PAR = 3;
const k = Kit({ w: W, h: H, title: CFG.title, bg: M === 'island' ? '#1d6fb3' : '#23402b' }), c = k.ctx;
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
    const ns = M === 'island' ? Math.min(6, 2 + holeN) : holeN >= 4 ? 4 : 0;
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
      if (r < 0.22) { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px, py + 9, 14, 5, 0, 0, R2); g.fill(); g.beginPath(); g.arc(px - 7, py, 8, 0, R2); g.arc(px + 7, py, 8, 0, R2); g.arc(px, py - 6, 9, 0, R2); ART.fillOut(g, '#3f8a45', 2); g.fillStyle = '#5bb05f'; g.beginPath(); g.arc(px - 3, py - 9, 3.5, 0, R2); g.fill(); }
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
  if (dh < 16 && dh > 0.5 && s2 < 260) { b.vx += (hole[0] - b.x) / dh * 260 * h; b.vy += (hole[1] - b.y) / dh * 260 * h; } // el borde de la copa atrae la bola lenta
  if (dh < 9 && s2 < 420) return 'hole';
  return null;
}
function bump(v) { if (v > 60 && t - lastBump > 0.06) { lastBump = t; k.sfx('click'); if (v > 300) k.shake(2); } }
function shoot(a, p) { ball.vx = Math.cos(a) * p * 900; ball.vy = Math.sin(a) * p * 900; strokes++; lastPos = [ball.x, ball.y]; state = 'roll'; k.sfx(p > 0.7 ? 'shoot' : 'click'); k.burst(ball.x, ball.y + OY + 4, '#b6f0a0', 5, 50); }
function endHole(n, txt, col) { strokes = n; card[holeN - 1] = n; total += n; pars += PAR; state = 'sink'; stT = 1.6; msg = txt; msgT = 1.6; if (col) k.float(txt, W / 2, 250, col); }
function holeName(n) { return n === 1 ? '¡Hoyo en uno!' : n === PAR - 2 ? '¡Eagle!' : n === PAR - 1 ? '¡Birdie!' : n === PAR ? 'Par' : n === PAR + 1 ? 'Bogey' : `+${n - PAR}`; }
reset(); k.show(CFG.title, M === 'island' ? 'Arrastra hacia atrás para golpear (o ← → apuntar, ↑ ↓ fuerza, A golpear). Si cae al agua: +1 golpe. 9 hoyos, par 3, máximo 8 golpes.' : 'Arrastra hacia atrás para apuntar y golpear (o ← → apuntar, ↑ ↓ fuerza, A golpear). Rebota en las paredes. 9 hoyos, par 3, máximo 8 golpes.');
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
  const [hx, hy] = hole; c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(hx, hy + 1, 14, 11, 0, 0, R2); c.fill();
  c.beginPath(); c.ellipse(hx, hy, 11, 9, 0, 0, R2); ART.fillOut(c, '#101018', 2.5); c.fillStyle = '#3a3a48'; c.beginPath(); c.ellipse(hx, hy - 3, 9, 5, 0, Math.PI, R2); c.fill();
  // setas rebotadoras
  for (const o of bumpers) { const s = 1 + o.p * 0.25; c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(o.x + 3, o.y + 6, o.r, o.r * 0.55, 0, 0, R2); c.fill();
    c.beginPath(); c.arc(o.x, o.y, o.r * s, 0, R2); ART.fillOut(c, o.p > 0.3 ? '#ff9fb2' : '#ff5f7a', 2.5); c.beginPath(); c.arc(o.x, o.y, o.r * 0.55 * s, 0, R2); ART.fillOut(c, '#ffe0e7', 2); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(o.x - 5 * s, o.y - 6 * s, 3, 0, R2); c.fill(); }
  // bola
  if (ball.splash && state === 'splash') { const e = 1 - stT / 0.8; c.strokeStyle = `rgba(255,255,255,${1 - e})`; c.lineWidth = 3; c.beginPath(); c.ellipse(ball.splash[0], ball.splash[1], 6 + e * 26, 4 + e * 16, 0, 0, R2); c.stroke(); }
  if (ball.a > 0 && ball.s > 0.02) { const r = ball.r * ball.s, bx = ball.x, by = ball.y;
    if (state !== 'sink') { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(bx + 3, by + 4, r * 1.05, r * 0.7, 0, 0, R2); c.fill(); }
    c.beginPath(); c.arc(bx, by, r, 0, R2); ART.fillOut(c, '#ffffff', 2); if (r > 3.5) { c.fillStyle = '#d7dbe6'; c.beginPath(); c.arc(bx, by, r - 1, 0.2, 2.6); c.arc(bx - 1.5, by - 1.5, r - 2, 2.6, 0.2, true); c.fill();
    c.fillStyle = 'rgba(160,165,185,.7)'; for (const [ox, oy] of [[1.5, 1], [-1.5, 2.2], [2.8, -1.8]]) c.fillRect(bx + ox * r / 7 - 0.6, by + oy * r / 7 - 0.6, 1.2, 1.2); c.fillStyle = '#fff'; c.beginPath(); c.arc(bx - r * 0.35, by - r * 0.4, r * 0.28, 0, R2); c.fill(); } }
  // bandera ondeante (se aparta cuando la bola está cerca)
  const near = Math.hypot(ball.x - hx, ball.y - hy) < 50 && state !== 'sink'; c.save(); c.translate(hx, hy); if (near) c.translate(0, -8); c.globalAlpha = near ? 0.55 : 1;
  ART.rr(c, -1.8, -50, 3.6, 50, 1.5); ART.fillOut(c, '#f2f2f7', 1.5); c.beginPath(); c.moveTo(1.8, -50); const wv = Math.sin(t * 5) * 3; c.quadraticCurveTo(12, -47 + wv, 24, -44 + wv * 0.6); c.quadraticCurveTo(12, -39 - wv, 1.8, -34); c.closePath(); ART.fillOut(c, '#ff4d5e', 2);
  c.fillStyle = '#fff'; c.font = '800 9px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(holeN, 10, -42 + wv * 0.3); c.restore();
  // guía de tiro: vista previa del recorrido (hasta el primer rebote) + medidor de fuerza
  let aimA = null, aimP = 0;
  if (state === 'aim' && aiming && k.ptr.down) { const dx = k.ptr.sx - k.ptr.x, dy = k.ptr.sy - k.ptr.y; aimP = Math.min(1, Math.hypot(dx, dy) / 150); if (aimP > 0.05) aimA = Math.atan2(dy, dx); }
  else if (state === 'aim' && kb) { aimA = kAng; aimP = kPow; }
  if (aimA !== null) { const col = `hsl(${120 - aimP * 120} 90% 60%)`, sim = { x: ball.x, y: ball.y, vx: Math.cos(aimA) * aimP * 900, vy: Math.sin(aimA) * aimP * 900, r: ball.r }; let bounces = 0;
    c.fillStyle = '#fff'; for (let i = 0; i < 90; i++) { let r = null; for (let j = 0; j < 3; j++) { r = step(sim, 1 / 180, false) || r; } if (r === 'bounce') bounces++; if (r === 'water' || r === 'hole' || bounces > 1 || Math.hypot(sim.vx, sim.vy) < 5) break; if (i % 4 === 0) { c.globalAlpha = 0.95 * (1 - i / 110); c.beginPath(); c.arc(sim.x, sim.y, Math.max(1.5, 3.6 - i / 50), 0, R2); ART.fillOut(c, '#fff', 1.2); } }
    c.globalAlpha = 1; c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.arc(ball.x, ball.y, 17, -Math.PI / 2, -Math.PI / 2 + aimP * R2); c.stroke(); c.strokeStyle = col; c.lineWidth = 4; c.stroke();
    // palo de golf detrás de la bola
    c.save(); c.translate(ball.x, ball.y); c.rotate(aimA); const pull = 12 + aimP * 26; ART.rr(c, -pull - 8, -7, 7, 14, 2); ART.fillOut(c, '#c7ccd8', 2); c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(-pull - 8, 0); c.lineTo(-pull - 60, 18); c.stroke(); c.strokeStyle = '#9aa2b5'; c.lineWidth = 2; c.stroke(); c.restore(); }
  c.restore();
  // HUD
  panel(8, 6, 118, 42); label(`Hoyo ${holeN}/9`, 18, 11, 17); label(`Par ${PAR} · máx. ${MAXS}`, 18, 31, 11, '#b8f0a8');
  panel(W - 126, 6, 118, 42); label(`Golpes ${strokes}`, W - 18, 11, 17, strokes >= 6 ? '#ff9a9a' : '#f2d15c', 'right'); const diff = total - pars; label(`Total ${total} (${diff > 0 ? '+' : ''}${diff})`, W - 18, 31, 11, '#e6e1ff', 'right');
  // tarjeta de puntuación
  panel(8, H - 38, W - 16, 34); for (let i = 0; i < 9; i++) { const x = 16 + i * 37.5, v = card[i], cur = i === holeN - 1; ART.rr(c, x, H - 33, 32, 24, 6); c.fillStyle = v === undefined ? (cur ? 'rgba(242,209,92,.25)' : 'rgba(255,255,255,.08)') : v < PAR ? '#3aa845' : v === PAR ? '#4b6fd6' : '#c9474f'; c.fill(); if (cur) { c.lineWidth = 2; c.strokeStyle = '#f2d15c'; c.stroke(); }
    label(v === undefined ? String(i + 1) : String(v), x + 16, H - 29, v === undefined ? 11 : 15, v === undefined ? 'rgba(255,255,255,.55)' : '#fff', 'center'); }
  if (msgT > 0) { const e = Math.min(1, (1.6 - msgT) / 0.18), s = 0.6 + 0.4 * e + Math.sin(Math.min(1, e) * Math.PI) * 0.15; c.save(); c.translate(W / 2, 290); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, -20, 36, msg.startsWith('¡') ? '#f2d15c' : '#fff', 'center'); c.restore(); c.globalAlpha = 1; }
});
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function panel(x, y, w, h) { ART.rr(c, x, y, w, h, 10); c.fillStyle = 'rgba(26,21,48,.72)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.14)'; c.stroke(); }

/* ¿la puntuación supera el récord guardado? (se consulta antes de que k.best lo actualice; mismo aviso que k.end) */
function NREC(s) { let b = 0; try { b = +localStorage.getItem('best:' + CFG.id) || 0; } catch (e) {} if (s > b && b > 0) { k.confetti(); k.sfx('win'); return '<b style="color:#ffd166">¡Nuevo récord!</b><br>'; } return ''; }
