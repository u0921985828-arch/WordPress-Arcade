"""Oleada 2 — agente «raqueta»: tenis y pádel cenitales (motor tenis) y dos modos nuevos del motor paddle (cuatro bandas y frontón)."""

GAMES = [
    dict(
        title='Tenis Rápido', genre='sports-casual', tags=['tenis', 'raqueta', 'versus', 'dobles', 'vector'],
        orient='auto', aspect='fill', inputs='TKG', engine='tenis', players='1–4 jugadores',
        cfg=dict(hud='bl', mode='tenis', games=4, sets=1,
                 help='Muévete con el joystick o las flechas. A golpea: si pulsas justo antes de que llegue la bola sale un golpe perfecto; pronto, cruzado; tarde, cortado. Inclina el joystick para apuntar y usa B para el globo. Para sacar pulsa A, lanzas la bola, y A otra vez arriba del todo. Set a 4 juegos con 2 de diferencia; a 4-4, tie-break a 7. Con 3 o 4 jugadores en la tele se juega a dobles.'),
        pad=dict(d='8', a='Golpe', b='Globo'), mp=(1, 4),
        desc=[
            'Tenis Rápido mete una pista dura entera en la pantalla del móvil, vista desde arriba y con la bola dibujando su parábola sobre la red. Todo lo importante del tenis está ahí: el saque cruzado al cuadro, la falta y la doble falta, la red que obliga a repetir, el bote único, las bolas que se van fuera por un palmo y el marcador de siempre, con su 15, su 30, su 40, sus iguales y su ventaja. Para que una partida quepa en un rato, el set se juega a cuatro juegos con dos de diferencia y, si llegáis a cuatro iguales, se decide en un tie-break a siete.',
            'La gracia está en el momento del golpe. Si pulsas un instante antes de que la bola llegue a la raqueta sale un drive plano y rapidísimo; si te adelantas, la bola se va cruzada y con liftado; si llegas tarde, sale cortada y pegada a la línea. Con el joystick eliges el lado, con B levantas un globo por encima del rival que sube a la red y, si la bola te llega alta cerca de la red, el golpe se convierte en remate. Aunque no pulses, tu jugador devuelve una bola blanda tras el bote, así que nadie se queda sin pelotear el primer día.',
            'Solo juegas contra una CPU que empieza con golpes suaves y se afina cada vez que le ganas. En la tele, dos personas juegan un individual y, con tres o cuatro móviles conectados, el partido pasa a dobles, rojos contra azules, con rotación de saque como en el circuito.',
        ],
        tips=['El círculo amarillo marca dónde va a botar la bola: colócate un paso por detrás y pulsa A cuando entre en tu alcance.',
              'Contra alguien pegado a la red, el globo con B es casi siempre punto.',
              'En el saque, golpea cuando la bola está arriba del todo; si te pasas, sale lenta o se va fuera.'],
    ),
    dict(
        title='Pádel de Cristal', genre='sports-casual', tags=['padel', 'raqueta', 'dobles', 'paredes', 'vector'],
        orient='auto', aspect='fill', inputs='TKG', engine='tenis', players='1–4 jugadores',
        cfg=dict(hud='bl', mode='padel', games=4, sets=1,
                 help='Muévete con el joystick o las flechas y pulsa A para golpear (a tiempo, golpe perfecto; pronto, cruzado; tarde, cortado). B lanza un globo. Saque por debajo con A al cuadro cruzado. La bola puede botar una vez y después rebotar en las paredes; si da en la pared del rival sin botar antes, es punto para quien recibe. Siempre 2 contra 2; set a 4 juegos y punto de oro a 40 iguales (simplificado: tie-break a 7 con 4-4).'),
        pad=dict(d='8', a='Golpe', b='Globo'), mp=(1, 4),
        desc=[
            'Pádel de Cristal es un partido de dos contra dos en una pista cerrada, con la moqueta azul, las paredes de vidrio al fondo y la malla metálica en los laterales. La bola bota una vez en tu campo y luego puede seguir viva rebotando en el cristal, así que muchos puntos se ganan esperando: dejar que la pared te la devuelva a la altura justa es tan importante como correr. La malla, en cambio, frena la bola y la deja caer muerta, y si el rival la manda contra tu pared sin que bote antes, el punto es tuyo.',
            'El golpe depende del momento en que pulsas. A tiempo sale un golpe plano y seco; si te adelantas, la bola se va cruzada con liftado, y si llegas tarde sale cortada hacia la pared. B es el globo, el golpe más útil del pádel: por encima de la pareja que sube a la red y directo al fondo. El saque se hace por debajo de la cintura al cuadro cruzado, y a cuarenta iguales se juega el punto de oro: quien lo gana se lleva el juego.',
            'En solitario formas pareja con la CPU contra otra pareja de la CPU que mejora con cada victoria. En la tele pueden jugar hasta cuatro personas con el móvil como mando, y los huecos los rellenan compañeros de la CPU que cubren su mitad de la pista.',
        ],
        tips=['Si la bola va a la pared de fondo, no la persigas: espera a que rebote en el cristal y golpéala al salir.',
              'Cuando la pareja rival esté en la red, un globo con B profundo les obliga a darse la vuelta.',
              'Recuerda que la malla lateral apaga la bola; el cristal la devuelve viva.'],
    ),
    dict(
        title='Disco a Cuatro Bandas', genre='party', tags=['disco', 'hockey-de-aire', 'fiesta', 'eliminacion', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='paddle', players='1–4 jugadores',
        cfg=dict(hud='bl', mode='four', lives=3,
                 help='Cada jugador defiende una portería con su pala: abajo y arriba se mueven con izquierda y derecha; los lados, con arriba y abajo (o también con izquierda y derecha). En el móvil puedes arrastrar el dedo. Cada gol encajado quita una vida; con 0 tu portería se cierra. Gana la última portería en pie. Golpea el disco en movimiento para darle efecto.'),
        pad=dict(d='8', t=1), mp=(2, 4),
        desc=[
            'Disco a Cuatro Bandas lleva el hockey de aire a una mesa cuadrada con una portería en cada lado y cuatro palas defendiéndolas. El disco no tiene dueño: rebota en las esquinas, en las palas y en las porterías que se van cerrando, y cada vez que entra en una de ellas su dueño pierde una vida. Quien se queda sin vidas ve cómo su portería se tapa con una barrera y desaparece de la partida, y la mesa sigue hasta que solo queda una portería abierta.',
            'Cada pala se desliza por su banda. La de abajo y la de arriba van de izquierda a derecha y las de los lados suben y bajan, aunque en el mando cualquiera de las dos direcciones funciona para que nadie se líe con la orientación. Si golpeas el disco mientras mueves la pala, sale con efecto y cambia de ángulo, y el disco acelera poco a poco a medida que avanza la partida, así que las rondas largas terminan con reflejos de verdad.',
            'Solo juegas abajo contra tres palas de la CPU, que arrancan lentas y mejoran cuantas más veces ganas. En la tele pueden jugar de dos a cuatro personas, cada una con su color, y las plazas libres las cubre la CPU. Es corto, ruidoso y perfecto para jugar a eliminar al que más presume.',
        ],
        tips=['Mueve la pala justo al golpear: un disco con efecto sale en diagonal y es mucho más difícil de parar.',
              'Cuando quedéis dos, las porterías cerradas hacen de pared: aprovecha los rebotes para atacar por el ángulo.'],
    ),
    dict(
        title='Frontón Vasco', genre='sports-casual', tags=['fronton', 'pelota', 'raqueta', 'versus', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='paddle', players='1–2 jugadores',
        cfg=dict(hud='bl', mode='fronton',
                 help='Jugáis por turnos contra la pared del frontón: la pelota debe dar en el frontis y botar dentro de la cancha, entre la línea de falta y la de pasa; el rival tiene que devolverla antes del segundo bote. Mueve a tu pelotari con el joystick, las flechas o arrastrando el dedo; el golpe es automático al llegar a la pelota y, si te mueves al golpear, sale con efecto. La pared izquierda devuelve la pelota; por la derecha se va fuera. Partido a 15 tantos (sin diferencia mínima).'),
        pad=dict(d='8', a='Saque', t=1), mp=(1, 2),
        desc=[
            'Frontón Vasco es un partido de pala en una cancha de frontón vista desde arriba: el frontis gris al fondo, la pared izquierda a un lado y el lado derecho abierto, por donde la pelota se escapa si la golpeas mal. Los dos pelotaris comparten el suelo y juegan por turnos, cada uno con su color: el que saca lanza la pelota contra la pared, y el otro tiene que llegar a devolverla contra el frontis antes de que bote dos veces.',
            'Las líneas del suelo cuentan. Después del frontis, la pelota tiene que botar entre la línea de falta y la línea de pasa; si se queda corta o se va larga, el tanto es para el rival, igual que si sale por el lado abierto. Te mueves por toda la cancha y el golpe es automático al llegar a la pelota, pero si lo haces en movimiento le das efecto y la pelota vuelve cruzada, pegada a la pared o hacia la zona abierta. Usar la pared izquierda para esconder la pelota es la jugada que más duele.',
            'En solitario juegas contra un pelotari de la CPU que empieza despacio y mejora con cada victoria tuya; en la tele, dos personas se enfrentan con el móvil como pala. El partido va a quince tantos y cada tanto dura lo justo para pedir la revancha.',
        ],
        tips=['Tras golpear, vuelve al centro de la cancha: el rival puede mandarla a cualquier rincón.',
              'Un golpe con efecto hacia la derecha abre la pelota hacia el lado sin pared y obliga al rival a correr.'],
    ),
]
