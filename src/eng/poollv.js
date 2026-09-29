/* Los 20 desafíos de mesa de Pool Break (plan Friv · la vara). Solo los usa el juego 'pool-break';
 * Bola Ocho Duo no mira esta tabla.
 *
 * ZONA PURA: no toca Kit, ART ni el DOM. Aquí viven la colocación a mano de cada desafío, la física
 * completa (bandas, troneras, bolas y bloques de madera) y las reglas, así que el mismo código que
 * se juega es el que verifica desde Node que los 20 se cumplen dentro de su límite de tiros.
 *
 * DESAFÍO: { name, tip, cue:[x,y], balls:[[n,x,y]…], obs:[[x,y,w,h]…], closed:[i…],
 *            goal:'clear'|'order'|'carom', need (carambolas), forbid:[n…], shots, par }
 *   goal 'clear'  → meter todas las bolas objetivo (las que no están en forbid)
 *   goal 'order'  → meterlas de menor a mayor: romper el orden es falta
 *   goal 'carom'  → hacer `need` carambolas (un tiro en el que la blanca toca dos bolas distintas)
 *   forbid        → bolas que NO se pueden meter: si caen, falta y vuelven a su sitio
 *   closed        → troneras tapadas con una chapa de madera (rebotan)
 *   obs           → bloques de madera fijos sobre el tapete
 * Falta (blanca dentro, bola prohibida, romper el orden, no tocar ninguna bola) = +1 tiro.
 * Estrellas: 1★ cumplir dentro del límite · 2★ en `par` tiros o menos · 3★ el par sin ninguna falta.
 * La dificultad cambia el límite de tiros y lo tragona que es la tronera, nunca la colocación. */
