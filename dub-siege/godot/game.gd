class_name Game
extends JsBase
# GENERADO por tools/js2gd.js: godot/src/*.gd (a mano) + traduccion de dub-siege.html.
# No editar aqui: los cambios van en el JS, en godot/src/*.gd o en tools/js2gd.json.

# ======================================== src/00_base.gd
## Piezas del navegador que el juego usa y que en Godot se hacen de otra forma.
## (El codigo traducido las llama con los mismos nombres que en el HTML.)

signal quit_requested

var g: Ctx = null                      # lienzo principal (main.gd lo crea)
var document := Dom.new()
var cv := {"width": 768, "height": 432}
var DEBUG := false
var RM := false
var HUDR := 0
var ZOOM := 1
var HMIN := 90
var SHEET := {}
var ART := {}
var GATE := false
var bsBtn: DomEl = DomEl.new("button")
var layoutKey := ""
var view_size := Vector2(1280, 720)    # pixeles reales de la ventana
var safe := Rect2(0, 0, 1280, 720)     # zona sin muescas
var origin := Vector2.ZERO             # esquina del lienzo en la ventana
var touch_ui := false                  # hay pantalla tactil (main.gd)
var _store := {}
var _store_ok := false
var store_off := false                 # pruebas (--menu): no se escribe al disco
const STORE := "user://dub-siege.json"


# ------------------------------------------------------------ azar
## Math.random(). Con rnd_seed() (pruebas de paridad) pasa a mulberry32, el
## mismo generador que se inyecta en la web, para comparar las dos versiones
## con los mismos niveles y los mismos enemigos.
var _rs := -1


func rnd_seed(s: int) -> void:
	_rs = s & 0xFFFFFFFF


