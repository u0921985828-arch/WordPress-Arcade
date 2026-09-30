/* Horda: supervivencia cooperativa a gran escala (1–4 jugadores; en el modo tele la CPU rellena las plazas libres).
 * Modos (CFG.mode):
 *   'horda' — Horda a Dúo: el disparo es automático, tú solo te mueves y esquivas. Los bichos sueltan gemas,
 *             al llenar la barra subes de nivel y eliges 1 mejora entre 3. Jefe cada 90 s. Manda el reloj.
 *   'aldea' — Defensa de la Aldea: además de a ti hay que proteger las casas. Descanso entre oleadas para
 *             reparar y plantar barricadas con la madera que sueltan los bichos.
 *   'fuego' — Bomberos del Barrio: aquí no se mata, se apaga. El fuego se propaga por una rejilla de estancias,
 *             el agua se recoge en la fuente, hay vecinos que sacar a la ambulancia y el edificio se derrumba.
 *
 * Rendimiento (criterio de aceptación de la oleada 5): hasta 300 enemigos a 60 fps.
 *   - Rejilla espacial (celdas de 56 px) para separación, impactos de bala y contacto con jugadores.
 *   - Pools con borrado por intercambio: NUNCA splice en los bucles calientes.
 *   - Todo el arte se hornea en sprites cacheados a Math.min(2, devicePixelRatio); ni shadowBlur, ni filter,
 *     ni gradientes creados dentro del bucle, ni source-atop sobre el lienzo vivo.
 */
/* ===== §8 «Ley de la pieza única» — utilería local (REMASTER.md §8) =====
 * unite8(): traza y contornea TODAS las partes y después las rellena en orden de profundidad, así
 * dentro de la silueta no sobrevive ningún contorno cerrado: solo el borde exterior. Las separaciones
 * internas se leen por sombra propia (seam8) o por cambio de color, nunca por stroke. */
