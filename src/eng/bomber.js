/* bomber — petardos en rejilla (1–4 jugadores, CPU de relleno). Explosión en cruz, cajas rompibles, mejoras
 * (alcance, petardos, velocidad, patada) y reglas intercambiables por CFG.rules:
 *   fuse (s), range, bombs, speed (casillas/s), kick (patada desde el inicio), drop (prob. de mejora), round (s antes de la
 *   muerte súbita), wins (rondas para ganar), slide (los petardos resbalan al soltarlos, estilo hielo), crates (densidad).
 * Plaza de pueblo: adoquines, bolardos de piedra, cajas de mercado; los vecinos llevan gorro de fiesta del color del jugador.
 * Modos (CFG.mode): 'plaza' (por defecto, el último en pie gana la ronda);
 *   'hielo' (lago helado: A suelta el petardo deslizándose hacia donde miras hasta chocar, B lo planta quieto; un petardo que
 *     choca con otro parado le pasa el impulso; al soltar el mando resbalas hasta el centro de la casilla);
 *   'pintura' (las explosiones pintan el suelo del color del dueño; si te alcanzan, salpicas de su color tu casilla y las de
 *     alrededor y reapareces en tu esquina; al acabar el reloj gana la ronda quien más suelo haya cubierto);
 *   'parejas' (2 contra 2, cada equipo en un lado; sin fuego amigo: el petardo de tu compañero no te elimina, y cuando cae te
 *     deja su material (+1 alcance y +1 petardo); cada equipo defiende su carro de pólvora, que aguanta 3 explosiones: la ronda
 *     es del equipo que conserve su carro o a alguien en pie);
 *   'fantasma' (al caer vuelves como fantasma: flotas por encima de todo, sueltas un petardo espectral cada 5 s y si con él
 *     eliminas a alguien vivo resucitas en su casilla);
 *   'unica' (solo hay un petardo en la plaza: se coge pisándolo, se lleva en la mano mientras la mecha corre y se lanza con A,
 *     resbalando hasta chocar; quien lo tenga cuando estalle se va, y aparece otro con la mecha más corta). */
const MODE = CFG.mode || 'plaza', ICE = MODE === 'hielo', PAINT = MODE === 'pintura';
const PAIR = MODE === 'parejas', GHOST = MODE === 'fantasma', UNICA = MODE === 'unica';
const OUT = ART.OUT, TAU = 6.2832, T = 32, CO = 15, RO = 11, TOP = 46, W = CO * T, H = TOP + RO * T;
const RU = Object.assign({ fuse: 2.4, range: 2, bombs: 1, speed: 3.3, kick: false, drop: 0.36, round: 60, wins: 2, slide: ICE, crates: 0.72 }, CFG.rules || {});
const k = Kit({ w: W, h: H, title: CFG.title, bg: ICE ? '#1d2a4a' : PAINT ? '#2d2640' : GHOST ? '#171233' : '#2a1f3a' }), c = k.ctx;
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
const lite = ART.lite, dark = ART.dark, alpha = ART.alpha;
const FIRE_T = 0.55, MAXSPD = 5.6, HATS = ['cone', 'beret', 'crown', 'bow'];
const lsGet = (key, d) => { try { const v = localStorage.getItem(key); return v == null ? d : +v; } catch (e) { return d; } };
const lsSet = (key, v) => { try { localStorage.setItem(key, v); } catch (e) {} };
const CPUK = 'cpu:' + CFG.id;
let skill = 0.3, grid, items, fireT, fireD, fireO, paint, pcount, bombs, pl, crumbs, round, rT, sudden, sudI, sudT, endT, msg, msgT, t = 0, SPIRAL, cdPend, fast;
let hot = null, hotT = 0, hotN = 0; // 'unica': el petardo que se pasa de mano en mano
let bhp = [3, 3], baseLost = -1; // 'parejas': carros de pólvora
const SLIDE_V = ICE ? 7 : 8, INV0 = MODE === 'plaza' ? 3 : 5; // en los modos nuevos nada te elimina en los 5 primeros segundos
const GCD = 5; // recarga del petardo espectral
const team = (q) => (pl.indexOf(q) < 2 ? 0 : 1);
const mate = (q) => pl[pl.indexOf(q) ^ 1];
const friendly = (q, oi) => PAIR && oi >= 0 && !!pl[oi] && pl[oi] !== q && team(pl[oi]) === team(q);

function mk(w, h, draw) { const r = Math.min(3, Math.max(2, Math.ceil((k.scale || 1) * Math.min(2, devicePixelRatio || 1)))), cv = document.createElement('canvas'); cv.width = w * r; cv.height = h * r; const q = cv.getContext('2d'); q.scale(r, r); q.lineJoin = 'round'; q.lineCap = 'round'; draw(q); return cv; }
function label(s, x, y, size, col, align, base) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'center'; c.textBaseline = base || 'middle';
  c.lineJoin = 'round'; c.lineWidth = size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
