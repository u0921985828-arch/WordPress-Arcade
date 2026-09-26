/* Penalty Flick con arte propio: desliza desde el balón hacia la portería. Largo = alto; un desliz curvo da efecto (engaña al portero).
 * Portero animado que adivina el lado y se estira hacia el balón (mejora con el nivel). Red que se deforma. Diana de escuadra = +3. 4 fallos y se acaba.
 * Arte v2 (ilustrado): césped procedural con briznas, calvas y barro; cal desgastada; portería con volumen cilíndrico y malla real;
 * portero con proporciones humanas, guantes, dos tonos, luz de borde y sombra proyectada; balón con gajos y sombra que se encoge;
 * estadio con gradas en perspectiva, público en siluetas con ola y flashes, focos, niebla y viñeta. Todo lo estático va cacheado. */
const VS = CFG.mode === 'versus', OUT = ART.OUT, R2 = 6.2832, W = VS ? 640 : 360, H = VS ? 360 : 640, CX = W / 2;
const k = Kit({ w: W, h: H, title: CFG.title, bg: '#2e8b3e' }), c = k.ctx;
const GX = VS ? 170 : 40, GY = VS ? 96 : 160, GW = VS ? 300 : 280, GH = 110, GL = GY + GH, SPOT = VS ? [CX, 326] : [180, 548], VP = [CX, GY - 40];
let kcol = '#ff9a3d', ball, keeper, goals, pts, shots, misses, state, msg, msgT, msgC, level, target, path, net, cheer, kb, aimK, t = 0, bgCv;
function setup() { ball = { x: SPOT[0], y: SPOT[1] - 14, gy: SPOT[1], s: 1, e: 0, rot: 0, a: 1, h: 0 }; keeper = { x: CX, tx: CX, a: 0, ta: 0, dive: 0, delay: 0, dir: 0 }; state = 'aim'; path = [];
  target = level >= 2 ? { x: Math.random() < 0.5 ? GX + 34 : GX + GW - 34, y: GY + 30, r: 22 } : null; }
function reset() { goals = 0; pts = 0; shots = 0; misses = 0; level = 1; msg = ''; msgT = 0; cheer = 0; kb = false; aimK = { x: CX, y: 215 }; net = { a: 0, v: 0, x: CX, y: 220 }; setup(); }

/* ================= utilidades de dibujo (cachés) ================= */
const S = Math.min(2, window.devicePixelRatio || 1);
const hr = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
function off(w, h) { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * S)); cv.height = Math.max(1, Math.round(h * S)); cv._w = w; cv._h = h; const g = cv.getContext('2d'); g.scale(S, S); return g; }
const put = (cv, x, y) => c.drawImage(cv, x, y, cv._w, cv._h);
const GC = new Map(); // gradientes memoizados (se crean una vez, se reutilizan bajo cualquier transformación)
function gm(key, make) { let v = GC.get(key); if (!v) { v = make(); GC.set(key, v); } return v; }
const lite = ART.lite, dark = ART.dark, alpha = ART.alpha, mixc = ART.mix;
function poly(g, x, y, r, n, a0) { g.beginPath(); for (let i = 0; i < n; i++) { const a = a0 + i * R2 / n; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); }
/* desenfoque barato: varias pasadas de la misma forma con alfa baja y desplazamiento */
function soft(g, draw, n, sp) { for (let i = 0; i < n; i++) { g.save(); g.translate((hr(i, 1) - 0.5) * sp, (hr(i, 2) - 0.5) * sp); g.globalAlpha = 1 / n; draw(g); g.restore(); } g.globalAlpha = 1; }

const SKY = VS ? 12 : 26, AY = VS ? 58 : 124, GS = AY + 24, NR = VS ? 5 : 9; // cielo, vallas, inicio del césped, filas de público
const HAZE = '#3f3670';
let crowdCv = [], fgCv, netBCv, netSCv, postCv, ballCv, glowCv, dianaCv;
const BR = 18, BP = 4; // radio del balón en el sprite y margen

/* ---------- Público: una caché por fila (se mueven con ola y flashes) ---------- */
function buildCrowd() {
  crowdCv = [];
  for (let r = 0; r < NR; r++) {
    const f = r / (NR - 1), sc = 0.62 + f * 0.7, hh = 15 * sc + 8, y0 = SKY + Math.pow(f, 0.88) * (AY - SKY - hh - 1);
    const g = off(W, hh + 4); const hz = (1 - f) * 0.5; // niebla aérea: las filas altas están lejos
    // grada (escalón) bajo la fila
    const step = mixc('#221c4a', HAZE, hz); g.fillStyle = step; g.fillRect(0, hh - 6 * sc, W, 6 * sc + 4);
    g.fillStyle = alpha('#ffffff', 0.07); g.fillRect(0, hh - 6 * sc, W, 1.6);
    const SH = ['#ff5f7a', '#f2d15c', '#5ce1e6', '#e9e6ff', '#7cf7a0', '#b98cff', '#ff9a3d', '#5b8cff', '#ff6fb5'];
    const SK = ['#f5c99a', '#e0a878', '#8a5a3b', '#c98a5e', '#ffd9b5'];
    const sp = 10.6 * sc, n = Math.ceil(W / sp) + 2;
    for (let i = 0; i < n; i++) {
      const x = (i - 1) * sp + hr(i, r + 9) * sp * 0.45, up = hr(i + 3, r) < 0.18, bob = hr(i, r + 2);
      const sh = mixc(SH[Math.floor(hr(r, i) * SH.length)], HAZE, hz + 0.12), sk = mixc(SK[Math.floor(hr(i + 5, r) * SK.length)], HAZE, hz + 0.1);
      const by = hh - 4 * sc - bob * 1.6 * sc, hs = 3.5 * sc;
      // hombros
      g.beginPath(); g.moveTo(x - 4.6 * sc, by + 6 * sc); g.quadraticCurveTo(x - 4.4 * sc, by - 1.4 * sc, x, by - 2 * sc); g.quadraticCurveTo(x + 4.4 * sc, by - 1.4 * sc, x + 4.6 * sc, by + 6 * sc); g.closePath();
      g.fillStyle = sh; g.fill(); g.fillStyle = alpha('#ffffff', 0.16); g.fillRect(x - 4 * sc, by - 1 * sc, 2.2 * sc, 5 * sc);
      // cabeza
      g.beginPath(); g.arc(x, by - 4.6 * sc, hs, 0, R2); g.fillStyle = sk; g.fill();
      g.fillStyle = alpha('#1a1530', 0.35); g.beginPath(); g.arc(x, by - 5.6 * sc, hs, Math.PI * 1.02, Math.PI * 1.98); g.fill();
      if (up) { g.strokeStyle = sk; g.lineWidth = 1.8 * sc; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 3.6 * sc, by + 1 * sc); g.lineTo(x - 5.6 * sc, by - 6 * sc); g.moveTo(x + 3.6 * sc, by + 1 * sc); g.lineTo(x + 5.6 * sc, by - 6 * sc); g.stroke(); }
      if (hr(i + 11, r) < 0.07) { g.fillStyle = alpha(SH[Math.floor(hr(i, r + 4) * SH.length)], 0.85); g.fillRect(x - 5 * sc, by - 11 * sc, 9 * sc, 4 * sc); } // bufanda en alto
    }
    g.fillStyle = alpha('#0d0a22', 0.3 * (1 - f) + 0.06); g.fillRect(0, 0, W, hh + 4); // las filas de arriba, más apagadas
    crowdCv.push({ cv: g.canvas, y: y0, ph: r * 0.72, f });
  }
}

