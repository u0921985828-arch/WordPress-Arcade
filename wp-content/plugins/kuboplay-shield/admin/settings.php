<?php
/**
 * Panel de ajustes de Kuboplay Shield.
 *
 * Menú propio en el escritorio con dos pestañas (Seguridad y Rendimiento) y una
 * tarjeta de estado. Los interruptores NO están escritos a mano: cada módulo
 * registra los suyos con el filtro `kp_shield_fields`, así que este panel
 * funciona aunque falten includes/security.php o includes/perf.php.
 *
 * ── API para los módulos ─────────────────────────────────────────────────────
 *
 *   add_filter( 'kp_shield_fields', function ( $f ) {
 *       $f['seguridad'][] = array(
 *           'key'         => 'sec_login_slug',   // clave dentro de la opción kp_shield
 *           'label'       => 'Dirección de acceso',
 *           'desc'        => 'Texto de ayuda en lenguaje llano.',
 *           'type'        => 'switch',           // switch | number | text
 *           'default'     => 1,                  // valor por defecto
 *           'min'         => 1,                  // solo number (opcional)
 *           'max'         => 999,                // solo number (opcional)
 *           'placeholder' => 'acceso',           // solo text/number (opcional)
 *           // Extras opcionales que entiende el panel:
 *           'suffix'      => 'por minuto',       // unidad que se pinta tras el campo
 *           'confirm'     => 'Entiendo que ...', // exige marcar una casilla para cambiarlo
 *           'preview'     => 'url',              // enseña home_url()/valor bajo el campo
 *           'warn'        => 'Aviso destacado',  // recuadro amarillo junto al campo
 *       );
 *       return $f;
 *   } );
 *
 * Las claves 'seguridad' y 'rendimiento' son las dos pestañas. Cualquier otra
 * clave se ignora. Los módulos deben declarar además su valor por defecto en
 * `kp_shield_defaults` (el panel lo suple si falta, pero es mejor declararlo).
 *
 * Otros enganches que usa el panel:
 *   - `kp_shield_purge`   (acción) la dispara el botón «Vaciar caché».
 *   - `kp_shield_saved`   (acción) tras guardar, recibe el array de opciones.
 *   - `kp_shield_notices` (filtro) array de array('type'=>'warn|ok|info','text'=>'…')
 *                         para que un módulo añada avisos a la tarjeta de estado.
 *   - `kp_shield_status`  (filtro) array de array('label'=>'…','value'=>'…','ok'=>bool)
 *                         para añadir datos a la tarjeta de estado.
 */

defined( 'ABSPATH' ) || exit;

// Ojo: aquí no se puede comprobar class_exists( 'KP_Shield_Admin' ), porque PHP
// enlaza las clases de nivel superior al compilar el fichero y siempre daría true.
if ( ! class_exists( 'KP_Shield' ) || defined( 'KP_SHIELD_ADMIN' ) ) {
	return;
}
define( 'KP_SHIELD_ADMIN', true );

final class KP_Shield_Admin {

	const PAGE = 'kuboplay-shield';

	/** Pestañas del panel. */
	public static function tabs() {
		return array(
			'seguridad'   => __( 'Seguridad', 'kuboplay-shield' ),
			'rendimiento' => __( 'Rendimiento', 'kuboplay-shield' ),
		);
	}

