"""Oleada 3 — agente «cocina»: motores nuevos cocina (cooperativo de estaciones) y gestion (días cortos con objetivo),
más el modo piano de rhythm."""

GAMES = [
    dict(
        title='Cocina en Apuros',
        genre='party', tags=['cocina', 'cooperativo', 'pedidos', 'contrarreloj', 'vector'],
        orient='auto', aspect='fill', inputs='TKG',
        engine='cocina',
        cfg=dict(mode='cocina', hud='bl',
                 help='Muévete con el joystick o las flechas. A coge y suelta lo que tengas delante; B es un esprint corto. '
                      'Saca el ingrediente de su caja, déjalo en la tabla y quédate al lado para que se corte, pasa por el fuego lo que lo necesite '
                      'y móntalo sobre un plato; luego lleva el plato a la ventanilla. Lo que se queda de más en el fuego se quema y hay que tirarlo a la basura. '
                      'Cada comanda tiene su reloj: si se agota pierdes una estrella y con las tres perdidas se acaba el servicio. '
                      'Se puede jugar solo; en la tele, hasta cuatro cocineros comparten la misma cocina y entran más comandas.'),
        pad=dict(d='8', a='Coger', b='Correr'), mp=(1, 4),
        players='1–4 jugadores',
        desc=[
            'Cocina en Apuros es un servicio de tres minutos en una cocina pequeña donde nunca hay sitio para todos. Las cajas de lechuga, tomate, carne, pan, queso y patata están repartidas por las paredes, y entre ellas hay dos tablas de cortar, dos fuegos, una pila de platos, un cubo de basura y la ventanilla por la que salen los pedidos. Las comandas van apareciendo arriba con su dibujo y su reloj: una ensalada pide lechuga y tomate cortados, una hamburguesa pan y carne hecha, y el plato combinado no perdona ningún despiste.',
            'El recorrido de cada plato es siempre el mismo y siempre distinto: coger, cortar, freír, montar y servir. La tabla trabaja mientras alguien se queda a su lado, así que dejar algo cortándose y marcharse no sirve de nada; el fuego, en cambio, se apaña solo, pero si te despistas la carne pasa de dorada a carbón y hay que tirarla. Servir rápido deja propina, encadenar platos sube la racha y cada euro cuenta; dejar escapar a un cliente cuesta una de las tres estrellas del local.',
            'La gracia está en repartirse el trabajo. Jugando solo, la cocina respira: entran menos comandas y los clientes tienen más paciencia, de modo que se puede terminar el servicio entero sin ayuda. En cuanto se conecta un segundo, un tercero o un cuarto mando, el ritmo de pedidos sube y merece la pena organizarse: uno corta sin moverse de la tabla, otro se encarga de los fuegos y un tercero hace de camarero entre el plato y la ventanilla.',
            'En el móvil se juega con joystick y dos botones, en el ordenador con flechas, Espacio y X, y en la tele con hasta cuatro móviles como mandos. Jugando solo también puedes arrastrar el dedo por la pantalla para guiar a tu cocinero. Todo está dibujado por código con el mismo trazo de siempre: gorros blancos, suelo de baldosas y unas llamas que dan más prisa que cualquier reloj.',
        ],
        tips=['Monta el plato en una encimera libre en vez de llevarlo en la mano: así puedes ir trayendo ingredientes sin soltarlo.',
              'Saca del fuego lo que ya esté hecho aunque no lo necesites todavía; quemarlo cuesta el doble de tiempo.',
              'Si sois varios, que uno no se mueva de la tabla de cortar: es la estación que más tiempo come.'],
    ),
    dict(
        title='Pizzería en Llamas',
        genre='party', tags=['pizzeria', 'cooperativo', 'horno', 'incendios', 'vector'],
        orient='auto', aspect='fill', inputs='TKG',
        engine='cocina',
        cfg=dict(mode='pizza', hud='bl',
                 help='Muévete con el joystick o las flechas, A coge y suelta, B es un esprint corto. Coge una bandeja, ponle la masa y los ingredientes '
                      '(el tomate, el queso, el jamón y los champiñones hay que cortarlos antes en la tabla) y mete la bandeja en un horno. '
                      'Cuando la barra se llene, la pizza está hecha; si la dejas más tiempo el horno se incendia. Para apagarlo, coge el extintor y quédate al lado. '
                      'Las encimeras del centro se mueven de un lado a otro con lo que dejes encima. Tres comandas perdidas y cierra la pizzería. '
                      'Se puede jugar solo; en la tele, hasta cuatro pizzeros con más comandas.'),
        pad=dict(d='8', a='Coger', b='Correr'), mp=(1, 4),
        players='1–4 jugadores',
        desc=[
            'Pizzería en Llamas es el turno de noche de un local pequeño con dos hornos que calientan de más. Cada pizza se monta sobre una bandeja: primero la masa, después el tomate, el queso, el jamón o los champiñones, siempre cortados en la tabla. Cuando la bandeja está completa se mete en el horno y hay que estar atento a la barra, porque justo después de dorarse empieza la cuenta atrás hacia el desastre.',
            'Un horno olvidado prende, se lleva por delante la pizza que había dentro y queda inservible mientras arde. Para recuperarlo hay que coger el extintor de la pared y plantarse al lado unos segundos; si nadie lo hace, el fuego acaba pasando factura al local. Mientras tanto las encimeras de la isla central no paran de deslizarse de lado a lado, con las bandejas y los ingredientes que hayas dejado encima, así que una masa apoyada en el sitio equivocado puede acabar al otro extremo de la cocina.',
            'Solo, el servicio es exigente pero abarcable: las comandas llegan más espaciadas y los clientes aguantan un poco más, lo justo para que una sola persona pueda montar, hornear y servir sin que se le apague el negocio. Con dos, tres o cuatro móviles conectados a la tele la cola crece y aparece el reparto natural: alguien vive pegado a la tabla, otro maneja los hornos con el extintor en la mano y el resto lleva bandejas a la ventanilla.',
            'El arte es el mismo cartoon plano de todo el portal, dibujado por código: mostrador de madera, hornos morados, bandejas doradas cuando la pizza sale hecha y unas llamas naranjas que se ven desde cualquier rincón de la pantalla. Se juega con joystick y dos botones, con teclado o con hasta cuatro mandos de móvil en el modo tele.',
        ],
        tips=['Corta de más y deja los ingredientes preparados en las encimeras: montar una pizza entera de una tacada es mucho más rápido.',
              'Saca la pizza en cuanto la barra se llene; el margen antes del incendio es más corto de lo que parece.',
              'Si un horno arde, que alguien coja el extintor de inmediato: con los dos hornos apagados no sale ninguna comanda.'],
    ),
    dict(
        title='Granja de Bolsillo',
        genre='puzzle', tags=['granja', 'gestion', 'cosecha', 'mercado', 'vector'],
        orient='auto', aspect='fill', inputs='TM',
        engine='gestion',
        cfg=dict(mode='granja', hud='br',
                 help='Toca una parcela vacía para sembrar y tócala otra vez para regarla; la planta solo crece con la tierra húmeda. '
                      'Cuando la barra se llena, tócala de nuevo para cosechar. La regadera tiene tres cargas: se rellena tocando el pozo. '
                      'Toca el puesto para vender todo lo que tengas al precio del momento, que va cambiando; si vendes cuatro o más de golpe hay una pequeña prima. '
                      'Si aparece un bicho sobre una planta, tócalo antes de que se la coma. Cada día dura 40 segundos y tiene un objetivo de dinero; '
                      'al terminarlo eliges una mejora. Cinco días completos ganan la temporada. Con teclado o mando, las flechas mueven el cursor y A actúa.'),
        pad=None, mp=None,
        players='1 jugador',
        desc=[
            'Granja de Bolsillo cabe entera en una pantalla: ocho parcelas de tierra, un pozo a un lado y un puesto de venta al otro. La partida son cinco días de cuarenta segundos y cada uno pide llegar a una cifra de dinero, así que no hay tiempo para pasear. Sembrar es gratis, pero la semilla no hace nada hasta que la riegas, y la regadera solo tiene tres cargas antes de volver al pozo.',
            'El precio del mercado sube y baja durante el día, y ahí está la decisión que da sabor a cada partida: vender enseguida lo poco que tienes o guardar la cosecha esperando un precio mejor, con el riesgo de que suene la campana del cierre con el almacén lleno. Cada tanto aparece un bicho sobre una planta a medio crecer; si no lo espantas a tiempo se lleva la planta entera y una estrella de reputación. Con las tres estrellas perdidas, la granja se echa a perder.',
            'Al terminar cada día se eligen mejoras que cambian el ritmo del siguiente: una regadera más grande, semillas que crecen antes, tierra que aguanta la humedad, un trato mejor con el comprador o un espantapájaros que reduce las plagas a la mitad. Como los objetivos suben de día en día, la temporada se convierte en una carrera contra la rutina: hay que encadenar dos cosechas por jornada y aprender a regar en el orden correcto.',
            'Se juega entero con el dedo, tocando cada parcela, el pozo y el puesto, y también con teclado o mando: las flechas mueven un cursor de puntos y A actúa. Está dibujado por código con el estilo cartoon del portal, con cielo, vallas, tierra que se oscurece al regarla y tomates que asoman cuando la planta está lista.',
        ],
        tips=['Riega justo después de sembrar toda la fila: la planta seca no avanza nada y pierdes medio día.',
              'Guarda la cosecha si el precio está en tres euros; casi siempre sube antes de que acabe el día.',
              'Elige la regadera grande el primer día: te ahorra dos viajes al pozo por jornada.'],
    ),
    dict(
        title='Restaurante Rápido',
        genre='puzzle', tags=['restaurante', 'gestion', 'clientes', 'propinas', 'vector'],
        orient='auto', aspect='fill', inputs='TMK',
        engine='gestion',
        cfg=dict(mode='resto', hud='br',
                 help='Toca una mesa libre para sentar al cliente que espera en la puerta. Cuando termine de mirar la carta, tócalo para tomarle nota: '
                      'la comanda se queda en espera. Toca un fogón libre para ponerla a cocinar y, cuando aparezca «¡listo!», tócalo otra vez para llevarte el plato. '
                      'Toca la mesa de quien pidió ese plato para servirlo; cuando termine de comer, paga y deja la mesa sucia: tócala dos veces para limpiarla. '
                      'Cada cliente tiene su barra de paciencia, en la puerta y en la mesa; cuanto antes le sirvas, más propina deja. '
                      'Días de 45 segundos con objetivo de dinero y una mejora entre día y día. Con teclado, las flechas mueven el cursor y A actúa.'),
        pad=None, mp=None,
        players='1 jugador',
        desc=[
            'Restaurante Rápido es un local de cuatro mesas y tres fogones donde tú eres a la vez camarero, cocinero y encargado de la fregona. Los clientes llegan a la puerta, esperan su turno con la paciencia en la mano y, una vez sentados, tardan un momento en decidirse antes de levantar la ceja pidiendo que les tomen nota. Desde ahí todo es una cadena: comanda, fogón, plato, mesa y trapo.',
            'El cuello de botella cambia cada partida. A veces son los fogones, con tres comandas esperando sitio; otras, las mesas sucias que no dejan sentar a nadie mientras la cola crece en la puerta. Los platos, cuatro en total, tardan tiempos distintos en hacerse, y uno que se queda enfriándose en el fogón acaba costando una estrella igual que un cliente que se marcha. Servir con la barra de paciencia todavía verde deja una propina que muchas veces es la diferencia entre llegar al objetivo del día o no.',
            'La jornada dura cuarenta y cinco segundos y hay cinco. Al final de cada una se elige una mejora que reorganiza el local: un cuarto fogón, una bandeja para llevar dos platos a la vez, una carta más cara, una sala más agradable que alarga la paciencia o un trapo que limpia de una pasada. Los objetivos de dinero suben deprisa, así que cada mejora hay que escogerla pensando en lo que se te atasca.',
            'Se juega tocando directamente cada mesa, cada fogón y cada cliente, y también con teclado o mando: las flechas saltan de un punto a otro y A actúa. Todo está dibujado por código con el estilo del portal: suelo de baldosas moradas, comensales de colores con su plato dibujado en un bocadillo y una barra de paciencia que se pone rosa cuando toca correr.',
        ],
        tips=['Pon la comanda en el fogón antes de limpiar nada: mientras se cocina tienes tiempo de sobra para el trapo.',
              'La bandeja compensa desde el día tres, cuando dos platos salen casi a la vez.',
              'Si la cola llena la puerta, limpia primero la mesa más cercana a la entrada.'],
    ),
    dict(
        title='Piano de Colores',
        genre='arcade', tags=['ritmo', 'piano', 'musica', 'melodias', 'vector'],
        orient='portrait', aspect='fill', inputs='TK',
        engine='rhythm',
        cfg=dict(mode='piano',
                 help='Ocho teclas de colores, del do al do. Las notas caen sobre su tecla: tócala justo cuando la nota llega a la línea. '
                      'Puedes usar varios dedos a la vez, como en un piano de verdad. Con teclado, las teclas A S D F G H J K (o los números del 1 al 8). '
                      'Cada acierto se valora como PERFECTO, GENIAL o BIEN, y encadenar notas multiplica los puntos hasta cuatro veces. '
                      'Fallar o dejar pasar una nota baja la barra de energía; si se vacía, se acaba la actuación. '
                      'Son cinco melodías tradicionales y clásicas encadenadas, cada una un poco más rápida que la anterior.'),
        pad=None, mp=None,
        players='1 jugador',
        desc=[
            'Piano de Colores convierte el móvil en un teclado de ocho notas, del do al do, cada una con su color. Las notas de la melodía caen desde arriba por el carril de su tecla y hay que tocarlas justo cuando cruzan la línea: cuanto más clavado, mejor valoración y más puntos. Como el piano suena de verdad, al tocar bien se oye la melodía completa, y cuando fallas se nota en el oído antes que en el marcador.',
            'El repertorio son cinco piezas de dominio público que casi todo el mundo reconoce a la primera: el Martinillo, Estrellita, Los pollitos, el Himno de la alegría de Beethoven y un fragmento del Canon de Pachelbel. Se tocan encadenadas y cada una entra un poco más rápida que la anterior, de manera que la dificultad crece sin que haga falta elegir nivel. Al terminar una melodía hay una pausa breve con el nombre de la siguiente y una prima de puntos según lo limpio que haya salido.',
            'La pantalla admite varios dedos a la vez, así que los pasajes con notas seguidas se pueden repartir entre las dos manos, igual que en un teclado real. En el ordenador se juega con la fila A S D F G H J K o con los números del uno al ocho. La barra de energía baja con cada nota perdida y sube un poco con cada acierto, de modo que un tropiezo aislado no arruina la actuación pero una racha de fallos sí la termina.',
            'Es un juego tranquilo y de repetición: la primera vuelta se va detrás de las notas y, a la tercera, se empieza a tocar de memoria mirando dos compases por delante. El dibujo, hecho por código, imita un teclado con sus blancas y sus negras bajo un cielo estrellado, y cada tecla se enciende con su color al pulsarla.',
        ],
        tips=['Mira las notas cuando aún están arriba: así colocas el dedo antes y no persigues la línea.',
              'En las parejas de notas repetidas usa dos dedos distintos; encadenar el combo multiplica los puntos.',
              'Si pierdes energía, apunta a los PERFECTO: recuperan más barra que un acierto justo.'],
    ),
]
