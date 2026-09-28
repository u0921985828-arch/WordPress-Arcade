/* Almacenes a mano de sokoban-warehouse (plan Friv, F3, tanda 3).
 * 20 niveles dibujados uno a uno: ninguno se genera al azar y todos están verificados con un
 * resolutor propio (BFS sobre estados jugador+cajas, óptimo en MOVIMIENTOS del jugador).
 *
 * PLANTA — cada nivel es una lista de filas de la misma anchura:
 *   #  muro            (espacio)  suelo
 *   .  destino         $  caja            *  caja ya sobre un destino
 *   @  jugador         +  jugador sobre un destino
 *
 * CAMPOS de cada nivel:
 *   n  nombre del almacén (se enseña en el HUD)
 *   i  la idea nueva que enseña (se lee en la tarjeta de inicio del nivel)
 *   m  MÍNIMO de movimientos, calculado por el resolutor (medalla si lo igualas)
 *   g  la planta
 *
 * El mínimo cuenta cada paso del jugador (empuje o no), igual que el marcador del juego.
 * Deshacer y reiniciar suman movimiento, así que la medalla solo cae con la ruta limpia.
 * Orden pensado por curva: cada nivel enseña una idea y ninguno pide dos cosas nuevas a la vez.
 */
const SOKLV = {
  'sokoban-warehouse': [
    /* ---- 1-5: lo básico. Empujar, rodear, no arrinconar. ---- */
    { n: 'Primer empujón', i: 'Las cajas solo se EMPUJAN: ponte detrás y avanza.', m: 2, g: [
      '#######',
      '#     #',
      '#.$ @ #',
      '#     #',
      '#######'] },
    { n: 'Por el pasillo', i: 'Mientras empujes en línea recta, la caja te sigue el paso.', m: 4, g: [
      '#########',
      '#       #',
      '# @ $  .#',
      '#       #',
      '#########'] },
    { n: 'Da la vuelta', i: 'Para empujar hacia abajo hay que ponerse arriba del todo.', m: 6, g: [
      '#########',
      '#       #',
      '#   $   #',
      '#   .   #',
      '#   @   #',
      '#       #',
      '#########'] },
    { n: 'El pilar', i: 'El camino del jugador no es el camino de la caja.', m: 7, g: [
      '##########',
      '#        #',
      '#  $   . #',
      '#  ###   #',
      '#  @     #',
      '#        #',
      '##########'] },
    { n: 'La esquina mata', i: 'Una caja en una esquina ya no sale: llévala pegada al muro.', m: 10, g: [
      '##########',
      '#        #',
      '#  #####.#',
      '#  $     #',
      '#  @     #',
      '#        #',
      '##########'] },
    /* ---- 6-10: varias cajas, rutas en L y destinos escondidos. ---- */
    { n: 'Dos cajas', i: 'Cada caja lleva su ruta: primero de lado, luego de frente.', m: 11, g: [
      '#########',
      '#       #',
      '# .   . #',
      '#  $ $  #',
      '#   @   #',
      '#       #',
      '#########'] },
    { n: 'Tres en fila', i: 'Con varias cajas, piensa por cuál empiezas.', m: 13, g: [
      '##########',
      '#  ...   #',
      '#        #',
      '#  $$$   #',
      '#   @    #',
      '#        #',
      '##########'] },
    { n: 'Puertas estrechas', i: 'Por una puerta de una casilla solo se pasa de frente.', m: 13, g: [
      '##########',
      '#  ..    #',
      '#        #',
      '###  #####',
      '#        #',
      '#  $$    #',
      '#   @    #',
      '##########'] },
    { n: 'Caja bloqueante', i: 'Encajonada entre dos muros, una caja solo sube o baja.', m: 14, g: [
      '##########',
      '#  .     #',
      '#  #$#   #',
      '#  $    .#',
      '#  @     #',
      '#        #',
      '##########'] },
    { n: 'El recodo', i: 'Si el destino no está en línea, baja la caja y rodea el muro.', m: 18, g: [
      '##########',
      '#    #   #',
      '# $  # . #',
      '#    ##  #',
      '# @      #',
      '#        #',
      '##########'] },
    /* ---- 11-15: nichos, almacenes llenos y una despensa con puerta única. ---- */
    { n: 'El nicho', i: 'Al nicho se entra de una en una y por el sitio justo.', m: 21, g: [
      '#########',
      '###...###',
      '#       #',
      '# $ $ $ #',
      '#   @   #',
      '#       #',
      '#########'] },
    { n: 'Almacén', i: 'Cuatro cajas, cuatro marcas: coloca de fuera hacia dentro.', m: 23, g: [
      '##########',
      '#....    #',
      '#        #',
      '# $$$$   #',
      '#   @    #',
      '#        #',
      '##########'] },
    { n: 'Vaivén', i: 'Si el centro está cerrado, sube por los lados.', m: 28, g: [
      '##########',
      '#   .    #',
      '#  ####  #',
      '# $    $ #',
      '#  ####  #',
      '#   .    #',
      '#   @    #',
      '##########'] },
    { n: 'Cuatro esquinas', i: 'Reparte el trabajo: cada caja tiene su esquina más cercana.', m: 29, g: [
      '#########',
      '#.     .#',
      '#  $ $  #',
      '#   #   #',
      '#  $ $  #',
      '#.     .#',
      '#   @   #',
      '#########'] },
    { n: 'El fondo primero', i: 'Llena siempre el hueco del fondo antes que el de la entrada.', m: 31, g: [
      '##########',
      '#..      #',
      '####$#$#.#',
      '#   @    #',
      '##########'] },
    /* ---- 16-20: rutas largas, dos puertas y el gran almacén final. ---- */
    { n: 'La despensa', i: 'Puerta doble: entra la caja por un lado y colócate por el otro.', m: 43, g: [
      '##########',
      '#        #',
      '# ###### #',
      '# #....# #',
      '# #    # #',
      '# ##  ## #',
      '#  $$$$  #',
      '#   @    #',
      '##########'] },
    { n: 'El muelle', i: 'Cuatro cajas apiladas: sácalas de una en una por el lateral.', m: 43, g: [
      '##########',
      '#  ....  #',
      '#        #',
      '#  #  #  #',
      '#  $  $  #',
      '#  $  $  #',
      '#   @    #',
      '##########'] },
    { n: 'Doble puerta', i: 'Dos puertas y dos filas: aparta las de abajo para liberar las de arriba.', m: 53, g: [
      '##########',
      '#  ....  #',
      '#        #',
      '### ## ###',
      '#        #',
      '#  $  $  #',
      '#  $  $  #',
      '#   @    #',
      '##########'] },
    { n: 'Ida y vuelta', i: 'A veces hay que alejar una caja para poder acercarla después.', m: 55, g: [
      '##########',
      '#  ...   #',
      '#  ###   #',
      '#      $ #',
      '# #### # #',
      '#  $ $   #',
      '#   @    #',
      '##########'] },
    { n: 'El gran almacén', i: 'Todo junto. Mira el hueco del fondo antes de tocar nada.', m: 51, g: [
      '#########',
      '#...    #',
      '#.. #   #',
      '#   #   #',
      '# $$$$$ #',
      '#   @   #',
      '#########'] }
  ]
};
if (typeof module !== 'undefined' && module.exports) module.exports = SOKLV; /* para el resolutor en Node */
