/* Niveles a mano de spike-run (plan Friv, tanda 7). Cada nivel es
 * { n: nombre, tip: consejo, co: [fácil, normal, difícil] monedas para la 2ª estrella, s: tira }.
 * El motor coloca las piezas de izquierda a derecha llevando la columna actual (casillas de 32 px).
 *
 *   s<n>   n pinchos seguidos           c<n>   n cajas de una altura
 *   C<n>   n cajas de dos alturas       h<n>   foso de n casillas
 *   f      bicho que camina hacia ti    F      bicho volando (se pisa)
 *   o<n>   arco de n monedas sobre lo anterior
 *   .<n>   n casillas de respiro (se estiran con la velocidad del nivel)
 *   ---- piezas de la tanda 7, solo spike-run ----
 *   p<n>   TABLÓN volado a dos alturas y pico: se pisa desde arriba y lleva monedas
 *   r      ROCA que rueda hacia ti más rápido que el suelo: hay que saltarla
 *   ^      MUELLE en el suelo: catapulta al cielo (alcanza las gemas)
 *   P<n>   PRENSA de n casillas: techo bajo. Mientras está cerca el salto se bloquea (aviso
 *          «¡NO SALTES!»), así que se pasa corriendo; solo mata si llegas volando de lejos
 *   G      GEMA alta (vale 50 y cuenta para la 3ª estrella)
 *   k      PUNTO DE CONTROL: al morir se vuelve aquí
 *
 * 1★ terminar · 2★ llegar al objetivo de monedas de tu dificultad · 3★ eso + todas las gemas
 * y sin morir. El nivel termina en bandera. Sin azar: lo escrito es lo que se juega.
 */
