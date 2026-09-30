# Bot dirigido de serpent-grid: se pasa los 20 tableros a mano en las 3 dificultades y mide
# el tiempo real de juego, las gemas recogidas y las estrellas, para ajustar t2/t3 de snakelv.js.
#
# Juega DENTRO del juego real: lee el estado del motor (snake, foods, keys, gems, door, bugs,
# hunts, frag) y llama a turn() como lo haría un dedo. Elige objetivo por BFS y solo da un paso
# si desde la casilla nueva sigue cabiendo el cuerpo entero (regla clásica de la serpiente).
#
# Uso: ARCADE_PORT=8941 python3 scripts/snake_bot.py [dif...] [--lv N,N]
import os, sys, json, threading, http.server, functools
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent.parent
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
PORT = int(os.environ.get('ARCADE_PORT', 8941))


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = f'http://127.0.0.1:{PORT}'

BRAIN = r"""
window.__BOT = (() => {
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const wrp = (x, y) => [wrapX ? (x + COLS) % COLS : x, wrapY ? (y + ROWS) % ROWS : y];
  const out = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS;
  /* casillas que matan ahora mismo: muro, baldosa hundida, puerta cerrada, cuerpo (sin la cola
     si va a moverse), bichos y cazador, y las casillas donde van a estar en el paso siguiente */
  function blocked(grow, soft) {
    const b = new Set();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (solid(x, y)) b.add(x + ',' + y);
    if (door && !doorOpen) b.add(door.x + ',' + door.y);
    const last = snake.length - 1;
    snake.forEach((s, i) => { if (!(grow === 0 && i === last)) b.add(s.x + ',' + s.y); });
    for (const q of bugs) {
      b.add(q.x + ',' + q.y);
      if (soft) continue;
      const nx = PAX === 0 ? q.x + q.dir : q.x, ny = PAX === 1 ? q.y + q.dir : q.y;
      const [ax, ay] = wrp(nx, ny); if (!out(ax, ay)) b.add(ax + ',' + ay);
    }
    for (const q of hunts) {
      b.add(q.x + ',' + q.y);
      if (soft) continue;
      for (const d of Object.values(D)) { const [ax, ay] = wrp(q.x + d[0], q.y + d[1]); if (!out(ax, ay)) b.add(ax + ',' + ay); }
    }
    return b;
  }
  const nb = (x, y) => {
    const o = [];
    for (const kk in D) { const [ax, ay] = wrp(x + D[kk][0], y + D[kk][1]); if (!out(ax, ay)) o.push([ax, ay, kk]); }
    return o;
  };
  /* distancias desde la cabeza esquivando lo que mata */
  function dist(b) {
    const dd = new Map(), first = new Map(), h = snake[0], q = [[h.x, h.y]];
    dd.set(h.x + ',' + h.y, 0);
    while (q.length) {
      const [x, y] = q.shift(), d0 = dd.get(x + ',' + y);
      for (const [ax, ay, kk] of nb(x, y)) {
        const key = ax + ',' + ay;
        if (dd.has(key) || b.has(key)) continue;
        dd.set(key, d0 + 1);
        first.set(key, d0 === 0 ? kk : first.get(x + ',' + y));
        q.push([ax, ay]);
      }
    }
    return { dd, first };
  }
  /* ¿queda sitio para el cuerpo si damos este paso? (relleno desde la casilla nueva) */
  function room(nx, ny, b) {
    const seen = new Set([nx + ',' + ny]), q = [[nx, ny]];
    let n = 1;
    while (q.length && n < snake.length + 4) {
      const [x, y] = q.shift();
      for (const [ax, ay] of nb(x, y)) {
        const key = ax + ',' + ay;
        if (seen.has(key) || b.has(key)) continue;
        seen.add(key); n++; q.push([ax, ay]);
      }
    }
    return n;
  }
  function targets() {
    const g = LV.go || {}, out2 = [];
    const needEat = g.eat ? eaten < g.eat : false;
    const needLen = g.len ? snake.length + grow < g.len : false;
    const needKeys = g.keys ? keysGot < keysTot : false;
    for (const q of gems) if (!q.got) out2.push({ x: q.x, y: q.y, w: 8 });      /* las gemas dan la 3.ª estrella */
    if (needKeys) for (const q of keys) if (!q.got) out2.push({ x: q.x, y: q.y, w: 0 });
    if (needEat || needLen || !(g.keys || g.len || g.eat)) for (const f of foods) out2.push({ x: f.x, y: f.y, w: f.kind === 'gold' ? -6 : f.kind === 'apple' ? 0 : 2 });
    if (!needEat && !needLen && !needKeys) {
      if (door && doorOpen) out2.push({ x: door.x, y: door.y, w: -40 });
      else for (const f of foods) out2.push({ x: f.x, y: f.y, w: 0 });
    }
    return out2;
  }
  return function think() {
    if (!snake || dying > 0 || doneLv) return null;
    const b = blocked(grow);
    const { dd, first } = dist(b);
    let best = null;
    for (const tg of targets()) {
      const d = dd.get(tg.x + ',' + tg.y);
      if (d == null) continue;
      const s = d + tg.w;
      if (!best || s < best.s) best = { s, dir: first.get(tg.x + ',' + tg.y) };
    }
    const b2 = blocked(grow);
    const opts = [], loose = [];
    for (const [ax, ay, kk] of nb(snake[0].x, snake[0].y)) {
      if (b2.has(ax + ',' + ay)) continue;
      const r = room(ax, ay, b2);
      /* pisar suelo frágil cuesta: cierra salidas para después */
      const fr = frag.some((f) => f.x === ax && f.y === ay && f.st === 0) ? 3 : 0;
      const o = { dir: kk, r, pref: best && best.dir === kk ? 0 : 5, fr };
      loose.push(o);
      if (r >= snake.length + 1) opts.push(o);
    }
    /* si ninguna salida pasa el filtro de sitio, se coge la más ancha en vez de morir de pie;
       y si no queda ninguna libre, se acepta rozar al cazador (solo mata si te toca la cabeza) */
    if (opts.length) { opts.sort((p, q) => (p.pref + p.fr - p.r * 0.02) - (q.pref + q.fr - q.r * 0.02)); return opts[0].dir; }
    if (loose.length) { loose.sort((p, q) => q.r - p.r); return loose[0].dir; }
    const soft = blocked(grow, true);
    const esc = [];
    for (const [ax, ay, kk] of nb(snake[0].x, snake[0].y)) if (!soft.has(ax + ',' + ay)) esc.push({ dir: kk, r: room(ax, ay, soft) });
    if (!esc.length) return null;
    esc.sort((p, q) => q.r - p.r);
    return esc[0].dir;
  };
})();
"""


