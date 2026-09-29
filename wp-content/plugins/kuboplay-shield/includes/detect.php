<?php
/**
 * Kuboplay Shield — motor de detección.
 *
 * Sustituye al contador de ventana fija por algoritmos de verdad:
 *
 *   1. Cubo de fichas por IP y zona (token bucket): el ritmo se mide de forma continua,
 *      así que una ráfaga a caballo entre dos minutos ya no cuela el doble.
 *   2. Puntuación de comportamiento: cada petición suma o resta puntos según muchas
 *      señales (ritmo, 404, rutas sensibles, cabeceras, método, enumeración…).
 *   3. Reputación local con decaimiento exponencial (vida media configurable por filtro):
 *      la sospecha baja sola con el tiempo. Tres escalones: ralentizar → 429 → lista negra.
 *   4. Fuerza bruta repartida: los fallos de acceso se cuentan también por usuario y por
 *      rango de red, para pillar 50 IP distintas probando la misma cuenta.
 *   5. Trampa: campo oculto en el formulario de acceso y ruta señuelo anunciada solo en
 *      robots.txt. Quien cae, a la lista negra un rato.
 *
 * Reglas de la casa:
 *   - Ni una sola llamada de red. Nada sale del servidor.
 *   - Ni eval, ni create_function, ni base64_decode de código, ni extract, ni unserialize
 *     de datos externos, ni assert, ni variables variables.
 *   - Ningún parámetro de URL, cabecera, usuario, rol ni endpoint que salte la protección.
 *   - Las IP no se guardan enteras (solo un hash con la sal del sitio) ni más de 24 h.
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/security-rules.php';

/**
 * Almacén compartido de estado, de coste constante y sin escribir en la base de datos
 * en cada petición.
 *
 * Elige el mejor sitio disponible, por este orden:
 *   apcu          → memoria compartida del propio PHP (lo más rápido).
 *   objectcache   → caché de objetos persistente (Redis, Memcached) si la hay.
 *   file          → 64 archivos JSON en wp-content/cache/kp/shield, con cerrojo.
 *   db            → transitorios (último recurso, si no se puede escribir en disco).
 */
final class KP_Shield_Store {

	const SHARDS = 64;
	const CAP    = 400;
	const GROUP  = 'kp_shield';

	/** @var string|null */
	private static $mode = null;

	/** @var string|null */
	private static $dir = null;

	/** @var int|null */
	private static $gen = null;

	/** Dónde se está guardando el estado ahora mismo. */
	public static function mode() {
		if ( null !== self::$mode ) {
			return self::$mode;
		}
		if ( function_exists( 'apcu_fetch' ) && function_exists( 'apcu_store' ) && filter_var( ini_get( 'apc.enabled' ), FILTER_VALIDATE_BOOLEAN ) ) {
			self::$mode = 'apcu';
		} elseif ( function_exists( 'wp_using_ext_object_cache' ) && wp_using_ext_object_cache() ) {
			self::$mode = 'objectcache';
		} elseif ( self::dir() ) {
			self::$mode = 'file';
		} else {
			self::$mode = 'db';
		}
		return self::$mode;
	}

	/** Nombre legible del almacén, para la tarjeta de estado del panel. */
	public static function mode_label() {
		$m = array(
			'apcu'        => 'memoria del servidor',
			'objectcache' => 'caché de objetos',
			'file'        => 'archivos en disco',
			'db'          => 'base de datos',
		);
		$k = self::mode();
		return isset( $m[ $k ] ) ? $m[ $k ] : $k;
	}

