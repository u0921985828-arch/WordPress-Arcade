/* Niveles a mano de Fusión de Frutas (plan Friv, vara de docs/VARA.md).
 *
 * Este fichero lleva DOS cosas, como swaplv.js:
 *   1) FU     — las REGLAS PURAS del tarro (física, fusiones, piedras, hielo, bombas, objetivos).
 *               No toca el lienzo ni kit.js: burbujas.js las usa tal cual para jugar y solo pinta,
 *               y scripts/check_frutlv.js las carga en Node para jugar los 20 niveles.
 *   2) FRUTLV — los 20 niveles escritos a mano. Solo los mira el juego 'fusion-de-frutas';
 *               Burbujas Arcoíris carga este fichero (comparte motor) pero no lo usa.
 *
 * FRUTAS (escalera de fusión, 0..10): cereza, fresa, uva, mandarina, naranja, kiwi, manzana,
 * pomelo, melocotón, melón y sandía. Dos iguales que se tocan se funden en la siguiente.
 *
 * NIVEL:
 *   goal  'reach'  conseguir una fruta de la escala `tier` (por fusión)
 *         'make'   hacer `need` frutas de la escala `tier` (cada fusión que la crea cuenta)
 *         'score'  sumar `need` puntos
 *         'thaw'   liberar todas las frutas congeladas
 *         'stones' romper `need` piedras (solo las rompen las bombas)
 *   n     [fácil, normal, difícil] frutas que se pueden soltar (el recurso que se agota)
 *   par   [[★★,★★★] fácil, normal, difícil] — frutas usadas como mucho
 *   need  número o [fácil, normal, difícil]
 *   sec   [f, n, d] segundos de reloj (0 o ausente = sin reloj)
 *   seq   { seed, w: pesos por escala, s: [turnos con piedra], b: [turnos con bomba] }
 *         La secuencia es la MISMA en las tres dificultades (la ruta no cambia).
 *   jar   'box' · 'vee' (fondo en V) · 'neck' (boca estrecha) · 'funnel' (embudo: dos cámaras)
 *         · 'shelf' (repisas a los lados)
 *   peg   [[x, y, r]] clavijas fijas         ice  [[escala, x, y]] frutas heladas (fijas; se sueltan cuando
 *         nace a su lado una fruta igual o más grande, o con una bomba cerca)
 *   rock  [[x, y]] piedras de salida         pre  [[escala, x, y]] frutas de salida
 *   orb   1 = el Exprimidor: gravedad hacia el centro de un plato redondo
 *   top   línea de peligro (y) si no es la de siempre
 *   undo  [f, n, d] veces que se puede deshacer la última fruta (cuesta la tercera estrella)
 *   tip   la idea que enseña el nivel
 *
 * ★ superarlo · ★★ con ≤ par2 frutas · ★★★ con ≤ par3 frutas, sin deshacer y sin que el tarro
 * llegue a avisar (¡Cuidado!). Deshacer existe desde el nivel 10.
 *
 * MECÁNICAS NUEVAS, de una en una: 5 clavijas · 7 piedras · 8 tarro con forma · 9 hielo ·
 * 10 deshacer · 11 bombas · 12 embudo · 13 reloj · 15 el Exprimidor (gravedad central) · 20 la Gran Sandía.
 */
