"""Bot dirigido de Flechas de Baile: se pasa las 20 coreografías en las 3 dificultades.
Pulsa cada flecha en el instante exacto del mapa (window.__da.auto(desfase)) y comprueba
que el nivel se supera, la precisión llega al objetivo de 2 estrellas y salen 3 estrellas.
El reloj de rAF se falsea para que 60 s de canción se jueguen en unos segundos.
Uso: ARCADE_PORT=8905 python3 scripts/dance_bot.py [desfase_s]"""
import os, sys, threading, http.server, functools, json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = Path(__file__).resolve().parent.parent
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
SLUG = 'flechas-de-baile'
PORT = int(os.environ.get('ARCADE_PORT', 8905))
OFF = float(sys.argv[1]) if len(sys.argv) > 1 else 0.0


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()

INIT = """
(() => {
  let ft = performance.now(); const cbs = [];
  window.requestAnimationFrame = (cb) => { cbs.push(cb); return 1; };
  window.__tick = (n, step) => { for (let i = 0; i < n; i++) { ft += step; const l = cbs.splice(0); for (const c of l) c(ft); } return ft; };

})();
"""

rows, bad = [], 0
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for dif in (0, 1, 2):
        pg = br.new_page(viewport={'width': 800, 'height': 450})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        pg.add_init_script(INIT)
        pg.add_init_script(f"""try {{
          localStorage.setItem('dif:{SLUG}', '{dif}');
          for (const s of ['', '@f', '@d']) localStorage.setItem('lv:{SLUG}' + s, '20');
          for (const s of ['', '@f', '@d']) localStorage.removeItem('st:{SLUG}' + s);
        }} catch (e) {{}}""")
        pg.goto(f'http://127.0.0.1:{PORT}/{SLUG}/index.html')
        pg.wait_for_function('window.__da && window.__k && window.__k.levelN() === 20')
        assert pg.evaluate('window.__k.dif') == dif, 'dificultad no aplicada'
        n = pg.evaluate('window.__da.chart ? 1 : 0')
        for lv in range(1, 21):
            pg.evaluate(f'window.__k.goLevel({lv})')
            pg.wait_for_timeout(800)                           # kit bloquea 700 ms tras la tarjeta de fin
            pg.evaluate('window.__tick(10, 16.6667)')          # el motor recarga el nivel
            pg.evaluate(f'window.__da.auto({OFF})')
            pg.evaluate('window.__tick(30, 16.6667)')          # cuenta atrás 3-2-1
            info = None
            for _ in range(90):
                pg.evaluate('window.__tick(120, 16.6667)')      # 2 s de canción por vuelta
                info = pg.evaluate("""({st: window.__k.st, t: window.__da.t, len: window.__da.len,
                    acc: window.__da.acc, bad: window.__da.bad, hp: window.__da.hp, goal: window.__da.goal,
                    stars: window.__k.starsOf(window.__k.lv), h1: (document.querySelector('#ov h1')||{}).textContent||''})""")
                if info['st'] == 'over' and info['t'] > 1:
                    break
            ok = info['st'] == 'over' and ('superado' in info['h1'] or 'completado' in info['h1'])
            if not ok or info['stars'] < 3 or info['acc'] < info['goal']:
                bad += 1
            rows.append(dict(dif=dif, lv=lv, **{kk: info[kk] for kk in ('acc', 'goal', 'bad', 'hp', 'stars', 'h1')}, ok=ok))
            print(f"dif {dif} nivel {lv:2d} {'OK ' if ok else 'MAL'} prec {info['acc']:5.1f}% (obj {info['goal']}) "
                  f"fallos {info['bad']} energia {info['hp']:.0f} estrellas {info['stars']} | {info['h1'][:32]}")
        if errs:
            bad += 1
            print('ERRORES JS:', errs[:3])
        pg.close()
    br.close()
Path(os.environ.get('DANCE_OUT', '/tmp/dance_bot.json')).write_text(json.dumps(rows, ensure_ascii=False))
print('niveles malos:', bad)
sys.exit(1 if bad else 0)
