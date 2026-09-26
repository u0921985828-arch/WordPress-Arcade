/* PALABRAS: juegos de letras en español. CFG.mode:
 *  'daily' Palabra del Día: 5 letras, 6 intentos, verde/amarillo/gris; la misma palabra para todos cada día (fecha local, sin
 *          servidor), teclado en pantalla con Ñ, estadísticas en localStorage, compartir el resultado con cuadrados y modo práctica.
 *  'hang'  Ahorcado Ilustrado: dibujo propio progresivo (8 fallos), categorías, 5 palabras por partida, turnos 1–4 en la tele
 *          (la CPU rellena hasta 2) y podio. Acertar suma 10 por letra y repites turno; completar la palabra, +30.
 *  'sopa'  Sopa de Letras: rejilla generada con 8 palabras de una categoría; arrastra para marcar. Las direcciones crecen con el nivel.
 * Datos propios con fetch diferido: ../_data/palabras5-es.txt y ../_data/categorias-es.json. Se compara sin tildes; la Ñ es letra. */
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
const MODE = CFG.mode || 'daily', OUT = ART.OUT, TAU = 6.2832;
const LAND = innerWidth >= innerHeight * 0.98;
const W = LAND ? 800 : 450, H = LAND ? 450 : 800;
const k = Kit({ w: W, h: H, title: CFG.title, bg: MODE === 'hang' ? '#1d2b4a' : MODE === 'sopa' ? '#1c2342' : '#171c36' }), c = k.ctx;
const FONT = (s, wt) => `${wt || 800} ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
const ST = (key, def) => { try { const v = localStorage.getItem(key); return v == null ? def : JSON.parse(v); } catch (e) { return def; } };
const SAVE = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
const tell = (type, x) => { try { if (parent !== window) parent.postMessage(Object.assign({ type }, x || {}), '*'); } catch (e) { /* aislado */ } };
const ACC = { 'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e', 'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i', 'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u' };
const norm = (s) => s.toLowerCase().replace(/[áàäâéèëêíìïîóòöôúùüû]/g, (m) => ACC[m]).toUpperCase();
const ALPHA = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

/* ---------- Dibujo común ---------- */
function panel(x, y, w, h, r, fill, o) {
  o = o || {};
  if (!o.flat) { c.fillStyle = 'rgba(6,4,20,.42)'; ART.rr(c, x, y + (o.drop == null ? 4 : o.drop), w, h, r); c.fill(); }
  /* §8: tres tonos planos con borde DURO (sin degradado), un solo contorno exterior */
  ART.rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill();
  c.lineWidth = o.lw || 3; c.strokeStyle = o.stroke || OUT; c.stroke();
  if (!o.nogl) { c.save(); ART.rr(c, x, y, w, h, r); c.clip();
    const bt = Math.min(8, h * 0.12); c.fillStyle = ART.dark(fill, 0.15); c.fillRect(x, y + h - bt, w, bt);
    c.fillStyle = ART.lite(fill, 0.16); c.fillRect(x, y, w, Math.min(9, h * 0.2)); c.restore(); }
}
function outlined(t, x, y, size, col, align, lw, wt) { c.font = FONT(size, wt || 900); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = lw || 5; c.strokeStyle = OUT; c.strokeText(t, x, y); c.fillStyle = col; c.fillText(t, x, y); }
function txt(t, x, y, size, col, align, wt) { c.font = FONT(size, wt || 800); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(t, x, y); }
function fitSize(t, maxW, size, min, wt) { let s = size; c.font = FONT(s, wt || 800); while (s > (min || 10) && c.measureText(t).width > maxW) { s--; c.font = FONT(s, wt || 800); } return s; }
const inR = (r, x, y) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
let bgC = null;
function backdrop(top, bot, dots) {
  if (bgC) return bgC;
  bgC = document.createElement('canvas'); bgC.width = W; bgC.height = H; const g = bgC.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* letras flotando al fondo, muy tenues */
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < (dots || 26); i++) { g.save(); g.translate(Math.random() * W, Math.random() * H); g.rotate(Math.random() - 0.5); g.font = FONT(20 + Math.random() * 46, 900); g.fillStyle = ART.alpha('#ffffff', 0.025 + Math.random() * 0.035); g.fillText(ALPHA[Math.floor(Math.random() * 27)], 0, 0); g.restore(); }
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  return bgC;
}
/* Ficha de letra en relieve (estado: -1 vacía, 0 gris, 1 amarilla, 2 verde, 3 escrita sin evaluar). */
const TCOL = ['#5b5f78', '#e3b43c', '#4caf62'];
function tile(x, y, s, ch, stt, sy, big) {
  sy = sy == null ? 1 : sy;
  c.save(); c.translate(x + s / 2, y + s / 2); c.scale(1, Math.max(0.02, sy));
  const r = s * 0.16;
  if (stt < 0) { ART.rr(c, -s / 2, -s / 2, s, s, r); c.fillStyle = 'rgba(255,255,255,.06)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,.18)'; c.stroke(); c.restore(); return; }
  const f = stt === 3 ? '#f4f0ff' : TCOL[stt];
  c.fillStyle = 'rgba(6,4,20,.45)'; ART.rr(c, -s / 2, -s / 2 + 4, s, s, r); c.fill();
  ART.rr(c, -s / 2, -s / 2, s, s, r); c.fillStyle = f; c.fill();
  c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  c.save(); ART.rr(c, -s / 2, -s / 2, s, s, r); c.clip();
  c.fillStyle = ART.dark(f, 0.17); c.fillRect(-s / 2, s / 2 - s * 0.14, s, s * 0.14);
  c.fillStyle = ART.lite(f, 0.2); c.fillRect(-s / 2, -s / 2, s, s * 0.2); c.restore();
  c.fillStyle = 'rgba(255,255,255,.24)'; ART.rr(c, -s / 2 + 5, -s / 2 + 4, s - 10, s * 0.13, s * 0.065); c.fill();
  if (ch) { c.font = FONT(Math.round(s * (big || 0.56)), 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = stt === 3 ? OUT : '#fff'; if (stt !== 3) { c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = ART.alpha(OUT, 0.6); c.strokeText(ch, 0, 2); } c.fillText(ch, 0, 2); }
  c.restore();
}

/* ---------- Datos ---------- */
let SOL = null, VALID = null, CATS = null, LOADERR = false;
const needW = MODE === 'daily', needC = MODE === 'hang' || MODE === 'sopa';
let ROSCO = null, ANAG = null;
/* Cuando llegan los datos, si aún no se juega se rehace el tablero (si no, la pantalla se queda en «Cargando…»). */
const ready = () => { try { if (window.__m && k.st !== 'play') window.__m.reset(); } catch (e) { } };
if (MODE === 'abc') fetch('../_data/rosco-es.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => { ROSCO = d; ready(); })
  .catch(() => { LOADERR = true; ROSCO = { letras: 'ABC', r: { A: [{ d: 1, q: 'Insecto que fabrica miel.', a: ['abeja', 'abanico', 'almendra', 'ancla'] }], B: [{ d: 1, q: 'Embarcación pequeña de remos.', a: ['barca', 'bufanda', 'botella', 'bandeja'] }], C: [{ d: 1, q: 'Habitación donde se preparan las comidas.', a: ['cocina', 'cuadro', 'cortina', 'cuchara'] }] } }; ready(); });
if (MODE === 'ana') fetch('../_data/anagramas-es.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => { ANAG = d; ready(); })
  .catch(() => { LOADERR = true; ANAG = { racks: [{ l: 'CAMINOS', w: ['CAMINOS', 'CAMINO', 'CASINO', 'MOSCA', 'MINAS', 'MANOS', 'MANO', 'SANO', 'CASO', 'COSA', 'SACO', 'CIMA'] }] }; ready(); });
if (needW) fetch('../_data/palabras5-es.txt').then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).then((t) => {
  let sec = ''; const sol = [], adm = [];
  for (const ln of t.split('\n')) { const s = ln.trim(); if (!s) continue; if (s[0] === '#') { if (/soluciones/.test(s)) sec = 's'; else if (/admitidas/.test(s)) sec = 'a'; continue; } if (sec === 's') sol.push(s); else if (sec === 'a') adm.push(s); }
  SOL = sol.filter((w) => norm(w).length === 5); VALID = new Set(SOL.map(norm).concat(adm.map(norm)));
}).catch(() => { LOADERR = true; SOL = ['nubes', 'plaza', 'queso', 'libro', 'campo', 'playa', 'cielo', 'barco']; VALID = new Set(SOL.map(norm)); });
if (needC) fetch('../_data/categorias-es.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => { CATS = d; })
  .catch(() => { LOADERR = true; CATS = { Animales: ['perro', 'gato', 'caballo', 'conejo', 'tortuga', 'ballena', 'jirafa', 'elefante', 'pingüino', 'ardilla'], Frutas: ['manzana', 'naranja', 'plátano', 'fresa', 'cereza', 'melón', 'sandía', 'limón', 'kiwi', 'uva'] }; });

/* ===================================================================================== */
/* ============================== PALABRA DEL DÍA ====================================== */
/* ===================================================================================== */
const D = (() => {
  const KB = ['QWERTYUIOP', 'ASDFGHJKLÑ', '>ZXCVBNM<'];
  const L = LAND
    ? { ts: 58, tg: 7, bx: 34, by: 50, kx: 386, ky: 146, kw: 36.5, kh: 68, kg: 5, kr: 8 }
    : { ts: 62, tg: 8, bx: 54, by: 76, kx: 8, ky: 540, kw: 38, kh: 64, kg: 6, kr: 8 };
  const keys = [];
  KB.forEach((row, r) => {
    const unit = L.kw, gap = L.kg, wide = unit * 1.5 + gap * 0.5;
    const rowW = [...row].reduce((a, ch) => a + (ch === '>' || ch === '<' ? wide : unit), 0) + gap * (row.length - 1);
    const fullW = unit * 10 + gap * 9; let x = L.kx + (fullW - rowW) / 2;
    for (const ch of row) { const w = ch === '>' || ch === '<' ? wide : unit; keys.push({ ch, r, x, y: L.ky + r * (L.kh + L.kr), w, h: L.kh }); x += w + gap; }
  });
  const kbRow = (r) => keys.filter((q) => q.r === r);
  const D0 = Date.UTC(2026, 0, 1);
  const today = () => { const n = new Date(); return Math.floor((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - D0) / 864e5); };
  function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let perm = null;
  function dayWord(d) {
    if (!perm) { const r = mulberry(51719); perm = SOL.map((_, i) => i); for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; } }
    const n = SOL.length; return SOL[perm[((d % n) + n) % n]];
  }
  function evalG(g, s) {
    const res = [0, 0, 0, 0, 0], cnt = {};
    for (let i = 0; i < 5; i++) { if (g[i] === s[i]) res[i] = 2; else cnt[s[i]] = (cnt[s[i]] || 0) + 1; }
    for (let i = 0; i < 5; i++) if (res[i] !== 2 && cnt[g[i]] > 0) { res[i] = 1; cnt[g[i]]--; }
    return res;
  }
  const S = { day: 0, sol: '', solN: '', rows: [], cur: '', phase: 'idle', revT: 0, keyS: {}, practice: false, cur0: { r: 0, i: 0 }, showCur: false, shakeT: 0, msg: '', msgT: 0, doneT: 0, btn: 0, popT: [], winT: 0, started: false, shared: 0 };
  const STATS0 = { p: 0, w: 0, s: 0, m: 0, h: [0, 0, 0, 0, 0, 0], last: -9 };
  function stats() { const s = ST('pdd:stats', null); return s && s.h ? s : JSON.parse(JSON.stringify(STATS0)); }
  function applyKeys() { S.keyS = {}; for (const r of S.rows) r.g.split('').forEach((ch, i) => { S.keyS[ch] = Math.max(S.keyS[ch] == null ? -1 : S.keyS[ch], r.res[i]); }); }
  function load(practice) {
    S.practice = practice; S.cur = ''; S.rows = []; S.phase = 'play'; S.revT = 0; S.doneT = 0; S.btn = 0; S.winT = 0; S.msg = ''; S.shared = 0; S.popT = [0, 0, 0, 0, 0];
    if (!practice) {
      S.day = today(); S.sol = dayWord(S.day);
      const sv = ST('pdd:v1', null);
      if (sv && sv.day === S.day && Array.isArray(sv.rows)) for (const g of sv.rows) S.rows.push({ g, res: evalG(g, norm(S.sol)) });
    } else { let w; do { w = k.pick(SOL); } while (SOL.length > 1 && w === dayWord(today())); S.sol = w; }
    S.solN = norm(S.sol); applyKeys();
    const last = S.rows[S.rows.length - 1];
    if (last && (last.g === S.solN || S.rows.length >= 6)) { S.phase = 'done'; S.doneT = 1; S.winT = 0; }
  }
  function say(m) { S.msg = m; S.msgT = 1.8; }
  function typeL(ch) { if (S.phase !== 'play' || S.cur.length >= 5) return; S.cur += ch; S.popT[S.cur.length - 1] = 0.12; k.sfx('click'); }
  function del() { if (S.phase !== 'play' || !S.cur) return; S.cur = S.cur.slice(0, -1); k.sfx('pop'); }
  function submit() {
    if (S.phase !== 'play') return;
    if (S.cur.length < 5) { say('Faltan letras'); S.shakeT = 0.4; k.sfx('hurt'); return; }
    if (!VALID.has(S.cur)) { say('No está en la lista'); S.shakeT = 0.4; k.sfx('hurt'); return; }
    S.rows.push({ g: S.cur, res: evalG(S.cur, S.solN) }); S.cur = ''; S.phase = 'reveal'; S.revT = 0; k.sfx('start');
    if (!S.practice) SAVE('pdd:v1', { day: S.day, rows: S.rows.map((r) => r.g) });
  }
  function finishRow() {
    applyKeys(); const last = S.rows[S.rows.length - 1], won = last.g === S.solN, n = S.rows.length;
    if (!won && n < 6) { S.phase = 'play'; return; }
    S.phase = 'done'; S.doneT = 0; S.btn = 0;
    if (!S.practice) {
      const st = stats();
      if (st.last !== S.day) {
        st.p++; if (won) { st.w++; st.h[n - 1]++; st.s = st.last === S.day - 1 || st.s === 0 ? st.s + 1 : 1; st.m = Math.max(st.m, st.s); } else st.s = 0;
        st.last = S.day; SAVE('pdd:stats', st);
      }
    }
    const score = won ? (7 - n) * 100 : 0;
    if (won) { S.winT = 1.2; k.sfx('win'); k.confetti(); say(['¡Genial!', '¡Magnífico!', '¡Impresionante!', '¡Muy bien!', '¡Bien!', '¡Por los pelos!'][n - 1]); k.best(CFG.id, score); }
    else { k.sfx('lose'); k.shake(5); say('Era ' + S.sol.toUpperCase()); }
    tell('arcade:over', { score });
  }
  function shareText() {
    const last = S.rows[S.rows.length - 1], won = last && last.g === S.solN;
    const head = S.practice ? 'Palabra del Día (práctica)' : 'Palabra del Día nº ' + (S.day + 1);
    return `${head} ${won ? S.rows.length : 'X'}/6\n\n` + S.rows.map((r) => r.res.map((v) => (v === 2 ? '🟩' : v === 1 ? '🟨' : '⬜')).join('')).join('\n');
  }
  function share() {
    const t = shareText();
    const copied = () => { S.shared = 1; say('Resultado copiado'); k.sfx('coin'); };
    const fallback = () => { try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); copied(); } catch (e) { say('No se pudo copiar'); } };
    try {
      if (navigator.share && matchMedia('(pointer:coarse)').matches) { navigator.share({ text: t }).then(() => { S.shared = 1; }).catch(() => { if (navigator.clipboard) navigator.clipboard.writeText(t).then(copied, fallback); else fallback(); }); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(copied, fallback); else fallback();
    } catch (e) { fallback(); }
  }
  function press(ch) { if (ch === '>') submit(); else if (ch === '<') del(); else typeL(ch); }
  /* Panel de resultados (dibujado en el lienzo) */
  function doneBox() { return LAND ? [396, 25, 380, 405] : [30, 110, 390, 560]; }
  function btnRects() { const [x, y, w, h] = doneBox(); const bw = (w - 48) / 2, by = y + h - 74; return [[x + 16, by, bw, 56], [x + 32 + bw, by, bw, 56]]; }
  function startPractice() { load(true); tell('arcade:restart'); k.sfx('start'); }
  function update(dt) {
    if (!SOL) return;
    if (!S.started) { S.started = true; load(false); if (S.phase === 'done') S.doneT = 0.2; }
    S.msgT = Math.max(0, S.msgT - dt); S.shakeT = Math.max(0, S.shakeT - dt); S.winT = Math.max(0, S.winT - dt);
    for (let i = 0; i < 5; i++) S.popT[i] = Math.max(0, S.popT[i] - dt);
    if (S.phase === 'reveal') {
      const prev = S.revT; S.revT += dt;
      for (let i = 0; i < 5; i++) { const tt = i * 0.28 + 0.14; if (prev < tt && S.revT >= tt) { const v = S.rows[S.rows.length - 1].res[i]; k.sfx(v === 2 ? 'coin' : v === 1 ? 'pop' : 'click'); } }
      if (S.revT > 5 * 0.28 + 0.2) finishRow();
      return;
    }
    if (S.phase === 'done') {
      S.doneT += dt; if (S.doneT < 1.1) return;
      const br = btnRects();
      if (k.hit.has('left')) { S.btn = 0; k.sfx('click'); } if (k.hit.has('right')) { S.btn = 1; k.sfx('click'); }
      if (k.ptr.hit) { if (inR(br[0], k.ptr.x, k.ptr.y)) share(); else if (inR(br[1], k.ptr.x, k.ptr.y)) startPractice(); }
      else if (k.hit.has('a')) { if (S.btn === 0) share(); else startPractice(); }
      return;
    }
    /* jugando: toque, cursor (mando/flechas) y teclado físico (ver listener) */
    if (k.ptr.hit) { const q = keys.find((kk) => inR([kk.x - 2, kk.y - 3, kk.w + 4, kk.h + 6], k.ptr.x, k.ptr.y)); if (q) { press(q.ch); S.showCur = false; } }
    const cr = S.cur0, mv = (dr, di) => {
      S.showCur = true; let r = cr.r + dr, row;
      r = (r + 3) % 3; row = kbRow(r);
      if (dr) { const cx = kbRow(cr.r)[Math.min(cr.i, kbRow(cr.r).length - 1)]; const mx = cx.x + cx.w / 2; let bi = 0, bd = 1e9; row.forEach((q, j) => { const d = Math.abs(q.x + q.w / 2 - mx); if (d < bd) { bd = d; bi = j; } }); cr.i = bi; }
      else cr.i = (cr.i + di + row.length) % row.length;
      cr.r = r; k.sfx('click');
    };
    if (k.hit.has('up')) mv(-1, 0); if (k.hit.has('down')) mv(1, 0); if (k.hit.has('left')) mv(0, -1); if (k.hit.has('right')) mv(0, 1);
    if (k.hit.has('a')) { if (S.showCur) press(kbRow(cr.r)[cr.i].ch); else if (S.cur.length === 5) submit(); else { S.showCur = true; k.sfx('click'); } }
    if (k.hit.has('b')) del();
  }
  function onKey(e) {
    if (!e.isTrusted || k.st !== 'play' || k.paused || !SOL || e.ctrlKey || e.metaKey || e.altKey) return false;
    if (S.phase === 'done') return false;
    const key = e.key || '';
    if (key.length === 1 && /[a-zñáéíóúü]/i.test(key)) { typeL(norm(key)); S.showCur = false; return true; }
    if (key === 'Backspace') { del(); return true; }
    if (key === 'Enter') { submit(); return true; }
    return false;
  }
  const DEMO = [['CARTA', 'LUNES'], ['PUNTO', 'LUNES'], ['LUNES', 'LUNES']];
  function drawBoard(t) {
    const { ts, tg, bx, by } = L, last = S.rows.length - 1;
    for (let r = 0; r < 6; r++) {
      const sh = S.shakeT > 0 && r === S.rows.length && S.phase === 'play' ? Math.sin(S.shakeT * 60) * 8 * (S.shakeT / 0.4) : 0;
      for (let i = 0; i < 5; i++) {
        const x = bx + i * (ts + tg) + sh, y = by + r * (ts + tg);
        let ch = '', stt = -1, sy = 1, dy = 0;
        if (!S.started) { const d = DEMO[r]; if (d) { ch = d[0][i]; stt = evalG(d[0], d[1])[i]; if (r === 2) dy = -Math.max(0, Math.sin(t * 3 - i * 0.5)) * 6; } }
        else if (r < S.rows.length) {
          const row = S.rows[r]; ch = row.g[i]; stt = row.res[i];
          if (r === last && S.phase === 'reveal') { const p = (S.revT - i * 0.28) / 0.28; if (p < 0) stt = 3; else if (p < 1) { sy = Math.abs(Math.cos(Math.PI * p)); if (p < 0.5) stt = 3; } }
          if (r === last && S.winT > 0 && row.g === S.solN) dy = -Math.max(0, Math.sin((1.2 - S.winT) * 9 - i * 0.6)) * 14;
        } else if (r === S.rows.length && S.phase === 'play') { ch = S.cur[i] || ''; stt = ch ? 3 : -1; }
        const pop = S.popT[i] > 0 && r === S.rows.length ? 1 + S.popT[i] : 1;
        if (pop !== 1) { c.save(); c.translate(x + ts / 2, y + ts / 2); c.scale(pop, pop); c.translate(-x - ts / 2, -y - ts / 2); tile(x, y + dy, ts, ch, stt, sy); c.restore(); }
        else tile(x, y + dy, ts, ch, stt, sy);
      }
    }
  }
  function drawKeys() {
    const cr = S.cur0;
    keys.forEach((q) => {
      const st = S.keyS[q.ch], fill = st == null || st < 0 ? '#8d86c9' : st === 0 ? '#3b3d52' : TCOL[st];
      const pressed = k.ptr.down && inR([q.x, q.y, q.w, q.h], k.ptr.x, k.ptr.y) && S.phase === 'play';
      panel(q.x, q.y + (pressed ? 3 : 0), q.w, q.h, 9, q.ch === '>' ? '#6e62f5' : q.ch === '<' ? '#c0587a' : fill, { drop: pressed ? 1 : 4, lw: 2.5 });
      if (q.ch === '>') txt(LAND ? 'ENVIAR' : 'ENVIAR', q.x + q.w / 2, q.y + q.h / 2 + (pressed ? 3 : 0), fitSize('ENVIAR', q.w - 6, 16, 10, 900), '#fff', 'center', 900);
      else if (q.ch === '<') { const cx = q.x + q.w / 2, cy = q.y + q.h / 2 + (pressed ? 3 : 0); c.save(); c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 16, cy); c.lineTo(cx - 7, cy - 10); c.lineTo(cx + 15, cy - 10); c.lineTo(cx + 15, cy + 10); c.lineTo(cx - 7, cy + 10); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#c0587a'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - 2, cy - 5); c.lineTo(cx + 8, cy + 5); c.moveTo(cx + 8, cy - 5); c.lineTo(cx - 2, cy + 5); c.stroke(); c.restore(); }
      else outlined(q.ch, q.x + q.w / 2, q.y + q.h / 2 + (pressed ? 3 : 0), 22, '#fff', 'center', 4);
    });
    if (S.showCur && S.phase === 'play') { const q = kbRow(cr.r)[cr.i]; if (q) { c.save(); ART.rr(c, q.x - 4, q.y - 4, q.w + 8, q.h + 8, 11); c.strokeStyle = ART.alpha('#ffd166', 0.32); c.lineWidth = 9; c.stroke(); c.strokeStyle = '#ffd166'; c.lineWidth = 4; c.stroke(); c.restore(); } }
  }
  function countdown() { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), s = Math.max(0, Math.floor((m - n) / 1000)); const p = (v) => String(v).padStart(2, '0'); return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`; }
  function drawDone() {
    const a = Math.min(1, Math.max(0, (S.doneT - 0.9) / 0.3)); if (a <= 0) return;
    const [x, y, w, h] = doneBox(), last = S.rows[S.rows.length - 1], won = last && last.g === S.solN;
    c.save(); c.globalAlpha = a; c.translate(0, (1 - a) * 30);
    if (!LAND) { c.fillStyle = 'rgba(8,6,24,.55)'; c.fillRect(0, 0, W, H); }
    panel(x, y, w, h, 20, '#2c2766', { lw: 4 });
    outlined(won ? '¡Acertaste!' : 'Casi…', x + w / 2, y + 36, 30, won ? '#7cf7a0' : '#ffb0b0', 'center', 6);
    txt('La palabra: ' + S.sol.toUpperCase(), x + w / 2, y + 70, 20, '#fff', 'center', 800);
    let yy = y + 96;
    if (!S.practice) {
      const st = stats(), cols = [['Jugadas', st.p], ['% victorias', st.p ? Math.round((st.w / st.p) * 100) : 0], ['Racha', st.s], ['Mejor', st.m]];
      cols.forEach(([lb, v], i) => { const cx = x + (w / 4) * (i + 0.5); outlined(String(v), cx, yy + 16, 28, '#ffd166', 'center', 5); txt(lb, cx, yy + 44, 14, '#cfc8ff', 'center', 700); });
      yy += 64;
      const hMax = Math.max(1, ...st.h), bh = LAND ? 18 : 30, gap = LAND ? 3 : 8;
      if (!LAND) { txt('Intentos', x + w / 2, yy + 8, 16, '#cfc8ff', 'center', 800); yy += 22; }
      st.h.forEach((v, i) => { const by = yy + i * (bh + gap), bw = 28 + (w - 90) * (v / hMax), hi = won && i === S.rows.length - 1; txt(String(i + 1), x + 24, by + bh / 2, 16, '#fff', 'center', 900); c.fillStyle = hi ? '#4caf62' : '#5b5f78'; ART.rr(c, x + 40, by, bw, bh, 6); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); txt(String(v), x + 40 + bw - 12, by + bh / 2 + 1, 15, '#fff', 'center', 900); });
      yy += 6 * (bh + gap) + 4;
      txt('Nueva palabra en ' + countdown(), x + w / 2, yy + 10, 17, '#fff', 'center', 800);
    } else {
      const st = stats(), l1 = 'Partida de práctica: no cuenta para la racha.';
      txt(l1, x + w / 2, yy + 20, fitSize(l1, w - 24, 16, 11, 700), '#cfc8ff', 'center', 700);
      outlined(won ? S.rows.length + '/6' : 'X/6', x + w / 2, yy + 80, 54, won ? '#7cf7a0' : '#ffb0b0', 'center', 7);
      txt('Racha diaria: ' + st.s + ' · Mejor: ' + st.m, x + w / 2, yy + 140, 17, '#fff', 'center', 800);
      txt('Nueva palabra del día en ' + countdown(), x + w / 2, yy + 170, 16, '#cfc8ff', 'center', 700);
    }
    const br = btnRects(), lab = ['Compartir', S.practice ? 'Otra palabra' : 'Practicar'];
    br.forEach((r, i) => { panel(r[0], r[1], r[2], r[3], 14, i ? '#6e62f5' : '#3fa55a', { lw: 3 }); outlined(lab[i], r[0] + r[2] / 2, r[1] + r[3] / 2, 21, '#fff', 'center', 4); if (S.btn === i && S.doneT > 1.1) { c.save(); c.lineWidth = 4; c.strokeStyle = '#ffd166'; ART.rr(c, r[0] - 5, r[1] - 5, r[2] + 10, r[3] + 10, 17); c.stroke(); c.restore(); } });
    c.restore();
  }
  function draw() {
    const t = performance.now() / 1000;
    c.drawImage(backdrop('#232a52', '#0f1228', 12), 0, 0);
    /* cabecera */
    const title = !S.started ? CFG.title : S.practice ? 'Práctica' : 'Palabra del Día nº ' + (S.day + 1);
    if (LAND) { outlined(title, L.kx + (L.kw * 10 + L.kg * 9) / 2, 48, fitSize(title, 390, 30, 16, 900), '#ffd166', 'center', 6); txt(S.started ? `Intento ${Math.min(6, S.rows.length + 1)} de 6` : 'Cinco letras, seis intentos', L.kx + (L.kw * 10 + L.kg * 9) / 2, 88, 18, '#cfc8ff', 'center', 700); }
    else { outlined(title, W / 2, 38, fitSize(title, 420, 30, 16, 900), '#ffd166', 'center', 6); }
    drawBoard(t); drawKeys();
    if (!S.started) {
      /* leyenda para la pantalla previa */
      const lx = LAND ? L.kx + 20 : 30, ly = LAND ? 412 : 510;
      [[2, 'En su sitio'], [1, 'En otro sitio'], [0, 'No está']].forEach(([s, lb], i) => { const x = lx + i * (LAND ? 130 : 126); tile(x, ly - 12, 24, '', s); txt(lb, x + 30, ly, 13, '#e8e3ff', 'left', 700); });
    }
    if (S.msgT > 0 && S.msg) { const a = Math.min(1, S.msgT * 3), mx = LAND ? L.bx + (L.ts * 5 + L.tg * 4) / 2 : W / 2, my = LAND ? 30 : 512; c.save(); c.globalAlpha = a; c.font = FONT(19, 900); const mw = c.measureText(S.msg).width + 36; panel(mx - mw / 2, my - 19, mw, 38, 19, '#f4f0ff', { drop: 3, lw: 3 }); txt(S.msg, mx, my + 1, 19, OUT, 'center', 900); c.restore(); }
    if (S.phase === 'done') drawDone();
  }
  return { st: () => S, reset() {}, update, draw, onKey, intro: 'Adivina la palabra de cinco letras en seis intentos. Verde: letra bien colocada · amarillo: está en otro sitio · gris: no está. Todos juegan la misma palabra hoy.' };
})();

