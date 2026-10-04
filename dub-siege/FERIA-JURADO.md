# Dub Siege ante el jurado — feria de tecnología, apps móviles y juegos

**Formato**: presentación de 3 minutos, demo en móvil, 7 jueces con lentes distintas.

Cada juez puntúa sobre 10 y sus críticas se apoyan en una medición real del juego. Las mediciones se hicieron el 4-10-2026 con Playwright sobre el fichero actual (commit db05eb4).

---

## 1. La presentación (lo que se cuenta en el escenario)

> **Dub Siege — Sound System Defender.** Un juego de plataformas y disparos para el móvil, que cabe en **un solo fichero HTML**. No hay que instalar nada, no tiene dependencias ni servidores de terceros, y funciona sin conexión una vez cargado.
>
> Eres SELECTA y defiendes tu sound system de El Censor. Recorres **12 fases** en 4 zonas: calle, azoteas, metro y club. Cada fase tiene su jefe, y hay **cinemáticas** al empezar, en el punto de control, al aparecer el jefe y al ganarle. Las explosiones encadenan bidones y la **banda sonora se sintetiza en el propio juego**, a entre 132 y 160 BPM.
>
> Los controles móviles salen de un estudio de ergonomía. Un solo botón sirve para saltar (si lo tocas) o para hacer el dash (si lo mantienes). Los botones se colocan en el arco natural del pulgar, y toda la columna derecha responde al dedo. Con eso, el **acierto a ciegas sube del 69 % al 93 %**.
>
> También funciona con teclado y mando. Trae disparo automático en táctil, apuntado asistido, botones grandes, vibración, movimiento reducido, ranking local y personaje personalizable.

**Cifras de la demo**

| Medida | Valor |
|---|---|
| Fichero | 1,40 MB (1,00 MB comprimido) |
| Carga hasta el menú | 0,76 s en wifi · **8,7 s en 4G lenta con el procesador 4× más lento** (caso de reserva) |
| Fotogramas por segundo, móvil normal | 60 estables en las fases 1, 6 y 12 y en el jefe final; el peor fotograma tarda 17 ms |
| Fotogramas por segundo, procesador 4× más lento | 54 de media; el peor fotograma tarda 50 ms |
| Recorrido completo | 12 de 12 fases terminadas, final incluido, sin ningún error de JavaScript |

---

## 2. El jurado

### Juez 1 — Diseño de juego (sensación al jugar, ritmo, curva) · **6,5/10**

**Lo bueno**
- Moverse se siente bien:
  - el salto cambia de altura según cuánto mantienes;
  - se puede saltar de nuevo en el aire;
  - el dash atraviesa las balas.
- 12 fases con jefe y versiones «rojas» más duras de los jefes. Para un juego de navegador, eso es estructura de juego completo.
- Los bidones explosivos dan una mecánica de riesgo y recompensa: sirven contra los enemigos, pero también te dañan a ti.

**La crítica**
- Un bot sin ninguna habilidad cruzó la fase 1 entera y llegó al jefe en menos de 60 s **sin perder una vida**. El bot solo mantenía «derecha + fuego» y saltaba cada 0,45 s.
- Eso significa que el primer minuto, el más importante, **no pide nada al jugador**. En una feria, el juez juega 60 segundos: si no le exige nada en ese tiempo, no se le queda nada.

**Lo que pide**
- Que en los primeros 20 s aparezca un obstáculo que **obligue** a usar el dash (por ejemplo, un muro de balas) y otro que obligue a usar el doble salto.
- Enseñar jugando, no con textos.

### Juez 2 — Experiencia en el móvil y controles · **7/10**

**Lo bueno**
- El estudio de ergonomía es lo mejor de la demo:
  - tiene un modelo de alcance del pulgar;
  - simula 20 000 toques;
  - mide antes y después, en 5 tamaños de pantalla.
- Pocos estudios pequeños hacen esto.
- Juntar salto y dash en un botón reduce a 3 los botones del lado derecho.

