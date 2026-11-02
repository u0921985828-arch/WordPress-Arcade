# Triaje del catálogo: qué se queda, qué se rehace y qué se quita

Revisión de los **278 juegos** propios (1.52.0). Es una propuesta: no se ha borrado ni despublicado nada.

## Resumen

| Grupo | Juegos | En la tele |
|---|---:|---:|
| Se queda tal cual | 139 | 89 |
| Rehacer, prioridad A | 20 | 6 |
| Rehacer, prioridad B | 17 | 2 |
| Quitar del catálogo | 102 | 61 |
| **Catálogo final** | **176** | **97** |

## Criterios

- **Se queda**: ya está a la vara de `docs/VARA.md` (los 40 del plan Friv), tiene niveles escritos a mano o reglas completas verificadas (cartas, tablero, puzles lógicos), o es un juego de tele con una idea que no repite ningún otro.
- **Rehacer**: la idea es buena y se busca mucho, pero hoy se genera al azar, dura poco o le falta final. **A** = se busca mucho (Block Blast, Suika, Ball Sort, Moto X3M, Head Soccer, Worms, solitarios…). **B** = clásico de portal con menos tirón. Muchos absorben como modo o escenario a los juegos que se quitan.
- **Quitar**: repite la idea de otro juego mejor (mismo motor y misma sensación), es demasiado corto para tener página propia o quedó flojo. Para AdSense, cien páginas casi iguales cuentan como contenido de poco valor; menos juegos y más distintos suman más.
- Quitar **no es borrar el código**: sale del catálogo web y su dirección redirige (301) al juego que lo sustituye. Los 20 minijuegos de fiesta siguen vivos como rondas de la Ruleta de Minijuegos.

## Antes de quitar nada

1. **Mirar las partidas reales** (`_game_plays`) en el WordPress de producción. Aquí no hay datos de uso, así que el triaje sale del diseño y no del público. Si un juego de la lista de quitar tiene muchas partidas, se pasa a «rehacer».
2. Decidir el modo: despublicar (pasa a borrador y redirige) o borrar del todo. Lo primero se puede deshacer.
3. La tele pierde 61 juegos de su lobby (queda en 97). Si se prefiere, los minijuegos de fiesta pueden quedarse **solo en el lobby de la tele** sin página web.

## Rehacer — prioridad A (20)

| Juego | Tele | Qué hay que hacer |
|---|:-:|---|
| Bichos Artilleros `bichos-artilleros` | sí | tipo «Worms»; absorbe cañones-de-colina |
| Bloques 10×10 `bloques-10x10` |  | tipo «Block Blast», de lo más buscado; falta progresión y retos |
| Brick Breaker DX `brick-breaker-dx` |  | rompeladrillos: 4 diseños; pasar a 20 niveles y jefes |
| Cloud Hopper `cloud-hopper` |  | salto vertical tipo «Doodle Jump»; absorbe lava-escape y ninja-ascent |
| Coches con Balón `coches-con-balon` | sí | tipo «Rocket League» 2D; idea fuerte |
| Color Sort `color-sort` |  | «Ball Sort», muy buscado; pasar a niveles a mano |
| Cut & Drop `cut-and-drop` |  | tipo «Cut the Rope»; niveles a mano con estrellas |
| Flow Lines `flow-lines` |  | «Flow», clásico de portal; pasar a packs de niveles |
| Frog Crossing `frog-crossing` |  | cruce tipo «Crossy Road»; absorbe cruce-sin-fin como modo sin fin |
| Fusión de Frutas `fusion-de-frutas` |  | tipo «Suika», muy buscado; pulir física y meta (absorbe fusion-solar como modo) |
| Fútbol Cabezón `futbol-cabezon` | sí | tipo «Head Soccer», muy buscado; liga y rivales |
| Glotones del Estanque `glotones-del-estanque` | sí | tipo «agar.io»; idea fuerte para la tele |
| Motocross de Colinas `motocross-de-colinas` | sí | tipo «Moto X3M», muy buscado; circuitos a mano y estrellas |
| Plataforma Menguante `plataforma-menguante` | sí | base de una sola «Arena de empujones» que absorbe 8 variantes como escenarios |
| Pyramid Solitaire `pyramid-solitaire` |  | solitario; mismo patrón que klondike |
| Spider Solitaire `spider-solitaire` |  | solitario muy buscado; mismo patrón que klondike (cardlv) |
| Stack Tower 3D `stack-tower-3d` |  | «Stack», juego de un toque muy jugado; falta gancho y remate |
| TriPeaks Solitaire `tripeaks-solitaire` |  | solitario; mismo patrón que klondike |
| Voxel Runner `voxel-runner` |  | corredor sin fin por carriles; absorbe low-poly-skater |
| Wing Tap `wing-tap` |  | un toque tipo «Flappy»; absorbe cave-flyer |

