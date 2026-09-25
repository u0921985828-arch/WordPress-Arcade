"""Oleada 2 — mesa: serpientes y escaleras (motor `tablero`), tute cabrón y cinquillo (motor `baraja`)."""
PAD_T = dict(d='h', a='Tirar')
PAD_B = dict(d='8', a='Elegir', b='Confirmar', t=1)

GAMES = [
    dict(
        title='Serpientes y Escaleras', genre='strategy-cards', tags=['serpientes-y-escaleras', 'dados', 'mesa', 'familia', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='tablero', pad=PAD_T, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='serpientes', help='Tira con A (o toca). Avanzas lo que marque el dado: el pie de una escalera te sube y la cabeza de una serpiente te baja hasta su cola. A la 100 se entra justo; lo que sobra rebota hacia atrás. Con un 6 repites, como mucho dos veces seguidas.'),
        desc=[
            'Un tablero de cien casillas en zigzag, nueve escaleras de madera y diez serpientes de colores que no paran de moverse. Todos salen de la casilla 1 y el primero que llega a la 100 gana. El dado manda: si caes al pie de una escalera, subes de golpe varias filas; si caes en la cabeza de una serpiente, te deslizas por su lomo hasta la cola y te toca remontar. La serpiente del 87, a un paso del final, devuelve a quien la pisa a la casilla 24.',
            'Las reglas son las de siempre, con dos detalles que le dan emoción al final: a la 100 hay que entrar con la tirada exacta, y los puntos que sobran te hacen rebotar hacia atrás, donde esperan tres serpientes seguidas en la última fila. Sacar un 6 te deja tirar otra vez, pero solo dos veces seguidas, para que nadie se escape con una racha imposible. Cada ficha salta casilla a casilla y sube o baja siguiendo la escalera o el cuerpo de la serpiente, así que siempre se ve qué ha pasado.',
            'Es un juego de suerte pura, ideal para jugar con peques o para una partida rápida en la tele: de dos a cuatro jugadores, cada uno tirando con la A de su móvil, y la CPU en las sillas libres. Sin tele juegas tú contra la CPU tocando la pantalla o pulsando Espacio. Una partida a cuatro dura unos pocos minutos y el panel lateral enseña en qué casilla va cada uno.',
        ],
        tips=['Aquí no hay jugada que valga: disfruta el vuelco de cada tirada y cuenta las casillas que faltan para la próxima escalera.', 'En la última fila, piensa en el rebote: desde la 94 un 6 te lleva a la 100, pero cualquier tirada mala puede dejarte en la boca de una serpiente.'],
    ),
    dict(
        title='Tute Cabrón', genre='strategy-cards', tags=['tute', 'baraja-espanola', 'cartas', 'bazas', 'cantes', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='baraja', pad=PAD_B, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='tute', hud='tr', help='Cada uno juega por su cuenta. Hay que asistir al palo y montar si puedes; sin el palo, fallar con triunfo (y montar sobre el triunfo si puedes). Al ganar una baza puedes cantar: Rey y Caballo del mismo palo 20, del triunfo 40; con los 4 reyes o los 4 caballos cantas tute y ganas la mano. La última baza vale 10. Gana la mano quien más suma; quien menos, es el cabrón.'),
        desc=[
            'El tute cabrón es el tute de todos contra todos: tres o cuatro jugadores sin compañero, cada uno pendiente de sus bazas y de que nadie cante las cuarenta antes que él. Se reparte la baraja entera, diez cartas por cabeza a cuatro y trece a tres (se aparta el dos de oros), y la última carta que recibe quien da marca el palo de triunfo. Valen el As 11, el Tres 10, el Rey 4, el Caballo 3 y la Sota 2, y la última baza suma diez más: las diez de últimas.',
            'Aquí no se puede tirar lo que uno quiere como en la brisca. Es obligatorio asistir al palo que sale y montar, es decir, echar una carta más alta si la tienes; si no tienes el palo, hay que fallar con un triunfo y, si ya ha fallado otro, superarlo si puedes. Justo después de ganar una baza, y antes de salir, puedes cantar: el Rey y el Caballo de un mismo palo valen 20 y los del triunfo, las cuarenta. Quien reúne los cuatro reyes o los cuatro caballos canta tute y se lleva la mano sin más. Al final gana quien más suma entre cartas y cantes, y al que menos hace le toca ser el cabrón de la ronda. La partida es a una, tres o cinco manos ganadas.',
            'Sin tele juegas tú con tu mano a la vista y la CPU ocupa el resto de sillas; las cartas que no puedes jugar salen apagadas, así que las reglas de asistir y montar se aprenden jugando. En la tele cada jugador ve su mano solo en su móvil, con los botones de cantar cuando toca, y la pantalla grande enseña la baza, los montones y el triunfo. La CPU guarda sus parejas para cantar y aprovecha mejor las bazas cada vez que le ganas.',
        ],
        tips=['No rompas una pareja de Rey y Caballo sin cantar: veinte o cuarenta puntos pesan más que una baza pequeña.', 'Gana una baza cuanto antes si tienes cante pendiente: solo se canta justo después de llevártela.', 'Guarda un triunfo alto para el final: las diez de últimas deciden muchas manos igualadas.'],
    ),
    dict(
        title='Cinquillo', genre='strategy-cards', tags=['cinquillo', 'baraja-espanola', 'cartas', 'escaleras', 'familia', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='baraja', pad=PAD_B, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='cinquillo', hud='tr', help='Abre quien tiene el Cinco de oros. En tu turno juega un Cinco para abrir su palo o una carta contigua a una fila (hacia abajo hasta el As, hacia arriba hasta el Rey; la Sota va tras el 7). Si puedes jugar, es obligatorio; si no, pasas. Gana la ronda quien se queda sin cartas; los demás suman un punto por carta. Tras las rondas, gana quien menos suma.'),
        desc=[
            'El cinquillo es el juego de cartas con el que muchos aprendimos a ordenar la baraja española, y engancha a cualquier edad. Se reparten las cuarenta cartas entre tres o cuatro jugadores y empieza quien tiene el cinco de oros, que lo planta en el centro de la mesa. A partir de ahí cada uno, por turno, abre otro palo con su cinco o alarga una fila con la carta que va justo al lado: hacia abajo el cuatro, el tres, el dos y el as; hacia arriba el seis, el siete, la sota, el caballo y el rey.',
            'Parece un juego de suerte, pero tiene su miga. Si puedes jugar, estás obligado a hacerlo, así que la gracia está en elegir qué carta sueltas: la que te abre camino a las que te quedan o la que deja a los demás atascados. Guardar un seis cuando no llevas nada por encima puede cerrar un palo entero a tus rivales durante varias vueltas. Quien no puede jugar, pasa. La ronda la gana el primero que se queda sin cartas, y los demás se apuntan un punto por cada carta que les ha sobrado. Se juega a una, tres o cinco rondas y gana quien menos puntos acumula.',
            'Las cuatro filas se van formando en el centro del tapete, con un hueco marcado para cada cinco que falta por salir. Sin tele juegas tú contra la CPU tocando la carta que quieres poner; las que no se pueden jugar salen apagadas. En la tele cada jugador ve su mano en el móvil y la pantalla grande muestra la mesa. La CPU aprende a retener las cartas que taponan cuando le vas ganando.',
        ],
        tips=['Juega primero las cartas que te abren camino a otras tuyas del mismo palo.', 'Si llevas un seis o un cuatro y nada detrás, retenlo mientras tengas otra jugada: los demás se quedarán sin poder seguir ese palo.'],
    ),
]
