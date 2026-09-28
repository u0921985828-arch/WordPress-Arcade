"""Oleada 5 — motor `horda`: supervivencia cooperativa a gran escala (hordas, defensa de la aldea y bomberos)."""

PAD_H = dict(d='8', a='Elegir', b='', t=1)
PAD_A = dict(d='8', a='Reparar', b='Barricada', t=1)
PAD_F = dict(d='8', a='Manguera', b='', t=1)

GAMES = [
    dict(
        title='Horda a Dúo', genre='arcade', tags=['horda', 'supervivencia', 'cooperativo', 'mejoras', 'oleadas', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='horda', pad=PAD_H, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='horda', help='Muévete con el joystick, las flechas o arrastrando el dedo: disparas tú solo, siempre al bicho más cercano, así que tu única tarea es esquivar y colocarte bien. Los bichos caídos sueltan gemas azules; cuando llenas la barra subes de nivel y eliges una mejora entre tres (daño, cadencia, proyectil extra, velocidad, vida, imán, perforación, alcance, vendas u onda de choque). Cada minuto y medio aparece un jefe con su propia barra de vida. Si te quedas sin vida caes al suelo y un compañero puede levantarte poniéndose a tu lado; si caéis todos, se acabó. Aguanta cinco minutos.'),
        desc=[
            'Horda a Dúo es un superviviente de los de pantalla llena: empiezas con cuatro babas perezosas y terminas con la mitad del suelo cubierta de bichos que vienen a por ti desde los cuatro lados. El disparo es automático y siempre va al enemigo más cercano, así que el juego no va de apuntar sino de leer la pantalla: dónde hay hueco, por dónde se está cerrando el cerco y cuándo toca cruzar la marea en lugar de huir en línea recta. Un jugador experimentado se pasa la partida dibujando círculos amplios, arrastrando a la horda detrás de él.',
            'Todo lo que matas suelta gemas. Recogerlas llena la barra de experiencia y cada nivel te para el reloj para que elijas una mejora entre tres: más pegada, gatillo rápido, un proyectil más, botas ligeras, corazón grande, imán, punta perforante, cañón largo, vendas u onda de choque. Las mejoras son del equipo, así que en cooperativo se decide entre todos y la partida se construye a base de acuerdos rápidos. Cada minuto y medio entra un jefe enorme con barra de vida propia que suelta un montón de gemas al caer, y esos son los momentos en que la partida cambia de marcha.',
            'Cuando te quedas sin vida no desapareces: caes al suelo con una cuenta atrás, y un compañero que se ponga a tu lado te levanta en menos de dos segundos. Solo se acaba cuando estáis todos en el suelo a la vez, lo que convierte cada rescate en una decisión de verdad, con la horda encima. En la tele juegan hasta cuatro personas desde sus móviles y la máquina cubre las plazas libres; en solitario la partida se ajusta para que siga siendo justa. Hay tres dificultades y el récord se guarda por separado en cada una.',
        ],
        tips=['No huyas en línea recta: los bichos te siguen, y en círculos amplios los vas amontonando detrás mientras el disparo automático los va limpiando.',
              'La onda de choque y el imán valen más de lo que parecen en cooperativo: despejan el hueco justo para levantar a un compañero caído.',
              'Cuando aparece el jefe, deja de perseguir gemas y busca espacio abierto: sus embestidas hacen mucho daño si te pilla contra una esquina.'],
    ),
    dict(
        title='Defensa de la Aldea', genre='arcade', tags=['defensa', 'oleadas', 'cooperativo', 'barricadas', 'aldea', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='horda', pad=PAD_A, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='aldea', help='En el centro hay casas y son lo que de verdad hay que salvar: los bichos van a por ellas y solo se desvían si les pasas cerca. Tú disparas solo al enemigo más próximo, así que tu trabajo es colocarte entre la horda y las casas. Entre oleada y oleada hay un descanso: ponte junto a una casa dañada y mantén pulsado A para repararla, o pulsa B para plantar una barricada con la madera que sueltan los bichos. Aguanta diez oleadas. Si caes, un compañero puede levantarte; si se quedan sin casas, se acabó la aldea.'),
        desc=[
            'Defensa de la Aldea cambia la pregunta de siempre. Aquí no basta con sobrevivir: hay tres o cuatro casas en el centro del mapa con su propia barra de vida y los bichos van directos a por ellas. Solo se desvían hacia ti si les pasas suficientemente cerca, así que la partida se juega haciendo de cebo, cruzándote en el camino de la oleada y arrastrándola lejos de los tejados. El disparo sigue siendo automático y apunta al enemigo más próximo, lo que convierte tu posición en el arma real: dónde te pongas decide qué muere y qué llega a las casas.',
            'Las oleadas vienen numeradas y con descanso entre ellas. Ese descanso es medio juego: acércate a una casa dañada y mantén pulsado A para repararla a ojos vistas, o pulsa B para plantar una barricada de madera donde estás. La madera la sueltan los propios bichos, así que hay que decidir si la gastas en cerrar el pasillo por el que entraron los últimos o la guardas para la oleada siguiente. Las barricadas no son eternas: los bichos las muerden y caen, pero mientras aguantan compran los segundos que necesitas para llegar al otro lado del mapa.',
            'Cada oleada trae más bichos y más duros, y a partir de la mitad de la partida se mezclan los lentos que pegan fuerte con los rápidos que van en enjambre. Se juega solo o hasta cuatro en la tele, con la máquina cubriendo las plazas libres, y quien cae al suelo puede ser levantado por un compañero que se ponga a su lado. Diez oleadas después, si queda una sola casa en pie, la aldea está salvada. Hay tres niveles de dificultad y el récord se guarda por separado en cada uno.',
        ],
        tips=['Sal a recibir la oleada lejos de las casas: cada bicho que muere a mitad de camino es daño que el tejado no recibe.',
              'Las barricadas rinden más en los pasillos estrechos entre dos casas que sueltas en mitad del campo.',
              'No dejes ninguna casa a menos de la mitad de vida antes de que empiece la oleada siguiente: reparar en plena horda es casi imposible.'],
    ),
    dict(
        title='Bomberos del Barrio', genre='party', tags=['bomberos', 'fuego', 'rescate', 'cooperativo', 'agua', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='horda', pad=PAD_F, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='fuego', help='Aquí no se dispara a nadie: se apaga. El edificio es una rejilla de estancias y el fuego salta de una a otra. Mantén pulsado A para soltar la manguera hacia donde miras; cuando se te acabe el agua, vuelve a la fuente de la calle y espera unos segundos a llenar el depósito. Los vecinos aparecen pidiendo ayuda: pásales por encima para cargarlos y llévalos a la ambulancia. Si una estancia arde demasiado tiempo se hunde y el edificio pierde estructura; si la estructura llega a cero, o si te quedas sin vida entre las llamas, se acabó el turno.'),
        desc=[
            'Bomberos del Barrio es el reverso de los otros dos juegos del motor: no hay nada a lo que disparar y ganar consiste en que no pase nada. El edificio está dividido en estancias y el fuego es el enemigo: nace en dos focos, crece solo y salta a las habitaciones de al lado, así que una llama que ignoras dos veces se convierte en media planta ardiendo. Se apaga manteniendo pulsado A con la manguera apuntando hacia donde miras, y el depósito se vacía en pocos segundos, de modo que la partida es un ir y venir constante entre la calle y el interior.',
            'El agua se recoge en la fuente de la calle y llenar el depósito tarda lo suyo, lo justo para que dejar el fuego solo tenga consecuencias. Mientras tanto van apareciendo vecinos atrapados que piden auxilio desde sus habitaciones: basta con pasarles por encima para cargarlos al hombro, aunque cargado se corre más despacio, y hay que llevarlos hasta la ambulancia aparcada al otro extremo de la calle. Un vecino rodeado de llamas pierde salud rápido, así que casi siempre toca elegir entre sacarlo ya o abrir antes un pasillo apagando la estancia de al lado.',
            'La estructura del edificio es el cronómetro real. Cada estancia que arde sin parar acaba hundiéndose, y con cada hundimiento el edificio pierde un punto de estructura; los vecinos que no llegan a la ambulancia cuestan otro. Si la estructura llega a cero, el turno acaba mal. Se juega solo o hasta cuatro en la tele con la máquina cubriendo las plazas libres, y la mejor manera de jugarlo en grupo es repartirse los papeles: uno contiene el fuego en la planta alta mientras los demás vacían las habitaciones. Hay tres dificultades y el récord se guarda por separado en cada una.',
        ],
        tips=['Apaga primero las estancias del borde del incendio, no las más encendidas: así el fuego deja de tener a dónde saltar.',
              'No entres nunca con el depósito por debajo de un cuarto: quedarse sin agua dentro del edificio es perder dos viajes.',
              'Si un vecino está en una estancia muy encendida, apaga primero su casilla aunque tardes: cargarlo con las llamas encima le cuesta casi toda la salud.'],
    ),
]
