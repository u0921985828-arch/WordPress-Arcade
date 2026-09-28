# -*- coding: utf-8 -*-
"""Oleada 5 — motor `pinball`: dos mesas completas de pinball con física propia.

Pinball del Sótano: mesa clásica de madera y neón (muelle, setas, banco de dianas, rampa larga,
carril de bola extra y multibola de tres bolas) con misiones encadenadas que suben el multiplicador.
Pinball Espacial: agujero negro que se traga la bola y la escupe, órbitas, imanes, jefe orbital al
que hay que derribar a impactos y misión final «asalto al núcleo», con final de verdad.

Física verificada en Node (zona pura <SIM> de src/eng/pinball.js): subpaso fijo de 1/300 s, tope de
velocidad de 1450 px/s (4,8 px por subpaso, menos que el radio de la bola) y 7200 lanzamientos con
cuatro estilos de flipper sin túneles, sin bolas atascadas y sin bolas que no lleguen a desaguar.
"""

PAD = dict(d='h', a='Muelle', b='Empujón', t=1)

GAMES = [
    dict(
        title='Pinball del Sótano', genre='arcade',
        tags=['pinball', 'flippers', 'fisica', 'multibola', 'misiones', 'vector'],
        orient='portrait', aspect='fill', inputs='TKMG', engine='pinball', pad=PAD, mp=(1, 4),
        players='1–4 jugadores (por turnos en la tele)',
        cfg=dict(mode='sotano', help='Izquierda y derecha mueven los flippers. Mantén pulsado el botón Muelle para tensar el lanzador y suéltalo para sacar la bola: cuanto más tenso, más arriba llega. El botón Empujón sacude la mesa para corregir un poco la trayectoria, pero tres empujones seguidos son falta y los flippers se bloquean hasta la siguiente bola. Tienes tres bolas (cuatro en fácil) y una misión activa en todo momento: calentar las setas, subir por la rampa, tumbar el banco de cuatro dianas y aguantar la multibola. Cada misión cumplida sube el multiplicador. Ilumina las letras K, U y B en los carriles de arriba y pasa por el carril EX para ganar una bola extra.'),
        desc=[
            'Pinball del Sótano es una mesa de pinball entera, con su física propia y sin atajos: la bola es un círculo de verdad que rebota contra segmentos, los flippers son palas que giran y transmiten el impulso del punto donde golpean, y el muelle se tensa y se suelta como el de una máquina real. Nada de trayectorias enlatadas ni de imanes invisibles que te devuelven la bola: si la mandas por el carril de salida, la pierdes, y si la recoges al vuelo con la punta del flipper, sale disparada hacia la rampa. La mesa es alta y estrecha, se lee de un vistazo en el móvil y llena la pantalla también en el ordenador y en la tele.',
            'Arriba están las setas, que pegan fuerte y encienden la mesa; a media altura, el banco de cuatro dianas que se van tumbando una a una y dan un buen pellizco cuando cae la última; a la derecha, la entrada de la rampa larga, que sube por todo el borde y devuelve la bola al carril de retorno del otro lado. Los parachoques laterales la mantienen viva cuando baja, y entre el flipper y la pared hay un carril de salida abierto: ahí es donde se pierden las partidas. El juego propone siempre una misión concreta, se ve en pantalla con su cuenta, y al cumplirla sube el multiplicador, de modo que la puntuación no crece por dar vueltas sino por hacer lo que toca.',
            'La cuarta misión es la multibola: tres bolas a la vez y diez golpes que valen el doble mientras dure el caos. Las letras K, U y B de los carriles de arriba encienden el carril de bola extra, que es la manera honrada de alargar una partida buena. Hay tres dificultades, que cambian la gravedad de la mesa y el número de bolas, y el récord se guarda por separado en cada una. En la tele se puede jugar de dos a cuatro por turnos, con la bola pasando de un jugador al siguiente y un podio al final, que es exactamente como se juega al pinball en un bar.',
        ],
        tips=['No golpees siempre: si dejas el flipper levantado, la bola se queda quieta encima y puedes apuntar con calma a la rampa.',
              'La rampa solo traga la bola si llega rápida y de frente; con un toque flojo rebota y se te vuelve encima.',
              'El empujón vale para salvar una bola perdida, pero llévate la cuenta: al tercero seguido te quedas sin flippers.'],
    ),
    dict(
        title='Pinball Espacial', genre='arcade',
        tags=['pinball', 'flippers', 'espacio', 'jefe', 'fisica', 'vector'],
        orient='portrait', aspect='fill', inputs='TKMG', engine='pinball', pad=PAD, mp=(1, 4),
        players='1–4 jugadores (por turnos en la tele)',
        cfg=dict(mode='espacio', help='Izquierda y derecha mueven los flippers. Mantén pulsado Muelle para tensar el lanzador y suéltalo para sacar la bola. Empujón sacude la mesa: tres seguidos son falta y pierdes los flippers hasta la siguiente bola. Las misiones van encadenadas: completa tres órbitas por los carriles laterales, cuela la bola tres veces en el agujero negro (te la devuelve disparada), derriba de cinco impactos al jefe que patrulla la parte de arriba y termina con el asalto al núcleo, la multibola final. Los imanes de los lados tiran de la bola mientras el jefe está en la mesa. Las letras O, R y B encienden el carril de bola extra.'),
        desc=[
            'Pinball Espacial usa la misma física que la mesa del sótano —subpaso fijo, colisión estable contra segmentos y flippers que transmiten su giro— y le añade lo que solo se puede hacer en el espacio. En el centro de la parte alta hay un agujero negro que se traga la bola, la retiene un segundo y la escupe disparada en una dirección cualquiera: entra sabiendo que sales sin saber por dónde. A los lados, dos imanes se encienden en el momento justo y curvan la trayectoria mientras la bola pasa cerca, lo suficiente para que una bajada limpia se convierta en una carrera hacia el carril de salida.',
            'Las misiones cuentan una historia con final. Primero hay que completar órbitas, pasando por los carriles de los laterales y por el de arriba. Después el agujero negro pide tres bolas. Luego aparece el jefe orbital, una nave que patrulla de lado a lado por encima de las setas y aguanta cinco impactos, con los imanes encendidos para estorbar. Y cuando cae, empieza el asalto al núcleo: tres bolas a la vez y ocho golpes que hay que meter antes de perderlas. Si lo consigues, la partida termina con el núcleo destruido, que es un final de verdad y no un marcador que sigue subiendo.',
            'Todo lo demás está donde debe: banco de dianas en diagonal, dos setas que pegan fuerte, rampa larga que devuelve por el otro lado, muelle con tensión variable y empujón de mesa con su falta. Tres dificultades cambian la gravedad y las bolas de la partida, y el récord se guarda en cada una por separado. En la tele juegan de dos a cuatro personas por turnos, cada una con sus tres bolas y sus misiones, y el podio final compara las puntuaciones. Para jugar solo, el asalto al núcleo es un reto largo y agradecido; en grupo, la mesa se convierte en una competición de bar.',
        ],
        tips=['El agujero negro escupe la bola hacia arriba en una dirección cualquiera: ten los dos flippers listos, no solo uno.',
              'Al jefe se le pega mejor desde el flipper izquierdo, aprovechando el rebote de la seta de la izquierda.',
              'Guarda las letras O, R y B para cuando empiece el asalto al núcleo: una bola extra ahí vale una partida entera.'],
    ),
]
