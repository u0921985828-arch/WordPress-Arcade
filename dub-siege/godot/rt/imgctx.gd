class_name ImgCtx
extends RefCounted
## Lienzo fuera de pantalla (document.createElement('canvas')) sobre una Image.
## Hace lo poco que el juego pide a sus lienzos auxiliares: fillRect con
## source-over / source-in / source-atop, drawImage de otra hoja entera,
## getImageData / putImageData / createImageData y clearRect. getContext()
## devuelve el propio objeto, como si fuera su contexto 2D.

var _w := 0
var _h := 0
var img: Image
var _tex: Texture2D = null
var _dirty := true
static var PT := {}

var fillStyle: Variant = "#000"
var globalAlpha := 1.0
var globalCompositeOperation := "source-over"
var imageSmoothingEnabled := false

var width: int:
	get:
		return _w
	set(v):
		_w = int(v)
		_resize()
var height: int:
	get:
		return _h
	set(v):
		_h = int(v)
		_resize()


func _init(w: int = 0, h: int = 0) -> void:
	_w = w
	_h = h
	_resize()


static func from_image(im: Image) -> ImgCtx:
	var c := ImgCtx.new(0, 0)
	if im.get_format() != Image.FORMAT_RGBA8:
		im.convert(Image.FORMAT_RGBA8)
	c.img = im
	c._w = im.get_width()
	c._h = im.get_height()
	return c


func _resize() -> void:
	if _w <= 0 or _h <= 0:
		img = null
		return
	img = Image.create_empty(_w, _h, false, Image.FORMAT_RGBA8)
	_dirty = true


func getContext(_kind: Variant = null) -> ImgCtx:
	return self


func texture() -> Texture2D:
	if img == null:
		return null
	if _tex == null:
		_tex = ImageTexture.create_from_image(img)
	elif _dirty:
		if _tex is ImageTexture:
			(_tex as ImageTexture).update(img)
		else:
			_tex = ImageTexture.create_from_image(img)
	_dirty = false
	return _tex


func clearRect(x: float, y: float, w: float, h: float) -> void:
	if img == null:
		return
	var r := Rect2i(int(x), int(y), int(w), int(h)).intersection(Rect2i(0, 0, _w, _h))
	if r.size.x > 0 and r.size.y > 0:
		img.fill_rect(r, Color(0, 0, 0, 0))
		_dirty = true


func _o_fillRect(x: float, y: float, w: float, h: float) -> void:
	if img == null:
		return
	var r := Rect2i(int(round(x)), int(round(y)), int(round(w)), int(round(h)))
	if w < 0 or h < 0:
		r = r.abs()
	r = r.intersection(Rect2i(0, 0, _w, _h))
	if r.size.x <= 0 or r.size.y <= 0:
		return
	var c := Ctx.col(fillStyle)
	c.a *= globalAlpha
	var op := globalCompositeOperation
	if op == "source-over" and c.a >= 1.0:
		img.fill_rect(r, c)
	elif op == "source-in":
		# el resultado toma el color nuevo con el alfa de lo que ya habia (por c.a)
		for yy in range(r.position.y, r.end.y):
			for xx in range(r.position.x, r.end.x):
				var d := img.get_pixel(xx, yy)
				img.set_pixel(xx, yy, Color(c.r, c.g, c.b, d.a * c.a))
	elif op == "source-atop":
		for yy in range(r.position.y, r.end.y):
			for xx in range(r.position.x, r.end.x):
				var d := img.get_pixel(xx, yy)
				if d.a <= 0.0:
					continue
				img.set_pixel(xx, yy, Color(d.r + (c.r - d.r) * c.a, d.g + (c.g - d.g) * c.a, d.b + (c.b - d.b) * c.a, d.a))
	else:
		var src := Image.create_empty(r.size.x, r.size.y, false, Image.FORMAT_RGBA8)
		src.fill(c)
		img.blend_rect(src, Rect2i(Vector2i.ZERO, r.size), r.position)
	_dirty = true


