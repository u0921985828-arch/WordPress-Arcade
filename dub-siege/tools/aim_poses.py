#!/usr/bin/env python3
"""Poses de apuntado del heroe, compuestas a partir de las hojas que ya hay.

El heroe solo tenia una pose de apuntar arriba (aimu, de pie y quieto): al
correr, saltar o caer apuntando arriba, o al disparar en diagonal, se veia el
brazo hacia delante mientras la bala salia hacia arriba. Aqui se cambia el
brazo del arma en cada fotograma de reposo, carrera, salto y caida:

  u  brazo levantado (copiado de aimu)
  d  brazo en diagonal arriba (el brazo de reposo girado -45 grados)
  x  brazo en diagonal abajo (girado +45 grados, solo en el aire)

La misma operacion (mismos pixeles de origen) se aplica a las 7 capas del
personaje (p_ cuerpo, c_ mapa de clases y h1..h5_ pelo), asi el vestidor
(lookSheet) sigue funcionando igual con las poses nuevas. El giro usa
supermuestreo x8 y voto por mayoria del color (estilo RotSprite) para que el
brazo girado no salga roto. Escribe art/<capa>_<estado>.png y actualiza
art/manifest.json y godot/data/art.json.
"""
import json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(HERE, 'art')
FW, FH = 48, 56
LAYERS = ['p', 'c', 'h1', 'h2', 'h3', 'h4', 'h5']
PIVOT = (26.5, 31.5)        # hombro del brazo del arma en idle0
BOX = (25, 22, 48, 41)      # x0, y0, x1, y1 donde vive el brazo del arma en idle0


