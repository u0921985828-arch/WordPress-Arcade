/*
 * Kuboplay Shield — panel de ajustes.
 *
 * Tres cosas, todas sin librerías ni peticiones de red:
 *   1. La gráfica de 30 días, dibujada en un canvas (como los juegos).
 *   2. El desplegable «Ver todos los ajustes», que recuerda si lo dejaste abierto.
 *   3. Paginación de las tablas largas que traigan los bloques de los módulos.
 *
 * Si este fichero no se carga, el panel sigue funcionando: la gráfica tiene su
 * tabla equivalente, el desplegable es un <details> de verdad y las tablas se
 * ven enteras dentro de su zona con barra de desplazamiento.
 */
( function () {
	'use strict';

	var PAL = {
		ink: '#1a1530',
		line: '#e2e0ee',
		dim: '#5f5b7a',
		card: '#ffffff'
	};
	var PAL_DARK = {
		ink: '#efedf9',
		line: '#382f5c',
		dim: '#a9a2ca',
		card: '#211b3b'
	};

	function dark() {
		return !!( window.matchMedia && window.matchMedia( '(prefers-color-scheme: dark)' ).matches );
	}

	function pal() {
		return dark() ? PAL_DARK : PAL;
	}

	/* ── 1. Gráfica ──────────────────────────────────────────────────────── */

	function Chart( canvas, data ) {
		var off = {};          // series apagadas desde la leyenda
		var hover = -1;        // día bajo el puntero
		var tip = null;
		var lastML = 34;   // margen izquierdo real del último dibujado

		function nice( max ) {
			if ( max <= 4 ) { return 4; }
			var pot = Math.pow( 10, Math.floor( Math.log( max ) / Math.LN10 ) );
			var n = max / pot;
			var paso = n <= 1 ? 1 : ( n <= 2 ? 2 : ( n <= 5 ? 5 : 10 ) );
			return paso * pot;
		}

		function visibles() {
			var out = [];
			for ( var i = 0; i < data.series.length; i++ ) {
				if ( ! off[ data.series[ i ].key ] ) { out.push( data.series[ i ] ); }
			}
			return out;
		}

		function draw() {
			var c = pal();
			var dpr = Math.min( 2, window.devicePixelRatio || 1 );
			var w = canvas.clientWidth || 600;
			var h = canvas.clientHeight || 220;
			if ( w < 20 || h < 20 ) { return; }

			canvas.width = Math.round( w * dpr );
			canvas.height = Math.round( h * dpr );
			var x = canvas.getContext( '2d' );
			x.setTransform( dpr, 0, 0, dpr, 0, 0 );
			x.clearRect( 0, 0, w, h );

			var n = data.days.length;
			if ( ! n ) { return; }

			var serie = visibles();
			var conTotal = ! off.total;
			var max = 0;
			var i, j;
			for ( i = 0; i < n; i++ ) {
				if ( conTotal ) { max = Math.max( max, data.total[ i ] ); }
				for ( j = 0; j < serie.length; j++ ) { max = Math.max( max, serie[ j ].values[ i ] ); }
			}
			var techo = nice( max || 4 );

			// Margen izquierdo según lo ancho que sea el número más grande.
			x.font = '11px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
			var ml = Math.ceil( x.measureText( String( techo ) ).width ) + 12;
			lastML = ml;
			var mr = 6, mt = 10, mb = 22;
			var gw = Math.max( 10, w - ml - mr );
			var gh = Math.max( 10, h - mt - mb );

			var px = function ( i2 ) { return ml + ( n === 1 ? gw / 2 : ( gw * i2 ) / ( n - 1 ) ); };
			var py = function ( v ) { return mt + gh - ( gh * v ) / techo; };

			// Rejilla y escala
			x.strokeStyle = c.line;
			x.fillStyle = c.dim;
			x.lineWidth = 1;
			x.textAlign = 'right';
			x.textBaseline = 'middle';
			for ( i = 0; i <= 4; i++ ) {
				var v = ( techo * i ) / 4;
				var y = Math.round( py( v ) ) + 0.5;
				x.beginPath();
				x.moveTo( ml, y );
				x.lineTo( ml + gw, y );
				x.stroke();
				if ( 0 === i || 2 === i || 4 === i ) {
					x.fillText( String( Math.round( v ) ), ml - 6, y );
				}
			}

			// Fechas: cada 7 días y siempre la última.
			x.textAlign = 'center';
			x.textBaseline = 'top';
			for ( i = 0; i < n; i++ ) {
				if ( i % 7 !== 0 && i !== n - 1 ) { continue; }
				var tx = Math.min( w - 14, Math.max( 14, px( i ) ) );
				x.fillText( data.days[ i ].short, tx, mt + gh + 6 );
			}

			var linea = function ( vals, col, gordo, relleno ) {
				x.beginPath();
				for ( var k = 0; k < n; k++ ) {
					var X = px( k ), Y = py( vals[ k ] );
					if ( 0 === k ) { x.moveTo( X, Y ); } else { x.lineTo( X, Y ); }
				}
				if ( relleno ) {
					x.save();
					x.lineTo( px( n - 1 ), mt + gh );
					x.lineTo( px( 0 ), mt + gh );
					x.closePath();
					x.globalAlpha = dark() ? 0.16 : 0.1;
					x.fillStyle = col;
					x.fill();
					x.restore();
					x.beginPath();
					for ( var k2 = 0; k2 < n; k2++ ) {
						var X2 = px( k2 ), Y2 = py( vals[ k2 ] );
						if ( 0 === k2 ) { x.moveTo( X2, Y2 ); } else { x.lineTo( X2, Y2 ); }
					}
				}
				x.strokeStyle = col;
				x.lineWidth = gordo;
				x.lineJoin = 'round';
				x.lineCap = 'round';
				x.stroke();
			};

			for ( j = 0; j < serie.length; j++ ) {
				linea( serie[ j ].values, serie[ j ].color, 2, false );
			}
			if ( conTotal ) {
				linea( data.total, c.ink, 2.6, true );
			}

			// Día señalado
			if ( hover >= 0 && hover < n ) {
				var hx = px( hover );
				x.save();
				x.strokeStyle = c.dim;
				x.globalAlpha = 0.5;
				x.setLineDash( [ 3, 3 ] );
				x.beginPath();
				x.moveTo( hx, mt );
				x.lineTo( hx, mt + gh );
				x.stroke();
				x.restore();
				if ( conTotal ) {
					x.fillStyle = c.ink;
					x.beginPath();
					x.arc( hx, py( data.total[ hover ] ), 3.5, 0, Math.PI * 2 );
					x.fill();
				}
				for ( j = 0; j < serie.length; j++ ) {
					x.fillStyle = serie[ j ].color;
					x.beginPath();
					x.arc( hx, py( serie[ j ].values[ hover ] ), 2.6, 0, Math.PI * 2 );
					x.fill();
				}
			}
		}

		function textoDia( i ) {
			var t = data.days[ i ].iso + ' · ' + data.total[ i ] + ' ' + data.i18n.blocks;
			for ( var j = 0; j < data.series.length; j++ ) {
				if ( data.series[ j ].values[ i ] ) {
					t += ' · ' + data.series[ j ].label + ' ' + data.series[ j ].values[ i ];
				}
			}
			return t;
		}

		function mostrarTip( ev, i ) {
			if ( ! tip ) {
				tip = document.createElement( 'p' );
				tip.className = 'kps-tip';
				tip.setAttribute( 'aria-live', 'polite' );
				canvas.parentNode.appendChild( tip );
			}
			tip.textContent = textoDia( i );
		}

		function pos( ev ) {
			var r = canvas.getBoundingClientRect();
			var n = data.days.length;
			if ( n < 2 || r.width <= 0 ) { return -1; }
			var ml = lastML, mr = 6;
			var rel = ( ev.clientX - r.left - ml ) / Math.max( 1, r.width - ml - mr );
			return Math.max( 0, Math.min( n - 1, Math.round( rel * ( n - 1 ) ) ) );
		}

		canvas.addEventListener( 'pointermove', function ( ev ) {
			var i = pos( ev );
			if ( i !== hover ) {
				hover = i;
				draw();
				if ( i >= 0 ) { mostrarTip( ev, i ); }
			}
		} );
		canvas.addEventListener( 'pointerleave', function () {
			hover = -1;
			draw();
			if ( tip ) { tip.textContent = ''; }
		} );

		// Leyenda: se puede apagar y encender cada línea.
		var legs = document.querySelectorAll( '[data-kps-serie]' );
		Array.prototype.forEach.call( legs, function ( li ) {
			var key = li.getAttribute( 'data-kps-serie' );
			var b = document.createElement( 'button' );
			b.type = 'button';
			b.className = 'kps-leg-b';
			b.setAttribute( 'aria-pressed', 'true' );
			while ( li.firstChild ) { b.appendChild( li.firstChild ); }
			li.appendChild( b );
			b.addEventListener( 'click', function () {
				off[ key ] = ! off[ key ];
				li.classList.toggle( 'is-off', !! off[ key ] );
				b.setAttribute( 'aria-pressed', off[ key ] ? 'false' : 'true' );
				draw();
			} );
		} );

		draw();

		var t = null;
		window.addEventListener( 'resize', function () {
			if ( t ) { clearTimeout( t ); }
			t = setTimeout( draw, 120 );
		} );
		if ( window.matchMedia ) {
			var mq = window.matchMedia( '(prefers-color-scheme: dark)' );
			if ( mq.addEventListener ) { mq.addEventListener( 'change', draw ); }
		}
	}

	/* ── 2. Ver todo ─────────────────────────────────────────────────────── */

	function verTodo() {
		var d = document.querySelector( '.kps-more' );
		if ( ! d ) { return; }
		var campo = document.querySelector( '[data-kps-ver]' );
		var recordado = null;
		try { recordado = window.localStorage.getItem( 'kpShieldVer' ); } catch ( e ) {}
		if ( 'todo' === recordado && ! d.open ) { d.open = true; }
		var sync = function () {
			if ( campo ) { campo.value = d.open ? 'todo' : ''; }
			try { window.localStorage.setItem( 'kpShieldVer', d.open ? 'todo' : '' ); } catch ( e ) {}
		};
		sync();
		d.addEventListener( 'toggle', sync );
	}

	/* ── 3. Tablas largas de los bloques ─────────────────────────────────── */

	function paginar( zona ) {
		var por = parseInt( zona.getAttribute( 'data-kps-paginate' ), 10 ) || 14;
		var tablas = zona.querySelectorAll( 'table' );
		Array.prototype.forEach.call( tablas, function ( tabla ) {
			var cuerpo = tabla.tBodies && tabla.tBodies[ 0 ];
			if ( ! cuerpo ) { return; }
			var filas = Array.prototype.slice.call( cuerpo.rows );
			if ( filas.length <= por ) { return; }

			var paginas = Math.ceil( filas.length / por );
			var p = 0;

			var barra = document.createElement( 'div' );
			barra.className = 'kps-pager';
			var ant = document.createElement( 'button' );
			ant.type = 'button';
			ant.textContent = '‹';
			ant.setAttribute( 'aria-label', 'Anterior' );
			var sig = document.createElement( 'button' );
			sig.type = 'button';
			sig.textContent = '›';
			sig.setAttribute( 'aria-label', 'Siguiente' );
			var txt = document.createElement( 'span' );
			txt.setAttribute( 'aria-live', 'polite' );
			barra.appendChild( ant );
			barra.appendChild( txt );
			barra.appendChild( sig );
			tabla.parentNode.insertBefore( barra, tabla.nextSibling );

			var pinta = function () {
				for ( var i = 0; i < filas.length; i++ ) {
					filas[ i ].style.display = ( i >= p * por && i < ( p + 1 ) * por ) ? '' : 'none';
				}
				txt.textContent = ( p + 1 ) + ' / ' + paginas + ' (' + filas.length + ')';
				ant.disabled = 0 === p;
				sig.disabled = p >= paginas - 1;
			};
			ant.addEventListener( 'click', function () { if ( p > 0 ) { p--; pinta(); } } );
			sig.addEventListener( 'click', function () { if ( p < paginas - 1 ) { p++; pinta(); } } );
			pinta();
			// Con paginación ya no hace falta la altura máxima con desplazamiento.
			zona.style.maxHeight = 'none';
		} );
	}

	function arranca() {
		var canvas = document.getElementById( 'kps-chart' );
		var data = window.KPShieldChart;
		if ( canvas && data && data.days && data.days.length && ! data.empty ) {
			Chart( canvas, data );
		}
		verTodo();
		Array.prototype.forEach.call( document.querySelectorAll( '[data-kps-paginate]' ), paginar );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', arranca );
	} else {
		arranca();
	}
} )();
