# -*- coding: utf-8 -*-
"""Oleada 4 — puzles lógicos con solución única verificada por fuerza bruta (motor `logica2`).

Los cinco comparten la misma piel: menú propio, 20 niveles con progreso guardado por dificultad,
pista, reinicio y final de verdad al terminar el nivel 20.
"""
HELP_COMUN = ' Tres dificultades: en Fácil los tableros son más pequeños y en Difícil más grandes. Tienes 20 niveles con el progreso guardado; el botón Pista resuelve una pieza a cambio de puntos.'

GAMES = [
    dict(
        title='Puentes entre Islas', genre='puzzle', tags=['puentes', 'hashi', 'logica', 'deduccion', 'mar', 'vector'],
        orient='portrait', aspect='4:3', inputs='TKM', engine='logica2', pad=None, mp=None, players='1 jugador',
        cfg=dict(mode='puentes', help='Cada isla lleva un número: son los puentes que salen de ella. Toca una isla y luego otra en la misma fila o columna para poner un puente; toca otra vez para poner el segundo y una tercera para quitarlos. Los puentes no se cruzan y al final todas las islas tienen que quedar unidas en una sola red.' + HELP_COMUN),
        desc=[
            'El hashi japonés de toda la vida, el de los puentes entre islas, con tableros generados al vuelo y una garantía que no todos los juegos de este tipo cumplen: cada tablero tiene una sola solución, comprobada por fuerza bruta antes de ponértelo delante. Eso significa que nunca hace falta adivinar. Si te atascas, la respuesta está en el tablero y se deduce; no hay dos caminos buenos ni ramas que dependan de la suerte.',
            'Las reglas son cortas y se aprenden en medio minuto. El número de cada isla dice cuántos puentes salen de ella en total. Los puentes solo van en horizontal o en vertical, como mucho dos entre las mismas dos islas, y jamás se cruzan entre sí ni atraviesan una isla. Y hay una condición final que es la que da todo el sabor: cuando termines, tiene que poderse llegar de cualquier isla a cualquier otra andando por los puentes, sin que quede ningún grupito suelto por su cuenta.',
            'El truco para empezar siempre es el mismo: busca las islas con número alto pegadas al borde o a una esquina, porque tienen pocos vecinos y sus puentes están obligados. Un 4 en una esquina solo tiene dos direcciones, así que son dos puentes dobles seguros. A partir de ahí la cadena se desenreda sola. Las islas se pintan en verde cuando ya tienen todos sus puentes y en rojo si te has pasado, de modo que el tablero te va confirmando por dónde vas bien sin chivarte la solución.',
        ],
        tips=['Empieza por las esquinas y los bordes: un 3 en un borde o un 4 en una esquina tienen los puentes obligados.', 'Si una isla de 1 solo tiene un vecino de 1, ese puente no puede ir ahí o los dos quedarían aislados del resto.', 'Cuando te falte poco, comprueba que no estás formando una isla cerrada: todo tiene que quedar en una sola red.'],
    ),
    dict(
        title='Estrellas Ocultas', genre='puzzle', tags=['estrellas', 'star-battle', 'logica', 'regiones', 'deduccion', 'vector'],
        orient='portrait', aspect='4:3', inputs='TKM', engine='logica2', pad=None, mp=None, players='1 jugador',
        cfg=dict(mode='estrellas', help='Coloca una estrella en cada fila, en cada columna y en cada comarca de color, sin que dos estrellas se toquen ni siquiera en diagonal. Cada toque cambia la casilla: vacía, aspa (para descartar) y estrella.' + HELP_COMUN),
        desc=[
            'Star Battle en su versión de una estrella por línea: un tablero partido en comarcas de colores en el que hay que colocar exactamente una estrella en cada fila, una en cada columna y una en cada comarca. La regla que lo complica todo es que dos estrellas no pueden tocarse, ni de lado ni en diagonal, así que cada estrella que pones apaga las ocho casillas de alrededor y empuja a las demás a buscarse la vida lejos.',
            'Como en los demás puzles de este motor, el generador no se limita a repartir comarcas al azar: cuenta las soluciones por fuerza bruta y solo te sirve el tablero cuando hay exactamente una. Nunca vas a llegar al final y encontrarte con dos sitios igual de válidos. Las aspas son tu cuaderno: marca con ellas las casillas que ya has descartado y el tablero se va quedando limpio hasta que la estrella cae por su propio peso.',
            'Los tableros arrancan en cinco por cinco y van creciendo hasta ocho por ocho en los últimos niveles, y en Difícil empiezan ya grandes. Las comarcas pequeñas son siempre el mejor sitio para empezar: una comarca de tres casillas en la misma fila obliga a que esa fila gaste ahí su estrella, y eso descarta de golpe toda la fila. Con dos o tres deducciones de ese tipo el tablero se abre solo.',
        ],
        tips=['Mira primero las comarcas pequeñas y las que caben en una sola fila o columna: obligan más que las grandes.', 'Usa las aspas sin miedo; descartar es la mitad del juego y sin ellas te vas a liar en los tableros de ocho.', 'Cuando pongas una estrella, tacha enseguida su fila, su columna y sus ocho vecinas: la mayoría de los errores salen de saltarse ese paso.'],
    ),
    dict(
        title='Tiendas y Árboles', genre='puzzle', tags=['tiendas', 'arboles', 'logica', 'camping', 'deduccion', 'vector'],
        orient='portrait', aspect='4:3', inputs='TKM', engine='logica2', pad=None, mp=None, players='1 jugador',
        cfg=dict(mode='tiendas', help='Planta una tienda al lado de cada árbol, en horizontal o en vertical. Los números de los bordes dicen cuántas tiendas hay en esa fila o columna. Dos tiendas no pueden tocarse ni en diagonal. Cada toque cambia la casilla: vacía, hierba (para descartar) y tienda.' + HELP_COMUN),
        desc=[
            'El clásico de las tiendas y los árboles, un puzle de camping que engancha porque parece fácil hasta que te das cuenta de que la solución no depende de dónde te apetece poner la tienda, sino de dónde no puede estar. Hay tantas tiendas como árboles y cada tienda va emparejada con un árbol que tiene al lado, en horizontal o en vertical; nunca en diagonal y nunca dos tiendas compartiendo el mismo árbol.',
            'Los números de los márgenes cuentan las tiendas de cada fila y de cada columna, y se ponen verdes en cuanto cuadran y rojos si te pasas, así que el tablero va llevando la cuenta por ti. La otra regla es la del respeto entre campistas: dos tiendas no pueden quedar pegadas, ni siquiera tocándose por una esquina. Esa condición es la que convierte un reparto aparentemente libre en una cadena de deducciones muy cerrada.',
            'La hierba sirve para marcar lo que ya has descartado, y es donde de verdad se gana la partida: una fila con un cero en el margen se tacha entera de un tirón, y todas las casillas que no tocan ningún árbol tampoco pueden llevar tienda. Cuando el tablero está lleno de hierba, los árboles que se quedan con un solo hueco libre reparten sus tiendas solos. Cada tablero está verificado por fuerza bruta: hay una única colocación posible.',
        ],
        tips=['Empieza tachando con hierba las filas y columnas que marcan cero y todas las casillas que no tocan ningún árbol.', 'Un árbol que solo tiene un hueco libre a su lado te regala una tienda; en cuanto la pones, rodéala de hierba.', 'Si en una fila quedan tantos huecos como tiendas pide el número, están todos ocupados: colócalos sin dudar.'],
    ),
    dict(
        title='Suma Diez', genre='puzzle', tags=['sumas', 'numeros', 'parejas', 'calculo', 'rapido', 'vector'],
        orient='portrait', aspect='4:3', inputs='TKM', engine='logica2', pad=None, mp=None, players='1 jugador',
        cfg=dict(mode='suma', help='Toca dos números vecinos (arriba, abajo, izquierda o derecha) que sumen diez y desaparecen los dos. Vacía la rejilla entera para pasar de nivel. Si te quedas sin parejas, el botón Deshacer retrocede jugada a jugada.' + HELP_COMUN),
        desc=[
            'Un puzle de números corto y adictivo: una rejilla llena de cifras del uno al nueve de la que hay que ir quitando parejas de casillas vecinas que sumen exactamente diez, hasta dejarla vacía del todo. Suena a juego de cálculo mental de clase de primero, y en parte lo es, pero el chiste está en el orden: la pareja que te apetece quitar ahora puede ser justo la que necesitabas para liberar el rincón de abajo dentro de diez jugadas.',
            'Las rejillas no salen al azar. Cada una se construye emparejando la cuadrícula entera en fichas de dominó y dando a cada pareja dos números que suman diez, así que siempre existe un orden que la vacía por completo; no hay tableros imposibles. Lo que sí puede pasar es que te quedes atascado por haber deshecho el orden bueno, y para eso está el botón Deshacer, que retrocede jugada a jugada todas las veces que haga falta y te avisa en cuanto no quedan parejas sobre la mesa.',
            'Los niveles empiezan en una rejilla pequeña de cuatro por cuatro y terminan en tableros altos de nueve filas donde ya hay que mirar con cierta cabeza antes de tocar. Es el juego perfecto para una cola o para el autobús: una partida entera cabe en dos minutos, el progreso se guarda por dificultad y siempre se puede reiniciar el nivel sin perder lo que llevas hecho en los demás.',
        ],
        tips=['Vacía primero las esquinas y los bordes: las casillas del centro casi siempre tienen más parejas posibles.', 'Antes de quitar una pareja, mira si alguna de las dos era la única salida de un número atrapado.', 'Si te atascas, deshaz varias jugadas de golpe en vez de reiniciar: casi siempre el fallo está a dos o tres pasos.'],
    ),
    dict(
        title='Gatos en Cajas', genre='puzzle', tags=['deduccion', 'gatos', 'pistas', 'logica', 'zebra', 'vector'],
        orient='portrait', aspect='4:3', inputs='TKM', engine='logica2', pad=None, mp=None, players='1 jugador',
        cfg=dict(mode='gatos', help='Cada gato está escondido en una caja distinta. Lee las pistas de arriba, toca un gato de la bandeja y luego su caja; toca una caja ocupada para sacar al gato. Coloca a todos en su sitio para ganar.' + HELP_COMUN),
        desc=[
            'Un puzle de deducción a la manera del acertijo de las cinco casas, pero corto, con gatos y sin necesidad de lápiz: hay una fila de cajas y un gato escondido en cada una, y unas cuantas pistas que, leídas juntas, dejan una única colocación posible. Nada de probar a ver si suena: las pistas se generan y luego se podan una a una, quitando todas las que sobran, hasta dejar el conjunto mínimo con el que la solución sigue siendo única.',
            'Las pistas mezclan varios tipos para que la deducción no sea siempre igual: las hay que fijan una caja, las que descartan una, las que dicen que un gato está a la izquierda de otro, las que los ponen justo al lado y las que indican cuántas cajas hay entre dos. Con cuatro gatos se resuelve casi de cabeza; con seis, en los niveles altos, conviene ir colocando y descolocando sobre el propio tablero, que para eso se puede tocar una caja ocupada y devolver al gato a la bandeja.',
            'Michi, Nube, Bigotes, Sombra, Trufa y Pelusa están dibujados por código, cada uno de su color, y van cambiando de caja sin protestar mientras pruebas combinaciones. El nivel no se da por bueno hasta que todos están en su sitio, y la pista coloca un gato correcto a cambio de puntos si de verdad te has quedado sin ideas. Veinte niveles, progreso guardado y un final cuando resuelves el último.',
        ],
        tips=['Empieza por la pista más restrictiva: las que fijan una caja o hablan de un extremo cierran muchas puertas de golpe.', 'Las pistas de «a la izquierda de» son más fuertes de lo que parecen al principio y al final de la fila.', 'Coloca sobre el tablero aunque no estés seguro: ver la fila montada hace saltar la contradicción mucho antes que pensarla.'],
    ),
]
