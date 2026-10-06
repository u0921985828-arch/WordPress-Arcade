## Hojas de sprites: las mismas PNG de art/ (en el HTML van en base64).

func loadArt() -> void:
	var f := FileAccess.open("res://godot/data/art.json", FileAccess.READ)
	ART = _intify(JSON.parse_string(f.get_as_text()))
	for k in ART:
		var d: Dictionary = ART[k]
		d["src"] = "res://art/" + k + ".png"   # <img src> de los menus (ilustraciones)
		var o := {"fw": d.fw, "fh": d.fh, "n": d.get("n", 1), "x1": d.get("x1", 0), "ok": false, "img": null, "wimg": null}
		SHEET[k] = o
		var tex = load("res://art/" + k + ".png")
		if tex is Texture2D:
			o.img = ImgCtx.from_image((tex as Texture2D).get_image())
			o.img._tex = tex
			o.img._dirty = false
			o.wimg = WhiteTex.new(tex)
			o.ok = true
