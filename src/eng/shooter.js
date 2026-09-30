/* Naves. CFG.mode: 'invaders' | 'vertical' | 'centipede' | 'bullethell' | 'coop' (invasores a dúo con escudo compartido). Arte propio vectorial. */
const M = CFG.mode, land = M === 'invaders' || M === 'coop';
const W = land ? 480 : 360, H = land ? 400 : 640;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#070814' }), c = k.ctx, OUT = '#0d0b1c';
let p, shots, foes, eb, score, lives, wave, cool, inv, dirX, t, pt, calm, mush, bunkers, ufo, pups, power, shield, stars, banner, bannerT;
/* ---------- Oleadas a mano (shoolv.js, plan Friv) --------------------------------------
   Si el juego tiene oleadas diseñadas, el azar no pinta nada: se juega lo escrito, con
   progreso por dificultad (kit.js) y jefe final. Los demás modos no se enteran. */
const HAND = M === 'invaders' && typeof SHOOLV !== 'undefined' ? (SHOOLV[CFG.id] || null) : null;
let fox = 0, foy = 0, divT = 0, N0 = 45, LV = { sp: 1, fr: 1, dr: 10, dv: 0, uf: 1 };
/* Oleadas escritas a mano del modo vertical (starfall-defender), tabla en src/eng/shoolv.js. */
const WV = (typeof SHOOLV !== 'undefined' && SHOOLV[CFG.id]) || null, HANDV = M === 'vertical' && !!WV;
let wt, qi, pui, ci, wdone, endT, banner2;
/* ---------- Tanda 7 del plan Friv: pixel-invaders y starfall-defender a la vara ------------
   Todo lo que viene de aquí abajo está acotado por CFG.id: bug-garden, bullet-rain e
   invasores a dúo no se enteran de nada. docs/VARA.md y docs/GANCHO.md. */
const PI = !!HAND && CFG.id === 'pixel-invaders';
const SD = HANDV && CFG.id === 'starfall-defender';
let LVL = null, lvT = 0, tgt = 0, lvName = '', lvTip = '';
let piPh = 0, piNP = 1, piCur = 0, piSlide = 0, piTot = 0, piKill = 0;
let piUf = [], ufI = 0, piUfoN = 0, piUfoGot = 0, piHurt = 0, piCP = null, piUsedCP = 0;
let mtT = 0, ryT = 0, piSeq = 0, rocks = [], beams = [], shd = [];
let cbo = 0, cboT = 0, mult = 1;
let capN = 0, capGot = 0, sdLost = 0, sdCP = 0, sdUsedCP = 0, objPt = 0, escN = 0;
/* ---------------------------------------------------------------- arte */
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
function glow(col, blur) { c.shadowColor = col; c.shadowBlur = blur; }
const GSP = {};
function gspr(id) {
  if (GSP[id]) return GSP[id];
  const [w, h, glw, col] = { s: [3, 12, '#5ce1e6', '#bff6ff'], z: [3, 12, '#ff5c7a', '#ffe066'], r: [7, 7, '#ff5c7a', '#ff8fa3'], R: [9, 9, '#ff5c7a', '#ff8fa3'] }[id], P = 9, cw = w + P * 2, ch = h + P * 2;
  const cv = document.createElement('canvas'); cv.width = cw * 2; cv.height = ch * 2; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(cw / 2, ch / 2);
  g.shadowColor = glw; g.shadowBlur = 8; g.fillStyle = col;
  if (id === 'r' || id === 'R') { g.beginPath(); g.arc(0, 0, w / 2, 0, 6.283); g.fill(); } else g.fillRect(-w / 2, -h / 2, w, h);
  return (GSP[id] = { cv, w: cw, h: ch, o: -cw / 2, q: -ch / 2 });
}
/* Casco y alas son UN solo trazado continuo (tangente seguida en el encuentro ala-fuselaje);
   el color de las alas y la carlinga van recortados dentro de esa silueta, sin contorno propio. */
const HULL = (g) => {
  g.moveTo(0, -18);
  g.bezierCurveTo(3.4, -14.6, 6, -9.2, 7.2, -4.2);      // morro → hombro
  g.bezierCurveTo(9.4, -0.4, 13.2, 4, 16, 8);           // hombro → punta de ala
  g.lineTo(16, 13);
  g.bezierCurveTo(11.4, 11.6, 8, 10.4, 5.4, 10);        // borde de fuga del ala → cola
  g.quadraticCurveTo(0, 9.2, -5.4, 10);
  g.bezierCurveTo(-8, 10.4, -11.4, 11.6, -16, 13);
  g.lineTo(-16, 8);
  g.bezierCurveTo(-13.2, 4, -9.4, -0.4, -7.2, -4.2);
  g.bezierCurveTo(-6, -9.2, -3.4, -14.6, 0, -18);
  g.closePath();
};
function ship(x, y, s, tilt, wing) {
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(tilt * 0.25);
  const fl = 6 + Math.random() * 6; glow('#ff9a3c', 12); c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(-5, 12); c.lineTo(0, 12 + fl); c.lineTo(5, 12); c.fill(); c.shadowBlur = 0;
  const gr = c.createLinearGradient(-8, -18, 10, 13); gr.addColorStop(0, '#f6f9ff'); gr.addColorStop(0.55, '#dfe6f5'); gr.addColorStop(1, '#a8b2cb');
  unite(c, [[HULL, gr]], 1.1);
  clipIn(c, HULL, (g) => {
    const wc = wing || '#6e62f5';
    g.fillStyle = wc; g.beginPath(); g.moveTo(-18, 6.4); g.lineTo(-6.4, 1.2); g.lineTo(-6.4, 11); g.lineTo(-18, 15); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(18, 6.4); g.lineTo(6.4, 1.2); g.lineTo(6.4, 11); g.lineTo(18, 15); g.closePath(); g.fill();
    g.fillStyle = AL(OUT, 0.26); g.fillRect(-7.4, -6, 1.5, 20); g.fillRect(5.9, -6, 1.5, 20);   // juntura por sombra propia, no por línea
    g.fillStyle = AL('#ffffff', 0.4); g.fillRect(-6.1, -6, 0.9, 20); g.fillRect(7.2, -6, 0.9, 20);
    g.fillStyle = '#5ce1e6'; g.beginPath(); g.ellipse(0, -4, 3.5, 7, 0, 0, 6.283); g.fill();
    g.fillStyle = AL(OUT, 0.3); g.beginPath(); g.ellipse(0, -1.2, 3.5, 3.4, 0, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,.72)'; g.beginPath(); g.ellipse(-1.2, -6.4, 1.1, 2.2, 0.2, 0, 6.283); g.fill();
    g.fillStyle = AL('#ffffff', 0.3); g.beginPath(); g.moveTo(0, -18); g.lineTo(-3.4, -5); g.lineTo(-1.2, -5); g.closePath(); g.fill();
  });
  c.restore();
}
const EC = ['#f0647e', '#9b8afb', '#3cc7d0', '#e9b949'];
/* patas y antenas salen del cuerpo como engrosamiento del mismo trazado: se trazan primero y se
   rellenan después, así el borde interior desaparece y el bicho es una sola silueta. */
const limb = (g, x0, y0, x1, y1, x2, y2, w) => { g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x2 + w, y2); g.lineTo(x1 + w * 0.7, y1); g.lineTo(x0 + w, y0); g.closePath(); };
/* Sprite cacheado por (tipo, fotograma, destello): dibujar la silueta con recorte en cada
   bicho y cada frame costaba ~4 ms con 40 invasores en pantalla. */
const ASP = {};
function alienSpr(kind, fr, flash) {
  /* se cachea a la escala real del lienzo: así el blit es 1:1 y no hay remuestreo por bicho */
  const tr = c.getTransform ? c.getTransform().a : 2, S = Math.min(3, Math.max(1, tr));
  const key = kind + '|' + (fr ? 1 : 0) + '|' + (flash ? 1 : 0) + '|' + Math.round(S * 4);
  if (ASP[key]) return ASP[key];
  /* caja ajustada a la silueta real (patas, antenas y contorno): menos píxeles que blitear */
  const AX = 19, AT = 16, AB = 15, cv = document.createElement('canvas');
  cv.width = Math.ceil(AX * 2 * S); cv.height = Math.ceil((AT + AB) * S);
  const g = cv.getContext('2d'); g.scale(S, S); g.translate(AX, AT);
  const col = flash ? '#fff' : EC[kind % 4], kk = kind % 3;
  const body = kk === 0 ? (q) => q.ellipse(0, 0, 12, 8, 0, 0, 6.283)
    : kk === 1 ? (q) => { q.moveTo(-12, 4); q.quadraticCurveTo(-11.4, -5.4, -8, -8); q.lineTo(8, -8); q.quadraticCurveTo(11.4, -5.4, 12, 4); q.quadraticCurveTo(9.6, 7.2, 6, 8); q.lineTo(-6, 8); q.quadraticCurveTo(-9.6, 7.2, -12, 4); q.closePath(); }
    : (q) => { q.arc(0, 0, 10, Math.PI, 0); q.lineTo(10, 6); for (let i = 0; i < 4; i++) q.lineTo(10 - (i + 0.5) * 5, fr ? 10 : 7); q.lineTo(-10, 6); q.closePath(); };
  const parts = [];
  if (kk === 0) for (const sd of [-1, 1]) parts.push([(q) => limb(q, sd * 5.4, 3.4, sd * 8, 8, sd * (10 + fr * 3), 12, sd * 2.4), col]);
  if (kk === 1) for (const sd of [-1, 1]) parts.push([(q) => limb(q, sd * 3.6, -6.6, sd * 5.6, -10, sd * (7 + fr * 2), -13.4, sd * 2.1), col]);
  parts.push([body, col]);
  unite(g, parts, 1.05);
  clipIn(g, body, (q) => {
    const gr = q.createLinearGradient(-8, -9, 6, 9); gr.addColorStop(0, AL('#ffffff', 0.26)); gr.addColorStop(0.55, AL('#ffffff', 0)); gr.addColorStop(1, AL(OUT, 0.3));
    q.fillStyle = gr; q.fillRect(-14, -14, 28, 28);
  });
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-4, -1, 3, 0, 6.283); g.arc(4, -1, 3, 0, 6.283); g.fill();
  g.fillStyle = OUT; g.beginPath(); g.arc(-4, 0, 1.4, 0, 6.283); g.arc(4, 0, 1.4, 0, 6.283); g.fill();
  return (ASP[key] = { cv, x: AX, y: AT, w: AX * 2, h: AT + AB });
}
function alien(x, y, kind, fr, flash) {
  const s = alienSpr(kind, fr, flash);
  c.drawImage(s.cv, x - s.x, y - s.y, s.w, s.h);
}
/* ---- Bichos nuevos de pixel-invaders (tanda 7) -------------------------------------------
   Escudero, artillero, enjambrador y minador. Ley de la pieza única (REMASTER §8): se trazan
   todas las partes y se rellenan después, así dentro de la silueta no queda ningún contorno;
   el volumen va en TRES tonos de borde duro recortados dentro (cel shading, sin degradados).
   Sprite cacheado por (tipo, fotograma, destello, escala real del lienzo). */
const PSP = {};
function piSpr(ty, fr, flash) {
  const tr = c.getTransform ? c.getTransform().a : 2, S = Math.min(3, Math.max(1, tr));
  const key = ty + (fr ? 1 : 0) + (flash ? 1 : 0) + '|' + Math.round(S * 4);
  if (PSP[key]) return PSP[key];
  const AX = 20, AT = 18, AB = 16, cv = document.createElement('canvas');
  cv.width = Math.ceil(AX * 2 * S); cv.height = Math.ceil((AT + AB) * S);
  const g = cv.getContext('2d'); g.scale(S, S); g.translate(AX, AT);
  const col = flash ? '#ffffff' : ({ e: '#3cc7d0', g: '#e9b949', h: '#9b8afb', m: '#5b8cff' })[ty];
  const hi = flash ? '#ffffff' : LT(col, 0.32), lo = flash ? '#e6e6f0' : DK(col, 0.28), dk = flash ? '#d8d8e6' : DK(col, 0.5);
  let body, parts, eye = 0;
  if (ty === 'e') {                                           /* escudero: cúpula con plato emisor */
    body = (q) => { q.moveTo(-14, 3); q.bezierCurveTo(-14, -8, -7, -12.5, 0, -12.5); q.bezierCurveTo(7, -12.5, 14, -8, 14, 3); q.quadraticCurveTo(9, 9.4, 0, 10); q.quadraticCurveTo(-9, 9.4, -14, 3); q.closePath(); };
    const mast = (q) => { q.moveTo(-2.4, -11); q.lineTo(-2.4, -15.4); q.lineTo(-8.2, -16.2); q.lineTo(-8.2, -13.4); q.lineTo(-1.2, -12.6); q.lineTo(8.2, -13.4); q.lineTo(8.2, -16.2); q.lineTo(2.4, -15.4); q.lineTo(2.4, -11); q.closePath(); };
    const vane = (sd) => (q) => { q.moveTo(sd * 10.4, 4); q.lineTo(sd * (13.4 + (fr ? 2.2 : 0)), 12.4); q.lineTo(sd * 8.2, 11.4); q.lineTo(sd * 6, 5); q.closePath(); };
    parts = [[vane(-1), lo], [vane(1), lo], [mast, lo], [body, col]]; eye = 1;
  } else if (ty === 'g') {                                    /* artillero: casco en cuña y cañón corto */
    body = (q) => { q.moveTo(-14.4, -2); q.quadraticCurveTo(-12, -11.4, 0, -12.4); q.quadraticCurveTo(12, -11.4, 14.4, -2); q.lineTo(9.6, 6.4); q.quadraticCurveTo(0, 8.6, -9.6, 6.4); q.closePath(); };
    const barrel = (q) => { q.moveTo(-4.6, 5); q.lineTo(4.6, 5); q.lineTo(3.4, 13.6 + (fr ? 1.6 : 0)); q.lineTo(-3.4, 13.6 + (fr ? 1.6 : 0)); q.closePath(); };
    const ear = (sd) => (q) => { q.moveTo(sd * 11, -4.4); q.lineTo(sd * 16.6, -7.4); q.lineTo(sd * 16.6, -1.2); q.lineTo(sd * 11.6, 0.6); q.closePath(); };
    parts = [[barrel, dk], [ear(-1), lo], [ear(1), lo], [body, col]]; eye = 1;
  } else if (ty === 'h') {                                    /* enjambrador: saco con dos crías dentro */
    body = (q) => { q.moveTo(-12.8, 0); q.bezierCurveTo(-13.4, -9.6, -7, -13.4, 0, -13.4); q.bezierCurveTo(7, -13.4, 13.4, -9.6, 12.8, 0); q.bezierCurveTo(12.4, 7.4, 6.6, 11, 0, 11); q.bezierCurveTo(-6.6, 11, -12.4, 7.4, -12.8, 0); q.closePath(); };
    const bud = (sd) => (q) => { q.arc(sd * 7.4, 9 + (fr ? 1.8 : 0), 4.6, 0, 6.283); };
    const ant = (q) => { q.moveTo(-1.6, -12.8); q.lineTo(-5.4, -17.2); q.lineTo(-2.6, -17.2); q.lineTo(0, -13.6); q.lineTo(2.6, -17.2); q.lineTo(5.4, -17.2); q.lineTo(1.6, -12.8); q.closePath(); };
    parts = [[bud(-1), lo], [bud(1), lo], [ant, lo], [body, col]]; eye = 1;
  } else {                                                    /* minador: panza ancha con compuerta */
    body = (q) => { q.moveTo(-15, -1.4); q.quadraticCurveTo(-11.6, -10.6, 0, -11.4); q.quadraticCurveTo(11.6, -10.6, 15, -1.4); q.quadraticCurveTo(12.4, 8.6, 0, 9.6); q.quadraticCurveTo(-12.4, 8.6, -15, -1.4); q.closePath(); };
    const hatch = (q) => { q.moveTo(-5.6, 8); q.lineTo(5.6, 8); q.lineTo(4.2, 13 + (fr ? 1.4 : 0)); q.lineTo(-4.2, 13 + (fr ? 1.4 : 0)); q.closePath(); };
    const fin = (sd) => (q) => { q.moveTo(sd * 12, -5); q.lineTo(sd * 17.4, -9.4); q.lineTo(sd * 17.4, -2.4); q.lineTo(sd * 12.6, -0.6); q.closePath(); };
    parts = [[hatch, dk], [fin(-1), lo], [fin(1), lo], [body, col]]; eye = 1;
  }
  unite(g, parts, 1.05);
  clipIn(g, body, (q) => {
    q.fillStyle = hi; q.fillRect(-16, -18, 32, ty === 'g' ? 6.6 : 7.4);            /* luz de arriba-izquierda */
    q.fillStyle = lo; q.fillRect(-16, 3.4, 32, 18);                                 /* sombra propia, borde duro */
    q.fillStyle = AL(OUT, 0.22); q.fillRect(7.2, -18, 12, 36);
  });
  if (eye) {
    const ec = ty === 'e' ? '#eafcff' : '#ffffff';
    g.fillStyle = ec; g.beginPath(); g.arc(-4.2, -2.2, 3, 0, 6.283); g.arc(4.2, -2.2, 3, 0, 6.283); g.fill();
    g.fillStyle = OUT; g.beginPath(); g.arc(-4.2, -1.2, 1.5, 0, 6.283); g.arc(4.2, -1.2, 1.5, 0, 6.283); g.fill();
    g.fillStyle = AL('#ffffff', 0.8); g.beginPath(); g.arc(-5.2, -3.4, 0.9, 0, 6.283); g.arc(3.2, -3.4, 0.9, 0, 6.283); g.fill();
  }
  return (PSP[key] = { cv, x: AX, y: AT, w: AX * 2, h: AT + AB });
}
function piArt(ty, x, y, fr, flash) { const s = piSpr(ty, fr, flash); c.drawImage(s.cv, x - s.x, y - s.y, s.w, s.h); }
/* Meteoro: un solo polígono irregular determinista (mismo canto siempre) con tres tonos. */
const RKS = {};
function rockSpr(hp) {
  const tr = c.getTransform ? c.getTransform().a : 2, S = Math.min(3, Math.max(1, tr)), key = hp + '|' + Math.round(S * 4);
  if (RKS[key]) return RKS[key];
  const R = 17, cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(R * 2.3 * S);
  const g = cv.getContext('2d'); g.scale(S, S); g.translate(R * 1.15, R * 1.15);
  const K = [1, 0.84, 0.95, 0.78, 1, 0.86, 0.9, 0.8, 0.97, 0.82];
  const body = (q) => { for (let i = 0; i < 10; i++) { const a = i * 0.6283, rr = R * K[i] * (hp > 1 ? 1 : 0.8); if (i) q.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else q.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } q.closePath(); };
  const base = hp > 1 ? '#8a7f9c' : '#6b6178';
  unite(g, [[body, base]], 1.2);
  clipIn(g, body, (q) => {
    q.fillStyle = LT(base, 0.3); q.fillRect(-R, -R, R * 2, R * 0.66);
    q.fillStyle = DK(base, 0.3); q.fillRect(-R, R * 0.26, R * 2, R * 1.2);
    q.fillStyle = AL(OUT, 0.34); q.beginPath(); q.arc(R * 0.3, R * 0.16, R * 0.3, 0, 6.283); q.arc(-R * 0.42, R * 0.34, R * 0.2, 0, 6.283); q.fill();
    if (hp < 2) { q.strokeStyle = AL(OUT, 0.5); q.lineWidth = 1.6; q.beginPath(); q.moveTo(-R * 0.7, -R * 0.4); q.lineTo(0, R * 0.1); q.lineTo(R * 0.6, -R * 0.5); q.stroke(); }
  });
  return (RKS[key] = { cv, r: R * 1.15, w: R * 2.3 });
}
function drone(x, y, r, big, flash) {
  c.save(); c.translate(x, y); c.rotate(t * (big ? 0.6 : 1.8)); c.strokeStyle = OUT; c.lineWidth = 2;
  const hex = (g) => { for (let i = 0; i < 6; i++) { const a = i * 1.047; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); };
  const base = flash ? '#fff' : big ? '#b35a6b' : '#5a5f7a';
  const gr2 = c.createLinearGradient(-r, -r, r * 0.6, r); gr2.addColorStop(0, LT(base, 0.3)); gr2.addColorStop(0.6, base); gr2.addColorStop(1, DK(base, 0.3));
  unite(c, [[hex, gr2]], 1.1);
  clipIn(c, hex, (g) => { g.fillStyle = AL(OUT, 0.24); g.beginPath(); g.arc(0, 0, r * 0.62, 0, 6.283); g.fill(); });
  c.rotate(-t * (big ? 0.6 : 1.8)); glow('#f0647e', 10); c.fillStyle = '#f0647e'; c.beginPath(); c.arc(0, 0, r * 0.35, 0, 6.283); c.fill(); c.shadowBlur = 0; c.restore();
}
/* Minador y cañonera (oleadas a mano): UNA sola silueta continua — lomo, aletas y panza salen del
   mismo trazado, se rellena una vez y se contornea una vez; el detalle va recortado dentro.
   Sprite cacheado por tamaño, destello y escala real del lienzo. */
