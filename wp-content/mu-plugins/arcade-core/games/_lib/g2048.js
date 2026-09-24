/* 2048 (CFG.hex = false|true). Fichas con relieve cacheadas, deslizamiento interpolado, fusión con "pop",
 * fantasmas de las fichas absorbidas, aparición elástica y récord en vivo. */
const HEX = !!CFG.hex, W = 480, H = 560, OUT = ART.OUT, k = Kit({ w: W, h: H, title: CFG.title, bg: '#241a3d' }), c = k.ctx;
const COL = { 2: '#f6eee2', 4: '#f3e1c2', 8: '#ffb066', 16: '#ff8c4a', 32: '#ff6b5b', 64: '#f0463c', 128: '#ffd84d', 256: '#ffc83a', 512: '#ffb61f', 1024: '#7ee07a', 2048: '#5ce1e6', 4096: '#b98cff', 8192: '#ff5fa2' };
const tcol = (v) => COL[v] || '#6c8cff';
let cells, tiles, score, anim, ghosts, bestV, overT, nudge, moves;
const SQ_D = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };
const HX_D = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const CELL = 90, R = 50, SQ3 = Math.sqrt(3);
function px(cl) { if (!HEX) return [91 + cl[0] * 100, 183 + cl[1] * 100]; return [240 + R * SQ3 * (cl[0] + cl[1] / 2), 335 + R * 1.5 * cl[1]]; }
function build() { cells = []; if (HEX) { for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) cells.push([q, r]); } else for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) cells.push([x, y]); }
const key = (a) => a[0] + ',' + a[1];
function add() { const empty = cells.filter((cl) => !tiles[key(cl)]); if (!empty.length) return; const cl = k.pick(empty), v = Math.random() < 0.9 ? 2 : 4; tiles[key(cl)] = { v, dv: v, from: px(cl), a: 1, pop: 0, grow: -0.1 }; }

