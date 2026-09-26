/* Tácticas por turnos contra la IA con arte propio. CFG.hex = false (cuadrícula) | true (hexágonos)
 * Tablero en relieve cacheado, unidades por clase (caballero, arquera, mago), movimiento animado, flechas y hechizos, turno de la IA visible. */
/* ===== §8 «Ley de la pieza única» — utilería local (REMASTER.md §8) =====
 * unite8(): traza y contornea TODAS las partes y después las rellena en orden de profundidad, así
 * dentro de la silueta no sobrevive ningún contorno cerrado: solo el borde exterior. Las separaciones
 * internas se leen por sombra propia (seam8) o por cambio de color, nunca por stroke.
 * Todo lo repetido se hornea en sprites cacheados a Math.min(2, devicePixelRatio) para que el coste
 * por frame no suba (regla innegociable del brief). */
const P8OUT = ART.OUT, P8W = 1.5, P8IW = 0.7, P8IA = 0.62, P8T = 6.2832;
const _p8h = (s) => { s = String(s).replace('#', ''); if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const _p8c = (a) => `rgb(${Math.max(0, Math.min(255, a[0] | 0))},${Math.max(0, Math.min(255, a[1] | 0))},${Math.max(0, Math.min(255, a[2] | 0))})`;
const LT8 = (col, f) => (String(col)[0] === '#' ? _p8c(_p8h(col).map((v) => v + (255 - v) * f)) : col);
const DK8 = (col, f) => (String(col)[0] === '#' ? _p8c(_p8h(col).map((v) => v * (1 - f))) : col);
const AL8 = (col, a) => { const q = _p8h(col); return `rgba(${q[0]},${q[1]},${q[2]},${Math.max(0, a).toFixed(3)})`; };
const CV8 = (w, h) => { const q = document.createElement('canvas'); q.width = Math.max(1, Math.ceil(w)); q.height = Math.max(1, Math.ceil(h)); return q; };
/* como ART.rr pero SIN beginPath: imprescindible para componer subtrayectorias de una misma pieza */
function rr8(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const DPR8 = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
/* recorte contra la propia forma. Nunca `source-atop` en el lienzo vivo: obliga a un compuesto de
 * pantalla completa (medido 11–18 ms/frame). Aquí basta el clip. */
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
/* separación interna por sombra propia (~16 % más oscuro), nunca por contorno */
function seam8(g, path, base, fn, f) { clip8(g, path, (q) => { q.fillStyle = DK8(base, f == null ? 0.16 : f); fn(q); }); }
/* línea interior fina: detalle, jamás un contorno cerrado */
function ink8(g, w, a) { g.lineWidth = w == null ? P8IW : w; g.strokeStyle = AL8(P8OUT, a == null ? P8IA : a); }
/* óvalo especular (un toque por pieza) */
function shine8(g, x, y, rx, ry, rot, a) { g.fillStyle = `rgba(255,255,255,${a == null ? 0.34 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, P8T); g.fill(); }
/* sombra de contacto dura bajo la pieza */
function drop8(g, x, y, rx, ry, a) { g.fillStyle = `rgba(26,21,48,${a == null ? 0.26 : a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, P8T); g.fill(); }
/* caché de sprites; el origen del dibujo es (ox,oy) dentro del lienzo de w×h */
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
/* La cara manda: ojos grandes con PÁRPADO SUPERIOR RECTO (lo que da expresión) y cejas gruesas */
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
/* cejas gruesas (trazo con cuerpo). tilt>0 = enfadado */
function brow8(g, cx, cy, sep, len, tilt, col, th) {
  th = th || 1.5; g.fillStyle = col || P8OUT;
  for (const s of [-1, 1]) { g.beginPath(); bone8([[cx + s * (sep - len * 0.45), cy + tilt], [cx + s * (sep + len * 0.55), cy - tilt * 0.85]], [th, th * 0.5])(g); g.fill(); }
}
/* boca grande y simple. m: 0 sonrisa · 1 abierta · 2 mueca · 3 recta · 4 «o» */
function mouth8(g, x, y, w, m, col) {
  if (m === 1 || m === 4) { g.beginPath(); g.ellipse(x, y + w * 0.14, w * (m === 4 ? 0.5 : 0.7), w * (m === 4 ? 0.6 : 0.76), 0, 0, P8T); g.fillStyle = col || '#5e2436'; g.fill(); return; }
  g.beginPath(); g.lineCap = 'round'; g.lineWidth = Math.max(1, w * 0.26); g.strokeStyle = col || AL8(P8OUT, 0.9);
  if (m === 3) { g.moveTo(x - w * 0.5, y); g.lineTo(x + w * 0.5, y); }
  else if (m === 2) { g.moveTo(x - w * 0.5, y + w * 0.2); g.quadraticCurveTo(x, y - w * 0.3, x + w * 0.5, y + w * 0.2); }
  else { g.moveTo(x - w * 0.55, y - w * 0.1); g.quadraticCurveTo(x, y + w * 0.55, x + w * 0.55, y - w * 0.1); }
  g.stroke();
}
/* disposición: vertical (móvil de pie) = tablero arriba y panel abajo, los bandos de abajo (tú) a arriba (IA); horizontal = panel lateral */
const PORT = innerHeight > innerWidth, HEX = !!CFG.hex, OUT = ART.OUT, R2 = 6.2832, W = PORT ? 400 : 640, H = PORT ? 720 : 480;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#1d2036' }), c = k.ctx;
const COLS = PORT ? (HEX ? 9 : 8) : HEX ? 11 : 10, ROWS = PORT ? (HEX ? 9 : 10) : 8, S = HEX ? (PORT ? 27 : 26) : 46, DEP = 6; // S: lado (cuadrícula) o radio (hex); DEP: grosor del relieve
const OX = PORT ? (HEX ? 11 : 16) : 14, OY = PORT ? 70 : HEX ? 46 : 48; // en vertical, margen para que las cabezas de la fila 0 no queden bajo pausa/sonido
const PX = PORT ? W : 486, PY = PORT ? 562 : H; // panel lateral (horizontal) o inferior (vertical)
/* coordenadas de bando: a = avance desde tu lado (0) hacia la IA, b = lateral */
const LONG = PORT ? ROWS : COLS, SIDE = PORT ? COLS : ROWS, P = (a, b) => (PORT ? [b, ROWS - 1 - a] : [a, b]);
const endR = () => (PORT ? { x: 282, y: PY + 70, w: 110, h: 74 } : { x: PX + 4, y: H - 58, w: W - PX - 12, h: 44 });
const TYPES = { K: { n: 'Caballero', hp: 12, atk: 5, mv: 3, rg: 1, col: '#5ca8ff' }, A: { n: 'Arquera', hp: 8, atk: 4, mv: 3, rg: 3, col: '#5bc85a' }, M: { n: 'Mago', hp: 7, atk: 6, mv: 2, rg: 2, col: '#b98cff' } };
const AICOL = { K: '#e0564a', A: '#ff9a3d', M: '#c0527a' };
let units, rocks, sel, turn, level, score, reach, aiT, log, aiQueue = [], aiStep, aiFocus, projs, banner, cur, kbd, boardCv, tt = 0, endT;

const pos = (x, y) => HEX ? [OX + S + x * S * 1.5, OY + S * 0.866 + y * S * 1.732 + (x & 1) * S * 0.866] : [OX + x * S + S / 2, OY + y * S + S / 2];
function nbs(x, y) { if (!HEX) return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]; const o = x & 1; return [[x, y - 1], [x, y + 1], [x - 1, y - 1 + o], [x - 1, y + o], [x + 1, y - 1 + o], [x + 1, y + o]]; }
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const inb = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
const at = (x, y) => units.find((u) => u.hp > 0 && u.x === x && u.y === y);
const blocked = (x, y) => rocks.has(x + ',' + y) || at(x, y);
function search(sx, sy, pass) { const d = { [sx + ',' + sy]: 0 }, prev = {}, q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [nx, ny] of nbs(x, y)) { const kk = nx + ',' + ny; if (!inb(nx, ny) || d[kk] !== undefined || (pass && !pass(nx, ny))) continue; d[kk] = d[x + ',' + y] + 1; prev[kk] = [x, y]; q.push([nx, ny]); } } return { d, prev }; }
const dists = (sx, sy, pass) => search(sx, sy, pass).d;
const range = (a, b) => dists(a.x, a.y)[b.x + ',' + b.y];
const inRange = (a, b) => range(a, b) <= TYPES[a.t].rg;
function cellAt(px, py) { let best = null, bd = HEX ? S * 0.95 : S * 0.72; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const [cx, cy] = pos(x, y), d = HEX ? Math.hypot(px - cx, py - cy) : Math.max(Math.abs(px - cx), Math.abs(py - cy)) * 1.41; if (d < bd) { bd = d; best = [x, y]; } } return best; }

