## Arranque y bucle (lo que en el HTML hacen frame() y requestAnimationFrame).

var _acc := 0.0


func boot() -> void:
	KEYMAP = _data("KEYMAP")
	_boot_gen()
	loadArt()
	fitW()


## Un fotograma real: actualizaciones a 60 Hz fijos y un dibujo.
func frame(dt: float) -> void:
	_tick_timers(dt * 1000.0)
	_acc += minf(dt * 1000.0, 100.0)
	while _acc >= 16.67:
		update()
		_acc -= 16.67
	musicTick()
	if mode == "play" and lookVer != _warm_ver:
		warmLook()
	g.begin()
	draw()


## Las hojas del heroe con su ropa (lookSheet) se tinen pixel a pixel la primera
## vez que sale cada pose. En el navegador eso cuesta 1-2 ms; aqui decenas, y
## pasaba en mitad de la partida (al primer salto, al primer paso) como un tiron.
## Se hacen todas de una vez al entrar a jugar, y otra vez si cambia la ropa.
var _warm_ver: Variant = -1
func warmLook() -> void:
	_warm_ver = lookVer
	for key in SHEET.keys():
		var k := str(key)
		if k.begins_with("p_"):
			lookSheet(k.substr(2))
