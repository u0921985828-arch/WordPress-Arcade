class_name CtxGradient
extends RefCounted
## Degradado lineal del lienzo (createLinearGradient + addColorStop).

var x0 := 0.0
var y0 := 0.0
var x1 := 0.0
var y1 := 0.0
var stops: Array = []   # [[pos, Color], ...] ordenados


func addColorStop(pos: float, c: Variant) -> void:
	stops.append([pos, Ctx.col(c)])
	stops.sort_custom(func(a, b): return a[0] < b[0])


func at(u: float) -> Color:
	if stops.is_empty():
		return Color(0, 0, 0, 0)
	if u <= stops[0][0]:
		return stops[0][1]
	for i in range(stops.size() - 1):
		var a: Array = stops[i]
		var b: Array = stops[i + 1]
		if u <= b[0]:
			var k: float = 0.0 if b[0] == a[0] else (u - a[0]) / (b[0] - a[0])
			return (a[1] as Color).lerp(b[1], k)
	return stops[stops.size() - 1][1]
