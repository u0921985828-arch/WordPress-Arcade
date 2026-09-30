# Bot dirigido de la tanda 7: campañas de pixel-invaders y starfall-defender.
# Reloj virtual (rAF + performance.now sustituidos) para pasar 20 niveles x 3 dificultades sin
# esperar en tiempo real. La IA sólo usa k.ptr, igual que un dedo.
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

CLOCK = """
(() => {
  let vt = 0; let RA = [];
  performance.now = () => vt;
  window.requestAnimationFrame = (cb) => { RA.push(cb); return RA.length; };
  window.cancelAnimationFrame = () => {};
  window.__STEP = (n) => { for (let i = 0; i < n; i++) { vt += 16.6667; const q = RA; RA = [];
    if (window.__AI) { try { window.__AI(); } catch (e) { window.__AIERR = String(e); } }
    for (const cb of q) { try { cb(vt); } catch (e) { window.__AIERR = 'frame:' + e; } } } };
})();
"""

PI = """
window.__res = null;
const NOP = () => {};
k.sfx = NOP; k.burst = NOP; k.float = NOP; k.confetti = NOP; k.shake = NOP; k.flash = NOP;
k.reward = NOP; k.combo = NOP; k.chime = NOP; k.punch = NOP; k.hitstop = NOP; k.chainReset = NOP;
const ol = k.lose, od = k.levelDone;
k.lose = (...a) => { window.__res = { win: false, lv: wave, ola: piPh + 1, olas: piNP, t: +lvT.toFixed(1), why: a[2] }; return ol.apply(k, a); };
k.levelDone = (s, e, o) => { window.__res = { win: true, stars: o && o.stars, t: +lvT.toFixed(1), tgt, ufo: piUfoGot, ufoN: piUfoN, hurt: piHurt, score: s }; return od.apply(k, [s, e, o]); };
let pfox = 0, fvx = 0;
window.__AI = () => {
  if (k.st !== 'play') { k.ptr.down = true; k.ptr.x = W / 2; k.ptr.y = H; return; }
  fvx = fvx * 0.7 + ((fox - pfox) * 60) * 0.3; pfox = fox;
  const py = p.y;
  /* --- amenazas: coste de estar en la x dada --- */
  const danger = (x) => {
    let d = 0;
    for (const e of eb) {
      if (e.dead) continue;
      const dy = py - e.y; if (dy < -16) continue;
      const tt = e.vy > 0.1 ? dy / e.vy : (dy < 26 ? 0 : 99); if (tt > 1.8) continue;
      const ix = e.x + (e.vx || 0) * tt, wd = e.bomb ? 32 : 19, gap = Math.abs(ix - x);
      if (gap < wd) d += (e.bomb ? 7 : 12) * (1 - gap / wd) * (1 - tt / 2.2);
    }
    for (const r of rocks) { const gap = Math.abs(r.x - x); if (gap < 32) d += (r.w > 0 ? 3 : 10) * (1 - gap / 32); }
    for (const bm of beams) { const gap = Math.abs(bm.x - x); if (gap < 26) d += 22 * (1 - gap / 26); }
    for (const f of foes) {
      if (f.dead) continue;
      if (f.dive && f.y > py - 170) { const gap = Math.abs(f.x - x); if (gap < 30) d += 9 * (1 - gap / 30); }
      if (f.chg > 0) { const gap = Math.abs(f.ax - x); if (gap < 22) d += 7 * (1 - gap / 22); }
    }
    return d;
  };
  /* --- objetivos con adelanto: donde hay que estar para que la bala acierte --- */
  const shdc = []; for (const f of foes) if (f.shd && !f.dive && !f.dead) shdc.push(f.gx);
  const tg = [];
  const lead = (fx, fy, vx) => { const tof = Math.max(0.02, (py - 16 - fy) / 560); return fx + vx * tof; };
  for (const f of foes) {
    if (f.dead) continue;
    if (f.boss) { if (f.y > 24) tg.push({ x: lead(f.x, f.y, (f.px == null ? 0 : (f.x - f.px) * 60)), w: 8 }); f.px = f.x; continue; }
    if (!f.shd && shdc.length && shdc.indexOf(f.gx) >= 0) continue;
    const vx = f.dive ? (f.px == null ? 0 : (f.x - f.px) * 60) : fvx; f.px = f.x;
    tg.push({ x: lead(f.x, f.y, vx), w: f.shd ? 6 : f.dive ? 5 : (f.gun || f.min) ? 4 : f.spl ? 3 : 1.4 });
  }
  if (ufo) tg.push({ x: lead(ufo.x, ufo.y, ufo.vx), w: 15 });
  for (const e of eb) if (e.bomb && !e.dead && e.y < H - 150) tg.push({ x: e.x, w: 2 });
  /* nuestras propias balas rompen el búnker: desde debajo de uno no se dispara */
  const bset = [];
  for (const b of bunkers) if (!b.dead) bset.push(b.x);
  const blocked = (x) => { for (let i = 0; i < bset.length; i++) if (Math.abs(bset[i] - x) < 5) return true; return false; };
  let best = p.x, bv = -1e9, bt = 0;
  for (let x = 16; x <= W - 16; x += 3) {
    const bl = blocked(x);
    let v = -danger(x) * 3.2, tw = 0;
    if (!bl) for (const q of tg) { const gap = Math.abs(q.x - x); if (gap < 9) { const s2 = q.w * (1 - gap / 9) * 3.4; v += s2; if (s2 > tw) tw = s2; } }
    else v -= 1.2;
    v -= Math.abs(x - p.x) * 0.012;
    if (v > bv) { bv = v; best = x; bt = tw; }
  }
  k.ptr.x = best; k.ptr.y = H;
  /* movimiento a velocidad completa con la cruceta; el disparo, en cuanto haya línea limpia */
  k.held.delete('left'); k.held.delete('right');
  if (best < p.x - 2) k.held.add('left'); else if (best > p.x + 2) k.held.add('right');
  let aim = false;
  if (!blocked(p.x)) for (const q of tg) if (Math.abs(q.x - p.x) < 6) { aim = true; break; }
  k.ptr.down = aim || (bt > 0 && Math.abs(best - p.x) < 7);
};
"""
SD = """
window.__res = null;
const NOP = () => {};
k.sfx = NOP; k.burst = NOP; k.float = NOP; k.confetti = NOP; k.shake = NOP; k.flash = NOP;
k.reward = NOP; k.combo = NOP; k.chime = NOP; k.punch = NOP; k.hitstop = NOP; k.chainReset = NOP;
const ol = k.lose, od = k.levelDone;
k.lose = (...a) => { window.__res = { win: false, lv: wave, t: +wt.toFixed(1), score: Math.floor(score), why: a[2] }; return ol.apply(k, a); };
k.levelDone = (s, e, o) => { window.__res = { win: true, stars: o && o.stars, t: +wt.toFixed(1), score: s, obj: objPt, cap: capGot, capN, lost: sdLost }; return od.apply(k, [s, e, o]); };
window.__AI = () => {
  if (k.st !== 'play') { k.ptr.down = true; k.ptr.x = W / 2; k.ptr.y = H - 50 + 70; return; }
  k.ptr.down = true;
  const cand = [];
  for (let x = 18; x <= W - 18; x += 9) for (let y = H * 0.45; y <= H - 32; y += 13) cand.push([x, y]);
  let bx = p.x, by = p.y, bv = -1e9;
  const lance = [], beams2 = [];
  for (const f of foes) if (f.mv === 'rayo' && !f.dead) { if (f.beam > 0) beams2.push(f); else if (f.chg > 0) lance.push(f); }
  for (const cc of cand) {
    const x = cc[0], y = cc[1];
    let d = 0;
    for (const e of eb) {
      if (e.dead) continue;
      const rx = e.x - x, ry = e.y - y, vv = e.vx * e.vx + e.vy * e.vy;
      let tt = vv > 1 ? -(rx * e.vx + ry * e.vy) / vv : 0;
      tt = tt < 0 ? 0 : tt > 1.1 ? 1.1 : tt;
      const dd = Math.hypot(rx + e.vx * tt, ry + e.vy * tt), wd = e.mine ? 34 : 30;
      if (dd < wd) d += 11 * (1 - dd / wd) * (1 - tt / 1.6);
    }
    for (const f of foes) {
      if (f.dead || f.dly > 0) continue;
      const dd = Math.hypot(f.x - x, f.y - y), rr = f.r + 26;
      if (dd < rr) d += (f.tough ? 16 : 9) * (1 - dd / rr);
      if (f.mv === 'kami') { const px2 = f.x + (f.kx || 0) * 120, py2 = f.y + (f.ky || 0) * 120; if (Math.hypot(px2 - x, py2 - y) < 40) d += 7; }
    }
    for (const f of beams2) if (Math.abs(f.x - x) < 16 && y > f.y) d += 40;
    for (const f of lance) if (Math.abs(f.x - x) < 18 && y > f.y) d += 14 * (1 - f.chg / 1.25);
    let v = -d * 3.4;
    for (const f of foes) {
      if (f.dead || f.dly > 0 || f.binv > 0) continue;
      const gap = Math.abs(f.x - x);
      if (f.y < y - 20 && gap < f.r + 6) {
        const pr = f.boss ? 9 : f.mv === 'rayo' ? 8 : f.mv === 'esc' ? 6 : f.tough ? 5 : f.core ? 4.5 : f.big ? 5 : 2.4;
        v += pr * (1 - gap / (f.r + 6)) * 2.4;
      }
    }
    for (const u of pups) { if (u.dead) continue; const tt = Math.max(0, (y - u.y) / 90), dd = Math.hypot(u.x - x, u.y + 90 * tt - y); if (dd < 90) v += (u.t === 'C' ? 12 : 5) * (1 - dd / 90); }
    v += (y - H * 0.45) * 0.004;
    v -= Math.hypot(x - p.x, y - p.y) * 0.010;
    if (v > bv) { bv = v; bx = x; by = y; }
  }
  k.ptr.x = bx; k.ptr.y = by + 70;
};
"""
BOT = {'pixel-invaders': PI, 'starfall-defender': SD}
LVN = 20
LV0 = int(os.environ.get('LV0', 1)); LV1 = int(os.environ.get('LV1', LVN))
DIFS = [int(x) for x in os.environ.get('DIFS', '0,1,2').split(',')]
MAXF = int(os.environ.get('MAXF', 9000))
games = sys.argv[1:] or list(BOT)
OUT = Path(os.environ.get('OUTF', BASE / 't7bot.json'))
out = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--mute-audio'])
    for g in games:
        out[g] = {}
        for dif in DIFS:
            res = []
            for lv in range(LV0, LV1 + 1):
                pg = b.new_page(viewport={'width': 260, 'height': 300})
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
                pg.add_init_script(f"""try{{localStorage.setItem('dif:{g}','{dif}');localStorage.setItem('lv:{g}','{LVN}');}}catch(e){{}}""")
                pg.add_init_script(CLOCK)
                pg.goto(f'{U}/{g}/index.html')
                pg.wait_for_function('!!(window.__k && window.__k.goLevel)', timeout=20000)
                pg.evaluate("(s)=>{const k=window.__k; eval(s);}", BOT[g])
                pg.evaluate(f"()=>{{window.__k.goLevel({lv});}}")
                r = None
                for _ in range(MAXF // 400 + 1):
                    pg.evaluate("()=>window.__STEP(400)")
                    r = pg.evaluate('window.__res')
                    if r: break
                if not r: r = {'win': None, 'timeout': True}
                r['lv'] = lv
                ae = pg.evaluate('window.__AIERR || null')
                if ae: r['aierr'] = ae
                if errs: r['err'] = errs[:2]
                res.append(r)
                pg.close()
                out[g][dif] = res
                OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))
                print(f'  lv{lv} dif{dif} {"OK" if r.get("win") else "FALLA"} st={r.get("stars")} t={r.get("t")} sc={r.get("score")}', flush=True)
            out[g][dif] = res
            ok = sum(1 for x in res if x.get('win'))
            st2 = sum(1 for x in res if (x.get('stars') or 0) >= 2)
            print(f'{g} dif{dif}: {ok}/{len(res)} superados · {st2}/{len(res)} con 2★+', flush=True)
            for x in res:
                if not x.get('win') or (x.get('stars') or 0) < 2: print('   ', x, flush=True)
            OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    b.close()
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))
