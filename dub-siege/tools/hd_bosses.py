#!/usr/bin/env python3
"""Hojas HD de los jefes que son un enemigo ampliado (ai 4).

Esos jefes se pintaban con la hoja del enemigo ampliada x3 (x2 EL ESCUDO): su
pixel era tres veces mas gordo que el del protagonista. Aqui se agranda cada
fotograma con Scale3x / Scale2x (EPX: suaviza las escaleras sin inventar
colores) y se guarda como bh_<tipo>, con el tamano logico ya multiplicado.
El juego la pinta a escala 1: un pixel de la hoja = un pixel del lienzo, igual
que el protagonista. Idempotente.
"""
import json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(HERE, 'art')
SC = 4
# tipo -> (hoja de origen, factor) ; el factor es el sc de LEVELS
BOSS = {'w': ('e_w', 3), 'h': ('bs_h', 3), 'b': ('e_b', 3), 't': ('e_t', 3), 's': ('e_s', 2), 'f': ('e_f', 3)}


def key(a):
    # pixeles transparentes iguales entre si sea cual sea su color
    k = a.astype(np.uint32)
    k = (k[..., 0] << 24) | (k[..., 1] << 16) | (k[..., 2] << 8) | k[..., 3]
    k[a[..., 3] == 0] = 0
    return k


def scale2x(a):
    h, w = a.shape[:2]; k = key(a)
    p = np.pad(k, 1, mode='edge'); pa = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode='edge')
    B, D, F, H_ = p[:-2, 1:-1], p[1:-1, :-2], p[1:-1, 2:], p[2:, 1:-1]
    Bc, Dc, Fc, Hc = pa[:-2, 1:-1], pa[1:-1, :-2], pa[1:-1, 2:], pa[2:, 1:-1]
    out = np.repeat(np.repeat(a, 2, 0), 2, 1)
    ok = (B != H_) & (D != F)
    for (dy, dx), (c1, c2, x1, x2) in {(0, 0): (D, B, Dc, Bc), (0, 1): (B, F, Bc, Fc),
                                       (1, 0): (D, H_, Dc, Hc), (1, 1): (H_, F, Hc, Fc)}.items():
        m = ok & (c1 == c2)
        out[dy::2, dx::2][m] = x1[m]
    return out


def scale3x(a):
    h, w = a.shape[:2]; k = key(a)
    p = np.pad(k, 1, mode='edge'); pa = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode='edge')
    A, B, C = p[:-2, :-2], p[:-2, 1:-1], p[:-2, 2:]
    D, E, F = p[1:-1, :-2], p[1:-1, 1:-1], p[1:-1, 2:]
    G, H_, I = p[2:, :-2], p[2:, 1:-1], p[2:, 2:]
    Bc, Dc, Fc, Hc = pa[:-2, 1:-1], pa[1:-1, :-2], pa[1:-1, 2:], pa[2:, 1:-1]
    out = np.repeat(np.repeat(a, 3, 0), 3, 1)
    ok = (B != H_) & (D != F)
    rules = {
        (0, 0): ((D == B), Dc),
        (0, 1): (((D == B) & (E != C)) | ((B == F) & (E != A)), Bc),
        (0, 2): ((B == F), Fc),
        (1, 0): (((D == B) & (E != G)) | ((D == H_) & (E != A)), Dc),
        (1, 2): (((B == F) & (E != I)) | ((H_ == F) & (E != C)), Fc),
        (2, 0): ((D == H_), Dc),
        (2, 1): (((D == H_) & (E != I)) | ((H_ == F) & (E != G)), Hc),
        (2, 2): ((H_ == F), Fc),
    }
    for (dy, dx), (cond, src) in rules.items():
        m = ok & cond
        out[dy::3, dx::3][m] = src[m]
    return out


def main():
    man = json.load(open(os.path.join(ART, 'manifest.json')))
    gj = os.path.join(HERE, 'godot', 'data', 'art.json')
    art = json.load(open(gj))
    for t, (src, f) in BOSS.items():
        d = man[src]; im = np.array(Image.open(os.path.join(ART, src + '.png')).convert('RGBA'))
        fw = d['fw'] * SC; n = d.get('n', 1)
        frames = [im[:, i * fw:(i + 1) * fw] for i in range(n)]
        up = [(scale3x if f == 3 else scale2x)(fr) for fr in frames]
        Image.fromarray(np.concatenate(up, 1), 'RGBA').save(os.path.join(ART, 'bh_' + t + '.png'), optimize=True)
        e = {'fw': d['fw'] * f, 'fh': d['fh'] * f, 'n': n, 'src': src, 'hd': f}
        man['bh_' + t] = e
        art['bh_' + t] = {'fw': e['fw'], 'fh': e['fh'], 'n': n, 'x1': 0}
        print('bh_' + t, e)
    json.dump(man, open(os.path.join(ART, 'manifest.json'), 'w'), indent=1, ensure_ascii=False)
    json.dump(art, open(gj, 'w'), ensure_ascii=False)


if __name__ == '__main__':
    main()
