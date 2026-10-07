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


## show() del HTML: el foco se pone al momento y, si el panel se repinta (comprar
## en la tienda), vuelve al mismo boton (mismo data-act y data-v).
func show(html: Variant = null) -> void:
	var o: DomEl = S_("ov")
	var a: DomEl = document.ui.focus_el()
	var key = [a.getAttribute("data-act"), a.getAttribute("data-v")] if a != null and a.getAttribute("data-act") != null else null
	o.classList.remove("title")
	o.innerHTML = html
	o.hidden = false
	var f = null
	if key != null:
		var sel := "button[data-act=\"%s\"]" % key[0]
		if key[1] != null:
			sel += "[data-v=\"%s\"]" % key[1]
		f = o.querySelector(sel + ":not(:disabled)")
	if f == null:
		f = o.querySelector("button:not(:disabled),input")
	if f:
		f.focus()


## Flechas en los menus: el boton mas cercano en esa direccion (ver navMove en
## el HTML). Usa las cajas que ha medido UiView.
func navMove(bs: Array, dx: int, dy: int) -> void:
	if bs.is_empty():
		return
	var cur: DomEl = document.ui.focus_el()
	var ix := bs.find(cur)
	if ix < 0:
		bs[0].focus()
		return
	var r = ui_view.rect_of(cur) if ui_view else null
	var best: DomEl = null
	var bv := 1e9
	if r != null:
		var c: Vector2 = r.get_center()
		for b in bs:
			if b == cur:
				continue
			var q = ui_view.rect_of(b)
			if q == null:
				continue
			var d: Vector2 = q.get_center() - c
			var along: float = d.x * dx if dx != 0 else d.y * dy
			var side: float = absf(d.y) if dx != 0 else absf(d.x)
			if along < 4:
				continue
			if dx != 0 and side > maxf(r.size.y, q.size.y):
				continue
			var v := along + side * 2
			if v < bv:
				bv = v
				best = b
	if best:
		best.focus()
	elif dy != 0:
		bs[(ix + dy + bs.size()) % bs.size()].focus()


func _menu_cmd(code: String, echo := false) -> void:
	var ov: DomEl = document.ui.ov
	if code in ["ArrowDown", "ArrowUp", "KeyS", "KeyW"]:
		var bs: Array = ov.querySelectorAll("button:not(:disabled)")
		if bs.size():
			navMove(bs, 0, 1 if (code == "ArrowDown" or code == "KeyS") else -1)
		return
	if code in ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"]:
		var fb: DomEl = document.ui.focus_el()
		var lf := code == "ArrowLeft" or code == "KeyA"
		if fb and fb.getAttribute("data-act") == "lk":
			lookStep(fb.getAttribute("data-v"), -1 if lf else 1)
			return
		navMove(ov.querySelectorAll("button:not(:disabled)"), -1 if lf else 1, 0)
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
			BANK = 60
			showShop()
		"controls":
			showMenu()
			showControls()
		"diff":
			showMenu()
			slotNew(0)
		"card", "dlg":
			newRun()
			buildStage(0)
			mode = "play"
			hideOv()
			startCut(st.L.cut.pre, null, "il_01")
			if n == "dlg":
				cut.card = 0
				cut.bar = 1
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
