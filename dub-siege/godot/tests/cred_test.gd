extends Node
## Creditos: el rodillo se pinta sin errores y un toque vuelve a la pantalla final.
var main
var game
func run() -> void:
	for i in 30: await get_tree().process_frame
	game.enterLevel(11, true)
	for i in 30: await get_tree().process_frame
	game.mode = "menu"
	game.showCredits()
	for i in 420: await get_tree().process_frame
	var ok1: bool = game.mode == "cut" and game.cut != null
	get_viewport().get_texture().get_image().save_png("user://cred.png")
	game.cutAdv()
	for i in 10: await get_tree().process_frame
	print("CRED rodillo=", ok1, " vuelve=", game.mode, " ", "OK" if ok1 and game.mode == "menu" else "MAL")
	get_tree().quit()
