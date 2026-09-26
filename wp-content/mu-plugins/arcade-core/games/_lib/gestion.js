/* Gestión por tiempo (un jugador): días cortos con objetivo de dinero y una mejora entre día y día.
 * Modos (CFG.mode): 'granja' (sembrar, regar, espantar plagas, cosechar y vender) y 'resto' (sentar, tomar nota, cocinar, servir y limpiar).
 * Todo se juega tocando los puntos de interés; con teclado o mando, las flechas mueven el cursor entre ellos y A actúa. */
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
const M = CFG.mode || 'granja', FARM = M === 'granja';
const OUT = ART.OUT, TAU = Math.PI * 2, lite = ART.lite, dark = ART.dark, alpha = ART.alpha, rr = ART.rr, fillOut = ART.fillOut;
const PORT = innerHeight > innerWidth * 1.05;
const W = PORT ? 480 : 820, H = PORT ? 760 : 480, TOP = PORT ? 96 : 88;
const k = Kit({ w: W, h: H, title: CFG.title, bg: FARM ? '#16321f' : '#1b1430' }), c = k.ctx;
const clamp = k.clamp, hyp = Math.hypot, lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const DAYS = 5, DAYLEN = FARM ? 40 : 45;
const GOAL = FARM ? [22, 60, 110, 175, 250] : [28, 78, 145, 230, 340]; /* dinero acumulado al final de cada día */

/* ---------------------------------------------------------------- distribución de la escena */
const PY = TOP + 8, PH = H - PY - 10;
const LAY = (() => {
  if (FARM) {
    const cols = PORT ? 2 : 4, rows = PORT ? 4 : 2, cell = PORT ? 124 : 116;
    const gw = cols * cell, gh = rows * cell;
    const gx = Math.round((W - gw) / 2) + (PORT ? 0 : 30), gy = Math.round(PY + (PH - gh) / 2) - (PORT ? 26 : 0);
    const P = [];
    for (let r = 0; r < rows; r++) for (let x = 0; x < cols; x++) P.push({ x: gx + x * cell + cell / 2, y: gy + r * cell + cell / 2, r: cell * 0.42 });
    return { P, cell, pozo: PORT ? { x: 62, y: H - 118, r: 42 } : { x: 74, y: PY + PH / 2, r: 44 }, venta: PORT ? { x: W - 68, y: H - 118, r: 44 } : { x: W - 74, y: PY + PH / 2, r: 46 } };
  }
  const T = PORT ? [[124, 300], [340, 300], [124, 470], [340, 470]] : [[290, 176], [452, 176], [290, 338], [452, 338]];
  const F = PORT ? [[92, 636], [240, 636], [388, 636], [240, 544]] : [[672, 150], [672, 270], [672, 390], [780, 270]];
  const door = PORT ? { x: 64, y: 152 } : { x: 74, y: 150 };
  return { T, F, door, queue: PORT ? [[140, 152], [214, 152]] : [[150, 150], [224, 150]] };
})();

/* ---------------------------------------------------------------- estado */
const CROP = { n: 'Tomates', c: '#ff5a5f' };
const DISH = [{ n: 'Sopa', c: '#ffc94d', t: 3.6 }, { n: 'Pescado', c: '#5b8cff', t: 4.4 }, { n: 'Pollo', c: '#e8a35a', t: 5 }, { n: 'Tarta', c: '#ff6fb5', t: 4 }];
const UPG = FARM ? [
  { id: 'reg', n: 'Regadera grande', d: '+2 cargas de agua' },
  { id: 'sem', n: 'Semillas rápidas', d: 'Crecen un 25 % antes' },
  { id: 'rie', n: 'Riego que dura', d: 'La tierra aguanta más' },
  { id: 'pre', n: 'Buen trato', d: 'Precio de venta +25 %' },
  { id: 'esp', n: 'Espantapájaros', d: 'La mitad de plagas' },
] : [
  { id: 'fog', n: 'Fogón extra', d: 'Un plato más a la vez' },
  { id: 'ban', n: 'Bandeja', d: 'Llevas dos platos' },
  { id: 'men', n: 'Carta nueva', d: 'Cada plato paga +25 %' },
  { id: 'pac', n: 'Sala agradable', d: 'Los clientes esperan más' },
  { id: 'lim', n: 'Trapo rápido', d: 'Limpiar es instantáneo' },
];
let day, dayT, money, goal, rep, phase, up, shop, sel, hint, hintT, banner, bt, over;
let plots, agua, aguaMax, almacen, precio, precT, plagaT; /* granja */
let mesas, fogones, cola, colaT, comandas, hands; /* restaurante */
const has = (id) => up.indexOf(id) >= 0;

