<?php
/**
 * Plugin Name: Arcade Core
 * Description: CPT "game", taxonomías, meta de juego y reproductor lazy para el portal arcade.
 * Version: 1.31.1
 * Author:      Arcade Team
 *
 * Instalar: copiar este archivo + la carpeta /arcade-core/ en wp-content/mu-plugins/.
 */

defined( 'ABSPATH' ) || exit;

final class Arcade_Core {

	const VERSION      = '1.31.1';
	const ORIENTATIONS = array( 'portrait', 'landscape', 'auto' );
	const RATIOS       = array( '16:9', '4:3', '1:1', 'fill' );
	const ENGINES      = array( 'canvas', 'phaser', 'threejs', 'godot_web', 'construct' );
	const INPUTS       = array( 'touch', 'keyboard', 'mouse', 'gamepad' );

	const GENRES = array(
		'arcade'        => 'Arcade',
		'puzzle'        => 'Puzzle',
		'platformer'    => 'Platformer',
		'strategy-cards'=> 'Strategy/Cards',
		'3d-webgl'      => '3D/WebGL',
		'sports-casual' => 'Sports/Casual',
		'party'         => 'Fiesta',
		'racing'        => 'Carreras',
		'trivia'        => 'Trivia y palabras',
	);

	const PROFILES = array(
		'touch-only'     => 'Touch only',
		'keyboard-mouse' => 'Keyboard & mouse',
		'gamepad-ready'  => 'Gamepad ready',
		'hybrid'         => 'Hybrid',
	);

