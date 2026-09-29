"""Bot dirigido de futbol-de-plaza en el navegador: juega los 20 desafíos en las 3 dificultades
con la IA del propio motor pilotando al jugador (window.__fb.auto) y comprueba que se ganan y
que el objetivo de 2 estrellas es alcanzable. Acelera el tiempo sustituyendo rAF."""
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

FAST = """(() => { window.__q = []; window.__vt = performance.now();
  window.requestAnimationFrame = (cb) => { window.__q.push(cb); return 1; };
  window.__step = (n) => { for (let i = 0; i < n; i++) { const c = window.__q; window.__q = []; window.__vt += 50; for (const f of c) f(window.__vt); } }; })()"""

DIFS = [int(a) for a in sys.argv[1:] if a.isdigit()] or [0, 1, 2]
bad = []
with sync_playwright() as p:
    br = p.chromium.launch()
    for dif in DIFS:
        pg = br.new_page(viewport={'width': 800, 'height': 450})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        pg.add_init_script(f"try{{localStorage.setItem('dif:futbol-de-plaza','{dif}')}}catch(e){{}}")
        pg.add_init_script(FAST)
        pg.goto(f'http://127.0.0.1:{PORT}/futbol-de-plaza/index.html'); pg.wait_for_timeout(500)
        for lv in range(1, 21):
            pg.evaluate(f'window.__k.goLevel({lv}); window.__fb.auto(true)')
            st = None
            for _ in range(80):
                pg.evaluate('window.__step(100)')
                st = pg.evaluate('window.__fb.now()')
                if st['st'] == 'over':
                    break
            if st['st'] != 'over':
                bad.append(f"dif{dif} reto{lv}: no termina ({json.dumps(st)})")
            elif st['score'][0] <= st['score'][1]:
                bad.append(f"dif{dif} reto{lv}: NO se gana {st['score'][0]}-{st['score'][1]}")
            elif st['stars'] < 2:
                bad.append(f"dif{dif} reto{lv}: solo {st['stars']}* ({st['score'][0]}-{st['score'][1]}, 2*=+{st['s2']})")
            else:
                print(f'dif{dif} reto{lv}: {st["stars"]}* {st["score"][0]}-{st["score"][1]} (2*=+{st["s2"]})', flush=True)
        if errs: bad.append(f'dif{dif} errores JS: {errs[:2]}')
        pg.close()
    br.close()
print('\n'.join(bad) if bad else 'OK: los 20 retos se ganan en las 3 dificultades con 2* o mas')
sys.exit(1 if bad else 0)
