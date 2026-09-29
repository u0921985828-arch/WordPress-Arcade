/* Gladiadores de Juguete — 20 retos de un jugador escritos a mano (plan Friv / docs/VARA.md).
 * Solo los usa el juego «gladiadores-de-juguete» FUERA del modo tele: en la tele manda el mando y
 * el combate de 1–4 a 3 vidas no se toca. Los modos almohada y chatarra de brawl.js ni se enteran.
 *
 * CAMPOS de cada reto
 *   n    nombre del reto
 *   i    la idea NUEVA que estrena (sale en el cartel del principio)
 *   tip  consejo corto
 *   obj  'ko'   dejar sin vidas a todos los rivales
 *        'time' aguantar `hold` segundos
 *        'kos'  hacer `nk` KO
 *   ph   escenario fijo: 0 mesa de juegos · 1 ventilador · 2 suelo encerado · 3 tren de juguete
 *   me   vidas con las que empiezas
 *   foes [{sk pericia 0..1, st vidas, it arma con la que sale, big acorazado}]
 *   it   objetos que caen: sin campo = ninguno · '*' = todos · nombre = solo ese
 *        (sword espada · hammer martillo · bow arco · shield escudo · umbrella paraguas · yoyo yoyó)
 *   frail segundos que aguanta una plataforma pisada antes de desmoronarse (vuelve a los 3,2 s)
 *   rain  segundos entre bombas que caen del techo (avisan 1 s antes con una diana)
 *   hold  segundos a aguantar ('time')      nk  KO que hay que hacer ('kos')
 *   lim   segundos de límite del reto
 *   s2    vidas que hay que conservar para la 2.a estrella
 *   t3    segundos para la 3.a (además, sin perder NI UNA vida)
 *
 * La dificultad (k.dif) mueve la pericia del rival y el margen de la 3.a estrella, nunca el reto:
 * fácil x0,78 y +12 s; difícil x1,16 y -6 s.
 */
