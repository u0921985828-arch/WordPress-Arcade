/* Reflex Grid: golpea los topos antes de que se escondan y evita las bombas. 60 s.
 * Agujeros cacheados en un prado, topos que asoman con animación, topo dorado (+2 s), mazo animado y teclado con cursor. */
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
const k = Kit({ w: 360, h: 640, title: CFG.title, bg: '#3f9b4c' }), c = k.ctx;
let N, cells, time, score, combo, spawnT, lvl, mallet, sel, kbd, tm, lvlT, boardCv, el;
function reset() { N = 3; cells = Array(16).fill(null); time = 60; score = 0; combo = 0; spawnT = 1.2; lvl = 1; el = 0; mallet = null; sel = 4; kbd = false; tm = 0; lvlT = 0; boardCv = board(3); }
const cellR = (i) => { const S = 300 / N; return [30 + (i % N) * S, 196 + Math.floor(i / N) * S * 1.18, S, S * 1.18]; };
const holeC = (i) => { const [x, y, S] = cellR(i); return [x + S / 2, y + S * 0.78, S]; };

/* ---------- prado y agujeros cacheados (uno por tamaño de cuadrícula) */
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function board(n) { const saveN = N; N = n; const cv = off(360, 640, (g) => {
  let gr = g.createLinearGradient(0, 0, 0, 170); gr.addColorStop(0, '#6ec8ff'); gr.addColorStop(1, '#d4f1ff'); g.fillStyle = gr; g.fillRect(0, 0, 360, 170);
  g.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y] of [[60, 104], [250, 86], [330, 130]]) { g.beginPath(); g.arc(x, y, 14, 0, R2); g.arc(x + 18, y - 7, 18, 0, R2); g.arc(x + 38, y, 13, 0, R2); g.fill(); }
  g.fillStyle = '#8fd48a'; g.beginPath(); g.moveTo(0, 170); for (let x = 0; x <= 360; x += 10) g.lineTo(x, 138 - Math.sin(x / 60) * 14 - Math.sin(x / 23) * 4); g.lineTo(360, 170); g.fill();
  gr = g.createLinearGradient(0, 150, 0, 640); gr.addColorStop(0, '#5cc462'); gr.addColorStop(1, '#3a9a48'); g.fillStyle = gr; g.fillRect(0, 150, 360, 490);
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 9; i++) if (i % 2) g.fillRect(i * 40, 150, 40, 490);
  g.strokeStyle = 'rgba(30,90,40,.35)'; g.lineWidth = 1.5; for (let i = 0; i < 140; i++) { const x = rnd(i) * 360, y = 160 + rnd(i + 50) * 470; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 5); g.moveTo(x + 2, y); g.lineTo(x + 3, y - 6); g.stroke(); }
  for (let i = 0; i < 10; i++) { const x = rnd(i + 200) * 340 + 10, y = 170 + rnd(i + 300) * 450; g.fillStyle = ['#fff', '#ffe066', '#ff9ec7'][i % 3]; for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(x + Math.cos(j * 1.256) * 3, y + Math.sin(j * 1.256) * 3, 2.2, 0, R2); g.fill(); } g.fillStyle = '#f2b705'; g.beginPath(); g.arc(x, y, 1.8, 0, R2); g.fill(); }
  /* §8: el montículo es UNA pieza (corona de tierra); el hueco es un hueco de verdad, no otra forma
     encima, así que lleva su borde. Dentro, la separación cara alta / cara baja es sombra propia. */
  for (let i = 0; i < n * n; i++) { const [hx, hy, S] = holeC(i), rx = S * 0.38, ry = S * 0.14;
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(hx, hy + ry * 0.5, rx * 1.3, ry * 1.6, 0, 0, R2); g.fill();
    const rim = (q) => { q.ellipse(hx, hy, rx * 1.22, ry * 1.5, 0, 0, R2); q.moveTo(hx + rx, hy); q.ellipse(hx, hy, rx, ry, 0, 0, R2, true); };
    g.beginPath(); rim(g); g.fillStyle = '#b9834c'; g.fill('evenodd');
    clip8(g, rim, (q) => { q.fillStyle = DK8('#b9834c', 0.3); q.fillRect(hx - rx * 2, hy - ry * 0.3, rx * 4, ry * 4);
      q.fillStyle = LT8('#b9834c', 0.15); q.beginPath(); q.ellipse(hx, hy - ry * 0.6, rx * 1.16, ry * 1.1, 0, 0, R2); q.fill(); });
    g.beginPath(); rim(g); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, R2); const hg = g.createLinearGradient(0, hy - ry, 0, hy + ry); hg.addColorStop(0, '#120c20'); hg.addColorStop(1, '#3a2618'); g.fillStyle = hg; g.fill(); }
  // valla y arbustos al frente
  const posts = (q) => { for (let x = 6; x < 360; x += 30) rr8(q, x, 590, 16, 50, 3); };
  const rail = (q) => rr8(q, -4, 604, 368, 9, 3);
  unite8(g, [[posts, '#e8d2a8', { dx: 1.6, dy: 0 }], [rail, '#d6bb8a']], 1.6);
  seam8(g, rail, '#d6bb8a', (q) => q.fillRect(-4, 604, 368, 2.4), 0.24);
  g.beginPath(); for (let i = 0; i < 7; i++) { const x = i * 60 + (i % 2) * 14 - 10, y = 634; g.moveTo(x + 24, y); g.arc(x, y, 24, 0, R2); g.moveTo(x + 48, y - 8); g.arc(x + 26, y - 8, 22, 0, R2); }
  g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.fillStyle = '#34944a'; g.fill();
  g.fillStyle = 'rgba(255,255,255,.14)'; for (let i = 0; i < 7; i++) { const x = i * 60 + (i % 2) * 14 - 10; g.beginPath(); g.arc(x + 20, 614, 7, 0, R2); g.arc(x - 6, 622, 5, 0, R2); g.fill(); }
}); N = saveN; return cv; }
reset(); k.show(CFG.title, 'Golpea los topos lo más rápido posible. El dorado da +2 s. ¡No toques las bombas! 60 segundos. Teclado: flechas y A.');

