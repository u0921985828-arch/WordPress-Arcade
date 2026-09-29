<?php
/**
 * Kuboplay Shield — listas y patrones del módulo de seguridad.
 *
 * Aquí viven solo datos (sin lógica ni efectos) para poder revisarlos de un vistazo
 * y para afinar el cortafuegos sin tocar security.php.
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'kp_shield_rules' ) ) {

	/**
	 * Patrones del cortafuegos. Cada entrada: motivo => expresión regular (sin delimitadores).
	 * Se comprueban sobre la ruta y sobre los valores de la cadena de consulta ya decodificados
	 * y en minúsculas. Deben ser evidentes: nada de heurísticas que puedan pillar una búsqueda.
	 */
	function kp_shield_rules() {
		$path = array(
			// Ficheros y rutas que nadie legítimo pide.
			'env'       => '(^|/)\.env(\.|$)',
			'git'       => '(^|/)\.git(/|$)',
			'config'    => 'wp-config\.php|wp-config\.(bak|old|txt|save|orig|swp)',
			'backup'    => '(^|/)[^/]+\.(sql|bak|old|swp)$',
			'shell'     => '(^|/)(shell|c99|r57|wso|alfa|adminer|phpmyadmin|eval-stdin)\.php',
			'traversal' => '\.\./|/etc/passwd|/proc/self/environ',
			'wrapper'   => 'php:/|data:/|expect:/',
		);

		$query = array(
			'traversal' => '\.\./|/etc/passwd',
			'sqli'      => 'union\s+(all\s+)?select|information_schema\.|benchmark\s*\(|sleep\s*\(\s*\d|concat\s*\(\s*0x',
			'xss'       => '<\s*script|javascript\s*:|on(error|load|mouseover)\s*=',
			'rfi'       => '(https?|ftp)://[^ ]+\.(txt|php)(\?|$)|php:/|data:text/',
			'code'      => 'base64_decode\s*\(|eval\s*\(|passthru\s*\(|\$_(get|post|request)\[',
			'config'    => 'wp-config\.php|\.env(&|$)',
		);

		// Claves de la cadena de consulta que NO se analizan por valor: son texto libre del
		// visitante (buscador del portal) y WordPress ya las trata de forma segura.
		$free = array( 's', 'q', 'search', 'buscar', 'texto' );

		// Rutas propias del portal que el cortafuegos nunca debe tocar.
		$safe = array( '/tele', '/mando', '/wp-json/arcade/', '/manifest.webmanifest', '/ads.txt' );

		return apply_filters(
			'kp_shield_rules',
			array(
				'path'  => $path,
				'query' => $query,
				'free'  => $free,
				'safe'  => $safe,
			)
		);
	}
}

if ( ! function_exists( 'kp_shield_signals' ) ) {

	/**
	 * Datos del motor de detección (includes/detect.php). Solo datos, sin lógica.
	 *
	 * - `w`       puntos que suma (o resta) cada señal de comportamiento.
	 * - `tool`    agentes de usuario de herramientas automáticas (expresión regular).
	 * - `sens`    rutas sensibles que una visita normal del portal nunca pide.
	 * - `methods` métodos HTTP que se consideran normales.
	 * - `static`  extensiones de archivo estático (los juegos piden muchos seguidos).
	 * - `free`    prefijos de ruta del arcade que el motor no mira nunca.
	 */
	function kp_shield_signals() {
		$w = array(
			'ok'        => -0.6,  // petición con pinta de navegador de verdad: baja la sospecha
			'burst'     => 6,     // se ha quedado sin fichas del cubo (ritmo muy alto)
			'notfound'  => 5,     // página no encontrada
			'sens'      => 14,    // ruta sensible
			'nocookie'  => 1,     // ni una cookie (normal la primera vez, raro si insiste)
			'nolang'    => 3,     // sin cabecera Accept-Language
			'ua_empty'  => 12,    // sin agente de usuario
			'ua_tool'   => 10,    // curl, wget, python…
			'method'    => 20,    // método HTTP raro
			'enum'      => 18,    // ?author=N y similares
			'multiuser' => 12,    // la misma IP prueba muchos usuarios distintos
			'loginfail' => 8,     // fallo de acceso
			'net'       => 20,    // su rango está atacando una cuenta
			'fw'        => 40,    // el cortafuegos ha pillado un patrón de ataque
			'trap'      => 500,   // ha caído en la trampa: a la lista negra directo
		);

		$tool = 'curl|wget|python-requests|python-urllib|libwww|lwp::|go-http|httpclient|okhttp|'
			. 'java/|apache-httpclient|scrapy|nikto|sqlmap|nmap|masscan|zgrab|nuclei|wpscan|'
			. 'dirbuster|gobuster|feroxbuster|hydra|havij|acunetix|netsparker|zmeu|winhttp';

		$sens = '(^|/)(wp-config|configuration)\.|(^|/)\.(env|git|svn|aws|ssh)|'
			. '(^|/)(xmlrpc|adminer|phpmyadmin|pma|install|setup-config)\.php|'
			. '(^|/)(vendor|composer)\.(json|lock)$|/wp-content/(debug|error)\.log$';

		return apply_filters(
			'kp_shield_signals',
			array(
				'w'       => $w,
				'tool'    => $tool,
				'sens'    => $sens,
				'methods' => array( 'GET', 'POST', 'HEAD', 'OPTIONS' ),
				'static'  => 'css|js|mjs|json|webmanifest|png|jpe?g|webp|gif|svg|ico|avif|'
					. 'woff2?|ttf|otf|eot|mp3|ogg|wav|m4a|mp4|webm|map|txt|xml',
				'free'    => array(
					'/tele',
					'/mando',
					'/wp-json/arcade/',
					'/wp-content/plugins/arcade-core/',
					'/wp-content/mu-plugins/',
					'/wp-includes/',
					'/manifest.webmanifest',
					'/favicon.ico',
					'/ads.txt',
					'/robots.txt',
				),
			)
		);
	}
}
