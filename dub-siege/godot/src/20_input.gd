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
var jd := {"on": 0, "tm": 0, "dash": 0, "hold": 0, "air": 0}

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
		"I": _any([K.get("KeyE"), TS.get("I"), GP.get("I")]),
	}
	for k in ["J", "DA", "B", "I"]:
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
		"B": bt.call(JOY_BUTTON_Y), "I": bt.call(JOY_BUTTON_LEFT_SHOULDER)}
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
	jd.air = 0
	# En el aire con el doble salto disponible salta al momento (ver el HTML).
	if mode == "play" and p is Dictionary and not _truthy(p.get("ground")) and float(p.get("coyote", 0)) <= 0 and int(p.get("jumps", 0)) < 2 and not _truthy(p.get("dash")):
		jd.air = 1
		LATCH.J = 1
		TS.J = 1
		jd.hold = 0
		return
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
	if jd.air:
		jd.air = 0
		TS.J = 0
		return
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
	if not _truthy(TS.get(c)) and (c == "J" or c == "DA" or c == "B" or c == "I"):
		LATCH[c] = 1
	TS[c] = 1


func btnUp(c: String, real: bool) -> void:
	if c == "JD":
		jdUp(real)
		return
	TS[c] = 0


func placePad() -> void:
	pass
