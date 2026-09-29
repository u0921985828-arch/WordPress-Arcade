<?php
/**
 * Kuboplay Shield — módulo de seguridad.
 *
 * Seis apartados, cada uno con su interruptor en los ajustes:
 *   1. Límite de peticiones por IP (front, login y API) → 429 sin cargar el resto de WordPress.
 *   2. Blindaje del login: intentos por IP y por usuario, bloqueo creciente, error genérico y
 *      URL de acceso propia (opcional).
 *   3. Endurecido: XML-RPC, enumeración de usuarios, versión de WordPress, editor de ficheros y
 *      PHP en /uploads/ (.htaccess).
 *   4. Cabeceras de seguridad compatibles con el portal (los juegos van en iframe del propio sitio).
 *   5. Cortafuegos de patrones evidentes en la URL y la cadena de consulta.
 *   6. Registro por día y motivo (KP_Shield::log). Nada sale del servidor.
 *
 * Todo se puede apagar: ajuste `sec_on` o la constante KP_SHIELD_OFF en wp-config.php.
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/security-rules.php';
require_once __DIR__ . '/detect.php';

final class KP_Shield_Security {

	/** Zona de la petición actual: 'front' | 'login' | 'api' | 'admin'. */
	private static $zone = 'front';

	/** Ruta de la petición ya normalizada (sin la subcarpeta de la instalación). */
	private static $path = '/';

	/** Mensaje de bloqueo del login, para que no lo pise el error genérico. */
	private static $lock_msg = '';

	/** Valores por defecto de este módulo. */
	public static function defaults( $d ) {
		return array_merge(
			$d,
			array(
				// 1. Límite de peticiones.
				'rl_on'        => 1,
				'rl_window'    => 60,   // segundos de la ventana
				'rl_max'       => 240,  // peticiones por ventana en el front
				'rl_max_login' => 30,   // wp-login.php y la URL de acceso propia
				'rl_max_api'   => 120,  // /wp-json/ y xmlrpc.php (el REST del arcade va aparte)

				// 2. Login.
				'login_on'     => 1,
				'login_max'    => 5,    // fallos antes del bloqueo
				'login_window' => 900,  // ventana de los fallos (s)
				'login_delay'  => 1,    // retardo progresivo (s por fallo, tope 3)
				'login_slug'   => '',   // vacío = wp-login.php de siempre (no se toca nada)

				// 3. Endurecido.
				'hard_xmlrpc'  => 1,
				'hard_enum'    => 1,
				'hard_version' => 1,
				'hard_editor'  => 1,
				'hard_uploads' => 1,

				// 4. Cabeceras.
				'hdr_on'       => 1,
				'hdr_hsts'     => 0,

				// 5. Cortafuegos.
				'fw_on'        => 1,
				'fw_allow'     => '',   // una ruta o fragmento por línea

				// 6. Registro.
				'log_on'       => 1,
			)
		);
	}

	public static function boot() {
		if ( defined( 'KP_SHIELD_OFF' ) && KP_SHIELD_OFF ) {
			return;
		}
		if ( ! KP_Shield::opt( 'sec_on' ) ) {
			return;
		}

		self::$path = self::path();
		self::$zone = self::zone();

		// Se ejecutan ya, en plugins_loaded: cortan antes de montar la consulta y el tema.
		// El motor de detección va primero: la lista negra se resuelve sin tocar nada más.
		if ( class_exists( 'KP_Shield_Detect' ) ) {
			KP_Shield_Detect::boot( self::$path, self::$zone, self::skip( 'detect' ) );
		}
		self::firewall();
		self::rate_limit();

		if ( KP_Shield::opt( 'hdr_on' ) ) {
			add_action( 'send_headers', array( __CLASS__, 'headers' ) );
		}
		if ( KP_Shield::opt( 'login_on' ) ) {
			self::login_boot();
		}
		self::hardening();

		add_action( 'admin_notices', array( __CLASS__, 'notices' ) );
		add_action( 'admin_init', array( __CLASS__, 'uploads_guard' ) );
		add_action( 'kp_shield_activate', array( __CLASS__, 'uploads_guard' ) );
	}

	/* ------------------------------------------------------------------ util */

	/** Ruta de la petición, sin la subcarpeta de WordPress, siempre con barra inicial. */
	private static function path() {
		$uri  = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : '/';
		$path = (string) wp_parse_url( $uri, PHP_URL_PATH );
		$home = (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH );
		$home = rtrim( $home, '/' );
		if ( '' !== $home && 0 === strpos( $path, $home . '/' ) ) {
			$path = substr( $path, strlen( $home ) );
		}
		return '' === $path ? '/' : $path;
	}

	private static function zone() {
		$p = self::$path;
		if ( is_admin() ) {
			// El escritorio de quien ha entrado no se limita; para un anónimo sí (admin-ajax).
			return self::uid() ? 'admin' : 'api';
		}
		$slug = self::slug();
		if ( false !== strpos( $p, '/wp-login.php' ) || ( '' !== $slug && trim( $p, '/' ) === $slug ) ) {
			return 'login';
		}
		if ( 0 === strpos( $p, '/wp-json/' ) || isset( $_GET['rest_route'] ) || false !== strpos( $p, '/xmlrpc.php' ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return 'api';
		}
		return 'front';
	}

	/** ID del usuario conectado sin tocar el usuario global (estamos muy pronto). */
	private static function uid() {
		static $uid = null;
		if ( null === $uid ) {
			$uid = function_exists( 'wp_validate_auth_cookie' ) ? (int) wp_validate_auth_cookie( '', 'logged_in' ) : 0;
		}
		return $uid;
	}

	private static function is_admin_user() {
		$uid = self::uid();
		return $uid && user_can( $uid, 'manage_options' );
	}

	private static function log( $motivo ) {
		if ( KP_Shield::opt( 'log_on' ) ) {
			KP_Shield::log( $motivo );
		}
	}

	/** ¿Hay que dejar pasar esta petición sin mirarla? */
	private static function skip( $que ) {
		$p  = self::$path;
		$ip = KP_Shield::ip();

		$skip = false;

		if ( ( defined( 'WP_CLI' ) && WP_CLI ) || 'cli' === PHP_SAPI ) {
			$skip = true;
		} elseif ( ( defined( 'DOING_CRON' ) && DOING_CRON ) || false !== strpos( $p, '/wp-cron.php' ) ) {
			// wp-cron solo se salta si viene del propio servidor.
			$skip = in_array( $ip, array( '127.0.0.1', '::1', isset( $_SERVER['SERVER_ADDR'] ) ? (string) $_SERVER['SERVER_ADDR'] : '' ), true );
		} elseif ( false !== strpos( $p, '/arcade/v1/' ) ) {
			// El modo tele ya tiene sus propios límites por IP en party.php.
			$skip = true;
		} elseif ( isset( $_GET['rest_route'] ) && 0 === strpos( (string) wp_unslash( $_GET['rest_route'] ), '/arcade/v1' ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			$skip = true;
		} elseif ( self::is_admin_user() ) {
			$skip = true;
		}

		/**
		 * Filtro para dejar pasar peticiones concretas.
		 *
		 * @param bool   $skip  Saltarse la comprobación.
		 * @param string $que   'rate' | 'firewall'.
		 * @param string $path  Ruta de la petición.
		 * @param string $ip    IP del visitante.
		 */
		return (bool) apply_filters( 'kp_shield_skip', $skip, $que, $p, $ip );
	}

	/* --------------------------------------------- 1. límite de peticiones */

	private static function rate_limit() {
		if ( ! KP_Shield::opt( 'rl_on' ) || 'admin' === self::$zone || self::skip( 'rate' ) ) {
			return;
		}
		// Con el motor de detección encendido manda su cubo de fichas (ritmo continuo,
		// sin el salto de la ventana fija) y este contador de respaldo no se usa.
		if ( class_exists( 'KP_Shield_Detect' ) && KP_Shield_Detect::active() ) {
			return;
		}

		$win = max( 5, (int) KP_Shield::opt( 'rl_window' ) );
		$max = (int) KP_Shield::opt( 'rl_max' );
		if ( 'login' === self::$zone ) {
			$max = (int) KP_Shield::opt( 'rl_max_login' );
		} elseif ( 'api' === self::$zone ) {
			$max = (int) KP_Shield::opt( 'rl_max_api' );
		}
		$max = (int) apply_filters( 'kp_shield_rate_max', $max, self::$zone );
		if ( $max < 1 ) {
			return;
		}

		$n = KP_Shield::hits( 'rl:' . self::$zone . ':' . KP_Shield::ip(), $win );
		if ( $n <= $max ) {
			return;
		}

		self::log( 'rate:' . self::$zone );
		self::deny(
			429,
			$win - ( time() % $win ),
			__( 'Demasiadas peticiones. Prueba otra vez en unos segundos.', 'kuboplay-shield' )
		);
	}

	/** Igual que deny(), pero accesible desde el motor de detección. */
	public static function stop( $code, $retry, $msg ) {
		self::deny( $code, $retry, $msg );
	}

	/** Corta la petición sin montar el tema ni la consulta. */
	private static function deny( $code, $retry, $msg ) {
		if ( ! headers_sent() ) {
			header( 'HTTP/1.1 ' . (int) $code . ( 429 === (int) $code ? ' Too Many Requests' : ' Forbidden' ) );
			header( 'Content-Type: text/plain; charset=utf-8' );
			header( 'Cache-Control: no-store, no-cache, must-revalidate, max-age=0' );
			header( 'X-Content-Type-Options: nosniff' );
			if ( $retry ) {
				header( 'Retry-After: ' . max( 1, (int) $retry ) );
			}
		}
		echo esc_html( $msg ) . "\n";
		exit;
	}

	/* -------------------------------------------------- 2. login blindado */

	/** Slug de acceso, vacío si no está activo. */
	public static function slug() {
		if ( defined( 'KP_SHIELD_LOGIN_SLUG_OFF' ) && KP_SHIELD_LOGIN_SLUG_OFF ) {
			return '';
		}
		$s = sanitize_title( (string) KP_Shield::opt( 'login_slug', '' ) );
		return ( '' === $s || 'wp-login' === $s || 'wp-admin' === $s ) ? '' : $s;
	}

	/** URL real de acceso (para el panel de ajustes y los avisos). */
	public static function login_url() {
		$s = self::slug();
		return $s ? home_url( '/' . $s . '/' ) : wp_login_url();
	}

	private static function login_boot() {
		add_filter( 'authenticate', array( __CLASS__, 'gate' ), 30, 3 );
		add_action( 'wp_login_failed', array( __CLASS__, 'failed' ) );
		add_action( 'wp_login', array( __CLASS__, 'ok' ), 10, 2 );
		add_filter( 'login_errors', array( __CLASS__, 'generic_error' ) );

		if ( self::slug() ) {
			add_action( 'init', array( __CLASS__, 'route_login' ), 999 );
			foreach ( array( 'site_url', 'network_site_url', 'wp_redirect', 'login_url', 'lostpassword_url', 'register_url' ) as $f ) {
				add_filter( $f, array( __CLASS__, 'mask_login_url' ), 20 );
			}
		}
	}

	private static function fail_keys( $user ) {
		return array(
			'ip'   => 'kpl_ip_' . md5( KP_Shield::ip() ),
			'user' => 'kpl_us_' . md5( strtolower( (string) $user ) ),
		);
	}

	/** Minutos de bloqueo según el número de bloqueos previos: 1, 5, 30. */
	private static function lock_secs( $level ) {
		$tabla = array( 60, 300, 1800 );
		$i     = min( count( $tabla ) - 1, max( 0, (int) $level ) );
		return (int) apply_filters( 'kp_shield_lock_secs', $tabla[ $i ], $level );
	}

	/** ¿Cuántos segundos queda bloqueada esta IP? 0 si no lo está. */
	private static function locked() {
		$until = (int) get_transient( 'kpl_lock_' . md5( KP_Shield::ip() ) );
		return $until > time() ? $until - time() : 0;
	}

	public static function gate( $user, $username = '', $password = '' ) {
		if ( '' === $username && '' === $password ) {
			return $user;
		}
		$left = self::locked();
		if ( ! $left ) {
			return $user;
		}
		self::$lock_msg = sprintf(
			/* translators: %d: minutos que quedan. */
			__( '<strong>Acceso bloqueado temporalmente</strong>: demasiados intentos fallidos. Inténtalo dentro de %d min.', 'kuboplay-shield' ),
			max( 1, (int) ceil( $left / 60 ) )
		);
		self::log( 'login:bloqueado' );
		return new WP_Error( 'kp_shield_locked', self::$lock_msg );
	}

	public static function failed( $username ) {
		// Si ya está bloqueado, los reintentos no cuentan: si no, el bloqueo se renovaría solo
		// y el usuario legítimo que insiste nunca podría volver a entrar.
		if ( self::locked() ) {
			return;
		}
		$k   = self::fail_keys( $username );
		$win = max( 60, (int) KP_Shield::opt( 'login_window' ) );
		$max = max( 1, (int) KP_Shield::opt( 'login_max' ) );

		$n = 0;
		foreach ( $k as $key ) {
			$c = (int) get_transient( $key ) + 1;
			set_transient( $key, $c, $win );
			$n = max( $n, $c );
		}

		self::log( 'login:fallo' );

		// Retardo progresivo: molesta a los bots, no al usuario que se equivoca una vez.
		$d = (int) KP_Shield::opt( 'login_delay' );
		if ( $d > 0 && $n > 1 ) {
			sleep( min( 3, $d * ( $n - 1 ) ) );
		}

		if ( $n < $max ) {
			return;
		}

		$lk    = 'kpl_lvl_' . md5( KP_Shield::ip() );
		$level = (int) get_transient( $lk );
		$secs  = self::lock_secs( $level );
		set_transient( 'kpl_lock_' . md5( KP_Shield::ip() ), time() + $secs, $secs );
		set_transient( $lk, $level + 1, DAY_IN_SECONDS ); // las IP no se guardan más de 24 h
		foreach ( $k as $key ) {
			delete_transient( $key );
		}
		self::log( 'login:bloqueo' );
	}

	public static function ok( $login, $user = null ) {
		$k = self::fail_keys( $login );
		foreach ( $k as $key ) {
			delete_transient( $key );
		}
		delete_transient( 'kpl_lock_' . md5( KP_Shield::ip() ) );
		delete_transient( 'kpl_lvl_' . md5( KP_Shield::ip() ) );
	}

	/** Un solo mensaje para todo: no se revela si el usuario existe. */
	public static function generic_error( $error ) {
		if ( self::$lock_msg ) {
			return self::$lock_msg;
		}
		$accion = isset( $_POST['action'] ) ? sanitize_key( wp_unslash( $_POST['action'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		if ( '' === $accion && isset( $_GET['action'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			$accion = sanitize_key( wp_unslash( $_GET['action'] ) ); // phpcs:ignore WordPress.Security.NonceVerification
		}
		if ( '' !== $accion && 'login' !== $accion ) {
			return $error; // Recuperar contraseña, registro… se dejan como están.
		}
		return __( '<strong>Error</strong>: usuario o contraseña incorrectos.', 'kuboplay-shield' );
	}

	/** Cambia wp-login.php por el slug propio en las URL que genera WordPress. */
	public static function mask_login_url( $url ) {
		$s = self::slug();
		if ( ! $s || ! is_string( $url ) || false === strpos( $url, 'wp-login.php' ) ) {
			return $url;
		}
		$q = (string) wp_parse_url( $url, PHP_URL_QUERY );
		return home_url( '/' . $s . '/' ) . ( $q ? '?' . $q : '' );
	}

	/**
	 * Enruta el acceso cuando hay slug propio:
	 *  - /<slug>/     → sirve wp-login.php
	 *  - wp-login.php → 404 (salvo cerrar sesión y contraseña de entrada)
	 *  - /wp-admin/   → 404 para quien no ha entrado (si no, delataría el slug al redirigir)
	 */
	public static function route_login() {
		$s = self::slug();
		if ( ! $s ) {
			return;
		}
		$p      = trim( self::$path, '/' );
		$accion = isset( $_GET['action'] ) ? sanitize_key( wp_unslash( $_GET['action'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification

		if ( $p === $s ) {
			$_SERVER['SCRIPT_NAME']    = '/wp-login.php';
			$GLOBALS['pagenow']        = 'wp-login.php';
			$GLOBALS['kp_shield_login'] = true;
			require_once ABSPATH . 'wp-login.php';
			exit;
		}

		if ( 'wp-login.php' === basename( self::$path ) ) {
			if ( in_array( $accion, array( 'logout', 'postpass', 'confirmaction' ), true ) ) {
				return;
			}
			self::log( 'login:oculto' );
			self::not_found();
		}

		if ( 0 === strpos( self::$path, '/wp-admin' ) && ! self::uid() ) {
			$base = basename( self::$path );
			if ( 'admin-ajax.php' !== $base && 'admin-post.php' !== $base ) {
				self::not_found();
			}
		}
	}

	private static function not_found() {
		if ( ! headers_sent() ) {
			status_header( 404 );
			nocache_headers();
		}
		wp_die(
			esc_html__( 'No se ha encontrado nada aquí.', 'kuboplay-shield' ),
			esc_html__( 'No encontrado', 'kuboplay-shield' ),
			array( 'response' => 404 )
		);
	}

	/* ----------------------------------------------------- 3. endurecido */

	private static function hardening() {
		if ( KP_Shield::opt( 'hard_editor' ) && ! defined( 'DISALLOW_FILE_EDIT' ) ) {
			define( 'DISALLOW_FILE_EDIT', true );
		}

		if ( KP_Shield::opt( 'hard_xmlrpc' ) ) {
			add_filter( 'xmlrpc_enabled', '__return_false' );
			add_filter( 'xmlrpc_methods', '__return_empty_array' );
			add_filter( 'pings_open', '__return_false', 20 );
			if ( false !== strpos( self::$path, '/xmlrpc.php' ) ) {
				self::log( 'xmlrpc' );
				self::deny( 403, 0, __( 'XML-RPC está desactivado.', 'kuboplay-shield' ) );
			}
		}

		if ( KP_Shield::opt( 'hard_version' ) ) {
			remove_action( 'wp_head', 'wp_generator' );
			add_filter( 'the_generator', '__return_empty_string' );
		}

		if ( KP_Shield::opt( 'hard_enum' ) ) {
			add_action( 'parse_request', array( __CLASS__, 'block_author_enum' ) );
			add_filter( 'rest_endpoints', array( __CLASS__, 'block_users_rest' ) );
			add_filter( 'wp_sitemaps_add_provider', array( __CLASS__, 'no_user_sitemap' ), 10, 2 );
		}
	}

	/** ?author=N delata los nombres de usuario al redirigir a /author/<login>/. */
	public static function block_author_enum( $wp ) {
		if ( is_admin() || self::uid() ) {
			return;
		}
		$a = isset( $_GET['author'] ) ? wp_unslash( $_GET['author'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		if ( '' !== $a && is_numeric( $a ) ) {
			self::log( 'enum:author' );
			self::not_found();
		}
	}

	/** /wp-json/wp/v2/users solo para quien ha entrado. No se toca arcade/v1. */
	public static function block_users_rest( $endpoints ) {
		if ( self::uid() ) {
			return $endpoints;
		}
		foreach ( array( '/wp/v2/users', '/wp/v2/users/(?P<id>[\d]+)' ) as $r ) {
			if ( isset( $endpoints[ $r ] ) ) {
				unset( $endpoints[ $r ] );
			}
		}
		return $endpoints;
	}

	public static function no_user_sitemap( $provider, $name ) {
		return 'users' === $name ? false : $provider;
	}

	/**
	 * Impide ejecutar PHP subido a /wp-content/uploads/ con un .htaccess propio.
	 * Solo si se puede escribir; si no, se avisa en el panel.
	 */
	public static function uploads_guard() {
		if ( ! KP_Shield::opt( 'hard_uploads' ) ) {
			return;
		}
		$up = wp_get_upload_dir();
		if ( empty( $up['basedir'] ) ) {
			return;
		}
		$f = trailingslashit( $up['basedir'] ) . '.htaccess';

		$reglas = "# Kuboplay Shield: nada de PHP en las subidas\n"
			. "<FilesMatch \"\\.(?i:php|php\\d|phtml|phps|phar|pl|py|cgi|asp|aspx|sh|shtml)$\">\n"
			. "\t<IfModule mod_authz_core.c>\n\t\tRequire all denied\n\t</IfModule>\n"
			. "\t<IfModule !mod_authz_core.c>\n\t\tOrder allow,deny\n\t\tDeny from all\n\t</IfModule>\n"
			. "</FilesMatch>\n";

		if ( file_exists( $f ) ) {
			$actual = (string) @file_get_contents( $f ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			if ( false !== strpos( $actual, 'Kuboplay Shield' ) ) {
				update_option( 'kp_shield_uploads', 'ok', false );
				return;
			}
			// Hay un .htaccess ajeno: no se toca, se avisa.
			if ( false === strpos( $actual, 'FilesMatch' ) ) {
				update_option( 'kp_shield_uploads', 'ajeno', false );
				return;
			}
			update_option( 'kp_shield_uploads', 'ok', false );
			return;
		}

		$ok = @file_put_contents( $f, $reglas ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		update_option( 'kp_shield_uploads', $ok ? 'ok' : 'no', false );
		if ( $ok ) {
			self::log( 'uploads:protegido' );
		}
	}

	/** Estado de la protección de /uploads/: 'ok' | 'no' | 'ajeno' | '' (sin comprobar). */
	public static function uploads_status() {
		return (string) get_option( 'kp_shield_uploads', '' );
	}

	/* ----------------------------------------------------- 4. cabeceras */

	public static function headers() {
		if ( headers_sent() ) {
			return;
		}
		foreach ( self::header_list() as $h ) {
			header( $h );
		}
	}

	/**
	 * Las cabeceras de seguridad como lista de textos «Nombre: valor».
	 *
	 * Se usa también desde el drop-in de caché: una página servida de caché no
	 * llega a `send_headers`, así que el módulo de rendimiento guarda esta lista
	 * en su config.php y la repite tal cual.
	 */
	public static function header_list() {
		$out = array(
			'X-Content-Type-Options: nosniff',
			'Referrer-Policy: strict-origin-when-cross-origin',
		);

		// Los juegos van en un iframe del propio sitio y /tele/ y /mando/ son páginas normales:
		// 'self' los deja funcionar y evita que nos incrusten desde fuera.
		$anc   = (string) apply_filters( 'kp_shield_frame_ancestors', "'self'" );
		$out[] = 'X-Frame-Options: SAMEORIGIN';
		$out[] = "Content-Security-Policy: frame-ancestors $anc";

		// Pantalla completa, mando y acelerómetro hacen falta dentro del propio sitio.
		$out[] = 'Permissions-Policy: ' . apply_filters(
			'kp_shield_permissions_policy',
			'accelerometer=(self), gyroscope=(self), gamepad=(self), fullscreen=(self), '
			. 'screen-wake-lock=(self), geolocation=(), camera=(), microphone=(), payment=(), usb=()'
		);

		if ( KP_Shield::opt( 'hdr_hsts' ) && is_ssl() ) {
			$out[] = 'Strict-Transport-Security: max-age=15552000; includeSubDomains';
		}
		return $out;
	}

	/* ---------------------------------------------------- 5. cortafuegos */

	private static function firewall() {
		if ( ! KP_Shield::opt( 'fw_on' ) || self::skip( 'firewall' ) ) {
			return;
		}

		$r    = kp_shield_rules();
		$path = strtolower( rawurldecode( self::$path ) );

		foreach ( (array) $r['safe'] as $safe ) {
			if ( 0 === strpos( $path, $safe ) ) {
				return;
			}
		}
		foreach ( self::allow_list() as $a ) {
			if ( false !== strpos( $path, $a ) ) {
				return;
			}
		}

		foreach ( (array) $r['path'] as $motivo => $re ) {
			if ( preg_match( '#' . $re . '#i', $path ) ) {
				self::block( 'fw:' . $motivo );
			}
		}

		$libres = array_map( 'strtolower', (array) $r['free'] );
		foreach ( (array) $_GET as $k => $v ) { // phpcs:ignore WordPress.Security.NonceVerification
			if ( in_array( strtolower( (string) $k ), $libres, true ) ) {
				continue;
			}
			$txt = strtolower( rawurldecode( self::flat( $v ) ) );
			if ( '' === $txt ) {
				continue;
			}
			foreach ( (array) $r['query'] as $motivo => $re ) {
				if ( preg_match( '#' . $re . '#i', $txt ) ) {
					self::block( 'fw:' . $motivo );
				}
			}
		}
	}

	/** Aplana un valor de $_GET (puede ser array) en una cadena. */
	private static function flat( $v, $hondo = 0 ) {
		if ( is_array( $v ) ) {
			if ( $hondo > 3 ) {
				return '';
			}
			$out = '';
			foreach ( $v as $x ) {
				$out .= ' ' . self::flat( $x, $hondo + 1 );
			}
			return $out;
		}
		return is_scalar( $v ) ? (string) $v : '';
	}

	private static function allow_list() {
		$txt = (string) KP_Shield::opt( 'fw_allow', '' );
		$out = array();
		foreach ( preg_split( '/[\r\n]+/', $txt ) as $l ) {
			$l = strtolower( trim( $l ) );
			if ( '' !== $l ) {
				$out[] = $l;
			}
		}
		return $out;
	}

	private static function block( $motivo ) {
		self::log( $motivo );
		// El cortafuegos también alimenta la reputación: quien prueba un patrón de ataque
		// suele probar veinte más, y así el segundo ya le sale más caro.
		if ( class_exists( 'KP_Shield_Detect' ) ) {
			KP_Shield_Detect::penalize( 'fw' );
		}
		self::deny( 403, 0, __( 'Petición bloqueada.', 'kuboplay-shield' ) );
	}

	/* --------------------------------------------------------- avisos */

	public static function notices() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$s = self::slug();
		if ( $s && ! get_user_meta( get_current_user_id(), 'kp_shield_slug_visto', true ) ) {
			printf(
				'<div class="notice notice-warning"><p>%s <code>%s</code></p></div>',
				esc_html__( 'Kuboplay Shield: la URL de acceso ha cambiado. Guarda este enlace en favoritos, wp-login.php ya responde 404:', 'kuboplay-shield' ),
				esc_html( self::login_url() )
			);
		}
		if ( KP_Shield::opt( 'hard_uploads' ) && in_array( self::uploads_status(), array( 'no', 'ajeno' ), true ) ) {
			printf(
				'<div class="notice notice-warning"><p>%s</p></div>',
				esc_html__( 'Kuboplay Shield: no se ha podido escribir el .htaccess de /wp-content/uploads/. Añade a mano la regla que impide ejecutar PHP en esa carpeta.', 'kuboplay-shield' )
			);
		}
	}
}

add_filter( 'kp_shield_defaults', array( 'KP_Shield_Security', 'defaults' ) );
add_action( 'kp_shield_boot', array( 'KP_Shield_Security', 'boot' ) );