	public static function boot() {
		add_action( 'init', array( __CLASS__, 'register_types' ), 5 );
		add_action( 'init', array( __CLASS__, 'register_meta' ), 6 );
		add_action( 'init', array( __CLASS__, 'maybe_upgrade' ), 20 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
		add_filter( 'script_loader_tag', array( __CLASS__, 'module_tag' ), 10, 2 );
		add_filter( 'the_content', array( __CLASS__, 'inject_player' ), 5 );
		add_shortcode( 'arcade_game', array( __CLASS__, 'shortcode' ) );
		add_shortcode( 'arcade_grid', array( __CLASS__, 'grid_shortcode' ) );
		add_action( 'add_meta_boxes_game', array( __CLASS__, 'add_metabox' ) );
		add_action( 'save_post_game', array( __CLASS__, 'save_metabox' ), 10, 2 );
		$portal = __DIR__ . '/' . self::sub() . 'portal.php';
		if ( file_exists( $portal ) ) {
			require_once $portal;
			Arcade_Portal::boot();
		}
		$seo = __DIR__ . '/' . self::sub() . 'seo-ads.php';
		if ( file_exists( $seo ) ) {
			require_once $seo;
			Arcade_SEO::boot();
		}
		$social = __DIR__ . '/' . self::sub() . 'social.php';
		if ( file_exists( $social ) ) {
			require_once $social;
			Arcade_Social::boot();
		}
		$party = __DIR__ . '/' . self::sub() . 'party.php';
		if ( file_exists( $party ) ) {
			require_once $party;
			Arcade_Party::boot();
		}
		$importer = __DIR__ . '/' . self::sub() . 'importer.php';
		if ( file_exists( $importer ) ) {
			require_once $importer;
			Arcade_Importer::boot();
		}
	}

	/* ---------------------------------------------------------------- Types */

	public static function register_types() {
		register_post_type( 'game', array(
			'labels'       => array(
				'name'          => __( 'Games', 'arcade' ),
				'singular_name' => __( 'Game', 'arcade' ),
				'add_new_item'  => __( 'Add new game', 'arcade' ),
				'edit_item'     => __( 'Edit game', 'arcade' ),
			),
			'public'       => true,
			'show_in_rest' => true,
			'menu_icon'    => 'dashicons-games',
			'has_archive'  => 'games',
			'rewrite'      => array( 'slug' => 'game', 'with_front' => false ),
			'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ),
		) );

		$common = array( 'public' => true, 'show_in_rest' => true, 'show_admin_column' => true );

		register_taxonomy( 'game_genre', 'game', $common + array(
			'label'        => __( 'Genres', 'arcade' ),
			'hierarchical' => true,
			'rewrite'      => array( 'slug' => 'genre' ),
		) );

		register_taxonomy( 'game_tag', 'game', $common + array(
			'label'        => __( 'Game tags', 'arcade' ),
			'hierarchical' => false,
			'rewrite'      => array( 'slug' => 'game-tag' ),
		) );

		register_taxonomy( 'control_profile', 'game', $common + array(
			'label'        => __( 'Control profiles', 'arcade' ),
			'hierarchical' => true,
			'rewrite'      => array( 'slug' => 'controls' ),
		) );
	}

	/* ----------------------------------------------------------------- Meta */

	public static function register_meta() {
		$auth = static function () {
			return current_user_can( 'edit_posts' );
		};

		$enum = static function ( array $allowed, $default ) {
			return static function ( $v ) use ( $allowed, $default ) {
				$v = sanitize_text_field( (string) $v );
				return in_array( $v, $allowed, true ) ? $v : $default;
			};
		};

		$defs = array(
			'_game_embed_url'     => array( 'sanitize' => array( __CLASS__, 'sanitize_url' ), 'default' => '' ),
			'_game_orientation'   => array( 'sanitize' => $enum( self::ORIENTATIONS, 'auto' ), 'default' => 'auto', 'enum' => self::ORIENTATIONS ),
			'_game_aspect_ratio'  => array( 'sanitize' => $enum( self::RATIOS, '16:9' ), 'default' => '16:9', 'enum' => self::RATIOS ),
			'_game_tech_engine'   => array( 'sanitize' => $enum( self::ENGINES, 'canvas' ), 'default' => 'canvas', 'enum' => self::ENGINES ),
			'_game_input_methods' => array( 'sanitize' => array( __CLASS__, 'sanitize_inputs' ), 'default' => 'touch,keyboard' ),
		);

		foreach ( $defs as $key => $d ) {
			$schema = array( 'type' => 'string' );
			if ( isset( $d['enum'] ) ) {
				$schema['enum'] = $d['enum'];
			}
			register_post_meta( 'game', $key, array(
				'type'              => 'string',
				'single'            => true,
				'default'           => $d['default'],
				'sanitize_callback' => $d['sanitize'],
				'auth_callback'     => $auth,
				'show_in_rest'      => array( 'schema' => $schema ),
			) );
		}
	}

	/** Permite URL absolutas http(s) y rutas locales que empiecen por "/". */
	public static function sanitize_url( $v ) {
		$v = trim( (string) $v );
		if ( '' === $v ) {
			return '';
		}
		if ( 0 === strpos( $v, '/' ) && 0 !== strpos( $v, '//' ) ) {
			return esc_url_raw( $v ); // esc_url_raw conserva rutas relativas "/..."
		}
		return esc_url_raw( $v, array( 'http', 'https' ) );
	}

	/** Acepta array o CSV; devuelve CSV normalizado y ordenado según INPUTS. */
	public static function sanitize_inputs( $v ) {
		if ( is_string( $v ) ) {
			$maybe = maybe_unserialize( $v );
			$v     = is_array( $maybe ) ? $maybe : explode( ',', $v );
		}
		$v = array_map( 'sanitize_key', (array) $v );
		return implode( ',', array_values( array_intersect( self::INPUTS, $v ) ) );
	}

	/* ------------------------------------------------ Seed terms / rewrites */

	public static function maybe_upgrade() {
		if ( get_option( 'arcade_core_version' ) === self::VERSION ) {
			return;
		}
		// Una sola petición hace la actualización: con visitas simultáneas, sync_catalog() duplicaría juegos (slug-2).
		// INSERT IGNORE es atómico (add_option() no: hace ON DUPLICATE KEY UPDATE); el bloqueo caduca a los 5 min.
		global $wpdb;
		$lock = (int) $wpdb->get_var( "SELECT option_value FROM {$wpdb->options} WHERE option_name = 'arcade_core_upgrading'" );
		if ( $lock && time() - $lock < 300 ) {
			return;
		}
		if ( $lock ) {
			$wpdb->delete( $wpdb->options, array( 'option_name' => 'arcade_core_upgrading' ) );
		}
		$wpdb->query( $wpdb->prepare( "INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES ('arcade_core_upgrading', %s, 'no')", (string) time() ) );
		if ( 1 !== (int) $wpdb->rows_affected ) {
			return;
		}
		foreach ( array( 'game_genre' => self::GENRES, 'control_profile' => self::PROFILES ) as $tax => $terms ) {
			foreach ( $terms as $slug => $name ) {
				if ( ! term_exists( $slug, $tax ) ) {
					wp_insert_term( $name, $tax, array( 'slug' => $slug ) );
				}
			}
		}
		self::ensure_home_page();
		self::adaptive_games();
		self::sync_catalog();
		self::publish_pending();
		delete_transient( 'arcade_index' );
		flush_rewrite_rules( false );
		update_option( 'arcade_core_version', self::VERSION, false );
		$wpdb->delete( $wpdb->options, array( 'option_name' => 'arcade_core_upgrading' ) );
	}

	/**
	 * Juegos que quedaron programados por la publicación escalonada de versiones anteriores: se publican ya.
	 * Solo toca entradas del CPT game en estado 'future'; no altera borradores ni nada editado a mano.
	 */
	public static function publish_pending() {
		$ids = get_posts( array(
			'post_type'        => 'game',
			'post_status'      => 'future',
			'numberposts'      => -1,
			'fields'           => 'ids',
			'suppress_filters' => true,
		) );
		foreach ( $ids as $id ) {
			$now = current_time( 'mysql' );
			wp_update_post( array(
				'ID'            => $id,
				'post_status'   => 'publish',
				'post_date'     => $now,
				'post_date_gmt' => get_gmt_from_date( $now ),
			) );
		}
	}

	/**
	 * Juegos nuevos del plugin (games/catalog.json, generado por build_games.py): se crean solos al actualizar,
	 * sin importar XML. Publicación escalonada para el SEO (filtro arcade_publish_pace): unos cuantos al momento
	 * y el resto programados. Nunca toca juegos que ya existen (ni los editados a mano).
	 */
	public static function sync_catalog() {
		$f = __DIR__ . '/' . self::sub() . 'games/catalog.json';
		if ( ! file_exists( $f ) ) {
			return;
		}
		$data = json_decode( (string) file_get_contents( $f ), true ); // phpcs:ignore
		if ( empty( $data['games'] ) ) {
			return;
		}
		// Por defecto se publican todos al momento: el catálogo es propio y el usuario quiere verlo entero.
		// Quien prefiera escalonarlo para el SEO puede volver a array( 'now' => 15, 'every_days' => 2, 'per' => 5 ).
		$pace  = apply_filters( 'arcade_publish_pace', array( 'now' => PHP_INT_MAX, 'every_days' => 2, 'per' => 5 ) );
		$count = 0;
		$base  = time();
		foreach ( $data['games'] as $g ) {
			$slug = sanitize_title( $g['slug'] ?? '' );
			if ( '' === $slug || get_page_by_path( $slug, OBJECT, 'game' ) ) {
				continue;
			}
			$when = $count < $pace['now'] ? $base : $base + ( 1 + intdiv( $count - $pace['now'], max( 1, $pace['per'] ) ) ) * $pace['every_days'] * DAY_IN_SECONDS;
			$html = self::catalog_html( $g );
			$args = array(
				'post_type'     => 'game',
				'post_status'   => $when > $base ? 'future' : 'publish',
				'post_title'    => sanitize_text_field( $g['title'] ),
				'post_name'     => $slug,
				'post_content'  => $html,
				'post_excerpt'  => wp_trim_words( wp_strip_all_tags( $g['desc'][0] ?? '' ), 30, '…' ),
				'post_date'     => get_date_from_gmt( gmdate( 'Y-m-d H:i:s', $when ) ),
				'post_date_gmt' => gmdate( 'Y-m-d H:i:s', $when ),
			);
			$pid = wp_insert_post( wp_slash( $args ), true );
			if ( is_wp_error( $pid ) ) {
				continue;
			}
			++$count;
			$inputs = array_values( array_intersect( self::INPUTS, (array) ( $g['inputs'] ?? array() ) ) );
			update_post_meta( $pid, '_game_embed_url', '/wp-content/plugins/arcade-core/games/' . $slug . '/index.html' );
			update_post_meta( $pid, '_game_orientation', in_array( $g['orient'] ?? '', self::ORIENTATIONS, true ) ? $g['orient'] : 'auto' );
			update_post_meta( $pid, '_game_aspect_ratio', in_array( $g['aspect'] ?? '', self::RATIOS, true ) ? $g['aspect'] : 'fill' );
			update_post_meta( $pid, '_game_tech_engine', 'canvas' );
			update_post_meta( $pid, '_game_input_methods', implode( ',', $inputs ) );
			update_post_meta( $pid, '_game_desc', $html );
			if ( ! empty( $g['players'] ) ) {
				update_post_meta( $pid, '_game_players', sanitize_text_field( $g['players'] ) );
			}
			wp_set_object_terms( $pid, isset( self::GENRES[ $g['genre'] ] ) ? $g['genre'] : 'arcade', 'game_genre' );
			wp_set_object_terms( $pid, array_map( 'sanitize_title', (array) ( $g['tags'] ?? array() ) ), 'game_tag' );
			$prof = array();
			if ( array( 'touch' ) === $inputs ) {
				$prof[] = 'touch-only';
			} elseif ( in_array( 'touch', $inputs, true ) ) {
				$prof[] = 'hybrid';
			} elseif ( array_intersect( array( 'keyboard', 'mouse' ), $inputs ) ) {
				$prof[] = 'keyboard-mouse';
			}
			if ( in_array( 'gamepad', $inputs, true ) ) {
				$prof[] = 'gamepad-ready';
			}
			wp_set_object_terms( $pid, $prof ?: array( 'touch-only' ), 'control_profile' );
		}
	}

	/** Descripción propia del catálogo en HTML: párrafos, jugadores y consejos. */
	public static function catalog_html( $g ) {
		$out = '';
		foreach ( (array) ( $g['desc'] ?? array() ) as $p ) {
			$out .= '<p>' . esc_html( $p ) . '</p>';
		}
		if ( ! empty( $g['players'] ) ) {
			$out .= '<p><strong>Jugadores:</strong> ' . esc_html( $g['players'] ) . ( ! empty( $g['mp'] ) ? '. Se puede jugar en la tele con los móviles como mandos (modo fiesta); las plazas libres las ocupa la CPU.' : '.' ) . '</p>';
		}
		if ( ! empty( $g['tips'] ) ) {
			$out .= '<h3>Consejos</h3><ul>';
			foreach ( (array) $g['tips'] as $t ) {
				$out .= '<li>' . esc_html( $t ) . '</li>';
			}
			$out .= '</ul>';
		}
		return $out;
	}

	/** Juegos que ya eligen lienzo vertical u horizontal según la pantalla: sin forzar orientación. */
	private static function adaptive_games() {
		foreach ( array( 'lunar-lander', 'tower-guard', 'maze-defense', 'hex-defense', 'micro-tactics', 'hex-skirmish', 'serpent-grid', 'neon-paddle', 'rock-belt' ) as $slug ) {
			$p = get_page_by_path( $slug, OBJECT, 'game' );
			if ( $p && 'fill' !== get_post_meta( $p->ID, '_game_aspect_ratio', true ) ) {
				update_post_meta( $p->ID, '_game_orientation', 'auto' );
				update_post_meta( $p->ID, '_game_aspect_ratio', 'fill' );
			}
		}
	}

	/** Crea la página "Juegos" con [arcade_grid] y la pone de portada si la portada era el blog. */
	private static function ensure_home_page() {
		$pid = (int) get_option( 'arcade_home_page_id' );
		if ( ! $pid || ! get_post( $pid ) ) {
			$existing = get_page_by_path( 'juegos' );
			$pid      = $existing ? $existing->ID : wp_insert_post( array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => 'Juegos',
				'post_name'    => 'juegos',
				'post_content' => "<!-- wp:shortcode -->\n[arcade_grid]\n<!-- /wp:shortcode -->",
			) );
			if ( ! $pid || is_wp_error( $pid ) ) {
				return;
			}
			update_option( 'arcade_home_page_id', (int) $pid, false );
		}
		if ( 'posts' === get_option( 'show_on_front' ) ) {
			update_option( 'show_on_front', 'page' );
			update_option( 'page_on_front', (int) $pid );
		}
	}

