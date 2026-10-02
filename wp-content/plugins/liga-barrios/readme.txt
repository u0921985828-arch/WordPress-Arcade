=== Liga de Barrios de Barakaldo ===
Contributors: 43digitalinfo
Tags: game, juego, html5, canvas
Requires at least: 5.6
Tested up to: 6.8
Requires PHP: 7.0
Stable tag: 1.2.0
License: GPLv2 or later

Hospeda el juego «Liga de Barrios de Barakaldo» dentro de WordPress.

== Description ==

El juego es un unico HTML autocontenido (sprites incluidos). El plugin le da:

* Una direccion propia a pantalla completa: `/liga-de-barrios/` (se puede cambiar en Ajustes → Liga de Barrios).
* El atajo `[liga_barrios]` para incrustarlo en cualquier pagina o entrada, con `alto="600px"` opcional.
* Las fuentes Pixelify Sans y Nunito servidas desde el propio plugin: el juego no pide nada a
  Google, asi que no hay que avisar de nada por la fuente.
* Cabeceras de cache para la fuente, el CSS y el HTML, y respuesta 304 cuando no ha cambiado.

Se sirve el fichero tal cual, no dentro de un iframe: el juego se coloca en posicion fija y usa
los margenes de seguridad del movil (`env(safe-area-inset-*)`), que dentro de un iframe valen 0.

== Installation ==

1. Plugins → Añadir nuevo → Subir plugin y sube el zip.
2. Activalo.
3. Ajustes → Enlaces permanentes: si estan en «Simple», elige «Nombre de la entrada».
4. Abre `tudominio.com/liga-de-barrios/`.

== Changelog ==

= 1.2.0 =
* Juego actualizado al ultimo upstream: interfaz HD (tipografia Nunito, botones, paneles y tarjetas redondeados, criaturas suavizadas con Scale2x), rediseno de los 24 minijuegos, pantalla de captura con escenario por tipo, fichaje y feria en HD, marcador y selector de tecnicas en capa HD, banda sonora adaptativa generada en el propio juego.
* Partido: joystick que ya no se queda pegado, vibracion en movil, botones fuera del campo, pase asistido, mas paradas elegibles, descanso y resultado a dos columnas en horizontal.
* Corregido el cuelgue al ganar la insignia de Retuerto.
* Nunito se sirve desde el plugin (5 ficheros woff2): el juego sigue sin pedir nada a Google.

= 1.1.1 =
* Ergonomia: diana minima de 44x44 px en botones, campos y los dos botones de esquina, y suelo de tamano de letra en los textos pequenos.
* Pantalla de titulo centrada al pixel (los rellenos de la capa se igualan).

= 1.1.0 =
* Pantalla de titulo centrada en todos los tamanos (hoja kuboplay-fix.css inyectada sobre el juego).

= 1.0.0 =
* Primera version: direccion propia, atajo, fuente local y cabeceras de cache.
