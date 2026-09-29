<?php
/**
 * Kuboplay Shield — drop-in de caché de página (plantilla).
 *
 * Se copia a wp-content/advanced-cache.php cuando se activa la caché y se borra al desactivarla.
 * Se ejecuta ANTES de cargar WordPress: aquí solo se SIRVE lo ya guardado; quien escribe los
 * ficheros es includes/perf.php (template_redirect), que es el único sitio donde se conocen
 * todas las condiciones (usuario conectado, 404, feed, modo tele…).
 *
 * No carga WordPress, no toca la base de datos y no hace ninguna llamada de red.
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'KP_CACHE_DIR' ) ) {
	define( 'KP_CACHE_DIR', WP_CONTENT_DIR . '/cache/kp' );
}

/**
 * Sirve la página guardada, si procede. Devuelve true si ya ha respondido.
 */
function kp_cache_serve() {
	$cfg_file = KP_CACHE_DIR . '/config.php';
	if ( ! is_readable( $cfg_file ) ) {
		return false;
	}
	$cfg = include $cfg_file;
	if ( ! is_array( $cfg ) || empty( $cfg['on'] ) ) {
		return false;
	}

	$method = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( (string) $_SERVER['REQUEST_METHOD'] ) : 'GET';
	if ( 'GET' !== $method && 'HEAD' !== $method ) {
		return false;
	}
	if ( defined( 'DOING_CRON' ) || defined( 'WP_CLI' ) ) {
		return false;
	}

	$key = kp_cache_key( $cfg );
	if ( ! $key ) {
		return false;
	}

	$base = KP_CACHE_DIR . '/pages/' . substr( $key, 0, 2 ) . '/' . $key;
	$html = $base . '.html';
	if ( ! is_readable( $html ) ) {
		return false;
	}

	$mtime = (int) filemtime( $html );
	$ttl   = isset( $cfg['ttl'] ) ? (int) $cfg['ttl'] : 28800;
	if ( $ttl > 0 && ( time() - $mtime ) > $ttl ) {
		@unlink( $html );          // phpcs:ignore WordPress.PHP.NoSilencedErrors
		@unlink( $base . '.gz' );  // phpcs:ignore WordPress.PHP.NoSilencedErrors
		return false;
	}

	$etag = '"kp' . $mtime . '-' . substr( $key, 0, 12 ) . '"';
	$gmt  = gmdate( 'D, d M Y H:i:s', $mtime ) . ' GMT';

	header( 'Content-Type: text/html; charset=UTF-8' );
	header( 'X-KP-Cache: HIT' );
	header( 'Cache-Control: public, max-age=0, s-maxage=' . max( 0, $ttl ) . ', must-revalidate' );
	header( 'Vary: Accept-Encoding, Cookie' );

	if ( ! empty( $cfg['hdr'] ) && is_array( $cfg['hdr'] ) ) {
		foreach ( $cfg['hdr'] as $h ) {
			if ( is_string( $h ) && false === strpos( $h, "\n" ) && false === strpos( $h, "\r" ) ) {
				header( $h );
			}
		}
	}

	if ( ! empty( $cfg['cond'] ) ) {
		header( 'ETag: ' . $etag );
		header( 'Last-Modified: ' . $gmt );
		if ( kp_cache_not_modified( $etag, $mtime ) ) {
			header( 'X-KP-Cache: HIT-304' );
			http_response_code( 304 );
			return true;
		}
	}

	if ( 'HEAD' === $method ) {
		return true;
	}

	// gzip solo si el servidor no está comprimiendo ya y el navegador lo admite.
	$gz = $base . '.gz';
	if ( ! empty( $cfg['gzip'] ) && is_readable( $gz )
		&& false !== strpos( strtolower( isset( $_SERVER['HTTP_ACCEPT_ENCODING'] ) ? (string) $_SERVER['HTTP_ACCEPT_ENCODING'] : '' ), 'gzip' )
		&& ! ini_get( 'zlib.output_compression' ) ) {
		header( 'Content-Encoding: gzip' );
		header( 'Content-Length: ' . filesize( $gz ) );
		readfile( $gz );
		return true;
	}

	header( 'Content-Length: ' . filesize( $html ) );
	readfile( $html );
	return true;
}

