/* Carretera pseudo-3D. CFG.mode: 'race' (carreras contra la IA) | 'lanes' (runner de 3 carriles)
 * CFG.theme: 'rally' | 'neon' | 'canyon' | 'voxel' | 'skate' */
const M = CFG.mode, TH = CFG.theme || 'rally', port = M === 'lanes';
const W = port ? 360 : 640, H = port ? 640 : 360;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#000' }), c = k.ctx;
const PAL = { rally: { sky: ['#6fb7ff', '#cfe8ff'], grass: ['#4f9d3a', '#468f33'], rumble: ['#e8e8e8', '#c0392b'], road: ['#6b6b6b', '#646464'], lane: '#fff', hill: '#3d7a2e' },
  neon: { sky: ['#07021a', '#3a0b5c'], grass: ['#0b0620', '#120a2e'], rumble: ['#ff2bd6', '#2bf0ff'], road: ['#16112e', '#1b1538'], lane: '#2bf0ff', hill: '#2a0a4a' },
  canyon: { sky: ['#ff9a5a', '#ffd9a0'], grass: ['#c8743c', '#b86a36'], rumble: ['#fff', '#7a3b1c'], road: ['#8a6a55', '#826350'], lane: '#ffe9c9', hill: '#9c4a24' },
  voxel: { sky: ['#8fd3ff', '#e0f4ff'], grass: ['#7ed957', '#70c94b'], rumble: ['#ffffff', '#ffd23f'], road: ['#5b6ee1', '#5566d6'], lane: '#fff', hill: '#5aa83a' },
  skate: { sky: ['#ffb3c7', '#fff0d6'], grass: ['#9aa0a6', '#8f959b'], rumble: ['#333', '#f2d15c'], road: ['#c9ccd1', '#c1c4c9'], lane: '#555', hill: '#7d8288' } }[TH];
