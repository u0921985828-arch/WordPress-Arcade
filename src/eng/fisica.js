/* fisica — motor de cuerpos con físicas, muñecos articulados y empujones (oleada 3).
 * Modos (CFG.mode):
 *  'pulso'    Pulso de Titanes (1–2): pulso sobre la mesa; se empuja pulsando al ritmo del corazón del rival.
 *  'justa'    Justa de Caballeros (1–2): carga a caballo eligiendo lanza alta o baja y escudo alto o bajo.
 *  'orbita'   Almohadas en Órbita (2–4): gravedad cero; cada almohadazo empuja también a quien lo da.
 *  'gravedad' Gravedad Compartida (2–4, cooperativo): la gravedad apunta hacia donde más jugadores pulsan.
 *  'lava'     El Suelo es Lava (2–4): saltos entre muebles mientras sube la lava, con empujones.
 * Integración con subpasos fijos de 1/120 s (los cuerpos no se atraviesan a 30–144 Hz) y muñecos articulados
 * dibujados con cinemática inversa de dos segmentos. La CPU rellena las plazas libres y mejora con las
 * victorias guardadas en localStorage (cpu:<id>). Mando: joystick + A/B (tele, teclado o mando virtual). */
const M = CFG.mode || 'lava', OUT = ART.OUT, TAU = Math.PI * 2;
const { lite, dark, alpha, rr, fillOut, shadow, glint } = ART;
const PORT = innerHeight > innerWidth * 1.05;
const W = PORT ? 480 : 760, H = PORT ? 720 : 480;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#120e26' }), c = k.ctx;
/* ---------- PZ · Ley de la pieza única + cartoon de estudio (docs/REMASTER.md §8) ----------
   Un objeto que el jugador lee como UNA cosa se traza entero, se contornea UNA vez y se rellena
   UNA vez: `PZ.unite()` contornea todas las partes primero y las rellena después, así cualquier
   borde interior queda tapado y sólo sobrevive la silueta. El detalle interior va recortado
   (`PZ.in`, y `PZ.cut` sobre el lienzo de partida, donde `source-atop` costaría un compuesto de
   pantalla completa). Sólo se separa lo que se mueve de verdad (rueda, torreta, arma, paño).
   Cartoon de estudio: 3 tonos por pieza con borde duro (`cel`), párpado superior recto, cejas
   gruesas, manoplas con pulgar, un óvalo especular y sombra de contacto dura. */
const PZ = (() => {
  const O = ART.OUT, AL = ART.alpha, DK = ART.dark, LT = ART.lite, R2 = Math.PI * 2;
  const DPR = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  const OW = 1.5, IW = 0.7, IA = 0.62, CH = {};
  const P = {
    O, R2, DPR,
    /* --- trazados reutilizables (sólo trazan; no rellenan ni contornean) --- */
    blob: (x, y, rx, ry, rot) => (g) => { g.moveTo(x + rx, y); g.ellipse(x, y, rx, Math.abs(ry), rot || 0, 0, R2); },
    /* rr compatible con Path2D (ART.rr llama a beginPath y no vale aquí) */
    box: (x, y, w, h, r) => (g) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); },
    /* hueso de ancho variable: baja por un costado, redondea la punta y vuelve por el otro; la raíz
       queda abierta y enterrada en el tronco → tangente continua en hombro y cadera. */
    bone(pts, ws) {
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
    },
    /* manopla: bola grande con el pulgar marcado (media cabeza de ancho) */
    mitt(x, y, a, r, s) {
      const tx = x + Math.cos(a - s * 1.2) * r * 0.85, ty = y + Math.sin(a - s * 1.2) * r * 0.85;
      return (g) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, R2); g.moveTo(tx + r * 0.47, ty); g.arc(tx, ty, r * 0.47, 0, R2); };
    },
    /* --- el mecanismo: contornear todo, rellenar todo ---
       Todas las partes se acumulan en UN Path2D y se contornean de una sola pasada (una llamada a
       stroke en vez de N: es lo que hace que la pieza única salga más barata que el collage). Luego
       se rellenan en orden; las partes contiguas del mismo color se funden en un solo relleno.
       Devuelve el Path2D de la silueta para recortar el detalle contra él sin volver a trazarlo. */
    unite(g, parts, ow) {
      g.lineJoin = 'round'; g.lineCap = 'round';
      const all = new Path2D(), ds = [];
      for (let i = 0; i < parts.length; i++) { const d = new Path2D(); parts[i][0](d); ds.push(d); all.addPath(d); }
      g.strokeStyle = O; g.lineWidth = (ow || OW) * 2; g.stroke(all);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p[2]) { /* sombra propia: la separación interna se lee por valor, nunca por stroke */
          g.save(); g.globalCompositeOperation = 'source-atop';
          g.strokeStyle = AL(O, 0.15); g.lineWidth = p[2]; g.stroke(ds[i]);
          g.lineWidth = p[2] * 0.45; g.stroke(ds[i]); g.restore();
        }
        /* cada pieza se rellena por separado: fundir dos trazados en un Path2D los sumaría con la
           regla «nonzero» y dos sentidos de giro contrarios abrirían un hueco (bota con agujero). */
        g.fillStyle = p[1]; g.fill(ds[i]);
        if (p[3]) P.cel(g, p[0], p[1], p[3] === true ? null : p[3]);
        if (p[4]) P.in(g, p[0], p[4]);
      }
      return all;
    },
    /* 3 tonos con borde duro: la pieza en sombra, encima la misma pieza desplazada hacia la luz */
    cel(g, path, base, o) {
      o = o || {}; const dx = o.dx == null ? 2.2 : o.dx, dy = o.dy == null ? 2 : o.dy, f = o.f == null ? 1 : o.f, E = g.__ext || 260;
      g.save(); g.beginPath(); path(g); g.clip();
      g.fillStyle = DK(base, 0.26 * f); g.fillRect(-E, -E, E * 2, E * 2);
      g.translate(-dx, -dy); g.beginPath(); path(g); g.fillStyle = base; g.fill();
      if (o.hi !== false && f > 0.35) { g.translate(-dx * 1.15, -dy * 1.15); g.beginPath(); path(g); g.fillStyle = LT(base, 0.2 * f); g.fill(); }
      g.restore();
    },
    /* detalle de una pieza, recortado contra ella y contra lo ya pintado (sólo fuera de pantalla) */
    in(g, path, fn) { g.save(); g.globalCompositeOperation = 'source-atop'; if (path instanceof Path2D) g.clip(path); else { g.beginPath(); path(g); g.clip(); } fn(g); g.restore(); },
    /* igual, para el lienzo de partida: recorte a secas */
    cut(g, path, fn) { g.save(); if (path instanceof Path2D) g.clip(path); else { g.beginPath(); path(g); g.clip(); } fn(g); g.restore(); },
    /* óvalo especular y sombra de contacto duras */
    shine(g, x, y, rx, ry, rot, a) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, R2); g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.42 : a) + ')'; g.fill(); },
    drop(g, x, y, rx, ry, a) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, R2); g.fillStyle = AL(O, a == null ? 0.3 : a); g.fill(); },
    /* --- la cara manda: ojo grande con PÁRPADO SUPERIOR recto --- */
    eyes(g, cx, cy, sep, r, lx, ly, o) {
      o = o || {}; const ry = r * (o.sq || 1), lid = o.lid == null ? 0.24 : o.lid, tilt = o.tilt || 0;
      for (const s of [-1, 1]) {
        g.save(); g.translate(cx + s * sep, cy);
        if (o.shut) {
          g.beginPath(); g.moveTo(-r, -ry * 0.1); g.quadraticCurveTo(0, ry * 0.75, r, -ry * 0.1);
          g.lineWidth = Math.max(0.9, r * 0.3); g.strokeStyle = AL(O, 0.9); g.lineCap = 'round'; g.stroke(); g.restore(); continue;
        }
        g.beginPath(); g.ellipse(0, 0, r, ry, 0, 0, R2); g.fillStyle = o.white || '#fff'; g.fill();
        const ix = (lx || 0) * r * 0.36, iy = (ly || 0) * ry * 0.32 + ry * 0.08;
        g.beginPath(); g.arc(ix, iy, r * 0.62, 0, R2); g.fillStyle = o.iris || '#3a5bb8'; g.fill();
        g.beginPath(); g.arc(ix, iy, r * 0.32, 0, R2); g.fillStyle = O; g.fill();
        g.beginPath(); g.arc(ix - r * 0.32, iy - r * 0.36, r * 0.23, 0, R2); g.fillStyle = '#fff'; g.fill();
        g.rotate(s * tilt);
        g.beginPath(); g.ellipse(0, 0, r * 1.06, ry * 1.06, 0, 0, R2); g.clip();
        const y0 = -ry + ry * 2 * lid;
        g.fillStyle = o.lidCol || '#ffd3ad'; g.fillRect(-r * 1.3, -ry * 1.5, r * 2.6, y0 + ry * 1.5);
        g.fillStyle = AL(O, 0.92); g.fillRect(-r * 1.3, y0 - r * 0.2, r * 2.6, Math.max(0.7, r * 0.2));
        g.restore();
      }
    },
    /* cejas gruesas y móviles; tilt>0 = enfado */
    brows(g, cx, cy, sep, len, tilt, col, th) {
      th = th || 1.5; g.fillStyle = col || O;
      for (const s of [-1, 1]) { g.beginPath(); P.bone([[cx + s * (sep - len * 0.45), cy + tilt], [cx + s * (sep + len * 0.55), cy - tilt * 0.85]], [th, th * 0.5])(g); g.fill(); }
    },
    /* boca grande: 0 sonrisa · 1 abierta · 2 mueca · 3 recta · 4 «o» · 5 triste */
    mouth(g, x, y, w, kind, col) {
      if (kind === 1 || kind === 4) {
        g.beginPath(); g.ellipse(x, y + w * 0.16, w * (kind === 4 ? 0.5 : 0.7), w * (kind === 4 ? 0.62 : 0.76), 0, 0, R2);
        g.fillStyle = col || '#5e2436'; g.fill();
        if (kind === 1) { g.beginPath(); g.ellipse(x, y + w * 0.6, w * 0.4, w * 0.28, 0, 0, R2); g.fillStyle = '#e0607e'; g.fill(); }
        return;
      }
      g.lineWidth = Math.max(0.9, w * 0.26); g.strokeStyle = col || AL(O, 0.92); g.lineCap = 'round'; g.beginPath();
      if (kind === 2) { g.moveTo(x - w * 0.7, y); g.lineTo(x - w * 0.24, y + w * 0.34); g.lineTo(x + w * 0.24, y); g.lineTo(x + w * 0.7, y + w * 0.34); }
      else if (kind === 3) { g.moveTo(x - w * 0.6, y + w * 0.1); g.lineTo(x + w * 0.6, y + w * 0.1); }
      else if (kind === 5) { g.moveTo(x - w * 0.62, y + w * 0.36); g.quadraticCurveTo(x, y - w * 0.22, x + w * 0.62, y + w * 0.36); }
      else { g.moveTo(x - w * 0.62, y - w * 0.04); g.quadraticCurveTo(x, y + w * 0.62, x + w * 0.62, y - w * 0.04); }
      g.stroke();
    },
    /* --- cachés --- */
    /* lienzo cacheado genérico, a Math.min(2, dpr) */
    cv(w, h, s, fn) {
      const q = document.createElement('canvas'); s = s || DPR;
      q.width = Math.max(1, Math.round(w * s)); q.height = Math.max(1, Math.round(h * s));
      const g = q.getContext('2d'); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
      g.__ext = Math.max(w, h) * 1.5; if (fn) fn(g); q.iw = w; q.ih = h; return q;
    },
    /* sprite de personaje/objeto: ×3 lógico para que la línea fina no se rompa. (0,0) = ancla */
    spr(key, w, h, ax, ay, fn) {
      let q = CH[key]; if (q) return q;
      q = P.cv(w, h, 3, (g) => { g.translate(ax, ay); fn(g); });
      q.ax = ax; q.ay = ay; CH[key] = q; return q;
    },
    /* pinta un sprite con su ancla en (x,y) */
    put(g, q, x, y, s, rot, a) {
      s = s == null ? 1 : s;
      if (rot) { g.save(); g.translate(x, y); g.rotate(rot); x = 0; y = 0; }
      if (a != null) g.globalAlpha = a;
      g.drawImage(q, x - q.ax * s, y - q.ay * s, q.iw * s, q.ih * s);
      if (a != null) g.globalAlpha = 1;
      if (rot) g.restore();
    },
    has: (key) => !!CH[key],
  };
  return P;
})();
const MD = {
  pulso: { np: 2, rounds: 3, len: 45, ww: 440, wh: 310 },
  justa: { np: 2, rounds: 5, len: 26, ww: 740, wh: 300 },
  orbita: { np: 4, rounds: 3, len: 60, ww: 470, wh: 470, elim: 1 },
  gravedad: { np: 4, rounds: 1, len: 95, ww: 440, wh: 440, coop: 1 },
  lava: { np: 4, rounds: 3, len: 75, ww: 520, wh: 400, elim: 1 },
}[M];
const NP = MD.np, WW = MD.ww, WH = MD.wh;
/* franja de marcadores arriba; el mundo del modo se escala para caber debajo en las dos orientaciones */
const CH = 52, TOP = PORT ? 8 + CH + 6 + 40 + 6 : 8 + CH + 24, SY = TOP, SH = H - TOP - 8;
const SC = Math.min(W / WW, SH / WH), OXo = (W - WW * SC) / 2;
/* en vertical el escenario se ancla arriba: el hueco sobrante queda abajo, donde va la franja del mando */
const OYo = SY + (SH - WH * SC) / 2;
const vx = (x) => OXo + x * SC, vy = (y) => OYo + y * SC;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1), hyp = Math.hypot;
const adiff = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const rs = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const FX = 1 / 120; /* subpaso fijo de la física */
let CPU = 0; try { CPU = clamp(+localStorage.getItem('cpu:' + CFG.id) || 0, 0, 8); } catch (e) { /* sin almacenamiento */ }
const skill = () => Math.min(0.78, 0.2 + CPU * 0.05 + (round - 1) * 0.03);
const soft = () => lerp(0.75, 1, rt / 8); /* arranque suave: nada va a tope en los primeros segundos */

