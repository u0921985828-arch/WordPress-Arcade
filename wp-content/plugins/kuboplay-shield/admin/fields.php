<?php
/**
 * Campos del panel para los dos módulos.
 *
 * Los módulos declaran sus valores por defecto (`kp_shield_defaults`); aquí se
 * describen en el idioma del usuario para que el panel los pinte. Si un módulo
 * no está instalado, sus campos se omiten.
 *
 * Dos claves nuevas en cada campo:
 *   - 'impact': qué pasa de verdad si lo cambias. Va en todos los delicados.
 *   - 'adv'   : true = se pliega dentro de «Ver todos los ajustes». A la vista
 *               quedan los seis de cada pestaña que se tocan de verdad.
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
						'impact'  => 'Apagado, un robot puede recorrer los 278 juegos a toda velocidad y dejar el servidor lento para quien está jugando.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'login_on',
						'label'   => 'Blindar el acceso',
						'desc'    => 'Bloquea temporalmente a quien falla la contraseña varias veces, y no dice si lo que falló fue el usuario o la contraseña.',
						'impact'  => 'Apagado, se puede probar contraseñas sin descanso y el mensaje de error vuelve a chivar si el usuario existe.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'         => 'login_slug',
						'label'       => 'Dirección propia para entrar',
						'desc'        => 'Cambia la dirección del acceso. Los robots que atacan wp-login.php dejan de encontrarlo. Déjalo vacío para no tocar nada.',
						'impact'      => 'Si lo cambias, wp-login.php deja de existir para todo el mundo, tú incluido: hay que entrar por la dirección nueva. Apúntala antes de guardar.',
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
						'impact'  => 'Apagado, esas peticiones llegan a WordPress. No suelen colar nada por sí solas, pero es la red de seguridad si algún día hay un plugin con un fallo.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'hdr_on',
						'label'   => 'Cabeceras de seguridad',
						'desc'    => 'Instrucciones al navegador para que no haga cosas peligrosas con tu web. Compatibles con los juegos y con el modo tele.',
						'impact'  => 'Apagado, cualquier web de fuera puede meter la tuya dentro de un marco y hacerla pasar por suya.',
						'type'    => 'switch',
						'default' => 1,
					),

					/* ── A partir de aquí, ajustes finos ────────────────── */

					array(
						'key'     => 'rl_max',
						'label'   => 'Páginas por minuto',
						'desc'    => 'Cuántas páginas puede pedir una misma conexión en un minuto antes de que se le diga que espere. Una persona jugando no pasa de 60.',
						'impact'  => 'Muy bajo, una casa entera compartiendo wifi puede acabar bloqueada sin haber hecho nada raro. Muy alto, deja de frenar a los robots.',
						'type'    => 'number',
						'default' => 240,
						'min'     => 30,
						'max'     => 2000,
						'suffix'  => 'por minuto',
						'adv'     => true,
					),
					array(
						'key'     => 'rl_max_login',
						'label'   => 'Intentos de acceso por minuto',
						'desc'    => 'Lo mismo, pero solo para la pantalla de acceso.',
						'impact'  => 'Bajarlo aprieta más a los robots; si te equivocas al escribir la contraseña varias veces seguidas, te tocará esperar a ti también.',
						'type'    => 'number',
						'default' => 30,
						'min'     => 3,
						'max'     => 300,
						'suffix'  => 'por minuto',
						'adv'     => true,
					),
					array(
						'key'     => 'login_max',
						'label'   => 'Fallos antes de bloquear',
						'desc'    => 'Tras estos fallos, esa conexión espera 1 minuto; si insiste, 5; y luego 30.',
						'impact'  => 'Con 3 es más seguro pero también más fácil que te bloquees tú solo desde el móvil.',
						'type'    => 'number',
						'default' => 5,
						'min'     => 3,
						'max'     => 20,
						'suffix'  => 'fallos',
						'adv'     => true,
					),
					array(
						'key'         => 'fw_allow',
						'label'       => 'Excepciones del cortafuegos',
						'desc'        => 'Una ruta o fragmento por línea, si algo legítimo se bloquea por error.',
						'impact'      => 'Cada excepción es una puerta que deja de mirarse. Pon solo lo que sepas que es tuyo.',
						'type'        => 'text',
						'default'     => '',
						'placeholder' => '/mi-ruta',
						'adv'         => true,
					),
					array(
						'key'     => 'hard_xmlrpc',
						'label'   => 'Apagar XML-RPC',
						'desc'    => 'Puerta antigua de WordPress que casi nadie usa y que los robots aprovechan para probar contraseñas en masa.',
						'impact'  => 'Solo hace falta encenderlo si usas la app oficial de WordPress o Jetpack. Para Kuboplay, no.',
						'type'    => 'switch',
						'default' => 1,
						'adv'     => true,
					),
					array(
						'key'     => 'hard_enum',
						'label'   => 'Ocultar la lista de usuarios',
						'desc'    => 'Impide averiguar tu nombre de usuario desde fuera.',
						'impact'  => 'Apagado, cualquiera puede sacar tu nombre de usuario en dos peticiones y ya solo le falta la contraseña.',
						'type'    => 'switch',
						'default' => 1,
						'adv'     => true,
					),
					array(
						'key'     => 'hard_version',
						'label'   => 'Ocultar la versión de WordPress',
						'desc'    => 'Menos pistas para quien busca versiones con fallos conocidos.',
						'impact'  => 'No protege por sí solo: solo evita que te encuentren buscando «webs con la versión X».',
						'type'    => 'switch',
						'default' => 1,
						'adv'     => true,
					),
					array(
						'key'     => 'hard_editor',
						'label'   => 'Desactivar el editor de archivos',
						'desc'    => 'Si alguien entrara en el escritorio, no podría cambiar el código del tema desde ahí.',
						'impact'  => 'Encendido, tú tampoco podrás editar el tema desde el escritorio (los cambios del arcade se suben por zip igual que siempre).',
						'type'    => 'switch',
						'default' => 1,
						'adv'     => true,
					),
					array(
						'key'     => 'hard_uploads',
						'label'   => 'Blindar la carpeta de subidas',
						'desc'    => 'Impide que se ejecute nada que se haya colado entre las imágenes.',
						'impact'  => 'Escribe un .htaccess dentro de wp-content/uploads. Si tu hosting no lo permite, verás un aviso y no pasa nada más.',
						'type'    => 'switch',
						'default' => 1,
						'adv'     => true,
					),
					array(
						'key'     => 'hdr_hsts',
						'label'   => 'Forzar HTTPS (HSTS)',
						'desc'    => 'Obliga al navegador a usar siempre la versión segura. Enciéndelo solo cuando el candado funcione bien en el dominio definitivo.',
						'impact'  => 'Es el ajuste más difícil de deshacer: el navegador de cada visitante lo recuerda durante meses. Si el certificado falla, la web deja de abrirse para ellos aunque tú lo apagues aquí.',
						'type'    => 'switch',
						'default' => 0,
						'warn'    => 'Enciéndelo solo con el dominio definitivo ya funcionando y el candado verde.',
						'adv'     => true,
					),
					array(
						'key'     => 'log_on',
						'label'   => 'Contar los bloqueos',
						'desc'    => 'Guarda solo un número por día y motivo, para la tarjeta de estado y la gráfica. No se guardan direcciones IP ni sale nada del servidor.',
						'impact'  => 'Apagado, la gráfica de 30 días deja de llenarse y te quedas sin saber qué está pasando.',
						'type'    => 'switch',
						'default' => 1,
						'adv'     => true,
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
						'desc'    => 'Guarda la página ya montada y la sirve tal cual a la siguiente visita. Es lo que más acelera la web (de ~34 ms a menos de 1 ms). Quien tiene sesión iniciada nunca ve caché.',
						'impact'  => 'Apagada, cada visita vuelve a montar la página entera. Se nota sobre todo en móvil y con varias personas a la vez.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'perf_cond',
						'label'   => 'Reaprovechar lo ya descargado',
						'desc'    => 'Si el visitante ya tiene la página y no ha cambiado, el servidor responde «sigue igual» en vez de mandarla entera.',
						'impact'  => 'Apagado, se vuelve a enviar todo el HTML en cada visita. Gasta más datos del móvil del visitante.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'perf_light',
						'label'   => 'Aligerar la parte pública',
						'desc'    => 'Quita lo que WordPress carga y el portal no usa: emojis, incrustaciones, iconos del escritorio y etiquetas antiguas.',
						'impact'  => 'Si algún día usas un plugin que necesite esas piezas, apágalo y vuelve a probar.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'perf_img',
						'label'   => 'Imágenes más listas',
						'desc'    => 'Carga las miniaturas según van haciendo falta y da prioridad a la primera imagen de cada ficha.',
						'impact'  => 'Apagado, el móvil descarga de golpe las miniaturas de toda la parrilla aunque no se vean.',
						'type'    => 'switch',
						'default' => 1,
					),
					array(
						'key'     => 'perf_db',
						'label'   => 'Aligerar la base de datos',
						'desc'    => 'Limita las revisiones guardadas, vacía la papelera y baja el ritmo con el que el escritorio consulta al servidor.',
						'impact'  => 'Con menos revisiones se recuperan menos versiones antiguas de una página. El contenido publicado no se toca nunca.',
						'type'    => 'switch',
						'default' => 1,
					),

					/* ── A partir de aquí, ajustes finos ────────────────── */

					array(
						'key'     => 'perf_cache_ttl',
						'label'   => 'Duración de la caché',
						'desc'    => 'Segundos que se guarda una página antes de volver a montarla. Al publicar o editar algo se vacía sola.',
						'impact'  => 'Más alto, más rápido y menos carga; un cambio hecho a mano en la base de datos tarda más en verse.',
						'type'    => 'number',
						'default' => 28800,
						'min'     => 60,
						'max'     => 604800,
						'suffix'  => 'segundos',
						'adv'     => true,
					),
					array(
						'key'         => 'perf_cache_qs',
						'label'       => 'Parámetros que se cachean',
						'desc'        => 'Separados por comas. Cualquier otro parámetro en la dirección hace que la página se monte al momento.',
						'impact'      => 'Añadir parámetros de campañas (utm y compañía) multiplica los ficheros de caché sin ganar nada.',
						'type'        => 'text',
						'default'     => 'paged,page,orden,cat,g',
						'placeholder' => 'paged,page,orden,cat,g',
						'adv'         => true,
					),
					array(
						'key'     => 'perf_cache_mob',
						'label'   => 'Caché separada para móvil',
						'desc'    => 'Solo hace falta si el tema sirve HTML distinto en el móvil. En Kuboplay no es el caso: déjalo apagado.',
						'impact'  => 'Encendido, se guarda el doble de ficheros de caché y cada uno se usa la mitad de veces.',
						'type'    => 'switch',
						'default' => 0,
						'adv'     => true,
					),
					array(
						'key'     => 'perf_gzip',
						'label'   => 'Comprimir el HTML',
						'desc'    => 'Solo actúa si el servidor no comprime ya por su cuenta.',
						'impact'  => 'Si el servidor ya comprime, este ajuste no hace nada: no hay doble compresión.',
						'type'    => 'switch',
						'default' => 1,
						'adv'     => true,
					),
					array(
						'key'     => 'perf_defer',
						'label'   => 'Retrasar el JavaScript accesorio',
						'desc'    => 'La página se ve antes. Nunca toca los scripts del arcade ni jQuery.',
						'impact'  => 'Algún plugin mal hecho puede dejar de funcionar en la parte pública. Si ves algo raro, este es el primero que hay que apagar.',
						'type'    => 'switch',
						'default' => 0,
						'adv'     => true,
					),
					array(
						'key'     => 'perf_revisions',
						'label'   => 'Revisiones por entrada',
						'desc'    => 'Cuántas versiones antiguas se guardan de cada página o juego.',
						'impact'  => 'A 0 no se guarda ninguna: si te equivocas editando, no hay marcha atrás.',
						'type'    => 'number',
						'default' => 5,
						'min'     => 0,
						'max'     => 50,
						'suffix'  => 'versiones',
						'adv'     => true,
					),
					array(
						'key'     => 'perf_trash_days',
						'label'   => 'Días en la papelera',
						'desc'    => 'Pasado ese tiempo, lo borrado se elimina del todo.',
						'impact'  => 'Con pocos días, lo que borres por error se pierde antes de que te des cuenta.',
						'type'    => 'number',
						'default' => 7,
						'min'     => 1,
						'max'     => 90,
						'suffix'  => 'días',
						'adv'     => true,
					),
					array(
						'key'     => 'perf_heartbeat',
						'label'   => 'Ritmo del escritorio',
						'desc'    => 'Segundos entre consultas automáticas mientras tienes el escritorio abierto. Más alto, menos carga.',
						'impact'  => 'Muy alto, el guardado automático del editor y el aviso de «otro usuario está editando» tardan más.',
						'type'    => 'number',
						'default' => 60,
						'min'     => 15,
						'max'     => 300,
						'suffix'  => 'segundos',
						'adv'     => true,
					),
					array(
						'key'     => 'perf_transients',
						'label'   => 'Limpieza diaria',
						'desc'    => 'Borra cada día los datos temporales ya caducados.',
						'impact'  => 'Solo toca lo que ya ha caducado. No borra salas del modo tele en curso.',
						'type'    => 'switch',
						'default' => 1,
						'adv'     => true,
					),
				)
			);
		}

		return $f;
	}
);