	/** Carpeta del almacén de archivos, o '' si no se puede usar. */
	private static function dir() {
		if ( null !== self::$dir ) {
			return self::$dir;
		}
		self::$dir = '';
		if ( ! defined( 'WP_CONTENT_DIR' ) ) {
			return self::$dir;
		}
		$d = WP_CONTENT_DIR . '/cache/kp/shield';
		if ( ! is_dir( $d ) ) {
			if ( ! wp_mkdir_p( $d ) ) {
				return self::$dir;
			}
			// La carpeta no debe poder leerse desde la web.
			@file_put_contents( $d . '/.htaccess', "<IfModule mod_authz_core.c>\n\tRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n\tOrder allow,deny\n\tDeny from all\n</IfModule>\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions, WordPress.PHP.NoSilencedErrors
			@file_put_contents( $d . '/index.html', '' ); // phpcs:ignore WordPress.WP.AlternativeFunctions, WordPress.PHP.NoSilencedErrors
		}
		if ( is_writable( $d ) ) {
			self::$dir = $d;
		}
		return self::$dir;
	}

	/**
	 * Generación del almacén. Al vaciarlo se sube este número y todas las claves
	 * anteriores dejan de encontrarse, sea cual sea el almacén.
	 */
	private static function gen() {
		if ( null === self::$gen ) {
			self::$gen = (int) get_option( 'kp_shield_gen', 1 );
		}
		return self::$gen;
	}

	private static function k( $key ) {
		return 'kps' . self::gen() . '_' . $key;
	}

	/**
	 * Lee, deja que la función modifique y vuelve a escribir.
	 *
	 * @param string   $key Clave (ya sin datos personales: es un hash).
	 * @param callable $fn  Recibe el valor actual (array|null) y devuelve el nuevo (array|null para borrar).
	 * @param int      $ttl Segundos de vida. Nunca más de 24 h.
	 * @return array|null El valor nuevo.
	 */
	public static function edit( $key, $fn, $ttl ) {
		$ttl = max( 60, min( DAY_IN_SECONDS, (int) $ttl ) );
		$k   = self::k( $key );

		switch ( self::mode() ) {
			case 'apcu':
				$cur = apcu_fetch( $k, $ok );
				$new = call_user_func( $fn, ( $ok && is_array( $cur ) ) ? $cur : null );
				if ( null === $new ) {
					apcu_delete( $k );
				} else {
					apcu_store( $k, $new, $ttl );
				}
				return $new;

			case 'objectcache':
				$cur = wp_cache_get( $k, self::GROUP );
				$new = call_user_func( $fn, is_array( $cur ) ? $cur : null );
				if ( null === $new ) {
					wp_cache_delete( $k, self::GROUP );
				} else {
					wp_cache_set( $k, $new, self::GROUP, $ttl );
				}
				return $new;

			case 'file':
				return self::file_edit( $k, $fn, $ttl );
		}

		$cur = get_transient( $k );
		$new = call_user_func( $fn, is_array( $cur ) ? $cur : null );
		if ( null === $new ) {
			delete_transient( $k );
		} else {
			set_transient( $k, $new, $ttl );
		}
		return $new;
	}

	/** Solo lectura, sin escribir nada. */
	public static function read( $key ) {
		$k = self::k( $key );

		switch ( self::mode() ) {
			case 'apcu':
				$v = apcu_fetch( $k, $ok );
				return ( $ok && is_array( $v ) ) ? $v : null;

			case 'objectcache':
				$v = wp_cache_get( $k, self::GROUP );
				return is_array( $v ) ? $v : null;

			case 'file':
				$dir = self::dir();
				if ( ! $dir ) {
					return null;
				}
				$f = $dir . '/s' . ( abs( crc32( $k ) ) % self::SHARDS ) . '.json';
				if ( ! is_readable( $f ) ) {
					return null;
				}
				$raw = (string) @file_get_contents( $f ); // phpcs:ignore WordPress.WP.AlternativeFunctions, WordPress.PHP.NoSilencedErrors
				$all = json_decode( $raw, true );
				if ( ! is_array( $all ) || ! isset( $all[ $k ]['e'], $all[ $k ]['v'] ) ) {
					return null;
				}
				return ( (int) $all[ $k ]['e'] > time() && is_array( $all[ $k ]['v'] ) ) ? $all[ $k ]['v'] : null;
		}

		$v = get_transient( $k );
		return is_array( $v ) ? $v : null;
	}

	/** Olvida una clave. */
	public static function forget( $key ) {
		self::edit(
			$key,
			function () {
				return null;
			},
			300
		);
	}

	/** Lectura-modificación-escritura con cerrojo sobre el fragmento correspondiente. */
	private static function file_edit( $k, $fn, $ttl ) {
		$dir = self::dir();
		if ( ! $dir ) {
			return call_user_func( $fn, null );
		}
		$f = $dir . '/s' . ( abs( crc32( $k ) ) % self::SHARDS ) . '.json';
		$h = @fopen( $f, 'c+' ); // phpcs:ignore WordPress.WP.AlternativeFunctions, WordPress.PHP.NoSilencedErrors
		if ( ! $h ) {
			return call_user_func( $fn, null );
		}
		@flock( $h, LOCK_EX ); // phpcs:ignore WordPress.PHP.NoSilencedErrors

		$raw = '';
		while ( ! feof( $h ) ) {
			$chunk = fread( $h, 16384 ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			if ( false === $chunk ) {
				break;
			}
			$raw .= $chunk;
		}
		// json_decode, nunca unserialize: aquí solo entran datos, no objetos.
		$all = json_decode( $raw, true );
		if ( ! is_array( $all ) ) {
			$all = array();
		}

		$now = time();
		$cur = ( isset( $all[ $k ]['e'], $all[ $k ]['v'] ) && (int) $all[ $k ]['e'] > $now && is_array( $all[ $k ]['v'] ) )
			? $all[ $k ]['v'] : null;

		$new = call_user_func( $fn, $cur );

		if ( null === $new ) {
			unset( $all[ $k ] );
		} else {
			$all[ $k ] = array(
				'e' => $now + $ttl,
				'v' => $new,
			);
		}

		// Poda: caducados y, si aún sobran, los que antes caducan. Memoria acotada.
		foreach ( $all as $key => $v ) {
			if ( ! isset( $v['e'] ) || (int) $v['e'] <= $now ) {
				unset( $all[ $key ] );
			}
		}
		if ( count( $all ) > self::CAP ) {
			uasort(
				$all,
				function ( $a, $b ) {
					return (int) $b['e'] - (int) $a['e'];
				}
			);
			$all = array_slice( $all, 0, (int) ( self::CAP * 0.75 ), true );
		}

		rewind( $h );
		ftruncate( $h, 0 );
		fwrite( $h, (string) wp_json_encode( $all ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		fflush( $h );
		@flock( $h, LOCK_UN ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		fclose( $h ); // phpcs:ignore WordPress.WP.AlternativeFunctions

		return $new;
	}

	/** Olvida todo lo guardado: sube la generación y borra los archivos. */
	public static function flush() {
		self::$gen = self::gen() + 1;
		update_option( 'kp_shield_gen', self::$gen, true );
		$dir = self::dir();
		if ( $dir ) {
			for ( $i = 0; $i < self::SHARDS; $i++ ) {
				$f = $dir . '/s' . $i . '.json';
				if ( file_exists( $f ) ) {
					@unlink( $f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
				}
			}
		}
	}
}

/**
 * Motor de detección: puntuación, reputación y escalones de respuesta.
 */
final class KP_Shield_Detect {

	/** Vida media de la reputación (segundos): en este tiempo la puntuación se reduce a la mitad. */
	const HALF = 900;

	/** Duración de la lista negra según cuántas veces haya reincidido: 5 min, 20 min, 1 h, 6 h. */
	private static $locks = array( 300, 1200, 3600, 21600 );

	private static $path   = '/';
	private static $zone   = 'front';
	private static $ipkey  = '';
	private static $ip     = '';
	private static $active = false;
	private static $done   = false;

	/* ----------------------------------------------------------- ajustes */

	public static function defaults( $d ) {
		return array_merge(
			$d,
			array(
				'det_on'        => 1,  // motor de detección encendido
				'det_sens'      => 3,  // sensibilidad 1 (muy permisivo) a 5 (muy estricto)
				'det_block_min' => 5,  // minutos del primer bloqueo (luego x4, x12, x72)
				'det_slow_ms'   => 600, // milisegundos de freno en el primer escalón
				'det_bf_on'     => 1,  // detectar ataques de acceso repartidos entre muchas IP
				'det_trap_on'   => 1,  // trampa para robots
				'det_proxy'     => 0,  // la web está detrás de Cloudflare u otro proxy
			)
		);
	}

	/** Umbrales de los tres escalones según la sensibilidad elegida. */
	public static function thresholds() {
		$t = array(
			1 => array( 60, 120, 200 ),
			2 => array( 45, 90, 150 ),
			3 => array( 30, 60, 100 ),
			4 => array( 22, 45, 75 ),
			5 => array( 15, 30, 50 ),
		);
		$s = (int) KP_Shield::opt( 'det_sens', 3 );
		$s = max( 1, min( 5, $s ) );
		$v = apply_filters( 'kp_shield_thresholds', $t[ $s ], $s );
		return array(
			'warn'  => (float) $v[0],
			'limit' => (float) $v[1],
			'block' => (float) $v[2],
		);
	}

	private static function half() {
		return max( 60, (int) apply_filters( 'kp_shield_rep_half', self::HALF ) );
	}

	/* -------------------------------------------------------------- boot */

	/**
	 * @param string $path Ruta normalizada de la petición.
	 * @param string $zone front | login | api | admin.
	 * @param bool   $skip La petición está exenta (administrador, arcade, cron…).
	 */
	public static function boot( $path, $zone, $skip ) {
		if ( ! KP_Shield::opt( 'det_on' ) ) {
			return;
		}
		self::$path = (string) $path;
		self::$zone = (string) $zone;

		self::hooks();

		if ( $skip || 'admin' === $zone || self::free( self::$path ) ) {
			return;
		}
		self::$active = true;
		self::$ip     = self::ip();
		self::$ipkey  = 'r:' . self::hash( self::$ip );

		self::analyze();
	}

	/** ¿Está el motor vigilando esta petición? */
	public static function active() {
		return self::$active;
	}

	private static function hooks() {
		if ( KP_Shield::opt( 'det_trap_on' ) ) {
			add_filter( 'robots_txt', array( __CLASS__, 'robots' ), 20, 1 );
			add_action( 'login_form', array( __CLASS__, 'trap_field' ) );
			add_action( 'register_form', array( __CLASS__, 'trap_field' ) );
			add_filter( 'authenticate', array( __CLASS__, 'trap_check' ), 5, 1 );
		}
		add_action( 'wp_login_failed', array( __CLASS__, 'login_failed' ), 5, 1 );
		add_action( 'wp_login', array( __CLASS__, 'login_ok' ), 5, 1 );
		add_filter( 'authenticate', array( __CLASS__, 'gate_user' ), 25, 2 );
		add_action( 'template_redirect', array( __CLASS__, 'maybe_404' ), 1 );
	}

	/* ------------------------------------------------------------- util */

	/**
	 * IP del visitante para el motor.
	 *
	 * Ojo: las cabeceras tipo X-Forwarded-For las escribe quien llama, así que fiarse de
	 * ellas sin más deja que cualquiera se invente una IP distinta en cada petición y se
	 * salte la reputación y la lista negra. Aquí solo se hacen caso cuando la conexión
	 * llega de verdad desde un proxy: o el dueño ha dicho que la web está detrás de uno
	 * (ajuste `det_proxy`), o quien conecta es la propia máquina o la red local.
	 */
	public static function ip() {
		$remote = isset( $_SERVER['REMOTE_ADDR'] ) ? trim( (string) wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		if ( ! filter_var( $remote, FILTER_VALIDATE_IP ) ) {
			$remote = '0.0.0.0';
		}

		$interno = ! filter_var( $remote, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE );
		if ( ! KP_Shield::opt( 'det_proxy' ) && ! $interno ) {
			return $remote;
		}

		foreach ( array( 'HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR' ) as $k ) {
			if ( empty( $_SERVER[ $k ] ) ) {
				continue;
			}
			$v = explode( ',', (string) wp_unslash( $_SERVER[ $k ] ) );
			$v = trim( $v[0] );
			if ( filter_var( $v, FILTER_VALIDATE_IP ) ) {
				return $v;
			}
		}
		return $remote;
	}

	/** Hash con la sal del sitio: nunca se guarda la IP entera. */
	private static function hash( $txt ) {
		return substr( hash_hmac( 'sha256', (string) $txt, wp_salt( 'auth' ) ), 0, 20 );
	}

	/** IP recortada para enseñarla en el panel sin identificar a nadie. */
	private static function mask( $ip ) {
		if ( false !== strpos( $ip, ':' ) ) {
			$p = explode( ':', $ip );
			return implode( ':', array_slice( $p, 0, 3 ) ) . ':…';
		}
		$p = explode( '.', $ip );
		return count( $p ) === 4 ? $p[0] . '.' . $p[1] . '.' . $p[2] . '.x' : '…';
	}

	/** Rango de red: /24 en IPv4, /64 en IPv6. */
	private static function range( $ip ) {
		if ( false !== strpos( $ip, ':' ) ) {
			$p = explode( ':', $ip );
			return implode( ':', array_slice( $p, 0, 4 ) ) . '::/64';
		}
		$p = explode( '.', $ip );
		return count( $p ) === 4 ? $p[0] . '.' . $p[1] . '.' . $p[2] . '.0/24' : $ip;
	}

	/** Rutas del arcade y archivos estáticos: el motor ni las mira. */
	private static function free( $path ) {
		$s = kp_shield_signals();
		$p = strtolower( $path );
		foreach ( (array) $s['free'] as $pref ) {
			if ( 0 === strpos( $p, $pref ) ) {
				return true;
			}
		}
		// Un móvil jugando pide decenas de archivos seguidos: no se puntúan.
		return (bool) preg_match( '#\.(' . $s['static'] . ')$#', $p );
	}

	private static function srv( $k ) {
		return isset( $_SERVER[ $k ] ) ? (string) wp_unslash( $_SERVER[ $k ] ) : '';
	}

	private static function log( $motivo ) {
		if ( KP_Shield::opt( 'log_on' ) ) {
			KP_Shield::log( $motivo );
		}
	}

	private static function stop( $code, $retry, $msg ) {
		if ( class_exists( 'KP_Shield_Security' ) && method_exists( 'KP_Shield_Security', 'stop' ) ) {
			KP_Shield_Security::stop( $code, $retry, $msg );
		}
		// Respaldo por si el módulo principal no estuviera.
		if ( ! headers_sent() ) {
			status_header( (int) $code );
			nocache_headers();
			if ( $retry ) {
				header( 'Retry-After: ' . max( 1, (int) $retry ) );
			}
		}
		echo esc_html( $msg ) . "\n";
		exit;
	}

	/* --------------------------------------------- 1. cubo de fichas */

	/**
	 * Cubo de fichas por IP y zona. Devuelve las fichas que quedan (puede ser negativo).
	 *
	 * El cubo se rellena de forma continua (max/ventana fichas por segundo) y tiene
	 * capacidad `max`. Frente al contador de ventana fija, una ráfaga a caballo entre
	 * dos ventanas ya no cuela el doble: el ritmo medio siempre se respeta.
	 */
	private static function bucket() {
		if ( ! KP_Shield::opt( 'rl_on' ) ) {
			return 1.0;
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
			return 1.0;
		}

		$rate = $max / $win;   // fichas por segundo
		$now  = microtime( true );
		$left = 0.0;

		KP_Shield_Store::edit(
			'b:' . self::$zone . ':' . self::hash( self::$ip ),
			function ( $cur ) use ( $now, $rate, $max, &$left ) {
				$t = ( is_array( $cur ) && isset( $cur['t'] ) ) ? (float) $cur['t'] : $now;
				$n = ( is_array( $cur ) && isset( $cur['n'] ) ) ? (float) $cur['n'] : (float) $max;
				$n = min( (float) $max, $n + max( 0.0, $now - $t ) * $rate );
				$n = $n - 1.0;                       // esta petición gasta una ficha
				$n = max( (float) -$max, $n );       // el descubierto también está acotado
				$left = $n;
				return array(
					't' => $now,
					'n' => $n,
				);
			},
			max( 300, $win * 4 )
		);

		return $left;
	}

	/* ------------------------------------- 2 y 3. puntuación y reputación */

	/**
	 * Suma puntos a la reputación de esta IP, aplicando antes el decaimiento.
	 *
	 * @param float $delta Puntos (pueden ser negativos).
	 * @param array $meta  Datos extra: 'user' (hash de usuario probado), 'q' (suma una
	 *                     petición al recuento), 'f' (suma una página no encontrada).
	 * @return array Registro nuevo.
	 */
	private static function bump( $delta, $meta = array() ) {
		$now  = time();
		$half = self::half();
		$mask = self::mask( self::$ip );
		$out  = array();

		KP_Shield_Store::edit(
			self::$ipkey,
			function ( $cur ) use ( $delta, $meta, $now, $half, $mask, &$out ) {
				$r = is_array( $cur ) ? $cur : array(
					's' => 0.0,
					't' => $now,
					'l' => 0,
					'b' => 0,
					'u' => array(),
					'm' => $mask,
				);
				$dt = max( 0, $now - (int) ( isset( $r['t'] ) ? $r['t'] : $now ) );
				$s  = (float) ( isset( $r['s'] ) ? $r['s'] : 0 );
				// Decaimiento exponencial: la sospecha baja sola con el tiempo.
				$s = $s * pow( 0.5, $dt / $half );

				// Recuento de peticiones y de páginas no encontradas, también con memoria
				// corta: lo que importa no es cuántos 404 ha dado, sino qué parte de lo que
				// pide no existe. Una persona navega y acierta; un rastreador falla casi todo.
				$q = (float) ( isset( $r['q'] ) ? $r['q'] : 0 ) * pow( 0.5, $dt / $half );
				$f = (float) ( isset( $r['f'] ) ? $r['f'] : 0 ) * pow( 0.5, $dt / $half );
				$q += empty( $meta['q'] ) ? 0 : 1;
				$f += empty( $meta['f'] ) ? 0 : 1;
				$r['q'] = round( $q, 2 );
				$r['f'] = round( $f, 2 );
				if ( $q >= 8 && ( $f / $q ) > 0.55 ) {
					$delta += 8;   // casi nada de lo que pide existe
				}

				$s = max( 0.0, $s + (float) $delta );
				$s = min( 5000.0, $s );

				$r['s'] = round( $s, 2 );
				$r['t'] = $now;
				$r['m'] = $mask;

				if ( ! empty( $meta['user'] ) ) {
					$u = isset( $r['u'] ) && is_array( $r['u'] ) ? $r['u'] : array();
					if ( ! in_array( $meta['user'], $u, true ) ) {
						$u[] = $meta['user'];
					}
					$r['u'] = array_slice( $u, -10 );
				}
				$out = $r;
				return $r;
			},
			DAY_IN_SECONDS
		);

		return $out;
	}

	/** Reputación actual ya decaída, sin escribir. */
	private static function score( $r ) {
		if ( ! is_array( $r ) ) {
			return 0.0;
		}
		$dt = max( 0, time() - (int) ( isset( $r['t'] ) ? $r['t'] : 0 ) );
		return (float) ( isset( $r['s'] ) ? $r['s'] : 0 ) * pow( 0.5, $dt / self::half() );
	}

	/** Señales de esta petición → puntos. */
	private static function signals( $left ) {
		$g = kp_shield_signals();
		$w = $g['w'];
		$d = 0.0;

		$ua     = self::srv( 'HTTP_USER_AGENT' );
		$lang   = self::srv( 'HTTP_ACCEPT_LANGUAGE' );
		$cookie = self::srv( 'HTTP_COOKIE' );
		$method = strtoupper( self::srv( 'REQUEST_METHOD' ) );
		$path   = strtolower( self::$path );
		$limpio = true;

		if ( '' === trim( $ua ) ) {
			$d      += $w['ua_empty'];
			$limpio  = false;
		} elseif ( preg_match( '#(' . $g['tool'] . ')#i', $ua ) ) {
			$d      += $w['ua_tool'];
			$limpio  = false;
		}
		if ( '' === trim( $lang ) ) {
			$d      += $w['nolang'];
			$limpio  = false;
		}
		if ( '' === trim( $cookie ) ) {
			$d += $w['nocookie'];
		}
		if ( '' !== $method && ! in_array( $method, (array) $g['methods'], true ) ) {
			$d      += $w['method'];
			$limpio  = false;
		}
		if ( preg_match( '#' . $g['sens'] . '#i', $path ) ) {
			$d      += $w['sens'];
			$limpio  = false;
		}
		// Enumeración de autores: ?author=N sin haber entrado.
		if ( isset( $_GET['author'] ) && is_numeric( wp_unslash( $_GET['author'] ) ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			$d      += $w['enum'];
			$limpio  = false;
		}
		if ( $left < 0 ) {
			$d      += $w['burst'];
			$limpio  = false;
		}
		if ( $limpio ) {
			$d += $w['ok'];   // petición con pinta de navegador: la sospecha baja
		}
		return $d;
	}

	/* ------------------------------------------------- análisis y escalones */

	private static function analyze() {
		if ( self::$done ) {
			return;
		}
		self::$done = true;

		// Trampa: la ruta señuelo solo aparece en robots.txt, nadie real la pide.
		if ( KP_Shield::opt( 'det_trap_on' ) && trim( self::$path, '/' ) === self::decoy() ) {
			self::trap( 'ruta' );
		}

		$r = KP_Shield_Store::read( self::$ipkey );

		// Lista negra temporal: se responde antes de tocar nada más.
		if ( is_array( $r ) && ! empty( $r['b'] ) && (int) $r['b'] > time() ) {
			self::log( 'det:negra' );
			self::stop(
				403,
				min( HOUR_IN_SECONDS, (int) $r['b'] - time() ),
				__( 'Acceso bloqueado temporalmente por actividad automática. Vuelve a intentarlo más tarde.', 'kuboplay-shield' )
			);
		}

		$left = self::bucket();
		$r    = self::bump( self::signals( $left ), array( 'q' => 1 ) );
		self::enforce( $r );
	}

	/** Los tres escalones: frenar → 429 → lista negra. */
	private static function enforce( $r ) {
		$t = self::thresholds();
		$s = self::score( $r );

		if ( $s >= $t['block'] ) {
			self::blacklist();
			return;
		}
		if ( $s >= $t['limit'] ) {
			self::log( 'det:429' );
			self::stop(
				429,
				self::cooldown( $s, $t['limit'] ),
				__( 'Demasiadas peticiones seguidas. Espera unos segundos y vuelve a probar.', 'kuboplay-shield' )
			);
		}
		if ( $s >= $t['warn'] ) {
			// Primer escalón: solo se frena. Una persona no lo nota; un robot pierde el ritmo.
			$ms = max( 0, min( 2000, (int) KP_Shield::opt( 'det_slow_ms', 600 ) ) );
			if ( $ms > 0 ) {
				usleep( $ms * 1000 );
			}
			self::log( 'det:freno' );
		}
	}

	/** Segundos que faltan para que la puntuación baje del umbral (para Retry-After). */
	private static function cooldown( $s, $limit ) {
		if ( $s <= $limit || $limit <= 0 ) {
			return 10;
		}
		$secs = self::half() * ( log( $s / $limit ) / log( 2 ) );
		// Se dice un rato razonable aunque la sospecha tarde más en bajar: quien espera
		// y vuelve despacio deja de sumar puntos y sale solo del escalón.
		return (int) max( 5, min( 120, ceil( $secs ) ) );
	}

	/** Pasa la IP a la lista negra por un rato y corta la petición. */
	private static function blacklist() {
		$mins  = max( 1, (int) KP_Shield::opt( 'det_block_min', 5 ) );
		$base  = $mins * MINUTE_IN_SECONDS;
		$tabla = apply_filters( 'kp_shield_block_secs', array( $base, $base * 4, $base * 12, $base * 72 ) );
		$now   = time();
		$secs  = $base;
		$mask  = self::mask( self::$ip );

		KP_Shield_Store::edit(
			self::$ipkey,
			function ( $cur ) use ( $tabla, $now, &$secs, $mask ) {
				$r = is_array( $cur ) ? $cur : array( 's' => 0.0 );
				$l = isset( $r['l'] ) ? (int) $r['l'] : 0;
				$i = min( count( $tabla ) - 1, max( 0, $l ) );
				// Nada vive más de 24 h, ni siquiera un bloqueo largo.
				$secs   = (int) min( DAY_IN_SECONDS, $tabla[ $i ] );
				$r['b'] = $now + $secs;
				$r['l'] = $l + 1;
				$r['m'] = $mask;
				$r['t'] = $now;
				return $r;
			},
			DAY_IN_SECONDS
		);

		self::watch( $mask, 'negra', $now + $secs );
		self::log( 'det:bloqueo' );
		self::stop(
			403,
			min( HOUR_IN_SECONDS, $secs ),
			__( 'Acceso bloqueado temporalmente por actividad automática. Vuelve a intentarlo más tarde.', 'kuboplay-shield' )
		);
	}

	/**
	 * Suma puntos desde fuera (cortafuegos, 404, fallo de acceso) y aplica los escalones.
	 *
	 * @param string $senal Clave de kp_shield_signals()['w'].
	 * @param float  $mult  Multiplicador.
	 * @param array  $meta  Datos extra para el registro (ver bump()).
	 */
	public static function penalize( $senal, $mult = 1, $meta = array() ) {
		if ( ! self::$active ) {
			return;
		}
		$w = kp_shield_signals();
		if ( ! isset( $w['w'][ $senal ] ) ) {
			return;
		}
		$r = self::bump( $w['w'][ $senal ] * (float) $mult, $meta );
		$t = self::thresholds();
		if ( self::score( $r ) >= $t['warn'] ) {
			self::mark_watch( $r );
		}
		self::enforce( $r );
	}

	/** Página no encontrada: señal clásica de rastreo a ciegas. */
	public static function maybe_404() {
		if ( self::$active && function_exists( 'is_404' ) && is_404() ) {
			self::penalize( 'notfound', 1, array( 'f' => 1 ) );
		}
	}

	/* ---------------------------------------- 4. fuerza bruta repartida */

	/** Fallo de acceso: se cuenta por IP, por usuario y por rango de red. */
	public static function login_failed( $username ) {
		$user = strtolower( trim( (string) $username ) );
		$uh   = self::hash( 'u|' . $user );

		if ( self::$active ) {
			$r = self::bump( kp_shield_signals()['w']['loginfail'], array( 'user' => $uh ) );
			// La misma IP probando muchos usuarios distintos: eso no lo hace una persona.
			$n = isset( $r['u'] ) && is_array( $r['u'] ) ? count( $r['u'] ) : 0;
			if ( $n > 3 ) {
				$r = self::bump( kp_shield_signals()['w']['multiuser'] );
			}
			if ( self::score( $r ) >= self::thresholds()['warn'] ) {
				self::mark_watch( $r );
			}
		}

		if ( ! KP_Shield::opt( 'det_bf_on' ) ) {
			return;
		}

		$ip   = self::$ip ? self::$ip : self::ip();
		$iph  = self::hash( $ip );
		$now  = time();
		$win  = max( 300, (int) KP_Shield::opt( 'login_window', 900 ) );
		$maxu = (int) apply_filters( 'kp_shield_bf_user_max', 20 );
		$maxi = (int) apply_filters( 'kp_shield_bf_ips', 5 );

		// Contador por usuario, con las IP distintas que lo han probado (solo hashes).
		$bajo = false;
		KP_Shield_Store::edit(
			'u:' . $uh,
			function ( $cur ) use ( $now, $win, $iph, $maxu, $maxi, &$bajo ) {
				$r  = is_array( $cur ) ? $cur : array(
					'n' => 0,
					't' => $now,
					'i' => array(),
					'a' => 0,
				);
				$dt = max( 0, $now - (int) $r['t'] );
				// Ventana deslizante: el contador se va vaciando solo, no salta de golpe.
				$r['n'] = max( 0.0, (float) $r['n'] * max( 0.0, 1 - ( $dt / $win ) ) ) + 1;
				$r['t'] = $now;
				$ips    = is_array( $r['i'] ) ? $r['i'] : array();
				if ( ! in_array( $iph, $ips, true ) ) {
					$ips[] = $iph;
				}
				$r['i'] = array_slice( $ips, -32 );

				if ( $r['n'] >= $maxu || ( count( $r['i'] ) >= $maxi && $r['n'] >= 6 ) ) {
					$r['a'] = $now + 900;   // esta cuenta está bajo ataque durante 15 min
				}
				$bajo = ( (int) $r['a'] > $now );
				return $r;
			},
			DAY_IN_SECONDS
		);

		// Contador por rango de red: 50 IP del mismo /24 son un solo atacante.
		$rango = 0.0;
		KP_Shield_Store::edit(
			'n:' . self::hash( 'net|' . self::range( $ip ) ),
			function ( $cur ) use ( $now, $win, &$rango ) {
				$r      = is_array( $cur ) ? $cur : array(
					'n' => 0,
					't' => $now,
				);
				$dt     = max( 0, $now - (int) $r['t'] );
				$r['n'] = max( 0.0, (float) $r['n'] * max( 0.0, 1 - ( $dt / $win ) ) ) + 1;
				$r['t'] = $now;
				$rango  = (float) $r['n'];
				return $r;
			},
			DAY_IN_SECONDS
		);

		if ( $rango >= (float) apply_filters( 'kp_shield_bf_net_max', 30 ) && self::$active ) {
			self::penalize( 'net' );
		}
		if ( $bajo ) {
			self::log( 'det:bf' );
		}
	}

	/** Acceso correcto: se perdona a esa IP y se olvida el ataque contra esa cuenta. */
	public static function login_ok( $login ) {
		KP_Shield_Store::forget( 'u:' . self::hash( 'u|' . strtolower( trim( (string) $login ) ) ) );
		if ( ! self::$ipkey ) {
			return;
		}
		// Se le pone la sospecha a cero, pero se le guarda el historial de bloqueos: así,
		// tener una cuenta del sitio no sirve para borrar el rastro y volver a empezar.
		$now = time();
		KP_Shield_Store::edit(
			self::$ipkey,
			function ( $cur ) use ( $now ) {
				if ( ! is_array( $cur ) ) {
					return null;
				}
				$cur['s'] = 0.0;
				$cur['q'] = 0;
				$cur['f'] = 0;
				$cur['u'] = array();
				$cur['t'] = $now;
				return $cur;
			},
			DAY_IN_SECONDS
		);
	}

	/**
	 * Cuenta bajo ataque repartido.
	 *
	 * No se bloquea la cuenta (sería regalarle al atacante la forma de dejar fuera al
	 * dueño): solo se rechaza a quien ya tiene mala reputación y se frena al resto.
	 */
	public static function gate_user( $user, $username = '' ) {
		if ( ! KP_Shield::opt( 'det_bf_on' ) || '' === (string) $username ) {
			return $user;
		}
		$r = KP_Shield_Store::read( 'u:' . self::hash( 'u|' . strtolower( trim( (string) $username ) ) ) );
		if ( ! is_array( $r ) || empty( $r['a'] ) || (int) $r['a'] <= time() ) {
			return $user;
		}

		$rep = self::score( KP_Shield_Store::read( self::$ipkey ? self::$ipkey : 'r:' . self::hash( self::ip() ) ) );
		if ( $rep >= self::thresholds()['warn'] ) {
			self::log( 'det:bf-rechazo' );
			return new WP_Error(
				'kp_shield_bf',
				__( '<strong>Error</strong>: usuario o contraseña incorrectos.', 'kuboplay-shield' )
			);
		}
		// Conexión limpia: entra, pero despacio, para que el ataque no gane velocidad.
		// Corto a propósito: alargarlo mucho dejaría a PHP sin sitio para atender al resto.
		usleep( 800000 );
		return $user;
	}

	/* ----------------------------------------------------- 5. la trampa */

	/** Nombre de la ruta señuelo, distinto en cada sitio (deriva de la sal). */
	public static function decoy() {
		return 'panel-' . substr( hash_hmac( 'sha256', 'kp-decoy', wp_salt( 'auth' ) ), 0, 10 );
	}

	/** Nombre del campo trampa del formulario de acceso. */
	private static function trap_name() {
		return 'kp_' . substr( hash_hmac( 'sha256', 'kp-trap', wp_salt( 'auth' ) ), 0, 8 );
	}

	/** Se anuncia el señuelo solo aquí: quien lo pide es que lee robots.txt para atacar. */
	public static function robots( $txt ) {
		return $txt . "\nDisallow: /" . self::decoy() . "/\n";
	}

	/**
	 * Campo trampa: invisible para las personas (oculto por CSS) y anunciado como
	 * decorativo a los lectores de pantalla (aria-hidden + tabindex -1), así que
	 * nadie real lo rellena. Los robots que envían todos los campos, sí.
	 */
	public static function trap_field() {
		printf(
			'<p aria-hidden="true" style="position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%%);white-space:nowrap">'
			. '<label for="%1$s">%2$s</label>'
			. '<input type="text" name="%1$s" id="%1$s" value="" tabindex="-1" autocomplete="off"></p>',
			esc_attr( self::trap_name() ),
			esc_html__( 'Deja este campo vacío', 'kuboplay-shield' )
		);
	}

	public static function trap_check( $user ) {
		$n = self::trap_name();
		if ( isset( $_POST[ $n ] ) && '' !== trim( (string) wp_unslash( $_POST[ $n ] ) ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			self::trap( 'campo' );
		}
		return $user;
	}

	/** Ha caído en la trampa: a la lista negra. */
	private static function trap( $donde ) {
		if ( ! self::$ip ) {
			self::$ip    = self::ip();
			self::$ipkey = 'r:' . self::hash( self::$ip );
		}
		self::$active = true;
		self::bump( kp_shield_signals()['w']['trap'] );
		self::log( 'det:trampa:' . $donde );
		self::blacklist();
	}

	/* ------------------------------------------ lista visible en el panel */

	private static function mark_watch( $r ) {
		if ( ! is_array( $r ) ) {
			return;
		}
		self::watch(
			isset( $r['m'] ) ? (string) $r['m'] : '…',
			'vigilada',
			0,
			self::score( $r )
		);
	}

	/**
	 * Apunta la conexión en la lista que se ve en el panel.
	 *
	 * Solo se escribe cuando cambia de estado (no en cada petición), guarda la IP
	 * recortada y nunca más de 24 h ni más de 40 entradas.
	 */
	private static function watch( $mask, $estado, $hasta = 0, $puntos = 0 ) {
		$k    = self::hash( self::$ip );
		$now  = time();
		$list = (array) get_option( 'kp_shield_watch', array() );

		if ( isset( $list[ $k ] ) && 'vigilada' === $estado && 'negra' === ( isset( $list[ $k ]['e'] ) ? $list[ $k ]['e'] : '' ) && (int) $list[ $k ]['h'] > $now ) {
			return; // Ya está en la negra: no se rebaja a vigilada.
		}
		if ( isset( $list[ $k ] ) && $list[ $k ]['e'] === $estado && ( $now - (int) $list[ $k ]['t'] ) < 300 ) {
			return; // Sin novedad: no se escribe.
		}

		$list[ $k ] = array(
			'm' => (string) $mask,
			'e' => (string) $estado,
			't' => $now,
			'h' => (int) $hasta,
			'p' => round( (float) $puntos, 1 ),
		);

		foreach ( $list as $key => $v ) {
			if ( ! is_array( $v ) || ( $now - (int) $v['t'] ) > DAY_IN_SECONDS ) {
				unset( $list[ $key ] );
			}
		}
		if ( count( $list ) > 40 ) {
			uasort(
				$list,
				function ( $a, $b ) {
					return (int) $b['t'] - (int) $a['t'];
				}
			);
			$list = array_slice( $list, 0, 40, true );
		}
		update_option( 'kp_shield_watch', $list, false );
	}

	/** Lista para el panel, ya podada. */
	public static function watch_list() {
		$now  = time();
		$list = (array) get_option( 'kp_shield_watch', array() );
		$out  = array();
		foreach ( $list as $v ) {
			if ( is_array( $v ) && isset( $v['t'] ) && ( $now - (int) $v['t'] ) <= DAY_IN_SECONDS ) {
				$out[] = $v;
			}
		}
		usort(
			$out,
			function ( $a, $b ) {
				return (int) $b['t'] - (int) $a['t'];
			}
		);
		return $out;
	}

	/** Botón del panel: olvidar todo lo aprendido. */
	public static function tool_reset() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		KP_Shield_Store::flush();
		delete_option( 'kp_shield_watch' );
	}

	/* -------------------------------------------------------- el panel */

	public static function fields( $f ) {
		$f['seguridad'][] = array(
			'key'     => 'det_on',
			'label'   => 'Vigilancia inteligente',
			'desc'    => 'En vez de un único límite, mira cómo se comporta cada conexión (ritmo, páginas que no existen, direcciones raras, falta de idioma o de navegador) y va sumando sospecha. Primero la frena, luego le pide que espere y, solo si insiste, la bloquea un rato. La sospecha baja sola con el tiempo. Los juegos, el modo tele y los mandos quedan siempre fuera.',
			'type'    => 'switch',
			'default' => 1,
		);
		$f['seguridad'][] = array(
			'key'     => 'det_sens',
			'label'   => 'Sensibilidad de la vigilancia',
			'desc'    => 'Del 1 (solo avisa de lo muy evidente) al 5 (muy estricto). 3 es lo recomendado. Si alguien te dice que la web le va lenta a ratos, baja a 2.',
			'type'    => 'number',
			'default' => 3,
			'min'     => 1,
			'max'     => 5,
			'suffix'  => 'de 5',
		);
		$f['seguridad'][] = array(
			'key'     => 'det_block_min',
			'label'   => 'Minutos del primer bloqueo',
			'desc'    => 'Cuando una conexión se pasa de la raya, se queda fuera este rato. Si vuelve a las andadas, el siguiente bloqueo es cuatro veces más largo, y así.',
			'type'    => 'number',
			'default' => 5,
			'min'     => 1,
			'max'     => 120,
			'suffix'  => 'minutos',
		);
		$f['seguridad'][] = array(
			'key'     => 'det_slow_ms',
			'label'   => 'Freno del primer aviso',
			'desc'    => 'Lo que se hace esperar a una conexión sospechosa antes de responderle. Medio segundo no lo nota una persona y le estropea el ritmo a un robot. Pon 0 para no frenar.',
			'type'    => 'number',
			'default' => 600,
			'min'     => 0,
			'max'     => 2000,
			'suffix'  => 'milisegundos',
		);
		$f['seguridad'][] = array(
			'key'     => 'det_bf_on',
			'label'   => 'Detectar ataques repartidos',
			'desc'    => 'Cuenta los fallos de contraseña también por cuenta y por barrio de internet, no solo por conexión. Así se ve cuando cincuenta ordenadores distintos prueban la misma cuenta. Tu cuenta nunca se cierra por esto: solo se rechaza a quien ya venía haciendo cosas raras.',
			'type'    => 'switch',
			'default' => 1,
		);
		$f['seguridad'][] = array(
			'key'     => 'det_proxy',
			'label'   => 'La web está detrás de Cloudflare',
			'desc'    => 'Enciéndelo solo si has puesto Cloudflare (o algo parecido) delante de la web. Sirve para saber quién es cada visitante de verdad. Si lo enciendes sin tenerlo, cualquiera podría decir que es otra persona y esquivar los bloqueos; si lo dejas apagado teniéndolo, verás a todo el mundo como si fuera la misma conexión.',
			'type'    => 'switch',
			'default' => 0,
		);
		$f['seguridad'][] = array(
			'key'     => 'det_trap_on',
			'label'   => 'Trampa para robots',
			'desc'    => 'Pone un campo invisible en la pantalla de acceso y una dirección señuelo que solo aparece en el archivo que leen los buscadores. Ninguna persona los toca; quien cae, se bloquea un rato. No molesta a los lectores de pantalla.',
			'type'    => 'switch',
			'default' => 1,
		);
		return $f;
	}

	public static function tools( $t ) {
		$t[] = array(
			'key'   => 'sec_rep_reset',
			'label' => 'Olvidar conexiones vigiladas',
		);
		return $t;
	}

	public static function panels( $p ) {
		if ( ! KP_Shield::opt( 'det_on' ) ) {
			return $p;
		}
		$rows = self::watch_list();
		$now  = time();

		$html = '<p>' . esc_html__( 'Conexiones que la vigilancia ha marcado en las últimas 24 horas. Las direcciones se guardan recortadas: no se identifica a nadie.', 'kuboplay-shield' ) . '</p>';

		if ( ! $rows ) {
			$html .= '<p><em>' . esc_html__( 'Ninguna por ahora. Es buena señal.', 'kuboplay-shield' ) . '</em></p>';
		} else {
			$html .= '<table class="widefat striped"><thead><tr>'
				. '<th>' . esc_html__( 'Conexión', 'kuboplay-shield' ) . '</th>'
				. '<th>' . esc_html__( 'Estado', 'kuboplay-shield' ) . '</th>'
				. '<th>' . esc_html__( 'Sospecha', 'kuboplay-shield' ) . '</th>'
				. '<th>' . esc_html__( 'Cuándo', 'kuboplay-shield' ) . '</th>'
				. '</tr></thead><tbody>';
			foreach ( $rows as $r ) {
				$estado = ( 'negra' === $r['e'] && (int) $r['h'] > $now )
					? sprintf(
						/* translators: %d: minutos que quedan de bloqueo. */
						__( 'Bloqueada (%d min)', 'kuboplay-shield' ),
						max( 1, (int) ceil( ( (int) $r['h'] - $now ) / 60 ) )
					)
					: ( 'negra' === $r['e'] ? __( 'Bloqueo terminado', 'kuboplay-shield' ) : __( 'Vigilada', 'kuboplay-shield' ) );

				$html .= '<tr>'
					. '<td><code>' . esc_html( $r['m'] ) . '</code></td>'
					. '<td>' . esc_html( $estado ) . '</td>'
					. '<td>' . esc_html( (string) $r['p'] ) . '</td>'
					. '<td>' . esc_html( human_time_diff( (int) $r['t'], $now ) ) . '</td>'
					. '</tr>';
			}
			$html .= '</tbody></table>';
		}

		$html .= '<p class="description">' . esc_html(
			sprintf(
				/* translators: %s: dónde se guarda el estado. */
				__( 'El estado de la vigilancia se guarda en %s y se olvida solo.', 'kuboplay-shield' ),
				KP_Shield_Store::mode_label()
			)
		) . '</p>';

		$p[] = array(
			'tab'   => 'seguridad',
			'title' => __( 'Conexiones vigiladas', 'kuboplay-shield' ),
			'html'  => $html,
			'order' => 20,
		);
		return $p;
	}
}

add_filter( 'kp_shield_defaults', array( 'KP_Shield_Detect', 'defaults' ) );
// Prioridad 20: los campos de la vigilancia se pintan detrás de los de admin/fields.php.
add_filter( 'kp_shield_fields', array( 'KP_Shield_Detect', 'fields' ), 20 );
add_filter( 'kp_shield_tools', array( 'KP_Shield_Detect', 'tools' ) );
add_filter( 'kp_shield_panels', array( 'KP_Shield_Detect', 'panels' ) );
add_action( 'kp_shield_tool_sec_rep_reset', array( 'KP_Shield_Detect', 'tool_reset' ) );