function mk(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const q = cv.getContext('2d'); q.scale(2, 2); if (fn) fn(q); return cv; }
function label(s, x, y, size, col, align, q) {
  q = q || c; q.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; q.textAlign = align || 'center'; q.textBaseline = 'middle';
  q.lineJoin = 'round'; q.lineWidth = size / 4 + 2; q.strokeStyle = OUT; q.strokeText(s, x, y); q.fillStyle = col || '#fff'; q.fillText(s, x, y);
}
function fit(s, w, base) { let f = base; do { c.font = `800 ${f}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; } while (c.measureText(s).width > w && --f > 9); return f; }

/* ---------------------------------------------------------------- Muñecos articulados */
function seg(pts, w, col, back) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = w + 2.6; c.stroke(); c.strokeStyle = back ? dark(col, 0.28) : col; c.lineWidth = w; c.stroke();
}
/* codo/rodilla de una cadena de dos segmentos que alcanza el objetivo (cinemática inversa) */
function ik(x0, y0, x1, y1, l1, l2, bend) {
  const dx = x1 - x0, dy = y1 - y0; let d = hyp(dx, dy) || 0.001; d = Math.min(d, l1 + l2 - 0.001);
  const a = Math.atan2(dy, dx), co = clamp((d * d + l1 * l1 - l2 * l2) / (2 * d * l1), -1, 1), an = Math.acos(co) * (bend || 1);
  return [x0 + Math.cos(a + an) * l1, y0 + Math.sin(a + an) * l1];
}
/* --- Muñeco de una sola pieza (§8) con diseño cartoon de estudio ---------------------------
   Antes era un collage: cada brazo, cada pierna, el torso y la cabeza se contorneaban por
   separado y se veían las junturas. Ahora el cuerpo se declara como una lista de piezas
   (huesos de ancho variable, tronco, cabeza, tocado, manoplas) y `PZ.unite` las contornea TODAS
   antes de rellenarlas: los bordes interiores quedan tapados y sobrevive una sola silueta.
   Proporción de apelación ~1:2,3 (cabeza r 11 sobre 52 de alto), extremidades cortas y gruesas,
   manoplas con pulgar y botas redondas. Volumen por cel shading de borde duro, no por degradado.
   Sólo se separa del cuerpo lo que se mueve de verdad (la lanza, el escudo: van en `o.after`). */
/* La cara manda, y no cambia con la pose: se cachea a ×3 y se pega sobre la cabeza. No lleva
   contorno propio (son rasgos, no piezas), así que la silueta sigue siendo una sola. */
function faceSpr(hr, f, col, skin, mouth, shut) {
  return PZ.spr(`f${hr}|${f}|${col}|${skin}|${mouth}|${shut ? 1 : 0}`, hr * 2.4, hr * 2.4, hr * 1.2, hr * 1.2, (g) => {
    PZ.shine(g, -hr * 0.42, -hr * 0.48, hr * 0.32, hr * 0.18, -0.6, 0.4);
    const ex = hr * 0.24 * f, er = hr * 0.27, grr = mouth === 'grr';
    PZ.eyes(g, ex, -hr * 0.06, hr * 0.32, er, f, 0.1, { shut, lidCol: skin, lid: shut ? 0 : 0.22, tilt: grr ? 0.4 : 0.12 });
    PZ.brows(g, ex, -hr * 0.46, hr * 0.32, hr * 0.34, grr ? hr * 0.14 : mouth === 'sad' ? -hr * 0.1 : hr * 0.04, dark(col, 0.5), hr * 0.13);
    PZ.mouth(g, ex * 1.3, hr * 0.42, hr * 0.34, FACE_EXPR[mouth] == null ? 0 : FACE_EXPR[mouth]);
  });
}
const FACE_EXPR = { o: 4, sad: 5, grr: 2, '': 0 };
/* codo/rodilla con segmentos proporcionales: la articulación se insinúa y el hueso nunca se dobla
   sobre sí mismo (un bucle abriría un hueco en el relleno y rompería la pieza única). */
function joint(x0, y0, x1, y1, bend) { const l = Math.max(hyp(x1 - x0, y1 - y0) * 0.53 + 1.6, 5); return ik(x0, y0, x1, y1, l, l, bend * 0.38); }
function puppet(x, y, s, col, o) {
  o = o || {};
  const hands = o.hands || [[-13, 1], [13, 1]], feet = o.feet || [[-6, 22], [6, 22]];
  const hr = o.hr == null ? 11 : o.hr + 2, hy = o.hy == null ? -22 : o.hy;
  const f = o.face === -1 ? -1 : 1, fr = o.front == null ? 1 : o.front;
  const skin = o.skin || '#ffd9b5', leg = dark(col, 0.34), parts = [];
  c.save(); c.translate(x, y); c.scale(s, s); if (o.rot) c.rotate(o.rot);
  if (o.shadow !== false) { c.beginPath(); c.ellipse(0, 25, 13, 4.4, 0, 0, TAU); c.fillStyle = alpha(OUT, 0.26); c.fill(); }
  /* piernas: hueso grueso que nace DENTRO del tronco (tangente continua en la cadera) y bota redonda.
     La rodilla/codo se resuelve con segmentos proporcionales a la distancia: así la articulación se
     insinúa sin que el hueso se doble sobre sí mismo (y sin bucles que abrirían un hueco). */
  for (let i = 0; i < 2; i++) {
    const [fx2, fy2] = feet[i], hx0 = i ? 4.5 : -4.5, kn = joint(hx0, 4, fx2, fy2 - 3, i ? 1 : -1);
    parts.push([PZ.bone([[hx0, -2], kn, [fx2, fy2 - 2.5]], [6, 4.8, 3.8]), leg]);
    parts.push([PZ.blob(fx2 + f * 1.8, fy2 - 0.6, 6, 4.4), leg]);
  }
  /* brazo de atrás (más oscuro: la separación se lee por valor, nunca por contorno) */
  for (let i = 0; i < 2; i++) if (i !== fr) {
    const [hx2, hy2] = hands[i], sx = i ? 7.4 : -7.4, el = joint(sx, -13, hx2, hy2, i ? 1 : -1);
    parts.push([PZ.bone([[sx, -15], el, [hx2, hy2]], [5.2, 4.2, 3.2]), dark(col, 0.32)]);
    parts.push([PZ.mitt(hx2, hy2, Math.atan2(hy2 - el[1], hx2 - el[0]), 4.3, i ? 1 : -1), dark(skin, 0.3)]);
  }
  parts.push([PZ.box(-8.6, -18, 17.2, 27, 8.4), col]);                   /* tronco compacto */
  if (o.belt) parts.push([PZ.box(-8.6, 1, 17.2, 5.2, 2.4), '#ffc94d']);
  parts.push([PZ.blob(0, hy, hr, hr * 1.02), skin]);                      /* cabeza grande */
  if (o.helm) {                                                           /* yelmo: se hunde en la cabeza */
    parts.push([(g) => { g.moveTo(-hr - 1.4, hy + 1.5); g.quadraticCurveTo(-hr - 1.4, hy - hr - 3, 0, hy - hr - 3); g.quadraticCurveTo(hr + 1.4, hy - hr - 3, hr + 1.4, hy + 1.5); g.closePath(); }, '#c8ccd8']);
    parts.push([PZ.box(-2.6, hy - hr - 11, 5.2, 9, 2), col]);
  } else if (o.hair !== false) {                                          /* pelo: 3 mechones con punta */
    parts.push([(g) => {
      g.moveTo(-hr * 0.98, hy + 1);
      g.quadraticCurveTo(-hr * 1.06, hy - hr * 0.95, -hr * 0.2, hy - hr * 1.02);
      g.lineTo(-hr * 0.5, hy - hr * 1.5); g.lineTo(hr * 0.1, hy - hr * 1.05);
      g.lineTo(hr * 0.16, hy - hr * 1.52); g.lineTo(hr * 0.66, hy - hr * 0.92);
      g.lineTo(hr * 1.02, hy - hr * 1.18); g.quadraticCurveTo(hr * 1.06, hy - hr * 0.4, hr * 0.94, hy - hr * 0.1);
      g.quadraticCurveTo(0, hy - hr * 0.62, -hr * 0.98, hy + 1); g.closePath();
    }, dark(col, 0.45)]);
  }
  /* brazo de delante: cruza por encima, así que sí es pieza propia (se mueve de verdad) */
  for (let i = 0; i < 2; i++) if (i === fr) {
    const [hx2, hy2] = hands[i], sx = i ? 7.4 : -7.4, el = joint(sx, -13, hx2, hy2, i ? 1 : -1);
    parts.push([PZ.bone([[sx, -15], el, [hx2, hy2]], [5.4, 4.4, 3.4]), col]);
    parts.push([PZ.mitt(hx2, hy2, Math.atan2(hy2 - el[1], hx2 - el[0]), 4.6, i ? 1 : -1), skin]);
  }
  const sil = PZ.unite(c, parts, 1.5);
  /* volumen en 2 planos de borde duro: un solo recorte contra la silueta ya trazada */
  PZ.cut(c, sil, (g) => { g.translate(2, 1); g.rotate(-0.5); g.fillStyle = alpha(OUT, 0.17); g.fillRect(-70, 2, 140, 140); });
  PZ.put(c, faceSpr(hr, f, col, skin, o.mouth || '', !!o.shut), 0, hy);
  if (o.after) o.after();
  c.restore();
}

/* ---------------------------------------------------------------- Jugadores, rondas y puntos */
let P = [], round = 0, rt = 0, T = 0, phase = 'play', btw = 0, banner = null, cdPend = false, elimOrder = [], S = {}, fxs = [], acc = 0;
const tagOf = (pl) => (pl.cpu ? (NP > 2 ? pl.name : 'CPU') : k.party ? 'J' + (pl.p + 1) : 'TÚ');
const alive = () => P.filter((pl) => pl.alive);
function mkPlayers() { P = k.players(NP).map((q, i) => ({ i, p: q.p, col: q.color, name: q.name, cpu: q.cpu, pts: 0, wins: 0, gain: 0, ai: { t: 0 } })); }
function syncPlayers() { const pl = k.players(NP); P.forEach((x, i) => { x.cpu = pl[i].cpu; x.name = pl[i].name; x.col = pl[i].color; }); }
k.onParty = () => { if (k.st !== 'play') { reset(); return; } syncPlayers(); };
function newRound() {
  round++; rt = 0; phase = 'play'; cdPend = true; banner = null; elimOrder = []; S = {}; fxs = []; acc = 0;
  P.forEach((pl) => Object.assign(pl, { x: 0, y: 0, vx: 0, vy: 0, alive: true, out: 0, cd: 0, stun: 0, inv: 0, gain: 0, hit: 0, ai: { t: 0 } }));
  MODES[M].init();
}
function reset() { mkPlayers(); round = 0; newRound(); }
function eliminate(pl, txt) {
  if (!pl.alive) return; pl.alive = false; pl.out = rt; elimOrder.push(pl.i);
  const ft = txt || '¡Fuera!'; k.sfx('hurt'); k.float(ft, fltX(ft, vx(pl.x)), clamp(vy(pl.y) - 26, SY + 14, SY + SH - 14), pl.col); k.shake(4);
}
function rankKey(pl) { const md = MODES[M]; if (MD.elim) return pl.alive ? 1e6 + (md.key ? md.key(pl) : 0) : pl.out * 100 + elimOrder.indexOf(pl.i); return md.key(pl); }
function endRound() {
  const md = MODES[M];
  if (md.pts) md.pts(); /* la justa reparte los puntos de la lanza */
  else { const key = new Map(P.map((pl) => [pl, rankKey(pl)])), order = P.slice().sort((a, b) => key.get(b) - key.get(a)), PT = NP === 2 ? [1, 0] : [3, 2, 1, 0];
    order.forEach((pl, j) => { pl.gain = j && Math.abs(key.get(pl) - key.get(order[j - 1])) < 1e-6 ? order[j - 1].gain : PT[j]; }); }
  P.forEach((pl) => { pl.pts += pl.gain; });
  const order = P.slice().sort((a, b) => b.gain - a.gain || b.pts - a.pts), tie = order.length > 1 && order[1].gain === order[0].gain;
  if (!tie) order[0].wins++;
  phase = 'between'; btw = 3.4; banner = { order, tie };
  k.sfx(!tie && order[0].cpu && !k.party ? 'lose' : 'win');
  if (md.stop) md.stop();
}
function finish() {
  const sc = (pl) => pl.pts * 100 + pl.wins, best = Math.max(...P.map(sc)), win = P.filter((pl) => sc(pl) === best);
  if (win.length === 1) { CPU = clamp(CPU + (win[0].cpu ? -1 : 1), 0, 8); try { localStorage.setItem('cpu:' + CFG.id, CPU); } catch (e) { /* sin almacenamiento */ } }
  k.podium(P.map((pl) => ({ p: pl.p, score: sc(pl), name: pl.name })), { fmt: (v) => Math.floor(v / 100) + ' pts', head: !k.party && win.length === 1 && !win[0].cpu ? '¡Has ganado!' : undefined });
}
/* entrada del jugador humano (teclado, mando de la tele o mando virtual; J1 también con el dedo) */
function human(pl) {
  const d = k.pdir(pl.p), solo = !k.party && pl.p === 0;
  let x = d.x, y = d.y; const L = hyp(x, y); if (L > 1) { x /= L; y /= L; }
  return { x, y, a: k.pheld(pl.p, 'a') || (solo && k.ptr.down && !MD.coop), ah: k.phit(pl.p, 'a') || (solo && k.tap), b: k.pheld(pl.p, 'b'), bh: k.phit(pl.p, 'b') };
}
function inputs(pl, dt) { return pl.cpu ? MODES[M].ai(pl, pl.ai, skill(), dt) || { x: 0, y: 0 } : human(pl); }
function spark(x, y, col, n, v) { k.burst(vx(x), vy(y), col, n || 8, v || 120); }
function fltX(txt, px) { c.font = '800 18px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const hw = c.measureText(String(txt)).width / 2 + 6; return clamp(px, hw, W - hw); }
function say(txt, x, y, col) { k.float(txt, fltX(txt, vx(x)), clamp(vy(y), SY + 14, SY + SH - 14), col || '#fff'); }

/* ================================================================ 1) Pulso de Titanes */
const HEART = (col) => mk(34, 32, (q) => { q.beginPath(); q.moveTo(17, 29); q.bezierCurveTo(-2, 16, 3, 3, 17, 11); q.bezierCurveTo(31, 3, 36, 16, 17, 29); q.closePath(); q.fillStyle = col; q.fill(); q.lineWidth = 2.4; q.strokeStyle = OUT; q.stroke(); q.fillStyle = alpha('#fff', 0.5); q.beginPath(); q.ellipse(11, 12, 3.4, 2.2, -0.5, 0, TAU); q.fill(); });
const HIMG = {};
const TABLE = mk(440, 130, (q) => {
  rr(q, 60, 34, 320, 74, 12); const g = q.createLinearGradient(0, 34, 0, 108); g.addColorStop(0, '#c98a4b'); g.addColorStop(1, '#8a5a2e'); q.fillStyle = g; q.fill(); q.lineWidth = 3; q.strokeStyle = OUT; q.stroke();
  q.save(); rr(q, 62, 36, 316, 70, 11); q.clip(); q.strokeStyle = alpha('#5c3a1c', 0.5); q.lineWidth = 1.2; for (let i = 0; i < 9; i++) { q.beginPath(); q.moveTo(60, 40 + i * 8); q.bezierCurveTo(180, 38 + i * 8, 240, 44 + i * 8, 380, 40 + i * 8); q.stroke(); } q.restore();
  q.fillStyle = alpha('#fff', 0.25); q.fillRect(70, 38, 300, 4);
  for (const x of [88, 352]) { rr(q, x - 9, 100, 18, 26, 5); fillOut(q, '#7a4a24', 2.4); }
});

/* ================================================================ Modos */
const MODES = {
  /* ---------------------------------------------------------- Pulso de Titanes */
  pulso: {
    hint: ['A: tirar a tiempo', 'B: aguantar', 'Sigue el corazón rival'],
    init() {
      S.ang = 0; S.vel = 0; S.pin = 0;
      P.forEach((pl, i) => Object.assign(pl, { sd: i ? 1 : -1, st: 1, f: 0, ph: k.rnd(0, 1), rate: 1.05, beat: 0, qual: 0, msg: 0, good: 0, miss: 0, guard: false }));
    },
    /* el ritmo que cada jugador debe seguir es el del rival */
    rival: (pl) => P[pl.i ? 0 : 1],
    step(dt) {
      if (S.pin) { S.pin += dt; return; }
      for (const pl of P) {
        const losing = clamp(pl.i ? S.ang : -S.ang, 0, 1); /* si vas perdiendo, tu corazón se acelera */
        pl.rate = (0.95 + losing * 0.75) * soft();
        pl.ph += pl.rate * dt; if (pl.ph >= 1) { pl.ph -= 1; pl.beat = 1; if (!pl.cpu || NP === 2) k.sfx('click'); }
        pl.beat = Math.max(0, pl.beat - dt * 3.2);
        pl.f *= Math.exp(-7 * dt); pl.msg = Math.max(0, pl.msg - dt);
      }
      for (const pl of P) {
        const inp = inputs(pl, dt), r = this.rival(pl);
        pl.guard = !!inp.b;
        if (pl.guard) pl.st = Math.max(0, pl.st - 0.22 * dt); else pl.st = Math.min(1, pl.st + (inp.a ? 0.09 : 0.16) * dt);
        if (inp.ah && pl.cd <= 0) {
          pl.cd = 0.14; const d = Math.min(r.ph, 1 - r.ph) / Math.max(0.35, r.rate); /* distancia en segundos al latido rival */
          const q = clamp(1 - d / 0.19, 0, 1);
          pl.st = Math.max(0, pl.st - 0.045);
          if (q > 0) { pl.f += (0.5 + 0.8 * q) * (0.35 + 0.65 * pl.st) * soft(); pl.qual = q; pl.good++; pl.msg = 0.8; pl.msgT = q > 0.65 ? '¡A tiempo!' : 'Bien'; k.sfx(q > 0.65 ? 'coin' : 'pop'); }
          else { pl.st = Math.max(0, pl.st - 0.1); pl.f -= 0.12; pl.miss++; pl.msg = 0.8; pl.msgT = 'Fuera de ritmo'; pl.qual = 0; k.sfx('hurt'); }
        }
        pl.cd -= dt;
      }
      const f0 = Math.max(0, P[0].f) * (P[1].guard ? 0.55 : 1) + Math.min(0, P[0].f);
      const f1 = Math.max(0, P[1].f) * (P[0].guard ? 0.55 : 1) + Math.min(0, P[1].f);
      S.vel += (f0 - f1) * 3.4 * dt; S.vel *= Math.exp(-3.6 * dt); S.ang = clamp(S.ang + S.vel * dt, -1, 1);
      const cap = rt < 5 ? 0.72 : 1; /* los 5 primeros segundos nadie puede ganar */
      if (Math.abs(S.ang) > cap) { S.ang = Math.sign(S.ang) * cap; S.vel *= -0.2; }
      if (Math.abs(S.ang) >= 1 && !S.pin) { S.pin = 0.001; S.win = S.ang > 0 ? 0 : 1; k.sfx('explode'); k.shake(7); spark(220 + S.ang * 95, 190, P[S.win].col, 22, 220); say('¡Pulso ganado!', 220, 120, P[S.win].col); }
    },
    done() { return S.pin > 1.2 || rt >= MD.len; },
    key(pl) { return (pl.i ? -S.ang : S.ang) + (S.pin && S.win === pl.i ? 10 : 0); },
    val(pl) { return S.pin ? (S.win === pl.i ? '¡Gana!' : 'Vencido') : pl.guard ? 'Aguantando' : 'Fuerza ' + Math.round(pl.st * 100) + ' %'; },
    ai(pl, ai, s, dt) {
      const r = this.rival(pl); ai.t -= dt;
      if (r.beat > 0.82 && ai.next == null) ai.next = k.rnd(-1, 1) * (1 - s) * 0.22 + (Math.random() < 0.14 * (1 - s) ? 0.4 : 0);
      let press = false;
      if (ai.next != null) { ai.next -= dt; if (ai.next <= 0) { press = true; ai.next = null; } }
      const guard = pl.st > 0.35 && (pl.i ? S.ang > 0.45 : S.ang < -0.45) && Math.random() < 0.02 + s * 0.05;
      return { x: 0, y: 0, ah: press && rt > 1.2, b: guard };
    },
    draw() {
      /* sala, mesa y titanes */
      const g = c.createLinearGradient(0, 0, 0, WH); g.addColorStop(0, '#2a1f56'); g.addColorStop(1, '#150f30'); c.fillStyle = g; c.fillRect(0, 0, WW, WH);
      c.fillStyle = alpha('#ffd166', 0.07); c.beginPath(); c.moveTo(220, 0); c.lineTo(370, WH); c.lineTo(70, WH); c.closePath(); c.fill();
      for (let i = 0; i < 12; i++) { const x = 20 + rs(i) * 400, y = 40 + rs(i + 9) * 40; c.beginPath(); c.arc(x, y, 9, 0, TAU); fillOut(c, alpha('#6e62f5', 0.5), 1.5); }
      c.drawImage(TABLE, 0, 180, 440, 130);
      const a = S.ang * 0.95, hx = 220 + Math.sin(a) * 58, hy = 214 - Math.cos(a) * 58;
      for (const pl of P) {
        const s = pl.sd, bx = 220 + s * 128, by = 246, push = (pl.i ? -S.ang : S.ang);
        puppet(bx, by, 1.25, pl.col, { face: -s, front: s < 0 ? 1 : 0, hy: -22, hr: 10, belt: 1, shadow: false,
          hands: s < 0 ? [[(hx - bx) / 1.25, (hy - by) / 1.25], [-6, 4]] : [[6, 4], [(hx - bx) / 1.25, (hy - by) / 1.25]],
          feet: [[-8, 22], [8, 22]], mouth: push > 0.3 ? 'o' : push < -0.3 ? 'sad' : '', shut: pl.guard });
      }
      c.beginPath(); c.arc(hx, hy, 12, 0, TAU); fillOut(c, '#ffd9b5', 2.4);
      if (S.pin) { spark(hx, hy, '#fff', 1, 60); }
      /* barra del pulso */
      rr(c, 60, 26, 320, 22, 11); c.fillStyle = 'rgba(12,8,30,.75)'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
      const mid = 220 + S.ang * 152;
      c.save(); rr(c, 62, 28, 316, 18, 9); c.clip();
      c.fillStyle = alpha(P[0].col, 0.75); c.fillRect(62, 28, mid - 62, 18); c.fillStyle = alpha(P[1].col, 0.75); c.fillRect(mid, 28, 380 - mid, 18); c.restore();
      c.beginPath(); c.moveTo(mid, 24); c.lineTo(mid, 50); c.lineWidth = 4; c.strokeStyle = '#fff'; c.stroke();
      /* corazones: cada jugador sigue el del rival */
      P.forEach((pl) => { const r = this.rival(pl), x = pl.sd < 0 ? 66 : 374, sc = 1 + r.beat * 0.45;
        if (!HIMG[r.col]) HIMG[r.col] = HEART(r.col);
        c.save(); c.translate(x, 96); c.scale(sc, sc); c.drawImage(HIMG[r.col], -17, -16, 34, 32); c.restore();
        label('rival', x, 122, 12, '#cfc8ff');
        rr(c, x - 26, 130, 52, 9, 4); c.fillStyle = 'rgba(12,8,30,.7)'; c.fill(); c.fillStyle = pl.st > 0.3 ? '#7cf7a0' : '#ff8a8a'; c.fillRect(x - 24, 132, 48 * pl.st, 5);
        if (pl.msg > 0) { c.globalAlpha = Math.min(1, pl.msg * 2);
          const fz = fit(pl.msgT, W / 2 - 16, 14), mw = c.measureText(pl.msgT).width;   // sin salirse por los lados
          label(pl.msgT, Math.min(W - 8 - mw / 2, Math.max(8 + mw / 2, x)), 150, fz, pl.qual > 0.65 ? '#7cf7a0' : pl.qual > 0 ? '#ffd166' : '#ff8a8a'); c.globalAlpha = 1; }
      });
    },
  },

  /* ---------------------------------------------------------- Justa de Caballeros */
  justa: {
    hint: ['Arriba/abajo: lanza', 'B: escudo alto', 'A: galope'],
    init() {
      S.st = 'run'; S.t = 0; S.lock = 0; S.res = null; S.fly = null; S.ground = 232;
      P.forEach((pl, i) => Object.assign(pl, { sd: i ? -1 : 1, x: i ? 690 : 50, v: 62, aim: 1, shield: 0, hoof: 0, locked: false, lance: 1, pts2: pl.pts2 || 0, seen: pl.seen || [0, 0] }));
    },
    step(dt) {
      S.t += dt;
      if (S.st === 'end') { if (S.fly) { const f = S.fly; f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; if (f.y > S.ground - 6) { f.y = S.ground - 6; f.vy *= -0.32; f.vx *= 0.6; f.vr *= 0.4; } } return; }
      const d = Math.abs(P[0].x - P[1].x);
      for (const pl of P) {
        const inp = inputs(pl, dt);
        pl.hoof += pl.v * dt / 46; if (pl.hoof >= 1) { pl.hoof -= 1; pl.beat = 1; }
        pl.beat = Math.max(0, (pl.beat || 0) - dt * 4);
        if (!pl.locked) {
          if (inp.y < -0.4) pl.aim = 1; else if (inp.y > 0.4) pl.aim = 0;
          pl.shield = inp.b ? 1 : 0;
          if (inp.ah && pl.cd <= 0) { /* galope a compás: el trote da velocidad si pulsas con la zancada */
            pl.cd = 0.1; const q = clamp(1 - Math.min(pl.hoof, 1 - pl.hoof) / 0.22, 0, 1);
            pl.v = Math.min(235 * soft(), pl.v + 12 + 26 * q); if (q > 0.5 && !pl.cpu) k.sfx('pop');
          }
        }
        pl.cd -= dt; pl.v = Math.max(50, pl.v - 6 * dt);
        pl.x += pl.sd * pl.v * dt;
      }
      if (d < 108 && !P[0].locked) { P.forEach((pl) => { pl.locked = true; }); k.sfx('shoot'); }
      if (d < 44 && !S.res) this.clash();
    },
    clash() {
      const R = [];
      for (const pl of P) { const o = P[pl.i ? 0 : 1];
        if (!o.cpu) o.seen[o.shield]++; /* la CPU se fija en dónde sueles poner el escudo */
        if (pl.aim !== o.shield) { const high = pl.aim === 1, un = high && pl.v > 150 && Math.random() < 0.25 + (pl.v - 150) / 320;
          R.push({ pl, o, pts: high ? 3 : 1, un, txt: high ? '¡Al peto! +3' : '¡Al escudo! +1' }); }
        else R.push({ pl, o, pts: 0, un: false, txt: 'Lanza rota' });
      }
      S.res = R; S.st = 'end'; S.t = 0;
      k.sfx('explode'); k.shake(6); spark(370, 180, '#ffd166', 20, 200);
      R.forEach((r) => { r.pl.gain = r.pts; if (r.pts) say(r.txt, r.pl.x + r.pl.sd * 40, 150, r.pl.col); });
      const un = R.find((r) => r.un);
      if (un) { const o = un.o; S.fly = { x: o.x, y: 180, vx: -o.sd * 180, vy: -320, rot: 0, vr: -o.sd * 6, col: o.col }; o.down = true; S.derribo = un.pl; say('¡Derribo!', 370, 110, un.pl.col); k.confetti(un.pl.col, 50); }
    },
    pts() { /* los puntos de la lanza ya están en gain */ },
    done() { return S.st === 'end' && S.t > (S.derribo ? 2.6 : 1.8); },
    key(pl) { return pl.gain; },
    val(pl) { return pl.locked || S.res ? (pl.aim ? 'Lanza alta' : 'Lanza baja') + (pl.shield ? ' · escudo alto' : ' · escudo bajo') : Math.round(pl.v) + ' de galope'; },
    ai(pl, ai, s, dt) {
      const o = P[pl.i ? 0 : 1]; ai.t -= dt;
      if (ai.t <= 0) { ai.t = 0.2;
        const tot = o.seen[0] + o.seen[1], bias = tot > 1 ? (o.seen[1] - o.seen[0]) / tot : 0; /* si sueles cubrir arriba, apunta abajo */
        ai.aim = Math.random() < 0.5 - bias * s * 0.8 ? 1 : 0;
        ai.sh = Math.random() < 0.5 + (Math.random() - 0.5) * (1 - s) ? 1 : 0;
      }
      const q = Math.min(pl.hoof, 1 - pl.hoof) < 0.2 * (0.4 + s * 0.8);
      return { x: 0, y: ai.aim ? -1 : 1, ah: q && pl.cd <= 0 && Math.random() < 0.5 + s * 0.4, b: !!ai.sh };
    },
    draw() {
      const g = c.createLinearGradient(0, 0, 0, WH); g.addColorStop(0, '#6ab7e8'); g.addColorStop(1, '#c9e6f7'); c.fillStyle = g; c.fillRect(0, 0, WW, 232);
      /* gradas y banderolas */
      c.fillStyle = '#4b4f7a'; c.fillRect(0, 96, WW, 60); c.fillStyle = alpha(OUT, 0.25); for (let x = 0; x < WW; x += 24) c.fillRect(x, 96, 2, 60);
      for (let i = 0; i < 30; i++) { const x = 12 + i * 25, col = ['#ff6fb5', '#5b8cff', '#a8cf3f', '#ffc94d'][i % 4]; c.beginPath(); c.moveTo(x - 9, 82); c.lineTo(x + 9, 82); c.lineTo(x, 96); c.closePath(); fillOut(c, col, 1.6); }
      for (let i = 0; i < 26; i++) { const x = 16 + i * 28, y = 112 + (i % 3) * 14; c.beginPath(); c.arc(x, y, 6, 0, TAU); fillOut(c, ['#ffd9b5', '#e8b98a', '#d69b6a'][i % 3], 1.4); }
      c.fillStyle = '#d8b878'; c.fillRect(0, 156, WW, 76); c.fillStyle = alpha('#a98544', 0.5); for (let i = 0; i < 70; i++) c.fillRect(rs(i) * WW, 158 + rs(i + 3) * 70, 5, 2);
      c.fillStyle = '#c2a468'; c.fillRect(0, 232, WW, WH - 232);
      /* valla central */
      rr(c, 0, 214, WW, 14, 5); fillOut(c, '#f2f2f7', 2.4); c.fillStyle = '#e04a4a'; for (let x = 0; x < WW; x += 44) c.fillRect(x, 214, 22, 14);
      for (const pl of P) this.knight(pl);
      if (S.fly) { const f = S.fly; c.save(); c.translate(f.x, f.y); c.rotate(f.rot); puppet(0, 0, 1.15, f.col, { helm: 1, face: 1, hands: [[-12, -6], [12, -8]], feet: [[-9, 20], [10, 18]], shadow: false }); c.restore(); }
      /* aviso de línea elegida */
      if (S.st !== 'end') for (const pl of P) { const x = pl.x + pl.sd * 34, y = pl.aim ? 168 : 196;
        c.globalAlpha = pl.locked ? 1 : 0.55; c.beginPath(); c.arc(x, y, 6, 0, TAU); fillOut(c, pl.col, 2); c.globalAlpha = 1; }
      if (S.res && S.t < 1.4) S.res.forEach((r) => { if (!r.pts) { for (let i = 0; i < 3; i++) glint(c, 370 + Math.cos(T * 9 + i * 2) * 20, 180 + Math.sin(T * 9 + i * 2) * 12, 5, '#ffd166'); } });
    },
    knight(pl) {
      if (pl.down && S.fly) { return; }
      const x = pl.x, s = pl.sd, y = 210, bob = Math.sin(pl.hoof * TAU) * 3;
      /* caballo dibujado por código */
      c.save(); c.translate(x, y); c.scale(s, 1); shadow(c, 0, 24, 30, 0.22);
      rr(c, -30, -22 + bob, 60, 30, 14); fillOut(c, '#8a6240', 2.6);
      c.beginPath(); c.moveTo(24, -18 + bob); c.quadraticCurveTo(42, -30 + bob, 40, -44 + bob); c.quadraticCurveTo(38, -52 + bob, 30, -50 + bob); c.quadraticCurveTo(22, -44 + bob, 20, -20 + bob); c.closePath(); fillOut(c, '#9a7048', 2.4);
      c.beginPath(); c.arc(36, -46 + bob, 2, 0, TAU); c.fillStyle = OUT; c.fill();
      c.beginPath(); c.moveTo(-28, -18 + bob); c.quadraticCurveTo(-44, -14 + bob, -40, 6 + bob); c.lineWidth = 6; c.strokeStyle = '#6b4a2c'; c.stroke();
      for (const [ox, ph] of [[-20, 0], [-8, 0.5], [10, 0.25], [22, 0.75]]) { const a = Math.sin((pl.hoof + ph) * TAU) * 0.7;
        seg([[ox, 4 + bob], [ox + Math.sin(a) * 8, 16 + bob], [ox + Math.sin(a) * 15, 26]], 5, '#7a5433'); }
      c.restore();
      /* caballero */
      const hy2 = y - 34 + bob, lanceY = pl.aim ? -24 : -4;
      puppet(x, hy2, 1.05, pl.col, { helm: 1, face: s, front: s > 0 ? 1 : 0, shadow: false,
        hands: s > 0 ? [[-4, 2], [14, lanceY / 2]] : [[-14, lanceY / 2], [4, 2]], feet: [[-9, 18], [9, 18]],
        after: () => {
          const lx = s > 0 ? 14 : -14; c.save(); c.scale(s, 1);
          /* lanza */
          c.beginPath(); c.moveTo(Math.abs(lx) - 4, lanceY / 2); c.lineTo(58, lanceY); c.lineWidth = 6.5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#e8d8b0'; c.stroke();
          c.beginPath(); c.moveTo(58, lanceY - 4); c.lineTo(70, lanceY); c.lineTo(58, lanceY + 4); c.closePath(); fillOut(c, '#c8ccd8', 1.8);
          /* escudo */
          const sy2 = pl.shield ? -20 : -2; c.beginPath(); c.moveTo(-18, sy2 - 10); c.lineTo(-4, sy2 - 10); c.lineTo(-4, sy2 + 6); c.quadraticCurveTo(-11, sy2 + 16, -18, sy2 + 6); c.closePath();
          fillOut(c, pl.col, 2.2); c.fillStyle = alpha('#fff', 0.6); c.fillRect(-15, sy2 - 6, 8, 3); c.restore();
        } });
    },
  },

  /* ---------------------------------------------------------- Almohadas en Órbita */
  orbita: {
    hint: ['A: almohadazo', 'El golpe te empuja', 'B: agarrarte'],
    init() {
      S.R = 208; S.cx = 235; S.cy = 235; S.rot = 0; S.stars = [];
      S.hatch = [0, TAU / 3, TAU * 2 / 3]; S.hw = 0.36;
      for (let i = 0; i < 40; i++) S.stars.push({ x: rs(i) * WW, y: rs(i + 40) * WH, r: 0.8 + rs(i + 80) * 1.6 });
      const n = P.length; P.forEach((pl, i) => { const a = i * TAU / n - 0.4;
        Object.assign(pl, { x: S.cx + Math.cos(a) * 95, y: S.cy + Math.sin(a) * 95, vx: 0, vy: 0, r: 19, fx: -Math.cos(a), fy: -Math.sin(a), sw: 0, hold: false, hits: 0, spin: 0 }); });
    },
    hatchOpen(a) { for (const h of S.hatch) if (Math.abs(adiff(a - (h + S.rot))) < S.hw / 2) return true; return false; },
    swing(pl) {
      let got = false;
      for (const o of alive()) { if (o === pl) continue; const dx = o.x - pl.x, dy = o.y - pl.y, d = hyp(dx, dy) || 1;
        if (d > pl.r + o.r + 26) continue; if (Math.abs(adiff(Math.atan2(dy, dx) - Math.atan2(pl.fy, pl.fx))) > 1.0) continue;
        const nx = dx / d, ny = dy / d, F = 250 * soft();
        o.vx += nx * F; o.vy += ny * F; o.spin = 1; pl.vx -= nx * F * 0.62; pl.vy -= ny * F * 0.62; pl.hits++;
        got = true; k.sfx('hit'); spark(o.x - nx * o.r, o.y - ny * o.r, '#fff', 9, 130);
      }
      if (!got) { pl.vx -= pl.fx * 105; pl.vy -= pl.fy * 105; k.sfx('jump'); spark(pl.x + pl.fx * pl.r, pl.y + pl.fy * pl.r, '#e8e2ff', 5, 70); }
    },
    step(dt) {
      S.rot += 0.16 * dt;
      for (const pl of alive()) {
        const inp = inputs(pl, dt);
        if (inp.x || inp.y) { const q = Math.min(1, dt * 12); pl.fx += (inp.x - pl.fx) * q; pl.fy += (inp.y - pl.fy) * q; const L = hyp(pl.fx, pl.fy) || 1; pl.fx /= L; pl.fy /= L;
          pl.vx += inp.x * 56 * dt; pl.vy += inp.y * 56 * dt; } /* propulsores de traje: muy flojos */
        pl.hold = !!inp.b;
        if (inp.ah && pl.cd <= 0 && pl.sw <= 0) { pl.sw = 0.26; pl.cd = 0.55; pl.done = false; }
        if (pl.sw > 0) { pl.sw -= dt; if (!pl.done && pl.sw < 0.14) { pl.done = true; this.swing(pl); } }
        pl.cd -= dt; pl.spin = Math.max(0, pl.spin - dt);
        const f = Math.exp(-(pl.hold ? 3.4 : 0.22) * dt); pl.vx *= f; pl.vy *= f;
        pl.x += pl.vx * dt; pl.y += pl.vy * dt;
      }
      const A = alive();
      for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) this.bump(A[i], A[j]);
      for (const pl of A) { const dx = pl.x - S.cx, dy = pl.y - S.cy, d = hyp(dx, dy);
        if (d > S.R - pl.r) { const a = Math.atan2(dy, dx);
          if (this.hatchOpen(a) && rt > 5) { eliminate(pl, '¡Al espacio!'); continue; }
          const nx = dx / d, ny = dy / d; pl.x = S.cx + nx * (S.R - pl.r); pl.y = S.cy + ny * (S.R - pl.r);
          const vn = pl.vx * nx + pl.vy * ny; if (vn > 0) { pl.vx -= 1.7 * vn * nx; pl.vy -= 1.7 * vn * ny; if (vn > 90) k.sfx('click'); }
          if (pl.hold) { pl.vx *= 0.1; pl.vy *= 0.1; }
        } }
    },
    bump(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy), mn = a.r + b.r; if (d >= mn || d < 0.01) return;
      const nx = dx / d, ny = dy / d, ov = (mn - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vn >= 0) return;
      const j = -1.7 * vn / 2; a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny;
      if (-vn > 110) { k.sfx('pop'); spark((a.x + b.x) / 2, (a.y + b.y) / 2, '#fff', 6, 90); }
    },
    done() { return alive().length <= 1 || rt >= MD.len; },
    key(pl) { return pl.hits; },
    val(pl) { return !pl.alive ? 'En el espacio' : pl.hold ? 'Agarrado' : 'Golpes ' + pl.hits; },
    ai(pl, ai, s, dt) {
      ai.t -= dt; const A = alive().filter((o) => o !== pl); if (!A.length) return { x: 0, y: 0 };
      let o = A[0], bd = 1e9; for (const q of A) { const d = hyp(q.x - pl.x, q.y - pl.y); if (d < bd) { bd = d; o = q; } }
      const dc = hyp(pl.x - S.cx, pl.y - S.cy), aWall = Math.atan2(pl.y - S.cy, pl.x - S.cx);
      let tx = o.x, ty = o.y;
      if (dc > S.R - 70 && this.hatchOpen(aWall)) { tx = S.cx; ty = S.cy; } /* huye de la escotilla abierta */
      const dx = tx - pl.x, dy = ty - pl.y, L = hyp(dx, dy) || 1;
      if (ai.t <= 0) { ai.t = lerp(0.6, 0.2, s); ai.sw = bd < 70 && Math.random() < 0.3 + s * 0.6; ai.nx = k.rnd(-1, 1) * (1 - s) * 0.5; ai.ny = k.rnd(-1, 1) * (1 - s) * 0.5; }
      const facing = Math.abs(adiff(Math.atan2(o.y - pl.y, o.x - pl.x) - Math.atan2(pl.fy, pl.fx))) < 0.6;
      return { x: dx / L + ai.nx, y: dy / L + ai.ny, ah: ai.sw && bd < 52 && facing && rt > 5, b: dc > S.R - 50 && !this.hatchOpen(aWall) && Math.random() < 0.02 };
    },
    draw() {
      c.fillStyle = '#05030f'; c.fillRect(0, 0, WW, WH);
      for (const st of S.stars) { c.fillStyle = alpha('#fff', 0.35 + 0.5 * Math.abs(Math.sin(T + st.x))); c.beginPath(); c.arc(st.x, st.y, st.r, 0, TAU); c.fill(); }
      /* módulo de la estación */
      c.beginPath(); c.arc(S.cx, S.cy, S.R, 0, TAU); const g = c.createRadialGradient(S.cx - 60, S.cy - 70, 20, S.cx, S.cy, S.R);
      g.addColorStop(0, '#39335e'); g.addColorStop(1, '#1c1740'); c.fillStyle = g; c.fill();
      c.strokeStyle = alpha('#6e62f5', 0.22); c.lineWidth = 1.5; for (let r2 = 46; r2 < S.R; r2 += 46) { c.beginPath(); c.arc(S.cx, S.cy, r2, 0, TAU); c.stroke(); }
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(S.cx + Math.cos(a) * 40, S.cy + Math.sin(a) * 40); c.lineTo(S.cx + Math.cos(a) * S.R, S.cy + Math.sin(a) * S.R); c.stroke(); }
      /* pared con escotillas abiertas */
      c.lineCap = 'butt';
      for (let i = 0; i < 3; i++) { const a0 = S.hatch[i] + S.rot + S.hw / 2, a1 = S.hatch[(i + 1) % 3] + S.rot - S.hw / 2 + (i === 2 ? TAU : 0);
        c.beginPath(); c.arc(S.cx, S.cy, S.R + 5, a0, a1); c.lineWidth = 16; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 11; c.strokeStyle = '#8d8aa8'; c.stroke();
        c.beginPath(); c.arc(S.cx, S.cy, S.R + 2, a0, a1); c.lineWidth = 3; c.strokeStyle = alpha('#fff', 0.35); c.stroke(); }
      for (const h of S.hatch) { const a = h + S.rot; c.beginPath(); c.arc(S.cx, S.cy, S.R + 5, a - S.hw / 2, a + S.hw / 2); c.lineWidth = 14; c.strokeStyle = alpha('#ff5f7a', 0.25 + 0.2 * Math.sin(T * 4)); c.stroke();
        /* el rótulo va POR DENTRO del anillo para que no lo corte el borde del escenario */
        const mx = S.cx + Math.cos(a) * (S.R - 24), my = S.cy + Math.sin(a) * (S.R - 24); label('¡vacío!', mx, my, 11, '#ff9ad5'); }
      /* astronautas con almohada */
      for (const pl of P) { if (!pl.alive) continue;
        const ang = Math.atan2(pl.fy, pl.fx), sw = pl.sw > 0 ? (0.26 - pl.sw) / 0.26 : 0;
        c.save(); c.translate(pl.x, pl.y); c.rotate(ang + Math.PI / 2 + pl.spin * Math.sin(T * 18) * 0.12);
        puppet(0, 0, 1.18, pl.col, { face: 1, shadow: false, hy: -20, hr: 9, helm: 0, belt: 1,
          hands: [[-12 - sw * 8, -14 + sw * 16], [12 + sw * 8, -14 + sw * 16]], feet: [[-7, 20], [7, 20]],
          after: () => { c.beginPath(); c.arc(0, -20, 12, 0, TAU); c.lineWidth = 2; c.strokeStyle = alpha('#9fd8f2', 0.7); c.stroke(); } });
        /* almohada */
        const px = 0, py = -26 - sw * 6 + sw * 26;
        c.save(); c.translate(px, py); c.rotate(-0.5 + sw * 1.4); rr(c, -13, -9, 26, 18, 7); fillOut(c, '#fff3fb', 2.2); c.strokeStyle = alpha('#d8a8c8', 0.9); c.lineWidth = 1.5; c.beginPath(); c.moveTo(-9, -5); c.lineTo(9, -5); c.stroke(); c.restore();
        c.restore();
        label(tagOf(pl), clamp(pl.x, 26, WW - 26), clamp(pl.y - pl.r - 16 - (pl.i % 4) * 13, 13 + (pl.i % 4) * 13, WH - 13), 14, pl.col);
      }
    },
  },

  /* ---------------------------------------------------------- Gravedad Compartida (cooperativo) */
  gravedad: {
    hint: ['Joystick: votar gravedad', 'A: impulso', 'B: agarrarte'],
    init() { S.g = 0; S.ga = 0; S.view = 0; S.gates = 0; S.hold = 0; S.msg = ''; S.mt = 0; this.chamber(); P.forEach((pl, i) => Object.assign(pl, { x: 120 + i * 60, y: 200, vx: 0, vy: 0, r: 16, grab: false, vote: -1 })); },
    chamber() {
      const R = 30, IN = WW - R * 2; /* paredes de 30 px */
      S.wall = R; S.blocks = []; const n = 1 + Math.min(2, Math.floor(S.gates / 2));
      for (let i = 0; i < n; i++) { const w = 90 + rs(S.gates * 7 + i) * 70, h = 24;
        S.blocks.push({ x: R + 30 + rs(S.gates * 5 + i) * (IN - 60 - w), y: R + 70 + rs(S.gates * 3 + i * 2) * (IN - 140), w, h }); }
      const side = Math.floor(rs(S.gates * 11) * 4), u = 0.25 + rs(S.gates * 13) * 0.5;
      S.gate = side === 0 ? { x: R + IN * u, y: WW - R - 20 } : side === 1 ? { x: R + 20, y: R + IN * u } : side === 2 ? { x: R + IN * u, y: R + 20 } : { x: WW - R - 20, y: R + IN * u };
      S.spike = (side + 2) % 4; /* los pinchos siempre en la pared opuesta a la puerta */
      S.ball = { x: WW / 2, y: WW / 2 - 40, vx: 0, vy: 0, r: 19 };
      S.bstart = { x: S.ball.x, y: S.ball.y };
    },
    gvec() { return [[0, 1], [-1, 0], [0, -1], [1, 0]][S.g]; },
    votes() {
      const v = [0, 0, 0, 0];
      for (const pl of P) { pl.vote = -1; const inp = pl.inp || { x: 0, y: 0 };
        if (Math.abs(inp.x) > 0.5 || Math.abs(inp.y) > 0.5) { pl.vote = Math.abs(inp.x) > Math.abs(inp.y) ? (inp.x > 0 ? 3 : 1) : (inp.y > 0 ? 0 : 2); v[pl.vote]++; } }
      return v;
    },
    step(dt) {
      for (const pl of P) pl.inp = inputs(pl, dt);
      const v = this.votes(); let best = S.g, bn = v[S.g];
      for (let i = 0; i < 4; i++) if (v[i] > bn) { bn = v[i]; best = i; }
      if (best !== S.g && bn > 0) { S.hold += dt; if (S.hold > 0.3) { S.g = best; S.hold = 0; k.sfx('start'); S.msg = 'La gravedad gira'; S.mt = 1.2; } } else S.hold = 0;
      const tgt = S.g * Math.PI / 2; S.ga += adiff(tgt - S.ga) * Math.min(1, dt * 5);
      const [gx, gy] = this.gvec(), G = 620;
      /* jugadores */
      for (const pl of P) {
        const inp = pl.inp; pl.grab = !!inp.b; pl.stun = Math.max(0, pl.stun - dt);
        if (!pl.stun) {
          if (!pl.grab) { pl.vx += gx * G * dt; pl.vy += gy * G * dt;
            const px = -gy, py = gx, lat = inp.x * px + inp.y * py; /* deriva lateral suave */
            pl.vx += px * lat * 190 * dt; pl.vy += py * lat * 190 * dt; }
          if (inp.ah && pl.cd <= 0 && pl.land > 0) { pl.vx -= gx * 320; pl.vy -= gy * 320; pl.cd = 0.5; pl.land = 0; k.sfx('jump'); }
        }
        pl.cd -= dt; const f = Math.exp(-(pl.grab ? 6 : 0.9) * dt); pl.vx *= f; pl.vy *= f;
        pl.x += pl.vx * dt; pl.y += pl.vy * dt; pl.land = Math.max(0, (pl.land || 0) - dt);
        this.solid(pl, 0.1);
      }
      /* núcleo */
      const b = S.ball; b.vx += gx * G * dt; b.vy += gy * G * dt;
      const bf = Math.exp(-0.5 * dt); b.vx *= bf; b.vy *= bf; b.x += b.vx * dt; b.y += b.vy * dt;
      this.solid(b, 0.45);
      for (const pl of P) { const dx = b.x - pl.x, dy = b.y - pl.y, d = hyp(dx, dy), mn = b.r + pl.r;
        if (d < mn && d > 0.01) { const nx = dx / d, ny = dy / d, ov = mn - d; b.x += nx * ov * 0.65; b.y += ny * ov * 0.65; pl.x -= nx * ov * 0.35; pl.y -= ny * ov * 0.35;
          const vn = (b.vx - pl.vx) * nx + (b.vy - pl.vy) * ny; if (vn < 0) { const j = -1.5 * vn; b.vx += j * nx * 0.7; b.vy += j * ny * 0.7; pl.vx -= j * nx * 0.5; pl.vy -= j * ny * 0.5; if (-vn > 130) k.sfx('pop'); } } }
      if (hyp(b.x - S.gate.x, b.y - S.gate.y) < 30) { S.gates++; k.sfx('win'); k.confetti('#7cf7a0', 30); say('¡Puerta ' + S.gates + '!', S.gate.x, S.gate.y, '#7cf7a0'); S.msg = '¡Nueva cámara!'; S.mt = 1.4; this.chamber(); }
    },
    /* colisión con paredes, bloques y pinchos */
    solid(o, e) {
      const R = S.wall, lo = R + o.r, hi = WW - R - o.r, sp = S.spike;
      for (const ax of ['x', 'y']) { const v = ax === 'x' ? 'vx' : 'vy', side = ax === 'x' ? (o[ax] < lo ? 1 : 3) : (o[ax] < lo ? 2 : 0);
        if (o[ax] < lo || o[ax] > hi) { const hitSpike = side === sp;
          o[ax] = clamp(o[ax], lo, hi); if (Math.abs(o[v]) > 20) o[v] *= -e; else o[v] = 0;
          if (o === S.ball) { if (hitSpike && rt > 5) { o.x = S.bstart.x; o.y = S.bstart.y; o.vx = o.vy = 0; k.sfx('hurt'); S.msg = '¡El núcleo tocó los pinchos!'; S.mt = 1.6; spark(o.x, o.y, '#ff8a8a', 12, 140); } }
          else { if (hitSpike && rt > 5 && !o.stun) { o.stun = 0.8; o.vx *= -1.4; o.vy *= -1.4; k.sfx('hurt'); }
            const [gx, gy] = this.gvec(); if ((ax === 'x' ? gx : gy) !== 0) o.land = 0.12; }
        } }
      for (const bl of S.blocks) { const nx = clamp(o.x, bl.x, bl.x + bl.w), ny = clamp(o.y, bl.y, bl.y + bl.h), dx = o.x - nx, dy = o.y - ny, d = hyp(dx, dy);
        if (d < o.r && d > 0.001) { const ux = dx / d, uy = dy / d, ov = o.r - d; o.x += ux * ov; o.y += uy * ov;
          const vn = o.vx * ux + o.vy * uy; if (vn < 0) { o.vx -= (1 + e) * vn * ux; o.vy -= (1 + e) * vn * uy; }
          if (o !== S.ball) o.land = 0.12; }
        else if (d <= 0.001) { o.y = bl.y - o.r; o.vy = 0; } }
    },
    done() { return rt >= MD.len; },
    key() { return 0; },
    val(pl) { const N = ['abajo', 'izq.', 'arriba', 'der.']; return pl.vote >= 0 ? 'Vota ' + N[pl.vote] : pl.grab ? 'Agarrado' : '—'; },
    ai(pl, ai, s, dt) {
      ai.t -= dt; const b = S.ball;
      if (ai.t <= 0) { ai.t = lerp(0.8, 0.3, s);
        let best = -1, bs = -1e9;
        for (let i = 0; i < 4; i++) { const [gx, gy] = [[0, 1], [-1, 0], [0, -1], [1, 0]][i];
          const sc = (S.gate.x - b.x) * gx + (S.gate.y - b.y) * gy + k.rnd(-1, 1) * 120 * (1 - s);
          if (sc > bs) { bs = sc; best = i; } }
        ai.v = best; ai.jump = hyp(b.x - pl.x, b.y - pl.y) < 90 && Math.random() < 0.3 + s * 0.3;
      }
      const d = [[0, 1], [-1, 0], [0, -1], [1, 0]][ai.v == null ? 0 : ai.v];
      return { x: d[0], y: d[1], ah: ai.jump && pl.land > 0, b: false };
    },
    draw() {
      /* el mundo gira (la gravedad siempre cae hacia abajo en pantalla); se encoge para que la cámara
         cuadrada quepa girada 45° sin que se corten las esquinas contra el borde del escenario */
      const GF = 0.71;
      c.save(); c.translate(WW / 2, WH / 2); c.scale(GF, GF); c.rotate(-S.ga); c.translate(-WW / 2, -WH / 2);
      const R = S.wall; c.fillStyle = '#100c26'; c.fillRect(-200, -200, WW + 400, WH + 400);
      const g = c.createLinearGradient(0, 0, 0, WW); g.addColorStop(0, '#241d4e'); g.addColorStop(1, '#161034'); c.fillStyle = g; c.fillRect(R, R, WW - R * 2, WW - R * 2);
      c.strokeStyle = alpha('#6e62f5', 0.16); c.lineWidth = 1.2; for (let i = R; i < WW - R; i += 32) { c.beginPath(); c.moveTo(i, R); c.lineTo(i, WW - R); c.moveTo(R, i); c.lineTo(WW - R, i); c.stroke(); }
      /* paredes */
      c.lineWidth = 6; c.strokeStyle = OUT; c.strokeRect(R, R, WW - R * 2, WW - R * 2);
      const walls = [[R, WW - R, WW - R, WW - R], [R, R, R, WW - R], [R, R, WW - R, R], [WW - R, R, WW - R, WW - R]];
      for (let i = 0; i < 4; i++) { const [x0, y0, x1, y1] = walls[i]; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineWidth = 8; c.strokeStyle = i === S.spike ? '#8d3a52' : '#4b4477'; c.stroke();
        if (i === S.spike) { const n = 16, dx = (x1 - x0) / n, dy = (y1 - y0) / n, nx = (y1 - y0) / hyp(x1 - x0, y1 - y0), ny = -(x1 - x0) / hyp(x1 - x0, y1 - y0);
          for (let j = 0; j < n; j++) { const ax = x0 + dx * j, ay = y0 + dy * j; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + dx, ay + dy); c.lineTo(ax + dx / 2 + nx * 15, ay + dy / 2 + ny * 15); c.closePath(); fillOut(c, '#e8e8f2', 1.6); } } }
      for (const bl of S.blocks) { rr(c, bl.x, bl.y, bl.w, bl.h, 6); fillOut(c, '#5b5490', 2.6); c.fillStyle = alpha('#fff', 0.2); c.fillRect(bl.x + 4, bl.y + 3, bl.w - 8, 3); }
      /* puerta */
      const pulse = 26 + Math.sin(T * 5) * 3; c.beginPath(); c.arc(S.gate.x, S.gate.y, pulse, 0, TAU); c.fillStyle = alpha('#7cf7a0', 0.2); c.fill();
      c.setLineDash([9, 7]); c.lineDashOffset = -T * 22; c.lineWidth = 4; c.strokeStyle = '#7cf7a0'; c.stroke(); c.setLineDash([]);
      /* núcleo */
      const b = S.ball; shadow(c, b.x, b.y + b.r + 3, b.r, 0.22);
      c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); const bg = c.createRadialGradient(b.x - 5, b.y - 6, 2, b.x, b.y, b.r); bg.addColorStop(0, '#fff6c8'); bg.addColorStop(1, '#ffc94d'); fillOut(c, bg, 2.6);
      for (let i = 0; i < 3; i++) glint(c, b.x + Math.cos(T * 2 + i * 2.1) * (b.r + 7), b.y + Math.sin(T * 2 + i * 2.1) * (b.r + 7), 3.4, '#ffe9a8');
      /* jugadores */
      for (const pl of P) { const lean = clamp(pl.vx / 200, -1, 1) * 4;
        puppet(pl.x, pl.y - 6, 1, pl.col, { face: pl.vx < 0 ? -1 : 1, hy: -20, hr: 9, belt: 1, shut: !!pl.stun,
          hands: pl.grab ? [[-13, -16], [13, -16]] : [[-11 + lean, 4], [11 + lean, 4]], feet: [[-6, 22], [6, 22]] });
        /* el nombre se contrarrota para leerse en horizontal y se escalona para que no se tapen entre sí */
        c.save(); c.translate(pl.x, pl.y - 38 - (pl.i % 4) * 14); c.rotate(S.ga); label(tagOf(pl), 0, 0, 13 / GF, pl.col); c.restore();
        if (pl.grab) glint(c, pl.x, pl.y - 30, 4, '#9fd8f2');
      }
      c.restore();
      /* brújula de votos */
      const N = [[0, 1], [-1, 0], [0, -1], [1, 0]], v = this.votes();
      for (let i = 0; i < 4; i++) { const px = WW / 2 + N[i][0] * 190, py = WH / 2 + N[i][1] * 190;
        c.save(); c.translate(px, py); c.rotate(Math.atan2(N[i][1], N[i][0]) - S.ga + Math.PI / 2);
        c.beginPath(); c.moveTo(0, 12); c.lineTo(-9, -6); c.lineTo(9, -6); c.closePath(); c.globalAlpha = i === S.g ? 1 : 0.35; fillOut(c, i === S.g ? '#ffd166' : '#8d8aa8', 2); c.globalAlpha = 1; c.restore();
        if (v[i]) label(String(v[i]), px, py + N[i][1] * 22, 15, '#fff');
      }
      if (S.mt > 0) { c.globalAlpha = Math.min(1, S.mt * 2); label(S.msg, WW / 2, 14, fit(S.msg, WW - 30, 17), '#ffd166'); c.globalAlpha = 1; }
    },
    late(dt) { S.mt = Math.max(0, S.mt - dt); },
  },

  /* ---------------------------------------------------------- El Suelo es Lava */
  lava: {
    hint: ['A: saltar', 'B: empujón', 'No toques la lava'],
    init() {
      S.lava = WH + 30; S.speed = 0; S.plats = []; S.cush = [];
      const F = [ /* muebles: x, y, ancho, alto, tipo */
        [20, 348, 130, 26, 'sofa'], [200, 330, 110, 24, 'mesa'], [360, 356, 120, 22, 'cama'],
        [96, 268, 86, 18, 'silla'], [250, 256, 96, 18, 'estante'], [400, 276, 92, 18, 'silla'],
        [40, 196, 96, 18, 'estante'], [180, 178, 110, 18, 'estante'], [340, 190, 96, 18, 'estante'],
        [120, 112, 90, 16, 'lampara'], [280, 100, 96, 16, 'lampara'], [214, 42, 96, 16, 'estante'],
      ];
      S.plats = F.map(([x, y, w, h, t], i) => ({ x, y, w, h, t, i }));
      const st = [[70, 320], [250, 302], [410, 328], [140, 240]];
      P.forEach((pl, i) => Object.assign(pl, { x: st[i % 4][0], y: st[i % 4][1], vx: 0, vy: 0, w: 16, h: 26, gr: 0, coy: 0, buf: 0, face: 1, push: 0, hits: 0 }));
    },
    step(dt) {
      if (rt > 6) S.speed = lerp(5, 17, (rt - 6) / 55) * soft(); /* la lava no empieza a subir hasta el sexto segundo */
      S.lava = Math.max(-10, S.lava - S.speed * dt);
      for (const pl of alive()) {
        const inp = inputs(pl, dt);
        if (inp.x) pl.face = inp.x > 0 ? 1 : -1;
        const acc2 = pl.gr > 0 ? 1500 : 900, mx = 165 * soft();
        pl.vx += clamp(inp.x, -1, 1) * acc2 * dt;
        if (!inp.x && pl.gr > 0) pl.vx *= Math.exp(-9 * dt);
        pl.vx = clamp(pl.vx, -mx * 1.6, mx * 1.6); if (Math.abs(pl.vx) > mx && pl.gr > 0) pl.vx = Math.sign(pl.vx) * lerp(Math.abs(pl.vx), mx, dt * 6);
        pl.vy += 1500 * dt;
        if (inp.ah) pl.buf = 0.14; pl.buf = Math.max(0, pl.buf - dt); pl.coy = Math.max(0, pl.coy - dt);
        if (pl.buf > 0 && pl.coy > 0) { pl.vy = -510; pl.buf = 0; pl.coy = 0; pl.gr = 0; k.sfx('jump'); }
        if (inp.bh && pl.cd <= 0) { pl.cd = 0.7; pl.push = 0.18; this.shove(pl); }
        pl.cd -= dt; pl.push = Math.max(0, pl.push - dt); pl.stun = Math.max(0, pl.stun - dt);
        pl.x += pl.vx * dt; pl.y += pl.vy * dt;
        if (pl.x < 8) { pl.x = 8; pl.vx = Math.abs(pl.vx) * 0.3; } if (pl.x > WW - 8) { pl.x = WW - 8; pl.vx = -Math.abs(pl.vx) * 0.3; }
        pl.gr = Math.max(0, pl.gr - dt);
        for (const pf of S.plats) { if (pf.y > S.lava - 2) continue; /* lo que cubre la lava deja de sostener */
          if (pl.vy < 0) break;
          if (pl.x + pl.w / 2 > pf.x && pl.x - pl.w / 2 < pf.x + pf.w && pl.y >= pf.y - 14 && pl.y <= pf.y + 14 && pl.vy >= 0) { pl.y = pf.y; pl.vy = 0; pl.gr = 0.1; pl.coy = 0.11; } }
        if (pl.y > S.lava && rt > 5) eliminate(pl, '¡A la lava!');
      }
      const A = alive();
      for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) { const a = A[i], b = A[j], dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) < 17 && Math.abs(dy) < 24) { const ov = (17 - Math.abs(dx)) / 2 * (dx < 0 ? -1 : 1) || 1; a.x -= ov; b.x += ov; const t = (a.vx - b.vx) * 0.25; a.vx -= t; b.vx += t; } }
    },
    shove(pl) {
      let got = false;
      for (const o of alive()) { if (o === pl) continue; const dx = o.x - pl.x, dy = o.y - pl.y;
        if (Math.abs(dx) > 40 || Math.abs(dy) > 26 || Math.sign(dx) !== pl.face) continue;
        o.vx += pl.face * 320; o.vy -= 130; o.stun = 0.3; pl.vx -= pl.face * 90; pl.hits++; got = true;
        k.sfx('hit'); k.shake(3); spark(o.x, o.y - 10, '#fff', 8, 120);
      }
      if (!got) k.sfx('click');
    },
    done() { return alive().length <= 1 || rt >= MD.len; },
    key(pl) { return -pl.y + pl.hits * 5; },
    val(pl) { return !pl.alive ? 'Achicharrado' : 'Altura ' + Math.max(0, Math.round((WH - pl.y) / 3)); },
    ai(pl, ai, s, dt) {
      ai.t -= dt;
      if (ai.t <= 0) { ai.t = lerp(0.5, 0.2, s);
        /* busca el mueble seco más alto al alcance; si el suyo está a punto de anegarse, salta ya */
        let best = null, bs = -1e9;
        for (const pf of S.plats) { if (pf.y > S.lava - 26) continue; const dx = Math.abs(pf.x + pf.w / 2 - pl.x), dy = pl.y - pf.y;
          const sc = (pf.y < pl.y ? 60 : 0) - dx * 0.35 - Math.abs(dy - 70) * 0.25 + k.rnd(-1, 1) * 45 * (1 - s);
          if (dy > 130 || dy < -60) continue; if (sc > bs) { bs = sc; best = pf; } }
        ai.tx = best ? best.x + best.w / 2 + k.rnd(-1, 1) * (best.w / 3) : pl.x;
        ai.ty = best ? best.y : pl.y;
        ai.shove = Math.random() < 0.15 + s * 0.4;
      }
      const dx = (ai.tx == null ? pl.x : ai.tx) - pl.x, near = alive().find((o) => o !== pl && Math.abs(o.x - pl.x) < 34 && Math.abs(o.y - pl.y) < 22 && Math.sign(o.x - pl.x) === pl.face);
      const want = Math.abs(dx) > 10 ? Math.sign(dx) : 0;
      const jump = pl.gr > 0 && ((ai.ty != null && ai.ty < pl.y - 12 && Math.abs(dx) < 70) || pl.y > S.lava - 46);
      return { x: want, y: 0, ah: jump, bh: !!near && ai.shove && rt > 5, b: false };
    },
    draw() {
      const g = c.createLinearGradient(0, 0, 0, WH); g.addColorStop(0, '#3b2f66'); g.addColorStop(1, '#241a46'); c.fillStyle = g; c.fillRect(0, 0, WW, WH);
      /* papel pintado y ventana */
      c.fillStyle = alpha('#6e62f5', 0.1); for (let x = 0; x < WW; x += 34) c.fillRect(x, 0, 16, WH);
      rr(c, 380, 60, 104, 80, 8); fillOut(c, '#2a4e7a', 3); c.fillStyle = alpha('#9fd8f2', 0.5); c.fillRect(386, 66, 92, 68);
      c.lineWidth = 4; c.strokeStyle = '#c98a4b'; c.beginPath(); c.moveTo(432, 60); c.lineTo(432, 140); c.moveTo(380, 100); c.lineTo(484, 100); c.stroke();
      for (const pf of S.plats) this.furn(pf);
      /* jugadores */
      for (const pl of P) { if (!pl.alive) continue;
        const run = Math.abs(pl.vx) > 30 && pl.gr > 0, air = pl.gr <= 0, ph = T * 11;
        puppet(pl.x, pl.y - 14, 0.86, pl.col, { face: pl.face, hy: -22, hr: 9, belt: 1, shut: !!pl.stun, mouth: air ? 'o' : '',
          hands: pl.push > 0 ? [[pl.face * 17, -6], [pl.face * 8, 2]] : air ? [[-11, -18], [11, -18]] : [[-10, run ? 2 + Math.sin(ph) * 5 : 4], [10, run ? 2 - Math.sin(ph) * 5 : 4]],
          feet: air ? [[-7, 16], [8, 18]] : run ? [[-6 + Math.sin(ph) * 8, 22 - Math.max(0, Math.sin(ph)) * 5], [6 - Math.sin(ph) * 8, 22 - Math.max(0, -Math.sin(ph)) * 5]] : [[-6, 22], [6, 22]] });
        /* la etiqueta no se sale por arriba y se escalona para que no se tapen entre ellas */
        label(tagOf(pl), clamp(pl.x, 26, WW - 26), Math.max(13 + (pl.i % 4) * 13, pl.y - 48 - (pl.i % 4) * 13), 13, pl.col);
        if (pl.push > 0) for (let i = 0; i < 2; i++) glint(c, pl.x + pl.face * (22 + i * 8), pl.y - 14, 4, '#fff');
      }
      /* lava */
      const ly = S.lava; if (ly < WH + 20) {
        c.save(); c.beginPath(); c.moveTo(0, ly + Math.sin(T * 2) * 3);
        for (let x = 0; x <= WW; x += 20) c.lineTo(x, ly + Math.sin(T * 2.4 + x * 0.05) * 4 + Math.sin(T * 1.3 + x * 0.02) * 3);
        c.lineTo(WW, WH + 40); c.lineTo(0, WH + 40); c.closePath();
        const lg = c.createLinearGradient(0, ly - 10, 0, WH); lg.addColorStop(0, '#ffd166'); lg.addColorStop(0.25, '#ff7a3d'); lg.addColorStop(1, '#c2281f'); c.fillStyle = lg; c.fill();
        c.lineWidth = 3; c.strokeStyle = alpha('#ffe9a8', 0.8); c.stroke(); c.restore();
        for (let i = 0; i < 6; i++) { const x = ((i * 97 + T * 18) % WW), y = ly + 14 + Math.sin(T * 3 + i) * 6; c.beginPath(); c.arc(x, y, 3 + rs(i) * 3, 0, TAU); c.fillStyle = alpha('#ffe9a8', 0.5); c.fill(); }
      }
    },
    furn(pf) {
      const sub = pf.y > S.lava - 2; c.save(); if (sub) c.globalAlpha = 0.35;
      shadow(c, pf.x + pf.w / 2, pf.y + pf.h + 4, pf.w * 0.45, 0.2);
      if (pf.t === 'sofa') { rr(c, pf.x, pf.y, pf.w, pf.h + 14, 8); fillOut(c, '#c2506e', 2.6); rr(c, pf.x + 6, pf.y - 12, pf.w - 12, 16, 6); fillOut(c, '#d9698a', 2.2);
        for (let i = 0; i < 2; i++) { rr(c, pf.x + 12 + i * (pf.w - 40), pf.y - 8, 26, 14, 5); fillOut(c, '#ffd9e8', 2); } }
      else if (pf.t === 'mesa') { rr(c, pf.x, pf.y, pf.w, 8, 3); fillOut(c, '#c98a4b', 2.4); for (const dx of [8, pf.w - 14]) { rr(c, pf.x + dx, pf.y + 8, 7, pf.h + 14, 2); fillOut(c, '#8a5a2e', 2); } }
      else if (pf.t === 'cama') { rr(c, pf.x, pf.y, pf.w, pf.h + 10, 6); fillOut(c, '#5b8cff', 2.6); rr(c, pf.x + 6, pf.y - 8, 34, 14, 6); fillOut(c, '#fff3fb', 2.2); }
      else if (pf.t === 'silla') { rr(c, pf.x, pf.y, pf.w, 8, 3); fillOut(c, '#a8cf3f', 2.4); rr(c, pf.x + pf.w - 10, pf.y - 22, 8, 24, 3); fillOut(c, '#8fb52f', 2.2); for (const dx of [4, pf.w - 12]) { rr(c, pf.x + dx, pf.y + 8, 6, 16, 2); fillOut(c, '#6f8f24', 2); } }
      else if (pf.t === 'lampara') { rr(c, pf.x, pf.y, pf.w, pf.h, 5); fillOut(c, '#ffc94d', 2.4); c.fillStyle = alpha('#ffe9a8', 0.28); c.beginPath(); c.moveTo(pf.x + 8, pf.y + pf.h); c.lineTo(pf.x + pf.w - 8, pf.y + pf.h); c.lineTo(pf.x + pf.w + 14, pf.y + pf.h + 46); c.lineTo(pf.x - 14, pf.y + pf.h + 46); c.closePath(); c.fill(); }
      else { rr(c, pf.x, pf.y, pf.w, pf.h, 4); fillOut(c, '#9a6a3f', 2.4); c.fillStyle = alpha('#fff', 0.2); c.fillRect(pf.x + 4, pf.y + 3, pf.w - 8, 3);
        for (let i = 0; i < 3; i++) { const bx = pf.x + 8 + i * 18; rr(c, bx, pf.y - 16, 10, 16, 2); fillOut(c, ['#ff6fb5', '#5b8cff', '#a8cf3f'][i % 3], 1.8); } }
      c.restore();
    },
  },
};

/* ================================================================ Bucle */
reset(); k.show(CFG.title, CFG.help);
let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if ((innerHeight > innerWidth * 1.05) !== PORT && k.st !== 'play') location.reload(); }, 350); });
k.run((dt) => {
  T += dt;
  if (!k.gate(reset)) return;
  const md = MODES[M];
  if (phase === 'between') { btw -= dt; if (btw <= 0) { if (round >= MD.rounds) finish(); else newRound(); } return; }
  if (cdPend) { cdPend = false; k.count(3); }
  if (k.counting()) return;
  rt += dt;
  acc += Math.min(dt, 0.25); let n = 0;
  while (acc >= FX && n < 8) { md.step(FX); acc -= FX; n++; }
  if (n >= 8) acc = 0;
  if (md.late) md.late(dt);
  if (md.done()) { if (MD.coop) coopEnd(); else endRound(); }
}, draw);
function coopEnd() {
  phase = 'between'; btw = 1e9;
  k.lose(CFG.id, S.gates, S.gates ? `¡${S.gates} puerta${S.gates === 1 ? '' : 's'}!` : 'Sin puertas', 'El núcleo se queda a oscuras<br>Toca para otra ronda');
}

/* ================================================================ Dibujo */
function card(pl, x, y, w, h) {
  const out = MD.elim && !pl.alive;
  rr(c, x, y, w, h, 12); c.fillStyle = out ? 'rgba(30,26,52,.85)' : 'rgba(34,28,70,.92)'; c.fill(); c.lineWidth = 3; c.strokeStyle = out ? '#4a4466' : pl.col; c.stroke();
  c.beginPath(); c.arc(x + 18, y + 20, 10, 0, TAU); const g = c.createRadialGradient(x + 15, y + 17, 1, x + 18, y + 20, 11); g.addColorStop(0, lite(pl.col, 0.4)); g.addColorStop(1, pl.col); fillOut(c, g, 2);
  c.fillStyle = OUT; c.beginPath(); c.arc(x + 15, y + 19, 1.7, 0, TAU); c.arc(x + 21, y + 19, 1.7, 0, TAU); c.fill();
  const st = '★ ' + pl.pts, sw = MD.coop ? 0 : (c.font = `800 15px ui-rounded,"Trebuchet MS",system-ui,sans-serif`, c.measureText(st).width + 10);
  label(tagOf(pl), x + 34, y + 18, fit(tagOf(pl), w - 44 - sw, 16), out ? '#8a86a5' : pl.col, 'left');
  if (!MD.coop) label(st, x + w - 9, y + 18, 15, '#ffd166', 'right');
  const v = MODES[M].val(pl); label(v, x + 10, y + h - 14, fit(v, w - 20, 13), out ? '#8a86a5' : '#fff', 'left');
}
function draw() {
  c.fillStyle = '#120e26'; c.fillRect(0, 0, W, H);
  c.save(); c.beginPath(); c.rect(0, SY - 2, W, SH + 4); c.clip(); c.translate(OXo, OYo); c.scale(SC, SC);
  MODES[M].draw(); c.restore();
  /* marco del escenario */
  rr(c, OXo - 3, OYo - 3, WW * SC + 6, WH * SC + 6, 12); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 2; c.strokeStyle = '#3d3470'; c.stroke();
  /* marcadores */
  const n = P.length, gap = 6, cw = (W - 16 - gap * (n - 1)) / n, ch = CH;
  P.forEach((pl, i) => card(pl, 8 + i * (cw + gap), 8, cw, ch));
  /* franja de información */
  const iy = 8 + ch + 6, ih = 40;
  if (PORT) { rr(c, 8, iy, W - 16, ih, 10); c.fillStyle = 'rgba(34,28,70,.85)'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#3d3470'; c.stroke(); infoText(8, iy, W - 16, ih); }
  else infoText(8, 8 + ch, W - 16, 24);
  if (phase === 'between' && banner && k.st === 'play' && !MD.coop) drawBanner();
}
function infoText(x, y, w, h) {
  const cy = y + h / 2, left = MD.coop ? `Puertas ${S.gates}` : `${M === 'justa' ? 'Lanza' : 'Ronda'} ${Math.max(1, round)}/${MD.rounds}`;
  const t = Math.max(0, Math.ceil(MD.len - rt)), ts = String(t);
  /* el reloj va centrado de verdad; los dos rótulos se reducen a lo que queda libre a cada lado */
  c.font = '800 20px ui-rounded,"Trebuchet MS",system-ui,sans-serif';
  const half = c.measureText(ts).width / 2, free = Math.max(30, w / 2 - half - 18);
  label(left, x + 10, cy, fit(left, free, 15), '#cfc8ff', 'left');
  label(ts, x + w / 2, cy, 20, t < 6 && phase === 'play' ? '#ff9a3d' : '#fff');
  const hint = MODES[M].hint[Math.floor(T / 3) % MODES[M].hint.length];
  label(hint, x + w - 10, cy, fit(hint, free, 14), '#cfc8ff', 'right');
}
function drawBanner() {
  const a = Math.min(1, (3.4 - btw) * 4), bw = Math.min(W - 40, 340), bh = 86 + banner.order.length * 28, bx = (W - bw) / 2;
  /* el cartel se centra sobre el escenario, no sobre el hueco libre de abajo */
  const by = clamp(OYo + (WH * SC - bh) / 2, SY + 4, SY + SH - bh - 4);
  c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(10,8,24,.55)'; c.fillRect(0, SY, W, SH);
  rr(c, bx, by, bw, bh, 16); c.fillStyle = '#221c46'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
  c.lineWidth = 2.5; c.strokeStyle = banner.tie ? '#ffd166' : banner.order[0].col; rr(c, bx + 4, by + 4, bw - 8, bh - 8, 13); c.stroke();
  label(`${M === 'justa' ? 'Lanza' : 'Ronda'} ${round} de ${MD.rounds}`, bx + bw / 2, by + 22, 16, '#cfc8ff');
  label(banner.tie ? '¡Empate!' : `¡Gana ${tagOf(banner.order[0])}!`, bx + bw / 2, by + 52, 24, banner.tie ? '#ffd166' : banner.order[0].col);
  banner.order.forEach((pl, j) => { const yy = by + 86 + j * 28;
    label(`${j + 1}. ${tagOf(pl)}`, bx + 22, yy, 16, pl.col, 'left');
    label(MODES[M].val(pl), bx + bw / 2 + 16, yy, fit(MODES[M].val(pl), bw / 2 - 60, 14), '#fff');
    label('+' + pl.gain, bx + bw - 20, yy, 16, '#ffd166', 'right'); });
  c.restore();
}
