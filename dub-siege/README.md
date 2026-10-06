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

Mundo, personajes y Archivo de 12 cintas (una por jefe, menú ARCHIVO, `ds2_lore`): ver `LORE.md`. Ambientado en lugares reales: Londres en mayo de 1981 (Brixton, Peckham, Notting Hill, Harlesden, County Hall…) y, en las cintas, Kingston en los cincuenta. Tono adulto (policía, política, racismo, rivalidad entre sounds). Personajes inventados y comprobados contra nombres reales (cifras en `LORE.md`); ninguna persona real.
`LEVELS` tiene **12 fases** repartidas por las 4 zonas de `STAGES` (`r` = zona,
que fija fondo y losetas; cada fase tiñe el fondo con su luz y su clima, `BGT`,
y lleva su propia canción). En la arena final (el sound clash de County Hall) `clashTowers()` monta los dos sounds como son de verdad: cada uno con su pared de cajas (scoops de bajo abajo, medios y bocinas arriba; `s_bestia`, `s_censor`) y su torre de control (previo, eco, cruce y etapas en un mueble, con el plato encima; `t_bestia`, `t_censor`). Como en la ilustración de la fase 12, las paredes son lo grande (la Bestia, 34×54: cajas de madera desparejadas con conos cian y la nevera vieja abajo; la del Censor, 39×60: bloques negros con tiras de leds rojos) y van en los extremos; las torres, más bajas, delante de su borde. Son sprites de PixelLab con dos fotogramas, encendido y apagado: la Bestia está apagada hasta que cae el Censor y el del Censor se apaga con chispas cuando se calla. El mapa sale de `SEQ` (abajo); `len`, `must` y
`tier` son restos del generador aleatorio anterior y ya no se usan. Cada fase
declara su jefe: `ai` 0–3 son los cuatro
jefes de siempre (`mk:1` = versión roja y más dura), `ai:4` convierte un enemigo
normal en jefe (`mt` = tipo, `sc` = escala entera). La dificultad interna
`st.d` va de 0 a 3 a lo largo de las 12.

**Mapas escritos a mano**: `CH` (trozos de 15 filas, alineados abajo) y `SEQ`
(la tira de trozos de cada fase; `buildStage` le añade `box` y `arena`). Sin
azar: la misma fase es siempre el mismo mapa. Leyenda: `#` sólido, `=`
plataforma de un sentido, `^` pinchos, `!` muro de ruido (solo lo cruza el
dash), `o` disco, `+` vida, `K` punto de control, `M` plataforma que va y viene,
`V` ascensor (sube 6 casillas desde el suelo), `T` aviso de tren (a los 100
fotogramas entra un tren por la derecha; hay que subirse a algo), y enemigos
`w h f t s b X *`. Verificado por script (física real del juego vía `#debug`):
todas las fases se recorren de la salida a la arena, ningún bloque ni decorado
flota y ningún enemigo está sobre el vacío.

**Evolución de los enemigos** (`EV`, la fija `evo(i)` al construir la fase):
cada tipo gana tácticas según avanza el juego y cada una se anuncia con «!» o
un destello. Andarín: embiste desde la 4, salta obstáculos desde la 7.
Saltarín: espera menos cada fase, apunta desde la 5, onda al caer desde la 9.
Mosca: picado más largo y disparo desde la 6. Torreta: cadencia por fase,
ráfaga de 2 desde la 5, abanico de 3 desde la 9. Escudo: disparo bajo desde la
7, giro rápido desde la 9. Bombardero: bombas de dos en dos desde la 8, más
rápidas desde la 10. Jefes: espera entre ataques ÷ (1 + 0,025·fase).

**Estilo de cada fase** (`era` en `LEVELS`): el juego recorre el reggae de
las raíces (R&B de patio, 1955) a 1981 (rub-a-dub). El estilo sale en el
rótulo de entrada, en el Archivo y en la música; tabla en `LORE.md`.

