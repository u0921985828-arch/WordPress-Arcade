import os, sys, threading, http.server, functools, io
from pathlib import Path
BASE = Path(__file__).resolve().parent.parent
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
slugs = sorted(p.name for p in ROOT.iterdir() if (p / 'index.html').exists())
if len(sys.argv) > 2: slugs = sys.argv[2:]
i, n = map(int, sys.argv[1].split('/')); slugs = slugs[i::n]; PORT = 8800 + i
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
PORT = int(os.environ.get('ARCADE_PORT', PORT))
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch()
    for s in slugs:
        pg = b.new_page(viewport={'width': 480, 'height': 480})
        pg.goto(f'http://127.0.0.1:{PORT}/{s}/index.html'); pg.wait_for_timeout(300)
        wh = pg.evaluate("(()=>{const c=document.querySelector('canvas');return [c.width,c.height]})()")
        W = 480; H = max(360, round(480 * wh[1] / wh[0]))
        pg.set_viewport_size({'width': W, 'height': H})
        pg.add_style_tag(content='#ov,#hud,#msg,#sub{display:none!important}')
        pg.wait_for_timeout(700)
        im = Image.open(io.BytesIO(pg.screenshot())).convert('RGB')
        top = (im.height - 360) // 2 if wh[1] > wh[0] * 0.8 else (im.height - 360) // 2
        im = im.crop((0, top, 480, top + 360)).resize((400, 300), Image.LANCZOS)
        im.save(ROOT / s / 'thumb.webp', 'WEBP', quality=72)
        pg.close()
    b.close()
print('ok', len(slugs))
