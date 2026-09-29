# -*- coding: utf-8 -*-
"""Oleada 5 — motor `escape`: dos salas de escape de un jugador, con 10 habitaciones a mano.

Escape del Faro y Escape del Museo comparten motor y ocho tipos de puzle reutilizables
(combinación, cables, reloj, orden, interruptores, mosaico, chinchetas y espejos). Cada
habitación es un nivel de `k.levels(10)`, con inventario, examinar, combinar y pista con
cuenta atrás. El grafo de dependencias de las veinte habitaciones está verificado en Node:
todas se pueden terminar y ningún objeto se pierde por el camino.
"""

GAMES = [
    dict(
        title='Escape del Faro', genre='puzzle',
        tags=['escape', 'aventura', 'objetos', 'niveles', 'faro', 'vector'],
        orient='portrait', aspect='fill', inputs='TKM', engine='escape',
        pad=dict(d='8', a='Usar', b='Atrás', t=1), mp=None, players='1 jugador',
        cfg=dict(mode='faro', fluid=1, help='Toca lo que te llame la atención: casi todo se mira y algo se puede coger. Toca un objeto del inventario y luego dónde usarlo; dos seguidos se juntan. Con mando: cruceta, A usar, B volver.'),
        desc=[
            'Escape del Faro son diez habitaciones encadenadas dentro de un faro apagado, desde el felpudo de la entrada hasta la linterna de arriba del todo. Cada habitación es un problema cerrado con todo lo necesario a la vista: se mira, se coge, se junta y se usa. No hay prisa, no hay nada que te mate y no existen los callejones sin salida, porque los objetos nunca se gastan y todo lo que hace falta está en la propia sala. El ritmo lo pones tú: mirar los muebles, entender la pista que has encontrado y aplicarla en el aparato que le corresponde.',
            'Los puzles son de los de toda la vida, pero escritos a mano uno a uno. Hay un cuadro torcido que esconde una combinación de tres cifras, una caja de cables donde cada color va con su enchufe, el reloj del farero que hay que poner a la hora del naufragio, una radio que escupe un número en morse dibujado en pantalla, una despensa a oscuras que hay que alumbrar con una cerilla antes de tocar nada, un cuadro eléctrico de interruptores acoplados en el que cada llave mueve a sus vecinas, una escalera de peldaños numerados que se pisan en el orden correcto, una sala de mapas donde se clavan tres chinchetas en las coordenadas exactas, una vidriera rota que se completa con cristales de colores y, arriba del todo, la linterna del faro, con espejos giratorios que hay que orientar para que el haz salga al mar.',
            'Cada habitación es un nivel con su propio progreso guardado por dificultad, así que puedes dejarlo a medias y volver por donde ibas, o repetir una sala que te gustó. La dificultad no cambia los puzles, cambia la ayuda: en fácil el botón de pista se recarga en doce segundos, en normal en veintidós y en difícil en treinta y cuatro, y usar pistas resta puntos, de modo que quien quiera pensarlo solo tiene su recompensa. Se juega con el dedo, con el ratón o con el mando de la tele, porque el cursor se mueve con la cruceta y todos los sitios donde se puede tocar son los mismos. Al superar la décima habitación aparece la pantalla de juego completado: el faro vuelve a encenderse.',
        ],
        tips=['Cuando encuentres una pista, no la memorices: vuelve a tocarla cuando tengas el aparato delante, se abre en una tarjeta grande.',
              'Si un sitio te dice que necesitas algo, apúntate qué era y busca por los cajones y las cajas de la sala: siempre está dentro.',
              'Para usar un objeto, tócalo abajo y luego toca el sitio: si te has equivocado, vuelve a tocarlo abajo para soltarlo.'],
    ),
    dict(
        title='Escape del Museo', genre='puzzle',
        tags=['escape', 'aventura', 'museo', 'objetos', 'niveles', 'vector'],
        orient='portrait', aspect='fill', inputs='TKM', engine='escape',
        pad=dict(d='8', a='Usar', b='Atrás', t=1), mp=None, players='1 jugador',
        cfg=dict(mode='museo', fluid=1, help='Toca lo que veas: los muebles se examinan y algunos guardan objetos. Toca un objeto del inventario y luego dónde usarlo; dos seguidos se juntan. Con mando: cruceta, A usar, B volver.'),
        desc=[
            'Escape del Museo son diez salas seguidas, de la recepción a la cámara del diamante, con un robo tranquilo y sin alarmas que suenen a destiempo. Se empieza pasando una tarjeta por el lector y se termina apartando un láser con tres espejos para poder llevarse la piedra y salir por la puerta de incendios. Entre medias hay galerías de retratos, vitrinas cruzadas por haces rojos, un mosaico romano al que le faltan teselas, un archivo con una ficha rota en dos mitades, una sala de mapas con los tres robos marcados y un taller de restauración donde la caja de la alarma está atornillada y hace falta el destornillador de la mesa.',
            'Todo se resuelve mirando y usando, sin leer párrafos. Cada sala trae su pista dibujada: las placas con los años de los cuadros, el fragmento intacto del mosaico que hay que copiar tesela a tesela, la ficha que sale del archivador al juntar los dos medios papeles, el folleto con la hora del eclipse para el reloj astronómico y el cartel de salas que da las tres cifras de la cámara acorazada. Los ocho tipos de puzle se repiten con variaciones para que la segunda vez ya sepas cómo se manejan, y ninguno depende de la suerte ni del pulso: son todos de cabeza y se pueden resolver a la primera si te fijas.',
            'Cada sala es un nivel con progreso guardado por dificultad y puntuación que baja con el tiempo y con las pistas usadas, así que hay motivo para volver a una que te salió torpe. La ayuda está siempre a mano en el botón de pista, que se recarga solo: doce segundos en fácil, veintidós en normal, treinta y cuatro en difícil, y da primero una pista suave y después la solución concreta. Se juega igual con el dedo, con el ratón o con el mando, porque el cursor salta entre los mismos sitios que se tocan en la pantalla. La décima sala, la del diamante, cierra el juego con la pantalla de juego completado en cuanto sales con la piedra en el bolsillo.',
        ],
        tips=['La tarjeta, el destornillador y las teselas están siempre en un mueble de la misma sala: abre cajones, cajas y mesas antes de pelearte con el aparato.',
              'En los interruptores acoplados cada llave mueve también a sus vecinas; prueba a ir de un extremo al otro en vez de tocar al azar.',
              'En la sala del diamante, aparta primero el láser con los espejos y luego coge la piedra: si lo intentas antes, no te deja.'],
    ),
]
