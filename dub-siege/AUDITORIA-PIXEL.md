# Dub Siege — auditoría técnica de pixel art

Revisión hecha con la vara de un estudio de pixel art clásico (16/32 bits) y de
ergonomía de tableta. Todo lo que sigue está **medido**, no opinado: al lado de
cada punto va el número y cómo se obtuvo.

Veredicto corto: **el juego funciona bien y se siente bien; lo que no es, es
pixel art.** Es una ilustración de alta resolución mostrada pequeña. Hay cuatro
fallos de base (A, B, C, D) que cualquiera del oficio ve en dos segundos, y que
son justo los que hacen que algo «parezca de verdad» o no.

---

## A. No hay paleta. Hay 1.295 colores

Medido con PIL sobre los 27 PNG de `art/`, y sobre capturas reales del juego.

| | colores |
|---|---|
| Colores opacos distintos en todo el juego | **1.295** |
| Un solo fotograma de carrera del héroe | 58 |
| Hoja del jefe 2 (`b_2.png`) | 106 |
| En pantalla, fase 1 | **3.400** |
| En pantalla, fase 4 | **7.004** |

Referencia del oficio: una Mega Drive ponía **61 colores en pantalla**, una
Super Nintendo 256. Metal Slug, que es el techo del dibujo a mano, trabajaba
con paletas de 16 colores por sprite.

Qué provoca, en concreto:

1. **Nada pertenece al mismo mundo.** El héroe, los enemigos y los jefes no
   comparten ni un solo tono. Cada hoja la generó la IA por su cuenta con su
   propia iluminación, así que el verde del héroe no es pariente de ningún
   verde del escenario. Por eso el conjunto «no cuaja» aunque cada pieza suelta
   esté bien.
2. **No hay lectura de materiales.** Con 100 colores por sprite el degradado es
   continuo: no se distingue metal de tela de piel, porque el ojo distingue
   materiales por *saltos* de tono, no por suavidad.
3. **El tinte de fase no manda.** Puse un tinte plano por hora del día; con
   1.295 colores debajo, el tinte apenas se nota. Con 32 colores, el mismo
   tinte reencuadraría la escena entera.

**Arreglo**: paleta maestra de 32–48 colores para todo el juego (p. ej. rampas
de 4 tonos: piel, tela, metal, neón, piedra, cielo) y cuantizar las 27 hojas
contra ella una sola vez, en el script de empaquetado. Es automatizable y no
toca el motor.

---

## B. Dos tamaños de píxel en la misma pantalla

Es el error cardinal del oficio, y aquí está medido.

- `manifest.json` declara el héroe como `fw:12, fh:14`.
- El PNG real son **48×56** px, y la prueba de rejilla dice que su detalle está
  a **×1**, no a ×4: solo el 53 % de los bloques de 4×4 son de un color.
- `blit()` dibuja esos 48×56 dentro de una caja lógica de 12×14 que luego se
  escala por `SC=4`. Resultado en pantalla: **1 píxel del sprite = 1 píxel de
  pantalla**.
- Todo lo dibujado por código (`spr()`, baldosas, balas, HUD) usa
  `fillRect(x, y, 1, 1)` en coordenadas lógicas: **1 píxel = 4 de pantalla**.

O sea: el personaje tiene un píxel cuatro veces más fino que el suelo que pisa.
Está en `ds/AUD-mezcla.png` (recorte ampliado de una captura real): el héroe
tiene detalle de aguja y la baldosa de debajo son ladrillos de 4×4.

`ds/AUD-rejilla.png` es la otra mitad de la prueba: a la izquierda el sprite tal
cual; a la derecha, el mismo sprite reducido a los 12×14 que el manifiesto dice
que son. Se ve que no hay nada que recuperar ahí: el dibujo **es** de 48×56.

**Arreglo**, y hay que elegir uno, no los dos:

