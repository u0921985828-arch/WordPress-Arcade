/* Home Run Derby: toca para batear en el momento justo. 10 eliminaciones (outs).
 * Estadio nocturno cacheado, lanzador con impulso, bateador con swing animado, bola con estela y fuegos al jonrón. */
/* ===== §8 «Ley de la pieza única» — utilería local (REMASTER.md §8) =====
 * unite8(): traza y contornea TODAS las partes y después las rellena en orden de profundidad, así
 * dentro de la silueta no sobrevive ningún contorno cerrado: solo el borde exterior. Las separaciones
 * internas se leen por sombra propia (seam8) o por cambio de color, nunca por stroke.
 * Todo lo repetido se hornea en sprites cacheados a Math.min(2, devicePixelRatio) para que el coste
 * por frame no suba (regla innegociable del brief). */
const P8OUT = ART.OUT, P8W = 1.5, P8IW = 0.7, P8IA = 0.62, P8T = 6.2832;
const _p8h = (s) => { s = String(s).replace('#', ''); if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _p8c = (a) => `rgb(${Math.max(0, Math.min(255, a[0] | 0))},${Math.max(0, Math.min(255, a[1] | 0))},${Math.max(0, Math.min(255, a[2] | 0))})`;
const LT8 = (col, f) => (String(col)[0] === '#' ? _p8c(_p8h(col).map((v) => v + (255 - v) * f)) : col);
const DK8 = (col, f) => (String(col)[0] === '#' ? _p8c(_p8h(col).map((v) => v * (1 - f))) : col);
const AL8 = (col, a) => { const q = _p8h(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
const CV8 = (w, h) => { const q = document.createElement('canvas'); q.width = Math.max(1, Math.ceil(w)); q.height = Math.max(1, Math.ceil(h)); return q; };
/* como ART.rr pero SIN beginPath: imprescindible para componer subtrayectorias de una misma pieza */
function rr8(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const DPR8 = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
/* recorte contra la propia forma. Nunca `source-atop` en el lienzo vivo: obliga a un compuesto de
 * pantalla completa (medido 11–18 ms/frame). Aquí basta el clip. */
function clip8(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
/* cel de 3 planos con borde DURO: sombra, base desplazada hacia la luz (arriba-izquierda) y luz */
function cel8(g, path, base, o) {
  o = o || {}; const dx = o.dx == null ? 2.2 : o.dx, dy = o.dy == null ? 2 : o.dy, f = o.f == null ? 1 : o.f, B = o.b || 260;
  g.save(); g.beginPath(); path(g); g.clip();
  g.fillStyle = DK8(base, 0.22 * f); g.fillRect(-B, -B, B * 2, B * 2);
  g.save(); g.translate(-dx, -dy); g.beginPath(); path(g); g.fillStyle = base; g.fill(); g.restore();
  if (o.hi !== false) { g.save(); g.translate(-dx * 2.1, -dy * 2.1); g.beginPath(); path(g); g.fillStyle = LT8(base, 0.2 * f); g.fill(); g.restore(); }
  g.restore();
}
/* EL MECANISMO: parts = [[trazado, color, celOpts|0, detalle(g)|0]] en orden de profundidad */
function unite8(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = P8OUT; g.lineWidth = (ow || P8W) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) {
    const P = parts[i];
    g.beginPath(); P[0](g); g.fillStyle = P[1]; g.fill();
    if (P[2]) cel8(g, P[0], P[1], P[2] === true ? null : P[2]);
    if (P[3]) clip8(g, P[0], P[3]);
  }
}
/* separación interna por sombra propia (~16 % más oscuro), nunca por contorno */
function seam8(g, path, base, fn, f) { clip8(g, path, (q) => { q.fillStyle = DK8(base, f == null ? 0.16 : f); fn(q); }); }
/* línea interior fina: detalle, jamás un contorno cerrado */
function ink8(g, w, a) { g.lineWidth = w == null ? P8IW : w; g.strokeStyle = AL8(P8OUT, a == null ? P8IA : a); }
/* óvalo especular (un toque por pieza) */
function shine8(g, x, y, rx, ry, rot, a) { g.fillStyle = `rgba(255,255,255,${a == null ? 0.34 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, P8T); g.fill(); }
/* sombra de contacto dura bajo la pieza */
function drop8(g, x, y, rx, ry, a) { g.fillStyle = `rgba(26,21,48,${a == null ? 0.26 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, P8T); g.fill(); }
/* caché de sprites; el origen del dibujo es (ox,oy) dentro del lienzo de w×h */
const SPR8 = {};
function spr8(key, w, h, ox, oy, fn, sc) {
  let q = SPR8[key]; if (q) return q;
  const s = (sc || 1) * DPR8; q = SPR8[key] = CV8(w * s, h * s); const g = q.getContext('2d');
  g.scale(s, s); g.translate(ox, oy); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g);
  q.iw = w; q.ih = h; q.ox = ox; q.oy = oy; return q;
}
function blit8(ctx, q, x, y, sc, al) {
  sc = sc || 1; if (al != null) ctx.globalAlpha = al;
  ctx.drawImage(q, x - q.ox * sc, y - q.oy * sc, q.iw * sc, q.ih * sc);
  if (al != null) ctx.globalAlpha = 1;
}
/* manopla grande con pulgar marcado, en una sola forma */
function mitt8(x, y, a, r, s) {
  const tx = x + Math.cos(a - s * 1.25) * r * 0.85, ty = y + Math.sin(a - s * 1.25) * r * 0.85;
  return (g) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, P8T); g.moveTo(tx + r * 0.46, ty); g.arc(tx, ty, r * 0.46, 0, P8T); };
}
/* hueso de ancho variable: la raíz queda abierta y enterrada en el tronco → tangente continua */
function bone8(pts, ws) {
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
    g.lineTo(R[0][0], R[0][1]); g.closePath();
  };
}
/* La cara manda: ojos grandes con PÁRPADO SUPERIOR RECTO (lo que da expresión) y cejas gruesas */
function eyes8(g, cx, cy, sep, r, o) {
  o = o || {}; const ry = r * (o.sq || 1), lid = o.lid == null ? 0.24 : o.lid, lx = o.lx || 0, ly = o.ly || 0;
  for (const s of [-1, 1]) {
    g.save(); g.translate(cx + s * sep, cy);
    if (o.shut) { g.beginPath(); g.moveTo(-r, -ry * 0.1); g.quadraticCurveTo(0, ry * 0.7, r, -ry * 0.1); g.lineWidth = Math.max(0.9, r * 0.3); g.strokeStyle = AL8(P8OUT, 0.9); g.stroke(); g.restore(); continue; }
    g.beginPath(); g.ellipse(0, 0, r, ry, 0, 0, P8T); g.fillStyle = o.white || '#fff'; g.fill();
    const ix = lx * r * 0.34, iy = ly * ry * 0.3 + ry * 0.06;
    g.beginPath(); g.arc(ix, iy, r * 0.6, 0, P8T); g.fillStyle = o.iris || '#3a5bb8'; g.fill();
    g.beginPath(); g.arc(ix, iy, r * 0.31, 0, P8T); g.fillStyle = P8OUT; g.fill();
    g.beginPath(); g.arc(ix - r * 0.3, iy - r * 0.34, r * 0.22, 0, P8T); g.fillStyle = '#fff'; g.fill();
    g.rotate(s * (o.tilt || 0));
    g.beginPath(); g.ellipse(0, 0, r * 1.05, ry * 1.05, 0, 0, P8T); g.clip();
    const y0 = -ry + ry * 2 * lid;
    g.fillStyle = o.lidCol || '#ffd3ad'; g.fillRect(-r * 1.3, -ry * 1.6, r * 2.6, y0 + ry * 1.6);
    g.fillStyle = AL8(P8OUT, 0.92); g.fillRect(-r * 1.3, y0 - r * 0.18, r * 2.6, r * 0.2);
    g.restore();
  }
}
/* cejas gruesas (trazo con cuerpo). tilt>0 = enfadado */
function brow8(g, cx, cy, sep, len, tilt, col, th) {
  th = th || 1.5; g.fillStyle = col || P8OUT;
  for (const s of [-1, 1]) { g.beginPath(); bone8([[cx + s * (sep - len * 0.45), cy + tilt], [cx + s * (sep + len * 0.55), cy - tilt * 0.85]], [th, th * 0.5])(g); g.fill(); }
}
/* boca grande y simple. m: 0 sonrisa · 1 abierta · 2 mueca · 3 recta · 4 «o» */
function mouth8(g, x, y, w, m, col) {
  if (m === 1 || m === 4) { g.beginPath(); g.ellipse(x, y + w * 0.14, w * (m === 4 ? 0.5 : 0.7), w * (m === 4 ? 0.6 : 0.76), 0, 0, P8T); g.fillStyle = col || '#5e2436'; g.fill(); return; }
  g.beginPath(); g.lineCap = 'round'; g.lineWidth = Math.max(1, w * 0.26); g.strokeStyle = col || AL8(P8OUT, 0.9);
  if (m === 3) { g.moveTo(x - w * 0.5, y); g.lineTo(x + w * 0.5, y); }
  else if (m === 2) { g.moveTo(x - w * 0.5, y + w * 0.2); g.quadraticCurveTo(x, y - w * 0.3, x + w * 0.5, y + w * 0.2); }
  else { g.moveTo(x - w * 0.55, y - w * 0.1); g.quadraticCurveTo(x, y + w * 0.55, x + w * 0.55, y - w * 0.1); }
  g.stroke();
}
const OUT = ART.OUT, R2 = 6.2832;
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#0b1238' }), c = k.ctx;
const PY = 292, ZY = 552, WALL = 206, HX = 150, HY = 548, BAT = 92;
let ball, swing, outs, hrs, total, msg, msgT, msgD = 1, msgC, wait, hit, pitchN, trail, streak, fw, tm, outMarks;
/* dificultad por lanzamiento: d 0→1 en 30 lanzamientos. Velocidad media 0,78→1,65 (antes 1,2→1,8 al 10.º), la variación y el efecto crecen con d */
function pitch() { pitchN++; const d = Math.min(1, (pitchN - 1) / 45), /* 1.23: más fácil (rampa 30→45 lanzamientos, velocidad 0,78–1,65 → 0,62–1,40) */ e = d * d * (3 - 2 * d) * 0.6 + d * 0.4; const sp = (0.62 + 0.78 * e) * (1 + k.rnd(-1, 1) * (0.04 + 0.2 * e)); const curve = k.rnd(-40, 40) * Math.min(1, (pitchN - 1) / 18); ball = { t: 0, sp, curve, x: 180, y: PY, s: 0.3, live: true, spin: 0 }; swing = 0; hit = null; trail = []; k.sfx('click'); }
function reset() { outs = 0; hrs = 0; total = 0; msg = ''; msgT = 0; msgC = '#fff'; wait = 1.2; pitchN = 0; ball = null; hit = null; swing = 0; trail = []; streak = 0; fw = []; tm = 0; outMarks = []; }
reset(); k.show(CFG.title, 'Toca (o pulsa A) para batear cuando la bola entre en la zona de strike. Buen momento = jonrón. 10 eliminaciones y se acaba.');
function say(s, col, d) { msg = s; msgC = col; msgT = msgD = d || 1.2; }
function out(s) { outs++; outMarks.push(0); streak = 0; say(s, '#ff8a7a', 1); }

/* ---------- estadio cacheado */
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const BG = off(360, 640, (g) => {
  let gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, '#070b2a'); gr.addColorStop(1, '#2d4591'); g.fillStyle = gr; g.fillRect(0, 0, 360, 200);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd(i) * 0.6})`; g.fillRect(rnd(i + 3) * 360, rnd(i + 7) * 90, 1.5, 1.5); }
  // gradas curvas con público
  g.beginPath(); g.moveTo(0, 212); g.lineTo(0, 120); g.quadraticCurveTo(180, 82, 360, 120); g.lineTo(360, 212); g.closePath(); g.fillStyle = '#29254a'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
  const CR = ['#ff5f7a', '#f2d15c', '#5ce1e6', '#ffffff', '#b98cff', '#ff9a3c', '#7cf7a0'];
  for (let row = 0; row < 7; row++) for (let i = 0; i < 44; i++) { const x = 4 + i * 8.2 + (row % 2) * 4, top = 120 - Math.sin(x / 360 * Math.PI) * 38 * (1 - row / 9); const y = top + 8 + row * 11; if (y > 200) continue; g.fillStyle = CR[Math.floor(rnd(row * 50 + i) * 7)]; g.globalAlpha = 0.55 + rnd(i * 3 + row) * 0.35; g.beginPath(); g.arc(x, y, 2.6, 0, R2); g.fill(); g.fillRect(x - 2.6, y + 2, 5.2, 4); }
  g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.25)'; for (let row = 1; row < 7; row++) g.fillRect(0, 133 + row * 11, 360, 1.5);
  // torres de luz
  for (const x of [26, 334]) { g.fillStyle = '#39406a'; g.fillRect(x - 3, 40, 6, 90); g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(x - 3, 40, 6, 90);
    const rg = g.createRadialGradient(x, 34, 2, x, 34, 60); rg.addColorStop(0, 'rgba(255,250,210,.55)'); rg.addColorStop(1, 'rgba(255,250,210,0)'); g.fillStyle = rg; g.fillRect(x - 60, 0, 120, 100);
    ART.rr(g, x - 17, 22, 34, 20, 3); ART.fillOut(g, '#4a5180', 2); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(x - 11 + i * 7.3, 28 + j * 8, 2.6, 0, R2); g.fill(); } }
  // césped a franjas
  gr = g.createLinearGradient(0, WALL, 0, 640); gr.addColorStop(0, '#2f8f47'); gr.addColorStop(1, '#1f6e37'); g.fillStyle = gr; g.fillRect(0, WALL, 360, 434);
  for (let i = 0, y = WALL; y < 640; i++) { const h = 10 + i * 5; if (i % 2) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, y, 360, h); } y += h; }
  // valla del fondo
  g.fillStyle = '#1d5a3a'; g.fillRect(0, WALL - 14, 360, 16); g.fillStyle = '#f2d15c'; g.fillRect(0, WALL - 16, 360, 3); g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(-2, WALL - 16, 364, 18);
  g.font = '800 9px ui-rounded,system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; [[40, '100'], [180, '120'], [320, '100']].forEach(([x, s]) => g.fillText(s, x, WALL - 4));
  // tierra del cuadro
  g.beginPath(); g.moveTo(180, 610); g.lineTo(340, 420); g.quadraticCurveTo(180, 205, 20, 420); g.closePath(); g.fillStyle = '#c28a55'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(26,21,48,.5)'; g.stroke();
  g.beginPath(); g.moveTo(180, 560); g.lineTo(282, 400); g.lineTo(180, 268); g.lineTo(78, 400); g.closePath(); gr = g.createLinearGradient(0, 268, 0, 560); gr.addColorStop(0, '#2c8a45'); gr.addColorStop(1, '#23753a'); g.fillStyle = gr; g.fill();
  // líneas de foul
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(180, 600); g.lineTo(360, 330); g.moveTo(180, 600); g.lineTo(0, 330); g.stroke();
  // montículo
  g.beginPath(); g.ellipse(180, PY + 14, 30, 11, 0, 0, R2); g.fillStyle = '#c99762'; g.fill(); g.strokeStyle = 'rgba(26,21,48,.5)'; g.stroke(); g.fillStyle = '#fff'; g.fillRect(172, PY + 10, 16, 3);
  // bases
  for (const [x, y] of [[282, 400], [180, 262], [78, 400]]) { g.save(); g.translate(x, y); g.scale(1, 0.55); g.rotate(Math.PI / 4); g.fillStyle = '#fff'; g.fillRect(-6, -6, 12, 12); g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(-6, -6, 12, 12); g.restore(); }
  // zona de bateo: tierra, cajas del bateador y home
  g.beginPath(); g.ellipse(180, 600, 90, 34, 0, 0, R2); g.fillStyle = '#c28a55'; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.strokeRect(112, 578, 42, 50); g.strokeRect(206, 578, 42, 50);
  g.beginPath(); g.moveTo(166, 594); g.lineTo(194, 594); g.lineTo(194, 602); g.lineTo(180, 612); g.lineTo(166, 602); g.closePath(); ART.fillOut(g, '#fff', 2);
});

/* ---------- personajes */
/* ---------- §8: lanzador y bateador, cada uno UNA pieza ----------
 * Solo se separa lo que de verdad articula: el brazo de lanzar, el bate y los brazos que lo llevan.
 * Todo lo demás (piernas, tronco, cabeza, gorra, guante, casco, zapatillas) es un único trazado,
 * contorneado una vez y relleno una vez; la camiseta, el cinturón y el pantalón se leen por color. */
const SKIN = '#ffce9e', UNI = '#f2f2f8', UNI2 = '#d9dae6';
/* cuerpo del lanzador sin el brazo (que sí gira) */
function pitcherSpr() {
  return spr8('pit', 80, 108, 40, 96, (g) => {
    const body = (q) => {
      bone8([[-7, 0], [-8, -14], [-9, -27]], [5.5, 5, 4.5])(q);
      bone8([[7, 0], [8, -14], [8, -27]], [5.5, 5, 4.5])(q);
      q.moveTo(-6, 2); q.ellipse(-9, 0, 7, 4, 0, 0, P8T); q.moveTo(12, 2); q.ellipse(9, 0, 7, 4, 0, 0, P8T);
      rr8(q, -15, -58, 30, 34, 11);                                  // tronco
      bone8([[-14, -50], [-18, -42], [-17, -35]], [5, 6, 7.5])(q);   // brazo del guante
      q.moveTo(0, -68); q.arc(0, -68, 11.5, 0, P8T);                 // cabeza
      q.moveTo(-12, -71); q.arc(0, -71, 12, Math.PI, 0); q.lineTo(15.5, -70); q.quadraticCurveTo(14, -66.5, 8, -67.5); q.closePath();  // gorra con visera fundida
    };
    unite8(g, [[body, UNI, { dx: 2, dy: 1.8 }, (q) => {
      q.fillStyle = SKIN; q.beginPath(); q.arc(0, -68, 11.5, 0, P8T); q.fill();
      q.fillStyle = '#e24b5b'; q.beginPath(); q.moveTo(-13, -71); q.arc(0, -71, 12.6, Math.PI, 0); q.lineTo(16, -70); q.quadraticCurveTo(14, -66, 8, -67.5); q.fill();
      q.fillStyle = UNI2; q.fillRect(-16, -30, 32, 6);                                   // cinturón
      q.fillStyle = '#e24b5b'; q.fillRect(-14, -45, 28, 4);
      q.fillStyle = '#8a5a33'; q.beginPath(); q.arc(-17, -36, 8.5, 0, P8T); q.fill();     // guante
      eyes8(q, 0, -68.5, 4.2, 2.6, { lid: 0.22, ly: 0.2, lidCol: SKIN, iris: '#2f2440' });
      shine8(q, -5, -74, 3.4, 2.2, -0.5, 0.3);
    }]], 1.45);
  }, 3);
}
function pitcher() {
  const wind = !ball && !hit && wait < 0.6 ? 1 - wait / 0.6 : 0, rel = ball && ball.t < 0.12 ? 1 - ball.t / 0.12 : 0;
  c.save(); c.translate(180, PY + 8); c.scale(0.62, 0.62);
  drop8(c, 0, 4, 20, 6, 0.24);
  blit8(c, pitcherSpr(), 0, 0);
  const a = rel ? -0.3 + (1 - rel) * 1.2 : -2.6 * wind - 0.3;      // el brazo sí articula: pieza aparte
  c.save(); c.translate(12, -52); c.rotate(a);
  c.beginPath(); bone8([[0, 0], [12, -1], [21, 0]], [5.6, 5, 6.4])(c);
  c.fillStyle = SKIN; c.fill(); c.lineWidth = 1.45; c.strokeStyle = P8OUT; c.stroke(); c.restore();
  c.restore();
}
function batAngle() { if (swing <= 0) return -1.95 + Math.sin(tm * 3) * 0.05; const p = 1 - swing / 0.3; return p < 0.55 ? -1.95 + Math.pow(p / 0.55, 1.6) * 2.35 : 0.4 + (p - 0.55) * 0.6; }
/* bateador de espaldas: piernas, tronco, casco y zapatillas en una sola silueta */
function batterSpr() {
  return spr8('bat', 110, 140, 55, 128, (g) => {
    const body = (q) => {
      bone8([[-9, 0], [-10, -26], [-11, -46]], [8, 7.5, 9])(q);
      bone8([[13, 0], [14, -26], [14, -46]], [8, 7.5, 9])(q);
      rr8(q, -24, -6, 24, 11, 5); rr8(q, 4, -6, 24, 11, 5);                // zapatillas
      rr8(q, -25, -84, 50, 48, 17);                                        // tronco
      q.moveTo(-1, -104); q.arc(-1, -104, 18, 0, P8T);                     // casco
      q.moveTo(16, -99); q.ellipse(16, -97, 10, 4.6, 0.3, 0, P8T);         // visera fundida
    };
    unite8(g, [[body, '#3056c9', { dx: 2.4, dy: 2.2 }, (q) => {
      q.fillStyle = UNI; q.beginPath(); rr8(q, -12, -50, 28, 52, 9); q.fill();   // pantalón
      q.fillStyle = '#2a2342'; q.beginPath(); rr8(q, -25, -8, 52, 13, 6); q.fill();
      q.fillStyle = DK8('#3056c9', 0.3); q.fillRect(-25, -54, 50, 6);            // cinturón
      q.fillStyle = 'rgba(255,255,255,.16)'; q.fillRect(-19, -78, 6, 36);
      q.fillStyle = '#223c99'; q.beginPath(); q.arc(-1, -104, 18, 0, P8T); q.fill();
      q.fillStyle = DK8('#223c99', 0.28); q.beginPath(); q.ellipse(16, -97, 10, 4.6, 0.3, 0, P8T); q.fill();
      shine8(q, -9, -113, 5, 7, -0.5, 0.36);
      q.font = '900 22px ui-rounded,system-ui,sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle';
      q.fillStyle = '#fff'; q.fillText('7', 1, -62);
    }]], 1.5);
  }, 3);
}
/* el bate gira: pieza aparte, con un solo borde */
function batSpr() {
  return spr8('bate', BAT + 30, 28, 14, 14, (g) => {
    const body = (q) => { q.moveTo(-6, -3.5); q.lineTo(BAT * 0.55, -4.8); q.quadraticCurveTo(BAT + 1, -8.4, BAT + 2, 0); q.quadraticCurveTo(BAT + 1, 8.4, BAT * 0.55, 4.8); q.lineTo(-6, 3.5); q.closePath(); };
    unite8(g, [[body, '#d9a066', { dx: 0, dy: 1.6 }, (q) => {
      q.fillStyle = '#2a2342'; q.fillRect(-8, -6, 16, 12);
      q.fillStyle = 'rgba(255,255,255,.3)'; q.fillRect(BAT * 0.3, -3.4, BAT * 0.55, 2.2);
    }]], 1.5);
  }, 3);
}
function batter() {
  const a = batAngle(), tw = swing > 0 ? Math.min(1, (1 - swing / 0.3) * 1.6) : 0;
  drop8(c, 118, 628, 34, 9, 0.3);
  c.save(); c.translate(117, 628); c.scale(1 - tw * 0.1, 1); blit8(c, batterSpr(), 0, 0); c.restore();
  c.save(); c.translate(HX, HY); c.rotate(a); blit8(c, batSpr(), 0, 0); c.restore();
  if (swing > 0 && swing < 0.26) { c.globalAlpha = 0.25; c.strokeStyle = '#fff'; c.lineWidth = 10; c.beginPath(); c.arc(HX, HY, BAT * 0.8, a - 0.9, a); c.stroke(); c.globalAlpha = 1; }
  // brazos: cruzan por delante y siguen al bate, así que son pieza aparte (un solo borde)
  c.beginPath(); bone8([[104, 548], [(104 + HX) / 2 - 2, (548 + HY) / 2], [HX - 3, HY]], [7, 6, 5])(c);
  bone8([[132, 546], [(132 + HX) / 2, (546 + HY) / 2 + 2], [HX + 1, HY + 2]], [7, 6, 5])(c);
  c.fillStyle = '#3056c9'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = P8OUT; c.stroke();
  c.beginPath(); mitt8(HX, HY, a + 1.6, 6.4, 1)(c); c.fillStyle = UNI; c.fill(); c.stroke();
}
function baseball(x, y, r, spin) {
  c.beginPath(); c.arc(x, y, r, 0, R2); ART.fillOut(c, '#fbfbf5', Math.max(1.2, r * 0.25));
  if (r > 4) { c.strokeStyle = '#e24b5b'; c.lineWidth = Math.max(1, r * 0.14); const o = Math.sin(spin) * r * 0.35; c.beginPath(); c.arc(x - r * 1.05 + o, y, r * 0.75, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(x + r * 1.05 + o, y, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); }
}
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function hitPos(h) { const e = Math.min(1, h.t / 1.4), ly = 560 - h.dist / 110 * (560 - WALL); const x = h.x0 + (180 + Math.sin(h.ang) * h.dist * 1.6 - h.x0) * e, y = h.y0 + (ly - h.y0) * e - Math.sin(e * Math.PI) * (60 + h.dist * 1.1); return [x, y, e, ly]; }

k.run((dt) => {
  msgT -= dt; tm += dt; outMarks = outMarks.map((m) => Math.min(1, m + dt * 4));
  for (const f of fw) f.t -= dt; fw = fw.filter((f) => f.t > 0);
  if (!k.gate(reset)) return;
  if (swing > 0) swing -= dt;
  if (outs >= 10 && !ball && msgT < 0.2) return k.lose(CFG.id, hrs, 'Fin del Derby', `${hrs} jonrones · ${total} m`);
  if (!ball) { wait -= dt; if (wait <= 0) pitch(); return; }
  if (hit) { hit.t += dt; const [x, y] = hitPos(hit); trail.push([x, y]); if (trail.length > 14) trail.shift();
    if (hit.hr && hit.t > 1 && !hit.boom) { hit.boom = 1; for (let i = 0; i < 3; i++) fw.push({ x: k.rnd(60, 300), y: k.rnd(40, 120), t: 0.9 + i * 0.25, d: i * 0.25, col: k.pick(['#f2d15c', '#ff5fa2', '#5ce1e6', '#7cf7a0']) }); }
    for (const f of fw) if (!f.done && f.t <= 0.9) { f.done = 1; k.burst(f.x, f.y, f.col, 26, 150); k.sfx('pop'); }
    if (hit.t > 1.9) { ball = null; wait = 1; } return; }
  ball.t += dt * ball.sp; ball.spin += dt * 20; const e = ball.t; ball.y = PY + e * (ZY - PY) / 0.93; ball.s = 0.3 + e * 0.7; ball.x = 180 + Math.sin(e * 3) * ball.curve * e;
  trail.push([ball.x, ball.y]); if (trail.length > 6) trail.shift();
  if ((k.ptr.hit || k.hit.has('a')) && swing <= 0) { swing = 0.3; k.sfx('jump'); const off = e - 0.93;
    if (Math.abs(off) < 0.14 && Math.abs(ball.x - 180) < 66) { const q = 1 - Math.abs(off) / 0.14; const dist = Math.round(60 + q * 110 + k.rnd(-8, 8)); const ang = k.clamp(off * 6 + (ball.x - 180) / 120, -0.8, 0.8);
      hit = { t: 0, dist, ang, x0: ball.x, y0: ball.y, hr: dist >= 110 }; trail = []; k.sfx('hit'); k.shake(q > 0.7 ? 6 : 3); k.burst(ball.x, ball.y, '#fff', 10, 200);
      if (hit.hr) { hrs++; total += dist; streak++; k.sfx('win'); k.confetti(); k.flash('rgba(255,250,200,.35)'); say(streak > 1 ? `¡JONRÓN x${streak}!` : '¡JONRÓN!', '#fff27a', 1.8); navigator.vibrate && navigator.vibrate(40); }
      else { outs++; outMarks.push(0); streak = 0; say(`Atrapada · ${dist} m`, '#ffd08a', 1.5); } }
    else out(off < 0 ? 'Demasiado pronto' : 'Demasiado tarde'); }
  if (e > 1.15 && !hit) { if (swing <= 0) out('¡Strike!'); ball = null; wait = 1; }
}, () => {
  c.drawImage(BG, 0, 0, 360, 640);
  for (const f of fw) if (f.t < 0.9) { const p = 1 - f.t / 0.9; c.globalAlpha = 1 - p; c.strokeStyle = f.col; c.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * R2, r = 10 + p * 46; c.beginPath(); c.moveTo(f.x + Math.cos(a) * r * 0.6, f.y + Math.sin(a) * r * 0.6); c.lineTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r); c.stroke(); } c.globalAlpha = 1; }
  pitcher();
  // zona de strike (se ilumina cuando se puede batear)
  const inWin = ball && !hit && Math.abs(ball.t - 0.93) < 0.12; c.lineWidth = 2.5; c.strokeStyle = inWin ? 'rgba(255,242,122,.95)' : 'rgba(255,255,255,.35)'; c.setLineDash([7, 5]); ART.rr(c, 145, ZY - 32, 70, 64, 8); c.stroke(); c.setLineDash([]);
  if (inWin) { c.fillStyle = 'rgba(255,242,122,.12)'; c.fill(); }
  // bola lanzada: sombra, estela y bola
  if (ball && !hit) { const r = 9 * ball.s + 1.5; c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(ball.x, ball.y + 10 + 26 * ball.s, r, r * 0.35, 0, 0, R2); c.fill();
    trail.forEach(([x, y], i) => { c.globalAlpha = i / trail.length * 0.35; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r * (0.4 + i / trail.length * 0.5), 0, R2); c.fill(); }); c.globalAlpha = 1; baseball(ball.x, ball.y, r, ball.spin); }
  // bola bateada: estela larga, sombra en el césped y distancia
  if (hit) { const [x, y, e, ly] = hitPos(hit), r = 10 * (1 - e * 0.7);
    const sx = hit.x0 + (180 + Math.sin(hit.ang) * hit.dist * 1.6 - hit.x0) * e, sy = hit.y0 + (ly - hit.y0) * e; if (sy > WALL) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(sx, sy, r, r * 0.35, 0, 0, R2); c.fill(); }
    c.lineCap = 'round'; for (let i = 1; i < trail.length; i++) { c.globalAlpha = i / trail.length * 0.7; c.strokeStyle = hit.hr ? '#fff27a' : '#fff'; c.lineWidth = r * 1.4 * i / trail.length; c.beginPath(); c.moveTo(trail[i - 1][0], trail[i - 1][1]); c.lineTo(trail[i][0], trail[i][1]); c.stroke(); } c.globalAlpha = 1;
    baseball(x, Math.max(14, y), Math.max(2.5, r), tm * 30); if (e < 1 || hit.t < 1.9) label(`${Math.round(hit.dist * Math.min(1, e * 1.1))} m`, x + 14, Math.max(14, y) - 8, 14, hit.hr ? '#fff27a' : '#fff'); }
  batter();
  // HUD en las esquinas
  label(hrs, 14, 10, 34, '#fff27a'); label('JONRONES', 14, 48, 11, '#dfe6ff'); label(`${total} m`, 14, 64, 13, '#b8c6ff');
  for (let i = 0; i < 10; i++) { const x = 250 + (i % 5) * 20, y = 22 + Math.floor(i / 5) * 22; if (i < outs) { const s = 0.6 + (outMarks[i] || 1) * 0.4; c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.arc(0, 0, 8, 0, R2); ART.fillOut(c, '#e24b5b', 2); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-3.5, -3.5); c.lineTo(3.5, 3.5); c.moveTo(3.5, -3.5); c.lineTo(-3.5, 3.5); c.stroke(); c.restore(); } else baseball(x, y, 7.5, 0); }
  label('OUTS', 346, 58, 11, '#dfe6ff', 'right');
  if (msgT > 0) { const p = (msgD - msgT) / 0.18, s = p < 1 ? 0.6 + p * 0.55 : Math.max(1, 1.15 - (p - 1) * 0.3); c.save(); c.translate(180, 400); c.scale(s, s); c.globalAlpha = Math.min(1, msgT / 0.25); label(msg, 0, 0, msg.startsWith('¡J') ? 34 : 24, msgC, 'center', 'middle'); c.restore(); c.globalAlpha = 1; }
});
