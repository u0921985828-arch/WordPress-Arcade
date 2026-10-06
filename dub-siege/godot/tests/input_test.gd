extends Node
## Teclado y mando: mover, saltar, disparar, objeto rapido (E / LB), pausa (Escape / Start).
var main
var game
var res := []

func key(code: int, down: bool) -> void:
	var e := InputEventKey.new()
	e.physical_keycode = code
	e.keycode = code
	e.pressed = down
	Input.parse_input_event(e)

func jb(b: int, down: bool) -> void:
	var e := InputEventJoypadButton.new()
	e.device = 0
	e.button_index = b
	e.pressed = down
	Input.parse_input_event(e)

func jax(a: int, v: float) -> void:
	var e := InputEventJoypadMotion.new()
	e.device = 0
	e.axis = a
	e.axis_value = v
	Input.parse_input_event(e)

func wait(n: int) -> void:
	for i in n:
		await get_tree().process_frame

## Espera N pasos de juego (no fotogramas de pantalla): asi la prueba no
## depende de lo rapido que vaya la maquina.
func steps(n: int) -> void:
	var t0: int = int(game.t)
	var guard := 0
	while int(game.t) - t0 < n and guard < 2000:
		guard += 1
		await get_tree().process_frame

func check(name: String, ok: bool, v = null) -> void:
	res.append([name, ok, v])

func run() -> void:
	await wait(60)
	var x0: float = game.p.x
	key(KEY_RIGHT, true); await steps(30); key(KEY_RIGHT, false)
	check("teclado derecha", game.p.x > x0 + 20, game.p.x - x0)
	await wait(30)
	key(KEY_SPACE, true); await wait(4)
	check("teclado salto", game.p.vy < 0, game.p.vy)
	key(KEY_SPACE, false); await wait(60)
	var nb: int = game.bullets.size()
	key(KEY_X, true); await wait(6)
	check("teclado disparo", game.bullets.size() > nb, game.bullets.size())
	key(KEY_X, false); await wait(10)
	key(KEY_ESCAPE, true); await wait(3); key(KEY_ESCAPE, false); await wait(5)
	check("teclado pausa", game.mode == "pause", game.mode)
	key(KEY_ESCAPE, true); await wait(3); key(KEY_ESCAPE, false); await wait(5)
	check("teclado reanuda", game.mode == "play", game.mode)
	# objeto rapido con E (botiquin)
	game.run.inv.kit = 1; game.run.qk = "kit"; game.p.hp = 1
	key(KEY_E, true); await steps(3); key(KEY_E, false); await steps(3)
	check("teclado objeto (E)", game.p.hp > 1 and int(game.run.inv.kit) == 0, game.p.hp)
	# mando
	game.test_pad = 0
	await wait(30)
	x0 = game.p.x
	jax(JOY_AXIS_LEFT_X, 1.0); await steps(30); jax(JOY_AXIS_LEFT_X, 0.0)
	check("mando palanca", game.p.x > x0 + 10, game.p.x - x0)
	await wait(30)
	jb(JOY_BUTTON_A, true); await wait(4)
	check("mando salto (A)", game.p.vy < 0, game.p.vy)
	jb(JOY_BUTTON_A, false); await wait(60)
	nb = game.bullets.size()
	jb(JOY_BUTTON_X, true); await wait(6)
	check("mando disparo (X)", game.bullets.size() > nb, game.bullets.size())
	jb(JOY_BUTTON_X, false); await wait(10)
	game.run.inv.kit = 1; game.run.qk = "kit"; game.p.hp = 1
	jb(JOY_BUTTON_LEFT_SHOULDER, true); await steps(3); jb(JOY_BUTTON_LEFT_SHOULDER, false); await steps(3)
	check("mando objeto (LB)", game.p.hp > 1 and int(game.run.inv.kit) == 0, game.p.hp)
	jb(JOY_BUTTON_START, true); await wait(3); jb(JOY_BUTTON_START, false); await wait(5)
	check("mando pausa (Start)", game.mode == "pause", game.mode)
	var ok := 0
	for r in res:
		print("INPUT ", r[0], ": ", "OK" if r[1] else "MAL", " ", r[2])
		if r[1]: ok += 1
	print("INPUT RESULTADO %d/%d" % [ok, res.size()])
	get_tree().quit()