- **B1 (barato, recomendado)**: aceptar que el juego es de 48×56 por personaje
  y subir el resto a esa finura — es decir, `SC=1` y una ventana lógica de
  768×432, con las baldosas redibujadas a 48 px. El arte ya está hecho; lo que
  cambia es el mundo.
- **B2 (fiel al 16 bits)**: regenerar las hojas a 12×14 de verdad. Significa
  rehacer los 27 PNG y perder todo el detalle de cara, cascos y pantalones.

Mientras no se elija una, el juego seguirá dando la sensación de «sprite pegado
encima de un fondo», que es exactamente lo que es ahora.

---

## C. Ni un solo tamaño de pantalla escala con número entero

Medido con Playwright en siete resoluciones:

| Pantalla | lienzo | CSS | escala | entera |
|---|---|---|---|---|
| 1920×1080 | 768×432 | 1888×1062 | ×2,458 | **no** |
| 1366×768 | 768×432 | 1334×750 | ×1,737 | **no** |
| 1280×720 | 768×432 | 1248×702 | ×1,625 | **no** |
| 915×412 | 960×432 | 880×396 | ×0,917 | **no** |
| 844×390 | 936×432 | 810×374 | ×0,866 | **no** |
| 390×844 | 768×432 | 358×201 | ×0,466 | **no** |

Un píxel de ×2,458 no existe: el navegador lo reparte en unos de 2 y otros de
3. Por eso las líneas rectas del juego salen con dientes irregulares y el texto
de 8 px baila. Es el motivo por el que todo emulador decente ofrece «entero» y
por el que Celeste o Dead Cells recortan barras antes que estirar a medias.

Peor: en los dos tamaños de móvil **se reduce por debajo de 1:1** (×0,866 y
×0,466). Ahí no es que el píxel sea desigual, es que se están **tirando**
píxeles del original. En vertical (390×844) el juego se dibuja a 358 px de
ancho sobre un lienzo de 768: se pierde más de la mitad del detalle por el que
se pagó.

`fitPx()` ya detecta el caso y pasa a `imageRendering:auto` (interpolado) para
que al menos no sea un aliasing seco, pero eso convierte el pixel art en
borrón.

**Arreglo**: elegir el lienzo *a partir* de la pantalla, no al revés. Calcular
el entero `k = floor(min(anchoCSS/Wmin, altoCSS/H))`, fijar `k>=1`, y entonces
escoger `W = floor(anchoCSS/k)` redondeado a par. Así la escala es siempre
entera y la ventana lógica se adapta, que es justo lo que `fitW()` ya hace a
medias. Con eso 1920×1080 daría ×4 con ventana 472×265, y 390×844 daría ×1 con
el juego a tamaño nativo.

---

## D. La cámara va en coma flotante y cada cosa redondea por su cuenta

- `cam += (tgt-cam)*0.1` → `cam` es decimal.
- Las baldosas se dibujan en `Math.round(cx*T - cam)`.
- El héroe se dibuja en `Math.round(p.x - cam + ...)`.

Cada elemento redondea **independientemente** del mismo `cam` decimal. Cuando
`cam` cae en .5, uno redondea arriba y el otro abajo: la distancia entre el
héroe y la baldosa que pisa oscila 1 píxel de fotograma a fotograma. Es el
*pixel crawl* clásico — se percibe como que el personaje «patina» o «hierve»
sobre el suelo aunque esté quieto.

Además:

- El paralaje del fondo (`bgArt`) pasa `-off` decimal directo a `drawImage`, sin
  redondear: el fondo se desliza en subpíxel.
- `rect()` redondea `x` e `y` pero **no** `w` ni `h`, así que un rectángulo de
  ancho 5,5 sale con el borde derecho difuminado aunque el suavizado esté
  apagado.
- Hay un `g.arc()` con `lineWidth 4` para la onda del bajo: un círculo vectorial
  antialias en mitad de un juego de píxeles.

