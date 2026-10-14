# De APK de Godot a plugin de WordPress

> **Para Claude (la otra conversación).** Este documento es tu encargo completo. Con el proyecto Godot que ya compilas a APK, saca la **versión web** del juego y empaquétala como **plugin de WordPress** que se instala subiendo un zip. Sigue los pasos en orden. Las plantillas PHP y JS del final son las del plugin «Landrace Hunters» 1.2.1 de la web kuboplay (probado en su WordPress), con los nombres cambiados por marcadores; el `.htaccess` está revisado aparte. Responde al usuario en español y en corto: no es técnico y trabaja desde el móvil.

## 0. Qué se entrega

- Un zip `{{SLUG}}-1.0.0.zip` que contiene **una carpeta** `{{SLUG}}/`. Si los ficheros van sueltos en la raíz del zip, WordPress no lo reconoce.
- Una vez instalado:
  - El juego está en `https://<dominio>/{{SLUG}}/`.
  - Al primer toque ocupa toda la pantalla (en Android sin la barra del navegador) y se pone en horizontal.
  - En el móvil sale un aviso para **instalarlo como app**: botón «Instalar» en Android, instrucciones de Compartir → «Añadir a pantalla de inicio» en iPhone. Abierto desde ese icono va sin barras.
  - Se puede meter en cualquier página con `[{{ID}}]`.
- No lleva anuncios, no hace peticiones a otros dominios (todo sale del plugin) y no lleva ningún secreto.
- Lo envías con la herramienta de enviar ficheros (límite de 30 MB), junto con el mensaje de instalación del apartado 6.

## 1. Fija los nombres (marcadores)

Elige los marcadores a partir del título del juego. Pregunta al usuario solo si no sabes el título.

| Marcador | Qué es | Formato | Ejemplo |
|---|---|---|---|
| `{{TITULO}}` | Nombre visible | Libre | `Dub Siege` |
| `{{SLUG}}` | Carpeta, fichero principal, dirección web y dominio de texto | minúsculas-con-guiones | `dub-siege` |
| `{{ID}}` | Opción de la base de datos, variable de consulta y atajo | minúsculas_con_guion_bajo | `dub_siege` |
| `{{CLASE}}` | Clase PHP, única en todo WordPress | Palabras_Con_Mayúscula | `Dub_Siege` |
| `{{PRE}}` | Prefijo de los ids CSS y del script | 2–3 letras | `ds` |
| `{{COLOR}}` | Color de acento: flecha de «Gira el móvil» y botón «Instalar» | `#rrggbb` | `#ff6fb5` |

No reutilices `landrace_hunters`, `liga_barrios`, `kuboplay_launcher` ni `arcade`: ya existen en esa web y chocarían.

## 2. Exportar el juego a web desde Godot

**Lo fiable es exportar desde el proyecto**, no desde el APK.

### Paso 1 · Versión y plantillas

1. Ejecuta `godot --version`. Por ejemplo, `4.3.stable.official.77dcf97d8` es la versión `4.3`; en una versión de parche sería `4.7.2`.
2. Si la salida lleva `.mono`, el juego es C#/.NET y **Godot 4 no exporta a web con C#**. No sigas y díselo al usuario.
3. Las plantillas de exportación tienen que ser de esa misma versión exacta: `Godot_v<versión>-stable_export_templates.tpz`, de las versiones publicadas de `godotengine/godot` en GitHub.
4. El `.tpz` es un zip con todo dentro de `templates/`. Extrae solo lo necesario:
   ```
   mkdir -p ~/.local/share/godot/export_templates/<versión>.stable
   unzip -j Godot_v<versión>-stable_export_templates.tpz 'templates/web_nothreads_*' 'templates/version.txt' -d ~/.local/share/godot/export_templates/<versión>.stable/
   ```
   La exportación sin hilos solo usa `web_nothreads_release.zip`.

### Paso 2 · Renderizador

En la web solo existe **Compatibility** (WebGL 2). Desde Godot 4.3 ya se usa ahí por defecto: `rendering/renderer/rendering_method.web` vale `gl_compatibility` sin tocar nada, aunque el proyecto vaya en Forward+ o Mobile en Android.

No cambies el renderizador del proyecto. Comprueba en las capturas que se ve igual: Compatibility no tiene SDFGI, volumétricos ni algunos efectos de Forward+/Mobile.

### Paso 3 · Preajuste Web

Añade el preajuste en `export_presets.cfg`, junto al de Android y sin tocar ese.

Ponle el número siguiente al último que ya haya. Si Android es `[preset.0]`, este es `[preset.1]`; si te saltas un número, Godot no lo lee.

```
[preset.1]
name="Web"
platform="Web"
runnable=false
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter=""
exclude_filter="build/*"
export_path="build/web/index.html"

[preset.1.options]
custom_template/debug=""
custom_template/release=""
variant/extensions_support=false
variant/thread_support=false
vram_texture_compression/for_desktop=true
vram_texture_compression/for_mobile=false
html/export_icon=false
html/custom_html_shell=""
html/head_include=""
html/canvas_resize_policy=2
html/focus_canvas_on_start=true
html/experimental_virtual_keyboard=false
progressive_web_app/enabled=false
progressive_web_app/ensure_cross_origin_isolation_headers=false
```

Por qué está así:

- **`index`:** el ejecutable se tiene que llamar `index`, porque el plugin lee `game/index.html`.
- **`thread_support=false`:** así no hacen falta las cabeceras COOP/COEP, que en un hosting compartido como IONOS no se pueden garantizar. A cambio, `Thread` **no da error pero no hace nada**: `start()` devuelve OK, la función nunca se ejecuta e `is_alive()` se queda en true para siempre. Cualquier espera a un hilo se cuelga sin aviso. `WorkerThreadPool` sí funciona: ejecuta la tarea en el momento, en el mismo hilo.
- **`canvas_resize_policy=2`:** lienzo adaptable; sigue a la ventana al girar el móvil o al entrar en pantalla completa.
- **PWA apagada:** el plugin pone su propio manifiesto. `ensure_cross_origin_isolation_headers` vale `true` por defecto aunque la PWA esté apagada, así que hay que ponerlo a `false` aparte.
- **`vram_texture_compression/for_mobile=true`:** ponlo si el proyecto importa texturas con compresión VRAM; si no, en el móvil salen negras o no cargan. Si todo es pixel art «Lossless», déjalo en `false`.

