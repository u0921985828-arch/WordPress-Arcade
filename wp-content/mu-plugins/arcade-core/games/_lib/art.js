/* ARTE PROPIO del portal — sprites vectoriales dibujados por código (estilo cartoon plano con contorno).
 * Todo original: sin recursos de terceros. Escala base: 1 casilla = 32 px. */
const ART = (() => {
  const OUT = '#1a1530';
  const THEMES = {
    meadow:  { sky: ['#7fd4ff', '#d8f3ff'], far: '#9ec9e8', mid: '#6cc27a', near: '#4fa860', ground: '#8a5a3b', groundD: '#6b4329', top: '#5ccf5a', topD: '#3aa845', plank: '#c98a4b', enemy: 'slime', hero: '#ff5f7a', deco: 'tree', clouds: true },
    snow:    { sky: ['#a9d8ff', '#eef8ff'], far: '#c6dcf2', mid: '#a6c4e4', near: '#86a9d0', ground: '#5d7ea8', groundD: '#46658c', top: '#ffffff', topD: '#d6e7f7', plank: '#9fb7d4', enemy: 'slime', hero: '#ff7a3d', deco: 'pine', clouds: true },
    night:   { sky: ['#140c33', '#3b2266'], far: '#2a1c52', mid: '#221645', near: '#1a1036', ground: '#3b2d5c', groundD: '#2a1f45', top: '#8f6cff', topD: '#6a4fd6', plank: '#6a4fd6', enemy: 'ghost', hero: '#5ce1e6', deco: 'pine', stars: true, moon: true },
    castle:  { sky: ['#2b3a67', '#8a7fb0'], far: '#4b4f7a', mid: '#3c3f66', near: '#2e3052', ground: '#6e6f86', groundD: '#55566b', top: '#9496ad', topD: '#7a7c93', plank: '#8b5a3c', enemy: 'knight', hero: '#f2d15c', deco: 'tower', stars: true, brick: true },
    factory: { sky: ['#1d2b36', '#44606e'], far: '#2c3d49', mid: '#243440', near: '#1b2831', ground: '#4d5b66', groundD: '#3a4650', top: '#f2b705', topD: '#c99400', plank: '#7b8791', enemy: 'robot', hero: '#5ce1e6', deco: 'pipe', metal: true },
    dusk:    { sky: ['#ff8a5c', '#ffd29a'], far: '#d9738a', mid: '#8a4f7d', near: '#5a345e', ground: '#40284a', groundD: '#2e1d36', top: '#b98cff', topD: '#8f63d6', plank: '#6e4a7a', enemy: 'ghost', hero: '#1a1530', deco: 'pine', clouds: true },
    jungle:  { sky: ['#56c7a0', '#d6f5c9'], far: '#7fcf9c', mid: '#3f9e6a', near: '#2c7d52', ground: '#6b4a2f', groundD: '#523721', top: '#3cc96a', topD: '#2a9e50', plank: '#a0703f', enemy: 'slime', hero: '#ffb13d', deco: 'palm', clouds: true },
    sky:     { sky: ['#5fb4ff', '#c6f0ff'], far: '#ffffff', mid: '#dff4ff', near: '#b8e4ff', ground: '#7a5a8c', groundD: '#5e4470', top: '#7cf7a0', topD: '#4fd07c', plank: '#c98a4b', enemy: 'bird', hero: '#ff5f7a', deco: 'tree', clouds: true, floating: true },
  };
  const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fillOut(c, fill, lw) { c.fillStyle = fill; c.fill(); c.lineWidth = lw || 2.5; c.strokeStyle = OUT; c.stroke(); }

  /* ------------------------------------------------ Fondos con paralaje */
  function background(c, th, W, H, camX, camY, t) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (th.stars) { c.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { const x = ((rnd(i) * 1600 - camX * 0.05) % W + W) % W, y = rnd(i + 99) * H * 0.6; c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i)); c.fillRect(x, y, 2, 2); } c.globalAlpha = 1; }
    if (th.moon) { c.fillStyle = '#fff6d6'; c.beginPath(); c.arc(W * 0.78, H * 0.2, 26, 0, 6.283); c.fill(); c.fillStyle = th.sky[0]; c.beginPath(); c.arc(W * 0.78 + 10, H * 0.2 - 6, 22, 0, 6.283); c.fill(); }
    else if (!th.metal) { c.fillStyle = 'rgba(255,245,200,.85)'; c.beginPath(); c.arc(W * 0.82, H * 0.18, 22, 0, 6.283); c.fill(); }
    // capa lejana: montañas / torres / fábricas
    const layer = (par, base, amp, col, kind) => {
      const off = camX * par, oy = -camY * par * 0.5; c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = -40; x <= W + 40; x += 20) { const wx = x + off; let y;
        if (kind === 'peaks') y = base - Math.abs(((wx / 160) % 2 + 2) % 2 - 1) * amp - rnd(Math.floor(wx / 160)) * amp * 0.5;
        else y = base - (Math.sin(wx / 140) * 0.5 + 0.5) * amp - Math.sin(wx / 53) * amp * 0.15;
        c.lineTo(x, y + oy); }
      c.lineTo(W, H); c.fill();
    };
    layer(0.15, H * 0.62, 90, th.far, 'peaks');
    if (th.deco === 'tower') { c.fillStyle = th.mid; for (let i = -1; i < 5; i++) { const bx = i * 220 - (camX * 0.3) % 220; c.fillRect(bx, H * 0.35 - camY * 0.15, 46, H); for (let j = 0; j < 4; j++) c.fillRect(bx - 4 + j * 14, H * 0.35 - 12 - camY * 0.15, 8, 12); } }
    else if (th.deco === 'pipe') { c.fillStyle = th.mid; for (let i = -1; i < 6; i++) { const bx = i * 170 - (camX * 0.3) % 170; c.fillRect(bx, H * 0.4 - camY * 0.15, 90, H); c.fillRect(bx + 60, H * 0.22 - camY * 0.15, 14, H); } }
    else layer(0.35, H * 0.75, 60, th.mid, 'hills');
    if (th.clouds) { c.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 6; i++) { const x = ((i * 190 + t * 8 - camX * 0.2) % (W + 200) + W + 200) % (W + 200) - 100, y = 40 + rnd(i) * 80 - camY * 0.1; c.beginPath(); c.arc(x, y, 18, 0, 6.283); c.arc(x + 22, y - 8, 22, 0, 6.283); c.arc(x + 46, y, 17, 0, 6.283); c.fill(); } }
  }

  /* ------------------------------------------------ Casillas (se cachean) */
  const cache = {};
  function tileCanvas(th, key, T, draw) { const id = key + T + (th.id || ''); if (cache[id]) return cache[id]; const cv = document.createElement('canvas'); cv.width = cv.height = T * 2; const c = cv.getContext('2d'); c.scale(2, 2); draw(c); cache[id] = cv; return cv; }
  function tile(c, th, kind, x, y, T, edges) {
    let key = kind; if (kind === 'ground') key += edges.top ? 'T' : '';
    const img = tileCanvas(th, key, T, (g) => {
      if (kind === 'ground') {
        g.fillStyle = th.ground; g.fillRect(0, 0, T, T);
        if (th.brick) { g.strokeStyle = th.groundD; g.lineWidth = 2; for (let r = 0; r < 2; r++) { g.beginPath(); g.moveTo(0, r * T / 2); g.lineTo(T, r * T / 2); g.stroke(); const off = r ? T / 2 : 0; g.beginPath(); g.moveTo(off + 1, r * T / 2); g.lineTo(off + 1, r * T / 2 + T / 2); g.stroke(); } }
        else if (th.metal) { g.fillStyle = th.groundD; g.fillRect(0, T - 4, T, 4); g.fillStyle = 'rgba(255,255,255,.25)'; [[5, 5], [T - 7, 5], [5, T - 9], [T - 7, T - 9]].forEach(([a, b]) => g.fillRect(a, b, 2.5, 2.5)); }
        else { g.fillStyle = th.groundD; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(4 + rnd(i + kind.length) * (T - 8), 8 + rnd(i * 3.7) * (T - 12), 2 + rnd(i * 9) * 2, 0, 6.283); g.fill(); } }
        if (edges.top) { g.fillStyle = th.topD; g.fillRect(0, 0, T, 11); g.fillStyle = th.top; g.fillRect(0, 0, T, 8);
          if (!th.metal && !th.brick) { g.fillStyle = th.top; for (let i = 0; i < 5; i++) { const bx = 2 + i * (T / 5); g.beginPath(); g.moveTo(bx, 8); g.lineTo(bx + 3, 13 + (i % 2) * 3); g.lineTo(bx + 6, 8); g.fill(); } }
          if (th.metal) { g.fillStyle = OUT; for (let i = 0; i < T; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 5, 0); g.lineTo(i, 8); g.lineTo(i - 5, 8); g.fill(); } }
          g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, T, 2); }
      }
      if (kind === 'plank') { g.fillStyle = th.plank; rr(g, 1, 1, T - 2, 10, 3); fillOut(g, th.plank, 2); g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(T / 2, 2); g.lineTo(T / 2, 10); g.stroke(); }
      if (kind === 'spike') { for (let i = 0; i < 2; i++) { const bx = i * T / 2; g.beginPath(); g.moveTo(bx + 1, T); g.lineTo(bx + T / 4, T * 0.35); g.lineTo(bx + T / 2 - 1, T); g.closePath(); fillOut(g, '#dfe6f2', 2); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(bx + T / 4, T * 0.42); g.lineTo(bx + T / 4 + 2, T * 0.7); g.lineTo(bx + T / 4 - 1, T * 0.7); g.fill(); } }
    });
    c.drawImage(img, x, y, T, T);
    if (kind === 'ground') { c.fillStyle = 'rgba(0,0,0,.18)'; if (edges.left) c.fillRect(x, y, 3, T); if (edges.right) c.fillRect(x + T - 3, y, 3, T); }
  }

  /* ------------------------------------------------ Héroe (animado) */
  function hero(c, x, y, s, o) {
    // o: {face, state:'idle'|'run'|'jump'|'fall'|'wall', t, col, squash, sword}
    const f = o.face || 1, t = o.t || 0; c.save(); c.translate(x, y); c.scale(f * s * (o.squash ? 1 + o.squash : 1), s * (o.squash ? 1 - o.squash : 1));
    const run = o.state === 'run', air = o.state === 'jump' || o.state === 'fall', ph = t * 14;
    const bob = run ? Math.abs(Math.sin(ph)) * -2 : o.state === 'idle' ? Math.sin(t * 3) * 1 : 0;
    // bufanda / capa
    const wave = Math.sin(t * 12) * 3; c.beginPath(); c.moveTo(-4, -20 + bob); c.quadraticCurveTo(-14, -18 + wave + bob, -20 - (run ? 4 : 0), -14 + wave * 1.5 + (air ? -4 : 0) + bob); c.lineTo(-16, -11 + wave + bob); c.quadraticCurveTo(-10, -14 + bob, -3, -15 + bob); fillOut(c, o.col, 2);
    // piernas
    const legA = run ? Math.sin(ph) * 7 : air ? (o.state === 'jump' ? -4 : 3) : 0, legB = run ? -Math.sin(ph) * 7 : air ? (o.state === 'jump' ? 4 : -2) : 0;
    [[-4, legA], [4, legB]].forEach(([lx, sw]) => { rr(c, lx - 3 + sw * 0.3, -6, 6, 7 + (air ? -1 : 0), 2.5); fillOut(c, '#2c2748', 2); rr(c, lx - 4 + sw * 0.5, -1 + (air && sw < 0 ? -2 : 0), 8, 4, 2); fillOut(c, '#1a1530', 1.5); });
    // cuerpo
    rr(c, -8, -18 + bob, 16, 13, 5); fillOut(c, o.col); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(-6, -16 + bob, 4, 8);
    // cabeza
    c.beginPath(); c.arc(0, -27 + bob, 10, 0, 6.283); fillOut(c, '#ffd9b5');
    c.beginPath(); c.arc(0, -29 + bob, 10.5, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(8, -27 + bob); c.lineTo(-9, -27 + bob); fillOut(c, '#3a2a4a', 2);
    const blink = Math.sin(t * 2.3) > 0.97 ? 0.2 : 1; c.fillStyle = OUT; c.beginPath(); c.ellipse(4, -26 + bob, 1.8, 2.6 * blink, 0, 0, 6.283); c.fill(); c.beginPath(); c.ellipse(-1, -26 + bob, 1.5, 2.4 * blink, 0, 0, 6.283); c.fill();
    c.fillStyle = '#ff9a9a'; c.globalAlpha = 0.6; c.beginPath(); c.arc(6, -22.5 + bob, 2, 0, 6.283); c.fill(); c.globalAlpha = 1;
    // brazo
    const arm = run ? Math.sin(ph + Math.PI) * 6 : air ? -8 : 0; c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(2, -14 + bob); c.lineTo(7 + arm * 0.3, -8 + arm * 0.2 + bob); c.stroke(); c.strokeStyle = '#ffd9b5'; c.lineWidth = 3.2; c.stroke();
    if (o.sword) { c.save(); c.translate(8, -12 + bob); c.rotate(o.sword); rr(c, -1.5, -24, 5, 22, 2); fillOut(c, '#e8eef8', 2); rr(c, -4, -3, 11, 4, 1.5); fillOut(c, '#f2d15c', 1.5); c.restore(); }
    c.restore();
  }

  /* ------------------------------------------------ Enemigos */
  function enemy(c, kind, x, y, w, h, o) {
    const t = o.t || 0, f = o.face || 1; c.save(); c.translate(x + w / 2, y + h);
    if (kind === 'slime') { const sq = Math.sin(t * 8) * 0.12; c.scale(1 + sq, 1 - sq); c.beginPath(); c.moveTo(-w / 2, 0); c.bezierCurveTo(-w / 2, -h * 1.2, w / 2, -h * 1.2, w / 2, 0); c.closePath(); fillOut(c, o.col || '#8be04a'); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-w * 0.2, -h * 0.7, 3, 5, -0.5, 0, 6.283); c.fill(); eyes(c, f * 3, -h * 0.5, 2.6); }
    else if (kind === 'ghost') { const bob = Math.sin(t * 4) * 3; c.translate(0, bob - 4); c.beginPath(); c.arc(0, -h * 0.55, w / 2, Math.PI, 0); for (let i = 0; i <= 4; i++) c.lineTo(w / 2 - i * w / 4, -2 + (i % 2) * 5); c.closePath(); fillOut(c, o.col || '#b98cff'); eyes(c, f * 3, -h * 0.55, 2.6); }
    else if (kind === 'knight') { rr(c, -w / 2, -h, w, h, 5); fillOut(c, '#9aa3b5'); c.fillStyle = OUT; c.fillRect(-w / 2 + 3, -h * 0.72, w - 6, 4); c.fillStyle = '#ff5f5f'; c.beginPath(); c.moveTo(-3, -h); c.quadraticCurveTo(0, -h - 12, 8 * -f, -h - 6); c.lineTo(3, -h); c.fill(); c.fillStyle = '#ffd400'; c.fillRect(f * 3 - 2, -h * 0.72 + 1, 3, 2); }
    else if (kind === 'robot') { rr(c, -w / 2, -h + 2, w, h - 8, 4); fillOut(c, '#c7d0da'); c.beginPath(); c.arc(0, -4, 5, 0, 6.283); fillOut(c, '#555'); c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -h + 2); c.lineTo(0, -h - 6); c.stroke(); c.fillStyle = Math.sin(t * 6) > 0 ? '#ff3b3b' : '#ff9a9a'; c.beginPath(); c.arc(0, -h - 7, 3, 0, 6.283); c.fill(); rr(c, -w / 2 + 4, -h + 7, w - 8, 7, 3); fillOut(c, '#1a1530', 1.5); c.fillStyle = '#5ce1e6'; c.fillRect(f * 4 - 2, -h + 9, 5, 3); }
    else if (kind === 'bird') { const fl = Math.sin(t * 14) * 6; c.beginPath(); c.ellipse(0, -h / 2, w / 2, h / 2.6, 0, 0, 6.283); fillOut(c, '#ff9a3d'); c.beginPath(); c.moveTo(-2, -h / 2); c.lineTo(-10, -h / 2 - 6 - fl); c.lineTo(4, -h / 2 - 2); fillOut(c, '#ffc27a', 2); c.beginPath(); c.moveTo(f * w / 2 - 1, -h / 2 - 1); c.lineTo(f * (w / 2 + 6), -h / 2 + 1); c.lineTo(f * w / 2 - 1, -h / 2 + 3); fillOut(c, '#ffd400', 1.5); eyes(c, f * 5, -h / 2 - 3, 2.2); }
    c.restore();
  }
  function eyes(c, x, y, r) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x - r * 1.6, y, r * 1.3, 0, 6.283); c.arc(x + r * 1.6, y, r * 1.3, 0, 6.283); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(x - r * 1.3, y, r * 0.7, 0, 6.283); c.arc(x + r * 1.9, y, r * 0.7, 0, 6.283); c.fill(); }

  /* ------------------------------------------------ Objetos */
  function coin(c, x, y, t, r) { r = r || 8; const sx = Math.abs(Math.cos(t * 4 + x * 0.05)); c.save(); c.translate(x, y + Math.sin(t * 3 + x) * 2); c.scale(Math.max(0.15, sx), 1); c.beginPath(); c.arc(0, 0, r, 0, 6.283); fillOut(c, '#ffc928', 2); c.beginPath(); c.arc(0, 0, r * 0.6, 0, 6.283); c.strokeStyle = '#e39b00'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#fff6c2'; c.fillRect(-r * 0.45, -r * 0.55, r * 0.25, r * 0.6); c.restore(); }
  function flag(c, x, y, t, col, h) { h = h || 96; rr(c, x - 2.5, y - h, 5, h, 2); fillOut(c, '#e8e8f0', 2); c.beginPath(); c.arc(x, y - h - 4, 5, 0, 6.283); fillOut(c, '#ffc928', 2);
    c.beginPath(); c.moveTo(x + 2, y - h + 2); for (let i = 0; i <= 8; i++) c.lineTo(x + 2 + i * 5, y - h + 2 + Math.sin(t * 6 - i * 0.7) * 3); for (let i = 8; i >= 0; i--) c.lineTo(x + 2 + i * 5, y - h + 26 + Math.sin(t * 6 - i * 0.7) * 3); c.closePath(); fillOut(c, col || '#7cf7a0', 2); }
  function anchor(c, x, y, t) { c.beginPath(); c.arc(x, y, 9, 0, 6.283); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#d6dbe6'; c.stroke(); c.fillStyle = '#ffc928'; c.globalAlpha = 0.35 + Math.sin(t * 4) * 0.15; c.beginPath(); c.arc(x, y, 16, 0, 6.283); c.fill(); c.globalAlpha = 1; }
  function heart(c, x, y, s, full) { c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(-9, -3, -5, -10, 0, -5); c.bezierCurveTo(5, -10, 9, -3, 0, 4); fillOut(c, full ? '#ff4d6d' : 'rgba(255,255,255,.25)', 1.8); c.restore(); }
  function deco(c, th, x, y, T, seed) {
    const k = th.deco;
    if (k === 'tree') { rr(c, x - 4, y - 30, 8, 30, 3); fillOut(c, '#7a4a2a', 2); c.beginPath(); c.arc(x, y - 40, 18, 0, 6.283); c.arc(x - 12, y - 30, 12, 0, 6.283); c.arc(x + 12, y - 30, 12, 0, 6.283); fillOut(c, th.near, 2); }
    else if (k === 'pine') { rr(c, x - 3, y - 14, 6, 14, 2); fillOut(c, '#5a3a22', 2); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x, y - 52 + i * 12); c.lineTo(x + 16 - i * 2, y - 26 + i * 8); c.lineTo(x - 16 + i * 2, y - 26 + i * 8); c.closePath(); fillOut(c, th.near, 2); } }
    else if (k === 'palm') { c.beginPath(); c.moveTo(x - 3, y); c.quadraticCurveTo(x + 6, y - 30, x + 2, y - 50); c.lineTo(x + 7, y - 50); c.quadraticCurveTo(x + 11, y - 30, x + 4, y); fillOut(c, '#8a5a2b', 2); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.6; c.beginPath(); c.moveTo(x + 4, y - 50); c.quadraticCurveTo(x + 4 + Math.cos(a) * 14, y - 50 + Math.sin(a) * 14 - 6, x + 4 + Math.cos(a) * 26, y - 50 + Math.sin(a) * 26 + 6); c.quadraticCurveTo(x + 4 + Math.cos(a) * 12, y - 50 + Math.sin(a) * 12, x + 4, y - 50); fillOut(c, th.top, 2); } }
    else if (k === 'tower') { rr(c, x - 10, y - 40, 20, 40, 2); fillOut(c, th.groundD, 2); c.fillStyle = '#ffd36b'; c.fillRect(x - 3, y - 30, 6, 9); }
    else if (k === 'pipe') { rr(c, x - 6, y - 44, 12, 44, 3); fillOut(c, '#7b8791', 2); rr(c, x - 9, y - 48, 18, 8, 3); fillOut(c, '#9aa7b1', 2); }
  }
  return { THEMES, background, tile, hero, enemy, coin, flag, anchor, heart, deco, rr, fillOut, OUT };
})();
