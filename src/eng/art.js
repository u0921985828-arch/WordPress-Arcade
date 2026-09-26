/* ARTE PROPIO del portal — sprites vectoriales dibujados por código (estilo cartoon plano con contorno).
 * Todo original: sin recursos de terceros. Escala base: 1 casilla = 32 px.
 * v2: sombreado con luz arriba-izquierda, contornos de grosor variable, héroe con más animación y
 * expresiones, enemigos con animación secundaria, fondos con varias capas de paralaje y casillas con textura.
 * Todo lo estático (capas de fondo, casillas, decorado, monedas, nubes, sol) se cachea en lienzos offscreen. */
const ART = (() => {
  const OUT = '#1a1530', TAU = 6.2832;
  const THEMES = {
    meadow:  { sky: ['#7fd4ff', '#d8f3ff'], far: '#9ec9e8', mid: '#6cc27a', near: '#4fa860', ground: '#8a5a3b', groundD: '#6b4329', top: '#5ccf5a', topD: '#3aa845', plank: '#c98a4b', enemy: 'slime', hero: '#ff5f7a', deco: 'tree', clouds: true, id: 'meadow', foe: '#8be04a' },
    snow:    { sky: ['#a9d8ff', '#eef8ff'], far: '#c6dcf2', mid: '#a6c4e4', near: '#86a9d0', ground: '#5d7ea8', groundD: '#46658c', top: '#ffffff', topD: '#d6e7f7', plank: '#9fb7d4', enemy: 'slime', hero: '#ff7a3d', deco: 'pine', clouds: true, id: 'snow', foe: '#7fd8ff' },
    night:   { sky: ['#140c33', '#3b2266'], far: '#2a1c52', mid: '#221645', near: '#1a1036', ground: '#3b2d5c', groundD: '#2a1f45', top: '#8f6cff', topD: '#6a4fd6', plank: '#6a4fd6', enemy: 'ghost', hero: '#5ce1e6', deco: 'pine', stars: true, moon: true, id: 'night', foe: '#b98cff' },
    castle:  { sky: ['#2b3a67', '#8a7fb0'], far: '#4b4f7a', mid: '#3c3f66', near: '#2e3052', ground: '#6e6f86', groundD: '#55566b', top: '#9496ad', topD: '#7a7c93', plank: '#8b5a3c', enemy: 'knight', hero: '#f2d15c', deco: 'tower', stars: true, brick: true, id: 'castle', foe: '#ff5f5f' },
    factory: { sky: ['#1d2b36', '#44606e'], far: '#2c3d49', mid: '#243440', near: '#1b2831', ground: '#4d5b66', groundD: '#3a4650', top: '#f2b705', topD: '#c99400', plank: '#7b8791', enemy: 'robot', hero: '#5ce1e6', deco: 'pipe', metal: true, id: 'factory', foe: '#5ce1e6' },
    dusk:    { sky: ['#ff8a5c', '#ffd29a'], far: '#d9738a', mid: '#8a4f7d', near: '#5a345e', ground: '#40284a', groundD: '#2e1d36', top: '#b98cff', topD: '#8f63d6', plank: '#6e4a7a', enemy: 'ghost', hero: '#1a1530', deco: 'pine', clouds: true, id: 'dusk', foe: '#ff9ad5' },
    jungle:  { sky: ['#56c7a0', '#d6f5c9'], far: '#7fcf9c', mid: '#3f9e6a', near: '#2c7d52', ground: '#6b4a2f', groundD: '#523721', top: '#3cc96a', topD: '#2a9e50', plank: '#a0703f', enemy: 'slime', hero: '#ffb13d', deco: 'palm', clouds: true, id: 'jungle', foe: '#ff8a3d' },
    sky:     { sky: ['#5fb4ff', '#c6f0ff'], far: '#ffffff', mid: '#dff4ff', near: '#b8e4ff', ground: '#7a5a8c', groundD: '#5e4470', top: '#7cf7a0', topD: '#4fd07c', plank: '#c98a4b', enemy: 'bird', hero: '#ff5f7a', deco: 'tree', clouds: true, floating: true, id: 'sky', foe: '#ff9a3d', leaf: '#4fc46a' },
  };
  const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function rrp(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fillOut(c, fill, lw) { c.fillStyle = fill; c.fill(); c.lineWidth = lw || 2.5; c.strokeStyle = OUT; c.stroke(); }

  /* ------------------------------------------------ Color (memoizado: sin coste por fotograma) */
  const CC = {};
  const toRGB = (h) => { h = h.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  function mix(a, b, t) {
    const key = a + b + t; if (CC[key]) return CC[key];
    if (typeof a !== 'string' || a[0] !== '#' || b[0] !== '#') return a;
    const A = toRGB(a), B = toRGB(b);
    return (CC[key] = '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''));
  }
  const lite = (c, t) => mix(c, '#ffffff', t), dark = (c, t) => mix(c, OUT, t);
  function alpha(col, a) { const key = col + '@' + a; if (CC[key]) return CC[key]; if (typeof col !== 'string' || col[0] !== '#') return col; const [r, g, b] = toRGB(col); return (CC[key] = `rgba(${r},${g},${b},${a})`); }
  const mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h)); return cv; };
  function resOf(c, lo, hi) { let a = 1; try { const m = c.getTransform(); a = Math.hypot(m.a, m.b); } catch (e) { /* sin getTransform */ } return Math.min(hi, Math.max(lo, Math.ceil(a * 2) / 2)); }
  const thKey = (th) => th.id || [th.ground, th.top, th.near, th.deco, th.plank, th.leaf].join('|');
  let curTh = null; // último tema pintado (colores de enemigos por defecto)

  /* Sombra de contacto elíptica */
  function shadow(c, x, y, w, a) { c.fillStyle = `rgba(20,12,40,${a == null ? 0.22 : a})`; c.beginPath(); c.ellipse(x, y, w, Math.max(1.5, w * 0.26), 0, 0, TAU); c.fill(); }
  /* Estrella de brillo de 4 puntas */
  function glint(c, x, y, s, col) { c.fillStyle = col || '#fff'; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill(); }

  /* ------------------------------------------------ Fondos con paralaje (capas cacheadas) */
  const PW = 1024;
  // Perfil periódico (período PW) calculado en [-PW, 2PW] para poder envolver sin costuras
  function ridge(base, amp, kind, seed) {
    const P = [], f = [rnd(seed) * 6.28, rnd(seed + 1) * 6.28, rnd(seed + 2) * 6.28];
    for (let x = -PW; x <= PW * 2; x += 4) {
      const u = x / PW * Math.PI; let v;
      if (kind === 'peaks') v = 0.62 * (1 - Math.abs(Math.sin(u * 3 + f[0]))) + 0.3 * (1 - Math.abs(Math.sin(u * 7 + f[1]))) + 0.05 * Math.sin(u * 22 + f[2]);
      else if (kind === 'round') v = 0.55 * Math.pow(Math.abs(Math.sin(u * 4 + f[0])), 0.9) + 0.3 * (0.5 + 0.5 * Math.sin(u * 6 + f[1])) + 0.08 * Math.sin(u * 26 + f[2]);
      else v = 0.5 + 0.28 * Math.sin(u * 4 + f[0]) + 0.16 * Math.sin(u * 10 + f[1]) + 0.05 * Math.sin(u * 26 + f[2]);
      P.push([x, base - v * amp]);
    }
    return P;
  }
  const yAt = (P, x) => { const i = Math.max(0, Math.min(P.length - 1, Math.round((x + PW) / 4))); return P[i][1]; };
  function ridgePath(g, P, bot) { g.beginPath(); g.moveTo(P[0][0], bot); for (const p of P) g.lineTo(p[0], p[1]); g.lineTo(P[P.length - 1][0], bot); g.closePath(); }
  function hazeRect(g, y0, y1, haze, a, bot) { const hz = g.createLinearGradient(0, y0, 0, y1); hz.addColorStop(0, alpha(haze, 0)); hz.addColorStop(1, alpha(haze, a)); g.fillStyle = hz; g.fillRect(-PW, y0, PW * 3, y1 - y0); g.fillStyle = alpha(haze, a); g.fillRect(-PW, y1, PW * 3, bot - y1); }

  function mountains(g, base, amp, col, o) {
    const P = ridge(base, amp, o.round ? 'round' : 'peaks', o.seed), bot = o.bot;
    ridgePath(g, P, bot); const gr = g.createLinearGradient(0, base - amp, 0, base + 20); gr.addColorStop(0, lite(col, 0.1)); gr.addColorStop(1, col); g.fillStyle = gr; g.fill();
    g.save(); ridgePath(g, P, bot); g.clip();
    if (o.snow) { // casquetes de nieve con borde dentado
      const sl = base - amp * o.snow; g.beginPath(); g.moveTo(-PW, sl - amp * 2);
      for (let x = -PW; x <= PW * 2; x += 6) g.lineTo(x, sl + Math.sin(x * 0.09) * 4 + ((x / 6) % 2 ? 6 : 0) + Math.sin(x * 0.021) * 8);
      g.lineTo(PW * 2, sl - amp * 2); g.closePath(); g.fillStyle = mix('#ffffff', col, 0.1); g.fill();
    }
    // caras en sombra (la luz viene de la izquierda): de cada cumbre al valle siguiente
    const ex = []; for (let i = 3; i < P.length - 3; i++) { const y = P[i][1]; if (y < P[i - 3][1] && y <= P[i + 3][1] && (!ex.length || ex[ex.length - 1].k !== 'p')) ex.push({ k: 'p', i }); else if (y > P[i - 3][1] && y >= P[i + 3][1] && ex.length && ex[ex.length - 1].k === 'p') ex.push({ k: 'v', i }); }
    g.fillStyle = alpha(OUT, o.shade || 0.2);
    for (let e = 0; e < ex.length - 1; e++) if (ex[e].k === 'p' && ex[e + 1].k === 'v') {
      const a = ex[e].i, b = ex[e + 1].i, pa = P[a], pb = P[b]; g.beginPath(); g.moveTo(pa[0], pa[1]);
      for (let i = a; i <= b; i++) g.lineTo(P[i][0], P[i][1]);
      g.quadraticCurveTo(pa[0] + (pb[0] - pa[0]) * 0.45, pb[1] + 6, pa[0] + (pb[0] - pa[0]) * 0.22, pa[1] + (pb[1] - pa[1]) * 0.75); g.closePath(); g.fill();
    }
    // brillo de arista
    g.strokeStyle = alpha('#ffffff', 0.18); g.lineWidth = 2; g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + 1) : g.moveTo(p[0], p[1] + 1))); g.stroke();
    hazeRect(g, base - amp * 0.45, base + 30, o.haze, 0.6, bot);
    g.restore();
    return mix(col, o.haze, 0.6);
  }

  function roundTree(g, x, y, s, col, ol, lw) { // copa de 3 bolas con volumen
    const B = [[0, -18, 11], [-8, -11, 8], [8, -11, 8]];
    if (ol) { g.fillStyle = ol; g.fillRect(x - 1.8 * s - lw / 2, y - 9 * s, 3.6 * s + lw, 9 * s); g.beginPath(); B.forEach(([bx, by, r]) => { g.moveTo(x + bx * s + r * s + lw, y + by * s); g.arc(x + bx * s, y + by * s, r * s + lw, 0, TAU); }); g.fill(); }
    g.fillStyle = dark(col, 0.35); g.fillRect(x - 1.8 * s, y - 9 * s, 3.6 * s, 9 * s);
    g.fillStyle = col; g.beginPath(); B.forEach(([bx, by, r]) => { g.moveTo(x + bx * s + r * s, y + by * s); g.arc(x + bx * s, y + by * s, r * s, 0, TAU); }); g.fill();
    g.fillStyle = lite(col, 0.18); g.beginPath(); g.arc(x - 3 * s, y - 21 * s, 5 * s, 0, TAU); g.arc(x - 10 * s, y - 13 * s, 3.5 * s, 0, TAU); g.fill();
  }
  function pineTree(g, x, y, s, col, ol, lw, snow) {
    const tri = (e) => { g.beginPath(); for (let i = 0; i < 3; i++) { const ty = y - 30 * s + i * 8 * s, hw = (6 + i * 3) * s; g.moveTo(x, ty - 6 * s - e); g.lineTo(x + hw + e, ty + 8 * s + e * 0.6); g.lineTo(x - hw - e, ty + 8 * s + e * 0.6); g.closePath(); } };
    g.fillStyle = dark(col, 0.35); g.fillRect(x - 1.5 * s, y - 6 * s, 3 * s, 6 * s);
    if (ol) { tri(lw); g.fillStyle = ol; g.fill(); }
    tri(0); g.fillStyle = col; g.fill();
    g.save(); tri(0); g.clip(); g.fillStyle = alpha(OUT, 0.18); g.fillRect(x, y - 40 * s, 20 * s, 40 * s);
    if (snow) { g.fillStyle = alpha('#ffffff', 0.85); for (let i = 0; i < 3; i++) { const ty = y - 30 * s + i * 8 * s; g.beginPath(); g.moveTo(x, ty - 6 * s); g.lineTo(x + 5 * s, ty); g.lineTo(x - 5 * s, ty); g.fill(); } }
    g.restore();
  }
  function palmTree(g, x, y, s, col, lcol) {
    g.strokeStyle = col; g.lineWidth = 3 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4 * s, y - 16 * s, x + 2 * s, y - 30 * s); g.stroke();
    g.fillStyle = lcol; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.7; g.beginPath(); g.moveTo(x + 2 * s, y - 30 * s); g.quadraticCurveTo(x + 2 * s + Math.cos(a) * 10 * s, y - 34 * s + Math.sin(a) * 10 * s, x + 2 * s + Math.cos(a) * 17 * s, y - 28 * s + Math.sin(a) * 15 * s); g.quadraticCurveTo(x + 2 * s + Math.cos(a) * 8 * s, y - 30 * s + Math.sin(a) * 6 * s, x + 2 * s, y - 30 * s); g.fill(); }
  }

  function hills(g, base, amp, col, o) {
    const P = ridge(base, amp, 'hills', o.seed), bot = o.bot;
    // árboles detrás de la cresta (se hunden en ella)
    const n = o.trees || 0, tc = o.tcol || dark(col, 0.12), ol = o.ol ? dark(col, 0.45) : null;
    const plant = (x, s) => { const y = yAt(P, x) + 6; for (const dx of [-PW, 0, PW]) { const X = x + dx;
      if (o.tree === 'pine') pineTree(g, X, y, s, tc, ol, 1.6, o.snowy); else if (o.tree === 'palm') { palmTree(g, X, y, s, dark(col, 0.25), tc); } else roundTree(g, X, y, s, tc, ol, 1.6); } };
    for (let i = 0; i < n; i++) { const x = (i + rnd(o.seed * 7 + i) * 0.8) * PW / n; plant(x, o.ts * (0.75 + rnd(i + o.seed) * 0.5)); if (rnd(i * 3 + o.seed) < 0.5) plant(x + 14 * o.ts, o.ts * 0.7); }
    ridgePath(g, P, bot); const gr = g.createLinearGradient(0, base - amp, 0, base + 90); gr.addColorStop(0, lite(col, 0.12)); gr.addColorStop(0.55, col); gr.addColorStop(1, dark(col, 0.14)); g.fillStyle = gr; g.fill();
    g.save(); ridgePath(g, P, bot); g.clip();
    g.strokeStyle = alpha(lite(col, 0.45), 0.7); g.lineWidth = 3; g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + 1.5) : g.moveTo(p[0], p[1] + 1.5))); g.stroke();
    // matas y manchas de hierba (textura sutil)
    for (let i = 0; i < 26; i++) { const x = rnd(i * 5.3 + o.seed) * PW, y = yAt(P, x) + 14 + rnd(i * 2.1) * 50, r = 6 + rnd(i) * 10; for (const dx of [-PW, 0, PW]) { g.fillStyle = alpha(dark(col, 0.2), 0.2); g.beginPath(); g.ellipse(x + dx, y, r * 1.3, r * 0.35, 0, 0, TAU); g.fill(); g.fillStyle = alpha(lite(col, 0.2), 0.22); g.beginPath(); g.ellipse(x + dx - 2, y - 1.5, r * 0.9, r * 0.2, 0, 0, TAU); g.fill(); } }
    if (o.haze) hazeRect(g, base - amp * 0.2, base + 70, o.haze, o.hz || 0.3, bot);
    g.restore();
    return o.haze ? mix(dark(col, 0.14), o.haze, o.hz || 0.3) : dark(col, 0.14);
  }

  function castles(g, base, col, o) {
    const bot = o.bot, roof = mix(col, '#6a2a5a', 0.45), win = '#ffd36b';
    const body = (x, y, w) => { g.fillStyle = col; g.fillRect(x, y, w, bot - y); g.fillStyle = alpha(OUT, 0.22); g.fillRect(x + w * 0.62, y, w * 0.38, bot - y); };
    const merl = (x, y, w) => { for (let i = 0; i + 7 <= w; i += 12) { g.fillStyle = col; g.fillRect(x + i, y - 7, 7, 8); } };
    const window_ = (x, y, lit) => { g.fillStyle = lit ? win : dark(col, 0.5); g.beginPath(); g.moveTo(x - 3, y + 8); g.lineTo(x - 3, y); g.arc(x, y, 3, Math.PI, 0); g.lineTo(x + 3, y + 8); g.fill();
      if (lit) { const gl = g.createRadialGradient(x, y + 3, 1, x, y + 3, 14); gl.addColorStop(0, alpha(win, 0.35)); gl.addColorStop(1, alpha(win, 0)); g.fillStyle = gl; g.fillRect(x - 14, y - 11, 28, 28); } };
    const tower = (x, y, w, cone) => { body(x, y, w);
      if (cone) { g.fillStyle = roof; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + w / 2, y - w * 1.1); g.lineTo(x + w + 4, y); g.fill(); g.fillStyle = alpha(OUT, 0.25); g.beginPath(); g.moveTo(x + w / 2, y - w * 1.1); g.lineTo(x + w + 4, y); g.lineTo(x + w / 2 + 2, y); g.fill();
        g.strokeStyle = dark(col, 0.4); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + w / 2, y - w * 1.1); g.lineTo(x + w / 2, y - w * 1.1 - 12); g.stroke(); g.fillStyle = '#ff6a6a'; g.beginPath(); g.moveTo(x + w / 2, y - w * 1.1 - 12); g.lineTo(x + w / 2 + 9, y - w * 1.1 - 9); g.lineTo(x + w / 2, y - w * 1.1 - 6); g.fill(); }
      else merl(x, y, w);
      for (let j = 0; j < 3; j++) window_(x + w / 2, y + 14 + j * 26, rnd(x + j) < 0.6); };
    for (const cx of [210, 720]) for (const dx of [-PW, 0, PW]) { const X = cx + dx, s = cx > 500 ? 0.85 : 1;
      body(X - 90 * s, base - 50 * s, 180 * s); merl(X - 90 * s, base - 50 * s, 180 * s);
      tower(X - 100 * s, base - 100 * s, 28 * s, true); tower(X + 72 * s, base - 110 * s, 28 * s, true); tower(X - 26 * s, base - 150 * s, 52 * s, rnd(cx) < 0.5); tower(X - 58 * s, base - 88 * s, 22 * s, false);
      g.fillStyle = dark(col, 0.5); g.beginPath(); g.moveTo(X - 12 * s, base + 4); g.lineTo(X - 12 * s, base - 16 * s); g.arc(X, base - 16 * s, 12 * s, Math.PI, 0); g.lineTo(X + 12 * s, base + 4); g.fill(); }
    hazeRect(g, base - 60, base + 40, o.haze, 0.35, bot);
    return mix(col, o.haze, 0.35);
  }

  function skyline(g, base, col, o, chim) {
    const bot = o.bot; let x = 0, i = 0;
    while (x < PW) { const w = 34 + rnd(i * 1.7 + o.seed) * 50, h = 40 + rnd(i * 2.3 + o.seed) * (o.tall || 110);
      for (const dx of [-PW, 0, PW]) { const X = x + dx;
        g.fillStyle = col; g.fillRect(X, base - h, w + 1, bot - base + h); g.fillStyle = alpha(OUT, 0.2); g.fillRect(X + w * 0.7, base - h, w * 0.3 + 1, bot - base + h);
        if (o.win) { for (let wy = base - h + 8; wy < base - 4; wy += 11) for (let wx = X + 5; wx < X + w - 6; wx += 9) if (rnd(wx * 0.37 + wy * 1.3) < 0.28) { g.fillStyle = rnd(wx + wy) < 0.5 ? alpha('#ffd36b', 0.55) : alpha('#9fe8ff', 0.35); g.fillRect(wx, wy, 4, 5); } }
        if (o.saw) { g.fillStyle = col; for (let sx = X; sx < X + w - 4; sx += 16) { g.beginPath(); g.moveTo(sx, base - h); g.lineTo(sx + 16, base - h - 10); g.lineTo(sx + 16, base - h); g.fill(); } }
        if (chim && rnd(i * 4.1) < 0.55) { const cx = X + w * 0.3, ch = 50 + rnd(i) * 50; g.fillStyle = dark(col, 0.1); g.fillRect(cx, base - h - ch, 12, ch); g.fillStyle = alpha('#ff6b5a', 0.6); g.fillRect(cx, base - h - ch + 8, 12, 4); g.fillRect(cx, base - h - ch + 20, 12, 4); g.fillStyle = lite(col, 0.15); g.fillRect(cx - 2, base - h - ch - 3, 16, 5); if (dx === 0) chim.push([cx + 6, base - h - ch - 3]); }
      }
      x += w + (o.gap ? rnd(i * 9) * 26 : 0); i++;
    }
    if (o.pipes) { g.strokeStyle = dark(col, 0.25); g.lineWidth = 5; for (let j = 0; j < 2; j++) { const py = base - 14 - j * 20; g.beginPath(); g.moveTo(-PW, py); g.lineTo(PW * 2, py); g.stroke(); } g.strokeStyle = alpha(lite(col, 0.3), 0.5); g.lineWidth = 1.2; for (let j = 0; j < 2; j++) { const py = base - 15.5 - j * 20; g.beginPath(); g.moveTo(-PW, py); g.lineTo(PW * 2, py); g.stroke(); } }
    hazeRect(g, base - 80, base + 40, o.haze, o.hz || 0.45, bot);
    return mix(col, o.haze, o.hz || 0.45);
  }

  function cloudBank(g, base, amp, col, o) { // mar de nubes: bultos con sombra abajo-derecha
    const bot = o.bot, shade = mix(col, o.haze, 0.35), B = [], R = o.r || 16;
    for (let x = -PW; x < PW * 2; x += R * 1.3) { const i = ((Math.round(x) % PW) + PW) % PW; B.push([x, base - rnd(i * 0.13 + o.seed) * amp, R * (0.8 + rnd(i * 0.7 + o.seed) * 0.9)]); }
    const lumps = (dx, dy, k) => { g.beginPath(); B.forEach(([x, y, r]) => { g.moveTo(x + dx + r * k, y + dy); g.arc(x + dx, y + dy, r * k, 0, TAU); }); g.rect(-PW, base + dy, PW * 3, bot - base); };
    g.fillStyle = shade; lumps(2, 3, 1); g.fill(); g.fillStyle = col; lumps(-1, -1, 0.94); g.fill();
    g.fillStyle = alpha('#ffffff', 0.55); B.forEach(([x, y, r], i) => { if (i % 2) { g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.45, r * 0.3, r * 0.15, -0.4, 0, TAU); g.fill(); } });
    return col;
  }
  function islands(g, base, th, o) {
    const rock = mix(th.ground, th.sky[1], 0.35), grass = mix(th.top, th.sky[1], 0.25);
    [[150, base - 70, 1], [520, base - 130, 0.7], [820, base - 40, 0.85]].forEach(([x0, y, s], n) => { for (const dx of [-PW, 0, PW]) { const x = x0 + dx;
      g.fillStyle = rock; g.beginPath(); g.moveTo(x - 60 * s, y); for (let i = 0; i <= 8; i++) g.lineTo(x - 60 * s + i * 15 * s, y + (i % 2 ? 26 : 38) * s * Math.sin(i / 8 * Math.PI) + 6 * s); g.lineTo(x + 60 * s, y); g.fill();
      g.fillStyle = alpha(OUT, 0.2); g.beginPath(); g.moveTo(x, y + 4); for (let i = 4; i <= 8; i++) g.lineTo(x - 60 * s + i * 15 * s, y + (i % 2 ? 26 : 38) * s * Math.sin(i / 8 * Math.PI) + 6 * s); g.lineTo(x + 60 * s, y); g.fill();
      if (n === 1) { const wf = g.createLinearGradient(0, y, 0, y + 140); wf.addColorStop(0, alpha('#ffffff', 0.8)); wf.addColorStop(1, alpha('#ffffff', 0)); g.fillStyle = wf; g.fillRect(x + 14 * s, y + 4, 6 * s, 140); }
      rr(g, x - 64 * s, y - 6 * s, 128 * s, 13 * s, 6 * s); g.fillStyle = grass; g.fill(); g.fillStyle = alpha('#ffffff', 0.3); g.fillRect(x - 58 * s, y - 5 * s, 110 * s, 3 * s);
      roundTree(g, x - 30 * s, y - 2 * s, s * 0.9, mix(th.leaf || th.top, th.sky[1], 0.3), null, 0); roundTree(g, x + 22 * s, y - 2 * s, s * 0.7, mix(th.leaf || th.top, th.sky[1], 0.35), null, 0); } });
    return alpha('#000000', 0);
  }

  /* Nube con volumen: halo suave (dos pasadas translúcidas), vientre en sombra, cuerpo,
   * luz de arriba-izquierda y reflejos especulares. Lienzo 132×76 (se dibuja a 1,74:1). */
  const CLW = 132, CLH = 76;
  function cloudSprite(tone, v, res) {
    const key = 'cl' + tone + v + res; if (cache[key]) return cache[key];
    const cv = mk(CLW * res, CLH * res), g = cv.getContext('2d'); g.scale(res, res);
    const B = [
      [[34, 44, 17], [58, 31, 23], [84, 38, 19], [104, 48, 12]],
      [[28, 47, 14], [50, 36, 19], [75, 31, 22], [99, 45, 14]],
      [[24, 50, 11], [42, 40, 17], [66, 33, 21], [90, 43, 15], [110, 51, 10]],
      [[38, 42, 17], [64, 33, 22], [90, 45, 14], [20, 51, 10]],
    ][v % 4];
    // base festoneada (bultos pequeños), no una losa: la nube no tiene canto recto
    const BB = []; for (let x = 15; x <= CLW - 15; x += 12.5) BB.push([x, 47, 8.5 + rnd(x * 0.7 + v) * 3.5]);
    const lumps = (dx, dy, k) => { g.beginPath(); B.forEach(([x, y, r]) => { g.moveTo(x + dx + r * k, y + dy); g.arc(x + dx, y + dy, r * k, 0, TAU); }); BB.forEach(([x, y, r]) => { g.moveTo(x + dx + r * k, y + dy); g.arc(x + dx, y + dy, r * k, 0, TAU); }); };
    const sh2 = mix(tone, OUT, 0.26), sh1 = mix(tone, OUT, 0.1), top = lite(tone, 0.8);
    g.globalAlpha = 0.13; g.fillStyle = sh1; lumps(0, 1, 1.16); g.fill(); g.globalAlpha = 0.18; lumps(0, 0.5, 1.07); g.fill(); g.globalAlpha = 1;
    g.fillStyle = sh2; lumps(1.5, 3, 1); g.fill();
    g.fillStyle = sh1; lumps(0.5, 1, 0.99); g.fill();
    g.fillStyle = tone; lumps(-1, -1.5, 0.95); g.fill();
    g.fillStyle = top; lumps(-2.5, -4.5, 0.82); g.fill();
    g.save(); lumps(0, 0, 1); g.clip(); // vientre en penumbra con transición suave
    const ug = g.createLinearGradient(0, 24, 0, 60); ug.addColorStop(0, alpha(sh2, 0)); ug.addColorStop(1, alpha(sh2, 0.75)); g.fillStyle = ug; g.fillRect(0, 20, CLW, CLH - 20); g.restore();
    g.fillStyle = alpha('#ffffff', 0.92);
    B.forEach(([x, y, r], i) => { if (i % 2 === 0) { g.beginPath(); g.ellipse(x - r * 0.34, y - r * 0.64, r * 0.34, r * 0.15, -0.5, 0, TAU); g.fill(); } });
    return (cache[key] = cv);
  }

  /* Rayos de sol: cuñas con degradado, cacheadas; se pintan en modo 'lighter' sobre el cielo */
  function raysSprite(col, res) {
    const key = 'ray' + col + res; if (cache[key]) return cache[key];
    const S = 400, cv = mk(S * res, S * res), g = cv.getContext('2d'); g.scale(res, res); g.translate(S / 2, S / 2);
    const gr = g.createLinearGradient(0, 0, 0, S * 0.5); gr.addColorStop(0, alpha(col, 0.42)); gr.addColorStop(0.3, alpha(col, 0.15)); gr.addColorStop(1, alpha(col, 0));
    g.fillStyle = gr;
    for (let i = 0; i < 9; i++) { const a = 0.35 + i * 0.32 + rnd(i * 3) * 0.16, w = (0.02 + rnd(i + 5) * 0.055) * S * 0.5;
      g.save(); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.lineTo(-w, S * 0.5); g.lineTo(w * 1.6, S * 0.5); g.closePath(); g.fill(); g.restore(); }
    const halo = g.createRadialGradient(0, 0, 2, 0, 0, S * 0.36); halo.addColorStop(0, alpha(col, 0.34)); halo.addColorStop(0.5, alpha(col, 0.08)); halo.addColorStop(1, alpha(col, 0));
    g.fillStyle = halo; g.fillRect(-S / 2, -S / 2, S, S);
    return (cache[key] = cv);
  }

  /* Viñeta suave (cacheada por tamaño): oscurece las esquinas y centra la mirada */
  function vigSprite(W, H, res) {
    const key = 'vig' + W + 'x' + H + '@' + res; if (cache[key]) return cache[key];
    const cv = mk(W * res, H * res), g = cv.getContext('2d'); g.scale(res, res);
    const r = Math.hypot(W, H) / 2, gr = g.createRadialGradient(W / 2, H * 0.46, r * 0.44, W / 2, H * 0.5, r * 0.95);
    gr.addColorStop(0, alpha(OUT, 0)); gr.addColorStop(0.7, alpha(OUT, 0.09)); gr.addColorStop(1, alpha(OUT, 0.3));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return (cache[key] = cv);
  }
  function vignette(c, W, H) { // se copia 1:1 en píxeles del dispositivo: sin remuestrear (es lo caro)
    let m = null; try { m = c.getTransform(); } catch (e) { /* sin getTransform */ }
    const res = m ? Math.min(2, Math.max(1, Math.round(Math.hypot(m.a, m.b) * 100) / 100)) : 1, img = vigSprite(W, H, res);
    if (m && !m.b && !m.c && Math.abs(m.a - res) < 0.005 && Math.abs(m.d - res) < 0.005) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(img, Math.round(m.e), Math.round(m.f)); c.restore(); }
    else c.drawImage(img, 0, 0, W, H);
  }

  function sunSprite(kind, col, res) {
    const key = 'sun' + kind + col + res; if (cache[key]) return cache[key];
    const S = kind === 'dusk' ? 240 : 160, cv = mk(S * res, S * res), g = cv.getContext('2d'); g.scale(res, res); const m = S / 2;
    const gl = g.createRadialGradient(m, m, 4, m, m, m); gl.addColorStop(0, alpha(col, 0.55)); gl.addColorStop(0.35, alpha(col, 0.18)); gl.addColorStop(1, alpha(col, 0)); g.fillStyle = gl; g.fillRect(0, 0, S, S);
    if (kind === 'moon') { g.fillStyle = '#fff6d6'; g.beginPath(); g.arc(m, m, 26, 0, TAU); g.fill(); g.fillStyle = alpha('#d8c89a', 0.55); [[-8, -6, 5], [6, 8, 7], [9, -10, 3.5], [-10, 10, 3]].forEach(([x, y, r]) => { g.beginPath(); g.arc(m + x, m + y, r, 0, TAU); g.fill(); }); g.fillStyle = alpha(OUT, 0.18); g.beginPath(); g.arc(m, m, 26, -1.2, 1.9); g.arc(m - 7, m, 24, 1.9, -1.2, true); g.fill(); }
    else if (kind === 'dusk') { const r = 58; const sg = g.createLinearGradient(0, m - r, 0, m + r); sg.addColorStop(0, '#fff2b0'); sg.addColorStop(1, '#ff7a5c'); g.fillStyle = sg; g.beginPath(); g.arc(m, m, r, 0, TAU); g.fill(); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 5; i++) g.fillRect(0, m + 8 + i * 10 + i * i, S, 2 + i); g.globalCompositeOperation = 'source-over'; }
    else { const cg = g.createRadialGradient(m - 7, m - 8, 1, m, m, 24); cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.45, '#fff6c8'); cg.addColorStop(1, '#ffd979');
      g.fillStyle = cg; g.beginPath(); g.arc(m, m, 22, 0, TAU); g.fill();
      g.fillStyle = alpha('#ffffff', 0.75); g.beginPath(); g.ellipse(m - 7, m - 8, 7, 5, -0.6, 0, TAU); g.fill();
      g.strokeStyle = alpha('#fff6c8', 0.3); g.lineWidth = 3; g.beginPath(); g.arc(m, m, 31, 0, TAU); g.stroke();
      g.strokeStyle = alpha('#fff6c8', 0.14); g.lineWidth = 2; g.beginPath(); g.arc(m, m, 44, 0, TAU); g.stroke(); }
    return (cache[key] = cv);
  }

  const bgs = {};
  function buildBG(th, W, H, res) {
    const id = th.id || '', haze = th.sky[1], B = { L: [], chim: [], res };
    // cada capa se guarda solo hasta base+100; por debajo se rellena con su color sólido (evita sobredibujar imágenes grandes)
    const layer = (par, base, reach, draw) => { const top = Math.floor(base - reach), SH = Math.ceil(base + 100 - top), cv = mk(PW * res, SH * res), g = cv.getContext('2d'); g.scale(res, res); g.translate(0, -top); g.lineJoin = 'round'; const bot = draw(g, top + SH + 40); B.L.push({ cv, par, top, SH, bot }); };
    const far = mix(th.far, haze, 0.25);
    if (id === 'sky') {
      layer(0.1, H * 0.66, 70, (g, bot) => cloudBank(g, H * 0.66, 30, mix('#ffffff', th.sky[0], 0.22), { bot, haze: th.sky[0], seed: 3, r: 14 }));
      layer(0.25, H * 0.6, 200, (g, bot) => islands(g, H * 0.6, th, { bot }));
      layer(0.4, H * 0.84, 60, (g, bot) => cloudBank(g, H * 0.84, 22, '#ffffff', { bot, haze: th.sky[0], seed: 9, r: 18 }));
    } else if (id === 'factory') {
      layer(0.12, H * 0.62, 140, (g, bot) => skyline(g, H * 0.62, far, { bot, haze, win: true, tall: 120, seed: 2, hz: 0.35 }));
      layer(0.3, H * 0.74, 230, (g, bot) => skyline(g, H * 0.74, th.mid, { bot, haze, saw: true, tall: 70, gap: true, pipes: true, seed: 7, hz: 0.25 }, B.chim));
    } else {
      const peaks = { round: id === 'jungle', snow: id === 'jungle' ? 0 : id === 'snow' ? 0.42 : id === 'night' || id === 'dusk' ? 0.8 : 0.66, seed: id.length, haze, shade: id === 'night' ? 0.3 : 0.2 };
      // dos cordilleras en el MISMO lienzo cacheado: la de atrás casi disuelta en la niebla aérea
      // (más profundidad sin pagar un blit más por fotograma)
      layer(0.1, H * 0.6, 126, (g, bot) => { mountains(g, H * 0.575, 74, mix(far, haze, 0.6), { ...peaks, seed: id.length + 6, shade: 0.1, bot });
        return mountains(g, H * 0.6, 100, far, { ...peaks, bot }); });
      if (id === 'castle') layer(0.25, H * 0.72, 200, (g, bot) => castles(g, H * 0.72, th.mid, { bot, haze }));
      else { const tree = id === 'jungle' ? 'palm' : th.deco === 'pine' ? 'pine' : 'round', c2 = mix(th.mid, far, 0.45);
        layer(0.2, H * 0.68, 90, (g, bot) => hills(g, H * 0.68, 45, c2, { bot, seed: 4, trees: 22, tree, ts: 0.8, tcol: dark(c2, 0.1), haze, hz: 0.35, snowy: id === 'snow' })); }
      const tree = id === 'jungle' ? 'palm' : th.deco === 'pine' || id === 'castle' ? 'pine' : 'round';
      layer(0.35, H * 0.77, 110, (g, bot) => hills(g, H * 0.77, 55, th.mid, { bot, seed: 11, trees: 14, tree, ts: 1.25, tcol: dark(th.mid, 0.12), ol: true, haze, hz: 0.15, snowy: id === 'snow' }));
    }
    return B;
  }

  function background(c, th, W, H, camX, camY, t) {
    curTh = th;
    let m = null; try { m = c.getTransform(); } catch (e) { /* sin getTransform */ }
    const sc = m ? Math.hypot(m.a, m.b) : 1, res = Math.min(3, Math.max(1, Math.round(sc * 100) / 100));
    const key = thKey(th) + W + 'x' + H + '@' + res; let B = bgs[key];
    const id = th.id || '';
    if (!B) { B = bgs[key] = buildBG(th, W, H, res);
      // Cielo a media resolución (son degradados: no se nota) con los rayos de luz ya horneados:
      // un solo drawImage por fotograma y ningún compuesto 'lighter' en el bucle.
      const sk = B.sky = mk(W * res, H * res), g = sk.getContext('2d'); g.scale(res, res);
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, dark(th.sky[0], 0.16)); gr.addColorStop(0.18, th.sky[0]); gr.addColorStop(0.45, mix(th.sky[0], th.sky[1], 0.4)); gr.addColorStop(0.72, mix(th.sky[0], th.sky[1], 0.82)); gr.addColorStop(1, th.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const LX = W * 0.2, LY = H * 0.18, RS = Math.max(W, H);
      const ray = (col, x, y, sz, a) => { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.drawImage(raysSprite(col, 1), x - sz / 2, y - sz / 2, sz, sz); g.restore(); };
      if (th.moon) ray('#a6d4ff', LX, LY, RS * 1.05, 0.26);
      else if (id === 'dusk') ray('#ffcf95', W * 0.27, H * 0.5, RS * 1.7, 0.5);
      else if (!th.metal && !th.brick) ray('#fff0b4', LX, LY, RS * 1.45, 0.42);
      else if (th.brick) ray('#c6dcff', LX, LY, RS * 1.05, 0.22);
      else ray('#a8c2d4', LX, LY, RS * 1.2, 0.18);
    }
    const exact = m && !m.b && !m.c && Math.abs(m.a - res) < 0.005 && Math.abs(m.d - res) < 0.005;
    const blit = (img, x, y, w, h) => { if (exact) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(img, Math.round(m.a * x + m.e), Math.round(m.d * y + m.f)); c.restore(); } else c.drawImage(img, x, y, w, h); };
    // copia 1:1 en píxeles del dispositivo cuando la escala coincide (mucho más barato que remuestrear)
    blit(B.sky, 0, 0, W, H);
    if (th.stars) { c.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { const x = ((rnd(i) * 1600 - camX * 0.05) % W + W) % W, y = rnd(i + 99) * H * 0.6 - camY * 0.02, tw = Math.abs(Math.sin(t * (0.8 + rnd(i + 7) * 1.6) + i)); c.globalAlpha = 0.25 + 0.75 * tw; const s = rnd(i + 3) < 0.15 ? 2.5 : 1.6; c.fillRect(x, y, s, s); if (s > 2 && tw > 0.8) { c.globalAlpha = (tw - 0.8) * 3; c.fillRect(x - 3, y + 1, 8.5, 0.8); c.fillRect(x + 0.9, y - 3, 0.8, 8.5); } }
      const ss = (t % 11) / 0.7; if (ss < 1) { const sx = W * (0.2 + rnd(Math.floor(t / 11)) * 0.5) + ss * 120, sy = H * 0.08 + ss * 50; c.globalAlpha = 1 - ss; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 40, sy - 17); c.stroke(); }
      c.globalAlpha = 1; }
    // El foco de luz va arriba-izquierda en todos los temas: así coincide con el sombreado de los sprites
    const LX = W * 0.2, LY = H * 0.18;
    if (th.moon) c.drawImage(sunSprite('moon', '#fff6d6', B.res), LX - 80, LY - 80, 160, 160);
    else if (id === 'dusk') c.drawImage(sunSprite('dusk', '#ffe6a0', B.res), W * 0.27 - 120, H * 0.5 - 120 - camY * 0.03, 240, 240);
    else if (!th.metal && !th.brick) c.drawImage(sunSprite('sun', '#fff2b0', B.res), LX - 80, LY - 80, 160, 160);
    else if (th.brick) c.drawImage(sunSprite('moon', '#fff0d0', B.res), LX - 80, LY - 80, 160, 160);
    B.L.forEach((L, n) => {
      const off = camX * L.par, yy = L.top - camY * L.par * 0.5; let x = -((off % PW) + PW) % PW;
      for (; x < W; x += PW) blit(L.cv, x, yy, PW, L.SH);
      if (yy + L.SH < H) { c.fillStyle = L.bot; c.fillRect(0, yy + L.SH - 1, W, H - yy - L.SH + 1); }
      if (n === 0 && th.clouds) { c.globalAlpha = 0.72; for (let i = 0; i < 4; i++) { const cx = ((i * 290 + t * 3 - camX * 0.08) % (W + 160) + W + 160) % (W + 160) - 110, cy = H * 0.3 + rnd(i + 20) * H * 0.15 - camY * 0.05; c.drawImage(cloudSprite(mix('#ffffff', th.sky[0], 0.4), i + 1, B.res), cx, cy, 74, 74 * CLH / CLW); } c.globalAlpha = 1; }
      if (n === B.L.length - 1 && B.chim.length) { // humo de chimeneas y balizas (fábrica)
        for (const [hx, hy] of B.chim) { const X = (((hx - off) % PW) + PW) % PW; for (const bx of [X - PW, X, X + PW]) { if (bx < -40 || bx > W + 40) continue; const Y = hy + yy - L.top;
          for (let j = 0; j < 4; j++) { const p = ((t * 0.45 + j / 4 + hx * 0.01) % 1); c.fillStyle = `rgba(160,180,190,${0.28 * (1 - p)})`; c.beginPath(); c.arc(bx + p * 18 + Math.sin(p * 6 + j) * 3, Y - p * 60, 5 + p * 12, 0, TAU); c.fill(); }
          c.fillStyle = Math.sin(t * 3 + hx) > 0.3 ? '#ff4d4d' : '#6a2a2a'; c.fillRect(bx - 2, Y - 2, 4, 3); } } }
    });
    if (th.clouds) { for (let i = 0; i < 6; i++) { const x = ((i * 190 + t * 8 - camX * 0.2) % (W + 200) + W + 200) % (W + 200) - 100, y = 40 + rnd(i) * 80 - camY * 0.1; c.drawImage(cloudSprite(mix('#ffffff', th.sky[0], 0.28), i, B.res), x - 12, y - 34, 98, 98 * CLH / CLW); } }
    ambient(c, id, W, H, camX, camY, t);
  }

  /* Partículas de ambiente por tema: polen, hojas, copos, luciérnagas, brasas, polvo u hollín.
   * Muy pocas y sin sombras: ~1 % del coste del fotograma, pero dan vida y profundidad al aire. */
  const AMB = { meadow: ['polen', 11], jungle: ['hoja', 10], sky: ['polen', 10], snow: ['copo', 24], night: ['luz', 10], dusk: ['brasa', 11], castle: ['polvo', 10], factory: ['hollin', 11] };
  function ambient(c, id, W, H, camX, camY, t) {
    const A = AMB[id]; if (!A) return; const kind = A[0], n = A[1];
    const wrap = (x, m) => ((x % m) + m) % m;
    c.save();
    for (let i = 0; i < n; i++) {
      const r0 = rnd(i * 2.7 + 1), r1 = rnd(i * 5.1 + 40), r2 = rnd(i * 3.3 + 80), dep = 0.5 + r2 * 0.8;
      let x, y, a = 0.3 + r1 * 0.45, s = 1 + r2 * 1.6;
      if (kind === 'copo' || kind === 'hoja') {
        const sp = kind === 'copo' ? 26 + r0 * 46 : 16 + r0 * 26;
        y = wrap(t * sp + r1 * (H + 60) - camY * 0.25, H + 60) - 30;
        x = wrap(r0 * (W + 80) + Math.sin(t * (0.5 + r1) + i) * (kind === 'copo' ? 16 : 28) - camX * 0.16, W + 80) - 40;
      } else if (kind === 'hollin') {
        y = H - wrap(t * (18 + r0 * 26) + r1 * (H + 60) - camY * 0.2, H + 60) + 30;
        x = wrap(r0 * (W + 80) + Math.sin(t * 0.7 + i) * 20 - camX * 0.14, W + 80) - 40;
      } else {
        y = wrap(r1 * (H + 40) + Math.sin(t * (0.25 + r2 * 0.4) + i * 1.7) * 22 - camY * 0.22, H + 40) - 20;
        x = wrap(r0 * (W + 80) + Math.sin(t * (0.18 + r1 * 0.3) + i * 2.3) * 34 - camX * 0.13, W + 80) - 40;
      }
      if (kind === 'copo') { c.fillStyle = alpha('#ffffff', 0.35 + r1 * 0.5); c.beginPath(); c.arc(x, y, s * dep, 0, TAU); c.fill(); if (s > 2) { c.fillStyle = alpha('#ffffff', 0.25); c.fillRect(x - s * 2, y - 0.4, s * 4, 0.8); c.fillRect(x - 0.4, y - s * 2, 0.8, s * 4); } }
      else if (kind === 'hoja') { c.save(); c.translate(x, y); c.rotate(t * (0.8 + r1) + i); c.fillStyle = alpha(r2 < 0.5 ? '#a8cf3f' : '#3cc96a', 0.55 + r1 * 0.3); c.beginPath(); c.ellipse(0, 0, 3.4 * dep, 1.5 * dep, 0, 0, TAU); c.fill(); c.restore(); }
      else if (kind === 'luz') { const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (1 + r2 * 2) + i)); c.fillStyle = alpha('#c7ff8a', 0.18 * tw); c.beginPath(); c.arc(x, y, 5 * dep, 0, TAU); c.fill(); c.fillStyle = alpha('#eaffc0', 0.9 * tw); c.beginPath(); c.arc(x, y, 1.5 * dep, 0, TAU); c.fill(); }
      else if (kind === 'brasa') { const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.8 + r2) + i)); c.fillStyle = alpha('#ffb066', 0.14 * tw); c.beginPath(); c.arc(x, y, 5 * dep, 0, TAU); c.fill(); c.fillStyle = alpha('#ffe0a8', 0.8 * tw); c.beginPath(); c.arc(x, y, 1.3 * dep, 0, TAU); c.fill(); }
      else if (kind === 'hollin') { c.fillStyle = alpha('#8a97a3', 0.22 + r1 * 0.2); c.beginPath(); c.arc(x, y, 1.4 * dep, 0, TAU); c.fill(); }
      else if (kind === 'polvo') { c.fillStyle = alpha('#dfe6ff', 0.16 + r1 * 0.2); c.beginPath(); c.arc(x, y, 1.4 * dep, 0, TAU); c.fill(); }
      else { c.fillStyle = alpha('#fff3b8', 0.2 * a); c.beginPath(); c.arc(x, y, 4 * dep, 0, TAU); c.fill(); c.fillStyle = alpha('#fffbe0', 0.55 + r1 * 0.3); c.beginPath(); c.arc(x, y, 1.3 * dep, 0, TAU); c.fill(); }
    }
    c.restore();
  }

  /* ------------------------------------------------ Casillas (se cachean, con textura) */
  const cache = {};
  const OV = 7; // margen superior para mechones de hierba / nieve que sobresalen
  function tileCanvas(c, th, key, T, hgt, draw) { const id = key + T + thKey(th); if (cache[id]) return cache[id]; const res = resOf(c, 2, 3), cv = mk(T * res, hgt * res), g = cv.getContext('2d'); g.scale(res, res); g.lineJoin = 'round'; g.lineCap = 'round'; draw(g); cache[id] = cv; return cv; }
  function wrapX(T, x, fn) { fn(x); if (x < 8) fn(x + T); if (x > T - 8) fn(x - T); }
  function groundTile(g, th, T, e, v) {
    const G = th.ground, D = th.groundD, snow = th.top === '#ffffff';
    const R = (n) => rnd(v * 41.7 + n * 7.3 + 2.1); // ruido determinista: cada variante de casilla es distinta
    g.save(); g.translate(0, OV);
    const gr = g.createLinearGradient(0, 0, 0, T); gr.addColorStop(0, lite(G, 0.12)); gr.addColorStop(0.35, lite(G, 0.02)); gr.addColorStop(1, mix(G, D, 0.6)); g.fillStyle = gr; g.fillRect(0, 0, T, T);
    if (th.brick) { // sillares biselados
      const bh = T / 2;
      for (let r = 0; r < 2; r++) { const off = r ? -T / 2 : 0; for (let k = 0; k < 2; k++) { const x = off + k * T, y = r * bh, v = rnd(r * 3 + k + 1);
        for (const dx of [0, T]) { const X = x + dx; if (X >= T || X + T <= 0) continue; g.fillStyle = mix(G, v < 0.5 ? D : '#ffffff', v < 0.5 ? 0.15 : 0.06); g.fillRect(X + 1, y + 1, T - 2, bh - 2);
          g.fillStyle = alpha('#ffffff', 0.22); g.fillRect(X + 1, y + 1, T - 2, 2); g.fillRect(X + 1, y + 1, 2, bh - 2); g.fillStyle = alpha(OUT, 0.25); g.fillRect(X + 1, y + bh - 3, T - 2, 2); g.fillRect(X + T - 3, y + 1, 2, bh - 2); } } }
      // grietas, desconchones en las esquinas y musgo: distintos en cada variante
      g.strokeStyle = alpha(OUT, 0.38); g.lineWidth = 1;
      for (let i = 0; i < 2; i++) { let cx2 = (0.18 + R(i) * 0.6) * T, cy2 = (0.12 + R(i + 4) * 0.7) * T; g.beginPath(); g.moveTo(cx2, cy2);
        for (let j = 0; j < 3; j++) { cx2 += (R(i * 3 + j) - 0.45) * T * 0.18; cy2 += T * 0.1; g.lineTo(cx2, cy2); } g.stroke(); }
      g.fillStyle = alpha(OUT, 0.3); for (let i = 0; i < 3; i++) { const a = R(i + 11), b = R(i + 15); g.beginPath(); g.ellipse((a < 0.5 ? 1 : T - 1) + (a - 0.5) * 4, b * T, 2 + R(i + 19) * 2, 1.6 + R(i + 21) * 1.6, R(i) * 3, 0, TAU); g.fill(); }
      g.fillStyle = alpha('#ffffff', 0.12); for (let i = 0; i < 4; i++) g.fillRect(R(i + 30) * T, R(i + 34) * T, 1.4, 1.4);
      if (R(7) < 0.7) { g.fillStyle = alpha('#7fae6a', 0.42); const mx = R(8) * T; g.beginPath(); g.ellipse(mx, T * 0.97, 4 + R(9) * 3, 2 + R(10) * 1.5, 0, 0, TAU); g.fill(); g.fillStyle = alpha('#9fcf7a', 0.3); g.beginPath(); g.ellipse(mx - 1.5, T * 0.94, 2.4, 1.1, 0, 0, TAU); g.fill(); }
    } else if (th.metal) { // placa de acero: bisel, remaches, reflejo alargado, arañazos y óxido (todo por variante)
      g.fillStyle = alpha('#ffffff', 0.16); g.fillRect(1, 1, T - 2, 2); g.fillRect(1, 1, 2, T - 2); g.fillStyle = alpha(OUT, 0.3); g.fillRect(1, T - 3, T - 2, 2); g.fillRect(T - 3, 1, 2, T - 2);
      // reflejo alargado del metal: una banda diagonal clara que cruza la placa
      g.save(); g.beginPath(); g.rect(1, 1, T - 2, T - 2); g.clip();
      const sh = (v % 4) * T * 0.22 - T * 0.15;
      g.fillStyle = alpha('#ffffff', 0.09); g.beginPath(); g.moveTo(sh, T); g.lineTo(sh + T * 0.7, 0); g.lineTo(sh + T * 0.95, 0); g.lineTo(sh + T * 0.25, T); g.fill();
      g.fillStyle = alpha('#ffffff', 0.05); g.beginPath(); g.moveTo(sh + T * 0.32, T); g.lineTo(sh + T * 1.02, 0); g.lineTo(sh + T * 1.12, 0); g.lineTo(sh + T * 0.42, T); g.fill();
      // arañazos finos: la dirección y el número cambian con la variante
      g.lineWidth = 1; for (let i = 0; i < 3 + (v & 1); i++) { const ax = R(i + 40) * T, ay = R(i + 44) * T, ln = 3 + R(i + 48) * 9, an = (R(i + 52) - 0.5) * 1.1 + (v & 2 ? 2.4 : 0.7); g.strokeStyle = alpha(OUT, 0.22); g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + Math.cos(an) * ln, ay + Math.sin(an) * ln); g.stroke(); g.strokeStyle = alpha('#ffffff', 0.16); g.beginPath(); g.moveTo(ax, ay - 1); g.lineTo(ax + Math.cos(an) * ln, ay + Math.sin(an) * ln - 1); g.stroke(); }
      // manchas de óxido / grasa en dos tonos, pegadas a una esquina distinta según la variante
      if (R(60) < 0.75) { const cx = (v & 1 ? 2 : T - 2), cy = (v & 2 ? 2 : T - 2); g.fillStyle = alpha('#8a5a32', 0.2); g.beginPath(); g.ellipse(cx, cy, 5 + R(61) * 5, 4 + R(62) * 4, R(63) * 3, 0, TAU); g.fill(); g.fillStyle = alpha('#b57a3e', 0.14); g.beginPath(); g.ellipse(cx + (v & 1 ? 2 : -2), cy + (v & 2 ? 2 : -2), 3 + R(64) * 3, 2 + R(65) * 2.5, 0, 0, TAU); g.fill(); }
      g.fillStyle = alpha(OUT, 0.16); for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(R(i + 70) * T, R(i + 74) * T, 1.3 + R(i + 78) * 1.4, 1 + R(i + 82) * 1.1, 0, 0, TAU); g.fill(); }
      g.restore();
      [[5, 6], [T - 6, 6], [5, T - 7], [T - 6, T - 7]].forEach(([a, b], i) => { g.fillStyle = alpha(OUT, 0.28); g.beginPath(); g.arc(a + 0.8, b + 1, 2.4, 0, TAU); g.fill(); g.fillStyle = D; g.beginPath(); g.arc(a, b, 2.3, 0, TAU); g.fill(); g.fillStyle = alpha('#ffffff', 0.5 - R(i + 90) * 0.22); g.beginPath(); g.arc(a - 0.6, b - 0.6, 0.9, 0, TAU); g.fill(); });
      g.fillStyle = D; g.fillRect(T * 0.3, T * 0.45, T * 0.4, 3); g.fillStyle = alpha('#ffffff', 0.15); g.fillRect(T * 0.3, T * 0.45 + 3, T * 0.4, 1);
    } else { // TIERRA: estratos ondulados, piedras incrustadas con volumen, raíces, vetas y desgaste
      // 1) estratos: bandas suaves de sedimento (la onda y la altura cambian con la variante)
      for (let st = 0; st < 2; st++) {
        const y0 = T * (0.26 + st * 0.3) + (v % 2) * T * 0.12, am = 1 + R(st) * 1.3, ph = R(st + 3) * TAU, gs = T * (0.07 + R(st + 6) * 0.06);
        g.fillStyle = st % 2 ? alpha(D, 0.3) : alpha(lite(G, 0.22), 0.18);
        g.beginPath(); g.moveTo(0, y0 + Math.sin(ph) * am);
        for (let x = 0; x <= T; x += 3) g.lineTo(x, y0 + Math.sin(x / T * TAU + ph) * am + Math.sin(x / T * TAU * 2 + ph * 1.7) * am * 0.4);
        for (let x = T; x >= 0; x -= 3) g.lineTo(x, y0 + gs + Math.sin(x / T * TAU + ph + 0.8) * am * 0.7);
        g.closePath(); g.fill();
      }
      // 2) raíces: un hilo leñoso fino que baja y se ramifica (solo en la mitad de las variantes)
      g.lineCap = 'round';
      if (v & 1) {
        let rx = (0.15 + R(20) * 0.7) * T, ry = R(23) * T * 0.3;
        g.strokeStyle = alpha(mix(D, '#5a3a1e', 0.55), 0.4); g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(rx, ry);
        for (let j = 0; j < 4; j++) { const nx = rx + (R(j + 26) - 0.5) * T * 0.26, ny = ry + T * 0.19; g.quadraticCurveTo(rx, ry + T * 0.1, nx, ny); rx = nx; ry = ny; }
        g.stroke();
        g.lineWidth = 0.8; g.beginPath(); g.moveTo(rx, ry - T * 0.17); g.lineTo(rx + (R(31) - 0.5) * T * 0.28, ry - T * 0.04); g.stroke();
      }
      // 3) piedras incrustadas: base oscura, cuerpo, cara de luz arriba-izquierda y sombra de contacto
      const ns = 2 + (v & 1);
      for (let i = 0; i < ns; i++) {
        const r = 1.3 + R(i + 40) * 1.5, bx = R(i + 44) * T, by = (0.2 + R(i + 48) * 0.72) * T, tilt = (R(i + 52) - 0.5) * 1.2;
        const col = mix(D, R(i + 56) < 0.5 ? '#bdb8cc' : '#8f8aa0', 0.3 + R(i + 60) * 0.25);
        wrapX(T, bx, (x) => {
          g.fillStyle = alpha(OUT, 0.2); g.beginPath(); g.ellipse(x + r * 0.3, by + r * 0.6, r * 1.1, r * 0.46, 0, 0, TAU); g.fill();
          g.fillStyle = dark(col, 0.3); g.beginPath(); g.ellipse(x, by, r * 1.2, r, tilt, 0, TAU); g.fill();
          g.fillStyle = col; g.beginPath(); g.ellipse(x - r * 0.1, by - r * 0.12, r * 1.02, r * 0.8, tilt, 0, TAU); g.fill();
          g.fillStyle = alpha('#ffffff', 0.3); g.beginPath(); g.ellipse(x - r * 0.4, by - r * 0.4, r * 0.44, r * 0.24, tilt - 0.5, 0, TAU); g.fill();
        });
      }
      // 4) vetas y desgaste: un arañazo fino, motas claras y grano oscuro
      g.strokeStyle = alpha(D, 0.5); g.lineWidth = 1;
      { const a = R(70) * T, b = (0.35 + R(73) * 0.45) * T; g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo(a + T * 0.08, b + T * 0.08, a + (R(76) - 0.3) * T * 0.2, b + T * 0.18); g.stroke(); }
      g.fillStyle = alpha('#ffffff', 0.1); for (let i = 0; i < 5; i++) g.fillRect(R(i + 80) * T, R(i + 88) * T, 1.2, 1.2);
      g.fillStyle = alpha(OUT, 0.09); for (let i = 0; i < 6; i++) g.fillRect(R(i + 96) * T, R(i + 104) * T, 1.4, 1.1);
      // 5) sombra ambiental en la base de la casilla (oclusión)
      const ao = g.createLinearGradient(0, T - 7, 0, T); ao.addColorStop(0, alpha(OUT, 0)); ao.addColorStop(1, alpha(OUT, 0.15)); g.fillStyle = ao; g.fillRect(0, T - 7, T, 7);
    }
    // costados expuestos: sombra interior y contorno
    // costados expuestos: bisel (cara de luz a la izquierda, canto frío a la derecha) + contorno
    if (e.left) { const sg = g.createLinearGradient(0, 0, 7, 0); sg.addColorStop(0, alpha(OUT, 0.3)); sg.addColorStop(1, alpha(OUT, 0)); g.fillStyle = sg; g.fillRect(0, 0, 7, T);
      g.fillStyle = alpha('#ffffff', 0.22); g.fillRect(2, 0, 1.8, T); g.fillStyle = OUT; g.fillRect(0, 0, 2, T); }
    if (e.right) { const sg = g.createLinearGradient(T, 0, T - 8, 0); sg.addColorStop(0, alpha(OUT, 0.46)); sg.addColorStop(1, alpha(OUT, 0)); g.fillStyle = sg; g.fillRect(T - 8, 0, 8, T);
      g.fillStyle = alpha('#5b8cff', 0.16); g.fillRect(T - 3.8, 0, 1.8, T); g.fillStyle = OUT; g.fillRect(T - 2, 0, 2, T); }
    if (e.top) {
      if (th.metal) { g.fillStyle = th.top; g.fillRect(0, 0, T, 9); g.save(); g.beginPath(); g.rect(0, 0, T, 9); g.clip(); g.fillStyle = OUT; for (let i = -10; i < T + 10; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 5, 0); g.lineTo(i, 9); g.lineTo(i - 5, 9); g.fill(); } g.restore();
        g.fillStyle = alpha('#ffffff', 0.35); g.fillRect(0, 0, T, 2); g.fillStyle = OUT; g.fillRect(0, 9, T, 2); g.fillStyle = alpha(OUT, 0.3); g.fillRect(0, 11, T, 2); }
      else if (th.brick) { g.fillStyle = th.topD; g.fillRect(0, 0, T, 9); g.fillStyle = th.top; g.fillRect(0, 0, T, 6); g.fillStyle = alpha('#ffffff', 0.35); g.fillRect(0, 0, T, 2); g.fillStyle = OUT; g.fillRect(0, 9, T, 1.5); g.fillStyle = alpha(OUT, 0.3); g.fillRect(T / 2, 0, 1, 9); }
      else { // hierba (o nieve) con festón inferior y mechones que sobresalen
        const top = th.top, topD = th.topD, band = (y0, amp, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, -1); g.lineTo(T, -1); for (let x = T; x >= 0; x -= 2) g.lineTo(x, y0 + (snow ? Math.max(0, Math.sin(x / T * TAU * 2 + 0.5)) * amp * 1.4 : Math.abs(Math.sin(x / T * Math.PI * 3)) * amp)); g.closePath(); g.fill(); };
        band(10, 4, alpha(OUT, 0.35)); band(9, 4, dark(topD, 0.22)); band(8, 4, topD); band(6, 3, top); band(3.6, 2, lite(top, 0.26));
        g.fillStyle = alpha('#ffffff', snow ? 0.85 : 0.42); g.fillRect(0, 0, T, 1.8); // luz de borde superior
        if (e.flat) { /* sin mechones: techos volteados (gravity-flip) */ }
        else if (snow) { // nieve: montículos con volumen, sombra azulada y destellos de hielo
          g.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { const a = (0.08 + i * 0.26 + R(i + 120) * 0.12) * T, r = 1.6 + R(i + 124) * 2.2; g.beginPath(); g.ellipse(a, 0.5, r * 1.15, r, 0, Math.PI, 0); g.fill(); }
          g.fillStyle = alpha('#bcd9f7', 0.7); for (let i = 0; i < 3; i++) { const a = (0.14 + i * 0.32 + R(i + 128) * 0.1) * T; g.beginPath(); g.ellipse(a + 1.4, 1.6, 2.4, 1.2, 0, 0, TAU); g.fill(); }
          g.fillStyle = alpha('#ffffff', 0.95); for (let i = 0; i < 3; i++) { const a = R(i + 132) * T, b = 3 + R(i + 136) * 5; g.fillRect(a, b, 1.3, 1.3); g.fillStyle = alpha('#d8ecff', 0.9); }
        } else { // hierba: briznas en dos tonos con inclinación variable, flores sueltas y rocío
          const blade = (x, h, lean, w) => { g.beginPath(); g.moveTo(x - w, 1.5); g.quadraticCurveTo(x + lean * 0.35, -h * 0.5, x + lean, -h); g.quadraticCurveTo(x + lean * 0.15, -h * 0.4, x + w, 1.5); g.fill(); };
          const NB = 9, bl = [];
          for (let i = 0; i < NB; i++) bl.push([(i + 0.15 + R(i + 140) * 0.7) * T / NB, 3.4 + R(i + 150) * 4.6, (R(i + 160) - 0.45) * 5.4, 0.9 + R(i + 170) * 0.8]);
          g.fillStyle = dark(topD, 0.12); bl.forEach(([x, h, l, w]) => blade(x + 0.9, h * 1.16, l, w)); // capa trasera en sombra
          g.fillStyle = topD; bl.forEach(([x, h, l, w]) => blade(x + 0.4, h * 1.06, l, w));
          g.fillStyle = top; bl.forEach(([x, h, l, w], i) => { if (i % 3) blade(x, h, l, w * 0.85); });
          g.fillStyle = lite(top, 0.4); bl.forEach(([x, h, l, w], i) => { if (i % 4 === 0) blade(x, h * 0.78, l * 0.7, w * 0.5); });
          if (R(180) < 0.5) { // flor: cinco pétalos y botón
            const fx = (0.15 + R(181) * 0.7) * T, fy = -2.4 - R(182) * 2.6, pc = ['#ffc94d', '#ff6fb5', '#ffffff', '#a097ff'][Math.floor(R(183) * 4) % 4];
            g.strokeStyle = dark(topD, 0.1); g.lineWidth = 1; g.beginPath(); g.moveTo(fx, 2); g.quadraticCurveTo(fx + 1, fy * 0.4, fx, fy + 1.6); g.stroke();
            g.fillStyle = pc; for (let q = 0; q < 5; q++) { const a = q * TAU / 5 + R(184); g.beginPath(); g.ellipse(fx + Math.cos(a) * 1.5, fy + Math.sin(a) * 1.5, 1.5, 1.1, a, 0, TAU); g.fill(); }
            g.fillStyle = alpha('#ffffff', 0.55); g.beginPath(); g.arc(fx - 1.2, fy - 1.2, 1, 0, TAU); g.fill();
            g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(fx, fy, 1.15, 0, TAU); g.fill(); g.fillStyle = alpha(OUT, 0.35); g.beginPath(); g.arc(fx + 0.4, fy + 0.4, 0.5, 0, TAU); g.fill();
          }
          g.fillStyle = alpha('#ffffff', 0.7); g.beginPath(); g.arc((0.2 + R(190) * 0.6) * T, 2.6, 1.1, 0, TAU); g.fill();
        }
        // musgo colgante en los cantos expuestos
        if (!snow && !e.flat) { const droop = (sx) => { g.fillStyle = topD; g.beginPath(); g.moveTo(sx - 2.4, 6); g.quadraticCurveTo(sx, 8 + R(200 + sx) * 5, sx + 2.4, 6); g.closePath(); g.fill(); g.fillStyle = alpha(top, 0.6); g.beginPath(); g.moveTo(sx - 1.4, 6); g.quadraticCurveTo(sx - 0.2, 7 + R(201 + sx) * 3, sx + 1, 6); g.closePath(); g.fill(); };
          if (e.left) { droop(4.5); droop(9); } if (e.right) { droop(T - 4.5); droop(T - 9); } }
        if (e.left) { g.fillStyle = OUT; g.fillRect(0, -1, 2, 12); }
        if (e.right) { g.fillStyle = OUT; g.fillRect(T - 2, -1, 2, 12); }
      }
      g.globalCompositeOperation = 'destination-out'; // esquinas redondeadas
      const corner = (cx, sgn) => { g.beginPath(); g.moveTo(cx, -OV); g.lineTo(cx + sgn * 5, -OV); g.lineTo(cx + sgn * 5, 0); g.arc(cx + sgn * 5, 5, 5, -Math.PI / 2, sgn > 0 ? Math.PI : 0, sgn > 0); g.lineTo(cx, -OV); g.fill(); };
      if (e.left) corner(0, 1); if (e.right) corner(T, -1);
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = OUT; g.lineWidth = 2;
      if (e.left) { g.beginPath(); g.moveTo(1, 12); g.lineTo(1, 5); g.arc(6, 5, 5, Math.PI, -Math.PI / 2); g.stroke(); }
      if (e.right) { g.beginPath(); g.moveTo(T - 1, 12); g.lineTo(T - 1, 5); g.arc(T - 6, 5, 5, 0, -Math.PI / 2, true); g.stroke(); }
    }
    g.restore();
  }
  function tile(c, th, kind, x, y, T, edges) {
    edges = edges || {};
    // variante determinista por posición: dos casillas vecinas nunca son idénticas, pero la misma casilla
    // siempre se dibuja igual (y se cachea: 4 variantes × combinación de cantos)
    const v = (Math.round(x / T) * 5 + Math.round(y / T) * 3) & 3;
    if (kind === 'ground') {
      const key = 'g' + v + (edges.top ? 'T' : '') + (edges.left ? 'L' : '') + (edges.right ? 'R' : '') + (edges.flat ? 'F' : '');
      const img = tileCanvas(c, th, key, T, T + OV, (g) => groundTile(g, th, T, edges, v));
      c.drawImage(img, x, y - OV, T, T + OV); return;
    }
    const img = tileCanvas(c, th, kind + (kind === 'plank' ? v & 1 : ''), T, T, (g) => {
      if (kind === 'plank') { // tablón con veta, nudo, clavos y canto inferior
        const P = th.plank, RP = (n) => rnd((v & 1) * 53.3 + n * 9.1 + 4.7);
        rr(g, 1, 1, T - 2, 10, 3); const gr = g.createLinearGradient(0, 1, 0, 11); gr.addColorStop(0, lite(P, 0.28)); gr.addColorStop(0.5, P); gr.addColorStop(1, dark(P, 0.34)); g.fillStyle = gr; g.fill();
        g.save(); rr(g, 1, 1, T - 2, 10, 3); g.clip(); g.fillStyle = dark(P, 0.35); g.fillRect(0, 8.5, T, 3);
        g.strokeStyle = alpha(dark(P, 0.42), 0.55); g.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) { const yy = 3 + i * 2.4 + RP(i) * 1.2; g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(T * 0.3, yy - 1 - RP(i + 3), T * 0.65, yy + 1 + RP(i + 6), T, yy + (RP(i + 9) - 0.5) * 1.4); g.stroke(); }
        const kx = (0.25 + RP(12) * 0.5) * T; g.fillStyle = alpha(dark(P, 0.45), 0.7); g.beginPath(); g.ellipse(kx, 6, 2.1, 1.5, 0.3, 0, TAU); g.fill();
        g.strokeStyle = alpha(dark(P, 0.6), 0.6); g.lineWidth = 0.7; g.beginPath(); g.ellipse(kx, 6, 3.2, 2.2, 0.3, 0, TAU); g.stroke();
        g.fillStyle = alpha('#ffffff', 0.4); g.fillRect(2, 2, T - 4, 1.4); g.fillStyle = alpha(OUT, 0.18); g.fillRect(2, 9.6, T - 4, 1.2); g.restore();
        g.lineWidth = 2.2; g.strokeStyle = OUT; rr(g, 1, 1, T - 2, 10, 3); g.stroke(); g.lineWidth = 1; g.strokeStyle = alpha(OUT, 0.5); g.beginPath(); g.moveTo(T / 2, 2.5); g.lineTo(T / 2, 9.5); g.stroke();
        [[4.5, 5], [T - 4.5, 5]].forEach(([a, b]) => { g.fillStyle = '#5a5570'; g.beginPath(); g.arc(a, b, 1.4, 0, TAU); g.fill(); g.fillStyle = alpha('#ffffff', 0.6); g.fillRect(a - 0.8, b - 0.9, 0.8, 0.8); });
      }
      if (kind === 'spike') { // púas metálicas con cara de luz y de sombra
        rr(g, 0.5, T - 5, T - 1, 5, 1.5); fillOut(g, '#5c6480', 1.5); g.fillStyle = alpha('#ffffff', 0.25); g.fillRect(2, T - 4, T - 4, 1);
        for (let i = 0; i < 2; i++) { const bx = i * T / 2, tx = bx + T / 4, ty = T * 0.3, by = T - 4;
          g.fillStyle = '#eef3fb'; g.beginPath(); g.moveTo(bx + 1.5, by); g.lineTo(tx, ty); g.lineTo(tx, by); g.fill();
          g.fillStyle = '#a9b4c9'; g.beginPath(); g.moveTo(tx, ty); g.lineTo(bx + T / 2 - 1.5, by); g.lineTo(tx, by); g.fill();
          g.beginPath(); g.moveTo(bx + 1.5, by); g.lineTo(tx, ty); g.lineTo(bx + T / 2 - 1.5, by); g.closePath(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
          g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(tx - 0.6, ty + 4); g.lineTo(tx - 2.2, by - 3); g.lineTo(tx - 0.6, by - 3); g.fill(); glint(g, tx, ty + 2.5, 2.2); }
      }
    });
    c.drawImage(img, x, y, T, T);
  }

  /* ------------------------------------------------ Héroe (animado, con expresiones) */
  const SKIN = '#ffd9b5', SKIND = '#eab08c', PANTS = '#2c2748', HAIR = '#3a2a4a';
  function limb(c, pts, w, col, back) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.strokeStyle = OUT; c.lineWidth = w + 2.6; c.stroke(); c.strokeStyle = back ? dark(col, 0.25) : col; c.lineWidth = w; c.stroke(); }
  function hero(c, x, y, s, o) {
    // o: {face, state:'idle'|'run'|'jump'|'fall'|'wall', t, col, squash, sword}
    const f = o.face || 1, t = o.t || 0, st = o.state || 'idle', col = o.col || '#ff5f7a';
    const run = st === 'run', jump = st === 'jump', fall = st === 'fall', air = jump || fall, wall = st === 'wall', idle = !run && !air && !wall;
    const sq = o.squash || 0, ph = t * 14;
    if (o.gy != null) { // sombra proyectada en el suelo: se encoge y aclara cuanto más alto está
      const d = Math.max(0, o.gy - y), k2 = Math.max(0.32, 1 - d / 160);
      c.save(); c.translate(x + d * 0.06, o.gy); shadow(c, 0, 0.5, 10.6 * s * k2 * (1 + sq), 0.3 * k2 * k2); c.restore();
    }
    c.save(); c.translate(x, y);
    if (o.gy == null && !air) shadow(c, 0, 0.5, (run ? 9 : 10.5) * s * (1 + sq), 0.24);
    c.scale(f * s * (1 + sq), s * (1 - sq)); c.lineJoin = 'round'; c.lineCap = 'round';
    const bob = run ? -Math.abs(Math.sin(ph)) * 2.4 + 0.8 : idle ? Math.sin(t * 3) * 0.7 : 0;
    const lean = run ? 0.14 : wall ? -0.06 : fall ? -0.05 : jump ? 0.05 : 0, hipY = -6.5 + bob;
    const colD = dark(col, 0.3), colL = lite(col, 0.32);
    // piernas (IK de dos segmentos, ciclo continuo de carrera)
    const legPose = (i) => { const p = ph + i * Math.PI, hx = i ? -1.8 : 1.8; let fx, fy;
      if (run) { fx = hx + Math.sin(p) * 6.5; fy = -Math.max(0, Math.cos(p)) * 4.5; }
      else if (jump) { fx = hx + (i ? -3.5 : 3); fy = i ? -2 : -5; }
      else if (fall) { fx = hx + (i ? -4 : 4.5) + Math.sin(t * 18 + i) * 0.8; fy = i ? -0.5 : -2.5; }
      else if (wall) { fx = hx + (i ? -2 : 3); fy = i ? 0 : -4; }
      else { fx = hx * 1.4; fy = 0; }
      const L = 7.2, d = Math.min(L - 0.01, Math.hypot(fx - hx, fy - hipY)), h = Math.sqrt(Math.max(0, L * L / 4 - d * d / 4));
      const kx = (hx + fx) / 2 + h * 0.95, ky = (hipY + fy) / 2;
      return { hx, fx, fy, kx, ky, lift: fy };
    };
    const drawLeg = (i) => { const L = legPose(i), back = i === 1; limb(c, [[L.hx, hipY], [L.kx, L.ky], [L.fx, L.fy - 2]], 3.8, PANTS, back);
      c.save(); c.translate(L.fx, L.fy - 1.2); c.rotate(run ? -L.lift * 0.06 : air ? (i ? 0.25 : -0.2) : 0); rr(c, -2.8, -2.2, 7.6, 4.2, 2); fillOut(c, back ? '#221b36' : '#3a3258', 1.7); c.fillStyle = alpha('#ffffff', 0.25); c.fillRect(-1.5, -1.8, 4, 1.1); c.restore(); };
    // bufanda: cadena de 7 segmentos con onda que viaja
    const scarf = () => { const cl = Math.cos(lean), sl = Math.sin(lean), nx = -1.5 * cl + 12.5 * sl, ny = hipY - 1.5 * sl - 12.5 * cl;
      const base = idle ? 2.55 : run ? 3.3 : jump ? 2.5 : fall ? 3.9 : 2.4, amp = idle ? 0.14 : 0.26, len = run || air ? 2.9 : 2.5, P = [[nx, ny]];
      for (let i = 1; i <= 7; i++) { const a = base + Math.sin(t * 13 - i * 0.9) * amp * (i / 7) * 2.2 + (idle ? Math.sin(t * 2 + i * 0.3) * 0.06 : 0); P.push([P[i - 1][0] + Math.cos(a) * len, P[i - 1][1] + Math.sin(a) * len]); }
      const Lft = [], Rgt = []; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[Math.min(P.length - 1, i + 1)], r0 = P[Math.max(0, i - 1)], dx = q[0] - r0[0], dy = q[1] - r0[1], d = Math.hypot(dx, dy) || 1, w = 2.7 - i * 0.16; Lft.push([p[0] - dy / d * w, p[1] + dx / d * w]); Rgt.push([p[0] + dy / d * w, p[1] - dx / d * w]); }
      const E = P[P.length - 1]; c.beginPath(); c.moveTo(Lft[0][0], Lft[0][1]); Lft.forEach((p) => c.lineTo(p[0], p[1])); c.lineTo(E[0] + (E[0] - P[5][0]) * 0.7, E[1] + (E[1] - P[5][1]) * 0.7 + 1.2); c.lineTo(E[0], E[1]); c.lineTo(E[0] + (E[0] - P[5][0]) * 0.5, E[1] + (E[1] - P[5][1]) * 0.5 - 1.6); for (let i = Rgt.length - 1; i >= 0; i--) c.lineTo(Rgt[i][0], Rgt[i][1]); c.closePath(); fillOut(c, col, 2);
      c.strokeStyle = alpha('#ffffff', 0.4); c.lineWidth = 1.1; c.beginPath(); c.moveTo(P[1][0], P[1][1] - 0.9); for (let i = 2; i < 6; i++) c.lineTo(P[i][0], P[i][1] - 0.9); c.stroke();
      c.strokeStyle = alpha(OUT, 0.26); c.lineWidth = 1.2; c.beginPath(); c.moveTo(P[1][0], P[1][1] + 1.2); for (let i = 2; i < 7; i++) c.lineTo(P[i][0], P[i][1] + 1.1); c.stroke(); };
    // brazos
    const arm = (i) => { const back = i === 1, sx = back ? -2.8 : 1.6, sy = -9.6; let a;
      if (run) a = (back ? 1 : -1) * Math.sin(ph) * 1.0 + 0.2; else if (jump) a = back ? 2.7 : 1.25; else if (fall) a = (back ? 2.4 : 1.7) + Math.sin(t * 20 + i * 2) * 0.3; else if (wall) a = back ? 0.5 : 1.75; else a = (back ? -0.1 : 0.3) + Math.sin(t * 3) * 0.06;
      const bend = run ? 0.9 : idle ? 0.35 : 0.3, ex = sx + Math.sin(a) * 4.4, ey = sy + Math.cos(a) * 4.4, hx = ex + Math.sin(a + bend) * 3.8, hy = ey + Math.cos(a + bend) * 3.8;
      limb(c, [[sx, sy], [ex, ey]], 3.3, col, back); limb(c, [[ex, ey], [hx, hy]], 2.8, back ? SKIND : SKIN, false); c.beginPath(); c.arc(hx, hy, 2, 0, TAU); fillOut(c, back ? SKIND : SKIN, 1.4); };
    // --- orden de dibujo: bufanda, brazo y pierna traseros, cuerpo, pierna delantera, cabeza, brazo delantero
    scarf();
    c.save(); c.translate(0, hipY); c.rotate(lean); arm(1); c.restore();
    drawLeg(1);
    c.save(); c.translate(0, hipY); c.rotate(lean);
    const br = idle ? 1 + Math.sin(t * 3) * 0.035 : 1; c.scale(1, br);
    // torso con degradado (luz arriba-izquierda), cinturón y pliegue
    rr(c, -7.6, -12.8, 15.2, 13.4, 5); const tg = c.createLinearGradient(-6, -13, 6, 1); tg.addColorStop(0, colL); tg.addColorStop(0.45, col); tg.addColorStop(1, colD); c.fillStyle = tg; c.fill(); c.lineWidth = 2.7; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = alpha('#ffffff', 0.35); rr(c, -5.6, -10.8, 2.6, 6.5, 1.3); c.fill();
    c.save(); rr(c, -7.6, -12.8, 15.2, 13.4, 5); c.clip(); // luz de borde arriba-izquierda y canto frío abajo-derecha
    c.strokeStyle = alpha('#ffffff', 0.5); c.lineWidth = 2; c.beginPath(); c.moveTo(-7.4, -5.5); c.quadraticCurveTo(-7.4, -12.6, -1.5, -12.6); c.stroke();
    c.strokeStyle = alpha('#5b8cff', 0.3); c.lineWidth = 2.6; c.beginPath(); c.moveTo(7.4, -6.5); c.quadraticCurveTo(7.4, 0.4, 2, 0.4); c.stroke(); c.restore();
    c.fillStyle = dark(col, 0.45); c.fillRect(-7, -2.6, 14, 2.2); c.fillStyle = '#ffd24a'; c.fillRect(1.2, -3, 3, 3); c.strokeStyle = alpha(OUT, 0.5); c.lineWidth = 1; c.strokeRect(1.2, -3, 3, 3);
    c.restore();
    drawLeg(0);
    // cabeza
    c.save(); c.translate(0, hipY); c.rotate(lean * 0.6); c.translate(0.4, -20.5 + (idle ? Math.sin(t * 3 - 0.6) * 0.35 : 0));
    const hg = c.createRadialGradient(-3, -4, 1, 0, 0, 12); hg.addColorStop(0, '#ffe9d2'); hg.addColorStop(0.6, SKIN); hg.addColorStop(1, SKIND);
    c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fillStyle = hg; c.fill();
    c.save(); c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.clip(); c.fillStyle = alpha('#8a6ad0', 0.18); c.beginPath(); c.arc(5, 5.2, 9.2, 0, TAU); c.fill();
    c.strokeStyle = alpha('#fff4e2', 0.75); c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, 9.1, Math.PI * 1.02, Math.PI * 1.46); c.stroke();
    c.strokeStyle = alpha('#7fa0ff', 0.35); c.lineWidth = 2.4; c.beginPath(); c.arc(0, 0, 9, 0.2, 1.2); c.stroke(); c.restore();
    c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.lineWidth = 2.8; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.arc(-4.2, 1.2, 2.3, 0, TAU); fillOut(c, SKIN, 1.3); c.fillStyle = alpha('#d98a6a', 0.6); c.beginPath(); c.arc(-4.2, 1.3, 1, 0, TAU); c.fill();
    // pelo con flequillo, brillo y mechón animado
    const tuft = air ? (jump ? 2.5 : -2) : Math.sin(t * (run ? 14 : 3)) * (run ? 1.2 : 0.5);
    c.beginPath(); c.moveTo(-10.6, 2.5); c.arc(0, -1, 10.9, Math.PI * 0.94, Math.PI * 1.9); c.lineTo(10.4, -1.5); c.lineTo(7.6, -3.2); c.lineTo(6.2, -0.6); c.lineTo(4, -4.2); c.lineTo(1.8, -1.2); c.lineTo(-0.8, -4.6); c.lineTo(-2.8, -2.2); c.lineTo(-5.4, -2.5); c.lineTo(-6.6, 3); c.closePath();
    const hairG = c.createLinearGradient(-6, -12, 6, 2); hairG.addColorStop(0, lite(HAIR, 0.22)); hairG.addColorStop(1, dark(HAIR, 0.2)); c.fillStyle = hairG; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(-3, -10.5); c.quadraticCurveTo(-7 + tuft, -15.5, -9.5 + tuft * 1.5, -14); c.quadraticCurveTo(-7, -12, -6.5, -9.5); fillOut(c, HAIR, 2);
    c.strokeStyle = alpha('#ffffff', 0.45); c.lineWidth = 1.7; c.beginPath(); c.arc(-1, -2, 7.6, Math.PI * 1.22, Math.PI * 1.52); c.stroke();
    c.strokeStyle = alpha('#b9a7e8', 0.5); c.lineWidth = 0.9; c.beginPath(); c.moveTo(-6.4, -7.2); c.quadraticCurveTo(-4.4, -10.2, -0.8, -11); c.moveTo(1.6, -10.4); c.quadraticCurveTo(4.4, -10, 6.2, -8); c.stroke();
    // ojos con brillo especular, parpadeo y expresiones
    const bc = t % 3.6, blink = bc < 0.11 || (bc > 0.28 && bc < 0.36 && Math.floor(t / 3.6) % 3 === 0);
    const eye = (ex, rx, ry) => { if (blink && !fall) { c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ex - rx - 0.3, 1); c.quadraticCurveTo(ex, 2, ex + rx + 0.3, 1); c.stroke(); return; }
      c.fillStyle = OUT; c.beginPath(); c.ellipse(ex, 0.8, rx, ry, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + rx * 0.35, 0.8 - ry * 0.45, rx * 0.45, 0, TAU); c.fill(); c.fillStyle = alpha('#9fe8ff', 0.8); c.beginPath(); c.arc(ex - rx * 0.3, 0.8 + ry * 0.5, rx * 0.25, 0, TAU); c.fill(); };
    const big = fall ? 1.2 : 1; eye(4.4, 1.9 * big, 2.7 * big); eye(-0.4, 1.6 * big, 2.5 * big);
    c.strokeStyle = OUT; c.lineWidth = 1.4;
    if (fall) { c.beginPath(); c.moveTo(3, -3.6); c.lineTo(6, -4.4); c.moveTo(-1.8, -4.2); c.lineTo(0.8, -3.4); c.stroke(); }
    else if (wall || o.sword && run) { c.beginPath(); c.moveTo(3, -3.6); c.lineTo(6, -2.8); c.moveTo(-1.8, -2.8); c.lineTo(0.8, -3.6); c.stroke(); }
    else if (jump) { c.beginPath(); c.moveTo(3, -3.4); c.quadraticCurveTo(4.6, -4.4, 6, -3.6); c.stroke(); }
    c.fillStyle = alpha('#ff7a8a', 0.55); c.beginPath(); c.ellipse(6.4, 4.2, 2.1, 1.3, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(-2.8, 4.4, 1.5, 1.1, 0, 0, TAU); c.fill();
    if (jump || fall) { c.fillStyle = OUT; c.beginPath(); c.ellipse(3.2, 5.6, 1.3, fall ? 1.9 : 1.5, 0, 0, TAU); c.fill(); }
    else if (run) { c.beginPath(); c.moveTo(1, 4.4); c.quadraticCurveTo(3.2, 7.8, 5.6, 4.2); c.closePath(); c.fillStyle = OUT; c.fill(); c.fillStyle = '#ff7a8a'; c.beginPath(); c.arc(3.3, 5.9, 1, 0, TAU); c.fill(); }
    else if (wall) { c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(1.4, 5.2); c.lineTo(5.2, 4.6); c.stroke(); }
    else { c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.arc(3.2, 3.6, 2, 0.35, Math.PI - 0.5); c.stroke(); }
    c.restore();
    // brazo delantero y espada
    c.save(); c.translate(0, hipY); c.rotate(lean); arm(0); c.restore();
    if (o.sword) { c.save(); c.translate(8, -12 + bob); c.rotate(o.sword);
      c.beginPath(); c.moveTo(-1.4, -3); c.lineTo(-1.4, -21); c.lineTo(1, -25); c.lineTo(3.4, -21); c.lineTo(3.4, -3); c.closePath(); const sg = c.createLinearGradient(-1.4, 0, 3.4, 0); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.5, '#dfe7f4'); sg.addColorStop(0.51, '#aebbd0'); sg.addColorStop(1, '#c9d3e4'); c.fillStyle = sg; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = alpha('#ffffff', 0.9); c.lineWidth = 0.8; c.beginPath(); c.moveTo(-0.3, -5); c.lineTo(-0.3, -19); c.stroke();
      rr(c, -4.2, -3.6, 11.4, 3.8, 1.6); fillOut(c, '#f2d15c', 1.5); rr(c, -0.2, 0, 3.2, 5, 1.2); fillOut(c, '#7a4a2a', 1.3); c.beginPath(); c.arc(1.4, 6, 1.6, 0, TAU); fillOut(c, '#f2d15c', 1.2); c.restore(); }
    c.restore();
  }

  /* ------------------------------------------------ Enemigos */
  function eye2(c, x, y, r, lx, ly, shut) { // esclerótica + pupila que mira + brillo
    if (shut) { c.strokeStyle = OUT; c.lineWidth = Math.max(1.1, r * 0.5); c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x, y + r * 0.6, x + r, y); c.stroke(); return; }
    c.beginPath(); c.ellipse(x, y, r, r * 1.12, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = Math.max(1, r * 0.38); c.strokeStyle = OUT; c.stroke();
    const px = x + lx * r * 0.42, py = y + ly * r * 0.4; c.fillStyle = OUT; c.beginPath(); c.arc(px, py, r * 0.56, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(px + r * 0.2, py - r * 0.25, r * 0.2, 0, TAU); c.fill();
  }
  function enemy(c, kind, x, y, w, h, o) {
    const t = o.t || 0, f = o.face || 1; c.save(); c.translate(x + w / 2, y + h); c.lineJoin = 'round'; c.lineCap = 'round';
    const lx = 0.7 + Math.sin(t * 1.7) * 0.3, ly = Math.sin(t * 1.1) * 0.35, shut = (t % 4.1) < 0.12, m = Math.min(w, h);
    const th = curTh || {};
    if (kind === 'slime') {
      const col = o.col || (th.enemy === 'slime' && th.foe) || '#8be04a', sq = Math.sin(t * 8) * 0.12;
      shadow(c, 0, 0, w * 0.5 * (1 + sq), 0.22); c.scale(f * (1 + sq), 1 - sq);
      const body = () => { c.beginPath(); c.moveTo(-w / 2, 0); c.bezierCurveTo(-w / 2, -h * 1.2, w / 2, -h * 1.2, w / 2, 0); c.quadraticCurveTo(0, 1.5, -w / 2, 0); c.closePath(); };
      body(); const g = c.createRadialGradient(-w * 0.18 * f, -h * 0.72, 1, 0, -h * 0.4, w * 0.75); g.addColorStop(0, lite(col, 0.45)); g.addColorStop(0.45, col); g.addColorStop(1, dark(col, 0.28)); c.fillStyle = g; c.fill();
      c.save(); body(); c.clip(); c.fillStyle = alpha(dark(col, 0.3), 0.55); c.beginPath(); c.ellipse(0, 1, w * 0.6, h * 0.24, 0, 0, TAU); c.fill(); c.fillStyle = alpha(lite(col, 0.5), 0.5); c.beginPath(); c.arc(w * 0.12, -h * 0.25, m * 0.07, 0, TAU); c.arc(-w * 0.28, -h * 0.18, m * 0.05, 0, TAU); c.fill(); c.restore();
      c.save(); body(); c.clip(); c.strokeStyle = alpha('#ffffff', 0.5); c.lineWidth = 2.4; body(); c.stroke();
      c.strokeStyle = alpha('#5b8cff', 0.28); c.lineWidth = 3; c.beginPath(); c.arc(w * 0.26, -h * 0.42, w * 0.42, -0.4, 1.5); c.stroke(); c.restore();
      body(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = alpha('#ffffff', 0.8); c.beginPath(); c.ellipse(-w * 0.22 * f, -h * 0.7, m * 0.1, m * 0.17, -0.5 * f, 0, TAU); c.fill(); c.beginPath(); c.arc(-w * 0.08 * f, -h * 0.84, m * 0.045, 0, TAU); c.fill();
      const r = m * 0.12 + 0.3; eye2(c, w * 0.02, -h * 0.5, r, lx, ly, shut); eye2(c, w * 0.26, -h * 0.5, r * 0.92, lx, ly, shut);
      c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.arc(w * 0.14, -h * 0.28, m * 0.1, 0.25, Math.PI - 0.25); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(w * 0.1, -h * 0.22); c.lineTo(w * 0.13, -h * 0.13); c.lineTo(w * 0.16, -h * 0.21); c.fill();
    } else if (kind === 'ghost') {
      const col = o.col || (th.enemy === 'ghost' && th.foe) || '#b98cff', bob = Math.sin(t * 4) * 3;
      shadow(c, 0, 0, w * 0.34 * (1 - bob * 0.05), 0.12); c.translate(0, bob - 4); c.scale(f, 1);
      const body = () => { c.beginPath(); c.arc(0, -h * 0.55, w / 2, Math.PI, 0); c.lineTo(w / 2, -2); for (let i = 1; i <= 8; i++) { const px = w / 2 - i * w / 8, py = -2 + (i % 2 ? 4.5 : -0.5) + Math.sin(t * 7 + i * 1.3) * 1.5; c.lineTo(px, py); } c.closePath(); };
      body(); const g = c.createLinearGradient(-w / 2, -h, w / 2, 0); g.addColorStop(0, lite(col, 0.45)); g.addColorStop(0.5, col); g.addColorStop(1, dark(col, 0.22)); c.fillStyle = g; c.fill();
      c.save(); body(); c.clip(); c.fillStyle = alpha(OUT, 0.16); c.beginPath(); c.ellipse(w * 0.42 * f, -h * 0.3, w * 0.35, h * 0.7, 0, 0, TAU); c.fill(); c.restore();
      body(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
      const wave = Math.sin(t * 5) * 2.5; [-1, 1].forEach((sd) => { c.beginPath(); c.ellipse(sd * w * 0.5, -h * 0.34 + (sd > 0 ? wave : -wave) * 0.6, 3, 4.2, sd * 0.6, 0, TAU); fillOut(c, sd > 0 ? col : dark(col, 0.1), 1.8); });
      c.fillStyle = alpha('#ffffff', 0.7); c.beginPath(); c.ellipse(-w * 0.22 * f, -h * 0.78, 2.2, 3.4, -0.6 * f, 0, TAU); c.fill();
      const r = m * 0.11 + 0.4; eye2(c, w * 0.02, -h * 0.56, r, lx, ly, shut); eye2(c, w * 0.26, -h * 0.56, r, lx, ly, shut);
      const mo = 1.6 + Math.abs(Math.sin(t * 3)) * 1.4; c.beginPath(); c.ellipse(w * 0.15, -h * 0.3, 1.8, mo, 0, 0, TAU); fillOut(c, '#3a1a4a', 1.2);
      c.fillStyle = alpha('#ff7ab8', 0.5); c.beginPath(); c.ellipse(w * 0.36, -h * 0.4, 2, 1.2, 0, 0, TAU); c.fill();
    } else if (kind === 'knight') {
      const plume = o.col || (th.enemy === 'knight' && th.foe) || '#ff5f5f', step = Math.sin(t * 8), M0 = '#e1e7f2', M1 = '#9aa3b5', M2 = '#5d6680';
      shadow(c, 0, 0, w * 0.5, 0.25); c.scale(f, 1);
      const metal = (y0, y1) => { const g = c.createLinearGradient(-w / 2, y0, w / 2, y1); g.addColorStop(0, M0); g.addColorStop(0.45, M1); g.addColorStop(1, M2); return g; };
      [[-w * 0.22, step], [w * 0.18, -step]].forEach(([fx, s], i) => { rr(c, fx - 3.5 + s * 1.2, -5 - Math.max(0, s) * 1.5, 7, 5, 2); fillOut(c, i ? '#3a3258' : '#2a2342', 1.8); });
      const bob = Math.abs(step) * -1; c.translate(0, bob);
      rr(c, -w / 2 + 1, -h * 0.58, w - 2, h * 0.5, 4); c.fillStyle = metal(-h * 0.6, 0); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = alpha(OUT, 0.5); c.fillRect(-w / 2 + 2, -h * 0.2, w - 4, 2); c.fillStyle = '#f2d15c'; c.fillRect(-1.5, -h * 0.21, 3, 2.4);
      // casco con visera y ojos brillantes
      c.beginPath(); c.moveTo(-w / 2 + 1, -h * 0.5); c.lineTo(-w / 2 + 1, -h * 0.78); c.quadraticCurveTo(-w / 2 + 1, -h, 0, -h); c.quadraticCurveTo(w / 2 - 1, -h, w / 2 - 1, -h * 0.78); c.lineTo(w / 2 - 1, -h * 0.5); c.closePath(); c.fillStyle = metal(-h, -h * 0.5); c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = alpha('#ffffff', 0.55); c.beginPath(); c.ellipse(-w * 0.2, -h * 0.86, 2, 1.2, -0.4, 0, TAU); c.fill();
      rr(c, -w / 2 + 3, -h * 0.76, w - 6, 4.4, 2); c.fillStyle = OUT; c.fill();
      const gx = w * 0.12 + lx * 1.2; c.fillStyle = alpha('#ffd400', 0.35); c.fillRect(gx - 5, -h * 0.76, 10, 4.4); c.fillStyle = shut ? '#7a6a20' : '#ffe14a'; c.fillRect(gx - 3.2, -h * 0.76 + 1.4, 2.2, 1.6); c.fillRect(gx + 1.2, -h * 0.76 + 1.4, 2.2, 1.6);
      c.strokeStyle = alpha(OUT, 0.5); c.lineWidth = 1; c.beginPath(); c.moveTo(0, -h + 1); c.lineTo(0, -h * 0.78); c.stroke();
      const sw = Math.sin(t * 5) * 2; c.beginPath(); c.moveTo(-2, -h + 0.5); c.quadraticCurveTo(-3 + sw * 0.3, -h - 10, -12 + sw, -h - 5); c.quadraticCurveTo(-8 + sw, -h - 2.5, -4, -h - 2); c.quadraticCurveTo(-9 + sw, -h + 1, -12 + sw * 0.8, -h + 1); c.quadraticCurveTo(-5, -h - 1, 2.5, -h + 0.5); fillOut(c, plume, 2); c.strokeStyle = alpha('#ffffff', 0.45); c.lineWidth = 1; c.beginPath(); c.moveTo(-2, -h - 2); c.quadraticCurveTo(-5, -h - 7, -9 + sw, -h - 5); c.stroke();
      if (w >= 18) { c.save(); c.translate(w * 0.42, -h * 0.34); rr(c, -4, -6, 8.5, 11, 3); const sg = c.createLinearGradient(-4, -6, 4, 5); sg.addColorStop(0, '#e05a6a'); sg.addColorStop(1, '#8e2a3e'); c.fillStyle = sg; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); c.fillStyle = '#ffd24a'; c.fillRect(-0.8, -4, 1.8, 7.5); c.fillRect(-2.8, -1.4, 5.8, 1.8); c.restore(); }
    } else if (kind === 'robot') {
      const eyeC = o.col || '#5ce1e6', M0 = '#f0f4f8', M1 = '#c7d0da', M2 = '#7f8b9b';
      shadow(c, 0, 0, w * 0.4, 0.25); c.scale(f, 1);
      const bob = Math.sin(t * 10) * 0.6;
      c.beginPath(); c.arc(0, -5, 5, 0, TAU); const wg = c.createRadialGradient(-1.5, -6.5, 0.5, 0, -5, 5); wg.addColorStop(0, '#7a7a8a'); wg.addColorStop(1, '#34303f'); c.fillStyle = wg; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
      c.save(); c.translate(0, -5); c.rotate(t * 8); c.strokeStyle = '#c7d0da'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3, 0); c.lineTo(3, 0); c.moveTo(0, -3); c.lineTo(0, 3); c.stroke(); c.restore();
      c.translate(0, bob);
      [-1, 1].forEach((sd) => { rr(c, sd * (w / 2 + 0.5) - 2, -h * 0.55 + Math.sin(t * 6 + sd) * 1.5, 4, 7, 2); fillOut(c, M2, 1.6); });
      rr(c, -w / 2, -h + 2, w, h - 8, 5); const bg = c.createLinearGradient(-w / 2, -h, w / 2, -6); bg.addColorStop(0, M0); bg.addColorStop(0.5, M1); bg.addColorStop(1, M2); c.fillStyle = bg; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = alpha('#ffffff', 0.7); c.fillRect(-w / 2 + 2.5, -h + 4.5, 2, h - 15);
      rr(c, -w / 2 + 4, -h + 6, w - 8, 8, 3); c.fillStyle = OUT; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#3b4a5a'; c.stroke();
      const ex = w * 0.08 + Math.sin(t * 2) * (w / 2 - 9) * 0.6; c.fillStyle = alpha(eyeC, 0.35); c.fillRect(Math.max(-w / 2 + 4, ex - 5), -h + 7, 10, 6); c.fillStyle = shut ? alpha(eyeC, 0.5) : eyeC; rr(c, ex - 2.5, -h + 8, 5, shut ? 1.5 : 4, 1.2); c.fill(); c.fillStyle = '#fff'; c.fillRect(ex - 1.5, -h + 8.5, 1.2, 1.2);
      c.fillStyle = alpha(OUT, 0.55); for (let i = -1; i <= 1; i++) c.fillRect(i * 3.5 - 1, -h + 16, 2, 3);
      c.fillStyle = M2; [[-w / 2 + 3, -8.5], [w / 2 - 3, -8.5]].forEach(([a, b]) => { c.beginPath(); c.arc(a, b, 1.1, 0, TAU); c.fill(); });
      c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -h + 2); c.lineTo(0, -h - 5); c.stroke();
      const on = Math.sin(t * 6) > 0; if (on) { c.fillStyle = alpha('#ff3b3b', 0.3); c.beginPath(); c.arc(0, -h - 7, 6, 0, TAU); c.fill(); }
      c.beginPath(); c.arc(0, -h - 7, 3, 0, TAU); fillOut(c, on ? '#ff3b3b' : '#9a4a5a', 1.6); c.fillStyle = alpha('#ffffff', 0.7); c.fillRect(-1.2, -h - 8.6, 1.2, 1.2);
    } else if (kind === 'bird') {
      const col = o.col || (th.enemy === 'bird' && th.foe) || '#ff9a3d', fl = Math.sin(t * 14), cy = -h / 2, rx = w / 2, ry = h / 2.6;
      c.scale(f, 1);
      c.beginPath(); c.moveTo(-rx + 2, cy); c.lineTo(-rx - 7, cy - 5 + fl); c.lineTo(-rx - 5, cy + 1); c.lineTo(-rx - 8, cy + 4 + fl); c.closePath(); fillOut(c, dark(col, 0.2), 2);
      c.beginPath(); c.ellipse(0, cy, rx, ry, 0, 0, TAU); const g = c.createRadialGradient(-rx * 0.3, cy - ry * 0.5, 1, 0, cy, rx * 1.1); g.addColorStop(0, lite(col, 0.4)); g.addColorStop(0.5, col); g.addColorStop(1, dark(col, 0.25)); c.fillStyle = g; c.fill();
      c.save(); c.clip(); c.fillStyle = lite(col, 0.55); c.beginPath(); c.ellipse(rx * 0.25, cy + ry * 0.6, rx * 0.6, ry * 0.6, 0, 0, TAU); c.fill(); c.restore();
      c.beginPath(); c.ellipse(0, cy, rx, ry, 0, 0, TAU); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
      c.beginPath(); c.moveTo(rx * 0.1, cy - ry + 1); c.quadraticCurveTo(rx * 0.05, cy - ry - 6, -rx * 0.25, cy - ry - 5); c.quadraticCurveTo(-rx * 0.05, cy - ry - 2, -rx * 0.2, cy - ry + 0.5); fillOut(c, dark(col, 0.15), 1.6);
      const bo = Math.sin(t * 3) > 0.85 ? 1.6 : 0.4; c.beginPath(); c.moveTo(rx - 1.5, cy - 2.5); c.lineTo(rx + 6.5, cy - 0.5 - bo * 0.3); c.lineTo(rx - 1, cy); c.closePath(); fillOut(c, '#ffd400', 1.5); c.beginPath(); c.moveTo(rx - 1, cy + 0.4 + bo * 0.3); c.lineTo(rx + 5, cy + 1 + bo); c.lineTo(rx - 1.5, cy + 2.8); c.closePath(); fillOut(c, '#f0a800', 1.5);
      eye2(c, rx * 0.42, cy - 2.6, m * 0.13 + 0.4, 0.8, ly * 0.5, shut); c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(rx * 0.15, cy - 6.5); c.lineTo(rx * 0.62, cy - 5.2); c.stroke();
      c.save(); c.translate(-rx * 0.05, cy - 1.5); c.rotate(-0.25 - fl * 0.75); c.beginPath(); c.moveTo(2, 0); c.quadraticCurveTo(-3, -7.5, -13, -5); c.lineTo(-10.5, -2.6); c.lineTo(-12.5, -1.2); c.lineTo(-9, 0.4); c.quadraticCurveTo(-4, 3.2, 2, 0); c.closePath(); const wg = c.createLinearGradient(0, -7, 0, 3); wg.addColorStop(0, lite(col, 0.4)); wg.addColorStop(1, dark(col, 0.1)); c.fillStyle = wg; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); c.restore();
    }
    c.restore();
  }
  function eyes(c, x, y, r) { eye2(c, x - r * 1.6, y, r * 1.3, 0.6, 0, false); eye2(c, x + r * 1.6, y, r * 1.3, 0.6, 0, false); }

  /* ------------------------------------------------ Objetos */
  function coinSprite(r, back, res) {
    const key = 'coin' + r + back + res; if (cache[key]) return cache[key];
    const S = (r + 3) * 2, cv = mk(S * res, S * res), g = cv.getContext('2d'); g.scale(res, res); g.translate(S / 2, S / 2);
    g.beginPath(); g.arc(0, 0, r, 0, TAU);
    if (back) { g.fillStyle = '#c07600'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); return (cache[key] = cv); }
    const gr = g.createRadialGradient(-r * 0.35, -r * 0.45, 0.5, 0, 0, r * 1.25); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.35, '#ffd23f'); gr.addColorStop(1, '#e89200'); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.64, 0, TAU); g.fillStyle = '#ffc21a'; g.fill(); g.lineWidth = Math.max(1, r * 0.14); g.strokeStyle = '#d98a00'; g.stroke();
    g.beginPath(); g.arc(0.4, 0.4, r * 0.64, Math.PI * 1.1, Math.PI * 1.6); g.strokeStyle = alpha('#fff7c8', 0.9); g.lineWidth = Math.max(0.8, r * 0.1); g.stroke();
    rr(g, -r * 0.12, -r * 0.4, r * 0.26, r * 0.8, r * 0.12); g.fillStyle = '#fff3a8'; g.fill(); g.fillStyle = '#d98a00'; g.fillRect(r * 0.08, -r * 0.3, r * 0.08, r * 0.66);
    g.beginPath(); g.arc(0, 0, r * 0.82, Math.PI * 1.05, Math.PI * 1.42); g.strokeStyle = alpha('#ffffff', 0.85); g.lineWidth = Math.max(1, r * 0.16); g.stroke();
    return (cache[key] = cv);
  }
  function coin(c, x, y, t, r) {
    r = r || 8; const rk = Math.round(r * 2) / 2, cs = Math.cos(t * 4 + x * 0.05), sx = 0.34 + 0.66 * Math.abs(cs), S = (rk + 3) * 2;
    let res = cache['coinres' + rk]; if (!res) res = cache['coinres' + rk] = resOf(c, 2, 4);
    c.save(); c.translate(x, y + Math.sin(t * 3 + x) * 2);
    if (sx < 0.97) c.drawImage(coinSprite(rk, true, res), -S / 2 * sx + (1 - sx) * r * 0.35 * (cs > 0 ? 1 : -1), -S / 2, S * sx, S);
    c.drawImage(coinSprite(rk, false, res), -S / 2 * sx, -S / 2, S * sx, S);
    const gp = (t * 0.9 + x * 0.013) % 2.4; if (gp < 0.35) glint(c, r * 0.5, -r * 0.55, Math.sin(gp / 0.35 * Math.PI) * r * 0.55);
    c.restore();
  }
  function flag(c, x, y, t, col, h) {
    h = h || 96; col = col || '#7cf7a0'; c.save(); c.lineJoin = 'round';
    shadow(c, x, y, 9, 0.2);
    rr(c, x - 6, y - 5, 12, 6, 2); fillOut(c, '#8a86a5', 1.8);
    rr(c, x - 2.5, y - h, 5, h - 3, 2); const pg = c.createLinearGradient(x - 2.5, 0, x + 2.5, 0); pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#a9adc4'); c.fillStyle = pg; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.arc(x, y - h - 4, 5, 0, TAU); const bg = c.createRadialGradient(x - 1.8, y - h - 6, 0.5, x, y - h - 4, 5.5); bg.addColorStop(0, '#fff6c0'); bg.addColorStop(1, '#e8a200'); c.fillStyle = bg; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    const fh = Math.min(24, h * 0.3), N = 8, seg = 5, wv = (i) => Math.sin(t * 6 - i * 0.7) * 3 * (i / N + 0.2);
    const cloth = () => { c.beginPath(); c.moveTo(x + 2, y - h + 2); for (let i = 0; i <= N; i++) c.lineTo(x + 2 + i * seg, y - h + 2 + wv(i)); for (let i = N; i >= 0; i--) c.lineTo(x + 2 + i * seg, y - h + 2 + fh + wv(i)); c.closePath(); };
    cloth(); c.fillStyle = col; c.fill();
    c.save(); cloth(); c.clip();
    for (let i = 0; i < N; i++) { const d = Math.cos(t * 6 - (i + 0.5) * 0.7); c.fillStyle = d > 0 ? alpha('#ffffff', 0.22 * d) : alpha(OUT, -0.22 * d); c.fillRect(x + 2 + i * seg, y - h - 6, seg + 0.5, fh + 14); }
    c.fillStyle = alpha(OUT, 0.18); c.fillRect(x + 2, y - h + 2 + fh * 0.72 - 6, N * seg, fh);
    const mx = x + 2 + N * seg * 0.45, my = y - h + 2 + fh / 2 + wv(N * 0.45); c.fillStyle = alpha('#ffffff', 0.85); c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr_ = i % 2 ? fh * 0.12 : fh * 0.28; c.lineTo(mx + Math.cos(a) * rr_, my + Math.sin(a) * rr_); } c.fill();
    c.restore();
    cloth(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); c.restore();
  }
  function anchor(c, x, y, t) {
    let gl = cache.anchorGlow; if (!gl) { gl = cache.anchorGlow = mk(64, 64); const g = gl.getContext('2d'), rg = g.createRadialGradient(32, 32, 4, 32, 32, 32); rg.addColorStop(0, 'rgba(255,214,80,.8)'); rg.addColorStop(1, 'rgba(255,214,80,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    c.save(); c.globalAlpha = 0.45 + Math.sin(t * 4) * 0.2; const R = 18 + Math.sin(t * 4) * 2; c.drawImage(gl, x - R, y - R, R * 2, R * 2); c.globalAlpha = 1;
    c.beginPath(); c.arc(x, y, 9, 0, TAU); c.lineWidth = 5.5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 3; const mg = c.createLinearGradient(x - 9, y - 9, x + 9, y + 9); mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.5, '#c9d0de'); mg.addColorStop(1, '#8a93aa'); c.strokeStyle = mg; c.stroke();
    c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fillStyle = '#ffc928'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); glint(c, x - 5, y - 6, 2.2 + Math.sin(t * 5) * 0.8);
    c.restore();
  }
  function heart(c, x, y, s, full) {
    c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round';
    const P = () => { c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(-9, -3, -5, -10, 0, -5); c.bezierCurveTo(5, -10, 9, -3, 0, 4); };
    P();
    if (full) { const g = c.createLinearGradient(-5, -8, 4, 4); g.addColorStop(0, '#ff8a9e'); g.addColorStop(0.5, '#ff4d6d'); g.addColorStop(1, '#c9264a'); c.fillStyle = g; c.fill(); c.lineWidth = 1.8; c.strokeStyle = OUT; c.stroke(); c.fillStyle = alpha('#ffffff', 0.85); c.beginPath(); c.ellipse(-3.4, -4.4, 1.6, 1, -0.6, 0, TAU); c.fill(); }
    else { c.fillStyle = 'rgba(255,255,255,.18)'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = OUT; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.8; P(); c.stroke(); }
    c.restore();
  }
  /* Decorado (cacheado por tema, clase y variante) */
  function decoSprite(c, th, k, v) {
    const near = th.leaf || th.near || '#4fa860', key = 'deco' + k + v + near + (th.top || '') + (th.groundD || ''); if (cache[key]) return cache[key];
    const res = resOf(c, 2, 3), cv = mk(100 * res, 90 * res), g = cv.getContext('2d'); g.scale(res, res); g.translate(50, 84); g.lineJoin = 'round'; g.lineCap = 'round';
    shadow(g, 0, 0, k === 'palm' ? 12 : 14, 0.2);
    if (k === 'tree') { const s = [1, 1.12, 0.9][v], B = v === 1 ? [[0, -46, 13], [-10, -34, 11], [10, -34, 11], [0, -30, 12]] : v === 2 ? [[-10, -32, 12], [10, -32, 12], [0, -40, 14], [-17, -24, 8], [17, -24, 8]] : [[0, -40, 18], [-12, -30, 12], [12, -30, 12]];
      rr(g, -4, -28 * s, 8, 28 * s, 3); const tg = g.createLinearGradient(-4, 0, 4, 0); tg.addColorStop(0, '#9a6538'); tg.addColorStop(1, '#5e3a20'); g.fillStyle = tg; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
      g.strokeStyle = OUT; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -16 * s); g.lineTo(6, -22 * s); g.stroke(); g.strokeStyle = '#7a4a2a'; g.lineWidth = 1.2; g.stroke();
      const blobs = (e) => { g.beginPath(); B.forEach(([bx, by, r]) => { g.moveTo(bx + r + e, by); g.arc(bx, by, r + e, 0, TAU); }); };
      const leaf = dark(near, 0.2);
      blobs(2.6); g.fillStyle = OUT; g.fill(); blobs(0); g.fillStyle = leaf; g.fill();
      g.save(); blobs(0); g.clip(); g.fillStyle = alpha(OUT, 0.26); B.forEach(([bx, by, r]) => { g.beginPath(); g.arc(bx + r * 0.35, by + r * 0.4, r * 0.85, 0, TAU); g.fill(); });
      g.fillStyle = lite(leaf, 0.3); B.forEach(([bx, by, r]) => { g.beginPath(); g.arc(bx - r * 0.3, by - r * 0.35, r * 0.5, 0, TAU); g.fill(); }); g.fillStyle = alpha('#ffffff', 0.4); B.forEach(([bx, by, r]) => { g.beginPath(); g.arc(bx - r * 0.42, by - r * 0.5, r * 0.18, 0, TAU); g.fill(); });
      g.strokeStyle = alpha('#ffffff', 0.34); g.lineWidth = 2.2; blobs(-1.2); g.stroke(); // luz de borde
      g.strokeStyle = alpha('#5b8cff', 0.2); g.lineWidth = 2.6; g.beginPath(); g.arc(8, -26, 20, -0.5, 1.4); g.stroke();
      if (v === 0) { g.fillStyle = '#ff5f7a'; [[-8, -36], [8, -26], [2, -46]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 2.2, 0, TAU); g.fill(); }); }
      g.restore();
    } else if (k === 'pine') { const snow = th.top === '#ffffff', n = [3, 4, 3][v], sc = [1, 1.08, 0.85][v];
      rr(g, -3, -14, 6, 14, 2); fillOut(g, '#5a3a22', 2);
      const tier = (i, e) => { const ty = (-52 + i * (36 / n) * 1.05) * sc, hw = (9 + i * (8 / (n - 1)) * 1.1) * sc + e, by = ty + 22 * sc; g.moveTo(0, ty - e * 1.2); g.lineTo(hw, by + e * 0.5); g.quadraticCurveTo(0, by + 4, -hw, by + e * 0.5); g.closePath(); };
      g.beginPath(); for (let i = 0; i < n; i++) tier(i, 2.4); g.fillStyle = OUT; g.fill();
      for (let i = 0; i < n; i++) { g.beginPath(); tier(i, 0); g.fillStyle = near; g.fill(); g.save(); g.clip(); g.fillStyle = alpha(OUT, 0.22); g.fillRect(0, -80, 40, 90); g.fillStyle = alpha(lite(near, 0.4), 0.5); g.fillRect(-40, -80, 40, 90);
        if (snow) { const ty = (-52 + i * (36 / n) * 1.05) * sc; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, ty - 1); g.lineTo(9 * sc, ty + 8 * sc); g.quadraticCurveTo(4, ty + 11 * sc, 0, ty + 8 * sc); g.quadraticCurveTo(-4, ty + 11 * sc, -9 * sc, ty + 8 * sc); g.fill(); }
        g.restore(); g.strokeStyle = alpha(OUT, 0.5); g.lineWidth = 1; g.beginPath(); tier(i, 0); g.stroke(); }
    } else if (k === 'palm') { const lean = [0, 5, -4][v], leaf = th.top || '#3cc96a';
      g.beginPath(); g.moveTo(-3, 0); g.quadraticCurveTo(6 + lean, -30, 2 + lean, -50); g.lineTo(7 + lean, -50); g.quadraticCurveTo(11 + lean, -30, 4, 0); g.closePath(); const tg = g.createLinearGradient(-3, 0, 8, 0); tg.addColorStop(0, '#b07a3f'); tg.addColorStop(1, '#6e4520'); g.fillStyle = tg; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
      g.strokeStyle = alpha(OUT, 0.45); g.lineWidth = 1.2; for (let i = 1; i < 7; i++) { const yy = -i * 7, xx = (6 + lean) * (i / 7) * 0.9; g.beginPath(); g.moveTo(xx - 3, yy); g.lineTo(xx + 4.5, yy - 1.5); g.stroke(); }
      const X = 4.5 + lean, Y = -50;
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.62, L = i === 0 || i === 5 ? 24 : 28, tx = X + Math.cos(a) * L, ty = Y + Math.sin(a) * L + 10, mx = X + Math.cos(a) * L * 0.5, my = Y + Math.sin(a) * L * 0.5 - 6;
        g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(mx - Math.sin(a) * 5, my + Math.cos(a) * 5 - 2, tx, ty); g.quadraticCurveTo(mx + Math.sin(a) * 3, my - Math.cos(a) * 3 + 3, X, Y); g.fillStyle = i < 3 ? lite(leaf, 0.12) : dark(leaf, 0.12); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
        g.strokeStyle = alpha(dark(leaf, 0.4), 0.8); g.lineWidth = 1; g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(mx, my, tx, ty); g.stroke(); }
      [[-1, 2], [3, 4], [7, 1.5]].forEach(([a, b]) => { g.beginPath(); g.arc(X + a - 2, Y + b + 1, 2.6, 0, TAU); fillOut(g, '#7a4a22', 1.4); });
    } else if (k === 'tower') { const gd = th.groundD || '#55566b', st = lite(gd, 0.1);
      rr(g, -11, -42, 22, 42, 2); const tg = g.createLinearGradient(-11, 0, 11, 0); tg.addColorStop(0, lite(st, 0.15)); tg.addColorStop(1, dark(st, 0.2)); g.fillStyle = tg; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
      for (let i = 0; i < 3; i++) { rr(g, -13 + i * 9.5, -48, 7, 7, 1); fillOut(g, st, 2); }
      g.strokeStyle = alpha(OUT, 0.35); g.lineWidth = 1; for (let r = 1; r < 6; r++) { g.beginPath(); g.moveTo(-10, -42 + r * 7); g.lineTo(10, -42 + r * 7); g.stroke(); for (let q = 0; q < 2; q++) { const xx = -4 + q * 8 + (r % 2) * 4; g.beginPath(); g.moveTo(xx, -42 + r * 7); g.lineTo(xx, -35 + r * 7); g.stroke(); } }
      const gl = g.createRadialGradient(0, -26, 1, 0, -26, 16); gl.addColorStop(0, 'rgba(255,211,107,.55)'); gl.addColorStop(1, 'rgba(255,211,107,0)'); g.fillStyle = gl; g.fillRect(-16, -42, 32, 32);
      g.beginPath(); g.moveTo(-4, -20); g.lineTo(-4, -28); g.arc(0, -28, 4, Math.PI, 0); g.lineTo(4, -20); g.closePath(); fillOut(g, '#ffd36b', 1.8); g.fillStyle = '#fff3c0'; g.fillRect(-2, -28, 1.6, 6);
    } else if (k === 'pipe') {
      rr(g, -6, -44, 12, 44, 3); const pg = g.createLinearGradient(-6, 0, 6, 0); pg.addColorStop(0, '#c3ccd4'); pg.addColorStop(0.35, '#8e9aa5'); pg.addColorStop(1, '#55606b'); g.fillStyle = pg; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
      g.save(); rr(g, -6, -30, 12, 6, 0); g.clip(); g.fillStyle = '#f2b705'; g.fillRect(-6, -30, 12, 6); g.fillStyle = OUT; for (let i = -12; i < 12; i += 5) { g.beginPath(); g.moveTo(i, -24); g.lineTo(i + 2.5, -24); g.lineTo(i + 6.5, -30); g.lineTo(i + 4, -30); g.fill(); } g.restore();
      rr(g, -9, -49, 18, 8, 3); const fg = g.createLinearGradient(-9, 0, 9, 0); fg.addColorStop(0, '#d7dee4'); fg.addColorStop(1, '#6b7782'); g.fillStyle = fg; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
      rr(g, -9, -10, 18, 6, 2); g.fillStyle = fg; g.fill(); g.stroke();
      g.beginPath(); g.arc(12, -16, 5, 0, TAU); g.lineWidth = 4.5; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2.2; g.strokeStyle = '#e04a4a'; g.stroke(); g.strokeStyle = OUT; g.lineWidth = 2; g.beginPath(); g.moveTo(6, -16); g.lineTo(12, -16); g.stroke();
      g.fillStyle = '#5a6570'; [[-7.5, -45], [7.5, -45]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 1, 0, TAU); g.fill(); });
    }
    return (cache[key] = cv);
  }
  function deco(c, th, x, y, T, seed) {
    const k = th.deco; if (!k) return;
    const v = seed != null ? Math.floor(Math.abs(seed) * 3) % 3 : Math.floor(rnd(Math.round(x) * 0.37) * 3);
    c.drawImage(decoSprite(c, th, k, v), x - 50, y - 84, 100, 90);
  }
  return { THEMES, background, tile, hero, enemy, coin, flag, anchor, heart, deco, vignette, rr, fillOut, OUT, mix, lite, dark, alpha, shadow, glint, eyes };
})();