	/* ----------------------------------------------------------------- Grid */

	/** [arcade_grid] o [arcade_grid genre="puzzle" limit="20"] */
	public static function grid_shortcode( $atts ) {
		$atts = shortcode_atts( array( 'genre' => '', 'limit' => 200 ), $atts, 'arcade_grid' );
		$args = array(
			'post_type'      => 'game',
			'post_status'    => 'publish',
			'posts_per_page' => (int) $atts['limit'],
			'orderby'        => 'date',
			'order'          => 'ASC',
			'no_found_rows'  => true,
		);
		if ( $atts['genre'] ) {
			$args['tax_query'] = array( array( 'taxonomy' => 'game_genre', 'field' => 'slug', 'terms' => sanitize_title( $atts['genre'] ) ) );
		}
		$q = new WP_Query( $args );
		if ( ! $q->have_posts() ) {
			return '<p>' . esc_html__( 'Todavía no hay juegos. Importa arcade_pilot_100.xml en Herramientas → Importar → WordPress.', 'arcade' ) . '</p>';
		}

		$colors = array( 'arcade' => '#ff5fa2', 'puzzle' => '#5ce1e6', 'platformer' => '#f2d15c', 'strategy-cards' => '#7cf7a0', '3d-webgl' => '#b98cff', 'sports-casual' => '#ffa94d' );
		$groups = array_fill_keys( array_keys( self::GENRES ), array() );
		foreach ( $q->posts as $post ) {
			$terms = get_the_terms( $post->ID, 'game_genre' );
			$g     = ( $terms && ! is_wp_error( $terms ) ) ? $terms[0]->slug : 'arcade';
			$groups[ isset( $groups[ $g ] ) ? $g : 'arcade' ][] = array( $post, '' !== self::resolve_embed( $post->ID ) );
		}

		$out = '<style>.arcade-grid-sec{margin:0 0 2rem}.arcade-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}'
			. '.arcade-card{position:relative;display:flex;flex-direction:column;justify-content:flex-end;aspect-ratio:1;padding:10px;border-radius:12px;background:#1b1f3b center/cover no-repeat;color:#f5f1e6;text-decoration:none;overflow:hidden;border-bottom:4px solid var(--c)}'
			. '.arcade-card b{font:700 .95rem/1.2 system-ui,sans-serif;position:relative}.arcade-card i{position:absolute;top:8px;right:8px;font:600 .7rem system-ui,sans-serif;font-style:normal;padding:3px 7px;border-radius:99px;background:var(--c);color:#1b1f3b}'
			. '.arcade-card.soon{opacity:.55}.arcade-card:focus-visible{outline:3px solid var(--c);outline-offset:2px}</style>';
		foreach ( $groups as $g => $items ) {
			if ( ! $items ) {
				continue;
			}
			usort( $items, static function ( $a, $b ) { return (int) $b[1] - (int) $a[1]; } ); // jugables primero
			$out .= '<section class="arcade-grid-sec"><h2>' . esc_html( self::GENRES[ $g ] ) . '</h2><div class="arcade-grid">';
			foreach ( $items as list( $post, $ok ) ) {
				$thumb = self::thumb( $post->ID );
				$out  .= sprintf(
					'<a class="arcade-card%1$s" href="%2$s" style="--c:%3$s%4$s"><i>%5$s</i><b>%6$s</b></a>',
					$ok ? '' : ' soon',
					esc_url( get_permalink( $post ) ),
					esc_attr( $colors[ $g ] ),
					$thumb ? ';background-image:url(' . esc_url( $thumb ) . ')' : '',
					$ok ? '▶ Jugar' : 'Pronto',
					esc_html( get_the_title( $post ) )
				);
			}
			$out .= '</div></section>';
		}
		return $out;
	}