**Bidones rojos** (`X` en los tramos): dos impactos y revientan con `explode()`,
que daña a enemigos, jefe y también al jugador si está cerca. Las explosiones
(`boom()`) son bola de fuego, onda de choque y humo, todo con píxel cuadrado.

**Cinemáticas**: cada fase lleva `cut:{pre,cp,boss,post}`, listas de líneas
`{w:'MAMA'|'SELECTA'|'FLUX'|'BOMBO'|'ROSA'|'CENSOR'|'COMIS'|'GOBER'|'BOSS', s:'TEXTO', f:'n'|'a'|'h'|'s'|'t'|'r', e:'boom'|'booms'|'alarm'|'shake'|'flash', x:'static'|'tape', i:'il_*'}`
(sin `w` habla el narrador y el texto ocupa todo el ancho). 195 líneas en total.
Las claves de `w` son las de siempre aunque los personajes se llamen distinto (`MAMA` es Queen Odessa, `FLUX` Ranking Pepper, `BOMBO` Count Ephraim, `ROSA` Miss Hyacinth, `CENSOR` Leopold Dunmore, `COMIS` el inspector Brannock y `GOBER` el concejal Hargreaves).
**Cursiva**: una expresión en patwa va entre asteriscos en `s` (`'¡*BIG UP*, SELECTA!'`). Al cargar se quitan, `l.s` queda limpio y `l.m` guarda la máscara letra a letra; `txtM()` pinta cada tramo y `txtI()` hace la cursiva por bandas de filas (2, 1 y 0 píxeles), con los cortes en píxeles enteros del lienzo. Solo en el diálogo, no en las cintas.
Una línea con `i` (lámina de 160×90, hoy `il_redada`, `il_mitin` e `il_cola`) se
pinta sin busto si la lámina ha cargado (si no, sale el busto de siempre): la
lámina a escala 1, centrada sobre negro y apoyada en la caja de texto, que se
ajusta a las líneas que ocupa. La lámina pierde como mucho 12 filas de cielo:
si la caja es más alta (pantallas 16:9), la lámina baja, su suelo queda detrás
de la caja y la caja se vuelve translúcida (78 %) para que se siga viendo. El
efecto de `x` va entonces sobre la lámina. El texto se vuelve a partir si cambia
el ancho: la escena que salta en plena partida se pinta un fotograma con el HUD
de juego antes de pasar al de escena.
Salen al empezar la fase, en el primer punto de control, al aparecer el jefe y
al ganarle (la de la fase 12 es el final). La escena de entrada abre con una
**ilustración de la fase** (`il_01..12`, 160×90 a escala entera y centrada, con
el nombre de la fase y «toca para seguir»). Avanza con salto/disparo, Intro o un
toque, y se salta entera con Esc, Start o tocando SALTAR. Cada escena sale una
vez por partida (reintentar no la repite). En el Archivo, cada cinta enseña la
lámina de su fase (`il_NN`) salvo que traiga otra como tercer elemento
(`LORE[i][2]`): las cintas 5 y 7 usan las de Babilonia (la cola y el mitin).

**Iniciales del récord**: tres letras de recreativa con ▲/▼ (A–Z y 0–9), sin
teclado del sistema (con la pantalla girada por CSS saldría de lado y tapando el
campo). Con teclado físico se escribe directamente; Retroceso vuelve a la letra
anterior. Se recuerdan en `ds2_tag`.

