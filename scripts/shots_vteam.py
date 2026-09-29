"""Capturas de air-hockey, futbol-de-plaza y tower-guard en 390x844 y 800x450."""
import os, sys, threading, http.server, functools
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = Path(__file__).resolve().parent.parent
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
OUT = Path(os.environ.get('SHOT_DIR', '/tmp/shots-vteam')); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get('ARCADE_PORT', 8888))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
FAST = """(() => { window.__q = []; window.__vt = performance.now();
  window.requestAnimationFrame = (cb) => { window.__q.push(cb); return 1; };
  window.__step = (n) => { for (let i = 0; i < n; i++) { const c = window.__q; window.__q = []; window.__vt += 50; for (const f of c) f(window.__vt); } }; })()"""
SZ = [(390, 844), (800, 450)]
with sync_playwright() as p:
    br = p.chromium.launch()
    for g in ['air-hockey', 'futbol-de-plaza', 'tower-guard']:
        for w, h in SZ:
            pg = br.new_page(viewport={'width': w, 'height': h})
            pg.add_init_script(FAST)
            pg.goto(f'http://127.0.0.1:{PORT}/{g}/index.html'); pg.wait_for_timeout(700)
            pg.evaluate('window.__step(4)')
            pg.screenshot(path=str(OUT / f'{g}-{w}x{h}-menu.png'))
            pg.evaluate("window.__k.hit.add('a')"); pg.evaluate('window.__step(160)')
            pg.screenshot(path=str(OUT / f'{g}-{w}x{h}-juego.png'))
            pg.close()
    br.close()
print('capturas en', OUT)
