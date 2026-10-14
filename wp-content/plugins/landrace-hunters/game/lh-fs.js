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
	function go() {
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
		/* iPhone: no hay pantalla completa desde la web; se explica cómo tenerla. */
		var t = rot.querySelector('small');
		if (t) t.textContent = 'Para quitar la barra del navegador: Compartir → «Añadir a pantalla de inicio».';
	}
})();