const MNS = {};
function minerSpr(big, flash) {
  const tr = c.getTransform ? c.getTransform().a : 2, S = Math.min(3, Math.max(1, tr));
  const key = (big ? 1 : 0) + '|' + (flash ? 1 : 0) + '|' + Math.round(S * 4);
  if (MNS[key]) return MNS[key];
  const R = big ? 30 : 21, HT = big ? 21 : 15, HB = big ? 24 : 18, P = 3;
  const cw = (R + P) * 2, ch = HT + HB, cv = document.createElement('canvas');
  cv.width = Math.ceil(cw * S); cv.height = Math.ceil(ch * S);
  const g = cv.getContext('2d'); g.scale(S, S); g.translate(R + P, HT);
  const base = flash ? '#ffffff' : big ? '#8f5ad6' : '#4e7fb8';
  const hull = (q) => {
    q.moveTo(-R, -1);
    q.quadraticCurveTo(-R * 0.76, -HT + 2, 0, -HT + 2.5);
    q.quadraticCurveTo(R * 0.76, -HT + 2, R, -1);
    q.lineTo(R * 0.64, 6);
    q.quadraticCurveTo(R * 0.42, HB - 4, 0, HB - 4);
    q.quadraticCurveTo(-R * 0.42, HB - 4, -R * 0.64, 6);
    q.closePath();
  };
  const gr = g.createLinearGradient(-R, -HT, R * 0.4, HB); gr.addColorStop(0, LT(base, 0.34)); gr.addColorStop(0.55, base); gr.addColorStop(1, DK(base, 0.34));
  unite(g, [[hull, gr]], 1.25);
  clipIn(g, hull, (q) => {
    q.fillStyle = AL(OUT, 0.34); q.fillRect(-R * 0.52, HB - 12, R * 1.04, 8);            /* compuerta de minas */
    q.fillStyle = AL('#ffffff', 0.2); q.fillRect(-R, -HT + 3, R * 2, 2.6);
    q.fillStyle = AL(OUT, 0.26); q.beginPath(); q.ellipse(R * 0.58, HB * 0.2, R * 0.55, HB * 0.6, 0, 0, 6.283); q.fill();
    q.fillStyle = '#ffd166'; q.beginPath(); q.ellipse(0, -HT * 0.3, R * 0.28, HT * 0.22, 0, 0, 6.283); q.fill();
    q.fillStyle = AL('#ffffff', 0.5); q.beginPath(); q.ellipse(-R * 0.08, -HT * 0.42, R * 0.12, HT * 0.09, 0, 0, 6.283); q.fill();
  });
  return (MNS[key] = { cv, x: R + P, y: HT, w: cw, h: ch });
}
function minerArt(x, y, dir, big, flash) {
  const s = minerSpr(big, flash);
  if (dir < 0) { c.save(); c.translate(x, y); c.scale(-1, 1); c.drawImage(s.cv, -s.x, -s.y, s.w, s.h); c.restore(); }
  else c.drawImage(s.cv, x - s.x, y - s.y, s.w, s.h);
}
/* Mina: el cuerpo y los pinchos son un único polígono estrellado (un relleno, un contorno). */
const MIS = {};
function mineSpr() {
  const tr = c.getTransform ? c.getTransform().a : 2, S = Math.min(3, Math.max(1, tr)), key = Math.round(S * 4);
  if (MIS[key]) return MIS[key];
  const R = 13, cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(R * 2 * S);
  const g = cv.getContext('2d'); g.scale(S, S); g.translate(R, R);
  const star = (q) => { for (let i = 0; i < 16; i++) { const a = i * 0.3927, rr = i % 2 ? 11.2 : 7.4; if (i) q.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else q.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } q.closePath(); };
  const gr = g.createLinearGradient(-8, -8, 8, 8); gr.addColorStop(0, '#e0708a'); gr.addColorStop(0.55, '#c2455f'); gr.addColorStop(1, '#7a2436');
  unite(g, [[star, gr]], 1.1);
  clipIn(g, star, (q) => { q.fillStyle = AL(OUT, 0.3); q.beginPath(); q.arc(3, 3.4, 8, 0, 6.283); q.fill(); q.fillStyle = AL('#ffffff', 0.34); q.beginPath(); q.arc(-3, -3.4, 2.6, 0, 6.283); q.fill(); });
  return (MIS[key] = { cv, r: R });
}
function mineArt(x, y) {
  const s = mineSpr(); c.drawImage(s.cv, x - s.r, y - s.r, s.r * 2, s.r * 2);
  c.fillStyle = Math.floor(t * 5) % 2 ? '#ffe066' : '#5c1b2a'; c.beginPath(); c.arc(x, y, 2.6, 0, 6.283); c.fill();
}
/* El ciempiés es UN cuerpo: los anillos se trazan con sus uniones y se rellenan de una vez; la
   separación entre anillos se lee por sombra propia recortada, nunca por contorno. */
function chain(segs) {
  if (!segs.length) return;
  const parts = [], link = [];
  for (let i = 0; i < segs.length; i++) {
    const a = segs[i], b = segs[i + 1];
    if (b && Math.abs(a.x - b.x) < 26 && Math.abs(a.y - b.y) < 26) link.push([a, b]);
  }
  for (const [a, b] of link) parts.push([(g) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d * 7.4, ny = dx / d * 7.4; g.moveTo(a.x + nx, a.y + ny); g.lineTo(b.x + nx, b.y + ny); g.lineTo(b.x - nx, b.y - ny); g.lineTo(a.x - nx, a.y - ny); g.closePath(); }, '#4cc38a']);
  for (const q of segs) parts.push([(g) => g.arc(q.x, q.y, 9, 0, 6.283), q.flash > 0 ? '#fff' : q.head ? '#e9b949' : '#4cc38a']);
  unite(c, parts, 1.1);
  for (const q of segs) clipIn(c, (g) => g.arc(q.x, q.y, 9, 0, 6.283), (g) => {
    const gr = g.createRadialGradient(q.x - 3.2, q.y - 3.6, 1, q.x, q.y, 11);
    gr.addColorStop(0, AL('#ffffff', 0.34)); gr.addColorStop(0.45, AL('#ffffff', 0)); gr.addColorStop(1, AL(OUT, 0.34));
    g.fillStyle = gr; g.fillRect(q.x - 10, q.y - 10, 20, 20);
    if (q.head) { g.fillStyle = OUT; g.beginPath(); g.arc(q.x - 3, q.y + 2, 1.8, 0, 6.283); g.arc(q.x + 3, q.y + 2, 1.8, 0, 6.283); g.fill(); }
  });
}
/* Pie y sombrero, una sola seta: se traza el conjunto y se rellena después; el pie se distingue
   por color y por la sombra que el sombrero proyecta sobre él. */
function mushroom(x, y, hp) {
  const s = 0.5 + hp / 6, R = 8 * s, cap = ['#553', '#a0527a', '#c05a8a', '#e0649a'][hp];
  const stem = (g) => { g.moveTo(x - 3, y - 1); g.quadraticCurveTo(x - 3.4, y + 4, x - 2.6, y + 7); g.lineTo(x + 2.6, y + 7); g.quadraticCurveTo(x + 3.4, y + 4, x + 3, y - 1); g.closePath(); };
  const hat = (g) => { g.moveTo(x - R, y + 1); g.quadraticCurveTo(x - R * 0.92, y + 1 - R * 1.24, x, y + 1 - R * 1.24); g.quadraticCurveTo(x + R * 0.92, y + 1 - R * 1.24, x + R, y + 1); g.quadraticCurveTo(x, y + 2.6, x - R, y + 1); g.closePath(); };
  unite(c, [[stem, '#e8dcc8'], [hat, cap]], 1.05);
  clipIn(c, stem, (g) => { g.fillStyle = AL(OUT, 0.3); g.fillRect(x - 4, y - 1, 8, 2.4); g.fillStyle = AL(OUT, 0.16); g.fillRect(x + 1, y - 1, 3, 10); });
  clipIn(c, hat, (g) => { g.fillStyle = AL('#ffffff', 0.34); g.beginPath(); g.ellipse(x - R * 0.36, y - R * 0.5, R * 0.34, R * 0.24, -0.4, 0, 6.283); g.fill(); g.fillStyle = AL(OUT, 0.22); g.beginPath(); g.ellipse(x + R * 0.5, y - R * 0.1, R * 0.5, R * 0.46, 0, 0, 6.283); g.fill(); });
}
function boss(b, flash) {
  c.save(); c.translate(b.x, b.y); const r = b.r; c.strokeStyle = OUT; c.lineWidth = 3;
  const base = flash ? '#fff' : (b.tint || '#3d3566');
  const hull = (g) => { g.moveTo(-r * 1.6, 0); g.quadraticCurveTo(-r * 1.34, -r * 0.52, -r, -r * 0.6); g.lineTo(r, -r * 0.6); g.quadraticCurveTo(r * 1.34, -r * 0.52, r * 1.6, 0); g.quadraticCurveTo(r * 1.32, r * 0.56, r, r * 0.7); g.lineTo(-r, r * 0.7); g.quadraticCurveTo(-r * 1.32, r * 0.56, -r * 1.6, 0); g.closePath(); };
  const pod = (sd) => (g) => { g.moveTo(sd * r * 1.1 - 5, r * 0.18); g.lineTo(sd * r * 1.1 + 5, r * 0.18); g.quadraticCurveTo(sd * r * 1.1 + 4, r * 0.82, sd * r * 1.1, r * 0.9); g.quadraticCurveTo(sd * r * 1.1 - 4, r * 0.82, sd * r * 1.1 - 5, r * 0.18); g.closePath(); };
  const gb = c.createLinearGradient(0, -r * 0.6, 0, r * 0.9); gb.addColorStop(0, LT(base, 0.22)); gb.addColorStop(0.55, base); gb.addColorStop(1, DK(base, 0.3));
  unite(c, [[pod(-1), '#2a2448'], [pod(1), '#2a2448'], [hull, gb]], 1.25);
  clipIn(c, hull, (g) => {
    g.fillStyle = '#5a4f99'; g.fillRect(-r * 0.9, -r * 0.2, r * 1.8, r * 0.4);
    g.fillStyle = AL(OUT, 0.3); g.fillRect(-r * 0.9, -r * 0.2, r * 1.8, 2.2);
    g.fillStyle = AL('#ffffff', 0.16); g.fillRect(-r * 1.5, -r * 0.6, r * 3, 2.4);
  });
  glow('#f0647e', 20); c.fillStyle = b.phase > 1 ? '#ff3b5c' : '#f0647e'; c.beginPath(); c.arc(0, 0, r * 0.38 + Math.sin(t * 6) * 2, 0, 6.283); c.fill(); c.shadowBlur = 0;
  c.restore();
}
/* Búnker: UNA losa por búnker. Las celdas vivas se trazan juntas y se rellenan de una vez, así solo
   sobrevive el borde exterior (y el de los boquetes). Cacheado: solo se repinta al perder una celda. */
