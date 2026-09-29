/* Niveles a mano de los dos juegos de party.js llevados a la vara (docs/VARA.md):
 * «Tira y Afloja» (tira-y-afloja) y «Ruleta de Minijuegos» (ruleta-de-minijuegos).
 * Solo se usan en solitario (fuera del modo tele); en la tele manda el mando y el
 * equilibrio de siempre no se toca.
 *
 * PARTYLV.tug — un duelo de cuerda por nivel. Campos:
 *   n     nombre del duelo (se enseña en la presentación)
 *   sk    pericia del equipo rival 0..1   sm  pericia de tu compañero 0..1
 *   p0    segundos por golpe al empezar   p1  segundos por golpe al final del duelo
 *   dur   segundos de duración máxima (si nadie cae, gana quien tenga la cuerda)
 *   rest  1 de cada N golpes es un SILENCIO (aro rojo): pulsar ahí resbala
 *   dbl   ráfagas de doble compás: [cada cuántos segundos, cuántos segundos dura]
 *   wind  deriva constante de la cuerda hacia el rival (px/s)
 *   rain  lluvia: el margen de acierto se estrecha y el resbalón cuesta más
 *   surge embestidas telegrafiadas cada N s: solo el tirón «¡Justo!» las aguanta
 *   boss  el Gigante: tres fases que encadenan todo lo aprendido (solo el 20)
 *   t2    segundos para la 2ª estrella [fácil, normal, difícil]
 *   tip   consejo de la presentación
 *
 * PARTYLV.roul — una tanda de minijuegos por nivel. Campos:
 *   n     nombre de la tanda            g   minijuegos, en orden (los decide la ruleta)
 *   sk    pericia de las CPU 0..1       goal puntos para la 2ª estrella [fácil, normal, difícil]
 *   x2    la última ronda vale doble    chain +1 por cada dos rondas ganadas seguidas
 *   tip   consejo de la presentación
 * Se pasa el nivel quedando primero en la tanda; 3ª estrella si además ganas todas las rondas.
 */
