/* Oleadas a mano de los matamarcianos (plan Friv, F3). Sin azar: lo escrito es lo que se juega.
 *
 * Cada oleada es un objeto. Solo `f` es obligatorio; el resto tiene valor por defecto.
 *
 *   f    formación. Una cadena por fila, un carácter por casilla (columnas de 42 px,
 *        de 38 px si la fila llega a 10). La formación se centra sola en el lienzo.
 *          .  hueco
 *          a  raso     (10 pts, 1 impacto)
 *          b  medio    (20 pts, 1 impacto)
 *          c  cabeza   (30 pts, 1 impacto)
 *          d  blindado (40 pts, 2 impactos; lleva aro dorado)
 *          z  saltarín (50 pts, 1 impacto; se descuelga y baja en zigzag)
 *   y0   altura de la primera fila en px (58 por defecto)
 *   sp   velocidad lateral de la flota, 1 = la de siempre
 *   fr   cadencia de disparo de la flota, 1 = la de siempre
 *   dr   cuánto baja la flota al tocar un borde, en px (10 por defecto)
 *   bk   búnkeres, cuatro letras de izquierda a derecha:
 *          F  entero        h  medio derruido        -  sin búnker
 *   dv   segundos entre picados de los saltarines (0 = no pican)
 *   uf   OVNI: 0 ninguno · 1 de vez en cuando · 2 frecuente
 *   bs   jefe: { hp } — nave nodriza de tres fases con barra de vida propia
 *   m    rótulo que se anuncia al empezar la oleada (corto: cabe en el lienzo)
 *
 * Curva: la 1 no dispara casi y va lentísima; el fuego real empieza en la 3, los blindados
 * en la 5, los picados en la 6 y los búnkeres dejan de estar enteros a partir de la 7.
 */
const SHOOLV = {
  'pixel-invaders': [
    /*  1 · llegar y disparar, sin prisa */
    { f: ['bbbbb', 'aaaaa', 'aaaaa'], sp: 0.75, fr: 0.45, dr: 8, uf: 0, m: 'Primer contacto' },
    /*  2 · más frente, primer OVNI */
    { f: ['ccccccc', 'bbbbbbb', 'aaaaaaa', 'aaaaaaa'], sp: 0.9, fr: 0.6, dr: 9, m: 'Se acercan' },
    /*  3 · la formación clásica al completo */
    { f: ['ccccccccc', 'bbbbbbbbb', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1, fr: 0.75, m: 'Formación completa' },
    /*  4 · pocas columnas y muy sueltas: hay que perseguirlas */
    { f: ['c.c.c.c.c', 'b.b.b.b.b', 'a.a.a.a.a', 'a.a.a.a.a'], sp: 1.35, fr: 0.8, dr: 12, m: 'El peine' },
    /*  5 · aparecen los blindados (dos impactos) */
    { f: ['.d.d.d.d.', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.05, fr: 0.85, m: 'Blindados' },
    /*  6 · aparecen los saltarines: se descuelgan y bajan en zigzag */
    { f: ['..z...z..', '.bbbbbbb.', '.aaaaaaa.'], sp: 1.1, fr: 0.7, dv: 4.5, m: 'Picados' },
    /*  7 · pocas filas, muchísima prisa */
    { f: ['aaaaaaaaaa', 'aaaaaaaaaa'], sp: 1.75, fr: 0.8, dr: 14, uf: 2, bk: 'FhhF', m: 'Enjambre' },
    /*  8 · bloque enorme y lento; los búnkeres ya vienen tocados */
    { f: ['.d.....d.', 'ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 0.85, fr: 0.95, dr: 9, bk: 'hFFh', m: 'La muralla' },
    /*  9 · punta de lanza con saltarín en el vértice */
    { f: ['....z....', '...ccc...', '..bbbbb..', '.bbbbbbb.', 'aaaaaaaaa'], sp: 1.1, fr: 0.85, dr: 11, dv: 5, m: 'La cuña' },
    /* 10 · mitad del camino: tres blindados y OVNI a todas horas */
    { f: ['d...d...d', 'ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.05, fr: 1, dr: 11, uf: 2, m: 'Escolta acorazada' },
    /* 11 · sin un solo búnker, pero son pocas y se pueden barrer */
    { f: ['..z...z..', '.aa...aa.', '.aa...aa.'], sp: 1.9, fr: 0.9, dr: 13, dv: 4, bk: '----', m: 'Al descubierto' },
    /* 12 · dos columnas de ataque y un pasillo central protegido */
    { f: ['ccc...ccc', 'bbb...bbb', 'aaa...aaa', 'aaa...aaa'], sp: 1.25, fr: 1, dr: 12, bk: 'F--F', m: 'Dos frentes' },
    /* 13 · lentas, pero disparan sin parar */
    { f: ['bbbbbbbbb', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 0.95, fr: 1.6, m: 'Lluvia de fuego' },
    /* 14 · cuatro saltarines turnándose */
    { f: ['.z.z.z.z.', '.c.c.c.c.', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.1, fr: 0.95, dr: 11, dv: 3.2, m: 'Zigzag doble' },
    /* 15 · reloj de arena: seis filas, empieza pegando alto */
    { f: ['ccccccccc', '.bbbbbbb.', '..bbbbb..', '...aaa...', '..aaaaa..', '.aaaaaaa.'], sp: 1, fr: 1.05, bk: 'hhhh', m: 'Reloj de arena' },
    /* 16 · una fila entera de blindados: hay que insistir */
    { f: ['ddddddddd', 'ccccccccc', 'aaaaaaaaa'], sp: 1.05, fr: 1.15, dr: 11, uf: 2, m: 'Coraza pesada' },
    /* 17 · pocas, rápidas y bajan a zancadas */
    { f: ['.z..z..z.', '.bbbbbbb.', '.aaaaaaa.'], sp: 1.3, fr: 1, dr: 18, dv: 3.5, bk: 'F--F', m: 'Caída rápida' },
    /* 18 · marea de diez columnas con saltarines en los extremos */
    { f: ['zz......zz', 'bbbbbbbbbb', 'aaaaaaaaaa', 'aaaaaaaaaa'], sp: 1.15, fr: 1.15, dv: 3, uf: 2, m: 'La marea' },
    /* 19 · todo a la vez, antes del jefe */
    { f: ['d.d.d.d.d', 'ccccccccc', 'zbbbbbbbz', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.1, fr: 1.25, dr: 11, dv: 3, bk: 'hhhh', m: 'Última línea' },
    /* 20 · la nave nodriza y su escolta */
    { f: ['.c.c.c.c.', '.b.b.b.b.'], y0: 178, sp: 1.2, fr: 0.8, dr: 6, uf: 0, bs: { hp: 30 }, m: 'Nave nodriza' }
  ]
};
