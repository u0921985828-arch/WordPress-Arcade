/* Retos a mano de Trivia de Sobremesa (plan Friv · la vara). 20 desafíos escritos uno a uno para
 * UN jugador. Solo los usa `trivia-de-sobremesa` y solo fuera del modo tele: en la tele (k.party)
 * manda el mando y la ronda de 10 preguntas con pulsadores queda exactamente como estaba, igual
 * que el resto de modos del motor `trivia.js` (Verdad o Bulo, Más o Menos, Mapa, Banderas, Cálculo).
 *
 * Las preguntas salen del fichero propio games/_data/trivia-es.json (845 preguntas, seis
 * categorías, tres niveles de dificultad). La tabla no escoge preguntas concretas: escribe a mano
 * QUÉ categorías entran en cada reto y CON QUÉ dificultad, para que la curva sea la misma partida
 * tras partida aunque las preguntas cambien.
 *
 * CADA RETO:
 *   name  rótulo corto              tip   lo que enseña (cartel de los primeros segundos)
 *   cats  categorías que se mezclan, en orden de turno (geo his cie dep cul len)
 *   qs    dificultad de cada pregunta (1 fácil · 2 media · 3 difícil). Su longitud = nº de preguntas
 *   t     segundos por pregunta (0 = el reto va con reloj compartido)
 *   T     segundos de reloj compartido para todo el reto (0 = cada pregunta tiene el suyo)
 *   lives fallos permitidos (0 = no se pierde por fallar, solo puntos)
 *   wild  comodines (50/50 quita dos opciones malas · +Tiempo regala 6 s). Cada uso gasta uno
 *   dbl   1 = la última pregunta es «doble o nada»: acierto ×2, fallo −200
 *   g2    puntos para la 2.ª estrella [fácil, normal, difícil]
 *
 * VERBOS que se acumulan, de uno en uno: 1 base · 3 racha con multiplicador · 4 dos categorías ·
 * 5 comodines · 6 vidas · 8 reloj compartido · 9 tres categorías · 12 relámpago · 13 cuatro
 * categorías · 14 doble o nada · 16 cinco categorías · 18 las seis · 20 ronda de campeón.
 *
 * DIFICULTAD (márgenes, nunca la ruta): fácil +1 vida y +1 comodín; difícil −1 vida cuando hay 3.
 * El reloj lo escala el kit (k.D.time: ×1,25 fácil, ×0,85 difícil). Las preguntas son las mismas.
 */
const TRIVLV = {};

