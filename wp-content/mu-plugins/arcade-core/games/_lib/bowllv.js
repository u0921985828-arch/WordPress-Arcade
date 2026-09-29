/* Los 20 retos de Bolera del Barrio (plan Friv · la vara). Solo los usa el juego 'bolera-del-barrio'
 * cuando se juega en solitario; en el modo tele (1–4 con mandos) la partida por turnos queda igual,
 * y Bowling Flick no mira esta tabla.
 *
 * ZONA PURA: no toca Kit, ART ni el DOM. Aquí viven la tabla de retos, los tipos de bolo, el aceite,
 * la física de bola y bolos y el marcador oficial, así que el mismo código que se juega es el que
 * verifica desde Node que los 20 se superan en las 3 dificultades.
 *
 * BOLOS: cadena de 10 caracteres (id 0 = bolo 1 de cabeza; 1-2 segunda fila; 3-5 tercera; 6-9 cuarta)
 *   '.' sin bolo · 'n' normal · 'h' de hierro (pesa el triple: hay que darle fuerte)
 *   'r' de goma (sale disparado y arrastra a los vecinos) · 'b' azul (¡intocable!)
 * ACEITE: [[y0, y1, mult]…] multiplica el efecto de la bola en ese tramo de pista (1 = como siempre).
 * RETO: { name, tip, goal, pins, balls, par, s3, frames, t1, t2, t3, oil }
 *   goal 'clear'     → tumbar todos los bolos en `balls` bolas (los caídos no se reponen)
 *   goal 'precision' → tumbar los rojos SIN tocar ningún azul
 *   goal 'score'     → partida de `frames` entradas con marcador oficial y llegar a `t1` puntos
 * Estrellas: 1★ cumplirlo · 2★ en `par` bolas (o `t2` puntos) · 3★ en `s3` bolas (o `t3` puntos).
 * La dificultad cambia el temblor de la pista y los objetivos, nunca la colocación. */
