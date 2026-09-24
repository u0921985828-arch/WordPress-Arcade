#!/usr/bin/env python3
"""
generate_wxr.py — genera arcade_pilot_100.xml (WordPress eXtended RSS 1.2).

Uso:
  python3 generate_wxr.py [--out arcade_pilot_100.xml] [--site-url https://tu-dominio.com]
                          [--base-url /wp-content/uploads/arcade/games] [--author admin]

Requisitos en destino: MU plugin arcade-core.php activo (registra CPT/taxonomías ANTES de importar)
y el plugin oficial "WordPress Importer".
"""
import argparse
from collections import Counter
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from xml.sax.saxutils import escape

GENRES = {
    "arcade": "Arcade",
    "puzzle": "Puzzle",
    "platformer": "Platformer",
    "strategy-cards": "Strategy/Cards",
    "3d-webgl": "3D/WebGL",
    "sports-casual": "Sports/Casual",
}
PROFILES = {
    "touch-only": "Touch only",
    "keyboard-mouse": "Keyboard & mouse",
    "gamepad-ready": "Gamepad ready",
    "hybrid": "Hybrid",
}
STYLES = {"pixel-art", "low-poly", "vector"}
ENGINES = {"canvas", "phaser", "threejs", "godot_web", "construct"}
ORIENT = {"portrait", "landscape", "auto"}
RATIOS = {"16:9", "4:3", "1:1", "fill"}
INPUT_CODES = {"T": "touch", "K": "keyboard", "M": "mouse", "G": "gamepad"}
INPUT_ORDER = ["touch", "keyboard", "mouse", "gamepad"]
INPUT_ES = {"touch": "táctil", "keyboard": "teclado", "mouse": "ratón", "gamepad": "mando"}

