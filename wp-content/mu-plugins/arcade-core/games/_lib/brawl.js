/* brawl.js — Lucha en plataformas para 1–4 jugadores (la CPU rellena las plazas) con porcentaje de daño y expulsión.
 * CFG.mode: 'pillow' (Almohadazo Arena: almohadas, plumas y nada de violencia gráfica),
 *   'toys'  (Gladiadores de Juguete: figuritas sobre una mesa; caen armas de juguete que cambian A —espada, martillo, arco de
 *            ventosas, escudo de tapa (para golpes de frente), paraguas (B mantenido = planear) y yoyó—; ↓+A suelta el arma;
 *            fases mesa, ventilador, suelo encerado y tren de juguete),
 *   'scrap' (Robots de Chatarra: los golpes fuertes arrancan piezas —antena, brazo, coraza, casco—; con menos piezas corres y
 *            saltas más pero sales más lejos; llave inglesa (repara), batería (puños eléctricos), bomba de tuercas;
 *            fases nave, cinta transportadora, imán gigante y plataformas móviles).
 * Controles (solo joystick + A/B, válido para la tele): A golpe (mantener = golpe cargado), ↑+A molinete que sube,
 * B salto / doble salto, ↓+B esquiva (invulnerable un instante), mantener ↓ sobre un tablón = bajar.
 * Cuanto más % acumulas, más lejos sales volando; si sales de la pantalla pierdes una vida (3 vidas).
 * Objetos en regalos con paracaídas: almohadón gigante, pelota de playa y bomba de plumas.
 * El escenario cambia cada 30 s: pradera, atardecer con viento, pista helada y noche con tablones que se mueven.
 * CPU: nivel 0..9 en localStorage 'cpu:<id>' (sube si gana un humano, baja si un humano queda último). */
