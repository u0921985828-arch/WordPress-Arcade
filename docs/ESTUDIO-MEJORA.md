# Estudio de mejora — Arcade (preparación para feria)

Objetivo: que el portal aguante una demo en directo en una feria de desarrollo web y juegos (móvil en mano, sin explicaciones) y se vea al nivel de un portal profesional.

## 1. Controles (hecho en 1.17.0)

| Problema | Solución aplicada |
|---|---|
| Los controles tapaban el juego | Franja propia fuera del lienzo: abajo en vertical, columnas laterales en horizontal (1.16) |
| Cruceta fija: si no miras, fallas la flecha | **Joystick flotante**: aparece donde apoyas el pulgar (toda la mitad izquierda) y la base te sigue si te pasas del borde |
| Botones pequeños, pulsaciones fallidas | Botones más grandes (74–96 px) y **toda la mitad derecha es táctil**: cada dedo pulsa el botón más cercano |
| Saltar y atacar a la vez | Deslizar el pulgar de un botón a otro sin levantarlo; multitáctil joystick + botón |
| Juegos de un botón | Sin joystick, las dos zonas pulsan el botón (p. ej. «Subir» en Cave Flyer) |
| Controles genéricos | Cada juego declara los suyos (`CFG.pad`): solo ← → en plataformas, botones rotulados «Saltar», «Espada», «Fuego», «Motor»… |

Pendiente (siguiente iteración):
- Ajustes del jugador: tamaño de botones, zurdos (intercambiar lados), opacidad, vibración sí/no.
- Joystick analógico real (hoy convierte a 8 direcciones) para `drone`, `topdown`, `raycast`.
- Unificar los controles dibujados dentro del lienzo (tetra, rock-belt, sokoban «deshacer») con la franja.

## 2. Calidad visual de los juegos

Estado: todo el arte está dibujado por código (vector plano con contorno), sin recursos de terceros. Es coherente y sin riesgo de copyright, pero en feria se nota «hecho con formas».

Opciones:

| Opción | Resultado | Coste / riesgo |
|---|---|---|
| **A. Vector propio mejorado** (art.js v2) | Degradados, luz y sombra, contornos variables, texturas en fondos, más fotogramas de animación, partículas | Sin licencias; trabajo por motor; aspecto propio y diferenciado |
| **B. Packs CC0** (p. ej. Kenney, dominio público) | Sprites de aspecto profesional al momento | Hay que descargarlos (en este entorno la red los bloquea: subir el zip al repo o permitir el dominio); aspecto «visto en otros juegos»; pesos de imagen |
| **C. Arte encargado o generado** | Identidad única | Coste, tiempo, revisar licencias |

Recomendación: **A como base** (diferencia el portal y mantiene 0 € y 0 riesgo legal) y **B solo para personajes/enemigos** de los juegos estrella (plataformas, shooters, mazmorras) si se aporta el pack.

Prioridad de juegos a pulir para la demo (los que más se van a probar): Pixel Dash, Blade Leap, Starfall Defender, Maze Muncher, Tetra Drop, Dungeon Micro, Low Poly Rally, Mini Golf, Pool Break, Klondike.

## 3. Web para la feria

- Modo demo: portada con «Juego del día» y 6 juegos estrella fijados; enlace/QR a la ficha directa.
- Rendimiento: Lighthouse móvil ≥ 90 (imágenes webp ya, carga perezosa de iframes y anuncios ya).
- PWA instalable (manifest ya): añadir service worker para jugar sin conexión en el stand.
- Dominio propio y título del sitio (imprescindible también para AdSense).
- Accesibilidad: foco visible, textos alternativos, contraste (revisar con Lighthouse).
- Material: 3–4 capturas/GIF por juego estrella, vídeo de 30 s, ficha técnica (100 juegos propios, 0 dependencias, canvas 2D, WordPress).

## 4. Plan propuesto

1. Controles 1.17 (hecho) → probar en móvil real.
2. Decidir arte (A o A+B).
3. Pulir los 10 juegos estrella + miniaturas.
4. Modo demo + service worker + dominio.
5. Material de presentación.