**Arreglo**: una sola línea. Redondear la cámara una vez (`var camI =
Math.round(cam)`) y que **todo** el mundo use `camI`. Redondear `off` en el
paralaje y `w`/`h` en `rect()`. El círculo del bajo, dibujarlo con el mismo
tramado de Bresenham que ya usa la luz.

---

## E. Animaciones que están pagadas y no se ven

`p_idle.png` tiene **5 fotogramas** (240×56 px). No se ve ninguno salvo el
primero:

```js
p.anim = p.vx ? p.anim + Math.abs(p.vx)*.11 : 0;   // línea 553
var pst = ... (p.vx ? 'run' : 'idle');             // línea 1323
blit('p_'+pst, p.anim|0, ...)                      // línea 1324
```

El estado `idle` solo ocurre cuando `p.vx === 0`, y en ese caso exacto `p.anim`
se pone a 0. **La animación de respiración nunca se reproduce.** El héroe es una
estatua cuando no corre, que es casi la mitad del tiempo de juego. Cuatro
quintas partes de esa hoja son peso muerto en el HTML.

Es, además, el fotograma que más vende un personaje: la respiración y el
parpadeo son lo que hace que parezca vivo en vez de pegado.

**Arreglo**: un contador propio para reposo, `p.idleT++` y
`blit('p_idle', (p.idleT/10)|0, ...)`.

Lo mismo hay que revisar en `i_coin` (4 fotogramas de giro) y en los enemigos.

---

## F. Lo que está bien, y no es poco

Para que quede claro qué no hay que tocar:

- **Tacto.** `coyote = 6` fotogramas, buffer de salto `7`, doble salto con
  impulso menor (−3,95 frente a −4,45), dash con 12 fotogramas de
  invulnerabilidad, *hitstop* en golpe (2), daño (5), bajo (6) y muerte de jefe
  (10), sacudida proporcional y destello de color por tipo de suceso. Eso es
  trabajo de alguien que sabe lo que hace; está a la altura de un juego
  comercial.
- **Paso fijo.** `while (acc >= 16.67) update()` — la física no depende de los
  fotogramas. Correcto.
- **Rendimiento.** Medido a 844×390: 60 fps limpios sin freno; con freno de CPU
  ×6 (que imita un móvil barato) 40 fps, mediana de 16,8 ms y peor caso 50 ms.
  No hay nada que optimizar aquí.
- **Luz.** El tramado ordenado de Bayer 4×4 con 11 bandas es la técnica
  correcta, y el disco de luz va cacheado. Bien.
- **Sonido.** Sintetizado por WebAudio, sin ficheros. Correcto para el proyecto.
- **Responsive.** Auditado en 6 tamaños × 6 pantallas: 0 desbordes, 0 errores de
  consola, los mandos nunca tapan el juego.

---

## Orden de ataque sugerido

Por relación entre lo que cuesta y lo que se nota:

1. **D — redondear la cámara.** Una tarde. Quita el hervor del suelo, que es el
   defecto que más delata a un juego aficionado.
2. **C — escala entera.** Una tarde. Es lo que hace que las líneas dejen de
   tener dientes desiguales en la pantalla del usuario.
3. **E — animación de reposo.** Una hora. Arte ya pagado que ahora mismo no se
   ve.
4. **A — paleta maestra de 32–48 colores.** Un día, automatizable en
   `tools/`. Es lo que convierte 27 dibujos sueltos en un juego.
5. **B — unificar el tamaño de píxel.** Es el cambio grande y hay que decidirlo
   antes de encargar más arte, porque condiciona todo lo que falte por generar
   (balas, explosiones, baldosas, banderas).

El punto 5 es una decisión de dirección, no técnica: o el juego es de 48×56 por
personaje y hay que subir el mundo a esa finura, o es de 12×14 y hay que
rehacer las hojas. Ahora mismo es las dos cosas a la vez, y eso no existe.