### Paso 4 · Exportar

Godot no crea la carpeta de destino; si no existe, la exportación falla:

```
mkdir -p <proyecto>/build/web && touch <proyecto>/build/.gdignore
godot --headless --path <proyecto> --export-release "Web" build/web/index.html
```

El `.gdignore` evita que el editor importe lo exportado y lo meta en el `.pck` de la siguiente exportación.

### Paso 5 · Qué ficheros quedarse

De `build/web/` quédate con:

- `index.html`
- `index.js`
- `index.wasm`
- `index.pck`
- **`index.png`**: es la imagen de la pantalla de carga. `index.html` la pide y, si falta, sale un 404 en la consola.
- todos los `index.audio*.worklet.js`: en 4.3 solo `index.audio.worklet.js`; desde 4.4, también `index.audio.position.worklet.js`.

Con las opciones de arriba no se genera nada más. Si aparece algo (`*.service.worker.js`, `*.manifest.json`, `*.offline.html`, `*.icon.png`, `*.apple-touch-icon.png`, `*.144x144.png`…), la PWA o el icono siguen activos: corrige el preajuste.

### Paso 6 · Comprobar index.html

- `GODOT_CONFIG` tiene `"ensureCrossOriginIsolationHeaders": false`, `"canvasResizePolicy": 2` y `"executable": "index"`.
- La etiqueta del viewport termina exactamente en `initial-scale=1.0">`. El plugin le añade `viewport-fit=cover` buscando esa cadena; si tu versión de Godot la escribe distinta, adapta el `str_replace` de `fullscreen()`.
- El `<title>` del fichero da igual: el plugin lo cambia al servir la página. Pero cuando el juego arranca, Godot pone en la pestaña el nombre del proyecto (`application/config/name`), así que **ese nombre tiene que ser `{{TITULO}}`**. El ajuste «Título» del panel solo cuenta para el nombre de la app instalada y mientras carga.

### Si solo hay APK y no hay proyecto (último recurso)

1. **Saca la versión de Godot del APK** y usa **esa** versión para todo (PCKPacker, plantilla web y proyecto vacío):
   ```
   unzip -p juego.apk 'lib/arm64-v8a/libgodot_android.so' | strings | grep -m1 -E '^[0-9]+\.[0-9]+(\.[0-9]+)?\.stable'
   ```
   Los ficheros de `assets/` los importó esa versión, y el formato del `.pck` cambia entre versiones (v2 hasta 4.4, v3 en 4.5, v4 en 4.7).
2. **Empaqueta `assets/` en `index.pck`.** En 4.3/4.4, `assets/` trae los ficheros exportados con su ruta (`assets/.godot/imported/…`, `assets/project.binary`…). Usa `PCKPacker`: `pck_start("index.pck")`, `add_file("res://<ruta dentro de assets/>", <fichero>)` por cada uno y `flush()`.
   - Deja fuera `assets/_cl_` y `assets/assets.sparsepck`.
   - Si los nombres de `assets/` son hashes de 64 caracteres (exportado con «Encrypt directory»), no se puede: pide el proyecto.
3. **Texturas:** las de compresión VRAM del APK solo vienen en ETC2/ASTC. En el móvil cargan, pero en muchos navegadores de ordenador no; dilo en la entrega.
4. **Resto de ficheros:** saca `index.html`, `index.js`, `index.wasm`, `index.png` y el worklet exportando a web un proyecto vacío de esa misma versión con las opciones de arriba, y cambia su `index.pck` por el tuyo.
5. Pon en `fileSizes` el tamaño real del `.pck`. Solo afecta a la barra de carga.
6. Las bibliotecas nativas (`lib/*.so`, GDExtension) no sirven en la web.

### Lo que el código del juego tiene que respetar en la web

- **Solo Android:** anuncios, Play Games, compras y plugins JNI se protegen con `Engine.has_singleton("…")` u `OS.has_feature("android")`. La versión web va **sin anuncios**.
- **Hilos:** si el juego usa `Thread`, en la web llama a la función directamente:
  ```
  if OS.has_feature("nothreads"):
      _trabajo()
  else:
      hilo.start(_trabajo)
  ```
  Nunca esperes con `while hilo.is_alive()`.
- **Salir:** `get_tree().quit()` no cierra la pestaña. Esconde el botón «Salir» si `OS.has_feature("web")`.
- **Guardado:** `user://` funciona y va a IndexedDB del navegador.
  - Es una sola base por dominio, compartida por todos los juegos Godot de esa web, y cada juego guarda en su carpeta según `application/config/name`. Comprueba que el nombre del proyecto (o `application/config/custom_user_dir_name`) no coincide con el de otro juego de la web, por ejemplo Landrace Hunters.
  - Cierra el fichero al guardar (`close()`): Godot lo pasa a IndexedDB en el fotograma siguiente.
  - Guarda en el momento, no en `NOTIFICATION_WM_CLOSE_REQUEST`, que en la web no llega al cerrar la pestaña.
  - En modo privado puede no guardarse nada (`OS.is_userfs_persistent()` devuelve false).
- **Sonido:**
  - El navegador no deja sonar nada hasta el primer toque. Godot lo reanuda solo, pero no pongas audio imprescindible antes de que el jugador toque.
  - En la web Godot reproduce el audio en modo **Sample** (`audio/general/default_playback_type.web`), y en ese modo **no se aplican los efectos de los buses** (`AudioEffect`: reverb, filtros, compresor…). Si el juego depende de ellos, grábalos en los propios ficheros de audio. Como último recurso, pon `audio/general/default_playback_type.web=0` (Stream), sabiendo que sin hilos puede dar retardo y chasquidos.
