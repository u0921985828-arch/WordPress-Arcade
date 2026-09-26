"""lentes.py — aplica las «lentes de revisión» (docs/REMASTER.md §5) a juegos del portal.

Uso:  python3 scripts/lentes.py <slug> [<slug>…]        (ARCADE_PORT para el puerto)
      LENTES_OUT=/ruta python3 scripts/lentes.py <slug>  (carpeta de salida)

Abre cada juego con Playwright igual que smoke.py / audit.py (servidor estático sobre
games/), captura inicio / partida / fin en 390×844 y 800×450 y aplica seis lentes:

  1 jerarquía de lectura   los actores en movimiento se separan del fondo por VALOR (B/N)
  2 contraste de texto     zonas de texto del HUD con contraste WCAG < 4,5:1
  3 recortes y solapes     texto pegado al borde, DOM fuera de pantalla, choques con
                           los botones de pausa/sonido (#hud de kit.js)
  4 daltonismo             protanopía / deuteranopía / tritanopía: colores que se
                           distinguían por tono y dejan de distinguirse
  5 rendimiento gama baja  fps con CPU ×4 (CDP Emulation.setCPUThrottlingRate)
  6 estabilidad            errores de consola y excepciones no capturadas

Salida: <out>/lentes/<slug>/ con las capturas y sus derivados (B/N, daltonismo) y un
informe.json; por consola, un resumen con el recuento de PASA/FALLA.
Requiere numpy y Pillow (audit.py ya usa Pillow).
"""
import os, sys, io, json, math, functools, http.server, threading
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent.parent
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
OUT = Path(os.environ.get('LENTES_OUT', BASE / 'lentes')) / 'lentes'
PORT = int(os.environ.get('ARCADE_PORT', 8920))
VIEWS = [('390x844', 390, 844), ('800x450', 800, 450)]

# ─── umbrales (calibrados mirando las capturas de pixel-dash, dungeon-micro,
#     klondike-solitaire y slalom-de-banderas; ver comentario de cada lente) ───
L1_DV = 26          # diferencia de valor mínima actor↔fondo (0-255)
L1_MIN = 2          # nº mínimo de actores medibles para dar veredicto
L2_RATIO = 4.5      # contraste WCAG AA para texto normal
L2_GRANDE = 3.0     # AA para texto grande (≥ 24 px de alto)
L3_MARGIN = 4       # px de margen mínimo al borde
L4_DE0, L4_DL0 = 32, 14   # par que en origen se distingue por TONO (ΔE alto, ΔL bajo)
L4_DE1 = 9          # ΔE por debajo del cual se consideran indistinguibles
L5_FPS, L5_SPIKE, L5_SPIKES_OK = 55.0, 32.0, 3   # fps mínimos, pico en ms, picos tolerados

TXT_PROBE = """(function(){window.__txt=[];var P=CanvasRenderingContext2D.prototype;
['fillText','strokeText'].forEach(function(n){var o=P[n];P[n]=function(t){try{
if(!window.__txtOn) return o.apply(this,arguments);
var c=(n==='fillText'?this.fillStyle:this.strokeStyle), m=this.getTransform(), w=0;
if(typeof c==='string'&&String(t).trim()){ try{w=this.measureText(String(t)).width}catch(e){}
window.__txt.push({n:n,t:String(t),x:arguments[1],y:arguments[2],w:w,f:this.font,
al:this.textAlign,bl:this.textBaseline,c:c,m:[m.a,m.b,m.c,m.d,m.e,m.f],cw:this.canvas.width});
if(window.__txt.length>3000)window.__txt.length=0;}}catch(e){}
return o.apply(this,arguments);};});})();"""


FPS_PROBE = """window.__fr=[];(function(){var l=0;function t(){var n=performance.now();
if(l)window.__fr.push(n-l);l=n;requestAnimationFrame(t);}requestAnimationFrame(t);})();"""


# ───────────────────────── color: sRGB, luma, WCAG, Lab ──────────────────────
def lin(a):
    """sRGB 0-1 → lineal."""
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def srgb(a):
    """lineal → sRGB 0-1."""
    a = np.clip(a, 0, 1)
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - 0.055)


def luma(rgb):
    """Valor perceptual 0-255 (Rec.709) — la «captura en blanco y negro» de la lente 1."""
    f = rgb.astype(np.float32)
    return 0.2126 * f[..., 0] + 0.7152 * f[..., 1] + 0.0722 * f[..., 2]


