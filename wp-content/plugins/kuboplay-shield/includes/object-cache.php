<?php
/**
 * Kuboplay Shield — drop-in de caché de objetos en ficheros (plantilla).
 *
 * Se copia a wp-content/object-cache.php cuando se enciende la caché de objetos y se
 * borra al apagarla. WordPress lo carga MUY pronto (antes que los plugins), así que
 * este fichero es autosuficiente: no usa funciones de WordPress, no toca la base de
 * datos y no hace ninguna llamada de red.
 *
 * Qué hace: lo que WordPress calcula una vez (opciones, términos, metadatos…) se
 * guarda en ficheros dentro de wp-content/cache/kp-obj/ y se reaprovecha en la
 * siguiente petición, en vez de volver a preguntárselo a la base de datos.
 *
 * Seguridad por diseño:
 *   - Solo se lee lo que ha escrito este mismo fichero, y siempre con
 *     unserialize( …, array( 'allowed_classes' => false ) ): nunca se reconstruye
 *     un objeto venido del disco. Los valores que contienen objetos no se guardan
 *     en disco (se quedan solo en memoria durante la petición).
 *   - Escritura atómica (fichero temporal + rename): nunca se lee un fichero a medias.
 *   - Si la carpeta no se puede crear o escribir, este fichero NO declara nada y
 *     WordPress sigue con su caché de siempre. La web no se cae jamás por esto.
 *
 * Ojo con la estructura: todo va dentro de bloques `if`, a propósito. Las clases y
 * funciones declaradas en el nivel superior de un fichero se enlazan al compilarlo,
 * así que un `return` temprano no las evitaría; dentro de un `if` sí.
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

// Esto es una PLANTILLA: solo hace algo copiada a wp-content/object-cache.php, donde
// WordPress la carga antes que los plugins. Si alguien la incluye más tarde (por ejemplo
// un cargador que recorra includes/), no hace nada en absoluto.
if ( function_exists( 'wp_cache_init' ) || ( function_exists( 'did_action' ) && did_action( 'muplugins_loaded' ) ) ) {
	return;
}

if ( ! defined( 'KP_OBJ_DIR' ) ) {
	define( 'KP_OBJ_DIR', WP_CONTENT_DIR . '/cache/kp-obj' );
}

if ( ! function_exists( 'kp_obj_config' ) ) {
	/**
	 * Ajustes del almacén. Se leen una vez de cache/kp-obj/config.php (lo escribe
	 * includes/php.php). Si no hay fichero, valores prudentes por defecto.
	 */
	function kp_obj_config() {
		static $cfg = null;
		if ( null !== $cfg ) {
			return $cfg;
		}
		$cfg  = array();
		$file = KP_OBJ_DIR . '/config.php';
		if ( is_readable( $file ) ) {
			$raw = include $file;
			if ( is_array( $raw ) ) {
				$cfg = $raw;
			}
		}
		if ( empty( $cfg['dir'] ) || ! is_string( $cfg['dir'] ) ) {
			$cfg['dir'] = KP_OBJ_DIR;
		}
		return $cfg;
	}
}

