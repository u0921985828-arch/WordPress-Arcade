<?php
/**
 * Modo tele / fiesta: la tele abre /tele/ (código + QR) y hasta 4 móviles abren /mando/?c=CODE.
 * WordPress solo hace de señalización WebRTC (sin trickle: un offer y un answer completos por mando);
 * después las pulsaciones viajan por un canal de datos directo móvil → tele.
 *
 * Datos (transients, caducan solos):
 *  arcade_party_<CODE>        sala: token del anfitrión, marcas de mandos conectados. Solo la escribe la tele.
 *  arcade_pslot_<CODE>_<p>    mando p (0..3): token, offer, oid. Solo lo escribe el móvil.
 *  arcade_pans_<CODE>_<p>     answer de la tele para el oid del mando. Solo lo escribe la tele.
 * Así cada registro tiene un único escritor y no se pisan las escrituras concurrentes.
 */
defined( 'ABSPATH' ) || exit;

final class Arcade_Party {

	const ALPHA    = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O (ni cifras)
	const PADS     = 4;
	const SDP_MAX  = 12288;
	const STALE    = 45;   // s sin señales de vida → la plaza del mando queda libre
	const COLORS   = array( '#ff5a5f', '#3fb6ea', '#ffd166', '#5fbf45' );
	const LIMITS   = array( // tipo => [peticiones, ventana en s]
		'create' => array( 6, 600 ),
		'join'   => array( 20, 600 ),
		'req'    => array( 240, 60 ),
	);

