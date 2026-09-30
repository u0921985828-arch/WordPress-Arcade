#!/usr/bin/env python3
"""Coste por frame (min/mediana de muestras) de un juego, con rAF instrumentado.

Uso: T7_ROOT=<dir games> python3 scripts/_t7perf.py <slug> <nivel> <ancho> <alto>
Envuelve requestAnimationFrame antes de cargar el juego y mide lo que tarda
cada callback (update + draw). Se queda con el minimo y la mediana: el minimo
es robusto a la contencion de CPU de la maquina.
"""
import os, sys, json, threading, functools, http.server, socketserver, statistics
from playwright.sync_api import sync_playwright

ROOT = os.environ.get('T7_ROOT') or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'wp-content/mu-plugins/arcade-core/games')
PORT = int(os.environ.get('ARCADE_PORT', '8917'))
slug = sys.argv[1]; lv = int(sys.argv[2]); W = int(sys.argv[3]); H = int(sys.argv[4])

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
Handler = functools.partial(Q, directory=ROOT)
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()

INIT = """
window.__fr = [];
(function () {
  const o = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) {
    return o(function (t) { const a = performance.now(); try { cb(t); } finally { window.__fr.push(performance.now() - a); } });
  };
})();
"""

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True)
    pg.add_init_script(INIT)
    pg.goto(f'http://127.0.0.1:{PORT}/{slug}/index.html')
    pg.wait_for_function('window.__k')
    pg.evaluate(f"""() => {{
      try {{ localStorage.setItem('dif:'+CFG.id, '1'); localStorage.setItem('lv:'+CFG.id, '20'); }} catch (e) {{}}
    }}""")
    pg.reload(); pg.wait_for_function('window.__k')
    pg.wait_for_timeout(700)
    pg.evaluate(f"() => {{ if (window.__k.goLevel) window.__k.goLevel({lv}); }}")
    pg.wait_for_timeout(300)
    # arrancar la partida
    try:
        pg.click('[data-m="play"]', timeout=2500)
    except Exception:
        pg.mouse.click(W // 2, H // 2)
    pg.wait_for_timeout(800)
    if not pg.evaluate("() => window.__k.st === 'play'"):
        pg.mouse.click(W // 2, H // 2); pg.wait_for_timeout(600)
    print('  estado:', pg.evaluate('() => window.__k.st'))
    pg.evaluate('window.__fr = []')
    pg.wait_for_timeout(6000)
    fr = pg.evaluate('window.__fr')
    b.close()
srv.shutdown()
fr = [x for x in fr if x > 0]
fr.sort()
n = len(fr)
if n < 10:
    print(f'{slug} lv{lv} {W}x{H}: muestras insuficientes (n={n})')
else:
    lo = statistics.mean(fr[:max(3, n // 10)])
    print(f'{slug} lv{lv} {W}x{H}: n={n} min10%={lo:.2f} ms  mediana={fr[n//2]:.2f} ms  p90={fr[int(n*0.9)]:.2f} ms')
