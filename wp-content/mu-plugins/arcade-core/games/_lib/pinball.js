/* Motor `pinball` — dos mesas de pinball completas, de 1 jugador (y 2–4 por turnos en el modo tele).
 *   CFG.mode='sotano'  → Pinball del Sótano: mesa clásica de madera y neón. Muelle, setas, banco de
 *     cuatro dianas, rampa larga que devuelve por el carril izquierdo, carril de bola extra y
 *     multibola de tres bolas. Las misiones se encadenan y cada una sube el multiplicador.
 *   CFG.mode='espacio' → Pinball Espacial: agujero negro que se traga la bola y la escupe, órbitas
 *     completas por el arco, imanes que tiran de la bola, jefe orbital al que hay que derribar a
 *     impactos y misión final «asalto al núcleo» con marcador objetivo: final de verdad.
 *
 * Física (zona pura, entre las marcas <SIM> y </SIM>: no toca Kit, ART ni el DOM, y se extrae para
 * verificarla en Node con miles de lanzamientos):
 *   - Subpaso FIJO de 1/300 s con acumulador; la velocidad se limita a 1450 px/s, así el avance
 *     máximo por subpaso (4,8 px) es menor que el radio de la bola (9 px): no hay túneles.
 *   - Colisión estable círculo–segmento (punto más cercano, empuje fuera + reflexión con
 *     restitución y rozamiento tangencial). Los flippers son segmentos que giran: se les calcula la
 *     velocidad del punto de contacto y se transfiere el impulso en el marco relativo.
 *   - Compuerta de una sola dirección en la salida del carril del muelle (prueba de lado por
 *     producto vectorial), rampas por raíl paramétrico, agujeros con retención e imanes.
 * Arte: 100 % por código, §8 «ley de la pieza única» (un trazado por objeto, relleno una vez y
 * contorneado una vez), cel de 3 tonos con borde duro, mesa horneada en un lienzo aparte y sprites
 * cacheados a Math.min(2, devicePixelRatio). Nada de shadowBlur, filter ni gradientes en el bucle. */

