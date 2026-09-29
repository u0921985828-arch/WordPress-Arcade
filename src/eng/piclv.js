/* Dibujos a mano de pixel-picross-xl (plan Friv / vara del gancho).
 * 20 tableros escritos uno a uno: ninguno se genera al azar, todos son un dibujo
 * reconocible y TODOS están verificados en Node con un resolutor de líneas
 * (scripts/check_piclv.js): se terminan aplicando lógica de línea, sin adivinar,
 * y la solución es única.
 *
 * Campos de cada nivel:
 *   n   lado del tablero (5×5 … 20×20)
 *   t   nombre del dibujo (se enseña al superarlo; durante la partida es secreto)
 *   q   técnica que enseña, título del cartel
 *   d   texto del cartel (corto, se lee antes del primer toque)
 *   p2  segundos para la 2.ª estrella (normal)
 *   p3  segundos para la 3.ª estrella (normal); la 3.ª pide además cero fallos
 *   b   dibujo: una cadena por fila, '#' pintada y '.' vacía
 *
 * Los objetivos por dificultad salen de p2/p3 con el factor DIFP = [1.4, 1, 0.75]
 * (fácil, normal, difícil), que el motor aplica.
 */
const PICLV = {
  'pixel-picross-xl': [
    { /*  1 */ n: 5, t: 'Corazón', q: 'Los números', d: 'Cada número es un bloque seguido de casillas pintadas en esa fila o columna. Un 5 aquí significa la línea entera.', p2: 60, p3: 40, b: [
      '.#.#.',
      '#####',
      '#####',
      '.###.',
      '..#..'
    ] },
    { /*  2 */ n: 5, t: 'Seta', q: 'Líneas llenas', d: 'Empieza siempre por las líneas que se llenan solas: el número más grande posible no deja ninguna duda.', p2: 50, p3: 30, b: [
      '.###.',
      '#####',
      '#####',
      '..#..',
      '.###.'
    ] },
    { /*  3 */ n: 6, t: 'Llave', q: 'El cero y las cruces', d: 'Una línea con un 0 está vacía entera: márcala con cruces. Lo que sabes que está vacío vale tanto como lo que pintas.', p2: 70, p3: 45, b: [
      '.###..',
      '.#.#..',
      '.###..',
      '..#...',
      '..#...',
      '..##..'
    ] },
    { /*  4 */ n: 7, t: 'Gato', q: 'Bloques pegados al borde', d: 'Si el primer número cabe justo desde el borde, se pinta desde ahí. Trabaja los extremos antes que el centro.', p2: 85, p3: 55, b: [
      '#.....#',
      '##...##',
      '#######',
      '#.#.#.#',
      '#######',
      '##...##',
      '.#####.'
    ] },
    { /*  5 */ n: 8, t: 'Ancla', q: 'Solapamiento', d: 'Un bloque grande deja casillas seguras aunque no sepas dónde empieza: mide desde la izquierda y desde la derecha, y pinta lo que coincide.', p2: 110, p3: 75, b: [
      '...##...',
      '..#..#..',
      '...##...',
      '.######.',
      '...##...',
      '#..##..#',
      '##.##.##',
      '########'
    ] },
    { /*  6 */ n: 8, t: 'Taza', q: 'Huecos obligatorios', d: 'Entre dos bloques siempre hay al menos una casilla vacía. Suma los números y los huecos: si sale el ancho justo, la línea entera está resuelta.', p2: 130, p3: 85, b: [
      '........',
      '.######.',
      '.#....#.',
      '.#....##',
      '.#....#.',
      '.######.',
      '..####..',
      '........'
    ] },
    { /*  7 */ n: 10, t: 'Cohete', q: 'Cerrar el bloque', d: 'Cuando un bloque ya tiene su tamaño completo, sus dos lados son vacíos seguros: ciérralo con cruces y la línea se abre sola.', p2: 170, p3: 110, b: [
      '....##....',
      '...####...',
      '...#..#...',
      '...#..#...',
      '...####...',
      '..######..',
      '.##.##.##.',
      '....##....',
      '...#..#...',
      '....##....'
    ] },
    { /*  8 */ n: 10, t: 'Pez', q: 'Fila y columna a la vez', d: 'Cada casilla que pintas da información a su columna. Después de cada fila, mira las columnas que ha tocado.', p2: 160, p3: 100, b: [
      '..........',
      '...####...',
      '..######.#',
      '.###.#####',
      '##########',
      '##########',
      '.###.#####',
      '..######.#',
      '...####...',
      '..........'
    ] },
    { /*  9 */ n: 10, t: 'Paraguas', q: 'Los extremos mandan', d: 'Cuenta desde los dos lados de la línea: el primer bloque no puede pasar de cierto punto y el último tampoco. Lo que sobra son cruces.', p2: 190, p3: 130, b: [
      '....#.....',
      '..#####...',
      '.#######..',
      '#########.',
      '#########.',
      '....#.....',
      '....#.....',
      '....#..#..',
      '....#..#..',
      '.....##...'
    ] },
    { /* 10 */ n: 10, t: 'Pingüino', q: 'Cruces que resuelven', d: 'Marca con cruces todo lo que sepas vacío: una cruz bien puesta parte la línea en dos trozos y suele resolver el bloque siguiente.', p2: 180, p3: 115, b: [
      '...####...',
      '..######..',
      '..#.##.#..',
      '..######..',
      '.########.',
      '.###..###.',
      '.###..###.',
      '.########.',
      '..######..',
      '.##....##.'
    ] },
    { /* 11 */ n: 12, t: 'Mariposa', q: 'Bloques encajados', d: 'Cuando una línea tiene varios números, colócalos todos a la izquierda y luego todos a la derecha: las casillas que se repiten están pintadas seguro.', p2: 230, p3: 145, b: [
      '.##......##.',
      '####....####',
      '######..####',
      '####.##.####',
      '.##...##.##.',
      '...#.##.#...',
      '...#.##.#...',
      '.##...##.##.',
      '####.##.####',
      '######..####',
      '####....####',
      '.##......##.'
    ] },
    { /* 12 */ n: 12, t: 'Castillo', q: 'Cadena de deducciones', d: 'Una casilla nueva casi nunca resuelve la línea: resuelve la de al lado. Ve encadenando fila, columna, fila…', p2: 240, p3: 150, b: [
      '#.#..#.#..#.',
      '############',
      '.##########.',
      '.#.##..##.#.',
      '.##########.',
      '.####..####.',
      '.####..####.',
      '############',
      '#..######..#',
      '#..#....#..#',
      '#..#....#..#',
      '############'
    ] },
    { /* 13 */ n: 12, t: 'Tortuga', q: 'Filas casi llenas', d: 'Una fila de 12 con un 10 solo puede estar de tres maneras: el centro está pintado siempre. Busca los números grandes primero.', p2: 250, p3: 160, b: [
      '............',
      '...######...',
      '..########..',
      '.##########.',
      '###.####.###',
      '############',
      '############',
      '###.####.###',
      '.##########.',
      '..########..',
      '...######...',
      '............'
    ] },
    { /* 14 */ n: 15, t: 'Búho', q: 'Divide el tablero', d: 'En los tableros grandes no se avanza por orden: busca las tres o cuatro líneas más cargadas, resuélvelas y el resto cae en cascada.', p2: 380, p3: 240, b: [
      '..##.......##..',
      '.####.....####.',
      '.#############.',
      '###############',
      '##.###...###.##',
      '##.#.#...#.#.##',
      '##.###...###.##',
      '###############',
      '######.#.######',
      '#######.#######',
      '###############',
      '#.###########.#',
      '.#############.',
      '..###########..',
      '...##.....##...'
    ] },
    { /* 15 */ n: 15, t: 'Faro', q: 'Líneas de una casilla', d: 'Los trazos finos (un 1 suelto) son los más difíciles: déjalos para el final y sácalos por las columnas que ya tengas cerradas.', p2: 400, p3: 255, b: [
      '......###......',
      '.....#####.....',
      '.....#...#.....',
      '.....#####.....',
      '....#######....',
      '.....#####.....',
      '.....##.##.....',
      '....##...##....',
      '....##...##....',
      '...##.....##...',
      '...##..#..##...',
      '..##...#...##..',
      '..###########..',
      '.#############.',
      '###############'
    ] },
    { /* 16 */ n: 15, t: 'Barco', q: 'Números que no caben', d: 'Antes de pintar, tacha: si un bloque no cabe en un hueco, ese hueco es vacío entero. Descartar es tan útil como pintar.', p2: 420, p3: 265, b: [
      '.......#.......',
      '.......##......',
      '.......###.....',
      '.......####....',
      '.......#####...',
      '.......######..',
      '.......#.......',
      '....########...',
      '.......#.......',
      '.......#.......',
      '###############',
      '.#############.',
      '..###########..',
      '...#########...',
      '...............'
    ] },
    { /* 17 */ n: 15, t: 'Flor', q: 'Repasar lo hecho', d: 'Cada vez que cierres una línea, vuelve a mirar las que la cruzan: la mitad de las deducciones salen de repasar, no de mirar líneas nuevas.', p2: 490, p3: 320, b: [
      '.....#####.....',
      '...####.####...',
      '..###.....###..',
      '.##..#####..##.',
      '.#..#######..#.',
      '#..###...###..#',
      '#..##.....##..#',
      '#..##.....##..#',
      '#..###...###..#',
      '.#..#######..#.',
      '.##..#####..##.',
      '..###..#..###..',
      '...####.####...',
      '.......#.......',
      '..####.#.......'
    ] },
    { /* 18 */ n: 18, t: 'Copa', q: 'Simetría a la vista', d: 'Muchos dibujos son simétricos: si una mitad encaja, prueba la otra. No es una regla del juego, pero acelera muchísimo.', p2: 560, p3: 350, b: [
      '..................',
      '..##############..',
      '..##############..',
      '..#............#..',
      '.##............##.',
      '.#..............#.',
      '.#..............#.',
      '.##............##.',
      '..#............#..',
      '..##..........##..',
      '...##........##...',
      '....####..####....',
      '......######......',
      '.......####.......',
      '.......####.......',
      '.....########.....',
      '...############...',
      '..................'
    ] },
    { /* 19 */ n: 20, t: 'Dinosaurio', q: 'Paciencia', d: 'Un tablero de 20 no se resuelve de un tirón: pinta solo lo seguro, marca cruces y vuelve a empezar la vuelta. Nunca adivines: siempre queda una línea con salida.', p2: 760, p3: 480, b: [
      '............########',
      '............########',
      '............##.#####',
      '............########',
      '............########',
      '............#######.',
      '............######..',
      '#...........########',
      '##.........#########',
      '###.......##########',
      '####.....###########',
      '#####...############',
      '######.#############',
      '####################',
      '.###################',
      '..#################.',
      '...###############..',
      '....####...####.....',
      '....###.....###.....',
      '....##.......##.....'
    ] },
    { /* 20 */ n: 20, t: 'Kubo', q: 'El reto grande', d: 'El último: 20×20 con el cubo de Kuboplay. Todo lo aprendido a la vez. Sigue sin hacer falta adivinar ni una casilla.', p2: 900, p3: 560, b: [
      '.........##.........',
      '.......######.......',
      '....############....',
      '..################..',
      '####################',
      '#..##############..#',
      '###..##########..###',
      '######..####..######',
      '########....########',
      '####################',
      '#########..#########',
      '#########..#########',
      '#########..#########',
      '#########..#########',
      '#########..#########',
      '.########..########.',
      '...######..######...',
      '......###..###......',
      '........#..#........',
      '....................'
    ] }
  ]
};
if (typeof module !== 'undefined' && module.exports) module.exports = PICLV;