**La crítica**
- Con el móvil tumbado (844×390), **el juego ocupa solo el 45 % de la pantalla** (514×289 px).
- Quedan bandas de 50 px arriba y abajo y dos columnas laterales casi vacías.
- **El héroe mide unos 6 mm (37 px) en la pantalla.** En la feria, con luz de pabellón y prisa, cuesta seguirlo.
- El estudio es un modelo: **nadie lo ha probado con manos reales**.

**Lo que pide**
- Que el juego ocupe más pantalla: usar el alto entero y que los controles floten semitransparentes sobre los bordes del juego, donde no hay acción.
- Una prueba con 5 personas y 3 tamaños de mano antes de dar el estudio por cerrado.

### Juez 3 — Arte y dirección visual · **7,5/10**

**Lo bueno**
- Hay una identidad clara: neón nocturno, ciudad pixelada con ventanas encendidas y atardecer magenta en las azoteas.
- Se respeta el píxel cuadrado a escala entera. No se ven píxeles deformes, y eso se nota.
- Las cinemáticas con retrato y texto a máquina tienen oficio.

**La crítica**
- **El logo del menú se sale del marco** de la escena: «DUB SIEGE» pisa el borde superior del cuadro, y parece un error, no una decisión.
- El rótulo «FASE N DE 12» se queda **en el centro de la acción** mientras ya estás jugando.
- En el metro (fase 9) el héroe se pierde contra un fondo oscuro de tono parecido.
- En las cinemáticas, el retrato del jefe sale oscuro y pequeño comparado con el de MAMA DUB.

**Lo que pide**
- Encajar el logo dentro del marco o sacarlo del todo.
- Llevar el rótulo de fase a la franja superior.
- Un contorno claro de 1 px alrededor del héroe en las zonas oscuras.
- Retratos de jefe con la misma luz que los aliados.

### Juez 4 — Tecnología y rendimiento · **7,5/10**

**Lo bueno**
- Un solo fichero, sin librerías y sin ninguna petición externa: la fuente va incrustada y el sonido se sintetiza.
- 60 fotogramas por segundo clavados en todas las fases.
- Con el procesador 4 veces más lento sigue a 54.
- Hay una API de depuración que permite recorrer las 12 fases de forma automática. Es ingeniería seria.

**La crítica**
- **Pesa 1,4 MB porque los gráficos van incrustados en base64** y al comprimirlo solo baja a 1,0 MB.
- En una 4G mala tarda **8,7 s en enseñar algo**. Durante ese tiempo la pantalla está negra y no hay pantalla de carga.
- Además:
  - no es instalable (no tiene manifiesto de app ni service worker), así que no funciona sin conexión si se recarga la página;
  - el README describe el lienzo como 320×180, cuando el código ya usa un ancho de 192 a 264 por 108 de alto. La documentación va por detrás del código.

**Lo que pide**
- Reducir los gráficos a PNG con paleta o WebP sin pérdida.
- Pintar algo en menos de 1 s (logo y barra de carga).
- Añadir un manifiesto y un service worker para que se pueda instalar y jugar sin conexión.

### Juez 5 — Accesibilidad e inclusión · **6/10**

**Lo bueno**
- Respeta el ajuste de «movimiento reducido» del sistema.
- Ofrece disparo automático, apuntado asistido, botones grandes y vibración desactivable.
- Se juega con teclado, pantalla táctil o mando.
- Hay más opciones que en la mayoría de juegos de feria.

**La crítica**
- Todo el texto está en mayúsculas pixeladas y **sin tildes ni eñes**, porque la tipografía no las trae: «MAMA», «TUNELES», «ANDEN». Para un juego en español es un fallo de idioma, no un detalle.
- Muchos textos son muy pequeños, como los rótulos de los botones o el «MANTEN DASH» de 6 px.
- No se ha comprobado el daltonismo: el aviso de peligro y los bidones se apoyan en el rojo.

**Lo que pide**
- Dibujar los glifos que faltan (á é í ó ú ñ ü ¿ ¡). En pixel art son unas pocas casillas cada uno.
- Un modo de texto grande.
- Pasar las capturas por un simulador de daltonismo.

