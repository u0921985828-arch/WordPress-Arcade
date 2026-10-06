class_name WebSaves
## Lee las partidas que guardó la app antigua (la web dentro de un WebView).
## El WebView guarda localStorage en una base LevelDB dentro de la carpeta de
## la app; como la app nueva tiene el mismo paquete y la misma firma, Android
## conserva esa carpeta al actualizar. Aquí se lee sin dependencias: registro
## (.log), tablas (.ldb/.sst) y descompresión Snappy. Solo lectura.

const BLOCK := 32768


## Carpetas donde el WebView de Android deja la base (según versión).
static func android_dirs() -> Array:
	var base := OS.get_user_data_dir().get_base_dir()  # .../online.kuboplay.dubsiege
	return [
		base + "/app_webview/Default/Local Storage/leveldb",
		base + "/app_webview/Local Storage/leveldb",
	]


## Devuelve {clave: texto} de localStorage con las claves que empiezan por
## `prefix` (de cualquier origen). Vacío si no hay base o no se entiende.
static func read(dir: String, prefix := "ds2_") -> Dictionary:
	var best := {}  # clave interna -> [seq, valor o null si se borró]
	var da := DirAccess.open(dir)
	if da == null:
		return {}
	for f in da.get_files():
		var p := dir + "/" + f
		if f.ends_with(".log"):
			_read_log(FileAccess.get_file_as_bytes(p), best)
		elif f.ends_with(".ldb") or f.ends_with(".sst"):
			_read_table(FileAccess.get_file_as_bytes(p), best)
	var out := {}
	for k in best:
		var e: Array = best[k]
		if e[1] == null:
			continue
		var name = _ls_key(k)
		if name == null or not String(name).begins_with(prefix):
			continue
		var v = _ls_str(e[1])
		if v != null:
			out[name] = v
	return out


static func _put(best: Dictionary, key: PackedByteArray, seq: int, val) -> void:
	var e = best.get(key)
	if e == null or seq >= int(e[0]):
		best[key] = [seq, val]


# ------------------------------------------------------------ registro (.log)
static func _read_log(d: PackedByteArray, best: Dictionary) -> void:
	var i := 0
	var rec := PackedByteArray()
	while i + 7 <= d.size():
		var left := BLOCK - (i % BLOCK)
		if left < 7:  # relleno al final del bloque
			i += left
			continue
		var n := d[i + 4] | (d[i + 5] << 8)
		var t := d[i + 6]
		if t == 0 or i + 7 + n > d.size():
			break
		var part := d.slice(i + 7, i + 7 + n)
		i += 7 + n
		match t:
			1:
				_batch(part, best)
			2:
				rec = part
			3:
				rec.append_array(part)
			4:
				rec.append_array(part)
				_batch(rec, best)
				rec = PackedByteArray()


static func _batch(b: PackedByteArray, best: Dictionary) -> void:
	if b.size() < 12:
		return
	var seq := b.decode_u64(0)
	var cnt := b.decode_u32(8)
	var i := 12
	for _n in cnt:
		if i >= b.size():
			return
		var tag := b[i]
		i += 1
		var r := _vi(b, i)
		var key := b.slice(r[1], r[1] + r[0])
		i = r[1] + r[0]
		if tag == 1:
			r = _vi(b, i)
			_put(best, key, seq, b.slice(r[1], r[1] + r[0]))
			i = r[1] + r[0]
		else:
			_put(best, key, seq, null)
		seq += 1


# ------------------------------------------------------------ tablas (.ldb)
static func _read_table(d: PackedByteArray, best: Dictionary) -> void:
	if d.size() < 48:
		return
	var f := d.slice(d.size() - 48)
	var r := _vi(f, 0)
	r = _vi(f, r[1])  # salta el bloque meta
	var io := _vi(f, r[1])
	var isz := _vi(f, io[1])
	var index := _block(d, io[0], isz[0])
	for e in _entries(index):
		var h := _vi(e[1], 0)
		var hs := _vi(e[1], h[1])
		for kv in _entries(_block(d, h[0], hs[0])):
			var ik: PackedByteArray = kv[0]
			if ik.size() < 8:
				continue
			var tail := ik.decode_u64(ik.size() - 8)
			var key := ik.slice(0, ik.size() - 8)
			_put(best, key, tail >> 8, kv[1] if (tail & 0xff) == 1 else null)


static func _block(d: PackedByteArray, off: int, n: int) -> PackedByteArray:
	if off < 0 or off + n + 1 > d.size():
		return PackedByteArray()
	var raw := d.slice(off, off + n)
	return snappy(raw) if d[off + n] == 1 else raw


static func _entries(b: PackedByteArray) -> Array:
	var out := []
	if b.size() < 4:
		return out
	var nr := b.decode_u32(b.size() - 4)
	var end := b.size() - 4 - 4 * nr
	var i := 0
	var last := PackedByteArray()
	while i < end:
		var s := _vi(b, i)
		var ns := _vi(b, s[1])
		var vl := _vi(b, ns[1])
		i = vl[1]
		var key := last.slice(0, s[0])
		key.append_array(b.slice(i, i + ns[0]))
		i += ns[0]
		out.append([key, b.slice(i, i + vl[0])])
		i += vl[0]
		last = key
	return out


## Descompresión Snappy (formato de bloque, el que usa LevelDB).
static func snappy(s: PackedByteArray) -> PackedByteArray:
	var r := _vi(s, 0)
	var o := PackedByteArray()
	o.resize(r[0])
	var op := 0
	var i: int = r[1]
	while i < s.size() and op < o.size():
		var tag := s[i]
		i += 1
		var kind := tag & 3
		var n := 0
		var off := 0
		if kind == 0:  # literal
			n = tag >> 2
			if n >= 60:
				var nb := n - 59
				n = 0
				for k in nb:
					n |= s[i + k] << (8 * k)
				i += nb
			n += 1
			for k in n:
				o[op + k] = s[i + k]
			i += n
			op += n
			continue
		if kind == 1:
			n = ((tag >> 2) & 7) + 4
			off = ((tag >> 5) << 8) | s[i]
			i += 1
		elif kind == 2:
			n = (tag >> 2) + 1
			off = s[i] | (s[i + 1] << 8)
			i += 2
		else:
			n = (tag >> 2) + 1
			off = s.decode_u32(i)
			i += 4
		if off <= 0 or off > op:
			return PackedByteArray()
		for k in n:  # copia byte a byte: puede solaparse
			o[op + k] = o[op - off + k]
		op += n
	return o


# ------------------------------------------------------------ localStorage
## Clave de Chromium: "_" + origen + "\0" + (1 latin1 | 0 utf16le) + nombre.
static func _ls_key(k: PackedByteArray):
	if k.size() < 3 or k[0] != 0x5f:
		return null
	var z := k.find(0)
	if z < 0 or z + 1 >= k.size():
		return null
	return _ls_str(k.slice(z + 1))


## Valor: primer byte 1 = latin1, 0 = utf16le.
static func _ls_str(v: PackedByteArray):
	if v.is_empty():
		return null
	if v[0] == 0:
		return v.slice(1).get_string_from_utf16()
	if v[0] != 1:
		return null
	var s := ""
	for k in range(1, v.size()):
		s += char(v[k])
	return s


static func _vi(b: PackedByteArray, i: int) -> Array:
	var r := 0
	var sh := 0
	while i < b.size():
		var c := b[i]
		i += 1
		r |= (c & 127) << sh
		sh += 7
		if c < 128:
			break
	return [r, i]
