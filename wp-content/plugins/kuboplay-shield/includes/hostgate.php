<?php
/**
 * Kuboplay Shield — puerta del hosting (it-api.php y compañía).
 *
 * El hosting (IONOS) deja en la web un fichero propio, `it-api.php`, que su panel
 * usa para manejar WordPress. Ese fichero ejecuta código dinámico: es legítimo,
 * pero conviene vigilarlo. Este módulo hace dos cosas:
 *
 *   A) Registro: apunta cada llamada a esos ficheros (fecha, IP, método, agente y
 *      si se dejó pasar o se bloqueó). Últimas 80, en la opción kp_shield_hostcalls.
 *   B) Candado: si se activa y hay una lista de IP permitidas, las demás reciben un
 *      403. Se aplica por dos vías, para que valga aunque el fichero no cargue
 *      WordPress: en PHP (si carga) y en el .htaccess de la raíz (siempre).
 *
 * Salvavidas: constante KP_SHIELD_HOSTGATE_OFF en wp-config.php, o borrar el bloque
 * «Kuboplay Shield hostgate» del .htaccess desde el gestor de archivos de IONOS.
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/scan-rules.php';

final class KP_Shield_Hostgate {

	const CALLS  = 'kp_shield_hostcalls';
	const MARKER = 'Kuboplay Shield hostgate';
	const MAX    = 80;

	/** Valores por defecto de este módulo. */
	public static function defaults( $d ) {
		return array_merge(
			$d,
			array(
				'hg_log'   => 1,   // A: registrar las llamadas
				'hg_block' => 0,   // B: bloquear salvo IP permitidas
				'hg_ips'   => '',  // IP o principios de IP, separados por comas
			)
		);
	}

	public static function init() {
		if ( defined( 'KP_SHIELD_HOSTGATE_OFF' ) && KP_SHIELD_HOSTGATE_OFF ) {
			return;
		}

		self::guard();

		if ( ! is_admin() ) {
			return;
		}
		add_filter( 'kp_shield_fields', array( __CLASS__, 'fields' ) );
		add_filter( 'kp_shield_panels', array( __CLASS__, 'panels' ) );
		add_filter( 'kp_shield_tools', array( __CLASS__, 'tools' ) );
		add_action( 'kp_shield_tool_hg_clear', array( __CLASS__, 'tool_clear' ) );
		add_action( 'kp_shield_saved', array( __CLASS__, 'sync_htaccess' ) );
	}

	/* ══════════════════════════════════════════════ Ficheros que se vigilan */

	/**
	 * Nombres de fichero del hosting que hay en la raíz de la web.
	 *
	 * @return array nombre => proveedor
	 */
	public static function targets() {
		$map = function_exists( 'kp_shield_scan_map' ) ? kp_shield_scan_map() : array();
		$out = array();
		foreach ( (array) ( isset( $map['host_files'] ) ? $map['host_files'] : array() ) as $frag => $quien ) {
			if ( '.php' === substr( $frag, -4 ) && false === strpos( $frag, '/' ) ) {
				$out[ $frag ] = $quien;
			}
		}
		if ( ! $out ) {
			$out = array( 'it-api.php' => 'IONOS' );
		}
		return apply_filters( 'kp_shield_hostgate_files', $out );
	}

	/** Fichero del hosting al que apunta la petición actual, o '' si no es una. */
	private static function hit() {
		$s = '';
		foreach ( array( 'SCRIPT_NAME', 'PHP_SELF', 'REQUEST_URI' ) as $k ) {
			if ( ! empty( $_SERVER[ $k ] ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
				$s .= ' ' . strtolower( (string) wp_unslash( $_SERVER[ $k ] ) ); // phpcs:ignore
			}
		}
		$s = (string) strtok( $s, '?' ) . ' ' . $s;
		foreach ( self::targets() as $file => $quien ) {
			if ( false !== strpos( $s, strtolower( $file ) ) ) {
				return $file;
			}
		}
		return '';
	}

	/* ═══════════════════════════════════════════════════ A) Registro y B) 403 */

	private static function guard() {
		$file = self::hit();
		if ( '' === $file ) {
			return;
		}

		$ip      = KP_Shield::ip();
		$permite = self::allowed( $ip );
		$bloquea = KP_Shield::opt( 'hg_block' ) && self::ips() && ! $permite;

		if ( KP_Shield::opt( 'hg_log' ) ) {
			self::record( $file, $ip, $bloquea ? 'bloqueada' : 'pasa' );
		}

		if ( $bloquea ) {
			KP_Shield::log( 'hostgate' );
			status_header( 403 );
			nocache_headers();
			exit( 'Forbidden' );
		}
	}

	/** Lista de IP permitidas, ya limpia. */
	public static function ips() {
		$raw = (string) KP_Shield::opt( 'hg_ips', '' );
		$out = array();
		foreach ( preg_split( '/[\s,;]+/', $raw ) as $x ) {
			$x = trim( $x );
			if ( '' !== $x ) {
				$out[] = $x;
			}
		}
		return $out;
	}

	/** ¿La IP está en la lista? Vale el principio de la IP (p. ej. «82.165.»). */
	public static function allowed( $ip ) {
		foreach ( self::ips() as $p ) {
			if ( $ip === $p || 0 === strpos( $ip, $p ) ) {
				return true;
			}
		}
		return false;
	}

	/** Apunta la llamada (anillo de las últimas MAX). */
	private static function record( $file, $ip, $res ) {
		$l  = (array) get_option( self::CALLS, array() );
		$ua = isset( $_SERVER['HTTP_USER_AGENT'] ) ? substr( sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ), 0, 80 ) : ''; // phpcs:ignore
		$me = isset( $_SERVER['REQUEST_METHOD'] ) ? substr( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ), 0, 8 ) : ''; // phpcs:ignore

		$l[] = array(
			't'  => time(),
			'f'  => $file,
			'ip' => $ip,
			'm'  => $me,
			'ua' => $ua,
			'r'  => $res,
		);
		if ( count( $l ) > self::MAX ) {
			$l = array_slice( $l, -self::MAX );
		}
		update_option( self::CALLS, $l, false );
	}

	/* ═══════════════════════════════════════ B) Candado también en .htaccess */

	/**
	 * Escribe (o quita) el bloque del .htaccess de la raíz. Sin lista de IP no se
	 * escribe nada: así nunca se deja la web con una puerta cerrada por error.
	 */
	public static function sync_htaccess() {
		if ( ! function_exists( 'insert_with_markers' ) ) {
			require_once ABSPATH . 'wp-admin/includes/misc.php';
		}
		if ( ! function_exists( 'get_home_path' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}
		$ht = get_home_path() . '.htaccess';
		if ( ! file_exists( $ht ) && ! is_writable( dirname( $ht ) ) ) {
			return;
		}
		if ( file_exists( $ht ) && ! is_writable( $ht ) ) {
			return;
		}

		$ips = self::ips();
		if ( ! KP_Shield::opt( 'hg_block' ) || ! $ips ) {
			insert_with_markers( $ht, self::MARKER, array() );
			return;
		}

		$lines = array();
		foreach ( array_keys( self::targets() ) as $file ) {
			$lines[] = '<Files "' . $file . '">';
			$lines[] = '  <IfModule mod_authz_core.c>';
			$lines[] = '    Require all denied';
			foreach ( $ips as $ip ) {
				$lines[] = '    Require ip ' . $ip;
			}
			$lines[] = '  </IfModule>';
			$lines[] = '  <IfModule !mod_authz_core.c>';
			$lines[] = '    Order deny,allow';
			$lines[] = '    Deny from all';
			foreach ( $ips as $ip ) {
				$lines[] = '    Allow from ' . $ip;
			}
			$lines[] = '  </IfModule>';
			$lines[] = '</Files>';
		}
		insert_with_markers( $ht, self::MARKER, $lines );
	}

	/* ═════════════════════════════════════════════════════════════ Panel */

	public static function fields( $f ) {
		$f = is_array( $f ) ? $f : array();
		$t = isset( $f['vigilancia'] ) ? $f['vigilancia'] : array();

		$t[] = array(
			'key'     => 'hg_log',
			'label'   => 'Vigilar el fichero del hosting (it-api.php)',
			'desc'    => 'Apunta cada llamada a los ficheros que instala IONOS: fecha, desde qué IP y con qué programa. Se ven aquí abajo.',
			'impact'  => 'Apagado, no sabrás si alguien ha usado esa puerta ni desde dónde.',
			'type'    => 'switch',
			'default' => 1,
		);
		$t[] = array(
			'key'         => 'hg_ips',
			'label'       => 'IP que pueden usarla',
			'desc'        => 'Separadas por comas. Vale el principio de la IP: «82.165.» deja pasar a todas las que empiecen así. Las que ves en el registro de abajo son las que usa IONOS.',
			'type'        => 'text',
			'default'     => '',
			'placeholder' => '82.165., 217.160.',
		);
		$t[] = array(
			'key'     => 'hg_block',
			'label'   => 'Cerrar it-api.php salvo a esas IP',
			'desc'    => 'Rechaza (403) cualquier llamada que no venga de la lista de arriba. Si la lista está vacía no se cierra nada.',
			'impact'  => 'Si IONOS cambia de IP, su panel deja de manejar la web hasta que añadas la nueva. Se abre otra vez apagando esto, o borrando el bloque «Kuboplay Shield hostgate» del .htaccess desde el gestor de archivos de IONOS.',
			'type'    => 'switch',
			'default' => 0,
			'confirm' => 'Entiendo que el panel de IONOS puede dejar de funcionar',
			'warn'    => 'Enciende antes el registro, deja pasar unos días y cierra con las IP que hayas visto.',
		);

		$f['vigilancia'] = $t;
		return $f;
	}

	public static function panels( $p ) {
		$p = is_array( $p ) ? $p : array();
		if ( ! current_user_can( 'manage_options' ) ) {
			return $p;
		}

		$l = array_reverse( (array) get_option( self::CALLS, array() ) );
		if ( ! $l ) {
			$h = '<p>Todavía no se ha llamado a <code>it-api.php</code> desde que encendiste la vigilancia. '
				. 'Es lo normal: el panel de IONOS solo la usa cuando tú haces algo desde su web.</p>';
		} else {
			$vistas = array();
			foreach ( $l as $r ) {
				$vistas[ $r['ip'] ] = isset( $vistas[ $r['ip'] ] ) ? $vistas[ $r['ip'] ] + 1 : 1;
			}
			$h = '<p><strong>IP que han llamado:</strong> ';
			$li = array();
			foreach ( $vistas as $ip => $n ) {
				$li[] = '<code>' . esc_html( $ip ) . '</code> (' . esc_html( number_format_i18n( $n ) ) . ')';
			}
			$h .= implode( ', ', $li ) . '. Si vas a cerrar la puerta, copia estas en el campo de arriba.</p>';

			$h .= '<table class="widefat striped"><thead><tr><th>Cuándo</th><th>Fichero</th><th>IP</th><th>Cómo</th><th>Programa</th></tr></thead><tbody>';
			foreach ( $l as $r ) {
				$h .= '<tr><td>' . esc_html( wp_date( 'j M H:i', (int) $r['t'] ) ) . '</td>'
					. '<td><code>' . esc_html( $r['f'] ) . '</code></td>'
					. '<td><code>' . esc_html( $r['ip'] ) . '</code>' . ( 'bloqueada' === $r['r'] ? ' <strong>· bloqueada</strong>' : '' ) . '</td>'
					. '<td>' . esc_html( $r['m'] ) . '</td>'
					. '<td>' . esc_html( $r['ua'] ) . '</td></tr>';
			}
			$h .= '</tbody></table>';
		}

		if ( KP_Shield::opt( 'hg_block' ) && self::ips() ) {
			$h .= '<p><strong>La puerta está cerrada</strong> salvo para: <code>' . esc_html( implode( ', ', self::ips() ) ) . '</code>.</p>';
		}

		$p[] = array(
			'tab'   => 'vigilancia',
			'title' => 'Puerta del hosting (it-api.php)',
			'html'  => $h,
			'order' => 40,
		);
		return $p;
	}

	public static function tools( $t ) {
		$t   = is_array( $t ) ? $t : array();
		$t[] = array(
			'key'   => 'hg_clear',
			'label' => 'Vaciar el registro de it-api.php',
			'tab'   => 'vigilancia',
		);
		return $t;
	}

	public static function tool_clear() {
		delete_option( self::CALLS );
	}
}

add_filter( 'kp_shield_defaults', array( 'KP_Shield_Hostgate', 'defaults' ) );
add_action( 'kp_shield_boot', array( 'KP_Shield_Hostgate', 'init' ), 20 );
add_action(
	'kp_shield_deactivate',
	function () {
		// Al apagar el plugin la puerta se abre: nada de dejar un candado huérfano.
		if ( ! function_exists( 'insert_with_markers' ) ) {
			require_once ABSPATH . 'wp-admin/includes/misc.php';
		}
		if ( ! function_exists( 'get_home_path' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}
		$ht = get_home_path() . '.htaccess';
		if ( file_exists( $ht ) && is_writable( $ht ) ) {
			insert_with_markers( $ht, KP_Shield_Hostgate::MARKER, array() );
		}
	}
);
