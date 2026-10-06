## Audio: la musica va grabada por capas (godot/audio) y los efectos tambien.
## (En el HTML se sintetiza en directo con WebAudio; ver tools/ para grabarlo.)

var AC = null
var MZ := {}
var songIdx := 0
var bossMusic := false
var audio: Node = null   # AudioDirector (main.gd)


func audioOn() -> void:
	if audio:
		audio.call("on")


func sfx(k: Variant = null) -> void:
	if audio and not SET.get("mute"):
		audio.call("sfx", str(k))


func setMute(m: Variant = null) -> void:
	SET.mute = bool(m)
	save("ds2_set", SET)
	if audio:
		audio.call("mute", bool(m))


## Latido de la musica (1 en el golpe, 0,5 en el siguiente paso, 0 despues), como pulse() del HTML.
func pulse():
	return audio.call("pulse") if audio else 0


## Lo que en el HTML decide mzBar() en cada compas: grupo e intensidad segun el modo.
## El director solo cambia en el limite de compas, asi que se puede llamar cada fotograma.
func musicTick() -> void:
	if not audio:
		return
	var G := "C"
	var I := 1
	if mode == "pause" and MZ.get("G"):
		G = MZ.G
		I = MZ.I
	elif mode == "play":
		var m = run.get("mult", 1) if run else 1
		G = "X" if _truthy(bossMusic) else "P"
		I = 3 if m >= 6 else (2 if m >= 3 else 1)
	MZ.G = G
	MZ.I = I
	audio.call("set_state", int(songIdx), G, I, mode == "pause")
