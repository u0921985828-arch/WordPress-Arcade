class_name TouchPad
extends Control
## Mandos tactiles (lo que en la web es #touch, #stick, #btns y #tp), solo con
## el movil tumbado, que es como va la app. Misma colocacion que la web:
## - palanca flotante en el 42 % izquierdo y el 72 % de abajo: la base aparece
##   donde se apoya el pulgar y le sigue si se pasa del radio;
## - columna derecha con SALTO (mantener = dash), FUEGO y BASS colocados por
##   alcance del pulgar (placePad de la web, ESTUDIO-CONTROLES.md); toda la
##   columna responde y gana el boton mas cercano (SALTO con ventaja);
## - pausa arriba a la derecha.
## En cinematica, tocar avanza y tocar arriba a la derecha la salta.
## Todas las medidas de la web van en px CSS: aqui se multiplican por k (_dpr).

var game: Game
var k := 1.0
var bt := 68.0
var zone := Rect2()          # columna de botones
var stick_zone := Rect2()
var tp := Rect2()            # boton de pausa
var pads := {}               # j/f/bs -> {c: Vector2, r: float}
var rest := Vector2()        # sitio de la palanca en reposo
var base := Vector2()
var knob := Vector2()
var stick_id := -1
var own := {}                # indice del dedo -> j/f/bs
var _key := ""

const KEYS := {"j": "JD", "f": "F", "bs": "B"}
const LBL := {"j": "SALTO", "f": "FUEGO", "bs": "BASS"}
const C_PANEL := Color("#121730")
const C_LINE := Color("#3a4680")
const C_INK := Color("#eef3ff")


func _init(g: Game) -> void:
	game = g
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_preset(Control.PRESET_FULL_RECT)


func ingame() -> bool:
	return game.touchMode() and (game.mode == "play" or game.mode == "pause")


## Recoloca todo (al cambiar el tamano, la escala o la opcion de botones grandes).
func layout() -> void:
	var vs: Vector2 = game.view_size
	if vs.x <= 0:
		return
	k = game._dpr()
	bt = (84.0 if game._truthy(game.SET.get("big")) else 68.0) * k
	var sal: float = game.safe.position.x
	var sar: float = vs.x - game.safe.end.x
	var ts := 44.0 * k
	tp = Rect2(vs.x - 8.0 * k - sar - ts, 8.0 * k, ts, ts)
	stick_zone = Rect2(0, vs.y * 0.28, vs.x * 0.42, vs.y * 0.72)
	rest = Vector2(bt * 1.1 + sal, vs.y - bt * 1.1)
	if stick_id < 0:
		base = rest
		knob = rest
	var x1 := vs.x - 4.0 * k - sar
	var x0 := maxf(vs.x * 0.55, x1 - roundf(bt * 2.35))
	var y0 := 60.0 * k
	var y1 := vs.y - 6.0 * k
	zone = Rect2(x0, y0, x1 - x0, y1 - y0)
	_place(x0, y0, x1, y1)
	_hudr()


## placePad() de la web: SALTO en el centro del arco comodo del pulgar,
## FUEGO y BASS en el mismo arco a su lado sin pisarse.
func _place(x0: float, y0: float, x1: float, y1: float) -> void:
	var MM := 6.3 * k
	var piv := Vector2(game.view_size.x + 5.0 * MM, game.view_size.y + 5.0 * MM)
	var sz := {"j": roundf(bt * 1.2), "f": bt, "bs": bt}
	var st := maxf(2.0, roundf(4.0 * k))
	pads = {}
	var comfort := func(d: float) -> float:
		d /= MM
		if d < 20 or d > 62:
			return 0.0
		if d < 32:
			return (d - 20) / 12.0
		if d > 48:
			return (62 - d) / 14.0
		return 1.0
	for key in ["j", "f", "bs"]:
		var r: float = sz[key] / 2.0
		var best := -1e9
		var bp := Vector2((x0 + x1) / 2.0, (y0 + y1) / 2.0)
		var y := y0 + r
		while y <= y1 - r:
			var x := x0 + r
			while x <= x1 - r:
				var v := 0.0
				var d := piv.distance_to(Vector2(x, y))
				if key == "j":
					var a := rad_to_deg(atan2(piv.y - y, piv.x - x))
					v = comfort.call(d) - 0.004 * absf(a - 45.0)
				else:
					var ok := true
					for q in pads:
						if Vector2(x, y).distance_to(pads[q].c) < r + pads[q].r + 12.0 * k:
							ok = false
							break
					if not ok:
						x += st
						continue
					v = comfort.call(d) - 0.01 * Vector2(x, y).distance_to(pads.j.c) / MM
				if v > best:
					best = v
					bp = Vector2(x, y)
				x += st
			y += st
		pads[key] = {"c": bp, "r": r}


