/* rejilla.js — piezas en rejilla. CFG.mode:
 *  'blocks' Bloques 10×10: arrastra poliominós (3 por tanda) al tablero; filas y columnas completas se borran. Racha si
 *           borras al menos una vez cada 3 piezas. Tandas «justas» (colocables en algún orden) y reto diario con semilla por fecha.
 *  'jam'    Atasco: coches y camiones en 6×6 que solo avanzan por su carril; saca el coche rojo. Cada nivel sale de un
 *           generador que explora todo el espacio de estados (BFS) y elige una posición con solución mínima conocida.
 * Teclado/mando: flechas + A/B (ver ayuda de cada modo). Disposición vertical 360×640 u horizontal 640×360. */
const OUT = ART.OUT, R2 = 6.2832, MODE = CFG.mode === 'jam' ? 'jam' : 'blocks', ID = CFG.id || (MODE === 'jam' ? 'atasco' : 'bloques-10x10');
const PORT = innerHeight >= innerWidth, W = PORT ? 360 : 640, H = PORT ? 640 : 360;
const k = Kit({ w: W, h: H, title: CFG.title, bg: MODE === 'jam' ? '#18202c' : '#171336' }), c = k.ctx;
/* ---------- R5 §8 «pieza única» + cartoon de estudio (helpers locales) ----------
   uni(): contornea TODAS las partes y luego las rellena → solo sobrevive la silueta exterior.
   celp(): 3 tonos de borde duro (cel shading) recortados a la silueta, sin degradados.
   spec(): único óvalo especular.  contact(): sombra de contacto dura. */
