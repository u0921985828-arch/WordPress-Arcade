=== Liga de Barrios de Barakaldo ===
Contributors: 43digitalinfo
Tags: game, juego, html5, canvas
Requires at least: 5.6
Tested up to: 6.8
Requires PHP: 7.0
Stable tag: 1.1.0
License: GPLv2 or later

Hospeda el juego «Liga de Barrios de Barakaldo» dentro de WordPress.

== Description ==

El juego es un unico HTML autocontenido (sprites incluidos). El plugin le da:

* Una direccion propia a pantalla completa: `/liga-de-barrios/` (se puede cambiar en Ajustes → Liga de Barrios).
* El atajo `[liga_barrios]` para incrustarlo en cualquier pagina o entrada, con `alto="600px"` opcional.
* La fuente Pixelify Sans servida desde el propio plugin: el juego no pide nada a Google,
  asi que no hay que avisar de nada por la fuente.
* Cabeceras de cache para la fuente, el CSS y el HTML, y respuesta 304 cuando no ha cambiado.

Se sirve el fichero tal cual, no dentro de un iframe: el juego se coloca en posicion fija y usa
los margenes de seguridad del movil (`env(safe-area-inset-*)`), que dentro de un iframe valen 0.

== Installation ==

1. Plugins → Añadir nuevo → Subir plugin y sube el zip.
2. Activalo.
3. Ajustes → Enlaces permanentes: si estan en «Simple», elige «Nombre de la entrada».
4. Abre `tudominio.com/liga-de-barrios/`.

== Changelog ==

= 1.1.0 =
* Pantalla de titulo centrada en todos los tamanos (hoja kuboplay-fix.css inyectada sobre el juego).

= 1.0.0 =
* Primera version: direccion propia, atajo, fuente local y cabeceras de cache.
