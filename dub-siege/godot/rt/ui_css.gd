class_name UiCss
extends RefCounted
## La hoja de estilo de los menus de dub-siege.html (<style>: .ov, .panel,
## .btn, .menu, .stats...) escrita como reglas en GDScript. Da, para cada
## elemento, un diccionario de estilo en px CSS que usa UiView para colocar y
## pintar. Mismo orden que la cascada del navegador: lo de mas abajo manda.

const INF := 1.0e9
const INK := Color("#eef3ff")
const DIM := Color("#8f98c8")
const ACC := Color("#ff3d6e")
const YEL := Color("#ffd23f")
const CY := Color("#3de8ff")
const GRN := Color("#4dff88")
const PANEL := Color("#121730")
const LINE := Color("#3a4680")
const BTN_H := 44.0   # alto minimo de un boton (dedo), como .btn en la web

## c: {vw, vh (px CSS por 1 %), h600, h430, w480, vp, title}


static func clampf3(lo: float, v: float, hi: float) -> float:
	return clampf(v, lo, hi)


static func rgba(r: int, g: int, b: int, a: float) -> Color:
	return Color(r / 255.0, g / 255.0, b / 255.0, a)


static func root_style() -> Dictionary:
	return {"color": INK, "fs": 16.0, "lh": 1.0, "align": "left", "ls": 0.0, "tsh": [], "glow": 0.0, "nowrap": false}


static func _has(e: DomEl, c: String) -> bool:
	return e != null and e.classList.contains(c)


static func _only_el(e: DomEl) -> bool:
	for k in e.parent.children:
		if k != e and k.tagName != "#TEXT":
			return false
	return true


static func _in(e: DomEl, c: String) -> bool:
	var p := e.parent
	while p:
		if p.classList.contains(c):
			return true
		p = p.parent
	return false


static func _parent_has(e: DomEl, c: String) -> bool:
	return e.parent != null and e.parent.classList.contains(c)


static func _px(v: Variant) -> float:
	var s := str(v)
	if s.ends_with("px"):
		return float(s.trim_suffix("px"))
	return float(s)