/* ===================================================================================== */
/* ============================== AHORCADO ILUSTRADO =================================== */
/* ===================================================================================== */
const HG = (() => {
  const NW = 5, MAXM = 8, FREQ = 'EAOSRNIDLCTUMPBGVYQHFZJÑXKW';
  const COLS = 9, ROWS = 3;
  const L = LAND
    ? { top: [16, 8, 768, 40], art: [16, 58, 316, 380], chips: [346, 58, 438, 48], word: [346, 118, 438, 86], ab: [346, 222, 438, 216] }
    : { top: [12, 10, 426, 42], art: [12, 118, 426, 318], chips: [12, 60, 426, 48], word: [12, 448, 426, 82], ab: [12, 548, 426, 236] };
  const lvl = () => Math.min(8, Math.floor(+ST('cpu:' + CFG.id, 0) || 0));
  let seats, words, wi, guessed, miss, turn, phase, pt, turnT, first, started, rescueT, lastMsg, msgT, cursorShown;
  function keyRect(i) { const [x, y, w, h] = L.ab, g = 6, kw = (w - g * (COLS - 1)) / COLS, kh = (h - g * (ROWS - 1)) / ROWS; return [x + (i % COLS) * (kw + g), y + Math.floor(i / COLS) * (kh + g), kw, kh]; }
  function mkWords() {
    const cats = Object.keys(CATS), out = [], used = new Set(), usedC = [];
    for (let n = 0; n < NW; n++) {
      let cat, pool; let tries = 0;
      do { cat = k.pick(cats); pool = CATS[cat].filter((w) => !used.has(w) && /^[a-záéíóúüñ]+$/i.test(w) && norm(w).length >= 4 + (n > 2 ? 1 : 0) && norm(w).length <= 10); tries++; } while ((!pool.length || (usedC.includes(cat) && tries < 20)) && tries < 40);
      if (!pool.length) pool = CATS[cat];
      const w = k.pick(pool); used.add(w); usedC.push(cat); out.push({ cat, w: w.toUpperCase(), n: norm(w) });
    }
    return out;
  }
  function seatList() {
    let n = 2; if (k.party) n = Math.max(2, Math.max(...k.party.map((x) => x.p)) + 1);
    return k.players(n).map((pl) => ({ p: pl.p, cpu: pl.cpu, name: pl.cpu ? 'CPU' : k.party ? pl.name : 'Tú', score: 0, cur: 0, cpuT: 0 }));
  }
  function reset() { seats = seatList(); words = null; wi = -1; phase = 'wait'; pt = 0; started = false; first = 0; msgT = 0; }
  const W0 = () => words[wi];
  const solved = () => [...W0().n].every((ch) => guessed.has(ch));
  function say(m) { lastMsg = m; msgT = 1.6; }
  function nextWord() {
    wi++; guessed = new Set(); miss = 0; phase = 'turn'; pt = 0; rescueT = 0;
    turn = (first + wi) % seats.length; startTurn(); k.sfx('start');
  }
  function startTurn() { turnT = 0; const s = seats[turn]; s.cpuT = k.rnd(0.9, 1.7); if (k.privOK) for (const q of seats) if (!q.cpu) k.priv(q.p, q === s ? { title: '¡Tu turno!', text: 'Elige una letra con el joystick y pulsa A.', items: [] } : { title: 'Turno de ' + s.name, text: '', items: [] }); }
  function passTurn() { turn = (turn + 1) % seats.length; startTurn(); }
  function slotX(i) { const n = W0().n.length, [x, , w] = L.word, bw = Math.min(40, (w - (n - 1) * 5) / n); return x + (w - (n * bw + (n - 1) * 5)) / 2 + i * (bw + 5) + bw / 2; }
  function pickL(ch) {
    if (phase !== 'turn' || guessed.has(ch)) return;
    guessed.add(ch); const s = seats[turn], w = W0(), cnt = [...w.n].filter((x) => x === ch).length;
    const ki = ALPHA.indexOf(ch), kr = keyRect(ki);
    if (cnt) {
      s.score += 10 * cnt; k.sfx('coin'); k.float('+' + 10 * cnt, kr[0] + kr[2] / 2, kr[1], '#7cf7a0');
      [...w.n].forEach((x, i) => { if (x === ch) k.burst(slotX(i), L.word[1] + L.word[3] / 2, k.pcol(s.p), 8, 120); });
      if (solved()) { s.score += 30; k.float('+30', slotX(Math.floor(w.n.length / 2)), L.word[1] - 4, '#ffd166'); k.sfx('win'); k.confetti(k.pcol(s.p), 60); phase = 'reveal'; pt = 0; rescueT = 0; say('¡' + s.name + ' completa la palabra!'); }
      else startTurn();
    } else {
      miss++; k.sfx('hurt'); k.shake(4); k.burst(kr[0] + kr[2] / 2, kr[1] + kr[3] / 2, '#ff6b6b', 10, 110);
      if (miss >= MAXM) { phase = 'reveal'; pt = 0; k.sfx('lose'); say('Era ' + w.w); } else passTurn();
    }
  }
  function cpuChoice() {
    const w = W0(), L2 = lvl(), smart = Math.random() < Math.min(0.6, 0.15 + L2 * 0.04); // 1.23: CPU más floja (antes 0.25 + 0.07/nivel, tope 0.85)
    if (smart) {
      const wrong = [...guessed].filter((ch) => !w.n.includes(ch));
      const cand = CATS[w.cat].map(norm).filter((x) => x.length === w.n.length && [...x].every((ch, i) => (guessed.has(w.n[i]) ? ch === w.n[i] : !guessed.has(ch))) && !wrong.some((ch) => x.includes(ch)));
      if (cand.length) { const cnt = {}; cand.forEach((x) => new Set(x).forEach((ch) => { if (!guessed.has(ch)) cnt[ch] = (cnt[ch] || 0) + 1; })); const best = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || FREQ.indexOf(a) - FREQ.indexOf(b))[0]; if (best) return best; }
    }
    for (const ch of FREQ) if (!guessed.has(ch) && Math.random() < 0.4) return ch;
    return [...FREQ].find((ch) => !guessed.has(ch));
  }
  function finish() {
    phase = 'end';
    const rows = seats.map((s) => ({ p: s.p, score: s.score, name: s.name })), top = rows.slice().sort((a, b) => b.score - a.score);
    const humTop = !seats.find((s) => s.p === top[0].p).cpu && (top.length < 2 || top[0].score > top[1].score);
    if (humTop) SAVE('cpu:' + CFG.id, Math.min(8, (+ST('cpu:' + CFG.id, 0) || 0) + 0.5));
    if (!k.party) k.best(CFG.id, seats[0].score);
    if (k.privOK) for (const q of seats) if (!q.cpu) k.priv(q.p, null);
    k.podium(rows, { head: humTop && !k.party ? '¡Has ganado!' : undefined, go: `${k.party ? '' : 'Tu récord: ' + k.best(CFG.id, 0) + '<br>'}Toca para otra partida` });
  }
  function update(dt) {
    if (!CATS) return;
    if (!started) { started = true; seats = seatList(); words = mkWords(); first = Math.floor(Math.random() * seats.length); k.count(3); return; }
    if (k.counting()) return;
    msgT = Math.max(0, msgT - dt);
    if (phase === 'wait') { nextWord(); return; }
    pt += dt;
    if (phase === 'reveal') { rescueT += dt; if (pt > 2.8 || (pt > 1.2 && !k.party && (k.hit.has('a') || k.ptr.hit))) { if (wi >= NW - 1) finish(); else nextWord(); } return; }
    if (phase !== 'turn') return;
    const s = seats[turn]; turnT += dt;
    const lim = k.party ? 15 : 25 * k.D.time;
    if (s.cpu) { if (turnT >= s.cpuT) pickL(cpuChoice()); return; }
    if (turnT > lim) { say('Se acabó el tiempo'); k.sfx('hurt'); passTurn(); return; }
    if (lim - turnT < 3.5 && Math.ceil(lim - turnT) !== Math.ceil(lim - turnT + dt)) k.sfx('tick');
    const dx = (k.phit(s.p, 'right') ? 1 : 0) - (k.phit(s.p, 'left') ? 1 : 0), dy = (k.phit(s.p, 'down') ? 1 : 0) - (k.phit(s.p, 'up') ? 1 : 0);
    if (dx || dy) {
      cursorShown = true; let cx = s.cur % COLS, cy = Math.floor(s.cur / COLS);
      cx = (cx + dx + COLS) % COLS; cy = (cy + dy + ROWS) % ROWS; s.cur = cy * COLS + cx; k.sfx('click');
    }
    if (k.phit(s.p, 'a')) { if (!cursorShown && !k.party) { cursorShown = true; k.sfx('click'); } else if (guessed.has(ALPHA[s.cur])) k.sfx('click'); else pickL(ALPHA[s.cur]); }
    if (s.p === 0 && k.ptr.hit) for (let i = 0; i < 27; i++) if (inR(keyRect(i), k.ptr.x, k.ptr.y)) { cursorShown = false; pickL(ALPHA[i]); break; }
  }
  function onKey(e) {
    if (!e.isTrusted || k.st !== 'play' || k.paused || !words || phase !== 'turn' || e.ctrlKey || e.metaKey || e.altKey) return false;
    const s = seats[turn]; if (s.cpu || s.p !== 0 || k.party) return false;
    const key = e.key || '';
    if (key.length === 1 && /[a-zñáéíóúü]/i.test(key)) { pickL(norm(key)); cursorShown = false; return true; }
    return false;
  }
  /* ---- ilustración ---- */
  let sceneC = null;
  function scene() {
    if (sceneC) return sceneC;
    const [, , w, h] = L.art; sceneC = document.createElement('canvas'); sceneC.width = w; sceneC.height = h; const g = sceneC.getContext('2d');
    g.save(); ART.rr(g, 0, 0, w, h, 18); g.clip();
    const sk = g.createLinearGradient(0, 0, 0, h); sk.addColorStop(0, '#7fc8f8'); sk.addColorStop(0.7, '#cfeaff'); sk.addColorStop(1, '#e9f7ff'); g.fillStyle = sk; g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(w * 0.8, h * 0.18, 4, w * 0.8, h * 0.18, 40); sun.addColorStop(0, '#fff6c9'); sun.addColorStop(0.5, '#ffd766'); sun.addColorStop(1, 'rgba(255,215,102,0)'); g.fillStyle = sun; g.beginPath(); g.arc(w * 0.8, h * 0.18, 40, 0, TAU); g.fill();
    const cloud = (x, y, s) => { g.fillStyle = '#ffffff'; g.strokeStyle = ART.alpha(OUT, 0.25); g.lineWidth = 2; g.beginPath(); g.arc(x, y, 14 * s, Math.PI * 0.5, Math.PI * 1.5); g.arc(x + 14 * s, y - 10 * s, 16 * s, Math.PI, 0); g.arc(x + 32 * s, y - 2 * s, 12 * s, Math.PI * 1.2, Math.PI * 0.5); g.closePath(); g.fill(); g.stroke(); };
    cloud(w * 0.12, h * 0.16, 1); cloud(w * 0.52, h * 0.1, 0.8);
    g.fillStyle = '#9fd38a'; g.beginPath(); g.moveTo(0, h * 0.8); g.quadraticCurveTo(w * 0.3, h * 0.66, w * 0.62, h * 0.78); g.quadraticCurveTo(w * 0.85, h * 0.7, w, h * 0.76); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    const gr = g.createLinearGradient(0, h * 0.82, 0, h); gr.addColorStop(0, '#6cc04a'); gr.addColorStop(1, '#3f8f35'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, h * 0.88); g.quadraticCurveTo(w * 0.5, h * 0.8, w, h * 0.88); g.lineTo(w, h); g.lineTo(0, h); g.fill(); g.strokeStyle = OUT; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h * 0.88); g.quadraticCurveTo(w * 0.5, h * 0.8, w, h * 0.88); g.stroke();
    for (let i = 0; i < 18; i++) { const x = Math.random() * w, y = h * 0.9 + Math.random() * h * 0.08; g.strokeStyle = '#2f7a2c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 7); g.moveTo(x, y); g.lineTo(x + 3, y - 8); g.stroke(); }
    g.restore();
    return sceneC;
  }
  function wood(x, y, w, h) { c.save(); ART.rr(c, x, y, w, h, 4); const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#b77a45'); g.addColorStop(1, '#7a4a26'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.beginPath(); if (w > h) { c.moveTo(x + 6, y + h * 0.35); c.lineTo(x + w - 6, y + h * 0.35); } else { c.moveTo(x + w * 0.35, y + 6); c.lineTo(x + w * 0.35, y + h - 6); } c.stroke(); c.restore(); }
  /* §8: el muñeco es UNA silueta — piernas, brazos, cuerpo, cabeza y pelo se funden; dentro solo hay
   * cambio de color. Las partes se añaden según los fallos, así que la unión se compone cada frame. */
  function figure(cx, cy, s, parts, mood, t, col) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    const sway = mood === 'happy' ? 0 : Math.sin(t * 2) * 0.06;
    c.translate(cx, cy); c.rotate(sway); c.translate(-cx, -cy);
    const P = [], limb = (x0, y0, x1, y1, cl, w) => P.push([bone8([[x0, y0], [x1, y1]], [w, w * 0.82]), cl]);
    if (parts >= 4) { const k2 = mood === 'happy' ? Math.sin(t * 12) * s * 0.1 : 0;
      limb(cx - s * 0.15, cy + s * 1.35, cx - s * 0.32 - k2, cy + s * 2.05, '#3a4a8a', s * 0.15);
      limb(cx + s * 0.15, cy + s * 1.35, cx + s * 0.32 + k2, cy + s * 2.05, '#3a4a8a', s * 0.15);
      P.push([(g) => { g.moveTo(cx - s * 0.22 - k2, cy + s * 2.08); g.ellipse(cx - s * 0.36 - k2, cy + s * 2.08, s * 0.16, s * 0.1, 0, 0, TAU); g.moveTo(cx + s * 0.52 + k2, cy + s * 2.08); g.ellipse(cx + s * 0.36 + k2, cy + s * 2.08, s * 0.16, s * 0.1, 0, 0, TAU); }, '#2a2350']); }
    if (parts >= 3) { const up = mood === 'happy' ? -s * 0.6 + Math.sin(t * 10) * s * 0.15 : s * 0.35;
      limb(cx - s * 0.3, cy + s * 0.75, cx - s * 0.75, cy + s * 0.65 + up, '#ffcf9e', s * 0.15);
      limb(cx + s * 0.3, cy + s * 0.75, cx + s * 0.75, cy + s * 0.65 + up, '#ffcf9e', s * 0.15);
      P.push([mitt8(cx - s * 0.78, cy + s * 0.65 + up, Math.PI * 0.9, s * 0.13, 1), '#ffcf9e']);
      P.push([mitt8(cx + s * 0.78, cy + s * 0.65 + up, Math.PI * 0.1, s * 0.13, -1), '#ffcf9e']); }
    if (parts >= 2) P.push([(g) => rr8(g, cx - s * 0.36, cy + s * 0.55, s * 0.72, s * 0.88, s * 0.22), col, { dx: s * 0.06, dy: s * 0.06 }]);
    if (parts >= 1) {
      P.push([(g) => { g.moveTo(cx + s * 0.55, cy); g.arc(cx, cy, s * 0.55, 0, TAU); }, '#ffd9b0', { dx: s * 0.05, dy: s * 0.05 }]);
      P.push([(g) => { g.moveTo(cx - s * 0.56, cy - s * 0.12); g.arc(cx, cy - s * 0.12, s * 0.56, Math.PI * 1.05, Math.PI * 1.95); g.quadraticCurveTo(cx, cy - s * 0.3, cx - s * 0.54, cy - s * 0.22); g.closePath(); }, '#5a3a22']);
    }
    if (P.length) unite8(c, P, Math.max(1.2, s * 0.055));
    if (parts >= 1) {
      if (mood === 'lost') { c.lineWidth = 2.5; c.strokeStyle = OUT; for (const ex of [-0.2, 0.2]) { c.beginPath(); c.moveTo(cx + s * (ex - 0.08), cy + s * 0.02); c.lineTo(cx + s * ex, cy + s * 0.08); c.lineTo(cx + s * (ex + 0.08), cy + s * 0.02); c.stroke(); } c.beginPath(); c.arc(cx, cy + s * 0.32, s * 0.1, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      else {
        eyes8(c, cx, cy + s * 0.05, s * 0.2, s * 0.115, { lid: 0.1, lidCol: '#f0b98d', sq: 1.15, lx: Math.sin(t * 1.3) * 0.7 });
        brow8(c, cx, cy - s * 0.15, s * 0.2, s * 0.2, mood === 'worry' ? 0.35 : -s * 0.03, '#5a3a22', s * 0.06);
        mouth8(c, cx, cy + s * 0.26, s * 0.3, mood === 'happy' ? 0 : mood === 'worry' ? 2 : 3);
        c.fillStyle = 'rgba(255,120,120,.35)'; c.beginPath(); c.arc(cx - s * 0.33, cy + s * 0.22, s * 0.08, 0, TAU); c.arc(cx + s * 0.33, cy + s * 0.22, s * 0.08, 0, TAU); c.fill();
      }
    }
    c.restore();
  }
  function drawArt(t, m, mood, sample) {
    const [ax, ay, aw, ah] = L.art;
    c.fillStyle = 'rgba(6,4,20,.42)'; ART.rr(c, ax, ay + 5, aw, ah, 18); c.fill();
    c.drawImage(scene(), ax, ay); ART.rr(c, ax, ay, aw, ah, 18); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    const gx = ax + aw * 0.28, gy = ay + ah * 0.86, top = ay + ah * 0.1, bw = aw * 0.5, s = Math.min(aw, ah) * 0.12;
    const happy = mood === 'happy';
    c.save(); if (happy) c.globalAlpha = Math.max(0.35, 1 - rescueT);
    if (m >= 1) { c.fillStyle = '#6b4a2b'; c.beginPath(); c.ellipse(gx + bw * 0.25, gy + 4, bw * 0.55, 12, 0, 0, TAU); c.fill(); wood(gx - bw * 0.15, gy - 12, bw * 0.85, 18); }
    if (m >= 2) wood(gx - 9, top, 18, gy - top - 8);
    if (m >= 3) { wood(gx - 9, top - 4, bw + 14, 18); c.save(); c.translate(gx + 4, top + 50); c.rotate(-Math.PI / 4); wood(-8, -40, 14, 72); c.restore(); }
    const rx = gx + bw - 6, sw = happy ? 0 : Math.sin(t * 2) * 3;
    if (m >= 4 && !happy) { c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(rx, top + 12); c.quadraticCurveTo(rx + sw, top + 40, rx + sw, top + ah * 0.2); c.stroke(); c.strokeStyle = '#d9b77a'; c.lineWidth = 3; c.stroke(); }
    c.restore();
    const col = sample || '#4fa3e0';
    if (happy) { const jump = Math.abs(Math.sin(t * 6)) * s * 0.9; figure(ax + aw * 0.72, gy - s * 2.1 - jump, s, 4, 'happy', t, col); }
    else if (m >= 5) figure(rx + sw, top + ah * 0.2 + s * 0.55, s, m - 4, m >= MAXM ? 'lost' : m >= 7 ? 'worry' : 'calm', t, col);
    /* marcador de fallos */
    for (let i = 0; i < MAXM; i++) { const x = ax + 16 + i * 17, y = ay + ah - 16; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fillStyle = i < m ? '#ff6b6b' : 'rgba(255,255,255,.7)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); }
  }
  function draw() {
    const t = performance.now() / 1000;
    c.drawImage(backdrop('#294070', '#141d38', 22), 0, 0);
    const ready = !words || wi < 0;
    /* cabecera: palabra n/5 y categoría */
    const [tx, ty, tw, th] = L.top;
    panel(tx, ty, tw, th, 14, '#3a3478', { drop: 3 });
    if (ready) outlined(CFG.title, tx + tw / 2, ty + th / 2, 24, '#ffd166', 'center', 5);
    else { outlined(`Palabra ${wi + 1}/${NW}`, tx + 14, ty + th / 2, 18, '#fff', 'left', 4); const cat = W0().cat; outlined(cat, tx + tw - 14, ty + th / 2, fitSize(cat, tw * 0.55, 22, 14, 900), '#ffd166', 'right', 5); }
    /* jugadores */
    const [cx0, cy0, cw, ch] = L.chips, list = seats || [], n = Math.max(1, list.length), gw = (cw - (n - 1) * 8) / n;
    list.forEach((s, i) => {
      const x = cx0 + i * (gw + 8), on = !ready && phase === 'turn' && turn === i, col = k.pcol(s.p);
      panel(x, cy0 + (on ? -3 : 0), gw, ch, 12, on ? ART.dark(col, 0.2) : '#2a2f5a', { stroke: on ? '#fff' : OUT, lw: on ? 3.5 : 3 });
      c.beginPath(); c.arc(x + 17, cy0 + (gw >= 150 ? ch / 2 : 15) + (on ? -3 : 0), 8, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
      const oy = on ? -3 : 0;
      if (gw >= 150) { outlined(s.name, x + 32, cy0 + ch / 2 + oy, fitSize(s.name, gw - 80, 18, 12, 900), '#fff', 'left', 4); outlined(String(s.score), x + gw - 10, cy0 + ch / 2 + oy, 20, '#ffd166', 'right', 4); }
      else { outlined(s.name, x + 30, cy0 + 15 + oy, fitSize(s.name, gw - 36, 17, 11, 900), '#fff', 'left', 4); outlined(String(s.score), x + gw / 2 + 10, cy0 + 35 + oy, 19, '#ffd166', 'center', 4); }
      if (on && s.cpu) { const d = Math.floor(t * 3) % 3; for (let j = 0; j < 3; j++) { c.fillStyle = j === d ? '#fff' : 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(x + gw / 2 - 8 + j * 8, cy0 + ch + 6, 3, 0, TAU); c.fill(); } }
    });
    /* ilustración */
    if (ready) drawArt(t, 6, 'calm', '#3fb6ea');
    else drawArt(t, miss, phase === 'reveal' && solved() ? 'happy' : miss >= MAXM ? 'lost' : 'calm');
    /* casillas de la palabra */
    const [wx, wy, ww, wh] = L.word;
    const dispW = ready ? 'PALABRA' : W0().w, dispN = ready ? 'PALABRA' : W0().n, nL = dispN.length, bw = Math.min(40, (ww - (nL - 1) * 5) / nL), x0 = wx + (ww - (nL * bw + (nL - 1) * 5)) / 2;
    for (let i = 0; i < nL; i++) {
      const show = ready ? 'PAL_B_A'[i] !== '_' : guessed.has(dispN[i]) || phase === 'reveal', lost = !ready && phase === 'reveal' && !guessed.has(dispN[i]);
      const x = x0 + i * (bw + 5), y = wy + (wh - bw * 1.25) / 2;
      if (show) tile(x, y, bw, dispW[i], lost ? 0 : 3, 1, 0.62);
      else { tile(x, y, bw, '', -1); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x + 5, y + bw - 6, bw - 10, 4); }
    }
    /* alfabeto */
    const cur = !ready && phase === 'turn' ? seats[turn] : null;
    for (let i = 0; i < 27; i++) {
      const [x, y, w, h] = keyRect(i), ch = ALPHA[i], used = ready ? 'EAOSR'.includes(ch) : guessed.has(ch), good = used && (ready ? 'EA'.includes(ch) : W0().n.includes(ch));
      panel(x, y, w, h, 10, used ? (good ? '#4caf62' : '#4a4d63') : '#8d86c9', { drop: used ? 1 : 4, lw: 2.5 });
      outlined(ch, x + w / 2, y + h / 2 + 1, LAND ? 24 : 24, used ? (good ? '#eaffef' : '#9aa0b8') : '#fff', 'center', 4);
      if (used && !good) { c.strokeStyle = 'rgba(255,107,107,.85)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 8, y + 8); c.lineTo(x + w - 8, y + h - 8); c.stroke(); }
    }
    if (cur && !cur.cpu && (cursorShown || k.party)) { const [x, y, w, h] = keyRect(cur.cur), col = k.pcol(cur.p); c.save(); ART.rr(c, x - 4, y - 4, w + 8, h + 8, 13); c.strokeStyle = ART.alpha(col, 0.32); c.lineWidth = 9; c.stroke(); c.strokeStyle = col; c.lineWidth = 4; c.stroke(); c.restore(); }
    /* tiempo del turno */
    if (cur && !cur.cpu) { const lim = k.party ? 15 : 25 * k.D.time, fr = Math.max(0, 1 - turnT / lim), [x, y, w] = L.ab; c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, x, y - 12, w, 6, 3); c.fill(); c.fillStyle = fr > 0.3 ? k.pcol(cur.p) : '#ff6b6b'; ART.rr(c, x, y - 12, w * fr, 6, 3); c.fill(); }
    if (msgT > 0 && lastMsg) { c.save(); c.globalAlpha = Math.min(1, msgT * 3); const [ax, ay, aw] = L.art; c.font = FONT(18, 900); const mw = Math.min(aw - 20, c.measureText(lastMsg).width + 30); panel(ax + aw / 2 - mw / 2, ay + 12, mw, 36, 18, '#f4f0ff', { drop: 3 }); txt(lastMsg, ax + aw / 2, ay + 31, fitSize(lastMsg, mw - 16, 18, 12, 900), OUT, 'center', 900); c.restore(); }
    if (cur && wi === 0 && !cur.cpu && guessed.size < 3) { const tip = k.party ? 'Joystick: letra · A: elegir' : 'Toca una letra (o escríbela)'; txt(tip, L.art[0] + L.art[2] / 2, L.art[1] + L.art[3] - 40, 15, OUT, 'center', 800); }
  }
  k.onParty = () => { if (MODE !== 'hang') return; if (k.st !== 'play' || !seats) return reset();
    /* en partida: la CPU ocupa el sitio de quien se va (y lo devuelve si vuelve) */
    for (const s of seats) { const h = k.human(s.p); if (s.cpu !== h) continue; const q = k.party && k.party.find((x) => x.p === s.p); s.cpu = !h; s.name = h ? (q && q.name) || (k.party ? 'J' + (s.p + 1) : 'Tú') : 'CPU'; if (words && phase === 'turn' && seats[turn] === s) startTurn(); } };
  return { st: () => ({ seats, words, wi, phase, turn, miss, guessed }), reset, update, draw, onKey, intro: 'Adivina la palabra letra a letra antes de que se complete el dibujo. Acertar suma 10 por letra y repites turno; completar la palabra da 30 más. Cinco palabras por partida.' };
})();

/* ===================================================================================== */
/* ================================ SOPA DE LETRAS ===================================== */
/* ===================================================================================== */
const SP = (() => {
  const G = LAND ? { cols: 13, rows: 9, cs: 45, x0: 12, y0: 23 } : { cols: 10, rows: 11, cs: 42, x0: 15, y0: 100 };
  const NW = 8, HL = ['#ff6b6b', '#4fb3ff', '#ffc94a', '#6fd66f', '#b98cff', '#ff9f43', '#3fd6c6', '#ff7ab8'];
  const LETF = 'EEEEEAAAAAOOOOSSSSRRRNNNIIIDDLLLCCTTUUMMPPBGVYQHFZJÑX';
  const DIRS = [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, 1], [1, -1], [-1, -1]];
  let lvl = k.clamp((+ST('sopa:lvl', 0) || 0) + k.D.cpu, 0, 3);   // k.D.cpu: más o menos direcciones, sin tocar lo guardado
  let grid, words, cat, time, sinceFind, sel, kc, kSel, kShown, built = false, doneT = 0;
  function build() {
    const cats = Object.keys(CATS), dirs = DIRS.slice(0, [2, 3, 5, 8][lvl]), maxL = Math.max(G.cols, G.rows);
    words = null; let spare = null;
    for (let attempt = 0; attempt < 120; attempt++) {
      cat = k.pick(cats);
      const pool = k.shuffle(CATS[cat].filter((w) => /^[a-záéíóúüñ]+$/i.test(w)).map((w) => ({ w: w.toUpperCase(), n: norm(w) })).filter((o) => o.n.length >= 3 && o.n.length <= maxL - 1));
      if (pool.length < NW) continue;
      grid = Array.from({ length: G.rows }, () => Array(G.cols).fill(''));
      const placed = [];
      for (const o of pool) {
        if (placed.length >= NW) break;
        if (placed.some((p) => p.n.includes(o.n) || o.n.includes(p.n))) continue;
        let ok = false;
        for (let t = 0; t < 250 && !ok; t++) {
          const [dr, dc] = k.pick(dirs), r = k.ri(0, G.rows - 1), cc = k.ri(0, G.cols - 1), er = r + dr * (o.n.length - 1), ec = cc + dc * (o.n.length - 1);
          if (er < 0 || er >= G.rows || ec < 0 || ec >= G.cols) continue;
          let fit = true; for (let i = 0; i < o.n.length && fit; i++) { const g = grid[r + dr * i][cc + dc * i]; if (g && g !== o.n[i]) fit = false; }
          if (!fit) continue;
          for (let i = 0; i < o.n.length; i++) grid[r + dr * i][cc + dc * i] = o.n[i];
          placed.push({ w: o.w, n: o.n, r, c: cc, dr, dc, found: false, col: HL[placed.length % HL.length], t: 0 }); ok = true;
        }
      }
      if (placed.length < NW) continue;
      for (let r = 0; r < G.rows; r++) for (let q = 0; q < G.cols; q++) if (!grid[r][q]) grid[r][q] = LETF[Math.floor(Math.random() * LETF.length)];
      /* que ninguna palabra aparezca dos veces por azar (se comprueba en todas las direcciones) */
      if (placed.some((p) => countIn(p.n) !== 1)) { spare = { grid, placed, cat }; continue; }
      words = placed.sort((a, b) => a.n.length - b.n.length || a.n.localeCompare(b.n)); break;
    }
    if (!words && spare) { grid = spare.grid; cat = spare.cat; words = spare.placed.sort((a, b) => a.n.length - b.n.length || a.n.localeCompare(b.n)); } /* 1.23: nunca sin palabras */
    time = 0; sinceFind = 0; sel = null; kc = { r: Math.floor(G.rows / 2), c: Math.floor(G.cols / 2) }; kSel = null; built = true; doneT = 0;
  }
  function countIn(n) {
    let cnt = 0;
    for (let r = 0; r < G.rows; r++) for (let q = 0; q < G.cols; q++) for (const [dr, dc] of DIRS) {
      let i = 0; for (; i < n.length; i++) { const rr = r + dr * i, cc = q + dc * i; if (rr < 0 || rr >= G.rows || cc < 0 || cc >= G.cols || grid[rr][cc] !== n[i]) break; }
      if (i === n.length) cnt++;
    }
    return n.length > 1 && n === [...n].reverse().join('') ? cnt / 2 : cnt;
  }
  const cellAt = (x, y) => { const q = Math.floor((x - G.x0) / G.cs), r = Math.floor((y - G.y0) / G.cs); return r >= 0 && r < G.rows && q >= 0 && q < G.cols ? { r, c: q } : null; };
  const cellC = (r, q) => [G.x0 + q * G.cs + G.cs / 2, G.y0 + r * G.cs + G.cs / 2];
  function snap(a, b) {
    let dr = b.r - a.r, dc = b.c - a.c; const ar = Math.abs(dr), ac = Math.abs(dc);
    if (ac >= ar * 2) dr = 0; else if (ar >= ac * 2) dc = 0; else { const m = Math.max(ar, ac); dr = Math.sign(dr) * m; dc = Math.sign(dc) * m; }
    let n = Math.max(Math.abs(dr), Math.abs(dc)); const sr = Math.sign(dr), sc = Math.sign(dc);
    while (n > 0 && (a.r + sr * n < 0 || a.r + sr * n >= G.rows || a.c + sc * n < 0 || a.c + sc * n >= G.cols)) n--;
    return { r0: a.r, c0: a.c, r1: a.r + sr * n, c1: a.c + sc * n };
  }
  function selStr(s) { const n = Math.max(Math.abs(s.r1 - s.r0), Math.abs(s.c1 - s.c0)), sr = Math.sign(s.r1 - s.r0), sc = Math.sign(s.c1 - s.c0); let o = ''; for (let i = 0; i <= n; i++) o += grid[s.r0 + sr * i][s.c0 + sc * i]; return o; }
  function check(s) {
    const str = selStr(s), rev = [...str].reverse().join('');
    if (str.length < 2) return;
    const w = words.find((o) => !o.found && (o.n === str || o.n === rev));
    if (w) {
      w.found = true; w.t = 0; w.sel = s; sinceFind = 0; k.sfx('coin');
      const n = str.length; for (let i = 0; i < n; i++) { const [x, y] = cellC(s.r0 + Math.sign(s.r1 - s.r0) * i, s.c0 + Math.sign(s.c1 - s.c0) * i); k.burst(x, y, w.col, 4, 90); }
      const [mx, my] = cellC((s.r0 + s.r1) / 2, (s.c0 + s.c1) / 2); k.float(w.w, mx, my - 10, '#fff');
      if (words.every((o) => o.found)) win();
    } else { k.sfx('hurt'); }
  }
  function win() {
    doneT = 0.001; k.sfx('win'); k.confetti();
    const secs = Math.floor(time), score = Math.max(100, 1500 - secs * 5) + lvl * 150;
    const was = lvl; lvl = Math.min(3, lvl + 1); SAVE('sopa:lvl', lvl);
    setTimeout(() => { k.st = 'over'; k.end(CFG.id, score, '¡Sopa completada!', `Tiempo ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}${lvl > was ? ' · Siguiente: más direcciones' : ''}`); }, 1100);
  }
  function reset() { built = false; }
  function update(dt) {
    if (!CATS) return;
    if (!built) build();
    if (doneT) return;
    time += dt; sinceFind += dt;
    words.forEach((o) => { if (o.found) o.t += dt; });
    const p = k.ptr;
    if (p.hit) { const a = cellAt(p.sx != null ? p.sx : p.x, p.sy != null ? p.sy : p.y); if (a) { sel = snap(a, a); sel.a = a; k.sfx('click'); kShown = false; } }
    if (sel && sel.a) { const b = cellAt(k.clamp(p.x, G.x0, G.x0 + G.cols * G.cs - 1), k.clamp(p.y, G.y0, G.y0 + G.rows * G.cs - 1)); if (b) { const s2 = snap(sel.a, b); if (s2.r1 !== sel.r1 || s2.c1 !== sel.c1) { k.sfx('tick'); } Object.assign(sel, s2); } }
    if (sel && sel.a && (p.up || !p.down)) { check(sel); sel = null; }
    /* teclado / mando: cursor, A fija inicio y A confirma */
    const dr = (k.hit.has('down') ? 1 : 0) - (k.hit.has('up') ? 1 : 0), dc = (k.hit.has('right') ? 1 : 0) - (k.hit.has('left') ? 1 : 0);
    if (dr || dc) { kShown = true; kc.r = k.clamp(kc.r + dr, 0, G.rows - 1); kc.c = k.clamp(kc.c + dc, 0, G.cols - 1); k.sfx('click'); }
    if (k.hit.has('a')) { kShown = true; if (!kSel) { kSel = { r: kc.r, c: kc.c }; k.sfx('pop'); } else { const s = snap(kSel, kc); kSel = null; check(s); } }
    if (k.hit.has('b')) kSel = null;
  }
  function draw() {
    const t = performance.now() / 1000;
    c.drawImage(backdrop('#2b3470', '#121632', 20), 0, 0);
    if (!CATS) { outlined(CFG.title, W / 2, H / 2, 34, '#ffd166', 'center', 6); return; }
    if (!built) build();
    const gw = G.cols * G.cs, gh = G.rows * G.cs;
    /* papel */
    c.fillStyle = 'rgba(6,4,20,.45)'; ART.rr(c, G.x0 - 6, G.y0 - 6 + 6, gw + 12, gh + 12, 16); c.fill();
    ART.rr(c, G.x0 - 6, G.y0 - 6, gw + 12, gh + 12, 16); const pg = c.createLinearGradient(0, G.y0, 0, G.y0 + gh); pg.addColorStop(0, '#fffaf0'); pg.addColorStop(1, '#f1e6cf'); c.fillStyle = pg; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.strokeStyle = 'rgba(26,21,48,.07)'; c.lineWidth = 1; for (let i = 1; i < G.cols; i++) { c.beginPath(); c.moveTo(G.x0 + i * G.cs, G.y0); c.lineTo(G.x0 + i * G.cs, G.y0 + gh); c.stroke(); } for (let i = 1; i < G.rows; i++) { c.beginPath(); c.moveTo(G.x0, G.y0 + i * G.cs); c.lineTo(G.x0 + gw, G.y0 + i * G.cs); c.stroke(); }
    const capsule = (s, col, a, grow) => { const [x0, y0] = cellC(s.r0, s.c0), [x1, y1] = cellC(s.r1, s.c1), r = G.cs * 0.4 * (grow || 1); c.save(); c.globalAlpha = a; c.lineCap = 'round'; c.strokeStyle = ART.dark(col, 0.25); c.lineWidth = r * 2 + 4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 + 0.01, y1); c.stroke(); c.strokeStyle = col; c.lineWidth = r * 2; c.stroke(); c.restore(); };
    words.forEach((o) => { if (o.found) capsule(o.sel || { r0: o.r, c0: o.c, r1: o.r + o.dr * (o.n.length - 1), c1: o.c + o.dc * (o.n.length - 1) }, o.col, 0.55, 1 + Math.max(0, 0.3 - o.t)); });
    if (k.st === 'ready') words.slice(0, 2).forEach((o) => capsule({ r0: o.r, c0: o.c, r1: o.r + o.dr * (o.n.length - 1), c1: o.c + o.dc * (o.n.length - 1) }, o.col, 0.5));
    if (sel) capsule(sel, '#6e62f5', 0.45);
    if (kSel) capsule(snap(kSel, kc), '#6e62f5', 0.4);
    /* pista: primera letra de una palabra pendiente parpadea tras 25 s sin encontrar nada (1.23: antes 45 s) */
    const hint = !doneT && sinceFind > 25 / k.D.time ? words.find((o) => !o.found) : null;
    for (let r = 0; r < G.rows; r++) for (let q = 0; q < G.cols; q++) {
      const [x, y] = cellC(r, q);
      if (hint && hint.r === r && hint.c === q) { c.fillStyle = ART.alpha('#ffd166', 0.45 + 0.35 * Math.sin(t * 6)); c.beginPath(); c.arc(x, y, G.cs * 0.42, 0, TAU); c.fill(); }
      txt(grid[r][q], x, y + 1, Math.round(G.cs * 0.55), OUT, 'center', 900);
    }
    if (kShown) { const [x, y] = cellC(kc.r, kc.c); c.save(); c.lineWidth = 3.5; c.strokeStyle = '#6e62f5'; c.beginPath(); c.arc(x, y, G.cs * 0.46, 0, TAU); c.stroke(); c.restore(); }
    /* lista de palabras y reloj */
    const secs = Math.floor(time), clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const lvlTxt = ['Nivel 1: → ↓', 'Nivel 2: + diagonal', 'Nivel 3: + al revés', 'Nivel 4: todas'][lvl];
    if (LAND) {
      const x = G.x0 + gw + 16, w = W - x - 10;
      panel(x, 16, w, 60, 14, '#3a3478', { drop: 3 }); outlined(cat, x + w / 2, 38, fitSize(cat, w - 16, 22, 13, 900), '#ffd166', 'center', 5); txt(lvlTxt, x + w / 2, 62, 13, '#cfc8ff', 'center', 700);
      words.forEach((o, i) => { const y = 102 + i * 34; drawWord(o, x + 8, y, w - 16); });
      panel(x, 380, w, 50, 14, '#2a2f5a', { drop: 3 }); outlined(clock, x + w / 2, 405, 26, '#fff', 'center', 5);
    } else {
      panel(15, 14, 420, 72, 16, '#3a3478', { drop: 3 });
      outlined(cat, 30, 40, fitSize(cat, 280, 26, 14, 900), '#ffd166', 'left', 5); txt(lvlTxt, 30, 68, 14, '#cfc8ff', 'left', 700);
      outlined(clock, 420, 50, 28, '#fff', 'right', 5);
      words.forEach((o, i) => { const x = 15 + (i % 2) * 215, y = 590 + Math.floor(i / 2) * 48; drawWord(o, x, y, 205); });
      txt(`${words.filter((o) => o.found).length} de ${NW} encontradas`, W / 2, 782, 15, '#cfc8ff', 'center', 700);
    }
  }
  function drawWord(o, x, y, w) {
    panel(x, y - 15, w, 30, 10, o.found ? ART.dark(o.col, 0.1) : '#2a2f5a', { drop: 2, lw: 2.5, nogl: true });
    const s = fitSize(o.w, w - 20, 19, 12, 900); txt(o.w, x + w / 2, y + 1, s, o.found ? '#fff' : '#f0ecff', 'center', 900);
    if (o.found) { c.font = FONT(s, 900); const tw = c.measureText(o.w).width; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(x + w / 2 - tw / 2 - 4, y + 1); c.lineTo(x + w / 2 + tw / 2 + 4, y + 1); c.stroke(); }
  }
  return { st: () => ({ words, G, lvl, doneT }), reset, update, draw, onKey: () => false, intro: 'Encuentra las ocho palabras escondidas en la rejilla: arrastra el dedo desde la primera letra hasta la última. Pueden ir en horizontal, vertical, diagonal o al revés según el nivel.' };
})();

