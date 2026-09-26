/* teamball — deportes de equipo con balón físico, 1–4 humanos y CPU que rellena plazas.
 * Modos (CFG.mode): cenitales 'futbol' (2v2, pase A / tiro cargado B), 'hockey' (2v2 sobre patines, disco rápido),
 * 'coches' (2v2, saltar A / turbo B, balón gigante con altura), 'prisionero' (3v3, lanzar A / atrapar B);
 * laterales 'voley' (2v2, saque, tres toques como máximo) y 'cabezon' (1v1, cabezazos, chilenas y superdisparo).
 * Oleada 2: 'sala' (fútbol sala neón 2v2 + portero CPU, paredes que rebotan, porterías pequeñas, reloj de 5 min),
 * 'canasta' (baloncesto 2v2 a una canasta, a 21, tiros de 2 y de 3, tras rebote defensivo o robo hay que sacar el balón
 * Oleada 3: 'balonmano' (2v2 + portero CPU, partidos de 2 minutos; el área semicircular es zona prohibida para los jugadores
 * de campo, así que se tira desde fuera o se busca el hueco por la banda).
 * fuera de la línea de triple) y 'futbolin' (futbolín de 4 barras por equipo; con dos humanos en un equipo cada uno lleva
 * dos barras, si no, uno lleva las cuatro; A tira, B tira con efecto).
 * Cenitales: en vertical el campo se gira (ataca hacia arriba) y en horizontal va apaisado; la física es la misma.
 * Plazas: equipo 0 = J1 y J3, equipo 1 = J2 y J4 (en 1v1: J1 contra J2). CPU mejora con victorias (localStorage cpu:<id>). */
const MODE = CFG.mode || 'futbol', SIDE = MODE === 'voley' || MODE === 'cabezon', OUT = ART.OUT, TAU = 6.2832;
const TS = MODE === 'prisionero' || MODE === 'sala' || MODE === 'balonmano' ? 3 : MODE === 'cabezon' ? 1 : 2, DUR0 = CFG.time || 120;
const TIMED = MODE !== 'voley' && MODE !== 'canasta' && MODE !== 'futbolin'; // los demás van por puntos
const VERT = !SIDE && innerHeight > innerWidth * 1.08;
const FW = 600, FH = 340, HUD = 56;
const W = SIDE ? 640 : VERT ? FH + 40 : FW + 40, H = SIDE ? 400 : VERT ? FW + HUD + 24 : FH + HUD + 20, OX = 20, OY = HUD + (VERT ? 4 : 0);
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#16122a' }), c = k.ctx;
/* Dificultad seleccionable: en normal DUR = DUR0 y DC = 0 → partido y CPU idénticos a siempre. */
const DUR = Math.round(DUR0 * k.D.time), DC = k.D.cpu;
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
const lite = ART.lite, dark = ART.dark;
const TEAM = [{ col: '#ff6b4a', name: CFG.t0 || 'Rojos' }, { col: '#3f8cff', name: CFG.t1 || 'Azules' }];
const CPUK = 'cpu:' + CFG.id;
const lsGet = (key, d) => { try { const v = localStorage.getItem(key); return v == null ? d : +v; } catch (e) { return d; } };
const lsSet = (key, v) => { try { localStorage.setItem(key, v); } catch (e) {} };
const clamp = k.clamp, hyp = Math.hypot, lerp = (a, b, q) => a + (b - a) * q;
const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
let skill = 0.4, B = [], ball, balls, score, clock, golden, phase, phT, msg, msgT, t = 0, kickTeam = 0, cdPend, lastTouch = null;
let glow = [], goldT = 0, serveTeam = 0, serveIdx = [0, 0], touches = [0, 0], rounds = [0, 0], roundNo = 1;

/* ---------------- Utilidades de dibujo ---------------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = size / 4 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function mk(w, h, draw) { const r = Math.min(3, Math.max(2, Math.ceil((k.scale || 1) * Math.min(2, devicePixelRatio || 1)))), cv = document.createElement('canvas'); cv.width = w * r; cv.height = h * r; const q = cv.getContext('2d'); q.scale(r, r); q.lineJoin = 'round'; q.lineCap = 'round'; draw(q); return cv; }
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/* Mundo → pantalla (cenitales). En vertical: giro de −90° (el equipo 0 ataca hacia arriba). */
const V = (x, y) => (VERT ? [OX + y, OY + FW - x] : [OX + x, OY + y]);
const SA = (a) => (VERT ? a - Math.PI / 2 : a);
const worldT = (g) => { if (VERT) { g.translate(OX, OY + FW); g.rotate(-Math.PI / 2); } else g.translate(OX, OY); };
/* Joystick de pantalla → dirección en el mundo */
function inDir(p) { const d = k.pdir(p); if (!d.x && !d.y) return null; let x = d.x, y = d.y; if (!SIDE && VERT) [x, y] = [-y, x]; const m = hyp(x, y); return { x: x / m, y: y / m }; }

/* ---------------- Plazas, equipos y control ---------------- */
function slotOf(team, i) { return TS === 1 ? (team === 0 ? 0 : 1) : i < 2 ? team + i * 2 : -1; } // equipo 0: J1,J3 · equipo 1: J2,J4 · 3.º siempre CPU
function mkBodies() {
  B = [];
  for (let tm = 0; tm < 2; tm++) for (let i = 0; i < TS; i++) { const s = slotOf(tm, i); B.push({ team: tm, i, slot: s, ctl: s >= 0 && k.human(s) ? s : -1, x: 0, y: 0, vx: 0, vy: 0, a: tm ? Math.PI : 0, st: 0, cd: 0, chg: -1, anim: 0, gk: (MODE === 'sala' || MODE === 'balonmano') && i === 2, hair: ['#3a2a4a', '#8a4b2a', '#f2d15c', '#1a1530', '#c94f3a', '#5a3a2a'][(tm * 3 + i) % 6] }); }
}
function refreshCtl() { for (const b of B) b.ctl = b.slot >= 0 && k.human(b.slot) ? b.slot : -1; }
k.onParty = () => { if (k.st !== 'play') { reset(); return; } refreshCtl(); };
/* 1.28.1: con más de una CPU se numeran (CPU 1, CPU 2…) para no ver varios rótulos iguales. */
const nameOf = (b) => (b.ctl >= 0 ? (k.party ? 'J' + (b.ctl + 1) : 'TÚ') : B.filter((o) => o.ctl < 0).length > 1 ? 'CPU ' + (B.filter((o) => o.ctl < 0).indexOf(b) + 1) : 'CPU');
const humanTeam = () => { const h = B.filter((b) => b.ctl >= 0).map((b) => b.team); return h.length && h.every((x) => x === h[0]) ? h[0] : -1; };
const atk = (tm) => (tm === 0 ? 1 : -1); // sentido de ataque en x
/* Ventaja amable: un equipo solo de CPU que gana de 2 o más a un equipo con humanos afloja un poco (partidos igualados) */
function ease(b) { if (!score || B.some((o) => o.team === b.team && o.ctl >= 0) || !B.some((o) => o.team !== b.team && o.ctl >= 0)) return 1; const lead = score[b.team] - score[1 - b.team]; return lead >= 1 ? clamp(1 - 0.12 * lead, 0.5, 1) : 1; } // 1.23: afloja desde 1 gol de ventaja
const weakCpu = (b) => b.ctl < 0 && !B.some((o) => o.team === b.team && o.ctl >= 0); // 1.23: CPU rival (el compañero CPU de un humano juega como antes)

/* ---------------- Configuración por modo ---------------- */
const M = {
  futbol: { r: 11, br: 7, spd: 150, acc: 11, fr: 1.05, rest: 0.72, gw: 90, cut: 36, shot: [280, 620], pass: true },
  hockey: { r: 11, br: 6, spd: 190, acc: 3.2, fr: 0.4, rest: 0.9, gw: 76, cut: 64, shot: [300, 620], pass: true, skate: true },
  coches: { r: 16, br: 20, spd: 230, acc: 2, fr: 0.45, rest: 0.82, gw: 150, cut: 60, car: true },
  prisionero: { r: 11, br: 7, spd: 150, acc: 11, fr: 1.4, rest: 0.6, gw: 0, cut: 0 },
  sala: { r: 11, br: 7, spd: 152, acc: 11, fr: 0.6, rest: 0.96, gw: 66, cut: 34, shot: [290, 640], pass: true, neon: true },
  canasta: { r: 11, br: 8, spd: 150, acc: 11, fr: 1.3, rest: 0.6, gw: 0, cut: 0 },
  futbolin: { r: 8, br: 7, spd: 0, acc: 0, fr: 0.32, rest: 0.86, gw: 100, cut: 22 },
  balonmano: { r: 11, br: 7, spd: 158, acc: 12, fr: 1.7, rest: 0.55, gw: 74, cut: 26, shot: [330, 700], pass: true, area: 92 },
}[MODE] || {};
const GY0 = FH / 2 - (M.gw || 0) / 2, GY1 = FH / 2 + (M.gw || 0) / 2;
const SEG = [];
if (!SIDE) {
  const C = M.cut;
  SEG.push([C, 0, FW - C, 0], [C, FH, FW - C, FH]);
  if (M.gw) SEG.push([0, C, 0, GY0], [0, GY1, 0, FH - C], [FW, C, FW, GY0], [FW, GY1, FW, FH - C]); else SEG.push([0, C, 0, FH - C], [FW, C, FW, FH - C]);
  if (C) SEG.push([0, C, C, 0], [FW - C, 0, FW, C], [0, FH - C, C, FH], [FW - C, FH, FW, FH - C]);
}
function segHit(o, r, s, e) {
  const [ax, ay, bx, by] = s, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, q = clamp(((o.x - ax) * dx + (o.y - ay) * dy) / L, 0, 1);
  const px = ax + dx * q, py = ay + dy * q, ex = o.x - px, ey = o.y - py, d = hyp(ex, ey);
  if (d >= r || d === 0) return false;
  const nx = ex / d, ny = ey / d; o.x = px + nx * r; o.y = py + ny * r; const vn = o.vx * nx + o.vy * ny;
  if (vn < 0) { o.vx -= (1 + e) * vn * nx; o.vy -= (1 + e) * vn * ny; } return true;
}
function walls(o, r, e) { let hit = false; for (const s of SEG) if (segHit(o, r, s, e)) hit = true; for (const py of M.gw ? [GY0, GY1] : []) for (const px of [0, FW]) { const d = hyp(o.x - px, o.y - py); if (d < r + 3 && d > 0) { const nx = (o.x - px) / d, ny = (o.y - py) / d; o.x = px + nx * (r + 3); o.y = py + ny * (r + 3); const vn = o.vx * nx + o.vy * ny; if (vn < 0) { o.vx -= (1 + e) * vn * nx; o.vy -= (1 + e) * vn * ny; } hit = true; } } return hit; }
function keepIn(b) { // jugadores dentro del campo (y de su zona en balón prisionero)
  const r = M.r; let x0 = r, x1 = FW - r;
  if (MODE === 'prisionero') { const z = zoneOf(b); x0 = z[0] + r; x1 = z[1] - r; }
  b.x = clamp(b.x, x0, x1); b.y = clamp(b.y, r, FH - r);
  if (M.area) { const R = M.area; // balonmano: el área es zona prohibida para los de campo y casa del portero
    if (b.gk) { const g0 = goalX(1 - b.team), dx = b.x - g0, dy = b.y - FH / 2, d = hyp(dx, dy) || 1;
      if (d > R - r) { b.x = g0 + dx / d * (R - r); b.y = FH / 2 + dy / d * (R - r); b.vx *= 0.4; b.vy *= 0.4; } }
    else for (const g0 of [0, FW]) { const dx = b.x - g0, dy = b.y - FH / 2, d = hyp(dx, dy) || 1;
      if (d < R + r) { b.x = g0 + dx / d * (R + r); b.y = FH / 2 + dy / d * (R + r); } }
    b.x = clamp(b.x, r, FW - r); b.y = clamp(b.y, r, FH - r); }
  if (M.cut) walls(b, r, 0.1);
}

/* ---------------- Arranque de partido / saques ---------------- */
function reset() {
  skill = clamp(clamp(0.2 + lsGet(CPUK, 0) * 0.04, 0.2, 0.85) + DC * 0.09, 0.08, 0.95); // 1.23: más fácil (subida 0.08→0.04 por victoria, tope 0.92→0.85)
  mkBodies(); score = [0, 0]; clock = DUR; golden = false; msg = ''; msgT = 0; rounds = [0, 0]; roundNo = 1; lastTouch = null;
  serveTeam = 0; serveIdx = [0, 0]; touches = [0, 0];
  kickTeam = Math.random() < 0.5 ? 0 : 1; kickoff(); cdPend = true;
}
function kickoff() {
  phase = 'kick'; phT = 1.1; lastTouch = null;
  if (MODE === 'voley') return voleyServe();
  if (MODE === 'cabezon') { B.forEach((b) => Object.assign(b, { x: b.team ? 470 : 170, y: GROUND, vx: 0, vy: 0, st: 0, kick: 0, sup: b.sup || 0 })); ball = { x: 320, y: 150, vx: (kickTeam ? 1 : -1) * 40, vy: 0, r: 13, spin: 0, fire: 0 }; return; }
  if (MODE === 'prisionero') {
    B.forEach((b) => { b.jail = false; b.hold = null; b.inv = 3; b.catchT = 0; b.cd = 0; b.st = 0; const z = zoneOf(b); b.x = (z[0] + z[1]) / 2 + atk(b.team) * -40; b.y = FH * (b.i + 1) / (TS + 1); b.vx = b.vy = 0; b.a = b.team ? Math.PI : 0; });
    balls = [0, 1, 2].map((i) => ({ x: FW / 2, y: FH * (i + 1) / 4, vx: 0, vy: 0, r: M.br, live: false, hold: null, thr: null, spin: 0 }));
    return;
  }
  if (MODE === 'canasta') return hoopInbound();
  if (MODE === 'futbolin') return foosServe();
  const P0 = MODE === 'coches' ? [[0.14, 0.5], [0.3, 0.25]] : [[0.3, 0.36], [0.16, 0.66], [0.035, 0.5]];
  B.forEach((b) => { const P = P0[b.i] || P0[0], s = atk(b.team); let x = FW / 2 - s * (FW / 2 - P[0] * FW), y = FH * (b.team ? 1 - P[1] : P[1]);
    if (b.team === kickTeam && b.i === 0) { x = FW / 2 - s * (MODE === 'coches' ? 150 : 28); y = FH / 2; }
    Object.assign(b, { x, y, vx: 0, vy: 0, a: b.team ? Math.PI : 0, st: 0, cd: 0, chg: -1, sp: 0, z: 0, vz: 0, boost: b.boost == null ? 1 : Math.max(0.5, b.boost), slide: 0 }); });
  ball = { x: FW / 2, y: FH / 2, vx: 0, vy: 0, z: MODE === 'coches' ? 60 : 0, vz: 0, r: M.br, own: null, spin: 0, nt: null, ntT: 0 };
}
function goal(team, how) {
  score[team]++; phase = 'goal'; phT = 2; lastTouch = null; kickTeam = 1 - team;
  const [sx, sy] = SIDE ? [ball.x, ball.y] : V(ball.x, ball.y);
  msg = golden ? '¡Gol de oro!' : how || '¡GOL!'; msgT = 2; k.sfx('win'); k.shake(8); k.flash('rgba(255,255,255,.35)');
  k.confetti(TEAM[team].col, 90); k.burst(sx, sy, TEAM[team].col, 40, 280);
  if (golden) phT = 1.4;
}
function finish() {
  phase = 'end'; const d = score[0] - score[1], wt = d > 0 ? 0 : 1, ht = humanTeam();
  if (d === 0) { k.sfx('tick'); return k.win('¡Empate!', '#ffd166', `${TEAM[0].name} ${score[0]} – ${score[1]} ${TEAM[1].name}<br>Nadie marcó en la prórroga<br>Toca para la revancha`, 0); }
  if (!k.party && ht >= 0) lsSet(CPUK, Math.max(0, lsGet(CPUK, 0) + (wt === ht ? 1 : -0.5)));
  const unit = MODE === 'prisionero' ? 'rondas' : MODE === 'voley' || MODE === 'canasta' ? 'puntos' : 'goles';
  const who = B.filter((b) => b.team === wt).map((b) => `<b style="color:${b.ctl >= 0 ? k.pcol(b.ctl) : '#d8d0f0'}">${nameOf(b)}</b>`).join(' y ');
  const head = ht === wt && !k.party ? '¡Victoria!' : ht === 1 - wt && !k.party ? 'Derrota' : `¡Ganan los ${TEAM[wt].name}!`;
  k.win(head, TEAM[wt].col, `${TEAM[0].name} ${score[0]} – ${score[1]} ${TEAM[1].name} (${unit})<br>${who}<br>Toca para la revancha`, Math.max(0, d * (ht === 1 ? -1 : 1)));
}

/* =====================================================================================
 *  CENITALES: fútbol, hockey, coches y balón prisionero
 * ===================================================================================== */