- **Táctil:** los controles en pantalla del APK (TouchScreenButton, joystick propio) funcionan igual. Muéstralos con `DisplayServer.is_touchscreen_available()`; en el ordenador se juega con teclado y ratón.
- **Vibración:** `Input.vibrate_handheld(ms)` vibra en Android, desde el navegador. En iPhone no vibra, y eso no debe romper nada.
- **Tamaño de pantalla:** usa estiramiento `canvas_items` o `viewport` con aspecto `expand` o `keep`. Las pantallas van de 360×640 a 1920×1080 y el juego tiene que verse entero en todas.

## 3. Montar el plugin

```
{{SLUG}}/
  {{SLUG}}.php           ← apéndice A
  readme.txt             ← apéndice D
  game/
    index.html  index.js  index.wasm  index.pck  index.png  index.audio*.worklet.js   ← de la exportación
    {{PRE}}-fs.js        ← apéndice B
    .htaccess            ← apéndice C
    icon-192.png         ← icono 192×192 (res/mipmap-xxxhdpi/ del APK o el icono del proyecto)
    icon-576.png         ← el mismo a 576×576
    (licencias de las fuentes, p. ej. OFL-*.txt, si el juego usa fuentes con licencia OFL)
```

1. **Marcadores:** copia las plantillas y sustituye todos (`{{TITULO}}`, `{{SLUG}}`, `{{ID}}`, `{{CLASE}}`, `{{PRE}}`, `{{COLOR}}`). Comprueba solo los ficheros propios, porque el `index.js` de Godot trae `{{` en sus comentarios:
   ```
   grep -n "{{" {{SLUG}}/{{SLUG}}.php {{SLUG}}/readme.txt {{SLUG}}/game/{{PRE}}-fs.js {{SLUG}}/game/.htaccess
   ```
   No debe salir nada.
2. **Icono de 576 px:**
   - Si es pixel art, amplía ×3 con «vecino más cercano», nunca suavizado:
     ```
     python3 -c "from PIL import Image; Image.open('{{SLUG}}/game/icon-192.png').resize((576,576), Image.NEAREST).save('{{SLUG}}/game/icon-576.png')"
     ```
   - Si no es pixel art, usa `Image.LANCZOS` o, mejor, la imagen original a 576.
3. **Juego en vertical** (no en horizontal). Cambia exactamente estas cadenas y nada más:
   - En el apéndice A:
     - `'orientation'      => 'landscape',` → `'orientation'      => 'portrait',`
     - `@media (orientation:portrait) and (pointer:coarse){#{{PRE}}-rot{display:flex}}` → `@media (orientation:landscape) and (pointer:coarse){#{{PRE}}-rot{display:flex}}`
     - No toques `@media (orientation:landscape){#{{PRE}}-inst…`: es la colocación del aviso de instalar.
     - En el panel, el texto «y se pone en horizontal» → «y se pone en vertical».
   - En el apéndice B: `o.lock('landscape')` → `o.lock('portrait')`.
   - En las comprobaciones del 4.5, al revés: en 390×844 no sale aviso de girar, en 844×390 sí, y la llamada esperada es `lock('portrait')`.
4. **Temática para mayores o delicada** (alcohol, cannabis, apuestas, violencia fuerte): que el propio juego enseñe su aviso de edad al arrancar. **No** lo metas en el catálogo del arcade ni en páginas con AdSense.
5. **Nunca** dentro del plugin: el almacén de claves de firma (`*.jks`, `*.keystore`), contraseñas, `.env`, tokens de API, el APK ni el proyecto fuente.

## 4. Comprobar antes de entregar

Todas las comprobaciones tienen que salir bien. Lo que no se pueda comprobar se dice en la entrega.

1. **Sintaxis:** `php -l {{SLUG}}/{{SLUG}}.php` y `node --check {{SLUG}}/game/{{PRE}}-fs.js`, sin errores.
2. **Sin restos de la plantilla:**
   ```
   grep -rniIE "\{\{|landrace|lh-" --exclude=index.js --exclude=index.html {{SLUG}}/
   ```
   No debe salir nada. Se excluyen `index.js` e `index.html` porque son de Godot, y `-I` se salta los binarios. Si el `.pck` se sacó de un proyecto copiado de otro juego, compruébalo aparte: `strings {{SLUG}}/game/index.pck | grep -ci <nombre del otro juego>` → 0.
3. **Sin secretos:**
   - `find {{SLUG}} \( -iname "*.jks" -o -iname "*.keystore" -o -iname "*.apk" -o -iname ".env" \)` no debe encontrar nada.
   - `grep -rniIE "password|token|secret|api_key" --exclude=index.js {{SLUG}}/` no debe sacar nada. Lo que aparezca en `index.js` o `index.wasm` es del motor de Godot (por ejemplo, el teclado virtual).
4. **El juego arranca en el navegador.** Godot web no funciona abriendo el fichero; necesita un servidor.
   - Arráncalo en segundo plano: `python3 -m http.server 8000 --directory {{SLUG}}/game >/dev/null 2>&1 & echo $! > /tmp/srv.pid`.
   - Abre `http://127.0.0.1:8000/index.html` con Playwright. Usa Chromium con `--use-gl=swiftshader --enable-unsafe-swiftshader` para tener WebGL.
   - Tiene que haber un `<canvas>` y **0 errores** en la consola.
   - Haz capturas a 844×390 y 1280×720 a los 8–10 s: deben enseñar el juego, no una pantalla negra ni la barra de carga.
   - Páralo al acabar: `kill $(cat /tmp/srv.pid)`. No uses `pkill -f`: también mataría la propia terminal.
