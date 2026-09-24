/* PALABRAS: juegos de letras en español. CFG.mode:
 *  'daily' Palabra del Día: 5 letras, 6 intentos, verde/amarillo/gris; la misma palabra para todos cada día (fecha local, sin
 *          servidor), teclado en pantalla con Ñ, estadísticas en localStorage, compartir el resultado con cuadrados y modo práctica.
 *  'hang'  Ahorcado Ilustrado: dibujo propio progresivo (8 fallos), categorías, 5 palabras por partida, turnos 1–4 en la tele
 *          (la CPU rellena hasta 2) y podio. Acertar suma 10 por letra y repites turno; completar la palabra, +30.
 *  'sopa'  Sopa de Letras: rejilla generada con 8 palabras de una categoría; arrastra para marcar. Las direcciones crecen con el nivel.
 * Datos propios con fetch diferido: ../_data/palabras5-es.txt y ../_data/categorias-es.json. Se compara sin tildes; la Ñ es letra. */
const MODE = CFG.mode || 'daily', OUT = ART.OUT, TAU = 6.2832;
const LAND = innerWidth >= innerHeight * 0.98;
const W = LAND ? 800 : 450, H = LAND ? 450 : 800;
const k = Kit({ w: W, h: H, title: CFG.title, bg: MODE === 'hang' ? '#1d2b4a' : MODE === 'sopa' ? '#1c2342' : '#171c36' }), c = k.ctx;
const FONT = (s, wt) => `${wt || 800} ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
const ST = (key, def) => { try { const v = localStorage.getItem(key); return v == null ? def : JSON.parse(v); } catch (e) { return def; } };
const SAVE = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
const tell = (type, x) => { try { if (parent !== window) parent.postMessage(Object.assign({ type }, x || {}), '*'); } catch (e) { /* aislado */ } };
const ACC = { 'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e', 'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i', 'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u' };
const norm = (s) => s.toLowerCase().replace(/[áàäâéèëêíìïîóòöôúùüû]/g, (m) => ACC[m]).toUpperCase();
const ALPHA = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

/* ---------- Dibujo común ---------- */
function panel(x, y, w, h, r, fill, o) {
  o = o || {};
  if (!o.flat) { c.fillStyle = 'rgba(6,4,20,.42)'; ART.rr(c, x, y + (o.drop == null ? 4 : o.drop), w, h, r); c.fill(); }
  ART.rr(c, x, y, w, h, r);
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, ART.lite(fill, 0.14)); g.addColorStop(1, ART.dark(fill, 0.12)); c.fillStyle = g; c.fill();
  c.lineWidth = o.lw || 3; c.strokeStyle = o.stroke || OUT; c.stroke();
  if (!o.nogl) { c.save(); ART.rr(c, x, y, w, h, r); c.clip(); c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(x, y, w, Math.min(8, h * 0.2)); c.restore(); }
}
function outlined(t, x, y, size, col, align, lw, wt) { c.font = FONT(size, wt || 900); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = lw || 5; c.strokeStyle = OUT; c.strokeText(t, x, y); c.fillStyle = col; c.fillText(t, x, y); }
function txt(t, x, y, size, col, align, wt) { c.font = FONT(size, wt || 800); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(t, x, y); }
function fitSize(t, maxW, size, min, wt) { let s = size; c.font = FONT(s, wt || 800); while (s > (min || 10) && c.measureText(t).width > maxW) { s--; c.font = FONT(s, wt || 800); } return s; }
const inR = (r, x, y) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
let bgC = null;
function backdrop(top, bot, dots) {
  if (bgC) return bgC;
  bgC = document.createElement('canvas'); bgC.width = W; bgC.height = H; const g = bgC.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* letras flotando al fondo, muy tenues */
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < (dots || 26); i++) { g.save(); g.translate(Math.random() * W, Math.random() * H); g.rotate(Math.random() - 0.5); g.font = FONT(20 + Math.random() * 46, 900); g.fillStyle = ART.alpha('#ffffff', 0.025 + Math.random() * 0.035); g.fillText(ALPHA[Math.floor(Math.random() * 27)], 0, 0); g.restore(); }
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  return bgC;
}
/* Ficha de letra en relieve (estado: -1 vacía, 0 gris, 1 amarilla, 2 verde, 3 escrita sin evaluar). */
const TCOL = ['#5b5f78', '#e3b43c', '#4caf62'];
function tile(x, y, s, ch, stt, sy, big) {
  sy = sy == null ? 1 : sy;
  c.save(); c.translate(x + s / 2, y + s / 2); c.scale(1, Math.max(0.02, sy));
  const r = s * 0.16;
  if (stt < 0) { ART.rr(c, -s / 2, -s / 2, s, s, r); c.fillStyle = 'rgba(255,255,255,.06)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,.18)'; c.stroke(); c.restore(); return; }
  const f = stt === 3 ? '#f4f0ff' : TCOL[stt];
  c.fillStyle = 'rgba(6,4,20,.45)'; ART.rr(c, -s / 2, -s / 2 + 4, s, s, r); c.fill();
  ART.rr(c, -s / 2, -s / 2, s, s, r); const g = c.createLinearGradient(0, -s / 2, 0, s / 2); g.addColorStop(0, ART.lite(f, 0.18)); g.addColorStop(1, ART.dark(f, 0.1)); c.fillStyle = g; c.fill();
  c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.22)'; ART.rr(c, -s / 2 + 5, -s / 2 + 4, s - 10, s * 0.16, s * 0.08); c.fill();
  if (ch) { c.font = FONT(Math.round(s * (big || 0.56)), 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = stt === 3 ? OUT : '#fff'; if (stt !== 3) { c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = ART.alpha(OUT, 0.6); c.strokeText(ch, 0, 2); } c.fillText(ch, 0, 2); }
  c.restore();
}

/* ---------- Datos ---------- */
let SOL = null, VALID = null, CATS = null, LOADERR = false;
const needW = MODE === 'daily', needC = MODE !== 'daily';
if (needW) fetch('../_data/palabras5-es.txt').then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).then((t) => {
  let sec = ''; const sol = [], adm = [];
  for (const ln of t.split('\n')) { const s = ln.trim(); if (!s) continue; if (s[0] === '#') { if (/soluciones/.test(s)) sec = 's'; else if (/admitidas/.test(s)) sec = 'a'; continue; } if (sec === 's') sol.push(s); else if (sec === 'a') adm.push(s); }
  SOL = sol.filter((w) => norm(w).length === 5); VALID = new Set(SOL.map(norm).concat(adm.map(norm)));
}).catch(() => { LOADERR = true; SOL = ['nubes', 'plaza', 'queso', 'libro', 'campo', 'playa', 'cielo', 'barco']; VALID = new Set(SOL.map(norm)); });
if (needC) fetch('../_data/categorias-es.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => { CATS = d; })
  .catch(() => { LOADERR = true; CATS = { Animales: ['perro', 'gato', 'caballo', 'conejo', 'tortuga', 'ballena', 'jirafa', 'elefante', 'pingüino', 'ardilla'], Frutas: ['manzana', 'naranja', 'plátano', 'fresa', 'cereza', 'melón', 'sandía', 'limón', 'kiwi', 'uva'] }; });

/* ===================================================================================== */
/* ============================== PALABRA DEL DÍA ====================================== */
/* ===================================================================================== */
const D = (() => {
  const KB = ['QWERTYUIOP', 'ASDFGHJKLÑ', '>ZXCVBNM<'];
  const L = LAND
    ? { ts: 58, tg: 7, bx: 34, by: 50, kx: 386, ky: 146, kw: 36.5, kh: 68, kg: 5, kr: 8 }
    : { ts: 62, tg: 8, bx: 54, by: 76, kx: 8, ky: 540, kw: 38, kh: 64, kg: 6, kr: 8 };
  const keys = [];
  KB.forEach((row, r) => {
    const unit = L.kw, gap = L.kg, wide = unit * 1.5 + gap * 0.5;
    const rowW = [...row].reduce((a, ch) => a + (ch === '>' || ch === '<' ? wide : unit), 0) + gap * (row.length - 1);
    const fullW = unit * 10 + gap * 9; let x = L.kx + (fullW - rowW) / 2;
    for (const ch of row) { const w = ch === '>' || ch === '<' ? wide : unit; keys.push({ ch, r, x, y: L.ky + r * (L.kh + L.kr), w, h: L.kh }); x += w + gap; }
  });
  const kbRow = (r) => keys.filter((q) => q.r === r);
  const D0 = Date.UTC(2026, 0, 1);
  const today = () => { const n = new Date(); return Math.floor((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - D0) / 864e5); };
  function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let perm = null;
  function dayWord(d) {
    if (!perm) { const r = mulberry(51719); perm = SOL.map((_, i) => i); for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; } }
    const n = SOL.length; return SOL[perm[((d % n) + n) % n]];
  }
  function evalG(g, s) {
    const res = [0, 0, 0, 0, 0], cnt = {};
    for (let i = 0; i < 5; i++) { if (g[i] === s[i]) res[i] = 2; else cnt[s[i]] = (cnt[s[i]] || 0) + 1; }
    for (let i = 0; i < 5; i++) if (res[i] !== 2 && cnt[g[i]] > 0) { res[i] = 1; cnt[g[i]]--; }
    return res;
  }
  const S = { day: 0, sol: '', solN: '', rows: [], cur: '', phase: 'idle', revT: 0, keyS: {}, practice: false, cur0: { r: 0, i: 0 }, showCur: false, shakeT: 0, msg: '', msgT: 0, doneT: 0, btn: 0, popT: [], winT: 0, started: false, shared: 0 };
  const STATS0 = { p: 0, w: 0, s: 0, m: 0, h: [0, 0, 0, 0, 0, 0], last: -9 };
  function stats() { const s = ST('pdd:stats', null); return s && s.h ? s : JSON.parse(JSON.stringify(STATS0)); }
  function applyKeys() { S.keyS = {}; for (const r of S.rows) r.g.split('').forEach((ch, i) => { S.keyS[ch] = Math.max(S.keyS[ch] == null ? -1 : S.keyS[ch], r.res[i]); }); }
  function load(practice) {
    S.practice = practice; S.cur = ''; S.rows = []; S.phase = 'play'; S.revT = 0; S.doneT = 0; S.btn = 0; S.winT = 0; S.msg = ''; S.shared = 0; S.popT = [0, 0, 0, 0, 0];
    if (!practice) {
      S.day = today(); S.sol = dayWord(S.day);
      const sv = ST('pdd:v1', null);
      if (sv && sv.day === S.day && Array.isArray(sv.rows)) for (const g of sv.rows) S.rows.push({ g, res: evalG(g, norm(S.sol)) });
    } else { let w; do { w = k.pick(SOL); } while (SOL.length > 1 && w === dayWord(today())); S.sol = w; }
    S.solN = norm(S.sol); applyKeys();
    const last = S.rows[S.rows.length - 1];
    if (last && (last.g === S.solN || S.rows.length >= 6)) { S.phase = 'done'; S.doneT = 1; S.winT = 0; }
  }
  function say(m) { S.msg = m; S.msgT = 1.8; }
  function typeL(ch) { if (S.phase !== 'play' || S.cur.length >= 5) return; S.cur += ch; S.popT[S.cur.length - 1] = 0.12; k.sfx('click'); }
  function del() { if (S.phase !== 'play' || !S.cur) return; S.cur = S.cur.slice(0, -1); k.sfx('pop'); }
  function submit() {
    if (S.phase !== 'play') return;
    if (S.cur.length < 5) { say('Faltan letras'); S.shakeT = 0.4; k.sfx('hurt'); return; }
    if (!VALID.has(S.cur)) { say('No está en la lista'); S.shakeT = 0.4; k.sfx('hurt'); return; }
    S.rows.push({ g: S.cur, res: evalG(S.cur, S.solN) }); S.cur = ''; S.phase = 'reveal'; S.revT = 0; k.sfx('start');
    if (!S.practice) SAVE('pdd:v1', { day: S.day, rows: S.rows.map((r) => r.g) });
  }
  function finishRow() {
    applyKeys(); const last = S.rows[S.rows.length - 1], won = last.g === S.solN, n = S.rows.length;
    if (!won && n < 6) { S.phase = 'play'; return; }
    S.phase = 'done'; S.doneT = 0; S.btn = 0;
    if (!S.practice) {
      const st = stats();
      if (st.last !== S.day) {
        st.p++; if (won) { st.w++; st.h[n - 1]++; st.s = st.last === S.day - 1 || st.s === 0 ? st.s + 1 : 1; st.m = Math.max(st.m, st.s); } else st.s = 0;
        st.last = S.day; SAVE('pdd:stats', st);
      }
    }
    const score = won ? (7 - n) * 100 : 0;
    if (won) { S.winT = 1.2; k.sfx('win'); k.confetti(); say(['¡Genial!', '¡Magnífico!', '¡Impresionante!', '¡Muy bien!', '¡Bien!', '¡Por los pelos!'][n - 1]); k.best(CFG.id, score); }
    else { k.sfx('lose'); k.shake(5); say('Era ' + S.sol.toUpperCase()); }
    tell('arcade:over', { score });
  }
  function shareText() {
    const last = S.rows[S.rows.length - 1], won = last && last.g === S.solN;
    const head = S.practice ? 'Palabra del Día (práctica)' : 'Palabra del Día nº ' + (S.day + 1);
    return `${head} ${won ? S.rows.length : 'X'}/6\n\n` + S.rows.map((r) => r.res.map((v) => (v === 2 ? '🟩' : v === 1 ? '🟨' : '⬜')).join('')).join('\n');
  }
  function share() {
    const t = shareText();
    const copied = () => { S.shared = 1; say('Resultado copiado'); k.sfx('coin'); };
    const fallback = () => { try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); copied(); } catch (e) { say('No se pudo copiar'); } };
    try {
      if (navigator.share && matchMedia('(pointer:coarse)').matches) { navigator.share({ text: t }).then(() => { S.shared = 1; }).catch(() => { if (navigator.clipboard) navigator.clipboard.writeText(t).then(copied, fallback); else fallback(); }); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(copied, fallback); else fallback();
    } catch (e) { fallback(); }
  }
  function press(ch) { if (ch === '>') submit(); else if (ch === '<') del(); else typeL(ch); }
  /* Panel de resultados (dibujado en el lienzo) */
  function doneBox() { return LAND ? [396, 25, 380, 405] : [30, 110, 390, 560]; }
  function btnRects() { const [x, y, w, h] = doneBox(); const bw = (w - 48) / 2, by = y + h - 74; return [[x + 16, by, bw, 56], [x + 32 + bw, by, bw, 56]]; }
  function startPractice() { load(true); tell('arcade:restart'); k.sfx('start'); }
  function update(dt) {
    if (!SOL) return;
    if (!S.started) { S.started = true; load(false); if (S.phase === 'done') S.doneT = 0.2; }
    S.msgT = Math.max(0, S.msgT - dt); S.shakeT = Math.max(0, S.shakeT - dt); S.winT = Math.max(0, S.winT - dt);
    for (let i = 0; i < 5; i++) S.popT[i] = Math.max(0, S.popT[i] - dt);
    if (S.phase === 'reveal') {
      const prev = S.revT; S.revT += dt;
      for (let i = 0; i < 5; i++) { const tt = i * 0.28 + 0.14; if (prev < tt && S.revT >= tt) { const v = S.rows[S.rows.length - 1].res[i]; k.sfx(v === 2 ? 'coin' : v === 1 ? 'pop' : 'click'); } }
      if (S.revT > 5 * 0.28 + 0.2) finishRow();
      return;
    }
    if (S.phase === 'done') {
      S.doneT += dt; if (S.doneT < 1.1) return;
      const br = btnRects();
      if (k.hit.has('left')) { S.btn = 0; k.sfx('click'); } if (k.hit.has('right')) { S.btn = 1; k.sfx('click'); }
      if (k.ptr.hit) { if (inR(br[0], k.ptr.x, k.ptr.y)) share(); else if (inR(br[1], k.ptr.x, k.ptr.y)) startPractice(); }
      else if (k.hit.has('a')) { if (S.btn === 0) share(); else startPractice(); }
      return;
    }
    /* jugando: toque, cursor (mando/flechas) y teclado físico (ver listener) */
    if (k.ptr.hit) { const q = keys.find((kk) => inR([kk.x - 2, kk.y - 3, kk.w + 4, kk.h + 6], k.ptr.x, k.ptr.y)); if (q) { press(q.ch); S.showCur = false; } }
    const cr = S.cur0, mv = (dr, di) => {
      S.showCur = true; let r = cr.r + dr, row;
      r = (r + 3) % 3; row = kbRow(r);
      if (dr) { const cx = kbRow(cr.r)[Math.min(cr.i, kbRow(cr.r).length - 1)]; const mx = cx.x + cx.w / 2; let bi = 0, bd = 1e9; row.forEach((q, j) => { const d = Math.abs(q.x + q.w / 2 - mx); if (d < bd) { bd = d; bi = j; } }); cr.i = bi; }
      else cr.i = (cr.i + di + row.length) % row.length;
      cr.r = r; k.sfx('click');
    };
    if (k.hit.has('up')) mv(-1, 0); if (k.hit.has('down')) mv(1, 0); if (k.hit.has('left')) mv(0, -1); if (k.hit.has('right')) mv(0, 1);
    if (k.hit.has('a')) { if (S.showCur) press(kbRow(cr.r)[cr.i].ch); else if (S.cur.length === 5) submit(); else { S.showCur = true; k.sfx('click'); } }
    if (k.hit.has('b')) del();
  }
  function onKey(e) {
    if (!e.isTrusted || k.st !== 'play' || k.paused || !SOL || e.ctrlKey || e.metaKey || e.altKey) return false;
    if (S.phase === 'done') return false;
    const key = e.key || '';
    if (key.length === 1 && /[a-zñáéíóúü]/i.test(key)) { typeL(norm(key)); S.showCur = false; return true; }
    if (key === 'Backspace') { del(); return true; }
    if (key === 'Enter') { submit(); return true; }
    return false;
  }
  const DEMO = [['CARTA', 'LUNES'], ['PUNTO', 'LUNES'], ['LUNES', 'LUNES']];
  function drawBoard(t) {
    const { ts, tg, bx, by } = L, last = S.rows.length - 1;
    for (let r = 0; r < 6; r++) {
      const sh = S.shakeT > 0 && r === S.rows.length && S.phase === 'play' ? Math.sin(S.shakeT * 60) * 8 * (S.shakeT / 0.4) : 0;
      for (let i = 0; i < 5; i++) {
        const x = bx + i * (ts + tg) + sh, y = by + r * (ts + tg);
        let ch = '', stt = -1, sy = 1, dy = 0;
        if (!S.started) { const d = DEMO[r]; if (d) { ch = d[0][i]; stt = evalG(d[0], d[1])[i]; if (r === 2) dy = -Math.max(0, Math.sin(t * 3 - i * 0.5)) * 6; } }
        else if (r < S.rows.length) {
          const row = S.rows[r]; ch = row.g[i]; stt = row.res[i];
          if (r === last && S.phase === 'reveal') { const p = (S.revT - i * 0.28) / 0.28; if (p < 0) stt = 3; else if (p < 1) { sy = Math.abs(Math.cos(Math.PI * p)); if (p < 0.5) stt = 3; } }
          if (r === last && S.winT > 0 && row.g === S.solN) dy = -Math.max(0, Math.sin((1.2 - S.winT) * 9 - i * 0.6)) * 14;
        } else if (r === S.rows.length && S.phase === 'play') { ch = S.cur[i] || ''; stt = ch ? 3 : -1; }
        const pop = S.popT[i] > 0 && r === S.rows.length ? 1 + S.popT[i] : 1;
        if (pop !== 1) { c.save(); c.translate(x + ts / 2, y + ts / 2); c.scale(pop, pop); c.translate(-x - ts / 2, -y - ts / 2); tile(x, y + dy, ts, ch, stt, sy); c.restore(); }
        else tile(x, y + dy, ts, ch, stt, sy);
      }
    }
  }
  function drawKeys() {
    const cr = S.cur0;
    keys.forEach((q) => {
      const st = S.keyS[q.ch], fill = st == null || st < 0 ? '#8d86c9' : st === 0 ? '#3b3d52' : TCOL[st];
      const pressed = k.ptr.down && inR([q.x, q.y, q.w, q.h], k.ptr.x, k.ptr.y) && S.phase === 'play';
      panel(q.x, q.y + (pressed ? 3 : 0), q.w, q.h, 9, q.ch === '>' ? '#6e62f5' : q.ch === '<' ? '#c0587a' : fill, { drop: pressed ? 1 : 4, lw: 2.5 });
      if (q.ch === '>') txt(LAND ? 'ENVIAR' : 'ENVIAR', q.x + q.w / 2, q.y + q.h / 2 + (pressed ? 3 : 0), fitSize('ENVIAR', q.w - 6, 16, 10, 900), '#fff', 'center', 900);
      else if (q.ch === '<') { const cx = q.x + q.w / 2, cy = q.y + q.h / 2 + (pressed ? 3 : 0); c.save(); c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 16, cy); c.lineTo(cx - 7, cy - 10); c.lineTo(cx + 15, cy - 10); c.lineTo(cx + 15, cy + 10); c.lineTo(cx - 7, cy + 10); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#c0587a'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - 2, cy - 5); c.lineTo(cx + 8, cy + 5); c.moveTo(cx + 8, cy - 5); c.lineTo(cx - 2, cy + 5); c.stroke(); c.restore(); }
      else outlined(q.ch, q.x + q.w / 2, q.y + q.h / 2 + (pressed ? 3 : 0), 22, '#fff', 'center', 4);
    });
    if (S.showCur && S.phase === 'play') { const q = kbRow(cr.r)[cr.i]; if (q) { c.save(); c.lineWidth = 4; c.strokeStyle = '#ffd166'; c.shadowColor = '#ffd166'; c.shadowBlur = 12; ART.rr(c, q.x - 4, q.y - 4, q.w + 8, q.h + 8, 11); c.stroke(); c.restore(); } }
  }
  function countdown() { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), s = Math.max(0, Math.floor((m - n) / 1000)); const p = (v) => String(v).padStart(2, '0'); return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`; }
  function drawDone() {
    const a = Math.min(1, Math.max(0, (S.doneT - 0.9) / 0.3)); if (a <= 0) return;
    const [x, y, w, h] = doneBox(), last = S.rows[S.rows.length - 1], won = last && last.g === S.solN;
    c.save(); c.globalAlpha = a; c.translate(0, (1 - a) * 30);
    if (!LAND) { c.fillStyle = 'rgba(8,6,24,.55)'; c.fillRect(0, 0, W, H); }
    panel(x, y, w, h, 20, '#2c2766', { lw: 4 });
    outlined(won ? '¡Acertaste!' : 'Casi…', x + w / 2, y + 36, 30, won ? '#7cf7a0' : '#ffb0b0', 'center', 6);
    txt('La palabra: ' + S.sol.toUpperCase(), x + w / 2, y + 70, 20, '#fff', 'center', 800);
    let yy = y + 96;
    if (!S.practice) {
      const st = stats(), cols = [['Jugadas', st.p], ['% victorias', st.p ? Math.round((st.w / st.p) * 100) : 0], ['Racha', st.s], ['Mejor', st.m]];
      cols.forEach(([lb, v], i) => { const cx = x + (w / 4) * (i + 0.5); outlined(String(v), cx, yy + 16, 28, '#ffd166', 'center', 5); txt(lb, cx, yy + 44, 14, '#cfc8ff', 'center', 700); });
      yy += 64;
      const hMax = Math.max(1, ...st.h), bh = LAND ? 18 : 30, gap = LAND ? 3 : 8;
      if (!LAND) { txt('Intentos', x + w / 2, yy + 8, 16, '#cfc8ff', 'center', 800); yy += 22; }
      st.h.forEach((v, i) => { const by = yy + i * (bh + gap), bw = 28 + (w - 90) * (v / hMax), hi = won && i === S.rows.length - 1; txt(String(i + 1), x + 24, by + bh / 2, 16, '#fff', 'center', 900); c.fillStyle = hi ? '#4caf62' : '#5b5f78'; ART.rr(c, x + 40, by, bw, bh, 6); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); txt(String(v), x + 40 + bw - 12, by + bh / 2 + 1, 15, '#fff', 'center', 900); });
      yy += 6 * (bh + gap) + 4;
      txt('Nueva palabra en ' + countdown(), x + w / 2, yy + 10, 17, '#fff', 'center', 800);
    } else {
      const st = stats(), l1 = 'Partida de práctica: no cuenta para la racha.';
      txt(l1, x + w / 2, yy + 20, fitSize(l1, w - 24, 16, 11, 700), '#cfc8ff', 'center', 700);
      outlined(won ? S.rows.length + '/6' : 'X/6', x + w / 2, yy + 80, 54, won ? '#7cf7a0' : '#ffb0b0', 'center', 7);
      txt('Racha diaria: ' + st.s + ' · Mejor: ' + st.m, x + w / 2, yy + 140, 17, '#fff', 'center', 800);
      txt('Nueva palabra del día en ' + countdown(), x + w / 2, yy + 170, 16, '#cfc8ff', 'center', 700);
    }
    const br = btnRects(), lab = ['Compartir', S.practice ? 'Otra palabra' : 'Practicar'];
    br.forEach((r, i) => { panel(r[0], r[1], r[2], r[3], 14, i ? '#6e62f5' : '#3fa55a', { lw: 3 }); outlined(lab[i], r[0] + r[2] / 2, r[1] + r[3] / 2, 21, '#fff', 'center', 4); if (S.btn === i && S.doneT > 1.1) { c.save(); c.lineWidth = 4; c.strokeStyle = '#ffd166'; ART.rr(c, r[0] - 5, r[1] - 5, r[2] + 10, r[3] + 10, 17); c.stroke(); c.restore(); } });
    c.restore();
  }
  function draw() {
    const t = performance.now() / 1000;
    c.drawImage(backdrop('#232a52', '#0f1228', 12), 0, 0);
    /* cabecera */
    const title = !S.started ? CFG.title : S.practice ? 'Práctica' : 'Palabra del Día nº ' + (S.day + 1);
    if (LAND) { outlined(title, L.kx + (L.kw * 10 + L.kg * 9) / 2, 48, fitSize(title, 390, 30, 16, 900), '#ffd166', 'center', 6); txt(S.started ? `Intento ${Math.min(6, S.rows.length + 1)} de 6` : 'Cinco letras, seis intentos', L.kx + (L.kw * 10 + L.kg * 9) / 2, 88, 18, '#cfc8ff', 'center', 700); }
    else { outlined(title, W / 2, 38, fitSize(title, 420, 30, 16, 900), '#ffd166', 'center', 6); }
    drawBoard(t); drawKeys();
    if (!S.started) {
      /* leyenda para la pantalla previa */
      const lx = LAND ? L.kx + 20 : 30, ly = LAND ? 412 : 510;
      [[2, 'En su sitio'], [1, 'En otro sitio'], [0, 'No está']].forEach(([s, lb], i) => { const x = lx + i * (LAND ? 130 : 126); tile(x, ly - 12, 24, '', s); txt(lb, x + 30, ly, 13, '#e8e3ff', 'left', 700); });
    }
    if (S.msgT > 0 && S.msg) { const a = Math.min(1, S.msgT * 3), mx = LAND ? L.bx + (L.ts * 5 + L.tg * 4) / 2 : W / 2, my = LAND ? 30 : 512; c.save(); c.globalAlpha = a; c.font = FONT(19, 900); const mw = c.measureText(S.msg).width + 36; panel(mx - mw / 2, my - 19, mw, 38, 19, '#f4f0ff', { drop: 3, lw: 3 }); txt(S.msg, mx, my + 1, 19, OUT, 'center', 900); c.restore(); }
    if (S.phase === 'done') drawDone();
  }
  return { st: () => S, reset() {}, update, draw, onKey, intro: 'Adivina la palabra de cinco letras en seis intentos. Verde: letra bien colocada · amarillo: está en otro sitio · gris: no está. Todos juegan la misma palabra hoy.' };
})();