	/** Campos generales del propio panel + los que registren los módulos. */
	public static function fields() {
		$base = array(
			'seguridad'   => array(
				array(
					'key'     => 'sec_on',
					'label'   => __( 'Protección activada', 'kuboplay-shield' ),
					'desc'    => __( 'Interruptor general. Si lo apagas, la web deja de filtrar visitas raras y de blindar el acceso. Déjalo encendido salvo que estés probando algo.', 'kuboplay-shield' ),
					'type'    => 'switch',
					'default' => 1,
				),
			),
			'rendimiento' => array(
				array(
					'key'     => 'perf_on',
					'label'   => __( 'Mejoras de velocidad activadas', 'kuboplay-shield' ),
					'desc'    => __( 'Interruptor general. Si lo apagas, la web se sirve tal cual, sin caché ni aligerado. Úsalo si ves algo raro y quieres descartar que sea la caché.', 'kuboplay-shield' ),
					'type'    => 'switch',
					'default' => 1,
				),
			),
		);

		$f = apply_filters( 'kp_shield_fields', $base );
		if ( ! is_array( $f ) ) {
			$f = $base;
		}

		$out = array();
		foreach ( array_keys( self::tabs() ) as $tab ) {
			$out[ $tab ] = array();
			if ( empty( $f[ $tab ] ) || ! is_array( $f[ $tab ] ) ) {
				continue;
			}
			foreach ( $f[ $tab ] as $field ) {
				if ( ! is_array( $field ) || empty( $field['key'] ) ) {
					continue;
				}
				$field['key']   = sanitize_key( $field['key'] );
				$field['type']  = isset( $field['type'] ) && in_array( $field['type'], array( 'switch', 'number', 'text' ), true ) ? $field['type'] : 'text';
				$field['label'] = isset( $field['label'] ) ? (string) $field['label'] : $field['key'];
				$field['desc']  = isset( $field['desc'] ) ? (string) $field['desc'] : '';

				$out[ $tab ][ $field['key'] ] = $field;
			}
		}
		return $out;
	}

	/** Todos los campos de todas las pestañas, indexados por clave. */
	public static function flat() {
		$all = array();
		foreach ( self::fields() as $list ) {
			foreach ( $list as $k => $field ) {
				$all[ $k ] = $field;
			}
		}
		return $all;
	}

	/** Valor actual de un campo (opción guardada, o su valor por defecto). */
	public static function value( $field ) {
		$v = KP_Shield::opt( $field['key'], null );
		if ( null === $v ) {
			$v = isset( $field['default'] ) ? $field['default'] : ( 'switch' === $field['type'] ? 0 : '' );
		}
		return $v;
	}

	/** Saneado por tipo. */
	public static function sanitize( $field, $raw ) {
		switch ( $field['type'] ) {
			case 'switch':
				return $raw ? 1 : 0;
			case 'number':
				$n = (int) $raw;
				if ( isset( $field['min'] ) ) {
					$n = max( (int) $field['min'], $n );
				}
				if ( isset( $field['max'] ) ) {
					$n = min( (int) $field['max'], $n );
				}
				return $n;
			default:
				return sanitize_text_field( (string) $raw );
		}
	}

	/* ── Estado ──────────────────────────────────────────────────────────── */

	/** Peticiones bloqueadas: hoy y en los últimos 7 días. */
	public static function stats() {
		$raw   = (array) get_option( 'kp_shield_stats', array() );
		$hoy   = 0;
		$siete = 0;
		$desde = gmdate( 'Y-m-d', time() - 6 * DAY_IN_SECONDS );
		$key   = gmdate( 'Y-m-d' );
		foreach ( $raw as $dia => $motivos ) {
			$n = 0;
			foreach ( (array) $motivos as $c ) {
				$n += (int) $c;
			}
			if ( (string) $dia === $key ) {
				$hoy = $n;
			}
			if ( (string) $dia >= $desde ) {
				$siete += $n;
			}
		}
		return array( 'hoy' => $hoy, 'siete' => $siete );
	}

