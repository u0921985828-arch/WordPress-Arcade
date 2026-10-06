class_name JsBase
extends RefCounted
## Ayudas para el codigo traducido de JavaScript (tools/js2gd.js): acceso con
## la semantica de JS (leer fuera de rango da null, no error), metodos de
## array/cadena con el mismo comportamiento y temporizadores (setTimeout).

var win := {}                 # sustituto de window.* (depuracion)
var _timers: Array = []       # [{id, at, f}]
var _tid := 0
var _rafs: Array = []
var _clock := 0.0             # ms de juego (lo avanza el bucle)
static var _DATA: Dictionary = {}


# ------------------------------------------------------------ datos
static func _intify(v: Variant) -> Variant:
	## JSON da todos los numeros como float; los enteros vuelven a int para que
	## str() escriba "30" y no "30.0" (como hace JS).
	match typeof(v):
		TYPE_FLOAT:
			if is_finite(v) and v == floorf(v) and absf(v) < 9.0e15:
				return int(v)
			return v
		TYPE_ARRAY:
			var a: Array = v
			for i in a.size():
				a[i] = _intify(a[i])
			return a
		TYPE_DICTIONARY:
			var d: Dictionary = v
			for k in d.keys():
				d[k] = _intify(d[k])
			return d
	return v


func _data(name: String) -> Variant:
	if _DATA.is_empty():
		var f := FileAccess.open("res://godot/data/data.json", FileAccess.READ)
		_DATA = _intify(JSON.parse_string(f.get_as_text()))
	return _DATA.get(name)


# ------------------------------------------------------------ acceso
static func _key(k: Variant) -> Variant:
	if k is float and k == floorf(k):
		return int(k)
	return k


func _ix(a: Variant, k: Variant) -> Variant:
	match typeof(a):
		TYPE_ARRAY, TYPE_PACKED_BYTE_ARRAY, TYPE_PACKED_INT32_ARRAY, TYPE_PACKED_FLOAT32_ARRAY, TYPE_PACKED_STRING_ARRAY:
			if not (k is int or k is float):
				return null
			var i := int(k)
			if i < 0 or i >= a.size() or float(i) != float(k):
				return null
			return a[i]
		TYPE_DICTIONARY:
			k = _key(k)
			var v = a.get(k)
			if v == null:
				if k is String and k.is_valid_int():
					return a.get(int(k))
				if k is int:
					return a.get(str(k))
			return v
		TYPE_STRING, TYPE_STRING_NAME:
			var s := String(a)
			var j := int(k)
			if j < 0 or j >= s.length():
				return null
			return s[j]
		TYPE_OBJECT:
			if a == null:
				return null
			return a.get(str(k))
	return null


func _has(o: Variant, k: Variant) -> bool:
	if o is Dictionary:
		k = _key(k)
		return o.has(k) or (k is int and o.has(str(k))) or (k is String and k.is_valid_int() and o.has(int(k)))
	if o is Array:
		var i := int(k)
		return i >= 0 and i < o.size()
	if o is Object:
		return o.get(str(k)) != null
	return false


func _len(x: Variant) -> int:
	match typeof(x):
		TYPE_STRING, TYPE_STRING_NAME:
			return String(x).length()
		TYPE_ARRAY, TYPE_PACKED_BYTE_ARRAY, TYPE_PACKED_INT32_ARRAY, TYPE_PACKED_FLOAT32_ARRAY, TYPE_PACKED_STRING_ARRAY, TYPE_PACKED_COLOR_ARRAY, TYPE_PACKED_VECTOR2_ARRAY:
			return x.size()
		TYPE_OBJECT:
			if x != null:
				var l = x.get("length")
				return int(l) if l != null else 0
	return 0


func _keys(o: Variant) -> Array:
	if o is Dictionary:
		return o.keys()
	if o is Array:
		var r := []
		for i in o.size():
			r.append(i)
		return r
	return []