function uni(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = ART.OUT; g.lineWidth = (ow || 1.5) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
}
function inpath(g, parts, fn) { g.save(); g.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](g); g.clip(); fn(g); g.restore(); }
function celp(g, parts, base, dx, dy) {
  inpath(g, parts, (h) => {
    const P = () => { h.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](h); h.fill(); };
    h.fillStyle = ART.dark(base, 0.24); P();
    h.translate(-dx, -dy); h.fillStyle = base; P();
    h.translate(-dx * 1.15, -dy * 1.15); h.fillStyle = ART.lite(base, 0.2); P();
  });
}
function celm(g, parts, dx, dy) { for (let i = 0; i < parts.length; i++) celp(g, [parts[i]], parts[i][1], dx, dy); }
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.7 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); g.fill(); }
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
const FONT = 'ui-rounded,"Trebuchet MS",system-ui,sans-serif';
function off(w, h, draw) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * 2); cv.height = Math.ceil(h * 2); const g = cv.getContext('2d'); g.scale(2, 2); draw(g); return cv; }
function label(s, x, y, size, col, align, base, g) {
  g = g || c; g.font = `800 ${size}px ${FONT}`; g.textAlign = align || 'left'; g.textBaseline = base || 'top';
  g.lineJoin = 'round'; g.lineWidth = size / 5 + 2; g.strokeStyle = OUT; g.strokeText(s, x, y); g.fillStyle = col || '#fff'; g.fillText(s, x, y);
}
const lsGet = (key, d) => { try { const v = localStorage.getItem(key); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (key, v) => { try { localStorage.setItem(key, v); } catch (e) { /* sin almacenamiento */ } };
/* Bloque brillante con bisel y contorno, cacheado por color y tamaño */
const SPR = {};
function block(col, s) {
  const key = col + '|' + s; if (SPR[key]) return SPR[key];
  return (SPR[key] = off(s, s, (g) => {
    const lw = Math.max(1.4, s * 0.075), r = s * 0.22, i = lw / 2, e = s * 0.16;
    ART.rr(g, i, i, s - lw, s - lw, r); g.fillStyle = ART.dark(col, 0.3); g.fill();
    const bp = [[(h) => ART.rr(h, i, i, s - lw, s - lw, r), col]];
    celp(g, bp, col, s * 0.2, s * 0.2);
    inpath(g, bp, (h) => { h.fillStyle = 'rgba(255,255,255,.5)'; ART.rr(h, e + s * 0.07, e + s * 0.07, s * 0.3, s * 0.11, s * 0.055); h.fill(); });
    g.restore();
    ART.rr(g, i, i, s - lw, s - lw, r); g.lineWidth = lw; g.strokeStyle = OUT; g.stroke();
  }));
}
/* Botón dibujado en el lienzo */
function button(b, on, dis) {
  const y = b.y + (on ? 2 : 0);
  c.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(c, b.x, b.y + 4, b.w, b.h, 11); c.fill();
  ART.rr(c, b.x, y, b.w, b.h, 11); ART.fillOut(c, on ? '#6e62f5' : b.col || '#2b2f58', 2.5);
  c.fillStyle = 'rgba(255,255,255,.1)'; ART.rr(c, b.x + 4, y + 3, b.w - 8, b.h * 0.38, 8); c.fill();
  c.globalAlpha = dis ? 0.4 : 1; label(b.txt, b.x + b.w / 2, y + b.h / 2 + 1, b.fs || 14, '#fff', 'center', 'middle'); c.globalAlpha = 1;
}
const inRect = (p, b, m) => p.x > b.x - (m || 0) && p.x < b.x + b.w + (m || 0) && p.y > b.y - (m || 0) && p.y < b.y + b.h + (m || 0);
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ================================================================== BLOQUES 10×10 */
function blocksGame() {
  const N = 10;
  const L = PORT
    ? { cs: 32, bx: 20, by: 122, tc: 20, slots: [[8, 470, 110, 150], [125, 470, 110, 150], [242, 470, 110, 150]], lift: 74 }
    : { cs: 30, bx: 170, by: 32, tc: 20, slots: [[488, 14, 144, 108], [488, 126, 144, 108], [488, 238, 144, 108]], lift: 48 };
  const CS = L.cs, BW = N * CS;
  const PAL = ['#ff5a6a', '#ff9a3c', '#f7d046', '#5fdc6e', '#45d6ea', '#4f7cff', '#b36cf0', '#ff6fb5'];
  /* familias de piezas: [celdas, color, nivel] (nivel 0 = pequeñas, 2 = grandes) → todas sus orientaciones */
  const FAM = [
    [[[0, 0]], 7, 0], [[[0, 0], [1, 0]], 3, 0], [[[0, 0], [1, 0], [2, 0]], 4, 0], [[[0, 0], [0, 1], [1, 1]], 2, 0],
    [[[0, 0], [1, 0], [0, 1], [1, 1]], 2, 1], [[[0, 0], [1, 0], [2, 0], [3, 0]], 4, 1], [[[0, 0], [0, 1], [0, 2], [1, 2]], 1, 1],
    [[[1, 0], [1, 1], [1, 2], [0, 2]], 5, 1], [[[0, 0], [1, 0], [2, 0], [1, 1]], 6, 1], [[[1, 0], [2, 0], [0, 1], [1, 1]], 3, 1], [[[0, 0], [1, 0], [1, 1], [2, 1]], 0, 1],
    [[[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], 0, 2], [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], 5, 2],
    [[[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], 1, 2], [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], 6, 2],
  ].map(([cells, ci, tier]) => {
    const seen = new Set(), rots = []; let s = cells;
    for (let r = 0; r < 4; r++) {
      const mx = Math.min(...s.map((p) => p[0])), my = Math.min(...s.map((p) => p[1])), n = s.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]), key = n.join(';');
      if (!seen.has(key)) { seen.add(key); rots.push(n); }
      s = s.map(([x, y]) => [-y, x]);
    }
    return { rots, col: PAL[ci], tier };
  });
  let grid, tray, score, shown, lines, streak, since, drag, kb, kbMode, fx, pops, ending, endT, ended, daily, rng, placed, best, trayN, dayKey, pulse, t = 0, startDaily = false, clearedFx;
  const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  const fits = (pc, x, y, g) => pc.cells.every(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && Y >= 0 && X < N && Y < N && !(g || grid)[Y][X]; });
  const anyFit = (pc, g) => { for (let y = 0; y <= N - pc.h; y++) for (let x = 0; x <= N - pc.w; x++) if (fits(pc, x, y, g)) return true; return false; };
  function mkPiece(fam, rot) { const cells = fam.rots[rot]; return { cells, col: fam.col, w: Math.max(...cells.map((p) => p[0])) + 1, h: Math.max(...cells.map((p) => p[1])) + 1, pop: 0, back: 0 }; }
  function draw1(r) {
    const d = daily ? 0.55 : Math.min(1, placed / 90), wt = FAM.map((f) => (f.tier === 0 ? 1.7 - 0.9 * d : f.tier === 1 ? 1 + 0.25 * d : 0.18 + 0.95 * d));
    let x = r() * wt.reduce((a, b) => a + b, 0), i = 0; while (x > wt[i]) x -= wt[i++];
    const f = FAM[Math.min(i, FAM.length - 1)]; return mkPiece(f, Math.floor(r() * f.rots.length));
  }
  /* ¿se pueden colocar las tres en algún orden? (colocación voraz que prioriza borrar líneas y pegarse a otras piezas) */
  function placeBest(g, pc) {
    let bestS = -1, bx = -1, by = -1;
    for (let y = 0; y <= N - pc.h; y++) for (let x = 0; x <= N - pc.w; x++) {
      if (!fits(pc, x, y, g)) continue;
      const tmp = g.map((r) => r.slice()); for (const [a, b] of pc.cells) tmp[y + b][x + a] = 1;
      let s = 0; for (let i = 0; i < N; i++) { if (tmp[i].every(Boolean)) s += 20; if (tmp.every((r) => r[i])) s += 20; }
      for (const [a, b] of pc.cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + a + dx, Y = y + b + dy; if (X < 0 || Y < 0 || X >= N || Y >= N || tmp[Y][X]) s++; }
      if (s > bestS) { bestS = s; bx = x; by = y; }
    }
    if (bx < 0) return null;
    const out = g.map((r) => r.slice()); for (const [a, b] of pc.cells) out[by + b][bx + a] = 1;
    const fr = [], fc = []; for (let i = 0; i < N; i++) { if (out[i].every(Boolean)) fr.push(i); if (out.every((r) => r[i])) fc.push(i); }
    for (const i of fr) out[i].fill(null); for (const j of fc) for (const r of out) r[j] = null;
    return out;
  }
  function solvable(set) {
    for (const ord of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) { let g = grid; for (const i of ord) { g = placeBest(g, set[i]); if (!g) break; } if (g) return true; }
    return false;
  }
  function newTray() {
    let set;
    if (daily) set = [draw1(rng), draw1(rng), draw1(rng)];           // misma secuencia para todos en el reto del día
    else for (let a = 0, tries = placed < 150 ? 30 : 8; a < tries; a++) { set = [draw1(Math.random), draw1(Math.random), draw1(Math.random)]; if (solvable(set)) break; }
    tray = set; trayN++; set.forEach((p, i) => (p.pop = -i * 0.08)); kb.sel = 0;
  }
  function reset() {
    daily = startDaily; startDaily = false; dayKey = today(); rng = mulberry(dayKey * 7919 + 13);
    grid = Array.from({ length: N }, () => Array(N).fill(null));
    score = 0; shown = 0; lines = 0; streak = 0; since = 0; drag = null; kb = { sel: 0, x: 3, y: 3 }; kbMode = false; fx = []; pops = []; clearedFx = [];
    ending = false; endT = 0; ended = false; placed = 0; trayN = 0; pulse = 0;
    best = k.best(bestId(), 0); newTray();
  }
  const bestId = () => (daily ? ID + '-reto-' + dayKey : ID);
  function pop(txt, col, size) { pops.push({ txt, col, size, t: 1.3, max: 1.3 }); if (pops.length > 3) pops.shift(); }

  function place(i, gx, gy) {
    const pc = tray[i]; if (!pc || !fits(pc, gx, gy)) return false;
    for (const [a, b] of pc.cells) { grid[gy + b][gx + a] = pc.col; fx.push({ x: gx + a, y: gy + b, t: 0.18, kind: 'land' }); }
    tray[i] = null; placed++; score += pc.cells.length; k.sfx('pop'); k.shake(1.5);
    const fr = [], fcl = []; for (let j = 0; j < N; j++) { if (grid[j].every(Boolean)) fr.push(j); if (grid.every((r) => r[j])) fcl.push(j); }
    const n = fr.length + fcl.length, px = L.bx + (gx + pc.w / 2) * CS, py = L.by + (gy + pc.h / 2) * CS;
    if (n) {
      const cells = new Map();
      for (const y of fr) for (let x = 0; x < N; x++) cells.set(x + ',' + y, [x, y]);
      for (const x of fcl) for (let y = 0; y < N; y++) cells.set(x + ',' + y, [x, y]);
      let d0 = 0; for (const [x, y] of cells.values()) { const dd = Math.hypot(x - gx - pc.w / 2, y - gy - pc.h / 2) * 0.025; clearedFx.push({ x, y, col: grid[y][x], t: -dd, n }); d0 = Math.max(d0, dd); grid[y][x] = null; }
      streak = since <= 2 && placed > 1 && streak >= 0 ? streak + 1 : 1; since = 0; lines += n;
      const pts = Math.round(10 * n * (n + 1) / 2 * (1 + (streak - 1) * 0.5)); score += pts;
      k.float('+' + (pts + pc.cells.length), px, py - 10, n > 1 ? '#ffd166' : '#fff');
      if (n >= 2) pop(['', '', '¡Doble!', '¡Triple!', '¡Cuádruple!'][Math.min(4, n)] || '¡Increíble!', '#ffd166', 26 + Math.min(n, 4) * 2);
      if (streak > 1) pop('Racha ×' + streak, '#7cf7a0', 20);
      if (grid.every((r) => r.every((v) => !v))) { score += 300; pop('¡Tablero limpio! +300', '#7ff0ff', 20); k.confetti(); k.sfx('win'); }
      k.sfx(n >= 2 ? 'win' : 'coin'); k.shake(2 + n * 1.5); if (n >= 3) k.flash('rgba(255,255,255,.3)');
      pulse = 1;
    } else { since++; if (since >= 3 && streak > 0) { streak = 0; } k.float('+' + pc.cells.length, px, py - 10, '#d9d4ff'); }
    if (tray.every((p) => !p)) newTray();
    else { const s2 = tray.findIndex(Boolean); if (!tray[kb.sel]) kb.sel = s2; }
    if (!tray.some((p) => p && anyFit(p))) { ending = true; endT = 0; drag = null; k.sfx('hurt'); k.shake(5); }
    return true;
  }
  /* posición del tablero que corresponde a la pieza arrastrada */
  function dragCell() {
    const pc = tray[drag.i], left = drag.x - pc.w * CS / 2, top = drag.y - L.lift - pc.h * CS / 2;
    return [Math.round((left - L.bx) / CS), Math.round((top - L.by) / CS)];
  }
  const slotRect = (i) => { const s = L.slots[i]; return { x: s[0], y: s[1], w: s[2], h: s[3] }; };
  function input() {
    const p = k.ptr;
    if (p.hit) {
      for (let i = 0; i < 3; i++) if (tray[i] && inRect({ x: p.x, y: p.y }, slotRect(i), 4)) { drag = { i, x: p.x, y: p.y }; kbMode = false; k.sfx('click'); break; }
      if (!drag && p.x > L.bx && p.x < L.bx + BW && p.y > L.by && p.y < L.by + BW) kbMode = false;
    }
    if (drag) { drag.x = p.x; drag.y = p.y; }
    if (drag && (p.up || !p.down)) {
      const [gx, gy] = dragCell(), pc = tray[drag.i];
      if (!place(drag.i, gx, gy)) { pc.back = 1; pc.bx = drag.x; pc.by = drag.y - L.lift; k.sfx('click'); }
      drag = null;
    }
    // teclado / mando: cursor sobre el tablero
    const dirs = [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]];
    let used = false;
    for (const [n, dx, dy] of dirs) if (k.hit.has(n)) { kb.x += dx; kb.y += dy; used = true; }
    if (k.hit.has('b')) { used = true; for (let j = 1; j <= 3; j++) { const q = (kb.sel + j) % 3; if (tray[q]) { kb.sel = q; break; } } k.sfx('click'); }
    const pc = tray[kb.sel];
    if (pc) { kb.x = k.clamp(kb.x, 0, N - pc.w); kb.y = k.clamp(kb.y, 0, N - pc.h); }
    if (used) kbMode = true;
    if (k.hit.has('a')) { if (!kbMode) kbMode = true; else if (pc && !place(kb.sel, kb.x, kb.y)) { k.sfx('hit'); k.shake(3); } }
  }
  function update(dt) {
    t += dt; shown = Math.abs(score - shown) < 1 ? score : shown + (score - shown) * Math.min(1, dt * 10); pulse = Math.max(0, pulse - dt * 2);
    for (const f of fx) f.t -= dt; fx = fx.filter((f) => f.t > 0);
    for (const f of clearedFx) { const was = f.t; f.t += dt; if (was < 0 && f.t >= 0) k.burst(L.bx + (f.x + 0.5) * CS, L.by + (f.y + 0.5) * CS, f.col, 4, 150); } clearedFx = clearedFx.filter((f) => f.t < 0.35);
    for (const p of pops) p.t -= dt; pops = pops.filter((p) => p.t > 0);
    if (tray) for (const p of tray) if (p) { p.pop = Math.min(1, p.pop + dt * 4); p.back = Math.max(0, p.back - dt * 5); }
    if (k.st !== 'play') return;
    if (ending) { endT += dt; if (endT > 1.3 && !ended) { ended = true; k.lose(bestId(), score, 'Sin sitio', `${daily ? 'Reto del día · ' : ''}Líneas ${lines}`); dailyBtn(); } return; }
    input();
  }
  /* ---------- dibujo ---------- */
  const BG = off(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2c2268'); gr.addColorStop(1, '#100c28'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const r = mulberry(5);
    for (let i = 0; i < 26; i++) { const s = 8 + r() * 14, x = r() * W, y = r() * H; g.globalAlpha = 0.05 + r() * 0.05; g.fillStyle = PAL[i % 8]; ART.rr(g, x, y, s, s, s * 0.25); g.fill(); }
    g.globalAlpha = 1;
    const cx = L.bx + BW / 2, cy = L.by + BW / 2, rg = g.createRadialGradient(cx, cy, 20, cx, cy, BW * 0.8); rg.addColorStop(0, 'rgba(110,98,245,.28)'); rg.addColorStop(1, 'rgba(110,98,245,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    // tablero con marco
    g.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(g, L.bx - 8, L.by - 4, BW + 16, BW + 16, 14); g.fill();
    ART.rr(g, L.bx - 8, L.by - 8, BW + 16, BW + 16, 14); ART.fillOut(g, '#3a3180', 3);
    g.fillStyle = 'rgba(255,255,255,.12)'; ART.rr(g, L.bx - 5, L.by - 6, BW + 10, 4, 2); g.fill();
    ART.rr(g, L.bx - 2, L.by - 2, BW + 4, BW + 4, 8); g.fillStyle = '#16123a'; g.fill();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const X = L.bx + x * CS, Y = L.by + y * CS; ART.rr(g, X + 2, Y + 2, CS - 4, CS - 4, CS * 0.2);
      g.fillStyle = (x < 5) === (y < 5) ? '#221d52' : '#1e1a4a'; g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X + 3, Y + 3, CS - 6, 2);
    }
    // bandeja
    for (let i = 0; i < 3; i++) { const [x, y, w, h] = L.slots[i]; ART.rr(g, x + 3, y + 3, w - 6, h - 6, 14); g.fillStyle = 'rgba(255,255,255,.045)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1.5; g.stroke(); }
  });
  function drawPiece(pc, x, y, s, alpha) { c.globalAlpha = alpha == null ? 1 : alpha; const spr = block(pc.col, s); for (const [a, b] of pc.cells) c.drawImage(spr, x + a * s, y + b * s, s, s); c.globalAlpha = 1; }
  function draw() {
    c.drawImage(BG, 0, 0, W, H);
    // vista previa (arrastre o cursor de teclado)
    let prev = null;
    if (drag && tray[drag.i]) { const [gx, gy] = dragCell(); if (fits(tray[drag.i], gx, gy)) prev = { pc: tray[drag.i], gx, gy }; }
    else if (kbMode && k.st === 'play' && !ending && tray[kb.sel]) prev = { pc: tray[kb.sel], gx: kb.x, gy: kb.y, kb: true, ok: fits(tray[kb.sel], kb.x, kb.y) };
    let hlR = [], hlC = [];
    if (prev && prev.ok !== false) {
      const tmp = grid.map((r) => r.slice()); for (const [a, b] of prev.pc.cells) tmp[prev.gy + b][prev.gx + a] = 1;
      for (let i = 0; i < N; i++) { if (tmp[i].every(Boolean)) hlR.push(i); if (tmp.every((r) => r[i])) hlC.push(i); }
    }
    const gray = ending ? Math.min(N, Math.floor(endT / 1.1 * N)) : 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = grid[y][x]; if (!v) continue;
      const hl = hlR.includes(y) || hlC.includes(x), col = N - 1 - y < gray ? '#5b5775' : hl ? prev.pc.col : v;
      const f = fx.find((q) => q.x === x && q.y === y), s = f ? 1 + Math.sin((1 - f.t / 0.18) * Math.PI) * 0.12 : 1, S2 = CS * s;
      c.drawImage(block(col, CS), L.bx + x * CS + (CS - S2) / 2, L.by + y * CS + (CS - S2) / 2, S2, S2);
    }
    if (prev) {
      const ok = prev.ok !== false; c.save();
      for (const [a, b] of prev.pc.cells) {
        const X = L.bx + (prev.gx + a) * CS, Y = L.by + (prev.gy + b) * CS;
        if (ok) { c.globalAlpha = 0.35; c.drawImage(block(prev.pc.col, CS), X, Y, CS, CS); c.globalAlpha = 1; }
        ART.rr(c, X + 2, Y + 2, CS - 4, CS - 4, CS * 0.2); c.lineWidth = 2.5; c.strokeStyle = ok ? '#fff' : '#ff5a6a'; c.globalAlpha = prev.kb ? 0.6 + 0.3 * Math.sin(t * 8) : 0.7; c.stroke(); c.globalAlpha = 1;
      }
      c.restore();
      if (hlR.length || hlC.length) { c.globalAlpha = 0.18 + 0.1 * Math.sin(t * 10); c.fillStyle = '#fff'; for (const y of hlR) c.fillRect(L.bx, L.by + y * CS, BW, CS); for (const x of hlC) c.fillRect(L.bx + x * CS, L.by, CS, BW); c.globalAlpha = 1; }
    }
    // celdas que se borran: se encogen con destello
    for (const f of clearedFx) {
      if (f.t < 0) { c.drawImage(block(f.col, CS), L.bx + f.x * CS, L.by + f.y * CS, CS, CS); continue; }
      const q = f.t / 0.35, s = CS * (1 - q) * (1 + 0.3 * Math.sin(q * 3)), X = L.bx + (f.x + 0.5) * CS, Y = L.by + (f.y + 0.5) * CS;
      c.drawImage(block(f.col, CS), X - s / 2, Y - s / 2, s, s); c.globalAlpha = (1 - q) * 0.8; c.fillStyle = '#fff'; ART.rr(c, X - s / 2, Y - s / 2, s, s, s * 0.2); c.fill(); c.globalAlpha = 1;
    }
    // bandeja
    for (let i = 0; i < 3; i++) {
      const pc = tray && tray[i], sr = slotRect(i); if (!pc) continue;
      const selK = kbMode && kb.sel === i && k.st === 'play';
      if (selK) { ART.rr(c, sr.x + 3, sr.y + 3, sr.w - 6, sr.h - 6, 14); c.lineWidth = 3; c.strokeStyle = '#ffd166'; c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); c.stroke(); c.globalAlpha = 1; }
      if (drag && drag.i === i) continue;
      const fitsAny = anyFit(pc), e = Math.max(0, pc.pop), sc = e < 1 ? 1 + 2.7 * Math.pow(e - 1, 3) + 1.7 * Math.pow(e - 1, 2) : 1, s = L.tc * Math.max(0.01, sc);
      let x = sr.x + sr.w / 2 - pc.w * s / 2, y = sr.y + sr.h / 2 - pc.h * s / 2;
      if (pc.back > 0) { const q = pc.back * pc.back; x += (pc.bx - pc.w * CS / 2 - x) * q; y += (pc.by - pc.h * CS / 2 - y) * q; }
      drawPiece(pc, x, y, s, fitsAny ? 1 : 0.35);
    }
    if (drag && tray[drag.i]) { const pc = tray[drag.i]; c.fillStyle = 'rgba(0,0,0,.25)'; for (const [a, b] of pc.cells) { ART.rr(c, drag.x - pc.w * CS / 2 + a * CS + 5, drag.y - L.lift - pc.h * CS / 2 + b * CS + 8, CS - 2, CS - 2, 6); c.fill(); } drawPiece(pc, drag.x - pc.w * CS / 2, drag.y - L.lift - pc.h * CS / 2, CS); }
    // marcador
    const sc = 1 + pulse * 0.15, bestV = Math.max(best, score);
    if (PORT) {
      c.save(); c.translate(W / 2, 58); c.scale(sc, sc); label(String(Math.round(shown)), 0, 0, 40, '#fff', 'center', 'middle'); c.restore();
      label('Récord ' + bestV, 14, 14, 13, '#c9c3ff'); label('Líneas ' + lines, W - 14, 14, 13, '#c9c3ff', 'right');
      if (daily) label('Reto del día', W / 2, 90, 13, '#ffd166', 'center');
      if (streak > 1) label('Racha ×' + streak, W - 14, 34, 13, '#7cf7a0', 'right');
    } else {
      label('PUNTOS', 20, 40, 12, '#9790d6'); c.save(); c.translate(20, 58); c.scale(sc, sc); label(String(Math.round(shown)), 0, 0, 30, '#fff'); c.restore();
      label('RÉCORD', 20, 104, 12, '#9790d6'); label(String(bestV), 20, 120, 20, '#c9c3ff');
      label('LÍNEAS', 20, 156, 12, '#9790d6'); label(String(lines), 20, 172, 20, '#fff');
      if (streak > 1) label('Racha ×' + streak, 20, 210, 16, '#7cf7a0');
      if (daily) label('Reto del día', 20, 240, 14, '#ffd166');
    }
    // textos grandes
    let y = L.by + BW * 0.36;
    for (const p of pops) { const age = p.max - p.t, s = 0.4 + 0.6 * Math.min(1, age / 0.18) + (age < 0.18 ? 0 : 0); c.save(); c.globalAlpha = Math.min(1, p.t / 0.35); c.translate(L.bx + BW / 2, y - age * 16); c.scale(s, s); label(p.txt, 0, 0, p.size, p.col, 'center', 'middle'); c.restore(); y += p.size * 1.3; }
  }
  /* botón «Reto del día» en las pantallas de inicio y fin */
  function dailyBtn() {
    const card = document.querySelector('#ov .card'); if (!card || card.querySelector('.daily')) return;
    const d = new Date(), b = document.createElement('div');
    b.className = 'go daily'; b.style.cssText = 'pointer-events:auto;cursor:pointer;background:#2b2f58;animation:none;margin-top:2px';
    b.innerHTML = (k.party ? '<span class="ka">B</span>' : '') + `Reto del día · ${d.getDate()}/${d.getMonth() + 1}`;
    b.addEventListener('pointerdown', () => { startDaily = true; });
    card.append(b);
  }
  window.__rj = { get grid() { return grid; }, get tray() { return tray; }, get score() { return score; }, fits: (i, x, y) => !!tray[i] && fits(tray[i], x, y), get kb() { return kb; }, get daily() { return daily; } };
  reset();
  // tablero de muestra detrás de la pantalla de inicio (se vacía al empezar: reset() en la transición ready→play)
  for (let y = 3; y < N; y++) for (let x = 0; x < N; x++) if ((x * 7 + y * 3) % 5 && !(y < 6 && x > 4) && x !== 7) grid[y][x] = PAL[(((x / 3) | 0) + ((y / 2) | 0) * 3) % PAL.length];
  k.show(CFG.title || 'Bloques 10×10', 'Arrastra las piezas al tablero. Completa filas o columnas para borrarlas y encadena rachas. Si ninguna pieza cabe, se acaba. Teclado: flechas mueven, A coloca, B cambia de pieza.<br>Toca para jugar');
  dailyBtn();
  k.run((dt) => {
    if (k.st !== 'play' && k.hit.has('b') && !(k.st === 'over' && ending && !ended)) { startDaily = true; k.hit.add('a'); }
    const was = k.st, ok = k.gate(reset);
    if (was === 'ready' && k.st === 'play') reset();
    update(dt);
  }, draw);
}