	/** Avisos de la tarjeta de estado (ficheros no escribibles, módulos que faltan…). */
	public static function notices() {
		$n = array();

		$ht = ABSPATH . '.htaccess';
		if ( ( file_exists( $ht ) && ! is_writable( $ht ) ) || ( ! file_exists( $ht ) && ! is_writable( ABSPATH ) ) ) {
			$n[] = array(
				'type' => 'warn',
				'text' => __( 'No se puede escribir el fichero .htaccess. Algunas mejoras de velocidad (caché del navegador, compresión) no se pueden aplicar solas. No es grave: el resto funciona igual.', 'kuboplay-shield' ),
			);
		}

		$wc = ABSPATH . 'wp-config.php';
		if ( file_exists( $wc ) && is_writable( $wc ) ) {
			$n[] = array(
				'type' => 'warn',
				'text' => __( 'El fichero wp-config.php se puede modificar desde la web. Conviene que tu hosting lo deje en solo lectura.', 'kuboplay-shield' ),
			);
		}

		if ( ! KP_Shield::opt( 'sec_on' ) ) {
			$n[] = array( 'type' => 'warn', 'text' => __( 'La protección está apagada ahora mismo.', 'kuboplay-shield' ) );
		}
		if ( ! KP_Shield::opt( 'perf_on' ) ) {
			$n[] = array( 'type' => 'info', 'text' => __( 'Las mejoras de velocidad están apagadas ahora mismo.', 'kuboplay-shield' ) );
		}

		if ( count( self::flat() ) <= 2 ) {
			$n[] = array(
				'type' => 'info',
				'text' => __( 'Todavía no hay módulos instalados: solo se ven los dos interruptores generales. En cuanto estén, sus opciones aparecerán aquí solas.', 'kuboplay-shield' ),
			);
		}

		$extra = apply_filters( 'kp_shield_notices', array() );
		if ( is_array( $extra ) ) {
			foreach ( $extra as $e ) {
				if ( is_array( $e ) && ! empty( $e['text'] ) ) {
					$n[] = array(
						'type' => isset( $e['type'] ) ? (string) $e['type'] : 'info',
						'text' => (string) $e['text'],
					);
				}
			}
		}
		return $n;
	}

	/* ── Menú ────────────────────────────────────────────────────────────── */

	public static function menu() {
		$hook = add_menu_page(
			__( 'Kuboplay Shield', 'kuboplay-shield' ),
			__( 'Kuboplay Shield', 'kuboplay-shield' ),
			'manage_options',
			self::PAGE,
			array( __CLASS__, 'render' ),
			'dashicons-shield',
			72
		);
		add_action( 'load-' . $hook, array( __CLASS__, 'handle' ) );
	}

	public static function assets( $hook ) {
		if ( 'toplevel_page_' . self::PAGE !== $hook ) {
			return;
		}
		if ( is_readable( KP_Shield::dir() . 'assets/admin.css' ) ) {
			wp_enqueue_style( 'kp-shield-admin', KP_Shield::url() . 'assets/admin.css', array(), KP_Shield::VERSION );
		}
	}

	/* ── Guardado ────────────────────────────────────────────────────────── */

	public static function handle() {
		if ( empty( $_POST['kp_shield_action'] ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'No tienes permiso para cambiar estos ajustes.', 'kuboplay-shield' ) );
		}
		check_admin_referer( 'kp_shield_save' );

		$accion = sanitize_key( wp_unslash( $_POST['kp_shield_action'] ) );
		$tab    = isset( $_POST['tab'] ) ? sanitize_key( wp_unslash( $_POST['tab'] ) ) : 'seguridad';
		if ( ! array_key_exists( $tab, self::tabs() ) ) {
			$tab = 'seguridad';
		}
		$args = array( 'page' => self::PAGE, 'tab' => $tab );

		if ( 'purge' === $accion ) {
			do_action( 'kp_shield_purge' );
			$args['kp'] = 'purge';
			wp_safe_redirect( add_query_arg( $args, admin_url( 'admin.php' ) ) );
			exit;
		}

		if ( 'reset' === $accion ) {
			delete_option( KP_Shield::OPT );
			add_option( KP_Shield::OPT, KP_Shield::defaults() );
			do_action( 'kp_shield_purge' );
			$args['kp'] = 'reset';
			wp_safe_redirect( add_query_arg( $args, admin_url( 'admin.php' ) ) );
			exit;
		}