function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
/* ---------- §8: topo, bomba y mazo en una sola pieza, horneados en sprites ----------
 * Medidas nominales para una casilla de 100 px; al pintar se escala S/100, así una sola caché
 * sirve para las cuadrículas de 3×3 y 4×4. */
const BW = 60, BH = 72, BR = BW * 0.48;
/* El cuerpo del topo es UN trazado: patas, manoplas, orejas, tronco y cabeza en subtrayectorias de
 * la misma forma. Se contornea una vez y se rellena una vez → dentro no queda ninguna juntura.
 * La barriga, la cara, los mofletes y la corona se leen por color, nunca por línea. */
function molePath(gold) {
  const hw = BW * 0.5, hy = -BH * 0.72;
  return (q) => {
    q.moveTo(-BW * 0.36 + BW * 0.17, -1); q.ellipse(-BW * 0.36, -1, BW * 0.17, BW * 0.115, 0, 0, P8T);
    q.moveTo(BW * 0.36 + BW * 0.17, -1); q.ellipse(BW * 0.36, -1, BW * 0.17, BW * 0.115, 0, 0, P8T);
    mitt8(-BW * 0.5, -BH * 0.33, -2.5, BW * 0.16, -1)(q);
    mitt8(BW * 0.5, -BH * 0.33, -0.64, BW * 0.16, 1)(q);
    q.moveTo(-BW * 0.42 + BW * 0.14, hy - BH * 0.2); q.arc(-BW * 0.42, hy - BH * 0.2, BW * 0.14, 0, P8T);
    q.moveTo(BW * 0.42 + BW * 0.14, hy - BH * 0.2); q.arc(BW * 0.42, hy - BH * 0.2, BW * 0.14, 0, P8T);
    if (gold) { q.moveTo(-hw * 0.52, hy - BH * 0.26); q.lineTo(-hw * 0.58, -BH * 1.2); q.lineTo(-hw * 0.2, -BH * 1.03); q.lineTo(0, -BH * 1.26); q.lineTo(hw * 0.2, -BH * 1.03); q.lineTo(hw * 0.58, -BH * 1.2); q.lineTo(hw * 0.52, hy - BH * 0.26); q.closePath(); }
    q.moveTo(-hw * 0.74, 3);
    q.bezierCurveTo(-hw * 0.9, -BH * 0.2, -hw * 0.86, -BH * 0.36, -hw * 0.8, -BH * 0.48);
    q.bezierCurveTo(-hw * 1.04, -BH * 0.66, -hw * 1.0, -BH * 1.0, 0, -BH * 1.0);
    q.bezierCurveTo(hw * 1.0, -BH * 1.0, hw * 1.04, -BH * 0.66, hw * 0.8, -BH * 0.48);
    q.bezierCurveTo(hw * 0.86, -BH * 0.36, hw * 0.9, -BH * 0.2, hw * 0.74, 3);
    q.closePath();
  };
}
function moleSpr(gold, dazed) {
  return spr8(`mole${gold}${dazed}`, 108, 126, 54, 112, (g) => {
    const body = molePath(gold), col = gold ? '#e0a92c' : '#8a5f3c', belly = gold ? '#ffeaa0' : '#dcb489', hy = -BH * 0.72;
    unite8(g, [[body, col, { dx: 2.4, dy: 2.2 }, (q) => {
      q.fillStyle = belly; q.beginPath(); q.ellipse(0, -BH * 0.26, BW * 0.3, BH * 0.28, 0, 0, P8T); q.fill();
      q.fillStyle = LT8(col, 0.26); q.beginPath(); q.ellipse(0, hy + BW * 0.15, BW * 0.27, BW * 0.2, 0, 0, P8T); q.fill();   // hocico, por cambio de color
      if (gold) { q.fillStyle = '#ffe14d'; q.beginPath(); q.ellipse(0, -BH * 1.1, BW * 0.46, BH * 0.18, 0, 0, P8T); q.fill(); q.fillStyle = '#ff5f7a'; q.beginPath(); q.arc(0, -BH * 1.1, 2.6, 0, P8T); q.fill(); }
      q.fillStyle = 'rgba(255,150,150,.45)'; q.beginPath(); q.ellipse(-BW * 0.3, hy + BH * 0.11, BW * 0.085, BW * 0.06, 0, 0, P8T); q.ellipse(BW * 0.3, hy + BH * 0.11, BW * 0.085, BW * 0.06, 0, 0, P8T); q.fill();
      if (dazed) { q.strokeStyle = AL8(P8OUT, 0.92); q.lineWidth = 2.2; q.lineCap = 'round';
        for (const sx of [-1, 1]) { const ex = sx * BW * 0.18; q.beginPath(); q.moveTo(ex - 4, hy - 4); q.lineTo(ex + 4, hy + 4); q.moveTo(ex + 4, hy - 4); q.lineTo(ex - 4, hy + 4); q.stroke(); } }
      else { eyes8(q, 0, hy, BW * 0.185, BW * 0.105, { lid: 0.24, ly: 0.3, iris: '#2f2440', lidCol: LT8(col, 0.3) });
        brow8(q, 0, hy - BW * 0.185, BW * 0.185, BW * 0.16, -0.6, DK8(col, 0.5), 1.15); }
      q.fillStyle = '#ff8fb0'; q.beginPath(); q.ellipse(0, hy + BW * 0.17, BW * 0.12, BW * 0.085, 0, 0, P8T); q.fill();
      q.fillStyle = '#fff'; q.fillRect(-BW * 0.07, hy + BW * 0.25, BW * 0.062, BW * 0.1); q.fillRect(BW * 0.008, hy + BW * 0.25, BW * 0.062, BW * 0.1);
      shine8(q, -BW * 0.27, hy - BH * 0.16, BW * 0.085, BW * 0.14, 0.4, 0.24);
    }]], 1.5);
  }, 3);
}
/* Bomba: esfera + casquillo en una pieza (el casquillo no se mueve por su cuenta). La mecha es una
 * línea abierta, no un contorno cerrado. */
