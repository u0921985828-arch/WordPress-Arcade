<?php
/**
 * SEO, páginas legales y AdSense para el portal.
 *  - Ajustes → Arcade: ID de editor AdSense, datos del titular, correo de contacto.
 *  - Crea borradores de Aviso legal, Privacidad, Cookies, Contacto y Sobre nosotros.
 *  - Sirve /ads.txt, inserta el código de AdSense (anuncios automáticos) y un bloque
 *    de anuncio SEPARADO del juego (nunca junto a los controles).
 *  - Meta description, Open Graph y datos estructurados schema.org (VideoGame).
 */
defined( 'ABSPATH' ) || exit;

final class Arcade_SEO {

	const OPT = 'arcade_site';

	public static function boot() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_post_arcade_site', array( __CLASS__, 'save' ) );
		add_action( 'init', array( __CLASS__, 'ads_txt' ), 1 );
		add_action( 'wp_head', array( __CLASS__, 'head' ), 2 );
	}

	public static function opt( $k = null ) {
		$o = wp_parse_args( (array) get_option( self::OPT, array() ), array( 'pub' => '', 'owner' => '', 'nif' => '', 'address' => '', 'email' => get_option( 'admin_email' ), 'slot' => '', 'slot_side' => '', 'h5' => '', 'adtest' => '', 'freq' => '120' ) );
		return $k ? $o[ $k ] : $o;
	}

	public static function menu() {
		add_options_page( 'Arcade: AdSense y legal', 'Arcade', 'manage_options', 'arcade-site', array( __CLASS__, 'screen' ) );
	}

	public static function screen() {
		$o = self::opt(); $msg = isset( $_GET['ok'] ) ? sanitize_text_field( wp_unslash( $_GET['ok'] ) ) : ''; // phpcs:ignore
		$f = static function ( $k, $label, $ph, $desc = '' ) use ( $o ) {
			printf( '<tr><th><label for="%1$s">%2$s</label></th><td><input class="regular-text" id="%1$s" name="%1$s" value="%3$s" placeholder="%4$s">%5$s</td></tr>', esc_attr( $k ), esc_html( $label ), esc_attr( $o[ $k ] ), esc_attr( $ph ), $desc ? '<p class="description">' . esc_html( $desc ) . '</p>' : '' );
		};
		?>
		<div class="wrap"><h1>Arcade: AdSense y páginas legales</h1>
		<?php if ( $msg ) : ?><div class="notice notice-success"><p><?php echo esc_html( $msg ); ?></p></div><?php endif; ?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>"><?php wp_nonce_field( 'arcade_site' ); ?><input type="hidden" name="action" value="arcade_site">
		<h2>Titular del sitio (obligatorio en España, LSSI art. 10)</h2><table class="form-table">
		<?php $f( 'owner', 'Nombre o razón social', 'Nombre Apellidos / Empresa S.L.' ); $f( 'nif', 'NIF / CIF', '12345678Z' ); $f( 'address', 'Domicilio', 'Calle, nº, CP, Bilbao, Bizkaia' ); $f( 'email', 'Correo de contacto', 'contacto@tudominio.com' ); ?>
		</table>
		<h2>Google AdSense</h2><table class="form-table">
		<?php $f( 'pub', 'ID de editor', 'pub-1234567890123456', 'Lo encuentras en AdSense → Cuenta → Información de la cuenta. Activa /ads.txt y el código de anuncios.' ); $f( 'slot', 'Bloque adaptable (display)', '1234567890', 'Anuncios → Por bloque de anuncios → Display → Adaptable. Se muestra bajo el juego, entre secciones y en los listados; nunca junto a los controles.' ); $f( 'slot_side', 'Bloque vertical (opcional)', '1234567890', 'Columna lateral de la ficha en ordenador. Si lo dejas vacío se usa el adaptable.' ); ?>
		<tr><th>Anuncios dentro de los juegos</th><td><label><input type="checkbox" name="h5" value="1"<?php checked( $o['h5'], '1' ); ?>> Activar H5 Games Ads (anuncio al empezar y al reiniciar partida)</label><p class="description">Solicítalo antes en AdSense (programa «AdSense para juegos»). Se muestra como mucho uno cada:</p>
		<select name="freq"><?php foreach ( array( '60' => '1 minuto', '120' => '2 minutos', '180' => '3 minutos', '300' => '5 minutos' ) as $v => $t ) { printf( '<option value="%s"%s>%s</option>', esc_attr( $v ), selected( $o['freq'], $v, false ), esc_html( $t ) ); } ?></select></td></tr>
		<tr><th>Modo de prueba</th><td><label><input type="checkbox" name="adtest" value="1"<?php checked( $o['adtest'], '1' ); ?>> Anuncios de prueba (no cuentan impresiones). Desactívalo al publicar.</label><p class="description">Para ver dónde irán los anuncios sin tener AdSense aprobado, abre cualquier página con <code>?adpreview=1</code> estando identificado como administrador.</p></td></tr>
		</table>
		<p><label><input type="checkbox" name="make_pages" value="1"> Crear/actualizar los borradores de páginas legales (Aviso legal, Privacidad, Cookies, Contacto, Sobre nosotros)</label></p>
		<?php submit_button( 'Guardar' ); ?></form>
		<h2>Estado</h2><ul style="list-style:disc;margin-left:20px">
		<?php foreach ( self::checks() as $c ) { printf( '<li>%s %s</li>', $c[0] ? '✅' : '❌', esc_html( $c[1] ) ); } ?>
		</ul></div>
		<?php
	}

	private static function checks() {
		$host = wp_parse_url( home_url(), PHP_URL_HOST );
		$pages = (array) get_option( 'arcade_legal_pages', array() );
		$pub = 0; foreach ( $pages as $id ) { if ( 'publish' === get_post_status( $id ) ) { $pub++; } }
		return array(
			array( ! preg_match( '/live-website\.com$|wordpress\.com$|blogspot\.|\.local$/', (string) $host ), 'Dominio propio (ahora: ' . $host . ')' ),
			array( ! in_array( strtolower( get_bloginfo( 'name' ) ), array( 'my blog', 'mi blog', '' ), true ), 'Título del sitio personalizado (Ajustes → Generales)' ),
			array( self::opt( 'owner' ) && self::opt( 'nif' ), 'Datos del titular rellenados' ),
			array( count( $pages ) >= 5 && $pub >= 5, 'Páginas legales publicadas (' . $pub . '/5)' ),
			array( (bool) get_privacy_policy_url(), 'Política de privacidad asignada (Ajustes → Privacidad)' ),
			array( (bool) self::opt( 'pub' ), 'ID de editor AdSense y /ads.txt' ),
			array( '0' !== (string) get_option( 'blog_public' ), 'Sitio visible para buscadores (Ajustes → Lectura)' ),
		);
	}

	public static function save() {
		if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'arcade_site' ) ) {
			wp_die( 'No autorizado' );
		}
		$o = self::opt();
		foreach ( array( 'owner', 'nif', 'address', 'email', 'slot', 'slot_side' ) as $k ) {
			$o[ $k ] = sanitize_text_field( wp_unslash( $_POST[ $k ] ?? '' ) );
		}
		$o['pub']   = preg_replace( '/[^0-9]/', '', (string) wp_unslash( $_POST['pub'] ?? '' ) ) ? 'pub-' . preg_replace( '/[^0-9]/', '', (string) wp_unslash( $_POST['pub'] ?? '' ) ) : '';
		$o['email'] = sanitize_email( $o['email'] );
		$o['slot']      = preg_replace( '/[^0-9]/', '', $o['slot'] );
		$o['slot_side'] = preg_replace( '/[^0-9]/', '', $o['slot_side'] );
		$o['h5']        = empty( $_POST['h5'] ) ? '' : '1';
		$o['adtest']    = empty( $_POST['adtest'] ) ? '' : '1';
		$o['freq']      = in_array( $_POST['freq'] ?? '', array( '60', '120', '180', '300' ), true ) ? $_POST['freq'] : '120'; // phpcs:ignore
		update_option( self::OPT, $o, false );
		$msg = 'Guardado.';
		if ( ! empty( $_POST['make_pages'] ) ) {
			self::make_pages();
			$msg .= ' Borradores creados en Páginas: revísalos y publícalos.';
		}
		wp_safe_redirect( add_query_arg( array( 'page' => 'arcade-site', 'ok' => rawurlencode( $msg ) ), admin_url( 'options-general.php' ) ) );
		exit;
	}

	/* ------------------------------------------------------------ Páginas legales */
	private static function make_pages() {
		$o = self::opt(); $site = get_bloginfo( 'name' ); $url = home_url( '/' );
		$owner = $o['owner'] ?: '[NOMBRE O RAZÓN SOCIAL]'; $nif = $o['nif'] ?: '[NIF]'; $addr = $o['address'] ?: '[DOMICILIO]'; $mail = $o['email'] ?: '[CORREO]';
		$p = static function ( $t ) { return "<!-- wp:paragraph -->\n<p>$t</p>\n<!-- /wp:paragraph -->\n"; };
		$h = static function ( $t ) { return "<!-- wp:heading -->\n<h2 class=\"wp-block-heading\">$t</h2>\n<!-- /wp:heading -->\n"; };
		$pages = array(
			'aviso-legal' => array( 'Aviso legal',
				$p( "En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los datos del titular de $url:" )
				. $p( "Titular: $owner<br>NIF/CIF: $nif<br>Domicilio: $addr<br>Correo electrónico: $mail" )
				. $h( 'Objeto' ) . $p( "$site es un portal de juegos HTML5 gratuitos que se juegan directamente en el navegador, sin descargas ni registro." )
				. $h( 'Propiedad intelectual' ) . $p( "Los juegos marcados como exclusivos, su código, gráficos y textos son propiedad del titular. Queda prohibida su reproducción o distribución sin autorización. Los juegos de terceros, si los hubiera, pertenecen a sus respectivos autores y se muestran con su licencia." )
				. $h( 'Responsabilidad' ) . $p( 'El titular no se hace responsable del mal uso del sitio ni de los contenidos de sitios de terceros enlazados. El acceso es gratuito y puede interrumpirse por mantenimiento.' )
				. $h( 'Legislación aplicable' ) . $p( 'Este aviso se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del usuario cuando sea consumidor.' ) ),
			'politica-de-privacidad' => array( 'Política de privacidad',
				$p( "Responsable del tratamiento: $owner, NIF $nif, $addr. Contacto: $mail." )
				. $h( 'Qué datos tratamos' ) . $p( 'No pedimos registro. Los récords de los juegos se guardan solo en tu dispositivo (almacenamiento local del navegador) y no se envían a ningún servidor. Si nos escribes, tratamos tu correo y tu mensaje para responderte.' )
				. $h( 'Publicidad' ) . $p( 'Este sitio utiliza Google AdSense. Google y sus socios pueden usar cookies e identificadores para mostrar anuncios, personalizados o no, según tu consentimiento. Más información: <a href="https://policies.google.com/technologies/partner-sites">Cómo usa Google la información de los sitios que usan sus servicios</a>. Puedes gestionar la personalización en <a href="https://adssettings.google.com">Configuración de anuncios de Google</a>.' )
				. $h( 'Base legal y conservación' ) . $p( 'Consentimiento (cookies publicitarias y analíticas) e interés legítimo (seguridad del sitio). Los mensajes se conservan el tiempo necesario para atender tu consulta.' )
				. $h( 'Tus derechos' ) . $p( "Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a $mail. También puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es)." ) ),
			'politica-de-cookies' => array( 'Política de cookies',
				$p( 'Usamos cookies y tecnologías similares. Las técnicas son necesarias para el funcionamiento; las de publicidad (Google AdSense) solo se usan si das tu consentimiento en el aviso de cookies.' )
				. $h( 'Tipos de cookies' ) . $p( '<strong>Técnicas</strong>: sesión, preferencias (sonido) y récords guardados en tu navegador. <strong>Publicitarias de terceros</strong>: Google (AdSense) para mostrar y medir anuncios.' )
				. $h( 'Cómo gestionarlas' ) . $p( 'Puedes cambiar tu elección en cualquier momento desde el enlace de preferencias de privacidad del pie de página o borrarlas desde la configuración de tu navegador.' ) ),
			'contacto' => array( 'Contacto',
				$p( "¿Tienes una sugerencia, has encontrado un error en un juego o quieres proponer una colaboración? Escríbenos a <a href=\"mailto:$mail\">$mail</a> y te responderemos lo antes posible." ) ),
			'sobre-nosotros' => array( 'Sobre nosotros',
				$p( "$site es un portal de juegos creado en Bilbao con un objetivo sencillo: juegos rápidos, gratuitos y bien hechos que funcionen en cualquier móvil u ordenador sin instalar nada." )
				. $p( 'Nuestros juegos exclusivos están desarrollados desde cero con un estilo propio: arcade, puzzle, plataformas, estrategia, cartas, 3D y deportes. Los probamos uno a uno para que las reglas sean las correctas y los niveles siempre tengan solución.' )
				. $p( 'Añadimos juegos nuevos y mejoras de forma continua. Si quieres ver un juego en concreto, cuéntanoslo en la página de contacto.' ) ),
		);
		$ids = (array) get_option( 'arcade_legal_pages', array() );
		foreach ( $pages as $slug => list( $title, $content ) ) {
			$existing = get_page_by_path( $slug );
			$data = array( 'post_type' => 'page', 'post_title' => $title, 'post_name' => $slug, 'post_content' => $content );
			if ( $existing ) {
				$data['ID'] = $existing->ID; wp_update_post( $data ); $ids[ $slug ] = $existing->ID;
			} else {
				$data['post_status'] = 'draft'; $ids[ $slug ] = wp_insert_post( $data );
			}
		}
		update_option( 'arcade_legal_pages', $ids, false );
		if ( ! empty( $ids['politica-de-privacidad'] ) ) {
			update_option( 'wp_page_for_privacy_policy', (int) $ids['politica-de-privacidad'] );
		}
	}

	/** Enlaces legales publicados (para el pie). */
	public static function legal_links() {
		$out = array();
		foreach ( (array) get_option( 'arcade_legal_pages', array() ) as $slug => $id ) {
			if ( 'publish' === get_post_status( $id ) ) {
				$out[] = array( get_the_title( $id ), get_permalink( $id ) );
			}
		}
		return $out;
	}

	/* ------------------------------------------------------------------ ads.txt */
	public static function ads_txt() {
		$path = wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_PATH ); // phpcs:ignore
		if ( '/ads.txt' !== $path || ! self::opt( 'pub' ) ) {
			return;
		}
		header( 'Content-Type: text/plain; charset=utf-8' );
		echo 'google.com, ' . esc_html( self::opt( 'pub' ) ) . ", DIRECT, f08c47fec0942fa0\n";
		exit;
	}

	/* --------------------------------------------------------------- <head> */
	public static function head() {
		if ( is_admin() ) {
			return;
		}
		if ( self::opt( 'pub' ) ) {
			$h5 = self::opt( 'h5' ) && class_exists( 'Arcade_Portal' ) && Arcade_Portal::is_portal();
			$ex = $h5 ? sprintf( ' data-ad-frequency-hint="%ds"', (int) self::opt( 'freq' ) ) : '';
			if ( self::opt( 'adtest' ) ) {
				$ex .= ' data-adbreak-test="on" data-adtest="on"';
			}
			printf( '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-%s" crossorigin="anonymous"%s></script>' . "\n", esc_attr( self::opt( 'pub' ) ), $ex ); // phpcs:ignore
			if ( $h5 ) {
				// API de anuncios para juegos (Ad Placement API): el reproductor llama a adBreak() al empezar y al reiniciar.
				echo "<script>window.adsbygoogle=window.adsbygoogle||[];var adBreak=adConfig=function(o){adsbygoogle.push(o);};adConfig({preloadAdBreaks:'on',sound:'on'});</script>\n";
			}
		}
		if ( ! class_exists( 'Arcade_Portal' ) || ! Arcade_Portal::is_portal() ) {
			return;
		}
		$brand = Arcade_Portal::brand();
		if ( is_singular( 'game' ) ) {
			$id = get_queried_object_id(); $l = Arcade_Portal::LABELS[ Arcade_Portal::genre_of( $id ) ];
			$desc = wp_strip_all_tags( Arcade_Portal::howto( $id ) ?: get_the_excerpt( $id ) );
			$desc = sprintf( 'Juega gratis a %s, juego de %s online sin descargas. %s', get_the_title( $id ), strtolower( $l[0] ), $desc );
			$img = Arcade_Core::thumb( $id, 'large' ); $title = get_the_title( $id ) . ' — ' . $brand;
			$ld = array( '@context' => 'https://schema.org', '@type' => 'VideoGame', 'name' => get_the_title( $id ), 'url' => get_permalink( $id ), 'image' => $img, 'description' => $desc, 'genre' => $l[0], 'gamePlatform' => array( 'Navegador web', 'Móvil', 'PC' ), 'applicationCategory' => 'Game', 'operatingSystem' => 'Any', 'inLanguage' => 'es', 'isAccessibleForFree' => true, 'publisher' => array( '@type' => 'Organization', 'name' => $brand ), 'offers' => array( '@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'EUR' ) );
			$mp = class_exists( 'Arcade_Party' ) ? Arcade_Party::players( get_post_field( 'post_name', $id ) ) : null;
			if ( $mp ) { // numberOfPlayers y playMode para los multijugador
				$ld['numberOfPlayers'] = array( '@type' => 'QuantitativeValue', 'minValue' => 1, 'maxValue' => $mp[1] );
				$ld['playMode']        = array( 'SinglePlayer', 'MultiPlayer' );
			}
		} elseif ( is_tax( 'game_genre' ) ) {
			$t = get_queried_object(); $l = Arcade_Portal::LABELS[ $t->slug ] ?? array( $t->name );
			$title = 'Juegos de ' . $l[0] . ' gratis — ' . $brand; $desc = sprintf( 'Los mejores juegos de %s gratis online: sin descargas, en móvil y PC.', strtolower( $l[0] ) ); $img = '';
		} else {
			$title = $brand . ' — Juegos gratis online'; $desc = sprintf( '%s: juegos HTML5 gratis para móvil y PC. Arcade, puzzle, plataformas, cartas, 3D y deportes, sin descargas ni registro.', $brand ); $img = '';
		}
		$desc = wp_trim_words( $desc, 32, '…' );
		printf( '<meta name="description" content="%s">' . "\n", esc_attr( $desc ) );
		printf( '<meta property="og:type" content="website"><meta property="og:site_name" content="%s"><meta property="og:title" content="%s"><meta property="og:description" content="%s">%s<meta name="twitter:card" content="summary_large_image">' . "\n", esc_attr( $brand ), esc_attr( $title ), esc_attr( $desc ), $img ? '<meta property="og:image" content="' . esc_url( $img ) . '">' : '' );
		if ( ! empty( $ld ) ) {
			echo '<script type="application/ld+json">' . wp_json_encode( $ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . '</script>' . "\n";
		}
	}

	/** Vista previa de los huecos de anuncio para administradores (?adpreview=1). */
	public static function preview() {
		return ! empty( $_GET['adpreview'] ) && current_user_can( 'manage_options' ); // phpcs:ignore
	}

	/**
	 * Bloque de anuncio separado del juego. Se rellena de forma perezosa desde portal.js
	 * (solo cuando se acerca a la pantalla y es visible), así no hay huecos de ancho 0.
	 */
	public static function ad_block( $where ) {
		$names = array( 'game' => 'bajo el juego', 'side' => 'lateral 300×600', 'feed' => 'entre juegos', 'home' => 'entre secciones', 'tv' => 'en el lobby de la tele (horizontal)' );
		if ( self::preview() ) {
			return sprintf( '<div class="ax-ad ax-ad-%1$s"><span>Publicidad</span><div class="ax-ad-ph">Anuncio %2$s</div></div>', esc_attr( $where ), esc_html( $names[ $where ] ?? $where ) );
		}
		$slot = 'side' === $where && self::opt( 'slot_side' ) ? self::opt( 'slot_side' ) : self::opt( 'slot' );
		if ( ! self::opt( 'pub' ) || ! $slot ) {
			return '';
		}
		$fmt = 'side' === $where ? 'data-ad-format="vertical"' : ( 'tv' === $where ? 'data-ad-format="horizontal"' : 'data-ad-format="auto" data-full-width-responsive="true"' );
		return sprintf( '<div class="ax-ad ax-ad-%1$s" data-ax-ad><span>Publicidad</span><ins class="adsbygoogle" style="display:block" data-ad-client="ca-%2$s" data-ad-slot="%3$s" %4$s%5$s></ins></div>', esc_attr( $where ), esc_attr( self::opt( 'pub' ) ), esc_attr( $slot ), $fmt, self::opt( 'adtest' ) ? ' data-adtest="on"' : '' );
	}
}
