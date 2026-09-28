"""Oleada 4 — triángulos numerados (triominós, marca blanca; motor `triangulos`)."""

PAD_T = dict(d='h', a='Poner', b='Cambiar', t=1)

GAMES = [
    dict(title='Triángulos Numerados', genre='strategy-cards',
         tags=['triomino','domino','numeros','mesa','multijugador','vector'],
         orient='auto', aspect='fill', inputs='TKMG', engine='triangulos', pad=PAD_T,
         mp=(1, 4), players='1–4 jugadores',
         cfg=dict(mode='trio', help='Cada ficha es un triángulo con tres números. Elige una ficha y colócala en un hueco marcado: los dos números del lado que toca deben coincidir. Sumas los números de la ficha, más 40 por puente, 50 por hexágono y 10 por triple. Si no puedes jugar, roba (−5) o pasa (−10). Gana quien se queda sin fichas.'),
         desc=[
             'Triángulos Numerados es nuestra versión del clásico de fichas triangulares: 56 piezas, cada una con tres números del 0 al 5 en sus esquinas, y una mesa que va creciendo en todas direcciones formando un mosaico. Colocar una ficha exige que los dos números del lado que toca coincidan con los del vecino, así que cada turno es un pequeño problema de encaje: no basta con tener el número, hay que tenerlo en el orden correcto y en el sitio correcto.',
             'Puntúas la suma de los tres números de la ficha que pones, pero lo que decide las partidas son las jugadas grandes. Un puente, cuando tu ficha encaja a la vez con dos fichas ya puestas, vale cuarenta puntos. Cerrar un hexágono completo, seis triángulos alrededor de un mismo vértice, vale cincuenta. Los triples suman diez extra y el triple de ceros, cuarenta. Por eso conviene mirar el mosaico entero antes de soltar la primera ficha que encaje: casi siempre hay una colocación que vale el triple que la evidente.',
             'Si no puedes jugar robas del pozo, y cada robo cuesta cinco puntos; al tercero sin suerte pasas y pierdes diez. El primero que se queda sin fichas se lleva veinticinco puntos más todo lo que les sobre a los demás, que a su vez lo restan de su marcador. Se juega de uno a cuatro: en el modo tele cada jugador ve sus fichas en su propio móvil y coloca en la pantalla grande, así que nadie tiene que enseñar la mano. Tres niveles de dificultad cambian lo bien que ven el mosaico los rivales de la máquina.',
         ],
         tips=[
             'Antes de colocar, comprueba si la misma ficha hace puente en otro hueco: son cuarenta puntos de diferencia.',
             'Guarda una ficha con números repetidos: encaja en más sitios de los que parece.',
             'Cerrar un hexágono vale más que dos turnos normales; cuenta los huecos alrededor de cada vértice.',
         ]),
]
