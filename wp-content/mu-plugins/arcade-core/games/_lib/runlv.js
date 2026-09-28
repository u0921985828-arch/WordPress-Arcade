/* Tramos a mano de spike-run (plan Friv, F3). Cada nivel es una tira de piezas; el motor las
 * coloca de izquierda a derecha llevando la columna actual (casillas de 32 px).
 *
 *   s<n>   n pinchos seguidos           c<n>   n cajas de una altura
 *   C<n>   n cajas de dos alturas       h<n>   foso de n casillas
 *   f      bicho que camina hacia ti    F      bicho volando (se pisa)
 *   o<n>   arco de n monedas sobre lo anterior
 *   .<n>   n casillas de respiro
 *
 * El nivel termina en una bandera. Sin azar: lo escrito es lo que se juega.
 */
const RUNLV = {
  'spike-run': [
    /*  1 */ '.6 s1 o3 .7 s1 .7 c1 o3 .8',
    /*  2 */ '.6 s1 .6 s2 o3 .7 c1 .7 s1 .6',
    /*  3 */ '.6 h2 o4 .7 s2 .6 c1 .6 s1 .7',
    /*  4 */ '.6 s2 .6 h2 .7 c1 o3 .6 s2 .6',
    /*  5 */ '.6 f .8 s2 .6 h2 o4 .7 c1 .6',
    /*  6 */ '.6 s2 .5 c1 .6 f .8 h2 o4 .6 s1 .6',
    /*  7 */ '.6 h3 o4 .6 s2 .5 C1 .6 f .7 s1 .6',
    /*  8 */ '.6 c1 .5 s2 .6 h3 .6 f .7 s2 o3 .6',
    /*  9 */ '.6 s3 .6 C1 o3 .6 h3 .6 f .7 c1 .6',
    /* 10 */ '.6 f .6 s2 .5 h3 .6 C1 .6 s2 o3 .5 c1 .6',
    /* 11 */ '.6 s2 .4 s2 .6 h3 o4 .6 F .7 c1 .5 s1 .6',
    /* 12 */ '.6 C1 .5 f .6 h4 .6 s3 .5 c1 o3 .6 s1 .6',
    /* 13 */ '.6 h3 .5 s2 .5 h3 .6 f .6 C1 o3 .6 s2 .6',
    /* 14 */ '.6 s2 .4 c1 .5 F .6 h4 .6 s3 .5 C1 .6 f .6',
    /* 15 */ '.6 f .5 s3 .5 h3 .5 c1 .5 s2 o3 .5 h3 .6 C1 .6',
    /* 16 */ '.6 C1 .4 s3 .5 F .6 h4 .5 c1 .4 s2 .5 f .6 s2 .6',
    /* 17 */ '.6 s3 .4 h3 .5 C1 .5 f .5 s2 .4 h3 o4 .5 c1 .6',
    /* 18 */ '.6 h4 .5 s3 .4 C1 .5 F .6 s2 .4 f .5 h3 .5 s2 .6',
    /* 19 */ '.6 f .4 s3 .4 h4 .5 C1 .4 s2 .5 F .5 h3 .4 c1 .5 s3 .6',
    /* 20 */ '.6 s3 .4 h4 .4 C1 .4 f .5 s3 .4 h4 .4 F .5 C1 .4 s3 .4 h3 .5 f .6'
  ]
};
