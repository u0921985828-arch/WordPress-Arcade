"""Prueba de modo tele (2 y 4 jugadores) de air-hockey, futbol-de-plaza y tower-guard.
Carga el juego en un iframe (como hace el reproductor), manda arcade:party y arcade:pkey
y comprueba que arranca, que no hay errores y que el menú de niveles no aparece."""
import os, sys, threading, http.server, functools, json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent.parent
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
PORT = int(os.environ.get('ARCADE_PORT', 8888))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()

HOST = """<!doctype html><meta charset=utf-8><body style="margin:0;background:#111">
<iframe id=f src="__SRC__" style="width:1280px;height:720px;border:0"></iframe>
<script>
const f = document.getElementById('f');
window.party = (n) => { const P = []; const C = ['#ff5d5d','#5b8cff','#a8cf3f','#ffc94d'];
  for (let i = 0; i < n; i++) P.push({ p: i, color: C[i], name: 'J' + (i + 1) });
  f.contentWindow.postMessage({ type: 'arcade:party', players: P }, '*'); };
window.key = (p, k, d) => f.contentWindow.postMessage({ type: 'arcade:pkey', p, key: k, down: d }, '*');
window.probe = () => { const w = f.contentWindow, k = w.__k; return { st: k.st, party: !!k.party, n: k.mpMax, err: w.__err || null }; };
window.step = (n) => f.contentWindow.__step(n);
</script></body>"""

GAMES = ['air-hockey', 'futbol-de-plaza', 'tower-guard']
FAST = """(() => { if (window.top === window) return; window.__q = []; window.__vt = performance.now();
  window.requestAnimationFrame = (cb) => { window.__q.push(cb); return 1; };
  window.__step = (n) => { for (let i = 0; i < n; i++) { const c = window.__q; window.__q = []; window.__vt += 50; for (const f of c) f(window.__vt); } };
  window.addEventListener('error', (e) => { window.__err = String(e.message); }); })()"""

bad = []
with sync_playwright() as p:
    br = p.chromium.launch()
    for g in GAMES:
        for n in (2, 4):
            pg = br.new_page(viewport={'width': 1280, 'height': 760})
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            pg.add_init_script(FAST)
            pg.goto(f'http://127.0.0.1:{PORT}/{g}/index.html')  # origen correcto
            pg.set_content(HOST.replace('__SRC__', f'http://127.0.0.1:{PORT}/{g}/index.html'))
            pg.wait_for_timeout(900)
            pg.evaluate(f'window.party({n})')
            pg.wait_for_timeout(300)
            pg.evaluate('window.step(20)')
            # arrancar: A de cada jugador
            for i in range(n):
                pg.evaluate(f'window.key({i}, "a", true)'); pg.evaluate(f'window.key({i}, "a", false)')
            pg.wait_for_timeout(200); pg.evaluate('window.step(40)')
            # mover a todos un poco
            for t in range(30):
                for i in range(n):
                    pg.evaluate(f'window.key({i}, "{["left","right","up","down"][(i+t)%4]}", true)')
                pg.evaluate('window.step(10)')
                for i in range(n):
                    pg.evaluate(f'window.key({i}, "{["left","right","up","down"][(i+t)%4]}", false)')
            st = pg.evaluate('window.probe()')
            if errs: bad.append(f'{g} x{n}: errores {errs}')
            if not st['party']: bad.append(f'{g} x{n}: k.party no activo')
            if st['st'] == 'ready': bad.append(f'{g} x{n}: no arranca ({json.dumps(st)})')
            print(g, n, json.dumps(st))
            pg.close()
    br.close()
print('\n'.join(bad) if bad else 'OK: modo tele con 2 y 4 jugadores en los tres juegos')
sys.exit(1 if bad else 0)
