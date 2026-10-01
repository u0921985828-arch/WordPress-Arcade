<?php
/**
 * Menú de elección de juego, a pantalla completa. Ignora el tema a propósito.
 *
 * @package kuboplay-launcher
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$kp_items = Kuboplay_Launcher::entries();
$kp_brand = Kuboplay_Launcher::brand();
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#07080f">
<meta name="robots" content="index, follow">
<?php wp_head(); ?>
</head>
<body class="kp-body">
<div class="kp-bg" aria-hidden="true"><i></i><i></i><i></i></div>

<header class="kp-top">
	<span class="kp-brand"><?php echo esc_html( $kp_brand ); ?></span>
	<span class="kp-clock" data-kp-clock></span>
</header>

<main class="kp-main">
	<h1 class="kp-h1">Elige juego</h1>

	<?php if ( ! $kp_items ) : ?>
		<p class="kp-empty">Todavía no hay juegos en el menú. Añádelos en <strong>Ajustes → Lanzadera</strong>.</p>
	<?php else : ?>
		<ul class="kp-rail" data-kp-rail role="listbox" aria-label="Juegos">
			<?php foreach ( $kp_items as $kp_i => $kp_it ) : ?>
				<li class="kp-cell<?php echo 0 === $kp_i ? ' on' : ''; ?>"
					style="--g:<?php echo esc_attr( $kp_it['color'] ); ?>"
					role="option" aria-selected="<?php echo 0 === $kp_i ? 'true' : 'false'; ?>">
					<a class="kp-card" href="<?php echo esc_url( $kp_it['url'] ); ?>">
						<span class="kp-cover"><?php echo Kuboplay_Launcher::art( $kp_it['art'], $kp_it['color'] ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
						<span class="kp-name"><?php echo esc_html( $kp_it['title'] ); ?></span>
						<?php if ( $kp_it['sub'] ) : ?>
							<span class="kp-sub"><?php echo esc_html( $kp_it['sub'] ); ?></span>
						<?php endif; ?>
						<span class="kp-go">Jugar</span>
					</a>
				</li>
			<?php endforeach; ?>
		</ul>
	<?php endif; ?>
</main>

<footer class="kp-hint">
	<span><b>←</b> <b>→</b> Moverse</span>
	<span><b>Intro</b> Jugar</span>
	<span class="kp-only-pad"><b>A</b> Jugar</span>
</footer>

<?php wp_footer(); ?>
</body>
</html>
