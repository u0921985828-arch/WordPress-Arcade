## Menus (show/hideOv del HTML): el arbol lo guarda rt/ui.gd y lo pinta
## rt/ui_view.gd. Aqui va lo que en el HTML hacen los manejadores de eventos:
## el clic en un boton (act), el teclado con un menu abierto (keydown) y, como
## extra de la app, el mando moviendo el foco por los botones.

var ui_view: Object = null           # UiView (main.gd)
var _mp := {}                        # mando en menus: estado anterior
var _mp_rep := 0.0                   # repeticion de arriba/abajo con el mando


func menu_open() -> bool:
	return not document.ui.ov.hidden


## $('ov').addEventListener('click', ...): boton pulsado con raton o toque.
func _ui_click(el: Variant) -> void:
	if el == null:
		return
	var b = el.closest("[data-act]")
	if b and not b.disabled:
		act(b.getAttribute("data-act"), b.getAttribute("data-v"))


## keydown con el menu abierto (ver addEventListener('keydown') en el HTML).
func menu_key(code: String, e: InputEventKey) -> bool:
	if ui_view:
		ui_view.set_kbd()
	if S_("tg0"):
		var ch := String.chr(e.unicode).to_upper() if e.unicode > 0 else ""
		if ch.length() == 1 and str(TGC).find(ch) > -1:
			tgType(ch)
			return true
		if code == "Backspace":
			TGi = maxi(0, TGi - 1)
			tgPaint()
			return true
	_menu_cmd(code, e.echo)
	return true


func _menu_cmd(code: String, echo := false) -> void:
	var ov: DomEl = document.ui.ov
	if code in ["ArrowDown", "ArrowUp", "KeyS", "KeyW"]:
		var bs: Array = ov.querySelectorAll("button:not(:disabled)")
		if bs.size():
			var ix := bs.find(document.ui.focus_el())
			var dn := code == "ArrowDown" or code == "KeyS"
			bs[(ix + (1 if dn else -1) + bs.size()) % bs.size()].focus()
		return
	if code in ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"]:
		var fb: DomEl = document.ui.focus_el()
		if fb and fb.getAttribute("data-act") == "lk":
			lookStep(fb.getAttribute("data-v"), -1 if (code == "ArrowLeft" or code == "KeyA") else 1)
		return
	if (code == "Escape" or code == "KeyP") and mode == "pause":
		if not echo:
			resume()
		return
	if code == "Escape":
		if back and not echo:
			_callv(back, [])
		return
	# Intro/Espacio sobre un boton con foco: lo pulsa (lo hace el navegador)
	if (code == "Enter" or code == "Space") and not echo:
		var f: DomEl = document.ui.focus_el()
		if f and f.tagName == "BUTTON" and not f.disabled:
			f.click()


## Cada fotograma (UiView): el mando en los menus. Cruceta/palanca mueven el
## foco (con repeticion), A pulsa, B = atras, START reanuda la pausa.
func menu_tick() -> void:
	if not menu_open():
		_mp = {}
		return
	var pads := Input.get_connected_joypads()
	if pads.is_empty():
		return
	var d: int = pads[0]
	var ay := Input.get_joy_axis(d, JOY_AXIS_LEFT_Y)
	var ax := Input.get_joy_axis(d, JOY_AXIS_LEFT_X)
	var now := {
		"u": ay < -0.5 or Input.is_joy_button_pressed(d, JOY_BUTTON_DPAD_UP),
		"d": ay > 0.5 or Input.is_joy_button_pressed(d, JOY_BUTTON_DPAD_DOWN),
		"l": ax < -0.5 or Input.is_joy_button_pressed(d, JOY_BUTTON_DPAD_LEFT),
		"r": ax > 0.5 or Input.is_joy_button_pressed(d, JOY_BUTTON_DPAD_RIGHT),
		"a": Input.is_joy_button_pressed(d, JOY_BUTTON_A),
		"b": Input.is_joy_button_pressed(d, JOY_BUTTON_B),
		"s": Input.is_joy_button_pressed(d, JOY_BUTTON_START),
	}
	if _mp.is_empty():
		_mp = now    # lo que ya estaba pulsado al abrirse el menu no cuenta
		return
	var prev := _mp
	_mp = now
	var edge := func(k: String) -> bool: return now[k] and not prev[k]
	var any: bool = now.values().has(true)
	if any and ui_view:
		ui_view.set_kbd()
	if now.u or now.d:
		if edge.call("u") or edge.call("d"):
			_mp_rep = _clock + 380.0
			_menu_cmd("ArrowUp" if now.u else "ArrowDown")
		elif _clock >= _mp_rep:
			_mp_rep = _clock + 110.0
			_menu_cmd("ArrowUp" if now.u else "ArrowDown")
	if edge.call("l"):
		_menu_cmd("ArrowLeft")
	if edge.call("r"):
		_menu_cmd("ArrowRight")
	if edge.call("a"):
		var f: DomEl = document.ui.focus_el()
		if f == null:
			_menu_cmd("ArrowDown")
		else:
			_menu_cmd("Enter")
	elif edge.call("b"):
		_menu_cmd("Escape")
	elif edge.call("s") and mode == "pause":
		resume()


## --menu=NOMBRE (main.gd): deja el juego en esa pantalla para capturarla.
## Mismo estado que tools/menus (Playwright) prepara en la web.
func menu_test(n: String) -> void:
	store_off = true
	_store = {}
	_store_ok = true
	match n:
		"title":
			showMenu()
		"opts":
			showMenu()
			showOpts()
		"slots", "slot":
			newRun()
			buildStage(0)
			CUR = 0
			slotSave("play", 0)
			CUR = null
			if n == "slots":
				showSlots()
			else:
				showSlot(0)
		"shop":
			newRun()
			buildStage(0)
			run.coins = 60
			showShop()
		"controls":
			showMenu()
			showControls()
		"rank":
			newRun()
			buildStage(0)
			mode = "over"
			pend = {"score": 5000, "st": "F1", "d": "N"}
			showRank()
		"archive", "tape":
			showMenu()
			LOREN = 5
			if n == "archive":
				showArchive()
			else:
				showArchive(4)
		"look":
			showMenu()
			showLook()
		"pause", "over", "win", "clear":
			newRun()
			buildStage(_len(LEVELS) - 1 if n == "win" else 0)
			mode = "play"
			match n:
				"pause":
					pause()
				"over":
					gameOver()
				"win":
					showWin()
				"clear":
					finishStage()
		_:
			showMenu()