var BOWLLV = (function () {
  var LANE_W = 62, GUT = 13, PIT = 1660, BR = 11, PR = 6;
  var ROWS = [[0], [-1, 1], [-2, 0, 2], [-3, -1, 1, 3]];
  var FULL = 'nnnnnnnnnn';

  var RE = [
    { name: 'Primer pleno', goal: 'clear', pins: FULL, balls: 3, par: 2, s3: 1,
      tip: 'Arrastra a los lados para colocar la bola y desliza hacia arriba para lanzar. Cuanto más rápido el desliz, más fuerte.' },
    { name: 'El hueco', goal: 'clear', pins: FULL, balls: 2, par: 2, s3: 1,
      tip: 'De frente al bolo de cabeza se quedan bolos en pie. Entra un poco de lado, entre el 1 y el 3.' },
    { name: 'Los de la izquierda', goal: 'clear', pins: '...n..n...', balls: 2, par: 2, s3: 1,
      tip: 'Solo quedan dos bolos y están juntos: ajusta la salida y no hace falta fuerza.' },
    { name: 'Bolo de hierro', goal: 'clear', pins: 'hnnnnnnnnn', balls: 3, par: 2, s3: 1,
      tip: 'El bolo gris es de hierro: pesa el triple y solo cae si le llega la bola con fuerza.' },
    { name: 'Bolos de goma', goal: 'clear', pins: 'nrnnrnnnnn', balls: 2, par: 2, s3: 1,
      tip: 'Los bolos verdes son de goma: salen disparados y se llevan por delante a los vecinos.' },
    { name: 'Aceite en la pista', goal: 'clear', pins: FULL, balls: 3, par: 2, s3: 1,
      oil: [[0, 1150, 0.25], [1150, 1800, 2]],
      tip: 'La pista está encerada hasta la mitad: la bola no engancha hasta el final, y ahí gira de golpe.' },
    { name: 'Azul intocable', goal: 'precision', pins: 'nnnnnn...b', balls: 2, par: 2, s3: 1,
      tip: 'Tumba los rojos y deja el azul en pie. Si cae el azul, el reto se pierde: vuelve a intentarlo.' },
    { name: 'Partida corta', goal: 'score', frames: 3, t1: 42, t2: 58, t3: 75, pins: FULL,
      tip: 'Tres entradas con el marcador oficial: un pleno vale 10 más lo que tires en las dos bolas siguientes.' },
    { name: 'El split 4-6', goal: 'clear', pins: '...n.n....', balls: 2, par: 2, s3: 1,
      tip: 'Dos bolos separados: con una bola solo caen los dos si entras muy justo. Con dos, uno en cada tiro.' },
    { name: 'Hierro y goma', goal: 'clear', pins: 'hnrnnrnnnn', balls: 3, par: 2, s3: 1,
      tip: 'Hierro delante y goma detrás: pega fuerte al de cabeza y deja que los verdes hagan el resto.' },
    { name: 'Aceite al revés', goal: 'clear', pins: FULL, balls: 3, par: 2, s3: 1,
      oil: [[0, 1150, 1.9], [1150, 1800, 0.3]],
      tip: 'Aquí la bola gira pronto y luego se endereza: sal más al centro de lo que te pide el cuerpo.' },
    { name: 'Los dos azules', goal: 'precision', pins: 'nnnnnn.b.b', balls: 2, par: 2, s3: 1,
      tip: 'Dos azules en la última fila. Fuerza justa: si la bola llega con demasiada, rebota y los tira.' },
    { name: 'Partida a cinco', goal: 'score', frames: 5, t1: 68, t2: 92, t3: 115, pins: FULL,
      tip: 'Cinco entradas. Encadenar plenos multiplica: dos seguidos ya suman más de veinte en la primera.' },
    { name: 'El 7-10', goal: 'clear', pins: '......n..n', balls: 2, par: 2, s3: 1,
      tip: 'El split más famoso: uno en cada esquina. Con dos bolas es muy posible; con una, leyenda.' },
    { name: 'Muralla de hierro', goal: 'clear', pins: 'hnnhnhnnnn', balls: 3, par: 3, s3: 2,
      tip: 'Tres bolos de hierro repartidos: necesitas velocidad de verdad y entrar por el hueco.' },
    { name: 'Precisión fina', goal: 'precision', pins: 'nnn.n.b..b', balls: 3, par: 2, s3: 1,
      tip: 'Dos azules en las esquinas del fondo y los rojos delante: tumba y frena. La bola lenta no llega al fondo.' },
    { name: 'Aceite y hierro', goal: 'clear', pins: 'hnnnnnnnnn', balls: 3, par: 3, s3: 2,
      oil: [[0, 1200, 0.2], [1200, 1800, 2.2]],
      tip: 'Pista encerada y bolo de hierro en la cabeza: el efecto tardío te da el ángulo que hace falta.' },
    { name: 'Partida con aceite', goal: 'score', frames: 5, t1: 62, t2: 85, t3: 108, pins: FULL,
      oil: [[0, 1150, 0.3], [1150, 1800, 1.9]],
      tip: 'Cinco entradas sobre pista encerada. Repite la misma salida hasta que le cojas el punto.' },
    { name: 'Doble reto', goal: 'precision', pins: 'hnnnnn.b.b', balls: 3, par: 3, s3: 2,
      oil: [[0, 1150, 0.35], [1150, 1800, 1.8]],
      tip: 'Hierro delante, azules detrás y aceite: fuerza para el de hierro, pero sin pasarse.' },
    { name: 'La partida del barrio', goal: 'score', frames: 10, t1: 95, t2: 125, t3: 155, pins: 'hnnnnnnnnn',
      oil: [[0, 1150, 0.3], [1150, 1800, 1.9]],
      tip: 'Diez entradas completas con bolo de hierro y aceite. La partida de verdad: aquí se cierra el reto.' }
  ];

  function build(i, dif) {
    var d = RE[Math.max(0, Math.min(RE.length - 1, (i | 0) - 1))];
    dif = dif == null ? 1 : dif;
    var H = { def: d, n: i, name: d.name, tip: d.tip || '', goal: d.goal, pins: d.pins || FULL,
      oil: d.oil || null, dif: dif,
      balls: (d.balls || 0) + (dif === 0 ? 1 : 0), par: d.par || 0, s3: d.s3 || 0,
      frames: d.frames || 0,
      // los retos de precisión no llevan azar: la bola va justo donde apuntas (habilidad, no suerte)
      noise: d.goal === 'precision' ? 0 : (dif === 0 ? 0.55 : dif === 2 ? 1.5 : 1) };
    if (d.goal === 'score') { var f = dif === 0 ? 0.82 : dif === 2 ? 1.12 : 1;
      H.t1 = Math.round(d.t1 * f); H.t2 = Math.round(d.t2 * f); H.t3 = Math.round(d.t3 * f); }
    return H;
  }
  /* Colocación: mismos sitios que la bolera normal, con el tipo de cada bolo. */
  function rack(H) {
    var pins = [], id = 0, s = H.pins;
    for (var r = 0; r < ROWS.length; r++) for (var j = 0; j < ROWS[r].length; j++) {
      var ty = s.charAt(id) || 'n';
      pins.push({ id: id, ty: ty, x: ROWS[r][j] * 15, y: 1500 + r * 26, vx: 0, vy: 0,
        down: ty === '.', gone: ty === '.', tilt: 0, fd: ROWS[r][j] ? (ROWS[r][j] > 0 ? 1 : -1) : 1, wob: 0, a: ty === '.' ? 0 : 1,
        m: ty === 'h' ? 3 : 1, kick: ty === 'r' ? 1.7 : 1, thr: ty === 'h' ? 300 : 0 });
      id++;
    }
    return pins;
  }
  var oilAt = function (H, y) { if (!H.oil) return 1;
    for (var i = 0; i < H.oil.length; i++) if (y >= H.oil[i][0] && y < H.oil[i][1]) return H.oil[i][2];
    return 1; };
  function newBall(x) { return { x: x, y: 30, vx: 0, vy: 0, hook: 0, rolling: false, gutter: false, rot: 0, a: 1, hitP: false }; }
  function launch(H, b, vy, ang, hook, rng) {
    b.vy = vy; b.vx = Math.tan(ang) * vy + ((rng ? rng() : Math.random()) * 2 - 1) * 9 * H.noise;
    b.hook = hook; b.rolling = true; b.gutter = false; b.hitP = false; return b;
  }
  /* Un subpaso de física. ev recoge lo que hay que sonar/pintar: ['knock', pin, v] · ['gutter'] */
  function step(H, b, pins, h, ev) {
    var i, j, p;
    if (b.rolling) {
      if (b.y > 750 && !b.gutter) b.vx += b.hook * oilAt(H, b.y) * h;
      b.x += b.vx * h; b.y += b.vy * h; b.rot += b.vy * h / BR;
      if (!b.gutter && !b.hitP && b.y < 1470 && Math.abs(b.x) > LANE_W - 2) {
        b.gutter = true; b.vx = 0; b.x = (b.x > 0 ? 1 : -1) * (LANE_W + GUT / 2); if (ev) ev.push(['gutter']); }
      if (!b.gutter) for (i = 0; i < pins.length; i++) { p = pins[i]; if (p.gone) continue;
        var dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy), md = BR + (p.down ? PR + 2 : PR);
        if (d >= md || d <= 0) continue;
        var nx = dx / d, ny = dy / d, vr = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
        if (vr > 0) { b.hitP = true;
          var f = 1.64 * p.kick / p.m;
          p.vx += f * vr * nx; p.vy += f * vr * ny;
          b.vx -= 0.36 * vr * nx * Math.min(2, p.m); b.vy -= 0.36 * vr * ny * Math.min(2, p.m);
          if (!p.down && vr > p.thr) { p.down = true; if (ev) ev.push(['knock', p, vr]); } }
        p.x = b.x + nx * md; p.y = b.y + ny * md; }
      if (b.y > PIT + 60 || b.vy < 40) { b.rolling = false; b.a = 0; }
    }
    for (i = 0; i < pins.length; i++) { p = pins[i]; if (p.gone || !p.down) continue;
      p.x += p.vx * h; p.y += p.vy * h; var fr = 1 - 2.2 * h; p.vx *= fr; p.vy *= fr;
      if (Math.abs(p.x) > LANE_W + 4 || p.y > PIT || p.y < 1400) p.gone = true; }
    for (i = 0; i < pins.length; i++) for (j = i + 1; j < pins.length; j++) {
      var a = pins[i], b2 = pins[j]; if (a.gone || b2.gone) continue;
      var dx2 = b2.x - a.x, dy2 = b2.y - a.y, d2 = Math.hypot(dx2, dy2), md2 = (a.down ? PR + 3 : PR) + (b2.down ? PR + 3 : PR);
      if (d2 >= md2 || d2 === 0) continue;
      var nx2 = dx2 / d2, ny2 = dy2 / d2, vr2 = ((a.vx - b2.vx) * nx2 + (a.vy - b2.vy) * ny2);
      if (vr2 > 0) { var j2 = vr2 * 0.85;
        if (!b2.down && j2 * a.kick > 80 + b2.thr * 0.5 && j2 > b2.m * 55) { b2.down = true; if (ev) ev.push(['knock', b2, j2]); }
        else if (!b2.down) b2.wob = Math.max(b2.wob, 0.6);
        if (!a.down && j2 * b2.kick > 80 + a.thr * 0.5 && j2 > a.m * 55) { a.down = true; if (ev) ev.push(['knock', a, j2]); }
        else if (!a.down) a.wob = Math.max(a.wob, 0.6);
        if (a.down) { a.vx -= j2 * nx2 / a.m; a.vy -= j2 * ny2 / a.m; }
        if (b2.down) { b2.vx += j2 * nx2 / b2.m; b2.vy += j2 * ny2 / b2.m; } }
      var ov = (md2 - d2) / 2;
      if (a.down) { a.x -= nx2 * ov; a.y -= ny2 * ov; } if (b2.down) { b2.x += nx2 * ov; b2.y += ny2 * ov; }
    }
  }
  var standing = function (pins) { return pins.filter(function (p) { return !(p.down || p.gone); }); };
  /* Simula una bola entera (para la verificación y para el bot de pruebas). */
  function roll(H, pins, shot, rng) {
    var b = newBall(shot.x); launch(H, b, shot.vy, shot.ang || 0, shot.hook || 0, rng);
    for (var i = 0; i < 4000; i++) { step(H, b, pins, 1 / 360, null);
      if (!b.rolling) { var mov = false;
        for (var j = 0; j < pins.length; j++) if (pins[j].down && !pins[j].gone && Math.hypot(pins[j].vx, pins[j].vy) > 5) { mov = true; break; }
        if (!mov) break; } }
    return b;
  }
  /* Marcador oficial de 10 frames (misma función que usa la bolera normal). */
  function score(frames, n) {
    var r = [], i, f; n = n || 10;
    for (i = 0; i < frames.length; i++) for (var j = 0; j < frames[i].length; j++) r.push(frames[i][j]);
    var s = 0, out = []; i = 0;
    for (f = 0; f < n; f++) {
      if (r[i] === undefined) break;
      if (r[i] === 10) { if (r[i + 2] === undefined) break; s += 10 + r[i + 1] + r[i + 2]; i++; }
      else { if (r[i + 1] === undefined) break;
        if (r[i] + r[i + 1] === 10) { if (r[i + 2] === undefined) break; s += 10 + r[i + 2]; } else s += r[i] + r[i + 1];
        i += 2; }
      out.push(s);
    }
    return out;
  }
  function stars(H, used, pts) {
    if (H.goal === 'score') return pts >= H.t3 ? 3 : pts >= H.t2 ? 2 : 1;
    return used <= H.s3 ? 3 : used <= H.par ? 2 : 1;
  }
  return { RE: RE, build: build, rack: rack, step: step, roll: roll, launch: launch, newBall: newBall,
    standing: standing, score: score, stars: stars, oilAt: oilAt,
    LANE_W: LANE_W, GUT: GUT, PIT: PIT, BR: BR, PR: PR, ROWS: ROWS };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BOWLLV;   /* verificación desde Node */