if ( ! function_exists( 'kp_obj_ready' ) ) {
	/**
	 * ¿Se puede usar el almacén? Escotillas del plugin + carpeta escribible.
	 * Si devuelve false, este drop-in no declara ninguna función wp_cache_*
	 * y WordPress carga su caché de memoria de siempre.
	 */
	function kp_obj_ready() {
		static $ok = null;
		if ( null !== $ok ) {
			return $ok;
		}
		$ok = false;
		if ( defined( 'KP_SHIELD_OFF' ) && KP_SHIELD_OFF ) {
			return $ok;
		}
		if ( defined( 'KP_OBJ_OFF' ) && KP_OBJ_OFF ) {
			return $ok;
		}
		$cfg = kp_obj_config();
		$dir = $cfg['dir'];
		if ( ! is_dir( $dir ) ) {
			if ( ! @mkdir( $dir, 0755, true ) && ! is_dir( $dir ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
				return $ok;
			}
		}
		if ( ! is_writable( $dir ) ) {
			return $ok;
		}
		if ( ! file_exists( $dir . '/index.php' ) ) {
			@file_put_contents( $dir . '/index.php', "<?php\n// Silencio.\n" ); // phpcs:ignore
		}
		if ( ! file_exists( $dir . '/.htaccess' ) ) {
			@file_put_contents( $dir . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n" ); // phpcs:ignore
		}
		$ok = true;
		return $ok;
	}
}

if ( kp_obj_ready() && ! class_exists( 'KP_Object_Cache', false ) ) {

	/**
	 * Almacén en ficheros con la misma forma que WP_Object_Cache.
	 */
	class KP_Object_Cache {

		/** Caché en memoria de esta petición: [grupo][clave] => valor. */
		public $cache = array();

		/** Aciertos y fallos (los enseña el panel de WordPress). */
		public $cache_hits   = 0;
		public $cache_misses = 0;

		/** Prefijo del sitio (multisitio). */
		public $blog_prefix = 1;

		/** Grupos globales (no llevan prefijo de sitio). */
		protected $global_groups = array(
			'blog-details'    => true,
			'blog-id-cache'   => true,
			'blog-lookup'     => true,
			'global-posts'    => true,
			'networks'        => true,
			'network-queries' => true,
			'rss'             => true,
			'sites'           => true,
			'site-details'    => true,
			'site-lookup'     => true,
			'site-options'    => true,
			'site-queries'    => true,
			'site-transient'  => true,
			'users'           => true,
			'useremail'       => true,
			'userlogins'      => true,
			'usermeta'        => true,
			'user_meta'       => true,
			'userslugs'       => true,
		);

		/** Grupos que NO se guardan en disco (cambian en cada petición o son privados). */
		protected $non_persistent = array(
			'counts'        => true,
			'plugin'        => true,
			'plugins'       => true,
			'themes'        => true,
			'comment'       => true,
			'wc_session_id' => true,
			'kp-runtime'    => true,
		);

		/** Ajustes. */
		protected $dir        = '';
		protected $salt       = '';
		protected $ttl        = 86400;
		protected $max_bytes  = 524288;
		protected $max_writes = 300;
		protected $gc         = 200;

		/** Escrituras hechas en esta petición. */
		protected $writes = 0;

		/** Claves ya buscadas en disco sin éxito (para no repetir la lectura). */
		protected $missed = array();

		public function __construct( $cfg = array() ) {
			$cfg = is_array( $cfg ) ? $cfg : array();

			$this->dir        = isset( $cfg['dir'] ) ? (string) $cfg['dir'] : KP_OBJ_DIR;
			$this->salt       = isset( $cfg['salt'] ) ? (string) $cfg['salt'] : '';
			$this->ttl        = max( 60, min( 604800, isset( $cfg['ttl'] ) ? (int) $cfg['ttl'] : 86400 ) );
			$this->max_bytes  = max( 1024, min( 8388608, isset( $cfg['max_bytes'] ) ? (int) $cfg['max_bytes'] : 524288 ) );
			$this->max_writes = max( 10, min( 5000, isset( $cfg['max_writes'] ) ? (int) $cfg['max_writes'] : 300 ) );
			$this->gc         = max( 0, min( 10000, isset( $cfg['gc'] ) ? (int) $cfg['gc'] : 200 ) );

			if ( ! empty( $cfg['non_persistent'] ) && is_array( $cfg['non_persistent'] ) ) {
				foreach ( $cfg['non_persistent'] as $g ) {
					$this->non_persistent[ (string) $g ] = true;
				}
			}

			if ( isset( $GLOBALS['blog_id'] ) ) {
				$this->blog_prefix = (int) $GLOBALS['blog_id'];
			}
		}

		/* --------------------------------------------------------- Rutas */

		/** Carpeta de un grupo (permite vaciar un grupo entero de una vez). */
		protected function group_dir( $group ) {
			return $this->dir . '/g' . substr( md5( $this->salt . '|' . $group ), 0, 16 );
		}

		/** Ruta del fichero de una clave. */
		protected function path( $key, $group ) {
			$h = md5( $this->salt . '|' . $this->full_key( $key, $group ) );
			return $this->group_dir( $group ) . '/' . substr( $h, 0, 2 ) . '/' . substr( $h, 2 ) . '.kp';
		}

		/** Clave con prefijo de sitio, salvo en grupos globales. */
		protected function full_key( $key, $group ) {
			$pre = isset( $this->global_groups[ $group ] ) ? 'g:' : (int) $this->blog_prefix . ':';
			return $pre . $group . ':' . $key;
		}

		protected function persists( $group ) {
			return ! isset( $this->non_persistent[ $group ] );
		}

		/** ¿El valor contiene algún objeto? Entonces no se guarda en disco. */
		protected function has_object( $v, $depth = 0 ) {
			if ( is_object( $v ) ) {
				return true;
			}
			if ( $depth > 6 || ! is_array( $v ) ) {
				return false;
			}
			foreach ( $v as $x ) {
				if ( $this->has_object( $x, $depth + 1 ) ) {
					return true;
				}
			}
			return false;
		}

		/* --------------------------------------------------------- Disco */

		/** Lee del disco. Devuelve array( encontrado, valor ). */
		protected function disk_get( $key, $group ) {
			$file = $this->path( $key, $group );
			$raw  = @file_get_contents( $file ); // phpcs:ignore
			if ( false === $raw || '' === $raw ) {
				return array( false, false );
			}
			$nl = strpos( $raw, "\n" );
			if ( false === $nl || $nl > 24 ) {
				return array( false, false );
			}
			$exp = (int) substr( $raw, 0, $nl );
			if ( $exp > 0 && $exp < time() ) {
				@unlink( $file ); // phpcs:ignore
				return array( false, false );
			}
			$body = substr( $raw, $nl + 1 );
			// Solo se deserializa lo que ha escrito este mismo fichero, y sin clases.
			$val = @unserialize( $body, array( 'allowed_classes' => false ) ); // phpcs:ignore
			if ( false === $val && 'b:0;' !== $body ) {
				return array( false, false );
			}
			return array( true, $val );
		}

		/** Escribe en disco de forma atómica (tmp + rename). */
		protected function disk_set( $key, $group, $value, $expire ) {
			if ( $this->writes >= $this->max_writes || $this->has_object( $value ) ) {
				return false;
			}
			$body = serialize( $value ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_serialize
			if ( strlen( $body ) > $this->max_bytes ) {
				return false;
			}
			$expire = (int) $expire;
			$ttl    = $expire > 0 ? min( $expire, $this->ttl ) : $this->ttl;
			$file   = $this->path( $key, $group );
			$dir    = dirname( $file );
			if ( ! is_dir( $dir ) && ! @mkdir( $dir, 0755, true ) && ! is_dir( $dir ) ) { // phpcs:ignore
				return false;
			}
			$tmp = $file . '.' . getmypid() . '.tmp';
			if ( false === @file_put_contents( $tmp, ( time() + $ttl ) . "\n" . $body, LOCK_EX ) ) { // phpcs:ignore
				return false;
			}
			if ( ! @rename( $tmp, $file ) ) { // phpcs:ignore
				@unlink( $tmp ); // phpcs:ignore
				return false;
			}
			$this->writes++;
			return true;
		}

		/** Borra una carpeta entera. Solo dentro de la carpeta de la caché. */
		protected function rmdir( $dir ) {
			if ( '' === $this->dir || 0 !== strpos( $dir, $this->dir ) || ! is_dir( $dir ) ) {
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
					$this->rmdir( $p );
				} else {
					@unlink( $p ); // phpcs:ignore
				}
			}
			@rmdir( $dir ); // phpcs:ignore
		}

		/* ----------------------------------------------------------- API */

		public function get( $key, $group = 'default', $force = false, &$found = null ) {
			$group = $this->group( $group );
			$key   = (string) $key;

			if ( ! $force && isset( $this->cache[ $group ] ) && array_key_exists( $key, $this->cache[ $group ] ) ) {
				$found = true;
				++$this->cache_hits;
				$v = $this->cache[ $group ][ $key ];
				return is_object( $v ) ? clone $v : $v;
			}

			if ( $this->persists( $group ) && ! isset( $this->missed[ $group ][ $key ] ) ) {
				list( $ok, $val ) = $this->disk_get( $key, $group );
				if ( $ok ) {
					$this->cache[ $group ][ $key ] = $val;
					$found                         = true;
					++$this->cache_hits;
					return $val;
				}
				$this->missed[ $group ][ $key ] = true;
			}

			$found = false;
			++$this->cache_misses;
			return false;
		}

		public function set( $key, $data, $group = 'default', $expire = 0 ) {
			$group = $this->group( $group );
			$key   = (string) $key;

			$this->cache[ $group ][ $key ] = is_object( $data ) ? clone $data : $data;
			unset( $this->missed[ $group ][ $key ] );

			if ( $this->persists( $group ) ) {
				$this->disk_set( $key, $group, $data, $expire );
			}
			return true;
		}

		public function add( $key, $data, $group = 'default', $expire = 0 ) {
			if ( function_exists( 'wp_suspend_cache_addition' ) && wp_suspend_cache_addition() ) {
				return false;
			}
			$group = $this->group( $group );
			$key   = (string) $key;
			$found = false;
			$this->get( $key, $group, false, $found );
			if ( $found ) {
				return false;
			}
			return $this->set( $key, $data, $group, $expire );
		}

		public function replace( $key, $data, $group = 'default', $expire = 0 ) {
			$group = $this->group( $group );
			$key   = (string) $key;
			$found = false;
			$this->get( $key, $group, false, $found );
			if ( ! $found ) {
				return false;
			}
			return $this->set( $key, $data, $group, $expire );
		}

		public function delete( $key, $group = 'default' ) {
			$group = $this->group( $group );
			$key   = (string) $key;
			$had   = isset( $this->cache[ $group ] ) && array_key_exists( $key, $this->cache[ $group ] );
			unset( $this->cache[ $group ][ $key ] );
			$this->missed[ $group ][ $key ] = true;
			if ( $this->persists( $group ) ) {
				$file = $this->path( $key, $group );
				if ( file_exists( $file ) ) {
					$had = true;
					@unlink( $file ); // phpcs:ignore
				}
			}
			return $had;
		}

		public function incr( $key, $offset = 1, $group = 'default' ) {
			$group = $this->group( $group );
			$key   = (string) $key;
			$found = false;
			$v     = $this->get( $key, $group, false, $found );
			if ( ! $found || ! is_numeric( $v ) ) {
				return false;
			}
			$v = (int) $v + (int) $offset;
			if ( $v < 0 ) {
				$v = 0;
			}
			$this->set( $key, $v, $group );
			return $v;
		}

		public function decr( $key, $offset = 1, $group = 'default' ) {
			return $this->incr( $key, -(int) $offset, $group );
		}

		public function flush() {
			$this->cache  = array();
			$this->missed = array();
			$list         = @scandir( $this->dir ); // phpcs:ignore
			if ( is_array( $list ) ) {
				foreach ( $list as $f ) {
					if ( 0 === strpos( $f, 'g' ) && is_dir( $this->dir . '/' . $f ) ) {
						$this->rmdir( $this->dir . '/' . $f );
					}
				}
			}
			return true;
		}

		public function flush_group( $group ) {
			$group = $this->group( $group );
			unset( $this->cache[ $group ], $this->missed[ $group ] );
			if ( $this->persists( $group ) ) {
				$this->rmdir( $this->group_dir( $group ) );
			}
			return true;
		}

		public function flush_runtime() {
			$this->cache  = array();
			$this->missed = array();
			return true;
		}

		public function get_multiple( $keys, $group = 'default', $force = false ) {
			$out = array();
			foreach ( (array) $keys as $k ) {
				$out[ $k ] = $this->get( $k, $group, $force );
			}
			return $out;
		}

		public function set_multiple( array $data, $group = 'default', $expire = 0 ) {
			$out = array();
			foreach ( $data as $k => $v ) {
				$out[ $k ] = $this->set( $k, $v, $group, $expire );
			}
			return $out;
		}

		public function add_multiple( array $data, $group = 'default', $expire = 0 ) {
			$out = array();
			foreach ( $data as $k => $v ) {
				$out[ $k ] = $this->add( $k, $v, $group, $expire );
			}
			return $out;
		}

		public function delete_multiple( array $keys, $group = 'default' ) {
			$out = array();
			foreach ( $keys as $k ) {
				$out[ $k ] = $this->delete( $k, $group );
			}
			return $out;
		}

		public function add_global_groups( $groups ) {
			foreach ( (array) $groups as $g ) {
				$this->global_groups[ (string) $g ] = true;
			}
		}

		public function add_non_persistent_groups( $groups ) {
			foreach ( (array) $groups as $g ) {
				$this->non_persistent[ (string) $g ] = true;
			}
		}

		public function switch_to_blog( $blog_id ) {
			$this->blog_prefix = (int) $blog_id;
		}

		/** Limpieza perezosa de caducados: 1 de cada N peticiones y con tope de ficheros. */
		public function close() {
			if ( $this->gc < 1 || 0 !== $this->dado( $this->gc ) ) {
				return true;
			}
			$now  = time();
			$seen = 0;
			$tops = @scandir( $this->dir ); // phpcs:ignore
			if ( ! is_array( $tops ) ) {
				return true;
			}
			foreach ( $tops as $t ) {
				if ( 0 !== strpos( $t, 'g' ) || ! is_dir( $this->dir . '/' . $t ) ) {
					continue;
				}
				$subs = @scandir( $this->dir . '/' . $t ); // phpcs:ignore
				if ( ! is_array( $subs ) ) {
					continue;
				}
				foreach ( $subs as $s ) {
					if ( '.' === $s || '..' === $s ) {
						continue;
					}
					$sd = $this->dir . '/' . $t . '/' . $s;
					if ( ! is_dir( $sd ) ) {
						continue;
					}
					$files = @scandir( $sd ); // phpcs:ignore
					if ( ! is_array( $files ) ) {
						continue;
					}
					foreach ( $files as $f ) {
						if ( '.kp' !== substr( $f, -3 ) ) {
							continue;
						}
						++$seen;
						if ( $seen > 500 ) {
							return true;
						}
						$h = @fopen( $sd . '/' . $f, 'rb' ); // phpcs:ignore
						if ( ! $h ) {
							continue;
						}
						$line = fgets( $h, 24 );
						fclose( $h );
						$exp = (int) $line;
						if ( $exp > 0 && $exp < $now ) {
							@unlink( $sd . '/' . $f ); // phpcs:ignore
						}
					}
				}
			}
			return true;
		}

		/** Resumen para el panel de WordPress (wp_cache_get_stats). */
		public function stats() {
			echo '<p><strong>Kuboplay Shield</strong> — caché de objetos en ficheros<br />';
			echo 'Aciertos: ' . (int) $this->cache_hits . '<br />';
			echo 'Fallos: ' . (int) $this->cache_misses . '<br />';
			echo 'Escrituras: ' . (int) $this->writes . '</p>';
		}

		/* ------------------------------------------------------ Utilidad */

		protected function group( $group ) {
			$group = (string) $group;
			return '' === $group ? 'default' : $group;
		}

		/** Dado de N caras, sin depender de WordPress (aún no está cargado). */
		protected function dado( $n ) {
			$n = max( 1, (int) $n );
			return function_exists( 'random_int' ) ? random_int( 0, $n - 1 ) : mt_rand( 0, $n - 1 ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		}
	}
}

if ( kp_obj_ready() && class_exists( 'KP_Object_Cache', false ) && ! function_exists( 'wp_cache_init' ) ) {

	function wp_cache_init() {
		global $wp_object_cache;
		if ( ! ( $wp_object_cache instanceof KP_Object_Cache ) ) {
			$wp_object_cache = new KP_Object_Cache( kp_obj_config() );
		}
	}

	function wp_cache_get( $key, $group = '', $force = false, &$found = null ) {
		global $wp_object_cache;
		return $wp_object_cache->get( $key, $group, $force, $found );
	}

	function wp_cache_set( $key, $data, $group = '', $expire = 0 ) {
		global $wp_object_cache;
		return $wp_object_cache->set( $key, $data, $group, (int) $expire );
	}

	function wp_cache_add( $key, $data, $group = '', $expire = 0 ) {
		global $wp_object_cache;
		return $wp_object_cache->add( $key, $data, $group, (int) $expire );
	}

	function wp_cache_replace( $key, $data, $group = '', $expire = 0 ) {
		global $wp_object_cache;
		return $wp_object_cache->replace( $key, $data, $group, (int) $expire );
	}

	function wp_cache_delete( $key, $group = '' ) {
		global $wp_object_cache;
		return $wp_object_cache->delete( $key, $group );
	}

	function wp_cache_incr( $key, $offset = 1, $group = '' ) {
		global $wp_object_cache;
		return $wp_object_cache->incr( $key, $offset, $group );
	}

	function wp_cache_decr( $key, $offset = 1, $group = '' ) {
		global $wp_object_cache;
		return $wp_object_cache->decr( $key, $offset, $group );
	}

	function wp_cache_flush() {
		global $wp_object_cache;
		return $wp_object_cache->flush();
	}

	function wp_cache_flush_group( $group ) {
		global $wp_object_cache;
		return $wp_object_cache->flush_group( $group );
	}

	function wp_cache_flush_runtime() {
		global $wp_object_cache;
		return $wp_object_cache->flush_runtime();
	}

	function wp_cache_get_multiple( $keys, $group = '', $force = false ) {
		global $wp_object_cache;
		return $wp_object_cache->get_multiple( $keys, $group, $force );
	}

	function wp_cache_set_multiple( array $data, $group = '', $expire = 0 ) {
		global $wp_object_cache;
		return $wp_object_cache->set_multiple( $data, $group, (int) $expire );
	}

	function wp_cache_add_multiple( array $data, $group = '', $expire = 0 ) {
		global $wp_object_cache;
		return $wp_object_cache->add_multiple( $data, $group, (int) $expire );
	}

	function wp_cache_delete_multiple( array $keys, $group = '' ) {
		global $wp_object_cache;
		return $wp_object_cache->delete_multiple( $keys, $group );
	}

	function wp_cache_supports( $feature ) {
		return in_array(
			$feature,
			array( 'get_multiple', 'set_multiple', 'add_multiple', 'delete_multiple', 'flush_runtime', 'flush_group' ),
			true
		);
	}

	function wp_cache_add_global_groups( $groups ) {
		global $wp_object_cache;
		$wp_object_cache->add_global_groups( $groups );
	}

	function wp_cache_add_non_persistent_groups( $groups ) {
		global $wp_object_cache;
		$wp_object_cache->add_non_persistent_groups( $groups );
	}

	function wp_cache_switch_to_blog( $blog_id ) {
		global $wp_object_cache;
		$wp_object_cache->switch_to_blog( $blog_id );
	}

	function wp_cache_close() {
		global $wp_object_cache;
		return $wp_object_cache instanceof KP_Object_Cache ? $wp_object_cache->close() : true;
	}

	function wp_cache_reset() {
		global $wp_object_cache;
		return $wp_object_cache->flush_runtime();
	}
}