const goalX = (tm) => (tm === 0 ? FW : 0); // portería que ataca el equipo tm
function nearestMate(b) { return B.filter((o) => o !== b && o.team === b.team && (MODE !== 'prisionero' || !o.jail)).sort((p, q) => hyp(p.x - b.x, p.y - b.y) + (p.gk ? 220 : 0) - hyp(q.x - b.x, q.y - b.y) - (q.gk ? 220 : 0))[0]; }
function release(b, vx, vy) { ball.own = null; ball.vx = vx; ball.vy = vy; ball.nt = b; ball.ntT = 0.22; lastTouch = b; }
function doPass(b, to) {
  if (!to) return; const lx = to.x + to.vx * 0.35, ly = to.y + to.vy * 0.35, d = hyp(lx - ball.x, ly - ball.y) || 1, sp = clamp(d * 1.7 + 130, 230, 520);
  release(b, (lx - ball.x) / d * sp, (ly - ball.y) / d * sp); to.recv = 0.8; k.sfx('pop');
}
function doShot(b, dir, power) {
  const gx = goalX(b.team), gy = FH / 2; let ax = dir ? dir.x : Math.cos(b.a), ay = dir ? dir.y : Math.sin(b.a);
  const tx = gx - ball.x, ty = gy - ball.y, td = hyp(tx, ty) || 1;
  if ((ax * tx + ay * ty) / td > Math.cos(0.7)) { // ayuda de puntería: hacia un palo del lado al que apuntas
    const side = (ay - ty / td) >= 0 ? 1 : -1, py = gy + side * M.gw * 0.3 + (b.ctl < 0 ? k.rnd(-1, 1) * (1 - skill) * M.gw * (weakCpu(b) ? 0.7 * (3 - 2 * ease(b)) : 0.5) : 0), px = gx, pd = hyp(px - ball.x, py - ball.y) || 1;
    ax = lerp(ax, (px - ball.x) / pd, 0.7); ay = lerp(ay, (py - ball.y) / pd, 0.7); const m = hyp(ax, ay); ax /= m; ay /= m; }
  const sp = lerp(M.shot[0], M.shot[1], power); release(b, ax * sp, ay * sp); k.sfx(power > 0.7 ? 'shoot' : 'hit'); if (power > 0.8) { k.shake(4); k.float('¡Cañonazo!', ...V(ball.x, ball.y - 14), '#ffd166'); }
}
function tackle(b) { if (b.cd > 0 || b.st > 0) return; b.slide = 0.28; b.cd = 1; const sp = MODE === 'hockey' ? 330 : 300; b.vx = Math.cos(b.a) * sp; b.vy = Math.sin(b.a) * sp; k.sfx('jump'); }
function steal(from, by) {
  const a = Math.atan2(from.y - by.y, from.x - by.x) + k.rnd(-0.6, 0.6); ball.own = null; ball.vx = Math.cos(a) * 140 + by.vx * 0.4; ball.vy = Math.sin(a) * 140 + by.vy * 0.4; ball.nt = from; ball.ntT = 0.4;
  from.st = 0.6; k.sfx('hit'); k.shake(3); const [sx, sy] = V(from.x, from.y); k.burst(sx, sy, '#fff', 10, 120); k.float('¡Robo!', sx, sy - 20, TEAM[by.team].col);
}

/* ---------- IA fútbol / hockey ---------- */
function lineClear(b, gx) { // ¿hay hueco? ningún rival cerca de la línea de tiro hacia alguno de los palos
  return [GY0 + 14, FH / 2, GY1 - 14].some((gy) => { const dx = gx - b.x, dy = gy - b.y, L = dx * dx + dy * dy || 1;
    return B.every((o) => { if (o.team === b.team) return true; const q = clamp(((o.x - b.x) * dx + (o.y - b.y) * dy) / L, 0, 1); return hyp(b.x + dx * q - o.x, b.y + dy * q - o.y) > M.r + 16; }); });
}
function aiField(b, dt) {
  const own = ball.own, mate = nearestMate(b), sp = M.spd * (weakCpu(b) ? 0.72 + 0.28 * skill : 0.8 + 0.2 * skill) * ease(b), gx = goalX(b.team), s = atk(b.team);
  let tx = b.x, ty = b.y, run = 1;
  b.think = (b.think || 0) - dt;
  if (b.gk) { // sala: portero CPU que no sale de su área salvo balón suelto cerca
    const og = goalX(1 - b.team), inA = Math.abs(ball.x - og) < 95 && Math.abs(ball.y - FH / 2) < 90;
    if (own === b) { b.holdT = (b.holdT || 0) + dt; if (b.holdT > 0.7) { const m = B.filter((o) => o.team === b.team && o !== b).sort((p, q) => (q.x - p.x) * s)[0]; doPass(b, m); b.holdT = 0; } tx = og + s * 40; ty = FH / 2; }
    else { b.holdT = 0; if (!own && inA && hyp(ball.vx, ball.vy) < 260) { tx = ball.x; ty = ball.y; } else { tx = og + s * 20; ty = clamp(lerp(FH / 2, ball.y + ball.vy * 0.15, 0.7), GY0 - 6, GY1 + 6); } }
    const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy); return d > 4 ? { x: dx / d * Math.min(1, d / 24), y: dy / d * Math.min(1, d / 24), sp } : null;
  }
  if (own === b) {
    const dg = hyp(gx - b.x, FH / 2 - b.y), foe = B.filter((o) => o.team !== b.team).sort((p, q) => hyp(p.x - b.x, p.y - b.y) - hyp(q.x - b.x, q.y - b.y))[0];
    const foeAhead = foe && hyp(foe.x - b.x, foe.y - b.y) < 70 && (foe.x - b.x) * s > -5;
    if (b.chg >= 0) { b.chg += dt; if (b.chg >= b.chgT) { doShot(b, null, clamp(b.chg / 0.8, 0.35, 1)); b.chg = -1; } }
    else if (b.passReq > 0 && mate) { doPass(b, mate); b.passReq = 0; }
    else if (dg < (MODE === 'hockey' ? 210 : 200) && Math.abs(b.y - FH / 2) < 150 && b.think <= 0 && (lineClear(b, gx) || dg < 60 || Math.random() < 0.08) && Math.random() < (weakCpu(b) ? (ease(b) ** 2 * 1.1 - 0.1) * (0.6 + 0.4 * skill) : ease(b) * 1.1 - 0.1)) { b.chg = 0; b.chgT = lerp(0.2, 0.55, dg / 260) + k.rnd(0, 0.15); b.a = Math.atan2(FH / 2 - b.y, gx - b.x); }
    else if (foeAhead && mate && b.think <= 0 && (mate.x - b.x) * s > -40 && !B.some((o) => o.team !== b.team && hyp(o.x - mate.x, o.y - mate.y) < 45) && Math.random() < 0.5 + skill * 0.4) { doPass(b, mate); }
    else { tx = gx; ty = FH / 2 + (b.y < FH / 2 ? -30 : 30); if (foeAhead) ty = b.y + (foe.y > b.y ? -90 : 90); }
    if (b.think <= 0) b.think = lerp(0.5, 0.15, skill);
  } else {
    const mates = B.filter((o) => o.team === b.team), chaser = mates.sort((p, q) => hyp(p.x - ball.x, p.y - ball.y) - hyp(q.x - ball.x, q.y - ball.y))[0];
    const teamHas = own && own.team === b.team;
    const hMate = MODE !== 'prisionero' && B.some((o) => o !== b && o.team === b.team && o.ctl >= 0), og0 = goalX(1 - b.team);
    if (hMate && own !== b && !(chaser === b && Math.abs(ball.x - og0) < FW * 0.4) && !(teamHas && Math.abs(own.x - og0) < FW * 0.35)) { // con compañero humano: la CPU cubre atrás
      tx = teamHas ? lerp(og0, ball.x, 0.45) : og0 + s * (26 + 0.14 * Math.abs(ball.x - og0)); ty = teamHas ? (ball.y < FH / 2 ? FH * 0.65 : FH * 0.35) : clamp(lerp(FH / 2, ball.y + ball.vy * 0.2, 0.65), GY0 - 12, GY1 + 12); run = 1; }
    else if (teamHas) { // apoyo: por delante si el poseedor está en su campo; si ataca, se queda de cierre algo retrasado y abierto
      const og = goalX(1 - b.team), adv = (own.x - og) * s; tx = adv < FW * 0.5 ? clamp(own.x + s * 130, 40, FW - 40) : clamp(own.x - s * (90 - 40 * skill), 40, FW - 40); ty = own.y < FH / 2 ? FH * 0.7 : FH * 0.3; run = 0.85; }
    else if (chaser === b || b.recv > 0 || (chaser.ctl >= 0 && hyp(b.x - ball.x, b.y - ball.y) < 60)) {
      const lead = own ? 0.15 : clamp(hyp(ball.vx, ball.vy) / 600, 0, 0.5); tx = ball.x + ball.vx * lead; ty = ball.y + ball.vy * lead;
      if (own && own.team !== b.team && hyp(own.x - b.x, own.y - b.y) < 42 && b.cd <= 0 && Math.random() < dt * (2 + skill * 6)) { b.a = Math.atan2(own.y - b.y, own.x - b.x); tackle(b); }
      if (!own) { tx -= s * 6; } // se coloca un poco por detrás para empujar hacia delante
    } else if (MODE === 'sala' || MODE === 'balonmano') { const og = goalX(1 - b.team); tx = lerp(og, ball.x, 0.55); ty = lerp(FH / 2, ball.y, 0.6); run = 0.9; } // sala: el portero ya cubre, el otro defiende a media distancia
    else { const og = goalX(1 - b.team); tx = og + s * (26 + 0.14 * Math.abs(ball.x - og)); ty = clamp(lerp(FH / 2, ball.y + ball.vy * 0.2, 0.65), GY0 - 12, GY1 + 12); run = 1; } // portero: entre balón y portería
  }
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy);
  return d > 6 ? { x: dx / d * Math.min(1, d / 30) * run, y: dy / d * Math.min(1, d / 30) * run, sp } : null;
}

/* ---------- Cuerpo a pie o sobre patines ---------- */
function moveWalker(b, dir, dt, spd) {
  if (b.st > 0) { b.st -= dt; b.vx *= 1 - 4 * dt; b.vy *= 1 - 4 * dt; }
  else if (b.slide > 0) { b.slide -= dt; }
  else if (M.skate) { const ax = dir ? dir.x * 560 : 0, ay = dir ? dir.y * 560 : 0; b.vx += ax * dt; b.vy += ay * dt; const v = hyp(b.vx, b.vy), mx = spd; if (v > mx) { b.vx *= mx / v; b.vy *= mx / v; } if (!dir) { b.vx *= 1 - 1.4 * dt; b.vy *= 1 - 1.4 * dt; } }
  else { const tx = dir ? dir.x * spd : 0, ty = dir ? dir.y * spd : 0, f = Math.min(1, M.acc * dt); b.vx += (tx - b.vx) * f; b.vy += (ty - b.vy) * f; }
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (dir && b.st <= 0 && b.slide <= 0) { const ta = Math.atan2(dir.y, dir.x); b.a += wrapA(ta - b.a) * Math.min(1, 12 * dt); }
  b.anim += hyp(b.vx, b.vy) * dt * 0.06;
  keepIn(b);
}
function separate() {
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const p = B[i], q = B[j]; if (MODE === 'prisionero' && p.team !== q.team) continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = hyp(dx, dy), m = M.r * 2 + (M.car ? 2 : 0);
    if (d < m && d > 0) { const o = (m - d) / 2, nx = dx / d, ny = dy / d; p.x -= nx * o; p.y -= ny * o; q.x += nx * o; q.y += ny * o;
      if (M.car) { const rel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny; if (rel > 60) { const hard = rel > 220; p.sp *= 0.5; q.sp = Math.max(q.sp, rel * 0.4); k.sfx(hard ? 'hit' : 'pop'); if (hard) { q.st = 0.5; q.spin = 8; k.shake(4); const [sx, sy] = V(q.x, q.y); k.float('¡Choque!', sx, sy - 22, '#ffd166'); } } } } }
}

/* ---------- Fútbol y hockey ---------- */
function stepField(dt) {
  for (const b of B) {
    b.recv = Math.max(0, (b.recv || 0) - dt); b.cd = Math.max(0, b.cd - dt); b.passReq = Math.max(0, (b.passReq || 0) - dt);
    let dir = null, spd = M.spd;
    if (b.ctl >= 0) {
      dir = inDir(b.ctl); const p = b.ctl;
      if (ball.own === b) {
        if (k.phit(p, 'a')) { if (TS > 1) doPass(b, nearestMate(b)); else doShot(b, dir, 0.3); }
        if (k.phit(p, 'b')) b.chg = 0;
        if (b.chg >= 0) { b.chg += dt; if (!k.pheld(p, 'b') || b.chg > 1.1) { doShot(b, dir, clamp(b.chg / 0.8, 0.2, 1)); b.chg = -1; } }
      } else {
        b.chg = -1;
        if (k.phit(p, 'b')) tackle(b);
        if (k.phit(p, 'a')) { const mate = nearestMate(b);
          if (mate && ball.own === mate && mate.ctl < 0) { mate.passReq = 0.6; k.float('¡Pásala!', ...V(b.x, b.y - 22), k.pcol(p)); }
          else if (mate && mate.ctl < 0 && !mate.gk && hyp(mate.x - ball.x, mate.y - ball.y) < hyp(b.x - ball.x, b.y - ball.y)) { mate.ctl = b.ctl; b.ctl = -1; k.sfx('click'); } }
      }
    } else { const r = aiField(b, dt); if (r) { dir = { x: r.x, y: r.y }; spd = r.sp; } }
    if (b.chg >= 0) spd *= 0.6; else if (ball.own === b) spd *= 0.86; // con el balón se corre algo menos
    moveWalker(b, dir && hyp(dir.x, dir.y) > 0.05 ? dir : null, dt, spd * (dir ? Math.min(1, hyp(dir.x, dir.y) + 0.2) : 1));
    if (dir && b.chg >= 0 && b.ctl >= 0) b.a = Math.atan2(dir.y, dir.x);
  }
  separate();
  // balón
  ball.ntT = Math.max(0, ball.ntT - dt); if (ball.ntT <= 0) ball.nt = null;
  if (ball.own) {
    const o = ball.own, fx = Math.cos(o.a), fy = Math.sin(o.a), d = M.r + ball.r + 1;
    ball.x += (o.x + fx * d - ball.x) * Math.min(1, 18 * dt); ball.y += (o.y + fy * d - ball.y) * Math.min(1, 18 * dt); ball.vx = o.vx; ball.vy = o.vy; ball.spin += hyp(o.vx, o.vy) * dt * 0.1;
    // robo por contacto: un rival encima y el poseedor casi parado
    for (const q of B) if (q.team !== o.team && q.st <= 0 && hyp(q.x - ball.x, q.y - ball.y) < M.r + ball.r - 1 && (q.slide > 0 || Math.random() < dt * 1.5)) { steal(o, q); break; }
    if (o.st > 0) { ball.own = null; }
  } else {
    ball.x += ball.vx * dt; ball.y += ball.vy * dt; const f = Math.max(0, 1 - M.fr * dt); ball.vx *= f; ball.vy *= f; ball.spin += hyp(ball.vx, ball.vy) * dt * 0.1;
    if (walls(ball, ball.r, M.rest) && hyp(ball.vx, ball.vy) > 120) { k.sfx('click'); if (M.neon) { glow.push({ x: ball.x, y: ball.y, t: 0.5 }); const [gx, gy] = V(ball.x, ball.y); k.burst(gx, gy, '#ff4fd8', 8, 140); } }
    const v = hyp(ball.vx, ball.vy);
    for (const q of B) { if (q === ball.nt || q.st > 0) continue; const dx = ball.x - q.x, dy = ball.y - q.y, d = hyp(dx, dy);
      const keeper = Math.abs(q.x - goalX(1 - q.team)) < 90 && q.y > GY0 - 30 && q.y < GY1 + 30, reach = M.r + ball.r + 3 + (keeper ? (weakCpu(q) ? 4 + 14 * skill : 18) : 0); // el que guarda la portería llega más lejos (estirada)
      if (d < reach) {
        const rel = hyp(ball.vx - q.vx, ball.vy - q.vy);
        if (keeper && d > M.r + ball.r + 3) { const [sx, sy] = V(q.x, q.y); k.float('¡Parada!', sx, sy - 20, TEAM[q.team].col); }
        if (rel < (MODE === 'hockey' ? 330 : 280) * (keeper ? (weakCpu(q) ? 1.15 + 0.45 * skill : 1.6) : 1) || q.slide > 0) { ball.own = q; q.chg = -1; lastTouch = q; if (q.recv > 0) q.recv = 0; k.sfx('click'); break; }
        const nx = dx / (d || 1), ny = dy / (d || 1), vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { ball.vx -= 1.6 * vn * nx; ball.vy -= 1.6 * vn * ny; ball.vx *= 0.6; ball.vy *= 0.6; } ball.x = q.x + nx * reach; ball.y = q.y + ny * reach; lastTouch = q; k.sfx('hit');
      } }
    if (v < 0.5) { ball.vx = ball.vy = 0; }
  }
  // gol
  if (ball.y > GY0 && ball.y < GY1 && (ball.x < -ball.r * 0.2 || ball.x > FW + ball.r * 0.2)) { ball.own = null; goal(ball.x < 0 ? 1 : 0); }
  else { ball.x = clamp(ball.x, -30, FW + 30); ball.y = clamp(ball.y, 2, FH - 2); }
}

