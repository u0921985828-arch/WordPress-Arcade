#!/usr/bin/env python3
"""Genera games/<slug>/index.html para los 100 juegos a partir de motores compartidos.
Cada página carga ../_lib/kit.js + ../_lib/<motor>.js con su window.CFG."""
import hashlib, json, shutil, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
import generate_wxr as wx

GAMES_DIR = ROOT / 'wp-content/mu-plugins/arcade-core/games'
ENG_DIR = ROOT / 'src/eng'
# Todos los motores cargan antes la librería de arte común (ART, src/eng/art.js)
DEPS = {}
deps_of = lambda e: DEPS.get(e, ['art'])
STANDALONE = {'tetra-drop', 'tetra-drop-marathon'}

SW = 'Desliza o usa las flechas'
G = {
 # ---------- Arcade ----------
 'serpent-grid': ('snake', dict(help='Desliza o usa las flechas para girar; toca a un lado de la cabeza para girar hacia allí. Come para crecer y no choques.')),
 'neon-paddle': ('neonpong', dict(help='Arrastra o usa las flechas para mover tu pala. Mueve la pala al golpear para dar efecto. Gana a 7 y pasa al siguiente rival.')),
 'rock-belt': ('rocks', dict(help='Joystick a la izquierda para girar y acelerar; toca la derecha para disparar. Botón morado: hiperespacio.')),
 'starfall-defender': ('shooter', dict(mode='vertical', help='Arrastra para mover la nave; dispara sola. Esquiva las balas enemigas.')),
 'maze-muncher': ('maze', dict(mode='muncher', help=f'{SW} para comer todos los puntos. Las bolas grandes te dejan cazar fantasmas.')),
 'brick-breaker-dx': ('breakout', dict(help='')),
 'pixel-invaders': ('shooter', dict(mode='invaders', help='← → para moverte, A o mantén pulsado para disparar. Detén la invasión.')),
 'frog-crossing': ('frog', dict(help='')),
 'missile-guard': ('missile', dict(help='')),
 'bug-garden': ('shooter', dict(mode='centipede', bg='#0f1a12', help='Arrastra para moverte; disparas solo. Destruye el ciempiés antes de que baje.')),
 'lunar-lander': ('lander', dict(help='')),
 'tank-duel': ('topdown', dict(mode='tank', help='Mueve el tanque (flechas o arrastra); la torreta apunta sola y dispara con A, tocando o al acercarte. Las balas rebotan una vez y algunos sacos se rompen.')),
 'neon-trails': ('gridmover', dict(mode='trails', help=f'{SW} para girar tu moto. No choques con ninguna estela. Sé el último en pie.')),
 'tunnel-digger': ('maze', dict(mode='digger', bg='#1a120b', help=f'{SW} para excavar. Recoge todas las gemas, evita a los bichos y tira rocas para aplastarlos.')),
 'cave-flyer': ('runner', dict(mode='cave', pal=['#5ce1e6', '#ff5fa2', '#3b2a55'], help='Mantén pulsado (o A) para subir y suelta para bajar. Disparas solo: dos impactos por mina. Recoge los cristales.')),
 'territory': ('gridmover', dict(mode='territory', help=f'{SW} para salir de tu zona y cerrar áreas. Si una chispa toca tu estela, pierdes. Conquista el 75 %.')),
 'barrel-climb': ('platform', dict(mode='barrels', help='← → moverse, A saltar, ↑ ↓ en las escaleras (atraviesas las vigas desde abajo). Esquiva los barriles y llega a la bandera.')),
 'wing-tap': ('runner', dict(mode='flap', theme='meadow', help='Toca para aletear y pasa entre los troncos. Las monedas suman un punto extra.')),
 # ---------- Puzzle ----------
 '2048-classic': ('g2048', dict()), '2048-hex': ('g2048', dict(hex=True)),
 'jewel-swap': ('match3', dict(mode='moves')), 'jewel-tide': ('match3', dict(mode='time')),
 'nonogram-daily': ('nonogram', dict(size=10, daily=True)), 'pixel-picross-xl': ('nonogram', dict(size=15)),
 'sokoban-warehouse': ('sokoban', dict(mode='push')), 'ice-pusher': ('sokoban', dict(mode='ice')),
 'cut-and-drop': ('rope', dict()),
 'ball-funnel': ('drawphys', dict(mode='funnel', help='Dibuja líneas con el dedo para guiar la bola hasta la copa y pulsa «Soltar». La tinta es limitada.')),
 'plank-bridge': ('drawphys', dict(mode='bridge', help='Dibuja un puente sobre el hueco y pulsa «Soltar» para que la rueda llegue a la bandera. Tinta limitada.')),
 'sudoku-zen': ('logic', dict(mode='sudoku', help='Toca una casilla y elige un número. Cada fila, columna y caja 3×3 lleva del 1 al 9.')),
 'mine-sweep': ('logic', dict(mode='mines', help='Toca para descubrir, mantén pulsado (o modo bandera) para marcar minas. Los números cuentan minas vecinas.')),
 'lights-out': ('logic', dict(mode='lights', help='Cada toque cambia la luz y sus vecinas. Apágalas todas.')),
 'pipe-connect': ('logic', dict(mode='pipes', help='Toca las piezas para girarlas y conecta todas las tuberías con la fuente amarilla.')),
 'slide-15': ('logic', dict(mode='slide', help='Toca o desliza las fichas hacia el hueco para ordenarlas del 1 al 15.')),
 'flow-lines': ('flow', dict()), 'color-sort': ('colorsort', dict()), 'laser-mirrors': ('lasers', dict()), 'tangram-studio': ('poly', dict()),
 # ---------- Plataformas ----------
 'pixel-dash': ('platformer', dict(theme='meadow', spikes=0.2, enemies=0.35, help='← → correr, ↑/A saltar (mantén para saltar más). Pisa a los enemigos, esquiva los pinchos y llega a la bandera.')),
 'wall-jumper': ('platformer', dict(theme='snow', abil=dict(wall=True), spikes=0.08, enemies=0.25, help='← → correr, ↑/A saltar. Salta contra una pared en el aire para rebotar y subir por las chimeneas de hielo.')),
 'spike-run': ('runner', dict(mode='jump', theme='jungle', help='Toca para saltar pinchos, cajas y fosos; mantén para saltar más alto. Cae sobre los slimes para eliminarlos.')),
 'neon-runner': ('runner', dict(mode='double', theme='night', help='Toca para saltar y otra vez en el aire para el doble salto. Pisa a los fantasmas para eliminarlos.')),
 'dungeon-micro': ('topdown', dict(mode='dungeon', help='Muévete con flechas o arrastrando; disparas solo al enemigo más cercano. Limpia la sala, sal por la puerta y elige una mejora. Jefe cada 5 salas.')),
 'crypt-crawler': ('topdown', dict(mode='crypt', help='Muévete y acércate: tu espada golpea sola (o con A). Limpia la sala, sal por la puerta y elige una mejora. Jefe cada 5 salas.')),
 'slime-arena': ('topdown', dict(mode='arena', land=False, help='Arrastra para moverte; disparas solo. Los slimes grandes se dividen. Tras cada oleada eliges una mejora.')),
 'blade-leap': ('platformer', dict(theme='night', abil=dict(sword=True), enemies=0.6, spikes=0.08, help='← → correr, ↑/A saltar, B o toque: espada. Corta a los espectros o salta sobre ellos.')),
 'ninja-ascent': ('platform', dict(mode='ninja', help='Toca para saltar a la pared contraria; toca en el aire para un doble salto que te devuelve a la misma pared. Evita los pinchos y los pájaros.')),
 'rope-swing': ('platformer', dict(theme='sky', abil=dict(swing=True), enemies=0.25, help='Corres solo entre islas flotantes. Mantén pulsado para engancharte a la anilla y suelta para salir disparado.')),
 'gravity-flip': ('runner', dict(mode='gravity', theme='factory', help='Toca para invertir la gravedad (desde el suelo o el techo) y esquiva los pinchos.')),
 'cloud-hopper': ('platform', dict(mode='hopper', bg='#7ec8ff', pal=dict(sky='#7ec8ff', ground='#fff', top='#ffffff', p='#ff5fa2', spike='#f00', enemy='#fa0', coin='#f2d15c'), help='Rebotas solo. Mantén el lado izquierdo o derecho de la pantalla para moverte.')),
 'castle-knight': ('platformer', dict(theme='castle', abil=dict(sword=True), enemies=0.55, spikes=0.06, help='← → andar, ↑/A saltar, B o toque: espada. Cruza el castillo y derrota a los guardias.')),
 'robo-rescue': ('platformer', dict(theme='factory', enemies=0.55, spikes=0.12, help='← → moverse, ↑/A saltar. Pisa a los robots, recoge monedas y llega a la salida de la fábrica.')),
 'shadow-dash': ('platformer', dict(theme='dusk', abil=dict(dash=True), enemies=0.45, spikes=0.1, help='← → correr, ↑/A saltar, B: sprint en sombra (cruza huecos largos y atraviesa enemigos).')),
 'bullet-rain': ('shooter', dict(mode='bullethell', bg='#12061c', help='Mueve la nave con el ratón, el dedo o las flechas. Tu punto de impacto es el centro. Derrota al jefe.')),
 'zombie-siege': ('topdown', dict(mode='zombie', help='Muévete con flechas o arrastrando; disparas solo. Rompe cajas, aguanta las oleadas y elige una mejora tras cada una.')),
 'grapple-hook': ('platformer', dict(theme='jungle', abil=dict(grapple=True), spikes=0.06, enemies=0.3, help='← → moverse, ↑/A saltar. Mantén B (o pulsa la pantalla) cerca de una anilla para colgarte y balancearte.')),
 'lava-escape': ('platform', dict(mode='lava', bg='#2a0f0a', pal=dict(sky='#2a0f0a', ground='#5a2a1a', top='#c9a27a', p='#5ce1e6', spike='#f00', enemy='#fa0', coin='#f2d15c'), help='Toca el lado izquierdo o derecho para saltar hacia ese lado. ¡La lava sube!')),
 'hero-brawl': ('topdown', dict(mode='brawl', help='Muévete y golpea con A o tocando; también golpeas solo al acercarte. Aguanta las oleadas y elige mejoras. Jefe cada 5 oleadas.')),
 # ---------- Estrategia y cartas ----------
 'klondike-solitaire': ('cards', dict(mode='klondike', help='Toca una carta para moverla sola al mejor sitio. Toca el mazo para robar. Sube todo a las bases.')),
 'spider-solitaire': ('cards', dict(mode='spider', help='Spider de 2 palos (♠ ♥). Toca una carta para moverla; las escaleras del mismo palo se mueven juntas. Completa de K a A del mismo palo para retirarla. Toca el mazo para repartir una carta a cada columna.')),
 'freecell': ('cards', dict(mode='freecell', help='Toca una carta para moverla sola: a la base, a otra columna o a una celda libre.')),
 'pyramid-solitaire': ('cards', dict(mode='pyramid', help='Toca dos cartas libres que sumen 13 para retirarlas (la K sola). Toca el mazo para robar.')),
 'tripeaks-solitaire': ('cards', dict(mode='tripeaks', help='Toca cartas libres una por encima o por debajo de la del montón. Encadena rachas.')),
 'mahjong-solitaire': ('mahjong', dict()),
 'tower-guard': ('td', dict(mode='path')), 'maze-defense': ('td', dict(mode='maze')), 'hex-defense': ('td', dict(mode='hex')),
 'micro-tactics': ('tactics', dict()), 'hex-skirmish': ('tactics', dict(hex=True)),
 'checkers': ('board', dict(mode='checkers')), 'reversi': ('board', dict(mode='reversi')),
 'battle-grid': ('battle', dict()), 'dice-poker': ('dice', dict()),
 # ---------- 3D / pseudo-3D ----------
 'low-poly-rally': ('road', dict(mode='race', theme='rally', help='Mantén pulsado para acelerar y arrastra a los lados para girar (o flechas). 3 vueltas contra 6 rivales.')),
 'neon-drift': ('road', dict(mode='race', theme='neon', help='Acelera y gira fuerte para derrapar. Pisa las flechas cian para un turbo. 3 vueltas.')),
 'canyon-kart': ('road', dict(mode='race', theme='canyon', help='↑ acelerar, ← → girar, ↓ frenar. Salirte de la pista frena mucho. Usa los turbos. 3 vueltas.')),
 'mini-golf-3d': ('golf', dict(mode='walls')), 'putt-island': ('golf', dict(mode='island')),
 'iso-maze': ('maze', dict(mode='iso', help='Desliza, arrastra o usa las flechas para moverte. Recoge las 3 llaves y sal por la baldosa verde antes de que se acabe el tiempo.')),
 'crystal-labyrinth': ('raycast', dict()),
 'iso-dungeon-explorer': ('maze', dict(mode='dungeon', iso=['#2b2233', '#b07a55', '#7a4f35', '#5f3c28'], help='Flechas o arrastra para moverte; A o toca para dar un tajo a los monstruos vecinos. Recoge las 3 llaves y sal.')),
 'voxel-runner': ('road', dict(mode='lanes', theme='voxel', help='Desliza a los lados para cambiar de carril y hacia arriba (o toca) para saltar las barras.')),
 'stack-tower-3d': ('stack', dict()), 'marble-roll': ('marble', dict()), 'drone-flight': ('drone', dict()), 'cube-roller': ('cube', dict()),
 'low-poly-skater': ('road', dict(mode='lanes', theme='skate', help='← → cambiar de carril, ↑/A saltar. Las rampas te lanzan por los aires para más puntos.')),
 'planet-hopper': ('planet', dict()),
 # ---------- Deportes ----------
 'penalty-flick': ('penalty', dict()), 'hoop-arc': ('hoop', dict()), 'rhythm-tap': ('rhythm', dict()), 'bowling-flick': ('bowling', dict(hud='bl')),
 'pool-break': ('pool', dict()), 'darts-pro': ('darts', dict()), 'air-hockey': ('paddle', dict(mode='hockey')), 'ping-pong-reflex': ('paddle', dict(mode='pong')),
 'home-run-derby': ('homerun', dict()), 'reflex-grid': ('whack', dict()),
}

