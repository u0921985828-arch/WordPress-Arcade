# -*- coding: utf-8 -*-
"""Oleada 5 — motor `ciudad`: dos juegos de rejilla y panel para un jugador.

Fábrica de Cintas: rompecabezas de montaje con 20 niveles escritos a mano, todos con solución
comprobada por simulación en Node (y con el mínimo de piezas verificado por búsqueda exhaustiva).
Ciudad de Bloques: construcción de barrio por casillas con presupuesto, ánimo de los vecinos y
12 medallas que cierran la partida (no es un incremental sin final).
"""

GAMES = [
    dict(
        title='Fábrica de Cintas', genre='puzzle',
        tags=['fabrica', 'cintas', 'logica', 'montaje', 'niveles', 'vector'],
        orient='portrait', aspect='4:3', inputs='TKM', engine='ciudad', pad=None, mp=None, players='1 jugador',
        cfg=dict(mode='cintas', help='Coloca cintas transportadoras sobre el suelo libre para llevar cada pieza desde su tolva hasta la caja de su color. Toca una casilla para poner la pieza elegida abajo y tócala otra vez para girarla (a la cuarta vuelta se quita). El desvío manda las piezas alternando recto y a la derecha, y la pintora cambia el color de todo lo que pasa por ella. Cuando tengas el diseño, pulsa Marcha y mira si funciona: si una pieza se cae al suelo, se sale de la nave o entra en una caja que no es la suya, se para y puedes arreglarlo. Son 20 niveles con el progreso guardado y cada uno indica con cuántas piezas se puede resolver.'),
        desc=[
            'Fábrica de Cintas es un juego de montar y ver funcionar. La nave está vacía, una tolva escupe piezas de colores cada pocos segundos y al otro lado espera una caja que solo acepta las de su color. Entre medias no hay nada: el camino lo pones tú, casilla a casilla, con cintas transportadoras que giran en las cuatro direcciones. Cuando crees que el recorrido está bien, pulsas Marcha y la fábrica arranca. No hay que reaccionar rápido ni acertar a nada; la gracia está en pensar el trazado y en ver cómo tu idea se cumple o se cae al suelo a mitad de camino.',
            'A las cintas se les suman dos máquinas que dan mucho juego. El desvío reparte lo que le llega alternando recto y a la derecha, así que con uno solo se pueden llenar dos cajas a la vez si el reparto cuadra con lo que pide cada una. La pintora tiñe del color de su depósito todo lo que la atraviesa, de modo que una tolva de piezas rojas puede acabar llenando una caja azul si la haces pasar por donde toca. Los niveles van presentando las piezas de una en una: el primero se resuelve con tres cintas rectas y no hace falta leer nada, y a partir de ahí aparecen los muros, las segundas tolvas, las cajas ajenas en las que no debe caer ninguna pieza, el desvío y las pintoras que colocas tú.',
            'Son veinte niveles escritos a mano, no generados al azar, y cada uno ha sido comprobado por simulación: existe solución y se sabe con cuántas piezas como mínimo. Ese número aparece en pantalla, así que siempre hay dos retos a la vez, terminar el nivel y terminarlo ajustado, y la puntuación premia el diseño limpio. El progreso se guarda por dificultad, hay tres niveles de exigencia y el último nivel cierra el juego de verdad con la pantalla de juego completado. Si algo falla, el simulador te dice exactamente qué ha pasado y dónde, para que no haya que adivinar: la pieza se cayó al suelo, se salió de la nave o llamó a la puerta equivocada.',
        ],
        tips=['Antes de poner nada, sigue con el dedo el camino entero desde la tolva hasta la caja: casi siempre hay una ruta más corta pegada a la pared.',
              'El desvío alterna recto y derecha, así que reparte por mitades: úsalo cuando las dos cajas pidan el mismo número de piezas.',
              'Si te sobran piezas del inventario no pasa nada, pero llegar al mínimo indicado da bastantes más puntos.'],
    ),
    dict(
        title='Ciudad de Bloques', genre='puzzle',
        tags=['ciudad', 'construccion', 'barrio', 'gestion', 'medallas', 'vector'],
        orient='portrait', aspect='4:3', inputs='TKM', engine='ciudad', pad=None, mp=None, players='1 jugador',
        cfg=dict(mode='ciudad', help='Construyes un barrio casilla a casilla con el dinero que tienes. Elige abajo qué quieres poner (calle, casa, tienda, parque, fábrica o derribo) y toca una casilla libre. Las casas solo traen vecinos si están pegadas a una calle unida a la entrada del barrio; los parques suben el ánimo, las fábricas dan mucho dinero pero lo hunden, y las tiendas rinden si tienen casas cerca. Cada mes cobras según los vecinos, las tiendas y el ánimo, y pagas el mantenimiento. Hay 12 medallas: consíguelas todas antes de que se acaben los 36 meses y el barrio queda terminado.'),
        desc=[
            'Ciudad de Bloques es una partida de construcción tranquila, con principio y final. Empiezas con un solar vacío, un tramo de calle en la entrada y algo de dinero en la caja. A partir de ahí decides tú: calles para conectar, casas para traer vecinos, tiendas para que entre dinero, parques para que la gente esté a gusto y fábricas para los que prefieran ingresos rápidos a costa del ambiente. Cada mes se cobran los ingresos y se paga el mantenimiento, y el marcador de arriba enseña siempre la verdad: cuánto entra, cuántos vecinos hay y en qué punto está el ánimo del barrio.',
            'Las reglas se entienden jugando, sin leer nada. Una casa aislada aparece marcada porque no llega a ninguna calle, y mientras siga así no trae a nadie. Una casa pegada a una fábrica se enfada, y se nota en el ánimo y en la renta, que baja con él. Un parque al lado levanta el humor de todas las casas de alrededor y una tienda cerca lo mejora un poco más. La partida tiene una línea de objetivos visible en todo momento: la siguiente medalla que falta aparece bajo el tablero, así que siempre sabes qué conviene hacer ahora aunque sea tu primera partida.',
            'Las doce medallas son el final de verdad del juego, y por eso esto no es un incremental que se alarga sin motivo. Van desde lo básico, el primer vecino o los ocho tramos de calle, hasta metas que exigen planificar el barrio entero: cuarenta vecinos, una renta alta con fábrica sin hundir el ambiente, doce edificios sin ninguno aislado y, para terminar, sesenta vecinos con el ánimo por encima de ochenta. Consíguelas todas y el barrio queda cerrado como barrio modelo; si se agotan los treinta y seis meses antes, la partida termina igual y se puntúa lo conseguido. Las tres dificultades cambian el dinero inicial y la duración del mes, de modo que se puede jugar con calma o a contrarreloj.',
        ],
        tips=['Antes de poner casas, tira la calle: una casa sin calle no trae vecinos y encima baja el ánimo.',
              'Un parque entre cuatro casas rinde mucho más que uno en una esquina del mapa.',
              'La fábrica da mucho dinero, pero ponla lejos de las casas o el ánimo se hunde y la renta baja con él.'],
    ),
]
