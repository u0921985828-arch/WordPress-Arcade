<?php
/**
 * Kuboplay Shield — listas y patrones del escáner de integridad.
 *
 * Aquí viven SOLO datos (patrones, listas y textos), sin lógica ni efectos, para
 * poder revisarlos de un vistazo y afinar el escáner sin tocar scan.php.
 *
 * Todas las expresiones son locales: el escáner no consulta ninguna lista remota
 * ni envía nada fuera del servidor.
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'kp_shield_scan_sigs' ) ) {

	/**
	 * Firmas que se buscan dentro de los ficheros PHP.
	 *
	 * Cada entrada:
	 *   re     → expresión regular (sin delimitadores; se aplica con /i y /S).
	 *   level  → grave | medio | aviso.
	 *   weak   → true si por sí sola no dice nada: solo se informa cuando el mismo
 *            fichero ha disparado además alguna firma de las de verdad.
 *   core   → true si la firma también vale dentro de wp-admin/ y wp-includes/.
	 *            Las demás producirían falsos positivos (el propio WordPress usa
	 *            shell_exec en ID3, popen en PHPMailer, etc.).
	 *   what   → qué es, en una frase.
	 *   risk   → qué pasa si no se arregla, en una frase.
	 *
	 * @return array
	 */
	function kp_shield_scan_sigs() {
		$s = array(

			// ── Ejecución de código ──────────────────────────────────────────
			'eval'      => array(
				're'    => '(?<![a-z0-9_>$:])eval\s*\(',
				'level' => 'grave',
				'core'  => true,
				'what'  => 'El fichero ejecuta texto como si fuera código (eval). Es la pieza central de casi todas las puertas traseras.',
				'risk'  => 'Quien haya dejado eso ahí puede ejecutar lo que quiera en tu web cuando quiera.',
			),
			'b64_eval'  => array(
				're'    => '(?:eval|assert|create_function|preg_replace|call_user_func)\s*\([^\n]{0,160}base64_decode',
				'level' => 'grave',
				'core'  => true,
				'what'  => 'Código escondido: se descodifica un texto y se ejecuta en el mismo paso.',
				'risk'  => 'Es la forma más común de puerta trasera. Da el control de la web a un tercero.',
			),
			'preg_e'    => array(
				're'    => 'preg_replace\s*\(\s*([\'"])(?:\\\\.|[^\'"\\\\])*e\1',
				'level' => 'grave',
				'core'  => true,
				'what'  => 'Uso de preg_replace con la opción /e, que ejecuta código. PHP la eliminó hace años.',
				'risk'  => 'Truco clásico para ejecutar órdenes a escondidas.',
			),
			'create_fn' => array(
				're'    => '(?<![a-z0-9_>$:])create_function\s*\(',
				'level' => 'grave',
				'core'  => true,
				'what'  => 'Uso de create_function, retirado de PHP y habitual en código malicioso antiguo.',
				'risk'  => 'O es una puerta trasera, o es código tan viejo que romperá la web al actualizar PHP.',
			),
			'req_exec'  => array(
				're'    => '(?:eval|assert|system|passthru|shell_exec|exec|popen|proc_open|include|require|file_put_contents)\s*\(\s*(?:@)?\$_(?:GET|POST|REQUEST|COOKIE|FILES)\b',
				'level' => 'grave',
				'core'  => true,
				'what'  => 'El fichero ejecuta o guarda directamente lo que le llega por la dirección o por un formulario.',
				'risk'  => 'Cualquiera que conozca la dirección puede mandar órdenes a tu servidor.',
			),
			'wpconfig'  => array(
				're'    => '(?:file_put_contents|fwrite|fopen|copy|rename|unlink)\s*\([^\n)]{0,120}wp-config\.php',
				'level' => 'grave',
				'core'  => true,
				'what'  => 'El fichero escribe o borra el wp-config.php, donde están las claves y la contraseña de la base de datos.',
				'risk'  => 'Se pueden robar las claves del sitio o dejar un acceso permanente.',
			),
			'shell'     => array(
				're'    => '(?<![a-z0-9_>$:])(?:system|passthru|shell_exec|proc_open|popen|pcntl_exec)\s*\(',
				'level' => 'grave',
				'core'  => false,
				'what'  => 'El fichero lanza órdenes del sistema operativo del servidor.',
				'risk'  => 'Un plugin normal no necesita esto: suele ser el indicio de un intruso con control del servidor.',
			),
			'exec'      => array(
				're'    => '(?<![a-z0-9_>$:\-])exec\s*\(',
				'level' => 'medio',
				'core'  => false,
				'what'  => 'El fichero lanza un programa del servidor (exec).',
				'risk'  => 'Puede ser legítimo (tratar imágenes o vídeo), pero conviene mirar quién lo puso ahí.',
			),
			'assert'    => array(
				're'    => '(?<![a-z0-9_>$:])assert\s*\(\s*[\'"]',
				'level' => 'medio',
				'core'  => false,
				'what'  => 'Uso de assert() con texto, que en PHP antiguo ejecutaba ese texto como código.',
				'risk'  => 'Es una manera discreta de colar un eval sin escribir «eval».',
			),

			// ── Ofuscación ───────────────────────────────────────────────────
			'gzinflate' => array(
				're'    => '(?:gzinflate|gzuncompress|gzdecode)\s*\(\s*(?:@)?(?:base64_decode|str_rot13|\$)',
				'level' => 'medio',
				'core'  => false,
				'what'  => 'Código comprimido y codificado para que no se pueda leer.',
				'risk'  => 'Nadie comprime su propio código fuente: casi siempre es para esconder algo.',
			),
			'rot13'     => array(
				're'    => '(?<![a-z0-9_>$:])str_rot13\s*\(',
				'level' => 'medio',
				'core'  => false,
				'what'  => 'Texto cifrado con el truco ROT13, muy usado para disimular direcciones y órdenes.',
				'risk'  => 'Suele acompañar a una puerta trasera.',
			),
			'b64'       => array(
				're'    => '(?<![a-z0-9_>$:])base64_decode\s*\(',
				'level' => 'aviso',
				'core'  => false,
				'weak'  => true,
				'what'  => 'El fichero descodifica texto en base64.',
				'risk'  => 'A veces es normal (imágenes, correos). Solo preocupa si el fichero no debería estar ahí.',
			),
			'blob'      => array(
				're'    => '[A-Za-z0-9+/]{600,}={0,2}',
				'level' => 'medio',
				'core'  => false,
				'what'  => 'Un bloque de texto codificado larguísimo dentro del código.',
				'risk'  => 'Es el sitio donde se suele guardar el programa del intruso, ya escondido.',
			),
			'varvar'    => array(
				're'    => '\$\$[a-z_]|\$\{\s*\$',
				'level' => 'aviso',
				'core'  => false,
				'weak'  => true,
				'what'  => 'Nombres de variables construidos al vuelo, una técnica para despistar a quien lea el código.',
				'risk'  => 'Legítimo casi nunca; habitual en código malicioso.',
			),
			'chr_obf'   => array(
				're'    => 'chr\s*\(\s*\d{1,3}\s*\)\s*\.\s*chr\s*\(',
				'level' => 'aviso',
				'core'  => false,
				'weak'  => true,
				'what'  => 'Palabras escritas letra a letra con chr() para que no se puedan buscar.',
				'risk'  => 'Se usa para esconder órdenes como «system» o «eval».',
			),
			'hidden_in' => array(
				're'    => '(?:include|require)(?:_once)?\s*\(?\s*[\'"][^\'"\n]*\.(?:ico|jpg|png|gif|txt|log|css|woff2?)[\'"]',
				'level' => 'grave',
				'core'  => true,
				'what'  => 'El fichero carga como código algo disfrazado de imagen o de texto.',
				'risk'  => 'Truco típico para esconder la puerta trasera donde nadie la busca.',
			),

			// ── Firmas de shells conocidos ───────────────────────────────────
			'shell_sig' => array(
				're'    => 'FilesMan|c99shell|r57shell|b374k|IndoXploit|wso_version|WSO\s*\d|Mini\s*Shell|priv8|antichat|GIFTSHOP|Shell by |PHP\s*Terminal|by\s*KingDefacer|uname\s*-a',
				'level' => 'grave',
				'core'  => true,
				'what'  => 'Texto propio de un panel de intruso conocido (una «shell»).',
				'risk'  => 'Si esto está aquí, alguien ya ha entrado. Hay que limpiarlo hoy.',
			),
			'spam_sig'  => array(
				're'    => '(?:HTTP_USER_AGENT[^\n]{0,80}(?:googlebot|bingbot)|\bis_bot\b[^\n]{0,40}(?:viagra|casino|cialis))',
				'level' => 'medio',
				'core'  => false,
				'what'  => 'Código que se comporta distinto cuando quien visita es Google.',
				'risk'  => 'Es la marca del spam de buscadores: Google acaba marcando la web como peligrosa.',
			),
		);

		return apply_filters( 'kp_shield_scan_sigs', $s );
	}
}

