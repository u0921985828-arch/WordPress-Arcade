class_name FrameRing
extends Node2D
## Marco del lienzo en pantallas sin tacto (box-shadow de #wrap en la web):
## aro de 2 px color --line y halo cian suave de 40 px.

var game: Game
var _key := ""


func _init(g: Game) -> void:
	game = g


func _process(_dt: float) -> void:
	var key := "%s|%s|%s|%s" % [game.origin, game.cv.width, game.cv.height, game.ZOOM]
	if key != _key:
		_key = key
		queue_redraw()


func _draw() -> void:
	if game.touch_ui:
		return
	var r := Rect2(game.origin, Vector2(game.cv.width, game.cv.height) * game.ZOOM)
	# sombra CSS de 40 px de desenfoque (sigma 20): 0,133 * erfc(d / 28,3) / 2
	for d in range(1, 48):
		var x := float(d) / 28.28
		var t := 1.0 / (1.0 + 0.5 * x)
		var erfc := t * exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))))
		draw_rect(r.grow(d - 0.5), Color(0.24, 0.91, 1.0, 0.133 * erfc / 2.0), false, 1.0)
	draw_rect(r.grow(1.0), Color("#3a4680"), false, 2.0)
