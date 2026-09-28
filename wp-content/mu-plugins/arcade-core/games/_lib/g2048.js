/* 2048 (CFG.hex = false|true). Fichas con relieve cacheadas, deslizamiento interpolado, fusión con "pop",
 * fantasmas de las fichas absorbidas, aparición elástica y récord en vivo.
 * 2048-classic añade los 20 RETOS a mano de src/eng/g2048lv.js (plan Friv, tanda 3): rejilla de
 * 3/4/5, muros, hielo, comodines, movimientos contados y direcciones prohibidas, con progreso
 * guardado por dificultad y modo libre aparte. 2048-hex no los mira: sigue exactamente igual. */
const HEX = !!CFG.hex, W = 480, H = 560, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#241a3d', help: CFG.hex ? '' : 'Desliza (o usa las flechas) y todas las fichas corren a ese lado; las del mismo número se juntan en una del doble. Cada reto pide un número: lo tienes arriba, en «Objetivo». La piedra no se mueve, el hielo se rompe si dos fichas se juntan justo al lado y la estrella se une con cualquier ficha.' }), c = k.ctx;
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
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.7 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(14,8,30,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); g.fill(); }
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms); /* 1.23: la pantalla final espera si el juego está en pausa */
const COL = { 2: '#f6eee2', 4: '#f3e1c2', 8: '#ffb066', 16: '#ff8c4a', 32: '#ff6b5b', 64: '#f0463c', 128: '#ffd84d', 256: '#ffc83a', 512: '#ffb61f', 1024: '#7ee07a', 2048: '#5ce1e6', 4096: '#b98cff', 8192: '#ff5fa2' };
const tcol = (v) => COL[v] || '#6c8cff';
/* ---------- Retos (solo 2048-classic) ---------- */
const LVS = (!HEX && typeof G2048LV !== 'undefined' && G2048LV.L && G2048LV.L[CFG.id]) || null;
let free = !LVS, wantFree = false;

let cells, tiles, score, anim, ghosts, bestV, overT, nudge, moves, rescues, why;
let N = 4, CS = 90, GAP = 10, walls = {}, lv = null, goal = 0, mvMax = 0, ban = [], bag = null, won = false, banT = 0, banW = 0;
const SQ_D = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };
const HX_D = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const R = 50, SQ3 = Math.sqrt(3), BX = 42, BY = 134, BS = 396; /* caja interior del tablero */
const DIRS = () => (HEX ? HX_D : [[1, 0], [-1, 0], [0, 1], [0, -1]]);
function px(cl) { if (typeof cl === 'string') cl = cl.split(',').map(Number); if (!HEX) return [BX + GAP + cl[0] * (CS + GAP) + CS / 2, BY + GAP + cl[1] * (CS + GAP) + CS / 2]; return [240 + R * SQ3 * (cl[0] + cl[1] / 2), 335 + R * 1.5 * cl[1]]; }
const key = (a) => a[0] + ',' + a[1];
function curLv() { return (LVS && !free) ? LVS[Math.max(0, Math.min(LVS.length - 1, (k.lv || 1) - 1))] : null; }
function build() {
  cells = []; walls = {};
  if (HEX) { for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) cells.push([q, r]); N = 5; CS = 90; GAP = 10; return; }
  N = (lv && lv.g) || 4;
  GAP = N === 3 ? 14 : N === 4 ? 10 : 8; CS = (BS - GAP * (N + 1)) / N;
  const rows = (lv && lv.b) ? lv.b.map((r) => r.trim().split(/\s+/)) : null;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (rows && G2048LV.token(rows[y][x]) === 'wall') { walls[x + ',' + y] = 1; continue; }
    cells.push([x, y]);
  }
}
/* Dificultad: la probabilidad de que salga un 4 (fácil 5 %, normal 10 %, difícil 20 %). */
const P2 = () => (k.dif === 0 ? 0.95 : k.dif === 2 ? 0.8 : 0.9);
function add() {
  const empty = cells.filter((cl) => !tiles[key(cl)]); if (!empty.length) return;
  const cl = k.pick(empty); let v = 2, w = false;
  if (bag) { const p = k.pick(bag); if (p === '*') { w = true; v = 0; } else v = p; }
  else v = Math.random() < P2() ? 2 : 4;
  tiles[key(cl)] = { v, w, fz: false, dv: v, dw: w, from: px(cl), a: 1, pop: 0, grow: -0.1 };
}
const maxv = () => { let m = 0; for (const kk in tiles) if (tiles[kk].v > m) m = tiles[kk].v; return m; };