/* ---------- Coches con balón ---------- */
function stepCars(dt) {
  for (const b of B) {
    let dir = null, turbo = false, jump = false;
    if (b.ctl >= 0) { dir = inDir(b.ctl); turbo = k.pheld(b.ctl, 'b'); jump = k.phit(b.ctl, 'a'); }
    else { const r = aiCar(b, dt); dir = r.dir; turbo = r.turbo; jump = r.jump; }
    if (b.st > 0) { b.st -= dt; b.a += (b.spin || 0) * dt; b.spin *= 1 - 3 * dt; dir = null; turbo = false; }
    const top = M.spd * (b.ctl < 0 ? (0.86 + 0.14 * skill) * ease(b) : 1);
    if (dir) { const ta = Math.atan2(dir.y, dir.x), df = wrapA(ta - b.a), turn = 3.6 - Math.min(1.4, Math.abs(b.sp) / 200); b.a += clamp(df, -turn * dt, turn * dt);
      const want = Math.abs(df) > 2.3 && b.sp < 80 ? -top * 0.45 : top * (Math.cos(df) > 0 ? 1 : 0.35); b.sp += (want - b.sp) * Math.min(1, M.acc * dt); }
    else b.sp *= 1 - 1.6 * dt;
    if (turbo && b.boost > 0.02 && b.st <= 0) { b.sp = Math.min(b.sp + 700 * dt, 380); b.boost = Math.max(0, b.boost - 0.55 * dt); b.fire = 0.1; } else b.boost = Math.min(1, b.boost + 0.1 * dt);
    b.fire = Math.max(0, (b.fire || 0) - dt);
    if (jump && b.z <= 0) { b.vz = 250; k.sfx('jump'); }
    b.vz -= 720 * dt; b.z = Math.max(0, b.z + b.vz * dt); if (b.z <= 0 && b.vz < 0) { if (b.vz < -150) k.sfx('click'); b.vz = 0; }
    b.vx = Math.cos(b.a) * b.sp; b.vy = Math.sin(b.a) * b.sp; b.x += b.vx * dt; b.y += b.vy * dt;
    const ox = b.x, oy = b.y; b.x = clamp(b.x, M.r, FW - M.r); b.y = clamp(b.y, M.r, FH - M.r); walls(b, M.r, 0);
    if (ox !== b.x || oy !== b.y) b.sp *= 0.7;
    b.anim += b.sp * dt;
  }
  separate();
  // balón gigante con altura
  const bl = ball; bl.vz -= 520 * dt; bl.z += bl.vz * dt; if (bl.z < 0) { bl.z = 0; if (bl.vz < -60) { bl.vz *= -0.62; k.sfx('click'); } else bl.vz = 0; }
  bl.x += bl.vx * dt; bl.y += bl.vy * dt; const f = Math.max(0, 1 - (bl.z > 1 ? 0.12 : M.fr) * dt); bl.vx *= f; bl.vy *= f; bl.spin += hyp(bl.vx, bl.vy) * dt * 0.05;
  if (bl.z > 70 && (bl.x < bl.r || bl.x > FW - bl.r)) { bl.x = clamp(bl.x, bl.r, FW - bl.r); bl.vx *= -M.rest; } // por encima del larguero rebota
  else if (walls(bl, bl.r, M.rest)) k.sfx('click');
  for (const b of B) { const dx = bl.x - b.x, dy = bl.y - b.y, d = hyp(dx, dy); if (d < bl.r + M.r && bl.z < b.z + 26) {
    const nx = dx / (d || 1), ny = dy / (d || 1), rel = (b.vx - bl.vx) * nx + (b.vy - bl.vy) * ny; bl.x = b.x + nx * (bl.r + M.r); bl.y = b.y + ny * (bl.r + M.r);
    if (rel > 0) { const imp = rel * 1.3 + 40; bl.vx += nx * imp; bl.vy += ny * imp; bl.vz += (b.z > 3 ? 230 : 40) + rel * 0.12; lastTouch = b; k.sfx(rel > 250 ? 'shoot' : 'hit'); if (rel > 250) { k.shake(4); k.burst(...V(bl.x, bl.y), '#fff', 12, 180); } } } }
  const sp = hyp(bl.vx, bl.vy); if (sp > 720) { bl.vx *= 720 / sp; bl.vy *= 720 / sp; }
  if (bl.y > GY0 && bl.y < GY1 && bl.z < 70 && (bl.x < -bl.r * 0.3 || bl.x > FW + bl.r * 0.3)) goal(bl.x < 0 ? 1 : 0, '¡GOLAZO!');
  else { bl.x = clamp(bl.x, -bl.r * 2, FW + bl.r * 2); bl.y = clamp(bl.y, bl.r, FH - bl.r); }
}
function aiCar(b, dt) {
  const bl = ball, gx = goalX(b.team), og = goalX(1 - b.team), s = atk(b.team);
  const mates = B.filter((o) => o.team === b.team), chaser = mates.sort((p, q) => hyp(p.x - bl.x, p.y - bl.y) - hyp(q.x - bl.x, q.y - bl.y))[0];
  const gdx = gx - bl.x, gdy = FH / 2 - bl.y, gd = hyp(gdx, gdy) || 1; let tx, ty, turbo = false, jump = false;
  if (chaser === b || (bl.x - og) * s < 150) {
    const behindX = bl.x - gdx / gd * (bl.r + 30), behindY = bl.y - gdy / gd * (bl.r + 30);
    const toB = hyp(bl.x - b.x, bl.y - b.y), align = ((bl.x - b.x) * gdx + (bl.y - b.y) * gdy) / (toB * gd || 1);
    if (align > 0.55) { tx = bl.x; ty = bl.y; turbo = align > 0.85 && toB < 240 && Math.random() < 0.3 + skill * 0.6; }
    else { tx = behindX; ty = behindY; if (hyp(tx - b.x, ty - b.y) > 40 && Math.abs((b.y - bl.y)) < bl.r + 18 && (b.x - bl.x) * s > 0) ty += (b.y < FH / 2 ? 1 : -1) * 60; }
    if (bl.z > 18 && toB < 60 && b.z <= 0 && Math.random() < 0.4 + skill * 0.5) jump = true;
  } else { tx = og + s * 45; ty = clamp(bl.y, GY0 + 10, GY1 - 10); if (hyp(bl.x - b.x, bl.y - b.y) < 110) { tx = bl.x; ty = bl.y; } }
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy);
  return { dir: d > 10 ? { x: dx / d, y: dy / d } : null, turbo, jump };
}

/* ---------- Balón prisionero ---------- */
function zoneOf(b) { const j = b.jail; return b.team === 0 ? (j ? [566, 600] : [34, 300]) : (j ? [0, 34] : [300, 566]); }
function inField(b) { return !b.jail; }
function throwBall(b, dir) {
  const bl = b.hold; if (!bl) return;
  const foes = B.filter((o) => o.team !== b.team && inField(o));
  let tgt = null;
  if (dir) { let best = 0.85; for (const o of foes) { const dx = o.x - b.x, dy = o.y - b.y, d = hyp(dx, dy) || 1, cs = (dx * dir.x + dy * dir.y) / d; if (cs > best) { best = cs; tgt = o; } } }
  else tgt = foes.sort((p, q) => hyp(p.x - b.x, p.y - b.y) - hyp(q.x - b.x, q.y - b.y))[0];
  const sp = b.ctl >= 0 ? 440 : 330 + 110 * skill; let ax, ay;
  if (tgt) { const d = hyp(tgt.x - b.x, tgt.y - b.y), tt = d / sp, lx = tgt.x + tgt.vx * tt * (b.ctl >= 0 ? 0.6 : skill * 0.9), ly = tgt.y + tgt.vy * tt * (b.ctl >= 0 ? 0.6 : skill * 0.9), dd = hyp(lx - b.x, ly - b.y) || 1; ax = (lx - b.x) / dd; ay = (ly - b.y) / dd;
    if (b.ctl < 0) { const e = k.rnd(-1, 1) * (1 - skill) * 0.28, ca = Math.cos(e), sa = Math.sin(e); [ax, ay] = [ax * ca - ay * sa, ax * sa + ay * ca]; } }
  else if (dir) { ax = dir.x; ay = dir.y; } else { ax = atk(b.team); ay = 0; }
  b.hold = null; bl.hold = null; bl.live = true; bl.thr = b; bl.x = b.x + ax * (M.r + bl.r + 2); bl.y = b.y + ay * (M.r + bl.r + 2); bl.vx = ax * sp; bl.vy = ay * sp; b.a = Math.atan2(ay, ax); b.cd = 0.5; k.sfx('shoot');
}
function aiDodge(b, dt) {
  b.think = (b.think || 0) - dt; const z = zoneOf(b), s = atk(b.team);
  if (b.think > 0 && b.goal) return b.goal.dir;
  b.think = lerp(0.35, 0.1, skill) + k.rnd(0, 0.1);
  let tx = b.x, ty = b.y; b.goal = { dir: null };
  // ¿viene un balón vivo hacia mí?
  for (const bl of balls) { if (!bl.live || !bl.thr || bl.thr.team === b.team || b.jail) continue;
    const rx = b.x - bl.x, ry = b.y - bl.y, vv = bl.vx * bl.vx + bl.vy * bl.vy || 1, tc = (rx * bl.vx + ry * bl.vy) / vv; if (tc < 0 || tc > 0.7) continue;
    const cx = bl.x + bl.vx * tc - b.x, cy = bl.y + bl.vy * tc - b.y; if (hyp(cx, cy) > M.r + bl.r + 10) continue;
    if (!b.hold && b.cd <= 0 && Math.random() < 0.15 + skill * 0.45) { b.catchT = 0.38; b.cd = 1; b.goal = { dir: null }; return null; }
    const px = -bl.vy, py = bl.vx, pm = hyp(px, py) || 1, side = (cx * px + cy * py) > 0 ? -1 : 1; b.goal = { dir: { x: px / pm * side, y: py / pm * side } }; b.think = 0.25; return b.goal.dir; }
  if (b.hold) {
    b.holdT = (b.holdT || 0) + 0.2;
    if (b.jail || b.holdT > lerp(1.4, 0.5, skill) + k.rnd(0, 0.4)) { throwBall(b, null); b.holdT = 0; return null; }
    tx = b.jail ? (z[0] + z[1]) / 2 : (s > 0 ? z[1] - 40 : z[0] + 40); ty = clamp(b.y + k.rnd(-60, 60), 30, FH - 30);
  } else {
    const free = balls.filter((bl) => !bl.hold && (!bl.live || hyp(bl.vx, bl.vy) < 150) && bl.x > z[0] - 4 && bl.x < z[1] + 4 && !B.some((o) => o !== b && o.team === b.team && o.chase === bl));
    const tgt = free.sort((p, q) => hyp(p.x - b.x, p.y - b.y) - hyp(q.x - b.x, q.y - b.y))[0]; b.chase = tgt || null;
    if (tgt) { tx = tgt.x; ty = tgt.y; }
    else if (b.jail) { tx = (z[0] + z[1]) / 2; ty = clamp(b.y + k.rnd(-80, 80), 30, FH - 30); }
    else { tx = s > 0 ? z[0] + 40 + k.rnd(0, 90) : z[1] - 40 - k.rnd(0, 90); ty = k.rnd(40, FH - 40); }
  }
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy); b.goal = { dir: d > 8 ? { x: dx / d, y: dy / d } : null }; return b.goal.dir;
}
function stepDodge(dt) {
  for (const b of B) {
    b.cd = Math.max(0, b.cd - dt); b.catchT = Math.max(0, b.catchT - dt); b.inv = Math.max(0, b.inv - dt);
    let dir = null;
    if (b.ctl >= 0) { dir = inDir(b.ctl); if (k.phit(b.ctl, 'a') && b.hold) throwBall(b, dir); if (k.phit(b.ctl, 'b') && b.cd <= 0 && !b.hold) { b.catchT = 0.4; b.cd = 0.9; k.sfx('click'); } }
    else dir = aiDodge(b, dt);
    moveWalker(b, dir, dt, M.spd * (b.ctl < 0 ? 0.82 + 0.18 * skill : 1) * (b.catchT > 0 ? 0.35 : 1));
    if (b.hold) { b.hold.x = b.x + Math.cos(b.a) * (M.r + 4); b.hold.y = b.y + Math.sin(b.a) * (M.r + 4); }
  }
  separate();
  for (const bl of balls) {
    if (bl.hold) continue;
    bl.x += bl.vx * dt; bl.y += bl.vy * dt; const f = Math.max(0, 1 - (bl.live ? 0.25 : M.fr) * dt); bl.vx *= f; bl.vy *= f; bl.spin += hyp(bl.vx, bl.vy) * dt * 0.1;
    bl.x = clamp(bl.x, bl.r, FW - bl.r); bl.y = clamp(bl.y, bl.r, FH - bl.r);
    if (bl.x <= bl.r || bl.x >= FW - bl.r) { bl.vx *= -0.6; if (bl.live) bl.live = false; } if (bl.y <= bl.r || bl.y >= FH - bl.r) { bl.vy *= -0.6; bl.live = bl.live && hyp(bl.vx, bl.vy) > 250; }
    if (bl.live && hyp(bl.vx, bl.vy) < 170) bl.live = false;
    for (const b of B) {
      const d = hyp(bl.x - b.x, bl.y - b.y); if (d > M.r + bl.r + 2) continue;
      if (bl.live && bl.thr && bl.thr.team !== b.team && inField(b)) {
        if (b.catchT > 0 && !b.hold) { b.hold = bl; bl.hold = b; bl.live = false; b.catchT = 0; b.holdT = 0; k.sfx('coin'); const [sx, sy] = V(b.x, b.y); k.float('¡Atrapada!', sx, sy - 22, '#7cf7a0'); k.burst(sx, sy, '#7cf7a0', 14, 150); break; }
        if (b.inv > 0) { bl.vx *= -0.3; bl.vy *= -0.3; bl.live = false; break; }
        // ¡eliminado! a la cárcel, detrás del equipo rival
        const [sx, sy] = V(b.x, b.y); k.sfx('hurt'); k.shake(5); k.burst(sx, sy, TEAM[b.team].col, 22, 220); k.float('¡Tocado!', sx, sy - 22, '#ff5f7a');
        b.jail = true; if (b.hold) { b.hold.hold = null; b.hold = null; } const z = zoneOf(b); b.x = (z[0] + z[1]) / 2; b.inv = 0.8;
        const th = bl.thr; if (th.jail) { th.jail = false; const z2 = zoneOf(th); th.x = th.team ? z2[1] - 30 : z2[0] + 30; th.inv = 1.5; k.float('¡Liberado!', ...V(th.x, th.y - 22), '#7cf7a0'); k.sfx('coin'); }
        bl.vx *= -0.25; bl.vy *= -0.25; bl.live = false; if (golden) { roundEnd(th.team); return; } break;
      }
      if (!bl.live && !b.hold && b.catchT <= 0 && hyp(bl.vx, bl.vy) < 220 && b.cd <= 0.3 && bl.x >= zoneOf(b)[0] - 3 && bl.x <= zoneOf(b)[1] + 3) { b.hold = bl; bl.hold = b; b.holdT = 0; bl.vx = bl.vy = 0; k.sfx('pop'); break; }
    }
  }
  for (let tm = 0; tm < 2; tm++) if (!B.some((b) => b.team === tm && inField(b))) { roundEnd(1 - tm); return; }
}
function roundEnd(tm) {
  score[tm]++; phase = 'goal'; phT = 2; golden = false; clock = Math.round((CFG.round || 60) * k.D.time); roundNo++;
  msg = `¡Ronda para los ${TEAM[tm].name}!`; msgT = 2; k.sfx('win'); k.confetti(TEAM[tm].col, 90); k.flash('rgba(255,255,255,.3)');
}

/* =====================================================================================
 *  CANASTA DE PATIO: media pista, una canasta, a 21 (tiros de 2 y de 3)
 * ===================================================================================== */