## El marcador se aparta del boton de pausa (HUDR, en px del HUD).
func _hudr() -> void:
	var z: float = game.ZOOM
	var cr := Rect2(game.origin, Vector2(game.cv.width, game.cv.height) * z)
	var over := cr.end.x - tp.position.x + 4.0 * k
	game.HUDR = maxi(0, ceili(over / z / (game.SC * game.HS * game.UIF))) if over > 0 else 0


func _pick(p: Vector2) -> String:
	var bk := ""
	var bv := 1e9
	for key in pads:
		var v: float = p.distance_to(pads[key].c) - pads[key].r - (14.0 * k if key == "j" else 0.0)
		if v < bv:
			bv = v
			bk = key
	return bk


func release_all() -> void:
	for i in own:
		game.btnUp(KEYS[own[i]], false)
	own.clear()
	_stick_reset()


func _stick_reset() -> void:
	stick_id = -1
	game.TS.L = 0
	game.TS.R = 0
	game.TS.U = 0
	game.TS.D = 0
	base = rest
	knob = rest


func _input(e: InputEvent) -> void:
	if game == null:
		return
	if game.mode == "cut":
		var at := Vector2(-1, -1)
		if e is InputEventScreenTouch and e.pressed:
			at = e.position
		elif e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT and e.device != InputEvent.DEVICE_ID_EMULATION:
			at = e.position
		if at.x >= 0:
			game.audioOn()
			var cr := Rect2(game.origin, Vector2(game.cv.width, game.cv.height) * game.ZOOM)
			if at.x > cr.position.x + cr.size.x * 0.7 and at.y < cr.position.y + cr.size.y * 0.2:
				game.cutSkip()
			else:
				game.cutAdv()
			get_viewport().set_input_as_handled()
		return
	if not (e is InputEventScreenTouch or e is InputEventScreenDrag):
		return
	if game.mode != "play" or not game.touchMode():
		if own.size() or stick_id >= 0:
			release_all()
		return
	var pos: Vector2 = e.position
	if e is InputEventScreenTouch:
		if e.pressed:
			if tp.grow(6.0 * k).has_point(pos):
				game.audioOn()
				game.buzz(8)
				game.pause()
				release_all()
			elif zone.has_point(pos):
				var key := _pick(pos)
				if key != "":
					own[e.index] = key
					game.btnDown(KEYS[key])
			elif stick_id < 0 and stick_zone.has_point(pos):
				game.audioOn()
				stick_id = e.index
				base = pos
				knob = pos
			else:
				return
		else:
			if own.has(e.index):
				game.btnUp(KEYS[own[e.index]], not e.canceled)
				own.erase(e.index)
			elif e.index == stick_id:
				_stick_reset()
			else:
				return
		get_viewport().set_input_as_handled()
		queue_redraw()
	elif e is InputEventScreenDrag and e.index == stick_id:
		var d := pos - base
		var mx := minf(56.0 * k, bt * 1.7 / 2.0)
		var l := d.length()
		if l > mx:
			base += d * (1.0 - mx / l)
			d = pos - base
		knob = base + d
		game.TS.L = 1 if d.x < -12.0 * k else 0
		game.TS.R = 1 if d.x > 12.0 * k else 0
		game.TS.U = 1 if d.y < -24.0 * k else 0
		game.TS.D = 1 if d.y > 26.0 * k else 0
		get_viewport().set_input_as_handled()
		queue_redraw()


