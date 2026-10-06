class_name UiView
extends Control
## Pinta los menus (#ov) encima del juego, con el mismo aspecto que el CSS de
## dub-siege.html. Monta un arbol de cajas (bloque, flex, rejilla, lineas de
## texto) a partir de los DomEl de Ui, lo coloca en px CSS como el navegador y
## lo dibuja escalado por la densidad. Solo se vuelve a montar cuando cambia
## algo (Ui.ver) o el tamano de la ventana; el foco y el raton solo repintan.

const INF := 1.0e9

var game: Object = null
var ui: Ui = null
var bg: ColorRect
var paint: Control
var root: Dictionary = {}          # caja de #ov
var built_ver := -1
var built_size := Vector2.ZERO
var built_fver := -1
var k := 1.0                       # px de pantalla por px CSS
var sy := 0.0                      # desplazamiento vertical (si no cabe)
var content_h := 0.0
var kbd := true                    # foco visible (:focus-visible)
var hover: DomEl = null
var press: DomEl = null
var drag := {}
var canvases: Array = []
var font: Font
var _fv := {}
var _tex := {}


func setup(g: Object) -> void:
	game = g
	ui = g.document.ui
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	focus_mode = Control.FOCUS_NONE
	font = Ctx.get_font()
	bg = ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := Shader.new()
	sh.code = BG_SHADER
	var m := ShaderMaterial.new()
	m.shader = sh
	bg.material = m
	add_child(bg)
	paint = Control.new()
	paint.set_anchors_preset(Control.PRESET_FULL_RECT)
	paint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	paint.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	paint.draw.connect(_paint)
	add_child(paint)
	visible = false


const BG_SHADER := """
shader_type canvas_item;
uniform int mode = 0;
uniform vec2 vsize = vec2(1280.0, 720.0);
uniform float dpr = 1.0;
void fragment() {
	vec2 p = UV * vsize;
	if (mode == 1) {
		float t = UV.y;
		float a;
		if (t < 0.3) a = mix(0.74, 0.34, t / 0.3);
		else if (t < 0.54) a = mix(0.34, 0.10, (t - 0.3) / 0.24);
		else if (t < 0.8) a = mix(0.10, 0.42, (t - 0.54) / 0.26);
		else a = mix(0.42, 0.74, (t - 0.8) / 0.2);
		COLOR = vec4(6.0 / 255.0, 7.0 / 255.0, 13.0 / 255.0, a);
	} else {
		vec2 c = vec2(0.5, 0.4) * vsize;
		float rx = max(c.x, vsize.x - c.x);
		float ry = max(c.y, vsize.y - c.y);
		float d = length(vec2((p.x - c.x) / rx, (p.y - c.y) / ry)) / sqrt(2.0);
		float t = clamp(d / 0.75, 0.0, 1.0);
		vec4 a = vec4(14.0, 17.0, 34.0, 0.86 * 255.0) / 255.0;
		vec4 b = vec4(4.0, 5.0, 10.0, 0.95 * 255.0) / 255.0;
		vec4 col = mix(a, b, t);
		float m = mod((vsize.y - p.y) / dpr, 3.0);
		if (m >= 2.0) {
			float sa = 31.0 / 255.0;
			col.rgb = col.rgb * col.a * (1.0 - sa) / (col.a + sa * (1.0 - col.a));
			col.a = col.a + sa * (1.0 - col.a);
		}
		COLOR = col;
	}
}
"""


# ------------------------------------------------------------ bucle
func _process(_dt: float) -> void:
	if game:
		game.menu_tick()
	var show: bool = not ui.ov.hidden
	if show != visible:
		visible = show
		if not show:
			root = {}
			canvases = []
			hover = null
			press = null
	if not show:
		return
	if built_ver != Ui.ver or built_size != size:
		_build()
	if built_fver != Ui.fver:
		built_fver = Ui.fver
		_scroll_to_focus()
		paint.queue_redraw()
	if not canvases.is_empty():
		paint.queue_redraw()


func _ctx() -> Dictionary:
	var dpr: float = game._dpr()
	var m := 1.0
	var u = game.SET.get("ui") if game.SET is Dictionary else "auto"
	if u is float or u is int:
		m = minf(1.0, 0.6 + 0.4 * float(u))
	k = dpr * m
	var vwc := size.x / dpr
	var vhc := size.y / dpr
	return {"vw": vwc / 100.0, "vh": vhc / 100.0, "h600": vhc <= 600, "h430": vhc <= 430, "w480": vwc >= 480,
		"vp": vhc > vwc, "title": ui.ov.classList.contains("title"), "W": size.x / k, "H": size.y / k, "dpr": dpr}