function reset() {
  day = 1; money = 0; rep = 3; up = []; phase = 'day'; dayT = DAYLEN; over = 0; sel = 0; hint = ''; hintT = 0; banner = ''; bt = 0;
  startDay();
}
function startDay() {
  dayT = DAYLEN; goal = GOAL[day - 1]; phase = 'day'; banner = 'Día ' + day; bt = 1.6;
  if (FARM) {
    aguaMax = 3 + (has('reg') ? 2 : 0); agua = aguaMax; almacen = 0; precio = 4; precT = 6; plagaT = 12;
    plots = LAY.P.map((p, i) => ({ i, st: 0, g: 0, w: 0, bug: 0 }));
  } else {
    mesas = LAY.T.map((p, i) => ({ i, st: 0, cli: null, dirty: 0 }));
    fogones = LAY.F.slice(0, has('fog') ? 4 : 3).map((p, i) => ({ i, dish: -1, t: 0, ready: 0 }));
    cola = []; comandas = []; hands = []; colaT = 2.5; prisa = 0;
  }
}
function say(s) { hint = s; hintT = 1.5; }
function pay(n) { money += n; k.sfx('coin'); }
function loseRep(s) {
  rep--; say(s); k.sfx('hurt'); k.shake(5); k.flash('rgba(255,90,120,.25)');
  if (rep <= 0 && !over) { over = 1; k.st = 'over'; k.lose(CFG.id, money, FARM ? 'La granja se echó a perder' : 'El local se quedó vacío', `Día ${day} · ${money} €`); }
}