/* <FU> ------------------------------------------------------------------------------------------ */
const FU = (function () {
  const WD = 360;
  const BOX = { l: 32, r: 328, top: 168, bot: 606 };
  const CEN = { x: 180, y: 384, R: 160, sun: 30 };
  const G0 = 1500, GS = 900, SUB = 1 / 120, MAXV = 900, ITER = 8;
  const RAD = [12, 16, 21, 26, 32, 39, 47, 56, 66, 77, 89];
  const TOPT = RAD.length - 1, STONE = -1, BOMB = -2, SR = 19, BR = 15, XR = 86;
  const PTS = (t) => (t + 1) * (t + 2) * 5;
  const radOf = (t) => (t >= 0 ? RAD[t] : t === STONE ? SR : BR);
  function rng(seed) { let x = seed >>> 0; return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* Tarros: segmentos fijos [x1, y1, x2, y2, grosor/2] dentro de la caja. */
  const JARS = {
    box: [],
    vee: [[32, 470, 150, 606, 4], [210, 606, 328, 470, 4]],
    neck: [[32, 300, 108, 214, 5], [328, 300, 252, 214, 5]],
    funnel: [[32, 352, 150, 410, 5], [210, 410, 328, 352, 5]],
    shelf: [[32, 392, 112, 410, 5], [328, 492, 248, 474, 5]],
  };
  const D3 = (v, d, def) => (Array.isArray(v) ? v[d] : (v == null ? def : v));

  function world(L, d) {
    L = L || {}; d = d == null ? 1 : d;
    const S = { b: [], segs: [], orb: !!L.orb, t: 0, id: 0, score: 0, chain: 0, chainT: 0, mult: 1,
      made: new Array(RAD.length).fill(0), top: -1, broke: 0, thawed: 0, ice: 0, ev: [], danger: 0, warned: 0,
      tol: [2.6, 2.0, 1.6][d], line: L.top || BOX.top, over: 0, merges: 0 };
    for (const s of (JARS[L.jar || 'box'] || [])) S.segs.push(s.slice());
    /* Boca del tarro: en el de cuello estrecho la fruta solo se suelta por encima del cuello. */
    S.mouth = L.jar === 'neck' ? [113, 247] : [BOX.l, BOX.r];
    for (const p of (L.peg || [])) S.segs.push([p[0], p[1], p[0], p[1], p[2]]);
    return S;
  }
  function mk(S, t, x, y, vx, vy) {
    const b = { t, r: radOf(t), x, y, vx: vx || 0, vy: vy || 0, age: 0, id: ++S.id, fz: 0, dead: 0, fuse: -1, hit: 0, pop: 0 };
    S.b.push(b); return b;
  }
  /* Nivel → mundo listo para jugar (lo de salida se asienta antes de empezar). */
  function load(L, d) {
    const S = world(L, d);
    for (const q of (L.ice || [])) { const b = mk(S, q[0], q[1], q[2]); b.fz = 1; S.ice++; }
    for (const q of (L.rock || [])) mk(S, STONE, q[0], q[1]);
    for (const q of (L.pre || [])) mk(S, q[0], q[1], q[2]);
    for (let i = 0; i < 240; i++) step(S, SUB, 1);
    for (const b of S.b) { b.vx = b.vy = 0; b.age = 5; }
    S.t = 0; S.ev.length = 0; S.score = 0; S.chain = 0; S.chainT = 0; S.danger = 0; S.warned = 0; S.merges = 0;
    S.made.fill(0); S.top = -1;
    return S;
  }
  /* Secuencia de frutas del nivel: la misma en las tres dificultades. */
  function seqOf(L, len) {
    const q = L.seq || {}, r = rng(q.seed || 1), w = q.w || [4, 3, 3, 2], out = [];
    let tw = 0; for (const x of w) tw += x;
    const S = new Set(q.s || []), B = new Set(q.b || []);
    for (let i = 0; i < len; i++) {
      let v = r() * tw, t = 0; while (t < w.length - 1 && v >= w[t]) { v -= w[t]; t++; }
      out.push(S.has(i) ? STONE : B.has(i) ? BOMB : t);
    }
    return out;
  }
  /* Soltar: en el tarro, `pos` es la x; en el Exprimidor, el ángulo. */
  function spawnAt(S, code, pos) {
    const r = radOf(code);
    if (S.orb) { const d = CEN.R - r - 2; return { x: CEN.x + Math.cos(pos) * d, y: CEN.y + Math.sin(pos) * d }; }
    const m = S.mouth || [BOX.l, BOX.r];
    return { x: Math.max(m[0] + r + 1, Math.min(m[1] - r - 1, pos)), y: S.line - 26 };
  }
  function drop(S, code, pos) {
    const p = spawnAt(S, code, pos);
    if (S.orb) return mk(S, code, p.x, p.y, -Math.cos(pos) * 60, -Math.sin(pos) * 60);
    return mk(S, code, p.x, p.y, 0, 40);
  }
  function segHit(b, s) {
    const ex = s[2] - s[0], ey = s[3] - s[1], L2 = ex * ex + ey * ey;
    let u = L2 ? ((b.x - s[0]) * ex + (b.y - s[1]) * ey) / L2 : 0; u = u < 0 ? 0 : u > 1 ? 1 : u;
    const px = s[0] + ex * u, py = s[1] + ey * u, dx = b.x - px, dy = b.y - py, rr = b.r + s[4], d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return;
    let nx, ny; const d = Math.sqrt(d2);
    if (d < 1e-4) { nx = ey; ny = -ex; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; if (ny > 0) { nx = -nx; ny = -ny; } }
    else { nx = dx / d; ny = dy / d; }
    b.x = px + nx * rr; b.y = py + ny * rr; b.hit = 1;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { b.vx -= vn * 1.2 * nx; b.vy -= vn * 1.2 * ny; const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty; b.vx -= vt * 0.04 * tx; b.vy -= vt * 0.04 * ty; }
  }
  function clampIn(S, b) {
    if (S.orb) {
      const dx = b.x - CEN.x, dy = b.y - CEN.y; let d = Math.hypot(dx, dy);
      if (d < 1e-4) { b.x += 0.1; d = 0.1; }
      const nx = dx / d, ny = dy / d, out = CEN.R - b.r, inn = CEN.sun + b.r;
      if (d > out) { b.x = CEN.x + nx * out; b.y = CEN.y + ny * out; const vn = b.vx * nx + b.vy * ny; if (vn > 0) { b.vx -= vn * 1.35 * nx; b.vy -= vn * 1.35 * ny; } }
      else if (d < inn) { b.x = CEN.x + nx * inn; b.y = CEN.y + ny * inn; b.hit = 1; const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= vn * 1.35 * nx; b.vy -= vn * 1.35 * ny; } }
    } else {
      if (b.x < BOX.l + b.r) { b.x = BOX.l + b.r; if (b.vx < 0) b.vx *= -0.25; }
      if (b.x > BOX.r - b.r) { b.x = BOX.r - b.r; if (b.vx > 0) b.vx *= -0.25; }
      if (b.y > BOX.bot - b.r) { b.y = BOX.bot - b.r; b.hit = 1; if (b.vy > 0) b.vy *= -0.18; b.vx *= 0.9; }
      if (b.y < -200) b.y = -200;
    }
    for (let i = 0; i < S.segs.length; i++) segHit(b, S.segs[i]);
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAXV) { b.vx *= MAXV / sp; b.vy *= MAXV / sp; }
    if (!isFinite(b.x) || !isFinite(b.y)) { b.x = S.orb ? CEN.x : (BOX.l + BOX.r) / 2; b.y = S.orb ? CEN.y - CEN.sun - b.r - 1 : BOX.bot - b.r; b.vx = b.vy = 0; }
  }
  /* La fruta helada se suelta cuando nace a su lado una fruta igual o más grande que ella. */
  function thawNear(S, x, y, r, t) {
    for (const o of S.b) if (o.fz && !o.dead && o.t <= t && Math.hypot(o.x - x, o.y - y) < r + o.r + 8) { o.fz = 0; o.age = 0.2; S.thawed++; S.ev.push({ k: 'thaw', x: o.x, y: o.y, t: o.t }); }
  }
  function merges(S) {
    const B = S.b;
    for (let i = 0; i < B.length; i++) {
      const a = B[i]; if (a.dead || a.fz || a.t < 0 || a.t >= TOPT || a.age < 0.08) continue;
      for (let j = i + 1; j < B.length; j++) {
        const b = B[j];
        if (b.t !== a.t || b.dead || b.fz || b.age < 0.08) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx * dx + dy * dy > (a.r + b.r + 0.6) ** 2) continue;
        a.dead = b.dead = 1;
        const nt = a.t + 1, n = mk(S, nt, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.vx + b.vx) / 2, (a.vy + b.vy) / 2);
        clampIn(S, n); n.pop = 1;
        S.chain = S.chainT > 0 ? S.chain + 1 : 1; S.chainT = 1.1;
        S.mult = Math.min(4, 1 + ((S.chain - 1) >> 1));
        const pts = PTS(nt) * S.mult;
        S.score += pts; S.made[nt]++; S.merges++;
        const first = nt > S.top; if (first) S.top = nt;
        S.ev.push({ k: 'merge', t: nt, x: n.x, y: n.y, pts, chain: S.chain, mult: S.mult, first });
        thawNear(S, n.x, n.y, n.r, nt);
        break;
      }
    }
    let any = 0; for (const b of B) if (b.dead) { any = 1; break; }
    if (any) S.b = B.filter((b) => !b.dead);
  }
  function explode(S, bm) {
    bm.dead = 1;
    S.ev.push({ k: 'boom', x: bm.x, y: bm.y });
    for (const o of S.b) {
      if (o === bm || o.dead) continue;
      const dx = o.x - bm.x, dy = o.y - bm.y, d = Math.hypot(dx, dy) || 1, gap = d - o.r;
      if (gap > XR) continue;
      if (o.t === STONE) { o.dead = 1; S.broke++; S.score += 40; S.ev.push({ k: 'stone', x: o.x, y: o.y }); continue; }
      if (o.fz) { o.fz = 0; o.age = 0.2; S.thawed++; S.ev.push({ k: 'thaw', x: o.x, y: o.y, t: o.t }); continue; }
      if (o.t >= 0 && o.t <= 1) { o.dead = 1; S.score += 10; S.ev.push({ k: 'zap', x: o.x, y: o.y, t: o.t }); continue; }
      const f = 380 * (1 - Math.max(0, gap) / XR); o.vx += dx / d * f; o.vy += dy / d * f;
    }
    S.b = S.b.filter((b) => !b.dead);
  }
  function peril(S) {
    for (const b of S.b) {
      if (b.fz || b.t === BOMB || b.age < 1.2 || Math.hypot(b.vx, b.vy) > 45) continue;
      if (S.orb) { if (Math.hypot(b.x - CEN.x, b.y - CEN.y) + b.r > CEN.R - 6) return true; }
      else if (b.y - b.r < S.line + 4) return true;
    }
    return false;
  }
  /* Un paso fijo de física. quiet = asentando lo de salida (sin peligro ni fusiones). */
  function step(S, dt, quiet) {
    const B = S.b;
    S.t += dt; if (S.chainT > 0) { S.chainT -= dt; if (S.chainT <= 0) { S.chain = 0; S.mult = 1; } }
    for (const b of B) {
      if (b.fz) continue;
      b.age += dt;
      if (S.orb) { const dx = CEN.x - b.x, dy = CEN.y - b.y, d = Math.hypot(dx, dy) || 1; b.vx += dx / d * GS * dt; b.vy += dy / d * GS * dt; }
      else b.vy += G0 * dt;
      const dg = Math.pow(0.999, dt * 60); b.vx *= dg; b.vy *= dg;
      b.x += b.vx * dt; b.y += b.vy * dt;
      clampIn(S, b);
    }
    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < B.length; i++) {
        const a = B[i];
        for (let j = i + 1; j < B.length; j++) {
          const b = B[j]; if (a.fz && b.fz) continue;
          const dx = b.x - a.x, dy = b.y - a.y, sum = a.r + b.r;
          if (dx > sum || dx < -sum || dy > sum || dy < -sum) continue;
          let d = Math.hypot(dx, dy);
          if (d >= sum) continue;
          if (d < 1e-6) { if (!b.fz) { b.x += 0.3; b.y -= 0.3; } continue; }
          const nx = dx / d, ny = dy / d, ov = sum - d;
          const ma = a.r * a.r, mb = b.r * b.r, ia = a.fz ? 0 : 1 / ma, ib = b.fz ? 0 : 1 / mb, it2 = ia + ib;
          const corr = Math.max(0, ov - 0.05) * 0.85;
          a.x -= nx * corr * ia / it2; a.y -= ny * corr * ia / it2;
          b.x += nx * corr * ib / it2; b.y += ny * corr * ib / it2;
          a.hit = b.hit = 1;
          if (it === 0) {
            const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
            if (vn < 0) {
              const jn = -(1 + 0.08) * vn / it2;
              a.vx -= jn * nx * ia; a.vy -= jn * ny * ia; b.vx += jn * nx * ib; b.vy += jn * ny * ib;
              const tx = -ny, ty = nx, vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty, jt = -vt * 0.22 / it2;
              a.vx -= jt * tx * ia; a.vy -= jt * ty * ia; b.vx += jt * tx * ib; b.vy += jt * ty * ib;
            }
          }
        }
      }
      for (const b of B) if (!b.fz) clampIn(S, b);
    }
    if (quiet) return;
    merges(S);
    for (const b of S.b) if (b.t === BOMB && !b.dead) {
      if (b.fuse < 0 && b.hit && b.age > 0.05) b.fuse = 0.45;
      else if (b.fuse >= 0) { b.fuse -= dt; if (b.fuse <= 0) { explode(S, b); break; } }
    }
    if (S.t > 2 && peril(S)) { S.danger += dt; if (S.danger > 0.6) S.warned = 1; if (S.danger > S.tol) S.over = 1; }
    else S.danger = Math.max(0, S.danger - dt * 1.5);
  }
  /* ¿Se ha calmado el tarro? (nada rápido y ninguna bomba con la mecha encendida) */
  function calm(S) { for (const b of S.b) { if (b.t === BOMB) return false; if (!b.fz && Math.hypot(b.vx, b.vy) > 30) return false; } return true; }
  function run(S, sec) { const n = Math.round(sec / SUB); for (let i = 0; i < n && !S.over; i++) step(S, SUB); }
  function clone(S) {
    const o = Object.assign({}, S);
    o.b = S.b.map((b) => Object.assign({}, b)); o.made = S.made.slice(); o.ev = []; o.segs = S.segs;
    return o;
  }
  function need(L, d) { return L.goal === 'thaw' ? (L.ice || []).length : L.goal === 'reach' ? 1 : D3(L.need, d, 1); }
  function have(S, L) {
    const g = L.goal;
    if (g === 'reach') return S.top >= L.tier ? 1 : 0;
    if (g === 'make') return S.made[L.tier];
    if (g === 'score') return S.score;
    if (g === 'thaw') return S.thawed;
    if (g === 'stones') return S.broke;
    return 0;
  }
  function done(S, L, d) { return L.goal ? have(S, L) >= need(L, d) : false; }
  function margins(L, d) {
    const n = D3(L.n, d, 30);
    const p = (L.par && L.par[d]) || [Math.round(n * 0.8), Math.round(n * 0.65)];
    return { n, par2: p[0], par3: p[1], sec: L.sec ? D3(L.sec, d, 0) : 0, undo: L.undo ? D3(L.undo, d, 0) : 0, need: need(L, d) };
  }
  const NAMES = ['Cereza', 'Fresa', 'Uva', 'Mandarina', 'Naranja', 'Kiwi', 'Manzana', 'Pomelo', 'Melocotón', 'Melón', 'Sandía'];
  return { WD, BOX, CEN, RAD, TOPT, STONE, BOMB, SR, BR, XR, SUB, JARS, PTS, NAMES, rng, world, load, seqOf, spawnAt, drop,
    step, run, calm, clone, peril, need, have, done, margins, radOf };
})();
/* </FU> ----------------------------------------------------------------------------------------- */