function build() {
  rocks = new Set(); for (let i = 0; i < 8 + level; i++) rocks.add(P(k.ri(2, LONG - 3), k.ri(0, SIDE - 1)).join());
  /* k.D.cpu: PV del rival; k.D.life: PV de los tuyos (fácil +2 más) */
  const BON = (team) => (team === 'ai' ? Math.min(6, level - 3 + k.D.cpu) : 2 + 2 * k.D.life);
  const mk = (t, x, y, team) => ({ t, x, y, team, hp: TYPES[t].hp + BON(team), max: TYPES[t].hp + BON(team), /* 1.23: más fácil (rival antes level-2 tope 8; los tuyos +2 PV) */ moved: false, acted: false, face: team === 'me' ? 1 : -1, hf: 0, ph: Math.random() * 6 });
  units = [mk('K', ...P(0, 2), 'me'), mk('A', ...P(0, 4), 'me'), mk('M', ...P(0, 6), 'me'), mk('K', ...P(LONG - 1, 1), 'ai'), mk('K', ...P(LONG - 1, 5), 'ai'), mk('A', ...P(LONG - 1, 3), 'ai')];
  if (level > 3) units.push(mk('M', ...P(LONG - 1, 7), 'ai')); if (level > 6) units.push(mk('A', ...P(LONG - 2, 0), 'ai'));
  units.forEach((u) => rocks.delete(u.x + ',' + u.y));
  // que ninguna unidad quede encerrada entre rocas
  const me = units[0], dd = dists(me.x, me.y, (x, y) => !rocks.has(x + ',' + y)); for (const u of units) if (dd[u.x + ',' + u.y] === undefined) { nbs(u.x, u.y).forEach(([x, y]) => rocks.delete(x + ',' + y)); }
  turn = 'me'; sel = null; reach = null; log = 'Tu turno: elige una unidad'; projs = []; aiQueue = []; aiStep = 0; aiFocus = null; endT = 0; cur = P(0, 2); kbd = false;
  banner = { txt: 'Batalla ' + level, t: 1.4 }; bake();
}
function reset() { if (!level || k.st === 'over' && !units.some((u) => u.team === 'me' && u.hp > 0)) { level = 1; score = 0; } build(); }
const busy = () => projs.length > 0 || units.some((u) => u.mv || u.lunge);

