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
    st.textContent = `html,body{margin:0;height:100%;background:${bg};overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;font-family:ui-rounded,"Trebuchet MS",system-ui,sans-serif;color:#f5f1e6}
canvas{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);touch-action:none}
#ov{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:16px;background:rgba(0,0,0,.5);pointer-events:none}
#ov{background:rgba(8,10,14,.72);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
#ov .card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:26px 24px 22px;min-width:min(300px,84vw);max-width:420px;border-radius:18px;background:#12151c;border:1px solid rgba(255,255,255,.09);box-shadow:0 20px 50px rgba(0,0,0,.5);animation:pop .28s cubic-bezier(.2,1.2,.4,1)}
#ov h1{margin:0;font:700 clamp(24px,6.5vmin,38px)/1.1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;letter-spacing:-.02em;color:#fff}
#ov p{margin:0;font:400 clamp(13px,3.4vmin,16px)/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#aab0bf;max-width:36ch}#ov.hide{display:none}
#ov .go{margin-top:8px;padding:12px 26px;border-radius:10px;background:#6e62f5;color:#fff;font:600 clamp(14px,3.8vmin,17px)/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 6px 18px rgba(110,98,245,.35)}
#ov .rec{font:500 12.5px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#8b91a1;padding:5px 10px;border:1px solid rgba(255,255,255,.08);border-radius:8px}
@keyframes pop{from{transform:scale(.94);opacity:0}}
#hud{position:fixed;top:max(6px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:5}
#hud button{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(10,12,16,.45);color:#fff;padding:0;opacity:.7;cursor:pointer;backdrop-filter:blur(6px)}
#hud button:hover{opacity:.9}`;
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
      const s = Math.min(innerWidth / w, innerHeight / h), dpr = devicePixelRatio || 1;
      k.scale = s;
      cv.style.width = w * s + 'px'; cv.style.height = h * s + 'px';
      cv.width = Math.round(w * s * dpr); cv.height = Math.round(h * s * dpr);
      ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
    }
    addEventListener('resize', fit); fit();

    const MAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'a', Enter: 'a', KeyZ: 'a', KeyX: 'b', ShiftLeft: 'b', ShiftRight: 'b', KeyP: 'pause', Escape: 'pause' };
    const press = (n, down) => { if (!n) return; if (down) { if (!k.held.has(n)) k.hit.add(n); k.held.add(n); } else k.held.delete(n); };
    const onKey = (e, down) => { const n = MAP[e.code]; if (n) { e.preventDefault && e.preventDefault(); press(n, down); } };
    addEventListener('keydown', (e) => onKey(e, true));
    addEventListener('keyup', (e) => onKey(e, false));
    addEventListener('message', (e) => { const d = e.data; if (d && d.type === 'arcade:key') onKey({ code: d.code }, d.event === 'keydown'); });
    addEventListener('blur', () => k.held.clear());

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
    function poll() {
      let gp = null; try { gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean); } catch (e) { /* bloqueado */ }
      if (!gp) return;
      const b = (i) => gp.buttons[i] && gp.buttons[i].pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, now = new Set();
      if (b(12) || ay < -0.5) now.add('up'); if (b(13) || ay > 0.5) now.add('down');
      if (b(14) || ax < -0.5) now.add('left'); if (b(15) || ax > 0.5) now.add('right');
      if (b(0) || b(9)) now.add('a'); if (b(1) || b(2)) now.add('b');
      for (const n of now) if (!gpPrev.has(n)) press(n, true);
      for (const n of gpPrev) if (!now.has(n)) press(n, false);
      gpPrev = now;
    }

    k.go = () => k.hit.has('a') || k.ptr.hit;
    const CFGID = (window.CFG && window.CFG.id) || o.id || o.title;
    k.show = (t, s) => {
      let body = s || '', go = 'Toca para jugar';
      const m = body.match(/<br>\s*(Toca[^<]*)$/i); if (m) { go = m[1]; body = body.slice(0, m.index); }
      const rec = k.st === 'ready' ? (() => { const b = k.best(CFGID, 0); return b ? `<div class="rec">Mejor puntuación: ${b}</div>` : ''; })() : '';
      ov.innerHTML = `<div class="card"><h1>${t}</h1>${body ? `<p>${body}</p>` : ''}${rec}<div class="go">${(g2 => g2.charAt(0).toUpperCase() + g2.slice(1))(go.replace(/^Toca para /i, ''))}</div></div>`;
      ov.classList.remove('hide');
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
    };
    let lastSfx = {};
    k.sfx = (n) => { if (muted || !SFX[n] || !ac()) return; const now = performance.now(); if (now - (lastSfx[n] || 0) < 40) return; lastSfx[n] = now; try { SFX[n](); } catch (e) {} };
    k.muted = () => muted;
    bm.addEventListener('pointerdown', (e) => { e.stopPropagation(); muted = !muted; bm.innerHTML = muted ? IC.off : IC.on; try { localStorage.setItem('arcade:mute', muted ? '1' : '0'); } catch (er) {} if (!muted) k.sfx('click'); });
    /* Las vibraciones de los juegos también suenan y sacuden la pantalla */
    const rawVib = navigator.vibrate ? navigator.vibrate.bind(navigator) : null;
    const vib = (ms) => { const d = Array.isArray(ms) ? ms[0] : ms; if (d <= 20) k.sfx('pop'); else if (d <= 45) k.sfx('coin'); else if (d <= 90) { k.sfx('hit'); k.shake(4); } else { k.sfx('hurt'); k.shake(8); k.flash('rgba(255,60,80,.35)'); } try { rawVib && rawVib(ms); } catch (e) {} return true; };
    try { Object.defineProperty(navigator, 'vibrate', { value: vib, configurable: true, writable: true }); } catch (e) {}
    /* ---------- Efectos: partículas, textos flotantes, temblor, destello ---------- */
    const parts = [], floats = []; let shakeA = 0, flashC = null, flashT = 0;
    k.burst = (x, y, col, n, spd) => { n = n || 12; spd = spd || 160; for (let i = 0; i < n && parts.length < 400; i++) { const a = Math.random() * 6.283, v = spd * (0.3 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.4, max: 0.8, col: col || '#fff', r: 1.5 + Math.random() * 2.5 }); } };
    k.float = (txt, x, y, col) => floats.push({ txt: String(txt), x, y, col: col || '#fff', t: 0.9 });
    k.shake = (a) => { shakeA = Math.max(shakeA, a || 5); };
    k.flash = (col) => { flashC = col || 'rgba(255,255,255,.5)'; flashT = 0.25; };
    k.confetti = () => { const cols = ['#f2d15c', '#ff5fa2', '#5ce1e6', '#7cf7a0', '#b98cff']; for (let i = 0; i < 70 && parts.length < 400; i++) parts.push({ x: Math.random() * w, y: -10 - Math.random() * 40, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160, life: 1.6 + Math.random(), max: 2.6, col: cols[i % 5], r: 2 + Math.random() * 3, conf: true }); };
    function fx(dt) {
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.conf) p.vx += Math.sin(p.y / 20) * 20 * dt; else { p.vx *= 1 - 2 * dt; p.vy = p.vy * (1 - 2 * dt) + 240 * dt; } p.life -= dt; }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      for (const p of parts) { ctx.globalAlpha = Math.min(1, p.life / 0.3); ctx.fillStyle = p.col; if (p.conf) ctx.fillRect(p.x, p.y, p.r * 1.6, p.r); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); } }
      ctx.globalAlpha = 1;
      for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t -= dt; f.y -= 40 * dt; if (f.t <= 0) { floats.splice(i, 1); continue; } ctx.globalAlpha = Math.min(1, f.t / 0.3); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.font = '800 18px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(f.txt, f.x, f.y); ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y); }
      ctx.globalAlpha = 1;
      if (flashT > 0) { flashT -= dt; ctx.globalAlpha = Math.max(0, flashT / 0.25); ctx.fillStyle = flashC; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
    }
    /* ---------- Pausa ---------- */
    k.paused = false;
    const setPause = (on) => { if (on && k.st !== 'play') return; k.paused = on; bp.innerHTML = on ? IC.r : IC.p; if (on) { k.sfx('click'); ov.innerHTML = '<div class="card"><h1>Pausa</h1><div class="go">Continuar</div></div>'; ov.classList.remove('hide'); } else { ov.classList.add('hide'); k.held.clear(); } };
    bp.addEventListener('pointerdown', (e) => { e.stopPropagation(); setPause(!k.paused); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });
    /* Puente con el portal: avisa de inicio/fin de partida (pausas publicitarias) y obedece pausa/reanudar. */
    const tell = (type, x) => { try { if (parent !== window) parent.postMessage(Object.assign({ type }, x || {}), '*'); } catch (e) {} };
    addEventListener('message', (e) => { const d = e.data; if (!d || e.source !== parent) return;
      if (d.type === 'arcade:pause') { setPause(true); if (AC) AC.suspend(); }
      else if (d.type === 'arcade:resume') { if (AC) AC.resume(); } });
    k.hide = () => ov.classList.add('hide');
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
    k.gate = (reset) => { if (k.st === 'play') return true; if (k.go()) { const was = k.st; if (was === 'over') reset(); k.st = 'play'; tell(was === 'over' ? 'arcade:restart' : 'arcade:start'); k.sfx('start'); k.hide(); k.hit.clear(); k.ptr.hit = false; k.tap = false; if (k.ptr.down) k._skipUp = true; } return false; };
    k.lose = (id, score, head, extra) => { k.st = 'over'; k._losing = true; k.end(id, score, head, extra); k._losing = false; k.sfx('lose'); k.shake(7); try { rawVib && rawVib(90); } catch (e) {} };
    k.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    k.text = (s, x, y, size, color, align) => {
      ctx.fillStyle = color || '#f5f1e6'; ctx.font = `700 ${size || 18}px ui-rounded,"Trebuchet MS",system-ui,sans-serif`;
      ctx.textAlign = align || 'left'; ctx.textBaseline = 'top'; ctx.fillText(s, x, y);
    };
    k.run = (update, draw) => {
      let last = performance.now();
      function frame(t) {
        const dt = Math.min(0.05, (t - last) / 1000); last = t;
        poll();
        if (k.paused) { if (k.ptr.hit || k.hit.has('a') || k.hit.has('pause')) { setPause(false); if (k.ptr.down) k._skipUp = true; } }
        else { if (k.hit.has('pause') && k.st === 'play') setPause(true); else update(dt); }
        const sx = shakeA ? (Math.random() - 0.5) * shakeA * 2 : 0, sy = shakeA ? (Math.random() - 0.5) * shakeA * 2 : 0; shakeA = Math.max(0, shakeA - dt * 30);
        ctx.save(); ctx.translate(sx, sy); draw(); ctx.restore(); fx(k.paused ? 0 : dt);
        k.hit.clear(); k.ptr.hit = false; k.ptr.up = false; k.swipe = null; k.tap = false;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    };
    return k;
  }
  window.Kit = Kit;
})();
