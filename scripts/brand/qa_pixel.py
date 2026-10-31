# QA de pixel art hecho a mano (skill sprites-a-mano). Python 3 + Pillow, sin red ni dependencias.
#   python3 -I qa_pixel.py '{"size":[48,48],"palette":["#1a1c2c","#5d275d"],"fix":false,"margen":0}' a.png b.png ...
# La ficha (primer argumento, JSON) admite:
#   size     [w, h]   tamaño exacto de la celda (obligatorio)
#   palette  [...]    colores permitidos; sin ella, avisa por encima de "max_colores" (32)
#   fix      bool     escribe <nombre>_fixed.png cuantizado a la paleta y con el alfa aplanado
#   margen   int      filas/columnas vacías que tiene que dejar el sprite en su celda (0 por defecto)
#   huerfanos int     píxeles sueltos tolerados (2 por defecto)
#   pivote   bool     comprueba que la base cae en la misma fila en todos los PNG (true por defecto)
# Sale con 1 si algo falla: sirve tal cual en una batería de pruebas.
import json
import sys

from PIL import Image


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def qa(path, f):
    im = Image.open(path).convert('RGBA')
    px = im.load()
    W, H = f['size']
    pal = [hexrgb(c) for c in f.get('palette') or []] or None
    fallos = []
    if im.size != (W, H):
        fallos.append('tamaño %s, se esperaba %s' % (im.size, (W, H)))
    semi = sum(1 for x in range(im.width) for y in range(im.height)
               if 0 < px[x, y][3] < 255)
    if semi:
        fallos.append('%d px semitransparentes (el alfa es 0 o 255)' % semi)
    colores = {px[x, y][:3] for x in range(im.width) for y in range(im.height)
               if px[x, y][3] > 0}
    if pal:
        fuera = sorted('#%02x%02x%02x' % c for c in colores if c not in pal)
        if fuera:
            fallos.append('%d colores fuera de paleta: %s' % (len(fuera), ', '.join(fuera[:6])))
    elif len(colores) > f.get('max_colores', 32):
        fallos.append('%d colores (demasiados para pixel art)' % len(colores))
    sueltos = 0
    for x in range(im.width):
        for y in range(im.height):
            if px[x, y][3] == 0:
                continue
            vec = [(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                   if (dx or dy) and 0 <= x + dx < im.width and 0 <= y + dy < im.height]
            if all(px[a, b][3] == 0 for a, b in vec):
                sueltos += 1
    if sueltos > f.get('huerfanos', 2):
        fallos.append('%d px huérfanos' % sueltos)
    caja = im.getbbox()
    m = f.get('margen', 0)
    if caja is None:
        fallos.append('el PNG está vacío')
    elif m and (caja[0] < m or caja[1] < m or caja[2] > W - m or caja[3] > H - m):
        fallos.append('el sprite no deja el margen de %d px (caja %s)' % (m, caja))
    return {'archivo': path, 'ok': not fallos, 'fallos': fallos,
            'colores': len(colores), 'caja': caja}


def arregla(path, f):
    im = Image.open(path).convert('RGBA')
    px = im.load()
    pal = [hexrgb(c) for c in f.get('palette') or []]
    for x in range(im.width):
        for y in range(im.height):
            r, g, b, a = px[x, y]
            if a < 128:
                px[x, y] = (0, 0, 0, 0)
                continue
            c = (r, g, b)
            if pal:
                c = min(pal, key=lambda p: sum((p[i] - c[i]) ** 2 for i in range(3)))
            px[x, y] = (c[0], c[1], c[2], 255)
    salida = path[:-4] + '_fixed.png' if path.lower().endswith('.png') else path + '_fixed.png'
    im.save(salida)
    return salida


def main(argv):
    if len(argv) < 3:
        print(__doc__ or 'uso: qa_pixel.py \'{"size":[w,h]}\' sprite.png ...')
        return 2
    f = json.loads(argv[1])
    if 'size' not in f:
        print('FALTA "size" en la ficha')
        return 2
    res = [qa(p, f) for p in argv[2:]]
    malos = 0
    for r in res:
        if r['ok']:
            print('ok    %s · %d colores · caja %s' % (r['archivo'], r['colores'], r['caja']))
        else:
            malos += 1
            print('FALLA %s' % r['archivo'])
            for x in r['fallos']:
                print('        - %s' % x)
    if f.get('pivote', True) and len(res) > 1:
        bases = sorted({r['caja'][3] for r in res if r['caja']})
        if len(bases) > 1:
            malos += 1
            print('FALLA el pivote se mueve entre fotogramas: bases en las filas %s' % bases)
    if f.get('fix'):
        for r in res:
            if not r['ok']:
                print('      arreglado en %s' % arregla(r['archivo'], f))
    print('qa_pixel: %d sprites, %d fallos' % (len(res), malos))
    return 1 if malos else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
