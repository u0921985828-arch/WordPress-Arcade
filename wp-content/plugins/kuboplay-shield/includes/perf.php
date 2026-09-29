<?php
/**
 * Kuboplay Shield — módulo de rendimiento.
 *
 * 1. Caché de página completa para visitantes anónimos (drop-in advanced-cache.php + caché tardía).
 * 2. Cabeceras de caché, ETag/Last-Modified con 304 y gzip si el servidor no comprime.
 * 3. Front más ligero: sin emojis, sin oEmbed, sin dashicons fuera del escritorio, sin RSD/wlwmanifest,
 *    y aplazado (defer) opcional del JS no crítico (nunca el del reproductor de juegos ni portal.js).
 * 4. Menos base de datos: revisiones, papelera, heartbeat, enlaces adyacentes y limpieza de transients.
 * 5. Imágenes: loading/decoding donde falten y fetchpriority en la principal de la ficha.
 *
 * Todo con interruptor propio y todo reversible al desactivar el plugin.
 * Sin librerías externas y sin ninguna llamada de red.
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

final class KP_Perf {

	/** Carpeta de la caché de páginas. */
	const DIR = 'cache/kp';

	/** Buffer abierto en esta petición. */
	private static $buffering = false;

	/** Clave de la página en curso. */
	private static $key = '';

	/** Ya se ha vaciado la caché en esta petición. */
	private static $purged = false;

	/* ------------------------------------------------------------ Ajustes */

	public static function defaults( $d ) {
		return array_merge(
			$d,
			array(
				'perf_cache'      => 1,        // caché de página completa
				'perf_cache_ttl'  => 8 * 3600, // caducidad en segundos (8 h)
				'perf_cache_qs'   => 'paged,page,orden,cat,g', // parámetros de consulta cacheables
				'perf_cache_mob'  => 0,        // caché separada para móvil
				'perf_cond'       => 1,        // ETag / Last-Modified / 304
				'perf_gzip'       => 1,        // gzip si el servidor no comprime
				'perf_light'      => 1,        // emojis, oEmbed, dashicons, RSD/wlwmanifest
				'perf_defer'      => 0,        // defer del JS no crítico
				'perf_db'         => 1,        // revisiones, heartbeat, enlaces adyacentes
				'perf_revisions'  => 5,
				'perf_trash_days' => 7,
				'perf_heartbeat'  => 60,
				'perf_transients' => 1,        // limpieza diaria de transients caducados
				'perf_img'        => 1,        // loading/decoding/fetchpriority
			)
		);
	}

	public static function on( $key ) {
		return KP_Shield::opt( 'perf_on' ) && KP_Shield::opt( $key );
	}

	/* -------------------------------------------------------------- Arranque */

	public static function boot() {
		add_action( 'kp_shield_activate', array( __CLASS__, 'activate' ) );
		add_action( 'kp_shield_deactivate', array( __CLASS__, 'deactivate' ) );
		add_action( 'kp_shield_purge', array( __CLASS__, 'purge' ) );

		if ( ! KP_Shield::opt( 'perf_on' ) ) {
			return;
		}

		// 1 y 2. Caché de página.
		if ( self::on( 'perf_cache' ) ) {
			add_action( 'template_redirect', array( __CLASS__, 'serve_or_buffer' ), 0 );
			add_action( 'admin_init', array( __CLASS__, 'sync_dropin' ) );
			foreach ( array( 'save_post', 'deleted_post', 'trashed_post', 'untrashed_post' ) as $h ) {
				add_action( $h, array( __CLASS__, 'purge_post' ), 10, 1 );
			}
			foreach ( array( 'switch_theme', 'customize_save_after', 'wp_update_nav_menu', 'created_term', 'edited_term', 'delete_term', 'permalink_structure_changed' ) as $h ) {
				add_action( $h, array( __CLASS__, 'purge' ) );
			}
			add_action( 'updated_option', array( __CLASS__, 'purge_option' ), 10, 1 );
			add_action( 'added_option', array( __CLASS__, 'purge_option' ), 10, 1 );
			add_action( 'wp_set_comment_status', array( __CLASS__, 'purge' ) );
			add_action( 'comment_post', array( __CLASS__, 'purge' ) );
			add_action( 'admin_notices', array( __CLASS__, 'notice' ) );
			// Autoinstalación: el gancho de activación puede no llegar a este módulo (se carga en
			// plugins_loaded, que ya ha pasado al activar). Comprobación barata en cada petición.
			if ( ! file_exists( WP_CONTENT_DIR . '/advanced-cache.php' ) || ! file_exists( self::dir() . '/config.php' ) ) {
				add_action( 'init', array( __CLASS__, 'sync_dropin' ), 1 );
				add_action( 'init', array( __CLASS__, 'schedule' ), 1 );
			}
		}

		// 2. gzip cuando el servidor no lo hace ya (las páginas servidas de caché lo hacen en el drop-in).
		if ( self::on( 'perf_gzip' ) ) {
			add_action( 'init', array( __CLASS__, 'gzip' ), 0 );
		}

		// 3. Front ligero.
		if ( self::on( 'perf_light' ) ) {
			add_action( 'init', array( __CLASS__, 'light' ) );
			add_action( 'wp_enqueue_scripts', array( __CLASS__, 'dequeue' ), 100 );
		}
		if ( self::on( 'perf_defer' ) ) {
			add_filter( 'script_loader_tag', array( __CLASS__, 'defer' ), 10, 2 );
		}

		// 4. Base de datos.
		if ( self::on( 'perf_db' ) ) {
			add_filter( 'wp_revisions_to_keep', array( __CLASS__, 'revisions' ), 10, 2 );
			add_filter( 'heartbeat_settings', array( __CLASS__, 'heartbeat' ) );
			add_action( 'init', array( __CLASS__, 'no_adjacent' ) );
		}
		if ( self::on( 'perf_db' ) || self::on( 'perf_transients' ) ) {
			add_action( 'init', array( __CLASS__, 'schedule' ) );
			add_action( 'kp_shield_daily', array( __CLASS__, 'daily' ) );
		}

		// 5. Imágenes.
		if ( self::on( 'perf_img' ) ) {
			foreach ( array( 'the_content', 'post_thumbnail_html', 'widget_text_content', 'get_avatar' ) as $f ) {
				add_filter( $f, array( __CLASS__, 'images' ), 99 );
			}
		}
	}

	/* ============================================================ 1. Caché */

	public static function dir() {
		return WP_CONTENT_DIR . '/' . self::DIR;
	}

	/** Configuración que lee el drop-in (no carga WordPress, así que va en un fichero aparte). */
	public static function config() {
		return array(
			'on'     => self::on( 'perf_cache' ) ? 1 : 0,
			'ttl'    => max( 60, (int) KP_Shield::opt( 'perf_cache_ttl', 28800 ) ),
			'qs'     => self::qs_allow(),
			'gzip'   => self::on( 'perf_gzip' ) ? 1 : 0,
			'cond'   => self::on( 'perf_cond' ) ? 1 : 0,
			'mobile' => KP_Shield::opt( 'perf_cache_mob' ) ? 1 : 0,
			'never'  => array_values( (array) apply_filters( 'kp_shield_cache_never', array() ) ),
			'salt'   => (string) get_option( 'kp_shield_cache_salt', '' ),
		);
	}

	private static function qs_allow() {
		$raw = (string) KP_Shield::opt( 'perf_cache_qs', '' );
		$out = array();
		foreach ( explode( ',', $raw ) as $k ) {
			$k = trim( $k );
			if ( '' !== $k ) {
				$out[] = $k;
			}
		}
		return array_values( array_unique( (array) apply_filters( 'kp_shield_cache_qs', $out ) ) );
	}

	/** Escribe la carpeta de caché, su protección y config.php. */
	public static function write_config() {
		$dir = self::dir();
		if ( ! wp_mkdir_p( $dir . '/pages' ) ) {
			return false;
		}
		if ( ! file_exists( $dir . '/index.php' ) ) {
			file_put_contents( $dir . '/index.php', "<?php\n// Silencio.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		}
		if ( ! file_exists( $dir . '/.htaccess' ) ) {
			// Solo protege ESTA carpeta: las cabeceras largas de arcade-core (games/_lib, assets) no se tocan.
			file_put_contents( $dir . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		}
		$php = "<?php\n// Generado por Kuboplay Shield. No editar a mano.\nreturn " . var_export( self::config(), true ) . ";\n"; // phpcs:ignore WordPress.PHP.DevelopmentFunctions
		return (bool) file_put_contents( $dir . '/config.php', $php ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	}

	/** Copia (o borra) el drop-in y la constante WP_CACHE según el ajuste. */
	public static function sync_dropin() {
		if ( self::on( 'perf_cache' ) ) {
			if ( ! get_option( 'kp_shield_cache_salt' ) ) {
				update_option( 'kp_shield_cache_salt', wp_generate_password( 8, false ), false );
			}
			self::write_config();
			self::install_dropin();
		} else {
			self::remove_dropin();
		}
	}

	public static function install_dropin() {
		$src = KP_Shield::dir() . 'includes/advanced-cache.php';
		$dst = WP_CONTENT_DIR . '/advanced-cache.php';
		if ( ! is_readable( $src ) ) {
			return false;
		}
		if ( file_exists( $dst ) && ! self::is_ours( $dst ) ) {
			return false; // Hay otro plugin de caché: no se pisa.
		}
		$ok = @copy( $src, $dst ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		if ( $ok ) {
			self::wp_cache_constant( true );
		}
		return $ok;
	}

	public static function remove_dropin() {
		$dst = WP_CONTENT_DIR . '/advanced-cache.php';
		if ( file_exists( $dst ) && self::is_ours( $dst ) ) {
			@unlink( $dst ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		}
		self::wp_cache_constant( false );
	}

	private static function is_ours( $file ) {
		$head = (string) @file_get_contents( $file, false, null, 0, 400 ); // phpcs:ignore
		return false !== strpos( $head, 'Kuboplay Shield' );
	}

	/** ¿Se pudo dejar WP_CACHE en wp-config.php? Si no, la caché sigue funcionando (tardía). */
	public static function wp_cache_ok() {
		return defined( 'WP_CACHE' ) && WP_CACHE && file_exists( WP_CONTENT_DIR . '/advanced-cache.php' );
	}

	/** Añade o quita `define( 'WP_CACHE', true )` en wp-config.php, con marca propia. */
	private static function wp_cache_constant( $add ) {
		$file = self::wp_config_file();
		if ( ! $file || ! is_writable( $file ) ) {
			return false;
		}
		$src = (string) file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		$has = (bool) preg_match( '/^.*KP_SHIELD_WP_CACHE.*$/m', $src );
		if ( $add ) {
			if ( $has ) {
				return true;
			}
			if ( preg_match( "/define\s*\(\s*['\"]WP_CACHE['\"]/", $src ) ) {
				return true; // Ya lo define otro: no se duplica.
			}
			$line = "define( 'WP_CACHE', true ); // KP_SHIELD_WP_CACHE\n";
			$src  = preg_replace( '/^<\?php\s*\r?\n/', "<?php\n" . $line, $src, 1 );
		} else {
			if ( ! $has ) {
				return true;
			}
			$src = preg_replace( '/^.*KP_SHIELD_WP_CACHE.*\r?\n/m', '', $src );
		}
		return (bool) file_put_contents( $file, $src ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	}

	private static function wp_config_file() {
		foreach ( array( ABSPATH . 'wp-config.php', dirname( ABSPATH ) . '/wp-config.php' ) as $f ) {
			if ( file_exists( $f ) ) {
				return $f;
			}
		}
		return '';
	}

	public static function notice() {
		if ( ! current_user_can( 'manage_options' ) || self::wp_cache_ok() || ! self::on( 'perf_cache' ) ) {
			return;
		}
		echo '<div class="notice notice-warning"><p>' . esc_html__( 'Kuboplay Shield: no se ha podido activar WP_CACHE en wp-config.php. La caché funciona igual, pero más tarde (se ahorra la plantilla, no la carga de WordPress). Añade a mano: define( \'WP_CACHE\', true );', 'kuboplay-shield' ) . '</p></div>';
	}

	/* ------------------------------------------------ Servir / guardar */

	/**
	 * Si el drop-in no está activo, sirve aquí lo guardado (caché tardía).
	 * Si no hay nada guardado y la petición es cacheable, abre el buffer para guardarla.
	 */
	public static function serve_or_buffer() {
		if ( ! self::cacheable() ) {
			return;
		}
		self::$key = self::key();
		if ( ! self::$key ) {
			return;
		}
		$file = self::file( self::$key );
		$ttl  = max( 60, (int) KP_Shield::opt( 'perf_cache_ttl', 28800 ) );

		if ( is_readable( $file ) && ( time() - (int) filemtime( $file ) ) <= $ttl ) {
			self::send_late( $file, $ttl );
			return;
		}
		self::$buffering = true;
		ob_start( array( __CLASS__, 'finish' ) );
	}

	/** Entrega tardía (sin drop-in): WordPress ya está cargado, pero se ahorra la plantilla. */
	private static function send_late( $file, $ttl ) {
		$mtime = (int) filemtime( $file );
		$etag  = '"kp' . $mtime . '-' . substr( self::$key, 0, 12 ) . '"';
		nocache_headers_remove();
		header( 'Content-Type: text/html; charset=UTF-8' );
		header( 'X-KP-Cache: HIT' );
		header( 'Cache-Control: public, max-age=0, s-maxage=' . $ttl . ', must-revalidate' );
		header( 'Vary: Accept-Encoding, Cookie' );
		if ( self::on( 'perf_cond' ) ) {
			header( 'ETag: ' . $etag );
			header( 'Last-Modified: ' . gmdate( 'D, d M Y H:i:s', $mtime ) . ' GMT' );
			$inm = isset( $_SERVER['HTTP_IF_NONE_MATCH'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_IF_NONE_MATCH'] ) ) : '';
			$ims = isset( $_SERVER['HTTP_IF_MODIFIED_SINCE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_IF_MODIFIED_SINCE'] ) ) : '';
			if ( ( $inm && false !== strpos( str_replace( 'W/', '', $inm ), $etag ) )
				|| ( $ims && strtotime( $ims ) >= $mtime ) ) {
				header( 'X-KP-Cache: HIT-304' );
				status_header( 304 );
				exit;
			}
		}
		readfile( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		exit;
	}

	/** Llamada de ob_start: guarda el HTML si la respuesta sigue siendo cacheable. */
	public static function finish( $html ) {
		if ( ! self::$buffering || ! self::$key ) {
			return $html;
		}
		$code = function_exists( 'http_response_code' ) ? (int) http_response_code() : 200;
		if ( 200 !== $code || strlen( $html ) < 255 || ! self::cacheable() ) {
			header( 'X-KP-Cache: BYPASS' );
			return $html;
		}
		foreach ( headers_list() as $h ) {
			if ( 0 === stripos( $h, 'set-cookie:' ) || 0 === stripos( $h, 'content-type: application/' ) ) {
				header( 'X-KP-Cache: BYPASS' );
				return $html;
			}
		}
		if ( false === stripos( $html, '</html>' ) ) {
			return $html; // Respuesta parcial o no HTML.
		}

		$out  = $html . "\n<!-- Kuboplay Shield: guardado " . gmdate( 'Y-m-d H:i:s' ) . " UTC -->";
		$file = self::file( self::$key );
		wp_mkdir_p( dirname( $file ) );
		$tmp = $file . '.' . wp_generate_password( 6, false ) . '.tmp';
		if ( false !== file_put_contents( $tmp, $out ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions
			@rename( $tmp, $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			if ( self::on( 'perf_gzip' ) && function_exists( 'gzencode' ) ) {
				$gz = substr( $file, 0, -5 ) . '.gz';
				file_put_contents( $gz . '.tmp', gzencode( $out, 6 ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions
				@rename( $gz . '.tmp', $gz ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			}
		} else {
			@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		}

		$ttl = max( 60, (int) KP_Shield::opt( 'perf_cache_ttl', 28800 ) );
		header( 'X-KP-Cache: MISS' );
		header( 'Cache-Control: public, max-age=0, s-maxage=' . $ttl . ', must-revalidate' );
		header( 'Vary: Accept-Encoding, Cookie' );
		return $html;
	}

	private static function file( $key ) {
		return self::dir() . '/pages/' . substr( $key, 0, 2 ) . '/' . $key . '.html';
	}

	/** Mismas reglas que el drop-in, más lo que solo se sabe con WordPress cargado. */
	public static function cacheable() {
		if ( is_admin() || is_user_logged_in() || is_feed() || is_trackback() || is_robots() || is_404() ) {
			return false;
		}
		if ( defined( 'DONOTCACHEPAGE' ) || defined( 'REST_REQUEST' ) || defined( 'DOING_AJAX' ) || defined( 'DOING_CRON' ) || defined( 'WP_CLI' ) ) {
			return false;
		}
		if ( function_exists( 'is_preview' ) && ( is_preview() || is_customize_preview() ) ) {
			return false;
		}
		if ( is_singular() && post_password_required() ) {
			return false;
		}
		if ( ! empty( $_POST ) || 'GET' !== ( isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : 'GET' ) ) {
			return false;
		}
		return (bool) apply_filters( 'kp_shield_cacheable', true );
	}

	/** Clave de caché idéntica a la del drop-in. */
	public static function key() {
		$cfg  = self::config();
		$uri  = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '/';
		$path = (string) wp_parse_url( $uri, PHP_URL_PATH );
		$qs   = (string) wp_parse_url( $uri, PHP_URL_QUERY );

		$never = array_merge( array( '/wp-admin', '/wp-login.php', '/wp-json', '/wp-cron.php', '/xmlrpc.php', '/tele', '/mando', '/feed' ), (array) $cfg['never'] );
		$low   = strtolower( rtrim( $path, '/' ) );
		foreach ( $never as $n ) {
			$n = strtolower( rtrim( (string) $n, '/' ) );
			if ( '' !== $n && ( $low === $n || 0 === strpos( $low . '/', $n . '/' ) ) ) {
				return '';
			}
		}
		if ( '/' !== substr( $path, -1 ) && preg_match( '#\.(php|xml|txt|json)$#i', $path ) ) {
			return '';
		}
		foreach ( array_keys( (array) $_COOKIE ) as $c ) {
			$c = (string) $c;
			if ( 0 === strpos( $c, 'wordpress_logged_in_' ) || 0 === strpos( $c, 'wp-postpass_' )
				|| 0 === strpos( $c, 'comment_author_' ) || 0 === strpos( $c, 'woocommerce_' ) || 0 === strpos( $c, 'kp_nocache' ) ) {
				return '';
			}
		}
		$args = array();
		if ( '' !== $qs ) {
			parse_str( $qs, $args );
			foreach ( array_keys( $args ) as $k ) {
				if ( ! in_array( (string) $k, (array) $cfg['qs'], true ) ) {
					return '';
				}
			}
			ksort( $args );
		}
		$host = isset( $_SERVER['HTTP_HOST'] ) ? strtolower( sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) ) ) : '';
		$mob  = '';
		if ( ! empty( $cfg['mobile'] ) ) {
			$ua  = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';
			$mob = preg_match( '#Mobile|Android|iP(hone|od|ad)#i', $ua ) ? 'm' : 'd';
		}
		return md5( ( is_ssl() ? 'https' : 'http' ) . '://' . $host . $path . '?' . http_build_query( $args ) . '|' . $mob . '|' . $cfg['salt'] );
	}

	/* ------------------------------------------------------------- Purga */

	public static function purge_post( $post_id ) {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}
		$st = get_post_status( $post_id );
		if ( 'auto-draft' === $st ) {
			return;
		}
		self::purge();
	}

	public static function purge_option( $option ) {
		$option = (string) $option;
		if ( 0 === strpos( $option, '_transient_' ) || 0 === strpos( $option, '_site_transient_' )
			|| in_array( $option, array( 'cron', 'kp_shield_stats', 'kp_shield_cache_salt', 'rewrite_rules' ), true ) ) {
			return;
		}
		self::purge();
	}

	/** Vacía la caché de páginas. Expuesto también como acción `kp_shield_purge`. */
	public static function purge() {
		if ( self::$purged ) {
			return;
		}
		self::$purged = true;
		self::rmdir( self::dir() . '/pages' );
		wp_mkdir_p( self::dir() . '/pages' );
	}

	private static function rmdir( $dir ) {
		if ( ! is_dir( $dir ) ) {
			return;
		}
		$it = @scandir( $dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		foreach ( (array) $it as $f ) {
			if ( '.' === $f || '..' === $f ) {
				continue;
			}
			$p = $dir . '/' . $f;
			if ( is_dir( $p ) ) {
				self::rmdir( $p );
			} else {
				@unlink( $p ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			}
		}
		@rmdir( $dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
	}

	/* ============================================================ 2. gzip */

	/** Comprime la salida cuando el servidor no lo hace ya (las páginas de caché van comprimidas aparte). */
	public static function gzip() {
		if ( is_admin() || headers_sent() || ini_get( 'zlib.output_compression' ) ) {
			return;
		}
		if ( ! function_exists( 'ob_gzhandler' ) || ob_get_level() > 1 ) {
			return;
		}
		$ae = isset( $_SERVER['HTTP_ACCEPT_ENCODING'] ) ? strtolower( sanitize_text_field( wp_unslash( $_SERVER['HTTP_ACCEPT_ENCODING'] ) ) ) : '';
		if ( false === strpos( $ae, 'gzip' ) ) {
			return;
		}
		ob_start( 'ob_gzhandler' );
	}

	/* ===================================================== 3. Front ligero */

	public static function light() {
		// Emojis.
		remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
		remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
		remove_action( 'wp_print_styles', 'print_emoji_styles' );
		remove_action( 'admin_print_styles', 'print_emoji_styles' );
		remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
		remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
		remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
		add_filter( 'emoji_svg_url', '__return_false' );
		add_filter(
			'tiny_mce_plugins',
			function ( $p ) {
				return is_array( $p ) ? array_diff( $p, array( 'wpemoji' ) ) : $p;
			}
		);

		// oEmbed y wp-embed.js.
		remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
		remove_action( 'wp_head', 'wp_oembed_add_host_js' );
		remove_action( 'rest_api_init', 'wp_oembed_register_route' );
		remove_filter( 'oembed_dataparse', 'wp_filter_oembed_result', 10 );
		add_filter( 'embed_oembed_discover', '__return_false' );

		// Cabeceras inútiles.
		remove_action( 'wp_head', 'rsd_link' );
		remove_action( 'wp_head', 'wlwmanifest_link' );
		remove_action( 'wp_head', 'wp_generator' );
		remove_action( 'wp_head', 'wp_shortlink_wp_head' );
	}

	public static function dequeue() {
		wp_deregister_script( 'wp-embed' );
		if ( ! is_admin() && ! is_admin_bar_showing() ) {
			wp_dequeue_style( 'dashicons' );
			wp_deregister_style( 'dashicons' );
		}
	}

	/**
	 * Aplaza el JS no crítico. Nunca toca el reproductor de juegos (arcade-engine),
	 * portal.js ni nada con dependencias en línea, que se rompería al cambiar el orden.
	 */
	public static function defer( $tag, $handle ) {
		if ( is_admin() || false !== strpos( $tag, ' defer' ) || false !== strpos( $tag, ' async' ) ) {
			return $tag;
		}
		$skip = array( 'jquery', 'jquery-core', 'jquery-migrate', 'wp-polyfill' );
		$skip = (array) apply_filters( 'kp_shield_defer_skip', $skip );
		if ( in_array( $handle, $skip, true ) || 0 === strpos( (string) $handle, 'arcade' ) ) {
			return $tag; // arcade-portal, arcade-engine y compañía se dejan tal cual.
		}
		$wps = wp_scripts();
		if ( $wps && ( $wps->get_data( $handle, 'before' ) || $wps->get_data( $handle, 'after' ) ) ) {
			return $tag; // Tiene JS en línea que depende del orden.
		}
		return preg_replace( '#<script(?=\s)(?![^>]*\btype=[\'"]module)#', '<script defer', $tag, 1 );
	}

	/* ================================================== 4. Base de datos */

	public static function revisions( $num, $post = null ) {
		$n = (int) KP_Shield::opt( 'perf_revisions', 5 );
		return $n < 0 ? $num : $n;
	}

	public static function heartbeat( $s ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && in_array( $screen->base, array( 'post' ), true ) ) {
			return $s; // En el editor se deja como está (bloqueo de entradas, autoguardado).
		}
		$s['interval'] = max( 15, min( 300, (int) KP_Shield::opt( 'perf_heartbeat', 60 ) ) );
		return $s;
	}

	public static function no_adjacent() {
		remove_action( 'wp_head', 'adjacent_posts_rel_link_wp_head', 10 );
		remove_action( 'wp_head', 'start_post_rel_link', 10 );
		remove_action( 'wp_head', 'index_rel_link' );
	}

	public static function schedule() {
		if ( ! wp_next_scheduled( 'kp_shield_daily' ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'kp_shield_daily' );
		}
	}

	/** Tarea diaria: papelera vieja y transients caducados. */
	public static function daily() {
		global $wpdb;

		if ( self::on( 'perf_db' ) ) {
			$days = max( 1, (int) KP_Shield::opt( 'perf_trash_days', 7 ) );
			$old  = gmdate( 'Y-m-d H:i:s', time() - $days * DAY_IN_SECONDS );
			$ids  = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_status = 'trash' AND post_modified_gmt < %s LIMIT 200", $old ) ); // phpcs:ignore WordPress.DB
			foreach ( (array) $ids as $id ) {
				wp_delete_post( (int) $id, true );
			}
		}

		if ( self::on( 'perf_transients' ) ) {
			$now  = time();
			$rows = $wpdb->get_col( $wpdb->prepare( "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s AND option_value < %d LIMIT 500", $wpdb->esc_like( '_transient_timeout_' ) . '%', $now ) ); // phpcs:ignore WordPress.DB
			foreach ( (array) $rows as $name ) {
				delete_transient( substr( (string) $name, strlen( '_transient_timeout_' ) ) );
			}
			$rows = $wpdb->get_col( $wpdb->prepare( "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s AND option_value < %d LIMIT 500", $wpdb->esc_like( '_site_transient_timeout_' ) . '%', $now ) ); // phpcs:ignore WordPress.DB
			foreach ( (array) $rows as $name ) {
				delete_site_transient( substr( (string) $name, strlen( '_site_transient_timeout_' ) ) );
			}
		}
	}

	/* ======================================================= 5. Imágenes */

	/**
	 * Añade loading/decoding donde falten (las miniaturas del portal ya los traen: no se duplican)
	 * y marca la primera imagen de la ficha con fetchpriority="high".
	 */
	public static function images( $html ) {
		if ( is_admin() || ! is_string( $html ) || false === stripos( $html, '<img' ) ) {
			return $html;
		}
		$hero = is_singular() && ! did_action( 'kp_shield_hero' );

		$html = preg_replace_callback(
			'#<img\b[^>]*>#i',
			function ( $m ) use ( &$hero ) {
				$t = $m[0];
				$first = $hero;
				if ( $first ) {
					$hero = false;
				}
				if ( $first ) {
					if ( false === stripos( $t, 'fetchpriority=' ) ) {
						$t = preg_replace( '#<img\b#i', '<img fetchpriority="high"', $t, 1 );
					}
					$t = preg_replace( '#\sloading=([\'"])lazy\1#i', ' loading="eager"', $t );
					if ( false === stripos( $t, 'loading=' ) ) {
						$t = preg_replace( '#<img\b#i', '<img loading="eager"', $t, 1 );
					}
				} elseif ( false === stripos( $t, 'loading=' ) ) {
					$t = preg_replace( '#<img\b#i', '<img loading="lazy"', $t, 1 );
				}
				if ( false === stripos( $t, 'decoding=' ) ) {
					$t = preg_replace( '#<img\b#i', '<img decoding="async"', $t, 1 );
				}
				return $t;
			},
			$html
		);

		if ( ! $hero && is_singular() ) {
			do_action( 'kp_shield_hero' );
		}
		return $html;
	}

	/* ================================================ Activar / desactivar */

	public static function activate() {
		if ( ! get_option( 'kp_shield_cache_salt' ) ) {
			update_option( 'kp_shield_cache_salt', wp_generate_password( 8, false ), false );
		}
		self::sync_dropin();
		self::schedule();
	}

	/** Al desactivar, el sitio queda como estaba: sin drop-in, sin carpeta de caché y sin WP_CACHE. */
	public static function deactivate() {
		self::$purged = true; // Lo que venga después (WordPress guarda active_plugins) ya no recrea nada.
		self::remove_dropin();
		self::rmdir( self::dir() );
		$ts = wp_next_scheduled( 'kp_shield_daily' );
		if ( $ts ) {
			wp_unschedule_event( $ts, 'kp_shield_daily' );
		}
		delete_option( 'kp_shield_cache_salt' );
	}
}

/** WordPress no trae una función para quitar las cabeceras «no cachear»: aquí la mínima. */
if ( ! function_exists( 'nocache_headers_remove' ) ) {
	function nocache_headers_remove() {
		if ( ! headers_sent() ) {
			header_remove( 'Cache-Control' );
			header_remove( 'Pragma' );
			header_remove( 'Expires' );
		}
	}
}

add_filter( 'kp_shield_defaults', array( 'KP_Perf', 'defaults' ) );
KP_Perf::boot();
