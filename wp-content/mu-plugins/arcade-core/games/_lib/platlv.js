/* Niveles a mano de los juegos de plataformas laterales (plan Friv, F3).
 * Cada nivel es una tira de piezas separadas por espacios. El motor las lee de izquierda a
 * derecha llevando dos cosas: la columna actual (x) y la altura del suelo (h, en casillas).
 *
 *   f<n>  suelo llano de n casillas          g<n>  hueco de n casillas
 *   u<n>  sube n casillas y llanea 4         d<n>  baja n casillas y llanea 4
 *   x<n>  suelo de n casillas con pinchos en medio (los extremos siempre son seguros)
 *   p<n>  plataforma de tablones de n casillas, 4 por encima del suelo actual
 *   w     chimenea de salto de pared (sube 5 casillas entre dos paredes)
 *   a     anilla de gancho sobre la posición actual
 *   e     enemigo que patrulla el último tramo llano
 *   c     cuatro monedas en arco sobre lo último colocado
 *   C     reguero de monedas a ras de suelo sobre el último tramo (nunca detrás de un hueco)
 *   G     gema del nivel: alta, a la vista y vale 250 (solo pixel-dash la usa hoy)
 *   k     punto de control
 *   B     zona de jefe; la bandera solo aparece al derrotarlo
 *
 * ---- Piezas nuevas, solo de pixel-dash: dan verbos que se acumulan ----
 *   m<n>  GRIETA: hueco de n casillas puenteado por losas que se desmoronan 0,45 s después
 *         de pisarlas y vuelven a los 3 s. Se cruza sin pararse.
 *   M<n>  ASCENSOR: hueco de n con una plataforma de 3 que va y viene. Hay que esperarla y
 *         montarse; te lleva consigo.
 *   V<n>  MONTACARGAS: hueco de n con una plataforma que sube y baja 5 casillas. Sirve para
 *         subir escalones de 5, que el salto normal no alcanza: se escribe `V4 u5`.
 *   q<n>  COMPÁS: hueco de n cruzado por bloques que aparecen y desaparecen a ritmo, en dos
 *         fases alternas; parpadean 0,45 s antes de irse.
 *   s<n>  SIERRA: tramo llano de n con una sierra que recorre un raíl a ras de suelo. El raíl
 *         va pintado de extremo a extremo, así que el peligro nunca sorprende.
 *   ^     MUELLE en el centro del último tramo: lanza muy alto (para alcanzar las P).
 *   P<n>  REPISA ALTA de n tablones, 6 casillas sobre el suelo: la ruta arriesgada. Solo se
 *         llega con muelle, y lo que se recoge ahí es lo que da la tercera estrella.
 *   E     PERSEGUIDOR: enemigo que te ve, avisa con «!» y va a por ti saltando huecos.
 *   W<n>  AMENAZA: muro de sombra que avanza desde atrás durante todo el nivel (1 lento,
 *         2 medio, 3 rápido). Se escribe al principio de la tira.
 *
 * ---- Piezas nuevas, solo de castle-knight (tanda 7) ----
 *   A     ARQUERO de almena sobre el último tramo llano: tensa el arco 0,6 s (aviso «!») y
 *         suelta una flecha a la altura de la rodilla. Se salta, se para con el tajo o se
 *         mata al arquero (pisotón o espada, 150 puntos).
 *   S     ESCUDERO: patrulla el último tramo con el escudo alto (el pisotón rebota y la
 *         espada no entra); cada 2,5 s lo baja para atacar y avisa 0,55 s antes.
 *   L     PÉNDULO de maza colgado del techo sobre el centro del último tramo. La cadena se
 *         dibuja entera de arriba abajo, así que el barrido nunca sorprende.
 *
 * Desde la tanda 7, castle-knight comparte con pixel-dash todas las piezas nuevas de 1.38
 * (m, M, V, q, s, ^, P, E, W, G, k) y el jefe de tres fases de `B`.
 *
 * Los niveles de pixel-dash son objetos { n: nombre, s: tira, tip: consejo, t: [fácil, normal,
 * difícil] segundos objetivo de la 2ª estrella }. Los demás juegos siguen con tiras sueltas.
 * La bandera se coloca sola al final. Ningún nivel usa el azar: el que diseñamos es el que se juega.
 */
