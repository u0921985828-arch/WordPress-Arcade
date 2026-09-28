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
 *   k     punto de control
 *   B     zona de jefe (14 casillas llanas); la bandera solo aparece al derrotarlo
 *
 * La bandera se coloca sola al final. Ningún nivel usa el azar: el que diseñamos es el que se juega.
 */
const PLATLV = {
  /* ---- pixel-dash: correr, saltar, pisar. 20 niveles, jefe en el 20. ---- */
  'pixel-dash': [
    'f12 c f10',                                        /* 1  correr y llegar */
    'f10 c g2 f10',                                     /* 2  el primer hueco */
    'f8 g2 f6 c g3 f8',                                 /* 3  tres huecos */
    'f8 u2 f6 c f6',                                    /* 4  subir un escalón */
    'f8 u3 f5 d3 c f8',                                 /* 5  subir y bajar */
    'f8 g3 p3 c g3 f8',                                 /* 6  plataforma en el aire */
    'f14 e c f10',                                      /* 7  el primer enemigo */
    'f10 e g2 f8 c f6',                                 /* 8  enemigo y hueco */
    'f8 x3 c f10',                                      /* 9  el primer pincho */
    'f8 x2 f4 x3 c f8',                                 /* 10 pinchos seguidos */
    'f10 e f4 e c f8',                                  /* 11 dos enemigos */
    'f8 g2 p3 c g2 p3 c g2 f8',                         /* 12 saltos de plataforma */
    'f6 u2 f4 u2 f4 u2 c f8 d4 f6',                     /* 13 escalera arriba */
    'f8 g3 f4 g4 f4 c g3 f8',                           /* 14 huecos anchos */
    'f8 e x3 f4 e c f8',                                /* 15 pinchos y enemigos */
    'f6 u3 f4 e u3 f4 c d6 f8',                         /* 16 subida vigilada */
    'f8 u4 f4 x3 f4 d4 c f8',                           /* 17 bajada con pinchos */
    'f8 e g3 x3 g2 p3 c e f8',                          /* 18 de todo un poco */
    'f8 e g3 f6 k c u3 f4 x3 g3 e f6 d3 f8',            /* 19 largo, con punto de control */
    'f10 c k g3 f6 e B'                                 /* 20 el jefe */
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
