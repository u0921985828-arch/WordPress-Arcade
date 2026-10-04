# Dub Siege

Juego de plataformas y disparos en un solo fichero (`dub-siege.html`): no pide
nada a servidores de terceros (la tipografía Press Start 2P va incrustada) y no
depende de ninguna librería.

## Lienzo ×4
El mundo lógico mide de **160 a 264 de ancho por 90–108 de alto** según la
pantalla (en horizontal ocupa todo el alto y los controles flotan sobre los
bordes); el lienzo real es ese tamaño ×4 y `draw()` aplica la escala una sola
vez (`SC = 4`). Física, colisiones y cajas
no cambian: lo único que cambia es que un píxel lógico se pinta como un bloque
de 4×4 píxeles reales, así que los sprites de imagen entran **1:1, sin pérdida**.

## Siempre en horizontal
En un móvil o tableta en vertical la página **se gira 90° por CSS**: `<html>`
lleva la clase `rot` y el `body` pasa a medir `innerHeight × innerWidth` con
`translateX(--rx) rotate(90deg)` (el desplazamiento se redondea al píxel real
para no emborronar con densidades como 2,625). Se juega con el móvil tumbado
hacia la izquierda. Solo gira si la **pantalla** está en vertical (una ventana alta en
pantalla partida no gira) y no se deshace al abrir el teclado. Por eso en el CSS no hay `vw`/`vh`, `env(safe-area-*)` ni
`@media` de orientación o tamaño: se usan `var(--vw)`/`var(--vh)`,
`--sal/--sar/--sat/--sab` y las clases `vp`/`vl`/`h600`/`h430`/`w480`, que
calcula el script del `<head>` (sin girar copian a `matchMedia` tal cual). En
JS, toda medida de pantalla pasa por `VW()`/`VH()`, `vrect(el)` y `vpt(evento)`.

Arranque: en táctil sale **TOCA PARA EMPEZAR**; ese toque enciende el audio,
pide pantalla completa y `screen.orientation.lock('landscape')` (Android). Si
el navegador no da pantalla completa (iPhone) no sale y queda el giro por CSS.
Salir de pantalla completa en partida la pausa. Con `#debug` no sale, salvo con
`?gate#debug`.

## Capa de sprites
Las hojas viajan como `data:` URI en varios `<script>LD({...},pct)</script>`
pequeños **antes** del juego (entre `<!-- <ARTDATA> -->`); cada trozo rellena
`window.DSA` y avanza la barra de la pantalla de carga (`#ld`), que se pinta en
cuanto llega el HTML y se quita al abrir el menú. `ART` (entre `/* <ART> */`)
es `window.DSA`. `blit(hoja, fotograma, x, y, w, h, voltear, blanco, alfa)` pinta
sobre la caja lógica, centrado en X y apoyado abajo. **Si una hoja falta o no
carga, el juego sigue dibujando por código** (`spr()` y `rect()` no se borran).

## Rehacer el arte
```bash
PIXELLAB_TOKEN=... python3 tools/fetch_art.py   # baja las hojas a art/
python3 tools/inline_art.py                     # las mete en el HTML
```
`inline_art.py` guarda cada hoja en el formato **sin pérdida** que menos ocupa
(WebP sin pérdida, PNG original u optimizado con oxipng) y comprueba píxel a
píxel que decodifica igual: 907 KB de PNG → 324 KB, fichero de 1,40 MB → 0,59 MB.
`art/manifest.json` dice, por cada hoja, el objeto de PixelLab, la animación, el
tamaño **lógico** del fotograma y cuántos fotogramas tiene. El token nunca se
guarda en el repositorio.

## Fases e historia

