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
  /* ---- castle-knight: espada y guardias. 20 niveles, jefe en el 20. ---- */
  'castle-knight': [
    'f12 c f10',                                        /* 1  el patio */
    'f12 e c f10',                                      /* 2  el primer guardia */
    'f10 e f6 e c f8',                                  /* 3  dos guardias */
    'f8 g2 f8 e c f8',                                  /* 4  foso y guardia */
    'f8 u3 f6 e c d3 f8',                               /* 5  la muralla */
    'f8 e g3 p3 c g3 e f8',                             /* 6  puente de tablones */
    'f8 x3 f6 e c f8',                                  /* 7  las trampas */
    'f10 e f4 e f4 e c f8',                             /* 8  la guardia */
    'f6 u3 f4 e u3 f4 e c d6 f8',                       /* 9  la torre */
    'f8 e x2 f4 e x2 c f8',                             /* 10 pasillo de trampas */
    'f8 g3 f4 e g3 f4 c e f8',                          /* 11 las almenas */
    'f8 u4 f4 e d4 f4 e c f8',                          /* 12 adarve */
    'f8 e g2 p3 c g2 p3 e g2 f8',                       /* 13 los andamios */
    'f8 x3 e f4 x3 e c f8',                             /* 14 sala de pinchos */
    'f6 u2 f4 u2 e f4 u2 c f6 d6 e f8',                 /* 15 escalera de caracol */
    'f8 e g4 f4 e g4 c f8',                             /* 16 el foso doble */
    'f8 e u3 x3 f4 e d3 c f8',                          /* 17 la barbacana */
    'f8 e f4 e f4 e x3 c f8',                           /* 18 la formación */
    'f8 e g3 f6 k c u3 f4 e x3 g3 e f6 d3 f8',          /* 19 el asalto */
    'f10 c k g3 f6 e B'                                 /* 20 el señor del castillo */
  ]
};
