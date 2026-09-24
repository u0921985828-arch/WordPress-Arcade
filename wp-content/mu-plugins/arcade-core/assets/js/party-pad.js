/* Arcade — mando del móvil (/mando/?c=CODE). Se une a la sala de la tele, abre un canal de datos
 * WebRTC directo y envía pulsaciones {t:'k', k, d}. Joystick flotante a la izquierda y botones por
 * cercanía a la derecha (misma idea que el mando del reproductor). */
(function () {
  'use strict';
  var C = window.PARTY || {};
  var COLORS = C.colors || ['#ff5a5f', '#3fb6ea', '#ffd166', '#5fbf45'];
  var ALPHA = /^[ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;
  var OCT = { 0: ['right'], 1: ['right', 'down'], 2: ['down'], 3: ['down', 'left'], 4: ['left'], '-4': ['left'], '-3': ['left', 'up'], '-2': ['up'], '-1': ['up', 'right'] };
  var LOBBY = { d: '8', a: 'Elegir', b: 'Atrás' };

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } return null; }
  // Vibración: no existe en iOS; en Chrome solo tras el primer toque (si no, avisa en la consola).
  var touched = false;
  document.addEventListener('pointerdown', function () { touched = true; }, true);
  function buzz(ms) { try { if (touched && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* nada */ } }
  function api(path, opt) {
    opt = opt || {};
    var init = { method: opt.method || 'GET', headers: {}, cache: 'no-store', credentials: 'omit' };
    if (opt.body) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opt.body); }
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

  var code = ((location.search.match(/[?&]c=([A-Za-z]{4})/) || [])[1] || '').toUpperCase();
  var S = { p: -1, tok: '', pc: null, dc: null, open: false, spec: LOBBY, title: 'Conectando…', gen: 0, held: {}, retry: 0,
    seq: 0, padSeq: -1, rx: 0, rtt: [] };
  var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var app = $('#pt-app');

  /* ================================================================ Interfaz */
  app.innerHTML =
    '<div class="pd">' +
      '<header class="pd-top"><span class="pd-me" data-me>··</span><span class="pd-title" data-title></span>' +
        '<button type="button" class="pd-menu" data-menu>Menú</button></header>' +
      '<div class="pd-zones"><div class="pd-l" data-l></div><div class="pd-r" data-r></div></div>' +
      '<div class="pd-priv" data-priv></div>' +
      '<div class="pd-over" data-over></div>' +
    '</div>';
  var ui = { priv: $('[data-priv]'), me: $('[data-me]'), title: $('[data-title]'), l: $('[data-l]'), r: $('[data-r]'), over: $('[data-over]'), menu: $('[data-menu]') };

  function overlay(html) {
    ui.over.innerHTML = html ? '<div class="pd-card">' + html + '</div>' : '';
    ui.over.classList.toggle('show', !!html);
  }

  function askCode(msg) {
    overlay('<svg class="pd-logo" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" fill="#6e62f5"/><path d="M12 10.5v11l9-5.5z" fill="#fff"/></svg>' +
      '<h1>Usa el móvil como mando</h1>' +
      (msg ? '<p class="bad">' + esc(msg) + '</p>' : '<p>Escribe el código que aparece en la tele o escanea su QR.</p>') +
      '<form data-form><input name="c" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" placeholder="ABCD" aria-label="Código de la sala" value="' + esc(code) + '"><button class="pd-btn" type="submit">Conectar</button></form>' +
      '<p class="pd-small">En la tele u ordenador abre <b>' + esc(String(C.tv || '').replace(/^https?:\/\//, '')) + '</b></p>' +
      (IOS && !navigator.standalone ? '<p class="pd-small">En iPhone: gira el móvil en horizontal. Para quitar las barras de Safari, Compartir → «Añadir a pantalla de inicio».</p>' : ''));
    var f = $('[data-form]'), inp = f.c;
    inp.addEventListener('input', function () { inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = inp.value.toUpperCase();
      if (!ALPHA.test(v)) { inp.classList.add('bad'); return; }
      code = v;
      try { history.replaceState(null, '', '?c=' + v); } catch (er) { /* nada */ }
      loadSeat(); connect();
    });
    setTimeout(function () { if (!code) inp.focus(); }, 50);
  }

  function setMe() {
    var col = S.p >= 0 ? COLORS[S.p] : '#6e62f5';
    document.documentElement.style.setProperty('--pc', col);
    ui.me.textContent = S.p >= 0 ? 'J' + (S.p + 1) : '··';
    ui.title.textContent = S.title;
  }

  /* ================================================================ Mando */
  function send(m) { if (S.dc && S.dc.readyState === 'open') { try { S.dc.send(JSON.stringify(m)); } catch (e) { /* nada */ } } }
  // s = número de orden (el canal no es ordenado: la tele descarta lo atrasado); ts = hora de envío (medir latencia).
  function key(k, down) {
    if (!!S.held[k] === !!down) return;
    S.held[k] = !!down;
    send({ t: 'k', k: k, d: down ? 1 : 0, s: ++S.seq, ts: Date.now() });
  }
  function releaseAll() { Object.keys(S.held).forEach(function (k) { if (S.held[k]) key(k, false); }); }

  /* Información privada de este jugador (mano de cartas, rol, dados…): solo en su móvil.
     d = {title, text, items:[{v, label, sub, img, col, off}], bar} · bar: aviso pequeño sin tapar los controles. */
  function priv(d) {
    var p = ui.priv;
    if (!d) { p.innerHTML = ''; p.className = 'pd-priv'; return; }
    var items = Array.isArray(d.items) ? d.items.slice(0, 24) : [];
    p.className = 'pd-priv show' + (d.bar || !items.length ? ' bar' : '');
    p.innerHTML = (d.title ? '<h2>' + esc(d.title) + '</h2>' : '') + (d.text ? '<p>' + esc(d.text) + '</p>' : '') +
      (items.length ? '<div class="pd-items">' + items.map(function (it, i) {
        var img = typeof it.img === 'string' && /^data:image\/(png|webp|jpeg);base64,/.test(it.img) ? '<img src="' + it.img + '" alt="">' : '';
        return '<button type="button" class="pd-it' + (img ? ' pic' : '') + '" data-i="' + i + '"' + (it.off ? ' disabled' : '') +
          (it.col ? ' style="--ic:' + esc(String(it.col).slice(0, 24)) + '"' : '') + '>' + img +
          (it.label != null ? '<b>' + esc(String(it.label).slice(0, 40)) + '</b>' : '') + (it.sub ? '<small>' + esc(String(it.sub).slice(0, 60)) + '</small>' : '') + '</button>';
      }).join('') + '</div>' : '');
    Array.prototype.forEach.call(p.querySelectorAll('.pd-it'), function (b) {
      b.addEventListener('click', function () {
        var it = items[+b.dataset.i]; if (!it || it.off) return;
        send({ t: 'pick', v: it.v != null ? it.v : +b.dataset.i }); buzz(15);
        b.classList.add('hit'); setTimeout(function () { b.classList.remove('hit'); }, 180);
      });
    });
  }

  var zoneAc = [];
  function build(spec) {
    releaseAll();
    zoneAc.forEach(function (f) { f(); }); zoneAc = [];
    spec = spec || LOBBY;
    var onlyH = spec.d === 'h', hasStick = !!spec.d;
    var btns = [['a', spec.a || 'A']];
    if (spec.b) btns.unshift(['b', spec.b]);
    ui.l.innerHTML = hasStick ? '<div class="pd-stick' + (onlyH ? ' h' : '') + '"><i></i></div><span class="pd-zhint">' + (onlyH ? '← →' : 'Mueve') + '</span>' : '';
    ui.r.innerHTML = '<div class="pd-btns n' + btns.length + '">' + btns.map(function (b) {
      return '<span class="pd-b' + (b[1].length > 1 ? ' lbl' : '') + '" data-b="' + b[0] + '">' + esc(b[1]) + '</span>';
    }).join('') + '</div>';
    document.body.classList.toggle('pd-nostick', !hasStick);
    if (hasStick) stick(onlyH);
    buttons(hasStick ? [ui.r] : [ui.r, ui.l]);
  }

  function on(elm, ev, fn) { elm.addEventListener(ev, fn, { passive: false }); zoneAc.push(function () { elm.removeEventListener(ev, fn, { passive: false }); }); }

  // Joystick flotante: aparece donde apoyas el pulgar y la base sigue al dedo.
  function stick(onlyH) {
    var zl = ui.l, st = $('.pd-stick', zl), knob = st.firstChild, id = null, cx = 0, cy = 0, dirs = [];
    function apply(next) {
      dirs.forEach(function (d) { if (next.indexOf(d) < 0) key(d, false); });
      next.forEach(function (d) { if (dirs.indexOf(d) < 0) key(d, true); });
      if (next.length && !dirs.length) buzz(6);
      dirs = next;
    }
    function place(x, y) {
      var z = zl.getBoundingClientRect(), r = st.offsetWidth / 2, rh = st.offsetHeight / 2;
      cx = Math.max(z.left + r * 0.6, Math.min(z.right - r * 0.6, x));
      cy = Math.max(z.top + rh * 0.6, Math.min(z.bottom - rh * 0.6, y));
      st.style.left = cx - z.left + 'px'; st.style.top = cy - z.top + 'px';
    }
    function track(x, y) {
      var R = st.offsetWidth * 0.36, dx = x - cx, dy = onlyH ? 0 : y - cy, m = Math.sqrt(dx * dx + dy * dy);
      if (m > R * 1.25) {
        var z = zl.getBoundingClientRect(), k = (m - R * 1.25) / m;
        cx += dx * k; cy += dy * k;
        st.style.left = cx - z.left + 'px'; st.style.top = cy - z.top + 'px';
        dx = x - cx; dy = onlyH ? 0 : y - cy;
      }
      var d = Math.sqrt(dx * dx + dy * dy), s = d > R ? R / d : 1;
      knob.style.transform = 'translate(' + dx * s + 'px,' + dy * s + 'px)';
      if (d < R * 0.3) return apply([]);
      if (onlyH) return apply([dx < 0 ? 'left' : 'right']);
      apply(OCT[Math.round(Math.atan2(dy, dx) / (Math.PI / 4))].slice());
    }
    function reset() { id = null; apply([]); st.classList.remove('live'); knob.style.transform = ''; st.style.left = st.style.top = ''; }
    on(zl, 'pointerdown', function (e) {
      e.preventDefault();
      if (id !== null) return;
      id = e.pointerId;
      try { zl.setPointerCapture(id); } catch (er) { /* nada */ }
      st.classList.add('live'); place(e.clientX, e.clientY); track(e.clientX, e.clientY);
    });
    on(zl, 'pointermove', function (e) { if (e.pointerId === id) { e.preventDefault(); track(e.clientX, e.clientY); } });
    var end = function (e) { if (e.pointerId === id) { e.preventDefault(); reset(); } };
    on(zl, 'pointerup', end); on(zl, 'pointercancel', end); on(zl, 'lostpointercapture', end);
  }

  // Botones: toda la zona es táctil; cada dedo pulsa el botón más cercano y puede deslizar entre ellos.
  function buttons(zones) {
    var bs = [].slice.call(ui.r.querySelectorAll('.pd-b')), owner = {}, count = {};
    bs.forEach(function (b) { count[b.dataset.b] = 0; });
    function nearest(x, y) {
      var best = null, bd = Infinity;
      bs.forEach(function (b) { var r = b.getBoundingClientRect(), d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)); if (d < bd) { bd = d; best = b; } });
      return best;
    }
    function press(b, down) {
      var n = b.dataset.b, c = count[n] = Math.max(0, count[n] + (down ? 1 : -1));
      if (down && c === 1) { key(n, true); b.classList.add('on'); buzz(10); }
      if (!down && c === 0) { key(n, false); b.classList.remove('on'); }
    }
    function set(e) {
      var was = owner[e.pointerId], now = nearest(e.clientX, e.clientY);
      if (was === now) return;
      if (was) press(was, false);
      owner[e.pointerId] = now; press(now, true);
    }
    zones.forEach(function (z) {
      on(z, 'pointerdown', function (e) { e.preventDefault(); try { z.setPointerCapture(e.pointerId); } catch (er) { /* nada */ } set(e); });
      on(z, 'pointermove', function (e) { if (owner[e.pointerId]) { e.preventDefault(); set(e); } });
      var end = function (e) { var b = owner[e.pointerId]; if (b) { e.preventDefault(); delete owner[e.pointerId]; press(b, false); } };
      on(z, 'pointerup', end); on(z, 'pointercancel', end); on(z, 'lostpointercapture', end);
    });
  }

  ui.menu.addEventListener('pointerdown', function (e) { e.preventDefault(); ui.menu.classList.add('on'); buzz(10); key('menu', true); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { ui.menu.addEventListener(ev, function () { ui.menu.classList.remove('on'); key('menu', false); }); });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  // iOS Safari ignora user-scalable=no: se bloquean a mano pellizco, doble toque y arrastre de la página
  // (salvo en la tarjeta del código, donde hay que poder escribir, y en el panel privado: sin esto el toque
  // no genera «click» y no se podía elegir carta/respuesta ni desplazar la lista).
  function inForm(e) { var c = e.target.closest ? e.target : null; return c && ((ui.over.classList.contains('show') && c.closest('.pd-card')) || c.closest('.pd-priv.show')); }
  ['gesturestart', 'gesturechange', 'dblclick'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false }); });
  ['touchstart', 'touchmove'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (!inForm(e) && e.cancelable) e.preventDefault(); }, { passive: false });
  });

  // Pantalla completa (Android) y pantalla siempre encendida al primer toque.
  var lock = null;
  function wake() {
    try { if (navigator.wakeLock && !lock) navigator.wakeLock.request('screen').then(function (l) { lock = l; l.addEventListener('release', function () { lock = null; }); }).catch(function () {}); } catch (e) { /* nada */ }
  }
  document.addEventListener('pointerup', function first(e) {
    if (e.target.closest && e.target.closest('input,form')) return;
    var de = document.documentElement;
    try { if (!document.fullscreenElement && de.requestFullscreen && matchMedia('(pointer:coarse)').matches) de.requestFullscreen({ navigationUI: 'hide' }).catch(function () {}); } catch (er) { /* nada */ }
    wake();
    document.removeEventListener('pointerup', first);
  });
  // Móvil bloqueado / otra app: suelta todo y avisa a la tele. Al volver, comprueba que el canal sigue vivo.
  function away() { releaseAll(); send({ t: 'away' }); }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { away(); return; }
    wake();
    if (!code) return;
    if (!S.open) { connect(); return; }
    var t = Date.now(), gen = S.gen;
    S.rx = Math.max(S.rx, t - 4000); // oculto no hay latidos: 3 s de margen antes de dar el canal por muerto
    ping();
    setTimeout(function () { if (gen === S.gen && S.open && S.rx < t) connect(); }, 3000);
  });
  window.addEventListener('pagehide', away);
  window.addEventListener('online', function () { if (code && !S.open) connect(); });

  // Latido: 1 por segundo (la tele da por perdido un mando tras 3,5 s de silencio). Si la tele no
  // contesta en 7 s, el canal está muerto aunque el navegador no lo sepa: se vuelve a negociar.
  function ping() { send({ t: 'p', ts: Date.now() }); }
  var tick = Date.now();
  setInterval(function () {
    var now = Date.now(), stalled = now - tick > 3000; // el navegador tuvo el JS parado (suspendido): margen
    tick = now;
    if (!S.open || document.hidden) return;
    if (stalled) S.rx = Math.max(S.rx, now - 4000);
    if (now - S.rx > 7000) { S.open = false; releaseAll(); retry(S.gen); return; }
    ping();
  }, 1000);

  /* ================================================================ Conexión */
  function loadSeat() {
    var s = null; try { s = JSON.parse(store('arcade:pad:' + code) || 'null'); } catch (e) { s = null; }
    S.tok = s && s.tok || ''; S.p = s && s.p >= 0 ? s.p : -1;
  }
  function saveSeat() { store('arcade:pad:' + code, JSON.stringify({ tok: S.tok, p: S.p })); }

  function teardown() {
    S.open = false;
    if (S.pc) { try { S.pc.close(); } catch (e) { /* nada */ } }
    S.pc = S.dc = null;
  }

  function fail(msg) { teardown(); askCode(msg); }

  function connect() {
    var gen = ++S.gen;
    teardown();
    if (!window.RTCPeerConnection) { overlay('<h1>Navegador no compatible</h1><p>Este navegador no permite conexión directa (WebRTC). Prueba con Chrome o Safari actualizados.</p>'); return; }
    S.title = 'Conectando…'; setMe();
    overlay('<span class="pd-spin"></span><h1>Conectando con la tele…</h1><p>Sala <b>' + esc(code) + '</b></p>');
    var body = { tok: S.tok, name: '' };
    if (S.p >= 0) body.p = S.p;
    api('/' + code + '/join', { method: 'POST', body: body }).then(function (r) {
      if (gen !== S.gen) return null;
      if (r._status === 404) return fail('No hay ninguna sala con el código ' + code + '. Revisa la tele.');
      if (r._status === 409) return fail('La sala está completa (4 mandos).');
      if (r._status === 429) { overlay('<h1>Demasiados intentos</h1><p>Espera un momento…</p>'); return wait(15000).then(function () { if (gen === S.gen) connect(); }); }
      if (r._status !== 200) throw new Error('join');
      S.p = r.p; S.tok = r.tok; saveSeat(); setMe();
      return negotiate(gen);
    }).catch(function () { retry(gen); });
  }

  function retry(gen) {
    if (gen !== S.gen || S.retrying === gen) return; // onclose + failed llegan juntos: un solo reintento
    S.retrying = gen;
    teardown();
    S.retry++;
    var ms = Math.min(10000, 1000 * S.retry);
    overlay('<span class="pd-spin"></span><h1>Reconectando…</h1><p>Comprueba que el móvil tiene wifi y que la tele sigue abierta en la página del modo tele.</p>');
    setTimeout(function () { if (gen === S.gen) connect(); }, ms);
  }

  function negotiate(gen) {
    var pc = S.pc = new RTCPeerConnection({ iceServers: C.ice || [] });
    // Fiable pero sin orden: un paquete perdido no retiene a los siguientes (sin bloqueo de cabeza de línea);
    // cada pulsación lleva número de orden y la tele descarta las atrasadas. «Soltar» nunca se pierde.
    var dc = S.dc = pc.createDataChannel('arcade', { ordered: false });
    dc.onopen = function () {
      if (gen !== S.gen) return;
      S.open = true; S.retry = 0; S.rx = Date.now(); S.padSeq = -1;
      overlay('');
      send({ t: 'hi' });
      buzz(30);
    };
    dc.onmessage = function (m) {
      var d; try { d = JSON.parse(m.data); } catch (e) { return; }
      if (!d || gen !== S.gen) return;
      S.rx = Date.now();
      if (d.t === 'P') { S.rtt.push(Date.now() - d.ts); if (S.rtt.length > 200) S.rtt.shift(); }
      else if (d.t === 'you') { S.p = d.p; saveSeat(); setMe(); }
      else if (d.t === 'pad') {
        if (typeof d.s === 'number') { if (d.s <= S.padSeq) return; S.padSeq = d.s; }
        S.spec = d.pad || LOBBY; S.title = d.title || ''; build(S.spec); setMe();
      }
      else if (d.t === 'buzz') buzz(Math.min(400, d.ms | 0));
      else if (d.t === 'priv') priv(d.d);
    };
    dc.onclose = function () { if (gen === S.gen) { S.open = false; releaseAll(); retry(gen); } };
    var dead = function () { if (gen === S.gen && S.pc === pc) { S.open = false; releaseAll(); retry(gen); } };
    pc.onconnectionstatechange = function () { if (pc.connectionState === 'failed') dead(); };
    pc.oniceconnectionstatechange = function () { if (pc.iceConnectionState === 'failed') dead(); };
    var oid = 0;
    return pc.createOffer()
      .then(function (o) { return pc.setLocalDescription(o); })
      .then(function () { return gathered(pc, 2500); })
      .then(function () { return api('/' + code + '/offer', { method: 'POST', body: { p: S.p, tok: S.tok, sdp: pc.localDescription.sdp } }); })
      .then(function (r) {
        if (gen !== S.gen) return null;
        if (r._status === 409) { S.tok = ''; saveSeat(); return connect(); }
        if (r._status === 404) return fail('La sala ha caducado. Mira el código nuevo en la tele.');
        if (r._status !== 200) throw new Error('offer');
        oid = r.oid;
        return pollAnswer(gen, oid, Date.now());
      })
      .catch(function () { retry(gen); });
  }

  function pollAnswer(gen, oid, t0) {
    if (gen !== S.gen) return null;
    if (Date.now() - t0 > 25000) { retry(gen); return null; }
    return api('/' + code + '/answer?p=' + S.p + '&tok=' + encodeURIComponent(S.tok) + '&oid=' + oid).then(function (r) {
      if (gen !== S.gen) return null;
      if (r._status === 409) { S.tok = ''; saveSeat(); return connect(); }
      if (r._status === 404) return fail('La sala ha caducado. Mira el código nuevo en la tele.');
      if (r._status === 429) return wait(5000).then(function () { return pollAnswer(gen, oid, t0); });
      if (!r.sdp) return wait(1000).then(function () { return pollAnswer(gen, oid, t0); });
      return S.pc.setRemoteDescription({ type: 'answer', sdp: r.sdp }).then(function () {
        setTimeout(function () { if (gen === S.gen && !S.open) retry(gen); }, 15000);
      });
    });
  }

  /* ================================================================ Inicio */
  build(LOBBY);
  setMe();
  if (ALPHA.test(code)) { loadSeat(); connect(); } else askCode(code ? 'Código no válido.' : '');
  window.__pad = S;
})();
