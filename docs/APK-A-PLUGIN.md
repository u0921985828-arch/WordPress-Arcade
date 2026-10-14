# De APK de Godot a plugin de WordPress

> **Para Claude (la otra conversación).** Este documento es tu encargo completo: con el proyecto Godot que ya compilas a APK, saca la **versión web** del juego y empaquétala como **plugin de WordPress** instalable subiendo un zip. Sigue los pasos en orden; las plantillas del final ya están probadas en producción (es el plugin «Landrace Hunters» 1.1.0 de la web kuboplay, con los nombres cambiados por marcadores). Responde al usuario en español, corto: no es técnico y trabaja desde el móvil.

## 0. Qué se entrega

- Un zip `{{SLUG}}-1.0.0.zip` que dentro tiene **una carpeta** `{{SLUG}}/` (no los ficheros sueltos en la raíz del zip; si no, WordPress no lo reconoce).
- Instalado, el juego se juega en `https://<dominio>/{{SLUG}}/`, ocupa toda la pantalla al primer toque (sin barra del navegador en Android), se pone en horizontal, se puede «Añadir a pantalla de inicio» como app, y se incrusta en cualquier página con `[{{ID}}]`.
- Sin anuncios, sin peticiones a otros dominios (todo sale del plugin) y sin ningún secreto dentro.
- Se entrega con la herramienta de enviar ficheros (límite 30 MB) más 3–5 líneas de instalación para el usuario (apartado 6).

## 1. Fija los nombres (marcadores)

Las plantillas llevan estos marcadores. Elígelos tú a partir del título del juego; pregunta al usuario solo si no sabes el título.

| Marcador | Qué es | Formato | Ejemplo |
|---|---|---|---|
| `{{TITULO}}` | Nombre visible | Libre | `Dub Siege` |
| `{{SLUG}}` | Carpeta, fichero principal, dirección web, dominio de texto | minúsculas-con-guiones | `dub-siege` |
| `{{ID}}` | Opción de la BD, variable de consulta, atajo | minúsculas_con_guion_bajo | `dub_siege` |
| `{{CLASE}}` | Clase PHP (única en todo WordPress) | Palabras_Con_Mayúscula | `Dub_Siege` |
| `{{PRE}}` | Prefijo de ids CSS y del script | 2–3 letras | `ds` |
| `{{COLOR}}` | Color de la flecha del aviso «Gira el móvil» | `#rrggbb` | `#ff6fb5` |

No reutilices `landrace_hunters`, `liga_barrios`, `kuboplay_launcher` ni `arcade`: ya existen en esa web y chocarían.

## 2. Exportar el juego a web desde Godot

**Lo fiable es exportar desde el proyecto**, no desde el APK.

1. Versión: `godot --version`. Las **plantillas de exportación** tienen que ser de **esa misma versión exacta** (`Godot_v<versión>-stable_export_templates.tpz` de las versiones publicadas de `godotengine/godot` en GitHub, descomprimidas en `~/.local/share/godot/export_templates/<versión>.stable/`).
2. Renderizador: en la web solo funciona **Compatibility** (WebGL 2). Si el proyecto usa Forward+ o Mobile, pon `rendering/renderer/rendering_method.web="gl_compatibility"` en `project.godot` (o el proyecto entero en Compatibility) y comprueba que se ve igual: sin luces volumétricas, SDFGI ni efectos de Forward+.
3. Añade un preajuste **Web** en `export_presets.cfg` (junto al de Android, sin tocar el de Android):
   - nombre `"Web"`, `platform="Web"`, `export_path="build/web/index.html"` (**el ejecutable se tiene que llamar `index`**: el plugin lee `game/index.html`);
   - `variant/thread_support=false` → no necesita las cabeceras COOP/COEP, que en hosting compartido (IONOS) no se pueden garantizar. Con esto `Thread` no sirve: si el juego usa hilos, que no dependa de ellos;
   - `html/canvas_resize_policy=2` (adaptable: el lienzo sigue a la ventana al girar o entrar en pantalla completa);
   - `progressive_web_app/enabled=false` (el plugin pone su propio manifiesto);
   - `vram_texture_compression/for_desktop=true` y `for_mobile=true` si el proyecto importa texturas con compresión VRAM (si no, en el móvil salen negras o no cargan). Si todo es pixel art «Lossless», no hace falta;
   - `html/export_icon=false`; `html/head_include` vacío.
4. Exporta: `godot --headless --export-release "Web" build/web/index.html`.
5. De `build/web/` quédate con: `index.html`, `index.js`, `index.wasm`, `index.pck` y todos los `index.audio*.worklet.js`. Tira el resto (`*.service.worker.js`, `*.manifest.json`, `*.offline.html`, `*.icon.png`, `*.apple-touch-icon.png`, `*.import`).
6. Comprueba en `index.html` que `GODOT_CONFIG` tiene `"ensureCrossOriginIsolationHeaders": false`, `"canvasResizePolicy": 2` y `"executable": "index"`, y que la etiqueta del viewport termina exactamente en `initial-scale=1.0">` (el plugin le añade `viewport-fit=cover` buscando esa cadena; si tu versión de Godot la escribe distinta, adapta el `str_replace` de `fullscreen()`).