/* ---------------------------------------------------------------- puntos de interés */
function spots() {
  const S = [];
  if (phase === 'shop') { shop.forEach((u, i) => S.push({ id: 'u' + i, x: W / 2 + (PORT ? 0 : (i - 1) * 250), y: PORT ? 250 + i * 150 : H / 2, r: PORT ? 66 : 96, u })); return S; }
  if (FARM) {
    plots.forEach((p, i) => S.push({ id: 'p' + i, x: LAY.P[i].x, y: LAY.P[i].y, r: LAY.P[i].r, p }));
    S.push({ id: 'pozo', x: LAY.pozo.x, y: LAY.pozo.y, r: LAY.pozo.r, pozo: 1 });
    S.push({ id: 'venta', x: LAY.venta.x, y: LAY.venta.y, r: LAY.venta.r, venta: 1 });
  } else {
    mesas.forEach((m, i) => S.push({ id: 'm' + i, x: LAY.T[i][0], y: LAY.T[i][1], r: 48, m }));
    fogones.forEach((f, i) => { const q = LAY.F[i]; S.push({ id: 'f' + i, x: q[0], y: q[1], r: 40, f }); });
    S.push({ id: 'door', x: LAY.door.x, y: LAY.door.y, r: 46, door: 1 });
  }
  return S;
}
function act(s) {
  if (!s) return;
  if (phase === 'shop') { up.push(s.u.id); day++; k.sfx('win'); startDay(); return; }
  if (FARM) {
    if (s.pozo) { agua = aguaMax; k.sfx('pop'); say('Regadera llena'); return; }
    if (s.venta) {
      if (!almacen) return say('No tienes nada que vender');
      const pr = Math.round(precio * (has('pre') ? 1.25 : 1)), tot = almacen * pr + (almacen >= 4 ? 6 : 0);
      pay(tot); k.float('+' + tot + ' €', LAY.venta.x, LAY.venta.y - 40, '#a8cf3f'); k.burst(LAY.venta.x, LAY.venta.y - 20, '#ffc94d', 12, 160);
      almacen = 0; return;
    }
    const p = s.p;
    if (p.bug > 0) { p.bug = 0; k.sfx('hit'); k.burst(s.x, s.y, '#a8cf3f', 8, 130); return say('¡Fuera!'); }
    if (p.st === 0) { p.st = 1; p.g = 0; p.w = 0; k.sfx('click'); return; }
    if (p.st === 1) {
      if (p.w > 0.35) return say('Ya está regada');
      if (agua <= 0) return say('Sin agua: ve al pozo');
      agua--; p.w = 1; k.sfx('pop'); k.burst(s.x, s.y - 8, '#5b8cff', 8, 110); return;
    }
    if (p.st === 2) { p.st = 0; p.g = 0; p.w = 0; almacen++; k.sfx('coin'); k.float('+1', s.x, s.y - 30, '#a8cf3f'); return; }
    return;
  }
  /* restaurante */
  if (s.door) { if (cola.length) say('Siéntalos en una mesa libre'); return; }
  if (s.f) {
    const f = s.f;
    if (f.ready) {
      if (hands.length >= (has('ban') ? 2 : 1)) return say('Tienes las manos llenas');
      hands.push(f.dish); f.dish = -1; f.ready = 0; f.t = 0; k.sfx('click'); return;
    }
    if (f.dish >= 0) return say('Se está haciendo');
    if (!comandas.length) return say('No hay comandas');
    f.dish = comandas.shift(); f.t = 0; k.sfx('start'); return;
  }
  const m = s.m;
  if (m.dirty) { m.dirty = has('lim') ? 0 : m.dirty - 1; if (m.dirty) k.sfx('click'); else { k.sfx('pop'); say('Mesa limpia'); } return; }
  if (!m.cli) {
    if (!cola.length) return say('No hay nadie esperando');
    const cl = cola.shift(); cl.st = 'pensando'; cl.t = 1.2; m.cli = cl; k.sfx('click'); return;
  }
  const cl = m.cli;
  if (cl.st === 'pide') { comandas.push(cl.dish); cl.st = 'espera'; k.sfx('click'); k.float('¡Marchando!', s.x, s.y - 44, '#ffc94d'); return; }
  if (cl.st === 'espera') {
    const i = hands.indexOf(cl.dish);
    if (i < 0) return say(hands.length ? 'Ese no es su plato' : 'Recoge el plato del fogón');
    hands.splice(i, 1); cl.st = 'come'; cl.t = 3.2; k.sfx('coin'); return;
  }
  if (cl.st === 'pensando') say('Aún está mirando la carta');
}