func _rnd() -> float:
	if _rs < 0:
		return randf()
	_rs = (_rs + 0x6D2B79F5) & 0xFFFFFFFF
	var t := _rs
	t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
	t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF)) & 0xFFFFFFFF
	return float((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0


# ------------------------------------------------------------ guardado
func _store_load() -> void:
	if _store_ok:
		return
	_store_ok = true
	if FileAccess.file_exists(STORE):
		var f := FileAccess.open(STORE, FileAccess.READ)
		var v = JSON.parse_string(f.get_as_text())
		if v is Dictionary:
			_store = v


func save(k: Variant = null, v: Variant = null) -> void:
	_store_load()
	_store[str(k)] = JSON.stringify(v)
	if store_off:
		return
	var f := FileAccess.open(STORE + ".tmp", FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify(_store))
	f.close()
	DirAccess.rename_absolute(ProjectSettings.globalize_path(STORE + ".tmp"), ProjectSettings.globalize_path(STORE))


func j_load(k: Variant = null, d: Variant = null) -> Variant:
	_store_load()
	var s = _store.get(str(k))
	if s == null:
		return d
	var v = JSON.parse_string(s)
	return d if v == null else _intify(v)


func slotMig() -> void:
	pass


# ------------------------------------------------------------ pantalla
func S_(id: Variant = null) -> Variant:
	return document.getElementById(str(id))


## Como innerWidth/innerHeight del navegador: px CSS (pixeles reales / densidad).
func VW() -> float:
	return view_size.x / _dpr()


func VH() -> float:
	return view_size.y / _dpr()


## Escala entera mas grande que deja ver al menos HMIN de alto (ver fitW en el
## HTML). Aqui la ventana ya esta en pixeles reales, sin dpr ni margenes CSS.
func fitW() -> void:
	# Como en la web: tumbado en tactil, y fuera de la partida (portada, escenas,
	# tienda) en cualquier pantalla apaisada, el lienzo llena la pantalla; jugando
	# con teclado deja el margen del <body> (32 x 16 px CSS) y pide 192 de ancho.
	var dp := _dpr()
	var ingame: bool = mode == "play" or mode == "pause"
	var tch: bool = view_size.x > view_size.y and (touchMode() or not ingame)
	var dw := maxf(64.0, safe.size.x / dp - (0.0 if tch else 32.0)) * dp
	var dh := maxf(64.0, safe.size.y / dp - (0.0 if tch else 16.0)) * dp
	var wmin := 160 if tch else 192
	var nw := 0
	var nh := 108
	var z := floori(dh / (SC * HMIN))
	while z >= 1:
		var hc := mini(108, floori(dh / (SC * z)))
		var wc := floori(dw / (SC * z) / 2.0) * 2
		if wc >= wmin:
			nw = mini(264, wc)
			nh = hc
			break
		z -= 1
	if nw == 0:
		z = 1
		nw = 192
		nh = 108
	var cw: int = nw * SC
	var chh: int = nh * SC
	origin = safe.position + Vector2(floori((safe.size.x - cw * z) / 2.0), floori((safe.size.y - chh * z) / 2.0))
	if nw == W and nh == H and z == ZOOM and cv.width == cw and cv.height == chh:
		uiFit()
		return
	W = nw
	H = nh
	ZOOM = z
	HW = _round(W / HS)
	HH = _round(H / HS)
	CY = WH - H
	CYM = CY - 12
	if camY != null and camY > CYM:
		camY = CYM
	cv.width = cw
	cv.height = chh
	uiFit()


## Tamano del HUD (OPCIONES > INTERFAZ). En AUTO busca una letra de ~1/240 del
## alto de la pantalla, como en el navegador.
func uiFit() -> void:
	var f = SET.get("ui") if SET is Dictionary else "auto"
	var cp: float = float(ZOOM)
	if not (f is int or f is float):
		f = clampf(VH() / 240.0, 1.5, 3.6) * _dpr() / (SC * HS * cp)
	UIF = clampf(f, 0.5, 1.0)


## Pixeles fisicos por px CSS (lo que en la web es devicePixelRatio). En Android
## screen_get_scale() vale 1: la densidad sale de los ppp (160 ppp = 1).
## dpr_override (--dpr=N en main.gd) lo fija para probar en escritorio.
var dpr_override := 0.0
func _dpr() -> float:
	if dpr_override > 0.0:
		return dpr_override
	if OS.has_feature("mobile"):
		return maxf(1.0, DisplayServer.screen_get_dpi() / 160.0)
	return 1.0


func titleTop() -> void:
	pass


# ------------------------------------------------------------ ajustes de entrada
func touchMode() -> bool:
	if SET.get("touch") == "on":
		return true
	if SET.get("touch") == "off":
		return false
	return touch_ui


func autoFire() -> bool:
	return touchMode() if SET.get("auto") == null else bool(SET.get("auto"))


func buzz(ms: Variant = null) -> void:
	if not SET.get("vib") or not touchMode():
		return
	Input.vibrate_handheld(int(ms))


func applyLayout() -> void:
	var k := str([touchMode(), SET.get("big"), mode == "play" or mode == "pause"])
	if k == layoutKey:
		return
	layoutKey = k
	fitW()
	placePad()


func gate(_ld: Variant = null) -> void:
	pass

# ======================================== src/10_audio.gd
## Audio: la musica va grabada por capas (godot/audio) y los efectos tambien.
## (En el HTML se sintetiza en directo con WebAudio; ver tools/ para grabarlo.)

var AC = null
var MZ := {}
var songIdx := 0
var bossMusic := false
var audio: Node = null   # AudioDirector (main.gd)


func audioOn() -> void:
	if audio:
		audio.call("on")


func sfx(k: Variant = null) -> void:
	if audio and not SET.get("mute"):
		audio.call("sfx", str(k))


func setMute(m: Variant = null) -> void:
	SET.mute = bool(m)
	save("ds2_set", SET)
	if audio:
		audio.call("mute", bool(m))


## Latido de la musica (1 en el golpe, 0,5 en el siguiente paso, 0 despues), como pulse() del HTML.
func pulse():
	return audio.call("pulse") if audio else 0


## Lo que en el HTML decide mzBar() en cada compas: grupo e intensidad segun el modo.
## El director solo cambia en el limite de compas, asi que se puede llamar cada fotograma.
func musicTick() -> void:
	if not audio:
		return
	var G := "C"
	var I := 1
	if mode == "pause" and MZ.get("G"):
		G = MZ.G
		I = MZ.I
	elif mode == "play":
		var m = run.get("mult", 1) if run else 1
		G = "X" if _truthy(bossMusic) else "P"
		I = 3 if m >= 6 else (2 if m >= 3 else 1)
	MZ.G = G
	MZ.I = I
	audio.call("set_state", int(songIdx), G, I, mode == "pause")

# ======================================== src/20_input.gd
## Entrada: teclado, mando y controles tactiles (main.gd manda los eventos).
## Mismos nombres que en el HTML: K (teclas), TS (tactil), GP (mando),
## LATCH (pulsaciones que no se pueden perder entre dos fotogramas).

var K := {}
var TS := {}
var GP := {}
var LATCH := {}
var prevI := {}
var gpPrev := {}
var KEYMAP := {}
const JD_MS := 150.0
const JD_HOLD := 12
var jd := {"on": 0, "tm": 0, "dash": 0, "hold": 0}

const KEYNAMES := {
	KEY_SPACE: "Space", KEY_ENTER: "Enter", KEY_KP_ENTER: "Enter", KEY_ESCAPE: "Escape", KEY_BACKSPACE: "Backspace",
	KEY_UP: "ArrowUp", KEY_DOWN: "ArrowDown", KEY_LEFT: "ArrowLeft", KEY_RIGHT: "ArrowRight", KEY_SHIFT: "ShiftLeft",
}


static func key_code(e: InputEventKey) -> String:
	var k := e.physical_keycode if e.physical_keycode != 0 else e.keycode
	if KEYNAMES.has(k):
		return KEYNAMES[k]
	if k >= KEY_A and k <= KEY_Z:
		return "Key" + String.chr(k)
	if k >= KEY_0 and k <= KEY_9:
		return "Digit" + String.chr(k)
	return OS.get_keycode_string(k)


func readInput() -> Dictionary:
	pollPad()
	if jd.hold > 0:
		jd.hold -= 1
		if jd.hold == 0 and not jd.on:
			TS.J = 0
	var ku = _truthy(K.get("ArrowUp")) or _truthy(K.get("KeyW"))
	var up_jump := _truthy(SET.get("upJump"))
	var i := {
		"L": _any([K.get("ArrowLeft"), K.get("KeyA"), TS.get("L"), GP.get("L")]),
		"R": _any([K.get("ArrowRight"), K.get("KeyD"), TS.get("R"), GP.get("R")]),
		"U": _any([(false if up_jump else ku), TS.get("U"), GP.get("U")]),
		"D": _any([K.get("ArrowDown"), K.get("KeyS"), TS.get("D"), GP.get("D")]),
		"J": _any([K.get("Space"), K.get("KeyZ"), K.get("KeyK"), up_jump and ku, TS.get("J"), GP.get("J")]),
		"F": _any([K.get("KeyX"), K.get("KeyJ"), TS.get("F"), GP.get("F")]),
		"DA": _any([K.get("KeyC"), K.get("KeyL"), K.get("ShiftLeft"), TS.get("DA"), GP.get("DA")]),
		"B": _any([K.get("KeyV"), K.get("KeyB"), K.get("KeyQ"), TS.get("B"), GP.get("B")]),
	}
	for k in ["J", "DA", "B"]:
		i[k + "p"] = (i[k] and not _truthy(prevI.get(k))) or _truthy(LATCH.get(k))
		LATCH[k] = 0
	prevI = i
	return i


func _any(a: Array) -> bool:
	for x in a:
		if _truthy(x):
			return true
	return false


var test_pad := -1   # pruebas: lee este dispositivo aunque no haya mando conectado


func pollPad() -> void:
	var pads := [test_pad] if test_pad >= 0 else Input.get_connected_joypads()
	if pads.is_empty():
		GP = {}
		return
	var d: int = pads[0]
	var bt := func(b: int) -> bool: return Input.is_joy_button_pressed(d, b)
	var ax := Input.get_joy_axis(d, JOY_AXIS_LEFT_X)
	var ay := Input.get_joy_axis(d, JOY_AXIS_LEFT_Y)
	var rt := Input.get_joy_axis(d, JOY_AXIS_TRIGGER_RIGHT) > 0.5
	GP = {"L": ax < -0.4 or bt.call(JOY_BUTTON_DPAD_LEFT), "R": ax > 0.4 or bt.call(JOY_BUTTON_DPAD_RIGHT),
		"U": ay < -0.5 or bt.call(JOY_BUTTON_DPAD_UP), "D": ay > 0.5 or bt.call(JOY_BUTTON_DPAD_DOWN),
		"J": bt.call(JOY_BUTTON_A), "F": bt.call(JOY_BUTTON_X) or rt, "DA": bt.call(JOY_BUTTON_B) or bt.call(JOY_BUTTON_RIGHT_SHOULDER),
		"B": bt.call(JOY_BUTTON_Y) or bt.call(JOY_BUTTON_LEFT_SHOULDER)}
	var stp: bool = bt.call(JOY_BUTTON_START)
	if mode == "cut":
		if (GP.J and not gpPrev.get("j")) or (GP.F and not gpPrev.get("f")):
			cutAdv()
		elif stp and not gpPrev.get("s"):
			cutSkip()
		gpPrev = {"s": stp, "j": GP.J, "f": GP.F}
		return
	if stp and not gpPrev.get("s"):
		if mode == "play":
			pause()
		elif mode == "pause":
			resume()
	gpPrev = {"s": stp, "j": GP.J, "f": GP.F}


## Tecla del teclado (main.gd). Devuelve true si la usa el juego.
func key_event(e: InputEventKey) -> bool:
	var code := key_code(e)
	if not e.pressed:
		K[code] = 0
		return false
	if mode == "cut":
		if not e.echo:
			if code == "Escape" or code == "KeyP":
				cutSkip()
			elif code == "KeyM":
				setMute(not SET.get("mute"))
			elif code in ["Space", "Enter", "KeyZ", "KeyX", "KeyJ", "KeyK", "ArrowRight", "KeyD"]:
				cutAdv()
		K[code] = 1
		return true
	if menu_open():
		return menu_key(code, e)
	if code == "KeyM":
		setMute(not SET.get("mute"))
		return true
	if (code == "KeyP" or code == "Escape") and mode == "play":
		pause()
		return true
	if not _truthy(K.get(code)) and KEYMAP.has(code):
		LATCH[KEYMAP[code]] = 1
	if not _truthy(K.get(code)) and SET.get("upJump") and (code == "ArrowUp" or code == "KeyW"):
		LATCH.J = 1
	K[code] = 1
	return true


func focus_lost() -> void:
	K = {}
	if mode == "play":
		pause()


# ---- boton tactil SALTO/DASH (ver jdDown en el HTML)
func jdDown() -> void:
	if jd.on:
		return
	jd.on = 1
	jd.dash = 0
	_untimeout(jd.tm)
	jd.tm = _timeout(func():
		if not jd.on:
			return
		jd.dash = 1
		LATCH.DA = 1
		buzz(14), JD_MS)


func jdUp(real: bool) -> void:
	if not jd.on:
		return
	jd.on = 0
	_untimeout(jd.tm)
	if not jd.dash and real:
		LATCH.J = 1
		TS.J = 1
		jd.hold = JD_HOLD


func btnDown(c: String) -> void:
	audioOn()
	buzz(8)
	if c == "JD":
		jdDown()
		return
	if not _truthy(TS.get(c)) and (c == "J" or c == "DA" or c == "B"):
		LATCH[c] = 1
	TS[c] = 1


func btnUp(c: String, real: bool) -> void:
	if c == "JD":
		jdUp(real)
		return
	TS[c] = 0


func placePad() -> void:
	pass

# ======================================== src/30_art.gd
## Hojas de sprites: las mismas PNG de art/ (en el HTML van en base64).

func loadArt() -> void:
	var f := FileAccess.open("res://godot/data/art.json", FileAccess.READ)
	ART = _intify(JSON.parse_string(f.get_as_text()))
	for k in ART:
		var d: Dictionary = ART[k]
		d["src"] = "res://art/" + k + ".png"   # <img src> de los menus (ilustraciones)
		var o := {"fw": d.fw, "fh": d.fh, "n": d.get("n", 1), "x1": d.get("x1", 0), "ok": false, "img": null, "wimg": null}
		SHEET[k] = o
		var tex = load("res://art/" + k + ".png")
		if tex is Texture2D:
			o.img = ImgCtx.from_image((tex as Texture2D).get_image())
			o.img._tex = tex
			o.img._dirty = false
			o.wimg = WhiteTex.new(tex)
			o.ok = true

# ======================================== src/40_ui.gd
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

# ======================================== src/90_boot.gd
## Arranque y bucle (lo que en el HTML hacen frame() y requestAnimationFrame).

var _acc := 0.0


func boot() -> void:
	KEYMAP = _data("KEYMAP")
	_boot_gen()
	loadArt()
	fitW()


## Un fotograma real: actualizaciones a 60 Hz fijos y un dibujo.
func frame(dt: float) -> void:
	_tick_timers(dt * 1000.0)
	_acc += minf(dt * 1000.0, 100.0)
	while _acc >= 16.67:
		update()
		_acc -= 16.67
	musicTick()
	g.begin()
	draw()

# ======================================== traduccion de dub-siege.html

var W
var H
var T
var ROWS
var GY
var WH
var CY
var CYM
var HS
var HW
var HH
var SC
var UIF
var UIS
var SET
var DIFFS
var D
var STAGES
var LEVELS
var CH
var SEQ
var mode
var t
var sh
var hs
var flash
var flashC
var beat
var run
var st
var p
var map
var COLS
var cam
var camY
var bullets
var ebul
var enemies
var pickups
var parts
var pops
var ghosts
var mplats
var hazards
var trains
var boss
var banner
var ring
var booms
var cut
var EDEF
var EV
var bumpT
var WPN
var POR
var PSK
var PHD
var CUQ
var ITEMS
var PROG
var NSL
var CUR
var NEWSL
var back
var LORE
var LOREN
var pend
var myTs
var TG
var TGi
var TGC
var bsReady
var PP
var PB
var PL
var PBU
var WALK
var HOP
var WB
var WL
var FP
var FR
var FB
var LK
var LKN
var BANK
var LOOK
var lookVer
var LREF
var lookBk
var lookRaf
var LKO
var LSPR
var LN
var LX
var LY
var LR
var LA
var LCOL
var BAYER
var SUN0
var BGT
var TSPR
var ESHEET
var slotMig__done = null

func _boot_gen():
	var _fn = null
	W = 192
	H = 108
	T = 12
	ROWS = 15
	GY = (13 * T)
	WH = (ROWS * T)
	CY = (WH - H)
	CYM = (CY - 12)
	HS = 0.78
	HW = _round((W / float(HS)))
	HH = _round((H / float(HS)))
	SC = 4
	UIF = 1
	UIS = _data("UIS")
	SET = j_load("ds2_set", {})
	# L325
	_fn = func():
		var d = null
		var k = null
		d = {"diff": 1, "mute": false, "auto": null, "assist": false, "touch": "auto", "big": false, "vib": true, "light": true, "upJump": false, "tut": false, "help": false, "ui": "auto"}
		for _k in _keys(d):
			k = _k
			if (_ix(SET, k) == null):
				_aset(SET, k, _ix(d, k))
	_callv(_fn, [])
	DIFFS = _data("DIFFS")
	D = _ix(DIFFS, SET.get("diff"))
	STAGES = _data("STAGES")
	LEVELS = _data("LEVELS")
	CH = _data("CH")
	SEQ = _data("SEQ")
	mode = "menu"
	t = 0
	sh = 0
	hs = 0
	flash = 0
	flashC = "#fff"
	beat = 0
	cam = 0
	camY = CYM
	booms = []
	cut = null
	EDEF = _data("EDEF")
	EV = {}
	bumpT = 0
	WPN = _data("WPN")
	POR = _data("POR")
	PSK = lum(146, 79, 50)
	PHD = lum(66, 143, 64)
	CUQ = SC
	ITEMS = _data("ITEMS")
	PROG = j_load("ds2_prog", [0, 0, 0])
	NSL = 6
	CUR = null
	NEWSL = null
	back = null
	LORE = _data("LORE")
	LOREN = int(j_load("ds2_lore", 0))
	pend = null
	myTs = null
	TG = null
	TGi = 0
	TGC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	bsReady = null
	PP = _data("PP")
	PB = _data("PB")
	PL = _data("PL")
	PBU = _data("PBU")
	WALK = _data("WALK")
	HOP = _data("HOP")
	WB = _data("WB")
	WL = _data("WL")
	FP = _data("FP")
	FR = _data("FR")
	FB = _data("FB")
	LK = _data("LK")
	LKN = _data("LKN")
	BANK = j_load("ds2_bank", 0)
	LOOK = _or(j_load("ds2_look", null), {"f": 0, "s": 0, "t": 0, "p": 0, "b": 0, "l": 0, "own": []})
	lookVer = 1
	LREF = {1: lum(114, 70, 53), 2: lum(43, 150, 103), 4: lum(33, 30, 42), 5: lum(182, 40, 89)}
	lookBk = null
	lookRaf = 0
	LKO = _data("LKO")
	LSPR = {}
	LN = 0
	LX = []
	LY = []
	LR = []
	LA = []
	LCOL = []
	BAYER = _data("BAYER")
	SUN0 = _data("SUN0")
	BGT = _data("BGT")
	TSPR = {}
	ESHEET = _data("ESHEET")

# L308
func uiName():
	return (str(_round((SET.get("ui") * 100))) + " %" if (_typeof(SET.get("ui")) == "number") else "AUTO")

# L314
func j_clamp(v = null, a = null, b = null):
	return (a if (v < a) else (b if (v > b) else v))

# L315
func rnd(n = null):
	var v = null
	v = (sin(((n * 91.7) + 17.3)) * 24634.6345)
	return (v - floori(v))

# L316 (a mano)
func rng(s = null):
	var stt = {"s": int(s) & 0xFFFFFFFF}
	return func():
		stt.s = (stt.s * 1664525 + 1013904223) & 0xFFFFFFFF
		return stt.s / 4294967296.0

# L317
func hitR(ax = null, ay = null, aw = null, ah = null, bx = null, by = null, bw = null, bh = null):
	return _and(_and(_and((ax < (bx + bw)), ((ax + aw) > bx)), (ay < (by + bh))), ((ay + ah) > by))

# L318
func hitO(a = null, b = null):
	return hitR(a.get("x"), a.get("y"), a.get("w"), a.get("h"), b.get("x"), b.get("y"), b.get("w"), b.get("h"))

# L319
func pad(n = null, l = null):
	n = max(0, floori(n))
	return _slice("00000000" + str(n), -l, null)

# L443
func chunkGrid(c = null):
	var _c = {"j_len": null}
	var r = null
	var i = null
	var out = null
	var _fn = null
	r = c.get("r")
	_c.j_len = 0
	out = []
	i = 0
	while (i < _len(r)):
		_c.j_len = max(_c.j_len, _len(_ix(r, i)))
		i += 1
	i = 0
	while (i < (ROWS - _len(r))):
		out.append("")
		i += 1
	_fn = func(s = null):
		while (_len(s) < _c.j_len):
			s = str(s) + "."
		return s
	return _map(_concat(out, [r]), _fn)

# L454
func newRun():
	D = _ix(DIFFS, SET.get("diff"))
	run = {"score": 0, "lives": D.get("lives"), "coins": 0, "maxHp": D.get("hp"), "up": {"hp": 0, "rate": 0, "dash": 0, "bass": 0}, "wpn": "N", "lv": 1, "stage": 0, "bass": 0, "conts": 0, "stats": {"kills": 0, "shots": 0, "hits": 0, "deaths": 0, "time": 0}, "combo": 0, "comboT": 0, "mult": 1}

# L459
func buildStage(n = null):
	var L = null
	var S = null
	var seq = null
	var grids = null
	var ents = null
	var x0 = null
	var arenaX = null
	var sw = null
	var _fn = null
	var _fn_2 = null
	var gr = null
	var ci = null
	var y = null
	var x = null
	var ch = null
	var cx = null
	var e = null
	L = _ix(LEVELS, n)
	S = _ix(STAGES, L.get("r"))
	seq = _concat(_ix(SEQ, n), [["box", "arena"]])
	_fn = func(s = null):
		return chunkGrid(_ix(CH, s))
	grids = _map(seq, _fn)
	_fn_2 = func(a = null, gr = null):
		return (a + _len(_ix(gr, 0)))
	COLS = _reduce(grids, _fn_2, 0)
	map = _zeros((COLS * ROWS))
	ents = []
	x0 = 0
	arenaX = 0
	for _i in range(_len(grids)):
		if _i >= _len(grids): break
		gr = grids[_i]
		ci = _i
		y = null
		x = null
		ch = null
		cx = null
		if (_ix(seq, ci) == "arena"):
			arenaX = (x0 * T)
		y = 0
		while (y < ROWS):
			x = 0
			while (x < _len(_ix(gr, y))):
				ch = _ix(_ix(gr, y), x)
				cx = (x0 + x)
				if (ch == "#"):
					_aset(map, ((y * COLS) + cx), 1)
				elif (ch == "!"):
					_aset(map, ((y * COLS) + cx), 4)
				elif (ch == "="):
					_aset(map, ((y * COLS) + cx), 2)
				elif (ch == "^"):
					_aset(map, ((y * COLS) + cx), 3)
				elif (ch != "."):
					ents.append({"ch": ch, "x": (cx * T), "y": (y * T)})
				x += 1
			y += 1
		x0 += _len(_ix(gr, 0))
	sw = 0
	while ((sw < COLS) and (tileAt(sw, 13) == 1)):
		sw += 1
	camY = CYM
	st = {"n": L.get("r"), "i": n, "d": ((n * 3) / float((_len(LEVELS) - 1))), "L": L, "S": S, "arenaX": arenaX, "safeW": max((W + 24), (sw * T)), "lock": 0, "bossDone": 0, "clearT": 0, "cp": {"x": 36, "y": (GY - 14)}, "cps": [], "trg": [], "t": 0, "hurtFree": 1, "coinsAt": run.get("coins")}
	bullets = []
	ebul = []
	enemies = []
	pickups = []
	parts = []
	pops = []
	ghosts = []
	mplats = []
	hazards = []
	trains = []
	boss = null
	ring = null
	for _i_2 in range(_len(ents)):
		if _i_2 >= _len(ents): break
		e = ents[_i_2]
		if (e.get("ch") == "o"):
			pickups.append({"type": "coin", "x": (e.get("x") + 2), "y": (e.get("y") + 2), "w": 8, "h": 8, "stat": 1, "l": -1})
		elif (e.get("ch") == "+"):
			pickups.append({"type": "hp", "x": (e.get("x") + 2), "y": (e.get("y") + 4), "w": 8, "h": 8, "stat": 1, "l": -1})
		elif (e.get("ch") == "K"):
			st.cps.append({"x": e.get("x"), "y": (e.get("y") - 4), "on": 0})
		elif (e.get("ch") == "M"):
			mplats.append({"x": e.get("x"), "y": e.get("y"), "w": 44, "h": 5, "x0": e.get("x"), "y0": e.get("y"), "rg": 150, "ph": 0, "dx": 0, "dy": 0})
		elif (e.get("ch") == "V"):
			mplats.append({"x": e.get("x"), "y": e.get("y"), "w": 44, "h": 5, "x0": e.get("x"), "y0": e.get("y"), "rg": 72, "ph": 0, "dx": 0, "dy": 0, "v": 1})
		elif (e.get("ch") == "T"):
			st.trg.append({"x": e.get("x"), "w": 0, "s": 0})
		else:
			mkEnemy(e.get("ch"), e.get("x"), e.get("y"))
	p = {"x": 36, "y": (GY - 14), "w": 8, "h": 14, "vx": 0, "vy": 0, "face": 1, "ground": 0, "onOne": 0, "onMp": null, "coyote": 0, "jbuf": 0, "jumps": 0, "airDash": 1, "dash": 0, "dashCd": 0, "drop": 0, "inv": 60, "cool": 0, "mf": 0, "anim": 0, "hp": run.get("maxHp"), "dead": 0, "deadT": 0, "safe": {"x": 36, "y": (GY - 14)}, "aimU": 0, "aimD": 0}
	cam = 0
	banner = {"a": "FASE " + str((n + 1)) + " DE " + str(_len(LEVELS)) + " · " + str(L.get("era")), "b": str(S.get("name")) + " - " + str(L.get("name")), "l": 170}
	evo(n)
	songIdx = n
	bossMusic = 0
	booms = []

# L503
func evo(i = null):
	EV = {"wCharge": (i >= 3), "wHop": (i >= 6), "hRate": max(0.55, (1 - (i * 0.04))), "hAim": (i >= 4), "hQuake": (i >= 8), "fRange": (64 if (i >= 5) else 44), "fCd": (95 if (i >= 5) else 120), "fShot": (i >= 5), "tRate": (1 + (i * 0.05)), "tBurst": (1 if (i >= 4) else 0), "tFan": (i >= 8), "sShot": (i >= 6), "sTurn": (28 if (i >= 8) else 45), "bPair": (i >= 7), "bCd": (58 if (i >= 9) else 70)}

# L506
func mkEnemy(ch = null, x = null, y = null):
	var d = null
	var hp = null
	var e = null
	d = _ix(EDEF, ch)
	if (not d):
		return
	hp = (d.get("hp") if ((ch == "*") or (ch == "X")) else max(1, _round(((d.get("hp") * D.get("eHp")) * (1 + (st.get("d") * 0.2))))))
	e = {"type": ch, "x": (x + ((T - d.get("w")) / 2.0)), "y": ((y + T) - d.get("h")), "w": d.get("w"), "h": d.get("h"), "hp": hp, "max": hp, "pts": d.get("pts"), "vx": 0, "vy": 0, "dir": -1, "fl": 0, "a": (_rnd() * 9), "cd": (60 + (_rnd() * 60)), "ground": 0, "base": y, "turn": 0, "dive": 0, "jt": (40 + (_rnd() * 30)), "sp": ((0.45 + (st.get("d") * 0.08)) + (_rnd() * 0.15))}
	enemies.append(e)
	return e

# L514
func tileAt(cx = null, cy = null):
	if ((cx < 0) or (cx >= COLS)):
		return 1
	if ((cy < 0) or (cy >= ROWS)):
		return 0
	return _ix(map, ((cy * COLS) + cx))

# L516
func wallX(o = null, cx = null, cy = null):
	var tt = null
	tt = tileAt(cx, cy)
	if (tt == 1):
		if ((((o == p) and (st.get("i") == 0)) and (cx < 60)) and p.get("ground")):
			jumpBump(cx)
		return 1
	if (tt != 4):
		return 0
	if ((o == p) and (p.get("dash", NAN) > 0)):
		return 0
	if (o == p):
		noiseBump(cx)
	return 1

# L517
func moveX(o = null):
	var y0 = null
	var y1 = null
	var cx = null
	var cy = null
	o.x += o.get("vx")
	y0 = floori(((o.get("y")) / float(T)))
	y1 = floori((((o.get("y") + o.get("h")) - 0.01) / float(T)))
	if (o.get("vx", NAN) > 0):
		cx = floori((((o.get("x") + o.get("w")) - 0.01) / float(T)))
		cy = y0
		while (cy <= y1):
			if wallX(o, cx, cy):
				o.x = ((cx * T) - o.get("w"))
				o.vx = 0
				return 1
			cy += 1
	elif (o.get("vx", NAN) < 0):
		cx = floori(((o.get("x")) / float(T)))
		cy = y0
		while (cy <= y1):
			if wallX(o, cx, cy):
				o.x = ((cx + 1) * T)
				o.vx = 0
				return 1
			cy += 1
	return 0

# L525
func jumpBump(cx = null):
	if ((t - bumpT) < 75):
		return
	bumpT = t
	pops.append({"s": ("TOCA SALTO 2 VECES" if touchMode() else "SALTA 2 VECES"), "x": ((cx * T) - 44), "y": (p.get("y") - 14), "c": "#ffd23d", "l": 70, "vy": -0.3})

# L526
func noiseBump(cx = null):
	if ((t - bumpT) < 60):
		return
	bumpT = t
	sfx("hit")
	burst(((cx * T) + 6), (p.get("y") + 7), ["#ff3d6e", "#fff"], 8, 1.4, 0.02)
	pops.append({"s": ("MANTÉN SALTO" if touchMode() else "C: DASH"), "x": ((cx * T) - 30), "y": (p.get("y") - 12), "c": "#4dff88", "l": 60, "vy": -0.3})

# L528
func moveY(o = null):
	var pb = null
	var cx = null
	var cy = null
	var x0 = null
	var x1 = null
	var tt = null
	pb = (o.get("y") + o.get("h"))
	o.y += o.get("vy")
	o.ground = 0
	o.onOne = 0
	x0 = floori(((o.get("x")) / float(T)))
	x1 = floori((((o.get("x") + o.get("w")) - 0.01) / float(T)))
	if (o.get("vy", NAN) >= 0):
		cy = floori(((o.get("y") + o.get("h")) / float(T)))
		cx = x0
		while (cx <= x1):
			tt = tileAt(cx, cy)
			if ((tt == 1) or (((tt == 2) and (not (o.get("drop", NAN) > 0))) and (pb <= ((cy * T) + 0.5)))):
				o.y = ((cy * T) - o.get("h"))
				o.vy = 0
				o.ground = 1
				o.onOne = (tt == 2)
				break
			cx += 1
	else:
		cy = floori(((o.get("y")) / float(T)))
		cx = x0
		while (cx <= x1):
			if (tileAt(cx, cy) == 1):
				o.y = ((cy + 1) * T)
				o.vy = 0
				break
			cx += 1
	return pb

# L537
func onMplat(o = null, pb = null):
	var i = null
	var m = null
	if ((o.get("vy", NAN) < 0) or (o.get("drop", NAN) > 0)):
		return null
	i = 0
	while (i < _len(mplats)):
		m = _ix(mplats, i)
		if ((((pb <= (m.get("y") + 0.5)) and ((o.get("y") + o.get("h")) >= m.get("y", NAN))) and ((o.get("x") + o.get("w")) > m.get("x", NAN))) and (o.get("x", NAN) < (m.get("x") + m.get("w")))):
			o.y = (m.get("y") - o.get("h"))
			o.vy = 0
			o.ground = 1
			o.onOne = 1
			return m
		i += 1
	return null

# L543
func edgeAhead(e = null):
	var fx = null
	fx = (((e.get("x") + e.get("w")) + 1) if (e.get("dir", NAN) > 0) else (e.get("x") - 1))
	return (tileAt(floori((fx / float(T))), floori((((e.get("y") + e.get("h")) + 2) / float(T)))) == 0)

# L1341
func shake(n = null):
	if (not RM):
		sh = max(sh, n)

# L1342
func burst(x = null, y = null, cols = null, n = null, sp = null, gr = null):
	var i = null
	var a = null
	var s = null
	i = 0
	while (i < n):
		a = (_rnd() * 6.283)
		s = ((_rnd() * sp) + 0.3)
		parts.append({"x": x, "y": y, "vx": (cos(a) * s), "vy": ((sin(a) * s) - 1), "l": (16 + (_rnd() * 24)), "c": _ix(cols, fmod(i, _len(cols))), "gr": (0.12 if (gr == null) else gr)})
		i += 1

# L1347
func boom(x = null, y = null, r = null, quiet = null):
	booms.append({"x": x, "y": y, "r": r, "t": 0, "l": (26 + r)})
	burst(x, y, ["#ffd23f", "#ff8a2a", "#ff3d6e", "#fff", "#5a4a5a"], _round((r * 1.3)), (1.2 + (r * 0.09)), 0.14)
	shake(min(22, (4 + (r * 0.7))))
	if (r >= 14):
		flash = max(flash, 5)
		flashC = "#ffd9a0"
	if (not quiet):
		sfx(("boom" if (r >= 14) else "box"))

# L1354
func explode(x = null, y = null):
	var e = null
	boom(x, y, 20)
	hs = max(hs, 3)
	for _i in range(_len(enemies)):
		if _i >= _len(enemies): break
		e = enemies[_i]
		if ((not (e.get("dead"))) and (_hypot(((e.get("x") + ((e.get("w")) / 2.0)) - x), ((e.get("y") + ((e.get("h")) / 2.0)) - y)) < 36)):
			damageEnemy(e, 8, ((1 if (e.get("x", NAN) > x) else -1) * 6))
	if ((boss and boss.get("on")) and (_hypot(((boss.get("x") + ((boss.get("w")) / 2.0)) - x), ((boss.get("y") + ((boss.get("h")) / 2.0)) - y)) < 44)):
		damageBoss(6)
	if ((p and (not (p.get("dead")))) and (_hypot(((p.get("x") + 4) - x), ((p.get("y") + 7) - y)) < 24)):
		hurt(1)

# L1360
func updBooms():
	var i = null
	var b = null
	i = (_len(booms) - 1)
	while (i >= 0):
		b = _ix(booms, i)
		b.t += 1
		if (b.t >= b.get("l", NAN)):
			_splice(booms, i, 1, [])
		elif ((b.get("t") == 6) and (b.get("r", NAN) >= 14)):
			burst(b.get("x"), (b.get("y") - (b.get("r") * 0.4)), ["#3a3046", "#5a4a5a"], 6, 0.6, -0.02)
		i -= 1

# L1362
func disk(cx = null, cy = null, r = null, c = null):
	var R = null
	var dy = null
	var h = null
	if (r < 0.5):
		return
	g.fillStyle = c
	R = _round(r)
	dy = -R
	while (dy <= R):
		h = floori(sqrt(max(0, ((r * r) - (dy * dy)))))
		g.fillRect((_round(cx) - h), (_round(cy) + dy), ((h * 2) + 1), 1)
		dy += 1

# L1363
func pring(cx = null, cy = null, r = null, c = null):
	var R = null
	var dy = null
	var o = null
	var q = null
	var ii = null
	R = _round(r)
	if (R < 2):
		return
	g.fillStyle = c
	cx = _round(cx)
	cy = _round(cy)
	dy = -R
	while (dy <= R):
		o = floori(sqrt(max(0, ((r * r) - (dy * dy)))))
		q = (r - 1.6)
		ii = (floori(sqrt(((q * q) - (dy * dy)))) if (absf(dy) < q) else -1)
		if (ii < 0):
			g.fillRect((cx - o), (cy + dy), ((o * 2) + 1), 1)
		else:
			g.fillRect((cx - o), (cy + dy), (o - ii), 1)
			g.fillRect(((cx + ii) + 1), (cy + dy), (o - ii), 1)
		dy += 1

# L1366
func drawBooms():
	var b = null
	var k = null
	var x = null
	var y = null
	var gr = null
	var R = null
	var sk = null
	var f = null
	for _i in range(_len(booms)):
		if _i >= _len(booms): break
		b = booms[_i]
		k = null
		x = null
		y = null
		gr = null
		R = null
		sk = null
		f = null
		k = ((b.get("t")) / float(b.get("l")))
		x = (b.get("x") - cam)
		y = b.get("y")
		gr = min(1, (k / 0.3))
		R = (b.get("r") * (1 - ((1 - gr) * (1 - gr))))
		if (k > 0.25):
			sk = ((k - 0.25) / 0.75)
			g.globalAlpha = max(0, (0.85 - (sk * 0.85)))
			disk(x, (y - ((sk * b.get("r")) * 0.7)), (R * (0.8 + (sk * 0.5))), "#3a3046")
			disk((x - (R * 0.25)), ((y - ((sk * b.get("r")) * 0.7)) - (R * 0.2)), (R * (0.45 + (sk * 0.3))), "#5a4a5a")
			g.globalAlpha = 1
		f = (1 if (k < 0.3) else max(0, (1 - ((k - 0.3) / 0.45))))
		if (f > 0):
			disk(x, y, (R * f), "#c8203e")
			disk(x, y, ((R * 0.8) * f), "#ff8a2a")
			disk(x, (y - (R * 0.08)), ((R * 0.58) * f), "#ffd23f")
			if (k < 0.4):
				disk(x, (y - (R * 0.12)), ((R * 0.32) * f), "#fff")
		if (k < 0.35):
			g.globalAlpha = (1 - (k / 0.35))
			pring(x, y, (((b.get("r") * 1.7) * (k / 0.35)) + 2), "#fff6d8")
			g.globalAlpha = 1
		if (f > 0):
			light(x, y, (R * 2.6), (0.9 * f), "#ffb040")

# L1374
func pop(x = null, y = null, s = null, c = null):
	pops.append({"x": x, "y": y, "s": s, "c": (c if c else "#ffd23f"), "l": 55})

# L1375
func addScore(base = null, x = null, y = null):
	var v = null
	run.combo += 1
	run.comboT = 150
	run.mult = min(8, (1 + floori(((run.get("combo")) / 4.0))))
	v = (base * run.get("mult"))
	run.score += v
	if (x != null):
		pop(x, y, "+" + str(v), ("#3de8ff" if (run.get("mult", NAN) > 1) else "#ffd23f"))

# L1379
func addBass(n = null):
	var was = null
	was = (run.get("bass", NAN) < 100)
	run.bass = min(100, (run.get("bass") + (n * (1 + (0.3 * run.up.get("bass"))))))
	if (was and (run.get("bass", NAN) >= 100)):
		pop((p.get("x") - 14), (p.get("y") - 12), "BASS LISTO", "#ffd23f")
		sfx("pick")

# L1382
func hurt(n = null):
	if (((((p.get("inv", NAN) > 0) or (p.get("dash", NAN) > 0)) or p.get("dead")) or st.get("clearT")) or (DEBUG and win.get("__god"))):
		return
	if DEBUG:
		win.__log = (win.get("__log") if win.get("__log") else [])
		win.__log.append("hit@" + str(_round(p.get("x"))))
	p.hp -= n
	p.inv = D.get("inv")
	p.vx = (-(p.get("face")) * 2)
	p.vy = -2.6
	run.combo = 0
	run.mult = 1
	st.hurtFree = 0
	if (run.get("lv", NAN) > 1):
		run.lv -= 1
		pop((p.get("x") - 8), (p.get("y") - 14), "ARMA -1", "#ff8aa6")
	sfx("hurt")
	buzz(35)
	shake(8)
	hs = 5
	flash = 6
	flashC = "#ff3d6e"
	burst((p.get("x") + 4), (p.get("y") + 7), ["#2bb37a", "#fff", "#ff3d6e"], 10, 2)
	if (p.get("hp", NAN) <= 0):
		killPlayer()

# L1389
func killPlayer():
	p.dead = 1
	p.deadT = 90
	p.hp = 0
	buzz(120)
	run.lives -= 1
	run.stats.deaths += 1
	sfx("drop")
	shake(16)
	burst((p.get("x") + 4), (p.get("y") + 7), ["#2bb37a", "#ffd23f", "#ff3d6e", "#fff"], 50, 3.5)
	ebul = []

# L1393
func respawn():
	var c = null
	c = st.get("cp")
	p.x = c.get("x")
	p.y = c.get("y")
	p.vy = 0
	p.vx = p.get("vy")
	p.dead = 0
	p.hp = run.get("maxHp")
	p.inv = 150
	p.dash = 0
	p.safe = {"x": c.get("x"), "y": c.get("y")}
	if (st.get("lock") and boss):
		p.x = (st.get("arenaX") + 30)
		p.y = (GY - p.get("h"))
	burst((p.get("x") + 4), (p.get("y") + 7), ["#3de8ff", "#fff"], 20, 2)
	sfx("cp")

# L1398
func fallPit():
	if (DEBUG and win.get("__god")):
		p.x = p.safe.get("x")
		p.y = p.safe.get("y")
		p.vy = 0
		return
	if DEBUG:
		win.__log = (win.get("__log") if win.get("__log") else [])
		win.__log.append("pit@" + str(_round(p.get("x"))))
	p.hp -= 1
	st.hurtFree = 0
	sfx("hurt")
	shake(6)
	if (p.get("hp", NAN) <= 0):
		killPlayer()
		return
	p.x = p.safe.get("x")
	p.y = (p.safe.get("y") - 2)
	p.vy = 0
	p.vx = p.get("vy")
	p.inv = D.get("inv")

# L1405
func targets():
	var a = null
	var e = null
	a = []
	for _i in range(_len(enemies)):
		if _i >= _len(enemies): break
		e = enemies[_i]
		if ((((not (e.get("dead"))) and (e.get("type") != "X")) and (e.get("x", NAN) > (cam - 6))) and (e.get("x", NAN) < ((cam + W) + 6))):
			a.append({"x": (e.get("x") + ((e.get("w")) / 2.0)), "y": (e.get("y") + ((e.get("h")) / 2.0)), "box": (e.get("type") == "*")})
	if (boss and boss.get("on")):
		a.append({"x": (boss.get("x") + ((boss.get("w")) / 2.0)), "y": (boss.get("y") + ((boss.get("h")) / 2.0)), "boss": 1})
	return a

# L1407
func nearestTarget(j_range = null, front = null):
	var px = null
	var py = null
	var best_2 = null
	var bd = null
	var _a = null
	var q = null
	var dx = null
	var d = null
	px = (p.get("x") + 4)
	py = (p.get("y") + 7)
	best_2 = null
	bd = 1000000000
	_a = targets()
	for _i in range(_len(_a)):
		if _i >= _len(_a): break
		q = _a[_i]
		dx = null
		d = null
		dx = (q.get("x") - px)
		if (front and ((dx * p.get("face")) < -6)):
			continue
		d = _hypot(dx, ((q.get("y") - py) * 1.4))
		if ((d < j_range) and (d < bd)):
			bd = d
			best_2 = q
	return best_2

# L1409
func shoot(i = null):
	var _c = {"mx": null, "my": null, "w": null}
	var dx = null
	var dy = null
	var q = null
	var ddx = null
	var ddy = null
	var lv = null
	var b = null
	var sp = null
	var ox = null
	var oy = null
	var n = null
	var base = null
	var spread = null
	var k = null
	var a = null
	var h = null
	var a2 = null
	var cd = null
	var q_2 = null
	b = func(vx = null, vy = null, o = null):
		o = (o if o else {})
		bullets.append({"x": _c.mx, "y": _c.my, "vx": vx, "vy": vy, "l": (o.get("l") if o.get("l") else 55), "dmg": (o.get("dmg") if o.get("dmg") else 1), "pierce": (o.get("pierce") if o.get("pierce") else 0), "home": (o.get("home") if o.get("home") else 0), "w": _c.w, "hitL": []})
		run.stats.shots += 1
	dx = p.get("face")
	dy = 0
	if p.get("aimU"):
		if (i.get("L") or i.get("R")):
			dx = (p.get("face") * 0.72)
			dy = -0.72
		else:
			dx = 0
			dy = -1
	elif p.get("aimD"):
		dx = (p.get("face") * 0.72)
		dy = 0.72
	elif SET.get("assist"):
		q = nearestTarget(150, true)
		if q:
			ddx = (q.get("x") - (p.get("x") + 4))
			ddy = (q.get("y") - (p.get("y") + 7))
			if ((ddy < -24) and (absf(ddx) < 20)):
				dx = 0
				dy = -1
			elif ((ddy < -16) and (-ddy > (absf(ddx) * 0.35))):
				dx = (p.get("face") * 0.72)
				dy = -0.72
			elif (((not (p.get("ground"))) and (ddy > 18)) and (ddy > (absf(ddx) * 0.35))):
				dx = (p.get("face") * 0.72)
				dy = 0.72
	_c.mx = ((p.get("x") + 4) + (dx * 8))
	_c.my = ((p.get("y") + 6) + (dy * 8))
	lv = run.get("lv")
	_c.w = run.get("wpn")
	sp = 6.5
	if (_c.w == "N"):
		if (lv < 2):
			b.call((dx * sp), (dy * sp))
		else:
			ox = (-dy * 2.5)
			oy = (dx * 2.5)
			b.call(((dx * sp) + 0), (dy * sp))
			bullets[(_len(bullets) - 1)].x += ox
			bullets[(_len(bullets) - 1)].y += oy
			b.call((dx * sp), (dy * sp))
			bullets[(_len(bullets) - 1)].x -= ox
			bullets[(_len(bullets) - 1)].y -= oy
		if (lv >= 3):
			for _i in range(_len(bullets)):
				if _i >= _len(bullets): break
				q_2 = bullets[_i]
				if ((q_2.get("l") == 55) and (q_2.get("w") == "N")):
					q_2.dmg = 1.4
		sfx("shoot")
	elif (_c.w == "S"):
		n = ((lv * 2) + 1)
		base = atan2(dy, dx)
		spread = (0.14 + (lv * 0.03))
		k = 0
		while (k < n):
			a = (base + ((k - ((n - 1) / 2.0)) * spread))
			b.call((cos(a) * 5.5), (sin(a) * 5.5), {"l": 34})
			k += 1
		sfx("shootS")
	elif (_c.w == "L"):
		b.call((dx * 9), (dy * 9), {"pierce": 1, "dmg": (1 + (lv * 0.5)), "l": 40})
		sfx("shootL")
	elif (_c.w == "H"):
		h = 0
		while (h < lv):
			a2 = (atan2(dy, dx) + ((h - ((lv - 1) / 2.0)) * 0.5))
			b.call((cos(a2) * 4), (sin(a2) * 4), {"home": 1, "l": 90})
			h += 1
		sfx("shootH")
	cd = (_ix(WPN, _c.w).get("cd") * (1 - (0.12 * run.up.get("rate"))))
	if ((_c.w == "N") and (lv >= 3)):
		cd *= 0.75
	p.cool = max(4, cd)
	p.mf = 3

# L1432
func updatePlayer(i = null):
	var mv = null
	var acc_2 = null
	var mx = null
	var wasG = null
	var pb = null
	var m = null
	var x0 = null
	var x1 = null
	var y0 = null
	var y1 = null
	var cy = null
	var cx = null
	var wantF = null
	var q = null
	if p.get("dead"):
		p.deadT -= 1
		if (p.deadT <= 0):
			if (run.get("lives", NAN) <= 0):
				gameOver()
			else:
				respawn()
		return
	p.aimU = (not (not (i.get("U"))))
	p.aimD = _and((not (not (i.get("D")))), (not (p.get("ground"))))
	mv = ((1 if i.get("R") else 0) - (1 if i.get("L") else 0))
	if p.get("onMp"):
		p.x += p.onMp.get("dx")
		p.y += p.onMp.get("dy")
	if (p.get("dash", NAN) > 0):
		p.dash -= 1
		p.vx = (p.get("face") * 4.6)
		p.vy = 0
		if (fmod(t, 2) == 0):
			ghosts.append({"x": p.get("x"), "y": p.get("y"), "f": p.get("face"), "l": 14})
	else:
		acc_2 = (0.42 if p.get("ground") else 0.3)
		mx = 1.9
		if mv:
			p.vx = j_clamp((p.get("vx") + (mv * acc_2)), -mx, mx)
			p.face = mv
		else:
			p.vx *= (0.55 if p.get("ground") else 0.88)
			if (absf(p.get("vx")) < 0.05):
				p.vx = 0
		p.vy = min((p.get("vy") + (0.27 if (p.get("vy", NAN) > 0) else 0.22)), 5.5)
		if ((not (i.get("J"))) and (p.get("vy", NAN) < -1.2)):
			p.vy += 0.32
	if p.get("ground"):
		p.coyote = 6
		p.jumps = 0
		p.airDash = 1
	elif (p.get("coyote", NAN) > 0):
		p.coyote -= 1
	if i.get("Jp"):
		p.jbuf = 7
	elif (p.get("jbuf", NAN) > 0):
		p.jbuf -= 1
	if ((p.get("jbuf", NAN) > 0) and (not (p.get("dash")))):
		if ((i.get("D") and p.get("ground")) and p.get("onOne")):
			p.drop = 12
			p.jbuf = 0
			p.y += 1
			p.ground = 0
			p.onMp = null
		elif (p.get("coyote", NAN) > 0):
			p.vy = -4.45
			p.coyote = 0
			p.jbuf = 0
			p.jumps = 1
			p.ground = 0
			p.onMp = null
			sfx("jump")
			burst((p.get("x") + 4), (p.get("y") + p.get("h")), ["#8f98c8"], 4, 0.8, 0.02)
		elif (p.get("jumps", NAN) < 2):
			p.vy = -3.95
			p.jumps = 2
			p.jbuf = 0
			sfx("jump2")
			burst((p.get("x") + 4), (p.get("y") + p.get("h")), ["#3de8ff", "#fff"], 8, 1.3, 0.02)
	if (((i.get("DAp") and (p.get("dashCd", NAN) <= 0)) and (not (p.get("dash")))) and (p.get("ground") or p.get("airDash"))):
		if mv:
			p.face = mv
		p.dash = 11
		p.dashCd = _round((48 * (1 - (0.25 * run.up.get("dash")))))
		if (not (p.get("ground"))):
			p.airDash = 0
		sfx("dash")
		p.inv = max(p.get("inv"), 12)
	if (p.get("dashCd", NAN) > 0):
		p.dashCd -= 1
	if (p.get("drop", NAN) > 0):
		p.drop -= 1
	wasG = p.get("ground")
	moveX(p)
	pb = moveY(p)
	m = onMplat(p, pb)
	p.onMp = m
	if st.get("lock"):
		p.x = j_clamp(p.get("x"), (st.get("arenaX") + 4), (((st.get("arenaX") + W) - p.get("w")) - 4))
	if (p.get("x", NAN) < 2):
		p.x = 2
	if ((not wasG) and p.get("ground")):
		sfx("land")
		burst((p.get("x") + 4), (p.get("y") + p.get("h")), ["#8f98c8"], 3, 0.6, 0.02)
	p.anim = ((p.get("anim") + (absf(p.get("vx")) * 0.11)) if p.get("vx") else 0)
	if (p.get("inv", NAN) > 0):
		p.inv -= 1
	if (p.get("cool", NAN) > 0):
		p.cool -= 1
	if (p.get("mf", NAN) > 0):
		p.mf -= 1
	x0 = floori(((p.get("x") + 1) / float(T)))
	x1 = floori((((p.get("x") + p.get("w")) - 1) / float(T)))
	y0 = floori(((p.get("y")) / float(T)))
	y1 = floori((((p.get("y") + p.get("h")) - 1) / float(T)))
	cy = y0
	while (cy <= y1):
		cx = x0
		while (cx <= x1):
			if ((tileAt(cx, cy) == 3) and ((p.get("y") + p.get("h")) > ((cy * T) + 6))):
				hurt(1)
				if (not (p.get("dead"))):
					p.vy = -3.8
			cx += 1
		cy += 1
	if (((p.get("ground") and (not (p.get("onMp")))) and (tileAt(floori(((p.get("x")) / float(T))), floori((((p.get("y") + p.get("h")) + 1) / float(T)))) == 1)) and (tileAt(floori(((p.get("x") + p.get("w")) / float(T))), floori((((p.get("y") + p.get("h")) + 1) / float(T)))) == 1)):
		p.safe = {"x": p.get("x"), "y": p.get("y")}
	if (p.get("y", NAN) > (WH + 16)):
		fallPit()
	wantF = i.get("F")
	if (((not wantF) and autoFire()) and (not (p.get("dead")))):
		q = nearestTarget(150, false)
		if q:
			wantF = true
			if ((not (i.get("L") or i.get("R"))) and ((q.get("x", NAN) < (p.get("x") + 4)) != (p.get("face", NAN) < 0))):
				p.face = (-1 if (q.get("x", NAN) < (p.get("x") + 4)) else 1)
	if ((wantF and (p.get("cool", NAN) <= 0)) and (not (p.get("dash")))):
		shoot(i)
	if (i.get("Bp") and (run.get("bass", NAN) >= 100)):
		bassDrop()

# L1474
func bassDrop():
	var b = null
	var e = null
	var h = null
	run.bass = 0
	buzz(60)
	ring = {"x": (p.get("x") + 4), "y": (p.get("y") + 7), "r": 0}
	sfx("bass")
	shake(22)
	hs = 6
	flash = 10
	flashC = "#ffd23f"
	for _i in range(_len(ebul)):
		if _i >= _len(ebul): break
		b = ebul[_i]
		burst(b.get("x"), b.get("y"), ["#ffd23f"], 3, 1)
	ebul = []
	for _i_2 in range(_len(enemies)):
		if _i_2 >= _len(enemies): break
		e = enemies[_i_2]
		if ((e.get("x", NAN) > (cam - 10)) and (e.get("x", NAN) < ((cam + W) + 10))):
			damageEnemy(e, 10, 0)
	if (boss and boss.get("on")):
		damageBoss(_round((boss.get("max") * 0.08)))
	for _i_3 in range(_len(hazards)):
		if _i_3 >= _len(hazards): break
		h = hazards[_i_3]
		h.warn = 0
		h.act = 0

# L1483
func damageEnemy(e = null, d = null, vx = null):
	var opts = null
	var r = null
	var _fn = null
	e.hp -= d
	e.fl = 5
	e.x += (vx * 0.25)
	if ((e.get("hp", NAN) <= 0) and (not (e.get("dead")))):
		e.dead = 1
		if (e.get("type") == "X"):
			explode((e.get("x") + ((e.get("w")) / 2.0)), (e.get("y") + ((e.get("h")) / 2.0)))
			addScore(e.get("pts"), e.get("x"), (e.get("y") - 8))
			return true
		run.stats.kills += 1
		sfx(("box" if (e.get("type") == "*") else "kill"))
		shake(3)
		hs = max(hs, 2)
		burst((e.get("x") + ((e.get("w")) / 2.0)), (e.get("y") + ((e.get("h")) / 2.0)), (["#c08040", "#7a4a20", "#ffd23f"] if (e.get("type") == "*") else ["#7a5bf0", "#ff8a2a", "#fff", "#ffd23f", "#ff3d6e"]), 22, 2.8)
		if (e.get("type") == "*"):
			_fn = func(w = null):
				return _or((w != run.get("wpn")), (run.get("lv", NAN) < 3))
			opts = _filter(["S", "L", "H", "N"], _fn)
			pickups.append({"type": "wpn", "wt": _ix(opts, floori((_rnd() * _len(opts)))), "x": e.get("x"), "y": e.get("y"), "w": 10, "h": 10, "vy": -2.5, "l": -1})
			addScore(e.get("pts"), e.get("x"), (e.get("y") - 8))
		else:
			addScore(e.get("pts"), e.get("x"), (e.get("y") - 8))
			addBass(8)
			r = _rnd()
			if (r < 0.35):
				pickups.append({"type": "coin", "x": (e.get("x") + 2), "y": e.get("y"), "w": 8, "h": 8, "vy": -2.2, "vx": ((_rnd() - 0.5) * 1.5), "l": 420})
			elif (r < 0.4):
				pickups.append({"type": "hp", "x": (e.get("x") + 2), "y": e.get("y"), "w": 8, "h": 8, "vy": -2.2, "l": 420})
		return true
	return false

# L1498
func eshot(x = null, y = null, vx = null, vy = null, o = null):
	o = (o if o else {})
	ebul.append({"x": x, "y": y, "vx": (vx * D.get("bs")), "vy": (vy * D.get("bs")), "r": (o.get("r") if o.get("r") else 3), "gr": (o.get("gr") if o.get("gr") else 0), "c": (o.get("c") if o.get("c") else "#ff3d6e"), "l": (o.get("l") if o.get("l") else 320), "home": (o.get("home") if o.get("home") else 0), "bomb": (o.get("bomb") if o.get("bomb") else 0)})

# L1499
func aimAt(x = null, y = null, sp = null):
	var dx = null
	var dy = null
	var d = null
	dx = ((p.get("x") + 4) - x)
	dy = ((p.get("y") + 7) - y)
	d = _or(_hypot(dx, dy), 1)
	return [((dx / float(d)) * sp), ((dy / float(d)) * sp)]

# L1500
func updateEnemies():
	var k = null
	var e = null
	var px = null
	var dx = null
	var adx = null
	var onS = null
	var wg = null
	var hg = null
	var hv = null
	var ty = null
	var fv = null
	var bv = null
	var v = null
	var a0 = null
	var want = null
	var _sw = null
	var _l = null
	var _l_2 = null
	var _l_3 = null
	var _a = null
	var o = null
	var _l_4 = null
	var _l_5 = null
	k = (_len(enemies) - 1)
	while (k >= 0):
		e = _ix(enemies, k)
		if (not e):
			k -= 1
			continue
		if e.get("dead"):
			_splice(enemies, k, 1, [])
			k -= 1
			continue
		if ((e.get("x", NAN) < (cam - 120)) or (e.get("x", NAN) > ((cam + W) + 60))):
			if (e.get("minion") and (e.get("x", NAN) < (cam - 200))):
				_splice(enemies, k, 1, [])
			k -= 1
			continue
		e.a += 0.15
		if (e.get("fl", NAN) > 0):
			e.fl -= 1
		px = (p.get("x") + 4)
		dx = (px - (e.get("x") + ((e.get("w")) / 2.0)))
		adx = absf(dx)
		onS = _and((e.get("x", NAN) > (cam - 8)), (e.get("x", NAN) < ((cam + W) + 8)))
		_sw = e.get("type")
		while true:
			if _sw == "w":
				if (e.get("chg", NAN) > 0):
					e.vx = 0
					e.chg -= 1
					if (e.chg == 0):
						e.run = 34
						sfx("dash")
					e.vy = min((e.get("vy") + 0.25), 5)
					moveY(e)
					break
				if (e.get("run", NAN) > 0):
					e.run -= 1
					e.vx = (e.get("dir") * 2.3)
					e.vy = min((e.get("vy") + 0.25), 5)
					if (moveX(e) or (e.get("ground") and edgeAhead(e))):
						e.run = 0
						e.dir *= -1
					moveY(e)
					break
				if (e.get("nc", NAN) > 0):
					e.nc -= 1
				elif ((adx < 90) and (absf((p.get("y") - e.get("y"))) < 30)):
					e.dir = (1 if (dx > 0) else -1)
				_l = ((((EV.get("wCharge") and onS) and (adx < 84)) and (absf((((p.get("y") + p.get("h")) - e.get("y")) - e.get("h"))) < 10)) and e.get("ground"))
				if _l:
					e.cd -= 1
					_l = (e.cd <= 0)
				if _l:
					e.dir = (1 if (dx > 0) else -1)
					e.chg = 24
					e.cd = (170 + (_rnd() * 60))
					pop(e.get("x"), (e.get("y") - 12), "!", "#ff3d6e")
					break
				e.vx = ((e.get("dir") * e.get("sp")) * (1.5 if (adx < 90) else 1))
				e.vy = min((e.get("vy") + 0.25), 5)
				if moveX(e):
					if ((EV.get("wHop") and e.get("ground")) and (not (e.get("hop")))):
						e.vy = -3.6
						e.hop = 1
					elif (e.get("ground") or (not (EV.get("wHop")))):
						e.dir *= -1
						e.hop = 0
						e.nc = 60
				else:
					if (e.get("ground") and (e.get("hop") == 2)):
						e.hop = 0
					if ((e.get("ground") and edgeAhead(e)) and (adx >= 90)):
						e.dir *= -1
				wg = e.get("ground")
				moveY(e)
				if (((not wg) and e.get("ground")) and (e.get("hop") == 1)):
					e.hop = 2
			elif _sw == "h":
				e.vy = min((e.get("vy") + 0.24), 5)
				hg = e.get("ground")
				if e.get("ground"):
					e.vx *= 0.6
					e.jt -= 1
					if ((e.jt <= 0) and onS):
						hv = (1.2 + (st.get("d") * 0.15))
						e.vx = (j_clamp((dx / 31.0), (-hv * 1.35), (hv * 1.35)) if EV.get("hAim") else ((1 if (dx > 0) else -1) * hv))
						e.vy = -3.7
						e.jt = ((45 + (_rnd() * 45)) * EV.get("hRate"))
						if EV.get("hQuake"):
							e.fl = 10
							if (not (e.get("wn"))):
								e.wn = 1
								pop(e.get("x"), (e.get("y") - 12), "!", "#ffd23f")
				moveX(e)
				moveY(e)
				if ((((EV.get("hQuake") and (not hg)) and e.get("ground")) and (e.get("vy") == 0)) and onS):
					eshot((e.get("x") + 1), ((e.get("y") + e.get("h")) - 3), -1.5, 0, {"r": 2, "c": "#ffd23f", "l": 70})
					eshot(((e.get("x") + e.get("w")) - 1), ((e.get("y") + e.get("h")) - 3), 1.5, 0, {"r": 2, "c": "#ffd23f", "l": 70})
			elif _sw == "f":
				if (not (e.get("dive"))):
					e.x += ((1 if (dx > 0) else -1) * min((adx * 0.02), (0.8 + (st.get("d") * 0.1))))
					e.y += (((e.get("base") + (sin((e.get("a") * 0.35)) * 12)) - e.get("y")) * 0.1)
					_l_2 = ((adx < EV.get("fRange", NAN)) and (p.get("y", NAN) > e.get("y", NAN)))
					if _l_2:
						e.cd -= 1
						_l_2 = (e.cd <= 0)
					if _l_2:
						e.dive = 60
						e.cd = EV.get("fCd")
				else:
					e.dive -= 1
					if ((EV.get("fShot") and (e.get("dive") == 38)) and onS):
						e.fl = 10
						if (not (e.get("wn"))):
							e.wn = 1
							pop(e.get("x"), (e.get("y") - 12), "!", "#ff8aa6")
					ty = (p.get("y") if (e.get("dive", NAN) > 30) else e.get("base"))
					e.y += ((ty - e.get("y")) * 0.07)
					e.x += ((1 if (dx > 0) else -1) * 0.5)
					if ((EV.get("fShot") and (e.get("dive") == 26)) and onS):
						fv = aimAt((e.get("x") + 5), (e.get("y") + 3), 1.5)
						eshot((e.get("x") + 5), (e.get("y") + 3), _ix(fv, 0), _ix(fv, 1), {"c": "#ff8aa6"})
			elif _sw == "t":
				e.dir = (1 if (dx > 0) else -1)
				_l_3 = (e.get("bst", NAN) > 0)
				if _l_3:
					e.bst -= 1
					_l_3 = (fmod(e.bst, 10) == 0)
				if _l_3:
					bv = aimAt((e.get("x") + 5), (e.get("y") + 3), 1.7)
					eshot((e.get("x") + 5), (e.get("y") + 3), _ix(bv, 0), _ix(bv, 1), {"c": "#ff8a2a"})
				if (onS and (adx < 230)):
					if ((e.get("cd", NAN) < 25) and (e.get("cd", NAN) >= 24)):
						e.fl = 6
					e.cd -= 1
					if (e.cd <= 0):
						v = aimAt((e.get("x") + 5), (e.get("y") + 3), 1.7)
						eshot((e.get("x") + 5), (e.get("y") + 3), _ix(v, 0), _ix(v, 1), {"c": "#ff8a2a"})
						if EV.get("tFan"):
							a0 = atan2(_ix(v, 1), _ix(v, 0))
							_a = [-0.32, 0.32]
							for _i in range(_len(_a)):
								if _i >= _len(_a): break
								o = _a[_i]
								eshot((e.get("x") + 5), (e.get("y") + 3), (cos((a0 + o)) * 1.5), (sin((a0 + o)) * 1.5), {"c": "#ff8a2a"})
						if EV.get("tBurst"):
							e.bst = (EV.get("tBurst") * 10)
						e.cd = (((115 + (_rnd() * 30)) / float(D.get("rate"))) / float(EV.get("tRate")))
			elif _sw == "s":
				want = (1 if (dx > 0) else -1)
				if (want != e.get("dir")):
					e.turn += 1
					if (e.turn > EV.get("sTurn", NAN)):
						e.dir = want
						e.turn = 0
				else:
					e.turn = 0
				e.vx = ((e.get("dir") * e.get("sp")) * 0.8)
				e.vy = min((e.get("vy") + 0.25), 5)
				if moveX(e):
					e.vx = 0
				moveY(e)
				if ((((EV.get("sShot") and onS) and (e.get("dir") == want)) and (adx < 140)) and (absf((p.get("y") - e.get("y"))) < 20)):
					e.cd -= 1
					if ((e.cd < 23) and (e.get("cd", NAN) >= 22)):
						e.fl = 6
					if (e.get("cd", NAN) <= 0):
						eshot((e.get("x") + (e.get("w") if (e.get("dir", NAN) > 0) else 0)), ((e.get("y") + e.get("h")) - 5), (e.get("dir") * 1.9), 0, {"r": 2, "c": "#3de8ff", "l": 110})
						e.cd = (130.0 / (D.get("rate")))
			elif _sw == "b":
				e.x += ((1 if (dx > 0) else -1) * min((adx * 0.03), 0.9))
				_l_4 = (e.get("b2", NAN) > 0)
				if _l_4:
					e.b2 -= 1
					_l_4 = (e.b2 == 0)
				if _l_4:
					eshot((e.get("x") + 7), (e.get("y") + 8), 0, 0.5, {"gr": 0.12, "c": "#ffd23f", "bomb": 1, "r": 3})
				_l_5 = (onS and (adx < 14))
				if _l_5:
					e.cd -= 1
					_l_5 = (e.cd <= 0)
				if _l_5:
					eshot((e.get("x") + 7), (e.get("y") + 8), 0, 0.5, {"gr": 0.12, "c": "#ffd23f", "bomb": 1, "r": 3})
					e.cd = ((EV.get("bCd")) / float(D.get("rate")))
					if EV.get("bPair"):
						e.b2 = 14
						e.fl = 12
						if (not (e.get("wn"))):
							e.wn = 1
							pop(e.get("x"), (e.get("y") - 12), "!", "#ffd23f")
				elif ((e.get("cd", NAN) > 0) and (adx >= 14)):
					e.cd = max((e.get("cd") - 1), 0)
			elif _sw == "*":
				pass
			elif _sw == "X":
				e.vy = min((e.get("vy") + 0.25), 5)
				moveY(e)
			break
		if (e.get("y", NAN) > (WH + 20)):
			e.dead = 1
			k -= 1
			continue
		if (((e.get("type") != "*") and (e.get("type") != "X")) and hitR((p.get("x") + 1), (p.get("y") + 1), (p.get("w") - 2), (p.get("h") - 1), (e.get("x") + 1), (e.get("y") + 1), (e.get("w") - 2), (e.get("h") - 1))):
			hurt(1)
		k -= 1

# L1562
func startBoss():
	var L = null
	var n = null
	var hp = null
	var ax = null
	var a = null
	var air = null
	var e = null
	st.lock = 1
	st.cp = {"x": (st.get("arenaX") + 30), "y": (GY - 14)}
	for _i in range(_len(enemies)):
		if _i >= _len(enemies): break
		e = enemies[_i]
		if (not (e.get("dead"))):
			burst((e.get("x") + 5), (e.get("y") + 4), ["#7a5bf0", "#fff"], 8, 2)
	enemies = []
	ebul = []
	L = st.get("L")
	n = L.get("ai")
	hp = (L.get("hp") * D.get("eHp"))
	ax = st.get("arenaX")
	boss = {"kind": n, "mk": (L.get("mk") if L.get("mk") else 0), "mt": L.get("mt"), "sc": (L.get("sc") if L.get("sc") else 1), "x": ((ax + W) - 70), "y": -50, "w": 24, "h": 30, "hp": hp, "max": hp, "ph": 1, "t": 0, "cd": 100, "act": null, "actT": 0, "fl": 0, "vx": 0, "vy": 0, "on": 0, "enter": 1, "dead": 0, "a": 0, "dir": -1, "turn": 0, "bc": 0, "gnd": _or((n == 0), (n == 3)), "hy": 92}
	if (n == 1):
		boss.w = 28
		boss.h = 16
		boss.x = ((ax + (W / 2.0)) - 14)
		boss.y = -30
	if (n == 2):
		boss.w = 24
		boss.h = 18
		boss.x = ((ax + (W / 2.0)) - 12)
		boss.y = -30
	if (n == 3):
		boss.w = 26
		boss.h = 34
		boss.x = ((ax + W) - 80)
		boss.y = -60
	if (n == 4):
		a = _or(_ix(ART, _ix(ESHEET, L.get("mt"))), {"fw": 12, "fh": 10})
		air = _or((L.get("mt") == "b"), (L.get("mt") == "f"))
		boss.w = _round(((a.get("fw") * boss.get("sc")) * 0.8))
		boss.h = _round(((a.get("fh") * boss.get("sc")) * 0.85))
		boss.gnd = (not air)
		boss.hy = (68 if (L.get("mt") == "b") else 80)
		boss.x = (((ax + (W / 2.0)) - ((boss.get("w")) / 2.0)) if (L.get("mt") == "t") else (((ax + W) - 24) - boss.get("w")))
		boss.y = (-40 if air else -70)
	banner = {"a": "ALERTA", "b": L.get("boss"), "l": 150, "boss": 1}
	sfx("siren")
	bossMusic = 1

# L1576
func bossLand():
	boss.enter = 0
	boss.on = 1
	shake(16)
	sfx("drop")
	burst((boss.get("x") + ((boss.get("w")) / 2.0)), (boss.get("y") + boss.get("h")), ["#9aa0b0", "#fff", "#ff3d6e"], 30, 3)
	bossOn()

# L1577
func bossOn():
	if ((st.L.get("cut") and st.L.cut.get("boss")) and (not (seen("boss")))):
		startCut(st.L.cut.get("boss"))

# L1578
func damageBoss(n = null):
	var b = null
	var r = null
	var old = null
	b = boss
	if (((not b) or (not (b.get("on")))) or b.get("dead")):
		return
	if (((b.get("kind") == 1) or (b.get("kind") == 4)) and (b.get("act") == "ground")):
		n *= 1.5
	b.hp -= n
	b.fl = 4
	run.stats.hits += 0
	r = ((b.get("hp")) / float(b.get("max")))
	old = b.get("ph")
	b.ph = ((1 if (r > 0.66) else (2 if (r > 0.33) else 3)) if (b.get("kind") == 3) else (1 if (r > (0.75 if b.get("mk") else 0.5)) else 2))
	if (b.get("ph") != old):
		shake(14)
		sfx("drop")
		banner = {"a": "", "b": ("FASE FINAL" if (b.get("ph") == 3) else "MODO FURIA"), "l": 90, "boss": 1}
		pickups.append({"type": "hp", "x": (b.get("x") + ((b.get("w")) / 2.0)), "y": max(b.get("y"), 20), "w": 8, "h": 8, "vy": -2, "l": 600})
		b.act = null
		b.cd = 50
		hazards = []
	if (b.get("hp", NAN) <= 0):
		killBoss()

# L1587
func killBoss():
	var b = null
	var e = null
	b = boss
	b.dead = 1
	b.on = 0
	b.deadT = 110
	ebul = []
	hazards = []
	trains = []
	sfx("drop")
	shake(24)
	hs = 10
	flash = 12
	flashC = "#fff"
	addScore(((500 if (b.get("kind") == 4) else 1000) * (st.get("n") + 1)), b.get("x"), (b.get("y") - 10))
	boom((b.get("x") + ((b.get("w")) / 2.0)), (b.get("y") + ((b.get("h")) / 2.0)), 18)
	for _i in range(_len(enemies)):
		if _i >= _len(enemies): break
		e = enemies[_i]
		e.dead = 1

# L1592
func bossCd(base = null):
	return (((((base + ((_rnd() * base) * 0.4)) / float(D.get("rate"))) / float((1.25 if (boss.get("ph", NAN) > 1) else 1))) / float((1.15 if (boss.get("ph", NAN) > 2) else 1))) / float((1 + (st.get("i") * 0.025))))

# L1593
func updateBoss():
	var b = null
	var ax = null
	var rage = null
	b = boss
	ax = st.get("arenaX")
	b.t += 1
	b.a += 0.12
	if (b.get("fl", NAN) > 0):
		b.fl -= 1
	if b.get("dead"):
		if (fmod(t, 6) == 0):
			burst((b.get("x") + (_rnd() * b.get("w"))), (b.get("y") + (_rnd() * b.get("h"))), ["#ff3d6e", "#ffd23f", "#3de8ff", "#fff"], 14, 3)
			sfx("kill")
			shake(6)
		if (fmod(t, 15) == 0):
			boom((b.get("x") + (_rnd() * b.get("w"))), (b.get("y") + (_rnd() * b.get("h"))), (7 + (_rnd() * 7)), 1)
		b.deadT -= 1
		if (b.deadT <= 0):
			burst((b.get("x") + ((b.get("w")) / 2.0)), (b.get("y") + ((b.get("h")) / 2.0)), ["#ff3d6e", "#ffd23f", "#3de8ff", "#fff", "#4dff88"], 120, 5)
			boom((b.get("x") + ((b.get("w")) / 2.0)), (b.get("y") + ((b.get("h")) / 2.0)), 30)
			boss = null
			stageClear()
		return
	if b.get("enter"):
		if b.get("gnd"):
			b.vy += 0.25
			b.y += b.get("vy")
			if (b.get("y", NAN) >= (GY - b.get("h"))):
				b.y = (GY - b.get("h"))
				b.vy = 0
				bossLand()
		else:
			b.y += ((b.get("hy") - b.get("y")) * 0.04)
			if (b.get("y", NAN) > (b.get("hy") - 4)):
				b.on = 1
				b.enter = 0
				sfx("horn")
				bossOn()
		return
	rage = (b.get("ph", NAN) > 1)
	_callv(_ix({0: boss0, 1: boss1, 2: boss2, 3: boss3, 4: bossM}, b.get("kind")), [b, ax, rage])
	if ((b.get("on") and hitR((p.get("x") + 1), (p.get("y") + 1), (p.get("w") - 2), (p.get("h") - 1), (b.get("x") + 2), (b.get("y") + 2), (b.get("w") - 4), (b.get("h") - 3))) and (not ((b.get("kind") == 2) and (b.get("act") != "low")))):
		hurt(1)

# L1607
func lob(b = null, n = null, sp = null):
	var dir = null
	var i = null
	dir = (1 if (p.get("x", NAN) > (b.get("x") + ((b.get("w")) / 2.0))) else -1)
	i = 0
	while (i < n):
		eshot((b.get("x") + ((b.get("w")) / 2.0)), (b.get("y") + 8), ((dir * ((1 + (i * 0.4)) + (_rnd() * 0.25))) * sp), (-2.3 - (_rnd() * 1.3)), {"gr": 0.12, "r": 4, "c": "#ff3d6e"})
		i += 1
	sfx("shoot")

# L1608
func ringShot(x = null, y = null, n = null, sp = null, off = null, c = null):
	var i = null
	var a = null
	i = 0
	while (i < n):
		a = (off + ((i * 6.283) / float(n)))
		eshot(x, y, (cos(a) * sp), (sin(a) * sp), {"c": (c if c else "#ff8aa6")})
		i += 1
	sfx("shootS")

# L1609
func boss0(b = null, ax = null, rage = null):
	var tx = null
	var r = null
	if ((b.get("act") == "dash") and (b.get("actT", NAN) <= 0)):
		b.x += b.get("vx")
		if ((b.get("x", NAN) <= (ax + 6)) or (b.get("x", NAN) >= (((ax + W) - b.get("w")) - 6))):
			b.x = j_clamp(b.get("x"), (ax + 6), (((ax + W) - b.get("w")) - 6))
			b.act = null
			shake(10)
			sfx("kill")
			lob(b, 3, 1)
		return
	if b.get("act"):
		b.actT -= 1
		if (b.actT <= 0):
			if (b.get("act") == "wave"):
				_push(hazards, [{"k": "wave", "x": (b.get("x") - 4), "vx": (-2.3 * D.get("bs")), "h": 10}, {"k": "wave", "x": ((b.get("x") + b.get("w")) - 4), "vx": (2.3 * D.get("bs")), "h": 10}])
				shake(8)
				sfx("drop")
				b.act = null
			elif (b.get("act") == "dash"):
				b.vx = ((1 if (p.get("x", NAN) > b.get("x", NAN)) else -1) * 4.2)
		return
	tx = (((ax + W) - 95) + (sin((b.get("t") * (0.035 if rage else 0.02))) * ((W * 0.3) if rage else (W * 0.2))))
	b.x += j_clamp((tx - b.get("x")), -0.8, 0.8)
	b.cd -= 1
	if (b.cd <= 0):
		r = _rnd()
		if (rage and (r < 0.3)):
			b.act = "dash"
			b.actT = 40
			sfx("tele")
		elif (r < (0.6 if rage else 0.45)):
			b.act = "wave"
			b.actT = 45
			sfx("tele")
		else:
			lob(b, (5 if rage else 3), 1)
		b.cd = bossCd((55 if rage else 85))

# L1622
func boss1(b = null, ax = null, rage = null):
	var v = null
	var tx = null
	var ty = null
	var r = null
	var cnt = null
	var i = null
	var e = null
	var _l = null
	var e_2 = null
	if (b.get("act") == "aim"):
		b.x += ((b.get("tx") - b.get("x")) * 0.12)
		b.actT -= 1
		if (b.actT <= 0):
			b.act = "dive"
			b.vy = 0
		return
	if (b.get("act") == "dive"):
		b.vy += 0.5
		b.y += b.get("vy")
		if (b.get("y", NAN) >= (GY - b.get("h"))):
			b.y = (GY - b.get("h"))
			b.act = "ground"
			b.actT = 70
			shake(14)
			sfx("drop")
			_push(hazards, [{"k": "wave", "x": (b.get("x") - 4), "vx": (-2 * D.get("bs")), "h": 8}, {"k": "wave", "x": ((b.get("x") + b.get("w")) - 4), "vx": (2 * D.get("bs")), "h": 8}])
		return
	if (b.get("act") == "ground"):
		b.actT -= 1
		if (b.actT <= 0):
			b.act = "rise"
		return
	if (b.get("act") == "rise"):
		b.y += ((92 - b.get("y")) * 0.06)
		if (b.get("y", NAN) < 98):
			b.act = null
		return
	if (b.get("act") == "burst"):
		if (fmod(b.get("actT"), 9) == 0):
			v = aimAt((b.get("x") + 14), (b.get("y") + 12), 2.1)
			eshot((b.get("x") + 14), (b.get("y") + 12), _ix(v, 0), _ix(v, 1), {"c": "#ffd23f"})
			sfx("shoot")
		b.actT -= 1
		if (b.actT <= 0):
			b.act = null
	tx = (((ax + (W / 2.0)) - 14) + (sin((b.get("t") * 0.018)) * ((W / 2.0) - 30)))
	ty = (90 + (sin((b.get("t") * 0.037)) * 10))
	b.x += ((tx - b.get("x")) * 0.03)
	b.y += ((ty - b.get("y")) * 0.05)
	_l = (not (b.get("act")))
	if _l:
		b.cd -= 1
		_l = (b.cd <= 0)
	if _l:
		r = _rnd()
		if (rage and (r < 0.3)):
			b.act = "aim"
			b.actT = 50
			b.tx = j_clamp((p.get("x") - 10), (ax + 8), ((ax + W) - 36))
			sfx("tele")
		elif (r < 0.55):
			b.act = "burst"
			b.actT = (36 if rage else 27)
		elif (r < 0.8):
			ringShot((b.get("x") + 14), (b.get("y") + 10), (14 if rage else 10), 1.3, (b.get("t") * 0.1))
		else:
			cnt = 0
			for _i in range(_len(enemies)):
				if _i >= _len(enemies): break
				e_2 = enemies[_i]
				if (not (e_2.get("dead"))):
					cnt += 1
			if (cnt < 3):
				i = 0
				while (i < 2):
					e = mkEnemy("f", (b.get("x") + (i * 14)), b.get("y"))
					if e:
						e.base = (60 + (i * 20))
						e.minion = 1
					i += 1
				sfx("horn")
			else:
				ringShot((b.get("x") + 14), (b.get("y") + 10), 8, 1.2, 0)
		b.cd = bossCd((60 if rage else 85))

# L1639
func boss2(b = null, ax = null, rage = null):
	var side = null
	var tx = null
	var r = null
	var n = null
	var i = null
	var _l = null
	if (b.get("act") == "train"):
		b.actT -= 1
		if (b.actT <= 0):
			side = b.get("side")
			trains.append({"x": ((ax - 150) if (side < 0) else ((ax + W) + 20)), "vx": ((-side * (7 if rage else 5.6)) * D.get("bs")), "w": 140, "h": 26, "y": (GY - 26)})
			sfx("horn")
			shake(6)
			if (rage and (not (b.get("second")))):
				b.second = 1
				b.side = -side
				b.actT = 70
			else:
				b.act = null
				b.second = 0
	elif (b.get("act") == "low"):
		if (b.get("actT", NAN) > 80):
			b.y += ((((GY - b.get("h")) - 2) - b.get("y")) * 0.08)
		elif (b.get("actT", NAN) > 20):
			if (fmod(b.get("actT"), 15) == 0):
				eshot(b.get("x"), (b.get("y") + 9), -2.2, 0, {"c": "#3de8ff"})
				eshot((b.get("x") + b.get("w")), (b.get("y") + 9), 2.2, 0, {"c": "#3de8ff"})
				sfx("shoot")
		else:
			b.y += ((88 - b.get("y")) * 0.1)
		b.actT -= 1
		if (b.actT <= 0):
			b.act = null
		return
	tx = (((ax + (W / 2.0)) - 12) + (sin((b.get("t") * 0.025)) * ((W / 2.0) - 26)))
	b.x += ((tx - b.get("x")) * 0.04)
	b.y += (((88 + (sin((b.get("t") * 0.06)) * 6)) - b.get("y")) * 0.1)
	_l = (not (b.get("act")))
	if _l:
		b.cd -= 1
		_l = (b.cd <= 0)
	if _l:
		r = _rnd()
		if (r < 0.42):
			b.act = "train"
			b.actT = 75
			b.side = (1 if ((p.get("x") - ax) < (W / 2.0)) else -1)
			sfx("tele")
		elif (r < 0.7):
			n = (12 if rage else 8)
			i = 0
			while (i < n):
				eshot(((ax + 12) + (_rnd() * (W - 24))), (-10 - (i * 14)), 0, (1.3 + (_rnd() * 0.4)), {"c": "#ffd23f", "r": 3})
				i += 1
			sfx("shootS")
		else:
			b.act = "low"
			b.actT = 130
			sfx("tele")
		b.cd = bossCd((70 if rage else 95))

# L1656
func boss3(b = null, ax = null, rage = null):
	var ph = null
	var tx = null
	var r = null
	var i = null
	var v = null
	var low = null
	var j = null
	var v2 = null
	ph = b.get("ph")
	b.y += (((((GY - b.get("h")) - 6) + (sin((b.get("t") * 0.05)) * 4)) - b.get("y")) * 0.1)
	if (b.get("act") == "wave"):
		b.actT -= 1
		if (b.actT <= 0):
			_push(hazards, [{"k": "wave", "x": (b.get("x") - 4), "vx": (-2.6 * D.get("bs")), "h": 10}, {"k": "wave", "x": ((b.get("x") + b.get("w")) - 4), "vx": (2.6 * D.get("bs")), "h": 10}])
			shake(8)
			sfx("drop")
			b.act = null
		return
	tx = (((ax + (W / 2.0)) - 13) + (sin((b.get("t") * (0.03 if (ph > 2) else 0.018))) * (((W / 2.0) - 18) if (ph > 1) else ((W / 2.0) - 56))))
	b.x += j_clamp((tx - b.get("x")), -1, 1)
	b.cd -= 1
	if (b.cd <= 0):
		r = _rnd()
		if (ph == 1):
			if (r < 0.5):
				lob(b, 4, 1)
			else:
				b.act = "wave"
				b.actT = 45
				sfx("tele")
		elif (ph == 2):
			if (r < 0.35):
				ringShot((b.get("x") + 13), (b.get("y") + 12), 12, 1.4, (b.get("t") * 0.07), "#ff8aa6")
			elif (r < 0.7):
				i = 0
				while (i < 3):
					v = aimAt((b.get("x") + 13), (b.get("y") + 8), 1.2)
					eshot((b.get("x") + 13), (b.get("y") + 8), (_ix(v, 0) + ((i - 1) * 0.6)), (_ix(v, 1) - 1), {"home": 110, "c": "#4dff88", "r": 3})
					i += 1
				sfx("shootH")
			else:
				b.act = "wave"
				b.actT = 40
				sfx("tele")
		else:
			if (r < 0.4):
				low = (_rnd() < 0.55)
				hazards.append({"k": "laser", "y": ((GY - 11) if low else (GY - 33)), "h": 8, "warn": 55, "act": 38})
				sfx("tele")
			elif (r < 0.65):
				ringShot((b.get("x") + 13), (b.get("y") + 12), 14, 1.5, (b.get("t") * 0.05), "#ff3d6e")
			elif (r < 0.85):
				j = 0
				while (j < 3):
					v2 = aimAt((b.get("x") + 13), (b.get("y") + 8), 1.3)
					eshot((b.get("x") + 13), (b.get("y") + 8), (_ix(v2, 0) + ((j - 1) * 0.7)), (_ix(v2, 1) - 1), {"home": 100, "c": "#4dff88", "r": 3})
					j += 1
				sfx("shootH")
			else:
				lob(b, 5, 1.1)
		b.cd = bossCd((80 if (ph == 1) else (65 if (ph == 2) else 55)))

# L1670
func mGround(b = null):
	var l = null
	b.vy = min((b.get("vy") + 0.25), 6)
	b.y += b.get("vy")
	if (b.get("y", NAN) >= (GY - b.get("h"))):
		b.y = (GY - b.get("h"))
		l = (b.get("vy", NAN) > 2)
		b.vy = 0
		b.gr = 1
		return l
	b.gr = 0
	return false

# L1671
func mWaves(b = null, sp = null, h = null):
	_push(hazards, [{"k": "wave", "x": (b.get("x") - 4), "vx": (-sp * D.get("bs")), "h": h}, {"k": "wave", "x": ((b.get("x") + b.get("w")) - 4), "vx": (sp * D.get("bs")), "h": h}])
	shake(9)
	sfx("drop")
	burst((b.get("x") + ((b.get("w")) / 2.0)), GY, ["#9aa0b0", "#fff"], 12, 2)

# L1672
func mCall(ch = null, n = null, x = null, y = null):
	var c = null
	var i = null
	var e = null
	var e_2 = null
	c = 0
	for _i in range(_len(enemies)):
		if _i >= _len(enemies): break
		e_2 = enemies[_i]
		if (not (e_2.get("dead"))):
			c += 1
	if (c >= 3):
		return false
	i = 0
	while (i < n):
		e = mkEnemy(ch, (x + ((i - ((n - 1) / 2.0)) * 16)), y)
		if e:
			e.minion = 1
			if (ch == "f"):
				e.base = (y + (i * 8))
		i += 1
	sfx("horn")
	return true

# L1674
func bossM(b = null, ax = null, rage = null):
	var mt = null
	var cx = null
	var dx = null
	var L = null
	var Rr = null
	var r = null
	var v = null
	var j = null
	var want = null
	var landed = null
	var tx = null
	var _l = null
	mt = b.get("mt")
	cx = (b.get("x") + ((b.get("w")) / 2.0))
	dx = ((p.get("x") + 4) - cx)
	L = (ax + 6)
	Rr = (((ax + W) - b.get("w")) - 6)
	if (((mt != "t") and (mt != "b")) and (not (b.get("act")))):
		want = (1 if (dx > 0) else -1)
		if (want != b.get("dir")):
			b.turn += 1
			if (b.turn > (50 if (mt == "s") else 10)):
				b.dir = want
				b.turn = 0
		else:
			b.turn = 0
	if (((mt == "w") or (mt == "h")) or (mt == "s")):
		landed = mGround(b)
		if (b.get("act") == "tele"):
			b.actT -= 1
			if (b.actT <= 0):
				b.act = b.get("next")
				if (b.get("next") == "charge"):
					b.vx = (b.get("dir") * (4.4 if rage else 3.6))
				else:
					b.vy = (-5.6 if (mt == "h") else -4.6)
					b.gr = 0
					b.vx = j_clamp((dx / 40.0), -2.6, 2.6)
			return
		if (b.get("act") == "charge"):
			b.x += b.get("vx")
			if (fmod(t, 3) == 0):
				burst((cx - ((b.get("dir") * b.get("w")) / 2.0)), (GY - 2), ["#9aa0b0"], 2, 1)
			if ((b.get("x", NAN) <= L) or (b.get("x", NAN) >= Rr)):
				b.x = j_clamp(b.get("x"), L, Rr)
				b.act = ("stun" if (mt == "s") else null)
				b.actT = 70
				shake(10)
				sfx("kill")
			return
		if (b.get("act") == "hop"):
			b.x = j_clamp((b.get("x") + b.get("vx")), L, Rr)
			if landed:
				mWaves(b, (2.2 if (mt == "h") else 2), (10 if (mt == "h") else 8))
				if (rage and (mt == "h")):
					ringShot(cx, (b.get("y") + 6), 8, 1.2, (b.get("t") * 0.1))
				b.act = ("stun" if (mt == "s") else null)
				b.actT = 60
			return
		if (b.get("act") == "stun"):
			b.actT -= 1
			if (b.actT <= 0):
				b.act = null
			return
		if (b.get("gr") and (mt != "h")):
			b.x = j_clamp((b.get("x") + ((b.get("dir") * (0.35 if (mt == "s") else 0.55)) * (1.4 if rage else 1))), L, Rr)
		b.cd -= 1
		if (b.cd <= 0):
			r = _rnd()
			if (mt == "w"):
				if (r < 0.4):
					b.act = "tele"
					b.actT = 34
					b.next = "charge"
					sfx("tele")
				elif (r < 0.7):
					b.act = "tele"
					b.actT = 24
					b.next = "hop"
					sfx("tele")
				elif (not (mCall("w", 2, cx, (GY - T)))):
					lob(b, 3, 1)
			elif (mt == "h"):
				if (r < 0.65):
					b.act = "tele"
					b.actT = 20
					b.next = "hop"
					sfx("tele")
				else:
					lob(b, (5 if rage else 3), 1)
			else:
				if (r < 0.45):
					b.act = "tele"
					b.actT = 30
					b.next = "hop"
					sfx("tele")
				elif (r < 0.8):
					b.act = "tele"
					b.actT = 36
					b.next = "charge"
					sfx("tele")
				else:
					v = aimAt(cx, (b.get("y") + 8), 1.6)
					j = -1
					while (j <= 1):
						eshot(cx, (b.get("y") + 8), _ix(v, 0), (_ix(v, 1) + (j * 0.5)), {"c": "#3de8ff"})
						j += 1
					sfx("shoot")
			b.cd = bossCd((55 if (mt == "h") else 75))
		return
	if (mt == "t"):
		mGround(b)
		if (b.get("act") == "burst"):
			if (fmod(b.get("actT"), 8) == 0):
				v = aimAt(cx, (b.get("y") + 6), 2)
				eshot(cx, (b.get("y") + 6), _ix(v, 0), _ix(v, 1), {"c": "#ff8a2a"})
				sfx("shoot")
			b.actT -= 1
			if (b.actT <= 0):
				b.act = null
			return
		b.cd -= 1
		if (b.cd <= 0):
			r = _rnd()
			if (r < 0.4):
				b.act = "burst"
				b.actT = (40 if rage else 24)
			elif (r < 0.65):
				ringShot(cx, (b.get("y") + 6), (14 if rage else 10), 1.25, (b.get("t") * 0.1), "#ff8a2a")
			elif ((r < 0.85) or (not rage)):
				if (not (mCall("f", 2, cx, (b.get("y") - 20)))):
					ringShot(cx, (b.get("y") + 6), 8, 1.2, 0, "#ff8a2a")
			else:
				hazards.append({"k": "laser", "y": ((GY - 11) if (_rnd() < 0.5) else (GY - 33)), "h": 8, "warn": 55, "act": 38})
				sfx("tele")
			b.cd = bossCd((60 if rage else 80))
		return
	if (mt == "b"):
		if (not (b.get("vx"))):
			b.vx = -1
		b.x += (b.get("vx") * (1.25 if rage else 0.9))
		if (b.get("x", NAN) <= L):
			b.x = L
			b.vx = 1
		elif (b.get("x", NAN) >= Rr):
			b.x = Rr
			b.vx = -1
		b.dir = (1 if (b.get("vx", NAN) > 0) else -1)
		b.y += (((b.get("hy") + (sin((b.get("t") * 0.05)) * 5)) - b.get("y")) * 0.08)
		if (b.get("act") == "carpet"):
			if (fmod(b.get("actT"), 9) == 0):
				eshot(cx, (b.get("y") + b.get("h")), (b.get("vx") * 0.3), 0.4, {"gr": 0.12, "c": "#ffd23f", "bomb": 1, "r": 3})
				sfx("shootS")
			b.actT -= 1
			if (b.actT <= 0):
				b.act = null
			return
		_l = (absf(dx) < 14)
		if _l:
			b.bc -= 1
			_l = (b.bc <= 0)
		if _l:
			eshot(cx, (b.get("y") + b.get("h")), 0, 0.5, {"gr": 0.12, "c": "#ffd23f", "bomb": 1, "r": 3})
			b.bc = (26.0 / (D.get("rate")))
		b.cd -= 1
		if (b.cd <= 0):
			r = _rnd()
			if (r < 0.45):
				b.act = "carpet"
				b.actT = (72 if rage else 45)
				sfx("tele")
			elif (r < 0.75):
				ringShot(cx, (b.get("y") + ((b.get("h")) / 2.0)), (12 if rage else 8), 1.2, (b.get("t") * 0.1), "#ffd23f")
			else:
				v = aimAt(cx, (b.get("y") + b.get("h")), 1.8)
				eshot(cx, (b.get("y") + b.get("h")), _ix(v, 0), _ix(v, 1), {"c": "#ff3d6e", "r": 4})
				sfx("shoot")
			b.cd = bossCd((60 if rage else 85))
		return
	if (b.get("act") == "aim"):
		b.x += ((b.get("tx") - b.get("x")) * 0.1)
		b.y += (((b.get("hy") - 10) - b.get("y")) * 0.1)
		b.actT -= 1
		if (b.actT <= 0):
			b.act = "dive"
			b.vy = 0
		return
	if (b.get("act") == "dive"):
		b.vy += 0.45
		b.y += b.get("vy")
		if (b.get("y", NAN) >= (GY - b.get("h"))):
			b.y = (GY - b.get("h"))
			b.act = "ground"
			b.actT = 55
			mWaves(b, 2, 7)
		return
	if (b.get("act") == "ground"):
		b.actT -= 1
		if (b.actT <= 0):
			b.act = "rise"
		return
	if (b.get("act") == "rise"):
		b.y += ((b.get("hy") - b.get("y")) * 0.06)
		if (b.get("y", NAN) < (b.get("hy") + 6)):
			b.act = null
		return
	tx = (((ax + (W / 2.0)) - ((b.get("w")) / 2.0)) + (sin((b.get("t") * 0.021)) * (((W / 2.0) - ((b.get("w")) / 2.0)) - 10)))
	b.x += ((tx - b.get("x")) * 0.03)
	b.y += (((b.get("hy") + (sin((b.get("t") * 0.07)) * 8)) - b.get("y")) * 0.06)
	b.cd -= 1
	if (b.cd <= 0):
		r = _rnd()
		if (r < 0.4):
			b.act = "aim"
			b.actT = 45
			b.tx = j_clamp(((p.get("x") + 4) - ((b.get("w")) / 2.0)), L, Rr)
			sfx("tele")
		elif (r < 0.7):
			if (not (mCall("f", 3, cx, b.get("y")))):
				ringShot(cx, (b.get("y") + ((b.get("h")) / 2.0)), 10, 1.2, (b.get("t") * 0.1), "#e8336c")
		else:
			v = aimAt(cx, (b.get("y") + ((b.get("h")) / 2.0)), 1.7)
			j = -1
			while (j <= 1):
				eshot(cx, (b.get("y") + ((b.get("h")) / 2.0)), (_ix(v, 0) + (j * 0.5)), _ix(v, 1), {"c": "#e8336c"})
				j += 1
			sfx("shootS")
		b.cd = bossCd((55 if rage else 80))

# L1729
func updateHazards():
	var ax = null
	var i = null
	var h = null
	var k = null
	var tr = null
	ax = st.get("arenaX")
	i = (_len(hazards) - 1)
	while (i >= 0):
		h = _ix(hazards, i)
		if (h.get("k") == "wave"):
			h.x += h.get("vx")
			if hitR((p.get("x") + 1), p.get("y"), (p.get("w") - 2), p.get("h"), h.get("x"), (GY - h.get("h")), 8, h.get("h")):
				hurt(1)
			if ((h.get("x", NAN) < (ax - 20)) or (h.get("x", NAN) > ((ax + W) + 20))):
				_splice(hazards, i, 1, [])
		elif (h.get("k") == "laser"):
			if (h.get("warn", NAN) > 0):
				h.warn -= 1
				if (h.warn == 0):
					sfx("laser")
			elif (h.get("act", NAN) > 0):
				h.act -= 1
				shake(2)
				if hitR(p.get("x"), p.get("y"), p.get("w"), p.get("h"), ax, h.get("y"), W, h.get("h")):
					hurt(1)
			else:
				_splice(hazards, i, 1, [])
		i -= 1
	k = (_len(trains) - 1)
	while (k >= 0):
		tr = _ix(trains, k)
		tr.x += tr.get("vx")
		if hitR((p.get("x") + 1), (p.get("y") + 1), (p.get("w") - 2), (p.get("h") - 1), tr.get("x"), tr.get("y"), tr.get("w"), tr.get("h")):
			hurt(1)
		if (_rnd() < 0.5):
			parts.append({"x": (tr.get("x") + (0 if (tr.get("vx", NAN) > 0) else tr.get("w"))), "y": ((tr.get("y") + tr.get("h")) - 2), "vx": (-(tr.get("vx")) * 0.2), "vy": -(_rnd()), "l": 18, "c": "#ffd23f", "gr": 0.05})
		if ((tr.get("x", NAN) < (cam - 200)) if tr.get("lv") else ((tr.get("x", NAN) < (ax - 200)) or (tr.get("x", NAN) > ((ax + W) + 200)))):
			_splice(trains, k, 1, [])
		k -= 1

# L1745
func updateBullets():
	var i = null
	var b = null
	var gone = null
	var best_2 = null
	var bd = null
	var d2 = null
	var a = null
	var sp = null
	var cur = null
	var da = null
	var j = null
	var e = null
	var k = null
	var q = null
	var v = null
	var dead = null
	var e_2 = null
	var d = null
	i = (_len(bullets) - 1)
	while (i >= 0):
		b = _ix(bullets, i)
		gone = false
		if (not b):
			i -= 1
			continue
		if b.get("home"):
			best_2 = null
			bd = 1000000000
			for _i in range(_len(enemies)):
				if _i >= _len(enemies): break
				e_2 = enemies[_i]
				d = null
				if ((e_2.get("dead") or (e_2.get("type") == "*")) or (e_2.get("type") == "X")):
					continue
				d = _hypot((e_2.get("x") - b.get("x")), (e_2.get("y") - b.get("y")))
				if (d < bd):
					bd = d
					best_2 = e_2
			if (boss and boss.get("on")):
				d2 = _hypot(((boss.get("x") + ((boss.get("w")) / 2.0)) - b.get("x")), ((boss.get("y") + ((boss.get("h")) / 2.0)) - b.get("y")))
				if (d2 < bd):
					bd = d2
					best_2 = {"x": ((boss.get("x") + ((boss.get("w")) / 2.0)) - 4), "y": ((boss.get("y") + ((boss.get("h")) / 2.0)) - 4), "w": 8, "h": 8}
			if (best_2 and (bd < 160)):
				a = atan2(((best_2.get("y") + ((best_2.get("h")) / 2.0)) - b.get("y")), ((best_2.get("x") + ((best_2.get("w")) / 2.0)) - b.get("x")))
				sp = _hypot(b.get("vx"), b.get("vy"))
				cur = atan2(b.get("vy"), b.get("vx"))
				da = (a - cur)
				while (da > PI):
					da -= 6.283
				while (da < -PI):
					da += 6.283
				cur += j_clamp(da, -0.12, 0.12)
				b.vx = (cos(cur) * sp)
				b.vy = (sin(cur) * sp)
		b.x += b.get("vx")
		b.y += b.get("vy")
		b.l -= 1
		if (((b.l <= 0) or (b.get("y", NAN) < -10)) or (b.get("y", NAN) > WH)):
			gone = true
		if ((not gone) and (tileAt(floori(((b.get("x")) / float(T))), floori(((b.get("y")) / float(T)))) == 1)):
			gone = true
			burst(b.get("x"), b.get("y"), ["#fff", _ix(WPN, b.get("w")).get("c")], 3, 1)
		j = 0
		while ((j < _len(enemies)) and (not gone)):
			e = _ix(enemies, j)
			if (e.get("dead") or (_indexOf(b.hitL, e) > -1)):
				j += 1
				continue
			if hitR((b.get("x") - 2), (b.get("y") - 2), 5, 5, e.get("x"), e.get("y"), e.get("w"), e.get("h")):
				if ((((e.get("type") == "s") and (signf(b.get("vx")) == -(e.get("dir")))) and (absf(b.get("vy")) < (absf(b.get("vx")) * 0.8))) and (not (b.get("home")))):
					gone = true
					sfx("clink")
					burst(b.get("x"), b.get("y"), ["#9aa0b0", "#fff"], 4, 1.5)
					break
				run.stats.hits += 1
				sfx("hit")
				burst(b.get("x"), b.get("y"), ["#fff", _ix(WPN, b.get("w")).get("c")], 4, 1.4)
				damageEnemy(e, b.get("dmg"), b.get("vx"))
				if b.get("pierce"):
					b.hitL.append(e)
				else:
					gone = true
			j += 1
		if ((((not gone) and boss) and boss.get("on")) and hitR((b.get("x") - 2), (b.get("y") - 2), 5, 5, boss.get("x"), boss.get("y"), boss.get("w"), boss.get("h"))):
			if ((((((boss.get("kind") == 4) and (boss.get("mt") == "s")) and (boss.get("act") != "stun")) and (not (b.get("home")))) and (signf(b.get("vx")) == -(boss.get("dir")))) and (absf(b.get("vy")) < (absf(b.get("vx")) * 0.8))):
				_splice(bullets, i, 1, [])
				sfx("clink")
				burst(b.get("x"), b.get("y"), ["#9aa0b0", "#fff"], 4, 1.5)
				i -= 1
				continue
			run.stats.hits += 1
			burst(b.get("x"), b.get("y"), ["#fff", "#3de8ff"], 4, 1.4)
			sfx("hit")
			damageBoss(b.get("dmg"))
			gone = true
			hs = max(hs, 1)
		if gone:
			_splice(bullets, i, 1, [])
		i -= 1
	k = (_len(ebul) - 1)
	while (k >= 0):
		q = _ix(ebul, k)
		if (not q):
			k -= 1
			continue
		if (q.get("home", NAN) > 0):
			q.home -= 1
			v = aimAt(q.get("x"), q.get("y"), (1.25 * D.get("bs")))
			q.vx += ((_ix(v, 0) - q.get("vx")) * 0.04)
			q.vy += ((_ix(v, 1) - q.get("vy")) * 0.04)
		q.vy += q.get("gr")
		q.x += q.get("vx")
		q.y += q.get("vy")
		q.l -= 1
		dead = _or((q.l <= 0), _and((q.get("y", NAN) > (GY - 2)), _or((q.get("gr", NAN) > 0), q.get("bomb"))))
		if (((not dead) and (q.get("y", NAN) > 0)) and (tileAt(floori(((q.get("x")) / float(T))), floori(((q.get("y")) / float(T)))) == 1)):
			dead = true
		if ((not dead) and hitR((p.get("x") + 1), (p.get("y") + 1), (p.get("w") - 2), (p.get("h") - 2), ((q.get("x") - q.get("r")) + 1), ((q.get("y") - q.get("r")) + 1), ((q.get("r") * 2) - 2), ((q.get("r") * 2) - 2))):
			hurt(1)
			dead = true
		if dead:
			burst(q.get("x"), q.get("y"), [q.get("c"), "#fff"], (12 if q.get("bomb") else 5), (2.2 if q.get("bomb") else 1.2))
			if q.get("bomb"):
				sfx("box")
				if ((absf(((p.get("x") + 4) - q.get("x"))) < 16) and ((p.get("y") + p.get("h")) > (GY - 18))):
					hurt(1)
			_splice(ebul, k, 1, [])
		elif ((q.get("x", NAN) < (cam - 40)) or (q.get("x", NAN) > ((cam + W) + 40))):
			_splice(ebul, k, 1, [])
		k -= 1

# L1774
func updatePickups():
	var i = null
	var k = null
	var cy = null
	var tt = null
	var mag = null
	var _l = null
	var _a = null
	var c = null
	i = (_len(pickups) - 1)
	while (i >= 0):
		k = _ix(pickups, i)
		if (not (k.get("stat"))):
			k.vy = min(((k.get("vy") if k.get("vy") else 0) + 0.15), 4)
			k.x += (k.get("vx") if k.get("vx") else 0)
			if k.get("vx"):
				k.vx *= 0.97
			k.y += k.get("vy")
			if (((k.get("y") + k.get("h")) >= GY) and (tileAt(floori(((k.get("x") + 4) / float(T))), floori(((k.get("y") + k.get("h")) / float(T)))) == 1)):
				k.y = ((floori(((k.get("y") + k.get("h")) / float(T))) * T) - k.get("h"))
				k.vy = 0
			else:
				cy = floori(((k.get("y") + k.get("h")) / float(T)))
				tt = tileAt(floori(((k.get("x") + 4) / float(T))), cy)
				if (((k.get("vy", NAN) > 0) and ((tt == 1) or (tt == 2))) and (((k.get("y") + k.get("h")) - k.get("vy")) <= ((cy * T) + 1))):
					k.y = ((cy * T) - k.get("h"))
					k.vy = 0
		mag = (6 if (k.get("type") == "coin") else 0)
		if ((not (p.get("dead"))) and hitR((p.get("x") - mag), (p.get("y") - mag), (p.get("w") + (mag * 2)), (p.get("h") + (mag * 2)), k.get("x"), k.get("y"), k.get("w"), k.get("h"))):
			if (k.get("type") == "coin"):
				run.coins += 1
				BANK += 1
				save("ds2_bank", BANK)
				run.score += 5
				addBass(1.5)
				sfx("coin")
				burst((k.get("x") + 4), (k.get("y") + 4), ["#ffd23f"], 4, 1)
			elif (k.get("type") == "hp"):
				if (p.get("hp", NAN) < run.get("maxHp", NAN)):
					p.hp += 1
				else:
					run.score += 100
				pop((k.get("x") - 8), (k.get("y") - 6), "+VIDA", "#4dff88")
				sfx("pick")
			elif (k.get("type") == "wpn"):
				if (k.get("wt") == run.get("wpn")):
					run.lv = min(3, (run.get("lv") + 1))
				else:
					run.wpn = k.get("wt")
				pop((k.get("x") - 14), (k.get("y") - 8), str(_ix(WPN, k.get("wt")).get("n")) + " " + str(run.get("lv")), _ix(WPN, k.get("wt")).get("c"))
				sfx("power")
			_splice(pickups, i, 1, [])
			i -= 1
			continue
		_l = (k.get("l", NAN) > 0)
		if _l:
			k.l -= 1
			_l = (k.l <= 0)
		if _l:
			_splice(pickups, i, 1, [])
		elif (k.get("y", NAN) > (WH + 20)):
			_splice(pickups, i, 1, [])
		i -= 1
	_a = st.get("cps")
	for _i in range(_len(_a)):
		if _i >= _len(_a): break
		c = _a[_i]
		if ((not (c.get("on"))) and (absf((p.get("x") - c.get("x"))) < 10)):
			c.on = 1
			st.cp = {"x": c.get("x"), "y": (GY - 14)}
			sfx("cp")
			pop((c.get("x") - 24), (c.get("y") - 10), "PUNTO DE CONTROL", "#4dff88")
			if (p.get("hp", NAN) < run.get("maxHp", NAN)):
				p.hp += 1
			if ((st.L.get("cut") and st.L.cut.get("cp")) and (not (seen("cp")))):
				startCut(st.L.cut.get("cp"))

# L1810
func isHood(r = null, g_2 = null, b = null):
	var mx = null
	var mn = null
	var h = null
	mx = max(r, g_2, b)
	mn = min(r, g_2, b)
	if (((mx != g_2) or (mx < 40)) or ((mx - mn) < (0.4 * mx))):
		return false
	h = (((60 * (b - r)) / float((mx - mn))) + 120)
	return _and(_and((h >= 105), (h <= 162)), (lum(r, g_2, b) < 135))

# L1813
func lookPor(k = null):
	var B = null
	var key = null
	var o = null
	var w = null
	var h = null
	var cn = null
	var q = null
	var im = null
	var d = null
	var i = null
	var sk = null
	var tp = null
	var r = null
	var G = null
	var b = null
	var L = null
	if ((not (LOOK.get("s"))) and (not (LOOK.get("t")))):
		return k
	B = _ix(SHEET, k)
	key = str(k) + "_L"
	o = _ix(SHEET, key)
	if ((not B) or (not (B.get("ok")))):
		return k
	if (o and (o.get("ver") == lookVer)):
		return key
	w = B.img.get("width")
	h = B.img.get("height")
	cn = _callm(document, "createElement", ["canvas"])
	cn.width = w
	cn.height = h
	q = cn.getContext("2d")
	q.drawImage(B.get("img"), 0, 0)
	im = q.getImageData(0, 0, w, h)
	d = im.get("data")
	sk = (_ix(LK.s, LOOK.get("s")).get("v") if LOOK.get("s") else null)
	tp = (_ix(LK.t, LOOK.get("t")).get("v") if LOOK.get("t") else null)
	i = 0
	while (i < _len(d)):
		if (d[int((i + 3))] < 128):
			i += 4
			continue
		r = d[int(i)]
		G = d[int((i + 1))]
		b = d[int((i + 2))]
		L = lum(r, G, b)
		if (sk and isSkin(r, G, b)):
			paint(d, i, sk, (L / float(PSK)))
		elif (tp and isHood(r, G, b)):
			paint(d, i, tp, (L / float(PHD)))
		i += 4
	q.putImageData(im, 0, 0)
	_aset(SHEET, key, {"fw": B.get("fw"), "fh": B.get("fh"), "n": B.get("n"), "x1": B.get("x1"), "ok": true, "img": cn, "wimg": null, "ver": lookVer})
	return key

# L1823
func seen(k = null):
	var id = null
	id = str(st.get("i")) + ":" + str(k)
	run.seen = (run.get("seen") if run.get("seen") else {})
	if _ix(run.seen, id):
		return true
	_aset(run.seen, id, 1)
	return false

# L1825
func startCut(lines = null, then = null, ill = null):
	var io = null
	if ((not lines) or (not (_len(lines)))):
		if then:
			then.call()
		return
	io = (_ix(SHEET, ill) if ill else ill)
	cut = {"lines": lines, "i": 0, "ch": 0, "t": 0, "then": (then if then else null), "bar": 0, "card": (1 if (io and io.get("ok")) else 0), "ill": ill}
	mode = "cut"
	TS = {}
	LATCH = {}
	if p:
		p.vx = 0
	bullets = []
	ebul = []

# L1836
func cutQ():
	CUQ = max(1, _round((SC * UIF)))

# L1837
func cutTx():
	return (ceili(((52 * CUQ) / float((SC * HS)))) + 2)

# L1838
func cutLine():
	var c = null
	var l = null
	var mw = null
	c = cut
	l = _ix(c.lines, c.get("i"))
	mw = (HW - ((cutTx() + 4) if (l.get("w") and (not (cutIl(l)))) else 16))
	if ((not (c.get("wr"))) or (c.get("mw") != mw)):
		c.wr = j_wrap(l.get("s"), mw)
		c.mw = mw
	return l

# L1839
func cutIl(l = null):
	var o = null
	o = (_ix(SHEET, l.get("i")) if l.get("i") else l.get("i"))
	return (not (not (o and o.get("ok"))))

# L1840
func cutAdv():
	var c = null
	var l = null
	if (not cut):
		return
	c = cut
	l = _ix(c.lines, c.get("i"))
	if c.get("card"):
		if (c.get("t", NAN) < 10):
			return
		sfx("clink")
		c.card = 0
		c.t = 0
		c.bar = 0
		return
	if (c.get("ch", NAN) < _len(l.s)):
		c.ch = _len(l.s)
		return
	sfx("clink")
	c.i += 1
	c.ch = 0
	c.t = 0
	c.wr = null
	if (c.get("i", NAN) >= _len(c.lines)):
		endCut()

# L1844
func cutSkip():
	if cut:
		endCut()

# L1845
func endCut():
	var f = null
	f = cut.get("then")
	cut = null
	mode = "play"
	prevI = {"J": 1, "DA": 1, "B": 1}
	LATCH = {}
	if f:
		f.call()

# L1846
func updateCut():
	var c = null
	var l = null
	var e = null
	var o = null
	var a = null
	var q = null
	var b = null
	pollPad()
	if (not cut):
		return
	c = cut
	l = _ix(c.lines, c.get("i"))
	c.t += 1
	if c.get("card"):
		return
	if (c.get("bar", NAN) < 1):
		c.bar = min(1, (c.get("bar") + 0.08))
	if (c.get("t") == 1):
		e = l.get("e")
		if (e == "boom"):
			boom((cam + (W * 0.68)), (GY - 26), 16)
		elif (e == "alarm"):
			sfx("siren")
			flash = 12
			flashC = "#ff3d6e"
		elif (e == "shake"):
			shake(14)
			sfx("drop")
		elif (e == "flash"):
			flash = 24
			flashC = "#fff"
			sfx("power")
	if (((l.get("e") == "booms") and (fmod(c.get("t"), 13) == 1)) and (c.get("t", NAN) < 60)):
		boom(((cam + 24) + (_rnd() * (W - 48))), ((GY - 16) - (_rnd() * 36)), (10 + (_rnd() * 10)), (c.get("t", NAN) > 1))
	if ((c.get("t", NAN) > 8) and (c.get("ch", NAN) < _len(l.s))):
		o = int(c.get("ch"))
		c.ch = min(_len(l.s), (c.get("ch") + 1.25))
		if (((int(c.get("ch")) != o) and ((int(o) & int(3)) == 0)) and (_ix(l.s, o) != " ")):
			sfx("blip")
	a = (_len(parts) - 1)
	while (a >= 0):
		q = _ix(parts, a)
		q.x += q.get("vx")
		q.y += q.get("vy")
		q.vy += q.get("gr")
		q.l -= 1
		if (q.l <= 0):
			_splice(parts, a, 1, [])
		a -= 1
	b = (_len(pops) - 1)
	while (b >= 0):
		pops[b].y -= 0.35
		pops[b].l -= 1
		if (pops[b].l <= 0):
			_splice(pops, b, 1, [])
		b -= 1
	if ring:
		ring.r += 6
		if (ring.get("r", NAN) > 360):
			ring = null
	updBooms()

# L1865
func cutFace(l = null, x = null, y = null):
	var w = null
	var P = null
	var k = null
	var f = null
	var o = null
	var s = null
	var L = null
	w = l.get("w")
	P = _ix(POR, w)
	g.save()
	g.setTransform(CUQ, 0, 0, CUQ, 0, 0)
	g.beginPath()
	g.rect(x, y, 48, 56)
	g.clip()
	if P:
		k = (lookPor(P.get("k")) if P.get("look") else P.get("k"))
		o = _ix(SHEET, k)
		if (o and o.get("ok")):
			f = _or(_ix(P.f, l.get("f")), 0)
			if (((P.get("o") and (cut.get("ch", NAN) < _len(l.s))) and (cut.get("t", NAN) > 8)) and (int((int(t) >> int(3))) & int(1))):
				f += 1
			blitS(k, f, x, y, 1)
	else:
		L = st.get("L")
		k = (_ix(ESHEET, L.get("mt")) if (L.get("ai") == 4) else "b_" + str(L.get("ai")))
		if L.get("mk"):
			k = tintSheet(k)
		o = _ix(SHEET, k)
		if (o and o.get("ok")):
			s = max(2, floori(min((48.0 / (o.get("fw"))), (56.0 / (o.get("fh"))))))
			blitS(k, fmod((int(t) >> int(4)), o.get("n")), ((x + 24) - _round(((o.get("fw") * s) / 2.0))), ((y + 2) if ((o.get("fh") * s) > 56) else ((y + 56) - (o.get("fh") * s))), s)
	cutFx(l, x, y, 48, 56)
	g.restore()

# L1879
func cutFx(l = null, x = null, y = null, w = null, h = null):
	var n = null
	var m = null
	var cx = null
	var cy = null
	var R = null
	var j = null
	var bx = null
	var by = null
	if (l.get("x") == "static"):
		n = 0
		m = _round(((w * h) / 79.0))
		while (n < m):
			g.globalAlpha = (0.3 + (_rnd() * 0.4))
			rect((x + int((_rnd() * (w - 1)))), (y + int((_rnd() * (h - 1)))), (1 + int((_rnd() * 3))), 1, ("#fff" if (_rnd() < 0.5) else "#8f98c8"))
			n += 1
		g.globalAlpha = 0.16
		rect(x, ((y + fmod((int(t) >> int(1)), (h + 4))) - 2), w, 2, "#fff")
		g.globalAlpha = 1
	elif (l.get("x") == "tape"):
		g.globalAlpha = 0.14
		rect(x, y, w, h, "#ffb060")
		g.globalAlpha = 1
		cx = ((x + w) - 19)
		cy = ((y + h) - 11)
		R = _ix([[-1, -1], [0, -1], [0, 0], [-1, 0]], (int((int(t) >> int(3))) & int(3)))
		rect(cx, cy, 18, 10, "#1a1530")
		rect((cx + 1), (cy + 1), 16, 8, "#d9c9a0")
		rect((cx + 1), (cy + 1), 16, 1, "#fff3d0")
		rect((cx + 3), (cy + 3), 12, 4, "#2a2238")
		j = 0
		while (j < 2):
			bx = ((cx + 5) + (j * 7))
			by = (cy + 5)
			rect((bx - 1), (by - 1), 2, 2, "#e9e1c8")
			rect((bx + _ix(R, 0)), (by + _ix(R, 1)), 1, 1, "#1a1530")
			j += 1

# L1891
func drawCard(c = null):
	var o = null
	var a = null
	var ix = null
	var iy = null
	var b = null
	var x0 = null
	var x1 = null
	var y0 = null
	var y1 = null
	var cx = null
	o = _ix(SHEET, c.get("ill"))
	a = min(1, ((c.get("t")) / 20.0))
	ix = floori(((W - 160) / 2.0))
	iy = floori(((H - 90) / 2.0))
	g.save()
	g.setTransform(SC, 0, 0, SC, 0, 0)
	rect(0, 0, W, H, "#000")
	if (o and o.get("ok")):
		g.globalAlpha = a
		blitS(c.get("ill"), 0, ix, iy, 1)
		g.globalAlpha = 1
	g.restore()
	b = max(0, min(1, ((c.get("t") - 14) / 10.0)))
	if (not b):
		return
	x0 = ceili((ix / float(HS)))
	x1 = floori(((ix + 160) / float(HS)))
	y0 = ceili((iy / float(HS)))
	y1 = floori(((iy + 90) / float(HS)))
	cx = ((x0 + x1) / 2.0)
	g.save()
	g.setTransform((SC * HS), 0, 0, (SC * HS), 0, 0)
	g.globalAlpha = b
	g.globalAlpha = (b * 0.62)
	rect(x0, y0, (x1 - x0), 14, "#000")
	rect(x0, (y1 - 26), (x1 - x0), 26, "#000")
	g.globalAlpha = b
	txt("FASE " + str((st.get("i") + 1)), (x0 + 5), (y0 + 3), "#8f98c8")
	txt(("SALTAR" if touchMode() else "ESC: SALTAR"), (x1 - 5), (y0 + 3), "#5a6390", "r")
	txt(st.L.get("name"), cx, (y1 - 22), "#ffd23f", "c")
	if ((c.get("t", NAN) > 24) and (int((int(t) >> int(4))) & int(1))):
		txt(("TOCA PARA SEGUIR" if touchMode() else "INTRO PARA SEGUIR"), cx, (y1 - 11), "#eef3ff", "c")
	g.globalAlpha = 1
	g.restore()

# L1906
func drawCut():
	var c = null
	var l = null
	var il = null
	var e = null
	var tb = null
	var bh = null
	var by = null
	var ov = null
	var bt = null
	var ix = null
	var iy = null
	var vy = null
	var vh = null
	var fz = null
	var sk = null
	var fw = null
	var sw = null
	var P = null
	var nm = null
	var nc = null
	var px = null
	var py = null
	var tx = null
	var ny = null
	var y0 = null
	var left = null
	var ln = null
	var i2 = null
	c = cut
	if (not c):
		return
	if c.get("card"):
		drawCard(c)
		return
	l = cutLine()
	il = cutIl(l)
	e = c.get("bar")
	tb = (0 if il else _round((16 * e)))
	bh = _round((((20 if l.get("w") else 10) + (10 * _len(c.wr))) * e))
	by = (HH - bh)
	ov = 0
	if il:
		bt = floori((by * HS))
		ix = floori(((W - 160) / 2.0))
		iy = max((bt - 90), -12)
		ov = ((iy + 90) - bt)
		g.save()
		g.setTransform(SC, 0, 0, SC, 0, 0)
		g.globalAlpha = min(1, ((c.get("t")) / 10.0))
		rect(0, 0, W, H, "#000")
		blitS(l.get("i"), 0, ix, iy, 1)
		g.globalAlpha = 1
		if (l.get("x") and (c.get("t", NAN) >= 10)):
			vy = max(0, iy)
			vh = ((iy + 90) - vy)
			g.beginPath()
			g.rect(ix, vy, 160, vh)
			g.clip()
			cutFx(l, ix, vy, 160, vh)
		g.restore()
	g.save()
	g.setTransform((SC * HS), 0, 0, (SC * HS), 0, 0)
	rect(0, 0, HW, tb, "#000")
	if (ov > 0):
		g.globalAlpha = 0.78
	rect(0, by, HW, bh, "#06070d")
	g.globalAlpha = 1
	rect(0, by, HW, 1, "#2a2e48")
	if (e >= 1):
		fz = "FASE " + str((st.get("i") + 1))
		sk = ("SALTAR" if touchMode() else "ESC: SALTAR")
		if il:
			g.font = "8px \"Press Start 2P\", monospace"
			fw = g.measureText(fz).get("width")
			sw = g.measureText(sk).get("width")
			g.globalAlpha = 0.7
			rect(3, 2, (fw + 6), 12, "#06070d")
			rect(((HW - 9) - sw), 2, (sw + 6), 12, "#06070d")
			g.globalAlpha = 1
		txt(fz, 6, 4, "#5a6390")
		txt(sk, (HW - 6), 4, ("#8f98c8" if (int((int(t) >> int(4))) & int(1)) else "#5a6390"), "r")
	g.restore()
	if (e < 1):
		return
	P = _ix(POR, l.get("w"))
	nm = (st.L.get("boss") if (l.get("w") == "BOSS") else (P.get("n") if P else ""))
	nc = (P.get("c") if P else "#ff3d6e")
	px = 2
	py = (ceili(((H * SC) / float(CUQ))) - 57)
	if (l.get("w") and (not il)):
		g.save()
		g.setTransform(CUQ, 0, 0, CUQ, 0, 0)
		rect((px - 2), (py - 2), 52, 60, nc)
		rect((px - 1), (py - 1), 50, 58, "#1a1530")
		rect(px, py, 48, 56, "#151a2e")
		g.restore()
		cutFace(l, px, py)
	g.save()
	g.setTransform((SC * HS), 0, 0, (SC * HS), 0, 0)
	tx = (cutTx() if (l.get("w") and (not il)) else 8)
	ny = (by + 6)
	y0 = ((by + 16) if l.get("w") else (by + 6))
	if (P and P.get("s")):
		g.font = "8px \"Press Start 2P\", monospace"
		if ((tx + g.measureText(nm).get("width")) > (HW - 16)):
			nm = P.get("s")
	if nm:
		txt(nm, tx, ny, nc)
	left = int(c.get("ch"))
	ln = c.get("wr")
	i2 = 0
	while ((i2 < _len(ln)) and (left > 0)):
		txtM(_slice(_ix(ln, i2), 0, left), tx, (y0 + (i2 * 10)), "#eef3ff", l.get("m"), (int(c.get("ch")) - left))
		left -= (_len(_ix(ln, i2)) + 1)
		i2 += 1
	if ((c.get("ch", NAN) >= _len(l.s)) and (int((int(t) >> int(4))) & int(1))):
		txt(">", (HW - 12), (y0 + ((_len(ln) - 1) * 10)), "#ffd23f")
	if (flash > 0):
		g.globalAlpha = (flash / 24.0)
		rect(0, 0, HW, HH, flashC)
		g.globalAlpha = 1
	g.restore()

# L1947
func stageClear():
	if ((st.get("i") == 0) and (not (SET.get("tut")))):
		SET.tut = true
		save("ds2_set", SET)
	st.clearT = 150
	bossMusic = 0
	banner = {"a": "FASE SUPERADA", "b": str(st.L.get("boss")) + " KO", "l": 150}

# L1950
func finishStage():
	var secs = null
	var tb = null
	var nh = null
	var cb = null
	var last_2 = null
	var nt = null
	secs = floori(((st.get("t")) / 60.0))
	tb = max(0, (3000 - (secs * 12)))
	nh = (2000 if st.get("hurtFree") else 0)
	cb = ((run.get("coins") - st.get("coinsAt")) * 10)
	run.score += ((tb + nh) + cb)
	last_2 = (st.get("i") == (_len(LEVELS) - 1))
	nt = ((st.get("i") + 1) > LOREN)
	if nt:
		LOREN = (st.get("i") + 1)
		save("ds2_lore", LOREN)
	mode = ("win" if last_2 else "shop")
	if last_2:
		showWin()
		return
	slotSave("shop", (st.get("i") + 1))
	show("<div class=\"panel\"><h2>FASE " + str((st.get("i") + 1)) + " SUPERADA</h2><h3>" + str(st.L.get("boss")) + " DERROTADO</h3>" + "<div class=\"stats\"><span>TIEMPO " + str(floori((secs / 60.0))) + ":" + pad(fmod(secs, 60), 2) + "</span><b>+" + str(tb) + "</b><span>SIN DAÑO</span><b>+" + str(nh) + "</b><span>DISCOS RECOGIDOS</span><b>+" + str(cb) + "</b>" + "<span class=\"tot\">PUNTOS</span><b class=\"tot\">" + pad(run.get("score"), 7) + "</b></div>" + ("<p class=\"note\">NUEVA CINTA EN EL ARCHIVO: " + str(_ix(_ix(LORE, st.get("i")), 0)) + "</p>" if nt else "") + "<div class=\"menu\"><button class=\"btn hot\" data-act=\"shop\">IR A LA TIENDA</button></div></div>")

# L1971
func showShop():
	var h = null
	var it = null
	var lv = null
	var maxed = null
	var cost = null
	var pips = null
	mode = "shop"
	h = "<div class=\"panel\"><h2>TIENDA DEL SELECTOR</h2><p class=\"coins\">DISCOS: " + str(run.get("coins")) + "</p><div class=\"shop\">"
	for _i in range(_len(ITEMS)):
		if _i >= _len(ITEMS): break
		it = ITEMS[_i]
		lv = null
		maxed = null
		cost = null
		pips = null
		if (it.get("id") == "heal"):
			continue
		lv = (0 if (it.get("id") == "life") else _ix(run.up, it.get("id")))
		maxed = (lv >= it.get("max", NAN))
		cost = _ix(it.cost, min(lv, (_len(it.cost) - 1)))
		pips = ("<span class=\"pips\">" + _join(_newArray((lv + 1)), "■") + _join(_newArray(((it.get("max") - lv) + 1)), "□") + "</span>" if (it.get("max", NAN) < 10) else "<span class=\"pips\">x" + str(run.get("lives")) + "</span>")
		h = str(h) + "<button class=\"btn item\" data-act=\"buy\" data-v=\"" + str(it.get("id")) + "\"" + (" disabled" if (maxed or (run.get("coins", NAN) < cost)) else "") + "><span>" + str(it.get("n")) + " <i class=\"c\">" + str(("MAX" if maxed else cost)) + "</i></span><small>" + str(it.get("d")) + "</small>" + str(pips) + "</button>"
	h = str(h) + "</div><div class=\"menu\"><button class=\"btn hot\" data-act=\"next\">FASE " + str((st.get("i") + 2)) + ": " + str(_ix(LEVELS, (st.get("i") + 1)).get("name")) + "</button></div></div>"
	show(h)

# L1983
func buy(id = null):
	var _c = {"id": id}
	var it = null
	var lv = null
	var cost = null
	var _fn = null
	_fn = func(x = null):
		return (x.get("id") == _c.id)
	it = _ix(_filter(ITEMS, _fn), 0)
	if (not it):
		return
	lv = (0 if (_c.id == "life") else _ix(run.up, _c.id))
	cost = _ix(it.cost, min(lv, (_len(it.cost) - 1)))
	if ((run.get("coins", NAN) < cost) or (lv >= it.get("max", NAN))):
		sfx("no")
		return
	run.coins -= cost
	sfx("buy")
	if (_c.id == "life"):
		run.lives += 1
	else:
		run.up[_c.id] += 1
		if (_c.id == "hp"):
			run.maxHp += 1
	slotSave("shop", (st.get("i") + 1))
	showShop()

# L1991
func nextStage():
	enterLevel((st.get("i") + 1), true)

# L1994
func saveProg(n = null):
	if (n > _or(_ix(PROG, SET.get("diff")), 0)):
		_aset(PROG, SET.get("diff"), n)
		save("ds2_prog", PROG)

# L1995
func enterLevel(n = null, withCut = null):
	run.stage = n
	buildStage(n)
	hideOv()
	mode = "play"
	saveProg(n)
	slotSave("play")
	if ((withCut and st.L.get("cut")) and st.L.cut.get("pre")):
		startCut(st.L.cut.get("pre"), null, "il_" + pad((n + 1), 2))

# L2003
func slotOk(s = null):
	var n = null
	if (((((not s) or (_typeof(s) != "object")) or (not (s.get("run")))) or (_typeof(s.get("run")) != "object")) or (not (_ix(DIFFS, s.get("diff"))))):
		return null
	n = s.get("stage")
	if ((((_typeof(n) != "number") or (n != int(n))) or (n < 0)) or (n >= _len(LEVELS))):
		return null
	if ((s.get("at") != "shop") and (s.get("at") != "done")):
		s.at = "play"
	if ((s.get("at") == "shop") and (n < 1)):
		return null
	if ((_typeof(s.run.get("score")) != "number") or (not (is_finite(float(s.run.get("score")))))):
		return null
	if (_typeof(s.get("ts")) != "number"):
		s.ts = 0
	return s

# L2009
func slots():
	var a = null
	var r = null
	var i = null
	var v = null
	a = j_load("ds2_slots", null)
	r = []
	if (not (a is Array)):
		a = []
	i = 0
	while (i < NSL):
		v = null
		v = slotOk(_ix(a, i))
		r.append(v)
		i += 1
	return r

# L2011
func slotSave(at = null, n = null, r = null):
	var a = null
	var c = null
	if ((CUR == null) or (not run)):
		return
	a = slots()
	c = JSON.parse_string(JSON.stringify((r if r else run)))
	if (n == null):
		n = run.get("stage")
	c.stage = ((n - 1) if (at == "shop") else n)
	_aset(a, CUR, {"v": 1, "diff": SET.get("diff"), "stage": n, "at": at, "run": c, "ts": _now()})
	save("ds2_slots", a)
	save("ds2_last", CUR)

# L2014
func slotDel(i = null):
	var a = null
	a = slots()
	_aset(a, i, null)
	save("ds2_slots", a)
	if (j_load("ds2_last", -1) == i):
		save("ds2_last", -1)

# L2023
func slotLoad(i = null):
	var s = null
	var b = null
	var o = null
	var k = null
	var _a = null
	var g_2 = null
	var k_2 = null
	s = _ix(slots(), i)
	if ((not s) or (s.get("at") == "done")):
		showSlots()
		return
	CUR = i
	NEWSL = null
	SET.diff = s.get("diff")
	save("ds2_set", SET)
	newRun()
	b = run
	o = s.get("run")
	for _k in _keys(b):
		k = _k
		if ((((k != "up") and (k != "stats")) and (_typeof(_ix(o, k)) == _typeof(_ix(b, k)))) and ((_typeof(_ix(b, k)) != "number") or is_finite(float(_ix(o, k))))):
			_aset(b, k, _ix(o, k))
	_a = ["up", "stats"]
	for _i in range(_len(_a)):
		if _i >= _len(_a): break
		g_2 = _a[_i]
		k_2 = null
		if (_ix(o, g_2) and (_typeof(_ix(o, g_2)) == "object")):
			for _k_2 in _keys(_ix(b, g_2)):
				k_2 = _k_2
				if ((_typeof(_ix(_ix(o, g_2), k_2)) == "number") and is_finite(float(_ix(_ix(o, g_2), k_2)))):
					_aset(b[g_2], k_2, _ix(_ix(o, g_2), k_2))
	if (o.get("seen") and (_typeof(o.get("seen")) == "object")):
		b.seen = o.get("seen")
	if (not (_ix(WPN, b.get("wpn")))):
		b.wpn = "N"
	b.lv = j_clamp(int(b.get("lv")), 1, 3)
	b.lives = max(1, int(b.get("lives")))
	b.maxHp = max(1, int(b.get("maxHp")))
	b.bass = j_clamp(_or(_num(b.get("bass")), 0), 0, 100)
	b.combo = 0
	b.comboT = 0
	b.mult = 1
	audioOn()
	if (s.get("at") == "shop"):
		b.stage = (s.get("stage") - 1)
		buildStage((s.get("stage") - 1))
		back = null
		showShop()
	else:
		enterLevel(s.get("stage"), true)

# L2033
func newGame(i = null):
	CUR = i
	NEWSL = null
	startGame()

# L2034
func slotNew(i = null):
	if (not (SET.get("help"))):
		NEWSL = i
		showControls(true)
	else:
		newGame(i)

# L2035
func slotDate(ts = null):
	var d = null
	if (not ts):
		return "--/--"
	d = _date(ts)
	return pad(_callm(d, "getDate", []), 2) + "/" + pad((_callm(d, "getMonth", []) + 1), 2) + " " + pad(_callm(d, "getHours", []), 2) + ":" + pad(_callm(d, "getMinutes", []), 2)

# L2036
func slotWhere(s = null):
	return ("COMPLETADA" if (s.get("at") == "done") else ("TIENDA · " if (s.get("at") == "shop") else "") + "FASE " + str((s.get("stage") + 1)))

# L2037
func showSlots():
	var a = null
	var h = null
	var s = null
	var i = null
	back = showMenu
	mode = "menu"
	a = slots()
	h = "<div class=\"panel wide sl3\"><h2>PARTIDAS</h2><div class=\"slots\">"
	for _i in range(_len(a)):
		if _i >= _len(a): break
		s = a[_i]
		i = _i
		h = str(h) + "<button class=\"btn slot" + ((" done" if (s.get("at") == "done") else "") if s else " empty") + "\" data-act=\"slot\" data-v=\"" + str(i) + "\"><span class=\"sn\">" + str((i + 1)) + "</span>" + ("<span class=\"sl\"><b>" + ("COMPLETADA" if (s.get("at") == "done") else "FASE " + str((s.get("stage") + 1))) + "</b><i>" + str(_ix(DIFFS, s.get("diff")).get("n")) + "</i></span><span class=\"sd\">" + ("TIENDA · " if (s.get("at") == "shop") else "") + str(_ix(LEVELS, s.get("stage")).get("name")) + "</span><span class=\"sm\"><b>" + pad(s.run.get("score"), 7) + "</b>" + str(slotDate(s.get("ts"))) + "</span>" if s else "<span class=\"sl\">VACÍA</span><span class=\"sd\">NUEVA PARTIDA</span><span class=\"sm\">&nbsp;</span>") + "</button>"
	show(str(h) + "</div><p class=\"dim\">Se guarda solo: al empezar cada fase, en la tienda y al caer.</p><div class=\"menu\">" + "<button class=\"btn opt\" data-act=\"sdiff\">NUEVAS EN <i>" + str(_ix(DIFFS, SET.get("diff")).get("n")) + "</i></button><button class=\"btn\" data-act=\"back\">VOLVER</button></div></div>")

# L2045
func showSlot(i = null, cf = null):
	var _c = {"i": i}
	var s = null
	var _fn = null
	s = _ix(slots(), _c.i)
	back = showSlots
	if (not s):
		slotNew(_c.i)
		return
	if cf:
		_fn = func():
			showSlot(_c.i)
		back = _fn
		show("<div class=\"panel\"><p class=\"kick\">RANURA " + str((_c.i + 1)) + "</p><h2>" + ("¿BORRAR ESTA PARTIDA?" if (cf == "del") else "¿EMPEZAR DE NUEVO AQUÍ?") + "</h2>" + "<p class=\"dim\">Se pierde lo guardado: " + str(slotWhere(s)) + ", " + pad(s.run.get("score"), 7) + " puntos." + ("" if (cf == "del") else " La nueva empieza en " + str(_ix(DIFFS, SET.get("diff")).get("n")) + ".") + "</p>" + "<div class=\"menu\"><button class=\"btn\" data-act=\"slot\" data-v=\"" + str(_c.i) + "\">NO, VOLVER</button><button class=\"btn warn\" data-act=\"" + ("sdel" if (cf == "del") else "snew") + "\" data-v=\"" + str(_c.i) + "\">" + ("SÍ, BORRAR" if (cf == "del") else "SÍ, EMPEZAR") + "</button></div></div>")
		return
	show("<div class=\"panel\"><p class=\"kick\">RANURA " + str((_c.i + 1)) + "</p><h2>" + ("PARTIDA COMPLETADA" if (s.get("at") == "done") else str(slotWhere(s)) + ": " + str(_ix(LEVELS, s.get("stage")).get("name"))) + "</h2>" + "<div class=\"stats\"><span>DIFICULTAD</span><b>" + str(_ix(DIFFS, s.get("diff")).get("n")) + "</b><span>PUNTOS</span><b>" + pad(s.run.get("score"), 7) + "</b><span>VIDAS</span><b>" + str(int(s.run.get("lives"))) + "</b>" + "<span>DISCOS</span><b>" + str(int(s.run.get("coins"))) + "</b><span>GUARDADA</span><b>" + str(slotDate(s.get("ts"))) + "</b></div>" + "<div class=\"menu\">" + ("<button class=\"btn hot\" data-act=\"sload\" data-v=\"" + str(_c.i) + "\">CONTINUAR</button>" if (s.get("at") != "done") else "") + "<button class=\"btn\" data-act=\"sask\" data-v=\"" + str(_c.i) + "n\">EMPEZAR DE NUEVO</button><button class=\"btn\" data-act=\"sask\" data-v=\"" + str(_c.i) + "d\">BORRAR</button>" + "<button class=\"btn\" data-act=\"back\">VOLVER</button></div></div>")

# L2057
func lastSlot():
	var i = null
	var s = null
	i = j_load("ds2_last", -1)
	s = _ix(slots(), i)
	return (i if (s and (s.get("at") != "done")) else -1)

# L2058
func endLevel():
	var c = null
	c = st.L.get("cut")
	if ((c and c.get("post")) and (not (seen("post")))):
		startCut(c.get("post"), finishStage)
	else:
		finishStage()

# L2062
func show(html = null):
	var _c = {"f": null}
	var o = null
	var _fn = null
	o = S_("ov")
	_callm(o.classList, "remove", ["title"])
	o.innerHTML = html
	o.hidden = false
	_c.f = _callm(o, "querySelector", ["button:not(:disabled),input"])
	if _c.f:
		_fn = func():
			_callm(_c.f, "focus", [{"preventScroll": true}])
		_timeout(_fn, 30)

# L2063
func hideOv():
	S_("ov").hidden = true
	S_("ov").innerHTML = ""
	back = null

# L2064
func best():
	var a = null
	a = j_load("ds2_rank", [])
	return (_ix(a, 0).get("score") if _len(a) else 0)

# L2079
func showMenu():
	var ld = null
	var li = null
	var ls = null
	var any = null
	var _fn = null
	ld = S_("ld")
	if ld:
		if GATE:
			gate(ld)
		else:
			_callm(ld, "remove", [])
	mode = "menu"
	back = null
	bossMusic = 0
	songIdx = 0
	if (not slotMig__done):
		slotMig__done = 1
		slotMig()
	if ((not run) or (not st)):
		newRun()
		buildStage(0)
	cam = 0
	li = lastSlot()
	ls = (_ix(slots(), li) if (li > -1) else null)
	_fn = func(x = null):
		return x
	any = _some(slots(), _fn)
	show("<div class=\"panel\"><p class=\"kick\">SOUND SYSTEM DEFENDER</p><h1>DUB<br>SIEGE</h1>" + "<div class=\"menu\">" + ("<button class=\"btn hot cont\" data-act=\"cont2\">CONTINUAR <small>RANURA " + str((li + 1)) + " · FASE " + str((ls.get("stage") + 1)) + " · " + str(_ix(DIFFS, ls.get("diff")).get("n")) + "</small></button><button class=\"btn\" data-act=\"slots\">PARTIDAS</button>" if ls else "<button class=\"btn hot\" data-act=\"play\">JUGAR</button>" + ("<button class=\"btn\" data-act=\"slots\">PARTIDAS</button>" if any else "")) + ("" if ls else "<button class=\"btn opt\" data-act=\"diff\">DIFICULTAD <i>" + str(_ix(DIFFS, SET.get("diff")).get("n")) + "</i></button>") + "<button class=\"btn\" data-act=\"look\">PERSONAJE</button><button class=\"btn\" data-act=\"opts\">OPCIONES</button><button class=\"btn\" data-act=\"controls\">CONTROLES</button><button class=\"btn\" data-act=\"arch\">ARCHIVO</button><button class=\"btn\" data-act=\"rank\">RANKING</button></div>" + "<p class=\"dim\">RÉCORD " + pad(best(), 7) + "</p></div>")
	_callm(S_("ov").classList, "add", ["title"])
	titleTop()

# L2093
func onoff(v = null):
	return ("SÍ" if v else "NO")

# L2094
func showOpts():
	var from = null
	var tm = null
	var _fn = null
	var _q = null
	from = mode
	if (from == "pause"):
		_fn = func():
			mode = "play"
			pause()
		_q = _fn
	else:
		_q = showMenu
	back = _q
	tm = _ix({"auto": "AUTO", "on": "SÍ", "off": "NO"}, SET.get("touch"))
	show("<div class=\"panel wide\"><h2>OPCIONES</h2><div class=\"menu two\">" + "<button class=\"btn opt\" data-act=\"o\" data-v=\"diff\"" + (" disabled" if (from == "pause") else "") + ">DIFICULTAD <i>" + str(_ix(DIFFS, SET.get("diff")).get("n")) + "</i></button>" + "<button class=\"btn opt\" data-act=\"o\" data-v=\"mute\">MÚSICA Y SONIDO <i>" + str(onoff((not (SET.get("mute"))))) + "</i></button>" + "<button class=\"btn opt\" data-act=\"o\" data-v=\"auto\">DISPARO AUTOMÁTICO <i>" + str(("AUTO" if (SET.get("auto") == null) else onoff(SET.get("auto")))) + "</i></button>" + "<button class=\"btn opt\" data-act=\"o\" data-v=\"assist\">APUNTADO ASISTIDO <i>" + str(onoff(SET.get("assist"))) + "</i></button>" + "<button class=\"btn opt\" data-act=\"o\" data-v=\"upJump\">ARRIBA PARA SALTAR <i>" + str(onoff(SET.get("upJump"))) + "</i></button>" + "<button class=\"btn opt\" data-act=\"o\" data-v=\"touch\">MANDOS TÁCTILES <i>" + str(tm) + "</i></button>" + "<button class=\"btn opt\" data-act=\"o\" data-v=\"ui\">TAMAÑO DE INTERFAZ <i>" + str(uiName()) + "</i></button>" + "<button class=\"btn opt\" data-act=\"o\" data-v=\"big\">BOTONES GRANDES <i>" + str(onoff(SET.get("big"))) + "</i></button>" + "<button class=\"btn opt\" data-act=\"o\" data-v=\"vib\">VIBRACIÓN <i>" + str(onoff(SET.get("vib"))) + "</i></button>" + "<button class=\"btn opt\" data-act=\"o\" data-v=\"light\">LUCES Y SOMBRAS <i>" + str(onoff(SET.get("light"))) + "</i></button>" + "<button class=\"btn hot\" data-act=\"back\">VOLVER</button></div>" + "<p class=\"dim\">Disparo automático: dispara solo cuando hay enemigos cerca, te quita un dedo de encima. Apuntado asistido: decide por ti hacia dónde tiras, por eso viene apagado.</p></div>")

# L2111
func setOpt(k = null):
	var _c = {"b": null}
	var ui = null
	var keep = null
	var _fn = null
	if (k == "diff"):
		SET.diff = fmod((SET.get("diff") + 1), 3)
	elif (k == "mute"):
		setMute((not (SET.get("mute"))))
	elif (k == "auto"):
		SET.auto = (true if (SET.get("auto") == null) else (false if (SET.get("auto") == true) else null))
	elif (k == "touch"):
		SET.touch = _ix({"auto": "on", "on": "off", "off": "auto"}, SET.get("touch"))
	elif (k == "ui"):
		ui = _indexOf(UIS, SET.get("ui"))
		SET.ui = _ix(UIS, fmod((ui + 1), _len(UIS)))
	else:
		_aset(SET, k, (not (_ix(SET, k))))
	save("ds2_set", SET)
	layoutKey = ""
	applyLayout()
	uiFit()
	placePad()
	keep = (_callm(document.activeElement, "getAttribute", ["data-v"]) if document.get("activeElement") else document.get("activeElement"))
	showOpts()
	if keep:
		_c.b = _callm(document, "querySelector", ["[data-v=\"" + str(keep) + "\"]"])
		if _c.b:
			_fn = func():
				_callm(_c.b, "focus", [])
			_timeout(_fn, 40)

# L2123
func showArchive(i = null):
	var c = null
	var il = null
	var dp = null
	var ks = null
	var im = null
	var h = null
	var _fn = null
	var c_2 = null
	var k = null
	back = showMenu
	if ((i != null) and (i < LOREN)):
		c = _ix(LORE, i)
		_fn = func():
			showArchive()
		back = _fn
		il = _ix(ART, (_ix(c, 2) if _ix(c, 2) else "il_" + pad((i + 1), 2)))
		dp = (win.get("devicePixelRatio") if win.get("devicePixelRatio") else 1)
		ks = max(1, floori(min(((min((VW() * 0.9), 520) * dp) / 160.0), (((VH() * 0.34) * dp) / 90.0))))
		im = ("<img class=\"ill\" alt=\"\" src=\"" + str(il.get("src")) + "\" style=\"width:" + str(((160 * ks) / float(dp))) + "px;height:" + str(((90 * ks) / float(dp))) + "px\">" if il else "")
		show("<div class=\"panel tape\"><p class=\"kick\">CINTA " + str((i + 1)) + " DE " + str(_len(LORE)) + " · " + str(_ix(LEVELS, i).get("era")) + "</p><h2>" + str(_ix(c, 0)) + "</h2>" + str(im) + "<p class=\"lore\">" + str(_ix(c, 1)) + "</p><div class=\"menu\"><button class=\"btn hot\" data-act=\"back\">VOLVER</button></div></div>")
		return
	h = "<div class=\"panel\"><h2>ARCHIVO</h2><p class=\"dim\">LAS CINTAS DE COUNT EPHRAIM. CADA JEFE GUARDA UNA CINTA. " + str(LOREN) + " DE " + str(_len(LORE)) + "</p><div class=\"menu tapes\">"
	for _i in range(_len(LORE)):
		if _i >= _len(LORE): break
		c_2 = LORE[_i]
		k = _i
		h = str(h) + "<button class=\"btn\"" + (" data-act=\"tape\" data-v=\"" + str(k) + "\">" + str((k + 1)) + ". " + str(_ix(c_2, 0)) if (k < LOREN) else " disabled>" + str((k + 1)) + ". ???") + "</button>"
	show(str(h) + "</div><div class=\"menu\"><button class=\"btn hot\" data-act=\"back\">VOLVER</button></div></div>")

# L2132
func showControls(then = null):
	var from = null
	var tch = null
	var body = null
	var _fn = null
	var _q = null
	from = mode
	if (from == "pause"):
		_fn = func():
			mode = "play"
			pause()
		_q = _fn
	else:
		_q = showMenu
	back = _q
	tch = touchMode()
	body = ("<b>ZONA IZQUIERDA</b><span>Arrastra para moverte. Arriba apunta arriba, abajo + SALTO baja de plataformas</span>" + "<b>SALTO</b><span>Toca para saltar, otra vez en el aire para el doble salto</span><b>MANTÉN SALTO</b><span>Dash: esquiva atravesando balas y enemigos</span>" + "<b>FUEGO</b><span>" + ("Automático cuando hay enemigos cerca (puedes forzarlo pulsando)" if autoFire() else "Mantenlo pulsado para disparar") + "</span>" + "<b>BASS</b><span>Con la barra llena limpia la pantalla</span><b>II</b><span>Pausa</span>" if tch else "<b>FLECHAS / A D</b><span>Moverse</span><b>Z / ESPACIO</b><span>Saltar (otra vez en el aire = doble salto)</span>" + "<b>X / J</b><span>Disparar (mantener = ráfaga)</span>" + ("" if SET.get("upJump") else "<b>ARRIBA + FUEGO</b><span>Disparo vertical o diagonal</span>") + "<b>ABAJO + SALTO</b><span>Bajar de una plataforma</span>" + "<b>C / SHIFT</b><span>Dash: esquiva atravesando balas</span><b>V</b><span>Bass Drop con la barra llena</span>" + "<b>P / ESC</b><span>Pausa</span><b>MANDO</b><span>A salto, X fuego, B dash, Y bass, START pausa</span>")
	show("<div class=\"panel\"><h2>" + ("ASÍ SE JUEGA" if then else "CONTROLES") + "</h2><div class=\"keys\">" + str(body) + "</div>" + "<p class=\"dim\">Las cajas ? dan armas. Coger la misma sube su nivel; cada golpe que recibes lo baja.</p>" + "<div class=\"menu\">" + ("<button class=\"btn hot\" data-act=\"go\">A JUGAR</button>" if then else "<button class=\"btn\" data-act=\"back\">VOLVER</button>") + "</div></div>")

# L2150
func showRank(note = null):
	var a = null
	var h = null
	var can = null
	var k = null
	var r = null
	var i = null
	var _fn = null
	back = (showMenu if (mode == "menu") else null)
	a = j_load("ds2_rank", [])
	h = "<div class=\"panel\"><h2>RANKING</h2><ol class=\"rank\">"
	for _i in range(_len(a)):
		if _i >= _len(a): break
		r = a[_i]
		i = _i
		h = str(h) + "<li" + (" class=\"me\"" if (r.get("ts") == myTs) else "") + "><span>" + str((i + 1)) + ".</span><span>" + str(r.get("tag")) + "</span><span class=\"x\">" + str(r.get("st")) + " " + str(r.get("d")) + "</span><span>" + pad(r.get("score"), 7) + "</span></li>"
	if (not (_len(a))):
		h = str(h) + "<li><span></span><span></span><span class=\"x\">SIN PUNTUACIONES</span><span></span></li>"
	h = str(h) + "</ol>"
	can = (qualifies(pend.get("score")) if pend else pend)
	if can:
		if (not TG):
			TG = _split(_slice(str(_or(j_load("ds2_tag", ""), "")) + "AAA", 0, 3), "")
		TGi = 0
		h = str(h) + "<div class=\"row tgs\" role=\"group\" aria-label=\"Tus iniciales\">"
		k = 0
		while (k < 3):
			h = str(h) + "<div class=\"tgc\"><button class=\"btn tgb\" data-act=\"tg\" data-v=\"" + str(k) + "+\" aria-label=\"Letra " + str((k + 1)) + " siguiente\">▲</button><b id=\"tg" + str(k) + "\"" + (" class=\"on\"" if (k == TGi) else "") + ">" + str(_ix(TG, k)) + "</b><button class=\"btn tgb\" data-act=\"tg\" data-v=\"" + str(k) + "-\" aria-label=\"Letra " + str((k + 1)) + " anterior\">▼</button></div>"
			k += 1
		h = str(h) + "<button class=\"btn hot\" data-act=\"save\">GUARDAR</button></div>"
	h = str(h) + "<p class=\"note\">" + str((note if note else "")) + "</p><div class=\"menu\"><button class=\"btn" + ("" if can else " hot") + "\" data-act=\"" + ("back" if (mode == "menu") else "tomenu") + "\">" + ("VOLVER" if (mode == "menu") else "MENÚ PRINCIPAL") + "</button></div></div>"
	show(h)
	if can:
		_fn = func():
			var b = null
			b = _callm(S_("ov"), "querySelector", [".tgb"])
			if b:
				_callm(b, "focus", [])
		_timeout(_fn, 40)

# L2168
func tgPaint():
	var k = null
	var e = null
	k = 0
	while (k < 3):
		e = S_("tg" + str(k))
		if e:
			e.textContent = _ix(TG, k)
			e.className = ("on" if (k == TGi) else "")
		k += 1

# L2169
func tgStep(k = null, d = null):
	TGi = k
	_aset(TG, k, _ix(TGC, fmod(((_indexOf(TGC, _ix(TG, k)) + d) + _len(TGC)), _len(TGC))))
	tgPaint()

# L2170
func tgType(c = null):
	_aset(TG, TGi, c)
	TGi = min(2, (TGi + 1))
	tgPaint()

# L2171 (a mano)
func qualifies(s = null):
	var a = j_load("ds2_rank", [])
	return s > 0 and (_len(a) < 10 or s > _ix(a, _len(a) - 1).get("score"))

# L2172
func submitRank():
	var tag = null
	var a = null
	var _fn = null
	if ((not (S_("tg0"))) or (not pend)):
		return
	tag = _join(TG, "")
	if (_len(tag) < 2):
		showRank("USA 2 O 3 LETRAS")
		return
	a = j_load("ds2_rank", [])
	myTs = _now()
	a.append({"tag": tag, "score": pend.get("score"), "st": pend.get("st"), "d": pend.get("d"), "ts": myTs})
	_fn = func(x = null, y = null):
		return (y.get("score") - x.get("score"))
	_sort(a, _fn)
	save("ds2_rank", _slice(a, 0, 10))
	save("ds2_tag", tag)
	pend = null
	TG = null
	showRank("GUARDADO")

# L2178
func stat():
	var s = null
	var secs = null
	s = run.get("stats")
	secs = floori(((s.get("time")) / 60.0))
	return "<div class=\"stats\"><span>PUNTOS</span><b>" + pad(run.get("score"), 7) + "</b><span>FASE</span><b>" + str((st.get("i") + 1)) + " / " + str(_len(LEVELS)) + "</b><span>ENEMIGOS</span><b>" + str(s.get("kills")) + "</b>" + "<span>PUNTERÍA</span><b>" + str((_round((((s.get("hits")) / float(s.get("shots"))) * 100)) if s.get("shots") else 0)) + "%</b><span>MUERTES</span><b>" + str(s.get("deaths")) + "</b><span>TIEMPO</span><b>" + str(floori((secs / 60.0))) + ":" + pad(fmod(secs, 60), 2) + "</b></div>"

# L2181
func gameOver():
	var c = null
	mode = "over"
	pend = {"score": run.get("score"), "st": "F" + str((st.get("i") + 1)), "d": _ix(_ix(DIFFS, SET.get("diff")).n, 0)}
	c = JSON.parse_string(JSON.stringify(run))
	c.conts += 1
	c.score = floori(((c.get("score")) / 2.0))
	c.lives = D.get("lives")
	c.lv = 1
	c.wpn = "N"
	c.bass = 0
	slotSave("play", st.get("i"), c)
	show("<div class=\"panel\"><h2>EL SOUND SYSTEM CALLA</h2>" + str(stat()) + "<p class=\"dim\">Continuar reinicia la fase " + str((st.get("i") + 1)) + " con la mitad de los puntos.</p>" + "<div class=\"menu\"><button class=\"btn hot\" data-act=\"cont\">CONTINUAR</button><button class=\"btn\" data-act=\"rank\">GUARDAR EN RANKING</button><button class=\"btn\" data-act=\"tomenu\">MENÚ PRINCIPAL</button></div></div>")

# L2188
func showWin():
	pend = {"score": run.get("score"), "st": "FIN", "d": _ix(_ix(DIFFS, SET.get("diff")).n, 0)}
	slotSave("done", st.get("i"))
	show("<div class=\"panel\"><p class=\"kick\">LA BESTIA SUENA OTRA VEZ</p><h2>LA CIUDAD VUELVE A BAILAR</h2>" + str(stat()) + "<div class=\"menu\"><button class=\"btn hot\" data-act=\"rank\">GUARDAR EN RANKING</button><button class=\"btn\" data-act=\"tomenu\">MENÚ PRINCIPAL</button></div></div>")

# L2193
func pause():
	if (mode != "play"):
		return
	mode = "pause"
	K = {}
	TS = {}
	show("<div class=\"panel\"><h2>PAUSA</h2><p class=\"dim\">FASE " + str((st.get("i") + 1)) + " - " + str(st.L.get("name")) + " - " + str(_ix(DIFFS, SET.get("diff")).get("n")) + "</p>" + ("<p class=\"dim sv\">RANURA " + str((CUR + 1)) + " · GUARDADO AL EMPEZAR LA FASE</p>" if (CUR != null) else "") + "<div class=\"menu\"><button class=\"btn hot\" data-act=\"resume\">CONTINUAR</button>" + "<button class=\"btn\" data-act=\"opts\">OPCIONES</button><button class=\"btn\" data-act=\"controls\">CONTROLES</button><button class=\"btn\" data-act=\"restart\">REINICIAR FASE</button><button class=\"btn\" data-act=\"tomenu\">SALIR AL MENÚ</button></div></div>")

# L2196
func resume():
	hideOv()
	mode = "play"
	K = {}

# L2199
func startGame(n = null):
	newRun()
	if n:
		run.coins = (n * 30)
	enterLevel((n if n else 0), true)
	audioOn()

# L2200
func act(a = null, v = null):
	var _c = {"sb": null, "sd": null, "db": null}
	var ci = null
	var n = null
	var _sw = null
	var _fn = null
	var _fn_2 = null
	var _fn_3 = null
	var _fn_4 = null
	audioOn()
	_sw = a
	if _sw == "play":
		_fn = func(x = null):
			return x
		if _some(slots(), _fn):
			showSlots()
		else:
			slotNew(0)
	elif _sw == "go":
		if (not (SET.get("help"))):
			SET.help = true
			save("ds2_set", SET)
		if (NEWSL != null):
			newGame(NEWSL)
		else:
			startGame()
	elif _sw == "cont2":
		ci = lastSlot()
		if (ci > -1):
			slotLoad(ci)
		else:
			showSlots()
	elif _sw == "slots":
		showSlots()
	elif _sw == "slot":
		showSlot(_num(v))
	elif _sw == "sload":
		slotLoad(_num(v))
	elif _sw == "sask":
		showSlot(_parseInt(v, 10), ("del" if (_slice(v, -1, null) == "d") else "new"))
	elif _sw == "sdel":
		slotDel(_num(v))
		showSlots()
		_c.sb = _callm(document, "querySelector", ["[data-act=slot][data-v=\"" + str(v) + "\"]"])
		if _c.sb:
			_fn_2 = func():
				_callm(_c.sb, "focus", [])
			_timeout(_fn_2, 40)
	elif _sw == "snew":
		slotNew(_num(v))
	elif _sw == "sdiff":
		SET.diff = fmod((SET.get("diff") + 1), 3)
		save("ds2_set", SET)
		showSlots()
		_c.sd = _callm(document, "querySelector", ["[data-act=sdiff]"])
		if _c.sd:
			_fn_3 = func():
				_callm(_c.sd, "focus", [])
			_timeout(_fn_3, 40)
	elif _sw == "opts":
		showOpts()
	elif _sw == "o":
		setOpt(v)
	elif _sw == "diff":
		SET.diff = fmod((SET.get("diff") + 1), 3)
		save("ds2_set", SET)
		showMenu()
		_c.db = _callm(document, "querySelector", ["[data-act=diff]"])
		if _c.db:
			_fn_4 = func():
				_callm(_c.db, "focus", [])
			_timeout(_fn_4, 40)
	elif _sw == "controls":
		showControls()
	elif _sw == "rank":
		showRank()
	elif _sw == "arch":
		showArchive()
	elif _sw == "tape":
		showArchive(_num(v))
	elif _sw == "back":
		if back:
			back.call()
		else:
			showMenu()
	elif _sw == "resume":
		resume()
	elif _sw == "restart":
		run.score = max(0, (run.get("score") - 500))
		buildStage(st.get("i"))
		resume()
	elif _sw == "tomenu":
		pend = null
		run = null
		st = null
		CUR = null
		showMenu()
	elif _sw == "shop":
		showShop()
	elif _sw == "buy":
		buy(v)
	elif _sw == "next":
		nextStage()
	elif _sw == "cont":
		run.conts += 1
		run.score = floori(((run.get("score")) / 2.0))
		run.lives = D.get("lives")
		run.lv = 1
		run.wpn = "N"
		run.bass = 0
		n = st.get("i")
		run.stage = n
		buildStage(n)
		hideOv()
		mode = "play"
	elif _sw == "save":
		submitRank()
	elif _sw == "tg":
		tgStep(_num(_ix(v, 0)), (1 if (_ix(v, 1) == "+") else -1))
	elif _sw == "look":
		showLook()
	elif _sw == "lk":
		lookStep(v, 1)
	elif _sw == "lkbuy":
		lookBuy()
	elif _sw == "lkok":
		lookExit()

# L2240
func update():
	var rd = null
	var i = null
	var m = null
	var mp = null
	var ox = null
	var oy = null
	var a = null
	var q = null
	var b = null
	var c = null
	var tgt = null
	var lo = null
	var ty = null
	var _a = null
	var r = null
	var _l = null
	var _l_2 = null
	var _l_3 = null
	var _l_4 = null
	t += 1
	if (sh > 0):
		sh -= 1
	if (flash > 0):
		flash -= 1
	applyLayout()
	rd = (not (not ((run and (run.get("bass", NAN) >= 100)) and (mode == "play"))))
	if (rd != bsReady):
		bsReady = rd
		_callm(bsBtn.classList, "toggle", ["ready", rd])
	if (mode == "menu"):
		cam = fmod((cam + 0.3), max(1, (st.get("safeW") - W)))
		return
	if (mode == "cut"):
		updateCut()
		return
	if (mode != "play"):
		return
	if (hs > 0):
		hs -= 1
		return
	i = readInput()
	st.t += 1
	run.stats.time += 1
	m = 0
	while (m < _len(mplats)):
		mp = _ix(mplats, m)
		ox = mp.get("x")
		oy = mp.get("y")
		mp.ph += 0.012
		if mp.get("v"):
			mp.y = (mp.get("y0") - (((1 - cos(mp.get("ph"))) * mp.get("rg")) / 2.0))
			mp.dy = (mp.get("y") - oy)
			mp.dx = 0
		else:
			mp.x = (mp.get("x0") + (((1 - cos(mp.get("ph"))) * mp.get("rg")) / 2.0))
			mp.dx = (mp.get("x") - ox)
		m += 1
	updatePlayer(i)
	if ((((not (st.get("lock"))) and (not (st.get("bossDone")))) and (p.get("x", NAN) > (st.get("arenaX") + 50))) and (not (p.get("dead")))):
		startBoss()
	_a = st.get("trg")
	for _i in range(_len(_a)):
		if _i >= _len(_a): break
		r = _a[_i]
		if (((not (r.get("s"))) and (p.get("x", NAN) > (r.get("x") - 24))) and (not (p.get("dead")))):
			r.s = 1
			r.w = _round((100.0 / (D.get("bs"))))
			sfx("horn")
			pop((p.get("x") - 10), (p.get("y") - 16), "¡TREN!", "#ffd23f")
		else:
			_l = (r.get("s") == 1)
			if _l:
				r.w -= 1
				_l = (r.w <= 0)
			if _l:
				r.s = 2
				trains.append({"x": ((cam + W) + 30), "vx": (-5.2 * D.get("bs")), "w": 140, "h": 26, "y": (GY - 26), "lv": 1})
				shake(6)
	updateEnemies()
	updateBullets()
	updateHazards()
	if boss:
		updateBoss()
	updatePickups()
	_l_2 = (run.get("comboT", NAN) > 0)
	if _l_2:
		run.comboT -= 1
		_l_2 = (run.comboT == 0)
	if _l_2:
		run.combo = 0
		run.mult = 1
	a = (_len(parts) - 1)
	while (a >= 0):
		q = _ix(parts, a)
		q.x += q.get("vx")
		q.y += q.get("vy")
		q.vy += q.get("gr")
		q.l -= 1
		if (q.l <= 0):
			_splice(parts, a, 1, [])
		a -= 1
	b = (_len(pops) - 1)
	while (b >= 0):
		pops[b].y -= 0.35
		pops[b].l -= 1
		if (pops[b].l <= 0):
			_splice(pops, b, 1, [])
		b -= 1
	c = (_len(ghosts) - 1)
	while (c >= 0):
		ghosts[c].l -= 1
		if (ghosts[c].l <= 0):
			_splice(ghosts, c, 1, [])
		c -= 1
	if ring:
		ring.r += 6
		if (ring.get("r", NAN) > 360):
			ring = null
	updBooms()
	_l_3 = banner
	if _l_3:
		banner.l -= 1
		_l_3 = (banner.l <= 0)
	if _l_3:
		banner = null
	tgt = ((st.get("arenaX") + 2) if st.get("lock") else j_clamp(((p.get("x") - ((W / 2.0) - 5)) + (p.get("face") * 24)), 0, ((COLS * T) - W)))
	cam += ((tgt - cam) * (0.08 if st.get("lock") else 0.1))
	lo = j_clamp((((p.get("y") + p.get("h")) + 2) - H), 0, CYM)
	ty = j_clamp((p.get("y") - 34), lo, CYM)
	if (boss and (not (boss.get("dead")))):
		ty = min(ty, j_clamp((boss.get("y") - 10), lo, CYM))
	camY += ((ty - camY) * (0.18 if (ty < camY) else 0.07))
	_l_4 = st.get("clearT")
	if _l_4:
		st.clearT -= 1
		_l_4 = (st.clearT == 0)
	if _l_4:
		st.bossDone = 1
		endLevel()

# L2315
func blitS(k = null, f = null, x = null, y = null, s = null, flip = null, white = null):
	var o = null
	var m = null
	var src = null
	var sw = null
	var sh_2 = null
	var sx = null
	var dw = null
	var dh = null
	var dx = null
	var dy = null
	o = _ix(SHEET, k)
	if ((not o) or (not (o.get("ok")))):
		return false
	m = (1 if o.get("x1") else SC)
	src = ((o.get("wimg") if o.get("wimg") else o.get("img")) if white else o.get("img"))
	sw = (o.get("fw") * m)
	sh_2 = (o.get("fh") * m)
	sx = (fmod((fmod(int(f), o.get("n")) + o.get("n")), o.get("n")) * sw)
	dw = (o.get("fw") * s)
	dh = (o.get("fh") * s)
	dx = _round(x)
	dy = _round(y)
	if flip:
		g.save()
		g.translate((dx + dw), dy)
		g.scale(-1, 1)
		g.drawImage(src, sx, 0, sw, sh_2, 0, 0, dw, dh)
		g.restore()
	else:
		g.drawImage(src, sx, 0, sw, sh_2, dx, dy, dw, dh)
	return true

# L2323
func tintSheet(k = null):
	var o = null
	var key = null
	var c = null
	var q = null
	o = _ix(SHEET, k)
	key = str(k) + "r"
	if ((not o) or (not (o.get("ok")))):
		return k
	if _ix(SHEET, key):
		return key
	c = _callm(document, "createElement", ["canvas"])
	c.width = o.img.get("width")
	c.height = o.img.get("height")
	q = c.getContext("2d")
	q.drawImage(o.get("img"), 0, 0)
	q.globalCompositeOperation = "source-atop"
	q.fillStyle = "rgba(255,40,90,.38)"
	q.fillRect(0, 0, c.get("width"), c.get("height"))
	_aset(SHEET, key, {"fw": o.get("fw"), "fh": o.get("fh"), "n": o.get("n"), "x1": o.get("x1"), "ok": true, "img": c, "wimg": o.get("wimg")})
	return key

# L2327
func blit(k = null, f = null, x = null, y = null, w = null, h = null, flip = null, white = null, alpha = null):
	var o = null
	var src = null
	var m = null
	var sw = null
	var sh_2 = null
	var sx = null
	var dx = null
	var dy = null
	o = _ix(SHEET, k)
	if ((not o) or (not (o.get("ok")))):
		return false
	src = ((o.get("wimg") if o.get("wimg") else o.get("img")) if white else o.get("img"))
	m = (1 if o.get("x1") else SC)
	sw = (o.get("fw") * m)
	sh_2 = (o.get("fh") * m)
	sx = (fmod((fmod(int(f), o.get("n")) + o.get("n")), o.get("n")) * sw)
	dx = _round((x + ((w - o.get("fw")) / 2.0)))
	dy = _round(((y + h) - o.get("fh")))
	if (alpha != null):
		g.globalAlpha = alpha
	if flip:
		g.save()
		g.translate((dx + o.get("fw")), dy)
		g.scale(-1, 1)
		g.drawImage(src, sx, 0, sw, sh_2, 0, 0, o.get("fw"), o.get("fh"))
		g.restore()
	else:
		g.drawImage(src, sx, 0, sw, sh_2, dx, dy, o.get("fw"), o.get("fh"))
	if (alpha != null):
		g.globalAlpha = 1
	return true

# L2357 (a mano)
func lookOwn(k = null, i = null):
	return k == "s" or not _ix(_ix(LK, k), i).get("c") or _indexOf(LOOK.own, str(k) + str(i)) > -1

# L2358
func lookSave():
	save("ds2_look", LOOK)
	lookVer += 1

# L2359
func lum(r = null, g_2 = null, b = null):
	return (((0.3 * r) + (0.59 * g_2)) + (0.11 * b))

# L2361
func isSkin(r = null, g_2 = null, b = null):
	var mx = null
	var mn = null
	var h = null
	mx = max(r, g_2, b)
	mn = min(r, g_2, b)
	if ((mx < 38) or ((mx - mn) < (0.3 * mx))):
		return false
	if (mx != r):
		return false
	h = ((60 * (g_2 - b)) / float((mx - mn)))
	return _and((h >= 5), (h <= 40))

# L2363
func paint(d = null, i = null, col = null, k = null):
	d[int(i)] = int(min(255, (col[int(0)] * k)))
	d[int((i + 1))] = int(min(255, (col[int(1)] * k)))
	d[int((i + 2))] = int(min(255, (col[int(2)] * k)))

# L2366
func lookSheet(st_2 = null):
	var key = null
	var o = null
	var B = null
	var C = null
	var Hh = null
	var w = null
	var h = null
	var cn = null
	var q = null
	var im = null
	var d = null
	var c2 = null
	var q2 = null
	var cd = null
	var sk = null
	var tp = null
	var bt = null
	var pat = null
	var shorts = null
	var fw = null
	var tb = null
	var x = null
	var y = null
	var i = null
	var cl = null
	var f = null
	var lite = null
	var L = null
	var kk = null
	var col = null
	var c3 = null
	var q3 = null
	var hm = null
	var hd = null
	var wc = null
	var wq = null
	key = "L_" + str(st_2)
	o = _ix(SHEET, key)
	if (o and (o.get("ver") == lookVer)):
		return key
	B = _ix(SHEET, "p_" + str(st_2))
	C = _ix(SHEET, "c_" + str(st_2))
	Hh = (_ix(SHEET, "h" + str(LOOK.get("f")) + "_" + str(st_2)) if LOOK.get("f") else null)
	if (((((not B) or (not (B.get("ok")))) or (not C)) or (not (C.get("ok")))) or (Hh and (not (Hh.get("ok"))))):
		return "p_" + str(st_2)
	w = B.img.get("width")
	h = B.img.get("height")
	cn = _callm(document, "createElement", ["canvas"])
	cn.width = w
	cn.height = h
	q = cn.getContext("2d")
	q.drawImage(B.get("img"), 0, 0)
	im = q.getImageData(0, 0, w, h)
	d = im.get("data")
	c2 = _callm(document, "createElement", ["canvas"])
	c2.width = w
	c2.height = h
	q2 = c2.getContext("2d")
	q2.drawImage(C.get("img"), 0, 0)
	cd = q2.getImageData(0, 0, w, h).get("data")
	sk = _ix(LK.s, LOOK.get("s")).get("v")
	tp = _ix(LK.t, LOOK.get("t")).get("v")
	bt = _ix(LK.b, LOOK.get("b"))
	pat = LOOK.get("p")
	shorts = (LOOK.get("l") == 1)
	fw = (B.get("fw") * SC)
	tb = []
	f = 0
	while (f < B.get("n", NAN)):
		tb.append([h, 0])
		f += 1
	y = 0
	while (y < h):
		x = 0
		while (x < w):
			if (_round(((cd[int((((y * w) + x) * 4))]) / 20.0)) == 2):
				f = int((x / float(fw)))
				if (y < _ix(_ix(tb, f), 0)):
					_aset(tb[f], 0, y)
				if (y > _ix(_ix(tb, f), 1)):
					_aset(tb[f], 1, y)
			x += 1
		y += 1
	lite = [((_ix(tp, 0) * 0.3) + (255 * 0.7)), ((_ix(tp, 1) * 0.3) + (255 * 0.7)), ((_ix(tp, 2) * 0.3) + (255 * 0.7))]
	y = 0
	while (y < h):
		x = 0
		while (x < w):
			i = (((y * w) + x) * 4)
			if (d[int((i + 3))] < 128):
				x += 1
				continue
			cl = _round(((cd[int(i)]) / 20.0))
			if (not cl):
				x += 1
				continue
			L = lum(d[int(i)], d[int((i + 1))], d[int((i + 2))])
			if (cl == 1):
				paint(d, i, sk, (L / float(_ix(LREF, 1))))
			elif (cl == 2):
				kk = (L / float(_ix(LREF, 2)))
				col = tp
				f = int((x / float(fw)))
				if ((pat == 1) and (int((int(y) >> int(1))) & int(1))):
					kk *= 0.62
				elif ((pat == 2) and (y < (_ix(_ix(tb, f), 0) + ((_ix(_ix(tb, f), 1) - _ix(_ix(tb, f), 0)) * 0.42)))):
					col = lite
				paint(d, i, col, kk)
			elif (cl == 4):
				paint(d, i, bt.get("b"), (L / float(_ix(LREF, 4))))
			elif (cl == 5):
				paint(d, i, bt.get("a"), (L / float(_ix(LREF, 5))))
			elif ((cl == 6) or (cl == 7)):
				if shorts:
					paint(d, i, sk, max(0.62, min(1.12, (L / float((_ix(LREF, 4) if (cl == 6) else _ix(LREF, 5)))))))
				elif (cl == 6):
					paint(d, i, bt.get("b"), (L / float(_ix(LREF, 4))))
				else:
					paint(d, i, bt.get("a"), (L / float(_ix(LREF, 5))))
			x += 1
		y += 1
	q.putImageData(im, 0, 0)
	if Hh:
		c3 = _callm(document, "createElement", ["canvas"])
		c3.width = w
		c3.height = h
		q3 = c3.getContext("2d")
		q3.drawImage(Hh.get("img"), 0, 0)
		hm = q3.getImageData(0, 0, w, h)
		hd = hm.get("data")
		i = 0
		while (i < _len(hd)):
			if ((hd[int((i + 3))] >= 128) and isSkin(hd[int(i)], hd[int((i + 1))], hd[int((i + 2))])):
				paint(hd, i, sk, ((lum(hd[int(i)], hd[int((i + 1))], hd[int((i + 2))])) / float(_ix(LREF, 1))))
			i += 4
		q3.putImageData(hm, 0, 0)
		q.drawImage(c3, 0, 0)
	wc = _callm(document, "createElement", ["canvas"])
	wc.width = w
	wc.height = h
	wq = wc.getContext("2d")
	wq.drawImage(cn, 0, 0)
	wq.globalCompositeOperation = "source-in"
	wq.fillStyle = "#fff"
	wq.fillRect(0, 0, w, h)
	_aset(SHEET, key, {"fw": B.get("fw"), "fh": B.get("fh"), "n": B.get("n"), "ok": true, "img": cn, "wimg": wc, "ver": lookVer})
	return key

# L2406
func lookCost():
	var c = null
	var k = null
	c = 0
	for _i in range(_len(LKO)):
		if _i >= _len(LKO): break
		k = LKO[_i]
		if (not (lookOwn(k, _ix(LOOK, k)))):
			c += _ix(_ix(LK, k), _ix(LOOK, k)).get("c")
	return c

# L2407
func showLook(foc = null):
	var _c = {"b": null}
	var cost = null
	var h = null
	var k = null
	var it = null
	var own = null
	var _fn = null
	if (not lookBk):
		lookBk = JSON.parse_string(JSON.stringify(LOOK))
	back = lookExit
	cost = lookCost()
	h = "<div class=\"panel\"><h2>PERSONAJE</h2><div class=\"lkw\"><canvas id=\"lkc\" width=\"" + str((14 * SC)) + "\" height=\"" + str((14 * SC)) + "\" aria-label=\"Vista previa del personaje\"></canvas><div class=\"menu lkm\">"
	for _i in range(_len(LKO)):
		if _i >= _len(LKO): break
		k = LKO[_i]
		it = null
		own = null
		it = _ix(_ix(LK, k), _ix(LOOK, k))
		own = lookOwn(k, _ix(LOOK, k))
		h = str(h) + "<button class=\"btn opt\" data-act=\"lk\" data-v=\"" + str(k) + "\">" + str(_ix(LKN, k)) + " <i" + ("" if own else " class=\"lock\"") + ">&lt; " + str(it.get("n")) + ("" if own else " " + str(it.get("c"))) + " &gt;</i></button>"
	if cost:
		h = str(h) + "<button class=\"btn hot\" data-act=\"lkbuy\"" + (" disabled" if (BANK < cost) else "") + ">COMPRAR POR " + str(cost) + " DISCOS</button>"
	h = str(h) + "<button class=\"btn" + ("" if cost else " hot") + "\" data-act=\"lkok\">" + ("SALIR SIN COMPRAR" if cost else "LISTO") + "</button></div></div>" + "<p class=\"coins\">DISCOS GUARDADOS: " + str(BANK) + "</p>" + ("<p class=\"dim\">Te faltan " + str((cost - BANK)) + " discos.</p>" if (cost and (BANK < cost)) else "") + "<p class=\"dim lkh\">Cada disco que recoges en partida se guarda para siempre. Las piezas con precio se pueden probar antes de comprarlas.</p></div>"
	show(h)
	if foc:
		_c.b = _or(_callm(document, "querySelector", ["[data-act=\"" + str(foc) + "\"]"]), _callm(document, "querySelector", ["[data-v=\"" + str(foc) + "\"]"]))
		if _c.b:
			_fn = func():
				_callm(_c.b, "focus", [{"preventScroll": true}])
			_timeout(_fn, 40)
	if (not lookRaf):
		lookLoop()

# L2421
func lookLoop():
	var c = null
	var q = null
	var ph = null
	var st_2 = null
	var k = null
	var o = null
	var fr = null
	var sw = null
	var sh_2 = null
	c = S_("lkc")
	if (not c):
		lookRaf = 0
		return
	q = c.getContext("2d")
	q.imageSmoothingEnabled = false
	q.clearRect(0, 0, c.get("width"), c.get("height"))
	ph = fmod(int(((_perf()) / 2600.0)), 2)
	st_2 = ("run" if ph else "idle")
	k = lookSheet(st_2)
	o = _ix(SHEET, k)
	if (o and o.get("ok")):
		fr = fmod(int(((_perf()) / float((95 if ph else 170)))), o.get("n"))
		sw = (o.get("fw") * SC)
		sh_2 = (o.get("fh") * SC)
		q.drawImage(o.get("img"), (fr * sw), 0, sw, sh_2, _round(((c.get("width") - sw) / 2.0)), (c.get("height") - sh_2), sw, sh_2)
	lookRaf = _raf(lookLoop)

# L2429
func lookStep(k = null, d = null):
	var n = null
	n = _len(_ix(LK, k))
	_aset(LOOK, k, fmod(((_ix(LOOK, k) + d) + n), n))
	lookVer += 1
	sfx("click")
	showLook(k)

# L2430
func lookBuy():
	var c = null
	var k = null
	c = lookCost()
	if ((not c) or (BANK < c)):
		return
	BANK -= c
	save("ds2_bank", BANK)
	for _i in range(_len(LKO)):
		if _i >= _len(LKO): break
		k = LKO[_i]
		if (not (lookOwn(k, _ix(LOOK, k)))):
			LOOK.own.append((k + _ix(LOOK, k)))
	lookSave()
	sfx("coin")
	showLook("lkok")

# L2432
func lookExit():
	var _c = {"b": null}
	var k = null
	var _fn = null
	if lookBk:
		for _i in range(_len(LKO)):
			if _i >= _len(LKO): break
			k = LKO[_i]
			if (not (lookOwn(k, _ix(LOOK, k)))):
				_aset(LOOK, k, (_ix(lookBk, k) if lookOwn(k, _ix(lookBk, k)) else 0))
	lookBk = null
	lookSave()
	showMenu()
	_c.b = _callm(document, "querySelector", ["[data-act=look]"])
	if _c.b:
		_fn = func():
			_callm(_c.b, "focus", [])
		_timeout(_fn, 40)

# L2436
func spr(rows = null, pal = null, x = null, y = null, flip = null, white = null, alpha = null):
	var w = null
	var r = null
	var c = null
	var row = null
	var ch = null
	w = 0
	r = 0
	while (r < _len(rows)):
		w = max(w, _len(_ix(rows, r)))
		r += 1
	x = _round(x)
	y = _round(y)
	if alpha:
		g.globalAlpha = alpha
	r = 0
	while (r < _len(rows)):
		row = _ix(rows, r)
		c = 0
		while (c < _len(row)):
			ch = _ix(row, c)
			if (ch == "."):
				c += 1
				continue
			g.fillStyle = ("#fff" if white else _ix(pal, ch))
			g.fillRect((x + (((w - 1) - c) if flip else c)), (y + r), 1, 1)
			c += 1
		r += 1
	if alpha:
		g.globalAlpha = 1

# L2443
func txt(s = null, x = null, y = null, col = null, al = null):
	var w = null
	g.font = "8px \"Press Start 2P\", monospace"
	g.textBaseline = "top"
	w = g.measureText(s).get("width")
	if (al == "c"):
		x -= (w / 2.0)
	elif (al == "r"):
		x -= w
	x = _round(x)
	y = _round(y)
	g.fillStyle = "#000"
	g.fillText(s, (x + 1), (y + 1))
	g.fillStyle = col
	g.fillText(s, x, y)

# L2450
func txtM(s = null, x = null, y = null, col = null, m = null, o = null):
	var j = null
	var k = null
	if (not m):
		txt(s, x, y, col)
		return
	j = 0
	while (j < _len(s)):
		k = (j + 1)
		while ((k < _len(s)) and (_ix(m, (o + k)) == _ix(m, (o + j)))):
			k += 1
		_callv((txtI if (_ix(m, (o + j)) == "1") else txt), [_slice(s, j, k), (x + (8 * j)), y, col])
		j = k

# L2459
func txtI(s = null, x = null, y = null, col = null):
	var B = null
	var k = null
	var w = null
	var i = null
	var a = null
	var b = null
	B = [[-4, 2], [2, 1], [5, 0], [11]]
	k = (SC * HS)
	w = ((8 * _len(s)) + 6)
	i = 0
	while (i < 3):
		a = _round(((y + _ix(_ix(B, i), 0)) * k))
		b = _round(((y + _ix(_ix(B, (i + 1)), 0)) * k))
		g.save()
		g.setTransform(1, 0, 0, 1, 0, 0)
		g.beginPath()
		g.rect(floori(((x - 2) * k)), a, ceili((w * k)), (b - a))
		g.clip()
		g.setTransform(k, 0, 0, k, 0, 0)
		txt(s, (x + _ix(_ix(B, i), 1)), y, col)
		g.restore()
		i += 1

# L2466
func j_wrap(s = null, maxw = null):
	var ws = null
	var out = null
	var cur = null
	var i = null
	var t2 = null
	g.font = "8px \"Press Start 2P\", monospace"
	if (g.measureText(s).get("width", NAN) <= maxw):
		return [s]
	ws = _split(s, " ")
	out = []
	cur = ""
	i = 0
	while (i < _len(ws)):
		t2 = (str(cur) + " " + str(_ix(ws, i)) if cur else _ix(ws, i))
		if ((g.measureText(t2).get("width", NAN) > maxw) and cur):
			out.append(cur)
			cur = _ix(ws, i)
		else:
			cur = t2
		i += 1
	if cur:
		out.append(cur)
	return out

# L2474
func rect(x = null, y = null, w = null, h = null, c = null):
	g.fillStyle = c
	g.fillRect(_round(x), _round(y), w, h)

# L2485
func lightSpr(r = null, col = null):
	var k = null
	var d = null
	var cn = null
	var q = null
	var im = null
	var x = null
	var y = null
	var dx = null
	var dy = null
	var dd = null
	var v = null
	var lv = null
	var i = null
	k = str(r) + "|" + str((col if col else ""))
	if _ix(LSPR, k):
		return _ix(LSPR, k)
	d = (r * 2)
	cn = _callm(document, "createElement", ["canvas"])
	cn.width = d
	cn.height = d
	q = cn.getContext("2d")
	im = q.createImageData(d, d)
	y = 0
	while (y < d):
		x = 0
		while (x < d):
			dx = (((x - r) + 0.5) / float(r))
			dy = ((((y - r) + 0.5) / float(r)) * 1.25)
			dd = sqrt(((dx * dx) + (dy * dy)))
			v = (1 - dd)
			if (v < 0):
				v = 0
			v *= v
			lv = floori(((v * 11) + ((BAYER[int((((int(y) & int(3)) * 4) + (int(x) & int(3))))]) / 16.0)))
			if (lv < 0):
				lv = 0
			if (lv > 11):
				lv = 11
			i = (((y * d) + x) * 4)
			im.data[int(i)] = 255
			im.data[int((i + 1))] = 255
			im.data[int((i + 2))] = 255
			im.data[int((i + 3))] = (lv * 23)
			x += 1
		y += 1
	q.putImageData(im, 0, 0)
	if col:
		q.globalCompositeOperation = "source-in"
		q.fillStyle = col
		q.fillRect(0, 0, d, d)
	_aset(LSPR, k, cn)
	return cn

# L2504
func light(x = null, y = null, r = null, a = null, col = null):
	if (LN >= 48):
		return
	r = max(4, min(72, (_round((r / 2.0)) * 2)))
	_aset(LX, LN, x)
	_aset(LY, LN, y)
	_aset(LR, LN, r)
	_aset(LA, LN, (1 if (a == null) else a))
	_aset(LCOL, LN, (col if col else null))
	LN += 1

# L2510
func floorY(x = null, y = null):
	var cx = null
	var cy = null
	var i = null
	var tt = null
	cx = floori((x / float(T)))
	cy = floori((y / float(T)))
	i = cy
	while (i < ROWS):
		tt = tileAt(cx, i)
		if ((tt == 1) or (tt == 2)):
			return (i * T)
		i += 1
	return -1

# L2515
func shadow(sx = null, wx = null, wy = null, w = null, h = null):
	var S = null
	var sun = null
	var fy = null
	var d = null
	var k = null
	var a = null
	var rw = null
	var off = null
	var cx = null
	S = (_ix(STAGES, st.get("n")) if st else _ix(STAGES, 0))
	sun = (S.get("sun") if S.get("sun") else SUN0)
	fy = floorY((wx + (w / 2.0)), ((wy + h) - 1))
	if (fy < 0):
		return
	d = (fy - (wy + h))
	if (d < 0):
		d = 0
	if (d > 46):
		return
	k = (1 - (d / 46.0))
	a = ((sun.get("a") * k) * k)
	rw = _round(((w * sun.get("len")) * (0.62 + (0.38 * k))))
	off = (((h * 0.45) + (d * 0.55)) * sun.get("dx"))
	if ((rw < 3) or (a < 0.05)):
		return
	g.globalAlpha = a
	g.fillStyle = "#000"
	cx = (sx + (w / 2.0))
	g.fillRect((_round(((cx + (off * 0.25)) - (rw / 2.0))) + 1), fy, (rw - 2), 1)
	if (rw > 6):
		g.fillRect(_round(((cx + (off * 0.6)) - (rw / 2.0))), (fy + 1), rw, 1)
	else:
		g.fillRect((_round(((cx + (off * 0.6)) - (rw / 2.0))) + 1), (fy + 1), (rw - 2), 1)
	if (rw > 10):
		g.fillRect((_round(((cx + off) - (rw / 2.0))) + 2), (fy + 2), (rw - 4), 1)
	g.globalAlpha = 1

# L2536
func drawLight():
	var S = null
	var i = null
	var r = null
	S = (_ix(STAGES, st.get("n")) if st else _ix(STAGES, 0))
	if (not (SET.get("light"))):
		LN = 0
		return
	g.save()
	g.setTransform(SC, 0, 0, SC, 0, 0)
	if S.get("amb"):
		g.globalAlpha = (0.65 if (mode == "menu") else 1)
		g.fillStyle = S.get("amb")
		g.fillRect(0, 0, W, H)
		g.globalAlpha = 1
	g.globalCompositeOperation = "lighter"
	i = 0
	while (i < LN):
		r = _ix(LR, i)
		g.globalAlpha = (_ix(LA, i) * (0.34 if _ix(LCOL, i) else 0.2))
		g.drawImage(lightSpr(r, (_ix(LCOL, i) if _ix(LCOL, i) else "#fff6d8")), _round((_ix(LX, i) - r)), _round(((_ix(LY, i) - camY) - r)))
		i += 1
	g.globalAlpha = 1
	g.globalCompositeOperation = "source-over"
	g.restore()
	LN = 0

# L2553
func bgArt():
	var o = null
	var BW = null
	var off = null
	o = _ix(SHEET, "bg_" + str(st.get("n")))
	if ((not o) or (not (o.get("ok")))):
		return false
	BW = o.get("fw")
	off = fmod((fmod((cam * 0.12), BW) + BW), BW)
	g.drawImage(o.get("img"), -off, 0, BW, GY)
	g.drawImage(o.get("img"), (BW - off), 0, BW, GY)
	if ((boss and (not (boss.get("dead")))) and (st.get("n") != 1)):
		g.globalAlpha = 0.2
		rect(0, camY, W, (GY - camY), "#3a0c28")
		g.globalAlpha = 1
	return true

# L2560
func drawBG():
	var S = null
	var n = null
	var IMG = null
	var sky = null
	var i = null
	var x = null
	var off = null
	var lo = null
	var yy = null
	var pu = null
	var ang = null
	var bx = null
	var hb = null
	var tn = null
	var rx = null
	var ry = null
	var c0 = null
	S = _ix(STAGES, st.get("n"))
	n = st.get("n")
	IMG = bgArt()
	if (not IMG):
		sky = g.createLinearGradient(0, 0, 0, GY)
		sky.addColorStop(0, _ix(S.sky, 0))
		sky.addColorStop(1, ("#3a0c28" if ((boss and (not (boss.get("dead")))) and (n != 1)) else _ix(S.sky, 1)))
		g.fillStyle = sky
		g.fillRect(0, 0, W, WH)
	if (n == 0):
		if (not IMG):
			i = 0
			while (i < 45):
				rect(fmod((fmod((((rnd(i) * W) * 1.3) - (cam * 0.03)), W) + W), W), (rnd((i + 70)) * 80), 1, 1, ("#7f8ad0" if fmod(i, 4) else "#fff"))
				i += 1
			g.fillStyle = "#e9e2c4"
			g.beginPath()
			g.arc((258 - fmod((cam * 0.015), 40)), 30, 9, 0, 6.283)
			g.fill()
			city(0.15, 30, 40, 40, "#0d1030", null, 1)
			city(0.4, 26, 30, 45, "#141a40", "#3a3f70", 5)
			city(0.7, 36, 18, 40, "#1b2350", "#ffd23f", 9)
		lo = floori(((cam * 0.9) / 120.0))
		i = (lo - 1)
		while (i < (lo + 4)):
			x = _round((((i * 120) + 60) - (cam * 0.9)))
			if (not (bgFoot(x, 8))):
				i += 1
				continue
			rect(x, (GY - 46), 2, 46, "#2a2e48")
			rect(x, (GY - 46), 8, 2, "#2a2e48")
			g.globalAlpha = 0.07
			rect((x - 6), (GY - 44), 22, 44, "#ffd23f")
			g.globalAlpha = 1
			rect((x + 6), (GY - 44), 2, 2, "#ffd23f")
			light((x + 7), (GY - 40), 32, 1, "#ffd23f")
			i += 1
	elif (n == 1):
		if (not IMG):
			g.fillStyle = "#ffd27a"
			g.beginPath()
			g.arc((200 - (cam * 0.02)), (GY - 30), 30, 0, 6.283)
			g.fill()
			i = 0
			while (i < 5):
				rect(0, ((GY - 46) + (i * 7)), W, 2, "rgba(255,122,74," + str((0.25 - (i * 0.04))) + ")")
				i += 1
			city(0.2, 40, 30, 40, "#4a1a44", null, 3)
			city(0.45, 32, 20, 40, "#2e1030", "#ffb070", 7)
		off = (cam * 0.7)
		i = (floori((off / 90.0)) - 1)
		while (i < (floori((off / 90.0)) + 5)):
			x = _round((((i * 90) - off) + 20))
			if (not (bgFoot(x, 44))):
				i += 1
				continue
			rect(x, (GY - 50), 18, 14, "#1c0a20")
			rect((x + 2), (GY - 36), 2, 36, "#1c0a20")
			rect((x + 14), (GY - 36), 2, 36, "#1c0a20")
			rect((x + 4), (GY - 20), 10, 1, "#1c0a20")
			rect(x, (GY - 2), 18, 2, "#1c0a20")
			rect((x + 40), (GY - 70), 1, 70, "#1c0a20")
			rect((x + 37), (GY - 3), 7, 3, "#1c0a20")
			rect((x + 36), (GY - 66), 9, 1, "#1c0a20")
			rect((x + 38), (GY - 60), 5, 1, "#1c0a20")
			i += 1
	elif (n == 2):
		if (not IMG):
			off = (cam * 0.5)
			yy = 8
			while (yy < (GY - 10)):
				x = -(fmod(int(off), 10))
				while (x < W):
					rect(x, yy, 9, 7, ("#1d2028" if (fmod(((yy / 8.0) + floori(((x + off) / 10.0))), 7) == 0) else "#14161d"))
					x += 10
				yy += 8
			rect(0, 26, W, 3, "#0a0b10")
			x = -(fmod(int((cam * 1.6)), 60))
			while (x < W):
				g.globalAlpha = 0.25
				rect(x, 22, 20, 2, "#ffe9a8")
				g.globalAlpha = 1
				x += 60
		off = (cam * 0.85)
		i = (floori((off / 110.0)) - 1)
		while (i < (floori((off / 110.0)) + 4)):
			x = _round(((i * 110) - off))
			rect(x, 30, 14, (GY - 30), "#0c0d12")
			rect((x + 2), 30, 2, (GY - 30), "#1b1d26")
			i += 1
		rect(0, (GY - 24), W, 2, "#3a2a12")
		x = -(fmod(int((cam * 1.6)), 60))
		while (x < (W + 20)):
			light((x + 10), 30, 28, 0.95, "#ffe9a8")
			x += 60
	else:
		pu = pulse()
		if (not IMG):
			off = (cam * 0.5)
			i = (floori((off / 44.0)) - 1)
			while (i < (floori((off / 44.0)) + 9)):
				x = _round(((i * 44) - off))
				speaker(x, (GY - 80), pu)
				speaker(x, (GY - 40), pu)
				i += 1
		g.globalAlpha = 0.12
		i = 0
		while (i < 3):
			ang = (sin(((t * 0.01) + (i * 2))) * 0.6)
			bx = (60 + (i * 100))
			g.fillStyle = _ix(["#ff3d6e", "#3de8ff", "#ffd23f"], i)
			g.beginPath()
			g.moveTo(bx, 0)
			g.lineTo(((bx + (sin(ang) * 200)) - 30), GY)
			g.lineTo(((bx + (sin(ang) * 200)) + 30), GY)
			g.fill()
			light(bx, 14, 30, (0.45 + (pu * 0.35)), _ix(["#ff3d6e", "#3de8ff", "#ffd23f"], i))
			light((bx + (sin(ang) * 200)), (GY - 6), 34, (0.4 + (pu * 0.3)), _ix(["#ff3d6e", "#3de8ff", "#ffd23f"], i))
			i += 1
		g.globalAlpha = 1
		off = (cam * 0.9)
		i = (floori((off / 9.0)) - 1)
		while (i < (floori((off / 9.0)) + 38)):
			x = _round(((i * 9) - off))
			if (not (bgFoot(x, 7))):
				i += 1
				continue
			hb = ((2 if (rnd(i) > 0.5) else 0) + (2 if (pu and (rnd((i + 3)) > 0.4)) else 0))
			rect(x, ((GY - 10) - hb), 7, (10 + hb), "#0a0510")
			rect((x + 1), ((GY - 15) - hb), 5, 5, "#0a0510")
			i += 1
	if (st.get("i") == (_len(LEVELS) - 1)):
		clashTowers()
	tn = _ix(BGT, st.get("i"))
	if tn:
		g.globalAlpha = _ix(tn, 1)
		rect(0, (camY - 40), W, ((GY - camY) + 40), _ix(tn, 0))
		g.globalAlpha = 1
	if (tn and _ix(tn, 2)):
		i = 0
		while (i < 60):
			rx = fmod((fmod(((((rnd(i) * W) * 1.4) - (t * 1.1)) - (cam * 0.2)), W) + W), W)
			ry = ((camY + fmod(((rnd((i + 90)) * 140) + (t * 3.4)), 140)) - 20)
			g.globalAlpha = 0.28
			rect(int(rx), int(ry), 1, 4, "#9fb6ff")
			i += 1
	g.globalAlpha = 1
	c0 = floori((cam / float(T)))
	i = c0
	while (i < ((c0 + ceili((W / float(T)))) + 2)):
		if ((tileAt(i, 13) == 0) and (tileAt(i, 14) == 0)):
			rect(((i * T) - cam), GY, T, (((ROWS * T) - GY) + 40), "#04030a")
		i += 1

# L2611
func clashTowers():
	var ax = null
	var pu = null
	var won = null
	var fight = null
	var bon = null
	var con = null
	ax = st.get("arenaX")
	pu = pulse()
	won = _or((st.get("bossDone") if st.get("bossDone") else (st.get("clearT", NAN) > 0)), (boss.get("dead") if boss else boss))
	fight = ((not (boss.get("dead"))) if boss else boss)
	bon = (1 if won else 0)
	con = ((0.4 if ((boss and boss.get("dead")) and (int((int(t) >> int(2))) & int(1))) else 0) if won else (1 if fight else 0.35))
	clashPiece("s_bestia", ax, bon, pu, "#3de8ff", 0)
	clashPiece("t_bestia", (ax + 30), bon, pu, "#ff9a3a", 0)
	clashPiece("s_censor", ((ax + W) - 39), con, pu, "#ff3d6e", 1)
	clashPiece("t_censor", ((ax + W) - 52), con, pu, "#ff3d6e", 1)

# L2622
func clashPiece(key = null, wx = null, on = null, pu = null, lc = null, cen = null):
	var a = null
	var x = null
	var sp = null
	a = _ix(ART, key)
	x = _round((wx - cam))
	if (((not a) or (x < (-(a.get("fw")) - 4))) or (x > (W + 4))):
		return
	blit(key, (0 if (on > 0.5) else 1), x, (GY - a.get("fh")), a.get("fw"), a.get("fh"), false, false)
	if (on > 0.5):
		sp = (_charAt(key, 0) == "s")
		light((x + ((a.get("fw")) / 2.0)), (GY - (a.get("fh") * (0.3 if sp else 0.5))), (34 if sp else 26), ((0.25 if sp else 0.3) + (pu * (0.45 if sp else 0.25))), lc)
		if sp:
			light((x + ((a.get("fw")) / 2.0)), ((GY - a.get("fh")) + 4), 20, (0.3 + (pu * 0.3)), lc)
	if (((cen and (on > 0)) and (on < 1)) and (fmod(t, 9) == 0)):
		burst((((wx + ((a.get("fw")) / 2.0)) + (_rnd() * 8)) - 4), (((GY - a.get("fh")) + 4) + ((_rnd() * a.get("fh")) * 0.8)), ["#ffd23f", "#fff"], 3, 1.5)

# L2631
func bgFoot(x = null, w = null):
	var a = null
	var b = null
	var c = null
	a = floori(((x + cam) / float(T)))
	b = floori(((((x + w) - 1) + cam) / float(T)))
	c = a
	while (c <= b):
		if (tileAt(c, 13) == 0):
			return false
		c += 1
	return true

# L2634
func city(par = null, sp = null, hmin = null, hr = null, col = null, win = null, j_seed = null):
	var off = null
	var i0 = null
	var n = null
	var i = null
	var bw = null
	var bh = null
	var x = null
	var y = null
	var wy = null
	var wx = null
	off = (cam * par)
	i0 = (floori((off / float(sp))) - 1)
	n = (ceili((W / float(sp))) + 3)
	i = i0
	while (i < (i0 + n)):
		bw = ((sp - 2) - int((rnd((i + j_seed)) * 8)))
		bh = (hmin + int((rnd(((i * 3) + j_seed)) * hr)))
		x = _round(((i * sp) - off))
		y = (GY - bh)
		rect(x, y, bw, bh, col)
		if win:
			wy = (y + 4)
			while (wy < (GY - 6)):
				wx = (x + 3)
				while (wx < ((x + bw) - 3)):
					if (rnd((((wx * 7) + (wy * 13)) + i)) > 0.62):
						rect(wx, wy, 2, 3, ("#ff3d6e" if (rnd(((wx + wy) + i)) > 0.8) else win))
					wx += 5
				wy += 6
		i += 1

# L2639
func speaker(x = null, y = null, pu = null):
	var _a = null
	var c = null
	var r = null
	rect(x, y, 40, 38, "#0f0a18")
	rect((x + 1), (y + 1), 38, 1, "#2a1e3a")
	_a = [[20, 13, 10], [20, 30, 6]]
	for _i in range(_len(_a)):
		if _i >= _len(_a): break
		c = _a[_i]
		r = null
		r = (_ix(c, 2) + (pu if (_ix(c, 2) > 8) else 0))
		rect(((x + _ix(c, 0)) - r), ((y + _ix(c, 1)) - r), (r * 2), (r * 2), "#05030a")
		rect((((x + _ix(c, 0)) - r) + 2), (((y + _ix(c, 1)) - r) + 2), ((r * 2) - 4), ((r * 2) - 4), "#1f1530")
		rect(((x + _ix(c, 0)) - 2), ((y + _ix(c, 1)) - 2), 4, 4, "#05030a")

# L2649
func shade(c = null, f = null):
	var _c = {"f": f}
	var n = null
	var r = null
	var gg = null
	var b = null
	var m = null
	m = func(v = null):
		v = _round((v * _c.f))
		return (0 if (v < 0) else (255 if (v > 255) else v))
	n = _parseInt(_slice(c, 1, null), 16)
	r = (int((int(n) >> int(16))) & int(255))
	gg = (int((int(n) >> int(8))) & int(255))
	b = (int(n) & int(255))
	return "rgb(" + str(m.call(r)) + "," + str(m.call(gg)) + "," + str(m.call(b)) + ")"

# L2655
func tileSpr(key = null, paint_2 = null):
	var o = null
	var cn = null
	var q = null
	o = _ix(TSPR, key)
	if o:
		return o
	cn = _callm(document, "createElement", ["canvas"])
	cn.width = (T * SC)
	cn.height = (T * SC)
	q = cn.getContext("2d")
	q.imageSmoothingEnabled = false
	paint_2.call(q, (T * SC))
	_aset(TSPR, key, cn)
	return cn

# L2661
func qp(q = null, x = null, y = null, w = null, h = null, c = null):
	q.fillStyle = c
	q.fillRect(x, y, w, h)

# L2663
func paintGnd(q = null, D_2 = null, S = null, v = null, top = null):
	var x = null
	var y = null
	var i = null
	var CH_2 = null
	var BW = null
	var cr = null
	var oy = null
	var offx = null
	var bx = null
	var s = null
	var r = null
	var gx = null
	var gy = null
	var d = null
	qp(q, 0, 0, D_2, D_2, S.get("gnd"))
	CH_2 = 12
	BW = 24
	cr = 0
	while (cr < (D_2 / float(CH_2))):
		oy = (cr * CH_2)
		offx = ((fmod((cr + v), 2) * BW) / 2.0)
		i = -1
		while (i < ((D_2 / float(BW)) + 1)):
			bx = _round(((i * BW) + offx))
			s = rnd((((cr * 7) + (i * 13)) + (v * 31)))
			qp(q, bx, oy, (BW - 1), (CH_2 - 1), shade(S.get("gnd"), (0.93 + (s * 0.16))))
			qp(q, bx, oy, (BW - 1), 1, shade(S.get("gnd"), 1.22))
			qp(q, bx, oy, 1, (CH_2 - 1), shade(S.get("gnd"), 1.12))
			qp(q, bx, ((oy + CH_2) - 2), (BW - 1), 1, shade(S.get("gnd"), 0.74))
			qp(q, ((bx + BW) - 2), (oy + 1), 1, (CH_2 - 3), shade(S.get("gnd"), 0.8))
			i += 1
		qp(q, 0, ((oy + CH_2) - 1), D_2, 1, shade(S.get("gnd"), 0.58))
		cr += 1
	y = 0
	while (y < D_2):
		x = 0
		while (x < D_2):
			r = rnd((((x * 3.7) + (y * 11.3)) + (v * 53)))
			if (r > 0.955):
				qp(q, x, y, 1, 1, shade(S.get("gnd"), 1.16))
			elif (r < 0.045):
				qp(q, x, y, 1, 1, shade(S.get("gnd"), 0.84))
			x += 1
		y += 1
	if (v > 1):
		gx = (10 + int((rnd((v * 17)) * 20)))
		gy = 6
		i = 0
		while (i < 16):
			qp(q, gx, (gy + i), 1, 1, shade(S.get("gnd"), 0.62))
			if (rnd((i + v)) > 0.6):
				gx += (1 if (rnd(((i * 3) + v)) > 0.5) else -1)
			i += 1
	if top:
		qp(q, 0, 0, D_2, 10, S.get("top"))
		qp(q, 0, 0, D_2, 2, shade(S.get("top"), 1.3))
		qp(q, 0, 8, D_2, 2, S.get("tex"))
		x = 0
		while (x < D_2):
			d = int((rnd(((x * 5.1) + (v * 29))) * 7))
			if (d > 3):
				qp(q, x, 10, 1, (d - 3), S.get("tex"))
			x += 1
		i = 0
		while (i < D_2):
			if (rnd(((i * 2.3) + (v * 7))) > 0.9):
				qp(q, i, (3 + int((rnd((i + v)) * 4))), 1, 1, shade(S.get("top"), 0.78))
			i += 1

# L2698
func paintPlat(q = null, D_2 = null, S = null):
	var x = null
	var r = null
	qp(q, 0, 0, D_2, 12, S.get("top"))
	qp(q, 0, 0, D_2, 2, shade(S.get("top"), 1.32))
	qp(q, 0, 10, D_2, 2, shade(S.get("top"), 0.68))
	x = 0
	while (x < D_2):
		r = rnd((x * 4.3))
		if (r > 0.86):
			qp(q, x, (3 + int((r * 5))), 1, 1, shade(S.get("top"), 0.82))
		x += 1
	qp(q, 0, 12, D_2, 3, "rgba(0,0,0,.45)")
	qp(q, 2, 12, 2, 5, S.get("tex"))
	qp(q, (D_2 - 4), 12, 2, 5, S.get("tex"))
	qp(q, 5, 4, 2, 2, shade(S.get("top"), 0.6))
	qp(q, (D_2 - 7), 4, 2, 2, shade(S.get("top"), 0.6))

# L2708
func paintSpikes(q = null, D_2 = null):
	var k = null
	var bx = null
	var h = null
	var r = null
	var w = null
	var sx = null
	var yy = null
	k = 0
	while (k < 3):
		bx = (k * 16)
		h = 24
		r = 0
		while (r < h):
			w = max(1, _round((((h - r) / float(h)) * 14)))
			sx = ((bx + 8) - (int(w) >> int(1)))
			yy = ((D_2 - 1) - r)
			qp(q, sx, yy, w, 1, "#9aa2b8")
			qp(q, sx, yy, max(1, (int(w) >> int(1))), 1, "#d8dcea")
			if (w > 3):
				qp(q, ((sx + w) - 1), yy, 1, 1, "#6a7088")
			r += 1
		qp(q, (bx + 7), (D_2 - h), 2, 3, "#ff3d6e")
		qp(q, (bx + 7), (D_2 - h), 2, 1, "#ffb0c4")
		k += 1

# L2721
func drawTiles():
	var _c = {"S": null, "v": null, "top": null}
	var c0 = null
	var c1 = null
	var n = null
	var cy = null
	var cx = null
	var tt = null
	var x = null
	var y = null
	var ph = null
	var q = null
	var yy = null
	var _fn = null
	var _fn_2 = null
	var m = null
	var x_2 = null
	var _a = null
	var c = null
	var x_3 = null
	_c.S = _ix(STAGES, st.get("n"))
	c0 = floori((cam / float(T)))
	c1 = ((c0 + ceili((W / float(T)))) + 1)
	n = st.get("n")
	cy = 0
	while (cy < ROWS):
		cx = c0
		while (cx <= c1):
			tt = tileAt(cx, cy)
			if (((not tt) or (cx < 0)) or (cx >= COLS)):
				cx += 1
				continue
			x = _round(((cx * T) - cam))
			y = (cy * T)
			if (tt == 1):
				_c.top = (tileAt(cx, (cy - 1)) != 1)
				_c.v = int((rnd(((cx * 3) + (cy * 7))) * 4))
				_fn = func(q_2 = null, D_2 = null):
					paintGnd(q_2, D_2, _c.S, _c.v, _c.top)
				g.drawImage(tileSpr("g" + str(n) + str(_c.v) + ("t" if _c.top else ""), _fn), x, y, T, T)
				if (((n == 2) and (cy == 13)) and _c.top):
					rect(x, (y + 5), T, 1, "#5a5f6a")
			elif (tt == 2):
				_fn_2 = func(q_2 = null, D_2 = null):
					paintPlat(q_2, D_2, _c.S)
				g.drawImage(tileSpr("p" + str(n), _fn_2), x, y, T, T)
			elif (tt == 3):
				g.drawImage(tileSpr("s", paintSpikes), x, y, T, T)
			elif (tt == 4):
				ph = ((int(t) >> int(1)) + (cy * 5))
				rect((x + 2), y, 8, T, "rgba(255,61,110,.16)")
				q = 0
				while (q < 2):
					yy = (y + fmod((ph + (q * 6)), T))
					rect((x + 3), yy, 6, 3, "#ff3d6e")
					rect((x + 5), (yy + 1), 2, 1, "#fff")
					q += 1
				light((x + 6), (y + 6), 10, 0.35, "#ff3d6e")
			cx += 1
		cy += 1
	for _i in range(_len(mplats)):
		if _i >= _len(mplats): break
		m = mplats[_i]
		x_2 = null
		x_2 = _round((m.get("x") - cam))
		if m.get("v"):
			g.globalAlpha = 0.35
			rect(((x_2 + ((m.get("w")) / 2.0)) - 1), (m.get("y0") - m.get("rg")), 2, (m.get("rg") + 6), "#3de8ff")
			g.globalAlpha = 1
		rect(x_2, m.get("y"), m.get("w"), 4, "#3de8ff")
		rect(x_2, (m.get("y") + 4), m.get("w"), 1, "#1a6a7a")
		rect((x_2 + 2), (m.get("y") + 1), (m.get("w") - 4), 1, "#c8f8ff")
	_a = st.get("cps")
	for _i_2 in range(_len(_a)):
		if _i_2 >= _len(_a): break
		c = _a[_i_2]
		x_3 = null
		x_3 = (_round((c.get("x") - cam)) + 4)
		rect(x_3, (c.get("y") - 12), 2, 28, "#9aa0b0")
		if c.get("on"):
			rect((x_3 + 2), (c.get("y") - 12), 10, 2, "#2bb34a")
			rect((x_3 + 2), (c.get("y") - 10), 10, 2, "#ffd23f")
			rect((x_3 + 2), (c.get("y") - 8), 10, 2, "#ff3d6e")
		else:
			rect((x_3 + 2), (c.get("y") - 12), 10, 6, "#555a70")

# L2744
func drawEnemy(e = null):
	var x = null
	var y = null
	var f = null
	var wh = null
	var ed = null
	var o = null
	var tv = null
	var tk = null
	var v = null
	var k = null
	var sx = null
	var _sw = null
	x = (e.get("x") - cam)
	y = e.get("y")
	f = (e.get("dir", NAN) > 0)
	wh = (e.get("fl", NAN) > 0)
	ed = _ix(EDEF, e.get("type"))
	if (e.get("type") == "X"):
		x = _round(x)
		y = _round(y)
		shadow(x, e.get("x"), e.get("y"), 10, 12)
		o = ("#fff" if wh else "#1a1530")
		rect((x + 1), y, 8, 12, o)
		rect(x, (y + 1), 10, 10, o)
		rect((x + 1), (y + 1), 8, 10, ("#fff" if wh else "#c8203e"))
		rect((x + 1), (y + 1), 2, 10, ("#fff" if wh else "#ff5a6e"))
		rect((x + 7), (y + 1), 2, 10, ("#fff" if wh else "#8a1028"))
		rect((x + 1), (y + 3), 8, 1, "#1a1530")
		rect((x + 1), (y + 8), 8, 1, "#1a1530")
		rect((x + 3), (y + 4), 4, 4, "#ffd23f")
		rect((x + 4), (y + 5), 2, 1, "#1a1530")
		rect((x + 4), (y + 6), 1, 1, "#1a1530")
		if (int((int(t) >> int(4))) & int(1)):
			light((x + 5), (y + 5), 12, 0.5, "#ff3d6e")
		return
	if ed:
		shadow(x, e.get("x"), e.get("y"), ed.get("w"), ed.get("h"))
	if (ed and blit(_ix(ESHEET, e.get("type")), int(e.get("a")), x, y, ed.get("w"), ed.get("h"), ((p.get("x", NAN) < e.get("x", NAN)) if (e.get("type") == "f") else f), wh)):
		if (e.get("type") == "t"):
			tv = aimAt((e.get("x") + 5), (e.get("y") + 3), 1)
			tk = 0
			while (tk < 5):
				rect(((x + 5) + (_ix(tv, 0) * tk)), ((y + 3) + (_ix(tv, 1) * tk)), 1, 1, "#ff8a2a")
				tk += 1
			if ((e.get("cd", NAN) < 20) and (int((int(t) >> int(2))) & int(1))):
				rect((x + 4), (y + 2), 2, 2, "#ff3d6e")
		return
	_sw = e.get("type")
	if _sw == "w":
		spr(_concat(WB, [[_ix(WL, fmod(int(e.get("a")), 2))]]), WALK, x, y, f, wh)
	elif _sw == "h":
		spr(_concat(WB, [[_ix(WL, (0 if e.get("ground") else 1)), ".........."]]), HOP, x, (y - (0 if e.get("ground") else 1)), f, wh)
	elif _sw == "f":
		spr(_concat([_ix(FR, fmod(int(e.get("a")), 2))], [FB]), FP, x, y, (p.get("x", NAN) < e.get("x", NAN)), wh)
	elif _sw == "t":
		rect(x, (y + 4), 10, 6, ("#fff" if wh else "#4a5170"))
		rect((x + 1), (y + 5), 8, 1, "#7a82a8")
		rect((x + 2), (y + 1), 6, 4, ("#fff" if wh else "#2a2e48"))
		v = aimAt((e.get("x") + 5), (e.get("y") + 3), 1)
		k = 0
		while (k < 5):
			rect(((x + 5) + (_ix(v, 0) * k)), ((y + 3) + (_ix(v, 1) * k)), 1, 1, "#ff8a2a")
			k += 1
		if ((e.get("cd", NAN) < 20) and (int((int(t) >> int(2))) & int(1))):
			rect((x + 4), (y + 2), 2, 2, "#ff3d6e")
	elif _sw == "s":
		rect((x + 2), y, 7, 4, ("#fff" if wh else "#2a2e48"))
		rect((x + 3), (y + 1), 5, 2, "#3de8ff")
		rect((x + 2), (y + 4), 7, 7, ("#fff" if wh else "#3a3f60"))
		rect((x + 2), (y + 11), 2, 2, "#15151c")
		rect((x + 7), (y + 11), 2, 2, "#15151c")
		sx = ((x + 9) if (e.get("dir", NAN) > 0) else x)
		rect(sx, (y + 1), 2, 12, "#9aa0b0")
		rect((sx + (1 if (e.get("dir", NAN) > 0) else 0)), (y + 2), 1, 10, "#d8dce8")
	elif _sw == "b":
		rect((x + 1), (y + 1), 12, 5, ("#fff" if wh else "#2bb37a"))
		rect(x, (y + 2), 14, 3, ("#fff" if wh else "#2bb37a"))
		rect((x + 3), (y + 6), 8, 2, "#1b7a55")
		rect((x + 2), (y + 2), 10, 1, "#7ae0a8")
		rect((x + (13 if (e.get("x", NAN) > p.get("x", NAN)) else -2)), (y + (1 if (int((int(t) >> int(1))) & int(1)) else 4)), 2, 2, "#9aa0b0")
	elif _sw == "*":
		rect(x, y, 10, 10, ("#fff" if wh else "#8a5a2a"))
		rect((x + 1), (y + 1), 8, 8, "#b07838")
		rect(x, (y + 4), 10, 1, "#6a4018")
		txt("?", (x + 1), (y + 1), "#ffd23f")

# L2780
func drawBoss(b = null):
	var _c = {"wh": null, "x": null, "y": null}
	var R = null
	var s = null
	var bok = null
	var sk = null
	var so = null
	var fw = null
	var fh = null
	var sx2 = null
	var k = null
	var j = null
	var right = null
	R = func(a = null, c = null, w = null, h = null, col = null):
		g.fillStyle = ("#fff" if _c.wh else col)
		g.fillRect((_c.x + a), (_c.y + c), w, h)
	if (not (b.get("dead"))):
		shadow((b.get("x") - cam), b.get("x"), b.get("y"), b.get("w"), b.get("h"))
		light(((b.get("x") - cam) + ((b.get("w")) / 2.0)), (b.get("y") + ((b.get("h")) / 2.0)), max(16, b.get("w")), (1 if (b.get("fl", NAN) > 0) else 0.55), ("#ff3d6e" if (b.get("ph", NAN) > 1) else "#ff8aa6"))
	_c.x = _round((b.get("x") - cam))
	_c.y = _round(b.get("y"))
	_c.wh = _or((b.get("fl", NAN) > 0), _and(_and(_and(_and(_and(((b.get("actT", NAN) > 0) if b.get("act") else b.get("act")), (b.get("actT", NAN) < 40)), (int((int(b.get("actT")) >> int(2))) & int(1))), (b.get("act") != "burst")), (b.get("act") != "low")), (b.get("act") != "ground")))
	if ((b.get("ph", NAN) > 1) and (not (b.get("dead")))):
		g.globalAlpha = (0.16 + (0.06 * (int((int(t) >> int(3))) & int(1))))
		rect((_c.x - 4), (_c.y - 4), (b.get("w") + 8), (b.get("h") + 8), "#ff3d6e")
		g.globalAlpha = 1
	s = fmod(int(b.get("a")), 2)
	if (b.get("kind") == 4):
		sk = _ix(ESHEET, b.get("mt"))
		so = _ix(SHEET, sk)
		bok = (not (not (so and so.get("ok"))))
		if bok:
			fw = (so.get("fw") * b.get("sc"))
			fh = (so.get("fh") * b.get("sc"))
			blitS(sk, int(b.get("a")), ((_c.x + ((b.get("w")) / 2.0)) - (fw / 2.0)), (((_c.y + b.get("h")) - fh) + _round(((fh - b.get("h")) * 0.4))), b.get("sc"), ((p.get("x", NAN) < b.get("x", NAN)) if (b.get("mt") == "f") else (b.get("dir", NAN) > 0)), _c.wh)
			if ((b.get("mt") == "s") and (b.get("act") != "stun")):
				sx2 = (((_c.x + b.get("w")) - 2) if (b.get("dir", NAN) > 0) else (_c.x - 2))
				rect(sx2, (_c.y + 4), 4, (b.get("h") - 6), ("#fff" if _c.wh else "#9aa0b0"))
				rect((sx2 + 1), (_c.y + 5), 2, (b.get("h") - 8), "#d8dce8")
	else:
		bok = blit((tintSheet("b_" + str(b.get("kind"))) if b.get("mk") else "b_" + str(b.get("kind"))), int(b.get("a")), _c.x, _c.y, b.get("w"), b.get("h"), (b.get("vx", NAN) < 0), _c.wh)
	if (not bok):
		if (b.get("kind") == 4):
			R.call(0, 0, b.get("w"), b.get("h"), "#3a3f60")
			R.call(2, 2, (b.get("w") - 4), 4, "#ff3d6e")
		elif (b.get("kind") == 0):
			R.call(0, 0, 24, 24, "#22263a")
			R.call(1, 1, 22, 1, "#4a5170")
			R.call(1, 1, 1, 22, "#4a5170")
			R.call(4, 4, 16, 16, "#0b0c14")
			R.call(6, 6, 12, 12, "#2c3048")
			R.call(9, 9, 6, 6, "#0b0c14")
			k = 0
			while (k < 12):
				R.call((6 + k), (6 + k), 1, 1, "#ff3d6e")
				R.call((17 - k), (6 + k), 1, 1, "#ff3d6e")
				k += 1
			R.call(3, 2, 3, 1, ("#ff3d6e" if (b.get("ph", NAN) > 1) else "#3de8ff"))
			R.call(18, 2, 3, 1, ("#ff3d6e" if (b.get("ph", NAN) > 1) else "#3de8ff"))
			R.call(4, 24, 5, (6 - s), "#4a5170")
			R.call(15, 24, 5, (5 + s), "#4a5170")
			R.call(3, (29 - s), 7, 1, "#9aa0b0")
			R.call(14, (28 + s), 7, 1, "#9aa0b0")
		elif (b.get("kind") == 1):
			R.call(4, 4, 20, 8, "#3a3f60")
			R.call(2, 6, 24, 5, "#3a3f60")
			R.call(6, 5, 16, 1, "#6a7090")
			R.call(10, 7, 8, 4, "#0b0c14")
			R.call(12, 8, 4, 2, ("#ff3d6e" if (b.get("ph", NAN) > 1) else "#3de8ff"))
			R.call(0, (0 if s else 1), 10, 2, "#9aa0b0")
			R.call(18, (1 if s else 0), 10, 2, "#9aa0b0")
			R.call(4, 2, 2, 3, "#22263a")
			R.call(22, 2, 2, 3, "#22263a")
			R.call(8, 12, 2, 4, "#22263a")
			R.call(18, 12, 2, 4, "#22263a")
			R.call(12, 12, 4, 3, "#ffd23f")
			if (b.get("act") == "ground"):
				R.call(6, 0, 16, 2, "#ffd23f")
		elif (b.get("kind") == 2):
			R.call(0, 2, 24, 14, "#2a2d38")
			R.call(1, 3, 22, 1, "#5a5f6a")
			R.call(3, 5, 8, 6, "#0b0c14")
			R.call(13, 5, 8, 6, "#0b0c14")
			R.call(5, 7, 4, 2, "#ffd23f")
			R.call(15, 7, 4, 2, "#ffd23f")
			R.call(0, 13, 24, 3, "#ff3d6e")
			R.call(10, 0, 4, 3, "#9aa0b0")
			R.call(2, 16, 4, 2, "#15151c")
			R.call(18, 16, 4, 2, "#15151c")
			if (b.get("act") != "low"):
				g.globalAlpha = 0.3
				rect((_c.x + 2), (_c.y - 4), 20, 2, "#3de8ff")
				g.globalAlpha = 1
		else:
			R.call(3, 0, 20, 10, "#e8e2d0")
			R.call(5, 3, 6, 3, "#0b0c14")
			R.call(15, 3, 6, 3, "#0b0c14")
			R.call(6, 4, 2, 1, "#ff3d6e")
			R.call(16, 4, 2, 1, "#ff3d6e")
			R.call(8, 7, 10, 2, "#0b0c14")
			R.call(0, 10, 26, 16, "#1a1024")
			R.call(2, 12, 22, 12, "#2e1a40")
			R.call(10, 14, 6, 6, "#0b0c14")
			R.call(12, 16, 2, 2, ("#ff3d6e" if (b.get("ph", NAN) > 2) else "#ffd23f"))
			R.call(0, 10, 3, 12, "#e8e2d0")
			R.call(23, 10, 3, 12, "#e8e2d0")
			R.call(-3, (20 + s), 4, 4, "#e8e2d0")
			R.call(25, (20 - s), 4, 4, "#e8e2d0")
			R.call(5, 26, 6, 8, "#1a1024")
			R.call(15, 26, 6, 8, "#1a1024")
			R.call(4, 33, 8, 1, "#ff3d6e")
			R.call(14, 33, 8, 1, "#ff3d6e")
			j = 0
			while (j < b.get("ph", NAN)):
				R.call((7 + (j * 5)), -4, 3, 3, "#ff3d6e")
				j += 1
	if (((b.get("kind") == 4) and (b.get("act") == "tele")) and (b.get("next") == "charge")):
		g.globalAlpha = 0.3
		rect(((_c.x + b.get("w")) if (b.get("dir", NAN) > 0) else (st.get("arenaX") - cam)), ((_c.y + b.get("h")) - 10), ((((st.get("arenaX") + W) - b.get("x")) - b.get("w")) if (b.get("dir", NAN) > 0) else (b.get("x") - st.get("arenaX"))), 6, "#ff3d6e")
		g.globalAlpha = 1
	if ((b.get("kind") == 4) and (b.get("act") == "aim")):
		g.globalAlpha = (0.25 + (0.15 * (int((int(t) >> int(2))) & int(1))))
		rect((_round((b.get("tx") - cam)) + 4), (_c.y + b.get("h")), (b.get("w") - 8), ((GY - _c.y) - b.get("h")), "#ff3d6e")
		g.globalAlpha = 1
	if (((b.get("kind") == 4) and (b.get("act") == "stun")) and (int((int(t) >> int(3))) & int(1))):
		txt("!", ((_c.x + ((b.get("w")) / 2.0)) - 3), (_c.y - 12), "#ffd23f")
	if (((b.get("kind") == 0) and (b.get("act") == "wave")) and (b.get("actT", NAN) > 0)):
		rect((_c.x - 8), (GY - 1), (b.get("w") + 16), 1, "#ffd23f")
	if (((b.get("kind") == 0) and (b.get("act") == "dash")) and (b.get("actT", NAN) > 0)):
		g.globalAlpha = 0.3
		right = (p.get("x", NAN) > b.get("x", NAN))
		rect(((_c.x + b.get("w")) if right else (st.get("arenaX") - cam)), (_c.y + 10), ((((st.get("arenaX") + W) - b.get("x")) - b.get("w")) if right else (b.get("x") - st.get("arenaX"))), 6, "#ff3d6e")
		g.globalAlpha = 1
	if ((b.get("kind") == 1) and (b.get("act") == "aim")):
		g.globalAlpha = (0.25 + (0.15 * (int((int(t) >> int(2))) & int(1))))
		rect((_round((b.get("tx") - cam)) + 4), (_c.y + b.get("h")), 20, ((GY - _c.y) - b.get("h")), "#ff3d6e")
		g.globalAlpha = 1
	if (((b.get("kind") == 3) and (b.get("act") == "wave")) and (b.get("actT", NAN) > 0)):
		rect((_c.x - 8), (GY - 1), (b.get("w") + 16), 1, "#ffd23f")

# L2826
func drawHazards():
	var ax = null
	var sx = null
	var h = null
	var x = null
	var cl = null
	var i = null
	var hh = null
	var tr = null
	var x_2 = null
	var y = null
	var k = null
	var nose = null
	var _a = null
	var r = null
	ax = _round((st.get("arenaX") - cam))
	for _i in range(_len(hazards)):
		if _i >= _len(hazards): break
		h = hazards[_i]
		x = null
		cl = null
		i = null
		hh = null
		if (h.get("k") == "wave"):
			x = _round((h.get("x") - cam))
			cl = ["#3de8ff", "#ffd23f", "#ff3d6e", "#3de8ff"]
			i = 0
			while (i < 4):
				hh = ((h.get("h") - (i * 2)) + (int((int(t) >> int(2))) & int(1)))
				rect((x + ((i * 2) if (h.get("vx", NAN) < 0) else (6 - (i * 2)))), (GY - hh), 2, hh, _ix(cl, i))
				i += 1
		elif (h.get("k") == "laser"):
			if (h.get("warn", NAN) > 0):
				g.globalAlpha = (0.2 + (0.25 * (int((int(t) >> int(2))) & int(1))))
				rect(ax, (h.get("y") + 3), W, 2, "#ff3d6e")
				g.globalAlpha = 1
				txt(("SALTA" if (h.get("y", NAN) > (GY - 20)) else "AL SUELO"), (ax + (W / 2.0)), (h.get("y") - 12), "#ff3d6e", "c")
			else:
				rect(ax, h.get("y"), W, h.get("h"), "#ff3d6e")
				rect(ax, (h.get("y") + 2), W, (h.get("h") - 4), "#fff")
	for _i_2 in range(_len(trains)):
		if _i_2 >= _len(trains): break
		tr = trains[_i_2]
		x_2 = null
		y = null
		k = null
		nose = null
		x_2 = _round((tr.get("x") - cam))
		y = tr.get("y")
		rect(x_2, y, tr.get("w"), tr.get("h"), "#3a3f50")
		rect(x_2, y, tr.get("w"), 3, "#6a7090")
		k = 8
		while (k < (tr.get("w") - 10)):
			rect((x_2 + k), (y + 6), 10, 8, "#ffe9a8")
			k += 16
		rect(x_2, (y + 18), tr.get("w"), 2, "#ff3d6e")
		nose = (((x_2 + tr.get("w")) - 6) if (tr.get("vx", NAN) > 0) else x_2)
		rect(nose, (y + 4), 6, 18, "#22263a")
		rect((nose + (3 if (tr.get("vx", NAN) > 0) else 1)), (y + 8), 2, 4, "#ffd23f")
	_a = st.get("trg")
	for _i_3 in range(_len(_a)):
		if _i_3 >= _len(_a): break
		r = _a[_i_3]
		if ((r.get("s") == 1) and (int((int(t) >> int(3))) & int(1))):
			txt("<< TREN", (W - 46), (GY - 24), "#ffd23f")
			txt("¡SUBE!", (W / 2.0), 70, "#ffd23f", "c")
	if (((boss and (boss.get("kind") == 2)) and (boss.get("act") == "train")) and (boss.get("actT", NAN) > 0)):
		sx = ((ax + 4) if (boss.get("side", NAN) < 0) else ((ax + W) - 20))
		if (int((int(t) >> int(3))) & int(1)):
			txt((">>" if (boss.get("side", NAN) < 0) else "<<"), sx, (GY - 22), "#ffd23f")
			txt("SUBE", (ax + (W / 2.0)), 70, "#ffd23f", "c")

# L2839
func drawPlayer():
	var legs = null
	var x = null
	var y = null
	var pst = null
	var gx = null
	var mx = null
	var my = null
	var gh = null
	for _i in range(_len(ghosts)):
		if _i >= _len(ghosts): break
		gh = ghosts[_i]
		spr(_concat(PB, [PL.get("air")]), PP, ((gh.get("x") - 2) - cam), gh.get("y"), (gh.get("f", NAN) < 0), true, ((gh.get("l")) / 30.0))
	if p.get("dead"):
		return
	if (((p.get("inv", NAN) > 0) and (not (p.get("dash")))) and (int((int(p.get("inv")) >> int(2))) & int(1))):
		return
	legs = ((_ix([PL.get("r1"), PL.get("st"), PL.get("r2"), PL.get("st")], fmod(int(p.get("anim")), 4)) if p.get("vx") else PL.get("st")) if p.get("ground") else PL.get("air"))
	x = ((p.get("x") - 2) - cam)
	y = (p.get("y") - 0)
	shadow((p.get("x") - cam), p.get("x"), p.get("y"), p.get("w"), p.get("h"))
	light(((p.get("x") - cam) + ((p.get("w")) / 2.0)), (p.get("y") + ((p.get("h")) / 2.0)), (30 if p.get("dash") else 20), 0.8, "#9fd2ff")
	pst = ("dash" if p.get("dash") else (("jump" if (p.get("vy", NAN) < 0) else "fall") if (not (p.get("ground"))) else ("aimu" if p.get("aimU") else ("run" if p.get("vx") else "idle"))))
	if ((not (blit(lookSheet(pst), int(p.get("anim")), (p.get("x") - cam), p.get("y"), p.get("w"), p.get("h"), (p.get("face", NAN) < 0), false))) and (not (blit("p_idle", int(p.get("anim")), (p.get("x") - cam), p.get("y"), p.get("w"), p.get("h"), (p.get("face", NAN) < 0), false)))):
		spr(_concat((PBU if p.get("aimU") else PB), [legs]), PP, x, y, (p.get("face", NAN) < 0), false)
	if p.get("aimU"):
		gx = (_round(x) + (8 if (p.get("face", NAN) > 0) else 3))
		rect(gx, (y + 3), 1, 4, "#c8ccd8")
	if (p.get("mf", NAN) > 0):
		if ((((p.get("aimU") and (not (K.get("ArrowLeft")))) and (not (K.get("ArrowRight")))) and (not (TS.get("L")))) and (not (TS.get("R")))):
			mx = (_round(x) + (7 if (p.get("face", NAN) > 0) else 2))
			my = (_round(y) - 1)
		else:
			mx = (_round(x) + (12 if (p.get("face", NAN) > 0) else -4))
			my = (_round(y) + 6)
		rect(mx, my, 4, 3, _ix(WPN, run.get("wpn")).get("c"))
		rect((mx + 1), (my + 1), 2, 1, "#fff")
		light((mx + 2), (my + 1), 18, 1, _ix(WPN, run.get("wpn")).get("c"))

# L2859
func drawTitleHero():
	var hx = null
	var hy = null
	var fr = null
	var mx = null
	var my = null
	hx = _round((W * 0.13))
	hy = (GY - p.get("h"))
	fr = int((t / 7.0))
	shadow(hx, (hx + cam), hy, p.get("w"), p.get("h"))
	light((hx + ((p.get("w")) / 2.0)), (hy + ((p.get("h")) / 2.0)), 28, 0.9, "#3de8ff")
	if (not (blit(lookSheet("run"), fr, hx, hy, p.get("w"), p.get("h"), false, false))):
		blit("p_idle", fr, hx, hy, p.get("w"), p.get("h"), false, false)
	if (fmod(t, 150) < 10):
		mx = ((hx + p.get("w")) + 1)
		my = (hy + 6)
		rect(mx, my, 4, 3, "#ffd23f")
		rect((mx + 1), (my + 1), 2, 1, "#fff")
		light((mx + 2), (my + 1), 20, 1, "#ffd23f")

# L2868
func heart(x = null, y = null, full = null, c = null):
	var col = null
	col = ((c if c else "#ff3d6e") if full else "#3a2030")
	rect((x + 1), y, 2, 1, col)
	rect((x + 4), y, 2, 1, col)
	rect(x, (y + 1), 7, 2, col)
	rect((x + 1), (y + 3), 5, 1, col)
	rect((x + 2), (y + 4), 3, 1, col)
	rect((x + 3), (y + 5), 1, 1, col)

# L2869
func drawHUD():
	var gr = null
	var i = null
	var wc = null
	var bx = null
	var full = null
	var HR = null
	var thx = null
	var tsx = null
	var tcx = null
	var tgap = null
	var cw = null
	var bw = null
	var bxx = null
	var bn = null
	var lb = null
	var tips = null
	var k = null
	var lt = null
	var ln = null
	var tw = null
	var q = null
	var ty = null
	gr = g.createLinearGradient(0, 0, 0, 30)
	gr.addColorStop(0, "rgba(6,7,13,.85)")
	gr.addColorStop(1, "rgba(6,7,13,0)")
	g.fillStyle = gr
	g.fillRect(0, 0, HW, 30)
	i = 0
	while (i < run.get("maxHp", NAN)):
		heart((5 + (i * 9)), 4, (i < p.get("hp", NAN)))
		i += 1
	txt("x" + str(max(0, run.get("lives"))), 5, 13, "#eef3ff")
	wc = _ix(WPN, run.get("wpn")).get("c")
	rect(29, 12, 10, 10, wc)
	txt(run.get("wpn"), 30, 13, "#06070d")
	i = 0
	while (i < 3):
		rect(41, (13 + (i * 3)), 3, 2, (wc if (run.get("lv", NAN) >= (3 - i)) else "#2a2e48"))
		i += 1
	bx = 50
	full = (run.get("bass", NAN) >= 100)
	rect(bx, 14, 46, 6, "#06070d")
	rect((bx + 1), 15, 44, 4, "#2a1a10")
	rect((bx + 1), 15, _round(((44 * run.get("bass")) / 100.0)), 4, (("#fff" if (int((int(t) >> int(3))) & int(1)) else "#ffd23f") if full else "#c08a20"))
	rect((bx + 48), 15, 4, 4, ("#1d3a2a" if (p.get("dashCd", NAN) > 0) else "#4dff88"))
	if (full and (not (int(t) & int(32)))):
		txt(("¡BASS!" if touchMode() else "V: BASS"), (bx + 56), 13, "#ffd23f")
	HR = ((HW - 5) - HUDR)
	txt(pad(run.get("score"), 7), HR, 4, "#ffd23f", "r")
	g.font = "8px \"Press Start 2P\", monospace"
	thx = (5 + (run.get("maxHp") * 9))
	tsx = (HR - g.measureText(pad(run.get("score"), 7)).get("width"))
	tcx = ((thx + tsx) / 2.0)
	tgap = ((tsx - thx) - 6)
	cw = g.measureText("" + str(run.get("coins"))).get("width")
	rect(((HR - 7) - cw), 13, 6, 6, "#ffd23f")
	rect(((HR - 5) - cw), 15, 2, 2, "#06070d")
	txt("" + str(run.get("coins")), HR, 13, "#ffd23f", "r")
	if (boss and boss.get("on")):
		bw = min(120, (HW - 48))
		bxx = ((HW / 2.0) - (bw / 2.0))
		bn = st.L.get("boss")
		while ((_len(bn) > 3) and (g.measureText(bn).get("width", NAN) > tgap)):
			bn = _slice(bn, 0, -1)
		txt(bn, tcx, 4, ("#ff8aa6" if (boss.get("ph", NAN) > 1) else "#eef3ff"), "c")
		rect((bxx - 1), 14, (bw + 2), 7, "#000")
		rect(bxx, 15, bw, 5, "#3a0a18")
		rect(bxx, 15, max(0, _round(((bw * boss.get("hp")) / float(boss.get("max"))))), 5, ("#fff" if (boss.get("fl", NAN) > 0) else "#ff3d6e"))
		if (boss.get("kind") == 3):
			rect((bxx + (bw * 0.33)), 15, 1, 5, "#000")
			rect((bxx + (bw * 0.66)), 15, 1, 5, "#000")
		else:
			rect((bxx + (bw * (0.75 if boss.get("mk") else 0.5))), 15, 1, 5, "#000")
		if (run.get("mult", NAN) > 1):
			txt("x" + str(run.get("mult")), ((bxx + bw) + 6), 13, "#3de8ff")
	else:
		lb = "FASE " + str((st.get("i") + 1)) + " " + str(st.L.get("name"))
		if (g.measureText(lb).get("width", NAN) > tgap):
			lb = "F" + str((st.get("i") + 1)) + " " + str(st.L.get("name"))
		if (g.measureText(lb).get("width", NAN) > tgap):
			lb = st.L.get("name")
		if (g.measureText(lb).get("width", NAN) > tgap):
			lb = "FASE " + str((st.get("i") + 1))
		txt(lb, tcx, 4, "#8f98c8", "c")
		if (run.get("mult", NAN) > 1):
			txt("COMBO x" + str(run.get("mult")), (HW / 2.0), 13, "#3de8ff", "c")
	if ((((st.get("i") == 0) and (not (SET.get("tut")))) and (not (st.get("lock")))) and (st.get("t", NAN) > 150)):
		tips = (["ARRASTRA EN LA IZQUIERDA PARA MOVERTE", "TOCA SALTO DOS VECES = DOBLE SALTO", ("DISPARA SOLO AL VER ENEMIGOS" if autoFire() else "MANTÉN FUEGO PARA DISPARAR"), "MANTÉN SALTO: DASH, ATRAVIESA BALAS", "BARRA LLENA: PULSA BASS"] if touchMode() else ["FLECHAS: MOVERTE", "Z / ESPACIO: SALTO (DOBLE EN EL AIRE)", "X: DISPARO (MANTÉN PULSADO)", "C: DASH, ESQUIVA LAS BALAS", "V: BASS DROP CON LA BARRA LLENA"])
		k = floori(((st.get("t") - 150) / 260.0))
		if (k < _len(tips)):
			lt = fmod((st.get("t") - 150), 260)
			g.globalAlpha = ((lt / 20.0) if (lt < 20) else (((260 - lt) / 20.0) if (lt > 240) else 1))
			ln = j_wrap(_ix(tips, k), (HW - 24))
			tw = 0
			q = 0
			while (q < _len(ln)):
				tw = max(tw, g.measureText(_ix(ln, q)).get("width"))
				q += 1
			ty = (58 if banner else 32)
			rect((((HW / 2.0) - (tw / 2.0)) - 6), ty, (tw + 12), (6 + (9 * _len(ln))), "rgba(6,7,13,.75)")
			q = 0
			while (q < _len(ln)):
				txt(_ix(ln, q), (HW / 2.0), ((ty + 3) + (q * 9)), "#eef3ff", "c")
				q += 1
			g.globalAlpha = 1

# L2905
func draw():
	var hc = null
	var hs0 = null
	var bl = null
	var by = null
	var bq = null
	var k = null
	var x = null
	var y = null
	var w = null
	var c = null
	var e = null
	var b = null
	var x_2 = null
	var y_2 = null
	var c_2 = null
	var q = null
	var x_3 = null
	var y_3 = null
	var r = null
	var a = null
	var o = null
	g.save()
	g.setTransform(SC, 0, 0, SC, 0, (-(_round(camY)) * SC))
	if (sh > 0):
		g.translate(int(((_rnd() * 4) - 2)), int(((_rnd() * 4) - 2)))
	if (not st):
		rect(0, camY, W, H, "#06070d")
		g.restore()
		return
	drawBG()
	drawTiles()
	for _i in range(_len(pickups)):
		if _i >= _len(pickups): break
		k = pickups[_i]
		x = null
		y = null
		w = null
		c = null
		x = _round((k.get("x") - cam))
		y = _round((k.get("y") + ((sin(((t * 0.08) + k.get("x"))) * 1.5) if k.get("stat") else 0)))
		if (((k.get("l", NAN) > 0) and (k.get("l", NAN) < 100)) and (int((int(k.get("l")) >> int(3))) & int(1))):
			continue
		shadow(x, k.get("x"), k.get("y"), k.get("w"), k.get("h"))
		light((x + ((k.get("w")) / 2.0)), (y + ((k.get("h")) / 2.0)), (10 if (k.get("type") == "coin") else 14), 0.75, ("#ffd23f" if (k.get("type") == "coin") else ("#ff3d6e" if (k.get("type") == "hp") else _ix(WPN, k.get("wt")).get("c"))))
		if blit(("i_coin" if (k.get("type") == "coin") else ("i_hp" if (k.get("type") == "hp") else "i_" + str(k.get("wt")))), (int(t) >> int(3)), x, y, k.get("w"), k.get("h"), false, false):
			continue
		if (k.get("type") == "coin"):
			w = _ix([8, 6, 2, 6], fmod((int(t) >> int(3)), 4))
			rect(((x + 4) - (w / 2.0)), y, w, 8, "#15151c")
			if (w > 2):
				rect((((x + 4) - (w / 2.0)) + 1), (y + 1), (w - 2), 6, "#2a2a34")
				rect((x + 3), (y + 3), 2, 2, "#ffd23f")
		elif (k.get("type") == "hp"):
			heart(x, (y + 1), 1)
		else:
			c = _ix(WPN, k.get("wt")).get("c")
			rect(x, y, 10, 10, c)
			rect((x + 1), (y + 1), 8, 8, "#06070d")
			txt(k.get("wt"), (x + 1), (y + 1), c)
	for _i_2 in range(_len(enemies)):
		if _i_2 >= _len(enemies): break
		e = enemies[_i_2]
		if (((not (e.get("dead"))) and (e.get("x", NAN) > (cam - 20))) and (e.get("x", NAN) < ((cam + W) + 20))):
			drawEnemy(e)
	if boss:
		drawBoss(boss)
	drawHazards()
	drawBooms()
	if (mode != "menu"):
		drawPlayer()
	else:
		drawTitleHero()
	for _i_3 in range(_len(bullets)):
		if _i_3 >= _len(bullets): break
		b = bullets[_i_3]
		x_2 = null
		y_2 = null
		c_2 = null
		x_2 = _round((b.get("x") - cam))
		y_2 = _round(b.get("y"))
		c_2 = _ix(WPN, b.get("w")).get("c")
		if (b.get("w") == "L"):
			g.strokeStyle = c_2
			g.lineWidth = 2
			g.beginPath()
			g.moveTo(x_2, y_2)
			g.lineTo((x_2 - (b.get("vx") * 1.6)), (y_2 - (b.get("vy") * 1.6)))
			g.stroke()
			rect((x_2 - 1), (y_2 - 1), 2, 2, "#fff")
		elif (b.get("w") == "H"):
			rect((x_2 - 1), (y_2 - 2), 3, 3, c_2)
			rect((x_2 + 1), (y_2 - 5), 1, 4, c_2)
		else:
			rect((x_2 - 2), (y_2 - 1), 4, 3, c_2)
			rect((x_2 - 1), y_2, 2, 1, "#fff")
		light(x_2, y_2, (14 if (b.get("w") == "L") else 10), 0.6, c_2)
	for _i_4 in range(_len(ebul)):
		if _i_4 >= _len(ebul): break
		q = ebul[_i_4]
		x_3 = null
		y_3 = null
		r = null
		x_3 = _round((q.get("x") - cam))
		y_3 = _round(q.get("y"))
		r = q.get("r")
		rect((x_3 - r), ((y_3 - r) + 1), (r * 2), ((r * 2) - 2), q.get("c"))
		rect(((x_3 - r) + 1), (y_3 - r), ((r * 2) - 2), (r * 2), q.get("c"))
		rect((x_3 - 1), (y_3 - 1), 2, 2, "#fff")
		light(x_3, y_3, (8 + (r * 2)), 0.55, q.get("c"))
	for _i_5 in range(_len(parts)):
		if _i_5 >= _len(parts): break
		a = parts[_i_5]
		rect((a.get("x") - cam), a.get("y"), (2 if (a.get("l", NAN) > 8) else 1), (2 if (a.get("l", NAN) > 8) else 1), a.get("c"))
	if ring:
		g.strokeStyle = "#ffd23f"
		g.lineWidth = 4
		g.globalAlpha = max(0, (1 - ((ring.get("r")) / 360.0)))
		g.beginPath()
		g.arc((ring.get("x") - cam), ring.get("y"), ring.get("r"), 0, 6.283)
		g.stroke()
		g.strokeStyle = "#4dff88"
		g.lineWidth = 2
		g.beginPath()
		g.arc((ring.get("x") - cam), ring.get("y"), (ring.get("r") * 0.8), 0, 6.283)
		g.stroke()
		g.globalAlpha = 1
		light((ring.get("x") - cam), ring.get("y"), min(72, (20 + (ring.get("r") * 0.5))), max(0, (1 - ((ring.get("r")) / 360.0))), "#ffd23f")
	for _i_6 in range(_len(pops)):
		if _i_6 >= _len(pops): break
		o = pops[_i_6]
		txt(o.get("s"), (o.get("x") - cam), o.get("y"), o.get("c"))
	g.restore()
	drawLight()
	if (mode == "menu"):
		return
	if (mode == "cut"):
		hc = HS
		cutQ()
		HS = (HS * UIF)
		HW = _round((W / float(HS)))
		HH = _round((H / float(HS)))
		drawCut()
		HS = hc
		HW = _round((W / float(HS)))
		HH = _round((H / float(HS)))
		return
	hs0 = HS
	HS = (HS * UIF)
	HW = _round((W / float(HS)))
	HH = _round((H / float(HS)))
	g.save()
	g.setTransform((SC * HS), 0, 0, (SC * HS), 0, 0)
	drawHUD()
	if banner:
		g.globalAlpha = (((banner.get("l")) / 20.0) if (banner.get("l", NAN) < 20) else min(1, (((170 - banner.get("l")) / 10.0) + 0.2)))
		bl = j_wrap(banner.get("b"), (HW - 16))
		by = (33 if banner.get("a") else 24)
		rect(0, 22, HW, ((13 if banner.get("a") else 4) + (9 * _len(bl))), "rgba(6,7,13,.72)")
		if banner.get("a"):
			txt(banner.get("a"), (HW / 2.0), 24, ("#ff3d6e" if banner.get("boss") else "#3de8ff"), "c")
		bq = 0
		while (bq < _len(bl)):
			txt(_ix(bl, bq), (HW / 2.0), (by + (bq * 9)), "#ffd23f", "c")
			bq += 1
		g.globalAlpha = 1
	if (flash > 0):
		g.globalAlpha = (flash / 24.0)
		rect(0, 0, HW, HH, flashC)
		g.globalAlpha = 1
	if ((p.get("dead") and (run.get("lives", NAN) > 0)) and (p.get("deadT", NAN) < 60)):
		txt("VIDAS: " + str(run.get("lives")), (HW / 2.0), (HH * 0.55), "#eef3ff", "c")
	g.restore()
	HS = hs0
	HW = _round((W / float(HS)))
	HH = _round((H / float(HS)))