def wcag(c1, c2):
    """Contraste WCAG entre dos colores RGB 0-255."""
    def rl(c):
        c = lin(np.array(c, dtype=np.float32) / 255)
        return float(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])
    a, b = rl(c1), rl(c2)
    if a < b: a, b = b, a
    return (a + 0.05) / (b + 0.05)


def lab(rgb):
    """RGB 0-255 → CIELAB (D65), para ΔE76."""
    c = lin(np.array(rgb, dtype=np.float32) / 255)
    m = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]], np.float32)
    x, y, z = (m @ c) / np.array([.95047, 1.0, 1.08883], np.float32)
    f = lambda t: t ** (1 / 3) if t > .008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return np.array([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], np.float32)


def de(a, b):
    return float(np.linalg.norm(lab(a) - lab(b)))


# matrices estándar (Viénot/Brettel 1999) en RGB lineal
CVD = {
    'protanopia': [[.152286, 1.052583, -.204868], [.114503, .786281, .099216], [-.003882, -.048116, 1.051998]],
    'deuteranopia': [[.367322, .860646, -.227968], [.280085, .672501, .047413], [-.011820, .042940, .968881]],
    'tritanopia': [[1.255528, -.076749, -.178779], [-.078411, .930809, .147602], [.004733, .691367, .303900]],
}


def simular(img, tipo):
    a = lin(np.asarray(img, dtype=np.float32) / 255)
    m = np.array(CVD[tipo], np.float32).T
    return Image.fromarray((srgb(a @ m) * 255).astype(np.uint8))


# ───────────────────────────── utilidades de imagen ──────────────────────────
def grad(g):
    """Magnitud de gradiente aproximada (diferencias adelantadas) de un mapa de luma."""
    gx = np.zeros_like(g); gy = np.zeros_like(g)
    gx[:, :-1] = np.abs(np.diff(g, axis=1))
    gy[:-1, :] = np.abs(np.diff(g, axis=0))
    return gx + gy


def blobs(mask):
    """Agrupa celdas True contiguas (4-vecindad) y devuelve listas de celdas."""
    h, w = mask.shape
    visto = np.zeros_like(mask)
    grupos = []
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or visto[y, x]: continue
            pila, g = [(y, x)], []
            visto[y, x] = True
            while pila:
                cy, cx = pila.pop(); g.append((cy, cx))
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visto[ny, nx]:
                        visto[ny, nx] = True; pila.append((ny, nx))
            grupos.append(g)
    return grupos


def caja(celdas, c):
    ys = [p[0] for p in celdas]; xs = [p[1] for p in celdas]
    return min(xs) * c, min(ys) * c, (max(xs) + 1) * c, (max(ys) + 1) * c


