/* TRIVIA con pulsador para 1–4 (modo tele). CFG.mode: 'quiz' (Trivia de Sobremesa: 4 opciones, 6 categorías con ruleta)
 * | 'tf' (Verdad o Bulo: verdadero/falso con explicación tras responder). Rondas de 10 preguntas y podio.
 * Datos propios fuera del motor (fetch diferido): ../_data/trivia-es.json y ../_data/verdad-es.json.
 * Entrada: joystick elige (A/B/C/D en rejilla 2×2, o ← Verdad / → Bulo) y A confirma; en un solo dispositivo también se toca la
 * respuesta. En la tele, si hay canal privado, cada móvil recibe además las opciones para responder a escondidas (k.priv).
 * Puntos: acierto 100 + hasta 100 por rapidez (la última pregunta vale doble); en Verdad o Bulo el fallo resta 50.
 * CPU: acierta según la dificultad de la pregunta y mejora con las victorias humanas guardadas en localStorage (cpu:<id>). */
const TF = CFG.mode === 'tf', OUT = ART.OUT, TAU = 6.2832;
const LAND = innerWidth >= innerHeight * 0.98;
const W = LAND ? 800 : 450, H = LAND ? 450 : 800;
const k = Kit({ w: W, h: H, title: CFG.title, bg: TF ? '#14233a' : '#1b1640' }), c = k.ctx;
const FONT = (s, wt) => `${wt || 800} ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
const NQ = 10, TQ = TF ? 15 : 22, /* 1.23: más tiempo (antes 10/15 s) */ SEATS = 4;
const OPC = ['#ff6b6b', '#4fb3ff', '#ffc94a', '#6fd66f'], LET = ['A', 'B', 'C', 'D'];
let CPU = 0; try { CPU = Math.min(8, +localStorage.getItem('cpu:' + CFG.id) || 0); } catch (e) { /* sin almacenamiento */ }

/* ---------- Disposición (apaisado para la tele, vertical para el móvil) ---------- */
const L = LAND
  ? { top: 10, card: [24, 58, 752, 128], opt: (i) => [24 + (i % 2) * 384, 198 + (i >> 1) * 84, 368, 70], tfo: (i) => [24 + i * 384, 198, 368, 152], lec: (i) => [24 + i * 190, 370, 182, 76], fs: 25, of: 21 }
  : { top: 12, card: [16, 62, 418, 262], opt: (i) => [16 + (i % 2) * 215, 340 + (i >> 1) * 142, 203, 130], tfo: (i) => [16 + i * 215, 340, 203, 272], lec: (i) => [16 + i * 106, 668, 100, 118], fs: 25, of: 19 };

/* ---------- Datos ---------- */
let DATA = null, LOADERR = false;
const FALLBACK = TF
  ? { s: [{ v: true, d: 1, t: 'El Sol es una estrella.', e: 'Es la estrella más cercana a la Tierra.' }, { v: false, d: 1, t: 'Las arañas son insectos.', e: 'Son arácnidos: tienen ocho patas.' }] }
  : { cats: { geo: { n: 'Geografía', col: '#3fb6ea' } }, q: [{ c: 'geo', d: 1, q: '¿Cuál es la capital de España?', a: ['Madrid', 'Sevilla', 'Valencia', 'Bilbao'] }] };
fetch(TF ? '../_data/verdad-es.json' : '../_data/trivia-es.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((d) => { DATA = d; }).catch(() => { DATA = FALLBACK; LOADERR = true; });
const SEENK = 'triv:seen:' + CFG.id;
function seenGet() { try { return JSON.parse(localStorage.getItem(SEENK) || '[]'); } catch (e) { return []; } }
function seenAdd(ids) { try { const s = seenGet().concat(ids).slice(-420); localStorage.setItem(SEENK, JSON.stringify(s)); } catch (e) { /* sin almacenamiento */ } }
/* Mazo de 10: arranque suave (dificultad 1), centro de dificultad 2 y final con 3; en quiz sin repetir categoría seguida. */
function deck() {
  const all = TF ? DATA.s : DATA.q, seen = new Set(seenGet()), plan = TF ? [1, 1, 1, 2, 2, 2, 2, 2, 3, 3] : [1, 1, 1, 2, 2, 2, 2, 3, 2, 3];
  const out = [], used = new Set();
  plan.forEach((d, n) => {
    const prevC = out.length ? out[out.length - 1].c : null;
    const ok = (i, strict) => !used.has(i) && (!strict || !seen.has(i)) && (all[i].d === d || (strict === 2 ? false : Math.abs(all[i].d - d) <= 1)) && (TF || all[i].c !== prevC || strict === 0);
    let pool = [];
    for (const lv of [2, 1, 0]) { pool = []; for (let i = 0; i < all.length; i++) if (lv === 2 ? ok(i, 2) && !seen.has(i) : lv === 1 ? ok(i, 1) : ok(i, 0) || !used.has(i)) pool.push(i); if (pool.length) break; }
    const i = pool.length ? k.pick(pool) : n % all.length; used.add(i);
    const src = all[i];
    if (TF) out.push({ id: i, d: src.d, t: src.t, v: src.v, e: src.e, n: 2, right: src.v ? 0 : 1 });
    else { const ord = k.shuffle([0, 1, 2, 3]); out.push({ id: i, d: src.d, c: src.c, t: src.q, opts: ord.map((j) => src.a[j]), right: ord.indexOf(0), n: 4 }); }
  });
  seenAdd(out.map((q) => q.id));
  return out;
}

/* ---------- Estado ---------- */
let Qs, qi, phase, pt, seat, started, wheelA, wheelFrom, wheelTo, revealT, lastTick, tickN, wrapCache = {};
function mkSeats() { return k.players(SEATS).map((pl) => ({ p: pl.p, score: 0, sel: -1, lock: false, lockT: 0, gain: 0, cpuT: 0, cpuPick: -1, streak: 0, ok: 0 })); }
function reset() { seat = mkSeats(); Qs = null; qi = -1; phase = 'wait'; pt = 0; started = false; }
function hum(p) { return k.human(p); }
function curQ() { return Qs && Qs[qi]; }
function beginQ() {
  qi++; pt = 0; tickN = 0;
  for (const s of seat) { s.sel = -1; s.lock = false; s.lockT = 0; s.gain = 0; s.cpuPick = -1; }
  const q = curQ();
  phase = TF ? 'ask' : 'wheel';
  if (!TF) { const keys = Object.keys(DATA.cats), idx = Math.max(0, keys.indexOf(q.c)); wheelFrom = wheelA || 0; wheelTo = Math.ceil(wheelFrom / TAU) * TAU + TAU * 2 + (-(idx + 0.5) * TAU / keys.length) + TAU; wheelA = wheelFrom; k.sfx('click'); }
  else { onAsk(); }
}
function onAsk() {
  phase = 'ask'; pt = 0; const q = curQ();
  const base = TF ? [0, 0.64, 0.55, 0.47][q.d] : [0, 0.52, 0.38, 0.26][q.d]; // 1.23: CPU acierta menos (antes 0.74/0.62/0.5 y 0.72/0.52/0.36)
  for (const s of seat) {
    if (hum(s.p)) continue;
    const pc = Math.min(0.85, base + CPU * 0.015 + k.rnd(-0.05, 0.05));
    s.cpuPick = Math.random() < pc ? q.right : k.pick([...Array(q.n).keys()].filter((i) => i !== q.right));
    s.cpuT = k.rnd(TF ? 1.8 : 3, TQ * (0.55 + Math.random() * 0.3));
  }
  if (k.privOK) for (const s of seat) if (hum(s.p)) k.priv(s.p, { title: `${TF ? 'Afirmación' : 'Pregunta'} ${qi + 1}/${NQ}`, text: q.t, items: optLabels(q).map((lb, i) => ({ v: i, label: TF ? lb : LET[i], sub: TF ? '' : lb, col: TF ? (i ? '#ff6b6b' : '#6fd66f') : OPC[i] })) });
}
function optLabels(q) { return TF ? ['Verdad', 'Bulo'] : q.opts; }
function lock(s, i) {
  if (s.lock || phase !== 'ask') return;
  s.sel = i; s.lock = true; s.lockT = pt; k.sfx('pop');
  const [x, y, w] = L.lec(seat.indexOf(s)); k.burst(x + w / 2, y + 10, k.pcol(s.p), 10, 120);
  if (hum(s.p) && k.privOK) k.priv(s.p, { title: '¡Respuesta enviada!', text: TF ? (i ? 'Bulo' : 'Verdad') : LET[i] + ' · ' + curQ().opts[i], items: [] });
}
function reveal() {
  phase = 'reveal'; pt = 0; const q = curQ(), dbl = !TF && qi === NQ - 1 ? 2 : 1;
  let anyHumOk = false, anyHum = false;
  seat.forEach((s, n) => {
    const [x, y, w] = L.lec(n);
    if (s.lock && s.sel === q.right) {
      const fr = Math.max(0, 1 - s.lockT / TQ); s.gain = Math.round((100 + 100 * fr) * dbl / 5) * 5; s.streak++; s.ok++;
      if (s.streak >= 3) s.gain += 25;
      k.float('+' + s.gain, x + w / 2, y - 6, '#7cf7a0');
      if (hum(s.p)) anyHumOk = true;
    } else {
      s.streak = 0; s.gain = TF && s.lock ? -Math.min(50, s.score) : 0;
      if (s.gain) k.float(String(s.gain), x + w / 2, y - 6, '#ff8a8a');
    }
    if (hum(s.p)) anyHum = true;
    s.score += s.gain;
  });
  const r = optRect(q.right); k.burst(r[0] + r[2] / 2, r[1] + r[3] / 2, '#7cf7a0', 26, 220);
  if (anyHum) k.sfx(anyHumOk ? 'coin' : 'hurt'); else k.sfx('pop');
  if (anyHum && !anyHumOk) k.shake(4);
  if (k.privOK) for (const s of seat) if (hum(s.p)) k.priv(s.p, { title: s.sel === q.right ? '¡Correcto!' : s.lock ? 'Fallaste' : 'Sin respuesta', text: TF ? (q.v ? 'Verdad. ' : 'Bulo. ') + q.e : 'Era: ' + q.opts[q.right], items: [] });
}
function finish() {
  const rows = seat.map((s) => ({ p: s.p, score: s.score }));
  const top = rows.slice().sort((a, b) => b.score - a.score)[0];
  if (hum(top.p) && top.score > 0) { CPU = Math.min(8, CPU + 1); try { localStorage.setItem('cpu:' + CFG.id, CPU); } catch (e) { /* sin almacenamiento */ } }
  const me = seat[0]; if (!k.party) k.best(CFG.id, me.score);
  if (k.privOK) for (const s of seat) if (hum(s.p)) k.priv(s.p, null);
  const aciertos = k.party ? '' : ` · Aciertos: ${me.ok}/${NQ}`;
  const srt = rows.slice().sort((a, b) => b.score - a.score), solo1 = !k.party && srt[0].p === 0 && (srt.length < 2 || srt[1].score < srt[0].score);
  k.podium(rows, { head: solo1 ? '¡Has ganado!' : undefined, go: `${k.party ? '' : 'Tu récord: ' + k.best(CFG.id, 0) + aciertos + '<br>'}Toca para otra ronda` });
}
function optRect(i) { return TF ? L.tfo(i) : L.opt(i); }

/* ---------- Entrada ---------- */
function moveSel(s, d, n) {
  if (TF) { if (d.x < 0) s.sel = 0; else if (d.x > 0) s.sel = 1; else if (s.sel < 0 && d.y) s.sel = 0; return; }
  let i = s.sel < 0 ? 0 : s.sel, cx = i % 2, cy = i >> 1;
  if (s.sel < 0) { cx = d.x > 0 ? 1 : 0; cy = d.y > 0 ? 1 : 0; } else { if (d.x) cx = d.x > 0 ? 1 : 0; if (d.y) cy = d.y > 0 ? 1 : 0; }
  s.sel = Math.min(n - 1, cy * 2 + cx);
}
k.onPick = (p, v) => { const s = seat && seat.find((x) => x.p === p); if (s && phase === 'ask' && hum(p) && typeof v === 'number') lock(s, v); };
k.onParty = () => { if (k.st !== 'play') reset(); };

/* ---------- Bucle ---------- */
reset();
k.show(CFG.title, TF
  ? 'Lee la afirmación y decide si es verdad o un bulo. Acertar rápido suma más; fallar resta. Tras cada respuesta verás la explicación.'
  : 'Diez preguntas de seis categorías. Elige A, B, C o D antes que tus rivales: acertar rápido suma más y la última vale doble.');
k.run((dt) => {
  if (!k.gate(reset)) return;
  if (!DATA) return;
  if (!started) { started = true; seat = mkSeats(); Qs = deck(); k.count(3); return; }
  if (k.counting()) return;
  if (phase === 'wait') { beginQ(); return; }
  pt += dt;
  const q = curQ();
  if (phase === 'wheel') {
    const e = Math.min(1, pt / 1.5), ez = 1 - Math.pow(1 - e, 3); const prev = wheelA; wheelA = wheelFrom + (wheelTo - wheelFrom) * ez;
    if (Math.floor(prev / (TAU / 6)) !== Math.floor(wheelA / (TAU / 6)) && e < 1) k.sfx('click');
    if (pt > 2.1 || (pt > 0.5 && (k.hit.has('a') || k.ptr.hit) && !k.party)) { wheelA = wheelTo; onAsk(); }
    return;
  }
  if (phase === 'ask') {
    seat.forEach((s) => {
      if (s.lock) return;
      if (hum(s.p)) {
        const d = { x: (k.phit(s.p, 'right') ? 1 : 0) - (k.phit(s.p, 'left') ? 1 : 0), y: (k.phit(s.p, 'down') ? 1 : 0) - (k.phit(s.p, 'up') ? 1 : 0) };
        if (d.x || d.y) { moveSel(s, d, q.n); k.sfx('click'); }
        if (k.phit(s.p, 'a') && s.sel >= 0) lock(s, s.sel);
        else if (k.phit(s.p, 'a') && s.sel < 0) { s.sel = 0; k.sfx('click'); }
        if (s.p === 0 && !k.party && k.ptr.hit) for (let i = 0; i < q.n; i++) { const [x, y, w, h] = optRect(i); if (k.ptr.x >= x && k.ptr.x <= x + w && k.ptr.y >= y && k.ptr.y <= y + h) { lock(s, i); break; } }
      } else if (pt >= s.cpuT) lock(s, s.cpuPick);
    });
    const left = TQ - pt;
    if (left < 3.5 && Math.ceil(left) !== tickN) { tickN = Math.ceil(left); if (tickN > 0) k.sfx('tick'); }
    const humansIn = seat.filter((s) => hum(s.p));
    if (left <= 0 || seat.every((s) => s.lock) || (humansIn.length && humansIn.every((s) => s.lock) && seat.filter((s) => !s.lock).every((s) => s.cpuT - pt < 0.4))) reveal();
    return;
  }
  if (phase === 'reveal') {
    const dur = TF ? 5 : 3.2, skip = pt > 1.2 && !k.party && (k.hit.has('a') || k.ptr.hit);
    if (pt > dur || skip) { if (qi >= NQ - 1) { phase = 'end'; finish(); } else beginQ(); }
  }
}, draw);
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerWidth >= innerHeight * 0.98) !== LAND && k.st !== 'play') location.reload(); }, 400); });

/* ---------- Dibujo ---------- */
let bgC = null;
function stageBg() {
  if (bgC) return bgC;
  bgC = document.createElement('canvas'); bgC.width = W; bgC.height = H; const g = bgC.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, TF ? '#1d3656' : '#2a2066'); gr.addColorStop(0.62, TF ? '#132338' : '#18123f'); gr.addColorStop(1, TF ? '#0b1522' : '#0e0a28'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* telón lateral y rayos */
  for (let i = 0; i < 14; i++) { g.fillStyle = ART.alpha('#ffffff', 0.025); g.beginPath(); const a = -0.9 + i * 0.13; g.moveTo(W / 2, -40); g.lineTo(W / 2 + Math.tan(a) * H * 1.3 - 30, H); g.lineTo(W / 2 + Math.tan(a) * H * 1.3 + 30, H); g.fill(); }
  const fy = LAND ? 360 : 650; const fl = g.createLinearGradient(0, fy, 0, H); fl.addColorStop(0, TF ? '#20456b' : '#3b2a7a'); fl.addColorStop(1, TF ? '#0d1b2b' : '#140e33'); g.fillStyle = fl; g.fillRect(0, fy, W, H - fy);
  g.strokeStyle = ART.alpha('#ffffff', 0.07); g.lineWidth = 1; for (let x = -W; x < W * 2; x += 46) { g.beginPath(); g.moveTo(W / 2 + (x - W / 2) * 0.35, fy); g.lineTo(x, H); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = ART.alpha('#ffffff', 0.05 + Math.random() * 0.12); g.beginPath(); g.arc(Math.random() * W, Math.random() * fy * 0.9, Math.random() * 1.8 + 0.4, 0, TAU); g.fill(); }
  /* bombillas del marco */
  for (let x = 12; x < W; x += 28) { g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(x, 4, 3, 0, TAU); g.fill(); }
  return bgC;
}
function panel(x, y, w, h, r, fill, o) {
  o = o || {};
  c.save();
  if (!o.flat) { c.fillStyle = 'rgba(8,4,24,.45)'; ART.rr(c, x, y + (o.drop || 5), w, h, r); c.fill(); }
  ART.rr(c, x, y, w, h, r);
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, ART.lite(fill, 0.16)); g.addColorStop(1, ART.dark(fill, 0.12)); c.fillStyle = g; c.fill();
  c.lineWidth = o.lw || 3; c.strokeStyle = o.stroke || OUT; c.stroke();
  c.save(); ART.rr(c, x, y, w, h, r); c.clip(); c.fillStyle = 'rgba(255,255,255,.13)'; c.fillRect(x, y, w, Math.min(10, h * 0.18)); c.restore();
  c.restore();
}
function wrap(txt, maxW, size, wt) {
  const key = txt + '|' + maxW + '|' + size; if (wrapCache[key]) return wrapCache[key];
  c.font = FONT(size, wt); const words = txt.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return (wrapCache[key] = lines);
}
function fitText(txt, maxW, maxH, size, minSize, wt) { let s = size, ls; for (;;) { ls = wrap(txt, maxW, s, wt); if (ls.length * s * 1.18 <= maxH || s <= minSize) break; s -= 1; } return { ls, s }; }
function textBlock(txt, x, y, w, h, size, minSize, col, wt, align) {
  const { ls, s } = fitText(txt, w, h, size, minSize, wt); const lh = s * 1.18, y0 = y + h / 2 - (ls.length * lh) / 2 + lh / 2;
  c.font = FONT(s, wt); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.fillStyle = col;
  ls.forEach((l, i) => c.fillText(l, align === 'left' ? x : x + w / 2, y0 + i * lh));
}
function outlined(t, x, y, size, col, align, lw) { c.font = FONT(size, 900); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = lw || 5; c.strokeStyle = OUT; c.strokeText(t, x, y); c.fillStyle = col; c.fillText(t, x, y); }
function check(x, y, s, col) { c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = s * 0.42; c.beginPath(); c.moveTo(x - s * 0.5, y); c.lineTo(x - s * 0.12, y + s * 0.38); c.lineTo(x + s * 0.55, y - s * 0.42); c.stroke(); c.strokeStyle = col; c.lineWidth = s * 0.22; c.stroke(); c.restore(); }
function cross(x, y, s, col) { c.save(); c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = s * 0.42; c.beginPath(); c.moveTo(x - s * 0.42, y - s * 0.42); c.lineTo(x + s * 0.42, y + s * 0.42); c.moveTo(x + s * 0.42, y - s * 0.42); c.lineTo(x - s * 0.42, y + s * 0.42); c.stroke(); c.strokeStyle = col; c.lineWidth = s * 0.22; c.stroke(); c.restore(); }
function spot(t) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) { const a = Math.sin(t * 0.5 + i * 2.2) * 0.35, x0 = i ? W * 0.85 : W * 0.15; const g = c.createLinearGradient(x0, 0, x0 + Math.sin(a) * H, H); g.addColorStop(0, 'rgba(255,240,200,.10)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x0 - 8, 0); c.lineTo(x0 + 8, 0); c.lineTo(x0 + Math.sin(a) * H + 90, H); c.lineTo(x0 + Math.sin(a) * H - 90, H); c.fill(); }
  c.restore();
}
function wheel(cx, cy, r, ang) {
  const keys = Object.keys(DATA.cats), n = keys.length;
  c.save(); c.translate(cx, cy);
  c.fillStyle = 'rgba(8,4,24,.4)'; c.beginPath(); c.arc(0, 6, r + 6, 0, TAU); c.fill();
  c.rotate(ang);
  keys.forEach((kk, i) => { const a0 = (i * TAU) / n - TAU / 4, a1 = a0 + TAU / n; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, a0, a1); c.closePath(); c.fillStyle = DATA.cats[kk].col; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    c.save(); c.rotate(a0 + TAU / n / 2 + TAU / 4); c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(0, -r * 0.68, r * 0.1, 0, TAU); c.fill(); c.restore(); });
  c.restore();
  c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke();
  c.beginPath(); c.arc(cx, cy, r * 0.22, 0, TAU); c.fillStyle = '#fff4d6'; c.fill(); c.lineWidth = 3; c.stroke();
  c.beginPath(); c.moveTo(cx - 13, cy - r - 12); c.lineTo(cx + 13, cy - r - 12); c.lineTo(cx, cy - r + 12); c.closePath(); c.fillStyle = '#ffd36b'; c.fill(); c.lineWidth = 3; c.stroke();
}
function catAt(ang) { const keys = Object.keys(DATA.cats), n = keys.length; let a = (-ang) % TAU; if (a < 0) a += TAU; return keys[Math.floor(a / (TAU / n)) % n]; }
function lectern(i, s, t) {
  const [x, y, w, h] = L.lec(i), col = k.pcol(s.p), pl = k.players(SEATS)[i], q = curQ(), rev = phase === 'reveal' || phase === 'end';
  const glow = s.lock && !rev; const up = s.lock ? 3 : 0;
  panel(x, y + 16, w, h - 16, 12, ART.dark(col, 0.45));
  c.fillStyle = col; c.fillRect(x + 3, y + 22, w - 6, 5);
  /* pulsador */
  const bx = x + w / 2, by = y + 18 + up, br = LAND ? 20 : 17;
  if (glow) { c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 10); c.fillStyle = col; c.beginPath(); c.arc(bx, by, br + 10, Math.PI, 0); c.fill(); c.restore(); }
  c.beginPath(); c.arc(bx, by, br, Math.PI, 0); c.closePath(); const g = c.createRadialGradient(bx - 6, by - 10, 2, bx, by, br); g.addColorStop(0, ART.lite(col, 0.55)); g.addColorStop(1, s.lock ? col : ART.dark(col, 0.25)); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  const nm = pl.cpu ? 'CPU' : k.party ? pl.name : 'Tú';
  if (LAND) {
    outlined(nm, x + 12, y + 44, 18, col, 'left', 4);
    outlined(String(s.score), x + w - 12, y + 44, 24, '#fff', 'right', 5);
    let st = s.lock ? (rev ? '' : 'Listo') : phase === 'ask' ? '…' : '';
    if (rev && q) st = s.lock ? (TF ? (s.sel ? 'Bulo' : 'Verdad') : 'Dijo ' + LET[s.sel]) : 'Sin respuesta';
    c.font = FONT(15, 700); c.textAlign = 'left'; c.fillStyle = '#e8e3ff'; c.fillText(st, x + 12, y + 66);
    if (rev && q && s.lock) (s.sel === q.right ? check : cross)(x + w - 18, y + 66, 16, s.sel === q.right ? '#7cf7a0' : '#ff6b6b');
    if (s.streak >= 3) { c.font = FONT(13, 800); c.textAlign = 'right'; c.fillStyle = '#ffd36b'; c.fillText('Racha ' + s.streak, x + w - 12, y + 66); }
  } else {
    outlined(nm, x + w / 2, y + 48, 17, col, 'center', 4);
    outlined(String(s.score), x + w / 2, y + 76, 24, '#fff', 'center', 5);
    if (rev && q && s.lock) (s.sel === q.right ? check : cross)(x + w / 2, y + 102, 16, s.sel === q.right ? '#7cf7a0' : '#ff6b6b');
    else if (s.lock) { c.font = FONT(14, 700); c.textAlign = 'center'; c.fillStyle = '#e8e3ff'; c.fillText('Listo', x + w / 2, y + 102); }
  }
}
function drawOption(i, q, t) {
  const [x, y, w, h] = optRect(i), rev = phase === 'reveal', right = rev && i === q.right, wrongPick = rev && i !== q.right && seat.some((s) => s.lock && s.sel === i);
  let fill = TF ? (i ? '#d9534f' : '#3fa55a') : '#2d2a5c'; if (rev && !right) fill = ART.dark(fill, 0.35); if (right) fill = '#34b36b';
  const pulse = right ? Math.sin(t * 8) * 2 : 0, sh = wrongPick ? Math.sin(pt * 40) * Math.max(0, 1 - pt * 2) * 5 : 0;
  panel(x - pulse + sh, y - pulse, w + pulse * 2, h + pulse * 2, 16, fill, { stroke: right ? '#eafff0' : OUT, lw: right ? 4 : 3 });
  if (TF) {
    const cy = y + h * (LAND ? 0.4 : 0.38), s = LAND ? 44 : 50;
    (i ? cross : check)(x + w / 2 + sh, cy, s, '#ffffff');
    outlined(i ? 'BULO' : 'VERDAD', x + w / 2 + sh, y + h * (LAND ? 0.78 : 0.72), LAND ? 32 : 30, '#fff', 'center', 6);
  } else {
    const bx = x + (LAND ? 30 : 24), by = LAND ? y + h / 2 : y + 24, lr = LAND ? 20 : 16;
    c.beginPath(); c.arc(bx + sh, by, lr, 0, TAU); c.fillStyle = OPC[i]; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    outlined(LET[i], bx + sh, by + 1, LAND ? 22 : 18, '#fff', 'center', 4);
    if (LAND) textBlock(q.opts[i], x + 58 + sh, y + 6, w - 70, h - 12, L.of, 14, '#fff', 800, 'left');
    else textBlock(q.opts[i], x + 10 + sh, y + 40, w - 20, h - 48, L.of, 13, '#fff', 800);
  }
  /* marcas de jugadores: cursor al elegir, fichas al revelar */
  const marks = seat.filter((s) => (phase === 'ask' ? hum(s.p) && !s.lock && s.sel === i : rev && s.lock && s.sel === i));
  marks.forEach((s, m) => {
    const col = k.pcol(s.p), mx = x + w - 16 - m * 28, my = y + 14;
    if (phase === 'ask') { c.save(); c.lineWidth = 5; c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 12; ART.rr(c, x - 4, y - 4, w + 8, h + 8, 19); c.stroke(); c.restore(); }
    c.beginPath(); c.arc(mx, my, 12, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    const pl = k.players(SEATS)[seat.indexOf(s)]; c.font = FONT(11, 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; c.fillText(pl.cpu ? 'C' : k.party ? 'J' + (s.p + 1) : 'Tú', mx, my + 1);
  });
}
function draw() {
  const t = performance.now() / 1000;
  c.drawImage(stageBg(), 0, 0); spot(t);
  /* cabecera */
  const q = curQ(), [cx0, cy0, cw, ch] = L.card;
  if (!DATA || !q) {
    panel(cx0, cy0, cw, ch, 20, '#f6f1ff');
    outlined(CFG.title, W / 2, cy0 + ch * 0.38, LAND ? 40 : 34, '#ffd36b', 'center', 7);
    c.font = FONT(18, 700); c.textAlign = 'center'; c.fillStyle = OUT; c.fillText(!DATA ? 'Cargando preguntas…' : TF ? '¿Verdad o bulo?' : 'Seis categorías · diez preguntas', W / 2, cy0 + ch * 0.66);
    for (let i = 0; i < (TF ? 2 : 4); i++) { const [x, y, w, h] = optRect(i); panel(x, y, w, h, 16, TF ? (i ? '#d9534f' : '#3fa55a') : '#2d2a5c'); if (TF) { (i ? cross : check)(x + w / 2, y + h * 0.4, 44, '#fff'); outlined(i ? 'BULO' : 'VERDAD', x + w / 2, y + h * 0.76, 30, '#fff', 'center', 6); } else { const bx = x + (LAND ? 30 : 24), by = LAND ? y + h / 2 : y + 24; c.beginPath(); c.arc(bx, by, 18, 0, TAU); c.fillStyle = OPC[i]; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke(); outlined(LET[i], bx, by + 1, 20, '#fff', 'center', 4); const smp = ['Geografía', 'Historia', 'Ciencia', 'Arte y cultura'][i]; if (LAND) textBlock(smp, x + 58, y + 6, w - 70, h - 12, L.of, 14, '#fff', 800, 'left'); else textBlock(smp, x + 10, y + 40, w - 20, h - 48, L.of, 13, '#fff', 800); } }
    (seat || []).forEach((s, i) => lectern(i, s, t));
    return;
  }
  /* barra superior: ronda + tiempo */
  const topY = L.top, pw = LAND ? 180 : 164;
  panel(cx0, topY, pw, 36, 12, '#3a3478', { drop: 3 });
  outlined(`${TF ? 'Afirmación' : 'Pregunta'} ${qi + 1}/${NQ}`, cx0 + pw / 2, topY + 18, LAND ? 17 : 16, '#fff', 'center', 4);
  if (!TF && qi === NQ - 1) { panel(cx0 + pw + 8, topY, 104, 36, 12, '#e0a33a', { drop: 3 }); outlined('¡Doble!', cx0 + pw + 60, topY + 18, 17, '#fff', 'center', 4); }
  const bx = cx0 + pw + (LAND ? (!TF && qi === NQ - 1 ? 124 : 12) : (!TF && qi === NQ - 1 ? 120 : 12)), bw = cx0 + cw - bx;
  if (phase === 'ask' || phase === 'reveal') {
    const fr = phase === 'ask' ? Math.max(0, 1 - pt / TQ) : 0;
    panel(bx, topY + 6, bw, 24, 12, '#15112e', { drop: 2 });
    const col = fr > 0.5 ? '#6fd66f' : fr > 0.25 ? '#ffc94a' : '#ff6b6b';
    if (fr > 0) { c.save(); ART.rr(c, bx + 4, topY + 10, Math.max(8, (bw - 8) * fr), 16, 8); c.fillStyle = col; c.fill(); c.restore(); }
    if (phase === 'ask') outlined(String(Math.ceil(TQ - pt)), bx + bw - 18, topY + 18, 16, '#fff', 'center', 4);
  }
  /* tarjeta de la pregunta */
  const catC = TF ? '#4fb3ff' : DATA.cats[q.c] ? DATA.cats[q.c].col : '#6e62f5';
  if (phase === 'wheel') {
    panel(cx0, cy0, cw, ch, 20, '#241d57');
    const r = Math.min(ch * 0.4, LAND ? 52 : 90), wx = LAND ? cx0 + 90 : W / 2, wy = LAND ? cy0 + ch / 2 : cy0 + ch * 0.42;
    wheel(wx, wy, r, wheelA);
    const cat = DATA.cats[catAt(wheelA)] || { n: '', col: '#fff' };
    if (LAND) outlined(cat.n, cx0 + 180 + (cw - 180) / 2, cy0 + ch / 2, 34, cat.col, 'center', 7);
    else outlined(cat.n, W / 2, cy0 + ch - 34, 28, cat.col, 'center', 6);
  } else {
    panel(cx0, cy0, cw, ch, 20, '#fbf8ff');
    c.save(); ART.rr(c, cx0, cy0, cw, ch, 20); c.clip(); c.fillStyle = catC; c.fillRect(cx0, cy0, cw, LAND ? 30 : 34); c.restore();
    ART.rr(c, cx0, cy0, cw, ch, 20); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    const lab = TF ? '¿Verdad o bulo?' : (DATA.cats[q.c] ? DATA.cats[q.c].n : '') + ' · ' + ['', 'Fácil', 'Media', 'Difícil'][q.d];
    outlined(lab, cx0 + 16, cy0 + (LAND ? 15 : 17), 16, '#fff', 'left', 4);
    const showExp = TF && phase === 'reveal';
    if (showExp) {
      const ok = q.v; outlined(ok ? 'VERDAD' : 'BULO', cx0 + cw - 18, cy0 + (LAND ? 15 : 17), 18, ok ? '#c9ffd9' : '#ffd0d0', 'right', 4);
      textBlock(q.t, cx0 + 18, cy0 + (LAND ? 34 : 40), cw - 36, LAND ? 40 : 70, 18, 12, '#6a6394', 700);
      textBlock(q.e, cx0 + 18, cy0 + (LAND ? 74 : 116), cw - 36, ch - (LAND ? 80 : 124), L.fs - 2, 13, OUT, 800);
    } else textBlock(q.t, cx0 + 18, cy0 + (LAND ? 36 : 44), cw - 36, ch - (LAND ? 44 : 56), L.fs + (LAND ? 1 : 2), 14, OUT, 800);
    for (let i = 0; i < q.n; i++) drawOption(i, q, t);
  }
  /* ayuda de controles */
  if (phase === 'ask' && qi < 2) {
    const tx = k.party ? 'Joystick: elige · A: responder' : 'Toca tu respuesta (o flechas + Espacio)';
    c.font = FONT(LAND ? 13 : 15, 700); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255,255,255,.75)';
    c.fillText(tx, W / 2, LAND ? 361 : 640);
  }
  seat.forEach((s, i) => lectern(i, s, t));
}