/* ---------- Fondo cacheado: cielo, focos, estructura de gradas, vallas, césped y líneas ---------- */
function buildBg() {
  const g = off(W, H);
  // cielo nocturno con resplandor del estadio
  let gr = g.createLinearGradient(0, 0, 0, AY + 8); gr.addColorStop(0, '#0e0b26'); gr.addColorStop(0.55, '#1c1642'); gr.addColorStop(1, '#3a2f6a'); g.fillStyle = gr; g.fillRect(0, 0, W, AY + 8);
  // estructura de las gradas (escalones en perspectiva) detrás del público
  for (let r = 0; r < NR + 1; r++) { const f = r / NR, y = SKY + Math.pow(f, 0.88) * (AY - SKY - 6); g.fillStyle = alpha(mixc('#1e1846', HAZE, (1 - f) * 0.5), 0.95); g.fillRect(0, y, W, (AY - SKY) / NR + 6); }
  // focos
  const towers = VS ? [0.16, 0.5, 0.84] : [0.23, 0.77];
  for (const tx of towers) {
    const x = W * tx, y = SKY - 6, tw = 44, th = 13;
    g.fillStyle = '#2b2450'; g.fillRect(x - 3, y + th, 6, 10); g.fillStyle = alpha('#000', 0.3); g.fillRect(x, y + th, 3, 10);
    ART.rr(g, x - tw / 2, y - th / 2, tw, th, 3); g.fillStyle = '#2f2857'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = '#191338'; g.stroke();
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const lx = x - tw / 2 + 5 + i * 6.8, ly = y - th / 2 + 4 + j * 5; g.fillStyle = j ? '#ffe9a8' : '#fff6d6'; g.beginPath(); g.arc(lx, ly, 2.1, 0, R2); g.fill(); }
    soft(g, (q) => { q.fillStyle = alpha('#ffeec2', 0.5); q.beginPath(); q.arc(x, y, 30, 0, R2); q.fill(); }, 4, 8);
  }
  // vallas publicitarias con brillo y sombra
  const ads = [['ARCADE', '#6e62f5'], ['GOL', '#e0564a'], ['JUEGA', '#2a9e50'], ['PENALTI', '#f2b705']];
  g.fillStyle = alpha('#0b0818', 0.45); g.fillRect(0, AY - 3, W, 4);
  for (let i = 0; i < Math.ceil(W / 90) + 1; i++) {
    const x = i * 90 - (VS ? 10 : 6), a = ads[i % 4];
    ART.rr(g, x + 2, AY, 86, 24, 3); g.fillStyle = a[1]; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
    const lg = g.createLinearGradient(0, AY, 0, AY + 24); lg.addColorStop(0, alpha('#ffffff', 0.32)); lg.addColorStop(0.45, alpha('#ffffff', 0.07)); lg.addColorStop(0.5, alpha('#000000', 0.06)); lg.addColorStop(1, alpha('#000000', 0.22));
    ART.rr(g, x + 3, AY + 1, 84, 22, 3); g.fillStyle = lg; g.fill();
    g.font = '900 13px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = alpha('#000', 0.35); g.fillText(a[0], x + 45, AY + 14.2); g.fillStyle = '#fff'; g.fillText(a[0], x + 45, AY + 13);
  }
  // ---------- césped ----------
  gr = g.createLinearGradient(0, GS, 0, H); gr.addColorStop(0, '#2b7f3c'); gr.addColorStop(0.35, '#35953f'); gr.addColorStop(1, '#3fae4c'); g.fillStyle = gr; g.fillRect(0, GS, W, H - GS);
  // franjas segadas suaves con reflejo (cada franja con su propio degradado horizontal)
  let y = GS, hgt = VS ? 7 : 10;
  for (let i = 0; y < H; i++) {
    if (i % 2) { const sg = g.createLinearGradient(0, 0, W, 0); sg.addColorStop(0, alpha('#dff7c9', 0.04)); sg.addColorStop(0.42, alpha('#eaffd9', 0.13)); sg.addColorStop(1, alpha('#dff7c9', 0.03)); g.fillStyle = sg; g.fillRect(0, y, W, hgt); }
    else { g.fillStyle = alpha('#04351a', 0.06); g.fillRect(0, y, W, hgt); }
    y += hgt; hgt *= 1.22;
  }
  // calvas y desgaste (manchas deterministas, más marcadas cerca del área)
  for (let i = 0; i < 34; i++) {
    const px = hr(i, 21) * W, py = GS + 6 + hr(i, 22) * (H - GS - 8), rx = 14 + hr(i, 23) * 40, ry = rx * (0.18 + hr(i, 24) * 0.16);
    const wear = hr(i, 25); g.fillStyle = alpha(wear < 0.45 ? '#8a7434' : '#1f6b2c', 0.1 + wear * 0.08);
    g.beginPath(); g.ellipse(px, py, rx, ry, 0, 0, R2); g.fill();
  }
  // barro pisado delante de la portería y alrededor del punto de penalti
  for (const [mx, my, mw, mh, ma] of [[GX + GW / 2, GL + 4, GW * 0.46, 13, 0.3], [SPOT[0], SPOT[1], 44, 12, 0.26], [GX + 20, GL + 2, 34, 8, 0.2], [GX + GW - 20, GL + 2, 34, 8, 0.2]])
    soft(g, (q) => { q.fillStyle = alpha('#7a5c2c', ma * 0.8); q.beginPath(); q.ellipse(mx, my, mw, mh, 0, 0, R2); q.fill(); }, 5, 9);
  // briznas: longitud y densidad crecen con la cercanía
  for (let i = 0; i < 4200; i++) {
    const u = hr(i, 7), v = Math.pow(hr(i, 3), 0.72); const yy = GS + 2 + v * (H - GS - 2), per = (yy - GS) / (H - GS);
    const len = 1 + per * 4.2, tone = hr(i, 11);
    g.strokeStyle = tone < 0.34 ? alpha('#0d4d21', 0.2 + per * 0.16) : tone < 0.72 ? alpha('#8fe07a', 0.09 + per * 0.1) : alpha('#d9e86b', 0.07 + per * 0.07);
    g.lineWidth = 0.7 + per * 0.7; g.beginPath(); const bx = u * W; g.moveTo(bx, yy); g.lineTo(bx + (hr(i, 13) - 0.5) * len * 0.9, yy - len); g.stroke();
  }
  g.fillStyle = alpha('#06210f', 0.22); g.fillRect(0, GS, W, 7); // sombra bajo las vallas
  // ---------- líneas de cal (pintadas y algo desgastadas) ----------
  const chalk = off(W, H - GS + 4); chalk.translate(0, -(GS - 4));
  chalk.strokeStyle = '#f4f7ee'; chalk.lineJoin = 'round'; chalk.lineCap = 'round';
  chalk.lineWidth = 2.6; chalk.beginPath(); chalk.moveTo(0, GL); chalk.lineTo(W, GL); chalk.stroke();
  chalk.lineWidth = 2.4; chalk.beginPath(); chalk.moveTo(GX - 30, GL); chalk.lineTo(GX - 44, GL + 44); chalk.lineTo(GX + GW + 44, GL + 44); chalk.lineTo(GX + GW + 30, GL); chalk.stroke();
  chalk.lineWidth = 3.4; chalk.beginPath(); chalk.moveTo(GX - 80, GL); chalk.lineTo(GX - 160, H); chalk.moveTo(GX + GW + 80, GL); chalk.lineTo(GX + GW + 160, H); chalk.stroke();
  chalk.fillStyle = '#f4f7ee'; chalk.beginPath(); chalk.ellipse(SPOT[0], SPOT[1], 9, 4, 0, 0, R2); chalk.fill();
  chalk.globalCompositeOperation = 'destination-out'; // desgaste: pequeñas calvas en la pintura
  for (let i = 0; i < 520; i++) { const px = hr(i, 31) * W, py = GS + hr(i, 32) * (H - GS); chalk.globalAlpha = 0.25 + hr(i, 33) * 0.55; chalk.beginPath(); chalk.arc(px, py, 0.8 + hr(i, 34) * 2.4, 0, R2); chalk.fill(); }
  chalk.globalAlpha = 1; chalk.globalCompositeOperation = 'source-over';
  g.globalAlpha = 0.92; g.drawImage(chalk.canvas, 0, GS - 4, W, H - GS + 4); g.globalAlpha = 1;
  // ---------- sombra proyectada de la portería sobre el césped (luz arriba-izquierda) ----------
  const px_ = 0.4, py_ = 0.27, sh = (x, hgt2) => [x + hgt2 * px_, GL + hgt2 * py_];
  soft(g, (q) => {
    q.fillStyle = alpha('#08240d', 0.44); q.beginPath();
    const [ax, ay] = sh(GX, GH), [bx, by] = sh(GX + GW, GH);
    q.moveTo(GX - 4, GL); q.lineTo(ax - 4, ay); q.lineTo(bx + 4, by); q.lineTo(GX + GW + 4, GL); q.lineTo(GX + GW - 3, GL); q.lineTo(bx - 3, by - 5); q.lineTo(ax + 3, ay - 5); q.lineTo(GX + 3, GL); q.closePath(); q.fill();
  }, 4, 5);
  bgCv = g.canvas;
}

/* ---------- Capa de ambiente: haces de luz, niebla baja y viñeta ---------- */
function buildFg() {
  const g = off(W, H);
  const towers = VS ? [0.16, 0.5, 0.84] : [0.23, 0.77];
  for (const tx of towers) { const x = W * tx, y = SKY - 6;
    const cg = g.createLinearGradient(0, y, 0, H * 0.9); cg.addColorStop(0, alpha('#fff3cf', 0.1)); cg.addColorStop(0.3, alpha('#ffeec2', 0.028)); cg.addColorStop(1, alpha('#ffeec2', 0));
    g.fillStyle = cg; g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x - W * 0.62, H); g.lineTo(x + W * 0.62, H); g.lineTo(x + 20, y); g.closePath(); g.fill(); }
  // niebla en la línea de fondo
  const fg2 = g.createLinearGradient(0, GS - 14, 0, GS + 34); fg2.addColorStop(0, alpha('#cfd8ff', 0.16)); fg2.addColorStop(1, alpha('#cfd8ff', 0)); g.fillStyle = fg2; g.fillRect(0, GS - 14, W, 48);
  // viñeta
  const vg = g.createRadialGradient(W / 2, H * 0.55, VS ? 170 : 130, W / 2, H * 0.55, VS ? 440 : 400); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.72, 'rgba(10,6,26,.18)'); vg.addColorStop(1, 'rgba(10,6,26,.46)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  fgCv = g.canvas;
  const q = off(26, 26); q.translate(13, 13); const rg = q.createRadialGradient(0, 0, 0, 0, 0, 13); rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(0.35, 'rgba(255,245,210,.45)'); rg.addColorStop(1, 'rgba(255,245,210,0)'); q.fillStyle = rg; q.fillRect(-13, -13, 26, 26); glowCv = q.canvas;
}