5. **En WordPress**, si puedes montar uno local (PHP + SQLite, o `wp-env`), con Chromium con los mismos argumentos:
   - Activa el plugin.
   - **Página:** `GET /{{SLUG}}/` devuelve 200 y el HTML lleva `<base href=".../wp-content/plugins/{{SLUG}}/game/">`, `<link rel="manifest"`, `id="{{PRE}}-rot"` y `{{PRE}}-fs.js?v=`.
   - **Manifiesto:** `GET /?{{ID}}=manifest` devuelve 200, tipo `application/manifest+json` y JSON válido con `display: fullscreen`.
   - **Móvil en vertical** (`390×844`, `hasTouch`, `isMobile`): se ve el aviso «Gira el móvil». Intercepta `requestFullscreen` y `screen.orientation.lock` con `addInitScript`. Tras un toque, el aviso desaparece y hay **al menos una** llamada a `requestFullscreen({navigationUI:'hide'})` y a `lock('landscape')`. Un toque dispara pointerup, touchend y mousedown, así que en la simulación pueden salir varias.
   - **Móvil en horizontal** (`844×390`): el juego llena la pantalla.
   - **Aviso de instalar:**
     - Con el agente de usuario de Android y lanzando a mano un `beforeinstallprompt` falso (con `prompt()` y `userChoice`), sale `#{{PRE}}-inst` con el botón «Instalar», y al tocarlo se llama a `prompt()`.
     - Sin ese evento, a los 4 s sale la explicación del menú ⋮.
     - Con el agente de usuario de iPhone sale la explicación de Compartir.
     - En el ordenador no sale nada.
     - Si no se toca, se oculta solo a los 15 s. En horizontal (844×390), mira en la captura que no tape los botones del propio juego. Si los tapa, cambia su sitio en el CSS de `fullscreen()`.
   - **Convivencia:** actívalo junto a otro plugin que use el mismo patrón y comprueba que cada dirección sirve su propio juego.
   - **Desactivar:** al desactivarlo, `/{{SLUG}}/` da 404 sin tocar los enlaces permanentes.

   Si no puedes montar WordPress, dilo en la entrega como pendiente.
6. **El zip:** `cd <padre> && zip -qr {{SLUG}}-1.0.0.zip {{SLUG}}`.
   - `unzip -l` tiene que enseñar `{{SLUG}}/{{SLUG}}.php`, no `{{SLUG}}.php` en la raíz.
   - La versión tiene que ser la misma en la cabecera del PHP, en `const VERSION`, en `readme.txt` y en el nombre del zip.
7. **Tamaño:** el `.wasm` de Godot pesa ~35 MB sin comprimir, y en el zip queda en unos 7 MB, más lo que ocupe el `.pck` comprimido. Si el zip pasa de 30 MB no se puede enviar por aquí y puede chocar con el límite de subida del hosting. En ese caso, reduce el `.pck` antes de entregar: texturas más pequeñas y audio en Ogg Vorbis a menos calidad.

## 5. Actualizaciones

- **Versión:** súbela en los **cuatro** sitios (cabecera, `const VERSION`, `readme.txt` y nombre del zip). Así cambian el `?v=` del script y la ETag de la página.
- **Caché de página:** la página no entra en la caché de Kuboplay Shield (`DONOTCACHEPAGE`). Además, la primera visita tras subir una versión nueva vacía esa caché (`maybe_upgrade()` → `kp_shield_purge`), así que no se queda nadie con la página vieja.
- **Caché del navegador:** con el `.htaccess` del apéndice C, el `.pck`, el `.wasm`, `index.js` y los worklets se revalidan en cada visita. Si no cambiaron, el servidor contesta 304 sin enviar nada; si cambiaron, se descargan. Así un motor viejo nunca se junta con un `.pck` nuevo, aunque cambies de versión de Godot.
  - No pongas `max-age` al motor: un navegador que lo guarda con caducidad no vuelve a preguntar hasta que caduca, y cambiar la cabecera después ya no le llega.
  - Se quita la ETag de esos ficheros porque Apache le añade «-gzip» al comprimir y entonces nunca contestaría 304. Se revalidan por fecha.
  - Aquí no hay Apache para probarlo. Si la sesión puede llegar a la web publicada, compruébalo tras instalar:
    ```
    curl -sI -H "If-Modified-Since: $(date -u +'%a, %d %b %Y %H:%M:%S GMT')" https://<dominio>/wp-content/plugins/{{SLUG}}/game/index.wasm
    ```
    Tiene que contestar `304` con `Cache-Control: public, no-cache`. Si no se puede comprobar, dilo en la entrega.

## 6. Mensaje de entrega al usuario (modelo)

Adjunta `{{SLUG}}-1.0.0.zip` con la herramienta de enviar ficheros y escribe junto a él:

> **Instalar:** WordPress → Plugins → Añadir nuevo → Subir plugin → elige `{{SLUG}}-1.0.0.zip` → Instalar ahora → Activar. Si ya estaba instalado: «Reemplazar actual con el subido».
>
> **Jugar:** `tudominio/{{SLUG}}/`. Si da «página no encontrada»: Ajustes → Enlaces permanentes → Guardar cambios.
>
> **Sin barras:** en Android basta con tocar la pantalla, y sale un botón «Instalar» para tenerlo como app. En iPhone: Compartir → «Añadir a pantalla de inicio», y abrirlo desde ese icono.
>
> **En el menú «Elige juego»** (si tienes la Lanzadera de Kuboplay): Ajustes → Lanzadera → añade una ficha con el nombre, la dirección `/{{SLUG}}/` y un color. Para que salga sola hay que pedirlo en la conversación del portal Kuboplay, porque la lanzadera solo detecta los juegos que conoce.
>
> **Ajustes del juego:** Ajustes → {{TITULO}} (dirección, título y pantalla completa).

---

## Apéndice A · `{{SLUG}}/{{SLUG}}.php`

