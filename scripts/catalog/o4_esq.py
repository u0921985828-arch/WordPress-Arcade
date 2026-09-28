"""Oleada 4 — esquinas de colores (estilo Blokus, marca blanca; motor `esquinas`)."""

PAD_E = dict(d='8', a='Poner', b='Girar', t=1)

GAMES = [
    dict(title='Esquinas de Colores', genre='strategy-cards',
         tags=['blokus','piezas','territorio','mesa','multijugador','vector'],
         orient='auto', aspect='fill', inputs='TKMG', engine='esquinas', pad=PAD_E,
         mp=(1, 4), players='1–4 jugadores',
         cfg=dict(mode='esquinas', help='Cada jugador tiene 21 piezas y empieza en su esquina. Tus piezas solo pueden tocarse entre sí por las puntas, nunca por los lados; con las de los rivales puedes pegarte todo lo que quieras. Elige una pieza, toca el tablero y se coloca sola si cabe. Gana quien menos casillas le sobren al final.'),
         desc=[
             'Esquinas de Colores es nuestra versión del clásico de piezas geométricas: un tablero de veinte por veinte y veintiuna piezas por color, desde la casilla suelta hasta las doce formas de cinco casillas. Cada jugador arranca en su esquina y va extendiéndose hacia el centro con una única regla que lo cambia todo: dos piezas tuyas solo pueden tocarse punta con punta, jamás lado con lado. Con las piezas de los demás no hay límite, así que el tablero se convierte en una pelea por las diagonales.',
             'Eso convierte cada turno en dos decisiones a la vez: dónde crecer y dónde estorbar. Colocar una pieza grande pronto te da espacio, pero deja menos recursos para el final, cuando los huecos son estrechos y solo entran las formas pequeñas. Bloquear una diagonal del rival puede valer más que ganar dos casillas propias. Y todo el mundo compite por el centro, porque el que llega antes reparte sus puntas hacia todas partes mientras los demás se quedan pegados a su esquina.',
             'La partida termina cuando nadie puede colocar nada. Restas una casilla por cada una que te sobre, y si consigues colocar las veintiuna piezas te llevas quince puntos de premio. Hay botón de girar, un botón de pista que te enseña la mejor jugada que ha encontrado la máquina y colocación asistida: tocas el tablero donde quieres la pieza y se acomoda sola en la primera posición legal. Se juega de uno a cuatro: en el modo tele cada jugador elige su pieza en su propio móvil y la coloca en la pantalla grande. Tres niveles de dificultad cambian lo bien que juegan los rivales.',
         ],
         tips=[
             'Ve al centro cuanto antes: desde ahí tus puntas llegan a todas partes.',
             'Gasta las piezas grandes al principio; las pequeñas son las que entran en los huecos del final.',
             'Una pieza bien puesta puede cerrar dos diagonales de un rival de golpe.',
         ]),
]
