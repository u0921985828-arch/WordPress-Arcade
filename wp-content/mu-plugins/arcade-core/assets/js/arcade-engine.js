/**
 * arcade-engine.js — zero-dependency ES module (ES2020+).
 *
 * Markup esperado (lo genera arcade-core.php):
 * <div data-arcade-game data-embed="URL" data-orientation="landscape|portrait|auto"
 *      data-aspect="16:9|4:3|1:1|fill" data-engine="phaser" data-inputs="keyboard,gamepad"
 *      data-title="Nombre" [data-keymap='{"a":{"key":"z","code":"KeyZ","keyCode":90}}']
 *      [data-sandbox="allow-scripts allow-same-origin ..."]>
 *   <button data-arcade-play>Play / Jugar</button>
 * </div>
 *
 * Pad virtual → juego:
 *  - iframe mismo origen: se despachan KeyboardEvent sintéticos dentro del iframe.
 *  - iframe cross-origin: postMessage({type:'arcade:key', event:'keydown'|'keyup', key, code, keyCode}).
 *    Puente mínimo a incluir en el juego:
 *      addEventListener('message', e => { const d = e.data;
 *        if (d?.type === 'arcade:key') dispatchEvent(new KeyboardEvent(d.event, {key:d.key, code:d.code, bubbles:true})); });
 */

const DEFAULT_KEYMAP = {
  up:    { key: 'ArrowUp',    code: 'ArrowUp',    keyCode: 38 },
  down:  { key: 'ArrowDown',  code: 'ArrowDown',  keyCode: 40 },
  left:  { key: 'ArrowLeft',  code: 'ArrowLeft',  keyCode: 37 },
  right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  a:     { key: ' ',          code: 'Space',      keyCode: 32 },
  b:     { key: 'x',          code: 'KeyX',       keyCode: 88 },
};

// Octantes de atan2 → direcciones (8 vías, diagonales incluidas).
const OCTANTS = {
  0: ['right'], 1: ['right', 'down'], 2: ['down'], 3: ['down', 'left'],
  4: ['left'], '-4': ['left'], '-3': ['left', 'up'], '-2': ['up'], '-1': ['up', 'right'],
};