/* ---------- Gráficos cacheados ---------- */
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const t = f < 0 ? 0 : 255, p = Math.abs(f); r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b); return `rgb(${r},${g},${b})`; }
function hexPath(g, x, y, r) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
function label(s, x, y, size, col, align, base) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = base || 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
const spr = {}, SP = 70; /* medio lado del sprite */
function tileSprite(v) {
  if (spr[v]) return spr[v];
  const cv = document.createElement('canvas'); cv.width = cv.height = SP * 4; const g = cv.getContext('2d'); g.scale(2, 2); g.translate(SP, SP);
  const col = tcol(v), dark = shade(col, -0.3);
  if (v >= 128) { const gl = g.createRadialGradient(0, 0, 20, 0, 0, SP); gl.addColorStop(0, shade(col, 0.2)); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.globalAlpha = 0.55; g.fillStyle = gl; g.fillRect(-SP, -SP, SP * 2, SP * 2); g.globalAlpha = 1; }
  const body = (dy, inset) => HEX ? hexPath(g, 0, dy, 45 - inset) : ART.rr(g, -45 + inset, -45 + inset + dy, 90 - inset * 2, 90 - inset * 2, 14 - inset / 2);
  body(0, 0); ART.fillOut(g, dark, 3);
  g.save(); body(-5, 3); g.clip(); const gr = g.createLinearGradient(0, -45, 0, 40); gr.addColorStop(0, shade(col, 0.22)); gr.addColorStop(1, col); g.fillStyle = gr; g.fillRect(-50, -55, 100, 100);
  g.fillStyle = 'rgba(255,255,255,.32)'; if (HEX) { g.beginPath(); g.ellipse(0, -26, 26, 9, 0, 0, 6.283); g.fill(); } else { ART.rr(g, -36, -40, 72, 13, 6.5); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(HEX ? -20 : -30, HEX ? -18 : -26, 3.5, 0, 6.283); g.fill(); g.restore();
  const s = String(v), fs = s.length <= 2 ? (HEX ? 36 : 42) : s.length === 3 ? (HEX ? 30 : 35) : s.length === 4 ? (HEX ? 23 : 27) : 20;
  g.font = `900 ${fs}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (v <= 4) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(s, 0, -2); g.fillStyle = '#6b5647'; g.fillText(s, 0, -4); }
  else { g.lineWidth = fs / 5 + 2; g.strokeStyle = OUT; g.strokeText(s, 0, -3); g.fillStyle = '#fff'; g.fillText(s, 0, -4); }
  return (spr[v] = cv);
}
let bgCv;
function makeBg() {
  const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const g = cv.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a2a5e'); gr.addColorStop(1, '#1b1430'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let y = 0; y < H; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < W; x += 24) { g.beginPath(); g.arc(x, y, 2, 0, 6.283); g.fill(); }
  const vg = g.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 420); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // tablero
  if (!HEX) {
    g.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(g, 38, 136, 408, 408, 22); g.fill();
    ART.rr(g, 36, 128, 408, 408, 22); ART.fillOut(g, '#6a5a8e', 4); ART.rr(g, 42, 134, 396, 396, 17); g.fillStyle = '#54467a'; g.fill();
    for (const cl of cells) { const [x, y] = px(cl); ART.rr(g, x - 45, y - 45, 90, 90, 14); g.fillStyle = '#3e3361'; g.fill(); ART.rr(g, x - 45, y - 45, 90, 6, 3); g.fillStyle = 'rgba(0,0,0,.22)'; g.fill(); }
  } else {
    for (const cl of cells) { const [x, y] = px(cl); hexPath(g, x, y + 7, 58); g.fillStyle = 'rgba(0,0,0,.3)'; g.fill(); }
    for (const cl of cells) { const [x, y] = px(cl); hexPath(g, x, y, 58); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); }
    for (const cl of cells) { const [x, y] = px(cl); hexPath(g, x, y, 57); g.fillStyle = '#6a5a8e'; g.fill(); }
    for (const cl of cells) { const [x, y] = px(cl); hexPath(g, x, y, 47); g.fillStyle = '#3e3361'; g.fill(); hexPath(g, x, y - 2, 44); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 3; g.stroke(); }
  }
  return cv;
}

/* ---------- Lógica ---------- */
function slide(d) {
  if (overT) return;
  const [dx, dy] = d, vp = HEX ? [SQ3 * (dx + dy / 2), 1.5 * dy] : [dx, dy];
  const order = [...cells].sort((a, b) => { const pa = HEX ? [SQ3 * (a[0] + a[1] / 2), 1.5 * a[1]] : a, pb = HEX ? [SQ3 * (b[0] + b[1] / 2), 1.5 * b[1]] : b; return (pb[0] * vp[0] + pb[1] * vp[1]) - (pa[0] * vp[0] + pa[1] * vp[1]); });
  for (const cl of cells) { const t = tiles[key(cl)]; if (t) { t.from = px(cl); t.dv = t.v; t.grow = 1; } }
  const valid = new Set(cells.map(key)), merged = new Set(); let moved = false; ghosts = [];
  for (const cl of order) { const t = tiles[key(cl)]; if (!t) continue; let cur = cl;
    while (true) { const nx = [cur[0] + dx, cur[1] + dy], nk = key(nx); if (!valid.has(nk)) break; const o = tiles[nk];
      if (!o) { tiles[nk] = t; delete tiles[key(cur)]; cur = nx; moved = true; continue; }
      if (o.v === t.v && !merged.has(nk)) { ghosts.push({ v: t.v, from: t.from, to: px(nx), a: 0 }); o.v *= 2; o.burst = 1; score += o.v; merged.add(nk); delete tiles[key(cur)]; moved = true; } break; } }
  if (!moved) { nudge = [dx * 7, dy * 7]; if (HEX) nudge = [vp[0] * 4, vp[1] * 4]; return; }
  for (const t of Object.values(tiles)) t.a = 0; moves++;
  k.sfx(merged.size ? 'pop' : 'click'); add();
  if (Object.values(tiles).some((q) => q.v >= 2048) && !anim) { anim = 1; setTimeout(() => { if (k.st === 'play') { k.show('¡2048!', 'Sigue jugando para más puntos'); setTimeout(() => k.hide(), 1400); } }, 250); }
  if (!canMove()) overT = 0.6;
}
function canMove() { if (cells.some((cl) => !tiles[key(cl)])) return true; const dirs = HEX ? HX_D : Object.values(SQ_D); return cells.some((cl) => dirs.some(([dx, dy]) => { const o = tiles[key([cl[0] + dx, cl[1] + dy])]; return o && o.v === tiles[key(cl)].v; })); }
function reset() { build(); tiles = {}; score = 0; anim = 0; ghosts = []; overT = 0; nudge = [0, 0]; moves = 0; bestV = k.best(CFG.id, 0); add(); add(); if (!bgCv) bgCv = makeBg(); }
reset(); k.show(CFG.title, HEX ? 'Desliza en 6 direcciones (teclado: flechas + Q E Z C; mando: flechas, A arriba-derecha y B abajo-izquierda) para unir fichas iguales.' : 'Desliza o usa las flechas para unir fichas iguales. Llega a 2048.');
const HEXKEY = { KeyQ: 2, KeyE: 1, KeyZ: 4, KeyC: 5 };
addEventListener('keydown', (e) => { if (HEX && k.st === 'play' && !k.paused && HEXKEY[e.code] !== undefined) slide(HX_D[HEXKEY[e.code]]); });
const easeBack = (t) => { const s = 1.9; t -= 1; return t * t * ((s + 1) * t + s) + 1; };
k.run((dt) => {
  for (const t of Object.values(tiles)) {
    if (t.a < 1) { t.a = Math.min(1, t.a + dt / 0.11); if (t.a >= 1 && t.dv !== t.v) { t.dv = t.v; t.pop = 1; } }
    else if (t.grow < 1) t.grow = Math.min(1, t.grow + dt / 0.16);
    if (t.a >= 1 && t.burst) { t.burst = 0; const [x, y] = px(cells.find((cl) => tiles[key(cl)] === t)); k.burst(x, y, tcol(t.v), t.v >= 128 ? 16 : 8, t.v >= 128 ? 170 : 110); k.float('+' + t.v, x, y - 34, t.v >= 128 ? '#fff38a' : '#fff'); if (t.v >= 512) k.shake(3); }
    t.pop = Math.max(0, t.pop - dt / 0.2);
  }
  for (const gh of ghosts) gh.a = Math.min(1, gh.a + dt / 0.11);
  nudge = [nudge[0] * (1 - dt * 12), nudge[1] * (1 - dt * 12)];
  if (!k.gate(reset)) return;
  if (overT) { overT -= dt; if (overT <= 0) { overT = 0; k.lose(CFG.id, score, 'Sin movimientos', `Mayor ficha ${Math.max(...Object.values(tiles).map((q) => q.v))}`); } return; }
  if (k.ptr.up) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy; if (Math.hypot(dx, dy) * k.scale > 24) {
    if (HEX) { const a = Math.atan2(-dy, dx); const i = ((Math.round(a / (Math.PI / 3)) % 6) + 6) % 6; /* 0=E,1=NE,2=NW,3=W,4=SW,5=SE */ slide(HX_D[i]); }
    else slide(SQ_D[Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')]); } }
  if (!HEX) { for (const d of ['up', 'down', 'left', 'right']) if (k.hit.has(d)) slide(SQ_D[d]); }
  else { if (k.hit.has('left')) slide([-1, 0]); if (k.hit.has('right')) slide([1, 0]); if (k.hit.has('up')) slide(k.held.has('right') ? [1, -1] : [0, -1]); if (k.hit.has('down')) slide(k.held.has('left') ? [-1, 1] : [0, 1]);
    if (k.party && k.hit.has('a')) slide([1, -1]); if (k.party && k.hit.has('b')) slide([-1, 1]); } /* mando: ↑ arriba-izq., ↓ abajo-der., A arriba-der., B abajo-izq. */
}, () => {
  c.drawImage(bgCv, 0, 0, W, H);
  // HUD: título a la izquierda y marcadores a la derecha (el centro es del kit)
  label(CFG.title, 20, 62, 24, '#ffd84d'); c.font = '600 13px -apple-system,Segoe UI,Roboto,sans-serif'; c.fillStyle = '#c9bfe8'; c.textAlign = 'left'; c.fillText(HEX ? 'Une fichas iguales en 6 direcciones' : 'Une fichas iguales hasta 2048', 22, 96);
  const box = (x, t, v) => { c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, x, 21, 84, 54, 12); c.fill(); ART.rr(c, x, 17, 84, 54, 12); ART.fillOut(c, '#54467a', 3);
    c.font = '800 11px ui-rounded,"Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = '#c9bfe8'; c.fillText(t, x + 42, 24); label(String(v), x + 42, 38, v > 99999 ? 18 : 22, '#fff', 'center'); };
  box(302, 'PUNTOS', score); box(390, 'RÉCORD', Math.max(bestV, score));
  c.save(); c.translate(nudge[0], nudge[1]);
  const ease = (a) => 1 - (1 - a) * (1 - a);
  for (const gh of ghosts) { const a = ease(gh.a); if (gh.a >= 1) continue; const x = gh.from[0] + (gh.to[0] - gh.from[0]) * a, y = gh.from[1] + (gh.to[1] - gh.from[1]) * a; c.drawImage(tileSprite(gh.v), x - SP, y - SP, SP * 2, SP * 2); }
  for (const cl of cells) { const t = tiles[key(cl)]; if (!t) continue; const [tx, ty] = px(cl), a = ease(t.a), x = t.from[0] + (tx - t.from[0]) * a, y = t.from[1] + (ty - t.from[1]) * a;
    let s = 1 + Math.sin(t.pop * Math.PI) * 0.16; if (t.grow < 1) s = t.grow <= 0 ? 0 : easeBack(t.grow); if (s <= 0.01) continue;
    const z = SP * s; c.drawImage(tileSprite(t.dv), x - z, y - z, z * 2, z * 2); }
  c.restore();
  if (overT) { c.fillStyle = `rgba(20,12,40,${0.5 * (1 - overT / 0.6)})`; c.fillRect(0, 0, W, H); }
});
