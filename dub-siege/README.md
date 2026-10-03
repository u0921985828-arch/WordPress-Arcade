# Dub Siege

Juego de plataformas y disparos en un solo fichero (`dub-siege.html`): no pide
nada a servidores de terceros (la tipografía Press Start 2P va incrustada) y no
depende de ninguna librería.

## Lienzo ×4
El mundo lógico sigue siendo de **320×180**; el lienzo real es de **1280×720**
y `draw()` aplica la escala una sola vez (`SC = 4`). Física, colisiones y cajas
no cambian: lo único que cambia es que un píxel lógico se pinta como un bloque
de 4×4 píxeles reales, así que los sprites de imagen entran **1:1, sin pérdida**.

## Capa de sprites
`ART` (entre las marcas `/* <ART> */`) es el banco de hojas incrustadas como
`data:` URI. `blit(hoja, fotograma, x, y, w, h, voltear, blanco, alfa)` pinta
sobre la caja lógica, centrado en X y apoyado abajo. **Si una hoja falta o no
carga, el juego sigue dibujando por código** (`spr()` y `rect()` no se borran).

## Rehacer el arte
```bash
PIXELLAB_TOKEN=... python3 tools/fetch_art.py   # baja las hojas a art/
python3 tools/inline_art.py                     # las mete en el HTML
```
`art/manifest.json` dice, por cada hoja, el objeto de PixelLab, la animación, el
tamaño **lógico** del fotograma y cuántos fotogramas tiene. El token nunca se
guarda en el repositorio.

## Fases e historia
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
`{w:'MAMA'|'FLUX'|'SELECTA'|'BOSS'|'CENSOR', s:'TEXTO', e:'boom'|'booms'|'alarm'|'shake'|'flash', x:'static'}`.
Salen al empezar la fase, en el primer punto de control, al aparecer el jefe y
al ganarle (la de la fase 12 es el final). Bandas negras, retrato y texto a
máquina; avanza con salto/disparo, Intro o un toque, y se salta con Esc, Start
o tocando SALTAR. Cada escena sale una vez por partida (reintentar no la repite).
Textos en mayúsculas y sin tildes ni eñes (la tipografía no las trae).

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