/** ¿El navegador ya tiene esta misma versión? */
function kp_cache_not_modified( $etag, $mtime ) {
	$inm = isset( $_SERVER['HTTP_IF_NONE_MATCH'] ) ? (string) $_SERVER['HTTP_IF_NONE_MATCH'] : '';
	if ( $inm && false !== strpos( str_replace( 'W/', '', $inm ), $etag ) ) {
		return true;
	}
	$ims = isset( $_SERVER['HTTP_IF_MODIFIED_SINCE'] ) ? (string) $_SERVER['HTTP_IF_MODIFIED_SINCE'] : '';
	if ( $ims ) {
		$t = strtotime( $ims );
		if ( $t && $t >= $mtime ) {
			return true;
		}
	}
	return false;
}

/**
 * Clave de caché de la petición, o '' si esta petición no es cacheable.
 * Las mismas reglas las repite perf.php al escribir (comparten config.php).
 */
function kp_cache_key( $cfg ) {
	$uri  = isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '/';
	$path = (string) parse_url( $uri, PHP_URL_PATH );
	$qs   = (string) parse_url( $uri, PHP_URL_QUERY );

	// Nunca: escritorio, login, REST, cron, xmlrpc, feeds, modo tele y lo que diga la configuración.
	$never = array( '/wp-admin', '/wp-login.php', '/wp-json', '/wp-cron.php', '/xmlrpc.php', '/tele', '/mando', '/feed' );
	if ( ! empty( $cfg['never'] ) && is_array( $cfg['never'] ) ) {
		$never = array_merge( $never, $cfg['never'] );
	}
	$low = strtolower( rtrim( $path, '/' ) );
	foreach ( $never as $n ) {
		$n = strtolower( rtrim( (string) $n, '/' ) );
		if ( '' === $n ) {
			continue;
		}
		if ( $low === $n || 0 === strpos( $low . '/', $n . '/' ) ) {
			return '';
		}
	}
	if ( '/' !== substr( $path, -1 ) && preg_match( '#\.(php|xml|txt|json)$#i', $path ) ) {
		return '';
	}

	// Cookies: nadie conectado, ni con comentario o contraseña de entrada.
	foreach ( array_keys( (array) $_COOKIE ) as $c ) {
		$c = (string) $c;
		if ( 0 === strpos( $c, 'wordpress_logged_in_' ) || 0 === strpos( $c, 'wp-postpass_' )
			|| 0 === strpos( $c, 'comment_author_' ) || 0 === strpos( $c, 'woocommerce_' )
			|| 0 === strpos( $c, 'kp_nocache' ) ) {
			return '';
		}
	}

	// Parámetros de consulta: solo la lista blanca (y forman parte de la clave).
	$args = array();
	if ( '' !== $qs ) {
		parse_str( $qs, $args );
		$ok = isset( $cfg['qs'] ) ? (array) $cfg['qs'] : array();
		foreach ( array_keys( $args ) as $k ) {
			if ( ! in_array( (string) $k, $ok, true ) ) {
				return '';
			}
		}
		ksort( $args );
	}

	$host = isset( $_SERVER['HTTP_HOST'] ) ? strtolower( (string) $_SERVER['HTTP_HOST'] ) : '';
	$ssl  = ( ! empty( $_SERVER['HTTPS'] ) && 'off' !== $_SERVER['HTTPS'] ) ? 'https' : 'http';
	$mob  = '';
	if ( ! empty( $cfg['mobile'] ) ) {
		$ua  = isset( $_SERVER['HTTP_USER_AGENT'] ) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
		$mob = preg_match( '#Mobile|Android|iP(hone|od|ad)#i', $ua ) ? 'm' : 'd';
	}

	return md5( $ssl . '://' . $host . $path . '?' . http_build_query( $args ) . '|' . $mob . '|' . ( isset( $cfg['salt'] ) ? $cfg['salt'] : '' ) );
}

if ( kp_cache_serve() ) {
	exit;
}
