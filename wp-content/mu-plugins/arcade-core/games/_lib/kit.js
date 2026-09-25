/* kit.js — mini runtime común de los juegos del portal (sin dependencias).
 * Kit({w,h,title,bg}) → k con: ctx, w, h, held/hit (up,down,left,right,a,b,pause),
 * ptr {x,y,down,hit,up}, swipe ('up'|'down'|'left'|'right'|null), tap, go(),
 * show(t,s), hide(), best(id,score), run(update,draw), rnd, clamp, text.
 * Teclado: flechas/WASD, Espacio/Enter/Z = A, X/Shift = B, P/Esc = pausa.
 * Mando: D-pad/stick, botón 0/Start = A, botón 1/2 = B. Recibe el puente postMessage del portal. */
(function () {
  function Kit(o) {
    const w = o.w || 480, h = o.h || 640, bg = o.bg || '#101326';
    document.title = o.title || 'Game';
    const st = document.createElement('style');
    const AC_T = { meadow: '#5fbf45', snow: '#3fb6ea', night: '#8f6cff', castle: '#e09a2e', factory: '#f0842a', dusk: '#ff6f8a', jungle: '#34b574', sky: '#3a9ef0', canyon: '#e36d34', neon: '#ff3fb4', rally: '#e8b02e', skate: '#ff5a5f', voxel: '#4fc39a' };
    const acc = (window.CFG && (window.CFG.accent || AC_T[window.CFG.theme])) || '#6e62f5';
    st.textContent = `:root{--bg:${bg};--ac:${acc}}
html,body{margin:0;height:100%;background:${bg};overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;font-family:ui-rounded,"Trebuchet MS",system-ui,sans-serif;color:#f5f1e6}
canvas{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);touch-action:none}
#ov{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:16px;pointer-events:none;background:color-mix(in srgb,var(--bg) 55%,rgba(4,4,10,.78));backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
#ov .card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 22px 22px;min-width:min(300px,84vw);max-width:420px;border-radius:20px;background:linear-gradient(180deg,color-mix(in srgb,var(--bg) 45%,#241d44),color-mix(in srgb,var(--bg) 30%,#14102a));border:3px solid #1a1530;box-shadow:inset 0 2px 0 rgba(255,255,255,.14),0 7px 0 #1a1530,0 18px 40px rgba(0,0,0,.45);animation:pop .28s cubic-bezier(.2,1.2,.4,1)}
#ov h1{margin:0;font:900 clamp(26px,7vmin,40px)/1.05 ui-rounded,"Trebuchet MS",system-ui,sans-serif;letter-spacing:-.01em;color:#fff;text-shadow:0 3px 0 #1a1530,0 0 18px color-mix(in srgb,var(--ac) 45%,transparent)}
#ov p{margin:0;font:600 clamp(13px,3.4vmin,16px)/1.45 ui-rounded,"Trebuchet MS",system-ui,sans-serif;color:color-mix(in srgb,#fff 78%,var(--ac));max-width:36ch}#ov.hide{display:none}
#ov .go{margin-top:8px;padding:13px 30px;border-radius:14px;background:var(--ac);color:#fff;font:800 clamp(15px,4vmin,18px)/1 ui-rounded,"Trebuchet MS",system-ui,sans-serif;border:3px solid #1a1530;box-shadow:inset 0 2px 0 rgba(255,255,255,.3),0 5px 0 #1a1530;text-shadow:0 2px 0 rgba(26,21,48,.5);animation:bob 1.6s ease-in-out infinite}
#ov .rec{font:700 12.5px/1 ui-rounded,"Trebuchet MS",system-ui,sans-serif;color:#ffd166;padding:6px 11px;border:2px solid #1a1530;border-radius:10px;background:rgba(0,0,0,.25)}
@keyframes pop{from{transform:scale(.9);opacity:0}}@keyframes bob{50%{transform:translateY(-2px)}}
@media (prefers-reduced-motion:reduce){#ov .go{animation:none}}
#hud{position:fixed;top:max(6px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:5}
#hud.ext{display:none}
#hud button{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;border:2px solid #1a1530;background:color-mix(in srgb,var(--bg) 35%,rgba(26,21,48,.8));color:#fff;padding:0;opacity:.8;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 3px 0 #1a1530}
#hud button:hover{opacity:.9}
body.party #ov .card{max-width:min(980px,90vw);min-width:min(560px,86vw);padding:4.5vmin 5vmin 4vmin;gap:2.2vmin;border-width:4px}
body.party #ov h1{font-size:clamp(34px,10vmin,120px)}
body.party #ov p{font-size:clamp(16px,4.2vmin,46px);max-width:30ch}
body.party #ov .go{font-size:clamp(16px,4.4vmin,46px);padding:2vmin 4.5vmin;border-radius:2.4vmin}
body.party #ov .rec{font-size:clamp(13px,3vmin,30px);padding:1vmin 2vmin}
#ov .ka{display:inline-grid;place-items:center;width:1.5em;height:1.5em;margin-right:.45em;border-radius:50%;background:#fff;color:#1a1530;font-size:.8em;vertical-align:.08em;box-shadow:0 .12em 0 #1a1530}
#ov.win .card{border-color:var(--wc);box-shadow:inset 0 2px 0 rgba(255,255,255,.14),0 7px 0 #1a1530,0 0 0 4px color-mix(in srgb,var(--wc) 55%,transparent),0 0 60px color-mix(in srgb,var(--wc) 55%,transparent)}
#ov.win h1{color:var(--wc);animation:wbeat .9s ease-in-out infinite}
#ov.win .go{background:var(--wc);color:#1a1530;text-shadow:none}
@keyframes wbeat{50%{transform:scale(1.06)}}
@media (prefers-reduced-motion:reduce){#ov.win h1{animation:none}}`;
    document.head.append(st);
    const cv = document.createElement('canvas'), ov = document.createElement('div');
    ov.id = 'ov'; document.body.append(cv, ov);
    const hud = document.createElement('div'); hud.id = 'hud';
    const IC = { p: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>', r: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>', on: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>', off: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="m16 9 6 6m0-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' };
    hud.innerHTML = '<button id="bp" aria-label="Pausa">' + IC.p + '</button><button id="bm" aria-label="Sonido">' + IC.on + '</button>';
    document.body.append(hud);
    const hp = (window.CFG && window.CFG.hud) || '';
    if (hp) { hud.style.transform = 'none'; hud.style.left = hp.includes('l') ? '8px' : 'auto'; hud.style.right = hp.includes('r') ? '8px' : 'auto'; if (hp.includes('b')) { hud.style.top = 'auto'; hud.style.bottom = 'max(8px,env(safe-area-inset-bottom))'; } }
    const ctx = cv.getContext('2d');
    const k = { w, h, ctx, cv, held: new Set(), hit: new Set(), ptr: { x: w / 2, y: h / 2, down: false, hit: false, up: false }, swipe: null, tap: false, scale: 1 };

    function fit() {
      const s = Math.min(innerWidth / w, innerHeight / h), dpr = Math.min(2, devicePixelRatio || 1); // ×3 cuesta 2,25 veces más píxeles sin diferencia visible
      k.scale = s;
      cv.style.width = w * s + 'px'; cv.style.height = h * s + 'px';
      cv.width = Math.round(w * s * dpr); cv.height = Math.round(h * s * dpr);
      ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
    }
    addEventListener('resize', () => { fit(); pDrawn = 0; }); fit();

    const MAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'a', Enter: 'a', KeyZ: 'a', KeyX: 'b', ShiftLeft: 'b', ShiftRight: 'b', KeyP: 'pause', Escape: 'pause' };
    const press = (n, down) => { if (!n) return; if (down) { if (!k.held.has(n)) k.hit.add(n); k.held.add(n); } else k.held.delete(n); };
    const onKey = (e, down) => { const n = MAP[e.code]; if (n) { e.preventDefault && e.preventDefault(); press(n, down); } };
    addEventListener('keydown', (e) => onKey(e, true));
    addEventListener('keyup', (e) => onKey(e, false));
    addEventListener('message', (e) => { const d = e.data; if (d && d.type === 'arcade:key') onKey({ code: d.code }, d.event === 'keydown'); });
    addEventListener('blur', () => k.held.clear());
    /* Modo tele (fiesta): la tele envía 'arcade:party' {players:[{p,color,name}]} y 'arcade:pkey' {p,key,down} por jugador.
       k.party = jugadores (o null), k.pad(p) = {held,hit} de ese jugador (hit se limpia cada frame). J1 (p=0) también mueve k.held/k.hit. */
    const PADS = [];
    k.party = null;
    k.pad = (p) => PADS[p] || (PADS[p] = { held: new Set(), hit: new Set() });
    k.pcol = (p) => { const q = k.party && k.party.find((x) => x.p === p); return (q && q.color) || ['#ff5a5f', '#3fb6ea', '#ffd166', '#5fbf45'][p % 4]; };
    /* Multijugador común (oleada 1+). Sin tele: J1 = teclado/mando/táctil local y la CPU rellena el resto.
       k.mpMax = plazas máximas (CFG.mp[1]); k.players(n) = [{p,color,name,cpu}] con n plazas (CPU donde no hay humano);
       k.pheld(p,key)/k.phit(p,key) = tecla del jugador p; k.pdir(p) = {x,y} en -1..1 (8 direcciones);
       k.podium(filas) = pantalla final con clasificación [{p,score,name?}] (ordena de mayor a menor salvo o.asc);
       k.priv(p,data) = información privada en el móvil del jugador p (solo en la tele: k.privOK); k.onPick(p,v) = lo que elige. */
    k.mpMax = (window.CFG && Array.isArray(CFG.mp) && CFG.mp[1]) || 1;
    k.privOK = false; k.onPick = null;
    k.human = (p) => (k.party ? k.party.some((x) => x.p === p) : p === 0);
    k.players = (n) => { const out = []; for (let p = 0; p < (n || k.mpMax); p++) { const q = k.party && k.party.find((x) => x.p === p), hu = k.human(p); out.push({ p, color: k.pcol(p), name: hu ? (q && q.name) || (k.party ? 'J' + (p + 1) : 'Tú') : 'CPU', cpu: !hu }); } /* con varias CPU se numeran para distinguirlas en el podio */ if (out.filter((s) => s.cpu).length > 1) { let i = 0; for (const s of out) if (s.cpu) s.name = 'CPU ' + ++i; } return out; };
    k.pheld = (p, key) => (k.party ? k.pad(p).held.has(key) : p === 0 && k.held.has(key));
    k.phit = (p, key) => (k.party ? k.pad(p).hit.has(key) : p === 0 && k.hit.has(key));
    k.pdir = (p) => ({ x: (k.pheld(p, 'right') ? 1 : 0) - (k.pheld(p, 'left') ? 1 : 0), y: (k.pheld(p, 'down') ? 1 : 0) - (k.pheld(p, 'up') ? 1 : 0) });
    k.priv = (p, data) => { if (k.privOK) tell('arcade:priv', { p, data: data || null }); };
    k.podium = (rows, o) => {
      o = o || {}; if (!rows || !rows.length) rows = [{ p: 0, score: 0 }]; const r = rows.slice().sort((a, b) => (o.asc ? a.score - b.score : b.score - a.score)), top = r[0], pl = k.players(Math.max(k.mpMax, r.length));
      const raw = (x) => x.name || (pl[x.p] && pl[x.p].name) || 'J' + (x.p + 1);
      /* 1.28.1: si dos filas traen el mismo rótulo (varias CPU), se numeran por plaza. */
      const nm = (x) => { const n = raw(x); return r.filter((y) => raw(y) === n).length > 1 ? n + ' ' + (x.p + 1) : n; };
      const tie = r.length > 1 && r[1].score === top.score && !o.noTie;
      const body = r.map((x, i) => `<span style="display:inline-block;min-width:1.4em;color:${k.pcol(x.p)}">${i + 1}.</span><b style="color:${k.pcol(x.p)}">${nm(x)}</b> · ${o.fmt ? o.fmt(x.score) : x.score}`).join('<br>');
      k.win(o.head || (tie ? '¡Empate!' : `¡Gana ${nm(top)}!`), tie ? '#ffd166' : k.pcol(top.p), `${body}<br>${o.go || 'Toca para la revancha'}`, top.score);
    };
    const PK = { up: 1, down: 1, left: 1, right: 1, a: 1, b: 1 };
    addEventListener('message', (e) => { const d = e.data; if (!d || e.source !== parent || parent === window) return;
      if (d.type === 'arcade:party') {
        const pl = Array.isArray(d.players) ? d.players.filter((x) => x && x.p >= 0 && x.p < 4).map((x) => ({ p: x.p | 0, color: String(x.color || ''), name: String(x.name || '').slice(0, 16) })).sort((a, b) => a.p - b.p) : [];
        const was = k.party ? k.party.map((x) => x.p).join() : '';
        k.party = pl.length ? pl : null;
        document.body.classList.toggle('party', !!k.party); if (k.party) ov.querySelectorAll('.go').forEach((g) => { if (!g.querySelector('.ka')) g.insertAdjacentHTML('afterbegin', '<span class="ka">A</span>'); });
        PADS.forEach((q, i) => { if (q && !(k.party && k.party.some((x) => x.p === i))) { if (i === 0) for (const n of q.held) press(n, false); q.held.clear(); q.hit.clear(); } }); /* quien se va suelta sus teclas */
        hud.classList.toggle('ext', !!k.party || !!k.extHud); /* en la tele la pausa va en el menú del mando */
        k.privOK = !!(k.party && d.priv);
        if ((k.party ? k.party.map((x) => x.p).join() : '') !== was && k.onParty) k.onParty(k.party);
      } else if (d.type === 'arcade:ppick' && d.p >= 0 && d.p < 4) { if (k.onPick && !k.paused) k.onPick(d.p | 0, d.v);
      } else if (d.type === 'arcade:pkey' && PK[d.key] && d.p >= 0 && d.p < 4) {
        const pd = k.pad(d.p | 0), down = !!d.down;
        if (down) { if (!pd.held.has(d.key)) pd.hit.add(d.key); pd.held.add(d.key); } else pd.held.delete(d.key);
        if ((d.p | 0) === 0) press(d.key, down);
      } });

    const loc = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / k.scale, (e.clientY - r.top) / k.scale]; };
    addEventListener('pointerdown', (e) => {
      e.preventDefault(); const p = k.ptr; [p.x, p.y] = loc(e);
      p.down = true; p.hit = true; p.sx = p.x; p.sy = p.y;
    }, { passive: false });
    addEventListener('pointermove', (e) => { [k.ptr.x, k.ptr.y] = loc(e); }, { passive: true });
    const up = (e) => {
      const p = k.ptr; if (!p.down) return; [p.x, p.y] = loc(e); p.down = false; p.up = true;
      const dx = p.x - p.sx, dy = p.y - p.sy, m = Math.max(Math.abs(dx), Math.abs(dy)) * k.scale;
      k.swipe = m > 24 ? (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')) : null;
      k.tap = !k.swipe;
      if (k._skipUp) { k._skipUp = false; k.swipe = null; k.tap = false; }
    };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    addEventListener('contextmenu', (e) => e.preventDefault());

    let gpPrev = new Set();
    /* Solo se consulta el mando físico si el navegador ha avisado de uno (getGamepads cada frame no es gratis). */
    let gpOn = false;
    addEventListener('gamepadconnected', () => { gpOn = true; });
    function poll() {
      if (!gpOn) return;
      let gp = null; try { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (let i = 0; i < l.length; i++) if (l[i]) { gp = l[i]; break; } } catch (e) { /* bloqueado */ }
      if (!gp) { if (gpPrev.size) { for (const n of gpPrev) press(n, false); gpPrev = new Set(); } return; }
      const b = (i) => gp.buttons[i] && gp.buttons[i].pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, now = new Set();
      if (b(12) || ay < -0.5) now.add('up'); if (b(13) || ay > 0.5) now.add('down');
      if (b(14) || ax < -0.5) now.add('left'); if (b(15) || ax > 0.5) now.add('right');
      if (b(0) || b(9)) now.add('a'); if (b(1) || b(2)) now.add('b');
      for (const n of now) if (!gpPrev.has(n)) press(n, true);
      for (const n of gpPrev) if (!now.has(n)) press(n, false);
      gpPrev = now;
    }

    k.go = () => k.hit.has('a') || k.ptr.hit || (!!k.party && PADS.some((q) => q && q.hit.has('a')));
    const CFGID = (window.CFG && window.CFG.id) || o.id || o.title;
    k.show = (t, s) => {
      let body = s || '', go = 'Toca para jugar';
      const m = body.match(/<br>\s*(Toca[^<]*)$/i); if (m) { go = m[1]; body = body.slice(0, m.index); }
      const rec = k.st === 'ready' ? (() => { const b = k.best(CFGID, 0); return b ? `<div class="rec">Mejor puntuación: ${b}</div>` : ''; })() : '';
      const html = `<div class="card"><h1>${t}</h1>${body ? `<p>${body}</p>` : ''}${rec}<div class="go">${k.party ? '<span class="ka">A</span>' : ''}${(g2 => g2.charAt(0).toUpperCase() + g2.slice(1))(go.replace(/^Toca para /i, ''))}</div></div>`;
      if (k.paused) { ovSaved = { html, win: false }; return; } /* en pausa: se enseña al continuar */
      ov.innerHTML = html;
      ov.classList.remove('hide', 'win');
      if (k.st !== 'ready' && !k._losing && /^¡/.test(t)) { k.sfx('win'); k.confetti(); }
    };
    /* ---------- Audio (WebAudio, sin archivos) ---------- */
    let AC = null, muted = false; try { muted = localStorage.getItem('arcade:mute') === '1'; } catch (e) {}
    const bm = hud.querySelector('#bm'), bp = hud.querySelector('#bp'); bm.innerHTML = muted ? IC.off : IC.on;
    const ac = () => { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } if (AC.state === 'suspended') AC.resume(); return AC; };
    addEventListener('pointerdown', ac, true); addEventListener('keydown', ac, true);
    let noiseBuf = null;
    const tone = (f0, f1, dur, type, vol, delay) => { const a = AC, t0 = a.currentTime + (delay || 0), o2 = a.createOscillator(), g = a.createGain(); o2.type = type; o2.frequency.setValueAtTime(f0, t0); o2.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur); o2.connect(g).connect(a.destination); o2.start(t0); o2.stop(t0 + dur + 0.03); };
    const noise = (dur, vol, delay, freq) => { const a = AC; if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const t0 = a.currentTime + (delay || 0), src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(freq || 2000, t0); f.frequency.exponentialRampToValueAtTime(80, t0 + dur); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur); src.connect(f).connect(g).connect(a.destination); src.start(t0); src.stop(t0 + dur); };
    const SFX = {
      click: () => tone(700, 650, 0.05, 'square', 0.04),
      pop: () => tone(520, 980, 0.08, 'triangle', 0.12),
      coin: () => { tone(988, 988, 0.06, 'square', 0.06); tone(1319, 1319, 0.14, 'square', 0.06, 0.06); },
      jump: () => tone(280, 720, 0.14, 'square', 0.06),
      shoot: () => tone(1100, 240, 0.09, 'sawtooth', 0.035),
      hit: () => { noise(0.12, 0.25, 0, 2200); tone(220, 70, 0.12, 'square', 0.07); },
      hurt: () => { noise(0.28, 0.32, 0, 1000); tone(190, 45, 0.3, 'sawtooth', 0.1); },
      explode: () => { noise(0.55, 0.45, 0, 900); tone(90, 30, 0.5, 'sine', 0.3); },
      win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.13, i * 0.09)),
      lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.96, 0.24, 'triangle', 0.13, i * 0.13)),
      start: () => [523, 784].forEach((f, i) => tone(f, f, 0.12, 'square', 0.06, i * 0.08)),
      tick: () => { tone(660, 660, 0.12, 'square', 0.07); tone(1320, 1320, 0.05, 'triangle', 0.05); },
      go: () => { tone(880, 880, 0.3, 'square', 0.08); tone(1320, 1320, 0.3, 'triangle', 0.07); noise(0.2, 0.12, 0, 5000); },
      fanfare: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, f, i === 6 ? 0.6 : 0.16, 'square', 0.07, i * 0.11)); [262, 330, 392, 523].forEach((f, i) => tone(f, f, 0.5, 'triangle', 0.1, 0.45 + i * 0.01)); noise(0.5, 0.1, 0.66, 6000); },
    };
    let lastSfx = {};
    k.sfx = (n) => { if (muted || !SFX[n] || !ac()) return; const now = performance.now(); if (now - (lastSfx[n] || 0) < 40) return; lastSfx[n] = now; try { SFX[n](); } catch (e) {} };
    k.muted = () => muted;
    const setMute = (v) => { muted = !!v; bm.innerHTML = muted ? IC.off : IC.on; try { localStorage.setItem('arcade:mute', muted ? '1' : '0'); } catch (er) {} if (!muted) k.sfx('click'); };
    bm.addEventListener('pointerdown', (e) => { e.stopPropagation(); setMute(!muted); });
    /* Las vibraciones de los juegos también suenan y sacuden la pantalla */
    const rawVib = navigator.vibrate ? navigator.vibrate.bind(navigator) : null;
    const vib = (ms) => { const d = Array.isArray(ms) ? ms[0] : ms; if (d <= 20) k.sfx('pop'); else if (d <= 45) k.sfx('coin'); else if (d <= 90) { k.sfx('hit'); k.shake(4); } else { k.sfx('hurt'); k.shake(8); k.flash('rgba(255,60,80,.35)'); } try { rawVib && rawVib(ms); } catch (e) {} return true; };
    try { Object.defineProperty(navigator, 'vibrate', { value: vib, configurable: true, writable: true }); } catch (e) {}
    /* ---------- Efectos: partículas, textos flotantes, temblor, destello ---------- */
    const parts = [], floats = [], pool = [];
    const part = () => pool.pop() || {}; let shakeA = 0, flashC = null, flashT = 0;
    k.burst = (x, y, col, n, spd) => { n = n || 12; spd = spd || 160; for (let i = 0; i < n && parts.length < 400; i++) { const a = Math.random() * 6.283, v = spd * (0.3 + Math.random()); const q = part(); q.x = x; q.y = y; q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v; q.life = 0.4 + Math.random() * 0.4; q.max = 0.8; q.col = col || '#fff'; q.r = 1.5 + Math.random() * 2.5; q.conf = false; parts.push(q); } };
    k.float = (txt, x, y, col) => floats.push({ txt: String(txt), x, y, col: col || '#fff', t: 0.9 });
    k.shake = (a) => { shakeA = Math.max(shakeA, a || 5); };
    k.flash = (col) => { flashC = col || 'rgba(255,255,255,.5)'; flashT = 0.25; };
    k.confetti = (col, n) => { const cols = col ? [col, col, '#fff', col, '#ffd166'] : ['#f2d15c', '#ff5fa2', '#5ce1e6', '#7cf7a0', '#b98cff']; for (let i = 0; i < (n || 70) && parts.length < 600; i++) { const q = part(); q.x = Math.random() * w; q.y = -10 - Math.random() * 40; q.vx = (Math.random() - 0.5) * 80; q.vy = 80 + Math.random() * 160; q.life = 1.6 + Math.random(); q.max = 2.6; q.col = cols[i % 5]; q.r = 2 + Math.random() * 3; q.conf = true; parts.push(q); } };
    function fx(dt) {
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.conf) p.vx += Math.sin(p.y / 20) * 20 * dt; else { p.vx *= 1 - 2 * dt; p.vy = p.vy * (1 - 2 * dt) + 240 * dt; } p.life -= dt; }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) { const q = parts[i]; parts[i] = parts[parts.length - 1]; parts.pop(); if (pool.length < 600) pool.push(q); }
      for (const p of parts) { ctx.globalAlpha = Math.min(1, p.life / 0.3); ctx.fillStyle = p.col; if (p.conf) ctx.fillRect(p.x, p.y, p.r * 1.6, p.r); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); } }
      ctx.globalAlpha = 1;
      for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t -= dt; f.y -= 40 * dt; if (f.t <= 0) { floats.splice(i, 1); continue; } ctx.globalAlpha = Math.min(1, f.t / 0.3); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.font = '800 18px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; /* 1.29: el texto flotante se mantiene dentro del lienzo; antes se cortaba al salir cerca de un borde. */ const fw = ctx.measureText(f.txt).width / 2 + 6, fx2 = Math.max(fw, Math.min(w - fw, f.x)), fy2 = Math.max(14, Math.min(h - 10, f.y)); ctx.strokeText(f.txt, fx2, fy2); ctx.fillStyle = f.col; ctx.fillText(f.txt, fx2, fy2); }
      ctx.globalAlpha = 1;
      if (flashT > 0) { flashT -= dt; ctx.globalAlpha = Math.max(0, flashT / 0.25); ctx.fillStyle = flashC; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
    }
    /* ---------- Pausa ---------- */
    k.paused = false;
    /* La tarjeta de pausa guarda la que hubiera (p. ej. «¡2048!» en plena partida) y la devuelve al continuar. */
    let ovSaved = null, pDrawn = 0;
    const setPause = (on) => {
      if (on && (k.st !== 'play' || k.paused)) return;
      k.paused = on; bp.innerHTML = on ? IC.r : IC.p;
      if (on) { ovSaved = ov.classList.contains('hide') ? null : { html: ov.innerHTML, win: ov.classList.contains('win') }; k.sfx('click'); ov.innerHTML = `<div class="card"><h1>Pausa</h1><div class="go">${k.party ? '<span class="ka">A</span>' : ''}Continuar</div></div>`; ov.classList.remove('hide', 'win'); }
      else { if (ovSaved) { ov.innerHTML = ovSaved.html; ov.classList.toggle('win', ovSaved.win); ov.classList.remove('hide'); } else ov.classList.add('hide'); ovSaved = null; k.held.clear(); }
    };
    bp.addEventListener('pointerdown', (e) => { e.stopPropagation(); setPause(!k.paused); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });
    /* Puente con el portal: avisa de inicio/fin de partida (pausas publicitarias) y obedece pausa/reanudar. */
    const tell = (type, x) => { try { if (parent !== window) parent.postMessage(Object.assign({ type }, x || {}), '*'); } catch (e) {} };
    addEventListener('message', (e) => { const d = e.data; if (!d || e.source !== parent) return;
      if (d.type === 'arcade:pause') { setPause(true); if (AC) AC.suspend(); }
      else if (d.type === 'arcade:resume') { if (AC) AC.resume(); }
      else if (d.type === 'arcade:unpause') { if (k.paused) setPause(false); }
      else if (d.type === 'arcade:mute') setMute(d.on);
      else if (d.type === 'arcade:hud') { hud.classList.add('ext'); k.extHud = true; } });
    /* Mando del portal: el juego describe qué controles necesita (se colocan fuera del lienzo). */
    /* Saludo al reproductor del portal: tamaño, colores y ayuda del juego. El portal coloca el menú
       (pausa, sonido, pantalla completa) y el mando fuera del lienzo y responde con 'arcade:hud'. */
    { const C = window.CFG || {}, hi = { w, h, bg, ac: acc, hud: C.hud || '', muted, title: C.title || o.title || '', help: C.help || '' };
      if ('pad' in C) hi.pad = C.pad;
      if (C.mp) hi.mp = C.mp;
      tell('arcade:hello', hi); }
    k.hide = () => { if (k.paused) ovSaved = null; else ov.classList.add('hide'); };
    k.best = (id, score) => {
      let b = 0; try { b = +localStorage.getItem('best:' + id) || 0; if (score > b) { b = score; localStorage.setItem('best:' + id, b); } } catch (e) { b = Math.max(b, score); }
      return b;
    };
    k.rnd = (a, b) => a + Math.random() * (b - a);
    k.ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
    k.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    k.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    k.end = (id, score, head, extra) => {
      let prev = 0; try { prev = +localStorage.getItem('best:' + id) || 0; } catch (e) {}
      const best = k.best(id, score), rec = score > 0 && score > prev && prev > 0;
      tell('arcade:over', { score });
      if (rec) { k.confetti(); k.sfx('win'); }
      return k.show(head || 'Fin', `${rec ? '<b style="color:#ffd166">¡Nuevo récord!</b><br>' : ''}${extra ? extra + ' · ' : ''}Puntos: ${score} · Récord ${best}<br>Toca para jugar otra vez`);
    };
    k.rect = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    k.circle = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); };
    k.rrect = (x, y, w, h, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); };
    k.clear = (col) => { ctx.fillStyle = col || bg; ctx.fillRect(0, 0, w, h); };
    /* Máquina de estados estándar: 'ready' → 'play' → 'over'. Devuelve true si el juego está activo. */
    k.st = 'ready'; window.__k = k;
    k.gate = (reset) => { if (k.st === 'play') return true; if (k.st === 'over' && performance.now() < lockT) return false; if (k.go()) { const was = k.st; if (was === 'over') reset(); k.st = 'play'; tell(was === 'over' ? 'arcade:restart' : 'arcade:start'); k.sfx('start'); k.hide(); k.hit.clear(); for (const q of PADS) if (q) q.hit.clear(); k.ptr.hit = false; k.tap = false; if (k.ptr.down) k._skipUp = true; } return false; };
    /* Pantalla de ganador (modo tele): tarjeta y confeti del color del ganador, fanfarria; A no la salta durante 1,5 s. */
    let lockT = 0;
    k.win = (head, col, body, score) => {
      k.st = 'over'; k.cd = 0; lockT = performance.now() + 1500; tell('arcade:over', { score: score || 0 });
      k._losing = true; k.show(head, body); k._losing = false;
      ov.classList.add('win'); ov.style.setProperty('--wc', col || '#ffd166');
      k.sfx('fanfare'); k.flash('rgba(255,255,255,.45)'); k.confetti(col, 130);
      setTimeout(() => k.confetti(col, 100), 650); setTimeout(() => k.confetti(null, 100), 1300);
    };
    /* Cuenta atrás 3-2-1-¡Ya! sobre el juego (el motor espera mientras k.counting()). */
    k.cd = 0; let goT = 0;
    k.count = (n) => { k.cd = (n || 3) * 0.8; goT = 0; k.sfx('tick'); };
    k.counting = () => k.cd > 0;
    function cdTick(dt) {
      if (k.cd > 0 && k.st === 'play') { const c0 = Math.ceil(k.cd / 0.8); k.cd -= dt; const c1 = Math.ceil(k.cd / 0.8); if (k.cd <= 0) { k.cd = 0; goT = 0.7; k.sfx('go'); } else if (c1 !== c0) k.sfx('tick'); }
      else if (goT > 0) goT -= dt;
    }
    function cdDraw() {
      if (!(k.cd > 0 || goT > 0) || k.st !== 'play') return;
      const m = Math.min(w, h), n = Math.ceil(k.cd / 0.8), p = k.cd > 0 ? 1 - (k.cd % 0.8) / 0.8 : 1 - goT / 0.7;
      const s = k.cd > 0 ? 1 + Math.max(0, 1 - p * 4) * 0.7 : 1 + p * 0.5, txt = k.cd > 0 ? String(n) : '¡Ya!';
      ctx.save(); ctx.globalAlpha = k.cd > 0 ? Math.min(1, (1 - p) * 4 + 0.35) : 1 - p; ctx.translate(w / 2, h / 2); ctx.scale(s, s);
      ctx.font = `900 ${Math.round(m * (k.cd > 0 ? 0.34 : 0.24))}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = m * 0.03; ctx.strokeStyle = '#1a1530'; ctx.strokeText(txt, 0, 0); ctx.fillStyle = k.cd > 0 ? '#fff' : '#7cf7a0'; ctx.fillText(txt, 0, 0);
      ctx.restore();
    }
    k.lose = (id, score, head, extra) => { k.st = 'over'; k._losing = true; k.end(id, score, head, extra); k._losing = false; k.sfx('lose'); k.shake(7); try { rawVib && rawVib(90); } catch (e) {} };
    k.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    k.text = (s, x, y, size, color, align) => {
      ctx.fillStyle = color || '#f5f1e6'; ctx.font = `700 ${size || 18}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
      ctx.textAlign = align || 'left'; ctx.textBaseline = 'top'; ctx.fillText(s, x, y);
    };
    /* Al terminar la partida, 0,45 s sin aceptar «otra vez»: un toque que ya iba de camino no se salta la pantalla final. */
    let stSeen = k.st;
    const stWatch = () => { if (k.st !== stSeen) { if (k.st === 'over') lockT = Math.max(lockT, performance.now() + 450); stSeen = k.st; } };
    k.run = (update, draw) => {
      let last = performance.now();
      function frame(t) {
        if (k.paused && pDrawn > 1) { poll(); if (!k.ptr.hit && !k.hit.size && !PADS.some((q) => q && q.hit.size)) { last = t; k.ptr.up = false; k.swipe = null; k.tap = false; requestAnimationFrame(frame); return; } }
        pDrawn = k.paused ? pDrawn + 1 : 0;
        const dt = Math.min(0.05, (t - last) / 1000); last = t;
        poll();
        if (k.paused) { if (k.ptr.hit || k.hit.has('a') || k.hit.has('pause') || PADS.some((q) => q && q.hit.has('a'))) { setPause(false); if (k.ptr.down) k._skipUp = true; } }
        else { if (k.hit.has('pause') && k.st === 'play') setPause(true); else { stWatch(); update(dt); stWatch(); } }
        const sx = shakeA ? (Math.random() - 0.5) * shakeA * 2 : 0, sy = shakeA ? (Math.random() - 0.5) * shakeA * 2 : 0; shakeA = Math.max(0, shakeA - dt * 30);
        ctx.save(); ctx.translate(sx, sy); draw(); ctx.restore(); if (!k.paused) cdTick(dt); cdDraw(); fx(k.paused ? 0 : dt);
        k.hit.clear(); for (const q of PADS) if (q) q.hit.clear(); k.ptr.hit = false; k.ptr.up = false; k.swipe = null; k.tap = false;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    };
    return k;
  }
  window.Kit = Kit;
})();