		// Guardar: solo se tocan los campos de la pestaña enviada.
		$fields = self::fields();
		$lista  = isset( $fields[ $tab ] ) ? $fields[ $tab ] : array();
		$opts   = KP_Shield::opts();
		$bloq   = 0;
		$post   = wp_unslash( $_POST ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput

		foreach ( $lista as $key => $field ) {
			$raw = isset( $post['kp'][ $key ] ) ? $post['kp'][ $key ] : ( 'switch' === $field['type'] ? 0 : '' );
			$new = self::sanitize( $field, $raw );
			$old = self::value( $field );

			// Ajuste delicado (por ejemplo, la URL de acceso): sin confirmar, no se cambia.
			if ( ! empty( $field['confirm'] ) && (string) $new !== (string) $old && empty( $post['kp_confirm'][ $key ] ) ) {
				$bloq++;
				continue;
			}
			$opts[ $key ] = $new;
		}

		KP_Shield::save( $opts );
		do_action( 'kp_shield_saved', $opts );

		$args['kp'] = $bloq ? 'noconfirm' : 'saved';
		wp_safe_redirect( add_query_arg( $args, admin_url( 'admin.php' ) ) );
		exit;
	}

	/* ── Pintado ─────────────────────────────────────────────────────────── */

	public static function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$tabs = self::tabs();
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$tab   = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'seguridad';
		$aviso = isset( $_GET['kp'] ) ? sanitize_key( wp_unslash( $_GET['kp'] ) ) : '';
		// phpcs:enable
		if ( ! array_key_exists( $tab, $tabs ) ) {
			$tab = 'seguridad';
		}
		$fields = self::fields();
		$lista  = isset( $fields[ $tab ] ) ? $fields[ $tab ] : array();
		$base   = admin_url( 'admin.php?page=' . self::PAGE );

		$msg = array(
			'saved'     => array( 'updated', __( 'Guardado.', 'kuboplay-shield' ) ),
			'reset'     => array( 'updated', __( 'Listo: todo ha vuelto a los valores de fábrica.', 'kuboplay-shield' ) ),
			'purge'     => array( 'updated', __( 'Caché vaciada. Si veías algo raro en la web, recárgala ahora.', 'kuboplay-shield' ) ),
			'noconfirm' => array( 'notice-warning', __( 'Guardado, pero un ajuste delicado se ha quedado como estaba: para cambiarlo hay que marcar antes su casilla de confirmación.', 'kuboplay-shield' ) ),
		);
		?>
		<div class="wrap kps-wrap">
			<h1 class="kps-title"><span class="dashicons dashicons-shield" aria-hidden="true"></span> <?php esc_html_e( 'Kuboplay Shield', 'kuboplay-shield' ); ?></h1>

			<?php if ( isset( $msg[ $aviso ] ) ) : ?>
				<div class="notice <?php echo esc_attr( $msg[ $aviso ][0] ); ?> is-dismissible"><p><?php echo esc_html( $msg[ $aviso ][1] ); ?></p></div>
			<?php endif; ?>

			<?php self::estado(); ?>

			<h2 class="nav-tab-wrapper kps-tabs">
				<?php foreach ( $tabs as $k => $label ) : ?>
					<a class="nav-tab <?php echo $k === $tab ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url( add_query_arg( 'tab', $k, $base ) ); ?>"><?php echo esc_html( $label ); ?></a>
				<?php endforeach; ?>
			</h2>

			<?php if ( 'seguridad' === $tab ) : ?>
				<div class="kps-note">
					<strong><?php esc_html_e( 'Léelo una vez:', 'kuboplay-shield' ); ?></strong>
					<?php esc_html_e( 'este plugin frena robots, visitas pesadas y los intentos de adivinar tu contraseña. Lo que NO puede hacer es parar un ataque grande de verdad (un DDoS): cuando eso pasa, el golpe llega al servidor antes que WordPress. Para eso hace falta Cloudflare delante de la web, que es gratis y se hace en 15 minutos.', 'kuboplay-shield' ); ?>
					<em><?php esc_html_e( 'Tienes los pasos en la guía del proyecto, docs/SEGURIDAD.md, apartado 1: «Poner Cloudflare gratis delante de kuboplay.online».', 'kuboplay-shield' ); ?></em>
				</div>
			<?php endif; ?>

