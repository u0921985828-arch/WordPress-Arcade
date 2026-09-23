<?php
defined( 'ABSPATH' ) || exit;
$brand   = Arcade_Portal::brand();
$current = '';
if ( is_tax( 'game_genre' ) ) {
	$current = get_queried_object()->slug;
} elseif ( is_singular( 'game' ) ) {
	$current = Arcade_Portal::genre_of( get_queried_object_id() );
}
$all_url = get_post_type_archive_link( 'game' );
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0d12">
<?php wp_head(); ?>
</head>
<body <?php body_class( 'ax' ); ?>>
<?php wp_body_open(); ?>
<header class="ax-top">
	<div class="ax-wrap ax-bar">
		<a class="ax-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>"><svg class="ax-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" fill="var(--acc)"/><path d="M12 10.5v11l9-5.5z" fill="#fff"/></svg><span><?php echo esc_html( $brand ); ?></span></a>
		<form class="ax-search" role="search" action="<?php echo esc_url( home_url( '/' ) ); ?>">
			<input type="search" name="s" placeholder="Buscar juegos…" value="<?php echo esc_attr( get_search_query() ); ?>" aria-label="Buscar juegos">
			<input type="hidden" name="post_type" value="game">
		</form>
	</div>
	<nav class="ax-wrap ax-chips" aria-label="Géneros">
		<a class="<?php echo ( ! $current && is_front_page() ) ? 'on' : ''; ?>" href="<?php echo esc_url( home_url( '/' ) ); ?>">Inicio</a>
		<?php foreach ( Arcade_Portal::LABELS as $slug => $l ) : $u = Arcade_Portal::genre_url( $slug ); if ( ! $u ) { continue; } ?>
			<a class="<?php echo $current === $slug ? 'on' : ''; ?>" style="--c:<?php echo esc_attr( $l[1] ); ?>" href="<?php echo esc_url( $u ); ?>"><span class="ax-dot"></span><?php echo esc_html( $l[0] ); ?></a>
		<?php endforeach; ?>
	</nav>
