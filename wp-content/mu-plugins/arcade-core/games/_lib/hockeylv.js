/* Torneo de air-hockey: 20 rivales escritos a mano (plan Friv / docs/VARA.md).
 * Solo lo usa el juego «air-hockey» en un jugador; el modo tele y ping-pong-reflex no lo tocan.
 *
 * CAMPOS de cada rival
 *   n    nombre del rival (se ve en el marcador y en la tarjeta del nivel)
 *   e    estilo, tal cual se lee en pantalla
 *   i    la idea nueva que estrena el nivel (tarjeta de inicio)
 *   to   goles del partido (quien llega antes, gana)
 *   s2   goles ENCAJADOS como máximo para la 2.ª estrella
 *   s3   goles encajados como máximo para la 3.ª (siempre menor que s2)
 *   tl   segundos de partido; si se acaba el reloj con el marcador por debajo, se pierde (0 = sin reloj)
 *   sp   velocidad del mazo rival, en factor sobre 330 px/s
 *   hm   profundidad de su posición de espera (y de mesa; su portería está en y=12)
 *   ps   hasta dónde baja a robar el disco (y de mesa; su mitad acaba en 320 y la portería del jugador en 640)
 *   aim  a dónde tira: 'centro' | 'esquina' | 'banda' (rebota en la pared) | 'mixto'
 *   err  error de puntería en px (cuanto más alto, más falla)
 *   rt   retardo de reacción en segundos
 *   gw   ancho de las porterías (110 normal, 94 estrecha)
 *   ice  rozamiento de la mesa (0.25 normal, 0.09 hielo: el disco no se para)
 *   dual 1 = se juega con DOS discos a la vez
 *   pst  obstáculos: [x, y, radio, amplitud, periodo] — amplitud 0 = fijo, >0 = va y viene en x
 *   tip  consejo corto del nivel
 *
 * Los tres niveles de dificultad no cambian la mesa ni el rival: mueven el margen (k.D.cpu ajusta
 * la velocidad del rival) y los objetivos de estrella (±1 gol encajado). La ruta es la misma.
 *
 * Todo el bloque <SIM> es puro (sin DOM): reproduce la física del motor para que el bot de
 * referencia de scripts/hockey_bot.js pueda jugar los 20 partidos en las 3 dificultades en Node.
 */
