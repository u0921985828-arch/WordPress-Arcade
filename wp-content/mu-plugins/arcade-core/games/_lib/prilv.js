/* Campaña de «balon-prisionero» (plan Friv / docs/VARA.md): 20 desafíos de 1 jugador.
 * Solo la usa balon-prisionero; los otros 11 juegos de teamball.js siguen exactamente igual,
 * porque todo lo de aquí cuelga de DC (falso en los demás y también en el modo tele).
 *
 * Campo de 600×340 partido por la línea del medio (x = 300). Tú eres el equipo rojo y juegas
 * en la mitad izquierda [34, 300]; el rival, en la derecha [300, 566]. Detrás de cada campo
 * está la cárcel del equipo contrario: si te dan, vas allí, y vuelves si desde la cárcel
 * eliminas a alguien. Se gana la ronda dejando al rival sin nadie en su mitad.
 *
 * CAMPOS de cada desafío:
 *   n    nombre · i  lo que enseña · tip  consejo de la tarjeta
 *   dur  duración de cada ronda en segundos (40–70, la vara)
 *   wins rondas que hay que ganar (1 salvo en la final)
 *   cpu  nivel del rival, 0 (torpe) a 1 (crack)
 *   sty  estilo del rival: 'novato' · 'lanza' · 'esquiva' · 'presion' · 'muro' · 'loco'
 *   nb   balones en juego (2–5)
 *   fire balones DE FUEGO (no se pueden atrapar: atrapar uno te elimina). Son los primeros nb.
 *   bnc  balones REBOTONES: siguen vivos tras rebotar en la pared
 *   ice  suelo helado: se patina (menos agarre)
 *   wind viento vertical sobre los balones en px/s² (positivo = hacia abajo)
 *   obs  conos: [x, y, r] o [x, y, r, amplitud, periodo] (los de 5 campos se mueven en vertical)
 *   mud  charcos: [x, y, r] (frenan a quien los pisa y al balón)
 *   pow  segundos entre premios que caen al campo (escudo o balón de fuego); 0 = ninguno
 *   sq   px por segundo que avanza la línea del medio contra ti (tu mitad se estrecha)
 *   cap  el rival nº 1 es el CAPITÁN y aguanta este número de impactos
 *   s2   compañeros tuyos (tú incluido) que deben quedar en pie para la 2.ª estrella
 * ESTRELLAS: 1★ ganar el desafío · 2★ ganarlo con s2 de los tuyos en pie ·
 *            3★ eso y además sin pisar la cárcel ni una vez.
 */
