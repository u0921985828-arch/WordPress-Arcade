class_name Dom
extends RefCounted
## Sustituto minimo de `document` para el codigo traducido. Los lienzos
## (createElement('canvas')) son ImgCtx; los menus HTML los monta Ui (ui.gd)
## y se buscan aqui por id o por selector sencillo.

var ui: Object = null          # Ui: arbol de elementos de la pantalla de menus
var activeElement: Variant = null
var documentElement := DomEl.new("html")
var body := DomEl.new("body")
var hidden := false


func createElement(tag: String) -> Variant:
	if tag == "canvas":
		return ImgCtx.new(0, 0)
	return DomEl.new(tag)


func getElementById(id: String) -> Variant:
	return ui.by_id(id) if ui else null


func querySelector(sel: String) -> Variant:
	return ui.query(sel) if ui else null


func querySelectorAll(sel: String) -> Array:
	return ui.query_all(sel) if ui else []
