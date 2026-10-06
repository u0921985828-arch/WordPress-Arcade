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