/* ---------- Balón (sprite rotatorio) y diana ---------- */
function buildBall() {
  const g = off((BR + BP) * 2, (BR + BP) * 2); g.translate(BR + BP, BR + BP);
  g.beginPath(); g.arc(0, 0, BR, 0, R2); g.fillStyle = '#f6f6fb'; g.fill();
  g.save(); g.clip();
  g.fillStyle = '#241e42'; poly(g, 0, 0, BR * 0.36, 5, -Math.PI / 2); g.fill();
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * R2 / 5; poly(g, Math.cos(a) * BR * 0.78, Math.sin(a) * BR * 0.78, BR * 0.31, 5, a + Math.PI / 5); g.fillStyle = i % 2 ? '#241e42' : '#2c2550'; g.fill(); }
  g.strokeStyle = alpha('#9aa0c4', 0.5); g.lineWidth = 0.9; // costuras
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * R2 / 5; g.beginPath(); g.moveTo(Math.cos(a) * BR * 0.38, Math.sin(a) * BR * 0.38); g.lineTo(Math.cos(a) * BR * 0.62, Math.sin(a) * BR * 0.62); g.stroke(); }
  g.restore();
  ballCv = g.canvas;
  const d = off(56, 56); d.translate(28, 28);
  for (const [rr, col] of [[1, '#ff4d5e'], [0.66, '#fff6e9'], [0.33, '#ff4d5e']]) { d.beginPath(); d.arc(0, 0, 22 * rr, 0, R2); d.fillStyle = col; d.fill(); }
  d.beginPath(); d.arc(0, 0, 22, 0, R2); d.lineWidth = 2.4; d.strokeStyle = OUT; d.stroke();
  d.beginPath(); d.arc(0, 0, 20.4, Math.PI * 1.05, Math.PI * 1.75); d.lineWidth = 2; d.strokeStyle = alpha('#ffffff', 0.8); d.stroke();
  dianaCv = d.canvas;
}

