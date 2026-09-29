/* Patata Explosiva — 20 retos de un jugador escritos a mano (plan Friv / docs/VARA.md).
 * Solo los usa el juego «patata-explosiva» FUERA del modo tele: en la tele manda el mando y el
 * equilibrio de la fiesta (3 rondas a 4) no se toca. Los demás modos de arena.js ni se enteran.
 *
 * CAMPOS de cada reto
 *   n    nombre del reto (tarjeta de inicio y panel del nivel)
 *   i    la idea NUEVA que estrena el reto (se enseña antes de castigar)
 *   tip  consejo corto
 *   foes rivales a la vez en la plaza (1–3)
 *   tot  rivales que hay que dejar fuera para superarlo (los que faltan entran por el borde)
 *   fu   [min, max] segundos de mecha; la mecha sigue siendo secreta
 *   sk   pericia de los rivales, 0..1 (persecución, fintas y acelerones)
 *   pil  arbustos: 0 ninguno · 1 los cuatro de siempre · 2 cruz central · 3 ocho arbustos
 *   mud  charcos de barro (frenan a quien los pisa)
 *   gust ráfaga de viento: 0 sin viento, si no la fuerza en px/s²
 *   spk  chispas errantes: acortan 2 s la mecha del que lleva la bomba
 *   two  1 = DOS bombas a la vez en la plaza
 *   ring segundos que tarda el anillo de fuego en cerrarse del todo (0 = sin anillo)
 *   hp   petardazos que aguantas en el reto (por defecto 3; fácil +1, difícil −1)
 *   boss 1 = final: el anillo aprieta y la mecha se acorta con cada rival que cae
 *   t2   segundos TOTALES con la bomba para la 2.ª estrella
 *   t3   ídem para la 3.ª (además hay que terminar sin comerse ninguna onda expansiva)
 *
 * La dificultad (k.dif) mueve la pericia rival y el margen de las estrellas, nunca la plaza:
 * fácil ×0,78 de pericia, +1 petardazo y +3,5 s / +2,5 s de margen; difícil ×1,16, −1 petardazo y −2 s / −1,5 s.
 */
