class_name Ctx
extends RefCounted
## Lienzo 2D al estilo del <canvas> del navegador, para que el codigo de dibujo
## traducido de dub-siege.html se lea igual que el original (g.fillStyle,
## g.fillRect, g.drawImage, save/restore, setTransform...).
##
## Todo se pinta con el RenderingServer en "tramos": hijos del nodo del juego
## que se dibujan en orden. Un tramo nuevo empieza cuando cambia el recorte
## (clip), el modo de mezcla ('lighter' = aditivo) o el sombreado (blanco del
## destello). Las coordenadas que llegan a los tramos son pixeles del lienzo
## (cv.width x cv.height); el nodo padre aplica el zoom entero y el centrado.

var fillStyle: Variant = "#000"
var strokeStyle: Variant = "#000"
var lineWidth := 1.0
var globalAlpha := 1.0
var globalCompositeOperation := "source-over"
var font := "8px \"Press Start 2P\", monospace"
var textBaseline := "top"
var textAlign := "left"
var imageSmoothingEnabled := false
var filter := "none"

var _T := Transform2D.IDENTITY
var _stack: Array = []
var _clip: Variant = null          # Rect2 en pixeles del lienzo, o null
var _path: Array = []              # subtrazos: {k:'r', r:Rect2} | {k:'p', pts:PackedVector2Array, closed}
var _cur: PackedVector2Array = PackedVector2Array()

var _root: RID
var _segs: Array[RID] = []
var _si := -1
var _seg_clip: Variant = null
var _seg_mat := 0                  # 0 normal, 1 aditivo, 2 blanco
var _mats: Array = []

static var _colors := {}
static var _font: FontFile = null


func _init(root: RID) -> void:
	_root = root
	var add := CanvasItemMaterial.new()
	add.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	var white := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = "shader_type canvas_item;\nvoid fragment(){ float a = texture(TEXTURE, UV).a; COLOR = vec4(1.0, 1.0, 1.0, a * COLOR.a); }"
	white.shader = sh
	_mats = [null, add, white]


static func get_font() -> FontFile:
	if _font == null:
		_font = load("res://godot/fonts/PressStart2P.woff2")
	return _font


## Se llama al empezar cada fotograma: vacia los tramos y deja el estado limpio.
func begin() -> void:
	for r in _segs:
		RenderingServer.canvas_item_clear(r)
		RenderingServer.canvas_item_set_visible(r, false)
	_si = -1
	_T = Transform2D.IDENTITY
	_stack.clear()
	_clip = null
	globalAlpha = 1.0
	globalCompositeOperation = "source-over"
	fillStyle = "#000"
	strokeStyle = "#000"
	lineWidth = 1.0
	_new_seg(null, 0)


func _new_seg(clip: Variant, mat: int) -> void:
	_si += 1
	if _si >= _segs.size():
		var r := RenderingServer.canvas_item_create()
		RenderingServer.canvas_item_set_parent(r, _root)
		RenderingServer.canvas_item_set_default_texture_filter(r, RenderingServer.CANVAS_ITEM_TEXTURE_FILTER_NEAREST)
		_segs.append(r)
	var rid := _segs[_si]
	RenderingServer.canvas_item_set_visible(rid, true)
	RenderingServer.canvas_item_set_draw_index(rid, _si)
	if clip != null:
		RenderingServer.canvas_item_set_custom_rect(rid, true, clip)
		RenderingServer.canvas_item_set_clip(rid, true)
	else:
		RenderingServer.canvas_item_set_custom_rect(rid, false)
		RenderingServer.canvas_item_set_clip(rid, false)
	var m = _mats[mat]
	RenderingServer.canvas_item_set_material(rid, m.get_rid() if m else RID())
	_seg_clip = clip
	_seg_mat = mat


func _seg(mat: int = -1) -> RID:
	if mat < 0:
		mat = 1 if globalCompositeOperation == "lighter" else 0
	if mat != _seg_mat or _clip != _seg_clip:
		_new_seg(_clip, mat)
	return _segs[_si]


# ---------------------------------------------------------------- colores
static func col(c: Variant) -> Color:
	if c is Color:
		return c
	if c == null:
		return Color(0, 0, 0, 0)
	var s: String = c
	if _colors.has(s):
		return _colors[s]
	var out := Color(0, 0, 0, 1)
	var t := s.strip_edges().to_lower()
	if t.begins_with("rgba(") or t.begins_with("rgb("):
		var inner := t.substr(t.find("(") + 1, t.rfind(")") - t.find("(") - 1)
		var p := inner.split(",")
		var a := 1.0
		if p.size() > 3:
			a = float(p[3])
		out = Color(float(p[0]) / 255.0, float(p[1]) / 255.0, float(p[2]) / 255.0, a)
	elif t.begins_with("#"):
		var h := t.substr(1)
		if h.length() == 3 or h.length() == 4:
			var e := ""
			for ch in h:
				e += ch + ch
			h = e
		out = Color.html(h)
	elif t == "transparent":
		out = Color(0, 0, 0, 0)
	else:
		out = Color.from_string(t, Color(0, 0, 0, 1))
	_colors[s] = out
	return out