function bombSpr() {
  return spr8('bomb', 96, 110, 48, 96, (g) => {
    const cy = -BR - 2;
    const body = (q) => { q.moveTo(BR, cy); q.arc(0, cy, BR, 0, P8T); rr8(q, -5, cy - BR - 7, 10, 10, 3); };
    unite8(g, [[body, '#2f2c42', { dx: 2.6, dy: 2.4 }, (q) => {
      shine8(q, -BR * 0.4, cy - BR * 0.42, BR * 0.26, BR * 0.16, -0.6, 0.32);
      q.strokeStyle = '#ff5f5f'; q.lineWidth = 2.6; q.lineCap = 'round';
      q.beginPath(); q.moveTo(-BR * 0.45, cy - BR * 0.25); q.lineTo(-BR * 0.12, cy - BR * 0.08); q.moveTo(BR * 0.45, cy - BR * 0.25); q.lineTo(BR * 0.12, cy - BR * 0.08); q.stroke();
      q.fillStyle = '#ff5f5f'; q.beginPath(); q.arc(-BR * 0.28, cy + BR * 0.06, BR * 0.1, 0, P8T); q.arc(BR * 0.28, cy + BR * 0.06, BR * 0.1, 0, P8T); q.fill();
    }]], 1.6);
    g.strokeStyle = '#c9a36a'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, cy - BR - 7); g.quadraticCurveTo(6, cy - BR - 18, 12, cy - BR - 14); g.stroke();
  }, 3);
}
/* Mazo: mango y cabeza son la misma pieza; las franjas blancas son cambio de color, no contornos. */
function malletSpr(L) {
  return spr8('mal' + Math.round(L), 84, L + 60, 42, L + 32, (g) => {
    const body = (q) => { rr8(q, -4, -L, 8, L + 6, 3); rr8(q, -24, -L - 13, 44, 26, 8); };
    const bandL = (q) => rr8(q, -26, -L - 9, 8, 18, 3), bandR = (q) => rr8(q, 14, -L - 9, 8, 18, 3);
    unite8(g, [[body, '#e24b5b', { dx: 2.2, dy: 2 }], [bandL, '#f4efe6'], [bandR, '#f4efe6']], 1.6);
    clip8(g, body, (q) => { q.fillStyle = '#c98a4b'; q.beginPath(); rr8(q, -4, -L + 12, 8, L, 3); q.fill();
      q.fillStyle = 'rgba(255,255,255,.3)'; q.fillRect(-17, -L - 9, 30, 4.5); });
  }, 3);
}
function whack(i) {
  const [hx, hy, S] = holeC(i), q = cells[i]; mallet = { x: hx + S * 0.5 + 16, y: hy + 6, tx: hx, ty: hy - S * 0.42, t: 0 };
  if (!q || q.hit) { combo = 0; k.sfx('click'); return; }
  q.hit = 0.001; q.life = Math.min(q.life, 0.35);
  if (q.bomb) { score = Math.max(0, score - 100); time -= 3; combo = 0; k.burst(hx, hy - S * 0.2, '#ff9a3c', 24, 220); k.burst(hx, hy - S * 0.2, '#555', 12, 140); k.sfx('explode'); k.shake(9); k.flash('rgba(255,120,60,.35)'); k.float('-3 s', hx, hy - S * 0.5, '#ff6b6b'); navigator.vibrate && navigator.vibrate(120); return; }
  combo++; const mul = Math.min(5, 1 + Math.floor(combo / 5)), pts = (q.gold ? 50 : 10) * mul; score += pts; if (q.gold) time += 2;
  k.burst(hx, hy - S * 0.25, q.gold ? '#f2d15c' : '#fff', 12, 180); k.sfx(q.gold ? 'coin' : 'hit'); k.shake(2);
  k.float(q.gold ? `+${pts}  +2 s` : `+${pts}`, hx, hy - S * 0.6, q.gold ? '#fff27a' : '#fff');
  if (combo > 0 && combo % 5 === 0 && combo <= 20) k.float(`Combo x${mul}`, 180, 176, '#fff27a');
}
k.run((dt) => {
  tm += dt; lvlT -= dt; if (mallet) { mallet.t += dt; if (mallet.t > 0.28) mallet = null; }
  for (let i = 0; i < 16; i++) { const q = cells[i]; if (q && q.hit) q.hit += dt; }
  if (!k.gate(reset)) return; time -= dt; if (time <= 0) { time = 0; return k.lose(CFG.id, score, '¡Tiempo!', `Nivel ${lvl}`); }
  if (score > 1500 && N === 3) { N = 4; cells = Array(16).fill(null); lvl = 2; lvlT = 1.6; sel = 5; boardCv = board(4); k.sfx('win'); k.confetti(); }
  /* dificultad (1.23: más fácil): d 0→1 en 82 s de juego (el oro no la rebaja); ritmo e intervalo suaves al principio, bombas desde los 5 s */
  el += dt; const d = Math.min(1, el / 82), e = d * d * (3 - 2 * d);
  spawnT -= dt; if (spawnT <= 0) { spawnT = 1.0 - 0.7 * e; const free = [...Array(N * N).keys()].filter((i) => !cells[i]); if (free.length) { const i = k.pick(free); const bomb = el > 5 && Math.random() < 0.05 + 0.1 * e, gold = !bomb && Math.random() < 0.1; const life = (2.0 - 1.3 * e) * (gold ? 0.6 : 1); cells[i] = { life, max: life, bomb, gold, age: 0, hit: 0 }; } }
  for (let i = 0; i < N * N; i++) { const q = cells[i]; if (!q) continue; q.age += dt; q.life -= dt; if (q.life <= 0) { if (!q.bomb && !q.hit) combo = 0; cells[i] = null; } }
  // teclado: cursor por la cuadrícula
  const mv = (dx, dy) => { kbd = true; const x = k.clamp(sel % N + dx, 0, N - 1), y = k.clamp(Math.floor(sel / N) + dy, 0, N - 1); sel = y * N + x; };
  if (k.hit.has('left')) mv(-1, 0); if (k.hit.has('right')) mv(1, 0); if (k.hit.has('up')) mv(0, -1); if (k.hit.has('down')) mv(0, 1);
  if (k.hit.has('a')) { kbd = true; whack(sel); }
  if (k.ptr.hit) { kbd = false; for (let i = 0; i < N * N; i++) { const [x, y, S, SY] = cellR(i); if (k.ptr.x > x && k.ptr.x < x + S && k.ptr.y > y && k.ptr.y < y + SY) { whack(i); break; } } }
}, () => {
  c.drawImage(boardCv, 0, 0, 360, 640);
  if (kbd && k.st === 'play') { const [hx, hy, S] = holeC(sel); c.lineWidth = 4; c.strokeStyle = '#fff27a'; c.setLineDash([8, 6]); c.beginPath(); c.ellipse(hx, hy, S * 0.5, S * 0.22, 0, 0, R2); c.stroke(); c.setLineDash([]); }
  for (let i = 0; i < N * N; i++) { const q = cells[i]; if (!q) continue; const [hx, hy, S] = holeC(i);
    // altura: sube con rebote, baja al final o al ser golpeado
    let up = q.age < 0.14 ? Math.sin(q.age / 0.14 * 1.9) / Math.sin(1.9) * 1.08 : 1; if (q.age >= 0.14 && q.age < 0.22) up = 1 + Math.sin((q.age - 0.14) / 0.08 * Math.PI) * 0.04;
    if (q.life < 0.16) up = Math.min(up, q.life / 0.16); if (q.hit && !q.bomb) up = Math.min(up, Math.max(0, 1 - Math.max(0, q.hit - 0.12) / 0.2));
    if (up <= 0.01) continue; const w = S * 0.6, h = S * 0.72, sq = q.hit && q.hit < 0.12 ? 0.18 : 0;
    c.save(); c.beginPath(); c.rect(hx - S / 2, hy - S * 1.2, S, S * 1.2); c.ellipse(hx, hy, S * 0.38, S * 0.14, 0, 0, Math.PI); c.clip();
    c.translate(hx, hy + (1 - up) * h * 1.05 + 4); c.scale(1 + sq, 1 - sq);
    if (q.bomb) { if (q.hit) { c.restore(); continue; }
      c.scale(S / 100, S / 100); blit8(c, bombSpr(), 0, 0);
      const sp = 4 + Math.sin(tm * 30) * 2, fx = 12, fy = -BR * 2 - 9;   // chispa: viva, no cacheada
      c.fillStyle = '#ffdd55'; c.beginPath(); for (let j = 0; j < 8; j++) { const a = j * 0.785, rr = j % 2 ? sp * 0.4 : sp; c.lineTo(fx + Math.cos(a) * rr, fy + Math.sin(a) * rr); } c.fill(); }
    else { c.scale(S / 100, S / 100); blit8(c, moleSpr(q.gold ? 1 : 0, q.hit ? 1 : 0), 0, 0); }
    c.restore();
    // estrellas de mareo
    if (q.hit && !q.bomb) { for (let j = 0; j < 3; j++) { const a = tm * 6 + j * 2.09, sx = hx + Math.cos(a) * S * 0.28, sy = hy - S * 0.62 + Math.sin(a) * S * 0.07; c.fillStyle = '#fff27a'; c.beginPath(); for (let m = 0; m < 10; m++) { const r = m % 2 ? 2.2 : 5.5, b = m * 0.628 - 1.57; c.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r); } c.closePath(); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); } }
    // aviso de tiempo: anillo que se vacía
    if (!q.hit) { const p = Math.max(0, q.life / q.max); c.strokeStyle = q.bomb ? 'rgba(255,95,95,.8)' : q.gold ? 'rgba(255,242,122,.9)' : 'rgba(255,255,255,.75)'; c.lineWidth = 3.5; c.beginPath(); c.ellipse(hx, hy + 3, S * 0.44, S * 0.18, 0, Math.PI * 0.5 - p * Math.PI, Math.PI * 0.5 + p * Math.PI); c.stroke(); } }
  // mazo
  if (mallet) { const L = Math.hypot(mallet.tx - mallet.x, mallet.ty - mallet.y), a1 = Math.atan2(mallet.tx - mallet.x, mallet.y - mallet.ty), p = Math.min(1, mallet.t / 0.07), a = a1 + (1 - p * p) * 0.9;
    c.save(); c.translate(mallet.x, mallet.y); c.rotate(a); c.globalAlpha = mallet.t > 0.2 ? 1 - (mallet.t - 0.2) / 0.08 : 1;
    blit8(c, malletSpr(L), 0, 0); c.restore(); c.globalAlpha = 1; }
  // HUD
  label(score, 16, 12, 36, '#fff'); label('PUNTOS', 18, 52, 11, '#eaffea');
  const tl = Math.ceil(Math.max(0, time)), low = time < 10; const cx = 330, cy = 34; c.beginPath(); c.arc(cx, cy, 15, 0, R2); ART.fillOut(c, '#fff', 3); c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 9); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(tm * 3) * 7, cy + Math.sin(tm * 3) * 7); c.stroke();
  label(`${tl}`, 308, 18, 30, low ? (Math.sin(tm * 12) > 0 ? '#ff5f5f' : '#fff') : '#fff', 'right');
  ART.rr(c, 16, 82, 328, 12, 6); c.fillStyle = 'rgba(26,21,48,.45)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); const tw = Math.min(1, time / 60) * 324; if (tw > 2) { ART.rr(c, 18, 84, tw, 8, 4); c.fillStyle = low ? '#ff6b6b' : '#fff27a'; c.fill(); }
  label(`Nivel ${lvl}`, 16, 104, 14, '#eaffea'); if (combo >= 5) label(`Combo x${Math.min(5, 1 + Math.floor(combo / 5))}`, 344, 104, 16, '#fff27a', 'right');
  if (lvlT > 0) { const s = lvlT > 1.4 ? 0.5 + (1.6 - lvlT) * 2.5 : 1; c.save(); c.translate(180, 150); c.scale(s, s); label('¡Nivel 2! Cuadrícula 4×4', 0, 0, 22, '#fff27a', 'center', 'middle'); c.restore(); }
});
