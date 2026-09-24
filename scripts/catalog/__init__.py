"""Catálogo ampliado (PLAN-400): cada archivo scripts/catalog/o<ola>_<motor>.py define GAMES = [dict(...)].

Campos de cada juego:
  title   'Sumo de Cojines'            (slug ASCII automático: sumo-de-cojines)
  genre   arcade|puzzle|platformer|strategy-cards|3d-webgl|sports-casual|party|racing|trivia
  tags    ['sumo', 'versus', 'vector']  (mecánicas + estilo: vector|pixel-art|low-poly; 'multijugador'/'modo-tele' se añaden solos)
  orient  portrait|landscape|auto       aspect  16:9|4:3|1:1|fill      inputs 'TKG' (T táctil, K teclado, M ratón, G mando)
  engine  nombre de src/eng/<engine>.js cfg     dict para window.CFG (help obligatorio, mode, reglas…)
  pad     dict del mando virtual (como PAD de build_games.py) o None
  mp      (mín, máx) jugadores en la tele o None
  desc    lista de 2–4 párrafos propios (≥150 palabras en total, sin frases plantilla)
  tips    lista de 2–3 consejos
  players texto para la ficha: '1–4 jugadores'
"""
import importlib, pkgutil
from pathlib import Path

ENG = Path(__file__).resolve().parent.parent.parent / 'src/eng'
GENRES = {'arcade', 'puzzle', 'platformer', 'strategy-cards', '3d-webgl', 'sports-casual', 'party', 'racing', 'trivia'}


def load():
    out = []
    for m in sorted(pkgutil.iter_modules([str(Path(__file__).parent)]), key=lambda m: m.name):
        try:
            mod = importlib.import_module(f'catalog.{m.name}')
        except Exception as e:  # un archivo a medias de otro agente no rompe el build de los demás
            print(f'AVISO catalog/{m.name}.py no carga: {e!r}'); continue
        wave = int(m.name[1]) if m.name[:1] == 'o' and m.name[1:2].isdigit() else 0
        for g in getattr(mod, 'GAMES', []):
            if not (ENG / f"{g.get('engine')}.js").exists():
                print(f"AVISO {g.get('title')}: falta src/eng/{g.get('engine')}.js (se omite)"); continue
            g = dict(g); g.setdefault('wave', wave); g['_file'] = m.name
            out.append(g)
    return out


def check(games, old_slugs, slugify):
    seen = set(old_slugs)
    for g in games:
        t = g['title']; s = slugify(t)
        assert s not in seen, f'slug duplicado: {s}'
        seen.add(s)
        assert g['genre'] in GENRES, f'{t}: género {g["genre"]}'
        assert g['orient'] in ('portrait', 'landscape', 'auto') and g['aspect'] in ('16:9', '4:3', '1:1', 'fill'), t
        assert g['inputs'] and set(g['inputs']) <= set('TKMG'), t
        assert {'vector', 'pixel-art', 'low-poly'} & set(g['tags']), f'{t}: falta estilo'
        assert g['cfg'].get('help'), f'{t}: falta help'
        words = len(' '.join(g.get('desc', [])).split())
        assert words >= 150, f'{t}: descripción de {words} palabras (< 150)'
        if g.get('mp'): assert g.get('pad'), f'{t}: multijugador sin pad'
    return seen