/* ---------- Acciones ---------- */
function moveTo(u, x, y) {
  const { prev } = search(u.x, u.y, (a, b) => !blocked(a, b)); const pts = [[x, y]]; let kk = x + ',' + y; while (prev[kk] && !(prev[kk][0] === u.x && prev[kk][1] === u.y)) { pts.unshift(prev[kk]); kk = prev[kk].join(); } pts.unshift([u.x, u.y]);
  u.mv = { pts: pts.map(([a, b]) => pos(a, b)), t: 0 }; u.x = x; u.y = y; u.moved = true; k.sfx('jump');
}
function attack(a, b) {
  const dmg = TYPES[a.t].atk + k.ri(-1, 1), [ax, ay] = pos(a.x, a.y), [bx, by] = pos(b.x, b.y); a.acted = true; a.moved = true; a.face = bx >= ax ? 1 : -1;
  const hit = () => { b.hp -= dmg; b.hf = 0.25; b.face = ax >= bx ? 1 : -1; k.burst(bx, by - 14, a.t === 'M' ? '#d9b3ff' : '#ff9a3c', 12, 140); k.float('-' + dmg, bx, by - 36, '#ff8a8a'); k.sfx('hit'); k.shake(3);
    log = `${TYPES[a.t].n} ${a.team === 'me' ? '' : 'rival '}golpea: -${dmg}`; if (b.hp <= 0) { b.dying = 0.6; k.burst(bx, by - 10, '#fff', 16, 180); k.sfx('explode'); log = `¡${TYPES[b.t].n} ${b.team === 'me' ? 'tuyo ' : 'rival '}derrotado!`; if (b.team === 'ai') { score += 50; k.float('+50', bx, by - 56, '#ffd23d'); } } checkEnd(); };
  if (a.t === 'K') { a.lunge = { dx: (bx - ax) * 0.45, dy: (by - ay) * 0.45, t: 0, done: false, hit }; k.sfx('shoot'); }
  else { projs.push({ kind: a.t, sx: ax, sy: ay - 18, ex: bx, ey: by - 16, t: 0, dur: 0.18 + Math.hypot(bx - ax, by - ay) / 520, hit }); k.sfx('shoot'); }
}
function checkEnd() {
  if (!units.some((u) => u.team === 'ai' && u.hp > 0)) { score += 200 * level; level++; k.st = 'over'; k.sfx('win'); k.confetti(); k.show('¡Victoria!', `${score} puntos · Récord ${k.best(CFG.id, score)}<br>Toca para la siguiente batalla`); }
  else if (!units.some((u) => u.team === 'me' && u.hp > 0)) { const b = level; level = 1; k.lose(CFG.id, score, 'Derrota', `Batalla ${b}`); }
}
function endTurn() { if (turn !== 'me' || busy()) return; units.forEach((u) => { u.moved = false; u.acted = false; }); turn = 'ai'; sel = null; reach = null; aiT = 0.5; aiStep = 0; aiQueue = units.filter((u) => u.team === 'ai' && u.hp > 0); log = 'Turno de la IA'; banner = { txt: 'Turno rival', t: 1, red: true }; k.sfx('click'); }
function selectUnit(u) { sel = u; reach = u.moved ? {} : dists(u.x, u.y, (x, y) => !blocked(x, y)); k.sfx('click'); log = `${TYPES[u.t].n}: ${u.moved ? 'ataca a un enemigo en rojo' : 'mueve a una casilla azul o ataca'}`; }
function tapCell(cell) {
  if (!cell) { sel = null; reach = null; return; }
  const u = at(...cell);
  if (u && u.team === 'me' && !u.acted) return selectUnit(u);
  if (sel && u && u.team === 'ai' && inRange(sel, u)) { attack(sel, u); sel = null; reach = null; return; }
  if (sel && !u && reach && reach[cell.join()] !== undefined && reach[cell.join()] <= TYPES[sel.t].mv && !sel.moved) { moveTo(sel, cell[0], cell[1]); reach = {};
    if (!units.some((q) => q.team === 'ai' && q.hp > 0 && inRange(sel, q))) { log = 'Sin enemigos a tu alcance'; sel.acted = true; sel = null; } else log = 'Elige un enemigo en rojo'; return; }
  if (u && u.team === 'ai') { log = `${TYPES[u.t].n} rival · ${Math.max(0, u.hp)}/${u.max} PV`; }
  sel = null; reach = null;
}
/* IA: una unidad cada vez, con foco visible */
/* IA que mejora con la batalla: al principio a veces no remata al más débil (1: 45 % → 100 % en la 7). */
function aiTarget(u) { const ok = units.filter((f) => f.team === 'me' && f.hp > 0 && inRange(u, f)); if (!ok.length) return null; return Math.random() < Math.min(0.85, Math.max(0.05, 0.3 + (level - 1) * 0.05 + k.D.cpu * 0.15)) ? ok.sort((a, b) => a.hp - b.hp)[0] : k.pick(ok); }
function aiThink(u) {
  const foes = units.filter((q) => q.team === 'me' && q.hp > 0); if (!foes.length) return null;
  let tg = foes.filter((f) => inRange(u, f)).sort((a, b) => a.hp - b.hp)[0]; if (tg) return { tg };
  const d = dists(u.x, u.y, (x, y) => !blocked(x, y)), goal = foes.sort((a, b) => range(u, a) - range(u, b))[0]; let best = null, bv = 1e9;
  for (const [kk, v] of Object.entries(d)) if (v <= TYPES[u.t].mv) { const [x, y] = kk.split(',').map(Number); if (at(x, y) && at(x, y) !== u) continue; const dist = dists(x, y)[goal.x + ',' + goal.y]; const s2 = Math.abs(dist - TYPES[u.t].rg) + (dist < TYPES[u.t].rg ? 0.5 : 0) + v * 0.01; if (s2 < bv) { bv = s2; best = [x, y]; } }
  return { move: best && (best[0] !== u.x || best[1] !== u.y) ? best : null };
}

level = 0; reset();
/* al girar el móvil fuera de partida se recarga con la otra disposición */
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerHeight > innerWidth) !== PORT && k.st !== 'play') location.reload(); }, 400); });
k.show(CFG.title, 'Toca una unidad tuya, luego una casilla azul para mover o un enemigo en rojo para atacar. «Fin turno» cuando acabes. Teclado: flechas, A y X.');

