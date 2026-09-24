/* Arcade — modo tele (/tele/). Crea la sala, muestra código + QR, acepta hasta 4 mandos por WebRTC
 * (WordPress solo hace de señalización), muestra la rejilla de juegos y reenvía las pulsaciones al juego.
 * Sintaxis ES2017 sin encadenamiento opcional: navegadores de Smart TV antiguos. */
(function () {
  'use strict';
  var C = window.PARTY || {};
  var COLORS = C.colors || ['#ff5a5f', '#3fb6ea', '#ffd166', '#5fbf45'];
  var KEYS = ['up', 'down', 'left', 'right', 'a', 'b'];
  var LOBBY_PAD = { d: '8', a: 'Elegir', b: 'Atrás' };
  var DEFAULT_PAD = { d: '8', a: 'A', b: 'B' };
  var MENU_PAD = { d: '8', a: 'OK', b: 'Seguir' };

  /* =============================================================== QR (byte, M) */
  // Generador propio: modo byte, corrección M, versiones 1–10 (hasta 213 bytes), máscara con menor penalización.
  var QR = (function () {
    // [códigos EC por bloque, bloques grupo 1, datos g1, bloques grupo 2, datos g2]
    var EC = [null, [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
      [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
    var ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
    function mul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 255; }
    function divisor(deg) {
      var r = []; for (var i = 0; i < deg; i++) r.push(0); r[deg - 1] = 1; var root = 1;
      for (i = 0; i < deg; i++) { for (var j = 0; j < deg; j++) { r[j] = mul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; } root = mul(root, 2); }
      return r;
    }
    function remainder(data, div) {
      var r = div.map(function () { return 0; });
      data.forEach(function (b) { var f = b ^ r.shift(); r.push(0); div.forEach(function (c, i) { r[i] ^= mul(c, f); }); });
      return r;
    }
    function utf8(s) { var u = unescape(encodeURIComponent(s)), a = []; for (var i = 0; i < u.length; i++) a.push(u.charCodeAt(i)); return a; }

    function make(text) {
      var bytes = utf8(text), ver = 1, e;
      for (; ver <= 10; ver++) { e = EC[ver]; if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= (e[1] * e[2] + e[3] * e[4]) * 8) break; }
      if (ver > 10) throw new Error('QR: texto demasiado largo');
      var cap = (e[1] * e[2] + e[3] * e[4]) * 8, bits = [];
      function put(v, n) { for (var i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); }
      put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(function (b) { put(b, 8); });
      put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
      for (var pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
      var data = []; for (var i = 0; i < bits.length; i += 8) { var v = 0; for (var j = 0; j < 8; j++) v = (v << 1) | bits[i + j]; data.push(v); }
      // Bloques + corrección + entrelazado
      var div = divisor(e[0]), blocks = [], k = 0, nb = e[1] + e[3];
      for (i = 0; i < nb; i++) { var len = i < e[1] ? e[2] : e[4], d = data.slice(k, k + len); k += len; blocks.push({ d: d, c: remainder(d, div) }); }
      var out = [], maxd = Math.max(e[2], e[4]);
      for (i = 0; i < maxd; i++) blocks.forEach(function (b) { if (i < b.d.length) out.push(b.d[i]); });
      for (i = 0; i < e[0]; i++) blocks.forEach(function (b) { out.push(b.c[i]); });

      var size = ver * 4 + 17, M = [], F = [];
      for (i = 0; i < size; i++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
      function fn(x, y, dark) { M[y][x] = dark; F[y][x] = true; }
      for (i = 0; i < size; i++) { fn(6, i, i % 2 === 0); fn(i, 6, i % 2 === 0); }
      function finder(cx, cy) {
        for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
          var x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
          if (x >= 0 && x < size && y >= 0 && y < size) fn(x, y, d !== 2 && d !== 4);
        }
      }
      finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
      var al = ALIGN[ver];
      al.forEach(function (ax, ia) {
        al.forEach(function (ay, ib) {
          if ((ia === 0 && ib === 0) || (ia === 0 && ib === al.length - 1) || (ia === al.length - 1 && ib === 0)) return;
          for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) fn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        });
      });
      function format(mask) {
        var d = (0 << 3) | mask, r = d; // nivel M = 00
        for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
        var b = ((d << 10) | r) ^ 0x5412, bit = function (n) { return ((b >>> n) & 1) !== 0; };
        for (i = 0; i <= 5; i++) fn(8, i, bit(i));
        fn(8, 7, bit(6)); fn(8, 8, bit(7)); fn(7, 8, bit(8));
        for (i = 9; i < 15; i++) fn(14 - i, 8, bit(i));
        for (i = 0; i < 8; i++) fn(size - 1 - i, 8, bit(i));
        for (i = 8; i < 15; i++) fn(8, size - 15 + i, bit(i));
        fn(8, size - 8, true);
      }
      format(0); // reserva
      if (ver >= 7) {
        var r = ver; for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
        var vb = (ver << 12) | r;
        for (i = 0; i < 18; i++) { var bt = ((vb >>> i) & 1) !== 0, a = size - 11 + (i % 3), c = Math.floor(i / 3); fn(a, c, bt); fn(c, a, bt); }
      }
      // Datos en zigzag
      var bi = 0;
      for (var right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (var vert = 0; vert < size; vert++) for (j = 0; j < 2; j++) {
          var x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
          if (!F[y][x] && bi < out.length * 8) { M[y][x] = ((out[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0; bi++; }
        }
      }
      var MASKS = [
        function (x, y) { return (x + y) % 2 === 0; }, function (x, y) { return y % 2 === 0; },
        function (x) { return x % 3 === 0; }, function (x, y) { return (x + y) % 3 === 0; },
        function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
        function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; },
        function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; },
        function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }];
      function apply(m) { for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (!F[y][x] && MASKS[m](x, y)) M[y][x] = !M[y][x]; }
      function penalty() {
        var p = 0, dark = 0, x, y;
        for (var t = 0; t < 2; t++) for (var a = 0; a < size; a++) {
          var run = 1, line = [];
          for (var b = 0; b < size; b++) line.push(t ? M[b][a] : M[a][b]);
          for (b = 1; b <= size; b++) {
            if (b < size && line[b] === line[b - 1]) run++;
            else { if (run >= 5) p += run - 2; run = 1; }
          }
          var s = line.map(function (v) { return v ? '1' : '0'; }).join('');
          var re = /(?=(10111010000|00001011101))/g, mm;
          while ((mm = re.exec(s))) { p += 40; re.lastIndex++; }
        }
        for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) { var c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
        for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (M[y][x]) dark++;
        return p + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
      }
      var best = 0, bp = Infinity;
      for (var m = 0; m < 8; m++) { apply(m); format(m); var pp = penalty(); if (pp < bp) { bp = pp; best = m; } apply(m); }
      apply(best); format(best);
      return { size: size, mod: M, ver: ver };
    }

    function svg(text) {
      var q = make(text), n = q.size + 8, d = '';
      for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++) if (q.mod[y][x]) d += 'M' + (x + 4) + ' ' + (y + 4) + 'h1v1h-1z';
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" role="img" aria-label="Código QR">' +
        '<rect width="' + n + '" height="' + n + '" fill="#fff"/><path d="' + d + '" fill="#0b0d12"/></svg>';
    }
    return { make: make, svg: svg };
  })();
  window.ArcadeQR = QR;

  /* ============================================================= Utilidades */
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } return null; }
  function api(path, opt) {
    opt = opt || {};
    var init = { method: opt.method || 'GET', headers: {}, cache: 'no-store', credentials: 'omit' };
    if (opt.body) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opt.body); }
    if (opt.keepalive) init.keepalive = true;
    // Con enlaces permanentes simples la API es ?rest_route=…: la consulta se añade con &.
    if (C.api.indexOf('?') >= 0) path = path.replace('?', '&');
    return fetch(C.api + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j = j || {}; j._status = r.status; return j; });
    });
  }
  function gathered(pc, ms) {
    return new Promise(function (res) {
      if (pc.iceGatheringState === 'complete') return res();
      var t = setTimeout(res, ms);
      pc.addEventListener('icegatheringstatechange', function () { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
    });
  }
  var ICO = {
    tv: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    pad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10a5 5 0 0 1 4.9 6l-.8 4a2.6 2.6 0 0 1-4.5 1.1L14.5 16h-5l-2.1 2.1A2.6 2.6 0 0 1 2.9 17l-.8-4A5 5 0 0 1 7 7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7.5 10v4M5.5 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="11" r="1.3" fill="currentColor"/><circle cx="18.2" cy="13.4" r="1.3" fill="currentColor"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14a6.5 6.5 0 0 1 3.5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  /* ================================================================ Estado */
  var S = { priv: {},
    code: '', k: '', games: [], sections: [], cells: [], cur: 0,
    peers: {},        // p → {pc, dc, oid, sid, open, held:{}}
    game: null,       // juego en curso (objeto del catálogo) o null (lobby)
    frame: null, ready: false, menu: null, menuSel: 0,
    pollT: 0, lastChange: Date.now(), polling: false,
    padSeq: 0,        // orden de los mensajes «pad» (el canal no es ordenado)
    recent: {},       // p → hora a la que se fue (para decir «ha vuelto»)
    gone: {},         // plazas cuyo canal se cerró (se avisa al servidor)
    gameT0: 0, lastAd: 0, ad: false,
    lat: []           // retardo mando → tele (ms) de las últimas pulsaciones, para pruebas
  };
  var ui = {};

  /* ================================================================ Montaje */
  function build() {
    var app = $('#pt-app');
    var host = C.pad.replace(/^https?:\/\//, '').replace(/\/$/, '');
    app.innerHTML =
      '<div class="pt-lobby">' +
        '<aside class="pt-join">' +
          '<a class="pt-brand" href="' + esc(C.home) + '"><svg class="pt-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" fill="#6e62f5"/><path d="M12 10.5v11l9-5.5z" fill="#fff"/></svg><span>' + esc(C.brand || 'Arcade') + '</span><em>' + ICO.tv + 'Modo tele</em></a>' +
          '<div class="pt-card pt-qrbox">' +
            '<p class="pt-step">Escanea con el móvil para usarlo como mando</p>' +
            '<div class="pt-qr" data-qr><span class="pt-spin"></span></div>' +
            '<p class="pt-or">o entra en <b>' + esc(host) + '</b> y escribe</p>' +
            '<div class="pt-code" data-code aria-live="polite">····</div>' +
          '</div>' +
          '<div class="pt-players" data-players></div>' +
          '<p class="pt-status" data-status>Creando sala…</p>' +
        '</aside>' +
        '<main class="pt-browse">' +
          '<header class="pt-top"><h1>Elige un juego</h1><p class="pt-hint">Mueve con el mando del móvil o las flechas del mando de la tele · <kbd>OK</kbd> para jugar</p></header>' +
          '<div class="pt-scroll" data-scroll><div data-grid></div></div>' +
        '</main>' +
      '</div>' +
      '<div class="pt-stage" data-stage hidden><div class="pt-ghud" data-ghud></div></div>' +
      '<div class="pt-menu" data-menu hidden></div>' +
      '<div class="pt-toast" data-toast hidden></div>';
    ui.qr = $('[data-qr]'); ui.code = $('[data-code]'); ui.players = $('[data-players]'); ui.status = $('[data-status]');
    ui.grid = $('[data-grid]'); ui.scroll = $('[data-scroll]'); ui.stage = $('[data-stage]'); ui.ghud = $('[data-ghud]');
    ui.menu = $('[data-menu]'); ui.toast = $('[data-toast]');
    renderPlayers();
    phoneHint();
  }

  // En un móvil: la tele se abre en la tele; aquí ofrecemos ir al mando.
  function phoneHint() {
    var touch = window.matchMedia && matchMedia('(pointer:coarse)').matches && !matchMedia('(any-pointer:fine)').matches;
    if (!touch || Math.min(innerWidth, innerHeight) > 600) return;
    var d = el('div', 'pt-phone',
      '<div class="pt-card"><h2>¿Estás en el móvil?</h2><p>Abre <b>' + esc(C.tv.replace(/^https?:\/\//, '')) + '</b> en la tele o el ordenador y escanea el código con este móvil.</p>' +
      '<div class="pt-row"><a class="pt-btn" href="' + esc(C.pad) + '">' + ICO.pad + 'Usar como mando</a><button type="button" class="pt-btn ghost" data-close>Usar como tele</button></div></div>');
    document.body.appendChild(d);
    $('[data-close]', d).onclick = function () { d.remove(); };
  }

  /* ============================================================== Catálogo */
  function loadCatalog() {
    return fetch(C.cat, { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) {
      var all = (j.games || []).filter(function (g) { return g.keys; });
      var mp = all.filter(function (g) { return g.mp; }), solo = all.filter(function (g) { return !g.mp; });
      S.sections = [];
      if (mp.length) S.sections.push({ title: 'Multijugador', sub: 'Hasta 4 en la misma pantalla', games: mp, mp: true });
      S.sections.push({ title: mp.length ? 'Para un jugador' : 'Juegos', sub: 'Juega con el mando del móvil (J1)', games: solo });
      renderGrid();
    }).catch(function () { ui.grid.innerHTML = '<p class="pt-empty">No se pudo cargar la lista de juegos.</p>'; });
  }

  function renderGrid() {
    var h = '';
    S.cells = [];
    S.sections.forEach(function (sec, si) {
      h += '<section class="pt-sec' + (sec.mp ? ' mp' : '') + '"><h2>' + (sec.mp ? ICO.users : '') + esc(sec.title) + ' <small>' + esc(sec.sub) + '</small></h2><div class="pt-grid">';
      sec.games.forEach(function (g) {
        var i = S.cells.length;
        S.cells.push(g);
        var badge = g.mp ? '<span class="pt-badge">' + g.mp[0] + '–' + g.mp[1] + ' jugadores</span>' : '';
        h += '<button type="button" class="pt-cell" data-i="' + i + '" tabindex="-1">' +
          '<span class="pt-thumb"><img src="' + esc(C.games + g.slug + '/thumb.webp?v=' + C.v) + '" alt="" loading="lazy" decoding="async">' + badge + '</span>' +
          '<span class="pt-name">' + esc(g.title) + '</span></button>';
      });
      h += '</div></section>';
      // Publicidad: un único bloque entre secciones (o al final), separado de la rejilla. Nunca en el mando ni en partida.
      if (C.ad && (si === 0 || S.sections.length === 1)) h += C.ad;
    });
    ui.grid.innerHTML = h;
    pushAds();
    ui.grid.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.pt-cell') : null;
      if (b) { focusCell(+b.dataset.i); start(S.cells[+b.dataset.i]); }
    });
    ui.grid.addEventListener('mousemove', function (e) {
      var b = e.target.closest ? e.target.closest('.pt-cell') : null;
      if (b && +b.dataset.i !== S.cur) focusCell(+b.dataset.i, true);
    });
    var want = (location.search.match(/[?&]g=([a-z0-9-]+)/) || [])[1] || store('arcade:tv:last'), wi = 0;
    if (want) S.cells.forEach(function (g, i) { if (g.slug === want) wi = i; });
    focusCell(wi);
  }

  function focusCell(i, noScroll) {
    var cells = ui.grid.querySelectorAll('.pt-cell');
    if (!cells.length) return;
    i = Math.max(0, Math.min(cells.length - 1, i));
    var old = cells[S.cur]; if (old) old.classList.remove('on');
    S.cur = i;
    var c = cells[i]; c.classList.add('on');
    if (!noScroll) {
      var r = c.getBoundingClientRect(), sr = ui.scroll.getBoundingClientRect(), m = sr.height * 0.18;
      if (r.top < sr.top + m) ui.scroll.scrollTop += r.top - sr.top - m;
      else if (r.bottom > sr.bottom - m) ui.scroll.scrollTop += r.bottom - sr.bottom + m;
    }
  }

  // Movimiento espacial: la celda más cercana en la dirección pedida (entre secciones también).
  function move(dir) {
    var cells = ui.grid.querySelectorAll('.pt-cell');
    if (!cells.length) return;
    // Posiciones de maquetación (offset*), sin la escala de la celda enfocada.
    var box = function (c) { var x = 0, y = 0, e = c; while (e && e !== document.body) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x: x + c.offsetWidth / 2, y: y + c.offsetHeight / 2, w: c.offsetWidth, h: c.offsetHeight }; };
    var a = box(cells[S.cur]), best = -1, bd = Infinity;
    for (var i = 0; i < cells.length; i++) {
      if (i === S.cur) continue;
      var r = box(cells[i]), dx = r.x - a.x, dy = r.y - a.y, d;
      if (dir === 'left' && (dx > -a.w / 2 || Math.abs(dy) > a.h / 2)) continue;
      if (dir === 'right' && (dx < a.w / 2 || Math.abs(dy) > a.h / 2)) continue;
      if (dir === 'up' && dy > -a.h / 2) continue;
      if (dir === 'down' && dy < a.h / 2) continue;
      d = dir === 'left' || dir === 'right' ? Math.abs(dx) : Math.abs(dy) * 1000 + Math.abs(dx);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0 && (dir === 'right' || dir === 'left')) best = S.cur + (dir === 'right' ? 1 : -1); // salta de fila
    if (best >= 0 && best < cells.length) focusCell(best);
  }

  /* ================================================================ Juego */
  function start(g) {
    if (!g || S.ad) return;
    closeMenu();
    stopRepeat();
    clearPriv(); S.game = g; S.ready = false; S.gameT0 = Date.now();
    store('arcade:tv:last', g.slug);
    var f = document.createElement('iframe');
    f.className = 'pt-frame';
    f.allow = 'fullscreen; gamepad; autoplay';
    f.setAttribute('title', g.title);
    f.src = C.games + g.slug + '/index.html?party=1';
    if (S.frame) S.frame.remove();
    S.frame = f;
    ui.stage.insertBefore(f, ui.ghud);
    ui.stage.hidden = false;
    document.body.classList.add('pt-ingame');
    f.addEventListener('load', function () {
      try { f.contentWindow.focus(); } catch (e) { /* nada */ }
      // El mando de la tele (flechas/OK) juega como J1 porque el foco está en el juego;
      // Atrás/Escape abre el menú de la tele.
      try { f.contentWindow.addEventListener('keydown', onKey, true); } catch (e) { /* distinto origen */ }
    });
    renderGhud(true);
    broadcastPad();
    schedulePoll(400);
  }

  function toLobby() {
    releaseAll(null, true);
    clearPriv();
    closeMenu();
    if (S.frame) { S.frame.remove(); S.frame = null; }
    var played = S.game ? Date.now() - S.gameT0 : 0;
    S.game = null; S.ready = false;
    ui.stage.hidden = true;
    document.body.classList.remove('pt-ingame');
    broadcastPad();
    focusCell(S.cur);
    try { window.focus(); } catch (e) { /* nada */ }
    schedulePoll(300);
    adBreakLobby(played);
  }

  function post(msg) { try { if (S.frame) S.frame.contentWindow.postMessage(msg, '*'); } catch (e) { /* nada */ } }

  function playersMsg() {
    var list = [];
    Object.keys(S.peers).forEach(function (p) { if (active(p)) list.push({ p: +p, color: COLORS[p], name: S.peers[p].name || 'J' + (+p + 1) }); });
    list.sort(function (a, b) { return a.p - b.p; });
    return { type: 'arcade:party', players: list, priv: true };
  }

  // Suelta las teclas del jugador p (o de todos). Con `all` envía down:false de las 6 teclas aunque
  // la tele crea que no estaban pulsadas: así nunca se queda nada pegado en el juego.
  function releaseAll(p, all) {
    Object.keys(S.peers).forEach(function (q) {
      if (p != null && +q !== +p) return;
      var h = S.peers[q].held;
      KEYS.forEach(function (key) { if (h[key] || all) { h[key] = false; post({ type: 'arcade:pkey', p: +q, key: key, down: false }); } });
    });
  }
  function active(p) { var peer = S.peers[p]; return !!(peer && peer.open && !peer.lost); }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || !S.frame || e.source !== S.frame.contentWindow) return;
    if (d.type === 'arcade:hello') { S.ready = true; post(playersMsg()); }
    // Mensaje privado a un solo móvil (mano de cartas, rol secreto…): nunca se pinta en la tele.
    else if (d.type === 'arcade:priv' && d.p >= 0 && d.p < 4) { S.priv[d.p] = d.data ? 1 : 0; send(d.p | 0, { t: 'priv', d: d.data || null }); }
  });
  function clearPriv() { Object.keys(S.priv).forEach(function (p) { if (S.priv[p]) send(+p, { t: 'priv', d: null }); }); S.priv = {}; }

  /* ============================================================ Publicidad */
  function pushAds() {
    var ins = ui.grid.querySelectorAll('[data-ax-ad] ins.adsbygoogle');
    for (var i = 0; i < ins.length; i++) {
      if (ins[i].getAttribute('data-ax-pushed') || !ins[i].offsetWidth) continue;
      ins[i].setAttribute('data-ax-pushed', '1');
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* nada */ }
    }
  }
  // Pausa publicitaria (H5 Games Ads) al volver al lobby: solo tras una partida de verdad (≥ 45 s)
  // y como mucho una cada `freq` s. AdSense decide además si la muestra. Con ?adpreview=1 se simula.
  function adBreakLobby(played) {
    var h5 = C.h5, now = Date.now();
    if (!h5 || played < 45000 || (S.lastAd && now - S.lastAd < h5.freq * 1000)) return;
    var real = typeof window.adBreak === 'function';
    if (!real && !h5.preview) return;
    S.lastAd = now;
    var done = function () { if (!S.ad) return; S.ad = false; document.body.classList.remove('pt-adon'); broadcastPad(); var o = $('.pt-adprev'); if (o) o.remove(); };
    var before = function () { S.ad = true; document.body.classList.add('pt-adon'); stopRepeat(); releaseAll(null, true); broadcastPad(); };
    if (!real) { // vista previa para el administrador
      before();
      document.body.appendChild(el('div', 'pt-adprev', '<div class="pt-card"><span class="pt-kick">Publicidad</span><p>Pausa publicitaria (vista previa)</p></div>'));
      setTimeout(done, 3000);
      return;
    }
    try { window.adBreak({ type: 'next', name: 'tele-lobby', beforeAd: before, afterAd: done, adBreakDone: done }); } catch (e) { done(); }
  }

  /* ================================================================ Menú */
  function openMenu() {
    if (S.ad) return;
    stopRepeat();
    if (S.game) {
      releaseAll(null, true);
      post({ type: 'arcade:pause' });
      S.menu = [['Seguir jugando', closeMenu], ['Elegir otro juego', toLobby], ['Reiniciar', function () { start(S.game); }]];
    } else {
      S.menu = [['Seguir en la tele', closeMenu], ['Salir del modo tele', function () { leave(); }]];
    }
    S.menuSel = 0;
    ui.menu.innerHTML = '<div class="pt-card pt-mcard"><span class="pt-kick">' + (S.game ? 'Pausa' : 'Modo tele') + '</span><h2>' + esc(S.game ? S.game.title : 'Menú') + '</h2>' +
      S.menu.map(function (m, i) { return '<button type="button" data-m="' + i + '">' + esc(m[0]) + '</button>'; }).join('') +
      '<p>Mando: ↑ ↓ y A · Tele: flechas y OK</p></div>';
    ui.menu.hidden = false;
    broadcastPad();
    ui.menu.onclick = function (e) { var b = e.target.closest ? e.target.closest('[data-m]') : null; if (b) S.menu[+b.dataset.m][1](); };
    menuSel(0);
  }
  function menuSel(i) {
    var bs = ui.menu.querySelectorAll('[data-m]');
    S.menuSel = (i + bs.length) % bs.length;
    for (var j = 0; j < bs.length; j++) bs[j].classList.toggle('on', j === S.menuSel);
  }
  function closeMenu() {
    if (!S.menu) return;
    S.menu = null; ui.menu.hidden = true;
    broadcastPad();
    if (S.game) { post({ type: 'arcade:resume' }); post({ type: 'arcade:unpause' }); }
    try { if (S.frame) S.frame.contentWindow.focus(); } catch (e) { /* nada */ }
  }
  // Salir de verdad: cierra la sala (los mandos lo sabrán al sondear) y vuelve al portal.
  function leave() {
    S.leaving = true;
    try { if (S.code) api('/' + S.code + '/close', { method: 'POST', body: { k: S.k }, keepalive: true }); } catch (e) { /* nada */ }
    store('arcade:tv', null);
    location.href = C.home;
  }
  function menuKey(k) {
    if (k === 'up' || k === 'left') menuSel(S.menuSel - 1);
    else if (k === 'down' || k === 'right') menuSel(S.menuSel + 1);
    else if (k === 'a') S.menu[S.menuSel][1]();
    else if (k === 'b' || k === 'menu') closeMenu();
  }

  /* ============================================================ Entradas */
  var BACK = { Escape: 1, Backspace: 1, GoBack: 1, BrowserBack: 1, XF86Back: 1 };
  var BACK_CODES = { 8: 1, 27: 1, 461: 1, 10009: 1 }; // webOS 461, Tizen 10009
  var ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Up: 'up', Down: 'down', Left: 'left', Right: 'right' };
  var ARROW_CODES = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' };

  var PLAY_CODES = { 10252: 1, 415: 1, 19: 1, 179: 1 }; // Reproducir/Pausa (Tizen, webOS, genérico)

  function onKey(e) {
    var back = BACK[e.key] || BACK_CODES[e.keyCode];
    var dir = ARROWS[e.key] || ARROW_CODES[e.keyCode];
    var ok = e.key === 'Enter' || e.keyCode === 13 || e.key === ' ';
    if (e.key === 'MediaPlayPause' || PLAY_CODES[e.keyCode]) back = 1;
    if (back) { trap.key = Date.now(); e.preventDefault(); }
    arm();
    if (S.ad) { e.preventDefault(); return; }
    if (S.menu) {
      e.preventDefault(); e.stopPropagation();
      if (back) closeMenu(); else if (dir) menuKey(dir); else if (ok) menuKey('a');
      return;
    }
    if (S.game) {
      if (back) { e.preventDefault(); e.stopPropagation(); openMenu(); }
      else if (e.target === document.body || !e.target.ownerDocument || e.target.ownerDocument === document) {
        // Foco fuera del juego (clic en la tele): lo devolvemos al iframe.
        try { S.frame.contentWindow.focus(); } catch (er) { /* nada */ }
      }
      return;
    }
    if (back) { openMenu(); return; }
    if (dir) { e.preventDefault(); move(dir); }
    else if (ok) { e.preventDefault(); start(S.cells[S.cur]); }
  }
  document.addEventListener('keydown', onKey, true);

  // Trampa del botón Atrás (Smart TV, navegador): una entrada extra en el historial. Atrás la consume
  // (popstate) y abre el menú en vez de salir. Chrome ignora las entradas creadas sin gesto del usuario,
  // así que se arma en la primera tecla/clic y se rearma en la siguiente tras cada Atrás.
  var trap = { armed: false, key: 0 };
  function arm() {
    if (trap.armed || S.leaving) return;
    var ua = navigator.userActivation; // sin gesto real Chrome la saltaría: esperamos al siguiente
    if (ua && !ua.isActive) return;
    try { history.pushState({ pt: 1 }, '', location.href); trap.armed = true; } catch (e) { /* nada */ }
  }
  window.addEventListener('popstate', function () {
    trap.armed = false;
    if (S.leaving || Date.now() - trap.key < 500) return; // ya lo atendió keydown
    if (S.menu) closeMenu(); else openMenu();
  });
  document.addEventListener('pointerdown', arm, true);
  // Tizen: teclas multimedia (solo en apps instaladas; en el navegador no existe `tizen`).
  try {
    if (window.tizen && window.tizen.tvinputdevice) ['MediaPlayPause', 'MediaPlay', 'MediaPause'].forEach(function (k) { try { window.tizen.tvinputdevice.registerKey(k); } catch (e) { /* nada */ } });
  } catch (e) { /* nada */ }

  // Pulsaciones que llegan de los móviles.
  var rep = {}; // repetición del cursor en el lobby por jugador
  function padKey(p, k, down, ts) {
    var peer = S.peers[p];
    if (!peer) return;
    var id = p + k;
    if (rep[id]) { clearTimeout(rep[id]); clearInterval(rep[id]); delete rep[id]; }
    if (S.ad) return; // pausa publicitaria
    if (S.menu) { if (down) menuKey(k); return; }
    if (k === 'menu') {
      if (!down) return;
      if (S.game) openMenu();
      return;
    }
    if (S.game) {
      if (KEYS.indexOf(k) < 0 || !!peer.held[k] === !!down) return;
      peer.held[k] = !!down;
      var m = { type: 'arcade:pkey', p: p, key: k, down: !!down };
      if (ts) m.ts = ts;
      post(m);
      return;
    }
    // Lobby: cursor con repetición; A elige (solo el primer jugador conectado), B no hace nada aquí.
    if (!down) return;
    if (k === 'a') {
      if (p === leader()) start(S.cells[S.cur]);
      else toast('Elige J' + (leader() + 1));
      return;
    }
    if (['up', 'down', 'left', 'right'].indexOf(k) < 0) return;
    move(k);
    rep[id] = setTimeout(function () { rep[id] = setInterval(function () { move(k); }, 140); }, 380);
  }
  function stopRepeat(p) { Object.keys(rep).forEach(function (id) { if (p == null || id.charAt(0) === String(p)) { clearTimeout(rep[id]); clearInterval(rep[id]); delete rep[id]; } }); }
  function leader() {
    var ps = Object.keys(S.peers).filter(active).map(Number).sort();
    return ps.length ? ps[0] : 0;
  }

  /* ============================================================ Jugadores */
  function renderPlayers() {
    var h = '';
    for (var p = 0; p < 4; p++) {
      var peer = S.peers[p], on = active(p), lost = peer && peer.open && peer.lost, wait = peer && !peer.open;
      h += '<div class="pt-pl' + (on ? ' on' : lost ? ' lost' : wait ? ' wait' : '') + '" style="--pc:' + COLORS[p] + '">' +
        '<span class="pt-av">' + ICO.pad + '</span><b>J' + (p + 1) + '</b><span>' + (on ? (p === leader() ? 'Listo · elige' : 'Listo') : lost ? 'Sin señal' : wait ? 'Conectando…' : 'Libre') + '</span></div>';
    }
    ui.players.innerHTML = h;
    renderGhud(false);
  }

  function renderGhud(show) {
    if (!ui.ghud) return;
    var dots = '';
    Object.keys(S.peers).forEach(function (p) { if (active(p)) dots += '<i style="--pc:' + COLORS[p] + '">J' + (+p + 1) + '</i>'; });
    ui.ghud.innerHTML = dots + '<span>Menú: botón <b>Menú</b> del móvil o <b>Atrás</b></span>';
    if (show) { ui.ghud.classList.add('show'); clearTimeout(S.ghudT); S.ghudT = setTimeout(function () { ui.ghud.classList.remove('show'); }, 5000); }
  }

  function toast(t) {
    ui.toast.textContent = t; ui.toast.hidden = false;
    clearTimeout(S.toastT); S.toastT = setTimeout(function () { ui.toast.hidden = true; }, 2600);
  }

  function send(p, msg) { var peer = S.peers[p]; if (peer && peer.dc && peer.dc.readyState === 'open') { try { peer.dc.send(JSON.stringify(msg)); } catch (e) { /* nada */ } } }
  function padSpec() {
    if (S.ad) return { d: '', a: 'Espera' };
    if (S.menu) return MENU_PAD;
    if (!S.game) return null;
    return S.game.pad && typeof S.game.pad === 'object' ? S.game.pad : DEFAULT_PAD;
  }
  function padMsg() { return { t: 'pad', s: ++S.padSeq, pad: padSpec(), title: S.ad ? 'Publicidad' : S.menu ? (S.game ? 'Pausa' : 'Menú') : S.game ? S.game.title : 'Elige un juego' }; }
  function broadcastPad() {
    var m = padMsg();
    Object.keys(S.peers).forEach(function (p) { send(+p, m); });
  }

  /* ============================================================== WebRTC */
  function dropPeer(p, say) {
    var peer = S.peers[p];
    if (!peer) return;
    var was = peer.open && !peer.lost;
    stopRepeat(p);
    releaseAll(p, true);
    try { peer.pc.close(); } catch (e) { /* nada */ }
    delete S.peers[p];
    if (peer.open) S.recent[p] = Date.now();
    if (say) S.gone[p] = 1; // se lo dice al servidor en el próximo sondeo: plaza libre
    renderPlayers();
    post(playersMsg());
    if (say && was) toast('J' + (+p + 1) + ' se ha desconectado');
    schedulePoll(1000);
  }

  // Sin noticias del mando (móvil bloqueado, wifi caída…): fuera de la partida pero conserva la plaza.
  function lose(p) {
    var peer = S.peers[p];
    if (!peer || !peer.open || peer.lost) return;
    peer.lost = true; peer.lostAt = Date.now();
    stopRepeat(p);
    releaseAll(p, true);
    renderPlayers();
    post(playersMsg());
    toast('J' + (+p + 1) + ' se ha desconectado');
    schedulePoll(1200);
  }
  function regain(p) {
    var peer = S.peers[p];
    if (!peer || !peer.lost) return;
    peer.lost = false;
    renderPlayers();
    post(playersMsg());
    send(p, padMsg());
    toast('J' + (+p + 1) + ' ha vuelto');
  }
  // Los mandos envían un latido cada segundo; 3,5 s de silencio = desconectado.
  setInterval(function () {
    var now = Date.now();
    Object.keys(S.peers).forEach(function (p) { var peer = S.peers[p]; if (peer.open && !peer.lost && now - peer.seen > 3500) lose(+p); });
  }, 500);

  function accept(row) {
    var p = row.p;
    if (S.peers[p]) dropPeer(p); // nuevo offer (reconexión u otro móvil en la plaza)
    var pc;
    try { pc = new RTCPeerConnection({ iceServers: C.ice || [] }); } catch (e) { status('Este navegador no admite mandos (WebRTC).', true); return; }
    var peer = S.peers[p] = { pc: pc, dc: null, oid: row.oid, sid: row.sid, open: false, lost: false, held: {}, seq: {}, seen: 0, name: row.name || '' };
    function gone() { if (S.peers[p] === peer) dropPeer(p, true); }
    renderPlayers();
    S.lastChange = Date.now();
    pc.ondatachannel = function (ev) {
      var dc = peer.dc = ev.channel;
      dc.onopen = function () {
        if (S.peers[p] !== peer) return;
        peer.open = true; peer.seen = Date.now(); delete S.gone[p];
        send(p, { t: 'you', p: p, color: COLORS[p] });
        send(p, padMsg());
        send(p, { t: 'buzz', ms: 40 });
        renderPlayers();
        post(playersMsg());
        toast('J' + (p + 1) + (Date.now() - (S.recent[p] || 0) < 600000 ? ' ha vuelto' : ' se ha unido'));
        status('');
        schedulePoll();
      };
      dc.onmessage = function (m) {
        var d; try { d = JSON.parse(m.data); } catch (e) { return; }
        if (!d || S.peers[p] !== peer) return;
        peer.seen = Date.now();
        if (d.t === 'away') { lose(p); return; }
        if (peer.lost) regain(p);
        if (d.t === 'k') {
          // Canal sin orden (sin bloqueo si se pierde un paquete): el número de orden por tecla descarta lo atrasado.
          if (typeof d.s === 'number') { if (peer.seq[d.k] != null && d.s <= peer.seq[d.k]) return; peer.seq[d.k] = d.s; }
          if (d.ts) { S.lat.push(Date.now() - d.ts); if (S.lat.length > 500) S.lat.shift(); }
          padKey(p, d.k, !!d.d, d.ts);
        } else if (d.t === 'p') send(p, { t: 'P', ts: d.ts });
        else if (d.t === 'hi' && d.name) { peer.name = String(d.name).slice(0, 16); post(playersMsg()); }
        else if (d.t === 'pick' && S.game && !S.menu && !S.ad) post({ type: 'arcade:ppick', p: p, v: d.v });
      };
      dc.onclose = gone;
    };
    // connectionState no existe en Chromium < 72 (Smart TV antiguas): también iceConnectionState.
    pc.onconnectionstatechange = function () {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') gone();
    };
    pc.oniceconnectionstatechange = function () {
      var s = pc.iceConnectionState;
      if (s === 'failed' || s === 'closed') gone();
      else if (s === 'disconnected' && peer.open) lose(p);
    };
    pc.setRemoteDescription({ type: 'offer', sdp: row.offer })
      .then(function () { return pc.createAnswer(); })
      .then(function (a) { return pc.setLocalDescription(a); })
      .then(function () { return gathered(pc, 2500); })
      .then(function () {
        if (S.peers[p] !== peer) return null;
        return api('/' + S.code + '/answer', { method: 'POST', body: { k: S.k, p: p, oid: row.oid, sdp: pc.localDescription.sdp } });
      })
      .then(function (r) {
        if (r && r._status === 503) throw new Error('busy'); // se reintenta con el siguiente sondeo
        // Si nunca llega a abrirse (red que no deja conectar), libera la plaza en la tele.
        setTimeout(function () { if (S.peers[p] === peer && !peer.open) dropPeer(p); }, 25000);
        return r;
      })
      .catch(function () { if (S.peers[p] === peer) dropPeer(p); });
  }

  /* ============================================================== Sala */
  function status(t, bad) { ui.status.textContent = t || ''; ui.status.classList.toggle('bad', !!bad); }

  function showRoom() {
    ui.code.textContent = S.code;
    var url = C.pad + '?c=' + S.code;
    try { ui.qr.innerHTML = QR.svg(url); } catch (e) { ui.qr.textContent = url; }
    status('');
  }

  function create() {
    status('Creando sala…');
    return api('', { method: 'POST' }).then(function (r) {
      if (r._status !== 201) {
        status(r._status === 429 ? 'Has creado demasiadas salas. Espera unos minutos.' : 'No se pudo crear la sala. Reintentando…', true);
        setTimeout(create, r._status === 429 ? 60000 : 5000);
        return;
      }
      S.code = r.code; S.k = r.k;
      store('arcade:tv', JSON.stringify({ c: S.code, k: S.k }));
      showRoom();
      schedulePoll(200);
    }).catch(function () { status('Sin conexión. Reintentando…', true); setTimeout(create, 5000); });
  }

  // Plazas: `live` las conserva; `gone` las libera ya (canal cerrado o más de 5 s sin señal) para que el mismo
  // móvil en una pestaña nueva (sin su token) recupere su número. Con su token vuelve igual a su plaza.
  function longLost(p) { var peer = S.peers[p]; return peer.lost && Date.now() - peer.lostAt > 5000; }
  function live() { return Object.keys(S.peers).filter(function (p) { return S.peers[p].open && !longLost(p); }).join(','); }

  function poll() {
    if (!S.code || S.polling) return;
    S.polling = true;
    var gone = Object.keys(S.gone).filter(function (p) { return !S.peers[p]; })
      .concat(Object.keys(S.peers).filter(function (p) { return S.peers[p].open && longLost(p); })).join(',');
    api('/' + S.code + '?k=' + encodeURIComponent(S.k) + '&live=' + live() + (gone ? '&gone=' + gone : '')).then(function (r) {
      S.polling = false;
      if (r._status === 404 || r._status === 403) { // sala caducada: otra nueva
        Object.keys(S.peers).forEach(function (p) { dropPeer(p); });
        store('arcade:tv', null); S.code = ''; ui.code.textContent = '····';
        create();
        return;
      }
      if (r._status === 429) { schedulePoll(15000); return; }
      (r.pads || []).forEach(function (row) {
        var peer = S.peers[row.p];
        if (row.offer && (!peer || peer.oid !== row.oid)) accept(row);
      });
      schedulePoll();
    }).catch(function () { S.polling = false; schedulePoll(5000); });
  }

  // 1 s con mandos conectándose o sin señal; más lento en el lobby, en partida o tras mucho rato sin cambios.
  function schedulePoll(ms) {
    clearTimeout(S.pollT);
    if (ms == null) {
      // Con alguien «sin señal» se sondea rápido: su móvil volverá a llamar con un offer nuevo.
      var pending = Object.keys(S.peers).some(function (p) { return !S.peers[p].open || S.peers[p].lost; });
      var idle = Date.now() - S.lastChange > 5 * 60000;
      // Lobby 2 s (un móvil nuevo espera ≤ 2 s; la negociación ICE ya tarda más), 4 s tras 5 min sin cambios.
      ms = pending ? 1000 : S.game ? 6000 : idle ? 4000 : 2000;
      if (document.hidden) ms = Math.max(ms, 10000);
    }
    S.pollT = setTimeout(poll, ms);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) schedulePoll(100); });

  /* ============================================================== Inicio */
  build();
  if (!window.RTCPeerConnection) status('Este navegador no admite mandos por conexión directa (WebRTC). Prueba con Chrome o Edge.', true);
  loadCatalog();
  var saved = null; try { saved = JSON.parse(store('arcade:tv') || 'null'); } catch (e) { saved = null; }
  if (saved && saved.c && saved.k) { S.code = saved.c; S.k = saved.k; showRoom(); schedulePoll(100); } else create();

  // Para pruebas.
  window.__party = S;
})();
