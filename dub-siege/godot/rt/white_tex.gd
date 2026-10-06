class_name WhiteTex
extends RefCounted
## Copia "blanca" de una hoja para el destello al recibir dano. En vez de pintar
## una imagen nueva (lento en GDScript), Ctx.drawImage la dibuja con un
## sombreado que deja el alfa de la hoja y pone el color en blanco.

var tex: Texture2D
var width := 0
var height := 0


func _init(t: Texture2D) -> void:
	tex = t
	width = t.get_width()
	height = t.get_height()
