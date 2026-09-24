# QA del modo tele (1.20)

Pruebas automáticas con Playwright/Chromium sobre el WordPress local (SQLite, `php -S` con 4 procesos), en septiembre de 2026.
La tele es una pestaña de 1920×1080, 1280×720 o 960×540. Los mandos son pestañas táctiles de 844×390 con toques reales enviados por CDP.
No había STUN accesible en el sandbox. Por eso cada conexión agota la espera de ICE (2,5 s), y los tiempos de conexión son un **techo**: en casa, con la red local, bajan.

## 1. Estabilidad

| Prueba | Resultado |
|---|---|
| 15 sesiones completas seguidas: sala nueva, 4 mandos, 2 juegos, menú, lobby, cerrar | **225/225 OK**. Ninguna tecla pegada, sin errores JS ni PHP |
| 4 mandos entrando a la vez | Siempre J1–J4 sin repetir. Conectan en p50 4,4 s y máx. 9,8 s (sin STUN). En la API, 25 rondas de 6 entradas simultáneas dan siempre los asientos 0–3 y 2 rechazos (409) |
| Mando congelado (JS parado, como un móvil suspendido) | La tele lo marca «Sin señal» en 3,3–3,5 s y suelta sus teclas. Al volver se recupera en menos de 0,25 s sin renegociar |
| Mando bloqueado y desbloqueado (`visibilitychange`) | La tele se entera en 0,1 s (mensaje `away`) y vuelve en 0,05–0,25 s |
| Mando sin red a mitad de partida | La tele lo detecta en 3,3–3,7 s y el mando en 7,4–7,8 s. Reconecta solo al volver la red (≈7 s) |
| Mando cerrado (pestaña cerrada) | Aviso «J3 se ha desconectado» en 3,3–3,8 s. Una pestaña nueva recupera su asiento al momento |
| Tele recargada a mitad de partida | Misma sala. Los mandos vuelven solos en ≈5 s y el cursor vuelve al último juego |
| Pestaña de la tele oculta | Sondeo cada 10 s. Al volver, sondeo inmediato |
| Sesión larga (20 min, 2 mandos, 7 juegos alternos) | Ver §4 |
| `debug.log` (WP_DEBUG) | Sin avisos ni errores PHP |

## 2. Latencia de entrada (hora del toque en el móvil → llegada al juego)

Se probaron 160 pulsaciones por fila.

| CPU de la tele | p50 | p95 | máx. | Solo red (mando → tele) p50 | RTT p50 / p95 |
|---|---|---|---|---|---|
| Normal (x1) | **31 ms** | 46 ms | 61 ms | 11 ms | 13 / 24 ms |
| Tele lenta (x4) | 132 ms | 169 ms | 187 ms | 34 ms | 46 / 81 ms |
| Tele muy lenta (x6) | 199 ms | 272 ms | 338 ms | 69 ms | 83 / 133 ms |

En una tele lenta, casi todo el retraso se debe a que el juego tarda en pintar cada fotograma (comparte hilo con la página). La red pesa poco.

**Canal de datos: `ordered:false`, fiable (sin `maxRetransmits`).**
- Sin orden no hay bloqueo de cabeza de línea: una pulsación perdida no retrasa las siguientes.
- Al ser fiable, un «soltar» nunca se pierde, así que no quedan teclas pegadas.
- Cada tecla lleva número de secuencia `s` y hora `ts`, y la tele descarta lo que llega fuera de orden. Lo mismo vale para los mensajes `pad` que manda la tele.
- Latido: el mando envía `p` cada 1 s y la tele responde `P`, que da el RTT.

## 3. Desconexión de un jugador

| Comprobación | Resultado |
|---|---|
| Aviso en la tele «J2 se ha desconectado» / «J2 ha vuelto» | OK |
| `arcade:party` se reenvía sin él y su casilla pasa a «Sin señal» | OK |
| `down:false` de sus 6 teclas al perderlo | OK |
| Vuelve al mismo asiento (mismo color) | OK. Tras 5 s sin señal el asiento se libera para otro móvil si la sala se llena |

## 4. Sesión larga de 20 minutos

Datos en `long.json` del directorio de QA:

| Medida | Inicio | Final |
|---|---|---|
| JSHeap de la tele (tras GC) | 1,41 MB | *ver abajo* |
| Nodos DOM de la tele | 478 | |
| JSHeap de cada mando | 0,75 MB | |
| Peticiones REST de la tele, lobby | 30/min (cada 2 s; cada 4 s tras 5 min sin cambios) | |
| Peticiones REST de la tele, en partida | 10/min (cada 6 s) | |
| Peticiones REST de los mandos conectados | 0/min (todo va por WebRTC) | |

<!-- LONG -->

## 5. Smart TV (agentes Tizen 6 y webOS, sin mando del móvil)

| Comprobación | Resultado |
|---|---|
| No aparece el aviso de «esto es un móvil» | OK |
| Flechas y OK del mando a distancia mueven el foco y abren el juego | OK |
| Atrás (`keyCode` 10009 Tizen, 461 webOS, GoBack, BrowserBack, Backspace, Escape) en el lobby | Abre el menú «Seguir en la tele / Salir del modo tele». Nunca sale |
| Atrás en partida (con el foco dentro del juego) | Menú de pausa |
| Atrás del navegador (`history.back`) | La trampa `pushState`/`popstate` abre el menú y la URL no cambia. Solo se arma con un gesto real (`userActivation`), porque Chrome salta las entradas creadas sin gesto |
| Reproducir/Pausa (10252, 415, 19, 179) | Abren y cierran el menú. En apps Tizen se registran con `tvinputdevice` |
| «Salir del modo tele» | Cierra la sala y vuelve al portal |
| Foco visible | Anillo amarillo doble y nombre resaltado |

