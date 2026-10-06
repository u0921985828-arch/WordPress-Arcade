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
var _vp: SubViewport
var _spr: Sprite2D


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	game = Game.new()
	# El juego pinta en un SubViewport del tamano exacto del <canvas> (cv.width x
	# cv.height) y ese lienzo se amplia con zoom entero y filtro nearest, como el
	# navegador amplia el <canvas> por CSS. Asi lo que cae entre dos pixeles del
	# lienzo se resuelve a su pixel (no a media celda de pantalla) y el "lighter"
	# y la persistencia del lienzo se comportan igual.
	_vp = SubViewport.new()
	_vp.disable_3d = true
	_vp.transparent_bg = false
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_vp.render_target_clear_mode = SubViewport.CLEAR_MODE_ALWAYS
	_vp.canvas_item_default_texture_filter = Viewport.DEFAULT_CANVAS_ITEM_TEXTURE_FILTER_NEAREST
	_vp.size = Vector2i(2, 2)
	add_child(_vp)
	var root := Node2D.new()
	_vp.add_child(root)
	_spr = Sprite2D.new()
	_spr.centered = false
	_spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_spr.texture = _vp.get_texture()
	add_child(_spr)
	game.g = Ctx.new(root.get_canvas_item())
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
	var fl := CanvasLayer.new()
	fl.layer = -1
	add_child(fl)
	fl.add_child(FrameRing.new(game))
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
		var ts = load(args.test)
		if ts == null or not ts.can_instantiate():
			push_error("no se pudo cargar la prueba " + args.test)
			get_tree().quit(1)
			return
		var t: Node = ts.new()
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
	_clip_canvas()


## El lienzo (SubViewport) recorta como un <canvas>: lo que el juego pinta
## fuera no se ve. Su tamano cambia tambien al entrar y salir de la partida
## (fitW), no solo al redimensionar la ventana.
var _clip_sz := Vector2i.ZERO
func _clip_canvas() -> void:
	var sz := Vector2i(int(game.cv.width), int(game.cv.height))
	if sz == _clip_sz:
		return
	_clip_sz = sz
	_vp.size = sz.maxi(1)


func _process(dt: float) -> void:
	game.frame(dt)
	_clip_canvas()
	position = game.origin
	scale = Vector2(game.ZOOM, game.ZOOM)
	nframe += 1
	if args.has("shot") and nframe == int(args.get("frames", "30")):
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(args.shot)
		get_tree().quit()


## Primer evento de cada mando en el registro (logcat): diagnóstico en móviles.
var _pads_seen := {}


func _input(e: InputEvent) -> void:
	if (e is InputEventJoypadButton or e is InputEventJoypadMotion) and not _pads_seen.has(e.device):
		_pads_seen[e.device] = true
		print("Dub Siege: mando %d (%s) %s" % [e.device, Input.get_joy_name(e.device), e.as_text()])


func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventKey:
		if game.key_event(e):
			get_viewport().set_input_as_handled()


## Atras (Android) = Esc del juego; dos veces seguidas en 1,5 s sale (como la app anterior).
var _last_back := -10000
var _toast: Label


func _go_back() -> void:
	var now := Time.get_ticks_msec()
	if now - _last_back < 1500:
		get_tree().quit()
		return
	_last_back = now
	for down in [true, false]:
		var e := InputEventKey.new()
		e.keycode = KEY_ESCAPE
		e.physical_keycode = KEY_ESCAPE
		e.pressed = down
		Input.parse_input_event(e)
	if _toast == null:
		var cl := CanvasLayer.new()
		cl.layer = 20
		add_child(cl)
		_toast = Label.new()
		_toast.text = "Pulsa atrás otra vez para salir"
		_toast.add_theme_font_size_override("font_size", int(14 * game._dpr()))
		_toast.add_theme_color_override("font_color", Color("#eef3ff"))
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(0.07, 0.09, 0.19, 0.92)
		sb.set_corner_radius_all(int(16 * game._dpr()))
		sb.set_content_margin_all(10 * game._dpr())
		_toast.add_theme_stylebox_override("normal", sb)
		cl.add_child(_toast)
	_toast.visible = true
	_toast.reset_size()
	var vs := get_viewport_rect().size
	_toast.position = Vector2((vs.x - _toast.size.x) / 2.0, vs.y - _toast.size.y - 48 * game._dpr())
	get_tree().create_timer(2.0).timeout.connect(func():
		if Time.get_ticks_msec() - _last_back >= 1900:
			_toast.visible = false)


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_GO_BACK_REQUEST:
		_go_back()
		return
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_APPLICATION_PAUSED:
		if game:
			game.focus_lost()
