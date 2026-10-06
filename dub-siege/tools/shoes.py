#!/usr/bin/env python3
"""Zapatillas del heroe.

Las hojas de PixelLab del heroe salieron con las piernas cortadas por abajo
(la casilla de 56 px acaba justo en el tobillo), asi que el personaje parecia
hundido en el suelo. Aqui se alarga cada fotograma 4 px (una unidad logica:
fh 14 -> 15) y se dibuja una zapatilla bajo cada pierna que llega al borde.

Como el fotograma se apoya por abajo (blit: dy = y + h - fh), el cuerpo sube
una unidad y las zapatillas quedan en el suelo. La misma operacion se aplica a
las 7 capas (p_ cuerpo, c_ mapa de clases y h1..h5_ pelo) de todos los estados,
con clase 0 en las zapatillas: el vestidor no las retine. Idempotente: solo
toca hojas de 56 px de alto.
"""
import glob, json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(HERE, 'art')
FW, FH, ADD = 48, 56, 4
D = (26, 21, 48, 255)        # contorno #1a1530
U = (238, 238, 246, 255)     # empeine
U2 = (186, 184, 206, 255)    # sombra del empeine
S = (255, 111, 181, 255)     # franja de la suela (acento de la marca)


def legs(f):
    """Piernas que llegan al borde de abajo: grupos de columnas cuyo pixel
    opaco mas bajo esta en las 3 ultimas filas."""
    a = f[:, :, 3] > 128
    cols = []
    for x in range(FW):
        ys = np.nonzero(a[:, x])[0]
        if len(ys) and ys.max() >= FH - 3 and ys.max() > 40:
            cols.append(x)
    groups, cur = [], []
    for x in cols:
        if cur and x != cur[-1] + 1:
            groups.append(cur)
            cur = []
        cur.append(x)
    if cur:
        groups.append(cur)
    out = []
    for g in groups:
        if len(g) > 8:                 # dos piernas juntas: dos zapatillas
            h = len(g) // 2
            out += [g[:h], g[h:]]
        else:
            out.append(g)
    return [(g[0], g[-1]) for g in out if len(g) >= 2]


def shoe_mask(x0, x1):
    """Pixeles de una zapatilla bajo la pierna x0..x1, puntera a la derecha."""
    w = x1 - x0 + 1
    px = {}
    L, R = x0 - 1, x1 + 3
    for x in range(L, R + 1):
        for r in range(ADD):
            y = FH + r
            if r == 0:
                if x > x1 + 1:
                    continue
                c = D if x in (L, x1 + 1) else (U2 if x == x0 else U)
            elif r == 1:
                c = D if x in (L, R) else (U2 if x < x0 + max(1, w // 3) else U)
            elif r == 2:
                c = D if x in (L, R) else S
            else:
                if x in (L, R):
                    continue
                c = D
            px[(y, x)] = c
    return px


def run():
    made = {}
    for f in sorted(glob.glob(os.path.join(ART, 'p_*.png'))):
        st = os.path.basename(f)[2:-4]
        p = np.array(Image.open(f).convert('RGBA'))
        if p.shape[0] != FH:
            continue
        n = p.shape[1] // FW
        shoes = []
        for k in range(n):
            fr = p[:, k * FW:(k + 1) * FW]
            m = {}
            for x0, x1 in legs(fr):
                m.update(shoe_mask(x0, x1))
            shoes.append(m)
        for lay in ['p', 'c', 'h1', 'h2', 'h3', 'h4', 'h5']:
            fn = os.path.join(ART, f'{lay}_{st}.png')
            if not os.path.exists(fn):
                continue
            im = np.array(Image.open(fn).convert('RGBA'))
            if im.shape[0] != FH:
                continue
            ext = np.zeros((FH + ADD, im.shape[1], 4), np.uint8)
            if lay == 'c':
                ext[:, :, 3] = 255
            ext[:FH] = im
            if lay == 'p':
                for k, m in enumerate(shoes):
                    for (y, x), c in m.items():
                        if 0 <= x < FW:
                            ext[y, k * FW + x] = c
            Image.fromarray(ext, 'RGBA').save(fn, optimize=True)
        made[st] = n
    return made


def main():
    made = run()
    man = json.load(open(os.path.join(ART, 'manifest.json')))
    gj = os.path.join(HERE, 'godot', 'data', 'art.json')
    art = json.load(open(gj))
    for st in made:
        for lay in ['p', 'c', 'h1', 'h2', 'h3', 'h4', 'h5']:
            k = f'{lay}_{st}'
            if k in man:
                man[k]['fh'] = 15
            if k in art:
                art[k]['fh'] = 15
    json.dump(man, open(os.path.join(ART, 'manifest.json'), 'w'), indent=1, ensure_ascii=False)
    json.dump(art, open(gj, 'w'), ensure_ascii=False)
    print(made)


if __name__ == '__main__':
    main()