k.run((dt) => {
  if (!k.gate(reset)) return;
  tt += dt; if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
  /* animaciones */
  for (const u of units) { u.hf = Math.max(0, u.hf - dt); if (u.dying) u.dying = Math.max(0, u.dying - dt);
    if (u.mv) { u.mv.t += dt * 7; if (u.mv.t >= u.mv.pts.length - 1) u.mv = null; else { const i = Math.floor(u.mv.t), a = u.mv.pts[i], b = u.mv.pts[i + 1]; if (b[0] !== a[0]) u.face = Math.sign(b[0] - a[0]); } }
    if (u.lunge) { const l = u.lunge; l.t += dt; if (l.t > 0.12 && !l.done) { l.done = true; l.hit(); } if (l.t >= 0.3) u.lunge = null; } }
  for (const p of projs) { p.t += dt; if (p.t >= p.dur) { p.dead = true; p.hit(); } } projs = projs.filter((p) => !p.dead);
  if (k.st !== 'play') return;
  /* turno de la IA */
  if (turn === 'ai') {
    if (busy()) return; aiT -= dt; if (aiT > 0) return;
    while (aiQueue.length && aiQueue[0].hp <= 0) aiQueue.shift();
    const u = aiQueue[0];
    if (!u) { turn = 'me'; aiFocus = null; log = 'Tu turno'; banner = { txt: 'Tu turno', t: 1 }; units.forEach((q) => { q.moved = false; q.acted = false; }); return; }
    if (aiStep === 0) { aiFocus = u; aiStep = 1; aiT = 0.35; log = `${TYPES[u.t].n} rival piensa…`; }
    else if (aiStep === 1) { const pl = aiThink(u); aiStep = 2; aiT = 0.15; if (pl && pl.move) moveTo(u, pl.move[0], pl.move[1]); }
    else { const tg = aiTarget(u); if (tg) attack(u, tg); aiQueue.shift(); aiStep = 0; aiT = 0.3; }
    return;
  }
  /* turno propio */
  if (busy()) return;
  if (!units.some((u) => u.team === 'me' && u.hp > 0 && !u.acted)) { endT += dt; if (endT > 0.5) { endT = 0; endTurn(); } return; } else endT = 0;
  const dir = k.hit.has('left') ? [-1, 0] : k.hit.has('right') ? [1, 0] : k.hit.has('up') ? [0, -1] : k.hit.has('down') ? [0, 1] : null;
  if (dir) { kbd = true; cur = [k.clamp(cur[0] + dir[0], 0, COLS - 1), k.clamp(cur[1] + dir[1], 0, ROWS - 1)]; }
  if (k.hit.has('a')) { kbd = true; tapCell(cur.slice()); }
  if (k.hit.has('b')) endTurn();
  if (!k.ptr.hit) return; kbd = false;
  { const r = endR(); if (k.ptr.x > r.x - 4 && k.ptr.x < r.x + r.w + 4 && k.ptr.y > r.y - 6 && k.ptr.y < r.y + r.h + 6) return endTurn(); }
  const cell = cellAt(k.ptr.x, k.ptr.y); if (cell) cur = cell; tapCell(cell);
}, draw);

