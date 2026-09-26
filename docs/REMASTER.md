# Remaster gráfico: objetivo «esto parece un juego comercial»

El usuario ha visto la subida de 1.30 y sigue viendo los gráficos mediocres. Pide un remaster
exigente, usando **todas las tecnologías disponibles en el navegador**, y que pase por varias
revisiones duras antes de entregarse. Este documento es el contrato de ese trabajo.

Restricciones que NO cambian: todo el arte se genera **por código** (sin imágenes, fuentes ni
recursos de terceros, por copyright) y sin librerías externas. Todo lo demás está sobre la mesa.

## 1. Diagnóstico honesto de por qué aún se ve «plano»
1. **No hay iluminación real.** Las sombras están pintadas a mano en cada sprite; la escena no tiene
   luces. Un juego comercial se ve bien sobre todo por la luz, no por el dibujo.
2. **No hay post-proceso.** Ni bloom, ni gradación de color, ni profundidad de campo, ni grano. Sin
   eso, el canvas siempre parece un dibujo de vectores.
3. **Todo se pinta en el mismo plano.** No hay separación albedo / emisivo / relieve, así que no se
   puede iluminar ni hacer brillar nada de forma selectiva.
4. **La animación es correcta pero no tiene «peso».** Faltan hitstop, anticipación, seguimiento y
   deformación coherentes en todos los juegos (hoy cada motor hace lo que puede).
5. **Sin dirección de color.** Cada motor elige sus colores; no hay una gradación común que una las
   250 pantallas.

## 2. Tecnología: compositor WebGL2 en kit.js (el cambio grande)
El juego **sigue dibujando en canvas 2D** (no se reescriben 80 motores). Lo que cambia es el final
de la tubería: en lugar de enseñar ese lienzo, kit.js lo compone con **WebGL2**.

Capas que produce el motor (todas opcionales salvo la primera):
| Capa | Qué lleva | Quién la escribe |
|---|---|---|
| `albedo` | el dibujo de siempre | todos los motores, sin tocar nada |
| `emissive` | lo que brilla (antorchas, neón, proyectiles, monedas) | `k.glow(...)` |
| `height` | relieve (0 = fondo, 255 = cerca) | `k.relief(...)`, opcional |

Pases del compositor, en orden:
1. **Normales derivadas** del `height` con Sobel en el shader (sin mapas de terceros: se calculan).
2. **Iluminación**: 1 luz direccional (la del brief, arriba-izquierda) + hasta 8 luces puntuales que
   el juego declara con `k.light(x, y, r, color, i)`. Difusa Lambert suave + especular controlado.
3. **Oclusión de contacto** barata a partir del `height` (oscurece las juntas y las bases).
4. **Bloom** en dos pasadas sobre el `emissive` (downsample + blur separable).
5. **Gradación de color** con una LUT 3D generada por código (curvas por región/tema: la Cumbre
   Helada fría y contrastada, el Ocaso Rojo cálido, la Fundición verdosa…).
6. **Acabado**: viñeta, grano muy fino, aberración cromática sutil solo en los bordes, y `tonemap`
   filmico suave para que los colores saturados no se quemen.

Reglas: si no hay WebGL2, se dibuja el `albedo` tal cual (exactamente lo de hoy) y no se nota más
que la falta de brillos. Presupuesto: el compositor entero **≤ 2 ms por frame** en un móvil de gama
media; todos los pases a media resolución salvo el último. Sin dependencias.

## 3. Sensación de juego (juice), centralizada en kit.js
Hoy cada motor improvisa. Pasa a ser común y consistente:
- **Hitstop** de 60–80 ms en los impactos que importan (`k.hitstop(ms)`), con la partida congelada
  pero las partículas vivas.
- **Sacudida de cámara** con curva de caída y tope, orientada al impacto (no aleatoria pura).
- **Squash & stretch** en aterrizajes, saltos e impactos, por defecto en los personajes de `art.js`.
- **Impacto**: destello blanco de 2 frames en el objetivo + partículas orientadas + retroceso.
- **Sonido con variación de tono** (±7 %) para que repetir no canse.
- **Anticipación y seguimiento**: nada aparece o desaparece de golpe; todo entra y sale con curva.
Referencias consultadas: game feel / juice (GameAnalytics, egmatic), normal maps en 2D (GameMaker,
GDQuest), canvas 2D vs WebGL (uMe Group, semisignal).

## 4. Dirección de arte, nivel «comercial»
- **Paleta con intención por región** (las 8 del universo Kuboplay), no colores sueltos por motor.
- **Jerarquía de lectura**: jugador > amenaza > objetivo > decorado > fondo, separados por valor
  (claro/oscuro) antes que por tono. Comprobación obligatoria: captura en blanco y negro; si no se
  distingue la jerarquía, está mal.
- **Coherencia de escala y trazo**: el contorno `#1a1530` tiene el mismo grosor aparente en todos
  los juegos, medido en píxeles de pantalla, no de lienzo.
- **Detalle con propósito**: nada de textura de relleno; el detalle marca bordes, materiales y
  puntos de interés.

## 5. Lentes de revisión (obligatorio pasar TODAS antes de entregar)
Cada lente es una revisión independiente, con capturas, y puede devolver el trabajo:
1. **Director de arte**: silueta, jerarquía, paleta, coherencia entre juegos.
2. **Artista técnico**: presupuesto de frame, cachés, pases del compositor, fugas de memoria.
3. **Animador**: anticipación, seguimiento, peso, ciclos, poses clave legibles.
4. **Diseño de interfaz**: nada se sale ni se solapa en 390×844 y 800×450, contraste AA, tamaño de
   los toques ≥ 44 px.
5. **Accesibilidad**: legible con daltonismo (protanopía/deuteranopía/tritanopía simuladas), la
   información nunca depende solo del color, opción de reducir sacudida y destellos.
6. **QA de juego**: arranca, se juega, se pierde, se repite; en móvil, en horizontal y en la tele.
7. **Rendimiento en gama baja**: 60 fps con CPU ×4 más lenta, sin picos de recolección de basura.

## 6. Fases
- **R1** — compositor WebGL2 en kit.js + `k.glow/k.light/k.relief` + repliegue sin WebGL. Piloto:
  `pixel-dash` y `dungeon-micro`.
- **R2** — capa de juice común en kit.js y adopción en los motores piloto.
- **R3** — gradación de color por región y paletas del universo.
- **R4** — las 7 lentes sobre el piloto; se corrige hasta pasar todas.
- **R5** — despliegue al resto de motores por familias, repitiendo las lentes en cada familia.
