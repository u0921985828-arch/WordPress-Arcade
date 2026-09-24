<?php
defined( 'ABSPATH' ) || exit;
$brand   = Arcade_Portal::brand();
$current = '';
if ( is_tax( 'game_genre' ) ) {
	$current = get_queried_object()->slug;
} elseif ( is_singular( 'game' ) ) {
	$current = Arcade_Portal::genre_of( get_queried_object_id() );
}
$all_url  = get_post_type_archive_link( 'game' );
$mine_url = add_query_arg( 'mis', 1, $all_url );
$party    = class_exists( 'Arcade_Party' );
$tv_url   = $party ? Arcade_Party::tv_url() : '';
$ad       = static function ( $where ) { return class_exists( 'Arcade_SEO' ) ? Arcade_SEO::ad_block( $where ) : ''; };
$ico      = array(
	'play'   => '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
	'home'   => '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
	'grid'   => '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
	'search' => '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
	'star'   => '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
	'heart'  => '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.2C.3 8.4 2.2 4.5 6 4.5c2.2 0 3.6 1.3 4.3 2.4h1.4c.7-1.1 2.1-2.4 4.3-2.4 3.8 0 5.7 3.9 4 7.3C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>',
	'fav'    => '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z" fill="currentColor"/></svg>',
	'share'  => '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M18 8a3 3 0 1 0-2.8-4l-7 4a3 3 0 1 0 0 4.2l7 4A3 3 0 1 0 16 14l-7-4a3 3 0 0 0 0-.2l7-4A3 3 0 0 0 18 8z" fill="currentColor"/></svg>',
	'tv'     => '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
	'tvbig'  => '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.2 8.6v4.8l4.2-2.4z" fill="currentColor"/></svg>',
	'phone'  => '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 18h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
	'arrow'  => '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
);
$sec_head = static function ( $title, $url = '', $count = 0 ) use ( $ico ) {
	printf( '<div class="ax-sec-h"><h2><span class="ax-dot"></span>%s%s</h2>%s</div>', esc_html( $title ), $count ? ' <small>' . (int) $count . '</small>' : '', $url ? '<a href="' . esc_url( $url ) . '">Ver todos' . $ico['arrow'] . '</a>' : '' ); // phpcs:ignore
};
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
<a class="ax-skip" href="#ax-main">Saltar al contenido</a>
<header class="ax-top">
	<div class="ax-wrap ax-bar">
		<a class="ax-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>"><svg class="ax-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" fill="var(--acc)"/><path d="M12 10.5v11l9-5.5z" fill="#fff"/></svg><span><?php echo esc_html( $brand ); ?></span></a>
		<form class="ax-search" role="search" action="<?php echo esc_url( home_url( '/' ) ); ?>" data-ax-search>
			<input type="search" name="s" placeholder="Buscar entre <?php echo (int) wp_count_posts( 'game' )->publish; ?> juegos…" value="<?php echo esc_attr( get_search_query() ); ?>" aria-label="Buscar juegos" autocomplete="off" enterkeyhint="search">
			<input type="hidden" name="post_type" value="game">
			<div class="ax-sugg" role="listbox" hidden></div>
		</form>
		<?php if ( $party ) : ?><a class="ax-tvbtn" href="<?php echo esc_url( $tv_url ); ?>" aria-label="Jugar en la tele" title="Juega en la tele con el móvil como mando"><?php echo $ico['tvbig']; // phpcs:ignore ?><span>En la tele</span></a><?php endif; ?>
		<a class="ax-mine" href="<?php echo esc_url( $mine_url ); ?>"><?php echo $ico['star']; // phpcs:ignore ?><span>Mis juegos</span></a>
	</div>
	<nav class="ax-wrap ax-chips" aria-label="Categorías">
		<a class="<?php echo ( ! $current && is_front_page() ) ? 'on' : ''; ?>" href="<?php echo esc_url( home_url( '/' ) ); ?>">Inicio</a>
		<?php foreach ( Arcade_Portal::LABELS as $slug => $l ) : $u = Arcade_Portal::genre_url( $slug ); if ( ! $u ) { continue; } ?>
			<a class="<?php echo $current === $slug ? 'on' : ''; ?>" style="--c:<?php echo esc_attr( $l[1] ); ?>" href="<?php echo esc_url( $u ); ?>"><span class="ax-dot"></span><?php echo esc_html( $l[0] ); ?></a>
		<?php endforeach; ?>
	</nav>