TPL = '''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>{title}</title></head>
<body><script>window.CFG={cfg};</script><script src="../_lib/kit.js?v=7"></script>{deps}<script src="../_lib/{eng}.js?v={ev}"></script></body></html>
'''

def main():
    titles = {wx.slugify(it[0]): it[0] for items in wx.CATALOG.values() for it in items}
    missing = [s for s in titles if s not in G and s not in STANDALONE]
    extra = [s for s in G if s not in titles]
    if missing or extra: sys.exit(f'Faltan: {missing}  Sobran: {extra}')
    lib = GAMES_DIR / '_lib'; lib.mkdir(parents=True, exist_ok=True)
    engines = sorted({e for e, _ in G.values()} | {d for e, _ in G.values() for d in deps_of(e)})
    for e in engines: shutil.copy(ENG_DIR / f'{e}.js', lib / f'{e}.js')
    for slug, (eng, cfg) in G.items():
        cfg = dict(cfg); cfg.setdefault('help', ''); cfg['title'] = titles[slug]; cfg['id'] = slug
        d = GAMES_DIR / slug; d.mkdir(parents=True, exist_ok=True)
        (d / 'index.html').write_text(TPL.format(title=titles[slug], cfg=json.dumps(cfg, ensure_ascii=False), eng=eng, ev=hashlib.md5((ENG_DIR / f'{eng}.js').read_bytes()).hexdigest()[:8], deps=''.join(f'<script src="../_lib/{d}.js?v=7"></script>' for d in deps_of(eng))), encoding='utf-8')
    total = len([p for p in GAMES_DIR.iterdir() if (p / 'index.html').exists()])
    print(f'{len(G)} juegos generados + {len(STANDALONE)} independientes = {total} carpetas; {len(engines)} motores')

if __name__ == '__main__': main()
