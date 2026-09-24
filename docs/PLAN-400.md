# Plan 400 — 400 juegos nuevos con foco multijugador

Objetivo del dueño: más juegos para jugar con más gente, **400 juegos nuevos** (500 en total), sin repetir lo que ya hay, con clásicos, no tan clásicos e inventos propios. Restricciones: canvas 2D, sin librerías, arte por código, runtime `kit.js`, mobile-first y **modo tele** (hasta 4 móviles como mando: joystick + A/B, sin puntero).

Resumen: 400 juegos en 16 familias; **284 multijugador (71 %)**, 124 originales, 171 clásicos con giro; 41 motores nuevos + 37 actuales ampliados; 8 oleadas de 50 (la 1.ª, fiesta en la tele); ≈ 494 jornadas de agente; zip proyectado ≈ 6,5 MB → dividir en núcleo + paquetes por oleada.

---

## 1. Análisis del catálogo actual (100 juegos, 46 motores + 2 independientes)

### 1.1 Por motor / mecánica

| Motor | Juegos | Género | Jugadores | Entrada |
|---|---|---|---|---|
| snake | Serpent Grid | arcade | 1 | mando/teclado/táctil |
| neonpong | Neon Paddle | arcade | 1 | ratón/teclado/táctil |
| shooter | Starfall Defender, Pixel Invaders, Bug Garden, Bullet Rain | arcade, platformer | 1 | mando/ratón/teclado/táctil |
| rocks | Rock Belt | arcade | 1 | mando/teclado |
| maze | Maze Muncher, Tunnel Digger, Iso Maze, Iso Dungeon Explorer | 3d-webgl, arcade | 1 | mando/teclado/táctil |
| tetra | Tetra Drop, Tetra Drop Marathon | arcade | 1 | mando/teclado/táctil |
| breakout | Brick Breaker DX | arcade | 1 | ratón/teclado/táctil |
| frog | Frog Crossing | arcade | 1 | mando/teclado/táctil |
| missile | Missile Guard | arcade | 1 | ratón/táctil |
| lander | Lunar Lander | arcade | 1 | mando/teclado |
| topdown | Tank Duel, Dungeon Micro, Crypt Crawler, Slime Arena, Zombie Siege, Hero Brawl | arcade, platformer | 1; Tank Duel 1–4 | mando/ratón/teclado/táctil |
| gridmover | Neon Trails, Territory | arcade | 1; Neon Trails 1–4 | mando/teclado |
| runner | Cave Flyer, Wing Tap, Spike Run, Neon Runner, Gravity Flip | arcade, platformer | 1 | mando/ratón/teclado/táctil |
| platform | Barrel Climb, Ninja Ascent, Cloud Hopper, Lava Escape | arcade, platformer | 1 | mando/teclado/táctil |
| g2048 | 2048 Classic, 2048 Hex | puzzle | 1 | teclado/táctil |
| match3 | Jewel Swap, Jewel Tide | puzzle | 1 | ratón/táctil |
| nonogram | Nonogram Daily, Pixel Picross XL | puzzle | 1 | ratón/táctil |
| sokoban | Sokoban Warehouse, Ice Pusher | puzzle | 1 | mando/teclado/táctil |
| rope | Cut & Drop | puzzle | 1 | ratón/táctil |
| drawphys | Ball Funnel, Plank Bridge | puzzle | 1 | ratón/táctil |
| logic | Sudoku Zen, Mine Sweep, Lights Out, Pipe Connect, Slide 15 | puzzle | 1 | ratón/teclado/táctil |
| flow | Flow Lines | puzzle | 1 | ratón/táctil |
| colorsort | Color Sort | puzzle | 1 | ratón/táctil |
| lasers | Laser Mirrors | puzzle | 1 | ratón/táctil |
| poly | Tangram Studio | puzzle | 1 | ratón/táctil |
| platformer | Pixel Dash, Wall Jumper, Blade Leap, Rope Swing, Castle Knight, Robo Rescue, Shadow Dash, Grapple Hook | platformer | 1 | mando/ratón/teclado/táctil |
| cards | Klondike Solitaire, Spider Solitaire, FreeCell, Pyramid Solitaire, TriPeaks Solitaire | strategy-cards | 1 | ratón/táctil |
| mahjong | Mahjong Solitaire | strategy-cards | 1 | ratón/táctil |
| td | Tower Guard, Maze Defense, Hex Defense | strategy-cards | 1 | ratón/táctil |
| tactics | Micro Tactics, Hex Skirmish | strategy-cards | 1 | ratón/teclado/táctil |
| board | Checkers, Reversi | strategy-cards | 1 | ratón/táctil |
| battle | Battle Grid | strategy-cards | 1 | ratón/táctil |
| dice | Dice Poker | strategy-cards | 1 | ratón/táctil |
| road | Low-Poly Rally, Neon Drift, Canyon Kart, Voxel Runner, Low-Poly Skater | 3d-webgl | 1 | mando/teclado/táctil |
| golf | Mini Golf 3D, Putt Island | 3d-webgl | 1 | ratón/táctil |
| raycast | Crystal Labyrinth | 3d-webgl | 1 | mando/teclado/táctil |
| stack | Stack Tower 3D | 3d-webgl | 1 | ratón/teclado/táctil |
| marble | Marble Roll | 3d-webgl | 1 | mando/teclado/táctil |
| drone | Drone Flight | 3d-webgl | 1 | mando/teclado |
| cube | Cube Roller | 3d-webgl | 1 | teclado/táctil |
| planet | Planet Hopper | 3d-webgl | 1 | teclado/táctil |
| penalty | Penalty Flick | sports-casual | 1 | táctil |
| hoop | Hoop Arc | sports-casual | 1 | ratón/táctil |
| rhythm | Rhythm Tap | sports-casual | 1 | teclado/táctil |
| bowling | Bowling Flick | sports-casual | 1 | táctil |
| pool | Pool Break | sports-casual | 1 | ratón/táctil |
| darts | Darts Pro | sports-casual | 1 | táctil |
| paddle | Air Hockey, Ping Pong Reflex | sports-casual | 1; Air Hockey 1–2, Ping Pong Reflex 1–2 | ratón/táctil |
| homerun | Home Run Derby | sports-casual | 1 | teclado/táctil |
| whack | Reflex Grid | sports-casual | 1 | ratón/táctil |

Cifras actuales:
- **Multijugador: 4 de 100** (Neon Trails y Tank Duel 1–4; Air Hockey y Ping Pong Reflex 1–2). El resto es de 1 jugador.
- Entrada: 40 de 100 solo táctil/ratón (puzles, cartas, deportes con gesto). Esos **no funcionan en el modo tele** sin adaptarlos a joystick + A/B.
- Géneros WordPress: arcade 20, puzzle 20, platformer 20, strategy-cards 15, 3d-webgl 15, sports-casual 10.

### 1.2 Huecos claros (lo que no existe)