# (título, tags [mecánica..., estilo], motor, orientación, aspecto, inputs)
CATALOG = {
    "arcade": [
        ("Serpent Grid", ["snake", "high-score", "pixel-art"], "canvas", "auto", "fill", "TKG"),
        ("Neon Paddle", ["pong", "versus", "vector"], "canvas", "auto", "fill", "TKM"),
        ("Starfall Defender", ["shoot-em-up", "vertical-scroller", "pixel-art"], "phaser", "portrait", "fill", "KG"),
        ("Rock Belt", ["asteroids", "inertia", "vector"], "canvas", "auto", "fill", "KG"),
        ("Maze Muncher", ["maze-chase", "swipe", "pixel-art"], "phaser", "portrait", "1:1", "TKG"),
        ("Tetra Drop", ["falling-blocks", "high-score", "pixel-art"], "canvas", "portrait", "fill", "TKG"),
        ("Tetra Drop Marathon", ["falling-blocks", "endless", "pixel-art"], "canvas", "portrait", "fill", "KG"),
        ("Brick Breaker DX", ["breakout", "power-ups", "vector"], "canvas", "auto", "4:3", "TKM"),
        ("Pixel Invaders", ["fixed-shooter", "waves", "pixel-art"], "phaser", "landscape", "4:3", "KG"),
        ("Frog Crossing", ["lane-crossing", "timing", "pixel-art"], "phaser", "portrait", "1:1", "TKG"),
        ("Missile Guard", ["missile-defense", "aim", "vector"], "canvas", "landscape", "4:3", "TM"),
        ("Bug Garden", ["fixed-shooter", "segments", "pixel-art"], "canvas", "portrait", "4:3", "TKM"),
        ("Lunar Lander", ["physics", "thrust", "vector"], "canvas", "auto", "fill", "KG"),
        ("Tank Duel", ["versus", "top-down", "pixel-art"], "phaser", "landscape", "16:9", "KG"),
        ("Neon Trails", ["light-cycles", "versus", "vector"], "canvas", "landscape", "1:1", "KG"),
        ("Tunnel Digger", ["digging", "maze-chase", "pixel-art"], "phaser", "landscape", "4:3", "KG"),
        ("Cave Flyer", ["side-scroller", "shoot-em-up", "pixel-art"], "phaser", "landscape", "16:9", "KG"),
        ("Territory", ["area-capture", "risk", "vector"], "canvas", "auto", "4:3", "KG"),
        ("Barrel Climb", ["single-screen", "jumping", "pixel-art"], "phaser", "portrait", "4:3", "KG"),
        ("Wing Tap", ["one-tap", "endless", "pixel-art"], "canvas", "portrait", "fill", "TKM"),
    ],
    "puzzle": [
        ("2048 Classic", ["sliding-tiles", "numbers", "vector"], "canvas", "portrait", "1:1", "TK"),
        ("2048 Hex", ["sliding-tiles", "hex-grid", "vector"], "canvas", "portrait", "1:1", "TK"),
        ("Jewel Swap", ["match-3", "combos", "vector"], "phaser", "portrait", "fill", "TM"),
        ("Jewel Tide", ["match-3", "cascade", "vector"], "phaser", "portrait", "fill", "TM"),
        ("Nonogram Daily", ["nonogram", "daily", "pixel-art"], "canvas", "auto", "1:1", "TM"),
        ("Pixel Picross XL", ["nonogram", "large-grid", "pixel-art"], "canvas", "auto", "1:1", "TM"),
        ("Sokoban Warehouse", ["sokoban", "undo", "pixel-art"], "phaser", "auto", "1:1", "TKG"),
        ("Ice Pusher", ["sokoban", "sliding", "pixel-art"], "phaser", "auto", "1:1", "TKG"),
        ("Cut & Drop", ["physics", "rope", "vector"], "phaser", "portrait", "fill", "TM"),
        ("Ball Funnel", ["physics", "drawing", "vector"], "canvas", "portrait", "fill", "TM"),
        ("Plank Bridge", ["physics", "building", "vector"], "construct", "landscape", "16:9", "TM"),
        ("Sudoku Zen", ["sudoku", "numbers", "vector"], "canvas", "portrait", "1:1", "TKM"),
        ("Mine Sweep", ["minesweeper", "deduction", "pixel-art"], "canvas", "auto", "1:1", "TM"),
        ("Lights Out", ["toggle-grid", "logic", "vector"], "canvas", "auto", "1:1", "TM"),
        ("Pipe Connect", ["pipes", "rotation", "vector"], "canvas", "portrait", "1:1", "TM"),
        ("Slide 15", ["sliding-puzzle", "classic", "vector"], "canvas", "auto", "1:1", "TKM"),
        ("Flow Lines", ["path-drawing", "logic", "vector"], "canvas", "portrait", "1:1", "TM"),
        ("Color Sort", ["sorting", "relaxing", "vector"], "construct", "portrait", "fill", "TM"),
        ("Laser Mirrors", ["optics", "rotation", "vector"], "canvas", "auto", "1:1", "TM"),
        ("Tangram Studio", ["tangram", "shapes", "vector"], "canvas", "auto", "1:1", "TM"),
    ],
    "platformer": [
        ("Pixel Dash", ["precision-platformer", "speedrun", "pixel-art"], "phaser", "landscape", "16:9", "KG"),
        ("Wall Jumper", ["precision-platformer", "wall-jump", "pixel-art"], "phaser", "landscape", "16:9", "KG"),
        ("Spike Run", ["auto-runner", "one-button", "pixel-art"], "canvas", "landscape", "16:9", "TK"),
        ("Neon Runner", ["endless-runner", "one-button", "vector"], "canvas", "landscape", "16:9", "TK"),
        ("Dungeon Micro", ["roguelite", "top-down", "pixel-art"], "phaser", "landscape", "16:9", "KG"),
        ("Crypt Crawler", ["roguelite", "top-down", "pixel-art"], "phaser", "landscape", "4:3", "KG"),
        ("Slime Arena", ["arena", "top-down", "pixel-art"], "phaser", "auto", "1:1", "TKG"),
        ("Blade Leap", ["jump-and-slash", "combos", "pixel-art"], "phaser", "landscape", "16:9", "KG"),
        ("Ninja Ascent", ["vertical-platformer", "one-button", "pixel-art"], "construct", "portrait", "fill", "TK"),
        ("Rope Swing", ["swing", "physics", "vector"], "canvas", "landscape", "16:9", "TM"),
        ("Gravity Flip", ["gravity", "one-button", "vector"], "canvas", "landscape", "16:9", "TK"),
        ("Cloud Hopper", ["vertical-platformer", "endless", "vector"], "canvas", "portrait", "fill", "TK"),
        ("Castle Knight", ["platformer", "exploration", "pixel-art"], "godot_web", "landscape", "16:9", "KG"),
        ("Robo Rescue", ["platformer", "collectibles", "pixel-art"], "godot_web", "landscape", "16:9", "KG"),
        ("Shadow Dash", ["stealth", "platformer", "pixel-art"], "phaser", "landscape", "16:9", "KG"),
        ("Bullet Rain", ["bullet-hell", "dodge", "vector"], "canvas", "portrait", "fill", "KMG"),
        ("Zombie Siege", ["top-down-shooter", "waves", "pixel-art"], "phaser", "landscape", "16:9", "KMG"),
        ("Grapple Hook", ["grappling", "momentum", "pixel-art"], "phaser", "landscape", "16:9", "KMG"),
        ("Lava Escape", ["rising-hazard", "vertical-platformer", "pixel-art"], "construct", "portrait", "fill", "TK"),
        ("Hero Brawl", ["beat-em-up", "combos", "pixel-art"], "phaser", "landscape", "16:9", "KG"),
    ],
    "strategy-cards": [
        ("Klondike Solitaire", ["solitaire", "cards", "vector"], "canvas", "auto", "4:3", "TM"),
        ("Spider Solitaire", ["solitaire", "cards", "vector"], "canvas", "auto", "4:3", "TM"),
        ("FreeCell", ["solitaire", "cards", "vector"], "canvas", "auto", "4:3", "TM"),
        ("Pyramid Solitaire", ["solitaire", "cards", "vector"], "canvas", "auto", "4:3", "TM"),
        ("TriPeaks Solitaire", ["solitaire", "cards", "vector"], "canvas", "auto", "4:3", "TM"),
        ("Mahjong Solitaire", ["tile-matching", "tabletop", "vector"], "canvas", "landscape", "4:3", "TM"),
        ("Tower Guard", ["tower-defense", "waves", "pixel-art"], "phaser", "auto", "fill", "TM"),
        ("Maze Defense", ["tower-defense", "maze-building", "vector"], "phaser", "auto", "fill", "TM"),
        ("Hex Defense", ["tower-defense", "hex-grid", "vector"], "phaser", "auto", "fill", "TM"),
        ("Micro Tactics", ["turn-based", "tactics", "pixel-art"], "phaser", "auto", "fill", "TKM"),
        ("Hex Skirmish", ["turn-based", "hex-grid", "pixel-art"], "godot_web", "auto", "fill", "TM"),
        ("Checkers", ["board-game", "versus-ai", "vector"], "canvas", "auto", "1:1", "TM"),
        ("Reversi", ["board-game", "versus-ai", "vector"], "canvas", "auto", "1:1", "TM"),
        ("Battle Grid", ["naval", "board-game", "vector"], "canvas", "auto", "1:1", "TM"),
        ("Dice Poker", ["dice", "tabletop", "vector"], "canvas", "portrait", "fill", "TM"),
    ],
    "3d-webgl": [
        ("Low-Poly Rally", ["racing", "time-trial", "low-poly"], "threejs", "landscape", "16:9", "TKG"),
        ("Neon Drift", ["racing", "drift", "low-poly"], "threejs", "landscape", "16:9", "TKG"),
        ("Canyon Kart", ["kart-racing", "items", "low-poly"], "godot_web", "landscape", "16:9", "KG"),
        ("Mini Golf 3D", ["mini-golf", "physics", "low-poly"], "threejs", "auto", "16:9", "TM"),
        ("Putt Island", ["mini-golf", "physics", "low-poly"], "threejs", "auto", "16:9", "TM"),
        ("Iso Maze", ["isometric", "maze", "pixel-art"], "phaser", "auto", "1:1", "TKG"),
        ("Crystal Labyrinth", ["isometric", "maze", "low-poly"], "threejs", "auto", "1:1", "TKG"),
        ("Iso Dungeon Explorer", ["isometric", "exploration", "pixel-art"], "godot_web", "landscape", "16:9", "KG"),
        ("Voxel Runner", ["endless-runner", "voxel", "low-poly"], "threejs", "portrait", "fill", "TK"),
        ("Stack Tower 3D", ["stacking", "one-tap", "low-poly"], "threejs", "portrait", "fill", "TKM"),
        ("Marble Roll", ["marble", "balance", "low-poly"], "threejs", "auto", "16:9", "TKG"),
        ("Drone Flight", ["flight", "checkpoints", "low-poly"], "threejs", "landscape", "16:9", "KG"),
        ("Cube Roller", ["rolling-cube", "logic", "low-poly"], "threejs", "auto", "1:1", "TK"),
        ("Low-Poly Skater", ["skateboarding", "tricks", "low-poly"], "godot_web", "landscape", "16:9", "KG"),
        ("Planet Hopper", ["gravity", "exploration", "low-poly"], "threejs", "landscape", "16:9", "TK"),
    ],
    "sports-casual": [
        ("Penalty Flick", ["football", "flick", "low-poly"], "threejs", "portrait", "fill", "T"),
        ("Hoop Arc", ["basketball", "arc", "vector"], "canvas", "portrait", "fill", "TM"),
        ("Rhythm Tap", ["rhythm", "music", "vector"], "canvas", "portrait", "fill", "TK"),
        ("Bowling Flick", ["bowling", "flick", "low-poly"], "threejs", "portrait", "fill", "T"),
        ("Pool Break", ["billiards", "aim", "vector"], "canvas", "landscape", "16:9", "TM"),
        ("Darts Pro", ["darts", "flick", "vector"], "canvas", "portrait", "1:1", "T"),
        ("Air Hockey", ["air-hockey", "versus-ai", "vector"], "canvas", "portrait", "fill", "TM"),
        ("Ping Pong Reflex", ["table-tennis", "reflex", "vector"], "canvas", "portrait", "fill", "TM"),
        ("Home Run Derby", ["baseball", "timing", "pixel-art"], "phaser", "landscape", "16:9", "TK"),
        ("Reflex Grid", ["reflex", "whack", "vector"], "construct", "portrait", "1:1", "TM"),
    ],
}
EXPECTED = {"arcade": 20, "puzzle": 20, "platformer": 20, "strategy-cards": 15, "3d-webgl": 15, "sports-casual": 10}


