/* Retos a mano de Palabra del Día (plan Friv · la vara). 20 desafíos escritos uno a uno para UN
 * jugador: ninguno se genera al azar. Solo los usa `palabra-del-dia`; el resto de modos del motor
 * `palabras.js` (ahorcado, sopa, rosco, anagramas, letras que caen) no miran esta tabla, y la
 * propia Palabra del Día de cada jornada sigue intacta en el «Modo diario» del menú.
 *
 * TODAS las palabras salen de games/_data/palabras5-es.txt (sección «soluciones»): no se añade ni
 * se reordena nada de ese fichero, cuyo orden fija la palabra del día.
 *
 * CADA RETO:
 *   name  rótulo corto                 tip   lo que enseña (cartel de los primeros segundos)
 *   r     rondas del reto. Cada ronda es una lista de palabras que se juegan A LA VEZ
 *         (['CAMPO'] una sola · ['FRESA','MUNDO'] dos tableros simultáneos, cada intento
 *         se evalúa en los dos). Varias rondas = cadena: se juegan seguidas y encadenarlas
 *         multiplica los puntos.
 *   tries intentos por ronda (compartidos entre los tableros de esa ronda)
 *   time  segundos de reloj para TODO el reto (0 = sin reloj)
 *   wild  comodines disponibles (Pista descubre una letra en su sitio · Descarte tacha tres
 *         letras que no están). Cada uno gasta uno del bote.
 *   g2    puntos necesarios para la 2.ª estrella [fácil, normal, difícil]
 *
 * VERBOS que se acumulan, de uno en uno: 1 base · 2 letras repetidas · 3 reloj · 4 familias
 * trampa (PLA_A) · 5 menos intentos · 6 comodines · 7 letras raras · 9 doble simultáneo ·
 * 12 cadena con multiplicador · 15 relámpago · 20 dos dobles seguidos con un solo reloj.
 *
 * DIFICULTAD (márgenes, nunca la ruta): fácil +1 intento por ronda y +1 comodín; difícil los de
 * la tabla. El reloj lo escala el kit (k.D.time: ×1,25 fácil, ×0,85 difícil).
 */
const PDDLV = {};