def run(dif, levels, pw, verbose=True):
    b = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    out = []
    for lv in levels:
        pg = b.new_page(viewport={'width': 800, 'height': 450})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.add_init_script(
            "try{localStorage.setItem('lv:serpent-grid','20');localStorage.setItem('lv:serpent-grid@f','20');"
            "localStorage.setItem('lv:serpent-grid@d','20');localStorage.setItem('dif:serpent-grid','%d');}catch(e){}" % dif)
        pg.goto(f'{U}/serpent-grid/index.html')
        pg.wait_for_function('!!(window.__k && window.__k.goLevel && window.__k.D)', timeout=20000)
        pg.evaluate("(d)=>window.__k.setDif?window.__k.setDif(d):0", dif)
        pg.evaluate(f"()=>window.__k.goLevel({lv})")
        pg.wait_for_function("()=>window.__k.st==='play'", timeout=10000)
        pg.evaluate(BRAIN)
        # El cerebro decide DENTRO de la página, justo antes de cada paso de la serpiente: así el
        # bot no pierde turnos si la máquina va cargada (con el sondeo desde Python se comía
        # movimientos y moría por culpa de la latencia, no del nivel).
        pg.evaluate("""() => {
          window.__stuck = 0;
          const t0 = tick;
          tick = function () { const d = window.__BOT(); if (d) turn(d); else window.__stuck++; return t0.apply(this, arguments); };
        }""")
        res, stuck = None, 0
        for i in range(1200):
            r = pg.evaluate("()=>({st:window.__k.st,done:doneLv,dying:dying,t:t,eaten:eaten,len:snake.length,"
                            "gems:gemsGot,gt:gemsTot,keys:keysGot,kt:keysTot,score:score,clk:clock,cm:clockMax,"
                            "stuck:window.__stuck})")
            stuck = r['stuck']
            if r['done'] or r['st'] == 'over':
                res = r
                break
            pg.wait_for_timeout(120)
        if res is None:
            res = pg.evaluate("()=>({st:window.__k.st,done:doneLv,dying:dying,t:t,eaten:eaten,len:snake.length,"
                              "gems:gemsGot,gt:gemsTot,keys:keysGot,kt:keysTot,score:score,clk:clock,cm:clockMax,"
                              "stuck:window.__stuck})")
        info = pg.evaluate("()=>({l2:lim2(),l3:lim3(),name:LV.name})")
        won = bool(res['done'])
        secs = round(res['t'], 1)
        stars = 3 if won and secs <= info['l3'] and (res['gt'] == 0 or res['gems'] >= res['gt']) else 2 if won and secs <= info['l2'] else 1 if won else 0
        out.append(dict(lv=lv, dif=dif, won=won, secs=secs, l2=info['l2'], l3=info['l3'], stars=stars,
                        gems=f"{res['gems']}/{res['gt']}", eat=res['eaten'], len=res['len'],
                        score=res['score'], stuck=stuck, errs=errs[:2]))
        if verbose:
            print('   ', out[-1], flush=True)
        pg.close()
    b.close()
    return out


if __name__ == '__main__':
    argv = sys.argv[1:]
    levels = list(range(1, 21))
    if '--lv' in argv:
        i = argv.index('--lv')
        levels = [int(x) for x in argv[i + 1].split(',')]
        argv = argv[:i] + argv[i + 2:]
    difs = [int(a) for a in argv if not a.startswith('-')] or [0, 1, 2]
    rep = {}
    with sync_playwright() as pw:
        for d in difs:
            print(f'== dificultad {d} ==', flush=True)
            rep[d] = run(d, levels, pw)
    bad = [r for rs in rep.values() for r in rs if not r['won']]
    print('\nno superados:', len(bad))
    for r in bad:
        print('  ', r)
    print(json.dumps(rep))
