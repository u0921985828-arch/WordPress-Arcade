extends Node
## Paridad con la web: misma semilla, misma fase, N pasos exactos y captura.
## --test=res://godot/tests/parity.gd --warp2=N --steps=300 [--boss] [--cut] [--seed=1] --out=x.png
## (sin --warp: lo hace este guion para fijar la semilla antes de construir la fase)
var main: Node
var game: Game

func run() -> void:
	main.set_process(false)
	var a: Dictionary = main.args
	var n := int(a.get("warp2", "0"))
	var steps := int(a.get("steps", "300"))
	game.store_off = true
	game.SET["tut"] = false
	game.t = 0
	game.newRun()
	game.rnd_seed(int(a.get("seed", "1")))
	game.CUR = null
	game.enterLevel(n, a.has("cut"))
	if a.has("boss"):
		game.win["__god"] = true
		game.p.x = game.st.arenaX + 60
		game.p.y = game.GY - game.p.h - 30
		game.p.vy = 0
		game.cam = game.st.arenaX - 40
		var k := 0
		while k < 3000 and not (game.boss and game.boss.get("on")):
			game.update()
			k += 1
		print("PARITY boss on tras ", k)
	var t0 := Time.get_ticks_usec()
	var inp := a.has("inp")
	for i in steps:
		if inp:
			game.K["ArrowRight"] = 1
			game.K["KeyX"] = 1
			game.K["Space"] = 1 if (i % 40) < 10 else 0
			game.K["KeyC"] = 1 if (i % 97) == 50 else 0
		game.update()
	var t1 := Time.get_ticks_usec()
	game.g.begin()
	game.draw()
	main._clip_canvas()
	main.position = game.origin
	main.scale = Vector2(game.ZOOM, game.ZOOM)
	print("PARITY upd_ms=%.3f" % [(t1 - t0) / 1000.0 / steps])
	print("PARITY ", JSON.stringify({mode = game.mode, x = roundi(game.p.x), y = roundi(game.p.y), en = game._len(game.enemies), cam = game.cam, boss = game.boss != null and game._truthy(game.boss.get("on")), r = game._rnd()}))
	var ev := []
	for e in game.enemies:
		if e.x > game.cam - 20 and e.x < game.cam + game.W + 20 and not game._truthy(e.get("dead")):
			ev.append("%s %.4f %.4f %.3f" % [e.type, e.x - game.cam, e.y, float(e.get("a", 0))])
	print("PARITY EN ", " | ".join(ev))
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	main.get_viewport().get_texture().get_image().save_png(a.get("out", "/tmp/gt/p.png"))
	get_tree().quit()
