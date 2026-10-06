class_name DomEl
extends RefCounted
## Elemento del sustituto de DOM. Guarda etiqueta, atributos, clases e hijos;
## si tiene un Control asociado (menus) le pasa el foco y los cambios de clase.

var tagName := ""
var attrs := {}
var children: Array = []
var parent: DomEl = null
var classList := DomClassList.new()
var style := DomStyle.new()
var hidden := false
var disabled := false
var value := ""
var control: Control = null
var on_change: Callable


func _init(tag: String = "div") -> void:
	tagName = tag.to_upper()
	classList.el = self


var textContent: String:
	get:
		var s := str(attrs.get("#text", ""))
		for c in children:
			s += c.textContent
		return s
	set(v):
		children.clear()
		attrs["#text"] = v
		if on_change.is_valid():
			on_change.call(self)


var className: String:
	get:
		return " ".join(classList.list)
	set(v):
		classList.list = Array(v.split(" ", false))


func getAttribute(k: String) -> Variant:
	return attrs.get(k)


func setAttribute(k: String, v: Variant) -> void:
	attrs[k] = str(v)


func focus(_o: Variant = null) -> void:
	if control and control.is_inside_tree() and control.focus_mode != Control.FOCUS_NONE:
		control.grab_focus()


func click() -> void:
	if control is BaseButton:
		(control as BaseButton).pressed.emit()


func remove() -> void:
	hidden = true
	if control:
		control.queue_free()
		control = null


func closest(sel: String) -> Variant:
	var e: DomEl = self
	while e:
		if Ui.matches(e, sel):
			return e
		e = e.parent
	return null
