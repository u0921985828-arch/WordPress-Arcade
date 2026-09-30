# Estudio de distribución del portal

Revisión completa del orden de apartados de cada página del portal (plantilla
`wp-content/mu-plugins/arcade-core/templates/portal.php`), hecha con capturas de
página entera a **390×844** (móvil) y **1280×860** (escritorio) sobre el
WordPress de pruebas, con los 278 juegos publicados.

Cada apartado lleva: **orden actual** → **qué falla** → **orden propuesto**.
Nada de esto está aplicado todavía; es el plan.

---

## 0. Piezas comunes (todas las páginas)

**Orden actual**
1. Barra superior: logo · buscador · «En la tele» · «Mis juegos».
2. Tira de categorías (Inicio + 9 géneros), desplazable en horizontal.
3. Contenido.
4. Pie: logo · Categorías · Portal · legales · copyright.
5. Barra inferior móvil: Inicio · Explorar · Buscar · Tele · Mis juegos.

**Qué falla**
- En móvil la cabecera ocupa **dos filas fijas** (barra + chips) antes de
  cualquier contenido; la tira de chips tiene 10 elementos y solo se ven 3.
- La barra inferior repite Buscar y Tele, que ya están arriba: cuatro de sus
  cinco destinos están duplicados en la misma pantalla.
- El buscador es el elemento más ancho de la cabecera en escritorio, pero en
  móvil se queda en ~40 % del ancho, entre el logo y dos botones.

**Propuesto**
1. Móvil: cabecera de **una sola fila** (logo + lupa que despliega el buscador a
   pantalla completa); los chips de categoría bajan al contenido de la portada y
   desaparecen del resto de páginas (ya están en la barra inferior → Explorar).
2. Barra inferior móvil a **4 destinos**: Inicio · Explorar · Tele · Mis juegos
   (Buscar pasa a la lupa de la cabecera).
3. Escritorio: sin cambios; ahí la doble fila funciona.

---

## 1. Portada

**Orden actual**
1. Carrusel «Juego del día» (5 destacados).
2. Bloque **Modo fiesta** — texto, dos botones y **la lista completa de los 158
   juegos de tele como enlaces sueltos**.
3. Mosaico de categorías (9 baldosas).
4. «Seguir jugando» (oculto si no hay nada).
5. «Tus favoritos» (oculto si no hay nada).
6. «Los más jugados» o, si no hay datos, «Recomendados hoy».
7. «Exclusivos».
8. Nueve filas, una por género, en el orden del mapa `LABELS`.
9. Texto SEO «Juegos gratis online, sin descargas».

**Qué falla**
- **El muro de 158 enlaces del Modo fiesta es el problema mayor de la portada**:
  ocupa unas dos pantallas de móvil enteras entre el carrusel y las categorías.
  Es un bloque de texto azul sin jerarquía, imposible de leer, y empuja todo el
  catálogo por debajo del pliegue. En escritorio pasa lo mismo en horizontal.
- El Modo fiesta va en **segunda posición**, por delante del catálogo, cuando la
  mayoría de visitas son de un móvil solo, que no puede usarlo.
- «Seguir jugando» y «Tus favoritos» están **por debajo** del mosaico y del
  bloque de fiesta: para el que vuelve, lo suyo queda a tres pantallas.
- Las nueve filas de género repiten lo que ya dice el mosaico de categorías dos
  pantallas antes: se navega dos veces por lo mismo.
- El orden de las nueve filas es el del mapa interno, no por interés ni tamaño.

**Propuesto**
1. Carrusel (igual).
2. «Seguir jugando» + «Tus favoritos» (suben; solo aparecen si hay algo, así que
   para el visitante nuevo la portada no cambia).
3. «Los más jugados» / «Recomendados hoy».
4. Mosaico de categorías.
5. «Exclusivos».
6. Filas por género, ordenadas por número de juegos.
7. **Modo fiesta** al final del contenido, **sin la lista de 158 enlaces**: texto,
   ilustración, los dos botones y una fila de 8–10 tarjetas de juegos de fiesta
   con «Ver todos» a `/tele/`. El listado entero vive en `/tele/`, que es donde
   se usa.
8. Texto SEO (igual).

---

## 2. Listados: «Todos los juegos», categoría, etiqueta, búsqueda

**Orden actual**
1. Cabecera: antetítulo · título · descripción · **«N juegos»**.
2. Botones de orden: Populares · **A-Z (activo)** · Nuevos.
3. Rejilla con todas las tarjetas, con un hueco de anuncio cada 15.

**Qué falla**
- **Tope de 200 y sin paginación**: `Arcade_Portal::query()` pone
  `posts_per_page = 200` y la plantilla no imprime ningún enlace de páginas. Con
  278 juegos, **78 no se pueden alcanzar** desde «Todos los juegos». Es un fallo
  funcional, no de maquetación.
- El contador imprime `$wp_query->post_count`, o sea **«200 juegos»** en vez de
  278: el número que ve el usuario es falso.
- El **orden por defecto es A-Z**, así que el catálogo abre con «2048 Classic,
  2048 Hex, Abecedario Veloz…». Lo mejor del portal queda enterrado.
