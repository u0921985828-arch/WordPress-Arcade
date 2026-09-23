<?php
/**
 * Capa de portal: plantillas propias (portada, ficha de juego, listados y búsqueda)
 * independientes del tema, con diseño oscuro mobile-first.
 */
defined( 'ABSPATH' ) || exit;

final class Arcade_Portal {

	const LABELS = array(
		'arcade'         => array( 'Arcade', '#f0647e', '' ),
		'puzzle'         => array( 'Puzzle', '#3cc7d0', '' ),
		'platformer'     => array( 'Plataformas', '#e9b949', '' ),
		'strategy-cards' => array( 'Estrategia y cartas', '#4cc38a', '' ),
		'3d-webgl'       => array( '3D', '#9b8afb', '' ),
		'sports-casual'  => array( 'Deportes y casual', '#f08c4a', '' ),
	);

	public static function boot() {
		add_filter( 'template_include', array( __CLASS__, 'template' ), 99 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ), 20 );
		add_action( 'pre_get_posts', array( __CLASS__, 'query' ) );
		add_filter( 'document_title_parts', array( __CLASS__, 'title' ) );
	}

	public static function is_portal() {
		if ( is_admin() ) {
			return false;
		}
		if ( is_singular( 'game' ) || is_post_type_archive( 'game' ) || is_tax( array( 'game_genre', 'game_tag', 'control_profile' ) ) ) {
			return true;
		}
		if ( is_search() && 'game' === get_query_var( 'post_type' ) ) {
			return true;
		}
		$home = (int) get_option( 'arcade_home_page_id' );
		if ( is_page( array_values( (array) get_option( 'arcade_legal_pages', array() ) ) ) ) {
			return true;
		}
		if ( $home && is_page( $home ) ) {
			return true;
		}
		// Cualquier página (o la portada) que contenga [arcade_grid] usa también el diseño del portal.
		$post = is_singular() ? get_queried_object() : null;
		return $post instanceof WP_Post && has_shortcode( $post->post_content, 'arcade_grid' );
	}

	public static function template( $tpl ) {
		return self::is_portal() ? __DIR__ . '/templates/portal.php' : $tpl;
	}

	public static function assets() {
		if ( ! self::is_portal() ) {
			return;
		}
		wp_enqueue_style( 'arcade-portal', plugins_url( 'assets/css/portal.css', __FILE__ ), array(), Arcade_Core::VERSION );
	}

	public static function query( $q ) {
		if ( is_admin() || ! $q->is_main_query() ) {
			return;
		}
		if ( $q->is_post_type_archive( 'game' ) && ! empty( $_GET['exclusivos'] ) ) { // phpcs:ignore
			$q->set( 'meta_query', array( array( 'key' => '_game_source', 'compare' => 'NOT EXISTS' ) ) );
		}
		if ( $q->is_post_type_archive( 'game' ) || $q->is_tax( array( 'game_genre', 'game_tag', 'control_profile' ) ) ) {
			$q->set( 'posts_per_page', 200 );
			$q->set( 'orderby', 'title' );
			$q->set( 'order', 'ASC' );
		}
		if ( $q->is_search() && 'game' === $q->get( 'post_type' ) ) {
			$q->set( 'posts_per_page', 60 );
		}
	}

	public static function title( $parts ) {
		if ( self::is_portal() && is_front_page() ) {
			$parts['title'] = self::brand() . ' — Juegos gratis online';
			unset( $parts['tagline'], $parts['site'] );
		}
		return $parts;
	}

	public static function brand() {
		$n = trim( get_bloginfo( 'name' ) );
		return ( '' === $n || in_array( strtolower( $n ), array( 'my blog', 'mi blog', 'my wordpress', 'wordpress' ), true ) ) ? 'Arcade' : $n;
	}

	public static function genre_of( $post_id ) {
		$t = get_the_terms( $post_id, 'game_genre' );
		$g = ( $t && ! is_wp_error( $t ) ) ? $t[0]->slug : 'arcade';
		return isset( self::LABELS[ $g ] ) ? $g : 'arcade';
	}

	public static function genre_url( $slug ) {
		$t = get_term_by( 'slug', $slug, 'game_genre' );
		$u = $t ? get_term_link( $t ) : '';
		return is_wp_error( $u ) ? '' : $u;
	}

	public static function card( $post, $big = false ) {
		$g     = self::genre_of( $post->ID );
		$l     = self::LABELS[ $g ];
		$thumb = Arcade_Core::thumb( $post->ID );
		$ok    = '' !== Arcade_Core::resolve_embed( $post->ID );
		return sprintf(
			'<a class="ax-card%1$s%2$s" href="%3$s" style="--c:%4$s">%10$s<span class="ax-img">%5$s%9$s</span><span class="ax-meta"><b>%6$s</b><i><span class="ax-dot"></span>%8$s</i></span></a>',
			$big ? ' big' : '',
			$ok ? '' : ' soon',
			esc_url( get_permalink( $post ) ),
			esc_attr( $l[1] ),
			$thumb ? '<img src="' . esc_url( $thumb ) . '" alt="" loading="lazy" decoding="async">' : '<em></em>',
			esc_html( get_the_title( $post ) ),
			esc_html( $l[2] ),
			esc_html( $l[0] ),
			$ok ? '<span class="ax-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>' : '<span class="ax-soon">Próximamente</span>',
			self::is_own( $post->ID ) && self::has_imports() ? '<span class="ax-excl">Exclusivo</span>' : ''
		);
	}

	public static function has_imports() {
		static $h = null;
		if ( null === $h ) {
			global $wpdb;
			$h = (bool) $wpdb->get_var( "SELECT 1 FROM {$wpdb->postmeta} WHERE meta_key = '_game_source' LIMIT 1" );
		}
		return $h;
	}

	/** Descripción en español para los juegos propios (el texto importado es genérico). */
	public static function own_desc( $post_id ) {
		$g     = self::genre_of( $post_id );
		$kind  = array( 'arcade' => 'arcade', 'puzzle' => 'de puzzle', 'platformer' => 'de plataformas', 'strategy-cards' => 'de estrategia y cartas', '3d-webgl' => 'en 3D', 'sports-casual' => 'de deportes y habilidad' )[ $g ];
		$title = get_the_title( $post_id );
		$o     = get_post_meta( $post_id, '_game_orientation', true );
		$ori   = 'portrait' === $o ? ' Se juega mejor con el móvil en vertical.' : ( 'landscape' === $o ? ' Se juega mejor con el móvil en horizontal.' : '' );
		$tips = array(
			'arcade'         => array( 'Las primeras partidas sirven para aprender los patrones de los enemigos: fíjate en cómo se mueven antes de arriesgar.', 'La velocidad aumenta poco a poco, así que prioriza sobrevivir sobre sumar puntos rápidos al principio.' ),
			'puzzle'         => array( 'Cada nivel se genera con solución garantizada: si te atascas, reinicia y prueba otro orden de movimientos.', 'Piensa dos o tres jugadas por adelantado; los niveles avanzados premian la planificación más que la rapidez.' ),
			'platformer'     => array( 'Mantén pulsado el salto para llegar más alto y suéltalo antes para un salto corto y preciso.', 'Los puntos de control a mitad de nivel guardan tu avance: úsalos para arriesgar en los tramos difíciles.' ),
			'strategy-cards' => array( 'Antes de mover, mira todas las opciones disponibles: una jugada paciente suele abrir varias más.', 'Las reglas siguen las del juego clásico, así que la estrategia tradicional funciona también aquí.' ),
			'3d-webgl'       => array( 'La perspectiva engaña al principio: céntrate en la trayectoria y no en los detalles del fondo.', 'Juega en pantalla completa y con el móvil en horizontal para tener mejor visión.' ),
			'sports-casual'  => array( 'La precisión importa más que la fuerza: ajusta el gesto con calma antes de soltar.', 'Cada partida es corta, ideal para mejorar tu récord en pocos minutos.' ),
		)[ $g ];
		$tip = $tips[ crc32( get_post_field( 'post_name', $post_id ) ) % 2 ];
		$how = self::howto( $post_id );
		return sprintf(
			'<p><strong>%1$s</strong> es un juego %2$s exclusivo de %3$s, desarrollado desde cero con estilo propio. Se juega gratis en el navegador, sin descargas ni registro, en móvil, tablet u ordenador.%4$s</p>%5$s<p><strong>Consejo:</strong> %6$s</p><p>Tu mejor puntuación se guarda automáticamente en este dispositivo. Usa el botón de pantalla completa para jugar sin distracciones y el de pausa si necesitas parar.</p>',
			esc_html( $title ), esc_html( $kind ), esc_html( self::brand() ), esc_html( $ori ),
			'', esc_html( $tip )
		);
	}

	public static function is_own( $post_id ) {
		return '' === (string) get_post_meta( $post_id, '_game_source', true );
	}

	public static function games( $args = array() ) {
		return get_posts( array_merge( array( 'post_type' => 'game', 'post_status' => 'publish', 'numberposts' => -1, 'orderby' => 'date', 'order' => 'ASC', 'no_found_rows' => true ), $args ) );
	}

	/** Texto de ayuda del juego (window.CFG.help de su index.html). */
	public static function howto( $post_id ) {
		$meta = (string) get_post_meta( $post_id, '_game_howto', true );
		if ( $meta ) {
			return $meta;
		}
		$f = dirname( __FILE__ ) . '/games/' . get_post_field( 'post_name', $post_id ) . '/index.html';
		if ( ! file_exists( $f ) ) {
			return '';
		}
		$html = (string) file_get_contents( $f ); // phpcs:ignore
		if ( preg_match( '#window\.CFG=(\{.*?\});</script>#s', $html, $m ) ) {
			$cfg = json_decode( $m[1], true );
			if ( ! empty( $cfg['help'] ) ) {
				return (string) $cfg['help'];
			}
		}
		$fallback = array(
			'serpent-grid' => 'Desliza o usa las flechas para girar la serpiente. Come la comida para crecer y no choques contigo mismo.',
			'neon-paddle'  => 'Arrastra o usa ↑ ↓ para mover tu pala. Gana el primero en llegar a 7 puntos.',
			'rock-belt'    => 'Gira y acelera la nave, dispara a los asteroides y esquiva los fragmentos.',
			'tetra-drop'   => 'Mueve y gira las piezas para completar líneas. Desliza abajo para dejarlas caer.',
			'tetra-drop-marathon' => 'Modo maratón: empiezas más rápido. Completa líneas sin llegar arriba.',
		);
		return $fallback[ get_post_field( 'post_name', $post_id ) ] ?? '';
	}

	public static function inputs_chips( $post_id ) {
		$map = array( 'touch' => 'Táctil', 'keyboard' => 'Teclado', 'mouse' => 'Ratón', 'gamepad' => 'Mando' );
		$in  = array_filter( array_map( 'trim', explode( ',', (string) get_post_meta( $post_id, '_game_input_methods', true ) ) ) );
		$out = '';
		foreach ( $in as $i ) {
			if ( isset( $map[ $i ] ) ) {
				$out .= '<span class="ax-chip">' . esc_html( $map[ $i ] ) . '</span>';
			}
		}
		$o = get_post_meta( $post_id, '_game_orientation', true );
		if ( 'portrait' === $o ) {
			$out .= '<span class="ax-chip">Vertical</span>';
		} elseif ( 'landscape' === $o ) {
			$out .= '<span class="ax-chip">Horizontal</span>';
		}
		return $out;
	}
}