	/* --------------------------------------------------------------- Assets */

	private static function needs_assets() {
		if ( is_singular( 'game' ) || is_post_type_archive( 'game' ) || is_tax( array( 'game_genre', 'game_tag', 'control_profile' ) ) ) {
			return true;
		}
		$post = get_post();
		return $post && has_shortcode( $post->post_content, 'arcade_game' );
	}

	public static function enqueue() {
		if ( ! self::needs_assets() ) {
			return;
		}
		// Funciona como MU plugin (mu-plugins/arcade-core.php + arcade-core/assets)
		// o como plugin normal (plugins/arcade-core/arcade-core.php + assets).
		$src = plugins_url( self::sub() . 'assets/js/arcade-engine.js', __FILE__ );
		if ( function_exists( 'wp_enqueue_script_module' ) ) { // WP 6.5+
			wp_enqueue_script_module( 'arcade-engine', $src, array(), self::VERSION );
		} else {
			wp_enqueue_script( 'arcade-engine', $src, array(), self::VERSION, true );
		}
	}

	/** Fallback < 6.5: fuerza type="module". */
	public static function module_tag( $tag, $handle ) {
		if ( 'arcade-engine' !== $handle ) {
			return $tag;
		}
		$tag = preg_replace( '/\stype=("|\')[^"\']*\1/', '', $tag );
		return str_replace( '<script ', '<script type="module" ', $tag );
	}