/* <SIM> ======================================================================================= */
var PB = (function () {
  var TAU = 6.2832;
  var SUB = 1 / 300;          /* subpaso fijo */
  var VMAX = 1450;            /* tope de velocidad: 1450/300 = 4,8 px por subpaso < radio (9) */
  var GRAV = 900;             /* gravedad de la mesa inclinada */
  var DRAINY = 706;           /* por debajo de aquí la bola se ha ido */
  var W = 440, H = 720, TOP = 46;

  function seg(x1, y1, x2, y2, o) {
    o = o || {};
    var r = o.r == null ? 3 : o.r;
    var s = { x1: x1, y1: y1, x2: x2, y2: y2, r: r, e: o.e == null ? 0.42 : o.e, k: o.k || 0, ow: o.ow || 0, id: o.id || '', f: o.f == null ? 0.16 : o.f };
    var m = r + 10;
    s.ax = Math.min(x1, x2) - m; s.bx = Math.max(x1, x2) + m;
    s.ay = Math.min(y1, y2) - m; s.by = Math.max(y1, y2) + m;
    return s;
  }
  /* arco muestreado en segmentos (ángulos en grados, y hacia abajo) */
  function arc(out, cx, cy, rad, a0, a1, stepDeg, o) {
    var n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / stepDeg)), px = 0, py = 0;
    for (var i = 0; i <= n; i++) {
      var a = (a0 + (a1 - a0) * (i / n)) * Math.PI / 180, x = cx + rad * Math.cos(a), y = cy + rad * Math.sin(a);
      if (i) out.push(seg(px, py, x, y, o));
      px = x; py = y;
    }
    return out;
  }
  function len2(x, y) { return x * x + y * y; }

  /* ---------------------------------------------------------------- mesas */
  function base() {
    var S = [];
    /* arco superior: centro (220,270) radio 202 → cubre de x=18 a x=422 (carril del muelle incluido) */
    arc(S, 220, 270, 202, 180, 360, 5, { e: 0.44, id: 'arco' });
    S.push(seg(18, 270, 18, 500, { e: 0.44, id: 'mI' }));        /* pared izquierda */
    S.push(seg(422, 270, 422, 712, { e: 0.40, id: 'mD' }));      /* pared derecha (carril) */
    S.push(seg(386, 258, 386, 662, { e: 0.40, id: 'div' }));     /* separador del carril del muelle */
    S.push(seg(386, 662, 422, 662, { e: 0.20, id: 'suelo' }));   /* fondo del carril */
    /* compuerta de una sola dirección: la bola sube por el carril y sale, pero no puede volver */
    S.push(seg(386, 256, 422, 238, { e: 0.30, ow: -1, id: 'gate' }));
    /* embudo inferior: paredes exteriores que BAJAN sin descanso hasta el canal de salida
       («outlane»). Ninguna superficie es horizontal ni forma un valle: no hay donde pararse. */
    S.push(seg(18, 500, 46, 606, { e: 0.34, id: 'gI' }));
    S.push(seg(46, 606, 46, 700, { e: 0.30, id: 'cI' }));
    S.push(seg(386, 500, 358, 606, { e: 0.34, id: 'gD' }));
    S.push(seg(358, 606, 358, 700, { e: 0.30, id: 'cD' }));
    /* cuña separadora: cara vertical hacia el canal de salida y cara interior que desciende
       hasta el eje del flipper (carril de retorno). La bola que baja pegada a la pared se pierde. */
    S.push(seg(86, 556, 86, 652, { e: 0.30, r: 4, id: 'pI' }));
    S.push(seg(86, 556, 114, 638, { e: 0.30, r: 4 }));
    S.push(seg(318, 556, 318, 652, { e: 0.30, r: 4, id: 'pD' }));
    S.push(seg(318, 556, 290, 638, { e: 0.30, r: 4 }));
    /* parachoques laterales (slingshots): cuña con la cara larga que empuja y una base que
       desciende hacia el carril de retorno (nada de repisas donde la bola se pare) */
    S.push(seg(56, 468, 112, 548, { e: 0.30, k: 400, r: 5, id: 'slI' }));
    S.push(seg(56, 468, 56, 518, { e: 0.35, r: 4 }));
    S.push(seg(56, 518, 112, 548, { e: 0.35, r: 4 }));
    S.push(seg(348, 468, 292, 548, { e: 0.30, k: 400, r: 5, id: 'slD' }));
    S.push(seg(348, 468, 348, 518, { e: 0.35, r: 4 }));
    S.push(seg(348, 518, 292, 548, { e: 0.35, r: 4 }));
    return S;
  }
  function tgt(x1, y1, x2, y2, id) { var s = seg(x1, y1, x2, y2, { e: 0.35, r: 4, id: id }); s.down = 0; return s; }

  function build(mode, dif) {
    var T = { w: W, h: H, top: TOP, mode: mode, drainY: DRAINY, segs: base(), tg: [], bm: [], roll: [], rails: [], holes: [], mag: [], boss: null };
    T.g = GRAV * (dif === 0 ? 0.9 : dif === 2 ? 1.07 : 1);
    T.fl = [
      { x: 114, y: 638, s: 1, len: 76, r: 7, rest: 0.50, up: -0.56, a: 0.50, w: 0, on: 0 },
      { x: 290, y: 638, s: -1, len: 76, r: 7, rest: 0.50, up: -0.56, a: 0.50, w: 0, on: 0 }
    ];
    T.plung = { x: 404, y: 652 };
    if (mode === 'espacio') {
      T.bm.push({ x: 146, y: 300, r: 18, k: 430, lit: 0 }, { x: 258, y: 300, r: 18, k: 430, lit: 0 });
      T.holes.push({ x: 202, y: 234, r: 17, id: 'negro', hold: 1.25 });
      /* banco de dianas: tramos CONTIGUOS de una misma diagonal (si quedara un hueco menor que la
         bola, se encajaría entre dos dianas) */
      for (var i = 0; i < 3; i++) T.tg.push(tgt(140 + i * 42, 402 + i * 11, 182 + i * 42, 413 + i * 11, 'd' + i));
      T.tg.push(tgt(40, 336, 40, 372, 's0'), tgt(364, 336, 364, 372, 's1'));
      T.roll.push({ x: 52, y: 300, r: 17, id: 'orbI' }, { x: 352, y: 300, r: 17, id: 'orbD' },
        { x: 220, y: 108, r: 20, id: 'alto' }, { x: 338, y: 622, r: 14, id: 'extra' }, { x: 66, y: 622, r: 14, id: 'salida' });
      T.rails.push(rail('rampa', [[98, 452], [88, 420], [74, 380], [64, 330], [62, 282], [76, 236], [108, 200], [152, 180], [204, 174], [254, 188], [294, 218], [320, 264], [336, 320], [346, 380], [350, 440], [340, 500], [310, 548], [300, 590]], 340));
      T.boss = { x: 202, y: 166, r: 27, vx: 92, hp: 0, max: 5, on: 0 };
      T.mag.push({ x: 106, y: 392, r: 104, str: 430, on: 0 }, { x: 298, y: 392, r: 104, str: 430, on: 0 });
    } else {
      T.bm.push({ x: 150, y: 300, r: 19, k: 440, lit: 0 }, { x: 202, y: 252, r: 19, k: 440, lit: 0 }, { x: 254, y: 300, r: 19, k: 440, lit: 0 });
      /* banco de cuatro dianas contiguas (sin huecos donde la bola se pueda encajar) */
      for (var j = 0; j < 4; j++) T.tg.push(tgt(128 + j * 36, 390 + j * 10, 164 + j * 36, 400 + j * 10, 'd' + j));
      T.tg.push(tgt(40, 340, 40, 376, 's0'), tgt(364, 340, 364, 376, 's1'));
      T.roll.push({ x: 150, y: 152, r: 18, id: 'k' }, { x: 220, y: 122, r: 18, id: 'u' }, { x: 290, y: 152, r: 18, id: 'b' },
        { x: 338, y: 622, r: 14, id: 'extra' }, { x: 66, y: 622, r: 14, id: 'salida' });
      T.rails.push(rail('rampa', [[306, 452], [316, 420], [330, 380], [342, 330], [346, 282], [334, 238], [304, 204], [260, 184], [212, 178], [162, 190], [122, 220], [96, 266], [80, 320], [70, 380], [66, 440], [76, 500], [96, 548], [106, 590]], 340));
    }
    T.tg = T.tg.filter(function (t) { return t && t.x1 != null; });
    return T;
  }
  function rail(id, pts, vmin) {
    var P = [], L = [0], tot = 0;
    for (var i = 0; i < pts.length; i++) P.push({ x: pts[i][0], y: pts[i][1] });
    for (var j = 1; j < P.length; j++) { tot += Math.sqrt(len2(P[j].x - P[j - 1].x, P[j].y - P[j - 1].y)); L.push(tot); }
    var dx = P[1].x - P[0].x, dy = P[1].y - P[0].y, d = Math.sqrt(len2(dx, dy));
    return { id: id, p: P, L: L, tot: tot, vmin: vmin, dx: dx / d, dy: dy / d, r: 17 };
  }
  function railAt(R, s) {
    var i = 1; while (i < R.L.length - 1 && R.L[i] < s) i++;
    var a = R.p[i - 1], b = R.p[i], l0 = R.L[i - 1], l1 = R.L[i], t = l1 > l0 ? (s - l0) / (l1 - l0) : 0;
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(len2(dx, dy)) || 1;
    return { x: a.x + dx * t, y: a.y + dy * t, dx: dx / d, dy: dy / d };
  }

  /* ---------------------------------------------------------------- estado */
  function ball(x, y, vx, vy) { return { x: x, y: y, vx: vx || 0, vy: vy || 0, r: 9, rail: null, rs: 0, rt: 0, hold: 0, hole: null, hr: 0, nohole: 0, lane: 1, sp: 0 }; }
  function newState(T) {
    return { balls: [ball(T.plung.x, T.plung.y)], ev: [], t: 0, tilt: 0, tiltT: 0, dead: 0, power: 0, charge: 0, flipOff: 0 };
  }
  function ev(S, t, o) { o = o || {}; o.t = t; S.ev.push(o); }

  /* colisión bola ↔ segmento (devuelve la velocidad normal del impacto, 0 si no toca) */
  function hitSeg(b, s, ux, uy) {
    if (b.x < s.ax || b.x > s.bx || b.y < s.ay || b.y > s.by) return 0;
    var dx = s.x2 - s.x1, dy = s.y2 - s.y1, l2 = dx * dx + dy * dy;
    var t = l2 ? ((b.x - s.x1) * dx + (b.y - s.y1) * dy) / l2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var qx = s.x1 + dx * t, qy = s.y1 + dy * t, nx = b.x - qx, ny = b.y - qy, d = Math.sqrt(nx * nx + ny * ny), R = b.r + s.r;
    if (d >= R) return 0;
    if (s.ow) { var cr = dx * (b.y - s.y1) - dy * (b.x - s.x1); if (cr * s.ow < 0) return 0; }
    if (d < 1e-6) { nx = -dy; ny = dx; d = Math.sqrt(nx * nx + ny * ny) || 1; }
    nx /= d; ny /= d;
    b.x += nx * (R - d + 0.01); b.y += ny * (R - d + 0.01);
    var rvx = b.vx - (ux || 0), rvy = b.vy - (uy || 0), vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      var tx = -ny, ty = nx, vt = rvx * tx + rvy * ty;
      /* el rozamiento crece con la fuerza del impacto: en contacto de reposo es casi nulo, así la
         bola resbala por las pendientes en vez de quedarse pegada (el contacto se repite 300×/s) */
      var mu = s.f * Math.min(1, -vn / 40);
      rvx -= (1 + s.e) * vn * nx; rvy -= (1 + s.e) * vn * ny;
      rvx -= vt * mu * tx; rvy -= vt * mu * ty;
      b.vx = rvx + (ux || 0); b.vy = rvy + (uy || 0);
      if (s.k) { b.vx += nx * s.k; b.vy += ny * s.k; }   /* el empujón sólo al llegar, nunca en reposo */
    }
    return vn < 0 ? -vn : 0;
  }
  function hitCirc(b, c, e, k) {
    var nx = b.x - c.x, ny = b.y - c.y, R = b.r + c.r, d2 = nx * nx + ny * ny;
    if (d2 >= R * R) return 0;
    var d = Math.sqrt(d2) || 1e-6; nx /= d; ny /= d;
    b.x = c.x + nx * (R + 0.01); b.y = c.y + ny * (R + 0.01);
    var vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return 0;                                /* ya se aleja: ni rebote ni empujón */
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    if (k) { b.vx += nx * k; b.vy += ny * k; }
    return -vn;
  }
  function clampV(b) {
    var v2 = b.vx * b.vx + b.vy * b.vy;
    if (v2 > VMAX * VMAX) { var f = VMAX / Math.sqrt(v2); b.vx *= f; b.vy *= f; }
    b.sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  }

  function sub(T, S, h) {
    var i, j, b, F;
    S.t += h;
    if (S.tiltT > 0) S.tiltT -= h;
    /* flippers: giro limitado y velocidad angular real para transferir el impulso */
    for (i = 0; i < 2; i++) {
      F = T.fl[i];
      var tg = (F.on && !S.flipOff) ? F.up : F.rest, dmax = 21 * h, d = tg - F.a;
      if (d > dmax) d = dmax; else if (d < -dmax) d = -dmax;
      F.a += d; F.w = d / h;
    }
    if (T.boss && T.boss.on) {
      T.boss.x += T.boss.vx * h;
      if (T.boss.x < 130) { T.boss.x = 130; T.boss.vx = Math.abs(T.boss.vx); }
      if (T.boss.x > 274) { T.boss.x = 274; T.boss.vx = -Math.abs(T.boss.vx); }
    }
    for (i = 0; i < T.tg.length; i++) if (T.tg[i].down > 0) T.tg[i].down -= h;

    for (i = S.balls.length - 1; i >= 0; i--) {
      b = S.balls[i];
      /* --- raíl (rampa/órbita elevada): recorrido paramétrico, sin física */
      if (b.rail != null) {
        var R = T.rails[b.rail];
        b.rt += b.rs * h;
        if (b.rt >= R.tot) {
          var e2 = railAt(R, R.tot);
          b.x = e2.x; b.y = e2.y; b.vx = e2.dx * b.rs * 0.85; b.vy = e2.dy * b.rs * 0.85;
          b.rail = null; ev(S, 'railend', { id: R.id, x: b.x, y: b.y });
        } else { var q = railAt(R, b.rt); b.x = q.x; b.y = q.y; b.vx = q.dx * b.rs; b.vy = q.dy * b.rs; }
        continue;
      }
      /* --- agujero: la bola queda retenida y sale disparada */
      if (b.hold > 0) {
        b.hold -= h;
        if (b.hold <= 0) {
          var an = -1.15 - Math.random() * 0.85, HR = b.hr || 17;
          b.vx = Math.cos(an) * 640; b.vy = Math.sin(an) * 640;
          /* sale YA fuera del agujero y con una espera: si no, la bola vuelve a caer en él sin fin */
          b.x += Math.cos(an) * (HR + b.r + 2); b.y += Math.sin(an) * (HR + b.r + 2);
          b.nohole = 0.6;
          ev(S, 'holeout', { id: b.hole, x: b.x, y: b.y }); b.hole = null;
        }
        continue;
      }
      /* --- integración */
      b.vy += T.g * h;
      for (j = 0; j < T.mag.length; j++) {
        var M = T.mag[j]; if (!M.on) continue;
        var mx = M.x - b.x, my = M.y - b.y, md = Math.sqrt(mx * mx + my * my);
        if (md < M.r && md > 4) { var fq = M.str * (1 - md / M.r) * h / md; b.vx += mx * fq; b.vy += my * fq; }
      }
      b.vx *= 0.99965; b.vy *= 0.99965;
      clampV(b);
      b.x += b.vx * h; b.y += b.vy * h;
      /* --- paredes */
      for (j = 0; j < T.segs.length; j++) {
        var s = T.segs[j], im = hitSeg(b, s, 0, 0);
        if (im > 90 && s.id === 'slI') ev(S, 'sling', { i: 0, x: 84, y: 508, v: im });
        else if (im > 90 && s.id === 'slD') ev(S, 'sling', { i: 1, x: 320, y: 508, v: im });
        else if (im > 240) ev(S, 'wall', { x: b.x, y: b.y, v: im });
      }
      /* --- dianas */
      for (j = 0; j < T.tg.length; j++) {
        var G = T.tg[j]; if (G.down > 0) continue;
        if (hitSeg(b, G, 0, 0) > 30) { ev(S, 'target', { i: j, id: G.id, x: (G.x1 + G.x2) / 2, y: (G.y1 + G.y2) / 2 }); }
      }
      /* --- setas */
      for (j = 0; j < T.bm.length; j++) {
        var P = T.bm[j];
        if (hitCirc(b, P, 0.30, P.k) > 0) { P.lit = 0.22; ev(S, 'bump', { i: j, x: P.x, y: P.y }); }
      }
      /* --- jefe orbital */
      if (T.boss && T.boss.on && hitCirc(b, T.boss, 0.55, 210) > 0) ev(S, 'boss', { x: T.boss.x, y: T.boss.y });
      /* --- flippers (segmento giratorio: velocidad del punto de contacto) */
      for (j = 0; j < 2; j++) {
        F = T.fl[j];
        var ca = Math.cos(F.a), sa = Math.sin(F.a);
        var tx = F.x + F.s * F.len * ca, ty = F.y + F.len * sa;
        var fs = { x1: F.x, y1: F.y, x2: tx, y2: ty, r: F.r, e: 0.30, k: 0, ow: 0, f: 0.22, ax: -1e9, bx: 1e9, ay: -1e9, by: 1e9 };
        var dxq = tx - F.x, dyq = ty - F.y, l2q = dxq * dxq + dyq * dyq;
        var tq = l2q ? ((b.x - F.x) * dxq + (b.y - F.y) * dyq) / l2q : 0;
        if (tq < 0) tq = 0; else if (tq > 1) tq = 1;
        var ux = tq * (-F.s * F.len * sa) * F.w, uy = tq * (F.len * ca) * F.w;
        var imf = hitSeg(b, fs, ux, uy);
        if (imf > 130) ev(S, 'flip', { i: j, x: b.x, y: b.y, v: imf });
      }
      /* --- entradas de raíl */
      for (j = 0; j < T.rails.length; j++) {
        var RR = T.rails[j], ex = b.x - RR.p[0].x, ey = b.y - RR.p[0].y;
        if (ex * ex + ey * ey < RR.r * RR.r && b.sp > RR.vmin && (b.vx * RR.dx + b.vy * RR.dy) > b.sp * 0.35) {
          b.rail = j; b.rt = 0; b.rs = Math.min(950, b.sp * 0.96); b.hold = 0;
          ev(S, 'rail', { id: RR.id, x: b.x, y: b.y }); break;
        }
      }
      if (b.rail != null) continue;
      /* --- agujeros (se traga si llega despacio o desde arriba) */
      if (b.nohole > 0) b.nohole -= h;
      for (j = 0; b.nohole <= 0 && j < T.holes.length; j++) {
        var HO = T.holes[j], hx = b.x - HO.x, hy = b.y - HO.y;
        if (hx * hx + hy * hy < HO.r * HO.r) {
          b.hold = HO.hold; b.hole = HO.id; b.hr = HO.r; b.vx = 0; b.vy = 0; b.x = HO.x; b.y = HO.y;
          ev(S, 'hole', { id: HO.id, x: HO.x, y: HO.y }); break;
        }
      }
      if (b.hold > 0) continue;
      /* --- pasos por carril (detectores, sin colisión) */
      for (j = 0; j < T.roll.length; j++) {
        var RO = T.roll[j], ox = b.x - RO.x, oy = b.y - RO.y;
        if (ox * ox + oy * oy < RO.r * RO.r) { if (!b['r' + j]) { b['r' + j] = 1; ev(S, 'roll', { id: RO.id, x: RO.x, y: RO.y }); } }
        else b['r' + j] = 0;
      }
      b.lane = b.x > 388 && b.y > 250 ? 1 : 0;
      clampV(b);
      /* --- desagüe */
      if (b.y > T.drainY) { S.balls.splice(i, 1); ev(S, 'drain', { x: b.x, y: b.y }); }
    }
    for (j = 0; j < T.bm.length; j++) if (T.bm[j].lit > 0) T.bm[j].lit -= h;
  }

  function step(T, S, dt) {
    if (dt > 0.05) dt = 0.05;
    var n = Math.ceil(dt / SUB); if (n < 1) n = 1;
    var h = dt / n;
    for (var i = 0; i < n; i++) sub(T, S, h);
    return n;
  }
  /* lanzar la bola que descansa en el carril del muelle */
  function launch(T, S, power) {
    for (var i = 0; i < S.balls.length; i++) {
      var b = S.balls[i];
      if (b.lane && b.y > 600 && b.sp < 60) {
        b.vy = -(470 + 790 * power); b.vx = (Math.random() - 0.5) * 24;
        ev(S, 'launch', { x: b.x, y: b.y, p: power }); return 1;
      }
    }
    return 0;
  }
  function canLaunch(T, S) {
    for (var i = 0; i < S.balls.length; i++) { var b = S.balls[i]; if (b.lane && b.y > 600 && b.sp < 60) return 1; }
    return 0;
  }
  function nudge(S, dir) {
    for (var i = 0; i < S.balls.length; i++) { var b = S.balls[i]; if (b.rail == null && b.hold <= 0) { b.vx += dir * 150; b.vy -= 52; } }
    ev(S, 'nudge', { d: dir });
  }
  function addBall(T, S, x, y, vx, vy) { S.balls.push(ball(x, y, vx, vy)); return S.balls[S.balls.length - 1]; }

  return { build: build, newState: newState, step: step, launch: launch, canLaunch: canLaunch, nudge: nudge,
    addBall: addBall, ball: ball, railAt: railAt, W: W, H: H, TOP: TOP, SUB: SUB, VMAX: VMAX, DRAINY: DRAINY };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = PB;
