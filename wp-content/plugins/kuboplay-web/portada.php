<?php
/**
 * Portada: Landrace Hunters con su botón de jugar, aviso +18 y huecos de anuncios.
 * Página propia (ignora el tema), como la del juego.
 *
 * @package kuboplay-web
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$kpw_o     = Kuboplay_Web::opts();
$kpw_title = Landrace_Hunters::opt( 'title' ) ? Landrace_Hunters::opt( 'title' ) : 'Landrace Hunters';
$kpw_play  = Landrace_Hunters::play_url();
$kpw_icon  = trailingslashit( Landrace_Hunters::game_url() ) . 'icon-576.png';
$kpw_text  = $kpw_o['texto'] ? $kpw_o['texto'] : 'Un RPG de barrio en pixel art: cultiva tus propias variedades, crúzalas para conseguir genética única, véndelas en los clubs y esquiva a la policía y a los rivales. Gratis, en el navegador, sin descargas y con la partida guardada en tu dispositivo.';
$kpw_desc  = wp_strip_all_tags( $kpw_text );
$kpw_ads   = array_filter( array( 'top' => $kpw_o['ad_top'], 'bot' => $kpw_o['ad_bot'] ) );
$kpw_owner = $kpw_o['owner'] ? $kpw_o['owner'] : get_bloginfo( 'name' );

$kpw_ad = static function ( $where ) use ( $kpw_ads ) {
	if ( empty( $kpw_ads[ $where ] ) ) {
		return;
	}
	// El código va dentro de <template>: el navegador no lo ejecuta hasta que el visitante
	// acepta las cookies y kpw() lo pasa a la página.
	echo '<aside class="kpw-ad" data-kpw-ad="' . esc_attr( $where ) . '"><span class="kpw-adl">Publicidad</span><div class="kpw-slot"></div>'
		. '<template>' . $kpw_ads[ $where ] . '</template></aside>'; // phpcs:ignore WordPress.Security.EscapeOutput -- código del anuncio, puesto por el administrador
};
?><!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title><?php echo esc_html( $kpw_title ); ?> · Juego gratis en el navegador (+18)</title>
<meta name="description" content="<?php echo esc_attr( wp_trim_words( $kpw_desc, 30, '…' ) ); ?>">
<meta name="rating" content="adult">
<meta name="theme-color" content="#0b0f1e">
<link rel="canonical" href="<?php echo esc_url( home_url( '/' ) ); ?>">
<link rel="icon" href="<?php echo esc_url( $kpw_icon ); ?>">
<meta property="og:type" content="website">
<meta property="og:title" content="<?php echo esc_attr( $kpw_title ); ?>">
<meta property="og:description" content="<?php echo esc_attr( wp_trim_words( $kpw_desc, 30, '…' ) ); ?>">
<meta property="og:image" content="<?php echo esc_url( $kpw_icon ); ?>">
<meta property="og:url" content="<?php echo esc_url( home_url( '/' ) ); ?>">
<style>
:root{--bg:#0b0f1e;--card:#141a30;--ink:#eef1ff;--mute:#a3abd0;--ac:#4fae5a;--ac2:#8fdc7a;--ln:#1a1530}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(120% 70% at 50% -10%,#1d3a26 0,var(--bg) 60%) fixed,var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:860px;margin:0 auto;padding:calc(20px + env(safe-area-inset-top)) 16px 24px}
.kpw-hero{display:grid;grid-template-columns:minmax(0,1fr);justify-items:center;text-align:center;gap:12px;padding:18px 0 8px}
.kpw-hero img{width:148px;height:148px;image-rendering:pixelated;border-radius:28px;border:3px solid var(--ln);box-shadow:0 10px 0 rgba(0,0,0,.35),0 0 0 6px rgba(79,174,90,.18)}
h1{margin:6px 0 0;font-size:clamp(30px,8vw,50px);line-height:1.05;letter-spacing:-.01em}
.kpw-tag{margin:0;color:var(--ac2);font-weight:600}
.kpw-18{display:inline-flex;align-items:center;gap:8px;margin:2px 0 0;padding:4px 12px;border-radius:99px;border:1px solid rgba(255,255,255,.18);color:var(--mute);font-size:14px}
.kpw-18 b{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#c2413a;color:#fff;font-size:12px}
.kpw-play{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:58px;margin-top:8px;padding:0 30px;border-radius:16px;border:3px solid var(--ln);background:var(--ac);color:#08130a;font-weight:800;font-size:20px;text-decoration:none;box-shadow:0 6px 0 #2c6e35}
.kpw-play:active{transform:translateY(4px);box-shadow:0 2px 0 #2c6e35}
.kpw-play svg{width:22px;height:22px}
.kpw-note{margin:0;color:var(--mute);font-size:13.5px;max-width:420px}
.kpw-txt{max-width:640px;margin:18px auto 0;color:var(--ink);text-align:center}
.kpw-feat{list-style:none;margin:22px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}
.kpw-feat li{background:var(--card);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px 16px}
.kpw-feat strong{display:block;color:var(--ac2);margin-bottom:2px}
.kpw-feat span{color:var(--mute);font-size:14.5px}
.kpw-ad{margin:22px auto 0;max-width:100%;text-align:center;overflow:hidden}
.kpw-ad[hidden]{display:none}
.kpw-adl{display:block;margin-bottom:4px;color:var(--mute);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.kpw-slot{display:flex;justify-content:center;max-width:100%;overflow:hidden}
.kpw-slot img{max-width:100%;height:auto}
footer{max-width:860px;margin:30px auto 0;padding:18px 16px calc(24px + env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.08);color:var(--mute);font-size:14px;display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:center}
footer a,footer button{color:var(--mute);font:inherit;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:3px;min-height:32px}
#kpw-ck{position:fixed;left:50%;bottom:calc(12px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:50;width:min(560px,calc(100vw - 24px));padding:14px 16px;border-radius:16px;background:#151b33;border:1px solid rgba(255,255,255,.16);box-shadow:0 10px 30px rgba(0,0,0,.55);font-size:14.5px}
#kpw-ck[hidden]{display:none}
#kpw-ck p{margin:0 0 10px}
#kpw-ck div{display:flex;gap:10px;flex-wrap:wrap}
#kpw-ck button{flex:1 1 140px;min-height:46px;border-radius:12px;border:0;font:700 15px system-ui,sans-serif;cursor:pointer}
#kpw-ck .ok{background:var(--ac);color:#08130a}
#kpw-ck .no{background:transparent;color:var(--ink);border:1px solid rgba(255,255,255,.25)}
</style>
</head>
<body>
<main>
	<section class="kpw-hero">
		<img src="<?php echo esc_url( $kpw_icon ); ?>" width="148" height="148" alt="">
		<h1><?php echo esc_html( $kpw_title ); ?></h1>
		<p class="kpw-tag">Genética de barrio · cultiva, cruza y vende</p>
		<p class="kpw-18"><b>+18</b> Solo para mayores de edad</p>
		<a class="kpw-play" href="<?php echo esc_url( $kpw_play ); ?>"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>Tengo 18 años · Jugar</a>
		<p class="kpw-note">Gratis, en el navegador, sin registro. Es un juego de ficción: no vende ni ofrece ninguna sustancia.</p>
	</section>
	<?php $kpw_ad( 'top' ); ?>
	<p class="kpw-txt"><?php echo esc_html( $kpw_text ); ?></p>
	<ul class="kpw-feat">
		<li><strong>Cultiva y cruza</strong><span>Semillas, esquejes y madres: consigue variedades que nadie más tiene.</span></li>
		<li><strong>Un barrio vivo</strong><span>Clubs, tiendas, el puerto y Bilbao por dentro, con día, noche y clima.</span></li>
		<li><strong>Móvil u ordenador</strong><span>Mando táctil en el móvil y teclado o ratón en el ordenador. Se puede instalar como app.</span></li>
	</ul>
	<?php $kpw_ad( 'bot' ); ?>
</main>
<footer>
	<span>© <?php echo esc_html( gmdate( 'Y' ) . ' ' . $kpw_owner ); ?></span>
	<?php foreach ( Kuboplay_Web::legal_links() as $kpw_l ) : ?>
		<a href="<?php echo esc_url( $kpw_l[1] ); ?>"><?php echo esc_html( $kpw_l[0] ); ?></a>
	<?php endforeach; ?>
	<?php if ( $kpw_ads ) : ?>
		<button type="button" id="kpw-pref">Preferencias de cookies</button>
	<?php endif; ?>
</footer>
<?php if ( $kpw_ads ) : ?>
<div id="kpw-ck" role="dialog" aria-label="Cookies" hidden>
	<p>Usamos cookies de terceros para mostrar anuncios, que es lo que mantiene el juego gratis. Sin tu permiso no se carga ninguno.</p>
	<div><button type="button" class="no" data-v="0">Rechazar</button><button type="button" class="ok" data-v="1">Aceptar</button></div>
</div>
<script>
(function () {
	var K = 'kpw-consent', ck = document.getElementById('kpw-ck'), done = false;
	function get() { try { return localStorage.getItem(K); } catch (e) { return null; } }
	function put(v) { try { localStorage.setItem(K, v); } catch (e) {} }
	// Pasa el código de cada <template> a la página. Cada <script> se crea de nuevo antes de
	// insertarlo (con sus atributos y su texto), así se ejecuta una vez en todos los navegadores.
	function load() {
		if (done) return; done = true;
		document.querySelectorAll('[data-kpw-ad]').forEach(function (box) {
			var tpl = box.querySelector('template'), slot = box.querySelector('.kpw-slot');
			if (!tpl || !slot) return;
			var frag = document.importNode(tpl.content, true);
			frag.querySelectorAll('script').forEach(function (old) {
				var s = document.createElement('script');
				for (var i = 0; i < old.attributes.length; i++) s.setAttribute(old.attributes[i].name, old.attributes[i].value);
				s.text = old.text;
				old.parentNode.replaceChild(s, old);
			});
			slot.appendChild(frag);
		});
	}
	function hideAds(h) { document.querySelectorAll('[data-kpw-ad]').forEach(function (b) { b.hidden = h; }); }
	var v = get();
	if (v === '1') load(); else { hideAds(true); if (v !== '0') ck.hidden = false; }
	ck.addEventListener('click', function (e) {
		var b = e.target.closest('button'); if (!b) return;
		var was = get(); put(b.getAttribute('data-v')); ck.hidden = true;
		if (b.getAttribute('data-v') === '1') { hideAds(false); load(); }
		else if (was === '1') location.reload(); // Retirar el permiso: fuera lo ya cargado.
	});
	document.getElementById('kpw-pref').addEventListener('click', function () { ck.hidden = false; });
})();
</script>
<?php endif; ?>
</body>
</html>