### Juez 6 — Producto y negocio (retención, crecimiento) · **5,5/10**

**Lo bueno**
- Lo que cuesta empezar es mínimo: un enlace y a jugar.
- Hay progreso guardado: CONTINUAR FASE N, tienda con monedas y personaje personalizable.

**La crítica**
- **No hay ninguna razón para volver mañana.** El ranking es solo local, no hay reto diario, no se puede compartir la puntuación y no hay medición de uso.
- No sabemos en qué fase se rinde la gente porque no se mide nada.
- No hay un plan de monetización, aunque el portal Kuboplay donde vivirá ya tiene AdSense preparado.

**Lo que pide**
- Un **reto diario con semilla común** y una tarjeta de «compartir resultado» (imagen con la puntuación y la fase).
- Un contador de abandonos por fase, anónimo y sin datos personales.
- Publicarlo dentro de Kuboplay para heredar los anuncios entre partidas.

### Juez 7 — Narrativa y audio · **7/10**

**Lo bueno**
- La premisa es original: una radio pirata contra la censura, el sound system como arma y la música como resistencia.
- La historia tiene arco de principio a fin, desde «Aquí MAMA DUB, desde la radio pirata» hasta «La ciudad vuelve a bailar».
- Hay 4 temas musicales sintetizados, con su propio tempo.

**La crítica**
- La música no responde a lo que pasa en la partida, salvo el cambio al tema del jefe.
- Siendo un juego *sobre el sonido*, el disparo no va a ritmo con la música y el arma BASS no tiene un momento sonoro que impresione.

**Lo que pide**
- Que el BASS cuadre con el compás: si se suelta a tiempo con el bajo, hace más daño.
- Que la música gane capas según la racha. Es la idea que convierte «un juego con música» en «un juego musical».

---

## 3. Veredicto

| Juez | Lente | Nota |
|---|---|---|
| 1 | Diseño de juego | 6,5 |
| 2 | Móvil y controles | 7,0 |
| 3 | Arte | 7,5 |
| 4 | Tecnología | 7,5 |
| 5 | Accesibilidad | 6,0 |
| 6 | Producto | 5,5 |
| 7 | Narrativa y audio | 7,0 |
| | **Media** | **6,7** |

**Finalista con condiciones.**
- El jurado ve una base técnica y artística por encima de la media de la feria, y un estudio de controles que pocos equipos traen.
- Lo que la separa del podio no es el código. Son tres cosas que se notan en el primer minuto:
  1. **la pantalla está desaprovechada y el héroe se ve pequeño**;
  2. **el primer minuto no exige nada**;
  3. **la carga está en negro en redes lentas**.

---

## 4. Plan de mejora ordenado (impacto ÷ coste)

| # | Mejora | Juez | Coste |
|---|---|---|---|
| 1 | Juego más grande en horizontal: todo el alto y controles flotando sobre los bordes; héroe a ≥ 9 mm | 2, 3 | Medio |
| 2 | Primeros 20 s que obliguen a usar el dash y el doble salto | 1 | Bajo |
| 3 | Pantalla de carga en menos de 1 s y gráficos comprimidos (objetivo: ≤ 600 KB) | 4 | Medio |
| 4 | Rótulo «FASE N» en la franja superior y logo encajado en el menú | 3 | Bajo |
| 5 | Tildes, eñes y signos de apertura en la fuente pixelada | 5 | Bajo |
| 6 | Prueba de controles con 5 personas reales | 2 | Bajo (tuyo) |
| 7 | Contorno del héroe en zonas oscuras y retratos de jefe con más luz | 3 | Bajo |
| 8 | Reto diario y tarjeta para compartir | 6 | Medio |
| 9 | BASS a ritmo y música que gana capas con la racha | 7 | Medio |
| 10 | Instalable y sin conexión (manifiesto y service worker) y README al día | 4 | Bajo |

Con las mejoras 1–5 hechas, el jurado estima que la media subiría a **≈ 7,8**, que es nivel de podio.