/* ===================================================================================== */
/* ============================= ABECEDARIO VELOZ (rosco) ============================== */
/* ===================================================================================== */
const AB = (() => {
  const TOT = 150 * k.D.time, TURN = 15 * k.D.time;   // k.D.time: reloj del rosco
  const L = LAND
    ? { bar: [16, 8, 768, 34], ring: [190, 240, 150, 16], def: [372, 50, 412, 116], opt: (i) => [372 + (i % 2) * 210, 176 + (i >> 1) * 74, 202, 64], pass: [372, 326, 412, 46], chip: (i) => [372 + i * 104, 382, 98, 54] }
    : { bar: [12, 10, 426, 34], ring: [225, 272, 143, 18], def: [12, 448, 426, 112], opt: (i) => [12 + (i % 2) * 219, 570 + (i >> 1) * 72, 207, 64], pass: [12, 718, 426, 44], chip: (i) => [12 + i * 108, 50, 102, 44] };
  const lvl = () => Math.min(8, +ST('cpu:' + CFG.id, 0) || 0);
  let letters, cards, stt, idx, seats, turn, phase, time, turnT, sel, msg, msgT, cpuT, flash;
  function reset() {
    if (!ROSCO) { letters = null; return; }
    letters = [...ROSCO.letras];
    cards = letters.map((ch) => {
      const arr = ROSCO.r[ch] || [{ d: 1, q: '¿?', a: [ch, ch, ch, ch] }], e = k.pick(arr), ord = k.shuffle([0, 1, 2, 3]);
      return { l: ch, q: e.q, d: e.d || 2, opts: ord.map((j) => e.a[j]), right: ord.indexOf(0) };
    });
    stt = letters.map(() => 0);
    seats = k.players(k.party ? Math.max(2, k.party.length) : 1).map((pl) => ({ p: pl.p, name: pl.name, cpu: pl.cpu, score: 0, ok: 0, fail: 0 }));
    idx = 0; turn = 0; phase = 'play'; time = TOT; turnT = 0; sel = -1; msg = ''; msgT = 0; flash = 0;
    cpuT = k.rnd(2.6, 5.2);
  }
  function say(m) { msg = m; msgT = 1.5; }
  function pending() { return stt.some((v) => v === 0); }
  function nextIdx() {
    for (let n = 1; n <= letters.length; n++) { const i = (idx + n) % letters.length; if (stt[i] === 0) { idx = i; return true; } }
    return false;
  }
  function passTurn() { turn = (turn + 1) % seats.length; turnT = 0; sel = -1; cpuT = k.rnd(2.6, 5.4); }
  function answer(i) {
    const cd = cards[idx], s = seats[turn], [cx, cy, r] = L.ring, a = (idx / letters.length) * 6.2832 - 1.5708;
    const lx = cx + Math.cos(a) * r, ly = cy + Math.sin(a) * r;
    if (i === cd.right) {
      stt[idx] = 1; s.ok++; s.score += 100; k.sfx('coin'); k.burst(lx, ly, '#4caf62', 12, 130); k.float('+100', lx, ly - 18, '#7cf7a0');
      say('¡Correcto! ' + cd.opts[cd.right]);
      if (!nextIdx()) return finish();
      turnT = 0; sel = -1; cpuT = k.rnd(2.6, 5.4);
    } else {
      stt[idx] = 2; s.fail++; k.sfx('hurt'); k.shake(3); flash = 0.4;
      say('Era: ' + cd.opts[cd.right]);
      if (!nextIdx()) return finish();
      passTurn();
    }
  }
  function pasa() { k.sfx('click'); say('¡Pasapalabra!'); if (!nextIdx()) return finish(); passTurn(); }
  function cpuPlay() {
    const cd = cards[idx], base = [0, 0.66, 0.52, 0.4][cd.d] + lvl() * 0.02;
    if (Math.random() < 0.12) return pasa();
    answer(Math.random() < Math.min(0.86, base) ? cd.right : k.pick([0, 1, 2, 3].filter((i) => i !== cd.right)));
  }
  function finish() {
    if (phase === 'end') return;
    phase = 'end';
    const rows = seats.map((s) => ({ p: s.p, score: s.score + (s === seats[0] ? 0 : 0) }));
    const me = seats[0];
    if (!k.party) { const sc = me.score + Math.round(time) * 5; k.best(CFG.id, sc); rows[0].score = sc; }
    const top = rows.slice().sort((a, b) => b.score - a.score)[0];
    if (k.human(top.p) && top.score > 0) SAVE('cpu:' + CFG.id, Math.min(8, lvl() + 1));
    const solo = !k.party && rows.length === 1;
    k.podium(rows, {
      head: solo ? (me.ok >= letters.length ? '¡Rosco completo!' : 'Rosco terminado') : undefined,
      go: `${solo ? `Aciertos: ${me.ok}/${letters.length} · Récord ${k.best(CFG.id, 0)}<br>` : ''}Toca para otro rosco`,
    });
  }
  function update(dt) {
    if (!ROSCO) return;
    if (!letters) reset();
    if (phase !== 'play') return;
    if (msgT > 0) msgT -= dt;
    if (flash > 0) flash -= dt;
    time -= dt; turnT += dt;
    if (time <= 0) { time = 0; return finish(); }
    if (!pending()) return finish();
    const s = seats[turn], q = cards[idx];
    if (s.cpu) { if (turnT >= cpuT) cpuPlay(); return; }
    const dx = (k.phit(s.p, 'right') ? 1 : 0) - (k.phit(s.p, 'left') ? 1 : 0), dy = (k.phit(s.p, 'down') ? 1 : 0) - (k.phit(s.p, 'up') ? 1 : 0);
    if (dx || dy) {
      let i = sel < 0 ? 0 : sel, cx = i % 2, cy = i >> 1;
      if (sel < 0) { cx = dx > 0 ? 1 : 0; cy = dy > 0 ? 1 : 0; } else { if (dx) cx = dx > 0 ? 1 : 0; if (dy) cy = dy > 0 ? 1 : 0; }
      sel = cy * 2 + cx; k.sfx('click');
    }
    if (k.phit(s.p, 'a')) { if (sel >= 0) answer(sel); else { sel = 0; k.sfx('click'); } return; }
    if (k.phit(s.p, 'b')) return pasa();
    if (s.p === 0 && !k.party && k.ptr.hit) {
      for (let i = 0; i < 4; i++) if (inR(L.opt(i), k.ptr.x, k.ptr.y)) return answer(i);
      if (inR(L.pass, k.ptr.x, k.ptr.y)) return pasa();
    }
    if (turnT >= TURN) { say('Se acabó el tiempo de la letra'); pasa(); }
  }
  function onKey(e) {
    if (!letters || phase !== 'play' || k.st !== 'play' || k.paused) return false;
    const s = seats[turn]; if (s.cpu || !k.human(s.p)) return false;
    const c2 = e.key.toUpperCase();
    if ('ABCD'.includes(c2) && c2.length === 1) { answer('ABCD'.indexOf(c2)); return true; }
    if ('1234'.includes(c2)) { answer(+c2 - 1); return true; }
    if (e.key === 'Enter') { pasa(); return true; }
    return false;
  }
  /* ---------- Dibujo ---------- */
  function ring(t) {
    const [cx, cy, r, lr] = L.ring, n = letters.length, s = seats[turn];
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, 6.2832); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.12)'; c.stroke();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.2832 - 1.5708, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, act = i === idx;
      const col = stt[i] === 1 ? '#4caf62' : stt[i] === 2 ? '#d9534f' : act ? k.pcol(s.p) : '#3a3478';
      if (act) { c.save(); c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6); c.beginPath(); c.arc(x, y, lr + 8, 0, 6.2832); c.fillStyle = col; c.fill(); c.restore(); }
      c.beginPath(); c.arc(x, y + 3, lr, 0, 6.2832); c.fillStyle = 'rgba(6,4,20,.4)'; c.fill();
      c.beginPath(); c.arc(x, y, lr, 0, 6.2832);
      c.fillStyle = col; c.fill(); c.save(); c.clip(); c.fillStyle = ART.lite(col, 0.22); c.fillRect(x - lr, y - lr, lr * 2, lr * 0.62); c.restore();
      c.lineWidth = act ? 3.5 : 2.5; c.strokeStyle = act ? '#fff' : OUT; c.stroke();
      txt(letters[i], x, y + 1, lr * 1.05, '#fff', 'center', 900);
    }
    const cd = cards[idx];
    outlined(cd.l, cx, cy - (LAND ? 16 : 20), LAND ? 76 : 88, '#ffd36b', 'center', 8);
    txt(k.party || seats.length > 1 ? 'Turno de ' + seats[turn].name : 'Tu turno', cx, cy + (LAND ? 34 : 40), LAND ? 16 : 18, k.pcol(seats[turn].p), 'center', 900);
    const ok = stt.filter((v) => v === 1).length, ko = stt.filter((v) => v === 2).length;
    txt(`${ok} ${ok === 1 ? 'acierto' : 'aciertos'} · ${ko} ${ko === 1 ? 'fallo' : 'fallos'}`, cx, cy + (LAND ? 58 : 68), LAND ? 14 : 16, 'rgba(255,255,255,.7)', 'center', 800);
    c.restore();
  }
  function draw() {
    c.drawImage(backdrop('#2b2458', '#120e2c', 30), 0, 0);
    if (!letters) { outlined('Cargando el rosco…', W / 2, H / 2, 26, '#fff', 'center', 6); return; }
    const [bx, by, bw, bh] = L.bar, s = seats[turn], cd = cards[idx];
    panel(bx, by, bw, bh, 12, '#3a3478', { drop: 3 });
    const fr = Math.max(0, time / TOT);
    c.save(); ART.rr(c, bx + 4, by + 4, Math.max(6, (bw - 8) * fr), bh - 8, 8); c.fillStyle = fr > 0.4 ? '#6fd66f' : fr > 0.18 ? '#ffc94a' : '#ff6b6b'; c.fill(); c.restore();
    const mm = Math.floor(time / 60), ss = Math.floor(time % 60);
    outlined(`${mm}:${String(ss).padStart(2, '0')}`, bx + bw / 2, by + bh / 2, 20, '#fff', 'center', 5);
    /* fichas de jugador */
    if (seats.length > 1) seats.forEach((q, i) => {
      const [x, y, w, h] = L.chip(i), col = k.pcol(q.p);
      panel(x, y, w, h, 10, i === turn ? ART.dark(col, 0.25) : '#241d4e', { drop: 2, lw: i === turn ? 3.5 : 2.5, stroke: i === turn ? '#fff' : OUT });
      txt(q.name, x + w / 2, y + 15, 14, col, 'center', 900);
      outlined(String(q.score), x + w / 2, y + h - 17, 20, '#fff', 'center', 4);
    });
    ring(performance.now() / 1000);
    /* definición */
    const [dx, dy, dw, dh] = L.def;
    panel(dx, dy, dw, dh, 16, '#fbf8ff');
    txt('Con la ' + cd.l, dx + 14, dy + 18, 15, '#6a6394', 'left', 900);
    const words = cd.q.split(' '); let line = '', lines = [];
    const fs = LAND ? 19 : 20; c.font = FONT(fs, 800);
    for (const w of words) { const t2 = line ? line + ' ' + w : w; if (c.measureText(t2).width > dw - 28 && line) { lines.push(line); line = w; } else line = t2; }
    if (line) lines.push(line);
    lines.slice(0, 4).forEach((ln, i) => txt(ln, dx + dw / 2, dy + 44 + i * (fs + 4), fs, OUT, 'center', 800));
    /* opciones */
    for (let i = 0; i < 4; i++) {
      const [x, y, w, h] = L.opt(i), act = sel === i && !s.cpu;
      panel(x, y, w, h, 14, act ? '#463ac4' : '#2d2a5c', { lw: act ? 4 : 3, stroke: act ? '#fff' : OUT });
      c.beginPath(); c.arc(x + 26, y + h / 2, 15, 0, 6.2832); c.fillStyle = ['#ff6b6b', '#4fb3ff', '#ffc94a', '#6fd66f'][i]; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
      txt('ABCD'[i], x + 26, y + h / 2 + 1, 16, '#fff', 'center', 900);
      txt(cd.opts[i], x + 52, y + h / 2 + 1, fitSize(cd.opts[i], w - 66, 22, 12, 800), '#fff', 'left', 800);
    }
    const [px2, py2, pw2, ph2] = L.pass;
    panel(px2, py2, pw2, ph2, 14, '#8a5a2f', { lw: 3 });
    txt('Pasapalabra' + (s.cpu ? '' : k.party ? '  (B)' : '  (Intro)'), px2 + pw2 / 2, py2 + ph2 / 2 + 1, 19, '#fff', 'center', 900);
    if (msgT > 0 && msg) { c.save(); c.globalAlpha = Math.min(1, msgT * 3); const mw = Math.min(W - 40, c.measureText(msg).width + 260); panel(W / 2 - mw / 2, LAND ? 404 : 770, mw, 32, 16, '#f4f0ff', { drop: 2 }); txt(msg, W / 2, (LAND ? 404 : 770) + 17, fitSize(msg, mw - 20, 17, 11, 900), OUT, 'center', 900); c.restore(); }
    if (flash > 0) { c.save(); c.globalAlpha = flash * 0.4; c.fillStyle = '#d9534f'; c.fillRect(0, 0, W, H); c.restore(); }
  }
  k.onParty = () => {
    if (MODE !== 'abc') return;
    if (k.st !== 'play' || !seats) return reset();
    /* Las plazas nunca se reducen en partida: quien se va lo sustituye la CPU. */
    const want = k.players(Math.max(seats.length, k.party ? Math.max(2, k.party.length) : 1));
    seats = want.map((pl, i) => { const old = seats[i] || { score: 0, ok: 0, fail: 0 }; return { p: pl.p, name: pl.name, cpu: pl.cpu, score: old.score, ok: old.ok, fail: old.fail }; });
    if (turn >= seats.length) turn = 0;
  };
  return { st: () => ({ letters, stt, idx, seats, turn, time, phase }), reset, update, draw, onKey, intro: 'Un rosco de 26 letras: una definición por letra y cuatro respuestas que empiezan igual. Tienes 150 segundos para dar la vuelta entera. Si no la sabes, pasapalabra y vuelves luego.' };
})();