func _o_drawImage(src: Variant, a: float, b: float, c: Variant = null, d: Variant = null, e: Variant = null, f: Variant = null, gg: Variant = null, h: Variant = null) -> void:
	if img == null:
		return
	var si: Image = null
	if src is ImgCtx:
		si = src.img
	elif src is Texture2D:
		si = src.get_image()
	elif src is WhiteTex:
		si = src.tex.get_image()
	if si == null:
		return
	if si.get_format() != Image.FORMAT_RGBA8:
		si = si.duplicate()
		si.convert(Image.FORMAT_RGBA8)
	var sr := Rect2i(0, 0, si.get_width(), si.get_height())
	var dp := Vector2i(int(round(a)), int(round(b)))
	var dsz := sr.size
	if e != null:
		sr = Rect2i(int(a), int(b), int(c), int(d))
		dp = Vector2i(int(round(e)), int(round(f)))
		dsz = Vector2i(int(round(gg)), int(round(h)))
	elif c != null:
		dsz = Vector2i(int(round(c)), int(round(d)))
	if dsz != sr.size:
		var part := si.get_region(sr)
		part.resize(dsz.x, dsz.y, Image.INTERPOLATE_NEAREST)
		si = part
		sr = Rect2i(Vector2i.ZERO, dsz)
	if globalAlpha < 1.0:
		si = si.get_region(sr)
		for yy in si.get_height():
			for xx in si.get_width():
				var p := si.get_pixel(xx, yy)
				p.a *= globalAlpha
				si.set_pixel(xx, yy, p)
		sr = Rect2i(Vector2i.ZERO, si.get_size())
	if globalCompositeOperation == "copy":
		img.blit_rect(si, sr, dp)
	else:
		img.blend_rect(si, sr, dp)
	_dirty = true


## ImageData: {width, height, data} con data en Array de enteros (los cambios
## en d[i] tienen que llegar a putImageData, y un PackedByteArray se copiaria).
func _o_getImageData(x: float, y: float, w: float, h: float) -> Dictionary:
	var W := int(w)
	var H := int(h)
	var bytes: PackedByteArray
	if img != null and int(x) == 0 and int(y) == 0 and W == _w and H == _h:
		bytes = img.get_data()
	else:
		var tmp := Image.create_empty(W, H, false, Image.FORMAT_RGBA8)
		if img != null:
			tmp.blit_rect(img, Rect2i(int(x), int(y), W, H), Vector2i.ZERO)
		bytes = tmp.get_data()
	return {"width": W, "height": H, "data": Array(bytes)}


func _o_createImageData(w: float, h: float) -> Dictionary:
	var a := []
	a.resize(int(w) * int(h) * 4)
	a.fill(0)
	return {"width": int(w), "height": int(h), "data": a}


func _o_putImageData(im: Dictionary, x: float, y: float) -> void:
	var W: int = im.width
	var H: int = im.height
	var src: Array = im.data
	var bytes := PackedByteArray()
	bytes.resize(src.size())
	for i in src.size():
		bytes[i] = clampi(int(src[i]), 0, 255)
	var tmp := Image.create_from_data(W, H, false, Image.FORMAT_RGBA8, bytes)
	if img == null:
		return
	img.blit_rect(tmp, Rect2i(0, 0, W, H), Vector2i(int(x), int(y)))
	_dirty = true

func fillRect(x: float, y: float, w: float, h: float) -> void:
	var t := Time.get_ticks_usec(); _o_fillRect(x,y,w,h); PT["fillRect "+globalCompositeOperation] = PT.get("fillRect "+globalCompositeOperation,0) + Time.get_ticks_usec()-t
func drawImage(src: Variant, a: float, b: float, c: Variant = null, d: Variant = null, e: Variant = null, f: Variant = null, gg: Variant = null, h: Variant = null) -> void:
	var t := Time.get_ticks_usec(); _o_drawImage(src,a,b,c,d,e,f,gg,h); PT["drawImage"] = PT.get("drawImage",0) + Time.get_ticks_usec()-t
func getImageData(x: float, y: float, w: float, h: float) -> Dictionary:
	var t := Time.get_ticks_usec(); var r := _o_getImageData(x,y,w,h); PT["getImageData"] = PT.get("getImageData",0) + Time.get_ticks_usec()-t; return r
func createImageData(w: float, h: float) -> Dictionary:
	var t := Time.get_ticks_usec(); var r := _o_createImageData(w,h); PT["createImageData"] = PT.get("createImageData",0) + Time.get_ticks_usec()-t; return r
func putImageData(im: Dictionary, x: float, y: float) -> void:
	var t := Time.get_ticks_usec(); _o_putImageData(im,x,y); PT["putImageData"] = PT.get("putImageData",0) + Time.get_ticks_usec()-t