	/* --------------------------------------------------------------- Player */

	/** Prefijo de subcarpeta: '' (plugin normal) o 'arcade-core/' (MU plugin). */
	public static function sub() {
		return is_dir( __DIR__ . '/arcade-core/assets' ) ? 'arcade-core/' : '';
	}

	/**
	 * Resuelve la URL jugable:
	 * 1) juego incluido en el plugin: games/{slug}/index.html
	 * 2) meta _game_embed_url (ruta local solo si el archivo existe; URL externa tal cual)
	 * Devuelve '' si no hay juego disponible.
	 */
	public static function resolve_embed( $post_id ) {
		$slug = get_post_field( 'post_name', $post_id );
		$rel  = self::sub() . 'games/' . $slug . '/index.html';
		if ( $slug && file_exists( __DIR__ . '/' . $rel ) ) {
			return plugins_url( $rel, __FILE__ );
		}
		$url = (string) get_post_meta( $post_id, '_game_embed_url', true );
		if ( '' === $url ) {
			return '';
		}
		if ( 0 === strpos( $url, '/' ) && 0 !== strpos( $url, '//' ) ) {
			$path = strtok( $url, '?#' );
			$candidates = array( ABSPATH . ltrim( $path, '/' ) );
			if ( 0 === strpos( $path, '/wp-content/' ) ) {
				$candidates[] = WP_CONTENT_DIR . substr( $path, strlen( '/wp-content' ) );
			}
			foreach ( $candidates as $file ) {
				if ( file_exists( $file ) ) {
					return home_url( $url );
				}
			}
			return '';
		}
		return $url;
	}

