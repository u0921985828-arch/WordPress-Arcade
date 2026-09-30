/* Niveles a mano de Burbujas Arcoíris (plan Friv, F3 · tanda 7).
 * Solo los usa el juego 'burbujas-arcoiris'; Fusión de Frutas y Fusión Solar no miran esta tabla.
 * Las reglas que los resuelven viven en la zona pura <BU> de src/eng/burbujas.js, y
 * scripts/check_burblv.js las usa tal cual para jugar los 20 en las tres dificultades.
 *
 * REJILLA — hexagonal, 9 casillas en las filas pares y 8 en las impares (van medio hueco a la
 * derecha). Cada fila del mapa `m` se escribe con esa longitud exacta; la fila 0 va pegada al
 * techo y es la que sujeta todo lo demás.
 *
 *   .        hueco
 *   1-6      burbuja normal (1 rosa · 2 azul · 3 verde · 4 amarilla · 5 morada · 6 naranja)
 *   a-f      hielo del mismo color (el primer trío rompe la capa, el segundo la revienta)
 *   A-F      burbuja atrapada del mismo color (cuenta para el objetivo «rescatar»)
 *   #        piedra (no estalla nunca; solo cae si se queda sin sujeción)
 *   ?        arcoíris (comodín: hace juego con cualquier color)
 *   *        bomba (revienta a sus seis vecinas cuando estalla algo a su lado)
 *   o        objeto (no estalla; cuenta para el objetivo «bajar» cuando cae)
 *   +        TESORO (tampoco estalla; hay que descolgarlo y hacen falta todos para ★★★)
 *   L        CERROJO (solo lo abren racimos de 5+ —dos— o una bomba; sujeta lo que cuelga)
 *   J        GUARDIÁN del Prisma (jefe: ancla el tubo y solo cae a golpes)
 *
 * NIVEL:
 *   goal  'clear'  limpiar el tubo (piedras, objetos, tesoros y cerrojos no cuentan)
 *         'rescue' rescatar `need` burbujas atrapadas (al reventarlas o al hacerlas caer)
 *         'drop'   bajar `need` objetos (hay que descolgarlos)
 *         'hold'   aguantar `need` bajadas del techo sin que nada cruce la línea rosa
 *         'combo'  hacer `need` racimos de cinco o más
 *         'boss'   tumbar al Guardián (`boss` = golpes que aguanta)
 *   cols  colores en juego (1..cols; la dificultad suma o resta uno)
 *   shots [fácil, normal, difícil] disparos disponibles — escritos a mano, no escalados
 *   push  disparos entre bajada y bajada del techo (0 = el techo no baja por disparos)
 *   sec   segundos entre bajadas del techo (0 = el techo no baja por reloj)
 *   par   [[★★,★★★] fácil, [★★,★★★] normal, [★★,★★★] difícil] — tiros usados como mucho
 *   mast  racimos de 5+ que además pide la tercera estrella (0 = ninguno)
 *   spec  probabilidad de disparo especial: b bomba · r arcoíris
 *   tip   la idea que enseña el nivel (se lee bajo el objetivo)
 *
 * ★ superarlo · ★★ en ≤ par2 tiros · ★★★ en ≤ par3 tiros CON todos los tesoros bajados,
 * los racimos pedidos y sin gastar el salvavidas (que existe desde el nivel 11).
 * La dificultad cambia los márgenes (tiros, colores, ritmo del techo, pares) y nunca la ruta.
 *
 * MECÁNICAS NUEVAS, de una en una: 11 tesoro · 13 cerrojo · 15 racimos de cinco ·
 * 16 techo a reloj · 20 Guardián del Prisma.
 */