</header>
<main id="ax-main" class="ax-wrap ax-main">
<?php
/* ------------------------------------------------------------ Ficha de juego */
if ( is_singular( 'game' ) ) :
	the_post();
	$pid   = get_the_ID();
	$g     = Arcade_Portal::genre_of( $pid );
	$l     = Arcade_Portal::LABELS[ $g ];
	$plays = (int) get_post_meta( $pid, '_game_plays', true );
	$likes = (int) get_post_meta( $pid, '_game_likes', true );
	$rel   = Arcade_Portal::games( array( 'post__not_in' => array( $pid ), 'numberposts' => 12, 'orderby' => 'rand', 'tax_query' => array( array( 'taxonomy' => 'game_genre', 'field' => 'slug', 'terms' => $g ) ) ) );
	usort( $rel, static function ( $a, $b ) { return (int) Arcade_Portal::is_own( $a->ID ) - (int) Arcade_Portal::is_own( $b->ID ); } );
	?>
	<article class="ax-game" style="--c:<?php echo esc_attr( $l[1] ); ?>">
		<div class="ax-game-g">
			<div class="ax-game-main">
				<div class="ax-stage"><?php echo Arcade_Core::player_html( $pid ); // phpcs:ignore ?></div>
				<div class="ax-gbar">
					<div class="ax-gtitle">
						<a class="ax-crumb" href="<?php echo esc_url( Arcade_Portal::genre_url( $g ) ); ?>"><span class="ax-dot"></span><?php echo esc_html( $l[0] ); ?></a>
						<h1><?php the_title(); ?></h1>
						<p class="ax-gmeta"><span data-ax-plays-wrap<?php echo $plays < 10 ? ' hidden' : ''; ?>><b data-ax-plays><?php echo esc_html( Arcade_Social::fmt( $plays ) ); ?></b> partidas</span><?php if ( $likes > 0 ) : ?><span><b><?php echo esc_html( Arcade_Social::fmt( $likes ) ); ?></b> me gusta</span><?php endif; ?><?php $mpl = Arcade_Portal::mp( get_post( $pid ) ); if ( $mpl ) : ?><span class="ax-mpl"><?php echo Arcade_Portal::MP_ICO; // phpcs:ignore ?><b><?php echo esc_html( $mpl ); ?></b> en la tele</span><?php endif; ?><span>Gratis · sin descargas</span></p>
					</div>
					<div class="ax-actions">
						<button type="button" class="ax-act" data-ax-like aria-label="Me gusta"><?php echo $ico['heart']; // phpcs:ignore ?><b data-n="<?php echo (int) $likes; ?>">Me gusta</b></button>
						<button type="button" class="ax-act" data-ax-fav aria-label="Añadir a favoritos"><?php echo $ico['fav']; // phpcs:ignore ?><b>Favorito</b></button>
						<button type="button" class="ax-act" data-ax-share aria-label="Compartir"><?php echo $ico['share']; // phpcs:ignore ?><b>Compartir</b></button>
						<?php if ( class_exists( 'Arcade_Party' ) && Arcade_Party::playable( get_post_field( 'post_name', $pid ) ) ) : ?><a class="ax-act ax-tv" aria-label="Jugar en la tele<?php echo $mpl ? ' (' . esc_attr( strtolower( $mpl ) ) . ')' : ''; ?>" href="<?php echo esc_url( Arcade_Party::tv_url( get_post_field( 'post_name', $pid ) ) ); ?>" title="Juega en la tele con el móvil como mando"><?php echo $ico['tvbig']; // phpcs:ignore ?><b>Jugar en la tele</b></a><?php endif; ?>
					</div>
				</div>
				<?php $how = Arcade_Portal::howto( $pid ); ?>
				<section class="ax-how">
					<h2>Cómo se juega</h2>
					<?php if ( $how ) : ?><p><?php echo esc_html( $how ); ?></p><?php endif; ?>
					<div class="ax-chiprow"><?php echo Arcade_Portal::inputs_chips( $pid ); // phpcs:ignore ?></div>
				</section>
				<?php echo $ad( 'game' ); // phpcs:ignore ?>
				<section class="ax-desc">
					<h2>Sobre el juego</h2>
					<?php
					if ( Arcade_Portal::is_own( $pid ) ) {
						echo Arcade_Portal::own_desc( $pid ); // phpcs:ignore
					} else {
						$GLOBALS['arcade_no_inject'] = true;
						echo apply_filters( 'the_content', get_the_content() ); // phpcs:ignore
						$GLOBALS['arcade_no_inject'] = false;
					}
					?>
				</section>
			</div>
			<aside class="ax-side">
				<?php echo $ad( 'side' ); // phpcs:ignore ?>
				<?php if ( $rel ) : ?>
					<div class="ax-side-list"><h2>Similares</h2><?php foreach ( array_slice( $rel, 0, 6 ) as $p ) { echo Arcade_Portal::mini( $p ); } // phpcs:ignore ?></div>
				<?php endif; ?>
			</aside>
		</div>
	</article>
	<?php if ( count( $rel ) > 6 ) : ?>
		<section class="ax-sec" style="--c:<?php echo esc_attr( $l[1] ); ?>"><?php $sec_head( 'Más de ' . $l[0], Arcade_Portal::genre_url( $g ) ); ?>
		<div class="ax-row"><?php foreach ( array_slice( $rel, 6 ) as $p ) { echo Arcade_Portal::card( $p ); } // phpcs:ignore ?></div></section>
	<?php endif; ?>
	<?php
	$other = Arcade_Portal::games( array( 'post__not_in' => array( $pid ), 'numberposts' => 10, 'orderby' => 'rand', 'tax_query' => array( array( 'taxonomy' => 'game_genre', 'field' => 'slug', 'terms' => $g, 'operator' => 'NOT IN' ) ) ) );
	if ( $other ) :
		?>
		<section class="ax-sec"><?php $sec_head( 'También te puede gustar' ); ?>
		<div class="ax-grid"><?php foreach ( $other as $p ) { echo Arcade_Portal::card( $p ); } // phpcs:ignore ?></div></section>
	<?php endif; ?>

