"""Oleada 2 — agente «lucha»: motor nuevo duelo.js (lucha 1v1 lateral) y modos nuevos de brawl.js (toys, scrap)."""

PAD2 = lambda a, b: dict(d='8', a=a, b=b, t=1)

GAMES = [
    dict(
        title='Puños de Papel', genre='arcade', tags=['lucha', 'versus', 'piedra-papel-tijera', 'origami', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='duelo',
        cfg=dict(mode='paper', hud='bl', help='A golpe alto, abajo y A golpe bajo, B agarre. Si los dos atacáis a la vez: el bajo gana al alto, el agarre al bajo y el alto al agarre (contra con más daño). Atrás cubre el golpe alto; atrás y abajo, el bajo; el agarre rompe cualquier guardia. Fíjate en el símbolo que sale sobre el rival antes de cada golpe. Al mejor de tres rondas.'),
        pad=PAD2('Golpe', 'Agarre'), mp=(1, 2), players='1–2 jugadores',
        desc=[
            'Puños de Papel convierte el piedra, papel o tijera de toda la vida en un combate de dos muñecos de origami sobre una alfombrilla de corte. Cada luchador tiene tres ataques y ninguno es mejor que los demás: el golpe bajo pasa por debajo del alto, el agarre atrapa al que se agacha para dar el bajo y el golpe alto frena en seco a quien se lanza a agarrar. Cuando dos ataques coinciden, gana el que corresponde y además hace una contra que arruga el doble.',
            'Todo ocurre en tiempo real. Antes de golpear, cada muñeco muestra un pequeño símbolo de color sobre la cabeza durante un instante, y ese es el momento de leerlo y responder con lo que le gana. Si no te atreves, puedes cubrirte: echarte atrás para el golpe alto o atrás y abajo para el bajo, aunque el agarre rompe cualquier guardia. Fallar o chocar contra una guardia deja al atacante expuesto un momento, justo lo que necesita el rival para castigar.',
            'Se juega al mejor de tres rondas de un minuto, con la barra de papel de cada uno a la vista y papelitos saltando en cada golpe. Contra la CPU verás que al principio es despistada, pero se fija en tu ataque favorito y aprende a contrarrestarlo, y cada victoria tuya la hace un poco más lista. En la tele, dos amigos se enfrentan cada uno con su móvil como mando.',
        ],
        tips=['No repitas siempre el mismo golpe: la CPU cuenta lo que haces y prepara la respuesta.', 'Si ves el símbolo verde del agarre, un golpe alto a tiempo lo convierte en contra.', 'Cubrirse también es una opción: tras chocar con tu guardia el rival queda vendido un instante.'],
    ),
    dict(
        title='Dojo Nocturno', genre='arcade', tags=['lucha', 'karate', 'versus', 'un-golpe', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='duelo',
        cfg=dict(mode='dojo', hud='bl', help='Kárate a un solo golpe: el primero que acierta gana el punto (ippon) y gana quien llegue a 5. A puñetazo (rápido, corto), B patada alta (larga), abajo y B barrido. Atrás cubre puño y patada; atrás y abajo cubre puño y barrido; agacharte esquiva la patada. Si te cubres justo antes del golpe haces una parada y el rival queda abierto. Si los dos aciertan a la vez no hay punto.'),
        pad=PAD2('Puño', 'Patada'), mp=(1, 2), players='1–2 jugadores',
        desc=[
            'Dojo Nocturno es un duelo de kárate en un dojo de madera iluminado por farolillos, con la luna asomando por el ventanal abierto. Aquí no hay barras de vida: un solo golpe limpio da el punto, el árbitro corta el combate y los dos luchadores vuelven a su marca. Gana el primero que consiga cinco. Por eso cada paso cuenta, y un descuido de medio segundo se paga caro.',
            'Tienes tres técnicas. El puñetazo es rápido pero corto; la patada alta llega lejos aunque tarda en salir; el barrido va a los tobillos. Para defenderte, retroceder te cubre del puño y de la patada, retroceder agachado te cubre del puño y del barrido, y agacharte sin más hace pasar la patada por encima. Si la guardia llega justo antes del golpe haces una parada que deja al rival desequilibrado, listo para tu respuesta. Si los dos golpes entran a la vez, el árbitro no da punto a nadie.',
            'La clave está en la distancia: quedarte justo fuera del alcance del rival, provocar su ataque y castigar el fallo. La CPU empieza siendo prudente y respeta los primeros segundos de cada combate, pero sube de nivel cada vez que le ganas, bloquea lo que repites y castiga los golpes al aire. En la tele se juega a dos con el móvil de cada uno como mando.',
        ],
        tips=['Retrocede un paso cuando el rival se acerque: si ataca al aire, entra con el puño antes de que se recupere.', 'Contra alguien que se cubre de pie, prueba el barrido; contra quien se agacha, el puño.', 'La parada es arriesgada pero deja al rival indefenso: busca el momento en que suelta la patada.'],
    ),
    dict(
        title='Esgrima de Bolsillo', genre='arcade', tags=['esgrima', 'lucha', 'versus', 'deportes', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='duelo',
        cfg=dict(mode='fence', hud='bl', help='Florete a 5 tocados. Izquierda y derecha para avanzar y retroceder, A estocada alta, abajo y A estocada baja, B parada en tu línea (con abajo, parada baja). Tras una parada buena tu respuesta sale al instante. Si los dos tocáis, el punto es de quien atacó primero; si fue a la vez, no hay punto. Si sales por tu línea de fondo, tocado para el rival. Simplificado: todo el tronco es blanco válido.'),
        pad=PAD2('Estocada', 'Parada'), mp=(1, 2), players='1–2 jugadores',
        desc=[
            'Esgrima de Bolsillo lleva un asalto de florete a una pista de competición en miniatura, con focos, grada y las dos lámparas que se encienden del color de quien toca. Los tiradores se mueven con pasos cortos hacia delante y hacia atrás, y el combate es una partida de ajedrez rápida: medir la distancia, amagar, retroceder y, en el momento justo, lanzarse a fondo con una estocada.',
            'La estocada puede ir alta o baja, y el rival puede pararla si elige la línea correcta. Una parada buena desvía el florete y deja al atacante sin tiempo de recuperarse, mientras tu respuesta sale casi al instante. Una estocada que se queda corta es igual de peligrosa para quien la lanza, porque el retorno a la guardia es lento. Cuando los dos tocan, se aplica una versión sencilla de la prioridad: el punto es para quien empezó antes el ataque, y si fue a la vez, no cuenta.',
            'Ojo con el final de la pista: la zona rosa avisa de que te quedas sin sitio, y si cruzas tu línea de fondo el tocado es para el rival, como en el reglamento. El asalto termina a los cinco tocados o a los dos minutos; si hay empate, se va a un último tocado decisivo. La CPU aprende tus estocadas favoritas y mejora contigo, y en la tele se juega a dos con el móvil de cada uno.',
        ],
        tips=['Mantente justo fuera de su alcance y avanza medio paso para provocar su estocada.', 'Si paras bien, ataca enseguida: la respuesta tras la parada es casi imposible de parar.', 'No retrocedas sin mirar: salir por tu línea de fondo regala el tocado.'],
    ),
    dict(
        title='Guantes Gigantes', genre='arcade', tags=['boxeo', 'lucha', 'versus', 'deportes', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='duelo',
        cfg=dict(mode='box', hud='bl', help='A directo (rápido), B cruzado (fuerte), arriba y B gancho (castiga al que se agacha), abajo y A golpe al cuerpo (atraviesa la guardia y cansa). Atrás pones la guardia; abajo esquivas agachándote los golpes a la cabeza. Golpear gasta resistencia y fallar gasta más; sin resistencia pegas flojo y lento. Tres derribos son KO; si no, gana quien más haya pegado en 3 asaltos.'),
        pad=PAD2('Directo', 'Cruzado'), mp=(1, 2), players='1–2 jugadores',
        desc=[
            'Guantes Gigantes es un combate de boxeo de dibujos animados: dos púgiles con guantes del tamaño de su cabeza, un ring con cuerdas de colores, un foco cenital y una grada que no para de hacer fotos. Se boxea de perfil, cara a cara, y cada golpe tiene su momento. El directo es rápido y casi no cansa, el cruzado hace mucho daño pero se ve venir y el gancho sube desde abajo para sorprender a quien se agacha.',
            'La defensa se hace con el joystick. Echarte atrás levanta la guardia y frena los golpes a la cara, aunque el golpe al cuerpo pasa por debajo y te deja sin aire. Agacharte esquiva por completo el directo y el cruzado, pero te expone al gancho. Además está la resistencia: cada golpe la gasta, fallar la gasta el doble y, si se vacía, tus puños salen lentos y flojos. Saber cuándo respirar es tan importante como saber pegar.',
            'Si la vida de un boxeador llega a cero cae a la lona, el árbitro cuenta y se levanta con menos fuerzas; al tercer derribo el combate termina por KO. Si nadie cae tres veces, tras tres asaltos de un minuto deciden los puntos, que suman cada golpe limpio. La CPU mejora con tus victorias, esquiva lo que repites y aprovecha cuando te quedas sin resistencia. En la tele, cada jugador boxea con su móvil.',
        ],
        tips=['Alterna directos y golpes al cuerpo: el rival que sube la guardia se queda sin aire.', 'Si el rival se agacha a menudo, el gancho le hace daño extra.', 'No gastes toda la resistencia: con la barra vacía tus golpes apenas hacen daño.'],
    ),
    dict(
        title='Sumo de Equilibrio', genre='arcade', tags=['sumo', 'lucha', 'equilibrio', 'versus', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='duelo',
        cfg=dict(mode='sumo', hud='bl', help='Hacia el rival empujas y te inclinas hacia delante; hacia atrás, te echas atrás. Vigila tu barra de equilibrio: si llega al rojo, caes. A empujón fuerte (si no hay nadie delante te lanzas y te desequilibras), B esquiva lateral (henka: si el rival empuja contra el hueco, se va de bruces), abajo bajas el centro y aguantas mejor. Pierde quien sale del dohyo o cae. Gana quien se lleva 3 combates.'),
        pad=PAD2('Empujón', 'Esquiva'), mp=(1, 2), players='1–2 jugadores',
        desc=[
            'Sumo de Equilibrio es un combate de sumo en el que la fuerza no basta: hay que saber mantenerse de pie. Dos luchadores se plantan en el centro del dohyo, bajo el tejado colgante con sus borlas de colores, y al grito de hakkeyoi empieza el empuje. Pierde quien pisa fuera del círculo de sacos de paja o quien se inclina tanto que acaba besando la arena.',
            'Empujar hacia el rival te inclina hacia delante, y la barra de equilibrio de arriba lo muestra: el centro verde es seguro y los extremos rojos significan caída. Mientras el otro empuja también, las fuerzas se compensan, pero si de pronto se aparta con una esquiva lateral, toda tu inercia te tira de bruces. El empujón con A desequilibra al rival hacia atrás, aunque lanzarlo al vacío te deja vendido. Bajar el centro con abajo te hace más firme y más lento.',
            'Cada combate es corto y tenso, y gana la partida quien se lleve tres. Si un combate se alarga demasiado, los jueces piden una pausa y se repite desde el centro. Los primeros segundos la CPU solo tantea, luego empuja con cabeza, aprovecha cuando te echas atrás y, si ganas a menudo, empieza a esquivar tus embestidas. En la tele, dos jugadores se miden con el móvil.',
        ],
        tips=['Empuja a golpes cortos y suelta un instante para recuperar el equilibrio.', 'Cuando el rival se incline mucho hacia ti, una esquiva lateral lo tira al suelo.', 'Cerca del borde, baja el centro con abajo: te moverán mucho menos.'],
    ),
    dict(
        title='Gladiadores de Juguete', genre='arcade', tags=['lucha', 'plataformas', 'armas', 'juguetes', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='brawl',
        cfg=dict(mode='toys', hud='tr', help='Joystick para moverte, B salta (dos veces en el aire), A golpea. Caen armas de juguete del cielo y cada una cambia lo que hace A (y alguna también B): espada de madera, martillo chirriante, arco de ventosas, escudo de tapa, paraguas y yoyó. Abajo y A suelta el arma. Arriba y A: golpe que sube para volver al escenario. Más porcentaje, más lejos sales volando. Tres vidas.'),
        pad=dict(d='8', a='Arma', b='Salto', t=1), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Gladiadores de Juguete enfrenta a cuatro figuritas de plástico sobre una mesa de juegos, entre bloques de letras, una pila de libros y un tren de juguete que pasa por la vía. Nadie se hace daño de verdad: cada golpe suma porcentaje en el marcador del rival y, cuanto más alto es ese número, más lejos sale despedido. Quien cae fuera de la pantalla pierde una de sus tres vidas.',
            'Lo que hace especial a este combate son las armas que caen del cielo en cajas con paracaídas, porque cada una cambia lo que hacen tus botones. La espada de madera da tajos amplios, el martillo chirriante es lento pero lanza muy lejos, el arco de ventosas dispara a distancia, el escudo de tapa convierte A en una embestida y frena los golpes de frente, el paraguas deja que B te haga planear y el yoyó sale disparado y vuelve. Cada arma se gasta con el uso, y abajo con A la suelta para coger otra.',
            'El escenario cambia cada medio minuto: aparece un ventilador que empuja a todos, el suelo se encera y resbala o el tren arrastra los bloques de un lado a otro. En el móvil se juega con el mando virtual, con teclado usando flechas, espacio y X, y en la tele cada jugador usa su móvil. La CPU rellena las plazas libres, elige armas con cabeza y se vuelve más lista cada vez que le ganas.',
        ],
        tips=['El martillo es lento: úsalo cuando el rival pase del 60 % y esté cerca del borde.', 'Con el paraguas puedes volver desde muy lejos manteniendo B en el aire.', 'El escudo para los golpes de frente, pero no los de arriba: cuidado con quien salta sobre ti.'],
    ),
    dict(
        title='Robots de Chatarra', genre='arcade', tags=['lucha', 'plataformas', 'robots', 'versus', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='brawl',
        cfg=dict(mode='scrap', hud='tr', help='Joystick para moverte, B salta (dos veces en el aire), A golpea y, si lo mantienes, carga un puñetazo. Arriba y A: cohete que sube. Abajo y B: esquiva. Cada golpe que recibes te arranca piezas (antena, brazos, coraza, casco): sin ellas eres más rápido y saltas más, pero también sales volando más lejos. La llave inglesa te repara una pieza, la batería electrifica tus puños y la bomba de tuercas estalla. Tres vidas.'),
        pad=dict(d='8', a='Golpe', b='Salto', t=1), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Robots de Chatarra es una pelea de cuatro robots hechos con piezas de desguace sobre una plataforma de la fábrica. Cada robot empieza completo, con su antena, sus dos brazos, la coraza y el casco, y cada golpe fuerte que recibe hace saltar una pieza entre chispas y tuercas. Lo curioso es que perder piezas no solo es malo: un robot más ligero corre más y salta más alto, aunque también sale volando mucho más lejos con el siguiente golpe.',
            'Con A se da un puñetazo rápido y, si lo mantienes, cargas un golpe de pistón que lanza lejos. Arriba con A enciende un pequeño cohete que sirve para volver al escenario, y abajo con B es una esquiva que te deja intocable un instante. De vez en cuando cae material útil: una llave inglesa que te devuelve una pieza, una batería que electrifica tus puños y una bomba de tuercas para lanzar. Decidir si repararte o seguir ligero es parte de la estrategia.',
            'La fábrica cambia cada medio minuto: una cinta transportadora arrastra a todos por el suelo, un imán gigante tira de los robots más ligeros hacia arriba y unas plataformas móviles cruzan la nave. Se juega con el mando virtual, con teclado o en la tele con el móvil de cada jugador, y la CPU rellena las plazas vacías y mejora con cada victoria tuya.',
        ],
        tips=['Un robot sin piezas es rapidísimo: aprovecha para esquivar y golpear, pero no te acerques al borde.', 'Coge la llave inglesa cuando lleves mucho porcentaje: la coraza te hace más pesado y aguantas más.', 'Con el imán encendido, los robots ligeros suben: golpéalos hacia arriba para sacarlos por el techo.'],
    ),
]
