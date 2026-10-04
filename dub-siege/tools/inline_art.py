#!/usr/bin/env python3
"""Mete las tiras de art/ dentro de dub-siege.html.

Las imagenes viajan como data: URI para que el juego siga siendo un solo
fichero. Cada entrada declara el tamano LOGICO del fotograma (fw, fh); la tira
tiene SC veces ese tamano, o sea 1:1 con el lienzo. Las que llevan x1 (retratos
e ilustraciones) se guardan a 1x: el juego las escala por entero al pintarlas.

Cada hoja se guarda en el formato SIN PERDIDA que menos ocupe (WebP sin
perdida o PNG optimizado) y se comprueba pixel a pixel que decodifica igual.
Los datos van en varios <script> pequenos ANTES del juego, entre las marcas
<ARTDATA>: cada uno llama a LD() y avanza la barra de la pantalla de carga,
asi la pagina pinta algo en cuanto llega el primer trozo.
"""
import base64, io, json, os
import numpy as np
from PIL import Image
try:
    import oxipng
except ImportError:
    oxipng = None

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(HERE, 'art')
HTML = os.path.join(HERE, 'dub-siege.html')
A, B = '/* <ART> */', '/* </ART> */'
DA, DB = '<!-- <ARTDATA> -->', '<!-- </ARTDATA> -->'
TROZOS = 6


def same(a, b):
    """Igual pixel a pixel; en los transparentes solo cuenta el alfa."""
    if a.shape != b.shape:
        return False
    t = (a[..., 3] == 0) & (b[..., 3] == 0)
    return bool(((a == b).all(-1) | t).all())


def best(f):
    im = Image.open(f).convert('RGBA'); a = np.array(im)
    cand = []
    b = io.BytesIO(); im.save(b, 'WEBP', lossless=True, quality=100, method=6, exact=True)
    cand.append(('image/webp', b.getvalue()))
    raw = open(f, 'rb').read()
    cand.append(('image/png', raw))
    if oxipng:
        cand.append(('image/png', oxipng.optimize_from_memory(raw, level=4)))
    for mime, v in sorted(cand, key=lambda c: len(c[1])):
        if same(a, np.array(Image.open(io.BytesIO(v)).convert('RGBA'))):
            return mime, v
    raise SystemExit('ninguna version sin perdida de ' + f)


def main():
    man = json.load(open(os.path.join(ART, 'manifest.json')))
    ent, total, png = [], 0, 0
    for k in sorted(man):
        d = man[k]
        f = os.path.join(ART, k + '.png')
        if not os.path.exists(f):
            print('falta', f); continue
        mime, v = best(f); total += len(v); png += os.path.getsize(f)
        x1 = ',x1:1' if d.get('x1') else ''
        ent.append((len(v), "%s:{fw:%d,fh:%d,n:%d%s,src:'data:%s;base64,%s'}"
                    % (k, d['fw'], d['fh'], d.get('n', 1), x1, mime, base64.b64encode(v).decode())))
    # Trozos de tamano parecido: la barra avanza a ritmo constante.
    ent.sort(key=lambda e: e[0]); per = total / TROZOS
    groups, cur, acc = [], [], 0
    for n, e in ent:
        cur.append(e); acc += n
        if acc >= per * (len(groups) + 1) and len(groups) < TROZOS - 1:
            groups.append(cur); cur = []
    if cur:
        groups.append(cur)
    data = DA + '\n' + '\n'.join(
        '<script>LD({%s},%d)</script>' % (','.join(g), round(100 * (i + 1) / len(groups)))
        for i, g in enumerate(groups)) + '\n' + DB
    s = io.open(HTML, encoding='utf-8').read()
    i, j = s.index(A), s.index(B) + len(B)
    s = s[:i] + A + '\nvar ART=window.DSA||{};\n' + B + s[j:]
    i, j = s.index(DA), s.index(DB) + len(DB)
    s = s[:i] + data + s[j:]
    io.open(HTML, 'w', encoding='utf-8').write(s)
    print('%d hojas en %d trozos: %d KB de PNG -> %d KB' % (len(ent), len(groups), png // 1024, total // 1024))


if __name__ == '__main__':
    main()
