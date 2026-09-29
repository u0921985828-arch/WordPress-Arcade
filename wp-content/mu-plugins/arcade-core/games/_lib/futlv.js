/* Campaña de «futbol-de-plaza» (plan Friv / docs/VARA.md): 20 desafíos de 1 jugador.
 * Solo la usa futbol-de-plaza; los otros 11 juegos de teamball.js siguen exactamente igual,
 * porque todo lo de aquí cuelga de FC (falso en los demás y también en el modo tele).
 *
 * Campo de 600×340. El jugador es el equipo rojo y ataca hacia la derecha (x=600);
 * defiende la portería de la izquierda (x=0). Centro del campo: (300, 170).
 *
 * CAMPOS de cada desafío:
 *   n    nombre · i  lo que enseña · tip  consejo de la tarjeta
 *   dur  duración del partido en segundos (40–70, la vara)
 *   cpu  nivel del rival, 0 (torpe) a 1 (crack)
 *   sty  estilo del rival: 'novato' · 'presion' · 'contra' · 'tiqui' · 'muro' · 'loco'
 *   obs  conos: [x, y, r] (rebotan balón y jugadores)
 *   mud  charcos: [x, y, r] (frenan a quien los pisa y el balón se para antes)
 *   wind viento lateral sobre el balón en px/s² (positivo = hacia abajo)
 *   mg   porterías móviles: [ampA, perA, ampB, perB] (A = la tuya, B = la del rival);
 *        amplitud en px y periodo en segundos; 0 = quieta
 *   gk   0 el rival no tiene portero · 1 normal · 2 portero grande (llega más lejos)
 *   long si está, un gol disparado desde más lejos que estos px vale DOBLE
 *   s2   diferencia de goles para la 2.ª estrella (la dificultad la mueve ±1)
 * ESTRELLAS: 1★ ganar · 2★ ganar por s2 goles o más · 3★ eso y además sin encajar.
 */