/* ---------------------------------------------------------------- lógica */
function update(dt) {
  hintT -= dt; bt -= dt;
  if (!k.gate(reset)) return;
  if (over) return;
  const SP = spots();
  /* cursor con teclado o mando */
  const dir = ['left', 'right', 'up', 'down'].filter((d) => k.hit.has(d))[0];
  if (dir) {
    const cur = SP[clamp(sel, 0, SP.length - 1)], vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    let best = -1, bd = 1e9;
    SP.forEach((s, i) => {
      const dx = s.x - cur.x, dy = s.y - cur.y, pr = dx * vx + dy * vy;
      if (pr < 12) return;
      const off = Math.abs(dx * vy + dy * vx), d = pr + off * 2.2;
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) { sel = best; k.sfx('click'); }
  }
  sel = clamp(sel, 0, SP.length - 1);
  if (k.hit.has('a')) act(SP[sel]);
  if (k.tap) { /* toque directo: el punto más cercano */
    let best = null, bd = 1e9;
    SP.forEach((s, i) => { const d = hyp(s.x - k.ptr.x, s.y - k.ptr.y) - s.r; if (d < bd) { bd = d; best = i; } });
    if (best !== null && bd < 34) { sel = best; act(SP[best]); }
  }
  if (phase === 'shop') return;
  dayT -= dt;
  if (FARM) farm(dt); else resto(dt);
  if (dayT <= 0) endDay();
}
function endDay() {
  if (money < goal) { over = 1; k.st = 'over'; k.sfx('lose'); return k.lose(CFG.id, money, 'No llegaste al objetivo', `Día ${day} · ${money} € de ${goal} €`); }
  if (day >= DAYS) { over = 1; k.st = 'over'; k.sfx('win'); k.confetti(); return k.end(CFG.id, money, FARM ? '¡Temporada completa!' : '¡Semana completa!', `${DAYS} días · ${rep} estrellas`); }
  phase = 'shop'; sel = 0; k.sfx('win');
  shop = k.shuffle(UPG.filter((u) => !has(u.id)).slice()).slice(0, 3);
  if (!shop.length) { day++; startDay(); }
}
function farm(dt) {
  const gs = has('sem') ? 1.34 : 1, dry = has('rie') ? 0.055 : 0.085;
  for (const p of plots) {
    if (p.st === 1) {
      if (p.w > 0) { p.w = Math.max(0, p.w - dt * dry); p.g += dt * gs / 8; }
      if (p.g >= 1) { p.st = 2; p.g = 1; k.sfx('pop'); }
      if (p.bug > 0) { p.bug += dt; if (p.bug > 7) { p.bug = 0; p.st = 0; p.g = 0; p.w = 0; loseRep('Una plaga se comió la cosecha'); } }
    }
  }
  precT -= dt;
  if (precT <= 0) { precT = k.rnd(5, 9); precio = k.ri(3, 7); }
  plagaT -= dt;
  if (plagaT <= 0) {
    plagaT = (has('esp') ? 22 : 11) * lerp(1.6, 0.85, (day - 1) / 4) * k.rnd(0.8, 1.3);
    const cand = plots.filter((p) => p.st === 1 && !p.bug);
    if (cand.length && dayT < DAYLEN - 6) { k.pick(cand).bug = 0.01; k.sfx('hurt'); }
  }
}
function resto(dt) {
  const pac = (has('pac') ? 1.3 : 1) * lerp(1.25, 0.8, (day - 1) / 4);
  colaT -= dt;
  if (colaT <= 0 && cola.length < 2 && dayT < DAYLEN - 3) {
    cola.push({ dish: k.ri(0, DISH.length - 1), st: 'cola', t: 0, pat: 1, pmax: 18 * pac });
    colaT = lerp(7.5, 4.2, (day - 1) / 4) * k.rnd(0.85, 1.2); k.sfx('pop');
  } else if (colaT <= 0) colaT = 2;
  for (let i = cola.length - 1; i >= 0; i--) {
    const cl = cola[i]; cl.pat -= dt / cl.pmax;
    if (cl.pat <= 0) { cola.splice(i, 1); loseRep('Se cansó de esperar en la puerta'); if (over) return; }
  }
  for (const m of mesas) {
    const cl = m.cli; if (!cl) continue;
    if (cl.st === 'pensando') { cl.t -= dt; if (cl.t <= 0) { cl.st = 'pide'; cl.pat = 1; cl.pmax = 20 * pac; } continue; }
    if (cl.st === 'come') {
      cl.t -= dt;
      if (cl.t <= 0) {
        const base = Math.round((10 + cl.dish * 3) * (has('men') ? 1.25 : 1)), tip = Math.round(base * 0.4 * clamp(cl.pat, 0, 1));
        pay(base + tip); k.float('+' + (base + tip) + ' €', LAY.T[m.i][0], LAY.T[m.i][1] - 40, '#a8cf3f'); k.burst(LAY.T[m.i][0], LAY.T[m.i][1], '#ffc94d', 10, 140);
        m.cli = null; m.dirty = has('lim') ? 1 : 2;
      }
      continue;
    }
    cl.pat -= dt / cl.pmax;
    if (cl.pat <= 0) { m.cli = null; m.dirty = 1; loseRep('Un cliente se fue sin comer'); if (over) return; }
  }
  for (const f of fogones) {
    if (f.dish >= 0 && !f.ready) { f.t += dt; if (f.t >= DISH[f.dish].t) { f.ready = 1; k.sfx('pop'); } }
    else if (f.ready) { f.t += dt; if (f.t > DISH[f.dish].t + 14) { f.dish = -1; f.ready = 0; f.t = 0; loseRep('Un plato se quedó frío'); if (over) return; } }
  }
}

/* ---------------------------------------------------------------- dibujo */
function mk(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const q = cv.getContext('2d'); q.scale(2, 2); q.lineJoin = 'round'; if (fn) fn(q); return cv; }
function plain(s, x, y, size, col, align, q) { /* sin contorno: texto oscuro sobre fondo claro */
  q = q || c; q.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; q.textAlign = align || 'center'; q.textBaseline = 'middle';
  q.fillStyle = col; q.fillText(s, x, y);
}
function label(s, x, y, size, col, align, q) {
  q = q || c; q.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; q.textAlign = align || 'center'; q.textBaseline = 'middle';
  q.lineJoin = 'round'; q.lineWidth = size / 4 + 2; q.strokeStyle = OUT; q.strokeText(s, x, y); q.fillStyle = col || '#fff'; q.fillText(s, x, y);
}
function bar(x, y, w, h, p, col) {
  rr(c, x, y, w, h, h / 2); fillOut(c, 'rgba(12,8,28,.72)', 1.6);
  if (p > 0.02) { rr(c, x + 1.5, y + 1.5, Math.max(2, (w - 3) * clamp(p, 0, 1)), h - 3, (h - 3) / 2); c.fillStyle = col; c.fill(); }
}
const BG = mk(W, H, (g) => {
  if (FARM) {
    let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#7fc4e8'); gr.addColorStop(0.42, '#a9dd8f'); gr.addColorStop(1, '#4f8a43'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { const x = (i * 149) % W, y = PY + ((i * 211) % PH); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(x, y, 16, 5, 0, 0, TAU); g.fill(); }
    /* vallas */
    g.strokeStyle = '#8a6a44'; g.lineWidth = 6;
    for (let x = 16; x < W; x += 46) { g.beginPath(); g.moveTo(x, PY + 2); g.lineTo(x, PY + 26); g.stroke(); }
    g.beginPath(); g.moveTo(0, PY + 10); g.lineTo(W, PY + 10); g.stroke();
    return;
  }
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a2152'); gr.addColorStop(1, '#161029'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#3a2f66'; g.fillRect(0, PY, W, PH);
  for (let y = PY; y < H; y += 44) for (let x = ((y / 44) % 2) * 22; x < W; x += 44) { g.fillStyle = 'rgba(255,255,255,.045)'; g.fillRect(x, y, 22, 22); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, PY, W, 6);
});
function plot(s) {
  const p = s.p, x = s.x, y = s.y, R = s.r;
  rr(c, x - R, y - R * 0.82, R * 2, R * 1.64, 10); fillOut(c, p.w > 0.35 ? '#6b4a2e' : '#9a7b52', 3);
  c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 2;
  for (let i = -1; i < 2; i++) { c.beginPath(); c.moveTo(x - R + 8, y + i * 12); c.lineTo(x + R - 8, y + i * 12); c.stroke(); }
  if (p.st === 1) {
    const g = p.g;
    c.strokeStyle = '#3f8c3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y + 12); c.lineTo(x, y + 12 - 22 * g - 6); c.stroke();
    c.beginPath(); c.ellipse(x - 9, y + 2 - 16 * g, 9, 5, -0.5, 0, TAU); fillOut(c, '#5fb04a', 2);
    c.beginPath(); c.ellipse(x + 9, y - 2 - 16 * g, 9, 5, 0.5, 0, TAU); fillOut(c, '#5fb04a', 2);
    bar(x - 22, y + R * 0.6, 44, 6, g, '#a8cf3f');
    if (p.w <= 0.35) { label('sed', x + 26, y - 20, 11, '#ffd0d0'); c.beginPath(); c.moveTo(x + 26, y - 34); c.lineTo(x + 31, y - 26); c.lineTo(x + 21, y - 26); c.closePath(); fillOut(c, '#5b8cff', 2); }
  } else if (p.st === 2) {
    c.strokeStyle = '#3f8c3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y + 14); c.lineTo(x, y - 14); c.stroke();
    for (const [dx, dy] of [[-12, -4], [12, -6], [0, -18]]) { c.beginPath(); c.arc(x + dx, y + dy, 9, 0, TAU); fillOut(c, CROP.c, 2.4); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(x + dx - 3, y + dy - 3, 2.4, 0, TAU); c.fill(); }
    label('¡lista!', x, y + R * 0.72, 12, '#fff27a');
  } else label('sembrar', x, y, 12, 'rgba(255,255,255,.62)');
  if (p.bug > 0) {
    const bx = x + Math.sin(p.bug * 5) * 10, by = y - 22;
    c.beginPath(); c.ellipse(bx, by, 8, 6, 0, 0, TAU); fillOut(c, '#6e62f5', 2.2);
    ART.eyes(c, bx, by - 1, 1.6);
    bar(x - 20, y - 38, 40, 5, 1 - p.bug / 7, '#ff6fb5');
  }
}
function tableDraw(s) {
  const m = s.m, x = s.x, y = s.y;
  ART.shadow(c, x, y + 26, 34, 0.25);
  c.beginPath(); c.ellipse(x, y + 4, 40, 26, 0, 0, TAU); fillOut(c, m.dirty ? '#8d7f5f' : '#e8dfc6', 3);
  if (m.dirty) { c.fillStyle = '#6a5c3d'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x - 16 + i * 11, y + (i % 2 ? 2 : 10), 4, 0, TAU); c.fill(); } label('limpiar', x, y + 34, 12, '#ffd9a0'); }
  const cl = m.cli;
  if (!cl) { if (!m.dirty) label('libre', x, y + 34, 12, 'rgba(255,255,255,.55)'); return; }
  /* comensal */
  c.beginPath(); c.arc(x, y - 30, 15, 0, TAU); fillOut(c, '#ffd9b0', 2.6);
  rr(c, x - 15, y - 20, 30, 22, 9); fillOut(c, ['#6e62f5', '#ff6fb5', '#5b8cff', '#a8cf3f'][cl.dish], 2.6);
  ART.eyes(c, x, y - 31, 2.2);
  if (cl.st === 'pensando') label('…', x + 22, y - 44, 18, '#fff');
  else if (cl.st === 'come') { label('ñam', x + 24, y - 44, 12, '#a8cf3f'); }
  else {
    rr(c, x + 12, y - 58, 44, 26, 8); fillOut(c, '#f6f3e6', 2.4);
    c.beginPath(); c.arc(x + 26, y - 45, 8, 0, TAU); fillOut(c, DISH[cl.dish].c, 2);
    plain(cl.st === 'pide' ? 'nota' : 'ya', x + 44, y - 45, 11, '#1a1530');
    bar(x - 26, y + 32, 52, 7, cl.pat, cl.pat > 0.5 ? '#a8cf3f' : cl.pat > 0.22 ? '#ffc94d' : '#ff6fb5');
  }
}
function stove(s) {
  const f = s.f, x = s.x, y = s.y;
  rr(c, x - 34, y - 26, 68, 52, 10); fillOut(c, '#4b4478', 3);
  rr(c, x - 26, y - 18, 52, 30, 8); fillOut(c, '#2b2546', 2.4);
  if (f.dish < 0) { label('fogón', x, y, 12, 'rgba(255,255,255,.6)'); label('libre', x, y + 34, 11, 'rgba(255,255,255,.45)'); return; }
  c.beginPath(); c.ellipse(x, y - 2, 20, 12, 0, 0, TAU); fillOut(c, '#c9ccd6', 2.4);
  c.beginPath(); c.arc(x, y - 4, 9, 0, TAU); fillOut(c, DISH[f.dish].c, 2);
  if (f.ready) { label('¡listo!', x, y + 30, 13, '#fff27a'); c.globalAlpha = 0.5 + Math.sin(f.t * 7) * 0.3; c.beginPath(); c.arc(x, y - 4, 22, 0, TAU); c.strokeStyle = '#fff27a'; c.lineWidth = 3; c.stroke(); c.globalAlpha = 1; }
  else bar(x - 26, y + 22, 52, 7, f.t / DISH[f.dish].t, '#5b8cff');
  label(DISH[f.dish].n, x, y - 34, 11, '#d8d4f5');
}
function drawShop() {
  c.fillStyle = 'rgba(10,7,24,.82)'; c.fillRect(0, 0, W, H);
  label('Fin del día ' + day, W / 2, PORT ? 150 : 70, 26, '#fff');
  label('Elige una mejora para mañana', W / 2, PORT ? 186 : 104, 15, '#d8d4f5');
  spots().forEach((s, i) => {
    const w = PORT ? 360 : 220, h = PORT ? 118 : 200;
    rr(c, s.x - w / 2, s.y - h / 2, w, h, 16); fillOut(c, i === sel ? '#2f2764' : '#241d4c', i === sel ? 4 : 2.6);
    if (i === sel) { rr(c, s.x - w / 2 + 5, s.y - h / 2 + 5, w - 10, h - 10, 12); c.strokeStyle = '#a097ff'; c.lineWidth = 2; c.stroke(); }
    label(s.u.n, s.x, s.y - (PORT ? 22 : 40), 17, '#ffc94d');
    label(s.u.d, s.x, s.y + (PORT ? 8 : 0), 13, '#d8d4f5');
    label('tocar para elegir', s.x, s.y + (PORT ? 40 : 60), 11, '#8a86b5');
  });
}
function draw() {
  c.drawImage(BG, 0, 0, W, H);
  const SP = spots();
  if (phase === 'shop') { drawShop(); return; }
  if (FARM) {
    SP.forEach((s) => { if (s.p) plot(s); });
    /* pozo */
    const pz = LAY.pozo;
    rr(c, pz.x - 30, pz.y - 18, 60, 40, 10); fillOut(c, '#8a8fa8', 3);
    c.beginPath(); c.ellipse(pz.x, pz.y - 18, 30, 10, 0, 0, TAU); fillOut(c, '#2e4a6b', 2.4);
    label('pozo', pz.x, pz.y + 30, 12, '#fff');
    for (let i = 0; i < aguaMax; i++) { c.beginPath(); c.arc(pz.x - (aguaMax - 1) * 7 + i * 14, pz.y - 34, 5, 0, TAU); fillOut(c, i < agua ? '#5b8cff' : 'rgba(255,255,255,.25)', 2); }
    /* puesto de venta */
    const v = LAY.venta;
    rr(c, v.x - 34, v.y - 16, 68, 38, 8); fillOut(c, '#8a6a44', 3);
    rr(c, v.x - 38, v.y - 30, 76, 16, 6); fillOut(c, '#ff6fb5', 2.6);
    c.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 4; i++) c.fillRect(v.x - 34 + i * 19, v.y - 30, 9, 16);
    label('vender', v.x, v.y + 32, 12, '#fff');
    label(almacen + ' · ' + Math.round(precio * (has('pre') ? 1.25 : 1)) + ' €', v.x, v.y + 4, 14, almacen ? '#fff27a' : 'rgba(255,255,255,.5)');
  } else {
    /* puerta y cola */
    const d = LAY.door;
    rr(c, d.x - 30, d.y - 46, 60, 92, 10); fillOut(c, '#4b4478', 3);
    rr(c, d.x - 20, d.y - 36, 40, 72, 8); fillOut(c, '#2b2546', 2.4);
    label('puerta', d.x, d.y + 58, 12, '#d8d4f5');
    cola.forEach((cl, i) => {
      const q = LAY.queue[Math.min(i, LAY.queue.length - 1)];
      c.beginPath(); c.arc(q[0], q[1] - 16, 14, 0, TAU); fillOut(c, '#ffd9b0', 2.6);
      rr(c, q[0] - 14, q[1] - 6, 28, 22, 9); fillOut(c, ['#6e62f5', '#ff6fb5', '#5b8cff', '#a8cf3f'][cl.dish], 2.6);
      ART.eyes(c, q[0], q[1] - 17, 2.1);
      bar(q[0] - 22, q[1] + 24, 44, 6, cl.pat, cl.pat > 0.5 ? '#a8cf3f' : cl.pat > 0.22 ? '#ffc94d' : '#ff6fb5');
    });
    SP.forEach((s) => { if (s.m) tableDraw(s); else if (s.f) stove(s); });
    /* platos en la mano */
    if (hands.length) {
      const hx = PORT ? W / 2 : W - 90, hy = PORT ? H - 34 : H - 36;
      label('llevas', hx - 54, hy, 12, '#d8d4f5');
      hands.forEach((dh, i) => { const x = hx + i * 34; c.beginPath(); c.ellipse(x, hy, 16, 9, 0, 0, TAU); fillOut(c, '#eef1f7', 2.4); c.beginPath(); c.arc(x, hy - 2, 7, 0, TAU); fillOut(c, DISH[dh].c, 2); });
    }
    if (comandas.length) label('comandas: ' + comandas.length, PORT ? W / 2 : W - 118, PORT ? 586 : PY + 16, 13, '#ffc94d');
  }
  /* cursor */
  const s = SP[clamp(sel, 0, SP.length - 1)];
  if (s) { c.save(); c.globalAlpha = 0.85; c.strokeStyle = '#a097ff'; c.lineWidth = 3; c.setLineDash([7, 6]); c.lineDashOffset = -performance.now() / 55; c.beginPath(); c.arc(s.x, s.y, s.r + 8, 0, TAU); c.stroke(); c.restore(); }
  /* HUD */
  c.fillStyle = 'rgba(16,11,34,.92)'; c.fillRect(0, 0, W, TOP); c.fillStyle = OUT; c.fillRect(0, TOP - 3, W, 3);
  label('Día ' + day + '/' + DAYS, 12, 22, 17, '#fff', 'left');
  label(money + ' €', 12, 50, 24, money >= goal ? '#a8cf3f' : '#ffc94d', 'left');
  label('objetivo ' + goal + ' €', 12, 74, 12, '#b8b0ff', 'left');
  bar(PORT ? 150 : 200, 16, PORT ? 180 : 300, 10, money / goal, money >= goal ? '#a8cf3f' : '#6e62f5');
  for (let i = 0; i < 3; i++) ART.heart(c, W - 22 - i * 24, 26, 1.4, i < rep);
  label(Math.ceil(dayT) + ' s', W - 12, 54, 18, dayT < 10 ? '#ff6fb5' : '#d8d4f5', 'right');
  bar(W - 108, 72, 96, 7, dayT / DAYLEN, dayT < 10 ? '#ff6fb5' : '#6e62f5');
  if (FARM) label('mercado ' + Math.round(precio * (has('pre') ? 1.25 : 1)) + ' €', PORT ? 150 : 200, 46, 13, '#d8d4f5', 'left');
  else label('mesas listas: ' + mesas.filter((m) => !m.cli && !m.dirty).length, PORT ? 150 : 200, 46, 13, '#d8d4f5', 'left');
  if (up.length) label(up.map((u) => UPG.find((q) => q.id === u).n).join(' · '), PORT ? 150 : 200, 70, 11, '#8a86b5', 'left');
  if (hintT > 0) {  // el aviso lleva su propia chapa oscura: si no, se pierde sobre la valla o el suelo claro
    c.globalAlpha = Math.min(1, hintT * 3);
    c.font = '800 16px ui-rounded,"Trebuchet MS",system-ui,sans-serif';
    const hw = c.measureText(hint).width + 30;
    rr(c, W / 2 - hw / 2, TOP + 10, hw, 32, 16); fillOut(c, '#140f2e', 2);
    label(hint, W / 2, TOP + 26, 16, '#ffd0e6'); c.globalAlpha = 1;
  }
  if (bt > 0) { c.globalAlpha = Math.min(1, bt); label(banner, W / 2, H / 2 - 40, 44, '#fff'); c.globalAlpha = 1; }
}

reset();
k.show(CFG.title || (FARM ? 'Granja de Bolsillo' : 'Restaurante Rápido'),
  (FARM
    ? 'Toca una parcela para sembrar, tócala otra vez para regarla y recógela cuando esté lista. Llena la regadera en el pozo y vende la cosecha en el puesto al precio del momento. Si ves un bicho, tócalo antes de que se coma la planta.'
    : 'Toca una mesa libre para sentar al cliente que espera, tócalo otra vez para tomarle nota, pon la comanda en un fogón, recoge el plato cuando esté listo y llévalo a su mesa. Después limpia la mesa.')
  + `<br>Días de ${DAYLEN} s con un objetivo de dinero; al final de cada día eliges una mejora. Con teclado o mando, las flechas mueven el cursor y A actúa.<br>Toca para empezar`);
k.run(update, draw);
window.__ge = { get day() { return day; }, get money() { return money; }, get rep() { return rep; }, get phase() { return phase; }, get plots() { return typeof plots !== 'undefined' ? plots : null; }, get mesas() { return typeof mesas !== 'undefined' ? mesas : null; } };
