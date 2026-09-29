/* Motor `escape`: dos salas de escape de un jugador, 10 habitaciones escritas a mano cada una.
 *   CFG.mode='faro'  → Escape del Faro  (combinaciones, cables, reloj, morse y la linterna).
 *   CFG.mode='museo' → Escape del Museo (cuadros, láseres, mosaico, mapa y el diamante).
 *
 * Cada habitación es un nivel de k.levels(10): se juega sola, con su inventario, sus pistas y su
 * solución. Nada se genera al azar y ningún objeto se consume, así que no hay callejones sin
 * salida; la zona pura entre <LV> y </LV> exporta las tablas y checkGame() para comprobarlo desde
 * Node (grafo de dependencias por sala + validez de cada puzle).
 * Arte 100 % por código, §8 «ley de la pieza única»: un trazado por objeto, relleno y contorneado
 * una vez, separaciones por sombra propia. Escena horneada aparte y sprites cacheados a
 * Math.min(2, devicePixelRatio). Sin shadowBlur, sin filter y sin gradientes dentro del bucle. */

/* <LV> ------------------------------------------------------------------------------------------
 * Ficha de una sala: {n título, th tema, hs puntos, mix combinaciones, hint pistas}
 * Punto (hs): id · k dibujo · x,y,w,h (0..1 dentro del cuadro de la escena)
 *   ex   texto al examinar          ex2 texto cuando ya está resuelto/vacío
 *   give objeto que entrega al examinar (una vez)   gate objeto/bandera que hace falta para verlo
 *   cl   pista ilustrada {t:'txt'|'morse'|'ord'|'coord'|'pat'}   req objeto/bandera para abrirla
 *   puz  puzle {p:tipo, …, flag:bandera que enciende}           reqMsg aviso si falta el req
 *   need objeto que hay que USAR aquí → enciende nf (por defecto 'ok') y puede dar get
 *   exit 1 = por aquí se sale; se sale con la bandera 'ok' encendida
 * Tipos de puzle: code (combinación), wires (emparejar cables), clock (poner en hora),
 *   seq (pulsar en orden), toggle (interruptores acoplados), fill (mosaico), pins (chinchetas),
 *   aim (espejos que desvían el haz). */
var DIRX = [1, 0, -1, 0], DIRY = [0, 1, 0, -1];