func _fcol(st: Variant) -> Color:
	var c := col(st)
	c.a *= globalAlpha
	return c


# ---------------------------------------------------------------- transformada
func setTransform(a: float, b: float, c: float, d: float, e: float, f: float) -> void:
	_T = Transform2D(Vector2(a, b), Vector2(c, d), Vector2(e, f))


func translate(x: float, y: float) -> void:
	_T = _T.translated_local(Vector2(x, y))


func scale(x: float, y: float) -> void:
	_T = _T.scaled_local(Vector2(x, y))


func save() -> void:
	_stack.append([_T, fillStyle, strokeStyle, lineWidth, globalAlpha, globalCompositeOperation, _clip, font, textBaseline, textAlign])


func restore() -> void:
	if _stack.is_empty():
		return
	var s: Array = _stack.pop_back()
	_T = s[0]; fillStyle = s[1]; strokeStyle = s[2]; lineWidth = s[3]; globalAlpha = s[4]
	globalCompositeOperation = s[5]; _clip = s[6]; font = s[7]; textBaseline = s[8]; textAlign = s[9]


func _rect_dev(x: float, y: float, w: float, h: float) -> Rect2:
	var a := _T * Vector2(x, y)
	var b := _T * Vector2(x + w, y + h)
	return Rect2(minf(a.x, b.x), minf(a.y, b.y), absf(b.x - a.x), absf(b.y - a.y))


# ---------------------------------------------------------------- rectangulos
func fillRect(x: float, y: float, w: float, h: float) -> void:
	if w == 0 or h == 0:
		return
	var rid := _seg()
	if fillStyle is CtxGradient:
		_grad_rect(rid, x, y, w, h, fillStyle)
		return
	var c := _fcol(fillStyle)
	if c.a <= 0.0:
		return
	RenderingServer.canvas_item_add_rect(rid, _rect_dev(x, y, w, h), c)


func clearRect(_x: float, _y: float, _w: float, _h: float) -> void:
	pass


func _grad_rect(rid: RID, x: float, y: float, w: float, h: float, g: CtxGradient) -> void:
	# Degradado lineal: se parte en bandas entre parada y parada con color por vertice.
	var st := g.stops
	if st.is_empty():
		return
	var horiz := absf(g.x1 - g.x0) > absf(g.y1 - g.y0)
	var a0 := g.x0 if horiz else g.y0
	var a1 := g.x1 if horiz else g.y1
	var lo := x if horiz else y
	var hi := (x + w) if horiz else (y + h)
	var cuts := [lo]
	for s in st:
		var p: float = a0 + (a1 - a0) * s[0]
		if p > lo and p < hi:
			cuts.append(p)
	cuts.append(hi)
	cuts.sort()
	for i in range(cuts.size() - 1):
		var u0: float = cuts[i]
		var u1: float = cuts[i + 1]
		if u1 <= u0:
			continue
		var c0 := g.at((u0 - a0) / (a1 - a0) if a1 != a0 else 0.0)
		var c1 := g.at((u1 - a0) / (a1 - a0) if a1 != a0 else 0.0)
		c0.a *= globalAlpha
		c1.a *= globalAlpha
		var pts: PackedVector2Array
		var cs: PackedColorArray
		if horiz:
			pts = [Vector2(u0, y), Vector2(u1, y), Vector2(u1, y + h), Vector2(u0, y + h)]
			cs = [c0, c1, c1, c0]
		else:
			pts = [Vector2(x, u0), Vector2(x + w, u0), Vector2(x + w, u1), Vector2(x, u1)]
			cs = [c0, c0, c1, c1]
		for k in 4:
			pts[k] = _T * pts[k]
		RenderingServer.canvas_item_add_polygon(rid, pts, cs)


func createLinearGradient(x0: float, y0: float, x1: float, y1: float) -> CtxGradient:
	var g := CtxGradient.new()
	g.x0 = x0; g.y0 = y0; g.x1 = x1; g.y1 = y1
	return g