TRIVLV.L = [
  { name: 'Calentamiento', tip: 'Toca la respuesta. Cuanto antes contestes, más puntos.',
    cats: ['geo'], qs: [1, 1, 1, 1, 1], t: 14, T: 0, lives: 0, wild: 0, dbl: 0, g2: [700, 670, 630] },
  { name: 'Ciencia fácil', tip: 'Con las flechas también se elige, y con Espacio se responde.',
    cats: ['cie'], qs: [1, 1, 1, 2, 2], t: 14, T: 0, lives: 0, wild: 0, dbl: 0, g2: [700, 670, 630] },
  { name: 'La racha', tip: 'Dos aciertos seguidos multiplican ×1,5; cuatro, ×2; seis, ×2,5.',
    cats: ['his'], qs: [1, 1, 2, 2, 2], t: 13, T: 0, lives: 0, wild: 0, dbl: 0, g2: [700, 670, 630] },
  { name: 'Dos mesas', tip: 'Dos categorías que se van turnando.',
    cats: ['geo', 'cie'], qs: [1, 2, 2, 2, 2], t: 13, T: 0, lives: 0, wild: 0, dbl: 0, g2: [700, 670, 630] },
  { name: 'Comodines', tip: '50/50 quita dos opciones malas; +Tiempo regala seis segundos.',
    cats: ['his', 'cul'], qs: [2, 2, 2, 2, 2], t: 13, T: 0, lives: 0, wild: 2, dbl: 0, g2: [700, 670, 630] },
  { name: 'Tres vidas', tip: 'A partir de aquí fallar cuesta una vida: con tres fallos se acaba.',
    cats: ['dep', 'geo'], qs: [1, 2, 2, 2, 2, 2], t: 13, T: 0, lives: 3, wild: 2, dbl: 0, g2: [900, 860, 810] },
  { name: 'Seis preguntas', tip: 'Si no sabes, arriesga: no responder también rompe la racha.',
    cats: ['len', 'cie'], qs: [2, 2, 2, 2, 2, 2], t: 12, T: 0, lives: 3, wild: 2, dbl: 0, g2: [900, 860, 810] },
  { name: 'Reloj único', tip: 'Un solo reloj para las seis preguntas: administra el tiempo.',
    cats: ['geo', 'his'], qs: [2, 2, 2, 2, 2, 2], t: 0, T: 70, lives: 3, wild: 2, dbl: 0, g2: [900, 860, 810] },
  { name: 'Tres mesas', tip: 'Tres categorías mezcladas y el reloj corriendo.',
    cats: ['cie', 'cul', 'dep'], qs: [2, 2, 2, 2, 2, 2], t: 0, T: 68, lives: 3, wild: 2, dbl: 0, g2: [900, 860, 810] },
  { name: 'Siete seguidas', tip: 'Una pregunta más y la sexta ya es difícil.',
    cats: ['geo', 'len', 'his'], qs: [2, 2, 2, 2, 2, 3, 2], t: 0, T: 78, lives: 3, wild: 2, dbl: 0, g2: [1150, 1100, 1040] },
  { name: 'Sin red', tip: 'Solo dos vidas y un comodín.',
    cats: ['cul', 'cie'], qs: [2, 2, 2, 2, 2, 2], t: 12, T: 0, lives: 2, wild: 1, dbl: 0, g2: [900, 860, 810] },
  { name: 'Relámpago', tip: 'Siete segundos por pregunta. Lee rápido y decide.',
    cats: ['geo', 'dep'], qs: [2, 2, 2, 2, 2, 2], t: 7, T: 0, lives: 3, wild: 2, dbl: 0, g2: [900, 860, 810] },
  { name: 'Cuatro mesas', tip: 'Cuatro categorías y dos preguntas difíciles escondidas.',
    cats: ['geo', 'his', 'cie', 'len'], qs: [2, 2, 2, 3, 2, 3], t: 0, T: 75, lives: 3, wild: 2, dbl: 0, g2: [900, 860, 810] },
  { name: 'Doble o nada', tip: 'La última vale el doble… y fallarla resta 200.',
    cats: ['cul', 'dep', 'geo'], qs: [2, 2, 2, 2, 2, 3], t: 0, T: 75, lives: 3, wild: 2, dbl: 1, g2: [1100, 1050, 990] },
  { name: 'Relámpago doble', tip: 'Siete preguntas a siete segundos, y la última doble o nada.',
    cats: ['cie', 'len'], qs: [2, 2, 2, 2, 2, 2, 2], t: 7, T: 0, lives: 3, wild: 1, dbl: 1, g2: [1400, 1340, 1270] },
  { name: 'Cinco mesas', tip: 'Cinco categorías y tres preguntas difíciles.',
    cats: ['geo', 'his', 'cie', 'dep', 'cul'], qs: [2, 2, 3, 2, 3, 2, 3], t: 0, T: 85, lives: 3, wild: 2, dbl: 0, g2: [1150, 1100, 1040] },
  { name: 'Exigente', tip: 'Cuatro difíciles de seis, dos vidas y un comodín.',
    cats: ['his', 'geo'], qs: [3, 2, 3, 2, 3, 3], t: 0, T: 75, lives: 2, wild: 1, dbl: 0, g2: [900, 860, 810] },
  { name: 'Las seis mesas', tip: 'Las seis categorías, una detrás de otra, y doble o nada al final.',
    cats: ['geo', 'his', 'cie', 'dep', 'cul', 'len'], qs: [2, 3, 2, 3, 2, 3, 2], t: 0, T: 85, lives: 3, wild: 1, dbl: 1, g2: [1400, 1340, 1270] },
  { name: 'Sin comodines', tip: 'Aquí no hay ayudas: solo lo que sepas.',
    cats: ['geo', 'cie', 'his'], qs: [3, 3, 2, 3, 3, 2], t: 0, T: 72, lives: 2, wild: 0, dbl: 0, g2: [900, 860, 810] },
  { name: 'Ronda de campeón', tip: 'Ocho preguntas, las seis categorías, sin comodines y doble o nada.',
    cats: ['geo', 'his', 'cie', 'dep', 'cul', 'len'], qs: [3, 3, 3, 2, 3, 3, 2, 3], t: 0, T: 100, lives: 2, wild: 0, dbl: 1, g2: [1650, 1580, 1500] },
];

/* Parámetros del reto ya ajustados a la dificultad (0 fácil · 1 normal · 2 difícil). */
TRIVLV.of = function (n, dif) {
  const L = TRIVLV.L[Math.max(0, Math.min(TRIVLV.L.length - 1, (n | 0) - 1))];
  let lives = L.lives;
  if (lives) lives = dif === 0 ? lives + 1 : dif === 2 && lives >= 3 ? lives - 1 : lives;
  return { name: L.name, tip: L.tip, cats: L.cats, qs: L.qs, t: L.t, T: L.T, dbl: L.dbl,
    lives, wild: L.wild + (dif === 0 && L.wild ? 1 : 0), g2: L.g2[dif | 0] };
};

/* Zona pura de puntuación (la comparten el motor y el simulador de QA en Node).
 * Acierto: 100 + hasta 60 por rapidez, por el multiplicador de racha. */
TRIVLV.mult = (streak) => (streak >= 6 ? 2.5 : streak >= 4 ? 2 : streak >= 2 ? 1.5 : 1);
TRIVLV.pts = (streak, frac, dbl) => Math.round((100 + 60 * Math.max(0, Math.min(1, frac))) * TRIVLV.mult(streak)) * (dbl ? 2 : 1);
TRIVLV.miss = (dbl) => (dbl ? -200 : 0);

if (typeof module !== 'undefined' && module.exports) module.exports = TRIVLV;