var FARO = [
  { n: 'Antes de subir', th: 0, hint: ['Levanta el felpudo.', 'La llave abre la puerta.'], hs: [
    { id: 'felpudo', k: 'rug', x: .10, y: .80, w: .26, h: .10, ex: 'Un felpudo mojado. Debajo hay una llave.', ex2: 'Debajo ya no hay nada.', give: 'llave' },
    { id: 'percha', k: 'shelf', x: .04, y: .30, w: .15, h: .26, ex: 'Un chubasquero. Los bolsillos, vacíos.' },
    { id: 'cuadro', k: 'painting', x: .38, y: .20, w: .20, h: .18, ex: 'El faro en un día de sol.' },
    { id: 'puerta', k: 'door', x: .70, y: .24, w: .24, h: .58, ex: 'Cerrada con llave.', need: 'llave', ok: 'La llave gira.', exit: 1 }] },

  { n: 'El cuadro torcido', th: 0, hint: ['Mira detrás del cuadro.', 'Teclea 741 en el panel.'], hs: [
    { id: 'cuadro', k: 'painting', x: .36, y: .18, w: .24, h: .22, ex: 'Detrás del lienzo hay tres cifras.', cl: { t: 'txt', l: ['7  4  1'] } },
    { id: 'estante', k: 'shelf', x: .04, y: .34, w: .16, h: .28, ex: 'Libros de mareas, muy aburridos.' },
    { id: 'panel', k: 'panel', x: .62, y: .40, w: .14, h: .18, ex: 'Un teclado de tres cifras.', puz: { p: 'code', n: 3, sol: '741', flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .78, y: .24, w: .20, h: .58, ex: 'Se abre con el panel.', exit: 1 }] },

  { n: 'Cuarto de máquinas', th: 1, hint: ['En la caja de herramientas hay guantes.', 'Une cada cable con el enchufe de su color.'], hs: [
    { id: 'caja', k: 'toolbox', x: .08, y: .72, w: .20, h: .16, ex: 'Caja de herramientas: unos guantes.', ex2: 'Solo quedan tornillos.', give: 'guantes' },
    { id: 'motor', k: 'engine', x: .34, y: .52, w: .24, h: .32, ex: 'El generador está parado.' },
    { id: 'cables', k: 'wirebox', x: .60, y: .34, w: .22, h: .26, ex: 'Cuatro cables sueltos.', req: 'guantes', reqMsg: 'Están pelados. Hacen falta guantes.',
      puz: { p: 'wires', n: 4, right: [2, 0, 3, 1], flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .82, y: .24, w: .16, h: .58, ex: 'Sin corriente no abre.', exit: 1 }] },

  { n: 'El reloj del farero', th: 0, hint: ['El cajón guarda la manivela.', 'El diario dice la hora: 4:25.'], hs: [
    { id: 'cajon', k: 'drawer', x: .08, y: .62, w: .22, h: .18, ex: 'En el cajón hay una manivela.', ex2: 'Cajón vacío.', give: 'manivela' },
    { id: 'diario', k: 'book', x: .36, y: .64, w: .16, h: .12, ex: '«El barco pasa a las 4:25».', cl: { t: 'txt', l: ['4 : 25'] } },
    { id: 'reloj', k: 'clock', x: .58, y: .20, w: .24, h: .30, ex: 'Parado. Le falta la manivela.', req: 'manivela', reqMsg: 'Necesito la manivela.',
      puz: { p: 'clock', hh: 4, mm: 25, flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .84, y: .26, w: .14, h: .56, ex: 'Cerrada hasta la hora.', exit: 1 }] },

  { n: 'La radio', th: 1, hint: ['La radio necesita el fusible de la caja.', 'El morse dice 392.'], hs: [
    { id: 'cajon', k: 'crate', x: .06, y: .70, w: .20, h: .18, ex: 'Una caja con un fusible.', ex2: 'Caja vacía.', give: 'fusible' },
    { id: 'radio', k: 'radio', x: .34, y: .48, w: .24, h: .22, ex: 'Sin fusible no suena.', need: 'fusible', nf: 'radio', ok: '¡Suena! Repite un morse.',
      ex2: 'Repite el mismo morse.', cl: { t: 'morse', s: '392' }, req: 'radio', reqMsg: 'Está muda.' },
    { id: 'panel', k: 'panel', x: .66, y: .42, w: .14, h: .18, ex: 'Teclado de tres cifras.', puz: { p: 'code', n: 3, sol: '392', flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .82, y: .24, w: .16, h: .58, ex: 'Se abre con el código.', exit: 1 }] },

  { n: 'La despensa a oscuras', th: 1, hint: ['Enciende el farol con una cerilla.', 'Prueba los interruptores hasta apagar las cinco luces.'], hs: [
    { id: 'estante', k: 'shelf', x: .04, y: .38, w: .18, h: .30, ex: 'Latas y una caja de cerillas.', ex2: 'Solo latas.', give: 'cerilla' },
    { id: 'farol', k: 'lantern', x: .30, y: .40, w: .14, h: .20, ex: 'Un farol apagado.', need: 'cerilla', nf: 'luz', ok: 'El farol alumbra la pared.', ex2: 'Alumbra bien.' },
    { id: 'llaves', k: 'switchbox', x: .54, y: .36, w: .26, h: .24, ex: 'Cinco interruptores.', req: 'luz', reqMsg: 'Está demasiado oscuro.',
      puz: { p: 'toggle', n: 5, link: [[0, 1], [0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4]], start: [1, 0, 1, 1, 0], flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .84, y: .26, w: .14, h: .56, ex: 'Con las luces apagadas abrirá.', exit: 1 }] },

  { n: 'La escalera de caracol', th: 0, hint: ['La placa marca el orden: 3 1 5 2 4.', 'Toca las campanas en ese orden.'], hs: [
    { id: 'placa', k: 'sign', x: .06, y: .34, w: .20, h: .16, ex: 'Una placa grabada.', cl: { t: 'ord', l: ['3', '1', '5', '2', '4'] } },
    { id: 'cubo', k: 'crate', x: .10, y: .74, w: .16, h: .14, ex: 'Un cubo con agua de lluvia.' },
    { id: 'campanas', k: 'bells', x: .36, y: .30, w: .44, h: .26, ex: 'Cinco campanas numeradas.',
      puz: { p: 'seq', n: 5, order: [2, 0, 4, 1, 3], flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .84, y: .26, w: .14, h: .56, ex: 'La escalera sigue arriba.', exit: 1 }] },

  { n: 'La sala de mapas', th: 0, mix: [['nota', 'lupa', '#leido']],
    hint: ['Junta la nota con la lupa para leerla.', 'Clava en B2, D1 y C4.'], hs: [
    { id: 'escritorio', k: 'desk', x: .06, y: .60, w: .24, h: .24, ex: 'Una nota con letra diminuta.', ex2: 'Nada más.', give: 'nota' },
    { id: 'estante', k: 'shelf', x: .34, y: .30, w: .16, h: .26, ex: 'Una lupa entre los libros.', ex2: 'Solo libros.', give: 'lupa' },
    { id: 'cajon', k: 'drawer', x: .06, y: .34, w: .18, h: .16, ex: 'Un puñado de chinchetas.', ex2: 'Cajón vacío.', give: 'chinchetas' },
    { id: 'carta', k: 'sign', x: .54, y: .18, w: .16, h: .14, ex: 'La nota leída: B2, D1, C4.', req: 'leido', reqMsg: 'La letra es minúscula.', cl: { t: 'coord', l: ['B2', 'D1', 'C4'] } },
    { id: 'mapa', k: 'map', x: .50, y: .38, w: .30, h: .28, ex: 'Una carta náutica con agujeros.', req: 'chinchetas', reqMsg: 'Sin chinchetas no puedo marcar.',
      puz: { p: 'pins', w: 5, h: 4, sol: [[1, 1], [3, 0], [2, 3]], flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .86, y: .26, w: .12, h: .56, ex: 'Se abre al marcar las boyas.', exit: 1 }] },

  { n: 'Los cristales de la linterna', th: 2, hint: ['Coge los cristales de la caja.', 'Copia el dibujo del plano en la vidriera.'], hs: [
    { id: 'caja', k: 'crate', x: .06, y: .70, w: .20, h: .18, ex: 'Cristales de colores.', ex2: 'Caja vacía.', give: 'cristales' },
    { id: 'plano', k: 'sign', x: .06, y: .34, w: .20, h: .20, ex: 'El plano de la vidriera.',
      cl: { t: 'pat', w: 4, h: 3, c: [1, 2, 2, 1, 3, 4, 4, 3, 1, 2, 2, 1] } },
    { id: 'vidriera', k: 'mosaic', x: .38, y: .26, w: .40, h: .38, ex: 'Faltan cristales.', req: 'cristales', reqMsg: 'Me faltan los cristales.',
      puz: { p: 'fill', w: 4, h: 3, cols: 4, sol: [1, 2, 2, 1, 3, 4, 4, 3, 1, 2, 2, 1], fixed: [0, 3, 8, 11], flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .84, y: .26, w: .14, h: .56, ex: 'Arriba está la linterna.', exit: 1 }] },

  { n: 'La linterna del faro', th: 2, hint: ['La lente va en la lámpara.', 'Gira los espejos hasta que el haz salga por el ventanal.'], hs: [
    { id: 'estuche', k: 'chest', x: .06, y: .68, w: .20, h: .18, ex: 'Una lente de repuesto.', ex2: 'Estuche vacío.', give: 'lente' },
    { id: 'lampara', k: 'lamp', x: .30, y: .36, w: .18, h: .22, ex: 'La lámpara sin lente.', need: 'lente', nf: 'lente', ok: 'La lente encaja y el haz nace.', ex2: 'El haz sale de aquí.' },
    { id: 'espejos', k: 'mirrors', x: .52, y: .30, w: .28, h: .30, ex: 'Tres espejos giratorios.', req: 'lente', reqMsg: 'Sin haz no hay nada que girar.',
      puz: { p: 'aim', w: 5, h: 4, src: [0, 1, 0], goal: [4, 3], walls: [[4, 0], [1, 3]], mir: [[2, 1], [2, 3], [4, 1]], flag: 'ok' } },
    { id: 'ventanal', k: 'window', x: .82, y: .24, w: .16, h: .46, ex: 'El haz ya barre el mar.', exit: 1 }] },
];

var MUSEO = [
  { n: 'Recepción', th: 3, hint: ['Mira en el mostrador.', 'Pasa la tarjeta por el lector.'], hs: [
    { id: 'mostrador', k: 'desk', x: .08, y: .60, w: .28, h: .24, ex: 'Sobre el mostrador, una tarjeta.', ex2: 'Nada más.', give: 'tarjeta' },
    { id: 'planta', k: 'plant', x: .42, y: .52, w: .14, h: .30, ex: 'Una planta de plástico.' },
    { id: 'cartel', k: 'sign', x: .40, y: .20, w: .22, h: .16, ex: '«Museo cerrado por inventario».' },
    { id: 'lector', k: 'panel', x: .66, y: .44, w: .12, h: .16, ex: 'Un lector de tarjetas.', need: 'tarjeta', ok: 'Pita en verde.', ex2: 'Ya está en verde.' },
    { id: 'puerta', k: 'door', x: .80, y: .24, w: .18, h: .58, ex: 'Espera al lector.', exit: 1 }] },

  { n: 'Galería de retratos', th: 3, hint: ['Cada cuadro lleva su año en la placa.', 'Tócalos del más antiguo al más nuevo.'], hs: [
    { id: 'placas', k: 'sign', x: .06, y: .54, w: .22, h: .18, ex: 'Años: 1780, 1642, 1899, 1715.', cl: { t: 'ord', l: ['1642', '1715', '1780', '1899'] } },
    { id: 'cuadros', k: 'gallery', x: .34, y: .18, w: .48, h: .30, ex: 'Cuatro retratos con placa.',
      puz: { p: 'seq', n: 4, order: [1, 3, 0, 2], lbl: ['1780', '1642', '1899', '1715'], flag: 'ok' } },
    { id: 'banco', k: 'desk', x: .34, y: .70, w: .22, h: .12, ex: 'Un banco de madera.' },
    { id: 'puerta', k: 'door', x: .84, y: .26, w: .14, h: .56, ex: 'Se abre al ordenar los cuadros.', exit: 1 }] },

  { n: 'Sala de las vitrinas', th: 4, hint: ['El cuadro eléctrico manda sobre los láseres.', 'Apaga los seis haces.'], hs: [
    { id: 'vitrina', k: 'case', x: .32, y: .40, w: .22, h: .32, ex: 'Una vitrina cruzada por láseres.' },
    { id: 'vitrina2', k: 'case', x: .58, y: .44, w: .18, h: .28, ex: 'Otra vitrina, más láseres.' },
    { id: 'cuadro', k: 'switchbox', x: .06, y: .38, w: .22, h: .26, ex: 'Seis interruptores acoplados.',
      puz: { p: 'toggle', n: 6, link: [[0, 1], [0, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5]], start: [1, 1, 0, 0, 1, 1], flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .82, y: .26, w: .16, h: .56, ex: 'Con los láseres vivos no paso.', exit: 1 }] },

  { n: 'El mosaico romano', th: 4, hint: ['Las teselas están en la caja.', 'Copia el fragmento intacto, fila a fila.'], hs: [
    { id: 'caja', k: 'crate', x: .06, y: .70, w: .20, h: .18, ex: 'Teselas de tres colores.', ex2: 'Caja vacía.', give: 'pieza' },
    { id: 'fragmento', k: 'sign', x: .06, y: .30, w: .20, h: .24, ex: 'El fragmento intacto.',
      cl: { t: 'pat', w: 4, h: 4, c: [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1] } },
    { id: 'mosaico', k: 'mosaic', x: .36, y: .24, w: .42, h: .44, ex: 'Faltan teselas.', req: 'pieza', reqMsg: 'Necesito teselas.',
      puz: { p: 'fill', w: 4, h: 4, cols: 3, sol: [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1], fixed: [0, 1, 2, 3, 4, 8, 12], flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .84, y: .26, w: .14, h: .56, ex: 'Se abre con el mosaico entero.', exit: 1 }] },

  { n: 'El archivo', th: 4, mix: [['trozo1', 'trozo2', 'nota']],
    hint: ['Junta los dos trozos de papel.', 'La ficha completa dice 2058.'], hs: [
    { id: 'archivador', k: 'drawer', x: .06, y: .52, w: .22, h: .22, ex: 'Medio papel: «20…».', ex2: 'Cajón vacío.', give: 'trozo1' },
    { id: 'papelera', k: 'crate', x: .32, y: .70, w: .16, h: .16, ex: 'El otro medio: «…58».', ex2: 'Solo papeles.', give: 'trozo2' },
    { id: 'ficha', k: 'sign', x: .32, y: .32, w: .18, h: .18, ex: 'La ficha completa: 2058.', req: 'nota', reqMsg: 'Tengo el papel roto.', cl: { t: 'txt', l: ['2 0 5 8'] } },
    { id: 'panel', k: 'panel', x: .62, y: .40, w: .14, h: .20, ex: 'Teclado de cuatro cifras.', puz: { p: 'code', n: 4, sol: '2058', flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .82, y: .26, w: .16, h: .56, ex: 'Se abre con el código.', exit: 1 }] },

  { n: 'La sala de mapas', th: 3, hint: ['Las chinchetas están en el cajón.', 'Clava A3, E2 y F4.'], hs: [
    { id: 'cajon', k: 'drawer', x: .06, y: .56, w: .20, h: .20, ex: 'Chinchetas de colores.', ex2: 'Cajón vacío.', give: 'chinchetas' },
    { id: 'lista', k: 'sign', x: .06, y: .28, w: .20, h: .20, ex: 'Tres robos: A3, E2, F4.', cl: { t: 'coord', l: ['A3', 'E2', 'F4'] } },
    { id: 'mapa', k: 'map', x: .34, y: .24, w: .46, h: .40, ex: 'Un mapa con chinchetas.', req: 'chinchetas', reqMsg: 'Sin chinchetas no marco nada.',
      puz: { p: 'pins', w: 6, h: 4, sol: [[0, 2], [4, 1], [5, 3]], flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .84, y: .26, w: .14, h: .56, ex: 'Se abre al marcar los tres.', exit: 1 }] },

  { n: 'Taller de restauración', th: 4, hint: ['El destornillador está en la mesa.', 'Une cada cable con su enchufe del mismo color.'], hs: [
    { id: 'mesa', k: 'desk', x: .06, y: .58, w: .24, h: .24, ex: 'Un destornillador entre pinceles.', ex2: 'Solo pinceles.', give: 'destornillador' },
    { id: 'cuadro', k: 'painting', x: .32, y: .20, w: .22, h: .22, ex: 'Un lienzo a medio limpiar.' },
    { id: 'alarma', k: 'wirebox', x: .58, y: .34, w: .24, h: .28, ex: 'La caja de la alarma, atornillada.', req: 'destornillador', reqMsg: 'Está atornillada.',
      puz: { p: 'wires', n: 4, right: [3, 1, 0, 2], flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .84, y: .26, w: .14, h: .56, ex: 'La alarma sigue viva.', exit: 1 }] },

  { n: 'El reloj astronómico', th: 3, hint: ['El folleto dice la hora del eclipse.', 'Pon el reloj a las 10:40.'], hs: [
    { id: 'folleto', k: 'book', x: .08, y: .62, w: .18, h: .14, ex: '«Eclipse a las 10:40».', cl: { t: 'txt', l: ['10 : 40'] } },
    { id: 'columna', k: 'column', x: .28, y: .28, w: .12, h: .54, ex: 'Una columna de mármol.' },
    { id: 'reloj', k: 'clock', x: .48, y: .16, w: .30, h: .36, ex: 'Un reloj astronómico parado.',
      puz: { p: 'clock', hh: 10, mm: 40, flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .84, y: .26, w: .14, h: .56, ex: 'Se abre a la hora justa.', exit: 1 }] },

  { n: 'La cámara acorazada', th: 4, hint: ['El cartel de salas da las tres cifras.', 'Marca 614 en la rueda.'], hs: [
    { id: 'cartel', k: 'sign', x: .06, y: .32, w: .22, h: .20, ex: 'Salas 6, 1 y 4.', cl: { t: 'txt', l: ['6  1  4'] } },
    { id: 'palanca', k: 'toolbox', x: .08, y: .70, w: .18, h: .16, ex: 'Una palanca de hierro.', ex2: 'Caja vacía.', give: 'palanca' },
    { id: 'caja', k: 'safe', x: .38, y: .36, w: .26, h: .30, ex: 'Una caja fuerte de tres cifras.', puz: { p: 'code', n: 3, sol: '614', flag: 'ok' } },
    { id: 'puerta', k: 'door', x: .78, y: .26, w: .20, h: .56, ex: 'Se abre con la caja fuerte.', exit: 1 }] },

  { n: 'El diamante', th: 5, hint: ['Gira los espejos y desvía el láser.', 'Con el láser apartado, coge el diamante y sal.'], hs: [
    { id: 'pedestal', k: 'pedestal', x: .28, y: .48, w: .18, h: .34, ex: 'El diamante, sobre el pedestal.' },
    { id: 'diamante', k: 'diamond', x: .31, y: .38, w: .12, h: .12, ex: '¡El diamante es tuyo!', req: 'laser', reqMsg: 'El láser lo protege.', give: 'gema', ex2: 'Ya lo llevas.' },
    { id: 'espejos', k: 'mirrors', x: .52, y: .26, w: .30, h: .34, ex: 'Tres espejos giratorios.',
      puz: { p: 'aim', w: 5, h: 4, src: [0, 0, 1], goal: [4, 1], walls: [[2, 0], [4, 3]], mir: [[0, 3], [3, 3], [3, 1]], flag: 'laser' } },
    { id: 'salida', k: 'door', x: .84, y: .26, w: .14, h: .56, ex: 'La salida de incendios.', need: 'gema', ok: '¡Con el diamante, fuera!', exit: 1 }] },
];

/* ---------- simulación del haz (la usan el juego y el verificador) ----------
 * rot[i] = 0 espejo «/», 1 espejo «\». Devuelve {pts, win}: pts en coordenadas de casilla. */
function beam(p, rot) {
  var W = p.w, H = p.h, x = p.src[0], y = p.src[1], d = p.src[2], pts = [[x, y]], i, n, win = false;
  var wall = {}, mir = {};
  for (i = 0; i < (p.walls || []).length; i++) wall[p.walls[i][0] + ',' + p.walls[i][1]] = 1;
  for (i = 0; i < p.mir.length; i++) mir[p.mir[i][0] + ',' + p.mir[i][1]] = i;
  for (n = 0; n < 200; n++) {
    x += DIRX[d]; y += DIRY[d];
    if (x < 0 || y < 0 || x >= W || y >= H) break;
    if (wall[x + ',' + y]) break;
    pts.push([x, y]);
    if (x === p.goal[0] && y === p.goal[1]) { win = true; break; }
    var m = mir[x + ',' + y];
    if (m !== undefined) d = rot[m] ? (d === 0 ? 1 : d === 1 ? 0 : d === 2 ? 3 : 2) : (d === 0 ? 3 : d === 3 ? 0 : d === 1 ? 2 : 1);
  }
  return { pts: pts, win: win };
}
/* ¿existe una combinación de espejos que lleve el haz al sensor? (fuerza bruta, 2^espejos) */
function aimOK(p) {
  var m = p.mir.length, i, j, rot;
  for (i = 0; i < (1 << m); i++) {
    rot = []; for (j = 0; j < m; j++) rot.push((i >> j) & 1);
    if (beam(p, rot).win) return true;
  }
  return false;
}
/* ¿se pueden apagar todos los interruptores acoplados? (span sobre GF(2), 2^n estados) */
function toggleOK(p) {
  var n = p.n, masks = [], i, j, m, seen = {}, q = [0], s, st = 0;
  for (i = 0; i < n; i++) { m = 0; for (j = 0; j < p.link[i].length; j++) m ^= 1 << p.link[i][j]; masks.push(m); }
  for (i = 0; i < n; i++) if (p.start[i]) st |= 1 << i;
  seen[0] = 1;
  while (q.length) {
    s = q.pop();
    if (s === st) return true;
    for (i = 0; i < n; i++) { m = s ^ masks[i]; if (!seen[m]) { seen[m] = 1; q.push(m); } }
  }
  return false;
}
function puzOK(p) {
  var i;
  if (p.p === 'code') return /^[0-9]+$/.test(p.sol) && p.sol.length === p.n;
  if (p.p === 'wires') { var s = p.right.slice().sort(function (a, b) { return a - b; }); for (i = 0; i < p.n; i++) if (s[i] !== i) return false; return p.right.length === p.n; }
  if (p.p === 'clock') return p.hh >= 1 && p.hh <= 12 && p.mm % 5 === 0 && p.mm < 60;
  if (p.p === 'seq') { var o = p.order.slice().sort(function (a, b) { return a - b; }); for (i = 0; i < p.n; i++) if (o[i] !== i) return false; return p.order.length === p.n; }
  if (p.p === 'toggle') return p.link.length === p.n && p.start.length === p.n && toggleOK(p);
  if (p.p === 'fill') { if (p.sol.length !== p.w * p.h) return false; for (i = 0; i < p.sol.length; i++) if (p.sol[i] < 1 || p.sol[i] > p.cols) return false; for (i = 0; i < p.fixed.length; i++) if (p.fixed[i] < 0 || p.fixed[i] >= p.sol.length) return false; return p.fixed.length < p.sol.length; }
  if (p.p === 'pins') { var seen = {}; for (i = 0; i < p.sol.length; i++) { var c = p.sol[i]; if (c[0] < 0 || c[1] < 0 || c[0] >= p.w || c[1] >= p.h) return false; if (seen[c]) return false; seen[c] = 1; } return p.sol.length >= 1; }
  if (p.p === 'aim') return aimOK(p);
  return false;
}
/* Grafo de dependencias de una sala: punto fijo de objetos y banderas alcanzables.
 * Nada se consume, así que basta con comprobar que todo requisito acaba estando disponible
 * y que la bandera 'ok' (la que abre la salida) se enciende. */
function roomCheck(r) {
  var have = {}, i, j, h, ch = true, pass = 0;
  var got = function (n) { return !n || have[n] === 1; };
  while (ch && pass++ < 12) {
    ch = false;
    var add = function (n) { if (n && have[n] !== 1) { have[n] = 1; ch = true; } };
    for (i = 0; i < r.hs.length; i++) {
      h = r.hs[i];
      if (h.give && got(h.req)) add(h.give);
      if (h.puz && got(h.req)) add(h.puz.flag || 'ok');
      if (h.need && got(h.need)) { add(h.nf || 'ok'); add(h.get); }
    }
    for (j = 0; j < (r.mix || []).length; j++) {
      var m = r.mix[j];
      if (got(m[0]) && got(m[1])) add(m[2].charAt(0) === '#' ? m[2].slice(1) : m[2]);
    }
  }
  var err = [], items = {}, ex = 0;
  for (i = 0; i < r.hs.length; i++) {
    h = r.hs[i];
    if (h.give) items[h.give] = 1;
    if (h.exit) ex++;
    if (h.req && !got(h.req)) err.push(h.id + ': requisito inalcanzable «' + h.req + '»');
    if (h.need && !got(h.need)) err.push(h.id + ': objeto inalcanzable «' + h.need + '»');
    if (h.puz && !puzOK(h.puz)) err.push(h.id + ': puzle ' + h.puz.p + ' sin solución');
  }
  for (i = 0; i < r.hs.length; i++) { h = r.hs[i]; if (h.give && !got(h.give)) err.push(h.id + ': objeto perdido «' + h.give + '»'); }
  if (!got('ok')) err.push('la salida nunca se abre');
  if (ex !== 1) err.push('hay ' + ex + ' salidas (debe haber 1)');
  var ni = 0; for (var q in items) if (items[q]) ni++;
  if (ni > 6) err.push('más de 6 objetos (' + ni + ')');
  if (!r.hint || r.hint.length < 2) err.push('faltan pistas');
  return err;
}
function checkGame(rooms) {
  var out = [], i, e;
  for (i = 0; i < rooms.length; i++) { e = roomCheck(rooms[i]); if (e.length) out.push((i + 1) + ' ' + rooms[i].n + ': ' + e.join(' · ')); }
  if (rooms.length !== 10) out.push('no son 10 salas');
  return out;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { FARO: FARO, MUSEO: MUSEO, checkGame: checkGame, beam: beam };
/* </LV> --------------------------------------------------------------------------------------- */

/* ============================================================================================
 * Juego (necesita Kit y ART)
 * ========================================================================================== */
const MODE = (window.CFG && CFG.mode) === 'museo' ? 'museo' : 'faro';
const ROOMS = MODE === 'museo' ? MUSEO : FARO;
const OUT = ART.OUT, R2 = 6.2832;
const AC = MODE === 'museo' ? '#7fb6d8' : '#ffc94d';
const THEME = [
  { wall: '#3b4a63', floor: '#4a4030'},
  { wall: '#3a3f4e', floor: '#3b3b42' },
  { wall: '#2e3c5a', floor: '#454a60' },
  { wall: '#4a3f52', floor: '#6b5a44' },
  { wall: '#3e4650', floor: '#55503f' },
  { wall: '#2c2a44', floor: '#403850' }
];
const BG = MODE === 'museo' ? '#231f36' : '#1c2233';
const k = Kit({ w: 480, h: 660, title: CFG.title, bg: BG, fluid: { min: 0.42, max: 2.7, maxW: 1320, maxH: 940 } });
const c = k.ctx;

/* ---------- utilería de arte (§8: un trazado por objeto, relleno y contorno una sola vez) ---- */
const CDPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
function cvs(w, h) {
  const q = document.createElement('canvas');
  q.width = Math.max(1, Math.ceil(w * CDPR)); q.height = Math.max(1, Math.ceil(h * CDPR));
  const g = q.getContext('2d'); g.scale(CDPR, CDPR); g.lineJoin = 'round'; g.lineCap = 'round';
  return [q, g];
}
const SPR = {};
function spr(key, w, h, fn) {
  let q = SPR[key]; if (q) return q;
  const r = cvs(w, h); fn(r[1]); q = r[0]; q.iw = w; q.ih = h; SPR[key] = q; return q;
}
function uni(g, parts, ow) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = (ow || 1.5) * 2;
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.stroke(); }
  for (let i = 0; i < parts.length; i++) { g.beginPath(); parts[i][0](g); g.fillStyle = parts[i][1]; g.fill(); }
}
function inpath(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(g); g.restore(); }
function cel(g, path, base, dx, dy) {
  dx = dx == null ? 2 : dx; dy = dy == null ? 2 : dy;
  inpath(g, path, (h) => {
    const P = () => { h.beginPath(); path(h); h.fill(); };
    h.fillStyle = ART.dark(base, 0.26); P();
    h.translate(-dx, -dy); h.fillStyle = base; P();
    h.translate(-dx * 1.2, -dy * 1.2); h.fillStyle = ART.lite(base, 0.22); P();
  });
}
function seam(g, path, base, fn, f) { inpath(g, path, (h) => { h.fillStyle = ART.dark(base, f == null ? 0.18 : f); fn(h); }); }
function tint(g, path, col, fn) { inpath(g, path, (h) => { h.fillStyle = col; fn(h); }); }
function spec(g, x, y, rx, ry, rot, a) { g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.5 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, R2); g.fill(); }
function contact(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(12,8,26,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, R2); g.fill(); }
const rr = (g, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const rndf = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const FONT = (s) => '700 ' + s + 'px ui-rounded,"Trebuchet MS",system-ui,sans-serif';
function tw(s, size) { c.font = FONT(size); return c.measureText(s).width; }
function fitSize(s, max, size, min) { let f = size; while (f > (min || 9) && tw(s, f) > max) f--; return f; }
function clipTxt(s, max, size) {
  if (tw(s, size) <= max) return s;
  let t = s; while (t.length > 1 && tw(t + '…', size) > max) t = t.slice(0, -1);
  return t + '…';
}
const later = (fn, ms) => setTimeout(function f() { if (k.paused) setTimeout(f, 150); else fn(); }, ms);

/* ---------- estado ---------- */
const COLS = ['#ff6b6b', '#5b8cff', '#a8cf3f', '#ffc94d', '#c58bff', '#5ce1e6'];
const INAME = {
  llave: 'Llave', guantes: 'Guantes', manivela: 'Manivela', fusible: 'Fusible', cerilla: 'Cerilla',
  chinchetas: 'Chinchetas', cristales: 'Cristales', lente: 'Lente', nota: 'Nota', lupa: 'Lupa',
  tarjeta: 'Tarjeta', destornillador: 'Destornillador', pieza: 'Teselas', palanca: 'Palanca',
  trozo1: 'Medio papel', trozo2: 'Medio papel', gema: 'Diamante'
};
let room = null, inv = [], flags = {}, taken = {}, sel = -1, msg = '', msgT = 0, done = 0;
let puz = null, clue = null, T = [], cur = 0, kb = false, tRoom = 0, hintT = 0, hintN = 0, hintU = 0;
let W = 480, H = 660, TOP = 60, BOT = 78, SC = { x: 0, y: 0, w: 480, h: 480 }, BOX = { x: 0, y: 0, w: 480, h: 360 }, baked = null, bakeKey = '';
const HC = () => (k.dif === 0 ? 12 : k.dif === 1 ? 22 : 34);

function has(n) { if (!n) return true; if (flags[n]) return true; for (let i = 0; i < inv.length; i++) if (inv[i] === n) return true; return false; }
function okReq(h) { return !h.req || has(h.req); }
function addItem(n) { if (inv.length < 6 && inv.indexOf(n) < 0) { inv.push(n); k.sfx('coin'); } }
function say(t) { msg = t || ''; msgT = 4.5; }

function buildRoom() {
  room = ROOMS[Math.max(0, Math.min(ROOMS.length - 1, (k.lv || 1) - 1))];
  inv = []; flags = {}; taken = {}; sel = -1; msg = ''; msgT = 0; puz = null; clue = null;
  cur = 0; tRoom = 0; hintT = 0; hintN = 0; hintU = 0; done = 0;
  bakeKey = ''; layout();
  say('Toca lo que te llame la atención.');
}
function layout() {
  W = k.W; H = k.H;
  TOP = H < 430 ? 50 : 58;
  BOT = Math.round(Math.max(56, Math.min(84, H * 0.13)));
  SC.x = 6; SC.y = TOP + 2; SC.w = W - 12; SC.h = Math.max(120, H - TOP - BOT - 26);
  const RA = 1.35;
  BOX.w = Math.min(SC.w, SC.h * RA); BOX.h = BOX.w / RA;
  if (BOX.h > SC.h) { BOX.h = SC.h; BOX.w = BOX.h * RA; }
  BOX.x = SC.x + (SC.w - BOX.w) / 2; BOX.y = SC.y + (SC.h - BOX.h) / 2;
  bake();
}
k.onSize = () => { layout(); };

/* ---------- escena horneada (fondo de la sala, una sola vez por sala y tamaño) ---------- */
function bake() {
  if (!room) return;
  const fy = Math.round(Math.max(SC.h * 0.42, Math.min(SC.h * 0.9, (BOX.y - SC.y) + BOX.h * 0.80)));
  const key = room.n + '|' + Math.round(SC.w) + 'x' + Math.round(SC.h) + '|' + fy;
  if (key === bakeKey && baked) return;
  bakeKey = key;
  const th = THEME[room.th] || THEME[0], r = cvs(SC.w, SC.h), g = r[1], w = SC.w, h = SC.h;
  g.fillStyle = th.wall; g.fillRect(0, 0, w, h);
  g.fillStyle = ART.lite(th.wall, 0.12); g.fillRect(0, 0, w, fy * 0.5);
  g.fillStyle = ART.dark(th.wall, 0.18); g.fillRect(0, fy - 14, w, 14);
  g.fillStyle = th.floor; g.fillRect(0, fy, w, h - fy);
  g.fillStyle = ART.dark(th.floor, 0.2);
  for (let i = 0; i < 9; i++) { const x = (i / 9) * w * 1.4 - w * 0.2; g.fillRect(x, fy, 2, h - fy); }
  g.fillStyle = ART.lite(th.floor, 0.14); g.fillRect(0, fy, w, 3);
  /* grano determinista: manchas de humedad en la pared */
  for (let i = 0; i < 90; i++) {
    const x = rndf(i * 3.7) * w, y = rndf(i * 5.1) * fy, s = 4 + rndf(i * 2.3) * 16;
    g.fillStyle = 'rgba(0,0,0,' + (0.03 + rndf(i * 7.7) * 0.05).toFixed(3) + ')';
    g.beginPath(); g.ellipse(x, y, s, s * 0.6, 0, 0, R2); g.fill();
  }
  /* zócalo y viñeta */
  g.fillStyle = 'rgba(10,6,22,.28)'; g.fillRect(0, 0, w, 10); g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
  g.fillStyle = 'rgba(10,6,22,.22)'; g.fillRect(0, h - 10, w, 10);
  baked = r[0]; baked.iw = w; baked.ih = h;
}

/* ---------- muebles y trastos: un trazado por objeto, detalle recortado dentro ---------- */
const KIND = {
  door: { col: '#8a5a34', body: 'arch', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.fillRect(w * 0.12, h * 0.34, w * 0.76, h * 0.04); x.fillRect(w * 0.48, h * 0.1, w * 0.04, h * 0.86); }, 0.2);
    tint(g, P, '#ffd166', (x) => { x.beginPath(); x.arc(w * 0.78, h * 0.56, Math.max(2.5, w * 0.06), 0, R2); x.fill(); }); } },
  window: { col: '#6fa8dc', body: 'arch', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.fillRect(w * 0.46, h * 0.06, w * 0.08, h * 0.9); x.fillRect(w * 0.06, h * 0.44, w * 0.88, h * 0.07); }, 0.3);
    spec(g, w * 0.3, h * 0.24, w * 0.16, h * 0.1, -0.5, 0.35); } },
  rug: { col: '#b5485a', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { for (let i = 1; i < 4; i++) x.fillRect(w * 0.08, h * (0.18 + i * 0.2), w * 0.84, h * 0.07); }, 0.22); } },
  painting: { col: '#d8b45a', det: (g, w, h, P, b) => {
    tint(g, P, '#3f5f7a', (x) => { rr(x, w * 0.14, h * 0.14, w * 0.72, h * 0.72, 3); x.fill(); });
    tint(g, P, '#e6c88a', (x) => { x.beginPath(); x.moveTo(w * 0.2, h * 0.76); x.lineTo(w * 0.42, h * 0.34); x.lineTo(w * 0.62, h * 0.76); x.closePath(); x.fill(); }); } },
  gallery: { col: '#d8b45a', det: (g, w, h, P, b) => {
    tint(g, P, '#33506b', (x) => { for (let i = 0; i < 4; i++) { rr(x, w * (0.04 + i * 0.245), h * 0.12, w * 0.2, h * 0.6, 3); x.fill(); } });
    seam(g, P, b, (x) => { x.fillRect(0, h * 0.8, w, h * 0.05); }, 0.22); } },
  shelf: { col: '#7a5a3a', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { for (let i = 1; i < 3; i++) x.fillRect(w * 0.06, h * (i / 3), w * 0.88, h * 0.05); }, 0.24);
    tint(g, P, '#c96b5a', (x) => { for (let i = 0; i < 4; i++) x.fillRect(w * (0.12 + i * 0.16), h * 0.08, w * 0.1, h * 0.22); }); } },
  panel: { col: '#4b5a78', det: (g, w, h, P, b) => {
    tint(g, P, '#1d2436', (x) => { rr(x, w * 0.14, h * 0.1, w * 0.72, h * 0.22, 3); x.fill(); });
    tint(g, P, '#cfd8ee', (x) => { for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(w * (0.26 + (i % 3) * 0.24), h * (0.46 + ((i / 3) | 0) * 0.18), Math.max(1.6, w * 0.05), 0, R2); x.fill(); } }); } },
  toolbox: { col: '#d1642f', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.fillRect(w * 0.08, h * 0.42, w * 0.84, h * 0.06); }, 0.24);
    tint(g, P, '#4a4460', (x) => { rr(x, w * 0.34, h * 0.02, w * 0.32, h * 0.16, 4); x.fill(); }); } },
  wirebox: { col: '#3f4a6b', det: (g, w, h, P, b) => {
    for (let i = 0; i < 4; i++) tint(g, P, COLS[i], (x) => { x.fillRect(w * 0.1, h * (0.18 + i * 0.19), w * 0.8, h * 0.07); }); } },
  engine: { col: '#6b6486', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.fillRect(w * 0.1, h * 0.5, w * 0.8, h * 0.07); }, 0.22);
    tint(g, P, '#2a2340', (x) => { x.beginPath(); x.arc(w * 0.5, h * 0.3, Math.max(3, w * 0.16), 0, R2); x.fill(); }); } },
  drawer: { col: '#8a6a44', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.fillRect(w * 0.06, h * 0.48, w * 0.88, h * 0.06); }, 0.24);
    tint(g, P, '#e8d9b0', (x) => { for (let i = 0; i < 2; i++) { rr(x, w * 0.38, h * (0.24 + i * 0.5), w * 0.24, h * 0.08, 3); x.fill(); } }); } },
  book: { col: '#4a6ea8', det: (g, w, h, P, b) => {
    tint(g, P, '#f2ecd8', (x) => { x.fillRect(w * 0.5, h * 0.12, w * 0.42, h * 0.76); });
    seam(g, P, b, (x) => { x.fillRect(w * 0.46, h * 0.08, w * 0.06, h * 0.84); }, 0.26); } },
  clock: { col: '#c9a05a', body: 'round', det: (g, w, h, P, b) => {
    tint(g, P, '#f6efdc', (x) => { x.beginPath(); x.arc(w / 2, h / 2, Math.min(w, h) * 0.34, 0, R2); x.fill(); });
    tint(g, P, '#2a2340', (x) => { x.fillRect(w * 0.48, h * 0.24, w * 0.04, h * 0.28); x.fillRect(w * 0.5, h * 0.48, w * 0.2, h * 0.04); }); } },
  crate: { col: '#a97c4a', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.save(); x.translate(w / 2, h / 2); x.rotate(0.62); x.fillRect(-w * 0.6, -h * 0.03, w * 1.2, h * 0.06); x.rotate(-1.24); x.fillRect(-w * 0.6, -h * 0.03, w * 1.2, h * 0.06); x.restore(); }, 0.22); } },
  radio: { col: '#7a6a52', det: (g, w, h, P, b) => {
    tint(g, P, '#2e2a3d', (x) => { rr(x, w * 0.08, h * 0.16, w * 0.5, h * 0.62, 4); x.fill(); });
    tint(g, P, '#ffd166', (x) => { x.beginPath(); x.arc(w * 0.76, h * 0.42, Math.max(2.5, w * 0.1), 0, R2); x.fill(); }); } },
  switchbox: { col: '#5a6b52', det: (g, w, h, P, b) => {
    tint(g, P, '#1f2a22', (x) => { rr(x, w * 0.08, h * 0.16, w * 0.84, h * 0.64, 4); x.fill(); });
    tint(g, P, '#e8e2c4', (x) => { for (let i = 0; i < 5; i++) x.fillRect(w * (0.14 + i * 0.16), h * 0.26, w * 0.08, h * 0.42); }); } },
  lantern: { col: '#c9a05a', det: (g, w, h, P, b) => {
    tint(g, P, '#2a2340', (x) => { rr(x, w * 0.18, h * 0.26, w * 0.64, h * 0.46, 3); x.fill(); });
    tint(g, P, '#ffd166', (x) => { x.beginPath(); x.ellipse(w * 0.5, h * 0.5, w * 0.16, h * 0.14, 0, 0, R2); x.fill(); }); } },
  bells: { col: '#d4b25a', body: 'bells', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.fillRect(0, h * 0.1, w, h * 0.05); }, 0.24); } },
  desk: { col: '#7a5a3a', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.fillRect(0, h * 0.26, w, h * 0.06); x.fillRect(w * 0.1, h * 0.32, w * 0.06, h * 0.68); x.fillRect(w * 0.84, h * 0.32, w * 0.06, h * 0.68); }, 0.26); } },
  map: { col: '#d8cba0', det: (g, w, h, P, b) => {
    tint(g, P, '#8fb4a0', (x) => { x.beginPath(); x.moveTo(w * 0.16, h * 0.7); x.bezierCurveTo(w * 0.34, h * 0.3, w * 0.66, h * 0.82, w * 0.86, h * 0.34); x.lineTo(w * 0.86, h * 0.9); x.lineTo(w * 0.16, h * 0.9); x.closePath(); x.fill(); });
    seam(g, P, b, (x) => { for (let i = 1; i < 4; i++) x.fillRect(w * (i / 4), h * 0.06, 1.5, h * 0.88); }, 0.2); } },
  chest: { col: '#8a5a34', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.fillRect(0, h * 0.34, w, h * 0.07); }, 0.26);
    tint(g, P, '#ffd166', (x) => { rr(x, w * 0.42, h * 0.3, w * 0.16, h * 0.2, 3); x.fill(); }); } },
  mosaic: { col: '#6b8fa8', det: (g, w, h, P, b) => {
    for (let i = 0; i < 12; i++) tint(g, P, COLS[i % 4], (x) => { const cw = w / 4, ch = h / 3; x.fillRect((i % 4) * cw + 2, ((i / 4) | 0) * ch + 2, cw - 4, ch - 4); }); } },
  lamp: { col: '#ffd166', body: 'round', det: (g, w, h, P, b) => {
    tint(g, P, '#fff6d0', (x) => { x.beginPath(); x.arc(w * 0.44, h * 0.42, Math.min(w, h) * 0.2, 0, R2); x.fill(); });
    seam(g, P, b, (x) => { x.fillRect(0, h * 0.72, w, h * 0.08); }, 0.22); } },
  mirrors: { col: '#9aa2b8', det: (g, w, h, P, b) => {
    tint(g, P, '#dff1ff', (x) => { x.lineWidth = Math.max(2, w * 0.05); x.strokeStyle = '#dff1ff';
      for (let i = 0; i < 3; i++) { const cx = w * (0.22 + i * 0.28), cy = h * (0.3 + (i % 2) * 0.34), s = Math.min(w, h) * 0.14; x.beginPath(); x.moveTo(cx - s, cy + s); x.lineTo(cx + s, cy - s); x.stroke(); } }); } },
  case: { col: '#7fb6d8', det: (g, w, h, P, b) => {
    tint(g, P, 'rgba(255,255,255,.22)', (x) => { x.beginPath(); x.moveTo(w * 0.1, h * 0.9); x.lineTo(w * 0.5, h * 0.06); x.lineTo(w * 0.66, h * 0.06); x.lineTo(w * 0.26, h * 0.9); x.closePath(); x.fill(); });
    tint(g, P, '#ff6b6b', (x) => { for (let i = 0; i < 3; i++) x.fillRect(w * 0.06, h * (0.3 + i * 0.2), w * 0.88, 2); }); } },
  pedestal: { col: '#b8b0a0', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.fillRect(0, h * 0.14, w, h * 0.06); x.fillRect(0, h * 0.82, w, h * 0.06); }, 0.24); } },
  diamond: { col: '#9ee8ff', body: 'gem', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.fillRect(w * 0.48, h * 0.2, w * 0.05, h * 0.7); }, 0.18);
    spec(g, w * 0.36, h * 0.3, w * 0.12, h * 0.07, -0.6, 0.6); } },
  column: { col: '#cfc6b0', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { for (let i = 0; i < 4; i++) x.fillRect(w * (0.14 + i * 0.2), h * 0.1, w * 0.05, h * 0.8); x.fillRect(0, h * 0.08, w, h * 0.05); x.fillRect(0, h * 0.88, w, h * 0.05); }, 0.2); } },
  plant: { col: '#5aa05a', body: 'blob', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { x.fillRect(w * 0.46, h * 0.3, w * 0.08, h * 0.5); }, 0.24); } },
  sign: { col: '#e4dcc0', det: (g, w, h, P, b) => {
    seam(g, P, b, (x) => { for (let i = 0; i < 3; i++) x.fillRect(w * 0.14, h * (0.26 + i * 0.2), w * (0.72 - i * 0.14), h * 0.08); }, 0.22); } },
  safe: { col: '#5a5a6b', det: (g, w, h, P, b) => {
    tint(g, P, '#2c2a3c', (x) => { rr(x, w * 0.1, h * 0.12, w * 0.8, h * 0.76, 5); x.fill(); });
    tint(g, P, '#ffd166', (x) => { x.beginPath(); x.arc(w * 0.5, h * 0.5, Math.max(3, Math.min(w, h) * 0.18), 0, R2); x.fill(); }); } }
};
function bodyPath(kind, w, h) {
  const b = (KIND[kind] || KIND.crate).body;
  if (b === 'arch') return (g) => { const r = w * 0.5; g.moveTo(0, h); g.lineTo(0, r); g.arcTo(0, 0, w, 0, r); g.arcTo(w, 0, w, h, r); g.lineTo(w, h); g.closePath(); };
  if (b === 'round') return (g) => { g.beginPath(); g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, R2); };
  if (b === 'gem') return (g) => { g.moveTo(w * 0.5, 0); g.lineTo(w, h * 0.36); g.lineTo(w * 0.5, h); g.lineTo(0, h * 0.36); g.closePath(); };
  if (b === 'blob') return (g) => { g.moveTo(w * 0.5, 0); g.bezierCurveTo(w, h * 0.1, w * 0.92, h * 0.6, w * 0.7, h); g.lineTo(w * 0.3, h); g.bezierCurveTo(w * 0.08, h * 0.6, 0, h * 0.1, w * 0.5, 0); g.closePath(); };
  if (b === 'bells') return (g) => { for (let i = 0; i < 5; i++) { const cw = w / 5, cx = i * cw + cw / 2; g.moveTo(cx - cw * 0.34, h * 0.92); g.quadraticCurveTo(cx - cw * 0.34, h * 0.2, cx, h * 0.14); g.quadraticCurveTo(cx + cw * 0.34, h * 0.2, cx + cw * 0.34, h * 0.92); g.closePath(); } g.moveTo(0, h * 0.02); g.lineTo(w, h * 0.02); g.lineTo(w, h * 0.14); g.lineTo(0, h * 0.14); g.closePath(); };
  return (g) => rr(g, 0, 0, w, h, Math.min(w, h) * 0.12);
}
function objSpr(kind, w, h) {
  w = Math.max(10, Math.round(w)); h = Math.max(10, Math.round(h));
  return spr('o' + kind + w + 'x' + h, w + 6, h + 8, (g) => {
    const K = KIND[kind] || KIND.crate, b = K.col;
    g.translate(3, 2);
    const P = bodyPath(kind, w, h);
    contact(g, w / 2, h + 2.5, w * 0.44, Math.max(2, h * 0.05), 0.3);
    uni(g, [[P, b]], Math.max(1.1, Math.min(1.7, w * 0.03)));
    cel(g, P, b, Math.max(1.4, w * 0.02), Math.max(1.4, h * 0.02));
    K.det(g, w, h, P, b);
    spec(g, w * 0.26, h * 0.14, w * 0.16, h * 0.035, -0.25, 0.28);
  });
}
/* ---------- iconos del inventario ---------- */
function itemSpr(id, s) {
  s = Math.round(s);
  return spr('i' + id + s, s, s, (g) => {
    const u = s / 24, P = [];
    const put = (fn, col) => P.push([fn, col]);
    if (id === 'llave') { put((x) => { x.arc(8 * u, 9 * u, 5 * u, 0, R2); x.moveTo(11 * u, 10 * u); x.lineTo(21 * u, 17 * u); x.lineTo(21 * u, 21 * u); x.lineTo(17 * u, 21 * u); x.lineTo(17 * u, 18 * u); x.closePath(); }, '#ffd166'); }
    else if (id === 'guantes') { put((x) => { rr(x, 5 * u, 6 * u, 14 * u, 13 * u, 4 * u); x.moveTo(5 * u, 9 * u); x.lineTo(2 * u, 13 * u); x.lineTo(6 * u, 17 * u); x.closePath(); }, '#e2603f'); }
    else if (id === 'manivela') { put((x) => { x.moveTo(4 * u, 6 * u); x.lineTo(16 * u, 6 * u); x.lineTo(16 * u, 18 * u); x.lineTo(20 * u, 18 * u); x.lineTo(20 * u, 21 * u); x.lineTo(13 * u, 21 * u); x.lineTo(13 * u, 9 * u); x.lineTo(4 * u, 9 * u); x.closePath(); }, '#9aa2b8'); }
    else if (id === 'fusible') { put((x) => { rr(x, 4 * u, 9 * u, 16 * u, 7 * u, 3 * u); }, '#c9a05a'); }
    else if (id === 'cerilla') { put((x) => { rr(x, 5 * u, 15 * u, 15 * u, 3 * u, 1.5 * u); x.moveTo(6 * u, 16 * u); x.arc(5 * u, 15 * u, 3.2 * u, 0, R2); }, '#e8ddc0'); }
    else if (id === 'chinchetas') { put((x) => { for (let i = 0; i < 3; i++) { const cx = (6 + i * 6) * u, cy = (8 + (i % 2) * 6) * u; x.moveTo(cx + 3 * u, cy); x.arc(cx, cy, 3 * u, 0, R2); x.moveTo(cx - 0.8 * u, cy); x.lineTo(cx - 0.8 * u, cy + 6 * u); x.lineTo(cx + 0.8 * u, cy + 6 * u); x.lineTo(cx + 0.8 * u, cy); } }, '#ff6b6b'); }
    else if (id === 'cristales') { put((x) => { x.moveTo(12 * u, 3 * u); x.lineTo(20 * u, 11 * u); x.lineTo(12 * u, 21 * u); x.lineTo(4 * u, 11 * u); x.closePath(); }, '#5ce1e6'); }
    else if (id === 'lente') { put((x) => { x.ellipse(12 * u, 12 * u, 9 * u, 7 * u, 0, 0, R2); }, '#bfe8ff'); }
    else if (id === 'lupa') { put((x) => { x.arc(10 * u, 10 * u, 6.5 * u, 0, R2); x.moveTo(14 * u, 14 * u); x.lineTo(21 * u, 21 * u); x.lineTo(18 * u, 22 * u); x.lineTo(12.5 * u, 15 * u); x.closePath(); }, '#cfe6ff'); }
    else if (id === 'tarjeta') { put((x) => { rr(x, 3 * u, 7 * u, 18 * u, 11 * u, 2 * u); }, '#5b8cff'); }
    else if (id === 'destornillador') { put((x) => { rr(x, 4 * u, 4 * u, 5 * u, 8 * u, 2 * u); x.moveTo(5.5 * u, 11 * u); x.lineTo(7.5 * u, 11 * u); x.lineTo(19 * u, 20 * u); x.lineTo(17 * u, 22 * u); x.closePath(); }, '#ff9c4d'); }
    else if (id === 'pieza') { put((x) => { rr(x, 3 * u, 3 * u, 8 * u, 8 * u, 1.5 * u); rr(x, 13 * u, 6 * u, 8 * u, 8 * u, 1.5 * u); rr(x, 7 * u, 13 * u, 8 * u, 8 * u, 1.5 * u); }, '#a8cf3f'); }
    else if (id === 'palanca') { put((x) => { x.moveTo(5 * u, 20 * u); x.lineTo(17 * u, 5 * u); x.lineTo(20 * u, 7 * u); x.lineTo(10 * u, 20 * u); x.lineTo(13 * u, 22 * u); x.lineTo(6 * u, 22 * u); x.closePath(); }, '#8c97b8'); }
    else if (id === 'gema') { put((x) => { x.moveTo(12 * u, 3 * u); x.lineTo(21 * u, 10 * u); x.lineTo(12 * u, 21 * u); x.lineTo(3 * u, 10 * u); x.closePath(); }, '#9ee8ff'); }
    else { put((x) => { x.moveTo(5 * u, 3 * u); x.lineTo(19 * u, 3 * u); x.lineTo(19 * u, 21 * u); x.lineTo(5 * u, 21 * u); x.closePath(); }, '#efe6cc'); }
    contact(g, s / 2, s - 1.5, s * 0.3, s * 0.06, 0.26);
    uni(g, P, 1.3);
    for (let i = 0; i < P.length; i++) cel(g, P[i][0], P[i][1], 1.2, 1.2);
    spec(g, s * 0.34, s * 0.26, s * 0.12, s * 0.05, -0.4, 0.4);
  });
}

