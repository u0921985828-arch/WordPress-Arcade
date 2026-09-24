"""Oleada 1 — motor `tablero` (recorrido con dados y fichas): parchís, parchís exprés y la oca."""
PAD = dict(d='h', a='Tirar')

GAMES = [
    dict(
        title='Parchís de la Plaza', genre='strategy-cards', tags=['parchis', 'dados', 'mesa', 'clasico', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='tablero', pad=PAD, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='parchis', help='Tira con A (o toca). Sales con un 5; elige ficha con ← → y mueve con A. Comer cuenta 20, llegar a meta 10, el 6 repite y con todas fuera cuenta 7. Dos fichas iguales forman barrera.'),
        desc=[
            'El parchís de toda la vida, el de las tardes de verano en la mesa de la terraza, con sus reglas completas y sin atajos. Cuatro fichas por jugador salen de casa con un 5, recorren las 68 casillas del tablero y suben por su pasillo de color hasta la meta, donde hay que entrar con la tirada exacta. Por el camino se come al rival que pisas fuera de los seguros y te cuentas 20; cada ficha que llega a meta regala 10 casillas más a otra.',
            'Aquí no falta nada: seguros con estrella y salidas protegidas, barreras de dos fichas del mismo color que nadie puede cruzar, obligación de abrir la barrera cuando sacas un 6, el 6 que repite tirada y que vale 7 cuando ya no te queda ninguna ficha en casa, y el temido tercer 6 seguido, que devuelve a casa la última ficha que moviste si todavía no estaba en el pasillo. Si en tu salida hay dos fichas y alguna es rival, al sacar ficha te comes la última que llegó.',
            'Juegas de 2 a 4 en la misma pantalla o en la tele con el móvil como mando: joystick para elegir ficha, A para tirar y mover. Las plazas vacías las ocupa una CPU que come cuando puede, se esconde en los seguros, huye de las fichas que la amenazan y levanta barreras; cada vez que le ganas, juega un poco mejor. En el móvil también puedes tocar la ficha directamente: el juego te propone siempre una jugada sensata y te marca el destino y a quién te comes.',
        ],
        tips=['Antes de salir a campo abierto, mira las fichas rivales que tienes detrás: a seis casillas o menos pueden comerte.', 'Una barrera justo delante de la salida de un rival le corta el paso varias tiradas; úsala cuando vaya por delante.', 'Guarda los 20 de premio para meter en el pasillo una ficha que esté en peligro.'],
    ),
    dict(
        title='Parchís Exprés', genre='strategy-cards', tags=['parchis', 'dados', 'mesa', 'rapido', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='tablero', pad=PAD, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='expres', help='Dos dados y dos fichas por jugador (una ya en la salida). Cada dado mueve una ficha; sales con un 5 o si los dados suman 5. Los dobles repiten; tres dobles seguidos devuelven a casa la última ficha movida.'),
        desc=[
            'Para cuando apetece un parchís pero no hay tarde entera por delante. En esta versión cada jugador lleva solo dos fichas y una de ellas empieza ya plantada en su salida, así que desde la primera tirada hay carrera. Se juega con dos dados a la vez: cada dado mueve una ficha, puedes repartirlos entre las dos o empujar la misma dos veces, y la partida completa se resuelve en unos cinco minutos.',
            'El resto de la esencia se mantiene: la ficha de casa sale con un 5 en cualquiera de los dados o con dos dados que sumen 5, los seguros protegen, dos fichas tuyas en la misma casilla forman barrera, comer da 20 casillas de premio y llegar a la meta da 10. Sacar dobles te deja repetir y te obliga a romper tu barrera si tienes una; al tercer doble seguido la última ficha que moviste vuelve a casa, salvo que ya estuviera en el pasillo de color.',
            'Con dos dados la decisión importa más de lo que parece: qué dado gastas primero, si te arriesgas a comer con uno y a ponerte a salvo con el otro, o si prefieres cerrar el paso al que viene detrás. Con el mando eliges la combinación de ficha y dado con el joystick y confirmas con A; en pantalla táctil tocas la ficha o el dado que quieras usar. Hasta cuatro personas en la tele y la CPU completa la mesa si falta gente.',
        ],
        tips=['Mueve primero el dado que te da la jugada peligrosa (comer o escapar); el otro suele encontrar sitio después.', 'Con tan pocas fichas, perder una por un triple doble duele: si ya has sacado dos dobles, adelanta la ficha que menos te importe.'],
    ),
    dict(
        title='La Oca Viajera', genre='strategy-cards', tags=['oca', 'dados', 'mesa', 'familia', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='tablero', pad=PAD, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='oca', help='Tira con A (o toca). De oca a oca y tiro porque me toca; puentes y dados también repiten. Posada 1 turno, cárcel 2, pozo hasta que otro caiga, laberinto a la 30 y la calavera a la 1. A la 63 se entra justo.'),
        desc=[
            'El juego de la oca de siempre en un tablero en espiral de 63 casillas dibujado a mano, con sus ocas, puentes, posada, pozo, laberinto, cárcel, dados y la temida calavera. Tiras el dado, tu peón avanza saltando casilla a casilla y cada casilla especial cuenta su historia: de oca a oca y tiro porque me toca, de puente a puente y tiro porque me lleva la corriente, de dado a dado y tiro porque me ha tocado.',
            'Las casillas malas se notan: en la posada de la 19 descansas un turno, en la cárcel de la 56 pasas dos, el pozo de la 31 no te suelta hasta que otro jugador caiga en él y te rescate, el laberinto de la 42 te devuelve a la 30 y la calavera de la 58, a un paso del final, te manda a la casilla 1. Para ganar hay que caer exactamente en el jardín de la oca, la 63; si te pasas, rebotas hacia atrás, y si el rebote cae en una oca retrocedes a la anterior.',
            'Es un juego de pura suerte pensado para jugar en familia: de 2 a 4 jugadores en la misma pantalla o en la tele, cada uno tirando con la A de su móvil, y la CPU ocupando las sillas libres. Las partidas duran pocos minutos, el tablero se lee bien desde el sofá y cada vuelco de fortuna tiene su animación, así que siempre hay alguien celebrando y alguien protestando.',
        ],
        tips=['No hay estrategia que valga con el dado, pero sí con la paciencia: cerca de la 63 los rebotes pueden llevarte a la calavera.', 'Si estás en el pozo, anima a los demás a correr: el primero que caiga en la 31 te deja salir.'],
    ),
]