var POOLLV = (function () {
  var TX = 36, TY = 76, TW = 288, TH = 504, BR = 10, R2 = 6.2832;
  var POCK = [[TX, TY, 19], [TX + TW, TY, 19], [TX, TY + TH / 2, 16], [TX + TW, TY + TH / 2, 16],
              [TX, TY + TH, 19], [TX + TW, TY + TH, 19]];

  var CH = [
    { name: 'Primer tiro', tip: 'Arrastra hacia atrás desde la blanca: cuanto más lejos, más fuerte. Apunta al centro de la bola y empújala a la tronera.',
      cue: [180, 500], balls: [[1, 180, 200]], goal: 'clear', shots: 3, par: 1 },

    { name: 'Dos seguidas', tip: 'Piensa dónde se queda la blanca después de meter: el siguiente tiro empieza ahí.',
      cue: [180, 500], balls: [[1, 100, 180], [2, 260, 180]], goal: 'clear', shots: 5, par: 2 },

    { name: 'La banda', tip: 'Las bandas rebotan como un espejo: el ángulo con el que llegas es el ángulo con el que sales.',
      cue: [180, 480], balls: [[3, 70, 140], [5, 290, 140]], goal: 'clear', shots: 5, par: 2 },

    { name: 'Bloqueo', tip: 'Los bloques de madera están fijos: rodéalos por banda o busca el hueco.',
      cue: [180, 500], balls: [[1, 100, 200], [2, 260, 200]], obs: [[150, 260, 60, 22]], goal: 'clear', shots: 6, par: 3 },

    { name: 'Troneras tapadas', tip: 'Las chapas de madera tapan dos troneras: esas ya no valen, rebotan como una banda más.',
      cue: [180, 480], balls: [[1, 90, 170], [2, 180, 140], [3, 270, 170]], closed: [0, 1], goal: 'clear', shots: 7, par: 3 },

    { name: 'El racimo', tip: 'Un golpe seco en el racimo lo abre; después ya vas metiendo una a una.',
      cue: [180, 500], balls: [[1, 165, 210], [2, 195, 210], [3, 180, 185], [4, 180, 235]], goal: 'clear', shots: 8, par: 4 },

    { name: 'Bola prohibida', tip: 'La negra no se toca: si cae es falta y vuelve a su sitio con un tiro de castigo.',
      cue: [180, 500], balls: [[1, 90, 180], [2, 270, 180], [8, 180, 300]], forbid: [8], goal: 'clear', shots: 7, par: 3 },

    { name: 'Por orden', tip: 'De menor a mayor: primero la 1 y después la 2. Meterlas fuera de orden es falta y cuesta un tiro.',
      cue: [180, 470], balls: [[1, 82, 122], [2, 278, 122]], goal: 'order', shots: 7, par: 3 },

    { name: 'Carambola', tip: 'Carambola: en el mismo tiro la blanca tiene que tocar dos bolas distintas. No hace falta meter nada.',
      cue: [180, 500], balls: [[4, 140, 300], [6, 230, 240]], goal: 'carom', need: 2, closed: [0, 1, 2, 3, 4, 5], shots: 6, par: 2 },

    { name: 'El pasillo', tip: 'Solo se pasa por el centro: entra recto y sal con la blanca colocada.',
      cue: [180, 520], balls: [[1, 100, 150], [2, 180, 150], [3, 260, 150]],
      obs: [[46, 300, 108, 20], [206, 300, 108, 20]], goal: 'clear', shots: 9, par: 4 },

    { name: 'Rombo', tip: 'El bloque del centro parte la mesa: cada bola tiene su lado bueno.',
      cue: [180, 510], balls: [[1, 180, 150], [2, 100, 260], [3, 260, 260], [4, 180, 360]],
      obs: [[160, 240, 40, 40]], goal: 'clear', shots: 9, par: 4 },

    { name: 'Orden con bloque', tip: 'El orden manda aunque el bloque estorbe: usa las bandas para llegar a la que toca.',
      cue: [180, 500], balls: [[1, 82, 122], [2, 278, 122], [3, 278, 430]],
      obs: [[150, 250, 60, 110]], goal: 'order', shots: 10, par: 4 },

    { name: 'Tres carambolas', tip: 'Tres carambolas. Deja la blanca entre las dos bolas y repite el truco.',
      cue: [120, 460], balls: [[5, 230, 330], [9, 130, 220]], obs: [[46, 380, 70, 20], [244, 380, 70, 20]],
      goal: 'carom', need: 3, closed: [0, 1, 2, 3, 4, 5], shots: 8, par: 3 },

    { name: 'Dos troneras', tip: 'Solo quedan abiertas las dos de abajo: trae las bolas hacia ti.',
      cue: [180, 520], balls: [[1, 100, 170], [2, 260, 170], [3, 100, 300], [4, 260, 300]],
      closed: [0, 1, 2, 3], goal: 'clear', shots: 11, par: 5 },

    { name: 'El muro', tip: 'El muro cruza la mesa de lado a lado menos por un hueco: cruza por ahí o juega a dos bandas.',
      cue: [180, 520], balls: [[1, 90, 150], [2, 270, 150], [3, 90, 430], [4, 270, 430]],
      obs: [[46, 300, 104, 20], [214, 300, 100, 20]], goal: 'clear', shots: 11, par: 5 },

    { name: 'Prohibidas', tip: 'Dos bolas intocables en medio del camino: apunta fino, cada falta cuesta un tiro.',
      cue: [180, 510], balls: [[1, 80, 160], [2, 180, 130], [3, 280, 160], [8, 140, 300], [11, 220, 300]],
      forbid: [8, 11], goal: 'clear', shots: 11, par: 5 },

    { name: 'Orden largo', tip: 'Cinco bolas, de la 1 a la 5, en su orden. Mira siempre dónde se queda la blanca.',
      cue: [180, 520], balls: [[1, 90, 420], [2, 270, 420], [3, 90, 240], [4, 270, 240], [5, 180, 150]],
      goal: 'order', shots: 15, par: 7 },

    { name: 'Laberinto', tip: 'Tres bloques y poco sitio: a veces el mejor tiro es el que solo coloca la blanca.',
      cue: [180, 530], balls: [[1, 70, 180], [2, 180, 180], [3, 290, 180], [4, 70, 330], [5, 290, 330]],
      obs: [[120, 250, 30, 90], [210, 250, 30, 90], [150, 420, 60, 20]], goal: 'clear', shots: 13, par: 6 },

    { name: 'El reto', tip: 'Orden, troneras tapadas y una negra que no se toca. El desafío de verdad.',
      cue: [180, 520], balls: [[1, 90, 430], [2, 270, 430], [3, 90, 220], [4, 270, 220], [8, 180, 320]],
      forbid: [8], closed: [2, 3], goal: 'order', shots: 16, par: 7 },

    { name: 'Mesa final', tip: 'Ocho bolas, dos bloques y las dos troneras del centro tapadas. Limpia la mesa y se acabó.',
      cue: [180, 530], balls: [[1, 100, 150], [2, 180, 130], [3, 260, 150], [4, 80, 260], [5, 280, 260],
        [6, 130, 360], [7, 230, 360], [9, 180, 440]],
      obs: [[46, 200, 40, 20], [274, 200, 40, 20]], closed: [2, 3], goal: 'clear', shots: 18, par: 9 }
  ];

  /* ---------- construcción ---------- */
  function build(i, dif) {
    var d = CH[Math.max(0, Math.min(CH.length - 1, (i | 0) - 1))];
    dif = dif == null ? 1 : dif;
    var S = { def: d, n: i, name: d.name, tip: d.tip || '', goal: d.goal, need: d.need || 0,
      forbid: (d.forbid || []).slice(), order: d.goal === 'order',
      obs: (d.obs || []).map(function (o) { return { x: o[0], y: o[1], w: o[2], h: o[3] }; }),
      closed: {}, balls: [], home: {}, caroms: 0, shots: 0, faults: 0, dif: dif,
      pk: dif === 0 ? 5 : dif === 2 ? 2 : 3,
      max: d.shots + (dif === 0 ? 3 : dif === 2 ? 0 : 1),
      par: d.par + (dif === 0 ? 1 : dif === 2 ? 0 : 0), ev: [] };
    (d.closed || []).forEach(function (p) { S.closed[p] = 1; });
    S.balls.push({ n: 0, x: d.cue[0], y: d.cue[1], vx: 0, vy: 0, rot: 0 });
    d.balls.forEach(function (b) { S.balls.push({ n: b[0], x: b[1], y: b[2], vx: 0, vy: 0, rot: 0 }); S.home[b[0]] = [b[1], b[2]]; });
    S.targets = d.balls.map(function (b) { return b[0]; }).filter(function (n) { return S.forbid.indexOf(n) < 0; }).sort(function (a, b) { return a - b; });
    S.home[0] = [d.cue[0], d.cue[1]];
    return S;
  }
  var cue = function (S) { for (var i = 0; i < S.balls.length; i++) if (S.balls[i].n === 0) return S.balls[i]; return null; };
  var left = function (S) { return S.targets.filter(function (n) { return has(S, n); }); };
  function has(S, n) { for (var i = 0; i < S.balls.length; i++) if (S.balls[i].n === n) return true; return false; }

  /* ---------- física (un subpaso; h fijo 1/480 en juego y en la verificación) ---------- */
  function step(S, h) {
    var i, j, b, sh = S.shot;
    for (i = 0; i < S.balls.length; i++) { b = S.balls[i];
      b.x += b.vx * h; b.y += b.vy * h;
      var f = 1 - 0.85 * h, sp = Math.hypot(b.vx, b.vy);
      b.vx *= f; b.vy *= f;
      if (sp > 0 && sp < 25) { var g = Math.max(0, sp - 20 * h) / sp; b.vx *= g; b.vy *= g; }
      b.rot += sp * h / BR;
      var bn = 0;
      if (b.x < TX + BR) { b.x = TX + BR; bn = Math.abs(b.vx); b.vx = Math.abs(b.vx) * 0.8; }
      if (b.x > TX + TW - BR) { b.x = TX + TW - BR; bn = Math.abs(b.vx); b.vx = -Math.abs(b.vx) * 0.8; }
      if (b.y < TY + BR) { b.y = TY + BR; bn = Math.abs(b.vy); b.vy = Math.abs(b.vy) * 0.8; }
      if (b.y > TY + TH - BR) { b.y = TY + TH - BR; bn = Math.abs(b.vy); b.vy = -Math.abs(b.vy) * 0.8; }
      if (bn > 120) S.ev.push(['band', bn]);
      // bloques de madera: se empuja la bola al punto más cercano del rectángulo y se refleja
      for (j = 0; j < S.obs.length; j++) { var o = S.obs[j];
        var cx2 = Math.max(o.x, Math.min(b.x, o.x + o.w)), cy2 = Math.max(o.y, Math.min(b.y, o.y + o.h));
        var dx = b.x - cx2, dy = b.y - cy2, d = Math.hypot(dx, dy);
        if (d >= BR) continue;
        var nx, ny;
        if (d > 0.001) { nx = dx / d; ny = dy / d; }
        else { // centro dentro del bloque: sale por la cara más próxima
          var lx = b.x - o.x, rx2 = o.x + o.w - b.x, ty2 = b.y - o.y, by = o.y + o.h - b.y;
          var mn = Math.min(lx, rx2, ty2, by);
          nx = mn === lx ? -1 : mn === rx2 ? 1 : 0; ny = mn === ty2 ? -1 : mn === by ? 1 : 0;
        }
        b.x = cx2 + nx * BR; b.y = cy2 + ny * BR;
        var vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; if (-vn > 120) S.ev.push(['band', -vn]); }
      }
      for (j = 0; j < POCK.length; j++) { if (S.closed[j]) continue;
        if (Math.hypot(b.x - POCK[j][0], b.y - POCK[j][1]) < POCK[j][2] + S.pk) { b.in = 1; b.px = POCK[j][0]; b.py = POCK[j][1]; } }
    }
    for (i = 0; i < S.balls.length; i++) for (j = i + 1; j < S.balls.length; j++) {
      var a = S.balls[i], b2 = S.balls[j], dx2 = b2.x - a.x, dy2 = b2.y - a.y, d2 = Math.hypot(dx2, dy2);
      if (d2 >= BR * 2 || d2 <= 0) continue;
      var nx2 = dx2 / d2, ny2 = dy2 / d2, ov = (BR * 2 - d2) / 2;
      a.x -= nx2 * ov; a.y -= ny2 * ov; b2.x += nx2 * ov; b2.y += ny2 * ov;
      var rv = ((a.vx - b2.vx) * nx2 + (a.vy - b2.vy) * ny2) * 0.97;
      if (rv > 0) { a.vx -= rv * nx2; a.vy -= rv * ny2; b2.vx += rv * nx2; b2.vy += rv * ny2;
        if (rv > 40) S.ev.push(['click', rv]);
        if (sh && (a.n === 0 || b2.n === 0)) { var other = a.n === 0 ? b2.n : a.n;
          if (sh.hits[sh.hits.length - 1] !== other) sh.hits.push(other);
          if (sh.set.indexOf(other) < 0) sh.set.push(other); } }
    }
    var out = [];
    for (i = 0; i < S.balls.length; i++) if (S.balls[i].in) out.push(S.balls[i]);
    if (out.length) { S.balls = S.balls.filter(function (q) { return !q.in; });
      for (i = 0; i < out.length; i++) { if (sh) sh.pots.push(out[i].n); S.ev.push(['pot', out[i].n, out[i].px, out[i].py]); } }
  }
  function strike(S, a, p) {
    var b = cue(S); if (!b) return false;
    b.vx = Math.cos(a) * p * 1500; b.vy = Math.sin(a) * p * 1500;
    S.shot = { pots: [], hits: [], set: [] }; S.shots++;
    return true;
  }
  function moving(S) { for (var i = 0; i < S.balls.length; i++) if (Math.hypot(S.balls[i].vx, S.balls[i].vy) > 3) return true; return false; }
  function free(S, x, y) { for (var i = 0; i < S.balls.length; i++) if (Math.hypot(S.balls[i].x - x, S.balls[i].y - y) < BR * 2 + 1) return false; return true; }
  function respot(S, n) {
    var h0 = S.home[n] || [180, 320], x = h0[0], y = h0[1];
    for (var r = 0; r < 60; r++) for (var q = 0; q < 8; q++) {
      var ang = q * R2 / 8, px = Math.max(TX + BR, Math.min(TX + TW - BR, x + Math.cos(ang) * r * 6)),
        py = Math.max(TY + BR, Math.min(TY + TH - BR, y + Math.sin(ang) * r * 6));
      if (free(S, px, py)) { S.balls.push({ n: n, x: px, y: py, vx: 0, vy: 0, rot: 0 }); return; }
    }
    S.balls.push({ n: n, x: x, y: y, vx: 0, vy: 0, rot: 0 });
  }
  /* Reglas al pararse la mesa. Devuelve { faults:[motivo…], potted:[n…], carom, done, dead } */
  function resolve(S) {
    var sh = S.shot || { pots: [], hits: [], set: [] }, F = [], potted = [], i, n;
    /* El orden se juzga con la mesa ANTES del tiro: step() ya ha quitado las bolas que han caido,
     * asi que hay que volver a meter en la lista las que se han metido en este mismo tiro. */
    var order = S.order ? S.targets.filter(function (n) { return has(S, n) || sh.pots.indexOf(n) >= 0; }).sort(function (a, b) { return a - b; }) : null;
    var next = order && order.length ? order[0] : null;
    for (i = 0; i < sh.pots.length; i++) { n = sh.pots[i];
      if (n === 0) { F.push('blanca'); continue; }
      if (S.forbid.indexOf(n) >= 0) { F.push('prohibida'); respot(S, n); continue; }
      if (S.order && next != null && n !== next) { F.push('orden'); respot(S, n); continue; }
      potted.push(n); if (S.order) { order.shift(); next = order.length ? order[0] : null; }
    }
    if (!sh.hits.length) F.push('nada');
    var carom = 0;
    if (S.goal === 'carom' && sh.set.length >= 2) { carom = 1; S.caroms++; }
    if (sh.pots.indexOf(0) >= 0) respot(S, 0);
    S.faults += F.length; S.shots += F.length;
    S.shot = null;
    var done = S.goal === 'carom' ? S.caroms >= S.need : left(S).length === 0;
    return { faults: F, potted: potted, carom: carom, done: done, dead: !done && S.shots >= S.max };
  }
  function stars(S) { return S.shots <= S.par ? (S.faults === 0 ? 3 : 2) : 1; }

  /* ---------- simulación completa de un tiro (bot y verificación) ---------- */
  function clone(S) {
    var C = { def: S.def, n: S.n, name: S.name, tip: S.tip, goal: S.goal, need: S.need, forbid: S.forbid,
      order: S.order, obs: S.obs, closed: S.closed, home: S.home, targets: S.targets, caroms: S.caroms,
      shots: S.shots, faults: S.faults, dif: S.dif, pk: S.pk, max: S.max, par: S.par, ev: [], shot: null,
      balls: S.balls.map(function (b) { return { n: b.n, x: b.x, y: b.y, vx: 0, vy: 0, rot: 0 }; }) };
    return C;
  }
  function playShot(S, a, p) {
    strike(S, a, p);
    for (var i = 0; i < 3000; i++) { S.ev.length = 0; step(S, 1 / 480); if (!moving(S)) break; }
    for (var j = 0; j < S.balls.length; j++) { S.balls[j].vx = 0; S.balls[j].vy = 0; }
    return resolve(S);
  }
  return { CH: CH, build: build, step: step, strike: strike, moving: moving, resolve: resolve,
    clone: clone, playShot: playShot, cue: cue, left: left, has: has, stars: stars,
    TX: TX, TY: TY, TW: TW, TH: TH, BR: BR, POCK: POCK };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = POOLLV;   /* verificación desde Node */
