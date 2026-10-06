extends Node
## Mide lo que cuesta construir cada cache de dibujo la primera vez.
var main: Node
var game: Game

func _t(name: String, c: Callable) -> void:
	var t0 := Time.get_ticks_usec()
	ImgCtx.PT.clear()
	c.call()
	print("WARM %-22s %.1f ms  %s" % [name, (Time.get_ticks_usec() - t0) / 1000.0, ImgCtx.PT])

func run() -> void:
	main.set_process(false)
	game.store_off = true
	game.newRun()
	game.enterLevel(0, false)
	for s in ["idle", "run", "jump", "fall", "dash", "hurt", "shoot", "duck", "wall"]:
		game.lookVer += 1
		_t("lookSheet " + s, func(): game.lookSheet(s))
	for r in [10, 14, 24, 40, 60]:
		_t("lightSpr %d" % r, func(): game.lightSpr(r, "#ffd23f"))
	_t("tintSheet b_0", func(): game.tintSheet("b_0"))
	_t("draw frame", func(): game.g.begin(); game.draw())
	_t("draw frame2", func(): game.g.begin(); game.draw())
	get_tree().quit()
