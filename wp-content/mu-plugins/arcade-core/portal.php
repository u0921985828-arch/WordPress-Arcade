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
		'party'          => array( 'Fiesta', '#ff6fb5', '' ),
		'racing'         => array( 'Carreras', '#5b8cff', '' ),
		'trivia'         => array( 'Trivia y palabras', '#b5d94a', '' ),
	);

	public static function boot() {
		add_filter( 'template_include', array( __CLASS__, 'template' ), 99 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ), 20 );
		add_action( 'pre_get_posts', array( __CLASS__, 'query' ) );
		add_filter( 'document_title_parts', array( __CLASS__, 'title' ) );
		add_action( 'init', array( __CLASS__, 'manifest' ), 1 );
		add_action( 'wp_head', array( __CLASS__, 'head_icons' ), 3 );
	}

	/** Descripción de cada categoría (cabecera del listado y SEO). */
	const GENRE_DESC = array(
		'arcade'         => 'Clásicos de reflejos y puntuación: naves, laberintos, serpientes y bloques. Partidas rápidas para batir tu récord.',
		'puzzle'         => 'Rompecabezas de lógica con niveles que siempre tienen solución: 2048, gemas, tuberías, sudoku, nonogramas y más.',
		'platformer'     => 'Salta, esquiva y corre por niveles dibujados a mano: plataformas laterales, torres verticales y mazmorras.',
		'strategy-cards' => 'Solitarios con las reglas de siempre, mahjong, damas, reversi, defensa de torres y tácticas por turnos.',
		'3d-webgl'       => 'Carreras, minigolf, laberintos isométricos y cubos en perspectiva que funcionan en cualquier navegador.',
		'sports-casual'  => 'Penaltis, bolos, billar, dardos, baloncesto y ritmo: deportes de un toque para partidas cortas.',
		'party'          => 'Juegos para jugar en grupo: minijuegos, empujones, bombas y deportes a cuatro. En la tele con los móviles como mandos o contra la CPU.',
		'racing'         => 'Karts, rallies y circuitos vistos desde arriba: derrapa, adelanta y gana la carrera, solo o con hasta tres amigos.',
		'trivia'         => 'Preguntas, palabras y letras en español: trivia de sobremesa, palabra del día, sopas de letras y ahorcado.',
	);

	/* ------------------------------------------------------------ PWA */

	/** /manifest.webmanifest: el portal se puede instalar como app en el móvil. */
	public static function manifest() {
		$path = wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_PATH ); // phpcs:ignore
		$base = rtrim( (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH ), '/' ); // WordPress en subcarpeta
		if ( $base . '/manifest.webmanifest' !== $path ) {
			return;
		}
		$img = plugins_url( 'assets/img/', __FILE__ );
		header( 'Content-Type: application/manifest+json; charset=utf-8' );
		header( 'Cache-Control: public, max-age=86400' );
		echo wp_json_encode( array(
			'name'             => self::brand() . ' — Juegos gratis',
			'short_name'       => self::brand(),
			'description'      => 'Juegos HTML5 gratis para móvil y PC, sin descargas.',
			'lang'             => 'es',
			'start_url'        => home_url( '/?pwa=1' ),
			'scope'            => home_url( '/' ),
			'display'          => 'standalone',
			'background_color' => '#0b0d12',
			'theme_color'      => '#0b0d12',
			'icons'            => array(
				array( 'src' => $img . 'icon-192.png', 'sizes' => '192x192', 'type' => 'image/png' ),
				array( 'src' => $img . 'icon-512.png', 'sizes' => '512x512', 'type' => 'image/png' ),
				array( 'src' => $img . 'icon-maskable.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable' ),
			),
		), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		exit;
	}

	public static function head_icons() {
		if ( ! self::is_portal() ) {
			return;
		}
		echo '<link rel="manifest" href="' . esc_url( home_url( '/manifest.webmanifest' ) ) . '">' . "\n";
		if ( ! has_site_icon() ) {
			$img = plugins_url( 'assets/img/', __FILE__ );
			printf( '<link rel="icon" href="%1$sicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="%1$sicon-192.png">' . "\n", esc_url( $img ) );
		}
		self::preload_game();
	}

	/**
	 * Latencia: en la ficha de un juego propio se precargan (prefetch, prioridad baja) la página del juego y
	 * sus scripts, así al pulsar «Jugar» ya están en la caché del navegador y arranca sin espera de red.
	 * La lista sale de games/deps.json (la genera build_games.py con las mismas versiones ?v= del index.html).
	 */
	private static function preload_game() {
		if ( ! is_singular( 'game' ) ) {
			return;
		}
		$post = get_queried_object();
		$slug = $post->post_name;
		$tail = $slug . '/index.html';
		$url  = Arcade_Core::resolve_embed( $post->ID );
		if ( ! $url || substr( $url, -strlen( $tail ) ) !== $tail ) {
			return; // Juego importado (otro dominio): no se precarga nada.
		}
		$base = substr( $url, 0, -strlen( $tail ) );
		$out  = '<link rel="prefetch" href="' . esc_url( $url ) . '">';
		$deps = json_decode( (string) @file_get_contents( __DIR__ . '/games/deps.json' ), true ); // phpcs:ignore
		if ( isset( $deps[ $slug ] ) && is_array( $deps[ $slug ] ) ) {
			foreach ( array_slice( $deps[ $slug ], 0, 6 ) as $d ) {
				$out .= '<link rel="prefetch" as="script" href="' . esc_url( $base . $d ) . '">';
			}
		}
		echo $out . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput
	}

	public static function is_portal() {
		if ( is_admin() ) {
			return false;
		}
		if ( is_404() ) {
			return true;
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
		// Búsqueda desde la cabecera sin tipo: solo juegos.
		if ( $q->is_search() && ! $q->get( 'post_type' ) ) {
			$q->set( 'post_type', 'game' );
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
		return ( '' === $n || in_array( strtolower( $n ), array( 'my blog', 'mi blog', 'my wordpress', 'wordpress' ), true ) ) ? 'Kuboplay' : $n;
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
			'<a class="ax-card%1$s%2$s" href="%3$s" style="--c:%4$s" data-t="%11$s" data-p="%12$d" data-d="%13$d">%10$s<span class="ax-img">%5$s%9$s%14$s</span><span class="ax-meta"><b>%6$s</b><i><span class="ax-dot"></span>%8$s</i></span></a>',
			$big ? ' big' : '',
			$ok ? '' : ' soon',
			esc_url( get_permalink( $post ) ),
			esc_attr( $l[1] ),
			$thumb ? '<img src="' . esc_url( $thumb ) . '" alt="" loading="lazy" decoding="async">' : '<em></em>',
			esc_html( get_the_title( $post ) ),
			esc_html( $l[2] ),
			esc_html( $l[0] ),
			$ok ? '<span class="ax-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>' : '<span class="ax-soon">Próximamente</span>',
			self::is_own( $post->ID ) && self::has_imports() ? '<span class="ax-excl">Exclusivo</span>' : '',
			esc_attr( remove_accents( strtolower( get_the_title( $post ) ) ) ),
			(int) get_post_meta( $post->ID, '_game_plays', true ),
			(int) get_post_time( 'U', true, $post ),
			self::mp( $post ) ? '<span class="ax-mpb">' . self::MP_ICO . 'Multijugador</span>' : ''
		);
	}

	const MP_ICO = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><circle cx="9" cy="8" r="3.2" fill="currentColor"/><path d="M2.8 19c.5-3.4 3-5.4 6.2-5.4s5.7 2 6.2 5.4z" fill="currentColor"/><circle cx="16.8" cy="9" r="2.6" fill="currentColor" opacity=".7"/><path d="M16.6 13.4c2.7.1 4.3 2 4.7 5.1h-4.5c-.2-1.9-.9-3.6-2.1-4.7.6-.3 1.2-.4 1.9-.4z" fill="currentColor" opacity=".7"/></svg>';

	/** Etiqueta de jugadores si el juego es multijugador en el modo tele ('' si no). */
	public static function mp( $post ) {
		return class_exists( 'Arcade_Party' ) ? Arcade_Party::players_label( $post->post_name ) : '';
	}

	/** Tarjeta compacta (lista lateral de similares). */
	public static function mini( $post ) {
		$l = self::LABELS[ self::genre_of( $post->ID ) ];
		$t = Arcade_Core::thumb( $post->ID );
		return sprintf( '<a class="ax-mini" href="%1$s" style="--c:%2$s"><span class="ax-mini-img">%3$s</span><span><b>%4$s</b><i><span class="ax-dot"></span>%5$s%6$s</i></span></a>',
			esc_url( get_permalink( $post ) ), esc_attr( $l[1] ), $t ? '<img src="' . esc_url( $t ) . '" alt="" loading="lazy" decoding="async">' : '', esc_html( get_the_title( $post ) ), esc_html( $l[0] ), self::mp( $post ) ? '<span class="ax-mpb sm">' . self::MP_ICO . 'Multijugador</span>' : '' );
	}

	/** Texto corto para destacados: la ayuda del juego o el extracto. */
	public static function blurb( $post_id ) {
		$t = self::howto( $post_id ) ?: wp_strip_all_tags( get_the_excerpt( $post_id ) );
		return wp_trim_words( $t, 26, '…' );
	}

	/** Selección del día (estable durante el día, rota cada día), un juego por categoría. */
	public static function picks( $all, $n = 5 ) {
		$day  = gmdate( 'Y-m-d' );
		$pool = array_values( array_filter( $all, static function ( $p ) { return '' !== Arcade_Core::resolve_embed( $p->ID ) && Arcade_Core::thumb( $p->ID ); } ) );
		usort( $pool, static function ( $a, $b ) use ( $day ) { return crc32( $day . $a->post_name ) <=> crc32( $day . $b->post_name ); } );
		$out  = array();
		$seen = array();
		foreach ( $pool as $p ) {
			$g = self::genre_of( $p->ID );
			if ( isset( $seen[ $g ] ) ) {
				continue;
			}
			$seen[ $g ] = 1;
			$out[]      = $p;
			if ( count( $out ) >= $n ) {
				break;
			}
		}
		// Si hay menos categorías que huecos, se completa con el resto del orden del día.
		foreach ( $pool as $p ) {
			if ( count( $out ) >= $n ) {
				break;
			}
			if ( ! in_array( $p, $out, true ) ) {
				$out[] = $p;
			}
		}
		return $out;
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
		$own = (string) get_post_meta( $post_id, '_game_desc', true ); // juegos del catálogo ampliado: texto propio
		if ( '' !== $own ) {
			return wp_kses_post( $own );
		}
		$g     = self::genre_of( $post_id );
		$kind  = array( 'arcade' => 'arcade', 'puzzle' => 'de puzzle', 'platformer' => 'de plataformas', 'strategy-cards' => 'de estrategia y cartas', '3d-webgl' => 'en 3D', 'sports-casual' => 'de deportes y habilidad', 'party' => 'de fiesta', 'racing' => 'de carreras', 'trivia' => 'de preguntas y palabras' )[ $g ];
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
			'party'          => array( 'Las rondas son cortas: si pierdes una, en la siguiente todo vuelve a empezar.', 'Con amigos es mejor en la tele: cada uno usa su móvil como mando.' ),
			'racing'         => array( 'Frena antes de la curva y acelera al salir: derrapar a tiempo gana más que ir siempre a fondo.', 'Aprende el circuito en la primera vuelta y arriesga en la segunda.' ),
			'trivia'         => array( 'Si dudas entre dos respuestas, descarta primero la que seguro que no es.', 'Vuelve cada día: hay retos nuevos con la misma dificultad para todos.' ),
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
		static $texts = null;
		if ( null === $texts ) {
			$texts = (array) include dirname( __FILE__ ) . '/howto-texts.php';
		}
		return $texts[ get_post_field( 'post_name', $post_id ) ] ?? '';
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
