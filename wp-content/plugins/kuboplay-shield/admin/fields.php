<?php
/**
 * Campos del panel para los dos módulos.
 *
 * Los módulos declaran sus valores por defecto (`kp_shield_defaults`); aquí se
 * describen en el idioma del usuario para que el panel los pinte. Si un módulo
 * no está instalado, sus campos se omiten.
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

add_filter(
	'kp_shield_fields',
	function ( $f ) {
		if ( class_exists( 'KP_Shield_Security' ) ) {
			$f['seguridad'] = array_merge(
				isset( $f['seguridad'] ) ? $f['seguridad'] : array(),
				array(
					array(
						'key'     => 'rl_on',
						'label'   => 'Límite de visitas por minuto',
						'desc'    => 'Corta a quien pide muchas páginas seguidas desde la misma conexión. Es lo que frena los robots que rastrean la web entera.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'rl_max',
						'label'   => 'Páginas por minuto',
						'desc'    => 'Cuántas páginas puede pedir una misma conexión en un minuto antes de que se le diga que espere. Una persona jugando no pasa de 60.',
						'type'    => 'number',
						'default' => 240,
						'min'     => 30,
						'max'     => 2000,
						'suffix'  => 'por minuto',
					),
					array(
						'key'     => 'rl_max_login',
						'label'   => 'Intentos de acceso por minuto',
						'desc'    => 'Lo mismo, pero solo para la pantalla de acceso.',
						'type'    => 'number',
						'default' => 30,
						'min'     => 3,
						'max'     => 300,
						'suffix'  => 'por minuto',
					),
					array(
						'key'     => 'login_on',
						'label'   => 'Blindar el acceso',
						'desc'    => 'Bloquea temporalmente a quien falla la contraseña varias veces, y no dice si lo que falló fue el usuario o la contraseña.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'login_max',
						'label'   => 'Fallos antes de bloquear',
						'desc'    => 'Tras estos fallos, esa conexión espera 1 minuto; si insiste, 5; y luego 30.',
						'type'    => 'number',
						'default' => 5,
						'min'     => 3,
						'max'     => 20,
						'suffix'  => 'fallos',
					),
					array(
						'key'         => 'login_slug',
						'label'       => 'Dirección propia para entrar',
						'desc'        => 'Cambia la dirección del acceso. Los robots que atacan wp-login.php dejan de encontrarlo. Déjalo vacío para no tocar nada. Apunta la dirección nueva antes de guardar.',
						'type'        => 'text',
						'default'     => '',
						'placeholder' => 'acceso',
						'preview'     => 'url',
						'confirm'     => 'Sí, he apuntado la dirección nueva',
						'warn'        => 'Si la olvidas, se recupera renombrando la carpeta del plugin desde el gestor de archivos de IONOS (paso a paso en docs/SEGURIDAD.md).',
					),
					array(
						'key'     => 'fw_on',
						'label'   => 'Cortafuegos de direcciones raras',
						'desc'    => 'Rechaza las peticiones con pinta de ataque (archivos de configuración, copias de seguridad, inyecciones).',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'         => 'fw_allow',
						'label'       => 'Excepciones del cortafuegos',
						'desc'        => 'Una ruta o fragmento por línea, si algo legítimo se bloquea por error.',
						'type'        => 'text',
						'default'     => '',
						'placeholder' => '/mi-ruta',
					),
					array(
						'key'     => 'hard_xmlrpc',
						'label'   => 'Apagar XML-RPC',
						'desc'    => 'Puerta antigua de WordPress que casi nadie usa y que los robots aprovechan para probar contraseñas en masa.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'hard_enum',
						'label'   => 'Ocultar la lista de usuarios',
						'desc'    => 'Impide averiguar tu nombre de usuario desde fuera.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'hard_version',
						'label'   => 'Ocultar la versión de WordPress',
						'desc'    => 'Menos pistas para quien busca versiones con fallos conocidos.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'hard_editor',
						'label'   => 'Desactivar el editor de archivos',
						'desc'    => 'Si alguien entrara en el escritorio, no podría cambiar el código del tema desde ahí.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'hard_uploads',
						'label'   => 'Blindar la carpeta de subidas',
						'desc'    => 'Impide que se ejecute nada que se haya colado entre las imágenes.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'hdr_on',
						'label'   => 'Cabeceras de seguridad',
						'desc'    => 'Instrucciones al navegador para que no haga cosas peligrosas con tu web. Compatibles con los juegos y con el modo tele.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'hdr_hsts',
						'label'   => 'Forzar HTTPS (HSTS)',
						'desc'    => 'Obliga al navegador a usar siempre la versión segura. Enciéndelo solo cuando el candado funcione bien en el dominio definitivo.',
						'type'    => 'switch',
						'default' => 0,
						'warn'    => 'Si luego el certificado falla, la web deja de abrirse durante un tiempo. Enciéndelo con el dominio ya funcionando.',
					),
					array(
						'key'     => 'log_on',
						'label'   => 'Contar los bloqueos',
						'desc'    => 'Guarda solo un número por día y motivo, para la tarjeta de estado. No se guardan direcciones IP ni sale nada del servidor.',
						'type'    => 'switch',
						'default' => 1,
					),
				)
			);
		}

		if ( class_exists( 'KP_Perf' ) ) {
			$f['rendimiento'] = array_merge(
				isset( $f['rendimiento'] ) ? $f['rendimiento'] : array(),
				array(
					array(
						'key'     => 'perf_cache',
						'label'   => 'Caché de páginas',
						'desc'    => 'Guarda la página ya montada y la sirve tal cual a la siguiente visita. Es lo que más acelera la web (de ~33 ms a menos de 1 ms). Quien tiene sesión iniciada nunca ve caché.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'perf_cache_ttl',
						'label'   => 'Duración de la caché',
						'desc'    => 'Segundos que se guarda una página antes de volver a montarla. Al publicar o editar algo se vacía sola.',
						'type'    => 'number',
						'default' => 28800,
						'min'     => 60,
						'max'     => 604800,
						'suffix'  => 'segundos',
					),
					array(
						'key'         => 'perf_cache_qs',
						'label'       => 'Parámetros que se cachean',
						'desc'        => 'Separados por comas. Cualquier otro parámetro en la dirección hace que la página se monte al momento.',
						'type'        => 'text',
						'default'     => 'paged,page,orden,cat,g',
						'placeholder' => 'paged,page,orden,cat,g',
					),
					array(
						'key'     => 'perf_cache_mob',
						'label'   => 'Caché separada para móvil',
						'desc'    => 'Solo hace falta si el tema sirve HTML distinto en el móvil. En Kuboplay no es el caso: déjalo apagado.',
						'type'    => 'switch',
						'default' => 0,
					),
					array(
						'key'     => 'perf_cond',
						'label'   => 'Reaprovechar lo ya descargado',
						'desc'    => 'Si el visitante ya tiene la página y no ha cambiado, el servidor responde «sigue igual» en vez de mandarla entera.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'perf_gzip',
						'label'   => 'Comprimir el HTML',
						'desc'    => 'Solo actúa si el servidor no comprime ya por su cuenta.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'perf_light',
						'label'   => 'Aligerar la parte pública',
						'desc'    => 'Quita lo que WordPress carga y el portal no usa: emojis, incrustaciones, iconos del escritorio y etiquetas antiguas.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'perf_defer',
						'label'   => 'Retrasar el JavaScript accesorio',
						'desc'    => 'La página se ve antes. Nunca toca los scripts del arcade ni jQuery, pero si algún plugin se comporta raro, apágalo.',
						'type'    => 'switch',
						'default' => 0,
					),
					array(
						'key'     => 'perf_db',
						'label'   => 'Aligerar la base de datos',
						'desc'    => 'Limita las revisiones guardadas, vacía la papelera y baja el ritmo con el que el escritorio consulta al servidor.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'perf_revisions',
						'label'   => 'Revisiones por entrada',
						'desc'    => 'Cuántas versiones antiguas se guardan de cada página o juego.',
						'type'    => 'number',
						'default' => 5,
						'min'     => 0,
						'max'     => 50,
						'suffix'  => 'versiones',
					),
					array(
						'key'     => 'perf_trash_days',
						'label'   => 'Días en la papelera',
						'desc'    => 'Pasado ese tiempo, lo borrado se elimina del todo.',
						'type'    => 'number',
						'default' => 7,
						'min'     => 1,
						'max'     => 90,
						'suffix'  => 'días',
					),
					array(
						'key'     => 'perf_heartbeat',
						'label'   => 'Ritmo del escritorio',
						'desc'    => 'Segundos entre consultas automáticas mientras tienes el escritorio abierto. Más alto, menos carga.',
						'type'    => 'number',
						'default' => 60,
						'min'     => 15,
						'max'     => 300,
						'suffix'  => 'segundos',
					),
					array(
						'key'     => 'perf_transients',
						'label'   => 'Limpieza diaria',
						'desc'    => 'Borra cada día los datos temporales ya caducados.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'perf_img',
						'label'   => 'Imágenes más listas',
						'desc'    => 'Carga las miniaturas según van haciendo falta y da prioridad a la primera imagen de cada ficha.',
						'type'    => 'switch',
						'default' => 1,
					),
				)
			);
		}

		return $f;
	}
);