const HX = FW - 46, HY = FH / 2, R3 = 200, CHECK = [HX - 262, HY], PTS_B = CFG.pts || 21;
let poss = 0, needClear = false, shot = null, holdT = 0, swish = 0, ownT = 0, lastOwn = null;
const hoopD = (x, y) => hyp(x - HX, y - HY);
const isThree = (x, y) => (x > HX - 132 ? Math.abs(y - HY) > 150 : hoopD(x, y) > R3);
function hoopInbound() { // saque desde lo alto de la zona (ya fuera del triple: no hace falta sacarla)
  const off = kickTeam; poss = off; needClear = false; shot = null; holdT = 0; swish = 0;
  B.forEach((b) => { const o = b.team === off; let x, y;
    if (o) { x = b.i === 0 ? CHECK[0] : HX - 175; y = b.i === 0 ? HY : HY + 128; }
    else { x = b.i === 0 ? CHECK[0] + 46 : HX - 140; y = b.i === 0 ? HY : HY + 96; }
    Object.assign(b, { x, y, vx: 0, vy: 0, a: o ? 0 : Math.PI, st: 0, cd: 0, chg: -1, slide: 0, recv: 0, blk: 0, holdT: 0 }); });
  const h = B.find((b) => b.team === off && b.i === 0);
  ball = { x: h.x + 14, y: h.y, z: 10, vx: 0, vy: 0, vz: 0, r: M.br, own: h, spin: 0, nt: null, ntT: 0 };
}
function hoopPass(b, to) { if (!to) return; doPass(b, to); ball.z = 12; ball.vz = 110; }
function shootHoop(b, q) {
  b.chg = -1;
  if (needClear && b.team === poss) { k.float('¡Sácala del triple!', ...V(b.x, b.y - 26), '#ffd166'); k.sfx('click'); return; }
  const d = hoopD(ball.x, ball.y), lay = d < 62, three = !lay && isThree(b.x, b.y);
  const base = lay ? 0.88 : d < R3 ? lerp(0.78, 0.55, (d - 62) / (R3 - 62)) : lerp(0.47, 0.18, clamp((d - R3) / 220, 0, 1));
  const tm = lay ? 1 : 1 - clamp(Math.abs(q - 0.82) / 0.45, 0, 0.62);
  const dd = Math.min(...B.filter((o) => o.team !== b.team).map((o) => hyp(o.x - b.x, o.y - b.y))), con = dd < 30 ? 0.66 : dd < 55 ? 0.86 : 1;
  let p = base * tm * con; if (b.ctl < 0) p *= (weakCpu(b) ? 0.78 + 0.22 * skill : 0.9 + 0.1 * skill) * ease(b); else p = Math.min(0.95, p * 1.08);
  shot = { b, team: b.team, pts: three ? 3 : 2, make: Math.random() < p, t: 0, T: 0.42 + d / 720, x0: ball.x, y0: ball.y, h: 34 + d * 0.2, ox: k.rnd(-1, 1), blk: false };
  ball.own = null; lastTouch = b; b.cd = 0.4; holdT = 0; k.sfx('jump');
  if (!lay && tm > 0.93) k.float('¡Perfecto!', ...V(b.x, b.y - 26), '#7cf7a0'); else if (!lay && tm < 0.6) k.float(q > 0.82 ? 'Muy largo' : 'Muy corto', ...V(b.x, b.y - 26), '#ff9f5a');
}
function blockShot(by) {
  const sx = ball.x, sy = ball.y; shot = null; ball.vx = -k.rnd(120, 220); ball.vy = k.rnd(-140, 140); ball.z = 26; ball.vz = 60; ball.nt = by; ball.ntT = 0.15;
  k.sfx('hit'); k.shake(4); const [x, y] = V(sx, sy); k.float('¡Tapón!', x, y - 30, TEAM[by.team].col); k.burst(x, y, '#fff', 14, 180);
}
function aiHoop(b, dt) {
  const sp = M.spd * (weakCpu(b) ? 0.72 + 0.28 * skill : 0.8 + 0.2 * skill) * ease(b), mate = B.find((o) => o.team === b.team && o !== b), foes = B.filter((o) => o.team !== b.team);
  const near = (o) => Math.min(...foes.map((f) => hyp(f.x - o.x, f.y - o.y)));
  let tx = b.x, ty = b.y, run = 1; const own = ball.own; b.think = (b.think || 0) - dt;
  if (own === b) {
    if (b.chg >= 0) { b.chg += dt; if (b.chg >= b.chgT) shootHoop(b, clamp(b.chg / 0.8, 0, 1.3)); return null; }
    if (b.passReq > 0 && mate) { hoopPass(b, mate); b.passReq = 0; return null; }
    const d = hoopD(b.x, b.y), dd = near(b);
    if (needClear && poss === b.team) { tx = CHECK[0] + 6; ty = clamp(b.y, 70, FH - 70); }
    else {
      if (b.think <= 0) { b.think = lerp(0.5, 0.18, skill);
        const err = (1 - skill) * (weakCpu(b) ? 0.34 : 0.2);
        if (d < 62 || (dd > 46 && d < R3 + 34 && Math.random() < 0.28 + 0.4 * skill) || holdT > 5.5) { b.chg = 0; b.chgT = d < 62 ? 0.12 : 0.8 * (0.82 + k.rnd(-err, err)); b.a = Math.atan2(HY - b.y, HX - b.x); return null; }
        if (mate && dd < 38 && near(mate) > 50 && Math.random() < 0.35 + 0.3 * skill) { hoopPass(b, mate); return null; }
      }
      tx = HX - 40; ty = HY + (b.y < HY ? -34 : 34);
      const f = foes.slice().sort((p, q) => hyp(p.x - b.x, p.y - b.y) - hyp(q.x - b.x, q.y - b.y))[0];
      if (f && hyp(f.x - b.x, f.y - b.y) < 46 && f.x > b.x) ty = b.y + (f.y > b.y ? -80 : 80);
    }
  } else if (shot) { const off = shot.team === b.team; tx = HX - 46 - (off ? 26 : 0); ty = HY + (b.i ? 40 : -40); } // a por el rebote
  else if (!own) { const mine = B.filter((o) => o.team === b.team).sort((p, q) => hyp(p.x - ball.x, p.y - ball.y) - hyp(q.x - ball.x, q.y - ball.y))[0];
    if (mine === b || b.recv > 0) { tx = ball.x + ball.vx * 0.2; ty = ball.y + ball.vy * 0.2; } else { tx = HX - 120; ty = HY + (b.i ? 50 : -50); run = 0.8; } }
  else if (own.team === b.team) { run = 0.85;
    if (needClear) { tx = CHECK[0] + 20; ty = own.y < HY ? HY + 110 : HY - 110; }
    else if (hoopD(own.x, own.y) > R3 - 20) { tx = HX - 72; ty = own.y < HY ? HY + 62 : HY - 62; } // corta hacia el aro
    else { tx = HX - 178; ty = own.y < HY ? HY + 124 : HY - 124; } } // se abre al triple
  else { // defensa: el más cercano marca al del balón (entre él y el aro), el otro al compañero
    const dOwn = B.filter((o) => o.team === b.team).sort((p, q) => hyp(p.x - own.x, p.y - own.y) - hyp(q.x - own.x, q.y - own.y))[0];
    const man = dOwn === b ? own : B.find((o) => o.team !== b.team && o !== own), gap = man === own ? 26 : 42, dx = HX - man.x, dy = HY - man.y, dl = hyp(dx, dy) || 1;
    tx = man.x + dx / dl * gap; ty = man.y + dy / dl * gap;
    if (man === own && hyp(own.x - b.x, own.y - b.y) < 34 && b.cd <= 0 && Math.random() < dt * (0.25 + skill * 0.9) * (weakCpu(b) ? 0.7 : 1)) { b.a = Math.atan2(own.y - b.y, own.x - b.x); tackle(b); } }
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy);
  return d > 6 ? { x: dx / d * Math.min(1, d / 30) * run, y: dy / d * Math.min(1, d / 30) * run, sp } : null;
}
function stepHoop(dt) {
  const o0 = ball.own; if (o0 && o0.team === poss && needClear && isThree(o0.x, o0.y)) { needClear = false; k.float('¡Vale, a atacar!', ...V(o0.x, o0.y - 26), '#7cf7a0'); k.sfx('click'); }
  if (o0) holdT += dt;
  if (o0 !== lastOwn) { lastOwn = o0; ownT = 0; } else if (o0 && B.some((f) => f.team !== o0.team && hyp(f.x - o0.x, f.y - o0.y) < 44)) ownT += dt; // 5 s bien defendido sin pasar ni tirar
  if (o0 && ownT > 5 && o0.chg < 0) { kickTeam = 1 - o0.team; msg = '¡5 segundos! Balón para ' + TEAM[kickTeam].name; msgT = 1.8; k.sfx('tick'); kickoff(); return; }
  for (const b of B) {
    b.recv = Math.max(0, (b.recv || 0) - dt); b.cd = Math.max(0, b.cd - dt); b.passReq = Math.max(0, (b.passReq || 0) - dt); b.blk = Math.max(0, (b.blk || 0) - dt);
    let dir = null, spd = M.spd;
    if (b.ctl >= 0) { const p = b.ctl; dir = inDir(p);
      if (ball.own === b) {
        if (k.phit(p, 'a') && b.chg < 0) hoopPass(b, nearestMate(b));
        else { if (k.phit(p, 'b')) b.chg = 0; if (b.chg >= 0) { b.chg += dt; if (!k.pheld(p, 'b') || b.chg > 1.3) shootHoop(b, clamp(b.chg / 0.8, 0, 1.3)); } }
      } else { b.chg = -1;
        if (k.phit(p, 'b')) { if (shot && shot.team !== b.team) { b.blk = 0.3; k.sfx('jump'); } else tackle(b); }
        if (k.phit(p, 'a')) { const mate = nearestMate(b);
          if (mate && ball.own === mate && mate.ctl < 0) { mate.passReq = 0.6; k.float('¡Pásala!', ...V(b.x, b.y - 22), k.pcol(p)); }
          else if (mate && mate.ctl < 0 && hyp(mate.x - ball.x, mate.y - ball.y) < hyp(b.x - ball.x, b.y - ball.y)) { mate.ctl = b.ctl; b.ctl = -1; k.sfx('click'); } } }
    } else { const r = aiHoop(b, dt); if (r) { dir = { x: r.x, y: r.y }; spd = r.sp; } }
    if (b.chg >= 0) spd *= 0.4; else if (ball.own === b) spd *= 0.9;
    moveWalker(b, dir && hyp(dir.x, dir.y) > 0.05 ? dir : null, dt, spd * (dir ? Math.min(1, hyp(dir.x, dir.y) + 0.2) : 1));
    if (b.chg >= 0) b.a = Math.atan2(HY - b.y, HX - b.x);
  }
  separate();
  ball.ntT = Math.max(0, ball.ntT - dt); if (ball.ntT <= 0) ball.nt = null;
  if (shot) { // tiro en el aire
    shot.t += dt; const q = Math.min(1, shot.t / shot.T), tx = shot.make ? HX : HX - 6 + shot.ox * 10, ty = shot.make ? HY : HY + shot.ox * 12;
    ball.x = lerp(shot.x0, tx, q); ball.y = lerp(shot.y0, ty, q); ball.z = lerp(20, 34, q) + 4 * shot.h * q * (1 - q); ball.spin += dt * 8;
    if (shot.t < 0.26 && !shot.blk) for (const d of B) { if (d.team === shot.team || hyp(d.x - ball.x, d.y - ball.y) > 40) continue;
      if (d.ctl >= 0 ? d.blk > 0 : Math.random() < (0.1 + 0.22 * skill) * (weakCpu(d) ? 0.6 : 1)) { blockShot(d); return; } shot.blk = d.ctl < 0; }
    if (q >= 1) {
      if (shot.make) { const s = shot; score[s.team] += s.pts; phase = 'goal'; phT = 1.8; kickTeam = 1 - s.team; lastTouch = null; swish = 0.8;
        msg = s.pts === 3 ? '¡Triple! +3' : '¡Canasta! +2'; msgT = 1.8; k.sfx(s.pts === 3 ? 'win' : 'coin'); const [x, y] = V(HX, HY); k.burst(x, y, TEAM[s.team].col, 30, 220); k.shake(s.pts === 3 ? 6 : 3); if (s.pts === 3) k.confetti(TEAM[s.team].col, 60);
        shot = null; ball.vx = ball.vy = 0; ball.z = 30; return; }
      k.sfx('click'); const a = Math.PI + k.rnd(-1.15, 1.15), v = k.rnd(110, 230); ball.vx = Math.cos(a) * v; ball.vy = Math.sin(a) * v; ball.vz = 140; shot = null; // rebote en el aro
      const [x, y] = V(ball.x, ball.y); k.float('¡Aro!', x, y - 34, '#ff9f5a'); ball.nt = null;
    }
    return;
  }
  if (ball.own) {
    const o = ball.own, fx = Math.cos(o.a), fy = Math.sin(o.a), d = M.r + ball.r + 1;
    ball.x += (o.x + fx * d - ball.x) * Math.min(1, 18 * dt); ball.y += (o.y + fy * d - ball.y) * Math.min(1, 18 * dt); ball.vx = o.vx; ball.vy = o.vy; ball.z = 3 + Math.abs(Math.sin(t * 9)) * 11; ball.spin += hyp(o.vx, o.vy) * dt * 0.1;
    if (o.chg >= 0) ball.z = 18;
    for (const q of B) { if (!(q.slide > 0)) q.reach = 0; // manotazo: un solo intento por embestida (40 %; la CPU rival, menos) y roce suave
      if (q.team === o.team || q.st > 0 || hyp(q.x - ball.x, q.y - ball.y) >= M.r + ball.r - 1) continue;
      let ok = false; if (q.slide > 0) { if (!q.reach) { q.reach = 1; ok = Math.random() < (q.ctl >= 0 ? 0.4 : weakCpu(q) ? 0.22 + 0.12 * skill : 0.34); } } else ok = Math.random() < dt * 0.3;
      if (ok) { steal(o, q); ball.z = 10; break; } }
    if (o.st > 0) ball.own = null;
    return;
  }
  // balón suelto con bote
  ball.vz -= 700 * dt; ball.z += ball.vz * dt; if (ball.z < 0) { ball.z = 0; if (ball.vz < -70) { ball.vz = -ball.vz * 0.55; k.sfx('click'); } else ball.vz = 0; }
  ball.x += ball.vx * dt; ball.y += ball.vy * dt; const f = Math.max(0, 1 - (ball.z > 1 ? 0.25 : M.fr) * dt); ball.vx *= f; ball.vy *= f; ball.spin += hyp(ball.vx, ball.vy) * dt * 0.1;
  walls(ball, ball.r, M.rest);
  for (const q of B) { if (q === ball.nt || q.st > 0 || ball.z > 28) continue; if (hyp(ball.x - q.x, ball.y - q.y) < M.r + ball.r + 5) {
    ball.own = q; q.chg = -1; lastTouch = q; if (q.team !== poss) { poss = q.team; needClear = !isThree(q.x, q.y); if (needClear) k.float('¡Sácala del triple!', ...V(q.x, q.y - 26), '#ffd166'); } k.sfx('click'); break; } }
}

/* =====================================================================================
 *  FUTBOLÍN: 4 barras por equipo (portero 1, defensa 2, medios 5, delanteros 3)
 * ===================================================================================== */
const FOOS = [[46, 1], [112, 2], [252, 5], [420, 3]], MSP = { 1: 0, 2: 118, 3: 104, 5: 64 }, PTS_F = CFG.pts || 5;
let rods = [], deadT = 0;
function mkRods() { rods = []; for (let tm = 0; tm < 2; tm++) FOOS.forEach(([x, n], j) => { const half = (n - 1) / 2 * MSP[n]; rods.push({ team: tm, j, x: tm ? FW - x : x, n, sp: MSP[n], o: 0, v: 0, lim: n === 1 ? M.gw / 2 + 12 : FH / 2 - 16 - half, kick: 0, kicked: false, eff: false, cd: 0, ty: FH / 2, think: 0 }); }); }
const manY = (r, i) => FH / 2 + (i - (r.n - 1) / 2) * r.sp + r.o;
function rodCtl(r) { // quién mueve la barra: plaza del jugador o -1 (CPU)
  const b0 = B.find((b) => b.team === r.team && b.i === 0), b1 = B.find((b) => b.team === r.team && b.i === 1);
  if (b0.ctl >= 0 && b1.ctl >= 0) return r.j < 2 ? b0.ctl : b1.ctl;
  return b0.ctl >= 0 ? b0.ctl : b1.ctl;
}
function foosServe() { // saque por el agujero lateral hacia los medios del equipo que encajó
  if (!rods.length) mkRods(); for (const r of rods) { r.o = 0; r.v = 0; r.kick = 0; }
  ball = { x: FW / 2, y: 16, vx: kickTeam ? 46 : -46, vy: 150, r: M.br, spin: 0, curve: 0, z: 0 }; deadT = 0;
}
function kickZone(r, i) { const s = atk(r.team), my = manY(r, i); return ball.x > (s > 0 ? r.x - 9 : r.x - 27) && ball.x < (s > 0 ? r.x + 27 : r.x + 9) && Math.abs(ball.y - my) < 14; }
function kickRod(r, eff) { if (r.cd > 0) return; r.kick = 0.2; r.kicked = false; r.eff = eff; r.cd = 0.3; }
function aiRod(r, dt) {
  const bl = ball, bb = B.find((o) => o.team === r.team), weak = weakCpu(bb), ez = ease(bb); r.think -= dt;
  if (r.think <= 0) { r.think = lerp(0.3, 0.07, skill) * (weak ? 1.3 : 1);
    let ty = bl.y; if (Math.abs(bl.vx) > 25 && (r.x - bl.x) * bl.vx > 0) { const tt = Math.min(1.2, (r.x - bl.x) / bl.vx); ty = bl.y + bl.vy * tt; for (let i = 0; i < 3; i++) { if (ty < bl.r) ty = 2 * bl.r - ty; if (ty > FH - bl.r) ty = 2 * (FH - bl.r) - ty; } }
    r.ty = ty + k.rnd(-1, 1) * (1 - skill) * (weak ? 26 : 14); }
  let bo = r.o, bd = 1e9; for (let i = 0; i < r.n; i++) { const o = clamp(r.ty - (FH / 2 + (i - (r.n - 1) / 2) * r.sp), -r.lim, r.lim), d = Math.abs(FH / 2 + (i - (r.n - 1) / 2) * r.sp + o - r.ty) * 3 + Math.abs(o - r.o); if (d < bd) { bd = d; bo = o; } }
  if (r.cd <= 0) for (let i = 0; i < r.n; i++) if (kickZone(r, i) && Math.random() < dt * (5 + 10 * skill) * ez) { kickRod(r, Math.random() < 0.25); break; }
  const mx = (190 + 210 * skill) * ez * (weak ? 0.85 : 1); return clamp((bo - r.o) * 10, -mx, mx);
}
function stepFoos(dt) {
  for (const r of rods) {
    r.cd = Math.max(0, r.cd - dt); r.kick = Math.max(0, r.kick - dt); const p = rodCtl(r); let want;
    if (p >= 0) { const d = inDir(p); want = d ? d.y * 440 : 0; if (k.phit(p, 'a')) kickRod(r, false); else if (k.phit(p, 'b')) kickRod(r, true); }
    else want = aiRod(r, dt);
    r.v += (want - r.v) * Math.min(1, 18 * dt); const o0 = r.o; r.o = clamp(r.o + r.v * dt, -r.lim, r.lim); r.v = dt > 0 ? (r.o - o0) / dt : 0;
  }
  const bl = ball; bl.curve *= Math.max(0, 1 - 1.8 * dt); bl.vy += bl.curve * dt;
  bl.x += bl.vx * dt; bl.y += bl.vy * dt; const f = Math.max(0, 1 - M.fr * dt); bl.vx *= f; bl.vy *= f; bl.spin += hyp(bl.vx, bl.vy) * dt * 0.1;
  if (walls(bl, bl.r, M.rest)) { if (hyp(bl.vx, bl.vy) > 120) k.sfx('click'); bl.curve *= 0.3; }
  for (const r of rods) { const s = atk(r.team);
    for (let i = 0; i < r.n; i++) { const my = manY(r, i);
      if (r.kick > 0.03 && r.kick < 0.16 && !r.kicked && kickZone(r, i)) { r.kicked = true; // golpe: fuerte y recto (A) o con efecto (B)
        const pw = (r.eff ? 470 : 580) * (rodCtl(r) < 0 ? 0.85 + 0.15 * skill : 1);
        bl.vx = s * pw; bl.vy = r.v * 0.45 + (bl.y - my) * 11; bl.curve = r.eff ? -Math.sign(r.v || (bl.y - my) || 1) * 720 : 0; bl.x = s > 0 ? Math.max(bl.x, r.x + 9 + bl.r) : Math.min(bl.x, r.x - 9 - bl.r);
        k.sfx(r.eff ? 'shoot' : 'hit'); const [x, y] = V(bl.x, bl.y); k.burst(x, y, '#fff', 8, 140); if (r.eff) k.float('¡Efecto!', x, y - 16, '#ffd166'); lastTouch = r; continue; }
      const cx = clamp(bl.x, r.x - 7, r.x + 7), cy = clamp(bl.y, my - 10, my + 10), dx = bl.x - cx, dy = bl.y - cy, d = hyp(dx, dy); // choque con el muñeco
      if (d < bl.r) { let nx, ny; if (d > 0) { nx = dx / d; ny = dy / d; } else { nx = bl.vx > 0 ? -1 : 1; ny = 0; }
        bl.x = cx + nx * bl.r; bl.y = cy + ny * bl.r; const vn = bl.vx * nx + (bl.vy - r.v) * ny; if (vn < 0) { bl.vx -= 1.5 * vn * nx; bl.vy -= 1.5 * vn * ny; } if (Math.abs(ny) > 0.6) bl.vy += r.v * 0.4; bl.curve = 0; }
    } }
  const v = hyp(bl.vx, bl.vy); if (v > 820) { bl.vx *= 820 / v; bl.vy *= 820 / v; }
  if (v < 18) { deadT += dt; if (deadT > 2.4) { msg = 'Bola muerta: nuevo saque'; msgT = 1.4; k.sfx('tick'); phase = 'kick'; phT = 0.9; foosServe(); return; } } else deadT = 0;
  if (bl.y > GY0 && bl.y < GY1 && (bl.x < -bl.r * 0.3 || bl.x > FW + bl.r * 0.3)) goal(bl.x < 0 ? 1 : 0);
  else { bl.x = clamp(bl.x, -20, FW + 20); bl.y = clamp(bl.y, 2, FH - 2); }
}