/* ---------- puzles: estado, objetivos táctiles y reglas ---------- */
const PTIT = { code: 'Combinación', wires: 'Empareja los cables', clock: 'Pon la hora', seq: 'Pulsa en orden',
  toggle: 'Apaga todo', fill: 'Completa el dibujo', pins: 'Marca los puntos', aim: 'Gira los espejos' };
function openPuz(h) {
  const d = h.puz, s = { h: h, d: d, t: 0 };
  if (d.p === 'code') s.cd = '';
  else if (d.p === 'wires') { s.link = []; for (let i = 0; i < d.n; i++) s.link.push(-1); s.pick = -1; }
  else if (d.p === 'clock') { s.hh = 12; s.mm = 0; }
  else if (d.p === 'seq') { s.pos = 0; s.bad = 0; }
  else if (d.p === 'toggle') s.s = d.start.slice();
  else if (d.p === 'fill') { s.g = []; for (let i = 0; i < d.w * d.h; i++) s.g.push(d.fixed.indexOf(i) >= 0 ? d.sol[i] : 0); }
  else if (d.p === 'pins') s.pins = [];
  else if (d.p === 'aim') { s.rot = []; for (let i = 0; i < d.mir.length; i++) s.rot.push(0); }
  puz = s; cur = 0; k.sfx('click');
}
function puzWin() {
  const d = puz.d;
  flags[d.flag || 'ok'] = 1; k.sfx('win'); k.confetti(null, 40);
  say(d.flag === 'laser' ? '¡El láser se aparta!' : '¡Clac! Algo se ha abierto.');
  later(() => { if (puz && puz.d === d) puz = null; }, 750);
}
function puzCheck() {
  const d = puz.d, s = puz;
  if (d.p === 'code') { if (s.cd.length === d.sol.length) { if (s.cd === d.sol) return puzWin(); k.sfx('hurt'); k.shake(5); s.cd = ''; say('No es esa.'); } return; }
  if (d.p === 'wires') { for (let i = 0; i < d.n; i++) if (s.link[i] < 0) return; return puzWin(); }
  if (d.p === 'clock') { if (s.hh === d.hh && s.mm === d.mm) return puzWin(); return; }
  if (d.p === 'seq') { if (s.pos >= d.n) return puzWin(); return; }
  if (d.p === 'toggle') { for (let i = 0; i < d.n; i++) if (s.s[i]) return; return puzWin(); }
  if (d.p === 'fill') { for (let i = 0; i < s.g.length; i++) if (s.g[i] !== d.sol[i]) return; return puzWin(); }
  if (d.p === 'pins') { if (s.pins.length !== d.sol.length) return; for (let i = 0; i < d.sol.length; i++) { let f = 0; for (let j = 0; j < s.pins.length; j++) if (s.pins[j][0] === d.sol[i][0] && s.pins[j][1] === d.sol[i][1]) f = 1; if (!f) return; } return puzWin(); }
  if (d.p === 'aim') { if (beam(d, s.rot).win) return puzWin(); return; }
}
function puzHit(v) {
  const d = puz.d, s = puz;
  if (d.p === 'code') {
    if (v === '<') { s.cd = s.cd.slice(0, -1); k.sfx('click'); return; }
    if (s.cd.length < d.sol.length) { s.cd += v; k.sfx('pop'); }
  } else if (d.p === 'wires') {
    if (v[0] === 'l') { s.pick = +v.slice(1); k.sfx('click'); return; }
    const j = +v.slice(1);
    if (s.pick < 0) { say('Elige primero un cable.'); return; }
    for (let i = 0; i < d.n; i++) if (s.link[i] === j) { k.sfx('hit'); return; }
    if (d.right[j] === s.pick) { s.link[s.pick] = j; s.pick = -1; k.sfx('pop'); }
    else { k.sfx('hurt'); k.shake(4); say('Ese no es su color.'); s.pick = -1; }
  } else if (d.p === 'clock') {
    if (v === 'h') s.hh = s.hh % 12 + 1; else s.mm = (s.mm + 5) % 60;
    k.sfx('click');
  } else if (d.p === 'seq') {
    if (+v === d.order[s.pos]) { s.pos++; k.sfx('pop'); }
    else { s.pos = 0; s.bad = 0.5; k.sfx('hurt'); k.shake(4); }
  } else if (d.p === 'toggle') {
    const L = d.link[+v]; for (let i = 0; i < L.length; i++) s.s[L[i]] ^= 1; k.sfx('click');
  } else if (d.p === 'fill') {
    const i = +v; if (d.fixed.indexOf(i) >= 0) { k.sfx('hit'); return; }
    s.g[i] = (s.g[i] + 1) % (d.cols + 1); k.sfx('pop');
  } else if (d.p === 'pins') {
    const p = v.split(',').map(Number);
    for (let i = 0; i < s.pins.length; i++) if (s.pins[i][0] === p[0] && s.pins[i][1] === p[1]) { s.pins.splice(i, 1); k.sfx('click'); return; }
    if (s.pins.length >= d.sol.length) { say('Ya no te quedan chinchetas.'); k.sfx('hit'); return; }
    s.pins.push(p); k.sfx('pop');
  } else if (d.p === 'aim') { s.rot[+v] ^= 1; k.sfx('click'); }
  puzCheck();
}

