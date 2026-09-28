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

/* ---- starfall-defender ---- */
/* 20 oleadas escritas a mano: nada de azar. El motor (src/eng/shooter.js, modo 'vertical') lee
 * esta tabla, coloca cada grupo en el segundo indicado y da la oleada por superada cuando no
 * queda ninguna nave enemiga.
 *
 * Oleada: { tip, pw, g:[grupos], p:[mejoras], boss:{jefe} }
 *   tip  rótulo de ayuda bajo el número de oleada      pw  disparo con el que empiezas (1-3)
 *
 * Grupo: { t, f, n, k, x, w, sp, gap, hp, fire, pat, bs, sw, d, y, amp, vx, stay, per }
 *   t     segundo de entrada (contado desde el inicio de la oleada)
 *   f     formación:
 *           'fila'  bajan rectas en línea horizontal (sw = vaivén lateral)
 *           'arco'  entran por un lado (d: 1 izquierda→derecha, -1 al revés), trazan un arco
 *                   de altura amp a partir de la altura y, y salen por el otro lado
 *           'kami'  kamikaze: se lanzan hacia donde estás al aparecer y aceleran
 *           'zig'   bajan despacio rebotando en las paredes (vx = velocidad lateral)
 *           'torre' dron blindado que baja hasta la altura y, se queda stay segundos y dispara
 *           'canon' cañonera: torre grande con abanicos de plasma
 *           'mina'  minador: cruza a la altura y soltando minas cada per segundos
 *           'jefe'  saca al jefe de la oleada (campo boss)
 *   n     cuántas naves     k  aspecto 0-3    x  centro 0..1    w  ancho del grupo 0..1
 *   sp    velocidad px/s    gap retardo entre naves (s)        hp resistencia
 *   fire  segundos entre disparos (0 o ausente = no dispara)
 *   pat   'aim' a la nave · 'down' recto abajo · 'fan' abanico de 5 · 'ring' anillo de 8
 *   bs    velocidad de sus balas (px/s)
 *
 * Mejora: { t, x 0..1, k:'P' disparo | 'S' escudo }
 * Jefe:   { name, hp, r, ph:[fases] }; cada fase es una lista de ataques simultáneos:
 *           'anillo' · 'abanico' · 'espiral' · 'barrido' · 'minas' · 'escolta'
 *
 * Curva: la 1 no mata (nada entra antes de 1,8 s y todo baja despacio), cada 5 oleadas aparece
 * algo que no se ha visto (5 kamikazes, 10 jefe, 15 cañonera, 20 jefe final) y a partir de la 8
 * la oleada empieza con el disparo doble o triple (campo pw).
 */
