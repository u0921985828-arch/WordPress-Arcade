class_name DomClassList
extends RefCounted

var list: Array = []
var el: Object = null


func contains(c: String) -> bool:
	return list.has(c)


func add(a: String = "", b: String = "") -> void:
	for c in [a, b]:
		if c != "" and not list.has(c):
			list.append(c)
	_changed()


func remove(a: String = "", b: String = "") -> void:
	list.erase(a)
	list.erase(b)
	_changed()


func toggle(c: String, force: Variant = null) -> bool:
	var on: bool = (not list.has(c)) if force == null else bool(force)
	if on:
		add(c)
	else:
		remove(c)
	return on


func _changed() -> void:
	if el:
		el._changed()
