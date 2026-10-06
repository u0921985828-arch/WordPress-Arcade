extends Node
## Prueba de los mandos tactiles: --test=res://godot/tests/touch_test.gd --warp=0 --touch
## Necesita ventana real (no --headless): xvfb-run godot --path . --resolution 1280x720 -- ...
var main: Node
var game: Game

func _touch(i: int, p: Vector2, on: bool) -> void:
	var e := InputEventScreenTouch.new()
	e.index = i
	e.position = p
	e.pressed = on
	Input.parse_input_event(e)

func _drag(i: int, p: Vector2) -> void:
	var e := InputEventScreenDrag.new()
	e.index = i
	e.position = p
	Input.parse_input_event(e)

func _wait(n: int) -> void:
	for i in n:
		await get_tree().process_frame

func run() -> void:
	await _wait(60)
	var pad: TouchPad = main.pad
	print("TEST estado modo=", game.mode, " tactil=", game.touchMode(), " visible=", pad.visible, " zona=", pad.stick_zone)
	var res := []
	# palanca a la derecha
	var x0: float = game.p.x
	var s := pad.stick_zone.get_center()
	_touch(0, s, true)
	await _wait(2)
	_drag(0, s + Vector2(30, 0))
	await _wait(40)
	res.append(["palanca derecha mueve", game.p.x > x0 + 10, game.p.x - x0])
	_touch(0, s + Vector2(30, 0), false)
	await _wait(5)
	res.append(["palanca suelta", game.TS.R == 0, game.TS.R])
	# salto corto
	await _wait(30)
	var y0: float = game.p.y
	var j: Vector2 = pad.pads.j.c
	_touch(1, j, true)
	await _wait(3)
	_touch(1, j, false)
	var miny := y0
	for i in 30:
		await get_tree().process_frame
		miny = minf(miny, game.p.y)
	res.append(["salto", miny < y0 - 8, y0 - miny])
	await _wait(60)
	# mantener = dash
	_touch(1, j, true)
	await _wait(20)
	res.append(["mantener = dash", game.p.get("dash", 0) > 0 or game.jd.dash == 1, game.jd.dash])
	_touch(1, j, false)
	await _wait(30)
	# fuego
	var nb: int = 0
	_touch(2, pad.pads.f.c, true)
	for i in 20:
		await get_tree().process_frame
		nb = maxi(nb, game.bullets.size())
	_touch(2, pad.pads.f.c, false)
	res.append(["fuego dispara", nb > 0, nb])
	# OBJ: boton rapido de la mochila (botiquin)
	await _wait(20)
	game.run.inv.kit = 1
	game.run.qk = "kit"
	game.p.hp = 1
	_touch(4, pad.pads.it.c, true)
	await _wait(4)
	_touch(4, pad.pads.it.c, false)
	await _wait(4)
	res.append(["OBJ usa botiquin", game.p.hp > 1 and int(game.run.inv.kit) == 0, game.p.hp])
	# pausa
	_touch(3, pad.tp.get_center(), true)
	await _wait(3)
	_touch(3, pad.tp.get_center(), false)
	res.append(["pausa", game.mode == "pause", game.mode])
	var ok := true
	for r in res:
		print("TEST ", "OK  " if r[1] else "MAL ", r[0], " (", r[2], ")")
		ok = ok and r[1]
	print("TEST RESULTADO ", "OK" if ok else "MAL")
	get_tree().quit()