Mundo, personajes y Archivo de 12 cintas (una por jefe, menú ARCHIVO, `ds2_lore`): ver `LORE.md`. Nombres 100 % inventados, sin parecido con nombres reales.
`LEVELS` tiene **12 fases** repartidas por las 4 zonas de `STAGES` (`r` = zona,
que fija fondo, losetas y música). Cada una declara su longitud por tramos
(`len`, con punto de control entre tramos), los tramos obligados (`must`, p. ej.
los de bidones `x1`–`x3`), la dureza (`tier`) y su jefe: `ai` 0–3 son los cuatro
jefes de siempre (`mk:1` = versión roja y más dura), `ai:4` convierte un enemigo
normal en jefe (`mt` = tipo, `sc` = escala entera). La dificultad interna
`st.d` va de 0 a 3 a lo largo de las 12.

**Bidones rojos** (`X` en los tramos): dos impactos y revientan con `explode()`,
que daña a enemigos, jefe y también al jugador si está cerca. Las explosiones
(`boom()`) son bola de fuego, onda de choque y humo, todo con píxel cuadrado.

**Cinemáticas**: cada fase lleva `cut:{pre,cp,boss,post}`, listas de líneas
`{w:'MAMA'|'SELECTA'|'FLUX'|'BOMBO'|'ROSA'|'CENSOR'|'BOSS', s:'TEXTO', f:'n'|'a'|'h'|'s'|'t'|'r', e:'boom'|'booms'|'alarm'|'shake'|'flash', x:'static'|'tape'}`
(sin `w` habla el narrador y el texto ocupa todo el ancho). 127 líneas en total.
Salen al empezar la fase, en el primer punto de control, al aparecer el jefe y
al ganarle (la de la fase 12 es el final). La escena de entrada abre con una
**ilustración de la fase** (`il_01..12`, 160×90 a escala entera y centrada, con
el nombre de la fase y «toca para seguir»). Avanza con salto/disparo, Intro o un
toque, y se salta entera con Esc, Start o tocando SALTAR. Cada escena sale una
vez por partida (reintentar no la repite).

**Retratos** (`POR` en el código): busto de 48×56 por personaje (`po_*`, hojas a
1× con `x1`), con 3 caras cada uno —`n` normal más dos de su carácter
(`a` alerta, `h` contenta, `s` seria, `t` triste, `r` furia)— y boca que se mueve
mientras escribe (fotograma +1). El de Selecta se tiñe con la piel y la sudadera
elegidas (`lookPor`). `x:'static'` mete ruido de radio y `x:'tape'` tono cálido y
una cinta girando (las grabaciones del Viejo Bombo). El jefe habla con su propio
sprite de juego a escala entera dentro del marco.

Textos en mayúsculas con tildes, eñes y signos de apertura (¿ ¡). La fuente
incrustada es un subconjunto de Press Start 2P (2,6 KB) con las mayúsculas
acentuadas redibujadas a altura completa y la tilde en una fila encima; pide un
paso de línea de 9 px o más (10 si hay Ñ). Las claves de `w:` siguen sin tilde
(`'MAMA'`).

El menú guarda la fase más alta alcanzada por dificultad (`ds2_prog`) y ofrece
**CONTINUAR FASE N** (empieza con 30 discos por fase saltada).

## Controles táctiles
Tres botones: BASS, FUEGO y **SALTO/DASH**. En el botón doble, un toque corto
(soltar antes de `JD_MS` = 150 ms) salta —se mantiene pulsado `JD_HOLD`
fotogramas por dentro para que salga el salto completo— y mantenerlo hace el
dash. Teclado y mando siguen con sus teclas separadas.

Colocación: `placePad()` pone SALTO (×1,2 de tamaño) en el arco cómodo del
pulgar —32–48 mm de su base, que se supone 5 mm fuera de la esquina inferior— y
FUEGO y BASS en el mismo arco a su lado, sin tapar nunca el lienzo. Toda la
columna derecha responde (`padPick`: gana el botón más cercano, SALTO con 14 px
de ventaja). Estudio y cifras: `ESTUDIO-CONTROLES.md`.

## Depuración
Con `#debug` en la dirección: `DS.warp(0..11, conCinematica)`, `DS.cutAdv()`,
`DS.cutSkip()`, `DS.toArena()`, `DS.hitBoss(n)`, `DS.god()`, `DS.s`, `DS.sheets`.