const SEG = 200, RW = port ? 1500 : 2000, DRAW = 110, CAMH = 1000, CAMD = 0.84, PZ = CAMH * CAMD;
let inv = 0, segs, len, pos, speed, px, py, pvy, cars, lap, time, score, lives, lane, maxSpeed, boost, over, place, drift, lastSeg;
function addRoad(n, curve, hill) { const start = segs.length ? segs[segs.length - 1].y2 : 0; for (let i = 0; i < n; i++) { const y1 = start + hill * (1 - Math.cos(Math.PI * i / n)) / 2 * 1, y2 = start + hill * (1 - Math.cos(Math.PI * (i + 1) / n)) / 2; segs.push({ i: segs.length, curve: curve * Math.sin(Math.PI * i / n), y1, y2, items: [] }); } }
function buildTrack() {
  segs = [];
  if (M === 'race') { const R = [[50, 0, 0], [80, 3, 0], [60, 0, 1500], [70, -4, 0], [60, 0, -1500], [90, 5, 800], [50, -2, -800], [80, -5, 0], [60, 0, 1200], [60, 3, -1200], [60, 0, 0]]; for (const [n, cv, hl] of R) addRoad(n * (TH === 'canyon' ? 0.9 : 1), cv * (TH === 'neon' ? 1.3 : 1), hl);
    const last = segs[segs.length - 1].y2; addRoad(30, 0, -last);
    if (TH !== 'rally') for (let i = 40; i < segs.length; i += TH === 'neon' ? 60 : 45) segs[i].items.push({ t: 'boost', x: k.pick([-0.5, 0, 0.5]) }); }
  else { for (let b = 0; b < 30; b++) addRoad(50, k.pick([0, 0, 1.5, -1.5, 2.5, -2.5]), 0); }
  segs.forEach((s) => { s.z1 = s.i * SEG; s.z2 = (s.i + 1) * SEG; }); len = segs.length * SEG;
  for (let i = 0; i < segs.length; i += k.ri(6, 14)) if (M === 'race' || Math.random() < 0.5) segs[i].items.push({ t: 'deco', x: k.pick([-1, 1]) * k.rnd(1.3, 2.2), kind: k.ri(0, 2) });
}
function reset() { buildTrack(); pos = 0; speed = 0; px = 0; py = 0; pvy = 0; lap = 1; time = 0; score = 0; lives = 3; lane = 0; boost = 0; drift = 0; over = false; place = 1; lastSeg = 0;
  maxSpeed = M === 'race' ? (TH === 'neon' ? 13000 : TH === 'canyon' ? 10500 : 12000) : 5200;
  cars = M === 'race' ? Array.from({ length: 6 }, (_, i) => ({ z: (i + 1) * SEG * 4, x: k.pick([-0.6, 0, 0.6]), sp: maxSpeed * (0.72 + i * 0.035), dist: (i + 1) * SEG * 4, col: ['#ff6b6b', '#f2d15c', '#5ce1e6', '#b98cff', '#ffa94d', '#7cf7a0'][i] })) : [];
  if (M === 'lanes') { speed = maxSpeed; for (let i = 45; i < segs.length; i++) if (i % 6 === 0) spawnRow(i); inv = 0; }
}
function spawnRow(i) { const lanesX = [-0.66, 0, 0.66], free = k.ri(0, 2); lanesX.forEach((x, j) => { if (j === free) { if (Math.random() < 0.6) segs[i].items.push({ t: 'coin', x }); return; } const r = Math.random(); if (r < 0.45) segs[i].items.push({ t: 'block', x }); else if (r < 0.75) segs[i].items.push({ t: TH === 'skate' && Math.random() < 0.5 ? 'ramp' : 'bar', x }); else segs[i].items.push({ t: 'coin', x }); }); }
reset(); k.show(CFG.title, CFG.help);
const segAt = (z) => segs[Math.floor(((z % len) + len) % len / SEG)];
k.run((dt) => {
  if (!k.gate(reset)) return;
  time += dt; const pct = speed / maxSpeed, pSeg = segAt(pos + PZ);
  if (M === 'race') {
    const accel = k.held.has('up') || k.held.has('a') || k.ptr.down, brake = k.held.has('down') || k.held.has('b');
    let steer = (k.held.has('left') ? -1 : 0) + (k.held.has('right') ? 1 : 0); if (k.ptr.down) steer = k.clamp((k.ptr.x - W / 2) / (W * 0.25), -1, 1);
    drift = TH === 'neon' && Math.abs(steer) > 0.6 && pct > 0.6 ? Math.min(1, drift + dt) : Math.max(0, drift - dt * 2);
    px += steer * dt * 2.2 * pct * (1 + drift * 0.4); px -= pSeg.curve * pct * pct * dt * 0.33 * (1 - drift * 0.35);
    speed += (accel ? maxSpeed * 0.45 : -maxSpeed * 0.15) * dt; if (brake) speed -= maxSpeed * 0.8 * dt;
    if (Math.abs(px) > 1.1) speed -= speed * 1.6 * dt * (TH === 'canyon' ? 1.4 : 1);
    if (boost > 0) { boost -= dt; speed += maxSpeed * dt; }
    speed = k.clamp(speed, 0, maxSpeed * (boost > 0 ? 1.35 : 1)); px = k.clamp(px, -2.4, 2.4);
    for (const it of pSeg.items) if (it.t === 'boost' && Math.abs(px - it.x) < 0.35) { if (boost <= 0) k.sfx('jump'); boost = 1.2; }
    for (const cr of cars) { cr.dist += cr.sp * dt; cr.z = cr.dist % len; const cs = segAt(cr.z); cr.x = k.clamp(cr.x - cs.curve * 0.002, -0.8, 0.8);
      const rel = ((cr.z - (pos + PZ)) % len + len) % len; if (rel < 160 && Math.abs(cr.x - px) < 0.45 && speed > cr.sp) { speed = cr.sp * 0.8; navigator.vibrate && navigator.vibrate(40); } }
    const my = (lap - 1) * len + pos; place = 1 + cars.filter((cr) => cr.dist > my + PZ).length;
    const oldPos = pos; pos = (pos + speed * dt) % len; if (pos < oldPos) { lap++; if (lap > 3) { over = true; const pts = Math.max(0, 7 - place) * 300 + Math.max(0, 180 - Math.floor(time)) * 10; k.st = 'over'; k.end(CFG.id, pts, place === 1 ? '¡Victoria!' : `Llegaste ${place}º`, `Tiempo ${time.toFixed(1)} s`); } }
  } else {
    speed = Math.min(maxSpeed * 2.2, speed + 60 * dt); pos = (pos + speed * dt) % len;
    const sw = k.swipe || (k.hit.has('left') ? 'left' : k.hit.has('right') ? 'right' : k.hit.has('up') || k.hit.has('a') ? 'up' : null);
    if (sw === 'left') lane = Math.max(-1, lane - 1); if (sw === 'right') lane = Math.min(1, lane + 1); if ((sw === 'up' || k.tap) && py === 0) { pvy = 1500; k.sfx('jump'); }
    px += (lane * 0.66 - px) * Math.min(1, dt * 14); pvy -= 4200 * dt; py = Math.max(0, py + pvy * dt); if (py === 0) pvy = 0;
    score += speed * dt / 100; inv -= dt;
    const si = Math.floor((pos + PZ) / SEG) % segs.length; if (si !== lastSeg) { const ahead = (si + DRAW) % segs.length; if (!segs[ahead].items.some((q) => q.t !== 'deco') && ahead % 6 === 0 && ahead > 40) spawnRow(ahead); lastSeg = si; }
    for (const it of pSeg.items) { if (it.hit || Math.abs(px - it.x) > 0.3) continue;
      if (it.t === 'coin') { it.hit = true; score += 25; k.sfx('coin'); }
      else if (it.t === 'ramp') { it.hit = true; pvy = 2200; score += 50; k.sfx('jump'); }
      else if (inv <= 0 && (it.t === 'block' || (it.t === 'bar' && py < 250))) { it.hit = true; inv = 1.2; lives--; speed *= 0.6; navigator.vibrate && navigator.vibrate(90); if (lives <= 0) return k.lose(CFG.id, Math.floor(score), 'Chocaste', `${Math.floor(score)} m`); } }
    for (let j = 1; j < 4; j++) segs[(si - j + segs.length) % segs.length].items.forEach((q) => { if (q.t !== 'deco') q.hit = false; });
  }
}, () => {
  const g = c.createLinearGradient(0, 0, 0, H / 2); g.addColorStop(0, PAL.sky[0]); g.addColorStop(1, PAL.sky[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = PAL.hill; c.beginPath(); c.moveTo(0, H / 2); for (let x = 0; x <= W; x += 20) c.lineTo(x, H / 2 - 30 - Math.sin(x / 70 + pos / 40000) * 18 - Math.sin(x / 23) * 6); c.lineTo(W, H / 2); c.fill();
  const base = segAt(pos), bp = (pos % SEG) / SEG, camY = CAMH + base.y1 + (base.y2 - base.y1) * bp + (M === 'lanes' ? 0 : 0);
  let x = 0, dx = -base.curve * bp, maxy = H; const proj = [];
  for (let n = 0; n < DRAW; n++) {
    const s = segs[(base.i + n) % segs.length], loop = base.i + n >= segs.length ? len : 0;
    const P = (wx, wy, wz) => { const z = wz - (pos - loop); const sc = CAMD / Math.max(1, z); return { x: W / 2 + sc * (wx - px * RW) * W / 2, y: H / 2 - sc * (wy - camY) * H / 2, w: sc * RW * W / 2, sc, z }; };
    const p1 = P(x, s.y1, s.z1), p2 = P(x + dx, s.y2, s.z2); x += dx; dx += s.curve; proj[n] = { s, p1, clip: maxy };
    if (p1.z <= PZ * 0.3 || p2.y >= maxy) continue;
    const alt = Math.floor(s.i / 3) % 2;
    c.fillStyle = PAL.grass[alt]; c.fillRect(0, p2.y, W, p1.y - p2.y + 1);
    const quad = (x1, y1, w1, x2, y2, w2, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x1 - w1, y1); c.lineTo(x1 + w1, y1); c.lineTo(x2 + w2, y2); c.lineTo(x2 - w2, y2); c.fill(); };
    quad(p1.x, p1.y, p1.w * 1.12, p2.x, p2.y, p2.w * 1.12, PAL.rumble[alt]); quad(p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, PAL.road[alt]);
    if (alt) for (const lx of M === 'lanes' ? [-0.33, 0.33] : [0]) quad(p1.x + p1.w * lx, p1.y, p1.w * 0.02, p2.x + p2.w * lx, p2.y, p2.w * 0.02, PAL.lane);
    maxy = p1.y;
  }
  for (let n = DRAW - 1; n > 0; n--) { const pr = proj[n]; if (!pr || pr.p1.z <= PZ * 0.3) continue; const { s, p1 } = pr;
    const spr = (wx, wScale, hScale, col, top) => { const sx = p1.x + p1.w * wx, w = p1.w * wScale, h = p1.w * hScale; if (p1.y - h > pr.clip) return; c.fillStyle = col; c.fillRect(sx - w / 2, p1.y - h, w, h); if (top) { c.fillStyle = top; c.fillRect(sx - w / 2, p1.y - h, w, h * 0.25); } };
    for (const it of s.items) { if (it.hit && it.t === 'coin') continue;
      if (it.t === 'deco') { if (TH === 'neon') spr(it.x, 0.08, 1.2, '#ff2bd6', '#2bf0ff'); else if (TH === 'canyon') spr(it.x, 0.5, 0.9, '#a4532b', '#c8743c'); else if (TH === 'skate') spr(it.x, 0.3, 0.8, '#6b7280', '#f2d15c'); else { spr(it.x, 0.08, 0.5, '#6b4423'); c.fillStyle = TH === 'voxel' ? '#3fb24f' : '#2e7d32'; const sx = p1.x + p1.w * it.x, w = p1.w * 0.4; if (p1.y - p1.w * 0.5 < pr.clip) { c.beginPath(); c.moveTo(sx, p1.y - p1.w * 1.1); c.lineTo(sx + w / 2, p1.y - p1.w * 0.4); c.lineTo(sx - w / 2, p1.y - p1.w * 0.4); c.fill(); } } }
      if (it.t === 'boost') spr(it.x, 0.25, 0.03, '#2bf0ff');
      if (it.t === 'block') spr(it.x, 0.5, 0.45, TH === 'voxel' ? '#e64a19' : '#444', TH === 'voxel' ? '#ff8a50' : '#888');
      if (it.t === 'bar') { spr(it.x, 0.5, 0.18, '#f2d15c', '#fff'); }
      if (it.t === 'ramp') spr(it.x, 0.45, 0.12, '#8d6e63', '#bcaaa4');
      if (it.t === 'coin') { const sx = p1.x + p1.w * it.x; if (p1.y - p1.w * 0.3 < pr.clip) k.circle(sx, p1.y - p1.w * 0.25, Math.max(1, p1.w * 0.08), '#ffd23f'); } }
    for (const cr of cars) { const rel = ((cr.z - pos) % len + len) % len; if (Math.floor(rel / SEG) === n) spr(cr.x, 0.42, 0.24, cr.col, '#222'); }
  }
  // Jugador
  const bx = W / 2, by = H - (port ? 90 : 30) - py * 0.08;
  if (M === 'race') { const tilt = (k.held.has('left') ? -1 : k.held.has('right') ? 1 : k.ptr.down ? Math.sign(k.ptr.x - W / 2) : 0) * 6; c.save(); c.translate(bx, by); c.rotate(tilt * 0.01 + drift * tilt * 0.02);
    k.rect(-46, -26, 92, 26, TH === 'neon' ? '#ff2bd6' : TH === 'canyon' ? '#2b6cff' : '#e53935'); k.rect(-32, -44, 64, 20, '#222'); k.rect(-50, -8, 16, 12, '#111'); k.rect(34, -8, 16, 12, '#111'); if (boost > 0 || drift > 0.5) { k.circle(-30, 2, 6 + Math.random() * 4, '#ffb347'); k.circle(30, 2, 6 + Math.random() * 4, '#ffb347'); } c.restore(); }
  else { const sh = 1 - Math.min(0.5, py / 2000); c.globalAlpha = 0.3; k.circle(bx, H - 88, 22 * sh, '#000'); c.globalAlpha = 1;
    if (TH === 'skate') { k.rrect(bx - 30, by - 6, 60, 10, 5, '#ff5f7a'); k.rrect(bx - 12, by - 60, 24, 54, 8, '#5ce1e6'); k.circle(bx, by - 70, 12, '#ffd1a3'); }
    else { k.rect(bx - 18, by - 56, 36, 50, '#5ce1e6'); k.rect(bx - 18, by - 56, 36, 12, '#2a9ba1'); k.rect(bx - 14, by - 6, 10, 8, '#333'); k.rect(bx + 4, by - 6, 10, 8, '#333'); } }
  // HUD
  if (M === 'race') { k.text(`Vuelta ${Math.min(3, lap)}/3`, 10, 8, 16, '#fff'); k.text(`${place}º`, W - 10, 8, 26, '#fff', 'right'); k.text(`${Math.round(speed / 50)} km/h`, W - 10, 40, 14, '#fff', 'right'); k.text(`${time.toFixed(1)} s`, 10, 30, 14, '#fff'); if (drift > 0.5) k.text('DRIFT!', W / 2, 40, 22, '#2bf0ff', 'center'); }
  else { k.text(`${Math.floor(score)}`, 12, 10, 22, '#fff'); k.text('♥'.repeat(Math.max(0, lives)), W - 12, 10, 18, '#ff5f7a', 'right'); }
});
