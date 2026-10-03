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

## Depuración
Con `#debug` en la dirección: `DS.warp(0..3)`, `DS.toArena()`, `DS.hitBoss(n)`,
`DS.god()`, `DS.s`, `DS.sheets`.