const HOCKEYLV = {
  'air-hockey': [
    /* ---- 1-3: mesa lisa. Aprender a golpear con el mazo en movimiento. ---- */
    { n: 'Chispa', e: 'Novato', i: 'Empuja el disco con el mazo: cuanto más rápido lo muevas al golpear, más fuerte sale.', to: 3, s2: 2, s3: 0, tl: 0, sp: 0.36, hm: 70, ps: 342, aim: 'centro', err: 46, rt: 0.5, tip: 'Colócate DETRÁS del disco, en línea con la portería, y empuja hacia delante.' },
    { n: 'Muro', e: 'Defensivo', i: 'Este no sube: se planta delante de su portería. Ábrele hueco tirando desde un lado.', to: 3, s2: 2, s3: 0, tl: 0, sp: 0.42, hm: 72, ps: 350, aim: 'centro', err: 34, rt: 0.42, tip: 'Contra un muro, tira en diagonal desde la banda: no le da tiempo a cruzarse.' },
    { n: 'Vaivén', e: 'Presión', i: 'Sube a robarte el disco a tu campo. No te entretengas conduciéndolo.', to: 3, s2: 2, s3: 1, tl: 0, sp: 0.5, hm: 96, ps: 440, aim: 'centro', err: 30, rt: 0.34, tip: 'Si lo ves venir, golpea antes: un disco parado en tu campo es suyo.' },
    /* ---- 4-6: el poste. ---- */
    { n: 'Poste', e: 'De contra', i: 'NUEVO: un poste en el centro de la mesa. Tapa el tiro recto… y también el suyo.', to: 4, s2: 2, s3: 1, tl: 0, sp: 0.46, hm: 60, ps: 365, aim: 'centro', err: 32, rt: 0.4, pst: [[180, 320, 26, 0, 0]], tip: 'Con el poste en medio, los goles llegan por los lados o de rebote en la banda.' },
    { n: 'Tuerca', e: 'Defensivo', i: 'Poste y portero. Hay que fabricarse el ángulo, no vale con empujar de frente.', to: 4, s2: 2, s3: 1, tl: 0, sp: 0.46, hm: 80, ps: 365, aim: 'centro', err: 28, rt: 0.36, pst: [[180, 320, 28, 0, 0]], tip: 'Lleva el disco a una banda y cruza el tiro al palo contrario.' },
    { n: 'Chufla', e: 'Tiros cruzados', i: 'Ya no tira al centro: busca las esquinas de tu portería.', to: 4, s2: 3, s3: 1, tl: 0, sp: 0.54, hm: 74, ps: 382, aim: 'esquina', err: 26, rt: 0.34, pst: [[180, 320, 26, 0, 0]], tip: 'Contra los cruzados, espera en el centro de la portería y no te adelantes.' },
    /* ---- 7-9: portería estrecha. ---- */
    { n: 'Rendija', e: 'Defensivo', i: 'NUEVO: porterías estrechas. Cada gol hay que trabajárselo.', to: 4, s2: 2, s3: 1, tl: 0, sp: 0.42, hm: 86, ps: 370, aim: 'centro', err: 26, rt: 0.34, gw: 94, tip: 'Con la portería estrecha manda la puntería, no la fuerza.' },
    { n: 'Bandera', e: 'Rebote en banda', i: 'Tira contra la pared para que el rebote entre por el otro lado. Ojo a las bandas.', to: 4, s2: 3, s3: 1, tl: 0, sp: 0.58, hm: 80, ps: 392, aim: 'banda', err: 24, rt: 0.32, gw: 94, tip: 'Tú también puedes: apunta a la banda a media altura y el disco se cuela cruzado.' },
    { n: 'Trampa', e: 'De contra', i: 'Poste y rendija juntos: si fallas el tiro, la contra llega sola.', to: 4, s2: 3, s3: 1, tl: 0, sp: 0.58, hm: 82, ps: 360, aim: 'mixto', err: 24, rt: 0.32, gw: 94, pst: [[180, 320, 26, 0, 0]], tip: 'No te vayas arriba con el disco suelto: vuelve a tu campo antes de tirar.' },
    /* ---- 10-12: dos discos y el reloj. ---- */
    { n: 'Gemelo', e: 'Presión', i: 'NUEVO: dos discos en la mesa a la vez. Vigila los dos.', to: 5, s2: 4, s3: 2, tl: 0, sp: 0.58, hm: 92, ps: 430, aim: 'centro', err: 26, rt: 0.3, dual: 1, tip: 'Con dos discos, primero defiende el que viene y después ataca con el otro.' },
    { n: 'Doblete', e: 'Tiros cruzados', i: 'Dos discos y el poste. El caos es parte del plan.', to: 5, s2: 4, s3: 2, tl: 155, sp: 0.6, hm: 86, ps: 400, aim: 'esquina', err: 24, rt: 0.3, dual: 1, pst: [[180, 320, 26, 0, 0]], tip: 'Quédate en el centro de tu portería: desde ahí llegas a los dos discos.' },
    { n: 'Reloj', e: 'De contra', i: 'NUEVO: reloj de partido. Si se acaba sin llegar a los goles, pierdes.', to: 4, s2: 3, s3: 1, tl: 125, sp: 0.6, hm: 88, ps: 400, aim: 'mixto', err: 24, rt: 0.3, dual: 1, tip: 'Con reloj hay que tirar: defender de más es perder despacio.' },
    /* ---- 13-15: hielo. ---- */
    { n: 'Escarcha', e: 'Presión', i: 'NUEVO: hielo. El disco no se frena: todo va el doble de rápido.', to: 5, s2: 3, s3: 1, tl: 0, sp: 0.6, hm: 94, ps: 430, aim: 'centro', err: 24, rt: 0.28, ice: 0.09, tip: 'En hielo basta un toque suave: si pegas fuerte, el rebote vuelve contra ti.' },
    { n: 'Deslizo', e: 'Rebote en banda', i: 'Hielo y rendija. Los rebotes llegan enteros a la portería.', to: 4, s2: 3, s3: 1, tl: 155, sp: 0.54, hm: 92, ps: 420, aim: 'banda', err: 22, rt: 0.28, gw: 94, ice: 0.09, tip: 'Sigue el disco con el mazo pegado: en hielo no hay segundas oportunidades.' },
    { n: 'Cometa', e: 'Tiros cruzados', i: 'Hielo con poste: el disco rebota en el poste y sale por donde no miras.', to: 5, s2: 4, s3: 2, tl: 0, sp: 0.62, hm: 82, ps: 405, aim: 'esquina', err: 22, rt: 0.28, ice: 0.1, pst: [[180, 320, 26, 0, 0]], tip: 'Usa el poste a tu favor: golpea de refilón y el disco sale abierto hacia el palo.' },
    /* ---- 16-19: postes que se mueven. ---- */
    { n: 'Péndulo', e: 'De contra', i: 'NUEVO: el poste se mueve de lado a lado. El pasillo se abre y se cierra.', to: 4, s2: 4, s3: 2, tl: 110, sp: 0.56, hm: 90, ps: 400, aim: 'mixto', err: 22, rt: 0.28, pst: [[180, 320, 24, 70, 5.0]], tip: 'Espera a que el poste se aparte y tira en ese instante.' },
    { n: 'Aspas', e: 'Rebote en banda', i: 'Dos postes móviles, uno en cada mitad. Ya no hay líneas rectas.', to: 5, s2: 4, s3: 2, tl: 0, sp: 0.64, hm: 82, ps: 400, aim: 'banda', err: 22, rt: 0.26, pst: [[180, 240, 22, 84, 4.4], [180, 400, 22, 84, 6.1]], tip: 'Tira desde cerca: cuanto más corto el viaje, menos postes en medio.' },
    { n: 'Vórtice', e: 'Presión', i: 'Hielo y dos discos: el partido más rápido del torneo.', to: 5, s2: 5, s3: 2, tl: 135, sp: 0.64, hm: 92, ps: 435, aim: 'centro', err: 22, rt: 0.26, ice: 0.09, dual: 1, tip: 'No persigas los dos discos: quédate en la boca de tu portería y despeja.' },
    { n: 'Centinela', e: 'Defensivo', i: 'Rendija, poste y dos discos. El último antes de la final.', to: 4, s2: 4, s3: 1, tl: 185, sp: 0.5, hm: 84, ps: 380, aim: 'esquina', err: 20, rt: 0.26, gw: 94, dual: 1, pst: [[180, 320, 26, 0, 0]], tip: 'Contra un centinela hay que fabricar el hueco: mueve el disco de banda a banda.' },
    /* ---- 20: la final. ---- */
    { n: 'Prisma', e: 'Campeón', i: 'LA FINAL: rendija, hielo, dos discos y dos postes moviéndose. Y cambia de estilo cada 15 s.', to: 5, s2: 5, s3: 2, tl: 175, sp: 0.62, hm: 80, ps: 420, aim: 'jefe', err: 20, rt: 0.24, gw: 94, ice: 0.1, dual: 1, pst: [[180, 250, 22, 88, 4.6], [180, 392, 22, 88, 6.4]], tip: 'Mira el rótulo del estilo: cuando esté en «Presión», tu portería se queda sola.' },
  ],
};