# ────────────────────────────── lente 1: jerarquía ───────────────────────────
def lente_jerarquia(a, b, dest, pref):
    """Los actores (lo que se mueve entre dos frames) deben separarse del fondo por valor.

    Se trabaja sobre la imagen en blanco y negro: se localizan los grupos de celdas con
    movimiento (umbral adaptativo, así funciona también con cámara que hace scroll) y se
    compara la luma del actor con la del anillo de fondo que lo rodea.
    """
    ga, gb = luma(np.asarray(a)), luma(np.asarray(b))
    Image.fromarray(ga.astype(np.uint8)).save(dest / f'{pref}-bn.png')
    C = 8
    h, w = ga.shape
    hy, wx = h // C, w // C
    mov = np.abs(ga - gb)[:hy * C, :wx * C].reshape(hy, C, wx, C).mean(axis=(1, 3))
    # umbral adaptativo: por encima del percentil 92 y de 10 niveles — en juegos con
    # scroll el fondo entero cambia un poco y solo los actores destacan sobre ese fondo.
    thr = max(10.0, float(np.percentile(mov, 92)))
    mask = mov > thr
    peq = hy * wx * 0.12                       # descarta cambios de pantalla completa
    dets = []
    mediaL = ga.reshape(hy, C, wx, C).mean(axis=(1, 3)) if (h % C == 0 and w % C == 0) else \
        ga[:hy * C, :wx * C].reshape(hy, C, wx, C).mean(axis=(1, 3))
    for g in blobs(mask):
        if len(g) < 3 or len(g) > peq: continue
        ys = [p[0] for p in g]; xs = [p[1] for p in g]
        y0, y1, x0, x1 = min(ys), max(ys), min(xs), max(xs)
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        # los actores son compactos: se descartan las franjas del suelo/paralaje que
        # «se mueven» por el scroll de la cámara y ocupan media pantalla
        if bw > wx * 0.45 or bh > hy * 0.45 or len(g) / (bw * bh) < 0.35: continue
        act = float(np.mean([mediaL[y, x] for y, x in g]))
        # anillo de fondo: celdas alrededor de la caja que no son actor
        anillo = []
        for y in range(y0 - 2, y1 + 3):
            for x in range(x0 - 2, x1 + 3):
                if 0 <= y < hy and 0 <= x < wx and not mask[y, x] and not (y0 <= y <= y1 and x0 <= x <= x1):
                    anillo.append(mediaL[y, x])
        if len(anillo) < 6: continue
        dv = abs(act - float(np.mean(anillo)))
        cj = caja(g, C)
        dets.append(dict(caja=[int(v) for v in cj], dv=round(dv, 1), cel=len(g)))
    # imagen de apoyo: B/N con los actores medidos y su ΔV, para poder mirarla
    vis = Image.fromarray(ga.astype(np.uint8)).convert('RGB')
    dj = ImageDraw.Draw(vis)
    for d in dets:
        dj.rectangle(d['caja'], outline=(255, 60, 60) if d['dv'] < L1_DV else (60, 220, 60))
        dj.text((d['caja'][0], max(0, d['caja'][1] - 10)), str(d['dv']),
                fill=(255, 60, 60) if d['dv'] < L1_DV else (60, 220, 60))
    vis.save(dest / f'{pref}-bn-actores.png')
    if len(dets) < L1_MIN:
        return dict(estado='N/D', nota='no se aislaron actores en movimiento', actores=len(dets))
    # se juzgan los 10 actores más grandes: los trocitos sueltos son ruido del fondo
    dets = sorted(dets, key=lambda d: -d['cel'])[:10]
    fallos = sorted([d for d in dets if d['dv'] < L1_DV], key=lambda d: d['dv'])
    dets.sort(key=lambda d: d['dv'])
    ok = len(fallos) * 2 < len(dets)           # falla si la mayoría de actores se funde con el fondo
    return dict(estado='PASA' if ok else 'FALLA', actores=len(dets),
                dv_min=dets[0]['dv'], dv_mediana=round(float(np.median([d['dv'] for d in dets])), 1),
                flojos=[dict(caja=d['caja'], dv=d['dv']) for d in fallos[:6]])


# ─────────────────────── lente 2: contraste de texto / HUD ───────────────────
def textos(pg, cv):
    """Devuelve los textos realmente dibujados en el último frame, con su caja en px de
    pantalla: los del lienzo (enganchando fillText/strokeText) y los del DOM (overlays de
    kit.js). Es exacto, no adivina: nada de confundir monedas o cartas con letras."""
    datos = pg.evaluate("""() => new Promise(res => requestAnimationFrame(() => {
      window.__txt = []; window.__txtOn = 1;
      requestAnimationFrame(() => {
        window.__txtOn = 0;
        const vis = e => { const s = getComputedStyle(e); return s.display !== 'none' &&
          s.visibility !== 'hidden' && !e.closest('.hide'); };
        const dom = [...document.querySelectorAll('#ov h1, #ov p, #ov .go, #ov .rec')].filter(vis)
          .map(e => { const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
            return {dom: 1, t: (e.textContent || '').trim(),
                    x: b.x, y: b.y, w: b.width, h: b.height, c: cs.color,
                    sel: e.id === 'ov' ? 'ov' : (e.tagName + (e.className ? '.' + e.className : ''))}; });
        res({canvas: window.__txt.slice(), dom, dpr: devicePixelRatio || 1});
      });
    }))""")
    out = []
    for d in datos['dom']:
        if not d['t'] or d['w'] < 4 or d['h'] < 4: continue
        out.append(dict(tipo='dom', texto=d['t'][:40], sel=d['sel'], color=css_rgb(d['c']),
                        caja=[d['x'], d['y'], d['x'] + d['w'], d['y'] + d['h']]))
    if not cv: return out
    ratio = cv['w'] / max(1, datos['canvas'][0]['cw']) if datos['canvas'] else 1
    vistos = set()
    for d in datos['canvas']:
        if d['n'] != 'fillText': continue                  # el strokeText es el contorno
        a, b_, c_, dd, e, f = d['m']
        try: fs = float([w for w in d['f'].replace('px', 'px ').split() if w.endswith('px')][0][:-2])
        except Exception: fs = 14.0
        X = (a * d['x'] + c_ * d['y'] + e) * ratio + cv['x']
        Y = (b_ * d['x'] + dd * d['y'] + f) * ratio + cv['y']
        W = max(4.0, d['w'] * a * ratio); H = max(6.0, fs * dd * ratio)
        al, bl = d['al'], d['bl']
        x0 = X - W / 2 if al == 'center' else (X - W if al in ('right', 'end') else X)
        y0 = {'top': Y, 'hanging': Y, 'middle': Y - H / 2, 'bottom': Y - H,
              'ideographic': Y - H}.get(bl, Y - H * 0.8)
        key = (d['t'][:24], round(x0 / 4), round(y0 / 4))
        if key in vistos: continue
        vistos.add(key)
        out.append(dict(tipo='canvas', texto=d['t'][:40], sel='canvas',
                        color=css_rgb(d['c']), caja=[x0, y0, x0 + W, y0 + H]))
    return out