/* ---------- Portería: cachés de la red (fondo y laterales) y del marco ---------- */
const NBX = GX - 18, NBY = GY - 30, NBW = GW + 36, NBH = GL - GY + 44;
function netPt(x, y) { const d2 = (x - net.x) ** 2 + (y - net.y) ** 2, a = net.a * Math.exp(-d2 / 2600); return [x + (VP[0] - x) * a * 0.3, y + (VP[1] - y) * a * 0.3 + a * 10]; }
const B0 = [GX + 16, GX + GW - 16, GY - 18, GL - 12]; // bx0, bx1, by0, by1 del fondo de la red
/* malla del fondo, con comba y deformación; se usa tanto para la caché como en vivo */
function netMesh(g) {
  const [bx0, bx1, by0, by1] = B0, NX = 22, NY = 11, sag = 3.2;
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = pass ? alpha('#ffffff', 0.55) : alpha('#141030', 0.4); g.lineWidth = pass ? 0.9 : 1.6;
    const oy = pass ? 0 : 1.1;
    for (let i = 0; i <= NX; i++) { g.beginPath(); for (let j = 0; j <= NY; j++) { const u = i / NX; const [x, y] = netPt(bx0 + (bx1 - bx0) * u, by0 + (by1 - by0) * j / NY); j ? g.lineTo(x, y + oy) : g.moveTo(x, y + oy); } g.stroke(); }
    for (let j = 0; j <= NY; j++) { const v = j / NY; g.beginPath(); for (let i = 0; i <= NX; i++) { const u = i / NX; const [x, y] = netPt(bx0 + (bx1 - bx0) * u, by0 + (by1 - by0) * v); const s2 = Math.sin(u * Math.PI) * sag * (0.3 + v * 0.7); i ? g.lineTo(x, y + s2 + oy) : g.moveTo(x, y + s2 + oy); } g.stroke(); }
  }
}
function buildNet() {
  const [bx0, bx1, by0, by1] = B0;
  let g = off(NBW, NBH); g.translate(-NBX, -NBY);
  // interior de la portería: más oscuro abajo (sombra) y algo de luz arriba-izquierda
  g.beginPath(); g.moveTo(GX, GL); g.lineTo(bx0, by1); g.lineTo(bx1, by1); g.lineTo(GX + GW, GL); g.closePath();
  let ig = g.createLinearGradient(0, by1 - 10, 0, GL + 6); ig.addColorStop(0, alpha('#0c2b13', 0.22)); ig.addColorStop(1, alpha('#07200e', 0.45)); g.fillStyle = ig; g.fill();
  ig = g.createLinearGradient(bx0, by0, bx1, by1); ig.addColorStop(0, alpha('#cfd8ff', 0.13)); ig.addColorStop(0.5, alpha('#1a1530', 0.16)); ig.addColorStop(1, alpha('#1a1530', 0.3));
  g.fillStyle = ig; g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  netMesh(g);
  netBCv = g.canvas;
  // laterales, techo y marco trasero
  g = off(NBW, NBH); g.translate(-NBX, -NBY);
  const lat = (x0, xb, oy) => { for (let j = 0; j <= 6; j++) { const f = j / 6; g.beginPath(); g.moveTo(x0, GY + (GL - GY) * f + oy); g.lineTo(xb, by0 + (by1 - by0) * f + oy); g.stroke(); } };
  g.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = pass ? alpha('#ffffff', 0.4) : alpha('#141030', 0.32); g.lineWidth = pass ? 0.9 : 1.5; const oy = pass ? 0 : 1;
    for (let i = 1; i < 6; i++) { const f = i / 6; // verticales de los laterales
      g.beginPath(); g.moveTo(GX + (bx0 - GX) * f, GY + (by0 - GY) * f + oy); g.lineTo(GX + (bx0 - GX) * f, GL + (by1 - GL) * f + oy); g.stroke();
      g.beginPath(); g.moveTo(GX + GW + (bx1 - GX - GW) * f, GY + (by0 - GY) * f + oy); g.lineTo(GX + GW + (bx1 - GX - GW) * f, GL + (by1 - GL) * f + oy); g.stroke(); }
    lat(GX, bx0, oy); lat(GX + GW, bx1, oy);
    for (let i = 1; i < 16; i++) { const x = GX + GW * i / 16, xb = bx0 + (bx1 - bx0) * i / 16; g.beginPath(); g.moveTo(x, GY + oy); g.lineTo(xb, by0 + oy + Math.sin(i / 16 * Math.PI) * 2); g.stroke(); } // techo
    for (let j = 1; j < 4; j++) { const f = j / 4; g.beginPath(); for (let i = 0; i <= 16; i++) { const u = i / 16, x = GX + GW * u + (bx0 + (bx1 - bx0) * u - (GX + GW * u)) * f, y = GY + (by0 - GY) * f + Math.sin(u * Math.PI) * 2 * f + oy; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  }
  // marco trasero con volumen
  g.strokeStyle = '#8d93a8'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(bx0, by1); g.lineTo(bx0, by0); g.lineTo(bx1, by0); g.lineTo(bx1, by1); g.moveTo(GX, GY); g.lineTo(bx0, by0); g.moveTo(GX + GW, GY); g.lineTo(bx1, by0); g.stroke();
  g.strokeStyle = alpha('#ffffff', 0.55); g.lineWidth = 1.2; g.beginPath(); g.moveTo(bx0 - 0.9, by1); g.lineTo(bx0 - 0.9, by0 - 0.9); g.lineTo(bx1, by0 - 0.9); g.stroke();
  netSCv = g.canvas;
}
function buildPosts() {
  const g = off(NBW, NBH); g.translate(-NBX, -NBY);
  const PW_ = 7; // grosor del poste
  const cyl = (x, y, w, h, vert) => { const gr = vert ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#9aa1b6'); gr.addColorStop(0.2, '#ffffff'); gr.addColorStop(0.5, '#eceef5'); gr.addColorStop(0.82, '#b9bfd0'); gr.addColorStop(1, '#7d8399');
    ART.rr(g, x, y, w, h, Math.min(w, h) / 2.4); g.fillStyle = gr; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke(); };
  // tirantes traseros (perspectiva)
  g.strokeStyle = '#7d8399'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(GX + 1, GL); g.lineTo(B0[0], B0[3]); g.moveTo(GX + GW - 1, GL); g.lineTo(B0[1], B0[3]); g.stroke();
  cyl(GX - PW_ / 2, GY - 3, PW_, GL - GY + 5, true);
  cyl(GX + GW - PW_ / 2, GY - 3, PW_, GL - GY + 5, true);
  cyl(GX - PW_ / 2, GY - PW_ / 2 - 1, GW + PW_, PW_ + 1, false);
  // brillo especular alargado (metal)
  g.fillStyle = alpha('#ffffff', 0.85); g.fillRect(GX - PW_ / 2 + 1.4, GY + 4, 1.6, GL - GY - 6); g.fillRect(GX + GW - PW_ / 2 + 1.4, GY + 4, 1.6, GL - GY - 6); g.fillRect(GX + 4, GY - PW_ / 2 + 0.6, GW - 8, 1.5);
  // anclajes en el suelo
  for (const x of [GX, GX + GW]) { g.fillStyle = alpha('#0b2b10', 0.35); g.beginPath(); g.ellipse(x + 2, GL + 2.5, 9, 3.4, 0, 0, R2); g.fill(); ART.rr(g, x - 5, GL - 3, 10, 5, 2); g.fillStyle = '#c9ccd8'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke(); }
  postCv = g.canvas;
}
function buildAll() { buildBg(); buildCrowd(); buildFg(); buildNet(); buildPosts(); buildBall(); }

if (!VS) { reset(); buildAll(); k.show(CFG.title, 'Desliza desde el balón hacia la portería: más largo = más alto, y un desliz curvo da efecto. Teclado: flechas para apuntar y A para chutar. Las dianas de escuadra valen +3. Fallas 4 y se acaba.'); }
function shoot(tx, ty, curve) {
  ball.from = [ball.x, ball.gy]; ball.tx = tx; ball.ty = ty; ball.curve = curve; ball.e = 0; state = 'fly'; shots++; k.sfx('shoot');
  // el portero lee la dirección inicial (sin el efecto) y se lanza tras un pequeño retraso
  const skill = Math.min(0.64, 0.04 + level * 0.065), px = tx - curve * 0.5, py = ty, guess = Math.random() < skill; // 1.23: más fácil (antes 0,06+0,09·nivel, tope 0,75)
  const ex = guess ? px + k.rnd(-1, 1) * (48 - Math.min(25, level * 2.5)) : 180 + k.pick([-1, 1, 0]) * k.rnd(40, 130), ey = guess ? py : k.rnd(GY + 30, GL - 20);
  keeper.dir = Math.sign(ex - 180); keeper.tx = 180 + k.clamp(ex - 180, -40, 40); keeper.ta = Math.atan2(ex - keeper.tx, GL - ey) * (Math.abs(ex - 180) < 25 ? 0.2 : 1); keeper.ta = k.clamp(keeper.ta, -1.35, 1.35); keeper.delay = Math.max(0.07, 0.27 - level * 0.016); keeper.dive = 0;
}
function result(kind) {
  state = 'after'; ball.wait = 1.4; msgT = 1.3;
  if (kind === 'goal') { goals++; const bonus = target && Math.hypot(ball.x - target.x, ball.y - target.y) < target.r + 4; const p = bonus ? 3 : 1; pts += p; msg = bonus ? '¡ESCUADRA! +3' : '¡GOOOL!'; msgC = '#f2d15c'; k.sfx('win'); k.confetti(); cheer = 1.4; if (bonus) { k.burst(target.x, target.y, '#f2d15c', 22, 180); target.hit = 1; } if (goals % 4 === 0) { level++; k.float(`Nivel ${level}`, 180, 330, '#7cf7a0'); }
    net.x = ball.x; net.y = ball.y; net.v = 9; ball.inNet = 0; }
  else { misses++; msgC = '#fff'; msg = kind === 'save' ? '¡Parada!' : kind === 'post' ? '¡Al palo!' : 'Fuera'; navigator.vibrate && navigator.vibrate(60);
    if (kind === 'save' || kind === 'post') { ball.vx = k.rnd(-160, 160); ball.vy = k.rnd(80, 220); ball.vh = k.rnd(60, 180); k.burst(ball.x, ball.y, '#fff', 10, 120); if (kind === 'post') k.sfx('hit'); }
    else { ball.vx = (ball.tx - CX) * 0.6; ball.vy = -120; ball.vh = 40; } }
  ball.res = kind;
}
if (!VS) k.run((dt) => {
  t += dt; msgT -= dt; cheer = Math.max(0, cheer - dt); net.v += (-net.a * 180 - net.v * 9) * dt; net.a += net.v * dt; if (target && target.hit) target.hit = Math.max(0, target.hit - dt);
  if (!k.gate(reset)) return;
  if (state === 'aim') {
    if (k.ptr.down && k.ptr.sy > 400) path.push([k.ptr.x, k.ptr.y]);
    if (k.ptr.up && k.ptr.sy > 400) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy;
      if (dy < -40) { // efecto: desviación máxima del recorrido respecto a la cuerda
        let dev = 0; const L = Math.hypot(dx, dy); for (const [x, y] of path) { const d = ((x - k.ptr.sx) * dy - (y - k.ptr.sy) * dx) / L; if (Math.abs(d) > Math.abs(dev)) dev = d; }
        shoot(180 + dx * 1.3, GL + 40 + dy * 0.45, k.clamp(-dev * 1.4, -70, 70)); }
      path = []; }
    if (k.held.has('left')) { aimK.x -= 160 * dt; kb = true; } if (k.held.has('right')) { aimK.x += 160 * dt; kb = true; } if (k.held.has('up')) { aimK.y -= 110 * dt; kb = true; } if (k.held.has('down')) { aimK.y += 110 * dt; kb = true; }
    aimK.x = k.clamp(aimK.x, 10, 350); aimK.y = k.clamp(aimK.y, GY - 50, GL - 8);
    if (k.hit.has('a')) shoot(aimK.x, aimK.y, 0);
  }
  if (state === 'fly' || state === 'after') { keeper.delay -= dt; if (keeper.delay <= 0 && keeper.dive < 1) { keeper.dive = Math.min(1, keeper.dive + dt * 3.4); keeper.x += (keeper.tx - keeper.x) * Math.min(1, dt * 7); keeper.a += (keeper.ta - keeper.a) * Math.min(1, dt * 9); } }
  if (state === 'fly') { const r = flyStep(dt); if (r) result(r); }
  else if (state === 'after') { const b = ball; afterMove(dt);
    b.wait -= dt; if (b.wait <= 0) { if (misses >= 4) return k.lose(CFG.id, pts, 'Fin de la tanda', `${goals} goles de ${shots}`); setup(); } }
}, () => {
  backdrop();
  drawGoalBack();
  if (state === 'after' && ball.res === 'goal') drawBall();
  drawKeeper();
  drawPosts();
  if (target) { const s = 1 + (target.hit || 0) * 0.5 + Math.sin(t * 5) * 0.05; c.save(); c.translate(target.x, target.y); c.scale(s, s); c.globalAlpha = 0.92; c.drawImage(dianaCv, -28, -28, 56, 56); c.restore(); c.globalAlpha = 1; label('+3', target.x, target.y + target.r + 2, 11, '#f2d15c', 'center'); }
  if (!(state === 'after' && ball.res === 'goal')) drawBall();
  // guía de disparo
  if (state === 'aim' && k.ptr.down && k.ptr.sy > 400 && path.length > 1) { c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(26,21,48,.6)'; c.lineWidth = 9; c.beginPath(); path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke();
    const dy = k.ptr.y - k.ptr.sy, dx = k.ptr.x - k.ptr.sx; if (dy < -40) { const tx = 180 + dx * 1.3, ty = GL + 40 + dy * 0.45; c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(tx, ty, 9, 0, R2); c.stroke(); } }
  if (state === 'aim' && kb) { c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.arc(aimK.x, aimK.y, 11, 0, R2); c.stroke(); c.strokeStyle = '#f2d15c'; c.lineWidth = 2.5; c.stroke(); c.beginPath(); c.moveTo(aimK.x - 16, aimK.y); c.lineTo(aimK.x + 16, aimK.y); c.moveTo(aimK.x, aimK.y - 16); c.lineTo(aimK.x, aimK.y + 16); c.stroke(); }
  if (state === 'aim' && !k.ptr.down && !kb && shots === 0) { const e = (t % 1.4) / 1.4; c.globalAlpha = 1 - e; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(180, 520); c.lineTo(180, 520 - e * 120); c.stroke(); c.beginPath(); c.moveTo(172, 528 - e * 120); c.lineTo(180, 518 - e * 120); c.lineTo(188, 528 - e * 120); c.stroke(); c.globalAlpha = 1; }
  put(fgCv, 0, 0);
  // HUD
  panel(8, 6, 112, 44); label(`${pts}`, 20, 10, 24, '#f2d15c'); label(`Nivel ${level}`, 108, 12, 11, '#b8f0a8', 'right'); label(`${goals}/${shots} goles`, 108, 30, 11, '#e6e1ff', 'right');
  panel(W - 140, 6, 132, 44); for (let i = 0; i < 4; i++) { const x = W - 116 + i * 32, y = 28; miniBall(x, y, 11, i < misses ? 0.35 : 1); if (i < misses) { c.strokeStyle = OUT; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 8, y - 8); c.lineTo(x + 8, y + 8); c.moveTo(x + 8, y - 8); c.lineTo(x - 8, y + 8); c.stroke(); c.strokeStyle = '#ff4d5e'; c.lineWidth = 3.5; c.stroke(); } }
  if (msgT > 0) { const e = Math.min(1, (1.3 - msgT) / 0.16), s = 0.5 + 0.5 * e + Math.sin(e * Math.PI) * 0.2; c.save(); c.translate(W / 2, 360); c.scale(s, s); c.rotate(-0.05); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, -22, 42, msgC, 'center'); c.restore(); c.globalAlpha = 1; }
});
/* ---------- Fondo en vivo: caché + público con ola y flashes ---------- */
function backdrop() {
  put(bgCv, 0, 0);
  const cw = cheer > 0 ? 1 : 0;
  for (let r = 0; r < crowdCv.length; r++) { const row = crowdCv[r];
    const dy = Math.sin(t * 1.7 - row.ph) * (0.7 + cw * 2.6) + (cw ? -Math.abs(Math.sin(t * 13 - row.ph)) * 3 : 0);
    c.drawImage(row.cv, 0, row.y + dy, row.cv._w, row.cv._h); }
  for (let i = 0; i < 3; i++) { const u = t * 1.5 + i * 37.7, sl = Math.floor(u), f = u - sl; // flashes de cámara
    if (f < 0.16) { const a = 1 - f / 0.16; c.globalAlpha = a * 0.85; const x = hr(sl, i + 1) * W, y = SKY + 4 + hr(sl, i + 5) * (AY - SKY - 10); c.drawImage(glowCv, x - 13, y - 13, 26, 26); c.globalAlpha = 1; } }
}
/* ---------- Vuelo del balón (compartido por los dos modos) ---------- */
function flyStep(dt) { ball.e += dt * 2.3 * (ball.sp || 1); const e = Math.min(1, ball.e), b = ball;
    b.x = b.from[0] + (b.tx - b.from[0]) * e + b.curve * (e * e * 0.5 + Math.sin(e * Math.PI) * 0.6); b.gy = b.from[1] + (GL + 2 - b.from[1]) * e;
    b.h = (GL - b.ty) * e + Math.sin(e * Math.PI) * 26; b.y = b.gy - 14 * (1 - e * 0.55) - Math.max(0, b.h); b.s = 1 - e * 0.55; b.rot += dt * 14;
    if (ball.e >= 1) { const bx = b.x, by = b.y, a = keeper.a, kx = keeper.x, p0 = [kx + Math.sin(a) * 12, GL - Math.cos(a) * 12], R = Math.min(102, 78 + level * 3), p1 = [kx + Math.sin(a) * R, GL - Math.cos(a) * R];
      const vx = p1[0] - p0[0], vy = p1[1] - p0[1], u = k.clamp(((bx - p0[0]) * vx + (by - p0[1]) * vy) / (vx * vx + vy * vy), 0, 1), dk = Math.hypot(bx - p0[0] - vx * u, by - p0[1] - vy * u);
      const post = (Math.abs(bx - GX) < 7 || Math.abs(bx - GX - GW) < 7) && by > GY - 6 && by < GL || Math.abs(by - GY) < 6 && bx > GX - 6 && bx < GX + GW + 6;
      const inGoal = bx > GX + 6 && bx < GX + GW - 6 && by > GY + 6 && by < GL;
      return post ? 'post' : inGoal ? (dk < 20 * (keeper.dive > 0.5 ? 1 : 0.8) ? 'save' : 'goal') : 'miss'; }
  return null; }
