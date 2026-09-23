# Arcade — portal de juegos HTML5 en WordPress

Contexto para Claude Code. **Responde siempre en español, conciso y directo** (el usuario, Eddie, pide economía de tokens: sin preámbulos ni relleno). Trabaja desde el móvil a menudo: instrucciones de despliegue cortas y paso a paso.

## Qué es
Portal de juegos mobile-first en WordPress con **100 juegos propios** (canvas 2D, sin librerías) servidos dentro de un plugin, más un importador opcional de catálogos profesionales (GamePix / GameDistribution). Objetivo: portal diferenciado y de calidad, monetizado con **AdSense**. Escalar a 900+ juegos.

- Web en pruebas: https://myblog-wr1k1xoqsf.live-website.com (WordPress 7.1.2, tema Twenty Twenty-Five, hosting IONOS). Subdominio temporal: **falta dominio propio** y cambiar el título "My Blog".
- Versión actual del plugin: **1.11.0** (`const VERSION` en `wp-content/mu-plugins/arcade-core.php`).
- Despliegue: el usuario **no tiene FTP**. Sube el zip en Plugins → Añadir nuevo → Subir plugin → "Reemplazar actual con el subido". Nombra los zips con versión (`arcade-core-plugin-X.Y.Z.zip`) para que no se confunda.

## Estructura
```
wp-content/mu-plugins/
  arcade-core.php              # Plugin principal (funciona como MU-plugin o plugin normal; sub() detecta la carpeta)
  arcade-core/
    portal.php                 # Arcade_Portal: plantillas propias (portada, ficha, listados, búsqueda, páginas legales), tarjetas, textos
    templates/portal.php       # Plantilla HTML completa (ignora el tema). Diseño oscuro, 1 acento índigo #6e62f5
    importer.php               # Arcade_Importer: Games → Importar catálogo (GamePix/GameDistribution, sin duplicados)
    seo-ads.php                # Arcade_SEO: Ajustes → Arcade (titular LSSI, ID AdSense), páginas legales, /ads.txt, meta/OG/JSON-LD, bloques de anuncio
    social.php                 # Arcade_Social: REST arcade/v1 (play, like, cards), contador de partidas, me gusta
    assets/css/portal.css      # Estilos del portal
    assets/js/arcade-engine.js # Reproductor: iframe perezoso, pantalla completa, orientación, mando virtual, puente de teclas
    assets/js/portal.js        # Favoritos / seguir jugando (localStorage), me gusta, compartir, contador
    games/
      _lib/kit.js              # RUNTIME COMÚN de todos los juegos (fuente de verdad, se edita aquí)
      _lib/tetra.js            # Motor de Tetra Drop (se edita aquí)
      _lib/<motor>.js          # Copias generadas desde src/eng (NO editar aquí)
      <slug>/index.html        # Generado por build_games.py (salvo 5 independientes)
      <slug>/thumb.webp        # Miniatura 400×300 generada por thumbs.py
src/eng/*.js                   # FUENTE de los 46 motores de juego (+ art.js, librería de sprites)
scripts/
  build_games.py               # Mapa slug → (motor, CFG) y generación de games/<slug>/index.html
  generate_wxr.py              # Catálogo de los 100 juegos (CATALOG) y generador del XML WXR
  smoke.py / audit.py          # Pruebas Playwright (errores JS / arranque, animación y respuesta)
  thumbs.py                    # Capturas → miniaturas webp
  package.sh                   # Build + zip instalable en dist/
  test-wp.sh                   # WordPress local con SQLite en http://127.0.0.1:8900 (admin/admin)
arcade_pilot_100.xml           # WXR con los 100 juegos (URLs apuntan a /wp-content/plugins/arcade-core/games/)
```
Juegos **independientes** (no generados, se editan en su propio `index.html` o `_lib/tetra.js`): `serpent-grid` (no usa kit), `neon-paddle`, `rock-belt`, `tetra-drop`, `tetra-drop-marathon`.

## Datos del juego en WordPress
CPT `game`; taxonomías `game_genre` (arcade, puzzle, platformer, strategy-cards, 3d-webgl, sports-casual), `game_tag`, `control_profile`. Metas: `_game_embed_url`, `_game_orientation` (portrait|landscape|auto), `_game_aspect_ratio` (16:9|4:3|1:1|fill), `_game_tech_engine`, `_game_input_methods` (touch,keyboard,mouse,gamepad), `_game_plays`, `_game_likes`, y en importados `_game_source`, `_game_source_id`, `_game_thumb_url`, `_game_howto`. Un juego es "propio/exclusivo" si no tiene `_game_source`. `resolve_embed()` prioriza `games/<slug>/index.html` del plugin.

