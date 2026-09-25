"""Oleada 2 — descensos por la nieve (descenso) y motocross lateral (moto). Agente «carreras»."""

GAMES = [
    dict(
        title='Slalom de Banderas', genre='racing', tags=['esqui', 'slalom', 'nieve', 'contrarreloj', 'pantalla-dividida', 'vector'],
        orient='auto', aspect='fill', inputs='TKG', engine='descenso',
        cfg=dict(mode='slalom', help='Baja esquiando y pasa entre las dos banderas de cada puerta. Rozar un palo suma 1 segundo y saltarte una puerta, 5. Joystick ← → para girar, A para agacharte y correr más, B para frenar en cuña. Dos mangas: gana el menor tiempo total. Sin mando, toca hacia donde quieres ir.'),
        pad=dict(d='h', a='Agacharse', b='Frenar'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Slalom de Banderas es una contrarreloj en la nieve con una regla sencilla y exigente: cada puerta está marcada por dos banderas del mismo color y tienes que pasar entre ellas. Si rozas un palo, la bandera se tambalea y te suma un segundo; si te saltas la puerta entera, cinco. Las primeras puertas están casi en línea recta, pero a medida que bajas se abren hacia los lados y se estrechan, y el trazado obliga a enlazar giros cada vez más cerrados.',
            'La partida son dos mangas por pistas distintas, la azul y la roja, y gana quien sume el menor tiempo total, penalizaciones incluidas. El esquí responde como en una ladera de verdad: cuanto más apuntas hacia abajo más aceleras, cruzarte en la pendiente te frena y agacharte recorta el aire a cambio de girar peor. El truco está en decidir cuándo ir a tope y cuándo soltar un poco antes de una puerta que se abre hacia el otro lado.',
            'En la tele pueden bajar hasta cuatro personas a la vez y la pantalla se divide en una columna por jugador; los demás esquiadores aparecen como fantasmas translúcidos, así ves en todo momento si vas por delante o por detrás. Los huecos libres los ocupan corredores de la CPU que eligen buena línea pero a veces se pasan de frenada o tocan un palo; cada vez que les ganas afinan un poco más.',
        ],
        tips=['Empieza a girar antes de llegar a la puerta: si esperas a tenerla encima, entrarás cruzado y rozarás el palo de fuera.', 'Agáchate (A) solo en los tramos rectos; en las zonas de puertas muy abiertas giras mucho mejor de pie.', 'Una puerta fallada cuesta cinco segundos: si vas demasiado lanzado, frena con B antes que salirte de la línea.'],
    ),
    dict(
        title='Trineo Nevado', genre='racing', tags=['trineo', 'nieve', 'saltos', 'copa', 'camara-compartida', 'vector'],
        orient='auto', aspect='fill', inputs='TKG', engine='descenso',
        cfg=dict(mode='trineo', help='Carrera de cuatro trineos cuesta abajo. Joystick ← → para girar, A para agacharte y ganar velocidad, B para frenar. Esquiva los abetos, usa las flechas de turbo y salta en las rampas: si aterrizas mirando hacia abajo ganas un impulso. En el hielo el trineo derrapa. Copa de 3 bajadas.'),
        pad=dict(d='h', a='Agacharse', b='Frenar'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Trineo Nevado es una carrera cuesta abajo para cuatro trineos de madera por un sendero que serpentea entre abetos cargados de nieve. El camino se estrecha en algunos tramos, gira sin avisar y está salpicado de árboles sueltos que hay que esquivar: chocar con uno te hace dar vueltas en la nieve y pierdes casi toda la velocidad. Salirte del sendero tampoco sale gratis, porque la nieve virgen de los lados frena muchísimo.',
            'Por el camino encontrarás rampas de nieve que te lanzan por el aire, flechas pintadas que dan un turbo y placas de hielo donde el trineo sigue recto aunque gires. En el aire puedes corregir el rumbo: si aterrizas mirando hacia abajo, recibes un impulso; si caes cruzado, el golpe te frena. La copa tiene tres bajadas por sendas distintas, puntúan los cuatro puestos y en cada bajada sale delante quien va último en la clasificación.',
            'Se juega con muy poco: izquierda y derecha para girar, A para agacharte y B para frenar. En la tele caben cuatro jugadores con el móvil como mando y la cámara sigue al que va primero; quien se queda atrás y sale de la imagen reaparece junto al líder a cambio de un pequeño parón. Los trineos se empujan al chocar, así que un toque en el momento justo puede mandar a un rival contra un árbol. La CPU completa la carrera y mejora cada vez que le ganas la copa.',
        ],
        tips=['Mira siempre un poco más abajo de tu trineo: los abetos del centro del camino se esquivan mejor con giros suaves y tempranos.', 'Antes de una rampa, endereza el trineo; en el aire, apunta hacia abajo para aterrizar con impulso.', 'En el hielo no gires a lo loco: el trineo tarda en obedecer, así que corrige antes de entrar.'],
    ),
    dict(
        title='Motocross de Colinas', genre='racing', tags=['motocross', 'motos', 'saltos', 'fisica', 'pantalla-dividida', 'vector'],
        orient='landscape', aspect='16:9', inputs='TKG', engine='moto',
        cfg=dict(mode='motocross', hud='br', help='A acelera y B frena. Con ← → te inclinas hacia atrás o hacia delante: en el aire giras la moto para aterrizar con las dos ruedas a la vez y ganar turbo. Si caes de cabeza vuelves al último banderín. Gana la mejor de 3 mangas. Sin mando: mantén el dedo para acelerar y tócalo a la izquierda o a la derecha para inclinarte.'),
        pad=dict(d='h', a='Gas', b='Freno'), mp=(1, 2), players='1–2 jugadores',
        desc=[
            'Motocross de Colinas es una carrera lateral de motos de tierra por circuitos llenos de lomas, rampas, mesas y baches encadenados. La moto tiene física de verdad: acelerar en una cuesta levanta la rueda delantera, frenar en una bajada la clava y cada salto te deja unos segundos en el aire en los que el piloto puede echar el cuerpo hacia atrás o hacia delante para girar la moto. Todo el juego gira alrededor de ese gesto.',
            'Si tocas el suelo con las dos ruedas a la vez y la moto alineada con la pendiente, el aterrizaje es perfecto y ganas un turbo. Si llegas de morro o de cola, rebotas y pierdes velocidad; y si el piloto se da de cabeza contra la tierra, vuelves al último banderín con el reloj en marcha. Quien se atreva puede dar una vuelta completa en el aire para ganar un turbo todavía mayor, aunque un mortal mal calculado sale caro.',
            'Cada partida es la mejor de tres mangas en circuitos distintos, cada vez más largos y con saltos más grandes. Solo corres contra un piloto de la CPU que aparece como fantasma sobre la misma pista: acelera con cabeza, corrige en el aire y a veces se pasa de rosca; cuantas más partidas le ganas, mejor aterriza. En la tele pueden jugar dos personas a pantalla partida, una arriba y otra abajo, cada una con su móvil como mando.',
        ],
        tips=['No aceleres a fondo en la cara de una rampa muy empinada: la moto se encabrita y despegarás mirando al cielo.', 'En el aire, compara la moto con la bajada donde vas a caer e inclínate hasta que queden paralelas.', 'En los baches seguidos suelta un poco el gas: las ruedas tocan más el suelo y ganas más de lo que pierdes.'],
    ),
]
