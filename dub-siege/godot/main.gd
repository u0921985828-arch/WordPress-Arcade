extends Node2D
## Nodo principal: crea el juego (game.gd), le pasa la ventana, el tiempo y
## la entrada, y coloca el lienzo con zoom entero (pixel siempre cuadrado).
##
## Pruebas (argumentos tras --): --shot=ruta.png --frames=N --warp=fase
## --menu=NOMBRE (title, opts, slots, slot, shop, controls, rank, archive,
## tape, look, pause, over, win, clear) --play (salta el menu) --bot=archivo.gd (guion de prueba, ver tools/).

var game: Game
var args := {}
var nframe := 0
var pad: TouchPad


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	game = Game.new()
	game.g = Ctx.new(get_canvas_item())
	game.touch_ui = DisplayServer.is_touchscreen_available() or args.has("touch")
	if args.has("dpr"):
		game.dpr_override = float(args.dpr)
	var ad := AudioDirector.new()
	add_child(ad)
	game.audio = ad
	game.boot()
	# menus (#ov) en una capa por encima del juego
	var lay := CanvasLayer.new()
	lay.layer = 10
	add_child(lay)
	var uv := UiView.new()
	lay.add_child(uv)
	uv.setup(game)
	game.ui_view = uv
	game.document.ui.on_click = game._ui_click
	game.win["devicePixelRatio"] = game._dpr()
	ad.set_mute(game._truthy(game.SET.get("mute")))
	# mandos tactiles en su capa, por debajo de los menus (capa 5 en la web)
	var tl := CanvasLayer.new()
	tl.layer = 4
	add_child(tl)
	pad = TouchPad.new(game)
	tl.add_child(pad)
	_resize()
	get_viewport().size_changed.connect(_resize)
	if args.has("warp"):
		game.newRun()
		game.buildStage(int(args.warp))
		game.mode = "play"
	elif args.has("menu"):
		game.menu_test(args.menu)
	else:
		game.showMenu()
	if args.has("test"):
		var t: Node = load(args.test).new()
		t.set("main", self)
		t.set("game", game)
		add_child(t)
		t.call_deferred("run")


func _resize() -> void:
	game.view_size = get_viewport_rect().size
	var sa := DisplayServer.get_display_safe_area()
	var win := DisplayServer.window_get_position()
	var r := Rect2(Vector2(sa.position - win), Vector2(sa.size)).intersection(Rect2(Vector2.ZERO, game.view_size))
	game.safe = r if r.has_area() and OS.has_feature("mobile") else Rect2(Vector2.ZERO, game.view_size)
	game.fitW()
	# el lienzo recorta como un <canvas>: lo que el juego pinta fuera no se ve
	var ci := get_canvas_item()
	RenderingServer.canvas_item_set_custom_rect(ci, true, Rect2(0, 0, game.cv.width, game.cv.height))
	RenderingServer.canvas_item_set_clip(ci, true)


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