/* ---------- objetivos táctiles (valen para el dedo y para la cruceta) ---------- */
let PZR = { x: 0, y: 0, w: 0, h: 0 }, AR = { x: 0, y: 0, w: 0, h: 0 }, CELL = 0;
function pzBox() {
  const pw = Math.min(SC.w - 6, 430), ph = Math.min(SC.h - 6, 440);
  PZR = { x: Math.round(SC.x + (SC.w - pw) / 2), y: Math.round(SC.y + (SC.h - ph) / 2), w: Math.round(pw), h: Math.round(ph) };
  AR = { x: PZR.x + 12, y: PZR.y + 46, w: PZR.w - 24, h: PZR.h - 84 };
}
function gridRects(gw, gh, pad) {
  const s = Math.floor(Math.min((AR.w - 4) / gw, (AR.h - 4) / gh));
  CELL = s;
  const ox = AR.x + (AR.w - s * gw) / 2, oy = AR.y + (AR.h - s * gh) / 2, out = [];
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) out.push({ x: ox + x * s + (pad || 1), y: oy + y * s + (pad || 1), w: s - (pad || 1) * 2, h: s - (pad || 1) * 2, gx: x, gy: y });
  return out;
}
function buildT() {
  T = [];
  if (clue) { T.push({ t: 'close', x: PZR.x + PZR.w - 40, y: PZR.y + 6, w: 34, h: 30 }); }
  else if (puz) {
    pzBox();
    const d = puz.d;
    T.push({ t: 'close', x: PZR.x + PZR.w - 40, y: PZR.y + 6, w: 34, h: 30 });
    if (d.p === 'code') {
      const kw = Math.min(78, (AR.w - 20) / 3), kh = Math.min(52, (AR.h - 54) / 4);
      const ox = AR.x + (AR.w - kw * 3 - 16) / 2, oy = AR.y + 46;
      const lab = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '<', '0', ''];
      for (let i = 0; i < 12; i++) {
        if (!lab[i]) continue;
        T.push({ t: 'pz', v: lab[i], lab: lab[i] === '<' ? '←' : lab[i], x: ox + (i % 3) * (kw + 8), y: oy + ((i / 3) | 0) * (kh + 8), w: kw, h: kh });
      }
    } else if (d.p === 'wires') {
      const bh = Math.min(40, (AR.h - 10) / d.n), bw = Math.min(70, AR.w * 0.3);
      for (let i = 0; i < d.n; i++) {
        const y = AR.y + 6 + i * (bh + 6);
        T.push({ t: 'pz', v: 'l' + i, x: AR.x, y: y, w: bw, h: bh - 4, col: COLS[i] });
        T.push({ t: 'pz', v: 'r' + i, x: AR.x + AR.w - bw, y: y, w: bw, h: bh - 4, col: COLS[d.right[i]] });
      }
    } else if (d.p === 'clock') {
      const bw = Math.min(130, (AR.w - 16) / 2), by = AR.y + AR.h - 46;
      T.push({ t: 'pz', v: 'h', lab: '+ Hora', x: AR.x + (AR.w / 2 - bw - 6), y: by, w: bw, h: 42 });
      T.push({ t: 'pz', v: 'm', lab: '+ Minutos', x: AR.x + AR.w / 2 + 6, y: by, w: bw, h: 42 });
    } else if (d.p === 'seq') {
      const per = d.n > 3 && AR.w < 300 ? 2 : d.n, rows = Math.ceil(d.n / per);
      const bw = Math.min(110, (AR.w - (per - 1) * 8) / per), bh = Math.min(74, (AR.h - (rows - 1) * 8) / rows);
      const oy = AR.y + (AR.h - bh * rows - (rows - 1) * 8) / 2;
      for (let i = 0; i < d.n; i++) {
        const r = (i / per) | 0, cn = Math.min(per, d.n - r * per), ox = AR.x + (AR.w - bw * cn - (cn - 1) * 8) / 2;
        T.push({ t: 'pz', v: '' + i, lab: (d.lbl && d.lbl[i]) || '' + (i + 1), x: ox + (i % per) * (bw + 8), y: oy + r * (bh + 8), w: bw, h: bh });
      }
    } else if (d.p === 'toggle') {
      const per = Math.min(d.n, AR.w < 300 ? 3 : d.n), rows = Math.ceil(d.n / per);
      const bw = Math.min(84, (AR.w - (per - 1) * 8) / per), bh = Math.min(96, (AR.h - (rows - 1) * 10) / rows);
      const oy = AR.y + (AR.h - bh * rows - (rows - 1) * 10) / 2;
      for (let i = 0; i < d.n; i++) {
        const r = (i / per) | 0, cn = Math.min(per, d.n - r * per), ox = AR.x + (AR.w - bw * cn - (cn - 1) * 8) / 2;
        T.push({ t: 'pz', v: '' + i, x: ox + (i % per) * (bw + 8), y: oy + r * (bh + 10), w: bw, h: bh });
      }
    } else if (d.p === 'fill') {
      const g = gridRects(d.w, d.h, 2);
      for (let i = 0; i < g.length; i++) { g[i].t = 'pz'; g[i].v = '' + i; T.push(g[i]); }
    } else if (d.p === 'pins') {
      const g = gridRects(d.w, d.h, 1);
      for (let i = 0; i < g.length; i++) { g[i].t = 'pz'; g[i].v = g[i].gx + ',' + g[i].gy; T.push(g[i]); }
    } else if (d.p === 'aim') {
      const g = gridRects(d.w, d.h, 1);
      puz.grid = g;
      for (let i = 0; i < d.mir.length; i++) {
        const r = g[d.mir[i][1] * d.w + d.mir[i][0]];
        T.push({ t: 'pz', v: '' + i, x: r.x, y: r.y, w: r.w, h: r.h });
      }
    }
  } else {
    for (let i = 0; i < room.hs.length; i++) {
      const h = room.hs[i];
      T.push({ t: 'hs', i: i, x: BOX.x + h.x * BOX.w, y: BOX.y + h.y * BOX.h, w: h.w * BOX.w, h: h.h * BOX.h });
    }
  }
  /* barra inferior: 6 huecos de inventario + botón de pista (siempre disponibles) */
  const hw = Math.min(104, Math.max(64, W * 0.22)), y0 = H - BOT + 6, bh = BOT - 12;
  const ss = Math.min(bh, Math.floor((W - 20 - hw) / 6) - 4);
  for (let i = 0; i < 6; i++) T.push({ t: 'inv', i: i, x: 8 + i * (ss + 4), y: y0 + (bh - ss) / 2, w: ss, h: ss });
  T.push({ t: 'hint', x: W - hw - 8, y: y0, w: hw, h: bh });
  if (cur >= T.length) cur = 0;
}
function hitT(x, y) { for (let i = 0; i < T.length; i++) { const t = T[i]; if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return i; } return -1; }