const BURBLV = {
  'burbujas-arcoiris': [
    /* ---- 1-3: la regla básica, el techo y las caídas ---- */
    { /*  1 */ name: 'Tres iguales', goal: 'clear', cols: 3, shots: [34, 32, 32], push: 0,
      par: [[26, 20], [25, 20], [25, 20]], tip: 'Tres burbujas iguales que se tocan estallan.', m: [
      '112233112',
      '23311223',
      '311223311',
      '12233112',
      '233112233',
      '11223311',
      '223311223',
    ] },
    { /*  2 */ name: 'El techo baja', goal: 'clear', cols: 3, shots: [34, 33, 34], push: [18, 17, 17],
      par: [[25, 19], [25, 19], [25, 19]], tip: 'Cada pocos disparos baja el techo una fila: limpia hacia arriba.', m: [
      '112233112',
      '33112233',
      '223311223',
      '11223311',
      '331122331',
      '22331122',
    ] },
    { /*  3 */ name: 'Que se derrumbe', goal: 'clear', cols: 3, shots: [42, 40, 44], push: [21, 20, 22],
      par: [[31, 26], [32, 27], [33, 28]], tip: 'Lo que se queda colgando cae solo… y vale el doble.', m: [
      '123123123',
      '23123123',
      '.1.2.3.1',
      '.2.3.1.2.',
      '.3.1.2.3',
      '.3.3.3.3.',
      '.2.1.2.1',
      '.1.2.1.2.',
      '.3.1.3.1',
    ] },
    /* ---- 4-5: los objetos ---- */
    { /*  4 */ name: 'El cofre dorado', goal: 'drop', need: [4, 4, 4], cols: 4, shots: [30, 27, 26], push: 0,
      par: [[22, 17], [21, 17], [21, 17]], tip: 'El objeto dorado no estalla: hay que descolgarlo.', m: [
      '112233441',
      '22334411',
      '334411223',
      '44112233',
      '1o2o3o4o1',
    ] },
    { /*  5 */ name: 'Descuelga cinco', goal: 'drop', need: [5, 5, 5], cols: 4, shots: [44, 44, 46], push: [22, 22, 23],
      par: [[28, 22], [28, 22], [32, 26]], tip: 'Revienta lo que sujeta el objeto y déjalo caer.', m: [
      '112233441',
      '2o344o12',
      '334411223',
      '4o122o33',
      '112233441',
      '2o344o12',
      '..2.3.4..',
    ] },
    /* ---- 6-7: la piedra ---- */
    { /*  6 */ name: 'Piedra en medio', goal: 'clear', cols: 3, shots: [34, 30, 28], push: 0,
      par: [[24, 18], [22, 17], [22, 17]], tip: 'La piedra no estalla, pero cae con lo que la sujeta.', m: [
      '112233112',
      '23311223',
      '311223311',
      '12233112',
      '#2#1#3#2#',
    ] },
    { /*  7 */ name: 'Tras el muro', goal: 'rescue', need: [5, 5, 5], cols: 4, shots: [36, 33, 31], push: [18, 16, 15],
      par: [[24, 18], [22, 17], [20, 16]], tip: 'Tira la piedra de arriba y la atrapada cae con ella.', m: [
      '112233441',
      '22334411',
      '334411223',
      '##2211##',
      'A1B2C3D4E',
      '11223344',
    ] },
    /* ---- 8-9: el hielo ---- */
    { /*  8 */ name: 'Dos capas', goal: 'clear', cols: 4, shots: [40, 38, 36], push: 0,
      par: [[26, 21], [25, 21], [25, 21]], tip: 'El hielo aguanta dos tríos: el primero rompe la capa.', m: [
      '112233441',
      'aabbccdd',
      '334411223',
      'ccddaabb',
      '223344112',
      'bbccddaa',
    ] },
    { /*  9 */ name: 'Hielo y roca', goal: 'rescue', need: [5, 5, 5], cols: 4, shots: [44, 41, 39], push: [18, 17, 16],
      par: [[30, 24], [28, 23], [26, 22]], tip: 'Hielo y piedra juntos: pica primero por los lados.', m: [
      '112233441',
      'aabbccdd',
      '334411223',
      '##2211##',
      'A1B2C3D4E',
      'ccddaabb',
      '..4.F.2..',
    ] },
    /* ---- 10: primera prueba de resistencia ---- */
    { /* 10 */ name: 'Aguanta cinco', goal: 'hold', need: [4, 5, 5], cols: 5, shots: [36, 36, 34], push: [7, 6, 6],
      par: [[30, 29], [32, 31], [32, 31]], tip: 'Aguantar ya es la hazaña: que nada cruce la línea rosa.', m: [
      '112233445',
      '22334455',
      '334455112',
      '44551122',
      '551122334',
    ] },
    /* ---- 11: TESORO ---- */
    { /* 11 */ name: 'Los tres tesoros', goal: 'clear', cols: 4, shots: [42, 42, 43], push: [20, 20, 24],
      par: [[27, 21], [27, 21], [27, 21]], tip: 'El tesoro turquesa también se descuelga: los tres dan la tercera estrella.', m: [
      '112233441',
      '22334411',
      '334411223',
      '44112233',
      '112233441',
      '+.3.4.+.',
      '....+....',
    ] },
    /* ---- 12: la bomba ---- */
    { /* 12 */ name: 'Bomba de racimo', goal: 'clear', cols: 4, shots: [42, 38, 36], push: [22, 20, 19], spec: { b: 0.16 },
      par: [[30, 22], [28, 21], [27, 21]], tip: 'La bomba revienta a sus seis vecinas: cae media pared.', m: [
      '1122*3344',
      '22334411',
      '3344*1122',
      '44112233',
      '1122*3344',
      '22334411',
      '3344*1122',
      '44112233',
      '1122*3344',
      '22334411',
    ] },
    /* ---- 13: CERROJO ---- */
    { /* 13 */ name: 'El cerrojo', goal: 'clear', cols: 4, shots: [50, 52, 54], push: [25, 26, 27], spec: { b: 0.1 },
      par: [[36, 30], [35, 30], [36, 31]], tip: 'El cerrojo lo abre un racimo de cinco: lo que cuelga de él se derrumba.', m: [
      '112233441',
      '22334411',
      '334411223',
      '44112233',
      '112233441',
      '22334411',
      '334411223',
      '33334444',
      '112.L.L.4',
      '...a.b..',
    ] },
    /* ---- 14: el arcoíris ---- */
    { /* 14 */ name: 'Comodín', goal: 'clear', cols: 5, shots: [44, 41, 40], push: [18, 17, 16], spec: { r: 0.16 },
      par: [[28, 22], [27, 22], [27, 22]], tip: 'El arcoíris hace juego con cualquier color, en el tubo y en el cañón.', m: [
      '112233445',
      '23344551',
      '334455112',
      '4?551?22',
      '551122334',
      '1+2?3.4+',
    ] },
    /* ---- 15: RACIMOS DE CINCO ---- */
    { /* 15 */ name: 'Racimos de cinco', goal: 'combo', need: [8, 9, 9], cols: 5, shots: [40, 38, 38], push: [20, 19, 19], spec: { r: 0.1 },
      par: [[30, 24], [29, 23], [29, 23]], tip: 'Los racimos de cinco piden montones de cuatro ya puestos: búscalos.', m: [
      '111222333',
      '11122233',
      '444555111',
      '44455511',
      '222333444',
      '22233344',
      '555111222',
      '55511122',
      '333444555',
      '33344455',
      '111222333',
    ] },
    /* ---- 16: TECHO A RELOJ ---- */
    { /* 16 */ name: 'Contra el reloj', goal: 'clear', cols: 4, shots: [44, 41, 40], push: 0, sec: [42, 39, 38], spec: { b: 0.12 },
      par: [[28, 22], [27, 22], [26, 21]], tip: 'Aquí el techo baja por reloj: no te quedes pensando.', m: [
      '112233441',
      '22334411',
      '334411223',
      '44112233',
      '112233441',
      '22334411',
    ] },
    /* ---- 17-19: todo junto, cinco y seis colores ---- */
    { /* 17 */ name: 'Rescate helado', goal: 'rescue', need: [6, 6, 6], cols: 5, shots: [38, 34, 31], push: [16, 14, 13], spec: { b: 0.12, r: 0.1 },
      par: [[28, 21], [26, 20], [24, 19]], tip: 'Atrapadas en hielo y tras cerrojo: dos tríos y un racimo grande.', m: [
      '112233445',
      'aabbccdd',
      '334455112',
      '44L5L512',
      'A1B2C3D4E',
      'ccddaabb',
      '..+.F.+..',
    ] },
    { /* 18 */ name: 'Aguanta el reloj', goal: 'hold', need: [4, 4, 5], cols: 5, shots: [40, 40, 40], push: 0, sec: [18, 16, 14], spec: { b: 0.12 },
      par: [[36, 35], [36, 35], [38, 37]], tip: 'El techo ya no espera a tus disparos: baja solo.', m: [
      '112233445',
      '22334455',
      '334455112',
      '44551122',
      '551122334',
    ] },
    { /* 19 */ name: 'El tubo entero', goal: 'clear', cols: 5, shots: [48, 44, 42], push: [22, 20, 19], spec: { b: 0.14, r: 0.12 },
      par: [[32, 26], [30, 25], [29, 24]], mast: [2, 3, 3], tip: 'El tubo entero, cinco colores y dos tesoros: pica el techo y que caiga todo.', m: [
      '112233445',
      'aabbccdd',
      '334455112',
      '44551122',
      '2+3.4.5+1',
    ] },
    /* ---- 20: el remate ---- */
    { /* 20 */ name: 'Guardián del Prisma', goal: 'boss', boss: [12, 14, 15], cols: 5, shots: [54, 50, 48], push: [16, 15, 14], sec: [30, 27, 24], spec: { b: 0.16, r: 0.12 },
      par: [[38, 32], [36, 31], [35, 30]], tip: 'El Guardián ancla el tubo entero. Cada racimo a su lado le quita un golpe.', m: [
      '112233445',
      '22334455',
      '3344J5511',
      '44551122',
      '551122334',
      '1122?344',
      '.+.3.4.+.',
    ] },
  ],
};