PDDLV.L = [
  { name: 'Primer intento', tip: 'Verde: la letra está en su sitio. Amarillo: está, pero en otro hueco.',
    r: [['CAMPO']], tries: 6, time: 0, wild: 0, g2: [200, 170, 170] },
  { name: 'Letras dobles', tip: 'Ojo: hay palabras con una letra repetida.',
    r: [['POLLO']], tries: 6, time: 0, wild: 0, g2: [170, 140, 140] },
  { name: 'Contrarreloj', tip: 'Ahora corre el reloj: los segundos que sobran también suman.',
    r: [['LIBRO']], tries: 6, time: 150, wild: 0, g2: [480, 390, 350] },
  { name: 'Familia peligrosa', tip: 'Cuidado con PLA_A: plata, playa, plaza, placa, plaga. Tienes un intento de más y un comodín.',
    r: [['PLAZA']], tries: 8, time: 170, wild: 1, g2: [310, 220, 180] },
  { name: 'Cinco balas', tip: 'Un intento menos. Empieza por una palabra con muchas vocales.',
    r: [['NIEVE']], tries: 5, time: 150, wild: 0, g2: [450, 360, 320] },
  { name: 'Comodines', tip: 'Pista descubre una letra en su sitio; Descarte tacha tres que no están.',
    r: [['JAULA']], tries: 5, time: 140, wild: 2, g2: [310, 230, 200] },
  { name: 'Letra rara', tip: 'Hay letras poco frecuentes: Z, J, X, Ñ. Piensa en ellas.',
    r: [['TAPIZ']], tries: 5, time: 130, wild: 1, g2: [350, 270, 240] },
  { name: 'Sin pistas fáciles', tip: 'Si te quedas atascado, gasta un intento en descartar letras.',
    r: [['BUQUE']], tries: 5, time: 130, wild: 1, g2: [290, 210, 180] },
  { name: 'Doble', tip: 'Dos palabras a la vez: cada intento se juega en los dos tableros.',
    r: [['FRESA', 'MUNDO']], tries: 8, time: 180, wild: 1, g2: [450, 350, 310] },
  { name: 'Doble con prisa', tip: 'Mismo doble, menos reloj. Abre con letras distintas.',
    r: [['TIGRE', 'SALSA']], tries: 8, time: 160, wild: 1, g2: [410, 320, 280] },
  { name: 'Doble ajustado', tip: 'Un intento menos para las dos palabras.',
    r: [['GLOBO', 'VERDE']], tries: 7, time: 160, wild: 1, g2: [380, 290, 250] },
  { name: 'Cadena de dos', tip: 'Dos palabras seguidas: encadenarlas multiplica los puntos.',
    r: [['MUSEO'], ['CARTA']], tries: 5, time: 170, wild: 1, g2: [480, 340, 300] },
  { name: 'Cadena de tres', tip: 'Tres seguidas. El multiplicador sube con cada una.',
    r: [['CIELO'], ['FAROL'], ['PUNTO']], tries: 5, time: 220, wild: 2, g2: [950, 720, 670] },
  { name: 'Trampas dobles', tip: '_ECHO y _ORRO: dos familias a la vez.',
    r: [['TECHO', 'MORRO']], tries: 7, time: 150, wild: 1, g2: [360, 270, 240] },
  { name: 'Relámpago', tip: 'Cinco intentos y setenta y cinco segundos. Sin comodines.',
    r: [['ZORRO']], tries: 5, time: 75, wild: 0, g2: [190, 130, 120] },
  { name: 'Cadena relámpago', tip: 'Tres palabras, cinco intentos cada una y un solo reloj.',
    r: [['BARCO'], ['JAMON'], ['RUEDA']], tries: 5, time: 210, wild: 1, g2: [830, 610, 560] },
  { name: 'Doble a ciegas', tip: 'Doble sin comodines. El reloj aprieta.',
    r: [['LLAVE', 'QUESO']], tries: 7, time: 135, wild: 0, g2: [330, 250, 220] },
  { name: 'Familias en cadena', tip: 'Tres hermanas de la misma familia: P_SAR.',
    r: [['PASAR'], ['PESAR'], ['POSAR']], tries: 5, time: 215, wild: 1, g2: [970, 740, 690] },
  { name: 'Doble difícil', tip: 'Dos palabras con letras raras al mismo tiempo.',
    r: [['BRUJA', 'EXITO']], tries: 7, time: 145, wild: 1, g2: [350, 260, 230] },
  { name: 'Duelo final', tip: 'Dos dobles seguidos y un solo reloj. Última prueba.',
    r: [['GARZA', 'FLUJO'], ['CHOZA', 'NORTE']], tries: 7, time: 240, wild: 0, g2: [790, 610, 560] },
];

/* Parámetros del reto ya ajustados a la dificultad (0 fácil · 1 normal · 2 difícil). */
PDDLV.of = function (n, dif) {
  const L = PDDLV.L[Math.max(0, Math.min(PDDLV.L.length - 1, (n | 0) - 1))];
  return { name: L.name, tip: L.tip, r: L.r, time: L.time, g2: L.g2[dif | 0],
    tries: L.tries + (dif === 0 ? 1 : 0), wild: L.wild + (dif === 0 && L.wild ? 1 : 0) };
};

/* Puntos de una ronda resuelta: 100 por palabra y 40 por intento sobrante, todo por el
 * multiplicador de cadena (×1 · ×1,5 · ×2 · ×2,5, tope ×3). Zona pura: la usan igual el motor
 * y el simulador de QA en Node. */
PDDLV.mult = (chain) => Math.min(3, 1 + Math.max(0, chain) * 0.5);
PDDLV.roundPts = (words, left, chain) => Math.round((100 * words + 40 * Math.max(0, left)) * PDDLV.mult(chain));
PDDLV.timePts = (secLeft) => Math.max(0, Math.round(secLeft * 2));

if (typeof module !== 'undefined' && module.exports) module.exports = PDDLV;
