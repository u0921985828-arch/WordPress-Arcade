extends Node2D
## Nodo principal: crea el juego (game.gd), le pasa la ventana, el tiempo y
## la entrada, y coloca el lienzo con zoom entero (pixel siempre cuadrado).
##
## Pruebas (argumentos tras --): --shot=ruta.png --frames=N --warp=fase
## --play (salta el menu) --bot=archivo.gd (guion de prueba, ver tools/).

var game: Game
var args := {}
var nframe := 0


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	game = Game.new()
	game.g = Ctx.new(get_canvas_item())
	game.touch_ui = DisplayServer.is_touchscreen_available()
	game.boot()
	_resize()
	get_viewport().size_changed.connect(_resize)
	if args.has("warp"):
		game.newRun()
		game.buildStage(int(args.warp))
		game.mode = "play"
	else:
		game.showMenu()


func _resize() -> void:
	game.view_size = get_viewport_rect().size
	var sa := DisplayServer.get_display_safe_area()
	var win := DisplayServer.window_get_position()
	var r := Rect2(Vector2(sa.position - win), Vector2(sa.size)).intersection(Rect2(Vector2.ZERO, game.view_size))
	game.safe = r if r.has_area() and OS.has_feature("mobile") else Rect2(Vector2.ZERO, game.view_size)
	game.fitW()


func _process(dt: float) -> void:
	game.frame(dt)
	position = game.origin
	scale = Vector2(game.ZOOM, game.ZOOM)
	nframe += 1
	if args.has("shot") and nframe == int(args.get("frames", "30")):
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(args.shot)
		get_tree().quit()


func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventKey:
		if game.key_event(e):
			get_viewport().set_input_as_handled()


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_APPLICATION_PAUSED:
		if game:
			game.focus_lost()