## Rehacer — prioridad B (17)

| Juego | Tele | Qué hay que hacer |
|---|:-:|---|
| Ball Funnel `ball-funnel` |  | dibujar líneas; niveles a mano |
| Bug Garden `bug-garden` |  | ciempiés clásico; oleadas a mano |
| Cube Roller `cube-roller` |  | tipo «Bloxorz»; niveles verificados ya, falta piel y estrellas |
| Grapple Hook `grapple-hook` |  | gancho; absorbe rope-swing |
| Gravity Flip `gravity-flip` |  | corredor de gravedad; niveles a mano |
| Guantes Gigantes `guantes-gigantes` | sí | base de un solo juego de duelos (absorbe dojo y esgrima como estilos) |
| Home Run Derby `home-run-derby` |  | bateo; retos a mano |
| Ice Pusher `ice-pusher` |  | hielo; niveles a mano |
| Laser Mirrors `laser-mirrors` |  | espejos; packs de niveles |
| Lunar Lander `lunar-lander` |  | alunizaje; misiones a mano |
| Micro Tactics `micro-tactics` |  | tácticas por turnos; campaña corta |
| Missile Guard `missile-guard` |  | defensa de misiles clásica; oleadas a mano |
| Pipe Connect `pipe-connect` |  | tuberías; niveles a mano |
| Rock Belt `rock-belt` |  | asteroides clásico; oleadas y jefe |
| Slalom de Banderas `slalom-de-banderas` | sí | base de una sola bajada de nieve con 3 modos (absorbe trineo y descenso) |
| Territory `territory` |  | tipo «Xonix»; niveles |
| Tunnel Digger `tunnel-digger` |  | excavar clásico; niveles a mano |

## Quitar del catálogo (102)

