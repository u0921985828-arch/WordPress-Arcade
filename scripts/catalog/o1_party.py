"""Oleada 1 — agente «party»: motores party.js (minijuegos por rondas) y brawl.js (lucha en plataformas)."""

GAMES = [
    dict(
        title='Lluvia de Yunques', genre='party', tags=['supervivencia', 'esquivar', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='anvil', hud='br', help='Mueve a tu muñeco con el joystick y apártate de las sombras que crecen en el suelo: marcan dónde caerá cada yunque. A da un acelerón corto. El último en pie gana la ronda; tres rondas.'),
        pad=dict(d='8', a='Acelerón', t=1), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Lluvia de Yunques es un minijuego de supervivencia para toda la familia: cuatro muñecos corretean por la plaza de un castillo mientras del cielo caen yunques de una tonelada. Nadie los ve venir desde arriba, pero todos pueden leer el suelo: cada yunque proyecta una sombra que empieza pequeña y se va oscureciendo y agrandando hasta el instante del golpe. Cuando el borde parpadea en rojo, ya no queda tiempo para dudar.',
            'Se juega con el joystick para moverse y el botón A para dar un acelerón corto que tiene un pequeño tiempo de recarga, así que conviene guardarlo para escapar de una sombra que se cierra. En el móvil vale el mando virtual o arrastrar el dedo; con teclado, las flechas y la barra espaciadora. En el modo tele cada invitado usa su propio móvil como mando y la CPU ocupa las plazas libres, de modo que siempre hay cuatro muñecos en la plaza.',
            'La lluvia empieza tranquila, con avisos largos y pocos yunques, y se intensifica sin pausa: después de unos segundos aparecen yunques gigantes y algunos caen justo donde estás. Los rivales se empujan entre ellos, así que una buena posición se defiende. Gana la ronda el último que queda en pie y la partida se decide a tres rondas con puntos por puesto. Los aplastados quedan hechos una tortita con estrellitas alrededor, sin nada desagradable: humor de dibujos animados para jugar en el sofá.',
        ],
        tips=['Quédate cerca del centro: desde ahí tienes salida hacia cualquier lado.', 'No gastes el acelerón al principio; resérvalo para cuando dos sombras se junten.', 'Vigila también las sombras que aún son pequeñas: dentro de un segundo serán enormes.'],
    ),
    dict(
        title='Duelo del Oeste', genre='party', tags=['reflejos', 'duelo', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='duel', hud='br', help='Espera a que el cartel diga «¡YA!» y pulsa A antes que nadie. Si disparas con «Preparados…» o con una palabra trampa, quedas fuera de ese duelo. Gana quien llegue a 5.'),
        pad=dict(d='', a='¡Pum!', t=1), mp=(2, 4), players='2–4 jugadores',
        desc=[
            'Cuatro vaqueros de pueblo, cuatro pistolas de corcho y un cartel de madera en mitad de la calle polvorienta. Duelo del Oeste es un juego de reflejos puros: todos esperan quietos mientras el cartel dice «Preparados…», y en cuanto aparece «¡YA!» gana quien apriete A antes. El corcho sale disparado y a todos los demás se les vuela el sombrero, que rueda por el suelo entre carcajadas.',
            'La gracia está en la paciencia. Si disparas antes de tiempo quedas fuera de ese duelo, y a partir del segundo el cartel empieza a hacer trampas con palabras parecidas como «¡YAK!», «¡YATE!» o «¡YOGUR!». Hay que leer, no solo reaccionar. Después de cada disparo se muestra el tiempo de reacción de cada uno en centésimas, así que las discusiones sobre quién fue más rápido se resuelven solas.',
            'En el móvil basta con tocar la pantalla o el botón del mando virtual; con teclado, la barra espaciadora; en la tele, el botón A del móvil de cada jugador. Los vaqueros de la CPU tienen reflejos creíbles y a veces también pican con las palabras trampa; si les ganas partidas, afinan la puntería la próxima vez. Gana el primero en sumar cinco duelos, y una partida entera dura un par de minutos: ideal para repetir sin parar.',
        ],
        tips=['Mira el cartel y no a los rivales: los amagos de los demás no cuentan.', 'Si tu reflejo es lento, piensa que la CPU también puede caer en las palabras trampa.'],
    ),
    dict(
        title='Carrera Machacabotones', genre='party', tags=['ritmo', 'carrera', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='mash', hud='br', help='Alterna A y B como si fueran tus piernas. Cada corredor tiene un medidor: si la aguja está en verde vas al ritmo justo; si machacas demasiado rápido o repites botón, tropiezas. Tres carreras de 100 metros.'),
        pad=dict(d='', a='A', b='B', t=1), mp=(2, 4), players='2–4 jugadores',
        desc=[
            'Carrera Machacabotones parece la clásica prueba de aporrear botones, pero tiene truco: aquí no gana quien más rápido pulsa, sino quien mantiene el ritmo de las piernas. Cada pulsación de A es un pie y cada pulsación de B es el otro. Si repites el mismo botón, tu corredor se tropieza; si machacas a lo loco, se pasa de vueltas y acaba rodando por la pista mientras los demás le adelantan.',
            'A la derecha de cada calle hay un medidor con una aguja. La zona verde marca la cadencia perfecta y se desplaza a medida que el corredor coge velocidad: al principio pide zancadas tranquilas y en los últimos metros exige un compás más vivo. Clavar el verde da el máximo empuje, quedarse corto frena un poco y pasarse a la zona roja provoca una caída. Las letras A y B se iluminan para recordar qué pie toca.',
            'Se corren tres carreras de cien metros y cada puesto da puntos. En el móvil puedes tocar la mitad izquierda y la derecha de la pantalla o usar los botones del mando virtual; con teclado, barra espaciadora y X; en la tele, los botones A y B del móvil. Los corredores de la CPU también siguen el compás con más o menos precisión según lo bien que juegues tú, así que la revancha siempre está reñida.',
        ],
        tips=['Escucha tu propio ritmo: un compás regular gana a una ráfaga desordenada.', 'Al final de la carrera la zona verde pide más cadencia; acelera poco a poco, no de golpe.', 'Si tropiezas, recupera el compás antes de intentar remontar.'],
    ),
    dict(
        title='Tira y Afloja', genre='party', tags=['ritmo', 'equipos', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='tug', hud='br', help='Dos equipos (J1 y J3 contra J2 y J4) tiran de la cuerda. Pulsa A justo cuando el aro se cierra sobre el círculo: tirón. Fuera de compás, o dos veces en el mismo golpe, resbalas y tu equipo cede. Gana el equipo que gane 2 rondas.'),
        pad=dict(d='', a='Tirar', t=1), mp=(2, 4), players='2–4 jugadores (2 contra 2)',
        desc=[
            'Tira y Afloja enfrenta a dos parejas a cada lado de una charca de barro en plena selva. La cuerda tiene un lazo rojo en el centro y dos marcas en el suelo: si el lazo llega a tu lado, el equipo contrario acaba chapoteando en el barro. Juegan J1 y J3 contra J2 y J4, y si faltan personas, la CPU completa las parejas para que siempre haya cuatro tirando.',
            'La fuerza no sirve de nada sin compás. Arriba aparece un aro que se va cerrando sobre un círculo dorado: pulsa A justo cuando se juntan y darás un tirón limpio. Si te adelantas o te retrasas demasiado, resbalas, tu muñeco trastabilla y tu equipo pierde terreno. Pulsar dos veces en el mismo golpe también cuenta como resbalón, así que aporrear el botón es la forma más rápida de perder.',
            'El compás arranca lento y va acelerando durante la ronda, por lo que la pareja que mejor se coordina acaba imponiéndose. Cada ronda dura como mucho medio minuto y, si nadie cae al barro, gana el equipo que tenga la cuerda de su lado. En el móvil se toca la pantalla o el botón Tirar; con teclado, la barra espaciadora; en la tele, el botón A de cada móvil. El primer equipo en ganar dos rondas se lleva la partida.',
        ],
        tips=['Sigue el aro con la vista y pulsa al ritmo, no cuando veas tirar a tu compañero.', 'Un tirón justo vale casi el doble que uno aceptable: la precisión compensa.'],
    ),
    dict(
        title='Ruleta de Minijuegos', genre='party', tags=['minijuegos', 'ruleta', 'reflejos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='roulette', hud='br', help='Diez rondas al azar entre ocho minijuegos: yunques, duelo, carrera, cuerda, globos, flechas, reloj y diana. Cada ronda reparte 3, 2 y 1 puntos; tras la última, podio. Joystick y botones A y B.'),
        pad=dict(d='8', a='A', b='B', t=1), mp=(2, 4), players='2–4 jugadores',
        desc=[
            'Ruleta de Minijuegos es la noche de juegos completa en un solo botón. Una ruleta de colores gira antes de cada ronda y decide qué toca: esquivar yunques, batirse en un duelo de reflejos, correr al ritmo de las piernas, tirar de la cuerda en parejas o cualquiera de los cuatro retos exclusivos de la ruleta. Son diez rondas cortas con un marcador que se va actualizando, y al final se sube al podio quien más puntos haya reunido.',
            'Los retos propios de la ruleta ponen a prueba cosas distintas. En Cuenta Globos hay que contar solo los globos de tu color entre un montón que suben al cielo y luego marcar la cifra. Flechas de Memoria enseña una secuencia que hay que repetir con el joystick sin un solo fallo. En Reloj a Ciegas el reloj se tapa a los tres segundos y hay que pulsar cuando creas que marca siete. Y en Diana Oscilante detienes una aguja que va y viene cada vez más deprisa.',
            'Cada ronda da tres puntos al primero, dos al segundo y uno al tercero, así que nadie queda descolgado hasta el final. Se juega con joystick y botones A y B: en el móvil con el mando virtual, con teclado usando flechas, espacio y X, y en la tele con el móvil de cada jugador. La CPU rellena las plazas libres y ajusta su nivel según vas ganando, para que una partida de cinco minutos siempre acabe con emoción.',
        ],
        tips=['Lee la ayuda de cada ronda: aparece durante la cuenta atrás.', 'En Cuenta Globos fíjate solo en tu color; los blancos y lilas son para despistar.', 'Los puntos por segundo y tercer puesto suman mucho: no abandones ninguna ronda.'],
    ),
]