const svg = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${d}</svg>`;
const PLAY_ICON = svg('<path d="M8 5v14l11-7z" fill="currentColor"/>');
const ICONS = {
  fs: svg('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  close: svg('<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
};

const mq = (q) => window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} };
const isEditable = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/* ============================================================ InputMonitor */

export class InputMonitor extends EventTarget {
  constructor() {
    super();
    this.state = { touch: false, coarse: false, fine: false, hover: false, keyboard: false, gamepad: false };
    const sig = { signal: (this._ac = new AbortController()).signal };

    this._readPointer();
    for (const q of ['(pointer: coarse)', '(any-pointer: fine)', '(hover: hover)']) {
      mq(q).addEventListener?.('change', () => this._readPointer(), sig);
    }

    // Ratón conectado a tablet/móvil: pointerType "mouse" real.
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' && !this.state.fine) this._set({ fine: true });
    }, { ...sig, passive: true });

    // Teclado físico: no hay API de presencia → heurística por keydown confiable fuera de campos de texto.
    // Los teclados virtuales solo emiten eventos dentro de inputs (y en Android suelen dar key "Unidentified").
    addEventListener('keydown', (e) => {
      if (!this.state.keyboard && e.isTrusted && e.key && e.key !== 'Unidentified' && !isEditable(e.target)) {
        this._set({ keyboard: true });
      }
    }, { ...sig, capture: true });

    addEventListener('gamepadconnected', () => this._readGamepads(), sig);
    addEventListener('gamepaddisconnected', () => this._readGamepads(), sig);
    this._readGamepads();
  }

  _readPointer() {
    const coarse = mq('(pointer: coarse)').matches;
    const fine = mq('(any-pointer: fine)').matches;
    const hover = mq('(hover: hover)').matches;
    const touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
    // Puntero fino + hover sin puntero grueso primario ⇒ escritorio ⇒ asumimos teclado.
    const keyboard = this.state.keyboard || (fine && hover && !coarse);
    this._set({ coarse, fine, hover, touch, keyboard });
  }

  _readGamepads() {
    let any = false;
    try { any = [...(navigator.getGamepads?.() || [])].some(Boolean); } catch { /* bloqueado por Permissions-Policy */ }
    this._set({ gamepad: any });
  }

  _set(patch) {
    let changed = false;
    for (const [k, v] of Object.entries(patch)) {
      if (this.state[k] !== v) { this.state[k] = v; changed = true; }
    }
    if (changed) this.dispatchEvent(new CustomEvent('change', { detail: { ...this.state } }));
  }

  /** Dispositivo exclusivamente táctil: sin puntero fino, sin teclado y sin mando. */
  get strictlyTouch() {
    const s = this.state;
    return s.touch && s.coarse && !s.fine && !s.keyboard && !s.gamepad;
  }

  get primary() { return this.state.coarse ? 'touch' : 'mouse'; }
}

export const inputMonitor = new InputMonitor();

/* ================================================================== Styles */

const CSS = `
.arcade-player{--arcade-ratio:16/9;position:relative;width:100%;max-width:1280px;margin:0 auto 1.5rem;background:#000 center/cover no-repeat;aspect-ratio:var(--arcade-ratio);overflow:hidden;border-radius:10px;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.arcade-player[data-aspect="fill"]{aspect-ratio:auto;height:100vh;height:100dvh}
.arcade-player iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000}
.arcade-play{position:absolute;inset:0;margin:auto;width:fit-content;height:fit-content;display:inline-flex;align-items:center;gap:.5em;padding:.85em 1.7em;font:700 1.1rem/1 system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.7);border:2px solid #fff;border-radius:999px;cursor:pointer}
.arcade-play:focus-visible,.arcade-bar button:focus-visible{outline:3px solid #ffd400;outline-offset:3px}
.arcade-player.is-mounted .arcade-play{display:none}
.arcade-bar{position:absolute;z-index:7;top:calc(8px + env(safe-area-inset-top,0px));right:calc(8px + env(safe-area-inset-right,0px));display:flex;gap:6px}
.arcade-bar button{display:grid;place-items:center;min-width:40px;height:40px;padding:0 10px;font:600 .85rem system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.35);border-radius:8px;cursor:pointer}
.arcade-player.is-pseudo-fs{position:fixed;inset:0;z-index:2147483000;width:100vw;height:100vh;height:100dvh;max-width:none;margin:0;border-radius:0;aspect-ratio:auto}
.arcade-player:fullscreen{width:100%;height:100%;max-width:none;border-radius:0;aspect-ratio:auto}
.arcade-player:-webkit-full-screen{width:100%;height:100%;max-width:none;border-radius:0;aspect-ratio:auto}
.arcade-rotate{position:absolute;inset:0;z-index:9;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;background:rgba(0,0,0,.94);color:#fff;font:600 1rem/1.4 system-ui,sans-serif;text-align:center}
.arcade-player.needs-rotate .arcade-rotate{display:flex}
.arcade-rotate i{width:44px;height:76px;border:4px solid currentColor;border-radius:10px;animation:arcade-rot 1.8s ease-in-out infinite}
.arcade-rotate[data-want="portrait"] i{animation-direction:reverse}
@keyframes arcade-rot{0%,25%{transform:rotate(0)}65%,100%{transform:rotate(-90deg)}}
/* Mando virtual en su propia franja, fuera del juego: abajo en vertical, a los lados en horizontal.
   El iframe se encoge y el juego se reescala dentro (sin tapar nada con los pulgares). */
.arcade-player.has-pad{--pad-h:clamp(150px,25vh,220px);--pad-w:clamp(132px,20vw,200px);--dpad:clamp(118px,30vmin,164px);--abtn:clamp(58px,15vmin,76px);background:#0b0d12}
.arcade-player.has-pad:not(.pad-side) iframe{height:calc(100% - var(--pad-h))}
.arcade-player.has-pad:not(.pad-side) .arcade-bar{top:calc(100% - var(--pad-h) + 10px);right:50%;transform:translateX(50%)}
.arcade-player.has-pad:not(.pad-side) .arcade-bar button{background:#1d2230;border-color:rgba(255,255,255,.1)}
.arcade-player.has-pad.pad-side iframe{left:var(--pad-w);width:calc(100% - 2 * var(--pad-w))}
.arcade-player.has-pad.pad-side{--dpad:min(calc(var(--pad-w) - 18px),42vh);--abtn:clamp(54px,15vh,70px)}
.arcade-pad{position:absolute;inset:auto 0 0 0;height:var(--pad-h);z-index:6;display:flex;justify-content:space-between;align-items:center;pointer-events:none;box-sizing:border-box;
  padding:0 calc(18px + env(safe-area-inset-right,0px)) env(safe-area-inset-bottom,0px) calc(18px + env(safe-area-inset-left,0px));
  background:linear-gradient(180deg,#151924,#0b0d12);border-top:1px solid rgba(255,255,255,.07)}
.pad-side .arcade-pad{inset:0;height:auto;padding:0;background:none;border:0}
.pad-side .arcade-pad>*{width:var(--pad-w);display:flex;align-items:center;justify-content:center}
.pad-side .arcade-pad::before,.pad-side .arcade-pad::after{content:"";position:absolute;top:0;bottom:0;width:var(--pad-w);background:linear-gradient(90deg,#151924,#0b0d12);z-index:-1}
.pad-side .arcade-pad::before{left:0;border-right:1px solid rgba(255,255,255,.07)}
.pad-side .arcade-pad::after{right:0;transform:scaleX(-1);border-right:1px solid rgba(255,255,255,.07)}
.arcade-dpad{position:relative;width:var(--dpad);aspect-ratio:1;flex:none;border-radius:50%;background:radial-gradient(circle,#1d2230 0 30%,#171b26 31%);border:1px solid rgba(255,255,255,.12);box-shadow:0 6px 16px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);pointer-events:auto;touch-action:none}
.pad-side .arcade-dpad{width:var(--dpad);flex:none}
.arcade-dpad span{position:absolute;width:30%;height:30%;border-radius:8px;background:#2a3040;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.arcade-dpad span::after{content:"";position:absolute;inset:0;margin:auto;width:0;height:0;border:7px solid transparent}
.arcade-dpad [data-dir=up]{top:6%;left:35%}.arcade-dpad [data-dir=down]{bottom:6%;left:35%}
.arcade-dpad [data-dir=left]{left:6%;top:35%}.arcade-dpad [data-dir=right]{right:6%;top:35%}
.arcade-dpad [data-dir=up]::after{border-bottom-color:#aab0bf;margin-top:18%}.arcade-dpad [data-dir=down]::after{border-top-color:#aab0bf;margin-bottom:18%}
.arcade-dpad [data-dir=left]::after{border-right-color:#aab0bf;margin-left:18%}.arcade-dpad [data-dir=right]::after{border-left-color:#aab0bf;margin-right:18%}
.arcade-dpad.h{aspect-ratio:auto;width:calc(var(--dpad) * 1.3);height:calc(var(--dpad) * .58);border-radius:999px;background:#171b26}
.pad-side .arcade-dpad.h{width:var(--dpad);height:calc(var(--dpad) * .62)}
.arcade-dpad.h [data-dir]{top:10%;height:80%;width:44%;border-radius:999px}
.arcade-dpad.h [data-dir=left]{left:4%}.arcade-dpad.h [data-dir=right]{right:4%;left:auto}
.arcade-dpad.h [data-dir=up],.arcade-dpad.h [data-dir=down]{display:none}
.arcade-btns{display:flex;gap:14px;align-items:flex-end;pointer-events:auto}
.pad-side .arcade-btns{flex-direction:column-reverse;align-items:center;gap:16px}
.arcade-btn{width:var(--abtn);aspect-ratio:1;flex:none;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:#2a3040;color:#e6e8ef;font:800 1.1rem system-ui,sans-serif;box-shadow:0 6px 14px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.1);touch-action:none;padding:0}
.arcade-btn.lbl{font:700 .72rem/1.1 system-ui,sans-serif}
.arcade-btn[data-btn=a]{background:#6e62f5;border-color:rgba(255,255,255,.2);color:#fff;box-shadow:0 6px 16px rgba(110,98,245,.35),inset 0 1px 0 rgba(255,255,255,.2)}
.arcade-btns.two .arcade-btn[data-btn=a]{margin-bottom:30px}
.pad-side .arcade-btns.two .arcade-btn[data-btn=a]{margin:0 0 0 22px}.pad-side .arcade-btns.two .arcade-btn[data-btn=b]{margin-right:22px}
.arcade-dpad span.on{background:#6e62f5}.arcade-btn.on{filter:brightness(1.35);transform:scale(.94)}
@media (prefers-reduced-motion:reduce){.arcade-rotate i{animation:none;transform:rotate(-90deg)}}
`;

function injectStyles() {
  if (document.getElementById('arcade-engine-css')) return;
  const s = document.createElement('style');
  s.id = 'arcade-engine-css';
  s.textContent = CSS;
  document.head.append(s);
}

/* ============================================================ ArcadePlayer */

export class ArcadePlayer {
  /** Solo un juego montado a la vez (evita fugas con 100+ embeds). */
  static active = null;

  constructor(root) {
    this.root = root;
    root.dataset.arcadeReady = '1';
    const d = root.dataset;
    this.cfg = {
      embed: d.embed,
      title: d.title || 'Game',
      orientation: d.orientation || 'auto',
      aspect: d.aspect || '16:9',
      engine: d.engine || 'canvas',
      inputs: (d.inputs || '').split(',').map((s) => s.trim()).filter(Boolean),
      sandbox: d.sandbox || null,
    };
    this.keymap = { ...DEFAULT_KEYMAP };
    try { if (d.keymap) Object.assign(this.keymap, JSON.parse(d.keymap)); } catch { /* keymap inválido: se ignora */ }

    if (this.cfg.aspect !== 'fill') root.style.setProperty('--arcade-ratio', this.cfg.aspect.replace(':', '/'));

    this.mounted = false;
    this.pressed = new Set();
    this.playBtn = root.querySelector('[data-arcade-play]') || this._makePlayButton();
    this.playBtn.addEventListener('click', () => this.mount());
  }

  _makePlayButton() {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'arcade-play';
    b.innerHTML = PLAY_ICON + 'Jugar';
    this.root.append(b);
    return b;
  }

  /* --------------------------------------------------------------- Mount */

  mount() {
    if (this.mounted || !this.cfg.embed) return;
    ArcadePlayer.active?.unmount();
    ArcadePlayer.active = this;
    this.mounted = true;
    this._ac = new AbortController();
    const sig = { signal: this._ac.signal };

    const f = (this.iframe = document.createElement('iframe'));
    f.src = this.cfg.embed;
    f.title = this.cfg.title;
    f.allow = 'fullscreen; gamepad; autoplay; screen-wake-lock';
    f.setAttribute('allowfullscreen', '');
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    if (this.cfg.sandbox) f.setAttribute('sandbox', this.cfg.sandbox);
    f.addEventListener('load', () => { try { f.contentWindow.focus(); } catch { f.focus(); } }, sig);
    this.root.append(f);

    try { this.targetOrigin = new URL(this.cfg.embed, location.href).origin; } catch { this.targetOrigin = '*'; }

    this._buildBar();
    this._buildRotatePrompt();
    this.root.classList.add('is-mounted');

    // Orientación / viewport.
    const reflow = () => this._checkOrientation();
    addEventListener('resize', reflow, { ...sig, passive: true });
    addEventListener('orientationchange', reflow, sig);
    screen.orientation?.addEventListener?.('change', reflow, sig);

    // Fullscreen.
    const fsChange = () => this._onFsChange();
    document.addEventListener('fullscreenchange', fsChange, sig);
    document.addEventListener('webkitfullscreenchange', fsChange, sig);

    // Cambios de input → mostrar/ocultar pad.
    inputMonitor.addEventListener('change', () => this._syncPad(), sig);

    // Evitar teclas "atascadas" al perder foco / cambiar de pestaña.
    addEventListener('blur', () => this._releaseAll(), sig);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this._releaseAll(); }, sig);
    addEventListener('pagehide', () => this.unmount(), sig);

    // Pausas publicitarias (Ad Placement API de AdSense, si el portal la activa).
    addEventListener('message', (e) => {
      if (!this.iframe || e.source !== this.iframe.contentWindow || !e.data) return;
      if (e.data.type === 'arcade:restart') this._adBreak('next');
      else if (e.data.type === 'arcade:pad') { this.padSpec = e.data.pad || false; this.gameAR = e.data.w / e.data.h || 0; this._dropPad(); this._syncPad(); }
    }, sig);
    // Franja del mando: abajo si el reproductor es vertical, a los lados si es horizontal.
    if (window.ResizeObserver) { this._ro = new ResizeObserver(() => this._padLayout()); this._ro.observe(this.root); }
    this._adBreak('start');

    this._syncPad();
    this._checkOrientation();

    // En móvil, el clic en Play es el gesto de usuario válido para entrar en fullscreen.
    if (inputMonitor.state.coarse) this.enterFullscreen();
  }

  unmount() {
    if (!this.mounted) return;
    this._releaseAll();
    this._ac?.abort();
    this._ro?.disconnect();
    this._dropPad();
    this.padSpec = undefined;
    this.gameAR = 0;
    if (this._isFs()) this.exitFullscreen();
    this._pseudoFs(false);
    if (this.iframe) {
      try { this.iframe.src = 'about:blank'; } catch { /* noop */ }
      this.iframe.remove();
    }
    this.pad?.remove();
    this.bar?.remove();
    this.rotate?.remove();
    this.iframe = this.pad = this.bar = this.rotate = null;
    this.root.classList.remove('is-mounted', 'needs-rotate');
    this.mounted = false;
    if (ArcadePlayer.active === this) ArcadePlayer.active = null;
    this.playBtn.focus({ preventScroll: true });
  }

  /* ----------------------------------------------------------------- UI */

  _buildBar() {
    const bar = (this.bar = document.createElement('div'));
    bar.className = 'arcade-bar';
    const mk = (label, aria, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = label;
      b.setAttribute('aria-label', aria);
      b.addEventListener('click', fn, { signal: this._ac.signal });
      bar.append(b);
      return b;
    };
    this.fsBtn = mk(ICONS.fs, 'Pantalla completa', () => (this._isFs() ? this.exitFullscreen() : this.enterFullscreen()));
    mk(ICONS.close, 'Cerrar juego', () => this.unmount());
    this.root.append(bar);
  }

  _buildRotatePrompt() {
    const r = (this.rotate = document.createElement('div'));
    r.className = 'arcade-rotate';
    r.setAttribute('role', 'status');
    r.dataset.want = this.cfg.orientation;
    const txt = this.cfg.orientation === 'portrait'
      ? 'Gira el móvil a vertical'
      : 'Gira el móvil a horizontal';
    r.innerHTML = `<i aria-hidden="true"></i><p>${txt}</p>`;
    this.root.append(r);
  }

  _checkOrientation() {
    if (!this.mounted) return;
    const want = this.cfg.orientation;
    const portrait = mq('(orientation: portrait)').matches;
    const wrong = inputMonitor.state.coarse && (
      (want === 'landscape' && portrait) || (want === 'portrait' && !portrait)
    );
    this.root.classList.toggle('needs-rotate', wrong);
    if (wrong) this._releaseAll();
  }

  /* ---------------------------------------------------------- Fullscreen */

  _isFs() {
    return this.root.classList.contains('is-pseudo-fs');
  }

  /* La pantalla completa real se pide sobre <html> y el reproductor ocupa la ventana:
     así los anuncios intersticiales (que se pintan en el documento) siguen siendo visibles. */
  async enterFullscreen() {
    this._pseudoFs(true);
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.webkitRequestFullScreen;
    if (!req) return; // iPhone: se queda en pseudo-pantalla completa
    try {
      await req.call(el, { navigationUI: 'hide' });
      this._realFs = true;
      await this._lockOrientation();
    } catch { /* rechazo → pseudo-pantalla completa */ }
  }

  async exitFullscreen() {
    try { screen.orientation?.unlock?.(); } catch { /* noop */ }
    this._realFs = false;
    this._pseudoFs(false);
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen;
    if (exit && (document.fullscreenElement || document.webkitFullscreenElement)) {
      try { await exit.call(document); } catch { /* noop */ }
    }
  }

  async _lockOrientation() {
    const want = this.cfg.orientation;
    if (want === 'auto' || !screen.orientation?.lock) return;
    try { await screen.orientation.lock(want); } catch { /* no soportado: queda el aviso CSS */ }
  }

  _pseudoFs(on) {
    this.root.classList.toggle('is-pseudo-fs', on);
    document.documentElement.style.overflow = on ? 'hidden' : '';
    if (this.fsBtn) this.fsBtn.setAttribute('aria-pressed', String(on));
    this._checkOrientation();
  }

  _onFsChange() {
    // Salida con Esc / gesto del sistema: se quita también el modo ventana.
    if (this._realFs && !(document.fullscreenElement || document.webkitFullscreenElement)) { this._realFs = false; this._pseudoFs(false); return; }
    if (this.fsBtn) this.fsBtn.setAttribute('aria-pressed', String(this._isFs()));
    this._checkOrientation();
  }

  /* ------------------------------------------------------ Publicidad */

  /** Pide una pausa publicitaria; AdSense decide si la muestra (frecuencia, relleno). */
  _adBreak(type) {
    if (typeof window.adBreak !== 'function') return;
    const say = (t) => { try { this.iframe?.contentWindow?.postMessage({ type: t }, this.targetOrigin); } catch { /* noop */ } };
    try {
      window.adBreak({
        type,
        name: 'arcade-' + type,
        beforeAd: () => { this._releaseAll(); say('arcade:pause'); },
        afterAd: () => { say('arcade:resume'); try { this.iframe?.contentWindow?.focus(); } catch { /* noop */ } },
      });
    } catch { /* noop */ }
  }

  /* -------------------------------------------------------- Virtual pad */

  /* El juego puede describir su mando con postMessage({type:'arcade:pad', pad}):
     pad = false → sin mando (tiene sus propios controles táctiles);
     pad = { d: '8'|'h'|'', a: 'Saltar', b: 'Espada', t: 1 } → cruceta de 8 vías, solo ← →, o ninguna;
     botones A/B con su rótulo (sin clave = sin botón); t = mostrarlo aunque el juego sea táctil. */
  _needsPad() {
    const s = this.padSpec;
    if (s === false || (s && !s.d && !s.a && !s.b)) return false;
    if (!inputMonitor.strictlyTouch) return false;
    if (s?.t) return true;
    const i = this.cfg.inputs;
    return !i.includes('touch') && (i.includes('keyboard') || i.includes('gamepad'));
  }

  _syncPad() {
    if (!this.mounted) return;
    const need = this._needsPad();
    if (need && !this.pad) this._buildPad();
    else if (!need && this.pad) this._dropPad();
  }

  _dropPad() {
    if (!this.pad) return;
    this._releaseAll();
    this._padAc?.abort();
    this.pad.remove();
    this.pad = null;
    this.root.classList.remove('has-pad', 'pad-side');
    this.root.style.removeProperty('--pad-w');
    this.root.style.removeProperty('--pad-h');
  }

  _padLayout() {
    if (!this.pad) return;
    const r = this.root.getBoundingClientRect(), side = r.width > r.height * 1.05, ar = this.gameAR;
    this.root.classList.toggle('pad-side', side);
    // Si el juego avisa de su proporción, la franja aprovecha justo el margen que le sobra (con un mínimo cómodo).
    const cl = (v, a, b) => Math.round(Math.max(a, Math.min(b, v)));
    this.root.style.setProperty('--pad-w', ar && side ? cl((r.width - r.height * ar) / 2, 124, 200) + 'px' : '');
    this.root.style.setProperty('--pad-h', ar && !side ? cl(r.height - r.width / ar, 150, 280) + 'px' : '');
  }

  _buildPad() {
    this._padAc = new AbortController();
    const opt = { passive: false, signal: this._padAc.signal };
    const spec = this.padSpec || { d: '8', a: 'A', b: 'B' };
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    const btn = (n) => spec[n] ? `<button type="button" class="arcade-btn${String(spec[n]).length > 1 ? ' lbl' : ''}" data-btn="${n}">${esc(spec[n])}</button>` : '';
    const two = spec.a && spec.b;
    const pad = (this.pad = document.createElement('div'));
    pad.className = 'arcade-pad';
    pad.setAttribute('aria-hidden', 'true');
    pad.innerHTML =
      '<div class="arcade-padl">' + (spec.d ? `<div class="arcade-dpad${spec.d === 'h' ? ' h' : ''}"><span data-dir="up"></span><span data-dir="down"></span><span data-dir="left"></span><span data-dir="right"></span></div>` : '') + '</div>' +
      `<div class="arcade-padr"><div class="arcade-btns${two ? ' two' : ''}">${btn('b')}${btn('a')}</div></div>`;
    this.root.append(pad);
    this.root.classList.add('has-pad');
    this._padLayout();

    // D-pad: un único dedo, 8 direcciones, zona muerta central.
    const dpad = pad.querySelector('.arcade-dpad');
    const onlyH = spec.d === 'h';
    if (dpad) {
    const arms = Object.fromEntries([...dpad.children].map((s) => [s.dataset.dir, s]));
    let tid = null;
    let dirs = new Set();
    const apply = (next) => {
      for (const d of dirs) if (!next.has(d)) { this._key(d, false); arms[d].classList.remove('on'); }
      for (const d of next) if (!dirs.has(d)) { this._key(d, true); arms[d].classList.add('on'); }
      dirs = next;
    };
    const track = (t) => {
      const r = dpad.getBoundingClientRect();
      const dx = t.clientX - (r.left + r.width / 2);
      const dy = t.clientY - (r.top + r.height / 2);
      if (onlyH) return apply(new Set(Math.abs(dx) < r.width * 0.08 ? [] : [dx < 0 ? 'left' : 'right']));
      if (Math.hypot(dx, dy) < r.width * 0.14) return apply(new Set());
      apply(new Set(OCTANTS[Math.round(Math.atan2(dy, dx) / (Math.PI / 4))]));
    };
    const find = (e) => [...e.changedTouches].find((t) => t.identifier === tid);
    dpad.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (tid !== null) return;
      const t = e.changedTouches[0];
      tid = t.identifier;
      track(t);
      navigator.vibrate?.(6);
    }, opt);
    dpad.addEventListener('touchmove', (e) => { e.preventDefault(); const t = find(e); if (t) track(t); }, opt);
    const endD = (e) => { e.preventDefault(); if (find(e)) { tid = null; apply(new Set()); } };
    dpad.addEventListener('touchend', endD, opt);
    dpad.addEventListener('touchcancel', endD, opt);
    }

    // Botones A/B: multitáctil, se liberan cuando se levanta el último dedo.
    for (const btn of pad.querySelectorAll('.arcade-btn')) {
      const name = btn.dataset.btn;
      const ids = new Set();
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const was = ids.size;
        for (const t of e.changedTouches) ids.add(t.identifier);
        if (!was) { this._key(name, true); btn.classList.add('on'); navigator.vibrate?.(8); }
      }, opt);
      const endB = (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) ids.delete(t.identifier);
        if (!ids.size) { this._key(name, false); btn.classList.remove('on'); }
      };
      btn.addEventListener('touchend', endB, opt);
      btn.addEventListener('touchcancel', endB, opt);
    }
  }

  /* ------------------------------------------------------ Key injection */

  _key(name, down) {
    const k = this.keymap[name];
    if (!k || !this.iframe) return;
    if (down) { if (this.pressed.has(name)) return; this.pressed.add(name); }
    else if (!this.pressed.delete(name)) return;

    const type = down ? 'keydown' : 'keyup';
    try {
      const w = this.iframe.contentWindow;
      const doc = w.document; // SecurityError si es cross-origin
      const target = (doc.activeElement && doc.activeElement !== doc.body) ? doc.activeElement : (doc.body || doc);
      const ev = new w.KeyboardEvent(type, { key: k.key, code: k.code, bubbles: true, cancelable: true });
      // keyCode/which para motores legacy (Construct 2, canvas antiguos).
      Object.defineProperty(ev, 'keyCode', { get: () => k.keyCode });
      Object.defineProperty(ev, 'which', { get: () => k.keyCode });
      target.dispatchEvent(ev); // burbujea a document y window
    } catch {
      this.iframe.contentWindow?.postMessage(
        { type: 'arcade:key', event: type, key: k.key, code: k.code, keyCode: k.keyCode },
        this.targetOrigin
      );
    }
  }

  _releaseAll() {
    for (const name of [...this.pressed]) this._key(name, false);
    this.pad?.querySelectorAll('.on').forEach((el) => el.classList.remove('on'));
  }
}

/* ================================================================== Boot */

export function initArcade(scope = document) {
  injectStyles();
  return [...scope.querySelectorAll('[data-arcade-game]:not([data-arcade-ready])')].map((el) => new ArcadePlayer(el));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initArcade(), { once: true });
else initArcade();

window.ArcadeEngine = { initArcade, ArcadePlayer, inputMonitor };