def slugify(s):
    out, prev = [], False
    for ch in s.lower().replace("&", "and"):
        if ch.isalnum():
            out.append(ch); prev = False
        elif not prev:
            out.append("-"); prev = True
    return "".join(out).strip("-")


def cdata(s):
    return "<![CDATA[" + str(s).replace("]]>", "]]]]><![CDATA[>") + "]]>"


def profiles_for(inputs):
    s = set(inputs)
    if s == {"touch"}:
        return ["touch-only"]
    res = []
    if "touch" in s:
        res.append("hybrid")
    elif s & {"keyboard", "mouse"}:
        res.append("keyboard-mouse")
    if "gamepad" in s:
        res.append("gamepad-ready")
    return res or ["touch-only"]


def validate():
    seen = set()
    for g, games in CATALOG.items():
        assert len(games) == EXPECTED[g], f"{g}: {len(games)} != {EXPECTED[g]}"
        for title, tags, eng, ori, ar, inp in games:
            slug = slugify(title)
            assert slug not in seen, f"slug duplicado: {slug}"
            seen.add(slug)
            assert eng in ENGINES and ori in ORIENT and ar in RATIOS, title
            assert STYLES & set(tags), f"{title}: falta estilo gráfico"
            assert inp and set(inp) <= set(INPUT_CODES), title
    assert len(seen) == 100


