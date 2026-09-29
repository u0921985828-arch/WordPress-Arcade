# Plan Friv — de 250 demos a 40 juegos de verdad

Rumbo pedido por Eddie: «un Friv antiguo, pero JUEGOS de verdad, que se puedan jugar en la tele,
en familia o con amigos, incluso usando otro móvil de mando». Y sobre todo: **full responsive y
coherente**.

## 1. Qué es «un juego de verdad» (lista de comprobación)
Ninguno entra en la portada sin cumplir las 10:

1. **Menú propio**: Jugar · Niveles · Cómo se juega · Dificultad · (Tele, si aplica).
2. **Progresión diseñada a mano**: 15–25 niveles (o rondas/pistas/tableros) escritos uno a uno,
   no generados al azar. Cada uno enseña algo nuevo antes de exigirlo.
3. **Progreso guardado**: nivel alcanzado, estrellas/medallas, mejor marca por nivel y dificultad.
4. **Final de verdad**: jefe, pista final o tabla de resultados. El juego se puede *terminar*.
5. **Curva honesta**: los 60 primeros segundos no matan; la dificultad sube por diseño, no por
   multiplicar números.
6. **Tres niveles de dificultad reales** (k.D), con normal idéntico a la curva de siempre.
7. **Familia**: si tiene modo tele, funciona igual de bien con 1, 2, 3 y 4 jugadores, y la CPU
   sustituye a quien se va.
8. **Una idea clara**: se entiende en 5 segundos sin leer nada.
9. **Remate**: sonido en cada acción, reacción a cada acierto, pantalla final con recompensa.
10. **Responsive total y coherencia** (apartados 2 y 3).

## 2. Responsive total
Hoy cada juego tiene un lienzo lógico fijo con bandas negras. Eso no es responsive: es una caja
centrada. Regla nueva:

- **Lienzo fluido**: el juego declara una dimensión de referencia y la otra se estira. El lienzo
  llena siempre la pantalla, sin bandas. Relaciones admitidas de 9:16 a 21:9; fuera de ese rango
  se recorta por zona segura, nunca se deforma.
- **Zona segura**: todo lo jugable cabe en el rectángulo seguro; el decorado rellena lo que sobra.
- **HUD anclado a los bordes reales** de la pantalla, no a un rectángulo imaginario, y siempre
  fuera de la zona de juego.
- **Mando y botones fuera del lienzo** (ya lo hace el reproductor): el juego se reescala, no se tapa.
- **Puntos de prueba obligatorios** por juego: 360×640, 390×844, 768×1024, 800×450, 1280×720,
  1920×1080 y tele 16:9 a 1 m de distancia (texto mínimo legible).
- **Sin recarga al girar**: el juego se recompone en caliente.

## 3. Coherencia
Los 40 comparten una sola piel, servida desde kit.js — ningún juego pinta su propia versión:

- Mismas pantallas: inicio, niveles, pausa, fin, podio, «cómo se juega».
- Misma tipografía, mismos botones, mismos iconos, misma paleta Kuboplay, mismo contorno.
- Mismos rótulos y mismo orden de opciones en todos los menús.
- Mismos sonidos de interfaz y mismas transiciones.
- Mismo lenguaje: tuteo, frases cortas, sin tecnicismos.

## 4. Los 40 elegidos
Un juego por idea, cubriendo lo que un portal clásico tiene que tener. El resto de los 250 sigue
publicado pero fuera de la portada.

**Acción y plataformas (7)** pixel-dash · castle-knight · barrel-climb · spike-run ·
pixel-invaders · starfall-defender · dungeon-micro
**Arcade clásico (6)** maze-muncher · tetra-drop · serpent-grid · burbujas-arcoiris ·
columnas-de-joyas · jewel-swap
**Puzles (7)** 2048-classic · sokoban-warehouse · mine-sweep · sudoku-zen · pixel-picross-xl ·
mahjong-solitaire · tangram-studio
**Cartas (2)** klondike-solitaire · freecell
**Deportes y carreras (7)** low-poly-rally · karts-de-patio · mini-golf-3d · pool-break ·
bolera-del-barrio · air-hockey · futbol-de-plaza
**Fiesta y tele (7)** ruleta-de-minijuegos · tira-y-afloja · patata-explosiva · petardo-plaza ·
gladiadores-de-juguete · balon-prisionero · parchis-de-la-plaza
**Saber y ritmo (4)** trivia-de-sobremesa · palabra-del-dia · flechas-de-baile · tower-guard

## 5. Fases
- **F0** Terminar la dificultad seleccionable en los motores que faltan (en curso).
- **F1** kit.js fluido: lienzo elástico, zona segura, HUD anclado, sin recarga al girar.
- **F2** Piel común: menú, niveles, pausa, fin, podio y «cómo se juega» servidos por kit.js.
- **F3** Los 40, en tandas de 8: niveles a mano, progreso, final, QA responsive en los 7 tamaños.
  - Tanda 1 (1.32.1): pixel-dash, castle-knight, barrel-climb, spike-run.
  - Tanda 2 (1.35.0): pixel-invaders, starfall-defender, dungeon-micro, maze-muncher.
  - Tanda 3 (1.36.0): tetra-drop, serpent-grid, 2048-classic, sokoban-warehouse.
  - Tanda 4 (1.37.0): burbujas-arcoiris, columnas-de-joyas, jewel-swap, mine-sweep.
- **F4** Portada: la portada muestra solo los 40; el resto queda en «más juegos».