</header>
<main class="ax-wrap ax-main">
<?php
/* ------------------------------------------------------------ Ficha de juego */
if ( is_singular( 'game' ) ) :
	the_post();
	$pid = get_the_ID();
	$g   = Arcade_Portal::genre_of( $pid );
	$l   = Arcade_Portal::LABELS[ $g ];
	?>
	<article class="ax-game">
		<a class="ax-crumb" style="--c:<?php echo esc_attr( $l[1] ); ?>" href="<?php echo esc_url( Arcade_Portal::genre_url( $g ) ); ?>"><span class="ax-dot"></span><?php echo esc_html( $l[0] ); ?></a>
		<h1><?php the_title(); ?></h1>
		<div class="ax-game-g"><div class="ax-stage"><?php echo Arcade_Core::player_html( $pid ); // phpcs:ignore ?></div>
		<aside class="ax-side">
		<div class="ax-stats"><div><strong data-ax-plays><?php echo esc_html( Arcade_Social::fmt( get_post_meta( $pid, '_game_plays', true ) ) ); ?></strong><span>partidas</span></div><div><strong><?php echo esc_html( Arcade_Social::fmt( get_post_meta( $pid, '_game_likes', true ) ) ); ?></strong><span>me gusta</span></div></div>
		<div class="ax-actions"><button type="button" class="ax-act" data-ax-like><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.2C.3 8.4 2.2 4.5 6 4.5c2.2 0 3.6 1.3 4.3 2.4h1.4c.7-1.1 2.1-2.4 4.3-2.4 3.8 0 5.7 3.9 4 7.3C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg><b data-n="<?php echo (int) get_post_meta( $pid, '_game_likes', true ); ?>">Me gusta</b></button><button type="button" class="ax-act" data-ax-fav><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z" fill="currentColor"/></svg><b>Favorito</b></button><button type="button" class="ax-act" data-ax-share><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M18 8a3 3 0 1 0-2.8-4l-7 4a3 3 0 1 0 0 4.2l7 4A3 3 0 1 0 16 14l-7-4a3 3 0 0 0 0-.2l7-4A3 3 0 0 0 18 8z" fill="currentColor"/></svg><b>Compartir</b></button></div>
		<div class="ax-chiprow"><?php echo Arcade_Portal::inputs_chips( $pid ); // phpcs:ignore ?></div>
		<?php $how = Arcade_Portal::howto( $pid ); if ( $how ) : ?>
			<div class="ax-how"><h2>Cómo se juega</h2><p><?php echo esc_html( $how ); ?></p></div>
		<?php endif; ?>
		<div class="ax-desc">
			<?php
			if ( Arcade_Portal::is_own( $pid ) ) {
				echo Arcade_Portal::own_desc( $pid ); // phpcs:ignore
			} else {
				$GLOBALS['arcade_no_inject'] = true;
				echo apply_filters( 'the_content', get_the_content() ); // phpcs:ignore
				$GLOBALS['arcade_no_inject'] = false;
			}
			?>
		</div></aside></div>
	</article>
	<?php echo class_exists( 'Arcade_SEO' ) ? Arcade_SEO::ad_block( 'game' ) : ''; // phpcs:ignore ?>
	<?php
	$rel = Arcade_Portal::games( array( 'post__not_in' => array( $pid ), 'numberposts' => 12, 'orderby' => 'rand', 'tax_query' => array( array( 'taxonomy' => 'game_genre', 'field' => 'slug', 'terms' => $g ) ) ) );
	usort( $rel, static function ( $a, $b ) { return (int) Arcade_Portal::is_own( $a->ID ) - (int) Arcade_Portal::is_own( $b->ID ); } );
	if ( $rel ) :
		?>
		<section class="ax-sec"><div class="ax-sec-h"><h2>Más de <?php echo esc_html( $l[0] ); ?></h2><a href="<?php echo esc_url( Arcade_Portal::genre_url( $g ) ); ?>">Ver todos →</a></div>
		<div class="ax-grid"><?php foreach ( $rel as $p ) { echo Arcade_Portal::card( $p ); } // phpcs:ignore ?></div></section>
	<?php endif; ?>
	<?php
	$other = Arcade_Portal::games( array( 'post__not_in' => array( $pid ), 'numberposts' => 8, 'orderby' => 'rand', 'tax_query' => array( array( 'taxonomy' => 'game_genre', 'field' => 'slug', 'terms' => $g, 'operator' => 'NOT IN' ) ) ) );
	if ( $other ) :
		?>
		<section class="ax-sec"><div class="ax-sec-h"><h2>También te puede gustar</h2></div>
		<div class="ax-grid"><?php foreach ( $other as $p ) { echo Arcade_Portal::card( $p ); } // phpcs:ignore ?></div></section>
	<?php endif; ?>

<?php
/* ------------------------------------------------------ Páginas de texto */
elseif ( is_page() && ! has_shortcode( (string) get_post_field( 'post_content', get_queried_object_id() ), 'arcade_grid' ) && (int) get_queried_object_id() !== (int) get_option( 'arcade_home_page_id' ) ) :
	the_post();
	?>
	<article class="ax-page"><h1><?php the_title(); ?></h1><div class="ax-prose"><?php the_content(); ?></div></article>
