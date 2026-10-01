/* Lanzadera de juegos: teclado, ratón, dedo y mando.
   Sin librerías, como el resto del proyecto. */
(function () {
  'use strict';

  var rail = document.querySelector('[data-kp-rail]');
  if (!rail) { clock(); return; }

  var cells = [].slice.call(rail.querySelectorAll('.kp-cell'));
  var i = 0;

  function sel(n, scroll) {
    n = Math.max(0, Math.min(cells.length - 1, n));
    if (n === i && scroll !== true) { return; }
    i = n;
    cells.forEach(function (c, k) {
      c.classList.toggle('on', k === i);
      c.setAttribute('aria-selected', k === i ? 'true' : 'false');
    });
    var col = getComputedStyle(cells[i]).getPropertyValue('--g').trim() || '#6e62f5';
    document.querySelectorAll('.kp-bg i').forEach(function (b) { b.style.setProperty('--bg', col); });
    var a = cells[i].querySelector('.kp-card');
    if (a) { a.focus({ preventScroll: true }); }
    cells[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  function go() {
    var a = cells[i] && cells[i].querySelector('.kp-card');
    if (a) { a.click(); }
  }

  cells.forEach(function (c, k) {
    c.addEventListener('mouseenter', function () { sel(k); });
    c.addEventListener('focusin', function () { sel(k); });
  });

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown') { sel(i + 1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp') { sel(i - 1); e.preventDefault(); }
    else if (k === 'Enter' || k === ' ') { go(); e.preventDefault(); }
  });

  /* Gesto rápido con el dedo: cambia de ficha sin tener que acertarle. */
  var sx = 0, sy = 0, st = 0;
  document.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; st = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Date.now() - st > 600) { return; }
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) { sel(i + (dx < 0 ? 1 : -1)); }
    else if (Math.abs(dy) > 48) { sel(i + (dy < 0 ? 1 : -1)); }
  }, { passive: true });

  /* Mando: solo se sondea cuando hay uno conectado, para no gastar batería. */
  var pads = 0, prev = {}, raf = 0;
  function poll() {
    var gs = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var n = 0; n < gs.length; n++) {
      var g = gs[n];
      if (!g) { continue; }
      var ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      var r = ax > 0.5 || (g.buttons[15] && g.buttons[15].pressed);
      var l = ax < -0.5 || (g.buttons[14] && g.buttons[14].pressed);
      var d = ay > 0.5 || (g.buttons[13] && g.buttons[13].pressed);
      var u = ay < -0.5 || (g.buttons[12] && g.buttons[12].pressed);
      var a = (g.buttons[0] && g.buttons[0].pressed) || (g.buttons[9] && g.buttons[9].pressed);
      var p = prev[n] || (prev[n] = {});
      if ((r || d) && !p.n) { sel(i + 1); }
      if ((l || u) && !p.p) { sel(i - 1); }
      if (a && !p.a) { go(); }
      p.n = r || d; p.p = l || u; p.a = a;
    }
    raf = requestAnimationFrame(poll);
  }
  window.addEventListener('gamepadconnected', function () {
    document.body.classList.add('kp-pad');
    if (!pads++) { raf = requestAnimationFrame(poll); }
  });
  window.addEventListener('gamepaddisconnected', function () {
    if (--pads <= 0) { pads = 0; cancelAnimationFrame(raf); raf = 0; document.body.classList.remove('kp-pad'); }
  });

  function clock() {
    var el = document.querySelector('[data-kp-clock]');
    if (!el) { return; }
    function t() {
      var d = new Date();
      el.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    }
    t(); setInterval(t, 20000);
  }
  clock();
  sel(0, true);
}());