let bkC = [], bkN = -1;
function drawBunkers() {
  if (!bunkers || !bunkers.length) return;
  const live = bunkers.filter((b) => !b.dead);
  if (!live.length) return;
  if (bkN !== live.length) {
    bkN = live.length;
    /* un lienzo por búnker (los huecos entre búnkeres no se blitean) */
    const gr = [];
    for (const b of live) {
      let g0 = null;
      for (const q of gr) if (b.x >= q.x0 - 14 && b.x <= q.x1 + 14) { g0 = q; break; }
      if (!g0) { g0 = { x0: b.x, x1: b.x, cells: [] }; gr.push(g0); }
      if (b.x < g0.x0) g0.x0 = b.x; if (b.x > g0.x1) g0.x1 = b.x;
      g0.cells.push(b);
    }
    bkC = gr.map((q) => {
      let y0 = 1e9, y1 = -1e9;
      for (const b of q.cells) { if (b.y < y0) y0 = b.y; if (b.y > y1) y1 = b.y; }
      const x = q.x0 - 4, y = y0 - 4, w = q.x1 - q.x0 + 14, h = y1 - y0 + 14;
      const cv = document.createElement('canvas'); cv.width = Math.ceil(w * 2); cv.height = Math.ceil(h * 2);
      const g = cv.getContext('2d'); g.setTransform(2, 0, 0, 2, -x * 2, -y * 2);
      const cell = (b) => (o) => o.rect(b.x - 0.5, b.y - 0.5, 6, 6);
      unite(g, q.cells.map((b) => [cell(b), '#4cc38a']), 1.05);
      g.save(); g.globalCompositeOperation = 'source-atop';
      for (const b of q.cells) { g.fillStyle = AL('#ffffff', 0.3); g.fillRect(b.x - 0.5, b.y - 0.5, 6, 1.7); g.fillStyle = AL(OUT, 0.17); g.fillRect(b.x - 0.5, b.y + 3.6, 6, 1.9); }
      g.restore();
      return { cv, x, y, w, h };
    });
  }
  for (const q of bkC) c.drawImage(q.cv, q.x, q.y, q.w, q.h);
}
/* Fondo cacheado a 2×: nebulosas, polvo estelar y planeta (espacio) o huerto nocturno (ciempiés) */
function mkCv(w, h) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'); g.scale(2, 2); return [cv, g]; }
const BG = (() => {
  const [cv, g] = mkCv(W, H), R = (a, b) => a + Math.random() * (b - a);
  if (M === 'centipede') {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d1a14'); gr.addColorStop(0.55, '#15291c'); gr.addColorStop(1, '#1d3322'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { const x = R(0, W), y = R(0, H), r = R(30, 70), rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, i % 3 ? 'rgba(60,110,60,.18)' : 'rgba(90,70,50,.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.lineCap = 'round'; for (let i = 0; i < 260; i++) { const x = R(0, W), y = R(0, H), hh = R(4, 9), sh = y / H; g.strokeStyle = `rgba(${90 + sh * 60 | 0},${150 + sh * 60 | 0},${90 | 0},${0.25 + sh * 0.3})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + R(-2, 2), y - hh * 0.6, x + R(-4, 4), y - hh); g.stroke(); }
    for (let i = 0; i < 18; i++) { const x = R(8, W - 8), y = R(8, H - 8), r = R(3, 6); g.beginPath(); g.ellipse(x, y, r * 1.3, r, R(0, 3), 0, 6.283); g.fillStyle = '#3d4a44'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke(); g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(x - r * 0.4, y - r * 0.4, r * 0.4, 0, 6.283); g.fill(); }
    for (let i = 0; i < 22; i++) { const x = R(6, W - 6), y = R(H * 0.15, H - 6), col = ['#e0649a', '#f2d15c', '#9b8afb', '#fff'][i % 4]; g.globalAlpha = 0.55; for (let j = 0; j < 5; j++) { const a = j * 1.2566; g.fillStyle = col; g.beginPath(); g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2, 0, 6.283); g.fill(); } g.fillStyle = '#f2d15c'; g.beginPath(); g.arc(x, y, 1.4, 0, 6.283); g.fill(); g.globalAlpha = 1; }
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    return { cv };
  }
  const top = M === 'bullethell' ? '#12061c' : '#070814', bot = M === 'bullethell' ? '#2a0e33' : '#161038';
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const neb = M === 'bullethell' ? ['#ff3b7a', '#9b3bff', '#ff8a3c'] : ['#6e62f5', '#f0647e', '#3cc7d0'];
  for (let i = 0; i < 14; i++) { const x = R(-40, W + 40), y = R(-40, H + 40), r = R(60, 170), rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, neb[i % 3] + '30'); rg.addColorStop(0.5, neb[i % 3] + '12'); rg.addColorStop(1, neb[i % 3] + '00'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${R(0.1, 0.45)})`; const r = R(0.4, 1.1); g.fillRect(R(0, W), R(0, H), r, r); }
  // planeta (sprite aparte, se desplaza despacio)
  const PR = land ? 150 : 46, [pc, pg] = mkCv(PR * 2 + 60, PR * 2 + 60), cx = PR + 30, cy = PR + 30;
  const pcol = M === 'bullethell' ? ['#7a3b8f', '#3d1a4f'] : land ? ['#4b6fc9', '#1d2a5c'] : ['#e08a5a', '#6b3550'];
  const pgr = pg.createRadialGradient(cx - PR * 0.4, cy - PR * 0.4, PR * 0.1, cx, cy, PR); pgr.addColorStop(0, pcol[0]); pgr.addColorStop(1, pcol[1]);
  pg.beginPath(); pg.arc(cx, cy, PR, 0, 6.283); pg.fillStyle = pgr; pg.fill(); pg.save(); pg.clip();
  pg.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 5; i++) pg.fillRect(cx - PR, cy - PR * 0.7 + i * PR * 0.32, PR * 2, PR * 0.1);
  for (let i = 0; i < 7; i++) { const a = R(0, 6.28), d = R(0, PR * 0.8), r = R(PR * 0.06, PR * 0.16); pg.beginPath(); pg.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, 0, 6.283); pg.fillStyle = 'rgba(0,0,0,.18)'; pg.fill(); }
  pg.fillStyle = 'rgba(0,0,0,.35)'; pg.beginPath(); pg.arc(cx + PR * 0.35, cy + PR * 0.35, PR, 0, 6.283); pg.fill(); pg.restore();
  pg.lineWidth = 3; pg.strokeStyle = OUT; pg.beginPath(); pg.arc(cx, cy, PR, 0, 6.283); pg.stroke();
  if (!land) { pg.save(); pg.translate(cx, cy); pg.rotate(-0.35); pg.strokeStyle = 'rgba(255,220,180,.55)'; pg.lineWidth = 4; pg.beginPath(); pg.ellipse(0, 0, PR * 1.5, PR * 0.35, 0, 0.1, Math.PI - 0.1); pg.stroke(); pg.restore(); }
  const atm = pg.createRadialGradient(cx, cy, PR, cx, cy, PR + 22); atm.addColorStop(0, pcol[0] + '55'); atm.addColorStop(1, pcol[0] + '00'); pg.fillStyle = atm; pg.beginPath(); pg.arc(cx, cy, PR + 22, 0, 6.283); pg.arc(cx, cy, PR, 0, 6.283, true); pg.fill();
  return { cv, pc, PR };
})();
function background() {
  c.drawImage(BG.cv, 0, 0, W, H);
  if (BG.pc) { const s = BG.pc.width / 2; if (land) c.drawImage(BG.pc, W * 0.72 - s / 2, H - 70 - 30, s, s); else { const y = ((t * 7 + 120) % (H + s + 40)) - s / 2 - 20; c.drawImage(BG.pc, W * 0.7 - s / 2, y - s / 2, s, s); } }
  if (M === 'centipede') { for (let i = 0; i < 9; i++) { const x = (i * 97 + Math.sin(t * 0.5 + i) * 30 + W) % W, y = (i * 71 + Math.cos(t * 0.4 + i * 2) * 26 + H) % H, a = 0.35 + 0.35 * Math.sin(t * 3 + i * 1.7); c.fillStyle = `rgba(214,255,120,${a * 0.35})`; c.beginPath(); c.arc(x, y, 6, 0, 6.283); c.fill(); c.fillStyle = `rgba(240,255,190,${a})`; c.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); } return; }
  for (const s of stars) { const a = 0.3 + s.z * 0.7; c.fillStyle = `rgba(255,255,255,${a})`; const r = s.z * 2.2; c.fillRect(s.x - r / 2, s.y - r / 2, r, r); if (s.z > 0.85) { c.globalAlpha = 0.35 + 0.3 * Math.sin(t * 4 + s.x); c.fillRect(s.x - 4, s.y - 0.5, 8, 1); c.fillRect(s.x - 0.5, s.y - 4, 1, 8); c.globalAlpha = 1; } }
}
function label(s, x, y, size, col, align, max) {
  const FT = (z) => `800 ${z}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  c.font = FT(size);
  /* si el rótulo no cabe en el ancho pedido, encoge en vez de desbordar (regla de maquetación 1.29) */
  if (max) { const wd = c.measureText(s).width; if (wd > max) { size = Math.max(9, size * max / wd); c.font = FT(size); } }
  c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
/* ---------------------------------------------------------------- lógica */
/* Dificultad 0→1: por tiempo jugado en starfall (máximo hacia los 3,5 min) y por oleada en el resto (máximo en la 9). */
const lerp = (a, b, q) => a + (b - a) * q, ease = (q) => q * q * (3 - 2 * q);
function diff() { return HANDV ? Math.min(1, (wave - 1) / 19) : M === 'vertical' ? Math.min(1, pt / 315) : HAND ? ease(Math.min(1, (wave - 1) / 19)) : ease(Math.min(1, (wave - 1) / 12)); } // 1.23: más fácil; con oleadas/niveles a mano manda la tabla
function msg(txt, sub, dur) { banner = txt; banner2 = sub || ''; bannerT = dur || 1.8; }
function spawnWave() {
  wave++; foes = []; calm = wave === 1 ? 5 : 2;
  if (M === 'invaders') { const rows = 5, cols = 9; for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) foes.push({ gx: 50 + i * 42, gy: 60 + r * 30, x: 50 + i * 42, y: 60 + r * 30, r: 12, hp: 1, pts: [30, 20, 20, 10, 10][r], kind: r < 1 ? 1 : r < 3 ? 0 : 2, fr: 0, dive: 0 }); dirX = 1; fox = 0; foy = 0; N0 = foes.length; LV = { sp: 1, fr: 1, dr: 10, dv: 0, uf: 1 }; if (wave === 1) makeBunkers(); msg(`Oleada ${wave}`); }
  if (M === 'centipede') { if (wave === 1) { mush = []; for (let i = 0; i < 34; i++) mush.push({ x: k.ri(1, 16) * 20 + 10, y: k.ri(3, 25) * 20 + 10, hp: 3 }); } for (let i = 0; i < Math.min(25, 9 + wave * 2); i++) foes.push({ x: 10 - i * 20, y: 30, r: 9, hp: 1, pts: i === 0 ? 100 : 20, dir: 1, seg: true, head: i === 0 }); msg(`Oleada ${wave}`); }
  if (M === 'bullethell' || (M === 'vertical' && wave % 3 === 0)) { const hp = M === 'bullethell' ? 112 + wave * 40 : 32 + wave * 10; foes.push({ x: W / 2, y: -60, ty: 110, r: 30, hp, max: hp, pts: 500 * wave, boss: true, a: 0, phase: 1 }); msg(M === 'bullethell' ? `Jefe ${wave}` : '¡Jefe!'); }
  else if (M === 'vertical') msg(`Oleada ${wave}`);
}
/* ============================================================ oleadas a mano (modo vertical)
   Cada oleada de SHOOLV se juega tal cual: grupos con su segundo de entrada, mejoras programadas
   y jefe propio. La oleada se supera cuando ha entrado todo y no queda ninguna nave. */