- La página de móvil mide **21 546 px** de alto: 200 tarjetas de tirón, sin
  cortes ni respiro.
- En búsqueda se ocultan los botones de orden, así que no hay forma de reordenar
  resultados.

**Propuesto**
1. Cabecera con el total **real** (`found_posts`, o el recuento del tipo de
   contenido en «Todos los juegos»).
2. Orden por defecto **Populares**; A-Z como tercera opción.
3. Rejilla en tandas de **60** con botón «Ver más juegos» (y enlaces de página
   reales debajo, para que Google los rastree).
4. En categoría, una primera fila «Destacados de <categoría>» con 6 tarjetas
   grandes antes de la rejilla.

---

## 3. Ficha de juego

**Orden actual**
1. Reproductor (o panel «Solo en la tele»).
2. Migas · título · datos (partidas, me gusta, jugadores, «Gratis · sin
   descargas»).
3. Acciones: Me gusta · Favorito · Compartir · **Jugar en la tele**.
4. «Cómo se juega» + chips de control.
5. Hueco de anuncio.
6. «Sobre el juego».
7. Lateral (solo ≥1024 px): anuncio + «Similares» (6).
8. «Más de <categoría>» (los 6 restantes del mismo género).
9. «También te puede gustar» (10 de otros géneros).

**Qué falla**
- **«Jugar en la tele» se muestra en casi todas las fichas**, porque la condición
  es `Arcade_Party::playable()` (239 juegos tienen teclas), no que el juego sea
  multijugador. En un juego de un jugador como *pixel-dash*, en móvil, ese botón
  aparece a ancho completo junto a las acciones y compite con el propio juego.
- **Tres bloques de relacionados encadenados**: «Similares» y «Más de
  <categoría>» salen del **mismo** `$rel` (mismo género, orden aleatorio) y se
  presentan como dos apartados distintos; luego llega un tercero. En móvil
  «Similares» no es lateral: se convierte en una **lista vertical larga** metida
  entre la descripción y las filas.
- En escritorio la columna lateral **se queda vacía** a partir de «Similares»:
  media pantalla en blanco en las fichas largas (en producción la tapa el
  anuncio `side`, pero no puede depender de eso).
- «Cómo se juega» va antes que «Sobre el juego», y las dos repiten información
  en los juegos propios.

**Propuesto**
1. Reproductor.
2. Título + datos + acciones. «Jugar en la tele» solo si el juego es
   **multijugador** (`Arcade_Portal::mp()`); para los de un jugador, fuera.
3. «Cómo se juega» + chips.
4. Anuncio.
5. «Sobre el juego».
6. **Un solo** bloque de relacionados: «Más juegos de <categoría>» con 12
   tarjetas, y debajo «También te puede gustar» con 6. Se elimina «Similares»
   como apartado propio en móvil.
7. Escritorio: el lateral mantiene anuncio + 6 «Similares» y añade, si sobra
   alto, «Tus últimos juegos».

---

## 4. Mis juegos

**Orden actual**
1. Cabecera «Mis juegos».
2. «Favoritos» (oculto si no hay).
3. «Jugados recientemente» (oculto si no hay).
4. Aviso de vacío.

**Qué falla**
- Con poco contenido guardado queda **un hueco grande** entre la última tarjeta y
  el pie: la página parece rota.
- No hay nada que hacer desde ahí si no tienes guardados: un solo enlace de
  texto.

**Propuesto**
- Añadir al final, siempre, una fila **«Para empezar»** con 12 recomendados. Así
  la página nunca queda corta y da salida al que llega sin guardados.

---

## 5. Error 404

**Orden actual**: mensaje + dos botones + rejilla de 10 sugerencias. **Correcto**,
no se toca.

## 6. Páginas de texto (legales)

**Orden actual**: título + contenido. **Correcto**. Falta solo un índice de
enlaces entre las páginas legales al pie del texto.

## 7. `/tele/`

**Orden actual**: código de 4 letras + QR, y rejilla de juegos por secciones
(Fiesta, Deportes, Carreras, Mesa y cartas, Trivia y palabras, Acción y arcade).

**Qué falla**: dentro de cada sección los juegos van **por orden alfabético**, no
por interés. Con el listado de 158 juegos moviéndose aquí desde la portada, la
primera fila de cada sección debería ser lo mejor de esa sección.

---

## Prioridad de arreglo

| # | Qué | Dónde | Gravedad |
|---|-----|-------|----------|
| 1 | 78 juegos inalcanzables (tope de 200 sin paginación) | listados | funcional |
| 2 | Contador falso «200 juegos» | listados | funcional |
| 3 | Muro de 158 enlaces del Modo fiesta | portada | maquetación grave |
| 4 | «Jugar en la tele» en fichas de un jugador | ficha | confusión |
| 5 | Orden A-Z por defecto | listados | descubrimiento |
| 6 | Tres bloques de relacionados solapados | ficha | maquetación |
| 7 | Modo fiesta por delante del catálogo | portada | orden |
| 8 | «Seguir jugando» / «Favoritos» demasiado abajo | portada | orden |
| 9 | Hueco vacío sin guardados | Mis juegos | maquetación |
| 10 | Cabecera de dos filas y barra inferior duplicada | móvil, todas | espacio |