/* </SIM> ====================================================================================== */

/* ===== capa viva: Kit, arte y reglas ========================================================= */
const CFG = window.CFG || {};
const M = CFG.mode === 'espacio' ? 'espacio' : 'sotano';
const W = PB.W, H = PB.H, TOPH = PB.TOP;
const TH = M === 'espacio'
  ? { bg: '#080d1c', fl: '#16213f', fl2: '#1d2c55', wood: '#22315c', ac: '#5b8cff', ac2: '#a097ff', hot: '#ff6fb5', rail: '#cdd9ff', lamp: '#26335e' }
  : { bg: '#140f22', fl: '#33244c', fl2: '#3d2c58', wood: '#4a3560', ac: '#ff6fb5', ac2: '#ffc94d', hot: '#a8cf3f', rail: '#e6dcff', lamp: '#2a2044' };
const k = Kit({ w: W, h: H, title: CFG.title || 'Pinball', bg: TH.bg, fluid: { min: 0.42, max: 2.7 } }), c = k.ctx;

/* ===== §8 «Ley de la pieza única» — utilería local (REMASTER.md §8) =====
 * unite8(): traza y contornea TODAS las partes y después las rellena en orden de profundidad, así
 * dentro de la silueta no sobrevive ningún contorno cerrado: solo el borde exterior. */
