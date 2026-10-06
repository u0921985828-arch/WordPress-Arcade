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


func VW() -> float:
	return view_size.x


func VH() -> float:
	return view_size.y


## Escala entera mas grande que deja ver al menos HMIN de alto (ver fitW en el
## HTML). Aqui la ventana ya esta en pixeles reales, sin dpr ni margenes CSS.
func fitW() -> void:
	var dw := maxf(64.0, safe.size.x)
	var dh := maxf(64.0, safe.size.y)
	var wmin := 160 if touch_ui else 192
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
		f = clampf(VH() / 240.0 / _dpr(), 1.5, 3.6) * _dpr() / (SC * HS * cp)
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
