<?php
/**
 * Kuboplay Shield — lectura del estado y de las cifras del panel.
 *
 * Aquí no se pinta nada: solo se lee `kp_shield_stats` (contadores por día y
 * motivo que escribe KP_Shield::log) y se convierte en algo que se pueda
 * enseñar: totales de hoy / 7 días / 30 días, motivo más frecuente, series por
 * familia para la gráfica y un semáforo general.
 *
 * Todo funciona aunque no haya ningún módulo instalado ni ningún dato guardado.
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'KP_Shield' ) || defined( 'KP_SHIELD_STATUS' ) ) {
	return;
}
define( 'KP_SHIELD_STATUS', true );

final class KP_Shield_Status {

	/** Días que se enseñan en la gráfica (KP_Shield::log guarda 30). */
	const DIAS = 30;

	/**
	 * Familias de motivo. La clave es el prefijo que escribe cada módulo
	 * («rate:front», «login:fallo», «fw:sqli»…); el motivo suelto que no
	 * encaje en ninguna cae en «otros».
	 */
	public static function familias() {
		return array(
			'rate'  => array(
				'label' => __( 'Visitas a ráfagas', 'kuboplay-shield' ),
				'color' => '#6e62f5',
			),
			'login' => array(
				'label' => __( 'Intentos de acceso', 'kuboplay-shield' ),
				'color' => '#ff6fb5',
			),
			'fw'    => array(
				'label' => __( 'Cortafuegos', 'kuboplay-shield' ),
				'color' => '#5b8cff',
			),
			'hard'  => array(
				'label' => __( 'Puertas cerradas', 'kuboplay-shield' ),
				'color' => '#a8cf3f',
			),
			'otros' => array(
				'label' => __( 'Otros', 'kuboplay-shield' ),
				'color' => '#ffc94d',
			),
		);
	}

	/** Familia a la que pertenece un motivo. */
	public static function familia( $motivo ) {
		$motivo = (string) $motivo;
		$pre    = strtok( $motivo, ':' );
		if ( in_array( $pre, array( 'rate', 'login', 'fw' ), true ) ) {
			return $pre;
		}
		if ( in_array( $pre, array( 'xmlrpc', 'enum', 'uploads', 'hard', 'author' ), true ) ) {
			return 'hard';
		}
		return 'otros';
	}

	/** Nombre en lenguaje llano de un motivo concreto. */
	public static function motivo_label( $motivo ) {
		$motivo = (string) $motivo;
		$mapa   = array(
			'rate:front'        => __( 'demasiadas páginas seguidas', 'kuboplay-shield' ),
			'rate:login'        => __( 'demasiados intentos de entrar seguidos', 'kuboplay-shield' ),
			'rate:api'          => __( 'demasiadas llamadas a la API seguidas', 'kuboplay-shield' ),
			'rate:admin'        => __( 'demasiadas peticiones al escritorio', 'kuboplay-shield' ),
			'login:fallo'       => __( 'contraseña fallada', 'kuboplay-shield' ),
			'login:bloqueo'     => __( 'acceso bloqueado por fallar varias veces', 'kuboplay-shield' ),
			'login:bloqueado'   => __( 'intento durante un bloqueo', 'kuboplay-shield' ),
			'login:oculto'      => __( 'alguien buscando la pantalla de acceso', 'kuboplay-shield' ),
			'xmlrpc'            => __( 'XML-RPC (la puerta antigua de WordPress)', 'kuboplay-shield' ),
			'enum:author'       => __( 'alguien intentando averiguar tu usuario', 'kuboplay-shield' ),
			'uploads:protegido' => __( 'algo raro en la carpeta de subidas', 'kuboplay-shield' ),
			'fw:env'            => __( 'búsqueda del fichero .env', 'kuboplay-shield' ),
			'fw:git'            => __( 'búsqueda de la carpeta .git', 'kuboplay-shield' ),
			'fw:config'         => __( 'búsqueda de wp-config.php', 'kuboplay-shield' ),
			'fw:backup'         => __( 'búsqueda de copias de seguridad', 'kuboplay-shield' ),
			'fw:shell'          => __( 'búsqueda de puertas traseras conocidas', 'kuboplay-shield' ),
			'fw:traversal'      => __( 'intento de salir de la carpeta de la web', 'kuboplay-shield' ),
			'fw:wrapper'        => __( 'intento de colar un fichero remoto', 'kuboplay-shield' ),
			'fw:sqli'           => __( 'intento de inyección en la base de datos', 'kuboplay-shield' ),
			'fw:xss'            => __( 'intento de colar JavaScript', 'kuboplay-shield' ),
			'fw:rfi'            => __( 'intento de cargar código de fuera', 'kuboplay-shield' ),
			'fw:code'           => __( 'intento de ejecutar código', 'kuboplay-shield' ),
		);
		if ( isset( $mapa[ $motivo ] ) ) {
			return $mapa[ $motivo ];
		}
		$libre = apply_filters( 'kp_shield_motivo_label', '', $motivo );
		return $libre ? (string) $libre : $motivo;
	}

	/** Contadores en bruto tal y como los guarda KP_Shield::log. */
	public static function raw() {
		$raw = get_option( 'kp_shield_stats', array() );
		return is_array( $raw ) ? $raw : array();
	}

	/**
	 * Todo lo que necesita el panel, calculado de una vez.
	 *
	 * @return array {
	 *     @type int   $hoy     bloqueos de hoy
	 *     @type int   $siete   bloqueos de los últimos 7 días
	 *     @type int   $treinta bloqueos de los últimos 30 días
	 *     @type array $top     array('motivo'=>clave,'label'=>texto,'n'=>int) o vacío
	 *     @type array $dias    lista de fechas Y-m-d, de la más antigua a hoy
	 *     @type array $series  familia => lista de enteros del mismo largo que $dias
	 *     @type array $total   lista de enteros (suma por día)
	 *     @type bool  $vacio   true si no hay ni un dato
	 * }
	 */
	public static function datos() {
		static $cache = null;
		if ( null !== $cache ) {
			return $cache;
		}

		$raw       = self::raw();
		$familias  = self::familias();
		$dias      = array();
		$hoy_key   = gmdate( 'Y-m-d' );
		$base_time = (int) strtotime( $hoy_key . ' 00:00:00 UTC' );

		for ( $i = self::DIAS - 1; $i >= 0; $i-- ) {
			$dias[] = gmdate( 'Y-m-d', $base_time - $i * DAY_IN_SECONDS );
		}
		$indice = array_flip( $dias );

		$series = array();
		foreach ( array_keys( $familias ) as $f ) {
			$series[ $f ] = array_fill( 0, self::DIAS, 0 );
		}
		$total   = array_fill( 0, self::DIAS, 0 );
		$motivos = array();
		$hoy     = 0;
		$siete   = 0;
		$treinta = 0;
		$vacio   = true;

		$desde7 = gmdate( 'Y-m-d', $base_time - 6 * DAY_IN_SECONDS );

		foreach ( $raw as $dia => $lista ) {
			$dia = (string) $dia;
			if ( ! is_array( $lista ) ) {
				continue;
			}
			$pos = isset( $indice[ $dia ] ) ? (int) $indice[ $dia ] : -1;
			foreach ( $lista as $motivo => $n ) {
				$n = (int) $n;
				if ( $n <= 0 ) {
					continue;
				}
				$vacio = false;
				if ( $dia === $hoy_key ) {
					$hoy += $n;
				}
				if ( $dia >= $desde7 && $dia <= $hoy_key ) {
					$siete += $n;
				}
				if ( $pos >= 0 ) {
					$treinta             += $n;
					$f                    = self::familia( $motivo );
					$series[ $f ][ $pos ] += $n;
					$total[ $pos ]       += $n;
					$motivos[ $motivo ]   = ( isset( $motivos[ $motivo ] ) ? $motivos[ $motivo ] : 0 ) + $n;
				}
			}
		}

		$top = array();
		if ( $motivos ) {
			arsort( $motivos );
			$clave = (string) key( $motivos );
			$top   = array(
				'motivo' => $clave,
				'label'  => self::motivo_label( $clave ),
				'n'      => (int) current( $motivos ),
			);
		}

		// Las familias que no han visto nada en 30 días no ensucian la gráfica.
		foreach ( $series as $f => $valores ) {
			if ( ! array_sum( $valores ) ) {
				unset( $series[ $f ] );
			}
		}

		$cache = array(
			'hoy'     => $hoy,
			'siete'   => $siete,
			'treinta' => $treinta,
			'top'     => $top,
			'dias'    => $dias,
			'series'  => $series,
			'total'   => $total,
			'vacio'   => $vacio,
		);
		return $cache;
	}

	/**
	 * Semáforo general: 'bien' | 'atencion' | 'grave'.
	 *
	 * Se calcula con lo que haya: los dos interruptores generales, los avisos
	 * que registren los módulos (un aviso de tipo «error» es grave) y el ritmo
	 * de bloqueos de hoy comparado con la media de los 30 días.
	 *
	 * @param array $notas Avisos ya recogidos (evita recalcularlos).
	 */
	public static function nivel( $notas = array() ) {
		$d    = self::datos();
		$sec  = (bool) KP_Shield::opt( 'sec_on' );
		$perf = (bool) KP_Shield::opt( 'perf_on' );

		$nivel  = 'bien';
		$porque = array();

		if ( ! $sec ) {
			$nivel    = 'grave';
			$porque[] = __( 'la protección está apagada', 'kuboplay-shield' );
		}

		foreach ( (array) $notas as $n ) {
			$t = isset( $n['type'] ) ? (string) $n['type'] : 'info';
			if ( in_array( $t, array( 'error', 'grave', 'bad' ), true ) ) {
				$nivel    = 'grave';
				$porque[] = __( 'hay un hallazgo grave sin resolver', 'kuboplay-shield' );
			} elseif ( 'warn' === $t && 'grave' !== $nivel ) {
				$nivel    = 'atencion';
				$porque[] = __( 'hay avisos pendientes', 'kuboplay-shield' );
			}
		}

		if ( ! $perf && 'grave' !== $nivel ) {
			$nivel    = 'atencion';
			$porque[] = __( 'las mejoras de velocidad están apagadas', 'kuboplay-shield' );
		}

		// Pico de hoy: más del triple de la media diaria y con volumen suficiente.
		$media = $d['treinta'] / max( 1, self::DIAS );
		if ( $d['hoy'] > 200 && $d['hoy'] > $media * 3 && 'grave' !== $nivel ) {
			$nivel    = 'atencion';
			$porque[] = __( 'hoy se está bloqueando mucho más de lo normal', 'kuboplay-shield' );
		}

		$porque = array_values( array_unique( $porque ) );

		if ( 'bien' === $nivel ) {
			$titulo = __( 'Todo en orden', 'kuboplay-shield' );
			$texto  = $d['treinta']
				? __( 'La protección está puesta y el registro no enseña nada fuera de lo normal.', 'kuboplay-shield' )
				: __( 'La protección está puesta. Todavía no se ha bloqueado nada: es lo esperable en una web nueva.', 'kuboplay-shield' );
		} elseif ( 'atencion' === $nivel ) {
			$titulo = __( 'Conviene mirarlo', 'kuboplay-shield' );
			/* translators: %s: lista de motivos separados por comas. */
			$texto = sprintf( __( 'Nada urgente, pero %s.', 'kuboplay-shield' ), self::lista( $porque ) );
		} else {
			$titulo = __( 'Hay algo importante', 'kuboplay-shield' );
			/* translators: %s: lista de motivos separados por comas. */
			$texto = sprintf( __( 'Atiéndelo cuanto antes: %s.', 'kuboplay-shield' ), self::lista( $porque ) );
		}

		return array(
			'nivel'  => $nivel,
			'titulo' => $titulo,
			'texto'  => $texto,
			'porque' => $porque,
		);
	}

	/** «a», «a y b», «a, b y c». */
	public static function lista( $items ) {
		$items = array_values( array_filter( (array) $items ) );
		$n     = count( $items );
		if ( ! $n ) {
			return '';
		}
		if ( 1 === $n ) {
			return (string) $items[0];
		}
		$ult = array_pop( $items );
		return implode( ', ', $items ) . ' ' . __( 'y', 'kuboplay-shield' ) . ' ' . $ult;
	}

	/** Datos que se le pasan a la gráfica (se imprimen con wp_json_encode). */
	public static function chart_data() {
		$d        = self::datos();
		$familias = self::familias();
		$series   = array();

		foreach ( $d['series'] as $f => $valores ) {
			$series[] = array(
				'key'    => $f,
				'label'  => isset( $familias[ $f ] ) ? $familias[ $f ]['label'] : $f,
				'color'  => isset( $familias[ $f ] ) ? $familias[ $f ]['color'] : '#a097ff',
				'values' => array_map( 'intval', array_values( $valores ) ),
			);
		}

		$dias = array();
		foreach ( $d['dias'] as $dia ) {
			$dias[] = array(
				'iso'   => $dia,
				'short' => gmdate( 'j/n', (int) strtotime( $dia . ' 00:00:00 UTC' ) ),
			);
		}

		return array(
			'days'   => $dias,
			'series' => $series,
			'total'  => array_map( 'intval', array_values( $d['total'] ) ),
			'empty'  => (bool) $d['vacio'],
			'i18n'   => array(
				'total'  => __( 'Total', 'kuboplay-shield' ),
				'empty'  => __( 'Todavía no hay bloqueos que enseñar. La gráfica se irá llenando sola.', 'kuboplay-shield' ),
				'blocks' => __( 'bloqueos', 'kuboplay-shield' ),
			),
		);
	}

	/** Texto alternativo de la gráfica, con las cifras de verdad. */
	public static function chart_alt() {
		$d = self::datos();
		if ( $d['vacio'] ) {
			return __( 'Gráfica de bloqueos de los últimos 30 días: todavía no hay ningún dato.', 'kuboplay-shield' );
		}
		$fam    = self::familias();
		$partes = array();
		foreach ( $d['series'] as $f => $valores ) {
			$label    = isset( $fam[ $f ] ) ? $fam[ $f ]['label'] : $f;
			$partes[] = $label . ': ' . number_format_i18n( array_sum( $valores ) );
		}
		return sprintf(
			/* translators: 1: total de 30 días, 2: máximo diario, 3: desglose por familia. */
			__( 'Gráfica de bloqueos de los últimos 30 días. Total: %1$s. Día con más bloqueos: %2$s. Por familia: %3$s.', 'kuboplay-shield' ),
			number_format_i18n( $d['treinta'] ),
			number_format_i18n( max( $d['total'] ) ),
			implode( '; ', $partes )
		);
	}
}