const RUNLV = {
  'spike-run': [
    { n: 'Primeros pinchos', tip: 'Toca (o ↑) para saltar. Mantenlo para saltar más alto.', co: [16, 21, 24],
      s: '.12 s1 o3 .10 s1 .12 s2 o4 .10 s1 .14 s2 o4 .10 s1 .12 s2 o5 .12 s1 .10 s2 o4 .14 s1 .12 s2 o4 .10 s1 .14 s2 o5 .12 s1 .12' },
    { n: 'Cajas y pinchos', tip: 'Sobre las cajas hay monedas: pisa arriba y sigue.', co: [13, 17, 19],
      s: '.12 c1 .10 s1 o3 .10 c2 .12 s2 o4 .10 c1 .12 s1 .10 C1 o3 .12 s2 .10 c2 o4 .12 s1 .12 c1 .10 s2 o5 .12 c2 .10 s1 .12 C1 o4 .12 s2 .10 c1 .12' },
    { n: 'El foso', tip: 'Los fosos se cruzan corriendo: no sueltes antes de tiempo.', co: [13, 17, 20],
      s: '.12 h2 .10 s1 o3 .12 h2 .10 c1 .12 h3 o4 .10 s2 .12 h2 .12 c2 o4 .10 h3 .12 s1 .10 h2 o4 .12 c1 .12 h3 .10 s2 o5 .12 h2 .10 c2 o4 .12 h3 .12' },
    { n: 'Muro de cajas', tip: 'Las cajas dobles piden salto largo: pulsa y mantén.', co: [17, 22, 26],
      s: '.12 C1 o3 .10 s1 .12 C2 o4 .10 h2 .12 C1 .10 s2 o4 .12 h3 .10 C2 o4 .12 c2 .10 s1 .12 C1 o3 .10 h2 .12 C2 o5 .12 s2 .10 c1 .12 C1 o4 .10 h3 .12 C2 o4 .12' },
    { n: 'Bichos', tip: 'Los bichos se pisan: cáeles encima y rebotas.', co: [17, 22, 25],
      s: '.12 f .10 s1 o3 .12 f .10 c2 o4 .12 h2 .10 f .12 C1 o4 .10 f .12 s2 .10 f o3 .12 h3 .12 c1 o4 .10 f .12 C2 o4 .10 s1 .12 f .12 h2 .10 c2 o4 .12 f .12 s2 .10 C1 o4 .12' },
    { n: 'Tablones', tip: 'Los tablones se pisan desde arriba y llevan monedas.', co: [23, 30, 35],
      s: '.12 p3 .10 s1 .12 p4 .10 f .12 h2 .10 p3 .12 c2 o4 .10 s2 .12 p4 .10 k h3 .12 p3 .10 f .12 C1 o4 .10 p4 .12 s1 .10 h2 .12 p3 .10 c1 o3 .12 p4 .12 f .10 s2 .12 p3 .12' },
    { n: 'La gema alta', tip: 'La gema vale por tres monedas: el tablón es la escalera.', co: [19, 25, 29],
      s: '.12 p3 G .10 s1 .12 f .10 p4 G .12 h2 .10 c2 o4 .12 p3 G .10 s2 .12 k h3 .10 p4 .12 f .10 C1 o4 .12 p3 G .10 s1 .12 h2 .10 p4 .12 c1 o3 .10 f .12 p3 G .12 s2 .10 h3 .12' },
    { n: 'El muelle', tip: 'El muelle catapulta: ahí arriba está lo que no se ve.', co: [12, 15, 17],
      s: '.12 ^ G .10 s1 .12 p3 .10 f .12 ^ G .10 h2 .12 c2 o4 .10 ^ G .12 k s2 .10 p4 .12 h3 .10 ^ G .12 C1 o4 .10 f .12 ^ G .10 s1 .12 p3 .12 h2 .10 ^ G .12 c1 o3 .10 s2 .12' },
    { n: 'Vuelo rasante', tip: 'El bicho volador también se pisa, pero llega antes.', co: [12, 15, 17],
      s: '.12 F .10 s1 .12 p3 G .10 F .12 h2 .10 c2 o4 .12 F .10 ^ G .12 k s2 .10 F .12 p4 .10 h3 .12 F .10 C1 o4 .12 f .10 F .12 s1 .10 ^ G .12 p3 .12 F .10 h2 .12 c1 o3 .10 s2 .12 F .12' },
    { n: 'La roca', tip: 'La roca viene a tu encuentro: salta antes de tenerla encima.', co: [12, 15, 17],
      s: '.12 r .10 s1 .12 p3 G .10 r .12 h2 .10 F .12 c2 o4 .10 r .12 k ^ G .10 s2 .12 r .10 p4 .12 h3 .10 r .12 C1 o4 .10 f .12 r .10 F .12 s1 .12 ^ G .10 r .12 p3 .10 h2 .12 c1 o3 .12 r .12' },
    { n: 'La prensa', tip: 'La prensa es un techo bajo: pasa por debajo corriendo, sin saltar.', co: [12, 15, 17],
      s: '.12 P2 .10 s1 .12 p3 G .10 P3 .12 h2 .10 r .12 c2 o4 .10 P2 .12 k ^ G .10 F .12 P3 .10 s2 .12 p4 .10 h3 .12 P2 .10 C1 o4 .12 r .10 P3 .12 f .10 ^ G .12 P2 .12 s1 .10 p3 .12 h2 .10 P3 .12 c1 o3 .12' },
    { n: 'Compás de hierro', tip: 'Roca antes de la prensa: salta pronto y cae antes del techo.', co: [12, 15, 17],
      s: '.12 P2 .10 r .12 p3 G .10 s1 .12 P3 .10 h2 .12 F .10 c2 o4 .12 P2 .10 k r .12 ^ G .10 s2 .12 P3 .10 p4 .12 h3 .10 P2 .12 C1 o4 .10 r .12 f .10 P3 .12 ^ G .10 s1 .12 P2 .10 h2 .12 p3 .12 c1 o3 .10 P3 .12 r .12' },
    { n: 'Tejado y foso', tip: 'Los tablones sobre el foso: salta de uno al siguiente.', co: [19, 25, 29],
      s: '.12 h2 p3 .10 s1 .12 h3 p4 G .10 r .12 P2 .10 F .12 h2 p3 .10 c2 o4 .12 k ^ G .10 s2 .12 h3 p4 .10 P3 .12 f .10 r .12 h2 p3 G .10 C1 o4 .12 P2 .10 s1 .12 h3 p4 .12 ^ G .10 F .12 h2 p3 .12 c1 o3 .10 r .12' },
    { n: 'Salto de fe', tip: 'Muelle y tablón encadenados: no toques nada al caer.', co: [15, 20, 23],
      s: '.12 ^ G .10 p3 .12 r .10 s1 .12 ^ G .10 h3 p4 .12 P2 .10 F .12 c2 o4 .10 k ^ G .12 s2 .10 r .12 p3 G .10 P3 .12 h2 .10 ^ G .12 C1 o4 .10 f .12 p4 .10 r .12 s1 .10 ^ G .12 P2 .12 h3 p3 .10 c1 o3 .12 F .12' },
    { n: 'Sin respiro', tip: 'Cinco piezas seguidas: aprende el ritmo y no pares.', co: [12, 15, 17],
      s: '.10 s2 .8 r .10 P2 .8 p3 G .10 F .8 h2 .10 c2 o4 .8 ^ G .10 k s1 .8 r .10 p4 .8 P3 .10 C1 o4 .8 f .10 h3 .8 ^ G .10 r .8 s2 .10 P2 .8 p3 G .10 F .8 h2 .10 c1 o3 .8 r .10 ^ G .8 P3 .10 s1 .12' },
    { n: 'Cantera', tip: 'Tres rocas y la prensa: usa el tablón como refugio.', co: [12, 15, 17],
      s: '.10 r .8 p3 .10 r .8 P2 .10 G ^ .8 s2 .10 r .8 h3 .10 F .8 c2 o4 .10 k P3 .8 r .10 p4 G .8 s1 .10 C1 o4 .8 r .10 ^ G .8 P2 .10 h2 .8 f .10 r .8 p3 G .10 s2 .8 P3 .10 F .8 c1 o3 .10 r .12' },
    { n: 'La fábrica', tip: 'Prensas seguidas: pegado al suelo no te toca ninguna.', co: [12, 15, 17],
      s: '.10 P2 .8 P3 .10 p3 G .8 r .10 s2 .8 P2 .10 F .8 h3 .10 c2 o4 .8 k ^ G .10 P3 .8 r .10 p4 .8 s1 .10 P2 .8 C1 o4 .10 f .8 ^ G .10 P3 .8 h2 .10 r .8 p3 G .10 P2 .8 s2 .10 F .8 c1 o3 .10 P3 .12' },
    { n: 'Cielo abierto', tip: 'Todas las gemas están arriba: encadena muelle y tablón.', co: [14, 18, 21],
      s: '.10 ^ G .8 p3 G .10 r .8 P2 .10 ^ G .8 h3 .10 F .8 s2 .10 c2 o4 .8 k ^ G .10 p4 G .8 P3 .10 r .8 C1 o4 .10 ^ G .8 f .10 h2 .8 p3 G .10 P2 .8 s1 .10 ^ G .8 r .10 F .8 c1 o3 .10 p4 G .12' },
    { n: 'La última cuesta', tip: 'Dos puntos de control. Todo lo aprendido, sin pausa.', co: [12, 15, 17],
      s: '.10 s2 .8 r .10 P2 .8 p3 G .10 ^ G .8 F .10 h3 .8 c2 o4 .10 k r .8 P3 .10 p4 G .8 s1 .10 C1 o4 .8 ^ G .10 r .8 P2 .10 h2 .8 f .10 k p3 G .8 r .10 P3 .8 ^ G .10 s2 .8 F .10 c1 o3 .8 r .10 P2 .12' },
    { n: 'El derrumbe', tip: 'El remate: rocas, prensas y muelles encadenados hasta la bandera.', co: [12, 15, 17],
      s: '.10 r .8 P2 .10 p3 G .8 ^ G .10 s2 .8 F .10 h3 .8 r .10 c2 o4 .8 k P3 .10 p4 G .8 r .10 ^ G .8 P2 .10 C1 o4 .8 s1 .10 f .8 h2 .10 r .8 p3 G .10 P3 .8 ^ G .10 k r .8 r .10 P2 .8 P3 .10 ^ G .8 r .10 s2 .8 F .10 c1 o3 .8 r .10 P2 .8 ^ G .12' }
  ]
};