const FUTLV = {
  'futbol-de-plaza': [
    { n: 'El partidillo', i: 'Lo básico: corre con el balón y dispara manteniendo B.', tip: 'No dispares de lejos: acércate al área y tira a los palos, no al centro.',
      dur: 55, cpu: 0.10, sty: 'novato', gk: 1, s2: 2 },
    { n: 'Pared con el compi', i: 'Con A le pasas al compañero. Dos toques valen más que una carrera.', tip: 'Pasa, corre al hueco y pide el balón otra vez: el rival no llega.',
      dur: 55, cpu: 0.16, sty: 'novato', gk: 1, s2: 2 },
    { n: 'Portero de verdad', i: 'NUEVO: el rival ya tiene portero y se estira. Hay que buscarle las esquinas.', tip: 'Dispara cruzado: el portero cubre el centro, los palos no.',
      dur: 58, cpu: 0.24, sty: 'novato', gk: 1, s2: 2 },
    { n: 'Los conos', i: 'NUEVO: conos en el campo. El balón rebota en ellos, tú también.', tip: 'Los conos también le estorban al rival: juega pegado a ellos y pásala en corto.',
      dur: 60, cpu: 0.30, sty: 'novato', gk: 1, s2: 2,
      obs: [[230, 100, 15], [230, 240, 15], [370, 170, 15]] },
    { n: 'Presión alta', i: 'NUEVO: este rival te salta encima en cuanto tocas el balón.', tip: 'Contra la presión, primer toque y pase: no intentes regatear a los dos.',
      dur: 60, cpu: 0.36, sty: 'presion', gk: 1, s2: 2 },
    { n: 'Portería bailona', i: 'NUEVO: la portería del rival se mueve. Hay que tirar donde VA a estar.', tip: 'Cuenta el vaivén y suelta el disparo medio segundo antes de que pase por el centro.',
      dur: 60, cpu: 0.38, sty: 'novato', gk: 1, s2: 2, mg: [0, 0, 46, 6] },
    { n: 'Charcos de barro', i: 'NUEVO: los charcos. Dentro corres menos y el balón se para antes.', tip: 'Rodea el barro cuando lleves el balón y mete al rival dentro cuando defiendas.',
      dur: 62, cpu: 0.40, sty: 'novato', gk: 1, s2: 2,
      mud: [[200, 170, 52], [400, 90, 46], [400, 250, 46]] },
    { n: 'Al contragolpe', i: 'NUEVO: este rival se encierra y sale a la carrera cuando roba.', tip: 'No subas los dos: deja al compañero atrás o te cogen a la contra.',
      dur: 62, cpu: 0.44, sty: 'contra', gk: 1, s2: 2 },
    { n: 'Viento de levante', i: 'NUEVO: el viento empuja el balón. Los pases largos se van.', tip: 'Apunta un poco contra el viento; en corto casi no se nota.',
      dur: 62, cpu: 0.46, sty: 'novato', gk: 1, s2: 2, wind: 52 },
    { n: 'El Muro del barrio', i: 'JEFE: dos defensas plantados y un portero enorme. Ganar aquí cuesta.', tip: 'Al muro se le gana por fuera: abre el juego a la banda y centra al segundo palo.',
      dur: 66, cpu: 0.52, sty: 'muro', gk: 2, s2: 1,
      obs: [[300, 80, 15], [300, 260, 15]] },
    { n: 'Tiqui-taca', i: 'NUEVO: el rival se la pasa sin parar y te hace correr.', tip: 'No persigas el balón: cierra el pase y espera a que se equivoquen.',
      dur: 62, cpu: 0.50, sty: 'tiqui', gk: 1, s2: 2 },
    { n: 'Golazos de lejos', i: 'NUEVO: los goles desde fuera de la línea valen DOBLE.', tip: 'Dos golazos de lejos valen más que cuatro de dentro: busca el hueco y suelta el zurdazo.',
      dur: 62, cpu: 0.48, sty: 'novato', gk: 1, s2: 3, long: 230 },
    { n: 'Conos y barro', i: 'Las dos cosas a la vez: el campo ya no es un rectángulo liso.', tip: 'Memoriza un pasillo limpio hasta el área y úsalo siempre.',
      dur: 64, cpu: 0.52, sty: 'presion', gk: 1, s2: 2,
      obs: [[200, 120, 15], [200, 220, 15], [400, 120, 15], [400, 220, 15]],
      mud: [[300, 170, 58]] },
    { n: 'Sin portero, pero…', i: 'El rival juega sin portero, y a cambio aprieta con los dos arriba.', tip: 'Con la portería libre no hace falta afinar: llega y empuja, pero cúbrete la espalda.',
      dur: 62, cpu: 0.56, sty: 'presion', gk: 0, s2: 3 },
    { n: 'Viento y vaivén', i: 'Viento cruzado y las dos porterías moviéndose.', tip: 'Defiende pegado a tu portería: con ella en movimiento, el rebote es tuyo.',
      dur: 64, cpu: 0.56, sty: 'contra', gk: 1, s2: 2, wind: -60, mg: [40, 7, 52, 5.5] },
    { n: 'El laberinto', i: 'Seis conos: aquí manda el pase, no la carrera.', tip: 'Usa los conos de pared: tira contra uno y recoge el rebote.',
      dur: 64, cpu: 0.58, sty: 'tiqui', gk: 1, s2: 2,
      obs: [[180, 90, 15], [180, 250, 15], [300, 170, 17], [420, 90, 15], [420, 250, 15], [300, 40, 14]] },
    { n: 'Contra con barro', i: 'Se encierran, y el barro te frena justo al salir.', tip: 'Saca el balón por fuera del barro aunque des un rodeo: llegar entero vale más.',
      dur: 64, cpu: 0.60, sty: 'contra', gk: 2, s2: 2,
      mud: [[250, 90, 50], [250, 250, 50]] },
    { n: 'Dianas de lejos', i: 'Golazos dobles otra vez, pero con la portería bailando.', tip: 'Espera a que la portería venga hacia ti y suéltala antes de que llegue.',
      dur: 66, cpu: 0.62, sty: 'presion', gk: 1, s2: 3, long: 250, mg: [0, 0, 56, 5] },
    { n: 'La final del patio', i: 'Todo lo aprendido a la vez, y el rival ya no perdona.', tip: 'Ritmo: tres pases y disparo. Si dudas, te la quitan.',
      dur: 68, cpu: 0.70, sty: 'tiqui', gk: 2, s2: 2, wind: 44,
      obs: [[230, 110, 15], [370, 230, 15]], mud: [[300, 170, 48]] },
    { n: 'La Selección de la Plaza', i: 'JEFE FINAL: los mejores del barrio, campo minado y las dos porterías locas.', tip: 'Aguanta el primer cuarto de hora sin encajar: se cansan y dejan huecos.',
      dur: 70, cpu: 0.82, sty: 'loco', gk: 2, s2: 1, wind: -50, long: 240, mg: [50, 6, 58, 4.5],
      obs: [[200, 100, 15], [200, 240, 15], [300, 170, 17], [400, 100, 15], [400, 240, 15]],
      mud: [[140, 170, 44], [460, 170, 44]] },
  ],
};
/* estilos del rival: correr, aguantar atrás, apretar al que lleva el balón, disparar y parar */
const FUTSTY = {
  novato: { run: 0.92, deep: 0.00, press: 0.00, shoot: 0.90, keep: 1.00 },
  presion: { run: 1.06, deep: -0.12, press: 0.85, shoot: 1.00, keep: 0.95 },
  contra: { run: 1.10, deep: 0.22, press: 0.15, shoot: 1.05, keep: 1.05 },
  tiqui: { run: 1.00, deep: 0.05, press: 0.45, shoot: 0.85, keep: 1.00 },
  muro: { run: 0.88, deep: 0.34, press: 0.20, shoot: 0.80, keep: 1.25 },
  loco: { run: 1.14, deep: -0.05, press: 0.70, shoot: 1.15, keep: 1.10 },
};
if (typeof module !== 'undefined' && module.exports) module.exports = { FUTLV, FUTSTY };
