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
	g.begin()
	draw()
