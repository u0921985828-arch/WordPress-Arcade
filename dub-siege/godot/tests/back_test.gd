extends Node
## Atras de Android: 1 vez = Esc (pausa), 2 veces seguidas = salir.
var main
var game
func run() -> void:
	for i in 60: await get_tree().process_frame
	main.notification(NOTIFICATION_WM_GO_BACK_REQUEST)
	for i in 10: await get_tree().process_frame
	print("BACK una vez: modo=", game.mode, " aviso=", main._toast.visible, " ", "OK" if game.mode == "pause" else "MAL")
	for i in 150: await get_tree().process_frame
	main.notification(NOTIFICATION_WM_GO_BACK_REQUEST)
	for i in 10: await get_tree().process_frame
	print("BACK otra vez tras 2,5 s: modo=", game.mode, " ", "OK" if game.mode == "play" else "MAL")
	main.notification(NOTIFICATION_WM_GO_BACK_REQUEST)
	print("BACK doble: deberia salir ya")
	for i in 30: await get_tree().process_frame
	print("BACK MAL: no salio")