const PATALV = [
  /* ---- 1-3: la escuela. Pasar la bomba tocando y no dejarse arrinconar. ---- */
  { n: 'La primera mecha', i: 'Tienes la bomba: toca a un rival para pasársela antes de que estalle.', foes: 1, tot: 1, fu: [12, 16], sk: 0.10, pil: 0, t2: 11, t3: 7, tip: 'Con A das un acelerón: gástalo cuando ya estés cerca, no de lejos.' },
  { n: 'Dos vecinos', i: 'Ahora sois tres. Cuando te la pasen, no puedes devolverla al instante a quien te la dio.', foes: 2, tot: 2, fu: [11, 15], sk: 0.14, pil: 0, t2: 15, t3: 10, tip: 'Si te la devuelven, busca al OTRO: el que te la pasó está bloqueado un segundo.' },
  { n: 'Arbustos del parque', i: 'NUEVO: arbustos. Estorban al que persigue tanto como al que huye.', foes: 2, tot: 3, fu: [11, 15], sk: 0.18, pil: 1, t2: 18, t3: 12, tip: 'Sin la bomba, da vueltas a un arbusto: quien te persigue pierde el ángulo.' },
  /* ---- 4-6: charcos de barro. ---- */
  { n: 'Charcos', i: 'NUEVO: charcos de barro. Dentro vas mucho más lento, con bomba o sin ella.', foes: 2, tot: 3, fu: [10, 14], sk: 0.20, pil: 1, mud: 3, t2: 18, t3: 12, tip: 'Empuja a los demás hacia el barro y pásasela justo cuando entren.' },
  { n: 'Barrizal', i: 'Más barro y menos mecha. Con la bomba no se puede cruzar un charco de frente.', foes: 2, tot: 3, fu: [9, 13], sk: 0.24, pil: 1, mud: 5, t2: 17, t3: 11, tip: 'La finta (B) sale de un charco de lado: cuesta menos que retroceder.' },
  { n: 'Cruce de la plaza', i: 'Los arbustos se ponen en cruz: la plaza se parte en cuatro calles.', foes: 3, tot: 4, fu: [9, 13], sk: 0.26, pil: 2, mud: 3, t2: 20, t3: 13, tip: 'Con tres rivales, pásasela al que esté más solo: los otros dos se estorban.' },
  /* ---- 7-9: el ventarrón. ---- */
  { n: 'Ventarrón', i: 'NUEVO: ráfagas de viento. Avisan con las hojas y luego empujan a todos.', foes: 2, tot: 3, fu: [9, 13], sk: 0.26, pil: 1, mud: 2, gust: 300, t2: 18, t3: 12, tip: 'Persigue A FAVOR del viento: llegarás antes y frenarás peor.' },
  { n: 'Hojas al vuelo', i: 'Viento y barro juntos. Frenar en el barro con la ráfaga a favor es imposible.', foes: 3, tot: 4, fu: [9, 12], sk: 0.30, pil: 1, mud: 4, gust: 340, t2: 20, t3: 13, tip: 'Antes de que llegue la ráfaga, colócate al lado del viento que sopla.' },
  { n: 'Remolino', i: 'Las ráfagas se encadenan y giran. El centro es el único sitio tranquilo.', foes: 3, tot: 4, fu: [8, 12], sk: 0.32, pil: 2, mud: 3, gust: 380, t2: 20, t3: 13, tip: 'En el centro el viento te empuja menos: es buen sitio para esperar sin bomba.' },
  /* ---- 10-12: chispas errantes. ---- */
  { n: 'Chispas', i: 'NUEVO: chispas errantes. Si te tocan con la bomba encima, la mecha pierde 2 s.', foes: 2, tot: 4, fu: [11, 15], sk: 0.30, pil: 1, spk: 2, t2: 19, t3: 12, tip: 'Con la bomba, mira dónde están las chispas ANTES de lanzarte a perseguir.' },
  { n: 'Lluvia de chispas', i: 'Más chispas y más rápidas. Ya no vale con correr en línea recta.', foes: 3, tot: 4, fu: [10, 14], sk: 0.34, pil: 1, mud: 3, spk: 3, t2: 20, t3: 13, tip: 'Sin bomba, quédate pegado a una chispa: nadie querrá acercarse a pasártela.' },
  { n: 'Noche de verbena', i: 'Chispas, barro y viento a la vez. Aquí ya hay que mirar tres cosas.', foes: 3, tot: 5, fu: [9, 13], sk: 0.36, pil: 2, mud: 4, gust: 340, spk: 3, t2: 23, t3: 15, tip: 'Cuando todo se junta, gana quien pasa la bomba pronto, no quien corre más.' },
  /* ---- 13-15: dos bombas. ---- */
  { n: 'Dos patatas', i: 'NUEVO: DOS bombas a la vez. Puedes llevar las dos… y eso es lo peor que hay.', foes: 3, tot: 4, fu: [11, 15], sk: 0.34, pil: 1, two: 1, t2: 22, t3: 15, tip: 'Si llevas las dos, suelta primero la de mecha más corta: se nota en el chisporroteo.' },
  { n: 'Doble o nada', i: 'Dos bombas con el suelo lleno de barro. Elegir a quién se la pasas ya es media partida.', foes: 3, tot: 5, fu: [10, 14], sk: 0.38, pil: 1, mud: 4, two: 1, t2: 24, t3: 16, tip: 'Pásale la bomba al que ya lleve la otra: le quedan pocos sitios adonde ir.' },
  { n: 'Traca doble', i: 'Dos bombas, viento y chispas. Los rivales ya fintan de verdad.', foes: 3, tot: 5, fu: [9, 13], sk: 0.42, pil: 2, gust: 340, spk: 3, two: 1, t2: 24, t3: 16, tip: 'Guarda el acelerón para el último segundo: los rivales lo esquivan si lo ven venir.' },
  /* ---- 16-19: el anillo de fuego. ---- */
  { n: 'Anillo de fuego', i: 'NUEVO: la plaza se cierra. Fuera del anillo te chamuscas en poco más de un segundo.', foes: 2, tot: 4, fu: [10, 14], sk: 0.36, pil: 0, ring: 70, t2: 19, t3: 12, tip: 'El anillo avisa en rojo antes de comerte: no lo apures, pasa la bomba y entra.' },
  { n: 'Cerco', i: 'Anillo y barro: los charcos que quedan dentro del cerco valen oro (para el otro).', foes: 3, tot: 5, fu: [9, 13], sk: 0.40, pil: 1, mud: 4, ring: 75, t2: 23, t3: 15, tip: 'Cuando el anillo aprieta, el barro del centro es una trampa: rodéalo.' },
  { n: 'Fuego y chispa', i: 'Anillo, chispas y viento. El sitio seguro cada vez es más pequeño.', foes: 3, tot: 5, fu: [9, 12], sk: 0.44, pil: 1, gust: 360, spk: 3, ring: 70, t2: 23, t3: 15, tip: 'Dentro del anillo pequeño el viento empuja al fuego: no te pongas a favor.' },
  { n: 'Última vuelta', i: 'Todo junto menos el jefe: dos bombas, anillo, barro, viento y chispas.', foes: 3, tot: 6, fu: [9, 13], sk: 0.46, pil: 2, mud: 4, gust: 360, spk: 3, two: 1, ring: 80, t2: 27, t3: 18, tip: 'Con seis rivales no hay prisa: sobrevivir barato vale más que cazar rápido.' },
  /* ---- 20: la final. ---- */
  { n: 'La Traca', i: 'LA FINAL: con cada rival que cae el anillo aprieta y la mecha se acorta. El último es La Traca.', foes: 3, tot: 6, fu: [10, 14], sk: 0.50, pil: 1, mud: 4, gust: 380, spk: 4, two: 1, ring: 95, boss: 1, t2: 28, t3: 19, tip: 'La Traca finta mucho: acércate en diagonal y suelta el acelerón cuando ya la tengas encima.' },
];
if (typeof module !== 'undefined' && module.exports) module.exports = PATALV;