const P8OUT = ART.OUT, P8W = 1.5, P8T = 6.2832;
const _p8h = (s) => { s = String(s).replace('#', ''); if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _p8c = (a) => 'rgb(' + a.map((v) => Math.max(0, Math.min(255, v | 0))).join(',') + ')';
const LT8 = (col, f) => (String(col)[0] === '#' ? _p8c(_p8h(col).map((v) => v + (255 - v) * f)) : col);
const DK8 = (col, f) => (String(col)[0] === '#' ? _p8c(_p8h(col).map((v) => v * (1 - f))) : col);
const AL8 = (col, a) => { const q = _p8h(col); return 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',' + Math.max(0, a).toFixed(3) + ')'; };
const CV8 = (w, h) => { const q = document.createElement('canvas'); q.width = Math.max(1, Math.ceil(w)); q.height = Math.max(1, Math.ceil(h)); return q; };
function rr8(g, x, y, w, h, r) { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const DPR8 = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
function clip8(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
function cel8(g, path, base, o) {
  o = o || {}; const dx = o.dx == null ? 2.2 : o.dx, dy = o.dy == null ? 2 : o.dy, f = o.f == null ? 1 : o.f, B = o.b || 260;
  g.save(); g.beginPath(); path(g); g.clip();
  g.fillStyle = DK8(base, 0.22 * f); g.fillRect(-B, -B, B * 2, B * 2);
  g.save(); g.translate(-dx, -dy); g.beginPath(); path(g); g.fillStyle = base; g.fill(); g.restore();
  if (o.hi !== false) { g.save(); g.translate(-dx * 2.1, -dy * 2.1); g.beginPath(); path(g); g.fillStyle = LT8(base, 0.2 * f); g.fill(); g.restore(); }
  g.restore();
}
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
function seam8(g, path, base, fn, f) { clip8(g, path, (q) => { q.fillStyle = DK8(base, f == null ? 0.16 : f); fn(q); }); }
function shine8(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.34 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, P8T); g.fill(); }
function drop8(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(26,21,48,' + (a == null ? 0.26 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, P8T); g.fill(); }
const SPR8 = {};
function spr8(key, w, h, ox, oy, fn, sc) {
  let q = SPR8[key]; if (q) return q;
  const s = (sc || 1) * DPR8; q = SPR8[key] = CV8(w * s, h * s); const g = q.getContext('2d');
  g.scale(s, s); g.translate(ox, oy); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g);
  q.iw = w; q.ih = h; q.ox = ox; q.oy = oy; return q;
}
/* dibuja un sprite cacheado centrado en (x,y) */
function blit(q, x, y, rot, sc) {
  c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (sc && sc !== 1) c.scale(sc, sc);
  c.drawImage(q, -q.ox, -q.oy, q.iw, q.ih); c.restore();
}
/* ruido determinista (sin Math.random: la mesa horneada sale siempre igual) */
let _sd = 1;
const srnd = () => { _sd = (_sd * 1103515245 + 12345) & 0x7fffffff; return _sd / 0x7fffffff; };

/* ===== sprites ============================================================================== */
function ballSpr() {
  return spr8('bola', 28, 28, 14, 14, (g) => {
    drop8(g, 1.5, 3.5, 9, 7, 0.3);
    unite8(g, [[(q) => { q.moveTo(9, 0); q.arc(0, 0, 9, 0, P8T); }, '#cfd6e8', { dx: 3, dy: 3 }]], 1.4);
    shine8(g, -3, -3.6, 3.1, 2.2, -0.7, 0.85); shine8(g, 3.2, 3.4, 1.8, 1.2, 0.5, 0.25);
  });
}
function bumpSpr(r, lit) {
  return spr8('bump' + r + lit, r * 2 + 18, r * 2 + 20, r + 9, r + 11, (g) => {
    drop8(g, 2, r * 0.42, r * 0.95, r * 0.5, 0.3);
    const cap = lit ? LT8(TH.ac, 0.34) : TH.ac, base = lit ? LT8(TH.ac2, 0.24) : DK8(TH.ac2, 0.14);
    unite8(g, [
      [(q) => { q.moveTo(r + 2, 2); q.arc(0, 2, r + 2, 0, P8T); }, DK8(base, 0.3), { dx: 2, dy: 2 }],
      [(q) => { q.moveTo(r - 2, -2); q.arc(0, -2, r - 2, 0, P8T); }, base, { dx: 2.4, dy: 2.4 }],
      [(q) => { q.moveTo(r * 0.55, -5); q.arc(0, -5, r * 0.55, 0, P8T); }, cap, { dx: 1.6, dy: 1.6 }]
    ], 1.5);
    shine8(g, -r * 0.3, -r * 0.55, r * 0.26, r * 0.17, -0.6, lit ? 0.85 : 0.4);
  });
}
function flipSpr(col) {
  const L = 76, r0 = 9, r1 = 5.2;
  return spr8('flip' + col, L + 24, 28, 12, 14, (g) => {
    drop8(g, 2 + L * 0.4, 5, L * 0.5, 5, 0.26);
    const body = (q) => {
      q.moveTo(0, -r0); q.arc(0, 0, r0, -Math.PI / 2, Math.PI / 2, false);
      q.lineTo(L, r1); q.arc(L, 0, r1, Math.PI / 2, -Math.PI / 2, false); q.closePath();
    };
    unite8(g, [[body, col, { dx: 1.8, dy: 2.4 }]], 1.6);
    seam8(g, body, col, (q) => { q.fillRect(6, -2.2, L - 12, 4.4); }, 0.14);
    shine8(g, L * 0.42, -3.6, L * 0.3, 1.5, 0, 0.3);
  });
}
function tgtSpr(lit) {
  return spr8('tgt' + lit, 52, 24, 5, 12, (g) => {
    drop8(g, 21, 5, 19, 3.6, 0.3);
    const col = lit ? TH.ac2 : LT8(TH.lamp, 0.26);
    const body = (q) => rr8(q, 0, -7, 42, 13, 4);
    unite8(g, [[body, col, { dx: 2, dy: 2 }]], 1.5);
    seam8(g, body, col, (q) => { q.fillRect(0, 1, 42, 5); }, 0.18);
    if (lit) shine8(g, 21, -4, 15, 1.6, 0, 0.45);
  });
}
function holeSpr() {
  return spr8('hole', 62, 62, 31, 31, (g) => {
    unite8(g, [
      [(q) => { q.moveTo(26, 0); q.arc(0, 0, 26, 0, P8T); }, DK8(TH.ac2, 0.45), { dx: 2, dy: 2 }],
      [(q) => { q.moveTo(19, 0); q.arc(0, 0, 19, 0, P8T); }, '#120a22', { hi: false, dx: 1, dy: 1 }]
    ], 1.5);
  });
}
function swirlSpr() {
  return spr8('swirl', 46, 46, 23, 23, (g) => {
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      for (let t = 0; t <= 1.001; t += 0.06) {
        const a = i * 2.094 + t * 2.5, r = 4 + t * 14, x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (t) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.strokeStyle = AL8(TH.ac2, 0.75 - i * 0.16); g.lineWidth = 2.6; g.stroke();
    }
  });
}
function bossSpr() {
  const R = 27;
  return spr8('boss', 86, 86, 43, 43, (g) => {
    drop8(g, 3, R * 0.5, R * 0.9, R * 0.35, 0.28);
    const hull = (q) => { q.moveTo(R, 0); q.arc(0, 0, R, 0, P8T); };
    const wing = (q) => {
      q.moveTo(-R - 11, -6); q.lineTo(-R + 4, -13); q.lineTo(-R + 4, 13); q.lineTo(-R - 11, 6); q.closePath();
      q.moveTo(R + 11, -6); q.lineTo(R - 4, -13); q.lineTo(R - 4, 13); q.lineTo(R + 11, 6); q.closePath();
    };
    unite8(g, [
      [wing, DK8(TH.ac, 0.3), { dx: 2, dy: 2 }],
      [hull, TH.ac, { dx: 2.6, dy: 2.6 }],
      [(q) => { q.moveTo(13, 0); q.ellipse(0, 0, 13, 9, 0, 0, P8T); }, '#ffc94d', { dx: 1.6, dy: 1.6 }]
    ], 1.6);
    g.fillStyle = P8OUT; g.beginPath(); g.ellipse(0, 0, 5, 6, 0, 0, P8T); g.fill();
    shine8(g, -4, -3, 2.2, 2.6, 0, 0.7);
    shine8(g, -R * 0.35, -R * 0.55, R * 0.3, R * 0.14, -0.6, 0.3);
  });
}
function plungSpr() {
  return spr8('plung', 32, 34, 16, 17, (g) => {
    unite8(g, [[(q) => rr8(q, -9, -8, 18, 16, 6), TH.hot, { dx: 1.8, dy: 1.8 }]], 1.5);
    shine8(g, -3, -4, 4, 2.2, -0.6, 0.4);
  });
}
function magSpr() {
  return spr8('mag', 48, 48, 24, 24, (g) => {
    unite8(g, [
      [(q) => { q.moveTo(17, 0); q.arc(0, 0, 17, 0, P8T); }, DK8(TH.ac, 0.42), { dx: 2, dy: 2 }],
      [(q) => { q.moveTo(9, 0); q.arc(0, 0, 9, 0, P8T); }, DK8(TH.ac2, 0.3), { dx: 1.4, dy: 1.4 }]
    ], 1.4);
  });
}
/* halo cacheado para las luces (nada de gradientes dentro del bucle) */
function haloSpr(col, R) {
  return spr8('halo' + col + R, R * 2 + 6, R * 2 + 6, R + 3, R + 3, (g) => {
    for (let i = 6; i >= 1; i--) { g.fillStyle = AL8(col, 0.05 + 0.028 * (7 - i)); g.beginPath(); g.arc(0, 0, R * i / 6, 0, P8T); g.fill(); }
  });
}

/* ===== mesa horneada ======================================================================== */
let TBL = null;
function bakeTable(T) {
  _sd = M === 'espacio' ? 7 : 3;
  const q = CV8(W * DPR8, H * DPR8), g = q.getContext('2d');
  g.scale(DPR8, DPR8); g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = TH.bg; g.fillRect(0, 0, W, H);
  g.beginPath(); rr8(g, 8, TOPH - 6, W - 16, H - TOPH - 2, 26); g.fillStyle = TH.wood; g.fill();
  g.beginPath(); rr8(g, 14, TOPH, W - 28, H - TOPH - 10, 22); g.fillStyle = TH.fl; g.fill();
  clip8(g, (p) => rr8(p, 14, TOPH, W - 28, H - TOPH - 10, 22), (p) => {
    for (let i = 0; i < 260; i++) {
      const x = srnd() * W, y = TOPH + srnd() * H, r = 0.5 + srnd() * 1.4;
      p.fillStyle = AL8(srnd() > 0.5 ? TH.fl2 : TH.ac2, 0.05 + srnd() * 0.1);
      p.beginPath(); p.arc(x, y, r, 0, P8T); p.fill();
    }
    for (let i = 0; i < 3; i++) {
      p.beginPath(); p.arc(220, 270, 152 - i * 26, Math.PI, P8T); p.strokeStyle = AL8(TH.ac, 0.07); p.lineWidth = 9; p.stroke();
    }
    p.save(); p.globalAlpha = 0.13; p.font = '900 40px ui-rounded,"Trebuchet MS",system-ui,sans-serif';
    p.textAlign = 'center'; p.fillStyle = TH.ac2; p.fillText(M === 'espacio' ? 'ÓRBITA' : 'SÓTANO', 202, 486); p.restore();
  });
  for (const R of T.rails) {
    const path = (p) => { p.moveTo(R.p[0].x, R.p[0].y); for (let i = 1; i < R.p.length; i++) p.lineTo(R.p[i].x, R.p[i].y); };
    g.beginPath(); path(g); g.strokeStyle = AL8(P8OUT, 0.5); g.lineWidth = 30; g.stroke();
    g.beginPath(); path(g); g.strokeStyle = DK8(TH.ac, 0.25); g.lineWidth = 25; g.stroke();
    g.beginPath(); path(g); g.strokeStyle = AL8(TH.rail, 0.16); g.lineWidth = 15; g.stroke();
    g.beginPath(); g.arc(R.p[0].x, R.p[0].y, 15, 0, P8T); g.fillStyle = AL8(TH.ac2, 0.3); g.fill();
  }
  for (const O of T.roll) {
    g.beginPath(); g.arc(O.x, O.y, O.r, 0, P8T); g.fillStyle = AL8(TH.lamp, 0.95); g.fill();
    g.strokeStyle = AL8(P8OUT, 0.55); g.lineWidth = 2; g.stroke();
  }
  for (const Mg of T.mag) { const s = magSpr(); g.drawImage(s, Mg.x - s.ox, Mg.y - s.oy, s.iw, s.ih); }
  for (const HO of T.holes) { const s = holeSpr(); g.drawImage(s, HO.x - s.ox, HO.y - s.oy, s.iw, s.ih); }
  /* paredes: un ÚNICO trazo continuo (silueta sin contornos interiores) */
  const walls = (p) => { for (const s of T.segs) { p.moveTo(s.x1, s.y1); p.lineTo(s.x2, s.y2); } };
  g.beginPath(); walls(g); g.strokeStyle = P8OUT; g.lineWidth = 11; g.stroke();
  g.beginPath(); walls(g); g.strokeStyle = TH.rail; g.lineWidth = 7; g.stroke();
  g.beginPath(); walls(g); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2.6; g.stroke();
  for (const F of T.fl) { g.beginPath(); g.arc(F.x, F.y, 6, 0, P8T); g.fillStyle = P8OUT; g.fill(); }
  g.beginPath(); rr8(g, 14, H - 46, W - 28, 42, 16); g.fillStyle = DK8(TH.wood, 0.35); g.fill();
  return q;
}

/* ===== reglas ================================================================================
 * Misiones encadenadas: cada una sube el multiplicador. En el Sótano el ciclo se repite (partida
 * de puntuación); en el Espacial la cuarta es el «asalto al núcleo» y termina el juego de verdad. */
const MIS = M === 'espacio' ? [
  { t: 'Tres órbitas completas', n: 3, ev: 'orb', tip: 'Pasa por los carriles laterales' },
  { t: 'Alimenta al agujero negro', n: 3, ev: 'hole', tip: 'Cuela la bola en el agujero' },
  { t: 'Derriba al jefe orbital', n: 5, ev: 'boss', boss: 1, mag: 1, tip: 'Golpéalo cinco veces' },
  { t: 'Asalto al núcleo', n: 8, ev: 'jack', mb: 3, final: 1, tip: 'Ocho golpes con tres bolas' }
] : [
  { t: 'Calienta las setas', n: 12, ev: 'bump', tip: 'Golpea las setas del centro' },
  { t: 'Sube por la rampa', n: 3, ev: 'rail', tip: 'Entra en la rampa con fuerza' },
  { t: 'Tumba las cuatro dianas', n: 1, ev: 'bank', tip: 'Baja el banco entero' },
  { t: '¡Multibola!', n: 10, ev: 'jack', mb: 3, tip: 'Diez golpes con tres bolas' }
];
const LET = M === 'espacio' ? ['orbI', 'alto', 'orbD'] : ['k', 'u', 'b'];
const LETN = M === 'espacio' ? ['O', 'R', 'B'] : ['K', 'U', 'B'];
const GID = CFG.id || ('pinball-' + M);

let T = PB.build(M, 1), S = PB.newState(T);
let seats = [], cur = 0, msg = '', msgT = 0, chg = 0, wait = 0, tiltM = 0, tilted = 0, mbPend = 0, spin = 0, over = 0;
const BALLS = () => 3 + (k.D.life ? 1 : 0);
const ST = () => seats[cur] || seats[0];
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const hp = (key) => (k.party ? k.pheld(ST().p, key) : k.held.has(key));
const hh = (key) => (k.party ? k.phit(ST().p, key) : k.hit.has(key));

function note(t) { msg = t; msgT = 2.4; }
function add(n) { const s = ST(); s.score += Math.round(n * s.mult); }
function applyMission() {
  const m = MIS[ST().mis];
  if (T.boss) { T.boss.on = m.boss ? 1 : 0; T.boss.hp = m.boss ? m.n : 0; }
  for (const g of T.mag) g.on = m.mag ? 1 : 0;
  mbPend = m.mb ? 1 : 0;
}
function newBall() {
  S = PB.newState(T);
  for (const g of T.tg) g.down = 0;
  tiltM = 0; tilted = 0; chg = 0; wait = 0;
  applyMission();
}
function reset() {
  over = 0;
  T = PB.build(M, k.dif); TBL = bakeTable(T);
  const np = k.party ? Math.max(1, k.party.length) : 1;
  seats = k.players(np).map((q) => ({ p: q.p, name: q.name, score: 0, ball: 1, mis: 0, prog: 0, mult: 1, let: [0, 0, 0], extra: 0, end: 0, win: 0 }));
  cur = 0; msgT = 0;
  newBall();
  note(seats.length > 1 ? ('Turno de ' + ST().name) : ('Bola 1 de ' + BALLS()));
}
function gameOver() {
  over = 1;
  if (seats.length > 1) { k.podium(seats.map((s) => ({ p: s.p, score: s.score, name: s.name })), { fmt: (v) => fmt(v) + ' puntos' }); return; }
  const s = ST();
  if (s.win) k.win('¡Núcleo destruido!', TH.ac2, 'Has terminado el asalto al núcleo.<br>Puntos: ' + fmt(k.best(GID, s.score)) + '<br>Toca para jugar otra vez', s.score);
  else k.lose(GID, s.score, 'Fin de la partida', 'Multiplicador ×' + s.mult);
}
function nextTurn() {
  if (seats.every((s) => s.end)) return gameOver();
  let i = cur;
  for (let n = 0; n < seats.length; n++) { i = (i + 1) % seats.length; if (!seats[i].end) break; }
  cur = i; newBall();
  note(seats.length > 1 ? ('Turno de ' + ST().name + ' · bola ' + ST().ball) : ('Bola ' + ST().ball + ' de ' + BALLS()));
}
function endBall() {
  const s = ST();
  if (s.extra > 0 && !s.end) { s.extra--; note('¡Bola extra!'); k.sfx('coin'); newBall(); return; }
  s.ball++;
  if (s.ball > BALLS()) s.end = 1;
  nextTurn();
}
function bankCheck() {
  const bank = T.tg.filter((g) => g.id[0] === 'd');
  if (!bank.every((g) => g.down > 0)) return 0;
  add(2500); k.sfx('win'); k.burst(202, 400, TH.ac2, 22, 240);
  for (const g of bank) g.down = 0;
  return 1;
}
function misHit(kind, x, y) {
  const s = ST(), m = MIS[s.mis];
  if (m.ev !== kind || s.end) return;
  s.prog++;
  if (s.prog < m.n) { if (m.n > 3) note(m.t + ' · ' + s.prog + '/' + m.n); return; }
  s.prog = 0; add(4000); s.mult = Math.min(9, s.mult + 1);
  k.confetti(TH.ac2, 40); k.sfx('win'); k.flash('rgba(255,255,255,.25)');
  k.float('¡MISIÓN!', x == null ? 202 : x, y == null ? 300 : y - 18, TH.ac2);
  if (m.final) { s.win = 1; s.end = 1; add(20000); note('¡Núcleo destruido!'); nextTurn(); return; }
  s.mis = (s.mis + 1) % MIS.length;
  applyMission();
  note('Nueva misión: ' + MIS[s.mis].t);
}
function jackHit(e) { if (MIS[ST().mis].ev === 'jack') { add(900); misHit('jack', e.x, e.y); } }
function roll(id, x, y) {
  const s = ST(), i = LET.indexOf(id);
  if (i >= 0) {
    if (!s.let[i]) { s.let[i] = 1; k.sfx('coin'); add(250); if (s.let.every((v) => v)) note('¡Bola extra iluminada!'); }
    if (M === 'espacio') misHit('orb', x, y);
    return;
  }
  if (id === 'extra') {
    if (s.let.every((v) => v)) { s.let = [0, 0, 0]; s.extra++; add(3000); k.confetti(TH.ac2, 50); k.sfx('win'); note('¡BOLA EXTRA!'); }
    else add(400);
    return;
  }
  add(300);
}
function pump() {
  for (let i = 0; i < S.ev.length; i++) {
    const e = S.ev[i];
    if (e.t === 'bump') { add(110); k.burst(e.x, e.y, TH.ac2, 5, 130); k.sfx('pop'); misHit('bump', e.x, e.y); jackHit(e); }
    else if (e.t === 'sling') { add(60); k.sfx('click'); }
    else if (e.t === 'target') { const g = T.tg[e.i]; g.down = 1e9; add(340); k.sfx('hit'); k.float('+' + 340 * ST().mult, e.x, e.y - 16, TH.ac2); jackHit(e); if (bankCheck()) misHit('bank', e.x, e.y); }
    else if (e.t === 'rail') { k.sfx('shoot'); }
    else if (e.t === 'railend') { add(1500); k.float('¡RAMPA!', e.x, e.y - 22, TH.ac); k.sfx('coin'); misHit('rail', e.x, e.y); jackHit(e); }
    else if (e.t === 'hole') { k.sfx('hurt'); k.shake(4); }
    else if (e.t === 'holeout') { add(2200); k.burst(e.x, e.y, TH.ac2, 16, 230); k.sfx('explode'); misHit('hole', e.x, e.y); jackHit(e); }
    else if (e.t === 'boss') { add(1200); k.shake(5); k.burst(e.x, e.y, TH.hot, 14, 220); k.sfx('explode'); if (T.boss) { T.boss.hp--; if (T.boss.hp <= 0) T.boss.on = 0; } misHit('boss', e.x, e.y); }
    else if (e.t === 'roll') { roll(e.id, e.x, e.y); }
    else if (e.t === 'flip') { k.sfx('click'); }
    else if (e.t === 'launch') { k.sfx('shoot'); }
    else if (e.t === 'drain') { k.sfx('lose'); k.shake(3); }
  }
  S.ev.length = 0;
}

/* ===== bucle ================================================================================ */
function upd(dt) {
  if (!k.gate(reset)) return;
  if (over) return;
  if (msgT > 0) msgT -= dt;
  spin += dt;
  const L = hp('left'), R = hp('right');
  T.fl[0].on = L ? 1 : 0; T.fl[1].on = R ? 1 : 0;
  S.flipOff = tilted ? 1 : 0;
  /* muelle: se tensa manteniendo A (o abajo) y se suelta al levantar el dedo */
  if (PB.canLaunch(T, S)) {
    wait += dt;
    if (hp('a') || hp('down')) chg = Math.min(1, chg + dt * 1.15);
    else if (chg > 0.05) { PB.launch(T, S, chg); chg = 0; wait = 0; }
    else if (wait > 14) { PB.launch(T, S, 0.72); wait = 0; }
  } else { chg = 0; wait = 0; }
  /* empujón de mesa con falta: tres seguidos y los flippers se bloquean hasta la próxima bola */
  if (hh('b') && !tilted) {
    PB.nudge(S, L ? -1 : R ? 1 : (Math.random() < 0.5 ? -1 : 1));
    k.shake(4); k.sfx('click'); tiltM += 0.38;
    if (tiltM >= 1) { tilted = 1; note('¡FALTA! Flippers bloqueados'); k.sfx('hurt'); k.flash('rgba(255,90,90,.3)'); }
  }
  tiltM = Math.max(0, tiltM - dt * 0.3);
  /* multibola: se sueltan las bolas extra en cuanto la primera está en juego */
  if (mbPend && S.balls.length === 1 && !S.balls[0].lane) {
    const m = MIS[ST().mis];
    for (let i = 1; i < (m.mb || 1); i++) PB.addBall(T, S, 150 + i * 104, 250, (i - 1.5) * 90, 120);
    mbPend = 0; note('¡MULTIBOLA!'); k.sfx('start'); k.confetti(TH.ac, 40);
  }
  PB.step(T, S, dt);
  pump();
  if (!S.balls.length && !over) endBall();
}

/* ===== dibujo =============================================================================== */
function wings() {
  if (k.ox < 4) return;
  const w = k.ox + 4;
  c.fillStyle = DK8(TH.wood, 0.55); c.fillRect(0, 0, w, k.H); c.fillRect(k.W - w, 0, w, k.H);
  c.fillStyle = AL8(TH.ac, 0.1);
  for (let y = -40; y < k.H; y += 46) { c.fillRect(0, y + (y % 92 ? 0 : 8), w - 6, 4); c.fillRect(k.W - w + 6, y, w - 6, 4); }
}
function drawLive() {
  const s = ST();
  /* luces de los carriles */
  for (let i = 0; i < T.roll.length; i++) {
    const O = T.roll[i], li = LET.indexOf(O.id), lit = li >= 0 ? s.let[li] : (O.id === 'extra' ? s.let.every((v) => v) : 0);
    if (lit) blit(haloSpr(TH.ac2, O.r + 8), O.x, O.y);
    c.beginPath(); c.arc(O.x, O.y, O.r - 4, 0, P8T); c.fillStyle = lit ? TH.ac2 : AL8(TH.lamp, 0.9); c.fill();
    if (li >= 0) k.text(LETN[li], O.x, O.y - 8, 15, lit ? P8OUT : AL8(TH.rail, 0.5), 'center');
    else if (O.id === 'extra') k.text('EX', O.x, O.y - 7, 12, lit ? P8OUT : AL8(TH.rail, 0.5), 'center');
  }
  /* dianas en pie */
  for (const g of T.tg) {
    if (g.down > 0) continue;
    const a = Math.atan2(g.y2 - g.y1, g.x2 - g.x1), len = Math.hypot(g.x2 - g.x1, g.y2 - g.y1);
    c.save(); c.translate(g.x1, g.y1); c.rotate(a); c.scale(len / 42, 1);
    const q = tgtSpr(MIS[s.mis].ev === 'bank' || MIS[s.mis].ev === 'jack' ? 1 : 0);
    c.drawImage(q, -q.ox, -q.oy, q.iw, q.ih); c.restore();
  }
  /* imanes encendidos */
  for (const Mg of T.mag) if (Mg.on) blit(haloSpr(TH.ac, 26), Mg.x, Mg.y);
  /* agujero negro */
  for (const HO of T.holes) { blit(haloSpr(TH.ac2, 22), HO.x, HO.y); blit(swirlSpr(), HO.x, HO.y, spin * 2.2); }
  /* setas */
  for (const P of T.bm) blit(bumpSpr(P.r, P.lit > 0 ? 1 : 0), P.x, P.y, 0, P.lit > 0 ? 1.08 : 1);
  /* jefe orbital */
  if (T.boss && T.boss.on) {
    blit(bossSpr(), T.boss.x, T.boss.y + Math.sin(spin * 2) * 3);
    for (let i = 0; i < T.boss.max; i++) {
      c.beginPath(); c.arc(T.boss.x - (T.boss.max - 1) * 6 + i * 12, T.boss.y - 40, 4, 0, P8T);
      c.fillStyle = i < T.boss.hp ? TH.hot : AL8(TH.lamp, 0.9); c.fill();
    }
  }
  /* flippers */
  for (let i = 0; i < 2; i++) {
    const F = T.fl[i], q = flipSpr(tilted ? '#7a7490' : (i ? TH.ac2 : TH.ac));
    c.save(); c.translate(F.x, F.y); if (F.s < 0) c.scale(-1, 1); c.rotate(F.a);
    c.drawImage(q, -q.ox, -q.oy, q.iw, q.ih); c.restore();
  }
  /* muelle */
  const py = T.plung.y + 12 + chg * 22;
  c.strokeStyle = AL8(TH.rail, 0.8); c.lineWidth = 3;
  c.beginPath(); c.moveTo(T.plung.x, py); c.lineTo(T.plung.x, H - 14); c.stroke();
  blit(plungSpr(), T.plung.x, py);
  /* bolas */
  const bq = ballSpr();
  for (const b of S.balls) {
    if (b.hold > 0) continue;
    if (b.rail != null) { c.globalAlpha = 0.35; blit(bq, b.x + 5, b.y + 7, 0, 0.9); c.globalAlpha = 1; blit(bq, b.x, b.y, 0, 1.1); }
    else blit(bq, b.x, b.y);
  }
}
function clipTxt(t, maxw, size) {
  c.font = '700 ' + size + 'px ui-rounded,"Trebuchet MS",system-ui,sans-serif';
  if (c.measureText(t).width <= maxw) return t;
  let s = t;
  while (s.length > 2 && c.measureText(s + '…').width > maxw) s = s.slice(0, -1);
  return s + '…';
}
function fitSize(t, maxw, size, min) {
  let f = size;
  while (f > min) { c.font = '700 ' + f + 'px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; if (c.measureText(t).width <= maxw) break; f--; }
  return f;
}
function bar(x, y, w, h, v, col) {
  c.beginPath(); rr8(c, x, y, w, h, h / 2); c.fillStyle = AL8(P8OUT, 0.55); c.fill();
  if (v > 0) { c.beginPath(); rr8(c, x + 1.5, y + 1.5, Math.max(h - 3, (w - 3) * Math.min(1, v)), h - 3, (h - 3) / 2); c.fillStyle = col; c.fill(); }
}
function panel(x, y, w, h) { c.beginPath(); rr8(c, x, y, w, h, 14); c.fillStyle = AL8(P8OUT, 0.66); c.fill(); }
function hud() {
  const s = ST(), m = MIS[s.mis], wide = k.ox >= 150;
  const mt = m.t + (m.n > 1 ? ' · ' + s.prog + '/' + m.n : '');
  if (wide) {
    /* pantallas anchas: marcadores en las bandas laterales, la mesa queda limpia */
    const pw = Math.min(k.ox - 24, 250), px = k.ox - 12 - pw, qx = k.W - k.ox + 12, py = k.oy + 40;
    panel(px, py, pw, 52 + seats.length * 26);
    k.text('PUNTOS', px + 14, py + 10, 12, AL8(TH.rail, 0.7));
    k.text(fmt(s.score), px + 14, py + 24, 26, '#fff');
    for (let i = 0; i < seats.length; i++) {
      const q = seats[i];
      k.text(clipTxt(q.name, pw - 100, 14), px + 14, py + 56 + i * 26, 14, i === cur ? k.pcol(q.p) : AL8(TH.rail, 0.65));
      k.text(fmt(q.score), px + pw - 14, py + 56 + i * 26, 14, i === cur ? '#fff' : AL8(TH.rail, 0.65), 'right');
    }
    panel(qx, py, pw, 120);
    k.text('MISIÓN', qx + 14, py + 10, 12, AL8(TH.rail, 0.7));
    k.text(clipTxt(m.t, pw - 28, 16), qx + 14, py + 26, 16, TH.ac2);
    bar(qx + 14, py + 50, pw - 28, 10, m.n > 1 ? s.prog / m.n : 0, TH.ac2);
    k.text(clipTxt(m.tip, pw - 28, 12), qx + 14, py + 66, 12, AL8(TH.rail, 0.7));
    k.text('Bola ' + Math.min(s.ball, BALLS()) + '/' + BALLS(), qx + 14, py + 90, 15, '#fff');
    k.text('×' + s.mult, qx + pw - 14, py + 88, 20, TH.ac2, 'right');
  } else {
    /* pantallas estrechas: franja superior de la mesa, dejando libre el centro (pausa/sonido) */
    k.text(fmt(s.score), k.ox + 16, k.oy + 6, 22, '#fff');
    k.text(seats.length > 1 ? clipTxt(s.name, 110, 12) : 'PUNTOS', k.ox + 16, k.oy + 30, 12, seats.length > 1 ? k.pcol(s.p) : AL8(TH.rail, 0.7));
    k.text('×' + s.mult, k.ox + W - 16, k.oy + 6, 20, TH.ac2, 'right');
    k.text('Bola ' + Math.min(s.ball, BALLS()) + '/' + BALLS(), k.ox + W - 16, k.oy + 30, 12, AL8(TH.rail, 0.8), 'right');
    const y = k.oy + H - 40, fs = fitSize(mt, W - 60, 15, 11);
    k.text(clipTxt(mt, W - 60, fs), k.ox + W / 2, y, fs, TH.ac2, 'center');
    bar(k.ox + 40, y + 20, W - 80, 8, m.n > 1 ? s.prog / m.n : 0, TH.ac2);
  }
  /* medidor de falta */
  if (tiltM > 0.02 || tilted) {
    const bx = wide ? k.W - k.ox + 12 : k.ox + W / 2 - 40, by = wide ? k.oy + 176 : k.oy + H - 60;
    bar(bx, by, 80, 7, tilted ? 1 : tiltM, tilted ? '#ff6b6b' : '#ffc94d');
    k.text(tilted ? 'FALTA' : 'Empujón', bx + 84, by - 4, 11, tilted ? '#ff6b6b' : '#ffc94d');
  }
  /* aviso central (misión, turno, multibola) */
  if (msgT > 0) {
    const a = Math.min(1, msgT * 2), fs = fitSize(msg, k.W - 60, 20, 13);
    c.globalAlpha = a;
    const w = c.measureText(msg).width + 34;
    panel(k.W / 2 - w / 2, k.oy + 150, w, 38);
    k.text(msg, k.W / 2, k.oy + 159, fs, '#fff', 'center');
    c.globalAlpha = 1;
  }
}
function draw() {
  k.clear(TH.bg);
  wings();
  c.save(); c.translate(k.ox, k.oy);
  c.drawImage(TBL, 0, 0, W, H);
  drawLive();
  c.restore();
  hud();
}

k.onParty = () => { if (k.st !== 'play') reset(); };
reset();
k.run(upd, draw);
k.show(CFG.title, CFG.help);
/* ganchos de prueba (bots de Playwright) */
window.__g = {
  mode: M, W: W, H: H,
  get T() { return T; }, get S() { return S; }, get seats() { return seats; }, get cur() { return cur; },
  get score() { return ST().score; }, get mis() { return ST().mis; }, get prog() { return ST().prog; },
  get balls() { return S.balls.length; }, get ball() { return ST().ball; }, get tilt() { return tilted; },
  get msg() { return msg; }, get over() { return over; },
  launch: (p) => PB.launch(T, S, p == null ? 0.8 : p),
  put: (x, y, vx, vy) => { S.balls.length = 0; PB.addBall(T, S, x, y, vx || 0, vy || 0); }
};
