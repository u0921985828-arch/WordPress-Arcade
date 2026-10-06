extends Node
## Importa partidas de la app antigua (localStorage del WebView en LevelDB).
## Uso: -- --test=res://godot/tests/websaves_test.gd --webdb=CARPETA --expect=FICHERO.json
## FICHERO.json = {clave: texto esperado}; se comprueba también slotMig().
var main
var game
func run() -> void:
	var args: Dictionary = main.args
	var exp = JSON.parse_string(FileAccess.get_file_as_string(args.expect))
	var tmp := "user://websaves_test.json"
	if FileAccess.file_exists(tmp):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(tmp))
	game.STORE = tmp
	game.web_db = args.webdb
	game._store = {}
	game._store_ok = false
	game._store_load()
	var ok := true
	for k in exp:
		var got = game._store.get(k)
		var same: bool = got == exp[k]
		ok = ok and same
		print(k, " = ", got, "  ", "OK" if same else "MAL (esperado %s)" % exp[k])
	for k in game._store:
		if not exp.has(k):
			ok = false
			print(k, " sobra MAL")
	print("en disco: ", "OK" if FileAccess.file_exists(tmp) else "MAL")
	# slotMig con el ds2_prog importado
	game.PROG = game.j_load("ds2_prog", [0, 0, 0])
	game.slotMig()
	var sl = game.j_load("ds2_slots", null)
	if exp.has("ds2_prog") and not exp.has("ds2_slots"):
		var n := 0
		for s in sl if sl is Array else []:
			if s is Dictionary:
				n += 1
				print("ranura diff=", s.diff, " fase=", s.stage, " discos=", s.run.coins)
		print("ranuras migradas: ", n, " ", "OK" if n > 0 else "MAL")
		ok = ok and n > 0
	print("WEBSAVES ", "OK" if ok else "MAL")
	get_tree().quit()
