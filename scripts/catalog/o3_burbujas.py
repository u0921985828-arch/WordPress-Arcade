"""Oleada 3 — agente «burbujas»: lanzador de burbujas y fusión (motor burbujas), columnas de gemas (motor columnas)
y el modo 'comilona' de snake.js (dos comedores contra dos fantasmas)."""

_V = dict(orient='portrait', aspect='fill', inputs='TKMG')

GAMES = [
    dict(
        title='Burbujas Arcoíris', genre='arcade', tags=['burbujas', 'punteria', 'colores', 'rebotes', 'vector'], engine='burbujas', **_V,
        cfg=dict(mode='arcoiris', hud='bl', help='Apunta con el dedo o el ratón hacia donde quieres lanzar y suelta para disparar; también puedes girar con ← → y lanzar con A. Las paredes laterales rebotan. Junta tres o más burbujas del mismo color para reventarlas: las que se queden colgando sin sujeción caen y valen el doble. Cada pocos disparos baja el techo una fila; si alguna burbuja cruza la línea rosa, se acabó. B intercambia la burbuja cargada por la siguiente.'),
        pad=dict(d='h', a='Lanzar', b='Cambiar', t=1), mp=None, players='1 jugador',
        desc=[
            'Burbujas Arcoíris es un lanzador de burbujas de los de toda la vida, dibujado con gemas de colores brillantes dentro de un tubo de cristal. Abajo hay un cañón que gira siguiendo tu dedo o el ratón, y arriba un racimo de burbujas pegadas al techo que avanza hacia ti cada pocos disparos. La regla es tan sencilla como tramposa: tres burbujas iguales que se tocan estallan, y todo lo que quedaba sujeto solo por ellas se desprende y cae.',
            'Ahí está la gracia. Reventar un trío suelto da unos pocos puntos; descolgar media pared de golpe da muchísimos más. Por eso conviene mirar el racimo antes de disparar y buscar la burbuja que hace de clavo, aunque esté escondida en un rincón: las paredes laterales rebotan, así que casi siempre hay una trayectoria en diagonal que llega. La guía punteada marca el primer rebote para que puedas calcular sin adivinar.',
            'Cada color lleva además un símbolo distinto dentro (estrella, punto, hoja, anillo, triángulo, aspa), de modo que se distinguen aunque los tonos se parezcan o la pantalla sea pequeña. Se empieza con tres colores y van entrando más a medida que el techo baja. Si la burbuja cargada no te sirve, cámbiala por la siguiente y gana un disparo bueno en lugar de malgastar dos.',
            'La partida termina cuando el racimo cruza la línea de peligro, así que no basta con ir limpiando por abajo: hay que abrir huecos hacia arriba y mantener corto el montón. El récord se guarda en el propio navegador.',
        ],
        tips=['Busca la burbuja que sujeta un racimo entero: descolgarlo vale más que reventar tres sueltas.',
              'Usa los rebotes en las paredes para llegar a los huecos de los lados.',
              'Si la burbuja cargada no encaja, cámbiala por la siguiente antes de disparar a lo loco.'],
    ),
    dict(
        title='Fusión de Frutas', genre='arcade', tags=['fusion', 'fisica', 'frutas', 'apilar', 'vector'], engine='burbujas', **_V,
        cfg=dict(mode='fruta', hud='bl', help='Mueve la fruta con el dedo, el ratón o ← → y suéltala tocando la pantalla o con A. Dos frutas iguales que se tocan se funden en la siguiente de la lista y suman más puntos: cereza, fresa, uva, mandarina, naranja, kiwi, manzana, pomelo, melocotón, melón y sandía. El tarro rebosa si una fruta se queda quieta por encima de la línea de puntos durante dos segundos.'),
        pad=dict(d='h', a='Soltar', t=1), mp=None, players='1 jugador',
        desc=[
            'Fusión de Frutas es un juego de física tranquilo y traicionero a la vez. Sueltas frutas dentro de un tarro y, cuando dos iguales se tocan, desaparecen y en su lugar nace la siguiente de la escala, que es más grande y vale más puntos. Empiezas con cerezas diminutas y, si administras bien el espacio, terminas con una sandía enorme ocupando medio tarro.',
            'El problema es que las frutas ruedan. Cada una es un cuerpo redondo con su peso, que empuja a las de al lado, se cuela por los huecos y se asienta con el tiempo. Una uva mal colocada en el centro parte el montón en dos y deja dos mandarinas condenadas a no encontrarse nunca. Por eso la estrategia habitual es ordenar por tamaños: las grandes al fondo, las pequeñas arriba y cerca de las paredes, donde siempre queda un rincón para rematar una pareja.',
            'La física está pensada para ser estable: las piezas nunca se solapan de forma permanente ni salen despedidas, y los rebotes son cortos y amortiguados, así que el montón se comporta como uno espera de una pila de fruta. Cuando funden varias a la vez se encadenan solas y el marcador sube a saltos.',
            'No hay reloj ni enemigos: la única presión es la línea de puntos de la boca del tarro. Si una fruta se queda apoyada por encima durante dos segundos, se acabó la partida. El récord queda guardado y siempre apetece un intento más.',
        ],
        tips=['Coloca las frutas grandes abajo y guarda las paredes para rematar parejas pequeñas.',
              'No sueltes dos frutas iguales en sitios opuestos del tarro: casi nunca acaban encontrándose.',
              'Si el montón sube por el centro, tira una fruta pequeña a un lateral para ganar tiempo.'],
    ),
    dict(
        title='Fusión Solar', genre='arcade', tags=['fusion', 'fisica', 'espacio', 'gravedad', 'vector'], engine='burbujas', **_V,
        cfg=dict(mode='solar', hud='bl', help='Gira alrededor del anillo con el dedo, el ratón o ← → y suelta un cuerpo hacia el sol con A o tocando la pantalla. La gravedad tira de todo hacia el centro. Dos cuerpos iguales se funden en el siguiente: polvo, asteroide, luna, Mercurio, Marte, Tierra, Neptuno, Júpiter, Saturno, enana roja y estrella. Si un cuerpo se queda quieto rozando el anillo exterior dos segundos, el sistema se desborda.'),
        pad=dict(d='h', a='Soltar', t=1), mp=None, players='1 jugador',
        desc=[
            'Fusión Solar coge la idea de juntar iguales y le da la vuelta a la gravedad. Aquí no hay suelo: hay un sol en el centro que atrae todo lo que sueltas, y un anillo exterior que hace de frontera. Los cuerpos caen hacia dentro, se apilan en capas alrededor de la estrella y forman un sistema planetario que crece hacia fuera a medida que juegas.',
            'La escala va del polvo cósmico a una estrella pasando por lunas, Marte, la Tierra, Neptuno, Júpiter y un Saturno con anillos. Al soltar desde el borde eliges el ángulo, no la columna, así que la puntería funciona de otra manera: un cuerpo lanzado en un hueco entre dos planetas grandes resbala y acaba dando la vuelta media órbita antes de detenerse. Conviene pensar en radios y en sectores, y dejar el lado más despejado para las piezas gordas.',
            'La física es la misma que la del tarro de frutas, con gravedad radial en lugar de vertical: pasos pequeños y fijos, choques amortiguados y posiciones recortadas dentro del anillo, de modo que nada se sale ni sale disparado por acumular energía. El montón se asienta despacio y se puede planear con calma.',
            'Pierdes si un cuerpo se queda parado tocando el anillo exterior durante dos segundos. Como el sistema crece en círculo, el aviso llega antes que en un tarro: en cuanto veas el borde iluminarse, toca fusionar lo que tengas cerca para recuperar sitio.',
        ],
        tips=['Suelta las piezas pequeñas en los huecos entre planetas grandes: resbalan hasta el fondo.',
              'Reparte los tamaños por sectores del anillo en vez de amontonarlos en un lado.',
              'Cuando el borde parpadee, busca una fusión rápida: cada una libera una capa entera.'],
    ),
    dict(
        title='Columnas de Joyas', genre='arcade', tags=['gemas', 'caida', 'combos', 'diagonales', 'vector'], engine='columnas', **_V,
        cfg=dict(mode='joyas', hud='bl', help='Cae una columna de tres gemas. Muévela con ← → o arrastrando a los lados, gira el orden de sus colores con A o tocando la pantalla, y suéltala de golpe con B o deslizando hacia abajo (↓ la acelera). Tres o más gemas iguales en línea horizontal, vertical o diagonal desaparecen; lo que queda encima cae y puede encadenar más combos. A partir del nivel 3 aparece alguna gema comodín que limpia todas las del color donde aterriza. Se acaba si el pozo se llena.'),
        pad=dict(d='8', a='Girar', b='Soltar', t=1), mp=None, players='1 jugador',
        desc=[
            'Columnas de Joyas es el clásico de las tres gemas que caen juntas, con un pozo estrecho de siete columnas y catorce filas. Lo que cae siempre es lo mismo —una torre de tres piedras de colores— pero puedes rotar el orden de esas tres piedras tantas veces como quieras mientras baja, y eso convierte cada pieza en una herramienta muy flexible.',
            'Se limpia con tres o más gemas iguales en línea, y aquí las diagonales también cuentan, que es justo lo que separa a este juego del típico de bloques. Una gema colocada en el sitio exacto puede completar a la vez una fila y una diagonal, y al desaparecer deja caer lo de arriba, que a su vez forma otra línea: así nacen las cadenas, que multiplican los puntos por cada eslabón. Montar un montón escalonado y rematarlo con la pieza correcta es la mejor jugada del juego.',
            'Cada color tiene su propia forma —diamante, círculo, cuadrado, gota, hexágono y estrella—, de modo que se distinguen de un vistazo en una pantalla de móvil. El nivel 1 empieza muy lento y con solo cuatro colores; el quinto entra en el nivel 4 y el sexto en el 7, y la caída se acelera poco a poco cada veintidós gemas limpiadas. A partir del nivel 3 aparece de vez en cuando una gema comodín que borra todas las del color sobre el que cae.',
            'La sombra bajo la columna indica dónde va a aterrizar, así que se puede jugar rápido sin fallar por milímetros. La partida acaba cuando una columna no cabe en el pozo.',
        ],
        tips=['Deja el montón en escalera: las diagonales son la mejor fuente de cadenas.',
              'Gira la columna antes de moverla; llegar con el color correcto abajo ahorra un turno.',
              'Guarda el comodín para el color que más se te haya acumulado.'],
    ),
    dict(
        title='Comilona a Cuatro', genre='arcade', tags=['laberinto', 'persecucion', 'equipos', 'versus', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='snake',
        cfg=dict(mode='comilona', hud='bl', help='Dos comedores contra dos fantasmas en el mismo laberinto, noventa segundos. Muévete con el joystick, las flechas o deslizando. Comedores (J1 y J2): cada bolita vale 1 punto y las cuatro bolas moradas dan siete segundos de poder para comerse a los fantasmas (+20 cada uno). Fantasmas (J3 y J4): cada comedor atrapado vale 15 puntos y le cuesta 5 al comedor, que vuelve a su esquina tras dos segundos. Nadie captura durante los cinco primeros segundos. Si se acaban las bolitas, los comedores se llevan 25 puntos extra.'),
        pad=dict(d='8'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'Comilona a Cuatro convierte la persecución de laberinto en un duelo por equipos: dos comedores tienen que barrer las bolitas del tablero y dos fantasmas tienen que impedirlo. Todos ven la misma pantalla y todos se mueven a la vez, así que lo que en el arcade clásico era un jugador contra la máquina aquí es una negociación constante entre compañeros que se cruzan, se tapan los pasillos y se roban las bolitas.',
            'El laberinto se genera en cada partida con bloques simétricos y se comprueba que no queden callejones sin salida ni zonas incomunicadas, de modo que siempre hay escapatoria y siempre hay rodeo. Las cuatro bolas moradas son el punto de inflexión: durante siete segundos los fantasmas se vuelven azules, huyen y valen veinte puntos, y un comedor listo espera a que se acerquen antes de morderla. Los fantasmas, por su parte, aprenden pronto que conviene acorralar a un comedor entre dos pasillos en vez de perseguirlo en línea recta.',
            'Los puntos se cuentan por persona y por equipo: el marcador central enseña comedores contra fantasmas y el podio final ordena a los cuatro. En los cinco primeros segundos nadie puede capturar a nadie, así que da tiempo a colocarse, y los fantasmas salen de su esquina un par de segundos después de la cuenta atrás.',
            'Se juega en la tele con hasta cuatro móviles de mando, o tú solo contra tres personajes de la CPU que buscan bolitas con caminos cortos y que afinan si les ganas. Cuando alguien se marcha a media partida, la CPU ocupa su sitio sin cortar la ronda.',
        ],
        tips=['Comedores: repartíos el tablero por mitades en vez de ir los dos a la misma bolita.',
              'Guarda una bola de poder para cuando los fantasmas te tengan acorralado.',
              'Fantasmas: uno tapa el pasillo y el otro empuja; perseguir de frente casi nunca funciona.'],
    ),
]