/* <SIM> --------------------------------------------------------------------------------
 * Zona pura: misma física y misma IA que el motor, sin DOM. La usa scripts/hockey_bot.js.
 * Si se toca la física de paddle.js (HK), hay que tocarla aquí igual. */
const HKSIM = (() => {
  const RAIL = 12, X0 = RAIL, X1 = 348, Y0 = RAIL, Y1 = 628, MR = 28, PR = 16, CAP = 780;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  /* generador determinista (para poder repetir un partido) */
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* posición del poste i en el instante t */
  const postX = (p, t) => (p[3] ? p[0] + Math.sin((t / p[4]) * 6.2832) * p[3] : p[0]);

  /* a dónde apunta el rival (portería del jugador, abajo en y=640) */
  function aimAt(lv, style, rnd, gw) {
    const half = gw / 2 - 10;
    if (style === 'esquina') return [180 + (rnd() < 0.5 ? -1 : 1) * half, 660];
    if (style === 'banda') return [rnd() < 0.5 ? X0 - 120 : X1 + 120, 700]; /* punto virtual tras la pared → rebote */
    if (style === 'mixto') return rnd() < 0.5 ? [180 + (rnd() < 0.5 ? -1 : 1) * half, 660] : [180, 660];
    return [180, 660];
  }

  /* Un partido completo. pol = política del jugador (bot de referencia).
   * Devuelve {win, me, ai, t}. */
  function match(lv, dif, seed, opt) {
    opt = opt || {};
    const rnd = rng(seed);
    const gw = lv.gw || 110, fr = lv.ice || 0.25, posts = lv.pst || [];
    const DC = dif === 0 ? -1 : dif === 2 ? 1 : 0;            /* k.D.cpu */
    const cpuLv = clamp(0.35 + 0 + DC * 0.09, 0.15, 2);        /* mismo arranque que el motor */
    const me = { x: 180, y: 560, px: 180, py: 560 }, ai = { x: 180, y: 80, px: 180, py: 80 };
    const N = lv.dual ? 2 : 1;
    const mk = (i) => ({ x: 180 + (N > 1 ? (i ? 60 : -60) : 0), y: 320, vx: (rnd() - 0.5) * 240, vy: (i ? 1 : -1) * 60, live: 1, wait: 0.9, sx: 180, sy: 320, sT: 0, stall: 0 });
    let P = [], sMe = 0, sAi = 0, t = 0, aiT = 0, aim = [180, 660], bossT = 0, bossI = 0;
    for (let i = 0; i < N; i++) P.push(mk(i));
    const dt = 1 / 60, TL = lv.tl || 0;
    const styles = ['centro', 'esquina', 'banda', 'centro'];
    while (t < 300) {
      t += dt;
      if (TL && t > TL) break;
      const lvl = clamp(0.35 + Math.min(0.32, (sMe + sAi) * 0.026) + DC * 0.09, 0.15, 2) * (lv.sp / 0.36) * 0.36 / 0.36;
      const sp = 330 * clamp(lv.sp + Math.min(0.14, (sMe + sAi) * 0.012) + DC * 0.08, 0.15, 1.1);
      let style = lv.aim;
      if (style === 'jefe') { bossT += dt; if (bossT > 15) { bossT = 0; bossI++; } style = styles[bossI % styles.length]; }
      /* ------- postes ------- */
      const PS = posts.map((p) => ({ x: postX(p, t), y: p[1], r: p[2] }));
      /* ------- jugador (bot de referencia) ------- */
      me.px = me.x; me.py = me.y;
      const tgt = pol(P, me, ai, PS, gw, opt);
      me.x += clamp(tgt[0] - me.x, -420 * dt, 420 * dt);
      me.y += clamp(tgt[1] - me.y, -420 * dt, 420 * dt);
      me.x = clamp(me.x, X0 + MR, 360 - X0 - MR); me.y = clamp(me.y, 320 + MR * 0.7, Y1 - MR);
      /* ------- rival ------- */
      ai.px = ai.x; ai.py = ai.y;
      aiT -= dt;
      const near = P.filter((q) => q.live).sort((a, b) => a.y - b.y)[0] || P[0];
      const danger = P.filter((q) => q.live).sort((a, b) => (a.vy < 0 ? a.y : 1e4) - (b.vy < 0 ? b.y : 1e4))[0] || near;
      let ax, ay;
      const chase = near && near.y < lv.ps && near.vy > -30;
      if (chase) {
        if (aiT <= 0) { aim = aimAt(lv, style, rnd, gw); aiT = lv.rt; }
        const dx = aim[0] - near.x, dy = aim[1] - near.y, d = Math.hypot(dx, dy) || 1;
        const ex = (rnd() - 0.5) * lv.err;
        /* detrás del disco y alineado → EMPUJA a través; si no, primero se coloca detrás */
        const bx = near.x - (dx / d) * (MR + PR) * 0.95, by = near.y - (dy / d) * (MR + PR) * 0.95;
        const lined = Math.hypot(ai.x - bx, ai.y - by) < 16 || ((ai.x - near.x) * dx + (ai.y - near.y) * dy) / d < -(MR + PR) * 0.6;
        if (lined) { ax = near.x + (dx / d) * 90 + ex; ay = near.y + (dy / d) * 90; } else { ax = bx + ex; ay = by; }
      } else {
        const src = danger && danger.vy < 0 ? danger : near;
        ax = 180 + clamp((src.x - 180) * 0.8, -gw / 2 - 18, gw / 2 + 18); ay = lv.hm;
      }
      ai.x += clamp(ax - ai.x, -sp * dt, sp * dt); ai.y += clamp(ay - ai.y, -sp * dt, sp * dt);
      ai.x = clamp(ai.x, X0 + MR, 360 - X0 - MR); ai.y = clamp(ai.y, Y0 + MR, 300);
      /* ------- discos ------- */
      const steps = 4, h = dt / steps;
      for (const p of P) {
        if (!p.live) { p.wait -= dt; if (p.wait <= 0) { Object.assign(p, mk(0), { live: 1 }); } continue; }
        for (let s = 0; s < steps; s++) {
          p.x += p.vx * h; p.y += p.vy * h; p.vx *= 1 - fr * h; p.vy *= 1 - fr * h;
          if (p.x < X0 + PR || p.x > X1 - PR) { p.vx *= -1; p.x = clamp(p.x, X0 + PR, X1 - PR); }
          const inG = Math.abs(p.x - 180) < gw / 2 - 4;
          if (p.y < Y0 + PR) { if (inG) { sMe++; p.live = 0; p.wait = 0.8; break; } p.vy = Math.abs(p.vy); p.y = Y0 + PR; }
          if (p.y > Y1 - PR) { if (inG) { sAi++; p.live = 0; p.wait = 0.8; break; } p.vy = -Math.abs(p.vy); p.y = Y1 - PR; }
          for (const o of PS) { const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy); if (d < o.r + PR && d > 0) { const nx = dx / d, ny = dy / d; p.x = o.x + nx * (o.r + PR); p.y = o.y + ny * (o.r + PR); const vn = p.vx * nx + p.vy * ny; if (vn < 0) { p.vx -= 1.75 * vn * nx; p.vy -= 1.75 * vn * ny; } } }
          for (const m of [me, ai]) {
            const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
            if (d < MR + PR && d > 0) {
              const nx = dx / d, ny = dy / d; p.x = m.x + nx * (MR + PR); p.y = m.y + ny * (MR + PR);
              const mvx = (m.x - m.px) / dt, mvy = (m.y - m.py) / dt, rv = (p.vx - mvx) * nx + (p.vy - mvy) * ny;
              if (rv < 0) { p.vx -= 1.9 * rv * nx; p.vy -= 1.9 * rv * ny; }
              const spd = Math.hypot(p.vx, p.vy); if (spd > CAP) { p.vx *= CAP / spd; p.vy *= CAP / spd; }
              /* el mazo no puede empujar el disco fuera de la mesa (si no, se queda pillado en la esquina) */
              const cx = clamp(p.x, X0 + PR, X1 - PR), cy = Math.abs(p.x - 180) < gw / 2 - 4 ? p.y : clamp(p.y, Y0 + PR, Y1 - PR);
              if (cx !== p.x || cy !== p.y) { p.x = cx; p.y = cy; m.x = p.x - nx * (MR + PR); m.y = p.y - ny * (MR + PR); }
            }
          }
        }
      }
      /* saque neutral: un disco que lleva 3 s sin moverse de sitio (atascado en una esquina
       * o pillado contra el mazo) vuelve al centro. Misma regla en el motor. */
      for (const p of P) { if (!p.live) continue; p.sT += dt;
        if (p.sT >= 1) { p.sT = 0; if (Math.hypot(p.x - p.sx, p.y - p.sy) < 55) { if (++p.stall >= 3) { p.stall = 0; p.x = 180; p.y = 320; p.vx = (rnd() - 0.5) * 220; p.vy = (rnd() < 0.5 ? -1 : 1) * 90; } } else p.stall = 0; p.sx = p.x; p.sy = p.y; } }
      if (sMe >= lv.to || sAi >= lv.to) break;
    }
    return { win: sMe >= lv.to && sMe > sAi, me: sMe, ai: sAi, t };
  }

  /* Bot de referencia del JUGADOR: defiende la boca de su portería y, cuando el disco
   * está a tiro en su mitad, se coloca detrás alineado con la portería rival y empuja. */
  const YMIN = 320 + MR * 0.7;
  /* elige a qué punto de la portería rival tirar: el más lejos del mazo rival y sin poste en medio */
  function shotTarget(p, ai, PS, gw) {
    const half = gw / 2 - 12;
    let best = null, bs = -1e9;
    for (const gx of [180 - half, 180 - half * 0.45, 180, 180 + half * 0.45, 180 + half]) {
      let sc = Math.abs(gx - ai.x) * 1.4 - Math.abs(gx - p.x) * 0.25;
      for (const o of PS) {                                    /* ¿hay poste en la línea de tiro? */
        const dx = gx - p.x, dy = -20 - p.y, L = dx * dx + dy * dy || 1;
        const q = Math.max(0, Math.min(1, ((o.x - p.x) * dx + (o.y - p.y) * dy) / L));
        const d = Math.hypot(p.x + dx * q - o.x, p.y + dy * q - o.y);
        if (d < o.r + PR + 6) sc -= 400 - d * 3;
      }
      if (sc > bs) { bs = sc; best = gx; }
    }
    return best;
  }
  /* Bot de referencia del JUGADOR: despeja lo que viene, y cuando el disco está a tiro en su
   * mitad se coloca detrás alineado con el hueco elegido y empuja a través. */
  function pol(P, me, ai, PS, gw) {
    const live = P.filter((q) => q.live);
    if (!live.length) return [180, 560];
    const down = live.filter((q) => q.vy > 150 && q.y < 460).sort((a, b) => b.y - a.y)[0];
    if (down) {
      const tt = clamp((520 - down.y) / Math.max(1, down.vy), 0, 0.5);
      return [clamp(down.x + down.vx * tt, X0 + MR, 360 - X0 - MR), clamp(down.y + 46, YMIN, 590)];
    }
    const mine = live.filter((q) => q.y > YMIN - 26).sort((a, b) => a.y - b.y)[0];
    if (mine) {
      const gx = shotTarget(mine, ai, PS, gw);
      const dx = gx - mine.x, dy = -30 - mine.y, d = Math.hypot(dx, dy) || 1;
      const bx = mine.x - (dx / d) * (MR + PR) * 0.95, by = mine.y - (dy / d) * (MR + PR) * 0.95;
      const lined = Math.hypot(me.x - bx, me.y - by) < 18 || ((me.x - mine.x) * dx + (me.y - mine.y) * dy) / d < -(MR + PR) * 0.6;
      if (lined) return [clamp(mine.x + (dx / d) * 110, X0 + MR, 360 - X0 - MR), clamp(mine.y + (dy / d) * 110, YMIN, 600)];
      return [clamp(bx, X0 + MR, 360 - X0 - MR), clamp(by, YMIN, 600)];
    }
    const far = live.slice().sort((a, b) => a.y - b.y)[0];
    return [clamp(180 + (far.x - 180) * 0.75, X0 + MR, 360 - X0 - MR), 520];
  }
  return { match };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { HOCKEYLV, HKSIM }; /* bot de referencia en Node */
/* </SIM> */
