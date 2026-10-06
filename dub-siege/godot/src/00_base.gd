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
var STORE := "user://dub-siege.json"   # pruebas: se cambia de fichero
var web_db := ""                       # pruebas: base LevelDB a importar
var web_imported := 0                  # claves traidas de la app antigua


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
		return
	# Primera vez: partidas de la app antigua (web en WebView), si las hay.
	var dirs: Array = [web_db] if web_db != "" else (WebSaves.android_dirs() if OS.get_name() == "Android" else [])
	for d in dirs:
		var got: Dictionary = WebSaves.read(d) if web_db != "" else WebSaves.read_android(d)
		if not got.is_empty():
			_store = got
			web_imported = got.size()
			print("Dub Siege: %d datos importados de la app anterior" % web_imported)
			_store_write()
			break


func save(k: Variant = null, v: Variant = null) -> void:
	_store_load()
	_store[str(k)] = JSON.stringify(v)
	_store_write()


func _store_write() -> void:
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


## Partida de antes de las ranuras (solo ds2_prog): pasa a las primeras
## ranuras con lo mismo que daba el viejo CONTINUAR FASE N (30 discos por fase
## saltada). Igual que slotMig() de la web; importa con partidas traídas de
## una app antigua.
func slotMig() -> void:
	_store_load()
	if _store.has("ds2_slots"):
		return
	var a := []
	var d0 = SET.get("diff")
	var r0 = run
	var D0 = D
	for d in 3:
		var x = float(_num(PROG[d])) if PROG is Array and d < PROG.size() else 0.0
		var n := int(x) if is_finite(x) else 0
		if n > 0 and n < LEVELS.size():
			SET["diff"] = d
			newRun()
			run["coins"] = n * 30
			run["stage"] = n
			a.append({"v": 1, "diff": d, "stage": n, "at": "play", "run": run, "ts": _now()})
	SET["diff"] = d0
	run = r0
	D = D0
	if not a.is_empty():
		while a.size() < int(NSL):
			a.append(null)
		save("ds2_slots", a)
		save("ds2_last", 0)


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
