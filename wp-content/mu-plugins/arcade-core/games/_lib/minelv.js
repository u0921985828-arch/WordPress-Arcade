/* Tableros a mano de mine-sweep (plan Friv, F3, tanda 4). 20 tableros escritos uno a uno:
 * ninguno se genera al azar y TODOS están verificados con un resolutor propio — se terminan
 * con lógica pura (conteo, conjuntos solapados y contador global de minas), sin adivinar
 * ni una sola vez. La primera casilla es siempre segura y abre un claro.
 *
 * Campos de cada nivel:
 *   n    lado del tablero (5×5 … 16×16)
 *   m    minas
 *   fc   [x, y] de la primera casilla, que el motor abre al empezar (siempre un cero)
 *   par  segundos objetivo: por debajo se gana la medalla del nivel
 *   t    título del cartel que enseña la técnica nueva
 *   d    texto del cartel (corto, se lee antes de la primera jugada)
 *   b    tablero: una cadena por fila, '*' mina y '.' casilla limpia
 *
 * Progresión de técnicas: 1-4 conteo puro · 5-7 exigen conjuntos (verificado: no salen solo
 * contando) · 8 en adelante exigen además el contador global de minas.
 */
const MINELV = {
  'mine-sweep': [
    { /*  1 */ n: 5, m: 2, fc: [3, 3], par: 25, t: 'Los números', d: 'Cada número dice cuántas minas hay en las ocho casillas que lo rodean. Si no hay número, la casilla está limpia.', b: [
      '.....',
      '..*..',
      '.*...',
      '.....',
      '.....'
    ] },
    { /*  2 */ n: 5, m: 3, fc: [2, 3], par: 30, t: 'Marcar minas', d: 'Si a un número le quedan justo tantas casillas tapadas como su cifra, todas son minas: mantén pulsado para poner bandera.', b: [
      '..*..',
      '..*.*',
      '.....',
      '.....',
      '.....'
    ] },
    { /*  3 */ n: 6, m: 5, fc: [1, 4], par: 40, t: 'El cero abre solo', d: 'Una casilla sin número abre de golpe toda su zona. Busca esos claros antes de tocar cerca de los números.', b: [
      '....*.',
      '..*.*.',
      '......',
      '......',
      '.....*',
      '....*.'
    ] },
    { /*  4 */ n: 6, m: 6, fc: [3, 2], par: 45, t: 'El acorde', d: 'Cuando un número ya tiene todas sus banderas puestas, tócalo: se abren de golpe las vecinas que quedan.', b: [
      '..*.*.',
      '.*....',
      '.*....',
      '.*....',
      '......',
      '.*....'
    ] },
    { /*  5 */ n: 7, m: 8, fc: [1, 1], par: 60, t: 'Dos números juntos', d: 'Compara dos números vecinos: lo que a uno ya le sobra, al otro le falta. Ahí aparecen casillas seguras sin adivinar.', b: [
      '....*..',
      '.......',
      '....*..',
      '.*....*',
      '.......',
      '...*..*',
      '*.*....'
    ] },
    { /*  6 */ n: 7, m: 9, fc: [5, 1], par: 65, t: 'El 1-2-1', d: 'Un 1-2-1 seguido esconde las minas bajo los dos unos. La casilla del centro, delante del dos, es segura.', b: [
      '**.*...',
      '.......',
      '.......',
      '*..*...',
      '.......',
      '*.....*',
      '....*.*'
    ] },
    { /*  7 */ n: 8, m: 10, fc: [6, 4], par: 80, t: 'Conjuntos solapados', d: 'Si las tapadas de un número están todas dentro de las de otro, resta las cifras: la diferencia manda en lo que sobra.', b: [
      '..*.....',
      '*...*...',
      '.*......',
      '...*....',
      '..*.....',
      '........',
      '*.*.....',
      '...*.*..'
    ] },
    { /*  8 */ n: 8, m: 12, fc: [2, 2], par: 90, t: 'El contador de minas', d: 'Arriba se ve cuántas minas quedan. Cuando llega a cero, todo lo tapado es seguro; si iguala lo tapado, todo es mina.', b: [
      '......*.',
      '......*.',
      '.......*',
      '......**',
      '.......*',
      '.*.*.**.',
      '*....*..',
      '........'
    ] },
    { /*  9 */ n: 9, m: 13, fc: [6, 2], par: 105, t: 'El borde', d: 'En el borde cada casilla tiene cinco vecinas en vez de ocho. Los números valen más: empieza a razonar por ahí.', b: [
      '.........',
      '*........',
      '..*......',
      '.........',
      '.***.....',
      '...**..**',
      '...*.....',
      '.*.*.....',
      '........*'
    ] },
    { /* 10 */ n: 9, m: 15, fc: [2, 3], par: 115, t: 'Las esquinas', d: 'Una esquina solo toca tres casillas. Los tresillos y cuatros pegados a la esquina se resuelven casi solos.', b: [
      '...*....*',
      '.....*...',
      '........*',
      '.....*...',
      '.....***.',
      '.....*...',
      '.........',
      '**...*..*',
      '..*.....*'
    ] },
    { /* 11 */ n: 10, m: 16, fc: [3, 7], par: 130, t: 'Abrir en abanico', d: 'No te quedes en un rincón: abre por varios frentes a la vez y deja que los claros se junten.', b: [
      '..*...*..*',
      '..*.......',
      '.....**..*',
      '*......*.*',
      '*....*....',
      '..........',
      '..........',
      '......*...',
      '*.....*...',
      '........*.'
    ] },
    { /* 12 */ n: 10, m: 18, fc: [7, 8], par: 140, t: 'Bandera y acorde', d: 'Marca en cuanto lo sepas y usa el acorde: ganas mucho tiempo y te equivocas menos.', b: [
      '....*...*.',
      '*..**.....',
      '..**......',
      '......*..*',
      '...*......',
      '.........*',
      '...*......',
      '...**.....',
      '..*.......',
      '**.*......'
    ] },
    { /* 13 */ n: 11, m: 20, fc: [8, 5], par: 160, t: 'Números altos', d: 'Un cinco o un seis rodeado de tapadas casi siempre las delata todas. Empieza por los números grandes.', b: [
      '*......*...',
      '*.*..*...*.',
      '........*..',
      '...*.......',
      '*...**.....',
      '.*.........',
      '.....*.....',
      '*..........',
      '.......*...',
      '.*.**......',
      '...*....*..'
    ] },
    { /* 14 */ n: 11, m: 22, fc: [9, 3], par: 170, t: 'Paredes de minas', d: 'Dos doses seguidos en el borde forman una pared: las minas van alternas. Cuéntalas antes de tocar.', b: [
      '......*...*',
      '...**......',
      '*....**....',
      '*..*.......',
      '*..*.......',
      '...........',
      '..*......*.',
      '....**..*..',
      '........*..',
      '.**........',
      '.*......*.*'
    ] },
    { /* 15 */ n: 12, m: 24, fc: [9, 1], par: 185, t: 'Volver atrás', d: 'Cuando te atasques, vuelve a los números viejos: al abrir nuevas casillas muchos ya tienen respuesta.', b: [
      '..*.***.....',
      '.*..........',
      '............',
      '...*........',
      '.....*......',
      '...**..*...*',
      '.......*....',
      '..*....*....',
      '**...*......',
      '..*.*.....**',
      '..*.......*.',
      '.........*..'
    ] },
    { /* 16 */ n: 12, m: 26, fc: [9, 8], par: 200, t: 'Cuenta lo que queda', d: 'Resta las banderas al total y compara con las casillas tapadas sueltas. Muchas veces cierra el tablero entero.', b: [
      '...*....*...',
      '.*......*...',
      '**.......*.*',
      '........*...',
      '***.*.......',
      '......**..*.',
      '............',
      '............',
      '....**......',
      '..*..**.....',
      '*....*......',
      '..*....**...'
    ] },
    { /* 17 */ n: 13, m: 28, fc: [9, 4], par: 215, t: 'Todo junto', d: 'Conteo, conjuntos y contador de minas. Con las tres reglas este tablero sale sin adivinar ni una vez.', b: [
      '**....*......',
      '..........*..',
      '*.*.........*',
      '.*...........',
      '.............',
      '......*......',
      '..*..*.......',
      '........*..*.',
      '*....*....*..',
      '.......*..*..',
      '.*........*.*',
      '.*...**......',
      '*.....*..*.*.'
    ] },
    { /* 18 */ n: 14, m: 32, fc: [9, 11], par: 240, t: 'Paciencia', d: 'Tablero grande: no corras. Cada zona se resuelve sola si la trabajas entera antes de saltar a otra.', b: [
      '......****...*',
      '.........**...',
      '..*...*...*...',
      '.*.....*...*..',
      '.*.*...*......',
      '*.*.........*.',
      '*....*.....*..',
      '...*...*...**.',
      '.........**...',
      '..............',
      '..............',
      '.....*......*.',
      '..............',
      '..*..*........'
    ] },
    { /* 19 */ n: 15, m: 36, fc: [3, 13], par: 275, t: 'Casi experto', d: 'Quince por quince. Marca siempre las minas seguras: el acorde hace el resto del trabajo.', b: [
      '..............*',
      '*..........*..*',
      '........*..*.*.',
      '.*....*.*......',
      '.....*...**.*..',
      '..*.*......*...',
      '..**...........',
      '......**.......',
      '..*.........*..',
      '..*...*......*.',
      '.............*.',
      '...............',
      '*.......*.*....',
      '.......*.**....',
      '.......*.*...*.'
    ] },
    { /* 20 */ n: 16, m: 40, fc: [11, 12], par: 320, t: 'El clásico', d: 'Dieciséis por dieciséis y cuarenta minas: el tablero experto de toda la vida. Última prueba.', b: [
      '.......**.......',
      '..........*..**.',
      '*......*....*.*.',
      '.*..*......*....',
      '.....*.........*',
      '.....*.*..*.....',
      '..**.......*....',
      '.........*......',
      '*..*..*...*....*',
      '.*.....*...*....',
      '..............*.',
      '**.*.*..........',
      '................',
      '..............**',
      '................',
      '.....*.*.**.....'
    ] },
  ],
};
