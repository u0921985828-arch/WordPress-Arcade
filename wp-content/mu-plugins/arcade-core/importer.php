<?php
/**
 * Importador de catálogos profesionales (GamePix y GameDistribution).
 * Games → Importar catálogo. Crea entradas "game" con embed externo, miniatura remota,
 * género, instrucciones y orientación. No duplica juegos ya importados.
 */
defined( 'ABSPATH' ) || exit;

final class Arcade_Importer {

	const PAGE = 'arcade-import';

	public static function boot() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_post_arcade_import', array( __CLASS__, 'run' ) );
		add_action( 'admin_post_arcade_import_delete', array( __CLASS__, 'delete' ) );
	}

	public static function menu() {
		add_submenu_page( 'edit.php?post_type=game', 'Importar catálogo', 'Importar catálogo', 'manage_options', self::PAGE, array( __CLASS__, 'screen' ) );
	}

	private static function count_source( $src ) {
		global $wpdb;
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->postmeta} pm JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE pm.meta_key = '_game_source' AND pm.meta_value = %s AND p.post_type = 'game'", $src ) );
	}

	public static function screen() {
		$sid  = get_option( 'arcade_gamepix_sid', '' );
		$msg  = isset( $_GET['arcade_msg'] ) ? sanitize_text_field( wp_unslash( $_GET['arcade_msg'] ) ) : '';
		?>
		<div class="wrap">
			<h1>Importar juegos profesionales</h1>
			<?php if ( $msg ) : ?><div class="notice notice-success"><p><?php echo esc_html( $msg ); ?></p></div><?php endif; ?>
			<p>Añade juegos HTML5 de estudios profesionales desde redes de distribución. Se insertan como iframe (no ocupan espacio en tu servidor) y las miniaturas se cargan desde la red. Los juegos ya importados se saltan.</p>
			<p>Importados ahora: <strong>GamePix <?php echo (int) self::count_source( 'gamepix' ); ?></strong> · <strong>GameDistribution <?php echo (int) self::count_source( 'gamedistribution' ); ?></strong></p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<?php wp_nonce_field( 'arcade_import' ); ?>
				<input type="hidden" name="action" value="arcade_import">
				<table class="form-table" role="presentation">
					<tr><th>Red</th><td>
						<label><input type="radio" name="source" value="gamepix" checked> GamePix (ordenados por calidad)</label><br>
						<label><input type="radio" name="source" value="gamedistribution"> GameDistribution (más recientes)</label>
					</td></tr>
					<tr><th>Cantidad</th><td><select name="amount"><?php foreach ( array( 24, 48, 96, 200, 400 ) as $n ) { printf( '<option value="%1$d"%2$s>%1$d juegos</option>', (int) $n, 96 === $n ? ' selected' : '' ); } ?></select>
						<p class="description">Por tandas: puedes repetir para añadir más. Empieza por la página indicada abajo.</p></td></tr>
					<tr><th>Empezar en página</th><td><input type="number" name="start_page" value="1" min="1" class="small-text"></td></tr>
					<tr><th>Categoría (opcional)</th><td><input type="text" name="category" placeholder="puzzle, racing, sports…" class="regular-text"><p class="description">Déjalo vacío para todas.</p></td></tr>
					<tr><th>Solo compatibles con móvil</th><td><label><input type="checkbox" name="mobile" value="1" checked> Omitir juegos que la red marca como solo escritorio</label></td></tr>
					<tr><th>ID de publisher GamePix (sid)</th><td><input type="text" name="sid" value="<?php echo esc_attr( $sid ); ?>" class="regular-text" placeholder="Tu sid de GamePix"><p class="description">Para cobrar tu parte de los anuncios. Sin él, los juegos funcionan igual pero no generan ingresos para ti. Se obtiene gratis registrándote como publisher en GamePix. En GameDistribution se registra el dominio en su panel de publisher.</p></td></tr>
				</table>
				<?php submit_button( 'Importar juegos' ); ?>
			</form>
			<hr>
			<h2>Quitar juegos importados</h2>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" onsubmit="return confirm('¿Seguro? Se borrarán definitivamente.');">
				<?php wp_nonce_field( 'arcade_import_delete' ); ?>
				<input type="hidden" name="action" value="arcade_import_delete">
				<select name="source"><option value="gamepix">GamePix</option><option value="gamedistribution">GameDistribution</option></select>
				<?php submit_button( 'Borrar todos los de esta red', 'delete', 'arcade_delete', false ); ?>
				<p class="description">Tus 100 juegos propios no se tocan.</p>
			</form>
		</div>
		<?php
	}

	/* --------------------------------------------------------------- Feeds */

	private static function fetch_json( $url ) {
		$r = wp_remote_get( $url, array( 'timeout' => 25, 'headers' => array( 'Accept' => 'application/json' ) ) );
		if ( is_wp_error( $r ) || 200 !== wp_remote_retrieve_response_code( $r ) ) {
			return null;
		}
		return json_decode( wp_remote_retrieve_body( $r ), true );
	}

	/** Devuelve lista normalizada de juegos de una página del feed. */
	private static function page( $source, $page, $per, $category, $sid ) {
		$out = array();
		if ( 'gamepix' === $source ) {
			$args = array( 'sid' => $sid ?: '1', 'pagination' => $per, 'page' => $page, 'order' => 'quality' );
			if ( $category ) {
				$args['category'] = $category;
			}
			$data = self::fetch_json( add_query_arg( $args, 'https://feeds.gamepix.com/v2/json' ) );
			foreach ( (array) ( $data['items'] ?? array() ) as $g ) {
				$url = (string) ( $g['url'] ?? '' );
				if ( $sid ) {
					$url = add_query_arg( 'sid', rawurlencode( $sid ), remove_query_arg( 'sid', $url ) );
				}
				$w = (int) ( $g['width'] ?? 800 ); $h = (int) ( $g['height'] ?? 600 );
				$out[] = array(
					'id'     => (string) ( $g['id'] ?? $g['namespace'] ?? '' ),
					'title'  => (string) ( $g['title'] ?? '' ),
					'desc'   => (string) ( $g['description'] ?? '' ),
					'how'    => '',
					'url'    => $url,
					'thumb'  => str_replace( '?w=320', '?w=640', (string) ( $g['banner_image'] ?? $g['image'] ?? '' ) ),
					'cats'   => array( (string) ( $g['category'] ?? '' ) ),
					'orient' => (string) ( $g['orientation'] ?? '' ),
					'w'      => $w, 'h' => $h,
					'mobile' => true,
					'tech'   => '',
				);
			}
		} else {
			$args = array( 'collection' => 'all', 'categories' => $category ?: 'All', 'tags' => 'All', 'subType' => 'all', 'type' => 'all', 'mobile' => 'all', 'rewarded' => 'all', 'amount' => $per, 'page' => $page, 'format' => 'json' );
			$data = self::fetch_json( add_query_arg( $args, 'https://catalog.api.gamedistribution.com/api/v2.0/rss/All/' ) );
			foreach ( (array) $data as $g ) {
				if ( ! is_array( $g ) ) {
					continue;
				}
				$assets = (array) ( $g['Asset'] ?? array() );
				$w = (int) ( $g['Width'] ?? 800 ); $h = (int) ( $g['Height'] ?? 600 );
				$out[] = array(
					'id'     => (string) ( $g['Md5'] ?? '' ),
					'title'  => (string) ( $g['Title'] ?? '' ),
					'desc'   => (string) ( $g['Description'] ?? '' ),
					'how'    => (string) ( $g['Instructions'] ?? '' ),
					'url'    => (string) ( $g['Url'] ?? '' ),
					'thumb'  => (string) ( $assets[0] ?? '' ),
					'cats'   => (array) ( $g['Category'] ?? array() ),
					'orient' => '',
					'w'      => $w, 'h' => $h,
					'mobile' => 'false' !== strtolower( (string) ( $g['Mobile'] ?? 'true' ) ),
					'tech'   => (string) ( $g['SubType'] ?? '' ),
				);
			}
		}
		return $out;
	}

	/** Categoría de la red → uno de los 6 géneros del portal. */
	public static function map_genre( array $cats, $tech ) {
		$c = strtolower( implode( ' ', $cats ) );
		$rules = array(
			'puzzle'         => '/puzzl|match|bubble|jigsaw|mahjong|connect|word|brain|logic|merge|hidden|educat|quiz|trivia|sort|2048|block/',
			'strategy-cards' => '/strateg|card|board|chess|solitaire|tower|defen|idle|clicker|tycoon|simulat|management|checkers|domino/',
			'platformer'     => '/platform|jump|parkour|obby|stickman|adventure|runner|escape/',
			'3d-webgl'       => '/\b3d\b|racing|driving|car|drift|moto|bike|flight|webgl/',
			'sports-casual'  => '/sport|soccer|football|basket|golf|pool|billiard|bowling|tennis|baseball|hypercasual|casual|cooking|girl|dress|make ?up|baby|care|music|rhythm|fashion|pet|kids/',
		);
		foreach ( $rules as $g => $re ) {
			if ( preg_match( $re, $c ) ) {
				return $g;
			}
		}
		return 'webgl' === strtolower( $tech ) && ! $c ? '3d-webgl' : 'arcade';
	}

	private static function aspect( $w, $h ) {
		if ( $w <= 0 || $h <= 0 ) {
			return '16:9';
		}
		$r = $w / $h;
		if ( $r < 1.1 ) {
			return '1:1';
		}
		return $r > 1.55 ? '16:9' : '4:3';
	}

	/* ---------------------------------------------------------------- Run */

	public static function run() {
		if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'arcade_import' ) ) {
			wp_die( 'No autorizado' );
		}
		@set_time_limit( 300 ); // phpcs:ignore
		$source = 'gamedistribution' === ( $_POST['source'] ?? '' ) ? 'gamedistribution' : 'gamepix';
		$amount = max( 1, min( 400, (int) ( $_POST['amount'] ?? 96 ) ) );
		$page   = max( 1, (int) ( $_POST['start_page'] ?? 1 ) );
		$cat    = sanitize_text_field( wp_unslash( $_POST['category'] ?? '' ) );
		$mobile = ! empty( $_POST['mobile'] );
		$sid    = preg_replace( '/[^A-Za-z0-9_-]/', '', (string) wp_unslash( $_POST['sid'] ?? '' ) );
		update_option( 'arcade_gamepix_sid', $sid, false );

		global $wpdb;
		$have = array_flip( (array) $wpdb->get_col( $wpdb->prepare( "SELECT meta_value FROM {$wpdb->postmeta} WHERE meta_key = '_game_source_id' AND post_id IN (SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_game_source' AND meta_value = %s)", $source ) ) );

		$made = 0; $skip = 0; $per = 48; $empty = 0;
		wp_defer_term_counting( true );
		while ( $made < $amount && $empty < 2 ) {
			$items = self::page( $source, $page, $per, $cat, $sid );
			$page++;
			if ( ! $items ) {
				$empty++;
				continue;
			}
			foreach ( $items as $g ) {
				if ( $made >= $amount ) {
					break;
				}
				if ( ! $g['id'] || ! $g['title'] || ! $g['url'] || isset( $have[ $g['id'] ] ) || ( $mobile && ! $g['mobile'] ) || 0 !== strpos( $g['url'], 'https://' ) ) {
					$skip++;
					continue;
				}
				$have[ $g['id'] ] = true;
				$genre = self::map_genre( $g['cats'], $g['tech'] );
				$pid   = wp_insert_post( array(
					'post_type'    => 'game',
					'post_status'  => 'publish',
					'post_title'   => wp_strip_all_tags( $g['title'] ),
					'post_content' => wpautop( esc_html( wp_strip_all_tags( $g['desc'] ) ) ),
					'post_excerpt' => wp_trim_words( wp_strip_all_tags( $g['desc'] ), 30 ),
				), true );
				if ( is_wp_error( $pid ) ) {
					$skip++;
					continue;
				}
				$url = $g['url'];
				if ( 'gamedistribution' === $source ) {
					$url = add_query_arg( 'gd_sdk_referrer_url', rawurlencode( get_permalink( $pid ) ), $url );
				}
				$portrait = 'portrait' === $g['orient'] || ( ! $g['orient'] && $g['h'] > $g['w'] );
				update_post_meta( $pid, '_game_embed_url', esc_url_raw( $url ) );
				update_post_meta( $pid, '_game_orientation', $portrait ? 'portrait' : ( 'all' === $g['orient'] ? 'auto' : 'landscape' ) );
				update_post_meta( $pid, '_game_aspect_ratio', $portrait ? '1:1' : self::aspect( $g['w'], $g['h'] ) );
				update_post_meta( $pid, '_game_tech_engine', 'webgl' === strtolower( $g['tech'] ) ? 'threejs' : 'canvas' );
				update_post_meta( $pid, '_game_input_methods', 'touch,keyboard,mouse' );
				update_post_meta( $pid, '_game_source', $source );
				update_post_meta( $pid, '_game_source_id', $g['id'] );
				update_post_meta( $pid, '_game_thumb_url', esc_url_raw( $g['thumb'] ) );
				if ( $g['how'] ) {
					update_post_meta( $pid, '_game_howto', wp_strip_all_tags( $g['how'] ) );
				}
				wp_set_object_terms( $pid, $genre, 'game_genre' );
				$tags = array_filter( array_map( 'sanitize_text_field', $g['cats'] ) );
				if ( $tags ) {
					wp_set_object_terms( $pid, $tags, 'game_tag' );
				}
				$made++;
			}
		}
		wp_defer_term_counting( false );
		$msg = sprintf( 'Importados %d juegos nuevos de %s (%d omitidos: repetidos o solo escritorio). Siguiente página sugerida: %d.', $made, 'gamepix' === $source ? 'GamePix' : 'GameDistribution', $skip, $page );
		wp_safe_redirect( add_query_arg( array( 'post_type' => 'game', 'page' => self::PAGE, 'arcade_msg' => rawurlencode( $msg ) ), admin_url( 'edit.php' ) ) );
		exit;
	}

	public static function delete() {
		if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'arcade_import_delete' ) ) {
			wp_die( 'No autorizado' );
		}
		@set_time_limit( 300 ); // phpcs:ignore
		$source = 'gamedistribution' === ( $_POST['source'] ?? '' ) ? 'gamedistribution' : 'gamepix';
		$ids    = get_posts( array( 'post_type' => 'game', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_game_source', 'meta_value' => $source ) );
		foreach ( $ids as $id ) {
			wp_delete_post( $id, true );
		}
		wp_safe_redirect( add_query_arg( array( 'post_type' => 'game', 'page' => self::PAGE, 'arcade_msg' => rawurlencode( sprintf( 'Borrados %d juegos.', count( $ids ) ) ) ), admin_url( 'edit.php' ) ) );
		exit;
	}
}
