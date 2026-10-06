class_name DomStyle
extends RefCounted
## style.* y style.setProperty: se guardan por si alguien los lee; no pintan nada.

var props := {}


func setProperty(k: String, v: Variant) -> void:
	props[k] = v


func _get(k: StringName) -> Variant:
	return props.get(String(k), "")


func _set(k: StringName, v: Variant) -> bool:
	props[String(k)] = v
	return true