```php
<?php
/**
 * Plugin Name: {{TITULO}}
 * Description: Hospeda el juego «{{TITULO}}» (Godot, versión web) dentro de WordPress: dirección propia a pantalla completa y atajo [{{ID}}] para incrustarlo en cualquier página. Todo se sirve desde el propio plugin.
 * Version: 1.0.0
 * Author: WOLFCADE
 * License: GPL-2.0-or-later
 * Text Domain: {{SLUG}}
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class {{CLASE}} {

	const VERSION   = '1.0.0';
	const OPTION    = '{{ID}}';
	const QUERY_VAR = '{{ID}}';

	/** Valores por defecto de los ajustes. */
	private static function defaults() {
		return array(
			'slug'  => '{{SLUG}}',
			'title' => '{{TITULO}}',
			'fs'    => 1,
		);
	}

	public static function opt( $key ) {
		$o = wp_parse_args( (array) get_option( self::OPTION, array() ), self::defaults() );
		return isset( $o[ $key ] ) ? $o[ $key ] : '';
	}

	/** Carpeta y URL del juego (todo sale de __FILE__, así que el nombre de la carpeta da igual). */
	public static function game_dir() {
		return __DIR__ . '/game';
	}

	public static function game_url() {
		return plugins_url( 'game', __FILE__ );
	}

	public static function game_file() {
		return self::game_dir() . '/index.html';
	}

	/** Dirección pública del juego: bonita si hay enlaces permanentes, con parámetro si no. */
	public static function play_url( $args = array() ) {
		$slug = self::opt( 'slug' );
		if ( get_option( 'permalink_structure' ) && $slug ) {
			$url = home_url( '/' . $slug . '/' );
		} else {
			$url = add_query_arg( self::QUERY_VAR, 1, home_url( '/' ) );
		}
		return $args ? add_query_arg( $args, $url ) : $url;
	}

	public static function init() {
		add_action( 'init', array( __CLASS__, 'rewrite' ) );
		add_action( 'init', array( __CLASS__, 'maybe_upgrade' ), 20 );
		add_filter( 'query_vars', array( __CLASS__, 'query_vars' ) );
		add_action( 'template_redirect', array( __CLASS__, 'maybe_serve' ) );
		add_shortcode( '{{ID}}', array( __CLASS__, 'shortcode' ) );
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'settings' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), array( __CLASS__, 'action_links' ) );
	}

	public static function rewrite() {
		$slug = self::opt( 'slug' );
		if ( $slug ) {
			add_rewrite_rule( '^' . preg_quote( $slug, '/' ) . '/?$', 'index.php?' . self::QUERY_VAR . '=1', 'top' );
		}
	}

	/**
	 * Al subir una versión nueva («Reemplazar actual con el subido») no se ejecuta la activación.
	 * La primera visita tras el cambio vacía la caché de página de Kuboplay Shield, si está,
	 * para que nadie se quede con la página vieja guardada de antes.
	 */
	public static function maybe_upgrade() {
		if ( get_option( self::OPTION . '_ver' ) === self::VERSION ) {
			return;
		}
		update_option( self::OPTION . '_ver', self::VERSION, false );
		do_action( 'kp_shield_purge' );
	}

	public static function query_vars( $vars ) {
		$vars[] = self::QUERY_VAR;
		return $vars;
	}

	/** Al activar y al cambiar el slug hay que reescribir las reglas; si no, la dirección da 404. */
	public static function activate() {
		self::rewrite();
		flush_rewrite_rules();
	}

	/** Al borrar el plugin no deja nada en la base de datos. */
	public static function uninstall() {
		delete_option( self::OPTION );
		delete_option( self::OPTION . '_ver' );
	}

	public static function deactivate() {
		// flush_rewrite_rules() volvería a guardar la regla, que ya se registró en init:
		// se borran y WordPress las rehace en la siguiente visita, ya sin el plugin.
		delete_option( 'rewrite_rules' );
	}

	/**
	 * Sirve el juego en su dirección propia.
	 *
	 * Es la exportación web de Godot tal cual: un HTML que carga index.js, index.wasm e
	 * index.pck por ruta relativa. Se le añade un <base> apuntando a la carpeta del plugin
	 * para que esas rutas sigan valiendo aunque la página viva en /{{SLUG}}/.
	 */
	public static function maybe_serve() {
		$q = get_query_var( self::QUERY_VAR );
		if ( ! $q ) {
			return;
		}
		if ( 'manifest' === $q ) {
			self::manifest();
		}
		// La página ya lleva su propia ETag y 304. Que ninguna caché de página (Kuboplay Shield)
		// la guarde horas: al actualizar el plugin se seguiría sirviendo el HTML viejo.
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}

		$file = self::game_file();
		if ( ! is_readable( $file ) ) {
			status_header( 500 );
			wp_die( esc_html__( 'No encuentro el juego dentro del plugin.', '{{SLUG}}' ) );
		}

		$html = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		$base = '<base href="' . esc_url( trailingslashit( self::game_url() ) ) . '">';
		$html = preg_replace( '#(<meta\s+charset="utf-8">)#i', '$1' . "\n\t\t" . $base, $html, 1 );
		$html = preg_replace( '#<title>[^<]*</title>#i', '<title>' . esc_html( self::opt( 'title' ) ) . '</title>', $html, 1 );
		if ( self::opt( 'fs' ) ) {
			$html = self::fullscreen( $html );
		}

		$etag = '"' . md5( $html . self::VERSION ) . '"';

		nocache_headers();
		header_remove( 'Expires' );
		header_remove( 'Pragma' );
		header( 'Content-Type: text/html; charset=utf-8' );
		header( 'Cache-Control: public, max-age=600' );
		header( 'ETag: ' . $etag );
		header( 'X-Frame-Options: SAMEORIGIN' );

		$sent = isset( $_SERVER['HTTP_IF_NONE_MATCH'] ) ? trim( wp_unslash( $_SERVER['HTTP_IF_NONE_MATCH'] ) ) : '';
		if ( $sent && false !== strpos( $sent, trim( $etag, '"' ) ) ) {
			status_header( 304 );
			exit;
		}

		status_header( 200 );
		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput
		exit;
	}

	/**
	 * Pantalla completa sin barra del navegador.
	 *
	 * Ningún navegador deja quitar la barra sin que el jugador toque algo, así que {{PRE}}-fs.js
	 * pide la pantalla completa (y gira a horizontal) con el primer toque, clic o tecla.
	 * Además la página se puede instalar («Añadir a pantalla de inicio»): abierta desde el
	 * icono va sin barra desde el principio. Es la única vía en iPhone, que no tiene
	 * pantalla completa para páginas web.
	 */
	private static function fullscreen( $html ) {
		$title = esc_attr( self::opt( 'title' ) );
		$icon  = esc_url( trailingslashit( self::game_url() ) . 'icon-192.png' );
		$man   = esc_url( add_query_arg( self::QUERY_VAR, 'manifest', home_url( '/' ) ) );

		$html = str_replace( 'initial-scale=1.0">', 'initial-scale=1.0, viewport-fit=cover">', $html );

		$head  = "\t\t<meta name=\"theme-color\" content=\"#000000\">\n";
		$head .= "\t\t<meta name=\"mobile-web-app-capable\" content=\"yes\">\n";
		$head .= "\t\t<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n";
		$head .= "\t\t<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\">\n";
		$head .= "\t\t<meta name=\"apple-mobile-web-app-title\" content=\"{$title}\">\n";
		$head .= "\t\t<link rel=\"manifest\" href=\"{$man}\">\n";
		$head .= "\t\t<link rel=\"icon\" href=\"{$icon}\">\n";
		$head .= "\t\t<link rel=\"apple-touch-icon\" href=\"{$icon}\">\n";
		$head .= '<style>#{{PRE}}-rot{position:fixed;inset:0;z-index:99;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;'
			. 'background:#0b0f1e;color:#fff;font:600 20px/1.3 system-ui,sans-serif;text-align:center;padding:24px}'
			. '#{{PRE}}-rot small{font-weight:400;font-size:15px;opacity:.8;max-width:300px}'
			. '@media (orientation:portrait) and (pointer:coarse){#{{PRE}}-rot{display:flex}}#{{PRE}}-rot.off{display:none!important}'
			. '#{{PRE}}-inst{position:fixed;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:100;display:flex;align-items:center;gap:10px;'
			. 'width:max-content;max-width:calc(100vw - 20px);box-sizing:border-box;padding:8px 8px 8px 14px;border-radius:14px;background:rgba(11,15,30,.94);'
			. 'border:1px solid rgba(255,255,255,.18);box-shadow:0 6px 24px rgba(0,0,0,.5);color:#fff;font:14px/1.35 system-ui,sans-serif}'
			. '@media (orientation:landscape){#{{PRE}}-inst{top:calc(8px + env(safe-area-inset-top));bottom:auto;max-width:min(640px,74vw)}}#{{PRE}}-inst p{margin:0}#{{PRE}}-inst svg{vertical-align:-3px;color:{{COLOR}}}#{{PRE}}-inst.off{display:none}'
			. '#{{PRE}}-inst button{flex:none;min-height:44px;border:0;border-radius:10px;font:600 15px system-ui,sans-serif;cursor:pointer}'
			. '#{{PRE}}-inst .{{PRE}}-go{padding:0 16px;background:{{COLOR}};color:#08130a}'
			. '#{{PRE}}-inst .{{PRE}}-x{width:44px;background:transparent;color:#fff;font-size:24px;opacity:.75}</style>' . "\n";
		$html  = preg_replace( '#</head>#i', $head . '</head>', $html, 1 );

		$body  = '<div id="{{PRE}}-rot" role="dialog" aria-label="Gira el móvil">'
			. '<svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true"><rect x="30" y="14" width="36" height="62" rx="7" fill="none" stroke="#fff" stroke-width="5"/>'
			. '<path d="M14 58a34 34 0 0 0 34 26" fill="none" stroke="{{COLOR}}" stroke-width="5" stroke-linecap="round"/><path d="M40 78l9 6-6 9" fill="none" stroke="{{COLOR}}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
			. '<span>Gira el móvil</span><small>Toca para jugar a pantalla completa.</small></div>' . "\n";
		$body .= '<script src="{{PRE}}-fs.js?v=' . esc_attr( self::VERSION ) . '"></script>' . "\n";
		$html  = preg_replace( '#</body>#i', $body . '</body>', $html, 1 );

		return $html;
	}

	/** Manifiesto de la app instalable: abre a pantalla completa y en horizontal. */
	private static function manifest() {
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}
		$url  = trailingslashit( self::game_url() );
		$data = array(
			'name'             => self::opt( 'title' ),
			'short_name'       => self::opt( 'title' ),
			'start_url'        => self::play_url(),
			'scope'            => self::play_url(),
			'display'          => 'fullscreen',
			'orientation'      => 'landscape',
			'id'               => self::play_url(),
			'description'      => self::opt( 'title' ),
			'background_color' => '#000000',
			'theme_color'      => '#000000',
			'icons'            => array(
				array( 'src' => $url . 'icon-192.png', 'sizes' => '192x192', 'type' => 'image/png' ),
				array( 'src' => $url . 'icon-576.png', 'sizes' => '576x576', 'type' => 'image/png', 'purpose' => 'any' ),
			),
		);
		status_header( 200 );
		header( 'Content-Type: application/manifest+json; charset=utf-8' );
		header( 'Cache-Control: public, max-age=3600' );
		echo wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ); // phpcs:ignore WordPress.Security.EscapeOutput
		exit;
	}

	/**
	 * [{{ID}} alto="80vh" texto="Abrir a pantalla completa"]
	 *
	 * Incrusta el juego en una página. El enlace de debajo lo abre en su dirección propia,
	 * que es como se juega bien en el móvil.
	 */
	public static function shortcode( $atts ) {
		$a = shortcode_atts(
			array(
				'alto'  => '80vh',
				'texto' => 'Abrir a pantalla completa',
			),
			$atts,
			'{{ID}}'
		);

		$alto = preg_match( '/^[0-9.]+(px|vh|vw|%|em|rem)$/', $a['alto'] ) ? $a['alto'] : '80vh';

		$out  = '<div class="{{PRE}}-embed" style="margin:1.2em 0">';
		$out .= '<iframe src="' . esc_url( self::play_url() ) . '"'
			. ' title="' . esc_attr( self::opt( 'title' ) ) . '"'
			. ' style="display:block;width:100%;height:' . esc_attr( $alto ) . ';border:0;border-radius:10px;background:#000"'
			. ' allow="fullscreen; gamepad; autoplay" allowfullscreen loading="lazy"></iframe>';
		if ( $a['texto'] ) {
			$out .= '<p style="margin:.6em 0 0;text-align:center"><a href="' . esc_url( self::play_url() ) . '" target="_blank" rel="noopener">'
				. esc_html( $a['texto'] ) . '</a></p>';
		}
		$out .= '</div>';

		return $out;
	}

	/* ---------- Panel ---------- */

	public static function action_links( $links ) {
		array_unshift(
			$links,
			'<a href="' . esc_url( admin_url( 'options-general.php?page={{SLUG}}' ) ) . '">' . esc_html__( 'Ajustes', '{{SLUG}}' ) . '</a>',
			'<a href="' . esc_url( self::play_url() ) . '" target="_blank" rel="noopener">' . esc_html__( 'Jugar', '{{SLUG}}' ) . '</a>'
		);
		return $links;
	}

	public static function menu() {
		add_options_page( '{{TITULO}}', '{{TITULO}}', 'manage_options', '{{SLUG}}', array( __CLASS__, 'page' ) );
	}

	public static function settings() {
		register_setting(
			'{{ID}}_group',
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize' ),
				'default'           => self::defaults(),
			)
		);
	}

	public static function sanitize( $in ) {
		$old  = wp_parse_args( (array) get_option( self::OPTION, array() ), self::defaults() );
		$slug = isset( $in['slug'] ) ? sanitize_title( $in['slug'] ) : '';
		$out  = array(
			'slug'  => $slug ? $slug : self::defaults()['slug'],
			'title' => isset( $in['title'] ) ? sanitize_text_field( $in['title'] ) : $old['title'],
			'fs'    => empty( $in['fs'] ) ? 0 : 1,
		);
		if ( $out['slug'] !== $old['slug'] ) {
			// El slug nuevo necesita reglas nuevas; si no, la dirección da 404.
			add_action(
				'shutdown',
				function () {
					flush_rewrite_rules();
				}
			);
		}
		return $out;
	}

	public static function page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$url  = self::play_url();
		$size = 0;
		foreach ( array( 'index.wasm', 'index.pck', 'index.js' ) as $f ) {
			$p     = self::game_dir() . '/' . $f;
			$size += is_readable( $p ) ? filesize( $p ) : 0;
		}
		?>
		<div class="wrap">
			<h1>{{TITULO}}</h1>
			<p>El juego está dentro del plugin (<?php echo esc_html( size_format( $size ) ); ?>; el navegador lo descarga comprimido la primera vez y luego lo guarda). Se juega aquí:</p>
			<p><a class="button button-primary" href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener">Jugar ahora</a>
				&nbsp;<code><?php echo esc_html( $url ); ?></code></p>
			<p>Para ponerlo dentro de una página o entrada, pega este atajo:</p>
			<p><code>[{{ID}}]</code> &nbsp;— o con la altura que quieras: <code>[{{ID}} alto="600px"]</code></p>
			<?php if ( ! get_option( 'permalink_structure' ) ) : ?>
				<div class="notice notice-warning inline"><p>Tienes los enlaces permanentes en «Simple», así que la dirección del juego lleva un parámetro. En <strong>Ajustes → Enlaces permanentes</strong>, elige «Nombre de la entrada» para que quede bonita.</p></div>
			<?php endif; ?>
			<form method="post" action="options.php">
				<?php settings_fields( '{{ID}}_group' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="{{PRE}}-slug">Dirección</label></th>
						<td><?php echo esc_html( trailingslashit( home_url() ) ); ?><input id="{{PRE}}-slug" type="text" class="regular-text"
								name="<?php echo esc_attr( self::OPTION ); ?>[slug]"
								value="<?php echo esc_attr( self::opt( 'slug' ) ); ?>">/
							<p class="description">Al cambiarla se reescriben las reglas solas.</p></td>
					</tr>
					<tr>
						<th scope="row"><label for="{{PRE}}-title">Título</label></th>
						<td><input id="{{PRE}}-title" type="text" class="regular-text"
								name="<?php echo esc_attr( self::OPTION ); ?>[title]"
								value="<?php echo esc_attr( self::opt( 'title' ) ); ?>"></td>
					</tr>
					<tr>
						<th scope="row">Pantalla completa</th>
						<td><label><input type="checkbox" name="<?php echo esc_attr( self::OPTION ); ?>[fs]" value="1" <?php checked( (int) self::opt( 'fs' ), 1 ); ?>>
							Al tocar la pantalla, el juego ocupa toda la pantalla y se pone en horizontal; en el móvil, ofrece instalarlo como app</label>
							<p class="description">En Android quita la barra del navegador y sale un botón «Instalar». En iPhone la web no puede quitar la barra: sale un aviso que explica Compartir → «Añadir a pantalla de inicio», y abierto desde ese icono va sin barras.</p></td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}
}

register_activation_hook( __FILE__, array( '{{CLASE}}', 'activate' ) );
register_deactivation_hook( __FILE__, array( '{{CLASE}}', 'deactivate' ) );
register_uninstall_hook( __FILE__, array( '{{CLASE}}', 'uninstall' ) );
{{CLASE}}::init();
```

