/* farol.js — juegos de información oculta para el modo tele: la pantalla grande enseña la mesa y cada móvil recibe
 * su dato secreto con k.priv (nunca se dibuja en la tele). CFG.mode:
 *  'dados'   Dados Mentirosos: cubiletes de 5 dados, apuestas «cuántos dados hay de un valor» y ¡Dudo!
 *  'reparto' Compartir o Robar: cada ronda se elige en secreto repartir el cofre o quedárselo.
 *  'codigo'  Combinación Oculta: rompe la clave de 4 colores con las pistas de aciertos (carrera entre jugadores).
 * Reglas puras verificables: FAR (dudo, conteo, reparto del cofre y pistas del código) se exporta en Node.
 * IA floja que sube de nivel con tus victorias (localStorage cpu:<id>). Arte por código con ART. */
const FAR = (() => {
  /* --- Dados mentirosos --- */
  const better = (b, q, f) => !b || q > b.q || (q === b.q && f > b.f);
  const minQ = (b, f) => (!b ? 1 : f > b.f ? b.q : b.q + 1);
  const countF = (hands, f) => hands.reduce((a, h) => a + h.filter((v) => v === f).length, 0);
  const dudo = (hands, bid) => { const n = countF(hands, bid.f); return { n, ok: n >= bid.q }; };
  /* --- Compartir o robar --- */
  function split(choices, pot) {
    const n = choices.length, rob = choices.map((v, i) => i).filter((i) => choices[i] === 'robar');
    const out = Array(n).fill(0);
    if (!rob.length) { const v = Math.floor(pot / n); choices.forEach((_, i) => (out[i] = v)); return { out, kind: 'todos' }; }
    if (rob.length === n) return { out, kind: 'nadie' };
    const v = Math.floor(pot / rob.length); rob.forEach((i) => (out[i] = v));
    return { out, kind: rob.length === 1 ? 'uno' : 'varios' };
  }
  /* --- Combinación oculta --- */
  function clue(code, guess) {
    const n = code.length; let ok = 0; const a = [], b = [];
    for (let i = 0; i < n; i++) { if (code[i] === guess[i]) ok++; else { a.push(code[i]); b.push(guess[i]); } }
    let col = 0; const used = a.slice();
    for (const g of b) { const i = used.indexOf(g); if (i >= 0) { col++; used.splice(i, 1); } }
    return { ok, col };
  }
  const same = (x, y) => x.ok === y.ok && x.col === y.col;
  return { better, minQ, countF, dudo, split, clue, same };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = FAR;

if (typeof window !== 'undefined' && window.Kit && window.CFG) (() => {
  const MODE = CFG.mode || 'dados';
  const LAND = innerWidth >= innerHeight * 0.98;
  const W = LAND ? 800 : 450, H = LAND ? 450 : 800;
  const BG = { dados: '#20304a', reparto: '#16233e', codigo: '#1b1640' }[MODE];
  const TOPB = LAND ? 50 : 12;   // franja libre arriba: en horizontal el botón de pausa del reproductor se pinta ahí
  const k = Kit({ w: W, h: H, title: CFG.title, bg: BG }), c = k.ctx, OUT = ART.OUT, TAU = 6.2832;
  const F = (s, w2) => `${w2 || 800} ${s}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
  const PAL = ['#ff6fb5', '#5b8cff', '#a8cf3f', '#ffc94d', '#a097ff', '#5ce1e6'];
  const MAXP = Math.max(2, Math.min(4, (Array.isArray(CFG.mp) && CFG.mp[1]) || 4));
  let LVL = 0; try { LVL = Math.min(3, Math.floor(+localStorage.getItem('cpu:' + CFG.id) || 0)); } catch (e) { /* sin almacenamiento */ }

  /* ---------------- utilidades de dibujo ---------------- */
  function fo(fill, lw) { c.fillStyle = fill; c.fill(); c.lineWidth = lw || 2; c.strokeStyle = OUT; c.stroke(); }
  function rr(x, y, w, h, r, fill, lw) { ART.rr(c, x, y, w, h, r); fo(fill, lw); }
  function circ(x, y, r, fill, lw) { c.beginPath(); c.arc(x, y, r, 0, TAU); fo(fill, lw); }
  function txt(s, x, y, size, col, align, base) { c.font = F(size); c.textAlign = align || 'center'; c.textBaseline = base || 'middle'; c.lineJoin = 'round'; c.lineWidth = size / 5 + 2; c.strokeStyle = OUT; c.strokeText(s, x, y); c.fillStyle = col || '#fff'; c.fillText(s, x, y); }
  /* Rótulo que encoge hasta caber de verdad (measureText), nunca se desborda. */
  function fit(s, x, y, size, col, align, maxw) { let z = size; c.font = F(z); while (z > 8 && c.measureText(s).width > maxw) { z -= 1; c.font = F(z); } txt(s, x, y, z, col, align); return z; }
  function tw(s, size) { c.font = F(size); return c.measureText(s).width; }
  function pill(x, y, w, h, fill, label, size, tcol, off) {
    c.globalAlpha = off ? 0.42 : 1;
    ART.rr(c, x, y + 3, w, h, h / 2.4); c.fillStyle = OUT; c.fill();
    rr(x, y, w, h, h / 2.4, fill, 2.5);
    c.fillStyle = 'rgba(255,255,255,.34)'; ART.rr(c, x + 6, y + 3, w - 12, h * 0.28, h / 5); c.fill();
    if (label) { c.font = F(size || 17); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = tcol || OUT; let z = size || 17; while (z > 9 && c.measureText(label).width > w - 18) { z -= 1; c.font = F(z); } c.fillText(label, x + w / 2, y + h / 2 + 1); }
    c.globalAlpha = 1;
  }
  function panel(x, y, w, h, fill) { ART.rr(c, x, y + 4, w, h, 16); c.fillStyle = OUT; c.fill(); rr(x, y, w, h, 16, fill || 'rgba(14,18,34,.88)', 2.5); }
  /* --- Ley de la pieza única (§8): un trazado, un relleno, un contorno --- */
  function uni(c, parts, ow) {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = (ow || 1.15) * 2;
    for (let i = 0; i < parts.length; i++) { c.beginPath(); parts[i][0](c); c.stroke(); }
    for (let i = 0; i < parts.length; i++) { c.beginPath(); parts[i][0](c); c.fillStyle = parts[i][1]; c.fill(); }
    c.restore();
  }
  function inpath(c, parts, fn) { c.save(); c.beginPath(); for (let i = 0; i < parts.length; i++) parts[i][0](c); c.clip(); fn(c); c.restore(); }
  /* dado: un cubo con grosor, puntos taladrados; nada de losas apiladas */
  /* caché de sprites: dado y cubilete tienen forma fija */
  const FSC = {};
  function sprOf(key, w, h, ox, oy, fn) {
    let sp = FSC[key]; if (sp) return sp;
    const dpr = Math.min(2, window.devicePixelRatio || 1), cv = document.createElement('canvas');
    cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
    const g = cv.getContext('2d'); g.scale(dpr, dpr); g.translate(ox, oy); fn(g);
    return (FSC[key] = { cv: cv, ox: ox, oy: oy, w: w, h: h });
  }
  function die(x, y, s, v, col) {
    const sp = sprOf('d|' + Math.round(s * 2) / 2 + '|' + v + '|' + (col || ''), s * 1.6, s * 1.7, s * 0.8, s * 0.8, (g) => dieDraw(g, 0, 0, s, v, col));
    c.drawImage(sp.cv, x - sp.ox, y - sp.oy, sp.w, sp.h);
  }
  function dieDraw(c, x, y, s, v, col) {
    const h = s / 2, TH = s * 0.1, rd = s * 0.22, base = col || '#fff8ef';
    const body = (g) => ART.rr(g, x - h, y - h, s, s + TH, rd), face = (g) => ART.rr(g, x - h, y - h, s, s, rd);
    const sg = c.createLinearGradient(x - h, y + h - TH, x + h, y + h + TH); sg.addColorStop(0, ART.dark(base, 0.16)); sg.addColorStop(1, ART.dark(base, 0.34));
    const fg = c.createLinearGradient(x - h, y - h, x + h, y + h); fg.addColorStop(0, ART.lite(base, 0.4)); fg.addColorStop(1, base);
    const parts = [[body, sg], [face, fg]];
    uni(c, parts, 1.2);
    inpath(c, parts, (g) => {
      let gr = g.createLinearGradient(0, y + h - 1.5, 0, y + h + TH); gr.addColorStop(0, 'rgba(0,0,0,.3)'); gr.addColorStop(0.35, 'rgba(0,0,0,.05)'); gr.addColorStop(1, 'rgba(0,0,0,.24)');
      g.fillStyle = gr; g.fillRect(x - h, y + h - 1.5, s, TH + 1.5);
      gr = g.createLinearGradient(0, y - h, 0, y - h + s * 0.3); gr.addColorStop(0, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - h, y - h, s, s * 0.3);
    });
    const d = s * 0.26, P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[v] || [];
    const pr = s * 0.095;
    P.forEach(([a, b]) => { const px = x + a * d, py = y + b * d;
      c.beginPath(); c.arc(px, py + pr * 0.24, pr * 1.12, 0, TAU); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill();
      const pg = c.createRadialGradient(px + pr * 0.3, py + pr * 0.34, pr * 0.1, px, py - pr * 0.12, pr * 1.3);
      pg.addColorStop(0, '#4a4166'); pg.addColorStop(0.55, OUT); pg.addColorStop(1, '#0b0819');
      c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fillStyle = pg; c.fill(); });
  }
  /* cubilete: un cuerpo de cuero, la boca se lee por sombra interior y no por otro contorno */
  function cup(x, y, s, n2) {
    const sp = sprOf('c|' + Math.round(s * 2) / 2, s * 1.3, s * 1.5, s * 0.65, s * 0.75, (g) => cupDraw(g, 0, 0, s));
    c.drawImage(sp.cv, x - sp.ox, y - sp.oy, sp.w, sp.h);
    if (n2 != null) txt(String(n2), x, y + s * 0.02, s * 0.42, '#fff3c4');
  }
  function cupDraw(c, x, y, s) {
    const body = (g) => { g.moveTo(x - s * 0.42, y + s * 0.5); g.lineTo(x - s * 0.3, y - s * 0.46);
      g.bezierCurveTo(x - s * 0.3, y - s * 0.58, x + s * 0.3, y - s * 0.58, x + s * 0.3, y - s * 0.46);
      g.lineTo(x + s * 0.42, y + s * 0.5); g.closePath(); };
    const gr = c.createLinearGradient(x - s * 0.45, 0, x + s * 0.45, 0);
    gr.addColorStop(0, '#a06c33'); gr.addColorStop(0.35, '#8b5a2b'); gr.addColorStop(1, '#5d3a1a');
    uni(c, [[body, gr]], 1.2);
    inpath(c, [[body, gr]], (g) => {
      let sh = g.createLinearGradient(0, y - s * 0.58, 0, y - s * 0.34); sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = sh; g.fillRect(x - s * 0.5, y - s * 0.6, s, s * 0.28);                       // boca en sombra
      g.fillStyle = 'rgba(255,225,180,.28)'; g.beginPath(); g.ellipse(x, y - s * 0.455, s * 0.3, s * 0.1, 0, Math.PI, TAU); g.fill();
      sh = g.createLinearGradient(0, y + s * 0.1, 0, y + s * 0.52); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.3)');
      g.fillStyle = sh; g.fillRect(x - s * 0.5, y + s * 0.1, s, s * 0.45);
      g.fillStyle = 'rgba(255,225,180,.16)'; g.fillRect(x - s * 0.26, y - s * 0.4, s * 0.06, s * 0.88);
    });
  }

  /* ---------------- estado común ---------------- */
  let S = null, hits = [], msg = '', msgT = 0, sig = {}, pT = 0, foc = 0, kbd = false;
  const hum = (p) => k.human(p);
  const nameOf = (p) => (S && S.names[p]) || 'J' + (p + 1);
  const colOf = (p) => k.pcol(p);
  function seatsFor() {
    const hs = k.party ? k.party.length : 0;
    const n = MODE === 'codigo' ? (k.party ? Math.max(2, Math.min(MAXP, hs)) : 1) : k.party ? Math.max(2, Math.min(MAXP, hs)) : Math.min(MAXP, 3);
    return k.players(n);
  }
  function refreshNames() { if (!S) return; const pl = k.players(S.n); S.names = pl.map((q) => q.name); }
  function say(t2, big) { msg = t2; msgT = big ? 2.4 : 1.6; if (big) k.shake(6); }
  const anyHit = (key) => k.hit.has(key) || (!!k.party && k.party.some((q) => k.phit(q.p, key)));
  function hitAt(x, y) { for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; }
  function winLevel(win) { try { const v0 = +localStorage.getItem('cpu:' + CFG.id) || 0; localStorage.setItem('cpu:' + CFG.id, String(win ? Math.min(3.5, v0 + 0.5) : Math.max(0, v0 - 0.5))); } catch (e) { /* nada */ } }

  /* =================================================== DADOS MENTIROSOS =================================================== */
  const DADOS = {
    reset() {
      const pl = seatsFor();
      S = { n: pl.length, names: pl.map((q) => q.name), dice: pl.map(() => []), left: pl.map(() => 5), out: pl.map(() => false), cur: 0, bid: null, hist: [], phase: 'roll', t: 0, sel: { q: 1, f: 1 }, res: null, think: 0, starter: 0, over: false };
      this.roll(0);
    },
    alive() { return S.out.map((v, p) => p).filter((p) => !S.out[p]); },
    total() { return S.left.reduce((a, v, p) => a + (S.out[p] ? 0 : v), 0); },
    roll(st) {
      for (let p = 0; p < S.n; p++) S.dice[p] = S.out[p] ? [] : Array.from({ length: S.left[p] }, () => k.ri(1, 6)).sort((a, b) => a - b);
      S.bid = null; S.hist = []; S.res = null; S.phase = 'bid'; S.t = 0; S.think = 0;
      S.cur = S.out[st] ? this.alive()[0] : st; S.starter = S.cur;
      S.sel = { q: 1, f: 1 }; sig = {};
    },
    next(p) { let q = p; do { q = (q + 1) % S.n; } while (S.out[q]); return q; },
    legalSel() { const b = S.bid, q = Math.max(FAR.minQ(b, S.sel.f), Math.min(S.sel.q, this.total())); S.sel.q = Math.min(q, this.total()); },
    bidNow(p, q, f) {
      if (S.phase !== 'bid' || S.cur !== p) return false;
      if (!FAR.better(S.bid, q, f) || q > this.total() || q < 1 || f < 1 || f > 6) return false;
      S.bid = { q, f, p }; S.hist.push({ p, q, f }); if (S.hist.length > 6) S.hist.shift();
      k.sfx('click'); S.cur = this.next(p); S.think = 0; S.sel = { q: FAR.minQ(S.bid, S.sel.f), f: S.sel.f }; this.legalSel(); sig = {};
      return true;
    },
    dudoNow(p) {
      if (S.phase !== 'bid' || S.cur !== p || !S.bid) return false;
      const hands = S.dice.filter((_, q) => !S.out[q]), r = FAR.dudo(hands, S.bid);
      const loser = r.ok ? p : S.bid.p;
      S.res = { by: p, bid: S.bid, n: r.n, ok: r.ok, loser }; S.phase = 'reveal'; S.t = 0;
      k.sfx(r.ok ? 'hurt' : 'win'); say(`${nameOf(p)} duda de ${nameOf(S.bid.p)}`, true);
      return true;
    },
    apply() {
      const l = S.res.loser; S.left[l]--; k.sfx('hit');
      if (S.left[l] <= 0) { S.out[l] = true; say(`${nameOf(l)} se queda sin dados`, true); }
      const al = this.alive();
      if (al.length <= 1) { S.phase = 'over'; S.over = true; this.finish(al[0]); return; }
      this.roll(S.out[l] ? this.next(l) : l);
    },
    finish(win) {
      const humWin = hum(win); winLevel(humWin);
      k.podium(Array.from({ length: S.n }, (_, p) => ({ p, name: nameOf(p), score: S.left[p] + (p === win ? 0.5 : 0) })), { head: humWin && !k.party ? '¡Has ganado!' : `¡Gana ${nameOf(win)}!`, fmt: (v) => { const f2 = Math.floor(v); return f2 ? `${f2} dado${f2 === 1 ? '' : 's'}` : 'sin dados'; }, noTie: true });
    },
    /* IA: cuenta sus dados y estima los ajenos a 1/6; duda cuando la apuesta se pasa de lo razonable. */
    ai(p) {
      const mine = S.dice[p], tot = this.total(), others = tot - mine.length, b = S.bid;
      const est = (f) => mine.filter((v) => v === f).length + others / 6;
      if (b) {
        const e = est(b.f), margin = b.q - e;
        const tol = [1.6, 1.25, 0.95, 0.75][Math.min(3, LVL)];
        if (margin > tol + Math.random() * 0.7) return { t: 'dudo' };
      }
      let best = null;
      for (let f = 1; f <= 6; f++) {
        const q = FAR.minQ(b, f); if (q > tot) continue;
        const e = est(f), risk = q - e;
        const sc = -risk + (mine.filter((v) => v === f).length) * 0.35 + (Math.random() - 0.5) * (1.1 - LVL * 0.2);
        if (!best || sc > best.sc) best = { q, f, sc };
      }
      if (!best) return { t: 'dudo' };
      if (b && best.sc < -1.4 && Math.random() < 0.55 + LVL * 0.1) return { t: 'dudo' };
      return { t: 'bid', q: best.q, f: best.f };
    },
    update(dt) {
      S.t += dt;
      if (S.phase === 'reveal') { if (S.t > 3.4 || (S.t > 1.2 && anyHit('a'))) this.apply(); return; }
      if (S.phase !== 'bid') return;
      const p = S.cur;
      if (!hum(p)) {
        if (!S.think) S.think = 0.9 + Math.random() * 0.8;
        if ((S.think -= dt) <= 0) { const a = this.ai(p); S.think = 0; if (a.t === 'dudo' && S.bid) this.dudoNow(p); else if (a.t === 'bid') this.bidNow(p, a.q, a.f); else if (S.bid) this.dudoNow(p); }
        return;
      }
      this.legalSel();
      if (k.phit(p, 'left')) { S.sel.f = ((S.sel.f - 2 + 6) % 6) + 1; this.legalSel(); k.sfx('click'); }
      if (k.phit(p, 'right')) { S.sel.f = (S.sel.f % 6) + 1; this.legalSel(); k.sfx('click'); }
      if (k.phit(p, 'up')) { S.sel.q = Math.min(this.total(), S.sel.q + 1); k.sfx('click'); }
      if (k.phit(p, 'down')) { S.sel.q = Math.max(FAR.minQ(S.bid, S.sel.f), S.sel.q - 1); k.sfx('click'); }
      if (k.phit(p, 'a')) this.bidNow(p, S.sel.q, S.sel.f);
      if (k.phit(p, 'b') && S.bid) this.dudoNow(p);
      if (!k.party && (k.tap || (k.ptr.up && !k.swipe))) {
        const h = hitAt(k.ptr.x, k.ptr.y);
        if (h) { if (h.v === 'bid') this.bidNow(0, S.sel.q, S.sel.f); else if (h.v === 'dudo') this.dudoNow(0); else if (h.v === 'q+') { S.sel.q = Math.min(this.total(), S.sel.q + 1); k.sfx('click'); } else if (h.v === 'q-') { S.sel.q = Math.max(FAR.minQ(S.bid, S.sel.f), S.sel.q - 1); k.sfx('click'); } else if (typeof h.v === 'number') { S.sel.f = h.v; this.legalSel(); k.sfx('click'); } }
      }
    },
    priv(force) {
      if (!k.privOK || !k.party) return;
      for (const q of k.party) {
        const p = q.p;
        if (p >= S.n) { if (sig[p] !== 'x') { k.priv(p, { title: 'Mirando', text: 'La partida está completa. Entras en la próxima.', items: [] }); sig[p] = 'x'; } continue; }
        const mine = S.dice[p].join('  '), b = S.bid, mine2 = S.out[p] ? 'Sin dados' : `Tus dados: ${mine}`;
        const t2 = S.phase === 'reveal' ? `Recuento: ${S.res.n} dado${S.res.n === 1 ? '' : 's'} de ${S.res.bid.f}` : S.cur === p ? (b ? `Apuesta de ${nameOf(b.p)}: ${b.q} × ${b.f}` : 'Abres tú la ronda') : `Turno de ${nameOf(S.cur)}`;
        const items = [];
        if (S.phase === 'bid' && S.cur === p && !S.out[p]) {
          for (let f = 1; f <= 6; f++) { const qy = FAR.minQ(b, f); if (qy <= this.total()) items.push({ v: 'b:' + qy + ':' + f, label: `${qy} × ${f}`, col: '#ffd166' }); }
          if (b && b.q + 1 <= this.total()) items.push({ v: 'b:' + (b.q + 1) + ':' + b.f, label: `${b.q + 1} × ${b.f}`, col: '#7cf7a0' });
          if (b) items.push({ v: 'dudo', label: '¡Dudo!', col: '#ff5a5f' });
        }
        const sg = mine2 + '|' + t2 + '|' + items.map((i) => i.v).join(',');
        if (!force && sig[p] === sg) continue; sig[p] = sg;
        k.priv(p, { title: `${nameOf(p)} · ${S.left[p]} dado${S.left[p] === 1 ? '' : 's'}`, text: `${mine2}\n${t2}`, items });
      }
    },
    pick(p, v) {
      if (typeof v !== 'string') return;
      if (v === 'dudo') this.dudoNow(p);
      else if (v.startsWith('b:')) { const [, q, f] = v.split(':'); this.bidNow(p, +q, +f); }
      this.priv(true);
    },
    draw() {
      const n = S.n, pw = Math.min(LAND ? 186 : 104, (W - 24 - (n - 1) * 8) / n), ph = LAND ? 84 : 92, y0 = TOPB;
      const x0 = (W - (n * pw + (n - 1) * 8)) / 2;
      for (let p = 0; p < n; p++) {
        const x = x0 + p * (pw + 8), on = S.cur === p && S.phase === 'bid';
        if (on) { c.globalAlpha = 0.3 + 0.24 * Math.sin(S.t * 6); rr(x - 4, y0 - 4, pw + 8, ph + 8, 18, colOf(p), 0); c.globalAlpha = 1; }
        panel(x, y0, pw, ph, S.out[p] ? 'rgba(30,20,30,.8)' : 'rgba(14,18,34,.9)');
        circ(x + 16, y0 + 18, 8, colOf(p), 2);
        fit(nameOf(p), x + 30, y0 + 18, 14, '#fff', 'left', pw - 38);
        if (S.out[p]) fit('eliminado', x + pw / 2, y0 + ph - 26, 13, '#ff9a8a', 'center', pw - 16);
        else {
          const sz = Math.min(20, (pw - 18) / Math.max(1, S.left[p]) - 3);
          for (let i = 0; i < S.left[p]; i++) cup(x + pw / 2 + (i - (S.left[p] - 1) / 2) * (sz + 3), y0 + ph - 26, sz);
        }
      }
      const cy = LAND ? 208 : 250;
      if (S.phase === 'reveal') this.drawReveal(cy);
      else {
        const b = S.bid;
        txt(b ? 'Apuesta en la mesa' : 'Nadie ha apostado todavía', W / 2, cy - 54, 15, '#cfe8d8');
        if (b) {
          const s2 = `${b.q} × `, wtot = tw(s2, 40) + 46;
          txt(s2, W / 2 - wtot / 2 + tw(s2, 40) / 2, cy, 40, '#ffd166', 'center');
          die(W / 2 - wtot / 2 + tw(s2, 40) + 21, cy, 40, b.f);
          fit(`de ${nameOf(b.p)}`, W / 2, cy + 40, 15, '#fff', 'center', W - 60);
        } else txt(`${this.total()} dados en juego`, W / 2, cy, 26, '#fff');
      }
      this.drawCtl();
      // el aviso va abajo, pero nunca si ya están los botones de apostar/dudar (lo que dice se ve igual en el recuento)
      const ctlOn = !k.party && S.phase === 'bid' && S.cur === 0;
      if (msgT > 0 && !(LAND && ctlOn)) { const w2 = Math.min(W - 24, tw(msg, 17) + 34); c.globalAlpha = Math.min(1, msgT * 2); const my = LAND ? H - 24 : 150; ART.rr(c, W / 2 - w2 / 2, my - 17, w2, 34, 17); c.fillStyle = 'rgba(8,14,26,.92)'; c.fill(); fit(msg, W / 2, my, 17, '#fff3c4', 'center', w2 - 16); c.globalAlpha = 1; }
    },
    drawReveal(cy) {
      const r = S.res, n = S.n;
      txt(`Había ${r.n} · apuesta ${r.bid.q} × ${r.bid.f}`, W / 2, cy - 64, LAND ? 20 : 18, r.ok ? '#7cf7a0' : '#ff9a8a');
      const rows = [];
      for (let p = 0; p < n; p++) if (!S.out[p]) rows.push(p);
      const dw = Math.min(30, (W - 130) / 5 - 4), gy = cy - 26;
      rows.forEach((p, i) => {
        const y = gy + i * (dw + 12);
        fit(nameOf(p), 16, y, 14, colOf(p), 'left', 96);
        S.dice[p].forEach((v, j) => die(126 + j * (dw + 6) + dw / 2, y, dw, v, v === r.bid.f ? '#ffe9a8' : '#fff8ef'));
      });
      fit(`${nameOf(r.loser)} pierde un dado`, W / 2, gy + rows.length * (dw + 12) + 10, 17, '#ffd166', 'center', W - 40);
    },
    drawCtl() {
      hits = [];
      const me = k.party ? -1 : 0, mine = S.phase === 'bid' && (k.party ? hum(S.cur) : S.cur === 0);
      const by = H - (LAND ? 108 : 190);
      if (!k.party && S.phase !== 'over') {
        const dw = Math.min(34, (W - 40) / 5 - 6), y = H - (LAND ? 156 : 246);
        txt('Tus dados', W / 2, y - 28, 14, '#cfe8d8');
        S.dice[0].forEach((v, j) => die(W / 2 + (j - (S.dice[0].length - 1) / 2) * (dw + 8), y, dw, v));
      }
      if (!mine) { if (S.phase === 'bid') fit(`Turno de ${nameOf(S.cur)}${k.party && hum(S.cur) ? ' · elige en tu móvil' : ''}`, W / 2, by + 30, 16, '#cfe8d8', 'center', W - 40); return; }
      const cur = k.party ? S.cur : 0;
      // Selector de cantidad y cara
      const bw = LAND ? 54 : 46, y = by;
      const qx = W / 2 - (LAND ? 190 : 150);
      fit('Cantidad', qx, y - 28, 13, '#cfe8d8', 'center', 110);
      pill(qx - bw - 26, y - 20, 34, 40, '#463ac4', '−', 24, '#fff'); hits.push({ x: qx - bw - 26, y: y - 20, w: 34, h: 40, v: 'q-' });
      txt(String(S.sel.q), qx, y, 34, '#ffd166');
      pill(qx + 26, y - 20, 34, 40, '#463ac4', '+', 24, '#fff'); hits.push({ x: qx + 26, y: y - 20, w: 34, h: 40, v: 'q+' });
      const fx = W / 2 + (LAND ? 30 : 10), fw = Math.min(30, (W / 2 - 40) / 6 - 4);
      fit('Valor', fx + (fw + 4) * 2.5 + fw / 2, y - 28, 13, '#cfe8d8', 'center', 110);
      for (let f = 1; f <= 6; f++) {
        const x = fx + (f - 1) * (fw + 4);
        if (S.sel.f === f) { rr(x - 3, y - fw / 2 - 3, fw + 6, fw + 6, 8, '#ffd166', 2); }
        die(x + fw / 2, y, fw, f); hits.push({ x, y: y - fw / 2, w: fw, h: fw, v: f });
      }
      const gw = LAND ? 180 : 150, gy2 = H - (LAND ? 56 : 92);
      pill(W / 2 - gw - 8, gy2 - 24, gw, 48, '#7cf7a0', `Apostar ${S.sel.q} × ${S.sel.f}`, 17); hits.push({ x: W / 2 - gw - 8, y: gy2 - 24, w: gw, h: 48, v: 'bid' });
      pill(W / 2 + 8, gy2 - 24, gw, 48, S.bid ? '#ff5a5f' : '#8a8fa8', '¡Dudo!', 19, '#fff', !S.bid); hits.push({ x: W / 2 + 8, y: gy2 - 24, w: gw, h: 48, v: 'dudo' });
    },
  };

  /* =================================================== COMPARTIR O ROBAR =================================================== */
  const REPARTO = {
    reset() {
      const pl = seatsFor();
      S = { n: pl.length, names: pl.map((q) => q.name), coins: pl.map(() => 0), pick: pl.map(() => null), hist: [], round: 1, rounds: 6, pot: 12, phase: 'pick', t: 0, res: null, think: [], over: false };
      this.newRound(true);
    },
    newRound(first) {
      S.pick = Array(S.n).fill(null); S.res = null; S.phase = 'pick'; S.t = 0;
      S.pot = S.round >= S.rounds ? 24 : 10 + (S.round - 1) * 2;
      S.think = Array.from({ length: S.n }, () => 1.4 + Math.random() * 2.4);
      if (!first) k.sfx('pop');
      sig = {};
    },
    choose(p, v) { if (S.phase !== 'pick' || S.pick[p]) return false; S.pick[p] = v; k.sfx('click'); if (S.pick.every((x) => x)) this.reveal(); return true; },
    /* IA: empieza confiada y va copiando lo que le hacen (toma y daca); en la última ronda roba más. */
    ai(p) {
      const rob = S.hist.filter((h) => h.some((v, q) => q !== p && v === 'robar')).length;
      let pr = 0.16 + rob * 0.13 + (S.round >= S.rounds ? 0.3 : 0) + LVL * 0.05;
      if (S.round === 1) pr = Math.min(pr, 0.12);
      return Math.random() < Math.min(0.82, pr) ? 'robar' : 'compartir';
    },
    reveal() {
      const r = FAR.split(S.pick, S.pot);
      r.out.forEach((v, p) => (S.coins[p] += v));
      S.res = r; S.hist.push(S.pick.slice()); S.phase = 'reveal'; S.t = 0;
      k.sfx(r.kind === 'nadie' ? 'lose' : r.kind === 'todos' ? 'win' : 'coin');
      if (r.kind === 'todos') k.confetti();
      say(r.kind === 'todos' ? '¡Todos comparten!' : r.kind === 'nadie' ? 'Todos roban: el cofre se pierde' : 'Alguien se lo ha llevado', true);
    },
    finish() {
      const m = Math.max(...S.coins), win = S.coins.indexOf(m);
      winLevel(hum(win));
      k.podium(S.coins.map((v, p) => ({ p, name: nameOf(p), score: v })), { head: hum(win) && !k.party ? '¡Has ganado!' : `¡Gana ${nameOf(win)}!`, fmt: (v) => `${v} moneda${v === 1 ? '' : 's'}` });
    },
    update(dt) {
      S.t += dt;
      if (S.phase === 'reveal') {
        if (S.t > 3.4 || (S.t > 1.3 && anyHit('a'))) {
          if (S.round >= S.rounds) { S.phase = 'over'; S.over = true; this.finish(); }
          else { S.round++; this.newRound(); }
        }
        return;
      }
      for (let p = 0; p < S.n; p++) if (!hum(p) && !S.pick[p]) { if ((S.think[p] -= dt) <= 0) this.choose(p, this.ai(p)); }
      for (let p = 0; p < S.n; p++) {
        if (!hum(p) || S.pick[p]) continue;
        if (k.phit(p, 'a') || k.phit(p, 'left')) this.choose(p, 'compartir');
        else if (k.phit(p, 'b') || k.phit(p, 'right')) this.choose(p, 'robar');
      }
      if (!k.party && !S.pick[0] && (k.tap || (k.ptr.up && !k.swipe))) { const h = hitAt(k.ptr.x, k.ptr.y); if (h) this.choose(0, h.v); }
      if (S.t > 22 && S.phase === 'pick') for (let p = 0; p < S.n; p++) if (!S.pick[p]) this.choose(p, 'compartir');
    },
    priv(force) {
      if (!k.privOK || !k.party) return;
      for (const q of k.party) {
        const p = q.p;
        if (p >= S.n) { if (sig[p] !== 'x') { k.priv(p, { title: 'Mirando', text: 'La partida está completa. Entras en la próxima.', items: [] }); sig[p] = 'x'; } continue; }
        const done = !!S.pick[p];
        const t2 = S.phase === 'reveal' ? `Te llevas ${S.res.out[p]} moneda${S.res.out[p] === 1 ? '' : 's'}` : done ? 'Elegido. Nadie lo sabe todavía' : `Cofre de ${S.pot} monedas: ¿qué haces?`;
        const items = S.phase === 'pick' && !done ? [{ v: 'compartir', label: 'Compartir', col: '#7cf7a0' }, { v: 'robar', label: 'Robar', col: '#ff5a5f' }] : [];
        const sg = t2 + '|' + items.length + '|' + S.round;
        if (!force && sig[p] === sg) continue; sig[p] = sg;
        k.priv(p, { title: `${nameOf(p)} · ${S.coins[p]} monedas`, text: t2, items });
      }
    },
    pick2(p, v) { if (v === 'compartir' || v === 'robar') { this.choose(p, v); this.priv(true); } },
    draw() {
      const n = S.n, pw = Math.min(LAND ? 180 : 104, (W - 24 - (n - 1) * 8) / n), ph = LAND ? 96 : 104, y0 = TOPB;
      const x0 = (W - (n * pw + (n - 1) * 8)) / 2;
      for (let p = 0; p < n; p++) {
        const x = x0 + p * (pw + 8);
        panel(x, y0, pw, ph);
        circ(x + 16, y0 + 18, 8, colOf(p), 2);
        fit(nameOf(p), x + 30, y0 + 18, 14, '#fff', 'left', pw - 38);
        fit(`${S.coins[p]} monedas`, x + pw / 2, y0 + 40, 15, '#ffd166', 'center', pw - 16);
        const v = S.phase === 'reveal' ? S.pick[p] : null, y = y0 + ph - 24;
        if (v) { pill(x + 8, y - 15, pw - 16, 30, v === 'robar' ? '#ff5a5f' : '#7cf7a0', v === 'robar' ? 'Roba' : 'Comparte', 15, '#fff'); }
        else if (S.pick[p]) fit('listo', x + pw / 2, y, 14, '#a8cf3f', 'center', pw - 16);
        else fit('pensando…', x + pw / 2, y, 13, '#cfe8d8', 'center', pw - 16);
      }
      // Cofre
      const cx = W / 2, cy = LAND ? 252 : 390, cw = LAND ? 170 : 190, chh = LAND ? 88 : 104;
      rr(cx - cw / 2, cy - chh / 2, cw, chh, 14, '#8b5a2b', 3);
      rr(cx - cw / 2, cy - chh / 2, cw, chh * 0.38, 12, '#a86b33', 2.5);
      rr(cx - 15, cy - chh / 2 + chh * 0.38 - 13, 30, 26, 7, '#ffc94d', 2.5);   // candado sobre la tapa, sin tapar la cifra
      txt(String(S.pot), cx, cy + chh * 0.22, 30, '#ffe27a');
      fit(`Ronda ${S.round} de ${S.rounds}${S.round >= S.rounds ? ' · cofre doble' : ''}`, cx, cy - chh / 2 - 26, 16, '#fff3c4', 'center', W - 40);
      if (S.phase === 'reveal') fit(S.res.kind === 'todos' ? `A ${S.res.out[0]} monedas cada uno` : S.res.kind === 'nadie' ? 'Nadie se lleva nada' : 'Los que roban se reparten el cofre', cx, cy + chh / 2 + 28, 17, '#fff', 'center', W - 40);
      this.drawCtl();
      if (msgT > 0) { const w2 = Math.min(W - 24, tw(msg, 18) + 34); c.globalAlpha = Math.min(1, msgT * 2); const my = LAND ? H - 26 : 190; ART.rr(c, W / 2 - w2 / 2, my - 18, w2, 36, 18); c.fillStyle = 'rgba(8,14,26,.92)'; c.fill(); fit(msg, W / 2, my, 18, '#fff3c4', 'center', w2 - 16); c.globalAlpha = 1; }   // solo sale en el recuento: abajo no hay botones
    },
    drawCtl() {
      hits = [];
      if (k.party) { if (S.phase === 'pick') fit('Cada uno elige en su móvil', W / 2, H - 40, 17, '#cfe8d8', 'center', W - 40); return; }
      if (S.phase !== 'pick' || S.pick[0]) { if (S.pick[0] && S.phase === 'pick') fit('Ya has elegido. Esperando a los demás…', W / 2, H - 46, 16, '#cfe8d8', 'center', W - 40); return; }
      const bw = Math.min(190, (W - 48) / 2), y = H - (LAND ? 84 : 110);
      pill(W / 2 - bw - 8, y, bw, 52, '#7cf7a0', 'Compartir', 19); hits.push({ x: W / 2 - bw - 8, y, w: bw, h: 52, v: 'compartir' });
      pill(W / 2 + 8, y, bw, 52, '#ff5a5f', 'Robar', 19, '#fff'); hits.push({ x: W / 2 + 8, y, w: bw, h: 52, v: 'robar' });
      fit('Nadie ve tu decisión hasta el recuento', W / 2, y + 68, 13.5, '#cfe8d8', 'center', W - 40);
    },
  };

  /* =================================================== COMBINACIÓN OCULTA =================================================== */
  const CODIGO = {
    reset() {
      const pl = seatsFor();
      S = { n: pl.length, names: pl.map((q) => q.name), lvl: 1, rows: pl.map(() => []), guess: pl.map(() => [0, 0, 0, 0]), slot: pl.map(() => 0), done: pl.map(() => false), score: pl.map(() => 0), code: null, nc: 4, tries: 10, phase: 'play', t: 0, round: 1, rounds: k.party ? 3 : 1, think: [], solved: 0, over: false };
      this.newCode();
    },
    newCode() {
      const lv = k.party ? Math.min(3, S.round) : S.lvl;
      S.nc = lv <= 1 ? 4 : lv === 2 ? 5 : 6;
      const rep = lv >= 3;
      const pool = [0, 1, 2, 3, 4, 5].slice(0, S.nc);
      if (rep) S.code = Array.from({ length: 4 }, () => pool[k.ri(0, S.nc - 1)]);
      else { const sh = k.shuffle(pool.slice()); S.code = sh.slice(0, 4); }
      S.tries = lv <= 1 ? 10 : lv === 2 ? 10 : 9;
      S.rows = S.rows.map(() => []); S.guess = S.guess.map(() => [0, 0, 0, 0]); S.slot = S.slot.map(() => 0);
      S.done = S.done.map(() => false); S.phase = 'play'; S.t = 0;
      S.think = Array.from({ length: S.n }, () => 3.2 + Math.random() * 2.6);
      sig = {};
    },
    submit(p) {
      if (S.phase !== 'play' || S.done[p]) return false;
      const g = S.guess[p].slice(), cl = FAR.clue(S.code, g);
      S.rows[p].push({ g, ok: cl.ok, col: cl.col });
      if (cl.ok === 4) {
        S.done[p] = true; S.score[p]++; k.sfx('win'); k.confetti();
        say(`${nameOf(p)} rompe la clave en ${S.rows[p].length} intentos`, true);
        this.endRound(p); return true;
      }
      k.sfx(cl.ok + cl.col ? 'pop' : 'hit');
      if (S.rows[p].length >= S.tries) { S.done[p] = true; if (S.done.every((v) => v)) this.endRound(-1); }
      return true;
    },
    endRound(win) {
      S.phase = 'reveal'; S.t = 0; S.winner = win;
      if (!k.party) { if (win === 0) { S.solved++; S.lvl++; } }
    },
    /* Rival: prueba una combinación compatible con todas las pistas (a veces falla a propósito si es floja). */
    aiGuess(p) {
      const rows = S.rows[p], pool = [0, 1, 2, 3, 4, 5].slice(0, S.nc);
      const ok = (g) => rows.every((r) => FAR.same(FAR.clue(r.g, g), { ok: r.ok, col: r.col }));
      const rnd = () => Array.from({ length: 4 }, () => pool[k.ri(0, S.nc - 1)]);
      if (Math.random() > 0.35 + LVL * 0.18 && rows.length) return rnd();
      for (let i = 0; i < 400; i++) { const g = rnd(); if (ok(g)) return g; }
      return rnd();
    },
    update(dt) {
      S.t += dt;
      if (S.phase === 'reveal') {
        if (S.t > 3.6 || (S.t > 1.4 && anyHit('a'))) {
          if (k.party) { if (S.round >= S.rounds) { S.over = true; this.finish(); } else { S.round++; this.newCode(); } }
          else if (S.winner === 0) this.newCode();
          else { S.over = true; this.finish(); }
        }
        return;
      }
      for (let p = 0; p < S.n; p++) {
        if (hum(p) || S.done[p]) continue;
        if ((S.think[p] -= dt) <= 0) { S.think[p] = 3.4 + Math.random() * 2.8 - LVL * 0.4; S.guess[p] = this.aiGuess(p); this.submit(p); }
      }
      for (let p = 0; p < S.n; p++) {
        if (!hum(p) || S.done[p] || S.phase !== 'play') continue;
        if (k.phit(p, 'left')) { S.slot[p] = (S.slot[p] + 3) % 4; k.sfx('click'); }
        if (k.phit(p, 'right')) { S.slot[p] = (S.slot[p] + 1) % 4; k.sfx('click'); }
        if (k.phit(p, 'up')) { S.guess[p][S.slot[p]] = (S.guess[p][S.slot[p]] + 1) % S.nc; k.sfx('click'); }
        if (k.phit(p, 'down')) { S.guess[p][S.slot[p]] = (S.guess[p][S.slot[p]] + S.nc - 1) % S.nc; k.sfx('click'); }
        if (k.phit(p, 'a')) this.submit(p);
      }
      if (!k.party && !S.done[0] && (k.tap || (k.ptr.up && !k.swipe))) {
        const h = hitAt(k.ptr.x, k.ptr.y);
        if (h) { if (h.v === 'go') this.submit(0); else if (typeof h.v === 'number') { S.slot[0] = h.v; S.guess[0][h.v] = (S.guess[0][h.v] + 1) % S.nc; k.sfx('click'); } else if (typeof h.v === 'string' && h.v.startsWith('c')) { S.guess[0][S.slot[0]] = +h.v.slice(1); S.slot[0] = (S.slot[0] + 1) % 4; k.sfx('click'); } }
      }
    },
    finish() {
      if (k.party) {
        const m = Math.max(...S.score), win = S.score.indexOf(m); winLevel(hum(win));
        k.podium(S.score.map((v, p) => ({ p, name: nameOf(p), score: v })), { head: `¡Gana ${nameOf(win)}!`, fmt: (v) => `${v} clave${v === 1 ? '' : 's'}` });
      } else {
        winLevel(S.solved >= 2);
        k.lose(CFG.id, S.solved, S.solved ? `¡${S.solved} clave${S.solved === 1 ? '' : 's'} rota${S.solved === 1 ? '' : 's'}!` : 'La clave se te resiste', `La combinación era ${S.code.map((v) => v + 1).join('-')}`);
      }
    },
    priv(force) {
      if (!k.privOK || !k.party) return;
      for (const q of k.party) {
        const p = q.p;
        if (p >= S.n) { if (sig[p] !== 'x') { k.priv(p, { title: 'Mirando', text: 'La partida está completa. Entras en la próxima.', items: [] }); sig[p] = 'x'; } continue; }
        const items = [];
        if (S.phase === 'play' && !S.done[p]) {
          for (let i = 0; i < S.nc; i++) items.push({ v: 'c' + i, label: String(i + 1), col: PAL[i] });
          items.push({ v: 'del', label: 'Borrar', col: '#8a8fa8' });
          items.push({ v: 'go', label: 'Probar', col: '#7cf7a0' });
        }
        const t2 = S.phase === 'reveal' ? 'Ronda terminada' : S.done[p] ? 'Sin más intentos' : `Intento ${S.rows[p].length + 1} de ${S.tries} · casilla ${S.slot[p] + 1}`;
        const sg = t2 + '|' + S.guess[p].join('') + '|' + items.length;
        if (!force && sig[p] === sg) continue; sig[p] = sg;
        k.priv(p, { title: `${nameOf(p)} · ${S.guess[p].map((v) => v + 1).join(' ')}`, text: t2, items });
      }
    },
    pick2(p, v) {
      if (typeof v !== 'string' || S.done[p] || S.phase !== 'play') return;
      if (v === 'go') this.submit(p);
      else if (v === 'del') { S.slot[p] = (S.slot[p] + 3) % 4; }
      else if (v.startsWith('c')) { S.guess[p][S.slot[p]] = Math.min(S.nc - 1, +v.slice(1)); S.slot[p] = (S.slot[p] + 1) % 4; }
      this.priv(true);
    },
    draw() {
      hits = [];
      const n = S.n, cols = n <= 2 ? n : LAND ? n : 2, rws = Math.ceil(n / cols);
      const top = TOPB + 46, botH = k.party ? 30 : LAND ? 96 : 130;
      let bw = (W - 16 - (cols - 1) * 8) / cols; const bh = (H - top - botH - 12 - (rws - 1) * 8) / rws;
      if (n === 1 && LAND) bw = Math.min(bw, 460);   // en solitario el tablero no se estira a lo ancho
      const px0 = (W - (cols * bw + (cols - 1) * 8)) / 2;
      fit(k.party ? `Ronda ${S.round} de ${S.rounds} · ${S.nc} colores` : `Clave ${S.lvl} · ${S.nc} colores · ${S.tries} intentos`, W / 2, TOPB + 18, 17, '#fff3c4', 'center', W - 30);
      for (let p = 0; p < n; p++) {
        const cx = px0 + (p % cols) * (bw + 8), cy = top + Math.floor(p / cols) * (bh + 8);
        panel(cx, cy, bw, bh);
        circ(cx + 16, cy + 16, 7, colOf(p), 2);
        fit(nameOf(p), cx + 28, cy + 16, 13.5, '#fff', 'left', bw - 90);
        fit(`${S.rows[p].length}/${S.tries}`, cx + bw - 10, cy + 16, 13, S.rows[p].length >= S.tries - 2 ? '#ff9a8a' : '#cfe8d8', 'right', 54);
        const listY = cy + 32, rowH = Math.min(26, (bh - 66 - (S.done[p] || !hum(p) ? 0 : 30)) / Math.max(1, S.tries));  // 26 px reservados abajo para el rótulo
        const pegR = Math.min(11, rowH * 0.36), stepX = Math.min(34, (bw - 80) / 4);
        const rowW = 4 * stepX + 32, rx = cx + Math.max(18, (bw - rowW) / 2);   // fila centrada de verdad en el panel
        S.rows[p].forEach((r, i) => {
          const y = listY + i * rowH + rowH / 2;
          r.g.forEach((v, j) => circ(rx + j * stepX, y, pegR, PAL[v], 1.8));
          const px = rx + 4 * stepX + 10;
          for (let q2 = 0; q2 < 4; q2++) { const on = q2 < r.ok ? '#1a1530' : q2 < r.ok + r.col ? '#fff' : null; const xx = px + (q2 % 2) * 11, yy = y - 5 + (q2 >> 1) * 11; c.beginPath(); c.arc(xx, yy, 4.2, 0, TAU); c.fillStyle = on || 'rgba(255,255,255,.13)'; c.fill(); if (on) { c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,.5)'; c.stroke(); } }
        });
        if (S.phase === 'play' && !S.done[p]) {
          const y = listY + S.rows[p].length * rowH + rowH / 2 + 2;
          S.guess[p].forEach((v, j) => { const x = rx + j * stepX; if (S.slot[p] === j && hum(p)) { circ(x, y, pegR + 4, '#ffd166', 0); } circ(x, y, pegR, PAL[v], 1.8); if (!k.party && p === 0) hits.push({ x: x - pegR - 4, y: y - pegR - 4, w: pegR * 2 + 8, h: pegR * 2 + 8, v: j }); });
        } else if (S.done[p]) fit(S.rows[p].length && S.rows[p][S.rows[p].length - 1].ok === 4 ? '¡Clave rota!' : 'Sin intentos', cx + bw / 2, cy + bh - 16, 14, S.rows[p].length && S.rows[p][S.rows[p].length - 1].ok === 4 ? '#7cf7a0' : '#ff9a8a', 'center', bw - 20);
      }
      if (S.phase === 'reveal') {
        c.fillStyle = 'rgba(8,12,24,.74)'; c.fillRect(0, 0, W, H);   // velo: el panel no se confunde con el tablero
        const pw = Math.min(W - 40, 340), y = H / 2 - 50;
        panel(W / 2 - pw / 2, y, pw, 100);
        fit(S.winner >= 0 ? `${nameOf(S.winner)} rompe la clave` : 'Nadie la ha roto', W / 2, y + 26, 18, '#ffd166', 'center', pw - 24);
        S.code.forEach((v, j) => circ(W / 2 + (j - 1.5) * 38, y + 66, 14, PAL[v], 2));
      }
      if (!k.party && S.phase === 'play' && !S.done[0]) {
        const y = H - (LAND ? 56 : 84), cw2 = Math.min(44, (W - 40) / S.nc - 6);
        for (let i = 0; i < S.nc; i++) { const x = W / 2 + (i - (S.nc - 1) / 2) * (cw2 + 6); circ(x, y - 30, cw2 / 2, PAL[i], 2.2); hits.push({ x: x - cw2 / 2, y: y - 30 - cw2 / 2, w: cw2, h: cw2, v: 'c' + i }); }
        pill(W / 2 - 80, y + 4, 160, 44, '#7cf7a0', 'Probar', 19); hits.push({ x: W / 2 - 80, y: y + 4, w: 160, h: 44, v: 'go' });
      } else if (k.party && S.phase === 'play') fit('Cada uno pone su combinación con el mando o el móvil', W / 2, H - 16, 14, '#cfe8d8', 'center', W - 24);
      if (msgT > 0) { const w2 = Math.min(W - 24, tw(msg, 17) + 34); c.globalAlpha = Math.min(1, msgT * 2); const my = H - (LAND ? 26 : 36); ART.rr(c, W / 2 - w2 / 2, my - 17, w2, 34, 17); c.fillStyle = 'rgba(8,14,26,.92)'; c.fill(); fit(msg, W / 2, my, 17, '#fff3c4', 'center', w2 - 16); c.globalAlpha = 1; }   // abajo: no pisa el titular ni el tablero
    },
  };

  /* =================================================== bucle =================================================== */
  const G = { dados: DADOS, reparto: REPARTO, codigo: CODIGO }[MODE];
  function reset() { hits = []; msg = ''; msgT = 0; sig = {}; G.reset(); }
  k.onParty = () => { if (k.st !== 'play') reset(); else { refreshNames(); sig = {}; if (G.priv) G.priv(true); } };
  k.onPick = (p, v) => { if (!S || k.st !== 'play') return; if (MODE === 'dados') DADOS.pick(p, v); else if (MODE === 'reparto') REPARTO.pick2(p, v); else CODIGO.pick2(p, v); };
  reset();                           // tablero listo tras el fondo: la pantalla de inicio (y la miniatura) no sale vacía
  k.run((dt) => {
    if (!k.gate(reset)) return;
    if (!S) reset();
    if (msgT > 0) msgT -= dt;
    G.update(dt);
    if ((pT -= dt) <= 0) { pT = 0.16; if (G.priv) G.priv(); }
  }, () => {
    k.clear();                       // fondo del modo: sin esto los cuadros se superponen
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,.22)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (!S) return;
    G.draw();
  });
  k.show(CFG.title, CFG.help);
  window.__far = { FAR, get S() { return S; }, get hits() { return hits; } };
  addEventListener('resize', () => { clearTimeout(window.__ot); window.__ot = setTimeout(() => { if ((innerWidth >= innerHeight * 0.98) !== LAND && k.st !== 'play') location.reload(); }, 400); });
})();