const flo = (t, x, y, col) => k.float(t, k.clamp(x, 62, W - 62), y, col); // los avisos de los modos nuevos no se salen del lienzo
function fitSize(s, maxW, size) { // baja el cuerpo de letra hasta que el texto cabe (medida real)
  let z = size;
  while (z > 10) { c.font = `900 ${z}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; if (c.measureText(s).width <= maxW) break; z -= 1; }
  return z;
}
function fitName(s, maxW, size) { // recorta el rótulo si no cabe en la tarjeta (medida real)
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  if (c.measureText(s).width <= maxW) return s;
  let o = s; while (o.length > 2 && c.measureText(o + '…').width > maxW) o = o.slice(0, -1);
  return o + '…';
}
const PAINTS = ['#ff6fb5', '#5b8cff', '#a8cf3f', '#ffc94d', '#6e62f5'];
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* ---------------- Arte cacheado: suelo de adoquines, murete con flores, bolardos, cajas ---------------- */
const FLOOR = ICE ? floorIce() : PAINT ? floorPaint() : GHOST ? floorNight() : floorPlaza();
function floorPlaza() { return mk(W, RO * T, (g) => {
  g.fillStyle = '#c9a77c'; g.fillRect(0, 0, W, RO * T);
  for (let y = 1; y < RO - 1; y++) for (let x = 1; x < CO - 1; x++) {
    const X = x * T, Y = y * T, alt = (x + y) % 2;
    g.fillStyle = alt ? '#d8b98f' : '#cfae84'; g.fillRect(X, Y, T, T);
    for (let i = 0; i < 4; i++) { const sx = X + (i % 2) * 16 + ((y % 2) * 8) % 16, sy = Y + Math.floor(i / 2) * 16, v = rnd(x * 31 + y * 7 + i);
      ART.rr(g, sx + 1.5, sy + 1.5, 13, 13, 4); g.fillStyle = mix3(v); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(sx + 4, sy + 3, 7, 1.6); g.strokeStyle = 'rgba(90,60,40,.28)'; g.lineWidth = 1.2; g.stroke(); }
  }
  // sombra suave pegada al murete
  const gr = g.createLinearGradient(0, T, 0, T + 10); gr.addColorStop(0, 'rgba(40,20,30,.3)'); gr.addColorStop(1, 'rgba(40,20,30,0)'); g.fillStyle = gr; g.fillRect(T, T, W - 2 * T, 10);
  // murete del borde con maceteros
  for (let y = 0; y < RO; y++) for (let x = 0; x < CO; x++) if (x === 0 || y === 0 || x === CO - 1 || y === RO - 1) {
    const X = x * T, Y = y * T; const gr2 = g.createLinearGradient(0, Y, 0, Y + T); gr2.addColorStop(0, '#b3a0c4'); gr2.addColorStop(1, '#7d6c93'); g.fillStyle = gr2; g.fillRect(X, Y, T, T);
    g.strokeStyle = 'rgba(40,30,60,.45)'; g.lineWidth = 1.2; g.strokeRect(X + 0.5, Y + 0.5, T - 1, T / 2 - 1); g.strokeRect(X + ((y % 2) ? 0.5 : T / 2), Y + T / 2, T / 2, T / 2 - 0.5);
    if ((x + y) % 3 === 0) { ART.rr(g, X + 6, Y + 8, 20, 16, 4); ART.fillOut(g, '#c7663c', 1.8); g.fillStyle = '#5fbf45'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(X + 10 + i * 6, Y + 8, 5, 0, TAU); g.fill(); }
      const fc = ['#ff5f7a', '#ffd166', '#fff'][(x * 3 + y) % 3]; g.fillStyle = fc; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(X + 10 + i * 6, Y + 6 - (i % 2) * 2, 2.4, 0, TAU); g.fill(); } }
  }
  g.strokeStyle = OUT; g.lineWidth = 3; g.strokeRect(T - 1.5, T - 1.5, W - 2 * T + 3, (RO - 2) * T + 3);
}); }
function tintCv(src, w, h, col, a, extra) { return mk(w, h, (g) => { g.drawImage(src, 0, 0, w, h); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; if (extra) extra(g); }); }
/* Plaza de noche: la misma plaza teñida de azul con luna y farolillos colgados */
function floorNight() { return tintCv(floorPlaza(), W, RO * T, '#2e2570', 0.62, (g) => {
  g.globalAlpha = 0.14; g.fillStyle = '#fff3cf'; g.beginPath(); g.arc(W - 78, 52, 96, 0, TAU); g.fill(); g.globalAlpha = 1;
  for (let x = 2; x < CO - 1; x += 3) { const X = x * T + 16;
    g.strokeStyle = 'rgba(255,220,150,.4)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(X, 0); g.lineTo(X, 10); g.stroke();
    g.globalAlpha = 0.25; g.fillStyle = '#ffd166'; g.beginPath(); g.arc(X, 16, 13, 0, TAU); g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.arc(X, 16, 5.5, 0, TAU); ART.fillOut(g, '#ffd166', 1.8); }
}); }
function mix3(v) { return v < 0.33 ? '#e3c69c' : v < 0.66 ? '#d4b186' : '#c8a176'; }
const PILLAR = ICE ? pillarIce() : PAINT ? pillarPaint() : GHOST ? tintCv(pillarPlaza(), T, T + 10, '#3b2f84', 0.5) : pillarPlaza();
function pillarPlaza() { return mk(T, T + 10, (g) => { // bolardo de piedra con farolillo
  ART.shadow(g, T / 2 + 2, T + 4, 14, 0.3);
  ART.rr(g, 3, 12, T - 6, T - 8, 7); const gr = g.createLinearGradient(3, 0, T - 3, 0); gr.addColorStop(0, '#d9cfe6'); gr.addColorStop(1, '#8e80a8'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
  ART.rr(g, 5, 4, T - 10, 12, 5); const g2 = g.createLinearGradient(0, 4, 0, 16); g2.addColorStop(0, '#f2ecf8'); g2.addColorStop(1, '#b4a8c8'); g.fillStyle = g2; g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(8, 6, 8, 2); g.fillStyle = 'rgba(40,30,60,.25)'; g.fillRect(6, T - 2, T - 12, 3);
}); }
const CRATE = ICE ? crateIce() : PAINT ? cratePaint() : GHOST ? tintCv(cratePlaza(), T, T + 6, '#3b2f84', 0.45) : cratePlaza();
function cratePlaza() { return mk(T, T + 6, (g) => { // caja de mercado con fruta
  ART.shadow(g, T / 2 + 2, T + 2, 14, 0.28);
  ART.rr(g, 2, 6, T - 4, T - 6, 4); const gr = g.createLinearGradient(0, 6, 0, T); gr.addColorStop(0, '#e2a25d'); gr.addColorStop(1, '#a8652f'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
  g.strokeStyle = 'rgba(90,45,20,.7)'; g.lineWidth = 1.5; for (const y of [14, 21]) { g.beginPath(); g.moveTo(4, y); g.lineTo(T - 4, y); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(5, 8, T - 10, 2);
  [['#ff5f5f', 9], ['#ffb13d', 16], ['#8be04a', 23]].forEach(([col, x], i) => { g.beginPath(); g.arc(x, 6 - (i % 2) * 1.5, 4.2, 0, TAU); g.fillStyle = col; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x - 1.3, 4.6 - (i % 2) * 1.5, 1.2, 0, TAU); g.fill(); });
}); }
/* Lago helado: placas de hielo con grietas y brillo, orilla de nieve con abetos, bloques de hielo y cajas nevadas */
function floorIce() {
  return mk(W, RO * T, (g) => {
    g.fillStyle = '#9fd0ec'; g.fillRect(0, 0, W, RO * T);
    for (let y = 1; y < RO - 1; y++) for (let x = 1; x < CO - 1; x++) {
      const X = x * T, Y = y * T, v = rnd(x * 17 + y * 5), gr = g.createLinearGradient(X, Y, X + T, Y + T);
      gr.addColorStop(0, v < 0.5 ? '#e4f5fd' : '#d9f0fb'); gr.addColorStop(1, v < 0.5 ? '#b9e0f3' : '#c3e5f5'); g.fillStyle = gr; g.fillRect(X, Y, T, T);
      g.strokeStyle = 'rgba(80,140,190,.28)'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, T - 1, T - 1);
      if (v > 0.55) { g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.2; g.beginPath(); const sx = X + 4 + rnd(x + y * 9) * 20, sy = Y + 4 + rnd(x * 3 + y) * 20; g.moveTo(sx, sy); g.lineTo(sx + 6, sy + 3); g.lineTo(sx + 9, sy + 9); g.moveTo(sx + 6, sy + 3); g.lineTo(sx + 12, sy + 1); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.35)'; g.save(); g.beginPath(); g.rect(X, Y, T, T); g.clip(); g.beginPath(); g.moveTo(X + 2, Y + 14); g.lineTo(X + 14, Y + 2); g.lineTo(X + 19, Y + 2); g.lineTo(X + 2, Y + 19); g.closePath(); g.fill(); g.restore();
    }
    const gr = g.createLinearGradient(0, T, 0, T + 10); gr.addColorStop(0, 'rgba(30,60,110,.3)'); gr.addColorStop(1, 'rgba(30,60,110,0)'); g.fillStyle = gr; g.fillRect(T, T, W - 2 * T, 10);
    for (let y = 0; y < RO; y++) for (let x = 0; x < CO; x++) if (x === 0 || y === 0 || x === CO - 1 || y === RO - 1) {
      const X = x * T, Y = y * T, gr2 = g.createLinearGradient(0, Y, 0, Y + T); gr2.addColorStop(0, '#ffffff'); gr2.addColorStop(1, '#bcd3ea'); g.fillStyle = gr2; g.fillRect(X, Y, T, T);
      g.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(X + 6 + i * 10, Y + 6 + rnd(x * 7 + y * 3 + i) * 5, 7, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(120,160,210,.35)'; g.fillRect(X, Y + T - 5, T, 5);
      if ((x * 7 + y * 3) % 5 === 0) { // abeto nevado
        g.beginPath(); g.moveTo(X + 16, Y + 1); g.lineTo(X + 27, Y + 24); g.lineTo(X + 5, Y + 24); g.closePath(); ART.fillOut(g, '#3f8f5a', 1.8);
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(X + 16, Y + 1); g.lineTo(X + 21, Y + 11); g.lineTo(X + 11, Y + 11); g.closePath(); g.fill();
        g.fillStyle = '#7a4b2a'; g.fillRect(X + 14, Y + 24, 4, 6); }
    }
    g.strokeStyle = OUT; g.lineWidth = 3; g.strokeRect(T - 1.5, T - 1.5, W - 2 * T + 3, (RO - 2) * T + 3);
  });
}
function pillarIce() {
  return mk(T, T + 10, (g) => {
    ART.shadow(g, T / 2 + 2, T + 4, 14, 0.25);
    ART.rr(g, 3, 10, T - 6, T - 6, 5); const gr = g.createLinearGradient(3, 0, T - 3, 0); gr.addColorStop(0, '#bfe9ff'); gr.addColorStop(1, '#5aa6d6'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
    ART.rr(g, 3, 3, T - 6, 12, 5); g.fillStyle = '#eefaff'; g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(8, 18); g.lineTo(8, 30); g.moveTo(12, 20); g.lineTo(12, 25); g.stroke();
    g.strokeStyle = 'rgba(40,90,140,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(18, 16); g.lineTo(22, 22); g.lineTo(20, 28); g.stroke();
  });
}
function crateIce() {
  return mk(T, T + 6, (g) => {
    ART.shadow(g, T / 2 + 2, T + 2, 14, 0.25);
    ART.rr(g, 2, 6, T - 4, T - 6, 4); const gr = g.createLinearGradient(0, 6, 0, T); gr.addColorStop(0, '#c9925a'); gr.addColorStop(1, '#8c5a2e'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = 'rgba(70,35,15,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(4, 8); g.lineTo(T - 4, T - 2); g.moveTo(T - 4, 8); g.lineTo(4, T - 2); g.stroke();
    g.beginPath(); g.moveTo(1, 9); g.quadraticCurveTo(6, 1, 12, 5); g.quadraticCurveTo(17, 0, 22, 4); g.quadraticCurveTo(28, 1, 31, 9); g.quadraticCurveTo(26, 12, 20, 10); g.quadraticCurveTo(14, 13, 8, 10); g.quadraticCurveTo(4, 12, 1, 9); g.closePath();
    g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); g.fillStyle = 'rgba(150,190,230,.5)'; g.fillRect(8, 8, 14, 2);
  });
}
/* Taller de pintura: baldosas claras, paredes salpicadas, botes de pintura y cajas de cartón */
function floorPaint() {
  return mk(W, RO * T, (g) => {
    g.fillStyle = '#d9d0c2'; g.fillRect(0, 0, W, RO * T);
    for (let y = 1; y < RO - 1; y++) for (let x = 1; x < CO - 1; x++) { const X = x * T, Y = y * T, v = rnd(x * 11 + y * 23);
      ART.rr(g, X + 1, Y + 1, T - 2, T - 2, 4); g.fillStyle = v < 0.5 ? '#f6f1e8' : '#efe8dc'; g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(X + 4, Y + 3, T - 12, 2); }
    const gr = g.createLinearGradient(0, T, 0, T + 10); gr.addColorStop(0, 'rgba(40,20,50,.25)'); gr.addColorStop(1, 'rgba(40,20,50,0)'); g.fillStyle = gr; g.fillRect(T, T, W - 2 * T, 10);
    for (let y = 0; y < RO; y++) for (let x = 0; x < CO; x++) if (x === 0 || y === 0 || x === CO - 1 || y === RO - 1) {
      const X = x * T, Y = y * T, gr2 = g.createLinearGradient(0, Y, 0, Y + T); gr2.addColorStop(0, '#8d86a8'); gr2.addColorStop(1, '#5f587c'); g.fillStyle = gr2; g.fillRect(X, Y, T, T);
      g.strokeStyle = 'rgba(30,20,50,.35)'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, T - 1, T - 1);
      if (rnd(x * 5 + y * 13) < 0.45) { const col = PAINTS[(x + y * 3) % 5]; g.fillStyle = col; g.beginPath(); g.arc(X + 10 + rnd(x + y) * 12, Y + 12, 6, 0, TAU); g.fill(); g.fillRect(X + 12 + rnd(x + y) * 8, Y + 12, 3, 10 + rnd(y * x + 1) * 8); }
    }
    g.strokeStyle = OUT; g.lineWidth = 3; g.strokeRect(T - 1.5, T - 1.5, W - 2 * T + 3, (RO - 2) * T + 3);
  });
}
function pillarPaint() {
  return mk(T, T + 10, (g) => { // bote de pintura grande
    ART.shadow(g, T / 2 + 2, T + 4, 14, 0.28);
    ART.rr(g, 4, 10, T - 8, T - 4, 4); const gr = g.createLinearGradient(4, 0, T - 4, 0); gr.addColorStop(0, '#eef0f8'); gr.addColorStop(0.5, '#c3c6d8'); gr.addColorStop(1, '#8a8ea8'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = '#6e62f5'; g.fillRect(5, 17, T - 10, 9); g.strokeStyle = OUT; g.lineWidth = 1.4; g.strokeRect(5, 17, T - 10, 9); g.fillStyle = '#fff'; g.fillRect(9, 20, 8, 3);
    g.beginPath(); g.ellipse(T / 2, 10, T / 2 - 4, 5, 0, 0, TAU); g.fillStyle = '#dfe2ee'; g.fill(); g.lineWidth = 2.2; g.stroke();
    g.beginPath(); g.ellipse(T / 2, 10, T / 2 - 8, 3, 0, 0, TAU); g.fillStyle = '#ff6fb5'; g.fill();
    g.fillStyle = '#ff6fb5'; g.beginPath(); g.moveTo(22, 11); g.lineTo(25, 11); g.lineTo(25, 20); g.arc(23.5, 20, 1.5, 0, Math.PI); g.closePath(); g.fill();
  });
}
function cratePaint() {
  return mk(T, T + 6, (g) => { // caja de cartón con cinta
    ART.shadow(g, T / 2 + 2, T + 2, 14, 0.28);
    ART.rr(g, 2, 6, T - 4, T - 6, 3); const gr = g.createLinearGradient(0, 6, 0, T); gr.addColorStop(0, '#e6c48c'); gr.addColorStop(1, '#b98e52'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(T / 2 - 3, 7, 6, T - 8); g.strokeStyle = 'rgba(120,80,30,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(4, 14); g.lineTo(T - 4, 14); g.stroke();
    g.fillStyle = 'rgba(90,60,20,.45)'; g.font = '700 7px sans-serif'; g.textAlign = 'center'; g.fillText('^^', 9, 26);
  });
}
const ICON = {};
function itemIcon(kind) {
  if (ICON[kind]) return ICON[kind];
  return (ICON[kind] = mk(28, 28, (g) => {
    ART.rr(g, 2, 2, 24, 24, 7); const col = { r: '#ff7a45', b: '#ff5f7a', s: '#3fb6ea', k: '#8f6cff' }[kind], gr = g.createLinearGradient(0, 2, 0, 26); gr.addColorStop(0, lite(col, 0.25)); gr.addColorStop(1, dark(col, 0.2)); g.fillStyle = gr; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(6, 5, 16, 2);
    g.fillStyle = '#fff'; g.strokeStyle = OUT; g.lineWidth = 1.6;
    if (kind === 'r') { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * TAU / 10, r = i % 2 ? 4 : 9; g.lineTo(14 + Math.cos(a) * r, 15 + Math.sin(a) * r); } g.closePath(); g.fillStyle = '#fff4b8'; g.fill(); g.stroke(); }
    if (kind === 'b') { ART.rr(g, 10, 9, 8, 13, 3); g.fillStyle = '#fff'; g.fill(); g.stroke(); g.fillStyle = '#ffd166'; g.fillRect(10.5, 12, 7, 2.5); g.beginPath(); g.moveTo(14, 9); g.quadraticCurveTo(16, 5, 19, 6); g.stroke(); }
    if (kind === 's') { g.beginPath(); g.moveTo(16, 5); g.lineTo(8, 16); g.lineTo(13, 16); g.lineTo(11, 24); g.lineTo(20, 12); g.lineTo(15, 12); g.closePath(); g.fillStyle = '#fff4b8'; g.fill(); g.stroke(); }
    if (kind === 'k') { g.beginPath(); g.moveTo(10, 6); g.lineTo(16, 6); g.lineTo(16, 16); g.lineTo(22, 18); g.quadraticCurveTo(23, 22, 20, 22); g.lineTo(9, 22); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.stroke(); }
  }));
}

/* ---------------- Mapa ---------------- */
const inG = (x, y) => x >= 0 && y >= 0 && x < CO && y < RO;
const hard = (x, y) => !inG(x, y) || grid[y][x] === 1;
const bombAt = (x, y) => bombs.find((b) => !b.sl && b.x === x && b.y === y) || bombs.find((b) => b.sl && Math.round(b.fx - 0.5) === x && Math.round(b.fy - 0.5) === y);
let FREE = 1;
const SPAWN = PAIR ? [[1, 1], [1, RO - 2], [CO - 2, 1], [CO - 2, RO - 2]] : [[1, 1], [CO - 2, RO - 2], [CO - 2, 1], [1, RO - 2]];
const BASE = [[1, (RO - 1) / 2], [CO - 2, (RO - 1) / 2]]; // carro de cada equipo (izquierda / derecha)
function buildMap() {
  grid = []; items = []; fireT = []; fireD = []; fireO = []; paint = []; pcount = [0, 0, 0, 0]; FREE = 0;
  for (let y = 0; y < RO; y++) { grid.push([]); items.push([]); fireT.push([]); fireD.push([]); fireO.push([]); paint.push([]); for (let x = 0; x < CO; x++) {
    const edge = x === 0 || y === 0 || x === CO - 1 || y === RO - 1, pil = x % 2 === 0 && y % 2 === 0;
    grid[y].push(edge || pil ? 1 : 0); items[y].push(0); fireT[y].push(0); fireD[y].push(0); fireO[y].push(-1); paint[y].push(-1); if (!edge && !pil) FREE++; } }
  const safe = new Set(); for (const [sx, sy] of SPAWN) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) safe.add((sx + dx) + ',' + (sy + dy));
  for (let y = 1; y < RO - 1; y++) for (let x = 1; x < CO - 1; x++) if (!grid[y][x] && !safe.has(x + ',' + y) && Math.random() < RU.crates) grid[y][x] = 2;
  if (PAIR) { bhp = [3, 3]; baseLost = -1; for (const [bx, by] of BASE) { grid[by][bx] = 3; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (grid[by + dy][bx + dx] === 2 && Math.random() < 0.5) grid[by + dy][bx + dx] = 0; } }
  // espiral de la muerte súbita (de fuera hacia dentro)
  SPIRAL = []; let x0 = 1, y0 = 1, x1 = CO - 2, y1 = RO - 2;
  while (x0 <= x1 && y0 <= y1) { for (let x = x0; x <= x1; x++) SPIRAL.push([x, y0]); for (let y = y0 + 1; y <= y1; y++) SPIRAL.push([x1, y]); if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) SPIRAL.push([x, y1]); if (x1 > x0) for (let y = y1 - 1; y > y0; y--) SPIRAL.push([x0, y]); x0++; y0++; x1--; y1--; }
  { const f = SPIRAL.filter(([x, y]) => grid[y][x] !== 1 && grid[y][x] !== 3); SPIRAL = f.slice(0, f.length - 5); } // deja libre el corazón de la plaza
}

/* ---------------- Jugadores ---------------- */
function newPlayers() {
  const P = k.players(4);
  pl = P.map((q, i) => ({ p: q.p, cpu: q.cpu, name: q.cpu ? 'CPU' : (k.party ? 'J' + (q.p + 1) : 'Tú'), col: k.pcol(q.p), wins: pl && pl[i] ? pl[i].wins : 0, hat: HATS[i] }));
}
function placePlayers() {
  pl.forEach((q, i) => Object.assign(q, { x: SPAWN[i][0] + 0.5, y: SPAWN[i][1] + 0.5, dir: [0, 1], spd: RU.speed, max: RU.bombs, range: RU.range, kick: RU.kick, alive: true, dead: 0, out: 0, gl: false, inv: INV0, mv: 0, ai: null, think: 0, anim: 0, bombT: 0, ghost: false, gcd: 0 }));
}
const cellOf = (q) => [Math.floor(q.x), Math.floor(q.y)];
function refreshCtl() { const P = k.players(4); pl.forEach((q) => { const hu = !P[q.p].cpu; q.cpu = !hu; q.name = hu ? (k.party ? 'J' + (q.p + 1) : 'Tú') : 'CPU'; q.col = k.pcol(q.p); }); }
k.onParty = () => { if (k.st !== 'play') { reset(); return; } refreshCtl(); };

function reset() {
  skill = Math.max(0.15, Math.min(0.75, 0.21 + lsGet(CPUK, 0) * 0.03)); /* 1.23: más fácil (antes 0,3 + 0,06/victoria, tope 0,88) */
  pl = null; newPlayers(); round = 0; newRound();
}
function newRound() {
  round++; buildMap(); bombs = []; crumbs = []; hot = null; hotN = 0; hotT = UNICA ? 1.8 : 0; rT = 0; sudden = false; sudI = 0; sudT = 0; endT = 0; msg = ''; msgT = 0; fast = false;
  placePlayers(); cdPend = true;
}

/* ---------------- Movimiento en rejilla con ayuda en esquinas ---------------- */
function blocked(x, y, q) {
  if (hard(x, y) || grid[y][x] >= 2) return true;
  const b = bombAt(x, y); return !!(b && !b.car && !(q && b.pass.has(q)));
}
function tryMove(q, dx, dy, d) {
  const [cx, cy] = cellOf(q), H1 = dx !== 0, off = H1 ? q.y - (cy + 0.5) : q.x - (cx + 0.5), so = Math.sign(off);
  const nb = (a, b) => (H1 ? blocked(cx + a, cy + b, q) : blocked(cx + b, cy + a, q)); // a = avance, b = lateral
  const s = dx || dy;
  if (!nb(s, 0)) { // libre: centra en el carril y avanza
    const a = Math.min(Math.abs(off), d); if (H1) q.y -= so * a; else q.x -= so * a; d -= a;
    if (H1) q.x += s * d; else q.y += s * d; return;
  }
  if (Math.abs(off) > 0.08 && !nb(s, so) && !nb(0, so)) { // ayuda en esquina: desliza hacia el hueco
    const a = Math.min(d, Math.abs(off) < 0.5 ? 0.5 - Math.abs(off) + 0.001 : d); if (H1) q.y += so * a; else q.x += so * a; return;
  }
  kickCheck(q, H1 ? cx + s : cx, H1 ? cy : cy + s, dx, dy);
  if (H1) { const lim = cx + 0.5; q.x = s > 0 ? Math.min(q.x + d, Math.max(q.x, lim)) : Math.max(q.x - d, Math.min(q.x, lim)); }
  else { const lim = cy + 0.5; q.y = s > 0 ? Math.min(q.y + d, Math.max(q.y, lim)) : Math.max(q.y - d, Math.min(q.y, lim)); }
}
function kickCheck(q, x, y, dx, dy) {
  if (!q.kick) return; const b = bombAt(x, y); if (!b || b.sl || b.pass.has(q)) return;
  const [cx, cy] = cellOf(q); if (Math.abs(q.x - (cx + 0.5)) > 0.2 && dx === 0) return; if (Math.abs(q.y - (cy + 0.5)) > 0.2 && dy === 0) return;
  if (blocked(x + dx, y + dy, null) || plAt(x + dx, y + dy)) return;
  b.sl = [dx, dy]; b.fx = b.x + 0.5; b.fy = b.y + 0.5; k.sfx('pop'); k.float('¡Patada!', (b.x + 0.5) * T, TOP + b.y * T, '#c9b8ff');
}
const plAt = (x, y) => pl.some((q) => q.alive && Math.floor(q.x) === x && Math.floor(q.y) === y);

/* ---------------- Petardos y explosiones ---------------- */
function placeBomb(q, slide = RU.slide) {
  const [x, y] = cellOf(q);
  if (bombs.filter((b) => b.own === q).length >= q.max || bombAt(x, y) || grid[y][x]) return false;
  const b = { x, y, t: RU.fuse, range: q.range, own: q, pass: new Set(pl.filter((o) => o.alive && Math.floor(o.x) === x && Math.floor(o.y) === y)), sl: null, born: t };
  bombs.push(b); k.sfx('click'); q.bombT = 0.18;
  if (slide && !blocked(x + q.dir[0], y + q.dir[1], null)) { b.sl = q.dir.slice(); b.fx = x + 0.5; b.fy = y + 0.5; b.pass.clear(); }
  return true;
}
function blast(b) {
  const out = [[b.x, b.y, 0]];
  for (const [dx, dy, bit] of [[1, 0, 1], [-1, 0, 1], [0, 1, 2], [0, -1, 2]]) for (let i = 1; i <= b.range; i++) {
    const x = b.x + dx * i, y = b.y + dy * i; if (hard(x, y)) break; out.push([x, y, bit, i === b.range]); if (grid[y][x] >= 2) break;
  }
  return out;
}
function paintCell(x, y, oi) { if (hard(x, y) || grid[y][x] === 2 || paint[y][x] === oi) return; if (paint[y][x] >= 0) pcount[paint[y][x]]--; paint[y][x] = oi; pcount[oi]++; }
function explode(b) {
  bombs.splice(bombs.indexOf(b), 1); if (b === hot) { hot = null; hotT = 1.5; } k.sfx('explode'); k.shake(5); const oi = pl.indexOf(b.own);
  k.burst((b.x + 0.5) * T, TOP + (b.y + 0.5) * T, PAINT ? b.own.col : '#ffd166', 16, 200); k.burst((b.x + 0.5) * T, TOP + (b.y + 0.5) * T, PAINT ? '#fff' : '#ff5f7a', 10, 160);
  for (const [x, y, bit] of blast(b)) {
    fireT[y][x] = FIRE_T; fireD[y][x] = bit === 0 ? 3 : (fireD[y][x] | bit); fireO[y][x] = oi;
    if (grid[y][x] === 3) { const bi = BASE.findIndex(([a, b2]) => a === x && b2 === y);
      if (bi >= 0 && bhp[bi] > 0) { bhp[bi]--; k.sfx('hurt'); k.shake(6); k.burst((x + 0.5) * T, TOP + (y + 0.5) * T, '#ffb13d', 18, 190);
        if (bhp[bi] <= 0) { grid[y][x] = 0; baseDown(bi); } else flo('¡Carro tocado!', (x + 0.5) * T, TOP + y * T - 8, '#ffd166'); } }
    else if (grid[y][x] === 2) { grid[y][x] = 0; crumbs.push({ x, y, t: 0 }); k.burst((x + 0.5) * T, TOP + (y + 0.5) * T, '#c98a4b', 10, 150); if (Math.random() < RU.drop) items[y][x] = k.pick(UNICA ? ['s'] : ['r', 'r', 'b', 'b', 's', 's', 'k']); fireT[y][x] = FIRE_T; }
    else if (items[y][x] && bit) { items[y][x] = 0; k.burst((x + 0.5) * T, TOP + (y + 0.5) * T, '#fff', 8, 120); }
    const o = bombAt(x, y); if (o && o !== b) o.t = Math.min(o.t, 0.06);
    if (PAINT) paintCell(x, y, oi);
  }
}
function baseDown(bi) {
  if (baseLost >= 0) return; baseLost = bi; k.sfx('explode'); k.shake(9); k.flash('rgba(255,180,90,.35)');
  const [x, y] = BASE[bi]; k.burst((x + 0.5) * T, TOP + (y + 0.5) * T, '#ffd166', 40, 300);
  msg = `¡Carro del equipo ${bi ? 'B' : 'A'} por los aires!`; msgT = 2.4; if (!endT) endT = 1.6;
}
function kill(q, why) {
  if (!q.alive) return; q.alive = false; q.dead = 1; k.sfx('hurt'); k.shake(7);
  if (PAINT) { // pintura: nadie queda eliminado; el que te alcanza salpica tu casilla y las de alrededor, y reapareces en tu esquina
    const [cx, cy] = cellOf(q), oi = fireO[cy][cx], by = pl[oi]; q.out = 1.6;
    if (by && by !== q) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) paintCell(cx + dx, cy + dy, oi); k.burst(q.x * T, TOP + q.y * T, by.col, 30, 240); }
    k.float(by && by !== q ? '¡Pringado!' : '¡Uy!', q.x * T, TOP + q.y * T - 20, by ? by.col : q.col); return; }
  k.burst(q.x * T, TOP + q.y * T, q.col, 26, 220); k.burst(q.x * T, TOP + q.y * T, '#fff', 10, 140); if (PAIR || GHOST || UNICA) flo(why || '¡Fuera!', q.x * T, TOP + q.y * T - 20, q.col); else k.float(why || '¡Fuera!', q.x * T, TOP + q.y * T - 20, q.col);
  const [cx, cy] = cellOf(q), oi = fireO[cy][cx], by = pl[oi];
  if (PAIR) { const m = mate(q); if (m && m.alive) { m.range = Math.min(8, m.range + 1); m.max = Math.min(6, m.max + 1); flo('¡Relevo!', m.x * T, TOP + m.y * T - 24, m.col); k.sfx('coin'); } }
  if (GHOST) { q.ghost = true; q.gcd = 3; q.dead = 0; q.x = k.clamp(q.x, 1.3, CO - 1.3); q.y = k.clamp(q.y, 1.3, RO - 1.3); flo('¡Fantasma!', q.x * T, TOP + q.y * T - 34, '#a097ff');
    if (by && by !== q && by.ghost) revive(by, cx, cy); }
}
function revive(o, x, y) { // fantasma: vuelve a la vida en la casilla del rival al que acaba de pillar
  let best = null, bd = 99;
  for (let b = 1; b < RO - 1; b++) for (let a = 1; a < CO - 1; a++) if (!grid[b][a] && !fireT[b][a] && !bombAt(a, b) && !plAt(a, b)) { const d = Math.abs(a - x) + Math.abs(b - y); if (d < bd) { bd = d; best = [a, b]; } }
  if (!best) return;
  Object.assign(o, { alive: true, ghost: false, dead: 0, x: best[0] + 0.5, y: best[1] + 0.5, inv: 2.5, ai: null, think: 0, mv: 0 });
  k.sfx('win'); k.confetti(o.col, 20); k.burst(o.x * T, TOP + o.y * T, o.col, 22, 200); flo('¡Vuelves!', o.x * T, TOP + o.y * T - 26, o.col);
}

/* ---------------- IA: mapa de peligro + BFS ---------------- */
function slideDest(x, y, d) { // hielo: casilla donde se parará un petardo que resbala desde (x,y) en la dirección d
  for (let i = 0; i < CO; i++) { const nx = x + d[0], ny = y + d[1]; if (blocked(nx, ny, null) || plAt(nx, ny) || items[ny][nx]) break; x = nx; y = ny; } return [x, y];
}
function dangerMap(extra, skip) {
  const D = Array.from({ length: RO }, () => Array(CO).fill(Infinity)), B = bombs.filter((b) => b !== skip).map((b) => { if (ICE && b.sl) { const [x, y] = slideDest(Math.floor(b.fx), Math.floor(b.fy), b.sl); return { x, y, t: b.t, range: b.range }; }
    return { x: b.sl ? Math.floor(b.fx) : b.x, y: b.sl ? Math.floor(b.fy) : b.y, t: b.t, range: b.range }; });
  if (extra) B.push(extra);
  let ch = true; const cov = B.map((b) => blast(b));
  while (ch) { ch = false; B.forEach((b, i) => { for (const [x, y] of cov[i]) B.forEach((o, j) => { if (j !== i && o.x === x && o.y === y && o.t > b.t) { o.t = b.t; ch = true; } }); }); }
  B.forEach((b, i) => { for (const [x, y] of cov[i]) D[y][x] = Math.min(D[y][x], b.t); });
  for (let y = 0; y < RO; y++) for (let x = 0; x < CO; x++) if (fireT[y][x] > 0) D[y][x] = Math.min(D[y][x], -fireT[y][x]);
  if (sudden) for (let i = sudI; i < Math.min(SPIRAL.length, sudI + 3); i++) { const [x, y] = SPIRAL[i]; D[y][x] = Math.min(D[y][x], (i - sudI) * 0.25); }
  return D;
}
function bfs(q, D, goal, extraBomb) {
  const [sx, sy] = cellOf(q), sp = q.spd, seen = new Map([[sx + ',' + sy, null]]), Q = [[sx, sy, 0]];
  for (let h = 0; h < Q.length; h++) {
    const [x, y, n] = Q[h];
    if (goal(x, y, n)) { let key = x + ',' + y, prev = seen.get(key), path = [[x, y]]; while (prev) { path.unshift(prev); prev = seen.get(prev[0] + ',' + prev[1]); } return path; }
    if (n > 26) continue;
    for (const [dx, dy] of k.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]])) {
      const nx = x + dx, ny = y + dy, key = nx + ',' + ny; if (seen.has(key) || hard(nx, ny) || grid[ny][nx] >= 2) continue;
      const grabbable = UNICA && hot && !hot.car && !hot.sl && hot.x === nx && hot.y === ny;
      if ((bombAt(nx, ny) && !grabbable) || (extraBomb && extraBomb.x === nx && extraBomb.y === ny)) continue;
      const inT = Math.max(0, n + 0.45) / sp, outT = (n + 1.6) / sp, d = D[ny][nx]; // entra en la casilla antes de llegar a su centro
      if (d !== Infinity) { if (d < 0) { if (-d > inT - 0.08) continue; } else if (!(d > outT + 0.35 || d + FIRE_T < inT - 0.08)) continue; }
      seen.set(key, [x, y]); Q.push([nx, ny, n + 1]);
    }
  }
  return null;
}
function hitsFoe(q, x, y) { for (const [a, b] of blast({ x, y, range: q.range })) if (pl.some((o) => o !== q && o.alive && !(PAIR && team(o) === team(q)) && (INV0 === 3 || o.inv <= 0) && Math.floor(o.x) === a && Math.floor(o.y) === b)) return true; return false; }
const nearestFoe = (q) => pl.filter((o) => o !== q && o.alive && !(PAIR && team(o) === team(q))).sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y))[0];
function hitsCrate(q, x, y) { return blast({ x, y, range: q.range }).some(([a, b]) => grid[b][a] === 2); }
function hitsBase(q, x, y) { if (!PAIR) return false; const bi = 1 - team(q), [bx, by] = BASE[bi]; return bhp[bi] > 0 && blast({ x, y, range: q.range }).some(([a, b]) => a === bx && b === by); }
function paintGain(q, x, y) { // pintura: cuánto suelo nuevo cubriría un petardo aquí
  const me = pl.indexOf(q); let v = 0; for (const [a, b] of blast({ x, y, range: q.range })) v += grid[b][a] === 2 ? 1.2 : paint[b][a] === me ? 0 : paint[b][a] < 0 ? 1 : 1.4; return v;
}
function slideShot(q, cx, cy) { // hielo: ¿hay un rival en línea recta al que llegaría un petardo deslizado?
  for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (blocked(cx + d[0], cy + d[1], null)) continue; const [ex, ey] = slideDest(cx, cy, d);
    if (Math.abs(ex - cx) + Math.abs(ey - cy) >= 2 && hitsFoe(q, ex, ey)) return { d, x: ex, y: ey }; }
  return null;
}
/* 1.28.1 (pintura): la CPU afloja si ya domina el suelo, para que la ronda no se decida en el primer minuto. */
function pEase(q) {
  if (!PAINT) return 1;
  const me = pl.indexOf(q), best = Math.max(...pl.map((o, i) => (o === q ? -1 : pcount[i])));
  const lead = (pcount[me] - Math.max(0, best)) / Math.max(1, FREE);
  return lead <= 0.06 ? 1 : k.clamp(1 - (lead - 0.06) * 3.2, 0.45, 1);
}
function aiThink(q) {
  const D = dangerMap(), [cx, cy] = cellOf(q), here = D[cy][cx];
  const early = rT < 5, aggr = Math.min(1, 0.25 + skill * 0.5 + rT / 135) * pEase(q);
  if (here !== Infinity) { // huir
    const path = bfs(q, D, (x, y) => D[y][x] === Infinity);
    q.ai = path && path.length > 1 ? path : null; q.think = 0.05; return;
  }
  // ¿soltar petardo aquí?
  const mine = bombs.filter((b) => b.own === q).length;
  if (!early && mine < q.max && !bombAt(cx, cy) && ICE && Math.random() < aggr * 0.5) { // hielo: lanza el petardo deslizando hacia un rival alineado
    const sh = slideShot(q, cx, cy);
    if (sh) { const eb = { x: sh.x, y: sh.y, t: RU.fuse - 0.3, range: q.range }, D2 = dangerMap(eb), esc = bfs(q, D2, (x, y) => D2[y][x] === Infinity);
      if (esc && esc.length > 1) { q.dir = sh.d.slice(); placeBomb(q, true); q.ai = esc; q.think = 0.05; return; } }
  }
  if (!early && mine < q.max && !bombAt(cx, cy)) {
    const foe = hitsFoe(q, cx, cy) || hitsBase(q, cx, cy), crate = PAINT ? paintGain(q, cx, cy) >= 2 : hitsCrate(q, cx, cy); // mismo umbral que el objetivo de abajo (si no, va y viene sin tirar)
    if ((foe && Math.random() < aggr) || (crate && Math.random() < (PAINT ? 0.34 + skill * 0.3 : 0.55 + skill * 0.4) * pEase(q))) {
      const eb = { x: cx, y: cy, t: RU.fuse, range: q.range }, D2 = dangerMap(eb);
      const esc = bfs(q, D2, (x, y) => D2[y][x] === Infinity);
      if (esc && esc.length > 1 && esc.length - 1 <= RU.fuse * q.spd * (0.55 + skill * 0.3)) { placeBomb(q, ICE ? false : undefined); q.ai = esc; q.think = 0.05; return; }
    }
  }
  // objetivo: mejora cercana, rival o caja
  const safeCell = (x, y) => D[y][x] === Infinity;
  let path = bfs(q, D, (x, y, n) => n > 0 && items[y][x] && safeCell(x, y) && n < 8);
  const hunt = rT > 25 || !pl.some((o) => o !== q && o.alive && Math.abs(o.x - q.x) + Math.abs(o.y - q.y) > 14) || Math.random() < aggr * 0.5;
  if (!path && hunt) path = bfs(q, D, (x, y, n) => n > 0 && safeCell(x, y) && hitsFoe(q, x, y));
  if (!path && PAIR && rT > 12) path = bfs(q, D, (x, y, n) => n > 0 && safeCell(x, y) && !bombAt(x, y) && hitsBase(q, x, y));
  if (!path && PAINT) path = bfs(q, D, (x, y, n) => n > 0 && safeCell(x, y) && !bombAt(x, y) && paintGain(q, x, y) >= 4);
  if (!path) path = bfs(q, D, (x, y, n) => (n > 0 || !PAINT) && safeCell(x, y) && (PAINT ? paintGain(q, x, y) >= 2 : hitsCrate(q, x, y)) && !bombAt(x, y)); // pintura: nunca se queda quieto en una casilla sin salida
  if (!path) { const foe = pl.filter((o) => o !== q && o.alive).sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y))[0];
    if (foe) path = bfs(q, D, (x, y, n) => n > 0 && safeCell(x, y) && Math.abs(x + 0.5 - foe.x) + Math.abs(y + 0.5 - foe.y) < 2.2); }
  if (!path) path = bfs(q, D, (x, y, n) => n === 1 && safeCell(x, y));
  q.ai = path && path.length > 1 ? path.slice(0, 3) : null;
  q.think = k.rnd(0.08, 0.1) + (1 - skill) * k.rnd(0.1, 0.35) + (PAINT ? k.rnd(0.12, 0.3) / pEase(q) : 0);
}
function aiDir(q, D) {
  if (!q.ai || q.ai.length < 2) { const [cx, cy] = cellOf(q), ox = cx + 0.5 - q.x, oy = cy + 0.5 - q.y; // sin ruta: vuelve al centro de su casilla
    return Math.abs(ox) > 0.06 ? [Math.sign(ox), 0] : Math.abs(oy) > 0.06 ? [0, Math.sign(oy)] : [0, 0]; }
  const [nx, ny] = q.ai[1]; const [cx, cy] = cellOf(q);
  if (cx === nx && cy === ny && Math.abs(q.x - nx - 0.5) < 0.15 && Math.abs(q.y - ny - 0.5) < 0.15) { q.ai.shift(); q.think = Math.min(q.think, 0.02); return aiDir(q, D); }
  const d = D[ny][nx]; if (!q.fleeing && d !== Infinity && d < 0.6) return [0, 0]; // espera si el paso es peligroso
  const dx = nx + 0.5 - q.x, dy = ny + 0.5 - q.y; return Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
}

/* ---------------- Bucle ---------------- */
reset(); k.show(CFG.title, CFG.help);
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (cdPend) { cdPend = false; k.count(3); }
  if (k.counting()) { t += dt; return; }
  const humans = pl.filter((q) => !q.cpu && q.alive).length;
  fast = !PAINT && !GHOST && humans === 0 && pl.some((q) => !q.cpu) && !endT;
  for (let s = 0; s < (fast ? 4 : 1); s++) step(dt);
}, draw);

function step(dt) {
  t += dt; rT += dt; msgT = Math.max(0, msgT - dt);
  if (endT) { endT -= dt; for (const q of pl) if (q.dead) q.dead = Math.max(0, q.dead - dt); if (endT <= 0) finishRound(); return; }
  for (let y = 0; y < RO; y++) for (let x = 0; x < CO; x++) if (fireT[y][x] > 0) { fireT[y][x] -= dt; if (fireT[y][x] <= 0) { fireT[y][x] = 0; fireD[y][x] = 0; } }
  for (const cr of crumbs) cr.t += dt; crumbs = crumbs.filter((cr) => cr.t < 0.5);
  if (!PAINT && !sudden && rT > RU.round) { sudden = true; msg = '¡Muerte súbita!'; msgT = 2.2; k.sfx('lose'); k.flash('rgba(255,90,95,.3)'); }
  if (sudden && sudI < SPIRAL.length) { sudT -= dt; if (sudT <= 0) { sudT = 0.25; const [x, y] = SPIRAL[sudI++]; grid[y][x] = 1; items[y][x] = 0; crumbs.push({ x, y, t: 0, drop: true });
    const b = bombAt(x, y); if (b) { bombs.splice(bombs.indexOf(b), 1); if (b === hot) { hot = null; hotT = 1.5; } } k.sfx('hit'); k.shake(2);
    for (const q of pl) if (q.alive && Math.floor(q.x) === x && Math.floor(q.y) === y) kill(q, '¡Aplastado!'); } }
  // petardos
  for (const b of bombs.slice()) {
    if (b.sl) { const sp = SLIDE_V * dt; b.fx += b.sl[0] * sp; b.fy += b.sl[1] * sp; const cx = Math.floor(b.fx), cy = Math.floor(b.fy), nx = cx + b.sl[0], ny = cy + b.sl[1];
      const ahead = (b.sl[0] ? (b.fx - cx - 0.5) * b.sl[0] : (b.fy - cy - 0.5) * b.sl[1]) >= 0;
      if (ahead && (blocked(nx, ny, null) || plAt(nx, ny) || items[ny][nx])) {
        const o = ICE && bombAt(nx, ny); // hielo: choque de petardos, el parado sale resbalando (carambola)
        if (o && o !== b && !o.sl && !blocked(nx + b.sl[0], ny + b.sl[1], null) && !plAt(nx + b.sl[0], ny + b.sl[1]) && !items[ny + b.sl[1]][nx + b.sl[0]]) { o.sl = b.sl.slice(); o.fx = o.x + 0.5; o.fy = o.y + 0.5; o.pass.clear(); k.sfx('hit'); k.burst((nx + 0.5) * T, TOP + (ny + 0.5) * T, '#dff4ff', 8, 120); }
        b.x = cx; b.y = cy; b.sl = null; b.fx = cx + 0.5; b.fy = cy + 0.5; b.pass = new Set(pl.filter((o) => o.alive && Math.floor(o.x) === cx && Math.floor(o.y) === cy)); } }
    b.t -= dt; if (b.t <= 0) explode(b);
  }
  for (const b of bombs) for (const q of b.pass) { const [x, y] = cellOf(q); if (x !== b.x || y !== b.y) b.pass.delete(q); }
  if (UNICA) stepHot(dt);
  const D = pl.some((q) => q.cpu && q.alive) ? dangerMap() : null;
  // jugadores
  for (const q of pl) {
    if (!q.alive) { q.dead = Math.max(0, q.dead - dt);
      if (GHOST && q.ghost) updGhost(q, dt);
      if (PAINT && q.out > 0 && (q.out -= dt) <= 0) { const i = pl.indexOf(q); Object.assign(q, { alive: true, x: SPAWN[i][0] + 0.5, y: SPAWN[i][1] + 0.5, inv: 2, ai: null, think: 0, dead: 0 }); k.sfx('pop'); k.burst(q.x * T, TOP + q.y * T, q.col, 14, 140); }
      continue; }
    q.inv = Math.max(0, q.inv - dt); q.bombT = Math.max(0, q.bombT - dt);
    let dir = [0, 0], drop = false;
    if (q.cpu) { const carry = UNICA && hot && hot.car === q, DD = carry ? dangerMap(null, hot) : D;
      q.think -= dt; if (q.think <= 0 || !q.ai) (UNICA ? aiHot : aiThink)(q);
      const [cx, cy] = cellOf(q); q.fleeing = DD[cy][cx] !== Infinity; dir = aiDir(q, DD); }
    else { const v = k.pdir(q.p); if (v.x || v.y) { // eje dominante; si se pulsan dos, prueba el que no está bloqueado
        const [cx, cy] = cellOf(q), hx = v.x ? [Math.sign(v.x), 0] : null, vy = v.y ? [0, Math.sign(v.y)] : null;
        if (hx && vy) dir = !blocked(cx + hx[0], cy, q) ? (q.dir[1] && !blocked(cx, cy + vy[1], q) ? vy : hx) : vy; else dir = hx || vy; }
      drop = k.phit(q.p, 'a') || k.phit(q.p, 'b'); if (ICE && drop) drop = k.phit(q.p, 'a') ? 'slide' : 'still'; }
    if (ICE && !q.cpu) { if (dir[0] || dir[1]) q.gl = true; else if (q.gl && !glide(q, dt)) q.gl = false; } // hielo: resbalas hasta el centro de la casilla
    if (q.cpu && (!q.ai || q.ai.length < 2) && (dir[0] || dir[1])) { const [cx, cy] = cellOf(q), m = q.spd * dt; q.x += k.clamp(cx + 0.5 - q.x, -m, m); q.y += k.clamp(cy + 0.5 - q.y, -m, m); q.mv += dt; }
    else if (dir[0] || dir[1]) { q.dir = dir; tryMove(q, dir[0], dir[1], q.spd * dt); q.mv += dt; } else q.mv = 0;
    q.anim += dt;
    if (UNICA) { if (drop) throwHot(q); }
    else if (drop && placeBomb(q, drop === 'slide' ? true : drop === 'still' ? false : undefined)) {} else if (drop) k.sfx('click');
    const [cx, cy] = cellOf(q);
    if (items[cy][cx]) { const it = items[cy][cx]; items[cy][cx] = 0; k.sfx('coin'); k.burst(q.x * T, TOP + q.y * T, '#ffd166', 12, 140);
      if (it === 'r') { q.range = Math.min(8, q.range + 1); k.float('+Alcance', q.x * T, TOP + q.y * T - 18, '#ffb13d'); }
      if (it === 'b') { q.max = Math.min(6, q.max + 1); k.float('+Petardo', q.x * T, TOP + q.y * T - 18, '#ff8fa3'); }
      if (it === 's') { q.spd = Math.min(MAXSPD, q.spd + 0.55); k.float('+Velocidad', q.x * T, TOP + q.y * T - 18, '#8fdcff'); }
      if (it === 'k') { q.kick = true; k.float('¡Patada!', q.x * T, TOP + q.y * T - 18, '#c9b8ff'); } }
    if (fireT[cy][cx] > 0 && q.inv <= 0 && !friendly(q, fireO[cy][cx])) kill(q);
  }
  if (PAINT) { if (rT >= RU.round && !endT) { endT = 1.4; k.sfx('tick'); } return; }
  const alive = pl.filter((q) => q.alive);
  const over = PAIR ? baseLost >= 0 || !alive.some((q) => team(q) === 0) || !alive.some((q) => team(q) === 1) : alive.length <= 1;
  if ((over || (sudI >= SPIRAL.length && rT > RU.round + SPIRAL.length * 0.25 + 15)) && !endT) endT = 1.2;
}

/* ---------------- 'fantasma': espíritus que siguen jugando ---------------- */
function updGhost(q, dt) {
  q.gcd = Math.max(0, q.gcd - dt); q.anim += dt; q.inv = 0;
  let dir = [0, 0], drop = false;
  if (q.cpu) { const foe = nearestFoe(q);
    if (foe) { const dx = foe.x - q.x, dy = foe.y - q.y, l = Math.max(0.3, Math.hypot(dx, dy)); dir = [dx / l, dy / l];
      drop = q.gcd <= 0 && l < 2.6 && Math.random() < 0.05 + skill * 0.1; } }
  else { const v = k.pdir(q.p); dir = [v.x, v.y]; drop = k.phit(q.p, 'a') || k.phit(q.p, 'b'); }
  const sp = 3.4 * dt; q.x = k.clamp(q.x + dir[0] * sp, 1.3, CO - 1.3); q.y = k.clamp(q.y + dir[1] * sp, 1.3, RO - 1.3);
  if (dir[0] || dir[1]) { q.dir = [Math.sign(dir[0]), Math.sign(dir[1])]; q.mv += dt; } else q.mv = 0;
  if (drop && q.gcd <= 0) { const x = Math.floor(q.x), y = Math.floor(q.y);
    if (!grid[y][x] && !bombAt(x, y)) { bombs.push({ x, y, t: 2.6, range: q.range, own: q, pass: new Set(), sl: null, born: t, gh: true }); q.gcd = GCD; k.sfx('shoot'); k.burst((x + 0.5) * T, TOP + (y + 0.5) * T, q.col, 12, 130); }
    else k.sfx('click'); }
}
function drawGhost(q) {
  const x = q.x * T, y = TOP + q.y * T + Math.sin(q.anim * 3) * 3;
  c.save(); c.globalAlpha = 0.82;
  c.beginPath(); c.arc(x, y - 6, 11, Math.PI, 0); c.lineTo(x + 11, y + 8);
  for (let i = 0; i < 3; i++) { const x0 = x + 11 - i * 7.33; c.quadraticCurveTo(x0 - 3.6, y + 8 + (i % 2 ? 7 : -5), x0 - 7.33, y + 8); }
  c.lineTo(x - 11, y - 6); c.closePath();
  const gr = c.createLinearGradient(x, y - 17, x, y + 8); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, lite(q.col, 0.4)); c.fillStyle = gr; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = OUT; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * 4 + q.dir[0] * 2, y - 8, 2.2, 0, TAU); c.fill(); }
  c.restore();
  label(q.name === 'Tú' ? 'TÚ' : q.name, x, y - 27, k.party ? 16 : 11, q.col);
  const w = 24, f = 1 - q.gcd / GCD;
  ART.rr(c, x - w / 2, y + 13, w, 5, 2.5); c.fillStyle = 'rgba(26,21,48,.75)'; c.fill();
  if (f > 0) { ART.rr(c, x - w / 2 + 1, y + 14, (w - 2) * f, 3, 1.5); c.fillStyle = f >= 1 ? '#a8cf3f' : '#a097ff'; c.fill(); }
}

/* ---------------- 'unica': un solo petardo que se pasa de mano en mano ---------------- */
function spawnHot() {
  let best = null, bd = 1e9; const mx = (CO - 1) / 2, my = (RO - 1) / 2;
  for (let y = 1; y < RO - 1; y++) for (let x = 1; x < CO - 1; x++) if (!grid[y][x] && !fireT[y][x] && !plAt(x, y)) { const d = Math.hypot(x - mx, y - my); if (d < bd) { bd = d; best = [x, y]; } }
  if (!best) return;
  hotN++; const fu = Math.max(3.4, RU.fuse - (hotN - 1) * 0.6);
  hot = { x: best[0], y: best[1], t: fu, fu, range: RU.range + Math.min(2, Math.floor((hotN - 1) / 2)), own: null, pass: new Set(), sl: null, born: t, hot: true, car: null, last: null, cool: 0 };
  bombs.push(hot); k.sfx('start'); flo('¡Petardo!', (hot.x + 0.5) * T, TOP + hot.y * T, '#ffd166');
}
function grabHot(q) { hot.car = q; hot.own = q; hot.sl = null; hot.pass = new Set(); hot.fx = q.x; hot.fy = q.y; k.sfx('coin'); k.shake(2); flo('¡Lo tienes!', q.x * T, TOP + q.y * T - 30, q.col); }
function throwHot(q) {
  if (!hot || hot.car !== q) { k.sfx('click'); return; }
  const [cx, cy] = cellOf(q);
  hot.car = null; hot.last = q; hot.cool = 0.45; hot.sl = q.dir.slice(); hot.fx = cx + 0.5; hot.fy = cy + 0.5; hot.x = cx; hot.y = cy;
  k.sfx('shoot'); k.burst(q.x * T, TOP + q.y * T, '#ffd166', 10, 150);
}
function stepHot(dt) {
  if (!hot) { if (hotT > 0 && (hotT -= dt) <= 0 && !endT) spawnHot(); return; }
  hot.cool = Math.max(0, hot.cool - dt);
  const ok = (q) => q.alive && !(q === hot.last && hot.cool > 0);
  if (hot.car && !hot.car.alive) { hot.last = hot.car; hot.car = null; hot.cool = 0.3; }
  if (hot.car) { const [cx, cy] = cellOf(hot.car); hot.x = cx; hot.y = cy; hot.fx = hot.car.x; hot.fy = hot.car.y; return; }
  if (hot.sl) { const cand = pl.filter((q) => ok(q) && Math.abs(q.x - hot.fx) + Math.abs(q.y - hot.fy) < 1.25); if (cand.length) grabHot(cand[0]); return; }
  const cand = pl.filter((q) => ok(q) && Math.floor(q.x) === hot.x && Math.floor(q.y) === hot.y);
  if (cand.length) grabHot(cand[0]);
}
function aimHot(q, foe) { // dirección en la que el petardo lanzado llegaría al rival
  const [cx, cy] = cellOf(q);
  for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let x = cx, y = cy;
    for (let i = 0; i < CO; i++) { const nx = x + d[0], ny = y + d[1]; if (blocked(nx, ny, q)) break; x = nx; y = ny;
      if (Math.floor(foe.x) === x && Math.floor(foe.y) === y) return d.slice(); } }
  return null;
}
function aiHot(q) {
  const carry = hot && hot.car === q, D = dangerMap(null, carry ? hot : null), foe = nearestFoe(q);
  q.think = 0.1 + (1 - skill) * k.rnd(0.12, 0.3);
  if (carry) {
    if (foe) { const d = aimHot(q, foe);
      if (d && (hot.t < hot.fu * 0.85 || Math.random() < 0.35 + skill)) { q.dir = d; throwHot(q); q.ai = null; return; }
      if (hot.t < 1.7) { const dx = foe.x - q.x, dy = foe.y - q.y; q.dir = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1]; throwHot(q); q.ai = null; return; }
      const path = bfs(q, D, (x, y, n) => n > 0 && (x === Math.floor(foe.x) || y === Math.floor(foe.y)) && Math.abs(x + 0.5 - foe.x) + Math.abs(y + 0.5 - foe.y) < 9)
        || bfs(q, D, (x, y, n) => n > 0 && Math.abs(x + 0.5 - foe.x) + Math.abs(y + 0.5 - foe.y) < 3.5);
      q.ai = path && path.length > 1 ? path.slice(0, 3) : null; return; }
    q.ai = null; return;
  }
  if (hot && !hot.car && !hot.sl && hot.t > 2.4 && Math.random() < 0.3 + skill * 0.5) { const path = bfs(q, D, (x, y) => x === hot.x && y === hot.y); if (path && path.length > 1) { q.ai = path.slice(0, 4); return; } }
  const far = (x, y) => !hot || Math.abs(x - hot.x) + Math.abs(y - hot.y) > 4;
  const path = bfs(q, D, (x, y, n) => n > 1 && D[y][x] === Infinity && far(x, y) && items[y][x])
    || bfs(q, D, (x, y, n) => n > 2 && D[y][x] === Infinity && far(x, y))
    || bfs(q, D, (x, y, n) => n === 1 && D[y][x] === Infinity);
  q.ai = path && path.length > 1 ? path.slice(0, 4) : null;
}
function glide(q, dt) {
  const [cx, cy] = cellOf(q), d = q.dir, off = d[0] ? (q.x - (cx + 0.5)) * d[0] : (q.y - (cy + 0.5)) * d[1];
  const rem = off < -0.02 ? -off : off > 0.15 && !blocked(cx + d[0], cy + d[1], q) ? 1 - off : 0;
  if (rem <= 0.01) return false; tryMove(q, d[0], d[1], Math.min(rem, q.spd * 0.8 * dt)); q.mv += dt; return true;
}
const pct = (i) => Math.round(100 * pcount[i] / FREE);
function winTeam(i) {
  pl.forEach((q, j) => { if ((j < 2 ? 0 : 1) === i) q.wins++; });
  const mine = pl.some((q) => !q.cpu && (pl.indexOf(q) < 2 ? 0 : 1) === i);
  msg = k.party || !pl.some((q) => !q.cpu) ? `¡Ronda para el equipo ${i ? 'B' : 'A'}!` : mine ? '¡Ronda para tu equipo!' : '¡Ronda para el equipo rival!';
  k.confetti(pl[i * 2].col, 60);
}
function finishRound() {
  const alive = PAINT ? [] : pl.filter((q) => q.alive);
  if (PAIR) { const a = alive.some((q) => team(q) === 0), b = alive.some((q) => team(q) === 1);
    if (baseLost >= 0) winTeam(1 - baseLost); else if (a && !b) winTeam(0); else if (b && !a) winTeam(1); else msg = '¡Nadie en pie! Ronda nula'; }
  else if (PAINT) { const best = Math.max(...pl.map((q, i) => pcount[i])), top = pl.filter((q, i) => pcount[i] === best);
    if (top.length === 1 && best > 0) { const w = top[0]; w.wins++; msg = `¡Ronda para ${w.name === 'Tú' ? 'ti' : w.name}! ${pct(pl.indexOf(w))} %`; k.confetti(w.col, 60); } else msg = '¡Empate a pintura! Ronda nula'; }
  else if (alive.length === 1 && !PAIR) { const w = alive[0]; w.wins++; msg = `¡Ronda para ${w.name === 'Tú' ? 'ti' : w.name}!`; k.confetti(w.col, 60); }
  else if (!PAINT && !PAIR) msg = '¡Nadie en pie! Ronda nula';
  const champ = pl.find((q) => q.wins >= RU.wins);
  if (champ) {
    const hu = PAIR ? pl.some((o) => !o.cpu && team(o) === team(champ)) : !champ.cpu; if (!k.party && hu) lsSet(CPUK, lsGet(CPUK, 0) + 1); else if (!k.party) lsSet(CPUK, Math.max(0, lsGet(CPUK, 0) - 0.5));
    k.podium(pl.map((q) => ({ p: q.p, score: q.wins, name: q.name })), { fmt: (s) => s + (s === 1 ? ' ronda' : ' rondas'), head: PAIR ? (hu ? '¡Gana tu equipo!' : '¡Gana el equipo rival!') : champ.name === 'Tú' ? (ICE ? '¡Ganas en el hielo!' : PAINT ? '¡Ganas la guerra de pintura!' : GHOST ? '¡Sobrevives a los fantasmas!' : UNICA ? '¡El petardo nunca te pilla!' : '¡Ganas la plaza!') : `¡Gana ${champ.name}!` });
    return;
  }
  msgT = 2; newRound();
}

/* ---------------- Dibujo ---------------- */
function drawBomb(b) {
  const x = (b.car || b.sl) ? b.fx * T : (b.x + 0.5) * T, y = TOP + ((b.car || b.sl) ? b.fy * T : (b.y + 0.5) * T) - (b.car ? 36 : 0), f = b.t / (b.fu || RU.fuse), pulse = 1 + Math.sin(t * (10 + (1 - f) * 22)) * 0.06 * (1.4 - f);
  if (!b.car) ART.shadow(c, x + 2, y + 11, 10, 0.3);
  if (b.gh) { c.globalAlpha = 0.72; c.save(); c.globalAlpha = 0.25; c.fillStyle = b.own.col; c.beginPath(); c.arc(x, y + 2, 20, 0, TAU); c.fill(); c.restore(); }
  if (b.hot) { const R = 20; c.lineWidth = 4; c.strokeStyle = 'rgba(26,21,48,.55)'; c.beginPath(); c.arc(x, y + 2, R, 0, TAU); c.stroke();
    c.strokeStyle = f < 0.3 ? '#ff5f7a' : f < 0.6 ? '#ffc94d' : '#a8cf3f'; c.beginPath(); c.arc(x, y + 2, R, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, f)); c.stroke(); }
  c.save(); c.translate(x, y + 2); c.scale(pulse, pulse); if (b.sl) c.rotate(Math.sin(t * 30) * 0.15);
  ART.rr(c, -8, -12, 16, 23, 5); const gr = c.createLinearGradient(-8, 0, 8, 0), bc = PAINT ? b.own.col : ICE ? '#3f8cff' : null;
  if (bc) { gr.addColorStop(0, lite(bc, 0.35)); gr.addColorStop(0.45, bc); gr.addColorStop(1, dark(bc, 0.35)); } else { gr.addColorStop(0, '#ff7a82'); gr.addColorStop(0.45, '#e63946'); gr.addColorStop(1, '#a3162a'); } c.fillStyle = f < 0.3 && Math.floor(t * 12) % 2 ? '#fff0f0' : gr; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = PAINT ? '#fff' : '#ffd166'; c.fillRect(-7, -8, 14, 3.5); c.fillRect(-7, 4, 14, 3.5); c.fillStyle = PAINT ? '#1a1530' : b.own ? b.own.col : '#ffd166'; c.fillRect(-7, -2.5, 14, 4);
  c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(-5, -10, 2.5, 18);
  c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(4, -18, 2 + Math.sin(t * 8) * 1.5, -21); c.lineWidth = 2; c.strokeStyle = '#3a2a4a'; c.stroke();
  const sx = 2 + Math.sin(t * 8) * 1.5, sy = -22; c.fillStyle = '#fff4b8'; ART.glint(c, sx, sy, 4 + Math.sin(t * 40) * 1.5, '#ffd166'); ART.glint(c, sx, sy, 2.2, '#fff');
  c.restore(); c.globalAlpha = 1;
  if (b.hot) label(Math.ceil(b.t) + '', x, y + 30, 15, f < 0.3 ? '#ff8fa3' : '#fff');
}
function drawFire(x, y) {
  const f = fireT[y][x] / FIRE_T, d = fireD[y][x], X = x * T, Y = TOP + y * T, s = 0.55 + 0.45 * Math.sin(Math.min(1, (1 - f) * 3) * Math.PI / 2 + 0.3);
  c.globalAlpha = Math.min(1, f * 2.5);
  const lay = (col, pad) => { c.fillStyle = col; if (d & 1 || d === 3) { ART.rr(c, X - 1, Y + pad, T + 2, T - pad * 2, (T - pad * 2) / 2); c.fill(); } if (d & 2 || d === 3) { ART.rr(c, X + pad, Y - 1, T - pad * 2, T + 2, (T - pad * 2) / 2); c.fill(); } };
  const oc = PAINT && pl[fireO[y][x]] ? pl[fireO[y][x]].col : null, F = oc ? [dark(oc, 0.15), lite(oc, 0.3), '#ffffff'] : ICE ? ['#5b8cff', '#8fe3ff', '#ffffff'] : ['#ff5f7a', '#ffb13d', '#fff4b8'];
  lay(F[0], 3 + (1 - s) * 4); lay(F[1], 8 + (1 - s) * 3); lay(F[2], 12 + (1 - s) * 2);
  if (d === 3) { c.fillStyle = '#fff'; c.beginPath(); c.arc(X + T / 2, Y + T / 2, 7 * s, 0, TAU); c.fill(); }
  const sp = rnd(x * 13 + y * 7 + Math.floor(t * 12)); c.fillStyle = ['#ffd166', '#5ce1e6', '#ff8fd0', '#fff'][Math.floor(sp * 4)]; c.fillRect(X + sp * 26, Y + rnd(sp * 99) * 26, 3, 3);
  c.globalAlpha = 1;
}
function drawPlayer(q) {
  if (GHOST && q.ghost) return drawGhost(q);
  const x = q.x * T, y = TOP + q.y * T, bob = q.mv ? Math.abs(Math.sin(q.anim * 14)) * 2.5 : Math.sin(q.anim * 3) * 0.8, sq = q.bombT > 0 ? 0.15 : 0;
  if (!q.alive) { if (q.dead <= 0) return; c.save(); c.globalAlpha = q.dead; c.translate(x, y - (1 - q.dead) * 26); c.rotate((1 - q.dead) * 6); c.scale(q.dead, q.dead); bodyAt(q, 0, 0, 0); c.restore(); return; }
  if (q.inv > 0 && Math.floor(q.inv * 12) % 2) c.globalAlpha = 0.5;
  ART.shadow(c, x + 1, y + 12, 11, 0.3);
  c.save(); c.translate(x, y + 4 - bob); c.scale(1 + sq, 1 - sq); bodyAt(q, 0, 0, 1); c.restore();
  c.globalAlpha = 1;
  label(q.name === 'Tú' ? 'TÚ' : q.name === 'CPU' ? 'CPU' : q.name, x, y - 30 - bob - (k.party ? 4 : 0), k.party ? 18 : 11, q.col);
}
function bodyAt(q, x, y, live) {
  const [dx, dy] = q.dir, step = Math.round((q.mv ? Math.sin(q.anim * 14) : 0) * 2) / 2;
  PZ.put(c, bodySpr(q.col, q.hat, dx, dy, step, live), x, y);
}
/* vecino de la plaza: una sola silueta (pies + cuerpo + cabeza + gorro trazados y contorneados de
   una pasada). Sólo cambia de sprite por color, gorro, rumbo y fotograma del paso. */
function bodySpr(col, hat, dx, dy, step, live) {
  return PZ.spr(`B${col}|${hat}|${dx}|${dy}|${step}|${live}`, 46, 52, 23, 34, (g) => {
    const parts = [], boot = dark(col, 0.55), skin = '#ffd9b5';
    for (const s of [-1, 1]) parts.push([PZ.blob(s * 5, 8 + s * step * 1.6, 4.2, 3.2), boot]);
    parts.push([PZ.box(-9, -6, 18, 15, 7), col, 0, { dx: 2.4, dy: 2.2 }]);
    parts.push([PZ.blob(0, -14, 11, 11), skin, 0, { dx: 2.6, dy: 2.4, f: 0.7 }]);
    const hc = lite(col, 0.12);
    if (hat === 'cone') parts.push([(p) => { p.moveTo(-8, -20); p.quadraticCurveTo(0, -23, 8, -20); p.lineTo(1.2, -38); p.quadraticCurveTo(0, -39.5, -1.2, -38); p.closePath(); }, hc]);
    if (hat === 'beret') parts.push([PZ.blob(-1, -22, 11, 5.4, -0.15), hc]);
    if (hat === 'crown') parts.push([(p) => { p.moveTo(-8, -19); p.lineTo(-8, -28); p.lineTo(-4, -24); p.lineTo(0, -31); p.lineTo(4, -24); p.lineTo(8, -28); p.lineTo(8, -19); p.closePath(); }, hc]);
    if (hat === 'bow') { parts.push([(p) => { p.moveTo(0, -22); p.lineTo(-10, -28); p.lineTo(-10, -17); p.closePath(); }, hc]); parts.push([(p) => { p.moveTo(0, -22); p.lineTo(10, -28); p.lineTo(10, -17); p.closePath(); }, hc]); parts.push([PZ.blob(0, -22, 3.2, 3.2), lite(hc, 0.25)]); }
    const sil = PZ.unite(g, parts, 1.5);
    PZ.in(g, sil, (p) => {
      p.fillStyle = 'rgba(255,255,255,.75)'; p.fillRect(-7, -1.4, 14, 2.6);   /* banda de la camiseta */
      PZ.shine(p, -4.6, -18.4, 3.2, 2, -0.6, 0.3);
    });
    if (dy >= 0) {
      const ex = dx * 3, ey = dy * 1.3;
      g.fillStyle = 'rgba(255,110,120,.4)';
      g.beginPath(); g.arc(-7 + dx * 2, -10, 2.6, 0, TAU); g.arc(7 + dx * 2, -10, 2.6, 0, TAU); g.fill();
      PZ.eyes(g, ex, -15.5 + ey, 4.4, 3.1, dx, dy, { lidCol: skin, lid: live ? 0.2 : 0.5, tilt: live ? 0.08 : 0.3 });
      PZ.brows(g, ex, -20.4 + ey, 4.4, 4.4, live ? 0.5 : 1.4, dark(skin, 0.55), 1.5);
      PZ.mouth(g, ex, -8.6, 4.2, live ? 0 : 4);
    }
  });
}
let BARREL = null;
const barrel = () => BARREL || (BARREL = mk(T, T + 12, (g) => { // carro de pólvora: barril con mecha sobre ruedas
  ART.shadow(g, T / 2 + 1, T + 8, 14, 0.3);
  g.fillStyle = '#4a3a2a'; for (const x of [8, T - 8]) { g.beginPath(); g.arc(x, T + 5, 4.5, 0, TAU); ART.fillOut(g, '#3a2a4a', 1.8); }
  ART.rr(g, 5, 12, T - 10, T - 8, 6); const gr = g.createLinearGradient(5, 0, T - 5, 0); gr.addColorStop(0, '#b9773f'); gr.addColorStop(0.5, '#96592c'); gr.addColorStop(1, '#6e3f1e'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; for (const y of [17, 27]) { g.beginPath(); g.moveTo(6, y); g.lineTo(T - 6, y); g.stroke(); }
  g.beginPath(); g.moveTo(T / 2, 12); g.quadraticCurveTo(T / 2 + 6, 4, T / 2 + 2, 1); g.lineWidth = 2; g.strokeStyle = '#3a2a4a'; g.stroke();
}));
function drawBase(x, y) {
  const bi = BASE.findIndex(([a, b]) => a === x && b === y), X = x * T, Y = TOP + y * T;
  c.drawImage(barrel(), X, Y - 12, T, T + 12);
  const col = pl[bi * 2] ? pl[bi * 2].col : '#fff';
  c.fillStyle = col; ART.rr(c, X + 4, Y + 2, T - 8, 7, 3); c.fill(); c.lineWidth = 1.8; c.strokeStyle = OUT; c.stroke();
  label(bi ? 'B' : 'A', X + T / 2, Y + 5.5, 9, '#fff');
  for (let i = 0; i < 3; i++) { const cx = X + T / 2 + (i - 1) * 9; c.beginPath(); c.arc(cx, Y - 16, 3.4, 0, TAU); c.fillStyle = i < bhp[bi] ? '#a8cf3f' : 'rgba(255,255,255,.18)'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke(); }
}
function draw() {
  c.fillStyle = '#2a1f3a'; c.fillRect(0, 0, W, H);
  c.drawImage(FLOOR, 0, TOP, W, RO * T);
  if (PAINT) for (let y = 1; y < RO - 1; y++) for (let x = 1; x < CO - 1; x++) { const o = paint[y][x]; if (o < 0 || !pl[o]) continue; // manchas de pintura
    const X = x * T, Y = TOP + y * T, col = pl[o].col, v = rnd(x * 7 + y * 31); c.fillStyle = col; c.globalAlpha = 0.82;
    ART.rr(c, X + 1.5, Y + 1.5, T - 3, T - 3, 9); c.fill(); c.beginPath(); c.arc(X + 4 + v * 24, Y + (v > 0.5 ? 1 : T - 1), 3.5, 0, TAU); c.arc(X + (v > 0.3 ? T - 1 : 1), Y + 6 + v * 20, 3, 0, TAU); c.fill();
    c.globalAlpha = 0.35; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(X + 10, Y + 9, 5, 2.6, -0.5, 0, TAU); c.fill(); c.globalAlpha = 1; }
  for (let y = 1; y < RO - 1; y++) for (let x = 1; x < CO - 1; x++) if (items[y][x]) { const bb = Math.sin(t * 4 + x + y) * 2; ART.shadow(c, (x + 0.5) * T, TOP + y * T + 28, 9, 0.25); c.drawImage(itemIcon(items[y][x]), x * T + 2, TOP + y * T + 2 + bb, 28, 28); }
  for (let y = 0; y < RO; y++) for (let x = 0; x < CO; x++) if (fireT[y][x] > 0) drawFire(x, y);
  // objetos ordenados por fila (profundidad)
  const L = [];
  for (let y = 1; y < RO - 1; y++) for (let x = 1; x < CO - 1; x++) if (grid[y][x]) L.push([y + 0.9, 0, x, y]);
  for (const b of bombs) L.push([b.car ? b.fy + 0.25 : b.sl ? b.fy : b.y + 0.5, 1, b]);
  for (const q of pl) L.push([q.y + 0.2, 2, q]);
  L.sort((a, b) => a[0] - b[0]);
  for (const e of L) {
    if (e[1] === 0) { const [, , x, y] = e, cr = crumbs.find((q) => q.drop && q.x === x && q.y === y), dy = cr ? -(1 - cr.t / 0.5) * 40 : 0;
      if (grid[y][x] === 3) drawBase(x, y); else if (grid[y][x] === 2) c.drawImage(CRATE, x * T, TOP + y * T - 6, T, T + 6); else if (x % 2 === 0 && y % 2 === 0) c.drawImage(PILLAR, x * T, TOP + y * T - 10, T, T + 10);
      else { c.save(); c.translate(0, dy); c.drawImage(PILLAR, x * T, TOP + y * T - 10, T, T + 10); c.fillStyle = 'rgba(255,90,95,.35)'; ART.rr(c, x * T + 4, TOP + y * T + 2, T - 8, T - 6, 6); c.fill(); c.restore(); } }
    else if (e[1] === 1) drawBomb(e[2]); else drawPlayer(e[2]);
  }
  for (const cr of crumbs) if (!cr.drop) { c.globalAlpha = 1 - cr.t / 0.5; for (let i = 0; i < 4; i++) { const a = i * 1.7, r = cr.t * 50; c.fillStyle = '#c98a4b'; c.fillRect((cr.x + 0.5) * T + Math.cos(a) * r - 3, TOP + (cr.y + 0.5) * T + Math.sin(a) * r - 3 + cr.t * cr.t * 60, 6, 6); } c.globalAlpha = 1; }
  // marcador
  const gr = c.createLinearGradient(0, 0, 0, TOP); gr.addColorStop(0, '#3b2d5c'); gr.addColorStop(1, '#2a1f45'); c.fillStyle = gr; c.fillRect(0, 0, W, TOP);
  if (PAIR) for (let i = 0; i < 2; i++) { const bx = 6 + i * (2 * 96 + 72); ART.rr(c, bx, 1.5, 2 * 92 + 4, 3.5, 1.8); c.fillStyle = pl[i * 2].col; c.fill(); }
  const cw = 92; pl.forEach((q, i) => { const x = 6 + i * (cw + 4) + (i >= 2 ? 72 : 0);
    ART.rr(c, x, 6, cw, 34, 10); c.fillStyle = q.alive ? 'rgba(26,21,48,.9)' : 'rgba(26,21,48,.45)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = q.col; c.stroke();
    label(fitName((PAIR ? (i < 2 ? 'A·' : 'B·') : '') + (q.name === 'Tú' ? 'TÚ' : q.name), cw - 34, k.party ? 18 : 13), x + 8, 17, k.party ? 18 : 13, q.alive ? q.col : '#8a82a6', 'left');
    for (let s = 0; s < RU.wins; s++) { c.fillStyle = s < q.wins ? '#ffd166' : 'rgba(255,255,255,.15)'; ART.glint(c, x + cw - 12 - s * 14, 17, 6, c.fillStyle); }
    if (GHOST && q.ghost) { label('FANTASMA', x + 6, 32, k.party ? 13 : 11, '#a097ff', 'left'); return; }
    if (UNICA) { const ut = hot && hot.car === q ? '¡LO LLEVAS!' : q.alive ? 'A SALVO' : 'FUERA';
      label(ut, x + 6, 32, fitSize(ut, cw - 12, k.party ? 13 : 11), hot && hot.car === q ? '#ffd166' : q.alive ? '#a8cf3f' : '#8a82a6', 'left'); return; }
    c.drawImage(itemIcon('r'), x + 6, 26, 12, 12); label('' + q.range, x + 24, 32, k.party ? 14 : 11, '#fff'); c.drawImage(itemIcon('b'), x + 34, 26, 12, 12); label('' + q.max, x + 52, 32, k.party ? 14 : 11, '#fff');
    if (PAINT) { ART.rr(c, x + 60, 26, 28, 12, 4); c.fillStyle = q.col; c.fill(); label(pct(i) + '%', x + 74, 32, k.party ? 13 : 10, '#fff'); }
    else { if (q.kick) c.drawImage(itemIcon('k'), x + 62, 26, 12, 12); if (q.spd > RU.speed + 0.1) c.drawImage(itemIcon('s'), x + 76, 26, 12, 12); } });
  const left = Math.max(0, RU.round - rT); label(sudden ? '¡YA!' : `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, 232, 23, 18, sudden ? '#ff5f7a' : left < 10 ? '#ffd166' : '#fff');
  if (msgT > 0 || endT) { const al = pl.filter((q) => q.alive);
    const m = endT && PAINT ? '¡Tiempo!' : endT && PAIR ? (al.length ? `¡Equipo ${team(al[0]) ? 'B' : 'A'}!` : '¡Nadie en pie!') : endT ? (al.length === 1 ? `¡${al[0].name === 'Tú' ? 'Aguantas' : al[0].name + ' aguanta'}!` : '¡Nadie en pie!') : msg;
    c.globalAlpha = endT ? 1 : Math.min(1, msgT * 2);
    const mz = fitSize(m, W - 64, 26), mw = Math.min(W - 16, c.measureText(m).width + 40), mh = mz + 26;
    ART.rr(c, W / 2 - mw / 2, TOP + RO * T / 2 - mh / 2, mw, mh, 14); c.fillStyle = 'rgba(26,21,48,.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffd166'; c.stroke(); label(m, W / 2, TOP + RO * T / 2, mz, '#fff'); c.globalAlpha = 1; }
  if (fast) { const ft = 'Te han eliminado · la ronda termina a toda prisa'; label(ft, W / 2, H - 14, fitSize(ft, W - 20, k.party ? 18 : 13), '#ffd166'); }
  if (k.st === 'play' && rT < 3 && !k.counting()) label('Ronda ' + round, W / 2, TOP + 22, 20, '#fff');
}