/* =====================================================================================
 *  LATERALES: vóley playa y fútbol cabezón
 * ===================================================================================== */
const GROUND = 352, NET = 320, NET_TOP = 222, GRAV_V = 520;
/* ---------- Vóley ---------- */
function voleyServe() {
  phase = 'serve'; phT = 0; touches = [0, 0]; lastTouch = null;
  const srv = B.filter((b) => b.team === serveTeam)[serveIdx[serveTeam] % 2];
  B.forEach((b) => { const s = b.team ? 1 : -1, front = b !== srv && b.team === serveTeam ? true : b.i === 1; Object.assign(b, { x: NET + s * (b === srv ? 285 : front ? 70 : 200), y: GROUND, vx: 0, vy: 0, st: 0, air: false, spike: 0 }); });
  if (serveTeam !== srv.team) {} ball = { x: srv.x + (srv.team ? -12 : 12), y: GROUND - 70, vx: 0, vy: 0, r: 11, spin: 0, srv, held: true };
}
function ballistic(x0, y0, x1, apexY) {
  const y1 = GROUND - 44, ay = Math.min(apexY, y0 - 10, y1 - 10), vy = -Math.sqrt(2 * GRAV_V * (y0 - ay)), tu = -vy / GRAV_V, td = Math.sqrt(2 * (y1 - ay) / GRAV_V);
  return [(x1 - x0) / (tu + td), vy];
}
function landX(yLevel) { // dónde cruzará el balón la altura yLevel al bajar
  let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy; for (let i = 0; i < 300; i++) { vy += GRAV_V / 60; x += vx / 60; y += vy / 60; if (vy > 0 && y >= yLevel) return x; if (Math.abs(x - NET) < ball.r && y > NET_TOP) vx = -vx * 0.5; } return x;
}
function voleyHit(b, spike, over, aimX) {
  const s = b.team ? 1 : -1, other = -s; touches[b.team]++; touches[1 - b.team] = 0; lastTouch = b; ball.held = false;
  if (touches[b.team] > 3) return point(1 - b.team, '¡Cuatro toques!');
  const [bx, by] = [ball.x, ball.y], wasSpike = ball.spk; ball.spk = false;
  if (Math.random() < (wasSpike ? (b.ctl >= 0 ? 0.3 : 0.55 - 0.3 * skill) : b.ctl >= 0 ? 0 : 0.1 - 0.06 * skill)) { // recepción de un remate: a veces el balón sale rebotado sin control
    ball.vx = k.rnd(-1, 1) * 220 + s * 60; ball.vy = -k.rnd(180, 320); k.sfx('hit'); k.float('¡Uy!', bx, by - 20, '#fff'); return; }
  if (spike) { ball.spk = true; const tx = NET + other * (60 + Math.random() * 180) + (aimX || 0) * 60, T0 = Math.abs(tx - bx) / 600; let vy = (GROUND - 20 - by - 0.5 * GRAV_V * T0 * T0) / T0; ball.vx = (tx - bx) / T0; ball.vy = Math.max(vy, -80);
    for (let it = 0; it < 10; it++) { const tn = (NET - bx) / ball.vx; if (tn <= 0 || by + ball.vy * tn + 0.5 * GRAV_V * tn * tn < NET_TOP - ball.r - 6) break; ball.vy -= 45; ball.vx *= 0.94; } /* que pase por encima de la red */ k.sfx('shoot'); k.shake(5); k.float('¡Remate!', bx, by - 20, '#ffd166'); k.burst(bx, by, '#fff', 14, 200); return; }
  let tx, apex;
  if (over || touches[b.team] >= 3) { tx = NET + other * (70 + Math.random() * 200) + (aimX || 0) * 70; apex = NET_TOP - 90 - Math.random() * 40; }
  else if (touches[b.team] === 1) { tx = NET + s * 110; apex = NET_TOP - 110; }
  else { tx = NET + s * 48; apex = NET_TOP - 120; }
  if (b.ctl < 0) tx += k.rnd(-1, 1) * (1 - skill) * 40;
  [ball.vx, ball.vy] = ballistic(bx, by, tx, apex); k.sfx('pop');
}
function point(tm, why) {
  if (phase !== 'play') return; score[tm]++; phase = 'goal'; phT = 1.6; msg = why || `Punto ${TEAM[tm].name}`; msgT = 1.6; k.sfx(why ? 'hurt' : 'coin'); k.burst(ball.x, Math.min(ball.y, GROUND - 6), TEAM[tm].col, 24, 200);
  if (serveTeam !== tm) { serveTeam = tm; serveIdx[tm]++; }
}
const PTS = CFG.pts || 7;
function voleyWon() { const a = score[0], b = score[1]; return (Math.max(a, b) >= PTS && Math.abs(a - b) >= 2) || Math.max(a, b) >= PTS + 4; }
function stepVoley(dt) {
  const srvP = ball.srv;
  if (phase === 'serve') {
    phT += dt; ball.x = srvP.x + (srvP.team ? -12 : 12); ball.y = GROUND - 70 + Math.sin(phT * 5) * 3;
    const go = srvP.ctl >= 0 ? (k.phit(srvP.ctl, 'a') || k.phit(srvP.ctl, 'b') || phT > 4) : phT > 1 + (1 - skill) * 0.6;
    if (go) { phase = 'play'; const other = srvP.team ? -1 : 1, tx = NET + other * (90 + Math.random() * 170); [ball.vx, ball.vy] = ballistic(ball.x, ball.y, tx, NET_TOP - 100 - Math.random() * 30); ball.held = false; lastTouch = srvP; touches = [0, 0]; k.sfx('jump'); }
  }
  for (const b of B) {
    const s = b.team ? 1 : -1, x0 = b.team ? NET + 16 : 16, x1 = b.team ? W - 16 : NET - 16;
    let mv = 0, jump = false, dive = false;
    if (b.ctl >= 0) { const d = k.pdir(b.ctl); mv = d.x; jump = k.phit(b.ctl, 'a') || k.phit(b.ctl, 'up'); b.wantOver = k.pheld(b.ctl, 'b'); b.aim = d.x * -s; }
    else if (phase === 'play' || phase === 'serve') { const r = aiVoley(b, dt); mv = r.mv; jump = r.jump; b.wantOver = r.over; b.aim = 0; }
    const spd = b.ctl >= 0 ? 235 : (190 + 45 * skill) * ease(b);
    b.vx += (mv * spd - b.vx) * Math.min(1, (b.air ? 5 : 14) * dt);
    if (jump && !b.air && b !== (phase === 'serve' ? srvP : null)) { b.vy = -520; b.air = true; k.sfx('jump'); }
    b.vy += 1300 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y >= GROUND) { if (b.air) k.burst(b.x, GROUND, '#f3dca0', 6, 60); b.y = GROUND; b.vy = 0; b.air = false; }
    b.x = clamp(b.x, x0, x1); b.anim += Math.abs(b.vx) * dt * 0.05;
    if (phase === 'serve' && b === srvP) b.x = NET + s * 285;
  }
  if (phase !== 'play') return;
  const bl = ball; bl.vy += GRAV_V * dt; bl.x += bl.vx * dt; bl.y += bl.vy * dt; bl.spin += bl.vx * dt * 0.05;
  // red
  if (Math.abs(bl.x - NET) < bl.r + 3 && bl.y > NET_TOP) { const side = bl.x < NET ? -1 : 1; if (bl.vx * side < 0 || true) { bl.x = NET + side * (bl.r + 3); bl.vx = -bl.vx * 0.35 || side * 20; k.sfx('click'); } }
  else { const d = hyp(bl.x - NET, bl.y - NET_TOP); if (d < bl.r + 4) { const nx = (bl.x - NET) / d, ny = (bl.y - NET_TOP) / d, vn = bl.vx * nx + bl.vy * ny; if (vn < 0) { bl.vx -= 1.7 * vn * nx; bl.vy -= 1.7 * vn * ny; } bl.x = NET + nx * (bl.r + 4); bl.y = NET_TOP + ny * (bl.r + 4); k.sfx('click'); } }
  if (bl.y < 20 && bl.vy < 0) bl.vy *= -0.5;
  // toques
  for (const b of B) { if (b === lastTouch) continue; const hx = b.x, hy = b.y - 46, d = hyp(bl.x - hx, bl.y - hy);
    if (d < 22 + bl.r) { const spike = b.air && bl.y < NET_TOP + 30 && Math.abs(b.x - NET) < 150 && (b.ctl >= 0 ? true : b.spikeI); voleyHit(b, spike, b.wantOver, b.aim); break; } }
  // suelo / fuera
  if (bl.y >= GROUND - bl.r) { const inL = bl.x > 8 && bl.x < NET, inR = bl.x > NET && bl.x < W - 8;
    if (inL || inR) point(inL ? 1 : 0); else point(lastTouch ? 1 - lastTouch.team : 0, '¡Fuera!'); bl.y = GROUND - bl.r; bl.vy = -bl.vy * 0.4; bl.vx *= 0.5; }
  if (bl.x < -40 || bl.x > W + 40) point(lastTouch ? 1 - lastTouch.team : 0, '¡Fuera!');
}
function aiVoley(b, dt) {
  const s = b.team ? 1 : -1, mates = B.filter((o) => o.team === b.team), mate = mates.find((o) => o !== b);
  b.think = (b.think || 0) - dt;
  if (b.think <= 0) { b.think = lerp(0.3, 0.08, skill); const lx = landX(GROUND - 46); b.px = lx + k.rnd(-1, 1) * (1 - skill) * (ball.spk ? 70 : touches[1 - b.team] >= 3 ? 48 : 30); }
  const mySide = (x) => (b.team ? x > NET : x < NET);
  let tx = NET + s * (b.i ? 80 : 200), jump = false; b.spikeI = false;
  if (phase === 'play' && mySide(b.px)) {
    const cand = mates.filter((o) => o !== lastTouch).sort((p, q) => Math.abs(p.x - b.px) - Math.abs(q.x - b.px))[0];
    if (cand === b) { tx = b.px + s * 6;
      if (touches[b.team] === 2 && Math.abs(b.px - NET) < 140 && Math.random() < 0.35 + skill * 0.55) { b.spikeI = true; const tUp = 0.36; // salta para rematar
        const T = 0.3, py = ball.y + ball.vy * T + 0.5 * GRAV_V * T * T, pxx = ball.x + ball.vx * T; if (!b.air && py > NET_TOP - 34 && py < NET_TOP + 22 && ball.vy > -120 && Math.abs(pxx - b.x) < 40) jump = true; tx = b.px + s * 14; }
    } else tx = touches[b.team] === 0 ? NET + s * 60 : NET + s * 150;
  } else if (phase === 'play' && lastTouch && lastTouch.team === b.team) tx = NET + s * (b === lastTouch ? 170 : 80);
  const dx = tx - b.x; return { mv: Math.abs(dx) < 5 ? 0 : clamp(dx / 30, -1, 1), jump, over: touches[b.team] >= 2 };
}

/* ---------- Fútbol cabezón ---------- */
const CG = { x: 56, bar: 250 }; // portería: ancho y altura del larguero
function stepHead(dt) {
  const bl = ball;
  for (const b of B) {
    const s = atk(b.team); let mv = 0, jump = false, kick = false;
    if (b.ctl >= 0) { const d = k.pdir(b.ctl); mv = d.x; jump = k.phit(b.ctl, 'a') || k.phit(b.ctl, 'up'); kick = k.phit(b.ctl, 'b'); }
    else { const r = aiHead(b, dt); mv = r.mv; jump = r.jump; kick = r.kick; }
    if (b.st > 0) { b.st -= dt; mv = 0; jump = false; kick = false; }
    const spd = b.ctl >= 0 ? 250 : (205 + 45 * skill) * ease(b);
    b.vx += (mv * spd - b.vx) * Math.min(1, (b.y < GROUND ? 6 : 16) * dt);
    if (jump && b.y >= GROUND) { b.vy = -560; k.sfx('jump'); }
    b.vy += 1500 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y >= GROUND) { b.y = GROUND; b.vy = 0; }
    b.x = clamp(b.x, CG.x + 16, W - CG.x - 16); b.anim += Math.abs(b.vx) * dt * 0.05;
    b.kick = Math.max(0, (b.kick || 0) - dt); if (kick && b.kick <= 0) { b.kick = 0.24; b.kicked = false; }
    if (b.kick > 0.1 && !b.kicked) { const fx = b.x + s * 26, fy = b.y - 14, d = hyp(bl.x - fx, bl.y - fy);
      const over = b.y < GROUND - 20 && bl.y < b.y - 62 && Math.abs(bl.x - b.x) < 46;
      if (d < 20 + bl.r || over) { b.kicked = true; const sup = b.sup >= 1;
        if (sup) { bl.vx = s * 900; bl.vy = -60; bl.fire = 1.3; b.sup = 0; k.sfx('explode'); k.shake(8); k.float('¡Superdisparo!', bl.x, bl.y - 26, '#ff9f5a'); }
        else if (over) { bl.vx = s * 640; bl.vy = 160; k.sfx('shoot'); k.float('¡Chilena!', bl.x, bl.y - 26, '#ffd166'); k.shake(4); }
        else { bl.vx = s * k.rnd(320, 440) + b.vx * 0.3; bl.vy = -k.rnd(300, 440); k.sfx('hit'); }
        b.sup = Math.min(1, (b.sup || 0) + (sup ? 0 : 0.16)); lastTouch = b; k.burst(bl.x, bl.y, '#fff', 10, 150); } }
  }
  // choque entre jugadores
  if (B.length === 2) { const [p, q] = B, dx = q.x - p.x; if (Math.abs(dx) < 40 && Math.abs(p.y - q.y) < 60) { const o = (40 - Math.abs(dx)) / 2 * Math.sign(dx || 1); p.x -= o; q.x += o; } }
  // balón
  bl.fire = Math.max(0, bl.fire - dt); bl.vy += (bl.fire > 0 ? 200 : 900) * dt; bl.x += bl.vx * dt; bl.y += bl.vy * dt; bl.spin += bl.vx * dt * 0.05; bl.vx *= 1 - 0.15 * dt;
  if (bl.y > GROUND - bl.r) { bl.y = GROUND - bl.r; if (bl.vy > 80) k.sfx('click'); bl.vy = -bl.vy * 0.72; bl.vx *= 0.94; if (Math.abs(bl.vy) < 40) { bl.vy = 0; bl.vx *= 1 - 0.9 * dt; } }
  if (bl.y < 34 + bl.r) { bl.y = 34 + bl.r; bl.vy = Math.abs(bl.vy) * 0.8; }
  for (const side of [0, 1]) { // larguero y fondo por encima
    const gx0 = side ? W - CG.x : 0, gx1 = side ? W : CG.x;
    if (bl.x + bl.r > gx0 && bl.x - bl.r < gx1 && Math.abs(bl.y - CG.bar) < bl.r + 4) { bl.vy = bl.y < CG.bar ? -Math.abs(bl.vy) * 0.8 : Math.abs(bl.vy) * 0.8; bl.y = CG.bar + (bl.y < CG.bar ? -1 : 1) * (bl.r + 4); k.sfx('click'); }
    if (bl.y < CG.bar && ((side === 0 && bl.x - bl.r < 0) || (side === 1 && bl.x + bl.r > W))) { bl.vx = -bl.vx * 0.3; bl.vy *= 0.6; bl.x = side ? W - bl.r : bl.r; k.sfx('click'); } // la grada amortigua
  }
  for (const b of B) { // cabeza y cuerpo
    for (const [cx, cy, r, e] of [[b.x, b.y - 52, 26, 0.9], [b.x, b.y - 16, 16, 0.5]]) { const dx = bl.x - cx, dy = bl.y - cy, d = hyp(dx, dy);
      if (d < r + bl.r && d > 0) { const nx = dx / d, ny = dy / d, rel = (bl.vx - b.vx) * nx + (bl.vy - b.vy) * ny; bl.x = cx + nx * (r + bl.r); bl.y = cy + ny * (r + bl.r);
        if (rel < 0) { bl.vx -= (1 + e) * rel * nx; bl.vy -= (1 + e) * rel * ny; if (e > 0.8) { bl.vx += atk(b.team) * 60 + b.vx * 0.2; bl.vy += b.vy * 0.4 - 60; b.sup = Math.min(1, (b.sup || 0) + 0.06); k.sfx('pop'); } lastTouch = b; if (bl.vx * atk(b.team) < -240) bl.vx = -atk(b.team) * 240; } // rebote hacia la propia portería: suave
        if (bl.fire > 0 && lastTouch && lastTouch.team !== b.team) { b.st = 1; b.vx = atk(lastTouch.team) * 300; k.sfx('hurt'); k.float('¡Aturdido!', b.x, b.y - 90, '#ff9f5a'); bl.fire = 0; } } }
  }
  const sp = hyp(bl.vx, bl.vy); if (sp > 950) { bl.vx *= 950 / sp; bl.vy *= 950 / sp; }
  if (phase !== 'play') { if (bl.x < CG.x) bl.vx *= 1 - 4 * dt, bl.x = Math.max(bl.x, bl.r); } // celebración: el balón se queda en la red
  else if (bl.y > CG.bar + 4 && bl.x + bl.r < CG.x - 4) goal(1); else if (bl.y > CG.bar + 4 && bl.x - bl.r > W - CG.x + 4) goal(0);
  bl.x = clamp(bl.x, bl.r, W - bl.r);
}
function aiHead(b, dt) {
  const s = atk(b.team), bl = ball, ownG = b.team ? W - CG.x : CG.x; b.think = (b.think || 0) - dt;
  if (b.think <= 0) { b.think = lerp(0.28, 0.07, skill); b.tx = bl.x + bl.vx * 0.2 - s * 26; if ((bl.x - b.x) * s < -10) b.tx = bl.x - s * 40; // el balón a su espalda: vuelve
    if ((bl.x - ownG) * s < 150 && bl.vx * s < 0) b.tx = Math.min(Math.max(bl.x - s * 30, CG.x + 20), W - CG.x - 20);
    if (bl.vx * s < -170 && (b.x - ownG) * s > 40 && Math.random() < 0.5 + skill * 0.5) b.tx = ownG + s * 36; // disparo hacia mi portería: vuelvo a taparla
    const foe = B.find((o) => o.team !== b.team); // el rival llega antes al balón (y lo tiene de cara): me repliego a tapar la portería
    if (foe && Math.abs(foe.x - bl.x) + 10 < Math.abs(b.x - bl.x) && (bl.x - foe.x) * s < 10 && Math.random() < 0.45 + skill * 0.5) b.tx = lerp(ownG + s * 40, bl.x, 0.22);
    b.tx += k.rnd(-1, 1) * (1 - skill) * 20; }
  const dx = b.tx - b.x, mv = Math.abs(dx) < 6 ? 0 : clamp(dx / 24, -1, 1);
  const near = Math.abs(bl.x - b.x) < 70, jump = near && bl.y < b.y - 80 && bl.y > b.y - 200 && bl.vy > -100 && Math.random() < 0.3 + skill * 0.6;
  const kick = hyp(bl.x - (b.x + s * 26), bl.y - (b.y - 14)) < 34 + skill * 6 && Math.random() < 0.4 + skill * 0.5 || (b.y < GROUND - 30 && bl.y < b.y - 62 && Math.abs(bl.x - b.x) < 40 && Math.random() < skill * 0.5);
  return { mv, jump, kick };
}

