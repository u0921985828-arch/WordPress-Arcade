<?php
/**
 * Kuboplay Shield — módulo PHP (optimización del servidor).
 *
 * Tercera capa del plugin, independiente de seguridad y de la caché de páginas:
 *
 *   1. Caché de objetos en ficheros (drop-in object-cache.php). En hostings
 *      compartidos como IONOS no hay Redis ni Memcached; esto hace el mismo
 *      papel con ficheros: lo que WordPress calcula una vez se reaprovecha.
 *   2. OPcache: detección, aviso si está apagado y botón «Vaciar OPcache»
 *      (también se vacía solo al actualizar plugins, temas o WordPress).
 *   3. Diagnóstico de PHP en castellano llano (solo lectura, sin red).
 *   4. Freno a lo que come PHP en cada petición: wp-cron, Heartbeat,
 *      revisiones y un informe de las opciones autocargadas (solo informa).
 *
 * Todo es opt-in, todo se puede apagar y nada sale del servidor: cero llamadas
 * de red, cero telemetría, ningún endpoint ni parámetro de URL propio.
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

// Ojo: no se puede usar class_exists( 'KP_Shield_Php' ) como guarda, porque PHP
// enlaza las clases del nivel superior al compilar y siempre daría true.
if ( ! class_exists( 'KP_Shield' ) || defined( 'KP_SHIELD_PHP' ) ) {
	return;
}
define( 'KP_SHIELD_PHP', true );

final class KP_Shield_Php {

	/** Carpeta del almacén de objetos, relativa a wp-content. */
	const DIR = 'cache/kp-obj';

	/** Versiones de PHP que ya no reciben parches de seguridad. */
	const PHP_MIN = '8.1';

	/* ------------------------------------------------------------ Ajustes */

	public static function defaults( $d ) {
		return array_merge(
			(array) $d,
			array(
				'php_obj'        => 0,     // caché de objetos en ficheros (opt-in)
				'php_obj_ttl'    => 86400, // caducidad en segundos
				'php_obj_max_kb' => 512,   // tope por entrada
				'php_obj_writes' => 300,   // tope de escrituras por petición
				'php_opcache'    => 1,     // vaciar OPcache al actualizar
				'php_diag'       => 1,     // panel de diagnóstico
				'php_cron'       => 0,     // frenar wp-cron
				'php_cron_min'   => 300,   // segundos mínimos entre disparos
				'php_cron_off'   => 0,     // apagar wp-cron por completo (cron real)
				'php_hb'         => 0,     // frenar el Heartbeat
				'php_hb_secs'    => 120,   // segundos entre consultas del escritorio
				'php_rev'        => 0,     // limitar revisiones
				'php_rev_max'    => 5,     // cuántas revisiones se guardan
			)
		);
	}

	/**
	 * Ajustes recién guardados. KP_Shield::opts() se cachea en memoria al primer
	 * uso, así que justo después de guardar aún devuelve los viejos; el array que
	 * trae `kp_shield_saved` es el bueno y manda mientras dure esa llamada.
	 */
	private static $recien = null;

	/**
	 * Valor de un ajuste: el recién guardado, el guardado en la base de datos o,
	 * si todavía no existe, el valor por defecto de este módulo. Lo último importa:
	 * KP_Shield::opts() se congela en memoria en cuanto otro módulo la usa, y este
	 * se carga después, así que sus valores por defecto pueden no estar allí.
	 */
	public static function ajuste( $key, $fallback = null ) {
		if ( is_array( self::$recien ) && array_key_exists( $key, self::$recien ) ) {
			return self::$recien[ $key ];
		}
		$o = KP_Shield::opts();
		if ( is_array( $o ) && array_key_exists( $key, $o ) ) {
			return $o[ $key ];
		}
		$mios = self::defaults( array() );
		if ( array_key_exists( $key, $mios ) ) {
			return $mios[ $key ];
		}
		return $fallback;
	}

	/** ¿Está encendido este ajuste? (respeta la escotilla general). */
	public static function on( $key ) {
		if ( defined( 'KP_SHIELD_OFF' ) && KP_SHIELD_OFF ) {
			return false;
		}
		return (bool) self::ajuste( $key );
	}

	/* ----------------------------------------------------------- Arranque */

	public static function boot() {
		if ( defined( 'KP_SHIELD_OFF' ) && KP_SHIELD_OFF ) {
			return;
		}

		// Panel: campos, pestaña, diagnóstico y herramienta.
		add_filter( 'kp_shield_tabs', array( __CLASS__, 'tab' ) );
		add_filter( 'kp_shield_fields', array( __CLASS__, 'fields' ) );
		add_filter( 'kp_shield_panels', array( __CLASS__, 'panels' ) );
		add_filter( 'kp_shield_tools', array( __CLASS__, 'tools' ) );
		add_action( 'kp_shield_tool_opcache', array( __CLASS__, 'opcache_reset' ) );
		add_filter( 'kp_shield_notices', array( __CLASS__, 'notices' ) );

		// Instalar / desinstalar el drop-in y vaciar.
		add_action( 'kp_shield_saved', array( __CLASS__, 'sync_saved' ), 20 );
		add_action( 'kp_shield_activate', array( __CLASS__, 'activate' ) );
		add_action( 'kp_shield_deactivate', array( __CLASS__, 'deactivate' ) );
		add_action( 'kp_shield_purge', array( __CLASS__, 'purge' ) );
		if ( is_admin() ) {
			add_action( 'admin_init', array( __CLASS__, 'sync_admin' ) );
		}

		// 2. OPcache al actualizar plugins, temas o WordPress.
		if ( self::on( 'php_opcache' ) ) {
			add_action( 'upgrader_process_complete', array( __CLASS__, 'opcache_reset' ), 10, 0 );
		}

		// 4. Freno a lo que come PHP en cada petición.
		if ( self::on( 'php_cron_off' ) ) {
			if ( ! defined( 'DISABLE_WP_CRON' ) ) {
				define( 'DISABLE_WP_CRON', true );
			}
		} elseif ( self::on( 'php_cron' ) ) {
			add_filter( 'pre_transient_doing_cron', array( __CLASS__, 'cron_throttle' ) );
		}

		if ( self::on( 'php_hb' ) ) {
			add_filter( 'heartbeat_settings', array( __CLASS__, 'heartbeat' ), 20 );
			add_action( 'wp_enqueue_scripts', array( __CLASS__, 'heartbeat_front' ), 1 );
		}

		if ( self::on( 'php_rev' ) ) {
			add_filter( 'wp_revisions_to_keep', array( __CLASS__, 'revisions' ), 20, 2 );
		}
	}

	/* ============================================ 1. Caché de objetos */

	public static function dir() {
		return WP_CONTENT_DIR . '/' . self::DIR;
	}

	public static function dropin_path() {
		return WP_CONTENT_DIR . '/object-cache.php';
	}

	public static function template_path() {
		return KP_Shield::dir() . 'includes/object-cache.php';
	}

	/** ¿El drop-in instalado es el nuestro? */
	public static function is_ours( $file ) {
		if ( ! is_readable( $file ) ) {
			return false;
		}
		$head = (string) @file_get_contents( $file, false, null, 0, 400 ); // phpcs:ignore
		return false !== strpos( $head, 'Kuboplay Shield' );
	}

	/** Hay un object-cache.php de OTRO plugin: la opción se queda bloqueada. */
	public static function foreign_dropin() {
		$f = self::dropin_path();
		return file_exists( $f ) && ! self::is_ours( $f );
	}

	/** ¿Está funcionando nuestra caché de objetos ahora mismo? */
	public static function active() {
		return file_exists( self::dropin_path() )
			&& self::is_ours( self::dropin_path() )
			&& function_exists( 'wp_cache_supports' )
			&& class_exists( 'KP_Object_Cache', false );
	}

	/** Sal para las claves: cambia al vaciar, así nada viejo se lee por error. */
	private static function salt() {
		$s = get_option( 'kp_shield_obj_salt' );
		if ( ! $s || ! is_string( $s ) ) {
			$s = wp_generate_password( 12, false );
			update_option( 'kp_shield_obj_salt', $s, false );
		}
		return $s;
	}

	/** Escribe cache/kp-obj/config.php con los ajustes del panel. */
	public static function write_config() {
		$dir = self::dir();
		if ( ! wp_mkdir_p( $dir ) ) {
			return false;
		}
		if ( ! file_exists( $dir . '/index.php' ) ) {
			file_put_contents( $dir . '/index.php', "<?php\n// Silencio.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		}
		if ( ! file_exists( $dir . '/.htaccess' ) ) {
			file_put_contents( $dir . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		}
		$cfg = array(
			'dir'            => $dir,
			'salt'           => self::salt(),
			'ttl'            => max( 60, min( 604800, (int) self::ajuste( 'php_obj_ttl', 86400 ) ) ),
			'max_bytes'      => max( 1, min( 8192, (int) self::ajuste( 'php_obj_max_kb', 512 ) ) ) * 1024,
			'max_writes'     => max( 10, min( 5000, (int) self::ajuste( 'php_obj_writes', 300 ) ) ),
			'gc'             => 200,
			'non_persistent' => array( 'counts', 'plugin', 'plugins', 'themes', 'comment', 'wc_session_id' ),
		);
		$php = "<?php\n// Generado por Kuboplay Shield. No editar a mano.\nreturn " . var_export( $cfg, true ) . ";\n"; // phpcs:ignore WordPress.PHP.DevelopmentFunctions
		return (bool) file_put_contents( $dir . '/config.php', $php ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	}

	/** Tras guardar en el panel: se usa el array recién guardado, no el cacheado. */
	public static function sync_saved( $opts = null ) {
		self::$recien = is_array( $opts ) ? $opts : null;
		$r            = self::sync_dropin();
		self::$recien = null;
		return $r;
	}

	/** Lo mismo, pero desde el escritorio: solo quien puede tocar ajustes. */
	public static function sync_admin() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return false;
		}
		return self::sync_dropin();
	}

	/** Copia o borra el drop-in según el ajuste. Nunca lanza ni deja la web caída. */
	public static function sync_dropin() {
		try {
			if ( self::on( 'php_obj' ) && ! self::foreign_dropin() ) {
				self::write_config();
				return self::install_dropin();
			}
			return self::remove_dropin();
		} catch ( Throwable $e ) {
			return false;
		}
	}

	public static function install_dropin() {
		$src = self::template_path();
		$dst = self::dropin_path();
		if ( ! is_readable( $src ) ) {
			return false;
		}
		if ( file_exists( $dst ) && ! self::is_ours( $dst ) ) {
			return false; // Otro plugin manda: no se pisa.
		}
		if ( ! is_writable( dirname( $dst ) ) && ! file_exists( $dst ) ) {
			return false;
		}
		if ( ! is_dir( self::dir() ) || ! is_writable( self::dir() ) ) {
			return false; // Sin carpeta escribible no se instala nada.
		}
		return (bool) @copy( $src, $dst ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
	}

	public static function remove_dropin() {
		$dst = self::dropin_path();
		if ( file_exists( $dst ) && self::is_ours( $dst ) ) {
			@unlink( $dst ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		}
		return true;
	}

	/** Vacía la caché de objetos (acción `kp_shield_purge` y botón del panel). */
	public static function purge() {
		try {
			if ( function_exists( 'wp_cache_flush' ) && self::active() ) {
				wp_cache_flush();
			}
			self::rmdir( self::dir(), true );
			delete_option( 'kp_shield_obj_salt' );
			if ( self::on( 'php_obj' ) ) {
				self::write_config();
			}
		} catch ( Throwable $e ) {
			return false;
		}
		return true;
	}

	/** Borra el contenido de la carpeta de la caché (nunca fuera de ella). */
	private static function rmdir( $dir, $keep_root = false ) {
		$base = self::dir();
		if ( '' === $dir || 0 !== strpos( $dir, $base ) || ! is_dir( $dir ) ) {
			return;
		}
		$list = @scandir( $dir ); // phpcs:ignore
		if ( ! is_array( $list ) ) {
			return;
		}
		foreach ( $list as $f ) {
			if ( '.' === $f || '..' === $f ) {
				continue;
			}
			$p = $dir . '/' . $f;
			if ( is_dir( $p ) ) {
				self::rmdir( $p );
			} else {
				@unlink( $p ); // phpcs:ignore
			}
		}
		if ( ! $keep_root ) {
			@rmdir( $dir ); // phpcs:ignore
		}
	}

	public static function activate() {
		self::sync_dropin();
	}

	/** Al desactivar el plugin el sitio queda como estaba. */
	public static function deactivate() {
		self::remove_dropin();
		self::rmdir( self::dir() );
		delete_option( 'kp_shield_obj_salt' );
	}

	/* ==================================================== 2. OPcache */

	public static function opcache_status() {
		if ( ! function_exists( 'opcache_get_status' ) ) {
			return array( 'on' => false, 'why' => 'sin-extension' );
		}
		$s = @opcache_get_status( false ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		if ( ! is_array( $s ) || empty( $s['opcache_enabled'] ) ) {
			return array( 'on' => false, 'why' => 'apagado' );
		}
		$mem  = isset( $s['memory_usage'] ) ? $s['memory_usage'] : array();
		$used = isset( $mem['used_memory'] ) ? (int) $mem['used_memory'] : 0;
		$free = isset( $mem['free_memory'] ) ? (int) $mem['free_memory'] : 0;
		$tot  = max( 1, $used + $free + ( isset( $mem['wasted_memory'] ) ? (int) $mem['wasted_memory'] : 0 ) );
		return array(
			'on'    => true,
			'total' => $tot,
			'free'  => $free,
			'pct'   => (int) round( $free * 100 / $tot ),
			'full'  => ! empty( $s['cache_full'] ),
			'keys'  => isset( $s['opcache_statistics']['num_cached_keys'] ) ? (int) $s['opcache_statistics']['num_cached_keys'] : 0,
		);
	}

	/** Botón «Vaciar OPcache» y limpieza tras actualizar. */
	public static function opcache_reset() {
		$permitido = current_user_can( 'manage_options' )
			|| wp_doing_cron()
			|| ( defined( 'WP_CLI' ) && WP_CLI )
			|| ( defined( 'DOING_UPGRADE' ) && DOING_UPGRADE );
		if ( ! $permitido ) {
			return false;
		}
		if ( ! function_exists( 'opcache_reset' ) ) {
			return false;
		}
		return (bool) @opcache_reset(); // phpcs:ignore WordPress.PHP.NoSilencedErrors
	}

	/* ================================================ 3. Diagnóstico */

	/** Bytes de un valor de php.ini tipo «256M». */
	private static function bytes( $v ) {
		$v = trim( (string) $v );
		if ( '' === $v ) {
			return 0;
		}
		$n = (int) $v;
		switch ( strtolower( substr( $v, -1 ) ) ) {
			case 'g':
				return $n * 1024 * 1024 * 1024;
			case 'm':
				return $n * 1024 * 1024;
			case 'k':
				return $n * 1024;
		}
		return $n;
	}

	private static function human( $bytes ) {
		$bytes = (int) $bytes;
		if ( $bytes >= 1048576 ) {
			return round( $bytes / 1048576, 1 ) . ' MB';
		}
		if ( $bytes >= 1024 ) {
			return round( $bytes / 1024 ) . ' KB';
		}
		return $bytes . ' B';
	}

	/**
	 * Lista de comprobaciones. Cada una: label, value, ok (bool|null) y tip.
	 * Solo lectura: no cambia nada del servidor.
	 */
	public static function checks() {
		$out = array();

		$php = PHP_VERSION;
		$out[] = array(
			'label' => 'Versión de PHP',
			'value' => $php,
			'ok'    => version_compare( $php, self::PHP_MIN, '>=' ),
			'tip'   => version_compare( $php, self::PHP_MIN, '>=' )
				? 'Al día. PHP es el motor que monta cada página; cuanto más nuevo, más rápido y más seguro.'
				: 'Esta versión ya no recibe parches. En IONOS se cambia desde el panel del hosting (Webs y dominios → tu web → PHP), y conviene subir a la 8.2 o superior.',
		);

		$ml = self::bytes( ini_get( 'memory_limit' ) );
		$out[] = array(
			'label' => 'Memoria por petición',
			'value' => ( $ml <= 0 ? 'sin límite' : ini_get( 'memory_limit' ) ),
			'ok'    => $ml <= 0 || $ml >= 134217728,
			'tip'   => ( $ml <= 0 || $ml >= 134217728 )
				? 'Suficiente para montar páginas y subir imágenes.'
				: 'Va justo. Si al subir imágenes grandes ves páginas en blanco, sube el límite desde el panel del hosting (128 MB va bien).',
		);

		$mx = (int) ini_get( 'max_execution_time' );
		$out[] = array(
			'label' => 'Tiempo máximo por petición',
			'value' => $mx ? $mx . ' s' : 'sin límite',
			'ok'    => 0 === $mx || $mx >= 30,
			'tip'   => ( 0 === $mx || $mx >= 30 )
				? 'De sobra para lo que hace el portal.'
				: 'Corto: las tareas largas (importar catálogo, regenerar miniaturas) pueden cortarse a medias.',
		);

		$op = self::opcache_status();
		$out[] = array(
			'label' => 'OPcache',
			'value' => $op['on'] ? ( 'encendida · ' . $op['pct'] . ' % libre' ) : 'apagada',
			'ok'    => $op['on'] && empty( $op['full'] ) && $op['pct'] > 10,
			'tip'   => ! $op['on']
				? 'OPcache guarda el código ya traducido para no volver a traducirlo en cada visita. Es la mejora más grande y es gratis: actívala desde el panel del hosting.'
				: ( ( ! empty( $op['full'] ) || $op['pct'] <= 10 )
					? 'Está llena: le falta sitio y acaba tirando código que luego tiene que volver a traducir. Pide 128 MB de OPcache en el panel del hosting.'
					: 'Funcionando y con sitio de sobra.' ),
		);

		$ext = array(
			'opcache'  => 'acelera PHP guardando el código ya traducido',
			'zlib'     => 'comprime el HTML antes de enviarlo',
			'igbinary' => 'guarda los datos de la caché ocupando menos (opcional)',
			'intl'     => 'ordena y compara textos con acentos correctamente (opcional)',
			'gd'       => 'recorta y redimensiona imágenes',
			'imagick'  => 'alternativa a GD, con mejor calidad (opcional)',
			'sodium'   => 'criptografía moderna que WordPress usa para las actualizaciones',
		);
		$falta = array();
		$hay   = array();
		foreach ( $ext as $e => $para ) {
			if ( extension_loaded( $e ) ) {
				$hay[] = $e;
			} else {
				$falta[] = $e . ' (' . $para . ')';
			}
		}
		$out[] = array(
			'label' => 'Extensiones de PHP',
			'value' => $hay ? implode( ', ', $hay ) : 'ninguna de las habituales',
			'ok'    => extension_loaded( 'zlib' ) && ( extension_loaded( 'gd' ) || extension_loaded( 'imagick' ) ),
			'tip'   => $falta
				? 'No están: ' . implode( '; ', $falta ) . '. Las marcadas como opcionales no hacen falta.'
				: 'Están todas las habituales.',
		);

		$rp = self::bytes( ini_get( 'realpath_cache_size' ) );
		$out[] = array(
			'label' => 'Caché de rutas de ficheros',
			'value' => ini_get( 'realpath_cache_size' ),
			'ok'    => $rp >= 1048576,
			'tip'   => $rp >= 1048576
				? 'Bien: PHP no vuelve a buscar cada fichero en el disco.'
				: 'Pequeña para una web con muchos ficheros (aquí hay cientos de juegos). 4 MB va sobrado; se cambia en el panel del hosting (realpath_cache_size).',
		);

		$ext_obj = function_exists( 'wp_using_ext_object_cache' ) && wp_using_ext_object_cache();
		$mia     = self::active();
		$out[]   = array(
			'label' => 'Caché de objetos',
			'value' => $mia ? 'Kuboplay Shield (ficheros)' : ( $ext_obj ? 'otra caché externa' : 'ninguna' ),
			'ok'    => $mia || $ext_obj,
			'tip'   => $mia
				? 'Encendida: lo que WordPress calcula una vez se reaprovecha en la siguiente visita.'
				: ( $ext_obj
					? 'Ya hay otra caché de objetos instalada. No se toca.'
					: 'Apagada. En este hosting no hay Redis ni Memcached, pero la caché en ficheros de aquí abajo hace el mismo papel.' ),
		);

		$cron = ( defined( 'DISABLE_WP_CRON' ) && DISABLE_WP_CRON );
		$out[] = array(
			'label' => 'Tareas programadas (wp-cron)',
			'value' => $cron ? 'apagadas dentro de WordPress' : 'se disparan con las visitas',
			'ok'    => null,
			'tip'   => $cron
				? 'Recuerda tener una tarea real en el panel del hosting que llame a wp-cron.php cada 15 minutos; si no, las tareas no se ejecutan.'
				: 'Cada visita puede lanzar las tareas pendientes. Con poca visita está bien; si notas tirones, frénalo abajo.',
		);

		return $out;
	}

	/** Opciones autocargadas: se cargan enteras en CADA petición. Solo informa. */
	public static function autoload_report() {
		global $wpdb;
		$rep = get_transient( 'kp_shield_autoload' );
		if ( is_array( $rep ) ) {
			return $rep;
		}
		$rep = array( 'total' => 0, 'count' => 0, 'top' => array() );
		if ( ! isset( $wpdb ) || ! is_object( $wpdb ) ) {
			return $rep;
		}
		// phpcs:disable WordPress.DB.DirectDatabaseQuery
		$rep['total'] = (int) $wpdb->get_var( "SELECT SUM(LENGTH(option_value)) FROM {$wpdb->options} WHERE autoload IN ('yes','on','auto','auto-on')" );
		$rep['count'] = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->options} WHERE autoload IN ('yes','on','auto','auto-on')" );
		$rows         = $wpdb->get_results( "SELECT option_name, LENGTH(option_value) AS n FROM {$wpdb->options} WHERE autoload IN ('yes','on','auto','auto-on') ORDER BY n DESC LIMIT 8" );
		// phpcs:enable WordPress.DB.DirectDatabaseQuery
		foreach ( (array) $rows as $r ) {
			$rep['top'][] = array( 'name' => (string) $r->option_name, 'size' => (int) $r->n );
		}
		set_transient( 'kp_shield_autoload', $rep, HOUR_IN_SECONDS );
		return $rep;
	}

	/* ================================== 4. Freno de cada petición */

	/** Limita el disparo de wp-cron a 1 vez cada N segundos. */
	public static function cron_throttle( $pre ) {
		if ( wp_doing_cron() ) {
			return $pre;
		}
		$min  = max( 60, min( 3600, (int) self::ajuste( 'php_cron_min', 300 ) ) );
		$last = (int) get_option( 'kp_shield_cron_last', 0 );
		$now  = time();
		if ( $last && ( $now - $last ) < $min ) {
			// Fingir que el cron ya está en marcha: WordPress no lo vuelve a lanzar.
			return sprintf( '%.22F', $last );
		}
		update_option( 'kp_shield_cron_last', $now, false );
		return $pre;
	}

	/** Ritmo del Heartbeat en el escritorio. */
	public static function heartbeat( $s ) {
		$secs = max( 15, min( 600, (int) self::ajuste( 'php_hb_secs', 120 ) ) );
		$s    = is_array( $s ) ? $s : array();
		$s['interval']    = $secs;
		$s['minimalRevisions'] = true;
		return $s;
	}

	/** Fuera el Heartbeat en la parte pública (el portal no lo usa). */
	public static function heartbeat_front() {
		if ( ! is_admin() ) {
			wp_deregister_script( 'heartbeat' );
		}
	}

	public static function revisions( $num, $post = null ) {
		$max = max( 0, min( 50, (int) self::ajuste( 'php_rev_max', 5 ) ) );
		return $max;
	}

	/* ====================================================== Panel */

	public static function tab( $tabs ) {
		$tabs = is_array( $tabs ) ? $tabs : array();
		$tabs['php'] = 'PHP';
		return $tabs;
	}

	public static function fields( $f ) {
		$f = is_array( $f ) ? $f : array();
		$p = isset( $f['php'] ) && is_array( $f['php'] ) ? $f['php'] : array();

		$ajeno = self::foreign_dropin();

		$p[] = array(
			'key'     => 'php_obj',
			'label'   => 'Recordar lo ya calculado (caché de objetos)',
			'desc'    => $ajeno
				? 'BLOQUEADO: ya hay otro plugin con su propia caché de objetos instalada en wp-content/object-cache.php. No se pisa. Si quieres usar esta, desinstala antes la otra.'
				: 'WordPress rehace en cada visita cuentas que no cambian (ajustes, categorías, datos de cada juego). Esto las guarda en un archivo y las reaprovecha. Es lo que más baja el trabajo de la base de datos en un hosting sin Redis, como el nuestro.',
			'type'    => 'switch',
			'default' => 0,
			'warn'    => $ajeno
				? 'Mientras exista el object-cache.php de otro plugin, este interruptor no hace nada.'
				: 'Si notaras algo raro (cambios que tardan en verse), apágalo y toca «Vaciar caché»: se quita solo y la web sigue igual.',
		);
		$p[] = array(
			'key'     => 'php_obj_ttl',
			'label'   => 'Cuánto se recuerda',
			'desc'    => 'Segundos antes de volver a calcular. Al guardar cambios se vacía sola, así que puede ser largo.',
			'type'    => 'number',
			'default' => 86400,
			'min'     => 60,
			'max'     => 604800,
			'suffix'  => 'segundos',
		);
		$p[] = array(
			'key'     => 'php_obj_max_kb',
			'label'   => 'Tamaño máximo de cada dato guardado',
			'desc'    => 'Lo que pase de aquí no se guarda en disco, para no llenar el hosting de archivos enormes.',
			'type'    => 'number',
			'default' => 512,
			'min'     => 16,
			'max'     => 8192,
			'suffix'  => 'KB',
		);
		$p[] = array(
			'key'     => 'php_obj_writes',
			'label'   => 'Archivos nuevos por visita',
			'desc'    => 'Tope de cosas nuevas que se guardan en una misma visita. Evita que una página rara escriba miles de archivos.',
			'type'    => 'number',
			'default' => 300,
			'min'     => 10,
			'max'     => 5000,
			'suffix'  => 'archivos',
		);
		$p[] = array(
			'key'     => 'php_opcache',
			'label'   => 'Refrescar el código tras actualizar',
			'desc'    => 'Cuando actualizas un plugin, el tema o WordPress, el servidor puede seguir usando el código antiguo un rato. Esto lo refresca al momento.',
			'type'    => 'switch',
			'default' => 1,
		);
		$p[] = array(
			'key'     => 'php_diag',
			'label'   => 'Mostrar el diagnóstico del servidor',
			'desc'    => 'La lista de comprobaciones que ves más abajo, con lo que conviene cambiar en el panel de IONOS.',
			'type'    => 'switch',
			'default' => 1,
		);
		$p[] = array(
			'key'     => 'php_cron',
			'label'   => 'Frenar las tareas automáticas',
			'desc'    => 'WordPress aprovecha las visitas para hacer sus tareas de mantenimiento. Con esto, como mucho una vez cada X segundos, y las visitas van más ligeras.',
			'type'    => 'switch',
			'default' => 0,
		);
		$p[] = array(
			'key'     => 'php_cron_min',
			'label'   => 'Espera entre tareas automáticas',
			'desc'    => 'Segundos mínimos entre una tanda de tareas y la siguiente.',
			'type'    => 'number',
			'default' => 300,
			'min'     => 60,
			'max'     => 3600,
			'suffix'  => 'segundos',
		);
		$p[] = array(
			'key'     => 'php_cron_off',
			'label'   => 'Apagar del todo las tareas automáticas',
			'desc'    => 'Solo si has creado una tarea programada en el panel de IONOS que llame a wp-cron.php cada 15 minutos. Si no la has creado, deja esto apagado.',
			'type'    => 'switch',
			'default' => 0,
			'confirm' => 'Sí, ya tengo la tarea programada en el panel del hosting',
			'warn'    => 'Sin esa tarea en el hosting, WordPress dejaría de publicar entradas programadas y de hacer su mantenimiento.',
		);
		$p[] = array(
			'key'     => 'php_hb',
			'label'   => 'Bajar el ritmo del escritorio',
			'desc'    => 'Mientras tienes el escritorio abierto, WordPress pregunta al servidor cada pocos segundos. Esto lo espacia y lo quita del todo en la parte pública.',
			'type'    => 'switch',
			'default' => 0,
		);
		$p[] = array(
			'key'     => 'php_hb_secs',
			'label'   => 'Cada cuánto pregunta el escritorio',
			'desc'    => 'Más alto, menos trabajo para el servidor. Con 120 segundos el autoguardado sigue funcionando.',
			'type'    => 'number',
			'default' => 120,
			'min'     => 15,
			'max'     => 600,
			'suffix'  => 'segundos',
		);
		$p[] = array(
			'key'     => 'php_rev',
			'label'   => 'Guardar menos versiones antiguas',
			'desc'    => 'Cada vez que editas una página, WordPress guarda una copia. Con cientos de juegos eso abulta mucho.',
			'type'    => 'switch',
			'default' => 0,
		);
		$p[] = array(
			'key'     => 'php_rev_max',
			'label'   => 'Versiones que se guardan',
			'desc'    => 'Cuántas copias antiguas se conservan de cada página o juego.',
			'type'    => 'number',
			'default' => 5,
			'min'     => 0,
			'max'     => 50,
			'suffix'  => 'versiones',
		);

		$f['php'] = $p;
		return $f;
	}

	public static function tools( $t ) {
		$t   = is_array( $t ) ? $t : array();
		$t[] = array(
			'key'   => 'opcache',
			'label' => 'Vaciar OPcache',
			'tab'   => 'php',
		);
		return $t;
	}

	/** Avisos para la tarjeta de estado. */
	public static function notices( $n ) {
		$n = is_array( $n ) ? $n : array();
		if ( self::foreign_dropin() ) {
			$n[] = array(
				'type' => 'info',
				'text' => 'Hay otra caché de objetos instalada (wp-content/object-cache.php de otro plugin). Kuboplay Shield la respeta y no instala la suya.',
			);
		}
		$op = self::opcache_status();
		if ( empty( $op['on'] ) ) {
			$n[] = array(
				'type' => 'warn',
				'text' => 'OPcache está apagada en el servidor. Es la mejora gratis más grande que hay: actívala desde el panel del hosting.',
			);
		} elseif ( ! empty( $op['full'] ) ) {
			$n[] = array(
				'type' => 'warn',
				'text' => 'La OPcache del servidor está llena. Pide más memoria para ella (128 MB) en el panel del hosting.',
			);
		}
		return $n;
	}

	/** Panel de diagnóstico, en la pestaña PHP. */
	public static function panels( $p ) {
		$p = is_array( $p ) ? $p : array();
		if ( ! self::on( 'php_diag' ) || ! current_user_can( 'manage_options' ) ) {
			return $p;
		}

		$h = '<table class="widefat striped"><tbody>';
		foreach ( self::checks() as $c ) {
			$mark = ( null === $c['ok'] ) ? '•' : ( $c['ok'] ? '✔' : '!' );
			$h   .= '<tr><td style="width:30px;font-weight:700">' . esc_html( $mark ) . '</td>'
				. '<td style="width:220px"><strong>' . esc_html( $c['label'] ) . '</strong></td>'
				. '<td style="width:220px"><code>' . esc_html( (string) $c['value'] ) . '</code></td>'
				. '<td>' . esc_html( $c['tip'] ) . '</td></tr>';
		}
		$h .= '</tbody></table>';

		$a = self::autoload_report();
		$h .= '<p style="margin-top:16px"><strong>Ajustes que se cargan siempre:</strong> '
			. esc_html( number_format_i18n( $a['count'] ) ) . ' ajustes, '
			. esc_html( self::human( $a['total'] ) ) . ' en total. '
			. esc_html( $a['total'] > 819200
				? 'Es mucho: se lee entero en cada visita. Suele venir de plugins viejos que dejaron datos atrás.'
				: 'Cantidad normal.' )
			. ' Kuboplay Shield solo lo mide: no borra nada por su cuenta.</p>';

		if ( $a['top'] ) {
			$h .= '<p>Los más gordos: ';
			$li = array();
			foreach ( $a['top'] as $t ) {
				$li[] = '<code>' . esc_html( $t['name'] ) . '</code> (' . esc_html( self::human( $t['size'] ) ) . ')';
			}
			$h .= implode( ', ', $li ) . '.</p>';
		}

		$p[] = array(
			'tab'   => 'php',
			'title' => 'Diagnóstico del servidor',
			'html'  => $h,
			'order' => 20,
		);
		return $p;
	}
}

add_filter( 'kp_shield_defaults', array( 'KP_Shield_Php', 'defaults' ) );
KP_Shield_Php::boot();
