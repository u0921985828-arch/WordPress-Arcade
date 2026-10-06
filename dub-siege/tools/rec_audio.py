#!/usr/bin/env python3
"""Graba la banda sonora y los efectos de dub-siege.html para la version de Godot.

Abre el juego en Chromium (Playwright) con #debug, evalua tools/rec_audio.js dentro del
cierre del juego y renderiza cada pieza con un OfflineAudioContext que imita el reloj en
vivo. Escribe en godot/audio/:

  m{i}_C.ogg   calma (32 compases: la melodia de la calma va una vuelta si y otra no)
  m{i}_P1/2/3.ogg  juego a intensidad 1/2/3 (forma completa x2 = 64 compases), misma longitud
  m{i}_X.ogg   jefe (16 compases)
  beats.json   tempo, compas y longitud exacta de cada fichero
  sfx/<nombre>.wav  los 26 efectos

Uso:  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/rec_audio.py [--songs 0,1] [--only C,P1,X,sfx] [--jobs 4] [--q 0.06]
"""
import argparse, json, os, shutil, sys, threading, tempfile, time
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'godot', 'audio')
SR = 44100
SFX = ['shoot', 'shootS', 'shootL', 'shootH', 'hit', 'blip', 'clink', 'kill', 'jump', 'jump2', 'dash', 'land', 'hurt',
       'coin', 'pick', 'power', 'cp', 'box', 'siren', 'boom', 'drop', 'tele', 'horn', 'laser', 'bass', 'buy', 'no']
# compases del bucle y de calentamiento por grupo
LOOP = {'C': 32, 'P': 64, 'X': 16}
PRE = 4
RAW = tempfile.mkdtemp(prefix='dsrec_')