if ( ! function_exists( 'kp_shield_scan_map' ) ) {

	/**
	 * Listas de recorrido: qué se mira, qué se salta y qué es un falso positivo conocido.
	 *
	 * @return array
	 */
	function kp_shield_scan_map() {
		$m = array(

			// Carpetas que nunca se recorren (ni ellas ni lo que hay dentro).
			'skip_dirs'  => array(
				'.git', '.svn', '.hg', 'node_modules', '.idea', '.vscode', '.well-known',
				'wp-content/upgrade', 'wp-content/upgrade-temp-backup', 'wp-content/backups',
				'wp-content/mu-plugins/arcade-core/games', // 283 juegos: solo JS, HTML y webp.
				'wp-content/plugins/arcade-core/games',
			),

			// Extensiones que se abren y se analizan por dentro.
			'php_ext'    => array( 'php', 'php3', 'php4', 'php5', 'php7', 'php8', 'phtml', 'phps', 'phar', 'inc', 'module' ),

			// Extensiones que el servidor puede ejecutar como PHP (para la regla de sitio).
			'exec_ext'   => array( 'php', 'php3', 'php4', 'php5', 'php7', 'php8', 'phtml', 'phar' ),

			// Carpetas donde NO debe existir ningún PHP ejecutable, pase lo que pase.
			'no_php'     => array(
				'wp-content/uploads',
				'wp-content/cache',
				'wp-content/w3tc-config',
			),

			// Ficheros PHP que SÍ pueden estar en esas carpetas (los crea este plugin).
			'no_php_ok'  => array(
				'wp-content/cache/kp/config.php',
			),

			// Nombres de fichero con pinta de panel de intruso.
			'bad_names'  => array(
				'shell', 'c99', 'r57', 'wso', 'alfa', 'b374k', 'adminer', 'phpmyadmin',
				'eval-stdin', 'cmd', 'up', 'upload', 'uploader', 'mini', 'marijuana',
				'xmrlpc', 'wp-conflg', 'wp-cofig', 'wp-login-old', 'radio', 'gel4y',
				'wp-file-manager', 'filemanager', 'roor', 'indoxploit',
			),

			// Rutas del propio WordPress que usan estas funciones de forma legítima.
			'core_ok'    => array(
				'wp-admin/includes/class-pclzip.php',
				'wp-includes/class-snoopy.php',
				'wp-includes/class-json.php',
				'wp-includes/ID3/',
				'wp-includes/PHPMailer/',
				'wp-includes/SimplePie/',
				'wp-includes/Requests/',
				'wp-includes/IXR/',
				'wp-includes/Text/Diff/',
				'wp-includes/sodium_compat/',
				'wp-includes/class-phpass.php',
				'wp-includes/class-wp-simplepie-sanitize-kses.php',
			),

			// Ficheros de este repo que contienen los patrones como TEXTO (las propias
			// reglas). Además, todo fichero cuya huella coincide con la guardada al
			// instalar se salta igual: ver KP_Shield_Scan::baseline().
			'self_ok'    => array(
				'kuboplay-shield/includes/scan-rules.php',
				'kuboplay-shield/includes/scan.php',
				'kuboplay-shield/includes/security-rules.php',
			),

			// Drop-ins esperados en wp-content (los demás se avisan).
			'dropins_ok' => array( 'advanced-cache.php', 'object-cache.php', 'db.php', 'maintenance.php', 'index.php' ),

			// Ficheros y plugins que pone el hosting (IONOS) al crear la web. Usan
			// código dinámico de forma legítima: se avisan, pero nunca como GRAVE.
			'host_files' => array(
				'it-api.php'                 => 'IONOS',
				'ionos-assistant'            => 'IONOS',
				'ionos-essentials'           => 'IONOS',
				'ionos-marketplace'          => 'IONOS',
				'ionos-performance'          => 'IONOS',
				'one-time-login'             => 'IONOS',
				'mu-plugin-loader.php'        => 'IONOS',
				'wp-content/mu-plugins/ionos' => 'IONOS',
			),

			// Plugins propios: no están en el repositorio oficial y es correcto.
			'own_slugs'  => array( 'kuboplay-shield', 'arcade-core' ),

			// Dominios de correo habituales (no son motivo de sospecha).
			'mail_ok'    => array(
				'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'outlook.com',
				'outlook.es', 'live.com', 'msn.com', 'yahoo.com', 'yahoo.es', 'icloud.com',
				'me.com', 'proton.me', 'protonmail.com', 'telefonica.net', 'movistar.es',
				'ionos.es', 'ionos.com', 'example.com',
			),
		);

		return apply_filters( 'kp_shield_scan_map', $m );
	}
}