| Juego | Tele | Redirige a | Motivo |
|---|:-:|---|---|
| 2048 Hex `2048-hex` |  | 2048 Classic | variante del 2048 |
| Disco a Cuatro Bandas `disco-a-cuatro-bandas` | sí | Air Hockey | pasa a modo a cuatro |
| Hockey de Barrio `hockey-de-barrio` | sí | Air Hockey | hockey repetido |
| Plank Bridge `plank-bridge` |  | Ball Funnel | física de dibujo repetida |
| Cañones de Colina `canones-de-colina` | sí | Bichos Artilleros | artillería repetida |
| Bowling Flick `bowling-flick` |  | Bolera del Barrio | bolos repetidos |
| Hoop Arc `hoop-arc` |  | Canastas a Duelo | canastas repetidas |
| Robo Rescue `robo-rescue` |  | Castle Knight | plataformas generado, repetido |
| Lava Escape `lava-escape` |  | Cloud Hopper | salto vertical repetido |
| Ninja Ascent `ninja-ascent` |  | Cloud Hopper | salto vertical repetido |
| Planet Hopper `planet-hopper` |  | Cloud Hopper | salto flojo |
| Pizzería en Llamas `pizzeria-en-llamas` | sí | Cocina en Apuros | cocina repetida |
| Marble Roll `marble-roll` |  | Cube Roller | puzle de canica flojo |
| Compartir o Robar `compartir-o-robar` | sí | Dados Mentirosos | flojo |
| Dardos Cricket `dardos-cricket` | sí | Darts Pro | pasa a modo dentro de dardos |
| Crypt Crawler `crypt-crawler` |  | Dungeon Micro | misma mazmorra generada |
| Iso Dungeon Explorer `iso-dungeon-explorer` |  | Dungeon Micro | mazmorra floja |
| Rhythm Tap `rhythm-tap` |  | Flechas de Baile | ritmo repetido |
| Tambores de Fiesta `tambores-de-fiesta` | sí | Flechas de Baile | ritmo repetido |
| Cruce sin Fin `cruce-sin-fin` | sí | Frog Crossing | pasa a modo sin fin |
| Fusión Solar `fusion-solar` |  | Fusión de Frutas | pasa a modo |
| Balonmano Relámpago `balonmano-relampago` | sí | Fútbol de Plaza | deporte de equipo repetido |
| Fútbol Sala Neón `futbol-sala-neon` | sí | Fútbol de Plaza | fútbol repetido |
| Almohadazo Arena `almohadazo-arena` | sí | Gladiadores de Juguete | pelea repetida |
| Robots de Chatarra `robots-de-chatarra` | sí | Gladiadores de Juguete | pelea repetida |
| Rope Swing `rope-swing` |  | Grapple Hook | mismo verbo |
| Dojo Nocturno `dojo-nocturno` | sí | Guantes Gigantes | duelo repetido |
| Esgrima de Bolsillo `esgrima-de-bolsillo` | sí | Guantes Gigantes | duelo repetido |
| Asedio Zombi Coop `asedio-zombi-coop` | sí | Horda a Dúo | cooperativo de oleadas repetido |
| Hero Brawl `hero-brawl` |  | Horda a Dúo | arena de oleadas repetida |
| Slime Arena `slime-arena` |  | Horda a Dúo | arena de oleadas repetida |
| Zombie Siege `zombie-siege` |  | Horda a Dúo | arena de oleadas repetida |
| Jewel Tide `jewel-tide` |  | Jewel Swap | variante contrarreloj |
| Circuito Garaje `circuito-garaje` | sí | Karts de Patio | carrera repetida |
| Rally de Mesa `rally-de-mesa` | sí | Karts de Patio | carrera repetida |
| Canyon Kart `canyon-kart` |  | Low-Poly Rally | misma carrera |
| Neon Drift `neon-drift` |  | Low-Poly Rally | misma carrera |
| Crystal Labyrinth `crystal-labyrinth` |  | Maze Muncher | 3D de laberinto flojo en móvil |
| Iso Maze `iso-maze` |  | Maze Muncher | laberinto flojo |
| Castillo de Dos `castillo-de-dos` | sí | Mazmorra a Cuatro | mazmorra cooperativa repetida |
| Hex Skirmish `hex-skirmish` |  | Micro Tactics | tácticas repetidas |
| Putt Island `putt-island` |  | Mini Golf 3D | minigolf repetido |
| Parchís Exprés `parchis-expres` | sí | Parchís de la Plaza | pasa a modo exprés |
| Bomba Única `bomba-unica` | sí | Patata Explosiva | misma idea (una sola bomba) |
| Penalty Flick `penalty-flick` |  | Penaltis Cara a Cara | penaltis repetidos |
| Bombas Fantasma `bombas-fantasma` | sí | Petardo Plaza | pasa a escenario |
| Petardo Glaciar `petardo-glaciar` | sí | Petardo Plaza | pasa a escenario |
| Petardo por Parejas `petardo-por-parejas` | sí | Petardo Plaza | pasa a modo por parejas |
| Frontón Vasco `fronton-vasco` | sí | Ping Pong Reflex | pala repetida |
| Neon Paddle `neon-paddle` |  | Ping Pong Reflex | pala repetida |
| Bombas de Pintura `bombas-de-pintura` | sí | Pintacasillas | misma idea de pintar suelo |
| Blade Leap `blade-leap` |  | Pixel Dash | plataformas generado, repetido |
| Shadow Dash `shadow-dash` |  | Pixel Dash | plataformas generado, repetido |
| Wall Jumper `wall-jumper` |  | Pixel Dash | plataformas generado, repetido |
| Nonogram Daily `nonogram-daily` |  | Pixel Picross XL | pasa a reto diario dentro de picross |
| Almohadas en Órbita `almohadas-en-orbita` | sí | Plataforma Menguante | tercera pelea de almohadas |
| Choque de Carritos `choque-de-carritos` | sí | Plataforma Menguante | empujones repetidos |
| Coge la Corona `coge-la-corona` | sí | Plataforma Menguante | empujones repetidos |
| Imanes Opuestos `imanes-opuestos` | sí | Plataforma Menguante | empujones repetidos |
| Pelea de Almohadas `pelea-de-almohadas` | sí | Plataforma Menguante | empujones repetidos |
| Pelea de Pingüinos `pelea-de-pinguinos` | sí | Plataforma Menguante | empujones repetidos |
| Pista de Hielo Loca `pista-de-hielo-loca` | sí | Plataforma Menguante | empujones repetidos |
| Rey de la Colina `rey-de-la-colina` | sí | Plataforma Menguante | empujones repetidos |
| Sumo de Cojines `sumo-de-cojines` | sí | Plataforma Menguante | empujones repetidos |
| Sumo de Equilibrio `sumo-de-equilibrio` | sí | Plataforma Menguante | empujones repetidos |
| Bolos Humanos `bolos-humanos` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Caballitos de Feria `caballitos-de-feria` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Carrera Machacabotones `carrera-machacabotones` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Carrera de Sacos `carrera-de-sacos` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Cazamoscas `cazamoscas` | sí | Ruleta de Minijuegos | flojo |
| Cuenta Ovejas `cuenta-ovejas` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Duelo del Oeste `duelo-del-oeste` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Estatuas Musicales `estatuas-musicales` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Foto de Grupo `foto-de-grupo` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Globo de Todos `globo-de-todos` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Globos a Presión `globos-a-presion` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Huevo en la Cuchara `huevo-en-la-cuchara` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Lluvia de Yunques `lluvia-de-yunques` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Memoria de Semáforo `memoria-de-semaforo` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Pesca Rápida `pesca-rapida` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Pulso de Titanes `pulso-de-titanes` | sí | Ruleta de Minijuegos | machacabotones flojo |
| Reflex Grid `reflex-grid` |  | Ruleta de Minijuegos | topos en solitario, flojo |
| Relevo de Cubos `relevo-de-cubos` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Salta la Comba `salta-la-comba` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Tartas al Blanco `tartas-al-blanco` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Topo Burlón `topo-burlon` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Toro Mecánico `toro-mecanico` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Tren de la Bruja `tren-de-la-bruja` | sí | Ruleta de Minijuegos | minijuego de 30 s; sigue como ronda de la Ruleta |
| Comilona a Cuatro `comilona-a-cuatro` | sí | Serpientes Hambrientas | flojo |
| Descenso Loco a Cuatro `descenso-loco-a-cuatro` | sí | Slalom de Banderas | nieve repetida |
| Trineo Nevado `trineo-nevado` | sí | Slalom de Banderas | nieve repetida |
| Neon Runner `neon-runner` |  | Spike Run | mismo corredor |
| Bullet Rain `bullet-rain` |  | Starfall Defender | matamarcianos repetido |
| Lights Out `lights-out` |  | Sudoku Zen | puzle de poco recorrido |
| Slide 15 `slide-15` |  | Sudoku Zen | puzle de poco recorrido |
| Tank Duel `tank-duel` | sí | Tanques Rebote | dos juegos de tanques |
| Tetra Drop Marathon `tetra-drop-marathon` |  | Tetra Drop | pasa a modo dentro de Tetra |
| Hex Defense `hex-defense` |  | Tower Guard | defensa repetida |
| Maze Defense `maze-defense` |  | Tower Guard | defensa repetida |
| Low-Poly Skater `low-poly-skater` |  | Voxel Runner | mismo corredor por carriles |
| Cave Flyer `cave-flyer` |  | Wing Tap | mismo juego de un toque |
| Drone Flight `drone-flight` |  | Wing Tap | vuelo flojo |

