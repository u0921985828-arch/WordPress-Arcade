"""Oleada 1 — carreras cenitales (racer2d) y barcos (naval). Agente «carreras»."""

GAMES = [
    dict(
        title='Rally de Mesa', genre='racing', tags=['carreras', 'derrape', 'cenital', 'copa', 'vector'],
        orient='auto', aspect='fill', inputs='TKG', engine='racer2d',
        cfg=dict(mode='mesa', help='Apunta con el joystick hacia donde quieres ir: el coche gira y acelera solo. A acelera recto, B es el freno de mano para derrapar. Copa de 3 carreras: si te sales por el borde de la mesa, caes al suelo y pierdes unos segundos.'),
        pad=dict(d='8', a='Acelerar', b='Derrape'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Rally de Mesa convierte la mesa de la cocina en un circuito de juguete. Cuatro cochecitos corren sobre un mantel de cuadros pegado con cinta, entre tazas de café, naranjas y galletas, y el mayor peligro no es un rival sino el borde del tablero: si te pasas de frenada en una curva pegada al canto, el coche vuela, cae al suelo y vuelve a la pista unos segundos después, ya sin la posición que tenías.',
            'Cada partida es una pequeña copa de tres carreras en circuitos distintos, cada una a dos o tres vueltas. Puntúan los cuatro puestos (10, 6, 3 y 1) y en la siguiente carrera sale delante quien va último, así que nada está decidido hasta la meta final. Por la mesa hay agua derramada que te hace patinar, harina que te frena y manchas de aceite que te hacen girar como una peonza.',
            'Se juega con un solo control: apunta con el joystick, las flechas o el dedo hacia donde quieres ir y el coche gira y acelera solo. El botón A acelera recto y B es el freno de mano, perfecto para cruzar el coche en las horquillas. En la tele pueden jugar hasta cuatro personas con el móvil como mando; la cámara sigue al que va primero y quien se queda fuera de plano reaparece detrás del líder. Los coches de la CPU trazan la línea ideal, fallan de vez en cuando y se vuelven más finos cada vez que les ganas la copa.',
        ],
        tips=['En las curvas junto al borde, suelta el joystick un instante antes: el coche frena y no sale despedido.', 'El freno de mano (B) gira mucho más rápido; úsalo en las horquillas y vuelve a acelerar con el morro ya apuntando a la salida.', 'Rodea los charcos de agua y las manchas de aceite por el lado exterior: la línea ideal suele pasar justo por encima.'],
    ),
    dict(
        title='Circuito Garaje', genre='racing', tags=['carreras', 'eliminacion', 'camara-compartida', 'derrape', 'vector'],
        orient='auto', aspect='fill', inputs='TKG', engine='racer2d',
        cfg=dict(mode='garaje', help='La cámara sigue al coche que va primero: si te quedas fuera de la pantalla pierdes un punto. El último que queda dentro gana uno. Empiezas con 3 y gana quien llegue a 6. Joystick para dirigir, A acelera, B derrape.'),
        pad=dict(d='8', a='Acelerar', b='Derrape'), mp=(2, 4), players='2–4 jugadores (1 con CPU)',
        desc=[
            'Circuito Garaje es una carrera sin vueltas ni meta: aquí solo importa no quedarse atrás. Cuatro bólidos corren por un circuito pintado en el suelo de un garaje, entre pilas de neumáticos, conos, bidones y manchas de aceite, y la cámara se pega al que va primero. Quien se queda fuera de la pantalla queda eliminado de la ronda y pierde un punto; el último que aguanta dentro se lleva uno.',
            'Todos empiezan con tres puntos. Gana la partida quien llega a seis, o el último que conserva alguno. Tras cada ronda los coches vuelven a salir juntos desde donde estaba el ganador, así que el líder de la ronda anterior no tiene ventaja de distancia, solo de moral. Si una ronda se alarga, los bordes de la imagen se van cerrando con franjas amarillas y negras hasta que alguien se descuelga.',
            'Está pensado para jugar en la tele con amigos: cada uno usa su móvil como mando, con joystick para apuntar la dirección, A para acelerar y B para el freno de mano. También funciona en un único dispositivo contra tres coches de la CPU, que trazan bien las curvas pero se despistan de vez en cuando; cuantas más partidas les ganas, más finos conducen. Una pasada por encima del aceite en el momento justo puede sacar de plano a medio pelotón.',
        ],
        tips=['Ir primero no es obligatorio: basta con no quedarte en el borde de la pantalla; pegarte al rebufo del líder es más seguro.', 'Los choques empujan mucho: un golpe lateral en plena curva puede sacar a un rival de la imagen.', 'Cuando aparezcan las franjas amarillas, la ronda está a punto de acabar: arriesga ahora o te quedarás fuera.'],
    ),
    dict(
        title='Karts de Patio', genre='racing', tags=['carreras', 'karts', 'objetos', 'copa', 'vector'],
        orient='auto', aspect='fill', inputs='TKG', engine='racer2d',
        cfg=dict(mode='patio', help='Pasa por las cajas «?» para coger un objeto y úsalo con B: la pompa atrapa al de delante, el muelle te hace saltar con turbo y el charco hace trompear a quien lo pise. Joystick para dirigir, A para acelerar. Copa de 3 carreras.'),
        pad=dict(d='8', a='Acelerar', b='Objeto'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Karts de Patio es una copa de karts por el jardín de casa: circuitos de tierra entre el césped, arbustos, piedras y alguna pelota olvidada, con charcos de agua y zonas de barro que frenan. Lo que lo distingue son sus tres objetos propios, que salen de las cajas con interrogación repartidas por la pista.',
            'La pompa sale disparada hacia delante, busca al kart que tengas enfrente y lo encierra en una burbuja que flota y frena durante un segundo y medio. El muelle te lanza por los aires con un turbo: mientras vuelas no te afectan el barro, los charcos ni las pompas, y puedes atajar por encima del césped. El charco de jabón se queda detrás de ti y hace trompear a quien lo pise, tú incluido si vuelves a pasar. Los primeros reciben más charcos y los últimos más pompas y muelles, así que la carrera siempre se aprieta.',
            'Se conduce con el joystick apuntando a donde quieres ir; A acelera recto y B lanza el objeto. La copa tiene tres circuitos y puntúan los cuatro puestos. En la tele hasta cuatro amigos juegan con el móvil como mando y la CPU completa la parrilla; los karts rivales usan sus objetos con cabeza, esquivan charcos cuando los ven venir y mejoran cada vez que ganas una copa.',
        ],
        tips=['Guarda el charco si vas primero y suéltalo justo antes de una curva cerrada: quien venga detrás no tendrá sitio para esquivarlo.', 'El muelle es tu mejor atajo: úsalo al salir de una curva hacia una recta o para cruzar una zona de barro.', 'Una pompa lanzada con el rival lejos y de lado se pierde; espera a tenerlo delante y a tiro.'],
    ),
    dict(
        title='Barcos Piratas', genre='arcade', tags=['barcos', 'piratas', 'viento', 'andanadas', 'cofres', 'vector'],
        orient='auto', aspect='fill', inputs='TKG', engine='naval',
        cfg=dict(mode='piratas', help='Apunta con el joystick hacia donde quieres navegar; contra el viento no se avanza, así que ve en zigzag. A dispara una andanada por babor (izquierda) y B por estribor (derecha). Recoge cofres (+1) y hunde barcos (+2). 3 rondas de 60 s: gana quien más rondas se lleve.'),
        pad=dict(d='8', a='Babor', b='Estribor'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Barcos Piratas es un combate naval entre cuatro galeones en un archipiélago, con una regla que lo cambia todo: el viento manda. Con viento de costado el barco vuela, con el viento a favor va rápido y de proa al viento se queda casi parado, así que para llegar a un cofre que está a barlovento tendrás que virar en zigzag como un marinero de verdad. Una flecha en pantalla indica siempre hacia dónde sopla, y a mitad de ronda puede rolar.',
            'Los cañones solo disparan por los costados. El botón A suelta una andanada de tres balas por babor, a tu izquierda, y el B por estribor, a tu derecha; cada banda recarga por su cuenta. Para acertar tienes que poner al rival de través, lo que obliga a maniobrar con la inercia del barco y a anticipar hacia dónde irá. Cada cofre que pescas vale un punto y hundir un barco vale dos; quien se hunde suelta parte de su botín al agua y vuelve a salir en unos segundos.',
            'La partida son rondas de un minuto y gana quien se lleve dos. En la tele pueden jugar hasta cuatro personas con el móvil como mando y la CPU capitanea los barcos libres: navega por el viento, busca cofres, persigue al más débil y ajusta la puntería según el nivel, que sube cada vez que ganas. Las islas tapan los disparos y encallar en ellas daña el casco.',
        ],
        tips=['Navega de través al viento (perpendicular a la flecha): es la velocidad máxima y te deja los costados apuntando hacia delante y hacia atrás del rival.', 'Dispara un poco por delante de un barco que se mueve: las balas heredan tu velocidad, pero no la suya.', 'Si vas por delante en puntos, escóndete detrás de una isla al final de la ronda: las balas no la atraviesan.'],
    ),
]
