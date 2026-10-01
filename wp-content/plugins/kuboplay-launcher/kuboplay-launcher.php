<?php
/**
 * Plugin Name: Kuboplay Lanzadera
 * Description: Pone en la portada un menú de consola a pantalla completa para elegir juego (Kuboplay, Liga de Barrios…), con mando, teclado, ratón y dedo. Al desactivarlo la portada vuelve a ser la de antes.
 * Version: 1.0.0
 * Author: Kuboplay
 * License: GPL-2.0-or-later
 * Text Domain: kuboplay-launcher
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Kuboplay_Launcher {

	const VERSION = '1.0.0';
	const OPTION  = 'kplauncher';
	const SLOTS   = 6;

	/* ----------------------------------------------------------- Ajustes */

	public static function opts() {
		return wp_parse_args(
			(array) get_option( self::OPTION, array() ),
			array(
				'title'   => '',
				'entries' => array(),
				'page'    => 0,
				'prev'    => array(),
			)
		);
	}

	/** Entradas visibles: las guardadas, o las que se detecten si aún no hay ninguna. */
	public static function entries() {
		$o = self::opts();
		$e = array();
		foreach ( (array) $o['entries'] as $row ) {
			$row = wp_parse_args( (array) $row, array( 'title' => '', 'sub' => '', 'url' => '', 'color' => '#6e62f5', 'art' => 'kubo' ) );
			if ( $row['title'] && $row['url'] && ! self::is_self( $row['url'] ) ) {
				$e[] = $row;
			}
		}
		return $e ? $e : self::detect();
	}

	/** Una ficha que lleva a la propia lanzadera no sirve de nada: se descarta. */
	public static function is_self( $url ) {
		$pid = (int) self::opts()['page'];
		$me  = $pid ? get_permalink( $pid ) : home_url( '/' );
		return untrailingslashit( (string) $url ) === untrailingslashit( (string) $me );
	}

	/** Busca los juegos instalados para no obligar a escribir nada a mano. */
	public static function detect() {
		$e = array();

		if ( class_exists( 'Arcade_Portal' ) ) {
			$e[] = array(
				'title' => method_exists( 'Arcade_Portal', 'brand' ) ? Arcade_Portal::brand() : 'Kuboplay',
				'sub'   => 'Portal de juegos · 278 juegos, 1–4 jugadores en la tele',
				'url'   => method_exists( 'Arcade_Portal', 'home' ) ? Arcade_Portal::home() : home_url( '/' ),
				'color' => '#6e62f5',
				'art'   => 'kubo',
			);
		}

		if ( class_exists( 'Liga_Barrios' ) ) {
			$e[] = array(
				'title' => 'Liga de Barrios',
				'sub'   => 'Barakaldo · RPG de criaturas y fútbol arcade',
				'url'   => Liga_Barrios::play_url(),
				'color' => '#c0572b',
				'art'   => 'liga',
			);
		}

		return $e;
	}

	/* ------------------------------------------------------------- Arranque */

	public static function init() {
		add_filter( 'template_include', array( __CLASS__, 'template' ), 100 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_filter( 'document_title_parts', array( __CLASS__, 'title' ) );
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'settings' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), array( __CLASS__, 'action_links' ) );
	}

	/** ¿Esta petición es la lanzadera? */
	public static function is_launcher() {
		if ( is_admin() || is_feed() || is_404() ) {
			return false;
		}
		$pid = (int) self::opts()['page'];
		return $pid && is_page( $pid );
	}

	public static function template( $tpl ) {
		return self::is_launcher() ? __DIR__ . '/template.php' : $tpl;
	}

	public static function assets() {
		if ( ! self::is_launcher() ) {
			return;
		}
		// El tema no pinta nada aquí: la lanzadera ocupa la pantalla entera.
		wp_enqueue_style( 'kplauncher', plugins_url( 'assets/launcher.css', __FILE__ ), array(), self::VERSION );
		wp_enqueue_script( 'kplauncher', plugins_url( 'assets/launcher.js', __FILE__ ), array(), self::VERSION, true );
	}

	public static function title( $parts ) {
		if ( self::is_launcher() ) {
			$parts['title'] = self::brand();
			unset( $parts['tagline'], $parts['site'] );
		}
		return $parts;
	}

	public static function brand() {
		$o = self::opts();
		if ( $o['title'] ) {
			return $o['title'];
		}
		$n = trim( (string) get_bloginfo( 'name' ) );
		return ( '' === $n || in_array( strtolower( $n ), array( 'my blog', 'mi blog', 'wordpress' ), true ) ) ? 'Kuboplay' : $n;
	}

	/* ------------------------------------------------- Portada: poner y quitar */

	/**
	 * Al activar: crea la página de la lanzadera, apunta la portada a ella y se guarda
	 * cuál era la portada de antes. Al desactivar se devuelve tal cual estaba.
	 */
	public static function activate() {
		$o = self::opts();

		$pid = (int) $o['page'];
		if ( ! $pid || ! get_post( $pid ) ) {
			$pid = (int) wp_insert_post( array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => 'Elige juego',
				'post_name'    => 'elige-juego',
				'post_content' => '',
			) );
			if ( ! $pid || is_wp_error( $pid ) ) {
				return;
			}
		}

		$o['page'] = $pid;
		if ( ! $o['prev'] ) {
			$o['prev'] = array(
				'show_on_front' => (string) get_option( 'show_on_front' ),
				'page_on_front' => (int) get_option( 'page_on_front' ),
			);
		}
		update_option( self::OPTION, $o );

		// La portada se cambia ANTES de detectar los juegos: si no, el portal del arcade
		// todavía responde en «/» y la ficha de Kuboplay apuntaría a la propia lanzadera.
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $pid );

		if ( ! $o['entries'] ) {
			$o['entries'] = self::detect();
			update_option( self::OPTION, $o );
		}
		flush_rewrite_rules();
	}

	public static function deactivate() {
		$o = self::opts();
		if ( ! empty( $o['prev']['show_on_front'] ) ) {
			update_option( 'show_on_front', $o['prev']['show_on_front'] );
			update_option( 'page_on_front', (int) $o['prev']['page_on_front'] );
		}
		flush_rewrite_rules();
	}

	/* -------------------------------------------------------------- Dibujo */

	/**
	 * Portadas dibujadas por código (SVG en línea), como todo el arte del proyecto:
	 * nada de imágenes de terceros y nada que descargar.
	 */
	public static function art( $kind, $color ) {
		$c = esc_attr( $color );
		if ( 'liga' === $kind ) {
			// Campo con líneas y un balón de píxeles.
			$o  = '<svg class="kp-art" viewBox="0 0 160 200" aria-hidden="true" focusable="false">';
			$o .= '<defs><linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6b3a"/><stop offset="1" stop-color="#1b3f26"/></linearGradient></defs>';
			$o .= '<rect width="160" height="200" fill="url(#lg1)"/>';
			for ( $i = 0; $i < 10; $i++ ) {
				$o .= '<rect y="' . ( $i * 20 ) . '" width="160" height="10" fill="#ffffff" opacity=".045"/>';
			}
			$o .= '<g fill="none" stroke="#efe3c8" stroke-opacity=".55" stroke-width="3">';
			$o .= '<rect x="12" y="12" width="136" height="176"/><line x1="12" y1="100" x2="148" y2="100"/>';
			$o .= '<circle cx="80" cy="100" r="26"/><rect x="46" y="12" width="68" height="28"/><rect x="46" y="160" width="68" height="28"/></g>';
			// Balón pixelado de 8x8 bloques.
			$o .= '<g transform="translate(60 80)">';
			$o .= '<rect x="0" y="0" width="40" height="40" rx="20" fill="#efe3c8" stroke="#1d1b26" stroke-width="4"/>';
			$o .= '<path d="M20 10 L29 17 L25 28 L15 28 L11 17 Z" fill="#1d1b26"/>';
			$o .= '<path d="M20 2 L20 10 M3 18 L11 17 M37 18 L29 17 M11 36 L15 28 M29 36 L25 28" stroke="#1d1b26" stroke-width="4" fill="none"/>';
			$o .= '</g></svg>';
			return $o;
		}

		// Cubo isométrico de la marca.
		$o  = '<svg class="kp-art" viewBox="0 0 160 200" aria-hidden="true" focusable="false">';
		$o .= '<rect width="160" height="200" fill="#151226"/>';
		$o .= '<g opacity=".25" stroke="' . $c . '" stroke-width="2" fill="none">';
		for ( $i = -4; $i < 9; $i++ ) {
			$o .= '<line x1="' . ( $i * 24 ) . '" y1="0" x2="' . ( $i * 24 + 100 ) . '" y2="200"/>';
		}
		$o .= '</g>';
		$o .= '<g transform="translate(80 104)">';
		$o .= '<path d="M0 -52 L52 -26 L0 0 L-52 -26 Z" fill="#a097ff" stroke="#1a1530" stroke-width="5" stroke-linejoin="round"/>';
		$o .= '<path d="M-52 -26 L0 0 L0 52 L-52 26 Z" fill="' . $c . '" stroke="#1a1530" stroke-width="5" stroke-linejoin="round"/>';
		$o .= '<path d="M52 -26 L0 0 L0 52 L52 26 Z" fill="#463ac4" stroke="#1a1530" stroke-width="5" stroke-linejoin="round"/>';
		$o .= '</g></svg>';
		return $o;
	}

	/* --------------------------------------------------------------- Panel */

	public static function action_links( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=kuboplay-launcher' ) ) . '">' . esc_html__( 'Ajustes', 'kuboplay-launcher' ) . '</a>' );
		return $links;
	}

	public static function menu() {
		add_options_page( 'Lanzadera', 'Lanzadera', 'manage_options', 'kuboplay-launcher', array( __CLASS__, 'page' ) );
	}

	public static function settings() {
		register_setting( 'kplauncher_group', self::OPTION, array( 'type' => 'array', 'sanitize_callback' => array( __CLASS__, 'sanitize' ) ) );
	}

	public static function sanitize( $in ) {
		$o   = self::opts();
		$out = $o;
		$out['title'] = isset( $in['title'] ) ? sanitize_text_field( $in['title'] ) : '';

		$rows = array();
		foreach ( (array) ( isset( $in['entries'] ) ? $in['entries'] : array() ) as $r ) {
			$t = isset( $r['title'] ) ? sanitize_text_field( $r['title'] ) : '';
			$u = isset( $r['url'] ) ? esc_url_raw( trim( (string) $r['url'] ) ) : '';
			if ( ! $t || ! $u ) {
				continue;
			}
			$col = isset( $r['color'] ) ? sanitize_hex_color( $r['color'] ) : '';
			$rows[] = array(
				'title' => $t,
				'sub'   => isset( $r['sub'] ) ? sanitize_text_field( $r['sub'] ) : '',
				'url'   => $u,
				'color' => $col ? $col : '#6e62f5',
				'art'   => ( isset( $r['art'] ) && 'liga' === $r['art'] ) ? 'liga' : 'kubo',
			);
		}
		$out['entries'] = array_slice( $rows, 0, self::SLOTS );
		return $out;
	}

	public static function page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$o    = self::opts();
		$rows = self::entries();
		while ( count( $rows ) < min( self::SLOTS, count( $rows ) + 2 ) ) {
			$rows[] = array( 'title' => '', 'sub' => '', 'url' => '', 'color' => '#6e62f5', 'art' => 'kubo' );
		}
		?>
		<div class="wrap">
			<h1>Lanzadera de juegos</h1>
			<p>La portada del sitio (<code><?php echo esc_html( home_url( '/' ) ); ?></code>) es el menú para elegir juego.
				Al desactivar el plugin, la portada vuelve a ser la que era.</p>
			<p><a class="button button-primary" href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank" rel="noopener">Ver la portada</a></p>
			<form method="post" action="options.php">
				<?php settings_fields( 'kplauncher_group' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="kp-title">Título del menú</label></th>
						<td><input id="kp-title" type="text" class="regular-text" name="<?php echo esc_attr( self::OPTION ); ?>[title]"
								value="<?php echo esc_attr( $o['title'] ); ?>" placeholder="<?php echo esc_attr( self::brand() ); ?>"></td>
					</tr>
				</table>
				<h2>Juegos del menú</h2>
				<p class="description">Déjalo en blanco para quitar una ficha. Como mucho <?php echo (int) self::SLOTS; ?>.</p>
				<table class="widefat striped" style="max-width:1100px">
					<thead><tr><th>Nombre</th><th>Debajo</th><th>Dirección</th><th>Color</th><th>Dibujo</th></tr></thead>
					<tbody>
					<?php foreach ( $rows as $i => $r ) : $n = esc_attr( self::OPTION ) . '[entries][' . (int) $i . ']'; ?>
						<tr>
							<td><input type="text" name="<?php echo $n; // phpcs:ignore ?>[title]" value="<?php echo esc_attr( $r['title'] ); ?>"></td>
							<td><input type="text" name="<?php echo $n; // phpcs:ignore ?>[sub]" value="<?php echo esc_attr( $r['sub'] ); ?>" size="40"></td>
							<td><input type="url" name="<?php echo $n; // phpcs:ignore ?>[url]" value="<?php echo esc_attr( $r['url'] ); ?>" size="30"></td>
							<td><input type="color" name="<?php echo $n; // phpcs:ignore ?>[color]" value="<?php echo esc_attr( $r['color'] ); ?>"></td>
							<td><select name="<?php echo $n; // phpcs:ignore ?>[art]">
								<option value="kubo" <?php selected( $r['art'], 'kubo' ); ?>>Cubo</option>
								<option value="liga" <?php selected( $r['art'], 'liga' ); ?>>Campo de fútbol</option>
							</select></td>
						</tr>
					<?php endforeach; ?>
					</tbody>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}
}

register_activation_hook( __FILE__, array( 'Kuboplay_Launcher', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Kuboplay_Launcher', 'deactivate' ) );
Kuboplay_Launcher::init();
