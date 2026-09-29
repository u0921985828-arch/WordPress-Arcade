<?php
/**
 * Kuboplay Shield — escáner de integridad y auditoría.
 *
 * Busca puertas traseras y descuidos de configuración que ya pudiera haber en la
 * web, y los explica en castellano llano con los pasos exactos para arreglarlos
 * desde el escritorio de WordPress o el gestor de archivos del hosting.
 *
 * Qué mira:
 *   1. Ficheros: PHP ejecutable donde no debe haberlo (subidas, caché), nombres de
 *      panel de intruso y código con firmas de puerta trasera (eval, base64+eval,
 *      preg_replace /e, órdenes del sistema, escritura sobre wp-config.php…).
 *   2. Cuentas: administradores de más, creados hace poco, sin actividad, «admin»
 *      como nombre, correos de dominios raros, registro abierto.
 *   3. Configuración: permisos y claves (SALT) de wp-config.php, editor de ficheros,
 *      errores visibles, prefijo de tablas, versiones de PHP y WordPress, HTTPS y
 *      tareas programadas atascadas o duplicadas.
 *   4. Plugins y temas: desactivados pero instalados, ajenos al repositorio oficial,
 *      con actualización pendiente, drop-ins inesperados y permisos de escritura.
 *   5. Integridad: huella sha256 de cada PHP de Kuboplay Shield y del arcade; si
 *      alguno cambia sin que cambie la versión, se avisa.
 *
 * Cómo se ejecuta:
 *   - NUNCA en una visita normal. Solo bajo demanda (botón «Analizar ahora») y una
 *     vez al día por cron.
 *   - Por lotes, con tope de tiempo y de ficheros por pasada; si no le da tiempo,
 *     guarda por dónde iba y continúa en la pasada siguiente.
 *   - Todo local: cero llamadas de red, cero telemetría, cero listas remotas.
 *   - No borra ni modifica nada por su cuenta: informa. Las dos acciones de arreglo
 *     que ofrece son explícitas, con permiso de administrador, y sólo crean un
 *     fichero .htaccess (reversible borrándolo).
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/scan-rules.php';

final class KP_Shield_Scan {

	/** Último informe completo. */
	const OPT_RESULT = 'kp_shield_scan';

	/** Estado de continuación entre lotes. */
	const OPT_STATE = 'kp_shield_scan_state';

	/** Huellas sha256 tomadas al instalar. */
	const OPT_BASE = 'kp_shield_scan_base';

	const HOOK_DAILY = 'kp_shield_scan_daily';
	const HOOK_NEXT  = 'kp_shield_scan_next';

	/** Tope duro de hallazgos guardados (el resto se resume en uno). */
	const MAX_FIND = 120;

	/** Huellas conocidas, indexadas por ruta absoluta normalizada. */
	private static $known = null;

	/* ═══════════════════════════════════════════════════════ Ajustes y arranque */

	public static function defaults( $d ) {
		return array_merge(
			$d,
			array(
				'scan_on'     => 1,    // módulo activo
				'scan_cron'   => 1,    // análisis diario automático
				'scan_budget' => 4,    // segundos de CPU por pasada
				'scan_files'  => 3000, // ficheros abiertos por pasada
				'scan_kb'     => 1024, // tamaño máximo de fichero que se lee entero (KB)
				'scan_int'    => 1,    // vigilar cambios en los ficheros del plugin y del arcade
			)
		);
	}

	public static function on() {
		if ( defined( 'KP_SHIELD_OFF' ) && KP_SHIELD_OFF ) {
			return false;
		}
		return (bool) KP_Shield::opt( 'scan_on' );
	}

	public static function boot() {
		// El escáner no toca NUNCA una visita normal: solo escritorio y cron.
		$admin = is_admin();
		$cron  = ( defined( 'DOING_CRON' ) && DOING_CRON ) || ( defined( 'WP_CLI' ) && WP_CLI );

		add_action( self::HOOK_DAILY, array( __CLASS__, 'cron_run' ) );
		add_action( self::HOOK_NEXT, array( __CLASS__, 'cron_run' ) );

		if ( ! $admin && ! $cron ) {
			return;
		}
		if ( ! self::on() ) {
			self::unschedule();
			return;
		}

		add_action( 'init', array( __CLASS__, 'schedule' ) );

		if ( ! $admin ) {
			return;
		}

		add_filter( 'kp_shield_tabs', array( __CLASS__, 'tab' ) );
		add_filter( 'kp_shield_fields', array( __CLASS__, 'fields' ) );
		add_filter( 'kp_shield_panels', array( __CLASS__, 'panels' ) );
		add_filter( 'kp_shield_tools', array( __CLASS__, 'tools' ) );
		add_filter( 'kp_shield_notices', array( __CLASS__, 'notices' ) );
		add_filter( 'kp_shield_status', array( __CLASS__, 'status' ) );

		add_action( 'kp_shield_tool_scan', array( __CLASS__, 'tool_scan' ) );
		add_action( 'kp_shield_tool_scan_base', array( __CLASS__, 'tool_base' ) );
		add_action( 'kp_shield_tool_scan_cache', array( __CLASS__, 'tool_cache' ) );
	}

	public static function schedule() {
		if ( KP_Shield::opt( 'scan_cron' ) ) {
			if ( ! wp_next_scheduled( self::HOOK_DAILY ) ) {
				wp_schedule_event( time() + 20 * MINUTE_IN_SECONDS, 'daily', self::HOOK_DAILY );
			}
		} else {
			self::unschedule();
		}
	}

	public static function unschedule() {
		foreach ( array( self::HOOK_DAILY, self::HOOK_NEXT ) as $h ) {
			$ts = wp_next_scheduled( $h );
			while ( $ts ) {
				wp_unschedule_event( $ts, $h );
				$ts = wp_next_scheduled( $h );
			}
		}
	}

	public static function activate() {
		self::snapshot( true );
	}

	public static function cron_run() {
		if ( self::on() ) {
			self::run();
		}
	}

	/* ═══════════════════════════════════════════════════════════ Análisis */

	/**
	 * Una pasada del análisis. Si no termina dentro del presupuesto, guarda el
	 * estado y programa la continuación.
	 *
	 * @param bool $reiniciar Empezar de cero aunque hubiera una pasada a medias.
	 * @return array Resumen: array('done'=>bool,'files'=>int,'took'=>float).
	 */
	public static function run( $reiniciar = false ) {
		$t0      = microtime( true );
		$budget  = max( 1, min( 30, (int) KP_Shield::opt( 'scan_budget', 4 ) ) );
		$maxfile = max( 200, min( 50000, (int) KP_Shield::opt( 'scan_files', 3000 ) ) );
		$map     = kp_shield_scan_map();

		$st = $reiniciar ? array() : (array) get_option( self::OPT_STATE, array() );
		if ( empty( $st['queue'] ) && empty( $st['fase'] ) ) {
			$st = self::fresh();
		}
		$st['lote'] = 0; // ficheros mirados en ESTA pasada (el tope es por pasada).

		self::$known = null;
		$done        = self::walk( $st, $t0, $budget, $maxfile, $map );

		if ( ! $done ) {
			$st['parcial'] = 1;
			update_option( self::OPT_STATE, $st, false );
			if ( ! wp_next_scheduled( self::HOOK_NEXT ) ) {
				wp_schedule_single_event( time() + 60, self::HOOK_NEXT );
			}
			// Informe provisional, para que el panel enseñe algo desde el primer minuto.
			self::store( $st, $t0, false );
			return array( 'done' => false, 'files' => (int) $st['files'], 'took' => microtime( true ) - $t0 );
		}

		// Comprobaciones que no dependen del recorrido (rápidas, una sola vez).
		self::check_accounts( $st );
		self::check_config( $st );
		self::check_plugins( $st );
		self::check_integrity( $st );

		delete_option( self::OPT_STATE );
		self::store( $st, $t0, true );

		return array( 'done' => true, 'files' => (int) $st['files'], 'took' => microtime( true ) - $t0 );
	}

	/** Estado inicial: cola de carpetas por recorrer. */
	private static function fresh() {
		$q = array();

		// Raíz: solo los ficheros sueltos (sin bajar), en modo estricto.
		$q[] = array( 'd' => untrailingslashit( ABSPATH ), 'm' => 'core', 'flat' => 1 );

		// wp-content entero, en modo completo.
		$q[] = array( 'd' => untrailingslashit( WP_CONTENT_DIR ), 'm' => 'full', 'flat' => 0 );

		// Núcleo de WordPress, en modo estricto (solo firmas inequívocas).
		foreach ( array( 'wp-admin', 'wp-includes' ) as $d ) {
			if ( is_dir( ABSPATH . $d ) ) {
				$q[] = array( 'd' => untrailingslashit( ABSPATH . $d ), 'm' => 'core', 'flat' => 0 );
			}
		}

		return array(
			'inicio'  => time(),
			'queue'   => $q,
			'find'    => array(),
			'vistos'  => array(),
			'files'   => 0,
			'lote'    => 0,
			'dirs'    => 0,
			'cortado' => 0,
			'parcial' => 0,
			'fase'    => 'ficheros',
		);
	}

	/**
	 * Recorre la cola de carpetas dentro del presupuesto.
	 *
	 * @return bool true si se terminó el recorrido.
	 */
	private static function walk( &$st, $t0, $budget, $maxfile, $map ) {
		while ( ! empty( $st['queue'] ) ) {
			if ( ( microtime( true ) - $t0 ) > $budget || $st['lote'] >= $maxfile ) {
				return false;
			}
			$job = array_shift( $st['queue'] );
			self::dir( $job, $st, $map, $t0, $budget, $maxfile );
		}
		return true;
	}

	/** Recorre una carpeta (sin bajar: las subcarpetas vuelven a la cola). */
	private static function dir( $job, &$st, $map, $t0, $budget, $maxfile ) {
		$dir = $job['d'];
		$dh  = @opendir( $dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( ! $dh ) {
			return;
		}
		$st['dirs']++;
		$sub = array();

		while ( false !== ( $e = readdir( $dh ) ) ) {
			if ( '.' === $e || '..' === $e ) {
				continue;
			}
			$abs = $dir . '/' . $e;
			$rel = self::rel( $abs );

			if ( is_link( $abs ) ) {
				continue; // Ni enlaces ni bucles.
			}

			if ( is_dir( $abs ) ) {
				if ( ! empty( $job['flat'] ) || self::skip_dir( $rel, $e, $map ) ) {
					continue;
				}
				$sub[] = array( 'd' => $abs, 'm' => $job['m'], 'flat' => 0 );
				continue;
			}

			if ( ( microtime( true ) - $t0 ) > $budget || $st['lote'] >= $maxfile ) {
				$st['queue'][] = array( 'd' => $dir, 'm' => $job['m'], 'flat' => ! empty( $job['flat'] ) ? 1 : 0, 'skip' => 1 );
				closedir( $dh );
				// Se vuelve a recorrer esta carpeta en la pasada siguiente; los ficheros
				// ya mirados se repiten, pero el análisis es idempotente (no borra nada).
				foreach ( $sub as $s ) {
					$st['queue'][] = $s;
				}
				return;
			}

			self::file( $abs, $rel, $e, $job['m'], $st, $map );
		}
		closedir( $dh );

		foreach ( $sub as $s ) {
			$st['queue'][] = $s;
		}
	}

	private static function skip_dir( $rel, $name, $map ) {
		foreach ( $map['skip_dirs'] as $s ) {
			if ( $name === $s || $rel === $s || 0 === strpos( $rel . '/', $s . '/' ) ) {
				return true;
			}
		}
		return false;
	}

	/** Un fichero: reglas de sitio, de nombre y de contenido. */
	private static function file( $abs, $rel, $name, $modo, &$st, $map ) {
		$dot = strrpos( $name, '.' );
		$ext = false === $dot ? '' : strtolower( substr( $name, $dot + 1 ) );
		$st['files']++;
		$st['lote'] = ( isset( $st['lote'] ) ? (int) $st['lote'] : 0 ) + 1;

		// ── Regla de sitio: PHP ejecutable donde no debe haberlo ────────────
		$zona = '';
		foreach ( $map['no_php'] as $z ) {
			if ( 0 === strpos( $rel, $z . '/' ) || $rel === $z ) {
				$zona = $z;
				break;
			}
		}

		if ( $zona ) {
			// .htaccess que vuelve a encender PHP en una carpeta de subidas.
			if ( '.htaccess' === $name ) {
				$txt = (string) self::head( $abs, 8192 );
				if ( preg_match( '/(x-httpd-php|php_flag\s+engine\s+on|SetHandler\s+application)/i', $txt ) ) {
					self::add(
						$st,
						'grave',
						'Un fichero .htaccess vuelve a permitir ejecutar programas en ' . $zona,
						'Dentro de una carpeta que solo debería tener imágenes hay una regla que permite ejecutar código.',
						'Es la manera de dejar abierta una puerta trasera aunque se borre el programa.',
						array(
							'Entra en el gestor de archivos de IONOS y ve a ' . $rel . '.',
							'Descárgatelo primero (por si acaso) y luego bórralo.',
							'En el escritorio, Kuboplay Shield → Seguridad → «Blindar la carpeta de subidas» debe estar encendido.',
						),
						$rel
					);
				}
				return;
			}
			$legitimo = in_array( $rel, $map['no_php_ok'], true );
			if ( ! $legitimo && 'index.php' === $name && (int) @filesize( $abs ) < 200 ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
				// «Silence is golden»: el index.php vacío que crean WordPress y este plugin.
				$legitimo = preg_match( '/^\s*<\?php\s*(?:\/\/[^\n]*|\/\*.*?\*\/|\s)*$/s', (string) self::head( $abs, 200 ) );
			}
			if ( ! $legitimo && ( in_array( $ext, $map['exec_ext'], true ) || preg_match( '/\.(php|phtml|phar)\.[a-z0-9]+$/i', $name ) ) ) {
				self::add(
					$st,
					'grave',
					'Hay un programa PHP dentro de ' . $zona,
					'En esa carpeta solo debería haber imágenes y archivos subidos, nunca programas.',
					'Casi siempre es una puerta trasera: quien la dejó ahí puede entrar cuando quiera aunque cambies la contraseña.',
					array(
						'Entra en IONOS → Administrador de archivos y busca ' . $rel . '.',
						'Descárgalo a tu ordenador (por si hiciera falta enseñárselo a alguien) y bórralo del servidor.',
						'Cambia después la contraseña del administrador de WordPress y la de IONOS.',
						'Comprueba en Kuboplay Shield → Seguridad que «Blindar la carpeta de subidas» está encendido.',
					),
					$rel
				);
				return;
			}
		}

		if ( ! in_array( $ext, $map['php_ext'], true ) ) {
			return; // Imágenes, JS de los juegos, CSS, datos: no se abren.
		}

		// ── Regla de nombre ─────────────────────────────────────────────────
		$base = strtolower( false === $dot ? $name : substr( $name, 0, $dot ) );
		if ( 'core' !== $modo && in_array( $base, $map['bad_names'], true ) ) {
			self::add(
				$st,
				'grave',
				'Fichero con nombre de panel de intruso: ' . $name,
				'El nombre coincide con los que usan los programas que se dejan instalados tras entrar en una web.',
				'Si es lo que parece, alguien tiene control total del sitio.',
				array(
					'Ábrelo desde IONOS → Administrador de archivos y mira las primeras líneas.',
					'Si no reconoces lo que hay dentro, descárgalo y bórralo.',
					'Cambia después todas las contraseñas (WordPress, IONOS y correo).',
				),
				$rel
			);
		}

		// ── Contenido ───────────────────────────────────────────────────────
		if ( self::verified( $abs ) ) {
			return; // Huella idéntica a la tomada al instalar: no hay nada que mirar.
		}
		foreach ( $map['self_ok'] as $s ) {
			if ( false !== strpos( $rel, $s ) ) {
				return; // Las propias listas de patrones, escritas como texto.
			}
		}
		if ( 'core' === $modo ) {
			foreach ( $map['core_ok'] as $s ) {
				if ( 0 === strpos( $rel, $s ) || $rel === rtrim( $s, '/' ) ) {
					return;
				}
			}
		}

		$max = max( 64, (int) KP_Shield::opt( 'scan_kb', 1024 ) ) * 1024;
		$sz  = (int) @filesize( $abs ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( $sz > $max ) {
			$st['cortado']++;
			return;
		}

		$hits = self::content( $abs, $modo );
		foreach ( $hits as $h ) {
			self::add(
				$st,
				$h['level'],
				$h['titulo'],
				$h['what'],
				$h['risk'],
				array(
					'Mira el fichero antes de tocar nada: IONOS → Administrador de archivos → ' . $rel . ', línea ' . $h['line'] . '.',
					'Si el fichero es de un plugin que tú instalaste y reconoces, no hagas nada: apúntalo y sigue.',
					'Si no sabes de dónde sale, descárgalo (copia de seguridad) y bórralo; después mira si la web sigue bien.',
					'Si aparecen varios avisos graves a la vez, lo más rápido y seguro es restaurar una copia de seguridad de IONOS anterior a la fecha del fichero y cambiar todas las contraseñas.',
				),
				$rel . ':' . $h['line']
			);
		}
	}

	/**
	 * Busca las firmas dentro de un fichero, leyéndolo por trozos (nunca entero
	 * en memoria) y con solapamiento para no partir una coincidencia.
	 *
	 * @return array Lista de coincidencias (una por firma como mucho).
	 */
	private static function content( $abs, $modo ) {
		$sigs = kp_shield_scan_sigs();
		$fh   = @fopen( $abs, 'rb' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( ! $fh ) {
			return array();
		}

		$out   = array();
		$tail  = '';
		$linea = 1;
		$lote  = 65536;
		$solap = 1024;

		while ( ! feof( $fh ) ) {
			$buf = fread( $fh, $lote );
			if ( false === $buf || '' === $buf ) {
				break;
			}
			$data = $tail . $buf;

			foreach ( $sigs as $key => $sig ) {
				if ( isset( $out[ $key ] ) ) {
					continue;
				}
				if ( 'core' === $modo && empty( $sig['core'] ) ) {
					continue;
				}
				if ( ! preg_match( '#' . $sig['re'] . '#iS', $data, $m, PREG_OFFSET_CAPTURE ) ) {
					continue;
				}
				$off = (int) $m[0][1];

				// Fuera comentarios: el propio WordPress menciona eval() en comentarios.
				$ini = strrpos( substr( $data, 0, $off ), "\n" );
				$ini = ( false === $ini ) ? 0 : $ini + 1;
				$txt = ltrim( substr( $data, $ini, $off - $ini + 200 ) );
				if ( '' !== $txt && ( 0 === strpos( $txt, '//' ) || 0 === strpos( $txt, '*' ) || 0 === strpos( $txt, '/*' ) || 0 === strpos( $txt, '#' ) ) ) {
					continue;
				}

				$out[ $key ] = array(
					'weak'   => ! empty( $sig['weak'] ),
					'level'  => $sig['level'],
					'what'   => $sig['what'],
					'risk'   => $sig['risk'],
					'line'   => $linea + substr_count( substr( $data, 0, $off ), "\n" ),
					'titulo' => self::title( $key, basename( $abs ) ),
				);
				if ( count( $out ) >= 4 ) {
					break;
				}
			}

			if ( count( $out ) >= 4 ) {
				break;
			}

			// Se guarda la cola para el siguiente trozo; el resto se da por leído.
			$corte = max( 0, strlen( $data ) - $solap );
			$linea += substr_count( substr( $data, 0, $corte ), "\n" );
			$tail   = substr( $data, $corte );
		}
		fclose( $fh );

		// Las firmas «débiles» solo cuentan si el fichero ha disparado alguna de las serias.
		$fuertes = 0;
		foreach ( $out as $h ) {
			if ( empty( $h['weak'] ) ) {
				$fuertes++;
			}
		}
		if ( ! $fuertes ) {
			return array();
		}

		return array_values( $out );
	}

	private static function title( $key, $file ) {
		$t = array(
			'eval'      => 'Código que se ejecuta al vuelo (eval) en ',
			'b64_eval'  => 'Código escondido y ejecutado en ',
			'preg_e'    => 'Truco antiguo para ejecutar código en ',
			'create_fn' => 'Función creada al vuelo (create_function) en ',
			'req_exec'  => 'Ejecuta lo que le mandan desde fuera: ',
			'wpconfig'  => 'Escribe sobre el wp-config.php: ',
			'shell'     => 'Lanza órdenes del servidor: ',
			'exec'      => 'Lanza un programa del servidor: ',
			'assert'    => 'Uso sospechoso de assert() en ',
			'gzinflate' => 'Código comprimido para esconderlo en ',
			'rot13'     => 'Texto disimulado con ROT13 en ',
			'b64'       => 'Texto codificado en base64 en ',
			'blob'      => 'Bloque codificado enorme en ',
			'varvar'    => 'Nombres de variable construidos al vuelo en ',
			'chr_obf'   => 'Palabras escritas letra a letra en ',
			'hidden_in' => 'Carga como código un fichero disfrazado: ',
			'shell_sig' => 'Marca de panel de intruso conocido en ',
			'spam_sig'  => 'Código que engaña a Google en ',
		);
		return ( isset( $t[ $key ] ) ? $t[ $key ] : 'Código sospechoso en ' ) . $file;
	}

	/** Primeros bytes de un fichero (para .htaccess y cabeceras). */
	private static function head( $abs, $n ) {
		$fh = @fopen( $abs, 'rb' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( ! $fh ) {
			return '';
		}
		$s = fread( $fh, $n );
		fclose( $fh );
		return false === $s ? '' : $s;
	}

	/* ═══════════════════════════════════════════════════════════ 2. Cuentas */

	private static function check_accounts( &$st ) {
		$admins = get_users(
			array(
				'role'   => 'administrator',
				'number' => 50,
				'fields' => array( 'ID', 'user_login', 'user_email', 'user_registered' ),
			)
		);

		// Fecha del primer usuario: sirve para no acusar a la web de ser nueva.
		$primeros = get_users( array( 'number' => 1, 'orderby' => 'registered', 'order' => 'ASC', 'fields' => array( 'user_registered' ) ) );
		$alta0    = $primeros ? strtotime( $primeros[0]->user_registered . ' UTC' ) : 0;
		$ahora    = time();
		$host     = wp_parse_url( home_url(), PHP_URL_HOST );
		$map      = kp_shield_scan_map();

		if ( count( $admins ) > 2 ) {
			$nombres = array();
			foreach ( $admins as $u ) {
				$nombres[] = $u->user_login;
			}
			self::add(
				$st,
				'medio',
				'Hay ' . count( $admins ) . ' administradores en la web',
				'Administradores: ' . implode( ', ', $nombres ) . '. Cada uno puede instalar plugins y cambiarlo todo.',
				'Cuantas más llaves maestras haya, más fácil es que una de ellas acabe en malas manos.',
				array(
					'Ve a Escritorio → Usuarios.',
					'Deja como Administrador solo al tuyo; a los demás cámbiales el perfil a Editor o Suscriptor con el botón «Editar».',
					'Si alguno no lo has creado tú, bórralo (Usuarios → pasar el ratón por encima → Borrar) y asigna su contenido a tu usuario.',
				)
			);
		}

		foreach ( $admins as $u ) {
			$alta = strtotime( $u->user_registered . ' UTC' );

			if ( 'admin' === strtolower( $u->user_login ) ) {
				self::add(
					$st,
					'medio',
					'Existe un administrador llamado «admin»',
					'«admin» es el primer nombre que prueban los robots que atacan WordPress.',
					'Les dejas la mitad del trabajo hecho: solo les falta acertar la contraseña.',
					array(
						'Escritorio → Usuarios → Añadir nuevo: crea otro administrador con un nombre distinto y una contraseña larga.',
						'Cierra la sesión y entra con el usuario nuevo.',
						'Vuelve a Usuarios, borra el llamado «admin» y, cuando te pregunte, asigna su contenido al usuario nuevo.',
					)
				);
			}

			// Creado hace poco Y bastante después de nacer la web.
			if ( $alta && $alta > ( $ahora - 30 * DAY_IN_SECONDS ) && $alta > ( $alta0 + 7 * DAY_IN_SECONDS ) ) {
				self::add(
					$st,
					'grave',
					'Administrador creado hace poco: ' . $u->user_login,
					'La cuenta «' . $u->user_login . '» se creó el ' . gmdate( 'd/m/Y', $alta ) . ' y tiene permisos totales.',
					'Si no la creaste tú, alguien ya ha entrado y se ha dejado una llave propia.',
					array(
						'Escritorio → Usuarios: busca «' . $u->user_login . '».',
						'Si no la has creado tú, bórrala ahora mismo (pasa el ratón por encima → Borrar).',
						'Cambia después tu contraseña de WordPress y la de IONOS, y revisa el resto de avisos de esta lista.',
					)
				);
			}

			// Correo de un dominio que no es el de la web ni un proveedor habitual.
			$dom = strtolower( (string) substr( strrchr( (string) $u->user_email, '@' ), 1 ) );
			if ( $dom && $dom !== strtolower( (string) $host ) && ! in_array( $dom, $map['mail_ok'], true ) ) {
				self::add(
					$st,
					'aviso',
					'Administrador con un correo poco habitual: ' . $u->user_login,
					'Su correo es de «' . $dom . '», que no es el dominio de la web ni un proveedor conocido.',
					'Si la cuenta no es tuya, quien controle ese correo puede pedir una contraseña nueva y entrar.',
					array(
						'Escritorio → Usuarios → «' . $u->user_login . '» → Editar y mira el correo.',
						'Si no lo reconoces, cámbialo por uno tuyo o borra la cuenta.',
					)
				);
			}

			// Administrador que no ha entrado nunca ni ha publicado nada.
			$sesiones = get_user_meta( $u->ID, 'session_tokens', true );
			if ( empty( $sesiones ) && $alta && $alta < ( $ahora - 60 * DAY_IN_SECONDS ) && 0 === (int) count_user_posts( $u->ID ) ) {
				self::add(
					$st,
					'aviso',
					'Administrador sin actividad: ' . $u->user_login,
					'Esa cuenta no ha entrado nunca y no ha publicado nada en más de dos meses.',
					'Una cuenta que nadie vigila es una puerta que nadie mira.',
					array(
						'Escritorio → Usuarios: si ya no hace falta, bórrala.',
						'Si la quieres conservar, al menos bájala a Suscriptor con el botón «Editar».',
					)
				);
			}
		}

		if ( get_option( 'users_can_register' ) && ! in_array( (string) get_option( 'default_role' ), array( 'subscriber', '' ), true ) ) {
			self::add(
				$st,
				'grave',
				'Cualquiera puede registrarse y encima con permisos',
				'El registro está abierto y las cuentas nuevas se crean con el perfil «' . get_option( 'default_role' ) . '».',
				'Cualquier robot puede crearse una cuenta con permisos para escribir o subir ficheros.',
				array(
					'Escritorio → Ajustes → Generales.',
					'Quita la marca de «Cualquiera puede registrarse», o deja «Perfil predeterminado para nuevos usuarios» en Suscriptor.',
					'Guarda los cambios abajo del todo.',
				)
			);
		}
	}

	/* ═════════════════════════════════════════════════════ 3. Configuración */

	private static function check_config( &$st ) {
		$wc = self::wp_config();

		if ( $wc ) {
			$perm = @fileperms( $wc ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			if ( $perm ) {
				$oct = substr( sprintf( '%o', $perm ), -3 );
				if ( $perm & 0x0002 ) { // escribible por todo el mundo
					self::add(
						$st,
						'grave',
						'El wp-config.php lo puede modificar cualquiera (permisos ' . $oct . ')',
						'Ese fichero guarda la contraseña de la base de datos y las claves de seguridad.',
						'Cualquier programa que se cuele en el servidor puede leerlo o cambiarlo.',
						array(
							'IONOS → Administrador de archivos → busca wp-config.php en la carpeta raíz.',
							'Pulsa con el botón derecho → Permisos (o «CHMOD»).',
							'Pon 640 (o 644 si con 640 la web deja de abrirse) y guarda.',
						),
						'wp-config.php'
					);
				} elseif ( $perm & 0x0004 ) { // legible por todo el mundo
					self::add(
						$st,
						'aviso',
						'El wp-config.php es legible por cualquier usuario del servidor (permisos ' . $oct . ')',
						'En un hosting compartido, otras webs del mismo servidor podrían leerlo.',
						'Se podrían llevar la contraseña de tu base de datos.',
						array(
							'IONOS → Administrador de archivos → wp-config.php → Permisos.',
							'Prueba con 640. Si la web deja de verse, vuelve a 644 y avisa al soporte de IONOS.',
						),
						'wp-config.php'
					);
				}
			}
		}

		// Claves de seguridad (SALT).
		$sal   = array( 'AUTH_KEY', 'SECURE_AUTH_KEY', 'LOGGED_IN_KEY', 'NONCE_KEY', 'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_SALT', 'NONCE_SALT' );
		$malas = array();
		foreach ( $sal as $k ) {
			if ( ! defined( $k ) ) {
				$malas[] = $k;
				continue;
			}
			$v = (string) constant( $k );
			if ( strlen( $v ) < 32 || false !== stripos( $v, 'put your unique phrase here' ) || false !== stripos( $v, 'generateme' ) ) {
				$malas[] = $k;
			}
		}
		if ( $malas ) {
			self::add(
				$st,
				'grave',
				'Las claves de seguridad de WordPress están sin poner (' . count( $malas ) . ' de 8)',
				'Son ocho frases secretas del wp-config.php que firman las cookies de quien entra.',
				'Sin ellas, alguien puede fabricarse una cookie de administrador y entrar sin contraseña.',
				array(
					'Abre https://api.wordpress.org/secret-key/1.1/salt/ en el navegador: sale un bloque de 8 líneas.',
					'IONOS → Administrador de archivos → wp-config.php → Editar.',
					'Busca las 8 líneas que empiezan por define( \'AUTH_KEY\'… y sustitúyelas por el bloque nuevo (borra las viejas).',
					'Guarda. Se cerrará tu sesión: vuelve a entrar. No pasa nada más.',
				),
				'wp-config.php'
			);
		}

		if ( ! defined( 'DISALLOW_FILE_EDIT' ) || ! DISALLOW_FILE_EDIT ) {
			self::add(
				$st,
				'medio',
				'El editor de código de WordPress está disponible',
				'Desde el escritorio se puede cambiar el código del tema y de los plugins.',
				'Si alguien entra con tu contraseña, en dos clics deja una puerta trasera sin necesidad de FTP.',
				array(
					'Kuboplay Shield → Seguridad → enciende «Desactivar el editor de archivos» y guarda.',
					'Alternativa: añade define( \'DISALLOW_FILE_EDIT\', true ); al wp-config.php.',
				)
			);
		}

		if ( defined( 'WP_DEBUG' ) && WP_DEBUG && ( ! defined( 'WP_DEBUG_DISPLAY' ) || WP_DEBUG_DISPLAY ) ) {
			self::add(
				$st,
				'grave',
				'Los errores de PHP se ven en la web',
				'WordPress está en modo depuración y enseña los fallos a cualquiera que entre.',
				'Los mensajes revelan rutas del servidor y nombres internos: es el primer regalo para quien quiera atacar.',
				array(
					'IONOS → Administrador de archivos → wp-config.php → Editar.',
					'Cambia define( \'WP_DEBUG\', true ); por define( \'WP_DEBUG\', false );',
					'Guarda y recarga la web.',
				),
				'wp-config.php'
			);
		}

		global $wpdb;
		if ( isset( $wpdb->prefix ) && 'wp_' === $wpdb->prefix ) {
			self::add(
				$st,
				'aviso',
				'Las tablas de la base de datos usan el nombre de siempre (wp_)',
				'Es el prefijo por defecto, así que un atacante sabe cómo se llaman tus tablas sin preguntar.',
				'Facilita algunos ataques automáticos, aunque por sí solo no abre ninguna puerta.',
				array(
					'No lo cambies a mano: se rompe la web con facilidad.',
					'Si algún día migras la web a otro sitio, aprovecha para crearla con otro prefijo.',
					'Mientras tanto, basta con mantener el resto de la lista en verde.',
				)
			);
		}

		// PHP.
		if ( version_compare( PHP_VERSION, '8.0', '<' ) ) {
			self::add(
				$st,
				'grave',
				'La versión de PHP del servidor es antigua (' . PHP_VERSION . ')',
				'Esa versión ya no recibe parches de seguridad.',
				'Los fallos conocidos se quedan sin arreglar para siempre.',
				array(
					'Entra en IONOS → Hosting → Configuración de PHP.',
					'Elige PHP 8.2 o 8.3 y guarda.',
					'Abre la web y comprueba que todo se ve bien. Si algo falla, vuelve a la versión anterior y avisa.',
				)
			);
		} elseif ( version_compare( PHP_VERSION, '8.1', '<' ) ) {
			self::add(
				$st,
				'medio',
				'La versión de PHP del servidor está a punto de quedarse sin soporte (' . PHP_VERSION . ')',
				'Conviene ir a 8.2 o 8.3.',
				'Cuando deje de recibir parches, los fallos que salgan no se arreglarán.',
				array( 'IONOS → Hosting → Configuración de PHP → elige 8.2 o 8.3 y comprueba la web después.' )
			);
		}

		// Actualizaciones pendientes (se leen de lo que WordPress ya ha comprobado; no se pide nada a nadie).
		$core = get_site_transient( 'update_core' );
		if ( $core && ! empty( $core->updates[0]->response ) && 'upgrade' === $core->updates[0]->response ) {
			self::add(
				$st,
				'grave',
				'WordPress tiene una actualización pendiente',
				'La versión instalada es la ' . get_bloginfo( 'version' ) . ' y hay otra más nueva.',
				'La mayoría de webs hackeadas lo son por no actualizar.',
				array(
					'Escritorio → Escritorio → Actualizaciones.',
					'Antes de nada: IONOS → copia de seguridad (o apúntate la fecha de la última).',
					'Pulsa «Actualizar ahora» y luego abre la web y un juego para comprobar que todo va.',
				)
			);
		}

		// HTTPS.
		if ( 'https' !== wp_parse_url( home_url(), PHP_URL_SCHEME ) ) {
			self::add(
				$st,
				'grave',
				'La web no va por HTTPS (sin candado)',
				'La dirección de la web sigue siendo http://, sin cifrar.',
				'Las contraseñas viajan en claro y el navegador marca la web como «No segura».',
				array(
					'IONOS → Hosting → SSL: activa el certificado gratuito para el dominio.',
					'Cuando el candado funcione, Escritorio → Ajustes → Generales y cambia las dos direcciones a https://',
					'Después, en Kuboplay Shield → Seguridad, enciende «Forzar HTTPS (HSTS)».',
				)
			);
		} elseif ( ! defined( 'FORCE_SSL_ADMIN' ) || ! FORCE_SSL_ADMIN ) {
			self::add(
				$st,
				'aviso',
				'El escritorio no obliga a usar HTTPS',
				'La web ya va por https, pero falta la línea que obliga al escritorio a ir siempre cifrado.',
				'En una wifi ajena, alguien podría colarse en medio al iniciar sesión.',
				array(
					'IONOS → Administrador de archivos → wp-config.php → Editar.',
					'Añade define( \'FORCE_SSL_ADMIN\', true ); justo antes de la línea «/* Eso es todo… */».',
					'Guarda y entra de nuevo al escritorio.',
				),
				'wp-config.php'
			);
		}

		self::check_cron( $st );
	}

	private static function check_cron( &$st ) {
		if ( ! function_exists( '_get_cron_array' ) ) {
			return;
		}
		$cron = _get_cron_array();
		if ( ! is_array( $cron ) ) {
			return;
		}
		$total   = 0;
		$viejas  = 0;
		$cuenta  = array();
		$atrasos = array();
		$ahora   = time();

		foreach ( $cron as $ts => $hooks ) {
			foreach ( (array) $hooks as $hook => $evs ) {
				foreach ( (array) $evs as $ev ) {
					$total++;
					$cuenta[ $hook ] = ( isset( $cuenta[ $hook ] ) ? $cuenta[ $hook ] : 0 ) + 1;
					if ( $ts < $ahora - DAY_IN_SECONDS ) {
						$viejas++;
						$atrasos[ $hook ] = true;
					}
				}
			}
		}

		if ( $viejas > 0 ) {
			self::add(
				$st,
				'medio',
				'Hay ' . $viejas . ' tareas programadas que llevan más de un día sin ejecutarse',
				'WordPress lanza sus tareas (copias, limpiezas, comprobación de actualizaciones) cuando alguien visita la web.',
				'Si no corren, dejas de enterarte de las actualizaciones y las limpiezas no se hacen.',
				array(
					'Entra en la portada de la web una vez y vuelve a analizar: muchas veces se desatasca solo.',
					'Si sigue igual, mira si en el wp-config.php hay una línea DISABLE_WP_CRON en true; si la hay y nadie programó un cron en IONOS, quítala.',
					'Tareas atascadas: ' . implode( ', ', array_slice( array_keys( $atrasos ), 0, 6 ) ),
				)
			);
		}

		$dup = array();
		foreach ( $cuenta as $hook => $n ) {
			if ( $n >= 5 ) {
				$dup[] = $hook . ' (' . $n . ')';
			}
		}
		if ( $dup ) {
			self::add(
				$st,
				'aviso',
				'Tareas programadas repetidas',
				'Estas tareas están apuntadas muchas veces: ' . implode( ', ', array_slice( $dup, 0, 6 ) ) . '.',
				'Hacen el mismo trabajo varias veces y cargan el servidor sin necesidad.',
				array(
					'Suele arreglarse desactivando y volviendo a activar el plugin que las crea.',
					'Si no sabes cuál es, apunta el nombre de la tarea y pregúntalo antes de tocar nada: no es urgente.',
				)
			);
		}

		if ( $total > 300 ) {
			self::add(
				$st,
				'aviso',
				'La lista de tareas programadas es enorme (' . $total . ')',
				'Un número tan alto suele venir de un plugin que apunta tareas y no las borra.',
				'Cada visita a la web tiene que leer esa lista entera: la web va más lenta.',
				array( 'Apunta el dato y revísalo cuando desactives plugins que ya no uses.' )
			);
		}
	}

	/* ═════════════════════════════════════════════════ 4. Plugins y temas */

	private static function check_plugins( &$st ) {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$map     = kp_shield_scan_map();
		$todos   = get_plugins();
		$activos = (array) get_option( 'active_plugins', array() );
		$off     = array();
		$ajenos  = array();

		$up = get_site_transient( 'update_plugins' );
		$oficiales = array();
		if ( $up ) {
			foreach ( array( 'response', 'no_update' ) as $k ) {
				if ( ! empty( $up->$k ) && is_array( $up->$k ) ) {
					foreach ( array_keys( $up->$k ) as $f ) {
						$oficiales[ $f ] = true;
					}
				}
			}
		}

		foreach ( $todos as $file => $data ) {
			$slug = dirname( $file );
			if ( ! in_array( $file, $activos, true ) && ! is_plugin_active_for_network( $file ) ) {
				$off[] = $data['Name'];
			}
			if ( ! isset( $oficiales[ $file ] ) && ! in_array( $slug, $map['own_slugs'], true ) ) {
				$ajenos[] = $data['Name'];
			}
		}

		if ( $off ) {
			self::add(
				$st,
				'medio',
				'Hay ' . count( $off ) . ' plugin(s) instalados pero apagados',
				'Están ahí sin usarse: ' . implode( ', ', array_slice( $off, 0, 8 ) ) . '.',
				'Un plugin apagado sigue teniendo sus ficheros en el servidor y sus fallos siguen siendo atacables; además nadie lo actualiza.',
				array(
					'Escritorio → Plugins.',
					'De los que ponen «Activar» (es decir, están apagados), pulsa «Borrar» en los que no vayas a usar.',
					'Si alguno lo quieres para más adelante, bórralo igual: se vuelve a instalar en un minuto.',
				)
			);
		}

		if ( $ajenos ) {
			self::add(
				$st,
				'aviso',
				'Plugins que no vienen del repositorio oficial de WordPress',
				implode( ', ', array_slice( $ajenos, 0, 8 ) ) . '. Los tuyos (Kuboplay Shield y el arcade) no cuentan: están hechos para esta web.',
				'Los plugins «de pago gratis» bajados de páginas raras son la primera causa de webs infectadas.',
				array(
					'Si lo instalaste tú a conciencia y sabes de dónde salió, no hay nada que hacer.',
					'Si no lo reconoces: Escritorio → Plugins → desactívalo, mira que la web sigue bien y bórralo.',
				)
			);
		}

		if ( ! empty( $up->response ) && is_array( $up->response ) ) {
			self::add(
				$st,
				'grave',
				'Hay ' . count( $up->response ) . ' plugin(s) con actualización pendiente',
				'Las actualizaciones de plugins suelen arreglar fallos de seguridad publicados.',
				'En cuanto se publica el fallo, los robots empiezan a probarlo en todas las webs.',
				array(
					'Escritorio → Plugins: marca los que tengan aviso y elige «Actualizar» en el desplegable de arriba.',
					'Antes, comprueba en IONOS que tienes una copia de seguridad reciente.',
					'Después abre la web y un juego para comprobar que todo sigue bien.',
				)
			);
		}

		$temas = wp_get_themes();
		$act   = wp_get_theme();
		$sobra = array();
		foreach ( $temas as $slug => $t ) {
			if ( $slug === $act->get_stylesheet() || $slug === $act->get_template() ) {
				continue;
			}
			$sobra[] = $t->get( 'Name' );
		}
		if ( count( $sobra ) > 1 ) {
			self::add(
				$st,
				'aviso',
				'Hay ' . count( $sobra ) . ' temas instalados que no se usan',
				'Temas sin usar: ' . implode( ', ', array_slice( $sobra, 0, 6 ) ) . '.',
				'Igual que los plugins apagados: ficheros que nadie actualiza y que siguen siendo atacables.',
				array(
					'Escritorio → Apariencia → Temas.',
					'Deja el que usas y uno de reserva de WordPress (por si el tuyo falla). Borra el resto con «Detalles del tema» → «Eliminar».',
				)
			);
		}

		// Drop-ins.
		$raros = array();
		foreach ( (array) @scandir( WP_CONTENT_DIR ) as $f ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			if ( ! $f || '.php' !== substr( $f, -4 ) ) {
				continue;
			}
			if ( ! in_array( $f, $map['dropins_ok'], true ) ) {
				$raros[] = $f;
			}
		}
		if ( $raros ) {
			self::add(
				$st,
				'medio',
				'Hay programas sueltos dentro de wp-content',
				'Ficheros encontrados: ' . implode( ', ', array_slice( $raros, 0, 6 ) ) . '. Esa carpeta solo debería tener carpetas y algún fichero especial conocido.',
				'Es un sitio habitual para dejar una puerta trasera, porque casi nadie mira ahí.',
				array(
					'IONOS → Administrador de archivos → wp-content.',
					'Descarga el fichero (copia de seguridad) y ábrelo con el bloc de notas.',
					'Si no reconoces lo que hay dentro, bórralo del servidor y comprueba que la web sigue bien.',
				)
			);
		}

		if ( is_writable( WP_PLUGIN_DIR ) && ( ! defined( 'DISALLOW_FILE_MODS' ) || ! DISALLOW_FILE_MODS ) ) {
			self::add(
				$st,
				'aviso',
				'La carpeta de plugins se puede escribir desde la web',
				'Es lo normal en IONOS (hace falta para instalar plugins desde el escritorio).',
				'Si alguien entra con tu contraseña, puede instalar lo que quiera sin FTP.',
				array(
					'No hay que tocar nada: es el precio de poder instalar plugins desde el escritorio.',
					'Lo que sí protege de verdad: contraseña larga, verificación en dos pasos en el correo y tener este plugin encendido.',
				)
			);
		}
	}

	/* ══════════════════════════════════════════════════════ 5. Integridad */

	/** Carpetas cuyas huellas se guardan: este plugin y el arcade. */
	private static function targets() {
		$t = array();

		$t[] = array(
			'id'  => 'shield',
			'nom' => 'Kuboplay Shield',
			'dir' => untrailingslashit( KP_Shield::dir() ),
			'ver' => KP_Shield::VERSION,
		);

		$cand = array(
			defined( 'WPMU_PLUGIN_DIR' ) ? WPMU_PLUGIN_DIR . '/arcade-core' : '',
			WP_PLUGIN_DIR . '/arcade-core',
		);
		foreach ( $cand as $d ) {
			if ( $d && is_dir( $d ) ) {
				$t[] = array(
					'id'  => 'arcade',
					'nom' => 'Arcade (juegos)',
					'dir' => untrailingslashit( $d ),
					'ver' => self::arcade_version( $d ),
				);
				break;
			}
		}
		return $t;
	}

	private static function arcade_version( $dir ) {
		if ( class_exists( 'Arcade_Core' ) && defined( 'Arcade_Core::VERSION' ) ) {
			return (string) constant( 'Arcade_Core::VERSION' );
		}
		foreach ( array( dirname( $dir ) . '/arcade-core.php', $dir . '/arcade-core.php' ) as $f ) {
			if ( is_readable( $f ) ) {
				$txt = self::head( $f, 4096 );
				if ( preg_match( '/const\s+VERSION\s*=\s*[\'"]([^\'"]+)/', $txt, $m ) ) {
					return $m[1];
				}
			}
		}
		return '?';
	}

	/** Huellas sha256 de los PHP de una carpeta (sin bajar a games/). */
	private static function hashes( $dir ) {
		$out = array();
		$q   = array( $dir );
		$n   = 0;
		while ( $q && $n < 800 ) {
			$d  = array_pop( $q );
			$dh = @opendir( $d ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			if ( ! $dh ) {
				continue;
			}
			while ( false !== ( $e = readdir( $dh ) ) ) {
				if ( '.' === $e || '..' === $e || 'games' === $e || is_link( $d . '/' . $e ) ) {
					continue;
				}
				$p = $d . '/' . $e;
				if ( is_dir( $p ) ) {
					$q[] = $p;
				} elseif ( '.php' === strtolower( substr( $e, -4 ) ) ) {
					$h = @hash_file( 'sha256', $p ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
					if ( $h ) {
						$out[ ltrim( str_replace( $dir, '', $p ), '/' ) ] = $h;
						$n++;
					}
				}
			}
			closedir( $dh );
		}
		ksort( $out );
		return $out;
	}

	/** Toma (o vuelve a tomar) las huellas de referencia. */
	public static function snapshot( $forzar = false ) {
		$base = (array) get_option( self::OPT_BASE, array() );
		foreach ( self::targets() as $t ) {
			if ( ! $forzar && isset( $base[ $t['id'] ] ) && $base[ $t['id'] ]['ver'] === $t['ver'] ) {
				continue;
			}
			$base[ $t['id'] ] = array(
				'ver'    => $t['ver'],
				'dir'    => $t['dir'],
				'fecha'  => time(),
				'files'  => self::hashes( $t['dir'] ),
			);
		}
		update_option( self::OPT_BASE, $base, false );
		self::$known = null;
		return $base;
	}

	/** ¿Este fichero coincide con la huella guardada al instalar? */
	private static function verified( $abs ) {
		if ( null === self::$known ) {
			self::$known = array();
			foreach ( (array) get_option( self::OPT_BASE, array() ) as $b ) {
				if ( empty( $b['dir'] ) || empty( $b['files'] ) ) {
					continue;
				}
				foreach ( $b['files'] as $rel => $h ) {
					self::$known[ $b['dir'] . '/' . $rel ] = $h;
				}
			}
		}
		if ( ! isset( self::$known[ $abs ] ) ) {
			return false;
		}
		return self::$known[ $abs ] === @hash_file( 'sha256', $abs ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
	}

	private static function check_integrity( &$st ) {
		if ( ! KP_Shield::opt( 'scan_int' ) ) {
			return;
		}
		$base = (array) get_option( self::OPT_BASE, array() );

		foreach ( self::targets() as $t ) {
			$b = isset( $base[ $t['id'] ] ) ? $base[ $t['id'] ] : null;

			if ( ! $b || empty( $b['files'] ) ) {
				self::snapshot( false );
				self::add(
					$st,
					'aviso',
					'Primer análisis de ' . $t['nom'] . ': huellas guardadas',
					'Se ha guardado la huella de cada fichero de ' . $t['nom'] . ' (versión ' . $t['ver'] . ').',
					'A partir de ahora, si alguien cambia uno sin actualizar el plugin, saldrá aquí.',
					array( 'No tienes que hacer nada. Es el punto de partida.' )
				);
				continue;
			}

			if ( (string) $b['ver'] !== (string) $t['ver'] ) {
				self::snapshot( false );
				self::add(
					$st,
					'aviso',
					$t['nom'] . ' se ha actualizado (' . $b['ver'] . ' → ' . $t['ver'] . ')',
					'Ha cambiado la versión, así que las huellas se han vuelto a tomar.',
					'Es lo normal después de subir una versión nueva del plugin.',
					array( 'No tienes que hacer nada.' )
				);
				continue;
			}

			$ahora   = self::hashes( $t['dir'] );
			$cambia  = array();
			$faltan  = array();
			$nuevos  = array();
			foreach ( $b['files'] as $rel => $h ) {
				if ( ! isset( $ahora[ $rel ] ) ) {
					$faltan[] = $rel;
				} elseif ( $ahora[ $rel ] !== $h ) {
					$cambia[] = $rel;
				}
			}
			foreach ( $ahora as $rel => $h ) {
				if ( ! isset( $b['files'][ $rel ] ) ) {
					$nuevos[] = $rel;
				}
			}

			if ( $cambia || $nuevos ) {
				self::add(
					$st,
					'grave',
					'Han cambiado ficheros de ' . $t['nom'] . ' sin que cambie la versión',
					'Distintos: ' . implode( ', ', array_slice( array_merge( $cambia, $nuevos ), 0, 6 ) ) . ( $nuevos ? ' (alguno es nuevo)' : '' ) . '.',
					'Si tú no has subido nada, alguien ha tocado el código del plugin: es la firma de una puerta trasera.',
					array(
						'Si acabas de subir una versión nueva del plugin a mano, pulsa «Volver a tomar las huellas» en esta misma pestaña.',
						'Si no has subido nada: descarga esos ficheros desde IONOS para guardarlos, y vuelve a instalar el plugin entero desde el zip original (Plugins → Añadir nuevo → Subir plugin → Reemplazar).',
						'Cambia después todas las contraseñas.',
					)
				);
			}
			if ( $faltan ) {
				self::add(
					$st,
					'medio',
					'Faltan ficheros de ' . $t['nom'],
					'No están: ' . implode( ', ', array_slice( $faltan, 0, 6 ) ) . '.',
					'El plugin puede estar a medio subir y dejar de proteger sin avisar.',
					array(
						'Vuelve a instalar el plugin desde el zip: Plugins → Añadir nuevo → Subir plugin → «Reemplazar actual con el subido».',
					)
				);
			}
		}
	}

	/* ══════════════════════════════════════════════════ Hallazgos y notas */

	private static function add( &$st, $level, $titulo, $what, $risk, $fix, $where = '' ) {
		if ( count( $st['find'] ) >= self::MAX_FIND ) {
			$st['cortado']++;
			return;
		}
		// Sin repetidos: una carpeta a medias se vuelve a recorrer en la pasada siguiente.
		$firma = md5( $level . '|' . $titulo . '|' . $where );
		if ( isset( $st['vistos'][ $firma ] ) ) {
			return;
		}
		$st['vistos'][ $firma ] = 1;

		$st['find'][] = array(
			'level' => in_array( $level, array( 'grave', 'medio', 'aviso' ), true ) ? $level : 'aviso',
			'tit'   => (string) $titulo,
			'que'   => (string) $what,
			'pasa'  => (string) $risk,
			'fix'   => array_values( array_map( 'strval', (array) $fix ) ),
			'donde' => (string) $where,
		);
	}

	/** Guarda el informe y calcula la nota. */
	private static function store( $st, $t0, $done ) {
		$c = array( 'grave' => 0, 'medio' => 0, 'aviso' => 0 );
		foreach ( $st['find'] as $f ) {
			$c[ $f['level'] ]++;
		}
		$nota = 100 - ( 18 * $c['grave'] ) - ( 7 * $c['medio'] ) - ( 2 * $c['aviso'] );
		$nota = max( 0, min( 100, $nota ) );

		update_option(
			self::OPT_RESULT,
			array(
				'fecha'   => time(),
				'segs'    => round( microtime( true ) - $t0, 2 ),
				'files'   => (int) $st['files'],
				'dirs'    => (int) $st['dirs'],
				'find'    => $st['find'],
				'cuenta'  => $c,
				'nota'    => $nota,
				'entero'  => (bool) $done,
				'cortado' => (int) $st['cortado'],
			),
			false
		);
	}

	public static function result() {
		$r = get_option( self::OPT_RESULT, array() );
		return is_array( $r ) ? $r : array();
	}

	/* ══════════════════════════════════════════════════════════ Utilidades */

	private static function rel( $abs ) {
		$root = untrailingslashit( str_replace( '\\', '/', ABSPATH ) );
		$abs  = str_replace( '\\', '/', $abs );
		return ltrim( str_replace( $root, '', $abs ), '/' );
	}

	private static function wp_config() {
		foreach ( array( ABSPATH . 'wp-config.php', dirname( ABSPATH ) . '/wp-config.php' ) as $f ) {
			if ( is_readable( $f ) ) {
				return $f;
			}
		}
		return '';
	}

	/* ════════════════════════════════════════════════════════════ Panel */

	public static function tab( $t ) {
		$t['vigilancia'] = __( 'Vigilancia', 'kuboplay-shield' );
		return $t;
	}

	public static function fields( $f ) {
		$f['vigilancia'] = array_merge(
			isset( $f['vigilancia'] ) ? (array) $f['vigilancia'] : array(),
			array(
				array(
					'key'     => 'scan_on',
					'label'   => 'Vigilar la web',
					'desc'    => 'Revisa los ficheros, las cuentas y la configuración buscando puertas traseras y descuidos. No toca nada: solo avisa. No se ejecuta en las visitas: solo cuando pulsas «Analizar ahora» y una vez al día.',
					'type'    => 'switch',
					'default' => 1,
				),
				array(
					'key'     => 'scan_cron',
					'label'   => 'Análisis diario automático',
					'desc'    => 'Una revisión al día, en segundo plano y por trozos, para que no cargue el servidor.',
					'type'    => 'switch',
					'default' => 1,
				),
				array(
					'key'     => 'scan_int',
					'label'   => 'Vigilar cambios en el plugin y en los juegos',
					'desc'    => 'Guarda una huella de cada fichero y avisa si alguno cambia sin que tú hayas subido una versión nueva.',
					'type'    => 'switch',
					'default' => 1,
				),
				array(
					'key'     => 'scan_budget',
					'label'   => 'Tiempo por pasada',
					'desc'    => 'Segundos que puede durar cada trozo del análisis. Si no le da tiempo a todo, continúa en la pasada siguiente. Súbelo solo si el análisis nunca termina.',
					'type'    => 'number',
					'default' => 4,
					'min'     => 1,
					'max'     => 30,
					'suffix'  => 'segundos',
				),
				array(
					'key'     => 'scan_files',
					'label'   => 'Ficheros por pasada',
					'desc'    => 'Tope de ficheros que se miran cada vez. Con 278 juegos hay muchos archivos: este tope es lo que evita que el análisis cargue el servidor.',
					'type'    => 'number',
					'default' => 3000,
					'min'     => 200,
					'max'     => 50000,
					'suffix'  => 'ficheros',
				),
				array(
					'key'     => 'scan_kb',
					'label'   => 'Tamaño máximo de fichero',
					'desc'    => 'Los ficheros más grandes que esto no se leen por dentro (se leería media memoria del servidor). Se cuentan aparte.',
					'type'    => 'number',
					'default' => 1024,
					'min'     => 64,
					'max'     => 8192,
					'suffix'  => 'KB',
				),
			)
		);
		return $f;
	}

	public static function tools( $t ) {
		$t[] = array( 'key' => 'scan', 'label' => __( 'Analizar ahora', 'kuboplay-shield' ) );
		$t[] = array( 'key' => 'scan_base', 'label' => __( 'Volver a tomar las huellas', 'kuboplay-shield' ) );
		$t[] = array( 'key' => 'scan_cache', 'label' => __( 'Blindar la carpeta de caché', 'kuboplay-shield' ) );
		return $t;
	}

	public static function tool_scan() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		self::run( true );
	}

	public static function tool_base() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		self::snapshot( true );
	}

	/**
	 * Única acción que escribe algo: un .htaccess que impide ejecutar PHP dentro
	 * de la carpeta de caché. Inocuo y reversible borrando el fichero.
	 */
	public static function tool_cache() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$dir = WP_CONTENT_DIR . '/cache';
		if ( ! is_dir( $dir ) || ! is_writable( $dir ) ) {
			return;
		}
		$f = $dir . '/.htaccess';
		if ( file_exists( $f ) ) {
			return;
		}
		$reglas = "# Kuboplay Shield: aquí no se ejecuta nada.\n<FilesMatch \"\\.(php|php3|php4|php5|php7|php8|phtml|phar)$\">\n\tRequire all denied\n</FilesMatch>\n";
		file_put_contents( $f, $reglas ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	}

	public static function notices( $n ) {
		$r = self::result();
		if ( empty( $r['fecha'] ) ) {
			$n[] = array( 'type' => 'info', 'text' => __( 'La vigilancia todavía no ha analizado la web. Pulsa «Analizar ahora» en la pestaña Vigilancia (tarda unos segundos).', 'kuboplay-shield' ) );
			return $n;
		}
		if ( ! empty( $r['cuenta']['grave'] ) ) {
			$n[] = array(
				'type' => 'warn',
				'text' => sprintf(
					/* translators: %d: número de hallazgos graves. */
					__( 'La vigilancia ha encontrado %d cosa(s) graves. Míralas en la pestaña Vigilancia: cada una trae los pasos para arreglarla.', 'kuboplay-shield' ),
					(int) $r['cuenta']['grave']
				),
			);
		}
		if ( empty( $r['entero'] ) ) {
			$n[] = array( 'type' => 'info', 'text' => __( 'El análisis se está haciendo por trozos y aún no ha terminado: la lista se completará en unos minutos.', 'kuboplay-shield' ) );
		}
		return $n;
	}

	public static function status( $s ) {
		$r = self::result();
		if ( empty( $r['fecha'] ) ) {
			return $s;
		}
		$g = (int) $r['cuenta']['grave'];
		$s[] = array(
			'label' => __( 'Nota de seguridad', 'kuboplay-shield' ),
			'value' => (int) $r['nota'] . '/100',
			'ok'    => ( 0 === $g && $r['nota'] >= 80 ),
		);
		$s[] = array(
			'label' => __( 'Último análisis', 'kuboplay-shield' ),
			/* translators: %s: tiempo transcurrido, por ejemplo «2 horas». */
			'value' => sprintf( __( 'hace %s', 'kuboplay-shield' ), human_time_diff( (int) $r['fecha'] ) ),
			'ok'    => ( time() - (int) $r['fecha'] ) < 3 * DAY_IN_SECONDS,
		);
		return $s;
	}

	/** Bloque con la lista de hallazgos (HTML ya escapado). */
	public static function panels( $p ) {
		$r = self::result();

		if ( empty( $r['fecha'] ) ) {
			$p[] = array(
				'tab'   => 'vigilancia',
				'title' => __( 'Resultado del análisis', 'kuboplay-shield' ),
				'html'  => '<p>' . esc_html__( 'Todavía no se ha analizado nada. Pulsa «Analizar ahora»: no toca ni borra nada, solo mira.', 'kuboplay-shield' ) . '</p>',
				'order' => 10,
			);
			return $p;
		}

		$c   = $r['cuenta'];
		$h   = '';
		$h  .= '<p class="kps-desc">' . esc_html(
			sprintf(
				/* translators: 1: fecha, 2: ficheros, 3: segundos. */
				__( 'Análisis del %1$s · %2$s ficheros mirados en %3$s segundos.', 'kuboplay-shield' ),
				wp_date( 'd/m/Y H:i', (int) $r['fecha'] ),
				number_format_i18n( (int) $r['files'] ),
				number_format_i18n( (float) $r['segs'], 2 )
			)
		) . '</p>';

		if ( empty( $r['entero'] ) ) {
			$h .= '<p class="kps-notice kps-info">' . esc_html__( 'Análisis a medias: continúa solo en unos minutos.', 'kuboplay-shield' ) . '</p>';
		}

		if ( ! $r['find'] ) {
			$h .= '<p class="kps-notice kps-ok">' . esc_html__( 'Ni un solo hallazgo. La web está limpia según todo lo que sabe mirar este análisis.', 'kuboplay-shield' ) . '</p>';
		} else {
			$h .= '<p>' . esc_html(
				sprintf(
					/* translators: 1: graves, 2: medios, 3: avisos. */
					__( 'Graves: %1$d · Medios: %2$d · Avisos: %3$d', 'kuboplay-shield' ),
					(int) $c['grave'],
					(int) $c['medio'],
					(int) $c['aviso']
				)
			) . '</p>';

			$rot = array(
				'grave' => __( 'GRAVE', 'kuboplay-shield' ),
				'medio' => __( 'MEDIO', 'kuboplay-shield' ),
				'aviso' => __( 'AVISO', 'kuboplay-shield' ),
			);

			foreach ( array( 'grave', 'medio', 'aviso' ) as $nivel ) {
				foreach ( $r['find'] as $f ) {
					if ( $f['level'] !== $nivel ) {
						continue;
					}
					$h .= '<div class="kps-notice kps-' . esc_attr( 'grave' === $nivel ? 'warn' : ( 'medio' === $nivel ? 'warn' : 'info' ) ) . '">';
					$h .= '<strong>[' . esc_html( $rot[ $nivel ] ) . '] ' . esc_html( $f['tit'] ) . '</strong><br>';
					$h .= esc_html( $f['que'] ) . '<br>';
					$h .= '<em>' . esc_html__( 'Si no se arregla:', 'kuboplay-shield' ) . '</em> ' . esc_html( $f['pasa'] );
					if ( '' !== $f['donde'] ) {
						$h .= '<br><code>' . esc_html( $f['donde'] ) . '</code>';
					}
					$h .= '<br><em>' . esc_html__( 'Cómo se arregla:', 'kuboplay-shield' ) . '</em><ol>';
					foreach ( $f['fix'] as $paso ) {
						$h .= '<li>' . esc_html( $paso ) . '</li>';
					}
					$h .= '</ol></div>';
				}
			}
		}

		if ( ! empty( $r['cortado'] ) ) {
			$h .= '<p class="kps-desc">' . esc_html(
				sprintf(
					/* translators: %d: ficheros no leídos. */
					__( '%d fichero(s) no se han mirado por dentro por ser demasiado grandes o por haberse llegado al tope de la lista.', 'kuboplay-shield' ),
					(int) $r['cortado']
				)
			) . '</p>';
		}

		$p[] = array(
			'tab'   => 'vigilancia',
			'title' => __( 'Resultado del análisis', 'kuboplay-shield' ),
			'html'  => $h,
			'order' => 10,
		);
		return $p;
	}
}

add_filter( 'kp_shield_defaults', array( 'KP_Shield_Scan', 'defaults' ) );
add_action( 'kp_shield_boot', array( 'KP_Shield_Scan', 'boot' ) );
add_action( 'kp_shield_activate', array( 'KP_Shield_Scan', 'activate' ) );
add_action( 'kp_shield_deactivate', array( 'KP_Shield_Scan', 'unschedule' ) );