function afterMove(dt) { const b = ball; b.rot += dt * 6;
    if (b.res === 'goal') { b.inNet = Math.min(1, b.inNet + dt * 3); if (b.inNet >= 1) { b.y = Math.min(GL - 12 - 3, b.y + 240 * dt); } else { b.x += (VP[0] - b.x) * dt * 0.8; b.y += (VP[1] - b.y) * dt * 0.8; b.s = Math.max(0.3, b.s - dt * 0.25); } }
    else { b.x += b.vx * dt; b.y += b.vy * dt - b.vh * dt; b.vh -= 400 * dt; b.s = b.res === 'miss' ? Math.max(0.2, b.s - dt * 0.3) : Math.min(1.1, b.s + dt * 0.25); if (b.res === 'miss') b.a = Math.max(0, b.a - dt * 1.2); } }
/* ---------- Portería ---------- */
function drawGoalBack() {
  if (Math.abs(net.a) > 0.0015) { // la red ondea: se redibuja el fondo en vivo
    const [bx0, bx1, by0, by1] = B0;
    c.beginPath(); c.moveTo(GX, GL); c.lineTo(bx0, by1); c.lineTo(bx1, by1); c.lineTo(GX + GW, GL); c.closePath();
    c.fillStyle = gm('inner', () => { const g2 = c.createLinearGradient(0, by1 - 10, 0, GL + 6); g2.addColorStop(0, alpha('#0c2b13', 0.22)); g2.addColorStop(1, alpha('#07200e', 0.45)); return g2; }); c.fill();
    c.fillStyle = gm('inner2', () => { const g2 = c.createLinearGradient(bx0, by0, bx1, by1); g2.addColorStop(0, alpha('#cfd8ff', 0.13)); g2.addColorStop(0.5, alpha('#1a1530', 0.16)); g2.addColorStop(1, alpha('#1a1530', 0.3)); return g2; });
    c.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    netMesh(c);
  } else put(netBCv, NBX, NBY);
  put(netSCv, NBX, NBY);
}
function drawPosts() { put(postCv, NBX, NBY); }
/* ---------- Portero: proporciones humanas, guantes, dos tonos, luz de borde y sombra proyectada ---------- */
const SKIN = '#f3c193', SKIND = '#cf9366', GLV = '#8ef0a8', GLVD = '#3fae66';
function jerseyG(col) { return gm('jr' + col, () => { const g = c.createLinearGradient(-20, -70, 18, -34); g.addColorStop(0, lite(col, 0.34)); g.addColorStop(0.42, col); g.addColorStop(1, dark(col, 0.34)); return g; }); }
function limb2(x0, y0, x1, y1, w, col, colD) {
  c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = w + 3.2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = colD; c.lineWidth = w; c.stroke();
  const nx = (y1 - y0), ny = -(x1 - x0), L = Math.hypot(nx, ny) || 1, o = w * 0.22;
  c.strokeStyle = col; c.lineWidth = w * 0.58; c.beginPath(); c.moveTo(x0 - nx / L * o, y0 - ny / L * o); c.lineTo(x1 - nx / L * o, y1 - ny / L * o); c.stroke();
}
function drawKeeper() {
  const kp = keeper, d = kp.dive, idle = state === 'aim' ? Math.sin(t * 3) : 0, bre = state === 'aim' ? Math.sin(t * 2.2) * 0.8 : 0;
  const lift = Math.sin(Math.min(1, d) * Math.PI * 0.8) * 20 * Math.min(1, Math.abs(kp.a) * 1.5);
  const bx = kp.x + idle * 6, byF = GL - lift - Math.abs(Math.sin(t * 6)) * (state === 'aim' ? 2 : 0);
  // sombra proyectada (se alarga y desplaza con la estirada; luz arriba-izquierda)
  const sx = bx + Math.sin(kp.a) * 44 * d + 9, sw = 24 + 34 * d * Math.abs(Math.sin(kp.a)) + lift * 0.25;
  c.fillStyle = alpha('#07230c', 0.42); c.beginPath(); c.ellipse(sx, GL + 4, sw, 5.4 + d * 1.5, 0, 0, R2); c.fill();
  c.fillStyle = alpha('#0b2b10', 0.18); c.beginPath(); c.ellipse(sx + 3, GL + 5, sw * 1.25, 7 + d * 2, 0, 0, R2); c.fill();

  c.save(); c.translate(bx, byF); c.rotate(kp.a * Math.min(1, d * 1.3));
  const arm = d > 0 ? Math.min(1, d * 1.6) : 0, spread = 1 - arm;
  const JG = jerseyG(kcol), JD = dark(kcol, 0.4), SHORT = '#2a2448';
  // piernas (muslo + pantorrilla con rodilla)
  for (const s of [-1, 1]) {
    const open = 8 + arm * 6 + spread * 1, kx = s * (open * 0.9), ky = -16 - arm * 2, fx = s * (open + arm * 4), fy = -2;
    limb2(s * 6, -33, kx, ky, 9.5, SKIN, SKIND);
    limb2(kx, ky, fx, fy, 8.5, '#f3f4fa', '#c3c8dc');
    c.save(); c.translate(fx, fy); c.rotate(s * 0.05); ART.rr(c, -7, -5.5, 14, 6.5, 3); c.fillStyle = '#25203f'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = alpha('#ffffff', 0.35); c.fillRect(-5.5, -4.8, 6, 1.4); c.restore();
  }
  // pantalón
  ART.rr(c, -14.5, -41, 29, 13, 5); c.fillStyle = SHORT; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = alpha('#ffffff', 0.16); c.fillRect(-12.5, -39.5, 8, 4); c.fillStyle = alpha('#000', 0.25); c.fillRect(-1, -40.5, 2, 12);
  // brazos (hombro → codo → guante)
  for (const s of [-1, 1]) {
    const ang = spread * (s * 1.85) + arm * (s * 0.3), ax = s * 12, ay = -62;
    const ex = ax + Math.sin(ang) * 18, ey = ay - Math.cos(ang) * 18;
    const ang2 = ang + s * (spread * 0.35 - arm * 0.12), hx = ex + Math.sin(ang2) * 17, hy = ey - Math.cos(ang2) * 17;
    limb2(ax, ay, ax + Math.sin(ang) * 7, ay - Math.cos(ang) * 7, 10, lite(kcol, 0.2), JD);
    limb2(ax + Math.sin(ang) * 6, ay - Math.cos(ang) * 6, ex, ey, 8, SKIN, SKIND);
    limb2(ex, ey, hx, hy, 7.5, SKIN, SKIND);
    // guante: palma + pulgar + tira
    c.save(); c.translate(hx, hy); c.rotate(ang2);
    ART.rr(c, -6.4, -9, 12.8, 13.5, 4.5); c.fillStyle = GLV; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = GLVD; c.beginPath(); c.moveTo(1, -8.5); c.lineTo(6.2, -6); c.lineTo(6.2, 3.5); c.lineTo(1, 4); c.closePath(); c.fill();
    c.fillStyle = alpha('#ffffff', 0.55); ART.rr(c, -5, -7.6, 3.4, 7, 1.6); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-6.2, 3.2); c.lineTo(6.2, 3.2); c.stroke();
    ART.rr(c, -5.2, 3.6, 10.4, 3.4, 1.6); c.fillStyle = dark(GLV, 0.45); c.fill();
    c.restore();
  }
  // camiseta
  c.beginPath(); c.moveTo(-15, -36); c.lineTo(-17.5, -62); c.quadraticCurveTo(-15, -70, -7.5, -71.5); c.quadraticCurveTo(0, -69, 7.5, -71.5); c.quadraticCurveTo(15, -70, 17.5, -62); c.lineTo(15, -36); c.quadraticCurveTo(0, -33.4, -15, -36); c.closePath();
  c.fillStyle = JG; c.fill(); c.lineWidth = 2.8; c.strokeStyle = OUT; c.stroke();
  c.save(); c.clip();
  c.fillStyle = alpha(dark(kcol, 0.45), 0.8); c.fillRect(-18, -45.5, 36, 3.2); c.fillStyle = alpha(dark(kcol, 0.28), 0.5); c.fillRect(-18, -41.5, 36, 1.6); // franja
  c.fillStyle = alpha('#ffffff', 0.22); c.beginPath(); c.moveTo(-13, -70); c.lineTo(-6, -70); c.lineTo(-9, -36); c.lineTo(-14, -36); c.closePath(); c.fill(); // pliegue claro
  c.fillStyle = alpha('#1a1530', 0.2); c.beginPath(); c.moveTo(11, -69); c.lineTo(17, -63); c.lineTo(15, -36); c.lineTo(9, -36); c.closePath(); c.fill(); // pliegue en sombra
  c.restore();
  c.fillStyle = alpha('#ffffff', 0.9); c.font = '900 13px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.strokeStyle = alpha(OUT, 0.8); c.lineWidth = 3; c.strokeText('1', 0, -56); c.fillText('1', 0, -56);
  // cuello
  c.beginPath(); c.moveTo(-6.5, -70.5); c.quadraticCurveTo(0, -66.5, 6.5, -70.5); c.lineWidth = 2.4; c.strokeStyle = alpha('#ffffff', 0.5); c.stroke();
  // cabeza
  const hy0 = -80 + bre * 0.4;
  c.beginPath(); c.ellipse(0, hy0, 10.5, 11.5, 0, 0, R2); c.fillStyle = SKIN; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
  c.save(); c.beginPath(); c.ellipse(0, hy0, 10.5, 11.5, 0, 0, R2); c.clip();
  c.fillStyle = SKIND; c.beginPath(); c.ellipse(6, hy0 + 2, 8, 12, 0, 0, R2); c.fill(); // sombra del lado derecho
  c.fillStyle = '#5a3a22'; c.beginPath(); c.moveTo(-11, hy0 - 2); c.quadraticCurveTo(-11, hy0 - 12, 0, hy0 - 12); c.quadraticCurveTo(11, hy0 - 12, 11, hy0 - 1.5); c.quadraticCurveTo(7, hy0 - 6.5, 2, hy0 - 5.2); c.quadraticCurveTo(-4, hy0 - 4, -11, hy0 - 2); c.closePath(); c.fill();
  c.fillStyle = '#7a5231'; c.beginPath(); c.ellipse(-3.5, hy0 - 8.2, 5, 2.8, -0.28, 0, R2); c.fill();
  c.restore();
  const look = state === 'aim' ? k.clamp((ball.x - CX) / 60, -1, 1) * 2.2 : kp.dir * 2.2;
  for (const s of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(s * 3.8 + look * 0.3, hy0 + 1, 2.3, 2.5, 0, 0, R2); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(s * 3.8 + look, hy0 + 1.3, 1.35, 0, R2); c.fill(); }
  c.strokeStyle = OUT; c.lineWidth = 1.8; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-7, hy0 - 3 + (d > 0.2 ? -1 : 0)); c.lineTo(-1.5, hy0 - 4.4); c.moveTo(7, hy0 - 3 + (d > 0.2 ? -1 : 0)); c.lineTo(1.5, hy0 - 4.4); c.stroke(); // cejas
  c.beginPath(); if (d > 0.2) { c.ellipse(look, hy0 + 6.4, 2.8, 3, 0, 0, R2); c.fillStyle = '#7a2f3a'; c.fill(); c.stroke(); } else { c.moveTo(-3 + look, hy0 + 6); c.quadraticCurveTo(look, hy0 + 7.4, 3 + look, hy0 + 6); c.stroke(); }
  // luz de borde: cálida arriba-izquierda, fría abajo-derecha
  c.lineCap = 'round'; c.strokeStyle = alpha('#fff7e0', 0.6); c.lineWidth = 2;
  c.beginPath(); c.moveTo(-16.6, -60); c.quadraticCurveTo(-14.5, -69.5, -7.5, -71); c.stroke();
  c.beginPath(); c.arc(0, hy0, 10.5, Math.PI * 1.12, Math.PI * 1.6); c.stroke();
  c.strokeStyle = alpha('#7f8cd8', 0.45); c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(16.6, -58); c.lineTo(14.8, -37); c.stroke();
  c.beginPath(); c.arc(0, hy0, 10.5, Math.PI * 0.05, Math.PI * 0.45); c.stroke();
  c.restore();
}
function miniBall(x, y, r, a) { c.globalAlpha = a; c.drawImage(ballCv, x - r - 1, y - r - 1, (r + 1) * 2, (r + 1) * 2); c.beginPath(); c.arc(x, y, r, 0, R2); c.lineWidth = 1.8; c.strokeStyle = OUT; c.stroke(); c.globalAlpha = 1; }
let trail = [];
function drawBall() {
  const b = ball, r = 14 * b.s; if (b.a <= 0) return;
  // estela mientras vuela
  if (state === 'fly') { trail.push([b.x, b.y, r]); if (trail.length > 8) trail.shift(); } else if (trail.length) trail.length = 0;
  c.globalAlpha = b.a;
  if (trail.length > 2) { for (let i = 0; i < trail.length - 1; i++) { const [tx, ty, tr] = trail[i]; c.globalAlpha = b.a * (i / trail.length) * 0.3; c.beginPath(); c.arc(tx, ty, tr * (0.4 + i / trail.length * 0.5), 0, R2); c.fillStyle = '#eef1ff'; c.fill(); } c.globalAlpha = b.a; }
  if (state !== 'after' || b.res !== 'goal') { // sombra: se encoge y aclara al elevarse
    const gy = state === 'fly' ? b.gy : b.y + r, hgt = Math.max(0, state === 'fly' ? b.h : 0), f = 1 / (1 + hgt / 110);
    c.fillStyle = alpha('#0b2b10', 0.34 * f + 0.06); c.beginPath(); c.ellipse(b.x + hgt * 0.06 + 2, gy + 1.5, r * (0.55 + 0.55 * f), r * (0.2 + 0.2 * f), 0, 0, R2); c.fill();
  }
  c.save(); c.translate(b.x, b.y); const sc = r / BR; c.scale(sc, sc);
  c.save(); c.rotate(b.rot); c.drawImage(ballCv, -(BR + BP), -(BR + BP), (BR + BP) * 2, (BR + BP) * 2); c.restore();
  c.beginPath(); c.arc(0, 0, BR, 0, R2);
  c.fillStyle = gm('bsh', () => { const g2 = c.createRadialGradient(-BR * 0.4, -BR * 0.45, BR * 0.1, 0, 0, BR * 1.18); g2.addColorStop(0, 'rgba(255,255,255,.55)'); g2.addColorStop(0.42, 'rgba(255,255,255,0)'); g2.addColorStop(0.78, 'rgba(36,30,72,.16)'); g2.addColorStop(1, 'rgba(26,21,48,.5)'); return g2; }); c.fill();
  c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
  c.beginPath(); c.arc(0, 0, BR - 1.4, Math.PI * 1.06, Math.PI * 1.62); c.lineWidth = 2.2; c.strokeStyle = 'rgba(255,255,255,.92)'; c.stroke();
  c.beginPath(); c.arc(0, 0, BR - 1.4, Math.PI * 0.12, Math.PI * 0.5); c.lineWidth = 1.7; c.strokeStyle = 'rgba(130,140,210,.5)'; c.stroke();
  c.restore(); c.globalAlpha = 1;
}
function label(s, x, y, size, col, align) { c.font = `800 ${size}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'top'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
function panel(x, y, w, h) { ART.rr(c, x, y, w, h, 10); c.fillStyle = 'rgba(26,21,48,.72)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.14)'; c.stroke(); }

/* ================= Penaltis Cara a Cara (CFG.mode 'versus') =================
 * Tanda 1 contra 1: 5 penaltis por cabeza alternando tirador y portero; si hay empate, muerte súbita por parejas.
 * Tirador: mantiene una dirección (zona) y carga la fuerza manteniendo A; suelta para chutar (fuerza excesiva = se va alto, floja = el portero llega).
 * Portero: la dirección que mantenga al chutar el rival es hacia donde se lanza. Nada se dibuja de lo que eligen si ambos son humanos (en la tele no hay chivatos).
 * Sin segundo humano, la CPU ocupa la plaza: guarda el nivel en localStorage (cpu:<id>) y lee las manías del rival. */
function vsMain() {
  level = 5; const LS = 'cpu:' + CFG.id; let lvl = 0; try { lvl = +localStorage.getItem(LS) || 0; } catch (e) {}
  let seats, kicks, first = 0, sh = 0, kp = 1, pw = 0, pwOn = false, pwT = 0, aimT = 0, runT = 0, readT = -1, introT = 0, over = false, cpuT = 0, cpuZ = null, cpuPw = 0.7, tapZ = null, flick = null, kz = null, shotZ = null, hist = [[], []], started = false, endT = 0;
  const seat = () => (seats = k.players(2)), nm = (p) => (seats[p].cpu ? 'CPU' : String(seats[p].name).slice(0, 8));
  const goalsOf = (p) => kicks[p].filter(Boolean).length;
  const AIM_MAX = 12;
  function nextKick() { ball = { x: SPOT[0], y: SPOT[1] - 14, gy: SPOT[1], s: 1, e: 0, rot: 0, a: 1, h: 0, sp: 1 }; keeper = { x: CX, tx: CX, a: 0, ta: 0, dive: 0, delay: 99, dir: 0 };
    sh = kicks[0].length === kicks[1].length ? first : kicks[0].length < kicks[1].length ? 0 : 1; kp = 1 - sh; kcol = k.pcol(kp);
    state = 'intro'; introT = 1.2; pw = 0; pwOn = false; pwT = 0; aimT = 0; runT = 0; readT = -1; cpuT = k.rnd(1.1, 2.3); cpuZ = null; tapZ = null; flick = null; kz = null; shotZ = null; path = []; }
  function reset() { seat(); kicks = [[], []]; hist = [[], []]; over = false; endT = 0; msg = ''; msgT = 0; cheer = 0; net = { a: 0, v: 0, x: CX, y: 220 }; nextKick(); k.count(3); }
  k.onParty = () => seat();
  /* zona (x −1..1, y 0 abajo / 1 arriba) → punto de la portería, con error según la fuerza */
  function aimPoint(z, p, exact) { let tx = CX + z.x * (GW / 2 - 34), ty = z.y ? GY + 26 : GL - 20; if (exact) return [tx, ty];
    const err = 7 + Math.max(0, p - 0.8) * 150 + Math.max(0, 0.3 - p) * 40; tx += k.rnd(-1, 1) * err; ty += k.rnd(-1, 0.5) * err * 0.7 - Math.max(0, p - 0.9) * 150; return [tx, ty]; }
  const zoneOf = (p) => { const d = k.pdir(p); return { x: d.x, y: d.y < 0 ? 1 : 0 }; };
  function kick() { // el tirador golpea: se fija la zona y el balón sale
    let z, tx, ty, curve = 0, p = pw;
    if (seats[sh].cpu) { z = cpuZ; p = cpuPw; [tx, ty] = aimPoint(z, p); }
    else if (flick) { [tx, ty, curve] = flick; p = 0.72; z = { x: tx < CX - 50 ? -1 : tx > CX + 50 ? 1 : 0, y: ty < GY + 55 ? 1 : 0 }; }
    else { z = zoneOf(sh); [tx, ty] = aimPoint(z, p); }
    shotZ = z; hist[sh].push(z.x); ball.from = [ball.x, ball.gy]; ball.tx = tx; ball.ty = ty; ball.curve = curve; ball.e = 0; ball.sp = 0.75 + p * 0.75; state = 'fly'; k.sfx('shoot'); k.shake(2); k.burst(ball.x, ball.gy, '#b6f0a0', 8, 90);
    if (seats[kp].cpu) { // la CPU adivina: acierta más con nivel alto, lee las manías del tirador y no falla con los tiros flojos
      const hs = hist[sh].slice(-6), fav = hs.length >= 3 ? Math.sign(hs.reduce((a, b) => a + b, 0)) : 0, right = Math.random() < Math.min(0.42, 0.18 + lvl * 0.018) || p < 0.24; // 1.23: más fácil (0,26+0,035·nivel → 0,18+0,018·nivel)
      kz = right ? { x: z.x, y: z.y } : { x: fav && Math.random() < 0.5 ? fav : k.pick([-1, 0, 1]), y: Math.random() < 0.45 ? 1 : 0 }; dive(kz, 0.12); }
    else readT = 0.1; } // el humano tiene una décima de reacción
  function dive(z, delay) { const [ex, ey] = aimPoint(z, 0, true); keeper.dir = z.x; keeper.tx = CX + k.clamp(ex - CX, -40, 40); keeper.ta = k.clamp(Math.atan2(ex - keeper.tx, GL - ey) * (z.x ? 1 : 0.2), -1.35, 1.35); keeper.delay = delay; keeper.dive = 0; }
  function vsResult(kind) {
    state = 'after'; ball.wait = 1.5; msgT = 1.3; ball.res = kind; const gol = kind === 'goal'; kicks[sh].push(gol);
    if (gol) { msg = '¡GOOOL!'; msgC = k.pcol(sh); k.sfx('win'); k.confetti(k.pcol(sh), 60); cheer = 1.4; net.x = ball.x; net.y = ball.y; net.v = 9; ball.inNet = 0; }
    else { msg = kind === 'save' ? '¡Parada!' : kind === 'post' ? '¡Al palo!' : 'Fuera'; msgC = kind === 'save' ? k.pcol(kp) : '#fff'; navigator.vibrate && navigator.vibrate(60);
      if (kind === 'save' || kind === 'post') { ball.vx = k.rnd(-160, 160); ball.vy = k.rnd(80, 220); ball.vh = k.rnd(60, 180); k.burst(ball.x, ball.y, '#fff', 10, 120); if (kind === 'post') k.sfx('hit'); else { k.sfx('pop'); k.burst(ball.x, ball.y, k.pcol(kp), 16, 150); } }
      else { ball.vx = (ball.tx - CX) * 0.6; ball.vy = -120; ball.vh = 40; } } }
  function decided() { const a = kicks[0], b = kicks[1], ga = goalsOf(0), gb = goalsOf(1);
    if (a.length <= 5 && b.length <= 5) { if (ga + 5 - a.length < gb) return 1; if (gb + 5 - b.length < ga) return 0; }
    if (a.length === b.length && a.length >= 5 && ga !== gb) return ga > gb ? 0 : 1; return -1; }
  function finish(w) { over = true; const vsCPU = seats[0].cpu !== seats[1].cpu; if (vsCPU) { lvl = seats[w].cpu ? Math.max(0, lvl - 1) : Math.min(6, lvl + 1); try { localStorage.setItem(LS, lvl); } catch (e) {} }
    first = 1 - first; k.podium([{ p: 0, score: goalsOf(0) }, { p: 1, score: goalsOf(1) }], { head: `¡${nm(w)} gana la tanda!`, noTie: true, fmt: (v) => `${v} ${v === 1 ? 'gol' : 'goles'}` }); }
  reset(); buildAll();
  k.show(CFG.title, 'Tanda de 5 penaltis por cabeza y, si hay empate, muerte súbita. Chutas: mantén una dirección (arriba = por alto) y deja A pulsado para cargar; suelta en la franja verde. Paras: mantén hacia dónde te lanzas cuando el rival golpea. En el móvil también puedes deslizar para chutar y tocar un lado de la portería para parar.');
  k.run((dt) => {
    t += dt; msgT -= dt; cheer = Math.max(0, cheer - dt); net.v += (-net.a * 180 - net.v * 9) * dt; net.a += net.v * dt;
    if (!k.gate(reset)) return; started = true;
    if (k.counting()) return;
    if (over) return;
    if (state === 'intro') { introT -= dt; if (introT <= 0) state = 'aim'; return; }
    if (state === 'aim') { aimT += dt;
      // portero humano en el móvil local: toca un lado de la portería
      if (!k.party && !seats[kp].cpu && k.ptr.hit && k.ptr.y < GL + 30) tapZ = { x: k.ptr.x < CX - GW / 6 ? -1 : k.ptr.x > CX + GW / 6 ? 1 : 0, y: k.ptr.y < GY + GH / 2 ? 1 : 0 };
      if (seats[sh].cpu) { cpuT -= dt; if (!cpuZ) { const hk = hist[kp].slice(-4); const bias = lvl > 1 && hk.length ? -Math.sign(hk.reduce((a, b) => a + b, 0)) : 0; cpuZ = { x: bias && Math.random() < 0.3 ? bias : k.pick([-1, -1, 0, 1, 1]), y: Math.random() < 0.4 ? 1 : 0 }; cpuPw = k.clamp(0.66 + (Math.random() - 0.5) * Math.max(0.12, 0.6 - lvl * 0.04), 0.25, 0.97); }
        if (cpuT < 0.9) { pwOn = true; pwT += dt; pw = Math.min(cpuPw, pwT * 1.1); } if (cpuT <= 0) { runT = 0.35; state = 'run'; } }
      else { const p = sh;
        if (!k.party && k.ptr.down && k.ptr.sy > GL + 40) path.push([k.ptr.x, k.ptr.y]);
        if (!k.party && k.ptr.up && k.ptr.sy > GL + 40) { const dx = k.ptr.x - k.ptr.sx, dy = k.ptr.y - k.ptr.sy;
          if (dy < -30) { let dev = 0; const L = Math.hypot(dx, dy); for (const [x, y] of path) { const d = ((x - k.ptr.sx) * dy - (y - k.ptr.sy) * dx) / L; if (Math.abs(d) > Math.abs(dev)) dev = d; } flick = [CX + dx * 1.6, GL + 20 + dy * 0.8, k.clamp(-dev * 1.4, -60, 60)]; runT = 0.3; state = 'run'; }
          path = []; }
        if (k.pheld(p, 'a')) { if (!pwOn) { pwOn = true; pwT = 0; k.sfx('click'); } pwT += dt; const u = (pwT * 0.65) % 2; pw = u < 1 ? u : 2 - u; }
        else if (pwOn) { runT = 0.3; state = 'run'; }
        if (aimT > AIM_MAX && state === 'aim') { if (!pwOn) pw = 0.5; runT = 0.3; state = 'run'; } }
      return; }
    if (state === 'run') { runT -= dt; if (runT <= 0) kick(); return; }
    if (state === 'fly' || state === 'after') {
      if (readT >= 0 && state === 'fly') { readT -= dt; if (readT < 0) { let z = zoneOf(kp); if (!z.x && !z.y && tapZ) z = tapZ; kz = z; dive(z, 0.02); } }
      keeper.delay -= dt; if (keeper.delay <= 0 && keeper.dive < 1) { keeper.dive = Math.min(1, keeper.dive + dt * 3.4); keeper.x += (keeper.tx - keeper.x) * Math.min(1, dt * 7); keeper.a += (keeper.ta - keeper.a) * Math.min(1, dt * 9); } }
    if (state === 'fly') { const r = flyStep(dt); if (r) vsResult(r); }
    else if (state === 'after') { afterMove(dt); ball.wait -= dt; if (ball.wait <= 0) { const w = decided(); if (w >= 0) finish(w); else nextKick(); } }
  }, () => {
    backdrop();
    drawGoalBack(); if (state === 'after' && ball.res === 'goal') drawBall();
    drawKeeper(); drawPosts();
    if (!(state === 'after' && ball.res === 'goal')) drawBall();
    drawShooter();
    put(fgCv, 0, 0);
    const hideAim = !seats[0].cpu && !seats[1].cpu && k.party; // dos humanos en la tele: nada de pistas
    if (state === 'aim' && !seats[sh].cpu && !hideAim && !k.counting()) { const z = zoneOf(sh), [tx, ty] = aimPoint(z, 0, true); c.globalAlpha = 0.85; c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.arc(tx, ty, 13, 0, R2); c.stroke(); c.strokeStyle = k.pcol(sh); c.lineWidth = 3; c.stroke(); c.beginPath(); c.moveTo(tx - 19, ty); c.lineTo(tx + 19, ty); c.moveTo(tx, ty - 19); c.lineTo(tx, ty + 19); c.stroke(); c.globalAlpha = 1; }
    if (state === 'aim' && !seats[kp].cpu && !hideAim && !k.counting()) { let z = zoneOf(kp); if (!z.x && !z.y && tapZ) z = tapZ; const [ex, ey] = aimPoint(z, 0, true); c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 6); c.fillStyle = k.pcol(kp); c.beginPath(); c.arc(ex, ey, 20, 0, R2); c.fill(); c.globalAlpha = 1; label('Te lanzas aquí', ex, ey + 20, 12, '#fff', 'center'); }
    if (state === 'aim' && !k.party && !seats[sh].cpu && k.ptr.down && k.ptr.sy > GL + 40 && path.length > 1) { c.lineCap = 'round'; c.strokeStyle = 'rgba(26,21,48,.6)'; c.lineWidth = 9; c.beginPath(); path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke(); }
    vsHud();
    if (msgT > 0) { const e = Math.min(1, (1.3 - msgT) / 0.16), s = 0.5 + 0.5 * e + Math.sin(e * Math.PI) * 0.2; c.save(); c.translate(CX, 250); c.scale(s, s); c.rotate(-0.05); c.globalAlpha = Math.min(1, msgT / 0.3); label(msg, 0, -22, 40, msgC, 'center'); c.restore(); c.globalAlpha = 1; }
    if (state === 'intro' && !k.counting() && k.st === 'play') { const e = Math.min(1, (1.2 - introT) / 0.2); c.save(); c.translate(CX, 210); c.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e); c.globalAlpha = Math.min(1, introT / 0.25); ART.rr(c, -150, -34, 300, 68, 16); c.fillStyle = 'rgba(26,21,48,.82)'; c.fill(); c.lineWidth = 3; c.strokeStyle = k.pcol(sh); c.stroke();
      label(`${nm(sh)} chuta`, 0, -28, 26, k.pcol(sh), 'center'); label(`${nm(kp)} para`, 0, 4, 20, k.pcol(kp), 'center'); c.restore(); c.globalAlpha = 1; }
  });
  function vsHud() {
    const pw0 = 250; panel(CX - pw0, 4, pw0 * 2, 50);
    label(`${goalsOf(0)} – ${goalsOf(1)}`, CX, 10, 26, '#fff', 'center');
    const sd = Math.max(kicks[0].length, kicks[1].length) > 5;
    if (sd) label('Muerte súbita', CX, 38, 11, '#ffd166', 'center');
    for (const p of [0, 1]) { const dir = p ? 1 : -1, x0 = CX + dir * 60, col = k.pcol(p), act = k.st === 'play' && !over && (sh === p || kp === p);
      label(nm(p), CX + dir * 240, 8, 18, col, p ? 'right' : 'left'); label(sh === p ? 'chuta' : 'para', CX + dir * 240, 31, 12, act ? '#fff' : '#cfd6ff', p ? 'right' : 'left');
      const ks = kicks[p], off2 = Math.max(0, ks.length - 5); for (let i = 0; i < 5; i++) { const v = ks[off2 + i], x = x0 + dir * (i * 19 + 8), y = 29; c.beginPath(); c.arc(x, y, 7.5, 0, R2); ART.fillOut(c, v === undefined ? 'rgba(255,255,255,.14)' : v ? '#5fd35f' : '#ff4d5e', 1.8);
        if (v === true) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3.5, y); c.lineTo(x - 1, y + 3); c.lineTo(x + 4, y - 3); c.stroke(); } else if (v === false) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3, y - 3); c.lineTo(x + 3, y + 3); c.moveTo(x + 3, y - 3); c.lineTo(x - 3, y + 3); c.stroke(); } } }
    // barra de fuerza (franja verde = tiro limpio; roja = se va alto)
    if ((state === 'aim' || state === 'run') && pwOn && k.st === 'play') { const bx = CX + 70, by = 250, bh = 90; ART.rr(c, bx - 2, by - 2, 22, bh + 4, 6); c.fillStyle = 'rgba(26,21,48,.8)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = 'rgba(95,211,95,.45)'; c.fillRect(bx + 2, by + bh * (1 - 0.8), 14, bh * 0.35); c.fillStyle = 'rgba(255,77,94,.45)'; c.fillRect(bx + 2, by, 14, bh * 0.2);
      const hh = bh * pw; c.fillStyle = pw > 0.85 ? '#ff4d5e' : pw > 0.45 ? '#5fd35f' : '#ffd166'; c.fillRect(bx + 4, by + bh - hh, 10, hh); label('Fuerza', bx + 9, by + bh + 4, 11, '#fff', 'center'); }
    if (state === 'aim' && !seats[sh].cpu && k.st === 'play' && !k.counting()) { const f = Math.max(0, 1 - aimT / AIM_MAX); c.fillStyle = 'rgba(26,21,48,.6)'; c.fillRect(CX - 100, 58, 200, 6); c.fillStyle = f < 0.3 ? '#ff4d5e' : k.pcol(sh); c.fillRect(CX - 100, 58, 200 * f, 6);
      if (!pwOn && aimT < 3 && kicks[0].length + kicks[1].length < 2) label(k.party ? 'Mantén dirección + A, suelta para chutar' : 'Flechas + mantén A (o desliza)', CX, 68, 14, '#fff', 'center'); }
  }
  /* Tirador de espaldas junto al balón (color del jugador): carrerilla y golpeo */
  function drawShooter() { const col = k.pcol(sh), run = state === 'run' ? 1 - runT / 0.3 : state === 'fly' || state === 'after' ? 1 : 0, kickA = state === 'fly' ? Math.min(1, ball.e * 3) : state === 'after' ? 1 : 0;
    const x = CX - 46 + run * 26, y = H - 4 - Math.abs(Math.sin(run * Math.PI * 2)) * 4 * (state === 'run' ? 1 : 0), s = 1.08;
    c.fillStyle = alpha('#0b2b10', 0.3); c.beginPath(); c.ellipse(x + 8, y + 1, 21, 5.4, 0, 0, R2); c.fill();
    c.save(); c.translate(x, y); c.scale(s, s);
    const legs = [[-7, state === 'run' ? Math.sin(run * 12) * 6 : 0], [7, kickA ? -18 * kickA : state === 'run' ? -Math.sin(run * 12) * 6 : 0]];
    for (const [lx, sw] of legs) { limb2(lx * 0.8, -34, lx + sw * 0.55, -18, 9.5, '#2a2448', dark('#2a2448', 0.3)); limb2(lx + sw * 0.55, -18, lx + sw, -4, 8, SKIN, SKIND);
      c.save(); c.translate(lx + sw, -4); ART.rr(c, -7, -5.5, 14, 6.5, 3); c.fillStyle = '#f3f4fa'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); c.fillStyle = alpha('#1a1530', 0.3); c.fillRect(-6, -1.6, 12, 2); c.restore(); }
    ART.rr(c, -14, -44, 28, 13, 5); c.fillStyle = '#24203c'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke(); c.fillStyle = alpha('#ffffff', 0.15); c.fillRect(-12, -42.5, 7, 4);
    for (const sd of [-1, 1]) { const sw = state === 'run' ? Math.sin(run * 12) * 10 * sd : 0; limb2(sd * 13, -66, sd * 19 + sw * 0.3, -44 + sw * 0.4, 8.5, lite(col, 0.15), dark(col, 0.35));
      c.beginPath(); c.arc(sd * 19 + sw * 0.3, -42 + sw * 0.4, 4.2, 0, R2); c.fillStyle = SKIN; c.fill(); c.lineWidth = 1.8; c.strokeStyle = OUT; c.stroke(); }
    c.beginPath(); c.moveTo(-15, -42); c.lineTo(-17, -64); c.quadraticCurveTo(-14.5, -72, -7, -73.5); c.quadraticCurveTo(0, -71, 7, -73.5); c.quadraticCurveTo(14.5, -72, 17, -64); c.lineTo(15, -42); c.quadraticCurveTo(0, -39.5, -15, -42); c.closePath();
    c.fillStyle = gm('shj' + col, () => { const g2 = c.createLinearGradient(-18, -72, 16, -40); g2.addColorStop(0, lite(col, 0.34)); g2.addColorStop(0.45, col); g2.addColorStop(1, dark(col, 0.34)); return g2; }); c.fill(); c.lineWidth = 2.8; c.strokeStyle = OUT; c.stroke();
    c.save(); c.clip(); c.fillStyle = alpha('#ffffff', 0.2); c.beginPath(); c.moveTo(-13, -72); c.lineTo(-6, -72); c.lineTo(-9, -40); c.lineTo(-14, -40); c.closePath(); c.fill();
    c.fillStyle = alpha('#1a1530', 0.2); c.beginPath(); c.moveTo(10, -71); c.lineTo(17, -64); c.lineTo(15, -40); c.lineTo(9, -40); c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#fff'; c.font = '900 15px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = OUT; c.lineWidth = 3; c.strokeText(String(sh + 1) + '0', 0, -57); c.fillText(String(sh + 1) + '0', 0, -57);
    c.beginPath(); c.ellipse(0, -83, 10.5, 11, 0, 0, R2); c.fillStyle = '#5a3a22'; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.stroke();
    c.save(); c.beginPath(); c.ellipse(0, -83, 10.5, 11, 0, 0, R2); c.clip(); c.fillStyle = '#7a5231'; c.beginPath(); c.ellipse(-3.5, -89, 6, 3.6, -0.3, 0, R2); c.fill();
    c.fillStyle = alpha('#1a1530', 0.22); c.beginPath(); c.ellipse(6, -81, 8, 12, 0, 0, R2); c.fill(); c.restore();
    c.fillStyle = SKIN; c.beginPath(); c.arc(0, -76, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.fill(); c.strokeStyle = alpha(OUT, 0.5); c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = alpha('#fff7e0', 0.55); c.lineWidth = 2; c.beginPath(); c.moveTo(-16.2, -62); c.quadraticCurveTo(-14, -71.5, -7, -73); c.stroke();
    c.restore(); }
}
if (VS) vsMain();