			<form method="post" action="<?php echo esc_url( add_query_arg( 'tab', $tab, $base ) ); ?>" class="kps-form">
				<?php wp_nonce_field( 'kp_shield_save' ); ?>
				<input type="hidden" name="tab" value="<?php echo esc_attr( $tab ); ?>">

				<?php if ( ! $lista ) : ?>
					<p class="kps-empty"><?php esc_html_e( 'Todavía no hay ajustes en esta pestaña.', 'kuboplay-shield' ); ?></p>
				<?php else : ?>
					<div class="kps-fields">
						<?php foreach ( $lista as $field ) { self::field( $field ); } ?>
					</div>
				<?php endif; ?>

				<p class="kps-actions">
					<button type="submit" name="kp_shield_action" value="save" class="button button-primary button-hero"><?php esc_html_e( 'Guardar cambios', 'kuboplay-shield' ); ?></button>
					<button type="submit" name="kp_shield_action" value="purge" class="button"><?php esc_html_e( 'Vaciar caché', 'kuboplay-shield' ); ?></button>
					<button type="submit" name="kp_shield_action" value="reset" class="button kps-reset" onclick="return confirm('<?php echo esc_js( __( '¿Seguro? Se vuelve a dejar todo como venía de fábrica.', 'kuboplay-shield' ) ); ?>');"><?php esc_html_e( 'Restablecer valores por defecto', 'kuboplay-shield' ); ?></button>
				</p>
			</form>