<?php
/* ------------------------------------------------------------- Listados */
elseif ( is_tax() || is_post_type_archive( 'game' ) || is_search() ) :
	if ( is_search() ) {
		$h = 'Resultados para «' . get_search_query() . '»';
		$c = '';
	} elseif ( is_tax( 'game_genre' ) ) {
		$slug = get_queried_object()->slug;
		$l    = Arcade_Portal::LABELS[ $slug ] ?? array( single_term_title( '', false ), '#5ce1e6', '🎮' );
		$h    = $l[0];
		$c    = $l[1];
	} elseif ( is_tax() ) {
		$h = single_term_title( '', false );
		$c = '';
	} elseif ( ! empty( $_GET['exclusivos'] ) ) { // phpcs:ignore
		$h = 'Exclusivos';
		$c = '#6e62f5';
	} else {
		$h = 'Todos los juegos';
		$c = '';
	}
	global $wp_query;
	?>
	<div class="ax-head" style="--c:<?php echo esc_attr( $c ?: '#6e62f5' ); ?>"><h1><?php echo $c ? '<span class="ax-dot"></span>' : ''; echo esc_html( $h ); ?></h1><p><?php echo (int) $wp_query->post_count; ?> juegos</p></div>
	<?php if ( have_posts() ) : ?>
		<div class="ax-grid"><?php while ( have_posts() ) { the_post(); echo Arcade_Portal::card( get_post() ); } // phpcs:ignore ?></div>
	<?php else : ?>
		<p class="ax-empty">No hay juegos que coincidan. <a href="<?php echo esc_url( $all_url ); ?>">Ver todos</a></p>
	<?php endif; ?>

<?php
/* ---------------------------------------------------------------- Portada */
else :
	$all = Arcade_Portal::games();
	if ( ! $all ) {
		echo '<p class="ax-empty">Todavía no hay juegos. Importa arcade_pilot_100.xml en Herramientas → Importar → WordPress.</p>';
	} else {
		$playable = array_values( array_filter( $all, static function ( $p ) { return '' !== Arcade_Core::resolve_embed( $p->ID ); } ) );
		$pro      = array_values( array_filter( $playable, static function ( $p ) { return ! Arcade_Portal::is_own( $p->ID ); } ) );
		$pool     = $pro ?: ( $playable ?: $all );
		$feat     = $pool[ ( (int) gmdate( 'z' ) ) % count( $pool ) ]; // juego destacado del día
		$fg       = Arcade_Portal::LABELS[ Arcade_Portal::genre_of( $feat->ID ) ];
		?>
		<section class="ax-hero" style="--c:<?php echo esc_attr( $fg[1] ); ?>">
			<a class="ax-hero-img" href="<?php echo esc_url( get_permalink( $feat ) ); ?>"><img src="<?php echo esc_url( Arcade_Core::thumb( $feat->ID, 'large' ) ); ?>" alt=""></a>
			<div class="ax-hero-txt">
				<span class="ax-kicker">Juego del día</span>
				<h1><?php echo esc_html( get_the_title( $feat ) ); ?></h1>
				<p><?php echo esc_html( get_the_excerpt( $feat ) ?: ( count( $all ) . ' juegos gratis, sin descargas, en móvil y PC.' ) ); ?></p>
				<div class="ax-cta"><a class="ax-btn" href="<?php echo esc_url( get_permalink( $feat ) ); ?>"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>Jugar ahora</a><a class="ax-btn ghost" href="<?php echo esc_url( get_post_type_archive_link( 'game' ) ); ?>">Ver catálogo</a></div>
			</div>
		</section>
		<?php
		?>
		<section class="ax-sec" data-ax-recent hidden><div class="ax-sec-h"><h2>Seguir jugando</h2></div><div class="ax-row"></div></section>
		<section class="ax-sec" data-ax-favs hidden><div class="ax-sec-h"><h2>Tus favoritos</h2></div><div class="ax-row"></div></section>
		<?php
		$top = get_posts( array( 'post_type' => 'game', 'numberposts' => 12, 'meta_key' => '_game_plays', 'orderby' => 'meta_value_num', 'order' => 'DESC', 'meta_query' => array( array( 'key' => '_game_plays', 'value' => 0, 'compare' => '>', 'type' => 'NUMERIC' ) ) ) );
		if ( count( $top ) >= 4 ) :
			?>
			<section class="ax-sec"><div class="ax-sec-h"><h2>Más jugados</h2></div><div class="ax-row ax-rank"><?php foreach ( $top as $i => $p ) { echo '<div class="ax-rk"><span>' . ( $i + 1 ) . '</span>' . Arcade_Portal::card( $p ) . '</div>'; } // phpcs:ignore ?></div></section>
			<?php
		endif;
		$groups = array_fill_keys( array_keys( Arcade_Portal::LABELS ), array() );
		$own    = array();
		foreach ( $all as $p ) {
			$groups[ Arcade_Portal::genre_of( $p->ID ) ][] = $p;
			if ( Arcade_Portal::is_own( $p->ID ) ) {
				$own[] = $p;
			}
		}
		// Primero los juegos de redes profesionales (mejor acabado); los propios tienen su fila "Exclusivos".
		$mixed = count( $own ) < count( $all );
		foreach ( $groups as &$items ) {
			usort( $items, static function ( $a, $b ) { return (int) Arcade_Portal::is_own( $a->ID ) - (int) Arcade_Portal::is_own( $b->ID ); } );
		}
		unset( $items );
		if ( $mixed && $own ) :
			shuffle( $own );
			?>
			<section class="ax-sec" style="--c:#f2d15c">
				<div class="ax-sec-h"><h2><span class="ax-dot"></span>Exclusivos <small><?php echo count( $own ); ?></small></h2><a href="<?php echo esc_url( add_query_arg( 'exclusivos', 1, get_post_type_archive_link( 'game' ) ) ); ?>">Ver todos →</a></div>
				<div class="ax-row"><?php foreach ( array_slice( $own, 0, 12 ) as $p ) { echo Arcade_Portal::card( $p ); } // phpcs:ignore ?></div>
			</section>
			<?php
		endif;
		foreach ( $groups as $slug => $items ) :
			if ( ! $items ) {
				continue;
			}
			$l = Arcade_Portal::LABELS[ $slug ];
			?>
			<?php if ( 2 === ( $sec_i = ( $sec_i ?? 0 ) + 1 ) && class_exists( 'Arcade_SEO' ) ) { echo Arcade_SEO::ad_block( 'home' ); } // phpcs:ignore ?>
			<section class="ax-sec" style="--c:<?php echo esc_attr( $l[1] ); ?>">
				<div class="ax-sec-h"><h2><span class="ax-dot"></span><?php echo esc_html( $l[0] ); ?> <small><?php echo count( $items ); ?></small></h2><a href="<?php echo esc_url( Arcade_Portal::genre_url( $slug ) ); ?>">Ver todos →</a></div>
				<div class="ax-row"><?php foreach ( array_slice( $items, 0, 12 ) as $p ) { echo Arcade_Portal::card( $p ); } // phpcs:ignore ?></div>
			</section>
			<?php
		endforeach;
	}