# ------------------------------------------------------------ logica
static func _truthy(v: Variant) -> bool:
	match typeof(v):
		TYPE_NIL:
			return false
		TYPE_BOOL:
			return v
		TYPE_INT:
			return v != 0
		TYPE_FLOAT:
			return v != 0.0 and not is_nan(v)
		TYPE_STRING, TYPE_STRING_NAME:
			return String(v) != ""
	return true   # en JS los objetos y arrays (aunque esten vacios) son verdaderos


func _or(a: Variant, b: Variant) -> Variant:
	return a if _truthy(a) else b


func _and(a: Variant, b: Variant) -> Variant:
	return b if _truthy(a) else a


func _nn(a: Variant, b: Variant) -> Variant:
	return b if a == null else a


func _round(x: Variant) -> int:
	return floori(float(x) + 0.5)


func _num(x: Variant) -> Variant:
	match typeof(x):
		TYPE_NIL:
			return 0
		TYPE_BOOL:
			return 1 if x else 0
		TYPE_INT, TYPE_FLOAT:
			return x
		TYPE_STRING, TYPE_STRING_NAME:
			var s := String(x).strip_edges()
			if s == "":
				return 0
			if s.is_valid_int():
				return int(s)
			if s.is_valid_float():
				return float(s)
			return NAN
	return NAN


func _typeof(x: Variant) -> String:
	match typeof(x):
		TYPE_NIL:
			return "undefined"
		TYPE_BOOL:
			return "boolean"
		TYPE_INT, TYPE_FLOAT:
			return "number"
		TYPE_STRING, TYPE_STRING_NAME:
			return "string"
		TYPE_CALLABLE:
			return "function"
	return "object"


# ------------------------------------------------------------ arrays
func _newArray(n: Variant = 0) -> Array:
	var a := []
	a.resize(int(n))
	return a


func _zeros(n: Variant) -> Array:
	var a := []
	a.resize(int(n))
	a.fill(0)
	return a


func _push(a: Array, items: Array) -> int:
	a.append_array(items)
	return a.size()


func _splice(a: Array, i: Variant, n: Variant, items: Array) -> Array:
	var L := a.size()
	var s := int(i)
	if s < 0:
		s = maxi(0, L + s)
	s = mini(s, L)
	var c := L - s if n == null else clampi(int(n), 0, L - s)
	var out := a.slice(s, s + c)
	for _k in c:
		a.remove_at(s)
	for k in items.size():
		a.insert(s + k, items[k])
	return out


func _slice(a: Variant, i: Variant = null, j: Variant = null) -> Variant:
	var L := _len(a)
	var s := 0 if i == null else int(i)
	var e := L if j == null else int(j)
	if s < 0:
		s = maxi(0, L + s)
	if e < 0:
		e = maxi(0, L + e)
	s = mini(s, L)
	e = mini(e, L)
	if a is String or a is StringName:
		return String(a).substr(s, maxi(0, e - s))
	if e <= s:
		return []
	return (a as Array).slice(s, e)


func _concat(a: Variant, items: Array) -> Variant:
	if a is String:
		var s: String = a
		for x in items:
			s += str(x)
		return s
	var r: Array = (a as Array).duplicate()
	for x in items:
		if x is Array:
			r.append_array(x)
		else:
			r.append(x)
	return r


func _indexOf(a: Variant, x: Variant) -> int:
	if a is String:
		return (a as String).find(str(x))
	if a is Array:
		for i in a.size():
			if typeof(a[i]) == typeof(x) or (a[i] is float and x is int) or (a[i] is int and x is float):
				if a[i] == x:
					return i
	return -1


func _lastIndexOf(a: Variant, x: Variant) -> int:
	if a is String:
		return (a as String).rfind(str(x))
	if a is Array:
		for i in range(a.size() - 1, -1, -1):
			if typeof(a[i]) == typeof(x) and a[i] == x:
				return i
	return -1


