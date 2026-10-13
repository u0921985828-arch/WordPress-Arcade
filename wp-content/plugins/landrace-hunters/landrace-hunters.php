<?php
/**
 * Plugin Name: Landrace Hunters
 * Description: Hospeda el juego «Landrace Hunters» (Godot 4.3, versión web) dentro de WordPress: dirección propia a pantalla completa y atajo [landrace_hunters] para incrustarlo en cualquier página. Todo se sirve desde el propio plugin.
 * Version: 1.0.0
 * Author: WOLFCADE
 * License: GPL-2.0-or-later
 * Text Domain: landrace-hunters
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Landrace_Hunters {

	const VERSION   = '1.0.0';
	const OPTION    = 'landrace_hunters';
	const QUERY_VAR = 'landrace_hunters';

	/** Valores por defecto de los ajustes. */
	private static function defaults() {
		return array(
			'slug'  => 'landrace-hunters',
			'title' => 'Landrace Hunters',
		);
	}

	public static function opt( $key ) {
		$o = wp_parse_args( (array) get_option( self::OPTION, array() ), self::defaults() );
		return isset( $o[ $key ] ) ? $o[ $key ] : '';
	}

	/** Carpeta y URL del juego (todo sale de __FILE__, así que el nombre de la carpeta da igual). */
	public static function game_dir() {
		return __DIR__ . '/game';
	}

	public static function game_url() {
		return plugins_url( 'game', __FILE__ );
	}

	public static function game_file() {
		return self::game_dir() . '/index.html';
	}

	/** Dirección pública del juego: bonita si hay enlaces permanentes, con parámetro si no. */
	public static function play_url( $args = array() ) {
		$slug = self::opt( 'slug' );
		if ( get_option( 'permalink_structure' ) && $slug ) {
			$url = home_url( '/' . $slug . '/' );
		} else {
			$url = add_query_arg( self::QUERY_VAR, 1, home_url( '/' ) );
		}
		return $args ? add_query_arg( $args, $url ) : $url;
	}

	public static function init() {
		add_action( 'init', array( __CLASS__, 'rewrite' ) );
		add_filter( 'query_vars', array( __CLASS__, 'query_vars' ) );
		add_action( 'template_redirect', array( __CLASS__, 'maybe_serve' ) );
		add_shortcode( 'landrace_hunters', array( __CLASS__, 'shortcode' ) );
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'settings' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), array( __CLASS__, 'action_links' ) );
	}

	public static function rewrite() {
		$slug = self::opt( 'slug' );
		if ( $slug ) {
			add_rewrite_rule( '^' . preg_quote( $slug, '/' ) . '/?$', 'index.php?' . self::QUERY_VAR . '=1', 'top' );
		}
	}

	public static function query_vars( $vars ) {
		$vars[] = self::QUERY_VAR;
		return $vars;
	}

	/** Al activar y al cambiar el slug hay que reescribir las reglas; si no, la dirección da 404. */
	public static function activate() {
		self::rewrite();
		flush_rewrite_rules();
	}

	public static function deactivate() {
		flush_rewrite_rules();
	}

	/**
	 * Sirve el juego en su dirección propia.
	 *
	 * Es la exportación web de Godot tal cual: un HTML que carga index.js, index.wasm e
	 * index.pck por ruta relativa. Se le añade un <base> apuntando a la carpeta del plugin
	 * para que esas rutas sigan valiendo aunque la página viva en /landrace-hunters/.
	 */
	public static function maybe_serve() {
		if ( ! get_query_var( self::QUERY_VAR ) ) {
			return;
		}

		$file = self::game_file();
		if ( ! is_readable( $file ) ) {
			status_header( 500 );
			wp_die( esc_html__( 'No encuentro el juego dentro del plugin.', 'landrace-hunters' ) );
		}

		$html = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		$base = '<base href="' . esc_url( trailingslashit( self::game_url() ) ) . '">';
		$html = preg_replace( '#(<meta\s+charset="utf-8">)#i', '$1' . "\n\t\t" . $base, $html, 1 );
		$html = preg_replace( '#<title>[^<]*</title>#i', '<title>' . esc_html( self::opt( 'title' ) ) . '</title>', $html, 1 );

		$etag = '"' . md5( $html . self::VERSION ) . '"';

		nocache_headers();
		header_remove( 'Expires' );
		header_remove( 'Pragma' );
		header( 'Content-Type: text/html; charset=utf-8' );
		header( 'Cache-Control: public, max-age=600' );
		header( 'ETag: ' . $etag );
		header( 'X-Frame-Options: SAMEORIGIN' );

		$sent = isset( $_SERVER['HTTP_IF_NONE_MATCH'] ) ? trim( wp_unslash( $_SERVER['HTTP_IF_NONE_MATCH'] ) ) : '';
		if ( $sent && false !== strpos( $sent, trim( $etag, '"' ) ) ) {
			status_header( 304 );
			exit;
		}

		status_header( 200 );
		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput
		exit;
	}

	/**
	 * [landrace_hunters alto="80vh" texto="Abrir a pantalla completa"]
	 *
	 * Incrusta el juego en una página. El enlace de debajo lo abre en su dirección propia,
	 * que es como se juega bien en el móvil.
	 */
	public static function shortcode( $atts ) {
		$a = shortcode_atts(
			array(
				'alto'  => '80vh',
				'texto' => 'Abrir a pantalla completa',
			),
			$atts,
			'landrace_hunters'
		);

		$alto = preg_match( '/^[0-9.]+(px|vh|vw|%|em|rem)$/', $a['alto'] ) ? $a['alto'] : '80vh';

		$out  = '<div class="lh-embed" style="margin:1.2em 0">';
		$out .= '<iframe src="' . esc_url( self::play_url() ) . '"'
			. ' title="' . esc_attr( self::opt( 'title' ) ) . '"'
			. ' style="display:block;width:100%;height:' . esc_attr( $alto ) . ';border:0;border-radius:10px;background:#000"'
			. ' allow="fullscreen; gamepad; autoplay" allowfullscreen loading="lazy"></iframe>';
		if ( $a['texto'] ) {
			$out .= '<p style="margin:.6em 0 0;text-align:center"><a href="' . esc_url( self::play_url() ) . '" target="_blank" rel="noopener">'
				. esc_html( $a['texto'] ) . '</a></p>';
		}
		$out .= '</div>';

		return $out;
	}

	/* ---------- Panel ---------- */

	public static function action_links( $links ) {
		array_unshift(
			$links,
			'<a href="' . esc_url( admin_url( 'options-general.php?page=landrace-hunters' ) ) . '">' . esc_html__( 'Ajustes', 'landrace-hunters' ) . '</a>',
			'<a href="' . esc_url( self::play_url() ) . '" target="_blank" rel="noopener">' . esc_html__( 'Jugar', 'landrace-hunters' ) . '</a>'
		);
		return $links;
	}

	public static function menu() {
		add_options_page( 'Landrace Hunters', 'Landrace Hunters', 'manage_options', 'landrace-hunters', array( __CLASS__, 'page' ) );
	}

	public static function settings() {
		register_setting(
			'landrace_hunters_group',
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize' ),
				'default'           => self::defaults(),
			)
		);
	}

	public static function sanitize( $in ) {
		$old  = wp_parse_args( (array) get_option( self::OPTION, array() ), self::defaults() );
		$slug = isset( $in['slug'] ) ? sanitize_title( $in['slug'] ) : '';
		$out  = array(
			'slug'  => $slug ? $slug : self::defaults()['slug'],
			'title' => isset( $in['title'] ) ? sanitize_text_field( $in['title'] ) : $old['title'],
		);
		if ( $out['slug'] !== $old['slug'] ) {
			// El slug nuevo necesita reglas nuevas; si no, la dirección da 404.
			add_action(
				'shutdown',
				function () {
					flush_rewrite_rules();
				}
			);
		}
		return $out;
	}

	public static function page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$url  = self::play_url();
		$size = 0;
		foreach ( array( 'index.wasm', 'index.pck', 'index.js' ) as $f ) {
			$p     = self::game_dir() . '/' . $f;
			$size += is_readable( $p ) ? filesize( $p ) : 0;
		}
		?>
		<div class="wrap">
			<h1>Landrace Hunters</h1>
			<p>El juego está dentro del plugin (<?php echo esc_html( size_format( $size ) ); ?>; el navegador lo descarga comprimido la primera vez y luego lo guarda). Se juega aquí:</p>
			<p><a class="button button-primary" href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener">Jugar ahora</a>
				&nbsp;<code><?php echo esc_html( $url ); ?></code></p>
			<p>Para ponerlo dentro de una página o entrada, pega este atajo:</p>
			<p><code>[landrace_hunters]</code> &nbsp;— o con la altura que quieras: <code>[landrace_hunters alto="600px"]</code></p>
			<?php if ( ! get_option( 'permalink_structure' ) ) : ?>
				<div class="notice notice-warning inline"><p>Tienes los enlaces permanentes en «Simple», así que la dirección del juego lleva un parámetro. En <strong>Ajustes → Enlaces permanentes</strong>, elige «Nombre de la entrada» para que quede bonita.</p></div>
			<?php endif; ?>
			<form method="post" action="options.php">
				<?php settings_fields( 'landrace_hunters_group' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="lh-slug">Dirección</label></th>
						<td><?php echo esc_html( trailingslashit( home_url() ) ); ?><input id="lh-slug" type="text" class="regular-text"
								name="<?php echo esc_attr( self::OPTION ); ?>[slug]"
								value="<?php echo esc_attr( self::opt( 'slug' ) ); ?>">/
							<p class="description">Al cambiarla se reescriben las reglas solas.</p></td>
					</tr>
					<tr>
						<th scope="row"><label for="lh-title">Título</label></th>
						<td><input id="lh-title" type="text" class="regular-text"
								name="<?php echo esc_attr( self::OPTION ); ?>[title]"
								value="<?php echo esc_attr( self::opt( 'title' ) ); ?>"></td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}
}

register_activation_hook( __FILE__, array( 'Landrace_Hunters', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Landrace_Hunters', 'deactivate' ) );
Landrace_Hunters::init();
