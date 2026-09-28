"""Oleada 4 — física: torre de bloques por turnos (motor `fisica` ampliado)."""
PAD_T = dict(d='h', a='Soltar', b='', t=1)

GAMES = [
    dict(
        title='Torre de Bloques', genre='party', tags=['torre', 'equilibrio', 'grua', 'turnos', 'fisica', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='fisica', pad=PAD_T, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='torre', help='Por turnos, una grúa lleva un bloque por encima de la torre. Mueve la grúa con ← y → (o arrastrando el dedo) y suelta el bloque con A. Si el bloque apenas pisa al de abajo, resbala. Y si el peso de todo lo que hay encima de cualquier altura se sale de su apoyo, la torre se desploma: quien soltó ese bloque queda fuera y los demás siguen con una torre nueva. Gana quien más bloques haya colocado cuando solo queda uno en pie o se acaba el tiempo.'),
        desc=[
            'Una grúa, un bloque colgando y cuatro personas turnándose para ponerlo donde nadie se atreve. La gracia de Torre de Bloques es que no hay trampa ni azar escondido: la torre se cae cuando tiene que caerse. El juego calcula de verdad el equilibrio, comprobando a cada altura si el peso de todo lo que hay por encima sigue apoyado sobre el bloque de abajo. Colocar un bloque medio en el aire no pasa nada si el resto compensa; colocar dos seguidos hacia el mismo lado es lo que acaba tirándolo todo.',
            'Cada turno la grúa recoge un bloque un poco más estrecho que el anterior, así que la partida empieza cómoda y se va volviendo un pulso de precisión. Si el bloque apoya menos de una quinta parte de su ancho, resbala y se lleva la torre por delante. Si apoya poco pero lo justo, el juego avisa con un «¡Al filo!» y la torre se queda visiblemente inclinada, esperando a que el siguiente arregle el desastre o lo remate. Quien tira el bloque que derriba la torre queda eliminado; los demás siguen con una torre nueva, así que la partida no se acaba de golpe.',
            'En el modo tele juegan hasta cuatro personas desde sus móviles, con el turno cantado en grande y en el color de cada uno; en solitario compites contra tres CPU que fallan más o menos según el nivel que les hayas ganado y según la dificultad elegida. Se juega igual de bien en vertical que en horizontal: la cámara sube sola cuando la torre crece y la línea de puntería marca dónde va a caer el bloque antes de soltarlo.',
        ],
        tips=['No busques siempre el centro: si la torre está inclinada, coloca al lado contrario para enderezarla.', 'Un bloque muy sobresalido no cae solo, pero deja la torre a merced del siguiente; a veces conviene jugar seguro y dejar el marrón al rival.', 'Cuando la línea de puntería queda fuera del bloque de abajo, resbala seguro: mejor perder un segundo que perder la ronda.'],
    ),
]
