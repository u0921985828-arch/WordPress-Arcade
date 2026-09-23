import sys, threading, http.server, functools, json
from pathlib import Path
BASE = Path(__file__).resolve().parent.parent
from playwright.sync_api import sync_playwright
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
slugs = sorted(p.name for p in ROOT.iterdir() if (p / 'index.html').exists())
PORT = 8765
if len(sys.argv) > 1 and sys.argv[1].startswith('batch'):
    i, n = map(int, sys.argv[1][5:].split('/')); slugs = slugs[i::n]; PORT = 8765 + i
elif len(sys.argv) > 1: slugs = [s for s in slugs if s in sys.argv[1:]]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
shots = BASE / 'shots'; shots.mkdir(exist_ok=True)
bad = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    for s in slugs:
        pg = b.new_page(viewport={'width': 400, 'height': 700}, has_touch=False)
        errs = []
        pg.on('pageerror', lambda e: errs.append('PE ' + str(e)[:200]))
        pg.on('console', lambda m: errs.append('CE ' + m.text[:200]) if m.type == 'error' else None)
        pg.goto(f'http://127.0.0.1:{PORT}/{s}/index.html'); pg.wait_for_timeout(400)
        pg.mouse.click(200, 350); pg.wait_for_timeout(300)
        for key in ['ArrowLeft', 'ArrowUp', 'Space', 'ArrowRight', 'KeyX', 'ArrowDown']:
            pg.keyboard.down(key); pg.wait_for_timeout(120); pg.keyboard.up(key)
        for (x, y) in [(120, 300), (280, 420), (200, 600), (60, 200), (330, 150)]:
            pg.mouse.click(x, y); pg.wait_for_timeout(90)
        pg.mouse.move(200, 500); pg.mouse.down(); pg.mouse.move(260, 300, steps=8); pg.mouse.up(); pg.wait_for_timeout(200)
        pg.mouse.move(150, 400); pg.mouse.down(); pg.mouse.move(150, 600, steps=6); pg.wait_for_timeout(300); pg.mouse.up()
        pg.wait_for_timeout(1200)
        pg.screenshot(path=str(shots / f'{s}.png'))
        if errs: bad[s] = errs[:4]
        pg.close()
    b.close()
out = json.dumps(bad, indent=1, ensure_ascii=False)
(BASE / f'smoke_{PORT}.json').write_text(out)
print(out); print(f'{len(slugs)} probados, {len(bad)} con errores')
