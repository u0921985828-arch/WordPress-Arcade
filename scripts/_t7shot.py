# Capturas de la tanda 7 (2048-classic y sokoban-warehouse) en 390x844 y 800x450:
# menú de niveles, partida en varios retos y pantalla de fin.
import os, sys, threading, http.server, functools, json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = Path(__file__).resolve().parent.parent
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
PORT = int(os.environ.get('ARCADE_PORT', 8952))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = f'http://127.0.0.1:{PORT}'
OUT = Path(os.environ.get('T7_SHOTS', '/tmp/t7shots')); OUT.mkdir(exist_ok=True, parents=True)
SIZES = [(390, 844), (800, 450)]
LVS = [int(x) for x in os.environ.get('LVS', '1,8,13,20').split(',')]
routes = {}
rp = os.environ.get('SOK_JSON', '')
if rp and Path(rp).exists(): routes = json.loads(Path(rp).read_text())
rep = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    for g in ['sokoban-warehouse', '2048-classic']:
        for w, h in SIZES:
            for lv in LVS:
                pg = b.new_page(viewport={'width': w, 'height': h})
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
                pg.add_init_script(f"try{{localStorage.setItem('lv:{g}','20');}}catch(e){{}}")
                pg.goto(f'{U}/{g}/index.html')
                pg.wait_for_function('!!(window.__k && window.__k.goLevel)', timeout=20000)
                if lv == LVS[0]: pg.screenshot(path=str(OUT / f'{g}-{w}x{h}-menu.png'))
                pg.evaluate(f"()=>window.__k.goLevel({lv})")
                pg.wait_for_timeout(900)
                pg.screenshot(path=str(OUT / f'{g}-{w}x{h}-lv{lv}-inicio.png'))
                if g == 'sokoban-warehouse':
                    r = (routes.get(str(lv)) or {}).get('pathG') or []
                    pg.evaluate("""(r)=>{let i=0;const step=()=>{if(i<r.length-4&&Math.abs(pr[0]-pl[0])+Math.abs(pr[1]-pl[1])<0.06)move(r[i++]);requestAnimationFrame(step);};requestAnimationFrame(step);}""", r)
                    pg.wait_for_timeout(2600)
                    pg.screenshot(path=str(OUT / f'{g}-{w}x{h}-lv{lv}-partida.png'))
                    pg.evaluate("""(r)=>{let i=0;const step=()=>{if(i<r.length&&Math.abs(pr[0]-pl[0])+Math.abs(pr[1]-pl[1])<0.06)move(r[i++]);requestAnimationFrame(step);};requestAnimationFrame(step);}""", r[-6:])
                    pg.wait_for_timeout(3000)
                else:
                    for i in range(90):
                        pg.keyboard.press(['ArrowDown', 'ArrowLeft', 'ArrowDown', 'ArrowRight'][i % 4]); pg.wait_for_timeout(28)
                    pg.screenshot(path=str(OUT / f'{g}-{w}x{h}-lv{lv}-partida.png'))
                    for i in range(420):
                        pg.keyboard.press(['ArrowDown', 'ArrowLeft', 'ArrowDown', 'ArrowRight'][i % 4]); pg.wait_for_timeout(12)
                pg.wait_for_timeout(1200)
                pg.screenshot(path=str(OUT / f'{g}-{w}x{h}-lv{lv}-fin.png'))
                rep[f'{g}/{w}x{h}/lv{lv}'] = errs
                pg.close()
    b.close()
print(json.dumps({k: v for k, v in rep.items() if v}, ensure_ascii=False))
print('capturas en', OUT)