| Hueco | Estado actual | Qué se añade en este plan |
|---|---|---|
| Party / minijuegos 2–4 | Nada | 40 minijuegos (motores `arena`, `party`) y la «Ruleta de minijuegos» |
| Lucha | Solo Hero Brawl (beat'em up 1 j.) | 20: lucha en plataformas 2–4 y duelos 1v1 |
| Bombas en laberinto | Nada | 12 con reglas distintas (hielo, pintura, giro, bomba única…) |
| Deportes de equipo | Nada (solo penalti, canasta, bolos, billar, dardos 1 j.) | 24: fútbol, hockey, vóley, balón prisionero, rugby, balonmano… |
| Deportes por turnos 1–4 | Golf, bolos, dardos, billar existen solo en 1 j. y táctil | Modos por turnos con mando + tenis, pádel, atletismo, tiro |
| Carreras multijugador | 3 de carretera en 1 j. | 26: cenitales a 4 en pantalla compartida, descensos, motos |
| Cooperativos | Nada | 16 + modos coop (cocina, mazmorra, plataformas, torres) |
| Mesa española | Nada | Parchís, oca, dominó, brisca, tute, mus, chinchón, cinquillo, siete y medio, escoba, guiñote, pocha… |
| Baraja española | Solo baraja francesa (solitarios) | Motor `baraja` con 40/48 cartas dibujadas (oros, copas, espadas, bastos) |
| Mesa abstracta | Damas y reversi | Ajedrez, go 9×9, damas chinas, mancala, hex, molino, cuatro en línea |
| Trivia / palabras en español | Nada | 26 (pulsador 1–4, palabra del día, sopa, abecedario, ahorcado…) |
| Simulación / gestión / idle / construcción | Nada | 24 (panadería incremental, granja, restaurante, ciudad, fábrica…) |
| Ritmo | 1 (Rhythm Tap) | 10 (tambores a 4, palmas flamencas, director de orquesta…) |
| Roguelike por turnos / sigilo / horda | Mazmorras en tiempo real sí; por turnos, sigilo y horda no | Cripta por turnos, mazmorra de cartas, ladrón, horda |
| Arcade de caída/burbujas/pinball/fusión | Solo Tetra | Burbujas, columnas, cápsulas, fusión, pinball, bloques 10×10 |
| Juegos sociales de información oculta | Nada | Farol, impostor, trueque, compartir o robar (mano privada en el móvil) |

### 1.3 Duplicados que hay que evitar

- **No más solitarios de baraja francesa** (ya hay 5 + mahjong) ni variantes de 2048, match-3, color sort, nonograma o tower defense de camino: el catálogo ya los cubre.
- **No más plataformas «otro tema»** con `platformer.js`: solo si añaden una regla nueva (coop, carrera a 4, portales, rebobinar, sombra).
- **No más runners de un botón** (hay 5) ni «apilar de un toque» (Stack Tower 3D).
- **Captura de área** ya existe (Territory); **cruce de carriles** ya existe (Frog Crossing) → «Cruce sin Fin» solo vale por ser infinito y a 4.
- **Sokoban** solo con regla nueva (cajas pegajosas, espejo). **Puentes de tablones** ya existe (Plank Bridge) → «Ingeniero de Puentes» va con vigas y tensión.
- Variantes del mismo motor que solo cambian tema/colores **no cuentan** como juego nuevo (ver §2).

---

## 2. Criterios de calidad y diferenciación

Un juego nuevo solo entra si cumple **todo**:

1. **Mecánica central distinta**: el verbo principal (empujar, pintar, apostar, trazar, cantar, esquivar…) o el objetivo cambian respecto a cualquier otro juego del catálogo. Cambiar tema, colores, sprites o dificultad **no** basta. Prueba rápida: si describes los dos juegos sin mencionar el tema y suenan iguales, es un duplicado.
2. **Gancho en una frase** (columna «Gancho»): lo que se cuenta a un amigo. Si no cabe en una frase, el diseño no está claro.
3. **Nombre original y sin marcas registradas**: nada de Tetris, Pac-Man, Bomberman, UNO, Mario, Worms, Pong, Frogger, Rocket League, Overcooked, Among Us, Fall Guys, Wordle, Scrabble, Rummikub, Conecta 4, Mastermind, Jenga, Pasapalabra, Cifras y Letras, Trivial, Código Secreto, Camel Up, Olimpiada/olímpico, Fórmula 1… Los nombres tradicionales de dominio público sí valen (parchís, oca, mus, brisca, tute, chinchón, dominó, ajedrez, go, mancala, sudoku).
4. **Partidas cortas**: 1–3 min en el 76 % de la lista (encaja con móvil y con pausas para anuncios entre partidas); 3–6 min en juegos de mesa; sesiones largas solo en incrementales/gestión con guardado.
5. **Multijugador de verdad**: si es 2–4, la CPU rellena plazas vacías (se puede jugar con 1 mando) y cada jugador se distingue por `k.pcol(p)` y posición inicial. Ningún multijugador necesita puntero.
6. **Arte y sonido propios**: estilo ART (vector plano con contorno `#1a1530`), `k.sfx` sintetizado, sin recursos de terceros. Preguntas, palabras y melodías: escritas por nosotros o de dominio público (sin copiar el DLE ni concursos de TV).
7. **Sin apuestas con dinero**: siete y medio, mus o dados sin fichas de valor; nada de tragaperras ni ruleta (riesgo con las políticas de AdSense).
8. **Reglas correctas y verificadas** (como las de §«Reglas ya aplicadas»): cada juego de mesa/cartas lleva un simulador de partidas bot contra bot que no se atasca; puzles con **solución garantizada** por generador + verificador.

Leyenda de la lista: **Tipo** C = clásico reconocible con giro propio · V = variante propia de un género conocido · O = concepto original/inventado. **Dur.** c = 1–3 min · m = 3–6 min · l = sesión larga con guardado. **Jug.** «coop» = cooperativo 1–4. **Entrada** «mando» = joystick + A/B (tele, teclado, mando físico y mando virtual del portal); «ambos» = mando y táctil; «táctil» = solo puntero (no entra en el modo tele). **Motor** con `*` = motor NUEVO; sin asterisco = motor actual ampliado (entre paréntesis, la variación). **Esf.** S ≈ 0,5 · M ≈ 1 · L ≈ 2 jornadas de agente (sin contar el motor). **Ola** = oleada calculada por prioridad (50 por oleada).

---

## 3. Lista de 400 juegos nuevos

### A. Party y minijuegos (2–4 jugadores) — 40 juegos (40 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 1 | Sumo de Cojines | Empuja a los rivales fuera de un tatami inflable que encoge cada 10 s | party | 2–4 | mando | arena* | M | 1 | C | c |
| 2 | Pista de Hielo Loca | Nadie frena: el último que quede sobre el hielo que se agrieta gana | party | 2–4 | mando | arena* | S | 1 | O | c |
| 3 | Pintacasillas | 30 s para pintar más suelo de tu color; pisar pintura ajena te hace resbalar | party | 1–4 | mando | arena* | S | 1 | V | c |
| 4 | Rey de la Colina | Aguanta en la zona que se desplaza; A empuja, B da un salto corto | party | 2–4 | mando | arena* | S | 1 | C | c |
| 5 | Patata Explosiva | Pasa la bomba tocando a otro antes de que estalle; la mecha es secreta | party | 2–4 | mando | arena* | S | 1 | C | c |
| 6 | Lluvia de Yunques | Las sombras del suelo avisan dónde cae cada yunque; aguanta más que nadie | party | 1–4 | mando | party* | S | 1 | V | c |
| 7 | Duelo del Oeste | Espera al «¡YA!» y pulsa A; si te adelantas pierdes la ronda | party | 2–4 | mando | party* | S | 1 | C | c |
| 8 | Carrera Machacabotones | A y B alternos al ritmo de las piernas: gana el ritmo, no la fuerza bruta | party | 2–4 | mando | party* | S | 1 | O | c |
| 9 | Tira y Afloja | Pulsa al compás que marca la cuerda; fuera de ritmo resbalas hacia el barro | party | 2–4 | mando | party* | S | 1 | C | c |
| 10 | Globos a Presión | Infla tu globo lo más cerca posible del límite sin reventarlo | party | 1–4 | mando | party* | S | 2 | O | c |
| 11 | Memoria de Semáforo | Repite la secuencia de colores que crece; quien falla queda fuera | party | 1–4 | mando | party* | S | 2 | C | c |
| 12 | Coge la Corona | Quien lleva la corona suma puntos; los demás se la roban con un placaje | party | 2–4 | mando | arena* | S | 1 | V | c |
| 13 | Cazamoscas | Atrapa más moscas con tu red; la mosca dorada vale cinco | party | 1–4 | mando | arena* | S | 2 | V | c |
| 14 | Salta la Comba | La cuerda gira cada vez más rápido; salta con A o quedas eliminado | party | 1–4 | mando | party* | S | 2 | C | c |
| 15 | Escondite de Cajas | Uno busca y los demás se camuflan quietos entre cajas idénticas movidas por la CPU | party | 2–4 | mando | arena* | M | 2 | O | c |
| 16 | Pesca Rápida | Todos en el mismo estanque; el pez gordo solo sale si tiran dos a la vez | party | 1–4 | mando | party* | S | 2 | O | c |
| 17 | Estatuas Musicales | Muévete mientras suena la música; al pararse, quien se mueve cae | party | 2–4 | mando | party* | S | 2 | C | c |
| 18 | Cuenta Ovejas | Cuenta las ovejas que cruzan y marca el número; gana el más exacto | party | 1–4 | mando | party* | S | 2 | O | c |
| 19 | Carrera de Sacos | Saltos cargados con A: el salto largo arriesga caerte de bruces | party | 2–4 | mando | party* | S | 2 | C | c |
| 20 | Plataforma Menguante | Hexágonos que se hunden al pisarlos; el último en pie gana | party | 2–4 | mando | arena* | S | 2 | V | c |
| 21 | Bolos Humanos | Rueda hecho bola y derriba bolos (y a tus rivales) por puntos | party | 2–4 | mando | arena* | S | 3 | O | c |
| 22 | Choque de Carritos | Coches de choque: golpea por detrás para pinchar los globos del rival | party | 2–4 | mando | arena* | S | 1 | C | c |
| 23 | Toro Mecánico | Aguanta encima inclinándote al lado contrario de cada sacudida | party | 1–4 | mando | party* | S | 3 | V | c |
| 24 | Tartas al Blanco | Lanza tartas a las dianas; si aciertas a un rival lo dejas ciego 2 s | party | 1–4 | mando | party* | S | 2 | V | c |
| 25 | Huevo en la Cuchara | Corre deprisa pero sin que el huevo se incline demasiado | party | 2–4 | mando | party* | S | 3 | C | c |
| 26 | El Suelo es Lava | Salta entre muebles antes de que suba la lava y empuja a los demás | party | 2–4 | mando | arena* | M | 3 | V | c |
| 27 | Quita la Silla | Da vueltas y siéntate cuando pare la música; siempre falta una silla | party | 2–4 | mando | arena* | S | 1 | C | c |
| 28 | Mina de Gemas | Recoge gemas en una cueva oscura; tu farol ilumina también a los rivales | party | 1–4 | mando | arena* | M | 3 | O | c |
| 29 | Imanes Opuestos | Cada jugador es un imán: A cambia de polo para atraer o repeler | party | 2–4 | mando | arena* | M | 2 | O | c |
| 30 | Ruleta de Minijuegos | 10 rondas al azar entre todos los minijuegos party con marcador y podio | party | 2–4 | mando | party* | M | 1 | O | m |
| 31 | Descenso Loco a Cuatro | Bajada en tabla a cuatro, empujones incluidos, por una pista que se estrecha | party | 2–4 | mando | descenso* | M | 3 | V | c |
| 32 | Foto de Grupo | Colócate en tu silueta pintada antes de que salte el flash | party | 1–4 | mando | party* | S | 3 | O | c |
| 33 | Relevo de Cubos | Llenad el barril pasándoos cubos sin derramarlos | party | coop | mando | party* | S | 3 | O | c |
| 34 | Globo de Todos | Todos soplan el mismo globo aerostático: coordinaos para esquivar pájaros | party | coop | mando | party* | S | 3 | O | c |
| 35 | Patitos del Canal | Pesca patitos numerados: la suma exacta a 21 gana | party | 1–4 | mando | party* | S | 5 | O | c |
| 36 | Disco a Cuatro Bandas | Cuatro porterías, cuatro palas y un disco: gana la última portería en pie | party | 2–4 | mando | paddle (4 lados) | M | 2 | V | c |
| 37 | Flechas de Baile | Pulsa la dirección que cae a tiempo; duelo de hasta 4 en la misma pista | party | 1–4 | mando | rhythm (MP) | M | 2 | V | c |
| 38 | Pelea de Almohadas | Golpe con A y bloqueo con B sobre una cama elástica; tres plumas y fuera | party | 2–4 | mando | arena* | M | 2 | V | c |
| 39 | Apuesta de Atasco | Elige qué coche llegará primero y luego sopla con A para empujarlo | party | 1–4 | mando | party* | S | 5 | O | c |
| 40 | Tren de la Bruja | Agáchate (B) o salta (A) cuando pasa el palo de la bruja | party | 1–4 | mando | party* | S | 3 | V | c |

### B. Lucha y peleas — 20 juegos (20 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 41 | Almohadazo Arena | Lucha en plataformas: cuanto más daño llevas, más lejos sales volando | lucha | 1–4 | mando | brawl* | L | 1 | C | c |
| 42 | Puños de Papel | Origami 1v1: piedra, papel o tijera en tiempo real con golpe alto, bajo y agarre | lucha | 1–2 | mando | duelo* | L | 2 | O | c |
| 43 | Dojo Nocturno | Kárate de un solo golpe: el primero que acierta gana el punto | lucha | 1–2 | mando | duelo* | M | 2 | C | c |
| 44 | Gladiadores de Juguete | Caen armas del cielo y cada una cambia lo que hacen tus botones | lucha | 1–4 | mando | brawl* | M | 2 | V | c |
| 45 | Robots de Chatarra | Pierdes piezas al recibir golpes y ganas velocidad al ir más ligero | lucha | 1–4 | mando | brawl* | M | 2 | O | c |
| 46 | Tejados Ninja | Duelos de ninjas sobre tejados que se derrumban bajo sus pies | lucha | 1–4 | mando | brawl* | M | 3 | V | c |
| 47 | Almohadas en Órbita | Gravedad cero: cada golpe que das te empuja también a ti | lucha | 2–4 | mando | brawl* | M | 3 | O | c |
| 48 | Esgrima de Bolsillo | Asalto de florete: avanza, retrocede y tira estocada alta o baja | lucha | 1–2 | mando | duelo* | M | 2 | C | c |
| 49 | Guantes Gigantes | Boxeo 1v1: esquiva con el joystick, golpea con A/B y cuida la resistencia | lucha | 1–2 | mando | duelo* | M | 2 | C | c |
| 50 | Pulso de Titanes | Echa un pulso pulsando al ritmo del corazón del rival | lucha | 1–2 | mando | party* | S | 3 | O | c |
| 51 | Lucha Canaria | Agarres y desequilibrio dentro del terrero: gana quien tumbe al otro | lucha | 1–2 | mando | duelo* | M | 5 | C | c |
| 52 | Justa de Caballeros | Carga con la lanza y elige alto o bajo en el último segundo | lucha | 1–2 | mando | duelo* | M | 3 | C | c |
| 53 | Gallos de Hojalata | Gallos robot: salto, picotazo y espolón con barra de energía | lucha | 1–2 | mando | duelo* | M | 6 | V | c |
| 54 | Taberna Revuelta | Pelea cómica de taberna con sillas, jarras y mesas como armas | lucha | 1–4 | mando | brawl* | M | 5 | V | c |
| 55 | Sumo de Equilibrio | Empujones 1v1 con barra de equilibrio: si te inclinas demasiado, caes | lucha | 1–2 | mando | duelo* | S | 2 | C | c |
| 56 | Cuerdas del Ring | Lucha libre: rebota en las cuerdas para cargar tu llave final | lucha | 1–4 | mando | brawl* | M | 5 | V | c |
| 57 | Torneo de Escobas | Brujas en escobas voladoras con hechizos de tres colores que se anulan | lucha | 1–4 | mando | brawl* | M | 6 | O | c |
| 58 | Maestro del Bastón | Artes marciales 1v1 de alcance largo basadas en contraataques | lucha | 1–2 | mando | duelo* | M | 6 | V | c |
| 59 | Pelea de Pingüinos | Deslízate sobre la barriga y empuja a los demás al agua helada | lucha | 2–4 | mando | arena* | S | 2 | O | c |
| 60 | Castillo Hinchable | Rebota en paredes blandas para golpear desde arriba | lucha | 1–4 | mando | brawl* | M | 7 | O | c |

### C. Bombas en laberinto — 12 juegos (11 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 61 | Petardo Plaza | Pon petardos, rompe muros y atrapa a los rivales en la explosión en cruz | acción | 1–4 | mando | bomber* | M | 1 | C | c |
| 62 | Petardo Glaciar | Las bombas se deslizan sobre el hielo hasta chocar con algo | acción | 1–4 | mando | bomber* | S | 2 | V | c |
| 63 | Petardo Minas | Modo aventura para 1 jugador: 30 niveles con enemigos, llaves y jefes | acción | 1 | mando | bomber* | M | 4 | V | m |
| 64 | Bombas de Pintura | Las explosiones pintan: gana quien cubra más suelo, no quien sobreviva | acción | 2–4 | mando | bomber* | S | 2 | O | c |
| 65 | Rebote Explosivo | Las bombas ruedan en diagonal y rebotan como bolas de billar | acción | 1–4 | mando | bomber* | M | 5 | O | c |
| 66 | Carrera de Mechas | Enciende mechas que recorren el suelo y cierra caminos a los rivales | acción | 2–4 | mando | bomber* | M | 6 | O | c |
| 67 | Petardo por Parejas | 2 contra 2 sin fuego amigo y con una base que defender | acción | 2–4 | mando | bomber* | M | 3 | V | c |
| 68 | Cohetes de Feria | Tus bombas son cohetes que avanzan en línea recta hasta chocar | acción | 1–4 | mando | bomber* | S | 5 | V | c |
| 69 | Bombas Fantasma | Al caer vuelves como fantasma y aún puedes soltar una última bomba | acción | 2–4 | mando | bomber* | S | 3 | V | c |
| 70 | Laberinto que Gira | Cada 20 s el tablero gira 90° y todas las bombas se deslizan | acción | 1–4 | mando | bomber* | M | 6 | O | c |
| 71 | Petardo Cooperativo | Dos o más jugadores contra oleadas de monstruos en el laberinto | acción | coop | mando | bomber* | M | 5 | V | m |
| 72 | Bomba Única | Solo hay una bomba en el mapa: cógela, pásala o lánzala | acción | 2–4 | mando | bomber* | S | 3 | O | c |

### D. Deportes de equipo — 24 juegos (24 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 73 | Fútbol de Plaza | Fútbol 2v2 cenital: pase con A, tiro cargado con B, compañero CPU si faltáis | deportes | 1–4 | mando | teamball* | L | 1 | C | c |
| 74 | Hockey de Barrio | Hockey sobre patines 2v2 con disco rápido y rebotes en las vallas | deportes | 1–4 | mando | teamball* | M | 1 | C | c |
| 75 | Coches con Balón | Fútbol con coches que saltan y empujan un balón gigante | deportes | 1–4 | mando | teamball* | L | 1 | C | c |
| 76 | Canasta de Patio | Baloncesto 2v2 a una canasta: a 21, tiros de 2 y de 3 | deportes | 1–4 | mando | teamball* | M | 2 | C | c |
| 77 | Balonmano Relámpago | Partidos de 2 minutos donde el área prohibida marca la táctica | deportes | 1–4 | mando | teamball* | M | 3 | C | c |
| 78 | Waterpolo Burbuja | Nadas con inercia y el balón flota y se escurre | deportes | 1–4 | mando | teamball* | M | 5 | V | c |
| 79 | Rugby Placaje | Pases solo hacia atrás, placaje con B y ensayo al cruzar la línea | deportes | 1–4 | mando | teamball* | M | 4 | C | c |
| 80 | Vóley Playa | 2v2 lateral: recibe, coloca y remata con tres toques como máximo | deportes | 1–4 | mando | teamball* (lateral) | M | 1 | C | c |
| 81 | Balón Prisionero | Esquiva, atrapa con B y elimina al equipo contrario | deportes | 1–4 | mando | teamball* | M | 1 | C | c |
| 82 | Fútbol Sala Neón | 5 minutos, paredes que rebotan y porterías pequeñas | deportes | 1–4 | mando | teamball* | S | 2 | V | c |
| 83 | Curling Deslizante | Lanza piedras y barre con A para alargarlas; dos equipos por turnos | deportes | 1–4 | mando | tiro* (curling) | M | 4 | C | m |
| 84 | Petanca de Verano | Acerca tus bolas al boliche por turnos sobre tierra con desniveles | deportes | 1–4 | mando | tiro* (petanca) | S | 2 | C | m |
| 85 | Béisbol de Parque | Partido completo: bateas y lanzas por turnos y corres entre bases | deportes | 1–2 | mando | homerun (partido) | L | 6 | C | m |
| 86 | Críquet Rápido | Seis bolas por entrada: golpe defensivo o arriesgado | deportes | 1–2 | mando | homerun (críquet) | M | 8 | C | c |
| 87 | Hockey Hierba Mini | Bola pequeña y stick que solo golpea por el lado plano | deportes | 1–4 | mando | teamball* | S | 7 | C | c |
| 88 | Disco Volador | Pasa el disco sin moverte con él y marca en la zona final | deportes | 1–4 | mando | teamball* | M | 6 | C | c |
| 89 | Fútbol Cabezón | 1v1 lateral de cabezones con saltos, chilenas y superdisparo | deportes | 1–2 | mando | teamball* (lateral) | M | 1 | C | c |
| 90 | Frontón Vasco | Golpea contra el frontón; el rival la devuelve antes del segundo bote | deportes | 1–2 | mando | paddle (frontón) | M | 2 | C | c |
| 91 | Polo en Bici | Polo con mazos sobre bicis: inercia y giros cerrados | deportes | 1–4 | mando | teamball* | M | 7 | O | c |
| 92 | Futbolín de Bar | Futbolín de varillas: cada jugador lleva dos barras y el efecto con B | deportes | 1–4 | mando | teamball* (futbolín) | M | 2 | C | c |
| 93 | Fútbol de Imanes | El balón se pega al jugador de su color; cambia de polo para soltarlo | deportes | 1–4 | mando | teamball* | S | 7 | O | c |
| 94 | Voleipié Acrobático | Voleibol con los pies y chilenas en el aire | deportes | 1–2 | mando | teamball* (lateral) | M | 7 | C | c |
| 95 | Bádminton Doble | Volante que frena en el aire: dejadas, globos y remates | deportes | 1–4 | mando | teamball* (lateral) | M | 4 | C | c |
| 96 | Aros Aéreos | Equipos con mochila cohete meten la bola por aros flotantes | deportes | 1–4 | mando | teamball* | M | 6 | O | c |

### E. Deportes individuales y por turnos — 30 juegos (28 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 97 | Tenis Rápido | Tenis cenital a sets de 4 juegos; el efecto depende del momento del golpe | deportes | 1–4 | mando | tenis* | M | 2 | C | c |
| 98 | Pádel de Cristal | Pádel 2v2: la bola rebota en las paredes de cristal y en la malla | deportes | 1–4 | mando | tenis* | M | 2 | C | c |
| 99 | Ping Pong Dobles | Mesa de dobles: alternar el golpe con el compañero es obligatorio | deportes | 1–4 | mando | paddle (dobles) | M | 4 | V | c |
| 100 | Minigolf Party | Hasta 4 por turnos en 18 hoyos locos con molinos, rampas y cintas | deportes | 1–4 | mando | golf (turnos) | M | 1 | V | m |
| 101 | Bolera del Barrio | Bolos por turnos: apunta con el joystick y fija la potencia con A | deportes | 1–4 | mando | bowling (turnos) | S | 1 | V | m |
| 102 | Dardos Cricket | Modalidad cricket: cierra del 15 al 20 y la diana antes que el rival | deportes | 1–4 | mando | darts (cricket) | S | 2 | C | m |
| 103 | Bola Ocho Duo | Billar de bola 8 1v1 por turnos con mando: apunta, carga y tira | deportes | 1–2 | mando | pool (bola 8) | M | 2 | C | m |
| 104 | Tres Bandas | Carambola sin troneras: toca las dos bolas tras tres bandas | deportes | 1–2 | mando | pool (carambola) | M | 6 | C | m |
| 105 | Juegos de Pista | 100 m, vallas, longitud y jabalina: técnica de pulsación, no solo velocidad | deportes | 1–4 | mando | pista* | M | 2 | C | m |
| 106 | Decatlón de Bolsillo | 10 pruebas seguidas con tabla de puntos simplificada | deportes | 1–4 | mando | pista* | M | 5 | V | l |
| 107 | Natación Crol | Alterna A y B al ritmo de la brazada y respira con el joystick | deportes | 1–4 | mando | pista* | S | 4 | V | c |
| 108 | Lanzamiento de Martillo | Gira con el joystick y suelta en el ángulo exacto | deportes | 1–4 | mando | pista* | S | 5 | C | c |
| 109 | Salto con Pértiga | Carrera, clava la pértiga y empuja en el punto más alto | deportes | 1–4 | mando | pista* | S | 5 | C | c |
| 110 | Arco y Viento | Compensa viento y respiración en tres distancias | deportes | 1–4 | ambos | tiro* | S | 2 | C | c |
| 111 | Tiro al Plato | Platos desde dos casetas y dos cartuchos por pareja | deportes | 1–4 | mando | tiro* | S | 4 | C | c |
| 112 | Slalom de Banderas | Pasa entre banderas: rozar una suma un segundo | carreras | 1–4 | mando | descenso* | M | 2 | C | c |
| 113 | Trampolín de Esquí | Rampa, despegue a tiempo y equilibrio en el aire | deportes | 1–4 | mando | pista* | S | 6 | C | c |
| 114 | Canastas a Duelo | Dos canastas lado a lado: gana quien más encesta en 60 s | deportes | 1–2 | mando | hoop (duelo) | S | 2 | V | c |
| 115 | Penaltis Cara a Cara | Tanda 1v1: uno tira y el otro para, y se cambian | deportes | 1–2 | mando | penalty (versus) | S | 1 | V | c |
| 116 | Golf de Campo | 9 hoyos con palos, viento y greens con caída | deportes | 1–4 | ambos | golf (campo) | L | 4 | C | m |
| 117 | Boxeo de Sombra | Sigue la combinación de golpes que canta el entrenador | deportes | 1 | ambos | rhythm (boxeo) | S | 8 | V | c |
| 118 | Pesca de Altura | Lucha con el pez controlando la tensión del sedal | deportes | 1–4 | mando | pista* (pesca) | M | 4 | V | c |
| 119 | Surf de Olas | Aguanta en la cresta, haz trucos y no caigas en la espuma | deportes | 1 | ambos | descenso* (ola) | M | 7 | V | c |
| 120 | Remo en Pareja | Dos remeros por barca alternando A y B al unísono | deportes | coop | mando | pista* | S | 6 | V | c |
| 121 | Halterofilia | Arrancada: sube la barra y sostén el equilibrio arriba | deportes | 1–4 | mando | pista* | S | 7 | C | c |
| 122 | Mesa Giratoria | Tenis de mesa sobre una mesa que rota y cambia los ángulos | deportes | 1–2 | mando | paddle (rotación) | M | 8 | O | c |
| 123 | Uno contra el Portero | Hockey hielo 1v1: delantero contra portero, se alternan | deportes | 1–2 | mando | teamball* | S | 7 | V | c |
| 124 | Minigolf Orbital | Hoyos en asteroides con gravedad propia | deportes | 1–4 | ambos | golf + planet | M | 5 | O | m |
| 125 | Bolos sobre Hielo | Sin carril: curva la bola con el joystick durante el recorrido | deportes | 1–4 | mando | bowling (curva) | S | 7 | V | c |
| 126 | Caballitos de Feria | Mete bolas en los agujeros para que avance tu caballo | deportes | 1–4 | mando | party* | S | 2 | C | c |

### F. Carreras — 26 juegos (22 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 127 | Rally de Mesa | Cochecitos sobre la mesa de la cocina; caerte por el borde te retrasa | carreras | 1–4 | mando | racer2d* | L | 1 | C | c |
| 128 | Circuito Garaje | Cuatro coches en pantalla compartida: quien se sale de cámara pierde un punto | carreras | 2–4 | mando | racer2d* | M | 1 | C | c |
| 129 | Karts de Patio | Karts cenitales con objetos propios: pompa, muelle y charco | carreras | 1–4 | mando | racer2d* | M | 1 | C | c |
| 130 | Lanchas de Regata | Lanchas con olas que te desvían y boyas de paso | carreras | 1–4 | mando | racer2d* | M | 4 | V | c |
| 131 | Carrera de Babosas | Tu rastro frena a los demás; el de ellos, a ti | carreras | 1–4 | mando | racer2d* | S | 5 | O | c |
| 132 | Derrape Nocturno | Solo ves lo que alumbran tus faros | carreras | 1–4 | mando | racer2d* | S | 5 | V | c |
| 133 | Motocross de Colinas | Moto lateral: inclínate en el aire para aterrizar bien | carreras | 1–2 | mando | moto* | M | 2 | C | c |
| 134 | Trial de Precisión | Moto de trial lenta y precisa en 30 niveles de obstáculos | carreras | 1 | ambos | moto* | M | 4 | C | m |
| 135 | Monociclo Loco | Equilibrio sobre una rueda: avanza sin caer | carreras | 1 | ambos | moto* | S | 7 | O | c |
| 136 | Carritos Cuesta Abajo | Carrera cuesta abajo en carritos de supermercado que derrapan | carreras | 1–4 | mando | descenso* | S | 4 | O | c |
| 137 | Trineo Nevado | Descenso en trineo a cuatro con saltos y árboles | carreras | 1–4 | mando | descenso* | S | 2 | V | c |
| 138 | Tobogán Acuático | Sube por las paredes del tubo para ganar velocidad | carreras | 1–4 | mando | descenso* (tubo) | M | 5 | O | c |
| 139 | Rally de Tierra | Etapas con copiloto que canta las curvas antes de verlas | carreras | 1 | ambos | road (rally) | M | 7 | V | c |
| 140 | Autopista Nocturna | Adelanta entre tráfico con lluvia y luces | carreras | 1 | ambos | road (tráfico) | S | 8 | V | c |
| 141 | Monoplaza Pixel | Monoplazas en pantalla partida para dos | carreras | 1–2 | mando | road (pantalla partida) | L | 5 | C | c |
| 142 | Cuadrigas del Circo | Circo romano: ruedas con cuchillas y latigazo con B | carreras | 1–4 | mando | racer2d* | M | 6 | V | c |
| 143 | Globos de Carreras | Cada altura tiene su viento: sube o baja para elegir corriente | carreras | 1–4 | mando | racer2d* (viento) | M | 7 | O | c |
| 144 | Fila de Hormigas | Guía una fila de hormigas; si se corta, pierdes las de detrás | carreras | 1–4 | mando | racer2d* | M | 8 | O | c |
| 145 | Arrancada de 400 m | Cambia de marcha al milímetro en una recta de 400 m | carreras | 1–2 | mando | pista* | S | 4 | C | c |
| 146 | Longboard Colina | Baja colinas en longboard derrapando en las curvas | carreras | 1–4 | mando | descenso* | S | 7 | V | c |
| 147 | BMX de Tierra | Trucos en rampas de tierra por puntos en 60 s | carreras | 1–2 | mando | moto* | M | 6 | V | c |
| 148 | Patos de Goma | Carrera por un río con remolinos; empuja la corriente con A | carreras | 2–4 | mando | racer2d* | S | 5 | O | c |
| 149 | Avionetas de Papel | Carrera aérea cenital pasando por aros | carreras | 1–4 | mando | racer2d* (vuelo) | M | 7 | V | c |
| 150 | Puerto de Montaña | Ciclismo: gestiona energía, rebufo y ataque en la subida | carreras | 1–4 | mando | pista* | M | 8 | O | m |
| 151 | Bolas de Hámster | Cuatro bolas de hámster en laberintos inclinados | carreras | 1–4 | mando | marble (MP) | M | 4 | O | c |
| 152 | Camiones Monstruo | Aplasta coches en los saltos y llega el primero | carreras | 1–2 | mando | moto* | M | 8 | V | c |

### G. Tanques, barcos y aviones — 18 juegos (17 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 153 | Cañones de Colina | Artillería por turnos sobre terreno destructible con viento | estrategia | 1–4 | mando | artillery* | L | 2 | C | m |
| 154 | Bichos Artilleros | Equipos de 3 bichos con bazuca, granada y cuerda | estrategia | 1–4 | mando | artillery* | M | 2 | C | m |
| 155 | Barcos Piratas | Vira contra el viento y dispara andanadas por los costados | acción | 1–4 | mando | naval* | M | 1 | V | c |
| 156 | Duelo de Biplanos | Combate lateral a cuatro: rizos, pérdida y ametralladora | acción | 1–4 | mando | dogfight* | M | 2 | C | c |
| 157 | Tanques Rebote | Balas que rebotan en las paredes y una vida por ronda | acción | 1–4 | mando | topdown (rebote) | S | 1 | C | c |
| 158 | Flota Hundida Duo | Hundir la flota 1v1 con tu tablero privado en el móvil | estrategia | 1–2 | mando | battle (MP) | M | 4 | C | m |
| 159 | Catapultas del Reino | Asedio: levanta tu muralla y derriba el castillo rival | estrategia | 1–2 | mando | artillery* | M | 4 | V | m |
| 160 | Submarinos Sonar | Solo ves a los rivales cuando lanzan el sonar | acción | 2–4 | mando | naval* | M | 5 | O | c |
| 161 | Dirigibles | Combate lento entre zepelines gestionando gas y lastre | acción | 1–4 | mando | dogfight* | M | 7 | O | c |
| 162 | Torretas Espejo | Dos bases simétricas; cada disparo rebota en espejos que giras | acción | 1–2 | mando | topdown (rebote) | S | 6 | O | c |
| 163 | Invasores a Dúo | Dos naves comparten escudo contra la invasión | acción | coop | mando | shooter (coop) | M | 2 | V | c |
| 164 | Arena de Asteroides | Naves con inercia a cuatro alrededor de un agujero negro | acción | 1–4 | mando | rocks (MP) | M | 2 | V | c |
| 165 | Helicóptero de Rescate | Recoge náufragos esquivando antiaéreos; piloto y gruista | acción | coop | mando | dogfight* | M | 6 | V | c |
| 166 | Guerra de Bolas de Nieve | Parábola y fuertes de nieve que se derriten | acción | 1–4 | mando | artillery* | S | 2 | V | c |
| 167 | Armada de Bañera | Barquitos de papel en la bañera entre burbujas y patos | acción | 1–4 | mando | naval* | S | 7 | O | c |
| 168 | Tanques Pintores | Tu tanque pinta el suelo y tu pintura te acelera | acción | 2–4 | mando | topdown (tank) | S | 5 | O | c |
| 169 | Defensa Costera | Cañones de costa contra un desembarco con munición limitada | estrategia | 1 | ambos | artillery* | M | 8 | V | m |
| 170 | Cazas en Formación | Shooter vertical para dos: las naves se fusionan en una más fuerte | acción | coop | mando | shooter (coop) | M | 5 | O | c |

### H. Juegos de mesa españoles y clásicos — 40 juegos (38 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 171 | Parchís de la Plaza | Parchís completo: comer, barreras y casa, a 2–4 o contra la CPU | mesa | 1–4 | ambos | tablero* | L | 1 | C | l |
| 172 | Parchís Exprés | Dos fichas por jugador y dado doble: partidas de 5 minutos | mesa | 1–4 | ambos | tablero* | S | 1 | V | m |
| 173 | La Oca Viajera | De oca a oca en 63 casillas con posada, pozo, laberinto y muerte | mesa | 1–4 | ambos | tablero* | M | 1 | C | m |
| 174 | Serpientes y Escaleras | Tablero clásico con escaleras y serpientes animadas | mesa | 1–4 | ambos | tablero* | S | 2 | C | c |
| 175 | Dunas y Jorobas | Apuesta qué camello ganará; los camellos se apilan y se llevan unos a otros | mesa | 2–4 | mando | tablero* | M | 5 | O | m |
| 176 | Brisca de Bar | Brisca a 2 o por parejas con baraja española dibujada y señas | cartas | 1–4 | ambos | baraja* | L | 1 | C | m |
| 177 | Tute Cabrón | Tute individual a 3 o 4: cantes de 20 y 40 y las diez de últimas | cartas | 1–4 | ambos | baraja* | M | 2 | C | m |
| 178 | Mus de Peña | Mus por parejas: grande, chica, pares y juego, envites, órdago y señas | cartas | 1–4 | ambos | baraja* | L | 1 | C | l |
| 179 | Chinchón Casero | Escaleras y tríos: cierra con menos de 5 o haz chinchón | cartas | 1–4 | ambos | baraja* | M | 1 | C | m |
| 180 | Cinquillo | Juega a partir de los cincos; quien no puede, pasa | cartas | 1–4 | ambos | baraja* | S | 2 | C | c |
| 181 | Siete y Medio | Pide cartas sin pasarte de 7,5; las figuras valen medio (sin apuestas) | cartas | 1–4 | ambos | baraja* | S | 3 | C | c |
| 182 | La Escoba | Suma 15 con las cartas de la mesa; escobas, oros y velo | cartas | 1–4 | ambos | baraja* | M | 3 | C | m |
| 183 | Guiñote | Juego aragonés por parejas con arrastre y cantes | cartas | 1–4 | ambos | baraja* | M | 5 | C | m |
| 184 | El Burro | Junta cuatro iguales y pulsa; el último en darse cuenta es el burro | cartas | 2–4 | mando | baraja* | S | 3 | C | c |
| 185 | Solitario Español | Solitario de 40 cartas con la baraja española | cartas | 1 | táctil | baraja* | S | 4 | V | c |
| 186 | Tute Subastado | Subasta los puntos que harás antes de jugar la mano | cartas | 1–4 | ambos | baraja* | M | 7 | C | m |
| 187 | La Pocha | Predice cuántas bazas harás cada ronda | cartas | 1–4 | ambos | baraja* | M | 4 | C | m |
| 188 | Dominó por Parejas | Dominó a cuatro por parejas con paso y cierre | mesa | 1–4 | ambos | domino* | M | 3 | C | m |
| 189 | Tren de Dominó | Cada uno construye su tren; el tren abierto es de todos | mesa | 1–4 | ambos | domino* | M | 5 | C | m |
| 190 | Dominó Rejilla | Puzzle: encaja todas las fichas en la rejilla de números | puzzle | 1 | táctil | domino* | S | 7 | V | c |
| 191 | Cuatro en Línea | Deja caer fichas y conecta cuatro; IA de 3 niveles | mesa | 1–2 | ambos | board (ampliado) | S | 1 | C | c |
| 192 | Tres en Raya Anidado | Tres en raya en 9 tableros: tu casilla decide dónde juega el rival | mesa | 1–2 | ambos | board (ampliado) | S | 4 | C | c |
| 193 | El Molino | Nueve fichas: forma molinos y retira fichas rivales | mesa | 1–2 | ambos | board (ampliado) | M | 5 | C | m |
| 194 | Damas Chinas | Estrella de 6 puntas con saltos en cadena para 2–4 | mesa | 1–4 | ambos | mesa* | M | 3 | C | m |
| 195 | Ajedrez de Salón | Ajedrez completo con enroque, al paso y IA de 3 niveles | mesa | 1–2 | ambos | mesa* | L | 3 | C | l |
| 196 | Ajedrez 5×5 | Ajedrez en tablero pequeño: partidas de 3 minutos | mesa | 1–2 | ambos | mesa* | S | 6 | V | c |
| 197 | Go de Nueve | Go en 9×9 con recuento automático | mesa | 1–2 | ambos | mesa* | L | 7 | C | m |
| 198 | Mancala de Semillas | Siembra semillas en 12 hoyos y captura en tu depósito | mesa | 1–2 | ambos | mesa* | M | 4 | C | c |
| 199 | Rombo Hexagonal | Une tus dos lados del rombo de hexágonos; nunca hay empate | mesa | 1–2 | ambos | mesa* | S | 6 | C | c |
| 200 | Cinco en Línea | Cinco en línea en tablero grande con IA de amenazas | mesa | 1–2 | ambos | board (ampliado) | S | 5 | C | c |
| 201 | Combinación Oculta | Adivina la combinación de 4 colores con pistas de aciertos | puzzle | 1–2 | ambos | mesa* | S | 3 | C | c |
| 202 | Torre de Bloques | Saca bloques de la torre por turnos sin que se caiga | mesa | 1–4 | mando | fisica* | M | 4 | C | c |
| 203 | Dados Mentirosos | Farol con cubiletes: di cuántos dados hay de un valor; tus dados se ven en tu móvil | mesa | 2–4 | mando | dice (farol) | M | 3 | C | m |
| 204 | Barco, Capitán y Tripulación | Saca 6, 5 y 4 en orden y suma el resto como carga | mesa | 1–4 | ambos | dice (barco) | S | 5 | C | c |
| 205 | Caparazones a la Meta | Cartas secretas mueven tortugas de colores; la tuya es un secreto | mesa | 2–4 | mando | tablero* | S | 6 | C | c |
| 206 | Cerillas | Quita de 1 a 3 cerillas; quien coge la última pierde | mesa | 1–2 | ambos | mesa* | S | 8 | C | c |
| 207 | Guerra de Cartas | Gana la carta más alta; si empatan, palmada rápida para llevarse el montón | cartas | 1–4 | mando | baraja* | S | 6 | C | c |
| 208 | Corazones | Evita los corazones y la reina de picas, o llévatelos todos | cartas | 1–4 | ambos | cards (bazas) | M | 5 | C | m |
| 209 | Bazas de Picas | Por parejas: apuesta bazas, las picas siempre triunfan | cartas | 1–4 | ambos | cards (bazas) | M | 7 | C | m |
| 210 | Fichas y Series | Series y escaleras con fichas numeradas que reordenas en la mesa | mesa | 1–4 | ambos | domino* (fichas) | L | 6 | C | m |

### I. Trivia y palabras en español — 26 juegos (20 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 211 | Trivia de Sobremesa | Preguntas propias en español de 6 categorías con pulsador para 4 | trivia | 1–4 | mando | trivia* | L | 1 | C | c |
| 212 | Verdad o Bulo | ¿Verdadero o falso? Acertar rápido suma más | trivia | 1–4 | mando | trivia* | S | 1 | O | c |
| 213 | Más o Menos | ¿Qué es más alto, más poblado o más antiguo? Encadena aciertos | trivia | 1–4 | mando | trivia* | S | 3 | V | c |
| 214 | Mapa Mudo de España | Señala provincias, ríos y capitales en el mapa dibujado con el joystick | trivia | 1–4 | mando | trivia* (mapa) | M | 3 | V | c |
| 215 | Banderas del Mundo | Banderas dibujadas por código: elige el país entre cuatro | trivia | 1–4 | mando | trivia* | S | 3 | C | c |
| 216 | Línea del Tiempo | Coloca inventos y sucesos en su lugar de la línea temporal | trivia | 1–4 | mando | trivia* | M | 4 | C | c |
| 217 | Cálculo Veloz | Operaciones mentales contra el reloj, hasta cuatro a la vez | trivia | 1–4 | mando | trivia* (números) | S | 3 | V | c |
| 218 | Cifra Objetivo | Llega al número pedido con 6 cifras y las 4 operaciones | puzzle | 1–2 | ambos | palabras* (números) | M | 5 | V | c |
| 219 | Palabra del Día | Adivina la palabra de 5 letras en 6 intentos; una nueva cada día | palabras | 1 | ambos | palabras* | M | 1 | C | c |
| 220 | Abecedario Veloz | Una definición por letra de la A a la Z en 150 segundos | palabras | 1–4 | mando | palabras* | M | 3 | C | m |
| 221 | Ahorcado Ilustrado | Adivina la palabra antes de que se complete el dibujo | palabras | 1–4 | mando | palabras* | S | 1 | C | c |
| 222 | Sopa de Letras | Encuentra las palabras del tema en la rejilla | palabras | 1 | táctil | palabras* | S | 1 | C | c |
| 223 | Crucigrama Mini | Crucigrama 5×5 diario generado con diccionario propio | palabras | 1 | ambos | palabras* | L | 5 | C | c |
| 224 | Anagramas | Forma todas las palabras posibles con 7 letras | palabras | 1–4 | ambos | palabras* | S | 3 | C | c |
| 225 | Palabras Encadenadas | Cada palabra empieza por la última sílaba de la anterior | palabras | 2–4 | mando | palabras* | M | 6 | C | c |
| 226 | ¡Basta! | Letra al azar: nombre, animal, ciudad y cosa, validados por diccionario | palabras | 1–4 | mando | palabras* | M | 4 | C | m |
| 227 | Refranes Rotos | Completa refranes y dichos populares antes que nadie | trivia | 1–4 | mando | trivia* | S | 4 | O | c |
| 228 | ¿Quién Soy? | Las pistas se revelan de más difícil a más fácil; acierta antes | trivia | 1–4 | mando | trivia* | S | 4 | C | c |
| 229 | Jeroglíficos | Adivina la palabra formada por dibujos | palabras | 1–4 | mando | trivia* | M | 7 | C | c |
| 230 | Letras que Caen | Las letras caen en columnas; forma palabras para limpiarlas | palabras | 1 | ambos | palabras* (caída) | M | 4 | O | c |
| 231 | Torre de Palabras | Apila palabras que compartan una letra con la de abajo | palabras | 1 | ambos | palabras* | M | 8 | O | c |
| 232 | Mecanógrafo Espacial | Teclea las palabras de los meteoritos para destruirlos | palabras | 1 | ambos | palabras* (tecleo) | M | 5 | C | c |
| 233 | B o V | ¿Con b o con v, con h o sin h? 60 segundos de ortografía | trivia | 1–4 | mando | trivia* | S | 4 | V | c |
| 234 | Capitales Relámpago | La capital en 5 segundos; la racha multiplica | trivia | 1–4 | mando | trivia* | S | 6 | V | c |
| 235 | Letras Cruzadas | Tablero de letras por turnos con valores pensados para el español | palabras | 1–4 | ambos | palabras* (tablero) | L | 6 | C | m |
| 236 | Afina el Oído | ¿Qué nota suena más aguda? ¿Cuántas notas suenan? | trivia | 1–4 | mando | trivia* (sonido) | S | 8 | O | c |

### J. Cooperativos — 16 juegos (16 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 237 | Cocina en Apuros | Cortar, freír y emplatar a cuatro manos antes de que caduquen los pedidos | coop | coop | mando | cocina* | L | 3 | C | m |
| 238 | Pizzería en Llamas | Hornos que se incendian y encimeras que se mueven | coop | coop | mando | cocina* | M | 3 | V | m |
| 239 | Mudanza Caótica | Muebles grandes que se llevan entre dos por escaleras estrechas | coop | coop | mando | cocina* (carga) | M | 4 | O | m |
| 240 | Mazmorra a Cuatro | Mazmorra cooperativa: cada jugador elige clase y se reviven entre sí | coop | coop | mando | topdown (coop) | L | 1 | V | m |
| 241 | Bomberos del Barrio | Apagad fuegos y rescatad gatos compartiendo manguera | coop | coop | mando | cocina* (fuego) | M | 5 | O | m |
| 242 | Nave a la Deriva | Cada jugador lleva un puesto: timón, escudos, cañones o motor | coop | coop | mando | cocina* (puestos) | L | 4 | O | m |
| 243 | Castillo de Dos | Plataformas cooperativas: uno salta sobre el otro para llegar | coop | coop | mando | platformer (coop) | L | 3 | C | m |
| 244 | Cordada | Dos escaladores atados: si uno cae, el otro aguanta | coop | coop | mando | platformer (coop) | M | 5 | O | m |
| 245 | Huerto Hambriento | Regad, podad y ahuyentad plagas entre todos | coop | coop | mando | cocina* (huerto) | M | 6 | V | m |
| 246 | Laberinto a Ciegas | Uno ve el mapa en la tele y el otro camina a oscuras: habladlo | coop | coop | mando | maze (coop) | M | 4 | O | c |
| 247 | Asedio Zombi Coop | Hasta cuatro contra la horda, con revivir al compañero | coop | coop | mando | topdown (coop) | M | 3 | V | m |
| 248 | Correos Express | Clasificad paquetes por colores en cintas y furgonetas | coop | coop | mando | cocina* (cintas) | M | 6 | O | m |
| 249 | Defensa de la Aldea | Torres cooperativas: cada jugador construye en su zona | coop | coop | mando | td (coop) | L | 5 | V | m |
| 250 | Rompehielos | Dos barcos abren canal para que pase el convoy | coop | coop | mando | naval* | M | 7 | O | c |
| 251 | Taller de Juguetes | Montad juguetes en cadena antes de la gran noche | coop | coop | mando | cocina* | M | 7 | V | m |
| 252 | Rescate en Montaña | Helicóptero y escalador se coordinan en la ventisca | coop | coop | mando | cocina* (puestos) | M | 8 | O | m |

### K. Arcade clásico con giro — 32 juegos (18 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 253 | Burbujas Arcoíris | Lanza burbujas y une tres del mismo color antes de que baje el techo | arcade | 1–2 | ambos | burbujas* | M | 3 | C | c |
| 254 | Burbujas a Duelo | Versus: las burbujas que sueltas caen en el tablero del rival | arcade | 1–2 | mando | burbujas* | S | 4 | V | c |
| 255 | Fusión de Frutas | Deja caer frutas; dos iguales se funden en una mayor | arcade | 1 | ambos | fisica* (fusión) | M | 3 | C | c |
| 256 | Fusión Solar | Igual, pero con gravedad radial: los planetas caen hacia el sol | arcade | 1 | ambos | fisica* (fusión) | S | 3 | O | c |
| 257 | Bloques 10×10 | Coloca piezas y limpia filas y columnas | puzzle | 1 | táctil | rejilla* | S | 1 | C | c |
| 258 | Bloques Hexa | Colocación de piezas en rejilla hexagonal | puzzle | 1 | táctil | rejilla* | S | 4 | V | c |
| 259 | Pinball Nocturno | Mesa completa con rampas, multibola y misiones | arcade | 1 | ambos | pinball* | L | 7 | C | m |
| 260 | Pinball a Dúo | Mesa para dos: cada uno sus aletas, la bola es de ambos | arcade | 1–2 | mando | pinball* | M | 6 | O | c |
| 261 | Serpientes Hambrientas | Hasta cuatro serpientes en la misma rejilla | arcade | 1–4 | mando | snake (MP) | S | 1 | C | c |
| 262 | Glotones del Estanque | Come bolitas más pequeñas que tú y huye de las grandes | arcade | 1–4 | mando | arena* (.io) | M | 1 | C | c |
| 263 | Rompemuros Duo | Rompeladrillos para dos: palas arriba y abajo, muro en medio | arcade | 1–2 | mando | breakout (duo) | M | 4 | V | c |
| 264 | Linterna del Laberinto | Laberinto a oscuras: tu linterna aturde a los fantasmas | arcade | 1 | ambos | maze (linterna) | M | 5 | O | c |
| 265 | Comilona a Cuatro | Dos comedores contra dos fantasmas controlados por jugadores | arcade | 2–4 | mando | maze (MP) | M | 3 | V | c |
| 266 | Cruce sin Fin | Cruza carreteras y ríos infinitos; hasta cuatro a la vez | arcade | 1–4 | mando | frog (infinito MP) | M | 3 | C | c |
| 267 | Paracaidistas | Gira el cañón y derriba a los paracaidistas antes de que aterricen | arcade | 1 | ambos | shooter (cañón) | S | 8 | C | c |
| 268 | Minero Saltarín | Pantallas fijas con llaves, cintas y enemigos con patrón | arcade | 1 | mando | platform (pantalla) | M | 8 | C | m |
| 269 | Cohete de Cavernas | Pilota con gravedad por cavernas y recoge combustible | arcade | 1 | mando | lander (cavernas) | M | 7 | C | c |
| 270 | Bolas Divididas | Revienta con un arpón vertical bolas que se dividen al tocarlas | arcade | 1–2 | mando | micro* (arpón) | M | 5 | C | c |
| 271 | Barra de Refrescos | Sirve bebidas en cuatro barras antes de que el cliente llegue al final | arcade | 1 | mando | micro* (barra) | M | 5 | C | c |
| 272 | Cava y Atrapa | Cava agujeros para atrapar a los guardias y recoge el oro | arcade | 1 | mando | platform (cavar) | M | 7 | C | m |
| 273 | Tren de Vagones | Recoge vagones por las vías y elige tú los cruces | arcade | 1 | ambos | snake (vías) | S | 8 | O | c |
| 274 | Lluvia de Meteoros | 60 s esquivando meteoros, hasta cuatro a la vez | arcade | 1–4 | mando | arena* | S | 4 | V | c |
| 275 | Enciende Farolas | Enciende todas las farolas del laberinto; los apagadores te siguen | arcade | 1 | ambos | maze (invertido) | M | 7 | O | c |
| 276 | Rompebloques Circular | La pala gira alrededor del núcleo y los ladrillos forman anillos | arcade | 1 | ambos | breakout (anillo) | M | 4 | O | c |
| 277 | Tetra Duelo | Bloques que caen 1v1: tus líneas suben basura al rival | arcade | 1–2 | mando | tetra (versus) | M | 1 | V | c |
| 278 | Columnas de Joyas | Caen tres gemas en columna; alinéalas en cualquier dirección | arcade | 1–2 | ambos | columnas* | M | 3 | C | c |
| 279 | Cápsulas | Cápsulas de dos colores limpian los virus del frasco | arcade | 1–2 | ambos | columnas* | M | 5 | C | c |
| 280 | Gotas Gemelas | Pares de gotas: cuatro unidas explotan y encadenan | arcade | 1–2 | ambos | columnas* | M | 4 | C | c |
| 281 | Caseta de Tiro | Tiro de feria con patos y botellas durante 60 s | arcade | 1–4 | mando | tiro* | S | 3 | C | c |
| 282 | Disparo Fijado | Shooter de arena: B fija la dirección de tiro mientras te mueves | arcade | 1–4 | mando | topdown (arena MP) | M | 4 | C | c |
| 283 | Fachada Vertical | Escala el edificio esquivando macetas y ventanas | arcade | 1–2 | mando | platform (fachada) | M | 6 | C | c |
| 284 | Justa Voladora | Montado en avestruz: golpea desde arriba a los jinetes | arcade | 1–2 | mando | brawl* (aleteo) | M | 5 | C | c |

### L. Puzles nuevos — 30 juegos (2 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 285 | Agua en Camino | El agua ya corre: coloca tuberías antes de que llegue | puzzle | 1 | ambos | logic (flujo) | M | 4 | C | c |
| 286 | Islas y Mar | Separa islas numeradas con un mar continuo | puzzle | 1 | táctil | logica2* | M | 7 | C | c |
| 287 | Sumas Cruzadas | Crucigrama de sumas sin repetir cifras | puzzle | 1 | táctil | logica2* | M | 6 | C | m |
| 288 | Puentes entre Islas | Une islas con uno o dos puentes según su número | puzzle | 1 | táctil | logica2* | M | 4 | C | c |
| 289 | Estrellas Ocultas | Una estrella por fila, columna y región, sin tocarse | puzzle | 1 | táctil | logica2* | M | 4 | C | c |
| 290 | Tiendas y Árboles | Cada árbol con su tienda, y las tiendas sin tocarse | puzzle | 1 | táctil | logica2* | S | 6 | C | c |
| 291 | Atasco | Mueve coches en la rejilla para sacar el rojo | puzzle | 1 | táctil | rejilla* | M | 1 | C | c |
| 292 | Aparcamiento Lleno | Camiones de tres casillas y una grúa de un solo uso | puzzle | 1 | táctil | rejilla* | S | 6 | V | c |
| 293 | Vías de Tren | Coloca vías para que cada tren llegue a su estación | puzzle | 1 | táctil | vias* | M | 7 | V | c |
| 294 | Cajas Pegajosas | Sokoban donde las cajas se pegan al tocarse | puzzle | 1 | ambos | sokoban (pegajoso) | M | 6 | O | c |
| 295 | Puzle de Piezas | Rompecabezas de piezas con ilustraciones generadas por código | puzzle | 1 | táctil | piezas* | M | 8 | C | c |
| 296 | Cinco Diferencias | Encuentra 5 diferencias en escenas dibujadas por código | puzzle | 1–4 | ambos | piezas* (diferencias) | M | 7 | C | c |
| 297 | Objetos Ocultos | Encuentra la lista en una escena desordenada generada | puzzle | 1 | táctil | piezas* (escena) | M | 8 | C | c |
| 298 | Espejo Doble | Mueves dos personajes a la vez, uno reflejado | puzzle | 1 | ambos | sokoban (espejo) | M | 4 | O | c |
| 299 | Pesos y Balanzas | Equilibra balanzas colgantes con pesas | puzzle | 1 | táctil | fisica* | M | 7 | O | c |
| 300 | Luz y Sombra | Coloca objetos para que la sombra forme la figura | puzzle | 1 | táctil | poly (sombras) | M | 8 | O | c |
| 301 | Relojes Engranados | Gira engranajes para dejar las agujas en la hora pedida | puzzle | 1 | táctil | micro* (engranajes) | M | 7 | O | c |
| 302 | Líneas de Metro | Traza líneas de metro para estaciones que no paran de aparecer | puzzle | 1 | táctil | vias* (metro) | L | 7 | C | m |
| 303 | Reacción en Cadena | Coloca fichas para que la cadena derribe la última | puzzle | 1 | táctil | fisica* | M | 6 | O | c |
| 304 | Plegar Papel | Pliega la hoja para que los colores formen el dibujo | puzzle | 1 | táctil | micro* (plegado) | M | 6 | O | c |
| 305 | Cortes Exactos | Divide la figura en N partes iguales con pocas líneas | puzzle | 1 | táctil | poly (cortes) | M | 6 | O | c |
| 306 | Salto del Caballo | Recorre todas las casillas con el caballo de ajedrez | puzzle | 1 | ambos | mesa* (caballo) | S | 8 | C | c |
| 307 | Ocho Reinas | Coloca N reinas sin que se amenacen en tableros crecientes | puzzle | 1 | ambos | mesa* (reinas) | S | 8 | C | c |
| 308 | Torres de Hanói | Discos con movimientos mínimos y variante de 4 postes | puzzle | 1 | ambos | logic (hanói) | S | 8 | C | c |
| 309 | Dado Rodante | Rueda un dado por la rejilla hasta dejar arriba la cara pedida | puzzle | 1 | ambos | cube (dado) | M | 7 | O | c |
| 310 | Cuatro Colores | Colorea el mapa sin que dos regiones vecinas compartan color | puzzle | 1 | táctil | logica2* | S | 8 | C | c |
| 311 | Suma Diez | Une números vecinos que sumen 10 y vacía la rejilla | puzzle | 1 | táctil | logica2* | S | 4 | V | c |
| 312 | Gatos en Cajas | Deduce qué gato hay en cada caja con pistas lógicas | puzzle | 1 | táctil | logica2* (deducción) | M | 8 | O | c |
| 313 | Sudoku a Duelo | Dos jugadores en el mismo sudoku: cada casilla correcta es tuya | puzzle | 1–2 | mando | logic (duelo) | M | 6 | O | c |
| 314 | Mezcla de Colores | Mezcla primarios en tubos para lograr el color pedido | puzzle | 1 | táctil | colorsort (mezcla) | S | 8 | O | c |

### M. Acción, roguelike, sigilo y plataformas — 26 juegos (5 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 315 | Cripta por Turnos | Roguelike por turnos: cada paso tuyo es un paso de los monstruos | acción | 1 | ambos | rogue* | L | 6 | C | m |
| 316 | Cincuenta Pisos | Roguelike de 50 pisos con reliquias y muerte permanente | acción | 1 | ambos | rogue* | M | 6 | V | l |
| 317 | Mazmorra de Cartas | Tus ataques son cartas de un mazo que mejoras entre combates | estrategia | 1 | ambos | rogue* (cartas) | L | 6 | C | m |
| 318 | Ladrón de Guante Blanco | Sigilo cenital: evita conos de visión y cámaras | acción | 1 | ambos | sigilo* | L | 7 | C | m |
| 319 | Fuga de Prisión | Sigilo con disfraces y horarios de guardia | acción | 1 | ambos | sigilo* | M | 7 | V | m |
| 320 | Sombras por Turnos | Cada paso tuyo mueve una casilla a cada guardia | puzzle | 1 | ambos | sigilo* (turnos) | M | 7 | O | c |
| 321 | Honda de Frutas | Lanza frutas con la honda contra fortalezas de verduras | acción | 1 | táctil | honda* | M | 3 | C | c |
| 322 | Honda a Duelo | Dos fortalezas y lanzamientos por turnos con el mando | acción | 1–2 | mando | honda* | S | 4 | V | c |
| 323 | Globo Pinchado | Revienta todos los globos con un solo disparo que rebota | puzzle | 1 | táctil | honda* (rebote) | S | 7 | O | c |
| 324 | Horda Nocturna | Sobrevive 5 minutos: atacas solo y eliges mejoras | acción | 1 | ambos | horda* | L | 6 | C | m |
| 325 | Horda a Dúo | Horda para dos o más con mejoras compartidas | acción | coop | mando | horda* | M | 5 | V | m |
| 326 | Castillo Interconectado | Mapa conectado con habilidades que abren zonas nuevas | plataformas | 1 | mando | platformer (mapa) | L | 8 | C | l |
| 327 | Mochila Cohete | Plataformas con combustible limitado en la mochila | plataformas | 1 | ambos | platformer (jet) | M | 6 | V | c |
| 328 | Gato de Tejado | Salta de tejado en tejado; el gato siempre cae de pie | plataformas | 1 | ambos | runner (tejados) | S | 7 | O | c |
| 329 | Carrera de Plataformas | Hasta cuatro corredores en la misma pantalla: quien se queda atrás cae | plataformas | 1–4 | mando | platformer (carrera MP) | L | 1 | C | c |
| 330 | Torre a Dúo | Dos escaladores compiten subiendo una torre generada | plataformas | 1–2 | mando | platform (versus) | M | 4 | V | c |
| 331 | Portales Gemelos | Coloca dos portales para resolver cada sala | plataformas | 1 | ambos | platformer (portales) | L | 7 | O | m |
| 332 | Pelota Saltarina | Eres una pelota que siempre bota: solo controlas la dirección | plataformas | 1 | ambos | platformer (bote) | M | 6 | C | c |
| 333 | Espadachín de Rejilla | Combate por turnos en 5×5 leyendo la intención enemiga | estrategia | 1 | ambos | rogue* (táctico) | M | 7 | O | c |
| 334 | Minero Profundo | Cava hacia abajo, vende minerales y mejora el taladro | acción | 1 | ambos | excavar* | M | 8 | C | m |
| 335 | Veta Disputada | Dos mineros compiten por la veta más rica | acción | 1–2 | mando | excavar* | S | 7 | V | c |
| 336 | Luz del Faro | Guía barcos con el haz del faro entre las rocas | acción | 1 | ambos | naval* (faro) | M | 8 | O | c |
| 337 | Estrellas Ninja | Estrellas con parábola contra enemigos en los tejados | acción | 1 | ambos | honda* | S | 8 | V | c |
| 338 | Rebobinar | Rebobina 5 segundos para corregir tus errores | plataformas | 1 | mando | platformer (rebobinar) | L | 8 | O | m |
| 339 | Arquero de Torre | Defiende la torre disparando flechas con parábola | acción | 1 | ambos | tiro* | S | 4 | V | c |
| 340 | Cazatormentas | Conduce hacia el tornado y suelta sondas sin que te atrape | acción | 1 | ambos | racer2d* (tormenta) | M | 8 | O | c |

### N. Simulación, gestión, construcción e incrementales — 24 juegos (3 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 341 | Panadería Incremental | Hornea, contrata, mejora hornos y abre sucursales | simulación | 1 | táctil | idle* | M | 6 | C | l |
| 342 | Mina Automática | Pozos automáticos y un ascensor que optimizar | simulación | 1 | táctil | idle* | M | 6 | V | l |
| 343 | Granja de Bolsillo | Planta, riega y vende en ciclos de 2 minutos | simulación | 1 | táctil | gestion* | M | 3 | C | m |
| 344 | Restaurante Rápido | Toma pedidos, cocina y cobra antes de que se enfaden | simulación | 1 | ambos | gestion* | M | 3 | C | c |
| 345 | Hotel en Apuros | Asigna habitaciones y limpia a tiempo | simulación | 1 | táctil | gestion* | M | 6 | V | m |
| 346 | Torre de Control | Aterriza aviones dibujando rutas sin choques | simulación | 1 | táctil | vias* (rutas) | M | 7 | C | c |
| 347 | Ciudad de Bloques | Construye una ciudad pequeña equilibrando felicidad y dinero | simulación | 1 | táctil | ciudad* | L | 6 | C | l |
| 348 | Isla Náufraga | Supervivencia: comida, agua y refugio en días de 60 s | simulación | 1 | ambos | gestion* (supervivencia) | L | 7 | V | m |
| 349 | Acuario Tranquilo | Cuida peces, decora y cría especies nuevas | simulación | 1 | táctil | idle* | M | 7 | V | l |
| 350 | Hormiguero | Gestiona obreras, soldados y reina bajo tierra | simulación | 1 | táctil | gestion* (colonia) | L | 8 | V | l |
| 351 | Ingeniero de Puentes | Estructuras con tensión, presupuesto y camión de prueba | puzzle | 1 | táctil | drawphys (vigas) | L | 6 | C | m |
| 352 | Rascacielos con Viento | Apila pisos de formas distintas con física real y viento | simulación | 1 | ambos | fisica* | S | 4 | V | c |
| 353 | Vivero de Flores | Cruza flores para conseguir colores raros | simulación | 1 | táctil | idle* (cruces) | M | 8 | O | l |
| 354 | Estación Central | Horarios y cambios de agujas en tiempo real | simulación | 1 | táctil | vias* | M | 8 | V | m |
| 355 | Fábrica de Cintas | Conecta máquinas con cintas para producir objetos | simulación | 1 | táctil | ciudad* (fábrica) | L | 5 | C | m |
| 356 | Laboratorio de Pociones | Mezcla ingredientes según recetas que vas descubriendo | simulación | 1 | táctil | gestion* (recetas) | M | 7 | O | m |
| 357 | Taller de Bicis | Repara bicis pieza a pieza contra el reloj | simulación | 1 | ambos | gestion* | M | 8 | V | c |
| 358 | Zoológico Mini | Diseña recintos y mantén felices a los animales | simulación | 1 | táctil | ciudad* | L | 8 | V | l |
| 359 | Apicultor | Colmenas, flores y estaciones del año | simulación | 1 | táctil | gestion* (colonia) | M | 8 | O | m |
| 360 | Caravana del Desierto | Comercia entre oasis con camellos y agua | estrategia | 1 | táctil | gestion* (ruta) | M | 8 | O | m |
| 361 | Castillos de Arena | Construye castillos antes de que suba la marea, hasta cuatro | simulación | 1–4 | mando | ciudad* (marea) | M | 7 | O | c |
| 362 | Granja Compartida | Granja cooperativa para 2–4 con estaciones | simulación | coop | mando | gestion* | L | 6 | V | m |
| 363 | Tienda de Barrio | Pon precios y reabastece: la demanda cambia con el tiempo | simulación | 1 | táctil | gestion* | M | 8 | V | m |
| 364 | Reino de Dados | Reinos por turnos con dados de recursos | estrategia | 1–4 | ambos | tablero* (recursos) | L | 8 | V | l |

### O. Ritmo y música — 10 juegos (6 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 365 | Tambores de Fiesta | Dos tambores (A/B) y redoble; concurso a cuatro | ritmo | 1–4 | mando | rhythm (tambores) | M | 1 | C | c |
| 366 | Carrera al Compás | Plataformas donde saltas al ritmo de la música generada | ritmo | 1 | ambos | beat* | M | 5 | V | c |
| 367 | Director de Orquesta | Marca el compás con el joystick en 2/4, 3/4 y 4/4 | ritmo | 1–4 | mando | beat* | M | 5 | O | c |
| 368 | Piano de Colores | Toca melodías populares de dominio público | ritmo | 1 | táctil | rhythm (piano) | M | 3 | C | c |
| 369 | Duelo de DJ | 1v1: repite el patrón del rival y añade una nota | ritmo | 1–2 | mando | beat* | S | 5 | O | c |
| 370 | Palmas Flamencas | Sigue compases de palmas: tangos, rumba y bulería simplificada | ritmo | 1–4 | mando | beat* | M | 4 | O | c |
| 371 | Comba Musical | Salta en los tiempos fuertes de la canción | ritmo | 1–4 | mando | beat* | S | 6 | V | c |
| 372 | Secuenciador Libre | Crea ritmos en la rejilla y compártelos por enlace | ritmo | 1 | táctil | beat* (editor) | M | 8 | O | c |
| 373 | Motor Rítmico | Cada acierto al compás acelera tu coche | ritmo | 1–4 | mando | beat* + racer2d | M | 8 | O | c |
| 374 | Xilófono de Gotas | Atrapa las gotas que forman la melodía correcta | ritmo | 1 | ambos | beat* | S | 8 | O | c |

### P. Conceptos originales — 26 juegos (14 multijugador)

| nº | Nombre | Gancho | Género | Jug. | Entrada | Motor | Esf. | Ola | Tipo | Dur. |
|---:|---|---|---|---|---|---|:-:|:-:|:-:|:-:|
| 375 | Gravedad Compartida | La gravedad apunta hacia quien más pulse: todos giran el mismo mundo | party | 2–4 | mando | arena* (gravedad) | M | 3 | O | c |
| 376 | Reflejo Rebelde | Controlas a la vez a tu reflejo, que tiene los controles invertidos | puzzle | 1 | ambos | micro* | M | 8 | O | c |
| 377 | Ondas del Estanque | Lanza ondas que empujan barcos de papel hacia tu puerto | party | 1–4 | mando | arena* (ondas) | S | 5 | O | c |
| 378 | Sombra Retrasada | Tu sombra repite lo que hiciste hace 3 s; úsala para pulsar interruptores | puzzle | 1 | ambos | platformer (sombra) | M | 7 | O | c |
| 379 | Semillas al Viento | Eres una semilla: elige ráfagas para caer en tierra fértil | arcade | 1 | ambos | micro* | S | 8 | O | c |
| 380 | Luciérnagas | Atrae luciérnagas a tu frasco; se van con quien brilla más | party | 1–4 | mando | arena* | S | 4 | O | c |
| 381 | Cartero Planetario | Entrega cartas entre planetas en órbita usando la gravedad | arcade | 1 | ambos | planet (órbitas) | M | 7 | O | c |
| 382 | Bocadillo Apilado | Caen ingredientes: apila el bocadillo del pedido | arcade | 1–2 | ambos | columnas* (pedidos) | S | 4 | O | c |
| 383 | Espiral Glotona | Serpiente sobre una espiral que avanza hacia el centro | arcade | 1 | ambos | snake (espiral) | S | 8 | O | c |
| 384 | Eco en la Cueva | A oscuras: tu eco revela las paredes un instante | acción | 1 | ambos | sigilo* (eco) | M | 7 | O | c |
| 385 | Pastor de Nubes | Agrupa nubes para que llueva en los campos secos | arcade | 1–4 | mando | arena* (pastoreo) | S | 5 | O | c |
| 386 | Perros Pastores | Cada jugador es un perro: mete más ovejas en tu redil | party | 1–4 | mando | arena* (pastoreo) | M | 1 | O | c |
| 387 | Tren Fantasma | Todos en un vagón y cada uno controla una dirección | party | coop | mando | micro* | S | 5 | O | c |
| 388 | Topo Burlón | Tú eres el topo: asoma cuando el martillo no mira | arcade | 1–4 | mando | whack (inverso) | S | 3 | O | c |
| 389 | Relojero Loco | Para cada reloj justo en la hora pedida, varios a la vez | arcade | 1 | ambos | whack (relojes) | S | 8 | O | c |
| 390 | Constelaciones | Une estrellas para formar la figura sin cruzar líneas | puzzle | 1 | táctil | flow (estrellas) | S | 8 | O | c |
| 391 | Cometas al Viento | Vuela tu cometa y corta los hilos rivales | party | 1–4 | mando | micro* (cometas) | M | 5 | O | c |
| 392 | Mercado de Trueques | 90 s para negociar: cada uno tiene lo que otro necesita (mano en el móvil) | party | 2–4 | mando | farol* | M | 6 | O | c |
| 393 | Ladrón del Museo | Un jugador es el ladrón escondido entre visitantes de la CPU; los demás lo buscan | party | 2–4 | mando | farol* | L | 4 | O | c |
| 394 | Faroleros | Todos dicen tener una carta; acusa al que miente | party | 2–4 | mando | farol* | M | 5 | O | c |
| 395 | Anillos Orbitales | Carrera orbital: acelerar te sube de órbita y te frena | carreras | 1–4 | mando | planet (órbitas) | M | 6 | O | c |
| 396 | Pompas de Jabón | Sopla pompas y mételas por aros sin que revienten | arcade | 1 | ambos | micro* (fluido) | S | 8 | O | c |
| 397 | Clima Loco | Controla sol, lluvia y viento para guiar a un paseante | puzzle | 1 | ambos | micro* | M | 8 | O | c |
| 398 | Carretera de Papel | Dibuja la carretera por delante de un coche que no para | arcade | 1 | táctil | drawphys (carretera) | M | 5 | O | c |
| 399 | Ascensor de Invitados | Mete invitados en el ascensor según su peso y su planta | puzzle | 1 | táctil | fisica* | S | 8 | O | c |
| 400 | Compartir o Robar | Cada ronda eliges en secreto compartir o robar el tesoro | party | 2–4 | mando | farol* | S | 3 | O | c |

---

## 4. Arquitectura para escalar

### 4.1 Motores nuevos (41)

Cada motor es un archivo en `src/eng/<motor>.js` parametrizado por `CFG` (modo, reglas, tema, jugadores). Cada juego es una entrada en `G` de `build_games.py` + CFG + `PAD` + `MP`, como ahora.

| Motor | Qué hace | Juegos | Estreno (ola) | nº de juegos |
|---|---|---:|:-:|---|
| `arena` | Arena cenital con física de empujones, zonas, recogida y eliminación (sumo, hielo, corona, pintar, .io, pastoreo). Rondas de 30–90 s. | 24 | 1 | 1, 2, 3, 4, 5, 12, 13, 15, 20, 21, 22, 26, 27, 28, 29, 38, 59, 262, 274, 375, 377, 380, 385, 386 |
| `party` | Marco de minijuegos por rondas: pulsador, reflejos, machacabotones con ritmo, memoria, conteo; marcador, podio y «Ruleta». | 23 | 1 | 6, 7, 8, 9, 10, 11, 14, 16, 17, 18, 19, 23, 24, 25, 30, 32, 33, 34, 35, 39, 40, 50, 126 |
| `teamball` | Deportes de equipo 2v2 (cenital o lateral) con balón físico, IA de compañero/rival que rellena plazas, pase/tiro/placaje. | 20 | 1 | 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 87, 88, 89, 91, 92, 93, 94, 95, 96, 123 |
| `baraja` | Baraja española de 40/48 cartas dibujada por código, motor de bazas y combinaciones, IA por reglas y mano privada en el móvil. | 13 | 1 | 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 207 |
| `trivia` | Banco propio de preguntas en español (JSON aparte, ~3000), pulsador 1–4, mapa de España y banderas dibujados. | 13 | 1 | 211, 212, 213, 214, 215, 216, 217, 227, 228, 229, 233, 234, 236 |
| `palabras` | Diccionario español propio (lista de lemas comprimida, carga diferida), rejillas de letras, validación y palabra diaria. | 13 | 1 | 218, 219, 220, 221, 222, 223, 224, 225, 226, 230, 231, 232, 235 |
| `bomber` | Rejilla con bombas de explosión en cruz, bloques rompibles, mejoras y reglas intercambiables (hielo, pintura, giro). | 12 | 1 | 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72 |
| `racer2d` | Carreras cenitales con derrape, pantalla compartida que sigue al líder, objetos y superficies (agua, tierra, viento). | 12 | 1 | 127, 128, 129, 130, 131, 132, 142, 143, 144, 148, 149, 340 |
| `brawl` | Lucha en plataformas 2–4 con porcentaje de daño y expulsión, armas recogibles y escenarios que cambian. | 10 | 1 | 41, 44, 45, 46, 47, 54, 56, 57, 60, 284 |
| `tablero` | Juegos de recorrido con dados y fichas: parchís, oca, serpientes, apuestas de carrera, recursos. | 7 | 1 | 171, 172, 173, 174, 175, 205, 364 |
| `naval` | Barcos con inercia, viento y disparo lateral; niebla/sonar; variante de guiado (faro, rompehielos). | 5 | 1 | 155, 160, 167, 250, 336 |
| `rejilla` | Piezas en rejilla: colocar poliominós (10×10, hexa) y desbloquear coches (atasco) con generador verificado por BFS. | 4 | 1 | 257, 258, 291, 292 |
| `pista` | Pruebas de habilidad: machacabotones con técnica, momento exacto, ángulo y tensión (atletismo, natación, pesca, ciclismo). | 11 | 2 | 105, 106, 107, 108, 109, 113, 118, 120, 121, 145, 150 |
| `duelo` | Lucha 1v1 lateral: golpe alto/bajo, agarre, bloqueo, resistencia; IA por patrones. Esgrima, boxeo, justa, sumo. | 9 | 2 | 42, 43, 48, 49, 51, 52, 53, 55, 58 |
| `descenso` | Descenso vertical con carriles, saltos y empujones a cuatro (esquí, trineo, tobogán, carritos, surf). | 7 | 2 | 31, 112, 119, 136, 137, 138, 146 |
| `tiro` | Puntería con parábola, viento y turnos a diana (arco, platos, feria, curling, petanca). | 6 | 2 | 83, 84, 110, 111, 281, 339 |
| `moto` | Física lateral de dos ruedas sobre terreno por polilíneas (motocross, trial, BMX, monociclo, camiones). | 5 | 2 | 133, 134, 135, 147, 152 |
| `artillery` | Terreno destructible por máscara de píxeles, parábola con viento, turnos por equipos y armas. | 5 | 2 | 153, 154, 159, 166, 169 |
| `dogfight` | Vuelo lateral 360° con pérdida de sustentación, rizos y ametralladora; dirigibles y rescate. | 3 | 2 | 156, 161, 165 |
| `tenis` | Raqueta cenital con bote, efecto según el momento del golpe, paredes opcionales (pádel) y marcador por sets. | 2 | 2 | 97, 98 |
| `gestion` | Gestión por tiempo: clientes, colas, recetas, recursos y días cortos (restaurante, granja, hotel, colonia). | 11 | 3 | 343, 344, 345, 348, 350, 356, 357, 359, 360, 362, 363 |
| `mesa` | Juegos abstractos con IA minimax/MCTS: ajedrez, damas chinas, go 9×9, mancala, hex, nim, puzles de ajedrez. | 10 | 3 | 194, 195, 196, 197, 198, 199, 201, 206, 306, 307 |
| `cocina` | Cooperativo de estaciones y pedidos: coger/soltar/procesar objetos, cola de encargos; también «puestos» de nave. | 9 | 3 | 237, 238, 239, 241, 242, 245, 248, 251, 252 |
| `fisica` | Física de cuerpos rígidos sencilla (círculos y cajas, apilado estable): fusión, torres, balanzas, dominó en cadena. | 7 | 3 | 202, 255, 256, 299, 303, 352, 399 |
| `domino` | Fichas de dominó y fichas numeradas: parejas, tren, series y puzle de rejilla. | 4 | 3 | 188, 189, 190, 210 |
| `columnas` | Piezas que caen en pozo con reglas de unión configurables (3 en línea, 4 conectadas, virus, pedidos) y modo versus. | 4 | 3 | 278, 279, 280, 382 |
| `honda` | Honda/catapulta con trayectoria y estructuras que se derrumban; turnos a dúo. | 4 | 3 | 321, 322, 323, 337 |
| `farol` | Juegos sociales de información oculta: la tele muestra la mesa y cada móvil su dato secreto (requiere mensaje «priv»). | 4 | 3 | 392, 393, 394, 400 |
| `burbujas` | Lanzador de burbujas en rejilla hexagonal con rebote en paredes, caída de racimos y modo duelo. | 2 | 3 | 253, 254 |
| `logica2` | Puzles lógicos con generador + verificador de solución única: islas, puentes, estrellas, tiendas, kakuro, colorear. | 8 | 4 | 286, 287, 288, 289, 290, 310, 311, 312 |
| `beat` | Reloj musical sintetizado (WebAudio) con patrones y valoración por tiempo; compás, palmas, duelo de patrones, editor. | 8 | 4 | 366, 367, 369, 370, 371, 372, 373, 374 |
| `micro` | Contenedor de juegos pequeños de pantalla única con lógica propia (~300 líneas cada uno): arpón, barra, cometas, engranajes… | 10 | 5 | 270, 271, 301, 304, 376, 379, 387, 391, 396, 397 |
| `ciudad` | Rejilla de construcción con recursos y simulación por ticks: ciudad, fábrica de cintas, zoo, castillos de arena. | 4 | 5 | 347, 355, 358, 361 |
| `horda` | Supervivencia contra hordas con ataque automático, cientos de enemigos (rejilla espacial) y elección de mejoras. | 2 | 5 | 324, 325 |
| `rogue` | Roguelike por turnos: generación de mazmorras, visión, inventario, reliquias; variantes de cartas y táctica 5×5. | 4 | 6 | 315, 316, 317, 333 |
| `idle` | Incremental con números grandes, progreso fuera de línea (marca de tiempo), prestigio y cruces. | 4 | 6 | 341, 342, 349, 353 |
| `pinball` | Pinball con colisión de segmentos a subpasos, aletas, rampas, multibola y misiones; mesa para dos. | 2 | 6 | 259, 260 |
| `vias` | Trazado de rutas en rejilla o libres: vías, metro, aviones, agujas. | 4 | 7 | 293, 302, 346, 354 |
| `sigilo` | Sigilo cenital con conos de visión, ruido y rutas de patrulla; modo por turnos y eco. | 4 | 7 | 318, 319, 320, 384 |
| `piezas` | Escenas ilustradas generadas por código para rompecabezas, diferencias y objetos ocultos. | 3 | 7 | 295, 296, 297 |
| `excavar` | Excavación por capas con mineral, venta y mejoras; duelo por vetas. | 2 | 7 | 334, 335 |

### 4.2 Motores actuales que dan variantes de verdad distintas

| Motor | Juegos nuevos | Variación real (nueva regla o modo, no solo tema) |
|---|---:|---|
| `platformer` | 9 | coop 2 jugadores, carrera MP a 4, mapa conectado, mochila, portales, rebobinar, sombra |
| `topdown` | 6 | rebote de balas, arena MP, coop con revivir (mazmorra/zombis) |
| `paddle` | 4 | 4 lados, dobles, frontón, mesa giratoria |
| `rhythm` | 4 | MP a 4 en la misma pista, tambores, piano, boxeo |
| `board` | 4 | cuatro en línea, 3 en raya anidado, molino, cinco en línea |
| `maze` | 4 | coop a ciegas, linterna, invertido (encender farolas) |
| `platform` | 4 | pantalla fija, cavar, fachada, versus |
| `golf` | 3 | turnos 1–4, campo de 9 hoyos, gravedad orbital (con planet) |
| `road` | 3 | rally con copiloto, tráfico, pantalla partida |
| `shooter` | 3 | coop 2 naves, cañón giratorio |
| `snake` | 3 | MP a 4, vías, espiral |
| `logic` | 3 | flujo contrarreloj, hanói, sudoku a duelo |
| `homerun` | 2 | partido completo, críquet |
| `bowling` | 2 | turnos con mando, curva |
| `pool` | 2 | bola 8, carambola |
| `dice` | 2 | farol con dados privados, barco-capitán |
| `cards` | 2 | bazas (corazones, picas) |
| `breakout` | 2 | duo, anillo |
| `sokoban` | 2 | pegajoso, espejo |
| `poly` | 2 | sombras, cortes |
| `drawphys` | 2 | vigas con tensión, carretera |
| `planet` | 2 | órbitas (cartero, carrera) |
| `whack` | 2 | inverso, relojes |
| `darts` | 1 | cricket |
| `hoop` | 1 | duelo |
| `penalty` | 1 | versus |
| `marble` | 1 | MP a 4 |
| `battle` | 1 | MP con tablero privado |
| `rocks` | 1 | MP a 4 |
| `td` | 1 | coop por zonas |
| `frog` | 1 | infinito MP |
| `lander` | 1 | cavernas |
| `tetra` | 1 | versus con basura |
| `cube` | 1 | dado |
| `colorsort` | 1 | mezcla |
| `runner` | 1 | tejados |
| `flow` | 1 | constelaciones |

### 4.3 Cambios comunes necesarios (antes de la oleada 1)

- **kit.js multijugador**: ayudas comunes `k.players()` (lista activa con CPU de relleno), `k.pdir(p)` (joystick del jugador p en 8 dir./analógico), selector de jugadores al inicio, marcador por colores, podio final y «revancha». Hoy existen `k.party`, `k.pad(p)`, `k.pcol(p)`, `k.onParty`: se amplían, no se sustituyen.
- **Mensaje privado tele → mando** (`{t:'priv', html|cards|choices}`) en `party-pad.js`: el móvil muestra la mano (cartas, dados, rol secreto) y el jugador elige con el joystick y A. Lo necesitan `baraja`, `farol`, `dice (farol)`, `battle (MP)`, `domino`. Sin tele, esos juegos funcionan en un solo dispositivo con pantalla de «pasa el móvil».
- **IA de relleno** estándar por motor (nivel fácil/normal/difícil) para que todo 2–4 sea jugable con 1 mando.
- **`slugify` a ASCII**: hoy `generate_wxr.slugify` conserva tildes y «ñ» (`isalnum`), lo que daría carpetas `parchís-de-la-plaza`. Hay que normalizar (NFKD → ASCII) antes de añadir nombres en español; los 100 actuales no cambian.
- **Datos grandes fuera del motor**: preguntas (`games/_data/trivia-es.json`) y diccionario (`games/_data/palabras-es.txt`) se cargan con `fetch` diferido y caché del navegador; nunca dentro del HTML de cada juego.
- **Bots de QA por motor** (`scripts/bots/<motor>.py`): partidas automáticas de 1–4 jugadores simulando `arcade:pkey`, como el QA 1.15.
- **`build_games.py` por archivos**: con 500 entradas, mover `G`, `PAD` y `MP` a `scripts/catalog/<familia>.py` (o JSON) para no tener un archivo de 1500 líneas; `CATALOG` igual.

### 4.4 Esfuerzo estimado

Unidad: **jornada de agente** ≈ una sesión larga de Claude Code (programar + probar + capturas). Juegos: S 0,5 · M 1 · L 2. Motor nuevo: 3 jornadas de base (el primer juego del motor ya va incluido en su esfuerzo S/M/L).

| Oleada | Juegos S/M/L | Jornadas juegos | Motores nuevos | Jornadas motores | Total |
|:-:|---|---:|---|---:|---:|
| 1 | 21/19/10 | 49,5 | arena, party, brawl, bomber, teamball, racer2d, naval, tablero, baraja, trivia, palabras, rejilla | 36 | **85,5** |
| 2 | 24/24/2 | 40 | duelo, tiro, tenis, pista, descenso, moto, artillery, dogfight | 24 | **64** |
| 3 | 21/26/3 | 42,5 | domino, mesa, cocina, burbujas, fisica, columnas, honda, gestion, farol | 27 | **69,5** |
| 4 | 18/29/3 | 44 | logica2, beat | 6 | **50** |
| 5 | 15/31/4 | 46,5 | micro, horda, ciudad | 9 | **55,5** |
| 6 | 11/30/9 | 53,5 | pinball, rogue, idle | 9 | **62,5** |
| 7 | 12/32/6 | 50 | vias, piezas, sigilo, excavar | 12 | **62** |
| 8 | 19/26/5 | 45,5 | — | 0 | **45,5** |
| **Total** | 141/217/42 | | 41 | | **494,5** |

Total ≈ **494 jornadas de agente** (≈ 62 por oleada). Con 2–3 sesiones en paralelo por oleada (una por motor, como las tandas de `smoke.py`), una oleada cabe en 1–2 semanas de calendario. La oleada 1 es la más cara porque estrena 12 motores y los cambios comunes de §4.3 (+6 jornadas).

---

## 5. Plan por oleadas (8 × 50)

### Criterios de aceptación comunes (todas las oleadas)

1. `node --check` de cada motor y `php -l` de lo tocado; `build_games.py` sin avisos.
2. `smoke.py` sin errores JS en los 50 juegos (390×844 y 800×450).
3. `audit.py`: arranca, no muere sin tocar en los primeros segundos (salvo juegos de reflejos), anima y responde.
4. **Bot por juego**: partida completa automática (1 j. y, si es multijugador, 2 y 4 jugadores vía `arcade:pkey`) que llega a «fin de partida» sin atascos; en juegos de mesa y cartas, 200 partidas bot contra bot sin bloqueos ni jugadas ilegales.
5. **Modo tele** (multijugador): aparece en `party.json` con `mp`, se juega con 1 mando + CPU y con 4 mandos simulados; los colores de jugador coinciden con los del mando; sin puntero.
6. **Capturas** en vertical y horizontal revisadas a ojo + `thumbs.py` (miniatura 400×300 webp, ≤ 12 KB).
7. **Textos SEO únicos**: descripción ≥ 150 palabras, «Cómo se juega», controles (móvil, teclado, tele) y 2–3 consejos, sin frases plantilla repetidas entre juegos (comprobación automática de similitud < 40 % entre textos).
8. Nombres y slugs únicos (script de §7), sin marcas; `VERSION` del plugin subida; `?v=` de `kit.js`/`art.js` subido si cambian.

### Oleada 1 — Fiesta en la tele: party, bombas, fútbol/hockey/vóley 2v2, karts, tanques y barcos, parchís/oca, brisca/mus/chinchón, trivia + 4 de retención diaria (palabra del día, sopa, atasco, bloques).

- **Juegos (50, 46 multijugador)**: 1 Sumo de Cojines, 2 Pista de Hielo Loca, 3 Pintacasillas, 4 Rey de la Colina, 5 Patata Explosiva, 6 Lluvia de Yunques, 7 Duelo del Oeste, 8 Carrera Machacabotones, 9 Tira y Afloja, 12 Coge la Corona, 22 Choque de Carritos, 27 Quita la Silla, 30 Ruleta de Minijuegos, 41 Almohadazo Arena, 61 Petardo Plaza, 73 Fútbol de Plaza, 74 Hockey de Barrio, 75 Coches con Balón, 80 Vóley Playa, 81 Balón Prisionero, 89 Fútbol Cabezón, 100 Minigolf Party, 101 Bolera del Barrio, 115 Penaltis Cara a Cara, 127 Rally de Mesa, 128 Circuito Garaje, 129 Karts de Patio, 155 Barcos Piratas, 157 Tanques Rebote, 171 Parchís de la Plaza, 172 Parchís Exprés, 173 La Oca Viajera, 176 Brisca de Bar, 178 Mus de Peña, 179 Chinchón Casero, 191 Cuatro en Línea, 211 Trivia de Sobremesa, 212 Verdad o Bulo, 219 Palabra del Día, 221 Ahorcado Ilustrado, 222 Sopa de Letras, 240 Mazmorra a Cuatro, 257 Bloques 10×10, 261 Serpientes Hambrientas, 262 Glotones del Estanque, 277 Tetra Duelo, 291 Atasco, 329 Carrera de Plataformas, 365 Tambores de Fiesta, 386 Perros Pastores.
- **Géneros**: party 14, deportes 9, mesa 4, acción 3, carreras 3, cartas 3, palabras 3, arcade 3, trivia 2, puzzle 2, lucha 1, coop 1, plataformas 1, ritmo 1.
- **Motores nuevos**: `arena`, `party`, `brawl`, `bomber`, `teamball`, `racer2d`, `naval`, `tablero`, `baraja`, `trivia`, `palabras`, `rejilla`. Esfuerzo ≈ 85,5 jornadas.
- **Aceptación específica**: Cambios comunes de §4.3 hechos (kit multijugador, mensaje `priv`, IA de relleno, slug ASCII, datos diferidos). Prueba real: 1 tele + 4 móviles en la misma red; latencia joystick → movimiento < 100 ms percibidos. Parchís, oca, brisca, mus y chinchón: reglas revisadas con la lista de §«Reglas ya aplicadas» ampliada (barreras, comer cuenta 20, 63 casillas; señas y órdago en el mus). «Ruleta de minijuegos» encadena los party de la oleada con `adBreak` cada 3 rondas. Palabra del día: misma palabra para todos por fecha (sin servidor) y diccionario sin palabras ofensivas.

### Oleada 2 — Lucha 1v1, deportes con raqueta, atletismo, tiro, descensos, motos, artillería y aviones; más party y cartas.

- **Juegos (50, 50 multijugador)**: 10 Globos a Presión, 11 Memoria de Semáforo, 13 Cazamoscas, 14 Salta la Comba, 15 Escondite de Cajas, 16 Pesca Rápida, 17 Estatuas Musicales, 18 Cuenta Ovejas, 19 Carrera de Sacos, 20 Plataforma Menguante, 24 Tartas al Blanco, 29 Imanes Opuestos, 36 Disco a Cuatro Bandas, 37 Flechas de Baile, 38 Pelea de Almohadas, 42 Puños de Papel, 43 Dojo Nocturno, 44 Gladiadores de Juguete, 45 Robots de Chatarra, 48 Esgrima de Bolsillo, 49 Guantes Gigantes, 55 Sumo de Equilibrio, 59 Pelea de Pingüinos, 62 Petardo Glaciar, 64 Bombas de Pintura, 76 Canasta de Patio, 82 Fútbol Sala Neón, 84 Petanca de Verano, 90 Frontón Vasco, 92 Futbolín de Bar, 97 Tenis Rápido, 98 Pádel de Cristal, 102 Dardos Cricket, 103 Bola Ocho Duo, 105 Juegos de Pista, 110 Arco y Viento, 112 Slalom de Banderas, 114 Canastas a Duelo, 126 Caballitos de Feria, 133 Motocross de Colinas, 137 Trineo Nevado, 153 Cañones de Colina, 154 Bichos Artilleros, 156 Duelo de Biplanos, 163 Invasores a Dúo, 164 Arena de Asteroides, 166 Guerra de Bolas de Nieve, 174 Serpientes y Escaleras, 177 Tute Cabrón, 180 Cinquillo.
- **Géneros**: party 15, deportes 13, lucha 8, acción 6, carreras 3, estrategia 2, cartas 2, mesa 1.
- **Motores nuevos**: `duelo`, `tiro`, `tenis`, `pista`, `descenso`, `moto`, `artillery`, `dogfight`. Esfuerzo ≈ 64 jornadas.
- **Aceptación específica**: Duelos 1v1 con IA que bloquea y castiga (no machacable con un botón). Artillería: terreno destructible sin fugas de memoria (bot de 100 turnos). Tenis/pádel: marcador oficial (15-30-40, iguales, ventaja, tie-break simplificado).

### Oleada 3 — Mesa abstracta y dominó, cooperativos de cocina, burbujas, fusión, columnas, honda, gestión y juegos de farol.

- **Juegos (50, 44 multijugador)**: 21 Bolos Humanos, 23 Toro Mecánico, 25 Huevo en la Cuchara, 26 El Suelo es Lava, 28 Mina de Gemas, 31 Descenso Loco a Cuatro, 32 Foto de Grupo, 33 Relevo de Cubos, 34 Globo de Todos, 40 Tren de la Bruja, 46 Tejados Ninja, 47 Almohadas en Órbita, 50 Pulso de Titanes, 52 Justa de Caballeros, 67 Petardo por Parejas, 69 Bombas Fantasma, 72 Bomba Única, 77 Balonmano Relámpago, 181 Siete y Medio, 182 La Escoba, 184 El Burro, 188 Dominó por Parejas, 194 Damas Chinas, 195 Ajedrez de Salón, 201 Combinación Oculta, 203 Dados Mentirosos, 213 Más o Menos, 214 Mapa Mudo de España, 215 Banderas del Mundo, 217 Cálculo Veloz, 220 Abecedario Veloz, 224 Anagramas, 237 Cocina en Apuros, 238 Pizzería en Llamas, 243 Castillo de Dos, 247 Asedio Zombi Coop, 253 Burbujas Arcoíris, 255 Fusión de Frutas, 256 Fusión Solar, 265 Comilona a Cuatro, 266 Cruce sin Fin, 278 Columnas de Joyas, 281 Caseta de Tiro, 321 Honda de Frutas, 343 Granja de Bolsillo, 344 Restaurante Rápido, 368 Piano de Colores, 375 Gravedad Compartida, 388 Topo Burlón, 400 Compartir o Robar.
- **Géneros**: party 12, arcade 8, lucha 4, acción 4, mesa 4, trivia 4, coop 4, cartas 3, palabras 2, simulación 2, deportes 1, puzzle 1, ritmo 1.
- **Motores nuevos**: `domino`, `mesa`, `cocina`, `burbujas`, `fisica`, `columnas`, `honda`, `gestion`, `farol`. Esfuerzo ≈ 69,5 jornadas.
- **Aceptación específica**: Ajedrez: movimientos legales completos (enroque, al paso, coronación, tablas por repetición y 50 jugadas) verificados con perft. Cocina coop: se puede completar con 1 jugador y escala pedidos con 2–4. Farol: la información privada nunca aparece en la tele.

### Oleada 4 — Puzles lógicos con solución única, ritmo, roguelike por turnos, incrementales y más multijugador.

- **Juegos (50, 37 multijugador)**: 63 Petardo Minas, 79 Rugby Placaje, 83 Curling Deslizante, 95 Bádminton Doble, 99 Ping Pong Dobles, 107 Natación Crol, 111 Tiro al Plato, 116 Golf de Campo, 118 Pesca de Altura, 130 Lanchas de Regata, 134 Trial de Precisión, 136 Carritos Cuesta Abajo, 145 Arrancada de 400 m, 151 Bolas de Hámster, 158 Flota Hundida Duo, 159 Catapultas del Reino, 185 Solitario Español, 187 La Pocha, 192 Tres en Raya Anidado, 198 Mancala de Semillas, 202 Torre de Bloques, 216 Línea del Tiempo, 226 ¡Basta!, 227 Refranes Rotos, 228 ¿Quién Soy?, 230 Letras que Caen, 233 B o V, 239 Mudanza Caótica, 242 Nave a la Deriva, 246 Laberinto a Ciegas, 254 Burbujas a Duelo, 258 Bloques Hexa, 263 Rompemuros Duo, 274 Lluvia de Meteoros, 276 Rompebloques Circular, 280 Gotas Gemelas, 282 Disparo Fijado, 285 Agua en Camino, 288 Puentes entre Islas, 289 Estrellas Ocultas, 298 Espejo Doble, 311 Suma Diez, 322 Honda a Duelo, 330 Torre a Dúo, 339 Arquero de Torre, 352 Rascacielos con Viento, 370 Palmas Flamencas, 380 Luciérnagas, 382 Bocadillo Apilado, 393 Ladrón del Museo.
- **Géneros**: deportes 8, arcade 7, puzzle 6, carreras 5, trivia 4, acción 3, mesa 3, coop 3, estrategia 2, cartas 2, palabras 2, party 2, plataformas 1, simulación 1, ritmo 1.
- **Motores nuevos**: `logica2`, `beat`. Esfuerzo ≈ 50 jornadas.
- **Aceptación específica**: `logica2`: cada nivel generado tiene solución única (verificador por fuerza bruta, como en sokoban/flow). Ritmo: desfase audio/imagen calibrable; valoraciones coherentes a 60 y 120 Hz. Incrementales: progreso fuera de línea limitado y guardado robusto (try/catch en localStorage).

### Oleada 5 — Micro-juegos originales, horda, construcción de ciudad y variantes de motores actuales.

- **Juegos (50, 43 multijugador)**: 35 Patitos del Canal, 39 Apuesta de Atasco, 51 Lucha Canaria, 54 Taberna Revuelta, 56 Cuerdas del Ring, 65 Rebote Explosivo, 68 Cohetes de Feria, 71 Petardo Cooperativo, 78 Waterpolo Burbuja, 106 Decatlón de Bolsillo, 108 Lanzamiento de Martillo, 109 Salto con Pértiga, 124 Minigolf Orbital, 131 Carrera de Babosas, 132 Derrape Nocturno, 138 Tobogán Acuático, 141 Monoplaza Pixel, 148 Patos de Goma, 160 Submarinos Sonar, 168 Tanques Pintores, 170 Cazas en Formación, 175 Dunas y Jorobas, 183 Guiñote, 189 Tren de Dominó, 193 El Molino, 200 Cinco en Línea, 204 Barco, Capitán y Tripulación, 208 Corazones, 218 Cifra Objetivo, 223 Crucigrama Mini, 232 Mecanógrafo Espacial, 241 Bomberos del Barrio, 244 Cordada, 249 Defensa de la Aldea, 264 Linterna del Laberinto, 270 Bolas Divididas, 271 Barra de Refrescos, 279 Cápsulas, 284 Justa Voladora, 325 Horda a Dúo, 355 Fábrica de Cintas, 366 Carrera al Compás, 367 Director de Orquesta, 369 Duelo de DJ, 377 Ondas del Estanque, 385 Pastor de Nubes, 387 Tren Fantasma, 391 Cometas al Viento, 394 Faroleros, 398 Carretera de Papel.
- **Géneros**: acción 7, arcade 7, party 6, deportes 5, carreras 5, mesa 5, lucha 3, coop 3, ritmo 3, cartas 2, palabras 2, puzzle 1, simulación 1.
- **Motores nuevos**: `micro`, `horda`, `ciudad`. Esfuerzo ≈ 55,5 jornadas.
- **Aceptación específica**: Horda: 300 enemigos a 60 fps en móvil medio (rejilla espacial). Micro: cada juego < 400 líneas y con su propio bot.

### Oleada 6 — Pinball, roguelike, incrementales, deportes y carreras menos típicos.

- **Juegos (50, 32 multijugador)**: 53 Gallos de Hojalata, 57 Torneo de Escobas, 58 Maestro del Bastón, 66 Carrera de Mechas, 70 Laberinto que Gira, 85 Béisbol de Parque, 88 Disco Volador, 96 Aros Aéreos, 104 Tres Bandas, 113 Trampolín de Esquí, 120 Remo en Pareja, 142 Cuadrigas del Circo, 147 BMX de Tierra, 162 Torretas Espejo, 165 Helicóptero de Rescate, 196 Ajedrez 5×5, 199 Rombo Hexagonal, 205 Caparazones a la Meta, 207 Guerra de Cartas, 210 Fichas y Series, 225 Palabras Encadenadas, 234 Capitales Relámpago, 235 Letras Cruzadas, 245 Huerto Hambriento, 248 Correos Express, 260 Pinball a Dúo, 283 Fachada Vertical, 287 Sumas Cruzadas, 290 Tiendas y Árboles, 292 Aparcamiento Lleno, 294 Cajas Pegajosas, 303 Reacción en Cadena, 304 Plegar Papel, 305 Cortes Exactos, 313 Sudoku a Duelo, 315 Cripta por Turnos, 316 Cincuenta Pisos, 317 Mazmorra de Cartas, 324 Horda Nocturna, 327 Mochila Cohete, 332 Pelota Saltarina, 341 Panadería Incremental, 342 Mina Automática, 345 Hotel en Apuros, 347 Ciudad de Bloques, 351 Ingeniero de Puentes, 362 Granja Compartida, 371 Comba Musical, 392 Mercado de Trueques, 395 Anillos Orbitales.
- **Géneros**: puzzle 9, acción 7, deportes 6, simulación 5, mesa 4, lucha 3, carreras 3, palabras 2, coop 2, arcade 2, plataformas 2, cartas 1, trivia 1, estrategia 1, ritmo 1, party 1.
- **Motores nuevos**: `pinball`, `rogue`, `idle`. Esfuerzo ≈ 62,5 jornadas.
- **Aceptación específica**: Pinball: sin túneles de la bola (subpasos) a 30–144 Hz.

### Oleada 7 — Rutas y vías, escenas ilustradas (diferencias, objetos ocultos), sigilo y excavación.

- **Juegos (50, 22 multijugador)**: 60 Castillo Hinchable, 87 Hockey Hierba Mini, 91 Polo en Bici, 93 Fútbol de Imanes, 94 Voleipié Acrobático, 119 Surf de Olas, 121 Halterofilia, 123 Uno contra el Portero, 125 Bolos sobre Hielo, 135 Monociclo Loco, 139 Rally de Tierra, 143 Globos de Carreras, 146 Longboard Colina, 149 Avionetas de Papel, 161 Dirigibles, 167 Armada de Bañera, 186 Tute Subastado, 190 Dominó Rejilla, 197 Go de Nueve, 209 Bazas de Picas, 229 Jeroglíficos, 250 Rompehielos, 251 Taller de Juguetes, 259 Pinball Nocturno, 269 Cohete de Cavernas, 272 Cava y Atrapa, 275 Enciende Farolas, 286 Islas y Mar, 293 Vías de Tren, 296 Cinco Diferencias, 299 Pesos y Balanzas, 301 Relojes Engranados, 302 Líneas de Metro, 309 Dado Rodante, 318 Ladrón de Guante Blanco, 319 Fuga de Prisión, 320 Sombras por Turnos, 323 Globo Pinchado, 328 Gato de Tejado, 331 Portales Gemelos, 333 Espadachín de Rejilla, 335 Veta Disputada, 346 Torre de Control, 348 Isla Náufraga, 349 Acuario Tranquilo, 356 Laboratorio de Pociones, 361 Castillos de Arena, 378 Sombra Retrasada, 381 Cartero Planetario, 384 Eco en la Cueva.
- **Géneros**: puzzle 11, deportes 8, acción 6, carreras 5, arcade 5, simulación 5, cartas 2, coop 2, plataformas 2, lucha 1, mesa 1, palabras 1, estrategia 1.
- **Motores nuevos**: `vias`, `piezas`, `sigilo`, `excavar`. Esfuerzo ≈ 62 jornadas.
- **Aceptación específica**: Escenas generadas: las diferencias son visibles en 390 px de ancho. Sigilo: los conos de visión coinciden con la detección (prueba con bot).

### Oleada 8 — Cierre: los de menor prioridad, más experimentales (clima loco, secuenciador, tienda de barrio).

- **Juegos (50, 10 multijugador)**: 86 Críquet Rápido, 117 Boxeo de Sombra, 122 Mesa Giratoria, 140 Autopista Nocturna, 144 Fila de Hormigas, 150 Puerto de Montaña, 152 Camiones Monstruo, 169 Defensa Costera, 206 Cerillas, 231 Torre de Palabras, 236 Afina el Oído, 252 Rescate en Montaña, 267 Paracaidistas, 268 Minero Saltarín, 273 Tren de Vagones, 295 Puzle de Piezas, 297 Objetos Ocultos, 300 Luz y Sombra, 306 Salto del Caballo, 307 Ocho Reinas, 308 Torres de Hanói, 310 Cuatro Colores, 312 Gatos en Cajas, 314 Mezcla de Colores, 326 Castillo Interconectado, 334 Minero Profundo, 336 Luz del Faro, 337 Estrellas Ninja, 338 Rebobinar, 340 Cazatormentas, 350 Hormiguero, 353 Vivero de Flores, 354 Estación Central, 357 Taller de Bicis, 358 Zoológico Mini, 359 Apicultor, 360 Caravana del Desierto, 363 Tienda de Barrio, 364 Reino de Dados, 372 Secuenciador Libre, 373 Motor Rítmico, 374 Xilófono de Gotas, 376 Reflejo Rebelde, 379 Semillas al Viento, 383 Espiral Glotona, 389 Relojero Loco, 390 Constelaciones, 396 Pompas de Jabón, 397 Clima Loco, 399 Ascensor de Invitados.
- **Géneros**: puzzle 13, arcade 7, simulación 7, carreras 4, acción 4, deportes 3, estrategia 3, ritmo 3, plataformas 2, mesa 1, palabras 1, trivia 1, coop 1.
- **Motores nuevos**: ninguno (solo motores ya hechos). Esfuerzo ≈ 45,5 jornadas.
- **Aceptación específica**: Revisión global: ningún par de juegos con la misma descripción de mecánica; categorías equilibradas.


---

## 6. Impacto en el portal, SEO, AdSense y despliegue con 500 juegos

### 6.1 Categorías y páginas

- `game_genre` pasa de 6 a **15**: arcade, puzzle, plataformas, acción, estrategia, mesa, cartas, deportes, carreras, party, lucha, trivia y palabras, simulación, ritmo, cooperativos (el antiguo `3d-webgl` se reparte o queda como etiqueta «3D»; los 100 actuales se reasignan con una migración como `adaptive_games()`).
- Etiquetas nuevas: `multijugador`, `modo-tele`, `2-jugadores`, `4-jugadores`, `cooperativo`, `baraja-espanola`, `juegos-de-mesa-espanoles`.
- **Páginas de categoría** con texto propio (200–300 palabras), 6 destacados elegidos a mano, filtros por nº de jugadores y «funciona en la tele». Página pilar **«Juegos para jugar en grupo»** que enlaza a `/tele/`.
- Portada: fila «Para jugar juntos» y «Juego de mesa del día» además del «Juego del día».
- **Tele** (`/tele/`): con ~288 juegos multijugador, la rejilla de `party.json` necesita pestañas por categoría, filtro por nº de mandos conectados y paginación con el joystick.

### 6.2 Rendimiento

- **Índice de búsqueda** (`arcade_index`, REST `index`): 500 entradas × ~250 B ≈ 125 KB JSON (≈ 25 KB gzip). Aceptable, pero cargarlo al enfocar el buscador (no al abrir la página) y guardar en `sessionStorage`; invalidar el transitorio al publicar.
- Listados (`cards`): paginar siempre (24 por página) y cachear por categoría con transitorios.
- Cada juego sigue siendo una página estática en su iframe: 500 juegos no afectan al tiempo de carga de la ficha. Las miniaturas ya son webp perezosas.
- `party.json` crece a ~288 entradas (~40 KB): aceptable.

### 6.3 SEO y AdSense

- **Riesgo principal: «contenido de poco valor»** si aparecen 400 fichas parecidas de golpe. Mitigación: publicar **50 por oleada** de forma escalonada (p. ej. 5–10 por semana con `post_date` futuro), textos únicos (criterio 7), capturas propias y enlaces internos por categoría.
- Sitemap: el de WordPress incluye el CPT `game`; revisar que las taxonomías nuevas también salen y que cada ficha tiene `VideoGame` JSON-LD con `numberOfPlayers` y `playMode` (SinglePlayer/MultiPlayer/CoOp).
- **Más ingresos**: las partidas de party son rondas cortas → `adBreak('next')` entre rondas cada 3 minijuegos (nunca a mitad de ronda). Más tiempo por visita con juegos de mesa y trivia (sesiones de 5–15 min). Los incrementales generan visitas recurrentes.
- En la tele, anuncios solo entre partidas y a pantalla completa en pausa; nunca tapando el juego ni cerca de los controles del móvil (política de clics accidentales).
- Sin contenido de apuestas con dinero (criterio 7) y sin marcar el sitio como dirigido a niños.

### 6.4 Tamaño del zip y límite de subida

Medido hoy (1.20.0): **zip 1,34 MB** (2,19 MB descomprimido, 379 archivos). `games/` ocupa 2,9 MB: miniaturas 932 KB (≈ 9,3 KB cada una, el webp no se comprime más), `index.html` 400 KB en disco (≈ 1 KB real cada uno), `_lib` ≈ 1,1 MB (motores + kit + art).

Proyección con 500 juegos:

| Parte | Hoy | +400 juegos | Total (zip) |
|---|---:|---:|---:|
| Miniaturas webp | 0,93 MB | +3,7 MB | ≈ 4,6 MB |
| Motores nuevos (41 × ~30 KB, se comprimen ~70 %) | — | +0,4 MB | |
| `index.html` de cada juego | ~0,1 MB | +0,2 MB | |
| Datos: preguntas (~3000) y diccionario español | — | +0,7 MB | |
| Portal, kit, art, motores actuales | ~0,3 MB | — | |
| **Total zip** | **1,34 MB** | | **≈ 6,5 MB** |

Límite de subida: WordPress usa `upload_max_filesize` / `post_max_size` de PHP. El valor por defecto de PHP es 2 MB, pero en IONOS lo habitual en planes de WordPress/hosting actuales es **64 MB** (algunos planes antiguos: 8–32 MB). El valor real se ve en **Medios → Añadir nuevo** («Tamaño máximo de archivo subido») o en **Herramientas → Salud del sitio → Información → Servidor**. Con 6,5 MB cabe en casi cualquier plan, pero:

- Subir desde el móvil con datos es lento y un corte obliga a repetir. Y descomprimir miles de archivos puede agotar `max_execution_time`.
- **Estrategia recomendada**: dividir en **dos tipos de plugin** cuando el zip pase de ~5 MB (hacia la oleada 3):
  1. `arcade-core` (portal, kit, art, motores, datos): se actualiza pocas veces, ~2 MB.
  2. **Paquetes de juegos** `arcade-games-o1` … `arcade-games-o8` (páginas + miniaturas de una oleada, ~0,6 MB cada uno). `resolve_embed()` busca en las carpetas registradas por el filtro `arcade_game_dirs`. Cada oleada se despliega subiendo solo su paquete y el WXR de esa oleada (importar solo los 50 nuevos, sin duplicados, como hace el importador).
- Alternativa si la subida falla: miniaturas generadas en el navegador la primera vez (captura del lienzo) y subidas a `uploads/`, lo que deja el zip en ~2–3 MB. Más frágil: solo como plan B.
- Nombres de zip con versión (`arcade-core-plugin-X.Y.Z.zip`, `arcade-games-o1-1.0.0.zip`).

---

## 7. Comprobaciones automáticas de la lista

Script (Python, en el entorno de trabajo) que lee las 400 filas, normaliza a slug ASCII y cuenta:

- Juegos en la lista: **400** (numerados 1–400); por oleada: 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50, 7: 50, 8: 50.
- Nombres repetidos dentro de la lista: **0** 
- Nombres que coinciden con los 100 actuales: **0** 
- Multijugador local jugable en el modo tele (jug. ≠ 1, entrada mando/ambos): **284 (71.0 %)** — objetivo ≥ 160 (40 %) ✔
- Conceptos originales (tipo O): **124 (31.0 %)** — objetivo ≥ 80 (20 %) ✔
- Clásicos reconocibles con giro (tipo C): **171 (42.8 %)** — objetivo ≥ 120 (30 %) ✔
- Variantes propias de género (tipo V): 105 (26.2 %)
- Duración: 1–3 min 304 (76.0 %); 3–6 min 82 (20,5 %); sesión larga 14 (3,5 %).
- Jugadores: 1–4 156, 1 116, 1–2 58, 2–4 44, coop 26.
- Entrada: mando 246, ambos 104, táctil 50.
- Géneros: deportes 53, party 50, puzzle 43, acción 40, arcade 39, carreras 28, mesa 23, simulación 21, lucha 20, coop 16, cartas 15, palabras 13, trivia 12, ritmo 10, estrategia 9, plataformas 8.
- Esfuerzo: S 141, M 217, L 42. Motores nuevos: 41; juegos sobre motores nuevos 314, sobre motores actuales ampliados 86.