SHOOLV['starfall-defender'] = [
  /*  1 · primer contacto: solo bajan */
  { tip: 'Arrastra para mover la nave', g: [
    { t: 1.8, f: 'fila', n: 3, k: 2, x: 0.5, w: 0.42, sp: 62 },
    { t: 7.5, f: 'fila', n: 4, k: 2, x: 0.36, w: 0.5, sp: 66 },
    { t: 13, f: 'fila', n: 4, k: 2, x: 0.64, w: 0.5, sp: 66 },
    { t: 19, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.72, sp: 70 }
  ], p: [{ t: 10, x: 0.5, k: 'P' }] },

  /*  2 · se balancean y aparece el casco doble */
  { tip: 'Ahora se balancean', g: [
    { t: 1.6, f: 'fila', n: 4, k: 2, x: 0.3, w: 0.46, sp: 70, sw: 26 },
    { t: 6.5, f: 'fila', n: 4, k: 2, x: 0.7, w: 0.46, sp: 70, sw: 26 },
    { t: 11.5, f: 'fila', n: 5, k: 0, x: 0.5, w: 0.76, sp: 74, sw: 30, gap: 0.22 },
    { t: 18, f: 'fila', n: 4, k: 0, x: 0.5, w: 0.5, sp: 76, hp: 2 },
    { t: 24, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.8, sp: 80, sw: 34 }
  ], p: [{ t: 13, x: 0.25, k: 'P' }] },

  /*  3 · entradas en arco */
  { tip: 'Entran en arco por los lados', g: [
    { t: 1.8, f: 'arco', n: 4, k: 1, d: 1, y: 0.18, amp: 110, sp: 160, gap: 0.4 },
    { t: 8, f: 'arco', n: 4, k: 1, d: -1, y: 0.2, amp: 120, sp: 160, gap: 0.4 },
    { t: 14, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.7, sp: 78, sw: 30 },
    { t: 20, f: 'arco', n: 5, k: 1, d: 1, y: 0.24, amp: 130, sp: 170, gap: 0.34 },
    { t: 26, f: 'fila', n: 4, k: 0, x: 0.5, w: 0.56, sp: 80, hp: 2 }
  ], p: [{ t: 11, x: 0.7, k: 'S' }] },

  /*  4 · las primeras balas enemigas */
  { tip: 'Cuidado: ahora disparan', g: [
    { t: 1.8, f: 'fila', n: 4, k: 3, x: 0.5, w: 0.6, sp: 64, hp: 2, fire: 2.8, pat: 'down', bs: 118 },
    { t: 8, f: 'arco', n: 4, k: 1, d: -1, y: 0.2, amp: 110, sp: 165, gap: 0.34 },
    { t: 14, f: 'fila', n: 5, k: 3, x: 0.4, w: 0.7, sp: 68, hp: 2, fire: 2.5, pat: 'down', bs: 124 },
    { t: 21, f: 'fila', n: 5, k: 2, x: 0.6, w: 0.7, sp: 82, sw: 30 },
    { t: 27, f: 'arco', n: 4, k: 1, d: 1, y: 0.22, amp: 125, sp: 172, gap: 0.34 }
  ], p: [{ t: 9, x: 0.4, k: 'P' }, { t: 23, x: 0.65, k: 'S' }] },

  /*  5 · NUEVO: kamikazes */
  { tip: '¡Kamikazes! No te quedes quieto', g: [
    { t: 2, f: 'kami', n: 3, k: 0, x: 0.5, w: 0.6, sp: 145, gap: 0.55 },
    { t: 8, f: 'fila', n: 5, k: 3, x: 0.5, w: 0.7, sp: 68, hp: 2, fire: 2.5, pat: 'down', bs: 124 },
    { t: 14.5, f: 'kami', n: 4, k: 0, x: 0.5, w: 0.8, sp: 155, gap: 0.45 },
    { t: 21, f: 'arco', n: 4, k: 1, d: 1, y: 0.2, amp: 120, sp: 172, gap: 0.34 },
    { t: 27, f: 'kami', n: 4, k: 0, x: 0.5, w: 0.85, sp: 160, gap: 0.4 }
  ], p: [{ t: 12, x: 0.5, k: 'S' }, { t: 25, x: 0.3, k: 'P' }] },

  /*  6 · NUEVO: torreta blindada */
  { tip: 'Torreta blindada: aguanta 12 impactos', g: [
    { t: 1.6, f: 'fila', n: 4, k: 2, x: 0.5, w: 0.6, sp: 76, sw: 30 },
    { t: 6, f: 'torre', n: 1, x: 0.5, y: 0.2, sp: 70, sw: 70, stay: 15, hp: 12, fire: 1.7, pat: 'aim', bs: 132 },
    { t: 12, f: 'arco', n: 4, k: 1, d: -1, y: 0.3, amp: 100, sp: 168, gap: 0.34 },
    { t: 19, f: 'fila', n: 5, k: 3, x: 0.45, w: 0.72, sp: 70, hp: 2, fire: 2.4, pat: 'down', bs: 126 },
    { t: 26, f: 'kami', n: 4, k: 0, x: 0.5, w: 0.8, sp: 158, gap: 0.42 }
  ], p: [{ t: 10, x: 0.75, k: 'P' }, { t: 22, x: 0.35, k: 'S' }] },

  /*  7 · NUEVO: cazas en zigzag */
  { tip: 'Cazas en zigzag', g: [
    { t: 1.8, f: 'zig', n: 3, k: 1, x: 0.4, w: 0.5, sp: 52, vx: 130, gap: 0.5 },
    { t: 8, f: 'fila', n: 5, k: 3, x: 0.55, w: 0.7, sp: 70, hp: 2, fire: 2.3, pat: 'down', bs: 128 },
    { t: 14, f: 'zig', n: 4, k: 1, x: 0.6, w: 0.6, sp: 56, vx: 145, gap: 0.45 },
    { t: 21, f: 'arco', n: 5, k: 1, d: 1, y: 0.22, amp: 125, sp: 175, gap: 0.3 },
    { t: 27, f: 'fila', n: 4, k: 0, x: 0.5, w: 0.6, sp: 84, hp: 3, sw: 30 }
  ], p: [{ t: 11, x: 0.3, k: 'P' }, { t: 24, x: 0.6, k: 'S' }] },

  /*  8 · dos frentes a la vez */
  { tip: 'Dos frentes a la vez', pw: 2, g: [
    { t: 1.6, f: 'arco', n: 4, k: 1, d: 1, y: 0.18, amp: 115, sp: 175, gap: 0.3 },
    { t: 3.2, f: 'arco', n: 4, k: 1, d: -1, y: 0.26, amp: 115, sp: 175, gap: 0.3 },
    { t: 10, f: 'torre', n: 1, x: 0.32, y: 0.22, sp: 74, sw: 60, stay: 14, hp: 12, fire: 1.6, pat: 'aim', bs: 134 },
    { t: 13, f: 'fila', n: 5, k: 3, x: 0.7, w: 0.5, sp: 72, hp: 2, fire: 2.2, pat: 'down', bs: 130 },
    { t: 21, f: 'kami', n: 5, k: 0, x: 0.5, w: 0.85, sp: 162, gap: 0.38 },
    { t: 28, f: 'zig', n: 4, k: 1, x: 0.5, w: 0.6, sp: 58, vx: 150, gap: 0.4 }
  ], p: [{ t: 12, x: 0.6, k: 'S' }, { t: 26, x: 0.4, k: 'P' }] },

  /*  9 · víspera del jefe */
  { tip: 'Aguanta: el jefe está cerca', pw: 2, g: [
    { t: 1.6, f: 'fila', n: 6, k: 3, x: 0.5, w: 0.86, sp: 72, hp: 2, fire: 2.2, pat: 'down', bs: 132, gap: 0.18 },
    { t: 8, f: 'kami', n: 4, k: 0, x: 0.3, w: 0.5, sp: 165, gap: 0.35 },
    { t: 11, f: 'kami', n: 4, k: 0, x: 0.7, w: 0.5, sp: 165, gap: 0.35 },
    { t: 17, f: 'torre', n: 1, x: 0.5, y: 0.24, sp: 76, sw: 80, stay: 16, hp: 14, fire: 1.4, pat: 'aim', bs: 138 },
    { t: 20, f: 'arco', n: 5, k: 1, d: -1, y: 0.34, amp: 110, sp: 178, gap: 0.28 },
    { t: 28, f: 'zig', n: 5, k: 1, x: 0.5, w: 0.7, sp: 60, vx: 155, gap: 0.35 }
  ], p: [{ t: 10, x: 0.5, k: 'S' }, { t: 24, x: 0.5, k: 'P' }] },

  /* 10 · NUEVO: JEFE — Guardián de Hierro (3 fases) */
  { tip: 'Guardián de Hierro', pw: 2, g: [
    { t: 1.6, f: 'fila', n: 4, k: 2, x: 0.5, w: 0.6, sp: 76, sw: 30 },
    { t: 7, f: 'jefe' }
  ], p: [{ t: 4, x: 0.5, k: 'S' }],
    boss: { name: 'Guardián de Hierro', hp: 80, r: 34, ph: [['anillo'], ['abanico', 'escolta'], ['espiral', 'barrido']] } },

  /* 11 · NUEVO: minadores */
  { tip: 'Minadores: las minas se pueden disparar', pw: 2, g: [
    { t: 1.8, f: 'mina', n: 1, d: 1, y: 0.16, sp: 66, per: 1.7, hp: 6 },
    { t: 7, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.74, sp: 78, sw: 30 },
    { t: 13, f: 'mina', n: 1, d: -1, y: 0.2, sp: 70, per: 1.5, hp: 6 },
    { t: 19, f: 'arco', n: 5, k: 1, d: 1, y: 0.3, amp: 110, sp: 175, gap: 0.3 },
    { t: 26, f: 'fila', n: 5, k: 3, x: 0.5, w: 0.7, sp: 74, hp: 2, fire: 2.2, pat: 'down', bs: 132 }
  ], p: [{ t: 10, x: 0.3, k: 'P' }, { t: 22, x: 0.7, k: 'S' }] },

  /* 12 · minas y kamikazes */
  { tip: 'Minas arriba, kamikazes abajo', pw: 2, g: [
    { t: 1.8, f: 'mina', n: 1, d: -1, y: 0.15, sp: 72, per: 1.5, hp: 7 },
    { t: 5, f: 'kami', n: 4, k: 0, x: 0.5, w: 0.8, sp: 165, gap: 0.4 },
    { t: 12, f: 'torre', n: 1, x: 0.6, y: 0.24, sp: 76, sw: 70, stay: 14, hp: 14, fire: 1.5, pat: 'aim', bs: 138 },
    { t: 15, f: 'mina', n: 1, d: 1, y: 0.19, sp: 74, per: 1.4, hp: 7 },
    { t: 23, f: 'zig', n: 5, k: 1, x: 0.5, w: 0.7, sp: 60, vx: 152, gap: 0.35 },
    { t: 30, f: 'fila', n: 6, k: 3, x: 0.5, w: 0.86, sp: 76, hp: 2, fire: 2, pat: 'down', bs: 134, gap: 0.16 }
  ], p: [{ t: 9, x: 0.5, k: 'S' }, { t: 25, x: 0.4, k: 'P' }] },

  /* 13 · torres dobles */
  { tip: 'Dos torretas: escoge una', pw: 2, g: [
    { t: 1.8, f: 'torre', n: 1, x: 0.26, y: 0.2, sp: 78, sw: 50, stay: 16, hp: 13, fire: 1.5, pat: 'aim', bs: 138 },
    { t: 3.2, f: 'torre', n: 1, x: 0.74, y: 0.27, sp: 78, sw: 50, stay: 16, hp: 13, fire: 1.5, pat: 'aim', bs: 138 },
    { t: 10, f: 'arco', n: 5, k: 1, d: 1, y: 0.4, amp: 95, sp: 178, gap: 0.28 },
    { t: 17, f: 'kami', n: 5, k: 0, x: 0.5, w: 0.85, sp: 168, gap: 0.35 },
    { t: 24, f: 'fila', n: 6, k: 3, x: 0.5, w: 0.86, sp: 76, hp: 2, fire: 2, pat: 'down', bs: 136, gap: 0.16 }
  ], p: [{ t: 12, x: 0.5, k: 'P' }, { t: 22, x: 0.2, k: 'S' }] },

  /* 14 · cascada de kamikazes */
  { tip: 'Cascada de kamikazes', pw: 2, g: [
    { t: 1.8, f: 'kami', n: 4, k: 0, x: 0.25, w: 0.4, sp: 165, gap: 0.3 },
    { t: 5, f: 'kami', n: 4, k: 0, x: 0.75, w: 0.4, sp: 165, gap: 0.3 },
    { t: 8.5, f: 'kami', n: 5, k: 0, x: 0.5, w: 0.9, sp: 172, gap: 0.28 },
    { t: 14, f: 'mina', n: 1, d: 1, y: 0.17, sp: 76, per: 1.4, hp: 8 },
    { t: 20, f: 'zig', n: 5, k: 1, x: 0.5, w: 0.7, sp: 62, vx: 158, gap: 0.32 },
    { t: 27, f: 'fila', n: 6, k: 3, x: 0.5, w: 0.86, sp: 78, hp: 3, fire: 2, pat: 'down', bs: 136, gap: 0.16 }
  ], p: [{ t: 11, x: 0.5, k: 'S' }, { t: 24, x: 0.6, k: 'P' }] },

  /* 15 · NUEVO: cañonera */
  { tip: 'Cañonera: abanicos de plasma', pw: 2, g: [
    { t: 1.8, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.74, sp: 80, sw: 32 },
    { t: 7, f: 'canon', n: 1, x: 0.5, y: 0.24, sp: 62, sw: 80, stay: 20, hp: 22, fire: 2.4, pat: 'fan', bs: 142 },
    { t: 14, f: 'arco', n: 5, k: 1, d: -1, y: 0.42, amp: 100, sp: 180, gap: 0.26 },
    { t: 21, f: 'kami', n: 5, k: 0, x: 0.5, w: 0.85, sp: 170, gap: 0.32 },
    { t: 28, f: 'mina', n: 1, d: 1, y: 0.18, sp: 78, per: 1.3, hp: 8 }
  ], p: [{ t: 10, x: 0.25, k: 'S' }, { t: 24, x: 0.5, k: 'P' }] },

  /* 16 · muro de fuego */
  { tip: 'Muro de fuego', pw: 2, g: [
    { t: 1.8, f: 'fila', n: 7, k: 3, x: 0.5, w: 0.9, sp: 74, hp: 2, fire: 1.9, pat: 'down', bs: 138, gap: 0.14 },
    { t: 9, f: 'kami', n: 5, k: 0, x: 0.5, w: 0.9, sp: 172, gap: 0.3 },
    { t: 15, f: 'torre', n: 1, x: 0.4, y: 0.22, sp: 80, sw: 80, stay: 15, hp: 14, fire: 1.35, pat: 'aim', bs: 142 },
    { t: 17, f: 'mina', n: 1, d: -1, y: 0.16, sp: 80, per: 1.3, hp: 8 },
    { t: 25, f: 'zig', n: 6, k: 1, x: 0.5, w: 0.8, sp: 64, vx: 160, gap: 0.3 }
  ], p: [{ t: 12, x: 0.7, k: 'P' }, { t: 26, x: 0.3, k: 'S' }] },

  /* 17 · arcos cruzados */
  { tip: 'Arcos cruzados', pw: 2, g: [
    { t: 1.6, f: 'arco', n: 5, k: 1, d: 1, y: 0.18, amp: 120, sp: 182, gap: 0.24 },
    { t: 2.6, f: 'arco', n: 5, k: 1, d: -1, y: 0.3, amp: 120, sp: 182, gap: 0.24 },
    { t: 10, f: 'torre', n: 1, x: 0.24, y: 0.22, sp: 80, sw: 60, stay: 16, hp: 14, fire: 1.4, pat: 'aim', bs: 142 },
    { t: 11.5, f: 'torre', n: 1, x: 0.76, y: 0.3, sp: 80, sw: 60, stay: 16, hp: 14, fire: 1.4, pat: 'aim', bs: 142 },
    { t: 19, f: 'kami', n: 6, k: 0, x: 0.5, w: 0.9, sp: 175, gap: 0.28 },
    { t: 26, f: 'fila', n: 6, k: 3, x: 0.5, w: 0.86, sp: 80, hp: 3, fire: 1.9, pat: 'down', bs: 140, gap: 0.14 }
  ], p: [{ t: 9, x: 0.5, k: 'S' }, { t: 23, x: 0.5, k: 'P' }] },

  /* 18 · cañonera con escolta */
  { tip: 'Cañonera con escolta', pw: 3, g: [
    { t: 1.8, f: 'canon', n: 1, x: 0.4, y: 0.24, sp: 64, sw: 90, stay: 22, hp: 24, fire: 2.1, pat: 'fan', bs: 146 },
    { t: 4, f: 'zig', n: 4, k: 1, x: 0.6, w: 0.6, sp: 64, vx: 160, gap: 0.35 },
    { t: 12, f: 'mina', n: 1, d: 1, y: 0.15, sp: 82, per: 1.2, hp: 9 },
    { t: 18, f: 'arco', n: 6, k: 1, d: -1, y: 0.4, amp: 105, sp: 185, gap: 0.24 },
    { t: 25, f: 'kami', n: 6, k: 0, x: 0.5, w: 0.9, sp: 178, gap: 0.26 }
  ], p: [{ t: 10, x: 0.3, k: 'S' }, { t: 22, x: 0.7, k: 'S' }] },

  /* 19 · todo a la vez */
  { tip: 'Todo a la vez', pw: 3, g: [
    { t: 1.6, f: 'fila', n: 7, k: 3, x: 0.5, w: 0.92, sp: 80, hp: 3, fire: 1.8, pat: 'down', bs: 144, gap: 0.12 },
    { t: 6, f: 'mina', n: 1, d: -1, y: 0.14, sp: 84, per: 1.2, hp: 9 },
    { t: 10, f: 'torre', n: 1, x: 0.5, y: 0.26, sp: 82, sw: 95, stay: 18, hp: 16, fire: 1.25, pat: 'aim', bs: 146 },
    { t: 16, f: 'kami', n: 5, k: 0, x: 0.28, w: 0.45, sp: 178, gap: 0.24 },
    { t: 18, f: 'kami', n: 5, k: 0, x: 0.72, w: 0.45, sp: 178, gap: 0.24 },
    { t: 25, f: 'arco', n: 6, k: 1, d: 1, y: 0.36, amp: 115, sp: 186, gap: 0.22 },
    { t: 32, f: 'zig', n: 6, k: 1, x: 0.5, w: 0.8, sp: 66, vx: 165, gap: 0.28 }
  ], p: [{ t: 8, x: 0.5, k: 'S' }, { t: 21, x: 0.4, k: 'P' }, { t: 30, x: 0.6, k: 'S' }] },

  /* 20 · NUEVO: JEFE FINAL — Corazón de Starfall (4 fases) */
  { tip: 'Corazón de Starfall', pw: 3, g: [
    { t: 1.6, f: 'fila', n: 5, k: 3, x: 0.5, w: 0.8, sp: 78, hp: 2, fire: 2.2, pat: 'down', bs: 138, gap: 0.16 },
    { t: 8, f: 'jefe' }
  ], p: [{ t: 5, x: 0.5, k: 'S' }, { t: 6, x: 0.3, k: 'P' }],
    boss: { name: 'Corazón de Starfall', hp: 130, r: 38,
      ph: [['anillo'], ['abanico', 'minas'], ['espiral', 'escolta'], ['anillo', 'barrido', 'escolta']] } }
];