/* ---------- acciones ---------- */
function winRoom() {
  done = 1; k.sfx('win');
  const sc = Math.max(60, 320 - Math.floor(tRoom) * 2 - hintU * 50);
  later(() => k.levelDone(sc, 'Sala ' + k.lv + ' · ' + Math.floor(tRoom) + ' s' + (hintU ? ' · ' + hintU + ' pista' + (hintU > 1 ? 's' : '') : ' · sin pistas')), 700);
}
function hotAct(i) {
  const h = room.hs[i];
  if (sel >= 0) {
    const it = inv[sel];
    if (h.need === it && !flags[h.nf || 'ok']) {
      flags[h.nf || 'ok'] = 1; if (h.get) addItem(h.get);
      say(h.ok || 'Encaja.'); k.sfx('win'); k.burst(BOX.x + (h.x + h.w / 2) * BOX.w, BOX.y + (h.y + h.h / 2) * BOX.h, AC, 14, 130);
      sel = -1; return;
    }
    say('Ahí no sirve.'); k.sfx('hit'); sel = -1; return;
  }
  if (h.exit) { if (flags.ok) return winRoom(); say(h.ex); k.sfx('hit'); return; }
  if (!okReq(h)) { say(h.reqMsg || h.ex); k.sfx('hit'); return; }
  if (h.give && !taken[h.give]) { taken[h.give] = 1; addItem(h.give); say(h.ex); return; }
  if (h.puz) { if (flags[h.puz.flag || 'ok']) { say('Ya está resuelto.'); return; } return openPuz(h); }
  if (h.cl) { clue = h.cl; pzBox(); k.sfx('click'); say(h.ex); return; }
  say((h.ex2 && (taken[h.give] || flags[h.nf || ''])) ? h.ex2 : h.ex);
}
function invAct(i) {
  if (i >= inv.length) { if (sel >= 0) sel = -1; return; }
  if (sel === i) { sel = -1; k.sfx('click'); return; }
  if (sel < 0) { sel = i; k.sfx('click'); say(INAME[inv[i]] || inv[i]); return; }
  const a = inv[sel], b = inv[i], mix = room.mix || [];
  for (let j = 0; j < mix.length; j++) {
    const m = mix[j];
    if ((m[0] === a && m[1] === b) || (m[0] === b && m[1] === a)) {
      if (m[2].charAt(0) === '#') flags[m[2].slice(1)] = 1; else addItem(m[2]);
      say('¡Encajan!'); k.sfx('win'); sel = -1; return;
    }
  }
  say('Estas dos no pegan.'); k.sfx('hit'); sel = i;
}
function hintAct() {
  if (hintT < HC()) { say('La pista aún se está pensando…'); k.sfx('hit'); return; }
  const l = room.hint; say('Pista: ' + l[Math.min(hintN, l.length - 1)]);
  hintN++; hintU++; hintT = 0; k.sfx('coin');
}
function act(t) {
  if (!t) return;
  if (t.t === 'close') { if (clue) clue = null; else puz = null; k.sfx('click'); return; }
  if (t.t === 'pz') return puzHit(t.v);
  if (t.t === 'hs') return hotAct(t.i);
  if (t.t === 'inv') return invAct(t.i);
  if (t.t === 'hint') return hintAct();
}
function moveCur(dx, dy) {
  kb = true;
  const a = T[cur]; if (!a) { cur = 0; return; }
  const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
  let best = -1, bd = 1e9;
  for (let i = 0; i < T.length; i++) {
    if (i === cur) continue;
    const t = T[i], x = t.x + t.w / 2, y = t.y + t.h / 2, ux = x - ax, uy = y - ay;
    if (dx && Math.sign(ux) !== dx) continue;
    if (dy && Math.sign(uy) !== dy) continue;
    const d = (dx ? Math.abs(ux) + Math.abs(uy) * 2.4 : Math.abs(uy) + Math.abs(ux) * 2.4);
    if (d < bd) { bd = d; best = i; }
  }
  if (best >= 0) { cur = best; k.sfx('click'); }
}
function update(dt) {
  if (!k.gate(reset)) return;
  layoutIfNeeded();
  buildT();
  if (!done) { tRoom += dt; if (hintT < HC()) hintT += dt; }
  if (msgT > 0) msgT -= dt;
  if (puz) puz.t += dt;
  if (puz && puz.bad > 0) puz.bad -= dt;
  if (k.ptr.hit) { const i = hitT(k.ptr.x, k.ptr.y); kb = false; if (i >= 0) { cur = i; act(T[i]); } else if (clue) { clue = null; k.sfx('click'); } }
  if (k.hit.has('left')) moveCur(-1, 0);
  if (k.hit.has('right')) moveCur(1, 0);
  if (k.hit.has('up')) moveCur(0, -1);
  if (k.hit.has('down')) moveCur(0, 1);
  if (k.hit.has('a')) { kb = true; act(T[cur]); }
  if (k.hit.has('b')) { if (clue) { clue = null; k.sfx('click'); } else if (puz) { puz = null; k.sfx('click'); } else if (sel >= 0) { sel = -1; k.sfx('click'); } }
}
function layoutIfNeeded() { if (W !== k.W || H !== k.H) layout(); }