**Retratos** (`POR` en el código): busto de 48×56 por personaje (`po_*`, hojas a
1× con `x1`), con 3 caras cada uno —`n` normal más dos de su carácter
(`a` alerta, `h` contenta, `s` seria, `t` triste, `r` furia)— y boca que se mueve
mientras escribe (fotograma +1; todos menos el Censor, `o:0`). Las dos caras de
Babilonia (ver `LORE.md`) tienen las suyas retocadas a mano: el inspector Brannock
(`COMIS`: `n`, `a` grita una orden, `s` sonrisa burlona) y el concejal Hargreaves
(`GOBER`: `n`, `h` sonrisa de cartel, `r` se le cae la careta). Sus rótulos
largos («INSPECTOR BRANNOCK», «CONCEJAL HARGREAVES») pasan a la forma corta de `s`
(«BRANNOCK», «HARGREAVES») cuando llegarían al «>» del busto, como con W=160 (la escena
a pantalla completa en 16:9). El de Selecta se tiñe con la piel y la sudadera
elegidas (`lookPor`). `x:'static'` mete ruido de radio y `x:'tape'` tono cálido y
una cinta girando (las grabaciones de Count Ephraim). El jefe habla con su propio
sprite de juego a escala entera, como mínimo ×2 (un busto); si no cabe de alto se
apoya arriba (cabeza y torso) y el marco recorta el resto.

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

## Música
Toda la banda sonora se **genera en el propio juego** (Web Audio, sin ficheros de
audio): **doce canciones originales, una por fase y por estilo del reggae**,
de las raíces a 1981 (`SONGS[n]`, `songIdx = n` en `buildStage`): R&B de patio
(138 bpm, shuffle de piano boogie), shuffle jamaicano (152), nyabinghi (76, tres
tambores de mano sin batería), ska (172), rocksteady (84, bombo en el 3), early
reggae (150, órgano *bubble* con swing), roots (144, one drop), dub (136, forma
ADBD con cortes y sirenas), rockers (150, charles abierto), steppers (156, bombo
en cada negra), lovers rock (140, acordes maj7) y rub-a-dub (148, riddim
desnudo). Ninguna pareja de fases seguidas repite el patrón de bombo, caja y
charles. Ni melodías ni progresiones reales. Escritas como cadenas de un carácter por semicorchea
(`NA`: `'0'` = tónica, `'c'` = octava arriba, `'Z'` = semitono abajo; `-` alarga,
`.` silencio) y acordes por compás (`CQ`: `m`, `M`, `d` séptima de dominante,
`n` menor séptima, `j` mayor séptima).

- **Capas** (hasta 17): bombo, caja, aro, platos cerrados y abiertos, shaker,
  congas, toms, platos y plato al revés, golpe sintético, bajo, guitarra
  (*skank*, cuerda pulsada Karplus-Strong doblada a 13 ms al otro lado),
  órgano, melódica, metales a tres voces, colchón y sirena. Los golpes se
  sintetizan una vez en `AudioBuffer` (`MZJ`, cola `mzWork` con presupuesto de
  2,5 ms por llamada en partida y fundidos de entrada y salida) y las voces
  continuas son osciladores fijos con envolventes (`mzOn`), que se desenchufan
  solos tras 0,8 s callados.
- **Arreglo**: grupo según el momento (`C` calma en menús, `P` partida, `X`
  jefe) e intensidad 1–4 según el multiplicador; forma `ABAD` en partida,
  donde `D` es la sección *dub* (se quita la batería y se cierra el filtro de
  instrumentos, que se reabre en la segunda mitad). Redobles al final de cada
  frase, plato al revés que entra con la sección siguiente, tiros de eco en la
  caja y los metales armonizan dentro del acorde (`mzHarm`).
- **Mesa** (`mzStrip`): cada capa con su volumen, panorama y envíos a un eco
  de cinta ping-pong (filtros y saturación dentro del lazo, a 3 semicorcheas) y
  a un muelle (convolución con respuesta sintetizada). Grupos de batería,
  instrumentos y bajo (que se aparta del bombo), y salida con compresor y
  recorte suave. La pausa apaga y filtra la música; el silencio (`setMute`)
  suspende el audio entero.
- **Medido con las 12** (render sin conexión): todas las secciones a ±1,8 dB de
  la media de las 4 anteriores, pico −9,3 dBFS, tempo medido = previsto, CPU por
  compás 3,76 ms de media (antes 4,68), cambio de fase y de jefe sin huecos de
  más de 0,10 s. Medidas de la versión anterior de 4 canciones:
- **Medido** (render sin conexión a 44,1 kHz, `#debug`): −25 a −24 LUFS por
  zona (antes −30 a −28), pico real ≤ −10 dB, chasquidos aislados de 145–395
  por minuto a 0–1, estéreo real por encima de 250 Hz (correlación 0,76–0,79; el
  bajo va en el centro a propósito) y los efectos 4 dB por encima de la música.
  Coste: 0,08 ms por llamada al programador y ~3 % del hilo principal con el
  jefe en pantalla.

## Tamaño de la interfaz
OPCIONES → **TAMAÑO DE INTERFAZ**, como la escala de interfaz de Minecraft:
`AUTO`, 50, 60, 70, 80, 90 y 100 % (`SET.ui`, `UIS`).

- **HUD** (vida, puntos, combo, avisos): se dibuja en el lienzo con la escala
  `HS·UIF`. En `AUTO`, `uiFit()` busca que un píxel del HUD mida `VH/240` px
  de pantalla (unos 13 px de letra en un móvil tumbado); con un valor manual,
  `UIF` es ese valor. Antes medía 3,1 px de pantalla por píxel de HUD en
  844×390 y 4,7 en 1280×720; en `AUTO`, 1,6 y 3,0. `HUDR` reserva el hueco
  del botón de pausa a la escala nueva.
- **Cinemáticas** (rótulos, nombre, texto y busto): la misma escala `HS·UIF`
  que el HUD. El busto de 48×56 se pinta a `CUQ = round(SC·UIF)` px de lienzo
  por píxel del dibujo (entero, sin píxeles desiguales) y el texto empieza en
  `cutTx()`, justo a su derecha. A 100 % sale idéntico al de antes; en `AUTO`
  en un móvil tumbado, a la mitad, y las frases caben en 2 líneas.
- **Menús** (paneles HTML): `zoom: var(--ui)`. En `AUTO` se quedan como
  estaban; con valor manual bajan hasta el 80 % (a 50 %).

## Partidas guardadas
Seis ranuras en el propio móvil (`ds2_slots`; `ds2_last` = la última usada).
JUGAR abre **PARTIDAS** (si no hay ninguna, empieza directamente en la 1) y el
menú principal enseña **CONTINUAR** con la última. Cada ranura dice la fase, su
nombre, la dificultad, los puntos y la fecha; tocarla da CONTINUAR, EMPEZAR DE
NUEVO y BORRAR (estos dos piden confirmación, con «NO» seleccionado).
Con una partida guardada, la dificultad de las nuevas se elige en PARTIDAS
(«NUEVAS EN») o en OPCIONES; CONTINUAR usa siempre la de su ranura.

- Se guarda solo (`slotSave`): al empezar cada fase, al pasar a la tienda, al
  comprar y al caer (ya con el castigo de CONTINUAR: mitad de puntos). Al
  ganar, la ranura queda **COMPLETADA**. Lo que pasa dentro de una fase no se
  guarda: es el punto de control.
- Al cargar (`slotLoad`), lo guardado se funde con una partida nueva: un campo
  que falte o venga raro se queda con su valor de salida; una ranura ilegible
  cuenta como vacía (`slotOk`). Si se salió en la tienda, se vuelve a la tienda.
- Las partidas de antes (solo `ds2_prog`) pasan a ranuras la primera vez
  (`slotMig`), con lo que daba el viejo CONTINUAR FASE N.
- El ranking sigue aparte (`ds2_rank`).

## Depuración
Con `#debug` en la dirección: `DS.warp(0..11, conCinematica)`, `DS.cutAdv()`,
`DS.cutSkip()`, `DS.toArena()`, `DS.hitBoss(n)`, `DS.god()`, `DS.s`, `DS.sheets`.

## App Android nativa (Godot 4.7.2)

