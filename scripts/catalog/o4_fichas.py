"""Oleada 4 — fichas de colores (rummy de fichas, marca blanca; motor `fichas`)."""

PAD_F = dict(d='h', a='Poner', b='Robar', t=1)

GAMES = [
    dict(title='Fichas de Colores', genre='strategy-cards',
         tags=['rummy','fichas','combinaciones','mesa','multijugador','modo-tele','vector'],
         orient='auto', aspect='fill', inputs='TKMG', engine='fichas', pad=PAD_F,
         mp=(1, 4), players='1–4 jugadores',
         cfg=dict(mode='rummy', help='Forma grupos (mismo número, colores distintos) y escaleras (mismo color, seguidas). Toca una ficha de tu mano y luego el sitio de la mesa (el hueco «+» crea una combinación nueva). La primera bajada debe sumar 30 o más solo con fichas de tu mano. Después puedes usar y recolocar las fichas que ya están en la mesa. Si no puedes, roba. Gana quien se queda sin fichas. En la tele, tu mano aparece solo en tu móvil: eliges la ficha ahí y la colocas en la mesa con el joystick.'),
         desc=[
             'Fichas de Colores es nuestra versión del clásico juego de fichas numeradas: 106 piezas, cuatro colores, números del 1 al 13 por duplicado y dos comodines con carita. Te reparten catorce fichas y tienes un objetivo muy simple de enunciar y muy difícil de cumplir: quedarte sin ninguna. Para soltarlas hay que formar combinaciones válidas, y solo hay dos tipos: grupos de tres o cuatro fichas del mismo número con todos los colores distintos, y escaleras de tres o más fichas del mismo color con números consecutivos.',
             'La primera vez que bajas a la mesa tienes que sumar treinta puntos o más contando solo fichas de tu propia mano, sin tocar nada de lo que ya hay puesto. Es la barrera que marca el ritmo de la partida: hasta que la cruzas vas acumulando, y a partir de ahí se abre el juego de verdad, porque puedes añadir fichas a las combinaciones de los demás y, sobre todo, deshacer y recolocar lo que está en la mesa con tal de que al terminar tu turno todo vuelva a ser válido. Partir una escalera larga en dos, robar el extremo de un grupo, colar un comodín donde nadie lo esperaba: ahí está la chispa.',
             'En la tele podéis jugar hasta cuatro: cada mano aparece solo en el móvil de su dueño, eliges la ficha tocándola y la colocas en la mesa moviendo el joystick entre los huecos donde encaja. Las plazas que falten las cubre la máquina. Juegas contra tres rivales de la máquina que analizan su mano completa cada turno, buscan la bajada mínima, encadenan colocaciones y recolocan la mesa igual que tú. Si nadie se queda sin fichas antes de agotar el pozo, gana quien menos puntos tenga en la mano, contando cada comodín como treinta. Tienes botón de deshacer para probar ideas sin miedo, las combinaciones inválidas se marcan en rojo mientras las montas y el botón de Listo solo se enciende cuando la mesa entera es legal. Tres niveles de dificultad cambian lo lista y lo rápida que juega la máquina.',
         ],
         tips=[
             'Guarda un comodín para completar una escalera larga: vale más como pieza que como puntos.',
             'No bajes en cuanto llegues a treinta si con una ficha más puedes partir una escalera de la mesa.',
             'Cuando te queden pocas fichas, mira primero si alguna cabe en los extremos de lo ya puesto.',
         ]),
]
