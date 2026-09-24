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
  menu: svg('<path d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z" fill="currentColor"/>'),
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
.arcade-player{--g-bg:#12151c;--g-ac:#6e62f5;--g-ink:#1a1530;--g-face:color-mix(in srgb,var(--g-bg) 74%,#fff 16%);--g-dark:color-mix(in srgb,var(--g-bg) 70%,#000);--g-font:ui-rounded,"Trebuchet MS",system-ui,sans-serif;--arcade-ratio:16/9;position:relative;width:100%;max-width:1280px;margin:0 auto 1.5rem;background:#000 center/cover no-repeat;aspect-ratio:var(--arcade-ratio);overflow:hidden;border-radius:10px;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.arcade-player[data-aspect="fill"]{aspect-ratio:auto;height:100vh;height:100dvh}
.arcade-player iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000}
.arcade-play{position:absolute;inset:0;margin:auto;width:fit-content;height:fit-content;display:inline-flex;align-items:center;gap:.5em;padding:.85em 1.7em;font:700 1.1rem/1 system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.7);border:2px solid #fff;border-radius:999px;cursor:pointer}
.arcade-play:focus-visible,.arcade-bar button:focus-visible{outline:3px solid #ffd400;outline-offset:3px}
.arcade-player.is-mounted .arcade-play{display:none}
.arcade-bar{position:absolute;z-index:7;top:calc(8px + env(safe-area-inset-top,0px));right:calc(8px + env(safe-area-inset-right,0px));display:flex;gap:6px}
.arcade-bar button{display:grid;place-items:center;min-width:44px;height:44px;padding:0 10px;font:800 .85rem var(--g-font);color:#fff;background:var(--g-face);border:2px solid var(--g-ink);border-radius:13px;cursor:pointer;box-shadow:inset 0 2px 0 rgba(255,255,255,.2),0 4px 0 var(--g-ink);transition:transform .06s,box-shadow .06s}
.arcade-bar button:active{transform:translateY(3px);box-shadow:inset 0 2px 0 rgba(255,255,255,.2),0 1px 0 var(--g-ink)}
.arcade-bar.over button{min-width:38px;height:38px;border-radius:11px;opacity:.82}
.arcade-player.is-pseudo-fs{position:fixed;inset:0;z-index:2147483000;width:100vw;height:100vh;height:100dvh;max-width:none;margin:0;border-radius:0;aspect-ratio:auto}
.arcade-player:fullscreen{width:100%;height:100%;max-width:none;border-radius:0;aspect-ratio:auto}
.arcade-player:-webkit-full-screen{width:100%;height:100%;max-width:none;border-radius:0;aspect-ratio:auto}
.arcade-rotate{position:absolute;inset:0;z-index:9;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;background:var(--g-dark);color:#fff;font:600 1rem/1.4 system-ui,sans-serif;text-align:center}
.arcade-player.needs-rotate .arcade-rotate{display:flex}
.arcade-rotate i{width:44px;height:76px;border:4px solid currentColor;box-shadow:0 4px 0 var(--g-ink);border-radius:10px;animation:arcade-rot 1.8s ease-in-out infinite}
.arcade-rotate[data-want="portrait"] i{animation-direction:reverse}
@keyframes arcade-rot{0%,25%{transform:rotate(0)}65%,100%{transform:rotate(-90deg)}}
/* Mando virtual en su propia franja, fuera del juego: abajo en vertical, a los lados en horizontal.
   El iframe se encoge y el juego se reescala dentro (sin tapar nada con los pulgares). */
.arcade-player.has-pad{--pad-h:clamp(190px,27vh,240px);--pad-w:clamp(132px,20vw,200px);--stick:clamp(120px,32vmin,168px);--abtn:clamp(74px,20vmin,96px);background:var(--g-dark)}
.arcade-player.has-pad:not(.pad-side) iframe{height:calc(100% - var(--pad-h))}
.arcade-player.has-pad:not(.pad-side) .arcade-bar{top:auto;bottom:calc(6px + env(safe-area-inset-bottom,0px));right:50%;transform:translateX(50%)}
.arcade-player.has-pad:not(.pad-side) .arcade-bar button{min-width:40px;height:34px;border-radius:11px}
.arcade-player.has-pad.pad-side iframe{left:var(--pad-w);width:calc(100% - 2 * var(--pad-w))}
.arcade-player.has-pad.pad-side{--stick:min(calc(var(--pad-w) - 14px),44vh);--abtn:clamp(66px,19vh,86px)}
.arcade-pad{position:absolute;inset:auto 0 0 0;height:var(--pad-h);z-index:6;display:flex;box-sizing:border-box;
  padding:0 env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);
  background:linear-gradient(180deg,color-mix(in srgb,var(--g-bg) 80%,#fff 7%),var(--g-dark));border-top:3px solid var(--g-ink);box-shadow:inset 0 2px 0 rgba(255,255,255,.08)}
.pad-side .arcade-pad{inset:0;height:auto;padding:0;background:none;border:0;justify-content:space-between;pointer-events:none}
/* Zonas táctiles amplias: toda la mitad izquierda es joystick y toda la derecha son botones (gana el más cercano). */
.arcade-padl,.arcade-padr{position:relative;flex:1;min-width:0;touch-action:none;pointer-events:auto}
.arcade-padl:empty{display:none}
.pad-side .arcade-padl,.pad-side .arcade-padr{flex:none;width:var(--pad-w);height:100%;background:linear-gradient(90deg,color-mix(in srgb,var(--g-bg) 80%,#fff 7%),var(--g-dark))}
.pad-side .arcade-padl{border-right:3px solid var(--g-ink)}
.pad-side .arcade-padr{background:linear-gradient(270deg,color-mix(in srgb,var(--g-bg) 80%,#fff 7%),var(--g-dark));border-left:3px solid var(--g-ink)}
.pad-side .arcade-padl:empty{display:block}
.arcade-stick{position:absolute;left:50%;top:50%;width:var(--stick);height:var(--stick);margin:calc(var(--stick) / -2) 0 0 calc(var(--stick) / -2);border-radius:50%;
  background:radial-gradient(circle,rgba(0,0,0,.18) 0 40%,rgba(255,255,255,.06) 41%);border:3px solid var(--g-ink);box-shadow:inset 0 0 0 2px rgba(255,255,255,.12);opacity:.6;transition:opacity .15s;pointer-events:none}
.arcade-stick.h{height:calc(var(--stick) * .5);margin-top:calc(var(--stick) / -4);border-radius:999px}
.arcade-stick.live{opacity:1;transition:none}
.arcade-stick:not(.h)::before,.arcade-stick:not(.h)::after{display:none}
.arcade-stick::before,.arcade-stick::after{content:"";position:absolute;top:50%;margin-top:-6px;border:6px solid transparent}
.arcade-stick::before{left:7px;border-right-color:rgba(255,255,255,.35)}.arcade-stick::after{right:7px;border-left-color:rgba(255,255,255,.35)}
.arcade-knob{position:absolute;left:50%;top:50%;width:44%;height:44%;margin:-22% 0 0 -22%;border-radius:50%;background:var(--g-face);border:3px solid var(--g-ink);box-shadow:inset 0 3px 0 rgba(255,255,255,.22),0 4px 0 var(--g-ink)}
.arcade-stick.h .arcade-knob{position:absolute;left:50%;top:50%;width:44%;height:44%;margin:-22% 0 0 -22%;border-radius:50%;background:var(--g-face);border:3px solid var(--g-ink);box-shadow:inset 0 3px 0 rgba(255,255,255,.22),0 4px 0 var(--g-ink)}
.arcade-stick.live .arcade-knob{position:absolute;left:50%;top:50%;width:44%;height:44%;margin:-22% 0 0 -22%;border-radius:50%;background:var(--g-face);border:3px solid var(--g-ink);box-shadow:inset 0 3px 0 rgba(255,255,255,.22),0 4px 0 var(--g-ink)}
.arcade-btns{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:18px;pointer-events:none}
.arcade-btns.two{justify-content:flex-end;padding-right:22px}
.arcade-padl:empty+.arcade-padr .arcade-btns.two{justify-content:center;padding:0}
.pad-side .arcade-btns{flex-direction:column-reverse;justify-content:center;padding:0}
.arcade-btn{width:var(--abtn);height:var(--abtn);flex:none;border-radius:50%;border:3px solid var(--g-ink);background:var(--g-face);color:#fff;font:900 1.25rem var(--g-font);text-shadow:0 2px 0 rgba(26,21,48,.6);box-shadow:inset 0 3px 0 rgba(255,255,255,.22),0 6px 0 var(--g-ink);padding:0;pointer-events:none;transition:transform .05s,box-shadow .05s}
.arcade-btn.lbl{font:800 .85rem/1.1 var(--g-font)}
.arcade-btn[data-btn=a]{background:var(--g-ac)}
.arcade-btns.two .arcade-btn[data-btn=a]{background:var(--g-ac)}
.pad-side .arcade-btns.two .arcade-btn[data-btn=a]{background:var(--g-ac)}
.arcade-btn.on{transform:translateY(5px);box-shadow:inset 0 3px 0 rgba(255,255,255,.22),0 1px 0 var(--g-ink);filter:brightness(1.12)}
/* Menú del juego (pausa): mismo estilo que las pantallas de los juegos. */
.arcade-menu{position:absolute;inset:0;z-index:10;display:none;place-items:center;padding:12px;background:color-mix(in srgb,var(--g-bg) 55%,rgba(0,0,0,.55));-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.arcade-menu.open{display:grid}
.arcade-mcard{box-sizing:border-box;width:min(340px,100%);max-height:100%;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:22px 20px 24px;text-align:center;color:#fff;font-family:var(--g-font);border-radius:20px;
  background:linear-gradient(180deg,color-mix(in srgb,var(--g-bg) 82%,#fff 12%),color-mix(in srgb,var(--g-bg) 92%,#000));border:3px solid var(--g-ink);box-shadow:inset 0 2px 0 rgba(255,255,255,.14),0 7px 0 var(--g-ink),0 18px 40px rgba(0,0,0,.45);animation:arcade-pop .22s cubic-bezier(.2,1.2,.4,1)}
.arcade-mcard h2{margin:0 0 2px;font:900 clamp(22px,6vmin,30px)/1.1 var(--g-font);text-shadow:0 3px 0 var(--g-ink)}
.arcade-mcard p{margin:0 0 6px;font:600 13.5px/1.45 var(--g-font);color:color-mix(in srgb,#fff 78%,var(--g-ac))}
.arcade-mcard button{padding:12px 16px;border-radius:14px;border:3px solid var(--g-ink);background:var(--g-face);color:#fff;font:800 1rem var(--g-font);cursor:pointer;box-shadow:inset 0 2px 0 rgba(255,255,255,.2),0 4px 0 var(--g-ink);text-shadow:0 2px 0 rgba(26,21,48,.5)}
.arcade-mcard button.pri{background:var(--g-ac);font-size:1.1rem}
.arcade-mcard button:active{transform:translateY(3px);box-shadow:inset 0 2px 0 rgba(255,255,255,.2),0 1px 0 var(--g-ink)}
.arcade-mcard button:focus-visible{outline:3px solid #ffd400;outline-offset:2px}
@media (max-height:460px){.arcade-mcard p{display:none}.arcade-mcard{gap:8px;padding:16px 18px 18px}.arcade-mcard button{padding:9px 14px}}
@keyframes arcade-pop{from{transform:scale(.92);opacity:0}}
@media (prefers-reduced-motion:reduce){.arcade-mcard{animation:none}}
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
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.menu?.classList.contains('open')) this._closeMenu(); }, sig);

    // Pausas publicitarias (Ad Placement API de AdSense, si el portal la activa).
    addEventListener('message', (e) => {
      if (!this.iframe || e.source !== this.iframe.contentWindow || !e.data) return;
      if (e.data.type === 'arcade:restart') this._adBreak('next');
      else if (e.data.type === 'arcade:hello') this._hello(e.data);
      else if (e.data.type === 'arcade:pad') { this.padSpec = e.data.pad || false; this.gameAR = e.data.w / e.data.h || 0; this._dropPad(); this._syncPad(); }
    }, sig);
    // Franja del mando: abajo si el reproductor es vertical, a los lados si es horizontal.
    if (window.ResizeObserver) { this._ro = new ResizeObserver(() => { this._padLayout(); this._placeUI(); }); this._ro.observe(this.root); }
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
    this.menu?.remove();
    this.menu = this.game = null;
    this.root.style.removeProperty('--g-bg');
    this.root.style.removeProperty('--g-ac');
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

  _say(type, extra) {
    try { this.iframe?.contentWindow?.postMessage({ type, ...extra }, this.targetOrigin); } catch { /* noop */ }
  }

  /* Juego propio (kit.js) presentado: el portal se encarga del menú (pausa, sonido, pantalla completa, salir)
     con los colores del juego y lo coloca fuera del lienzo o donde el juego deja hueco. */
  _hello(d) {
    const w = +d.w, h = +d.h;
    if (!(w > 0 && h > 0)) return;
    this.game = { w, h, hud: String(d.hud || ''), muted: !!d.muted, title: String(d.title || this.cfg.title), help: String(d.help || '') };
    const col = (c, def) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : def);
    this.root.style.setProperty('--g-bg', col(d.bg, '#12151c'));
    this.root.style.setProperty('--g-ac', col(d.ac, '#6e62f5'));
    this.gameAR = w / h;
    if ('pad' in d) this.padSpec = d.pad || false;
    this._say('arcade:hud');
    this._buildMenu();
    this._dropPad();
    this._syncPad();
    this._placeUI();
  }

  _buildMenu() {
    const sig = { signal: this._ac.signal };
    this.bar.innerHTML = '';
    this.bar.className = 'arcade-bar is-menu';
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = ICONS.menu;
    b.setAttribute('aria-label', 'Menú y pausa');
    b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', () => this._openMenu(), sig);
    this.bar.append(b);
    this.fsBtn = null;

    const m = (this.menu = document.createElement('div'));
    m.className = 'arcade-menu';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-label', 'Menú del juego');
    const esc = (t) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    m.innerHTML = `<div class="arcade-mcard"><h2>${esc(this.game.title)}</h2>${this.game.help ? `<p>${esc(this.game.help)}</p>` : ''}` +
      '<button type="button" class="pri" data-m="go">Continuar</button><button type="button" data-m="snd"></button>' +
      '<button type="button" data-m="fs"></button><button type="button" data-m="exit">Salir del juego</button></div>';
    m.addEventListener('click', (e) => {
      const act = e.target.closest('[data-m]')?.dataset.m;
      if (!act) { if (e.target === m) this._closeMenu(); return; }
      if (act === 'go') this._closeMenu();
      else if (act === 'snd') { this.game.muted = !this.game.muted; this._say('arcade:mute', { on: this.game.muted }); this._menuLabels(); }
      else if (act === 'fs') { this._isFs() ? this.exitFullscreen() : this.enterFullscreen(); setTimeout(() => this._menuLabels(), 50); }
      else if (act === 'exit') this.unmount();
    }, sig);
    m.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); this._closeMenu(); } }, sig);
    this.root.append(m);
  }

  _menuLabels() {
    if (!this.menu) return;
    this.menu.querySelector('[data-m=snd]').textContent = this.game.muted ? 'Sonido: no' : 'Sonido: sí';
    this.menu.querySelector('[data-m=fs]').textContent = this._isFs() ? 'Salir de pantalla completa' : 'Pantalla completa';
  }

  _openMenu() {
    if (!this.menu) return;
    this._releaseAll();
    this._say('arcade:pause');
    this._menuLabels();
    this.menu.classList.add('open');
    this.menu.querySelector('[data-m=go]').focus({ preventScroll: true });
  }

  _closeMenu() {
    if (!this.menu?.classList.contains('open')) return;
    this.menu.classList.remove('open');
    this._say('arcade:resume');
    this._say('arcade:unpause');
    try { this.iframe?.contentWindow?.focus(); } catch { /* noop */ }
  }

  /* Botón de menú: en la franja del mando si la hay; si no, en el margen que deja el juego (arriba o a un lado);
     y si el juego ocupa toda la pantalla, en el hueco que el juego reserva (arriba al centro o CFG.hud). */
  _placeUI() {
    const b = this.bar, g = this.game;
    if (!b || !g) return;
    b.removeAttribute('style');
    b.classList.remove('over');
    if (this.pad) return; // lo coloca el CSS de la franja
    const f = (this.iframe || this.root).getBoundingClientRect();
    const s = Math.min(f.width / g.w, f.height / g.h), top = (f.height - g.h * s) / 2, side = (f.width - g.w * s) / 2, B = 46;
    const px = (v) => Math.max(4, Math.round(v)) + 'px';
    if (top >= B + 8) Object.assign(b.style, { top: px((top - B) / 2), right: '12px' });
    else if (side >= B + 8) Object.assign(b.style, { top: '12px', right: px((side - B) / 2) });
    else {
      b.classList.add('over');
      const hp = g.hud, safeT = 'calc(6px + env(safe-area-inset-top,0px))', safeB = 'calc(6px + env(safe-area-inset-bottom,0px))';
      if (!hp) Object.assign(b.style, { top: safeT, right: '50%', transform: 'translateX(50%)' });
      else Object.assign(b.style, {
        top: hp.includes('b') ? 'auto' : safeT, bottom: hp.includes('b') ? safeB : 'auto',
        left: hp.includes('l') ? '8px' : 'auto', right: hp.includes('r') ? '8px' : 'auto',
      });
    }
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
    this._stickReset = this._btnsReset = null;
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
    this.root.style.setProperty('--pad-h', ar && !side ? cl(r.height - r.width / ar, 190, 280) + 'px' : '');
  }

  _buildPad() {
    this._padAc = new AbortController();
    const opt = { passive: false, signal: this._padAc.signal };
    const spec = this.padSpec || { d: '8', a: 'A', b: 'B' };
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    const btn = (n) => spec[n] ? `<button type="button" tabindex="-1" class="arcade-btn${String(spec[n]).length > 1 ? ' lbl' : ''}" data-btn="${n}">${esc(spec[n])}</button>` : '';
    const onlyH = spec.d === 'h';
    const pad = (this.pad = document.createElement('div'));
    pad.className = 'arcade-pad';
    pad.setAttribute('aria-hidden', 'true');
    pad.innerHTML =
      '<div class="arcade-padl">' + (spec.d ? `<div class="arcade-stick${onlyH ? ' h' : ''}"><i class="arcade-knob"></i></div>` : '') + '</div>' +
      `<div class="arcade-padr"><div class="arcade-btns${spec.a && spec.b ? ' two' : ''}">${btn('b')}${btn('a')}</div></div>`;
    this.root.append(pad);
    this.root.classList.add('has-pad');
    this._padLayout();

    // Joystick flotante: aparece donde apoyas el pulgar (en toda la zona izquierda) y la base
    // te sigue si arrastras más allá del borde, así no hace falta mirar dónde está.
    const zl = pad.querySelector('.arcade-padl'), stick = zl.querySelector('.arcade-stick');
    if (stick) {
      const knob = stick.firstElementChild;
      let tid = null, cx = 0, cy = 0, dirs = new Set();
      const apply = (next) => {
        for (const d of dirs) if (!next.has(d)) this._key(d, false);
        for (const d of next) if (!dirs.has(d)) this._key(d, true);
        if (next.size && !dirs.size) navigator.vibrate?.(5);
        dirs = next;
      };
      const place = (x, y) => {
        const z = zl.getBoundingClientRect(), r = stick.offsetWidth / 2, rh = stick.offsetHeight / 2;
        cx = Math.max(z.left + r * 0.6, Math.min(z.right - r * 0.6, x));
        cy = Math.max(z.top + rh * 0.6, Math.min(z.bottom - rh * 0.6, y));
        stick.style.left = cx - z.left + 'px'; stick.style.top = cy - z.top + 'px';
      };
      const track = (t) => {
        const R = stick.offsetWidth * 0.36;
        let dx = t.clientX - cx, dy = onlyH ? 0 : t.clientY - cy;
        const m = Math.hypot(dx, dy);
        if (m > R * 1.25) { // la base sigue al dedo
          const z = zl.getBoundingClientRect(), k = (m - R * 1.25) / m;
          cx += dx * k; cy += dy * k;
          stick.style.left = cx - z.left + 'px'; stick.style.top = cy - z.top + 'px';
          dx = t.clientX - cx; dy = onlyH ? 0 : t.clientY - cy;
        }
        const d = Math.hypot(dx, dy), s = d > R ? R / d : 1;
        knob.style.transform = `translate(${dx * s}px,${dy * s}px)`;
        if (d < R * 0.3) return apply(new Set());
        if (onlyH) return apply(new Set([dx < 0 ? 'left' : 'right']));
        apply(new Set(OCTANTS[Math.round(Math.atan2(dy, dx) / (Math.PI / 4))]));
      };
      const reset = () => {
        tid = null; apply(new Set());
        stick.classList.remove('live'); knob.style.transform = '';
        stick.style.left = stick.style.top = '';
      };
      const find = (e) => [...e.changedTouches].find((t) => t.identifier === tid);
      zl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (tid !== null) return;
        const t = e.changedTouches[0];
        tid = t.identifier;
        stick.classList.add('live');
        place(t.clientX, t.clientY);
        track(t);
      }, opt);
      zl.addEventListener('touchmove', (e) => { e.preventDefault(); const t = find(e); if (t) track(t); }, opt);
      const end = (e) => { e.preventDefault(); if (find(e)) reset(); };
      zl.addEventListener('touchend', end, opt);
      zl.addEventListener('touchcancel', end, opt);
      this._stickReset = reset;
    }

    // Botones: toda la zona derecha es táctil; cada dedo pulsa el botón más cercano
    // y puede deslizarse de uno a otro (saltar y atacar sin levantar el pulgar).
    const zr = pad.querySelector('.arcade-padr'), btns = [...zr.querySelectorAll('.arcade-btn')];
    if (btns.length) {
      const owner = new Map(); // touch id → botón
      const count = new Map(btns.map((b) => [b, 0]));
      const nearest = (t) => {
        let best = null, bd = Infinity;
        for (const b of btns) {
          const r = b.getBoundingClientRect(), d = Math.hypot(t.clientX - (r.left + r.width / 2), t.clientY - (r.top + r.height / 2));
          if (d < bd) { bd = d; best = b; }
        }
        return best;
      };
      const press = (b, on) => {
        const n = count.get(b) + (on ? 1 : -1);
        count.set(b, Math.max(0, n));
        if (on && n === 1) { this._key(b.dataset.btn, true); b.classList.add('on'); navigator.vibrate?.(8); }
        if (!on && n <= 0) { this._key(b.dataset.btn, false); b.classList.remove('on'); }
      };
      const set = (t) => {
        const was = owner.get(t.identifier), now = nearest(t);
        if (was === now) return;
        if (was) press(was, false);
        owner.set(t.identifier, now); press(now, true);
      };
      // Sin joystick, la columna izquierda también pulsa (p. ej. «Subir» con cualquier pulgar).
      for (const z of stick ? [zr] : [zr, zl]) {
      z.addEventListener('touchstart', (e) => { e.preventDefault(); for (const t of e.changedTouches) set(t); }, opt);
      z.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (owner.has(t.identifier)) set(t); }, opt);
      const end = (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) { const b = owner.get(t.identifier); if (b) { owner.delete(t.identifier); press(b, false); } }
      };
      z.addEventListener('touchend', end, opt);
      z.addEventListener('touchcancel', end, opt);
      }
      this._btnsReset = () => { owner.clear(); for (const b of btns) count.set(b, 0); };
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
    this._btnsReset?.();
    if (this.pad) this._stickReset?.();
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