function startWave(n) {
  wave = n; wt = 0; qi = 0; pui = 0; ci = 0; wdone = 0; endT = 0;
  foes = []; eb = []; pups = []; shots = [];
  const w = WV[n - 1] || {};
  power = w.pw || 1; shield = 0; inv = 2.5 / k.D.dmg; cool = 0; score = 0;
  p = { x: W / 2, y: H - 50, tilt: 0 };
  msg(`Oleada ${n}/${WV.length}`, w.tip || '', 2.4);
  if (!SD) return;
  /* Tanda 7: objetivo de la 2ª estrella, cápsulas de rescate (tesoros) y punto de control. */
  capN = (w.cap || []).length; capGot = 0; sdLost = 0; sdUsedCP = 0;
  objPt = (w.pt && (w.pt[k.dif] != null ? w.pt[k.dif] : w.pt[1])) || 0;
  if (w.cp && sdCP === n) {
    wt = w.cp; sdUsedCP = 1;
    const gl = w.g || [], pl = w.p || [], cl = w.cap || [];
    while (qi < gl.length && gl[qi].t <= wt) qi++;
    while (pui < pl.length && pl[pui].t <= wt) pui++;
    while (ci < cl.length && cl[ci].t <= wt) { ci++; capGot++; }   /* lo ya pasado no se repite */
    score = Math.round(objPt * 0.42);
    msg(`Control · ${Math.round(wt)} s`, 'Este intento solo puntúa 1 estrella', 2.4);
  }
}
function gpos(g, i) {
  const n = g.n || 1, wd = (g.w == null ? 0.6 : g.w) * W, cx = (g.x == null ? 0.5 : g.x) * W;
  return n === 1 ? cx : k.clamp(cx - wd / 2 + wd * i / (n - 1), 20, W - 20);
}
function spawnGroup(g) {
  if (g.f === 'jefe') return spawnBoss((WV[wave - 1] || {}).boss || { hp: 60, ph: [['anillo']] });
  /* ESCOLTADO (tanda 7): nodriza pequeña intocable mientras le quede un dron en órbita. */
  if (g.f === 'esc') {
    const id = ++escN, cx = (g.x == null ? 0.5 : g.x) * W;
    const mo = { x: cx, y: -26, r: 20, hp: g.hp || 6, pts: 260, kind: g.k == null ? 1 : g.k, mv: 'esc', big: 1, moth: 1, escId: id,
      binv: 99, ty: (g.y == null ? 0.26 : g.y) * H, vy: (g.sp || 60) * k.D.spd, sw: g.sw || 40, stay: g.stay || 18,
      fire: (g.fire || 2.2) / k.D.rate, ft: 1.3, pat: g.pat || 'aim', bs: (g.bs || 130) * k.D.spd, age: 0, ph: 0, flash: 0, dly: 0 };
    foes.push(mo);
    for (let j = 0; j < 2; j++) foes.push({ x: cx, y: -26, r: 11, hp: 2, pts: 40, kind: 3, mv: 'drn', drn: 1, escId: id, host: mo,
      oa: j * Math.PI, age: 0, ph: 0, flash: 0, dly: 0.25 * j, fire: 0 });
    return;
  }
  const n = g.n || 1, sp = (g.sp || 60) * k.D.spd, gap = g.gap || 0, hp = g.hp || 1;
  const fire = g.fire ? g.fire / k.D.rate : 0, bs = (g.bs || 120) * k.D.spd;
  const big = g.f === 'torre' || g.f === 'canon' || g.f === 'mina';
  const pts = g.f === 'canon' ? 400 : g.f === 'torre' ? 250 : g.f === 'mina' ? 150 : 15 + hp * 12;
  for (let i = 0; i < n; i++) {
    const f = { x: gpos(g, i), y: -24, r: big ? (g.f === 'canon' ? 26 : 19) : 12, hp, pts, kind: g.k || 0, mv: g.f, big,
      fire, pat: g.pat || 'aim', bs, ft: fire ? fire * (0.55 + i * 0.12) : 0, dly: gap * i, age: 0, ph: k.rnd(0, 6.2), flash: 0 };
    if (g.f === 'fila') { f.vy = sp; f.sw = g.sw || 0; }
    else if (g.f === 'arco') { f.dir = g.d || 1; f.x = f.dir > 0 ? -26 : W + 26; f.vx = f.dir * sp; f.y0 = (g.y == null ? 0.22 : g.y) * H; f.y = f.y0; f.amp = g.amp || 110; f.dly = gap * i; }
    else if (g.f === 'kami') { f.y = -24; f.vy = sp; const a = Math.atan2(Math.max(p.y, H * 0.62) - f.y, p.x - f.x); f.kx = Math.cos(a); f.ky = Math.sin(a); }
    else if (g.f === 'zig') { f.vy = sp; f.vx = (g.vx || 130) * k.D.spd * (i % 2 ? -1 : 1); }
    else if (g.f === 'torre' || g.f === 'canon') { f.vy = sp; f.ty = (g.y == null ? 0.22 : g.y) * H; f.sw = g.sw || 60; f.stay = g.stay || 14;   /* cuanto más se queda, más dispara: no se escala con la dificultad */ }
    else if (g.f === 'mina') { f.dir = g.d || 1; f.x = f.dir > 0 ? -28 : W + 28; f.vx = f.dir * sp; f.y = (g.y == null ? 0.16 : g.y) * H; f.per = (g.per || 1.5) / k.D.rate; f.mt = 0.6; }
    /* --- verbos nuevos de la tanda 7 (solo los usa la tabla de starfall-defender) --- */
    else if (g.f === 'nucleo') { f.vy = sp; f.r = 15; f.hp = g.hp || 2; f.pts = 45; f.core = 1; }
    else if (g.f === 'roca') { f.vy = sp; f.r = 19; f.hp = g.hp || 4; f.pts = 90; f.tough = 1; f.big = true; }
    else if (g.f === 'caza') { f.vy = sp; f.ty = (g.y == null ? 0.3 : g.y) * H; f.r = 13; f.pts = 70; f.hp = g.hp || 2; }
    else if (g.f === 'rayo') { f.vy = sp; f.ty = (g.y == null ? 0.2 : g.y) * H; f.r = 17; f.pts = 200; f.hp = g.hp || 5; f.big = true;
      f.lt = 1.1; f.per2 = g.per || 3.2; f.stay = g.stay || 16; f.chg = 0; f.beam = 0; f.fire = 0; }
    foes.push(f);
  }
}
function ebPush(x, y, vx, vy, o) { const e = { x, y, vx, vy }; if (o) Object.assign(e, o); eb.push(e); }
function dropMine(f) { ebPush(f.x, f.y + 14, 0, 50 * k.D.spd, { mine: 1, rr: 11 }); }
function shootFoe(f) {
  const v = f.bs, a = Math.atan2(p.y - f.y, p.x - f.x);
  if (f.pat === 'down') ebPush(f.x, f.y + 12, 0, v);
  else if (f.pat === 'fan') { for (let j = -2; j <= 2; j++) ebPush(f.x, f.y + 12, Math.cos(a + j * 0.24) * v, Math.sin(a + j * 0.24) * v); }
  else if (f.pat === 'ring') { for (let j = 0; j < 8; j++) ebPush(f.x, f.y, Math.cos(j * 0.7854) * v, Math.sin(j * 0.7854) * v); }
  else ebPush(f.x, f.y + 10, Math.cos(a) * v, Math.sin(a) * v);
}
function stepFoe(f, dt) {
  if (f.dly > 0) { f.dly -= dt; return; }
  f.age += dt;
  if (f.mv === 'fila') { f.y += f.vy * dt; if (f.sw) f.x += Math.sin(t * 1.7 + f.ph) * f.sw * dt; }
  else if (f.mv === 'arco') { f.x += f.vx * dt; const pr = k.clamp((f.x + 26) / (W + 52), 0, 1); f.y = f.y0 + Math.sin(pr * Math.PI) * f.amp + f.age * 8; if (f.x < -40 || f.x > W + 40) f.dead = true; }
  else if (f.mv === 'kami') { const s = f.vy * (1 + f.age * 0.45); f.x += f.kx * s * dt; f.y += f.ky * s * dt; if (f.x < -40 || f.x > W + 40) f.dead = true; }
  else if (f.mv === 'zig') { f.x += f.vx * dt; if (f.x < 18) { f.x = 18; f.vx = Math.abs(f.vx); } if (f.x > W - 18) { f.x = W - 18; f.vx = -Math.abs(f.vx); } f.y += f.vy * dt; }
  else if (f.mv === 'torre' || f.mv === 'canon') {
    if (f.y < f.ty) f.y = Math.min(f.ty, f.y + f.vy * dt);
    else { f.x += Math.sin(t * 0.9 + f.ph) * f.sw * dt; f.stay -= dt; if (f.stay <= 0) f.y += 80 * dt; }
    f.x = k.clamp(f.x, f.r + 6, W - f.r - 6);
  } else if (f.mv === 'mina') {
    f.x += f.vx * dt; f.y += Math.sin(t * 1.2 + f.ph) * 12 * dt;
    f.mt -= dt; if (f.mt <= 0 && f.x > 16 && f.x < W - 16) { f.mt = f.per; dropMine(f); }
    if (f.x < -44 || f.x > W + 44) f.dead = true;
  }
  else if (f.mv === 'esc') {
    if (f.y < f.ty) f.y = Math.min(f.ty, f.y + f.vy * dt);
    else { f.x += Math.sin(t * 0.8) * f.sw * dt; f.stay -= dt; if (f.stay <= 0) f.y += 78 * dt; }
    f.x = k.clamp(f.x, f.r + 40, W - f.r - 40);
  } else if (f.mv === 'drn') {
    const ho = f.host;
    if (!ho || ho.dead) f.dead = true;
    else { f.oa += dt * 2.1; f.x = ho.x + Math.cos(f.oa) * 36; f.y = ho.y + Math.sin(f.oa) * 25; }
  } else if (f.mv === 'nucleo' || f.mv === 'roca') { f.y += f.vy * dt; f.x += Math.sin(t * 1.1 + f.ph) * 16 * dt; }
  else if (f.mv === 'caza') {
    if (f.y < f.ty) f.y = Math.min(f.ty, f.y + f.vy * dt);
    else { const tx = k.clamp(W - p.x, 20, W - 20); f.x += (tx - f.x) * Math.min(1, dt * 2.1); }   /* se coloca en tu reflejo */
  } else if (f.mv === 'rayo') {
    if (f.y < f.ty) f.y = Math.min(f.ty, f.y + f.vy * dt);
    else if (f.beam > 0) { f.beam -= dt; if (Math.abs(p.x - f.x) < 14 && p.y > f.y) hitPlayer(); }
    else if (f.chg > 0) { f.chg -= dt; if (f.chg <= 0) { f.beam = 0.45; k.sfx('shoot'); k.shake(4); } }
    else { f.stay -= dt; if (f.stay <= 0) f.y += 78 * dt; else { f.lt -= dt; if (f.lt <= 0) { f.lt = f.per2; f.chg = 1.25; k.sfx('click'); } } }   /* aviso de 1,25 s: nunca menos de 1,2 */
  }
  if (f.y > H + 36) f.dead = true;
  if (f.fire && f.y > 12 && f.y < H * 0.8) { f.ft -= dt; if (f.ft <= 0) { f.ft = f.fire * k.rnd(0.85, 1.15); shootFoe(f); } }
}
/* Jefe con fases: cada fase lanza sus ataques a la vez, con su propio reloj. */
function spawnBoss(b) {
  const hp = Math.round((b.hp || 60) * (0.8 + k.dif * 0.2));
  foes.push({ x: W / 2, y: -70, ty: 126, r: b.r || 34, hp, max: hp, pts: 600 * wave, boss: true, scr: true, big: true,
    a: 0, phase: 1, pi: 0, binv: 0, name: b.name || 'Jefe', bph: b.ph || [['anillo']], ct: [0.9, 1.6, 2.4], flash: 0, dly: 0 });
  msg('¡Jefe!', b.name || '', 2.2); k.sfx('start'); k.shake(6);
}
function bossFire(b, atk) {
  const S = k.D.spd, R = Math.max(0.5, k.D.rate);
  if (atk === 'anillo') { const n = 12; for (let i = 0; i < n; i++) { const a = b.a * 1.2 + i / n * 6.283; ebPush(b.x, b.y, Math.cos(a) * 88 * S, Math.sin(a) * 88 * S); } k.sfx('shoot'); return 1.9 / R; }
  if (atk === 'abanico') { const a = Math.atan2(p.y - b.y, p.x - b.x); for (let j = -3; j <= 3; j++) ebPush(b.x, b.y + 12, Math.cos(a + j * 0.16) * 148 * S, Math.sin(a + j * 0.16) * 148 * S); k.sfx('shoot'); return 1.9 / R; }
  if (atk === 'espiral') { for (let j = 0; j < 3; j++) { const a = b.a * 2.4 + j * 2.094; ebPush(b.x, b.y, Math.cos(a) * 118 * S, Math.sin(a) * 118 * S); } return 0.16 / R; }
  if (atk === 'barrido') { const a = 1.5708 + Math.sin(b.a * 1.05) * 0.8; ebPush(b.x, b.y + 12, Math.cos(a) * 165 * S, Math.sin(a) * 165 * S); return 0.13 / R; }
  if (atk === 'minas') { ebPush(b.x + k.rnd(-24, 24), b.y + 18, k.rnd(-30, 30), 54 * S, { mine: 1, rr: 11 }); return 1 / R; }
  if (atk === 'escolta') { spawnGroup({ f: 'kami', n: 2, k: 0, x: 0.5, w: 0.7, sp: 150, gap: 0.45 }); k.sfx('pop'); return 3.4 / R; }
  return 2;
}
function stepBoss(b, dt) {
  b.a += dt;
  b.y += (b.ty - b.y) * Math.min(1, dt * 1.4);
  b.x = W / 2 + Math.sin(t * 0.55) * (W / 2 - 66);
  const nph = b.bph.length, fr = Math.max(0, b.hp) / b.max, idx = k.clamp(nph - 1 - Math.floor(fr * nph), 0, nph - 1);
  if (idx !== b.pi) {
    b.pi = idx; b.phase = idx + 1; b.binv = 1.3; eb = [];
    msg(`¡Fase ${idx + 1}!`, b.name, 1.4); k.shake(10); k.flash('rgba(255,255,255,.3)'); k.sfx('explode');
    b.ct = [0.7, 1.3, 2];
  }
  if (b.binv > 0) { b.binv -= dt; return; }
  if (b.y < b.ty - 24) return;
  const list = b.bph[b.pi];
  for (let i = 0; i < list.length; i++) { b.ct[i] -= dt; if (b.ct[i] <= 0) b.ct[i] = bossFire(b, list[i]); }
}
function stepWaves(dt) {
  const w = WV[wave - 1] || { g: [] }, gl = w.g || [];
  wt += dt;
  while (qi < gl.length && wt >= gl[qi].t) spawnGroup(gl[qi++]);
  if (w.p) while (pui < w.p.length && wt >= w.p[pui].t) { const u = w.p[pui++]; pups.push({ x: u.x * W, y: -14, t: u.k || 'P' }); }
  if (w.cap) while (ci < w.cap.length && wt >= w.cap[ci].t) { const u = w.cap[ci++]; pups.push({ x: u.x * W, y: -14, t: 'C' }); }
  if (SD && w.cp && sdCP !== wave && wt >= w.cp) { sdCP = wave; k.float('Punto de control', W / 2, H * 0.55, '#4cc38a'); k.sfx('coin'); }
  for (const f of foes) { if (f.boss) stepBoss(f, dt); else stepFoe(f, dt); }   /* el destello lo descuenta el bucle común */
  if (!wdone && qi >= gl.length && !foes.length) { wdone = 1; endT = 1; }
  if (wdone === 1) {
    endT -= dt;
    if (endT <= 0) {
      wdone = 2; score += 200 + 60 * wave; eb = [];
      if (SD) {
        const okP = objPt > 0 && score >= objPt, okC = capGot >= capN, okL = sdLost === 0;
        let st = 1;
        if (!sdUsedCP) { if (okP) st = 2; if (okP && okC && okL) st = 3; }
        const falta = [];
        if (sdUsedCP) falta.push('terminar sin punto de control');
        else { if (!okP) falta.push(`${objPt} puntos`); if (!okC) falta.push(`las ${capN} cápsulas`); if (!okL) falta.push('no perder ninguna nave'); }
        sdCP = 0;
        return k.levelDone(Math.floor(score), `${Math.floor(score)} pts · cápsulas ${capGot}/${capN} · ${lives} vida${lives === 1 ? '' : 's'}`
          + (st < 3 ? `<br>Para 3★ te falta: ${falta.join(', ')}` : ''), { stars: st });
      }
      k.levelDone(Math.floor(score), `Oleada ${wave}/${WV.length} · ${lives} vida${lives === 1 ? '' : 's'}`);
    }
  }
}
/* spec = cuatro letras: F entero · h medio derruido · - sin búnker (la mordida de «h» es
   determinista: la misma oleada trae siempre el mismo boquete). */
function makeBunkers(spec) {
  bunkers = []; const S = spec || 'FFFF';
  for (let b = 0; b < 4; b++) {
    const st = S[b] || 'F'; if (st === '-') continue;
    const bx = 70 + b * 110, by = H - 100;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) {
      if ((y === 4 && x > 2 && x < 5) || (y === 0 && (x === 0 || x === 7))) continue;
      if (st === 'h' && ((x * 2 + y * 3 + b) % 3 === 0 || (y === 0 && x > 2))) continue;
      bunkers.push({ x: bx + x * 5, y: by + y * 5 });
    }
  }
  bkN = -1;   /* la caché de búnkeres se indexa por número de celdas: fuérzala a repintarse */
}
/* ---------- Construcción de una oleada escrita a mano ---------- */
const SCH = { a: { kind: 2, pts: 10, hp: 1 }, b: { kind: 0, pts: 20, hp: 1 }, c: { kind: 1, pts: 30, hp: 1 },
  d: { kind: 3, pts: 40, hp: 2, arm: 1 }, z: { kind: 4, pts: 50, hp: 1, zig: 1 },
  /* verbos nuevos de la tanda 7 (solo pixel-invaders los usa en su tabla) */
  e: { kind: 5, pts: 60, hp: 3, sp2: 'e' }, g: { kind: 6, pts: 70, hp: 2, sp2: 'g' },
  h: { kind: 7, pts: 80, hp: 2, sp2: 'h' }, m: { kind: 8, pts: 60, hp: 2, sp2: 'm' } };
/* Construye una ola (formación) de la tabla. `ph` es la ola; el resto de ajustes vienen del nivel. */
function buildForm(ph, L) {
  LV = { sp: ph.sp || 1, fr: ph.fr == null ? 1 : ph.fr, dr: ph.dr || 10, dv: ph.dv == null ? (L.dv || 0) : ph.dv, uf: PI ? 0 : (L.uf == null ? 1 : L.uf) };
  foes = []; eb = []; shots = []; rocks = []; beams = []; ufo = null; fox = 0; foy = 0; dirX = 1; divT = LV.dv * 1.5;
  const rows = ph.f, cols = rows.reduce((a, r) => Math.max(a, r.length), 0), CS = cols >= 10 ? 38 : 42;
  const x0 = W / 2 - (cols - 1) * CS / 2, y0 = ph.y0 || 58;
  for (let r = 0; r < rows.length; r++) for (let i = 0; i < rows[r].length; i++) {
    const TY = SCH[rows[r][i]]; if (!TY) continue;
    const gx = x0 + i * CS, gy = y0 + r * 30;
    const f = { gx, gy, x: gx, y: gy, r: 12, hp: TY.hp, pts: TY.pts, kind: TY.kind, zig: !!TY.zig, arm: !!TY.arm, sp2: TY.sp2 || 0, fr: 0, dive: 0 };
    if (TY.sp2 === 'e') f.shd = 1;
    if (TY.sp2 === 'g') { f.gun = 1; f.gt = (L.gc || 4.2) * 0.7; }
    if (TY.sp2 === 'h') f.spl = 1;
    if (TY.sp2 === 'm') { f.min = 1; f.mt2 = (L.mc || 3.4) * 0.6; }
    foes.push(f);
  }
  N0 = foes.length;
  if (ph.bs) { const hp = Math.round(ph.bs.hp * (0.82 + k.dif * 0.18)); foes.push({ x: W / 2, y: -70, ty: 112, r: 30, hp, max: hp, pts: 2000, boss: true, inv: 1, a: 0, cd: 2.6, phase: 1, pls: 0, warn: 0, nph: ph.bs.ph || 3, name: ph.bs.name || 'Jefe', tint: '#4a3a7a' }); }
  return foes.length;
}
/* Cuenta los impactos que hace falta dar en una ola (para la barra de «cuánto falta»). */
function formHits(ph) { let n = 0; for (const row of ph.f) for (const ch of row) { const T = SCH[ch]; if (T) n += T.hp; } if (ph.bs) n += Math.round(ph.bs.hp * (0.82 + k.dif * 0.18)); return n; }
/* ---------- Nivel a mano de pixel-invaders: varias olas, tesoros y amenazas ---------- */
function piBuild(i) {
  const L = LVL, ph = L.ph[i] || L.ph[0];
  piPh = i; piCur = formHits(ph);
  buildForm(ph, L);
  foy = -78; piSlide = 1.15;   /* toda ola entra deslizándose: margen de caída uniforme */
  calm = i === 0 ? (wave === 1 ? 4.2 : 2.2) : 1.7;
  if (i === 0) msg(`${wave}. ${L.n || ''}`, L.tip || '', 2.3);
  else { msg(`¡Ola ${i + 1} de ${piNP}!`, '', 1.5); k.sfx('start'); }
}
function handLevel(n) {
  wave = n;
  const L = HAND[k.clamp(n, 1, HAND.length) - 1];
  pups = [];
  if (PI) {
    LVL = L; piNP = L.ph.length;
    lvName = L.n || ''; lvTip = L.tip || ''; tgt = (L.t && (L.t[k.dif] != null ? L.t[k.dif] : L.t[1])) || 0;
    lvT = 0; piKill = 0; piTot = 0; for (const ph of L.ph) piTot += formHits(ph);
    piUf = (L.uf || []).slice(); ufI = 0; piUfoN = piUf.length; piUfoGot = 0; piHurt = 0;
    cbo = 0; cboT = 0; mult = 1; piSeq = 0;
    mtT = L.mt ? L.mt * 0.7 : 0; ryT = L.ry ? L.ry * 0.7 : 0;
    const st = (L.cp && piCP && piCP.lv === n) ? piCP.ph : 0;
    piUsedCP = st > 0 ? 1 : 0;
    makeBunkers(L.bk);
    piBuild(st);
    if (st > 0) { for (let q = 0; q < st; q++) piKill += formHits(L.ph[q]); msg(`Control · ola ${st + 1}`, 'Este intento solo puntúa 1★', 2.2); }
    return;
  }
  buildForm({ f: L.f, y0: L.y0, sp: L.sp, fr: L.fr, dr: L.dr, dv: L.dv }, L);
  calm = n === 1 ? 5 : 2.4;
  makeBunkers(L.bk);
  msg(L.m || `Nivel ${n}`);
}
/* Jefe de la oleada 20 (solo invasores): tres fases con patrón propio, siempre esquivable
   moviéndose de lado. El jefe genérico de starfall/bullet-rain no se toca. */