def css_rgb(c):
    """'#rgb' | '#rrggbb' | 'rgb(a)(…)' → (r, g, b); si no se entiende, None."""
    if not isinstance(c, str): return None
    c = c.strip()
    if c.startswith('#'):
        h = c[1:]
        if len(h) == 3: h = ''.join(x * 2 for x in h)
        if len(h) >= 6:
            try: return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
            except ValueError: return None
        return None
    if c.startswith('rgb'):
        n = [float(v) for v in c[c.index('(') + 1:c.index(')')].replace('/', ' ').replace(',', ' ').split()[:3]]
        return tuple(int(v) for v in n) if len(n) == 3 else None
    return None


def contraste(img, t, vw, vh):
    """Contraste WCAG del texto contra lo que tiene detrás, medido en la captura.

    Los píxeles parecidos al color declarado son el glifo; el resto de la caja (contorno
    incluido, que es lo que de verdad lo separa del fondo) es el fondo."""
    x0, y0, x1, y1 = [int(round(v)) for v in t['caja']]
    x0, y0 = max(0, x0 - 1), max(0, y0 - 1); x1, y1 = min(vw, x1 + 1), min(vh, y1 + 1)
    if x1 - x0 < 3 or y1 - y0 < 3 or not t['color']: return None
    px = np.asarray(img)[y0:y1, x0:x1].reshape(-1, 3).astype(np.float32)
    d = np.linalg.norm(px - np.array(t['color'], np.float32), axis=1)
    glifo = d < 70
    if glifo.sum() < 4 or (~glifo).sum() < 6: return None
    return wcag(t['color'], np.median(px[~glifo], axis=0))


# ─────────────────────── lente 2: contraste de texto / HUD ───────────────────
def lente_texto(img, txts, vw, vh):
    med = []
    for t in txts:
        r = contraste(img, t, vw, vh)
        if r is None: continue
        alto = t['caja'][3] - t['caja'][1]
        med.append(dict(texto=t['texto'], sel=t['sel'], ratio=round(r, 2), alto=round(alto),
                        min=L2_GRANDE if alto >= 24 else L2_RATIO,
                        caja=[round(v) for v in t['caja']]))
    if not med: return dict(estado='N/D', nota='no se midió ningún texto')
    malos = sorted([m for m in med if m['ratio'] < m['min']], key=lambda m: m['ratio'])
    return dict(estado='FALLA' if malos else 'PASA', textos=len(med),
                flojos=len(malos), peores=malos[:6])


