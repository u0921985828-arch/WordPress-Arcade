<?php
/**
 * Panel de ajustes de Kuboplay Shield.
 *
 * Menú propio en el escritorio con pestañas, tarjeta de estado con semáforo,
 * gráfica de 30 días y los ajustes en dos niveles (los normales a la vista y
 * los avanzados dentro de un desplegable).
 *
 * Los interruptores NO están escritos a mano: cada módulo registra los suyos
 * con los filtros de abajo, así que el panel funciona aunque falten
 * includes/security.php e includes/perf.php (entonces solo se ven `sec_on` y
 * `perf_on`).
 *
 * Este fichero es el controlador (menú, guardado, herramientas). El pintado
 * está en admin/ui.php y las cifras en admin/status.php.
 *
 * ── Contrato para los módulos ────────────────────────────────────────────────
 *
 * 1) Pestañas nuevas (las fijas son 'seguridad' y 'rendimiento'):
 *
 *   add_filter( 'kp_shield_tabs', function ( $t ) {
 *       $t['vigilancia'] = 'Vigilancia';
 *       return $t;
 *   } );
 *
 * 2) Campos, con la pestaña como clave (admite las pestañas nuevas):
 *
 *   add_filter( 'kp_shield_fields', function ( $f ) {
 *       $f['seguridad'][] = array(
 *           'key'         => 'sec_login_slug',   // clave dentro de la opción kp_shield
 *           'label'       => 'Dirección de acceso',
 *           'desc'        => 'Texto de ayuda en lenguaje llano.',
 *           'type'        => 'switch',           // switch | number | text
 *           'default'     => 1,
 *           'min'         => 1,                  // solo number (opcional)
 *           'max'         => 999,                // solo number (opcional)
 *           'placeholder' => 'acceso',           // solo text/number (opcional)
 *           // Extras opcionales:
 *           'suffix'      => 'por minuto',       // unidad que se pinta tras el campo
 *           'impact'      => 'Si lo apagas, …',  // consecuencia concreta del cambio
 *           'adv'         => true,               // va dentro de «Ver todos los ajustes»
 *           'confirm'     => 'Entiendo que …',   // exige marcar una casilla para cambiarlo
 *           'preview'     => 'url',              // enseña home_url()/valor bajo el campo
 *           'warn'        => 'Aviso destacado',  // recuadro amarillo junto al campo
 *       );
 *       return $f;
 *   } );
 *
 *   Los campos sin 'adv' se ven siempre. Si una pestaña trae más de 10 campos y
 *   ninguno dice si es avanzado, el panel deja los 8 primeros a la vista y
 *   pliega el resto, para no abrumar.
 *
 * 3) Bloques que no son campos (registro de sucesos, resultados de un análisis…):
 *
 *   add_filter( 'kp_shield_panels', function ( $p ) {
 *       $p[] = array( 'tab' => 'vigilancia', 'title' => 'Últimos sucesos',
 *                     'html' => $html_ya_escapado, 'order' => 10 );
 *       return $p;
 *   } );
 *
 *   El HTML llega ya escapado por quien lo registra; el panel lo pinta tal cual
 *   y ordena los bloques por 'order'. Van dentro de una zona con altura máxima,
 *   y admin.js pagina de 14 en 14 las tablas largas que haya dentro.
 *
 * 4) Botones de herramienta:
 *
 *   add_filter( 'kp_shield_tools', function ( $t ) {
 *       $t[] = array( 'key' => 'scan', 'label' => 'Analizar ahora',
 *                     'tab' => 'vigilancia', 'confirm' => '¿Seguro?' );
 *       return $t;
 *   } );
 *
 *   Al pulsarlo: manage_options + nonce + do_action( 'kp_shield_tool_scan' ) y
 *   vuelta a la pestaña con un aviso.
 *
 * Otros enganches que siguen valiendo:
 *   - `kp_shield_purge`   (acción) la dispara el botón «Vaciar caché».
 *   - `kp_shield_saved`   (acción) tras guardar, recibe el array de opciones.
 *   - `kp_shield_notices` (filtro) array de array('type'=>'warn|ok|info|error','text'=>'…')
 *                         para añadir avisos a la tarjeta de estado. Un aviso de
 *                         tipo 'error' pone el semáforo en grave; 'warn', en atención.
 *   - `kp_shield_status`  (filtro) array de array('label'=>'…','value'=>'…','ok'=>bool)
 *                         para añadir datos a la tarjeta de estado.
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

// Ojo: aquí no se puede comprobar class_exists( 'KP_Shield_Admin' ), porque PHP
// enlaza las clases de nivel superior al compilar el fichero y siempre daría true.
if ( ! class_exists( 'KP_Shield' ) || defined( 'KP_SHIELD_ADMIN' ) ) {
	return;
}
define( 'KP_SHIELD_ADMIN', true );

require_once KP_Shield::dir() . 'admin/status.php';
require_once KP_Shield::dir() . 'admin/ui.php';

final class KP_Shield_Admin {

	const PAGE = 'kuboplay-shield';

	/** Pestañas fijas del panel. */
	public static function base_tabs() {
		return array(
			'seguridad'   => __( 'Seguridad', 'kuboplay-shield' ),
			'rendimiento' => __( 'Rendimiento', 'kuboplay-shield' ),
		);
	}

	/** Pestañas del panel: las dos fijas más las que registren los módulos. */
	public static function tabs() {
		$base = self::base_tabs();
		$t    = apply_filters( 'kp_shield_tabs', $base );
		if ( ! is_array( $t ) ) {
			$t = $base;
		}

		$out = array();
		foreach ( $t as $k => $label ) {
			$k = sanitize_key( $k );
			if ( '' === $k || ! is_string( $label ) || '' === trim( $label ) ) {
				continue;
			}
			$out[ $k ] = trim( $label );
		}
		// Las dos fijas no se pueden quitar ni renombrar a la nada.
		foreach ( $base as $k => $label ) {
			if ( empty( $out[ $k ] ) ) {
				$out[ $k ] = $label;
			}
		}
		// Seguridad y Rendimiento siempre primero, en ese orden.
		$orden = array();
		foreach ( array_keys( $base ) as $k ) {
			$orden[ $k ] = $out[ $k ];
			unset( $out[ $k ] );
		}
		return $orden + $out;
	}

	/** Campos generales del propio panel + los que registren los módulos. */
	public static function fields() {
		$base = array(
			'seguridad'   => array(
				array(
					'key'     => 'sec_on',
					'label'   => __( 'Protección activada', 'kuboplay-shield' ),
					'desc'    => __( 'Interruptor general. Déjalo encendido salvo que estés probando algo.', 'kuboplay-shield' ),
					'impact'  => __( 'Apagado, la web deja de filtrar visitas raras y de blindar el acceso: cualquiera puede probar contraseñas sin límite.', 'kuboplay-shield' ),
					'type'    => 'switch',
					'default' => 1,
				),
			),
			'rendimiento' => array(
				array(
					'key'     => 'perf_on',
					'label'   => __( 'Mejoras de velocidad activadas', 'kuboplay-shield' ),
					'desc'    => __( 'Interruptor general. Úsalo si ves algo raro y quieres descartar que sea la caché.', 'kuboplay-shield' ),
					'impact'  => __( 'Apagado, la web se sirve tal cual, sin caché ni aligerado: vuelve a tardar lo de antes (de menos de 1 ms a unos 34 ms por página).', 'kuboplay-shield' ),
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
			$marcados = false;
			foreach ( $f[ $tab ] as $field ) {
				if ( ! is_array( $field ) || empty( $field['key'] ) ) {
					continue;
				}
				$field['key']   = sanitize_key( $field['key'] );
				$field['type']  = isset( $field['type'] ) && in_array( $field['type'], array( 'switch', 'number', 'text' ), true ) ? $field['type'] : 'text';
				$field['label'] = isset( $field['label'] ) ? (string) $field['label'] : $field['key'];
				$field['desc']  = isset( $field['desc'] ) ? (string) $field['desc'] : '';
				$field['adv']   = ! empty( $field['adv'] );
				if ( $field['adv'] ) {
					$marcados = true;
				}

				$out[ $tab ][ $field['key'] ] = $field;
			}

			// Pestaña larga en la que nadie ha dicho qué es avanzado: se dejan
			// los 8 primeros a la vista y se pliega el resto.
			if ( ! $marcados && count( $out[ $tab ] ) > 10 ) {
				$i = 0;
				foreach ( $out[ $tab ] as $k => $field ) {
					if ( $i >= 8 ) {
						$out[ $tab ][ $k ]['adv'] = true;
					}
					$i++;
				}
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

	/** Bloques registrados con `kp_shield_panels`, saneados y ordenados. */
	public static function panels( $tab = '' ) {
		$p = apply_filters( 'kp_shield_panels', array() );
		if ( ! is_array( $p ) ) {
			return array();
		}
		$tabs = self::tabs();
		$out  = array();
		$i    = 0;
		foreach ( $p as $item ) {
			if ( ! is_array( $item ) || ! isset( $item['html'] ) ) {
				continue;
			}
			$t = isset( $item['tab'] ) ? sanitize_key( $item['tab'] ) : 'seguridad';
			if ( ! array_key_exists( $t, $tabs ) ) {
				continue;
			}
			if ( '' !== $tab && $t !== $tab ) {
				continue;
			}
			$out[] = array(
				'tab'   => $t,
				'title' => isset( $item['title'] ) ? (string) $item['title'] : '',
				'html'  => (string) $item['html'],
				'order' => isset( $item['order'] ) ? (int) $item['order'] : 50,
				'i'     => $i++,
			);
		}
		usort(
			$out,
			function ( $a, $b ) {
				if ( $a['order'] === $b['order'] ) {
					return $a['i'] - $b['i'];
				}
				return $a['order'] < $b['order'] ? -1 : 1;
			}
		);
		return $out;
	}

	/** Herramientas registradas con `kp_shield_tools`, saneadas. */
	public static function tools( $tab = '' ) {
		$t = apply_filters( 'kp_shield_tools', array() );
		if ( ! is_array( $t ) ) {
			return array();
		}
		$tabs = self::tabs();
		$out  = array();
		foreach ( $t as $item ) {
			if ( ! is_array( $item ) || empty( $item['key'] ) ) {
				continue;
			}
			$key = sanitize_key( $item['key'] );
			if ( '' === $key ) {
				continue;
			}
			$en = isset( $item['tab'] ) ? sanitize_key( $item['tab'] ) : 'seguridad';
			if ( ! array_key_exists( $en, $tabs ) ) {
				continue;
			}
			if ( '' !== $tab && $en !== $tab ) {
				continue;
			}
			$out[ $key ] = array(
				'key'     => $key,
				'label'   => isset( $item['label'] ) ? (string) $item['label'] : $key,
				'tab'     => $en,
				'confirm' => isset( $item['confirm'] ) ? (string) $item['confirm'] : '',
			);
		}
		return $out;
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

	/** Cifras de bloqueos. Se mantiene por compatibilidad con la versión 1.0. */
	public static function stats() {
		$d = KP_Shield_Status::datos();
		return array(
			'hoy'     => $d['hoy'],
			'siete'   => $d['siete'],
			'treinta' => $d['treinta'],
		);
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
		if ( is_readable( KP_Shield::dir() . 'assets/admin.js' ) ) {
			wp_enqueue_script( 'kp-shield-admin', KP_Shield::url() . 'assets/admin.js', array(), KP_Shield::VERSION, true );
			wp_add_inline_script(
				'kp-shield-admin',
				'window.KPShieldChart = ' . wp_json_encode( KP_Shield_Status::chart_data() ) . ';',
				'before'
			);
		}
	}

	/* ── Guardado y herramientas ─────────────────────────────────────────── */

	public static function handle() {
		if ( empty( $_POST['kp_shield_action'] ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'No tienes permiso para cambiar estos ajustes.', 'kuboplay-shield' ) );
		}
		check_admin_referer( 'kp_shield_save' );

		$tabs   = self::tabs();
		$accion = sanitize_key( wp_unslash( $_POST['kp_shield_action'] ) );
		$tab    = isset( $_POST['tab'] ) ? sanitize_key( wp_unslash( $_POST['tab'] ) ) : 'seguridad';
		if ( ! array_key_exists( $tab, $tabs ) ) {
			$tab = 'seguridad';
		}
		$args = array( 'page' => self::PAGE, 'tab' => $tab );
		if ( ! empty( $_POST['ver'] ) && 'todo' === sanitize_key( wp_unslash( $_POST['ver'] ) ) ) {
			$args['ver'] = 'todo';
		}

		if ( 'purge' === $accion ) {
			do_action( 'kp_shield_purge' );
			$args['kp'] = 'purge';
			self::back( $args );
		}

		if ( 'reset' === $accion ) {
			delete_option( KP_Shield::OPT );
			add_option( KP_Shield::OPT, KP_Shield::defaults() );
			do_action( 'kp_shield_purge' );
			$args['kp'] = 'reset';
			self::back( $args );
		}

		if ( 'tool' === $accion ) {
			$key   = isset( $_POST['kp_tool'] ) ? sanitize_key( wp_unslash( $_POST['kp_tool'] ) ) : '';
			$tools = self::tools();
			if ( '' === $key || ! isset( $tools[ $key ] ) ) {
				$args['kp'] = 'notool';
				self::back( $args );
			}
			do_action( 'kp_shield_tool_' . $key );
			$args['kp']   = 'tool';
			$args['tool'] = $key;
			self::back( $args );
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
		self::back( $args );
	}

	/** Vuelta al panel tras una acción. */
	private static function back( $args ) {
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
		$cual  = isset( $_GET['tool'] ) ? sanitize_key( wp_unslash( $_GET['tool'] ) ) : '';
		// phpcs:enable
		if ( ! array_key_exists( $tab, $tabs ) ) {
			$tab = 'seguridad';
		}
		$fields = self::fields();
		$lista  = isset( $fields[ $tab ] ) ? $fields[ $tab ] : array();
		$panels = self::panels( $tab );
		$tools  = self::tools( $tab );
		$notas  = self::notices();
		$base   = admin_url( 'admin.php?page=' . self::PAGE );
		$abrir  = KP_Shield_UI::more_open();

		$msg = array(
			'saved'     => array( 'updated', __( 'Guardado.', 'kuboplay-shield' ) ),
			'reset'     => array( 'updated', __( 'Listo: todo ha vuelto a los valores de fábrica.', 'kuboplay-shield' ) ),
			'purge'     => array( 'updated', __( 'Caché vaciada. Si veías algo raro en la web, recárgala ahora.', 'kuboplay-shield' ) ),
			'noconfirm' => array( 'notice-warning', __( 'Guardado, pero un ajuste delicado se ha quedado como estaba: para cambiarlo hay que marcar antes su casilla de confirmación.', 'kuboplay-shield' ) ),
			'notool'    => array( 'notice-error', __( 'Esa herramienta ya no existe.', 'kuboplay-shield' ) ),
		);
		if ( 'tool' === $aviso ) {
			$todas   = self::tools();
			$rotulo  = isset( $todas[ $cual ] ) ? $todas[ $cual ]['label'] : $cual;
			$msg['tool'] = array(
				'updated',
				/* translators: %s: nombre de la herramienta. */
				sprintf( __( 'Hecho: %s.', 'kuboplay-shield' ), $rotulo ),
			);
		}
		?>
		<div class="wrap kps-wrap">
			<?php KP_Shield_UI::head(); ?>

			<?php if ( isset( $msg[ $aviso ] ) ) : ?>
				<div class="notice <?php echo esc_attr( $msg[ $aviso ][0] ); ?> is-dismissible"><p><?php echo esc_html( $msg[ $aviso ][1] ); ?></p></div>
			<?php endif; ?>

			<?php KP_Shield_UI::estado( $notas ); ?>

			<nav class="kps-tabs" aria-label="<?php esc_attr_e( 'Secciones del panel', 'kuboplay-shield' ); ?>">
				<?php
				foreach ( $tabs as $k => $label ) :
					$url = add_query_arg( 'tab', $k, $base );
					if ( $abrir ) {
						$url = add_query_arg( 'ver', 'todo', $url );
					}
					?>
					<a class="kps-tab <?php echo $k === $tab ? 'is-on' : ''; ?>"
						<?php echo $k === $tab ? ' aria-current="page"' : ''; ?>
						href="<?php echo esc_url( $url ); ?>"><?php echo esc_html( $label ); ?></a>
				<?php endforeach; ?>
			</nav>

			<?php if ( 'rendimiento' !== $tab ) : ?>
				<?php KP_Shield_UI::grafica(); ?>
			<?php endif; ?>

			<?php if ( 'seguridad' === $tab ) : ?>
				<?php KP_Shield_UI::nota_ddos(); ?>
			<?php endif; ?>

			<?php KP_Shield_UI::tools( $tools, $tab, $base ); ?>

			<form method="post" action="<?php echo esc_url( add_query_arg( 'tab', $tab, $base ) ); ?>" class="kps-form">
				<?php wp_nonce_field( 'kp_shield_save' ); ?>
				<input type="hidden" name="tab" value="<?php echo esc_attr( $tab ); ?>">
				<input type="hidden" name="ver" value="<?php echo esc_attr( $abrir ? 'todo' : '' ); ?>" data-kps-ver>

				<?php if ( ! $lista ) : ?>
					<?php if ( ! $panels ) : ?>
						<p class="kps-empty"><?php esc_html_e( 'Todavía no hay ajustes en esta pestaña.', 'kuboplay-shield' ); ?></p>
					<?php endif; ?>
				<?php else : ?>
					<?php KP_Shield_UI::fields_block( $lista ); ?>

					<div class="kps-actions">
						<button type="submit" name="kp_shield_action" value="save" class="kps-btn kps-btn-main"><?php esc_html_e( 'Guardar cambios', 'kuboplay-shield' ); ?></button>
						<button type="submit" name="kp_shield_action" value="purge" class="kps-btn"><?php esc_html_e( 'Vaciar caché', 'kuboplay-shield' ); ?></button>
						<button type="submit" name="kp_shield_action" value="reset" class="kps-btn kps-btn-danger" onclick="return confirm('<?php echo esc_js( __( '¿Seguro? Se vuelve a dejar todo como venía de fábrica.', 'kuboplay-shield' ) ); ?>');"><?php esc_html_e( 'Restablecer valores por defecto', 'kuboplay-shield' ); ?></button>
					</div>
				<?php endif; ?>
			</form>

			<?php KP_Shield_UI::panels( $panels ); ?>

			<p class="kps-foot">
				<?php
				printf(
					/* translators: 1: versión del plugin, 2: enlace a la guía. */
					esc_html__( 'Kuboplay Shield %1$s · Guía completa para ti: %2$s', 'kuboplay-shield' ),
					esc_html( KP_Shield::VERSION ),
					wp_kses( KP_Shield_UI::doc_link(), array( 'a' => array( 'href' => array(), 'rel' => array() ), 'code' => array() ) )
				);
				?>
			</p>
		</div>
		<?php
	}

	/** Se mantiene por compatibilidad: el pintado está en KP_Shield_UI. */
	public static function estado() {
		KP_Shield_UI::estado( self::notices() );
	}

	/** Se mantiene por compatibilidad: el pintado está en KP_Shield_UI. */
	public static function field( $field ) {
		KP_Shield_UI::field( $field );
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
