# Vista ampliada para revisar pixel art a mano (skill sprites-a-mano). Python 3 + Pillow.
#   python3 -I preview.py [--x 8] [--salida preview_x8.png] sprite.png otro.png ...
# Monta los PNG en una tira, ampliados por vecino más cercano (nada de suavizado), sobre un
# tablero de ajedrez para ver dónde hay alfa, con una regla de 1 px cada 8 debajo.
# Abre el resultado y MÍRALO: un sprite que no se ha mirado no se entrega.
import sys

from PIL import Image

FONDO_A, FONDO_B = (56, 58, 70, 255), (44, 46, 56, 255)
SEP = 8


def tablero(w, h, k):
    im = Image.new('RGBA', (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = FONDO_A if ((x // k) + (y // k)) % 2 == 0 else FONDO_B
    return im


def main(argv):
    k, salida, rutas = 8, None, []
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == '--x':
            i += 1
            k = int(argv[i])
        elif a == '--salida':
            i += 1
            salida = argv[i]
        else:
            rutas.append(a)
        i += 1
    if not rutas:
        print('uso: preview.py [--x 8] [--salida f.png] sprite.png ...')
        return 2
    ims = [Image.open(p).convert('RGBA') for p in rutas]
    anchos = [im.width * k for im in ims]
    alto = max(im.height for im in ims) * k
    W = sum(anchos) + SEP * (len(ims) + 1)
    H = alto + SEP * 2 + 10
    out = tablero(W, H, k)
    x = SEP
    for im, w in zip(ims, anchos):
        g = im.resize((w, im.height * k), Image.NEAREST)
        out.alpha_composite(g, (x, SEP + alto - im.height * k))
        x += w + SEP
    regla = out.load()                      # una marca cada 8 px del sprite
    for i2 in range(0, W, k * 8):
        for y in range(H - 8, H - 2):
            regla[i2, y] = (230, 230, 230, 255)
    salida = salida or ('preview_x%d.png' % k)
    out.save(salida)
    print('preview: %d sprites a %dx en %s' % (len(ims), k, salida))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