const P8OUT = ART.OUT, P8W = 1.5, P8IW = 0.7, P8IA = 0.62, P8T = 6.2832;
const _p8h = (s) => { s = String(s).replace('#', ''); if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _p8c = (a) => `rgb(${Math.max(0, Math.min(255, a[0] | 0))},${Math.max(0, Math.min(255, a[1] | 0))},${Math.max(0, Math.min(255, a[2] | 0))})`;
const LT8 = (col, f) => (String(col)[0] === '#' ? _p8c(_p8h(col).map((v) => v + (255 - v) * f)) : col);
const DK8 = (col, f) => (String(col)[0] === '#' ? _p8c(_p8h(col).map((v) => v * (1 - f))) : col);
const AL8 = (col, a) => { const q = _p8h(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
const CV8 = (w, h) => { const q = document.createElement('canvas'); q.width = Math.max(1, Math.ceil(w)); q.height = Math.max(1, Math.ceil(h)); return q; };
function rr8(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const DPR8 = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
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
function seam8(g, path, base, fn, f) { clip8(g, path, (q) => { q.fillStyle = DK8(base, f == null ? 0.16 : f); fn(q); }); }
function ink8(g, w, a) { g.lineWidth = w == null ? P8IW : w; g.strokeStyle = AL8(P8OUT, a == null ? P8IA : a); }
function shine8(g, x, y, rx, ry, rot, a) { g.fillStyle = `rgba(255,255,255,${a == null ? 0.34 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, P8T); g.fill(); }
function drop8(g, x, y, rx, ry, a) { g.fillStyle = `rgba(26,21,48,${a == null ? 0.26 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, P8T); g.fill(); }
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
/* La cara manda: ojos grandes con PÁRPADO SUPERIOR RECTO y cejas gruesas */
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
function brow8(g, cx, cy, sep, len, tilt, col, th) {
  th = th || 1.5; g.fillStyle = col || P8OUT;
  for (const s of [-1, 1]) { g.beginPath(); bone8([[cx + s * (sep - len * 0.45), cy + tilt], [cx + s * (sep + len * 0.55), cy - tilt * 0.85]], [th, th * 0.5])(g); g.fill(); }
}
function mouth8(g, x, y, w, m, col) {
  if (m === 1 || m === 4) { g.beginPath(); g.ellipse(x, y + w * 0.14, w * (m === 4 ? 0.5 : 0.7), w * (m === 4 ? 0.6 : 0.76), 0, 0, P8T); g.fillStyle = col || '#5e2436'; g.fill(); return; }
  g.beginPath(); g.lineCap = 'round'; g.lineWidth = Math.max(1, w * 0.26); g.strokeStyle = col || AL8(P8OUT, 0.9);
  if (m === 3) { g.moveTo(x - w * 0.5, y); g.lineTo(x + w * 0.5, y); }
  else if (m === 2) { g.moveTo(x - w * 0.5, y + w * 0.2); g.quadraticCurveTo(x, y - w * 0.3, x + w * 0.5, y + w * 0.2); }
  else { g.moveTo(x - w * 0.55, y - w * 0.1); g.quadraticCurveTo(x, y + w * 0.55, x + w * 0.55, y - w * 0.1); }
  g.stroke();
}

/* ================================================================ modo y lienzo */
const M = CFG.mode || 'horda', ALDEA = M === 'aldea', FUEGO = M === 'fuego', HORDA = !ALDEA && !FUEGO;
const PORT = innerHeight > innerWidth * 1.05;
const W = PORT ? 480 : 820, H = PORT ? 760 : 470, TOP = PORT ? 64 : 56;
const BG = FUEGO ? '#150d1f' : ALDEA ? '#101a2b' : '#120c26';
const k = Kit({ w: W, h: H, title: CFG.title, bg: BG }), c = k.ctx;
const clamp = k.clamp, hyp = Math.hypot, lerp = (a, b, u) => a + (b - a) * clamp(u, 0, 1);
const AX = 8, AY = TOP + 6, AW = W - 16, AH = H - AY - 8;
const AX2 = AX + AW, AY2 = AY + AH;
/* Franja de calle (solo bomberos): fuente a la izquierda, ambulancia a la derecha */
const ST_H = FUEGO ? (PORT ? 96 : 84) : 0;
const BLD_Y2 = AY2 - ST_H;
const TAU = P8T;

/* ---------------------------------------------------------------- texto */
const FONT = (s, w) => `${w || 700} ${s}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
function label(s, x, y, size, col, align, maxw) {
  s = String(s); c.font = FONT(size);
  if (maxw) {
    let sz = size;
    while (sz > 9 && c.measureText(s).width > maxw) { sz -= 1; c.font = FONT(sz); }
    if (c.measureText(s).width > maxw) { while (s.length > 2 && c.measureText(s + '…').width > maxw) s = s.slice(0, -1); s += '…'; }
  }
  c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.fillStyle = col || '#efeaff';
  c.fillText(s, x, y); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  return c.measureText(s).width;
}
function bar(x, y, w, h, f, col, bg) {
  c.fillStyle = bg || 'rgba(26,21,48,.72)'; c.beginPath(); rr8(c, x, y, w, h, h / 2); c.fill();
  const ww = Math.max(0, Math.min(1, f)) * (w - 2);
  if (ww > 0.6) { c.fillStyle = col; c.beginPath(); rr8(c, x + 1, y + 1, ww, h - 2, (h - 2) / 2); c.fill(); }
}
/* placa de una pieza para los rótulos del lienzo (§8: un cuerpo con borde, no rectángulos encajados) */
function plate(x, y, w, h, col, a) {
  c.beginPath(); rr8(c, x, y, w, h, Math.min(h / 2, 10));
  c.fillStyle = col || `rgba(20,14,40,${a == null ? 0.82 : a})`; c.fill();
  c.lineWidth = 1.6; c.strokeStyle = AL8(P8OUT, 0.9); c.stroke();
}

/* ================================================================ sprites cacheados */
const PCOL = ['#ff6b6b', '#4fc3f7', '#ffd166', '#8ed36b'];
const hsh = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/* --- héroe: un solo trazado continuo (torso+cabeza+brazos+piernas se funden) --- */
function heroSpr(col, fr, kind) {
  const key = `h${col}${fr}${kind}`;
  if (SPR8[key]) return SPR8[key];
  const sw = (fr === 1 ? 1 : fr === 3 ? -1 : 0);          /* balanceo de piernas */
  const bob = fr === 1 || fr === 3 ? -1.2 : 0;
  const skin = '#ffd3ad', hat = kind === 'fire' ? '#ffb020' : kind === 'vec' ? '#d9e2ff' : LT8(col, 0.12);
  const sc = kind === 'vec' ? 0.84 : 1;
  return spr8(key, 46, 64, 23, 56, (g) => {
    g.save(); g.scale(sc, sc);
    drop8(g, 0, 1, 11, 4.2, 0.3);
    const legL = bone8([[-4.2, -14], [-4.6 + sw * 3.4, -3], [-4.8 + sw * 5, 0.5]], [4.2, 3.4, 3]);
    const legR = bone8([[4.2, -14], [4.6 - sw * 3.4, -3], [4.8 - sw * 5, 0.5]], [4.2, 3.4, 3]);
    const armL = bone8([[-7, -27 + bob], [-11.5, -21 + bob + sw * 2.2]], [3.4, 2.9]);
    const armR = bone8([[7, -27 + bob], [11.5, -21 + bob - sw * 2.2]], [3.4, 2.9]);
    const torso = (q) => { rr8(q, -8.6, -31 + bob, 17.2, 19, 7); };
    const head = (q) => { q.moveTo(7.6, -38 + bob); q.arc(0, -38 + bob, 7.6, 0, TAU); };
    const body = (q) => { legL(q); legR(q); torso(q); armL(q); armR(q); head(q); };
    const mittL = mitt8(-12.6, -19.6 + bob + sw * 2.2, 2.6, 3.1, 1);
    const mittR = mitt8(12.6, -19.6 + bob - sw * 2.2, 0.6, 3.1, -1);
    const cap = (q) => { q.moveTo(-9.4, -42.5 + bob); q.quadraticCurveTo(0, -50.5 + bob, 9.4, -42.5 + bob); q.quadraticCurveTo(10.8, -40.8 + bob, 7.2, -40.6 + bob); q.lineTo(-7.2, -40.6 + bob); q.quadraticCurveTo(-10.8, -40.8 + bob, -9.4, -42.5 + bob); q.closePath(); };
    unite8(g, [
      [body, skin, { dx: 2, dy: 1.8 }, (q) => {
        /* ropa: cambio de color dentro de la silueta, nunca un contorno nuevo */
        q.fillStyle = col; q.fillRect(-12, -32 + bob, 24, 14);
        q.fillStyle = DK8(col, 0.3); q.fillRect(-12, -19 + bob, 24, 6);
        q.fillStyle = DK8(col, 0.42); q.fillRect(-12, -2.6, 24, 4);
        q.fillStyle = LT8(col, 0.26); q.fillRect(-12, -32 + bob, 24, 3.2);
        if (kind === 'fire') { q.fillStyle = '#ffd166'; q.fillRect(-12, -25.5 + bob, 24, 2.6); }
      }],
      [mittL, skin, { dx: 1.4, dy: 1.2 }, 0], [mittR, skin, { dx: 1.4, dy: 1.2 }, 0],
      [cap, hat, { dx: 1.6, dy: 1.4 }, 0],
    ], 1.55);
    /* cara (recortada contra la cabeza) */
    clip8(g, head, (q) => {
      eyes8(q, 0, -38.4 + bob, 3.1, 2.5, { iris: '#35508f', lid: 0.2, lidCol: skin });
      brow8(q, 0, -42.4 + bob, 3.2, 3.4, 0.5, P8OUT, 1.2);
      mouth8(q, 0, -33.6 + bob, 4.4, 0);
    });
    shine8(g, -4.4, -41.2 + bob, 2.1, 1.3, -0.5, 0.26);
    g.restore();
  });
}

/* --- bichos: una pieza; solo se separan las alas (se mueven de verdad) --- */
function foeSpr(type, fr) {
  const key = `f${type}${fr}`;
  if (SPR8[key]) return SPR8[key];
  const F = FOES[type], col = F.col, R = F.r, S = R * 4.6, o = R * 2.3;
  return spr8(key, S, S, o, o, (g) => {
    drop8(g, 0, R * 0.78, R * 0.86, R * 0.32, 0.3);
    if (type === 'murci') {
      const sq = fr ? 1 : -1;
      const wingL = (q) => { q.moveTo(-R * 0.5, -R * 0.2); q.quadraticCurveTo(-R * 1.9, -R * (0.9 + sq * 0.5), -R * 2.1, -R * (0.1 + sq * 0.3)); q.quadraticCurveTo(-R * 1.4, R * 0.25, -R * 0.5, R * 0.35); q.closePath(); };
      const wingR = (q) => { q.moveTo(R * 0.5, -R * 0.2); q.quadraticCurveTo(R * 1.9, -R * (0.9 + sq * 0.5), R * 2.1, -R * (0.1 + sq * 0.3)); q.quadraticCurveTo(R * 1.4, R * 0.25, R * 0.5, R * 0.35); q.closePath(); };
      const body = (q) => {
        q.moveTo(0, -R * 1.18); q.quadraticCurveTo(R * 0.95, -R * 1.05, R * 0.82, R * 0.1);
        q.quadraticCurveTo(R * 0.5, R * 0.95, 0, R * 0.92);
        q.quadraticCurveTo(-R * 0.5, R * 0.95, -R * 0.82, R * 0.1);
        q.quadraticCurveTo(-R * 0.95, -R * 1.05, 0, -R * 1.18);
        q.moveTo(-R * 0.72, -R * 1.02); q.lineTo(-R * 0.3, -R * 1.62); q.lineTo(-R * 0.08, -R * 0.98); q.closePath();
        q.moveTo(R * 0.72, -R * 1.02); q.lineTo(R * 0.3, -R * 1.62); q.lineTo(R * 0.08, -R * 0.98); q.closePath();
      };
      unite8(g, [[wingL, DK8(col, 0.3), { dx: 1, dy: 1 }, 0], [wingR, DK8(col, 0.3), { dx: 1, dy: 1 }, 0],
        [body, col, { dx: 1.8, dy: 1.6 }, (q) => { q.fillStyle = LT8(col, 0.3); q.fillRect(-R, R * 0.2, R * 2, R); }]], 1.5);
      clip8(g, body, (q) => { eyes8(q, 0, -R * 0.24, R * 0.34, R * 0.26, { iris: '#ffce4d', lid: 0.16, lidCol: DK8(col, 0.28), tilt: 0.2 }); mouth8(q, 0, R * 0.42, R * 0.5, 2); });
    } else if (type === 'baba') {
      const sq = fr ? 0.12 : -0.08;
      const body = (q) => {
        const rx = R * (1 - sq), ry = R * (1 + sq);
        q.moveTo(0, -ry);
        q.bezierCurveTo(rx * 1.22, -ry, rx * 1.1, ry * 0.86, rx * 0.72, ry * 0.94);
        q.quadraticCurveTo(0, ry * 1.05, -rx * 0.72, ry * 0.94);
        q.bezierCurveTo(-rx * 1.1, ry * 0.86, -rx * 1.22, -ry, 0, -ry);
        q.closePath();
      };
      unite8(g, [[body, col, { dx: 2, dy: 1.8 }, (q) => {
        q.fillStyle = DK8(col, 0.22); q.fillRect(-R * 1.4, R * 0.42, R * 2.8, R);
      }]], 1.5);
      clip8(g, body, (q) => { eyes8(q, 0, -R * 0.12, R * 0.38, R * 0.3, { iris: '#2f2450', lid: 0.14, lidCol: DK8(col, 0.2), tilt: 0.24 }); mouth8(q, 0, R * 0.46, R * 0.6, 2); });
      shine8(g, -R * 0.42, -R * 0.5, R * 0.26, R * 0.16, -0.5, 0.3);
    } else {
      const sq = fr ? 1 : -1, big = type === 'jefe';
      const body = (q) => {
        q.moveTo(0, -R * 1.02);
        q.quadraticCurveTo(R * 1.05, -R * 0.95, R * 0.94, R * 0.2);
        q.quadraticCurveTo(R * 0.86, R * 1.02, R * 0.34, R * 1.0);
        q.lineTo(-R * 0.34, R * 1.0);
        q.quadraticCurveTo(-R * 0.86, R * 1.02, -R * 0.94, R * 0.2);
        q.quadraticCurveTo(-R * 1.05, -R * 0.95, 0, -R * 1.02);
        /* brazos gruesos fundidos con el torso */
        bone8([[-R * 0.8, -R * 0.3], [-R * 1.32, R * (0.16 + sq * 0.14)]], [R * 0.3, R * 0.26])(q);
        bone8([[R * 0.8, -R * 0.3], [R * 1.32, R * (0.16 - sq * 0.14)]], [R * 0.3, R * 0.26])(q);
        /* cuernos */
        q.moveTo(-R * 0.86, -R * 0.72); q.lineTo(-R * 1.16, -R * 1.34); q.lineTo(-R * 0.48, -R * 0.94); q.closePath();
        q.moveTo(R * 0.86, -R * 0.72); q.lineTo(R * 1.16, -R * 1.34); q.lineTo(R * 0.48, -R * 0.94); q.closePath();
        if (big) { q.moveTo(-R * 0.5, -R * 1.02); q.lineTo(-R * 0.3, -R * 1.5); q.lineTo(0, -R * 1.1); q.lineTo(R * 0.3, -R * 1.5); q.lineTo(R * 0.5, -R * 1.02); q.closePath(); }
      };
      unite8(g, [[body, col, { dx: 2.2, dy: 2 }, (q) => {
        q.fillStyle = DK8(col, 0.26); q.fillRect(-R * 1.5, R * 0.34, R * 3, R);
        q.fillStyle = LT8(col, 0.2); q.fillRect(-R * 0.36, -R * 0.4, R * 0.72, R * 0.8);
      }]], big ? 1.9 : 1.6);
      clip8(g, body, (q) => {
        eyes8(q, 0, -R * 0.38, R * 0.36, R * 0.24, { iris: '#ff3b3b', lid: 0.3, lidCol: DK8(col, 0.3), tilt: 0.34 });
        brow8(q, 0, -R * 0.66, R * 0.36, R * 0.42, R * 0.12, P8OUT, R * 0.13);
        mouth8(q, 0, R * 0.16, R * 0.58, 2);
      });
    }
  });
}

/* --- gema de experiencia / madera / corazón: piezas únicas --- */
function dropSpr(kind) {
  const key = 'd' + kind; if (SPR8[key]) return SPR8[key];
  return spr8(key, 26, 26, 13, 13, (g) => {
    drop8(g, 0, 7, 6, 2.2, 0.26);
    if (kind === 'xp') {
      const p = (q) => { q.moveTo(0, -8); q.lineTo(5.6, -2.4); q.lineTo(3.4, 7); q.lineTo(-3.4, 7); q.lineTo(-5.6, -2.4); q.closePath(); };
      unite8(g, [[p, '#7be0ff', { dx: 1.4, dy: 1.2 }, (q) => { q.fillStyle = '#c9f4ff'; q.fillRect(-6, -9, 4.6, 18); }]], 1.3);
      shine8(g, -1.8, -3.6, 1.5, 2.6, 0.3, 0.42);
    } else if (kind === 'wood') {
      const p = (q) => { rr8(q, -8, -4.4, 16, 9, 4.4); };
      unite8(g, [[p, '#c98a4b', { dx: 1.4, dy: 1.2 }, (q) => { q.fillStyle = DK8('#c98a4b', 0.24); q.fillRect(-2, -6, 2.4, 12); q.fillStyle = DK8('#c98a4b', 0.24); q.fillRect(3, -6, 2.4, 12); }]], 1.3);
    } else {
      const p = (q) => { q.moveTo(0, 7.4); q.bezierCurveTo(-9, 0.6, -6.6, -7.4, 0, -3.2); q.bezierCurveTo(6.6, -7.4, 9, 0.6, 0, 7.4); q.closePath(); };
      unite8(g, [[p, '#ff5d7a', { dx: 1.4, dy: 1.2 }, 0]], 1.3);
      shine8(g, -2.8, -1.6, 1.6, 1.1, -0.5, 0.5);
    }
  });
}

/* --- casa de la aldea (una pieza: tejado y cuerpo fundidos) --- */
const HW = PORT ? 74 : 80, HH = PORT ? 66 : 68;
function houseSpr(dmg) {
  const key = 'ho' + dmg; if (SPR8[key]) return SPR8[key];
  const base = dmg === 2 ? '#8a6a52' : '#d9b483', roof = dmg === 2 ? '#6b3b3b' : '#c25b4e';
  return spr8(key, HW + 16, HH + 32, (HW + 16) / 2, HH + 18, (g) => {
    drop8(g, 0, 0, HW * 0.52, 7, 0.3);
    const body = (q) => {
      q.moveTo(-HW / 2, 0); q.lineTo(-HW / 2, -HH * 0.52);
      q.lineTo(-HW * 0.58, -HH * 0.52); q.lineTo(0, -HH); q.lineTo(HW * 0.58, -HH * 0.52);
      q.lineTo(HW / 2, -HH * 0.52); q.lineTo(HW / 2, 0); q.closePath();
      if (dmg < 2) { rr8(q, HW * 0.18, -HH * 1.0, HW * 0.16, HH * 0.34, 3); }   /* chimenea fundida con el tejado */
    };
    unite8(g, [[body, base, { dx: 2.4, dy: 2.2 }, (q) => {
      q.fillStyle = roof; q.beginPath(); q.moveTo(-HW * 0.62, -HH * 0.5); q.lineTo(0, -HH * 1.02); q.lineTo(HW * 0.62, -HH * 0.5); q.closePath(); q.fill();
      q.fillStyle = DK8(roof, 0.2); q.fillRect(-HW, -HH * 0.56, HW * 2, 4);
      q.fillStyle = DK8(base, 0.3); q.fillRect(-HW * 0.14, -HH * 0.34, HW * 0.28, HH * 0.34);   /* puerta por sombra propia */
      q.fillStyle = dmg ? '#5b4a3a' : '#8ed6ff'; q.fillRect(-HW * 0.4, -HH * 0.42, HW * 0.16, HH * 0.16);
      q.fillStyle = dmg ? '#5b4a3a' : '#8ed6ff'; q.fillRect(HW * 0.24, -HH * 0.42, HW * 0.16, HH * 0.16);
      if (dmg) { ink8(q, 1.5, 0.8); q.beginPath(); q.moveTo(-HW * 0.3, 0); q.lineTo(-HW * 0.18, -HH * 0.3); q.lineTo(-HW * 0.3, -HH * 0.44); q.stroke(); }
      if (dmg === 2) { ink8(q, 1.8, 0.85); q.beginPath(); q.moveTo(HW * 0.36, 0); q.lineTo(HW * 0.2, -HH * 0.26); q.lineTo(HW * 0.34, -HH * 0.46); q.stroke(); }
    }]], 1.8);
  });
}
function barrSpr() {
  return spr8('barr', 52, 40, 26, 30, (g) => {
    drop8(g, 0, 2, 18, 5, 0.3);
    const p = (q) => {
      bone8([[-18, -6], [18, -14]], [5, 5])(q);
      bone8([[-18, -16], [18, -6]], [5, 5])(q);
      rr8(q, -20, -24, 6, 26, 3); rr8(q, 14, -24, 6, 26, 3);
    };
    unite8(g, [[p, '#b8794a', { dx: 1.8, dy: 1.6 }, (q) => { q.fillStyle = DK8('#b8794a', 0.24); q.fillRect(-24, -6, 48, 4); }]], 1.6);
  });
}
/* --- fuente y ambulancia (bomberos) --- */
function fountSpr() {
  return spr8('fu', 84, 80, 42, 66, (g) => {
    drop8(g, 0, 2, 30, 8, 0.3);
    const p = (q) => { rr8(q, -30, -18, 60, 22, 9); rr8(q, -9, -44, 18, 28, 7); q.moveTo(15, -46); q.arc(0, -46, 15, 0, TAU); };
    unite8(g, [[p, '#9fb0c8', { dx: 2, dy: 1.8 }, (q) => {
      q.fillStyle = '#4fa8e8'; q.fillRect(-27, -15, 54, 8);
      q.fillStyle = LT8('#4fa8e8', 0.32); q.fillRect(-27, -15, 54, 3);
      q.fillStyle = '#6fc5ff'; q.fillRect(-11, -58, 22, 16);
    }]], 1.8);
    shine8(g, -8, -50, 4.4, 2.6, -0.5, 0.34);
  });
}
function ambSpr() {
  return spr8('am', 108, 70, 54, 52, (g) => {
    drop8(g, 0, 2, 40, 7, 0.3);
    const body = (q) => { rr8(q, -40, -36, 80, 38, 8); rr8(q, -30, -50, 44, 16, 6); };
    const wh = (q) => { q.moveTo(-22 + 9, 2); q.arc(-22, 2, 9, 0, TAU); q.moveTo(22 + 9, 2); q.arc(22, 2, 9, 0, TAU); };
    unite8(g, [[wh, '#3a3350', { dx: 1, dy: 1 }, 0], [body, '#f2f4ff', { dx: 2.2, dy: 2 }, (q) => {
      q.fillStyle = '#ff5d5d'; q.fillRect(-40, -18, 80, 7);
      q.fillStyle = '#8ed6ff'; q.fillRect(-27, -47, 38, 11);
      q.fillStyle = '#ff5d5d'; q.fillRect(20, -32, 7, 20); q.fillRect(13.5, -25.5, 20, 7);
    }]], 1.8);
  });
}
function vecSpr(i, fr) { return heroSpr(['#e8a0c0', '#9ad1a0', '#d8c489', '#a7b6ea', '#e0a67e', '#b9a0e0'][i % 6], fr, 'vec'); }
/* --- llama: 3 fotogramas cacheados --- */
function flameSpr(fr) {
  const key = 'fl' + fr; if (SPR8[key]) return SPR8[key];
  const s = [1, 1.1, 0.94][fr], t = [0, 0.4, -0.35][fr];
  return spr8(key, 48, 60, 24, 50, (g) => {
    const p = (q) => {
      q.moveTo(0, -42 * s);
      q.bezierCurveTo(9 * s + t * 3, -30 * s, 14 * s, -18 * s, 13 * s, -8 * s);
      q.bezierCurveTo(12 * s, 2, 6, 5, 0, 5);
      q.bezierCurveTo(-6, 5, -12 * s, 2, -13 * s, -8 * s);
      q.bezierCurveTo(-14 * s, -18 * s, -9 * s + t * 3, -30 * s, 0, -42 * s);
      q.closePath();
    };
    unite8(g, [[p, '#ff7a2a', { dx: 1.6, dy: 2.4 }, (q) => {
      q.fillStyle = '#ffc94d'; q.beginPath(); q.ellipse(0, -8 * s, 7 * s, 15 * s, 0, 0, TAU); q.fill();
      q.fillStyle = '#fff0b0'; q.beginPath(); q.ellipse(0, -5 * s, 3.4 * s, 7 * s, 0, 0, TAU); q.fill();
    }]], 1.5);
  });
}

/* ================================================================ suelo cacheado */
let FLOOR = null;
function buildFloor() {
  const q = CV8(AW * DPR8, AH * DPR8), g = q.getContext('2d');
  g.scale(DPR8, DPR8);
  const base = FUEGO ? '#3a2f4a' : ALDEA ? '#3f5a3a' : '#2a2050';
  g.fillStyle = base; g.fillRect(0, 0, AW, AH);
  /* manchas orgánicas deterministas, sin rejilla visible */
  const tone = FUEGO ? ['#4a3a5c', '#2e2540'] : ALDEA ? ['#527a46', '#31482f'] : ['#372a66', '#1f1840'];
  for (let n = 0; n < 170; n++) {
    const a = hsh(n, 11), b = hsh(n, 29), c = hsh(n, 43);
    const x = a * AW, y = b * AH, rx = 26 + c * 74, ry = 16 + hsh(n, 61) * 48;
    g.fillStyle = AL8(c > 0.5 ? tone[0] : tone[1], 0.30 + c * 0.22);
    g.beginPath(); g.ellipse(x, y, rx, ry, a * TAU, 0, TAU); g.fill();
  }
  for (let n = 0; n < 240; n++) {
    const a = hsh(n, 7), b = hsh(n, 17), c = hsh(n, 37);
    g.fillStyle = AL8(c > 0.62 ? '#ffffff' : '#1a1530', 0.05 + c * 0.07);
    g.beginPath(); g.ellipse(a * AW, b * AH, 3 + c * 9, 2 + c * 5, b * TAU, 0, TAU); g.fill();
  }
  for (let n = 0; n < 420; n++) {
    const a = hsh(n, 97), b = hsh(n, 113);
    g.fillStyle = AL8(a > 0.5 ? '#ffffff' : '#000000', 0.05);
    g.fillRect(a * AW, b * AH, 1.6, 1.6);
  }
  if (FUEGO) {   /* fachada del edificio y calle */
    const sy = BLD_Y2 - AY;
    g.fillStyle = '#4a3d5e'; g.fillRect(0, 0, AW, sy);
    for (let n = 0; n < 150; n++) {
      const a = hsh(n, 19), b = hsh(n, 31), cq = hsh(n, 53);
      g.fillStyle = AL8(cq > 0.55 ? '#ffffff' : '#1a1530', 0.05 + cq * 0.05);
      g.fillRect(a * AW, b * sy, 10 + cq * 26, 4 + cq * 5);
    }
    g.fillStyle = AL8('#ffffff', 0.10); g.fillRect(0, 0, AW, 5);
    g.fillStyle = AL8('#1a1530', 0.28); g.fillRect(0, sy - 6, AW, 6);
    g.fillStyle = '#2b2a3c'; g.fillRect(0, sy, AW, AH - sy);
    g.fillStyle = AL8('#ffffff', 0.09); g.fillRect(0, sy, AW, 3);
    for (let x = 14; x < AW - 20; x += 46) { g.fillStyle = AL8('#ffffff', 0.13); g.fillRect(x, sy + (AH - sy) / 2 - 2, 22, 4); }
  }
  /* viñeta (una vez, horneada) */
  const gr = g.createRadialGradient(AW / 2, AH / 2, Math.min(AW, AH) * 0.3, AW / 2, AH / 2, Math.max(AW, AH) * 0.72);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,6,24,.5)');
  g.fillStyle = gr; g.fillRect(0, 0, AW, AH);
  FLOOR = q;
}

/* ================================================================ estado */
const FOES = {
  baba: { r: 12, hp: 3, sp: 0.85, dmg: 9, col: '#8be04a', xp: 1 },
  murci: { r: 10, hp: 2, sp: 1.32, dmg: 6, col: '#b98cff', xp: 1 },
  bruto: { r: 17, hp: 11, sp: 0.6, dmg: 17, col: '#ff9060', xp: 3 },
  jefe: { r: 32, hp: 150, sp: 0.5, dmg: 24, col: '#ff5a8a', xp: 30 },
};
const MAXE = 300;
let ps = [], es = [], bs = [], ds = [], epool = [], bpool = [], dpool = [];
let t, over, choose, opts, selI, score, kills, lvl, xp, xpNeed, nextSpawn, bossT, bossN, alertT, alertC, anim;
let waveN, rest, waveLeft, houses, barrs, mats;
let fg, integ, rescued, lostV, vecs, vecT, vecN, extinguished;
let S = null;   /* mejoras compartidas del equipo (modo horda) */

const nHum = () => (k.party ? k.party.length : 1);
const nPl = () => ps.length;

/* ---------------------------------------------------------------- rejilla espacial */
const CS = 56;
let GC = 0, GR = 0, GCELL = [];
function gridInit() {
  GC = Math.ceil((AW + 160) / CS); GR = Math.ceil((AH + 160) / CS);
  GCELL = new Array(GC * GR); for (let i = 0; i < GCELL.length; i++) GCELL[i] = [];
}
const gcx = (x) => clamp(((x - AX + 80) / CS) | 0, 0, GC - 1);
const gcy = (y) => clamp(((y - AY + 80) / CS) | 0, 0, GR - 1);
function gridBuild() {
  for (let i = 0; i < GCELL.length; i++) if (GCELL[i].length) GCELL[i].length = 0;
  for (let i = 0; i < es.length; i++) GCELL[gcy(es[i].y) * GC + gcx(es[i].x)].push(i);
}

/* ---------------------------------------------------------------- pools (borrado por intercambio) */
function spawnFoe(type, x, y) {
  if (es.length >= MAXE) return null;
  const F = FOES[type];
  const e = epool.length ? epool.pop() : {};
  e.ty = type; e.x = x; e.y = y; e.r = F.r; e.vx = 0; e.vy = 0; e.cd = 0; e.bid = -1; e.fr = 0; e.fl = 0;
  e.hp = e.hpMax = F.hp * hpMul(); e.born = 0;
  es.push(e); return e;
}
function killFoe(i) { const e = es[i]; es[i] = es[es.length - 1]; es.pop(); epool.push(e); }
let bid = 0;
function shoot(x, y, ang, dmg, pierce, range) {
  const b = bpool.length ? bpool.pop() : {};
  b.x = x; b.y = y; b.vx = Math.cos(ang) * 340; b.vy = Math.sin(ang) * 340;
  b.life = range / 340; b.dmg = dmg; b.pi = pierce; b.id = ++bid; b.a = ang;
  bs.push(b);
}
function killB(i) { const b = bs[i]; bs[i] = bs[bs.length - 1]; bs.pop(); bpool.push(b); }
function addDrop(kind, x, y) {
  const d = dpool.length ? dpool.pop() : {};
  d.k = kind; d.x = x; d.y = y; d.vx = (Math.random() - 0.5) * 40; d.vy = (Math.random() - 0.5) * 40; d.t = 0;
  ds.push(d);
}
function killD(i) { const d = ds[i]; ds[i] = ds[ds.length - 1]; ds.pop(); dpool.push(d); }

/* ---------------------------------------------------------------- curva */
function hpMul() {
  if (ALDEA) return (1 + waveN * 0.36) * (0.8 + 0.1 * nPl());
  return (1 + t / 52) * (0.85 + 0.12 * nPl());
}
function foeSpeed(type) {
  const d = clamp(t / 240, 0, 1);
  return lerp(36, 62, d) * FOES[type].sp * k.D.spd * (t < 8 ? 0.62 : 1);
}
function spawnRate() {
  const d = clamp(t / 230, 0, 1);
  const ramp = t < 18 ? lerp(0.55, 1, t / 18) : 1;   /* arranque al ~55 % */
  return lerp(1.8, 16, d * d * 0.55 + d * 0.45) * ramp * k.D.rate * (0.75 + 0.2 * nPl());
}
function foePool() {
  const p = ['baba'];
  if (t > 32 || waveN > 1) p.push('murci');
  if (t > 78 || waveN > 3) p.push('bruto', 'baba');
  if (t > 130 || waveN > 6) p.push('murci', 'bruto');
  return p;
}
function edgePos() {
  const s = (Math.random() * 4) | 0, m = 34;
  if (s === 0) return [AX + Math.random() * AW, AY - m];
  if (s === 1) return [AX + Math.random() * AW, AY2 + m];
  if (s === 2) return [AX - m, AY + Math.random() * AH];
  return [AX2 + m, AY + Math.random() * AH];
}

/* ---------------------------------------------------------------- mejoras (horda) */
const UPS = [
  { n: 'Más pegada', d: '+25 % de daño', f: () => { S.dmg *= 1.25; } },
  { n: 'Gatillo rápido', d: '+22 % de cadencia', f: () => { S.rate *= 1.22; } },
  { n: 'Disparo doble', d: 'Un proyectil más', f: () => { S.shots++; } },
  { n: 'Botas ligeras', d: '+12 % de velocidad', f: () => { S.spd *= 1.12; } },
  { n: 'Corazón grande', d: '+25 de vida y cura', f: () => { S.hp += 25; for (const p of ps) { p.hpMax += 25; p.hp = Math.min(p.hpMax, p.hp + 25); } } },
  { n: 'Imán', d: '+50 de alcance al recoger', f: () => { S.mag += 50; } },
  { n: 'Punta perforante', d: 'Atraviesa un bicho más', f: () => { S.pi++; } },
  { n: 'Cañón largo', d: '+70 de alcance', f: () => { S.rng += 70; } },
  { n: 'Vendas', d: 'Recuperas 1,2 de vida por segundo', f: () => { S.reg += 1.2; } },
  { n: 'Onda de choque', d: 'Un anillo que empuja cada 7 s', f: () => { S.wave++; } },
];
function levelUp() {
  lvl++; xp -= xpNeed; xpNeed = 5 + lvl * 4;
  k.sfx('win');
  const pool = UPS.slice(); opts = [];
  for (let i = 0; i < 3 && pool.length; i++) opts.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  selI = 0; choose = 1;
}

/* ---------------------------------------------------------------- aldea */
function buildHouses() {
  houses = [];
  const n = PORT ? 3 : 4;
  const cx = AX + AW / 2, cy = AY + AH / 2;
  const rad = Math.min(AW, AH) * (PORT ? 0.2 : 0.22);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * TAU) / n;
    houses.push({ x: cx + Math.cos(a) * rad * (PORT ? 1.05 : 1.55), y: cy + Math.sin(a) * rad * 1.05, hp: 100, hpMax: 100 });
  }
}
function waveSize() { return Math.round((8 + waveN * 5) * (0.8 + 0.22 * nPl()) * k.D.rate); }
const WAVES = 10;

/* ---------------------------------------------------------------- bomberos */
let FC = 0, FR = 0, CWi = 0, CHi = 0, FX0 = 0, FY0 = 0;
function buildFire() {
  FC = PORT ? 6 : 10; FR = PORT ? 7 : 5;
  CWi = AW / FC; CHi = (BLD_Y2 - AY) / FR; FX0 = AX; FY0 = AY;
  fg = new Array(FC * FR);
  for (let j = 0; j < FR; j++) for (let i = 0; i < FC; i++) {
    const wall = i % 3 === 1 && j % 2 === 1;
    fg[j * FC + i] = { f: 0, burn: 0, dead: 0, wall, i, j };
  }
  /* dos focos iniciales, siempre lejos de la salida */
  const seeds = [[FC - 2, 0], [1, PORT ? 2 : 1]];
  for (const [i, j] of seeds) { const q = fg[j * FC + i]; if (q && !q.wall) q.f = 0.5; }
}
const cellAt = (x, y) => {
  const i = ((x - FX0) / CWi) | 0, j = ((y - FY0) / CHi) | 0;
  if (i < 0 || j < 0 || i >= FC || j >= FR) return null;
  return fg[j * FC + i];
};
const cellCx = (q) => FX0 + (q.i + 0.5) * CWi, cellCy = (q) => FY0 + (q.j + 0.5) * CHi;
let FOUNT, AMB;
function firePlaces() {
  const sy = (BLD_Y2 + AY2) / 2;
  FOUNT = { x: AX + AW * 0.18, y: sy + 8 };
  AMB = { x: AX + AW * 0.78, y: sy + 6 };
}
function burning() { let n = 0; for (let i = 0; i < fg.length; i++) if (fg[i].f > 0.01) n++; return n; }

/* ================================================================ jugadores */
function makePlayers() {
  const n = k.party ? Math.max(2, Math.min(4, nHum())) : 1;
  const list = k.players(n), old = {};
  for (const p of ps) old[p.p] = p;
  const cx = AX + AW / 2, cy = AY + AH * (FUEGO ? 0.78 : 0.5);
  ps = list.map((q, i) => {
    if (old[q.p]) { old[q.p].cpu = q.cpu; old[q.p].name = q.name; return old[q.p]; }
    return {
      p: q.p, cpu: q.cpu, name: q.name, col: k.party ? k.pcol(q.p) : PCOL[q.p % 4],
      x: cx + (i - (n - 1) / 2) * 44, y: cy, vx: 0, vy: 0, fx: 1, fy: 0, walk: 0,
      hp: 100, hpMax: 100, inv: 5, fire: 0, down: 0, downT: 0, rev: 0, kills: 0, score: 0,
      water: FUEGO ? 100 : 0, carry: -1, act: 0, wt: 0, aiT: 0, aiX: 0, aiY: 0,
    };
  });
  if (S) for (const p of ps) p.hpMax = 100 + S.hp;
}
k.onParty = () => makePlayers();

/* ================================================================ reset */
function reset() {
  t = 0; over = 0; choose = 0; opts = []; selI = 0; score = 0; kills = 0; anim = 0;
  lvl = 1; xp = 0; xpNeed = 6; nextSpawn = HORDA ? 1.6 : 0; bossT = 90; bossN = 0;
  alertT = 0; alertC = ''; es.length = 0; bs.length = 0; ds.length = 0;
  S = { dmg: 1, rate: 1, spd: 1, hp: 0, mag: 60, pi: 0, rng: 240, reg: 0, shots: 1, wave: 0, wt: 0 };
  waveN = 0; rest = ALDEA ? 6 : 0; waveLeft = 0; barrs = []; mats = 2;
  if (ALDEA) buildHouses();
  if (FUEGO) { buildFire(); firePlaces(); integ = 10 + k.D.life * 2; rescued = 0; lostV = 0; vecs = []; vecT = 2; vecN = PORT ? 6 : 7; extinguished = 0; }
  ps = []; makePlayers();
  if (!FLOOR) buildFloor();
}

/* ================================================================ avisos */
function warn(s) { alertT = 2; alertC = s; }

/* ================================================================ update */
function update(dt) {
  anim += dt; alertT -= dt;
  if (!k.gate(reset)) return;
  if (over) return;
  if (choose) { updChoose(); checkEnd(); return; }
  t += dt;
  updPlayers(dt);
  if (FUEGO) { updFire(dt); updVecs(dt); }
  else {
    updSpawn(dt); gridBuild(); updFoes(dt); updBullets(dt); updDrops(dt);
    if (ALDEA) updAldea(dt);
    gridBuild();
  }
  checkEnd();
}

/* ---------------------------------------------------------------- elección de mejora */
function chooseRects() {
  const vert = PORT || W < 700;
  const cw = vert ? Math.min(360, W - 48) : Math.min(230, (W - 80) / 3), ch = vert ? 74 : 132, gap = 12;
  const totW = vert ? cw : cw * 3 + gap * 2, totH = vert ? ch * 3 + gap * 2 : ch;
  const x0 = (W - totW) / 2, y0 = AY + 62 + Math.max(0, (AH - 90 - totH) / 2);
  return { vert, cw, ch, gap, x0, y0, totW, totH };
}
function updChoose() {
  if (!k.party && k.ptr.hit) {
    const R = chooseRects();
    for (let i = 0; i < opts.length; i++) {
      const x = R.vert ? R.x0 : R.x0 + i * (R.cw + R.gap), y = R.vert ? R.y0 + i * (R.ch + R.gap) : R.y0;
      if (k.ptr.x > x && k.ptr.x < x + R.cw && k.ptr.y > y && k.ptr.y < y + R.ch) { selI = i; opts[i].f(); choose = 0; k.sfx('coin'); k.burst(W / 2, H / 2, '#ffd166', 16, 200); return; }
    }
  }
  for (const p of ps) {
    if (!choose) break;
    if (p.cpu) continue;
    if (k.phit(p.p, 'right') || k.phit(p.p, 'down')) { selI = (selI + 1) % opts.length; k.sfx('click'); }
    if (k.phit(p.p, 'left') || k.phit(p.p, 'up')) { selI = (selI + opts.length - 1) % opts.length; k.sfx('click'); }
    if (k.phit(p.p, 'a')) { opts[selI].f(); choose = 0; k.sfx('coin'); k.burst(W / 2, H / 2, '#ffd166', 16, 200); }
  }
  /* si solo quedan CPU (todos los humanos se han ido), elige la máquina */
  if (choose && !ps.some((p) => !p.cpu)) { opts[0].f(); choose = 0; }
}

/* ---------------------------------------------------------------- jugadores */
function updPlayers(dt) {
  for (const p of ps) {
    if (p.down) {
      p.downT -= dt;
      if (p.downT <= 0) { p.down = 0; p.hp = p.hpMax * 0.45; p.inv = 2.4; k.float('¡En pie!', p.x, p.y - 40, '#8ed36b'); }
      continue;
    }
    p.inv -= dt;
    if (S.reg) p.hp = Math.min(p.hpMax, p.hp + S.reg * dt);
    let dx = 0, dy = 0;
    if (p.cpu) { const d = aiDir(p, dt); dx = d[0]; dy = d[1]; }
    else {
      const d = k.pdir(p.p); dx = d.x; dy = d.y;
      if (!k.party && p.p === 0 && k.ptr.down) {
        const L = hyp(k.ptr.x - p.x, k.ptr.y - p.y);
        if (L > 18) { dx = (k.ptr.x - p.x) / L; dy = (k.ptr.y - p.y) / L; }
      }
    }
    const L = hyp(dx, dy); if (L > 1) { dx /= L; dy /= L; }
    const base = (FUEGO ? 148 : 158) * S.spd * (p.carry >= 0 ? 0.84 : 1);
    p.vx = dx * base; p.vy = dy * base;
    p.x = clamp(p.x + p.vx * dt, AX + 14, AX2 - 14);
    p.y = clamp(p.y + p.vy * dt, AY + 14, AY2 - 12);
    if (FUEGO) blockWalls(p);
    if (L > 0.08) { p.fx = dx; p.fy = dy; p.walk += dt * 9 * (base / 158); }
    /* separación entre compañeros */
    for (const o of ps) if (o !== p && !o.down) { const ax = p.x - o.x, ay = p.y - o.y, d = hyp(ax, ay); if (d < 26 && d > 0.01) { const sf = Math.min(1, dt * 30); p.x += (ax / d) * (26 - d) * sf; p.y += (ay / d) * (26 - d) * sf; } }
    if (FUEGO) updFireman(p, dt);
    else autoFire(p, dt);
  }
  /* reanimación entre compañeros */
  for (const p of ps) {
    if (!p.down) continue;
    const helper = ps.find((o) => !o.down && hyp(o.x - p.x, o.y - p.y) < 40);
    if (helper) { p.rev += dt; if (p.rev >= 1.8) { p.rev = 0; p.down = 0; p.hp = p.hpMax * 0.6; p.inv = 2.4; p.downT = 0; k.sfx('win'); k.float('¡Levantado!', p.x, p.y - 40, '#8ed36b'); } }
    else p.rev = Math.max(0, p.rev - dt * 0.6);
  }
  /* onda de choque */
  if (S.wave > 0 && !FUEGO) {
    S.wt -= dt;
    if (S.wt <= 0) {
      S.wt = 7;
      for (const p of ps) {
        if (p.down) continue;
        k.burst(p.x, p.y, '#7be0ff', 14, 240); k.sfx('explode');
        for (let i = es.length - 1; i >= 0; i--) {
          const e = es[i], d = hyp(e.x - p.x, e.y - p.y);
          if (d < 120) { e.x += ((e.x - p.x) / (d || 1)) * 34; e.y += ((e.y - p.y) / (d || 1)) * 34; hurtFoe(i, 6 * S.wave * S.dmg, p); }
        }
      }
    }
  }
}
function hurtPlayer(p, dmg) {
  if (p.down || p.inv > 0) return;
  p.hp -= dmg * k.D.dmg; p.inv = 0.9; k.sfx('hurt'); k.shake(4); k.flash('rgba(255,80,110,.18)');
  if (p.hp <= 0) {
    p.hp = 0; p.down = 1; p.downT = 9; p.rev = 0; k.sfx('lose');
    if (nPl() > 1) k.float(p.name + ' caído', p.x, p.y - 40, '#ff6fb5');
  }
}
function autoFire(p, dt) {
  p.fire -= dt;
  const rate = (HORDA ? 2.1 : 1.7) * S.rate;
  if (p.fire > 0) return;
  let best = -1, bd = S.rng * S.rng;
  for (let i = 0; i < es.length; i++) { const e = es[i], dx = e.x - p.x, dy = e.y - p.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  if (best < 0) return;
  const ang = Math.atan2(es[best].y - p.y, es[best].x - p.x);
  p.fire = 1 / rate;
  const n = S.shots, spread = 0.16;
  for (let i = 0; i < n; i++) shoot(p.x + p.fx * 10, p.y - 12 + p.fy * 6, ang + (i - (n - 1) / 2) * spread, 2.4 * S.dmg, S.pi, S.rng);
  k.sfx('shoot');
}

/* ---------------------------------------------------------------- IA de la CPU */
function aiDir(p, dt) {
  p.aiT -= dt;
  if (FUEGO) {
    if (p.carry >= 0) { return norm(AMB.x - p.x, AMB.y - p.y); }
    if (p.water < 14) return norm(FOUNT.x - p.x, FOUNT.y - p.y);
    let best = null, bd = 1e9;
    for (const v of vecs) { if (v.out) continue; const d = hyp(v.x - p.x, v.y - p.y); if (d < bd) { bd = d; best = v; } }
    if (best && bd < 240) return norm(best.x - p.x, best.y - p.y);
    let bq = null; bd = 1e9;
    for (let i = 0; i < fg.length; i++) { const q = fg[i]; if (q.f <= 0.02) continue; const d = hyp(cellCx(q) - p.x, cellCy(q) - p.y); if (d < bd) { bd = d; bq = q; } }
    if (bq) { if (bd < 42) return [0, 0]; return norm(cellCx(bq) - p.x, cellCy(bq) - p.y); }
    return [0, 0];
  }
  /* horda / aldea: huir de lo cercano, ir a por las gemas, si no acercarse a la horda */
  let near = null, nd = 1e9;
  for (let i = 0; i < es.length; i++) { const e = es[i], d = hyp(e.x - p.x, e.y - p.y); if (d < nd) { nd = d; near = e; } }
  if (near && nd < 74) { const n = norm(p.x - near.x, p.y - near.y); return [n[0] + (p.p % 2 ? -n[1] : n[1]) * 0.7, n[1] + (p.p % 2 ? n[0] : -n[0]) * 0.7]; }
  let gd = 1e9, g = null;
  for (let i = 0; i < ds.length; i++) { const d = hyp(ds[i].x - p.x, ds[i].y - p.y); if (d < gd) { gd = d; g = ds[i]; } }
  if (g && gd < 260) return norm(g.x - p.x, g.y - p.y);
  if (p.aiT <= 0) { p.aiT = 1.6; p.aiX = AX + 40 + Math.random() * (AW - 80); p.aiY = AY + 40 + Math.random() * (AH - 80); }
  return norm(p.aiX - p.x, p.aiY - p.y);
}
function norm(x, y) { const d = hyp(x, y) || 1; return [x / d, y / d]; }

/* ---------------------------------------------------------------- enemigos */
function updSpawn(dt) {
  if (ALDEA) {
    if (rest > 0) { rest -= dt; if (rest <= 0) startWave(); return; }
    if (waveLeft > 0) {
      nextSpawn -= dt;
      if (nextSpawn <= 0) { const [x, y] = edgePos(); if (spawnFoe(k.pick(foePool()), x, y)) waveLeft--; nextSpawn = 0.34 / (0.7 + waveN * 0.08); }
    } else if (!es.length) endWave();
    return;
  }
  nextSpawn -= dt;
  const iv = 1 / spawnRate();
  while (nextSpawn <= 0) { const [x, y] = edgePos(); spawnFoe(k.pick(foePool()), x, y); nextSpawn += iv; }
  bossT -= dt;
  if (bossT <= 0) {
    bossT = 92; bossN++;
    const [x, y] = edgePos(); const b = spawnFoe('jefe', x, y);
    if (b) { b.hp = b.hpMax = FOES.jefe.hp * (0.8 + bossN * 0.55) * (0.8 + 0.14 * nPl()); k.sfx('explode'); k.shake(9); warn('¡Llega el jefe!'); }
  }
}
function startWave() {
  waveN++; waveLeft = waveSize(); nextSpawn = 0; k.sfx('start'); warn('Oleada ' + waveN + ' de ' + WAVES);
}
function endWave() {
  if (waveN >= WAVES) { winGame('¡Aldea salvada!'); return; }
  rest = 16; mats += 2; k.sfx('win'); warn('Descanso: repara (A) y planta barricadas (B)');
}
function hurtFoe(i, dmg, by) {
  const e = es[i]; e.hp -= dmg; e.fl = 0.12;
  if (e.hp > 0) return false;
  const F = FOES[e.ty];
  kills++; if (by) { by.kills++; by.score += F.xp * 10; }
  score += F.xp * 10;
  k.burst(e.x, e.y, F.col, e.ty === 'jefe' ? 30 : 7, e.ty === 'jefe' ? 260 : 150);
  k.sfx(e.ty === 'jefe' ? 'explode' : 'pop');
  if (e.ty === 'jefe') { k.shake(10); for (let j = 0; j < 6; j++) addDrop('xp', e.x + (Math.random() - 0.5) * 50, e.y + (Math.random() - 0.5) * 50); addDrop('hp', e.x, e.y); }
  else if (ALDEA) { if (Math.random() < 0.18) addDrop('wood', e.x, e.y); else if (Math.random() < 0.05) addDrop('hp', e.x, e.y); }
  else { addDrop(Math.random() < 0.04 ? 'hp' : 'xp', e.x, e.y); }
  killFoe(i);
  return true;
}
function updFoes(dt) {
  const sepR = 22, sepR2 = sepR * sepR;
  for (let i = es.length - 1; i >= 0; i--) {
    const e = es[i];
    e.born += dt;
    if (e.fl > 0) e.fl -= dt;
    /* objetivo */
    let td = 1e9, tgt = null, kind = 0;
    for (const p of ps) { if (p.down) continue; const d = hyp(p.x - e.x, p.y - e.y); if (d < td) { td = d; tgt = p; kind = 1; } }
    if (ALDEA) {
      if (!tgt || td > 110) {
        let bd = 1e9, bh = null;
        for (const h of houses) { if (h.hp <= 0) continue; const d = hyp(h.x - e.x, h.y - e.y); if (d < bd) { bd = d; bh = h; } }
        if (bh) { td = bd; tgt = bh; kind = 2; }
      }
      for (const b of barrs) { const d = hyp(b.x - e.x, b.y - e.y); if (d < 44) { td = d; tgt = b; kind = 3; break; } }
    }
    const tx = tgt ? tgt.x : AX + AW / 2, ty = tgt ? tgt.y : AY + AH / 2;
    let dx = tx - e.x, dy = ty - e.y; const L = hyp(dx, dy) || 1; dx /= L; dy /= L;
    const sp = foeSpeed(e.ty) * (e.born < 0.6 ? 0.5 : 1);
    e.x += dx * sp * dt; e.y += dy * sp * dt;
    e.fr = ((anim * 6 + i) | 0) & 1;
    /* separación con la rejilla */
    const cx = gcx(e.x), cy = gcy(e.y);
    for (let jy = Math.max(0, cy - 1); jy <= Math.min(GR - 1, cy + 1); jy++) {
      for (let jx = Math.max(0, cx - 1); jx <= Math.min(GC - 1, cx + 1); jx++) {
        const cell = GCELL[jy * GC + jx];
        for (let n = 0; n < cell.length; n++) {
          const j = cell[n]; if (j === i || j >= es.length) continue;
          const o = es[j], ax = e.x - o.x, ay = e.y - o.y, d2 = ax * ax + ay * ay;
          if (d2 < sepR2 && d2 > 0.01) { const d = Math.sqrt(d2), f = ((sepR - d) / d) * 0.5; e.x += ax * f; e.y += ay * f; }
        }
      }
    }
    e.x = clamp(e.x, AX - 60, AX2 + 60); e.y = clamp(e.y, AY - 60, AY2 + 60);
    /* contacto */
    e.cd -= dt;
    if (e.cd <= 0 && tgt && td < e.r + (kind === 1 ? 14 : kind === 2 ? 34 : 18)) {
      e.cd = 0.8;
      if (kind === 1) hurtPlayer(tgt, FOES[e.ty].dmg);
      else if (kind === 2) { tgt.hp -= FOES[e.ty].dmg * 0.9 * k.D.dmg; k.burst(e.x, e.y, '#d9b483', 5, 110); if (tgt.hp <= 0) { tgt.hp = 0; k.shake(8); k.sfx('explode'); warn('¡Una casa ha caído!'); } }
      else if (kind === 3) { tgt.hp -= FOES[e.ty].dmg * k.D.dmg; k.burst(e.x, e.y, '#b8794a', 4, 100); if (tgt.hp <= 0) { const bi = barrs.indexOf(tgt); if (bi >= 0) { barrs[bi] = barrs[barrs.length - 1]; barrs.pop(); } } }
    }
  }
}
function updBullets(dt) {
  for (let i = bs.length - 1; i >= 0; i--) {
    const b = bs[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < AX - 70 || b.x > AX2 + 70 || b.y < AY - 70 || b.y > AY2 + 70) { killB(i); continue; }
    const cx = gcx(b.x), cy = gcy(b.y);
    let done = 0;
    for (let jy = Math.max(0, cy - 1); jy <= Math.min(GR - 1, cy + 1) && !done; jy++) {
      for (let jx = Math.max(0, cx - 1); jx <= Math.min(GC - 1, cx + 1) && !done; jx++) {
        const cell = GCELL[jy * GC + jx];
        for (let n = 0; n < cell.length; n++) {
          const j = cell[n]; if (j >= es.length) continue;
          const e = es[j];
          if (e.bid === b.id) continue;
          const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + 5;
          if (dx * dx + dy * dy < rr * rr) {
            e.bid = b.id;
            k.burst(b.x, b.y, '#ffe9a8', 3, 90);
            const died = hurtFoe(j, b.dmg, ps.find((p) => !p.down) || ps[0]);
            if (b.pi > 0) { b.pi--; } else { killB(i); done = 1; }
            if (died) gridBuild();
            break;
          }
        }
      }
    }
  }
}
function updDrops(dt) {
  for (let i = ds.length - 1; i >= 0; i--) {
    const d = ds[i]; d.t += dt;
    d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.9; d.vy *= 0.9;
    let got = null, best = 1e9;
    for (const p of ps) { if (p.down) continue; const dd = hyp(p.x - d.x, p.y - d.y); if (dd < best) { best = dd; got = p; } }
    if (!got) continue;
    if (best < S.mag) { const n = norm(got.x - d.x, got.y - d.y), sp = lerp(230, 40, best / S.mag); d.x += n[0] * sp * dt; d.y += n[1] * sp * dt; }
    if (best < 18) {
      if (d.k === 'xp') { xp++; score += 4; if (xp >= xpNeed && HORDA && !choose) levelUp(); k.sfx('coin'); }
      else if (d.k === 'wood') { mats++; k.sfx('coin'); k.float('+madera', d.x, d.y - 16, '#c98a4b'); }
      else { got.hp = Math.min(got.hpMax, got.hp + 30); k.sfx('coin'); k.float('+30', d.x, d.y - 16, '#ff5d7a'); }
      killD(i);
    }
  }
}
function updAldea(dt) {
  for (const p of ps) {
    if (p.down) continue;
    if (rest <= 0) continue;
    /* reparar: A cerca de una casa dañada */
    const h = houses.find((q) => q.hp > 0 && q.hp < q.hpMax && hyp(q.x - p.x, q.y - p.y) < 62);
    const press = p.cpu ? 1 : k.pheld(p.p, 'a');
    if (h && press) { h.hp = Math.min(h.hpMax, h.hp + 26 * dt); p.act = 0.2; if (Math.random() < dt * 5) k.burst(h.x, h.y - 10, '#ffd166', 2, 60); }
    /* barricada: B */
    if (!p.cpu && k.phit(p.p, 'b')) {
      if (mats > 0) {
        if (barrs.length < 14) { barrs.push({ x: p.x, y: p.y + 12, hp: 70, hpMax: 70 }); mats--; k.sfx('hit'); }
        else warn('Ya hay demasiadas barricadas');
      } else warn('No te queda madera');
    }
  }
}

/* ---------------------------------------------------------------- bomberos */
function blockWalls(p) {
  const q = cellAt(p.x, p.y);
  if (q && q.wall) {
    const cx = cellCx(q), cy = cellCy(q), dx = p.x - cx, dy = p.y - cy;
    if (Math.abs(dx) / CWi > Math.abs(dy) / CHi) p.x = cx + Math.sign(dx || 1) * (CWi / 2 + 14);
    else p.y = cy + Math.sign(dy || 1) * (CHi / 2 + 14);
  }
}
function updFire(dt) {
  const grow = 0.075 * k.D.rate * (t < 6 ? 0.35 : 1);
  for (let i = 0; i < fg.length; i++) {
    const q = fg[i];
    if (q.dead || q.wall || q.f <= 0) continue;
    q.f += grow * dt;
    if (q.f >= 1) {
      q.f = 1; q.burn += dt;
      if (q.burn > 13) { q.dead = 1; q.f = 0; q.burn = 0; integ--; k.shake(9); k.sfx('explode'); warn('¡Se ha hundido una estancia!'); k.burst(cellCx(q), cellCy(q), '#6b6076', 16, 170); }
    }
    /* propagación */
    if (q.f > 0.45 && Math.random() < dt * 0.42 * k.D.rate) {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], d = dirs[(Math.random() * 4) | 0];
      const ni = q.i + d[0], nj = q.j + d[1];
      if (ni >= 0 && nj >= 0 && ni < FC && nj < FR) {
        const o = fg[nj * FC + ni];
        if (!o.wall && !o.dead && o.f <= 0) { o.f = 0.12; k.sfx('hit'); }
      }
    }
  }
  /* los vecinos y los bomberos se queman en las estancias ardiendo */
  for (const p of ps) {
    if (p.down) continue;
    const q = cellAt(p.x, p.y);
    if (q && q.f > 0.3) { p.wt = (p.wt || 0) + dt; if (p.wt > 0.8) { p.wt = 0; hurtPlayer(p, 9 * q.f); } }
    if (q && q.dead && p.inv <= 0) { hurtPlayer(p, 6); }
  }
}
function updFireman(p, dt) {
  /* recarga en la fuente */
  if (hyp(p.x - FOUNT.x, p.y - FOUNT.y) < 62) {
    if (p.water < 100) { p.water = Math.min(100, p.water + 62 * dt); if (Math.random() < dt * 6) k.burst(p.x, p.y - 10, '#6fc5ff', 2, 70); }
  }
  /* entregar vecino */
  if (p.carry >= 0 && hyp(p.x - AMB.x, p.y - AMB.y) < 62) {
    const v = vecs[p.carry]; if (v) { v.out = 1; v.gone = 1; }
    p.carry = -1; rescued++; score += 150; k.sfx('win'); k.float('¡Rescatado!', p.x, p.y - 44, '#8ed36b');
  }
  /* recoger vecino */
  if (p.carry < 0) {
    for (let i = 0; i < vecs.length; i++) {
      const v = vecs[i];
      if (v.out || v.held >= 0) continue;
      if (hyp(v.x - p.x, v.y - p.y) < 30) { v.held = p.p; p.carry = i; k.sfx('pop'); break; }
    }
  }
  /* manguera */
  const press = p.cpu ? (p.water > 4) : k.pheld(p.p, 'a');
  p.act = Math.max(0, p.act - dt);
  if (press && p.water > 0) {
    p.water = Math.max(0, p.water - 26 * dt); p.act = 0.1;
    const tx = p.x + p.fx * 48, ty = p.y + p.fy * 48;
    for (let i = 0; i < fg.length; i++) {
      const q = fg[i]; if (q.f <= 0) continue;
      const d = hyp(cellCx(q) - tx, cellCy(q) - ty);
      if (d < Math.max(CWi, CHi) * 0.8) {
        const was = q.f;
        q.f = Math.max(0, q.f - 1.15 * dt); q.burn = Math.max(0, q.burn - dt * 2);
        if (was > 0 && q.f <= 0) { extinguished++; score += 40; k.sfx('coin'); k.float('¡Apagado!', cellCx(q), cellCy(q), '#6fc5ff'); }
      }
    }
    if (Math.random() < dt * 22) k.burst(tx, ty, '#6fc5ff', 2, 110);
  }
}
function updVecs(dt) {
  vecT -= dt;
  if (vecT <= 0 && vecs.length < vecN) {
    vecT = 8.5;
    let tries = 0, q = null;
    while (tries++ < 30) { const o = fg[(Math.random() * fg.length) | 0]; if (!o.wall && !o.dead && o.f < 0.3) { q = o; break; } }
    if (q) vecs.push({ x: cellCx(q), y: cellCy(q), hp: 100, held: -1, out: 0, gone: 0, i: vecs.length, w: 0, fr: 0 });
  }
  for (const v of vecs) {
    if (v.gone) continue;
    if (v.held >= 0) {
      const p = ps.find((o) => o.p === v.held);
      if (!p || p.down || p.carry < 0) { v.held = -1; if (p) p.carry = -1; }
      else { v.x = p.x - p.fx * 14; v.y = p.y - 6; v.fr = (p.walk | 0) & 1; continue; }
    }
    const q = cellAt(v.x, v.y);
    if (q && q.f > 0.25) { v.hp -= 13 * dt * q.f; v.w += dt; }
    if (q && q.dead) v.hp -= 24 * dt;
    if (v.hp <= 0) { v.gone = 1; v.out = 1; lostV++; integ--; k.sfx('lose'); k.shake(6); warn('Un vecino no ha salido'); }
  }
}

/* ---------------------------------------------------------------- final */
function winGame(head) {
  over = 1; k.st = 'over'; k.sfx('win'); k.confetti();
  finish(head);
}
function finish(head) {
  const extra = HORDA ? `${kills} bichos · nivel ${lvl} · ${fmtT(t)}`
    : ALDEA ? `${waveN} oleadas · ${kills} bichos`
      : `${rescued} vecinos · ${extinguished} focos apagados`;
  if (k.party && ps.length > 1) k.podium(ps.map((p) => ({ p: p.p, score: p.score | 0 })), { head, go: 'Toca para la revancha' });
  else k.end(CFG.id, score | 0, head, extra);
}
function loseGame(head) {
  over = 1;
  const extra = HORDA ? `${kills} bichos · nivel ${lvl} · ${fmtT(t)}`
    : ALDEA ? `Oleada ${waveN} de ${WAVES}` : `${rescued} vecinos a salvo`;
  k.lose(CFG.id, score | 0, head, extra);
}
const fmtT = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const SURV = 300;
function checkEnd() {
  if (over) return;
  if (ps.length && ps.every((p) => p.down)) { loseGame(FUEGO ? 'El humo os pudo' : 'La horda os superó'); return; }
  if (FUEGO) {
    if (integ <= 0) { loseGame('El edificio se vino abajo'); return; }
    if (vecs.length >= vecN && vecs.every((v) => v.gone) && burning() === 0) { score += integ * 60; winGame('¡Barrio a salvo!'); return; }
    if (t > 240) { if (rescued > 0) winGame('¡Fin del turno!'); else loseGame('Se acabó el turno'); }
    return;
  }
  if (ALDEA) { if (houses.every((h) => h.hp <= 0)) loseGame('No queda aldea que defender'); return; }
  if (t >= SURV) { score += Math.round(t) * 2; winGame('¡Habéis aguantado!'); }
}

/* ================================================================ dibujo */
function draw() {
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  c.drawImage(FLOOR, AX, AY, AW, AH);
  if (FUEGO) drawBuilding();
  if (ALDEA) drawAldea();
  drawDrops();
  drawActors();
  drawBullets();
  drawHUD();
  if (choose) drawChoose();
}
function drawBuilding() {
  /* estancias: rejilla marcada por sombra propia, sin contornos encajados */
  for (let i = 0; i < fg.length; i++) {
    const q = fg[i], x = FX0 + q.i * CWi, y = FY0 + q.j * CHi;
    if (q.dead) { c.fillStyle = 'rgba(12,8,22,.86)'; c.fillRect(x + 1, y + 1, CWi - 2, CHi - 2); continue; }
    if (q.wall) { c.fillStyle = '#5a4b6e'; c.beginPath(); rr8(c, x + 4, y + 4, CWi - 8, CHi - 8, 6); c.fill(); c.lineWidth = 1.6; c.strokeStyle = P8OUT; c.stroke(); c.fillStyle = AL8('#ffffff', 0.09); c.fillRect(x + 7, y + 7, CWi - 14, 4); continue; }
    c.fillStyle = AL8('#1a1530', 0.2); c.fillRect(x, y, CWi, 1.6); c.fillRect(x, y, 1.6, CHi);
    if (q.f > 0) {
      const a = Math.min(0.5, q.f * 0.5);
      c.fillStyle = `rgba(255,120,40,${a.toFixed(3)})`; c.fillRect(x + 2, y + 2, CWi - 4, CHi - 4);
    }
  }
  /* llamas encima */
  for (let i = 0; i < fg.length; i++) {
    const q = fg[i]; if (q.f <= 0) continue;
    const cx = cellCx(q), cy = cellCy(q), s = lerp(0.42, 1.05, q.f);
    const n = q.f > 0.6 ? 3 : q.f > 0.3 ? 2 : 1;
    for (let j = 0; j < n; j++) {
      const ox = (j - (n - 1) / 2) * CWi * 0.26, fr = (((anim * 9 + i + j * 2) | 0) % 3);
      blit8(c, flameSpr(fr), cx + ox, cy + CHi * 0.3, s * 0.72);
    }
    if (q.f > 0.5) ART.glow(c, cx, cy, CWi * 0.6, '#ff8a3a', 0.2 * q.f);
  }
  /* fuente y ambulancia */
  blit8(c, fountSpr(), FOUNT.x, FOUNT.y, PORT ? 0.9 : 0.86);
  blit8(c, ambSpr(), AMB.x, AMB.y, PORT ? 0.72 : 0.8);
  label('Fuente', FOUNT.x, FOUNT.y + 16, 12, '#8fd0ff');
  label('Ambulancia', AMB.x, AMB.y + 18, 12, '#ffb0b0');
}
function drawAldea() {
  for (const h of houses) {
    const st = h.hp <= 0 ? 2 : h.hp < h.hpMax * 0.5 ? 1 : 0;
    blit8(c, houseSpr(st), h.x, h.y, 1, h.hp <= 0 ? 0.55 : 1);
    if (h.hp > 0 && h.hp < h.hpMax) bar(h.x - 26, h.y + 6, 52, 6, h.hp / h.hpMax, h.hp > h.hpMax * 0.4 ? '#8ed36b' : '#ff6b6b');
  }
  for (const b of barrs) { blit8(c, barrSpr(), b.x, b.y, 0.9, 0.5 + 0.5 * (b.hp / b.hpMax)); }
}
function drawDrops() {
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    blit8(c, dropSpr(d.k), d.x, d.y + Math.sin(anim * 4 + i) * 2, 0.9);
  }
}
/* enemigos y jugadores ordenados por filas de la rejilla: el orden en Y sale gratis */
function drawActors() {
  const drawn = [];
  for (const p of ps) drawn.push(p);
  if (FUEGO) for (const v of vecs) if (!v.gone) drawn.push(v);
  let di = 0;
  drawn.sort((a, b) => a.y - b.y);
  for (let row = 0; row < GR; row++) {
    const yTop = AY - 80 + row * CS;
    while (di < drawn.length && drawn[di].y < yTop) { drawOne(drawn[di]); di++; }
    if (!FUEGO) for (let col = 0; col < GC; col++) {
      const cell = GCELL[row * GC + col];
      for (let n = 0; n < cell.length; n++) { const j = cell[n]; if (j < es.length) drawFoe(es[j]); }
    }
  }
  while (di < drawn.length) { drawOne(drawn[di]); di++; }
}
function drawOne(a) { if (a.hpMax !== undefined && a.p !== undefined) drawPlayer(a); else drawVec(a); }
function drawFoe(e) {
  if (e.x < AX - 40 || e.x > AX2 + 40 || e.y < AY - 46 || e.y > AY2 + 40) return;
  blit8(c, foeSpr(e.ty, e.fr), e.x, e.y, 1);
  if (e.fl > 0) { c.globalAlpha = 0.65; c.fillStyle = '#fff'; c.beginPath(); c.arc(e.x, e.y, e.r * 0.9, 0, TAU); c.fill(); c.globalAlpha = 1; }
  if (e.ty === 'jefe') bar(e.x - 34, e.y - e.r * 1.9, 68, 7, e.hp / e.hpMax, '#ff5a8a');
}
function drawPlayer(p) {
  if (p.down) {
    c.save(); c.translate(p.x, p.y); c.rotate(1.2);
    blit8(c, heroSpr(p.col, 0, FUEGO ? 'fire' : 'h'), 0, 0, 0.86, 0.75);
    c.restore();
    bar(p.x - 24, p.y + 14, 48, 6, p.rev / 1.8, '#8ed36b');
    label(nPl() > 1 ? 'Reanimar' : 'Caído', p.x, p.y + 28, 11, '#ffd166');
    return;
  }
  const fr = ((p.walk | 0) % 4);
  const flash = p.inv > 0 && (((p.inv * 12) | 0) & 1);
  blit8(c, heroSpr(p.col, fr, FUEGO ? 'fire' : 'h'), p.x, p.y, 1, flash ? 0.55 : 1);
  /* chorro de agua */
  if (FUEGO && p.act > 0) {
    c.strokeStyle = 'rgba(120,200,255,.75)'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(p.x + p.fx * 10, p.y - 14 + p.fy * 6); c.lineTo(p.x + p.fx * 50, p.y - 14 + p.fy * 42); c.stroke();
  }
  if (nPl() > 1) {
    c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y - 56, 4.2, 0, TAU); c.fill();
    c.lineWidth = 1.4; c.strokeStyle = P8OUT; c.stroke();
  }
}
function drawVec(v) {
  blit8(c, vecSpr(v.i, ((anim * 3 + v.i) | 0) & 1), v.x, v.y, 1);
  if (v.held >= 0) return;
  const s = Math.sin(anim * 6 + v.i) * 3;
  const bx = clamp(v.x, AX + 24, AX2 - 24);
  plate(bx - 22, v.y - 66 + s, 44, 17, 'rgba(255,240,200,.92)');
  label('¡AUX!', bx, v.y - 57 + s, 11, '#a03030', 'center', 40);
  if (v.hp < 100) bar(v.x - 16, v.y + 8, 32, 5, v.hp / 100, '#ff9060');
}
function drawBullets() {
  c.lineCap = 'round';
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i];
    c.strokeStyle = '#ffe9a8'; c.lineWidth = 4.4;
    c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x - Math.cos(b.a) * 11, b.y - Math.sin(b.a) * 11); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x - Math.cos(b.a) * 7, b.y - Math.sin(b.a) * 7); c.stroke();
  }
}

/* ---------------------------------------------------------------- HUD */
function drawHUD() {
  c.fillStyle = 'rgba(14,9,30,.9)'; c.fillRect(0, 0, W, TOP);
  c.fillStyle = P8OUT; c.fillRect(0, TOP - 3, W, 3);
  /* izquierda: estado de cada jugador (2 columnas para que quepan 4) */
  const LW = Math.min(150, W / 2 - 74), cw = ps.length > 2 ? LW / 2 - 3 : LW, rows = ps.length > 2 ? 2 : ps.length;
  ps.forEach((p, i) => {
    const col = ps.length > 2 ? (i % 2) : 0, row = ps.length > 2 ? (i / 2) | 0 : i;
    const x = 8 + col * (cw + 6), y = 8 + row * ((TOP - 16) / Math.max(1, rows) + 1);
    c.fillStyle = p.col; c.beginPath(); c.arc(x + 5, y + 7, 5, 0, TAU); c.fill(); c.lineWidth = 1.4; c.strokeStyle = P8OUT; c.stroke();
    bar(x + 13, y + 3, Math.max(24, cw - 15), 8, p.down ? 0 : p.hp / p.hpMax, p.hp > p.hpMax * 0.35 ? '#8ed36b' : '#ff6b6b');
    if (FUEGO) bar(x + 13, y + 13, Math.max(24, cw - 15), 5, p.water / 100, '#4fc3f7');
    else if (ps.length <= 2) label(p.down ? 'Caído' : (nPl() > 1 ? p.name : 'Tú'), x + 13, y + 18, 11, '#b9b2de', 'left', cw - 14);
  });
  /* derecha: marcador del modo */
  const rx = W - 8;
  if (HORDA) {
    label(fmtT(Math.max(0, SURV - t)), rx, 14, 18, t > SURV - 30 ? '#ffd166' : '#efeaff', 'right', 70);
    label('Nv ' + lvl + ' · ' + kills, rx, 34, 13, '#b9b2de', 'right', 110);
    bar(rx - 110, 44, 110, 7, xp / xpNeed, '#7be0ff');
  } else if (ALDEA) {
    label('Oleada ' + waveN + '/' + WAVES, rx, 14, 16, '#efeaff', 'right', 130);
    const alive = houses.filter((h) => h.hp > 0).length;
    label(alive + ' casas · ' + mats + ' madera', rx, 34, 12, '#b9b2de', 'right', 150);
    if (rest > 0) bar(rx - 110, 44, 110, 7, rest / 16, '#8ed36b');
    else bar(rx - 110, 44, 110, 7, 1 - waveLeft / Math.max(1, waveSize()), '#ff9060');
  } else {
    label('Vecinos ' + rescued + '/' + vecN, rx, 14, 16, '#efeaff', 'right', 140);
    label('Estructura ' + Math.max(0, integ), rx, 34, 12, integ <= 3 ? '#ff6b6b' : '#b9b2de', 'right', 150);
    bar(rx - 110, 44, 110, 7, 1 - burning() / Math.max(1, fg.length), '#4fc3f7');
  }
  if (alertT > 0) {
    c.globalAlpha = Math.min(1, alertT);
    const w = Math.min(W - 40, 260);
    plate(W / 2 - w / 2, TOP + 6, w, 26);
    label(alertC, W / 2, TOP + 19, 14, '#ffd166', 'center', w - 16);
    c.globalAlpha = 1;
  }
  if (alertT <= 0) {
    const hint = (ALDEA && rest > 0) ? ['Descanso · A repara · B barricada', '#8ed36b']
      : (FUEGO && t < 9) ? ['A manguera · recarga en la fuente', '#8fd0ff'] : null;
    if (hint) {
      c.font = '600 13px system-ui, sans-serif';
      const w = Math.min(W - 24, c.measureText(hint[0]).width + 24);
      plate(W / 2 - w / 2, TOP + 6, w, 24);
      label(hint[0], W / 2, TOP + 18, 13, hint[1], 'center', w - 14);
    }
  }
}
function drawChoose() {
  c.fillStyle = 'rgba(10,6,24,.78)'; c.fillRect(0, 0, W, H);
  label('¡Nivel ' + lvl + '! Elige una mejora', W / 2, AY + 30, PORT ? 19 : 21, '#ffd166', 'center', W - 40);
  const R = chooseRects(), vert = R.vert, cw = R.cw, ch = R.ch, gap = R.gap, x0 = R.x0, y0 = R.y0, totH = R.totH;
  opts.forEach((o, i) => {
    const x = vert ? x0 : x0 + i * (cw + gap), y = vert ? y0 + i * (ch + gap) : y0;
    const on = i === selI;
    c.beginPath(); rr8(c, x, y, cw, ch, 14);
    c.fillStyle = on ? 'rgba(110,98,245,.95)' : 'rgba(30,22,58,.95)'; c.fill();
    c.lineWidth = on ? 3 : 1.8; c.strokeStyle = on ? '#ffd166' : P8OUT; c.stroke();
    label(o.n, x + cw / 2, y + (vert ? 26 : 50), vert ? 17 : 18, '#fff', 'center', cw - 20);
    label(o.d, x + cw / 2, y + (vert ? 50 : 82), 13, on ? '#f0ecff' : '#b9b2de', 'center', cw - 20);
  });
  label(k.party ? 'Mueve con el mando y confirma con A' : 'Elige con ← → y confirma con A, o toca una tarjeta', W / 2, Math.min(H - 16, y0 + totH + 24), 12, '#b9b2de', 'center', W - 32);
}

/* ================================================================ arranque */
gridInit();
reset();
const HELP = CFG.help || '';
const INTRO = HORDA
  ? 'Muévete y esquiva: disparas solo, siempre al bicho más cercano. Recoge las gemas azules, sube de nivel y elige una mejora entre tres. Cada minuto y medio llega un jefe. Aguanta cinco minutos.'
  : ALDEA
    ? 'Las casas del centro son lo que hay que salvar. Entre oleada y oleada tienes un descanso: pulsa A junto a una casa dañada para repararla y B para plantar una barricada con la madera que sueltan los bichos.'
    : 'Aquí no se dispara a nadie: se apaga. Pulsa A para la manguera, recarga el agua en la fuente y saca a los vecinos hasta la ambulancia. Si una estancia arde demasiado tiempo se hunde y el edificio pierde estructura.';
k.show(CFG.title || 'Horda', INTRO + '<br>Solo o hasta cuatro en la tele: sois un equipo.<br>Toca para empezar');
k.run(update, draw);
window.__h = {
  get t() { return t; }, get n() { return es.length; }, get score() { return score; }, get kills() { return kills; },
  get lvl() { return lvl; }, get ps() { return ps; }, get over() { return over; }, get choose() { return choose; },
  get wave() { return waveN; }, get integ() { return integ; }, get rescued() { return rescued; },
  get burning() { return FUEGO ? burning() : 0; },
  swarm(n) { for (let i = 0; i < n; i++) { const [x, y] = edgePos(); spawnFoe('baba', x, y); } return es.length; },
};
