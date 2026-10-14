/* Landrace Hunters · pantalla completa al primer toque.
 * El navegador solo deja entrar en pantalla completa tras un gesto (toque, clic o tecla),
 * así que se pide en el primero. En el móvil se vuelve a pedir en cada toque si se ha salido;
 * en el ordenador solo la primera vez (Esc tiene que valer para salir). */
(function () {
	var d = document, de = d.documentElement;
	var coarse = matchMedia('(pointer:coarse)').matches;
	var app = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
	var can = !!(de.requestFullscreen || de.webkitRequestFullscreen);
	var asked = false, busy = false;

	function isFS() { return !!(d.fullscreenElement || d.webkitFullscreenElement); }
	function lock() {
		try {
			var o = screen.orientation;
			if (o && o.lock) o.lock('landscape').catch(function () {});
		} catch (e) {}
	}
	function go(e) {
		if (e && e.target && e.target.closest && e.target.closest('#lh-inst')) return;
		hideRot();
		if (app || !can || busy || isFS()) return;
		if (!coarse && asked) return;
		asked = true; busy = true;
		var r;
		try { r = de.requestFullscreen ? de.requestFullscreen({ navigationUI: 'hide' }) : de.webkitRequestFullscreen(); } catch (e) {}
		if (r && r.then) r.then(lock, function () {}).then(function () { busy = false; });
		else { busy = false; setTimeout(lock, 120); }
	}
	['pointerup', 'touchend', 'mousedown', 'keydown'].forEach(function (ev) {
		window.addEventListener(ev, go, { capture: true, passive: true });
	});

	/* Aviso en vertical: el juego es apaisado. Se quita al tocar o al girar. */
	var rot = d.getElementById('lh-rot');
	function hideRot() { if (rot) rot.classList.add('off'); }
	if (rot && coarse && !app && !can) {
		/* iPhone: no hay pantalla completa desde la web; el aviso de abajo explica cómo instalarlo. */
		var t = rot.querySelector('small');
		if (t) t.textContent = 'Toca para jugar.';
	}

	/* Instalar como app: abierta desde el icono va sin barras desde el principio.
	 * Android (Chrome) ofrece el botón Instalar con beforeinstallprompt; si el navegador no lo
	 * ofrece, se explica el menú. iPhone no tiene botón posible: se explica Compartir. */
	if (app || !coarse) return;
	var KEY = 'lh-inst-off', ua = navigator.userAgent;
	var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	var android = /Android/i.test(ua);
	try { if (Date.now() - (+localStorage.getItem(KEY) || 0) < 7 * 864e5) return; } catch (e) {}
	var ask = null, box = null, shown = false;
	var SHARE = '<svg width="16" height="18" viewBox="0 0 16 18" aria-label="Compartir"><path d="M8 1v11M4 5l4-4 4 4M3 8H1.5v9h13V8H13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	function close(save) {
		if (box) box.classList.add('off');
		if (save) { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
	}
	function show(html, btn) {
		if (shown) return;
		shown = true;
		box = d.createElement('div');
		box.id = 'lh-inst';
		box.setAttribute('role', 'dialog');
		box.innerHTML = '<p>' + html + '</p>' + (btn ? '<button type="button" class="lh-go">Instalar</button>' : '')
			+ '<button type="button" class="lh-x" aria-label="Cerrar">×</button>';
		d.body.appendChild(box);
		/* Tapa parte del juego: si no se toca, se va solo a los 15 s (y vuelve en la siguiente visita). */
		setTimeout(function () { close(false); }, 15000);
		box.querySelector('.lh-x').addEventListener('click', function () { close(true); go(); });
		if (btn) box.querySelector('.lh-go').addEventListener('click', function () {
			if (!ask) return;
			ask.prompt();
			(ask.userChoice || Promise.resolve({})).then(function (c) { close(c && c.outcome === 'accepted'); if (!c || c.outcome !== 'accepted') go(); });
			ask = null;
		});
	}
	window.addEventListener('beforeinstallprompt', function (e) {
		e.preventDefault();
		ask = e;
		show('<b>Juega sin barras:</b> instálalo como app.', true);
	});
	window.addEventListener('appinstalled', function () { close(true); });
	setTimeout(function () {
		if (ios) show('<b>Juega sin barras:</b> toca ' + SHARE + ' Compartir y luego «Añadir a pantalla de inicio».');
		else if (android) show('<b>Juega sin barras:</b> menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».');
	}, ios ? 1500 : 4000);
})();