/* =====================================================================================
 *  Bucle
 * ===================================================================================== */
reset(); k.show(CFG.title, CFG.help);
addEventListener('resize', () => { if (!SIDE && k.st !== 'play' && !k.party && (innerHeight > innerWidth * 1.08) !== VERT) location.reload(); });
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (cdPend) { cdPend = false; k.count(3); }
  t += dt; msgT = Math.max(0, msgT - dt);
  if (k.counting()) return;
  if (phase === 'end') return;
  if (phase === 'kick') { phT -= dt; if (phT <= 0) phase = 'play'; return; }
  if (phase === 'goal') {
    if (MODE === 'canasta') { ball.z = Math.max(0, ball.z - 70 * dt); swish = Math.max(0, swish - dt); }
    phT -= dt; if (MODE === 'voley' || MODE === 'cabezon') { if (MODE === 'voley') { ball.vy += GRAV_V * dt; ball.x += ball.vx * dt; ball.y = Math.min(GROUND - ball.r, ball.y + ball.vy * dt); ball.vx *= 1 - 3 * dt; } else stepHead(dt); }
    if (phT <= 0) {
      if (MODE === 'voley') { if (voleyWon()) return finish(); voleyServe(); return; }
      if (MODE === 'prisionero') { if (Math.max(...score) >= (CFG.wins || 2)) return finish(); kickoff(); return; }
      if (MODE === 'canasta' || MODE === 'futbolin') { if (Math.max(...score) >= (MODE === 'canasta' ? PTS_B : PTS_F)) return finish(); kickoff(); return; }
      if (golden || clock <= 0) return finish();
      kickoff();
    }
    return;
  }
  // reloj del partido (el vóley va por puntos)
  if (TIMED && phase === 'play') {
    clock -= dt;
    if (clock <= 0 && !golden) {
      if (MODE === 'prisionero') { const n = [0, 1].map((tm) => B.filter((b) => b.team === tm && inField(b)).length); if (n[0] !== n[1]) return roundEnd(n[0] > n[1] ? 0 : 1); golden = true; goldT = 0; msg = '¡Bola de oro! El próximo tocado decide'; msgT = 2.5; k.sfx('tick'); }
      else if (score[0] === score[1]) { golden = true; goldT = 0; msg = '¡Prórroga: gol de oro!'; msgT = 2.5; k.sfx('tick'); }
      else return finish();
    }
  }
  if (golden && phase === 'play' && (goldT += dt) > 60) { if (MODE !== 'prisionero') return finish(); golden = false; clock = Math.round((CFG.round || 60) * k.D.time); msg = 'Ronda nula'; msgT = 2; kickoff(); return; } // la prórroga no es eterna: a los 60 s, empate
  glow = glow.filter((g) => (g.t -= dt) > 0);
  if (MODE === 'futbol' || MODE === 'hockey' || MODE === 'sala' || MODE === 'balonmano') stepField(dt);
  else if (MODE === 'canasta') stepHoop(dt);
  else if (MODE === 'futbolin') stepFoos(dt);
  else if (MODE === 'coches') stepCars(dt);
  else if (MODE === 'prisionero') stepDodge(dt);
  else if (MODE === 'voley') stepVoley(dt);
  else stepHead(dt);
}, draw);

/* =====================================================================================
 *  Dibujo
 * ===================================================================================== */