/* ===================================================================================== */
/* ============================== AHORCADO ILUSTRADO =================================== */
/* ===================================================================================== */
const HG = (() => {
  const NW = 5, MAXM = 8, FREQ = 'EAOSRNIDLCTUMPBGVYQHFZJÑXKW';
  const COLS = 9, ROWS = 3;
  const L = LAND
    ? { top: [16, 8, 768, 40], art: [16, 58, 316, 380], chips: [346, 58, 438, 48], word: [346, 118, 438, 86], ab: [346, 222, 438, 216] }
    : { top: [12, 10, 426, 42], art: [12, 118, 426, 318], chips: [12, 60, 426, 48], word: [12, 448, 426, 82], ab: [12, 548, 426, 236] };
  const lvl = () => Math.min(8, Math.floor(+ST('cpu:' + CFG.id, 0) || 0));
  let seats, words, wi, guessed, miss, turn, phase, pt, turnT, first, started, rescueT, lastMsg, msgT, cursorShown;
  function keyRect(i) { const [x, y, w, h] = L.ab, g = 6, kw = (w - g * (COLS - 1)) / COLS, kh = (h - g * (ROWS - 1)) / ROWS; return [x + (i % COLS) * (kw + g), y + Math.floor(i / COLS) * (kh + g), kw, kh]; }
  function mkWords() {
    const cats = Object.keys(CATS), out = [], used = new Set(), usedC = [];
    for (let n = 0; n < NW; n++) {
      let cat, pool; let tries = 0;
      do { cat = k.pick(cats); pool = CATS[cat].filter((w) => !used.has(w) && /^[a-záéíóúüñ]+$/i.test(w) && norm(w).length >= 4 + (n > 2 ? 1 : 0) && norm(w).length <= 10); tries++; } while ((!pool.length || (usedC.includes(cat) && tries < 20)) && tries < 40);
      if (!pool.length) pool = CATS[cat];
      const w = k.pick(pool); used.add(w); usedC.push(cat); out.push({ cat, w: w.toUpperCase(), n: norm(w) });
    }
    return out;
  }
  function seatList() {
    let n = 2; if (k.party) n = Math.max(2, Math.max(...k.party.map((x) => x.p)) + 1);
    return k.players(n).map((pl) => ({ p: pl.p, cpu: pl.cpu, name: pl.cpu ? 'CPU' : k.party ? pl.name : 'Tú', score: 0, cur: 0, cpuT: 0 }));
  }
  function reset() { seats = seatList(); words = null; wi = -1; phase = 'wait'; pt = 0; started = false; first = 0; msgT = 0; }
  const W0 = () => words[wi];
  const solved = () => [...W0().n].every((ch) => guessed.has(ch));
  function say(m) { lastMsg = m; msgT = 1.6; }
  function nextWord() {
    wi++; guessed = new Set(); miss = 0; phase = 'turn'; pt = 0; rescueT = 0;
    turn = (first + wi) % seats.length; startTurn(); k.sfx('start');
  }
  function startTurn() { turnT = 0; const s = seats[turn]; s.cpuT = k.rnd(0.9, 1.7); if (k.privOK) for (const q of seats) if (!q.cpu) k.priv(q.p, q === s ? { title: '¡Tu turno!', text: 'Elige una letra con el joystick y pulsa A.', items: [] } : { title: 'Turno de ' + s.name, text: '', items: [] }); }
  function passTurn() { turn = (turn + 1) % seats.length; startTurn(); }
  function slotX(i) { const n = W0().n.length, [x, , w] = L.word, bw = Math.min(40, (w - (n - 1) * 5) / n); return x + (w - (n * bw + (n - 1) * 5)) / 2 + i * (bw + 5) + bw / 2; }
  function pickL(ch) {
    if (phase !== 'turn' || guessed.has(ch)) return;
    guessed.add(ch); const s = seats[turn], w = W0(), cnt = [...w.n].filter((x) => x === ch).length;
    const ki = ALPHA.indexOf(ch), kr = keyRect(ki);
    if (cnt) {
      s.score += 10 * cnt; k.sfx('coin'); k.float('+' + 10 * cnt, kr[0] + kr[2] / 2, kr[1], '#7cf7a0');
      [...w.n].forEach((x, i) => { if (x === ch) k.burst(slotX(i), L.word[1] + L.word[3] / 2, k.pcol(s.p), 8, 120); });
      if (solved()) { s.score += 30; k.float('+30', slotX(Math.floor(w.n.length / 2)), L.word[1] - 4, '#ffd166'); k.sfx('win'); k.confetti(k.pcol(s.p), 60); phase = 'reveal'; pt = 0; rescueT = 0; say('¡' + s.name + ' completa la palabra!'); }
      else startTurn();
    } else {
      miss++; k.sfx('hurt'); k.shake(4); k.burst(kr[0] + kr[2] / 2, kr[1] + kr[3] / 2, '#ff6b6b', 10, 110);
      if (miss >= MAXM) { phase = 'reveal'; pt = 0; k.sfx('lose'); say('Era ' + w.w); } else passTurn();
    }
  }
  function cpuChoice() {
    const w = W0(), L2 = lvl(), smart = Math.random() < Math.min(0.6, 0.15 + L2 * 0.04); // 1.23: CPU más floja (antes 0.25 + 0.07/nivel, tope 0.85)
    if (smart) {
      const wrong = [...guessed].filter((ch) => !w.n.includes(ch));
      const cand = CATS[w.cat].map(norm).filter((x) => x.length === w.n.length && [...x].every((ch, i) => (guessed.has(w.n[i]) ? ch === w.n[i] : !guessed.has(ch))) && !wrong.some((ch) => x.includes(ch)));
      if (cand.length) { const cnt = {}; cand.forEach((x) => new Set(x).forEach((ch) => { if (!guessed.has(ch)) cnt[ch] = (cnt[ch] || 0) + 1; })); const best = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || FREQ.indexOf(a) - FREQ.indexOf(b))[0]; if (best) return best; }
    }
    for (const ch of FREQ) if (!guessed.has(ch) && Math.random() < 0.4) return ch;
    return [...FREQ].find((ch) => !guessed.has(ch));
  }
  function finish() {
    phase = 'end';
    const rows = seats.map((s) => ({ p: s.p, score: s.score, name: s.name })), top = rows.slice().sort((a, b) => b.score - a.score);
    const humTop = !seats.find((s) => s.p === top[0].p).cpu && (top.length < 2 || top[0].score > top[1].score);
    if (humTop) SAVE('cpu:' + CFG.id, Math.min(8, (+ST('cpu:' + CFG.id, 0) || 0) + 0.5));
    if (!k.party) k.best(CFG.id, seats[0].score);
    if (k.privOK) for (const q of seats) if (!q.cpu) k.priv(q.p, null);
    k.podium(rows, { head: humTop && !k.party ? '¡Has ganado!' : undefined, go: `${k.party ? '' : 'Tu récord: ' + k.best(CFG.id, 0) + '<br>'}Toca para otra partida` });
  }
  function update(dt) {
    if (!CATS) return;
    if (!started) { started = true; seats = seatList(); words = mkWords(); first = Math.floor(Math.random() * seats.length); k.count(3); return; }
    if (k.counting()) return;
    msgT = Math.max(0, msgT - dt);
    if (phase === 'wait') { nextWord(); return; }
    pt += dt;
    if (phase === 'reveal') { rescueT += dt; if (pt > 2.8 || (pt > 1.2 && !k.party && (k.hit.has('a') || k.ptr.hit))) { if (wi >= NW - 1) finish(); else nextWord(); } return; }
    if (phase !== 'turn') return;
    const s = seats[turn]; turnT += dt;
    const lim = k.party ? 15 : 25;
    if (s.cpu) { if (turnT >= s.cpuT) pickL(cpuChoice()); return; }
    if (turnT > lim) { say('Se acabó el tiempo'); k.sfx('hurt'); passTurn(); return; }
    if (lim - turnT < 3.5 && Math.ceil(lim - turnT) !== Math.ceil(lim - turnT + dt)) k.sfx('tick');
    const dx = (k.phit(s.p, 'right') ? 1 : 0) - (k.phit(s.p, 'left') ? 1 : 0), dy = (k.phit(s.p, 'down') ? 1 : 0) - (k.phit(s.p, 'up') ? 1 : 0);
    if (dx || dy) {
      cursorShown = true; let cx = s.cur % COLS, cy = Math.floor(s.cur / COLS);
      cx = (cx + dx + COLS) % COLS; cy = (cy + dy + ROWS) % ROWS; s.cur = cy * COLS + cx; k.sfx('click');
    }
    if (k.phit(s.p, 'a')) { if (!cursorShown && !k.party) { cursorShown = true; k.sfx('click'); } else if (guessed.has(ALPHA[s.cur])) k.sfx('click'); else pickL(ALPHA[s.cur]); }
    if (s.p === 0 && k.ptr.hit) for (let i = 0; i < 27; i++) if (inR(keyRect(i), k.ptr.x, k.ptr.y)) { cursorShown = false; pickL(ALPHA[i]); break; }
  }
  function onKey(e) {
    if (!e.isTrusted || k.st !== 'play' || k.paused || !words || phase !== 'turn' || e.ctrlKey || e.metaKey || e.altKey) return false;
    const s = seats[turn]; if (s.cpu || s.p !== 0 || k.party) return false;
    const key = e.key || '';
    if (key.length === 1 && /[a-zñáéíóúü]/i.test(key)) { pickL(norm(key)); cursorShown = false; return true; }
    return false;
  }
  /* ---- ilustración ---- */
  let sceneC = null;
  function scene() {
    if (sceneC) return sceneC;
    const [, , w, h] = L.art; sceneC = document.createElement('canvas'); sceneC.width = w; sceneC.height = h; const g = sceneC.getContext('2d');
    g.save(); ART.rr(g, 0, 0, w, h, 18); g.clip();
    const sk = g.createLinearGradient(0, 0, 0, h); sk.addColorStop(0, '#7fc8f8'); sk.addColorStop(0.7, '#cfeaff'); sk.addColorStop(1, '#e9f7ff'); g.fillStyle = sk; g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(w * 0.8, h * 0.18, 4, w * 0.8, h * 0.18, 40); sun.addColorStop(0, '#fff6c9'); sun.addColorStop(0.5, '#ffd766'); sun.addColorStop(1, 'rgba(255,215,102,0)'); g.fillStyle = sun; g.beginPath(); g.arc(w * 0.8, h * 0.18, 40, 0, TAU); g.fill();
    const cloud = (x, y, s) => { g.fillStyle = '#ffffff'; g.strokeStyle = ART.alpha(OUT, 0.25); g.lineWidth = 2; g.beginPath(); g.arc(x, y, 14 * s, Math.PI * 0.5, Math.PI * 1.5); g.arc(x + 14 * s, y - 10 * s, 16 * s, Math.PI, 0); g.arc(x + 32 * s, y - 2 * s, 12 * s, Math.PI * 1.2, Math.PI * 0.5); g.closePath(); g.fill(); g.stroke(); };
    cloud(w * 0.12, h * 0.16, 1); cloud(w * 0.52, h * 0.1, 0.8);
    g.fillStyle = '#9fd38a'; g.beginPath(); g.moveTo(0, h * 0.8); g.quadraticCurveTo(w * 0.3, h * 0.66, w * 0.62, h * 0.78); g.quadraticCurveTo(w * 0.85, h * 0.7, w, h * 0.76); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    const gr = g.createLinearGradient(0, h * 0.82, 0, h); gr.addColorStop(0, '#6cc04a'); gr.addColorStop(1, '#3f8f35'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, h * 0.88); g.quadraticCurveTo(w * 0.5, h * 0.8, w, h * 0.88); g.lineTo(w, h); g.lineTo(0, h); g.fill(); g.strokeStyle = OUT; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h * 0.88); g.quadraticCurveTo(w * 0.5, h * 0.8, w, h * 0.88); g.stroke();
    for (let i = 0; i < 18; i++) { const x = Math.random() * w, y = h * 0.9 + Math.random() * h * 0.08; g.strokeStyle = '#2f7a2c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 7); g.moveTo(x, y); g.lineTo(x + 3, y - 8); g.stroke(); }
    g.restore();
    return sceneC;
  }
  function wood(x, y, w, h) { c.save(); ART.rr(c, x, y, w, h, 4); const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#b77a45'); g.addColorStop(1, '#7a4a26'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.beginPath(); if (w > h) { c.moveTo(x + 6, y + h * 0.35); c.lineTo(x + w - 6, y + h * 0.35); } else { c.moveTo(x + w * 0.35, y + 6); c.lineTo(x + w * 0.35, y + h - 6); } c.stroke(); c.restore(); }
  function figure(cx, cy, s, parts, mood, t, col) {
    /* cy = centro de la cabeza; partes: 1 cabeza, 2 cuerpo, 3 brazos, 4 piernas */
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    const limb = (x0, y0, x1, y1, cl) => { c.strokeStyle = OUT; c.lineWidth = s * 0.2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = cl; c.lineWidth = s * 0.12; c.stroke(); };
    const sway = mood === 'happy' ? 0 : Math.sin(t * 2) * 0.06;
    c.translate(cx, cy); c.rotate(sway); c.translate(-cx, -cy);
    if (parts >= 4) { const k2 = mood === 'happy' ? Math.sin(t * 12) * s * 0.1 : 0; limb(cx - s * 0.15, cy + s * 1.35, cx - s * 0.32 - k2, cy + s * 2.05, '#3a4a8a'); limb(cx + s * 0.15, cy + s * 1.35, cx + s * 0.32 + k2, cy + s * 2.05, '#3a4a8a'); c.fillStyle = OUT; c.beginPath(); c.ellipse(cx - s * 0.36 - k2, cy + s * 2.08, s * 0.14, s * 0.08, 0, 0, TAU); c.ellipse(cx + s * 0.36 + k2, cy + s * 2.08, s * 0.14, s * 0.08, 0, 0, TAU); c.fill(); }
    if (parts >= 3) { const up = mood === 'happy' ? -s * 0.6 + Math.sin(t * 10) * s * 0.15 : s * 0.35; limb(cx - s * 0.3, cy + s * 0.75, cx - s * 0.75, cy + s * 0.65 + up, '#ffcf9e'); limb(cx + s * 0.3, cy + s * 0.75, cx + s * 0.75, cy + s * 0.65 + up, '#ffcf9e'); }
    if (parts >= 2) { ART.rr(c, cx - s * 0.36, cy + s * 0.55, s * 0.72, s * 0.88, s * 0.22); const g = c.createLinearGradient(cx - s * 0.4, cy, cx + s * 0.4, cy + s); g.addColorStop(0, ART.lite(col, 0.2)); g.addColorStop(1, ART.dark(col, 0.15)); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke(); }
    if (parts >= 1) {
      c.beginPath(); c.arc(cx, cy, s * 0.55, 0, TAU); const g = c.createRadialGradient(cx - s * 0.2, cy - s * 0.2, 2, cx, cy, s * 0.6); g.addColorStop(0, '#ffe2bf'); g.addColorStop(1, '#f2b37e'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = '#5a3a22'; c.beginPath(); c.arc(cx, cy - s * 0.12, s * 0.56, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(cx, cy - s * 0.3, cx - s * 0.54, cy - s * 0.22); c.fill(); c.stroke();
      c.fillStyle = OUT;
      if (mood === 'lost') { c.lineWidth = 2.5; c.strokeStyle = OUT; for (const ex of [-0.2, 0.2]) { c.beginPath(); c.moveTo(cx + s * (ex - 0.08), cy + s * 0.02); c.lineTo(cx + s * ex, cy + s * 0.08); c.lineTo(cx + s * (ex + 0.08), cy + s * 0.02); c.stroke(); } c.beginPath(); c.arc(cx, cy + s * 0.32, s * 0.1, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      else { const look = Math.sin(t * 1.3) * s * 0.04; for (const ex of [-0.2, 0.2]) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(cx + s * ex, cy + s * 0.05, s * 0.1, s * 0.13, 0, 0, TAU); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(cx + s * ex + look, cy + s * 0.07, s * 0.055, 0, TAU); c.fill(); }
        c.lineWidth = 2.5; c.strokeStyle = OUT; c.beginPath(); if (mood === 'happy') c.arc(cx, cy + s * 0.22, s * 0.16, 0.15, Math.PI - 0.15); else if (mood === 'worry') c.arc(cx, cy + s * 0.38, s * 0.12, Math.PI * 1.15, Math.PI * 1.85); else { c.moveTo(cx - s * 0.1, cy + s * 0.3); c.lineTo(cx + s * 0.1, cy + s * 0.3); } c.stroke();
        c.fillStyle = 'rgba(255,120,120,.35)'; c.beginPath(); c.arc(cx - s * 0.33, cy + s * 0.22, s * 0.08, 0, TAU); c.arc(cx + s * 0.33, cy + s * 0.22, s * 0.08, 0, TAU); c.fill(); }
    }
    c.restore();
  }
  function drawArt(t, m, mood, sample) {
    const [ax, ay, aw, ah] = L.art;
    c.fillStyle = 'rgba(6,4,20,.42)'; ART.rr(c, ax, ay + 5, aw, ah, 18); c.fill();
    c.drawImage(scene(), ax, ay); ART.rr(c, ax, ay, aw, ah, 18); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    const gx = ax + aw * 0.28, gy = ay + ah * 0.86, top = ay + ah * 0.1, bw = aw * 0.5, s = Math.min(aw, ah) * 0.12;
    const happy = mood === 'happy';
    c.save(); if (happy) c.globalAlpha = Math.max(0.35, 1 - rescueT);
    if (m >= 1) { c.fillStyle = '#6b4a2b'; c.beginPath(); c.ellipse(gx + bw * 0.25, gy + 4, bw * 0.55, 12, 0, 0, TAU); c.fill(); wood(gx - bw * 0.15, gy - 12, bw * 0.85, 18); }
    if (m >= 2) wood(gx - 9, top, 18, gy - top - 8);
    if (m >= 3) { wood(gx - 9, top - 4, bw + 14, 18); c.save(); c.translate(gx + 4, top + 50); c.rotate(-Math.PI / 4); wood(-8, -40, 14, 72); c.restore(); }
    const rx = gx + bw - 6, sw = happy ? 0 : Math.sin(t * 2) * 3;
    if (m >= 4 && !happy) { c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(rx, top + 12); c.quadraticCurveTo(rx + sw, top + 40, rx + sw, top + ah * 0.2); c.stroke(); c.strokeStyle = '#d9b77a'; c.lineWidth = 3; c.stroke(); }
    c.restore();
    const col = sample || '#4fa3e0';
    if (happy) { const jump = Math.abs(Math.sin(t * 6)) * s * 0.9; figure(ax + aw * 0.72, gy - s * 2.1 - jump, s, 4, 'happy', t, col); }
    else if (m >= 5) figure(rx + sw, top + ah * 0.2 + s * 0.55, s, m - 4, m >= MAXM ? 'lost' : m >= 7 ? 'worry' : 'calm', t, col);
    /* marcador de fallos */
    for (let i = 0; i < MAXM; i++) { const x = ax + 16 + i * 17, y = ay + ah - 16; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fillStyle = i < m ? '#ff6b6b' : 'rgba(255,255,255,.7)'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); }
  }
  function draw() {
    const t = performance.now() / 1000;
    c.drawImage(backdrop('#294070', '#141d38', 22), 0, 0);
    const ready = !words || wi < 0;
    /* cabecera: palabra n/5 y categoría */
    const [tx, ty, tw, th] = L.top;
    panel(tx, ty, tw, th, 14, '#3a3478', { drop: 3 });
    if (ready) outlined(CFG.title, tx + tw / 2, ty + th / 2, 24, '#ffd166', 'center', 5);
    else { outlined(`Palabra ${wi + 1}/${NW}`, tx + 14, ty + th / 2, 18, '#fff', 'left', 4); const cat = W0().cat; outlined(cat, tx + tw - 14, ty + th / 2, fitSize(cat, tw * 0.55, 22, 14, 900), '#ffd166', 'right', 5); }
    /* jugadores */
    const [cx0, cy0, cw, ch] = L.chips, list = seats || [], n = Math.max(1, list.length), gw = (cw - (n - 1) * 8) / n;
    list.forEach((s, i) => {
      const x = cx0 + i * (gw + 8), on = !ready && phase === 'turn' && turn === i, col = k.pcol(s.p);
      panel(x, cy0 + (on ? -3 : 0), gw, ch, 12, on ? ART.dark(col, 0.2) : '#2a2f5a', { stroke: on ? '#fff' : OUT, lw: on ? 3.5 : 3 });
      c.beginPath(); c.arc(x + 17, cy0 + (gw >= 150 ? ch / 2 : 15) + (on ? -3 : 0), 8, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
      const oy = on ? -3 : 0;
      if (gw >= 150) { outlined(s.name, x + 32, cy0 + ch / 2 + oy, fitSize(s.name, gw - 80, 18, 12, 900), '#fff', 'left', 4); outlined(String(s.score), x + gw - 10, cy0 + ch / 2 + oy, 20, '#ffd166', 'right', 4); }
      else { outlined(s.name, x + 30, cy0 + 15 + oy, fitSize(s.name, gw - 36, 17, 11, 900), '#fff', 'left', 4); outlined(String(s.score), x + gw / 2 + 10, cy0 + 35 + oy, 19, '#ffd166', 'center', 4); }
      if (on && s.cpu) { const d = Math.floor(t * 3) % 3; for (let j = 0; j < 3; j++) { c.fillStyle = j === d ? '#fff' : 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(x + gw / 2 - 8 + j * 8, cy0 + ch + 6, 3, 0, TAU); c.fill(); } }
    });
    /* ilustración */
    if (ready) drawArt(t, 6, 'calm', '#3fb6ea');
    else drawArt(t, miss, phase === 'reveal' && solved() ? 'happy' : miss >= MAXM ? 'lost' : 'calm');
    /* casillas de la palabra */
    const [wx, wy, ww, wh] = L.word;
    const dispW = ready ? 'PALABRA' : W0().w, dispN = ready ? 'PALABRA' : W0().n, nL = dispN.length, bw = Math.min(40, (ww - (nL - 1) * 5) / nL), x0 = wx + (ww - (nL * bw + (nL - 1) * 5)) / 2;
    for (let i = 0; i < nL; i++) {
      const show = ready ? 'PAL_B_A'[i] !== '_' : guessed.has(dispN[i]) || phase === 'reveal', lost = !ready && phase === 'reveal' && !guessed.has(dispN[i]);
      const x = x0 + i * (bw + 5), y = wy + (wh - bw * 1.25) / 2;
      if (show) tile(x, y, bw, dispW[i], lost ? 0 : 3, 1, 0.62);
      else { tile(x, y, bw, '', -1); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x + 5, y + bw - 6, bw - 10, 4); }
    }
    /* alfabeto */
    const cur = !ready && phase === 'turn' ? seats[turn] : null;
    for (let i = 0; i < 27; i++) {
      const [x, y, w, h] = keyRect(i), ch = ALPHA[i], used = ready ? 'EAOSR'.includes(ch) : guessed.has(ch), good = used && (ready ? 'EA'.includes(ch) : W0().n.includes(ch));
      panel(x, y, w, h, 10, used ? (good ? '#4caf62' : '#4a4d63') : '#8d86c9', { drop: used ? 1 : 4, lw: 2.5 });
      outlined(ch, x + w / 2, y + h / 2 + 1, LAND ? 24 : 24, used ? (good ? '#eaffef' : '#9aa0b8') : '#fff', 'center', 4);
      if (used && !good) { c.strokeStyle = 'rgba(255,107,107,.85)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 8, y + 8); c.lineTo(x + w - 8, y + h - 8); c.stroke(); }
    }
    if (cur && !cur.cpu && (cursorShown || k.party)) { const [x, y, w, h] = keyRect(cur.cur), col = k.pcol(cur.p); c.save(); c.lineWidth = 4; c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 12; ART.rr(c, x - 4, y - 4, w + 8, h + 8, 13); c.stroke(); c.restore(); }
    /* tiempo del turno */
    if (cur && !cur.cpu) { const lim = k.party ? 15 : 25, fr = Math.max(0, 1 - turnT / lim), [x, y, w] = L.ab; c.fillStyle = 'rgba(0,0,0,.3)'; ART.rr(c, x, y - 12, w, 6, 3); c.fill(); c.fillStyle = fr > 0.3 ? k.pcol(cur.p) : '#ff6b6b'; ART.rr(c, x, y - 12, w * fr, 6, 3); c.fill(); }
    if (msgT > 0 && lastMsg) { c.save(); c.globalAlpha = Math.min(1, msgT * 3); const [ax, ay, aw] = L.art; c.font = FONT(18, 900); const mw = Math.min(aw - 20, c.measureText(lastMsg).width + 30); panel(ax + aw / 2 - mw / 2, ay + 12, mw, 36, 18, '#f4f0ff', { drop: 3 }); txt(lastMsg, ax + aw / 2, ay + 31, fitSize(lastMsg, mw - 16, 18, 12, 900), OUT, 'center', 900); c.restore(); }
    if (cur && wi === 0 && !cur.cpu && guessed.size < 3) { const tip = k.party ? 'Joystick: letra · A: elegir' : 'Toca una letra (o escríbela)'; txt(tip, L.art[0] + L.art[2] / 2, L.art[1] + L.art[3] - 40, 15, OUT, 'center', 800); }
  }
  k.onParty = () => { if (MODE !== 'hang') return; if (k.st !== 'play' || !seats) return reset();
    /* en partida: la CPU ocupa el sitio de quien se va (y lo devuelve si vuelve) */
    for (const s of seats) { const h = k.human(s.p); if (s.cpu !== h) continue; const q = k.party && k.party.find((x) => x.p === s.p); s.cpu = !h; s.name = h ? (q && q.name) || (k.party ? 'J' + (s.p + 1) : 'Tú') : 'CPU'; if (words && phase === 'turn' && seats[turn] === s) startTurn(); } };
  return { st: () => ({ seats, words, wi, phase, turn, miss, guessed }), reset, update, draw, onKey, intro: 'Adivina la palabra letra a letra antes de que se complete el dibujo. Acertar suma 10 por letra y repites turno; completar la palabra da 30 más. Cinco palabras por partida.' };
})();

/* ===================================================================================== */
/* ================================ SOPA DE LETRAS ===================================== */
/* ===================================================================================== */
const SP = (() => {
  const G = LAND ? { cols: 13, rows: 9, cs: 45, x0: 12, y0: 23 } : { cols: 10, rows: 11, cs: 42, x0: 15, y0: 100 };
  const NW = 8, HL = ['#ff6b6b', '#4fb3ff', '#ffc94a', '#6fd66f', '#b98cff', '#ff9f43', '#3fd6c6', '#ff7ab8'];
  const LETF = 'EEEEEAAAAAOOOOSSSSRRRNNNIIIDDLLLCCTTUUMMPPBGVYQHFZJÑX';
  const DIRS = [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, 1], [1, -1], [-1, -1]];
  let lvl = Math.min(3, +ST('sopa:lvl', 0) || 0);
  let grid, words, cat, time, sinceFind, sel, kc, kSel, kShown, built = false, doneT = 0;
  function build() {
    const cats = Object.keys(CATS), dirs = DIRS.slice(0, [2, 3, 5, 8][lvl]), maxL = Math.max(G.cols, G.rows);
    for (let attempt = 0; attempt < 30; attempt++) {
      cat = k.pick(cats);
      const pool = k.shuffle(CATS[cat].filter((w) => /^[a-záéíóúüñ]+$/i.test(w)).map((w) => ({ w: w.toUpperCase(), n: norm(w) })).filter((o) => o.n.length >= 3 && o.n.length <= maxL - 1));
      if (pool.length < NW) continue;
      grid = Array.from({ length: G.rows }, () => Array(G.cols).fill(''));
      const placed = [];
      for (const o of pool) {
        if (placed.length >= NW) break;
        if (placed.some((p) => p.n.includes(o.n) || o.n.includes(p.n))) continue;
        let ok = false;
        for (let t = 0; t < 250 && !ok; t++) {
          const [dr, dc] = k.pick(dirs), r = k.ri(0, G.rows - 1), cc = k.ri(0, G.cols - 1), er = r + dr * (o.n.length - 1), ec = cc + dc * (o.n.length - 1);
          if (er < 0 || er >= G.rows || ec < 0 || ec >= G.cols) continue;
          let fit = true; for (let i = 0; i < o.n.length && fit; i++) { const g = grid[r + dr * i][cc + dc * i]; if (g && g !== o.n[i]) fit = false; }
          if (!fit) continue;
          for (let i = 0; i < o.n.length; i++) grid[r + dr * i][cc + dc * i] = o.n[i];
          placed.push({ w: o.w, n: o.n, r, c: cc, dr, dc, found: false, col: HL[placed.length % HL.length], t: 0 }); ok = true;
        }
      }
      if (placed.length < NW) continue;
      for (let r = 0; r < G.rows; r++) for (let q = 0; q < G.cols; q++) if (!grid[r][q]) grid[r][q] = LETF[Math.floor(Math.random() * LETF.length)];
      /* que ninguna palabra aparezca dos veces por azar (se comprueba en todas las direcciones) */
      if (placed.some((p) => countIn(p.n) !== 1)) continue;
      words = placed.sort((a, b) => a.n.length - b.n.length || a.n.localeCompare(b.n)); break;
    }
    time = 0; sinceFind = 0; sel = null; kc = { r: Math.floor(G.rows / 2), c: Math.floor(G.cols / 2) }; kSel = null; built = true; doneT = 0;
  }
  function countIn(n) {
    let cnt = 0;
    for (let r = 0; r < G.rows; r++) for (let q = 0; q < G.cols; q++) for (const [dr, dc] of DIRS) {
      let i = 0; for (; i < n.length; i++) { const rr = r + dr * i, cc = q + dc * i; if (rr < 0 || rr >= G.rows || cc < 0 || cc >= G.cols || grid[rr][cc] !== n[i]) break; }
      if (i === n.length) cnt++;
    }
    return n.length > 1 && n === [...n].reverse().join('') ? cnt / 2 : cnt;
  }
  const cellAt = (x, y) => { const q = Math.floor((x - G.x0) / G.cs), r = Math.floor((y - G.y0) / G.cs); return r >= 0 && r < G.rows && q >= 0 && q < G.cols ? { r, c: q } : null; };
  const cellC = (r, q) => [G.x0 + q * G.cs + G.cs / 2, G.y0 + r * G.cs + G.cs / 2];
  function snap(a, b) {
    let dr = b.r - a.r, dc = b.c - a.c; const ar = Math.abs(dr), ac = Math.abs(dc);
    if (ac >= ar * 2) dr = 0; else if (ar >= ac * 2) dc = 0; else { const m = Math.max(ar, ac); dr = Math.sign(dr) * m; dc = Math.sign(dc) * m; }
    let n = Math.max(Math.abs(dr), Math.abs(dc)); const sr = Math.sign(dr), sc = Math.sign(dc);
    while (n > 0 && (a.r + sr * n < 0 || a.r + sr * n >= G.rows || a.c + sc * n < 0 || a.c + sc * n >= G.cols)) n--;
    return { r0: a.r, c0: a.c, r1: a.r + sr * n, c1: a.c + sc * n };
  }
  function selStr(s) { const n = Math.max(Math.abs(s.r1 - s.r0), Math.abs(s.c1 - s.c0)), sr = Math.sign(s.r1 - s.r0), sc = Math.sign(s.c1 - s.c0); let o = ''; for (let i = 0; i <= n; i++) o += grid[s.r0 + sr * i][s.c0 + sc * i]; return o; }
  function check(s) {
    const str = selStr(s), rev = [...str].reverse().join('');
    if (str.length < 2) return;
    const w = words.find((o) => !o.found && (o.n === str || o.n === rev));
    if (w) {
      w.found = true; w.t = 0; w.sel = s; sinceFind = 0; k.sfx('coin');
      const n = str.length; for (let i = 0; i < n; i++) { const [x, y] = cellC(s.r0 + Math.sign(s.r1 - s.r0) * i, s.c0 + Math.sign(s.c1 - s.c0) * i); k.burst(x, y, w.col, 4, 90); }
      const [mx, my] = cellC((s.r0 + s.r1) / 2, (s.c0 + s.c1) / 2); k.float(w.w, mx, my - 10, '#fff');
      if (words.every((o) => o.found)) win();
    } else { k.sfx('hurt'); }
  }
  function win() {
    doneT = 0.001; k.sfx('win'); k.confetti();
    const secs = Math.floor(time), score = Math.max(100, 1500 - secs * 5) + lvl * 150;
    const was = lvl; lvl = Math.min(3, lvl + 1); SAVE('sopa:lvl', lvl);
    setTimeout(() => { k.st = 'over'; k.end(CFG.id, score, '¡Sopa completada!', `Tiempo ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}${lvl > was ? ' · Siguiente: más direcciones' : ''}`); }, 1100);
  }
  function reset() { built = false; }
  function update(dt) {
    if (!CATS) return;
    if (!built) build();
    if (doneT) return;
    time += dt; sinceFind += dt;
    words.forEach((o) => { if (o.found) o.t += dt; });
    const p = k.ptr;
    if (p.hit) { const a = cellAt(p.sx != null ? p.sx : p.x, p.sy != null ? p.sy : p.y); if (a) { sel = snap(a, a); sel.a = a; k.sfx('click'); kShown = false; } }
    if (sel && sel.a) { const b = cellAt(k.clamp(p.x, G.x0, G.x0 + G.cols * G.cs - 1), k.clamp(p.y, G.y0, G.y0 + G.rows * G.cs - 1)); if (b) { const s2 = snap(sel.a, b); if (s2.r1 !== sel.r1 || s2.c1 !== sel.c1) { k.sfx('tick'); } Object.assign(sel, s2); } }
    if (sel && sel.a && (p.up || !p.down)) { check(sel); sel = null; }
    /* teclado / mando: cursor, A fija inicio y A confirma */
    const dr = (k.hit.has('down') ? 1 : 0) - (k.hit.has('up') ? 1 : 0), dc = (k.hit.has('right') ? 1 : 0) - (k.hit.has('left') ? 1 : 0);
    if (dr || dc) { kShown = true; kc.r = k.clamp(kc.r + dr, 0, G.rows - 1); kc.c = k.clamp(kc.c + dc, 0, G.cols - 1); k.sfx('click'); }
    if (k.hit.has('a')) { kShown = true; if (!kSel) { kSel = { r: kc.r, c: kc.c }; k.sfx('pop'); } else { const s = snap(kSel, kc); kSel = null; check(s); } }
    if (k.hit.has('b')) kSel = null;
  }
  function draw() {
    const t = performance.now() / 1000;
    c.drawImage(backdrop('#2b3470', '#121632', 20), 0, 0);
    if (!CATS) { outlined(CFG.title, W / 2, H / 2, 34, '#ffd166', 'center', 6); return; }
    if (!built) build();
    const gw = G.cols * G.cs, gh = G.rows * G.cs;
    /* papel */
    c.fillStyle = 'rgba(6,4,20,.45)'; ART.rr(c, G.x0 - 6, G.y0 - 6 + 6, gw + 12, gh + 12, 16); c.fill();
    ART.rr(c, G.x0 - 6, G.y0 - 6, gw + 12, gh + 12, 16); const pg = c.createLinearGradient(0, G.y0, 0, G.y0 + gh); pg.addColorStop(0, '#fffaf0'); pg.addColorStop(1, '#f1e6cf'); c.fillStyle = pg; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.strokeStyle = 'rgba(26,21,48,.07)'; c.lineWidth = 1; for (let i = 1; i < G.cols; i++) { c.beginPath(); c.moveTo(G.x0 + i * G.cs, G.y0); c.lineTo(G.x0 + i * G.cs, G.y0 + gh); c.stroke(); } for (let i = 1; i < G.rows; i++) { c.beginPath(); c.moveTo(G.x0, G.y0 + i * G.cs); c.lineTo(G.x0 + gw, G.y0 + i * G.cs); c.stroke(); }
    const capsule = (s, col, a, grow) => { const [x0, y0] = cellC(s.r0, s.c0), [x1, y1] = cellC(s.r1, s.c1), r = G.cs * 0.4 * (grow || 1); c.save(); c.globalAlpha = a; c.lineCap = 'round'; c.strokeStyle = ART.dark(col, 0.25); c.lineWidth = r * 2 + 4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 + 0.01, y1); c.stroke(); c.strokeStyle = col; c.lineWidth = r * 2; c.stroke(); c.restore(); };
    words.forEach((o) => { if (o.found) capsule(o.sel || { r0: o.r, c0: o.c, r1: o.r + o.dr * (o.n.length - 1), c1: o.c + o.dc * (o.n.length - 1) }, o.col, 0.55, 1 + Math.max(0, 0.3 - o.t)); });
    if (k.st === 'ready') words.slice(0, 2).forEach((o) => capsule({ r0: o.r, c0: o.c, r1: o.r + o.dr * (o.n.length - 1), c1: o.c + o.dc * (o.n.length - 1) }, o.col, 0.5));
    if (sel) capsule(sel, '#6e62f5', 0.45);
    if (kSel) capsule(snap(kSel, kc), '#6e62f5', 0.4);
    /* pista: primera letra de una palabra pendiente parpadea tras 25 s sin encontrar nada (1.23: antes 45 s) */
    const hint = !doneT && sinceFind > 25 ? words.find((o) => !o.found) : null;
    for (let r = 0; r < G.rows; r++) for (let q = 0; q < G.cols; q++) {
      const [x, y] = cellC(r, q);
      if (hint && hint.r === r && hint.c === q) { c.fillStyle = ART.alpha('#ffd166', 0.45 + 0.35 * Math.sin(t * 6)); c.beginPath(); c.arc(x, y, G.cs * 0.42, 0, TAU); c.fill(); }
      txt(grid[r][q], x, y + 1, Math.round(G.cs * 0.55), OUT, 'center', 900);
    }
    if (kShown) { const [x, y] = cellC(kc.r, kc.c); c.save(); c.lineWidth = 3.5; c.strokeStyle = '#6e62f5'; c.beginPath(); c.arc(x, y, G.cs * 0.46, 0, TAU); c.stroke(); c.restore(); }
    /* lista de palabras y reloj */
    const secs = Math.floor(time), clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const lvlTxt = ['Nivel 1: → ↓', 'Nivel 2: + diagonal', 'Nivel 3: + al revés', 'Nivel 4: todas'][lvl];
    if (LAND) {
      const x = G.x0 + gw + 16, w = W - x - 10;
      panel(x, 16, w, 60, 14, '#3a3478', { drop: 3 }); outlined(cat, x + w / 2, 38, fitSize(cat, w - 16, 22, 13, 900), '#ffd166', 'center', 5); txt(lvlTxt, x + w / 2, 62, 13, '#cfc8ff', 'center', 700);
      words.forEach((o, i) => { const y = 102 + i * 34; drawWord(o, x + 8, y, w - 16); });
      panel(x, 380, w, 50, 14, '#2a2f5a', { drop: 3 }); outlined(clock, x + w / 2, 405, 26, '#fff', 'center', 5);
    } else {
      panel(15, 14, 420, 72, 16, '#3a3478', { drop: 3 });
      outlined(cat, 30, 40, fitSize(cat, 280, 26, 14, 900), '#ffd166', 'left', 5); txt(lvlTxt, 30, 68, 14, '#cfc8ff', 'left', 700);
      outlined(clock, 420, 50, 28, '#fff', 'right', 5);
      words.forEach((o, i) => { const x = 15 + (i % 2) * 215, y = 590 + Math.floor(i / 2) * 48; drawWord(o, x, y, 205); });
      txt(`${words.filter((o) => o.found).length} de ${NW} encontradas`, W / 2, 782, 15, '#cfc8ff', 'center', 700);
    }
  }
  function drawWord(o, x, y, w) {
    panel(x, y - 15, w, 30, 10, o.found ? ART.dark(o.col, 0.1) : '#2a2f5a', { drop: 2, lw: 2.5, nogl: true });
    const s = fitSize(o.w, w - 20, 19, 12, 900); txt(o.w, x + w / 2, y + 1, s, o.found ? '#fff' : '#f0ecff', 'center', 900);
    if (o.found) { c.font = FONT(s, 900); const tw = c.measureText(o.w).width; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(x + w / 2 - tw / 2 - 4, y + 1); c.lineTo(x + w / 2 + tw / 2 + 4, y + 1); c.stroke(); }
  }
  return { st: () => ({ words, G, lvl, doneT }), reset, update, draw, onKey: () => false, intro: 'Encuentra las ocho palabras escondidas en la rejilla: arrastra el dedo desde la primera letra hasta la última. Pueden ir en horizontal, vertical, diagonal o al revés según el nivel.' };
})();

/* ---------- Arranque ---------- */
const M = MODE === 'hang' ? HG : MODE === 'sopa' ? SP : D; window.__m = M;
/* Teclado físico: las letras (incluida P, que el kit usa para pausar) se capturan antes que el kit mientras se juega. */
addEventListener('keydown', (e) => { if (M.onKey(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
M.reset();
k.show(CFG.title, M.intro);
k.run((dt) => { if (!k.gate(M.reset)) return; M.update(dt); }, () => M.draw());
addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerWidth >= innerHeight * 0.98) !== LAND && (k.st !== 'play' || MODE === 'daily')) location.reload(); }, 400); });