/* ---------- Gráficos cacheados ---------- */
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const t = f < 0 ? 0 : 255, p = Math.abs(f); r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b); return `rgb(${r},${g},${b})`; }
function hexPath(g, x, y, r) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
function label(s, x, y, size, col, align, base) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function fit(s, max, font) { c.font = font; if (c.measureText(s).width <= max) return s; let t = s; while (t.length > 3 && c.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; }
function wrap(s, max, font) { c.font = font; const ws = s.split(' '), out = []; let ln = '';
  for (let i = 0; i < ws.length; i++) { const t = ln ? ln + ' ' + ws[i] : ws[i]; if (ln && c.measureText(t).width > max) { out.push(ln); ln = ws[i]; } else ln = t; }
  if (ln) out.push(ln); return out; }
const spr = {}, SP = 70; /* medio lado del sprite (el cuerpo mide 90) */
function tileSprite(v, w) {
  const id = w ? 'W' : v; if (spr[id]) return spr[id];
  const cv = document.createElement('canvas'); cv.width = cv.height = SP * 4; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(SP, SP);
  const col = w ? '#b98cff' : tcol(v);
  if (w || v >= 128) { const gl = g.createRadialGradient(0, 0, 20, 0, 0, SP); gl.addColorStop(0, shade(col, 0.2)); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.globalAlpha = 0.55; g.fillStyle = gl; g.fillRect(-SP, -SP, SP * 2, SP * 2); g.globalAlpha = 1; }
  const body = (h) => { if (HEX) { h.moveTo(Math.cos(Math.PI / 6) * 45, Math.sin(Math.PI / 6) * 45); for (let i = 1; i < 6; i++) { const an = Math.PI / 6 + i * Math.PI / 3; h.lineTo(Math.cos(an) * 45, Math.sin(an) * 45); } h.closePath(); } else ART.rr(h, -45, -45, 90, 90, 14); };
  const parts = [[body, col]];
  contact(g, 0, HEX ? 44 : 47, 36, 8, 0.3);
  uni(g, parts, 1.6);
  celp(g, parts, col, 9, 9);
  spec(g, HEX ? -16 : -22, -25, HEX ? 12 : 15, 5.4, -0.5, 0.5);
  if (w) { /* comodín: una sola estrella (pieza única) */
    const st = (h) => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 13 : 30; h.lineTo(Math.cos(a) * r, Math.sin(a) * r + 1); } h.closePath(); };
    uni(g, [[st, '#ffd84d']], 1.6); celp(g, [[st, '#ffd84d']], '#ffd84d', 5, 5);
  } else {
    const s = String(v), fs = s.length <= 2 ? (HEX ? 36 : 42) : s.length === 3 ? (HEX ? 30 : 35) : s.length === 4 ? (HEX ? 23 : 27) : 20;
    g.font = `900 ${fs}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (v <= 4) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(s, 0, -2); g.fillStyle = '#6b5647'; g.fillText(s, 0, -4); }
    else { g.lineWidth = fs / 5 + 2; g.strokeStyle = OUT; g.strokeText(s, 0, -3); g.fillStyle = '#fff'; g.fillText(s, 0, -4); }
  }
  return (spr[id] = cv);
}
function iceSprite() {
  if (spr.ice) return spr.ice;
  const cv = document.createElement('canvas'); cv.width = cv.height = SP * 4; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(SP, SP);
  g.globalAlpha = 0.34; ART.rr(g, -45, -45, 90, 90, 14); g.fillStyle = '#9fe4ff'; g.fill(); g.globalAlpha = 1;
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#eaf9ff'; g.lineWidth = 3.4; g.globalAlpha = 0.7;
  g.beginPath(); g.moveTo(-40, 6); g.lineTo(-26, -18); g.lineTo(-16, -6); g.lineTo(-4, -30); g.stroke();
  g.beginPath(); g.moveTo(-6, 40); g.lineTo(14, 26); g.lineTo(38, 34); g.stroke(); g.globalAlpha = 1;
  ART.rr(g, -43, -43, 86, 86, 13); g.strokeStyle = '#dff5ff'; g.lineWidth = 5; g.stroke();
  return (spr.ice = cv);
}
let bgCv, bgKey = '';
function makeBg() {
  const sig = HEX ? 'hex' : N + '|' + Object.keys(walls).sort().join(';');
  if (bgCv && bgKey === sig) return bgCv; bgKey = sig;
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a2a5e'); gr.addColorStop(1, '#1b1430'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let y = 0; y < H; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < W; x += 24) { g.beginPath(); g.arc(x, y, 2, 0, 6.283); g.fill(); }
  const vg = g.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 420); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // tablero
  if (!HEX) {
    const rr = CS * 0.155;
    g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, BX - 4, BY + 8, BS + 8, BS + 8, 22); g.fill();
    ART.rr(g, BX - 6, BY - 6, BS + 12, BS + 12, 22); ART.fillOut(g, '#6a5a8e', 4); ART.rr(g, BX, BY, BS, BS, 17); g.fillStyle = '#54467a'; g.fill();
    for (const cl of cells) { const [x, y] = px(cl); ART.rr(g, x - CS / 2, y - CS / 2, CS, CS, rr); g.fillStyle = '#3e3361'; g.fill(); ART.rr(g, x - CS / 2, y - CS / 2, CS, CS * 0.07, 3); g.fillStyle = 'rgba(0,0,0,.22)'; g.fill(); }
    /* muros de piedra: una sola pieza por casilla (R5 §8) */
    for (const kk in walls) { const [x, y] = px(kk), s = CS / 2;
      const body = (h) => ART.rr(h, x - s, y - s, CS, CS, rr);
      contact(g, x, y + s - 3, s * 0.72, s * 0.16, 0.34);
      uni(g, [[body, '#8b8095']], 1.7); celp(g, [[body, '#8b8095']], '#8b8095', CS * 0.1, CS * 0.1);
      /* hiladas de sillería: solo sombra propia, sin contornos cerrados dentro (R5 §8) */
      g.fillStyle = 'rgba(26,21,48,.26)'; const th = Math.max(2, CS * 0.045);
      g.fillRect(x - s * 0.78, y - s * 0.26, CS * 0.78, th); g.fillRect(x - s * 0.78, y + s * 0.3, CS * 0.78, th);
      g.fillRect(x - s * 0.16, y - s * 0.78, th, CS * 0.26); g.fillRect(x + s * 0.26, y - s * 0.26, th, CS * 0.28); g.fillRect(x - s * 0.34, y + s * 0.3, th, CS * 0.24);
    }
  } else {
    for (const cl of cells) { const [x, y] = px(cl); hexPath(g, x, y + 7, 58); g.fillStyle = 'rgba(0,0,0,.3)'; g.fill(); }
    for (const cl of cells) { const [x, y] = px(cl); hexPath(g, x, y, 58); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); }
    for (const cl of cells) { const [x, y] = px(cl); hexPath(g, x, y, 57); g.fillStyle = '#6a5a8e'; g.fill(); }
    for (const cl of cells) { const [x, y] = px(cl); hexPath(g, x, y, 47); g.fillStyle = '#3e3361'; g.fill(); hexPath(g, x, y - 2, 44); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 3; g.stroke(); }
  }
  return (bgCv = cv);
}

/* ---------- Lógica ---------- */
let banMsg = 0;
function slide(d, name) {
  if (overT || won) return;
  if (name && ban.indexOf(name) >= 0) { nudge = [d[0] * 7, d[1] * 7]; if (banMsg <= 0) { banMsg = 1.2; k.float('¡Arriba no!', W / 2, BY + BS / 2, '#ff8c4a'); k.sfx('hurt'); } return; }
  const vp = HEX ? [SQ3 * (d[0] + d[1] / 2), 1.5 * d[1]] : d;
  for (const cl of cells) { const t = tiles[key(cl)]; if (t) { t.from = px(cl); t.dv = t.v; t.dw = t.w; t.grow = 1; } }
  const P = G2048LV.plan(cells, tiles, d, vp, DIRS());
  if (!P.moved) { nudge = HEX ? [vp[0] * 4, vp[1] * 4] : [d[0] * 7, d[1] * 7]; return; }
  ghosts = []; const nt = {};
  for (const kk in P.board) {
    const r = P.board[kk], t = tiles[r.keep];
    if (r.eat) { const e = tiles[r.eat]; ghosts.push({ v: e.dv, w: e.dw, from: e.from, to: px(kk), a: 0 }); t.burst = 1; }
    t.v = r.v; t.w = r.w; t.fz = r.fz; t.a = 0; nt[kk] = t;
  }
  tiles = nt; score += P.gained; moves++; banT = Math.min(banT, 0.6);
  for (let i = 0; i < P.uf.length; i++) { const [x, y] = px(P.uf[i]); k.burst(x, y, '#9fe4ff', 10, 120); k.float('¡Hielo roto!', x, y - CS * 0.45, '#9fe4ff'); }
  k.sfx(ghosts.length ? 'pop' : 'click');
  add();
  if (goal && maxv() >= goal) { won = true; k.shake(4); later(() => { if (k.st === 'play') k.levelDone(score, `Objetivo ${goal} logrado en ${moves} movimientos · ${score} puntos`); }, 480); return; }
  if (!goal && maxv() >= 2048 && !anim) { anim = 1; later(() => { if (k.st === 'play') { k.show('¡2048!', 'Sigue jugando para más puntos'); later(() => { if (k.st === 'play') k.hide(); }, 1400); } }, 250); }
  if (mvMax && moves >= mvMax) { why = 'mov'; overT = 0.6; return; }
  if (!G2048LV.alive(cells, tiles, DIRS())) { if (rescues > 0) rescue(); else { why = 'block'; overT = 0.6; } }
}
/* Dificultad: k.D.life = 1 rescate en fácil (0 en normal y difícil, donde nada cambia).
   Al quedarse sin movimientos se retiran las tres fichas más pequeñas y la partida sigue. */
function rescue() {
  rescues--;
  const list = cells.map((cl) => [key(cl), tiles[key(cl)]]).filter((e) => e[1] && !e[1].fz).sort((a2, b2) => a2[1].v - b2[1].v).slice(0, 3);
  for (const [kk, t2] of list) { const [x, y] = px(kk); k.burst(x, y, '#ffd84d', 10, 130); delete tiles[kk]; }
  k.float('¡Rescate!', W / 2, H / 2 - 40, '#ffd84d'); k.sfx('win'); k.shake(3);
}
function reset() {
  lv = curLv(); build();
  tiles = {}; score = 0; rescues = k.D.life; anim = 0; ghosts = []; overT = 0; nudge = [0, 0]; moves = 0; won = false; why = ''; banMsg = 0;
  const t = lv ? G2048LV.tune(lv, k.dif) : null;
  goal = t ? t.goal : 0; mvMax = t ? t.mv : 0; ban = (lv && lv.ban) || []; bag = (lv && lv.sp) || null;
  banT = lv ? 4.4 : 0;
  if (lv && lv.b) {
    const rows = lv.b.map((r) => r.trim().split(/\s+/));
    for (const cl of cells) { const tk = G2048LV.token(rows[cl[1]][cl[0]]); if (tk && tk !== 'wall') tiles[key(cl)] = { v: tk.v, w: !!tk.w, fz: !!tk.fz, dv: tk.v, dw: !!tk.w, from: px(cl), a: 1, pop: 0, grow: -0.1 }; }
  } else { add(); add(); }
  bestV = k.best(CFG.id, 0); makeBg();
}
if (LVS) { k.levels(LVS.length); k.onLevel = () => { if (wantFree) { free = true; wantFree = false; } else free = false; reset(); }; }
k.onDif = () => { if (k.st !== 'play') reset(); };
reset();
k.show(CFG.title, HEX ? 'Desliza en 6 direcciones (teclado: flechas + Q E Z C; mando: flechas, A arriba-derecha y B abajo-izquierda) para unir fichas iguales.'
  : LVS ? '20 retos a mano: rejillas distintas, muros, hielo, comodines y movimientos contados.' : 'Desliza o usa las flechas para unir fichas iguales. Llega a 2048.');
/* Botón «Modo libre» añadido al menú del kit (el kit ignora los data-m que no conoce). */
if (LVS) {
  const ov = document.getElementById('ov');
  const addFree = () => {
    if (k.st !== 'ready' || k.paused) return;
    const m = ov.querySelector('.card .menu'); if (!m || !m.querySelector('[data-m="play"]') || m.querySelector('[data-m="free"]')) return;
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-m', 'free'); b.textContent = 'Modo libre'; m.appendChild(b);
  };
  new MutationObserver(addFree).observe(ov, { childList: true, subtree: true });
  ov.addEventListener('pointerdown', (e) => { const t = e.target && e.target.closest && e.target.closest('[data-m="free"]'); if (!t) return; wantFree = true; k.goLevel(k.lv); });
  addFree();
}
const HEXKEY = { KeyQ: 2, KeyE: 1, KeyZ: 4, KeyC: 5 };
addEventListener('keydown', (e) => { if (HEX && k.st === 'play' && !k.paused && HEXKEY[e.code] !== undefined) slide(HX_D[HEXKEY[e.code]]); });
const easeBack = (t) => { const s = 1.9; t -= 1; return t * t * ((s + 1) * t + s) + 1; };
k.run((dt) => {
  for (const kk in tiles) {
    const t = tiles[kk];
    if (t.a < 1) { t.a = Math.min(1, t.a + dt / 0.11); if (t.a >= 1 && (t.dv !== t.v || t.dw !== t.w)) { t.dv = t.v; t.dw = t.w; t.pop = 1; } }
    else if (t.grow < 1) t.grow = Math.min(1, t.grow + dt / 0.16);
    if (t.a >= 1 && t.burst) { t.burst = 0; const [x, y] = px(kk); k.burst(x, y, tcol(t.v), t.v >= 128 ? 16 : 8, t.v >= 128 ? 170 : 110); k.float('+' + t.v, x, y - CS * 0.38, t.v >= 128 ? '#fff38a' : '#fff'); if (t.v >= 512) k.shake(3); }
    t.pop = Math.max(0, t.pop - dt / 0.2);
  }
  for (const gh of ghosts) gh.a = Math.min(1, gh.a + dt / 0.11);
  nudge = [nudge[0] * (1 - dt * 12), nudge[1] * (1 - dt * 12)];
  if (banMsg > 0) banMsg -= dt;
  if (!k.gate(reset)) return;
  if (banT > 0) banT -= dt;
  if (overT) { overT -= dt; if (overT <= 0) { overT = 0;
    const head = why === 'mov' ? 'Se acabaron los movimientos' : 'Sin movimientos';
    k.lose(CFG.id, score, head, goal ? `Reto ${k.lv}: faltaba llegar a ${goal} (ibas por ${maxv()})` : `Mayor ficha ${maxv()}`); } return; }
  if (k.ptr.up) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy; if (Math.hypot(dx, dy) * k.scale > 24) {
    if (HEX) { const a = Math.atan2(-dy, dx); const i = ((Math.round(a / (Math.PI / 3)) % 6) + 6) % 6; /* 0=E,1=NE,2=NW,3=W,4=SW,5=SE */ slide(HX_D[i]); }
    else { const nm = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); slide(SQ_D[nm], nm); } } }
  if (!HEX) { for (const d of ['up', 'down', 'left', 'right']) if (k.hit.has(d)) slide(SQ_D[d], d); }
  else { if (k.hit.has('left')) slide([-1, 0]); if (k.hit.has('right')) slide([1, 0]); if (k.hit.has('up')) slide(k.held.has('right') ? [1, -1] : [0, -1]); if (k.hit.has('down')) slide(k.held.has('left') ? [-1, 1] : [0, 1]);
    if (k.party && k.hit.has('a')) slide([1, -1]); if (k.party && k.hit.has('b')) slide([-1, 1]); } /* mando: ↑ arriba-izq., ↓ abajo-der., A arriba-der., B abajo-izq. */
}, () => {
  c.drawImage(bgCv, 0, 0, W, H);
  /* HUD: columna izquierda (≤215 px) y marcadores a la derecha; el centro de arriba es del kit. */
  const box = (x, t, v, col) => { c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, x, 21, 84, 54, 12); c.fill(); ART.rr(c, x, 17, 84, 54, 12); ART.fillOut(c, col || '#54467a', 3);
    c.font = '800 11px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = '#c9bfe8'; c.fillText(t, x + 42, 24); label(String(v), x + 42, 38, String(v).length > 5 ? 18 : 22, '#fff', 'center'); };
  if (lv) {
    label(`Reto ${k.lv}/${LVS.length}`, 20, 18, 23, '#ffd84d');
    c.font = '700 14px -apple-system,Segoe UI,Roboto,sans-serif'; c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(fit(lv.name, 200, '700 14px -apple-system,Segoe UI,Roboto,sans-serif'), 21, 48);
    c.font = '700 14px -apple-system,Segoe UI,Roboto,sans-serif'; c.fillStyle = '#9fe4ff';
    c.fillText(`Objetivo: ${goal}` + (ban.length ? ' · sin subir' : ''), 21, 70);
    box(302, 'PUNTOS', score);
    if (mvMax) { const left = Math.max(0, mvMax - moves); box(390, 'MOVIM.', left, left <= 10 ? '#f0463c' : '#54467a'); }
    else box(390, 'MAYOR', maxv());
  } else {
    label(CFG.title, 20, 62, 24, '#ffd84d'); c.font = '600 13px -apple-system,Segoe UI,Roboto,sans-serif'; c.fillStyle = '#c9bfe8'; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(HEX ? 'Une fichas iguales en 6 direcciones' : 'Une fichas iguales hasta 2048', 22, 96);
    box(302, 'PUNTOS', score); box(390, 'RÉCORD', Math.max(bestV, score));
  }
  c.save(); c.translate(nudge[0], nudge[1]);
  const ease = (a) => 1 - (1 - a) * (1 - a), f = HEX ? 1 : CS / 90;
  for (const gh of ghosts) { const a = ease(gh.a); if (gh.a >= 1) continue; const x = gh.from[0] + (gh.to[0] - gh.from[0]) * a, y = gh.from[1] + (gh.to[1] - gh.from[1]) * a, z = SP * f; c.drawImage(tileSprite(gh.v, gh.w), x - z, y - z, z * 2, z * 2); }
  for (const cl of cells) { const t = tiles[key(cl)]; if (!t) continue; const [tx, ty] = px(cl), a = ease(t.a), x = t.from[0] + (tx - t.from[0]) * a, y = t.from[1] + (ty - t.from[1]) * a;
    let s = 1 + Math.sin(t.pop * Math.PI) * 0.16; if (t.grow < 1) s = t.grow <= 0 ? 0 : easeBack(t.grow); if (s <= 0.01) continue;
    const z = SP * s * f; c.drawImage(tileSprite(t.dv, t.dw), x - z, y - z, z * 2, z * 2);
    if (t.fz) c.drawImage(iceSprite(), x - z, y - z, z * 2, z * 2); }
  c.restore();
  /* Cartel de los primeros segundos: qué enseña el reto. */
  if (lv && banT > 0) {
    const al = Math.min(1, banT / 0.8), fb = '600 14px -apple-system,Segoe UI,Roboto,sans-serif';
    const ls = wrap(lv.tip, 360, fb), hgt = 52 + ls.length * 19, y0 = BY + (BS - hgt) / 2;
    c.save(); c.globalAlpha = al;
    c.fillStyle = 'rgba(12,8,26,.86)'; ART.rr(c, 40, y0, 400, hgt, 16); ART.fillOut(c, 'rgba(12,8,26,.9)', 3);
    label(lv.name, W / 2, y0 + 12, 19, '#ffd84d', 'center');
    c.font = fb; c.fillStyle = '#dcd5f0'; c.textAlign = 'center'; c.textBaseline = 'top';
    for (let i = 0; i < ls.length; i++) c.fillText(ls[i], W / 2, y0 + 42 + i * 19);
    c.restore();
  }
  if (overT) { c.fillStyle = `rgba(20,12,40,${0.5 * (1 - overT / 0.6)})`; c.fillRect(0, 0, W, H); }
});