## Se queda tal cual (139)

2048 Classic, Abecedario Veloz (tele), Ahorcado Ilustrado (tele), Air Hockey (tele), Ajedrez de Salón (tele), Anagramas (tele), Arco y Viento (tele), Arena de Asteroides (tele), Atasco, Balón Prisionero (tele), Banderas del Mundo (tele), Barcos Piratas (tele), Barrel Climb, Battle Grid, Bola Ocho Duo (tele), Bolera del Barrio (tele), Bomberos del Barrio (tele), Brisca de Bar (tele), Burbujas Arcoíris, Cadena de Garabatos (tele), Canasta de Patio (tele), Canastas a Duelo (tele), Carrera de Plataformas (tele), Caseta de Tiro (tele), Castle Knight, Checkers, Chinchón Casero (tele), Choque de Trenes (tele), Cinquillo (tele), Ciudad de Bloques, Cocina en Apuros (tele), Columnas de Joyas, Combinación Oculta (tele), Cuatro en Línea (tele), Cálculo Veloz (tele), Dados Mentirosos (tele), Damas Chinas (tele), Darts Pro, Defensa de la Aldea (tele), Dibuja y Adivina (tele), Dice Poker, Dominó por Parejas (tele), Duelo de Biplanos (tele), Dungeon Micro, El Burro (tele), El Suelo es Lava (tele), Escape del Faro, Escape del Museo, Escondite de Cajas (tele), Esquinas de Colores (tele), Estrellas Ocultas, Fichas de Colores (tele), Flechas de Baile (tele), FreeCell, Futbolín de Bar (tele), Fábrica de Cintas, Fútbol de Plaza (tele), Gatos en Cajas, Gladiadores de Juguete (tele), Granja de Bolsillo, Gravedad Compartida (tele), Guerra de Bolas de Nieve (tele), Honda de Frutas, Horda a Dúo (tele), Invasores a Dúo (tele), Jewel Swap, Juegos de Pista (tele), Justa de Caballeros (tele), Karts de Patio (tele), Klondike Solitaire, La Escoba (tele), La Oca Viajera (tele), Letras que Caen, Low-Poly Rally, Mahjong Solitaire, Mancala de Semillas (tele), Mapa Mudo de España (tele), Maze Muncher, Mazmorra a Cuatro (tele), Metro en Hora Punta, Mina de Gemas (tele), Mine Sweep, Mini Golf 3D, Minigolf Party (tele), Mus de Peña (tele), Más o Menos (tele), Mímica Exprés (tele), Neon Trails (tele), Palabra del Día, Palmas Flamencas (tele), Parchís de la Plaza (tele), Patata Explosiva (tele), Penaltis Cara a Cara (tele), Perros Pastores (tele), Petanca de Verano (tele), Petardo Plaza (tele), Piano de Colores, Pinball Espacial (tele), Pinball del Sótano (tele), Ping Pong Reflex (tele), Pintacasillas (tele), Pixel Dash, Pixel Invaders, Pixel Picross XL, Pool Break, Puentes entre Islas, Puños de Papel (tele), Pádel de Cristal (tele), Quita la Silla (tele), Restaurante Rápido, Reversi, Ruleta de Minijuegos (tele), Serpent Grid, Serpientes Hambrientas (tele), Serpientes y Escaleras (tele), Siete y Medio (tele), Sokoban Warehouse, Sopa de Letras, Spike Run, Starfall Defender, Sudoku Zen, Suma Diez, Tangram Studio, Tanques Rebote (tele), Tejados Ninja (tele), Tenis Rápido (tele), Tetra Drop, Tetra Duelo (tele), Tiendas y Árboles, Tira y Afloja (tele), Torre de Bloques (tele), Tower Guard, Tres en Raya Anidado (tele), Trivia de Sobremesa (tele), Triángulos Numerados (tele), Tute Cabrón (tele), Verdad o Bulo (tele), Vías del Valle, Vóley Playa (tele)