endif;
?>
</main>
<footer class="ax-foot"><div class="ax-wrap ax-foot-g">
	<div><a class="ax-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>"><svg class="ax-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" fill="var(--acc)"/><path d="M12 10.5v11l9-5.5z" fill="#fff"/></svg><span><?php echo esc_html( $brand ); ?></span></a>
	<p>Juegos HTML5 gratuitos para móvil, tablet y ordenador. Sin descargas ni registro.</p></div>
	<div><h3>Categorías</h3><ul><?php foreach ( Arcade_Portal::LABELS as $slug => $l ) { $u = Arcade_Portal::genre_url( $slug ); if ( $u ) { printf( '<li><a href="%s">%s</a></li>', esc_url( $u ), esc_html( $l[0] ) ); } } ?></ul></div>
	<div><h3>Portal</h3><ul><li><a href="<?php echo esc_url( get_post_type_archive_link( 'game' ) ); ?>">Todos los juegos</a></li><?php if ( class_exists( 'Arcade_SEO' ) ) { foreach ( Arcade_SEO::legal_links() as $lk ) { printf( '<li><a href="%s">%s</a></li>', esc_url( $lk[1] ), esc_html( $lk[0] ) ); } } ?></ul></div>
</div><div class="ax-wrap ax-copy">© <?php echo esc_html( gmdate( 'Y' ) . ' ' . $brand ); ?>. Todos los derechos reservados.</div></footer>
<?php wp_footer(); ?>
</body>
</html>