const PRILV = {
  'balon-prisionero': [
    { n: 'El primer balón', i: 'Lo básico: recoge un balón pasando por encima y lánzalo con A hacia el rival.', tip: 'No lances de lejos: cruza medio campo, acércate a la línea y suelta el balón.',
      dur: 50, wins: 1, cpu: 0.06, sty: 'novato', nb: 2, s2: 2 },
    { n: 'La cárcel', i: 'Si te dan, vas a la cárcel detrás del rival. Desde allí, si eliminas a alguien, vuelves.', tip: 'Desde la cárcel tienes al rival de espaldas: es el mejor sitio para cazarlo.',
      dur: 55, wins: 1, cpu: 0.06, sty: 'novato', nb: 3, s2: 2 },
    { n: 'Atrapar al vuelo', i: 'NUEVO: con B atrapas el balón que te llega. Atrapar no elimina a nadie, pero te salva.', tip: 'Pulsa B justo cuando el balón esté encima, no antes: el gesto dura poco.',
      dur: 55, wins: 1, cpu: 0.14, sty: 'lanza', nb: 3, s2: 2 },
    { n: 'Conos en el patio', i: 'NUEVO: conos. Los balones rebotan en ellos y los jugadores no los cruzan.', tip: 'Ponte detrás de un cono: los lanzamientos rectos se estrellan contra él.',
      dur: 58, wins: 1, cpu: 0.18, sty: 'novato', nb: 3, s2: 2,
      obs: [[180, 110, 15], [180, 230, 15], [420, 170, 15]] },
    { n: 'Charcos de barro', i: 'NUEVO: los charcos. Dentro corres menos y el balón se frena antes de llegar.', tip: 'Deja el barro entre tú y el rival: sus tiros llegan muertos.',
      dur: 58, wins: 1, cpu: 0.22, sty: 'novato', nb: 3, s2: 2,
      mud: [[150, 170, 50], [450, 110, 46], [450, 240, 46]] },
    { n: 'Balón de fuego', i: 'NUEVO: el balón rojo no se puede atrapar. Si lo intentas, te elimina igual.', tip: 'Al de fuego solo se le esquiva de lado; guarda la B para los balones normales.',
      dur: 60, wins: 1, cpu: 0.26, sty: 'lanza', nb: 3, fire: 1, s2: 2 },
    { n: 'Suelo helado', i: 'NUEVO: el patio está helado. Arrancas y frenas mucho peor.', tip: 'Suelta la dirección un poco antes de llegar: te sigues deslizando.',
      dur: 60, wins: 1, cpu: 0.28, sty: 'esquiva', nb: 3, ice: 1, s2: 2 },
    { n: 'Viento del norte', i: 'NUEVO: el viento curva los balones hacia abajo. Los tiros largos se van.', tip: 'Apunta un poco por encima del rival y espera a tenerlo cerca.',
      dur: 60, wins: 1, cpu: 0.32, sty: 'novato', nb: 4, wind: 90, s2: 2 },
    { n: 'Premios en el patio', i: 'NUEVO: caen premios. El azul es un escudo (aguanta un impacto) y el rojo prende tu balón.', tip: 'El escudo te deja jugar a la desesperada: recógelo y lánzate a la línea.',
      dur: 62, wins: 1, cpu: 0.34, sty: 'lanza', nb: 4, fire: 1, pow: 9, s2: 2 },
    { n: 'El Capitán', i: 'JEFE: el nº 1 del rival lleva casco y aguanta DOS impactos antes de caer.', tip: 'Al capitán hay que darle dos veces seguidas: quítale primero la escolta.',
      dur: 66, wins: 1, cpu: 0.40, sty: 'muro', nb: 4, cap: 2, s2: 1,
      obs: [[300, 70, 15], [300, 270, 15]] },
    { n: 'La línea avanza', i: 'NUEVO: la línea del medio se te viene encima y tu mitad se estrecha.', tip: 'Con menos sitio hay que ganar rápido: sal a por ellos desde el principio.',
      dur: 60, wins: 1, cpu: 0.38, sty: 'presion', nb: 4, sq: 3.2, s2: 2 },
    { n: 'Balones rebotones', i: 'NUEVO: dos balones siguen vivos después de rebotar en la pared. Ojo a la espalda.', tip: 'No te pegues a la pared del fondo: ahí es donde vuelven los rebotes.',
      dur: 62, wins: 1, cpu: 0.42, sty: 'lanza', nb: 4, bnc: 2, s2: 2 },
    { n: 'Conos que bailan', i: 'NUEVO: los conos se mueven. La pared que te protegía se va sola.', tip: 'Mira el cono antes de tirar: espera a que tape al rival, no a ti.',
      dur: 62, wins: 1, cpu: 0.44, sty: 'esquiva', nb: 4, s2: 2,
      obs: [[200, 170, 15, 90, 5], [400, 170, 15, 90, 4.2]] },
    { n: 'Fuego y barro', i: 'Dos balones de fuego y el suelo lleno de charcos: ni atrapas ni corres.', tip: 'Quédate fuera del barro y deja que vengan ellos: así llegan lentos.',
      dur: 62, wins: 1, cpu: 0.46, sty: 'lanza', nb: 4, fire: 2, s2: 2,
      mud: [[140, 110, 46], [140, 240, 46], [300, 170, 52]] },
    { n: 'Hielo y viento', i: 'Patinas tú y se curvan los balones. Aquí manda la paciencia.', tip: 'Tira en corto: con viento y hielo, lo lejano no llega y lo cercano no falla.',
      dur: 64, wins: 1, cpu: 0.48, sty: 'esquiva', nb: 4, ice: 1, wind: -95, s2: 2 },
    { n: 'Cinco balones', i: 'Cinco balones a la vez: siempre hay uno viniendo hacia ti.', tip: 'Coge uno y suéltalo enseguida: con las manos llenas no puedes atrapar.',
      dur: 64, wins: 1, cpu: 0.50, sty: 'presion', nb: 5, pow: 10, s2: 2 },
    { n: 'El cerco', i: 'La línea avanza deprisa y hay conos donde te quieres esconder.', tip: 'Ataca el primer minuto: cuando la línea llegue arriba ya no hay sitio.',
      dur: 64, wins: 1, cpu: 0.52, sty: 'presion', nb: 4, sq: 4.6, s2: 1,
      obs: [[170, 90, 14], [170, 250, 14], [240, 170, 14]] },
    { n: 'Fuego cruzado', i: 'Tres balones de fuego, dos de ellos rebotones y viento de cara.', tip: 'Muévete siempre: con fuego rebotón, quedarse quieto es que te den.',
      dur: 66, wins: 1, cpu: 0.56, sty: 'lanza', nb: 5, fire: 3, bnc: 2, wind: 80, s2: 1 },
    { n: 'La víspera', i: 'Todo lo aprendido menos el capitán: hielo, barro, conos que bailan y premios.', tip: 'Coge los premios antes que ellos: un escudo aquí vale una ronda.',
      dur: 68, wins: 1, cpu: 0.60, sty: 'presion', nb: 5, fire: 2, ice: 1, pow: 11, s2: 1,
      obs: [[220, 170, 15, 80, 4.5], [380, 170, 15, 80, 3.8]], mud: [[130, 170, 46], [470, 170, 46]] },
    { n: 'Los Titanes de la Plaza', i: 'JEFE FINAL: capitán de TRES impactos, fuego rebotón, viento, barro y la línea encima. Dos rondas.', tip: 'Ronda larga: aguanta con escudo, junta dos balones y tíralos seguidos al capitán.',
      dur: 46, wins: 2, cpu: 0.70, sty: 'loco', nb: 5, fire: 3, bnc: 2, cap: 3, ice: 0, wind: -85, pow: 12, sq: 3.0, s2: 1,
      obs: [[200, 90, 14, 70, 4], [200, 250, 14, 70, 4.6], [400, 170, 15]], mud: [[300, 90, 44], [300, 250, 44]] },
  ],
};
/* estilos del rival: correr, aguantar el balón (×tiempo), puntería (×error) y esquivar/atrapar */
const PRISTY = {
  novato: { run: 0.88, hold: 1.34, aim: 1.34, dodge: 0.72 },
  lanza: { run: 0.96, hold: 0.74, aim: 0.96, dodge: 0.82 },
  esquiva: { run: 1.02, hold: 1.06, aim: 1.10, dodge: 1.38 },
  presion: { run: 1.03, hold: 0.88, aim: 1.02, dodge: 0.96 },
  muro: { run: 0.84, hold: 1.16, aim: 0.98, dodge: 1.12 },
  loco: { run: 1.06, hold: 0.70, aim: 0.90, dodge: 1.16 },
};
if (typeof module !== 'undefined' && module.exports) module.exports = { PRILV, PRISTY };