function bossEscort(b) {
  const x = k.clamp(b.x + k.rnd(-70, 70), 30, W - 30);
  foes.push({ gx: x - fox, gy: 148 - foy, x, y: b.y + 14, r: 12, hp: 1, pts: 50, kind: 4, zig: true, fr: 0, dive: 1, dt: 0, dx: x, shots: 0 });
  k.sfx('pop');
}
function bossInv(b, dt, D) {
  b.a += dt;
  b.y += (b.ty - b.y) * Math.min(1, dt * 1.5);
  const NP = b.nph || 3;
  b.phase = NP === 2 ? (b.hp < b.max * 0.5 ? 2 : 1) : b.hp < b.max * 0.34 ? 3 : b.hp < b.max * 0.67 ? 2 : 1;
  /* Cambio de fase anunciado: limpia el plomo, avisa y da un segundo de aire (nunca mata de sorpresa). */
  if (b.pls !== b.phase) {
    if (b.pls) { eb = []; b.cd = 1.6; b.warn = 0; msg(`¡Fase ${b.phase}!`, b.name || '', 1.4); k.shake(9); k.flash('rgba(255,255,255,.28)'); k.sfx('explode'); }
    b.pls = b.phase;
  }
  b.x = W / 2 + Math.sin(b.a * (0.42 + b.phase * 0.13) * k.D.spd) * (W / 2 - 74);
  if (b.y < b.ty - 25) return;
  b.cd -= dt;
  /* Telegrafía: los últimos 0,6 s antes de cada salva el jefe se carga a la vista. */
  b.warn = b.cd <= 0.6 && b.cd > 0 ? 1 - b.cd / 0.6 : 0;
  if (b.cd > 0) return;
  const vd = lerp(118, 148, D) * k.D.spd;
  if (b.phase === 1) {                                   /* dos plomos dirigidos, con calma */
    b.cd = 1.55 / k.D.rate;
    for (const sd of [-1, 1]) { const a = Math.atan2(p.y - b.y, p.x + sd * 30 - b.x); eb.push({ x: b.x + sd * 22, y: b.y + 18, vx: Math.cos(a) * vd, vy: Math.sin(a) * vd, zig: 1 }); }
  } else if (b.phase === 2) {                            /* abanico hacia abajo + escolta */
    b.cd = 1.35 / k.D.rate;
    for (let i = -2; i <= 2; i++) eb.push({ x: b.x, y: b.y + 18, vx: i * 44, vy: vd });
    if (Math.random() < 0.3) bossEscort(b);
  } else {                                               /* barrido en peine + salva dirigida */
    b.cd = 1.12 / k.D.rate;
    b.sw = ((b.sw || 0) + 1) % 4;
    for (let i = 0; i < 5; i++) eb.push({ x: b.x - 62 + i * 31 + b.sw * 7, y: b.y + 18, vx: 0, vy: vd * 1.12 });
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    for (let j = -1; j <= 1; j++) eb.push({ x: b.x, y: b.y + 18, vx: Math.cos(a + j * 0.24) * vd * 1.1, vy: Math.sin(a + j * 0.24) * vd * 1.1 });
  }
  k.sfx('shoot');
}
/* ================================================ runtime de pixel-invaders (tanda 7)
   Todo lo de aquí solo corre si PI (CFG.id === 'pixel-invaders'): los otros juegos de
   shooter.js no entran nunca en estas funciones. */
function piSwarm(f) {                                  /* crías del enjambrador */
  for (const sd of [-1, 1]) {
    const x = k.clamp(f.x + sd * 15, 26, W - 26);
    foes.push({ gx: x - fox, gy: f.gy, x, y: f.y, r: 10, hp: 1, pts: 25, kind: 4, zig: true, fr: 0,
      dive: 1, dt: 0, dx: x, shots: 1, cria: 1 });
  }
  k.sfx('pop');
}
/* ¿la columna gx está cubierta por un escudero vecino? (columna contigua, no la propia) */
function shielded(gx) { for (let i = 0; i < shd.length; i++) { const d = Math.abs(gx - shd[i]); if (d > 20 && d < 60) return true; } return false; }
function piHits() { let n = 0; for (const f of foes) if (!f.dead && !f.cria) n += Math.max(0, f.hp); return n; }
function piUpdate(dt, D) {
  lvT += dt;
  if (cboT > 0) { cboT -= dt; if (cboT <= 0) { cbo = 0; mult = 1; k.chainReset(); } }
  /* --- escuderos: protegen las columnas DE AL LADO, nunca la suya (si no, serían
         inalcanzables detrás de los bichos que ellos mismos hacen intocables) --- */
  shd.length = 0;
  for (const f of foes) if (f.shd && !f.dead && !f.dive) shd.push(f.gx);
  if (shd.length) for (const s of shots) {
    if (s.dead) continue;
    for (const f of foes) {
      if (f.dead || f.dive || f.boss || f.shd || f.cria || !shielded(f.gx)) continue;
      if (Math.hypot(s.x - f.x, s.y - f.y) < f.r + 5) { s.dead = true; k.burst(s.x, s.y, '#3cc7d0', 5, 70); k.sfx('click'); break; }
    }
  }
  /* --- OVNI de contrabando: horario escrito a mano, es el tesoro del nivel --- */
  if (ufI < piUf.length && lvT >= piUf[ufI]) { ufI++; ufo = { x: -30, y: 34, vx: 104, pts: 150, tr: 1 }; k.sfx('start'); }
  if (calm <= 0) {
    /* --- artilleros: 0,95 s de carga marcando la línea, luego tres plomos dirigidos --- */
    for (const f of foes) {
      if (f.dead || !f.gun || f.dive) continue;
      if (f.chg > 0) {
        f.chg -= dt;
        if (f.chg <= 0) {
          f.chg = 0; f.gt = (LVL.gc || 4.2) / k.D.rate;
          const a = Math.atan2(p.y - f.y, f.ax - f.x), v = lerp(150, 196, D) * k.D.spd;
          for (let j = -1; j <= 1; j++) eb.push({ x: f.x, y: f.y + 12, vx: Math.cos(a + j * 0.13) * v, vy: Math.sin(a + j * 0.13) * v });
          k.sfx('shoot');
        }
      } else { f.gt -= dt; if (f.gt <= 0) { f.chg = 0.95; f.ax = p.x; k.sfx('click'); } }
    }
    /* --- minadores: bombas lentas que estallan en abanico abajo (y se pueden disparar) --- */
    for (const f of foes) {
      if (f.dead || !f.min || f.dive) continue;
      f.mt2 -= dt;
      if (f.mt2 <= 0) { f.mt2 = (LVL.mc || 3.4) / k.D.rate; eb.push({ x: f.x, y: f.y + 14, vx: 0, vy: 46 * k.D.spd, bomb: 1, rr: 10 }); k.sfx('pop'); }
    }
  }
  for (const e of eb) if (e.bomb && !e.dead && e.y > H - 104) {
    e.dead = true; const v = lerp(118, 158, D) * k.D.spd;
    for (let j = -2; j <= 2; j++) eb.push({ x: e.x, y: e.y, vx: j * 42, vy: Math.abs(j) === 2 ? v * 0.55 : v });
    k.burst(e.x, e.y, '#5b8cff', 16, 150); k.sfx('explode');
  }
  for (const s of shots) { if (s.dead) continue; for (const e of eb) if (e.bomb && !e.dead && Math.hypot(s.x - e.x, s.y - e.y) < 13) { e.dead = true; s.dead = true; score += 15 * mult; k.burst(e.x, e.y, '#5b8cff', 10, 120); k.sfx('pop'); break; } }
  /* --- meteoros: 1,2 s de sombra de aviso, dos impactos, rompen búnker --- */
  if (LVL.mt && calm <= 0) { mtT -= dt; if (mtT <= 0) { mtT = LVL.mt / k.D.rate; piSeq = (piSeq + 1) % 5; rocks.push({ x: 56 + ((piSeq * 97) % (W - 112)), y: -26, hp: 2, w: 1.2, vy: lerp(86, 120, D) * k.D.spd, fl: 0 }); } }
  for (const r of rocks) {
    r.fl -= dt;
    if (r.w > 0) { r.w -= dt; continue; }
    r.y += r.vy * dt;
    if (Math.hypot(r.x - p.x, r.y - p.y) < 24) { r.dead = true; k.burst(r.x, r.y, '#8a7f9c', 20, 180); hitPlayer(); }
    for (const b of bunkers) if (!b.dead && Math.abs(b.x - r.x) < 16 && Math.abs(b.y - r.y) < 14) b.dead = true;
    if (r.y > H + 30) r.dead = true;
  }
  for (const s of shots) { if (s.dead) continue; for (const r of rocks) if (!r.dead && r.w <= 0 && Math.hypot(s.x - r.x, s.y - r.y) < 19) { s.dead = true; r.fl = 0.07; if (--r.hp <= 0) { r.dead = true; score += 40 * mult; k.float(`+${40 * mult}`, r.x, r.y, '#e9b949'); k.burst(r.x, r.y, '#8a7f9c', 22, 170); k.sfx('explode'); } break; } }
  rocks = rocks.filter((r) => !r.dead);
  /* --- rayo trazador: marca la columna 1,15 s antes; el búnker lo absorbe --- */
  if (LVL.ry && calm <= 0) { ryT -= dt; if (ryT <= 0) { ryT = LVL.ry / k.D.rate; beams.push({ x: k.clamp(p.x, 30, W - 30), w: 1.15, f: 0, top: H }); k.sfx('click'); } }
  for (const bm of beams) {
    if (bm.w > 0) {
      bm.w -= dt;
      if (bm.w <= 0) { bm.f = 0.45; k.sfx('shoot'); k.shake(4); bm.top = H; for (const b of bunkers) if (!b.dead && Math.abs(b.x - bm.x) < 12) { b.dead = true; bm.top = Math.min(bm.top, b.y); } }
      continue;
    }
    bm.f -= dt;
    if (bm.f <= 0) { bm.dead = true; continue; }
    if (Math.abs(p.x - bm.x) < 13 && p.y < bm.top) hitPlayer();
  }
  beams = beams.filter((bm) => !bm.dead);
  bunkers = bunkers.filter((b) => !b.dead);
}
/* Cierre del nivel: 1★ terminar · 2★ el tiempo objetivo escrito por nivel y dificultad ·
   3★ ese tiempo + todos los OVNIs + sin recibir daño. Con punto de control, solo 1★. */
function piDone() {
  const okT = tgt > 0 && lvT <= tgt, okU = piUfoGot >= piUfoN, okH = piHurt === 0;
  let st = 1;
  if (!piUsedCP) { if (okT) st = 2; if (okT && okU && okH) st = 3; }
  const falta = [];
  if (piUsedCP) falta.push('terminar sin punto de control');
  else { if (!okT) falta.push(`bajar de ${tgt} s`); if (!okU) falta.push(`los ${piUfoN} OVNIs`); if (!okH) falta.push('no recibir daño'); }
  piCP = null;
  return k.levelDone(Math.floor(score), `${lvT.toFixed(1)} s · OVNIs ${piUfoGot}/${piUfoN} · ${lives} vida${lives === 1 ? '' : 's'}`
    + (st < 3 ? `<br>Para 3★ te falta: ${falta.join(', ')}` : ''), { stars: st });
}
function reset() { p = { x: W / 2, y: H - 50, tilt: 0 }; shots = []; foes = []; eb = []; pups = []; score = 0; lives = 4 + k.D.life; wave = 0; cool = 0; inv = 3 / k.D.dmg; t = 0; pt = 0; calm = 0; power = 1; shield = 0; ufo = null; bunkers = []; fox = 0; foy = 0; divT = 0; N0 = 45; LV = { sp: 1, fr: 1, dr: 10, dv: 0, uf: 1 }; stars = Array.from({ length: 70 }, () => ({ x: k.rnd(0, W), y: k.rnd(0, H), z: k.rnd(0.2, 1) })); if (HANDV) { lives = 3 + k.D.life; startWave(k.lv); } else if (HAND) handLevel(k.lv); else spawnWave(); }
/* Niveles diseñados a mano (plan Friv): el progreso lo guarda kit.js por dificultad. */
if (HAND) k.levels(HAND.length, { start: () => reset() });
/* Oleadas a mano de starfall-defender: mismo progreso por dificultad. */
if (HANDV) k.levels(WV.length, { start: () => reset() });
if (M !== 'coop') { reset(); k.show(CFG.title, CFG.help);
/* si el jugador cambia de nivel en la pantalla de inicio, la partida se prepara de nuevo con los valores de k.D */
k.onDif = () => { if (k.st !== 'play') reset(); }; }
function hitPlayer() { if (inv > 0) return; if (shield > 0) { shield = 0; inv = 1 / k.D.dmg; k.sfx('hit'); k.burst(p.x, p.y, '#5ce1e6', 16); return; } lives--; if (PI) { piHurt++; cbo = 0; mult = 1; k.chainReset(); } if (SD) sdLost++; inv = 2 / k.D.dmg; eb = []; power = Math.max(1, power - 1); k.burst(p.x, p.y, '#ffb347', 30, 220); k.sfx('explode'); k.shake(8); k.flash('rgba(255,80,90,.35)'); if (lives <= 0) k.lose(CFG.id, Math.floor(score), 'Nave destruida', HANDV ? `Oleada ${wave}/${WV.length}` : HAND ? `Nivel ${wave} de ${HAND.length}` : `Oleada ${wave}`); }
function killFoe(f) { f.dead = true;
  if (PI && !f.boss) { cbo++; cboT = 2.4; mult = 1 + Math.min(3, Math.floor(cbo / 6)); if (cbo > 1) { k.chime(cbo - 2); k.combo(cbo, f.x, f.y - 18); } if (mult > 1) f.pts *= mult; }
  if (PI && f.spl) piSwarm(f);
  if (SD && f.core) { const v = 92 * k.D.spd; for (let j = 0; j < 8; j++) ebPush(f.x, f.y, Math.cos(j * 0.7854) * v, Math.sin(j * 0.7854) * v); k.shake(5); }
  if (SD && f.drn) { const mo = foes.find((q) => q.moth && q.escId === f.escId && !q.dead); if (mo && !foes.some((q) => q.drn && q.escId === f.escId && !q.dead)) { mo.binv = 0; k.float('¡Al descubierto!', mo.x, mo.y - 26, '#ffd166'); k.sfx('win'); } }
  score += f.pts; k.burst(f.x, f.y, f.boss ? '#f0647e' : EC[(f.kind || 0) % 4], f.boss ? 70 : 14, f.boss ? 260 : 160); k.sfx(f.boss ? 'explode' : 'hit'); if (f.boss) { k.shake(12); k.float(`+${f.pts}`, f.x, f.y, '#e9b949'); pups.push({ x: f.x, y: f.y, t: 'P' }); }
  if (M === 'centipede' && f.seg) mush.push({ x: Math.round((f.x - 10) / 20) * 20 + 10, y: f.y, hp: 3 });
  if (M === 'vertical' && !HANDV && !f.boss && Math.random() < 0.08) pups.push({ x: f.x, y: f.y, t: Math.random() < 0.6 ? 'P' : 'S' }); }