class H(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        q = parse_qs(urlparse(self.path).query)
        name = os.path.basename(q['name'][0])
        n = int(self.headers['Content-Length'])
        data = self.rfile.read(n)
        with open(os.path.join(RAW, name + '.f32'), 'wb') as f:
            f.write(data)
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.send_header('Content-Length', '2')
        self.end_headers()
        self.wfile.write(b'ok')


def load(name):
    p = os.path.join(RAW, name + '.f32')
    x = np.fromfile(p, dtype=np.float32).reshape(-1, 2)
    os.remove(p)
    return x


def stats(x):
    peak = float(np.max(np.abs(x))) if len(x) else 0.0
    sec = x[: len(x) // SR * SR].reshape(-1, SR, 2) if len(x) >= SR else x[None]
    rms = np.sqrt(np.mean(sec.astype(np.float64) ** 2, axis=(1, 2)))
    db = lambda v: 20 * np.log10(max(v, 1e-9))
    return {'peak_db': round(float(db(peak)), 2), 'rms_db': round(float(db(float(np.sqrt(np.mean(x.astype(np.float64) ** 2))))), 2),
            'rms_min_db': round(float(db(float(rms.min()))), 2), 'rms_max_db': round(float(db(float(rms.max()))), 2)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--songs', default='0-11')
    ap.add_argument('--only', default='C,P1,P2,P3,X,sfx')
    ap.add_argument('--jobs', type=int, default=4)
    ap.add_argument('--q', type=float, default=0.06, help='calidad Vorbis (-0.1..1; 0.2 ~ oggenc -q2; 0.06 ~ 60 kb/s, cabe en 45 MB)')
    a = ap.parse_args()
    if '-' in a.songs:
        lo, hi = a.songs.split('-'); songs = list(range(int(lo), int(hi) + 1))
    else:
        songs = [int(s) for s in a.songs.split(',')]
    only = a.only.split(',')
    os.makedirs(os.path.join(OUT, 'sfx'), exist_ok=True)

    srv = ThreadingHTTPServer(('127.0.0.1', 0), partial(H, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = 'http://127.0.0.1:%d/dub-siege.html#debug' % srv.server_address[1]
    js = open(os.path.join(ROOT, 'tools', 'rec_audio.js'), encoding='utf-8').read()

    tasks = []
    for i in songs:
        for k in only:
            if k == 'sfx':
                continue
            G, I = k[0], int(k[1:] or 0)
            tasks.append(('m%d_%s' % (i, k), i, G, I, LOOP[G], PRE))
    bpath = os.path.join(OUT, 'beats.json')
    beats = json.load(open(bpath)) if os.path.exists(bpath) else {'sr': SR, 'songs': {}}
    report = []
    lock = threading.Lock()

    from playwright.sync_api import sync_playwright

    def worker(wid, queue):
        with sync_playwright() as pw:
            br = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
            pg = br.new_page()
            pg.goto(url)
            pg.wait_for_function('!!(window.DS && window.DS.ev)', timeout=60000)
            pg.evaluate('c => DS.ev(c)', js)
            while True:
                with lock:
                    if not queue:
                        break
                    t = queue.pop(0)
                t0 = time.time()
                if t[0] == 'sfx':
                    r = pg.evaluate('a => REC.effect(a[0], a[1], a[2])', ['sfx_' + t[1], t[1], 3.0])
                    x = load('sfx_' + t[1])
                    post_sfx(t[1], x, report)
                else:
                    name, i, G, I, loop, pre = t
                    r = pg.evaluate('a => REC.music.apply(null, a)', [name, i, G, I, loop, pre])
                    x = seam(load(name), r['n'], r['xf'])
                    assert len(x) == r['n'], (name, len(x), r)
                    write_ogg(os.path.join(OUT, name + '.ogg'), x, a.q)
                    st = stats(x)
                    with lock:
                        s = beats['songs'].setdefault(str(i), {})
                        s.update({'bpm': r['bpm'], 'step': 60.0 / r['bpm'] / 4, 'bar': r['bar']})
                        s.setdefault('files', {})[name.split('_')[1]] = {
                            'samples': r['n'], 'sec': r['n'] / SR, 'bars': loop}
                        report.append(dict(name=name, late=r['late'], sec=round(r['n'] / SR, 2),
                                           kb=os.path.getsize(os.path.join(OUT, name + '.ogg')) // 1024, **st))
                print('%-10s %6.1fs  (%s)' % (t[0] if t[0] != 'sfx' else 'sfx ' + t[1], time.time() - t0, 'w%d' % wid), flush=True)
            br.close()

    queue = list(tasks) + ([('sfx', k) for k in SFX] if 'sfx' in only else [])
    ths = [threading.Thread(target=worker, args=(w, queue)) for w in range(max(1, a.jobs))]
    for th in ths:
        th.start()
    for th in ths:
        th.join()
    srv.shutdown()
    shutil.rmtree(RAW, ignore_errors=True)
    beats['sr'] = SR
    with open(bpath, 'w') as f:
        json.dump(beats, f, indent=1, sort_keys=True)
    rpath = os.path.join(ROOT, 'tools', 'rec_audio.report.json')
    old = {r['name']: r for r in json.load(open(rpath))} if os.path.exists(rpath) else {}
    old.update({r['name']: r for r in report})
    report = sorted(old.values(), key=lambda r: r['name'])
    with open(rpath, 'w') as f:
        json.dump(report, f, indent=1)
    for r in report:
        print(r)


def seam(x, n, xf):
    # Costura del bucle: las primeras xf muestras pasan de lo que de verdad sigue al final del
    # bucle (la continuacion grabada) a su propio principio, asi no hay salto de fase en las
    # voces que suenan a traves del limite (bajo, pad, osciladores que no se reinician).
    y = x[:n].copy()
    w = np.linspace(0.0, 1.0, xf, dtype=np.float32)[:, None]
    y[:xf] = x[n:n + xf] * (1 - w) + y[:xf] * w
    return y


def write_ogg(path, x, q):
    # por tandas: libsndfile 1.2 revienta si se le da un bloque Vorbis muy grande de una vez
    with sf.SoundFile(path, 'w', SR, 2, format='OGG', subtype='VORBIS',
                      compression_level=max(0.0, min(1.0, 1.0 - q))) as f:
        for i in range(0, len(x), 32768):
            f.write(x[i:i + 32768])


def post_sfx(k, x, report):
    # recorta el silencio final (60 dB bajo el pico) y deja 15 ms con fundido
    m = np.max(np.abs(x), axis=1)
    idx = np.nonzero(m > max(float(m.max()) * 10 ** (-60 / 20), 1e-6))[0]
    end = int(idx[-1]) + 1 if len(idx) else 1
    tail = int(0.015 * SR)
    y = x[: min(len(x), end + tail)].copy()
    f = min(tail, len(y))
    y[-f:] *= np.linspace(1, 0, f, dtype=np.float32)[:, None]
    sf.write(os.path.join(OUT, 'sfx', k + '.wav'), y, SR, subtype='PCM_16')
    report.append(dict(name='sfx/' + k, sec=round(len(y) / SR, 3), **stats(y)))


if __name__ == '__main__':
    main()