# ─────────────────── lente 3: recortes y solapamientos (DOM) ─────────────────
def lente_recortes(txts, cv, hud, vw, vh):
    """Texto pegado al borde o fuera de la pantalla y textos del juego bajo los botones
    de pausa/sonido del reproductor (sus cajas se leen del DOM)."""
    avisos = []
    for t in txts:
        x0, y0, x1, y1 = t['caja']
        if x0 < -1 or y0 < -1 or x1 > vw + 1 or y1 > vh + 1:
            avisos.append(dict(tipo='texto fuera de pantalla', texto=t['texto'],
                               caja=[round(v) for v in t['caja']]))
            continue
        lim = cv if (cv and t['tipo'] == 'canvas') else dict(x=0, y=0, w=vw, h=vh)
        m = min(x0 - lim['x'], y0 - lim['y'], lim['x'] + lim['w'] - x1, lim['y'] + lim['h'] - y1)
        if m < L3_MARGIN:
            avisos.append(dict(tipo='texto pegado al borde', texto=t['texto'],
                               margen=round(m, 1), caja=[round(v) for v in t['caja']]))
        if t['tipo'] != 'canvas': continue
        for e in hud:
            if x0 < e['x'] + e['w'] and x1 > e['x'] and y0 < e['y'] + e['h'] and y1 > e['y']:
                avisos.append(dict(tipo='texto del juego bajo ' + e['sel'], texto=t['texto'],
                                   caja=[round(v) for v in t['caja']]))
                break
    for e in hud:                                        # los propios controles
        if e['x'] < -1 or e['y'] < -1 or e['x'] + e['w'] > vw + 1 or e['y'] + e['h'] > vh + 1:
            avisos.append(dict(tipo='control fuera de pantalla', texto=e['sel']))
    vistos, uniq = set(), []
    for a in avisos:
        k = (a['tipo'], a.get('texto', ''), tuple(a.get('caja', [])))
        if k in vistos: continue
        vistos.add(k); uniq.append(a)
    return uniq