/* ---------- dibujo ---------- */
const MOR = { 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
function panel(x, y, w, h, tit) {
  c.fillStyle = 'rgba(10,7,20,.72)'; c.beginPath(); rr(c, x - 3, y - 3, w + 6, h + 6, 16); c.fill();
  c.fillStyle = '#211d33'; c.beginPath(); rr(c, x, y, w, h, 14); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); rr(c, x, y, w, h, 14); c.stroke();
  c.fillStyle = AC; c.beginPath(); rr(c, x + 6, y + 6, w - 12, 30, 9); c.fill();
  if (tit) { const s = fitSize(tit, w - 60, 17, 10); k.text(tit, x + 14, y + 6 + (30 - s * 1.2) / 2, s, '#1a1530'); }
  /* cerrar */
  const bx = x + w - 40, by = y + 6;
  c.fillStyle = '#1a1530'; c.beginPath(); rr(c, bx, by, 34, 30, 8); c.fill();
  k.text('✕', bx + 17, by + 6, 16, '#f5f1e6', 'center');
}
function btn(t, act, lab, size) {
  const on = (kb && T[cur] === t);
  c.fillStyle = on ? AC : '#39344f'; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 10); c.fill();
  c.strokeStyle = OUT; c.lineWidth = on ? 3 : 2; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 10); c.stroke();
  if (lab) { const s = fitSize(lab, t.w - 10, size || 20, 9); k.text(lab, t.x + t.w / 2, t.y + (t.h - s * 1.15) / 2, s, on ? '#1a1530' : '#f5f1e6', 'center'); }
}
function drawScene() {
  if (baked) c.drawImage(baked, SC.x, SC.y, SC.w, SC.h);
  for (let i = 0; i < room.hs.length; i++) {
    const h = room.hs[i], x = BOX.x + h.x * BOX.w, y = BOX.y + h.y * BOX.h, w = h.w * BOX.w, hh = h.h * BOX.h;
    if (h.give && taken[h.give] && h.k === 'crate') { /* sigue dibujándose, solo cambia el texto */ }
    const s = objSpr(h.k, w, hh);
    c.drawImage(s, Math.round(x - 3), Math.round(y - 2), s.iw, s.ih);
    if (h.exit && flags.ok) { c.fillStyle = 'rgba(255,240,150,.22)'; c.beginPath(); rr(c, x - 3, y - 3, w + 6, hh + 6, 8); c.fill(); }
    const t = T[i];
    if (t && t.t === 'hs' && kb && cur === i) {
      c.strokeStyle = AC; c.lineWidth = 3; c.setLineDash([7, 5]); c.beginPath(); rr(c, x - 4, y - 4, w + 8, hh + 8, 9); c.stroke(); c.setLineDash([]);
    }
  }
}
function drawClue() {
  pzBox();
  panel(PZR.x, PZR.y, PZR.w, PZR.h, 'Pista del escenario');
  const d = clue, ax = PZR.x + PZR.w / 2, ay = PZR.y + 52, aw = PZR.w - 28, ah = PZR.h - 70;
  if (d.t === 'txt' || d.t === 'ord' || d.t === 'coord') {
    const l = d.l, n = l.length, lh = Math.min(64, ah / n);
    for (let i = 0; i < n; i++) {
      const s = fitSize(l[i], aw - 20, Math.min(40, lh * 0.66), 12);
      k.text(l[i], ax, ay + i * lh + (lh - s * 1.2) / 2, s, '#ffe9a8', 'center');
    }
    if (d.t === 'ord') k.text('de arriba abajo', ax, PZR.y + PZR.h - 30, 14, '#b9b2cf', 'center');
  } else if (d.t === 'morse') {
    const l = d.s || d.l || '', n = l.length, lh = Math.min(70, ah / n);
    for (let i = 0; i < n; i++) {
      const code = MOR[l[i]] || '', y = ay + i * lh + lh * 0.3, u = Math.min(20, (aw - 20) / (code.length * 2.2));
      let x = ax - (code.length * u * 2.1) / 2;
      for (let j = 0; j < code.length; j++) {
        const dash = code.charAt(j) === '-';
        c.fillStyle = '#ffe9a8'; c.beginPath(); rr(c, x, y, dash ? u * 1.7 : u * 0.6, u * 0.55, u * 0.27); c.fill();
        x += (dash ? u * 1.7 : u * 0.6) + u * 0.5;
      }
    }
    k.text('· corto  — largo', ax, PZR.y + PZR.h - 30, 14, '#b9b2cf', 'center');
  } else if (d.t === 'pat') {
    const s = Math.floor(Math.min((aw - 10) / d.w, (ah - 26) / d.h));
    const ox = ax - s * d.w / 2, oy = ay + (ah - 26 - s * d.h) / 2;
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
      const v = d.c[y * d.w + x];
      c.fillStyle = v ? COLS[(v - 1) % COLS.length] : '#2b2740';
      c.beginPath(); rr(c, ox + x * s + 2, oy + y * s + 2, s - 4, s - 4, 4); c.fill();
    }
  }
}
function drawPuz() {
  const d = puz.d;
  panel(PZR.x, PZR.y, PZR.w, PZR.h, PTIT[d.p] || 'Puzle');
  if (d.p === 'code') {
    const txt = puz.cd + '•'.repeat(Math.max(0, d.sol.length - puz.cd.length));
    k.text(txt.split('').join(' '), PZR.x + PZR.w / 2, AR.y + 2, 30, '#ffe9a8', 'center');
  } else if (d.p === 'clock') {
    const r = Math.min(AR.w, AR.h - 56) / 2 - 6, cx = PZR.x + PZR.w / 2, cy = AR.y + r + 4;
    c.fillStyle = '#efe6cc'; c.beginPath(); c.arc(cx, cy, r, 0, R2); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * R2 - Math.PI / 2; c.fillStyle = '#2b2740'; c.beginPath(); c.arc(cx + Math.cos(a) * r * 0.84, cy + Math.sin(a) * r * 0.84, r * 0.035, 0, R2); c.fill(); }
    const ha = (puz.hh % 12 + puz.mm / 60) / 12 * R2 - Math.PI / 2, ma = puz.mm / 60 * R2 - Math.PI / 2;
    c.strokeStyle = '#1a1530'; c.lineCap = 'round';
    c.lineWidth = 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ha) * r * 0.5, cy + Math.sin(ha) * r * 0.5); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ma) * r * 0.74, cy + Math.sin(ma) * r * 0.74); c.stroke();
    c.fillStyle = AC; c.beginPath(); c.arc(cx, cy, r * 0.07, 0, R2); c.fill();
    const hh = puz.hh, mm = ('0' + puz.mm).slice(-2);
    k.text(hh + ':' + mm, cx, AR.y + AR.h - 78, 22, '#ffe9a8', 'center');
  } else if (d.p === 'wires') {
    for (let i = 0; i < T.length; i++) {
      const t = T[i]; if (t.t !== 'pz') continue;
      const li = t.v.charAt(0) === 'l';
      if (li && puz.link[+t.v.slice(1)] >= 0) { /* unido */ }
      c.fillStyle = t.col; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 8); c.fill();
      c.strokeStyle = (kb && cur === i) ? '#fff' : OUT; c.lineWidth = (kb && cur === i) ? 3.5 : 2; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 8); c.stroke();
      if (li && puz.pick === +t.v.slice(1)) { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 8); c.fill(); }
    }
    for (let i = 0; i < d.n; i++) {
      const j = puz.link[i]; if (j < 0) continue;
      let a = null, b = null;
      for (let q = 0; q < T.length; q++) { if (T[q].v === 'l' + i) a = T[q]; if (T[q].v === 'r' + j) b = T[q]; }
      if (!a || !b) continue;
      c.strokeStyle = COLS[i]; c.lineWidth = 5; c.beginPath();
      c.moveTo(a.x + a.w, a.y + a.h / 2); c.bezierCurveTo(a.x + a.w + 40, a.y + a.h / 2, b.x - 40, b.y + b.h / 2, b.x, b.y + b.h / 2); c.stroke();
    }
  } else if (d.p === 'seq') {
    for (let i = 0; i < T.length; i++) {
      const t = T[i]; if (t.t !== 'pz') continue;
      const idx = +t.v, hecho = puz.order ? 0 : 0;
      let ok = 0; for (let q = 0; q < puz.pos; q++) if (d.order[q] === idx) ok = 1;
      c.fillStyle = ok ? '#4a8f3a' : (puz.bad > 0 ? '#7a3040' : '#3a3450');
      c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 10); c.fill();
      c.strokeStyle = (kb && cur === i) ? AC : OUT; c.lineWidth = (kb && cur === i) ? 3.5 : 2.5; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 10); c.stroke();
      c.fillStyle = '#efe6cc'; c.beginPath(); rr(c, t.x + t.w * 0.16, t.y + t.h * 0.14, t.w * 0.68, t.h * 0.46, 4); c.fill();
      const s = fitSize(t.lab, t.w - 10, 17, 9);
      k.text(t.lab, t.x + t.w / 2, t.y + t.h * 0.68, s, '#ffe9a8', 'center');
    }
    k.text(puz.pos + ' / ' + d.n, PZR.x + PZR.w / 2, PZR.y + PZR.h - 30, 16, '#b9b2cf', 'center');
  } else if (d.p === 'toggle') {
    for (let i = 0; i < T.length; i++) {
      const t = T[i]; if (t.t !== 'pz') continue;
      const on = puz.s[+t.v];
      c.fillStyle = '#332e4a'; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 10); c.fill();
      c.strokeStyle = (kb && cur === i) ? AC : OUT; c.lineWidth = (kb && cur === i) ? 3.5 : 2.5; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 10); c.stroke();
      const lh = t.h * 0.42, ly = on ? t.y + t.h * 0.1 : t.y + t.h * 0.48;
      c.fillStyle = on ? '#ff6b6b' : '#6f6a85'; c.beginPath(); rr(c, t.x + t.w * 0.18, ly, t.w * 0.64, lh, 7); c.fill();
      c.fillStyle = on ? '#ffd166' : '#454059'; c.beginPath(); c.arc(t.x + t.w / 2, t.y + t.h * (on ? 0.82 : 0.28), Math.min(9, t.w * 0.13), 0, R2); c.fill();
    }
    let n = 0; for (let i = 0; i < d.n; i++) n += puz.s[i];
    k.text(n + ' encendidos', PZR.x + PZR.w / 2, PZR.y + PZR.h - 30, 16, '#b9b2cf', 'center');
  } else if (d.p === 'fill') {
    for (let i = 0; i < T.length; i++) {
      const t = T[i]; if (t.t !== 'pz') continue;
      const v = puz.g[+t.v], fx = d.fixed.indexOf(+t.v) >= 0;
      c.fillStyle = v ? COLS[(v - 1) % COLS.length] : '#2b2740';
      c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 4); c.fill();
      c.strokeStyle = (kb && cur === i) ? AC : (fx ? '#efe6cc' : OUT); c.lineWidth = (kb && cur === i) ? 3 : (fx ? 2 : 1.4);
      c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 4); c.stroke();
    }
  } else if (d.p === 'pins') {
    for (let i = 0; i < T.length; i++) {
      const t = T[i]; if (t.t !== 'pz') continue;
      c.fillStyle = ((t.gx + t.gy) & 1) ? '#3c5a46' : '#44644e';
      c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 3); c.fill();
      c.strokeStyle = (kb && cur === i) ? AC : 'rgba(20,14,34,.6)'; c.lineWidth = (kb && cur === i) ? 3 : 1;
      c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 3); c.stroke();
      let set = 0; for (let q = 0; q < puz.pins.length; q++) if (puz.pins[q][0] === t.gx && puz.pins[q][1] === t.gy) set = 1;
      if (set) { c.fillStyle = '#ff6b6b'; c.beginPath(); c.arc(t.x + t.w / 2, t.y + t.h / 2, Math.min(t.w, t.h) * 0.3, 0, R2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke(); }
      if (t.gy === 0) k.text(String.fromCharCode(65 + t.gx), t.x + t.w / 2, t.y - 15, 12, '#b9b2cf', 'center');
      if (t.gx === 0) k.text('' + (t.gy + 1), t.x - 12, t.y + t.h / 2 - 6, 12, '#b9b2cf', 'center');
    }
  } else if (d.p === 'aim') {
    const g = puz.grid || gridRects(d.w, d.h, 1);
    for (let i = 0; i < g.length; i++) {
      const t = g[i]; let wall = 0;
      for (let q = 0; q < (d.walls || []).length; q++) if (d.walls[q][0] === t.gx && d.walls[q][1] === t.gy) wall = 1;
      c.fillStyle = wall ? '#4a4460' : '#241f38'; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 4); c.fill();
    }
    const B = beam(d, puz.rot);
    c.strokeStyle = '#ff6b6b'; c.lineWidth = Math.max(3, CELL * 0.14); c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i < B.pts.length; i++) {
      const p = B.pts[i], r = g[p[1] * d.w + p[0]]; if (!r) continue;
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (i === 0) c.moveTo(cx, cy); else c.lineTo(cx, cy);
    }
    c.stroke();
    const gr = g[d.goal[1] * d.w + d.goal[0]];
    if (gr) { c.strokeStyle = B.win ? '#a8cf3f' : '#ffd166'; c.lineWidth = 3; c.beginPath(); rr(c, gr.x, gr.y, gr.w, gr.h, 4); c.stroke(); }
    for (let i = 0; i < d.mir.length; i++) {
      const r = g[d.mir[i][1] * d.w + d.mir[i][0]], on = puz.rot[i];
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, L = Math.min(r.w, r.h) * 0.38;
      c.strokeStyle = '#bfe8ff'; c.lineWidth = Math.max(3, CELL * 0.12); c.beginPath();
      if (on) { c.moveTo(cx - L, cy - L); c.lineTo(cx + L, cy + L); } else { c.moveTo(cx - L, cy + L); c.lineTo(cx + L, cy - L); }
      c.stroke();
      let sel2 = 0; for (let q = 0; q < T.length; q++) if (T[q].t === 'pz' && +T[q].v === i && kb && cur === q) sel2 = 1;
      if (sel2) { c.strokeStyle = AC; c.lineWidth = 3; c.beginPath(); rr(c, r.x, r.y, r.w, r.h, 4); c.stroke(); }
    }
    k.text('Toca un espejo para girarlo', PZR.x + PZR.w / 2, PZR.y + PZR.h - 30, 14, '#b9b2cf', 'center');
  }
  /* botones de los puzles con rótulo */
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.t === 'pz' && t.lab && (d.p === 'code' || d.p === 'clock')) btn(t, t, t.lab, d.p === 'code' ? 24 : 17);
  }
}
function drawHUD() {
  c.fillStyle = 'rgba(12,8,24,.55)'; c.fillRect(0, 0, W, TOP);
  const lt = 'Sala ' + k.lv + '/' + ROOMS.length, rt = Math.floor(tRoom) + ' s';
  const maxSide = Math.max(60, W / 2 - 70);
  const s1 = fitSize(room.n, maxSide, 17, 10);
  k.text(clipTxt(room.n, maxSide, s1), 10, 8, s1, '#f5f1e6');
  k.text(lt, 10, 10 + s1 * 1.25, 13, AC);
  k.text(rt, W - 10, 8, 16, '#b9b2cf', 'right');
  if (hintU) k.text(hintU + ' pista' + (hintU > 1 ? 's' : ''), W - 10, 10 + 20, 12, '#8e87a6', 'right');
  if (msgT > 0 && msg) {
    const my = SC.y + SC.h + 2, s = fitSize(msg, W - 24, 16, 10);
    c.fillStyle = 'rgba(12,8,24,.6)'; c.beginPath(); rr(c, 8, my, W - 16, 22, 8); c.fill();
    k.text(clipTxt(msg, W - 26, s), W / 2, my + (22 - s * 1.2) / 2, s, '#ffe9a8', 'center');
  }
}
function drawBar() {
  c.fillStyle = 'rgba(12,8,24,.62)'; c.fillRect(0, H - BOT, W, BOT);
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.t === 'inv') {
      const it = inv[t.i], on = (sel === t.i), fo = (kb && cur === i);
      c.fillStyle = on ? AC : '#2b2740'; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 9); c.fill();
      c.strokeStyle = fo ? '#fff' : OUT; c.lineWidth = fo ? 3 : 2; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 9); c.stroke();
      if (it) { const s = itemSpr(it, Math.round(t.w * 0.78)); c.drawImage(s, Math.round(t.x + (t.w - s.iw) / 2), Math.round(t.y + (t.h - s.ih) / 2), s.iw, s.ih); }
    } else if (t.t === 'hint') {
      const rdy = hintT >= HC(), fo = (kb && cur === i);
      c.fillStyle = rdy ? '#4a8f3a' : '#332e4a'; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 10); c.fill();
      if (!rdy) { const p = hintT / HC(); c.fillStyle = 'rgba(168,207,63,.35)'; c.beginPath(); rr(c, t.x, t.y, t.w * p, t.h, 10); c.fill(); }
      c.strokeStyle = fo ? AC : OUT; c.lineWidth = fo ? 3 : 2; c.beginPath(); rr(c, t.x, t.y, t.w, t.h, 10); c.stroke();
      const lab = rdy ? 'Pista' : Math.ceil(HC() - hintT) + ' s';
      const s = fitSize(lab, t.w - 10, 17, 10);
      k.text(lab, t.x + t.w / 2, t.y + (t.h - s * 1.2) / 2, s, '#f5f1e6', 'center');
    }
  }
}
function draw() {
  k.clear(BG);
  if (!room) return;
  drawScene();
  drawHUD();
  drawBar();
  if (clue) drawClue(); else if (puz) drawPuz();
}
function reset() { buildRoom(); }

k.levels(ROOMS.length, { start: () => buildRoom() });
reset();
k.run(update, draw);
k.show(CFG.title, CFG.help || '');

/* ganchos de prueba */
window.__g = {
  get room() { return room; }, get inv() { return inv; }, get flags() { return flags; },
  get puz() { return puz; }, get clue() { return clue; }, get T() { return T; },
  get BOX() { return BOX; }, get lv() { return k.lv; }, get done() { return done; },
  ROOMS: ROOMS,
  tap: (i) => { const t = T[i]; if (t) act(t); },
  find: (pred) => { for (let i = 0; i < T.length; i++) if (pred(T[i])) return i; return -1; }
};
