class_name Ui
extends RefCounted
## Arbol de los menus: el <div id="ov"> del HTML con lo que el juego escribe en
## innerHTML (show(html)). Lo buscan getElementById/querySelector como en el
## navegador y lo pinta UiView (rt/ui_view.gd), que se monta de nuevo solo
## cuando algo cambia (Ui.ver).

static var cur: Ui = null
static var ver := 0

var ov := DomEl.new("div")
var dom: Object = null           # Dom (document) para activeElement
var focused: DomEl = null        # document.activeElement
var on_click: Callable           # (DomEl) -> boton pulsado (Game._ui_click)


func _init() -> void:
	ov.attrs["id"] = "ov"
	ov.classList.list = ["ov"]
	ov._hidden = true
	cur = self


static func touch() -> void:
	ver += 1


## activeElement que ya no esta en pantalla vuelve a ser nada (como en el navegador).
func focus_el() -> DomEl:
	if focused and not focused.attached():
		focused = null
		if dom:
			dom.activeElement = null
	return focused


func set_focus(e: DomEl) -> void:
	if e != null and (e.is_text() or not e.attached()):
		return
	if e != null and not (e.tagName in ["BUTTON", "INPUT", "A"] or e.attrs.has("tabindex")):
		return
	if e != null and e.disabled:
		return
	focused = e
	if dom:
		dom.activeElement = e
	touch_focus()


static var fver := 0
static func touch_focus() -> void:
	fver += 1


func click(e: DomEl) -> void:
	if on_click.is_valid():
		on_click.call(e)


func by_id(id: String) -> Variant:
	var r = _find_id(ov, id)
	if r and r.tagName == "CANVAS":
		return r.canvas
	return r


func _find_id(e: DomEl, id: String) -> Variant:
	if e.attrs.get("id") == id:
		return e
	for c in e.children:
		if not c.is_text():
			var r = _find_id(c, id)
			if r:
				return r
	return null


func query(sel: String) -> Variant:
	if matches(ov, sel):
		return ov
	var r := walk(ov, sel, true)
	return r[0] if r.size() else null


func query_all(sel: String) -> Array:
	return walk(ov, sel, false)


## Descendientes de e (sin e) que casan con sel, en orden de documento.
static func walk(e: DomEl, sel: String, first: bool, out: Array = []) -> Array:
	for c in e.children:
		if c.is_text():
			continue
		if matches(c, sel):
			out.append(c)
			if first:
				return out
		walk(c, sel, first, out)
		if first and out.size():
			return out
	return out


## Selectores que usa el juego: etiqueta, #id, .clase, [attr], [attr=v],
## [attr="v"], :not(:disabled), y combinaciones sin espacios.
static func matches(e: DomEl, sel: String) -> bool:
	for alt in sel.split(","):
		if _match_one(e, alt.strip_edges()):
			return true
	return false


static var _re: RegEx = null


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
	if s.contains(":disabled"):
		if not e.disabled:
			return false
		s = s.replace(":disabled", "")
	if _re == null:
		_re = RegEx.create_from_string("^([a-zA-Z0-9]*)|(#[\\w-]+)|(\\.[\\w-]+)|(\\[[^\\]]+\\])")
	for m in _re.search_all(s):
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
