# La vara del gancho — qué separa una demo de un juego que apetece repetir

Rumbo de Eddie: «no son tan guapos y divertidos, tienen que tener ese enganche visual
y lógico de querer ganar». Este documento es la vara. Un juego de los 40 no se da por
terminado si no cumple **las 12**.

## A. Gancho lógico (querer ganar)

1. **Meta visible en todo momento.** Nunca se juega «a ver qué pasa»: en pantalla está
   siempre qué falta para el objetivo (barra, contador que baja, metros restantes).
2. **Recompensa cada 3–5 segundos.** Algo bueno pasa constantemente: moneda, gema,
   +puntos, un trozo de barra. Si pasan 6 s sin recompensa, el nivel está mal diseñado.
3. **Cadena y multiplicador.** Encadenar aciertos sube un multiplicador visible que se
   pierde al fallar. El sonido sube de tono con la cadena (`k.chime(i)`).
4. **Casi-victoria.** Al perder se dice cuánto faltaba («te faltaban 2 gemas»,
   «te quedaban 40 m»). Perder debe doler y dar ganas, no dar igual.
5. **Reintento en menos de un segundo.** Botón «Reintentar» el primero, foco puesto.
   Nada de volver al menú ni de esperas.
6. **Tres estrellas por nivel** (`k.levelDone(pts, extra, {stars:n})`): 1 = superado,
   2 = bien, 3 = bordado. Se guardan por dificultad y se ven en la rejilla de niveles.
   El total de estrellas se enseña: es la colección que engancha.

## B. Gancho visual (que entre por los ojos)

7. **Reacción a cada acierto.** `k.hitstop(0.05)` en los impactos importantes,
   `k.punch(0.05)` al reventar algo grande, `k.shake` solo en lo gordo, partículas del
   color del objeto y texto flotante con lo que has ganado.
8. **Anticipación y remate.** Nada aparece o desaparece de golpe: entra con escala
   (0 → 1,15 → 1) y sale encogiendo. El personaje se prepara antes de actuar y se
   recupera después.
9. **Fondo vivo.** Paralaje que se mueve, algo que respira (nubes, público, agua,
   luces). Un fondo plano y quieto es lo que hace que un juego parezca de 2003.
10. **Color con jerarquía.** Lo jugable es lo más saturado y lo más contrastado de la
    pantalla; el decorado va desaturado y más oscuro. Se comprueba en gris: si no se
    distingue lo jugable, está mal.
11. **Celebración proporcionada.** Superar un nivel: confeti, fanfarria y las estrellas
    entrando una a una. Los logros pequeños tienen su celebración pequeña.
12. **Personaje con carácter.** Lo que controlas tiene cara o intención: mira hacia
    donde va, se asusta, celebra. Se aplica la ley de la pieza única (`REMASTER.md` §8)
    y el cartoon de estudio.

## C. Cómo se comprueba
- **Prueba de los 10 segundos**: se graba el juego 10 s; si no hay al menos dos
  recompensas y una reacción visual, no pasa.
- **Prueba del gris**: captura en escala de grises, lo jugable tiene que leerse.
- **Prueba del reintento**: perder → volver a jugar en 1 toque y menos de 1 s.
- **Prueba de la vuelta**: tras acabar un nivel, ¿se ve qué se gana en el siguiente?
- Los 7 tamaños obligatorios de `PLAN-FRIV.md` §2 siguen siendo requisito.

## D. Lo que aporta kit.js (v25) — no lo reimplemente cada juego
`k.hitstop(s)` congela la acción unas centésimas · `k.punch(a)` golpe de zoom ·
`k.reward(txt, col)` cartel grande y corto · `k.chime(i)` nota ascendente de cadena ·
`k.combo(n, x, y)` texto de multiplicador · `k.levelDone(pts, extra, {stars})` y
`k.starsOf(n)` / `k.starsTotal()` · el fin de partida de un juego con niveles ya trae
botón «Reintentar».