<?php
/* ------------------------------------------------------- 404 */
elseif ( is_404() ) :
	$sug = Arcade_Portal::picks( Arcade_Portal::games(), 10 );
	?>
	<section class="ax-404">
		<span class="ax-kicker">Error 404</span>
		<h1>Esta página no existe</h1>
		<p>Puede que el enlace haya cambiado. Busca un juego o prueba uno de estos.</p>
		<div class="ax-cta"><a class="ax-btn" href="<?php echo esc_url( home_url( '/' ) ); ?>">Ir al inicio</a><a class="ax-btn ghost" href="<?php echo esc_url( $all_url ); ?>">Ver todos los juegos</a></div>
	</section>
	<div class="ax-grid"><?php foreach ( $sug as $p ) { echo Arcade_Portal::card( $p ); } // phpcs:ignore ?></div>

<?php
/* ------------------------------------------------------ Páginas de texto */
elseif ( is_page() && ! has_shortcode( (string) get_post_field( 'post_content', get_queried_object_id() ), 'arcade_grid' ) && (int) get_queried_object_id() !== (int) get_option( 'arcade_home_page_id' ) ) :
	the_post();
	?>
	<article class="ax-page"><h1><?php the_title(); ?></h1><div class="ax-prose"><?php the_content(); ?></div></article>