			<p class="kps-foot"><?php echo esc_html( sprintf( /* translators: %s: versión del plugin. */ __( 'Kuboplay Shield %s · Guía completa para ti: docs/SEGURIDAD.md', 'kuboplay-shield' ), KP_Shield::VERSION ) ); ?></p>
		</div>
		<?php
	}

	/** Tarjeta de estado. */
	public static function estado() {
		$s     = self::stats();
		$sec   = (bool) KP_Shield::opt( 'sec_on' );
		$perf  = (bool) KP_Shield::opt( 'perf_on' );
		$notas = self::notices();

		$cajas = array(
			array(
				'label' => __( 'Protección', 'kuboplay-shield' ),
				'value' => $sec ? __( 'Protegiendo', 'kuboplay-shield' ) : __( 'Apagada', 'kuboplay-shield' ),
				'ok'    => $sec,
			),
			array(
				'label' => __( 'Caché de páginas', 'kuboplay-shield' ),
				'value' => $perf ? __( 'Activada', 'kuboplay-shield' ) : __( 'Apagada', 'kuboplay-shield' ),
				'ok'    => $perf,
			),
			array(
				'label' => __( 'Visitas bloqueadas hoy', 'kuboplay-shield' ),
				'value' => number_format_i18n( $s['hoy'] ),
				'ok'    => true,
			),
			array(
				'label' => __( 'En los últimos 7 días', 'kuboplay-shield' ),
				'value' => number_format_i18n( $s['siete'] ),
				'ok'    => true,
			),
		);

		$extra = apply_filters( 'kp_shield_status', array() );
		if ( is_array( $extra ) ) {
			foreach ( $extra as $e ) {
				if ( is_array( $e ) && isset( $e['label'], $e['value'] ) ) {
					$cajas[] = array(
						'label' => (string) $e['label'],
						'value' => (string) $e['value'],
						'ok'    => ! empty( $e['ok'] ),
					);
				}
			}
		}
		?>
		<div class="kps-card">
			<h2><?php esc_html_e( 'Estado', 'kuboplay-shield' ); ?></h2>
			<div class="kps-grid">
				<?php foreach ( $cajas as $c ) : ?>
					<div class="kps-box <?php echo $c['ok'] ? 'is-ok' : 'is-off'; ?>">
						<span class="kps-box-v"><?php echo esc_html( $c['value'] ); ?></span>
						<span class="kps-box-l"><?php echo esc_html( $c['label'] ); ?></span>
					</div>
				<?php endforeach; ?>
			</div>
			<?php foreach ( $notas as $n ) : ?>
				<p class="kps-notice kps-<?php echo esc_attr( in_array( $n['type'], array( 'warn', 'ok' ), true ) ? $n['type'] : 'info' ); ?>"><?php echo esc_html( $n['text'] ); ?></p>
			<?php endforeach; ?>
		</div>
		<?php
	}

	/** Un campo. */
	public static function field( $field ) {
		$key  = $field['key'];
		$val  = self::value( $field );
		$id   = 'kp-' . $key;
		$name = 'kp[' . $key . ']';
		?>
		<div class="kps-field kps-t-<?php echo esc_attr( $field['type'] ); ?>">
			<?php if ( 'switch' === $field['type'] ) : ?>
				<label class="kps-sw" for="<?php echo esc_attr( $id ); ?>">
					<input type="checkbox" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $name ); ?>" value="1" <?php checked( (int) $val, 1 ); ?>>
					<span class="kps-sw-track" aria-hidden="true"><span class="kps-sw-dot"></span></span>
					<span class="kps-sw-label"><?php echo esc_html( $field['label'] ); ?></span>
				</label>
			<?php else : ?>
				<label class="kps-lab" for="<?php echo esc_attr( $id ); ?>"><?php echo esc_html( $field['label'] ); ?></label>
				<span class="kps-input">
					<input
						type="<?php echo 'number' === $field['type'] ? 'number' : 'text'; ?>"
						id="<?php echo esc_attr( $id ); ?>"
						name="<?php echo esc_attr( $name ); ?>"
						value="<?php echo esc_attr( (string) $val ); ?>"
						<?php echo isset( $field['min'] ) ? ' min="' . esc_attr( (string) $field['min'] ) . '"' : ''; ?>
						<?php echo isset( $field['max'] ) ? ' max="' . esc_attr( (string) $field['max'] ) . '"' : ''; ?>
						<?php echo isset( $field['placeholder'] ) ? ' placeholder="' . esc_attr( (string) $field['placeholder'] ) . '"' : ''; ?>
						class="<?php echo 'number' === $field['type'] ? 'small-text' : 'regular-text'; ?>">
					<?php if ( ! empty( $field['suffix'] ) ) : ?>
						<span class="kps-suffix"><?php echo esc_html( $field['suffix'] ); ?></span>
					<?php endif; ?>
				</span>
			<?php endif; ?>

			<?php if ( '' !== $field['desc'] ) : ?>
				<p class="kps-desc"><?php echo esc_html( $field['desc'] ); ?></p>
			<?php endif; ?>

			<?php if ( ! empty( $field['preview'] ) && 'url' === $field['preview'] && '' !== (string) $val ) : ?>
				<p class="kps-prev">
					<?php esc_html_e( 'A partir de ahora entrarías por esta dirección (apúntala antes de guardar):', 'kuboplay-shield' ); ?><br>
					<code><?php echo esc_html( home_url( '/' . ltrim( (string) $val, '/' ) . '/' ) ); ?></code>
				</p>
			<?php endif; ?>

			<?php if ( ! empty( $field['warn'] ) ) : ?>
				<p class="kps-notice kps-warn"><?php echo esc_html( $field['warn'] ); ?></p>
			<?php endif; ?>

			<?php if ( ! empty( $field['confirm'] ) ) : ?>
				<label class="kps-confirm">
					<input type="checkbox" name="kp_confirm[<?php echo esc_attr( $key ); ?>]" value="1">
					<span><?php echo esc_html( $field['confirm'] ); ?></span>
				</label>
			<?php endif; ?>
		</div>
		<?php
	}
}

add_action( 'admin_menu', array( 'KP_Shield_Admin', 'menu' ) );
add_action( 'admin_enqueue_scripts', array( 'KP_Shield_Admin', 'assets' ) );

// Enlace «Ajustes» en la lista de plugins.
add_filter(
	'plugin_action_links_kuboplay-shield/kuboplay-shield.php',
	function ( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'admin.php?page=' . KP_Shield_Admin::PAGE ) ) . '">' . esc_html__( 'Ajustes', 'kuboplay-shield' ) . '</a>' );
		return $links;
	}
);
