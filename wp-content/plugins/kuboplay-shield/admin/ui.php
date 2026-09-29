<?php
/**
 * Kuboplay Shield — pintado del panel.
 *
 * Aquí vive todo lo visual: cabecera con la marca, tarjeta de estado con
 * semáforo, gráfica de 30 días (canvas dibujado por código, sin librerías),
 * campos, herramientas y bloques registrados por los módulos.
 *
 * Nada de lo que se pinta aquí escribe: el guardado está en settings.php.
 * Todo texto que venga de fuera se escapa; el HTML de `kp_shield_panels` llega
 * ya escapado por quien lo registra (así lo dice el contrato) y se pinta tal cual.
 *
 * @package Kuboplay_Shield
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'KP_Shield' ) || defined( 'KP_SHIELD_UI' ) ) {
	return;
}
define( 'KP_SHIELD_UI', true );

final class KP_Shield_UI {

	/** Dirección de la guía larga, si se puede encontrar. Cadena vacía si no. */
	public static function doc_url() {
		static $url = null;
		if ( null !== $url ) {
			return $url;
		}
		$url = '';
		if ( is_readable( KP_Shield::dir() . 'docs/SEGURIDAD.md' ) ) {
			$url = KP_Shield::url() . 'docs/SEGURIDAD.md';
		} elseif ( is_readable( ABSPATH . 'docs/SEGURIDAD.md' ) ) {
			$url = home_url( '/docs/SEGURIDAD.md' );
		}
		return $url;
	}

	/** «docs/SEGURIDAD.md» como enlace si existe, o como texto si no. */
	public static function doc_link( $texto = 'docs/SEGURIDAD.md' ) {
		$url = self::doc_url();
		if ( '' === $url ) {
			return '<code>' . esc_html( $texto ) . '</code>';
		}
		return '<a href="' . esc_url( $url ) . '" rel="noopener"><code>' . esc_html( $texto ) . '</code></a>';
	}

	/* ── Cabecera ────────────────────────────────────────────────────────── */

	public static function head() {
		$logo = KP_Shield::url() . 'assets/kuboplay-logo.svg';
		?>
		<header class="kps-head">
			<img class="kps-logo" src="<?php echo esc_url( $logo ); ?>" width="119" height="29" alt="Kuboplay">
			<h1 class="kps-h1"><?php esc_html_e( 'Shield', 'kuboplay-shield' ); ?></h1>
			<span class="kps-ver">v<?php echo esc_html( KP_Shield::VERSION ); ?></span>
			<p class="kps-sub"><?php esc_html_e( 'Seguridad y velocidad del portal, en un sitio.', 'kuboplay-shield' ); ?></p>
		</header>
		<?php
	}

	/* ── Tarjeta de estado ───────────────────────────────────────────────── */

	/**
	 * Semáforo + cifras + avisos.
	 *
	 * @param array $notas Avisos ya recogidos.
	 */
	public static function estado( $notas ) {
		$d   = KP_Shield_Status::datos();
		$niv = KP_Shield_Status::nivel( $notas );

		$rotulo = array(
			'bien'     => __( 'Bien', 'kuboplay-shield' ),
			'atencion' => __( 'Atención', 'kuboplay-shield' ),
			'grave'    => __( 'Grave', 'kuboplay-shield' ),
		);

		$figs = array(
			array(
				'v'   => number_format_i18n( $d['hoy'] ),
				'l'   => __( 'Bloqueos hoy', 'kuboplay-shield' ),
				'sub' => '',
			),
			array(
				'v'   => number_format_i18n( $d['siete'] ),
				'l'   => __( 'Últimos 7 días', 'kuboplay-shield' ),
				'sub' => '',
			),
			array(
				'v'   => number_format_i18n( $d['treinta'] ),
				'l'   => __( 'Últimos 30 días', 'kuboplay-shield' ),
				'sub' => '',
			),
		);

		if ( $d['top'] ) {
			$figs[] = array(
				'v'   => $d['top']['label'],
				'l'   => __( 'Motivo más frecuente', 'kuboplay-shield' ),
				'sub' => sprintf(
					/* translators: %s: número de veces. */
					__( '%s veces en 30 días', 'kuboplay-shield' ),
					number_format_i18n( $d['top']['n'] )
				),
				'txt' => true,
			);
		} else {
			$figs[] = array(
				'v'   => '—',
				'l'   => __( 'Motivo más frecuente', 'kuboplay-shield' ),
				'sub' => __( 'todavía no hay bloqueos', 'kuboplay-shield' ),
				'txt' => true,
			);
		}

		// Interruptores generales, siempre visibles aunque no haya módulos.
		$sec  = (bool) KP_Shield::opt( 'sec_on' );
		$perf = (bool) KP_Shield::opt( 'perf_on' );

		$chips = array(
			array(
				'l'  => __( 'Protección', 'kuboplay-shield' ),
				'v'  => $sec ? __( 'activada', 'kuboplay-shield' ) : __( 'apagada', 'kuboplay-shield' ),
				'ok' => $sec,
			),
			array(
				'l'  => __( 'Caché de páginas', 'kuboplay-shield' ),
				'v'  => $perf ? __( 'activada', 'kuboplay-shield' ) : __( 'apagada', 'kuboplay-shield' ),
				'ok' => $perf,
			),
		);

		$extra = apply_filters( 'kp_shield_status', array() );
		if ( is_array( $extra ) ) {
			foreach ( $extra as $e ) {
				if ( is_array( $e ) && isset( $e['label'], $e['value'] ) ) {
					$chips[] = array(
						'l'  => (string) $e['label'],
						'v'  => (string) $e['value'],
						'ok' => ! empty( $e['ok'] ),
					);
				}
			}
		}
		?>
		<section class="kps-hero kps-lv-<?php echo esc_attr( $niv['nivel'] ); ?>">
			<div class="kps-hero-top">
				<span class="kps-lamp" aria-hidden="true"><span></span></span>
				<div class="kps-hero-txt">
					<p class="kps-hero-tag"><?php echo esc_html( $rotulo[ $niv['nivel'] ] ); ?></p>
					<h2 class="kps-hero-h"><?php echo esc_html( $niv['titulo'] ); ?></h2>
					<p class="kps-hero-p"><?php echo esc_html( $niv['texto'] ); ?></p>
				</div>
			</div>

			<ul class="kps-chips">
				<?php foreach ( $chips as $c ) : ?>
					<li class="kps-chip <?php echo $c['ok'] ? 'is-ok' : 'is-off'; ?>">
						<span class="kps-chip-l"><?php echo esc_html( $c['l'] ); ?></span>
						<span class="kps-chip-v"><?php echo esc_html( $c['v'] ); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>

			<div class="kps-figs">
				<?php foreach ( $figs as $f ) : ?>
					<div class="kps-fig">
						<span class="kps-fig-v <?php echo empty( $f['txt'] ) ? '' : 'is-txt'; ?>"><?php echo esc_html( $f['v'] ); ?></span>
						<span class="kps-fig-l"><?php echo esc_html( $f['l'] ); ?></span>
						<?php if ( ! empty( $f['sub'] ) ) : ?>
							<span class="kps-fig-s"><?php echo esc_html( $f['sub'] ); ?></span>
						<?php endif; ?>
					</div>
				<?php endforeach; ?>
			</div>

			<?php if ( $notas ) : ?>
				<ul class="kps-notas">
					<?php foreach ( $notas as $n ) : ?>
						<?php $t = in_array( $n['type'], array( 'warn', 'ok', 'error' ), true ) ? $n['type'] : 'info'; ?>
						<li class="kps-nota kps-<?php echo esc_attr( $t ); ?>"><?php echo esc_html( $n['text'] ); ?></li>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>
		</section>
		<?php
	}

	/* ── Gráfica ─────────────────────────────────────────────────────────── */

	/**
	 * Gráfica de 30 días: un canvas que dibuja assets/admin.js y, debajo, la
	 * misma información en una tabla plegada (eso es lo que leen los lectores
	 * de pantalla y lo que se ve si el JavaScript no llega a cargarse).
	 */
	public static function grafica() {
		$d   = KP_Shield_Status::datos();
		$fam = KP_Shield_Status::familias();
		?>
		<section class="kps-card kps-chart-card">
			<div class="kps-card-head">
				<h2><?php esc_html_e( 'Bloqueos de los últimos 30 días', 'kuboplay-shield' ); ?></h2>
				<?php if ( ! $d['vacio'] ) : ?>
					<ul class="kps-legend">
						<li class="kps-leg" data-kps-serie="total"><span class="kps-leg-k kps-leg-total" aria-hidden="true"></span><?php esc_html_e( 'Total', 'kuboplay-shield' ); ?></li>
						<?php foreach ( $d['series'] as $k => $valores ) : ?>
							<li class="kps-leg" data-kps-serie="<?php echo esc_attr( $k ); ?>">
								<span class="kps-leg-k" style="background:<?php echo esc_attr( $fam[ $k ]['color'] ); ?>" aria-hidden="true"></span>
								<?php echo esc_html( $fam[ $k ]['label'] ); ?>
							</li>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>
			</div>

			<div class="kps-canvas-wrap">
				<canvas id="kps-chart" class="kps-canvas" role="img"
					aria-label="<?php echo esc_attr( KP_Shield_Status::chart_alt() ); ?>"></canvas>
				<?php if ( $d['vacio'] ) : ?>
					<p class="kps-chart-empty"><?php esc_html_e( 'Todavía no hay bloqueos que enseñar. En cuanto la protección pare algo, aparecerá aquí.', 'kuboplay-shield' ); ?></p>
				<?php endif; ?>
			</div>

			<?php if ( ! $d['vacio'] ) : ?>
				<details class="kps-table-wrap">
					<summary><?php esc_html_e( 'Ver las cifras en una tabla', 'kuboplay-shield' ); ?></summary>
					<div class="kps-scroll">
						<table class="kps-table">
							<caption class="screen-reader-text"><?php echo esc_html( KP_Shield_Status::chart_alt() ); ?></caption>
							<thead>
								<tr>
									<th scope="col"><?php esc_html_e( 'Día', 'kuboplay-shield' ); ?></th>
									<?php foreach ( $d['series'] as $k => $v ) : ?>
										<th scope="col"><?php echo esc_html( $fam[ $k ]['label'] ); ?></th>
									<?php endforeach; ?>
									<th scope="col"><?php esc_html_e( 'Total', 'kuboplay-shield' ); ?></th>
								</tr>
							</thead>
							<tbody>
								<?php foreach ( array_reverse( array_keys( $d['dias'] ) ) as $i ) : ?>
									<?php if ( ! $d['total'][ $i ] ) { continue; } ?>
									<tr>
										<th scope="row"><?php echo esc_html( $d['dias'][ $i ] ); ?></th>
										<?php foreach ( $d['series'] as $k => $valores ) : ?>
											<td><?php echo esc_html( number_format_i18n( $valores[ $i ] ) ); ?></td>
										<?php endforeach; ?>
										<td><strong><?php echo esc_html( number_format_i18n( $d['total'][ $i ] ) ); ?></strong></td>
									</tr>
								<?php endforeach; ?>
							</tbody>
						</table>
					</div>
				</details>
			<?php endif; ?>
		</section>
		<?php
	}

	/* ── Aviso del DDoS ──────────────────────────────────────────────────── */

	public static function nota_ddos() {
		?>
		<div class="kps-note">
			<strong><?php esc_html_e( 'Léelo una vez:', 'kuboplay-shield' ); ?></strong>
			<?php esc_html_e( 'este plugin frena robots, visitas pesadas y los intentos de adivinar tu contraseña. Lo que NO puede hacer es parar un ataque grande de verdad (un DDoS): cuando eso pasa, el golpe llega al servidor antes que WordPress, y ningún plugin puede evitarlo desde dentro. Para eso hace falta Cloudflare delante de la web: es gratis y se hace en 15 minutos.', 'kuboplay-shield' ); ?>
			<em>
				<?php
				printf(
					/* translators: %s: enlace a docs/SEGURIDAD.md. */
					esc_html__( 'Pasos completos en %s, apartado 1: «Poner Cloudflare gratis delante de kuboplay.online».', 'kuboplay-shield' ),
					wp_kses( self::doc_link(), array( 'a' => array( 'href' => array(), 'rel' => array() ), 'code' => array() ) )
				);
				?>
			</em>
		</div>
		<?php
	}

	/* ── Herramientas ────────────────────────────────────────────────────── */

	/**
	 * Botones que disparan una acción (`kp_shield_tools`).
	 *
	 * Van en su propio formulario, aparte del de los ajustes: pulsar una
	 * herramienta no guarda cambios a medias.
	 *
	 * @param array  $tools Herramientas de esta pestaña.
	 * @param string $tab   Pestaña actual.
	 * @param string $base  URL base del panel.
	 */
	public static function tools( $tools, $tab, $base ) {
		if ( ! $tools ) {
			return;
		}
		?>
		<form method="post" action="<?php echo esc_url( add_query_arg( 'tab', $tab, $base ) ); ?>" class="kps-tools">
			<?php wp_nonce_field( 'kp_shield_save' ); ?>
			<input type="hidden" name="tab" value="<?php echo esc_attr( $tab ); ?>">
			<input type="hidden" name="kp_shield_action" value="tool">
			<?php foreach ( $tools as $t ) : ?>
				<button type="submit" name="kp_tool" value="<?php echo esc_attr( $t['key'] ); ?>"
					class="kps-tool"
					<?php if ( '' !== $t['confirm'] ) : ?>
						onclick="return confirm('<?php echo esc_js( $t['confirm'] ); ?>');"
					<?php endif; ?>
				><?php echo esc_html( $t['label'] ); ?></button>
			<?php endforeach; ?>
		</form>
		<?php
	}

	/* ── Bloques de los módulos ──────────────────────────────────────────── */

	/**
	 * Bloques registrados con `kp_shield_panels`.
	 *
	 * El HTML llega ya escapado por quien lo registra: se pinta tal cual, dentro
	 * de una zona con altura máxima para que un registro largo no se coma la
	 * página (admin.js además pagina las tablas grandes que haya dentro).
	 *
	 * @param array $panels Bloques de esta pestaña, ya ordenados.
	 */
	public static function panels( $panels ) {
		foreach ( $panels as $p ) {
			?>
			<section class="kps-card kps-panel">
				<?php if ( '' !== $p['title'] ) : ?>
					<div class="kps-card-head"><h2><?php echo esc_html( $p['title'] ); ?></h2></div>
				<?php endif; ?>
				<div class="kps-panel-body" data-kps-paginate="14">
					<?php echo $p['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — contrato: llega escapado. ?>
				</div>
			</section>
			<?php
		}
	}

	/* ── Campos ──────────────────────────────────────────────────────────── */

	/** Un ajuste. */
	public static function field( $field ) {
		$key  = $field['key'];
		$val  = KP_Shield_Admin::value( $field );
		$id   = 'kp-' . $key;
		$name = 'kp[' . $key . ']';
		$desc = isset( $field['desc'] ) ? (string) $field['desc'] : '';
		$imp  = isset( $field['impact'] ) ? (string) $field['impact'] : '';
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
						class="kps-in <?php echo 'number' === $field['type'] ? 'kps-in-n' : ''; ?>">
					<?php if ( ! empty( $field['suffix'] ) ) : ?>
						<span class="kps-suffix"><?php echo esc_html( $field['suffix'] ); ?></span>
					<?php endif; ?>
				</span>
				<?php if ( 'number' === $field['type'] && ( isset( $field['min'] ) || isset( $field['max'] ) ) ) : ?>
					<p class="kps-range">
						<?php
						printf(
							/* translators: 1: mínimo, 2: máximo. */
							esc_html__( 'Entre %1$s y %2$s. Si escribes otra cosa, se guarda el valor válido más cercano.', 'kuboplay-shield' ),
							esc_html( number_format_i18n( isset( $field['min'] ) ? (int) $field['min'] : 0 ) ),
							esc_html( number_format_i18n( isset( $field['max'] ) ? (int) $field['max'] : 0 ) )
						);
						?>
					</p>
				<?php endif; ?>
			<?php endif; ?>

			<?php if ( '' !== $desc ) : ?>
				<p class="kps-desc"><?php echo esc_html( $desc ); ?></p>
			<?php endif; ?>

			<?php if ( '' !== $imp ) : ?>
				<p class="kps-impact"><span class="kps-impact-t"><?php esc_html_e( 'Qué pasa si lo cambias:', 'kuboplay-shield' ); ?></span> <?php echo esc_html( $imp ); ?></p>
			<?php endif; ?>

			<?php if ( ! empty( $field['preview'] ) && 'url' === $field['preview'] && '' !== (string) $val ) : ?>
				<p class="kps-prev">
					<?php esc_html_e( 'A partir de ahora entrarías por esta dirección (apúntala antes de guardar):', 'kuboplay-shield' ); ?><br>
					<code><?php echo esc_html( home_url( '/' . ltrim( (string) $val, '/' ) . '/' ) ); ?></code>
				</p>
			<?php endif; ?>

			<?php if ( ! empty( $field['warn'] ) ) : ?>
				<p class="kps-nota kps-warn"><?php echo esc_html( $field['warn'] ); ?></p>
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

	/**
	 * Lista de ajustes de una pestaña, en dos bloques: los normales y, dentro de
	 * un desplegable, los avanzados.
	 *
	 * El desplegable es un <details> de verdad: los campos de dentro siguen
	 * estando en el formulario aunque esté cerrado, así que guardar en modo
	 * simple nunca pierde un valor avanzado. Y funciona sin JavaScript.
	 *
	 * @param array $lista Campos de la pestaña, indexados por clave.
	 */
	public static function fields_block( $lista ) {
		$simple = array();
		$avan   = array();
		foreach ( $lista as $f ) {
			if ( ! empty( $f['adv'] ) ) {
				$avan[] = $f;
			} else {
				$simple[] = $f;
			}
		}
		?>
		<div class="kps-fields">
			<?php foreach ( $simple as $f ) { self::field( $f ); } ?>
		</div>

		<?php if ( $avan ) : ?>
			<details class="kps-more" <?php echo self::more_open() ? 'open' : ''; ?>>
				<summary class="kps-more-sum">
					<span class="kps-more-on"><?php esc_html_e( 'Ver todos los ajustes', 'kuboplay-shield' ); ?></span>
					<span class="kps-more-off"><?php esc_html_e( 'Ocultar los ajustes avanzados', 'kuboplay-shield' ); ?></span>
					<span class="kps-more-n"><?php echo esc_html( number_format_i18n( count( $avan ) ) ); ?></span>
				</summary>
				<p class="kps-more-help"><?php esc_html_e( 'Estos ya vienen bien puestos de fábrica. Tócalos solo si sabes qué estás cambiando: abajo de cada uno pone qué pasa si lo haces.', 'kuboplay-shield' ); ?></p>
				<div class="kps-fields kps-fields-adv">
					<?php foreach ( $avan as $f ) { self::field( $f ); } ?>
				</div>
			</details>
		<?php endif; ?>
		<?php
	}

	/**
	 * ¿Se abre el desplegable de avanzados al cargar?
	 *
	 * Es solo estado de vista (no toca ningún ajuste), así que va en la URL sin
	 * nonce; admin.js lo recuerda además en el navegador.
	 */
	public static function more_open() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return isset( $_GET['ver'] ) && 'todo' === sanitize_key( wp_unslash( $_GET['ver'] ) );
	}
}
