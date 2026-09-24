"""Oleada 1 — agente «turnos»: modos por turnos/versus de motores existentes (golf, bowling, penalty, board)."""

GAMES = [
    dict(
        title='Penaltis Cara a Cara',
        genre='sports-casual',
        tags=['futbol', 'penaltis', 'versus', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG',
        engine='penalty',
        cfg=dict(mode='versus', help='Tanda de 5 penaltis por cabeza y muerte súbita. Chutas: mantén una dirección y deja A pulsado para cargar; suelta en la franja verde. Paras: mantén hacia dónde te lanzas cuando el rival golpea.'),
        pad=dict(d='8', a='Chutar'),
        mp=(1, 2),
        desc=['x '*150],
        tips=['a', 'b'],
        players='1–2 jugadores',
    ),
    dict(
        title='Cuatro en Línea',
        genre='strategy-cards',
        tags=['tablero', 'estrategia', 'clasico', 'vector'],
        orient='auto', aspect='4:3', inputs='TKMG',
        engine='board',
        cfg=dict(mode='four', help='Deja caer fichas por las columnas y conecta 4 en horizontal, vertical o diagonal. ← → o joystick eligen columna; A o ↓ la sueltan; en el móvil, toca la columna.'),
        pad=dict(d='h', a='Soltar'),
        mp=(1, 2),
        desc=[
            'Cuatro en Línea es el duelo de fichas de toda la vida con un tablero de plástico que casi se oye: siete columnas, seis filas y la gravedad haciendo su trabajo. Cada ficha que sueltas cae hasta el hueco libre más bajo, rebota un poco y se queda ahí para siempre, así que cada jugada abre o cierra caminos. Gana quien consiga alinear cuatro de su color en horizontal, en vertical o en diagonal; si el tablero se llena sin nadie que lo logre, la partida queda en tablas.',
            'Puedes jugar contra la máquina o sentar a dos personas delante de la tele, cada una con su móvil como mando. Mueve la ficha flotante con el joystick o las flechas, suéltala con A o con la flecha abajo y, si juegas en el móvil, basta con tocar la columna. La CPU tiene tres niveles —fácil, normal y difícil— y sube de categoría cada vez que la vences, así que la revancha siempre está un poco más reñida que la anterior. El marcador de la serie se mantiene entre partidas y el primer turno se alterna para que nadie tenga ventaja.',
            'Lo que engancha es que las reglas se aprenden en diez segundos pero la estrategia no se acaba nunca: preparar dos amenazas a la vez, guardar la columna central, obligar al rival a tapar un hueco que te regala la fila de arriba. Una partida dura uno o dos minutos, perfecta para jugar «la última» varias veces seguidas.',
        ],
        tips=[
            'La columna central participa en más líneas que ninguna otra: ocúpala pronto.',
            'Busca crear dos amenazas a la vez; el rival solo puede tapar una.',
            'Antes de soltar, mira qué hueco dejas encima: a veces tu ficha sirve de escalón al rival.',
        ],
        players='1–2 jugadores',
    ),
]