<?php
/* ------------------------------------------------------ Mis juegos (en el navegador) */
elseif ( is_post_type_archive( 'game' ) && ! empty( $_GET['mis'] ) ) : // phpcs:ignore
	?>
	<header class="ax-head" style="--c:#e9b949"><div><span class="ax-kicker">Guardado en este dispositivo</span><h1>Mis juegos</h1><p>Tus favoritos y los últimos juegos que has abierto. No hace falta registrarse.</p></div></header>
	<section class="ax-sec" data-ax-favs data-grid hidden><?php $sec_head( 'Favoritos' ); ?><div class="ax-grid"></div></section>
	<section class="ax-sec" data-ax-recent data-grid hidden><?php $sec_head( 'Jugados recientemente' ); ?><div class="ax-grid"></div></section>
	<p class="ax-empty" data-ax-none>Aún no tienes juegos guardados. Pulsa <b>Favorito</b> en la ficha de un juego para tenerlo siempre a mano.<br><a href="<?php echo esc_url( $all_url ); ?>">Explorar juegos</a></p>

<?php
/* ------------------------------------------------------------- Listados */
elseif ( is_tax() || is_post_type_archive( 'game' ) || is_search() ) :
	$desc = '';
	$kick = 'Catálogo';
	if ( is_search() ) {
		$h    = 'Resultados para «' . get_search_query() . '»';
		$c    = '';
		$kick = 'Búsqueda';
	} elseif ( is_tax( 'game_genre' ) ) {
		$slug = get_queried_object()->slug;
		$l    = Arcade_Portal::LABELS[ $slug ] ?? array( single_term_title( '', false ), '#6e62f5', '' );
		$h    = 'Juegos de ' . ( '3D' === $l[0] ? '3D' : strtolower( $l[0] ) );
		$c    = $l[1];
		$desc = Arcade_Portal::GENRE_DESC[ $slug ] ?? '';
		$kick = 'Categoría';
	} elseif ( is_tax() ) {
		$h = single_term_title( '', false );
		$c = '';
	} elseif ( ! empty( $_GET['exclusivos'] ) ) { // phpcs:ignore
		$h    = 'Exclusivos';
		$c    = '#6e62f5';
		$desc = 'Juegos desarrollados desde cero para este portal, con arte y sonido propios.';
	} else {
		$h    = 'Todos los juegos';
		$c    = '';
		$desc = 'Arcade, puzzle, plataformas, cartas, 3D y deportes. Todos gratis, sin descargas ni registro, en móvil y ordenador.';
	}
	global $wp_query;
	?>
	<header class="ax-head" style="--c:<?php echo esc_attr( $c ?: '#6e62f5' ); ?>">
		<div><span class="ax-kicker"><?php echo esc_html( $kick ); ?></span><h1><?php echo esc_html( $h ); ?></h1><p><?php echo $desc ? esc_html( $desc ) . ' ' : ''; ?><b><?php echo (int) $wp_query->post_count; ?> juegos</b></p></div>
		<?php if ( $wp_query->post_count > 6 && ! is_search() ) : ?>
			<div class="ax-sort" role="group" aria-label="Ordenar"><button type="button" class="on" data-sort="pop">Populares</button><button type="button" data-sort="az">A-Z</button><button type="button" data-sort="new">Nuevos</button></div>
		<?php endif; ?>
	</header>
	<?php if ( have_posts() ) : ?>
		<div class="ax-grid" data-ax-sortable>
			<?php
			$i = 0;
			while ( have_posts() ) {
				the_post();
				echo Arcade_Portal::card( get_post() ); // phpcs:ignore
				if ( 0 === ++$i % 15 && $i < $wp_query->post_count ) {
					echo $ad( 'feed' ); // phpcs:ignore
				}
			}
			?>
		</div>
	<?php else : ?>
		<div class="ax-empty"><p>No hay juegos que coincidan.</p><a class="ax-btn ghost" href="<?php echo esc_url( $all_url ); ?>">Ver todos los juegos</a></div>
		<div class="ax-grid"><?php foreach ( Arcade_Portal::picks( Arcade_Portal::games(), 10 ) as $p ) { echo Arcade_Portal::card( $p ); } // phpcs:ignore ?></div>
	<?php endif; ?>