func _includes(a: Variant, x: Variant) -> bool:
	return _indexOf(a, x) >= 0


func _join(a: Array, sep: Variant = ",") -> String:
	var parts := PackedStringArray()
	for x in a:
		parts.append("" if x == null else str(x))
	return String(sep).join(parts)


func _reverse(a: Array) -> Array:
	a.reverse()
	return a


func _fill(a: Array, v: Variant, s: Variant = null, e: Variant = null) -> Array:
	var i0 := 0 if s == null else int(s)
	var i1 := a.size() if e == null else int(e)
	for i in range(i0, mini(i1, a.size())):
		a[i] = v
	return a


func _cb(f: Callable, x: Variant, i: int) -> Variant:
	var n := f.get_argument_count()
	if n <= 0:
		return f.call()
	if n == 1:
		return f.call(x)
	return f.call(x, i)


func _each(a: Variant, f: Callable) -> void:
	if a == null:
		return
	var n := _len(a)
	for i in n:
		if i >= _len(a):
			break
		_cb(f, a[i], i)


func _map(a: Array, f: Callable) -> Array:
	var r := []
	for i in a.size():
		r.append(_cb(f, a[i], i))
	return r


func _filter(a: Array, f: Callable) -> Array:
	var r := []
	for i in a.size():
		if _truthy(_cb(f, a[i], i)):
			r.append(a[i])
	return r


func _some(a: Array, f: Callable) -> bool:
	for i in a.size():
		if _truthy(_cb(f, a[i], i)):
			return true
	return false


func _every(a: Array, f: Callable) -> bool:
	for i in a.size():
		if not _truthy(_cb(f, a[i], i)):
			return false
	return true


func _find(a: Array, f: Callable) -> Variant:
	for i in a.size():
		if _truthy(_cb(f, a[i], i)):
			return a[i]
	return null


func _findIndex(a: Array, f: Callable) -> int:
	for i in a.size():
		if _truthy(_cb(f, a[i], i)):
			return i
	return -1


func _reduce(a: Array, f: Callable, init: Variant = null) -> Variant:
	var acc = init
	var s := 0
	if init == null:
		acc = a[0]
		s = 1
	for i in range(s, a.size()):
		acc = f.call(acc, a[i])
	return acc


func _sort(a: Array, f: Variant = null) -> Array:
	if f == null:
		a.sort_custom(func(x, y): return str(x) < str(y))
	else:
		var c: Callable = f
		a.sort_custom(func(x, y): return float(c.call(x, y)) < 0.0)
	return a


func _assign(o: Dictionary, src: Dictionary) -> Dictionary:
	for k in src:
		o[k] = src[k]
	return o


# ------------------------------------------------------------ cadenas
func _split(s: Variant, sep: Variant) -> Array:
	var t := str(s)
	var r := []
	if sep == "":
		for ch in t:
			r.append(ch)
		return r
	for x in t.split(str(sep)):
		r.append(x)
	return r


func _charAt(s: Variant, i: Variant) -> String:
	var t := str(s)
	var j := int(i)
	return t[j] if j >= 0 and j < t.length() else ""


func _cc(s: Variant, i: Variant) -> Variant:
	var t := str(s)
	var j := int(i)
	return t.unicode_at(j) if j >= 0 and j < t.length() else NAN


func _substr(s: Variant, i: Variant, n: Variant = null) -> String:
	var t := str(s)
	var a := int(i)
	if a < 0:
		a = maxi(0, t.length() + a)
	return t.substr(a, -1 if n == null else int(n))


func _substring(s: Variant, i: Variant, j: Variant = null) -> String:
	var t := str(s)
	var a := clampi(int(i), 0, t.length())
	var b := t.length() if j == null else clampi(int(j), 0, t.length())
	if b < a:
		var c := a
		a = b
		b = c
	return t.substr(a, b - a)


