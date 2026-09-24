"""Oleada 1 — motor `baraja` (baraja española de 40 cartas dibujada por código): brisca, mus y chinchón."""
PAD = dict(d='8', a='Elegir', b='Confirmar', t=1)

GAMES = [
    dict(
        title='Brisca de Bar', genre='strategy-cards', tags=['brisca', 'baraja-espanola', 'cartas', 'bazas', 'parejas', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='baraja', pad=PAD, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='brisca', hud='tr', help='Elige carta con ← → y juega con A (o tócala). No hay que asistir. Valen As 11, Tres 10, Rey 4, Caballo 3 y Sota 2: gana la mano quien pase de 60 de 120. Regla opcional: el 7 de triunfo se cambia por la muestra si es alta y el 2 si es baja.'),
        desc=[
            'La brisca de toda la vida, la de la mesa del fondo del bar con el café y la partida de las cinco, con una baraja española de cuarenta cartas dibujada a mano: oros, copas, espadas y bastos, y una sota, un caballo y un rey con cara propia. Se reparten tres cartas, se levanta la muestra que marca el triunfo y cada baza se la lleva la carta más alta del palo que sale o el triunfo más alto. No hay obligación de asistir, así que cada carta es una decisión.',
            'Cuentan el As 11, el Tres 10, el Rey 4, el Caballo 3 y la Sota 2: ciento veinte puntos en la baraja y gana la mano quien pase de sesenta; a sesenta es empate. Se juega a dos o por parejas enfrentadas, a una, dos o tres manos ganadas. Como regla opcional de la casa, quien sale puede cambiar el 7 de triunfo por la muestra cuando es una figura, un Tres o el As, y el 2 cuando es un 4, 5 o 6, siempre que queden cartas en el mazo.',
            'Sin tele juegas tú en la silla de abajo con tu mano a la vista, tocando la carta o eligiendo con las flechas y la A, y la CPU completa la mesa. En la tele cada jugador ve su mano solo en su móvil y la elige desde allí; la pantalla grande enseña la mesa, los reversos y el recuento. La CPU carga puntos cuando su compañero va ganando la baza, guarda los triunfos gordos y mejora cada vez que la vences.',
        ],
        tips=['Echa las cartas blancas (4, 5, 6) cuando la baza no tiene puntos y guarda los Treses y Ases para cazar figuras.', 'Por parejas, si tu compañero gana la baza, cárgale puntos; si la va a perder, tira la carta más baja que tengas.', 'Cuenta los triunfos que han salido: al final del mazo, saber cuántos quedan decide la mano.'],
    ),
    dict(
        title='Mus de Peña', genre='strategy-cards', tags=['mus', 'baraja-espanola', 'cartas', 'envites', 'parejas', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='baraja', pad=PAD, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='mus', hud='tr', help='Mus por parejas con 8 reyes (el 3 vale rey y el 2 as). Pide mus o corta; al descartar marca cartas y confirma con B. Lances: grande, chica, pares y juego (o punto). En cada lance: paso, envido, subir, quiero, no quiero u órdago. Partida a 40 piedras o corta a 20. Sin dinero.'),
        desc=[
            'El mus de peña, el de los domingos por la tarde con la baraja sobada y el tanteador de garbanzos, con sus reglas de siempre y la modalidad de ocho reyes: los treses cuentan como reyes y los doses como ases. Dos parejas sentadas en cruz, cuatro cartas por cabeza y una ronda de mus en la que todos deben pedir descarte para cambiar cartas; en cuanto alguien corta, se juega. Como regla de la casa, tras cuatro descartes seguidos el mus se corta solo.',
            'Se habla por lances: grande, chica, pares y juego, o punto si nadie llega a treinta y una. En cada uno puedes pasar, envidar dos piedras o cinco, subir el envite, querer, no querer o soltar el órdago que se juega la partida entera. Los pares se declaran antes de hablar (par, medias o duples) y el juego va de la treinta y una, la mejor, a la treinta y tres. Al final se descubren las cartas y se cuentan los tantos lance a lance. La partida va a cuarenta piedras o, en la versión corta, a veinte. Aquí solo se juegan piedras, nunca dinero.',
            'Sin tele juegas tú con la CPU de compañera: tu pareja habla con coherencia, tiene en cuenta lo que tú envidas y, si activas las señas simplificadas, te enseña con una etiqueta qué lleva (duples, treinta y una, dos reyes, ciego…). En la tele cada jugador ve sus cuatro cartas y los botones de lance en su móvil, y la pantalla grande solo muestra reversos, bocadillos y el tanteo.',
        ],
        tips=['Con dos reyes y juego de 31 no cortes el mus a la ligera: un descarte puede darte duples.', 'Escucha a tu compañero: si envida a grande, no le quites el lance con un órdago sin cartas.', 'Un farol de vez en cuando funciona, pero la CPU recuerda tus victorias y cada vez quiere más envites.'],
    ),
    dict(
        title='Chinchón Casero', genre='strategy-cards', tags=['chinchon', 'baraja-espanola', 'cartas', 'combinaciones', 'rummy', 'vector'],
        orient='auto', aspect='fill', inputs='TKMG', engine='baraja', pad=PAD, mp=(1, 4), players='1–4 jugadores',
        cfg=dict(mode='chinchon', hud='tr', help='Roba del mazo o del descarte y tira una carta. Liga escaleras del mismo palo (el 7 va con la sota) y tríos o cuartetos. Cierra con 3 puntos sueltos o menos; las figuras valen 10. Todo ligado resta 10 y el chinchón (escalera de 7) gana la partida. A 100 puntos quedas eliminado.'),
        desc=[
            'El chinchón de las sobremesas largas, el que se juega en casa de los abuelos con la baraja de cuarenta cartas y una libreta para apuntar. Cada jugador recibe siete cartas y en su turno roba una, del mazo o de la carta vista del descarte, y tira otra. El objetivo es ligar la mano: escaleras de tres o más cartas seguidas del mismo palo, donde el siete enlaza con la sota, y tríos o cuartetos de cartas del mismo número.',
            'Puedes cerrar cuando las cartas que te quedan sueltas suman tres puntos o menos; las figuras valen diez y el resto su número. Cerrar con todo ligado te resta diez puntos, y si logras una escalera de siete cartas del mismo palo has hecho chinchón y ganas la partida de golpe. Al cerrar, los demás pueden colocar sus cartas sueltas en tus jugadas antes de sumarse lo que les sobre. Quien pasa de cien puntos queda eliminado y gana el último en pie. No se usan comodines, y si el mazo se agota tres veces la mano se anula.',
            'De dos a cuatro jugadores: sin tele juegas tú con tu mano a la vista, tocando las cartas o moviéndote con las flechas, y la CPU ocupa el resto de sillas. En la tele cada jugador roba y descarta desde su móvil, donde ve sus cartas ordenadas y marcadas cuando ya están ligadas. Hay partida corta a cincuenta puntos para cuando hay prisa.',
        ],
        tips=['Tira pronto las figuras sueltas: diez puntos en la mano pesan mucho si otro cierra antes.', 'Fíjate en lo que recogen los demás del descarte y no les sirvas la carta que les falta.', 'A veces compensa cerrar con dos o tres puntos en vez de esperar al menos diez: cada ronda da una oportunidad al rival.'],
    ),
]