<?php
/* ---------------------------------------------------------------- Portada */
else :
	$all = Arcade_Portal::games();
	if ( ! $all ) {
		echo '<p class="ax-empty">Todavía no hay juegos. Importa arcade_pilot_100.xml en Herramientas → Importar → WordPress.</p>';
	} else {
		$picks = Arcade_Portal::picks( $all, 5 );
		$pick_ids = wp_list_pluck( $picks, 'ID' );
		?>
		<h1 class="ax-sr"><?php echo esc_html( $brand ); ?>: juegos gratis online</h1>
		<?php if ( $picks ) : ?>
		<section class="ax-hero" data-ax-carousel aria-roledescription="carrusel" aria-label="Destacados de hoy">
			<div class="ax-slides">
				<?php foreach ( $picks as $i => $p ) : $pl = Arcade_Portal::LABELS[ Arcade_Portal::genre_of( $p->ID ) ]; $th = Arcade_Core::thumb( $p->ID, 'large' ); ?>
				<article class="ax-slide" style="--c:<?php echo esc_attr( $pl[1] ); ?>" aria-label="<?php echo (int) ( $i + 1 ) . ' de ' . count( $picks ); ?>">
					<img class="ax-slide-bg" src="<?php echo esc_url( $th ); ?>" alt="" aria-hidden="true"<?php echo $i ? ' loading="lazy"' : ' fetchpriority="high"'; ?>>
					<a class="ax-slide-img" href="<?php echo esc_url( get_permalink( $p ) ); ?>" tabindex="-1"><img src="<?php echo esc_url( $th ); ?>" alt="<?php echo esc_attr( get_the_title( $p ) ); ?>"<?php echo $i ? ' loading="lazy"' : ''; ?>></a>
					<div class="ax-slide-txt">
						<span class="ax-kicker"><?php echo $i ? 'Destacado' : 'Juego del día'; ?> · <?php echo esc_html( $pl[0] ); ?></span>
						<h2><?php echo esc_html( get_the_title( $p ) ); ?></h2>
						<p><?php echo esc_html( Arcade_Portal::blurb( $p->ID ) ); ?></p>
						<div class="ax-cta"><a class="ax-btn" href="<?php echo esc_url( get_permalink( $p ) ); ?>"><?php echo $ico['play']; // phpcs:ignore ?>Jugar ahora</a></div>
					</div>
				</article>
				<?php endforeach; ?>
			</div>
			<div class="ax-dots" role="tablist"><?php foreach ( $picks as $i => $p ) { printf( '<button type="button" role="tab" aria-label="Destacado %1$d"%2$s></button>', (int) $i + 1, $i ? '' : ' aria-selected="true"' ); } ?></div>
		</section>
		<?php endif; ?>

		<?php
		if ( $party ) :
			$mpg = array();
			foreach ( Arcade_Party::catalog() as $slug => $g ) {
				if ( Arcade_Party::players( $slug ) ) {
					$mpg[ $slug ] = $g['title'] ?? $slug;
				}
			}
			?>
		<section class="ax-party" aria-labelledby="ax-party-h">
			<div class="ax-party-txt">
				<span class="ax-kicker">Modo fiesta</span>
				<h2 id="ax-party-h">Juega en la tele, tu móvil es el mando</h2>
				<p>Hasta 4 jugadores en la misma pantalla, sin cuentas ni descargas. Abre esta web en el navegador de la tele y escanea el código con el móvil.</p>
				<div class="ax-cta">
					<a class="ax-btn" href="<?php echo esc_url( $tv_url ); ?>"><?php echo $ico['tvbig']; // phpcs:ignore ?>Abrir en la tele</a>
					<a class="ax-btn ghost ax-hascode" href="<?php echo esc_url( home_url( '/mando/' ) ); ?>"><?php echo $ico['phone']; // phpcs:ignore ?>Tengo un código</a>
				</div>
				<?php if ( $mpg ) : ?><p class="ax-party-games"><?php echo Arcade_Portal::MP_ICO; // phpcs:ignore ?><?php foreach ( $mpg as $slug => $t ) { printf( '<a href="%s">%s</a>', esc_url( Arcade_Party::tv_url( $slug ) ), esc_html( $t ) ); } ?></p><?php endif; ?>
			</div>
			<svg class="ax-party-art" viewBox="0 0 320 200" role="img" aria-label="Una tele con un juego y cuatro móviles que hacen de mando">
				<defs><linearGradient id="axpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2466"/><stop offset="1" stop-color="#141a33"/></linearGradient></defs>
				<rect x="40" y="10" width="240" height="140" rx="14" fill="#1a1530"/>
				<rect x="50" y="20" width="220" height="120" rx="8" fill="url(#axpg)"/>
				<path d="M160 26v108" stroke="rgba(255,255,255,.18)" stroke-width="2" stroke-dasharray="6 6"/>
				<circle cx="160" cy="80" r="18" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2"/>
				<rect x="62" y="56" width="8" height="34" rx="4" fill="#ff5a5f"/><rect x="250" y="70" width="8" height="34" rx="4" fill="#3fb6ea"/>
				<rect x="112" y="104" width="30" height="8" rx="4" fill="#ffd166"/><rect x="180" y="40" width="30" height="8" rx="4" fill="#5fbf45"/>
				<circle cx="196" cy="92" r="7" fill="#fff"/><path d="M184 97l-14 6M182 90l-16 1" stroke="rgba(255,255,255,.35)" stroke-width="3" stroke-linecap="round"/>
				<path d="M130 150h60l8 14h-76z" fill="#1a1530"/>
				<g class="ax-pp"><?php foreach ( array( array( 36, '#ff5a5f', -8 ), array( 104, '#3fb6ea', 4 ), array( 190, '#ffd166', -4 ), array( 258, '#5fbf45', 8 ) ) as $ph ) : ?>
					<g transform="translate(<?php echo (int) $ph[0]; ?> 150) rotate(<?php echo (int) $ph[2]; ?> 13 24)"><rect width="26" height="46" rx="6" fill="#1a1530"/><rect x="3" y="4" width="20" height="36" rx="3" fill="<?php echo esc_attr( $ph[1] ); ?>"/><path d="M8 20h6M11 17v6" stroke="#1a1530" stroke-width="2.4" stroke-linecap="round"/><circle cx="18" cy="26" r="2.6" fill="#1a1530"/></g>
				<?php endforeach; ?></g>
			</svg>
		</section>
		<?php endif; ?>

		<section class="ax-sec ax-cats" aria-label="Categorías">
			<div class="ax-tiles">
			<?php
			$groups = array_fill_keys( array_keys( Arcade_Portal::LABELS ), array() );
			$own    = array();
			foreach ( $all as $p ) {
				$groups[ Arcade_Portal::genre_of( $p->ID ) ][] = $p;
				if ( Arcade_Portal::is_own( $p->ID ) ) {
					$own[] = $p;
				}
			}
			foreach ( $groups as $slug => $items ) :
				$u = Arcade_Portal::genre_url( $slug );
				if ( ! $items || ! $u ) {
					continue;
				}
				$l    = Arcade_Portal::LABELS[ $slug ];
				$imgs = array();
				foreach ( $items as $p ) {
					$t = Arcade_Core::thumb( $p->ID );
					if ( $t ) {
						$imgs[] = $t;
					}
					if ( count( $imgs ) >= 3 ) {
						break;
					}
				}
				?>
				<a class="ax-tile" href="<?php echo esc_url( $u ); ?>" style="--c:<?php echo esc_attr( $l[1] ); ?>">
					<span class="ax-tile-imgs" aria-hidden="true"><?php foreach ( $imgs as $t ) { echo '<img src="' . esc_url( $t ) . '" alt="" loading="lazy" decoding="async">'; } ?></span>
					<b><?php echo esc_html( $l[0] ); ?></b><small><?php echo count( $items ); ?> juegos</small>
				</a>
			<?php endforeach; ?>
			</div>
		</section>

		<section class="ax-sec" data-ax-recent hidden><?php $sec_head( 'Seguir jugando', $mine_url ); ?><div class="ax-row"></div></section>
		<section class="ax-sec" data-ax-favs hidden style="--c:#e9b949"><?php $sec_head( 'Tus favoritos', $mine_url ); ?><div class="ax-row"></div></section>
		<?php
		$top = get_posts( array( 'post_type' => 'game', 'numberposts' => 12, 'meta_key' => '_game_plays', 'orderby' => 'meta_value_num', 'order' => 'DESC', 'meta_query' => array( array( 'key' => '_game_plays', 'value' => 0, 'compare' => '>', 'type' => 'NUMERIC' ) ) ) );
		if ( count( $top ) >= 6 ) :
			?>
			<section class="ax-sec"><?php $sec_head( 'Los más jugados' ); ?><div class="ax-row ax-rank"><?php foreach ( $top as $i => $p ) { echo '<div class="ax-rk"><span>' . ( $i + 1 ) . '</span>' . Arcade_Portal::card( $p ) . '</div>'; } // phpcs:ignore ?></div></section>
			<?php
		else :
			$rec = array_values( array_filter( $all, static function ( $p ) use ( $pick_ids ) { return ! in_array( $p->ID, $pick_ids, true ); } ) );
			usort( $rec, static function ( $a, $b ) { $d = gmdate( 'Y-m-d' ) . 'r'; return crc32( $d . $a->post_name ) <=> crc32( $d . $b->post_name ); } );
			?>
			<section class="ax-sec"><?php $sec_head( 'Recomendados hoy' ); ?><div class="ax-row"><?php foreach ( array_slice( $rec, 0, 12 ) as $p ) { echo Arcade_Portal::card( $p ); } // phpcs:ignore ?></div></section>
			<?php
		endif;
		// Primero los juegos de redes profesionales (mejor acabado); los propios tienen su fila "Exclusivos".
		$mixed = count( $own ) < count( $all );
		foreach ( $groups as &$items ) {
			usort( $items, static function ( $a, $b ) { return (int) Arcade_Portal::is_own( $a->ID ) - (int) Arcade_Portal::is_own( $b->ID ); } );
		}
		unset( $items );
		if ( $mixed && $own ) :
			shuffle( $own );
			?>
			<section class="ax-sec" style="--c:#6e62f5"><?php $sec_head( 'Exclusivos', add_query_arg( 'exclusivos', 1, $all_url ), count( $own ) ); ?>
				<div class="ax-row"><?php foreach ( array_slice( $own, 0, 12 ) as $p ) { echo Arcade_Portal::card( $p ); } // phpcs:ignore ?></div>
			</section>
			<?php
		endif;
		$n = 0;
		foreach ( $groups as $slug => $items ) :
			if ( ! $items ) {
				continue;
			}
			$l = Arcade_Portal::LABELS[ $slug ];
			if ( in_array( ++$n, array( 3, 6 ), true ) ) {
				echo $ad( 'home' ); // phpcs:ignore
			}
			?>
			<section class="ax-sec" style="--c:<?php echo esc_attr( $l[1] ); ?>"><?php $sec_head( $l[0], Arcade_Portal::genre_url( $slug ), count( $items ) ); ?>
				<div class="ax-row"><?php foreach ( array_slice( $items, 0, 12 ) as $p ) { echo Arcade_Portal::card( $p ); } // phpcs:ignore ?></div>
			</section>
			<?php
		endforeach;
		?>
		<section class="ax-about">
			<h2>Juegos gratis online, sin descargas</h2>
			<p><?php echo esc_html( $brand ); ?> reúne <?php echo count( $all ); ?> juegos HTML5 que se abren al instante en el navegador del móvil, la tablet o el ordenador. No hay que instalar nada ni crear una cuenta: eliges un juego y a jugar.</p>
			<p>Cada juego exclusivo está hecho desde cero con arte, música y efectos propios, y lo probamos en móvil y en escritorio. Los puzles tienen niveles con solución garantizada y los clásicos de cartas y tablero siguen sus reglas de siempre. Tus récords y favoritos se guardan en tu dispositivo.</p>
		</section>
		<?php
	}
