"""Oleada 4 — letras: montón de letras que caen y palabras que lo vacían (motor `palabras` ampliado)."""
PAD_L = dict(d='8', a='Elegir', b='Palabra', t=1)

GAMES = [
    dict(
        title='Letras que Caen', genre='puzzle', tags=['palabras', 'letras', 'espanol', 'vocabulario', 'vector'],
        orient='auto', aspect='fill', inputs='TKM', engine='palabras', pad=PAD_L, mp=None, players='1 jugador',
        cfg=dict(mode='caen', help='Las letras caen y se amontonan por columnas. Toca las letras del montón (no hace falta que estén juntas) para formar una palabra de tres letras o más y pulsa «¡Palabra!»: esas letras desaparecen y todo lo de arriba baja. Si una columna llega al techo, se acabó. Con teclado o mando: flechas para mover el cursor, A para elegir una letra y B o Intro para enviar la palabra. Las letras doradas duplican los puntos.'),
        desc=[
            'Letras que Caen junta dos cosas que funcionan solas y funcionan mejor juntas: un montón que sube y unas palabras que lo bajan. Las letras van cayendo por columnas y se apilan; para quitarlas hay que escribir con ellas. Se eligen tocándolas en el orden que quieras, estén donde estén —no tienen que ser vecinas—, y al enviar la palabra desaparecen y todo lo que había encima baja. Cuanto más larga la palabra y más raras las letras, más puntos; las letras doradas valen el doble.',
            'El surtidor no es ciego. El juego lleva siempre una palabra objetivo en la cabeza y va colando las letras que le faltan al montón, así que nunca te quedas mirando una pantalla imposible de la que no sale nada. Aun así, si pasas un rato atascado, el propio juego te enseña una palabra que sí se puede formar con lo que hay y te marca sus letras. El objetivo se ve arriba a la derecha: no estás obligado a usarlo, pero si lo haces sabes que las letras van a llegar.',
            'Cada seis palabras sube el nivel: las letras caen más rápido y más seguido, y el objetivo se alarga. La partida se acaba cuando una columna toca el techo, así que conviene repartir y no dejar que una sola se dispare. Se juega igual en vertical que en horizontal —el tablero cambia de siete columnas por diez filas a diez por siete—, con el dedo, con el ratón o con el mando, y las tres dificultades cambian tanto la velocidad de caída como el ritmo del surtidor.',
        ],
        tips=['Palabras de cinco o seis letras valen muchísimo más que dos de tres: si puedes esperar, espera.',
              'Vacía primero la columna más alta aunque la palabra sea corta; el techo no perdona.',
              'La letra dorada dobla toda la palabra, no solo su valor: guárdala para la jugada larga.'],
    ),
]
