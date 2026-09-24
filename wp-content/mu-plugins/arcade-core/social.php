<?php
/**
 * Funciones sociales del portal: partidas jugadas, "me gusta", índice ligero para
 * favoritos / seguir jugando (guardados en el navegador del usuario, sin registro).
 */
defined( 'ABSPATH' ) || exit;

final class Arcade_Social {

	public static function boot() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ), 30 );
		add_action( 'save_post_game', array( __CLASS__, 'flush_index' ) );
		add_action( 'deleted_post', array( __CLASS__, 'flush_index' ) );
	}

	public static function routes() {
		$id = array( 'id' => array( 'validate_callback' => static function ( $v ) { return is_numeric( $v ) && 'game' === get_post_type( (int) $v ); } ) );
		register_rest_route( 'arcade/v1', '/play/(?P<id>\d+)', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'play' ), 'permission_callback' => '__return_true', 'args' => $id ) );
		register_rest_route( 'arcade/v1', '/like/(?P<id>\d+)', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'like' ), 'permission_callback' => '__return_true', 'args' => $id ) );
		register_rest_route( 'arcade/v1', '/cards', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'cards' ), 'permission_callback' => '__return_true' ) );
		register_rest_route( 'arcade/v1', '/index', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'index' ), 'permission_callback' => '__return_true' ) );
	}

	/** Índice ligero de todos los juegos para la búsqueda instantánea (en caché 12 h). */
	public static function index() {
		$data = get_transient( 'arcade_index' );
		if ( false === $data ) {
			$data = array();
			foreach ( Arcade_Portal::games() as $p ) {
				$l      = Arcade_Portal::LABELS[ Arcade_Portal::genre_of( $p->ID ) ];
				$data[] = array( 't' => get_the_title( $p ), 'u' => get_permalink( $p ), 'i' => Arcade_Core::thumb( $p->ID ), 'g' => $l[0], 'c' => $l[1] );
			}
			set_transient( 'arcade_index', $data, 12 * HOUR_IN_SECONDS );
		}
		$res = new WP_REST_Response( $data );
		$res->header( 'Cache-Control', 'public, max-age=3600' );
		return $res;
	}

	public static function flush_index() {
		delete_transient( 'arcade_index' );
	}

	/** Límite simple anti-abuso: 1 acción por IP, juego y tipo cada 10 minutos. */
	private static function throttle( $kind, $id ) {
		$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		$key = 'arc_' . $kind . '_' . md5( $ip . '|' . $id );
		if ( get_transient( $key ) ) {
			return false;
		}
		set_transient( $key, 1, 'like' === $kind ? DAY_IN_SECONDS : 10 * MINUTE_IN_SECONDS );
		return true;
	}

	private static function bump( $id, $key ) {
		$n = (int) get_post_meta( $id, $key, true ) + 1;
		update_post_meta( $id, $key, $n );
		return $n;
	}

	public static function play( WP_REST_Request $r ) {
		$id = (int) $r['id'];
		$n  = self::throttle( 'play', $id ) ? self::bump( $id, '_game_plays' ) : (int) get_post_meta( $id, '_game_plays', true );
		return array( 'plays' => $n );
	}

	public static function like( WP_REST_Request $r ) {
		$id = (int) $r['id'];
		$n  = self::throttle( 'like', $id ) ? self::bump( $id, '_game_likes' ) : (int) get_post_meta( $id, '_game_likes', true );
		return array( 'likes' => $n );
	}

	/** Tarjetas HTML de una lista de IDs (para favoritos y "seguir jugando"). */
	public static function cards( WP_REST_Request $r ) {
		$ids = array_slice( array_filter( array_map( 'intval', explode( ',', (string) $r->get_param( 'ids' ) ) ) ), 0, 24 );
		if ( ! $ids ) {
			return array( 'html' => '' );
		}
		$posts = get_posts( array( 'post_type' => 'game', 'post__in' => $ids, 'orderby' => 'post__in', 'numberposts' => 24 ) );
		$html  = '';
		foreach ( $posts as $p ) {
			$html .= Arcade_Portal::card( $p );
		}
		return array( 'html' => $html );
	}

	public static function fmt( $n ) {
		$n = (int) $n;
		return $n >= 1000000 ? round( $n / 1000000, 1 ) . ' M' : ( $n >= 1000 ? round( $n / 1000, 1 ) . ' mil' : (string) $n );
	}

	public static function assets() {
		if ( ! class_exists( 'Arcade_Portal' ) || ! Arcade_Portal::is_portal() ) {
			return;
		}
		wp_enqueue_script( 'arcade-portal', plugins_url( 'assets/js/portal.js', __FILE__ ), array(), Arcade_Core::VERSION, true );
		wp_localize_script( 'arcade-portal', 'ARCADE', array( 'api' => esc_url_raw( rest_url( 'arcade/v1/' ) ), 'id' => is_singular( 'game' ) ? get_queried_object_id() : 0, 'search' => esc_url_raw( add_query_arg( array( 'post_type' => 'game' ), home_url( '/' ) ) ) ) );
	}
}
