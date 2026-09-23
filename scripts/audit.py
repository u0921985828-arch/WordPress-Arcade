import sys, threading, http.server, functools, io, json, random
from pathlib import Path
BASE = Path(__file__).resolve().parent.parent
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageStat
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
slugs = sorted(p.name for p in ROOT.iterdir() if (p / 'index.html').exists())
i, n = map(int, sys.argv[1].split('/')); slugs = slugs[i::n]; PORT = 8850 + i
if len(sys.argv) > 2: slugs = sys.argv[2:]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
def diff(a, b): return sum(ImageStat.Stat(ImageChops.difference(a, b)).mean)
res = {}
with sync_playwright() as p:
    br = p.chromium.launch()
    for s in slugs:
        pg = br.new_page(viewport={'width': 420, 'height': 640}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        pg.goto(f'http://127.0.0.1:{PORT}/{s}/index.html'); pg.wait_for_timeout(400)
        shot = lambda: Image.open(io.BytesIO(pg.screenshot())).convert('RGB')
        st = lambda: pg.evaluate('window.__k ? window.__k.st : "n/a"')
        pg.mouse.click(210, 320); pg.wait_for_timeout(150)
        s0 = st(); a = shot(); pg.wait_for_timeout(2300); s1 = st(); b = shot()
        random.seed(1)
        for j in range(14):
            r = j % 4
            if r == 0: pg.keyboard.press(random.choice(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyX']))
            elif r == 1: pg.mouse.click(random.randint(40, 380), random.randint(120, 600))
            elif r == 2:
                x, y = random.randint(80, 340), random.randint(200, 500); pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + random.choice([-90, 90, 0]), y + random.choice([-90, 90, 0]), steps=5); pg.mouse.up()
            else:
                pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(200); pg.keyboard.up('ArrowRight')
            pg.wait_for_timeout(120)
        pg.wait_for_timeout(400); s2 = st(); c = shot()
        res[s] = dict(start=s0, idle=s1, after=s2, anim=round(diff(a, b), 2), react=round(diff(b, c), 2), err=errs[:2])
        pg.close()
    br.close()
BASE / f'audit_{PORT}.json'.write_text(json.dumps(res, ensure_ascii=False))
print('ok', len(res))