**Si solo hay APK y no hay proyecto** (último recurso): `assets/` del APK es el contenido ya importado del juego. Empaquétalo en `index.pck` con `PCKPacker` (`pck_start`, `add_file("res://<ruta>", <fichero>)` por cada fichero, `flush`) usando **la misma versión de Godot que la plantilla web** (un `.pck` de otra versión no arranca); saca `index.html/js/wasm/worklet` exportando a web un proyecto vacío de esa versión con las opciones de arriba, cambia su `index.pck` por el tuyo y corrige `fileSizes` en `GODOT_CONFIG` con el tamaño real del `.pck`. Las bibliotecas nativas (`lib/*.so`, GDExtension) no sirven en la web.

### Lo que el código del juego tiene que respetar en la web

- **Solo Android** (anuncios, Play Games, compras, plugins JNI): protégelo con `Engine.has_singleton("…")` o `OS.has_feature("android")`. La versión web va **sin anuncios**.
- **Salir**: `get_tree().quit()` no cierra la pestaña; esconde el botón «Salir» si `OS.has_feature("web")`.
- **Guardado**: `user://` funciona (se guarda en el navegador, por dominio). Cierra el fichero al guardar; no confíes en `NOTIFICATION_WM_CLOSE_REQUEST` para guardar.
- **Sonido**: el navegador no deja sonar nada hasta el primer toque. Godot lo reanuda solo; no pongas audio imprescindible antes de que el jugador toque.
- **Táctil**: los controles en pantalla del APK (TouchScreenButton, joystick propio) funcionan igual. Muéstralos con `DisplayServer.is_touchscreen_available()`; en el ordenador, teclado y ratón.
- **Vibración**: `Input.vibrate_handheld(ms)` vibra en Android (navegador); en iPhone no vibra nada, que no rompa nada.
- **Tamaño de pantalla**: estiramiento `canvas_items` o `viewport` con aspecto `expand` o `keep`; las pantallas van de 360×640 a 1920×1080 y el juego tiene que verse entero en todas.

## 3. Montar el plugin

```
{{SLUG}}/
  {{SLUG}}.php           ← apéndice A
  readme.txt             ← apéndice D
  game/
    index.html  index.js  index.wasm  index.pck  index.audio*.worklet.js   ← de la exportación
    {{PRE}}-fs.js        ← apéndice B
    .htaccess            ← apéndice C
    icon-192.png         ← icono 192×192 (res/mipmap-xxxhdpi/ del APK o el icono del proyecto)
    icon-576.png         ← el mismo a 576×576 (pixel art: ampliación ×3 «vecino más cercano», nunca suavizada)
    (licencias de las fuentes, p. ej. OFL-*.txt, si el juego usa fuentes con licencia OFL)
```

1. Copia las plantillas y **sustituye todos los marcadores** (`{{TITULO}}`, `{{SLUG}}`, `{{ID}}`, `{{CLASE}}`, `{{PRE}}`, `{{COLOR}}`). Comprueba que no queda ninguno: `grep -rn "{{" {{SLUG}}/` → nada.
2. Juego en vertical (no en horizontal): en el apéndice A cambia `'orientation' => 'landscape'` por `'portrait'`, la consulta del aviso `(orientation:portrait)` por `(orientation:landscape)` y el texto «Gira el móvil» sigue valiendo; en el apéndice B, `lock('landscape')` por `lock('portrait')`.
3. Si el juego es para mayores o tiene temática delicada (alcohol, cannabis, apuestas, violencia fuerte): que el propio juego muestre su aviso de edad al arrancar, y **no** lo metas en el catálogo del arcade ni en páginas con AdSense.
4. **Nunca** dentro del plugin: el almacén de claves de firma (`*.jks`, `*.keystore`), contraseñas, `.env`, tokens de API, el APK, ni el proyecto fuente.

## 4. Comprobar antes de entregar

Todas tienen que salir bien; lo que no se pueda comprobar, se dice en la entrega.