if (M !== 'coop') k.run((dt) => {
  t += dt; for (const s of stars) { s.y += (20 + s.z * 90) * dt; if (s.y > H) { s.y = 0; s.x = k.rnd(0, W); } }
  bannerT -= dt;
  if (!k.gate(reset)) return;
  pt += dt; calm -= dt; const D = diff();
  const sp = 270, free = M !== 'invaders', ox = p.x;
  if (k.held.has('left')) p.x -= sp * dt; if (k.held.has('right')) p.x += sp * dt;
  if (free && k.held.has('up')) p.y -= sp * dt; if (free && k.held.has('down')) p.y += sp * dt;
  if (k.ptr.down) { p.x += (k.ptr.x - p.x) * Math.min(1, dt * 24); if (free) p.y += (k.ptr.y - 70 - p.y) * Math.min(1, dt * 24); }
  p.x = k.clamp(p.x, 16, W - 16); p.y = k.clamp(p.y, free ? H * 0.4 : H - 40, H - 30); p.tilt += (((p.x - ox) / Math.max(dt, 0.001)) / 300 - p.tilt) * Math.min(1, dt * 10);
  cool -= dt; inv -= dt; shield -= dt;
  const auto = M !== 'invaders' || k.ptr.down, rate = M === 'bullethell' ? 0.09 : M === 'invaders' ? 0.45 : 0.18;
  if ((k.held.has('a') || auto) && cool <= 0 && (M !== 'invaders' || shots.length < 2)) { cool = rate; const n = M === 'bullethell' ? 3 : Math.min(3, power);
    for (let i = 0; i < n; i++) shots.push({ x: p.x + (i - (n - 1) / 2) * 9, y: p.y - 16, vx: (i - (n - 1) / 2) * (M === 'bullethell' ? 40 : 60) }); if (M !== 'bullethell') k.sfx('shoot'); }
  for (const s of shots) { s.y -= 560 * dt; s.x += (s.vx || 0) * dt; }
  /* enemigos */
  if (M === 'invaders') {
    if (PI && foy < 0) foy = Math.min(0, foy + 70 * dt);   /* la ola nueva entra deslizándose */
    /* La flota se mueve como un bloque: cada bicho guarda su hueco (gx, gy) y el bloque lleva
       su propio desplazamiento (fox, foy). Así un saltarín puede descolgarse y volver a su sitio. */
    const form = foes.filter((f) => !f.boss && !f.dive), gone = Math.max(0, N0 - form.length);
    const sp2 = (lerp(16, 34, D) + gone * 2.7) * k.D.spd * LV.sp;
    fox += dirX * sp2 * dt;
    let lo = 1e9, hi = -1e9, low = -1e9;
    for (const f of form) { const fx = f.gx + fox, fy = f.gy + foy; if (fx < lo) lo = fx; if (fx > hi) hi = fx; if (fy > low) low = fy; }
    if (form.length && (lo < 16 || hi > W - 16)) { dirX *= -1; fox += dirX * 4; foy += LV.dr; if (low + LV.dr > H - 72) return k.lose(CFG.id, Math.floor(score), 'Invadido', HAND ? `Nivel ${wave} de ${HAND.length}` : `Oleada ${wave}`); }
    const fr = Math.floor(t * (1 + gone / 12)) % 2;
    for (const f of foes) { if (f.boss) continue; f.fr = fr; if (!f.dive) { f.x = f.gx + fox; f.y = f.gy + foy; } }
    /* saltarines: se descuelgan, bajan en zigzag persiguiendo la nave y, si salen por abajo,
       reaparecen arriba y vuelven a su hueco de la formación. */
    if (LV.dv > 0 && calm <= 0) {
      divT -= dt;
      if (divT <= 0) { const cand = form.filter((f) => f.zig); if (cand.length) { const f = k.pick(cand); f.dive = 1; f.dt = 0; f.dx = f.x; f.shots = 1; k.sfx('pop'); } divT = LV.dv * k.rnd(0.85, 1.2) / k.D.rate; }
    }
    for (const f of foes) if (f.dive) {
      f.dt += dt;
      if (f.dive === 1) {
        f.dx += Math.sign(p.x - f.dx) * 48 * dt; f.dx = k.clamp(f.dx, 26, W - 26);
        f.x = f.dx + Math.sin(f.dt * 4.6) * 52; f.y += lerp(100, 148, D) * k.D.spd * dt;
        if (f.shots > 0 && f.y > 90 && f.y < H - 120 && Math.random() < dt * 1.2 * k.D.rate) { f.shots--; eb.push({ x: f.x, y: f.y + 10, vx: 0, vy: lerp(140, 190, D) * k.D.spd, zig: 1 }); }
        if (f.y > H + 20) { f.dive = 2; f.y = -20; }
      } else { const hx = f.gx + fox, hy = f.gy + foy; f.x += (hx - f.x) * Math.min(1, dt * 3); f.y += (hy - f.y) * Math.min(1, dt * 3); if (Math.hypot(hx - f.x, hy - f.y) < 3) f.dive = 0; }
    }
    if (form.length && calm <= 0 && Math.random() < dt * lerp(0.45, 2.25, D) * k.D.rate * LV.fr) { const cols = {}; for (const f of form) { const key = Math.round(f.x / 10); if (!cols[key] || cols[key].y < f.y) cols[key] = f; } const f = k.pick(Object.values(cols)); eb.push({ x: f.x, y: f.y + 10, vx: 0, vy: lerp(128, 208, D) * k.D.spd, zig: 1 }); }
    if (!ufo && LV.uf > 0 && Math.random() < dt * 0.06 * LV.uf) ufo = { x: -30, y: 34, vx: 90, pts: k.pick([50, 100, 150, 300]) };
    if (ufo) { ufo.x += ufo.vx * dt; if (ufo.x > W + 40) ufo = null; }
    for (const s of shots) { if (ufo && !s.dead && Math.abs(s.x - ufo.x) < 18 && Math.abs(s.y - ufo.y) < 10) { s.dead = true; score += ufo.pts * (PI ? mult : 1); k.float(`+${ufo.pts * (PI ? mult : 1)}`, ufo.x, ufo.y, '#e9b949'); k.burst(ufo.x, ufo.y, '#f0647e', 24); k.sfx('coin'); if (PI && ufo.tr) { piUfoGot++; k.reward('¡Contrabando!', '#e9b949'); k.punch(4); } ufo = null; }
      for (const b of bunkers) if (!b.dead && !s.dead && s.x > b.x - 1 && s.x < b.x + 6 && s.y < b.y + 6 && s.y + 560 * dt > b.y) { b.dead = true; s.dead = true; } } /* barrido: a 560 px/s la bala avanza más que una celda por fotograma */
    for (const e of eb) for (const b of bunkers) if (!b.dead && !e.dead && e.x > b.x - 2 && e.x < b.x + 7 && e.y > b.y && e.y - e.vy * dt < b.y + 6) { b.dead = true; e.dead = true; k.burst(e.x, e.y, '#4cc38a', 3, 60); }
    for (const f of foes) { if (f.dive || f.boss) continue; for (const b of bunkers) if (!b.dead && Math.abs(f.x - b.x) < 14 && Math.abs(f.y - b.y) < 10) b.dead = true; }
    bunkers = bunkers.filter((b) => !b.dead);
    if (PI) piUpdate(dt, D);
  } else if (HANDV) {
    stepWaves(dt);
    /* las minas también se pueden destruir a tiros */
    for (const s of shots) for (const e of eb) if (e.mine && !e.dead && !s.dead && Math.hypot(s.x - e.x, s.y - e.y) < 13) { e.dead = true; s.dead = true; score += 5; k.burst(e.x, e.y, '#ff8fa3', 10, 120); k.sfx('pop'); }
  } else if (M === 'vertical') {
    if (!foes.some((f) => f.boss) && calm <= 0 && Math.random() < dt * lerp(0.8, 2.56, D) * k.D.rate) { const big = Math.random() < lerp(0.06, 0.22, D); foes.push({ x: k.rnd(24, W - 24), y: -20, r: big ? 18 : 12, hp: big ? 6 : 1, pts: big ? 60 : 15, vy: k.rnd(60, 120) * lerp(0.56, 0.98, D) * k.D.spd, ph: k.rnd(0, 6), big, kind: k.ri(0, 3) }); }
    for (const f of foes) { if (f.boss) continue; f.y += f.vy * dt; f.x += Math.sin(t * 2 + f.ph) * 45 * dt; if (f.big && f.y > 20 && Math.random() < dt * lerp(0.34, 0.75, D) * k.D.rate) { const a = Math.atan2(p.y - f.y, p.x - f.x), v = lerp(112, 152, D) * k.D.spd; eb.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v }); } if (f.y > H + 30) f.dead = true; }
    if (!foes.some((f) => f.boss) && pt > wave * 26) spawnWave();
  } else if (M === 'centipede') {
    for (const f of foes) { if (f.spider) continue; f.x += f.dir * lerp(56, 128, D) * k.D.spd * dt;
      const blocked = f.x < 10 || f.x > W - 10 || mush.some((m) => m.hp > 0 && Math.abs(m.x - f.x) < 14 && Math.abs(m.y - f.y) < 10);
      if (blocked) { f.dir *= -1; f.x = k.clamp(f.x, 10, W - 10); f.y += 20; if (f.y > H - 20) f.y = H * 0.62; }
      if (Math.hypot(f.x - p.x, f.y - p.y) < 17) hitPlayer(); }
    const segs = foes.filter((f) => f.seg); segs.forEach((f, i) => { if (i === 0 || !segs[i - 1] || Math.hypot(segs[i - 1].x - f.x, segs[i - 1].y - f.y) > 24) f.head = true; });
    for (const s of shots) for (const m of mush) if (m.hp > 0 && !s.dead && Math.abs(s.x - m.x) < 10 && Math.abs(s.y - m.y) < 10) { m.hp--; s.dead = true; score += 1; if (!m.hp) k.burst(m.x, m.y, '#e0649a', 6, 60); }
    if (calm <= -2 && Math.random() < dt * lerp(0.12, 0.4, D) * k.D.rate) { const sx = Math.random() < 0.5 ? -10 : W + 10; foes.push({ x: sx, y: k.rnd(H * 0.6, H - 40), r: 11, hp: 1, pts: k.pick([300, 600, 900]), dir: sx < 0 ? 1 : -1, spider: true }); }
    for (const f of foes) if (f.spider) { f.x += f.dir * lerp(64, 98, D) * k.D.spd * dt; f.y += Math.sin(t * 7 + f.x * 0.05) * 140 * dt; f.y = k.clamp(f.y, H * 0.55, H - 20); if (f.x < -20 || f.x > W + 20) f.dead = true; if (Math.hypot(f.x - p.x, f.y - p.y) < 17) hitPlayer(); mush.forEach((m) => { if (Math.abs(m.x - f.x) < 10 && Math.abs(m.y - f.y) < 10) m.hp = 0; }); }
  }
  for (const b of foes) if (b.boss) {
    if (b.scr) continue;   /* jefe de las oleadas a mano: lo lleva stepBoss() */
    if (b.inv) { bossInv(b, dt, D); continue; }
    b.y += (b.ty - b.y) * Math.min(1, dt * 1.5); b.a += dt; b.x = W / 2 + Math.sin(t * 0.7) * 110; b.phase = b.hp < b.max * 0.33 ? 3 : b.hp < b.max * 0.66 ? 2 : 1;
    /* no dispara hasta estar en posición; anillos y ráfagas crecen con la dificultad y con la fase */
    const n = Math.round(lerp(7, 18, D)) + b.phase * 2, rv = (lerp(68, 88, D) + b.phase * 12) * k.D.spd, av = lerp(132, 168, D) * k.D.spd;
    if (b.y > b.ty - 25 && Math.random() < dt * (lerp(0.68, 1.28, D) + b.phase * lerp(0.38, 0.68, D)) * k.D.rate) for (let i = 0; i < n; i++) { const a = b.a * (b.phase === 3 ? 3 : 2) + i / n * 6.283; eb.push({ x: b.x, y: b.y, vx: Math.cos(a) * rv, vy: Math.sin(a) * rv }); }
    if (b.y > b.ty - 25 && Math.random() < dt * (lerp(0.38, 0.68, D) + b.phase * 0.26) * k.D.rate) { const a = Math.atan2(p.y - b.y, p.x - b.x); for (let j = -1; j <= 1; j++) eb.push({ x: b.x, y: b.y, vx: Math.cos(a + j * 0.2) * av, vy: Math.sin(a + j * 0.2) * av }); }
    if (M === 'bullethell') score += dt * 5;
  }
  for (const s of shots) for (const f of foes) if (!f.dead && !s.dead && !f.dly && !(f.binv > 0) && Math.hypot(s.x - f.x, s.y - f.y) < f.r + 4) { s.dead = true; f.flash = 0.06; if (--f.hp <= 0) killFoe(f); }
  for (const e of eb) { e.x += e.vx * dt; e.y += e.vy * dt; if (Math.hypot(e.x - p.x, e.y - p.y) < (e.rr || (M === 'bullethell' ? 4.25 : 9.4))) { e.dead = true; hitPlayer(); } }
  for (const f of foes) { f.flash = (f.flash || 0) - dt; if (!f.dead && !f.boss && !f.dly && M !== 'centipede' && Math.hypot(f.x - p.x, f.y - p.y) < f.r + 10) { if (f.tough) hitPlayer(); else { killFoe(f); hitPlayer(); } } }
  for (const u of pups) { u.y += 90 * dt; if (Math.hypot(u.x - p.x, u.y - p.y) < 26) { u.dead = true; k.sfx('coin'); if (u.t === 'C') { score += 120; capGot++; power = Math.min(3, power + 1); k.float('¡Cápsula +120!', p.x, p.y - 30, '#e9b949'); k.reward('¡Rescate!', '#e9b949'); } else if (u.t === 'P') { power = Math.min(3, power + 1); k.float('¡Disparo mejorado!', p.x, p.y - 30, '#5ce1e6'); } else { shield = 10; k.float('¡Escudo!', p.x, p.y - 30, '#9b8afb'); } } }
  shots = shots.filter((s) => !s.dead && s.y > -10); eb = eb.filter((e) => !e.dead && e.y > -20 && e.y < H + 20 && e.x > -20 && e.x < W + 20); foes = foes.filter((f) => !f.dead); pups = pups.filter((u) => !u.dead && u.y < H + 20);
  if (k.st === 'play' && M !== 'vertical' && !foes.some((f) => !f.spider)) {
    if (PI && piPh < piNP - 1) {
      piKill += formHits(LVL.ph[piPh]);
      if (LVL.cp) piCP = { lv: wave, ph: piPh + 1 };
      score += 60 * (piPh + 1); k.reward('¡Ola limpia!', '#5ce1e6'); k.sfx('win'); k.punch(5);
      piBuild(piPh + 1); return;
    }
    score += 200 * wave;
    if (PI) return piDone();
    if (HAND) return k.levelDone(Math.floor(score), `${lives} vida${lives === 1 ? '' : 's'} · ${Math.floor(score)} puntos`);
    k.float(`+${200 * wave}`, W / 2, H * 0.5, '#e9b949'); k.sfx('win'); k.confetti(); spawnWave(); }
  if (k.st === 'play' && M === 'vertical' && wave % 3 === 0 && !foes.some((f) => f.boss) && t > 3) { /* jefe vencido */ }
}, () => {
  background();
  if (M === 'centipede') for (const m of mush) if (m.hp > 0) mushroom(m.x, m.y, m.hp);
  if (bunkers) drawBunkers();
  if (PI) {
    /* sombra de aviso del meteoro (1,2 s) y columna marcada del rayo trazador (1,15 s) */
    for (const r of rocks) if (r.w > 0) { const q = 1 - r.w / 1.2; c.save(); c.globalAlpha = 0.16 + q * 0.3; c.fillStyle = '#8a7f9c'; c.beginPath(); c.ellipse(r.x, H - 34, 18 + q * 8, 5 + q * 2.5, 0, 0, 6.283); c.fill(); c.globalAlpha = 0.5; c.fillStyle = '#c9c1d8'; c.fillRect(r.x - 1, 0, 2, 20 + q * 26); c.restore(); }
    for (const bm of beams) {
      c.save();
      if (bm.w > 0) { const q = 1 - bm.w / 1.15; c.globalAlpha = 0.1 + q * 0.26; c.fillStyle = '#ffd166'; c.fillRect(bm.x - 13, 0, 26, H); c.globalAlpha = 0.6; c.fillRect(bm.x - 13, 0, 1.6, H); c.fillRect(bm.x + 11.4, 0, 1.6, H); }
      else { c.fillStyle = '#fff2c2'; c.fillRect(bm.x - 11, 0, 22, bm.top); c.globalAlpha = 0.45; c.fillStyle = '#ffd166'; c.fillRect(bm.x - 17, 0, 34, bm.top); }
      c.restore();
    }
  }
  if (ufo) { c.save(); c.translate(ufo.x, ufo.y);
    const disc = (g) => g.ellipse(0, 2, 20, 7, 0, 0, 6.283), dome = (g) => { g.moveTo(-8, -1.4); g.bezierCurveTo(-8, -9.6, 8, -9.6, 8, -1.4); g.quadraticCurveTo(0, 0.6, -8, -1.4); g.closePath(); };
    const gd = c.createLinearGradient(0, -5, 0, 9); gd.addColorStop(0, '#ff93a8'); gd.addColorStop(0.5, '#f0647e'); gd.addColorStop(1, '#9c3550');
    unite(c, [[dome, '#5ce1e6'], [disc, gd]], 1.15);
    clipIn(c, dome, (g) => { g.fillStyle = AL('#ffffff', 0.45); g.beginPath(); g.ellipse(-3, -5, 2.6, 1.6, -0.4, 0, 6.283); g.fill(); });
    clipIn(c, disc, (g) => { g.fillStyle = AL(OUT, 0.24); g.fillRect(-20, -1.2, 40, 2); for (let i = -2; i <= 2; i++) { g.fillStyle = Math.floor(t * 8 + i) % 2 ? '#fff' : '#e9b949'; g.beginPath(); g.arc(i * 7, 4, 1.8, 0, 6.283); g.fill(); } });
    c.restore(); }
  if (PI) for (const r of rocks) if (r.w <= 0) { const sp = rockSpr(r.fl > 0 ? 2 : r.hp > 1 ? 2 : 1); c.save(); if (r.fl > 0) c.globalAlpha = 0.85; c.drawImage(sp.cv, r.x - sp.r, r.y - sp.r, sp.w, sp.w); c.restore(); }
  if (M === 'centipede') chain(foes.filter((f) => f.seg));
  for (const f of foes) { const fl = f.flash > 0; if (f.dly > 0) continue;   /* aún no ha entrado */
    if (f.boss) { boss(f, fl); const bw = Math.min(220, W - 150), bx = W / 2 - bw / 2; ART.rr(c, bx - 2, 54, bw + 4, 10, 5); ART.fillOut(c, 'rgba(12,10,24,.7)', 2); c.fillStyle = f.phase > 2 ? '#ff3b5c' : '#f0647e'; ART.rr(c, bx, 56, bw * Math.max(0, f.hp) / f.max, 6, 3); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(bx + 2, 56.5, Math.max(0, bw * f.hp / f.max - 4), 1.5);
      if (f.name) label(f.name, W / 2, 68, 12, '#ffd7e0', 'center', W - 40);   /* bajo la barra: no choca con la oleada ni con las vidas */ continue; }
    if (f.seg) continue;
    else if (f.spider) { c.save(); c.translate(f.x, f.y); c.lineCap = 'round';
      const legs = [];
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const ly = -6 + i * 4 + Math.sin(t * 20 + i + sd) * 2; legs.push([(g) => limb(g, sd * 1.6, -1.4, sd * 9, ly - 5, sd * 15, ly + 2, sd * 2.2), '#c98a2a']); }
      unite(c, legs.concat([[(g) => g.ellipse(0, 1, 9, 8, 0, 0, 6.283), fl ? '#fff' : '#e9b949']]), 1.05);
      clipIn(c, (g) => g.ellipse(0, 1, 9, 8, 0, 0, 6.283), (g) => { g.fillStyle = AL(OUT, 0.22); g.beginPath(); g.arc(3, 4, 8, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-3, -3, 2.5, 0, 6.283); g.fill(); });
      c.fillStyle = '#ff3b5c'; c.beginPath(); c.arc(-3, 2, 1.8, 0, 6.283); c.arc(3, 2, 1.8, 0, 6.283); c.fill(); c.restore(); }
    else if (M === 'invaders') {
      if (f.kind >= 5) piArt(({ 5: 'e', 6: 'g', 7: 'h', 8: 'm' })[f.kind], f.x, f.y, f.fr, fl); else alien(f.x, f.y, f.kind, f.fr, fl);
      if (f.arm) { c.strokeStyle = '#e9b949'; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, 15, 3.6, 5.8); c.stroke(); }
      if (f.shd) { const a = 0.32 + Math.sin(t * 6) * 0.12; c.strokeStyle = `rgba(60,199,208,${a.toFixed(2)})`; c.lineWidth = 2; c.beginPath(); c.moveTo(f.x - 58, f.y + 14); c.lineTo(f.x - 22, f.y + 14); c.moveTo(f.x + 22, f.y + 14); c.lineTo(f.x + 58, f.y + 14); c.stroke(); }
      else if (PI && !f.dive && !f.cria && shd.length && shielded(f.gx)) { const a = 0.26 + Math.sin(t * 6) * 0.1; c.fillStyle = `rgba(60,199,208,${a.toFixed(2)})`; c.beginPath(); c.arc(f.x, f.y, f.r + 5, 0, 6.2832); c.fill(); }
      if (f.chg > 0) { const q = 1 - f.chg / 0.95; c.save(); c.globalAlpha = 0.25 + q * 0.45; c.strokeStyle = '#ffd166'; c.lineWidth = 1.4 + q * 1.6; c.beginPath(); c.moveTo(f.x, f.y + 12); c.lineTo(f.ax, H - 30); c.stroke(); c.restore(); }
    }
    else if (f.mv === 'roca') { const sp = rockSpr(f.hp > 2 ? 2 : 1); c.drawImage(sp.cv, f.x - sp.r, f.y - sp.r, sp.w, sp.w); }
    else if (f.mv === 'nucleo') { const b = 1 + Math.sin(t * 5 + f.ph) * 0.14; c.save(); c.globalAlpha = 0.2; c.fillStyle = '#ff8fa3'; c.beginPath(); c.arc(f.x, f.y, 25 * b, 0, 6.283); c.fill(); c.restore(); drone(f.x, f.y, f.r, false, fl); }
    else if (f.mv === 'rayo') {
      if (f.chg > 0) { const q = 1 - f.chg / 1.25; c.save(); c.globalAlpha = 0.12 + q * 0.28; c.fillStyle = '#ffd166'; c.fillRect(f.x - 14, f.y, 28, H - f.y); c.globalAlpha = 0.6; c.fillRect(f.x - 14, f.y, 1.6, H - f.y); c.fillRect(f.x + 12.4, f.y, 1.6, H - f.y); c.restore(); }
      else if (f.beam > 0) { c.save(); c.fillStyle = '#fff2c2'; c.fillRect(f.x - 12, f.y, 24, H - f.y); c.globalAlpha = 0.45; c.fillStyle = '#ffd166'; c.fillRect(f.x - 18, f.y, 36, H - f.y); c.restore(); }
      minerArt(f.x, f.y, 1, true, fl);
    }
    else if (f.mv === 'esc') { drone(f.x, f.y, f.r, true, fl); if (f.binv > 0) { const a = 0.4 + Math.sin(t * 7) * 0.18; c.strokeStyle = `rgba(92,225,230,${a.toFixed(2)})`; c.lineWidth = 3; c.beginPath(); c.arc(f.x, f.y, f.r + 9, 0, 6.283); c.stroke(); } }
    else if (f.mv === 'drn') drone(f.x, f.y, f.r, false, fl);
    else if (f.mv === 'caza') { alien(f.x, f.y, f.kind, Math.floor(t * 5) % 2, fl); c.strokeStyle = 'rgba(240,100,126,.35)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(f.x, f.y + 14); c.lineTo(f.x, H - 40); c.stroke(); }
    else if (f.mv === 'mina') minerArt(f.x, f.y, f.dir, false, fl);
    else if (f.mv === 'canon') minerArt(f.x, f.y, 1, true, fl);
    else if (M === 'vertical') f.big ? drone(f.x, f.y, f.r, true, fl) : alien(f.x, f.y, f.kind, Math.floor(t * 4) % 2, fl); }
  for (const u of pups) { const col = u.t === 'P' ? '#5ce1e6' : u.t === 'C' ? '#e9b949' : '#9b8afb', b = 1 + Math.sin(t * 6) * 0.08; c.save(); c.translate(u.x, u.y); c.scale(b, b);
    c.globalAlpha = 0.3; c.fillStyle = col; c.beginPath(); c.arc(0, 0, 17, 0, 6.283); c.fill(); c.globalAlpha = 1;
    c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.roundRect ? c.roundRect(-11, -11, 22, 22, 7) : c.rect(-11, -11, 22, 22); c.fill(); c.stroke();
    c.fillStyle = OUT; c.beginPath(); if (u.t === 'C') { c.arc(0, 0, 6.4, 0, 6.283); c.rect(-1.6, -9.5, 3.2, 4); c.rect(-9.5, -1.6, 4, 3.2); c.rect(5.5, -1.6, 4, 3.2); } else if (u.t === 'P') { for (const dx of [-4, 4]) { c.moveTo(dx, -7); c.lineTo(dx + 4, 0); c.lineTo(dx - 4, 0); c.closePath(); c.rect(dx - 1.5, 0, 3, 6); } } else { c.moveTo(0, -7); c.lineTo(6, -4); c.lineTo(5, 3); c.lineTo(0, 7); c.lineTo(-5, 3); c.lineTo(-6, -4); c.closePath(); } c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(-8, -8, 10, 2.5); c.restore(); }
  // balas con brillo: sprites precalculados (shadowBlur en cada bala cuesta un desenfoque por figura y frame)
  const sh = gspr('s'); for (const s of shots) c.drawImage(sh.cv, s.x + sh.o, s.y - 1 + sh.q, sh.w, sh.h);
  const ez = gspr('z'), er = gspr(M === 'bullethell' ? 'R' : 'r'); for (const e of eb) { if (e.mine || e.bomb) { mineArt(e.x, e.y); continue; } if (e.zig) c.drawImage(ez.cv, e.x + (Math.floor(e.y / 6) % 2 ? 2 : -2) + ez.o, e.y + ez.q, ez.w, ez.h); else c.drawImage(er.cv, e.x + er.o, e.y + er.q, er.w, er.h); }
  if (k.st === 'play' && !(inv > 0 && Math.floor(inv * 10) % 2)) { ship(p.x, p.y, 1, k.clamp(p.tilt, -1.5, 1.5)); if (shield > 0) { c.strokeStyle = `rgba(155,138,251,${0.5 + Math.sin(t * 8) * 0.2})`; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 26, 0, 6.283); c.stroke(); } if (M === 'bullethell') { c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, 3, 0, 6.283); c.fill(); } }
  label(String(Math.floor(score)), 12, 8, 22, '#fff'); for (let i = 0; i < lives; i++) ship(W - 18 - i * 22, 22, 0.55, 0);
  if (M === 'vertical' && power > 1) for (let i = 1; i < power; i++) { c.beginPath(); c.moveTo(18 + (i - 1) * 16, HANDV ? 50 : 36); c.lineTo(25 + (i - 1) * 16, HANDV ? 61 : 47); c.lineTo(11 + (i - 1) * 16, HANDV ? 61 : 47); c.closePath(); ART.fillOut(c, '#5ce1e6', 2); }
  if (HANDV) label(`Oleada ${wave}/${WV.length}`, 12, 34, 12, '#a097ff');
  if (SD && k.st === 'play') {
    const yy = power > 1 ? 66 : 50, q = k.clamp(score / Math.max(1, objPt), 0, 1);
    if (objPt) { label(`★★ ${objPt}`, 12, yy, 12, q >= 1 ? '#4cc38a' : '#a097ff');
      ART.rr(c, 92, yy + 1, 84, 8, 4); ART.fillOut(c, 'rgba(12,10,24,.65)', 1.5);
      c.fillStyle = q >= 1 ? '#4cc38a' : '#e9b949'; ART.rr(c, 93, yy + 2, 82 * q, 6, 3); c.fill(); }
    if (capN) label(`Cáps. ${capGot}/${capN}`, W - 12, yy, 12, capGot >= capN ? '#4cc38a' : '#a097ff', 'right');
  }
  if (HAND && !PI) label(`Nivel ${wave}/${HAND.length}`, 12, H - 22, 13, '#a097ff');   /* abajo a la izquierda: el OVNI cruza por arriba y las vidas ocupan la derecha */
  if (PI) {
    label(`Nivel ${wave}/${HAND.length}${piNP > 1 ? ` · ola ${piPh + 1}/${piNP}` : ''}`, 12, H - 22, 13, '#a097ff');
    if (k.st === 'play') {
      const left = tgt - lvT, dos = left >= 0;
      label(dos ? `★★ ${Math.ceil(left)} s` : '★★ perdida', 12, H - 40, 12, !dos ? '#ff8fa3' : left > 8 ? '#e9b949' : '#ffb347');
      if (piUfoN) label(`OVNI ${piUfoGot}/${piUfoN}`, W - 12, H - 40, 12, piUfoGot >= piUfoN ? '#4cc38a' : '#a097ff', 'right');
      label(piHurt ? 'tocado' : 'intacto', W - 12, H - 22, 12, piHurt ? '#ff8fa3' : '#4cc38a', 'right');
      const q = k.clamp((piKill + piCur - piHits()) / Math.max(1, piTot), 0, 1);   /* olas limpiadas + lo hecho en la actual */
      ART.rr(c, W / 2 - 62, H - 20, 124, 8, 4); ART.fillOut(c, 'rgba(12,10,24,.65)', 1.5);
      c.fillStyle = '#6e62f5'; ART.rr(c, W / 2 - 61, H - 19, 122 * q, 6, 3); c.fill();
      if (mult > 1) label(`x${mult}`, W / 2, H - 40, 16, '#ffd166', 'center');
    }
  }
  if (bannerT > 0 && k.st === 'play') { c.globalAlpha = Math.min(1, bannerT); label(banner, W / 2, H * 0.42, 28, '#fff', 'center', W - 28); if (banner2) label(banner2, W / 2, H * 0.42 + 34, 14, '#a097ff', 'center', W - 28); c.globalAlpha = 1; }
});
/* ================================================================ modo 'coop': invasores a dúo
   Dos naves en la franja baja (8 direcciones), escudo de energía compartido (un impacto gasta 25),
   enlace entre naves cercanas que absorbe balas, rescate de la nave caída (acércate 1,2 s) o reaparición
   a los 6 s con la reserva común. La partida acaba si caen las dos a la vez o la flota llega a los búnkeres. */
