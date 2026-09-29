<?php
/**
 * Plugin Name: Kuboplay Shield
 * Description: Seguridad (límite de peticiones, blindaje del login, cabeceras) y rendimiento (caché de página, carga ligera) para el portal.
 * Version: 1.0.0
 * Author: Kuboplay
 * License: GPLv2 or later
 * Text Domain: kuboplay-shield
 */

defined( 'ABSPATH' ) || exit;

final class KP_Shield {

	const VERSION = '1.0.0';
	const OPT     = 'kp_shield';

	/** Valores por defecto de todos los ajustes. Cada módulo añade los suyos. */
	public static function defaults() {
		return apply_filters(
			'kp_shield_defaults',
			array(
				'sec_on'   => 1,
				'perf_on'  => 1,
			)
		);
	}

	public static function opts() {
		static $o = null;
		if ( null === $o ) {
			$o = wp_parse_args( (array) get_option( self::OPT, array() ), self::defaults() );
		}
		return $o;
	}

	public static function opt( $key, $fallback = null ) {
		$o = self::opts();
		return array_key_exists( $key, $o ) ? $o[ $key ] : $fallback;
	}

	public static function save( array $new ) {
		update_option( self::OPT, wp_parse_args( $new, self::defaults() ) );
		wp_cache_delete( self::OPT, 'options' );
	}

	public static function dir() {
		return plugin_dir_path( __FILE__ );
	}

	public static function url() {
		return plugin_dir_url( __FILE__ );
	}

	/** IP real del visitante, teniendo en cuenta proxys de confianza (Cloudflare). */
	public static function ip() {
		$keys = array( 'HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR' );
		foreach ( $keys as $k ) {
			if ( empty( $_SERVER[ $k ] ) ) {
				continue;
			}
			$v = explode( ',', (string) $_SERVER[ $k ] );
			$v = trim( $v[0] );
			if ( filter_var( $v, FILTER_VALIDATE_IP ) ) {
				return $v;
			}
		}
		return '0.0.0.0';
	}

	/** Contador por clave con ventana de tiempo. Usa caché de objetos si la hay. */
	public static function hits( $key, $window ) {
		$k     = 'kps_' . md5( $key . '|' . (int) ( time() / max( 1, $window ) ) );
		$n     = (int) get_transient( $k );
		$n++;
		set_transient( $k, $n, $window * 2 );
		return $n;
	}

	public static function log( $motivo ) {
		$c = (array) get_option( 'kp_shield_stats', array() );
		$d = gmdate( 'Y-m-d' );
		$c[ $d ][ $motivo ] = ( isset( $c[ $d ][ $motivo ] ) ? (int) $c[ $d ][ $motivo ] : 0 ) + 1;
		if ( count( $c ) > 30 ) {
			ksort( $c );
			$c = array_slice( $c, -30, null, true );
		}
		update_option( 'kp_shield_stats', $c, false );
	}

	public static function boot() {
		foreach ( array( 'security', 'perf', 'admin', 'fields' ) as $mod ) {
			$f = self::dir() . ( 'admin' === $mod ? 'admin/settings.php' : ( 'fields' === $mod ? 'admin/fields.php' : 'includes/' . $mod . '.php' ) );
			if ( is_readable( $f ) ) {
				require_once $f;
			}
		}
		do_action( 'kp_shield_boot' );
	}
}

add_action( 'plugins_loaded', array( 'KP_Shield', 'boot' ), 1 );

register_activation_hook( __FILE__, function () {
	add_option( KP_Shield::OPT, KP_Shield::defaults() );
	do_action( 'kp_shield_activate' );
} );

register_deactivation_hook( __FILE__, function () {
	do_action( 'kp_shield_deactivate' );
} );