const PARTYLV = {
  tug: [
    /*  1 */ { n: 'El primer tirón', sk: 0.10, sm: 0.30, p0: 0.80, p1: 0.74, dur: 150, t2: [55, 57, 61], tip: 'Pulsa A cuando el aro blanco se cierra sobre el círculo dorado.' },
    /*  2 */ { n: 'Cuerda de feria', sk: 0.20, sm: 0.34, p0: 0.76, p1: 0.66, dur: 150, t2: [57, 59, 64], tip: 'Un tirón «¡Justo!» vale casi el doble que uno «Bien».' },
    /*  3 */ { n: 'Compás que aprieta', sk: 0.26, sm: 0.36, p0: 0.78, p1: 0.54, dur: 150, t2: [54, 62, 66], tip: 'El compás acelera durante el duelo: no te quedes en el ritmo de antes.' },
    /*  4 */ { n: 'Barro de primavera', sk: 0.32, sm: 0.38, p0: 0.74, p1: 0.52, dur: 150, t2: [56, 62, 64], tip: 'Aporrear el botón es la forma más rápida de resbalar.' },
    /*  5 */ { n: 'Los silencios', sk: 0.30, sm: 0.40, p0: 0.76, p1: 0.58, dur: 150, rest: 4, t2: [91, 91, 96], tip: 'Aro rojo: silencio. No pulses o resbalas.' },
    /*  6 */ { n: 'Dos de cada tres', sk: 0.36, sm: 0.40, p0: 0.72, p1: 0.54, dur: 150, rest: 3, t2: [103, 104, 104], tip: 'Un silencio de cada tres golpes: cuenta, no reacciones.' },
    /*  7 */ { n: 'Selva cerrada', sk: 0.42, sm: 0.42, p0: 0.70, p1: 0.50, dur: 150, rest: 4, t2: [77, 91, 93], tip: 'Los rivales ya casi no fallan: gana con precisión, no con prisa.' },
    /*  8 */ { n: 'Ráfaga', sk: 0.38, sm: 0.42, p0: 0.74, p1: 0.56, dur: 150, dbl: [9, 3.5], t2: [45, 91, 91], tip: 'En la RÁFAGA el compás se parte en dos: el doble de tirones.' },
    /*  9 */ { n: 'Ráfaga y silencio', sk: 0.44, sm: 0.44, p0: 0.72, p1: 0.52, dur: 150, rest: 4, dbl: [10, 3.5], t2: [65, 66, 107], tip: 'En la ráfaga los silencios siguen contando.' },
    /* 10 */ { n: 'Medio camino', sk: 0.50, sm: 0.44, p0: 0.70, p1: 0.48, dur: 150, rest: 4, dbl: [9, 4], t2: [71, 71, 90], tip: 'Mitad de la tabla: aquí ya se gana con la cabeza fría.' },
    /* 11 */ { n: 'Aguacero', sk: 0.44, sm: 0.46, p0: 0.74, p1: 0.54, dur: 150, rain: 1, t2: [74, 78, 92], tip: 'Con lluvia el margen se estrecha y cada resbalón cuesta más.' },
    /* 12 */ { n: 'Lluvia con silencios', sk: 0.48, sm: 0.46, p0: 0.72, p1: 0.52, dur: 150, rain: 1, rest: 4, t2: [101, 109, 111], tip: 'Mojado y a contratiempo: respira y sigue el aro.' },
    /* 13 */ { n: 'Tormenta', sk: 0.52, sm: 0.48, p0: 0.70, p1: 0.48, dur: 150, rain: 1, dbl: [9, 4], t2: [101, 101, 101], tip: 'La ráfaga bajo la lluvia es el momento de no dudar.' },
    /* 14 */ { n: 'Viento en contra', sk: 0.48, sm: 0.48, p0: 0.72, p1: 0.52, dur: 150, wind: 7, t2: [98, 111, 115], tip: 'El viento arrastra la cuerda: hay que ganar terreno todo el rato.' },
    /* 15 */ { n: 'Vendaval', sk: 0.54, sm: 0.50, p0: 0.70, p1: 0.48, dur: 150, wind: 9, rest: 4, t2: [115, 115, 115], tip: 'Con viento, parar de tirar es ceder.' },
    /* 16 */ { n: 'La embestida', sk: 0.52, sm: 0.50, p0: 0.72, p1: 0.52, dur: 150, surge: 8, t2: [58, 62, 70], tip: 'Aro dorado: embestida. Solo un «¡Justo!» la aguanta.' },
    /* 17 */ { n: 'Embestida y silencio', sk: 0.56, sm: 0.52, p0: 0.70, p1: 0.50, dur: 150, surge: 7.5, rest: 4, t2: [107, 120, 120], tip: 'Una embestida en el golpe siguiente a un silencio: mira el color.' },
    /* 18 */ { n: 'Diluvio', sk: 0.60, sm: 0.52, p0: 0.68, p1: 0.46, dur: 150, rain: 1, wind: 8, surge: 8, t2: [100, 120, 120], tip: 'Todo a la vez: prioriza las embestidas, lo demás es terreno.' },
    /* 19 */ { n: 'La final del pueblo', sk: 0.66, sm: 0.54, p0: 0.68, p1: 0.44, dur: 150, rain: 1, rest: 4, dbl: [9, 4], surge: 8, t2: [72, 90, 104], tip: 'El ensayo general del Gigante.' },
    /* 20 */ { n: 'El Gigante', sk: 0.70, sm: 0.56, p0: 0.74, p1: 0.44, dur: 150, boss: 1, t2: [68, 77, 88], tip: 'Tres fases: fuerza, compás roto y tormenta. Aguanta las embestidas.' }
  ],
  roul: [
    /*  1 */ { n: 'Primera vuelta', g: ['balloons', 'needle', 'anvil'], sk: -0.25, goal: [5, 6, 7], tip: 'Tres rondas cortas para coger el tacto de la ruleta.' },
    /*  2 */ { n: 'Ojo y pulso', g: ['clock', 'duel', 'arrows'], sk: -0.20, goal: [5, 6, 7], tip: 'Reflejos y memoria: dos formas distintas de ganar puntos.' },
    /*  3 */ { n: 'Pies y manos', g: ['mash', 'rope', 'sack'], sk: -0.14, goal: [5, 6, 7], tip: 'Compás de piernas en las tres rondas.' },
    /*  4 */ { n: 'Puntería', g: ['pie', 'needle', 'bowl'], sk: -0.08, goal: [6, 7, 8], tip: 'Apuntar bien vale más que tirar deprisa.' },
    /*  5 */ { n: 'Memoria de feria', g: ['simon', 'sheep', 'arrows'], sk: -0.02, goal: [6, 7, 8], tip: 'Cuenta y memoriza: aquí no sirve machacar botones.' },
    /*  6 */ { n: 'Punto de oro', g: ['pump', 'fish', 'duel'], sk: 0.04, x2: 1, goal: [7, 8, 9], tip: 'La última ronda vale el doble: no la regales.' },
    /*  7 */ { n: 'Quietos ahí', g: ['statue', 'mole', 'anvil'], sk: 0.10, x2: 1, goal: [7, 8, 9], tip: 'Saber estarse quieto también puntúa.' },
    /*  8 */ { n: 'Tanda larga', g: ['derby', 'tug', 'bull', 'clock'], sk: 0.16, goal: [8, 9, 10], tip: 'Cuatro rondas: hay margen para remontar.' },
    /*  9 */ { n: 'Feria de noche', g: ['photo', 'pie', 'simon'], sk: 0.22, x2: 1, goal: [8, 9, 10], tip: 'Colócate pronto en la foto; el flash no espera.' },
    /* 10 */ { n: 'Media ruleta', g: ['egg', 'balloons', 'mash'], sk: 0.28, chain: 1, goal: [8, 9, 10], tip: 'Cadena: dos rondas ganadas seguidas suman un punto extra.' },
    /* 11 */ { n: 'Cadena de aciertos', g: ['arrows', 'needle', 'rope', 'fish'], sk: 0.34, chain: 1, goal: [9, 11, 12], tip: 'Encadena: el punto extra decide la tanda.' },
    /* 12 */ { n: 'Corral revuelto', g: ['sheep', 'sack', 'mole'], sk: 0.40, x2: 1, chain: 1, goal: [9, 10, 11], tip: 'Ronda doble y cadena en la misma tanda.' },
    /* 13 */ { n: 'Pulso firme', g: ['bull', 'pump', 'bowl'], sk: 0.45, x2: 1, goal: [8, 9, 10], tip: 'Tres pruebas de aguante seguidas.' },
    /* 14 */ { n: 'Noche de circo', g: ['witch', 'statue', 'duel', 'balloons'], sk: 0.50, chain: 1, goal: [10, 11, 12], tip: 'El tren de la bruja abre la tanda más larga hasta ahora.' },
    /* 15 */ { n: 'Ruleta cargada', g: ['pie', 'derby', 'simon', 'clock'], sk: 0.55, x2: 1, chain: 1, goal: [11, 12, 13], tip: 'Cuatro rondas, la última doble y con cadena.' },
    /* 16 */ { n: 'Rivales despiertos', g: ['anvil', 'fish', 'arrows'], sk: 0.60, x2: 1, goal: [8, 9, 10], tip: 'Las CPU ya no regalan nada.' },
    /* 17 */ { n: 'Carrera cerrada', g: ['sack', 'egg', 'mash', 'rope'], sk: 0.65, chain: 1, goal: [10, 11, 12], tip: 'Cuatro carreras: el compás manda.' },
    /* 18 */ { n: 'Mano firme', g: ['bowl', 'mole', 'photo', 'needle'], sk: 0.70, x2: 1, chain: 1, goal: [11, 12, 13], tip: 'Precisión de principio a fin.' },
    /* 19 */ { n: 'Antesala', g: ['tug', 'bull', 'sheep', 'pump'], sk: 0.74, x2: 1, chain: 1, goal: [11, 12, 13], tip: 'El ensayo general de la gran final.' },
    /* 20 */ { n: 'La Gran Final', g: ['balloons', 'arrows', 'clock', 'needle', 'duel'], sk: 0.80, x2: 1, chain: 1, goal: [13, 14, 15], tip: 'Cinco rondas con los cuatro retos propios de la ruleta y el duelo final, que vale doble.' }
  ]
};