1. `php -l {{SLUG}}/{{SLUG}}.php` y `node --check {{SLUG}}/game/{{PRE}}-fs.js` sin errores.
2. Sin restos: `grep -rniE "\{\{|landrace|lh-" {{SLUG}}/` → nada.
3. Sin secretos: `find {{SLUG}} -iname "*.jks" -o -iname "*.keystore" -o -iname "*.apk" -o -iname ".env"` → nada; y busca en el texto `password|token|secret|api_key`.
4. **El juego arranca en el navegador** (Godot web no funciona abriendo el fichero, necesita servidor): `python3 -m http.server 8000` dentro de `{{SLUG}}/game/` y Playwright (Chromium con `--use-gl=swiftshader --enable-unsafe-swiftshader` para tener WebGL) abriendo `http://127.0.0.1:8000/index.html`: hay `<canvas>`, **0 errores** en consola y la captura a los 8–10 s enseña el juego (no negro ni la barra de carga). Haz capturas a 844×390 y 1280×720.
5. **En WordPress** (si puedes montar uno local: PHP + SQLite, o `wp-env`):
   - activa el plugin, `GET /{{SLUG}}/` → 200 y el HTML lleva `<base href=".../wp-content/plugins/{{SLUG}}/game/">`, `<link rel="manifest"`, `id="{{PRE}}-rot"` y `{{PRE}}-fs.js?v=`;
   - `GET /?{{ID}}=manifest` → 200, tipo `application/manifest+json`, JSON válido con `display: fullscreen`;
   - Playwright como móvil (`390×844`, `hasTouch`, `isMobile`): el aviso «Gira el móvil» se ve; tras un toque se oculta y se llama a `requestFullscreen` con `{navigationUI:'hide'}` y a `screen.orientation.lock('landscape')` (intercéptalos con `addInitScript`); a `844×390` el juego llena la pantalla;
   - que conviva con otros plugins: actívalo junto a otro que use el mismo patrón y comprueba que cada dirección sirve su juego.
   Si no puedes montar WordPress, dilo en la entrega como pendiente.
6. El zip: `cd <padre> && zip -qr {{SLUG}}-1.0.0.zip {{SLUG}}` y `unzip -l` enseña `{{SLUG}}/{{SLUG}}.php` (no `{{SLUG}}.php` en la raíz). La versión es la misma en la cabecera del PHP, en `const VERSION`, en `readme.txt` y en el nombre del zip.
7. Tamaño: el `.wasm` de Godot pesa ~35 MB sin comprimir y el zip queda en ~10 MB más lo que pese el `.pck`. Si el zip pasa de 30 MB no se puede enviar por aquí y puede chocar con el límite de subida del hosting: reduce el `.pck` (texturas, audio en Ogg Vorbis a menos calidad) antes de entregar.

## 5. Actualizaciones

- Sube la versión en los **cuatro** sitios (cabecera, `const VERSION`, `readme.txt`, nombre del zip): así cambia el `?v=` del script y la ETag de la página.
- Los ficheros del juego se guardan en el navegador según el `.htaccess` del apéndice C: el `.pck` se revalida en cada visita (barato, responde 304 si no cambió) y el motor (`.wasm`/`.js`) se guarda un día, porque solo cambia si cambias de versión de Godot. **Si cambias de versión de Godot**, cambia también el `max-age` del motor o los jugadores que vuelvan ese mismo día cargarán motor viejo con `.pck` nuevo y el juego no arrancará.

## 6. Mensaje de entrega al usuario (modelo)

> **Instalar:** WordPress → Plugins → Añadir nuevo → Subir plugin → elige `{{SLUG}}-1.0.0.zip` → Instalar ahora → Activar. (Si ya estaba instalado: «Reemplazar actual con el subido».)
> **Jugar:** `tudominio/{{SLUG}}/`. Si da «página no encontrada»: Ajustes → Enlaces permanentes → Guardar cambios.
> **Pantalla completa:** en Android basta con tocar la pantalla. En iPhone: Compartir → «Añadir a pantalla de inicio» y abrirlo desde ese icono.
> **En el menú «Elige juego»** (si tienes la Lanzadera de Kuboplay): Ajustes → Lanzadera → añade una ficha con el nombre, la dirección `/{{SLUG}}/` y un color. (Para que salga sola hay que pedirlo en la conversación del portal Kuboplay: la lanzadera solo detecta los juegos que conoce.)
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

	public static function query_vars( $vars ) {
		$vars[] = self::QUERY_VAR;
		return $vars;
	}

	/** Al activar y al cambiar el slug hay que reescribir las reglas; si no, la dirección da 404. */
	public static function activate() {
		self::rewrite();
		flush_rewrite_rules();
	}

	public static function deactivate() {
		flush_rewrite_rules();
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
			. '@media (orientation:portrait) and (pointer:coarse){#{{PRE}}-rot{display:flex}}#{{PRE}}-rot.off{display:none!important}</style>' . "\n";
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
							Al tocar la pantalla, el juego ocupa toda la pantalla y se pone en horizontal</label>
							<p class="description">En Android quita la barra del navegador. En iPhone no se puede desde la web: hay que usar Compartir → «Añadir a pantalla de inicio».</p></td>
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
	function go() {
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
		/* iPhone: no hay pantalla completa desde la web; se explica cómo tenerla. */
		var t = rot.querySelector('small');
		if (t) t.textContent = 'Para quitar la barra del navegador: Compartir → «Añadir a pantalla de inicio».';
	}
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
	AddOutputFilterByType DEFLATE application/wasm application/javascript application/octet-stream text/html
</IfModule>
<IfModule mod_headers.c>
	# El motor solo cambia con la versión de Godot: un día.
	<FilesMatch "\.(wasm|js|png)$">
		Header set Cache-Control "public, max-age=86400"
	</FilesMatch>
	# El contenido del juego cambia en cada versión: se revalida siempre (304 si no cambió).
	<FilesMatch "\.pck$">
		Header set Cache-Control "public, no-cache"
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
