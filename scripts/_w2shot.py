# Capturas 390x844 y 800x450 + prueba de tele 2 y 4 jugadores.
import os, sys, json, threading, http.server, functools
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = Path(__file__).resolve().parent.parent
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
PORT = int(os.environ.get('ARCADE_PORT', 8951))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = f'http://127.0.0.1:{PORT}'
OUT = BASE / 'shots'; OUT.mkdir(exist_ok=True)
GAMES = ['patata-explosiva', 'petardo-plaza', 'gladiadores-de-juguete']
SIZES = [(390, 844), (800, 450)]
rep = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    for g in GAMES:
        for w, h in SIZES:
            for lv in (1, 10, 20):
                pg = b.new_page(viewport={'width': w, 'height': h})
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
                pg.add_init_script(f"try{{localStorage.setItem('lv:{g}','20');}}catch(e){{}}")
                pg.goto(f'{U}/{g}/index.html')
                pg.wait_for_function('!!(window.__k && window.__k.goLevel)', timeout=15000)
                pg.screenshot(path=str(OUT / f'{g}-{w}x{h}-menu.png'))
                pg.evaluate(f"()=>window.__k.goLevel({lv})")
                pg.wait_for_timeout(2500)
                pg.screenshot(path=str(OUT / f'{g}-{w}x{h}-lv{lv}.png'))
                rep[f'{g}/{w}x{h}/lv{lv}'] = errs
                pg.close()
        # tele 2 y 4
        for n in (2, 4):
            pg = b.new_page(viewport={'width': 1280, 'height': 720})
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            pg.goto(f'{U}/_w2harness.html?g={g}&n={n}')
            pg.wait_for_function('!!window.READY', timeout=15000)
            pg.wait_for_timeout(1200)
            st = pg.evaluate("()=>{const w=document.getElementById('f').contentWindow;return {party:!!(w.__k&&w.__k.party),n:w.__k&&w.__k.party?w.__k.party.length:0,st:w.__k&&w.__k.st};}")
            for i in range(160):
                p = i % n
                pg.evaluate(f"()=>{{PKEY({p},'a',true);}}")
                pg.wait_for_timeout(40)
                pg.evaluate(f"()=>{{PKEY({p},'a',false);PKEY({p},'{['up','down','left','right'][i%4]}',true);}}")
                pg.wait_for_timeout(60)
                pg.evaluate(f"()=>{{PKEY({p},'{['up','down','left','right'][i%4]}',false);}}")
            pg.screenshot(path=str(OUT / f'{g}-tele{n}.png'))
            st2 = pg.evaluate("()=>{const w=document.getElementById('f').contentWindow;return {st:w.__k.st,cm:typeof w.CM!=='undefined'?w.CM:null};}")
            rep[f'{g}/tele{n}'] = {'errs': errs, 'ini': st, 'fin': st2}
            pg.close()
    b.close()
print(json.dumps(rep, ensure_ascii=False, indent=1))
