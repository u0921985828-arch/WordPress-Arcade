#!/usr/bin/env python3
"""Baja de PixelLab las hojas de sprites y las empaqueta en tiras para Dub Siege.

Lee art/manifest.json (que es lo unico que se versiona junto a los PNG) y, por
cada entrada, pide a la API la hoja del objeto, saca la fila que toca (rotacion
o animacion), recorta el contenido con una caja comun a todos los fotogramas
—asi el personaje no baila— y lo pega en una tira horizontal de fw*SC x fh*SC
pixeles, centrado en X y apoyado abajo, que es como lo coloca blit().

Necesita el token en la variable de entorno PIXELLAB_TOKEN. El token NO se
guarda en el repositorio.

  PIXELLAB_TOKEN=... python3 tools/fetch_art.py [clave ...]
"""
import io, json, os, ssl, sys, urllib.request, zipfile
from PIL import Image

SC = 4
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(HERE, 'art')
API = 'https://api.pixellab.ai/mcp/objects/%s/spritesheet'


def opener():
    tok = os.environ.get('PIXELLAB_TOKEN')
    if not tok:
        sys.exit('falta PIXELLAB_TOKEN')
    pr = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
    hs = []
    if pr:
        hs.append(urllib.request.ProxyHandler({'https': pr, 'http': pr}))
    ca = '/root/.ccr/ca-bundle.crt'
    if os.path.exists(ca):
        hs.append(urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=ca)))
    o = urllib.request.build_opener(*hs)
    o.addheaders = [('Authorization', 'Bearer ' + tok)]
    return o


def sheet(op, oid):
    raw = op.open(API % oid, timeout=300).read()
    z = zipfile.ZipFile(io.BytesIO(raw))
    js = json.loads(z.read([n for n in z.namelist() if n.endswith('.json')][0]))
    im = Image.open(io.BytesIO(z.read(js['spritesheet']['path']))).convert('RGBA')
    return js['spritesheet'], im


def cells(meta, im, anim):
    """Fotogramas de la animacion pedida (o de la rotacion base si anim es None).
    La hoja es una rejilla uniforme: la fila declarada es la casilla de partida y
    los fotogramas siguen de izquierda a derecha, saltando de fila al llenarla."""
    cw = meta['cell_size']['width']; ch = meta['cell_size']['height']
    cols = meta['columns']
    for row in meta['rows']:
        ok = (row['type'] == 'rotations') if anim is None else (row.get('animation') == anim)
        if not ok:
            continue
        out = []
        for i in range(row['frame_count']):
            cx, cy = i % cols, row['row'] + i // cols
            out.append(im.crop((cx * cw, cy * ch, (cx + 1) * cw, (cy + 1) * ch)))
        return out
    raise SystemExit('no esta la fila %r' % anim)


def pack(frames, fw, fh, out):
    bb = None
    for f in frames:
        b = f.getbbox()
        if not b:
            continue
        bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]),
                                   max(bb[2], b[2]), max(bb[3], b[3]))
    W, H = fw * SC, fh * SC
    cw, chh = bb[2] - bb[0], bb[3] - bb[1]
    sheet = Image.new('RGBA', (W * len(frames), H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        c = f.crop(bb)
        if cw > W or chh > H:                      # no cabe: reduce al vuelo
            k = min(W / cw, H / chh)
            c = c.resize((max(1, int(cw * k)), max(1, int(chh * k))), Image.NEAREST)
        sheet.paste(c, (i * W + (W - c.width) // 2, H - c.height), c)
    sheet.save(out)
    return sheet.size


def main():
    man = json.load(open(os.path.join(ART, 'manifest.json')))
    keys = sys.argv[1:] or list(man)
    op = opener()
    cache = {}
    for k in keys:
        d = man[k]
        if d['object'] not in cache:
            cache[d['object']] = sheet(op, d['object'])
        meta, im = cache[d['object']]
        fr = cells(meta, im, d.get('anim'))
        if d.get('skip'):
            fr = fr[d['skip']:]
        if d.get('frames'):
            fr = fr[:d['frames']]
        sz = pack(fr, d['fw'], d['fh'], os.path.join(ART, k + '.png'))
        d['n'] = len(fr)
        print(k, len(fr), 'fotogramas', sz)
    json.dump(man, open(os.path.join(ART, 'manifest.json'), 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