def build(args):
    validate()
    site = args.site_url.rstrip("/")
    base = args.base_url.rstrip("/")
    now = datetime.now(timezone.utc)
    start = datetime(2026, 9, 1, 9, 0, tzinfo=timezone.utc)

    items, all_tags, term_id = [], set(), 1
    for g, games in CATALOG.items():
        for title, tags, eng, ori, ar, inp in games:
            all_tags.update(tags)
            inputs = [x for x in INPUT_ORDER if x in {INPUT_CODES[c] for c in inp}]
            items.append(dict(title=title, slug=slugify(title), genre=g, tags=tags, engine=eng,
                              orientation=ori, aspect=ar, inputs=inputs, profiles=profiles_for(inputs)))

    L = []
    w = L.append
    w('<?xml version="1.0" encoding="UTF-8" ?>')
    w("<!-- WordPress eXtended RSS 1.2 — Arcade pilot (100 games). Importar en Herramientas > Importar > WordPress. -->")
    w('<rss version="2.0" xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/" '
      'xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" '
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:wp="http://wordpress.org/export/1.2/">')
    w("<channel>")
    w("\t<title>Arcade Portal</title>")
    w(f"\t<link>{escape(site)}</link>")
    w("\t<description>Pilot catalog: 100 HTML5 games</description>")
    w(f"\t<pubDate>{format_datetime(now)}</pubDate>")
    w("\t<language>es-ES</language>")
    w("\t<wp:wxr_version>1.2</wp:wxr_version>")
    w(f"\t<wp:base_site_url>{escape(site)}</wp:base_site_url>")
    w(f"\t<wp:base_blog_url>{escape(site)}</wp:base_blog_url>")
    w(f"\t<wp:author><wp:author_id>1</wp:author_id><wp:author_login>{cdata(args.author)}</wp:author_login>"
      f"<wp:author_email>{cdata('admin@example.com')}</wp:author_email><wp:author_display_name>{cdata(args.author)}</wp:author_display_name>"
      f"<wp:author_first_name>{cdata('')}</wp:author_first_name><wp:author_last_name>{cdata('')}</wp:author_last_name></wp:author>")

    def term(tax, slug, name):
        nonlocal term_id
        w(f"\t<wp:term><wp:term_id>{term_id}</wp:term_id><wp:term_taxonomy>{tax}</wp:term_taxonomy>"
          f"<wp:term_slug>{cdata(slug)}</wp:term_slug><wp:term_parent>{cdata('')}</wp:term_parent>"
          f"<wp:term_name>{cdata(name)}</wp:term_name></wp:term>")
        term_id += 1

    for slug, name in GENRES.items():
        term("game_genre", slug, name)
    for slug, name in PROFILES.items():
        term("control_profile", slug, name)
    for t in sorted(all_tags):
        term("game_tag", t, t)

    for i, it in enumerate(items):
        pid = 1001 + i
        d = start + timedelta(minutes=30 * i)
        local = d.strftime("%Y-%m-%d %H:%M:%S")
        link = f"{site}/game/{it['slug']}/"
        inputs_es = ", ".join(INPUT_ES[x] for x in it["inputs"])
        excerpt = f"{it['title']}: juego {GENRES[it['genre']]} para navegador. Controles: {inputs_es}."
        content = (f"<!-- wp:paragraph -->\n<p><strong>{escape(it['title'])}</strong> es un juego "
                   f"{escape(GENRES[it['genre']])} HTML5 ({escape(', '.join(it['tags'][:-1]))}) que funciona en móvil y escritorio.</p>\n"
                   f"<!-- /wp:paragraph -->\n\n<!-- wp:paragraph -->\n<p>Controles: {escape(inputs_es)}. "
                   f"Orientación recomendada: {escape(it['orientation'])}.</p>\n<!-- /wp:paragraph -->")
        meta = {
            "_game_embed_url": f"{base}/{it['slug']}/index.html",
            "_game_orientation": it["orientation"],
            "_game_aspect_ratio": it["aspect"],
            "_game_tech_engine": it["engine"],
            "_game_input_methods": ",".join(it["inputs"]),
        }
        w("\t<item>")
        w(f"\t\t<title>{cdata(it['title'])}</title>")
        w(f"\t\t<link>{escape(link)}</link>")
        w(f"\t\t<pubDate>{format_datetime(d)}</pubDate>")
        w(f"\t\t<dc:creator>{cdata(args.author)}</dc:creator>")
        w(f'\t\t<guid isPermaLink="false">{escape(site)}/?post_type=game&amp;p={pid}</guid>')
        w("\t\t<description></description>")
        w(f"\t\t<content:encoded>{cdata(content)}</content:encoded>")
        w(f"\t\t<excerpt:encoded>{cdata(excerpt)}</excerpt:encoded>")
        w(f"\t\t<wp:post_id>{pid}</wp:post_id>")
        w(f"\t\t<wp:post_date>{cdata(local)}</wp:post_date>")
        w(f"\t\t<wp:post_date_gmt>{cdata(local)}</wp:post_date_gmt>")
        w(f"\t\t<wp:post_modified>{cdata(local)}</wp:post_modified>")
        w(f"\t\t<wp:post_modified_gmt>{cdata(local)}</wp:post_modified_gmt>")
        w(f"\t\t<wp:comment_status>{cdata('closed')}</wp:comment_status>")
        w(f"\t\t<wp:ping_status>{cdata('closed')}</wp:ping_status>")
        w(f"\t\t<wp:post_name>{cdata(it['slug'])}</wp:post_name>")
        w(f"\t\t<wp:status>{cdata('publish')}</wp:status>")
        w("\t\t<wp:post_parent>0</wp:post_parent>")
        w("\t\t<wp:menu_order>0</wp:menu_order>")
        w(f"\t\t<wp:post_type>{cdata('game')}</wp:post_type>")
        w(f"\t\t<wp:post_password>{cdata('')}</wp:post_password>")
        w("\t\t<wp:is_sticky>0</wp:is_sticky>")
        w(f'\t\t<category domain="game_genre" nicename="{it["genre"]}">{cdata(GENRES[it["genre"]])}</category>')
        for p in it["profiles"]:
            w(f'\t\t<category domain="control_profile" nicename="{p}">{cdata(PROFILES[p])}</category>')
        for t in it["tags"]:
            w(f'\t\t<category domain="game_tag" nicename="{escape(t)}">{cdata(t)}</category>')
        for k, v in meta.items():
            w(f"\t\t<wp:postmeta><wp:meta_key>{cdata(k)}</wp:meta_key><wp:meta_value>{cdata(v)}</wp:meta_value></wp:postmeta>")
        w("\t</item>")

    w("</channel>")
    w("</rss>")
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")

    c = Counter(it["genre"] for it in items)
    print(f"OK → {args.out}: {len(items)} juegos, {term_id - 1} términos")
    for g in GENRES:
        print(f"  {GENRES[g]:<15} {c[g]}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Genera WXR 1.2 con 100 juegos piloto.")
    ap.add_argument("--out", default="arcade_pilot_100.xml")
    ap.add_argument("--site-url", default="https://example.com")
    ap.add_argument("--base-url", default="/wp-content/uploads/arcade/games")
    ap.add_argument("--author", default="admin")
    build(ap.parse_args())