	public static function boot() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
		add_action( 'init', array( __CLASS__, 'pages' ), 1 );
	}

	/** Vida de una sala sin actividad del anfitrión (s). Filtrable para pruebas. */
	private static function ttl() {
		return max( 5, (int) apply_filters( 'arcade_party_ttl', 20 * MINUTE_IN_SECONDS ) );
	}

	/* ------------------------------------------------------------ Catálogo */

	/** games/party.json (lo genera build_games.py). */
	public static function catalog() {
		static $cat = null;
		if ( null === $cat ) {
			$cat  = array();
			$file = __DIR__ . '/games/party.json';
			$data = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null; // phpcs:ignore
			foreach ( ( $data['games'] ?? array() ) as $g ) {
				if ( ! empty( $g['slug'] ) && ! empty( $g['keys'] ) ) {
					$cat[ $g['slug'] ] = $g;
				}
			}
		}
		return $cat;
	}

	/** ¿Se puede jugar este juego con el mando del móvil? */
	public static function playable( $slug ) {
		return isset( self::catalog()[ $slug ] );
	}

	/** Jugadores [mín, máx] si el juego es multijugador en la tele; null si no. */
	public static function players( $slug ) {
		$g = self::catalog()[ $slug ] ?? null;
		return ( $g && ! empty( $g['mp'] ) && (int) $g['mp'][1] > 1 ) ? array( (int) $g['mp'][0], (int) $g['mp'][1] ) : null;
	}

	/** «Hasta 4 jugadores» / «2 jugadores». */
	public static function players_label( $slug ) {
		$mp = self::players( $slug );
		return $mp ? ( $mp[1] > 2 ? 'Hasta ' . $mp[1] . ' jugadores' : $mp[1] . ' jugadores' ) : '';
	}

	public static function tv_url( $slug = '' ) {
		$u = home_url( '/tele/' );
		return $slug ? add_query_arg( 'g', rawurlencode( $slug ), $u ) : $u;
	}

	/* -------------------------------------------------------------- Páginas */

	public static function pages() {
		$path = wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_PATH ); // phpcs:ignore
		$base = rtrim( (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH ), '/' );
		$path = rtrim( (string) $path, '/' );
		if ( $base . '/tele' === $path ) {
			self::render( 'tv' );
		} elseif ( $base . '/mando' === $path ) {
			self::render( 'pad' );
		}
	}

	private static function render( $kind ) {
		$asset = static function ( $rel ) {
			return plugins_url( $rel, __FILE__ );
		};
		$v     = Arcade_Core::VERSION;
		$brand = class_exists( 'Arcade_Portal' ) ? Arcade_Portal::brand() : get_bloginfo( 'name' );
		$cfg   = array(
			'api'    => esc_url_raw( rest_url( 'arcade/v1/party' ) ),
			'games'  => $asset( 'games/' ),
			'cat'    => add_query_arg( 'v', $v, $asset( 'games/party.json' ) ),
			'pad'    => home_url( '/mando/' ),
			'tv'     => home_url( '/tele/' ),
			'home'   => home_url( '/' ),
			'brand'  => $brand,
			'colors' => self::COLORS,
			'ice'    => array( array( 'urls' => 'stun:stun.l.google.com:19302' ) ),
			'v'      => $v,
		);
		$ads = 'tv' === $kind ? self::ads() : array( 'head' => '' );
		if ( 'tv' === $kind ) {
			$cfg['ad'] = $ads['block'];
			$cfg['h5'] = $ads['h5'];
		}
		nocache_headers();
		header( 'Content-Type: text/html; charset=utf-8' );
		header( 'X-Robots-Tag: noindex' );
		$tv    = 'tv' === $kind;
		$title = $tv ? 'Jugar en la tele — ' . $brand : 'Mando — ' . $brand;
		?><!doctype html>
<html lang="es" class="<?php echo $tv ? 'pt-tv' : 'pt-pad'; ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover<?php echo $tv ? '' : ', maximum-scale=1, user-scalable=no'; ?>">
<meta name="theme-color" content="#0b0d12">
<meta name="robots" content="noindex">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="format-detection" content="telephone=no">
<title><?php echo esc_html( $title ); ?></title>
<link rel="icon" href="<?php echo esc_url( $asset( 'assets/img/icon.svg' ) ); ?>" type="image/svg+xml">
<link rel="stylesheet" href="<?php echo esc_url( add_query_arg( 'v', $v, $asset( 'assets/css/party.css' ) ) ); ?>">
<?php echo $ads['head']; // phpcs:ignore -- HTML generado aquí con valores escapados ?>
</head>
<body class="<?php echo $tv ? 'pt-tv' : 'pt-pad'; ?>">
<noscript><p class="pt-noscript">Activa JavaScript para usar el modo tele.</p></noscript>
<div id="pt-app"></div>
<script>window.PARTY = <?php echo wp_json_encode( $cfg, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ); ?>;</script>
<script src="<?php echo esc_url( add_query_arg( 'v', $v, $asset( $tv ? 'assets/js/party-tv.js' : 'assets/js/party-pad.js' ) ) ); ?>"></script>
</body>
</html>
		<?php
		exit;
	}

	/**
	 * Publicidad de la tele (solo en el lobby; nunca en el mando del móvil ni durante la partida):
	 * un bloque «Publicidad» entre secciones de la rejilla y, con H5 Games Ads, una pausa publicitaria
	 * al volver de un juego al lobby. Con ?adpreview=1 (administrador) se ven los huecos simulados.
	 */
	private static function ads() {
		$r = array( 'head' => '', 'block' => '', 'h5' => null );
		if ( ! class_exists( 'Arcade_SEO' ) ) {
			return $r;
		}
		$preview  = Arcade_SEO::preview();
		$pub      = Arcade_SEO::opt( 'pub' );
		$h5       = $pub && Arcade_SEO::opt( 'h5' );
		$freq     = max( 60, (int) Arcade_SEO::opt( 'freq' ) );
		$r['block'] = Arcade_SEO::ad_block( 'tv' );
		if ( $preview ) {
			$r['h5'] = array( 'freq' => 60, 'preview' => true );
			return $r;
		}
		if ( ! $pub ) {
			return $r;
		}
		$ex = $h5 ? sprintf( ' data-ad-frequency-hint="%ds"', $freq ) : '';
		if ( Arcade_SEO::opt( 'adtest' ) ) {
			$ex .= $h5 ? ' data-adbreak-test="on" data-adtest="on"' : ' data-adtest="on"';
		}
		$r['head'] = sprintf( '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-%s" crossorigin="anonymous"%s></script>' . "\n", esc_attr( $pub ), $ex );
		if ( $h5 ) {
			$r['head'] .= "<script>window.adsbygoogle=window.adsbygoogle||[];var adBreak=adConfig=function(o){adsbygoogle.push(o);};adConfig({preloadAdBreaks:'on',sound:'on'});</script>\n";
			$r['h5']    = array( 'freq' => $freq, 'preview' => false );
		}
		return $r;
	}

	/* ------------------------------------------------------------------ REST */

	public static function routes() {
		$ns   = 'arcade/v1';
		$code = '/party/(?P<code>[A-Za-z]{4})';
		$open = '__return_true';
		register_rest_route( $ns, '/party', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'create' ), 'permission_callback' => $open ) );
		register_rest_route( $ns, $code, array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'poll' ), 'permission_callback' => $open ) );
		register_rest_route( $ns, $code . '/close', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'close' ), 'permission_callback' => $open ) );
		register_rest_route( $ns, $code . '/join', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'join' ), 'permission_callback' => $open ) );
		register_rest_route( $ns, $code . '/offer', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'offer' ), 'permission_callback' => $open ) );
		register_rest_route(
			$ns,
			$code . '/answer',
			array(
				array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'answer' ), 'permission_callback' => $open ),
				array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'get_answer' ), 'permission_callback' => $open ),
			)
		);
	}

	private static function ip() {
		return isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	}

	/** Contador por IP y ventana fija. Devuelve un WP_Error 429 si se supera. */
	private static function limit( $kind ) {
		list( $max, $win ) = self::LIMITS[ $kind ];
		$max = (int) apply_filters( 'arcade_party_limit', $max, $kind );
		$bk  = (int) floor( time() / $win );
		$key = 'arcade_rl_' . $kind . '_' . substr( md5( self::ip() ), 0, 16 ) . '_' . $bk;
		$n   = (int) get_transient( $key ) + 1;
		set_transient( $key, $n, $win + 5 );
		if ( $n > $max ) {
			return new WP_Error( 'arcade_party_limit', 'Demasiadas peticiones. Espera un poco.', array( 'status' => 429, 'retry' => ( $bk + 1 ) * $win - time() ) );
		}
		return null;
	}

	/** Respuesta sin caché (o el error con Retry-After). */
	private static function out( $data, $status = 200 ) {
		if ( is_wp_error( $data ) ) {
			$d   = $data->get_error_data();
			$res = new WP_REST_Response( array( 'code' => $data->get_error_code(), 'message' => $data->get_error_message() ), $d['status'] ?? 400 );
			if ( isset( $d['retry'] ) ) {
				$res->header( 'Retry-After', (string) max( 1, (int) $d['retry'] ) );
			}
		} else {
			$res = new WP_REST_Response( $data, $status );
		}
		$res->header( 'Cache-Control', 'no-store' );
		return $res;
	}

	private static function err( $code, $msg, $status ) {
		return self::out( new WP_Error( $code, $msg, array( 'status' => $status ) ) );
	}

	private static function room( $code ) {
		$r = get_transient( 'arcade_party_' . $code );
		return is_array( $r ) ? $r : null;
	}

	private static function save_room( $code, $r ) {
		set_transient( 'arcade_party_' . $code, $r, self::ttl() );
	}

	private static function slot( $code, $p ) {
		$s = get_transient( 'arcade_pslot_' . $code . '_' . $p );
		return is_array( $s ) ? $s : null;
	}

	/** Dura más que la sala (el mando conectado no vuelve a escribir) para poder reconectar con su número. */
	private static function save_slot( $code, $p, $s ) {
		set_transient( 'arcade_pslot_' . $code . '_' . $p, $s, max( self::ttl(), 6 * HOUR_IN_SECONDS ) );
	}

	private static function token() {
		return bin2hex( random_bytes( 16 ) );
	}

	private static function code_of( WP_REST_Request $req ) {
		return strtoupper( (string) $req['code'] );
	}

	private static function sdp( WP_REST_Request $req ) {
		$sdp = (string) $req->get_param( 'sdp' );
		if ( strlen( $sdp ) > self::SDP_MAX ) {
			return new WP_Error( 'arcade_party_sdp', 'SDP demasiado grande.', array( 'status' => 413 ) );
		}
		if ( 0 !== strpos( $sdp, 'v=0' ) ) {
			return new WP_Error( 'arcade_party_sdp', 'SDP no válido.', array( 'status' => 400 ) );
		}
		return $sdp;
	}

	/** Sala + comprobación del token del anfitrión. */
	private static function host_room( WP_REST_Request $req ) {
		$code = self::code_of( $req );
		$room = self::room( $code );
		if ( ! $room ) {
			return new WP_Error( 'arcade_party_gone', 'La sala ha caducado.', array( 'status' => 404 ) );
		}
		if ( ! hash_equals( $room['k'], (string) $req->get_param( 'k' ) ) ) {
			return new WP_Error( 'arcade_party_auth', 'Token no válido.', array( 'status' => 403 ) );
		}
		return array( $code, $room );
	}

	/** Mando p con su token. */
	private static function pad_slot( WP_REST_Request $req ) {
		$code = self::code_of( $req );
		$p    = (int) $req->get_param( 'p' );
		$tok  = (string) $req->get_param( 'tok' );
		if ( ! self::room( $code ) ) {
			return new WP_Error( 'arcade_party_gone', 'La sala ha caducado.', array( 'status' => 404 ) );
		}
		$s = ( $p >= 0 && $p < self::PADS ) ? self::slot( $code, $p ) : null;
		if ( ! $s || '' === $tok || ! hash_equals( $s['tok'], $tok ) ) {
			return new WP_Error( 'arcade_party_seat', 'Has perdido la plaza: vuelve a unirte.', array( 'status' => 409 ) );
		}
		return array( $code, $p, $s );
	}

	/** POST /party → crea sala. */
	public static function create( WP_REST_Request $req ) {
		$e = self::limit( 'req' ) ?: self::limit( 'create' );
		if ( $e ) {
			return self::out( $e );
		}
		$code = '';
		for ( $i = 0; $i < 20 && ( '' === $code || self::room( $code ) ); $i++ ) {
			$code = '';
			for ( $j = 0; $j < 4; $j++ ) {
				$code .= self::ALPHA[ random_int( 0, strlen( self::ALPHA ) - 1 ) ];
			}
		}
		if ( self::room( $code ) ) {
			return self::err( 'arcade_party_full', 'No hay salas libres ahora mismo.', 503 );
		}
		for ( $p = 0; $p < self::PADS; $p++ ) { // restos de una sala anterior con el mismo código
			delete_transient( 'arcade_pslot_' . $code . '_' . $p );
			delete_transient( 'arcade_pans_' . $code . '_' . $p );
		}
		$room = array( 'k' => self::token(), 't' => time(), 'w' => time(), 'live' => array_fill( 0, self::PADS, 0 ), 'gone' => array_fill( 0, self::PADS, 0 ) );
		self::save_room( $code, $room );
		return self::out( array( 'code' => $code, 'k' => $room['k'], 'ttl' => self::ttl(), 'max' => self::PADS ), 201 );
	}

	/**
	 * GET /party/CODE?k=…&live=0,2 → sondeo de la tele. Devuelve los mandos con plaza y el offer
	 * de los que esperan respuesta. `live` son los mandos con canal abierto (mantienen su plaza).
	 */
	public static function poll( WP_REST_Request $req ) {
		$e = self::limit( 'req' );
		if ( $e ) {
			return self::out( $e );
		}
		$hr = self::host_room( $req );
		if ( is_wp_error( $hr ) ) {
			return self::out( $hr );
		}
		list( $code, $room ) = $hr;
		$now   = time();
		$dirty = $now - $room['w'] > 60; // renueva la caducidad como mucho una vez por minuto
		$live  = array_filter( array_map( 'intval', explode( ',', (string) $req->get_param( 'live' ) ) ), static function ( $p ) { return $p >= 0 && $p < self::PADS; } );
		if ( '' === (string) $req->get_param( 'live' ) ) {
			$live = array();
		}
		$gone = isset( $room['gone'] ) ? $room['gone'] : array_fill( 0, self::PADS, 0 );
		foreach ( $live as $p ) {
			if ( $now - $room['live'][ $p ] > 15 || $gone[ $p ] ) {
				$room['live'][ $p ] = $now;
				$gone[ $p ]         = 0;
				$dirty              = true;
			}
		}
		// `gone`: mandos cuyo canal se cerró. Su plaza queda libre enseguida (sin esperar STALE) para que
		// el mismo móvil en una pestaña nueva, sin su token, recupere su número. Con token vuelve igual.
		foreach ( array_map( 'intval', array_filter( explode( ',', (string) $req->get_param( 'gone' ) ), 'strlen' ) ) as $p ) {
			if ( $p >= 0 && $p < self::PADS && ! in_array( $p, $live, true ) && ! $gone[ $p ] ) {
				$gone[ $p ]         = microtime( true );
				$room['live'][ $p ] = 0;
				$dirty              = true;
			}
		}
		$room['gone'] = $gone;
		if ( $dirty ) {
			$room['w'] = $now;
			self::save_room( $code, $room );
		}
		$pads = array();
		for ( $p = 0; $p < self::PADS; $p++ ) {
			$s = self::slot( $code, $p );
			if ( ! $s ) {
				continue;
			}
			$row = array( 'p' => $p, 'sid' => substr( md5( $s['tok'] ), 0, 8 ), 'oid' => (int) $s['oid'], 'name' => $s['name'] );
			$ans = get_transient( 'arcade_pans_' . $code . '_' . $p );
			if ( $s['oid'] && ! empty( $s['offer'] ) && ( ! is_array( $ans ) || (int) $ans['oid'] !== (int) $s['oid'] ) ) {
				$row['offer'] = $s['offer'];
			}
			$pads[] = $row;
		}
		return self::out( array( 'pads' => $pads, 'ttl' => self::ttl() ) );
	}

	/** POST /party/CODE/answer {k, p, oid, sdp} → la tele responde al offer del mando p. */
	public static function answer( WP_REST_Request $req ) {
		$e = self::limit( 'req' );
		if ( $e ) {
			return self::out( $e );
		}
		$hr = self::host_room( $req );
		if ( is_wp_error( $hr ) ) {
			return self::out( $hr );
		}
		$code = $hr[0];
		$p    = (int) $req->get_param( 'p' );
		$sdp  = self::sdp( $req );
		if ( is_wp_error( $sdp ) ) {
			return self::out( $sdp );
		}
		$s = ( $p >= 0 && $p < self::PADS ) ? self::slot( $code, $p ) : null;
		if ( ! $s || (int) $s['oid'] !== (int) $req->get_param( 'oid' ) ) {
			return self::err( 'arcade_party_stale', 'El mando ya no espera esta respuesta.', 409 );
		}
		set_transient( 'arcade_pans_' . $code . '_' . $p, array( 'oid' => (int) $s['oid'], 'sdp' => $sdp ), self::ttl() );
		$chk = self::fresh( 'arcade_pans_' . $code . '_' . $p );
		if ( ! is_array( $chk ) || (int) $chk['oid'] !== (int) $s['oid'] ) {
			return self::err( 'arcade_party_busy', 'No se pudo guardar la respuesta.', 503 );
		}
		return self::out( array( 'ok' => true ) );
	}

	/** POST /party/CODE/close {k} → la tele cierra la sala. */
	public static function close( WP_REST_Request $req ) {
		$hr = self::host_room( $req );
		if ( is_wp_error( $hr ) ) {
			return self::out( $hr );
		}
		$code = $hr[0];
		delete_transient( 'arcade_party_' . $code );
		for ( $p = 0; $p < self::PADS; $p++ ) {
			delete_transient( 'arcade_pslot_' . $code . '_' . $p );
			delete_transient( 'arcade_pans_' . $code . '_' . $p );
		}
		return self::out( array( 'ok' => true ) );
	}

	/**
	 * POST /party/CODE/join {tok?, p?, name?} → plaza de mando. Con el token de antes recupera su número.
	 * Una plaza está libre si no existe o si ni el móvil ni la tele han dado señales en STALE segundos.
	 */
	public static function join( WP_REST_Request $req ) {
		$e = self::limit( 'req' );
		if ( $e ) {
			return self::out( $e );
		}
		$code = self::code_of( $req );
		$room = self::room( $code );
		if ( ! $room ) {
			return self::err( 'arcade_party_gone', 'No existe ninguna sala con ese código.', 404 );
		}
		$now  = time();
		$tok  = (string) $req->get_param( 'tok' );
		$name = mb_substr( sanitize_text_field( (string) $req->get_param( 'name' ) ), 0, 16 );
		$want = $req->get_param( 'p' );
		$slots = array();
		for ( $p = 0; $p < self::PADS; $p++ ) {
			$slots[ $p ] = self::slot( $code, $p );
		}
		$seat = -1;
		if ( '' !== $tok ) { // reconexión
			$order = null !== $want && (int) $want >= 0 && (int) $want < self::PADS ? array( (int) $want ) : array();
			foreach ( array_merge( $order, range( 0, self::PADS - 1 ) ) as $p ) {
				if ( $slots[ $p ] && hash_equals( $slots[ $p ]['tok'], $tok ) ) {
					$seat = $p;
					break;
				}
			}
		}
		if ( $seat >= 0 ) { // reconexión con su token: no cuenta como «unirse» (el móvil bloqueado vuelve muchas veces)
			$s         = $slots[ $seat ];
			$s['seen'] = microtime( true );
			if ( '' !== $name ) {
				$s['name'] = $name;
			}
			self::save_slot( $code, $seat, $s );
			return self::out( array( 'p' => $seat, 'tok' => $tok, 'color' => self::COLORS[ $seat ] ) );
		}
		$e = self::limit( 'join' );
		if ( $e ) {
			return self::out( $e );
		}
		// Plaza nueva: bajo cerrojo para que dos móviles que se unen a la vez no se queden la misma.
		$lock = self::lock( $code );
		if ( ! $lock ) {
			return self::err( 'arcade_party_busy', 'Sala ocupada, reintentando…', 503 );
		}
		for ( $p = 0; $p < self::PADS && $seat < 0; $p++ ) {
			$s = self::fresh_slot( $code, $p ); // relectura dentro del cerrojo
			$gt   = isset( $room['gone'][ $p ] ) ? (float) $room['gone'][ $p ] : 0;
			$free = ! $s || ( $gt && $gt > (float) $s['seen'] ) || ( $now - (int) $s['seen'] > self::STALE && $now - (int) $room['live'][ $p ] > self::STALE );
			if ( $free ) {
				$seat = $p;
			}
		}
		if ( $seat < 0 ) {
			self::unlock( $lock );
			return self::err( 'arcade_party_full', 'La sala está completa (4 mandos).', 409 );
		}
		$tok = self::token();
		delete_transient( 'arcade_pans_' . $code . '_' . $seat );
		self::save_slot( $code, $seat, array( 'tok' => $tok, 'oid' => 0, 'offer' => '', 'name' => $name, 'seen' => microtime( true ) ) );
		$chk = self::fresh_slot( $code, $seat ); // la escritura puede fallar (base de datos ocupada): se comprueba
		self::unlock( $lock );
		if ( ! $chk || $chk['tok'] !== $tok ) {
			return self::err( 'arcade_party_busy', 'Sala ocupada, reintentando…', 503 );
		}
		return self::out( array( 'p' => $seat, 'tok' => $tok, 'color' => self::COLORS[ $seat ] ) );
	}

	/** Mando p leído de nuevo, sin la caché de opciones de esta petición (con caché de objetos persistente no hace falta). */
	private static function fresh_slot( $code, $p ) {
		$s = self::fresh( 'arcade_pslot_' . $code . '_' . $p );
		return is_array( $s ) ? $s : null;
	}

	private static function fresh( $k ) {
		if ( ! wp_using_ext_object_cache() ) {
			wp_cache_delete( '_transient_' . $k, 'options' );
			wp_cache_delete( '_transient_timeout_' . $k, 'options' );
			wp_cache_delete( 'notoptions', 'options' );
		}
		return get_transient( $k );
	}

	/**
	 * Cerrojo por sala: INSERT IGNORE sobre la clave única de wp_options (atómico en MySQL y en SQLite;
	 * add_option() no sirve porque usa ON DUPLICATE KEY UPDATE). Espera como mucho ~2 s; un cerrojo
	 * de más de 10 s se considera abandonado. No pasa por la caché de opciones.
	 */
	private static function lock( $code ) {
		global $wpdb;
		$name = '_arcade_plock_' . $code;
		for ( $i = 0; $i < 40; $i++ ) {
			$ok = $wpdb->query( $wpdb->prepare( "INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, 'off')", $name, (string) time() ) ); // phpcs:ignore
			if ( $ok ) {
				return $name;
			}
			$t = (int) $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $name ) ); // phpcs:ignore
			if ( $t && time() - $t > 10 ) {
				self::unlock( $name );
				continue;
			}
			usleep( 50000 );
		}
		return '';
	}

	private static function unlock( $name ) {
		global $wpdb;
		if ( $name ) {
			$wpdb->delete( $wpdb->options, array( 'option_name' => $name ) );
		}
	}

	/** POST /party/CODE/offer {p, tok, sdp} → el mando publica su offer (con todos los candidatos). */
	public static function offer( WP_REST_Request $req ) {
		$e = self::limit( 'req' );
		if ( $e ) {
			return self::out( $e );
		}
		$ps = self::pad_slot( $req );
		if ( is_wp_error( $ps ) ) {
			return self::out( $ps );
		}
		list( $code, $p, $s ) = $ps;
		$sdp = self::sdp( $req );
		if ( is_wp_error( $sdp ) ) {
			return self::out( $sdp );
		}
		$s['oid']   = (int) $s['oid'] + 1;
		$s['offer'] = $sdp;
		$s['seen']  = microtime( true );
		self::save_slot( $code, $p, $s );
		$chk = self::fresh_slot( $code, $p );
		if ( ! $chk || (int) $chk['oid'] !== $s['oid'] ) {
			return self::err( 'arcade_party_busy', 'No se pudo guardar la oferta.', 503 );
		}
		return self::out( array( 'oid' => $s['oid'] ) );
	}

	/** GET /party/CODE/answer?p=&tok=&oid= → el mando recoge el answer de la tele (null si aún no está). */
	public static function get_answer( WP_REST_Request $req ) {
		$e = self::limit( 'req' );
		if ( $e ) {
			return self::out( $e );
		}
		$ps = self::pad_slot( $req );
		if ( is_wp_error( $ps ) ) {
			return self::out( $ps );
		}
		list( $code, $p, $s ) = $ps;
		$ans = get_transient( 'arcade_pans_' . $code . '_' . $p );
		$ok  = is_array( $ans ) && (int) $ans['oid'] === (int) $req->get_param( 'oid' ) && (int) $ans['oid'] === (int) $s['oid'];
		if ( time() - (int) $s['seen'] > 10 ) { // señal de vida sin escribir en cada sondeo
			$s['seen'] = microtime( true );
			self::save_slot( $code, $p, $s );
		}
		return self::out( array( 'sdp' => $ok ? $ans['sdp'] : null ) );
	}
}
