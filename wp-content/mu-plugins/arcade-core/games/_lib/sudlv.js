/* Tabla de los 20 puzles de Sudoku Zen (sudoku-zen).
 * Escritos a mano en el sentido de que están elegidos y ordenados por técnica, no generados al vuelo.
 * Cada entrada: n tamaño, t nombre, q técnica que enseña, d explicación corta,
 * k clase de técnica (índice de TECH en scripts/check_sudlv.js: la más alta que hace falta),
 * p2/p3 segundos objetivo para 2★/3★ en dificultad normal, g pistas (fila a fila, "." = vacío).
 * Verificado con scripts/check_sudlv.js: solución única, resoluble solo con lógica (sin adivinar)
 * y la técnica declarada es realmente necesaria. */
const SUDLV = {
  'sudoku-zen': [
    { n: 4, t: 'Primer paso', q: 'El único candidato', d: 'En una casilla solo cabe un número: mira su fila, su columna y su caja.', k: 0, p2: 70, p3: 40,
      g: '2..1.1....4.4..2' },
    { n: 4, t: 'Cuatro esquinas', q: 'Menos pistas, mismo truco', d: 'Con solo cuatro pistas hay que encadenar: cada número que pones abre el siguiente.', k: 0, p2: 90, p3: 55,
      g: '..2..1....3..4..' },
    { n: 6, t: 'Se hace grande', q: 'El único candidato en 6×6', d: 'Mismo método en un tablero mayor: cajas de 3×2, seis números.', k: 0, p2: 200, p3: 130,
      g: '.5...4..365.6..43..34..6.451..3...4.' },
    { n: 6, t: 'El sitio que falta', q: 'Único sitio (candidato oculto)', d: 'Cuando un número solo cabe en una casilla de la fila, columna o caja, va ahí aunque quepan más números.', k: 1, p2: 260, p3: 165,
      g: '.....5....4323.6.16.1.3232....1.....' },
    { n: 6, t: 'Dos que van juntos', q: 'Par desnudo', d: 'Dos casillas de una misma unidad con los mismos dos candidatos se quedan esos dos: quítalos del resto.', k: 2, p2: 330, p3: 210,
      g: '6..2....5..1..2......3..2..5....4..6' },
    { n: 9, t: 'Nueve por nueve', q: 'Bienvenido al 9×9', d: 'Tablero completo con muchas pistas: solo con el único candidato se termina.', k: 0, p2: 300, p3: 190,
      g: '6..917.3..1.4.5..2.4.2...5....3..78.3.6...2.1.72..1....5...2.1.2..1.3.7..3.579..4' },
    { n: 9, t: 'Rastrear el número', q: 'Único sitio, de nuevo', d: 'Elige un número y recórrelo caja por caja: verás huecos donde solo cabe él.', k: 1, p2: 380, p3: 240,
      g: '..81......61.54.37..32.61.....57..68...6.1...74..82.....74.86..32.76.81......37..' },
    { n: 9, t: 'Menos pistas', q: 'Alternar los dos métodos', d: 'Con 27 pistas hay que ir y volver entre el único candidato y el único sitio.', k: 1, p2: 450, p3: 285,
      g: '..65...198....2.4..1.8...6.......98.7...8...4.82.......2...7.3..4.6....567...12..' },
    { n: 9, t: 'La pareja', q: 'Par desnudo en 9×9', d: 'Busca dos casillas de una fila, columna o caja con el mismo par de candidatos.', k: 2, p2: 520, p3: 330,
      g: '.9......8..1..83..83...2.1.62...7.3.1.......7.4.8...21.1.2...74..46..8..5......6.' },
    { n: 9, t: 'Escondidos', q: 'Pareja oculta', d: 'Si dos números solo caben en dos casillas de una unidad, esas casillas son de ellos: borra lo demás.', k: 3, p2: 600, p3: 380,
      g: '..3..5..274..98...1...4.....7.2.9.6...........5.6.7.8.....1...9...97..484..8..3..' },
    { n: 9, t: 'La caja apunta', q: 'Caja que apunta', d: 'Si dentro de una caja un número solo cabe en una fila, ese número sale de esa fila en las otras cajas.', k: 4, p2: 620, p3: 395,
      g: '..265...39.7.........3..1...89..3...5..7.1..8...5..79...4..7.........6.72...465..' },
    { n: 9, t: 'La línea reclama', q: 'Línea que reclama', d: 'Al revés: si en una fila un número solo cabe dentro de una caja, sale del resto de esa caja.', k: 5, p2: 660, p3: 420,
      g: '.8..1....54....9...2...9.48..6..3...4...6...2...5..6..79.6...3...3....76....2..9.' },
    { n: 9, t: 'Tres amigos', q: 'Trío desnudo', d: 'Tres casillas que entre las tres solo usan tres números se quedan esos tres.', k: 6, p2: 700, p3: 445,
      g: '..6..8......6.2.1...514....5...2.46.7.......5.32.6...7....956...2.7.6......3..9..' },
    { n: 9, t: 'Tres escondidos', q: 'Trío oculto', d: 'Tres números que solo caben en tres casillas: ahí van, aunque parezca que caben más.', k: 7, p2: 760, p3: 480,
      g: '..4.8...7...4..8..95......22.6..9......7.4......6..7.51......73..9..1...4...3.6..' },
    { n: 9, t: 'Alas de mosca', q: 'X-wing', d: 'El mismo número en dos filas y en las mismas dos columnas: fuera de esas filas, se va de esas columnas.', k: 8, p2: 820, p3: 520,
      g: '.7..5.98...1.6....8..7.....7......1.9.85.24.7.2......3.....5..9....3.6...64.7..5.' },
    { n: 9, t: 'Cuatro en raya', q: 'Cuarteto desnudo', d: 'Cuatro casillas con cuatro candidatos entre todas: el resto de la unidad los pierde.', k: 9, p2: 880, p3: 560,
      g: '45.........3...8...8142.........9643...5.........6..28..59..3..3......5697.......' },
    { n: 9, t: 'La Y griega', q: 'XY-wing', d: 'Tres casillas de dos candidatos en cadena: lo que ven las dos puntas se descarta.', k: 10, p2: 940, p3: 600,
      g: '1..9..24....1...377.....9...214...9...........9...751...6.....584...1....75..6..3' },
    { n: 9, t: 'El sable', q: 'Swordfish (sable)', d: 'Como el X-wing pero con tres filas y tres columnas.', k: 11, p2: 1000, p3: 640,
      g: '.59......7...6..18...9...7......635.17.....84.637......1...2...32..4...5......13.' },
    { n: 9, t: 'Casi a ciegas', q: 'XY-wing con 23 pistas', d: 'Pocas pistas y cadena larga: apunta candidatos o te perderás.', k: 10, p2: 1080, p3: 690,
      g: '..4..8....8...7.3.6....14..3.......17...4...99.......6..56....2.7.2...9....8..7..' },
    { n: 9, t: 'El reto grande', q: 'Todo lo aprendido', d: 'El último: hará falta casi todo el repertorio, sable incluido. Sin adivinar ni una vez.', k: 11, p2: 1200, p3: 780,
      g: '...5.........9.1.49....1.6.7...592..69..4..37..213...8.4.8....93.5.1.........4...' },
  ]
};
if (typeof module !== 'undefined' && module.exports) module.exports = SUDLV;