endif;
?>
</main>
<footer class="ax-foot"><div class="ax-wrap ax-foot-g">
	<div><a class="ax-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>"><svg class="ax-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" fill="var(--acc)"/><path d="M12 10.5v11l9-5.5z" fill="#fff"/></svg><span><?php echo esc_html( $brand ); ?></span></a>
	<p>Juegos HTML5 gratuitos para móvil, tablet y ordenador. Sin descargas ni registro.</p></div>
	<div><h3>Categorías</h3><ul><?php foreach ( Arcade_Portal::LABELS as $slug => $l ) { $u = Arcade_Portal::genre_url( $slug ); if ( $u ) { printf( '<li><a href="%s">%s</a></li>', esc_url( $u ), esc_html( $l[0] ) ); } } ?></ul></div>
	<div><h3>Portal</h3><ul><li><a href="<?php echo esc_url( $all_url ); ?>">Todos los juegos</a></li><li><a href="<?php echo esc_url( $mine_url ); ?>">Mis juegos</a></li><?php if ( $party ) : ?><li><a href="<?php echo esc_url( $tv_url ); ?>">Jugar en la tele</a></li><?php endif; ?><?php if ( class_exists( 'Arcade_SEO' ) ) { foreach ( Arcade_SEO::legal_links() as $lk ) { printf( '<li><a href="%s">%s</a></li>', esc_url( $lk[1] ), esc_html( $lk[0] ) ); } } ?><li><button type="button" class="ax-linkbtn" data-ax-consent hidden>Preferencias de privacidad</button></li></ul></div>