const W = 800, H = 450, OUT = ART.OUT, TAU = 6.2832, NP = 4, TH = ART.THEMES;
const ID = CFG.id || 'brawl', MODE = ['toys', 'scrap'].includes(CFG.mode) ? CFG.mode : 'pillow', TOYS = MODE === 'toys', SCRAP = MODE === 'scrap';
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1d1840' }), c = k.ctx;
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
  const OW = 1.5, IW = 0.7, IA = 0.62, CH = {}; let NCH = 0;
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
          /* L = costado superior: el hueso se traza en el mismo sentido de giro que blob/box, así
             dos piezas del mismo color se pueden fundir en un relleno sin abrir agujeros. */
          L.push([pts[i][0] + ty * ws[i], pts[i][1] - tx * ws[i]]);
          R.push([pts[i][0] - ty * ws[i], pts[i][1] + tx * ws[i]]);
        }
        g.moveTo(L[0][0], L[0][1]);
        for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(L[i][0], L[i][1], (L[i][0] + L[i + 1][0]) / 2, (L[i][1] + L[i + 1][1]) / 2);
        g.lineTo(L[n - 1][0], L[n - 1][1]);
        const e = pts[n - 1], w = ws[n - 1], a0 = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
        g.arc(e[0], e[1], w, a0, a0 + Math.PI, false);
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
        /* Piezas contiguas del mismo color y sin detalle propio se funden en UN relleno: todos los
           trazados giran en el mismo sentido, así la regla «nonzero» las suma sin abrir huecos. */
        if (!p[2] && !p[3] && !p[4]) {
          let j = i, m = ds[i];
          while (j + 1 < parts.length && parts[j + 1][1] === p[1] && !parts[j + 1][2] && !parts[j + 1][3] && !parts[j + 1][4]) { j++; if (m === ds[i]) { m = new Path2D(); m.addPath(ds[i]); } m.addPath(ds[j]); }
          g.fillStyle = p[1]; g.fill(m); i = j; continue;
        }
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
      if (++NCH > 600) { for (const kk in CH) delete CH[kk]; NCH = 1; }   /* tope de memoria del caché */
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
const lerp = (a, b, q) => a + (b - a) * q, ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)), clamp = k.clamp;
const FONT = (s, wt) => `${wt || 800} ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
function label(s, x, y, size, col, align, lw) {
  c.font = FONT(size); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = lw || size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function panel(x, y, w, h, r, fill, lw) { ART.rr(c, x, y, w, h, r); ART.fillOut(c, fill, lw || 3); }

/* ---------------- Jugadores y CPU ---------------- */
let LV = 0; try { LV = clamp(+localStorage.getItem('cpu:' + ID) || 0, 0, 9); } catch (e) { /* sin almacenamiento */ }
const SK = () => 0.175 + LV * 0.075; // 1.23: más fácil — 0,175 … 0,85 (antes 0,25 … 1)
let demo = true, t = 0;
const CNAME = ['roja', 'azul', 'amarilla', 'verde'];
const cpu = (p) => demo || !k.human(p);
const col = (p) => k.pcol(p);
const tag = (p) => (cpu(p) ? 'CPU' : k.party ? 'J' + (p + 1) : 'Tú');
const nm = (p) => (cpu(p) ? 'CPU ' + CNAME[p] : k.party ? 'J' + (p + 1) : 'Tú');
k.onParty = () => { /* plazas fijas: quien se va lo sustituye la CPU conservando color, vidas y daño */ };

/* ---------------- Escenario ---------------- */
const T = 32, TOP = 318, MX0 = 176, MX1 = 624, CX = 400;
const PHASES = [
  { th: 'meadow', name: 'Pradera', fx: '', pl: [[208, 236, 128], [464, 236, 128], [336, 160, 128], [336, 160, 0]] },
  { th: 'dusk', name: 'Atardecer ventoso', fx: 'wind', pl: [[150, 250, 112], [538, 250, 112], [344, 186, 112], [344, 186, 0]] },
  { th: 'snow', name: 'Pista helada', fx: 'ice', pl: [[196, 222, 96], [508, 222, 96], [296, 146, 64], [440, 146, 64]] },
  { th: 'night', name: 'Tablones viajeros', fx: 'move', pl: [[160, 240, 96], [544, 240, 96], [352, 170, 96], [352, 170, 0]] },
];
if (TOYS) [['Mesa de juegos', ''], ['Ventilador', 'wind'], ['Suelo encerado', 'ice'], ['Tren de juguete', 'move']].forEach(([n, fx], i) => { PHASES[i].name = n; PHASES[i].fx = fx; PHASES[i].th = 'meadow'; });
if (SCRAP) [['Nave de montaje', ''], ['Cinta transportadora', 'belt'], ['Imán gigante', 'magnet'], ['Plataformas móviles', 'move']].forEach(([n, fx], i) => { PHASES[i].name = n; PHASES[i].fx = fx; PHASES[i].th = 'factory'; });
const PH_LEN = 30, MATCH = 150;
let order = [0, 1, 2, 3], phI = 0, phT = 0, morph = 1, prevTh = null, wind = 0, windT = 0, banner = null, belt = 0, beltT = 0, mag = 0, magT = 0;
const plats = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, w: 0, fx: 0, fy: 0, fw: 0, tx: 0, ty: 0, tw: 0, dx: 0, dy: 0 }));
const phase = () => PHASES[order[phI % order.length]];
const SUBS = TOYS ? { wind: '¡El ventilador sopla!', ice: 'Recién encerado: resbala', move: 'El tren arrastra los bloques' }
  : SCRAP ? { belt: 'La cinta te arrastra', magnet: 'Atrae a los robots ligeros', move: 'Las plataformas se mueven' }
    : { wind: '¡Cuidado con el viento!', ice: 'El suelo resbala', move: 'Los tablones se mueven' };
function setPhase(i, instant) {
  phI = i; const ph = phase(); prevTh = instant ? null : TH[PHASES[order[(i + order.length - 1) % order.length]].th];
  ph.pl.forEach((q, j) => { const P = plats[j]; P.fx = P.x; P.fy = P.y; P.fw = P.w; P.tx = q[0]; P.ty = q[1]; P.tw = q[2]; if (instant) { P.x = P.tx; P.y = P.ty; P.w = P.tw; } });
  morph = instant ? 1 : 0; windT = 0; wind = 0; beltT = 0; magT = 0; mag = 0;
  if (!instant) { banner = { txt: ph.name, sub: SUBS[ph.fx] || 'Todo en calma', t: 2.4 }; k.sfx('start'); }
}
function updStage(dt, live) {
  if (live) { phT += dt; if (phT >= PH_LEN) { phT -= PH_LEN; setPhase(phI + 1); } }
  const ph = phase(); morph = Math.min(1, morph + dt / 1.6); const q = ease(morph);
  plats.forEach((P, j) => {
    const ox = P.x, oy = P.y;
    let tx = P.tx; if (ph.fx === 'move' && j < 3) tx += Math.sin(t * 0.9 + j * 2.1) * (j === 2 ? 110 : 70);
    P.x = lerp(P.fx, tx, q); P.y = lerp(P.fy, P.ty, q); P.w = lerp(P.fw, P.tw, q);
    if (morph >= 1) { P.fx = P.x; P.fy = P.y; P.fw = P.w; }
    P.dx = P.x - ox; P.dy = P.y - oy;
  });
  if (ph.fx === 'belt' && morph >= 1) { beltT += dt; const cyc = beltT % 10; belt = (Math.floor(beltT / 10) % 2 ? -1 : 1) * 95 * clamp(Math.min(cyc, 10 - cyc) / 0.8, 0, 1); } else belt *= 0.9;
  if (ph.fx === 'magnet' && morph >= 1) { magT += dt; const cyc = magT % 8; mag = cyc < 2.5 ? 0 : clamp((cyc - 2.5) / 0.4, 0, 1) * clamp((8 - cyc) / 0.3, 0, 1); } else mag = 0;
  if (ph.fx === 'wind' && morph >= 1) { windT += dt; const cyc = windT % 8, dir = Math.floor(windT / 8) % 2 ? -1 : 1; wind = cyc < 1.5 ? 0 : dir * 170 * ease((cyc - 1.5) / 1.2) * (cyc > 7 ? (8 - cyc) : 1); } else wind *= 0.9;
  if (banner && (banner.t -= dt) <= 0) banner = null;
}
/* Ancho del islote principal a la altura y (se estrecha hacia abajo) */
const span = (y) => { const r = Math.max(0, Math.floor((y - TOP) / T)); return [MX0 + r * T, MX1 - r * T]; };

/* ---------------- Plumas (partículas propias) ---------------- */
const feathers = [];
function puff(x, y, n, cl, spd) { for (let i = 0; i < n && feathers.length < 260; i++) { const a = Math.random() * TAU, v = (spd || 160) * (0.3 + Math.random()); feathers.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, r: Math.random() * TAU, vr: k.rnd(-6, 6), life: 1 + Math.random() * 0.9, col: Math.random() < 0.35 ? cl || '#fff' : '#fff', s: 0.7 + Math.random() * 0.6 }); } }
function updFeathers(dt) {
  const gv = SCRAP ? 900 : 70, dr = SCRAP ? 0.6 : 2.2;
  for (const f of feathers) { f.vx *= 1 - dr * dt; f.vy = f.vy * (1 - dr * dt) + gv * dt; f.x += (f.vx + Math.sin(f.life * 5 + f.r) * 18 + wind * 0.3) * dt; f.y += f.vy * dt; f.r += f.vr * dt; f.life -= dt; }
  for (let i = feathers.length - 1; i >= 0; i--) if (feathers[i].life <= 0) feathers.splice(i, 1);
}
function drawFeathers() {
  for (const f of feathers) {
    c.save(); c.globalAlpha = Math.min(1, f.life / 0.4); c.translate(f.x, f.y); c.rotate(f.r); c.scale(f.s, f.s);
    if (SCRAP) { // tuercas hexagonales
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 5.5, Math.sin(a) * 5.5); } c.closePath();
      c.fillStyle = f.col === '#fff' ? '#b8c2cc' : f.col; c.fill(); c.lineWidth = 1.4; c.strokeStyle = OUT; c.stroke(); c.beginPath(); c.arc(0, 0, 2, 0, TAU); c.fillStyle = OUT; c.fill(); c.restore(); continue;
    }
    if (TOYS) { // confeti de plástico
      c.fillStyle = f.col === '#fff' ? ['#ffd166', '#5ce1e6', '#ff9ad5', '#fff'][Math.floor(f.r * 7 + 20) % 4] : f.col; c.fillRect(-4, -2.5, 8, 5); c.lineWidth = 1; c.strokeStyle = 'rgba(26,21,48,.5)'; c.strokeRect(-4, -2.5, 8, 5); c.restore(); continue;
    }
    c.beginPath(); c.moveTo(-7, 0); c.quadraticCurveTo(0, -4.5, 7, 0); c.quadraticCurveTo(0, 4.5, -7, 0); c.fillStyle = f.col; c.fill(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(26,21,48,.55)'; c.stroke();
    c.beginPath(); c.moveTo(-8, 0); c.lineTo(6, 0); c.stroke(); c.restore();
  }
}

const debris = [];
function updDebris(dt) {
  for (const d of debris) { d.vy += 1300 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.r += d.vr * dt; d.life -= dt;
    if (d.y > TOP && d.y - d.vy * dt <= TOP && d.x > MX0 && d.x < MX1 && d.vy > 0) { d.y = TOP; d.vy *= -0.4; d.vx *= 0.6; d.vr *= 0.5; } }
  for (let i = debris.length - 1; i >= 0; i--) if (debris[i].life <= 0 || debris[i].y > H + 60) debris.splice(i, 1);
}

/* ---------------- Luchadores ---------------- */
const RUN = 240, GRAV = 1500, MAXF = 680, JV = 560, DJV = 510, RISEV = 620, BW = 13, BH = 46, SCL = 1.45;
const SPAWN = [[280, TOP], [520, TOP], [360, TOP], [440, TOP]];
let F = [], items = [], shots = [], elim = 0, stop = 0, itemT = 8, endT = -1, clock = 0, overTxt = '';
function mkFighter(p) {
  return { p, x: SPAWN[p][0], y: SPAWN[p][1], vx: 0, vy: 0, face: p % 2 ? -1 : 1, on: 'main', jumps: 1, upUsed: false, pct: 0, shown: 0, stocks: 3, out: -1, dead: 0, inv: 0, cloud: 0,
    parts: ['ant', 'arm', 'core', 'helm'], elec: 0, glide: false, brk: 0, stun: 0, spin: 0, atk: null, chg: -1, aT: 0, dodge: 0, dodgeCd: 0, airDodge: false, drop: 0, downT: 0, item: null, last: -1, lastT: 0, kos: 0, sq: 0, wasA: false, run: 0,
    ai: { glide: 0, tgt: null, tgtT: 0, think: 0, hold: 0, goal: 0, mx: 0, jump: false, down: false, atkCd: 0, threat: null, flee: 0, fleeDir: 1, react: 0, dodgeRoll: false } };
}
function reset() {
  demo = false; F = [0, 1, 2, 3].map(mkFighter); items = []; shots = []; elim = 0; stop = 0; itemT = TOYS ? 4 : 8; endT = -1; clock = 0; overTxt = ''; feathers.length = 0; debris.length = 0;
  order = [0].concat(k.shuffle([1, 2, 3])); phT = 0; setPhase(0, true); banner = null;
}
function demoReset() { F = [0, 1, 2, 3].map(mkFighter); items = []; shots = []; elim = 0; itemT = 4; clock = 0; }

/* Entrada del jugador humano p o de la CPU → {x,y,aHit,aHeld,bHit,upHit} */
function input(f) {
  if (cpu(f.p)) return aiInput(f);
  const d = k.pdir(f.p);
  return { x: d.x, y: d.y, aHit: k.phit(f.p, 'a'), aHeld: k.pheld(f.p, 'a'), bHit: k.phit(f.p, 'b'), bHeld: k.pheld(f.p, 'b'), upHit: k.phit(f.p, 'up') };
}

/* Ataques: kind → forma y fuerza. r = radio del golpe, dmg %, kb = base + g·% (se multiplica por el objeto) */
const ATK = {
  jab:   { dur: 0.3, a0: 0.05, a1: 0.16, r: 25, dmg: 7, base: 150, g: 2.4, ang: 0.6 },
  smash: { dur: 0.42, a0: 0.08, a1: 0.2, r: 30, dmg: 11, base: 230, g: 4.0, ang: 0.7 },
  spin:  { dur: 0.4, a0: 0.05, a1: 0.3, r: 33, dmg: 8, base: 160, g: 2.6, ang: -1 },
  rise:  { dur: 0.45, a0: 0.0, a1: 0.3, r: 30, dmg: 6, base: 150, g: 2.2, ang: 1.35 },
  // armas de juguete (modo 'toys')
  slash: { dur: 0.34, a0: 0.06, a1: 0.2, r: 34, dmg: 9, base: 175, g: 2.9, ang: 0.55 },
  hammer: { dur: 0.72, a0: 0.34, a1: 0.48, r: 36, dmg: 15, base: 280, g: 4.3, ang: 0.8 },
  bash:  { dur: 0.4, a0: 0.05, a1: 0.28, r: 26, dmg: 7, base: 210, g: 2.4, ang: 0.45 },
  poke:  { dur: 0.32, a0: 0.06, a1: 0.18, r: 26, dmg: 7, base: 170, g: 2.6, ang: 0.5 },
};
/* Armas de juguete: usos, qué hace A y alcance para la CPU. Objetos de chatarra: la llave y la batería se usan al cogerlas */
const WPN = { sword: { uses: 14, act: 'slash', name: '¡Espada de madera!' }, hammer: { uses: 7, act: 'hammer', name: '¡Martillo chirriante!' },
  bow: { uses: 8, act: 'shoot', name: '¡Arco de ventosas!' }, shield: { uses: 10, act: 'bash', name: '¡Escudo de tapa!' },
  umbrella: { uses: 12, act: 'poke', name: '¡Paraguas!' }, yoyo: { uses: 10, act: 'yoyo', name: '¡Yoyó!' } };
const THROW = new Set(TOYS ? [] : SCRAP ? ['bomb'] : ['ball', 'bomb']);
const RANGE = TOYS ? { bow: 380, yoyo: 175 } : SCRAP ? { bomb: 300 } : { ball: 380, bomb: 300 };
const INSTANT = new Set(SCRAP ? ['wrench', 'battery'] : []);
const PNAME = { ant: 'la antena', arm: 'un brazo', core: 'la coraza', helm: 'el casco' };
/* Chatarra: con menos piezas, más ligero (0 completo … 1 sin piezas) */
const light = (f) => (SCRAP ? (4 - f.parts.length) / 4 : 0);
function startAtk(f, kind, q) { f.atk = { kind, t: 0, q: q || 0, hit: [] }; k.sfx(kind === 'smash' ? 'shoot' : 'click'); }
function hitCircle(f) {
  const A = ATK[f.atk.kind], big = f.item && f.item.type === 'giant' ? 1.4 : 1, r = A.r * big;
  if (f.atk.kind === 'jab' || f.atk.kind === 'smash' || f.atk.kind === 'slash' || f.atk.kind === 'bash') return { x: f.x + f.face * (22 + r * 0.45), y: f.y - 26, r };
  if (f.atk.kind === 'poke') return { x: f.x + f.face * (40 + r * 0.45), y: f.y - 30, r };
  if (f.atk.kind === 'hammer') return { x: f.x + f.face * (28 + r * 0.45), y: f.y - 18, r };
  if (f.atk.kind === 'rise') return { x: f.x, y: f.y - 50, r };
  return { x: f.x, y: f.y - 24, r };
}
const hurt = (g, x, y, r) => { const nx = clamp(x, g.x - BW, g.x + BW), ny = clamp(y, g.y - BH, g.y); return (nx - x) ** 2 + (ny - y) ** 2 <= r * r; };
const alive = (g) => g.stocks > 0 && g.dead <= 0;
const vuln = (g) => alive(g) && g.inv <= 0 && g.dodge <= 0;
function applyHit(g, from, dmg, base, gr, ang, dir, mul) {
  g.pct = Math.min(999, g.pct + dmg);
  if (SCRAP) mul = (mul || 1) * (1 + 0.32 * light(g));
  const kb = (base + gr * g.pct) * (mul || 1), ax = Math.cos(ang) * dir, ay = -Math.sin(ang);
  g.vx = ax * kb; g.vy = Math.min(ay * kb, g.on ? -140 : ay * kb); g.on = null;
  g.stun = 0.12 + kb * 0.0012; g.spin = 0; g.atk = null; g.chg = -1; g.last = from; g.lastT = 6; g.jumps = 1; g.upUsed = false;
  stop = Math.max(stop, 0.03 + kb * 0.00007);
  const hx = g.x, hy = g.y - 26; puff(hx, hy, 6 + Math.round(kb / 90), from >= 0 ? col(from) : '#fff', 120 + kb * 0.2);
  k.burst(hx, hy, '#fff', 6, 140); k.shake(Math.min(12, 2 + kb / 110)); k.sfx(kb > 620 ? 'explode' : kb > 380 ? 'hurt' : 'hit');
  if (kb > 620) k.flash('rgba(255,255,255,.25)');
  k.float('+' + dmg + '%', hx, hy - 34, '#ffd166');
  if (SCRAP && g.parts.length && (dmg >= 9 || kb > 330)) loosePart(g, dir);
}
function loosePart(g, dir) {
  const pt = g.parts.pop(); debris.push({ part: pt, x: g.x, y: g.y - (pt === 'ant' ? 66 : pt === 'helm' ? 58 : 34), vx: dir * k.rnd(80, 220), vy: -k.rnd(260, 420), r: 0, vr: k.rnd(-9, 9), life: 2.4, col: col(g.p) });
  k.float('¡Pierde ' + PNAME[pt] + '!', g.x, g.y - 96, '#fff'); k.burst(g.x, g.y - 40, '#ffd166', 8, 180);
}
function blocks(g, fx, kind) { // escudo de tapa: para lo que llega de frente (no lo que viene de arriba)
  if (!TOYS || !g.item || g.item.type !== 'shield' || g.atk || g.chg >= 0 || g.stun > 0 || kind === 'rise') return false;
  if (Math.sign(fx - g.x) !== g.face) return false;
  g.vx = -g.face * 160; g.inv = Math.max(g.inv, 0.12); k.sfx('click'); k.burst(g.x + g.face * 18, g.y - 30, '#fff', 6, 120); k.float('¡Parado!', g.x, g.y - 90, '#fff');
  if (--g.item.uses <= 0) breakItem(g); return true;
}
function breakItem(f) { puff(f.x, f.y - 30, 12, '#fff', 160); f.item = null; f.glide = false; k.float('¡Se rompió!', f.x, f.y - 70, '#fff'); k.sfx('pop'); }
function resolveAtk(f) {
  const A = ATK[f.atk.kind], at = f.atk.t; if (at < A.a0 || at > A.a1) return;
  const h = hitCircle(f), giant = f.item && f.item.type === 'giant', mul = giant ? 1.35 : 1;
  for (const g of F) {
    if (g === f || !vuln(g) || f.atk.hit.includes(g.p) || !hurt(g, h.x, h.y, h.r)) continue;
    f.atk.hit.push(g.p);
    if (blocks(g, f.x, f.atk.kind)) continue;
    let dmg = A.dmg, base = A.base, gr = A.g, ang = A.ang, dir = f.face;
    if (f.atk.kind === 'smash') { dmg = Math.round(A.dmg + 9 * f.atk.q); base = A.base * (0.85 + 0.45 * f.atk.q); gr = A.g * (0.85 + 0.5 * f.atk.q); }
    if (A.ang < 0) { dir = g.x >= f.x ? 1 : -1; ang = clamp(Math.atan2(f.y - g.y + 20, Math.abs(g.x - f.x) + 1), 0.35, 1.2); }
    if (giant) dmg = Math.round(dmg * 1.4);
    if (f.elec > 0) { dmg = Math.round(dmg * 1.3); base *= 1.1; k.burst(g.x, g.y - 30, '#9fe8ff', 10, 220); }
    applyHit(g, f.p, dmg, base, gr, ang, dir, mul);
    if (f.elec > 0) g.stun += 0.15;
    if (giant && f.item && --f.item.uses <= 0) { puff(f.x, f.y - 30, 14, '#fff', 200); f.item = null; k.float('¡Se rompió!', f.x, f.y - 70, '#fff'); }
  }
}
function weaponAct(f) { // A con un arma de juguete
  const it = f.item, w = WPN[it.type];
  if (w.act === 'shoot') { shots.push({ type: 'arrow', x: f.x + f.face * 24, y: f.y - 32, vx: f.face * 640, vy: -40, from: f.p, safe: 0.2, life: 1.3, bounces: 0, rot: 0, rest: false }); k.sfx('shoot'); f.atk = { kind: 'throw', t: 0, q: 0, hit: [] }; }
  else if (w.act === 'yoyo') { if (shots.some((s) => s.type === 'yoyo' && s.from === f.p)) return; shots.push({ type: 'yoyo', x: f.x, y: f.y - 30, vx: f.face, vy: 0, from: f.p, safe: 0, life: 0.6, u: 0, hit: [], bounces: 0, rot: 0, rest: false }); k.sfx('shoot'); f.atk = { kind: 'throw', t: 0, q: 0, hit: [] }; }
  else { startAtk(f, w.act); if (w.act === 'bash') { f.vx = f.face * 430; } }
  if (--it.uses <= 0) f.brk = 0.3;
}
function dropItem(f) {
  items.push({ type: f.item.type, x: f.x, y: f.y - 1, vy: 120, on: false, life: 7, sw: 0, uses: f.item.uses, from: f.p, nog: 1.2 }); f.item = null; f.glide = false; k.sfx('pop');
}
function throwItem(f) {
  const it = f.item; f.item = null; const bomb = it.type === 'bomb';
  shots.push({ type: it.type, x: f.x + f.face * 20, y: f.y - 30, vx: f.face * (bomb ? 430 : 540) + f.vx * 0.3, vy: bomb ? -300 : -170, from: f.p, safe: 0.25, life: bomb ? 1.5 : 3.2, bounces: 0, rot: 0, rest: false });
  k.sfx('shoot'); f.atk = { kind: 'throw', t: 0, q: 0, hit: [] };
}
function explode(s) {
  puff(s.x, s.y, 40, '#fff', 320); k.burst(s.x, s.y, '#ffd166', 14, 260); k.shake(10); k.sfx('explode'); k.flash('rgba(255,255,255,.35)');
  for (const g of F) { if (!vuln(g)) continue; const dx = g.x - s.x, dy = g.y - 24 - s.y, d = Math.hypot(dx, dy); if (d > 100) continue;
    applyHit(g, s.from, 14, 260, 3.8, clamp(Math.atan2(-dy, Math.abs(dx)) + 0.5, 0.45, 1.4), dx >= 0 ? 1 : -1, 1); }
}
function land(f, surf) { if (!f.on && f.vy > 260) { f.sq = 0.22; puff(f.x, f.y, 2, '#fff', 60); } f.on = surf; f.vy = 0; f.jumps = 1; f.upUsed = false; f.airDodge = false; if (f.stun > 0.05) f.stun = Math.min(f.stun, 0.12); }
function ko(f) {
  const ex = clamp(f.x, 16, W - 16), ey = clamp(f.y - 20, 20, H - 20);
  puff(ex, ey, 36, col(f.p), 360); k.burst(ex, ey, col(f.p), 18, 300); k.shake(12); k.sfx('explode'); k.flash('rgba(255,255,255,.3)');
  if (f.last >= 0 && f.lastT > 0 && f.last !== f.p) { F[f.last].kos++; k.float('¡KO!', clamp(ex, 60, W - 60), clamp(ey, 60, H - 90), col(f.last)); }
  f.stocks--; f.item = null; f.elec = 0; f.glide = false; f.brk = 0; f.atk = null; f.chg = -1; f.stun = 0; f.vx = f.vy = 0;
  if (f.stocks <= 0) { f.out = elim++; f.dead = 1e9; k.float(nm(f.p) + ' eliminado', 400, 120, col(f.p)); }
  else f.dead = 1.3;
}
function respawn(f) {
  if (SCRAP) f.parts = ['ant', 'arm', 'core', 'helm'];
  f.dead = 0; f.x = [340, 460, 280, 520][f.p]; f.y = 118; f.vx = f.vy = 0; f.pct = 0; f.shown = 0; f.inv = 2.6; f.cloud = 2.4; f.on = 'cloud'; f.jumps = 1; f.upUsed = false; f.last = -1;
  puff(f.x, f.y, 10, '#fff', 90);
}

function updFighter(f, dt) {
  if (f.stocks <= 0) return;
  if (f.dead > 0) { f.dead -= dt; if (f.dead <= 0) respawn(f); return; }
  const ph = phase(), ice = ph.fx === 'ice' && f.on === 'main', inp = input(f);
  f.inv = Math.max(0, f.inv - dt); f.dodge = Math.max(0, f.dodge - dt); f.dodgeCd = Math.max(0, f.dodgeCd - dt); f.drop = Math.max(0, f.drop - dt); f.lastT -= dt; f.sq *= 0.85;
  f.shown += (f.pct - f.shown) * Math.min(1, dt * 10);
  if (f.item && f.item.type === 'giant' && (f.item.t -= dt) <= 0) { puff(f.x, f.y - 30, 12, '#fff', 160); f.item = null; }
  if (f.brk > 0 && (f.brk -= dt) <= 0) { f.brk = 0; if (f.item) breakItem(f); }
  if (f.elec > 0) { f.elec -= dt; if (Math.random() < dt * 12) k.burst(f.x + f.face * 16, f.y - 34, '#9fe8ff', 1, 80); }
  const lt = light(f), spd = 1 + 0.22 * lt, jmp = 1 + 0.12 * lt;
  // nube de reaparición: quieto hasta que se mueva o pase el tiempo
  if (f.cloud > 0) { f.cloud -= dt; if (Math.abs(inp.x) > 0.3 || inp.bHit || inp.aHit || inp.upHit || f.cloud <= 0) { f.cloud = 0; f.on = null; f.inv = Math.min(f.inv, 1); } else { f.vx = f.vy = 0; f.wasA = inp.aHeld; return; } }
  const stunned = f.stun > 0; if (stunned) { f.stun -= dt; f.spin += dt * (8 + Math.hypot(f.vx, f.vy) / 60) * (f.vx >= 0 ? 1 : -1); } else f.spin = 0;
  // --- control
  if (!stunned) {
    const busy = f.atk && f.atk.kind !== 'throw';
    const mv = f.chg >= 0 ? 0.25 : busy && f.on ? (f.atk.kind === 'bash' ? 1 : 0.2) : 1, want = inp.x * RUN * mv * spd;
    if (f.on) { const acc = ice ? 520 : 2200; f.vx += clamp(want - f.vx, -acc * dt, acc * dt); }
    else { f.vx += clamp(want - f.vx, -1100 * dt, 1100 * dt); }
    if (Math.abs(inp.x) > 0.3 && !busy && f.chg < 0) f.face = inp.x > 0 ? 1 : -1;
    // salto y doble salto
    const jump = inp.bHit && inp.y < 0.5 || inp.upHit && !inp.aHit;
    if (jump && !busy) {
      if (f.on) { f.vy = -JV * jmp; f.on = null; f.sq = -0.15; k.sfx('jump'); puff(f.x, f.y, 3, '#fff', 60); }
      else if (f.jumps > 0) { f.jumps--; f.vy = -DJV * jmp; f.sq = -0.12; k.sfx('jump'); puff(f.x, f.y, 5, '#fff', 90); }
    }
    // esquiva ↓+B
    if (inp.bHit && inp.y > 0.5 && f.dodgeCd <= 0 && (f.on || !f.airDodge)) {
      f.dodge = 0.32; f.dodgeCd = 0.9; if (!f.on) { f.airDodge = true; f.vy = Math.min(f.vy, 60); } else f.vx = (Math.abs(inp.x) > 0.3 ? Math.sign(inp.x) : -f.face) * 330;
      f.atk = null; f.chg = -1; k.sfx('pop');
    }
    // bajar de un tablón manteniendo ↓
    if (inp.y > 0.5 && !inp.bHit && typeof f.on === 'number') { f.downT += dt; if (f.downT > 0.14) { f.on = null; f.drop = 0.25; f.vy = 60; } } else f.downT = 0;
    // paraguas: B mantenido en el aire = planear
    f.glide = TOYS && !f.on && f.item && f.item.type === 'umbrella' && inp.bHeld && f.vy > 0 && inp.y <= 0.5;
    // caída rápida
    if (!f.on && inp.y > 0.5 && f.vy > 0) f.vy = Math.max(f.vy, 520);
    // ataques
    if (!f.atk && f.dodge <= 0) {
      if (inp.aHit && TOYS && f.item && inp.y > 0.5) dropItem(f);
      else if (inp.aHit && f.item && THROW.has(f.item.type)) throwItem(f);
      else if (inp.aHit && inp.y < -0.5) { if (!f.upUsed) { f.upUsed = true; f.vy = -RISEV * jmp; f.on = null; startAtk(f, 'rise'); puff(f.x, f.y, 6, '#fff', 110); } }
      else if (inp.aHit && TOYS && f.item && WPN[f.item.type]) weaponAct(f);
      else if (inp.aHit && !f.on) startAtk(f, 'spin');
      else if (inp.aHit && f.on) f.chg = 0;
    }
    if (f.chg >= 0) {
      if (!f.on) f.chg = -1;
      else if (inp.aHeld && f.chg < 1.1) { f.chg += dt; if (f.chg > 0.16 && Math.floor(f.chg * 12) !== Math.floor((f.chg - dt) * 12)) puff(f.x - f.face * 18, f.y - 50, 1, col(f.p), 40); }
      else { const q = clamp((f.chg - 0.16) / 0.9, 0, 1); startAtk(f, f.chg < 0.16 ? 'jab' : 'smash', q); f.chg = -1; }
    }
  }
  if (f.atk) { f.atk.t += dt; if (ATK[f.atk.kind]) resolveAtk(f); const d = ATK[f.atk.kind] ? ATK[f.atk.kind].dur : 0.25; if (f.atk && f.atk.t >= d) f.atk = null; }
  f.wasA = inp.aHeld;
  // --- física
  if (f.on === 'main' && !stunned) { const fr = ice ? 180 : 1800; if (Math.abs(inp.x) < 0.2) f.vx -= clamp(f.vx, -fr * dt, fr * dt); }
  if (stunned) f.vx *= Math.exp(-0.8 * dt);
  f.vx += wind * dt * (f.on ? 0.55 : 1);
  if (!f.on) { f.vy = Math.min(f.vy + GRAV * dt * (f.dodge > 0 ? 0.3 : 1), stunned ? 1400 : Math.max(MAXF, f.vy)); }
  if (f.glide) { f.vy = Math.min(f.vy, 95); f.jumps = 0; }
  if (mag > 0 && !f.on) f.vy -= mag * (330 + 520 * lt) * dt * (f.y < 60 ? 0.3 : 1); // imán: tira más de los ligeros
  if (belt && f.on === 'main') f.x += belt * dt;
  // transportado por el tablón
  if (typeof f.on === 'number') { const P = plats[f.on]; f.x += P.dx; f.y = P.y; if (P.w < 8 || f.x < P.x - 4 || f.x > P.x + P.w + 4) f.on = null; }
  const oy = f.y; f.x += f.vx * dt; f.y += f.vy * dt;
  if (f.on === 'main' && (f.x < MX0 - 4 || f.x > MX1 + 4)) f.on = null;
  if (!f.on && f.vy >= 0) {
    if (oy <= TOP + 0.5 && f.y >= TOP && f.x >= MX0 - 4 && f.x <= MX1 + 4) { f.y = TOP; land(f, 'main'); }
    else if (f.drop <= 0) for (let j = 0; j < 4; j++) { const P = plats[j]; if (P.w < 20) continue; if (oy <= P.y + Math.max(0, P.dy) + 0.5 && f.y >= P.y && f.x >= P.x - 4 && f.x <= P.x + P.w + 4) { f.y = P.y; land(f, j); break; } }
  }
  // lados y panza del islote: empuja hacia fuera
  if (f.y > TOP + 2) { for (const yy of [f.y, f.y - BH * 0.5]) { if (yy <= TOP) continue; const [a, b] = span(yy); if (f.x + BW > a && f.x - BW < b) { if (f.x < CX) { f.x = a - BW; f.vx = Math.min(f.vx, stunned ? -Math.abs(f.vx) * 0.5 : 0); } else { f.x = b + BW; f.vx = Math.max(f.vx, stunned ? Math.abs(f.vx) * 0.5 : 0); } } } }
  if (f.y - BH < TOP && f.y > TOP + 2 && f.x > MX0 && f.x < MX1 && f.vy < 0) { f.vy = 0; }
  // zonas de expulsión
  if (f.x < -110 || f.x > W + 110 || f.y > H + 130 || f.y < -190) ko(f);
}

/* ---------------- Objetos ---------------- */
const ITYPES = TOYS ? Object.keys(WPN) : SCRAP ? ['wrench', 'battery', 'bomb', 'wrench'] : ['giant', 'ball', 'bomb'];
const INAME = { giant: '¡Almohadón!', ball: '¡Pelota!', bomb: SCRAP ? '¡Bomba de tuercas!' : '¡Bomba de plumas!', wrench: '¡Llave inglesa!', battery: '¡Batería!' };
function updItems(dt, live) {
  if ((itemT -= dt) <= 0 && items.length < (TOYS ? 3 : 2)) { itemT = k.rnd(9, 14) * (live ? 1 : 0.6) * (TOYS ? 0.65 : 1);
    const sp = [[MX0 + 30, MX1 - 30]].concat(plats.filter((P) => P.w > 60).map((P) => [P.x + 16, P.x + P.w - 16])), s = k.pick(sp);
    items.push({ type: k.pick(ITYPES), x: k.rnd(s[0], s[1]), y: -30, vy: 70, on: false, life: 14, sw: Math.random() * 6 }); }
  for (const it of items) {
    it.sw += dt; if (it.nog > 0) it.nog -= dt;
    if (!it.on) { const oy = it.y; it.y += it.vy * dt; it.x += Math.sin(it.sw * 1.6) * 18 * dt + wind * 0.15 * dt;
      if (oy <= TOP && it.y >= TOP && it.x > MX0 && it.x < MX1) { it.y = TOP; it.on = 'main'; }
      else for (let j = 0; j < 4; j++) { const P = plats[j]; if (P.w > 20 && oy <= P.y && it.y >= P.y && it.x > P.x && it.x < P.x + P.w) { it.y = P.y; it.on = j; } }
      if (it.y > H + 40) it.life = 0;
    } else { if (typeof it.on === 'number') { const P = plats[it.on]; it.x += P.dx; it.y = P.y; if (it.x < P.x - 6 || it.x > P.x + P.w + 6 || P.w < 20) it.on = false; } else if (belt) it.x += belt * dt; if (it.on === 'main' && (it.x < MX0 || it.x > MX1)) it.on = false; it.life -= dt; }
    for (const f of F) if (alive(f) && !(it.nog > 0 && it.from === f.p) && (!f.item || INSTANT.has(it.type)) && f.cloud <= 0 && Math.abs(f.x - it.x) < 26 && Math.abs(f.y - 20 - (it.y - 14)) < 38 && it.life > 0) {
      it.life = 0; k.sfx('coin'); puff(it.x, it.y - 14, 10, '#ffd166', 140);
      if (it.type === 'wrench') { const miss = ['ant', 'arm', 'core', 'helm'].filter((q) => !f.parts.includes(q)); if (miss.length) { f.parts.push(miss[0]); k.float('¡Repara ' + PNAME[miss[0]] + '!', it.x, it.y - 60, '#7cf7a0'); } else { f.pct = Math.max(0, f.pct - 15); k.float('−15 %', it.x, it.y - 60, '#7cf7a0'); } k.sfx('win'); break; }
      if (it.type === 'battery') { f.elec = 12; k.float('¡Puños eléctricos!', it.x, it.y - 60, '#9fe8ff'); break; }
      f.item = { type: it.type, uses: it.uses || (WPN[it.type] ? WPN[it.type].uses : 6), t: 14 };
      k.float(WPN[it.type] ? WPN[it.type].name : INAME[it.type], it.x, it.y - 60, '#fff'); break; }
  }
  items = items.filter((it) => it.life > 0);
  for (const s of shots) {
    s.life -= dt; s.safe -= dt; s.rot += dt * (s.rest ? 0 : 10) * Math.sign(s.vx || 1);
    if (s.type === 'yoyo') { // sale y vuelve a la mano, golpea una vez a cada rival en cada viaje
      const o = F[s.from]; if (!alive(o)) { s.life = 0; continue; }
      const u0 = s.u; s.u = Math.min(1, s.u + dt / 0.6); if (u0 < 0.5 && s.u >= 0.5) s.hit = [];
      s.x = o.x + s.vx * Math.sin(Math.PI * s.u) * 170; s.y = o.y - 30; s.life = s.u >= 1 ? 0 : 1; s.rot += dt * 20;
      for (const g of F) { if (g === o || !vuln(g) || s.hit.includes(g.p) || !hurt(g, s.x, s.y, 13)) continue; s.hit.push(g.p); if (blocks(g, s.x, 'yoyo')) continue;
        applyHit(g, s.from, 7, 170, 2.4, 0.5, s.u < 0.5 ? s.vx : -s.vx, 1); }
      continue;
    }
    if (!s.rest) { s.vy += (s.type === 'ball' ? 900 : s.type === 'arrow' ? 260 : 1100) * dt; s.vx += wind * 0.4 * dt; const oy = s.y; s.x += s.vx * dt; s.y += s.vy * dt;
      let floor = null; if (oy <= TOP && s.y >= TOP && s.x > MX0 && s.x < MX1) floor = TOP; else for (const P of plats) if (P.w > 20 && oy <= P.y && s.y >= P.y && s.x > P.x && s.x < P.x + P.w) floor = P.y;
      if (floor != null) { s.y = floor; if (s.type === 'arrow') { s.rest = true; s.vy = 0; s.life = Math.min(s.life, 0.5); } else if (s.type === 'ball' && s.bounces < 3) { s.vy = -Math.abs(s.vy) * 0.62; s.vx *= 0.85; s.bounces++; k.sfx('pop'); } else if (s.type === 'bomb') { s.rest = true; s.vx = s.vy = 0; } else s.life = Math.min(s.life, 0.4); }
    }
    for (const g of F) { if (!vuln(g) || (g.p === s.from && s.safe > 0) || s.life <= 0) continue;
      if (hurt(g, s.x, s.y - (s.type === 'ball' ? 0 : 0), s.type === 'ball' ? 16 : 13)) {
        if (s.type === 'bomb') { s.life = 0; s.boom = true; explode(s); break; }
        if (s.rest) continue;
        if (blocks(g, s.x, s.type)) { s.vx = -s.vx * 0.3; s.vy = -200; s.rest = s.type === 'arrow' ? false : s.rest; s.from = g.p; s.safe = 0.4; s.life = Math.min(s.life, 0.5); continue; }
        if (s.type === 'arrow') { applyHit(g, s.from, 6, 150, 2.0, 0.45, Math.sign(s.vx) || 1, 1); s.life = 0; continue; }
        applyHit(g, s.from, 9, 210, 3.0, 0.55, Math.sign(s.vx) || 1, 1); s.vx = -s.vx * 0.4; s.vy = -260; s.from = g.p; s.safe = 0.3; s.life = Math.min(s.life, 0.8); }
    }
    if (s.type === 'bomb' && s.life <= 0 && !s.boom) { s.boom = true; explode(s); }
  }
  shots = shots.filter((s) => s.life > 0 && s.y < H + 60 && s.x > -80 && s.x < W + 80);
}

/* ---------------- CPU ---------------- */
function aiInput(f) {
  const o = aiCore(f);
  if (TOYS && o.aHit && o.y > 0.5) o.y = 0; // la CPU no suelta el arma sin querer
  if (TOYS && f.item && f.item.type === 'umbrella' && !f.on && f.vy > 0) { const offX = f.x < MX0 - 2 || f.x > MX1 + 2; o.bHeld = offX || f.ai.glide > 0; }
  if (TOYS && f.ai.glide > 0) f.ai.glide -= 1 / 60;
  if (MODE !== 'pillow' && !demo && clock < 5) { o.aHit = false; o.aHeld = false; } // nada te golpea en los 5 primeros segundos
  return o;
}
function aiCore(f) {
  const ai = f.ai, sk = SK() * (demo ? 0.8 : lerp(0.6, 1, ease(clock / 105))), o = { x: 0, y: 0, aHit: false, aHeld: false, bHit: false, upHit: false };
  ai.atkCd -= 1 / 60; ai.think -= 1 / 60; ai.tgtT -= 1 / 60;
  if (ai.hold > 0) { ai.hold -= 1 / 60; o.aHeld = true; }
  if (f.stun > 0) return o;
  // ¿fuera del escenario? volver
  const offX = f.x < MX0 - 2 || f.x > MX1 + 2, overPlat = plats.some((P) => P.w > 30 && f.x > P.x && f.x < P.x + P.w && f.y <= P.y + 2);
  if (!f.on && offX && !overPlat) {
    o.x = f.x < CX ? 1 : -1;
    if (f.vy > -60 && f.y > TOP - 70 && f.jumps > 0 && Math.random() < 0.3 + sk * 0.5) o.bHit = true;
    else if (f.jumps === 0 && !f.upUsed && f.vy > -80 && f.y > TOP - 30 && Math.random() < 0.25 + sk * 0.6) { o.aHit = true; o.y = -1; }
    return o;
  }
  // objetivo: el rival cercano, con preferencia por el que lleva más daño
  if (!ai.tgt || !alive(ai.tgt) || ai.tgtT <= 0) {
    let best = null, bv = 1e9; for (const g of F) { if (g === f || !alive(g)) continue; const v = Math.hypot(g.x - f.x, (g.y - f.y) * 1.4) - g.pct * 0.7 + (g.inv > 0 ? 150 : 0) + Math.random() * 60; if (v < bv) { bv = v; best = g; } }
    ai.tgt = best; ai.tgtT = k.rnd(1.2, 2.4);
  }
  // reacción a peligros (con retardo según nivel)
  let danger = null;
  for (const g of F) if (g !== f && alive(g) && (g.chg > 0.1 || g.atk && ATK[g.atk.kind] && g.atk.t < ATK[g.atk.kind].a1) && Math.abs(g.x - f.x) < 95 && Math.abs(g.y - f.y) < 70 && (g.atk && g.atk.kind === 'spin' || Math.sign(f.x - g.x) === g.face)) danger = g;
  for (const s of shots) if (s.from !== f.p && Math.abs(s.x - f.x) < (s.type === 'bomb' ? 120 : 150) && Math.abs(s.y - f.y + 24) < 90 && (s.rest || Math.sign(f.x - s.x) === Math.sign(s.vx))) danger = s;
  if (danger && ai.threat !== danger) { ai.threat = danger; ai.react = lerp(0.34, 0.1, sk) + Math.random() * 0.08; ai.dodgeRoll = Math.random() < 0.2 + sk * 0.55; }
  if (!danger) ai.threat = null;
  if (ai.threat && ai.dodgeRoll && (ai.react -= 1 / 60) <= 0) {
    ai.dodgeRoll = false;
    const bomb = ai.threat.type === 'bomb';
    if (bomb || Math.random() < 0.4) { if (f.on) o.bHit = true; ai.flee = 0.5; ai.fleeDir = f.x < ai.threat.x ? -1 : 1; if (f.x < MX0 + 60) ai.fleeDir = 1; if (f.x > MX1 - 60) ai.fleeDir = -1; }
    else if (f.dodgeCd <= 0) { o.bHit = true; o.y = 1; o.x = f.x < CX ? 1 : -1; return o; }
  }
  if (ai.flee > 0) { ai.flee -= 1 / 60; o.x = ai.fleeDir; }
  // cargando: soltar cuando toca
  if (f.chg >= 0) { const g = ai.tgt, near = g && Math.abs(g.x - f.x) < 62 && Math.abs(g.y - f.y) < 40; o.aHeld = f.chg < ai.goal && (near || f.chg < 0.2) && !(g && g.atk && Math.abs(g.x - f.x) < 60); if (!o.aHeld) ai.hold = 0; return o; }
  const g = ai.tgt; if (!g) { if (f.on === 'main') o.x = f.x < CX - 60 ? 1 : f.x > CX + 60 ? -1 : 0; return o; }
  // recoger objetos cercanos
  let goal = g.x, goalY = g.y;
  if (!f.item || SCRAP) { const it = items.find((q) => q.on && Math.abs(q.x - f.x) < 240 && Math.abs(q.y - f.y) < 120 && (!f.item || INSTANT.has(q.type)) && (q.type !== 'wrench' || f.parts.length < 4 || f.pct > 30)); if (it && Math.random() < 0.9) { goal = it.x; goalY = it.y; } }
  // lanzar lo que lleva (o disparar el arco / el yoyó)
  if (f.item && RANGE[f.item.type]) {
    const tdx = g.x - f.x, tdy = g.y - f.y;
    if (Math.abs(tdy) < 60 && Math.abs(tdx) > 80 && Math.abs(tdx) < RANGE[f.item.type] && ai.atkCd <= 0) { o.x = Math.sign(tdx) * 0.4; if (Math.sign(tdx) === f.face && Math.random() < 0.08 + sk * 0.2) { o.aHit = true; ai.atkCd = 0.6; } return o; }
    if (Math.abs(tdx) < 80) goal = clamp(f.x - Math.sign(tdx || 1) * 120, MX0 + 30, MX1 - 30);
  }
  const dx = goal - f.x, dy = goalY - f.y, adx = Math.abs(dx);
  if (ai.flee <= 0) {
    // moverse hacia el objetivo sin caerse del islote
    const want = adx > 34 ? Math.sign(dx) : 0;
    let mx = want; if (f.on === 'main' && ((f.x < MX0 + 26 && mx < 0) || (f.x > MX1 - 26 && mx > 0)) && (g.y > TOP + 10 || goal < MX0 || goal > MX1)) mx = 0;
    if (typeof f.on === 'number') { const P = plats[f.on]; if ((f.x < P.x + 10 && mx < 0 || f.x > P.x + P.w - 10 && mx > 0) && dy < -20) mx = 0; }
    o.x = mx * (0.7 + 0.3 * sk);
    if (adx < 34 && Math.sign(dx) !== f.face && Math.random() < 0.2) o.x = Math.sign(dx) * 0.4;
    // saltar hacia arriba / bajar
    if (dy < -50 && adx < 180 && f.on && Math.random() < 0.08 + sk * 0.1) o.bHit = true;
    else if (dy < -60 && !f.on && f.vy > 0 && f.jumps > 0 && Math.random() < 0.08) o.bHit = true;
    if (dy > 50 && typeof f.on === 'number' && adx < 200) o.y = 1;
  }
  // atacar
  const tdx = g.x - f.x, tdy = g.y - f.y, big = f.item ? { giant: 14, sword: 10, hammer: 12, umbrella: 16, shield: 4 }[f.item.type] || 0 : 0;
  if (ai.atkCd <= 0 && !f.atk && alive(g) && g.inv <= 0) {
    const agg = (0.35 + sk * 0.55) * (clock < 3 && !demo ? 0.5 : 1);
    if (Math.abs(tdx) < 26 && tdy < -30 && tdy > -110) { if (Math.random() < agg) { o.aHit = true; o.y = -1; } ai.atkCd = lerp(0.8, 0.3, sk); }
    else if (Math.abs(tdx) < 52 + big && Math.abs(tdy) < 42) {
      if (Math.sign(tdx) !== f.face && Math.abs(tdx) > 6) o.x = Math.sign(tdx) * 0.35;
      else if (Math.random() < agg) {
        o.aHit = true;
        if (f.on && g.pct > 55 && Math.random() < 0.25 + sk * 0.35) { ai.goal = k.rnd(0.3, 0.3 + sk * 0.7); ai.hold = 1.2; o.aHeld = true; }
        else if (f.on) { o.aHeld = false; }
      }
      ai.atkCd = lerp(0.7, 0.2, sk) + Math.random() * 0.25;
    } else if (!f.on && Math.abs(tdx) < 60 && Math.abs(tdy) < 50 && Math.random() < agg * 0.4) { o.aHit = true; ai.atkCd = 0.5; }
  }
  // saltitos para no parecer un robot
  if (f.on && Math.random() < 0.004) o.bHit = true;
  return o;
}

/* ---------------- Dibujo ---------------- */
function drawIsland(th) {
  const n = (MX1 - MX0) / T;
  for (let r = 0; r < 5; r++) { const a = MX0 + r * T, m = n - r * 2; if (m <= 0) break;
    for (let i = 0; i < m; i++) ART.tile(c, th, 'ground', a + i * T, TOP + r * T, T, { top: r === 0, left: i === 0, right: i === m - 1 }); }
}
function drawPlank(P, th) {
  if (P.w < 4) return; const x = P.x, y = P.y, w = P.w, a = clamp(P.w / 40, 0, 1);
  c.save(); c.globalAlpha = a;
  c.strokeStyle = 'rgba(26,21,48,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 10, y + 12); c.lineTo(x + 10, y + 26); c.moveTo(x + w - 10, y + 12); c.lineTo(x + w - 10, y + 26); c.stroke();
  ART.rr(c, x, y, w, 14, 6); const gr = c.createLinearGradient(0, y, 0, y + 14); gr.addColorStop(0, ART.lite(th.plank, 0.25)); gr.addColorStop(1, ART.dark(th.plank, 0.2)); c.fillStyle = gr; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x + 6, y + 3, w - 12, 2.5);
  c.strokeStyle = 'rgba(26,21,48,.35)'; c.lineWidth = 1.2; for (let i = 1; i < w / 32; i++) { c.beginPath(); c.moveTo(x + i * 32, y + 2); c.lineTo(x + i * 32, y + 12); c.stroke(); }
  c.fillStyle = OUT; c.beginPath(); c.arc(x + 7, y + 8, 1.6, 0, TAU); c.arc(x + w - 7, y + 8, 1.6, 0, TAU); c.fill();
  c.restore();
}
function pillow(x, y, ang, s, cl, glow) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  if (glow) { c.fillStyle = `rgba(255,209,102,${0.25 + glow * 0.35})`; c.beginPath(); c.ellipse(18, 0, 26 + glow * 6, 18 + glow * 5, 0, 0, TAU); c.fill(); }
  const bag = (g) => { g.moveTo(3, -10); g.quadraticCurveTo(18, -7, 33, -10); g.quadraticCurveTo(30, 0, 33, 10); g.quadraticCurveTo(18, 7, 3, 10); g.quadraticCurveTo(6, 0, 3, -10); g.closePath(); };
  PZ.unite(c, [[bag, '#efeafd']], 1.5);
  c.fillStyle = ART.dark('#efeafd', 0.14); c.beginPath(); c.moveTo(3, 10); c.quadraticCurveTo(18, 7, 33, 10); c.quadraticCurveTo(26, 2, 20, 1); c.closePath(); c.fill();
  c.fillStyle = cl; c.fillRect(15, -8, 5, 16); PZ.shine(c, 9, -4, 3.4, 1.7, 0, 0.8);
  c.restore();
}
function gift(x, y, type, sw, falling) {
  c.save(); c.translate(x, y);
  if (falling) { c.rotate(Math.sin(sw * 1.6) * 0.12);
    c.strokeStyle = 'rgba(26,21,48,.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-12, -24); c.lineTo(-22, -52); c.moveTo(12, -24); c.lineTo(22, -52); c.stroke();
    c.beginPath(); c.moveTo(-28, -50); c.quadraticCurveTo(0, -84, 28, -50); c.quadraticCurveTo(14, -56, 0, -50); c.quadraticCurveTo(-14, -56, -28, -50); c.closePath(); ART.fillOut(c, '#ff9ad5', 2.4);
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-8, -64, 8, 3, -0.4, 0, TAU); c.fill(); }
  const bc = type === 'giant' ? '#b98cff' : type === 'ball' ? '#5ce1e6' : '#ffd166';
  ART.rr(c, -14, -26, 28, 26, 5); ART.fillOut(c, bc, 2.4); c.fillStyle = '#fff'; c.fillRect(-3, -26, 6, 26); c.fillRect(-14, -16, 28, 5);
  c.strokeStyle = OUT; c.lineWidth = 1.2; c.strokeRect(-3, -26, 6, 26);
  c.beginPath(); c.ellipse(-6, -30, 6, 4, -0.5, 0, TAU); c.ellipse(6, -30, 6, 4, 0.5, 0, TAU); ART.fillOut(c, '#fff', 2);
  c.restore();
}
function ball(x, y, r, rot) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const cs = ['#ff5a5f', '#fff', '#3fb6ea', '#fff', '#ffd166', '#fff'];
  for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, i * TAU / 6, (i + 1) * TAU / 6); c.closePath(); c.fillStyle = cs[i]; c.fill(); }
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke(); c.beginPath(); c.arc(0, 0, r * 0.22, 0, TAU); ART.fillOut(c, '#fff', 1.5);
  c.restore();
}
function bomb(x, y, rot, blink) {
  c.save(); c.translate(x, y); c.rotate(rot * 0.3);
  c.beginPath(); c.arc(0, 0, 13, 0, TAU); const gr = c.createRadialGradient(-4, -4, 1, 0, 0, 14); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, blink ? '#ff9a9a' : '#e6ddff'); c.fillStyle = gr; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = '#ff5a5f'; c.beginPath(); c.moveTo(-13, -2); c.quadraticCurveTo(0, 4, 13, -2); c.lineTo(13, 2); c.quadraticCurveTo(0, 8, -13, 2); c.closePath(); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -13); c.quadraticCurveTo(4, -20, 9, -19); c.stroke();
  for (let i = 0; i < 3; i++) { c.save(); c.translate(-2 + i * 2, -13); c.rotate(-0.7 + i * 0.7); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-3, -6, 0, -11); c.quadraticCurveTo(3, -6, 0, 0); ART.fillOut(c, '#fff', 1.2); c.restore(); }
  if (blink) { c.fillStyle = '#ffd166'; c.beginPath(); c.arc(9, -19, 3, 0, TAU); c.fill(); }
  c.restore();
}
/* ---------------- Dibujo de los modos juguete y chatarra ---------------- */
let ROOM = null;
function room() { // habitación de juegos (cacheada a ×2): papel pintado, ventana, estantería y alfombra
  if (ROOM) return ROOM; const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffe7c2'); gr.addColorStop(1, '#f6c79c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 40) { g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x, 0, 16, H); g.fillStyle = 'rgba(230,150,110,.18)'; for (let y = 20; y < H; y += 60) { g.beginPath(); g.arc(x + 30, y + (x / 40 % 2) * 30, 3, 0, TAU); g.fill(); } }
  // ventana
  ART.rr(g, 40, 40, 150, 120, 10); g.fillStyle = '#8fd4ff'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#fff6ea'; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = OUT; ART.rr(g, 36, 36, 158, 128, 12); g.stroke();
  g.fillStyle = '#fff'; for (const [x, y, r] of [[80, 80, 14], [98, 74, 18], [118, 82, 13]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  g.fillStyle = '#fff6ea'; g.fillRect(111, 40, 8, 120); g.fillRect(40, 96, 150, 8);
  // estantería con juguetes
  const shelf = (y) => { ART.rr(g, 560, y, 210, 12, 4); ART.fillOut(g, '#c98a4b', 2.4); };
  shelf(110); shelf(190);
  ART.rr(g, 578, 76, 30, 34, 4); ART.fillOut(g, '#ff6fb5', 2.2); ART.rr(g, 612, 88, 22, 22, 4); ART.fillOut(g, '#5b8cff', 2.2); ART.rr(g, 638, 70, 22, 40, 4); ART.fillOut(g, '#a8cf3f', 2.2);
  g.beginPath(); g.arc(700, 94, 16, 0, TAU); ART.fillOut(g, '#ffc94d', 2.2); g.strokeStyle = OUT; g.lineWidth = 1.5; g.beginPath(); g.moveTo(684, 94); g.lineTo(716, 94); g.stroke();
  g.beginPath(); g.moveTo(740, 110); g.lineTo(748, 70); g.lineTo(756, 110); g.closePath(); ART.fillOut(g, '#ff5a5f', 2.2);
  for (let i = 0; i < 5; i++) { ART.rr(g, 574 + i * 20, 146 + (i % 2) * 6, 16, 44 - (i % 2) * 6, 3); ART.fillOut(g, ['#6e62f5', '#ff9ad5', '#5ce1e6', '#ffd166', '#a097ff'][i], 2); }
  g.beginPath(); g.arc(710, 172, 18, Math.PI, 0); g.lineTo(728, 190); g.lineTo(692, 190); g.closePath(); ART.fillOut(g, '#b98cff', 2.2);
  // mesa lejana y alfombra
  g.fillStyle = 'rgba(122,74,42,.35)'; g.fillRect(0, 392, W, 58); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, 392, W, 4);
  for (let x = -20; x < W; x += 60) { g.fillStyle = 'rgba(110,98,245,.18)'; g.fillRect(x, 410, 30, 40); }
  ROOM = cv; return cv;
}
const BOOK = ['#ff6fb5', '#5b8cff', '#a8cf3f', '#ffc94d', '#b98cff'];
function drawBooks() { // islote de libros apilados, igual de ancho que span()
  const n = (MX1 - MX0) / T;
  for (let r = 4; r >= 0; r--) { const a = MX0 + r * T, m = n - r * 2; if (m <= 0) continue; const y = TOP + r * T, w = m * T, cl = BOOK[r % 5];
    ART.rr(c, a, y, w, T, 5); const gr = c.createLinearGradient(0, y, 0, y + T); gr.addColorStop(0, ART.lite(cl, 0.2)); gr.addColorStop(1, ART.dark(cl, 0.2)); c.fillStyle = gr; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = '#fff8ea'; c.fillRect(a + w - 12, y + 5, 8, T - 10); c.strokeStyle = 'rgba(26,21,48,.3)'; c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(a + w - 11, y + 8 + i * 6); c.lineTo(a + w - 5, y + 8 + i * 6); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(a + 10, y + 4, w - 30, 3); c.fillStyle = ART.dark(cl, 0.35); c.fillRect(a + 26, y + 12, 40, 6); }
  if (phase().fx === 'ice') { c.fillStyle = 'rgba(255,255,255,.5)'; ART.rr(c, MX0 + 4, TOP + 2, MX1 - MX0 - 8, 5, 3); c.fill(); for (let i = 0; i < 5; i++) { const x = MX0 + 40 + ((i * 97 + t * 30) % (MX1 - MX0 - 80)); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(x, TOP - 6); c.lineTo(x + 3, TOP + 0); c.lineTo(x, TOP + 6); c.lineTo(x - 3, TOP); c.closePath(); c.fill(); } }
}
function drawBlocks(P, j) { // tablones de juguete: fila de bloques de letras (sobre un vagón en la fase del tren)
  if (P.w < 4) return; const a = clamp(P.w / 40, 0, 1), train = phase().fx === 'move' && j < 3;
  c.save(); c.globalAlpha = a; const n = Math.max(1, Math.round(P.w / 32)), bw = P.w / n;
  if (train) { ART.rr(c, P.x - 4, P.y + 14, P.w + 8, 10, 4); ART.fillOut(c, '#ff5a5f', 2.4); for (const x of [P.x + 12, P.x + P.w - 12]) { c.beginPath(); c.arc(x, P.y + 26, 7, 0, TAU); ART.fillOut(c, '#3a3258', 2); c.beginPath(); c.arc(x, P.y + 26, 2, 0, TAU); c.fillStyle = '#ffd166'; c.fill(); } }
  for (let i = 0; i < n; i++) { const x = P.x + i * bw, cl = BOOK[(i + j * 2) % 5];
    ART.rr(c, x + 1, P.y, bw - 2, 16, 4); ART.fillOut(c, cl, 2.4); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 4, P.y + 3, bw - 8, 2.5);
    c.font = FONT(11, 900); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ABCKUBOPLAY'[(i + j * 3) % 11], x + bw / 2, P.y + 9.5); }
  c.restore();
}
function drawFan() { // ventilador en el lado del que sopla
  if (phase().fx !== 'wind') return; const s = wind >= 0 ? -1 : 1, x = s < 0 ? 30 : W - 30, y = 250, on = Math.abs(wind) > 20;
  c.save(); c.translate(x, y); ART.rr(c, -8, 20, 16, 120, 6); ART.fillOut(c, '#a097ff', 2.4);
  c.beginPath(); c.arc(0, 0, 38, 0, TAU); ART.fillOut(c, 'rgba(255,255,255,.55)', 3);
  const rot = t * (on ? 18 : 1.5); for (let i = 0; i < 3; i++) { c.save(); c.rotate(rot + i * TAU / 3); c.beginPath(); c.ellipse(0, -18, 9, 17, 0, 0, TAU); ART.fillOut(c, '#5ce1e6', 2); c.restore(); }
  c.beginPath(); c.arc(0, 0, 7, 0, TAU); ART.fillOut(c, '#ffd166', 2);
  c.strokeStyle = 'rgba(26,21,48,.45)'; c.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); c.lineTo(Math.cos(a) * 38, Math.sin(a) * 38); c.stroke(); }
  c.restore();
}
function drawTrack() { // vía bajo los vagones en la fase del tren
  if (phase().fx !== 'move') return; c.strokeStyle = 'rgba(58,50,88,.35)'; c.lineWidth = 4;
  for (const y of [plats[0].y + 34, plats[2].y + 34]) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = 10; x < W; x += 24) c.fillRect(x, y - 4, 4, 8); }
}
function drawMetal() { // islote de chapa (fábrica) y cinta transportadora
  drawIsland(TH.factory);
  if (phase().fx === 'belt' || Math.abs(belt) > 1) {
    ART.rr(c, MX0 - 6, TOP - 6, MX1 - MX0 + 12, 14, 7); ART.fillOut(c, '#2a3138', 2.6);
    const off = (beltT * 95 * Math.sign(belt || 1)) % 24; c.save(); ART.rr(c, MX0, TOP - 5, MX1 - MX0, 11, 5); c.clip();
    c.fillStyle = belt ? '#f2b705' : '#6b7580'; for (let x = MX0 - 24 + off; x < MX1 + 24; x += 24) { const d = Math.sign(belt || 1) * 5; c.beginPath(); c.moveTo(x - d, TOP - 4); c.lineTo(x + d, TOP + 0.5); c.lineTo(x - d, TOP + 5); c.lineTo(x - d + 4 * Math.sign(d), TOP + 0.5); c.closePath(); c.fill(); }
    c.restore(); for (const x of [MX0 - 2, MX1 + 2]) { c.beginPath(); c.arc(x, TOP + 1, 8, 0, TAU); ART.fillOut(c, '#7b8791', 2.2); c.save(); c.translate(x, TOP + 1); c.rotate(beltT * 6 * Math.sign(belt || 1)); c.fillStyle = OUT; c.fillRect(-1, -6, 2, 12); c.restore(); }
  }
}
function drawMagnet() {
  if (phase().fx !== 'magnet') return; const warn = mag <= 0 && magT % 8 > 1.2;
  c.save(); c.translate(400, 74); c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -60); c.lineTo(0, -18); c.stroke(); // cadena
  c.beginPath(); c.arc(0, 8, 36, Math.PI, 0); c.lineTo(36, 34); c.lineTo(18, 34); c.lineTo(18, 8); c.arc(0, 8, 18, 0, Math.PI, true); c.lineTo(-18, 34); c.lineTo(-36, 34); c.closePath(); ART.fillOut(c, '#ff5a5f', 3);
  ART.rr(c, -36, 22, 18, 14, 3); ART.fillOut(c, '#dfe7f4', 2.4); ART.rr(c, 18, 22, 18, 14, 3); ART.fillOut(c, '#dfe7f4', 2.4);
  c.beginPath(); c.arc(0, -14, 5, 0, TAU); ART.fillOut(c, warn && Math.floor(t * 8) % 2 ? '#ffd166' : mag > 0 ? '#7cf7a0' : '#3a3258', 2);
  if (mag > 0) { c.strokeStyle = `rgba(159,232,255,${0.35 + 0.3 * Math.sin(t * 20)})`; c.lineWidth = 2.5; for (let i = 0; i < 4; i++) { const r = 20 + ((t * 70 + i * 30) % 120); c.beginPath(); c.arc(0, 40, r, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke(); } }
  c.restore();
}
function drawGirder(P, j) { // plataformas de chatarra: viga con franjas de aviso
  if (P.w < 4) return; const a = clamp(P.w / 40, 0, 1); c.save(); c.globalAlpha = a;
  if (phase().fx === 'move' && j < 3) { c.strokeStyle = 'rgba(26,21,48,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(P.x + 8, P.y); c.lineTo(P.x + P.w / 2, P.y - 36); c.lineTo(P.x + P.w - 8, P.y); c.stroke(); c.beginPath(); c.arc(P.x + P.w / 2, P.y - 38, 4, 0, TAU); ART.fillOut(c, '#7b8791', 1.6); }
  ART.rr(c, P.x, P.y, P.w, 14, 4); ART.fillOut(c, '#7b8791', 2.6);
  c.save(); ART.rr(c, P.x + 2, P.y + 2, P.w - 4, 5, 2); c.clip(); for (let x = P.x - 10; x < P.x + P.w; x += 14) { c.fillStyle = '#f2b705'; c.beginPath(); c.moveTo(x, P.y + 7); c.lineTo(x + 7, P.y + 2); c.lineTo(x + 14, P.y + 2); c.lineTo(x + 7, P.y + 7); c.closePath(); c.fill(); } c.restore();
  c.fillStyle = OUT; for (let x = P.x + 8; x < P.x + P.w - 4; x += 22) { c.beginPath(); c.arc(x, P.y + 10.5, 1.5, 0, TAU); c.fill(); }
  c.restore();
}
/* Armas de juguete dibujadas a lo largo del eje +x desde la mano */
function weapon(type, ang, s, cl, open) {
  c.save(); c.rotate(ang); c.scale(s, s); c.lineJoin = 'round';
  if (type === 'sword') { ART.rr(c, 0, -2.5, 9, 5, 2); ART.fillOut(c, '#8b5a3c', 1.8); ART.rr(c, 8, -8, 4, 16, 2); ART.fillOut(c, cl, 1.8);
    c.beginPath(); c.moveTo(12, -4); c.lineTo(36, -4); c.lineTo(42, 0); c.lineTo(36, 4); c.lineTo(12, 4); c.closePath(); ART.fillOut(c, '#e9c690', 2.2); c.strokeStyle = 'rgba(139,90,60,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(14, 0); c.lineTo(34, 0); c.stroke(); }
  else if (type === 'hammer') { ART.rr(c, 0, -2.5, 28, 5, 2); ART.fillOut(c, '#ffd166', 1.8); ART.rr(c, 24, -13, 16, 26, 6); ART.fillOut(c, '#ff5a5f', 2.4); ART.rr(c, 22, -13, 4, 26, 2); ART.fillOut(c, '#fff', 1.6); ART.rr(c, 38, -13, 4, 26, 2); ART.fillOut(c, '#fff', 1.6); }
  else if (type === 'bow') { c.beginPath(); c.arc(4, 0, 18, -1.25, 1.25); c.lineWidth = 7; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#5ce1e6'; c.stroke();
    c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.moveTo(4 + Math.cos(-1.25) * 18, Math.sin(-1.25) * 18); c.lineTo(-2, 0); c.lineTo(4 + Math.cos(1.25) * 18, Math.sin(1.25) * 18); c.stroke(); }
  else if (type === 'shield') { c.beginPath(); c.ellipse(10, 0, 7, 17, 0, 0, TAU); ART.fillOut(c, cl, 2.4); c.beginPath(); c.ellipse(10, 0, 4, 10, 0, 0, TAU); ART.fillOut(c, '#dfe7f4', 1.6); c.beginPath(); c.arc(12, 0, 2.5, 0, TAU); ART.fillOut(c, '#ffd166', 1.2); }
  else if (type === 'umbrella') { if (open) { c.restore(); return; } c.strokeStyle = OUT; c.lineWidth = 4.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(40, 0); c.stroke(); c.strokeStyle = '#3a3258'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(12, -2); c.quadraticCurveTo(26, -8, 38, -1); c.lineTo(38, 1); c.quadraticCurveTo(26, 8, 12, 2); c.closePath(); ART.fillOut(c, cl, 2); c.beginPath(); c.arc(-2, 4, 4, Math.PI * 1.1, Math.PI * 0.1, true); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke(); }
  else if (type === 'yoyo') { c.strokeStyle = 'rgba(26,21,48,.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(4, 12); c.stroke(); yoyo(4, 16, 0, cl); }
  else if (type === 'fist') { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); for (let i = 0; i <= 8; i++) c.lineTo(i * 2.2, (i % 2 ? -4 : 4)); c.stroke(); ART.rr(c, 16, -8, 14, 16, 6); ART.fillOut(c, cl, 2.2); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(19, -5, 6, 3); }
  c.restore();
}
function yoyo(x, y, rot, cl) { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.arc(0, 0, 8, 0, TAU); ART.fillOut(c, cl, 2); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 4.5, 0, 2); c.stroke(); c.beginPath(); c.arc(0, 0, 1.8, 0, TAU); c.fillStyle = OUT; c.fill(); c.restore(); }
function umbrellaOpen(x, y, cl) { c.save(); c.translate(x, y); c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 30); c.stroke();
  c.beginPath(); c.moveTo(-32, 0); c.quadraticCurveTo(0, -34, 32, 0); c.quadraticCurveTo(21, -6, 11, 0); c.quadraticCurveTo(0, -6, -11, 0); c.quadraticCurveTo(-21, -6, -32, 0); c.closePath(); ART.fillOut(c, cl, 2.6);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-10, -14, 9, 4, -0.4, 0, TAU); c.fill(); c.restore(); }
/* Iconos de objetos de chatarra */
function scrapIcon(type, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  if (type === 'wrench') { c.rotate(-0.7); ART.rr(c, -3, -4, 6, 22, 3); ART.fillOut(c, '#b8c2cc', 2); c.beginPath(); c.arc(0, -8, 8, 0, TAU); ART.fillOut(c, '#b8c2cc', 2); c.fillStyle = '#2a3138'; c.fillRect(-3, -17, 6, 9); }
  else if (type === 'battery') { ART.rr(c, -8, -12, 16, 24, 3); ART.fillOut(c, '#7cf7a0', 2); ART.rr(c, -4, -16, 8, 5, 1.5); ART.fillOut(c, '#dfe7f4', 1.6); c.beginPath(); c.moveTo(2, -8); c.lineTo(-4, 1); c.lineTo(1, 1); c.lineTo(-2, 9); c.lineTo(5, -2); c.lineTo(0, -2); c.closePath(); c.fillStyle = OUT; c.fill(); }
  else if (type === 'bomb') nutBomb(0, 2, 0, false, 0.8);
  c.restore();
}
function nutBomb(x, y, rot, blink, s) {
  c.save(); c.translate(x, y); c.rotate(rot * 0.3); c.scale(s || 1, s || 1);
  c.beginPath(); c.arc(0, 0, 13, 0, TAU); const gr = c.createRadialGradient(-4, -4, 1, 0, 0, 14); gr.addColorStop(0, '#8a96a3'); gr.addColorStop(1, blink ? '#ff7a6a' : '#2f3740'); c.fillStyle = gr; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.3; c.beginPath(); c.arc(Math.cos(a) * 8, Math.sin(a) * 8, 2.2, 0, TAU); ART.fillOut(c, '#dfe7f4', 1); }
  ART.rr(c, -4, -18, 8, 6, 2); ART.fillOut(c, '#7b8791', 1.6); c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -18); c.quadraticCurveTo(4, -24, 9, -23); c.stroke();
  if (blink) { c.fillStyle = '#ffd166'; c.beginPath(); c.arc(9, -23, 3.5, 0, TAU); c.fill(); }
  c.restore();
}
function giftAlt(x, y, type, sw, falling) { // cajas de juguetes / de repuestos
  c.save(); c.translate(x, y);
  if (falling) { c.rotate(Math.sin(sw * 1.6) * 0.12);
    c.strokeStyle = 'rgba(26,21,48,.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-12, -26); c.lineTo(-22, -52); c.moveTo(12, -26); c.lineTo(22, -52); c.stroke();
    c.beginPath(); c.moveTo(-28, -50); c.quadraticCurveTo(0, -84, 28, -50); c.quadraticCurveTo(14, -56, 0, -50); c.quadraticCurveTo(-14, -56, -28, -50); c.closePath(); ART.fillOut(c, TOYS ? '#5ce1e6' : '#f2b705', 2.4); }
  if (TOYS) { ART.rr(c, -17, -30, 34, 30, 5); ART.fillOut(c, '#f7d9a8', 2.4); c.fillStyle = 'rgba(139,90,60,.35)'; c.fillRect(-17, -30, 34, 5); c.save(); c.translate(-14, -14); weapon(type, -0.5, 0.62, '#ff6fb5'); c.restore(); }
  else { ART.rr(c, -16, -30, 32, 30, 4); ART.fillOut(c, '#5d6b77', 2.4); c.strokeStyle = 'rgba(26,21,48,.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-16, -30); c.lineTo(16, 0); c.moveTo(16, -30); c.lineTo(-16, 0); c.stroke(); scrapIcon(type, 0, -15, 0.85); }
  c.restore();
}
/* Robot de chatarra: piernas de pistón, cuerpo del color del jugador, cabeza con visor; las piezas perdidas dejan cables */
function robot(f, pa, chg) {
  const cl = col(f.p), has = (q) => f.parts.includes(q), air = !f.on && f.cloud <= 0, run = f.on && Math.abs(f.vx) > 30 && f.stun <= 0, ph = t * 14 + f.p;
  c.save(); c.translate(f.x, f.y); c.scale(f.face * (1 + f.sq) * 0.84, (1 - f.sq) * 0.84); c.lineJoin = 'round'; c.lineCap = 'round';
  // pose de los brazos
  let fa = 0.9, fe = 0, ba = 1.2 + (run ? Math.sin(ph) * 0.5 : 0);
  if (f.atk && ATK[f.atk.kind]) { const A = ATK[f.atk.kind], q = clamp(f.atk.t / A.a1, 0, 1);
    if (f.atk.kind === 'jab' || f.atk.kind === 'smash') { fa = lerp(0.3, -0.05, q); fe = Math.sin(Math.PI * clamp(f.atk.t / A.dur, 0, 1)) * (f.atk.kind === 'smash' ? 26 : 16); }
    else if (f.atk.kind === 'rise') { fa = -1.5; fe = 8; } else if (f.atk.kind === 'spin') { fa = f.atk.t * 22; fe = 8; ba = fa + Math.PI; } }
  else if (f.chg >= 0) { fa = 0.2; fe = -8 - chg * 4; } else if (f.atk && f.atk.kind === 'throw') { fa = -0.6; fe = 10; } else if (air) { fa = -0.6; ba = -1; } else if (f.stun > 0) { fa = -2.2; ba = -2.6; }
  const hd = -58 + (run ? Math.abs(Math.sin(ph)) * -1.5 : 0);
  // cohete (↑+A), detrás del chasis
  if (f.atk && f.atk.kind === 'rise') { for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(-8 + i * 16 - 4, -2); c.lineTo(-8 + i * 16, 14 + Math.random() * 12); c.lineTo(-8 + i * 16 + 4, -2); c.closePath(); ART.fillOut(c, i ? '#ffd166' : '#ff9a3d', 1.6); } }
  /* Ley de la pieza única: patas, chasis, cabeza y brazos se trazan juntos y se contornean de una
     sola pasada; las separaciones internas se leen por color y sombra propia. */
  const armPts = (front, a, ext) => { const ox = front ? 5 : -7, oy = -40, L = 14 + ext, ca = Math.cos(a), sa = Math.sin(a);
    return [[ox, oy], [ox + ca * L * 0.55, oy + sa * L * 0.55], [ox + ca * L, oy + sa * L]]; };
  const parts = [];
  for (const i of [1, 0]) { const dx = i ? -7 : 7, sw = run ? Math.sin(ph + i * Math.PI) * 6 : air ? (i ? -4 : 4) : 0, lift = run ? Math.max(0, Math.cos(ph + i * Math.PI)) * 5 : air ? 6 : 0;
    parts.push([PZ.box(dx - 3.5 + sw * 0.5, -20, 7, 16 - lift * 0.6, 3), i ? '#5d6b77' : '#7b8791']);
    parts.push([PZ.box(dx - 6 + sw, -6 - lift, 13, 6, 2.5), i ? '#2a3138' : '#3a4650']); }
  if (has('arm')) { const p = armPts(false, ba, 0); parts.push([PZ.bone(p, [3.6, 3.3, 3]), '#8a96a3']); parts.push([PZ.blob(p[2][0], p[2][1], 6, 6), '#a8b2bc']); }
  parts.push([PZ.box(-14, -50, 28, 32, 6), cl]);
  parts.push([PZ.box(-11, hd - 8, 22, 17, 5), '#8a96a3']);
  if (has('helm')) parts.push([(g) => { g.moveTo(-13, hd - 5); g.arc(0, hd - 7, 13, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(13, hd - 5); g.closePath(); }, '#f2b705']);
  if (has('ant')) { parts.push([PZ.bone([[-4, hd + (has('helm') ? -19 : -8)], [-7, hd - 28]], [1.3, 1.1]), '#8a96a3']); parts.push([PZ.blob(-7, hd - 29, 3.5, 3.5), Math.floor(t * 3 + f.p) % 2 ? '#ff5a5f' : '#ffd166']); }
  const fp = armPts(true, fa, fe);
  parts.push([PZ.bone(fp, [4, 3.7, 3.4]), '#b8c2cc']);
  parts.push([PZ.blob(fp[2][0], fp[2][1], 7, 7), f.elec > 0 ? '#9fe8ff' : '#dfe7f4']);
  PZ.unite(c, parts, 1.5);
  {
    const g = c;
    g.fillStyle = ART.dark(cl, 0.2); g.beginPath(); g.moveTo(14, -44); g.lineTo(14, -18); g.lineTo(4, -18); g.quadraticCurveTo(12, -32, 9, -49); g.closePath(); g.fill();
    // pecho: reactor o hueco chamuscado
    if (has('core')) { g.fillStyle = '#b8c2cc'; g.beginPath(); PZ.box(-10, -46, 20, 22, 4)(g); g.fill();
      g.fillStyle = 'rgba(26,21,48,.75)'; for (const [x, y] of [[-7, -43], [7, -43], [-7, -27], [7, -27]]) { g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill(); }
      g.fillStyle = f.elec > 0 ? '#9fe8ff' : '#7cf7a0'; g.beginPath(); PZ.box(-5, -39, 10, 8, 2)(g); g.fill(); }
    else { g.fillStyle = '#2a3138'; g.beginPath(); PZ.box(-9, -45, 18, 20, 3)(g); g.fill();
      g.strokeStyle = '#ffd166'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6, -42); g.quadraticCurveTo(0, -30, 6, -42); g.stroke();
      g.strokeStyle = '#5ce1e6'; g.beginPath(); g.moveTo(-6, -30); g.quadraticCurveTo(0, -40, 6, -28); g.stroke(); }
    // visor y ojos
    g.fillStyle = '#1a1530'; g.beginPath(); PZ.box(-3, hd - 3, 13, 7, 3)(g); g.fill();
    const hurt = f.stun > 0; g.fillStyle = hurt ? '#ff6a6a' : f.elec > 0 ? '#9fe8ff' : '#7cf7a0';
    if (hurt) { g.font = FONT(8, 900); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('x x', 3.5, hd + 0.5); } else { g.fillRect(1, hd - 1.5, 3, 3); g.fillRect(6, hd - 1.5, 3, 3); }
    if (has('helm')) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-7, hd - 16, 7, 3); }
    PZ.shine(g, -8, -46, 4.5, 2.4, -0.5, 0.3);
  }
  if (!has('arm')) { c.strokeStyle = '#ff6a6a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-7, -40); c.quadraticCurveTo(-13, -36, -11, -30); c.moveTo(-7, -39); c.quadraticCurveTo(-12, -44, -15, -40); c.stroke(); }
  if (f.elec > 0) { c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.beginPath(); for (let i = 0; i < 4; i++) c.lineTo(fp[2][0] + Math.cos(i * 2 + t * 30) * 11, fp[2][1] + Math.sin(i * 2.3 + t * 25) * 11); c.stroke(); }
  if (chg > 0) { c.fillStyle = `rgba(255,209,102,${0.3 + chg * 0.4})`; c.beginPath(); c.arc(-4, -40, 9 + chg * 5, 0, TAU); c.fill(); }
  c.restore();
}
function drawPart(d) {
  c.save(); c.globalAlpha = Math.min(1, d.life / 0.5); c.translate(d.x, d.y); c.rotate(d.r);
  if (d.part === 'ant') { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -6); c.stroke(); c.beginPath(); c.arc(0, -8, 3.5, 0, TAU); ART.fillOut(c, '#ff5a5f', 1.6); }
  else if (d.part === 'arm') { ART.rr(c, -9, -3.5, 14, 7, 3.5); ART.fillOut(c, '#8a96a3', 2); c.beginPath(); c.arc(7, 0, 6, 0, TAU); ART.fillOut(c, '#a8b2bc', 2); }
  else if (d.part === 'core') { ART.rr(c, -10, -11, 20, 22, 4); ART.fillOut(c, '#b8c2cc', 2); }
  else { c.beginPath(); c.arc(0, 4, 13, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); ART.fillOut(c, '#f2b705', 2.4); }
  c.restore();
}
function drawFighter(f) {
  if (f.stocks <= 0 || f.dead > 0) return;
  const cl = col(f.p), air = !f.on && f.cloud <= 0, st = f.stun > 0 ? 'fall' : air ? (f.vy < 0 ? 'jump' : 'fall') : Math.abs(f.vx) > 30 ? 'run' : 'idle';
  if (f.cloud > 0) { c.save(); c.translate(f.x, f.y + 6); for (const [dx, r] of [[-18, 10], [0, 14], [18, 10]]) { c.beginPath(); c.arc(dx, 0, r, 0, TAU); ART.fillOut(c, '#fff', 2.4); } c.restore(); }
  c.save();
  if (f.inv > 0 && Math.floor(t * 14) % 2) c.globalAlpha = 0.55;
  if (f.dodge > 0) c.globalAlpha = 0.45;
  if (f.stun > 0) { c.translate(f.x, f.y - 24); c.rotate(f.spin); c.translate(-f.x, -(f.y - 24)); }
  // aro de color en el suelo
  if (f.on && TOYS) { c.beginPath(); c.ellipse(f.x, f.y + 2, 18, 5.5, 0, 0, TAU); ART.fillOut(c, cl, 2.2); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(f.x - 5, f.y + 0.5, 7, 1.6, 0, 0, TAU); c.fill(); }
  else if (f.on) { c.strokeStyle = cl; c.lineWidth = 3; c.beginPath(); c.ellipse(f.x, f.y + 1, 17, 5, 0, 0, TAU); c.stroke(); }
  const chg = f.chg > 0.16 ? clamp((f.chg - 0.16) / 0.9, 0, 1) : 0, sh = chg ? Math.sin(t * 60) * chg * 1.5 : 0;
  // almohada detrás cuando se carga o gira
  const giant = f.item && f.item.type === 'giant', ps = giant ? 1.45 : 1, hx = f.x + f.face * 4, hy = f.y - 30;
  let pa = 0.9, back = false;
  if (f.atk) { const A = ATK[f.atk.kind], q = A ? clamp(f.atk.t / A.a1, 0, 1) : 1;
    if (f.atk.kind === 'jab' || f.atk.kind === 'smash') pa = lerp(-2.2, 0.7, ease(q));
    else if (f.atk.kind === 'spin') pa = f.atk.t * 22;
    else if (f.atk.kind === 'rise') pa = -1.57 + Math.sin(f.atk.t * 30) * 0.4;
    else pa = lerp(-1.8, 0.4, ease(q));
  } else if (f.chg >= 0) { pa = -2.4 + sh * 0.05; back = true; }
  else if (f.stun > 0) pa = 2.4;
  if (SCRAP) { robot(f, pa, chg); if (f.item && f.item.type === 'bomb') nutBomb(f.x + f.face * 16, f.y - 62, 0, false, 0.85); }
  else if (TOYS) {
    const wt = f.item ? f.item.type : 'fist', wa = wt === 'bow' || wt === 'shield' ? (f.atk && f.atk.kind === 'bash' ? 0 : 0.1) : wt === 'hammer' && f.atk && f.atk.kind === 'hammer' ? lerp(-2.4, 0.9, ease(clamp((f.atk.t - 0.2) / 0.28, 0, 1))) : pa;
    const drawW = () => { if (wt === 'yoyo' && shots.some((q) => q.type === 'yoyo' && q.from === f.p)) return; c.save(); c.translate(hx + sh + (wt === 'shield' ? f.face * 6 : 0), hy); c.scale(f.face, 1); weapon(wt, wa, 0.95, cl, f.glide); c.restore(); };
    if (back) drawW();
    ART.hero(c, f.x + sh, f.y, SCL, { face: f.face, state: f.stun > 0 ? 'fall' : st, t: t + f.p * 0.7, col: cl, squash: f.sq });
    // casco de gladiador con penacho del color del jugador
    c.save(); c.translate(f.x + sh + f.face * 0.6, f.y - 46); c.scale(f.face, 1);
    /* casco + penacho: una sola silueta (el penacho nace del yelmo, no se le pega encima) */
    PZ.unite(c, [
      [(g) => { g.moveTo(-10, -12); g.quadraticCurveTo(-4, -30, 12, -22); g.quadraticCurveTo(2, -20, -2, -12); g.closePath(); }, cl],
      [(g) => { g.moveTo(-15.5, 0); g.arc(0, 0, 15.5, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); }, '#c9d3e4'],
    ], 1.5);
    c.restore();
    if (!back) drawW();
    if (f.glide) umbrellaOpen(f.x + f.face * 4, f.y - 74, cl);
  } else {
  const drawP = () => { c.save(); c.translate(hx + sh, hy); c.scale(f.face, 1); pillow(0, 0, pa, ps * 0.95, cl, chg); c.restore(); };
  if (back) drawP();
  ART.hero(c, f.x + sh, f.y, SCL, { face: f.face, state: f.stun > 0 ? 'fall' : st, t: t + f.p * 0.7, col: cl, squash: f.sq });
  if (!back && !(f.item && f.item.type !== 'giant')) drawP();
  if (f.item && f.item.type === 'ball') ball(f.x + f.face * 14, f.y - 52, 13, t * 2);
  if (f.item && f.item.type === 'bomb') bomb(f.x + f.face * 14, f.y - 52, 0, false);
  }
  // estela del golpe
  if (f.atk && ATK[f.atk.kind] && f.atk.t >= ATK[f.atk.kind].a0 && f.atk.t <= ATK[f.atk.kind].a1) {
    const h = hitCircle(f); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 4; c.beginPath();
    if (SCRAP && (f.atk.kind === 'jab' || f.atk.kind === 'smash')) { /* el puño de pistón ya se ve */ } else if (f.atk.kind === 'spin') c.arc(h.x, h.y, h.r, 0, TAU); else if (f.atk.kind === 'rise') c.arc(h.x, h.y + 10, h.r, Math.PI * 1.1, Math.PI * 1.9); else { const a0 = f.face > 0 ? -1.3 : Math.PI + 1.3, a1 = f.face > 0 ? 0.9 : Math.PI - 0.9; c.arc(f.x, f.y - 28, h.r + 16, Math.min(a0, a1), Math.max(a0, a1)); }
    c.stroke();
  }
  c.restore();
  // etiqueta
  if (!demo) { const s = tag(f.p); c.font = FONT(15); const w = c.measureText(s).width + 12, y = f.y - (SCRAP ? 94 : TOYS ? (f.glide ? 118 : 92) : 84);
    ART.rr(c, f.x - w / 2, y - 10, w, 20, 7); ART.fillOut(c, cl, 2); c.fillStyle = OUT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, f.x, y + 1); }
}
function offscreen(f) {
  if (f.stocks <= 0 || f.dead > 0) return;
  const x = clamp(f.x, 22, W - 22), y = clamp(f.y - 24, 22, 380);
  if (x === f.x && y === f.y - 24 && f.y - 40 > 0) return;
  c.beginPath(); c.arc(x, y, 16, 0, TAU); ART.fillOut(c, col(f.p), 3);
  const a = Math.atan2(f.y - 24 - y, f.x - x); c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(22, 0); c.lineTo(14, -7); c.lineTo(14, 7); c.closePath(); ART.fillOut(c, col(f.p), 2); c.restore();
  c.font = FONT(12); c.fillStyle = OUT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(tag(f.p), x, y + 1);
}
function pctCol(p) { return p < 40 ? '#ffffff' : p < 80 ? '#ffe08a' : p < 120 ? '#ffb05c' : '#ff6a6a'; }
function hud() {
  for (const f of F) {
    const x = 16 + f.p * 194, y = 400, cl = col(f.p), outd = f.stocks <= 0;
    c.save(); if (outd) c.globalAlpha = 0.45;
    panel(x, y, 184, 44, 13, 'rgba(26,21,48,.86)', 2.5);
    ART.rr(c, x + 4, y + 4, 50, 36, 10); ART.fillOut(c, cl, 2);
    c.font = FONT(17); c.fillStyle = OUT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(tag(f.p), x + 29, y + 23);
    const sc = 1 + clamp((f.pct - f.shown) / 20, 0, 0.4);
    c.save(); c.translate(x + 112, y + 23); c.scale(sc, sc); label(outd ? 'Fuera' : Math.round(f.shown) + '%', 0, 0, outd ? 18 : 24, outd ? '#bbb' : pctCol(f.shown)); c.restore();
    for (let i = 0; i < 3; i++) ART.heart(c, x + 166, y + 9 + i * 13, 0.78, i < f.stocks);
    if (TOYS && f.item && !outd) { c.save(); c.translate(x + 60, y + 30); weapon(f.item.type, -0.6, 0.5, cl); c.restore(); }
    if (SCRAP && !outd) { for (let i = 0; i < 4; i++) { ART.rr(c, x + 88 + i * 13, y + 37, 10, 4, 2); c.fillStyle = i < f.parts.length ? '#b8c2cc' : 'rgba(255,255,255,.15)'; c.fill(); } if (f.elec > 0) scrapIcon('battery', x + 66, y + 23, 0.55); }
    c.restore();
  }
  const left = Math.max(0, MATCH - clock), mm = Math.floor(left / 60), ss = Math.floor(left % 60);
  panel(352, 6, 96, 34, 12, 'rgba(26,21,48,.85)', 2.5); label(`${mm}:${String(ss).padStart(2, '0')}`, 400, 24, 22, left < 15 ? '#ff6a6a' : '#fff');
}
function drawBanner() {
  if (!banner) return; const a = clamp(banner.t / 0.4, 0, 1) * clamp((2.4 - banner.t) / 0.25, 0, 1);
  c.save(); c.globalAlpha = a; panel(250, 52, 300, 64, 18, 'rgba(26,21,48,.88)', 3.5);
  label(banner.txt, 400, 74, 24, '#ffd166'); c.font = FONT(16, 700); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(banner.sub, 400, 100); c.restore();
}
function drawWind() {
  if (Math.abs(wind) < 10) return; c.strokeStyle = `rgba(255,255,255,${Math.min(0.5, Math.abs(wind) / 300)})`; c.lineWidth = 2; c.lineCap = 'round';
  for (let i = 0; i < 14; i++) { const y = (i * 53 + 17) % 380 + 10, sp = 1 + (i % 3) * 0.4, x = ((t * 420 * sp * Math.sign(wind) + i * 137) % 960 + 960) % 960 - 80;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 20 * Math.sign(wind), y - 4, x + 44 * Math.sign(wind), y); c.stroke(); }
}

/* ---------------- Partida ---------------- */
function finish(txt) {
  if (endT >= 0) return; endT = 1.6; overTxt = txt; k.sfx(txt === '¡Tiempo!' ? 'lose' : 'win');
}
function endMatch() {
  const val = (f) => (f.stocks > 0 ? 10000 + f.stocks * 1000 - Math.min(999, Math.round(f.pct)) : 100 + f.out * 10);
  const rows = F.map((f) => ({ p: f.p, score: val(f), name: nm(f.p), txt: `${f.stocks > 0 ? f.stocks + (f.stocks === 1 ? ' vida' : ' vidas') + ' · ' + Math.round(f.pct) + '%' : 'eliminado'} · ${f.kos} KO` }));
  const byScore = new Map(rows.map((r) => [r.score, r.txt]));
  const r = rows.slice().sort((a, b) => b.score - a.score), top = r[0], hum = F.filter((f) => !cpu(f.p)).map((f) => f.p);
  if (hum.length) { let d = 0; if (hum.includes(top.p)) d = 1; else if (hum.every((p) => r.findIndex((x) => x.p === p) === r.length - 1)) d = -1;
    LV = clamp(LV + d, 0, 9); try { localStorage.setItem('cpu:' + ID, LV); } catch (e) { /* sin almacenamiento */ } }
  const head = r.length > 1 && r[1].score === top.score ? '¡Empate!' : nm(top.p) === 'Tú' ? '¡Ganas tú!' : `¡Gana ${nm(top.p)}!`;
  k.podium(rows, { head, fmt: (s) => byScore.get(s) || '' });
}
setPhase(0, true); demoReset();
k.show(CFG.title, (CFG.help || '') + '<br>Toca para jugar');
let live = false;
k.run((dt) => {
  t += dt;
  if (!k.gate(() => {})) {
    if (k.st === 'ready') { updStage(dt, false); clock += dt; if (stop > 0) stop -= dt; else { F.forEach((f) => updFighter(f, dt)); updItems(dt, false); } updFeathers(dt); updDebris(dt); if (F.filter((f) => f.stocks > 0).length <= 1) demoReset(); }
    return;
  }
  if (!live) { live = true; reset(); k.count(3); }
  updFeathers(dt); updDebris(dt);
  if (k.counting()) { updStage(dt, false); return; }
  if (endT >= 0) { endT -= dt; F.forEach((f) => { if (f.stun > 0) updFighter(f, dt * 0.35); }); if (endT < 0) { endT = -2; live = false; endMatch(); } return; }
  if (stop > 0) { stop -= dt; return; }
  clock += dt; updStage(dt, true);
  F.forEach((f) => updFighter(f, dt)); updItems(dt, true);
  const standing = F.filter((f) => f.stocks > 0), hum = F.filter((f) => !cpu(f.p));
  if (standing.length <= 1) finish('¡Fin del combate!');
  else if (hum.length && hum.every((f) => f.stocks <= 0)) finish('¡Eliminado!');
  else if (clock >= MATCH) finish('¡Tiempo!');
}, () => {
  const ph = phase(), th = TH[ph.th];
  if (TOYS) { c.drawImage(room(), 0, 0, W, H); drawFan(); drawWind(); drawTrack(); drawBooks(); plats.forEach(drawBlocks); }
  else if (SCRAP) { ART.background(c, TH.factory, W, H, 0, 0, t); drawMagnet(); drawMetal(); plats.forEach(drawGirder); }
  else {
  if (prevTh && morph < 1) { ART.background(c, prevTh, W, H, 0, 0, t); c.save(); c.globalAlpha = ease(morph); ART.background(c, th, W, H, 0, 0, t); c.restore(); }
  else ART.background(c, th, W, H, 0, 0, t);
  drawWind();
  drawIsland(th);
  if (ph.fx === 'ice') { c.fillStyle = 'rgba(190,230,255,.55)'; ART.rr(c, MX0 + 2, TOP - 3, MX1 - MX0 - 4, 8, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 6; i++) c.fillRect(MX0 + 30 + i * 72, TOP - 1, 22, 2); }
  plats.forEach((P) => drawPlank(P, th));
  }
  for (const it of items) { if (it.life < 3 && Math.floor(t * 8) % 2) continue; (MODE === 'pillow' ? gift : giftAlt)(it.x, it.y, it.type, it.sw, !it.on); }
  for (const d of debris) drawPart(d);
  for (const s of shots) {
    if (s.type === 'ball') ball(s.x, s.y, 14, s.rot);
    else if (s.type === 'arrow') { c.save(); c.translate(s.x, s.y); c.rotate(Math.atan2(s.vy, s.vx)); c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(-22, 0); c.lineTo(2, 0); c.stroke(); c.strokeStyle = '#ffd166'; c.lineWidth = 2; c.stroke(); c.beginPath(); c.arc(5, 0, 5, -1.6, 1.6); c.closePath(); ART.fillOut(c, '#ff5a5f', 1.6); c.fillStyle = col(s.from); c.fillRect(-24, -4, 6, 8); c.restore(); }
    else if (s.type === 'yoyo') { const o = F[s.from]; c.strokeStyle = 'rgba(26,21,48,.75)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(o.x + o.face * 10, o.y - 32); c.lineTo(s.x, s.y); c.stroke(); yoyo(s.x, s.y, s.rot, col(s.from)); }
    else if (SCRAP) nutBomb(s.x, s.y - (s.rest ? 13 : 0), s.rot, s.rest && Math.floor(t * 10) % 2);
    else bomb(s.x, s.y - (s.rest ? 13 : 0), s.rot, s.rest && Math.floor(t * 10) % 2); }
  F.forEach(drawFighter);
  drawFeathers();
  F.forEach(offscreen);
  if (!demo) hud();
  drawBanner();
  if (endT >= 0 && overTxt) { panel(230, 150, 340, 80, 22, 'rgba(26,21,48,.9)', 4); label(overTxt, 400, 190, 34, '#ffd166'); }
});
