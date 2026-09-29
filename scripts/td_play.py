"""Bot dirigido de tower-guard en el navegador (no en Node): se pasa los 20 mapas en las 3
dificultades construyendo como un jugador sensato (el mismo criterio que TDSIM.plan) y
comprueba que la 2ª estrella es alcanzable. Acelera el tiempo sustituyendo rAF."""
import os, sys, threading, http.server, functools, json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent.parent
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
PORT = int(os.environ.get('ARCADE_PORT', 8887))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()

FAST = """(() => { window.__q = []; window.__vt = performance.now();
  window.requestAnimationFrame = (cb) => { window.__q.push(cb); return 1; };
  window.__step = (n) => { for (let i = 0; i < n; i++) { const c = window.__q; window.__q = []; window.__vt += 50; for (const f of c) f(window.__vt); } }; })()"""

PLAN = """() => { const T = window.__td; if (!T) return 0;
  const cov = (x, y, r) => { let n = 0; for (const P of T.paths()) for (const p of P) { if (T.spc(p[0], p[1]) === 'n') continue; if (Math.hypot(p[0]-x, p[1]-y) <= r) n += T.spc(p[0], p[1]) === '~' ? 0.4 : 1; } return n; };
  const rad = (t, lv, hi) => T.TOWERS[t].r / 40 * (1 + (lv-1)*0.14) * (hi ? 1.25 : 1);
  const dps = (t, lv) => T.TOWERS[t].dmg * (1+(lv-1)*0.65) / (T.TOWERS[t].rate * (1-(lv-1)*0.1)) * (t===1?1.6:t===3?1.9:t===2?0.9:1);
  let built = 0;
  for (let guard = 0; guard < 60; guard++) {
    const g = T.now().gold; let best = null, bs = 0;
    for (let y = 0; y < T.ROWS; y++) for (let x = 0; x < T.COLS; x++) {
      if (!T.free(x, y)) continue; const hi = T.high(x, y);
      for (let t = 0; t < 4; t++) { if (T.TOWERS[t].cost > g) continue;
        const cv = cov(x, y, rad(t, 1, hi)); if (cv < 1.2) continue;
        const sc = dps(t, 1) * Math.min(cv, 9) / T.TOWERS[t].cost;
        if (sc > bs) { bs = sc; best = { k: 'b', x, y, t }; } } }
    for (const q of T.towers()) { if (q.lv >= 3) continue;
      const c = Math.round(T.TOWERS[q.t].cost * 0.7 * q.lv); if (c > g) continue; const hi = T.high(q.x, q.y);
      const sc = (dps(q.t, q.lv+1) - dps(q.t, q.lv)) * Math.min(cov(q.x, q.y, rad(q.t, q.lv+1, hi)), 9) / c * 1.15;
      if (sc > bs) { bs = sc; best = { k: 'u', x: q.x, y: q.y }; } }
    if (!best) break;
    if (best.k === 'b') { T.pickT(best.t); T.build(best.x, best.y); } else T.up(best.x, best.y);
    built++;
  }
  return built; }"""

DIFS = [int(a) for a in sys.argv[1:] if a.isdigit()] or [0, 1, 2]
bad = []
with sync_playwright() as p:
    br = p.chromium.launch()
    for dif in DIFS:
        pg = br.new_page(viewport={'width': 800, 'height': 450})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        pg.add_init_script(f"try{{localStorage.setItem('dif:tower-guard','{dif}')}}catch(e){{}}")
        pg.add_init_script(FAST)
        pg.goto(f'http://127.0.0.1:{PORT}/tower-guard/index.html'); pg.wait_for_timeout(500)
        for lv in range(1, 21):
            pg.evaluate(f'window.__k.goLevel({lv})')
            pg.evaluate('window.__step(4)')
            st = None
            for _ in range(400):
                pg.evaluate(PLAN)
                pg.evaluate('window.__td.start(); window.__step(2); window.__td.start(); window.__step(120)')
                st = pg.evaluate('window.__td.now()')
                if st['st'] == 'over':
                    break
            if st['st'] != 'over' or st['lives'] <= 0:
                bad.append(f"dif{dif} nivel{lv}: NO superado ({json.dumps(st)})")
            elif st['stars'] < 2:
                bad.append(f"dif{dif} nivel{lv}: solo {st['stars']}* (vidas {st['lives']}, 2*={st['s2']}, fugas {st['leaks']})")
            else:
                print(f'dif{dif} nivel{lv}: {st["stars"]}* vidas {st["lives"]}/{st["s2"]} fugas {st["leaks"]}', flush=True)
        if errs: bad.append(f'dif{dif} errores JS: {errs[:2]}')
        pg.close()
    br.close()
print('\n'.join(bad) if bad else 'OK: los 20 mapas se pasan en el navegador en las 3 dificultades con 2* o mas')
sys.exit(1 if bad else 0)
