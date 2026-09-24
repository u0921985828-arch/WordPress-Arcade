"""Oleada 1 — agente «equipos»: petardos en rejilla (bomber) y deportes de equipo (teamball)."""

GAMES = [
    dict(
        title='Petardo Plaza', genre='party', tags=['petardos', 'laberinto', 'versus', 'fiesta', 'vector'],
        orient='auto', aspect='4:3', inputs='TKG', engine='bomber', players='1–4 jugadores',
        cfg=dict(help='Muévete con el joystick o las flechas y suelta un petardo con A. La traca estalla en cruz, rompe las cajas y deja mejoras: alcance, más petardos, zapatillas y patada. Gana la ronda quien quede en pie; el primero en ganar 2 rondas se lleva la plaza.',
                 rules=dict(fuse=2.4, range=2, bombs=1, speed=3.3, round=60, wins=2)),
        pad=dict(d='8', a='Petardo'), mp=(1, 4),
        desc=[
            'Petardo Plaza convierte la plaza del pueblo en fiesta mayor: cuatro vecinos con gorro de verbena arrancan en las esquinas, rodeados de cajas de fruta y bolardos de piedra, y solo uno puede terminar la ronda en pie. Cada petardo que sueltas chisporrotea unos segundos y revienta en una traca en forma de cruz que recorre las calles hasta chocar con la piedra.',
            'Las cajas saltan por los aires y a veces esconden mejoras: pólvora para alargar la explosión, petardos extra para soltar varios a la vez, zapatillas para correr más y la bota, que te deja empujar de una patada un petardo encendido hasta el otro extremo de la calle. Las explosiones se encadenan, así que un solo petardo bien puesto puede prender media plaza. Cuando el reloj llega a cero empieza la muerte súbita y la plaza se va cerrando desde fuera hacia dentro.',
            'Se juega con el joystick y un único botón: en el móvil, con el mando virtual; en el ordenador, con las flechas y Espacio; en la tele, hasta cuatro personas con su propio móvil como mando. Las plazas vacías las ocupa la CPU, que lee el mapa de peligro para esquivar la traca, persigue al rival más cercano y aprende: cada vez que le ganas, juega un poco mejor.',
            'Engancha porque cada ronda dura menos de un minuto y siempre parece que la siguiente es la buena: encerrar a un amigo entre dos petardos o salvarte por una casilla da para comentarlo durante toda la revancha.',
        ],
        tips=['Antes de soltar un petardo mira por dónde vas a escapar: un callejón sin salida es una trampa para ti mismo.',
              'La bota sirve para atacar desde lejos: coloca el petardo y empújalo hacia el rival que se esconde detrás de una esquina.',
              'En la muerte súbita busca el centro de la plaza pronto; los bordes son los primeros en cerrarse.'],
    ),
]
