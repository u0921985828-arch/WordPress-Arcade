# La vara (estándar de calidad de los 40)

Referencia viva: **pixel-dash** (1.38.1). Un juego está «bien» cuando cumple las 8 de abajo.
No basta con confeti y estrellas sobre un juego que se cruza en 12 segundos: eso ya se probó y
el usuario lo rechazó con razón.

1. **Duración con forma.** Cada nivel/ronda/mano dura **40–70 s** a ritmo humano (los puzles, lo
   que pida su idea, pero nunca «se resuelve sin pensar»). El nivel tiene arranque que enseña,
   subida de tensión, pico y remate. Punto de control o deshacer a partir de la mitad de la tabla.
2. **Verbos que se acumulan.** El juego no puede pedir lo mismo en el nivel 1 y en el 20. Mínimo
   **5 mecánicas nuevas** introducidas de una en una (nivel-escuela) y después combinadas de dos
   en dos y de tres en tres. Cada una se telegrafía antes de castigar.
3. **Presión.** Al menos un tercio de la tabla con una amenaza que avanza, un reloj, un recurso
   que se agota o un rival que aprieta. Nunca injusta: la ruta limpia siempre tiene margen ≥0,3 s
   y se gana sin memorizar.
4. **La recompensa no es gratis.** Lo que suma puntos o estrellas está en la ruta arriesgada o en
   la jugada difícil. Quien va por lo fácil termina, pero no saca 3 estrellas.
5. **Estrellas con sentido**, por `k.levelDone(pts, extra, {stars})`: 1★ terminar · 2★ un objetivo
   medible escrito a mano por nivel y dificultad (tiempo, movimientos, piezas, precisión) ·
   3★ ese objetivo **más** una condición de maestría (todo recogido, sin daño, sin pista).
   La tarjeta final dice qué falta para la siguiente estrella.
6. **Final de verdad.** Jefe, última mano, tabla de resultados o pista final. El juego se termina.
7. **Fallar cuesta pero no castiga.** Reintento en un toque desde el punto de control, sin
   pantallas intermedias.
8. **Dificultad honesta.** `k.dif` 0/1/2 cambia márgenes, velocidad y objetivos, **no la ruta**.

## Pruebas de aceptación (sin ellas no se entrega)
- `node --check`, `python3 scripts/build_games.py` sin tocar nada fuera de los ficheros del encargo.
- `smoke.py` de **todos** los juegos del motor: 0 errores.
- **Bot dirigido** que se pasa la tabla entera en las 3 dificultades, con los objetivos de 2★
  alcanzables. Se ajusta la tabla hasta que salga.
- Capturas en 360×640, 390×844, 768×1024, 800×450 y 1280×720: nada se sale, corta ni solapa.
- Los demás juegos del mismo motor, **idénticos** (capturas comparadas contra HEAD).
- Coste por frame medido antes y después: no subir más de +1 ms. Sprites cacheados, sin
  `shadowBlur`/`filter`/gradientes dentro del bucle. §8 de docs/REMASTER.md (pieza única).
- Arte dibujado por código, sin librerías ni recursos de terceros.