if (M === 'coop') {
  const BY = H - 128, TOP = H - 74, BOT = H - 22, LINK = 125;
  let ships, shE, shT, reserve, fox, foy, divT, cpl, kills;
  const coopBunkers = () => { bunkers = []; for (let b = 0; b < 4; b++) { const bx = 58 + b * 112, by = BY; for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) { if ((y === 4 && x > 2 && x < 6) || (y === 0 && (x === 0 || x === 8))) continue; bunkers.push({ x: bx + x * 5, y: by + y * 5 }); } } };
  const mkShips = () => { cpl = k.players(2); ships = cpl.map((q, i) => ({ p: q.p, x: W / 2 + (i ? 60 : -60), y: BOT - 14, tilt: 0, cool: 0, inv: 0, down: false, rt: 0, help: 0, cpu: q.cpu, col: q.color, name: q.name, tx: W / 2, tt: 0 })); };
  const syncShips = () => { cpl = k.players(2); ships.forEach((s, i) => { s.cpu = cpl[i].cpu; s.col = cpl[i].color; s.name = cpl[i].name; }); };
  const coopWave = () => {
    wave++; foes = []; calm = wave === 1 ? 5 : 2.2; fox = 0; foy = 0; dirX = 1; divT = wave === 1 ? 7 : 3.5;
    const rows = Math.min(5, 3 + Math.floor((wave + 1) / 3)), cols = 8;
    for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) foes.push({ gx: 58 + i * 48, gy: 66 + r * 30, x: 58 + i * 48, y: 66 + r * 30, r: 12, hp: r === 0 && wave > 2 ? 2 : 1, pts: [30, 20, 20, 10, 10][r], kind: r < 1 ? 1 : r < 3 ? 0 : 2, fr: 0, dive: 0 });
    if (wave === 1 || wave % 3 === 1) coopBunkers();
    for (const s of ships) if (s.down) { s.down = false; s.inv = 2; s.x = k.clamp(s.x, 20, W - 20); s.y = BOT - 14; }
    if (wave > 1) { reserve = Math.min(5, reserve + 1); shE = Math.min(100, shE + 35); }
    msg(`Oleada ${wave}`);
  };
  function coopReset() { t = 0; pt = 0; score = 0; wave = 0; shots = []; eb = []; pups = []; shE = 100; shT = 0; reserve = 3 + k.D.life; kills = [0, 0]; stars = Array.from({ length: 70 }, () => ({ x: k.rnd(0, W), y: k.rnd(0, H), z: k.rnd(0.2, 1) })); mkShips(); coopWave(); }
  k.onParty = () => { if (k.st !== 'play') coopReset(); else syncShips(); };
  coopReset(); k.show(CFG.title, CFG.help);
  k.onDif = () => { if (k.st !== 'play') coopReset(); };
  window.__coop = (kill) => (kill && ships.forEach((s) => { s.inv = 0; shE = 0; hitShip(s); }), { ships: ships.map((s) => ({ x: s.x, y: s.y, down: s.down, cpu: s.cpu, name: s.name })), shE, reserve, wave, score, foes: foes.length, eb: eb.length, kills }); /* pruebas */
  const alive = () => ships.filter((s) => !s.down);
  function gameOver(why) { const nm = ships.map((s, i) => `${s.name} ${kills[i]}`).join(' · '); k.lose(CFG.id, Math.floor(score), why, `Oleada ${wave} · derribos: ${nm}`); }
  function hitShip(s) {
    if (s.down || s.inv > 0) return;
    shT = 2.2;
    if (shE >= 25) { shE -= 25; s.inv = 0.8 / k.D.dmg; k.sfx('hit'); k.burst(s.x, s.y, '#5ce1e6', 18, 160); k.flash('rgba(92,225,230,.18)'); return; }
    s.down = true; s.rt = 6; s.help = 0; k.burst(s.x, s.y, '#ffb347', 34, 220); k.sfx('explode'); k.shake(8); k.flash('rgba(255,80,90,.3)');
    if (!alive().length) gameOver('Escuadrón abatido');
  }
  function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, q = k.clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1), 0, 1); return Math.hypot(px - ax - vx * q, py - ay - vy * q); }
  /* aliado CPU: se coloca bajo la columna más baja (separado del compañero), esquiva balas y rescata */
  function allyInput(s, o, dt) {
    let tx = s.x, ty = BOT - 14, fire = false;
    if (o.down) { tx = o.x; ty = o.y; }
    else {
      s.tt -= dt;
      if (s.tt <= 0) { s.tt = k.rnd(0.35, 0.8); const cand = foes.filter((f) => Math.abs(f.x - o.x) > 50); const f = cand.length ? cand.reduce((a, b) => (Math.abs(b.x - s.x) + (H - b.y) * 0.6 < Math.abs(a.x - s.x) + (H - a.y) * 0.6 ? b : a)) : foes[0]; s.tx = f ? f.x : W / 2; }
      tx = s.tx; if (Math.abs(s.x - o.x) < 40) tx += s.x < o.x ? -50 : 50;
      fire = foes.some((f) => Math.abs(f.x - s.x) < 16);
    }
    for (const e of eb) if (e.y < s.y && e.y > s.y - 110 && Math.abs(e.x - s.x) < 20) { tx = s.x + (e.x > s.x ? -60 : 60); ty = BOT - 4; }
    for (const f of foes) if (f.dive && Math.hypot(f.x - s.x, f.y - s.y) < 70) tx = s.x + (f.x > s.x ? -70 : 70);
    const dx = tx - s.x, dy = ty - s.y; return { x: Math.abs(dx) > 6 ? Math.sign(dx) : 0, y: Math.abs(dy) > 6 ? Math.sign(dy) : 0, fire };
  }
  k.run((dt) => {
    t += dt; for (const s of stars) { s.y += (20 + s.z * 90) * dt; if (s.y > H) { s.y = 0; s.x = k.rnd(0, W); } }
    bannerT -= dt;
    if (!k.gate(coopReset)) return;
    pt += dt; calm -= dt; const D = ease(Math.min(1, (wave - 1) / 12)), sp = 230;
    /* naves */
    ships.forEach((s, i) => {
      const o = ships[1 - i]; s.inv -= dt; s.cool -= dt;
      if (s.down) {
        s.rt -= dt; const near = !o.down && Math.hypot(o.x - s.x, o.y - s.y) < 38; s.help = near ? s.help + dt : Math.max(0, s.help - dt * 0.5);
        if (s.help >= 1.2) { s.down = false; s.inv = 2; k.sfx('coin'); k.float('¡Rescatado!', s.x, s.y - 26, '#5ce1e6'); }
        else if (s.rt <= 0 && reserve > 0) { reserve--; s.down = false; s.inv = 2; s.x = W / 2; s.y = BOT - 14; k.sfx('start'); }
        return;
      }
      let ix = 0, iy = 0, fire = false; const ox = s.x;
      if (s.cpu) { const a = allyInput(s, o, dt); ix = a.x; iy = a.y; fire = a.fire; }
      else { const d = k.pdir(s.p); ix = d.x; iy = d.y; fire = k.pheld(s.p, 'a');
        if (s.p === 0 && k.ptr.down) { s.x += (k.ptr.x - s.x) * Math.min(1, dt * 22); s.y += (k.ptr.y - 60 - s.y) * Math.min(1, dt * 22); fire = true; } }
      const m = ix && iy ? 0.7071 : 1; s.x += ix * sp * m * dt; s.y += iy * sp * m * dt;
      s.x = k.clamp(s.x, 16, W - 16); s.y = k.clamp(s.y, TOP, BOT); s.tilt += (((s.x - ox) / Math.max(dt, 0.001)) / 300 - s.tilt) * Math.min(1, dt * 10);
      if (fire && s.cool <= 0 && shots.filter((q) => q.o === i).length < 3) { s.cool = 0.32; shots.push({ x: s.x, y: s.y - 16, vx: 0, o: i }); k.sfx('shoot'); }
    });
    shT -= dt; if (shT <= 0) shE = Math.min(100, shE + dt * 7);
    for (const s of shots) s.y -= 540 * dt;
    /* flota */
    const form = foes.filter((f) => !f.dive), n = foes.length, spd = (lerp(14, 30, D) + (40 - Math.min(40, n)) * 1.6) * k.D.spd;
    fox += dirX * spd * dt;
    let lo = 1e9, hi = -1e9, low = 0; for (const f of form) { lo = Math.min(lo, f.gx + fox); hi = Math.max(hi, f.gx + fox); low = Math.max(low, f.gy + foy); }
    if (form.length && (lo < 16 || hi > W - 16)) { dirX *= -1; fox += dirX * 3; foy += 8; if (low + 8 > BY - 10) return gameOver('La flota llegó a la base'); }
    const fr = Math.floor(t * (1 + (40 - Math.min(40, n)) / 12)) % 2;
    for (const f of foes) { f.fr = fr;
      if (!f.dive) { f.x = f.gx + fox; f.y = f.gy + foy; continue; }
      f.dt += dt;
      if (f.dive === 1) { const tg = ships[f.tg]; const ax = (tg && !tg.down ? tg.x : W / 2) - f.x; f.vx += Math.sign(ax) * 140 * dt; f.vx = k.clamp(f.vx, -120, 120); f.x += (f.vx + Math.sin(f.dt * 4) * 60) * dt; f.y += lerp(110, 170, D) * k.D.spd * dt;
        if (f.shots > 0 && f.y > 90 && f.y < BY - 30 && Math.random() < dt * 1.4 * k.D.rate) { f.shots--; eb.push({ x: f.x, y: f.y + 10, vx: 0, vy: lerp(150, 200, D) * k.D.spd, zig: 1 }); }
        if (f.y > H + 20) { f.dive = 2; f.y = -20; } }
      else { const hx = f.gx + fox, hy = f.gy + foy; f.x += (hx - f.x) * Math.min(1, dt * 3); f.y += (hy - f.y) * Math.min(1, dt * 3); if (Math.hypot(hx - f.x, hy - f.y) < 3) f.dive = 0; }
    }
    if (calm <= 0) {
      divT -= dt;
      if (divT <= 0 && form.length > 2) { divT = lerp(5, 2, D) * k.rnd(0.8, 1.3) / k.D.rate; const f = k.pick(form); f.dive = 1; f.dt = 0; f.vx = 0; f.shots = wave > 2 ? 1 : 0; f.tg = k.pick(alive().map((s) => ships.indexOf(s))) || 0; k.sfx('pop'); }
      if (form.length && Math.random() < dt * lerp(0.55, 2.0, D) * k.D.rate) { const cols = {}; for (const f of form) { const key = Math.round(f.x / 10); if (!cols[key] || cols[key].y < f.y) cols[key] = f; } const f = k.pick(Object.values(cols)); eb.push({ x: f.x, y: f.y + 10, vx: 0, vy: lerp(125, 200, D) * k.D.spd, zig: 1 }); }
    }
    /* impactos */
    for (const s of shots) {
      for (const b of bunkers) if (!b.dead && !s.dead && s.x > b.x - 1 && s.x < b.x + 6 && s.y < b.y + 6 && s.y + 540 * dt > b.y) { b.dead = true; s.dead = true; }
      for (const f of foes) if (!f.dead && !s.dead && Math.hypot(s.x - f.x, s.y - f.y) < f.r + 4) { s.dead = true; f.flash = 0.06; if (--f.hp <= 0) { f.dead = true; const pts = f.pts * (f.dive ? 2 : 1); score += pts; kills[s.o]++; k.burst(f.x, f.y, EC[f.kind % 4], 14, 160); k.sfx('hit'); if (f.dive) k.float(`+${pts}`, f.x, f.y, '#e9b949'); if (Math.random() < 0.06) pups.push({ x: f.x, y: f.y, t: 'S' }); } }
    }
    const [a0, a1] = ships, linked = !a0.down && !a1.down && Math.hypot(a0.x - a1.x, a0.y - a1.y) < LINK;
    for (const e of eb) { e.x += e.vx * dt; e.y += e.vy * dt;
      for (const b of bunkers) if (!b.dead && !e.dead && e.x > b.x - 2 && e.x < b.x + 7 && e.y > b.y && e.y - e.vy * dt < b.y + 6) { b.dead = true; e.dead = true; k.burst(e.x, e.y, '#4cc38a', 3, 60); }
      if (!e.dead && linked && shE >= 4 && segDist(e.x, e.y, a0.x, a0.y - 6, a1.x, a1.y - 6) < 7) { e.dead = true; shE -= 4; shT = 1; k.burst(e.x, e.y, '#5ce1e6', 6, 90); k.sfx('click'); }
      if (!e.dead) for (const s of ships) if (!s.down && Math.hypot(e.x - s.x, e.y - s.y) < 10) { e.dead = true; hitShip(s); } }
    for (const f of foes) { f.flash = (f.flash || 0) - dt; if (f.dead) continue; for (const s of ships) if (!s.down && Math.hypot(f.x - s.x, f.y - s.y) < f.r + 10) { f.dead = true; k.burst(f.x, f.y, EC[f.kind % 4], 14, 160); hitShip(s); }
      for (const b of bunkers) if (!b.dead && !f.dive && Math.abs(f.x - b.x) < 14 && Math.abs(f.y - b.y) < 10) b.dead = true; }
    for (const u of pups) { u.y += 80 * dt; for (const s of ships) if (!u.dead && !s.down && Math.hypot(u.x - s.x, u.y - s.y) < 26) { u.dead = true; shE = Math.min(100, shE + 40); k.sfx('coin'); k.float('¡Escudo +40!', s.x, s.y - 30, '#5ce1e6'); } }
    shots = shots.filter((s) => !s.dead && s.y > -10); eb = eb.filter((e) => !e.dead && e.y < H + 20); foes = foes.filter((f) => !f.dead); pups = pups.filter((u) => !u.dead && u.y < H + 20); bunkers = bunkers.filter((b) => !b.dead);
    if (k.st === 'play' && !foes.length) { score += 200 * wave; k.float(`+${200 * wave}`, W / 2, H * 0.45, '#e9b949'); k.sfx('win'); k.confetti(); coopWave(); }
  }, () => {
    background();
      if (bunkers) drawBunkers();
    for (const f of foes) alien(f.x, f.y, f.kind, f.fr, f.flash > 0);
    for (const f of foes) if (f.hp > 1) { c.strokeStyle = '#e9b949'; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, 15, 3.6, 5.8); c.stroke(); }
    const [a0, a1] = ships;
    if (!a0.down && !a1.down) { const d = Math.hypot(a0.x - a1.x, a0.y - a1.y); if (d < LINK && shE >= 4) { const al = 0.35 + 0.25 * Math.sin(t * 10);
      c.lineCap = 'round'; c.strokeStyle = `rgba(92,225,230,${al * 0.5})`; c.lineWidth = 8; c.beginPath(); c.moveTo(a0.x, a0.y - 6); c.lineTo(a1.x, a1.y - 6); c.stroke();
      c.strokeStyle = `rgba(220,255,255,${al + 0.3})`; c.lineWidth = 2; c.beginPath(); c.moveTo(a0.x, a0.y - 6); for (let i = 1; i < 8; i++) { const q = i / 8; c.lineTo(lerp(a0.x, a1.x, q), lerp(a0.y, a1.y, q) - 6 + Math.sin(t * 30 + i * 2) * 3); } c.lineTo(a1.x, a1.y - 6); c.stroke(); } }
    for (const u of pups) { const b = 1 + Math.sin(t * 6) * 0.08; c.save(); c.translate(u.x, u.y); c.scale(b, b); c.globalAlpha = 0.3; c.fillStyle = '#5ce1e6'; c.beginPath(); c.arc(0, 0, 17, 0, 6.283); c.fill(); c.globalAlpha = 1;
      ART.rr(c, -11, -11, 22, 22, 7); ART.fillOut(c, '#5ce1e6', 2.5); c.fillStyle = OUT; c.beginPath(); c.moveTo(0, -7); c.lineTo(6, -4); c.lineTo(5, 3); c.lineTo(0, 7); c.lineTo(-5, 3); c.lineTo(-6, -4); c.closePath(); c.fill(); c.restore(); }
    const sh = gspr('s'); for (const s of shots) c.drawImage(sh.cv, s.x + sh.o, s.y - 1 + sh.q, sh.w, sh.h);
    const ez = gspr('z'); for (const e of eb) c.drawImage(ez.cv, e.x + (Math.floor(e.y / 6) % 2 ? 2 : -2) + ez.o, e.y + ez.q, ez.w, ez.h);
    ships.forEach((s, i) => {
      if (s.down) { c.globalAlpha = 0.45; ship(s.x, s.y, 0.9, 0, '#555a70'); c.globalAlpha = 1;
        c.strokeStyle = 'rgba(12,10,24,.7)'; c.lineWidth = 5; c.beginPath(); c.arc(s.x, s.y, 24, 0, 6.283); c.stroke();
        c.strokeStyle = s.help > 0 ? '#5ce1e6' : s.col; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, 24, -1.571, -1.571 + 6.283 * (s.help > 0 ? s.help / 1.2 : Math.max(0, 1 - s.rt / 6))); c.stroke();
        label(s.help > 0 ? 'Rescatando' : reserve > 0 ? String(Math.ceil(s.rt)) : '¡Rescátame!', s.x, s.y - 44, 12, '#fff', 'center'); return; }
      if (k.st === 'play' && s.inv > 0 && Math.floor(s.inv * 10) % 2) return;
      ship(s.x, s.y, 1, k.clamp(s.tilt, -1.5, 1.5), s.col);
      if (s.inv > 0 && k.st === 'play') { c.strokeStyle = 'rgba(92,225,230,.55)'; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, 22, 0, 6.283); c.stroke(); }
      c.fillStyle = s.col; c.beginPath(); c.moveTo(s.x - 5, s.y + 22); c.lineTo(s.x + 5, s.y + 22); c.lineTo(s.x, s.y + 17); c.closePath(); ART.fillOut(c, s.col, 1.5);
      if (k.party || i === 1) label(s.cpu ? 'CPU' : s.name, s.x, s.y + 22, 10, s.col, 'center');
    });
    label(String(Math.floor(score)), 12, 8, 22, '#fff'); label(`Oleada ${wave}`, 12, 34, 12, '#a097ff');
    const bw = 150, bx = W / 2 - bw / 2; ART.rr(c, bx - 2, 10, bw + 4, 12, 6); ART.fillOut(c, 'rgba(12,10,24,.75)', 2);
    c.fillStyle = shE >= 25 ? '#5ce1e6' : '#f0647e'; ART.rr(c, bx, 12, bw * shE / 100, 8, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(bx + 3, 13, Math.max(0, bw * shE / 100 - 6), 1.5);
    c.fillStyle = 'rgba(12,10,24,.6)'; for (let i = 1; i < 4; i++) c.fillRect(bx + bw * i / 4 - 1, 12, 2, 8);
    label('Escudo', W / 2, 25, 11, '#bff6ff', 'center');
    for (let i = 0; i < reserve; i++) ship(96 + i * 18, 40, 0.45, 0);
    if (bannerT > 0 && k.st === 'play') { c.globalAlpha = Math.min(1, bannerT); label(banner, W / 2, H * 0.4, 28, '#fff', 'center'); c.globalAlpha = 1; }
  });
}
