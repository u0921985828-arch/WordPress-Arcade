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
 *   B     zona de jefe (14 casillas llanas); la bandera solo aparece al derrotarlo
 *
 * La bandera se coloca sola al final. Ningún nivel usa el azar: el que diseñamos es el que se juega.
 */
const PLATLV = {
  /* ---- pixel-dash: correr, saltar, pisar. 20 niveles, jefe en el 20.
     Ritmo de recompensa (docs/GANCHO.md §A2): nunca se corre más de ~3 s sin algo que recoger,
     por eso casi cada tramo lleva su reguero (C) o su arco (c), y de la 3 en adelante una gema. ---- */
  'pixel-dash': [
    'f10 C f6 c f8',                                        /* 1  correr y llegar */
    'f8 C g2 c f8 C f6',                                    /* 2  el primer hueco */
    'f8 C g2 f6 c g3 G f8 C',                               /* 3  tres huecos */
    'f8 C u2 f6 c f6 C d2 f6',                              /* 4  subir un escalón */
    'f8 C u3 f5 c d3 f8 C G f6',                            /* 5  subir y bajar */
    'f8 C g3 p3 c g3 f8 C G f6',                            /* 6  plataforma en el aire */
    'f10 C e c f8 C f8',                                    /* 7  el primer enemigo */
    'f10 C e g2 c f8 C G f8',                               /* 8  enemigo y hueco */
    'f8 C x3 f6 c G f8 C',                                  /* 9  el primer pincho */
    'f8 C x2 f5 c x3 f6 C G f8',                            /* 10 pinchos seguidos */
    'f10 C e f5 e c f8 C G f6',                             /* 11 dos enemigos */
    'f8 C g2 p3 c g2 p3 c g2 f8 C G',                       /* 12 saltos de plataforma */
    'f6 C u2 f4 u2 f4 c u2 f6 C G d6 f8 C',                 /* 13 escalera arriba */
    'f8 C g3 f5 C g4 f5 c g3 f8 C G',                       /* 14 huecos anchos */
    'f8 C e x3 f5 e c f8 C G f6',                           /* 15 pinchos y enemigos */
    'f6 C u3 f5 e u3 f5 c G d6 f8 C',                       /* 16 subida vigilada */
    'f8 C u4 f5 x3 f5 c d4 f8 C G f6',                      /* 17 bajada con pinchos */
    'f8 C e g3 x3 g2 p3 c e f8 C G f6',                     /* 18 de todo un poco */
    'f8 C e g3 f6 k c u3 f5 x3 g3 e f6 C d3 f8 G C f6',     /* 19 largo, con punto de control */
    'f10 C k g3 f6 C e G f6 B'                              /* 20 el jefe */
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