const BRAWLV = [
  /* ---- 1-3: la escuela: pegar, cargar el golpe y no salirse ---- */
  { n: 'Primer asalto', i: 'A pega, B salta. Cuanto más porcentaje tiene el rival, más lejos sale volando.', tip: 'No persigas al borde: los KO se dan empujando, no cayéndote detrás.', obj: 'ko', ph: 0, me: 3, s2: 3, t3: 40, lim: 100, foes: [{ sk: 0.16, st: 2 }] },
  { n: 'Golpe cargado', i: 'Si mantienes A, el golpe se carga y manda mucho más lejos.', tip: 'Carga cuando el rival esté aturdido: si no, te da tiempo a comerte el suyo.', obj: 'ko', ph: 0, me: 3, s2: 3, t3: 45, lim: 110, foes: [{ sk: 0.24, st: 2 }] },
  { n: 'Dos muñecos', i: 'Dos rivales a la vez: uno te distrae mientras el otro te cerca.', tip: 'Ponte de forma que los dos te vengan por el mismo lado.', obj: 'ko', ph: 0, me: 3, s2: 2, t3: 55, lim: 130, foes: [{ sk: 0.20, st: 1 }, { sk: 0.20, st: 1 }] },
  /* ---- 4-6: las armas de juguete ---- */
  { n: 'Espada de madera', i: 'NUEVO: caen armas. La espada pega más lejos y más rápido.', tip: 'El arma se gasta: no la malgastes al aire.', obj: 'ko', ph: 0, me: 3, s2: 3, t3: 48, lim: 120, it: 'sword', foes: [{ sk: 0.26, st: 2 }] },
  { n: 'Martillo chirriante', i: 'El martillo tarda en caer, pero un solo golpe manda al otro barrio.', tip: 'Pega con el martillo cuando el rival aterrice: en el aire no puede esquivar.', obj: 'ko', ph: 0, me: 3, s2: 3, t3: 52, lim: 125, it: 'hammer', foes: [{ sk: 0.28, st: 2 }] },
  { n: 'Arco de ventosas', i: 'El arco pica de lejos: el combate se juega a distancia.', tip: 'Contra el arco, acércate saltando en zigzag; quieto eres una diana.', obj: 'ko', ph: 0, me: 3, s2: 2, t3: 58, lim: 135, it: 'bow', foes: [{ sk: 0.28, st: 2, it: 'bow' }] },
  /* ---- 7-9: los escenarios se mueven ---- */
  { n: 'Ventilador', i: 'NUEVO: el ventilador sopla por rachas y te lleva hacia el borde.', tip: 'Con la racha en contra, salta menos: en el aire no mandas tú.', obj: 'ko', ph: 1, me: 3, s2: 2, t3: 55, lim: 135, it: '*', foes: [{ sk: 0.30, st: 2 }] },
  { n: 'Suelo encerado', i: 'El suelo resbala: frenar cuesta el doble.', tip: 'Ataca de espaldas al borde solo si estás seguro: aquí no se frena.', obj: 'ko', ph: 2, me: 3, s2: 2, t3: 60, lim: 140, it: '*', foes: [{ sk: 0.32, st: 2 }, { sk: 0.26, st: 1 }] },
  { n: 'Tren de juguete', i: 'Los bloques van y vienen: la plataforma de debajo no espera.', tip: 'Espera a que el bloque vuelva: saltar al vacío no lo arregla.', obj: 'ko', ph: 3, me: 3, s2: 2, t3: 62, lim: 145, it: '*', foes: [{ sk: 0.34, st: 2 }, { sk: 0.28, st: 1 }] },
  /* ---- 10-12: plataformas que se desmoronan ---- */
  { n: 'Bloques que ceden', i: 'NUEVO: los bloques se desmoronan si te quedas encima. Vuelven a los tres segundos.', tip: 'Usa los bloques de paso, nunca de refugio.', obj: 'ko', ph: 0, me: 3, s2: 2, t3: 55, lim: 140, frail: 2.2, it: '*', foes: [{ sk: 0.32, st: 2 }] },
  { n: 'Suelo frágil', i: 'Los bloques ceden más rápido y el suelo resbala.', tip: 'Si un bloque parpadea, sal antes de pegar.', obj: 'ko', ph: 2, me: 3, s2: 2, t3: 60, lim: 145, frail: 1.6, it: '*', foes: [{ sk: 0.34, st: 2 }, { sk: 0.30, st: 1 }] },
  { n: 'Todo se cae', i: 'Bloques frágiles con el tren en marcha: casi nada se queda quieto.', tip: 'Quédate abajo, en la mesa: arriba ya no hay sitio seguro.', obj: 'ko', ph: 3, me: 3, s2: 2, t3: 65, lim: 150, frail: 1.5, it: '*', foes: [{ sk: 0.36, st: 2 }, { sk: 0.32, st: 1 }] },
  /* ---- 13-15: lluvia de bombas ---- */
  { n: 'Bombas del techo', i: 'NUEVO: caen bombas. Una diana roja avisa un segundo antes.', tip: 'La diana es tu amiga: empuja al rival justo donde va a caer.', obj: 'ko', ph: 0, me: 3, s2: 2, t3: 55, lim: 140, rain: 5.5, it: '*', foes: [{ sk: 0.34, st: 2 }] },
  { n: 'Diluvio', i: 'Las bombas caen el doble de seguido y el ventilador las desvía.', tip: 'Con viento la bomba cae desplazada: no te fíes del centro de la diana.', obj: 'ko', ph: 1, me: 3, s2: 2, t3: 60, lim: 175, rain: 4.5, it: '*', foes: [{ sk: 0.31, st: 2 }, { sk: 0.26, st: 1 }] },
  { n: 'Cacharrería', i: 'Bombas, bloques frágiles y armas por todas partes.', tip: 'Cuando todo estalla, gana el que menos riesgos corre.', obj: 'ko', ph: 2, me: 3, s2: 2, t3: 68, lim: 185, rain: 5.2, frail: 1.8, it: '*', foes: [{ sk: 0.32, st: 2 }, { sk: 0.27, st: 1 }] },
  /* ---- 16-19: objetivos nuevos y rivales acorazados ---- */
  { n: 'Aguanta el chaparrón', i: 'NUEVO objetivo: aquí no hay que ganar, hay que AGUANTAR 50 segundos.', tip: 'Huir es ganar: da vueltas y no te pares a pegar.', obj: 'time', hold: 50, ph: 1, me: 3, s2: 2, t3: 999, lim: 90, rain: 3.4, it: '*', foes: [{ sk: 0.40, st: 3 }, { sk: 0.34, st: 3 }] },
  { n: 'Cuatro KO', i: 'NUEVO objetivo: haz cuatro KO. Los rivales vuelven una y otra vez.', tip: 'Sube el porcentaje del rival antes de rematar: si no, no sale volando.', obj: 'kos', nk: 4, ph: 0, me: 3, s2: 2, t3: 75, lim: 160, it: '*', foes: [{ sk: 0.36, st: 3 }, { sk: 0.32, st: 3 }] },
  { n: 'Muñecos acorazados', i: 'NUEVO: rivales acorazados. Pesan más: hace falta mucho más porcentaje para echarlos.', tip: 'Al acorazado se le tira con el martillo o empujándolo mientras salta.', obj: 'ko', ph: 2, me: 3, s2: 2, t3: 75, lim: 200, it: '*', frail: 2.0, foes: [{ sk: 0.31, st: 2, big: 1 }, { sk: 0.27, st: 1 }] },
  { n: 'Última tanda', i: 'Todo junto menos el jefe: acorazado, bombas, bloques frágiles y el tren.', tip: 'No hay prisa: el reloj da de sobra si no te tiras al vacío.', obj: 'ko', ph: 3, me: 3, s2: 2, t3: 85, lim: 210, rain: 5.0, frail: 1.8, it: '*', foes: [{ sk: 0.34, st: 2, big: 1 }, { sk: 0.31, st: 2 }] },
  /* ---- 20: la final ---- */
  { n: 'El Capitán de Hojalata', i: 'LA FINAL: el Capitán sale con el martillo, es acorazado y trae escolta.', tip: 'Quítale el martillo esquivando: cuando se le gasta, es un muñeco más.', obj: 'ko', ph: 3, me: 3, s2: 2, t3: 100, lim: 230, rain: 5.6, frail: 1.8, it: '*', foes: [{ sk: 0.42, st: 3, big: 1, it: 'hammer' }, { sk: 0.32, st: 2 }] },
];
if (typeof module !== 'undefined' && module.exports) module.exports = BRAWLV;