	/** Miniatura: imagen destacada o captura incluida en games/{slug}/thumb.webp. */
	public static function thumb( $post_id, $size = 'medium' ) {
		$t = get_the_post_thumbnail_url( $post_id, $size );
		if ( $t ) {
			return $t;
		}
		$remote = (string) get_post_meta( $post_id, '_game_thumb_url', true );
		if ( $remote ) {
			return $remote;
		}
		$rel = self::sub() . 'games/' . get_post_field( 'post_name', $post_id ) . '/thumb.webp';
		return file_exists( __DIR__ . '/' . $rel ) ? add_query_arg( 'v', self::VERSION, plugins_url( $rel, __FILE__ ) ) : '';
	}

	public static function player_html( $post_id ) {
		$url = self::resolve_embed( $post_id );
		if ( ! $url ) {
			return '<div class="arcade-soon" style="padding:2.5rem 1rem;margin:0 0 1.5rem;text-align:center;background:#1b1f3b;color:#f5f1e6;border-radius:10px;font:600 1rem/1.4 system-ui,sans-serif">'
				. esc_html__( 'Próximamente / Coming soon', 'arcade' ) . '</div>';
		}
		$thumb = self::thumb( $post_id, 'large' );
		$style = $thumb ? sprintf( ' style="background-image:url(%s)"', esc_url( $thumb ) ) : '';

		return sprintf(
			'<div class="arcade-player" data-arcade-game data-embed="%1$s" data-orientation="%2$s" data-aspect="%3$s" data-engine="%4$s" data-inputs="%5$s" data-title="%6$s"%7$s>'
			. '<button type="button" class="arcade-play" data-arcade-play>%8$s</button></div>',
			esc_url( $url ),
			esc_attr( get_post_meta( $post_id, '_game_orientation', true ) ?: 'auto' ),
			esc_attr( get_post_meta( $post_id, '_game_aspect_ratio', true ) ?: '16:9' ),
			esc_attr( get_post_meta( $post_id, '_game_tech_engine', true ) ?: 'canvas' ),
			esc_attr( get_post_meta( $post_id, '_game_input_methods', true ) ),
			esc_attr( get_the_title( $post_id ) ),
			$style,
			'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>' . esc_html__( 'Jugar', 'arcade' )
		);
	}

