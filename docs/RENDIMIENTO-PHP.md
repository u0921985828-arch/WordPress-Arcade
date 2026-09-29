# Rendimiento de PHP (pestaña «PHP» de Kuboplay Shield)

Guía para Eddie. Todo esto se toca desde el escritorio de WordPress, en
**Kuboplay Shield → PHP**. Nada de esto sale del servidor: no hay llamadas a
internet, no se envía ninguna estadística a nadie y no se guarda ningún dato de
ningún visitante.

Si algo se tuerce, en el archivo `wp-config.php` puedes escribir
`define( 'KP_SHIELD_OFF', true );` y el plugin entero deja de actuar.

---

## 1. Recordar lo ya calculado (caché de objetos)

**Qué es.** Para pintar una página, WordPress le hace muchas preguntas a la base
de datos: los ajustes, las categorías, los datos de cada juego… Casi siempre son
las mismas preguntas con las mismas respuestas. Esta opción guarda las respuestas
en archivos y las reaprovecha en la siguiente visita.

**Por qué en ficheros.** Lo normal en webs grandes es usar Redis o Memcached,
pero el hosting compartido de IONOS no los ofrece. Guardarlo en archivos hace el
mismo papel y no depende de nada que haya que contratar.

**Lo que se mide en el WordPress de pruebas** (con la caché de páginas apagada,
para que se vea solo el efecto de esta):

| Página | Sin caché de objetos | Con caché de objetos |
|---|---|---|
| Portada | 47 consultas | 17 consultas |
| Ficha de un juego | 52 consultas | 16 consultas |

Es decir, alrededor de un **65 % menos de trabajo para la base de datos**. Con la
caché de páginas encendida, además, la mayoría de visitas ni siquiera llegan a
esta parte.

**Cómo se enciende.** El interruptor copia un archivo llamado `object-cache.php`
dentro de `wp-content/`. Al apagarlo, lo borra. Los datos guardados viven en
`wp-content/cache/kp-obj/`, en una carpeta protegida.

**Cosas que conviene saber:**

- Si **otro plugin** ya ha puesto su propio `object-cache.php`, Kuboplay Shield
  **no lo pisa**: el interruptor se queda bloqueado y el panel lo explica. Para
  usar el nuestro, desinstala antes el otro.
- Si la carpeta no se puede crear o escribir, el archivo no hace nada y WordPress
  sigue funcionando con su método de siempre. **La web no se cae por esto.**
- Los tres ajustes de debajo (cuánto se recuerda, tamaño máximo por dato y
  archivos nuevos por visita) son topes de seguridad para que la caché no llene
  el hosting. Los valores de fábrica van bien.
- El botón **Vaciar caché** del panel también vacía esta.

**Detalle técnico, por si alguien lo revisa:** solo se vuelve a leer lo que el
propio archivo ha escrito, y siempre con `unserialize( …, ['allowed_classes' =>
false] )`, así que nunca se reconstruye un objeto a partir del disco. Los valores
que contienen objetos no se guardan en disco: se quedan en memoria durante esa
visita. Cada archivo se escribe primero con nombre temporal y luego se renombra,
para que nunca se lea a medias. Los grupos `counts`, `plugin`, `themes`,
`comment` y `wc_session_id` no se guardan nunca.

---

## 2. OPcache

**Qué es.** PHP tiene que traducir el código antes de ejecutarlo. OPcache guarda
esa traducción para no repetirla en cada visita. Es la mejora más grande que hay
y no cuesta nada, pero **la enciende el hosting, no el plugin**: se activa desde
el panel de IONOS (ajustes de PHP de tu web).

**Lo que hace el plugin:**

- Te dice en el diagnóstico si está encendida, cuánta memoria libre le queda y si
  se ha llenado.
- Pone un botón **Vaciar OPcache** por si tras un cambio la web sigue enseñando
  algo viejo.
- Con «Refrescar el código tras actualizar» encendido, la vacía sola cada vez que
  actualizas un plugin, el tema o WordPress.

Si el diagnóstico dice que está llena, pide 128 MB de OPcache en el panel del
hosting.

---

## 3. Diagnóstico del servidor

Una tabla, solo de lectura, con un veredicto en cada línea:

- **Versión de PHP** y si todavía recibe parches de seguridad. En IONOS se cambia
  desde el panel del hosting (Webs y dominios → tu web → PHP). Conviene 8.2 o
  superior.
- **Memoria por petición** (`memory_limit`): 128 MB o más.
- **Tiempo máximo por petición**: por debajo de 30 s las tareas largas (importar
  catálogo, regenerar miniaturas) pueden cortarse.
- **OPcache**: encendida, apagada o llena.
- **Extensiones**: opcache, zlib, igbinary, intl, gd, imagick y sodium, con para
  qué sirve cada una y cuáles son opcionales.
- **Caché de rutas de ficheros** (`realpath_cache_size`): con cientos de juegos
  conviene 4 MB.
- **Caché de objetos**: si hay una, y cuál.
- **Tareas programadas**: si están apagadas dentro de WordPress.

Debajo, el peso de los **ajustes que se cargan siempre** (las «opciones
autocargadas»), con los ocho más gordos. Si el total pasa de 800 KB suele ser
basura de plugins antiguos. **El plugin solo lo mide: no borra nada por su
cuenta.** Si hay que limpiar, se decide a mano con una copia de seguridad hecha.

---

## 4. Frenar lo que se hace en cada visita

Tres interruptores, todos apagados de fábrica:

- **Frenar las tareas automáticas.** WordPress aprovecha las visitas para hacer
  su mantenimiento. Con esto, como mucho una vez cada X segundos (300 de fábrica).
- **Apagar del todo las tareas automáticas.** Solo si antes has creado en el
  panel de IONOS una tarea programada que llame a `wp-cron.php` cada 15 minutos.
  Si no la has creado, **déjalo apagado**: sin ella WordPress dejaría de publicar
  las entradas programadas y de hacer su mantenimiento. Por eso pide confirmación.
- **Bajar el ritmo del escritorio.** Mientras tienes el escritorio abierto,
  WordPress pregunta al servidor cada pocos segundos; esto lo espacia (120 s de
  fábrica, el autoguardado sigue funcionando) y lo quita del todo en la parte
  pública, que no lo usa.
- **Guardar menos versiones antiguas.** Cada edición de una página guarda una
  copia. Con cientos de juegos eso abulta. El módulo de Rendimiento tiene su
  propio ajuste equivalente; si enciendes los dos, manda este.

---

## 5. Lo que este módulo NO toca

- **La API de los juegos (`arcade/v1`)**, que es la que usa el modo tele. No se
  cachea, no se frena y no se le añade nada. El modo tele ya tiene sus propios
  límites y depende de respuestas al momento.
- **`/tele/` y `/mando/`**, por lo mismo.
- Las opciones autocargadas: se miden, no se borran.
- Nada de `wp-content/mu-plugins/` ni del plugin del arcade.

---

## 6. Orden recomendado para encenderlo

1. Mira primero el **diagnóstico** y arregla en el panel de IONOS lo que salga
   marcado (versión de PHP, OPcache).
2. Enciende **la caché de objetos**. Navega un rato por el portal y entra en
   varias fichas de juego.
3. Si todo va bien, enciende **bajar el ritmo del escritorio** y **guardar menos
   versiones**.
4. Deja **apagar del todo las tareas automáticas** para el final, y solo cuando
   tengas la tarea creada en el hosting.

Si algo se ve raro: apaga la caché de objetos y toca **Vaciar caché**. Se
desinstala sola y la web vuelve a comportarse como antes.
