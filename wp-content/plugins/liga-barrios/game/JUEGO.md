# Liga de Barrios de Barakaldo

Juego de navegador: RPG de criaturas con vista cenital y partidos de fútbol arcade, ambientado en los barrios de Barakaldo.

## Cómo jugar

Abre `liga-barrios-barakaldo.html` en el navegador. Es un único archivo autocontenido (sprites incluidos); solo la fuente Pixelify Sans se descarga de Google Fonts.

En el móvil, el partido se juega con un joystick flotante en la mitad izquierda y botones a la derecha. Si el teléfono lo permite (Android), vibra; se quita en el título, el Menú o la Pausa.

Defendiendo, ★ busca un corte con la supertécnica del defensor. Cerca de tu área, a veces salta solo un "¡CORTE VALOR GOL!" para elegir técnica.

### Parámetros de la URL

- `?debug`: activa el Modo prueba (toca 5 veces el título) y expone `window.G` para depurar. Sin este parámetro no están disponibles.
- `?hora=N`: fuerza la hora del día (0-23) para probar la luz, el cielo y los focos.
- `?nofx`: desactiva el postproceso WebGL. En móviles lentos se desactiva solo ("Modo fluido").

## Entrenamientos

Cada entrenamiento (penaltis, regate o paradas) son 3 intentos con tu criatura: 3 aciertos = oro, 2 = plata, 1 = bronce y 0 = sin experiencia.

## La Feria

Desde el mapa se entra a la Feria, con juegos de azar, habilidad y estrategia que dan fichas y criaturas (con tope diario y rara asegurada):
tragaperras de bar, mus con órdago, dados del mentiroso, gancho de feria, sokatira, frontón y chapas en la acera.

## Minijuegos

Los 24 minijuegos de los barrios comparten una capa común: cuenta atrás 3-2-1, puntos flotantes, rachas, sacudida al fallar,
medalla en directo y aviso en los últimos segundos. Todos tienen escenario y animaciones propias.

## Contenido

- `liga-barrios-barakaldo.html`: el juego.
- `INFORME_REVISION.md`: errores corregidos, cambios de jugabilidad en los partidos y temas pendientes.
- `SPRITES_NECESARIOS.md`: inventario de sprites hechos y por hacer, con prioridades.
- `*.png`, `*.jpg`: hojas de sprites y capturas del juego.
