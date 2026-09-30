"""Oleada 5 — motor `pictos`: dibujar y adivinar en el modo tele (2–4 jugadores, la CPU rellena)."""

PAD_D = dict(d='8', a='Pintar', b='Color', t=1)
PAD_M = dict(d='8', a='Elegir', b='Pasar', t=1)

GAMES = [
    dict(
        title='Dibuja y Adivina', genre='party', tags=['dibujar', 'adivinar', 'fiesta', 'palabras', 'pincel', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='pictos', pad=PAD_D, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='dibuja', help='Por turnos, a uno le toca dibujar: la palabra aparece solo en su móvil y nadie más la ve. En tu móvil sale un cuadro blanco: dibuja con el dedo dentro y el trazo aparece en la tele. Debajo tienes los seis colores, Deshacer y Borrar (con mando suelto, el joystick mueve el pincel y A pinta). Los demás reciben cuatro opciones en su móvil y eligen la que creen que estás dibujando: cuanto antes acierten, más puntos se llevan ellos y más te llevas tú por hacerte entender. Son rondas fijas y al final hay podio. En solitario dibujas tú y la máquina adivina, o dibuja ella con trazos guardados y adivinas tú.'),
        desc=[
            'Dibuja y Adivina es el juego de fiesta de toda la vida llevado a la tele sin necesidad de papel ni de lápices. Cada ronda le toca a uno, y la gracia está en que la palabra le llega solo a su móvil: el resto de la sala ve la hoja en blanco y cómo va apareciendo el dibujo trazo a trazo. Se pinta con el dedo en el móvil, como en una libreta: el cuadro blanco de tu pantalla es la hoja de la tele, con seis colores de la casa, deshacer y borrar a mano. No hace falta dibujar bien, más bien al revés: media diversión está en ver a alguien pelearse para que se entienda que eso es un elefante.',
            'Adivinar nunca obliga a escribir. Cada jugador recibe cuatro opciones en su propio móvil y toca la que cree correcta, así que no hay teclados ni palabras a medias, y el ritmo no se rompe. Los puntos premian la prisa: quien acierta pronto se lleva mucho más que quien acierta al final, y el que dibuja suma por cada persona que le entiende, de modo que dibujar claro renta tanto como adivinar rápido. Una ronda dura poco más de cuarenta segundos, con lo que una partida completa se resuelve en unos minutos y siempre apetece otra.',
            'Funciona con dos, tres o cuatro personas en la tele y la máquina cubre las plazas libres, así que también se puede jugar en solitario: unas rondas dibujas tú y la máquina intenta adivinar, y otras dibuja ella con trazos guardados para que te toque acertar. Si alguien deja el mando a medias, la máquina ocupa su sitio sin cortar la partida. Hay tres dificultades, que ajustan el tiempo de cada ronda y el ojo de los rivales, y el récord se guarda por separado en cada una.',
        ],
        tips=['Empieza por la silueta grande y deja los detalles para el final: casi siempre te adivinan antes de que termines.',
              'Cambiar de color separa las partes del dibujo mucho mejor que añadir más líneas encima.',
              'Si dudas entre dos opciones, espera un par de segundos: pierdes algunos puntos, pero fallar no da ninguno.'],
    ),
    dict(
        title='Mímica Exprés', genre='party', tags=['mimica', 'gestos', 'adivinar', 'fiesta', 'categorias', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='pictos', pad=PAD_M, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='mimica', help='Por turnos, a uno le toca actuar: la palabra aparece solo en su móvil y en la tele se ve nada más que la categoría (animal, oficio, acción o película) y la cuenta atrás. Hay que representarla sin hablar y sin señalar letras; si no puedes con una, pulsa Pasar y llega otra. Los demás eligen entre cuatro opciones en su móvil: el primero que acierta suma, quien actúa también suma por cada palabra sacada adelante y entra la siguiente. Fallar deja tu móvil bloqueado unos segundos. Si cuesta, la tele va soltando pistas: primero el número de letras y luego la inicial.'),
        desc=[
            'Mímica Exprés es la versión de bolsillo del juego de gestos: no hay dibujo ni palabras escritas, solo alguien de pie delante de la tele haciendo el ridículo con dignidad. La palabra le llega únicamente a su móvil y la pantalla enseña lo justo para que el resto sepa por dónde van los tiros: la categoría —animal, oficio, acción o película— y el tiempo que queda. Cada turno dura cuarenta segundos y no se juega a una sola palabra: en cuanto alguien acierta entra la siguiente, así que el turno se convierte en una carrera por encadenar el mayor número posible.',
            'Quien adivina elige entre cuatro opciones en su propio móvil, sin teclear nada, de modo que la partida no se detiene nunca. Acertar suma bastante y equivocarse deja el móvil bloqueado unos segundos, lo justo para que nadie gane a fuerza de tocar todo lo que aparece. El que actúa suma por cada palabra que consigue sacar adelante, y tiene un botón de pasar con una pequeña penalización para cuando le toca algo imposible. Si el turno se atasca, la tele echa una mano: a mitad enseña cuántas letras tiene la palabra y más tarde descubre la inicial.',
            'Se juega con dos, tres o cuatro personas en la tele, con la máquina cubriendo las plazas libres y sustituyendo a quien se marche a media partida. En solitario actúa siempre la máquina y tú adivinas, así que sirve igual de entrenamiento que como juego de sobremesa con gente delante. Tres dificultades ajustan el tiempo de cada turno y lo listos que son los rivales, y el récord se guarda por separado en cada una.',
        ],
        tips=['Empieza por la categoría y por el tamaño de la cosa: antes de mimar detalles, coloca a la gente en el sitio correcto.',
              'Como fallar bloquea el móvil unos segundos, en las primeras palabras conviene esperar a la segunda pista antes de tocar.',
              'Pasar cuesta muy poco: si una palabra se te atraganta, es mejor cambiarla que perder veinte segundos.'],
    ),
    dict(
        title='Cadena de Garabatos', genre='party', tags=['dibujar', 'cadena', 'telefono-escacharrado', 'fiesta', 'adivinar', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='pictos', pad=PAD_D, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='cadena', help='Un teléfono escacharrado dibujado, en tres rondas. En la primera dibujáis todos a la vez, cada uno su palabra secreta en su hoja de la tele (se dibuja con el dedo en el cuadro blanco del móvil, con colores, Deshacer, Borrar y Listo cuando termines). En la segunda se enseña un dibujo cada vez y el vecino de quien lo hizo elige entre cuatro opciones en su móvil. En la tercera se repasa la cadena entera en la tele: qué quiso dibujar cada uno y qué entendió el de al lado. Acertar da cien puntos a quien adivina y sesenta a quien dibujó.'),
        desc=[
            'Cadena de Garabatos coge el teléfono escacharrado de siempre y lo pasa al papel. En la primera ronda todos dibujan a la vez, cada uno en su propia hoja repartida en la tele y cada uno con una palabra que solo aparece en su móvil. Se ven los cuatro dibujos creciendo al mismo tiempo, lo cual ya es media diversión: sabes que el de al lado está haciendo algo rarísimo pero no tienes ni idea de qué. Cuando terminas pulsas Listo, y en cuanto están todos —o se acaba el tiempo— la ronda pasa sola.',
            'La segunda ronda es la del juicio. Los dibujos se enseñan de uno en uno, a pantalla completa, y le toca adivinar al vecino de quien lo dibujó, siempre eligiendo entre cuatro opciones en su móvil para que no haya que escribir nada. Los demás miran, opinan en voz alta y normalmente no ayudan lo más mínimo. Acertar da cien puntos a quien adivina y sesenta a quien dibujó, de modo que el que se hizo entender también cobra: aquí no gana el que dibuja bonito, gana el que dibuja claro.',
            'La tercera ronda es el remate: la tele repasa la cadena entera, dibujo a dibujo, enseñando qué palabra había de verdad y qué entendió el de al lado, con su marca de acierto o de fallo. Ahí es donde salen las risas y donde se descubre que aquel plátano era en realidad una luna. Se juega con dos, tres o cuatro personas, con la máquina cubriendo las plazas libres y sustituyendo a quien se vaya, y en solitario dibujas tú mientras la máquina rellena el resto de la cadena. Tres dificultades y récord guardado por separado en cada una.',
        ],
        tips=['En la primera ronda no te obsesiones con el detalle: con cuarenta y cinco segundos para todos, una silueta clara vale más que un cuadro a medias.',
              'Usa un segundo color para lo que de verdad identifica la cosa (las ruedas, las orejas, la llama del cohete): es lo que mira el que adivina.',
              'Cuando te toque adivinar, fíjate primero en el tamaño y en la postura del garabato; el detalle pequeño suele ser un accidente del pincel.'],
    ),
]