# ─────────────────────────── lente 4: daltonismo ─────────────────────────────
def lente_daltonismo(img, dest, pref):
    """Pares de colores que se distinguían por TONO y dejan de distinguirse al simular."""
    chico = img.resize((img.width // 4 or 1, img.height // 4 or 1))
    pal = chico.quantize(colors=10, method=Image.Quantize.MEDIANCUT).convert('RGB')
    arr = np.asarray(pal).reshape(-1, 3)
    cols, cnt = np.unique(arr, axis=0, return_counts=True)
    tot = cnt.sum()
    base = [tuple(int(v) for v in c) for c, n in zip(cols, cnt) if n / tot > 0.04]
    res = {}
    for tipo in CVD:
        sim = simular(img, tipo)
        sim.save(dest / f'{pref}-{tipo[:5]}.png')
        s = {c: tuple(int(v) for v in np.asarray(simular(Image.new('RGB', (1, 1), c), tipo)).reshape(3))
             for c in base}
        perdidos = []
        for i in range(len(base)):
            for j in range(i + 1, len(base)):
                a, b = base[i], base[j]
                d0 = de(a, b)
                if d0 < L4_DE0: continue
                if abs(lab(a)[0] - lab(b)[0]) > L4_DL0: continue     # ya se separan por valor
                d1 = de(s[a], s[b])
                if d1 < L4_DE1:
                    perdidos.append(dict(a='#%02x%02x%02x' % a, b='#%02x%02x%02x' % b,
                                         de0=round(d0, 1), de1=round(d1, 1)))
        perdidos.sort(key=lambda p: p['de1'])
        res[tipo] = perdidos[:4]
    mal = any(res[t] for t in res)
    return dict(estado='FALLA' if mal else 'PASA', colores=len(base), pares=res)


# ───────────────────── lente 5: rendimiento en gama baja ─────────────────────
def lente_fps(base, x4):
    """fps sin freno (referencia de la máquina) y con CPU ×4 (gama baja) vía CDP."""
    def stat(d):
        d = [x for x in d if x > 0][8:]          # se descartan los primeros frames (arranque)
        if len(d) < 15: return None
        d = np.array(d, np.float32)
        return dict(fps=round(1000.0 / float(d.mean()), 1), frames=int(len(d)),
                    p95_ms=round(float(np.percentile(d, 95)), 1),
                    max_ms=round(float(d.max()), 1), picos_32ms=int((d > L5_SPIKE).sum()))
    b, t = stat(base), stat(x4)
    if not t: return dict(estado='N/D', nota='muestras insuficientes')
    r = dict(fps_x4=t['fps'], picos_32ms=t['picos_32ms'], max_ms=t['max_ms'], p95_ms=t['p95_ms'],
             frames=t['frames'], fps_libre=b['fps'] if b else None)
    ok = t['fps'] >= L5_FPS and t['picos_32ms'] <= L5_SPIKES_OK
    if b and b['fps'] < L5_FPS:
        r['nota'] = 'ni siquiera sin freno llega a 55 fps: el coste es del juego, no de la CPU lenta'
    r['estado'] = 'PASA' if ok else 'FALLA'
    return r


# ───────────────────────────── recorrido del juego ───────────────────────────
def geometria(pg):
    return pg.evaluate("""() => {
      const r = e => { if (!e) return null; const b = e.getBoundingClientRect();
        return {x:b.x, y:b.y, w:b.width, h:b.height}; };
      const hud = [...document.querySelectorAll('#hud button')].map((b,i) => {
        const o = r(b); o.sel = b.getAttribute('aria-label') || ('hud'+i); return o; });
      return {cv: r(document.querySelector('canvas')), hud};
    }""")


def jugar(pg):
    """Unos segundos de juego: teclas, clics y un arrastre (como smoke.py)."""
    for key in ['ArrowRight', 'ArrowUp', 'Space', 'ArrowLeft', 'KeyX', 'ArrowDown']:
        pg.keyboard.down(key); pg.wait_for_timeout(90); pg.keyboard.up(key)
    b = pg.viewport_size
    for (fx, fy) in [(.35, .45), (.65, .6), (.5, .8), (.25, .3)]:
        pg.mouse.click(b['width'] * fx, b['height'] * fy); pg.wait_for_timeout(70)
    pg.mouse.move(b['width'] * .4, b['height'] * .6); pg.mouse.down()
    pg.mouse.move(b['width'] * .6, b['height'] * .35, steps=6); pg.mouse.up()


def revisar(br, slug, vista, vw, vh, dest, url):
    pg = br.new_page(viewport={'width': vw, 'height': vh})
    errs = []
    pg.on('pageerror', lambda e: errs.append('EXC ' + str(e).split('\n')[0][:180]))
    pg.on('console', lambda m: errs.append('CON ' + m.text[:180]) if m.type == 'error' else None)
    pg.add_init_script(FPS_PROBE); pg.add_init_script(TXT_PROBE)
    cdp = pg.context.new_cdp_session(pg)
    shot = lambda: Image.open(io.BytesIO(pg.screenshot())).convert('RGB')
    pg.goto(url); pg.wait_for_timeout(700)

    geo_ini = geometria(pg); txt_ini = textos(pg, geo_ini['cv'])
    im_ini = shot(); im_ini.save(dest / f'{vista}-inicio.png')

    pg.mouse.click(vw / 2, vh / 2); pg.wait_for_timeout(250)     # arrancar partida
    jugar(pg); pg.wait_for_timeout(250)
    geo_jue = geometria(pg); txt_jue = textos(pg, geo_jue['cv'])
    im_a = shot(); pg.wait_for_timeout(110); im_b = shot()
    im_a.save(dest / f'{vista}-partida.png'); im_b.save(dest / f'{vista}-partida2.png')

    # rendimiento: CPU ×4 y unos segundos jugando
    pg.wait_for_timeout(900)                                          # que se calme la máquina
    pg.evaluate('window.__fr=[]'); pg.wait_for_timeout(1800)          # referencia sin freno
    base = pg.evaluate('window.__fr') or []
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    pg.wait_for_timeout(500); pg.evaluate('window.__fr=[]')
    for _ in range(3):
        pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(400); pg.keyboard.up('ArrowRight')
        pg.mouse.move(vw * .5, vh * .5); pg.wait_for_timeout(400)
    x4 = pg.evaluate('window.__fr') or []
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})

    # fin de partida: se fuerza con k.lose para tener siempre la pantalla final
    fin = pg.evaluate("""() => { const k = window.__k; if (!k) return 'sin kit';
      try { if (k.st !== 'over') k.lose((window.CFG&&window.CFG.id)||'lente', 0, 'Fin'); return k.st; }
      catch (e) { return 'error: ' + e.message; } }""")
    pg.wait_for_timeout(900)
    geo_fin = geometria(pg); txt_fin = textos(pg, geo_fin['cv'])
    im_fin = shot(); im_fin.save(dest / f'{vista}-fin.png')
    pg.close()

    # ── análisis ──
    pares = ((im_ini, txt_ini, geo_ini), (im_a, txt_jue, geo_jue), (im_fin, txt_fin, geo_fin))
    t2 = [lente_texto(im, tx, vw, vh) for im, tx, _ in pares]
    peores = sorted([q for r in t2 for q in r.get('peores', [])], key=lambda q: q['ratio'])
    n_txt = sum(r.get('textos', 0) for r in t2)
    avisos, vistos = [], set()
    for _, tx, geo in pares:                       # inicio, partida y fin, sin repetir avisos
        for a in lente_recortes(tx, geo['cv'], geo['hud'], vw, vh):
            k = (a['tipo'], a.get('texto', ''), tuple(a.get('caja', [])))
            if k in vistos: continue
            vistos.add(k); avisos.append(a)
    return dict(
        jerarquia=lente_jerarquia(im_a, im_b, dest, vista),
        texto=dict(estado='FALLA' if peores else ('N/D' if not n_txt else 'PASA'),
                   textos=n_txt, flojos=len(peores), peores=peores[:6]),
        recortes=dict(estado='FALLA' if avisos else 'PASA', total=len(avisos), avisos=avisos[:8]),
        daltonismo=lente_daltonismo(im_a, dest, vista),
        rendimiento=lente_fps(base, x4),
        estabilidad=dict(estado='FALLA' if errs else 'PASA', errores=errs[:5], fin=fin),
    )