const PLATLV = {
  /* ---- pixel-dash: 20 niveles largos, con verbos que se acumulan, presión y tesoros en la
     ruta arriesgada. 1-4 enseñan · 5-9 combinan de dos en dos · 10-14 exigen · 15-19 lo
     mezclan todo · 20 el Coloso, con tres fases telegrafiadas. ---- */
  'pixel-dash': [
    { n: 'Primeros pasos', tip: 'Mantén ↑ pulsado para saltar más alto.', t: [40, 33, 29],
      s: 'f14 C f10 g2 f12 c f10 g2 f12 C f10 g3 f14 c f12 u2 f10 C f12 d2 f14 c f12 G f10' },
    { n: 'Grietas', tip: 'Las losas agrietadas se caen: no te pares encima.', t: [46, 38, 33],
      s: 'f12 C f8 m3 f8 c f8 m4 f8 C f10 m3 f6 m3 f8 c G f10 m5 f8 C f12 m4 f10 c f8' },
    { n: 'El ascensor', tip: 'Espera a la plataforma en el borde; te lleva consigo.', t: [64, 55, 48],
      s: 'f12 C f8 M5 f8 c f8 M6 f10 C k f10 V4 u5 f8 c G f10 M6 f8 C f10 d5 f10 M5 f10 c f8' },
    { n: 'Dientes', tip: 'La sierra sigue su raíl: salta cuando se aleje.', t: [48, 40, 35],
      s: 'f12 C f10 s8 f10 c f10 s10 f8 C f10 s8 g2 f10 c G f10 s12 f10 C f10 s8 f12' },
    { n: 'Muelles', tip: 'El muelle sube a la repisa: ahí están los tesoros.', t: [47, 39, 34],
      s: 'f12 C f10 ^ P4 c f8 g3 f10 C f8 ^ P5 c G f8 g3 f10 m4 f8 C f10 ^ P4 c f10 g4 f12 C f10' },
    { n: 'Compás', tip: 'Los bloques parpadean antes de irse. Cruza al ritmo.', t: [62, 52, 45],
      s: 'f12 C f10 q6 f10 c f10 q8 f10 C k f10 q6 f8 m3 f8 c G f10 q8 f10 C f10 q6 f12' },
    { n: 'Te ha visto', tip: 'El perseguidor avisa con «!»: písalo en la cabeza.', t: [52, 44, 38],
      s: 'f12 C f12 E f10 c f10 g2 f12 E f10 C k f10 s8 f10 E c f10 G f10 m4 f10 E f12 C f10' },
    { n: 'La sombra', tip: 'El muro no perdona la duda: sigue corriendo.', t: [46, 39, 34],
      s: 'W1 f14 C f10 g2 f12 c f10 m4 f10 C k f12 g3 f12 c f10 m5 f12 C f10 g2 f12 c G f14' },
    { n: 'Sierra y grieta', tip: 'Cruza la grieta cuando la sierra vaya de vuelta.', t: [68, 60, 56],
      s: 'f12 C f10 s8 m4 f10 c f10 m4 s8 f10 C k f10 s10 f8 m5 f10 c G f10 m4 f8 s8 f12 C f10' },
    { n: 'Puente roto', tip: 'Del ascensor al compás sin tocar el suelo.', t: [72, 61, 53],
      s: 'f12 C f10 M7 f10 c f10 q8 f10 C k f10 M8 f8 q6 f10 c G f10 M7 f10 q8 f12 C f10' },
    { n: 'No mires atrás', tip: 'Con el muro detrás, las sierras se pasan por arriba.', t: [55, 46, 40],
      s: 'W2 f14 C f10 s8 f10 c f10 g2 f10 s10 f10 C k f12 s8 m4 f10 c G f10 s10 f10 g3 f12 C f12' },
    { n: 'Salto de fe', tip: 'Cada muelle tiene su repisa: no te dejes ninguna.', t: [56, 47, 41],
      s: 'f12 C f10 ^ P5 c f8 g3 f10 ^ P6 c G f8 m4 f10 C k f10 ^ P5 c f8 g4 f12 ^ P4 c f10 G f12 C f10' },
    { n: 'Marea', tip: 'El compás manda: entra en el bloque en cuanto aparezca.', t: [64, 54, 47],
      s: 'W2 f14 C f10 q6 f10 c f10 q8 f10 C k f12 q6 m4 f10 c G f10 q8 f10 m5 f12 C f10 q6 f12' },
    { n: 'Trampa doble', tip: 'Pisa al perseguidor y usa el rebote para pasar la sierra.', t: [56, 47, 41],
      s: 'f12 C f10 E s8 f10 c f10 m4 E f10 C k f10 s10 m5 f10 c G f10 E f10 m4 s8 f12 C f10' },
    { n: 'Cuerda floja', tip: 'El montacargas sube cinco casillas: nada más lo hace.', t: [84, 74, 68],
      s: 'f12 C f10 M7 f10 c f10 V4 u5 f8 s8 f10 C k f10 M8 f10 c G f10 d5 f10 M7 f10 s8 f12 C f10' },
    { n: 'Persecución', tip: 'Con el muro cerca, no vuelvas atrás a por nada.', t: [58, 49, 43],
      s: 'W2 f14 C f10 E f10 c f10 m4 f10 E f10 C k f12 m5 f10 E f10 c G f10 m4 f10 E f12 C f10' },
    { n: 'Ruinas', tip: 'Todo lo aprendido, sin prisa pero sin pausa.', t: [70, 59, 51],
      s: 'f12 C f10 m4 s8 f10 ^ P5 c f8 q6 f10 C k f10 M7 f10 E f10 c G f10 q8 m4 f10 s8 f12 C f10' },
    { n: 'Derrumbe', tip: 'Grietas y compás con el muro encima: fíate del ritmo.', t: [60, 50, 44],
      s: 'W3 f14 C f10 m4 f10 q6 f10 c f10 m5 f10 C k f12 q8 f10 m4 f10 c G f10 q6 f10 m5 f12 C f12' },
    { n: 'La huida', tip: 'Dos puntos de control. Corre y no mires atrás.', t: [66, 56, 49],
      s: 'W3 f14 C f10 s8 f10 m4 f10 c q6 f10 E f10 C k f12 m5 f10 s10 c G f10 q8 f10 m4 f12 C k f10 s8 f12' },
    { n: 'El Coloso', tip: 'Se prepara antes de cada ataque: golpéalo cuando se aturda.', t: [110, 95, 84],
      s: 'f14 C f10 m4 f10 c f10 s8 f10 C k f12 q6 f10 G f10 E f10 C k f10 B' }
  ],
  /* ---- castle-knight: 20 niveles largos escritos a mano (tanda 7). Verbos propios del
     castillo: A arquero de almena, S escudero con escudo, L péndulo de maza; y los del motor
     (grietas, ruedas de cuchillas, tornos, montacargas, losas encantadas, trampolín, bestia y
     la marea de sombra). 1-3 enseñan lo básico · 4-14 añaden un verbo cada uno · 15-19 los
     combinan · 20 El Alcaide, con tres fases telegrafiadas. ---- */
  'castle-knight': [
    { n: 'El patio de armas', tip: 'B (o toca) para el tajo; también vale saltarles encima.', t: [69, 62, 56],
      s: 'f18 C f14 e c f14 C f12 e f14 c f16 C f14 e c f14 G f16 C f16 e f12 c f18 C f14 e f14 c f16 C f14 e f12 c f14 G f16 C f16 e f14 c f14 C f16 e f12' },
    { n: 'El foso seco', tip: 'Los fosos se cruzan corriendo: no frenes en el borde.', t: [78, 69, 63],
      s: 'f16 C f12 g2 f12 c f10 e f12 C f12 g3 f12 c f14 g2 f10 e C f12 g3 f12 c f14 G f12 g2 f12 C f14 e f12 g3 f14 C f12 g2 f12 c f14 C f12 g3 f12 e c f14 g2 f12 C f14 g3 f12 c f16 C f12 g2 f14' },
    { n: 'Almenas y escaleras', tip: 'El adarve sube y baja: encadena los escalones sin frenar.', t: [90, 79, 72],
      s: 'f14 C f10 u2 f10 c f12 d2 f12 C f10 u2 f8 c f6 d2 f4 f12 C f12 u3 f10 e c f12 u2 f8 c f6 d2 f4 f12 d3 f12 C f14 u2 f10 G c f12 d2 f14 C f12 u2 f12 c f12 u2 f8 c f6 d2 f8 d2 f14 C f12 u3 f12 e c f12 u2 f8 c f6 d2 f8 d3 f14 C f12' },
    { n: 'Los arqueros', tip: 'El arco se tensa y avisa: salta la flecha o párala con el tajo.', t: [70, 62, 56],
      s: 'f14 C f12 A f14 c f12 C f12 A f12 e c f12 C f14 A f12 g2 f12 c G f12 A f14 C f12 e f12 A f14 c f12 C f12 A f14 c f12 C f12 A f12 e f12 c f14 A f12 C f12 c f12 A f14 C f12' },
    { n: 'Losas carcomidas', tip: 'Las losas se desmoronan al pisarlas: cruza sin pararte.', t: [74, 65, 59],
      s: 'f14 C f12 m3 f12 c f12 C f10 m4 f10 e c f12 C f12 m3 f8 m3 f12 c G f12 A f12 m4 f12 C f12 e f12 m5 f12 C f14 m3 f12 c f12 C f12 m4 f12 e c f12 m3 f10 m3 f12 C f12 c f12 m5 f14 C f12' },
    { n: 'El escudero', tip: 'Con el escudo alto rebotas; espera a que lo baje y entra.', t: [76, 67, 61],
      s: 'f14 C f12 S f14 c f12 C f12 S f12 k c f12 C f14 A f12 S f12 c f12 G f12 m4 f12 S f12 C f14 e f12 S f14 C f12 S f12 c f12 C f12 A f12 S f12 k c f12 m4 f12 S f12 C f14 c f12 S f14 C f12' },
    { n: 'Ruedas de cuchillas', tip: 'La cuchilla sigue su raíl: pasa cuando se aleje.', t: [80, 71, 64],
      s: 'f14 C f12 s8 f12 c f12 C f10 s10 f10 e c f12 k C f12 s8 f10 m4 f10 c G f12 A f12 s8 f12 C f12 s10 f12 C f12 s8 f12 c f12 C f12 s10 f10 e c f12 k s8 f12 m4 f12 C f12 c f12 s10 f14 C f12' },
    { n: 'El péndulo', tip: 'La cadena se ve entera: cuenta el vaivén y cruza.', t: [72, 64, 58],
      s: 'f14 C f12 L f12 c f12 C f12 L f12 k e c f12 C f12 L f10 m4 f10 c G f12 A f12 L f12 C f12 s8 f12 L f12 C f14 L f12 c f12 C f12 L f12 A f12 c f12 k L f10 m4 f10 C f12 c f12 L f14 C f12' },
    { n: 'El torno', tip: 'Espera el torno en el borde; te lleva consigo.', t: [80, 71, 64],
      s: 'f14 C f12 M6 f12 c f12 C f12 M7 f12 k e c f12 C f12 L f12 M6 f12 c G f12 A f12 M7 f12 C f12 m4 f12 M6 f12 C f14 M6 f12 c f12 C f12 M7 f12 e c f12 k L f12 M6 f12 C f12 c f12 M7 f14 C f12' },
    { n: 'Losas encantadas', tip: 'Parpadean antes de irse: entra en cuanto aparezcan.', t: [85, 75, 68],
      s: 'f14 C f12 q6 f12 c f12 C f12 q8 f12 k c f12 S f12 C f12 q6 f10 m4 f10 c G f12 A f12 q8 f12 C f12 L f12 q6 f12 C f14 q6 f12 c f12 C f12 q8 f12 S f12 c f12 k q6 f10 m4 f10 C f12 c f12 q8 f14 C f12' },
    { n: 'El trampolín', tip: 'El trampolín sube al adarve alto: ahí está el tesoro.', t: [64, 57, 52],
      s: 'f14 C f12 ^ P4 c f12 g2 f12 C f12 ^ P5 c G f12 k m4 f12 C f12 A f12 ^ P4 c f12 g3 f12 C f12 S f12 ^ P5 c G f12 C f14 ^ P4 c f12 C f12 g2 f12 ^ P5 c f12 k A f12 C f12 ^ P4 c f12 C f14' },
    { n: 'El montacargas', tip: 'Cinco casillas solo las sube el montacargas.', t: [81, 72, 65],
      s: 'f14 C f12 V4 u5 f12 c f12 d5 f12 C f12 M6 f12 k c f12 V4 u5 f12 A f12 c G f12 d5 f12 C f12 L f12 V4 u5 f10 c f12 d5 f12 C f14 V4 u5 f12 c f12 d5 f12 C f12 k M6 f12 c f12 V4 u5 f10 c f12 d5 f14 C f12' },
    { n: 'La bestia', tip: 'Te ve y avisa con «!»: pisotón o tajo, pero no le des la espalda.', t: [76, 67, 61],
      s: 'f14 C f12 E f14 c f12 C f12 E f12 k c f12 A f12 C f12 E f10 m4 f10 c G f12 S f12 E f12 C f12 s8 f12 E f14 C f12 E f14 c f12 C f12 E f12 A f12 c f12 k E f12 m4 f12 C f12 c f12 E f14 C f12' },
    { n: 'La marea de sombra', tip: 'La sombra no perdona la duda: corre y no mires atrás.', t: [79, 70, 63],
      s: 'W1 f16 C f12 g2 f12 c f12 m4 f12 C f12 k g3 f12 c f12 A f12 m5 f12 C f12 c f12 L f12 m4 f12 C G f14 g2 f14 C f12 g2 f14 c f12 m4 f12 C f12 k g3 f12 c f12 A f12 m5 f12 C f14 c f12 g2 f14 C f12' },
    { n: 'Flechas y cadenas', tip: 'Con el arquero al fondo, el péndulo manda el paso.', t: [77, 68, 61],
      s: 'f14 C f12 A f12 L f12 c f12 m4 f12 C f12 k A f12 L f10 s8 f10 c G f12 A f12 m5 f12 L f12 C f12 S f12 A f12 L f12 C f14 A f12 L f12 c f12 m4 f12 C f12 k A f12 L f10 s8 f10 c f12 L f12 C f14' },
    { n: 'Sala de guardia', tip: 'Escudero, cuchilla y losas: una cosa a la vez.', t: [85, 75, 68],
      s: 'f14 C f12 S f12 s8 f12 c f12 q6 f12 C f12 k S f12 A f12 s10 f10 c G f12 q8 f12 S f12 m4 f12 C f12 L f12 s8 f12 C f14 S f12 s8 f12 c f12 q6 f12 C f12 k S f12 A f12 s10 f10 c f12 q8 f14 C f12' },
    { n: 'La torre del homenaje', tip: 'Arriba y abajo: el torno y el montacargas son la ruta.', t: [89, 78, 71],
      s: 'f14 C f12 V4 u5 f12 A f12 c f12 M6 f12 C f12 k d5 f12 q6 f12 c G f12 V4 u5 f10 L f10 c f12 M7 f12 C f12 d5 f12 s8 f12 C f14 V4 u5 f12 A f12 c f12 M6 f12 C f12 k d5 f12 q6 f12 c f12 V4 u5 f10 c f12 d5 f14 C f12' },
    { n: 'Huida por el adarve', tip: 'Grietas y cuchillas con la sombra encima: fíate del ritmo.', t: [84, 75, 67],
      s: 'W2 f16 C f12 m4 f12 c f12 s8 f12 C f12 k m5 f12 A f12 c f12 s10 f12 C G f12 m4 f12 L f12 c f12 g3 f12 C f14 m4 f12 C f12 m4 f12 c f12 s8 f12 C f12 k m5 f12 A f12 c f12 s10 f12 C f12 m4 f14 C f12' },
    { n: 'El asalto', tip: 'Dos puntos de control. Todo lo aprendido, sin pausa.', t: [95, 84, 76],
      s: 'f14 C f12 A f12 S f12 c f12 m4 f12 L f12 C f12 k s8 f12 q6 f12 c G f12 M6 f12 E f12 C f12 ^ P5 c f12 k A f12 L f12 m4 f12 C f12 s8 f12 E f12 C f14 A f12 S f12 c f12 m4 f12 L f12 C f12 k s8 f12 q6 f12 c f12 M6 f12 E f12 C f14' },
    { n: 'El Alcaide', tip: 'Se prepara antes de cada golpe: entra cuando se aturda.', t: [150, 126, 110],
      s: 'f14 C f12 A f12 c f12 m4 f12 S f12 C f12 k L f12 s8 f12 c G f12 q6 f12 E f12 C f12 k A f12 S f12 c f12 L f12 m4 f12 C f12 s8 f12 q6 f12 c f12 E f12 M6 f12 C f12 k f10 B' }
  ]
};
