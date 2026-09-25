"""Oleada 2 — agente «party»: nueve minijuegos nuevos del motor party.js (un CFG.mode por juego, 3 rondas con 3-2-1 puntos)."""

GAMES = [
    dict(
        title='Globos a Presión', genre='party', tags=['riesgo', 'apuestas', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='pump', hud='br', help='Cada toque de A es un bombazo de aire para tu globo; con B te plantas. Gana la ronda el globo más grande que no haya reventado. Cada globo tiene un límite secreto distinto: cuando se acerca, tiembla y cruje. Tres rondas; si se acaba el tiempo, todos se plantan.'),
        pad=dict(d='', a='Inflar', b='Plantarse', t=1), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Globos a Presión es un juego de nervios con bomba de aire. Cada jugador tiene su propio globo atado a una boquilla y una bomba de émbolo con su color; cada pulsación de A es un bombazo y el globo crece un poco. La pregunta es siempre la misma: ¿uno más o me planto? Gana la ronda el globo más grande que siga entero cuando todos se hayan retirado, así que quedarse corto es tan malo como pasarse.',
            'Cada globo aguanta hasta un punto secreto que cambia en cada ronda, y ni siquiera los globos de una misma partida son iguales. La única pista es el propio globo: cuando le falta poco empieza a temblar, aparecen reflejos de tensión en la goma y cada bombazo suena más áspero. Algunos avisan con margen y otros revientan a la primera sacudida. Al final de la ronda se dibuja con una línea discontinua el tamaño que habría aguantado cada uno, para que todos vean quién se arriesgó de más y quién se rajó demasiado pronto.',
            'Se juega con un solo botón y el de plantarse: en el móvil basta tocar la pantalla para inflar y el botón Plantarse o el mando virtual para retirarse; con teclado, espacio y X; en la tele, A y B del móvil de cada jugador. La CPU ocupa las plazas libres con su propio carácter: al principio es prudente y se planta con globos modestos, pero si le vas ganando partidas apura cada vez más cerca del límite. Tres rondas cortas, puntos por puesto y podio al final.',
        ],
        tips=['El temblor empieza bastante antes del límite: un par de bombazos después del primer aviso suele ser el máximo razonable.', 'Si todos los rivales han reventado, plántate ya: basta con tener globo.', 'Mira los globos de la CPU; si se plantan pronto, tú también puedes ganar con poco.'],
    ),
    dict(
        title='Memoria de Semáforo', genre='party', tags=['memoria', 'secuencias', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='simon', hud='br', help='El semáforo enciende una serie de luces. Cuando diga «¡Repite!», reprodúcela con el joystick: arriba la roja, derecha la ámbar, abajo la verde e izquierda la azul (en el móvil también puedes tocar la luz o deslizar). Cada turno la serie suma una luz; quien falla o tarda más de 4 segundos queda fuera. El último en pie gana la ronda.'),
        pad=dict(d='8', t=1), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Memoria de Semáforo convierte un cruce de calles en una prueba de memoria para toda la familia. Un semáforo con forma de cruz tiene cuatro luces, una por cada dirección del joystick: roja arriba, ámbar a la derecha, verde abajo y azul a la izquierda. Primero se encienden unas cuantas en orden; después todos a la vez tienen que repetir la serie sin equivocarse. Si lo consigues, el semáforo añade una luz más y vuelve a empezar.',
            'La dificultad crece sola y sin trucos: cada turno la serie es un paso más larga y las luces se encienden un poco más deprisa. Abajo, cada jugador tiene su panel con una fila de puntos que se van rellenando con su color a medida que acierta, de modo que se ve quién va por delante y quién se ha quedado pensando. Un fallo o quedarse más de cuatro segundos sin responder te deja fuera de la ronda, y el último que resiste se lleva los tres puntos.',
            'En el móvil puedes tocar directamente la luz o deslizar el dedo en su dirección; con teclado se usan las flechas y en la tele el joystick del móvil de cada jugador. Los rivales de la CPU también se equivocan, más a menudo cuanto más larga es la serie, y afinan su memoria si les ganas varias partidas. Tres rondas con puntos por puesto: una partida dura unos pocos minutos y siempre acaba con alguien diciendo que se lo sabía.',
        ],
        tips=['Repite la serie en voz baja mientras se enciende: el ritmo ayuda a recordarla.', 'No hace falta correr: tienes cuatro segundos por luz, más vale seguro que rápido.'],
    ),
    dict(
        title='Salta la Comba', genre='party', tags=['ritmo', 'reflejos', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='rope', hud='br', help='Dos niños dan a la comba y la cuerda pasa por el suelo en cada vuelta: pulsa A (o toca la pantalla) justo antes para saltarla. Las tres primeras vueltas son de calentamiento y no eliminan. Luego gira cada vez más rápido y el salto es más corto: si la cuerda te engancha, quedas fuera. El último que salta gana la ronda.'),
        pad=dict(d='', a='Saltar', t=1), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Salta la Comba lleva al salón el juego de patio de toda la vida. Dos niños sujetan una cuerda larga en los extremos del patio y la hacen girar mientras cuatro saltadores esperan en fila en el centro. Cada vez que la cuerda barre el suelo hay que estar en el aire; el que se queda con los pies abajo se enreda, se cae de culo con estrellitas alrededor y deja la ronda. El último que sigue saltando gana.',
            'La cuerda se ve pasar por detrás de los saltadores al subir y por delante al bajar, así que el ritmo se lee de un vistazo. Las tres primeras vueltas son de calentamiento: si fallas, solo tropiezas. Después aparece el aviso de que ahora va en serio y la comba acelera poco a poco, vuelta a vuelta. A mayor velocidad el salto también se acorta, de modo que ya no vale saltar pronto y quedarse flotando: hay que clavar el momento justo antes de que la cuerda toque la arena.',
            'Solo hace falta un botón: la barra espaciadora con teclado, un toque en la pantalla del móvil o el botón A del mando del móvil en la tele. La CPU rellena las plazas libres y también falla de vez en cuando, sobre todo cuando la cuerda gira deprisa; si tú ya estás fuera, el resto de la ronda pasa en avance rápido para no esperar. Se juegan tres rondas con puntos por puesto y un marcador que muestra cuántos saltos seguidos lleva la cuerda.',
        ],
        tips=['Salta cuando la cuerda pase a la altura de las rodillas, no cuando la veas en el suelo.', 'Sigue el sonido: cada paso por el suelo hace clic y marca el compás.', 'No saltes dos veces seguidas por nervios; el segundo salto no llega a tiempo.'],
    ),
    dict(
        title='Pesca Rápida', genre='party', tags=['pesca', 'reflejos', 'cooperativo', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='fish', hud='br', help='Mueve tu flotador con el joystick y déjalo quieto: los peces se acercan, mordisquean (el flotador tiembla) y al final pican (se hunde y aparece «!»). Pulsa A en ese momento para sacarlos: pez pequeño 1, grande 2, dorado 3. Si tiras antes, los espantas. El pez gordo solo pica cuando hay dos flotadores cerca y hay que tirar los dos a la vez: 4 puntos para cada uno. 40 segundos por ronda.'),
        pad=dict(d='8', a='Tirar', t=1), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Pesca Rápida reúne a cuatro pescadores en el mismo muelle de madera frente a un estanque lleno de peces. Cada uno lleva su caña y un flotador de su color que se mueve con el joystick por todo el agua. Los peces nadan a su aire, pero en cuanto un flotador se queda quieto un momento, el más cercano se acerca a curiosear. Primero mordisquea y el flotador tiembla; después pica de verdad, el flotador se hunde y aparece una exclamación. Ese es el instante para tirar con A.',
            'La paciencia manda. Si tiras mientras el pez solo está tanteando, recoges el sedal vacío y espantas a todos los que había alrededor. Los peces pequeños dan un punto, los grandes dos y los dorados, más escasos, tres. De vez en cuando aparece una sombra enorme: es el pez gordo, que no se conforma con un solo anzuelo. Solo pica cuando hay dos flotadores quietos cerca de él, y entonces los dos pescadores tienen que tirar a la vez para sacarlo; si uno se despista, se escapa y nadie cobra.',
            'Esa regla convierte a los rivales en socios por un momento, y la CPU lo sabe: si ve un flotador esperando junto al pez gordo, suele acudir a ayudar. En el móvil se arrastra el dedo para mover el flotador y se toca para tirar; con teclado, flechas y espacio; en la tele, el joystick y el botón A del móvil. Cada ronda dura cuarenta segundos, se juegan tres y el que más puntos pesca en cada una suma más en el marcador general.',
        ],
        tips=['Coloca el flotador por delante del pez, en su camino, y no lo muevas.', 'Un temblor no es una picada: espera a que se hunda del todo.', 'Cuando salga el pez gordo, acércate a quien ya esté esperando junto a él.'],
    ),
    dict(
        title='Estatuas Musicales', genre='party', tags=['baile', 'reflejos', 'eliminación', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='statue', hud='br', help='Mientras suena la música, baila moviéndote con el joystick: si te quedas quieto, tu barra de baile se vacía y quedas fuera. Cuando la música se para y aparece «¡ALTO!», suelta el joystick y no pulses nada: tras un instante de margen, quien se mueva queda eliminado. El margen se acorta con cada parada. El último en pie gana la ronda.'),
        pad=dict(d='8', t=1), mp=(2, 4), players='2–4 jugadores',
        desc=[
            'Estatuas Musicales traslada a la pantalla el juego de cumpleaños de siempre. Cuatro muñecos bailan sobre una pista de baldosas que se iluminan al ritmo de una gramola, y mientras la música suena nadie puede quedarse parado: cada jugador tiene una barra de baile que se vacía si deja de moverse y se recarga en cuanto vuelve a menearse por la pista. Quien se queda plantado demasiado tiempo acaba fuera por aburrido.',
            'Lo bueno llega cuando la música se corta de golpe. Un cartel rojo grita «¡ALTO!» y a partir de ese momento hay que convertirse en estatua: nada de joystick ni de botones. Hay un pequeño margen para reaccionar, pero con cada parada se acorta, y quien siga moviéndose cuando se acaba cae eliminado. Las paradas llegan cuando menos te lo esperas: a veces tras una canción larga, a veces a los pocos compases. Nada elimina durante los primeros segundos, para que todos puedan entrar en calor.',
            'Con teclado se baila con las flechas; en el móvil, arrastrando el dedo o con el mando virtual; en la tele, con el joystick del móvil de cada jugador. Los muñecos de la CPU también reaccionan tarde de vez en cuando, y cuanto más les ganas, más rápidos se vuelven sus reflejos. Si quedas eliminado, el resto de la ronda pasa en avance rápido. Tres rondas con puntos para los tres últimos en pie.',
        ],
        tips=['Baila con pequeños toques del joystick: así tardas menos en soltarlo cuando llegue el alto.', 'Tras el «¡ALTO!» no toques nada, ni siquiera para comprobar si sigues dentro.'],
    ),
    dict(
        title='Cuenta Ovejas', genre='party', tags=['conteo', 'atención', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='sheep', hud='br', help='Las ovejas saltan la valla de izquierda a derecha: cuéntalas. Puedes llevar tu propio contador con A (+1) y B (−1). Desde la segunda ronda algunas ovejas vuelven a saltar hacia la izquierda (restan), otras se arrepienten antes de la valla (no cuentan) y aparecen cabras (no cuentan). Al final elige el número con ↑ ↓, confirma con A y gana quien más se acerque; en caso de empate, el más rápido.'),
        pad=dict(d='8', a='+1', b='−1', t=1), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Cuenta Ovejas es el remedio contra el insomnio convertido en competición. En un prado verde hay una valla de madera y, una tras otra, las ovejas llegan trotando desde la izquierda, toman carrerilla y la saltan. Tu trabajo es tan sencillo como parece: contar cuántas pasan al otro lado. Al terminar, cada jugador marca su número y el que más se acerca a la cifra real gana la ronda; si hay empate, manda quien confirmó antes.',
            'Mientras miras puedes llevar la cuenta con un contador de mano: A suma una y B resta una, y solo tú sabes qué número llevas. La primera ronda es un calentamiento honesto. En la segunda empiezan las trampas: alguna oveja se arrepiente justo antes de la valla y da media vuelta, otras que ya habían pasado vuelven a saltar hacia la izquierda y restan, y se cuela alguna cabra que no cuenta para nada. En la tercera las ovejas llegan más deprisa y a veces de dos en dos, tapándose unas a otras.',
            'En el móvil basta tocar la pantalla para sumar y usar el mando virtual para restar o elegir el número; con teclado, espacio, X y flechas; en la tele, los botones y el joystick del móvil de cada jugador. La CPU también cuenta, a veces con algún despiste, y afina su puntería si ganas a menudo. Tres rondas cortas, puntos por puesto y un podio final para el mejor pastor.',
        ],
        tips=['Pulsa A en el momento en que cada oveja está en lo alto de la valla, no cuando aparece.', 'Las cabras tienen cuernos y pelo marrón: aprende a distinguirlas a la primera.', 'Si una oveja vuelve a saltar hacia la izquierda, resta con B en ese momento.'],
    ),
    dict(
        title='Carrera de Sacos', genre='party', tags=['carrera', 'riesgo', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='sack', hud='br', help='Mantén A (o el dedo en la pantalla) para cargar el salto y suéltalo para saltar: cuanto más cargas, más lejos. Hasta la marca blanca del medidor el salto es seguro; en la zona naranja llegas más lejos pero puedes caer de bruces, y en la roja casi seguro. Si caes en un charco, resbalas. Tres carreras de 100 metros.'),
        pad=dict(d='', a='Saltar', t=1), mp=(2, 4), players='2–4 jugadores',
        desc=[
            'Carrera de Sacos es la prueba estrella de cualquier fiesta de pueblo: cuatro corredores metidos en sacos de arpillera hasta la cintura, una pista de hierba de cien metros y una meta con bandera. Aquí no se corre, se salta, y cada salto se prepara: mantén A pulsado y tu corredor se agacha dentro del saco cargando fuerza; suéltalo y sale disparado hacia delante. Un salto corto es seguro pero lento; uno largo avanza mucho más.',
            'El truco está en el medidor que aparece junto a cada corredor mientras carga. La franja verde llega hasta una marca blanca y todo lo que quede dentro es un salto limpio. Más allá empieza la zona naranja, donde el salto es más largo pero hay cada vez más posibilidades de aterrizar de bruces y perder un segundo largo levantándose; la roja es casi una caída segura. Por si fuera poco, la pista tiene charcos repartidos por todas las calles: caer dentro de uno te hace resbalar, así que conviene medir el salto para pasar por encima o quedarse justo antes.',
            'En el móvil se mantiene el dedo en la pantalla o el botón Saltar del mando virtual; con teclado, la barra espaciadora; en la tele, el botón A del móvil de cada corredor. Los rivales de la CPU también calculan sus saltos para esquivar los charcos, aunque a veces se confían, y se vuelven más atrevidos si les vas ganando. Se disputan tres carreras con puntos por puesto y podio final.',
        ],
        tips=['Soltar justo en la marca blanca es lo más rápido a la larga: arriesgar más rara vez compensa.', 'Antes de un charco, haz un salto corto para dejarlo justo delante y luego sáltalo entero.'],
    ),
    dict(
        title='Tartas al Blanco', genre='party', tags=['puntería', 'feria', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='pie', hud='br', help='Mueve tu mira con el joystick y lanza una tarta con A; en el móvil o con ratón, toca donde quieras lanzar. La tarta tarda un instante en llegar: adelántate a los patos que se mueven. Diana roja 1 punto, pato 2, diana dorada 3. A veces asoma la cara de un jugador: si le das a la de un rival, sumas 1 y lo dejas ciego 2 segundos. 30 segundos por ronda.'),
        pad=dict(d='8', a='Lanzar', t=1), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Tartas al Blanco es una caseta de feria con toldo de rayas, tres filas de agujeros y un mostrador desde el que cuatro jugadores lanzan tartas de nata. Por los agujeros asoman dianas rojas y blancas que dan un punto, dianas doradas más pequeñas y fugaces que dan tres, y patos amarillos que cruzan una fila entera de lado a lado y valen dos. Cada jugador mueve su propia mira de su color y lanza con A; la tarta vuela en arco y tarda un instante en llegar, así que a los patos hay que apuntarles por delante.',
            'La gracia está en las caras. De vez en cuando, por uno de los agujeros asoma la cabeza de uno de los jugadores enmarcada en su color, como en esos cartones de feria con el hueco para la cara. Si le aciertas a la de un rival, te llevas un punto y, sobre todo, lo dejas ciego durante dos segundos: su mira desaparece bajo un pegote de nata y sus lanzamientos salen desviados. Tu propia cara no se puede golpear, así que cuando asoma solo queda esperar que nadie tenga buena puntería.',
            'En el móvil y con ratón basta con tocar donde quieres que caiga la tarta; con teclado se mueve la mira con las flechas y se lanza con espacio; en la tele, joystick y botón A del móvil de cada jugador. La CPU elige blancos con cabeza, persigue a los líderes con tartazos a la cara cuando mejora y afina la puntería si ganas a menudo. Tres rondas de treinta segundos y puntos por puesto.',
        ],
        tips=['Las dianas doradas duran poco: si ves una cerca, déjalo todo.', 'Guarda un tartazo para la cara del líder; dos segundos sin ver valen mucho.'],
    ),
    dict(
        title='Caballitos de Feria', genre='sports-casual', tags=['feria', 'puntería', 'carrera', 'minijuegos', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='party',
        cfg=dict(mode='derby', hud='br', help='La barra de fuerza bajo tu rampa va y viene sola: pulsa A para lanzar la bola con esa fuerza. Si la aguja está en la franja amarilla, la bola cae en un agujero cercano y tu caballo avanza 1 paso; en la naranja, 2; en la roja, 3. Fuera de las franjas la bola vuelve sin puntuar. El primer caballo que llega a la meta (22 pasos) gana la carrera; tres carreras.'),
        pad=dict(d='', a='Lanzar', t=1), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Caballitos de Feria recrea la atracción clásica de las verbenas: una fila de rampas inclinadas con agujeros y, encima, una pista donde unos caballitos de madera avanzan cada vez que alguien encesta. Cada jugador tiene su rampa, su bola y su caballo con la montura de su color. Los agujeros de abajo son grandes y fáciles, los del medio valen el doble y el único agujero del fondo, rodeado de rojo, hace que tu caballo dé tres pasos de golpe.',
            'No hay que calcular ángulos: bajo cada rampa hay una barra de fuerza con tres franjas de colores y una aguja que va y viene sola. Pulsa A cuando la aguja esté en la franja que quieras y la bola subirá por la rampa hasta ese agujero. La franja amarilla es ancha y segura, la naranja algo más estrecha y la roja es un suspiro. Si la bola sale con una fuerza intermedia, rebota y vuelve rodando sin puntuar. A medida que avanza la carrera la aguja se mueve más deprisa, y el que mejor combina seguridad y riesgo llega antes a la meta.',
            'Solo se usa un botón: espacio con teclado, un toque en la pantalla del móvil o el botón A del móvil en la tele, así que es perfecto para jugar con quien nunca coge un mando. La CPU ocupa las plazas libres y apuesta más por la franja roja cuanto mejor juegas. Se corren tres carreras y cada una reparte puntos por puesto hasta el podio final.',
        ],
        tips=['La franja naranja es la mejor apuesta: casi tan segura como la amarilla y vale el doble.', 'Cuando la aguja va muy rápida, pulsa un poco antes de que entre en la franja.', 'Si vas muy por detrás, arriesga con la roja; en cabeza, asegura.'],
    ),
]