func _process(_dt: float) -> void:
	var on := ingame()
	if on != visible:
		visible = on
		if not on:
			release_all()
	var key := "%s|%s|%s|%s" % [game.view_size, game._dpr(), game.SET.get("big"), game.safe]
	if key != _key:
		_key = key
		layout()
	if visible:
		queue_redraw()


func _ring(c: Vector2, r: float, fill: Color, line: Color, w: float, dashed := false) -> void:
	draw_circle(c, r, fill)
	if dashed:
		var n := 16
		for i in n:
			if i % 2 == 0:
				draw_arc(c, r - w / 2.0, TAU * i / n, TAU * (i + 1) / n, 6, line, w, true)
	else:
		draw_arc(c, r - w / 2.0, 0, TAU, 48, line, w, true)


func _label(s: String, c: Vector2, size: float, col: Color) -> void:
	var f := Ctx.get_font()
	var sz := int(round(size))
	var w := f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, sz).x
	draw_string(f, Vector2(c.x - w / 2.0, c.y + f.get_ascent(sz) / 2.0 - 1), s, HORIZONTAL_ALIGNMENT_LEFT, -1, sz, col)


func _draw() -> void:
	if not visible:
		return
	var play: bool = game.mode == "play"
	# palanca
	var a := 1.0 if stick_id >= 0 else 0.35
	var br := bt * 1.7 / 2.0
	_ring(base, br, Color(C_PANEL, 0.53 * a), Color(C_LINE, a), 2.0 * k)
	_ring(knob, bt * 0.4, Color(C_LINE, a), Color(Color("#3de8ff"), a), 2.0 * k)
	# botones
	var bass_full: bool = game.run != null and game.run.get("bass", 0) >= 100
	for key in pads:
		var q: Dictionary = pads[key]
		var pressed := false
		for i in own:
			if own[i] == key:
				pressed = true
		var fill := C_PANEL
		var line := C_LINE
		var r: float = q.r
		if key == "j":
			fill = Color("#0f2c36")
			line = Color("#3de8ff")
			if game.jd.dash:
				fill = Color("#12361f")
				line = Color("#4dff88")
		elif key == "f":
			line = Color("#ff3d6e")
		elif key == "bs":
			line = Color("#ffd23f")
			if bass_full:
				fill = Color("#4a3a08")
				for gi in 3:
					draw_circle(q.c, r + (4 + gi * 5) * k, Color(1, 0.82, 0.25, 0.10))
		if pressed:
			fill = C_LINE
			r *= 0.94
		var al := 0.5
		_ring(q.c, r, Color(fill, al), Color(line, al), 3.0 * k, key == "f" and game.autoFire())
		if key == "j":
			_label(LBL[key], q.c - Vector2(0, 5.0 * k), 11.0 * k, Color(C_INK, al))
			_label("MANTÉN", q.c + Vector2(0, 7.0 * k), 6.0 * k, Color(Color("#4dff88"), al * 0.9))
			_label("DASH", q.c + Vector2(0, 15.0 * k), 6.0 * k, Color(Color("#4dff88"), al * 0.9))
		else:
			_label(LBL[key], q.c, 10.0 * k, Color(C_INK, al))
	# pausa
	if play:
		var tr := tp
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(C_PANEL, 0.7)
		sb.border_color = Color(C_LINE, 0.7)
		sb.set_border_width_all(int(round(3.0 * k)))
		sb.set_corner_radius_all(int(round(8.0 * k)))
		draw_style_box(sb, tr)
		_label("II", tr.get_center(), 11.0 * k, Color(C_INK, 0.7))