/* ---------- Dibujo ---------- */
function label(s, x, y, size, col, align) {
  c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y);
}
function shape(g, x, y, inset) { if (HEX) { g.beginPath(); for (let i = 0; i < 6; i++) g.lineTo(x + Math.cos(i * 1.0472) * (S - inset), y + Math.sin(i * 1.0472) * (S - inset)); g.closePath(); } else ART.rr(g, x - S / 2 + inset, y - S / 2 + inset, S - inset * 2, S - inset * 2, 5); }
/* fondo + tablero en relieve, cacheado a 2× por batalla */
function bake() {
  boardCv = document.createElement('canvas'); boardCv.width = W * 2; boardCv.height = H * 2; const g = boardCv.getContext('2d'); g.scale(2, 2);
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2b2f57'); gr.addColorStop(1, '#171a31'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(rnd(i) * W, rnd(i + 5) * H, 20 + rnd(i + 9) * 60, 0, R2); g.fill(); }
  const cells = []; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) cells.push([x, y, ...pos(x, y)]); cells.sort((a, b) => a[3] - b[3]);
  // sombra del tablero
  g.fillStyle = 'rgba(0,0,0,.35)'; for (const [, , px, py] of cells) { shape(g, px + 4, py + DEP + 6, -1); g.fill(); }
  for (const [x, y, px, py] of cells) {
    const r = rnd(x * 13 + y * 7 + level), base = (x + y) % 2 ? [120, 190, 100] : [108, 178, 92], v = (r - 0.5) * 14, col = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v * 0.6 | 0})`;
    shape(g, px, py + DEP, 0); ART.fillOut(g, '#6b4a2f', 2); shape(g, px, py, 0); ART.fillOut(g, col, 2);
    g.fillStyle = 'rgba(255,255,255,.14)'; shape(g, px, py - 1, 4); g.fill(); shape(g, px, py + 1, 5); g.fillStyle = col; g.fill();
    for (let i = 0; i < 4; i++) { const bx = px + (rnd(x + i * 3 + y * 11) - 0.5) * S * 0.9, by = py + (rnd(x * 5 + i + y) - 0.5) * S * 0.7; g.strokeStyle = 'rgba(40,100,40,.45)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 1.5, by - 4); g.moveTo(bx, by); g.lineTo(bx + 1.5, by - 4); g.stroke(); }
    if (rnd(x * 3 + y * 17) < 0.12) { g.fillStyle = ['#fff6c2', '#ff9ad5', '#fff'][x % 3]; g.beginPath(); g.arc(px + S * 0.2, py + S * 0.15, 2, 0, R2); g.fill(); }
  }
  // obstáculos: rocas y árboles
  for (const [x, y, px, py] of cells) { if (!rocks.has(x + ',' + y)) continue; const s = HEX ? 0.9 : 1;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px, py + 9 * s, 16 * s, 6 * s, 0, 0, R2); g.fill();
    if (rnd(x * 7 + y * 3 + level) < 0.55) { g.beginPath(); g.moveTo(px - 16 * s, py + 9 * s); g.quadraticCurveTo(px - 17 * s, py - 12 * s, px - 2 * s, py - 15 * s); g.quadraticCurveTo(px + 16 * s, py - 12 * s, px + 16 * s, py + 9 * s); g.closePath(); ART.fillOut(g, '#8f8ca6', 2.5); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(px - 6 * s, py - 7 * s, 5 * s, 3 * s, -0.4, 0, R2); g.fill(); g.strokeStyle = 'rgba(26,21,48,.4)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + 3 * s, py - 8 * s); g.lineTo(px + 7 * s, py + 3 * s); g.stroke(); }
    else { g.save(); g.translate(px, py + 10 * s); g.scale(0.62 * s, 0.62 * s); ART.deco(g, { deco: 'tree', near: '#3f9e4a' }, 0, 0, 32, 0); g.restore(); } }
  // panel lateral y barra superior
  if (PORT) { ART.rr(g, 8, PY, 266, H - PY - 8, 12); ART.fillOut(g, '#262a4c', 2.5); ART.rr(g, 12, PY + 4, 258, 18, 8); g.fillStyle = 'rgba(255,255,255,.06)'; g.fill(); }
  else { ART.rr(g, PX + 4, OY - 4, W - PX - 12, H - OY - 72, 12); ART.fillOut(g, '#262a4c', 2.5); ART.rr(g, PX + 8, OY, W - PX - 20, 18, 8); g.fillStyle = 'rgba(255,255,255,.06)'; g.fill(); }
  gr = g.createLinearGradient(0, 0, 0, 34); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 34);
}
/* soldado por clase; team 'me' humano, 'ai' trasgo */
/* §8 + cartoon de estudio: la unidad es UNA pieza. Piernas, botas, tronco, manoplas, cabeza,
 * yelmo/capucha/sombrero, escudo y carcaj van en el mismo trazado, contorneado y relleno una sola
 * vez; armadura, cinturón y visera se leen por color y sombra propia. Solo la espada se separa,
 * porque de verdad gira al atacar. Horneado por (clase, bando, fotograma de paso). */
function unitSpr(t, me, leg) {
  const T = TYPES[t], col = me ? T.col : AICOL[t], skin = me ? '#ffd9b5' : '#a8dd72';
  const walk = leg === 3 ? 0 : [3, 0, -3][leg];
  return spr8(`u${t}${me ? 1 : 0}${leg}`, 66, 80, 33, 72, (g) => {
    const arm = col, armor = t === 'K' ? '#c2cada' : col;
    const body = (q) => {
      rr8(q, -7 + walk * 0.3, -10, 7, 11, 3.2); rr8(q, 1 - walk * 0.3, -10, 7, 11, 3.2);          // piernas
      q.moveTo(-3 + walk * 0.3, 0); q.ellipse(-3.5 + walk * 0.3, -0.5, 4.6, 3, 0, 0, P8T);
      q.moveTo(8 - walk * 0.3, 0); q.ellipse(4.5 - walk * 0.3, -0.5, 4.6, 3, 0, 0, P8T);           // botas
      if (t === 'A') rr8(q, -13, -27, 7, 17, 3);                                                   // carcaj
      if (t === 'M') { q.moveTo(-5, -25); q.quadraticCurveTo(-15, -12, -13, -2); q.lineTo(0, -5); q.closePath(); }
      rr8(q, -10, -26, 20, 19, 7);                                                                 // tronco
      mitt8(-11.5, -17, -2.7, 4.4, -1)(q); mitt8(11, -17, -0.5, 4.4, 1)(q);                        // manoplas
      if (t === 'K') { q.moveTo(4.5, -15); q.arc(-3, -15, 7.5, 0, P8T); }                          // escudo (no articula)
      q.moveTo(12, -34); q.arc(1, -34, 11, 0, P8T);                                                // cabeza grande
      if (t === 'K') { q.moveTo(1, -45); q.arc(1, -36, 12, Math.PI * 1.0, Math.PI * 2.0); q.lineTo(13, -31); q.lineTo(-11, -31); q.closePath();
        q.moveTo(-2, -46); q.quadraticCurveTo(-9, -56, -15, -47); q.quadraticCurveTo(-9, -49, -3, -44); q.closePath(); }
      else if (t === 'A') { q.moveTo(1, -46); q.arc(1, -35, 12.4, Math.PI * 0.88, Math.PI * 2.08); q.lineTo(11, -29); q.quadraticCurveTo(0, -39, -10, -28); q.closePath();
        q.moveTo(-10, -33); q.lineTo(-16, -26); q.lineTo(-8, -27.5); q.closePath(); }
      else { q.moveTo(-11, -39); q.quadraticCurveTo(0, -48, 13, -39); q.lineTo(13, -36); q.lineTo(-11, -36); q.closePath();
        q.moveTo(-6, -40); q.quadraticCurveTo(2, -53, -4, -61); q.quadraticCurveTo(7, -53, 9, -40); q.closePath(); }
    };
    unite8(g, [[body, armor, { dx: 2.2, dy: 2, f: 0.9 }, (q) => {
      q.fillStyle = me ? '#2c2748' : '#3d2a1e'; q.beginPath(); rr8(q, -7 + walk * 0.3, -10, 7, 11, 3.2); rr8(q, 1 - walk * 0.3, -10, 7, 11, 3.2); q.fill();
      q.fillStyle = DK8(me ? '#2c2748' : '#3d2a1e', 0.25); q.beginPath(); q.ellipse(-3.5 + walk * 0.3, -0.5, 4.6, 3, 0, 0, P8T); q.ellipse(4.5 - walk * 0.3, -0.5, 4.6, 3, 0, 0, P8T); q.fill();
      q.fillStyle = col; q.beginPath(); rr8(q, -10, -26, 20, 19, 7); q.fill();
      q.fillStyle = DK8(col, 0.24); q.fillRect(-10, -16, 20, 4);                              // cinturón
      q.fillStyle = arm; q.beginPath(); mitt8(-11.5, -17, -2.7, 4.4, -1)(q); mitt8(11, -17, -0.5, 4.4, 1)(q); q.fill();
      q.fillStyle = skin; q.beginPath(); q.arc(1, -34, 11, 0, P8T); q.fill();
      if (t === 'K') { q.fillStyle = '#c2cada'; q.beginPath(); q.arc(1, -36, 12, Math.PI, P8T / 2 * 2); q.lineTo(13, -31); q.lineTo(-11, -31); q.closePath(); q.fill();
        q.fillStyle = P8OUT; q.beginPath(); rr8(q, -1, -36.6, 12, 3.4, 1.4); q.fill();        // visera: hueco oscuro
        q.fillStyle = col; q.beginPath(); q.moveTo(-2, -46); q.quadraticCurveTo(-9, -56, -15, -47); q.quadraticCurveTo(-9, -49, -3, -44); q.fill();
        q.fillStyle = '#f2d15c'; q.beginPath(); q.arc(-3, -15, 3, 0, P8T); q.fill();
        q.fillStyle = DK8(armor, 0.2); q.beginPath(); q.arc(-3, -15, 7.5, 0.6, 2.9); q.lineTo(-3, -15); q.fill(); }
      else { q.fillStyle = col; q.beginPath();
        if (t === 'A') { q.moveTo(1, -46); q.arc(1, -35, 12.4, Math.PI * 0.88, Math.PI * 2.08); q.lineTo(11, -29); q.quadraticCurveTo(0, -39, -10, -28); q.closePath(); q.moveTo(-10, -33); q.lineTo(-16, -26); q.lineTo(-8, -27.5); q.closePath(); }
        else { q.moveTo(-11, -39); q.quadraticCurveTo(0, -48, 13, -39); q.lineTo(13, -36); q.lineTo(-11, -36); q.closePath(); q.moveTo(-6, -40); q.quadraticCurveTo(2, -53, -4, -61); q.quadraticCurveTo(7, -53, 9, -40); q.closePath(); }
        q.fill();
        if (t === 'M') { q.fillStyle = '#f2d15c'; q.fillRect(-6, -43, 14, 2.8); }
        if (t === 'A') { q.fillStyle = '#8a5a33'; q.beginPath(); rr8(q, -13, -27, 7, 17, 3); q.fill(); }
        eyes8(q, 2.6, -33.4, 3.4, 2.5, { lid: 0.24, ly: 0.2, lidCol: skin, iris: me ? '#2f4aa8' : '#6b2a2a' });
        brow8(q, 2.6, -37.4, 3.4, 3.2, me ? -0.5 : 0.9, DK8(skin, 0.55), 1.1); }
      q.fillStyle = 'rgba(255,255,255,.22)'; q.fillRect(-6, -24, 4, 10);
      shine8(q, -4, -40, 3.4, 4.4, -0.4, 0.28);
    }]], 1.5);
  }, 3);
}
function drawUnit(u, x, y, s, alpha) {
  const T = TYPES[u.t], me = u.team === 'me', col = me ? T.col : AICOL[u.t], f = u.face;
  const bob = Math.sin(tt * 3 + u.ph) * 1.2, fl = u.hf > 0 ? Math.sin(u.hf * 60) * 3 : 0;
  c.save(); c.translate(x + fl, y); c.globalAlpha = alpha;
  c.fillStyle = me ? 'rgba(92,168,255,.55)' : 'rgba(255,80,80,.5)'; c.beginPath(); c.ellipse(0, 2, 16 * s, 6 * s, 0, 0, R2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.5; c.stroke();
  c.scale(s * f, s); c.translate(0, bob);
  const leg = u.mv ? (Math.floor(tt * 7) % 3) : 3;
  blit8(c, unitSpr(u.t, me, leg), 0, 0);
  const att = u.lunge ? Math.sin(Math.min(1, u.lunge.t / 0.3) * Math.PI) : 0;
  if (u.t === 'K') {                       // la espada sí gira: pieza aparte, con un único borde
    c.save(); c.translate(12, -16); c.rotate(-0.2 + att * 1.9);
    const sw = (q) => { rr8(q, -1.6, -25, 5.2, 23, 2.2); rr8(q, -4.4, -3.4, 11.2, 4.4, 1.8); };
    unite8(c, [[sw, '#eef2f8', 0, (q) => { q.fillStyle = '#f2d15c'; q.beginPath(); rr8(q, -4.4, -3.4, 11.2, 4.4, 1.8); q.fill(); q.fillStyle = 'rgba(255,255,255,.5)'; q.fillRect(-0.8, -24, 1.6, 20); }]], 1.4);
    c.restore();
  } else if (u.t === 'A') {                // el arco es un trazo abierto, no un contorno cerrado
    c.save(); c.translate(11, -18); c.beginPath(); c.arc(0, 0, 11, -1.25, 1.25); c.lineWidth = 4.4; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 2.4; c.strokeStyle = '#c98a4b'; c.stroke();
    c.strokeStyle = '#f4efe6'; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.cos(-1.25) * 11, Math.sin(-1.25) * 11); c.lineTo(-2, 0); c.lineTo(Math.cos(1.25) * 11, Math.sin(1.25) * 11); c.stroke(); c.restore();
  } else {                                 // bastón: una pieza; el fulgor es luz viva, no forma
    c.save(); c.translate(11, -10);
    const st = (q) => { rr8(q, -1.6, -30, 4.2, 34, 2); q.moveTo(5, -33); q.arc(0.5, -33, 4.5, 0, P8T); };
    unite8(c, [[st, '#8a5a33', 0, (q) => { q.fillStyle = me ? '#e6d4ff' : '#ffc0d4'; q.beginPath(); q.arc(0.5, -33, 4.5, 0, P8T); q.fill(); }]], 1.4);
    const gl = 0.5 + Math.sin(tt * 5 + u.ph) * 0.2; c.fillStyle = me ? `rgba(200,160,255,${gl * 0.5})` : `rgba(255,120,160,${gl * 0.5})`; c.beginPath(); c.arc(0.5, -33, 8, 0, R2); c.fill();
    c.restore();
  }
  if (u.hf > 0.12) { c.globalAlpha = alpha * 0.6; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -24, 13, 22, 0, 0, R2); c.fill(); }
  c.restore();
}
function hpBar(u, x, y) { const w = 30, q = Math.max(0, u.hp / u.max); c.fillStyle = OUT; ART.rr(c, x - w / 2 - 2, y - 2, w + 4, 8, 3); c.fill(); c.fillStyle = '#4a1f2a'; c.fillRect(x - w / 2, y, w, 4); c.fillStyle = u.team === 'me' ? (q > 0.35 ? '#7cf06a' : '#ffd23d') : '#ff5f5f'; c.fillRect(x - w / 2, y, w * q, 4); }
function unitScreen(u) { let [x, y] = pos(u.x, u.y);
  if (u.mv) { const i = Math.min(Math.floor(u.mv.t), u.mv.pts.length - 2), q = u.mv.t - i, a = u.mv.pts[i], b = u.mv.pts[i + 1]; x = a[0] + (b[0] - a[0]) * q; y = a[1] + (b[1] - a[1]) * q - Math.abs(Math.sin(q * Math.PI)) * 5; }
  if (u.lunge) { const q = Math.sin(Math.min(1, u.lunge.t / 0.3) * Math.PI); x += u.lunge.dx * q; y += u.lunge.dy * q; }
  return [x, y + (HEX ? 8 : 10)]; }
function draw() {
  c.drawImage(boardCv, 0, 0, W, H);
  const pulse = 0.5 + Math.sin(tt * 5) * 0.2, rd = sel ? dists(sel.x, sel.y) : null;
  // casillas resaltadas
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const [px, py] = pos(x, y), kk = x + ',' + y, u = at(x, y);
    if (sel && reach && !sel.moved && reach[kk] !== undefined && reach[kk] <= TYPES[sel.t].mv && reach[kk] > 0 && !u) { shape(c, px, py, 3); c.fillStyle = `rgba(80,160,255,${pulse * 0.7})`; c.fill(); c.strokeStyle = '#bfe0ff'; c.lineWidth = 2; c.stroke(); }
    else if (sel && !u && !rocks.has(kk) && rd[kk] <= TYPES[sel.t].rg) { c.fillStyle = 'rgba(255,120,120,.35)'; c.beginPath(); c.arc(px, py, 3, 0, R2); c.fill(); }
    if (sel && u && u.team === 'ai' && rd[kk] <= TYPES[sel.t].rg) { shape(c, px, py, 3); c.fillStyle = `rgba(255,70,90,${pulse * 0.75})`; c.fill(); c.strokeStyle = '#ffd0d0'; c.lineWidth = 2; c.stroke(); } }
  // cursor (teclado / ratón) y foco de la IA
  const hov = kbd ? cur : (!k.ptr.down && cellAt(k.ptr.x, k.ptr.y));
  if (hov && turn === 'me') { const [px, py] = pos(...hov); shape(c, px, py, 2); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2.5; c.stroke(); }
  if (sel) { const [px, py] = pos(sel.x, sel.y); shape(c, px, py, 2); c.strokeStyle = '#ffd23d'; c.lineWidth = 3; c.stroke(); }
  if (aiFocus && turn === 'ai' && aiFocus.hp > 0) { const [px, py] = unitScreen(aiFocus); c.strokeStyle = '#ff5f5f'; c.lineWidth = 3; c.beginPath(); c.ellipse(px, py - 8, 20, 8, 0, 0, R2); c.stroke(); c.beginPath(); c.moveTo(px - 6, py - 70 + Math.sin(tt * 8) * 3); c.lineTo(px + 6, py - 70 + Math.sin(tt * 8) * 3); c.lineTo(px, py - 62 + Math.sin(tt * 8) * 3); c.closePath(); ART.fillOut(c, '#ff5f5f', 2); }
  // unidades por profundidad
  const list = units.filter((u) => u.hp > 0 || u.dying > 0).map((u) => [u, ...unitScreen(u)]).sort((a, b) => a[2] - b[2]);
  const s = HEX ? 0.86 : 1;
  for (const [u, x, y] of list) { const done = u.team === 'me' && u.acted && turn === 'me', al = u.hp > 0 ? (done ? 0.55 : 1) : u.dying / 0.6; drawUnit(u, x, y - (HEX ? 8 : 10), s, al); if (u.hp > 0) hpBar(u, x, y - (HEX ? 3 : 2)); }
  // proyectiles
  for (const p of projs) { const q = p.t / p.dur, x = p.sx + (p.ex - p.sx) * q, y = p.sy + (p.ey - p.sy) * q - Math.sin(q * Math.PI) * (p.kind === 'A' ? 26 : 8);
    if (p.kind === 'A') { const a = Math.atan2(p.ey - p.sy - Math.cos(q * Math.PI) * 26 * Math.PI, p.ex - p.sx); c.save(); c.translate(x, y); c.rotate(a); c.strokeStyle = OUT; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-10, 0); c.lineTo(6, 0); c.stroke(); c.strokeStyle = '#f4efe6'; c.lineWidth = 1.6; c.stroke(); c.beginPath(); c.moveTo(9, 0); c.lineTo(3, -3.5); c.lineTo(3, 3.5); c.closePath(); ART.fillOut(c, '#c7d0da', 1); c.restore(); }
    else { c.fillStyle = 'rgba(210,170,255,.35)'; c.beginPath(); c.arc(x, y, 11, 0, R2); c.fill(); for (let i = 1; i < 4; i++) { const q2 = Math.max(0, q - i * 0.06); c.globalAlpha = 0.5 - i * 0.12; c.beginPath(); c.arc(p.sx + (p.ex - p.sx) * q2, p.sy + (p.ey - p.sy) * q2 - Math.sin(q2 * Math.PI) * 8, 5 - i, 0, R2); c.fillStyle = '#e6d4ff'; c.fill(); } c.globalAlpha = 1; c.beginPath(); c.arc(x, y, 5.5, 0, R2); ART.fillOut(c, '#f4ecff', 2); } }
  // HUD
  label('Batalla ' + level, 14, 20, 20, '#f2d15c'); label(score + ' pts', PX - (PORT ? 14 : 8), 20, 17, '#fff', 'right');
  const info = sel || (hov && at(...hov)) || (aiFocus && turn === 'ai' && aiFocus.hp > 0 ? aiFocus : null);
  if (PORT) return drawPanelV(info);
  // panel: ficha de la unidad
  const cx = PX + (W - PX - 8) / 2;
  if (info) { const T = TYPES[info.t], me = info.team === 'me';
    label(me ? 'Tu unidad' : 'Rival', cx, OY + 5, 11, me ? '#9fd0ff' : '#ff9a9a', 'center');
    drawUnit(info, cx, OY + 92, 1.35, 1); label(T.n, cx, OY + 112, 16, '#fff', 'center');
    hpBar(info, cx, OY + 128); label(`${Math.max(0, info.hp)} / ${info.max} PV`, cx, OY + 146, 12, '#d8d0f0', 'center');
    [['Ataque', T.atk], ['Movim.', T.mv], ['Alcance', T.rg]].forEach(([n, v], i) => { const y = OY + 172 + i * 24; ART.rr(c, PX + 16, y - 10, W - PX - 40, 20, 7); c.fillStyle = 'rgba(255,255,255,.07)'; c.fill(); label(n, PX + 22, y, 12, '#cfd3ff'); label(String(v), W - 30, y, 14, '#ffd23d', 'right'); });
    if (me && turn === 'me') label(info.acted ? 'Ya ha actuado' : info.moved ? 'Puede atacar' : 'Lista', cx, OY + 252, 12, info.acted ? '#8b91a1' : '#7cf06a', 'center'); }
  else { label('Unidades', cx, OY + 5, 11, '#cfd3ff', 'center');
    const mine = units.filter((u) => u.team === 'me' && u.hp > 0), foes = units.filter((u) => u.team === 'ai' && u.hp > 0);
    mine.forEach((u, i) => drawUnit(u, PX + 34 + i * 40, OY + 88, 0.8, u.acted && turn === 'me' ? 0.5 : 1)); foes.forEach((u, i) => drawUnit(u, PX + 30 + (i % 3) * 40, OY + 172 + Math.floor(i / 3) * 62, 0.8, 1));
    label('Tuyas', cx, OY + 104, 11, '#9fd0ff', 'center'); label('Rivales', cx, OY + 124, 11, '#ff9a9a', 'center'); }
  // registro y botón de fin de turno
  label(log, 14, H - 22, 14, '#e6e2ff');
  const on = turn === 'me' && !busy(); ART.rr(c, PX + 4, H - 58, W - PX - 12, 44, 14); ART.fillOut(c, on ? '#5bc85a' : '#4a4466', 2.5);
  if (on) { ART.rr(c, PX + 8, H - 55, W - PX - 20, 16, 8); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill(); }
  label(turn === 'me' ? 'Fin turno' : 'IA…', PX + 4 + (W - PX - 12) / 2, H - 36, 16, on ? '#fff' : '#b8b2d0', 'center');
  // aviso de turno
  drawBanner();
}
function drawBanner() {
  if (banner) { const q = banner.t, a = Math.min(1, q / 0.25, (1.4 - q) / 0.15 + 0.3), sc = 1 + Math.max(0, q - 1.1) * 0.6; c.save(); c.globalAlpha = Math.max(0, a); c.translate(PX / 2, PORT ? (OY + PY) / 2 - 10 : H / 2 - 10); c.scale(sc, sc);
    ART.rr(c, -120, -28, 240, 56, 16); ART.fillOut(c, banner.red ? '#8a2b3a' : '#2d4a8a', 3); label(banner.txt, 0, 1, 26, '#fff', 'center'); c.restore(); }
}
/* panel inferior (vertical): ficha de unidad a la izquierda, turno y botón a la derecha */
function drawPanelV(info) {
  const x0 = 8, y0 = PY;
  if (info) { const T = TYPES[info.t], me = info.team === 'me';
    label(me ? 'Tu unidad' : 'Rival', x0 + 14, y0 + 13, 11, me ? '#9fd0ff' : '#ff9a9a');
    if (me && turn === 'me') label(info.acted ? 'Ya ha actuado' : info.moved ? 'Puede atacar' : 'Lista', x0 + 252, y0 + 13, 11, info.acted ? '#8b91a1' : '#7cf06a', 'right');
    drawUnit(info, x0 + 50, y0 + 118, 1.4, 1); label(T.n, x0 + 100, y0 + 40, 17, '#fff');
    hpBar(info, x0 + 117, y0 + 58); label(`${Math.max(0, info.hp)} / ${info.max} PV`, x0 + 142, y0 + 61, 12, '#d8d0f0');
    [['Ataque', T.atk], ['Movim.', T.mv], ['Alcance', T.rg]].forEach(([n, v], i) => { const y = y0 + 86 + i * 22; ART.rr(c, x0 + 96, y - 9, 158, 18, 7); c.fillStyle = 'rgba(255,255,255,.07)'; c.fill(); label(n, x0 + 104, y, 12, '#cfd3ff'); label(String(v), x0 + 246, y, 14, '#ffd23d', 'right'); }); }
  else { const mine = units.filter((u) => u.team === 'me' && u.hp > 0), foes = units.filter((u) => u.team === 'ai' && u.hp > 0);
    label('Tuyas', x0 + 14, y0 + 13, 11, '#9fd0ff'); mine.forEach((u, i) => drawUnit(u, x0 + 34 + i * 40, y0 + 76, 0.8, u.acted && turn === 'me' ? 0.5 : 1));
    label('Rivales', x0 + 14, y0 + 88, 11, '#ff9a9a'); foes.forEach((u, i) => drawUnit(u, x0 + 34 + i * 38, y0 + 146, 0.8, 1)); }
  label(log, W / 2, PY - 14, 14, '#e6e2ff', 'center');
  label(turn === 'me' ? 'Tu turno' : 'Turno rival', 337, PY + 22, 15, turn === 'me' ? '#9fd0ff' : '#ff9a9a', 'center');
  const mine = units.filter((u) => u.team === 'me' && u.hp > 0), left = mine.filter((u) => !u.acted).length;
  if (turn === 'me') label(`${left} por actuar`, 337, PY + 44, 11, '#cfd3ff', 'center');
  const r = endR(), on = turn === 'me' && !busy(); ART.rr(c, r.x, r.y, r.w, r.h, 14); ART.fillOut(c, on ? '#5bc85a' : '#4a4466', 2.5);
  if (on) { ART.rr(c, r.x + 4, r.y + 3, r.w - 8, 20, 8); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill(); }
  label(turn === 'me' ? 'Fin turno' : 'IA…', r.x + r.w / 2, r.y + r.h / 2 + 1, 17, on ? '#fff' : '#b8b2d0', 'center');
  drawBanner();
}
