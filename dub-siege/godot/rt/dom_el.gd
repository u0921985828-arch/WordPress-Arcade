class_name DomEl
extends RefCounted
## Elemento del sustituto de DOM. Guarda etiqueta, atributos, clases e hijos.
## Los menus (Ui + UiView) lo leen para montar y pintar la pantalla; cualquier
## cambio (innerHTML, clases, hidden, texto) avisa con Ui.touch() para que se
## vuelva a montar en el siguiente fotograma.

var tagName := ""
var attrs := {}
var children: Array = []
var parent: DomEl = null
var classList := DomClassList.new()
var style := DomStyle.new()
var value := ""
var data := ""                 # texto de un nodo "#TEXT"
var canvas: ImgCtx = null      # <canvas>: su lienzo
var control: Control = null
var on_change: Callable

var _hidden := false
var _disabled := false


func _init(tag: String = "div") -> void:
	tagName = tag.to_upper()
	classList.el = self


static func text(s: String) -> DomEl:
	var t := DomEl.new("#text")
	t.data = s
	return t


func is_text() -> bool:
	return tagName == "#TEXT"


func _changed() -> void:
	if attached():
		Ui.touch()
	if on_change.is_valid():
		on_change.call(self)


func _add(c: DomEl) -> void:
	c.parent = self
	children.append(c)


func _set_attr(k: String, v: String) -> void:
	match k:
		"class":
			classList.list = Array(v.split(" ", false))
		"disabled":
			_disabled = true
		"hidden":
			_hidden = true
		"style":
			for decl in v.split(";", false):
				var c := decl.find(":")
				if c > 0:
					style.props[decl.substr(0, c).strip_edges()] = decl.substr(c + 1).strip_edges()
		"width", "height":
			if tagName == "CANVAS":
				if canvas == null:
					canvas = ImgCtx.new(0, 0)
				canvas.set(k, int(v))
		"value":
			value = v
	if tagName == "CANVAS" and canvas == null:
		canvas = ImgCtx.new(0, 0)
	attrs[k] = v


var hidden: bool:
	get:
		return _hidden
	set(v):
		if v != _hidden:
			_hidden = v
			_changed()


var disabled: bool:
	get:
		return _disabled
	set(v):
		if v != _disabled:
			_disabled = v
			_changed()


var textContent: String:
	get:
		if is_text():
			return data
		var s := ""
		for c in children:
			s += c.textContent
		return s
	set(v):
		for c in children:
			c.parent = null
		children = [DomEl.text(str(v))]
		children[0].parent = self
		_changed()


var innerHTML: String:
	get:
		return ""
	set(v):
		for c in children:
			c.parent = null
		children = []
		for c in Html.parse(str(v)):
			_add(c)
		_changed()


var className: String:
	get:
		return " ".join(classList.list)
	set(v):
		classList.list = Array(str(v).split(" ", false))
		_changed()


var id: String:
	get:
		return str(attrs.get("id", ""))


func getAttribute(k: String) -> Variant:
	if k == "class":
		return className
	return attrs.get(k)


func setAttribute(k: String, v: Variant) -> void:
	_set_attr(k, str(v))
	_changed()


func hasAttribute(k: String) -> bool:
	return attrs.has(k)


## Esta dentro del arbol de la pantalla (cuelga de #ov)?
func attached() -> bool:
	var e: DomEl = self
	while e.parent:
		e = e.parent
	return Ui.cur != null and e == Ui.cur.ov


func focus(_o: Variant = null) -> void:
	if Ui.cur:
		Ui.cur.set_focus(self)


func blur() -> void:
	if Ui.cur and Ui.cur.focused == self:
		Ui.cur.set_focus(null)


func click() -> void:
	if Ui.cur:
		Ui.cur.click(self)


func remove() -> void:
	_hidden = true
	if parent:
		parent.children.erase(self)
		parent = null
		_changed()


func closest(sel: String) -> Variant:
	var e: DomEl = self
	while e:
		if not e.is_text() and Ui.matches(e, sel):
			return e
		e = e.parent
	return null


func querySelector(sel: String) -> Variant:
	var r := Ui.walk(self, sel, true)
	return r[0] if r.size() else null


func querySelectorAll(sel: String) -> Array:
	return Ui.walk(self, sel, false)


func getContext(_k: Variant = null) -> Variant:
	return canvas
