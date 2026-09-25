"""Oleada 3 — agente «trivia3»: modos nuevos de trivia.js (mas, mapa, banderas, calculo)
y de palabras.js (abc, ana). Datos propios en games/_data/: masmenos-es.json, mapa-es.json,
banderas-es.json, rosco-es.json, anagramas-es.json."""

_T = dict(orient='auto', aspect='fill', inputs='TKMG', engine='trivia')
_P = dict(orient='auto', aspect='fill', inputs='TKMG', engine='palabras')

GAMES = [
    dict(
        title='Más o Menos', genre='trivia', tags=['comparar', 'cultura', 'ranking', 'versus', 'vector'], **_T,
        cfg=dict(mode='mas', hud='bl', help='Salen dos cosas y una pregunta del tipo «¿cuál tiene más habitantes?». Elige la de la izquierda o la de la derecha antes de que se acabe el tiempo: en el móvil toca la tarjeta, con el teclado usa ← → y Intro, y en la tele mueve el joystick del mando y pulsa A. Acertar suma 100 puntos más un extra por responder rápido; fallar no resta. Doce preguntas y podio final. Juegan de 1 a 4; las plazas libres las ocupa la CPU.'),
        pad=dict(d='h', a='Elegir'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Más o Menos no pregunta datos exactos, sino cuál de dos cosas gana. ¿Tiene más habitantes Zaragoza o Málaga? ¿Es más largo el Ebro o el Tajo? ¿Es más alto el Aneto o el Mulhacén? Basta con señalar una de las dos tarjetas, así que se puede jugar sin saber la cifra: casi siempre hay una intuición, un recuerdo de clase o una comparación que te salva. Por eso funciona igual de bien con niños y con adultos.',
            'Hay ocho bloques de preguntas: ciudades y su población, países y su superficie, montañas y su altitud, ríos y su longitud, velocidades de animales y vehículos, pesos, superficies y fechas históricas. Las parejas se sortean cada partida y nunca se enfrentan dos valores parecidos: siempre hay una diferencia clara, de modo que no existen respuestas discutibles. La dificultad sube sola: las primeras preguntas comparan cosas muy distintas y las últimas afinan mucho más, cuando ya te has acostumbrado al ritmo.',
            'Cada acierto vale cien puntos y regala hasta sesenta más si respondes deprisa, pero fallar no descuenta nada, así que nunca conviene quedarse callado. Tras cada pregunta se muestran los dos valores reales para que la partida enseñe algo, y al final hay un podio con los cuatro jugadores. En la tele cada uno responde desde su móvil sin ver lo que eligen los demás hasta que se destapan todas las respuestas a la vez; jugando solo compites contra rivales de la CPU que empiezan bastante despistados y afinan a medida que les vas ganando.',
        ],
        tips=['Si dudas, elige lo que te suene más famoso: casi siempre lo grande es lo conocido.',
              'Responder rápido da hasta 60 puntos extra; fallar no resta, así que nunca dejes pasar el tiempo.',
              'Fíjate en la unidad de la pregunta: no es lo mismo el río más largo que el más caudaloso.'],
    ),
    dict(
        title='Mapa Mudo de España', genre='trivia', tags=['geografia', 'mapa', 'espana', 'versus', 'vector'], **_T,
        cfg=dict(mode='mapa', hud='bl', help='Se dice una capital de provincia y tienes que señalar dónde está en el mapa de España, dibujado sin nombres. En el móvil arrastra el dedo y suelta donde creas; con el teclado mueve el cursor con las flechas y confirma con Intro o espacio; en la tele mueve el joystick y pulsa A. Cuanto más cerca del sitio real, más puntos: menos de 35 km da la puntuación máxima. Ocho rondas, con Canarias en su recuadro. De 1 a 4 jugadores.'),
        pad=dict(d='8', a='Fijar'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Mapa Mudo de España dibuja por código la silueta peninsular, las Baleares y un recuadro con las Canarias, además de los ocho ríos principales como única referencia. No hay nombres, ni fronteras de provincia, ni una sola etiqueta que ayude: solo la costa, los ríos y una rosa de los vientos. Entonces aparece un nombre arriba —Cáceres, Lugo, Teruel— y cada jugador tiene que clavar su chincheta donde crea que está.',
            'La puntuación premia la precisión sin castigar al que se despista: si te quedas a menos de treinta y cinco kilómetros del sitio real te llevas los cien puntos, y a partir de ahí la puntuación baja poco a poco hasta los ciento cincuenta kilómetros. Quien más se acerque de todos se lleva además una bonificación de veinte puntos por el mejor tiro de la ronda. Al destapar la respuesta aparece la chincheta correcta, una línea hasta tu marca y los kilómetros de error, que es la mejor manera de memorizar un mapa.',
            'Las cincuenta capitales de provincia están tomadas de sus coordenadas reales y la lista se ordena por dificultad: las primeras rondas caen en capitales muy conocidas y las últimas en las que todo el mundo confunde. En la tele cada móvil mueve su propia chincheta del color del jugador y nadie ve dónde apunta el resto hasta que se destapan todas; jugando solo te enfrentas a una CPU que comete errores de cientos de kilómetros al principio y que va afinando conforme le ganas partidas.',
        ],
        tips=['Localiza primero el río: el Ebro, el Duero y el Guadalquivir te sitúan media España.',
              'Ante la duda, tira al interior: casi todas las capitales que cuestan están lejos de la costa.',
              'No busques la provincia entera, solo la ciudad: la puntuación mide kilómetros, no territorio.'],
    ),
    dict(
        title='Banderas del Mundo', genre='trivia', tags=['banderas', 'paises', 'geografia', 'versus', 'vector'], **_T,
        cfg=dict(mode='banderas', hud='bl', help='Se dibuja una bandera y aparecen cuatro países: elige el correcto. En el móvil toca la opción, con el teclado usa las flechas o las teclas 1 a 4 y confirma con Intro, y en la tele mueve el joystick y pulsa A. Acertar da 100 puntos más un extra por rapidez; fallar no resta. Diez banderas por partida, de fáciles a difíciles, y podio final. De 1 a 4 jugadores, con CPU en las plazas libres.'),
        pad=dict(d='8', a='Elegir'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Banderas del Mundo enseña una bandera grande, limpia y con su asta, y pregunta de qué país es entre cuatro opciones. Las banderas no son imágenes descargadas: están dibujadas por código a partir de una descripción de franjas, cruces, discos, estrellas y símbolos, con las proporciones y los colores oficiales de cada una, de modo que se ven nítidas en cualquier pantalla y no cambian con el tamaño.',
            'El repertorio recorre los cinco continentes y evita a propósito las banderas que se confunden entre sí cuando falta un detalle diminuto, así que cada pregunta tiene una única respuesta correcta y sin discusión. Las tres primeras rondas son de banderas que reconoce cualquiera, las del medio piden algo de atención a los colores y al orden de las franjas, y las últimas son de las que solo sabe quien se ha fijado alguna vez: el disco y la media luna, las estrellas colocadas de una manera concreta, los escudos y los emblemas.',
            'La partida son diez banderas seguidas con un reloj generoso. Cada acierto vale cien puntos y hasta cuarenta más si contestas rápido; equivocarse no descuenta, así que siempre merece la pena arriesgar. Al destapar la respuesta se ve el nombre correcto junto a la bandera, que es como de verdad se aprenden. En la tele cada jugador contesta desde su móvil y las respuestas se destapan a la vez; en solitario compites contra una CPU que empieza fallando bastante y que sube de nivel con cada partida que le ganas.',
        ],
        tips=['Mira el orden de los colores, no solo cuáles son: muchas banderas parecidas solo se diferencian en eso.',
              'Si aparece una media luna o una estrella concreta, suele señalar directamente a una región del mundo.',
              'Descarta primero las dos opciones más raras: casi siempre quedan dos candidatas y una es la buena.'],
    ),
    dict(
        title='Cálculo Veloz', genre='trivia', tags=['calculo', 'mental', 'numeros', 'versus', 'vector'], **_T,
        cfg=dict(mode='calculo', hud='bl', help='Sale una operación y cuatro resultados: elige el bueno cuanto antes. En el móvil toca la opción, con el teclado usa las flechas o las teclas 1 a 4 y confirma con Intro, y en la tele mueve el joystick y pulsa A. Acertar suma 100 puntos y hasta 60 más por rapidez; fallar no resta. Doce operaciones que empiezan con sumas de una cifra y terminan en varias operaciones encadenadas. De 1 a 4 jugadores.'),
        pad=dict(d='8', a='Elegir'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Cálculo Veloz es una prueba de cabeza rápida: aparece una operación en el centro de la pantalla y cuatro resultados posibles debajo. No hay que escribir nada ni acordarse de ningún método, solo señalar el número correcto antes que los demás. Las operaciones se generan al vuelo, así que no hay dos partidas iguales y nadie puede aprenderse las respuestas.',
            'La progresión está pensada para que cualquiera empiece cómodo. Las primeras cuentas son sumas y restas de una cifra que se resuelven de un vistazo; después llegan las tablas de multiplicar, las restas que obligan a llevarse una y las divisiones exactas; y en el tramo final hay operaciones encadenadas con paréntesis, porcentajes sencillos y dobles y mitades. Los resultados falsos no son números al azar: son los errores típicos —el que se olvida de llevarse una, el que confunde el orden, el que se pasa por uno—, de modo que mirar por encima no basta.',
            'Cada acierto vale cien puntos y regala hasta sesenta más según lo deprisa que contestes, que es donde se decide la partida entre gente que sabe hacer las cuentas. Fallar no descuenta, así que siempre conviene decidirse. Se juega solo contra la CPU, que al principio se equivoca a menudo y se vuelve más rápida y certera conforme le ganas, o en la tele con hasta cuatro móviles, contestando todos a la vez y destapando las respuestas juntas. Doce operaciones y podio final.',
        ],
        tips=['Mira primero la última cifra del resultado: muchas veces descarta tres opciones de golpe.',
              'En las multiplicaciones grandes, redondea y ajusta: 19 × 7 es 20 × 7 menos 7.',
              'La rapidez da hasta 60 puntos por pregunta, así que una respuesta buena y tardía vale menos que dos rápidas.'],
    ),
    dict(
        title='Abecedario Veloz', genre='trivia', tags=['palabras', 'rosco', 'definiciones', 'versus', 'vector'], **_P,
        cfg=dict(mode='abc', hud='bl', help='Un rosco de letras de la A a la Z: por cada letra se lee una definición y aparecen cuatro palabras que empiezan por esa letra; elige la que encaja. En el móvil toca la opción, con el teclado usa las flechas y confirma con Intro, y en la tele mueve el joystick y pulsa A. Con B (o Intro sin elegir nada) pasas palabra y la letra vuelve al final. Cada acierto suma 100 puntos y el tiempo que sobra puntúa al final. En la tele se juega por turnos: si aciertas sigues tú, si fallas o pasas le toca al siguiente. Hay 150 segundos para todo el rosco. Se eligen las palabras entre cuatro opciones en lugar de escribirlas, para poder jugar con el mando.'),
        pad=dict(d='8', a='Elegir', b='Pasar'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Abecedario Veloz es el clásico rosco de definiciones adaptado para jugarse con el pulgar o con el mando de la tele. Las veintiséis letras se colocan en círculo y van encendiéndose una a una: se lee una definición —«ave nocturna de ojos grandes y vuelo silencioso»— y aparecen cuatro palabras que empiezan por esa letra. Solo una responde a la definición; las otras tres son palabras reales que empiezan igual y que están ahí para que no valga con leer la primera sílaba.',
            'La gracia del rosco es el reloj. Hay ciento cincuenta segundos para dar la vuelta entera y cada letra concede quince, así que quedarse pensando en una letra difícil sale caro. Para eso está el botón de pasar palabra: la letra se aparta y vuelve al final de la vuelta, cuando quizá ya la tengas más clara o simplemente prefieras arriesgar. Cada acierto suma cien puntos y el tiempo que sobra al terminar se convierte también en puntos, de modo que ganar el rosco entero y deprisa vale mucho más que arrastrarse hasta el último segundo.',
            'En la tele el rosco se juega por turnos, como en el concurso: mientras aciertas sigues tú, y en cuanto fallas o pasas le toca al siguiente jugador con la letra siguiente. La CPU ocupa las plazas libres, empieza equivocándose bastante y acierta más cuantas más partidas le ganas. Jugando solo, el marcador guarda tu mejor rosco, que es la marca que hay que batir. Nota: para que se pueda jugar con mando, las palabras se eligen entre cuatro opciones en lugar de escribirse letra a letra.',
        ],
        tips=['Pasa sin pensarlo en cuanto dudes: la letra vuelve al final y el tiempo no se recupera.',
              'Las opciones falsas empiezan igual pero suelen ser de otra familia: fíjate en si la definición pide un objeto, un animal o una acción.',
              'Terminar el rosco con tiempo de sobra vale muchos puntos: la velocidad puntúa tanto como los aciertos.'],
    ),
    dict(
        title='Anagramas', genre='trivia', tags=['palabras', 'anagramas', 'letras', 'versus', 'vector'], **_P,
        cfg=dict(mode='ana', hud='bl', help='Siete letras sueltas y muchas palabras escondidas dentro. Forma todas las que puedas: en el móvil toca las letras y pulsa Enviar (Borrar quita la última y Mezclar recoloca las fichas), con el teclado escribe directamente y pulsa Intro, y en la tele mueve el joystick hasta cada letra y pulsa A. Las palabras largas valen mucho más y la de siete letras, que siempre existe, es la joya. Dos tandas de 100 segundos y podio. De 1 a 4 jugadores, por turnos en el modo tele.'),
        pad=dict(d='8', a='Letra', b='Enviar'), mp=(1, 4), players='1–4 jugadores',
        desc=[
            'Anagramas reparte siete fichas de letras y esconde dentro de ellas decenas de palabras en español. Las hay de tres letras, que se ven enseguida, y las hay de seis y de siete, que aparecen cuando dejas de leer las fichas en el orden en que están. Siempre existe al menos una palabra que usa las siete, y encontrarla es lo que decide muchas partidas.',
            'La puntuación crece a lo bestia con la longitud: una palabra de tres letras vale cien puntos y una de siete, mil doscientos. Por eso no conviene dedicar toda la tanda a barrer palabras cortas, aunque tampoco está de más ir sumando mientras piensas. El botón de mezclar recoloca las fichas al azar, que es el mejor truco cuando te has quedado atascado mirando siempre la misma combinación: cambiando el orden aparecen sílabas que antes no veías. Las palabras encontradas se quedan en un panel lateral, así que no hay riesgo de repetirse.',
            'La partida son dos tandas de siete letras distintas, con cien segundos cada una. En la tele se juega por turnos cortos para que todos vean el tablero y nadie se quede fuera, y cada palabra encontrada lleva el color del jugador que la dijo, de modo que se ve al vuelo quién va ganando. La CPU rellena las plazas libres: al principio solo da con palabras cortas y va encontrando palabras cada vez más largas conforme le ganas. Todas las palabras salen de listas revisadas a mano, sin inventos ni formas raras.',
        ],
        tips=['Mezcla las fichas en cuanto te atasques: ver otro orden hace aparecer palabras nuevas.',
              'Busca terminaciones típicas (-ado, -era, -ante) y prueba qué letras quedan delante.',
              'Siempre hay una palabra con las siete letras; encontrarla vale más que diez palabras cortas.'],
    ),
]