# ---------------------------------------------------------------- imagenes
## drawImage(src, dx, dy) | (src, dx, dy, dw, dh) | (src, sx, sy, sw, sh, dx, dy, dw, dh)
## src: Texture2D, ImgCtx o WhiteTex (copia blanca del destello).
func drawImage(src: Variant, a: float, b: float, c: Variant = null, d: Variant = null, e: Variant = null, f: Variant = null, gg: Variant = null, h: Variant = null) -> void:
	var tex: Texture2D
	var mat := -1
	if src is WhiteTex:
		tex = src.tex
		mat = 2
	elif src is ImgCtx:
		tex = src.texture()
	else:
		tex = src
	if tex == null:
		return
	var tw := float(tex.get_width())
	var th := float(tex.get_height())
	var sr: Rect2
	var dr: Rect2
	if e != null:
		sr = Rect2(a, b, c, d)
		dr = Rect2(e, f, gg, h)
	elif c != null:
		sr = Rect2(0, 0, tw, th)
		dr = Rect2(a, b, c, d)
	else:
		sr = Rect2(0, 0, tw, th)
		dr = Rect2(a, b, tw, th)
	var p0 := _T * dr.position
	var p1 := _T * (dr.position + dr.size)
	var fx := p1.x < p0.x
	var fy := p1.y < p0.y
	var dev := Rect2(minf(p0.x, p1.x), minf(p0.y, p1.y), absf(p1.x - p0.x), absf(p1.y - p0.y))
	if fx:
		dev.position.x += dev.size.x
		dev.size.x = -dev.size.x
	if fy:
		dev.position.y += dev.size.y
		dev.size.y = -dev.size.y
	var m := Color(1, 1, 1, globalAlpha)
	if mat == 2:
		pass
	elif globalCompositeOperation == "lighter":
		mat = 1
	else:
		mat = 0
	var rid := _seg(mat)
	RenderingServer.canvas_item_add_texture_rect_region(rid, dev, tex.get_rid(), sr, m, false, true)


# ---------------------------------------------------------------- trazos
func beginPath() -> void:
	_path.clear()
	_cur = PackedVector2Array()


func _flush_cur() -> void:
	if _cur.size() > 0:
		_path.append({k = "p", pts = _cur, closed = false})
		_cur = PackedVector2Array()


func moveTo(x: float, y: float) -> void:
	_flush_cur()
	_cur.append(_T * Vector2(x, y))


func lineTo(x: float, y: float) -> void:
	_cur.append(_T * Vector2(x, y))


func closePath() -> void:
	if _cur.size() > 0:
		_path.append({k = "p", pts = _cur, closed = true})
		_cur = PackedVector2Array()


func rect(x: float, y: float, w: float, h: float) -> void:
	_flush_cur()
	_path.append({k = "r", r = _rect_dev(x, y, w, h)})


func arc(x: float, y: float, r: float, a0: float, a1: float, _ccw: bool = false) -> void:
	var n := maxi(12, int(r * 1.5))
	var sweep := a1 - a0
	for i in range(n + 1):
		var a := a0 + sweep * float(i) / n
		_cur.append(_T * Vector2(x + cos(a) * r, y + sin(a) * r))


func fill() -> void:
	_flush_cur()
	var rid := _seg()
	var c := _fcol(fillStyle)
	for sp in _path:
		if sp.k == "r":
			RenderingServer.canvas_item_add_rect(rid, sp.r, c)
		elif sp.pts.size() >= 3:
			var pts: PackedVector2Array = sp.pts
			var idx := Geometry2D.triangulate_polygon(pts)
			if idx.is_empty():
				continue
			RenderingServer.canvas_item_add_polygon(rid, pts, PackedColorArray([c]))


func stroke() -> void:
	_flush_cur()
	var rid := _seg()
	var c := _fcol(strokeStyle)
	var sc := _T.get_scale().x
	for sp in _path:
		if sp.k == "r":
			var r: Rect2 = sp.r
			var pts := PackedVector2Array([r.position, Vector2(r.end.x, r.position.y), r.end, Vector2(r.position.x, r.end.y), r.position])
			RenderingServer.canvas_item_add_polyline(rid, pts, PackedColorArray([c]), lineWidth * sc)
		elif sp.pts.size() >= 2:
			var pts2: PackedVector2Array = sp.pts
			if sp.closed:
				pts2 = pts2.duplicate()
				pts2.append(pts2[0])
			RenderingServer.canvas_item_add_polyline(rid, pts2, PackedColorArray([c]), lineWidth * sc)


## Recorte rectangular (el unico que usa el juego). Se corta con la caja de
## pixeles enteros del lienzo, como el navegador.
func clip() -> void:
	_flush_cur()
	var r: Variant = null
	for sp in _path:
		if sp.k == "r":
			r = sp.r if r == null else (r as Rect2).intersection(sp.r)
	if r == null:
		return
	if _clip != null:
		r = (_clip as Rect2).intersection(r)
	_clip = r


# ---------------------------------------------------------------- texto
func _font_px() -> float:
	var i := font.find("px")
	if i <= 0:
		return 8.0
	var j := i - 1
	while j > 0 and (font[j - 1].is_valid_float() or font[j - 1] == "."):
		j -= 1
	return float(font.substr(j, i - j))


func measureText(s: String) -> Dictionary:
	var px := _font_px()
	return {width = get_font().get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, int(px)).x}


func fillText(s: String, x: float, y: float) -> void:
	var px := _font_px()
	var k := _T.get_scale().y
	var size := int(round(px * k))
	if size < 1:
		return
	var f := get_font()
	var p := _T * Vector2(x, y)
	if textAlign == "center":
		p.x -= f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x / 2.0
	elif textAlign == "right":
		p.x -= f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	if textBaseline == "top":
		p.y += f.get_ascent(size)
	elif textBaseline == "middle":
		p.y += f.get_ascent(size) / 2.0
	var rid := _seg()
	f.draw_string(rid, p, s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, _fcol(fillStyle))
