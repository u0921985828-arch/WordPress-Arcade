class_name AudioDirector
extends Node
## Banda sonora y efectos de Dub Siege grabados desde dub-siege.html (tools/rec_audio.py).
##
## Por cancion (0..11, una por fase) hay cinco ficheros en godot/audio/:
##   m{i}_C.ogg  calma (menus, tienda, escenas), 32 compases
##   m{i}_P1/P2/P3.ogg  juego a intensidad 1/2/3 (run.mult <3, 3-5, >=6): misma longitud
##                      exacta en muestras y mismo compas 0 -> suenan a la vez y se cruzan
##   m{i}_X.ogg  jefe, 16 compases
## Igual que en el web, el cambio de grupo (C/P/X) y de intensidad entra en el siguiente
## limite de compas, y al entrar en un grupo se empieza por su compas 0. La pausa cierra un
## paso bajo de 520 Hz en el bus Music y baja el volumen a 0,55 (como MZ.plp / MZ.pg).
## pulse() replica pulse() del web: 1 en el primer paso de cada tiempo, 0,5 en el segundo.
##
## Uso:  set_state(song, "P", intensidad, pausa) en cada fotograma (o al cambiar algo),
##       sfx("coin"), set_mute(true), pulse().

const DIR := "res://godot/audio/"
const SFX_NAMES := ["shoot", "shootS", "shootL", "shootH", "hit", "blip", "clink", "kill", "jump", "jump2",
	"dash", "land", "hurt", "coin", "pick", "power", "cp", "box", "siren", "boom", "drop", "tele", "horn",
	"laser", "bass", "buy", "no"]
const POOL := 8
const FADE_IN := 0.03      # s, entrada de un grupo en el limite de compas
const FADE_OUT := 0.35     # s, salida del grupo anterior (deja oir algo de su cola de eco)
const FADE_SONG := 0.25    # s, cambio de cancion (en el web es inmediato)
const FADE_INT := 0.12     # s, cruce entre intensidades
const PAUSE_HZ := 520.0
const PAUSE_GAIN := 0.55
const MUTE_DB := -80.0

var beats := {}
var song := -1
var group := ""            # grupo que suena ('' = nada)
var intensity := 1
var paused := false
var muted := false

var _want_group := ""
var _want_int := 1
var _layers := {}          # "C"/"P"/"X" -> _Layer de la cancion actual
var _dying: Array = []     # capas que se apagan (cambio de cancion o de grupo)
var _bar := 2.0            # s por compas de la cancion actual
var _last_bar := -1
var _pz := 0.0             # 0 sin pausa .. 1 pausa completa (suavizado)
var _music_bus := -1
var _lpf: AudioEffectLowPassFilter = null
var _lpf_idx := -1
var _sfx := {}
var _pool: Array[AudioStreamPlayer] = []
var _pool_next := 0


class _Layer:
	var p: AudioStreamPlayer
	var sync: AudioStreamSynchronized = null   # solo en P
	var g := 0.0          # ganancia actual (lineal)
	var to := 0.0         # ganancia objetivo
	var rate := 1.0       # unidades de ganancia por segundo
	var mix := [0.0, 0.0, 0.0]   # P1..P3 actual
	var mix_to := [0.0, 0.0, 0.0]
	var mix_rate := 1.0
	var length := 1.0
	var step := 0.1       # s por semicorchea

	func set_gain(v: float) -> void:
		g = v
		p.volume_db = linear_to_db(maxf(v, 0.00001))

	func set_mix(v: Array) -> void:
		mix = v.duplicate()
		for i in 3:
			sync.set_sync_stream_volume(i, linear_to_db(maxf(mix[i], 0.00001)))


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_ensure_buses()
	var f := FileAccess.open(DIR + "beats.json", FileAccess.READ)
	if f:
		beats = JSON.parse_string(f.get_as_text())
	for k in SFX_NAMES:
		var s = load(DIR + "sfx/" + k + ".wav")
		if s:
			_sfx[k] = s
	for i in POOL:
		var p := AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		_pool.append(p)


## Compatibilidad con godot/src/10_audio.gd (audio.call("on"), audio.call("mute", b)).
func on() -> void:
	pass


func mute(b: bool) -> void:
	set_mute(b)


