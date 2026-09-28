"""Oleada 4 — ritmo: el compás flamenco en una rueda de 12 (motor `rhythm` ampliado)."""
PAD_P = dict(d='', a='Palma', b='Pitos', t=1)

GAMES = [
    dict(
        title='Palmas Flamencas', genre='party', tags=['ritmo', 'palmas', 'flamenco', 'compas', 'concurso', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='rhythm', pad=PAD_P, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='palmas', help='Una aguja gira por la rueda del compás. Da la palma con A justo cuando cruza una marca grande y marca los pitos con B en las pequeñas. Cada palo (soleá, tangos, bulería, rumba) tiene sus acentos y su velocidad; el primer compás de cada palo solo hay que escucharlo, no puntúa. En pantalla táctil, la mitad izquierda es palma y la derecha pitos.'),
        desc=[
            'Palmas Flamencas no es otro juego de notas que caen: aquí se lee un reloj. El compás se dibuja como una rueda con sus pulsos marcados y una aguja que gira sin parar; hay que dar la palma exactamente cuando la aguja cruza una marca grande y marcar los pitos en las pequeñas. Los acentos no van al azar, son los de verdad: la soleá acentúa en 3, 6, 8, 10 y 12, los tangos en 2 y 4, la rumba reparte tres-tres-dos y la bulería recorre los doce pulsos a una velocidad que no perdona.',
            'La partida encadena cinco palos, cada uno con su color, su ritmo y su explicación en pantalla. El primer compás de cada palo es de escucha: la rueda marca el patrón y suena el compás, pero todavía no puntúa, así que da tiempo a cogerle el aire antes de empezar a sumar. A partir de ahí cada palma a tiempo vale puntos, los aciertos clavados valen el doble y encadenar sin fallar sube el multiplicador hasta cuatro. Dar una palma donde no toca rompe el combo, igual que en una mesa de verdad.',
            'Está pensado para el modo tele: hasta cuatro personas dando palmas a la vez sobre el mismo compás, cada una con su placa de color, su marcador y sus manos que se abren cuando aciertan. Las plazas libres las ocupan palmeros de la CPU que fallan más o menos según la dificultad elegida y según lo que les hayas ganado antes. En solitario se juega igual de bien con el teclado o tocando la pantalla, y la partida completa dura unos dos minutos: lo justo para pedir la revancha.',
        ],
        tips=['El primer compás de cada palo es gratis: úsalo para contar en voz alta antes de que empiece a puntuar.',
              'Fíjate en la marca que crece, no en la aguja: anticipar medio pulso es lo que da los «¡Olé!».',
              'En la bulería, más vale dejar un acento que dar palmas de más: un fallo rompe el combo entero.'],
    ),
]
