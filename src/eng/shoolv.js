/* Oleadas a mano de los matamarcianos (plan Friv, tandas 2 y 7). Sin azar: lo escrito es lo que se juega.
 *
 * ============================== pixel-invaders ==============================
 * Cada NIVEL es un objeto con varias OLAS (`ph`): al limpiar una entra la siguiente deslizándose
 * desde arriba, así el nivel dura 40–70 s de verdad en vez de cruzarse en veinte segundos.
 *
 *   n    nombre del nivel (se anuncia al empezar)
 *   tip  consejo corto del nivel
 *   t    [fácil, normal, difícil] segundos objetivo de la 2ª estrella
 *   ph   lista de olas; cada ola es { f, y0, sp, fr, dr, dv, bs }
 *   uf   OVNIs de contrabando: lista de segundos de aparición. Son los TESOROS del nivel:
 *        valen 150 puntos y hay que salir del hueco seguro a por ellos. La 3ª estrella pide
 *        derribarlos todos, así que la recompensa nunca es gratis.
 *   bk   búnkeres, cuatro letras de izquierda a derecha: F entero · h medio derruido · - ninguno
 *   mt   segundos entre METEOROS (0 = ninguno). Caen tras 1,2 s de sombra de aviso, rompen
 *        búnker y aguantan dos impactos (40 puntos).
 *   ry   segundos entre RAYOS TRAZADORES (0 = ninguno). Marcan la columna 1,15 s antes; el
 *        búnker los absorbe.
 *   dv   segundos entre picados de los saltarines (se puede repetir por ola)
 *   gc   segundos entre salvas de los artilleros (4,2 por defecto)
 *   mc   segundos entre bombas de los minadores (3,4 por defecto)
 *   cp   1 = punto de control entre olas (niveles de la segunda mitad). Al reintentar se
 *        empieza en la última ola limpiada, pero el nivel solo puntúa 1★.
 *
 * Formación: una cadena por fila, un carácter por casilla (columnas de 42 px, de 38 px si la
 * fila llega a 10). Se centra sola en el lienzo.
 *   .  hueco
 *   a  raso      (10 pts, 1 impacto)
 *   b  medio     (20 pts, 1 impacto)
 *   c  cabeza    (30 pts, 1 impacto)
 *   d  blindado  (40 pts, 2 impactos; lleva aro dorado)
 *   z  saltarín  (50 pts, 1 impacto; se descuelga y baja en zigzag)
 *   e  ESCUDERO  (60 pts, 3 impactos): mientras vive, los bichos de las columnas DE AL LADO
 *                son intocables (se marcan con un halo azul). Su propia columna queda expuesta:
 *                por ahí se le derriba.
 *   g  ARTILLERO (70 pts, 2 impactos): carga 0,95 s marcando la línea de tiro y suelta tres
 *                plomos dirigidos.
 *   h  ENJAMBRADOR (80 pts, 2 impactos): al morir suelta dos crías que bajan en zigzag.
 *   m  MINADOR   (60 pts, 2 impactos): suelta bombas lentas que estallan en abanico al llegar
 *                abajo. Se pueden disparar.
 *
 * Curva de verbos (uno por nivel, luego combinados): 1-3 escuela · 4 blindado · 5 saltarín ·
 * 6 escudero · 7 artillero · 8 minador · 9 meteoros · 10 JEFE Crucero de Asalto ·
 * 11 enjambrador · 12 rayo trazador · 13-19 combinaciones de dos y de tres · 20 JEFE Nave Nodriza.
 */