def main():
    slugs = [s for s in sys.argv[1:] if not s.startswith('-')]
    if not slugs:
        print('uso: python3 scripts/lentes.py <slug> [<slug>…]'); return 2
    falta = [s for s in slugs if not (ROOT / s / 'index.html').exists()]
    if falta:
        print('no existen:', ', '.join(falta)); return 2

    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    informe, tot = {}, {'PASA': 0, 'FALLA': 0, 'N/D': 0}
    with sync_playwright() as p:
        br = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for s in slugs:
            dest = OUT / s; dest.mkdir(parents=True, exist_ok=True)
            informe[s] = {}
            for vista, vw, vh in VIEWS:
                r = revisar(br, s, vista, vw, vh, dest, f'http://127.0.0.1:{PORT}/{s}/index.html')
                informe[s][vista] = r
                for l in r.values():
                    tot[l['estado']] = tot.get(l['estado'], 0) + 1
            (dest / 'informe.json').write_text(json.dumps(informe[s], indent=1, ensure_ascii=False))
        br.close()
    (OUT / 'informe.json').write_text(json.dumps(informe, indent=1, ensure_ascii=False))
    resumen(informe, tot)
    return 0


NOM = dict(jerarquia='1 jerarquía', texto='2 texto/HUD', recortes='3 recortes',
           daltonismo='4 daltonismo', rendimiento='5 rendimiento', estabilidad='6 estabilidad')


def resumen(informe, tot):
    for s, vistas in informe.items():
        print(f'\n■ {s}')
        for vista, r in vistas.items():
            print(f'  {vista}')
            for k, n in NOM.items():
                l = r[k]
                det = ''
                if k == 'jerarquia' and l['estado'] != 'N/D':
                    det = f"actores {l['actores']}, ΔV mín {l['dv_min']} / mediana {l['dv_mediana']}"
                elif k == 'jerarquia': det = l.get('nota', '')
                elif k == 'texto': det = f"{l.get('textos',0)} textos, {l.get('flojos',0)} flojos" + \
                    (f" (peor «{l['peores'][0]['texto'][:18]}» {l['peores'][0]['ratio']}:1)" if l.get('peores') else '')
                elif k == 'recortes':
                    det = '; '.join(sorted({a['tipo'] for a in l['avisos']})) or 'sin avisos'
                elif k == 'daltonismo':
                    det = ', '.join(f"{t[:5]} {len(v)}" for t, v in l['pares'].items()) if l.get('pares') else ''
                elif k == 'rendimiento':
                    det = f"{l.get('fps_x4','?')} fps con CPU ×4 ({l.get('fps_libre','?')} sin freno), " \
                          f"picos>32ms {l.get('picos_32ms','?')}, máx {l.get('max_ms','?')} ms"
                elif k == 'estabilidad': det = l['errores'][0] if l['errores'] else 'sin errores'
                print(f"    {l['estado']:<5} {n:<14} {det}")
    print(f"\nTotal: {tot.get('PASA',0)} PASA · {tot.get('FALLA',0)} FALLA · {tot.get('N/D',0)} N/D")
    print(f'Capturas e informes en {OUT}')


if __name__ == '__main__':
    sys.exit(main())
