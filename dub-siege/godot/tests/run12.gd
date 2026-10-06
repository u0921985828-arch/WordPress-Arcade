extends Node
## Bot de las 12 fases: escena previa, jefe a golpes (modo dios) y escena final.
## --test=res://godot/tests/run12.gd [--from=N] (con --headless va rapido)
var main: Node
var game: Game

func _step(n: int) -> void:
	for i in n:
		game.update()
		await get_tree().process_frame

func run() -> void:
	var from := int(main.args.get("from", "0"))
	game.DEBUG = true
	game.win["__god"] = true
	game.newRun()
	var ok := 0
	for n in range(from, 12):
		game.CUR = null
		game.enterLevel(n, true)
		var cuts := 0
		var t := 0
		var boss_seen := false
		var arena := false
		while t < 9000:
			t += 1
			if game.mode == "cut":
				if t % 6 == 0:
					cuts += 1
					game.cutAdv()
				await _step(1)
				continue
			if game.mode != "play":
				break
			if not arena:
				arena = true
				game.p.x = game.st.arenaX + 60
				game.p.y = game.GY - game.p.h - 30
				game.p.vy = 0
				game.cam = game.st.arenaX - 40
			if game.boss and game.boss.get("on"):
				boss_seen = true
				if t % 10 == 0:
					game.damageBoss(25)
			await _step(1)
		var m: String = game.mode
		var good := boss_seen and (m == "shop" or m == "win")
		if good:
			ok += 1
		print("RUN12 fase %d: modo=%s jefe=%s cortes=%d pasos=%d %s" % [n + 1, m, boss_seen, cuts, t, "OK" if good else "MAL"])
	print("RUN12 RESULTADO %d/%d" % [ok, 12 - from])
	get_tree().quit()
