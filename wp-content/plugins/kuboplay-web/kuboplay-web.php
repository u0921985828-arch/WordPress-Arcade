<?php
/**
 * Plugin Name: Kuboplay Web
 * Description: Portada de Landrace Hunters con huecos de anuncios (Mantis, afiliados de bancos de semillas o cualquier red que acepte contenido +18 de cannabis), aviso de cookies que solo carga los anuncios con permiso, /ads.txt, páginas legales y la privacidad de las apps (/privacidad-app/).
 * Version: 1.0.0
 * Author: Kuboplay
 * License: GPL-2.0-or-later
 * Text Domain: kuboplay-web
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Kuboplay_Web {

	const VERSION = '1.0.0';
	const OPTION  = 'kpweb';

	/* ----------------------------------------------------------- Ajustes */

	/**
	 * Los datos del titular salen por defecto de los del plugin Arcade (opción arcade_site),
	 * que sigue en la base de datos aunque el plugin se haya borrado: no hay que volver a escribirlos.
	 */
	public static function opts() {
		$old = (array) get_option( 'arcade_site', array() );
		return wp_parse_args(
			(array) get_option( self::OPTION, array() ),
			array(
				'portada' => 1,
				'owner'   => isset( $old['owner'] ) ? $old['owner'] : '',
				'nif'     => isset( $old['nif'] ) ? $old['nif'] : '',
				'address' => isset( $old['address'] ) ? $old['address'] : '',
				'email'   => ! empty( $old['email'] ) ? $old['email'] : get_option( 'admin_email' ),
				'ad_top'  => '',
				'ad_bot'  => '',
				'ads_txt' => '',
				'texto'   => '',
			)
		);
	}

	public static function opt( $k ) {
		$o = self::opts();
		return isset( $o[ $k ] ) ? $o[ $k ] : '';
	}

	public static function init() {
		add_action( 'init', array( __CLASS__, 'early' ), 1 );
		add_action( 'init', array( __CLASS__, 'maybe_upgrade' ), 20 );
		// Antes que la Lanzadera (prioridad 1), que con un solo juego abriría el juego directamente.
		add_action( 'template_redirect', array( __CLASS__, 'portada' ), 0 );
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'settings' ) );
		add_action( 'admin_post_kpweb_legal', array( __CLASS__, 'make_pages' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), array( __CLASS__, 'action_links' ) );
	}

	/** Al borrar el plugin no deja nada (las páginas legales sí se quedan: son contenido). */
	public static function uninstall() {
		delete_option( self::OPTION );
		delete_option( self::OPTION . '_ver' );
	}

	public static function maybe_upgrade() {
		if ( get_option( self::OPTION . '_ver' ) === self::VERSION ) {
			return;
		}
		update_option( self::OPTION . '_ver', self::VERSION, false );
		do_action( 'kp_shield_purge' );
	}

	/* ---------------------------------------- /ads.txt y /privacidad-app/ */

	private static function path() {
		$p = wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_PATH ); // phpcs:ignore
		return untrailingslashit( (string) $p );
	}

	/** Si el plugin Arcade sigue activo ya sirve las dos direcciones: no se pisan. */
	public static function early() {
		if ( class_exists( 'Arcade_SEO' ) ) {
			return;
		}
		$path = self::path();
		if ( '/ads.txt' === $path ) {
			self::ads_txt();
		} elseif ( '/privacidad-app' === $path ) {
			self::app_privacy();
		}
	}

	private static function ads_txt() {
		$txt = trim( (string) self::opt( 'ads_txt' ) );
		if ( '' === $txt ) {
			return; // Sin líneas, que conteste WordPress (404).
		}
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}
		status_header( 200 );
		header( 'Content-Type: text/plain; charset=utf-8' );
		header( 'Cache-Control: public, max-age=3600' );
		echo $txt . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput -- texto plano del administrador
		exit;
	}

	/**
	 * Política de privacidad de Dub Siege para Google Play. Venía del plugin Arcade
	 * (1.51.1); se traslada tal cual para que la dirección no se rompa al borrarlo.
	 */
	private static function app_privacy() {
		$owner = self::opt( 'owner' ) ? self::opt( 'owner' ) : 'WOLFCADE';
		$mail  = self::opt( 'email' ) ? self::opt( 'email' ) : get_option( 'admin_email' );
		$p     = static function ( $t ) { return '<p>' . esc_html( $t ) . '</p>'; };
		$h     = static function ( $t ) { return '<h2>' . esc_html( $t ) . '</h2>'; };
		status_header( 200 );
		header( 'Content-Type: text/html; charset=utf-8' );
		header( 'X-Robots-Tag: index, follow' );
		echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Política de privacidad · Dub Siege</title>'
			. '<style>body{margin:0;background:#0d0f1c;color:#e9ecff;font:16px/1.6 system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:28px 18px 60px}h1{font-size:1.6em;margin:0 0 4px}h2{font-size:1.1em;margin:28px 0 6px;color:#a097ff}a{color:#a097ff}small{color:#8f98c8}</style></head><body><main>'
			. '<h1>Política de privacidad de Dub Siege</h1><small>Última actualización: 7 de octubre de 2026</small>'
			. $p( "Dub Siege es un juego para Android publicado por $owner. Esta política explica qué datos trata la app. En resumen: ninguno sale de tu móvil." )
			. $h( 'Datos que recogemos' )
			. $p( 'Ninguno. La app no tiene cuentas, no pide tu nombre, correo, ubicación, contactos, fotos ni ningún otro dato personal, y no usa identificadores de publicidad.' )
			. $h( 'Datos que se guardan en tu móvil' )
			. $p( 'La partida (progreso, monedas del juego, ajustes y la tabla de récords con las iniciales que escribas) se guarda solo en la memoria interna del propio móvil. No se envía a ningún servidor ni se comparte con nadie. Se borra al desinstalar la app o al borrar sus datos en los ajustes de Android.' )
			. $h( 'Conexión a internet, publicidad y compras' )
			. $p( 'La app no se conecta a internet, no muestra publicidad, no incluye compras dentro de la aplicación y no contiene herramientas de analítica ni de seguimiento de terceros.' )
			. $h( 'Permisos' )
			. $p( 'Solo usa el permiso de vibración, para que el mando vibre al recibir un golpe. Puedes desactivarla en las opciones del juego.' )
			. $h( 'Menores' )
			. $p( 'La app no recoge datos de nadie, tampoco de menores de edad.' )
			. $h( 'Cambios y contacto' )
			. $p( 'Si la app cambia y empieza a tratar algún dato, esta página se actualizará antes de publicar esa versión.' )
			. '<p>Para cualquier duda: <a href="mailto:' . esc_attr( antispambot( $mail ) ) . '">' . esc_html( antispambot( $mail ) ) . '</a>.</p>'
			. '</main></body></html>';
		exit;
	}

	/* ------------------------------------------------------------ Portada */

	/** Páginas legales publicadas, para el pie. */
	public static function legal_links() {
		$out = array();
		foreach ( array( 'aviso-legal', 'politica-de-privacidad', 'politica-de-cookies' ) as $slug ) {
			$pg = get_page_by_path( $slug );
			if ( $pg && 'publish' === $pg->post_status ) {
				$out[] = array( get_the_title( $pg ), get_permalink( $pg ) );
			}
		}
		return $out;
	}

	/**
	 * La portada del sitio: el juego con su botón de jugar, el aviso +18 y los huecos de anuncios.
	 * El juego en sí va a pantalla completa en su dirección (/landrace-hunters/): ahí no cabe
	 * un anuncio sin tapar la partida, así que los anuncios viven aquí.
	 */
	public static function portada() {
		if ( ! self::opt( 'portada' ) || ! class_exists( 'Landrace_Hunters' ) || is_admin() || is_paged() || is_feed() ) {
			return;
		}
		if ( ! is_front_page() || isset( $_GET['s'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		status_header( 200 );
		header( 'Content-Type: text/html; charset=utf-8' );
		include __DIR__ . '/portada.php';
		exit;
	}

	/* --------------------------------------------------------- Páginas legales */

	/**
	 * Crea (en borrador) o rehace el texto del aviso legal, la privacidad y las cookies,
	 * ya pensados para esta web: un juego +18 con anuncios de terceros que solo se cargan con permiso.
	 * Una página ya publicada sigue publicada; solo se cambia su texto.
	 */
	public static function make_pages() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Sin permiso.' );
		}
		check_admin_referer( 'kpweb_legal' );
		$o     = self::opts();
		$site  = get_bloginfo( 'name' );
		$url   = home_url( '/' );
		$owner = $o['owner'] ? $o['owner'] : '[NOMBRE O RAZÓN SOCIAL]';
		$nif   = $o['nif'] ? $o['nif'] : '[NIF]';
		$addr  = $o['address'] ? $o['address'] : '[DOMICILIO]';
		$mail  = $o['email'] ? $o['email'] : '[CORREO]';
		$p     = static function ( $t ) { return "<!-- wp:paragraph -->\n<p>$t</p>\n<!-- /wp:paragraph -->\n"; };
		$h     = static function ( $t ) { return "<!-- wp:heading -->\n<h2 class=\"wp-block-heading\">$t</h2>\n<!-- /wp:heading -->\n"; };
		$pages = array(
			'aviso-legal'            => array(
				'Aviso legal',
				$p( "En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los datos del titular de $url:" )
				. $p( "Titular: $owner<br>NIF/CIF: $nif<br>Domicilio: $addr<br>Correo electrónico: $mail" )
				. $h( 'Objeto' ) . $p( "$site ofrece el videojuego Landrace Hunters, gratuito y jugable en el navegador. Es una obra de ficción para mayores de 18 años: no vende, ofrece ni facilita ninguna sustancia." )
				. $h( 'Publicidad' ) . $p( 'El sitio muestra anuncios de terceros. El titular no se responsabiliza de los productos anunciados ni de los sitios a los que enlazan; consulta la legislación de tu país antes de comprar nada.' )
				. $h( 'Propiedad intelectual' ) . $p( 'El juego, su código, gráficos y textos son propiedad de sus autores. Queda prohibida su reproducción o distribución sin autorización.' )
				. $h( 'Legislación aplicable' ) . $p( 'Este aviso se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del usuario cuando sea consumidor.' ),
			),
			'politica-de-privacidad' => array(
				'Política de privacidad',
				$p( "Responsable del tratamiento: $owner, NIF $nif, $addr. Contacto: $mail." )
				. $h( 'Qué datos tratamos' ) . $p( 'No pedimos registro. La partida se guarda solo en tu dispositivo (almacenamiento del navegador) y no se envía a ningún servidor. Si nos escribes, tratamos tu correo y tu mensaje para responderte.' )
				. $h( 'Publicidad' ) . $p( 'Con tu consentimiento, la portada carga anuncios de redes de terceros, que pueden usar cookies e identificadores para mostrarlos y medirlos. Sin consentimiento no se carga ninguno. Puedes cambiar tu elección en «Preferencias de cookies», al pie de la portada.' )
				. $h( 'Base legal y conservación' ) . $p( 'Consentimiento (cookies publicitarias) e interés legítimo (seguridad del sitio). Los mensajes se conservan el tiempo necesario para atender tu consulta.' )
				. $h( 'Tus derechos' ) . $p( "Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a $mail. También puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es)." ),
			),
			'politica-de-cookies'    => array(
				'Política de cookies',
				$p( 'Usamos almacenamiento técnico, necesario para el juego (partida, ajustes y tu elección de cookies), y cookies publicitarias de terceros solo si las aceptas.' )
				. $h( 'Tipos' ) . $p( '<strong>Técnicas</strong>: la partida y las preferencias guardadas en tu navegador. <strong>Publicitarias de terceros</strong>: las de las redes de anuncios de la portada, para mostrar y medir los anuncios.' )
				. $h( 'Cómo gestionarlas' ) . $p( 'Puedes cambiar tu elección en cualquier momento con el enlace «Preferencias de cookies» del pie de la portada, o borrarlas desde la configuración de tu navegador.' ),
			),
		);
		foreach ( $pages as $slug => $pg ) {
			$data = array( 'post_type' => 'page', 'post_title' => $pg[0], 'post_name' => $slug, 'post_content' => $pg[1] );
			$old  = get_page_by_path( $slug );
			if ( $old ) {
				$data['ID'] = $old->ID;
				wp_update_post( $data );
				$id = $old->ID;
			} else {
				$data['post_status'] = 'draft';
				$id                  = wp_insert_post( $data );
			}
			if ( 'politica-de-privacidad' === $slug && $id ) {
				update_option( 'wp_page_for_privacy_policy', (int) $id );
			}
		}
		do_action( 'kp_shield_purge' );
		wp_safe_redirect( admin_url( 'options-general.php?page=kuboplay-web&legal=1' ) );
		exit;
	}

	/* --------------------------------------------------------------- Panel */

	public static function action_links( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=kuboplay-web' ) ) . '">Ajustes</a>' );
		return $links;
	}

	public static function menu() {
		add_options_page( 'Web y anuncios', 'Web y anuncios', 'manage_options', 'kuboplay-web', array( __CLASS__, 'page' ) );
	}

	public static function settings() {
		register_setting( 'kpweb_group', self::OPTION, array( 'type' => 'array', 'sanitize_callback' => array( __CLASS__, 'sanitize' ) ) );
	}

	public static function sanitize( $in ) {
		$o   = self::opts();
		$raw = static function ( $k ) use ( $in, $o ) {
			if ( ! isset( $in[ $k ] ) ) {
				return '';
			}
			$v = trim( (string) wp_unslash( $in[ $k ] ) );
			// El código de un anuncio es HTML con <script>: solo quien puede publicar HTML sin filtrar.
			return current_user_can( 'unfiltered_html' ) ? $v : $o[ $k ];
		};
		$out = array(
			'portada' => empty( $in['portada'] ) ? 0 : 1,
			'owner'   => isset( $in['owner'] ) ? sanitize_text_field( wp_unslash( $in['owner'] ) ) : '',
			'nif'     => isset( $in['nif'] ) ? sanitize_text_field( wp_unslash( $in['nif'] ) ) : '',
			'address' => isset( $in['address'] ) ? sanitize_text_field( wp_unslash( $in['address'] ) ) : '',
			'email'   => isset( $in['email'] ) ? sanitize_email( wp_unslash( $in['email'] ) ) : '',
			'ad_top'  => $raw( 'ad_top' ),
			'ad_bot'  => $raw( 'ad_bot' ),
			'ads_txt' => isset( $in['ads_txt'] ) ? implode( "\n", array_filter( array_map( 'sanitize_text_field', preg_split( '/\R/', (string) wp_unslash( $in['ads_txt'] ) ) ) ) ) : '',
			'texto'   => isset( $in['texto'] ) ? sanitize_textarea_field( wp_unslash( $in['texto'] ) ) : '',
		);
		add_action(
			'shutdown',
			function () {
				do_action( 'kp_shield_purge' ); // La portada cambia: fuera la copia guardada.
			}
		);
		return $out;
	}

	public static function page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$o = self::opts();
		$n = esc_attr( self::OPTION );
		$f = static function ( $k, $label, $desc = '' ) use ( $o, $n ) {
			echo '<tr><th scope="row"><label for="kpw-' . esc_attr( $k ) . '">' . esc_html( $label ) . '</label></th><td>'
				. '<input id="kpw-' . esc_attr( $k ) . '" class="regular-text" type="text" name="' . $n . '[' . esc_attr( $k ) . ']" value="' . esc_attr( $o[ $k ] ) . '">'
				. ( $desc ? '<p class="description">' . esc_html( $desc ) . '</p>' : '' ) . '</td></tr>';
		};
		$a = static function ( $k, $label, $desc, $rows = 6 ) use ( $o, $n ) {
			echo '<tr><th scope="row"><label for="kpw-' . esc_attr( $k ) . '">' . esc_html( $label ) . '</label></th><td>'
				. '<textarea id="kpw-' . esc_attr( $k ) . '" class="large-text code" rows="' . (int) $rows . '" name="' . $n . '[' . esc_attr( $k ) . ']">' . esc_textarea( $o[ $k ] ) . '</textarea>'
				. '<p class="description">' . wp_kses( $desc, array( 'code' => array(), 'strong' => array() ) ) . '</p></td></tr>';
		};
		?>
		<div class="wrap">
			<h1>Web y anuncios</h1>
			<?php if ( ! empty( $_GET['legal'] ) ) : // phpcs:ignore ?>
				<div class="notice notice-success"><p>Páginas legales hechas. Las nuevas están en borrador: revísalas en Páginas y publícalas.</p></div>
			<?php endif; ?>
			<?php if ( ! class_exists( 'Landrace_Hunters' ) ) : ?>
				<div class="notice notice-warning"><p>Falta el plugin <strong>Landrace Hunters</strong> activo: sin él la portada no se muestra.</p></div>
			<?php endif; ?>
			<p><a class="button button-primary" href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank" rel="noopener">Ver la portada</a></p>
			<form method="post" action="options.php">
				<?php settings_fields( 'kpweb_group' ); ?>
				<h2>Portada</h2>
				<table class="form-table" role="presentation">
					<tr><th scope="row">Portada con anuncios</th>
						<td><label><input type="checkbox" name="<?php echo $n; // phpcs:ignore ?>[portada]" value="1" <?php checked( (int) $o['portada'], 1 ); ?>>
							La portada del sitio enseña el juego con el botón «Jugar», el aviso +18 y los anuncios</label></td></tr>
					<?php $a( 'texto', 'Texto de la portada', 'Opcional. Párrafo bajo el título. Vacío: un texto por defecto. Las redes de anuncios valoran que la página tenga texto propio.', 4 ); ?>
				</table>
				<h2>Anuncios</h2>
				<p>Pega el código que te da la red (Mantis, el programa de afiliados de un banco de semillas…). Solo se carga si el visitante acepta las cookies.</p>
				<table class="form-table" role="presentation">
					<?php
					$a( 'ad_top', 'Anuncio de arriba', 'Bajo el botón «Jugar». Por ejemplo un banner de 300×250 o 728×90.' );
					$a( 'ad_bot', 'Anuncio de abajo', 'Al final de la portada, antes del pie.' );
					$a( 'ads_txt', 'ads.txt', 'Una línea por red, tal como te la dé (por ejemplo <code>mantisadnetwork.com, 1234, DIRECT</code>). Se sirve en <code>/ads.txt</code>. Vacío: no hay ads.txt.', 4 );
					?>
				</table>
				<h2>Titular (aviso legal)</h2>
				<table class="form-table" role="presentation">
					<?php
					$f( 'owner', 'Nombre o razón social' );
					$f( 'nif', 'NIF/CIF' );
					$f( 'address', 'Domicilio' );
					$f( 'email', 'Correo de contacto' );
					?>
				</table>
				<?php submit_button(); ?>
			</form>
			<h2>Páginas legales</h2>
			<p>Crea o rehace el aviso legal, la política de privacidad y la de cookies con los datos del titular. Las nuevas quedan en borrador.</p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="kpweb_legal">
				<?php wp_nonce_field( 'kpweb_legal' ); ?>
				<?php submit_button( 'Crear o rehacer páginas legales', 'secondary', 'submit', false ); ?>
			</form>
			<p>Privacidad de Dub Siege para Google Play: <a href="<?php echo esc_url( home_url( '/privacidad-app/' ) ); ?>" target="_blank" rel="noopener"><code><?php echo esc_html( home_url( '/privacidad-app/' ) ); ?></code></a></p>
		</div>
		<?php
	}
}

register_activation_hook(
	__FILE__,
	static function () {
		do_action( 'kp_shield_purge' );
	}
);
register_uninstall_hook( __FILE__, array( 'Kuboplay_Web', 'uninstall' ) );
Kuboplay_Web::init();
