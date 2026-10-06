extends Node
var main
var game
func run():
	for i in 120: await get_tree().process_frame
	print("AUD menu grupo=", game.audio.group, " cancion=", game.audio.song)
	game.newRun(); game.buildStage(3); game.songIdx = 3; game.mode = "play"
	for i in 240: await get_tree().process_frame
	print("AUD play grupo=", game.audio.group, " cancion=", game.audio.song, " pulse=", game.pulse())
	game.bossMusic = 1
	for i in 240: await get_tree().process_frame
	print("AUD jefe grupo=", game.audio.group)
	get_tree().quit()
