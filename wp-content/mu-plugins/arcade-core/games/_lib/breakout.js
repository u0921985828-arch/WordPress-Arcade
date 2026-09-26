/* Brick Breaker DX: ladrillos con bisel (cacheados), diseños por nivel, ladrillos blindados que se agrietan,
 * cápsulas de mejora (pala ancha, multibola, bola lenta, vida extra), estela de bola y cascotes al romper. */
const OUT = ART.OUT, R2 = 6.2832;
/* --- Ley de la pieza única (R5, docs/REMASTER.md §8) -------------------------------
   `unite(g, partes, ancho)` traza TODAS las partes y las rellena después: los contornos
   interiores quedan tapados y solo sobrevive la silueta exterior. El detalle interior va
   recortado (`within` en caché, `clipIn` en el lienzo de partida), nunca con stroke. */
const OUTW = 1.1, INW = 0.65, INA = 0.62;
const _hx = (h) => { if (h[0] !== '#') { const m = h.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; } h = h.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _rgb = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
const LT = (col, f) => _rgb(_hx(col).map((v) => v + (255 - v) * f));
const DK = (col, f) => _rgb(_hx(col).map((v) => v * (1 - f)));
const MXC = (a, b, u) => { const x = _hx(a), y = _hx(b); return _rgb(x.map((v, i) => v + (y[i] - v) * u)); };
const AL = (col, a) => { const q = _hx(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
/* partes = [[trazado, relleno, sombraDeContacto?]], en orden de profundidad */
function unite(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = OUT; g.lineWidth = (ow || OUTW) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) {
    const P = parts[i];
    if (P[2]) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); P[0](g); g.strokeStyle = AL(OUT, 0.15); g.lineWidth = P[2]; g.stroke(); g.lineWidth = P[2] * 0.45; g.stroke(); g.restore(); }
    g.beginPath(); P[0](g); g.fillStyle = P[1]; g.fill();
  }
}
/* detalle de una pieza, recortado contra su propio trazado (caché: source-atop es barato) */
function within(g, path, fn) { g.save(); g.globalCompositeOperation = 'source-atop'; g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* igual, para el lienzo de partida: recorte a secas (source-atop costaría un compuesto de pantalla completa) */
function clipIn(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }

const k = Kit({ w: 480, h: 360, title: CFG.title, bg: '#16122b' }), c = k.ctx;
const COLS = ['#ff6b6b', '#ffa94d', '#f2d15c', '#7cf7a0', '#5ce1e6', '#b98cff'], TOP = 30, WL = 8, WR = 472, BW = 42, BH = 16;
const PW = { W: ['#5ce1e6', 'PALA ANCHA'], M: ['#ff5fa2', 'MULTIBOLA'], S: ['#7cf7a0', 'BOLA LENTA'], V: ['#ff6b6b', '+1 VIDA'] };
/* Velocidad de bola: saque 230 (nivel 1) → 350 (nivel 9); tope 400 → 560 según nivel; +1,5 % por golpe de pala.
 * Antes: saque 315 y tope 560 ya en el nivel 1 (+2 % por golpe). */
const BCAP = () => (340 + 136 * Math.min(1, (level - 1) / 12)) * k.D.spd; // 1.23: más fácil (antes 400→560 en 8 niveles; saque 230→350). k.D.spd: fácil ×0,8 · difícil ×1,18
let pad, pwD, balls, bricks, drops, score, lives, level, wide, shards, banner, tm;
function build() {
  bricks = []; const rows = Math.min(6, 3 + level), pat = (level - 1) % 4;
  for (let r = 0; r < rows; r++) for (let i = 0; i < 10; i++) {
    if (pat === 1 && (i < r || i > 9 - r) && r > 0) continue; // pirámide invertida
    if (pat === 2 && (i + r) % 2 && r % 2) continue; // ajedrezado parcial
    if (pat === 3 && (i === 4 || i === 5) && r > 0 && r < rows - 1) continue; // pasillo central
    if (level > 4 && Math.random() < 0.12) continue;
    bricks.push({ x: 20 + i * 44, y: 44 + r * 18, hp: r < level - 1 ? 2 : 1, max: r < level - 1 ? 2 : 1, col: COLS[r % 6], fl: 0 });
  }
  balls = [{ x: 240, y: 330, vx: 0, vy: 0, stuck: true, tr: [] }]; drops = []; banner = 1.6;
}
function reset() { pad = 240; pwD = 64; score = 0; lives = 4 + k.D.life; level = 1; wide = 0; shards = []; tm = 0; build(); }
reset();
/* si el jugador cambia de nivel en la pantalla de inicio, la partida se prepara de nuevo con los valores de k.D */
k.onDif = () => { if (k.st !== 'play') reset(); };
k.show(CFG.title, 'Arrastra o usa ← → para mover la pala. Toca o A para lanzar. Recoge las cápsulas: pala ancha, multibola, bola lenta y vida extra.');

/* ---------- gráficos cacheados */
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16), ch = (s) => Math.round(f > 0 ? s + (255 - s) * f : s * (1 + f)); return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`; }
const BG = off(480, 360, (g) => {
  let gr = g.createLinearGradient(0, 0, 0, 360); gr.addColorStop(0, '#231a52'); gr.addColorStop(1, '#0c0920'); g.fillStyle = gr; g.fillRect(0, 0, 480, 360);
  g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 1; for (let y = TOP, r = 0; y < 360; y += 21, r++) for (let x = (r % 2) * 18; x < 480; x += 36) { g.beginPath(); for (let j = 0; j < 6; j++) { const a = j * 1.047 + 0.52; g.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); } g.closePath(); g.stroke(); }
  const rg = g.createRadialGradient(240, 200, 20, 240, 200, 300); rg.addColorStop(0, 'rgba(110,98,245,.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 480, 360);
  // marco metálico
  const metal = (x, y, w, h) => { const mg = g.createLinearGradient(x, y, x + w, y + h); mg.addColorStop(0, '#9aa7c7'); mg.addColorStop(0.5, '#5a6488'); mg.addColorStop(1, '#3b4263'); g.fillStyle = mg; g.fillRect(x, y, w, h); g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(x, y, w, h); };
  metal(0, TOP - 8, WL, 370); metal(WR, TOP - 8, 480 - WR, 370); g.fillStyle = '#141029'; g.fillRect(0, 0, 480, TOP - 8); metal(0, TOP - 8, 480, 8);
  g.fillStyle = 'rgba(255,255,255,.5)'; for (let x = 20; x < 480; x += 40) { g.beginPath(); g.arc(x, TOP - 4, 1.5, 0, R2); g.fill(); }
});
const BRK = {};
function brickSpr(col, metal, cracked) { const key = col + metal + cracked; if (BRK[key]) return BRK[key];
  return (BRK[key] = off(BW + 4, BH + 4, (g) => { g.translate(2, 2); const base = metal ? '#b8c2d8' : col;
    const body = (q) => ART.rr(q, 0, 0, BW, BH, 3);
    /* ladrillo = una sola pieza: silueta trazada y rellenada una vez; el bisel va recortado dentro */
    unite(g, [[body, base]], 1.1);
    within(g, body, (q) => {
      q.fillStyle = shade(metal ? '#b8c2d8' : col, 0.45); q.beginPath(); q.moveTo(0, 0); q.lineTo(BW, 0); q.lineTo(BW - 4, 4); q.lineTo(4, 4); q.lineTo(4, BH - 4); q.lineTo(0, BH); q.fill();
      q.fillStyle = shade(base, -0.35); q.beginPath(); q.moveTo(BW, 0); q.lineTo(BW, BH); q.lineTo(0, BH); q.lineTo(4, BH - 4); q.lineTo(BW - 4, BH - 4); q.lineTo(BW - 4, 4); q.fill();
      q.fillStyle = 'rgba(255,255,255,.45)'; q.fillRect(7, 5.5, BW * 0.4, 2);
      if (metal) { q.fillStyle = '#5a6488'; for (const [x, y] of [[7, 8], [BW - 7, 8]]) { q.beginPath(); q.arc(x, y, 1.8, 0, R2); q.fill(); } }
      /* grieta: hendidura por sombra propia y luz, nunca un trazo negro dentro de la silueta */
      if (cracked) { const crack = (w) => { q.lineWidth = w; q.lineJoin = 'round'; q.lineCap = 'round'; q.beginPath(); q.moveTo(BW * 0.45, -1); q.lineTo(BW * 0.52, 6); q.lineTo(BW * 0.42, 10); q.lineTo(BW * 0.5, BH + 1); q.moveTo(BW * 0.52, 6); q.lineTo(BW * 0.66, 9); q.stroke(); };
        q.strokeStyle = AL('#ffffff', 0.35); q.save(); q.translate(0.9, 0.6); crack(1.5); q.restore();
        q.strokeStyle = AL(OUT, 0.5); crack(1.3); }
    }); })); }
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function paddle(x, y, w) {
  c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, x - w / 2 + 3, y + 4, w, 11, 5.5); c.fill();
  const body = (g) => ART.rr(g, x - w / 2, y, w, 11, 5.5);
  const g = c.createLinearGradient(0, y, 0, y + 11); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#c9d2ea'); g.addColorStop(1, '#8a94b8');
  unite(c, [[body, g]], 1.25);
  clipIn(c, body, (q) => {
    /* topes: cambio de color dentro de la silueta, sin contorno propio */
    for (const sx of [-1, 1]) { q.fillStyle = '#ff5f7a'; q.fillRect(sx < 0 ? x - w / 2 : x + w / 2 - 14, y - 1, 14, 13); q.fillStyle = AL(OUT, 0.2); q.fillRect(sx < 0 ? x - w / 2 + 13 : x + w / 2 - 14, y - 1, 1.6, 13); q.fillStyle = 'rgba(255,255,255,.5)'; q.fillRect(sx < 0 ? x - w / 2 + 4 : x + w / 2 - 10, y + 2, 6, 2); }
    q.fillStyle = 'rgba(92,225,230,.9)'; q.fillRect(x - 6, y + 4, 12, 3);
    q.fillStyle = AL('#ffffff', 0.45); q.fillRect(x - w / 2 + 16, y + 1.4, w - 32, 1.8);
  });
}
function breakBrick(br) {
  br.dead = true; score += 10 * level; k.burst(br.x + 21, br.y + 8, br.col, 10, 140);
  for (let j = 0; j < 5; j++) shards.push({ x: br.x + 6 + j * 8, y: br.y + 8, vx: k.rnd(-70, 70), vy: k.rnd(-110, -20), a: 0, va: k.rnd(-9, 9), s: k.rnd(4, 7), col: br.max > 1 ? '#b8c2d8' : br.col, t: 0.9 });
  if (Math.random() < 0.15 / k.D.rate) drops.push({ x: br.x + 22, y: br.y + 8, t: Math.random() < 0.08 ? 'V' : k.pick(['W', 'M', 'S']) });
}

k.run((dt) => {
  tm += dt;
  for (const s of shards) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 420 * dt; s.a += s.va * dt; s.t -= dt; } shards = shards.filter((s) => s.t > 0 && s.y < 380);
  if (!k.gate(reset)) return;
  banner -= dt;
  const pw = wide > 0 ? 100 : 64; wide -= dt; pwD += (pw - pwD) * Math.min(1, dt * 10);
  if (k.ptr.down) pad += (k.ptr.x - pad) * Math.min(1, dt * 20);
  if (k.held.has('left')) pad -= 420 * dt; if (k.held.has('right')) pad += 420 * dt;
  pad = k.clamp(pad, WL + pw / 2, WR - pw / 2);
  for (const br of bricks) br.fl = Math.max(0, br.fl - dt);
  for (const b of balls) {
    if (b.stuck) { b.x = pad; b.y = 330; if (k.hit.has('a') || k.tap || k.hit.has('up')) { b.stuck = false; b.vx = k.rnd(-100, 100); b.vy = -(185 + Math.min(12, level - 1) * 9.5) * k.D.spd; k.sfx('shoot'); } continue; }
    const steps = 3, h = dt / steps;
    for (let s = 0; s < steps && !b.dead; s++) {
      b.x += b.vx * h; b.y += b.vy * h;
      if (b.x < WL + 5 || b.x > WR - 5) { b.vx *= -1; b.x = k.clamp(b.x, WL + 5, WR - 5); }
      if (b.y < TOP + 5) { b.vy = Math.abs(b.vy); b.y = TOP + 5; }
      if (b.vy > 0 && b.y > 332 && b.y < 344 && Math.abs(b.x - pad) < pw / 2 + 8) {
        const sp = Math.min(BCAP(), Math.hypot(b.vx, b.vy) * 1.015), a = k.clamp((b.x - pad) / (pw / 2) * 1.05, -1.1, 1.1); /* con el margen ampliado no sale casi horizontal */
        b.vx = Math.sin(a) * sp; b.vy = -Math.cos(a) * sp; b.y = 331; k.sfx('click'); k.burst(b.x, 336, '#5ce1e6', 4, 80);
      }
      for (const br of bricks) if (!br.dead && b.x > br.x - 5 && b.x < br.x + 45 && b.y > br.y - 5 && b.y < br.y + 21) {
        const ox = Math.min(b.x - br.x + 5, br.x + 45 - b.x), oy = Math.min(b.y - br.y + 5, br.y + 21 - b.y);
        if (ox < oy) b.vx *= -1; else b.vy *= -1;
        br.fl = 0.1; if (--br.hp <= 0) { breakBrick(br); k.sfx('pop'); } else { k.sfx('hit'); k.burst(b.x, b.y, '#dfe6f2', 5, 90); }
        break;
      }
      if (b.y > 370) b.dead = true;
    }
    b.tr.push([b.x, b.y]); if (b.tr.length > 8) b.tr.shift();
  }
  balls = balls.filter((b) => !b.dead); bricks = bricks.filter((b) => !b.dead);
  for (const d of drops) { d.y += 120 * dt; if (d.y > 330 && d.y < 350 && Math.abs(d.x - pad) < pw / 2 + 8) { d.dead = true; k.sfx('coin'); k.float(PW[d.t][1], d.x, 312, PW[d.t][0]);
      if (d.t === 'W') wide = 12; else if (d.t === 'V') lives = Math.min(6 + k.D.life, lives + 1);
      else if (d.t === 'S') { for (const b of balls) if (!b.stuck) { b.vx *= 0.7; b.vy *= 0.7; if (Math.abs(b.vy) < 180) b.vy = Math.sign(b.vy || -1) * 180; } }
      else if (balls[0]) { const b = balls[0]; balls.push({ ...b, tr: [], vx: -b.vx || 150, vy: b.vy || -300, stuck: false }, { ...b, tr: [], vx: b.vx * 0.5 + 90, vy: b.vy || -300, stuck: false }); } }
    if (d.y > 370) d.dead = true; }
  drops = drops.filter((d) => !d.dead);
  if (!balls.length) { k.shake(6); k.sfx('hurt'); if (--lives <= 0) return k.lose(CFG.id, score, 'Sin bolas', `Nivel ${level}`); balls = [{ x: pad, y: 330, stuck: true, tr: [] }]; wide = 0; }
  if (!bricks.length) { level++; score += 100 * level; k.sfx('win'); k.confetti(); build(); }
}, () => {
  c.drawImage(BG, 0, 0, 480, 360);
  for (const b of bricks) { c.drawImage(brickSpr(b.col, b.max > 1, b.max > 1 && b.hp < b.max), b.x - 2, b.y - 2, BW + 4, BH + 4); if (b.fl > 0) { c.globalAlpha = b.fl * 7; c.fillStyle = '#fff'; ART.rr(c, b.x, b.y, BW, BH, 3); c.fill(); c.globalAlpha = 1; } }
  for (const s of shards) { c.save(); c.translate(s.x, s.y); c.rotate(s.a); c.globalAlpha = Math.min(1, s.t * 2); c.fillStyle = s.col; c.fillRect(-s.s / 2, -s.s / 3, s.s, s.s * 0.66); c.strokeStyle = OUT; c.lineWidth = 1.2; c.strokeRect(-s.s / 2, -s.s / 3, s.s, s.s * 0.66); c.restore(); } c.globalAlpha = 1;
  for (const d of drops) { const [col] = PW[d.t]; c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, d.x - 12, d.y - 3, 26, 14, 7); c.fill(); ART.rr(c, d.x - 14, d.y - 7, 28, 14, 7); ART.fillOut(c, col, 2);
    c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(d.x - 9, d.y - 5, 18, 2.5); const st = (tm * 30) % 28; c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(d.x - 14 + st, d.y - 6, 3, 12);
    if (d.t === 'V') ART.heart(c, d.x, d.y + 1, 0.75, true); else label(d.t, d.x, d.y + 0.5, 11, '#fff', 'center', 'middle'); }
  paddle(pad, 336, pwD);
  for (const b of balls) { b.tr.forEach(([x, y], i) => { c.globalAlpha = i / b.tr.length * 0.35; c.fillStyle = '#9fe8ff'; c.beginPath(); c.arc(x, y, 2 + i / b.tr.length * 3, 0, R2); c.fill(); }); c.globalAlpha = 1;
    c.beginPath(); c.arc(b.x, b.y, 5.5, 0, R2); ART.fillOut(c, '#fff', 2); c.fillStyle = '#9fe8ff'; c.beginPath(); c.arc(b.x + 1.2, b.y + 1.2, 2.2, 0, R2); c.fill(); }
  // HUD
  label(score, 12, 3, 17, '#fff'); label(`Nivel ${level}`, 446 - lives * 24, 5, 13, '#cfc8ff', 'right');
  for (let i = 0; i < lives; i++) { const x = 460 - i * 24; ART.rr(c, x - 9, 9, 18, 7, 3.5); ART.fillOut(c, '#dfe6f2', 1.8); c.fillStyle = '#ff5f7a'; c.fillRect(x - 8, 10.5, 4, 4); c.fillRect(x + 4, 10.5, 4, 4); }
  if (banner > 0) { const p = 1.6 - banner, s = p < 0.2 ? 0.4 + p * 3.5 : 1.1; c.save(); c.translate(240, 200); c.scale(s, s); c.globalAlpha = Math.min(1, banner / 0.3); label(`Nivel ${level}`, 0, 0, 34, '#fff27a', 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
  if (k.st === 'play' && balls.some((b) => b.stuck) && banner <= 0 && Math.sin(tm * 5) > -0.3) label('Toca o pulsa A para lanzar', 240, 262, 14, '#e6e2ff', 'center', 'middle');
});