La app ya no es una webview: es un ejecutable de Godot (`libgodot_android.so`) con
el mismo paquete `online.kuboplay.dubsiege` y la misma clave
(`android/app/kuboplay.keystore`), así que se instala encima de la anterior.
`dub-siege.html` sigue siendo la fuente del juego; Godot ejecuta su traducción.

- **Traducción**: `tools/js2gd.js` convierte el JS del HTML en `godot/game.gd`
  (generado, no se edita). Lo escrito a mano va en `godot/src/*.gd` (base, audio,
  entrada, arte, menús, arranque) y el runtime que imita al navegador en
  `godot/rt/` (lienzo 2D `ctx.gd`, `imgctx.gd`, DOM y CSS de los menús
  `dom*.gd`/`html.gd`/`ui_*.gd`, mandos táctiles `touch_pad.gd`, música
  `audio_director.gd`). Ajustes del traductor en `tools/js2gd.json`.
  Regenerar: `node tools/js2gd.js` (necesita `acorn`).
- **Audio**: la música va grabada por capas (`godot/audio/m{0..11}_{C,P1,P2,P3,X}.ogg`,
  calma, juego a 3 intensidades y jefe) y los efectos en `godot/audio/sfx/`.
  Se regraban desde el propio HTML con `tools/rec_audio.py` (Playwright +
  OfflineAudioContext). P1–P3 suenan sincronizadas y cambian en el límite de compás.
- **Pantalla**: el juego pinta en un SubViewport del tamaño del lienzo y se
  escala con zoom entero y filtro nearest (píxel cuadrado). Orientación fija
  en horizontal con sensor (`window/handheld/orientation=4`), como la web.
- **Atrás** (Android) = Esc; dos veces en 1,5 s sale, como antes.
- **Pruebas** (`godot/tests/`, con `godot -- --test=res://godot/tests/X.gd`):
  `run12.gd` (las 12 fases con jefe), `parity.gd` (web y Godot con la misma
  semilla: estado del azar y píxeles), `input_test.gd` (teclado y mando),
  `touch_test.gd` (`--touch --dpr=1.5`), `back_test.gd`, `perf.gd`, `warm.gd`.
  Argumentos útiles: `--warp=N`, `--touch`, `--dpr=N`, `--menu=NOMBRE`,
  `--shot=ruta.png --frames=N`.
- **APK**: `.github/workflows/dub-siege-apk.yml` exporta con Godot 4.7.2
  `DubSiege.apk` (arm64) y `DubSiege-32bit.apk` (armeabi-v7a, móviles antiguos),
  más una copia x86_64 solo para el emulador; comprueba que no llevan webview y
  publica las dos en la descarga fija `dub-siege-apk`. `versionCode` = n.º de
  ejecución + 1000, por encima de la versión webview.
- **Partidas de la versión webview**: la primera vez que se abre (sin
  `user://dub-siege.json`), `WebSaves` (`rt/web_saves.gd`) lee el localStorage
  que dejó el WebView en `app_webview/.../Local Storage/leveldb` — Android lo
  conserva al actualizar porque el paquete y la firma son los mismos — y trae
  las claves `ds2_*` tal cual (registro `.log`, tablas `.ldb` con Snappy, gana
  el número de secuencia más alto, respeta los borrados). Después `slotMig()`
  pasa a ranuras el progreso anterior a ellas, igual que la web. Prueba:
  `websaves_test.gd --webdb=CARPETA --expect=FICHERO.json` con bases creadas
  por Chromium. En CI el emulador instala la app webview antigua con un récord
  (QAX 98765) y progreso, la abre, instala encima la nativa y exige el aviso
  «datos importados de la app anterior» en logcat.
- **Mando físico**: el primer evento de cada mando sale en logcat
  («Dub Siege: mando N …»). En el emulador no se puede probar: Godot descarta
  las pulsaciones inyectadas con `input gamepad` porque no vienen de un mando
  registrado.