Si el portal no tiene juegos del menú de ejemplo del tema: la portada es la página "Juegos" (`arcade_home_page_id`) y se pinta con la plantilla propia.

## kit.js (runtime de juegos)
`const k = Kit({ w, h, title, bg })` → canvas lógico escalado (letterbox, DPR). Entrada unificada: `k.held`/`k.hit` (up, down, left, right, a, b, pause), `k.ptr {x,y,down,hit,up,sx,sy}`, `k.swipe`, `k.tap`, mando y puente postMessage del reproductor.
- Estados: `k.st` 'ready'|'play'|'over'; `if (!k.gate(reset)) return;` al inicio del update. `k.lose(id, score, título, extra)` termina partida. `k.show(t, html)` / `k.hide()` overlay (si el texto termina en `<br>Toca para …` se convierte en botón).
- Utilidades: `k.best(id, score)` récord en localStorage, `k.rnd/ri/pick/shuffle/clamp`, dibujo `k.text/rect/rrect/circle/clear`.
- Efectos: `k.sfx('click|pop|coin|jump|shoot|hit|hurt|explode|win|lose|start')` (WebAudio sintetizado, sin archivos), `k.burst(x,y,col,n,vel)`, `k.float(txt,x,y,col)`, `k.shake(n)`, `k.flash(col)`, `k.confetti()`. `navigator.vibrate(ms)` está interceptado: suena y sacude según duración.
- HUD de pausa y sonido integrado (`CFG.hud` = 'bl'|'br'|'tl'|'tr' para moverlo). Pausa automática al cambiar de app. `window.__k` expuesto para pruebas.
- Cada juego lee `window.CFG` (title, id, help, mode, theme, abil…). Las variables de nivel superior de los motores son globales → se inspeccionan desde Playwright con `page.evaluate('nombreVariable')`.

## Arte propio (dirección visual)
- Todo el arte se dibuja por código (sin recursos de terceros → sin problemas de copyright). Estilo **vector cartoon plano con contorno oscuro `#1a1530`**, escala coherente.
- `src/eng/art.js` (objeto `ART`): 8 temas (`meadow, snow, night, castle, factory, dusk, jungle, sky`), fondo con paralaje, casillas cacheadas, héroe animado (idle/run/jump/fall/wall, bufanda, squash & stretch), enemigos (slime, ghost, knight, robot, bird), monedas, banderas, anclas, corazones, decorado. Los motores que lo usan declaran la dependencia en `DEPS` de `build_games.py`.
- Web: sobria, oscura, sin emojis, un acento índigo `#6e62f5`; tipografía del sistema. Pantallas de inicio/pausa/fin de los juegos con el mismo estilo (en kit.js).

## Estado de calidad de los juegos
**Rehechos con arte y mecánicas completas:**
- `platformer.js` (8 juegos laterales: pixel-dash, wall-jumper, blade-leap, castle-knight, robo-rescue, shadow-dash, grapple-hook, rope-swing): T=32 px, física escalada, coyote time, buffer de salto, cámara vertical, punto de control, 8 temas.
- `shooter.js` (pixel-invaders con búnkeres y OVNI; starfall-defender con mejoras, escudo y jefe cada 3 oleadas; bug-garden ciempiés que se divide y araña; bullet-rain jefe de 3 fases).
- `runner.js` (wing-tap troncos y monedas; spike-run pinchos, cajas, fosos y slimes pisables; neon-runner doble salto y fantasmas; gravity-flip suelo/techo; cave-flyer cueva con minas de 2 impactos y cristales). Mundo en coordenadas absolutas (`cam`), coyote time y buffer de salto, animación de muerte antes de `k.lose`.
- `topdown.js` (dungeon-micro, crypt-crawler, slime-arena, zombie-siege, hero-brawl, tank-duel): suelo cacheado por sala, obstáculos 3/4, aparición anunciada, botín (monedas/corazones), jefe cada 5 salas, elección de 1 mejora entre 3 tras cada sala (en dungeon/crypt se sale por la puerta). Tanques con torreta independiente y sacos rompibles.
- `maze.js` (maze-muncher con fantasmas con IA propia y dispersión, casa central, fruta; tunnel-digger con estratos, rocas que caen y aplastan; iso-maze / iso-dungeon-explorer con bloques isométricos cacheados, brújula, antorchas y tajo con espada). Lienzo 480×520 con franja de HUD.
- `raycast.js` (crystal-labyrinth: texturas, cristales con z-buffer, portal, minimapa; farol con aceite como límite), `frog.js` (tortugas que bucean, mosca bonus, 4 vehículos), `gridmover.js` (neon-trails con estelas neón cacheadas; territory con chispas destruibles al encerrarlas). Gridmover 480×520.
- Caché de motores: `?v=` = hash md5 del motor (automático en build_games.py); `kit.js` y `art.js` siguen con `?v=N` manual.
- Todos los motores cargan `art.js` (`deps_of` en build_games.py).