</div><div class="ax-wrap ax-copy">© <?php echo esc_html( gmdate( 'Y' ) . ' ' . $brand ); ?>. Todos los derechos reservados.</div></footer>
<nav class="ax-tabbar" aria-label="Navegación principal">
	<a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="<?php echo is_front_page() ? 'on' : ''; ?>"><?php echo $ico['home']; // phpcs:ignore ?><span>Inicio</span></a>
	<a href="<?php echo esc_url( $all_url ); ?>" class="<?php echo ( is_post_type_archive( 'game' ) && empty( $_GET['mis'] ) ) || is_tax() ? 'on' : ''; // phpcs:ignore ?>"><?php echo $ico['grid']; // phpcs:ignore ?><span>Explorar</span></a>
	<button type="button" data-ax-find><?php echo $ico['search']; // phpcs:ignore ?><span>Buscar</span></button>
	<?php if ( $party ) : ?><a href="<?php echo esc_url( $tv_url ); ?>" aria-label="Jugar en la tele"><?php echo str_replace( 'width="20" height="20"', 'width="22" height="22"', $ico['tvbig'] ); // phpcs:ignore ?><span>Tele</span></a><?php endif; ?>
	<a href="<?php echo esc_url( $mine_url ); ?>" class="<?php echo ! empty( $_GET['mis'] ) ? 'on' : ''; // phpcs:ignore ?>"><?php echo $ico['star']; // phpcs:ignore ?><span>Mis juegos</span></a>
</nav>
<?php wp_footer(); ?>
</body>
</html>