**Tamaño de texto.** El texto escala con el alto de la pantalla, y el mínimo queda en el 1,8 % del alto, legible a 3 m. Antes el mínimo era del 1,5 %: se subió.

| Viewport | Texto más pequeño | Nombre del juego | Código de sala | QR |
|---|---|---|---|---|
| 960×540 (1080p con escala 2) | 9,8 px (1,8 %) | 13 px | 52 px | 167 px |
| 1280×720 | 13 px (1,8 %) | 17 px | 68 px | 224 px |
| 1920×1080 | 19,5 px (1,8 %) | 25,7 px | 102 px | 340 px |

La rejilla se mantiene a 4 columnas en 16:9.

**Navegadores de tele antiguos.** Hay alternativas para lo que no soporta el Chromium viejo de las teles:
- `inset`, `clamp`, `min()`, `aspect-ratio`, `color-mix` y `gap` en flex;
- `iceconnectionstatechange` cuando no existe `connectionState` (Chromium < 72).

## 6. Mando (iOS Safari 15+ y Chrome Android)

- **Zoom y desplazamiento:** sin zoom por pellizco ni doble toque (`gesturestart`, `dblclick`, `touch-action`), sin desplazamiento y sin selección de texto.
- **Vibración:** solo se usa si existe y tras el primer toque. En iOS no existe y no da error.
- **Pantalla encendida:** Wake Lock cuando está disponible (Android e iOS 16.4+).
- **Pantalla completa:** en iPhone no se pide. Se muestra la pista «Añádelo a la pantalla de inicio» y hay meta de app web.
- **Bloqueo:** al bloquear, la tele recibe `away` y suelta las teclas. Al desbloquear se reconecta solo.

## 7. Publicidad

| Comprobación | Resultado |
|---|---|
| Bloque «Publicidad» en el lobby de la tele (`?adpreview=1` y AdSense simulado) | Horizontal, tras la sección Multijugador. No tapa el QR ni la rejilla (≥ 24 px de separación) y se ve sin desplazar a 1920×1080 |
| En el mando | Nunca hay anuncios (ni `adsbygoogle`) |
| Durante la partida | El lobby está oculto (`display:none`) |
| Pausa publicitaria H5 (`adBreak({type:'next'})`) al volver al lobby | Solo tras partidas de ≥ 45 s y como mucho una cada `freq` s (mín. 60). Mientras dura, el mando muestra «Publicidad» y se ignoran las entradas |
| El anuncio del lobby no se recarga al volver | OK (1 petición) |

## Cosas que no se pueden verificar sin aparatos reales

- Los navegadores reales de Tizen y webOS: códigos de tecla exactos, si el botón Atrás llega como tecla o como `history.back`, y rendimiento del Chromium de la tele.
- WebRTC en la red de casa:
  - resolución mDNS (`.local`) en la tele;
  - routers con aislamiento de clientes o NAT sin hairpin;
  - móvil con datos en vez de wifi.
- iOS Safari real: gestos del sistema, Wake Lock, el aviso de añadir a inicio.
- AdSense real: si aprueba el hueco en la tele y si H5 Games Ads sirve pausas en este formato.

## Prueba en casa (5 minutos)

1. **Tele:** abre el navegador de la tele (Samsung Internet, LG Web Browser o Chrome en Android TV) y entra en `https://TU-DOMINIO/tele/`. Debe salir un QR y un código de 4 letras.
2. **Móvil:** conéctalo a la **misma wifi** que la tele. Escanea el QR, o entra en `TU-DOMINIO/mando` y escribe el código.
3. **Comprueba:**
   1. La casilla J1 se pone de color en la tele.
   2. Al mover el joystick del móvil se mueve el cursor.
   3. Con A se abre el juego y el personaje responde sin retraso apreciable.
4. **Segundo móvil:** repite el paso 2 con otro móvil (J2) y abre Air Hockey o Neon Trails.
5. **Mando de la tele:** pulsa Atrás. Debe salir el menú (no salir de la web). Con las flechas y OK se elige «Elegir otro juego».
6. **Bloqueo:** bloquea un móvil 10 s y desbloquéalo. La tele dice «J1 ha vuelto» y sigue funcionando.

**Si no conecta:**
- Si el móvil se queda en «Conectando…» más de 20 s:
  1. Comprueba que tele y móvil están en la **misma wifi**, no en la de invitados, y que el móvil no está usando datos.
  2. Desactiva el «aislamiento de clientes/AP isolation» del router, si existe.
  3. Recarga la página de la tele: sale un código nuevo.
  4. Prueba con Chrome en el móvil en vez de otro navegador.
- Si el código no existe, ha caducado (20 min sin uso). Recarga la tele.
- Si la tele sale de la web al pulsar Atrás, pulsa antes una flecha. El navegador necesita un primer gesto para activar la protección. Avísame con la marca y el modelo de la tele.
