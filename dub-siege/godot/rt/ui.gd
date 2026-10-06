class_name Ui
extends RefCounted
## Menus: monta Controls de Godot a partir del HTML que escribe el juego
## (show(html)) y los registra como DomEl para que el codigo traducido los
## encuentre (getElementById, querySelector) igual que en el navegador.

var root: Control = null
var els: Array = []


func by_id(id: String) -> Variant:
	for e in els:
		if e.attrs.get("id") == id:
			return e
	return null


func query(sel: String) -> Variant:
	for e in els:
		if matches(e, sel):
			return e
	return null


func query_all(sel: String) -> Array:
	var r := []
	for e in els:
		if matches(e, sel):
			r.append(e)
	return r


## Selectores que usa el juego: etiqueta, #id, .clase, [attr], [attr=v],
## [attr="v"], :not(:disabled), y combinaciones sin espacios.
static func matches(e: DomEl, sel: String) -> bool:
	for alt in sel.split(","):
		if _match_one(e, alt.strip_edges()):
			return true
	return false


static func _match_one(e: DomEl, sel: String) -> bool:
	var parts := sel.split(" ", false)
	if parts.size() > 1:
		# descendiente: el ultimo tiene que casar con e y el anterior con un ancestro
		if not _match_one(e, parts[parts.size() - 1]):
			return false
		var anc := " ".join(parts.slice(0, parts.size() - 1))
		var p: DomEl = e.parent
		while p:
			if _match_one(p, anc):
				return true
			p = p.parent
		return false
	var s := sel
	if s.contains(":not(:disabled)"):
		if e.disabled:
			return false
		s = s.replace(":not(:disabled)", "")
	var re := RegEx.create_from_string("^([a-zA-Z0-9]*)|(#[\\w-]+)|(\\.[\\w-]+)|(\\[[^\\]]+\\])")
	for m in re.search_all(s):
		var t := m.get_string()
		if t == "":
			continue
		if t.begins_with("#"):
			if e.attrs.get("id") != t.substr(1):
				return false
		elif t.begins_with("."):
			if not e.classList.contains(t.substr(1)):
				return false
		elif t.begins_with("["):
			var inner := t.substr(1, t.length() - 2)
			var eq := inner.find("=")
			if eq < 0:
				if not e.attrs.has(inner):
					return false
			else:
				var k := inner.substr(0, eq)
				var v := inner.substr(eq + 1).trim_prefix("\"").trim_suffix("\"").trim_prefix("'").trim_suffix("'")
				if str(e.attrs.get(k, "")) != v:
					return false
		else:
			if e.tagName != t.to_upper():
				return false
	return true