**Pendientes de rehacer (funcionan y están auditados, pero con gráficos simples)**, en este orden acordado:
4. Puzzles y cartas (g2048, match3, nonogram, sokoban, logic, flow, colorsort, lasers, poly, rope, drawphys, cards, mahjong, td, tactics, board, battle, dice): mejor acabado visual (fichas, cartas y tableros con relieve, animaciones de movimiento)
5. Deportes y 3D (road, drone, stack, marble, cube, golf, planet, penalty, bowling, hoop, darts, pool, rhythm, homerun, whack, paddle) y breakout, lander, missile
6. `platform.js` sigue usándose para barrel-climb, ninja-ascent, cloud-hopper, lava-escape (portarlos a arte ART)

## Reglas ya aplicadas (no romper)
Spider 2 palos (104 cartas); FreeCell con supermovimiento (celdas+1)·2^columnas; Klondike robo 1; Pyramid 2 reciclados; TriPeaks con K-A circular; dardos 501 con cierre en doble o bull; ping pong a 11 con 2 de diferencia; air hockey a 7; damas: captura obligatoria, multisalto y la coronación termina el turno; bolos con puntuación oficial de 10 frames; minigolf par 3 y máximo 8 golpes; póker de dados con ranking español; Tetra con bolsa de 7, pieza fantasma y límite de 15 reinicios del bloqueo; Pac-Man sin fantasmas comestibles tras morir; invulnerabilidad al reaparecer en laberintos.
Generadores con **solución garantizada** (verificados por fuerza bruta): sokoban (retroceso), hielo y cubo (BFS), flow (camino hamiltoniano), láseres, mahjong (colocación inversa), luces, 15, tuberías, color sort, tangram (partición).

## Flujo de trabajo
```bash
python3 scripts/build_games.py        # tras editar src/eng o CFG en build_games.py
python3 scripts/smoke.py batch0/6     # (x6 en paralelo: batch0..5) errores JS; cada tanda < 5 min
python3 scripts/audit.py 0/1 <slug…>  # arranque / muere sin tocar / animación / respuesta
python3 scripts/thumbs.py 0/1 <slug…> # regenerar miniaturas tras cambios visuales
bash scripts/test-wp.sh               # WordPress local para probar el portal
bash scripts/package.sh               # zip instalable en dist/
```
- Tras cambiar un motor o kit, **sube la versión de caché** `?v=N` en la plantilla `TPL` de `build_games.py` (y en los 5 independientes) y la `VERSION` del plugin (cabecera y constante).
- Verifica siempre: `node --check`, `php -l`, prueba Playwright del juego tocado, captura visual. "audit: no reacciona" suele ser falso positivo en juegos de tablero: comprueba con jugadas dirigidas.
- Cuidado con gestos rápidos: si `ptr.hit` y `ptr.up` llegan en el mismo frame, trata el arrastre por distancia a `sx/sy` (ya corregido en tangram).
- En este entorno las peticiones HTTPS desde PHP pueden fallar por certificados; en el WP de pruebas se desactiva con un mu-plugin (`https_ssl_verify` false). No hace falta en producción.

## AdSense / legal (pendiente del usuario)
Plugin ya aporta: páginas legales (borradores en Ajustes → Arcade), `/ads.txt`, código de anuncios, bloques "Publicidad" separados del juego, meta/OG/JSON-LD `VideoGame`, textos únicos por juego. Falta por parte del usuario: dominio propio, título del sitio, datos del titular (LSSI), publicar páginas legales, activar el mensaje RGPD (CMP) en AdSense, y solicitar la revisión.

## Ideas futuras de web
Valoraciones, logros entre juegos, "juego del día" rotatorio, listas por etiquetas, página de categorías con destacados, modo oscuro/claro, PWA instalable, traducción de descripciones importadas.
