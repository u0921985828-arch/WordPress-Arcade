/* TRIVIA con pulsador para 1–4 (modo tele). CFG.mode: 'quiz' (Trivia de Sobremesa: 4 opciones, 6 categorías con ruleta)
 * | 'tf' (Verdad o Bulo: verdadero/falso con explicación tras responder). Rondas de 10 preguntas y podio.
 * Datos propios fuera del motor (fetch diferido): ../_data/trivia-es.json y ../_data/verdad-es.json.
 * Entrada: joystick elige (A/B/C/D en rejilla 2×2, o ← Verdad / → Bulo) y A confirma; en un solo dispositivo también se toca la
 * respuesta. En la tele, si hay canal privado, cada móvil recibe además las opciones para responder a escondidas (k.priv).
 * Puntos: acierto 100 + hasta 100 por rapidez (la última pregunta vale doble); en Verdad o Bulo el fallo resta 50.
 * CPU: acierta según la dificultad de la pregunta y mejora con las victorias humanas guardadas en localStorage (cpu:<id>). */
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
const NM = CFG.mode || 'quiz', NEW = NM === 'mas' || NM === 'mapa' || NM === 'banderas' || NM === 'calculo';
const TF = NM === 'tf', OUT = ART.OUT, TAU = 6.2832;
const LAND = innerWidth >= innerHeight * 0.98;
const W = LAND ? 800 : 450, H = LAND ? 450 : 800;
const k = Kit({ w: W, h: H, title: CFG.title, bg: TF ? '#14233a' : '#1b1640' }), c = k.ctx;
const FONT = (s, wt) => `${wt || 800} ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
/* dificultad: las preguntas del mazo bajan un escalón en fácil y suben uno en difícil (1–3) */
const DSH = (d) => k.clamp(d + (k.dif === 0 ? -1 : k.dif === 2 ? 1 : 0), 1, 3);
const NQ = 10, TQ = (TF ? 15 : 22) * k.D.time, /* 1.23: más tiempo (antes 10/15 s) · k.D.time: ×1,25 fácil, ×0,85 difícil */ SEATS = 4;
const OPC = ['#ff6b6b', '#4fb3ff', '#ffc94a', '#6fd66f'], LET = ['A', 'B', 'C', 'D'];
let CPU = 0; try { CPU = Math.min(8, +localStorage.getItem('cpu:' + CFG.id) || 0); } catch (e) { /* sin almacenamiento */ }

/* ---------- Disposición (apaisado para la tele, vertical para el móvil) ---------- */
const L = LAND
  ? { top: 10, card: [24, 58, 752, 128], opt: (i) => [24 + (i % 2) * 384, 198 + (i >> 1) * 84, 368, 70], tfo: (i) => [24 + i * 384, 198, 368, 152], lec: (i) => [24 + i * 190, 370, 182, 76], fs: 25, of: 21 }
  : { top: 12, card: [16, 62, 418, 262], opt: (i) => [16 + (i % 2) * 215, 340 + (i >> 1) * 142, 203, 130], tfo: (i) => [16 + i * 215, 340, 203, 272], lec: (i) => [16 + i * 106, 668, 100, 118], fs: 25, of: 19 };

/* ---------- Datos ---------- */
let DATA = null, LOADERR = false;
const FALLBACK = TF
  ? { s: [{ v: true, d: 1, t: 'El Sol es una estrella.', e: 'Es la estrella más cercana a la Tierra.' }, { v: false, d: 1, t: 'Las arañas son insectos.', e: 'Son arácnidos: tienen ocho patas.' }] }
  : { cats: { geo: { n: 'Geografía', col: '#3fb6ea' } }, q: [{ c: 'geo', d: 1, q: '¿Cuál es la capital de España?', a: ['Madrid', 'Sevilla', 'Valencia', 'Bilbao'] }] };
if (!NEW) fetch(TF ? '../_data/verdad-es.json' : '../_data/trivia-es.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((d) => { DATA = d; }).catch(() => { DATA = FALLBACK; LOADERR = true; });
const SEENK = 'triv:seen:' + CFG.id;
function seenGet() { try { return JSON.parse(localStorage.getItem(SEENK) || '[]'); } catch (e) { return []; } }
function seenAdd(ids) { try { const s = seenGet().concat(ids).slice(-420); localStorage.setItem(SEENK, JSON.stringify(s)); } catch (e) { /* sin almacenamiento */ } }
/* Mazo de 10: arranque suave (dificultad 1), centro de dificultad 2 y final con 3; en quiz sin repetir categoría seguida. */
function deck() {
  const all = TF ? DATA.s : DATA.q, seen = new Set(seenGet()), plan = (TF ? [1, 1, 1, 2, 2, 2, 2, 2, 3, 3] : [1, 1, 1, 2, 2, 2, 2, 3, 2, 3]).map(DSH);
  const out = [], used = new Set();
  plan.forEach((d, n) => {
    const prevC = out.length ? out[out.length - 1].c : null;
    const ok = (i, strict) => !used.has(i) && (!strict || !seen.has(i)) && (all[i].d === d || (strict === 2 ? false : Math.abs(all[i].d - d) <= 1)) && (TF || all[i].c !== prevC || strict === 0);
    let pool = [];
    for (const lv of [2, 1, 0]) { pool = []; for (let i = 0; i < all.length; i++) if (lv === 2 ? ok(i, 2) && !seen.has(i) : lv === 1 ? ok(i, 1) : ok(i, 0) || !used.has(i)) pool.push(i); if (pool.length) break; }
    const i = pool.length ? k.pick(pool) : n % all.length; used.add(i);
    const src = all[i];
    if (TF) out.push({ id: i, d: src.d, t: src.t, v: src.v, e: src.e, n: 2, right: src.v ? 0 : 1 });
    else { const ord = k.shuffle([0, 1, 2, 3]); out.push({ id: i, d: src.d, c: src.c, t: src.q, opts: ord.map((j) => src.a[j]), right: ord.indexOf(0), n: 4 }); }
  });
  seenAdd(out.map((q) => q.id));
  return out;
}

/* ---------- Estado ---------- */
let Qs, qi, phase, pt, seat, started, wheelA, wheelFrom, wheelTo, revealT, lastTick, tickN, wrapCache = {};
function mkSeats() { return k.players(SEATS).map((pl) => ({ p: pl.p, score: 0, sel: -1, lock: false, lockT: 0, gain: 0, cpuT: 0, cpuPick: -1, streak: 0, ok: 0 })); }
function reset() { seat = mkSeats(); Qs = null; qi = -1; phase = 'wait'; pt = 0; started = false; }
function hum(p) { return k.human(p); }
function curQ() { return Qs && Qs[qi]; }
function beginQ() {
  qi++; pt = 0; tickN = 0;
  for (const s of seat) { s.sel = -1; s.lock = false; s.lockT = 0; s.gain = 0; s.cpuPick = -1; }
  const q = curQ();
  phase = TF ? 'ask' : 'wheel';
  if (!TF) { const keys = Object.keys(DATA.cats), idx = Math.max(0, keys.indexOf(q.c)); wheelFrom = wheelA || 0; wheelTo = Math.ceil(wheelFrom / TAU) * TAU + TAU * 2 + (-(idx + 0.5) * TAU / keys.length) + TAU; wheelA = wheelFrom; k.sfx('click'); }
  else { onAsk(); }
}
function onAsk() {
  phase = 'ask'; pt = 0; const q = curQ();
  const base = TF ? [0, 0.66, 0.6, 0.55][q.d] : [0, 0.52, 0.38, 0.26][q.d]; // 1.23: CPU acierta menos (antes 0.74/0.62/0.5 y 0.72/0.52/0.36; en V/F nunca bajo 0.55)
  for (const s of seat) if (!hum(s.p)) cpuPlan(s, q, base);
  if (k.privOK) for (const s of seat) if (hum(s.p)) k.priv(s.p, { title: `${TF ? 'Afirmación' : 'Pregunta'} ${qi + 1}/${NQ}`, text: q.t, items: optLabels(q).map((lb, i) => ({ v: i, label: TF ? lb : LET[i], sub: TF ? '' : lb, col: TF ? (i ? '#ff6b6b' : '#6fd66f') : OPC[i] })) });
}
/* Respuesta y tiempo de la CPU (también si alguien se va a mitad de pregunta y la CPU ocupa su sitio) */
function cpuPlan(s, q, base) {
  if (base == null) base = TF ? [0, 0.66, 0.6, 0.55][q.d] : [0, 0.52, 0.38, 0.26][q.d];
  const pc = Math.min(0.85, Math.max(0.05, base + CPU * 0.015 + k.D.cpu * 0.08 + k.rnd(-0.05, 0.05)));
  s.cpuPick = Math.random() < pc ? q.right : k.pick([...Array(q.n).keys()].filter((i) => i !== q.right));
  s.cpuT = Math.max(pt + 1, k.rnd(TF ? 1.8 : 3, TQ * (0.55 + Math.random() * 0.3)));
}
function optLabels(q) { return TF ? ['Verdad', 'Bulo'] : q.opts; }
function lock(s, i) {
  if (s.lock || phase !== 'ask') return;
  s.sel = i; s.lock = true; s.lockT = pt; k.sfx('pop');
  const [x, y, w] = L.lec(seat.indexOf(s)); k.burst(x + w / 2, y + 10, k.pcol(s.p), 10, 120);
  if (hum(s.p) && k.privOK) k.priv(s.p, { title: '¡Respuesta enviada!', text: TF ? (i ? 'Bulo' : 'Verdad') : LET[i] + ' · ' + curQ().opts[i], items: [] });
}
function reveal() {
  phase = 'reveal'; pt = 0; const q = curQ(), dbl = !TF && qi === NQ - 1 ? 2 : 1;
  let anyHumOk = false, anyHum = false;
  seat.forEach((s, n) => {
    const [x, y, w] = L.lec(n);
    if (s.lock && s.sel === q.right) {
      const fr = Math.max(0, 1 - s.lockT / TQ); s.gain = Math.round((100 + 100 * fr) * dbl / 5) * 5; s.streak++; s.ok++;
      if (s.streak >= 3) s.gain += 25;
      k.float('+' + s.gain, x + w / 2, y - 6, '#7cf7a0');
      if (hum(s.p)) anyHumOk = true;
    } else {
      s.streak = 0; s.gain = TF && s.lock ? -Math.min(50, s.score) : 0;
      if (s.gain) k.float(String(s.gain), x + w / 2, y - 6, '#ff8a8a');
    }
    if (hum(s.p)) anyHum = true;
    s.score += s.gain;
  });
  const r = optRect(q.right); k.burst(r[0] + r[2] / 2, r[1] + r[3] / 2, '#7cf7a0', 26, 220);
  if (anyHum) k.sfx(anyHumOk ? 'coin' : 'hurt'); else k.sfx('pop');
  if (anyHum && !anyHumOk) k.shake(4);
  if (k.privOK) for (const s of seat) if (hum(s.p)) k.priv(s.p, { title: s.sel === q.right ? '¡Correcto!' : s.lock ? 'Fallaste' : 'Sin respuesta', text: TF ? (q.v ? 'Verdad. ' : 'Bulo. ') + q.e : 'Era: ' + q.opts[q.right], items: [] });
}
function finish() {
  const rows = seat.map((s) => ({ p: s.p, score: s.score }));
  const top = rows.slice().sort((a, b) => b.score - a.score)[0];
  if (hum(top.p) && top.score > 0) { CPU = Math.min(8, CPU + 1); try { localStorage.setItem('cpu:' + CFG.id, CPU); } catch (e) { /* sin almacenamiento */ } }
  const me = seat[0]; if (!k.party) k.best(CFG.id, me.score);
  if (k.privOK) for (const s of seat) if (hum(s.p)) k.priv(s.p, null);
  const aciertos = k.party ? '' : ` · Aciertos: ${me.ok}/${NQ}`;
  const srt = rows.slice().sort((a, b) => b.score - a.score), solo1 = !k.party && srt[0].p === 0 && (srt.length < 2 || srt[1].score < srt[0].score);
  k.podium(rows, { head: solo1 ? '¡Has ganado!' : undefined, go: `${k.party ? '' : 'Tu récord: ' + k.best(CFG.id, 0) + aciertos + '<br>'}Toca para otra ronda` });
}
function optRect(i) { return TF ? L.tfo(i) : L.opt(i); }

/* ---------- Entrada ---------- */
function moveSel(s, d, n) {
  if (TF) { if (d.x < 0) s.sel = 0; else if (d.x > 0) s.sel = 1; else if (s.sel < 0 && d.y) s.sel = 0; return; }
  let i = s.sel < 0 ? 0 : s.sel, cx = i % 2, cy = i >> 1;
  if (s.sel < 0) { cx = d.x > 0 ? 1 : 0; cy = d.y > 0 ? 1 : 0; } else { if (d.x) cx = d.x > 0 ? 1 : 0; if (d.y) cy = d.y > 0 ? 1 : 0; }
  s.sel = Math.min(n - 1, cy * 2 + cx);
}
k.onPick = (p, v) => { const s = seat && seat.find((x) => x.p === p); if (s && phase === 'ask' && hum(p) && typeof v === 'number') lock(s, v); };
k.onParty = () => { if (k.st !== 'play') reset(); };

/* ---------- Bucle ---------- */
if (NEW) NEWGAME(); else {
reset();
k.show(CFG.title, TF
  ? 'Lee la afirmación y decide si es verdad o un bulo. Acertar rápido suma más; fallar resta. Tras cada respuesta verás la explicación.'
  : 'Diez preguntas de seis categorías. Elige A, B, C o D antes que tus rivales: acertar rápido suma más y la última vale doble.');
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (!DATA) return;
  if (!started) { started = true; seat = mkSeats(); Qs = deck(); k.count(3); return; }
  if (k.counting()) return;
  if (phase === 'wait') { beginQ(); return; }
  pt += dt;
  const q = curQ();
  if (phase === 'wheel') {
    const e = Math.min(1, pt / 1.5), ez = 1 - Math.pow(1 - e, 3); const prev = wheelA; wheelA = wheelFrom + (wheelTo - wheelFrom) * ez;
    if (Math.floor(prev / (TAU / 6)) !== Math.floor(wheelA / (TAU / 6)) && e < 1) k.sfx('click');
    if (pt > 2.1 || (pt > 0.5 && (k.hit.has('a') || k.ptr.hit) && !k.party)) { wheelA = wheelTo; onAsk(); }
    return;
  }
  if (phase === 'ask') {
    seat.forEach((s) => {
      if (s.lock) return;
      if (hum(s.p)) {
        const d = { x: (k.phit(s.p, 'right') ? 1 : 0) - (k.phit(s.p, 'left') ? 1 : 0), y: (k.phit(s.p, 'down') ? 1 : 0) - (k.phit(s.p, 'up') ? 1 : 0) };
        if (d.x || d.y) { moveSel(s, d, q.n); k.sfx('click'); }
        if (k.phit(s.p, 'a') && s.sel >= 0) lock(s, s.sel);
        else if (k.phit(s.p, 'a') && s.sel < 0) { s.sel = 0; k.sfx('click'); }
        if (s.p === 0 && !k.party && k.ptr.hit) for (let i = 0; i < q.n; i++) { const [x, y, w, h] = optRect(i); if (k.ptr.x >= x && k.ptr.x <= x + w && k.ptr.y >= y && k.ptr.y <= y + h) { lock(s, i); break; } }
      } else { if (s.cpuPick < 0) cpuPlan(s, q); if (pt >= s.cpuT) lock(s, s.cpuPick); }
    });
    const left = TQ - pt;
    if (left < 3.5 && Math.ceil(left) !== tickN) { tickN = Math.ceil(left); if (tickN > 0) k.sfx('tick'); }
    const humansIn = seat.filter((s) => hum(s.p));
    if (left <= 0 || seat.every((s) => s.lock) || (humansIn.length && humansIn.every((s) => s.lock) && seat.filter((s) => !s.lock).every((s) => s.cpuT - pt < 0.4))) reveal();
    return;
  }
  if (phase === 'reveal') {
    const dur = TF ? 5 : 3.2, skip = pt > 1.2 && !k.party && (k.hit.has('a') || k.ptr.hit);
    if (pt > dur || skip) { if (qi >= NQ - 1) { phase = 'end'; finish(); } else beginQ(); }
  }
}, draw);
}
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerWidth >= innerHeight * 0.98) !== LAND && k.st !== 'play') location.reload(); }, 400); });

/* ---------- Dibujo ---------- */
let bgC = null;
function stageBg() {
  if (bgC) return bgC;
  bgC = document.createElement('canvas'); bgC.width = W; bgC.height = H; const g = bgC.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, TF ? '#1d3656' : '#2a2066'); gr.addColorStop(0.62, TF ? '#132338' : '#18123f'); gr.addColorStop(1, TF ? '#0b1522' : '#0e0a28'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* telón lateral y rayos */
  for (let i = 0; i < 14; i++) { g.fillStyle = ART.alpha('#ffffff', 0.025); g.beginPath(); const a = -0.9 + i * 0.13; g.moveTo(W / 2, -40); g.lineTo(W / 2 + Math.tan(a) * H * 1.3 - 30, H); g.lineTo(W / 2 + Math.tan(a) * H * 1.3 + 30, H); g.fill(); }
  const fy = LAND ? 360 : 650; const fl = g.createLinearGradient(0, fy, 0, H); fl.addColorStop(0, TF ? '#20456b' : '#3b2a7a'); fl.addColorStop(1, TF ? '#0d1b2b' : '#140e33'); g.fillStyle = fl; g.fillRect(0, fy, W, H - fy);
  g.strokeStyle = ART.alpha('#ffffff', 0.07); g.lineWidth = 1; for (let x = -W; x < W * 2; x += 46) { g.beginPath(); g.moveTo(W / 2 + (x - W / 2) * 0.35, fy); g.lineTo(x, H); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = ART.alpha('#ffffff', 0.05 + Math.random() * 0.12); g.beginPath(); g.arc(Math.random() * W, Math.random() * fy * 0.9, Math.random() * 1.8 + 0.4, 0, TAU); g.fill(); }
  /* bombillas del marco */
  for (let x = 12; x < W; x += 28) { g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(x, 4, 3, 0, TAU); g.fill(); }
  return bgC;
}
function panel(x, y, w, h, r, fill, o) {
  o = o || {};
  c.save();
  if (!o.flat) { c.fillStyle = 'rgba(8,4,24,.45)'; ART.rr(c, x, y + (o.drop || 5), w, h, r); c.fill(); }
  /* §8: tres tonos planos con borde DURO (sin degradado), un solo contorno exterior */
  ART.rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill();
  c.lineWidth = o.lw || 3; c.strokeStyle = o.stroke || OUT; c.stroke();
  c.save(); ART.rr(c, x, y, w, h, r); c.clip();
  const bt = Math.min(9, h * 0.12), tt = Math.min(11, h * 0.16);
  c.fillStyle = ART.dark(fill, 0.17); c.fillRect(x, y + h - bt, w, bt);
  c.fillStyle = ART.lite(fill, 0.17); c.fillRect(x, y, w, tt);
  c.restore();
  c.restore();
}
function wrap(txt, maxW, size, wt) {
  const key = txt + '|' + maxW + '|' + size; if (wrapCache[key]) return wrapCache[key];
  c.font = FONT(size, wt); const words = txt.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return (wrapCache[key] = lines);
}
function fitText(txt, maxW, maxH, size, minSize, wt) { let s = size, ls; for (;;) { ls = wrap(txt, maxW, s, wt); if (ls.length * s * 1.18 <= maxH || s <= minSize) break; s -= 1; } return { ls, s }; }
function textBlock(txt, x, y, w, h, size, minSize, col, wt, align) {
  const { ls, s } = fitText(txt, w, h, size, minSize, wt); const lh = s * 1.18, y0 = y + h / 2 - (ls.length * lh) / 2 + lh / 2;
  c.font = FONT(s, wt); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.fillStyle = col;
  ls.forEach((l, i) => c.fillText(l, align === 'left' ? x : x + w / 2, y0 + i * lh));
}
function outlined(t, x, y, size, col, align, lw) { c.font = FONT(size, 900); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = lw || 5; c.strokeStyle = OUT; c.strokeText(t, x, y); c.fillStyle = col; c.fillText(t, x, y); }
function check(x, y, s, col) { c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = s * 0.42; c.beginPath(); c.moveTo(x - s * 0.5, y); c.lineTo(x - s * 0.12, y + s * 0.38); c.lineTo(x + s * 0.55, y - s * 0.42); c.stroke(); c.strokeStyle = col; c.lineWidth = s * 0.22; c.stroke(); c.restore(); }
function cross(x, y, s, col) { c.save(); c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = s * 0.42; c.beginPath(); c.moveTo(x - s * 0.42, y - s * 0.42); c.lineTo(x + s * 0.42, y + s * 0.42); c.moveTo(x + s * 0.42, y - s * 0.42); c.lineTo(x - s * 0.42, y + s * 0.42); c.stroke(); c.strokeStyle = col; c.lineWidth = s * 0.22; c.stroke(); c.restore(); }
function spot(t) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) { const a = Math.sin(t * 0.5 + i * 2.2) * 0.35, x0 = i ? W * 0.85 : W * 0.15; const g = c.createLinearGradient(x0, 0, x0 + Math.sin(a) * H, H); g.addColorStop(0, 'rgba(255,240,200,.10)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x0 - 8, 0); c.lineTo(x0 + 8, 0); c.lineTo(x0 + Math.sin(a) * H + 90, H); c.lineTo(x0 + Math.sin(a) * H - 90, H); c.fill(); }
  c.restore();
}
function wheel(cx, cy, r, ang) {
  const keys = Object.keys(DATA.cats), n = keys.length;
  c.save(); c.translate(cx, cy);
  c.fillStyle = 'rgba(8,4,24,.4)'; c.beginPath(); c.arc(0, 6, r + 6, 0, TAU); c.fill();
  c.rotate(ang);
  /* §8: la ruleta es UNA pieza — los sectores y el eje se leen por color, sin contornos interiores */
  const parts = keys.map((kk, i) => { const a0 = (i * TAU) / n - TAU / 4, a1 = a0 + TAU / n;
    return [(g) => { g.moveTo(0, 0); g.arc(0, 0, r, a0, a1); g.closePath(); }, DATA.cats[kk].col]; });
  parts.push([(g) => { g.moveTo(r * 0.22, 0); g.arc(0, 0, r * 0.22, 0, TAU); }, '#fff4d6']);
  unite8(c, parts, 2.4);
  keys.forEach((kk, i) => { const a0 = (i * TAU) / n - TAU / 4; c.save(); c.rotate(a0 + TAU / n / 2 + TAU / 4); c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(0, -r * 0.68, r * 0.1, 0, TAU); c.fill(); c.restore(); });
  c.restore();
  unite8(c, [[(g) => { g.moveTo(cx - 13, cy - r - 12); g.lineTo(cx + 13, cy - r - 12); g.lineTo(cx, cy - r + 12); g.closePath(); }, '#ffd36b', { dx: 1.6, dy: 1.6 }]], 1.6);
}
function catAt(ang) { const keys = Object.keys(DATA.cats), n = keys.length; let a = (-ang) % TAU; if (a < 0) a += TAU; return keys[Math.floor(a / (TAU / n)) % n]; }
function lectern(i, s, t) {
  const [x, y, w, h] = L.lec(i), col = k.pcol(s.p), pl = k.players(SEATS)[i], q = curQ(), rev = phase === 'reveal' || phase === 'end';
  const glow = s.lock && !rev; const up = s.lock ? 3 : 0;
  panel(x, y + 16, w, h - 16, 12, ART.dark(col, 0.45));
  c.fillStyle = col; c.fillRect(x + 3, y + 22, w - 6, 5);
  /* pulsador */
  const bx = x + w / 2, by = y + 18 + up, br = LAND ? 20 : 17;
  if (glow) { c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 10); c.fillStyle = col; c.beginPath(); c.arc(bx, by, br + 10, Math.PI, 0); c.fill(); c.restore(); }
  const dome = (g) => { g.moveTo(bx - br, by); g.arc(bx, by, br, Math.PI, 0); g.closePath(); };
  unite8(c, [[dome, s.lock ? col : ART.dark(col, 0.18), { dx: br * 0.16, dy: br * 0.16 }]], 1.6);
  shine8(c, bx - br * 0.34, by - br * 0.54, br * 0.3, br * 0.17, -0.5, 0.42);
  const nm = pl.cpu ? 'CPU' : k.party ? pl.name : 'Tú';
  if (LAND) {
    outlined(nm, x + 12, y + 44, 18, col, 'left', 4);
    outlined(String(s.score), x + w - 12, y + 44, 24, '#fff', 'right', 5);
    let st = s.lock ? (rev ? '' : 'Listo') : phase === 'ask' ? '…' : '';
    if (rev && q) st = s.lock ? (TF ? (s.sel ? 'Bulo' : 'Verdad') : 'Dijo ' + LET[s.sel]) : 'Sin respuesta';
    c.font = FONT(15, 700); c.textAlign = 'left'; c.fillStyle = '#e8e3ff'; c.fillText(st, x + 12, y + 66);
    if (rev && q && s.lock) (s.sel === q.right ? check : cross)(x + w - 18, y + 66, 16, s.sel === q.right ? '#7cf7a0' : '#ff6b6b');
    if (s.streak >= 3) { c.font = FONT(13, 800); c.textAlign = 'right'; c.fillStyle = '#ffd36b'; c.fillText('Racha ' + s.streak, x + w - 12, y + 66); }
  } else {
    outlined(nm, x + w / 2, y + 48, 17, col, 'center', 4);
    outlined(String(s.score), x + w / 2, y + 76, 24, '#fff', 'center', 5);
    if (rev && q && s.lock) (s.sel === q.right ? check : cross)(x + w / 2, y + 102, 16, s.sel === q.right ? '#7cf7a0' : '#ff6b6b');
    else if (s.lock) { c.font = FONT(14, 700); c.textAlign = 'center'; c.fillStyle = '#e8e3ff'; c.fillText('Listo', x + w / 2, y + 102); }
  }
}
function drawOption(i, q, t) {
  const [x, y, w, h] = optRect(i), rev = phase === 'reveal', right = rev && i === q.right, wrongPick = rev && i !== q.right && seat.some((s) => s.lock && s.sel === i);
  let fill = TF ? (i ? '#d9534f' : '#3fa55a') : '#2d2a5c'; if (rev && !right) fill = ART.dark(fill, 0.35); if (right) fill = '#34b36b';
  const pulse = right ? Math.sin(t * 8) * 2 : 0, sh = wrongPick ? Math.sin(pt * 40) * Math.max(0, 1 - pt * 2) * 5 : 0;
  panel(x - pulse + sh, y - pulse, w + pulse * 2, h + pulse * 2, 16, fill, { stroke: right ? '#eafff0' : OUT, lw: right ? 4 : 3 });
  if (TF) {
    const cy = y + h * (LAND ? 0.4 : 0.38), s = LAND ? 44 : 50;
    (i ? cross : check)(x + w / 2 + sh, cy, s, '#ffffff');
    outlined(i ? 'BULO' : 'VERDAD', x + w / 2 + sh, y + h * (LAND ? 0.78 : 0.72), LAND ? 32 : 30, '#fff', 'center', 6);
  } else {
    const bx = x + (LAND ? 30 : 24), by = LAND ? y + h / 2 : y + 24, lr = LAND ? 20 : 16;
    c.beginPath(); c.arc(bx + sh, by, lr, 0, TAU); c.fillStyle = OPC[i]; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    outlined(LET[i], bx + sh, by + 1, LAND ? 22 : 18, '#fff', 'center', 4);
    if (LAND) textBlock(q.opts[i], x + 58 + sh, y + 6, w - 70, h - 12, L.of, 14, '#fff', 800, 'left');
    else textBlock(q.opts[i], x + 10 + sh, y + 40, w - 20, h - 48, L.of, 13, '#fff', 800);
  }
  /* marcas de jugadores: cursor al elegir, fichas al revelar */
  const marks = seat.filter((s) => (phase === 'ask' ? hum(s.p) && !s.lock && s.sel === i : rev && s.lock && s.sel === i));
  marks.forEach((s, m) => {
    const col = k.pcol(s.p), mx = x + w - 16 - m * 28, my = y + 14;
    if (phase === 'ask') { c.save(); c.strokeStyle = ART.alpha(col, 0.35); c.lineWidth = 9; ART.rr(c, x - 4, y - 4, w + 8, h + 8, 19); c.stroke(); c.strokeStyle = col; c.lineWidth = 5; c.stroke(); c.restore(); }
    c.beginPath(); c.arc(mx, my, 12, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    const pl = k.players(SEATS)[seat.indexOf(s)]; c.font = FONT(11, 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; c.fillText(pl.cpu ? 'C' : k.party ? 'J' + (s.p + 1) : 'Tú', mx, my + 1);
  });
}
function draw() {
  const t = performance.now() / 1000;
  c.drawImage(stageBg(), 0, 0); spot(t);
  /* cabecera */
  const q = curQ(), [cx0, cy0, cw, ch] = L.card;
  if (!DATA || !q) {
    panel(cx0, cy0, cw, ch, 20, '#f6f1ff');
    outlined(CFG.title, W / 2, cy0 + ch * 0.38, LAND ? 40 : 34, '#ffd36b', 'center', 7);
    c.font = FONT(18, 700); c.textAlign = 'center'; c.fillStyle = OUT; c.fillText(!DATA ? 'Cargando preguntas…' : TF ? '¿Verdad o bulo?' : 'Seis categorías · diez preguntas', W / 2, cy0 + ch * 0.66);
    for (let i = 0; i < (TF ? 2 : 4); i++) { const [x, y, w, h] = optRect(i); panel(x, y, w, h, 16, TF ? (i ? '#d9534f' : '#3fa55a') : '#2d2a5c'); if (TF) { (i ? cross : check)(x + w / 2, y + h * 0.4, 44, '#fff'); outlined(i ? 'BULO' : 'VERDAD', x + w / 2, y + h * 0.76, 30, '#fff', 'center', 6); } else { const bx = x + (LAND ? 30 : 24), by = LAND ? y + h / 2 : y + 24; c.beginPath(); c.arc(bx, by, 18, 0, TAU); c.fillStyle = ART.dark(OPC[i], 0.42); c.fill(); c.beginPath(); c.arc(bx, by - 1.5, 16.5, 0, TAU); c.fillStyle = OPC[i]; c.fill(); outlined(LET[i], bx, by + 1, 20, '#fff', 'center', 4); const smp = ['Geografía', 'Historia', 'Ciencia', 'Arte y cultura'][i]; if (LAND) textBlock(smp, x + 58, y + 6, w - 70, h - 12, L.of, 14, '#fff', 800, 'left'); else textBlock(smp, x + 10, y + 40, w - 20, h - 48, L.of, 13, '#fff', 800); } }
    (seat || []).forEach((s, i) => lectern(i, s, t));
    return;
  }
  /* barra superior: ronda + tiempo */
  const topY = L.top, pw = LAND ? 180 : 164;
  panel(cx0, topY, pw, 36, 12, '#3a3478', { drop: 3 });
  outlined(`${TF ? 'Afirmación' : 'Pregunta'} ${qi + 1}/${NQ}`, cx0 + pw / 2, topY + 18, LAND ? 17 : 16, '#fff', 'center', 4);
  if (!TF && qi === NQ - 1) { panel(cx0 + pw + 8, topY, 104, 36, 12, '#e0a33a', { drop: 3 }); outlined('¡Doble!', cx0 + pw + 60, topY + 18, 17, '#fff', 'center', 4); }
  const bx = cx0 + pw + (LAND ? (!TF && qi === NQ - 1 ? 124 : 12) : (!TF && qi === NQ - 1 ? 120 : 12)), bw = cx0 + cw - bx;
  if (phase === 'ask' || phase === 'reveal') {
    const fr = phase === 'ask' ? Math.max(0, 1 - pt / TQ) : 0;
    panel(bx, topY + 6, bw, 24, 12, '#15112e', { drop: 2 });
    const col = fr > 0.5 ? '#6fd66f' : fr > 0.25 ? '#ffc94a' : '#ff6b6b';
    if (fr > 0) { c.save(); ART.rr(c, bx + 4, topY + 10, Math.max(8, (bw - 8) * fr), 16, 8); c.fillStyle = col; c.fill(); c.restore(); }
    if (phase === 'ask') outlined(String(Math.ceil(TQ - pt)), bx + bw - 18, topY + 18, 16, '#fff', 'center', 4);
  }
  /* tarjeta de la pregunta */
  const catC = TF ? '#4fb3ff' : DATA.cats[q.c] ? DATA.cats[q.c].col : '#6e62f5';
  if (phase === 'wheel') {
    panel(cx0, cy0, cw, ch, 20, '#241d57');
    const r = Math.min(ch * 0.4, LAND ? 52 : 90), wx = LAND ? cx0 + 90 : W / 2, wy = LAND ? cy0 + ch / 2 : cy0 + ch * 0.42;
    wheel(wx, wy, r, wheelA);
    const cat = DATA.cats[catAt(wheelA)] || { n: '', col: '#fff' };
    if (LAND) outlined(cat.n, cx0 + 180 + (cw - 180) / 2, cy0 + ch / 2, 34, cat.col, 'center', 7);
    else outlined(cat.n, W / 2, cy0 + ch - 34, 28, cat.col, 'center', 6);
  } else {
    panel(cx0, cy0, cw, ch, 20, '#fbf8ff');
    c.save(); ART.rr(c, cx0, cy0, cw, ch, 20); c.clip(); c.fillStyle = catC; c.fillRect(cx0, cy0, cw, LAND ? 30 : 34); c.restore();
    ART.rr(c, cx0, cy0, cw, ch, 20); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    const lab = TF ? '¿Verdad o bulo?' : (DATA.cats[q.c] ? DATA.cats[q.c].n : '') + ' · ' + ['', 'Fácil', 'Media', 'Difícil'][q.d];
    outlined(lab, cx0 + 16, cy0 + (LAND ? 15 : 17), 16, '#fff', 'left', 4);
    const showExp = TF && phase === 'reveal';
    if (showExp) {
      const ok = q.v; outlined(ok ? 'VERDAD' : 'BULO', cx0 + cw - 18, cy0 + (LAND ? 15 : 17), 18, ok ? '#c9ffd9' : '#ffd0d0', 'right', 4);
      textBlock(q.t, cx0 + 18, cy0 + (LAND ? 34 : 40), cw - 36, LAND ? 40 : 70, 18, 12, '#6a6394', 700);
      textBlock(q.e, cx0 + 18, cy0 + (LAND ? 74 : 116), cw - 36, ch - (LAND ? 80 : 124), L.fs - 2, 13, OUT, 800);
    } else textBlock(q.t, cx0 + 18, cy0 + (LAND ? 36 : 44), cw - 36, ch - (LAND ? 44 : 56), L.fs + (LAND ? 1 : 2), 14, OUT, 800);
    for (let i = 0; i < q.n; i++) drawOption(i, q, t);
  }
  /* ayuda de controles */
  if (phase === 'ask' && qi < 2) {
    const tx = k.party ? 'Joystick: elige · A: responder' : 'Toca tu respuesta (o flechas + Espacio)';
    c.font = FONT(LAND ? 13 : 15, 700); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255,255,255,.75)';
    c.fillText(tx, W / 2, LAND ? 361 : 640);
  }
  seat.forEach((s, i) => lectern(i, s, t));
}

/* =========================================================================================
 * Modos de la oleada 3 (no tocan el camino de 'quiz' ni el de 'tf'):
 *   'mas'      Más o Menos: dos tarjetas y una magnitud; encadenar aciertos suma más.
 *   'mapa'     Mapa Mudo de España: cada jugador mueve su chincheta y se puntúa por cercanía.
 *   'banderas' Banderas del Mundo: la bandera se dibuja por código y se elige el país.
 *   'calculo'  Cálculo Veloz: operaciones generadas al vuelo, cuatro resultados posibles.
 * Comparten pulsadores, marcador, CPU que mejora con las victorias y podio.
 * ========================================================================================= */
function NEWGAME() {
  const MAS = NM === 'mas', MAP = NM === 'mapa', BAN = NM === 'banderas', CAL = NM === 'calculo';
  const NQ2 = MAP ? 8 : BAN ? 10 : 12, TQ2 = (MAP ? 15 : CAL ? 11 : 13) * k.D.time;
  const PLAN = { 8: [1, 1, 2, 2, 2, 3, 3, 3], 10: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3], 12: [1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3] }[NQ2].map(DSH);
  const KX = Math.cos(0.6981); /* cos(40°): grados de longitud → anchura real */
  /* Atril propio: en apaisado se aparta de la esquina inferior izquierda, donde va el HUD de kit. */
  const LEC = LAND ? (i) => [92 + i * 172, 370, 166, 76] : L.lec;
  const LM = LAND
    ? { bar: [24, 10, 752, 34], pro: [24, 54, 196, 300], map: [232, 50, 544, 316] }
    : { bar: [16, 12, 418, 34], pro: [16, 52, 418, 54], map: [12, 112, 426, 524] };

  /* ---------- Datos ---------- */
  let DD = null, derr = false;
  const FB = () => MAS
    ? { sets: [{ id: 'x', n: 'Ciudades', q: '¿Qué ciudad tiene más habitantes?', u: 'hab.', cmp: 'hi', r: 1.3, d: 1, items: [['Madrid', 3300000], ['Barcelona', 1660000], ['Valencia', 800000], ['Sevilla', 685000], ['Bilbao', 345000], ['Toledo', 86000], ['Soria', 40000], ['Teruel', 36000], ['Cádiz', 110000], ['Granada', 230000], ['Murcia', 460000], ['Oviedo', 220000]] }] }
    : MAP ? { outline: [[-9, 43.5], [-9, 36.5], [3, 36.5], [3, 43.5]], islands: [], canarias: [], rivers: [], caps: [{ n: 'Madrid', d: 1, ll: [-3.70, 40.42] }, { n: 'Sevilla', d: 1, ll: [-5.98, 37.39] }, { n: 'Barcelona', d: 1, ll: [2.17, 41.39] }] }
      : { f: [{ n: 'Francia', c: 'eu', d: 1, o: [['v', '#0055A4', '#FFFFFF', '#EF4135']] }, { n: 'Italia', c: 'eu', d: 1, o: [['v', '#009246', '#FFFFFF', '#CE2B37']] }, { n: 'Japón', c: 'as', d: 1, o: [['bg', '#FFFFFF'], ['disc', '#BC002D', 0.5, 0.5, 0.3]] }, { n: 'Alemania', c: 'eu', d: 1, o: [['h', '#000000', '#DD0000', '#FFCE00']] }] };
  const SRC = MAS ? 'masmenos-es.json' : MAP ? 'mapa-es.json' : BAN ? 'banderas-es.json' : '';
  if (SRC) fetch('../_data/' + SRC).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => { DD = d; }).catch(() => { DD = FB(); derr = true; });
  else DD = { ok: 1 };

  /* ---------- Estado ---------- */
  let seats, qs, qi, phase, pt, started, tickN, help2 = 0;
  const mkS = () => k.players(SEATS).map((pl) => ({ p: pl.p, score: 0, sel: -1, lock: false, lockT: 0, gain: 0, cpuT: 0, cpuPick: -1, streak: 0, ok: 0, mx: 0.5, my: 0.5, dist: -1, best: false }));
  function reset2() { seats = mkS(); qs = null; qi = -1; phase = 'wait'; pt = 0; started = false; tickN = 0; }
  const hum2 = (p) => k.human(p);
  const cur = () => qs && qs[qi];

  /* ---------- Generación de preguntas ---------- */
  function pickSet(d) { const opt = DD.sets.filter((s) => Math.abs((s.d || 2) - d) <= 1); return k.pick(opt.length ? opt : DD.sets); }
  function pairOf(set) {
    for (let t = 0; t < 200; t++) {
      const i = k.ri(0, set.items.length - 1), j = k.ri(0, set.items.length - 1);
      if (i === j) continue;
      const a = set.items[i], b = set.items[j];
      const ok = set.g ? Math.abs(a[1] - b[1]) >= set.g : Math.max(a[1], b[1]) / Math.min(a[1], b[1]) >= (set.r || 1.25);
      if (ok) return [a, b];
    }
    return [set.items[0], set.items[set.items.length - 1]];
  }
  function fmtVal(v, set) {
    if (set.fmt === 'year') return v < 0 ? Math.abs(v) + ' a. C.' : String(v);
    if (v >= 1000000) return (v / 1000000).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' M';
    return v.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  }
  function genMas(d) {
    const set = pickSet(d), [a, b] = pairOf(set), lo = set.cmp === 'lo';
    const right = lo ? (a[1] < b[1] ? 0 : 1) : (a[1] > b[1] ? 0 : 1);
    return { d, n: 2, kind: 'mas', set, t: set.q, sub: set.n, items: [a, b], right };
  }
  function genBan(d, used) {
    let pool = DD.f.filter((f) => f.d === d && !used.has(f.n));
    if (!pool.length) pool = DD.f.filter((f) => !used.has(f.n));
    if (!pool.length) pool = DD.f;
    const f = k.pick(pool); used.add(f.n);
    const same = k.shuffle(DD.f.filter((x) => x.n !== f.n && x.c === f.c)).slice(0, 2);
    const rest = k.shuffle(DD.f.filter((x) => x.n !== f.n && same.indexOf(x) < 0)).slice(0, 3 - same.length);
    const ord = k.shuffle([f].concat(same, rest));
    return { d, n: 4, kind: 'ban', flag: f, t: '¿De qué país es esta bandera?', opts: ord.map((x) => x.n), right: ord.indexOf(f) };
  }
  function genCal(d) {
    const r = k.ri, big = (lo, hi) => r(lo, hi);
    let a, b, op, v, t;
    if (d === 1) {
      op = k.pick(['+', '+', '−', '×']);
      if (op === '+') { a = big(2, 19); b = big(2, 19); v = a + b; }
      else if (op === '−') { a = big(6, 20); b = big(1, a - 1); v = a - b; }
      else { a = big(2, 5); b = big(2, 9); v = a * b; }
    } else if (d === 2) {
      op = k.pick(['+', '−', '×', '÷']);
      if (op === '+') { a = big(15, 79); b = big(12, 69); v = a + b; }
      else if (op === '−') { a = big(30, 99); b = big(11, 49); v = a - b; }
      else if (op === '×') { a = big(3, 9); b = big(4, 12); v = a * b; }
      else { b = big(2, 9); v = big(2, 9); a = b * v; }
    } else {
      op = k.pick(['×', '÷', '%', 'mix']);
      if (op === '×') { a = big(11, 29); b = big(3, 9); v = a * b; }
      else if (op === '÷') { b = big(3, 12); v = big(4, 14); a = b * v; }
      else if (op === '%') { const pc = k.pick([10, 20, 25, 50, 75]); a = pc; b = k.pick([40, 60, 80, 120, 160, 200, 240]); v = Math.round((pc * b) / 100); }
      else { a = big(3, 9); b = big(3, 9); const cc = big(2, 19); v = a * b + cc; t = `${a} × ${b} + ${cc}`; }
    }
    /* La división se escribe con «:» (notación escolar española): el «÷» con contorno grueso se confunde con «+». */
    if (!t) t = op === '%' ? `${a} % de ${b}` : `${a} ${op === '÷' ? ':' : op} ${b}`;
    const outs = new Set([v]), opts = [v];
    const near = [v + 1, v - 1, v + 10, v - 10, v + 2, v - 2, Math.round(v * 1.1), Math.round(v / 2), v + big(3, 9), v - big(3, 9)];
    for (const x of k.shuffle(near)) { if (opts.length >= 4) break; if (x > 0 && !outs.has(x)) { outs.add(x); opts.push(x); } }
    while (opts.length < 4) { const x = v + opts.length * 3 + 3; if (!outs.has(x)) { outs.add(x); opts.push(x); } }
    const ord = k.shuffle(opts);
    return { d, n: 4, kind: 'cal', t, opts: ord.map(String), right: ord.indexOf(v) };
  }
  function genMap(d, used) {
    const caps = DD.caps.filter((x) => x.d === d && !used.has('c' + x.n));
    const rios = (DD.rivers || []).filter((x) => x.d === d && !used.has('r' + x.n));
    const wantR = rios.length && Math.random() < 0.3;
    if (wantR) { const r = k.pick(rios); used.add('r' + r.n); return { d, n: 0, kind: 'rio', t: 'Señala el río ' + r.n, name: r.n, pts: r.pts }; }
    const pool = caps.length ? caps : DD.caps.filter((x) => !used.has('c' + x.n));
    const cpt = k.pick(pool.length ? pool : DD.caps); used.add('c' + cpt.n);
    return { d, n: 0, kind: 'cap', t: 'Señala ' + cpt.n, name: cpt.n, ll: cpt.ll };
  }
  function deck2() {
    const used = new Set(), out = [];
    for (const d of PLAN) out.push(MAS ? genMas(d) : BAN ? genBan(d, used) : CAL ? genCal(d) : genMap(d, used));
    return out;
  }

  /* ---------- Mapa: proyección, dibujo y distancias ---------- */
  const BB = { lo0: -9.5, lo1: 3.5, la0: 35.85, la1: 43.95 };
  let MV = null, mapC = null, insC = null;
  function mapView() {
    if (MV) return MV;
    const [x, y, w, h] = LM.map, ww = (BB.lo1 - BB.lo0) * KX, hh = BB.la1 - BB.la0;
    const s = Math.min(w / ww, h / hh), dx = x + (w - ww * s) / 2, dy = y + (h - hh * s) / 2;
    /* El recuadro de Canarias va en la esquina del panel, nunca encima de la Península. */
    const ins = { w: Math.min(w * (LAND ? 0.22 : 0.36), LAND ? 112 : 150), h: 0 }; ins.h = ins.w * 0.42;
    ins.x = x + 6; ins.y = y + h - ins.h - 6;
    MV = { s, dx, dy, ww, hh, ins };
    return MV;
  }
  const px = (lon) => { const v = mapView(); return v.dx + (lon - BB.lo0) * KX * v.s; };
  const py = (lat) => { const v = mapView(); return v.dy + (BB.la1 - lat) * v.s; };
  const CB = { lo0: -18.4, lo1: -13.2, la0: 27.5, la1: 29.5 };
  function cpx(lon) { const v = mapView().ins, s = Math.min(v.w / ((CB.lo1 - CB.lo0) * KX), v.h / (CB.la1 - CB.la0)); return v.x + v.w / 2 + (lon - (CB.lo0 + CB.lo1) / 2) * KX * s; }
  function cpy(lat) { const v = mapView().ins, s = Math.min(v.w / ((CB.lo1 - CB.lo0) * KX), v.h / (CB.la1 - CB.la0)); return v.y + v.h / 2 - (lat - (CB.la0 + CB.la1) / 2) * s; }
  function inIns(x, y) { const v = mapView().ins; return x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h; }
  /* pantalla → coordenadas (grados), teniendo en cuenta el recuadro de Canarias */
  function unproj(x, y) {
    const v = mapView();
    if (inIns(x, y)) { const s = Math.min(v.ins.w / ((CB.lo1 - CB.lo0) * KX), v.ins.h / (CB.la1 - CB.la0)); return [(CB.lo0 + CB.lo1) / 2 + (x - v.ins.x - v.ins.w / 2) / (KX * s), (CB.la0 + CB.la1) / 2 - (y - v.ins.y - v.ins.h / 2) / s]; }
    return [BB.lo0 + (x - v.dx) / (KX * v.s), BB.la1 - (y - v.dy) / v.s];
  }
  function scr(ll) { return ll[1] < 30 ? [cpx(ll[0]), cpy(ll[1])] : [px(ll[0]), py(ll[1])]; }
  const kmOf = (a, b) => 6371 * Math.hypot(((b[1] - a[1]) * Math.PI) / 180, (((b[0] - a[0]) * Math.PI) / 180) * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180));
  function distTo(q, ll) {
    if (q.kind === 'cap') return kmOf(ll, q.ll);
    let best = 1e9;
    for (let i = 1; i < q.pts.length; i++) {
      const a = q.pts[i - 1], b = q.pts[i];
      const ax = a[0] * KX, ay = a[1], bx = b[0] * KX, by = b[1], gx = ll[0] * KX, gy = ll[1];
      const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
      let t = len ? ((gx - ax) * dx + (gy - ay) * dy) / len : 0; t = Math.max(0, Math.min(1, t));
      const cxp = (ax + dx * t) / KX, cyp = ay + dy * t;
      best = Math.min(best, kmOf(ll, [cxp, cyp]));
    }
    return best;
  }
  function nearest(q, ll) {
    if (q.kind === 'cap') return q.ll;
    let best = q.pts[0], bd = 1e9;
    for (let i = 1; i < q.pts.length; i++) {
      for (let t = 0; t <= 1; t += 0.05) {
        const p = [q.pts[i - 1][0] + (q.pts[i][0] - q.pts[i - 1][0]) * t, q.pts[i - 1][1] + (q.pts[i][1] - q.pts[i - 1][1]) * t];
        const d = kmOf(ll, p); if (d < bd) { bd = d; best = p; }
      }
    }
    return best;
  }
  function poly(g, pts, f) { g.beginPath(); pts.forEach((p, i) => { const x = f ? cpx(p[0]) : px(p[0]), y = f ? cpy(p[1]) : py(p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); }
  function mapCache() {
    if (mapC) return mapC;
    mapC = document.createElement('canvas'); mapC.width = W; mapC.height = H; const g = mapC.getContext('2d');
    const v = mapView(), [bx, by, bw, bh] = LM.map;
    /* mar */
    const sea = g.createLinearGradient(0, by, 0, by + bh); sea.addColorStop(0, '#1f4e78'); sea.addColorStop(1, '#16375a');
    g.fillStyle = sea; ART.rr(g, bx, by, bw, bh, 16); g.fill();
    g.save(); ART.rr(g, bx, by, bw, bh, 16); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    for (let x = bx; x < bx + bw; x += 26) { g.beginPath(); g.moveTo(x, by); g.lineTo(x, by + bh); g.stroke(); }
    for (let y = by; y < by + bh; y += 26) { g.beginPath(); g.moveTo(bx, y); g.lineTo(bx + bw, y); g.stroke(); }
    /* tierra */
    const land = (pts, f) => {
      poly(g, pts, f);
      const gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#d8e7a8'); gr.addColorStop(1, '#b6cf84');
      g.fillStyle = gr; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
    };
    land(DD.outline);
    (DD.islands || []).forEach((i) => land(i.pts));
    /* ríos */
    (DD.rivers || []).forEach((r) => {
      g.beginPath(); r.pts.forEach((p, i) => (i ? g.lineTo(px(p[0]), py(p[1])) : g.moveTo(px(p[0]), py(p[1]))));
      g.lineWidth = 4.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(26,21,48,.35)'; g.stroke();
      g.lineWidth = 2.6; g.strokeStyle = '#5b8cff'; g.stroke();
    });
    g.restore();
    /* recuadro de Canarias */
    if ((DD.canarias || []).length) {
      const i = v.ins;
      g.fillStyle = 'rgba(12,30,52,.92)'; ART.rr(g, i.x, i.y, i.w, i.h, 8); g.fill();
      g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.35)'; g.stroke();
      g.save(); ART.rr(g, i.x, i.y, i.w, i.h, 8); g.clip();
      DD.canarias.forEach((isl) => { poly(g, isl.pts, 1); g.fillStyle = '#c8dd9a'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); });
      g.restore();
      g.font = FONT(11, 800); g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText('Canarias', i.x + 6, i.y + 4);
    }
    /* rosa de los vientos */
    const nx = bx + bw - 26, ny = by + 26;
    g.beginPath(); g.arc(nx, ny, 13, 0, TAU); g.fillStyle = 'rgba(12,30,52,.8)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.4)'; g.stroke();
    g.beginPath(); g.moveTo(nx, ny - 9); g.lineTo(nx - 4, ny + 5); g.lineTo(nx + 4, ny + 5); g.closePath(); g.fillStyle = '#ff6fb5'; g.fill();
    g.font = FONT(9, 900); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('N', nx, ny - 15);
    return mapC;
  }

  /* ---------- Banderas dibujadas por código ---------- */
  function star(g, cx, cy, r, n, rot, inner) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot - Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r * (inner || 0.382) : r; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath();
  }
  function drawFlag(g, x, y, w, h, ops) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const X = (f) => x + f * w, Y = (f) => y + f * h, R = (f) => f * h;
    const bands = (cols, vert, ws) => {
      const tot = ws ? ws.reduce((a, b) => a + b, 0) : cols.length; let acc = 0;
      cols.forEach((col, i) => { const p = ws ? ws[i] : 1; g.fillStyle = col; if (vert) g.fillRect(x + (acc / tot) * w, y, (p / tot) * w + 1, h); else g.fillRect(x, y + (acc / tot) * h, w, (p / tot) * h + 1); acc += p; });
    };
    const nordic = (col, t) => { const cxv = X(0.36); g.fillStyle = col; g.fillRect(x, y + h / 2 - t / 2, w, t); g.fillRect(cxv - t / 2, y, t, h); };
    for (const op of ops) {
      const o = op[0];
      if (o === 'bg') { g.fillStyle = op[1]; g.fillRect(x, y, w, h); }
      else if (o === 'v') bands(op.slice(1), 1);
      else if (o === 'h') bands(op.slice(1), 0);
      else if (o === 'vw') bands(op.slice(2), 1, op[1].split(',').map(Number));
      else if (o === 'hw') bands(op.slice(2), 0, op[1].split(',').map(Number));
      else if (o === 'nordic') nordic(op[1], h * 0.2);
      else if (o === 'nordic2') nordic(op[1], h * 0.085);
      else if (o === 'ccross') { const s = Math.min(w, h) * 0.86, t = s * 0.2, cx0 = x + w / 2, cy0 = y + h / 2; g.fillStyle = op[1]; g.fillRect(cx0 - s * 0.3, cy0 - t / 2, s * 0.6, t); g.fillRect(cx0 - t / 2, cy0 - s * 0.3, t, s * 0.6); }
      else if (o === 'stripes5') { for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? op[2] : op[1]; g.fillRect(x, y + (i * h) / 5, w, h / 5 + 1); } }
      else if (o === 'rect') { g.fillStyle = op[1]; g.fillRect(X(op[2]), Y(op[3]), op[4] * w + 0.5, op[5] * h + 0.5); }
      else if (o === 'disc') { g.fillStyle = op[1]; g.beginPath(); g.arc(X(op[2]), Y(op[3]), R(op[4]), 0, TAU); g.fill(); }
      else if (o === 'star') { g.fillStyle = op[1]; star(g, X(op[2]), Y(op[3]), R(op[4]), op[5] || 5, op[6] || 0); g.fill(); }
      else if (o === 'penta') { g.strokeStyle = op[1]; g.lineWidth = R(op[4] || 0.32) * 0.17; g.beginPath(); const cx0 = X(op[2]), cy0 = Y(op[3]), rr = R(op[4]); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + ((i * 2) % 5) * ((2 * Math.PI) / 5); const xx = cx0 + Math.cos(a) * rr, yy = cy0 + Math.sin(a) * rr; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.closePath(); g.stroke(); }
      else if (o === 'cres') { const cx0 = X(op[2]), cy0 = Y(op[3]), rr = R(op[4]); g.fillStyle = op[1]; g.beginPath(); g.arc(cx0, cy0, rr, 0, TAU); g.fill(); g.fillStyle = op[5]; g.beginPath(); g.arc(cx0 + rr * 0.3, cy0, rr * 0.82, 0, TAU); g.fill(); }
      else if (o === 'tri') { g.fillStyle = op[1]; g.beginPath(); g.moveTo(x, y); g.lineTo(X(op[2]), y + h / 2); g.lineTo(x, y + h); g.closePath(); g.fill(); }
      else if (o === 'tri2') { g.fillStyle = op[1]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w / 2, y + h / 2); g.lineTo(x, y + h); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w / 2, y + h / 2); g.lineTo(x + w, y + h); g.closePath(); g.fill(); }
      else if (o === 'saltire') { g.strokeStyle = op[1]; g.lineWidth = h * (op[2] || 0.16); g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke(); }
      else if (o === 'greece') {
        for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : '#0D5EAF'; g.fillRect(x, y + (i * h) / 9, w, h / 9 + 1); }
        const s = (h * 5) / 9; g.fillStyle = '#0D5EAF'; g.fillRect(x, y, s, s);
        g.fillStyle = '#FFFFFF'; g.fillRect(x, y + s / 2 - s * 0.1, s, s * 0.2); g.fillRect(x + s / 2 - s * 0.1, y, s * 0.2, s);
      } else if (o === 'china') {
        g.fillStyle = '#FFDE00'; star(g, X(0.16), Y(0.26), R(0.19), 5, 0); g.fill();
        [[0.31, 0.11], [0.39, 0.21], [0.39, 0.36], [0.31, 0.46]].forEach((p) => { const cx0 = X(p[0]), cy0 = Y(p[1]); star(g, cx0, cy0, R(0.065), 5, Math.atan2(Y(0.26) - cy0, X(0.16) - cx0) + Math.PI / 2); g.fill(); });
      } else if (o === 'usa') {
        for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : '#B22234'; g.fillRect(x, y + (i * h) / 13, w, h / 13 + 1); }
        const cw = w * 0.4, chh = (h * 7) / 13; g.fillStyle = '#3C3B6E'; g.fillRect(x, y, cw, chh);
        g.fillStyle = '#FFFFFF';
        for (let r0 = 0; r0 < 9; r0++) { const n = r0 % 2 ? 5 : 6; for (let i = 0; i < n; i++) { const sx = x + cw * ((i + (r0 % 2 ? 1 : 0.5)) / 6) + cw * 0.005, sy = y + chh * ((r0 + 1) / 10); star(g, sx, sy, chh * 0.045, 5, 0); g.fill(); } }
      } else if (o === 'uk') {
        g.fillStyle = '#012169'; g.fillRect(x, y, w, h);
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
        g.lineCap = 'butt';
        g.strokeStyle = '#FFFFFF'; g.lineWidth = h * 0.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke();
        g.strokeStyle = '#C8102E'; g.lineWidth = h * 0.1;
        g.save(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + w / 2, y + h / 2); g.lineTo(x, y + h); g.closePath(); g.moveTo(x + w, y); g.lineTo(x + w / 2, y + h / 2); g.lineTo(x + w, y + h); g.closePath(); g.clip();
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke(); g.restore();
        g.strokeStyle = '#FFFFFF'; g.lineWidth = h * 0.33; g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
        g.strokeStyle = '#C8102E'; g.lineWidth = h * 0.2; g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
        g.restore();
      } else if (o === 'maple') {
        const cx0 = x + w / 2, cy0 = y + h / 2, s = h * 0.34;
        const pts = [[0, -1], [0.14, -0.6], [0.4, -0.66], [0.32, -0.36], [0.72, -0.1], [0.58, 0.03], [0.62, 0.22], [0.26, 0.16], [0.2, 0.3], [0.06, 0.12], [0.06, 0.62], [-0.06, 0.62], [-0.06, 0.12], [-0.2, 0.3], [-0.26, 0.16], [-0.62, 0.22], [-0.58, 0.03], [-0.72, -0.1], [-0.32, -0.36], [-0.4, -0.66], [-0.14, -0.6]];
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(cx0 + p[0] * s, cy0 + p[1] * s) : g.moveTo(cx0 + p[0] * s, cy0 + p[1] * s))); g.closePath(); g.fillStyle = op[1]; g.fill();
      } else if (o === 'sol') {
        const cx0 = x + w / 2, cy0 = y + h / 2, r0 = h * 0.11;
        g.strokeStyle = '#F6B40E'; g.lineWidth = 2;
        for (let i = 0; i < 16; i++) { const a = (i * TAU) / 16; g.beginPath(); g.moveTo(cx0 + Math.cos(a) * r0, cy0 + Math.sin(a) * r0); g.lineTo(cx0 + Math.cos(a) * r0 * 1.7, cy0 + Math.sin(a) * r0 * 1.7); g.stroke(); }
        g.fillStyle = '#F6B40E'; g.beginPath(); g.arc(cx0, cy0, r0, 0, TAU); g.fill();
        g.strokeStyle = '#85340A'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx0, cy0, r0, 0, TAU); g.stroke();
      } else if (o === 'chakra') {
        const cx0 = x + w / 2, cy0 = y + h / 2, r0 = h * 0.16;
        g.strokeStyle = '#000080'; g.lineWidth = 2; g.beginPath(); g.arc(cx0, cy0, r0, 0, TAU); g.stroke();
        g.lineWidth = 1; for (let i = 0; i < 24; i++) { const a = (i * TAU) / 24; g.beginPath(); g.moveTo(cx0, cy0); g.lineTo(cx0 + Math.cos(a) * r0, cy0 + Math.sin(a) * r0); g.stroke(); }
        g.fillStyle = '#000080'; g.beginPath(); g.arc(cx0, cy0, r0 * 0.16, 0, TAU); g.fill();
      } else if (o === 'taeguk') {
        const cx0 = x + w / 2, cy0 = y + h / 2, r0 = h * 0.2, an = -Math.PI / 3;
        g.save(); g.translate(cx0, cy0); g.rotate(an);
        g.fillStyle = '#CD2E3A'; g.beginPath(); g.arc(0, 0, r0, Math.PI, 0); g.fill();
        g.fillStyle = '#0047A0'; g.beginPath(); g.arc(0, 0, r0, 0, Math.PI); g.fill();
        g.fillStyle = '#CD2E3A'; g.beginPath(); g.arc(r0 / 2, 0, r0 / 2, 0, TAU); g.fill();
        g.fillStyle = '#0047A0'; g.beginPath(); g.arc(-r0 / 2, 0, r0 / 2, 0, TAU); g.fill();
        g.restore();
        g.fillStyle = '#000000';
        const tri = [[1, 1, 1], [1, 0, 1], [0, 1, 0], [0, 0, 0]];
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((q, n) => {
          g.save(); g.translate(cx0 + q[0] * w * 0.26, cy0 + q[1] * h * 0.3); g.rotate(Math.atan2(-q[1], -q[0]) + Math.PI / 2);
          const bw = h * 0.16, bh = h * 0.028;
          tri[n].forEach((full, i) => { const yy = -bh * 3 + i * bh * 3; if (full) g.fillRect(-bw / 2, yy, bw, bh); else { g.fillRect(-bw / 2, yy, bw * 0.42, bh); g.fillRect(bw * 0.08, yy, bw * 0.42, bh); } });
          g.restore();
        });
      } else if (o === 'david') {
        const cx0 = x + w / 2, cy0 = y + h / 2, r0 = h * 0.17;
        g.strokeStyle = op[1]; g.lineWidth = h * 0.028;
        for (const rot of [0, Math.PI]) { g.beginPath(); for (let i = 0; i < 3; i++) { const a = rot - Math.PI / 2 + (i * TAU) / 3; const xx = cx0 + Math.cos(a) * r0, yy = cy0 + Math.sin(a) * r0; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.closePath(); g.stroke(); }
      } else if (o === 'sa') {
        g.fillStyle = '#E03C31'; g.fillRect(x, y, w, h / 2); g.fillStyle = '#002395'; g.fillRect(x, y + h / 2, w, h / 2);
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.62, y + h / 2); g.lineTo(x, y + h); g.lineTo(x, y + h * 0.82); g.lineTo(x + w * 0.34, y + h / 2); g.lineTo(x, y + h * 0.18); g.closePath(); g.fill();
        g.fillStyle = '#007A4D'; g.beginPath(); g.moveTo(x, y + h * 0.16); g.lineTo(x + w * 0.42, y + h / 2); g.lineTo(x, y + h * 0.84); g.lineTo(x, y + h * 0.68); g.lineTo(x + w * 0.2, y + h / 2); g.lineTo(x, y + h * 0.32); g.closePath(); g.fill();
        g.fillStyle = '#FFB81C'; g.beginPath(); g.moveTo(x, y + h * 0.3); g.lineTo(x + w * 0.16, y + h / 2); g.lineTo(x, y + h * 0.7); g.closePath(); g.fill();
        g.fillStyle = '#000000'; g.beginPath(); g.moveTo(x, y + h * 0.34); g.lineTo(x + w * 0.12, y + h / 2); g.lineTo(x, y + h * 0.66); g.closePath(); g.fill();
      } else if (o === 'esp') {
        const cx0 = X(0.33), cy0 = y + h / 2, sw = h * 0.2, sh = h * 0.28;
        g.fillStyle = '#c8a43c'; ART.rr(g, cx0 - sw / 2, cy0 - sh / 2, sw, sh * 0.78, 3); g.fill();
        g.beginPath(); g.moveTo(cx0 - sw / 2, cy0 + sh * 0.28); g.lineTo(cx0, cy0 + sh / 2); g.lineTo(cx0 + sw / 2, cy0 + sh * 0.28); g.closePath(); g.fill();
        g.fillStyle = '#AA151B'; g.fillRect(cx0 - sw / 2, cy0 - sh / 2, sw / 2, sh * 0.39); g.fillRect(cx0, cy0 - sh * 0.11, sw / 2, sh * 0.39);
        g.fillStyle = '#c8a43c'; g.fillRect(cx0 - sw * 0.66, cy0 - sh * 0.2, sw * 0.12, sh * 0.7); g.fillRect(cx0 + sw * 0.54, cy0 - sh * 0.2, sw * 0.12, sh * 0.7);
        g.beginPath(); g.moveTo(cx0 - sw * 0.34, cy0 - sh * 0.62); g.lineTo(cx0 + sw * 0.34, cy0 - sh * 0.62); g.lineTo(cx0 + sw * 0.22, cy0 - sh * 0.46); g.lineTo(cx0 - sw * 0.22, cy0 - sh * 0.46); g.closePath(); g.fill();
      } else if (o === 'por') {
        const cx0 = X(0.4), cy0 = y + h / 2, r0 = h * 0.22;
        g.strokeStyle = '#FFE900'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx0, cy0, r0, 0, TAU); g.stroke();
        g.lineWidth = 1.6;
        for (const f of [0.35, 0.7]) { g.beginPath(); g.ellipse(cx0, cy0, r0 * f, r0, 0, 0, TAU); g.stroke(); }
        g.beginPath(); g.ellipse(cx0, cy0, r0, r0 * 0.3, 0, 0, TAU); g.stroke();
        g.fillStyle = '#FFFFFF'; ART.rr(g, cx0 - r0 * 0.4, cy0 - r0 * 0.5, r0 * 0.8, r0, 3); g.fill();
        g.fillStyle = '#AA151B'; g.lineWidth = 1.5; g.strokeStyle = '#AA151B'; ART.rr(g, cx0 - r0 * 0.4, cy0 - r0 * 0.5, r0 * 0.8, r0, 3); g.stroke();
        g.fillStyle = '#0000A0'; for (let i = 0; i < 5; i++) { const a = [[0, 0], [-0.18, -0.22], [0.18, -0.22], [-0.18, 0.22], [0.18, 0.22]][i]; g.beginPath(); g.arc(cx0 + a[0] * r0, cy0 + a[1] * r0 * 1.1, r0 * 0.09, 0, TAU); g.fill(); }
      } else if (o === 'brasil') {
        g.fillStyle = '#009C3B'; g.fillRect(x, y, w, h);
        g.fillStyle = '#FFDF00'; g.beginPath(); g.moveTo(x + w / 2, y + h * 0.1); g.lineTo(x + w * 0.9, y + h / 2); g.lineTo(x + w / 2, y + h * 0.9); g.lineTo(x + w * 0.1, y + h / 2); g.closePath(); g.fill();
        g.fillStyle = '#002776'; g.beginPath(); g.arc(x + w / 2, y + h / 2, h * 0.2, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(x + w / 2, y + h / 2, h * 0.2, 0, TAU); g.clip();
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(x + w / 2, y + h * 0.82, h * 0.34, Math.PI * 1.15, Math.PI * 1.85); g.arc(x + w / 2, y + h * 0.82, h * 0.27, Math.PI * 1.85, Math.PI * 1.15, true); g.closePath(); g.fill();
        g.fillStyle = '#FFFFFF';
        for (const p of [[-0.09, -0.1], [0.06, -0.12], [0.1, 0.03], [-0.05, 0.06], [0.0, -0.04], [-0.12, 0.02], [0.13, -0.05]]) { star(g, x + w / 2 + p[0] * h, y + h / 2 + p[1] * h, h * 0.016, 5, 0); g.fill(); }
        g.restore();
      }
    }
    g.restore();
    g.lineWidth = 3; g.strokeStyle = OUT; ART.rr(g, x, y, w, h, 4); g.stroke();
  }

  /* ---------- Turno de pregunta ---------- */
  function beginQ2() {
    qi++; pt = 0; tickN = 0; phase = 'ask';
    const q = cur(), v = MAP ? mapView() : null;
    seats.forEach((s, i) => {
      s.sel = -1; s.lock = false; s.lockT = 0; s.gain = 0; s.cpuPick = -1; s.cpuLL = null; s.dist = -1; s.best = false; s.guess = null;
      if (MAP) { s.mx = v.dx + v.ww * v.s * (0.38 + (i % 2) * 0.24); s.my = v.dy + v.hh * v.s * (0.4 + ((i >> 1) % 2) * 0.2); }
    });
    const base = MAS ? [0, 0.62, 0.5, 0.4][q.d] : BAN ? [0, 0.6, 0.45, 0.32][q.d] : [0, 0.66, 0.5, 0.38][q.d];
    for (const s of seats) if (!hum2(s.p)) cpu2(s, q, base);
    if (k.privOK) for (const s of seats) if (hum2(s.p)) k.priv(s.p, MAP
      ? { title: `Pista ${qi + 1}/${NQ2}`, text: q.t + '. Mueve tu chincheta con el joystick y pulsa A.', items: [] }
      : { title: `Pregunta ${qi + 1}/${NQ2}`, text: q.t + (MAS ? '' : ''), items: optLab(q).map((lb, i) => ({ v: i, label: q.n === 2 ? lb : LET[i], sub: q.n === 2 ? '' : lb, col: q.n === 2 ? ['#4fb3ff', '#ff9f43'][i] : OPC[i] })) });
  }
  function optLab(q) { return q.kind === 'mas' ? q.items.map((it) => it[0]) : q.opts || []; }
  function cpu2(s, q, base) {
    if (base == null) base = MAS ? [0, 0.62, 0.5, 0.4][q.d] : BAN ? [0, 0.6, 0.45, 0.32][q.d] : [0, 0.66, 0.5, 0.38][q.d];
    if (MAP) {
      const errKm = [0, 150, 280, 420][q.d] * (1 - Math.min(0.45, CPU * 0.055)) * k.rnd(0.25, 1.25);
      const tgt = q.kind === 'cap' ? q.ll : q.pts[k.ri(0, q.pts.length - 1)];
      const a = k.rnd(0, TAU);
      s.cpuLL = [tgt[0] + (Math.cos(a) * errKm) / (111 * KX), tgt[1] + (Math.sin(a) * errKm) / 111];
      s.cpuT = k.rnd(3, TQ2 * 0.78);
      return;
    }
    const pc = Math.min(0.85, Math.max(0.05, base + CPU * 0.015 + k.D.cpu * 0.08 + k.rnd(-0.05, 0.05)));
    s.cpuPick = Math.random() < pc ? q.right : k.pick([...Array(q.n).keys()].filter((i) => i !== q.right));
    s.cpuT = Math.max(pt + 1, k.rnd(MAS ? 2 : 2.6, TQ2 * (0.5 + Math.random() * 0.32)));
  }
  function lock2(s, i) {
    if (s.lock || phase !== 'ask') return;
    s.sel = i; s.lock = true; s.lockT = pt; k.sfx('pop');
    const [x, y, w] = LEC(seats.indexOf(s)); k.burst(x + w / 2, y + 10, k.pcol(s.p), 10, 120);
    if (hum2(s.p) && k.privOK) k.priv(s.p, { title: '¡Respuesta enviada!', text: MAS ? cur().items[i][0] : LET[i] + ' · ' + cur().opts[i], items: [] });
  }
  function lockMap(s, ll) {
    if (s.lock || phase !== 'ask') return;
    s.lock = true; s.lockT = pt; s.guess = ll; k.sfx('pop');
    if (hum2(s.p) && k.privOK) k.priv(s.p, { title: '¡Chincheta puesta!', text: 'Espera a que terminen los demás.', items: [] });
  }
  function reveal2() {
    phase = 'reveal'; pt = 0; const q = cur();
    let anyHum = false, anyOk = false;
    if (MAP) {
      for (const s of seats) { if (!s.lock) { s.guess = null; s.dist = -1; } else s.dist = distTo(q, s.guess); }
      const fin = seats.filter((s) => s.dist >= 0);
      if (fin.length) { const b = fin.reduce((a, x) => (x.dist < a.dist ? x : a)); if (b.dist <= 400) b.best = true; }
    }
    seats.forEach((s, n) => {
      const [x, y, w] = LEC(n);
      let g = 0;
      if (MAP) {
        if (s.dist >= 0) {
          if (s.dist <= 35) g = 100 + Math.round(60 * Math.max(0, 1 - s.lockT / TQ2));
          else if (s.dist <= 150) g = Math.round(90 - ((s.dist - 35) / 115) * 60);
          if (s.best && g > 0) g += 20;
        }
        if (g >= 100) { s.streak++; s.ok++; } else s.streak = 0;
      } else if (s.lock && s.sel === q.right) {
        g = Math.round((100 + 100 * Math.max(0, 1 - s.lockT / TQ2)) / 5) * 5; s.streak++; s.ok++;
        if (s.streak >= 3) g += 25;
      } else s.streak = 0;
      s.gain = Math.round(g / 5) * 5;
      if (s.gain) k.float('+' + s.gain, x + w / 2, y - 6, s.gain >= 100 ? '#7cf7a0' : '#ffd36b');
      s.score += s.gain;
      if (hum2(s.p)) { anyHum = true; if (s.gain >= 100) anyOk = true; }
    });
    if (!MAP) { const r = q.n === 2 ? L.tfo(q.right) : L.opt(q.right); k.burst(r[0] + r[2] / 2, r[1] + r[3] / 2, '#7cf7a0', 22, 200); }
    if (anyHum) k.sfx(anyOk ? 'coin' : 'hurt'); else k.sfx('pop');
    if (anyHum && !anyOk) k.shake(3);
    if (k.privOK) for (const s of seats) if (hum2(s.p)) k.priv(s.p, {
      title: s.gain >= 100 ? '¡Muy bien!' : s.gain ? 'Casi' : 'Fallaste',
      text: MAP ? (s.dist >= 0 ? `A ${Math.round(s.dist)} km de ${q.name}` : 'Sin chincheta') : MAS ? `${q.items[q.right][0]}: ${fmtVal(q.items[q.right][1], q.set)} ${q.set.u}` : 'Era: ' + q.opts[q.right], items: [],
    });
  }
  function finish2() {
    const rows = seats.map((s) => ({ p: s.p, score: s.score }));
    const top = rows.slice().sort((a, b) => b.score - a.score)[0];
    if (hum2(top.p) && top.score > 0) { CPU = Math.min(8, CPU + 1); try { localStorage.setItem('cpu:' + CFG.id, CPU); } catch (e) { /* sin almacenamiento */ } }
    const me = seats[0]; if (!k.party) k.best(CFG.id, me.score);
    if (k.privOK) for (const s of seats) if (hum2(s.p)) k.priv(s.p, null);
    const ac = k.party ? '' : ` · ${MAP ? 'Buenos tiros' : 'Aciertos'}: ${me.ok}/${NQ2}`;
    const srt = rows.slice().sort((a, b) => b.score - a.score), solo = !k.party && srt[0].p === 0 && (srt.length < 2 || srt[1].score < srt[0].score);
    k.podium(rows, { head: solo ? '¡Has ganado!' : undefined, go: `${k.party ? '' : 'Tu récord: ' + k.best(CFG.id, 0) + ac + '<br>'}Toca para otra ronda` });
  }

  /* ---------- Entrada ---------- */
  function moveSel2(s, d, n) {
    if (n === 2) { if (d.x < 0) s.sel = 0; else if (d.x > 0) s.sel = 1; else if (s.sel < 0) s.sel = 0; return; }
    let i = s.sel < 0 ? 0 : s.sel, cx = i % 2, cy = i >> 1;
    if (s.sel < 0) { cx = d.x > 0 ? 1 : 0; cy = d.y > 0 ? 1 : 0; } else { if (d.x) cx = d.x > 0 ? 1 : 0; if (d.y) cy = d.y > 0 ? 1 : 0; }
    s.sel = Math.min(n - 1, cy * 2 + cx);
  }
  k.onPick = (p, v) => { const s = seats && seats.find((x) => x.p === p); if (s && phase === 'ask' && hum2(p) && typeof v === 'number' && !MAP) lock2(s, v); };
  k.onParty = () => { if (k.st !== 'play') reset2(); };

  /* ---------- Bucle ---------- */
  reset2();
  k.show(CFG.title, MAS ? 'Dos tarjetas, una magnitud: elige cuál gana. Acertar rápido suma más y las rachas dan puntos extra.'
    : MAP ? 'Mueve tu chincheta por el mapa y clávala donde creas que está la ciudad o el río. Cuanto más cerca, más puntos.'
      : BAN ? 'Una bandera dibujada trazo a trazo y cuatro países. Elige rápido: el tiempo también puntúa.'
        : 'Operaciones mentales contra el reloj. Elige el resultado correcto entre cuatro antes de que se acabe el tiempo.');
  k.run((dt) => {
    if (!k.gate(reset2)) return;
    if (!DD) return;
    if (!started) { started = true; seats = mkS(); qs = deck2(); k.count(3); return; }
    if (k.counting()) return;
    if (phase === 'wait') { beginQ2(); return; }
    pt += dt;
    const q = cur(), v = MAP ? mapView() : null;
    if (phase === 'ask') {
      seats.forEach((s) => {
        if (s.lock) return;
        if (hum2(s.p)) {
          if (MAP) {
            const d = k.pdir(s.p), sp = (v.ww * v.s) / 1.9;
            if (d.x || d.y) { const m = Math.hypot(d.x, d.y) || 1; s.mx += (d.x / m) * sp * dt; s.my += (d.y / m) * sp * dt; }
            if (s.p === 0 && !k.party && (k.ptr.down || k.ptr.hit)) { const [mx, my] = LM.map; if (k.ptr.x >= mx - 4 && k.ptr.x <= mx + LM.map[2] + 4 && k.ptr.y >= my - 4 && k.ptr.y <= my + LM.map[3] + 4) { s.mx = k.ptr.x; s.my = k.ptr.y; } }
            s.mx = Math.max(LM.map[0], Math.min(LM.map[0] + LM.map[2], s.mx));
            s.my = Math.max(LM.map[1], Math.min(LM.map[1] + LM.map[3], s.my));
            if (k.phit(s.p, 'a') || (s.p === 0 && !k.party && k.ptr.up && pt > 0.4)) lockMap(s, unproj(s.mx, s.my));
          } else {
            const d = { x: (k.phit(s.p, 'right') ? 1 : 0) - (k.phit(s.p, 'left') ? 1 : 0), y: (k.phit(s.p, 'down') ? 1 : 0) - (k.phit(s.p, 'up') ? 1 : 0) };
            if (d.x || d.y) { moveSel2(s, d, q.n); k.sfx('click'); }
            if (k.phit(s.p, 'a')) { if (s.sel >= 0) lock2(s, s.sel); else { s.sel = 0; k.sfx('click'); } }
            if (s.p === 0 && !k.party && k.ptr.hit) for (let i = 0; i < q.n; i++) { const [x, y, w, h] = q.n === 2 ? L.tfo(i) : L.opt(i); if (k.ptr.x >= x && k.ptr.x <= x + w && k.ptr.y >= y && k.ptr.y <= y + h) { lock2(s, i); break; } }
          }
        } else {
          if (MAP) { if (!s.cpuLL) cpu2(s, q); if (pt >= s.cpuT) lockMap(s, s.cpuLL); }
          else { if (s.cpuPick < 0) cpu2(s, q); if (pt >= s.cpuT) lock2(s, s.cpuPick); }
        }
      });
      const left = TQ2 - pt;
      if (left < 3.5 && Math.ceil(left) !== tickN) { tickN = Math.ceil(left); if (tickN > 0) k.sfx('tick'); }
      const hs = seats.filter((s) => hum2(s.p));
      if (left <= 0 || seats.every((s) => s.lock) || (hs.length && hs.every((s) => s.lock) && seats.filter((s) => !s.lock).every((s) => s.cpuT - pt < 0.4))) reveal2();
      return;
    }
    if (phase === 'reveal') {
      const dur = MAP ? 4.6 : MAS ? 4 : 3.4, skip = pt > 1.2 && !k.party && (k.hit.has('a') || k.ptr.hit);
      if (pt > dur || skip) { if (qi >= NQ2 - 1) { phase = 'end'; finish2(); } else beginQ2(); }
    }
  }, draw2);

  /* ---------- Dibujo ---------- */
  function nlec(i, s, t) {
    const [x, y, w, h] = LEC(i), col = k.pcol(s.p), pl = k.players(SEATS)[i], rev = phase === 'reveal' || phase === 'end';
    panel(x, y + 16, w, h - 16, 12, ART.dark(col, 0.45));
    c.fillStyle = col; c.fillRect(x + 3, y + 22, w - 6, 5);
    const bx = x + w / 2, by = y + 18 + (s.lock ? 3 : 0), br = LAND ? 20 : 17;
    if (s.lock && !rev) { c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 10); c.fillStyle = col; c.beginPath(); c.arc(bx, by, br + 10, Math.PI, 0); c.fill(); c.restore(); }
    c.beginPath(); c.arc(bx, by, br, Math.PI, 0); c.closePath();
    const g = c.createRadialGradient(bx - 6, by - 10, 2, bx, by, br); g.addColorStop(0, ART.lite(col, 0.55)); g.addColorStop(1, s.lock ? col : ART.dark(col, 0.25));
    c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    const nm = pl.cpu ? pl.name : k.party ? pl.name : 'Tú';
    let st = s.lock ? (rev ? '' : 'Listo') : phase === 'ask' ? '…' : '';
    if (rev) st = MAP ? (s.dist >= 0 ? Math.round(s.dist) + ' km' : 'Sin tiro') : s.lock ? (cur() && cur().n === 2 ? optLab(cur())[s.sel] : 'Dijo ' + LET[s.sel]) : 'Sin respuesta';
    const good = rev && s.gain >= 100;
    if (LAND) {
      outlined(nm, x + 12, y + 44, 18, col, 'left', 4);
      outlined(String(s.score), x + w - 12, y + 44, 24, '#fff', 'right', 5);
      c.font = FONT(14, 700); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#e8e3ff';
      c.fillText(fitStr(st, w - 46, 14), x + 12, y + 66);
      if (rev) (good ? check : cross)(x + w - 18, y + 66, 15, good ? '#7cf7a0' : s.gain ? '#ffd36b' : '#ff6b6b');
    } else {
      outlined(nm, x + w / 2, y + 48, 17, col, 'center', 4);
      outlined(String(s.score), x + w / 2, y + 76, 24, '#fff', 'center', 5);
      if (rev) { c.font = FONT(13, 700); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e8e3ff'; c.fillText(fitStr(st, w - 12, 13), x + w / 2, y + 102); }
      else if (s.lock) { c.font = FONT(14, 700); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e8e3ff'; c.fillText('Listo', x + w / 2, y + 102); }
    }
  }
  function fitStr(t, maxW, size) { c.font = FONT(size, 700); if (c.measureText(t).width <= maxW) return t; let s = t; while (s.length > 3 && c.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; }
  function topBar() {
    const [x, y, w, h] = LM.bar, pw = LAND ? 176 : 156;
    panel(x, y, pw, h, 12, '#3a3478', { drop: 3 });
    outlined(`${MAP ? 'Pista' : 'Pregunta'} ${Math.min(qi + 1, NQ2)}/${NQ2}`, x + pw / 2, y + h / 2, LAND ? 17 : 16, '#fff', 'center', 4);
    const bx = x + pw + 12, bw = x + w - bx;
    panel(bx, y + 5, bw, h - 10, 12, '#15112e', { drop: 2 });
    const fr = phase === 'ask' ? Math.max(0, 1 - pt / TQ2) : 0;
    const col = fr > 0.5 ? '#6fd66f' : fr > 0.25 ? '#ffc94a' : '#ff6b6b';
    if (fr > 0) { c.save(); ART.rr(c, bx + 4, y + 9, Math.max(8, (bw - 8) * fr), h - 18, 8); c.fillStyle = col; c.fill(); c.restore(); }
    if (phase === 'ask') outlined(String(Math.ceil(TQ2 - pt)), bx + bw - 18, y + h / 2, 16, '#fff', 'center', 4);
  }
  function nopt(i, q, t) {
    const two = q.n === 2, [x, y, w, h] = two ? L.tfo(i) : L.opt(i);
    const rev = phase === 'reveal', right = rev && i === q.right, wrong = rev && !right && seats.some((s) => s.lock && s.sel === i);
    let fill = two ? ['#2f5f8a', '#8a5a2f'][i] : '#2d2a5c';
    if (rev && !right) fill = ART.dark(fill, 0.35); if (right) fill = '#34b36b';
    const pul = right ? Math.sin(t * 8) * 2 : 0, sh = wrong ? Math.sin(pt * 40) * Math.max(0, 1 - pt * 2) * 5 : 0;
    panel(x - pul + sh, y - pul, w + pul * 2, h + pul * 2, 16, fill, { stroke: right ? '#eafff0' : OUT, lw: right ? 4 : 3 });
    if (two) {
      const it = q.items[i];
      textBlock(it[0], x + 10 + sh, y + 8, w - 20, h * (LAND ? 0.52 : 0.46), LAND ? 24 : 26, 13, '#fff', 800);
      const shw = rev || phase === 'end';
      c.font = FONT(LAND ? 15 : 16, 800); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = shw ? '#ffd36b' : 'rgba(255,255,255,.5)';
      c.fillText(shw ? fmtVal(it[1], q.set) + (q.set.u ? ' ' + q.set.u : '') : '¿?', x + w / 2 + sh, y + h * (LAND ? 0.74 : 0.7));
      if (!rev) { c.font = FONT(LAND ? 14 : 15, 800); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText(i ? '→' : '←', x + w / 2 + sh, y + h - (LAND ? 20 : 26)); }
    } else {
      const bx = x + (LAND ? 30 : 24), by = LAND ? y + h / 2 : y + 24, lr = LAND ? 20 : 16;
      c.beginPath(); c.arc(bx + sh, by, lr, 0, TAU); c.fillStyle = ART.dark(OPC[i], 0.42); c.fill();
      c.beginPath(); c.arc(bx + sh, by - lr * 0.08, lr * 0.92, 0, TAU); c.fillStyle = OPC[i]; c.fill();
      outlined(LET[i], bx + sh, by + 1, LAND ? 22 : 18, '#fff', 'center', 4);
      const big = CAL ? (LAND ? 30 : 30) : L.of;
      if (LAND) textBlock(q.opts[i], x + 58 + sh, y + 6, w - 70, h - 12, big, 14, '#fff', 800, CAL ? 'center' : 'left');
      else textBlock(q.opts[i], x + 10 + sh, y + 40, w - 20, h - 48, big, 13, '#fff', 800);
    }
    const marks = seats.filter((s) => (phase === 'ask' ? hum2(s.p) && !s.lock && s.sel === i : rev && s.lock && s.sel === i));
    marks.forEach((s, m) => {
      const col = k.pcol(s.p), mx = x + w - 16 - m * 28, my = y + 14;
      if (phase === 'ask') { c.save(); c.strokeStyle = ART.alpha(col, 0.35); c.lineWidth = 9; ART.rr(c, x - 4, y - 4, w + 8, h + 8, 19); c.stroke(); c.strokeStyle = col; c.lineWidth = 5; c.stroke(); c.restore(); }
      c.beginPath(); c.arc(mx, my, 12, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
      const pl = k.players(SEATS)[seats.indexOf(s)];
      c.font = FONT(11, 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; c.fillText(pl.cpu ? 'C' : k.party ? 'J' + (s.p + 1) : 'Tú', mx, my + 1);
    });
  }
  function pin(x, y, col, lab, big) {
    const s = big ? 1.25 : 1;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.ellipse(0, 2, 7, 3, 0, 0, TAU); c.fillStyle = 'rgba(8,4,24,.35)'; c.fill();
    unite8(c, [[(g) => { g.moveTo(0, 0); g.lineTo(-6, -14); g.lineTo(6, -14); g.closePath(); }, ART.dark(col, 0.25)], [(g) => { g.moveTo(8, -19); g.arc(0, -19, 8, 0, TAU); }, col, { dx: 1.4, dy: 1.4 }]], 1.4);
    if (lab) { c.font = FONT(10, 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; c.fillText(lab, 0, -18); }
    c.restore();
  }
  function drawMapQ(t) {
    const q = cur(), rev = phase === 'reveal' || phase === 'end';
    c.drawImage(mapCache(), 0, 0);
    if (rev && q) {
      /* objetivo y tiros */
      if (q.kind === 'rio') { c.save(); c.beginPath(); q.pts.forEach((p, i) => (i ? c.lineTo(px(p[0]), py(p[1])) : c.moveTo(px(p[0]), py(p[1])))); c.lineWidth = 6; c.lineCap = 'round'; c.strokeStyle = ART.alpha('#ffd36b', 0.6 + 0.3 * Math.sin(t * 6)); c.stroke(); c.restore(); }
      seats.forEach((s) => {
        if (!s.guess) return;
        const [gx, gy] = scr(s.guess), tgt = nearest(q, s.guess), [tx, ty] = scr(tgt);
        c.save(); c.setLineDash([5, 4]); c.lineWidth = 2; c.strokeStyle = ART.alpha(k.pcol(s.p), 0.9); c.beginPath(); c.moveTo(gx, gy); c.lineTo(tx, ty); c.stroke(); c.restore();
        pin(gx, gy, k.pcol(s.p), k.party || seats.length > 1 ? String(s.p + 1) : '');
      });
      const tp = q.kind === 'cap' ? q.ll : q.pts[Math.floor(q.pts.length / 2)], [ax, ay] = scr(tp);
      c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 7); c.beginPath(); c.arc(ax, ay, 16, 0, TAU); c.fillStyle = '#ffd36b'; c.fill(); c.restore();
      pin(ax, ay, '#ffd36b', '', 1);
      const [bx, by, bw] = LM.map;
      c.font = FONT(LAND ? 17 : 16, 900); c.textAlign = 'center'; c.textBaseline = 'middle';
      const lw = c.measureText(q.name).width + 24;
      panel(bx + bw / 2 - lw / 2, by + 8, lw, 30, 10, '#1b1640', { drop: 2 });
      outlined(q.name, bx + bw / 2, by + 23, LAND ? 17 : 16, '#ffd36b', 'center', 4);
    } else if (q) {
      seats.forEach((s) => {
        if (!hum2(s.p) || s.lock) return;
        const col = k.pcol(s.p);
        c.save(); c.globalAlpha = 0.9; c.lineWidth = 2; c.strokeStyle = col;
        c.beginPath(); c.moveTo(s.mx - 12, s.my); c.lineTo(s.mx - 4, s.my); c.moveTo(s.mx + 4, s.my); c.lineTo(s.mx + 12, s.my);
        c.moveTo(s.mx, s.my - 12); c.lineTo(s.mx, s.my - 4); c.moveTo(s.mx, s.my + 4); c.lineTo(s.mx, s.my + 12); c.stroke();
        c.beginPath(); c.arc(s.mx, s.my, 3, 0, TAU); c.fillStyle = col; c.fill();
        c.restore();
        pin(s.mx, s.my - 4, col, k.party ? String(s.p + 1) : '');
      });
      seats.forEach((s) => { if (s.lock && s.guess && hum2(s.p)) { const [gx, gy] = scr(s.guess); pin(gx, gy, ART.alpha(k.pcol(s.p), 0.8), ''); } });
    }
  }
  function draw2() {
    const t = performance.now() / 1000;
    c.drawImage(stageBg(), 0, 0); spot(t);
    const q = cur(), [cx0, cy0, cw, ch] = L.card;
    if (!DD || !q) {
      panel(cx0, cy0, cw, ch, 20, '#f6f1ff');
      outlined(CFG.title, W / 2, cy0 + ch * 0.36, LAND ? 38 : 32, '#ffd36b', 'center', 7);
      c.font = FONT(18, 700); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT;
      c.fillText(!DD ? 'Cargando…' : MAP ? 'Mapa mudo de España' : MAS ? 'Dos tarjetas, una respuesta' : BAN ? 'Banderas de todo el mundo' : 'Suma, resta, multiplica y divide', W / 2, cy0 + ch * 0.68);
      (seats || []).forEach((s, i) => nlec(i, s, t));
      return;
    }
    topBar();
    if (MAP) {
      const [px0, py0, pw, phh] = LM.pro;
      panel(px0, py0, pw, phh, 14, '#fbf8ff');
      textBlock(q.t, px0 + 10, py0 + 8, pw - 20, phh - 16, LAND ? 24 : 22, 13, OUT, 800);
      drawMapQ(t);
    } else {
      panel(cx0, cy0, cw, ch, 20, '#fbf8ff');
      c.save(); ART.rr(c, cx0, cy0, cw, ch, 20); c.clip();
      c.fillStyle = MAS ? '#ff5f8f' : BAN ? '#3fb6ea' : '#5fbf45'; c.fillRect(cx0, cy0, cw, LAND ? 30 : 34); c.restore();
      ART.rr(c, cx0, cy0, cw, ch, 20); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
      const lab = (MAS ? q.sub : BAN ? 'Bandera' : 'Cálculo') + ' · ' + ['', 'Fácil', 'Media', 'Difícil'][q.d];
      outlined(lab, cx0 + 16, cy0 + (LAND ? 15 : 17), 16, '#fff', 'left', 4);
      const iy = cy0 + (LAND ? 34 : 40), ih = ch - (LAND ? 42 : 52);
      if (BAN) {
        const fh = Math.min(ih - 4, (cw - 40) / 1.5), fw = fh * 1.5;
        drawFlag(c, cx0 + cw / 2 - fw / 2, iy + ih / 2 - fh / 2, fw, fh, q.flag.o);
      } else if (CAL) {
        outlined(q.t + ' =', cx0 + cw / 2, iy + ih / 2, Math.min(LAND ? 52 : 54, (cw - 40) / (q.t.length * 0.42)), '#2b2456', 'center', 6);
      } else {
        textBlock(q.t, cx0 + 18, iy, cw - 36, ih, LAND ? 26 : 28, 14, OUT, 800);
      }
      for (let i = 0; i < q.n; i++) nopt(i, q, t);
    }
    if (phase === 'ask' && qi < 2) {
      const tx = MAP ? (k.party ? 'Joystick: mueve la chincheta · A: clávala' : 'Toca el mapa para clavar la chincheta')
        : k.party ? 'Joystick: elige · A: responder' : 'Toca tu respuesta (o flechas + Espacio)';
      c.font = FONT(LAND ? 13 : 14, 700); c.textAlign = 'center'; c.textBaseline = 'middle';
      if (MAP && LAND) { c.fillStyle = 'rgba(26,21,48,.75)'; textBlock(tx, LM.pro[0] + 8, LM.pro[1] + LM.pro[3] - 58, LM.pro[2] - 16, 50, 14, 11, 'rgba(26,21,48,.75)', 700); }
      else { c.fillStyle = 'rgba(255,255,255,.75)'; c.fillText(tx, W / 2, LAND ? 362 : 660); }
    }
    seats.forEach((s, i) => nlec(i, s, t));
  }
}