func _build() -> void:
	built_ver = Ui.ver
	built_size = size
	var c := _ctx()
	var m := bg.material as ShaderMaterial
	m.set_shader_parameter("mode", 1 if c.title else 0)
	m.set_shader_parameter("vsize", size)
	m.set_shader_parameter("dpr", c.dpr)
	canvases = []
	var rs := UiCss.root_style()
	var kids := []
	for e in ui.ov.children:
		if not e.is_text():
			var b = _box(e, rs, c)
			if b:
				kids.append(b)
	# .ov: flex centrado con relleno; el panel con margin:auto
	var pv: float = maxf(10.0, 2.0 * c.vh * c.dpr / k)
	var ph := 12.0
	var aw: float = c.W - 2 * ph
	var y := 0.0
	for b in kids:
		var w := _resolve_w(b, aw, "fill")
		_lay(b, w)
		b.x = ph + (aw - w) / 2.0
		b.y = y
		y += b.h
	var ah: float = c.H - 2 * pv
	var off := pv + maxf(0.0, (ah - y) / 2.0)
	for b in kids:
		b.y += off
	content_h = y + 2 * pv
	root = {"kids": kids}
	sy = clampf(sy, 0.0, maxf(0.0, content_h - c.H))
	if content_h <= c.H:
		sy = 0.0
	_scroll_to_focus()
	paint.queue_redraw()