## Estilo de e dentro de un padre con estilo ps.
static func of(e: DomEl, ps: Dictionary, c: Dictionary) -> Dictionary:
	var s := {
		"color": ps.color, "fs": ps.fs, "lh": ps.lh, "align": ps.align, "ls": ps.ls,
		"tsh": ps.tsh, "glow": ps.glow, "nowrap": ps.nowrap,
		"disp": "inline", "dir": "col", "wrap": false, "just": "start", "ai": "stretch",
		"pad": [0.0, 0.0, 0.0, 0.0], "bw": [0.0, 0.0, 0.0, 0.0], "bcol": null, "rad": 0.0,
		"bg": null, "bg2": null, "gap_r": 0.0, "gap_c": 0.0,
		"w": null, "wp": null, "wmax": INF, "maxw": INF, "maxw_pct": 0.0, "minw": 0.0, "minh": 0.0, "h": null,
		"cols": null, "autofit": "", "span": false, "rspan": false, "vcenter": false,
		"op": 1.0, "ins_t": null, "ins_b": null, "ring": null, "drop": false, "drop2": null, "stripe": false,
		"dash": false, "outline": null, "mt": 0.0, "ml": 0.0, "ellip": false, "btn": false,
		"bg_f": null, "bg2_f": null, "bcol_f": null, "radial": false,
	}
	var t := e.tagName
	match t:
		"DIV", "P", "H1", "H2", "H3", "OL", "UL", "LI":
			s.disp = "block"
		"BUTTON":
			s.disp = "iblock"
			s.btn = true
			s.vcenter = true
			s.align = "center"
		"IMG", "CANVAS", "INPUT":
			s.disp = "repl"
		"BR":
			s.disp = "br"
		"SMALL":
			s.fs = ps.fs * 0.833
		"I":
			pass
	var vw: float = c.vw
	var vh: float = c.vh
	var ttl: bool = c.title
	var fs: float = s.fs

	# ---- .panel
	if _has(e, "panel"):
		s.disp = "flex"
		s.dir = "col"
		s.ai = "center"
		s.align = "center"
		s.gap_r = clampf(1.5 * vh, 5, 12)
		s.gap_c = s.gap_r
		s.fs = clampf(minf(1.7 * vw, 2.4 * vh), 9, 14)
		s.lh = 1.6
		s.wp = 100.0
		s.wmax = minf(640, 96 * vw)
		if _has(e, "wide"):
			s.wmax = minf(860, 96 * vw)
		if _has(e, "sl3"):
			s.wmax = minf(1000, 96 * vw)
		if ttl:
			s.gap_r = 10.0
			s.gap_c = 10.0
		if c.h430:
			s.lh = 1.45
		if not ttl:
			s.bg = Color("#161c3cf2")
			s.bg2 = Color("#0c1024f2")
			s.bw = [2.0, 2.0, 2.0, 2.0]
			s.bcol = Color("#2b3570")
			s.rad = 6.0
			s.ring = [2.0, Color("#05060c")]
			s.drop = true
			var pv := clampf(2.6 * vh, 10, 24)
			var ph := clampf(2.6 * vw, 12, 30)
			s.pad = [pv, ph, pv, ph]
			s.stripe = true
			if _has(e, "tape"):
				s.pad = [6.0, 10.0, 6.0, 10.0]
				s.wmax = minf(664, 96 * vw)
				if c.h430:
					s.pad = [0.0, 8.0, 0.0, 8.0]
					s.bw = [0.0, 2.0, 0.0, 2.0]
	fs = s.fs
	if t == "H1" and _parent_has(e, "panel"):
		s.fs = clampf(minf(12 * vw, 17 * vh), 26, 88)
		if c.vp and ttl:
			s.fs = clampf(minf(11 * vw, 7 * vh), 24, 64)
		s.lh = 0.95
		s.color = ACC
		s.tsh = [[0.0, 0.06 * s.fs, Color("#7a1030")], [0.05 * s.fs, 0.12 * s.fs, Color.BLACK]]
		s.glow = 0.5 * s.fs if ttl else 0.0
	elif t == "H2" and _in(e, "panel"):
		s.fs = clampf(minf(3.4 * vw, 4.6 * vh), 13, 26)
		s.color = YEL
		s.tsh = [[2.0, 2.0, Color.BLACK]]
		s.ls = 0.04 * s.fs
	elif t == "H3" and _in(e, "panel"):
		s.fs = clampf(minf(2 * vw, 2.8 * vh), 10, 15)
		s.color = CY
	fs = s.fs
	if _has(e, "kick"):
		s.color = CY
		s.ls = 0.12 * fs
	if _has(e, "dim"):
		s.color = DIM
		s.maxw = 52 * fs
		s.maxw_pct = 96.0
		if _has(e, "sv"):
			s.color = Color("#8fe0b0")
			s.fs = fs * 0.85
	if ttl and (_has(e, "kick") or _has(e, "dim")):
		s.tsh = [[0.0, 2.0, Color.BLACK]]
		s.glow = 8.0
	if _has(e, "coins"):
		s.color = YEL
	if _has(e, "no"):
		s.color = Color("#ff8aa6")
	if _has(e, "meds"):
		s.disp = "flex"
		s.dir = "row"
		s.gap_r = 0.5 * fs
		s.gap_c = 0.5 * fs
		s.wrap = true
		s.just = "center"
	if _has(e, "md"):
		s.color = YEL if _has(e, "on") else Color("#8e97c4")
		s.pad = [0.2 * fs, 0.5 * fs, 0.2 * fs, 0.5 * fs]
		s.bw = [1.0, 1.0, 1.0, 1.0]
		s.bcol = YEL if _has(e, "on") else Color("#2b3570")
		s.rad = 3.0
	if _has(e, "note"):
		s.color = GRN
		s.minh = 1.7 * fs
	if _has(e, "lore"):
		s.maxw = 46 * fs
		s.maxw_pct = 96.0
		s.align = "left"
		s.lh = 1.75
	if _has(e, "ill"):
		s.disp = "repl"
		s.w = _px(e.style.props.get("width", "160px"))
		s.h = _px(e.style.props.get("height", "90px"))
		s.outline = [2.0, 0.0, Color("#1a1530")]

	# ---- .menu
	if _has(e, "menu"):
		s.disp = "flex"
		s.dir = "col"
		s.gap_r = clampf(1.2 * vh, 5, 8)
		s.gap_c = s.gap_r
		s.wp = 100.0
		s.wmax = 340.0
		if c.h600:
			s.disp = "grid"
			s.cols = ["fr", "fr"]
			s.wmax = 560.0
		if _has(e, "two") and _in(e, "panel"):
			s.disp = "grid"
			s.cols = null
			s.autofit = "two"
			s.wmax = 780.0
		if _has(e, "tapes") and c.w480:
			s.disp = "grid"
			s.cols = ["fr", "fr"]
			s.wmax = 680.0
		if _has(e, "lkm") and not c.h600:
			# html.h600 .lkm va antes que html.h600 .menu en la hoja: manda la rejilla
			s.wmax = 360.0
		if _has(e, "one"):
			s.disp = "flex"
			s.cols = null
			s.wmax = 460.0
	if _has(e, "hot") and _in(e, "menu"):
		s.span = true
	# html.h600 .menu>.btn:only-child: un boton solo ocupa toda la fila
	if _has(e, "btn") and e.parent != null and _has(e.parent, "menu") and _only_el(e):
		s.span = true

	# ---- .btn
	if _has(e, "btn"):
		s.fs = fs
		s.color = INK
		s.bg = Color("#1b2350")
		s.bg2 = Color("#121730")
		s.bw = [2.0, 2.0, 2.0, 2.0]
		s.bcol = LINE
		s.minh = BTN_H * maxf(1.0, 1.0 / float(c.get("m", 1.0)))   # 44 px reales como minimo (dedo)
		s.pad = [0.55 * fs, 0.9 * fs, 0.55 * fs, 0.9 * fs]
		s.rad = 4.0
		s.align = "center"
		s.ins_t = [2.0, Color("#ffffff14")]
		s.ins_b = [3.0, Color("#00000059")]
		s.bg_f = Color("#2a3672")
		s.bg2_f = Color("#1c2452")
		s.bcol_f = Color("#5b6bb8")
		if _has(e, "hot"):
			s.bg = Color("#17502e")
			s.bg2 = Color("#0d2e1b")
			s.bcol = GRN
			s.bcol_f = GRN
			s.color = Color("#d4ffe3")
			s.ins_t = [2.0, Color("#ffffff1c")]
			s.ins_b = [3.0, Color("#0000005c")]
			s.bg_f = Color("#1f6a3d")
			s.bg2_f = Color("#123d24")
		if _has(e, "warn"):
			s.bg = Color("#4a1426")
			s.bg2 = Color("#2a0b16")
			s.bcol = ACC
			s.bcol_f = ACC
			s.color = Color("#ffd6e0")
			s.bg_f = Color("#62193a")
			s.bg2_f = Color("#3a0f1f")
		if _has(e, "item"):
			s.bcol = Color("#2f3a78")
		if ttl:
			s.bg = rgba(18, 23, 48, 0.88)
			s.bg2 = null
			s.ins_t = null
			s.ins_b = null
			s.drop2 = [2.0, Color("#000000aa")]
			s.bg_f = rgba(24, 46, 34, 0.92)
			s.bg2_f = null
			if _has(e, "hot"):
				s.bg = rgba(24, 46, 34, 0.92)
		if e.disabled:
			s.op = 0.4
			s.ins_t = null
			s.ins_b = null
		elif _has(e, "off"):
			s.op = 0.5
		if _parent_has(e, "tapes"):
			s.align = "left"
			s.pad = [6.0, 10.0, 6.0, 10.0]
			s.minh = BTN_H * maxf(1.0, 1.0 / float(c.get("m", 1.0)))
	fs = s.fs
	if t == "SMALL" and _parent_has(e, "cont"):
		s.fs = ps.fs * 0.72
		if c.h430:
			s.ml = 0.6 * s.fs
		else:
			s.disp = "block"
			s.mt = 0.35 * s.fs
		s.color = Color("#8fe0b0")
		s.ls = 0.02 * s.fs

	# ---- .opt
	if _has(e, "opt"):
		s.disp = "flex"
		s.dir = "row"
		s.just = "between"
		s.ai = "center"
		s.gap_c = 12.0
		s.align = "left"
	if t == "I" and _parent_has(e, "opt"):
		s.color = ACC if (_has(e, "lock") and _in(e, "lkm")) else YEL
		s.pad = [0.2 * fs, 0.5 * fs, 0.2 * fs, 0.5 * fs]
		s.bg = Color("#0000004d")
		s.bw = [1.0, 1.0, 1.0, 1.0]
		s.bcol = Color("#ffd23f40")
		s.rad = 3.0
		s.lh = 1.2
		s.nowrap = true

	# ---- .row / iniciales
	if _has(e, "row"):
		s.disp = "flex"
		s.dir = "row"
		s.gap_r = 8.0
		s.gap_c = 8.0
		s.wrap = true
		s.just = "center"
		if _has(e, "tgs"):
			s.ai = "center"
	if _has(e, "tgc"):
		s.disp = "flex"
		s.dir = "col"
		s.ai = "center"
		s.gap_r = 4.0
	if t == "B" and _parent_has(e, "tgc"):
		s.fs = 22.0
		s.lh = 1.0
		s.color = YEL
		s.bg = Color.BLACK
		s.bw = [2.0, 2.0, 2.0, 2.0]
		s.bcol = YEL if _has(e, "on") else LINE
		s.rad = 4.0
		s.pad = [0.3 * 22, 0.35 * 22, 0.3 * 22, 0.35 * 22]
		s.minw = 1.7 * 22
		s.align = "center"
	if _has(e, "tgb"):
		s.minw = 44.0
		s.minh = BTN_H * maxf(1.0, 1.0 / float(c.get("m", 1.0)))
		s.pad = [0.2 * fs, 0.6 * fs, 0.2 * fs, 0.6 * fs]

	# ---- .stats
	if _has(e, "stats"):
		s.disp = "grid"
		s.cols = ["fr", "auto"]
		s.gap_r = clampf(0.6 * vh, 2, 4)
		s.gap_c = 18.0
		s.wp = 100.0
		s.wmax = 380.0
		s.align = "left"
		s.pad = [0.5 * fs, 0.8 * fs, 0.5 * fs, 0.8 * fs]
		s.bg = Color("#00000033")
		s.bw = [1.0, 1.0, 1.0, 1.0]
		s.bcol = Color("#232c5c")
		s.rad = 4.0
	if _parent_has(e, "stats"):
		if t == "B":
			s.color = YEL
			s.align = "right"
		if t == "SPAN":
			s.color = DIM
		if _has(e, "tot"):
			s.color = GRN
			s.bw = [1.0, 0.0, 0.0, 0.0]
			s.bcol = LINE
			s.pad = [4.0, 0.0, 0.0, 0.0]

	# ---- tienda
	if _has(e, "shop"):
		s.disp = "grid"
		s.autofit = "shop"
		s.gap_r = 8.0
		s.gap_c = 8.0
		s.wp = 100.0
	if _has(e, "item"):
		s.disp = "flex"
		s.dir = "col"
		s.gap_r = 4.0
		s.ai = "stretch"
		s.align = "left"
		s.lh = 1.6
		s.vcenter = false
	if _parent_has(e, "item"):
		if t == "SPAN":
			s.disp = "flex"
			s.dir = "row"
			s.just = "between"
			s.gap_c = 8.0
		if t == "SMALL":
			s.color = DIM
			s.fs = ps.fs * 0.85
	if _has(e, "c") and _in(e, "item"):
		s.color = YEL
		s.pad = [0.0, 0.4 * fs, 0.0, 0.4 * fs]
		s.bg = Color("#0000004d")
		s.rad = 3.0
	if _has(e, "pips"):
		s.color = CY
		s.ls = 2.0

	# ---- .keys
	if _has(e, "keys"):
		s.disp = "grid"
		s.cols = ["auto", "fr"]
		s.gap_r = clampf(0.9 * vh, 3, 6)
		s.gap_c = 16.0
		s.align = "left"
		s.wp = 100.0
		s.wmax = 520.0
		if c.h600:
			s.cols = ["auto", "fr", "auto", "fr"]
			s.wmax = 760.0
	if t == "B" and _parent_has(e, "keys"):
		s.color = YEL

	# ---- ranking
	if t == "OL" and _has(e, "rank"):
		s.wp = 100.0
		s.wmax = 480.0
	if t == "LI" and e.parent and _has(e.parent, "rank"):
		s.disp = "grid"
		s.cols = [2.6 * fs, 3.6 * fs, "fr", "auto"]
		s.gap_c = 8.0
		s.gap_r = 8.0
		s.pad = [4.0, 6.0, 4.0, 6.0]
		s.bw = [0.0, 0.0, 1.0, 0.0]
		s.bcol = PANEL
		s.align = "left"
		var ix: int = e.parent.children.filter(func(x): return not x.is_text()).find(e)
		if ix == 0:
			s.color = YEL
		if ix % 2 == 1:
			s.bg = Color("#ffffff06")
		if _has(e, "me"):
			s.bg = Color("#10351f")
			s.color = Color("#c6ffd9")
	if _has(e, "x") and _in(e, "rank"):
		s.color = DIM

	# ---- personaje
	if _has(e, "lkw"):
		s.disp = "flex"
		s.dir = "row"
		s.gap_c = clampf(2 * vw, 8, 18)
		s.gap_r = s.gap_c
		s.ai = "center"
		s.just = "center"
		s.wp = 100.0
		s.wrap = not c.h600
	if e.attrs.get("id") == "lkc":
		s.w = 120.0 if c.h600 else 180.0
		s.h = s.w
		s.radial = true
		s.bw = [2.0, 2.0, 2.0, 2.0]
		s.bcol = LINE
		s.rad = 6.0
	if _has(e, "lkh") and c.h600:
		s.disp = "none"
	if c.h600 and _has(e, "btn") and _in(e, "lkm"):
		s.minh = BTN_H * maxf(1.0, 1.0 / float(c.get("m", 1.0)))
		s.pad = [0.35 * fs, 0.8 * fs, 0.35 * fs, 0.8 * fs]

	# ---- ranuras
	if _has(e, "slots"):
		s.disp = "grid"
		s.autofit = "slots"
		s.gap_r = 8.0
		s.gap_c = 8.0
		s.wp = 100.0
	if _has(e, "slot") and _has(e, "btn"):
		s.disp = "grid"
		s.cols = ["auto", "fr"]
		s.gap_c = 0.8 * fs
		s.gap_r = 0.25 * fs
		s.ai = "center"
		s.align = "left"
		s.pad = [0.6 * fs, 0.8 * fs, 0.6 * fs, 0.5 * fs]
		s.lh = 1.35
		s.vcenter = false
		if _has(e, "empty"):
			s.dash = true
			s.bg = Color("#0b0f22b3")
			s.bg2 = null
			s.ins_t = null
			s.ins_b = null
	if e.parent and _has(e.parent, "slot") and _has(e.parent, "btn"):
		var emp := _has(e.parent, "empty")
		if _has(e, "sn"):
			s.rspan = true
			s.disp = "flex"
			s.dir = "row"
			s.ai = "center"
			s.just = "center"
			s.vcenter = true
			s.minw = 1.7 * fs * 1.7
			s.pad = [0.0, 0.55 * fs * 1.7, 0.0, 0.0]
			s.bw = [0.0, 1.0, 0.0, 0.0]
			s.bcol = Color("#ffffff1a")
			s.fs = fs * 1.7
			s.color = Color("#4a578f") if emp else CY
			s.tsh = [[2.0, 2.0, Color.BLACK]]
		if _has(e, "sl"):
			s.disp = "flex"
			s.dir = "row"
			s.just = "between"
			s.ai = "center"
			s.gap_c = 0.6 * fs
			s.nowrap = true
			if emp:
				s.color = DIM
			if _has(e.parent, "done"):
				s.color = GRN
		if _has(e, "sd") or _has(e, "sm"):
			s.nowrap = true
			s.ellip = true
			s.color = DIM
		if _has(e, "sm"):
			s.disp = "flex"
			s.dir = "row"
			s.just = "between"
			s.gap_c = 0.6 * fs
			s.fs = fs * 0.78
	if e.parent and (_has(e.parent, "sl") or _has(e.parent, "sm")) and _in(e, "slot"):
		if t == "B":
			s.ellip = true
			if _has(e.parent, "sm"):
				s.color = INK
		if t == "I" and _has(e.parent, "sl"):
			s.fs = fs * 0.78
			s.color = YEL
			s.pad = [0.15 * s.fs, 0.4 * s.fs, 0.15 * s.fs, 0.4 * s.fs]
			s.bg = Color("#0000004d")
			s.rad = 3.0
	# Panel que no cabe (ovFit en el HTML): .t1 menos aire, .t2 letra menor y sin nota
	var tl: int = int(c.get("t", 0))
	if tl >= 1:
		if _has(e, "panel"):
			s.gap_r = 4.0
			s.gap_c = 4.0
			s.lh = 1.35
		if (_has(e, "menu") or _has(e, "shop")) and _in(e, "panel"):
			s.gap_r = 5.0
			s.gap_c = 5.0
		if _has(e, "shop"):
			s.autofit = "shop1"
		if _has(e, "item"):
			s.lh = 1.3
			s.gap_r = 2.0
		if s.btn:
			s.pad = [0.3 * s.fs, s.pad[1], 0.3 * s.fs, s.pad[3]]
	if tl >= 2:
		if _has(e, "panel"):
			s.fs = s.fs * 0.88
			s.gap_r = 2.0
			s.gap_c = 2.0
		if _has(e, "tip"):
			s.disp = "none"
		if _has(e, "dim"):
			s.lh = 1.25
		if _has(e, "shop"):
			s.autofit = "shop2"
		if t == "SMALL" and _in(e, "item"):
			s.fs = ps.fs * 0.75
	# los hijos de un flex o grid se vuelven bloque (blockification de CSS)
	if s.disp == "inline" and ps.get("disp", "") in ["flex", "grid"]:
		s.disp = "block"
	return s