let FIELD = null;
function courtArt() { // patio de colegio: asfalto, zona pintada, línea de triple y valla
  return mk(W, H, (g) => {
    g.fillStyle = '#1f1a33'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + rnd(i + 9) * 0.03})`; g.fillRect(rnd(i) * W, rnd(i + 50) * H, 10, 6); }
    g.save(); worldT(g);
    const gr = g.createLinearGradient(0, 0, FW, FH); gr.addColorStop(0, '#5b6680'); gr.addColorStop(1, '#4a546d'); g.fillStyle = gr; g.fillRect(0, 0, FW, FH);
    for (let i = 0; i < 500; i++) { g.fillStyle = rnd(i + 3) < 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)'; g.fillRect(rnd(i + 11) * FW, rnd(i + 77) * FH, 2, 2); }
    g.strokeStyle = 'rgba(30,25,50,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(140, 0); g.lineTo(170, 90); g.lineTo(150, 170); g.moveTo(420, FH); g.lineTo(400, 280); g.stroke(); // grietas
    g.fillStyle = '#c9603f'; g.fillRect(HX - 150, HY - 52, FW - HX + 150, 104);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(HX, HY, R3, 2.292, 3.991); g.lineTo(FW, HY - 150); g.lineTo(FW, HY + 150); g.closePath(); g.fill();
    g.strokeStyle = '#f5f1e6'; g.lineWidth = 3;
    g.strokeRect(HX - 150, HY - 52, FW - HX + 150, 104);
    g.beginPath(); g.arc(HX - 150, HY, 52, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(FW, HY - 150); g.lineTo(HX - 132, HY - 150); g.arc(HX, HY, R3, 3.991, 2.292, true); g.lineTo(FW, HY + 150); g.stroke();
    g.beginPath(); g.arc(0, HY, 52, -Math.PI / 2, Math.PI / 2); g.stroke();
    g.fillStyle = '#ffd166'; ART.rr(g, CHECK[0] - 5, HY - 5, 10, 10, 3); g.fill(); // punto de saque
    g.lineWidth = 9; g.strokeStyle = OUT; g.strokeRect(0, 0, FW, FH); g.lineWidth = 5; g.strokeStyle = '#9aa3b8'; g.strokeRect(0, 0, FW, FH);
    g.strokeStyle = 'rgba(200,210,230,.35)'; g.lineWidth = 1; for (let x = -FH; x < FW; x += 10) { g.beginPath(); g.moveTo(x, -8); g.lineTo(x + 8, 0); g.stroke(); } // malla de la valla
    // tablero y poste
    g.fillStyle = 'rgba(20,12,40,.25)'; g.fillRect(FW - 20, HY - 30, 26, 70);
    ART.rr(g, FW - 16, HY - 8, 22, 16, 4); ART.fillOut(g, '#3a3f58', 2.2);
    ART.rr(g, FW - 26, HY - 36, 8, 72, 3); ART.fillOut(g, '#ffffff', 2.4); g.fillStyle = '#ff6b4a'; g.fillRect(FW - 25, HY - 12, 6, 24);
    g.restore();
  });
}
function foosArt() { // futbolín de bar: mueble de madera, campo de fieltro y porterías
  return mk(W, H, (g) => {
    for (let y = 0; y < H; y += 22) { g.fillStyle = (y / 22) % 2 ? '#3b2a2e' : '#352529'; g.fillRect(0, y, W, 22); }
    g.save(); worldT(g);
    ART.shadow(g, FW / 2, FH + 22, FW / 2, 0.35);
    ART.rr(g, -18, -16, FW + 36, FH + 32, 14); const wd = g.createLinearGradient(0, -16, 0, FH + 16); wd.addColorStop(0, '#b77541'); wd.addColorStop(1, '#6e3f22'); g.fillStyle = wd; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = 'rgba(60,30,15,.35)'; g.lineWidth = 1.2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(-10 + rnd(i) * 40, -12 + i * 1.3); g.lineTo(FW - rnd(i + 5) * 40, -12 + i * 1.3); g.stroke(); }
    g.fillStyle = '#120d1c'; ART.rr(g, -16, GY0, 18, M.gw, 4); g.fill(); ART.rr(g, FW - 2, GY0, 18, M.gw, 4); g.fill();
    const C = M.cut; g.beginPath(); g.moveTo(C, 0); g.lineTo(FW - C, 0); g.lineTo(FW, C); g.lineTo(FW, FH - C); g.lineTo(FW - C, FH); g.lineTo(C, FH); g.lineTo(0, FH - C); g.lineTo(0, C); g.closePath();
    g.save(); g.clip(); for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#3f9a4f' : '#48a858'; g.fillRect(i * FW / 10, 0, FW / 10 + 1, FH); }
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 0, FW, 8); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(FW / 2, 0); g.lineTo(FW / 2, FH); g.stroke();
    g.beginPath(); g.arc(FW / 2, FH / 2, 40, 0, TAU); g.stroke(); g.strokeRect(0, GY0 - 22, 34, M.gw + 44); g.strokeRect(FW - 34, GY0 - 22, 34, M.gw + 44);
    g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); g.beginPath(); g.moveTo(C, 0); g.lineTo(FW - C, 0); g.lineTo(FW, C); g.lineTo(FW, GY0); g.moveTo(FW, GY1); g.lineTo(FW, FH - C); g.lineTo(FW - C, FH); g.lineTo(C, FH); g.lineTo(0, FH - C); g.lineTo(0, GY1); g.moveTo(0, GY0); g.lineTo(0, C); g.closePath(); g.stroke();
    for (const x of [0, FW]) for (const y of [GY0, GY1]) { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fillStyle = '#e8e4f0'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke(); }
    g.restore();
  });
}
function fieldArt() {
  if (MODE === 'canasta') return courtArt();
  if (MODE === 'futbolin') return foosArt();
  return mk(W, H, (g) => {
    g.fillStyle = '#1f1a33'; g.fillRect(0, 0, W, H);
    // entorno: adoquines de plaza (fútbol, prisionero), pista de barrio (hockey), arena de neón (coches)
    for (let i = 0; i < 220; i++) { const x = rnd(i) * W, y = rnd(i + 50) * H; g.fillStyle = `rgba(255,255,255,${0.02 + rnd(i + 9) * 0.03})`; g.fillRect(x, y, 10, 6); }
    g.save(); worldT(g);
    const C = M.cut, path = () => { g.beginPath(); if (C) { g.moveTo(C, 0); g.lineTo(FW - C, 0); g.lineTo(FW, C); g.lineTo(FW, FH - C); g.lineTo(FW - C, FH); g.lineTo(C, FH); g.lineTo(0, FH - C); g.lineTo(0, C); g.closePath(); } else g.rect(0, 0, FW, FH); };
    // redes de las porterías (fuera del campo)
    if (M.gw) for (const s of [0, 1]) { const x0 = s ? FW : -22; ART.rr(g, x0, GY0 - 4, 22, M.gw + 8, 5); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; for (let y = GY0; y < GY1; y += 8) { g.beginPath(); g.moveTo(x0 + 2, y); g.lineTo(x0 + 20, y); g.stroke(); } for (let x = 0; x < 22; x += 7) { g.beginPath(); g.moveTo(x0 + x, GY0); g.lineTo(x0 + x, GY1); g.stroke(); } }
    path(); g.save(); g.clip();
    if (MODE === 'futbol') { for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#47b358' : '#52c063'; g.fillRect(i * FW / 12, 0, FW / 12 + 1, FH); } }
    else if (MODE === 'sala') { g.fillStyle = '#18133a'; g.fillRect(0, 0, FW, FH); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? 'rgba(110,98,245,.10)' : 'rgba(110,98,245,.04)'; g.fillRect(i * FW / 8, 0, FW / 8 + 1, FH); }
      g.strokeStyle = 'rgba(92,225,230,.06)'; g.lineWidth = 1; for (let x = 0; x < FW; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, FH); g.stroke(); } for (let y = 0; y < FH; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(FW, y); g.stroke(); } }
    else if (MODE === 'balonmano') { const gr = g.createLinearGradient(0, 0, 0, FH); gr.addColorStop(0, '#3f78c9'); gr.addColorStop(1, '#2f5da6'); g.fillStyle = gr; g.fillRect(0, 0, FW, FH);
      for (let i = 0; i < FW; i += 26) { g.fillStyle = 'rgba(255,255,255,.045)'; g.fillRect(i, 0, 13, FH); }
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, FW, 10); g.fillRect(0, FH - 10, FW, 10); }
    else if (MODE === 'hockey') { const gr = g.createLinearGradient(0, 0, 0, FH); gr.addColorStop(0, '#dfe9f5'); gr.addColorStop(1, '#c4d4e8'); g.fillStyle = gr; g.fillRect(0, 0, FW, FH); for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.beginPath(); const x = rnd(i) * FW, y = rnd(i + 3) * FH; g.moveTo(x, y); g.lineTo(x + 30, y + 4); g.stroke(); } }
    else if (MODE === 'coches') { g.fillStyle = '#2b2d4a'; g.fillRect(0, 0, FW, FH); g.strokeStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < FW; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, FH); g.stroke(); } for (let y = 0; y < FH; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(FW, y); g.stroke(); } }
    else { for (let i = 0; i < 26; i++) { g.fillStyle = i % 2 ? '#d9a066' : '#cf955a'; g.fillRect(0, i * FH / 26, FW, FH / 26 + 1); } for (let i = 0; i < 26; i++) { g.strokeStyle = 'rgba(120,70,30,.25)'; g.beginPath(); const y = i * FH / 26, x = rnd(i) * FW; g.moveTo(x, y); g.lineTo(x, y + FH / 26); g.stroke(); }
      g.fillStyle = 'rgba(255,107,74,.28)'; g.fillRect(566, 0, 34, FH); g.fillStyle = 'rgba(63,140,255,.28)'; g.fillRect(0, 0, 34, FH);
      for (const x0 of [0, 566]) { g.strokeStyle = 'rgba(26,21,48,.25)'; g.lineWidth = 3; for (let y = -40; y < FH; y += 14) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 34, y + 34); g.stroke(); } } }
    g.restore();
    // líneas
    const LC = MODE === 'hockey' ? '#d94a5a' : MODE === 'coches' ? 'rgba(92,225,230,.7)' : MODE === 'sala' ? '#5ce1e6' : 'rgba(255,255,255,.85)';
    g.strokeStyle = LC; g.lineWidth = 3; if (M.neon) { g.shadowColor = LC; g.shadowBlur = 10; }
    g.beginPath(); g.moveTo(FW / 2, 0); g.lineTo(FW / 2, FH); g.stroke();
    if (MODE !== 'prisionero') { g.beginPath(); g.arc(FW / 2, FH / 2, 46, 0, TAU); g.stroke(); g.fillStyle = LC; g.beginPath(); g.arc(FW / 2, FH / 2, 4, 0, TAU); g.fill(); }
    if (MODE === 'futbol') { g.strokeStyle = 'rgba(255,255,255,.85)'; g.strokeRect(0, FH / 2 - 90, 70, 180); g.strokeRect(FW - 70, FH / 2 - 90, 70, 180); g.beginPath(); g.arc(70, FH / 2, 30, -1.2, 1.2); g.stroke(); g.beginPath(); g.arc(FW - 70, FH / 2, 30, Math.PI - 1.2, Math.PI + 1.2); g.stroke(); }
    if (MODE === 'hockey') { g.strokeStyle = '#3f6fd9'; g.lineWidth = 4; for (const x of [FW * 0.33, FW * 0.67]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, FH); g.stroke(); } g.strokeStyle = '#d94a5a'; g.lineWidth = 2; for (const [x, y] of [[110, 90], [110, 250], [490, 90], [490, 250]]) { g.beginPath(); g.arc(x, y, 30, 0, TAU); g.stroke(); } g.fillStyle = 'rgba(63,111,217,.3)'; g.beginPath(); g.arc(0, FH / 2, 50, -Math.PI / 2, Math.PI / 2); g.fill(); g.beginPath(); g.arc(FW, FH / 2, 50, Math.PI / 2, Math.PI * 1.5); g.fill(); }
    if (MODE === 'coches') { for (const [x, y] of [[80, 50], [80, 290], [520, 50], [520, 290], [300, 30], [300, 310]]) { g.fillStyle = 'rgba(255,209,102,.25)'; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,209,102,.6)'; g.lineWidth = 2; g.stroke(); } g.fillStyle = 'rgba(255,107,74,.15)'; g.fillRect(0, GY0, 60, M.gw); g.fillStyle = 'rgba(63,140,255,.15)'; g.fillRect(FW - 60, GY0, 60, M.gw); }
    if (MODE === 'balonmano') { g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.9)';
      for (const x of [0, FW]) { g.save(); g.beginPath(); g.arc(x, FH / 2, M.area, 0, TAU); g.clip(); g.fillStyle = 'rgba(255,209,102,.16)'; g.fillRect(x - M.area, FH / 2 - M.area, M.area * 2, M.area * 2); g.restore(); }
      for (const [x, a0] of [[0, -Math.PI / 2], [FW, Math.PI / 2]]) { g.beginPath(); g.arc(x, FH / 2, M.area, a0, a0 + Math.PI); g.stroke();
        g.setLineDash([9, 8]); g.beginPath(); g.arc(x, FH / 2, M.area + 40, a0, a0 + Math.PI); g.stroke(); g.setLineDash([]); }
      for (const x of [0, FW]) { const s = x ? -1 : 1; g.beginPath(); g.moveTo(x + s * 132, FH / 2 - 9); g.lineTo(x + s * 132, FH / 2 + 9); g.stroke(); } }
    if (MODE === 'sala') { g.strokeStyle = '#5ce1e6'; for (const [x, a0] of [[0, -Math.PI / 2], [FW, Math.PI / 2]]) { g.beginPath(); g.arc(x, FH / 2, 78, a0, a0 + Math.PI); g.stroke(); } g.fillStyle = '#5ce1e6'; for (const x of [70, FW - 70]) { g.beginPath(); g.arc(x, FH / 2, 3, 0, TAU); g.fill(); } }
    if (M.neon) { g.shadowBlur = 0; g.shadowColor = 'transparent'; }
    if (MODE === 'prisionero') { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; for (const x of [34, 566]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, FH); g.stroke(); } g.beginPath(); g.arc(FW / 2, FH / 2, 40, 0, TAU); g.stroke(); }
    // vallas
    path(); g.lineWidth = 9; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 5; g.strokeStyle = MODE === 'hockey' ? '#ffd166' : MODE === 'coches' ? '#5ce1e6' : MODE === 'futbol' || MODE === 'balonmano' ? '#f5f1e6' : MODE === 'sala' ? '#ff4fd8' : '#8a5a3b';
    if (M.neon) { g.shadowColor = '#ff4fd8'; g.shadowBlur = 14; } g.stroke(); g.shadowBlur = 0; g.shadowColor = 'transparent';
    if (M.gw) for (const x of [0, FW]) for (const y of [GY0, GY1]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); }
    g.restore();
  });
}
function sideArt() {
  return mk(W, H, (g) => {
    if (MODE === 'voley') {
      ART.background(g, ART.THEMES.jungle, W, H, 0, 70, 0);
      const sea = g.createLinearGradient(0, 270, 0, GROUND); sea.addColorStop(0, '#3fb6ea'); sea.addColorStop(1, '#8fe3f0'); g.fillStyle = sea; g.fillRect(0, 280, W, GROUND - 280);
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); const x = rnd(i) * W, y = 290 + rnd(i + 4) * 50; g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 22, y); g.stroke(); }
      const sand = g.createLinearGradient(0, GROUND - 10, 0, H); sand.addColorStop(0, '#f6dfa4'); sand.addColorStop(1, '#e0bd72'); g.fillStyle = sand; g.beginPath(); g.moveTo(0, GROUND - 6); g.quadraticCurveTo(W / 2, GROUND - 16, W, GROUND - 6); g.lineTo(W, H); g.lineTo(0, H); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
      for (let i = 0; i < 80; i++) { g.fillStyle = 'rgba(160,110,50,.3)'; g.fillRect(rnd(i + 20) * W, GROUND + rnd(i + 30) * 44, 2, 2); }
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(8, GROUND + 4); g.lineTo(W - 8, GROUND + 4); g.stroke();
      // red: poste + malla en ligera perspectiva
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(NET + 10, GROUND + 3, 26, 5, 0, 0, TAU); g.fill();
      const pole = g.createLinearGradient(NET - 5, 0, NET + 5, 0); pole.addColorStop(0, '#8a6a4a'); pole.addColorStop(1, '#4a3626');
      g.fillStyle = pole; ART.rr(g, NET - 5, NET_TOP - 14, 10, GROUND - NET_TOP + 18, 4); g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
      const NW = 16, ND = 74; g.save(); g.beginPath(); g.moveTo(NET - NW / 2, NET_TOP); g.lineTo(NET + NW / 2, NET_TOP - 6); g.lineTo(NET + NW / 2, NET_TOP + ND - 6); g.lineTo(NET - NW / 2, NET_TOP + ND); g.closePath();
      g.fillStyle = 'rgba(20,20,40,.28)'; g.fill(); g.clip(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1;
      for (let y = NET_TOP - 8; y < NET_TOP + ND + 8; y += 7) { g.beginPath(); g.moveTo(NET - NW / 2, y); g.lineTo(NET + NW / 2, y - 6); g.stroke(); }
      for (let x = NET - NW / 2; x <= NET + NW / 2; x += 4) { g.beginPath(); g.moveTo(x, NET_TOP - 10); g.lineTo(x, NET_TOP + ND + 4); g.stroke(); }
      g.restore(); g.lineWidth = 1.6; g.strokeStyle = OUT; g.beginPath(); g.moveTo(NET - NW / 2, NET_TOP); g.lineTo(NET + NW / 2, NET_TOP - 6); g.lineTo(NET + NW / 2, NET_TOP + ND - 6); g.lineTo(NET - NW / 2, NET_TOP + ND); g.closePath(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(NET - NW / 2 - 2, NET_TOP - 3); g.lineTo(NET + NW / 2 + 2, NET_TOP - 10); g.lineTo(NET + NW / 2 + 2, NET_TOP - 3); g.lineTo(NET - NW / 2 - 2, NET_TOP + 4); g.closePath(); g.fill(); g.lineWidth = 1.8; g.stroke();
      g.fillStyle = '#ff6b4a'; g.beginPath(); g.arc(NET, NET_TOP - 16, 4, 0, TAU); g.fill(); g.lineWidth = 1.5; g.stroke();
    } else {
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#20194a'); sky.addColorStop(1, '#5a3f8a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // grada con público
      for (let row = 0; row < 5; row++) { const y = 110 + row * 30; g.fillStyle = row % 2 ? '#3a2d66' : '#43357a'; g.fillRect(0, y, W, 30);
        for (let i = 0; i < 34; i++) { const x = i * 19 + (row % 2) * 9, cc = ['#ff6b4a', '#3f8cff', '#ffd166', '#f5f1e6', '#7cf7a0'][Math.floor(rnd(i * 7 + row) * 5)]; g.fillStyle = cc; g.beginPath(); g.arc(x + 8, y + 12, 7, 0, TAU); g.fill(); g.fillStyle = '#ffd9b5'; g.beginPath(); g.arc(x + 8, y + 3, 5, 0, TAU); g.fill(); } }
      for (const x of [60, 580]) { g.fillStyle = '#e0e4ff'; g.fillRect(x - 3, 20, 6, 90); g.fillStyle = '#fff6c8'; ART.rr(g, x - 26, 10, 52, 20, 5); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); }
      const gr = g.createLinearGradient(0, 260, 0, H); gr.addColorStop(0, '#4fbf5a'); gr.addColorStop(1, '#2f8f45'); g.fillStyle = gr; g.fillRect(0, 262, W, H - 262);
      for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)'; g.fillRect(i * W / 10, 262, W / 10, GROUND - 262); }
      g.fillStyle = '#f5f1e6'; g.fillRect(W / 2 - 1.5, 262, 3, GROUND - 262); g.fillRect(0, GROUND, W, 3);
      g.fillStyle = '#2a7d3d'; g.fillRect(0, GROUND + 3, W, H - GROUND);
      // porterías
      for (const s of [0, 1]) { const x0 = s ? W - CG.x : 0; g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x0, CG.bar, CG.x, GROUND - CG.bar);
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; for (let x = x0; x <= x0 + CG.x; x += 8) { g.beginPath(); g.moveTo(x, CG.bar); g.lineTo(x, GROUND); g.stroke(); } for (let y = CG.bar; y <= GROUND; y += 8) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + CG.x, y); g.stroke(); }
        g.fillStyle = '#fff'; ART.rr(g, x0 - 2, CG.bar - 5, CG.x + 4, 9, 3); g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke(); const px = s ? x0 : x0 + CG.x - 6; ART.rr(g, px, CG.bar, 6, GROUND - CG.bar, 2); g.fill(); g.stroke(); }
    }
  });
}
function drawBall(x, y, r, spin, kind, z) {
  if (z !== undefined) { ART.shadow(c, x, y + r * 0.5, r * (1 - Math.min(0.5, z / 250)), 0.3); y -= z; }
  c.save(); c.translate(x, y);
  if (kind === 'puck') { c.beginPath(); c.ellipse(0, 0, r + 1, r, 0, 0, TAU); c.fillStyle = '#23203a'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#000'; c.stroke(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-2, -2, r * 0.5, r * 0.3, 0, 0, TAU); c.fill(); c.restore(); return; }
  c.beginPath(); c.arc(0, 0, r, 0, TAU); const gr = c.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r); const base = kind === 'dodge' ? '#ff5f7a' : kind === 'voley' ? '#fff4b8' : kind === 'basket' ? '#ff8a3d' : '#ffffff';
  gr.addColorStop(0, kind === 'basket' ? '#ffc08a' : '#fff'); gr.addColorStop(1, dark(base, 0.12)); c.fillStyle = gr; c.fill(); c.save(); c.clip(); c.rotate(spin);
  if (kind === 'voley') { c.strokeStyle = '#3fb6ea'; c.lineWidth = r * 0.28; for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.beginPath(); c.arc(r * 0.9, 0, r * 0.9, 2.2, 4.1); c.stroke(); } }
  else if (kind === 'basket') { c.strokeStyle = OUT; c.lineWidth = Math.max(1.2, r * 0.12); c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke(); c.beginPath(); c.arc(-r * 1.25, 0, r * 0.95, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(r * 1.25, 0, r * 0.95, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); }
  else if (kind === 'dodge') { c.strokeStyle = '#ffd166'; c.lineWidth = r * 0.3; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke(); }
  else { c.fillStyle = kind === 'car' ? '#6e62f5' : '#1a1530'; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; c.beginPath(); c.arc(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.26, 0, TAU); c.fill(); } c.beginPath(); c.arc(0, 0, r * 0.3, 0, TAU); c.fill(); }
  c.restore(); c.lineWidth = Math.max(2, r * 0.14); c.strokeStyle = OUT; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.45, r * 0.3, r * 0.18, -0.5, 0, TAU); c.fill();
  c.restore();
}
function ringCol(b) { return b.ctl >= 0 ? k.pcol(b.ctl) : null; }
/* cenital en una sola pieza: pies, manos, tronco y cabeza se trazan juntos y se contornean de una
   pasada; el pelo y la piel se leen por color, no por contorno. Se cachea por color/pelo/paso. */
function walkerSpr(jc, hair, sw, team) {
  return PZ.spr(`W${jc}|${hair}|${sw}|${MODE}|${team}`, 56, 56, 28, 28, (g) => {
    const parts = [], skin = '#ffd9b5';
    for (const s of [-1, 1]) parts.push([PZ.blob(s * sw * 0.8 + 2, s * 6, 5, 3.4), dark(jc, 0.62)]);
    for (const s of [-1, 1]) parts.push([PZ.blob(-s * sw * 0.5 + 1, s * 11, 4, 4), skin]);
    parts.push([PZ.blob(0, 0, 9, 12), jc, 0, { dx: 2.2, dy: 2 }]);
    parts.push([PZ.blob(1, 0, 7.5, 7.5), MODE === 'hockey' ? lite(jc, 0.2) : hair]);
    if (MODE === 'hockey') parts.push([PZ.bone([[2, 8], [20, 10]], [2.6, 2.2]), '#c98a4b']);
    const sil = PZ.unite(g, parts, 1.5);
    PZ.in(g, sil, (q) => {
      q.beginPath(); q.arc(2.6, 0, 5.6, -1.45, 1.45); q.lineTo(0.4, 0); q.closePath(); q.fillStyle = skin; q.fill();
      q.fillStyle = dark(skin, 0.45); q.beginPath(); q.arc(6.2, -2.2, 1.1, 0, TAU); q.arc(6.2, 2.2, 1.1, 0, TAU); q.fill();
      if (MODE === 'hockey') { q.strokeStyle = 'rgba(255,255,255,.8)'; q.lineWidth = 1.2; q.beginPath(); q.moveTo(-5, 0); q.lineTo(5, 0); q.stroke(); }
      PZ.shine(q, -3.4, -6.4, 3.4, 1.9, -0.5, 0.3);
    });
  });
}
function drawWalker(b) { // cenital: cuerpo con camiseta del equipo, cabeza con pelo, brazos y pies que se mueven
  const [x, y] = V(b.x, b.y), a = SA(b.a), jc = TEAM[b.team].col, rc = ringCol(b), sw = Math.sin(b.anim * 3) * 5, jail = b.jail;
  c.save(); if (jail) c.globalAlpha = 0.75; if (b.inv > 0 && Math.floor(b.inv * 10) % 2) c.globalAlpha = 0.45;
  ART.shadow(c, x + 2, y + 8, 13, 0.28);
  if (rc) { c.beginPath(); c.ellipse(x, y + 3, 16, 11, 0, 0, TAU); c.lineWidth = 3.5; c.strokeStyle = rc; c.stroke(); }
  if (b.catchT > 0) { c.beginPath(); c.arc(x, y, 19, 0, TAU); c.lineWidth = 3; c.strokeStyle = '#7cf7a0'; c.stroke(); }
  PZ.put(c, walkerSpr(jc, b.hair, Math.round(sw), b.team), x, y, 1, a);
  c.restore();
  if (b.chg >= 0 && MODE === 'canasta') { const q = clamp(b.chg / 1.3, 0, 1), z0 = (0.82 - 0.14) * 0.8 / 1.3, z1 = (0.82 + 0.14) * 0.8 / 1.3; c.fillStyle = 'rgba(26,21,48,.85)'; ART.rr(c, x - 21, y + 15, 42, 8, 4); c.fill();
    c.fillStyle = 'rgba(124,247,160,.55)'; c.fillRect(x - 20 + 40 * z0, y + 16, 40 * (z1 - z0), 6); c.fillStyle = q >= z0 && q <= z1 ? '#7cf7a0' : q > z1 ? '#ff5f7a' : '#ffd166'; ART.rr(c, x - 20, y + 17, 40 * q, 4, 2); c.fill(); }
  else if (b.chg >= 0) { const q = clamp(b.chg / 0.8, 0, 1); c.fillStyle = 'rgba(26,21,48,.8)'; ART.rr(c, x - 16, y + 16, 32, 6, 3); c.fill(); c.fillStyle = q > 0.9 ? '#ff5f7a' : '#ffd166'; ART.rr(c, x - 15, y + 17, 30 * q, 4, 2); c.fill(); }
  label(nameOf(b), x, y - 22 - (k.party ? 3 : 0), k.party ? 18 : 12, rc || '#d8d0f0');
}
/* coche en una sola pieza: ruedas, carrocería y cabina trazadas juntas; la cabina se lee por color
   y sombra propia, no por contorno. Un sprite por color de equipo. */
function carSpr(jc) {
  return PZ.spr(`C${jc}`, 56, 34, 28, 17, (g) => {
    const parts = [];
    for (const [wx, wy] of [[-10, -11], [10, -11], [-10, 11], [10, 11]]) parts.push([PZ.box(wx - 5, wy - 3, 10, 6, 2.4), '#1a1530']);
    parts.push([PZ.box(-19, -10, 38, 20, 7), jc, 0, { dx: 2.4, dy: 2.2 }]);
    const sil = PZ.unite(g, parts, 1.5);
    PZ.in(g, sil, (q) => {
      q.fillStyle = dark('#9ad8ff', 0.3); q.beginPath(); PZ.box(-6, -7, 14, 14, 4)(q); q.fill();
      q.fillStyle = '#9ad8ff'; q.beginPath(); PZ.box(-7.6, -8.6, 14, 14, 4)(q); q.fill();
      q.fillStyle = 'rgba(255,255,255,.6)'; q.fillRect(-3, -5, 3, 10);
      q.fillStyle = '#fff'; q.fillRect(-18, -2, 10, 4);
      q.fillStyle = '#fff6c8'; q.fillRect(15, -8, 3, 4); q.fillRect(15, 4, 3, 4);
      PZ.shine(q, -2, -8, 8, 2.2, -0.08, 0.35);
    });
  });
}
function drawCar(b) {
  const [x, y] = V(b.x, b.y), a = SA(b.a), jc = TEAM[b.team].col, rc = ringCol(b), z = b.z;
  ART.shadow(c, x + 3, y + 8, 20 - Math.min(8, z / 8), 0.3);
  if (rc) { c.beginPath(); c.ellipse(x, y + 4, 24, 15, 0, 0, TAU); c.lineWidth = 3.5; c.strokeStyle = rc; c.stroke(); }
  c.save(); c.translate(x, y - z); c.rotate(a); const sc = 1 + z / 200; c.scale(sc, sc);
  if (b.fire > 0) { for (let i = 0; i < 3; i++) { c.fillStyle = ['#ffd166', '#ff9f5a', '#ff5f7a'][i]; c.beginPath(); c.ellipse(-22 - i * 5 - Math.random() * 4, 0, 8 - i * 2, 4 - i, 0, 0, TAU); c.fill(); } }
  PZ.put(c, carSpr(jc), 0, 0);
  c.restore();
  // turbo
  c.fillStyle = 'rgba(26,21,48,.8)'; ART.rr(c, x - 14, y + 16, 28, 5, 2.5); c.fill(); c.fillStyle = '#ffd166'; ART.rr(c, x - 13, y + 17, 26 * b.boost, 3, 1.5); c.fill();
  label(nameOf(b), x, y - 26 - z - (k.party ? 3 : 0), k.party ? 18 : 12, rc || '#d8d0f0');
}
/* jugador lateral en una sola pieza: piernas, tronco, brazos y cabeza-pelo trazados juntos y
   contorneados de una pasada. Se cachea por pose cuantizada (paso, chute, salto, brazos arriba). */
function sideSpr(big, jc, hair, s, sw, kick, air, up) {
  const by = big ? -30 : -44, bh = big ? 18 : 24, hr = big ? 26 : 12, hy = big ? -52 : -58, skin = '#ffd9b5';
  return PZ.spr(`S${big ? 1 : 0}|${jc}|${hair}|${s}|${sw}|${kick}|${air ? 1 : 0}|${up ? 1 : 0}`, 110, 130, 55, 108, (g) => {
    const parts = [];
    for (const i of [0, 1]) {
      const back = i === 1, hipx = back ? -4 * s : 4 * s, hipy = big ? -14 : -24;
      const lx = (back ? -5 : 5) * s + (air ? 0 : sw * 5 * (back ? -6 : 6) / 5), ang = !back && kick ? kick * 1.3 : 0;
      const len = big ? 12 : 22, ca = Math.cos(-ang * s), sa = Math.sin(-ang * s);
      const ex = lx - (back ? -4 : 4) * s, kx = hipx + (ex * ca - len * sa) * 0.55, ky = hipy + (ex * sa + len * ca) * 0.55;
      const fx = hipx + ex * ca - len * sa, fy = hipy + ex * sa + len * ca;
      const cl = back ? dark(skin, 0.24) : skin;
      parts.push([PZ.bone([[hipx, hipy], [kx, ky], [fx, fy]], [3.4, 2.9, 2.5]), cl]);
      parts.push([PZ.box(fx - 5 + s * 2, fy - 3, 11, 6, 3), big ? '#1a1530' : cl]);
    }
    if (!big) for (const sd of [-1, 1]) {
      const ax = sd * 8, ay = -40, bx = ax + (up ? sd * 4 : sd * 6), byy = up ? -64 : -22;
      parts.push([PZ.bone([[ax, ay], [(ax + bx) / 2, (ay + byy) / 2], [bx, byy]], [3.2, 2.7, 2.3]), sd === -s ? dark(skin, 0.24) : skin]);
    }
    parts.push([PZ.box(-11, by, 22, bh, 7), jc, 0, { dx: 2.4, dy: 2.2 }]);
    parts.push([PZ.blob(0, hy, hr, hr), skin, 0, { dx: hr * 0.2, dy: hr * 0.2, f: 0.65 }]);
    parts.push([(q) => { q.moveTo(-hr * 0.98, hy - hr * 0.1); q.arc(0, hy, hr * 0.99, Math.PI * 1.04, Math.PI * 1.96); q.lineTo(hr * 0.7 * -s, hy - hr * 0.2); q.closePath(); }, hair]);
    if (big) parts.push([PZ.box(-hr, hy - hr * 0.62, hr * 2, hr * 0.3, 3), lite(jc, 0.15)]);
    const sil = PZ.unite(g, parts, 1.5);
    PZ.in(g, sil, (q) => PZ.shine(q, -hr * 0.42, hy - hr * 0.42, hr * 0.3, hr * 0.17, -0.6, 0.32));
    const ex = s * hr * 0.35, ey = hy - (big ? 2 : 0);
    PZ.eyes(g, ex, ey, hr * 0.28, hr * 0.19, s, 0.1, { lidCol: skin, lid: 0.2, tilt: 0.1 });
    PZ.brows(g, ex, ey - hr * 0.34, hr * 0.28, hr * 0.26, hr * 0.03, dark(skin, 0.55), hr * 0.075);
    PZ.mouth(g, ex, hy + hr * 0.42, hr * 0.34, up || kick ? 1 : 0);
  });
}
function drawSidePlayer(b) { // lateral: cabezón (cabeza grande) o jugador de playa
  const big = MODE === 'cabezon', jc = TEAM[b.team].col, rc = ringCol(b), s = MODE === 'cabezon' ? atk(b.team) : b.team ? -1 : 1, x = b.x, y = b.y, sw = Math.sin(b.anim * 3), air = y < GROUND - 2;
  ART.shadow(c, x, GROUND + 4, 18 - Math.min(10, (GROUND - y) / 12), 0.3);
  if (rc) { c.beginPath(); c.ellipse(x, GROUND + 4, 24, 6, 0, 0, TAU); c.lineWidth = 3; c.strokeStyle = rc; c.stroke(); }
  const kick = big && b.kick > 0 ? Math.sin((1 - b.kick / 0.24) * Math.PI) : 0;
  const up = !big && (air || Math.abs(ball.x - x) < 50 && ball.y < y - 40);
  c.save(); c.translate(x, y); if (b.st > 0) c.rotate(Math.sin(t * 30) * 0.2);
  PZ.put(c, sideSpr(big, jc, b.hair, s, Math.round(sw * 4) / 4, Math.round(kick * 4) / 4, air, up), 0, 0);
  c.restore();
  label(nameOf(b), x, y + (big ? -92 : -84), k.party ? 18 : 13, rc || '#d8d0f0');
  if (big) { const q = b.sup || 0; c.fillStyle = 'rgba(26,21,48,.8)'; ART.rr(c, x - 22, y - 108, 44, 6, 3); c.fill(); c.fillStyle = q >= 1 ? (Math.floor(t * 8) % 2 ? '#ff5f7a' : '#ffd166') : '#ff9f5a'; ART.rr(c, x - 21, y - 107, 42 * q, 4, 2); c.fill(); }
}
function drawFoos() {
  c.save(); worldT(c);
  const bl = ball, v = hyp(bl.vx, bl.vy);
  if (v > 300) { c.globalAlpha = 0.3; c.strokeStyle = '#fff'; c.lineWidth = bl.r * 1.5; c.beginPath(); c.moveTo(bl.x - bl.vx * 0.04, bl.y - bl.vy * 0.04); c.lineTo(bl.x, bl.y); c.stroke(); c.globalAlpha = 1; }
  ART.shadow(c, bl.x + 2, bl.y + 3, bl.r, 0.3); drawBall(bl.x, bl.y, bl.r, bl.spin, 'ball');
  for (const r of rods) { const p = rodCtl(r), hc = p >= 0 ? k.pcol(p) : '#2a2438', hy = r.team ? -17 : FH + 5;
    c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 6.5; c.beginPath(); c.moveTo(r.x, -12); c.lineTo(r.x, FH + 12); c.stroke(); c.strokeStyle = '#c9cede'; c.lineWidth = 3.5; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(r.x - 0.8, -12); c.lineTo(r.x - 0.8, FH + 12); c.stroke();
    ART.rr(c, r.x - 5.5, hy, 11, 12, 4); ART.fillOut(c, hc, 2);
    const s = atk(r.team), sw = r.kick > 0 ? Math.sin((1 - r.kick / 0.2) * Math.PI) : 0, col = TEAM[r.team].col;
    for (let i = 0; i < r.n; i++) { const y = manY(r, i);
      c.save(); c.translate(r.x, y);
      if (sw > 0.05) { ART.rr(c, s > 0 ? 3 : -3 - 18 * sw, -3.5, 18 * sw, 7, 3); ART.fillOut(c, '#1a1530', 1.2); }
      ART.shadow(c, 3, 3, 9, 0.25);
      ART.rr(c, -6 + s * sw * 3, -11, 12, 22, 5); const gr = c.createLinearGradient(-6, -11, 6, 11); gr.addColorStop(0, lite(col, 0.3)); gr.addColorStop(1, dark(col, 0.25)); c.fillStyle = gr; c.fill(); c.lineWidth = 2; c.strokeStyle = p >= 0 ? k.pcol(p) : OUT; c.stroke();
      c.fillStyle = '#fff'; c.fillRect(-5 + s * sw * 3, -1.5, 10, 3);
      c.beginPath(); c.arc(s * (1 + sw * 4), 0, 5.2, 0, TAU); c.fillStyle = '#ffd9b5'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke();
      c.beginPath(); c.arc(s * (1 + sw * 4) - s * 1.6, 0, 5.2, Math.PI / 2 * (s > 0 ? 1 : -1), Math.PI / 2 * (s > 0 ? 3 : 1)); c.fillStyle = ['#3a2a4a', '#8a4b2a', '#f2d15c', '#c94f3a'][(i + r.j) % 4]; c.fill();
      c.restore(); } }
  c.restore();
  if (k.st === 'play' && t < 6) { const hs = []; for (const r of rods) { const p = rodCtl(r); if (p >= 0 && !hs.includes(p)) { hs.push(p); const [x, y] = V(r.x, r.team ? -30 : FH + 30); label(k.party ? 'J' + (p + 1) : 'TÚ', x, clamp(y, 60, H - 10), 12, k.pcol(p)); } } }
}
function drawCourt() {
  const list = B.slice().sort((p, q) => V(p.x, p.y)[1] - V(q.x, q.y)[1]), [bx, by] = V(ball.x, ball.y), [hx, hy] = V(HX, HY);
  const drawB = () => drawBall(bx, by, ball.r, ball.spin, 'basket', ball.z);
  if (ball.z < 26 && !shot) drawB();
  for (const b of list) drawWalker(b);
  // aro y red (por encima de los jugadores)
  c.beginPath(); c.arc(hx, hy - 30, 12, 0, TAU); c.strokeStyle = OUT; c.lineWidth = 6; c.stroke(); c.strokeStyle = '#ff6b4a'; c.lineWidth = 3.5; c.stroke();
  const sw = swish > 0 ? Math.sin(swish * 20) * 3 * swish : 0; c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(hx + Math.cos(a) * 11, hy - 30 + Math.sin(a) * 11); c.lineTo(hx + Math.cos(a) * 6 + sw, hy - 18 + Math.sin(a) * 4); c.stroke(); }
  if (ball.z >= 26 || shot) drawB();
  if (ball.own && needClear && ball.own.team === poss) { const [x, y] = V(CHECK[0], HY); c.globalAlpha = 0.5 + 0.4 * Math.sin(t * 8); c.strokeStyle = '#ffd166'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 16, 0, TAU); c.stroke(); c.globalAlpha = 1; }
}
function hud() {
  /* 1.28.1: el panel se ajusta al ancho real; en vertical el subtítulo baja a su propia línea y no pisa los escudos. */
  const PW = Math.min(300, W - 12), PX = W / 2 - PW / 2, BW = Math.max(56, Math.min(84, (PW - 108) / 2));
  const PH = 48, BY = 7, BH = 22; /* una sola disposición: los escudos arriba y el subtítulo debajo, siempre dentro de la franja de 56 px */
  const g = c.createLinearGradient(0, 0, 0, PH + 6); g.addColorStop(0, 'rgba(26,21,48,.95)'); g.addColorStop(1, 'rgba(26,21,48,.75)'); c.fillStyle = g; ART.rr(c, PX, 4, PW, PH, 12); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
  for (const tm of [0, 1]) { const x = W / 2 + (tm ? 1 : -1) * (PW / 2 - BW / 2 - 5); ART.rr(c, x - BW / 2, BY, BW, BH, 9); c.fillStyle = TEAM[tm].col; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    const nm = TEAM[tm].name.toUpperCase(); let fs = 15; c.font = `800 ${fs}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; const tw = c.measureText(nm).width; if (tw > BW - 12) fs = Math.max(9, fs * (BW - 12) / tw);
    label(nm, x, BY + BH / 2, fs, '#fff'); }
  label(`${score[0]} – ${score[1]}`, W / 2, BY + BH / 2, 20, '#fff');
  let sub; if (MODE === 'voley') sub = `a ${PTS} · saca ${TEAM[serveTeam].name.toLowerCase()}`; else if (MODE === 'canasta') sub = needClear && ball.own && ball.own.team === poss ? '¡sácala del triple!' : `a ${PTS_B} · atacan ${TEAM[poss].name.toLowerCase()}`; else if (MODE === 'futbolin') sub = `a ${PTS_F} goles`; else if (golden) sub = MODE === 'prisionero' ? 'bola de oro' : 'gol de oro'; else sub = `${MODE === 'prisionero' ? 'ronda ' + roundNo + ' · ' : ''}${Math.floor(Math.max(0, clock) / 60)}:${String(Math.floor(Math.max(0, clock) % 60)).padStart(2, '0')}`;
  label(sub, W / 2, 40, 13, golden || (MODE === 'canasta' && needClear && ball.own) ? '#ffd166' : '#d8d0f0');
  if (msgT > 0 || phase === 'serve') { const m = phase === 'serve' && msgT <= 0 ? (ball.srv.ctl >= 0 ? `Saca ${nameOf(ball.srv)}: pulsa A` : '') : msg; if (m) {
    c.globalAlpha = Math.min(1, (msgT || 1) * 2); c.font = '900 26px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; const mw = c.measureText(m).width + 40, my = SIDE ? 80 : H / 2 + (VERT ? -40 : 0);
    ART.rr(c, W / 2 - mw / 2, my - 24, mw, 48, 14); c.fillStyle = 'rgba(26,21,48,.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffd166'; c.stroke(); label(m, W / 2, my, 24, '#fff'); c.globalAlpha = 1; } }
}
function draw() {
  if (!FIELD) FIELD = SIDE ? sideArt() : fieldArt();
  c.drawImage(FIELD, 0, 0, W, H);
  if (SIDE) {
    if (MODE === 'voley') { const bl = ball; ART.shadow(c, bl.x, GROUND + 2, Math.max(4, 12 - (GROUND - bl.y) / 30), 0.25); }
    for (const b of B) drawSidePlayer(b);
    if (MODE === 'cabezon' && ball.fire > 0) { for (let i = 0; i < 4; i++) { c.globalAlpha = 0.5 - i * 0.1; c.fillStyle = i % 2 ? '#ffd166' : '#ff5f7a'; c.beginPath(); c.arc(ball.x - ball.vx * 0.012 * i, ball.y - ball.vy * 0.012 * i, ball.r * (1 - i * 0.15), 0, TAU); c.fill(); } c.globalAlpha = 1; }
    drawBall(ball.x, ball.y, ball.r, ball.spin, MODE === 'voley' ? 'voley' : 'ball');
    if (MODE === 'voley' && phase === 'play') { const tm = ball.x < NET ? 0 : 1, n = touches[tm]; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(W / 2 + (tm ? 60 : -60) + (i - 1) * 14, 60, 5, 0, TAU); c.fillStyle = i < n ? TEAM[tm].col : 'rgba(255,255,255,.25)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); } }
  } else if (MODE === 'futbolin') drawFoos();
  else if (MODE === 'canasta') drawCourt();
  else {
    const list = B.slice().sort((p, q) => V(p.x, p.y)[1] - V(q.x, q.y)[1]);
    if (M.neon) for (const g of glow) { const [x, y] = V(g.x, g.y), q = g.t / 0.5; c.globalAlpha = q; c.strokeStyle = '#ff4fd8'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 8 + (1 - q) * 22, 0, TAU); c.stroke(); c.globalAlpha = 1; }
    if (MODE === 'prisionero') for (const bl of balls) if (!bl.hold) { const [x, y] = V(bl.x, bl.y); if (bl.live) { c.globalAlpha = 0.35; c.strokeStyle = '#fff'; c.lineWidth = bl.r * 1.4; c.beginPath(); const [px, py] = V(bl.x - bl.vx * 0.05, bl.y - bl.vy * 0.05); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); c.globalAlpha = 1; } drawBall(x, y, bl.r, bl.spin, 'dodge'); }
    if (MODE !== 'prisionero' && MODE !== 'coches') { const [x, y] = V(ball.x, ball.y); const v = hyp(ball.vx, ball.vy); if (!ball.own && v > (M.neon ? 200 : 380)) { c.globalAlpha = 0.3; c.strokeStyle = M.neon ? '#5ce1e6' : '#fff'; c.lineWidth = ball.r * 1.5; c.beginPath(); const [px, py] = V(ball.x - ball.vx * 0.05, ball.y - ball.vy * 0.05); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); c.globalAlpha = 1; } ART.shadow(c, x + 2, y + 4, ball.r, 0.25); drawBall(x, y, ball.r, ball.spin, MODE === 'hockey' ? 'puck' : 'ball'); }
    for (const b of list) M.car ? drawCar(b) : drawWalker(b);
    if (MODE === 'prisionero') for (const b of B) if (b.hold) { const [x, y] = V(b.hold.x, b.hold.y); drawBall(x, y, b.hold.r, 0, 'dodge'); }
    if (MODE === 'coches') { const [x, y] = V(ball.x, ball.y); drawBall(x, y, ball.r, ball.spin, 'car', ball.z); }
  }
  hud();
}