/* ================================================================== ATASCO */
function jamGame() {
  const N = 6, EXIT = 2;
  const L = PORT
    ? { cs: 48, bx: 24, by: 160, btn: [[16, 530, 104, 46, 'undo', 'Deshacer'], [128, 530, 104, 46, 'hint', 'Pista'], [240, 530, 104, 46, 'reset', 'Reiniciar']] }
    : { cs: 48, bx: 186, by: 36, btn: [[522, 150, 108, 44, 'undo', 'Deshacer'], [522, 204, 108, 44, 'hint', 'Pista'], [522, 258, 108, 44, 'reset', 'Reiniciar']] };
  const CS = L.cs, BW = N * CS;
  const BTN = L.btn.map(([x, y, w, h, id, txt]) => ({ x, y, w, h, id, txt, pt: 0 }));
  const COLS = ['#3fb6ea', '#ffd166', '#5fbf45', '#b36cf0', '#ff9a3c', '#45d6ea', '#ff6fb5', '#4f7cff', '#c9a26b', '#8bd3a0', '#f2f2f2', '#7b8791'];
  const RED = '#ff4b55';
  /* ---------- solucionador: estado = posición móvil de cada vehículo ---------- */
  function occOf(cars, pos) { const o = new Int8Array(36).fill(-1); cars.forEach((v, i) => { for (let j = 0; j < v.len; j++) { const x = v.h ? pos[i] + j : v.x, y = v.h ? v.y : pos[i] + j; o[y * N + x] = i; } }); return o; }
  function neighbors(cars, pos, cb) {
    const o = occOf(cars, pos);
    cars.forEach((v, i) => {
      for (const dir of [-1, 1]) for (let d = 1; ; d++) {
        const np = pos[i] + dir * d, edge = dir < 0 ? np : np + v.len - 1; if (edge < 0 || edge >= N) break;
        const cell = v.h ? v.y * N + edge : edge * N + v.x; if (o[cell] >= 0) break;
        const q = pos.slice(); q[i] = np; cb(q, i, np);
      }
    });
  }
  const enc = (pos) => { let s = 0; for (let i = pos.length - 1; i >= 0; i--) s = s * 8 + pos[i]; return s; };
  function explore(cars, start, cap) {
    const idx = new Map([[enc(start), 0]]), st = [start], adj = [];
    for (let i = 0; i < st.length; i++) {
      const nb = []; let over = false;
      neighbors(cars, st[i], (q) => { const kq = enc(q); let j = idx.get(kq); if (j === undefined) { if (st.length >= cap) { over = true; return; } j = st.length; idx.set(kq, j); st.push(q); } nb.push(j); });
      if (over) return null; adj.push(nb);
    }
    return { st, adj };
  }
  function solvePath(cars, start) {
    const par = new Map([[enc(start), null]]), q = [start];
    for (let h = 0; h < q.length && h < 200000; h++) {
      const s = q[h]; if (s[0] === N - 2) { const path = []; let kk = enc(s); while (par.get(kk)) { const p = par.get(kk); path.unshift([p.i, p.np]); kk = p.from; } return path; }
      neighbors(cars, s, (ns, i, np) => { const kk = enc(ns); if (!par.has(kk)) { par.set(kk, { from: enc(s), i, np }); q.push(ns); } });
    }
    return null;
  }
  function fitsCar(cars, v, skip) { const o = occOf(cars.filter((_, i) => i !== skip), cars.filter((_, i) => i !== skip).map((w) => (w.h ? w.x : w.y))); for (let j = 0; j < v.len; j++) { const x = v.h ? v.x + j : v.x, y = v.h ? v.y : v.y + j; if (x >= N || y >= N || o[y * N + x] >= 0) return false; } return true; }
  function randCar() { const len = Math.random() < 0.28 ? 3 : 2, h = Math.random() < 0.5; let y = k.ri(0, h ? N - 1 : N - len); if (h && y === EXIT) y = (y + k.ri(1, N - 1)) % N; return { x: k.ri(0, h ? N - len : N - 1), y, len, h }; }
  function randomLayout(n) {
    const cars = [{ x: k.ri(0, 2), y: EXIT, len: 2, h: true }];
    for (let t2 = 0; t2 < n * 25 && cars.length < n + 1; t2++) { const v = randCar(); if (fitsCar(cars, v)) cars.push(v); }
    return cars;
  }
  /* evalúa una disposición: explora todo su espacio de estados y elige la posición cuya solución mínima se acerca más al objetivo */
  function evaluate(cars, target) {
    const g = explore(cars, cars.map((v) => (v.h ? v.x : v.y)), 12000); if (!g) return null;
    const dist = new Int16Array(g.st.length).fill(-1), q = [];
    g.st.forEach((s, i) => { if (s[0] === N - 2) { dist[i] = 0; q.push(i); } });
    if (!q.length) return null;
    for (let h = 0; h < q.length; h++) for (const j of g.adj[q[h]]) if (dist[j] < 0) { dist[j] = dist[q[h]] + 1; q.push(j); }
    let pick = -1, pd = 1e9;
    for (let i = 0; i < dist.length; i++) { const e = Math.abs(dist[i] - target) + (dist[i] < target ? 0.5 : 0); if (dist[i] > 0 && e < pd) { pd = e; pick = i; } }
    if (pick < 0) return null;
    const p = g.st[pick]; return { err: pd, cars: cars.map((v, i) => ({ ...v, x: v.h ? p[i] : v.x, y: v.h ? v.y : p[i] })), min: dist[pick] };
  }
  /* genera un nivel: disposiciones al azar + ascenso de colina (añadir, quitar o recolocar vehículos) hacia el objetivo */
  function generate(target, n) {
    const t0 = performance.now(); let best = null;
    while (!best || (best.err > 0 && performance.now() - t0 < 700)) {
      let cur = evaluate(randomLayout(n), target); if (!cur) continue;
      for (let it = 0; it < 40 && cur.err > 0 && performance.now() - t0 < 700; it++) {
        const cs = cur.cars.map((v) => ({ ...v })), r = Math.random();
        if ((r < 0.45 || cs.length < 4) && cs.length < 14) { const v = randCar(); if (!fitsCar(cs, v)) continue; cs.push(v); }
        else if (r < 0.7 && cs.length > 3) cs.splice(k.ri(1, cs.length - 1), 1);
        else { const i = k.ri(1, cs.length - 1), v = randCar(); if (!fitsCar(cs, v, i)) continue; cs[i] = v; }
        const nx = evaluate(cs, target); if (nx && nx.err <= cur.err) cur = nx;
      }
      if (!best || cur.err < best.err) best = cur;
    }
    return { cars: best.cars, pos: best.cars.map((v) => (v.h ? v.x : v.y)), min: best.min };
  }
  /* banco de niveles (mínimo 3–38), generado sin conexión con el mismo solucionador: 36 casillas + mínimo */
  const BANK = "..DDD.E...F.EGAAF..G....IG.CC.IHH...3 CDE.LLCDE..H.DAAJH..KFJ.GGKF...MMIII3 H.EEE.H.DGG.AAD.....FFII.........CCC3 ....EE.....H.GAA.H.G.FFF.G......CCDD3 .D.....D.GG.HAAEF.HJJEF.I.....IKKKCC3 .C.DDD.C...E.AA.FEG...FEG.....G.....3 G.LL..G..H.KJAAH.KJC.IIIEC.DDDECFFF.4 .JJJ..DD..EE.LAAHG.LFFHG....CCKK.III4 ..DDD..HH...AAE...IIE....CCCGGFFF...4 HHHII.JJDDG.L.AAG.LEE.G.LK.FF..K.CC.4 HI.CC.HI..EE..AAG..D..G..D.FFF..JJ..4 HHH...GG..F..AACF....C..DDDC....EE..4 ............AAEDGC..EDGC......HH..FF5 DD.HHHIII.CF..AACF.......JJGG..EE...5 ..EEEH....CH.AAFCH.IIFG.....G.DD....5 .FFKK.EEHCGGAAHC..J.DDD.JI....JI....5 ....FF..DDDG..AAIG.C..IHJC.EEHJC...H5 ED.C..ED.C..HAAIJGHLLIJGHFFI....KK..5 ...EFF...ED...AAD..CCCGHII..GH....G.6 GGGFFFHHH..E.AA..EJIKLLLJIK.CCJ.DD..6 ..CCC..GG.FF.AA.HD.I..HD.I.EEE......6 ..IIFF...GGG.AAD.E.H.D.E.H.D.C.H...C6 EE.D..CCCD..AAGD....GHH...FFF.......6 LJ.CCMLJII.MAA...MFDEGGGFDE.HHFD..KK6 DIIEEED..CCCAA...FGG...F.....H...JJH7 ..GCC...GH.IAAJH.I..JDDD.FF.....EE..7 HHJJGGEEECKKAA.C..DD.C..FIIILLF..MM.7 .JFFF..J.GGH.AA.IH....I.CCCEEE.DDDKK7 ....FD....FD..AA.D..EEHH.IJJCC.I.GG.7 ..HHF.I...F.I.AAC..EEEC.G..DJJG..D..7 ..KKMM.JJGGG.AAH.F.CCH.FII.HEE..DDLL8 CIIIKKC.FGG.AAFE...JFEHH.JDDD..J....8 H.DD.IH..GFI.AAGFI...GCC..EEJ.....J.8 .CC..F...J.F.AAJ.F.HHHDD..EEII...GGG8 ...GEE...GJJ..AAK..DDDK.IIIFFF.HHCC.8 IDKKGGID.FF..AA.L.....L...JJH.CCEEH.8 ...DDJ....CJ..AACJ.H..EE.HIIKK.FFGGG9 .F.HHH.F.CCCAAJ.K.DDJ.K..GGIII...EE.9 ICCCHHI..EEEAA.D.J.KKD.JG..DFFG..LL.9 CEGGIICE...D.AA.HD....HDKK.JJJFFF...9 K..IIIKDDEEEAA...JCCGG.JLL.HHMFFF..M9 FCGGKKFCIIJ.AAM.J...MDDD..EEE...HHLL9 .II.LL..FFFJAAK..J..K.DDGGK.C.HHEEC.10 ...GG...DDH.JIAAH.JI..H.FEK.CCFEK.LL10 .GFFDDKG.CCCKAAM..KIIM.LJH.EELJH..NN10 .E...D.E.CLDAA.CLDGI.JJJGI.FFFGKKHHH10 CC.EE.K...H.KAADHIJJFDHIGGF.....FLL.10 ..C...HHCFGJAAEFGJIIE..JD.E.LLD.KKK.10 .IIFFJ..DDDJAA..EHGGG.EHLKKCCCL.....11 ..DD.G..C..GAAC..H.FJJJH.F.LEEKKKLII11 .K.DD.HK.CFLHAACFLH..EGGJ..E.IJ..E.I11 ..GJKKLLGJE.HAAFECHDIF.C.DI.M...I.M.11 .LLII....EKHAA.EKHFFF.KHJDDGG.J..CC.11 ..KIII..KEEEAAKG.DLHHGJDLFCCJ..F....11 ..MKK...MCCFAAMI.F.HHIGG.JJLLE..DDDE12 MM.KK...GCI.AAGCIFD.LLLFDEEJJF...HHH12 ....L.II.HLKAA.HDKFFFHDGE.JJ.GECCCMM12 .JJCCL.GGG.LAAFI..K.FIEEK.HIM.DDH.M.12 FFFMMI.KKCCI..AA.IG..DLLGHHDJJGEEE..12 F.CC..F..GMMFAAG.E..HDDE..HLLJKKKIIJ12 ..KCC.GGKJ.IAADJ.IHHDMFFLEEM..L.....13 .....D..HEEDAAHCFJ..ICFJ..ICGG...KK.13 OJJDDFOGIIMFKGAAMHKGEEEHNL.CC.NL....14 .GGGFF..JIIIAAJ..E.KK..E.DHHHC.D.LLC14 FEEE..F.KKIHAA.GIH.J.GIHMJ.DDDMLLCC.14 EEEGGIKKCCFIHAA.F.H..MM.LJJ.DDL.....14 MMKKFHEE.LFHGAALF.GCCC..J..DNNJ..DII14 DD..C.LLL.C.F.AACJF.G..JIIGHH..KKEE.14 ...J.....JF..AAEFC...E.C.I.HHC.IGGDD14 ......LLEEHJGAA.HJG..C.JG.KCDDFFK.II14 .D.GGF.D.C.F.AAC.E.JJH.E...H.....II.15 CCCDDF.....F..AAH.KKIIH.LJJGEEL..GMM15 CLLFF.CGGHH.C.AAE.III.EK..J.EK..JDD.15 ..HH..J.CCCDJ.AAGDFFEEGD...LMMIIILKK15 KFFCD.K.GCD.AAGC....E.....EHHI..EJJI15 ..EHHKCCE.JK.FAAJK.FLL...FGGII.DDD..16 JHHIE.J.FIEKAAF..KGGGDD.......LL.CC.16 I.EED.I.F.D.AAFCGL..HCGL..H..L..JJKK16 ...IJJMM.ILGAA..LGEEEKKGCHHFFFC..DDD17 C.III.C.DGKKAADG...F.GHH.FEEJ.....J.17 ..D.....DC..AAGCILF.GHILFEEHI..KKJJ.17 IIEEEDFKK..DFAALJH..GLJH..GLCC......17 .........DIIJAAD..JG.DKKFG.EECFHHH.C17 ..DDDICCFFJIAA.LJIG..LKKG.EEHHG.MM..18 KFFGJJKM.GHH.MAA.ILEEE.IL.CDDD..C...18 ..NNMMJJGGICAA..ICDDDLI.F..L.KFHHEEK18 J..GG.J..KKHJAA.FHEEE.F...C.F.DDC.II19 I..HH.IJJJMMAA.G.DCKKGLDCE.GL..E.FFF19 FDDD..F.NNCHEAAICHE..ILLJJJI.MKK.GGM19 .II..CLLD..CAAD..CE.FJJJE.FGKKEHHG..19 ..FGGG..FLLH..FAAHKKJJ.H.CCDIIEEED..19 I.KEEEI.KFJJDAAFLCD...LC.MGGGC.M..HH19 DDDGEF..JGEFAAJ..KH....KH.IICC......20 .GGGJ...HDJMAAHDKMIICCKME..LL.E..FF.21 LHHCC.L.IIGDAA.KGDJJJKGD..FEEE..F...21 EEF.....FIIIGAAD.KG..DCKHHJJCK......21 HHGJJC..GE.C.AAE.C...ED..FKKD..FIII.21 ..CCC...HJJJAAHG..MMIGLL.DIEEF.DKK.F22 KIIDL.K.FDLCAAFHMCENNHMJE....JE.GGG.23 JLLMM.J..GIIAA.GDF.EEEDF..K.D.HHK.CC23 ..CCCFDDJ..FAAJ..FIMMEEEILLLGG..KKHH24 J.GGK.J.F.KCAAF..CDDDEECMMHHH..LLLII25 EJJIIIE.C...AAC.FH.KDDFH.KGGFLMMM..L25 GGG..HIICCCH..AA.J..FDDJE.FKLLEMMK..26 .FFDLLJCCDGMJ.AAGMJ.HNNM..HEIIKKKE..26 CNNMMJC.F..JAAFEHGDDDEHG...EKK.IIILL27 IIID..F..DC.F.AAC.KKE.C.LMEGG.LMJJHH27 C..JHHCLLJK.CAADK.MMIDKE..IFFE.GGNN.29 ..GHHHKKG.J.AAF.JDE.FMMDENNL.ICCCL.I30 NNEEELD.II.LDAAHJGDCCHJG..KFFFMMK...30 FFC..E..C..E..CAAEG..DHHGJJD...IID..36 CLLH..CJJH.GAAEH.G..EIIK..E..K.DD.FF38".split(' ').map((e) => ({ s: e.slice(0, 36), m: +e.slice(36) }));
  function fromBank(target, level) {
    const pool = BANK.filter((e) => Math.abs(e.m - target) <= 2), list = pool.length ? pool : BANK.filter((e) => e.m >= target - 2);
    const e = (list.length ? list : BANK)[(level * 7 + k.ri(0, 99)) % (list.length || BANK.length)] || BANK[0], seen = {}, cars = [];
    for (let c = 0; c < 36; c++) { const ch = e.s[c]; if (ch === '.' || seen[ch]) continue; seen[ch] = 1;
      const x = c % N, y = (c / N) | 0, h = x + 1 < N && e.s[c + 1] === ch; let len = 1; while (len < 3 && e.s[h ? c + len : c + len * N] === ch) len++;
      const v = { x, y, len, h }; if (ch === 'A') cars.unshift(v); else cars.push(v); }
    const pos0 = cars.map((v) => (v.h ? v.x : v.y)), p = solvePath(cars, pos0);
    return p ? { cars, pos: pos0, min: p.length } : null;
  }
  /* ---------- estado ---------- */
  let level, cars, pos, start, min, moves, hist, drag, sel, cur, grab, kbMode, t = 0, winT, won, scored, hintUsed, hint, stars, shake = [], bump = 0, total;
  const tgt = (lv) => Math.min(24, 2 + Math.round((lv - 1) * 1.35)), ncars = (lv) => Math.min(13, 4 + Math.floor(lv * 0.7));
  function loadLevel() {
    const g = (tgt(level) >= 3 && fromBank(tgt(level), level)) || generate(tgt(level), ncars(level));
    let ci = 0; cars = g.cars.map((v, i) => ({ ...v, col: i === 0 ? RED : COLS[(ci++ + level * 3) % COLS.length], seed: Math.random() }));
    pos = g.pos.slice(); start = pos.slice(); min = g.min; moves = 0; hist = []; drag = null; sel = 0; cur = { x: pos[0], y: EXIT }; grab = false; winT = 0; won = false; scored = false; hintUsed = false; hint = null;
    cars.forEach((v, i) => { v.vis = pos[i]; v.pop = -i * 0.04; });
  }
  function reset() { level = +lsGet('jam:' + ID + ':lvl', 1) || 1; total = +lsGet('jam:' + ID + ':stars', 0) || 0; loadLevel(); }
  const range = (i) => { const v = cars[i], o = occOf(cars, pos); let lo = pos[i], hi = pos[i];
    const free = (p) => { const cell = v.h ? v.y * N + p : p * N + v.x; return o[cell] < 0 || o[cell] === i; };
    while (lo - 1 >= 0 && free(lo - 1)) lo--; while (hi + v.len < N && free(hi + v.len)) hi++; return [lo, hi]; };
  function commit(i, np) {
    if (np === pos[i]) return;
    hist.push(pos.slice()); pos[i] = np; moves++; hint = null; k.sfx('click');
    if (pos[0] === N - 2) { won = true; winT = 0; k.sfx('coin'); }
  }
  function action(id) {
    if (won) return;
    if (id === 'undo') { if (hist.length) { pos = hist.pop(); moves = Math.max(0, moves - 1); hint = null; grab = false; sel = occOf(cars, pos)[cur.y * N + cur.x]; k.sfx('pop'); } else k.sfx('hit'); }
    else if (id === 'reset') { if (moves) { hist = []; pos = start.slice(); moves = 0; hint = null; grab = false; sel = occOf(cars, pos)[cur.y * N + cur.x]; k.sfx('pop'); } }
    else if (id === 'hint') { const p = solvePath(cars, pos); if (p && p.length) { hint = { i: p[0][0], np: p[0][1], t: 0 }; hintUsed = true; sel = hint.i; { const v = cars[sel]; cur = { x: v.h ? pos[sel] : v.x, y: v.h ? v.y : pos[sel] }; } k.sfx('coin'); } }
  }
  const carAt = (x, y) => { const gx = Math.floor((x - L.bx) / CS), gy = Math.floor((y - L.by) / CS); if (gx < 0 || gy < 0 || gx >= N || gy >= N) return -1; return occOf(cars, pos)[gy * N + gx]; };
  function input(dt) {
    const p = k.ptr;
    for (const b of BTN) b.pt = Math.max(0, b.pt - dt);
    if (p.hit) {
      const b = BTN.find((q) => inRect(p, q, 4));
      if (b) { b.pt = 0.15; action(b.id); }
      else { const i = carAt(p.x, p.y); if (i >= 0) { const [lo, hi] = range(i); drag = { i, lo, hi, p0: pos[i], a0: cars[i].h ? p.x : p.y }; sel = i; cur = { x: Math.floor((p.x - L.bx) / CS), y: Math.floor((p.y - L.by) / CS) }; grab = false; kbMode = false; k.sfx('click'); } }
    }
    if (drag) {
      const v = cars[drag.i], d = ((v.h ? p.x : p.y) - drag.a0) / CS; let f = drag.p0 + d;
      if (f < drag.lo - 0.001 || f > drag.hi + 0.001) { if (bump <= 0) { k.sfx('hit'); bump = 0.35; } }
      f = k.clamp(f, drag.lo, drag.hi); v.vis = f;
      if (drag.i === 0 && drag.hi === N - 2 && f > N - 2.6) { v.vis = N - 2; }
      if (p.up || !p.down) { const np = Math.round(v.vis); if (v.h) cur.x = k.clamp(cur.x + np - pos[drag.i], 0, N - 1); else cur.y = k.clamp(cur.y + np - pos[drag.i], 0, N - 1); commit(drag.i, np); drag = null; }
    }
    // teclado / mando
    const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const n in D) if (k.hit.has(n)) {
      kbMode = true; const [dx, dy] = D[n], v = cars[sel];
      if (grab && v && ((v.h && dx) || (!v.h && dy))) {
        const [lo, hi] = range(sel), np = pos[sel] + (dx || dy);
        if (np >= lo && np <= hi) { hist.push(pos.slice()); pos[sel] = np; if (!grab.moved) { moves++; grab.moved = true; } else hist.pop(); cur.x += dx; cur.y += dy; hint = null; k.sfx('click'); if (pos[0] === N - 2) { won = true; winT = 0; k.sfx('coin'); grab = false; } }
        else { k.sfx('hit'); bump = 0.35; }
      } else { grab = false; cur.x = k.clamp(cur.x + dx, 0, N - 1); cur.y = k.clamp(cur.y + dy, 0, N - 1); sel = occOf(cars, pos)[cur.y * N + cur.x]; k.sfx('click'); }
    }
    if (k.hit.has('a')) { kbMode = true; grab = grab || sel < 0 ? false : { moved: false }; k.sfx(grab ? 'pop' : 'click'); }
    if (k.hit.has('b')) { kbMode = true; grab = false; action('undo'); }
  }
  function update(dt) {
    t += dt; bump = Math.max(0, bump - dt);
    for (let i = 0; i < cars.length; i++) { const v = cars[i]; v.pop = Math.min(1, v.pop + dt * 4); if (!(drag && drag.i === i)) v.vis += (pos[i] - v.vis) * Math.min(1, dt * 18); }
    if (hint) hint.t += dt;
    if (k.st !== 'play') return;
    if (won) {
      winT += dt; const v = cars[0]; v.vis = N - 2 + Math.pow(Math.max(0, winT - 0.15), 2) * 14;
      if (winT > 0.15 && winT - dt <= 0.15) { k.sfx('jump'); k.burst(L.bx + BW, L.by + (EXIT + 0.5) * CS, '#ffd166', 16, 180); }
      if (winT > 0.75 && !scored) {
        scored = true; stars = hintUsed ? Math.min(2, moves <= min ? 3 : moves <= Math.ceil(min * 1.5) + 1 ? 2 : 1) : moves <= min ? 3 : moves <= Math.ceil(min * 1.5) + 1 ? 2 : 1;
        const done = level; total += stars; level++; lsSet('jam:' + ID + ':lvl', level); lsSet('jam:' + ID + ':stars', total);
        k.win(`¡Nivel ${done} superado!`, '#ffd166', `<span style="font-size:1.6em;letter-spacing:.1em;color:#ffd166">${'★'.repeat(stars)}<span style="opacity:.25">${'★'.repeat(3 - stars)}</span></span><br>${moves} movimientos · mínimo ${min}${hintUsed ? ' · con pista' : ''}<br>Estrellas en total: ${total}<br>Toca para el nivel ${level}`, total);
      }
      return;
    }
    input(dt);
  }
  /* ---------- dibujo ---------- */
  const BG = off(W, H, (g) => {
    let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2b3a4f'); gr.addColorStop(1, '#121822'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // aparcamiento: césped y bordillos alrededor
    const r = mulberry(9);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,200,140,${0.04 + r() * 0.05})`; g.beginPath(); g.arc(r() * W, r() * H, 6 + r() * 16, 0, R2); g.fill(); }
    const X = L.bx, Y = L.by;
    g.fillStyle = 'rgba(0,0,0,.35)'; ART.rr(g, X - 14, Y - 8, BW + 28, BW + 28, 16); g.fill();
    ART.rr(g, X - 14, Y - 14, BW + 28, BW + 28, 16); ART.fillOut(g, '#c9cfd8', 3);
    g.fillStyle = '#9aa3b0'; for (let i = 0; i < 12; i++) { g.fillRect(X - 14 + i * (BW + 28) / 12, Y - 14, 2, 10); g.fillRect(X - 14 + i * (BW + 28) / 12, Y + BW + 4, 2, 10); }
    gr = g.createLinearGradient(0, Y, 0, Y + BW); gr.addColorStop(0, '#4a5262'); gr.addColorStop(1, '#3a4150'); ART.rr(g, X - 3, Y - 3, BW + 6, BW + 6, 8); g.fillStyle = gr; g.fill();
    for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)'; g.fillRect(X + r() * BW, Y + r() * BW, 1.5, 1.5); }
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.setLineDash([8, 8]);
    for (let i = 1; i < N; i++) { g.beginPath(); g.moveTo(X + i * CS, Y + 4); g.lineTo(X + i * CS, Y + BW - 4); g.stroke(); g.beginPath(); g.moveTo(X + 4, Y + i * CS); g.lineTo(X + BW - 4, Y + i * CS); g.stroke(); }
    g.setLineDash([]);
    ART.rr(g, X - 3, Y - 3, BW + 6, BW + 6, 8); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
    // salida
    const ey = Y + EXIT * CS; g.fillStyle = '#3a4150'; g.fillRect(X + BW - 2, ey + 3, 20, CS - 6);
    g.fillStyle = '#ffd166'; for (let i = 0; i < 3; i++) { g.beginPath(); const ax = X + BW + 22 + i * 9; g.moveTo(ax, ey + CS / 2 - 8); g.lineTo(ax + 8, ey + CS / 2); g.lineTo(ax, ey + CS / 2 + 8); g.lineTo(ax - 3, ey + CS / 2 + 8); g.lineTo(ax + 5, ey + CS / 2); g.lineTo(ax - 3, ey + CS / 2 - 8); g.closePath(); g.globalAlpha = 0.5 + i * 0.25; g.fill(); } g.globalAlpha = 1;
    g.fillStyle = '#ff4b55'; g.fillRect(X + BW + 2, ey - 2, 5, 6); g.fillRect(X + BW + 2, ey + CS - 4, 5, 6);
    if (!PORT) label('SALIDA', X + BW + 16, ey - 18, 11, '#ffd166', 'left', 'top', g);
  });
  /* Coche/camión: silueta única cacheada (R5 §8); las ruedas son piezas aparte porque ruedan. */
  const carCv = {};
  function carSprite(col, len, Lw, Hh, isRed) {
    const key = col + '|' + len + '|' + Math.round(Lw) + '|' + Math.round(Hh) + '|' + (isRed ? 1 : 0);
    let q = carCv[key]; if (q) return q;
    const m = 5, bw2 = Lw - m * 2, bh2 = Hh - m * 2, pad = 8;
    const wpx = Lw + pad * 2, hpx = Hh + pad * 2, d = Math.ceil(wpx * CDPR), dh = Math.ceil(hpx * CDPR);
    q = document.createElement('canvas'); q.width = d; q.height = dh;
    const g = q.getContext('2d'); g.scale(d / wpx, dh / hpx); g.translate(wpx / 2, hpx / 2);
    g.fillStyle = ART.OUT; for (const fx2 of len === 3 ? [-0.36, 0, 0.36] : [-0.3, 0.3]) for (const sy of [-1, 1]) { ART.rr(g, fx2 * bw2 - 7, sy * bh2 / 2 - 4, 14, 8, 3); g.fill(); }
    const parts = [[(h) => ART.rr(h, -bw2 / 2, -bh2 / 2, bw2, bh2, 11), col]];
    uni(g, parts, 1.5);
    celp(g, parts, col, bh2 * 0.24, bh2 * 0.24);
    inpath(g, parts, (h) => {
      if (len === 3) { const cab = bw2 * 0.3;
        h.fillStyle = ART.lite(col, 0.18); ART.rr(h, -bw2 / 2 + cab + 3, -bh2 / 2 + 4, bw2 - cab - 7, bh2 - 8, 6); h.fill();
        h.strokeStyle = ART.dark(col, 0.3); h.lineWidth = 1.5; for (let i = 1; i < 5; i++) { const lx = -bw2 / 2 + cab + 3 + i * (bw2 - cab - 7) / 5; h.beginPath(); h.moveTo(lx, -bh2 / 2 + 7); h.lineTo(lx, bh2 / 2 - 7); h.stroke(); }
        h.fillStyle = '#a8e4ff'; ART.rr(h, -bw2 / 2 + 6, -bh2 / 2 + 6, cab - 8, bh2 - 12, 4); h.fill();
      } else {
        h.fillStyle = ART.dark(col, 0.42); ART.rr(h, -bw2 * 0.22, -bh2 / 2 + 3.5, bw2 * 0.5, bh2 - 7, 7); h.fill();
        h.fillStyle = '#a8e4ff'; ART.rr(h, bw2 * 0.1, -bh2 / 2 + 6, bw2 * 0.16, bh2 - 12, 4); h.fill();
        h.fillStyle = '#86c6e6'; ART.rr(h, -bw2 * 0.32, -bh2 / 2 + 6.5, bw2 * 0.13, bh2 - 13, 3); h.fill();
      }
      h.fillStyle = '#fff6b0'; for (const sy of [-1, 1]) { h.beginPath(); h.arc(bw2 / 2 - 4, sy * (bh2 / 2 - 7), 3, 0, R2); h.fill(); }
      h.fillStyle = '#ff4b55'; for (const sy of [-1, 1]) { ART.rr(h, -bw2 / 2 + 1, sy * (bh2 / 2 - 7) - 3, 4, 6, 1.5); h.fill(); }
    });
    spec(g, -bw2 * 0.1, -bh2 / 2 + 4.5, bw2 * 0.3, 2.2, 0, 0.42);
    if (isRed && len !== 3) { g.save(); g.translate(bw2 * 0.36, 0); g.rotate(-Math.PI / 2); g.beginPath(); for (let i = 0; i < 10; i++) { const a2 = i * Math.PI / 5, r2 = i % 2 ? 3 : 7; g.lineTo(Math.sin(a2) * r2, -Math.cos(a2) * r2); } g.closePath(); ART.fillOut(g, '#ffd166', 1.6); g.restore(); }
    carCv[key] = q; return q;
  }
  function drawCar(v, x, y, w, h, isRed, selK) {
    const vert = !v.h, len = v.len;
    c.save(); c.translate(x + w / 2, y + h / 2); if (vert) c.rotate(Math.PI / 2);
    const Lw = vert ? h : w, Hh = vert ? w : h, m = 5, bw2 = Lw - m * 2, bh2 = Hh - m * 2, pad = 8;
    c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, -bw2 / 2 + 3, -bh2 / 2 + 5, bw2, bh2, 10); c.fill();
    c.drawImage(carSprite(v.col, len, Lw, Hh, isRed), -Lw / 2 - pad, -Hh / 2 - pad, Lw + pad * 2, Hh + pad * 2);
    c.restore();
    if (selK) { ART.rr(c, x + 2, y + 2, w - 4, h - 4, 12); c.lineWidth = 3.5; c.strokeStyle = grab ? '#7cf7a0' : '#ffd166'; c.globalAlpha = 0.65 + 0.35 * Math.sin(t * 7); c.stroke(); c.globalAlpha = 1;
      if (grab) { c.fillStyle = '#7cf7a0'; const cx = x + w / 2, cy = y + h / 2; for (const s of [-1, 1]) { c.beginPath(); if (v.h) { c.moveTo(cx + s * (w / 2 + 12), cy); c.lineTo(cx + s * (w / 2 + 3), cy - 7); c.lineTo(cx + s * (w / 2 + 3), cy + 7); } else { c.moveTo(cx, cy + s * (h / 2 + 12)); c.lineTo(cx - 7, cy + s * (h / 2 + 3)); c.lineTo(cx + 7, cy + s * (h / 2 + 3)); } c.closePath(); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); } } }
  }
  function draw() {
    c.drawImage(BG, 0, 0, W, H);
    c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
    cars.forEach((v, i) => {
      if (v.pop <= 0) return; const s = v.pop < 1 ? 0.6 + 0.4 * Math.sin(v.pop * 1.8) / Math.sin(1.8) : 1;
      const x = L.bx + (v.h ? v.vis : v.x) * CS, y = L.by + (v.h ? v.y : v.vis) * CS, w = v.h ? v.len * CS : CS, h = v.h ? CS : v.len * CS;
      c.save(); c.translate(x + w / 2, y + h / 2); c.scale(s, s); c.translate(-x - w / 2, -y - h / 2);
      drawCar(v, x, y, w, h, i === 0, kbMode && sel === i && k.st === 'play' && !won);
      c.restore();
    });
    if (kbMode && sel < 0 && k.st === 'play' && !won) { ART.rr(c, L.bx + cur.x * CS + 4, L.by + cur.y * CS + 4, CS - 8, CS - 8, 10); c.lineWidth = 3; c.strokeStyle = '#ffd166'; c.globalAlpha = 0.5 + 0.4 * Math.sin(t * 7); c.stroke(); c.globalAlpha = 1; }
    if (hint && !won) { const v = cars[hint.i], a = 0.5 + 0.5 * Math.sin(hint.t * 8), x = L.bx + (v.h ? hint.np : v.x) * CS, y = L.by + (v.h ? v.y : hint.np) * CS;
      ART.rr(c, x + 3, y + 3, (v.h ? v.len : 1) * CS - 6, (v.h ? 1 : v.len) * CS - 6, 10); c.setLineDash([6, 5]); c.lineWidth = 3; c.strokeStyle = `rgba(124,247,160,${0.4 + a * 0.6})`; c.stroke(); c.setLineDash([]); }
    c.restore();
    // marcador
    if (PORT) {
      label(`Nivel ${level}`, 20, 30, 28, '#fff'); label(`Movimientos ${moves}`, 20, 72, 16, '#dfe6f0'); label(`Mínimo ${min}`, 20, 96, 16, '#ffd166');
      label(`★ ${total}`, W - 20, 36, 22, '#ffd166', 'right');
      label('Saca el coche rojo', W / 2, 482, 14, 'rgba(255,255,255,.7)', 'center');
      label('Flechas eligen · A agarra · B deshace', W / 2, 596, 11, 'rgba(255,255,255,.45)', 'center');
    } else {
      label(`Nivel ${level}`, 20, 40, 26, '#fff'); label(`Movimientos ${moves}`, 20, 84, 15, '#dfe6f0'); label(`Mínimo ${min}`, 20, 106, 15, '#ffd166');
      label(`★ ${total}`, 20, 140, 20, '#ffd166');
      label('Saca el coche', 20, 250, 13, 'rgba(255,255,255,.6)'); label('rojo por la salida', 20, 268, 13, 'rgba(255,255,255,.6)');
    }
    for (const b of BTN) button(b, b.pt > 0, won || (b.id === 'undo' && !hist.length) || (b.id === 'reset' && !moves));
  }
  window.__rj = { get cars() { return cars; }, get pos() { return pos; }, get min() { return min; }, get moves() { return moves; }, get sel() { return sel; }, get cur() { return cur; }, get grab() { return !!grab; }, path: () => solvePath(cars, pos), get level() { return level; } };
  reset();
  k.show(CFG.title || 'Atasco', 'Desliza coches y camiones por su carril para abrir paso al coche rojo hasta la salida. Iguala el mínimo de movimientos para ganar tres estrellas. Teclado: flechas eligen, A agarra y suelta, B deshace.<br>Toca para jugar');
  k.run((dt) => { if (!k.gate(reset)) { update(dt); return; } update(dt); }, draw);
}

if (MODE === 'jam') jamGame(); else blocksGame();
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight >= innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