func set_mute(b: bool) -> void:
	muted = b
	var m := AudioServer.get_bus_index("Master")
	AudioServer.set_bus_mute(m, b)
	# en silencio se para todo (como AC.suspend en el web: no gasta bateria)
	for L in _all_layers():
		L.p.stream_paused = b
	for p in _pool:
		if b:
			p.stop()


## Estado de la musica: cancion 0..11, grupo 'C' (calma), 'P' (juego) o 'X' (jefe),
## intensidad 1..3 (solo P) y pausa. Se puede llamar en cada fotograma.
func set_state(new_song: int, new_group: String, new_intensity: int = 1, is_paused: bool = false) -> void:
	paused = is_paused
	_want_group = new_group if new_group in ["C", "P", "X"] else "C"
	_want_int = clampi(new_intensity, 1, 3)
	if new_song != song:
		_load_song(new_song)
	elif group == "":
		_apply(0.0)


func sfx(name: String) -> void:
	if muted or not _sfx.has(name):
		return
	var p: AudioStreamPlayer = null
	for q in _pool:
		if not q.playing:
			p = q
			break
	if p == null:      # todos ocupados: se roba el mas antiguo
		p = _pool[_pool_next]
		_pool_next = (_pool_next + 1) % POOL
	p.stream = _sfx[name]
	p.play()


## 1 si estamos en el primer paso (semicorchea) de un tiempo, 0,5 en el segundo, 0 despues.
func pulse() -> float:
	var L: _Layer = _layers.get(group)
	if L == null or not L.p.playing:
		return 0.0
	var pos := _pos(L) - AudioServer.get_output_latency()
	var d := fposmod(pos, 4.0 * L.step) / L.step
	return 1.0 if d <= 1.0 else (0.5 if d <= 2.0 else 0.0)


## Posicion (s) dentro del bucle del grupo que suena, o -1.
func music_position() -> float:
	var L: _Layer = _layers.get(group)
	return fposmod(_pos(L), L.length) if L and L.p.playing else -1.0


# ---------------------------------------------------------------------------

func _ensure_buses() -> void:
	for nm in ["Music", "SFX"]:
		if AudioServer.get_bus_index(nm) < 0:
			AudioServer.add_bus()
			var i := AudioServer.bus_count - 1
			AudioServer.set_bus_name(i, nm)
			AudioServer.set_bus_send(i, "Master")
	_music_bus = AudioServer.get_bus_index("Music")
	for i in AudioServer.get_bus_effect_count(_music_bus):
		var e := AudioServer.get_bus_effect(_music_bus, i)
		if e is AudioEffectLowPassFilter:
			_lpf = e
			_lpf_idx = i
	if _lpf == null:
		_lpf = AudioEffectLowPassFilter.new()
		_lpf.resonance = 0.5
		AudioServer.add_bus_effect(_music_bus, _lpf, 0)
		_lpf_idx = 0
	_lpf.cutoff_hz = 20000.0
	AudioServer.set_bus_effect_enabled(_music_bus, _lpf_idx, false)


func _ogg(i: int, k: String) -> AudioStream:
	var s = load(DIR + "m%d_%s.ogg" % [i, k])
	if s is AudioStreamOggVorbis:
		s.loop = true
		s.loop_offset = 0.0
	return s


func _load_song(i: int) -> void:
	var sd: Dictionary = beats.get("songs", {}).get(str(i), {})
	if sd.is_empty():
		push_warning("AudioDirector: sin musica para la cancion %d" % i)
		return
	# lo que sonaba se apaga con un fundido corto (en el web el cambio es inmediato)
	for L in _layers.values():
		_kill(L, FADE_SONG)
	_layers.clear()
	song = i
	group = ""
	_bar = float(sd.bar)
	_last_bar = -1
	var files: Dictionary = sd.files
	for k in ["C", "X"]:
		var L := _Layer.new()
		L.p = AudioStreamPlayer.new()
		L.p.bus = "Music"
		L.p.stream = _ogg(i, k)
		L.length = float(files[k].samples) / float(beats.get("sr", 44100))
		L.step = L.length / (float(files[k].bars) * 16.0)
		add_child(L.p)
		L.set_gain(0.0)
		_layers[k] = L
	var P := _Layer.new()
	P.p = AudioStreamPlayer.new()
	P.p.bus = "Music"
	P.sync = AudioStreamSynchronized.new()
	P.sync.stream_count = 3
	for j in 3:
		P.sync.set_sync_stream(j, _ogg(i, "P%d" % (j + 1)))
	P.p.stream = P.sync
	P.length = float(files.P1.samples) / float(beats.get("sr", 44100))
	P.step = P.length / (float(files.P1.bars) * 16.0)
	add_child(P.p)
	P.set_gain(0.0)
	P.set_mix([0.0, 0.0, 0.0])
	_layers["P"] = P
	_apply(0.0)


