"""Bot dirigido de las dos campañas de la tanda «mesa» (docs/VARA.md).

  python3 scripts/mesa_play.py pri   → balon-prisionero, los 20 desafíos × 3 dificultades
  python3 scripts/mesa_play.py par   → parchis-de-la-plaza, los 20 retos × 3 dificultades

En prisionero el humano lo pilota la IA del propio motor (window.__pb.auto(true)), así que el
bot juega como un rival del mismo nivel: si con eso se gana, un humano también.
En parchís el bot elige con la IA de reglas a nivel máximo (window.__pc.auto()).
"""
import os, sys, threading, http.server, functools, json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent.parent
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
PORT = int(os.environ.get('ARCADE_PORT', 8921))


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()

WHICH = sys.argv[1] if len(sys.argv) > 1 else 'pri'
SLUG = 'balon-prisionero' if WHICH == 'pri' else 'parchis-de-la-plaza'
LVS = [int(x) for x in sys.argv[2:]] or list(range(1, 21))


def start(pg, lv, dif, now):
    """Entra en el nivel y espera a que arranque de verdad (tras levelDone hay 700 ms de bloqueo)."""
    pg.evaluate(f'__k.setDif({dif}, true)')
    for _ in range(40):
        pg.evaluate(f'__k.goLevel({lv})')
        pg.wait_for_timeout(120)
        st = pg.evaluate(now)
        if st['st'] == 'play' and st['lv'] == lv:
            return True
    return False


def run_pri(pg, lv, dif):
    pg.evaluate('__pb.auto(true)')
    if not start(pg, lv, dif, '__pb.now()'):
        return dict(pg.evaluate('__pb.now()'), st='no-arranca')
    for _ in range(260):  # ~130 s de reloj interno como mucho
        st = pg.evaluate('__pb.now()')
        if st['st'] == 'over':
            return st
        pg.evaluate('__k.st === "ready" && __k.goLevel(__k.lv)')
        pg.wait_for_timeout(500)
    return dict(pg.evaluate('__pb.now()'), st='timeout')


def run_par(pg, lv, dif):
    if not start(pg, lv, dif, '__pc.now()'):
        return dict(pg.evaluate('__pc.now()'), st='no-arranca')
    for _ in range(2000):
        st = pg.evaluate('__pc.now()')
        if st['st'] == 'over':
            return st
        pg.evaluate('__pc.auto()')
        pg.wait_for_timeout(70)
    return dict(pg.evaluate('__pc.now()'), st='timeout')


def sweep(dif, out):
    from playwright.sync_api import sync_playwright as sp
    with sp() as pw:
        b = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        pg.goto(f'http://127.0.0.1:{PORT}/{SLUG}/index.html')
        pg.wait_for_timeout(600)
        pg.evaluate('__k.setDif(%d, true)' % dif)
        for lv in LVS:
            st = {'stars': 0}
            for intento in range(4):  # un jugador reintenta: nos quedamos con la mejor pasada
                try:
                    r = run_pri(pg, lv, dif) if WHICH == 'pri' else run_par(pg, lv, dif)
                except Exception as e:
                    r = {'st': 'error', 'err': str(e)[:120], 'stars': 0}
                if r.get('stars', 0) > st.get('stars', 0):
                    st = r
                if st.get('stars', 0) >= 2:
                    break
            out.append((dif, lv, st))
            print(f'dif{dif} lv{lv:2d} *{st.get("stars", 0)} {"OK " if st.get("stars",0)>=1 else "FALLA"} {st}', flush=True)
        if errs:
            print('ERRORES JS dif%d:' % dif, errs[:4], flush=True)
            out.append((dif, 'js', {'stars': 0, 'st': errs[0]}))
        b.close()


res = []
ths = [threading.Thread(target=sweep, args=(d, res)) for d in (0, 1, 2)]
for t in ths:
    t.start()
for t in ths:
    t.join()

bad = [(d, l, st.get('stars', 0)) for d, l, st in res if st.get('stars', 0) < 2]
print('\n%d de %d pasadas sin 1*+2*' % (len(bad), len(LVS) * 3))
for x in sorted(bad, key=str):
    print('  ', x)
sys.exit(1 if bad else 0)