def frames(name):
    im = np.array(Image.open(os.path.join(ART, name + '.png')).convert('RGBA'))
    return [im[:, k * FW:(k + 1) * FW].copy() for k in range(im.shape[1] // FW)]


def offset(f, ref):
    """Desplazamiento de la cabeza respecto a idle0 (busca el mejor encaje)."""
    a = f[:, :, 3] > 128
    best = None
    for dy in range(-12, 13):
        for dx in range(-8, 8):
            ys, xs = 2 + dy, 8 + dx
            if ys < 0 or xs < 0 or ys + 22 > FH or xs + 24 > FW:
                continue
            s = (a[ys:ys + 22, xs:xs + 24] == ref).sum()
            if best is None or s > best[0]:
                best = (s, dx, dy)
    return best[1], best[2]


def shoulder(p):
    """Columna de corte (borde derecho de la cabeza + 1) y fila alta de la
    manga en esa columna: con eso se sabe donde nace el brazo en cada pose."""
    a = p[:, :, 3] > 128
    top = int(np.nonzero(a.any(1))[0][0])
    cut = max(int(np.nonzero(a[y])[0].max()) for y in range(top, top + 13) if a[y].any()) + 1
    m = arm_mask(p, None, cut)
    ys = [y for y in range(FH) if m[y, cut:cut + 3].any()]
    return cut, (min(ys) if ys else top + 25)


def arm_mask(p, c, cut=None):
    """Brazo del arma entero: relleno desde la boca del canon (pixel amarillo
    mas a la derecha) por pixeles opacos a la derecha de la cabeza, sin bajar
    mas de 9 filas por debajo del canon (asi no se cuela por las piernas)."""
    a = p[:, :, 3] > 128
    if cut is None:
        cut = shoulder(p)[0]
    yel = (p[:, :, 0] > 200) & (p[:, :, 1] > 200) & (p[:, :, 2] < 120) & a
    ys, xs = np.nonzero(yel)
    m = np.zeros((FH, FW), bool)
    if not len(xs):
        return m
    k = int(np.argmax(xs))
    sy, sx = int(ys[k]), int(xs[k])
    ylim = sy + 10
    st = [(sy, sx)]
    m[sy, sx] = True
    while st:
        yy, xx = st.pop()
        for ny, nx in ((yy + 1, xx), (yy - 1, xx), (yy, xx + 1), (yy, xx - 1)):
            if 0 <= ny <= ylim and cut <= nx < FW and a[ny, nx] and not m[ny, nx]:
                m[ny, nx] = True
                st.append((ny, nx))
    return m


def rot_map(p, mask, ang):
    """Para cada pixel de salida, de que pixel de origen sale (o None)."""
    S = 8
    ca, sa = np.cos(-ang), np.sin(-ang)
    px, py = PIVOT
    out = {}
    for y in range(FH):
        for x in range(FW):
            votes = {}
            for sy in range(S):
                for sx in range(S):
                    ox, oy = x + (sx + .5) / S - px, y + (sy + .5) / S - py
                    qx, qy = ca * ox - sa * oy + px, sa * ox + ca * oy + py
                    ix, iy = int(np.floor(qx)), int(np.floor(qy))
                    if 0 <= ix < FW and 0 <= iy < FH and mask[iy, ix]:
                        k = tuple(p[iy, ix])
                        votes.setdefault(k, []).append((iy, ix))
            if votes:
                tot = sum(len(v) for v in votes.values())
                k = max(votes, key=lambda q: len(votes[q]))
                if tot >= S * S * .5:
                    v = votes[k]
                    out[(y, x)] = v[len(v) // 2]
    return out


def blank(layer):
    return np.array([0, 0, 0, 255] if layer == 'c' else [0, 0, 0, 0], np.uint8)


def build():
    L = {l: {s: frames(f'{l}_{s}') for s in ['idle', 'run', 'jump', 'fall', 'aimu']} for l in LAYERS}
    p0, c0 = L['p']['idle'][0], L['c']['idle'][0]
    ref = p0[2:24, 8:32, 3] > 128
    m0 = arm_mask(p0, c0)
    s0 = shoulder(p0)
    rots = {'d': rot_map(p0, m0, np.radians(-45)), 'x': rot_map(p0, m0, np.radians(45))}
    # brazo levantado de aimu, en coordenadas de idle0
    pu, cu = L['p']['aimu'][0], L['c']['aimu'][0]
    udx, udy = offset(pu, ref)
    mu = np.zeros((FH, FW), bool)
    for y in range(FH):
        for x in range(FW):
            if pu[y, x, 3] > 128 and ((x >= 28 + udx and y <= 31) or (x >= 25 + udx and 24 <= y <= 31)):
                mu[y, x] = True
    out = {}
    plan = [('u', ['idle', 'run', 'jump', 'fall']), ('d', ['idle', 'run', 'jump', 'fall']), ('x', ['jump', 'fall'])]
    for mode, states in plan:
        for s in states:
            name = 'aim' + mode + s[0]          # aimui, aimur, aimdj, aimxf...
            res = {l: [] for l in LAYERS}
            for k, pf in enumerate(L['p'][s]):
                sf = shoulder(pf)
                dx, dy = sf[0] - s0[0], sf[1] - s0[1]
                cf = L['c'][s][k]
                m = arm_mask(pf, cf)
                for l in LAYERS:
                    f = L[l][s][k].copy()
                    f[m] = blank(l)
                    if mode == 'u':
                        src = L[l]['aimu'][0]
                        for y, x in zip(*np.nonzero(mu)):
                            ty, tx = y - udy + dy, x - udx + dx
                            if 0 <= ty < FH and 0 <= tx < FW:
                                if l[0] == 'h' and src[y, x, 3] < 128:
                                    continue
                                f[ty, tx] = src[y, x]
                    else:
                        src = L[l]['idle'][0]
                        for (y, x), (sy, sx) in rots[mode].items():
                            ty, tx = y + dy, x + dx
                            if 0 <= ty < FH and 0 <= tx < FW:
                                if l[0] == 'h' and src[sy, sx, 3] < 128:
                                    continue
                                f[ty, tx] = src[sy, sx]
                    res[l].append(f)
            for l in LAYERS:
                sheet = np.concatenate(res[l], axis=1)
                Image.fromarray(sheet, 'RGBA').save(os.path.join(ART, f'{l}_{name}.png'), optimize=True)
            out[name] = len(res['p'])
    return out


def main():
    made = build()
    man = json.load(open(os.path.join(ART, 'manifest.json')))
    gj = os.path.join(HERE, 'godot', 'data', 'art.json')
    art = json.load(open(gj))
    for name, n in made.items():
        for l in LAYERS:
            k = f'{l}_{name}'
            man[k] = {'local': True, 'fw': 12, 'fh': 14, 'n': n}
            art[k] = {'fw': 12, 'fh': 14, 'n': n, 'x1': 0}
    json.dump(man, open(os.path.join(ART, 'manifest.json'), 'w'), indent=1, ensure_ascii=False)
    json.dump(art, open(gj, 'w'), ensure_ascii=False)
    print(made)




def muzzles():
    """Boca del arma (pixel amarillo mas alejado del hombro) de cada fotograma,
    en unidades logicas (1/4) respecto a la esquina del fotograma. Va a la
    tabla MUZ de dub-siege.html."""
    out = {}
    for s in ['idle', 'run', 'jump', 'fall', 'aimui', 'aimur', 'aimuj', 'aimuf',
              'aimdi', 'aimdr', 'aimdj', 'aimdf', 'aimxj', 'aimxf']:
        r = []
        for f in frames('p_' + s):
            a = f[:, :, 3] > 128
            ys, xs = np.nonzero((f[:, :, 0] > 200) & (f[:, :, 1] > 200) & (f[:, :, 2] < 120) & a)
            k = int(np.argmax(xs - (ys if s[3:4] in ('u', 'd') else -ys) * (2 if s[3:4] == 'u' else 1))) if len(xs) else 0
            r.append([round((xs[k] + .5) / 4, 2), round((ys[k] + .5) / 4, 2)] if len(xs) else [11, 6.5])
        out[s] = r
    return out


if __name__ == '__main__':
    import sys
    print(json.dumps(muzzles(), separators=(",", ":"))) if "muz" in sys.argv else main()