/* ===================================================================================== */
/* =================================== ANAGRAMAS ======================================= */
/* ===================================================================================== */
const AN = (() => {
  const RONDAS = 2, RT = 100 * k.D.time, TURN = 22 * k.D.time,   // k.D.time: reloj de la ronda
     PTS = { 3: 100, 4: 200, 5: 400, 6: 700, 7: 1200 };
  const L = LAND
    ? { bar: [16, 8, 768, 34], wy: 72, ws: 52, ry: 158, rs: 58, btn: (i) => [88 + i * 130, 244, 120, 52], cx: 278, list: [556, 50, 228, 288], chip: (i) => [16 + i * 134, 328, 128, 56], msg: 410 }
    : { bar: [12, 10, 426, 34], wy: 82, ws: 50, ry: 166, rs: 52, btn: (i) => [15 + i * 140, 250, 132, 54], cx: 225, list: [12, 320, 426, 244], chip: (i) => [12 + i * 108, 578, 102, 58], msg: 668 };
  const lvl = () => Math.min(8, +ST('cpu:' + CFG.id, 0) || 0);
  let rack, letras, usada, cur2, found, seats, turn, ronda, time, turnT, phase, sel, msg, msgT, cpuT, cpuWord, shakeT;
  function newRound(n) {
    const pool = ANAG.racks.slice();
    rack = pool[(Math.floor(Math.random() * pool.length) + n) % pool.length];
    letras = [...rack.l]; usada = letras.map(() => false); cur2 = []; found = new Set();
    time = RT; turnT = 0; sel = 0; cpuT = k.rnd(3.5, 8); cpuWord = null;
  }
  function reset() {
    if (!ANAG) { rack = null; return; }
    seats = k.players(k.party ? Math.max(2, k.party.length) : 1).map((pl) => ({ p: pl.p, name: pl.name, cpu: pl.cpu, score: 0, ok: 0 }));
    turn = 0; ronda = 0; phase = 'play'; msg = ''; msgT = 0; shakeT = 0;
    newRound(0);
  }
  function say(m) { msg = m; msgT = 1.6; }
  function clearW() { cur2 = []; usada = letras.map(() => false); }
  function addL(i) { if (usada[i] || cur2.length >= 7) return; usada[i] = true; cur2.push(i); k.sfx('click'); }
  function delL() { const i = cur2.pop(); if (i == null) return; usada[i] = false; k.sfx('pop'); }
  function mezcla() { const ord = k.shuffle([...letras.keys()]); const nl = ord.map((i) => letras[i]); const nu = ord.map((i) => usada[i]); cur2 = cur2.map((i) => ord.indexOf(i)); letras = nl; usada = nu; k.sfx('click'); }
  function word() { return cur2.map((i) => letras[i]).join(''); }
  function passTurn() { if (seats.length > 1) turn = (turn + 1) % seats.length; turnT = 0; cpuT = k.rnd(3.5, 8.5); cpuWord = null; clearW(); sel = 0; }
  function submit() {
    const w = word(), s = seats[turn];
    if (w.length < 3) { say('Al menos tres letras'); k.sfx('hurt'); shakeT = 0.3; return; }
    if (found.has(w)) { say('Esa ya estaba'); k.sfx('hurt'); shakeT = 0.3; clearW(); return; }
    if (!rack.w.includes(w)) { say('No vale: ' + w); k.sfx('hurt'); k.shake(3); shakeT = 0.3; clearW(); return; }
    const p = PTS[w.length] || 100;
    found.add(w); s.score += p; s.ok++;
    k.sfx(w.length >= 6 ? 'win' : 'coin'); k.float('+' + p, L.cx, L.wy + 10, '#7cf7a0');
    say(w.length === 7 ? '¡Palabra completa! +' + p : '¡Bien! ' + w + ' +' + p);
    if (w.length === 7) k.confetti();
    clearW();
    if (found.size >= rack.w.length) return endRound();
    passTurn();
  }
  function cpuPlay() {
    const rem = rack.w.filter((w) => !found.has(w));
    if (!rem.length) return endRound();
    if (Math.random() < Math.max(0.08, 0.3 - lvl() * 0.025)) { say(seats[turn].name + ' no encuentra ninguna'); k.sfx('hurt'); return passTurn(); }
    const max = 3 + Math.min(4, Math.round(lvl() / 2) + (Math.random() < 0.4 ? 1 : 0));
    const pool = rem.filter((w) => w.length <= max);
    const w = k.pick(pool.length ? pool : [rem.reduce((a, b) => (b.length < a.length ? b : a))]);
    clearW();
    for (const ch of w) { const i = letras.findIndex((l, n) => l === ch && !usada[n]); if (i >= 0) { usada[i] = true; cur2.push(i); } }
    submit();
  }
  function endRound() {
    if (ronda + 1 >= RONDAS) return finish();
    ronda++; k.sfx('start'); say('Tanda ' + (ronda + 1) + ' de ' + RONDAS);
    newRound(ronda); passTurn(); turn = 0;
  }
  function finish() {
    if (phase === 'end') return;
    phase = 'end';
    const rows = seats.map((s) => ({ p: s.p, score: s.score }));
    const top = rows.slice().sort((a, b) => b.score - a.score)[0];
    if (k.human(top.p) && top.score > 0) SAVE('cpu:' + CFG.id, Math.min(8, lvl() + 1));
    const me = seats[0]; if (!k.party) k.best(CFG.id, me.score);
    const solo = !k.party && rows.length === 1;
    k.podium(rows, { head: solo ? 'Fin de las tandas' : undefined, go: `${solo ? `Palabras: ${me.ok} · Récord ${k.best(CFG.id, 0)}<br>` : ''}Toca para otra partida` });
  }
  function rackRect(i) { const n = letras.length, tot = n * L.rs + (n - 1) * 6; return [L.cx - tot / 2 + i * (L.rs + 6), L.ry, L.rs, L.rs]; }
  function wordRect(i) { const n = 7, tot = n * L.ws + (n - 1) * 5; return [L.cx - tot / 2 + i * (L.ws + 5), L.wy, L.ws, L.ws]; }
  function update(dt) {
    if (!ANAG) return;
    if (!rack) reset();
    if (phase !== 'play') return;
    if (msgT > 0) msgT -= dt;
    if (shakeT > 0) shakeT -= dt;
    time -= dt; turnT += dt;
    if (time <= 0) { time = 0; return endRound(); }
    const s = seats[turn];
    if (s.cpu) { if (turnT >= cpuT) cpuPlay(); return; }
    const dx = (k.phit(s.p, 'right') ? 1 : 0) - (k.phit(s.p, 'left') ? 1 : 0), dy = (k.phit(s.p, 'down') ? 1 : 0) - (k.phit(s.p, 'up') ? 1 : 0);
    if (dx) { sel = (sel + dx + 10) % 10; k.sfx('click'); }
    if (dy) { sel = sel < 7 ? 7 + Math.min(2, Math.floor(sel / 3)) : Math.min(6, (sel - 7) * 3); k.sfx('click'); }
    if (k.phit(s.p, 'a')) { if (sel < 7) addL(sel); else if (sel === 7) submit(); else if (sel === 8) delL(); else mezcla(); }
    if (k.phit(s.p, 'b')) delL();
    if (s.p === 0 && !k.party && k.ptr.hit) {
      for (let i = 0; i < letras.length; i++) if (inR(rackRect(i), k.ptr.x, k.ptr.y)) { addL(i); break; }
      for (let i = 0; i < 3; i++) if (inR(L.btn(i), k.ptr.x, k.ptr.y)) { i === 0 ? submit() : i === 1 ? delL() : mezcla(); break; }
      for (let i = 0; i < cur2.length; i++) if (inR(wordRect(i), k.ptr.x, k.ptr.y)) { delL(); break; }
    }
    if (turnT >= TURN) { say(seats.length > 1 ? 'Se acabó tu turno' : 'Sigue probando'); k.sfx('hurt'); passTurn(); }
  }
  function onKey(e) {
    if (!rack || phase !== 'play' || k.st !== 'play' || k.paused) return false;
    const s = seats[turn]; if (s.cpu || !k.human(s.p)) return false;
    if (e.key === 'Enter') { submit(); return true; }
    if (e.key === 'Backspace') { delL(); return true; }
    if (e.key === ' ') { mezcla(); return true; }
    const ch = norm(e.key); if (ch.length !== 1 || !ALPHA.includes(ch)) return false;
    const i = letras.findIndex((l, n) => l === ch && !usada[n]);
    if (i >= 0) addL(i); else { k.sfx('hurt'); shakeT = 0.25; }
    return true;
  }
  function draw() {
    c.drawImage(backdrop('#231f4e', '#100e28', 26), 0, 0);
    if (!rack) { outlined('Cargando letras…', W / 2, H / 2, 26, '#fff', 'center', 6); return; }
    const [bx, by, bw, bh] = L.bar, s = seats[turn];
    panel(bx, by, bw, bh, 12, '#3a3478', { drop: 3 });
    const fr = Math.max(0, time / RT);
    c.save(); ART.rr(c, bx + 4, by + 4, Math.max(6, (bw - 8) * fr), bh - 8, 8); c.fillStyle = fr > 0.4 ? '#6fd66f' : fr > 0.18 ? '#ffc94a' : '#ff6b6b'; c.fill(); c.restore();
    outlined(`Tanda ${ronda + 1}/${RONDAS} · ${Math.ceil(time)} s · ${found.size}/${rack.w.length}`, bx + bw / 2, by + bh / 2, LAND ? 19 : 17, '#fff', 'center', 5);
    /* palabra en construcción */
    const sh = shakeT > 0 ? Math.sin(shakeT * 60) * 6 : 0;
    for (let i = 0; i < 7; i++) {
      const [x, y, w] = wordRect(i);
      if (i < cur2.length) tile(x + sh, y, w, letras[cur2[i]], 3);
      else tile(x, y, w, '', -1);
    }
    /* letras disponibles */
    letras.forEach((ch, i) => {
      const [x, y, w] = rackRect(i), act = sel === i && !s.cpu;
      if (usada[i]) { tile(x, y, w, ch, -1); return; }
      c.save();
      tile(x, y, w, ch, 3);
      c.restore();
      if (act) { c.lineWidth = 3.5; c.strokeStyle = k.pcol(s.p); ART.rr(c, x - 3, y - 3, w + 6, w + 6, w * 0.2); c.stroke(); }
    });
    /* botones */
    ['Enviar', 'Borrar', 'Mezclar'].forEach((t2, i) => {
      const [x, y, w, h] = L.btn(i), act = sel === 7 + i && !s.cpu;
      panel(x, y, w, h, 14, ['#3fa55a', '#8a3f3f', '#463ac4'][i], { lw: act ? 4 : 3, stroke: act ? '#fff' : OUT });
      txt(t2, x + w / 2, y + h / 2 + 1, LAND ? 20 : 20, '#fff', 'center', 900);
    });
    /* palabras encontradas */
    const [lx, ly, lw, lh] = L.list;
    panel(lx, ly, lw, lh, 14, '#1d1942', { lw: 2.5 });
    txt(`Encontradas ${found.size}/${rack.w.length}`, lx + lw / 2, ly + 16, 15, '#a097ff', 'center', 900);
    const cols = LAND ? 2 : 4, cw = (lw - 16) / cols, rows = Math.floor((lh - 30) / 22);
    [...found].slice(-cols * rows).forEach((w, i) => {
      const cx2 = lx + 8 + (i % cols) * cw, cy2 = ly + 32 + Math.floor(i / cols) * 22;
      panel(cx2, cy2, cw - 6, 19, 6, w.length >= 6 ? '#8a6a2f' : '#2d2a5c', { drop: 1, lw: 2, nogl: true });
      txt(w, cx2 + (cw - 6) / 2, cy2 + 10, fitSize(w, cw - 14, 14, 9, 900), '#fff', 'center', 900);
    });
    /* jugadores */
    if (seats.length > 1) seats.forEach((q, i) => {
      const [x, y, w, h] = L.chip(i), col = k.pcol(q.p);
      panel(x, y, w, h, 10, i === turn ? ART.dark(col, 0.25) : '#241d4e', { drop: 2, lw: i === turn ? 3.5 : 2.5, stroke: i === turn ? '#fff' : OUT });
      txt(q.name, x + w / 2, y + 16, 14, col, 'center', 900);
      outlined(String(q.score), x + w / 2, y + h - 18, 20, '#fff', 'center', 4);
    });
    const who = seats.length > 1 ? (s.cpu ? s.name + ' está pensando…' : 'Turno de ' + s.name) : 'Forma todas las palabras que puedas';
    txt(who, W / 2, L.msg - 26, LAND ? 15 : 16, 'rgba(255,255,255,.75)', 'center', 800);
    if (msgT > 0 && msg) {
      c.save(); c.globalAlpha = Math.min(1, msgT * 3);
      c.font = FONT(18, 900); const mw = Math.min(W - 40, c.measureText(msg).width + 44);
      panel(W / 2 - mw / 2, L.msg, mw, 34, 16, '#f4f0ff', { drop: 2 });
      txt(msg, W / 2, L.msg + 18, fitSize(msg, mw - 20, 18, 11, 900), OUT, 'center', 900);
      c.restore();
    }
  }
  k.onParty = () => {
    if (MODE !== 'ana') return;
    if (k.st !== 'play' || !seats) return reset();
    /* Las plazas nunca se reducen en partida: quien se va lo sustituye la CPU. */
    const want = k.players(Math.max(seats.length, k.party ? Math.max(2, k.party.length) : 1));
    seats = want.map((pl, i) => { const old = seats[i] || { score: 0, ok: 0 }; return { p: pl.p, name: pl.name, cpu: pl.cpu, score: old.score, ok: old.ok }; });
    if (turn >= seats.length) { turn = 0; passTurn(); }
  };
  return { st: () => ({ rack, letras, cur2, found, seats, turn, time, ronda, phase }), reset, update, draw, onKey, intro: 'Siete letras y muchas palabras escondidas. Forma todas las que puedas de tres letras o más; la que usa las siete vale muchísimo. Dos tandas de cien segundos.' };
})();
/* ---------- Arranque ---------- */
const M = MODE === 'hang' ? HG : MODE === 'sopa' ? SP : MODE === 'abc' ? AB : MODE === 'ana' ? AN : D; window.__m = M;
/* Teclado físico: las letras (incluida P, que el kit usa para pausar) se capturan antes que el kit mientras se juega. */
addEventListener('keydown', (e) => { if (M.onKey(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
M.reset();
k.show(CFG.title, M.intro);
k.run((dt) => { if (!k.gate(M.reset)) return; M.update(dt); }, () => M.draw());
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerWidth >= innerHeight * 0.98) !== LAND && (k.st !== 'play' || MODE === 'daily')) location.reload(); }, 400); });