## Apéndice B · `{{SLUG}}/game/{{PRE}}-fs.js`

```js
/* {{TITULO}} · pantalla completa al primer toque.
 * El navegador solo deja entrar en pantalla completa tras un gesto (toque, clic o tecla),
 * así que se pide en el primero. En el móvil se vuelve a pedir en cada toque si se ha salido;
 * en el ordenador solo la primera vez (Esc tiene que valer para salir). */
(function () {
	var d = document, de = d.documentElement;
	var coarse = matchMedia('(pointer:coarse)').matches;
	var app = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
	var can = !!(de.requestFullscreen || de.webkitRequestFullscreen);
	var asked = false, busy = false;

	function isFS() { return !!(d.fullscreenElement || d.webkitFullscreenElement); }
	function lock() {
		try {
			var o = screen.orientation;
			if (o && o.lock) o.lock('landscape').catch(function () {});
		} catch (e) {}
	}
	function go(e) {
		if (e && e.target && e.target.closest && e.target.closest('#{{PRE}}-inst')) return;
		hideRot();
		if (app || !can || busy || isFS()) return;
		if (!coarse && asked) return;
		asked = true; busy = true;
		var r;
		try { r = de.requestFullscreen ? de.requestFullscreen({ navigationUI: 'hide' }) : de.webkitRequestFullscreen(); } catch (e) {}
		if (r && r.then) r.then(lock, function () {}).then(function () { busy = false; });
		else { busy = false; setTimeout(lock, 120); }
	}
	['pointerup', 'touchend', 'mousedown', 'keydown'].forEach(function (ev) {
		window.addEventListener(ev, go, { capture: true, passive: true });
	});

	/* Aviso en vertical: el juego es apaisado. Se quita al tocar o al girar. */
	var rot = d.getElementById('{{PRE}}-rot');
	function hideRot() { if (rot) rot.classList.add('off'); }
	if (rot && coarse && !app && !can) {
		/* iPhone: no hay pantalla completa desde la web; el aviso de abajo explica cómo instalarlo. */
		var t = rot.querySelector('small');
		if (t) t.textContent = 'Toca para jugar.';
	}

	/* Instalar como app: abierta desde el icono va sin barras desde el principio.
	 * Android (Chrome) ofrece el botón Instalar con beforeinstallprompt; si el navegador no lo
	 * ofrece, se explica el menú. iPhone no tiene botón posible: se explica Compartir. */
	if (app || !coarse) return;
	var KEY = '{{PRE}}-inst-off', ua = navigator.userAgent;
	var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	var android = /Android/i.test(ua);
	try { if (Date.now() - (+localStorage.getItem(KEY) || 0) < 7 * 864e5) return; } catch (e) {}
	var ask = null, box = null, shown = false;
	var SHARE = '<svg width="16" height="18" viewBox="0 0 16 18" aria-label="Compartir"><path d="M8 1v11M4 5l4-4 4 4M3 8H1.5v9h13V8H13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	function close(save) {
		if (box) box.classList.add('off');
		if (save) { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
	}
	function show(html, btn) {
		if (shown) return;
		shown = true;
		box = d.createElement('div');
		box.id = '{{PRE}}-inst';
		box.setAttribute('role', 'dialog');
		box.innerHTML = '<p>' + html + '</p>' + (btn ? '<button type="button" class="{{PRE}}-go">Instalar</button>' : '')
			+ '<button type="button" class="{{PRE}}-x" aria-label="Cerrar">×</button>';
		d.body.appendChild(box);
		/* Tapa parte del juego: si no se toca, se va solo a los 15 s (y vuelve en la siguiente visita). */
		setTimeout(function () { close(false); }, 15000);
		box.querySelector('.{{PRE}}-x').addEventListener('click', function () { close(true); go(); });
		if (btn) box.querySelector('.{{PRE}}-go').addEventListener('click', function () {
			if (!ask) return;
			ask.prompt();
			(ask.userChoice || Promise.resolve({})).then(function (c) { close(c && c.outcome === 'accepted'); if (!c || c.outcome !== 'accepted') go(); });
			ask = null;
		});
	}
	window.addEventListener('beforeinstallprompt', function (e) {
		e.preventDefault();
		ask = e;
		show('<b>Juega sin barras:</b> instálalo como app.', true);
	});
	window.addEventListener('appinstalled', function () { close(true); });
	setTimeout(function () {
		if (ios) show('<b>Juega sin barras:</b> toca ' + SHARE + ' Compartir y luego «Añadir a pantalla de inicio».');
		else if (android) show('<b>Juega sin barras:</b> menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».');
	}, ios ? 1500 : 4000);
})();
```