func _kill(L: _Layer, t: float) -> void:
	L.to = 0.0
	L.rate = maxf(L.g, 0.001) / t
	_dying.append(L)


func _pos(L: _Layer) -> float:
	return L.p.get_playback_position() + AudioServer.get_time_since_last_mix()


func _int_mix(n: int) -> Array:
	return [1.0 if n == 1 else 0.0, 1.0 if n == 2 else 0.0, 1.0 if n == 3 else 0.0]


# Aplica grupo e intensidad pendientes. 'late' = segundos desde el limite de compas
# (se arranca el grupo nuevo con ese desfase para no salirse de la rejilla).
func _apply(late: float) -> void:
	if _layers.is_empty():
		return
	if _want_group != group:
		var old: _Layer = _layers.get(group)
		if old:
			old.to = 0.0
			old.rate = maxf(old.g, 0.001) / FADE_OUT
		var L: _Layer = _layers[_want_group]
		if L.sync:
			intensity = _want_int
			L.set_mix(_int_mix(intensity))
			L.mix_to = L.mix.duplicate()
		L.set_gain(0.0)
		L.to = 1.0
		L.rate = 1.0 / FADE_IN
		L.p.play(maxf(late, 0.0))
		L.p.stream_paused = muted
		group = _want_group
		_last_bar = int(floor(maxf(late, 0.0) / _bar))
	elif group == "P" and _want_int != intensity:
		intensity = _want_int
		var P: _Layer = _layers.P
		P.mix_to = _int_mix(intensity)
		P.mix_rate = 1.0 / FADE_INT


func _process(dt: float) -> void:
	# limite de compas del grupo que suena: ahi entran los cambios pendientes
	var L: _Layer = _layers.get(group)
	if L and L.p.playing:
		var pos := fposmod(_pos(L), L.length)
		var b := int(floor(pos / _bar))
		if b != _last_bar:
			_last_bar = b
			if _want_group != group or (group == "P" and _want_int != intensity):
				_apply(pos - b * _bar)
	elif group == "" and not _layers.is_empty():
		_apply(0.0)
	# fundidos
	for K in _layers.values():
		_step_layer(K, dt)
	for i in range(_dying.size() - 1, -1, -1):
		var D: _Layer = _dying[i]
		_step_layer(D, dt)
		if D.g <= 0.0:
			D.p.stop()
			_dying.remove_at(i)
			if not (D in _layers.values()):
				D.p.queue_free()
	# pausa: paso bajo a 520 Hz y ganancia 0,55, con constante de tiempo de 0,05 s (como el web)
	_pz += ((1.0 if paused else 0.0) - _pz) * (1.0 - exp(-dt / 0.05))
	if absf(_pz - (1.0 if paused else 0.0)) < 0.001:
		_pz = 1.0 if paused else 0.0
	var on := _pz > 0.0
	if AudioServer.is_bus_effect_enabled(_music_bus, _lpf_idx) != on:
		AudioServer.set_bus_effect_enabled(_music_bus, _lpf_idx, on)
	if on:
		_lpf.cutoff_hz = 20000.0 * pow(PAUSE_HZ / 20000.0, _pz)
	AudioServer.set_bus_volume_db(_music_bus, linear_to_db(lerpf(1.0, PAUSE_GAIN, _pz)))


func _step_layer(K: _Layer, dt: float) -> void:
	if K.g != K.to:
		K.set_gain(move_toward(K.g, K.to, K.rate * dt))
		if K.g <= 0.0 and K.to <= 0.0 and K.p.playing and not (K in _dying):
			K.p.stop()
	if K.sync and K.mix != K.mix_to:
		var m := []
		for i in 3:
			m.append(move_toward(K.mix[i], K.mix_to[i], K.mix_rate * dt))
		K.set_mix(m)


func _all_layers() -> Array:
	return _layers.values() + _dying