const FRUTLV = {
  'fusion-de-frutas': [
    /* ---- 1-4: la regla, la escalera de tamaños y los encargos ---- */
    { /*  1 */ name: 'Primer bocado', goal: 'reach', tier: 5, n: [46, 40, 36], par: [[35, 30], [33, 28], [32, 27]],
      seq: { seed: 101, w: [5, 4, 3] }, tip: 'Dos frutas iguales que se tocan se funden en la siguiente. Llega al kiwi.' },
    { /*  2 */ name: 'Encargo de naranjas', goal: 'make', tier: 4, need: [2, 2, 3], n: [38, 36, 38], par: [[27, 22], [28, 22], [32, 28]],
      seq: { seed: 202, w: [5, 4, 3] }, tip: 'Encargo: haz naranjas. Las grandes al fondo y las pequeñas arriba.' },
    { /*  3 */ name: 'La manzana', goal: 'reach', tier: 6, n: [58, 52, 48], par: [[42, 34], [42, 34], [40, 33]],
      seq: { seed: 303, w: [4, 3, 3, 2] }, tip: 'Guarda las paredes para rematar parejas pequeñas.' },
    { /*  4 */ name: 'Cesta contada', goal: 'score', need: [1600, 1800, 2000], n: [38, 34, 32], par: [[29, 23], [29, 24], [29, 25]],
      seq: { seed: 404, w: [4, 3, 3, 2] }, tip: 'Cuentan los puntos y las frutas se acaban: encadena fusiones seguidas.' },
    /* ---- 5-6: clavijas ---- */
    { /*  5 */ name: 'Clavijas', goal: 'reach', tier: 5, n: [54, 48, 48], par: [[38, 31], [37, 31], [39, 32]],
      peg: [[110, 380, 9], [250, 380, 9], [180, 470, 9]],
      seq: { seed: 505, w: [5, 4, 3] }, tip: 'Las clavijas no se mueven: la fruta rebota y cambia de lado.' },
    { /*  6 */ name: 'Pinball de huerto', goal: 'make', tier: 3, need: [5, 6, 6], n: [36, 32, 32], par: [[25, 21], [27, 24], [28, 24]],
      peg: [[90, 330, 8], [180, 330, 8], [270, 330, 8], [135, 430, 8], [225, 430, 8]],
      seq: { seed: 606, w: [5, 4, 3] }, tip: 'Haz mandarinas. Apunta entre las clavijas.' },
    /* ---- 7: piedras ---- */
    { /*  7 */ name: 'Piedras en la cesta', goal: 'reach', tier: 6, n: [60, 54, 50], par: [[39, 30], [39, 30], [39, 30]],
      rock: [[60, 580], [300, 580]], seq: { seed: 707, w: [4, 3, 3, 2], s: [9, 21] },
      tip: 'Las piedras no se funden con nada: arrímalas a las paredes.' },
    /* ---- 8: tarro con forma ---- */
    { /*  8 */ name: 'Boca estrecha', goal: 'make', tier: 4, need: [4, 5, 5], n: [38, 40, 40], par: [[28, 24], [34, 27], [34, 27]],
      jar: 'neck', seq: { seed: 808, w: [4, 3, 3, 2] }, tip: 'Tarro de boca estrecha: los hombros frenan lo que sube.' },
    /* ---- 9-10: hielo ---- */
    { /*  9 */ name: 'Escarcha', goal: 'thaw', n: [60, 54, 48], par: [[31, 25], [31, 25], [31, 25]],
      ice: [[2, 53, 585], [3, 302, 580], [4, 180, 574], [3, 58, 470]], seq: { seed: 909, w: [5, 4, 3, 2] },
      tip: 'La fruta helada se suelta cuando haces a su lado una fruta igual o más grande que ella.' },
    { /* 10 */ name: 'Hielo y piedra', goal: 'thaw', n: [70, 52, 50], par: [[43, 37], [41, 36], [40, 30]], undo: [2, 1, 1],
      ice: [[4, 64, 574], [3, 302, 580], [2, 180, 430]], rock: [[200, 586]], seq: { seed: 1010, w: [5, 4, 3, 2], s: [12, 24] },
      tip: 'Nuevo: puedes deshacer la última fruta (botón de la flecha o B). Sin deshacer, más estrellas.' },
    /* ---- 11-12: bombas ---- */
    { /* 11 */ name: 'Bombas', goal: 'stones', need: [4, 5, 5], n: [36, 34, 42], par: [[27, 23], [26, 23], [32, 23]], undo: [2, 1, 1],
      rock: [[60, 580], [180, 580], [300, 580]], seq: { seed: 1111, w: [5, 4, 3, 2], s: [4, 11, 18, 25], b: [8, 15, 22, 29, 36] },
      tip: 'La bomba estalla al tocar algo: rompe piedras y se lleva cerezas y fresas.' },
    { /* 12 */ name: 'Embudo', goal: 'reach', tier: 6, n: [44, 40, 38], par: [[33, 29], [33, 29], [33, 29]], undo: [2, 1, 1],
      jar: 'funnel', seq: { seed: 1212, w: [4, 3, 3, 2], b: [24] },
      tip: 'Embudo: solo las frutas pequeñas pasan abajo. Llena el fondo con cabeza.' },
    /* ---- 13-14: reloj ---- */
    { /* 13 */ name: 'Contra reloj', goal: 'make', tier: 4, need: [4, 5, 5], n: [36, 40, 38], par: [[25, 21], [33, 29], [33, 29]], sec: [70, 62, 56], undo: [2, 1, 1],
      seq: { seed: 1313, w: [5, 4, 3, 2] }, tip: 'Hay reloj: suelta rápido, pero sin tapar las parejas.' },
    { /* 14 */ name: 'Deshielo rápido', goal: 'thaw', n: [56, 52, 50], par: [[34, 22], [34, 22], [34, 22]], sec: [80, 72, 64], undo: [2, 1, 1],
      ice: [[3, 58, 580], [3, 302, 580], [4, 180, 574], [3, 58, 470]], seq: { seed: 1414, w: [5, 4, 3, 2] },
      tip: 'Cuatro frutas heladas y el reloj en marcha: suéltalas de abajo arriba.' },
    /* ---- 15-16: el Exprimidor (gravedad central) ---- */
    { /* 15 */ name: 'El Exprimidor', goal: 'reach', tier: 6, orb: 1, n: [54, 52, 52], par: [[31, 26], [31, 26], [31, 26]], undo: [2, 1, 1],
      seq: { seed: 1515, w: [5, 4, 3, 2] }, tip: 'Todo cae hacia el exprimidor del centro. Elige el ángulo, no la columna.' },
    { /* 16 */ name: 'Órbita con piedras', goal: 'stones', need: [6, 6, 7], orb: 1, n: [36, 34, 40], par: [[27, 24], [27, 24], [34, 31]], undo: [2, 1, 1],
      rock: [[180, 316], [250, 430], [110, 430]], seq: { seed: 1616, w: [5, 4, 3], s: [5, 12, 19, 26, 33], b: [9, 16, 23, 30, 37, 44] },
      tip: 'Las bombas también caen hacia el centro: suéltalas por el lado de las piedras.' },
    /* ---- 17-19: combinaciones ---- */
    { /* 17 */ name: 'Cuello helado', goal: 'thaw', jar: 'neck', n: [56, 50, 46], par: [[34, 24], [33, 24], [33, 24]], sec: [86, 76, 70], undo: [2, 1, 1],
      ice: [[2, 53, 585], [3, 302, 580], [5, 175, 567]], seq: { seed: 1717, w: [5, 4, 3, 2], b: [18, 30, 42] },
      tip: 'Boca estrecha, hielo y reloj: libera las de abajo antes de que el cuello se llene.' },
    { /* 18 */ name: 'Exprimidor helado', goal: 'thaw', orb: 1, n: [56, 50, 48], par: [[27, 23], [27, 23], [27, 23]], sec: [96, 86, 80], undo: [2, 1, 1],
      ice: [[3, 180, 274], [3, 285, 350], [3, 245, 473], [3, 115, 473], [3, 75, 350]], seq: { seed: 1818, w: [5, 4, 3], s: [14], b: [22] },
      tip: 'Cinco frutas heladas flotan alrededor del exprimidor y el reloj corre. Funde a su lado.' },
    { /* 19 */ name: 'Todo a la vez', goal: 'reach', tier: 7, jar: 'vee', n: [80, 74, 70], par: [[57, 50], [57, 50], [57, 50]], sec: [130, 120, 110], undo: [2, 1, 1],
      rock: [[180, 580]], ice: [[4, 66, 450], [4, 294, 450]], seq: { seed: 1919, w: [4, 3, 3, 2], s: [15, 33], b: [24, 40] },
      tip: 'Llega al pomelo con piedras, hielo, bombas y reloj. Fondo en V: todo rueda al centro.' },
    /* ---- 20: final ---- */
    { /* 20 */ name: 'La Gran Sandía', goal: 'reach', tier: 10, top: 140, n: [70, 60, 56], par: [[33, 22], [33, 22], [33, 22]], undo: [3, 2, 1],
      ice: [[9, 109, 529], [8, 260, 540], [6, 79, 409], [7, 272, 419], [5, 179, 436]], seq: { seed: 2020, w: [4, 3, 3, 2], b: [14, 30] },
      tip: 'El final: un melón, un melocotón, un pomelo, una manzana y un kiwi helados. Haz otro kiwi a su lado y caerán en cascada hasta la sandía.' },
  ],
};
if (typeof module !== 'undefined' && module.exports) module.exports = { FU, FRUTLV };
