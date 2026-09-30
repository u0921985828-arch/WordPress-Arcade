# Auditoría de tiempos, descansos y sensibilidad (1.47.0)

Revisión de los **130 motores** buscando tres cosas: que el tiempo del juego no dependa de los
fotogramas por segundo, que los descansos (celebraciones, finales de turno, bola asentándose) duren
lo justo y se puedan pasar, y que el control por dedo responda como debe.

Importa más que nunca desde 1.45: en una Smart TV el juego puede ir a **25 fps** y en el móvil a 60.
Todo lo que se calcule «por fotograma» y no «por tiempo» se comporta distinto en cada aparato.

## 1. Tiempo por fotograma (lo que iba mal en la tele)

Rastreo automático de dos patrones en los 130 motores: suavizados `x += (destino - x) * K` y
amortiguaciones `v *= K` sin `dt`. De 14 candidatos, 6 eran reales (el resto son golpes puntuales
—rebotes, choques— que sí deben ser de una vez).

| Motor | Qué era | Efecto a 25 fps | Arreglo |
|---|---|---|---|
| `maze.js` | cámara del laberinto isométrico, `0,15` por fotograma | la cámara llegaba al **85,8 %** en medio segundo, frente al 99,2 % a 60 fps: arrastraba visiblemente | `1 - 0,85^(dt·60)` → 99,1 % / 99,2 %, igual en los dos |
| `horda.js` | separación entre compañeros, `0,5` por fotograma | los personajes se despegaban 2,4 veces más despacio y se montaban unos encima de otros | `min(1, dt·30)` |
| `baraja.js` | carta que se levanta al señalarla | subía a tirones | `1 - 0,7^(dt·60)` |
| `burbujas.js` | rozamiento `0,999` por fotograma | freno 2,4× menor a 25 fps | `0,999^(dt·60)` |

`arena.js`, `party.js`, `road.js` y `rope.js` salían en el rastreo pero son fuerzas (que sí se
integran con `dt`) o correcciones de una sola vez: se dejan como están.

**Relojes de pared**: 22 motores usan `performance.now()`. Repasados uno a uno — son parpadeos y
fases de dibujo, o presupuestos de cálculo de la IA (golf, rejilla, honda). **Ninguno gobierna la
partida**, así que una pausa o un anuncio no adelanta el juego.

## 2. Descansos: cuánto duran y cómo se pasan

Regla que se adopta: un descanso **no pasa de 1,5 s**, y el jugador puede **saltárselo con un toque
o con A**, dejando siempre 0,3 s para que la jugada remate (sin ese mínimo, el gol se ve a medias).

kit.js (`?v=29`) aporta la pieza común: **`k.skip()`** = toque en la pantalla o A de cualquier mando.

| Juego | Descanso | Antes | Ahora |
|---|---|---|---|
| Bolos (los 3) | bola asentándose | 1,5 s fijos | 1,5 s, o 0,3 s al tocar |
| Penaltis (solo y por turnos) | tras el tiro | 1,4 / 1,5 s fijos | igual, o 0,3 s al tocar |
| Dardos (501, cricket, por turnos) | fin de turno de 3 dardos | 1,0 / 1,1 s fijos | igual, o 0,4 s al tocar |
| Billar (8 bolas, break) | cartel de turno | 1,0 / 1,2 s fijos | igual, o 0,3 s al tocar |
| Ping pong / frontón / air hockey | saque | 0,9–1,6 s; solo saltable en el modo tele | también a solas, o 0,15 s al tocar |

Comprobado con Playwright sobre bowling-flick: sin tocar, la espera baja de 1,400 a 1,317 (cuenta
normal); tocando, salta a 0,300 y termina. Repasados y **dejados como estaban** por ser correctos:
tenis y pádel (el saque ya espera a que pulses tú), baloncesto (no tiene descanso: la bola siguiente
sale al momento), fútbol de plaza y balón prisionero (el saque de centro es inmediato), golf,
carreras y motocross (no hay parón entre intentos).

## 3. Sensibilidad del dedo

Todos los juegos que se llevan con el dedo usan un seguimiento suavizado
`pos += (dedo - pos) · min(1, dt·K)`. K manda: cuanto más bajo, más blando y más tarde llega la pala.
Estaban puestos cuando los juegos se probaban en el ordenador con ratón; con el dedo se notaban
pastosos. Medido como el tiempo en cubrir el 95 % de la distancia al dedo:

| Juego | K antes → después | Retardo antes → después |
|---|---|---|
| Ping pong, frontón, air hockey | 25 → 38 | 120 → 79 ms |
| Ping pong a cuatro | 22 → 34 | 136 → 88 ms |
| Brick Breaker | 20 → 34 | 150 → 88 ms |
| Neon Paddle | 22 → 34 | 136 → 88 ms |
| Invasores y Starfall (nave) | 14 → 24 | 214 → 125 ms |
| Invasores a dúo | 12 → 22 | 250 → 136 ms |

No se pasa a seguimiento directo (K infinito) a propósito: sin suavizado, el dedo tapa la pala y
cualquier temblor se traslada tal cual. 80–130 ms es la banda en la que el control se siente
inmediato sin volverse nervioso.

**Decisión**: esto hace los seis juegos algo más fáciles, en la misma dirección que la rebaja de
dificultad de 1.23. No se retoca ninguna otra constante de dificultad para compensar.

## 4. Lo que queda fuera

- Los parpadeos por reloj de pared siguen su curso durante la pausa y un anuncio: cuando se vuelve,
  la fase del parpadeo ha saltado. Es cosmético y la pantalla está congelada mientras tanto.
- No se ha medido en una Smart TV real: los 25 fps del banco de pruebas son Playwright con el freno
  de CPU a ×6.