	public static function inject_player( $content ) {
		if ( ! empty( $GLOBALS['arcade_no_inject'] ) ) {
			return $content;
		}
		if ( is_singular( 'game' ) && in_the_loop() && is_main_query() ) {
			return self::player_html( get_the_ID() ) . $content;
		}
		return $content;
	}

	/** [arcade_game id="123"] o [arcade_game slug="serpent-grid"] */
	public static function shortcode( $atts ) {
		$atts = shortcode_atts( array( 'id' => 0, 'slug' => '' ), $atts, 'arcade_game' );
		$post = $atts['id'] ? get_post( (int) $atts['id'] ) : get_page_by_path( sanitize_title( $atts['slug'] ), OBJECT, 'game' );
		return ( $post && 'game' === $post->post_type && 'publish' === $post->post_status ) ? self::player_html( $post->ID ) : '';
	}

	/* ------------------------------------------------------------ Metabox */

	public static function add_metabox() {
		add_meta_box( 'arcade_game_meta', __( 'Game settings', 'arcade' ), array( __CLASS__, 'render_metabox' ), 'game', 'normal', 'high' );
	}

	public static function render_metabox( $post ) {
		wp_nonce_field( 'arcade_save_meta', 'arcade_meta_nonce' );
		$m      = static function ( $k ) use ( $post ) { return get_post_meta( $post->ID, $k, true ); };
		$inputs = explode( ',', (string) $m( '_game_input_methods' ) );
		$select = static function ( $name, array $opts, $cur ) {
			$out = '<select name="' . esc_attr( $name ) . '">';
			foreach ( $opts as $o ) {
				$out .= sprintf( '<option value="%1$s"%2$s>%1$s</option>', esc_attr( $o ), selected( $cur, $o, false ) );
			}
			return $out . '</select>';
		};
		?>
		<p><label><strong>Embed URL</strong><br>
			<input type="text" class="widefat" name="_game_embed_url" value="<?php echo esc_attr( $m( '_game_embed_url' ) ); ?>" placeholder="/wp-content/uploads/arcade/games/slug/index.html"></label></p>
		<p>
			<label>Orientation <?php echo $select( '_game_orientation', self::ORIENTATIONS, $m( '_game_orientation' ) ); // phpcs:ignore ?></label>
			&nbsp;<label>Aspect <?php echo $select( '_game_aspect_ratio', self::RATIOS, $m( '_game_aspect_ratio' ) ); // phpcs:ignore ?></label>
			&nbsp;<label>Engine <?php echo $select( '_game_tech_engine', self::ENGINES, $m( '_game_tech_engine' ) ); // phpcs:ignore ?></label>
		</p>
		<p><strong>Inputs</strong>
			<?php foreach ( self::INPUTS as $i ) : ?>
				<label><input type="checkbox" name="_game_input_methods[]" value="<?php echo esc_attr( $i ); ?>" <?php checked( in_array( $i, $inputs, true ) ); ?>> <?php echo esc_html( $i ); ?></label>
			<?php endforeach; ?>
		</p>
		<?php
	}

	public static function save_metabox( $post_id, $post ) {
		if ( ! isset( $_POST['arcade_meta_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['arcade_meta_nonce'] ), 'arcade_save_meta' ) ) {
			return;
		}
		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || wp_is_post_revision( $post_id ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		foreach ( array( '_game_embed_url', '_game_orientation', '_game_aspect_ratio', '_game_tech_engine' ) as $k ) {
			if ( isset( $_POST[ $k ] ) ) {
				update_post_meta( $post_id, $k, wp_unslash( $_POST[ $k ] ) ); // sanitizado por register_post_meta
			}
		}
		$inputs = isset( $_POST['_game_input_methods'] ) ? (array) wp_unslash( $_POST['_game_input_methods'] ) : array();
		update_post_meta( $post_id, '_game_input_methods', $inputs );
	}
}

Arcade_Core::boot();