## Apéndice C · `{{SLUG}}/game/.htaccess`

```apache
# Motor de Godot para el navegador: el .wasm necesita su tipo y se comprime muy bien.
<IfModule mod_mime.c>
	AddType application/wasm .wasm
	AddType application/octet-stream .pck
</IfModule>
<IfModule mod_deflate.c>
	<IfModule mod_filter.c>
		AddOutputFilterByType DEFLATE application/wasm application/javascript application/octet-stream text/html
	</IfModule>
</IfModule>
# Sin ETag: Apache le añade «-gzip» al comprimir y entonces nunca contesta 304.
FileETag None
<IfModule mod_headers.c>
	# Y se quita también de la respuesta: sin ella se revalida por fecha
	# (If-Modified-Since), que la compresión no toca.
	Header unset ETag
	# Motor y contenido se revalidan en cada visita: 304 si no cambiaron (barato),
	# y nunca se mezcla un motor viejo con un .pck nuevo.
	<FilesMatch "\.(wasm|pck)$|^index(\.audio.*\.worklet)?\.js$">
		Header set Cache-Control "public, no-cache"
	</FilesMatch>
	# Iconos, imagen de carga y el script del plugin (lleva ?v=): un día.
	<FilesMatch "\.png$|-fs\.js$">
		Header set Cache-Control "public, max-age=86400"
	</FilesMatch>
</IfModule>
```

## Apéndice D · `{{SLUG}}/readme.txt`

```text
=== {{TITULO}} ===
Version: 1.0.0
Autor: WOLFCADE

Juego «{{TITULO}}» (Godot, exportación web sin hilos) servido desde el plugin.

Instalar: Plugins → Añadir nuevo → Subir plugin → {{SLUG}}-1.0.0.zip → Activar.
Jugar: /{{SLUG}}/ (cambiable en Ajustes → {{TITULO}}).
Incrustar: [{{ID}} alto="80vh"].
Pantalla completa: al primer toque (Android). En iPhone: Compartir → «Añadir a pantalla de inicio».

Cambios
1.0.0 — Primera versión.
```
