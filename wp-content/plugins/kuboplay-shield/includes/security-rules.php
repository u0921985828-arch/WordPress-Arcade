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