const SHOOLV = {
  'pixel-invaders': [
    /*  1 */ { n: 'Primer contacto', tip: 'Mantén pulsado para disparar sin parar.', t: [65, 61, 58], uf: [16, 40], bk: 'FFFF',
      ph: [{ f: ['bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 0.7, fr: 0.3, dr: 7 },
           { f: ['ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 0.8, fr: 0.38, dr: 7 },
           { f: ['ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 0.9, fr: 0.47, dr: 7 }] },

    /*  2 */ { n: 'Contrabando', tip: 'Los OVNIs valen 150: sal del hueco y ve a por ellos.', t: [55, 52, 49], uf: [8, 18, 28, 38], bk: 'FFFF',
      ph: [{ f: ['ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 0.9, fr: 0.42, dr: 6 },
           { f: ['c.c.c.c.c', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.05, fr: 0.51, dr: 6 }] },

    /*  3 */ { n: 'Formación completa', tip: 'Abre un pasillo por un lado y sube por él.', t: [72, 68, 64], uf: [12, 30, 46], bk: 'FFFF',
      ph: [{ f: ['ccccccccc', 'bbbbbbbbb', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1, fr: 0.51, dr: 5 },
           { f: ['ccccccccc', 'bbbbbbbbb', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.15, fr: 0.59, dr: 5 }] },

    /*  4 */ { n: 'Blindados', tip: 'Los del aro dorado aguantan dos impactos.', t: [65, 61, 58], uf: [14, 34], bk: 'FFFF',
      ph: [{ f: ['.d.d.d.d.', 'ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 0.95, fr: 0.51, dr: 6 },
           { f: ['d.d.d.d.d', 'bbbbbbbbb', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.1, fr: 0.59, dr: 5 }] },

    /*  5 */ { n: 'Picados', tip: 'El saltarín se descuelga: no te quedes bajo su columna.', t: [67, 64, 60], uf: [12, 32], bk: 'FFFF', dv: 4.6,
      ph: [{ f: ['..z...z..', '.ccccccc.', '.bbbbbbb.', '.aaaaaaa.'], sp: 1, fr: 0.51, dr: 6 },
           { f: ['.z.z.z.z.', 'ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.1, fr: 0.59, dr: 5, dv: 4 },
           { f: ['z...z...z', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.25, fr: 0.64, dr: 7, dv: 3.6 }] },

    /*  6 */ { n: 'Escuderos', tip: 'El escudero cubre las columnas de al lado: dispara por la suya.', t: [79, 75, 71], uf: [14, 36], bk: 'FFFF',
      ph: [{ f: ['..e...e..', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 0.95, fr: 0.51, dr: 7 },
           { f: ['.e.e.e.e.', 'ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.05, fr: 0.59, dr: 6 },
           { f: ['e...e...e', 'bbbbbbbbb', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.15, fr: 0.64, dr: 6 }] },

    /*  7 */ { n: 'Artilleros', tip: 'Cuando el artillero marca la línea, sal de ella.', t: [72, 68, 64], uf: [12, 30, 48], bk: 'FFFF', gc: 4.4,
      ph: [{ f: ['..g...g..', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 0.95, fr: 0.42, dr: 7 },
           { f: ['.g.g.g.g.', 'ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.05, fr: 0.51, dr: 6 },
           { f: ['g..g..g..', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.15, fr: 0.59, dr: 6 }] },

    /*  8 */ { n: 'Minadores', tip: 'Las bombas se pueden disparar antes de que caigan.', t: [72, 68, 64], uf: [14, 34], bk: 'FFFF', mc: 3.4,
      ph: [{ f: ['..m...m..', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 0.95, fr: 0.42, dr: 7 },
           { f: ['.m.m.m.m.', 'ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.05, fr: 0.51, dr: 6 },
           { f: ['m...m...m', 'bbbbbbbbb', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.15, fr: 0.59, dr: 6 }] },

    /*  9 */ { n: 'Lluvia de piedra', tip: 'La sombra avisa del meteoro 1,2 s antes.', t: [69, 65, 62], uf: [16, 40], bk: 'hFFh', mt: 5.4,
      ph: [{ f: ['ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1, fr: 0.51, dr: 7 },
           { f: ['c.c.c.c.c', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.1, fr: 0.59, dr: 6 },
           { f: ['ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.2, fr: 0.68, dr: 7 }] },

    /* 10 */ { n: 'Crucero de Asalto', tip: 'Se prepara antes de disparar: golpéalo entre salvas.', t: [66, 62, 59], uf: [12, 30], bk: 'FFFF',
      ph: [{ f: ['ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1, fr: 0.55, dr: 6 },
           { f: ['.c.c.c.c.', '.b.b.b.b.'], y0: 168, sp: 1.15, fr: 0.51, dr: 6, bs: { hp: 30, name: 'Crucero de Asalto', ph: 2 } }] },

    /* 11 */ { n: 'Enjambradores', tip: 'Al morir suelta dos crías: prepárate para el picado.', t: [72, 68, 64], uf: [14, 38], bk: 'FFFF', cp: 1,
      ph: [{ f: ['..h...h..', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 0.95, fr: 0.47, dr: 7 },
           { f: ['.h.h.h.h.', 'ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.05, fr: 0.55, dr: 6 },
           { f: ['h..h..h..', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.15, fr: 0.64, dr: 6 }] },

    /* 12 */ { n: 'Rayo trazador', tip: 'La columna marcada es mortal, pero el búnker la absorbe.', t: [71, 67, 64], uf: [12, 34], bk: 'F--F', ry: 6.4, cp: 1,
      ph: [{ f: ['ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1, fr: 0.51, dr: 7 },
           { f: ['.d.d.d.d.', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.1, fr: 0.59, dr: 6 },
           { f: ['ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.2, fr: 0.68, dr: 7 }] },

    /* 13 */ { n: 'Escudo y cañón', tip: 'El halo azul es intocable: baja antes al escudero.', t: [77, 73, 69], uf: [12, 32, 52], bk: 'hFFh', gc: 4.2, cp: 1,
      ph: [{ f: ['.e.g.e.g.', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1, fr: 0.51, dr: 7 },
           { f: ['e.g.e.g.e', 'ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.1, fr: 0.59, dr: 6 },
           { f: ['.g.e.g.e.', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.2, fr: 0.68, dr: 7 }] },

    /* 14 */ { n: 'Bombas y piedra', tip: 'Dispara a las bombas antes de que toquen el suelo.', t: [65, 61, 58], uf: [14, 36], bk: 'hhhh', mt: 5.2, mc: 3.2, cp: 1,
      ph: [{ f: ['..m...m..', 'ccccccccc', 'aaaaaaaaa'], sp: 1, fr: 0.51, dr: 7 },
           { f: ['.m.m.m.m.', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.1, fr: 0.59, dr: 6 },
           { f: ['m...m...m', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.2, fr: 0.68, dr: 7 }] },

    /* 15 */ { n: 'Enjambre y rayo', tip: 'Con el rayo marcado, olvida las crías un segundo.', t: [70, 66, 62], uf: [12, 34, 54], bk: 'F--F', ry: 6.2, dv: 4, cp: 1,
      ph: [{ f: ['..h...h..', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1, fr: 0.51, dr: 7 },
           { f: ['.h.h.z.z.', 'ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.1, fr: 0.59, dr: 6 },
           { f: ['h..z..h..', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.2, fr: 0.68, dr: 6 }] },

    /* 16 */ { n: 'Coraza pesada', tip: 'Una fila entera de blindados: insiste por una columna.', t: [78, 74, 70], uf: [14, 38], bk: 'hFFh', dv: 3.8, cp: 1,
      ph: [{ f: ['.e.d.e.d.', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1, fr: 0.51, dr: 7 },
           { f: ['ddddddddd', '.e.e.e.e.', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.05, fr: 0.64, dr: 6 },
           { f: ['.z.z.z.z.', 'ccccccccc', 'bbbbbbbbb'], sp: 1.2, fr: 0.68, dr: 7 }] },

    /* 17 */ { n: 'Tormenta', tip: 'Meteoros, rayo y artilleros: mira arriba antes de moverte.', t: [65, 61, 58], uf: [12, 32, 52], bk: 'F--F', mt: 5, ry: 7, gc: 4, cp: 1,
      ph: [{ f: ['..g...g..', 'ccccccccc', 'bbbbbbbbb'], sp: 1, fr: 0.51, dr: 7 },
           { f: ['.g.g.g.g.', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.1, fr: 0.59, dr: 6 },
           { f: ['g..g..g..', 'ccccccccc', 'aaaaaaaaa'], sp: 1.2, fr: 0.68, dr: 7 }] },

    /* 18 */ { n: 'Desguace', tip: 'Escudero, minador y enjambrador a la vez: por orden.', t: [79, 75, 71], uf: [14, 36, 56], bk: 'hhhh', mc: 3.2, cp: 1,
      ph: [{ f: ['.m.h.m.h.', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1, fr: 0.51, dr: 7 },
           { f: ['e.m.h.m.e', 'ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.1, fr: 0.59, dr: 6 },
           { f: ['h..e..m..', 'bbbbbbbbb', 'aaaaaaaaa', 'aaaaaaaaa'], sp: 1.2, fr: 0.68, dr: 6 }] },

    /* 19 */ { n: 'Última línea', tip: 'Todo lo aprendido, sin un hueco donde respirar.', t: [86, 82, 77], uf: [12, 32, 52], bk: 'hh--', mt: 5.4, ry: 7, dv: 3.6, gc: 4, mc: 3.2, cp: 1,
      ph: [{ f: ['d.e.g.e.d', 'ccccccccc', 'bbbbbbbbb'], sp: 1, fr: 0.55, dr: 7 },
           { f: ['.h.m.z.m.h', 'cccccccccc', 'bbbbbbbbbb', 'aaaaaaaaaa'], sp: 1.1, fr: 0.64, dr: 6 },
           { f: ['e.g.h.g.e', 'ddddddddd', 'aaaaaaaaa'], sp: 1.2, fr: 0.68, dr: 7 }] },

    /* 20 */ { n: 'Nave Nodriza', tip: 'Tres fases telegrafiadas: pega cuando termine la salva.', t: [89, 85, 80], uf: [14, 34], bk: 'FFFF', cp: 1,
      ph: [{ f: ['ccccccccc', 'bbbbbbbbb', 'aaaaaaaaa'], sp: 1.05, fr: 0.55, dr: 7 },
           { f: ['.e.e.e.e.', 'bbbbbbbbb'], sp: 1.15, fr: 0.59, dr: 7 },
           { f: ['.c.c.c.c.', '.b.b.b.b.'], y0: 178, sp: 1.2, fr: 0.51, dr: 6, bs: { hp: 44, name: 'Nave Nodriza', ph: 3 } }] }
  ]
};

/* ============================== starfall-defender ==============================
 * 20 oleadas escritas a mano: nada de azar. El motor (src/eng/shooter.js, modo 'vertical') lee
 * esta tabla, coloca cada grupo en el segundo indicado y da la oleada por superada cuando no
 * queda ninguna nave enemiga. Cada oleada llena 42–62 s de cronología.
 *
 * Oleada: { tip, pw, g:[grupos], p:[mejoras], cap:[cápsulas], pt:[f,n,d], cp, boss:{jefe} }
 *   tip  rótulo de ayuda bajo el número de oleada      pw  disparo con el que empiezas (1-3)
 *   pt   puntuación objetivo de la 2ª estrella, por dificultad. Solo se llega recogiendo las
 *        cápsulas y rompiendo lo opcional (asteroides, minas, núcleos), no limpiando lo justo.
 *   cap  CÁPSULAS DE RESCATE: [{t, x}] segundo y posición 0..1. Valen 120 puntos y suben el
 *        disparo; son los TESOROS de la oleada (la 3ª estrella pide todas).
 *   cp   segundo del punto de control. Si pasas de ahí y caes, el reintento empieza ahí, pero
 *        la oleada solo puntúa 1★.
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
 *           'nucleo' NÚCLEO INESTABLE: al reventar suelta un anillo de ocho plasmas. Mátalo
 *                   lejos (45 pts). Late y lleva aura: nunca sorprende.
 *           'roca'  ASTEROIDE: baja despacio, aguanta cuatro impactos (90 pts) y si te roza
 *                   duele sin romperse. Hay que apartarse o romperlo a tiempo.
 *           'caza'  INTERCEPTOR ESPEJO: baja hasta y y se coloca en tu reflejo respecto al
 *                   centro, disparando recto. Para alcanzarlo hay que cruzar el centro.
 *           'esc'   ESCOLTADO: nave nodriza pequeña con dos drones en órbita. Mientras quede
 *                   un dron, la nodriza es intocable (los tiros rebotan).
 *           'rayo'  LANZA DE PLASMA: torre que carga 1,25 s marcando su columna y suelta un haz
 *                   mortal de 0,45 s. Se esquiva de lado; el aviso nunca baja de 1,2 s.
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
 * Curva de verbos: 1-5 lo de siempre (fila, vaivén, arco, disparo, kamikaze) · 6 núcleo ·
 * 7 torreta · 8 asteroide · 9 víspera · 10 JEFE Guardián de Hierro · 11 minador ·
 * 12 interceptor · 13 escoltado · 14 cascada · 15 cañonera · 16 lanza de plasma ·
 * 17-19 combinaciones · 20 JEFE FINAL Corazón de Starfall.
 */
SHOOLV['starfall-defender'] = [
  /*  1 · primer contacto: solo bajan */
  { tip: 'Arrastra para mover la nave', pt: [800, 850, 850], cap: [{ t: 20, x: 0.5 }], g: [
    { t: 1.8, f: 'fila', n: 3, k: 2, x: 0.5, w: 0.42, sp: 62 },
    { t: 7.5, f: 'fila', n: 4, k: 2, x: 0.36, w: 0.5, sp: 66 },
    { t: 13, f: 'fila', n: 4, k: 2, x: 0.64, w: 0.5, sp: 66 },
    { t: 19, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.72, sp: 70 },
    { t: 26, f: 'fila', n: 5, k: 2, x: 0.34, w: 0.6, sp: 72 },
    { t: 32, f: 'fila', n: 5, k: 2, x: 0.66, w: 0.6, sp: 72 },
    { t: 39, f: 'fila', n: 6, k: 2, x: 0.5, w: 0.86, sp: 74, gap: 0.16 }
  ], p: [{ t: 10, x: 0.5, k: 'P' }] },

  /*  2 · se balancean y aparece el casco doble */
  { tip: 'Ahora se balancean', pt: [1200, 1200, 1250], cap: [{ t: 16, x: 0.25 }, { t: 38, x: 0.75 }], g: [
    { t: 1.6, f: 'fila', n: 4, k: 2, x: 0.3, w: 0.46, sp: 70, sw: 26 },
    { t: 6.5, f: 'fila', n: 4, k: 2, x: 0.7, w: 0.46, sp: 70, sw: 26 },
    { t: 11.5, f: 'fila', n: 5, k: 0, x: 0.5, w: 0.76, sp: 74, sw: 30, gap: 0.22 },
    { t: 18, f: 'fila', n: 4, k: 0, x: 0.5, w: 0.5, sp: 76, hp: 2 },
    { t: 24, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.8, sp: 80, sw: 34 },
    { t: 31, f: 'fila', n: 5, k: 0, x: 0.34, w: 0.56, sp: 78, hp: 2, gap: 0.2 },
    { t: 38, f: 'fila', n: 5, k: 2, x: 0.66, w: 0.6, sp: 80, sw: 30 },
    { t: 45, f: 'fila', n: 6, k: 0, x: 0.5, w: 0.86, sp: 80, hp: 2, gap: 0.16 }
  ], p: [{ t: 13, x: 0.25, k: 'P' }, { t: 34, x: 0.7, k: 'P' }] },

  /*  3 · entradas en arco */
  { tip: 'Entran en arco por los lados', pt: [850, 850, 900], cap: [{ t: 18, x: 0.7 }, { t: 40, x: 0.3 }], g: [
    { t: 1.8, f: 'arco', n: 4, k: 1, d: 1, y: 0.18, amp: 110, sp: 160, gap: 0.4 },
    { t: 8, f: 'arco', n: 4, k: 1, d: -1, y: 0.2, amp: 120, sp: 160, gap: 0.4 },
    { t: 14, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.7, sp: 78, sw: 30 },
    { t: 20, f: 'arco', n: 5, k: 1, d: 1, y: 0.24, amp: 130, sp: 170, gap: 0.34 },
    { t: 26, f: 'fila', n: 4, k: 0, x: 0.5, w: 0.56, sp: 80, hp: 2 },
    { t: 33, f: 'arco', n: 5, k: 1, d: -1, y: 0.22, amp: 125, sp: 168, gap: 0.32 },
    { t: 40, f: 'fila', n: 6, k: 2, x: 0.5, w: 0.86, sp: 80, sw: 32, gap: 0.18 },
    { t: 47, f: 'arco', n: 5, k: 1, d: 1, y: 0.28, amp: 120, sp: 172, gap: 0.3 }
  ], p: [{ t: 11, x: 0.7, k: 'S' }, { t: 36, x: 0.4, k: 'P' }] },

  /*  4 · las primeras balas enemigas */
  { tip: 'Cuidado: ahora disparan', pt: [1000, 1050, 1100], cap: [{ t: 16, x: 0.4 }, { t: 42, x: 0.6 }], g: [
    { t: 1.8, f: 'fila', n: 4, k: 3, x: 0.5, w: 0.6, sp: 64, hp: 2, fire: 2.8, pat: 'down', bs: 118 },
    { t: 8, f: 'arco', n: 4, k: 1, d: -1, y: 0.2, amp: 110, sp: 165, gap: 0.34 },
    { t: 14, f: 'fila', n: 5, k: 3, x: 0.4, w: 0.7, sp: 68, hp: 2, fire: 2.5, pat: 'down', bs: 124 },
    { t: 21, f: 'fila', n: 5, k: 2, x: 0.6, w: 0.7, sp: 82, sw: 30 },
    { t: 27, f: 'arco', n: 4, k: 1, d: 1, y: 0.22, amp: 125, sp: 172, gap: 0.34 },
    { t: 34, f: 'fila', n: 5, k: 3, x: 0.5, w: 0.76, sp: 70, hp: 2, fire: 2.4, pat: 'down', bs: 126 },
    { t: 41, f: 'fila', n: 5, k: 2, x: 0.36, w: 0.6, sp: 84, sw: 32 },
    { t: 48, f: 'arco', n: 5, k: 1, d: -1, y: 0.26, amp: 120, sp: 174, gap: 0.3 }
  ], p: [{ t: 9, x: 0.4, k: 'P' }, { t: 23, x: 0.65, k: 'S' }, { t: 44, x: 0.5, k: 'P' }] },

  /*  5 · NUEVO: kamikazes */
  { tip: '¡Kamikazes! No te quedes quieto', pt: [1050, 1100, 1100], cap: [{ t: 18, x: 0.3 }, { t: 44, x: 0.7 }], g: [
    { t: 2, f: 'kami', n: 3, k: 0, x: 0.5, w: 0.6, sp: 145, gap: 0.55 },
    { t: 8, f: 'fila', n: 5, k: 3, x: 0.5, w: 0.7, sp: 68, hp: 2, fire: 2.5, pat: 'down', bs: 124 },
    { t: 14.5, f: 'kami', n: 4, k: 0, x: 0.5, w: 0.8, sp: 155, gap: 0.45 },
    { t: 21, f: 'arco', n: 4, k: 1, d: 1, y: 0.2, amp: 120, sp: 172, gap: 0.34 },
    { t: 27, f: 'kami', n: 4, k: 0, x: 0.5, w: 0.85, sp: 160, gap: 0.4 },
    { t: 34, f: 'fila', n: 5, k: 3, x: 0.44, w: 0.72, sp: 70, hp: 2, fire: 2.4, pat: 'down', bs: 126 },
    { t: 41, f: 'kami', n: 5, k: 0, x: 0.5, w: 0.88, sp: 160, gap: 0.38 },
    { t: 48, f: 'fila', n: 6, k: 2, x: 0.5, w: 0.86, sp: 82, sw: 32, gap: 0.16 }
  ], p: [{ t: 12, x: 0.5, k: 'S' }, { t: 25, x: 0.3, k: 'P' }, { t: 45, x: 0.6, k: 'S' }] },

  /*  6 · NUEVO: núcleos inestables */
  { tip: 'El núcleo estalla en anillo: mátalo lejos', pt: [1000, 1050, 1050], cap: [{ t: 20, x: 0.5 }, { t: 46, x: 0.28 }], g: [
    { t: 1.8, f: 'nucleo', n: 2, x: 0.5, w: 0.5, sp: 58, hp: 2, gap: 0.5 },
    { t: 8, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.74, sp: 76, sw: 30 },
    { t: 14, f: 'nucleo', n: 3, x: 0.5, w: 0.76, sp: 60, hp: 2, gap: 0.45 },
    { t: 21, f: 'fila', n: 5, k: 3, x: 0.4, w: 0.7, sp: 70, hp: 2, fire: 2.5, pat: 'down', bs: 124 },
    { t: 28, f: 'nucleo', n: 3, x: 0.35, w: 0.5, sp: 62, hp: 2, gap: 0.4 },
    { t: 34, f: 'kami', n: 4, k: 0, x: 0.5, w: 0.85, sp: 158, gap: 0.42 },
    { t: 41, f: 'nucleo', n: 4, x: 0.5, w: 0.86, sp: 62, hp: 2, gap: 0.36 },
    { t: 48, f: 'arco', n: 5, k: 1, d: 1, y: 0.24, amp: 120, sp: 172, gap: 0.3 }
  ], p: [{ t: 11, x: 0.7, k: 'P' }, { t: 30, x: 0.3, k: 'S' }] },

  /*  7 · NUEVO: torreta blindada */
  { tip: 'Torreta blindada: aguanta doce impactos', pt: [1250, 1250, 1300], cap: [{ t: 16, x: 0.75 }, { t: 42, x: 0.35 }], g: [
    { t: 1.6, f: 'fila', n: 4, k: 2, x: 0.5, w: 0.6, sp: 76, sw: 30 },
    { t: 6, f: 'torre', n: 1, x: 0.5, y: 0.2, sp: 70, sw: 70, stay: 15, hp: 12, fire: 1.7, pat: 'aim', bs: 132 },
    { t: 12, f: 'arco', n: 4, k: 1, d: -1, y: 0.3, amp: 100, sp: 168, gap: 0.34 },
    { t: 19, f: 'fila', n: 5, k: 3, x: 0.45, w: 0.72, sp: 70, hp: 2, fire: 2.4, pat: 'down', bs: 126 },
    { t: 26, f: 'kami', n: 4, k: 0, x: 0.5, w: 0.8, sp: 158, gap: 0.42 },
    { t: 32, f: 'torre', n: 1, x: 0.32, y: 0.24, sp: 72, sw: 60, stay: 14, hp: 12, fire: 1.6, pat: 'aim', bs: 132 },
    { t: 39, f: 'nucleo', n: 3, x: 0.62, w: 0.5, sp: 62, hp: 2, gap: 0.4 },
    { t: 46, f: 'fila', n: 6, k: 2, x: 0.5, w: 0.86, sp: 80, sw: 32, gap: 0.16 }
  ], p: [{ t: 10, x: 0.75, k: 'P' }, { t: 22, x: 0.35, k: 'S' }, { t: 44, x: 0.5, k: 'P' }] },

  /*  8 · NUEVO: asteroides */
  { tip: 'El asteroide no se aparta: rómpelo o esquívalo', pt: [1050, 1100, 1100], cap: [{ t: 18, x: 0.3 }, { t: 44, x: 0.7 }], g: [
    { t: 1.8, f: 'roca', n: 1, x: 0.5, sp: 48, hp: 4 },
    { t: 7, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.74, sp: 78, sw: 30 },
    { t: 13, f: 'roca', n: 2, x: 0.5, w: 0.62, sp: 50, hp: 4, gap: 1.2 },
    { t: 20, f: 'arco', n: 5, k: 1, d: 1, y: 0.26, amp: 115, sp: 170, gap: 0.32 },
    { t: 27, f: 'roca', n: 2, x: 0.38, w: 0.5, sp: 52, hp: 4, gap: 1 },
    { t: 33, f: 'fila', n: 5, k: 3, x: 0.6, w: 0.7, sp: 72, hp: 2, fire: 2.3, pat: 'down', bs: 128 },
    { t: 40, f: 'roca', n: 3, x: 0.5, w: 0.8, sp: 52, hp: 4, gap: 0.9 },
    { t: 47, f: 'kami', n: 5, k: 0, x: 0.5, w: 0.88, sp: 162, gap: 0.38 }
  ], p: [{ t: 11, x: 0.3, k: 'P' }, { t: 30, x: 0.7, k: 'S' }] },

  /*  9 · víspera del jefe: zigzag y todo lo visto */
  { tip: 'Aguanta: el jefe está cerca', pw: 2, pt: [1200, 1250, 1250], cap: [{ t: 16, x: 0.5 }, { t: 40, x: 0.2 }], cp: 26, g: [
    { t: 1.6, f: 'zig', n: 3, k: 1, x: 0.4, w: 0.5, sp: 52, vx: 130, gap: 0.5 },
    { t: 8, f: 'fila', n: 6, k: 3, x: 0.5, w: 0.86, sp: 72, hp: 2, fire: 2.2, pat: 'down', bs: 132, gap: 0.18 },
    { t: 15, f: 'zig', n: 4, k: 1, x: 0.6, w: 0.6, sp: 56, vx: 145, gap: 0.45 },
    { t: 21, f: 'kami', n: 4, k: 0, x: 0.3, w: 0.5, sp: 165, gap: 0.35 },
    { t: 24, f: 'kami', n: 4, k: 0, x: 0.7, w: 0.5, sp: 165, gap: 0.35 },
    { t: 31, f: 'torre', n: 1, x: 0.5, y: 0.24, sp: 76, sw: 80, stay: 16, hp: 14, fire: 1.5, pat: 'aim', bs: 136 },
    { t: 34, f: 'nucleo', n: 3, x: 0.5, w: 0.7, sp: 62, hp: 2, gap: 0.4 },
    { t: 42, f: 'roca', n: 2, x: 0.5, w: 0.6, sp: 52, hp: 4, gap: 1 },
    { t: 48, f: 'arco', n: 6, k: 1, d: -1, y: 0.3, amp: 115, sp: 178, gap: 0.26 }
  ], p: [{ t: 10, x: 0.5, k: 'S' }, { t: 28, x: 0.5, k: 'P' }, { t: 46, x: 0.3, k: 'S' }] },

  /* 10 · JEFE — Guardián de Hierro (3 fases) */
  { tip: 'Guardián de Hierro', pw: 2, pt: [5450, 5600, 5800], cap: [{ t: 14, x: 0.3 }, { t: 30, x: 0.7 }], cp: 24, g: [
    { t: 1.6, f: 'fila', n: 4, k: 2, x: 0.5, w: 0.6, sp: 76, sw: 30 },
    { t: 6, f: 'nucleo', n: 3, x: 0.5, w: 0.7, sp: 60, hp: 2, gap: 0.4 },
    { t: 12, f: 'jefe' }
  ], p: [{ t: 4, x: 0.5, k: 'S' }, { t: 20, x: 0.5, k: 'P' }],
    boss: { name: 'Guardián de Hierro', hp: 90, r: 34, ph: [['anillo'], ['abanico', 'escolta'], ['espiral', 'barrido']] } },

  /* 11 · NUEVO: minadores */
  { tip: 'Minadores: las minas se pueden disparar', pw: 2, pt: [1250, 1300, 1300], cap: [{ t: 18, x: 0.3 }, { t: 44, x: 0.7 }], cp: 26, g: [
    { t: 1.8, f: 'mina', n: 1, d: 1, y: 0.16, sp: 66, per: 1.7, hp: 6 },
    { t: 7, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.74, sp: 78, sw: 30 },
    { t: 13, f: 'mina', n: 1, d: -1, y: 0.2, sp: 70, per: 1.5, hp: 6 },
    { t: 19, f: 'arco', n: 5, k: 1, d: 1, y: 0.3, amp: 110, sp: 175, gap: 0.3 },
    { t: 26, f: 'fila', n: 5, k: 3, x: 0.5, w: 0.7, sp: 74, hp: 2, fire: 2.2, pat: 'down', bs: 132 },
    { t: 33, f: 'mina', n: 1, d: 1, y: 0.18, sp: 72, per: 1.4, hp: 7 },
    { t: 38, f: 'nucleo', n: 3, x: 0.4, w: 0.6, sp: 62, hp: 2, gap: 0.4 },
    { t: 45, f: 'kami', n: 5, k: 0, x: 0.5, w: 0.88, sp: 165, gap: 0.36 },
    { t: 52, f: 'fila', n: 6, k: 2, x: 0.5, w: 0.86, sp: 82, sw: 32, gap: 0.16 }
  ], p: [{ t: 10, x: 0.3, k: 'P' }, { t: 22, x: 0.7, k: 'S' }, { t: 48, x: 0.5, k: 'P' }] },

  /* 12 · NUEVO: interceptor espejo */
  { tip: 'El interceptor te imita: cruza el centro', pw: 2, pt: [1100, 1100, 1150], cap: [{ t: 16, x: 0.5 }, { t: 42, x: 0.25 }], cp: 26, g: [
    { t: 1.8, f: 'caza', n: 1, y: 0.2, sp: 90, hp: 5, fire: 1.6, bs: 132 },
    { t: 8, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.74, sp: 78, sw: 30 },
    { t: 14, f: 'caza', n: 2, y: 0.24, sp: 92, hp: 5, fire: 1.6, bs: 134, gap: 0.8 },
    { t: 21, f: 'roca', n: 2, x: 0.5, w: 0.6, sp: 52, hp: 4, gap: 1 },
    { t: 28, f: 'caza', n: 2, y: 0.28, sp: 94, hp: 5, fire: 1.5, bs: 136, gap: 0.7 },
    { t: 35, f: 'arco', n: 5, k: 1, d: -1, y: 0.34, amp: 110, sp: 176, gap: 0.3 },
    { t: 42, f: 'mina', n: 1, d: 1, y: 0.16, sp: 74, per: 1.4, hp: 7 },
    { t: 48, f: 'caza', n: 3, y: 0.22, sp: 96, hp: 5, fire: 1.5, bs: 136, gap: 0.6 }
  ], p: [{ t: 11, x: 0.5, k: 'S' }, { t: 26, x: 0.4, k: 'P' }, { t: 46, x: 0.6, k: 'S' }] },

  /* 13 · NUEVO: escoltado */
  { tip: 'Tira a los drones: la nodriza es intocable', pw: 2, pt: [1150, 1150, 1200], cap: [{ t: 18, x: 0.7 }, { t: 44, x: 0.3 }], cp: 28, g: [
    { t: 1.8, f: 'esc', n: 1, x: 0.5, y: 0.2, sp: 70, sw: 60, stay: 18, hp: 10, fire: 2, pat: 'aim', bs: 130 },
    { t: 9, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.74, sp: 78, sw: 30 },
    { t: 16, f: 'esc', n: 1, x: 0.3, y: 0.26, sp: 72, sw: 70, stay: 18, hp: 10, fire: 1.9, pat: 'aim', bs: 132 },
    { t: 23, f: 'kami', n: 4, k: 0, x: 0.5, w: 0.85, sp: 162, gap: 0.4 },
    { t: 30, f: 'esc', n: 1, x: 0.7, y: 0.24, sp: 72, sw: 70, stay: 18, hp: 10, fire: 1.8, pat: 'aim', bs: 134 },
    { t: 37, f: 'nucleo', n: 3, x: 0.5, w: 0.7, sp: 62, hp: 2, gap: 0.4 },
    { t: 44, f: 'caza', n: 2, y: 0.24, sp: 94, hp: 5, fire: 1.5, bs: 134, gap: 0.7 },
    { t: 51, f: 'fila', n: 6, k: 3, x: 0.5, w: 0.86, sp: 76, hp: 2, fire: 2, pat: 'down', bs: 134, gap: 0.16 }
  ], p: [{ t: 12, x: 0.3, k: 'P' }, { t: 27, x: 0.7, k: 'S' }, { t: 47, x: 0.5, k: 'P' }] },

  /* 14 · cascada de kamikazes y núcleos */
  { tip: 'Cascada de kamikazes', pw: 2, pt: [1450, 1500, 1500], cap: [{ t: 16, x: 0.5 }, { t: 40, x: 0.75 }], cp: 26, g: [
    { t: 1.8, f: 'kami', n: 4, k: 0, x: 0.25, w: 0.4, sp: 165, gap: 0.3 },
    { t: 5, f: 'kami', n: 4, k: 0, x: 0.75, w: 0.4, sp: 165, gap: 0.3 },
    { t: 8.5, f: 'kami', n: 5, k: 0, x: 0.5, w: 0.9, sp: 172, gap: 0.28 },
    { t: 14, f: 'mina', n: 1, d: 1, y: 0.17, sp: 76, per: 1.4, hp: 8 },
    { t: 20, f: 'zig', n: 5, k: 1, x: 0.5, w: 0.7, sp: 62, vx: 158, gap: 0.32 },
    { t: 27, f: 'nucleo', n: 4, x: 0.5, w: 0.86, sp: 62, hp: 2, gap: 0.36 },
    { t: 34, f: 'kami', n: 5, k: 0, x: 0.35, w: 0.5, sp: 172, gap: 0.26 },
    { t: 37, f: 'kami', n: 5, k: 0, x: 0.65, w: 0.5, sp: 172, gap: 0.26 },
    { t: 44, f: 'roca', n: 2, x: 0.5, w: 0.62, sp: 52, hp: 4, gap: 1 },
    { t: 50, f: 'fila', n: 6, k: 3, x: 0.5, w: 0.86, sp: 78, hp: 3, fire: 2, pat: 'down', bs: 136, gap: 0.16 }
  ], p: [{ t: 11, x: 0.5, k: 'S' }, { t: 24, x: 0.6, k: 'P' }, { t: 47, x: 0.4, k: 'S' }] },

  /* 15 · cañonera */
  { tip: 'Cañonera: abanicos de plasma', pw: 2, pt: [1600, 1600, 1650], cap: [{ t: 18, x: 0.25 }, { t: 44, x: 0.75 }], cp: 28, g: [
    { t: 1.8, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.74, sp: 80, sw: 32 },
    { t: 7, f: 'canon', n: 1, x: 0.5, y: 0.24, sp: 62, sw: 80, stay: 20, hp: 22, fire: 2.4, pat: 'fan', bs: 142 },
    { t: 14, f: 'arco', n: 5, k: 1, d: -1, y: 0.42, amp: 100, sp: 180, gap: 0.26 },
    { t: 21, f: 'kami', n: 5, k: 0, x: 0.5, w: 0.85, sp: 170, gap: 0.32 },
    { t: 28, f: 'mina', n: 1, d: 1, y: 0.18, sp: 78, per: 1.3, hp: 8 },
    { t: 34, f: 'esc', n: 1, x: 0.35, y: 0.24, sp: 72, sw: 70, stay: 18, hp: 10, fire: 1.8, pat: 'aim', bs: 136 },
    { t: 42, f: 'canon', n: 1, x: 0.62, y: 0.26, sp: 64, sw: 70, stay: 18, hp: 22, fire: 2.2, pat: 'fan', bs: 144 },
    { t: 50, f: 'fila', n: 6, k: 3, x: 0.5, w: 0.86, sp: 78, hp: 2, fire: 2, pat: 'down', bs: 136, gap: 0.16 }
  ], p: [{ t: 10, x: 0.25, k: 'S' }, { t: 24, x: 0.5, k: 'P' }, { t: 46, x: 0.7, k: 'S' }] },

  /* 16 · NUEVO: lanza de plasma */
  { tip: 'La columna marcada se vuelve mortal: apártate', pw: 2, pt: [1400, 1450, 1500], cap: [{ t: 16, x: 0.7 }, { t: 42, x: 0.3 }], cp: 28, g: [
    { t: 1.8, f: 'rayo', n: 1, x: 0.5, y: 0.18, sp: 74, sw: 50, stay: 18, hp: 10 },
    { t: 8, f: 'fila', n: 5, k: 2, x: 0.5, w: 0.74, sp: 80, sw: 32 },
    { t: 15, f: 'rayo', n: 2, x: 0.5, w: 0.6, y: 0.22, sp: 76, sw: 60, stay: 18, hp: 10, gap: 1.2 },
    { t: 23, f: 'kami', n: 5, k: 0, x: 0.5, w: 0.88, sp: 168, gap: 0.34 },
    { t: 30, f: 'rayo', n: 2, x: 0.38, w: 0.5, y: 0.26, sp: 78, sw: 60, stay: 18, hp: 10, gap: 1 },
    { t: 37, f: 'nucleo', n: 4, x: 0.5, w: 0.86, sp: 62, hp: 2, gap: 0.36 },
    { t: 44, f: 'rayo', n: 2, x: 0.62, w: 0.55, y: 0.2, sp: 78, sw: 70, stay: 16, hp: 10, gap: 0.9 },
    { t: 51, f: 'arco', n: 6, k: 1, d: 1, y: 0.34, amp: 115, sp: 180, gap: 0.26 }
  ], p: [{ t: 11, x: 0.7, k: 'P' }, { t: 26, x: 0.3, k: 'S' }, { t: 48, x: 0.5, k: 'P' }] },

  /* 17 · arcos cruzados, interceptores y rayo */
  { tip: 'Arcos cruzados', pw: 2, pt: [1650, 1700, 1750], cap: [{ t: 18, x: 0.5 }, { t: 44, x: 0.2 }], cp: 28, g: [
    { t: 1.6, f: 'arco', n: 5, k: 1, d: 1, y: 0.18, amp: 120, sp: 182, gap: 0.24 },
    { t: 2.6, f: 'arco', n: 5, k: 1, d: -1, y: 0.3, amp: 120, sp: 182, gap: 0.24 },
    { t: 10, f: 'caza', n: 2, y: 0.22, sp: 94, hp: 5, fire: 1.5, bs: 138, gap: 0.7 },
    { t: 18, f: 'rayo', n: 2, x: 0.5, w: 0.6, y: 0.2, sp: 78, sw: 60, stay: 16, hp: 10, gap: 1 },
    { t: 26, f: 'kami', n: 6, k: 0, x: 0.5, w: 0.9, sp: 175, gap: 0.28 },
    { t: 33, f: 'torre', n: 1, x: 0.26, y: 0.24, sp: 80, sw: 60, stay: 16, hp: 14, fire: 1.4, pat: 'aim', bs: 142 },
    { t: 35, f: 'torre', n: 1, x: 0.74, y: 0.3, sp: 80, sw: 60, stay: 16, hp: 14, fire: 1.4, pat: 'aim', bs: 142 },
    { t: 44, f: 'roca', n: 3, x: 0.5, w: 0.8, sp: 54, hp: 4, gap: 0.9 },
    { t: 51, f: 'fila', n: 6, k: 3, x: 0.5, w: 0.86, sp: 80, hp: 3, fire: 1.9, pat: 'down', bs: 140, gap: 0.14 }
  ], p: [{ t: 9, x: 0.5, k: 'S' }, { t: 23, x: 0.5, k: 'P' }, { t: 48, x: 0.3, k: 'S' }] },

  /* 18 · cañonera con escolta y escoltados */
  { tip: 'Cañonera con escolta', pw: 3, pt: [1650, 1700, 1750], cap: [{ t: 16, x: 0.3 }, { t: 42, x: 0.7 }], cp: 28, g: [
    { t: 1.8, f: 'canon', n: 1, x: 0.4, y: 0.24, sp: 64, sw: 90, stay: 22, hp: 24, fire: 2.1, pat: 'fan', bs: 146 },
    { t: 4, f: 'zig', n: 4, k: 1, x: 0.6, w: 0.6, sp: 64, vx: 160, gap: 0.35 },
    { t: 12, f: 'mina', n: 1, d: 1, y: 0.15, sp: 82, per: 1.2, hp: 9 },
    { t: 18, f: 'esc', n: 1, x: 0.5, y: 0.22, sp: 74, sw: 70, stay: 18, hp: 10, fire: 1.8, pat: 'aim', bs: 140 },
    { t: 26, f: 'arco', n: 6, k: 1, d: -1, y: 0.4, amp: 105, sp: 185, gap: 0.24 },
    { t: 33, f: 'roca', n: 3, x: 0.5, w: 0.8, sp: 54, hp: 4, gap: 0.9 },
    { t: 40, f: 'esc', n: 1, x: 0.28, y: 0.26, sp: 76, sw: 60, stay: 16, hp: 10, fire: 1.7, pat: 'aim', bs: 142 },
    { t: 46, f: 'kami', n: 6, k: 0, x: 0.5, w: 0.9, sp: 178, gap: 0.26 },
    { t: 53, f: 'canon', n: 1, x: 0.66, y: 0.26, sp: 66, sw: 70, stay: 16, hp: 24, fire: 2, pat: 'fan', bs: 146 }
  ], p: [{ t: 10, x: 0.3, k: 'S' }, { t: 24, x: 0.7, k: 'S' }, { t: 49, x: 0.5, k: 'P' }] },

  /* 19 · todo a la vez */
  { tip: 'Todo a la vez', pw: 3, pt: [1750, 1800, 1850], cap: [{ t: 16, x: 0.5 }, { t: 38, x: 0.25 }, { t: 54, x: 0.75 }], cp: 30, g: [
    { t: 1.6, f: 'fila', n: 7, k: 3, x: 0.5, w: 0.92, sp: 80, hp: 3, fire: 1.8, pat: 'down', bs: 144, gap: 0.12 },
    { t: 6, f: 'mina', n: 1, d: -1, y: 0.14, sp: 84, per: 1.2, hp: 9 },
    { t: 12, f: 'rayo', n: 2, x: 0.5, w: 0.62, y: 0.2, sp: 80, sw: 60, stay: 16, hp: 10, gap: 1 },
    { t: 20, f: 'kami', n: 5, k: 0, x: 0.28, w: 0.45, sp: 178, gap: 0.24 },
    { t: 22, f: 'kami', n: 5, k: 0, x: 0.72, w: 0.45, sp: 178, gap: 0.24 },
    { t: 29, f: 'esc', n: 1, x: 0.5, y: 0.24, sp: 76, sw: 70, stay: 16, hp: 10, fire: 1.7, pat: 'aim', bs: 144 },
    { t: 36, f: 'caza', n: 2, y: 0.26, sp: 96, hp: 5, fire: 1.4, bs: 142, gap: 0.7 },
    { t: 43, f: 'nucleo', n: 4, x: 0.5, w: 0.86, sp: 64, hp: 2, gap: 0.34 },
    { t: 50, f: 'roca', n: 3, x: 0.5, w: 0.82, sp: 54, hp: 4, gap: 0.85 },
    { t: 57, f: 'arco', n: 6, k: 1, d: 1, y: 0.36, amp: 115, sp: 186, gap: 0.22 }
  ], p: [{ t: 8, x: 0.5, k: 'S' }, { t: 26, x: 0.4, k: 'P' }, { t: 47, x: 0.6, k: 'S' }] },

  /* 20 · JEFE FINAL — Corazón de Starfall (4 fases) */
  { tip: 'Corazón de Starfall', pw: 3, pt: [10650, 10950, 11300], cap: [{ t: 12, x: 0.3 }, { t: 30, x: 0.7 }], cp: 26, g: [
    { t: 1.6, f: 'fila', n: 5, k: 3, x: 0.5, w: 0.8, sp: 78, hp: 2, fire: 2.2, pat: 'down', bs: 138, gap: 0.16 },
    { t: 7, f: 'esc', n: 1, x: 0.5, y: 0.2, sp: 76, sw: 60, stay: 14, hp: 10, fire: 1.9, pat: 'aim', bs: 140 },
    { t: 15, f: 'jefe' }
  ], p: [{ t: 5, x: 0.5, k: 'S' }, { t: 6, x: 0.3, k: 'P' }, { t: 34, x: 0.7, k: 'S' }],
    boss: { name: 'Corazón de Starfall', hp: 140, r: 38,
      ph: [['anillo'], ['abanico', 'minas'], ['espiral', 'escolta'], ['anillo', 'barrido', 'escolta']] } }
];
