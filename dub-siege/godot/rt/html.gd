class_name Html
extends RefCounted
## Analizador minimo de HTML para innerHTML: el juego solo escribe HTML propio
## (show(html)), sin comentarios ni scripts. Devuelve los nodos hijos como
## DomEl; el texto va en nodos "#TEXT" (DomEl.data).

const VOID := ["br", "img", "input", "hr", "meta", "wbr"]
const ENT := {"amp": "&", "lt": "<", "gt": ">", "quot": "\"", "apos": "'", "nbsp": "\u00a0", "#39": "'"}

static var _re_attr: RegEx = null


static func decode(s: String) -> String:
	if not s.contains("&"):
		return s
	var out := ""
	var i := 0
	while i < s.length():
		var c := s[i]
		if c == "&":
			var j := s.find(";", i)
			if j > i and j - i <= 10:
				var name := s.substr(i + 1, j - i - 1)
				var rep = ENT.get(name)
				if rep == null and name.begins_with("#"):
					var n := name.substr(1)
					var code := n.substr(1).hex_to_int() if n.begins_with("x") else n.to_int()
					rep = String.chr(code)
				if rep != null:
					out += rep
					i = j + 1
					continue
		out += c
		i += 1
	return out


static func parse(html: String) -> Array:
	if _re_attr == null:
		_re_attr = RegEx.create_from_string("([\\w:-]+)(?:\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+)))?")
	var root := DomEl.new("div")
	var cur: DomEl = root
	var i := 0
	var n := html.length()
	while i < n:
		var lt := html.find("<", i)
		if lt < 0:
			lt = n
		if lt > i:
			cur._add(DomEl.text(decode(html.substr(i, lt - i))))
		if lt >= n:
			break
		var gt := html.find(">", lt)
		if gt < 0:
			break
		var tag := html.substr(lt + 1, gt - lt - 1)
		i = gt + 1
		if tag.begins_with("!"):
			continue
		if tag.begins_with("/"):
			var nm := tag.substr(1).strip_edges().to_upper()
			var e: DomEl = cur
			while e != root and e.tagName != nm:
				e = e.parent
			if e != root:
				cur = e.parent
			continue
		var self_close := tag.ends_with("/")
		if self_close:
			tag = tag.substr(0, tag.length() - 1)
		var sp := tag.find(" ")
		var name := (tag if sp < 0 else tag.substr(0, sp)).strip_edges().to_lower()
		var el := DomEl.new(name)
		if sp >= 0:
			for m in _re_attr.search_all(tag.substr(sp + 1)):
				var k := m.get_string(1).to_lower()
				var v := ""
				for gi in [2, 3, 4]:
					if m.get_start(gi) >= 0:
						v = decode(m.get_string(gi))
						break
				el._set_attr(k, v)
		cur._add(el)
		if not (self_close or VOID.has(name)):
			cur = el
	var out := root.children.duplicate()
	for c in out:
		c.parent = null
	return out