func _padStart(s: Variant, n: Variant, c: Variant = " ") -> String:
	var t := str(s)
	var ch := str(c)
	while t.length() < int(n):
		t = ch + t
	return t.substr(t.length() - maxi(int(n), str(s).length())) if t.length() > int(n) else t


func _repeat(s: Variant, n: Variant) -> String:
	return str(s).repeat(int(n))


func _toFixed(x: Variant, n: Variant = 0) -> String:
	return ("%." + str(int(n)) + "f") % float(x)


func _replace(s: Variant, a: Variant, b: Variant) -> String:
	return str(s).replace(str(a), str(b))


# ------------------------------------------------------------ llamadas
func _callm(o: Variant, name: String, args: Array) -> Variant:
	if o is Dictionary:
		var f = o.get(name)
		if f is Callable:
			return f.callv(args)
		return null
	if o is Object and o != null and o.has_method(name):
		return o.callv(name, args)
	return null


func _callv(f: Variant, args: Array) -> Variant:
	if f is Callable:
		return f.callv(args)
	return null


# ------------------------------------------------------------ tiempo
func _now() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)


func _perf() -> float:
	return Time.get_ticks_usec() / 1000.0


func _date(ms: Variant) -> Dictionary:
	var bias: int = Time.get_time_zone_from_system().get("bias", 0)
	var d := Time.get_datetime_dict_from_unix_time(int(float(ms) / 1000.0) + bias * 60)
	return {
		"getDate": func(): return d.day,
		"getMonth": func(): return d.month - 1,
		"getFullYear": func(): return d.year,
		"getHours": func(): return d.hour,
		"getMinutes": func(): return d.minute,
	}


func _timeout(f: Variant, ms: Variant = 0) -> int:
	_tid += 1
	_timers.append({"id": _tid, "at": _clock + float(ms if ms != null else 0), "f": f})
	return _tid


func _untimeout(id: Variant) -> void:
	for i in range(_timers.size() - 1, -1, -1):
		if _timers[i].id == id:
			_timers.remove_at(i)


func _raf(f: Variant) -> int:
	_rafs.append(f)
	return _rafs.size()


func _unraf(_id: Variant) -> void:
	_rafs.clear()


## La llama el bucle principal con los ms reales transcurridos.
func _tick_timers(dt_ms: float) -> void:
	_clock += dt_ms
	if not _rafs.is_empty():
		var r := _rafs.duplicate()
		_rafs.clear()
		for f in r:
			(f as Callable).call(_perf())
	if _timers.is_empty():
		return
	var due := []
	for i in range(_timers.size() - 1, -1, -1):
		if _timers[i].at <= _clock:
			due.push_front(_timers[i])
			_timers.remove_at(i)
	for t in due:
		(t.f as Callable).call()


## o[k] = v con la semantica de JS: un array crece si se escribe mas alla del final.
func _aset(o: Variant, k: Variant, v: Variant) -> void:
	if o is Array:
		var i := int(k)
		if i >= o.size():
			o.resize(i + 1)
		o[i] = v
	elif o is Dictionary:
		o[_key(k)] = v
	elif o is Object:
		o.set(str(k), v)


## parseInt de JS: lee el prefijo valido en la base dada (16 para colores).
func _parseInt(s: Variant, radix: int = 10) -> Variant:
	if s is int:
		return s
	if s is float:
		return int(s)
	var t := str(s).strip_edges()
	if radix == 16:
		if t.begins_with("0x") or t.begins_with("0X"):
			t = t.substr(2)
		var n := 0
		for ch in t:
			var d := "0123456789abcdef".find(ch.to_lower())
			if d < 0:
				break
			n = n * 16 + d
		return n
	var neg := t.begins_with("-")
	if neg or t.begins_with("+"):
		t = t.substr(1)
	var m := 0
	var any := false
	for ch in t:
		if ch < "0" or ch > "9":
			break
		m = m * 10 + int(ch)
		any = true
	if not any:
		return NAN
	return -m if neg else m
