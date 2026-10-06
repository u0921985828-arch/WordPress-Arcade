extends Node
## Coste por fotograma: --test=res://godot/tests/perf.gd --warp2=N [--frames2=600] [--boss]
## Juega con la entrada fija de parity.gd (derecha + fuego + saltos) y mide
## update() y g.begin()+draw() por separado (medias, p95 y maximo).
var main: Node
var game: Game

func _stats(a: Array) -> String:
	a.sort()
	var s := 0.0
	for v in a:
		s += v
	return "media %.2f  p95 %.2f  max %.2f" % [s / a.size(), a[int(a.size() * 0.95)], a[a.size() - 1]]

func run() -> void:
	main.set_process(false)
	var a: Dictionary = main.args
	var n := int(a.get("warp2", "11"))
	var frames := int(a.get("frames2", "600"))
	game.store_off = true
	game.DEBUG = true
	game.SET["tut"] = false
	game.t = 0
	game.newRun()
	game.rnd_seed(1)
	game.CUR = null
	game.win["__god"] = true
	game.enterLevel(n, false)
	if a.has("boss"):
		game.p.x = game.st.arenaX + 60
		game.p.y = game.GY - game.p.h - 30
		game.p.vy = 0
		game.cam = game.st.arenaX - 40
		var k := 0
		while k < 3000 and not (game.boss and game._truthy(game.boss.get("on"))):
			game.update()
			k += 1
		while game.mode == "cut":
			game.cutSkip()
	var tu := []
	var td := []
	var ne := 0
	for i in frames:
		game.K["ArrowRight"] = 1 if (i % 300) < 220 else 0
		game.K["KeyX"] = 1
		game.K["Space"] = 1 if (i % 40) < 10 else 0
		if game.mode == "cut":
			game.cutAdv()
		var t0 := Time.get_ticks_usec()
		game.update()
		var t1 := Time.get_ticks_usec()
		game.g.begin()
		game.draw()
		var t2 := Time.get_ticks_usec()
		if (t2 - t0) > 12000:
			print("PERF pico frame %d upd %.1f draw %.1f modo %s" % [i, (t1 - t0) / 1000.0, (t2 - t1) / 1000.0, game.mode])
		tu.append((t1 - t0) / 1000.0)
		td.append((t2 - t1) / 1000.0)
		ne = maxi(ne, game._len(game.enemies))
		main._clip_canvas()
		main.position = game.origin
		main.scale = Vector2(game.ZOOM, game.ZOOM)
		await get_tree().process_frame
	print("PERF fase %d enemigos<=%d modo=%s" % [n, ne, game.mode])
	print("PERF update  ", _stats(tu))
	print("PERF draw    ", _stats(td))
	var tot := []
	for i in tu.size():
		tot.append(tu[i] + td[i])
	print("PERF total   ", _stats(tot))
	get_tree().quit()