# ------------------------------------------------------------ cajas
func _box(e: DomEl, ps: Dictionary, c: Dictionary) -> Variant:
	if e.hidden and e != ui.ov:
		return null
	var s := UiCss.of(e, ps, c)
	if s.disp == "none":
		return null
	var b := {"e": e, "s": s, "kids": [], "x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0}
	if s.disp == "repl":
		b.kind = "repl"
		if e.tagName == "CANVAS":
			canvases.append(b)
		return b
	if s.disp == "inline" or s.disp == "br":
		b.kind = "inline"
		return b
	var flexy: bool = s.disp == "flex" or s.disp == "grid"
	b.kind = s.disp if flexy else "block"
	var runs := []
	for ch in e.children:
		if ch.is_text():
			runs.append({"t": ch.data, "s": s})
			continue
		var cb = _box(ch, s, c)
		if cb == null:
			continue
		if cb.kind == "inline" and not flexy:
			_runs(cb, runs, c)
			continue
		if flexy and cb.kind == "inline":
			# un elemento en linea dentro de flex/rejilla se vuelve bloque
			cb.kind = "block"
			var rr := []
			_runs(cb, rr, c, true)
			cb.kids = []
			_push_line(cb.kids, rr, cb.s)
		_push_line(b.kids, runs, s, flexy)
		runs = []
		b.kids.append(cb)
	_push_line(b.kids, runs, s, flexy)
	return b


func _runs(cb: Dictionary, out: Array, c: Dictionary, inner := false) -> void:
	var e: DomEl = cb.e
	var s: Dictionary = cb.s
	if s.disp == "br" and not inner:
		out.append({"br": true, "s": s})
		return
	if s.ml > 0 and not inner:
		out.append({"t": "", "s": s, "gap": s.ml})
	for ch in e.children:
		if ch.is_text():
			out.append({"t": ch.data, "s": s})
		else:
			var b2 = _box(ch, s, c)
			if b2 and (b2.kind == "inline"):
				_runs(b2, out, c)


func _push_line(kids: Array, runs: Array, s: Dictionary, trim := false) -> void:
	if runs.is_empty():
		return
	var any := false
	for r in runs:
		if r.has("br") or r.has("gap") or str(r.t).strip_edges() != "" or str(r.t).contains(" "):
			any = true
			break
	if not any:
		return
	kids.append({"kind": "line", "e": null, "s": s, "runs": runs, "kids": [], "x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0})


# ------------------------------------------------------------ texto
func _fnt(s: Dictionary) -> Font:
	var ls := int(round(float(s.ls) * k))
	if ls == 0:
		return font
	if not _fv.has(ls):
		var v := FontVariation.new()
		v.base_font = font
		v.spacing_glyph = ls
		_fv[ls] = v
	return _fv[ls]


func _fsi(s: Dictionary) -> int:
	return maxi(1, int(round(float(s.fs) * k)))


func _tw(t: String, s: Dictionary) -> float:
	if t == "":
		return 0.0
	return _fnt(s).get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, _fsi(s)).x / k


## Palabras: [{t, s, w, sp (ancho del espacio de delante), br}]
func _words(runs: Array) -> Array:
	var out := []
	var pend_sp := 0.0
	for r in runs:
		if r.has("br"):
			out.append({"br": true})
			pend_sp = 0.0
			continue
		if r.has("gap"):
			pend_sp += float(r.gap)
			continue
		var t := str(r.t).replace("\n", " ").replace("\t", " ")
		var cur := ""
		for ch in t:
			if ch == " ":
				if cur != "":
					out.append({"t": cur, "s": r.s, "w": _tw(cur, r.s), "sp": pend_sp})
					cur = ""
					pend_sp = 0.0
				pend_sp = maxf(pend_sp, _tw(" ", r.s))
			else:
				cur += ch
		if cur != "":
			out.append({"t": cur, "s": r.s, "w": _tw(cur, r.s), "sp": pend_sp, "glue": true})
			pend_sp = 0.0
	# palabras pegadas entre dos trozos de estilo (sin espacio) no se separan
	for i in range(1, out.size()):
		if out[i].has("t") and out[i].sp == 0.0 and out[i - 1].has("glue"):
			out[i].stick = true
	return out


func _line_mx(b: Dictionary) -> float:
	var best := 0.0
	var x := 0.0
	var first := true
	for w in _words(b.runs):
		if w.has("br"):
			best = maxf(best, x)
			x = 0.0
			first = true
			continue
		x += (0.0 if first else w.sp) + w.w
		first = false
	return maxf(best, x)


func _line_mn(b: Dictionary) -> float:
	if b.s.nowrap:
		return _line_mx(b)
	var best := 0.0
	var acc := 0.0
	for w in _words(b.runs):
		if w.has("br"):
			acc = 0.0
			continue
		acc = (acc + w.w) if w.has("stick") else w.w
		best = maxf(best, acc)
	return best


func _lay_line(b: Dictionary, cw: float) -> void:
	var s: Dictionary = b.s
	var lines := [[]]
	var x := 0.0
	for w in _words(b.runs):
		if w.has("br"):
			lines.append([])
			x = 0.0
			continue
		var ln: Array = lines[lines.size() - 1]
		var need: float = (w.sp if ln.size() else 0.0) + w.w
		if ln.size() and x + need > cw + 0.01 and not s.nowrap and not w.has("stick"):
			lines.append([])
			ln = lines[lines.size() - 1]
			x = 0.0
			need = w.w
		var it: Dictionary = w.duplicate()
		it.x = x + (need - w.w)
		ln.append(it)
		x += need
	var pieces := []
	var y := 0.0
	for ln in lines:
		var lw := 0.0
		for it in ln:
			lw = maxf(lw, it.x + it.w)
		if s.ellip and lw > cw:
			_ellipsis(ln, cw)
			lw = cw
		var dx := 0.0
		if s.align == "center":
			dx = (cw - lw) / 2.0
		elif s.align == "right":
			dx = cw - lw
		# alto de la linea: puntal del bloque + cada trozo, alineados por la base
		var L0: float = s.fs * s.lh
		var asc: float = (L0 - s.fs) / 2.0 + s.fs
		var des: float = (L0 - s.fs) / 2.0
		for it in ln:
			var f: float = it.s.fs
			var L: float = f * it.s.lh
			asc = maxf(asc, (L - f) / 2.0 + f)
			des = maxf(des, (L - f) / 2.0)
		if ln.is_empty() and lines.size() > 1:
			pass
		for it in ln:
			it.x += dx
			it.by = y + asc
			pieces.append(it)
		y += asc + des
	b.pieces = pieces
	b.w = cw
	b.h = y


func _ellipsis(ln: Array, cw: float) -> void:
	var dots := "..."
	for i in range(ln.size() - 1, -1, -1):
		var it: Dictionary = ln[i]
		if it.x >= cw:
			ln.remove_at(i)
			continue
		var dw := _tw(dots, it.s)
		var t: String = it.t
		while t.length() > 0 and it.x + _tw(t, it.s) + dw > cw:
			t = t.substr(0, t.length() - 1)
		it.t = t + dots
		it.w = _tw(it.t, it.s)
		return


# ------------------------------------------------------------ medidas
func _hpad(s: Dictionary) -> float:
	return s.pad[1] + s.pad[3] + s.bw[1] + s.bw[3]


func _vpad(s: Dictionary) -> float:
	return s.pad[0] + s.pad[2] + s.bw[0] + s.bw[2]


## Ancho max-content (caja de borde).
func _mx(b: Dictionary) -> float:
	if b.has("mx"):
		return b.mx
	var s: Dictionary = b.s
	var w := 0.0
	match b.kind:
		"line":
			w = _line_mx(b)
		"repl":
			w = s.w if s.w != null else 0.0
		_:
			if s.w != null:
				w = s.w
			else:
				var inner := 0.0
				if b.kind == "flex" and s.dir == "row":
					for c in b.kids:
						inner += _mx(c)
					inner += s.gap_c * maxf(0, b.kids.size() - 1)
				elif b.kind == "grid" and s.cols != null:
					inner = _grid_mx(b)
				else:
					for c in b.kids:
						inner = maxf(inner, _mx(c))
				w = inner + _hpad(s)
	w = maxf(w, s.minw)
	b.mx = w
	return w


func _grid_mx(b: Dictionary) -> float:
	var s: Dictionary = b.s
	var cols: Array = s.cols
	var n := cols.size()
	var ws := []
	ws.resize(n)
	ws.fill(0.0)
	var i := 0
	var items: Array = b.kids
	var rsp := false
	for c in items:
		if c.s.rspan:
			ws[0] = maxf(ws[0], _mx(c))
			rsp = true
	var nc := n - (1 if rsp else 0)
	for c in items:
		if c.s.rspan:
			continue
		var j: int = (1 if rsp else 0) + (i % nc)
		if c.s.span:
			i += (nc - i % nc) % nc
			i += nc
			continue
		var tr = cols[j]
		ws[j] = maxf(ws[j], tr if (tr is float or tr is int) else _mx(c))
		i += 1
	var t := 0.0
	for x in ws:
		t += x
	return t + s.gap_c * (n - 1)


## Ancho min-content (para encoger en flex).
func _mn(b: Dictionary) -> float:
	var s: Dictionary = b.s
	if s.w != null:
		return s.w
	match b.kind:
		"line":
			return _line_mn(b)
		"repl":
			return s.w if s.w != null else 0.0
	if s.nowrap:
		return _mx(b)
	var inner := 0.0
	if b.kind == "flex" and s.dir == "row":
		for c in b.kids:
			inner += _mn(c)
		inner += s.gap_c * maxf(0, b.kids.size() - 1)
	else:
		for c in b.kids:
			inner = maxf(inner, _mn(c))
	if s.ellip:
		inner = 0.0
	return maxf(inner + _hpad(s), s.minw)


func _resolve_w(b: Dictionary, avail: float, mode: String) -> float:
	var s: Dictionary = b.s
	var w: float
	if s.w != null:
		w = s.w
	elif s.wp != null:
		w = minf(avail * s.wp / 100.0, s.wmax)
	elif mode == "fill":
		w = avail
	else:
		w = minf(_mx(b), avail)
	if s.maxw < INF:
		w = minf(w, s.maxw)
	if s.maxw_pct > 0:
		w = minf(w, avail * s.maxw_pct / 100.0)
	return maxf(w, s.minw)


# ------------------------------------------------------------ colocacion
func _lay(b: Dictionary, w: float) -> void:
	var s: Dictionary = b.s
	b.w = w
	if b.kind == "line":
		_lay_line(b, w)
		return
	if b.kind == "repl":
		b.h = s.h if s.h != null else 0.0
		return
	var cw := maxf(0.0, w - _hpad(s))
	var ch := 0.0
	match b.kind:
		"block":
			ch = _lay_block(b, cw)
		"flex":
			ch = _lay_col(b, cw) if s.dir == "col" else _lay_row(b, cw)
		"grid":
			ch = _lay_grid(b, cw)
	var x0: float = s.pad[3] + s.bw[3]
	var y0: float = s.pad[0] + s.bw[0]
	for c in b.kids:
		c.x += x0
		c.y += y0
	b.h = ch + _vpad(s)
	if s.h != null:
		b.h = s.h
	_set_h(b, maxf(b.h, s.minh))


func _set_h(b: Dictionary, h: float) -> void:
	var d: float = h - b.h
	if d > 0.01 and b.s.vcenter:
		for c in b.kids:
			_shift(c, d / 2.0)
	b.h = h


func _shift(b: Dictionary, dy: float) -> void:
	b.y += dy


func _lay_block(b: Dictionary, cw: float) -> float:
	var y := 0.0
	for c in b.kids:
		var w: float
		if c.kind == "line":
			_lay_line(c, cw)
			c.x = 0.0
		else:
			var fit: bool = c.kind == "repl" or c.s.btn
			w = _resolve_w(c, cw, "fit" if fit else "fill")
			_lay(c, w)
			c.x = 0.0
			if fit and b.s.align == "center":
				c.x = (cw - w) / 2.0
			elif fit and b.s.align == "right":
				c.x = cw - w
		y += c.s.mt
		c.y = y
		y += c.h
	return y


func _lay_col(b: Dictionary, cw: float) -> float:
	var s: Dictionary = b.s
	var y := 0.0
	var n := 0
	for c in b.kids:
		if n:
			y += s.gap_r
		n += 1
		var w: float
		if c.kind == "line":
			if s.ai == "stretch":
				w = cw
			else:
				w = minf(_mx(c), cw)
			_lay_line(c, w)
		else:
			w = _resolve_w(c, cw, "fill" if s.ai == "stretch" else "fit")
			_lay(c, w)
		c.x = (cw - c.w) / 2.0 if s.ai == "center" else 0.0
		c.y = y
		y += c.h
	return y


func _lay_row(b: Dictionary, cw: float) -> float:
	var s: Dictionary = b.s
	var items: Array = b.kids
	var base := []
	for c in items:
		base.append(_mx(c) if c.kind == "line" else _resolve_w(c, cw, "fit"))
	# lineas (flex-wrap) o una sola linea encogiendo
	var rows := []
	if s.wrap:
		var cur := []
		var x := 0.0
		for i in items.size():
			var need: float = base[i] + (s.gap_c if cur.size() else 0.0)
			if cur.size() and x + need > cw + 0.01:
				rows.append(cur)
				cur = []
				x = 0.0
				need = base[i]
			cur.append(i)
			x += need
		if cur.size():
			rows.append(cur)
	else:
		var all := []
		for i in items.size():
			all.append(i)
		rows.append(all)
		var tot: float = s.gap_c * maxf(0, items.size() - 1)
		for v in base:
			tot += v
		var over: float = tot - cw
		var it := 0
		while over > 0.01 and it < 4:
			it += 1
			var wsum := 0.0
			for i in items.size():
				if base[i] > _mn(items[i]) + 0.01:
					wsum += base[i]
			if wsum <= 0:
				break
			var used := 0.0
			for i in items.size():
				var mn := _mn(items[i])
				if base[i] > mn + 0.01:
					var cut: float = minf(base[i] - mn, over * base[i] / wsum)
					base[i] -= cut
					used += cut
			over -= used
	var y := 0.0
	var rn := 0
	for row in rows:
		if rn:
			y += s.gap_r
		rn += 1
		var lh := 0.0
		var used := 0.0
		for i in row:
			var c: Dictionary = items[i]
			if c.kind == "line":
				_lay_line(c, base[i])
			else:
				_lay(c, base[i])
			lh = maxf(lh, c.h)
			used += c.w
		used += s.gap_c * maxf(0, row.size() - 1)
		var free: float = maxf(0.0, cw - used)
		var x := 0.0
		var gap: float = s.gap_c
		if s.just == "center":
			x = free / 2.0
		elif s.just == "between" and row.size() > 1:
			gap += free / (row.size() - 1)
		for i in row:
			var c: Dictionary = items[i]
			c.x = x
			if s.ai == "center":
				c.y = y + (lh - c.h) / 2.0
			else:
				c.y = y
				if s.ai == "stretch" and c.kind != "line":
					_set_h(c, lh)
			x += c.w + gap
		y += lh
	return y


func _lay_grid(b: Dictionary, cw: float) -> float:
	var s: Dictionary = b.s
	var items: Array = b.kids
	var cols: Array
	if s.autofit != "":
		var mn := 0.0
		var fs: float = s.fs
		match s.autofit:
			"two":
				mn = maxf(15.0 * fs, cw * 0.5 - 5.0)
			"shop":
				mn = minf(cw, 210.0 if built_size.y / k <= 430 else 250.0)
			"slots":
				mn = maxf(minf(cw, 15.0 * fs), cw * 0.334 - 6.0)
		var n := maxi(1, int(floor((cw + s.gap_c) / (mn + s.gap_c) + 0.0001)))
		var cnt := 0
		for c in items:
			if not c.s.span:
				cnt += 1
		n = mini(n, maxi(1, cnt))
		cols = []
		for i in n:
			cols.append("fr")
	else:
		cols = s.cols
	var n: int = cols.size()
	var rsp := -1
	for i in items.size():
		if items[i].s.rspan:
			rsp = i
	var c0 := 1 if rsp >= 0 else 0
	var nc := n - c0
	# colocar: [item, fila, col, ancho en columnas]
	var cells := []
	var r := 0
	var cc := 0
	for i in items.size():
		if i == rsp:
			continue
		var it: Dictionary = items[i]
		if it.s.span:
			if cc > 0:
				r += 1
				cc = 0
			cells.append([i, r, 0, n])
			r += 1
			continue
		cells.append([i, r, c0 + cc, 1])
		cc += 1
		if cc >= nc:
			cc = 0
			r += 1
	var nrows: int = r + (1 if cc > 0 else 0)
	# anchos de pista
	var ws := []
	ws.resize(n)
	ws.fill(0.0)
	var fixed: float = s.gap_c * (n - 1)
	var frs := 0.0
	for j in n:
		var tr = cols[j]
		if tr is float or tr is int:
			ws[j] = float(tr)
		elif tr == "auto":
			var m := 0.0
			for cl in cells:
				if cl[2] == j and cl[3] == 1:
					m = maxf(m, _mx(items[cl[0]]))
			if j == 0 and rsp >= 0:
				m = maxf(m, _mx(items[rsp]))
			ws[j] = m
		else:
			frs += 1.0
			continue
		fixed += ws[j]
	var rest := maxf(0.0, cw - fixed)
	for j in n:
		if str(cols[j]) == "fr":
			ws[j] = rest / frs
	var xs := []
	var xx := 0.0
	for j in n:
		xs.append(xx)
		xx += ws[j] + s.gap_c
	# alto de filas
	var rh := []
	rh.resize(nrows)
	rh.fill(0.0)
	for cl in cells:
		var it: Dictionary = items[cl[0]]
		var w := 0.0
		for j in range(cl[2], cl[2] + cl[3]):
			w += ws[j]
		w += s.gap_c * (cl[3] - 1)
		if it.kind == "line":
			_lay_line(it, w)
		else:
			var iw: float = w if (it.s.w == null and it.s.wp == null) else _resolve_w(it, w, "fill")
			_lay(it, iw)
		rh[cl[1]] = maxf(rh[cl[1]], it.h)
	var y := 0.0
	var ys := []
	for i in nrows:
		ys.append(y)
		y += rh[i] + (s.gap_r if i < nrows - 1 else 0.0)
	if rsp >= 0:
		var it: Dictionary = items[rsp]
		_lay(it, ws[0])
		if it.h > y:
			# la columna que ocupa todas las filas manda en el alto
			var extra: float = it.h - y
			if nrows > 0:
				rh[nrows - 1] += extra
			y = it.h
		it.x = 0.0
		it.y = 0.0
		_set_h(it, y)
	for cl in cells:
		var it: Dictionary = items[cl[0]]
		it.x = xs[cl[2]]
		var top: float = ys[cl[1]]
		var hh: float = rh[cl[1]]
		if s.ai == "center":
			it.y = top + (hh - it.h) / 2.0
		else:
			it.y = top
			if it.kind != "line":
				_set_h(it, hh)
	return y


# ------------------------------------------------------------ dibujo
func _paint() -> void:
	if root.is_empty():
		return
	var foc := ui.focus_el()
	for b in root.kids:
		_draw_box(b, Vector2(0, -sy), 1.0, foc)


func _sb(col: Color, r: float, bw: float = 0.0, bcol := Color.TRANSPARENT, center := true) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = col
	sb.draw_center = center
	sb.set_corner_radius_all(int(round(r)))
	sb.set_border_width_all(int(round(bw)))
	sb.border_color = bcol
	sb.anti_aliasing = r > 0
	sb.corner_detail = 6
	return sb


func _rrect_poly(r: Rect2, rad: float, c1: Color, c2: Color) -> void:
	var pts := PackedVector2Array()
	var cols := PackedColorArray()
	rad = minf(rad, minf(r.size.x, r.size.y) / 2.0)
	var corners := [[r.position + Vector2(rad, rad), PI], [Vector2(r.end.x - rad, r.position.y + rad), PI * 1.5],
		[r.end - Vector2(rad, rad), 0.0], [Vector2(r.position.x + rad, r.end.y - rad), PI * 0.5]]
	for cn in corners:
		var steps := 4 if rad > 0.5 else 0
		for i in steps + 1:
			var a: float = cn[1] + (PI * 0.5) * (float(i) / maxf(1, steps))
			var p: Vector2 = cn[0] + Vector2(cos(a), sin(a)) * rad
			pts.append(p)
			cols.append(c1.lerp(c2, clampf((p.y - r.position.y) / maxf(1.0, r.size.y), 0, 1)))
	paint.draw_polygon(pts, cols)


func _a(c: Color, al: float) -> Color:
	return Color(c.r, c.g, c.b, c.a * al)


func _draw_box(b: Dictionary, o: Vector2, al: float, foc: DomEl) -> void:
	var s: Dictionary = b.s
	var e: DomEl = b.e
	al *= s.op
	var pos: Vector2 = o + Vector2(b.x, b.y)
	var r := Rect2(pos * k, Vector2(b.w, b.h) * k)
	var on: bool = e != null and s.btn and ((e == foc and kbd) or e == hover)
	var act: bool = e != null and s.btn and e == press and not e.disabled
	if act:
		r.position.y += k
	var rad: float = s.rad * k
	if b.kind != "line":
		if s.drop:
			var sh := _sb(Color(0, 0, 0, 0.8 * al), rad)
			sh.shadow_color = Color(0, 0, 0, 0.8 * al)
			sh.shadow_size = int(20 * k)
			sh.shadow_offset = Vector2(0, 14 * k)
			sh.bg_color = Color(0, 0, 0, 0)
			paint.draw_style_box(sh, r)
		if s.ring != null:
			var g: float = s.ring[0] * k
			paint.draw_style_box(_sb(_a(s.ring[1], al), rad + g), r.grow(g))
		if s.drop2 != null:
			paint.draw_style_box(_sb(_a(s.drop2[1], al), rad), Rect2(r.position + Vector2(0, s.drop2[0] * k), r.size))
		var c1 = s.bg
		var c2 = s.bg2
		if on and s.bg_f != null:
			c1 = s.bg_f
			c2 = s.bg2_f
		if c1 != null:
			if c2 != null:
				_rrect_poly(r, rad, _a(c1, al), _a(c2, al))
			else:
				paint.draw_style_box(_sb(_a(c1, al), rad), r)
		if s.radial:
			_radial(r, rad, al)
		var bw: Array = s.bw
		var bi: float = bw[0] * k
		if act:
			if s.ins_t != null:
				paint.draw_rect(Rect2(r.position + Vector2(bi, bi), Vector2(r.size.x - 2 * bi, 2 * k)), _a(Color("#00000059"), al))
		else:
			if s.ins_t != null:
				paint.draw_rect(Rect2(r.position + Vector2(bi, bi), Vector2(r.size.x - 2 * bi, s.ins_t[0] * k)), _a(s.ins_t[1], al))
			if s.ins_b != null:
				var hb: float = s.ins_b[0] * k
				paint.draw_rect(Rect2(Vector2(r.position.x + bi, r.end.y - bi - hb), Vector2(r.size.x - 2 * bi, hb)), _a(s.ins_b[1], al))
		var bc = s.bcol
		if on and s.bcol_f != null:
			bc = s.bcol_f
		if bc != null:
			_border(r, bw, rad, _a(bc, al), s.dash)
		if s.stripe:
			_stripe(r, al)
		if e != null and e.tagName == "CANVAS" and e.canvas != null:
			var t := e.canvas.texture()
			if t:
				var ir := r.grow(-bw[0] * k)
				paint.draw_texture_rect(t, ir, false, Color(1, 1, 1, al))
		if e != null and e.tagName == "IMG":
			var t := _img(str(e.attrs.get("src", "")))
			if t:
				paint.draw_texture_rect(t, r, false, Color(1, 1, 1, al))
	else:
		_text(b, pos, al)
	for c in b.kids:
		_draw_box(c, pos, al, foc)
	if s.outline != null:
		var g2: float = (s.outline[0] + s.outline[1]) * k
		paint.draw_style_box(_sb(Color.TRANSPARENT, rad + g2, s.outline[0] * k, _a(s.outline[2], al), false), r.grow(g2))
	if on:
		var g3 := 4.0 * k
		paint.draw_style_box(_sb(Color.TRANSPARENT, rad + g3, 2.0 * k, _a(UiCss.YEL, al), false), r.grow(g3))


func _border(r: Rect2, bw: Array, rad: float, col: Color, dash: bool) -> void:
	if bw[0] == bw[1] and bw[1] == bw[2] and bw[2] == bw[3]:
		if bw[0] <= 0:
			return
		if dash:
			var w: float = bw[0] * k
			var dl := 3.0 * w
			for side in 4:
				var a: Vector2
				var d: Vector2
				var len: float
				match side:
					0:
						a = r.position + Vector2(0, w / 2)
						d = Vector2.RIGHT
						len = r.size.x
					1:
						a = Vector2(r.end.x - w / 2, r.position.y)
						d = Vector2.DOWN
						len = r.size.y
					2:
						a = Vector2(r.position.x, r.end.y - w / 2)
						d = Vector2.RIGHT
						len = r.size.x
					3:
						a = r.position + Vector2(w / 2, 0)
						d = Vector2.DOWN
						len = r.size.y
				var n := maxi(1, int(round((len / dl - 1) / 2.0)))
				var step: float = len / (2 * n + 1)
				for i in n + 1:
					var p0: Vector2 = a + d * (2 * i * step)
					paint.draw_line(p0, p0 + d * step, col, w)
			return
		paint.draw_style_box(_sb(Color.TRANSPARENT, rad, bw[0] * k, col, false), r)
		return
	# bordes sueltos (rectos)
	if bw[0] > 0:
		paint.draw_rect(Rect2(r.position, Vector2(r.size.x, bw[0] * k)), col)
	if bw[2] > 0:
		paint.draw_rect(Rect2(Vector2(r.position.x, r.end.y - bw[2] * k), Vector2(r.size.x, bw[2] * k)), col)
	if bw[3] > 0:
		paint.draw_rect(Rect2(r.position, Vector2(bw[3] * k, r.size.y)), col)
	if bw[1] > 0:
		paint.draw_rect(Rect2(Vector2(r.end.x - bw[1] * k, r.position.y), Vector2(bw[1] * k, r.size.y)), col)


func _stripe(r: Rect2, al: float) -> void:
	var x0 := r.position.x + 14 * k
	var x1 := r.end.x - 14 * k
	var y0 := r.position.y
	var h := 2.0 * k
	var stops := [[0.0, Color(0, 0, 0, 0)], [0.18, UiCss.ACC], [0.5, UiCss.YEL], [0.82, UiCss.CY], [1.0, Color(UiCss.CY, 0)]]
	stops[0][1] = Color(UiCss.ACC, 0)
	for i in 4:
		var a: Array = stops[i]
		var b2: Array = stops[i + 1]
		var xa: float = lerpf(x0, x1, a[0])
		var xb: float = lerpf(x0, x1, b2[0])
		var ca: Color = _a(a[1], al)
		var cb: Color = _a(b2[1], al)
		paint.draw_polygon(PackedVector2Array([Vector2(xa, y0), Vector2(xb, y0), Vector2(xb, y0 + h), Vector2(xa, y0 + h)]),
			PackedColorArray([ca, cb, cb, ca]))


func _radial(r: Rect2, rad: float, al: float) -> void:
	# radial-gradient(circle at 50% 62%, #1d2350 0, #0b0e1f 70%)
	var c := r.position + Vector2(r.size.x * 0.5, r.size.y * 0.62)
	var far := 0.0
	for p in [r.position, Vector2(r.end.x, r.position.y), r.end, Vector2(r.position.x, r.end.y)]:
		far = maxf(far, c.distance_to(p))
	paint.draw_style_box(_sb(_a(Color("#0b0e1f"), al), rad), r)
	var n := 24
	for i in range(n, 0, -1):
		var t := float(i) / n * 0.7
		var col := Color("#1d2350").lerp(Color("#0b0e1f"), float(i) / n)
		var rr := far * t
		var pts := PackedVector2Array()
		for j in 32:
			var a := TAU * j / 32.0
			var p := c + Vector2(cos(a), sin(a)) * rr
			p.x = clampf(p.x, r.position.x + 2 * k, r.end.x - 2 * k)
			p.y = clampf(p.y, r.position.y + 2 * k, r.end.y - 2 * k)
			pts.append(p)
		paint.draw_colored_polygon(pts, _a(col, al))


func _text(b: Dictionary, pos: Vector2, al: float) -> void:
	for it in b.get("pieces", []):
		var s: Dictionary = it.s
		var f := _fnt(s)
		var fs := _fsi(s)
		var p := Vector2(round((pos.x + it.x) * k), round((pos.y + it.by) * k))
		var t: String = it.t
		if s.glow > 0:
			var gs := int(round(s.glow * k * 0.5))
			paint.draw_string_outline(f, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, gs * 2, Color(0, 0, 0, 0.25 * al))
			paint.draw_string_outline(f, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, gs, Color(0, 0, 0, 0.35 * al))
		for sh in s.tsh:
			paint.draw_string(f, p + Vector2(round(sh[0] * k), round(sh[1] * k)), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, _a(sh[2], al))
		paint.draw_string(f, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, _a(s.color, al))


func _img(src: String) -> Texture2D:
	if _tex.has(src):
		return _tex[src]
	var t: Texture2D = null
	if src.begins_with("res://") and ResourceLoader.exists(src):
		t = load(src)
	_tex[src] = t
	return t


# ------------------------------------------------------------ raton y toque
func _hit(p: Vector2) -> DomEl:
	if root.is_empty():
		return null
	var q := p / k + Vector2(0, sy)
	var best: DomEl = null
	for b in root.kids:
		var r = _hit_box(b, q, Vector2.ZERO)
		if r:
			best = r
	return best


func _hit_box(b: Dictionary, q: Vector2, o: Vector2) -> Variant:
	var pos: Vector2 = o + Vector2(b.x, b.y)
	var inside := Rect2(pos, Vector2(b.w, b.h)).has_point(q)
	var found = null
	for c in b.kids:
		var r = _hit_box(c, q, pos)
		if r:
			found = r
	if found:
		return found
	if inside and b.e != null and (b.s.btn or b.e.attrs.has("data-act")):
		return b.e
	return null


func _gui_input(ev: InputEvent) -> void:
	if ev is InputEventMouseMotion:
		var m := ev as InputEventMouseMotion
		if drag.has("y"):
			if absf(m.position.y - drag.y) > 10 * k or drag.get("on"):
				drag.on = true
				press = null
				sy = clampf(drag.sy - (m.position.y - drag.y) / k, 0.0, maxf(0.0, content_h - size.y / k))
				paint.queue_redraw()
		var h := _hit(m.position)
		if h != hover and not game.touch_ui:
			hover = h
			paint.queue_redraw()
		accept_event()
	elif ev is InputEventMouseButton:
		var mb := ev as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP or mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			if mb.pressed:
				var d := -40.0 if mb.button_index == MOUSE_BUTTON_WHEEL_UP else 40.0
				sy = clampf(sy + d, 0.0, maxf(0.0, content_h - size.y / k))
				paint.queue_redraw()
		elif mb.button_index == MOUSE_BUTTON_LEFT:
			if mb.pressed:
				kbd = false
				press = _hit(mb.position)
				drag = {"y": mb.position.y, "sy": sy}
			else:
				var h := _hit(mb.position)
				var was := press
				var dragged: bool = drag.get("on", false)
				press = null
				drag = {}
				if was and h == was and not dragged and not was.disabled:
					ui.set_focus(was)
					ui.click(was)
			paint.queue_redraw()
		accept_event()


func set_kbd() -> void:
	if not kbd:
		kbd = true
		paint.queue_redraw()
	hover = null


func _scroll_to_focus() -> void:
	if root.is_empty():
		return
	var f := ui.focus_el()
	if f == null:
		return
	var rr = _find_rect(root.kids, f, Vector2.ZERO)
	if rr == null:
		return
	var vh := size.y / k
	var r: Rect2 = rr
	if r.position.y - 8 < sy:
		sy = maxf(0.0, r.position.y - 8)
	elif r.end.y + 8 > sy + vh:
		sy = minf(maxf(0.0, content_h - vh), r.end.y + 8 - vh)


func _find_rect(kids: Array, e: DomEl, o: Vector2) -> Variant:
	for b in kids:
		var pos: Vector2 = o + Vector2(b.x, b.y)
		if b.e == e:
			return Rect2(pos, Vector2(b.w, b.h))
		var r = _find_rect(b.kids, e, pos)
		if r != null:
			return r
	return null
