"""Oleada 1 — agente «arena»: motor arena.js (arena cenital con empujones, zonas, recogida y eliminación)."""

_P = dict(orient='auto', aspect='fill', inputs='TKG', engine='arena')

GAMES = [
    dict(
        title='Sumo de Cojines', genre='party', tags=['sumo', 'empujar', 'eliminacion', 'versus', 'vector'], **_P,
        cfg=dict(mode='sumo', hud='bl', help='Muévete con el joystick. Mantén A para cargar y suéltalo para embestir; mantén B para plantarte y pesar el triple. Echa a los demás fuera del tatami, que encoge cada 10 segundos. Tres rondas.'),
        pad=dict(d='8', a='Carga', b='Plantarse'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'Sumo de Cojines lleva el deporte más solemne de Japón a una fiesta de salón: cuatro luchadores regordetes, con su cinturón blanco, se plantan sobre un tatami hinchable de color crema rodeado por un rulo rojo de goma. La regla es la de siempre: quien sale del círculo, pierde. Lo nuevo es que el colchón se desinfla un poco cada diez segundos, así que el espacio se acaba y tarde o temprano alguien tiene que caer.',
            'La clave está en la carga. Mantén pulsado A y tu luchador se agacha y apunta mientras se llena un aro amarillo; al soltarlo sale disparado con más fuerza cuanto más hayas esperado. Si ves venir una embestida, mantén B para plantarte: pesas el triple y el otro rebota, aunque mientras tanto no te mueves. Con el joystick te colocas, y el truco es ponerte entre el rival y el centro para empujarlo hacia fuera.',
            'Se juega con el mando virtual o arrastrando el dedo en el móvil, con flechas, espacio y X en el teclado, y en el modo tele cada invitado usa su móvil. Las plazas libres las ocupan luchadores de la CPU que aprenden de tus victorias. Tres rondas cortas, puntos por puesto y un podio final con confeti.',
        ],
        tips=['No cargues al borde del tatami: mientras cargas te mueves muy despacio.', 'Plántate justo cuando el rival suelte la carga y lo verás rebotar hacia fuera.', 'Cuando el tatami encoja, gana el centro antes que nadie.'],
    ),
    dict(
        title='Pista de Hielo Loca', genre='party', tags=['hielo', 'inercia', 'eliminacion', 'versus', 'vector'], **_P,
        cfg=dict(mode='hielo', hud='bl', help='Sobre el hielo nadie frena: el joystick solo empuja poco a poco. A da un empujón y B lanza una onda que aparta a quien esté cerca. Las baldosas se agrietan y se abren agujeros; si te quedas quieto, la tuya también. Gana el último sobre el hielo.'),
        pad=dict(d='8', a='Empujón', b='Onda'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'En Pista de Hielo Loca no hay frenos. Cuatro patinadores torpes aparecen sobre una pista helada hecha de baldosas azules, en mitad de un lago oscuro, y cualquier movimiento se convierte en un deslizamiento largo e imparable. El joystick no te lleva adonde apuntas: solo te empuja poco a poco en esa dirección, así que para pararte hay que empujar hacia el lado contrario con tiempo.',
            'Y el hielo se rompe. Al cabo de unos segundos empiezan a aparecer grietas: la baldosa oscurece, tiembla y al final se hunde dejando un agujero de agua helada. Las roturas llegan cada vez más a menudo y a veces cerca de ti, y si te quedas mucho rato sobre la misma baldosa también se agrieta. Quien cae al agua queda fuera de la ronda y gana el último que siga patinando.',
            'A da un empujón en la dirección en la que miras, perfecto para mandar a un rival hacia un agujero; B suelta una onda que aparta a todos los que tengas pegados, con recarga de unos segundos. Se juega con el mando virtual del móvil, el teclado o, en la tele, con un móvil por jugador; la CPU ocupa los huecos y se vuelve más fina si le ganas. Tres rondas y podio.',
        ],
        tips=['Frena antes de llegar: en el hielo la corrección siempre llega tarde.', 'No te quedes quieto demasiado tiempo en la misma baldosa.', 'Guarda la onda para cuando te encierren contra un agujero.'],
    ),
    dict(
        title='Pintacasillas', genre='party', tags=['pintar', 'territorio', 'contrarreloj', 'versus', 'vector'], **_P,
        cfg=dict(mode='pintar', hud='bl', help='Pisa las casillas para pintarlas de tu color. La pintura ajena resbala y tarda un momento en cambiar. A da un acelerón y B suelta una bomba de pintura de 3×3. Gana quien tenga más suelo pintado al acabar los 30 segundos.'),
        pad=dict(d='8', a='Acelerón', b='Bomba'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Pintacasillas es una carrera de treinta segundos por teñir el suelo. El escenario es una cuadrícula de once por once baldosas blancas y cada jugador deja un rastro de su color allí por donde pisa. Al sonar el final se cuentan las casillas y gana quien haya cubierto un porcentaje mayor. Es fácil de entender en un vistazo y se juega a toda velocidad.',
            'Lo interesante empieza cuando los colores se cruzan. Las casillas en blanco se pintan al instante, pero las de otro jugador están mojadas: al pisarlas resbalas, pierdes agarre y tienes que quedarte un momento encima hasta que una mancha de tu color crece y la reclama. Por eso a veces compensa buscar zonas vírgenes en vez de pelear por las del rival, y otras veces conviene borrar su trabajo justo antes del final.',
            'El botón A da un acelerón corto para llegar primero a una zona libre y el B lanza una bomba de pintura que colorea de golpe las nueve casillas que te rodean, también las ajenas, con unos segundos de recarga. Juega solo contra tres pintores de la CPU o en la tele con hasta cuatro móviles. Tres rondas con puntos por puesto.',
        ],
        tips=['Guarda la bomba para una zona llena de pintura ajena: vale por nueve casillas.', 'Los bordes suelen quedar vacíos al principio; recórrelos en línea recta.', 'En los últimos segundos, repinta lo que otro acaba de ganar.'],
    ),
    dict(
        title='Rey de la Colina', genre='party', tags=['zona', 'empujar', 'dominio', 'versus', 'vector'], **_P,
        cfg=dict(mode='colina', hud='bl', help='Quédate dentro del círculo con bandera: sumas tiempo solo si estás tú solo. La zona se desplaza y encoge. A da un empujón y B un salto corto que te libra de los choques. Rondas de 40 segundos.'),
        pad=dict(d='8', a='Empujón', b='Salto'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'Rey de la Colina es el juego del patio de toda la vida convertido en arena de empujones. En un prado hay un círculo dorado con una bandera en el centro y quien está dentro, sin compañía, suma segundos a su marcador. Si entran dos o más jugadores, la zona queda disputada, parpadea en rojo y nadie cuenta nada hasta que alguien consiga echar a los demás.',
            'La zona no se queda quieta: recorre el campo trazando curvas, cada vez un poco más deprisa y un poco más pequeña, así que no basta con plantarse. Hay que acompañarla, adivinar hacia dónde va y llegar antes que los rivales. El botón A da un empujón seco que manda lejos a quien golpees, y el B hace un salto corto: mientras estás en el aire nadie puede empujarte, aunque tampoco sumas.',
            'En el móvil mueves a tu muñeco con el mando virtual o arrastrando; con teclado, flechas, espacio y X; en el modo tele, cada invitado con su móvil y la CPU completando la partida. Cada ronda dura cuarenta segundos y se juegan tres; el marcador enseña los segundos de cada uno y al final un podio decide quién manda en la colina.',
        ],
        tips=['Colócate en el lado hacia el que avanza la zona, no detrás.', 'Salta justo cuando alguien te embista: fallará y quedará vendido.', 'Una zona disputada no da puntos a nadie: a veces es mejor sacar a uno que entrar.'],
    ),
    dict(
        title='Patata Explosiva', genre='party', tags=['bomba', 'pillar', 'eliminacion', 'versus', 'vector'], **_P,
        cfg=dict(mode='patata', hud='bl', help='Quien lleva la bomba se la pasa a otro tocándolo. La mecha es secreta: nadie sabe cuándo estalla. No puedes devolverla al instante a quien te la dio. A da un acelerón y B una finta lateral. El último superviviente gana.'),
        pad=dict(d='8', a='Acelerón', b='Finta'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'Patata Explosiva es el pilla-pilla con cuenta atrás que nadie ve. Al empezar la ronda una bomba de dibujos animados cae sobre la cabeza de un jugador al azar y su única salida es tocar a otro para pasársela. La mecha chisporrotea, el tic-tac suena, pero el tiempo que queda es secreto: puede estallar a los ocho segundos o aguantar casi el doble.',
            'Cuando revienta, el que la lleva queda fuera entre una nube de humo y los demás salen despedidos por la onda. Después aparece una bomba nueva y la persecución vuelve a empezar hasta que solo queda uno. Quien tiene la bomba corre un poco más rápido, así que la huida no es fácil, y los arbustos del parque sirven para dar vueltas y despistar. Una regla evita el pase y vuelta: durante un segundo no puedes devolver la bomba a quien te la acaba de dar.',
            'El botón A es un acelerón para cazar o escapar y el B una finta lateral para esquivar en el último momento. Juega en el móvil con el mando virtual, con teclado o en la tele con un móvil por invitado; la CPU corre, persigue y hace fintas con más picardía cuantas más partidas le ganes.',
        ],
        tips=['Con la bomba, busca al rival que esté arrinconado.', 'Sin la bomba, aléjate de las esquinas y rodea los arbustos.', 'La finta funciona mejor en el último segundo, cuando el otro ya ha gastado su acelerón.'],
    ),
    dict(
        title='Coge la Corona', genre='party', tags=['corona', 'placaje', 'robar', 'versus', 'vector'], **_P,
        cfg=dict(mode='corona', hud='bl', help='Coge la corona del centro y aguántala: cada segundo con ella cuenta. Los demás te la roban con un placaje (A) o con un choque fuerte. Con corona vas un poco más lento. Rondas de 45 segundos.'),
        pad=dict(d='8', a='Placaje'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'En el salón del trono hay una corona dorada esperando sobre la alfombra roja, y en Coge la Corona el primero en tocarla se la pone y empieza a sumar tiempo. Suena sencillo hasta que te das cuenta de que los otros tres jugadores solo tienen un objetivo: arrebatártela. Gana la ronda quien más segundos la haya llevado en total, no quien la tenga al final.',
            'Robarla es cuestión de contacto. Un placaje con el botón A o un choque lo bastante fuerte hace que la corona salte a la cabeza del atacante, y el antiguo rey se queda aturdido medio segundo viendo estrellitas. Tras cada robo hay un instante de protección para que no cambie de manos a cada fotograma. El que lleva la corona corre algo más lento y su placaje es más flojo, así que debe usar las columnas del salón para esquivar a la jauría.',
            'Se controla con joystick y un solo botón, ideal para jugar con quien nunca ha cogido un mando: mando virtual en el móvil, flechas y espacio en el ordenador o un móvil por jugador en la tele. La CPU persigue, anticipa tus giros y te acorrala mejor cuanto más le ganas. Tres rondas de cuarenta y cinco segundos.',
        ],
        tips=['Con la corona, huye en círculos alrededor de una columna.', 'Para robar, ataca en ángulo en vez de por detrás: el rey no te verá venir.', 'Deja que otros peleen por la corona y entra cuando el ladrón esté aturdido.'],
    ),
    dict(
        title='Choque de Carritos', genre='party', tags=['coches-de-choque', 'globos', 'eliminacion', 'versus', 'vector'], **_P,
        cfg=dict(mode='carritos', hud='bl', help='Apunta con el joystick hacia donde quieres ir y tu carrito gira y acelera. Golpea a otro por detrás para pinchar uno de sus tres globos. A da turbo y B marcha atrás. Sin globos quedas fuera; gana el último con globos.'),
        pad=dict(d='8', a='Turbo', b='Atrás'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'Choque de Carritos recrea la atracción estrella de cualquier feria vista desde arriba: una pista metálica rodeada de goma a rayas, cuatro coches de choque con su pértiga soltando chispas y tres globos atados a la parte trasera de cada uno. Los golpes de frente solo sirven para rebotar; lo que cuenta es embestir a un rival por detrás, porque entonces uno de sus globos revienta y tú sumas un toque.',
            'El coche se conduce como uno de verdad pero sin complicaciones: apuntas con el joystick hacia donde quieres ir y el carrito gira hasta encararse y acelera. B mete la marcha atrás para salir de un atasco o para girar sobre ti mismo y proteger la trasera, y A da un turbo con recarga que convierte cualquier aproximación en un golpe letal. Cuando alguien se queda sin globos, su carrito sale de la pista dando vueltas.',
            'La ronda termina cuando solo queda un coche con globos o al cabo de un minuto, y entonces gana quien conserve más. Juega en el móvil con el mando virtual, con teclado o en la tele con cuatro móviles; los conductores de la CPU buscan tu trasera, esquivan cuando los persigues y mejoran con cada derrota. Tres rondas.',
        ],
        tips=['No persigas en línea recta a quien ya te está mirando: rodéalo.', 'Si alguien se te pega detrás, marcha atrás y gira: le enseñarás el parachoques.', 'Reserva el turbo para cuando tengas la trasera del rival a tiro.'],
    ),
    dict(
        title='Quita la Silla', genre='party', tags=['sillas', 'musica', 'eliminacion', 'versus', 'vector'], **_P,
        cfg=dict(mode='silla', hud='bl', help='Mientras suena la música, el suelo gira y las sillas están cerradas por una cuerda. Cuando la música para, corre a una silla libre: siéntate tocándola. Siempre falta una. A da un empujón. El último sentado gana.'),
        pad=dict(d='8', a='Empujón'), mp=(2, 4), players='2–4 jugadores (o tú contra 3 CPU)',
        desc=[
            'Quita la Silla es el juego de cumpleaños de toda la vida con un pequeño giro literal. En el centro de la pista hay un tocadiscos y a su alrededor tantas sillas como jugadores menos uno, protegidas por una cuerda mientras suena una musiquilla de verbena. El suelo de la sala gira como un tiovivo y arrastra a todos alrededor de las sillas, así que no puedes quedarte esperando junto a la que más te guste.',
            'Cuando la música se corta aparece un gran «¡ALTO!», la cuerda desaparece y empieza la carrera: el primero que toca una silla libre se sienta y ya está a salvo. Quien se queda de pie queda eliminado, se retira una silla y la música vuelve a sonar durante un tiempo que nadie conoce. Así, ronda tras ronda, hasta que solo queda un jugador sentado y se lleva la victoria.',
            'El botón A da un empujón para apartar a quien se cruce en tu camino hacia la última silla. En el móvil juegas con el mando virtual o arrastrando el dedo, en el ordenador con flechas y espacio, y en la tele cada invitado con su móvil. La CPU reacciona al corte de la música con reflejos creíbles que se afinan si le ganas.',
        ],
        tips=['Pégate a la cuerda mientras suena la música: tendrás menos camino que recorrer.', 'Elige la silla a la que llegas antes que nadie, no la más cercana.', 'Un empujón a tiempo en la última silla vale una ronda entera.'],
    ),
    dict(
        title='Glotones del Estanque', genre='arcade', tags=['comer', 'crecer', 'io', 'versus', 'vector'], **_P,
        cfg=dict(mode='glotones', hud='bl', help='Nada por el estanque comiendo bolitas y renacuajos para crecer. Si eres bastante más grande que otro pez, te lo puedes comer; si otro es más grande que tú, huye. A da un acelerón. Gana el más grande cuando acaba el tiempo.'),
        pad=dict(d='8', a='Acelerón'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Glotones del Estanque es una batalla de peces con hambre dentro de una charca redonda rodeada de nenúfares. Cada jugador empieza como un pececillo de su color y crece comiendo las bolitas de alga que flotan por el agua y los renacuajos que huyen nerviosos. Cuanto más comes, más grande te haces, y el tamaño es a la vez tu puntuación y tu arma.',
            'Cuando un pez es claramente más grande que otro, cerca de una quinta parte, puede tragárselo de un bocado y quedarse con buena parte de su tamaño. El que ha sido comido vuelve a salir pequeño en otro punto del estanque, con un par de segundos de protección para que no lo devoren nada más aparecer. Pero ser grande también cuesta: nadas más despacio y vas perdiendo algo de peso con el tiempo, así que un pez mediano y rápido siempre tiene opciones.',
            'Con el botón A das un acelerón para cazar o escapar a costa de un poco de tamaño. Se juega con el mando virtual o arrastrando en el móvil, con teclado o en la tele con un móvil por jugador, y la CPU sabe cuándo perseguir y cuándo huir. Dos rondas de cincuenta segundos y gana quien sume más puntos.',
        ],
        tips=['Los renacuajos valen cuatro bolitas: persíguelos al principio.', 'Si un rival es solo un poco más pequeño, todavía no puedes comértelo: engorda antes.', 'Usa el acelerón para escapar, no solo para cazar.'],
    ),
    dict(
        title='Perros Pastores', genre='party', tags=['pastoreo', 'ovejas', 'estrategia', 'versus', 'vector'], **_P,
        cfg=dict(mode='pastores', hud='bl', help='Eres un perro pastor. Las ovejas huyen de ti: colócate detrás y empújalas hasta el redil de tu color, en tu esquina. A ladra y las espanta de lejos; mantén B para tumbarte y que se calmen. Gana quien encierre más ovejas.'),
        pad=dict(d='8', a='Ladrar', b='Quieto'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'En Perros Pastores cada jugador es un perro con el pañuelo de su color y tiene un redil con una bandera en su esquina del prado. En el centro pasta un rebaño de catorce ovejas y la meta es meter en tu cercado más que nadie antes de que se acabe el tiempo. No se puede coger una oveja ni arrastrarla: solo acercarte para que huya en la dirección contraria.',
            'Por eso el juego va de colocarse bien. Hay que rodear al rebaño, ponerse al otro lado de la oveja y empujarla con cuidado hacia la puerta del redil, que es un hueco en la valla que mira al centro. Si te acercas demasiado deprisa la oveja sale disparada hacia cualquier sitio; si ladras con el botón A, las que estén cerca se asustan y corren lejos de ti, y si mantienes B el perro se tumba y el rebaño se calma. Una oveja que entra en un redil se queda allí para siempre.',
            'Los perros de la CPU también trabajan su rebaño y a veces te birlan una oveja que ya tenías encarrilada. Juega solo contra tres perros o en la tele con hasta cuatro móviles; en el ordenador, con flechas, espacio y X. Dos rondas de cincuenta y cinco segundos.',
        ],
        tips=['Rodea a la oveja por fuera; si pasas entre ella y tu redil, la alejarás.', 'Ladra cuando la oveja ya esté frente a la puerta, no antes.', 'Tumbarte con B frena el rebaño cuando se te escapa hacia otro redil.'],
    ),
]
