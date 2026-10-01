=== Kuboplay Lanzadera ===
Contributors: kuboplay
Tags: games, menu, launcher
Requires at least: 5.6
Tested up to: 6.8
Requires PHP: 7.0
Stable tag: 1.1.0
License: GPLv2 or later

Un menú de consola en la portada para elegir juego.

== Description ==

Al entrar en la web sale un menú a pantalla completa, estilo consola, con una ficha por juego.
Se mueve con las flechas, el ratón, el dedo (deslizando) y el mando; Intro o A entran al juego.

* Detecta solo lo instalado: el portal Kuboplay (plugin Arcade) y Liga de Barrios.
* Se pueden añadir hasta 6 juegos a mano en Ajustes → Lanzadera (nombre, texto, dirección, color y dibujo).
* Las portadas son SVG dibujado por código: ni una imagen de terceros, nada que descargar.
* Al activarlo guarda cuál era la portada; al desactivarlo la devuelve tal cual.

== Installation ==

1. Plugins → Añadir nuevo → Subir plugin y sube el zip.
2. Activalo. La portada pasa a ser el menú y el portal de juegos queda en /juegos/.
3. Ajustes → Lanzadera para cambiar nombres, textos y colores.

== Changelog ==

= 1.1.0 =
* Los juegos se detectan en caliente: da igual el orden de instalacion. Si la lanzadera
  se activo antes de instalar Liga de Barrios, su ficha aparece sola.
* Panel: lista de juegos detectados con su direccion y boton «Volver a detectar».

= 1.0.0 =
* Primera version.
