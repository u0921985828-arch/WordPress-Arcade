"""Oleada 2 — agente «arena»: modos nuevos de arena.js (moscas, cajas, menguante, imanes, almohadas, pinguinos)."""

_P = dict(orient='auto', aspect='fill', inputs='TKG', engine='arena')

GAMES = [
    dict(
        title='Cazamoscas', genre='party', tags=['cazar', 'red', 'recoger', 'versus', 'vector'], **_P,
        cfg=dict(mode='moscas', hud='bl', help='Muévete con el joystick y pulsa A para dar un redazo: las moscas que queden dentro del aro son tuyas. La mosca dorada vale cinco y se escapa a los pocos segundos. Si tu red alcanza a un rival, lo enredas un momento. B da un acelerón. Tres rondas de 40 segundos.'),
        pad=dict(d='8', a='Red', b='Acelerón'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Cazamoscas transcurre en una merienda campestre que se ha llenado de visitantes indeseados. Sobre el césped hay una manta de cuadros con sandía, un bocadillo y una cuña de queso, y alrededor revolotean nueve moscas zumbonas que cambian de rumbo sin avisar. Cada jugador lleva una red de mango largo y el objetivo es sencillo: cazar más bichos que nadie antes de que se acaben los cuarenta segundos de la ronda.',
            'Las moscas no se dejan atrapar así como así. Cuando te acercas se apartan, y si las persigues en línea recta acabarás dando redazos al aire. Funciona mejor encerrarlas contra el borde del prado o esperar a que un rival las espante hacia ti. De vez en cuando aparece una mosca dorada, más rápida y más asustadiza, que vale por cinco y se marcha si nadie la caza en unos segundos. Ahí es cuando todos corren al mismo sitio y la red sirve también para otra cosa: un redazo a otro jugador lo deja enredado casi un segundo.',
            'El botón A lanza la red en un arco delante de ti y el B da un acelerón corto para cerrar distancias. Puedes jugar solo contra tres cazadores de la CPU, que empiezan torpes y afinan si les ganas, o en la tele con hasta cuatro móviles como mandos. Tres rondas, puntos por puesto y podio final.',
        ],
        tips=['Acorrala las moscas contra el borde: allí no tienen hacia dónde huir.', 'Guarda el acelerón para la mosca dorada, que vale cinco.', 'Un redazo a quien va a por la dorada puede darte la ronda.'],
    ),
    dict(
        title='Escondite de Cajas', genre='party', tags=['escondite', 'engano', 'deduccion', 'versus', 'vector'], **_P,
        cfg=dict(mode='cajas', hud='bl', help='Por turnos, uno busca y los demás son cajas iguales a las que mueve la CPU. Todas las cajas se mueven y se paran a la vez: con «¡Alto!» quédate quieto o te delatarás. Buscador: acércate y pulsa A para levantar una caja; si está vacía, pierdes un momento. Escondido: A hace temblar una caja cercana como señuelo. Cuatro rondas de 45 segundos.'),
        pad=dict(d='8', a='Acción'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'Escondite de Cajas lleva el juego del escondite a un almacén lleno de cajas de cartón exactamente iguales. En cada ronda un jugador hace de buscador, con su lupa y cara de detective, y los demás se meten dentro de una caja. El truco está en que no son las únicas: una decena de cajas más se desplazan por el suelo manejadas por la CPU, y a simple vista nadie distingue cuál esconde a un amigo y cuál está vacía.',
            'Las cajas de la CPU siguen un ritmo que marca el semáforo del marcador: todas echan a andar con «¡Moveos!» y se detienen de golpe con «¡Alto!». Si quieres pasar desapercibido tienes que imitarlas, avanzar en línea recta cuando toca y frenar en seco a tiempo. Quien se mueve con el semáforo en rojo se delata. El buscador camina más deprisa y levanta la caja que tenga delante con A: si acierta, suma puntos y el escondido queda fuera; si falla, se queda un momento aturdido mirando una caja vacía. Los escondidos también tienen su arma: con A hacen temblar una caja cercana para despistar.',
            'En la tele todos ven la misma pantalla, así que al principio cada escondido tiene tres segundos, mientras todas las cajas se mezclan, para descubrir cuál es la suya sin que se note. Jugando solo, tu caja lleva una etiqueta que solo tú necesitas. Cada jugador busca una vez; los escondidos puntúan por el tiempo que aguantan y el buscador por cada caja acertada.',
        ],
        tips=['Mira el semáforo, no la caja: la que se mueve con «¡Alto!» es de alguien.', 'Si te persiguen, no huyas: una caja que escapa no es de la CPU.', 'Usa el señuelo cuando el buscador esté cerca de otra caja.'],
    ),
    dict(
        title='Plataforma Menguante', genre='party', tags=['plataformas', 'hexagonos', 'eliminacion', 'versus', 'vector'], **_P,
        cfg=dict(mode='menguante', hud='bl', help='Cada hexágono que pisas se agrieta y cae al vacío poco después, y a partir de los 25 segundos también caen solos. No te quedes quieto. A da un empujón y B un salto corto para cruzar huecos. Gana el último que siga en pie. Tres rondas.'),
        pad=dict(d='8', a='Empujón', b='Salto'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'Plataforma Menguante es un duelo de equilibrio sobre un panal de sesenta y una baldosas hexagonales de colores que flota entre nubes. La regla que lo cambia todo es que el suelo recuerda tus pasos: en cuanto pisas un hexágono empieza a temblar, se tiñe de rojo, se llena de grietas y, un instante después, se desprende y cae. Quien se queda encima cae con él.',
            'Así que nadie puede estarse quieto. Cada jugador va dejando un rastro de agujeros que los demás tienen que esquivar, y en pocos segundos la plataforma se convierte en un laberinto de islas. Con el tiempo las grietas avanzan más deprisa y, pasados veinticinco segundos, empiezan a caer baldosas al azar aunque nadie las pise. El botón B da un salto corto que permite cruzar un hueco de una o dos casillas, y el A un empujón que puede mandar a un rival directo a una zona ya desmoronada.',
            'Se juega con el mando virtual del móvil, con el teclado o, en la tele, con un móvil por jugador. Las plazas vacías las ocupan corredores de la CPU que buscan las zonas más enteras y que, si les ganas a menudo, aprenden a saltar y a empujar mejor. Tres rondas, puntos por orden de caída y podio final.',
        ],
        tips=['Recorre los bordes al principio y deja el centro para el final.', 'No cruces por tu propio rastro: ya no queda suelo.', 'Salta justo antes del hueco, no encima de él.'],
    ),
    dict(
        title='Imanes Opuestos', genre='party', tags=['imanes', 'fisica', 'empujar', 'eliminacion', 'versus', 'vector'], **_P,
        cfg=dict(mode='imanes', hud='bl', help='Cada jugador es un imán con polo N o S. Polos iguales se repelen y distintos se atraen, con más fuerza cuanto más cerca. A cambia tu polo y B te ancla al suelo (pesas el triple pero apenas te mueves). Echa a los demás de la placa, que encoge a partir de los 20 segundos. Tres rondas.'),
        pad=dict(d='8', a='Polo', b='Anclar'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'En Imanes Opuestos cada jugador es un muñeco con un imán de herradura en la cabeza, rojo si es polo norte y azul si es polo sur. Todos comparten una placa metálica redonda suspendida sobre un foso oscuro, rodeada por una franja amarilla y negra de advertencia. Ganas si eres el último que queda encima, y para echar a los demás no hace falta tocarlos: basta con la física del magnetismo.',
            'Dos imanes con el mismo polo se repelen, y dos opuestos se atraen. La fuerza crece muchísimo al acercarse, así que un cambio de polo en el momento justo convierte un abrazo en una patada. El botón A invierte tu polo al instante: ponte entre un rival y el centro, iguala su polo y verás cómo sale despedido hacia el borde. Si eres tú el que está en peligro, cambia al contrario para que te arrastre de vuelta. Con B te anclas al suelo, pesas el triple y aguantas los tirones, aunque casi no puedes andar. Las líneas de colores entre jugadores enseñan quién atrae y quién repele.',
            'A partir de los veinte segundos la placa empieza a encoger y los choques se vuelven inevitables. Juega en el móvil con el mando virtual, con el teclado o en la tele con un móvil por jugador; la CPU completa la partida y aprende a elegir mejor su polo cuanto más le ganas. Tres rondas y podio.',
        ],
        tips=['Colócate más cerca del centro que tu rival antes de repelerlo.', 'Si vas hacia el borde, cambia de polo para que otro tire de ti.', 'Anclarte justo cuando alguien te repele te deja clavado en el sitio.'],
    ),
    dict(
        title='Pelea de Almohadas', genre='party', tags=['almohadas', 'combate', 'bloqueo', 'eliminacion', 'versus', 'vector'], **_P,
        cfg=dict(mode='almohadas', hud='bl', help='Sobre una cama elástica gigante, A da un almohadazo delante de ti y B bloquea con la almohada los golpes que llegan de frente (quien te golpea rebota aturdido). Cada golpe que recibes te quita una pluma: con tres fuera, quedas eliminado. Los tres primeros segundos no quitan plumas. Tres rondas.'),
        pad=dict(d='8', a='Golpe', b='Bloqueo'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'Pelea de Almohadas es la guerra de todas las fiestas de pijamas, disputada sobre un colchón gigante que hace de cama elástica. Cuatro muñecos con gorro de dormir botan sin parar sobre un edredón acolchado con almohadas en la mano, y la cama tiene un marco de madera que te devuelve rebotando si chocas contra él. Nadie sale volando del escenario: aquí se pierde por plumas.',
            'Cada jugador empieza con tres plumas, que se ven en su ficha del marcador. Un almohadazo con A barre el espacio que tienes delante y, si alcanza a alguien, le arranca una pluma entre una nube blanca y lo empuja lejos. Con B levantas la almohada delante de ti: si el golpe llega de frente lo paras y el atacante rebota aturdido, listo para recibir. Pero el bloqueo solo cubre por delante y mientras lo mantienes te mueves muy despacio, así que un segundo rival puede rodearte y golpearte por la espalda. Tras cada golpe hay un instante de parpadeo en el que no pierdes más plumas.',
            'Gana la ronda quien conserve plumas cuando los demás las han perdido todas. Juega en el móvil con el mando virtual, con el teclado o en la tele con hasta cuatro móviles; la CPU rellena las plazas, empieza tranquila y aprende a bloquear y a esperar su momento si le vas ganando. Tres rondas con podio final.',
        ],
        tips=['Bloquea justo cuando el rival levanta la almohada y contraataca mientras está aturdido.', 'No te quedes entre dos rivales: el bloqueo solo te cubre de frente.', 'Usa el rebote del marco para escapar cuando te quede una pluma.'],
    ),
    dict(
        title='Pelea de Pingüinos', genre='party', tags=['pinguinos', 'hielo', 'empujar', 'eliminacion', 'versus', 'vector'], **_P,
        cfg=dict(mode='pinguinos', hud='bl', help='Sobre el témpano todo resbala. A lanza un barrigazo: te tumbas y sales disparado embistiendo fuerte, pero casi no puedes girar. B clava las patas para frenar. El témpano pierde trozos por el borde y quien cae al agua queda fuera. El pez hace que tu siguiente barrigazo sea mucho más fuerte. Tres rondas.'),
        pad=dict(d='8', a='Barrigazo', b='Frenar'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'Pelea de Pingüinos se juega sobre un témpano a la deriva en mitad de un mar helado. Cuatro pingüinos con gorro de lana, cada uno de un color, comparten un bloque de hielo blanco que ya viene resquebrajado en trozos, y todos tienen la misma idea: echar al agua a los demás y quedarse con el témpano para ellos solos.',
            'El hielo resbala y cuesta pararse, pero el arma de verdad es el barrigazo. Con A tu pingüino se tumba sobre la barriga y sale disparado como un trineo: arrolla a quien encuentre y lo manda lejos, aunque durante el deslizamiento apenas puedes corregir el rumbo y, si apuntas mal, el que termina en el agua eres tú. Para eso está B, que clava las patas y frena en seco. De vez en cuando aparece un pez plateado sobre el hielo; quien lo coge carga un barrigazo mucho más potente.',
            'A los pocos segundos el témpano empieza a romperse: un trozo del borde tiembla, se agrieta y se aleja flotando, y más adelante también se sueltan piezas del anillo interior, hasta dejar solo el círculo central. Juega en el móvil con el mando virtual, con el teclado o en la tele con cuatro móviles; los pingüinos de la CPU esperan su momento y aprenden a frenar al borde si les ganas. Tres rondas y podio.',
        ],
        tips=['Lanza el barrigazo desde más cerca del centro que tu rival, nunca hacia fuera.', 'Frena con B en cuanto notes que resbalas hacia el agua.', 'Aléjate de los trozos que tiemblan: se van a soltar.'],
    ),
]
