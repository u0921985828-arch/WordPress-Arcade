# Lienzo: utilidades de dibujo para pixel art a mano. Python 3 + Pillow.
# Copiado de Landrace Hunters (tools/sprites/a-mano/lienzo.py) para la skill sprites-a-mano.
# Un Lienzo es una imagen RGBA con alfa binario (0 o 255) y unas cuantas primitivas de píxel: nada se escala ni se suaviza.
import math, os
from PIL import Image

# la raíz contra la que resuelve guarda(): la carpeta de trabajo, o LIENZO_RAIZ
ROOT = os.environ.get('LIENZO_RAIZ', os.getcwd())
P = lambda *a: os.path.join(ROOT, *a)


def rgb(h):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


class Lienzo:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def p(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.px[x, y] = rgb(c) if isinstance(c, str) else c

    def g(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[x, y]
        return (0, 0, 0, 0)

    def lleno(self, x, y):
        return self.g(x, y)[3] > 0

    def r(self, x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.p(i, j, c)

    def hl(self, x0, x1, y, c):
        for i in range(x0, x1 + 1):
            self.p(i, y, c)

    def vl(self, x, y0, y1, c):
        for j in range(y0, y1 + 1):
            self.p(x, j, c)

    def caja(self, x, y, w, h, fondo, borde):
        self.r(x, y, w, h, borde)
        if w > 2 and h > 2:
            self.r(x + 1, y + 1, w - 2, h - 2, fondo)

    def contorno(self, c, solo_vacios=True):
        """pinta c en cada píxel vacío que toca (4 vecinos) uno lleno"""
        pts = []
        for y in range(self.h):
            for x in range(self.w):
                if self.lleno(x, y):
                    continue
                if any(self.lleno(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    pts.append((x, y))
        for x, y in pts:
            self.p(x, y, c)

    def pega(self, otro, ox, oy):
        for y in range(otro.h):
            for x in range(otro.w):
                c = otro.g(x, y)
                if c[3]:
                    self.p(ox + x, oy + y, c)

    def espejo(self):
        o = Lienzo(self.w, self.h)
        for y in range(self.h):
            for x in range(self.w):
                o.px[self.w - 1 - x, y] = self.px[x, y]
        return o

    def recorta(self, x, y, w, h):
        o = Lienzo(w, h)
        for j in range(h):
            for i in range(w):
                o.px[i, j] = self.g(x + i, y + j)
        return o

    def cambia(self, mapa):
        """cambia colores: mapa {'#rrggbb': '#rrggbb'}"""
        m = {rgb(a): rgb(b) for a, b in mapa.items()}
        for y in range(self.h):
            for x in range(self.w):
                c = self.px[x, y]
                if c in m:
                    self.px[x, y] = m[c]
        return self

    def colores(self):
        return {self.px[x, y] for y in range(self.h) for x in range(self.w) if self.px[x, y][3]}

    def guarda(self, *ruta):
        f = P(*ruta)
        os.makedirs(os.path.dirname(f), exist_ok=True)
        self.im.save(f)
        return f


def azar(sem):
    """generador determinista (LCG) para texturas: siempre el mismo dibujo"""
    s = [sem & 0x7fffffff or 1]

    def r():
        s[0] = (s[0] * 48271) % 0x7fffffff
        return s[0] / 0x7fffffff
    return r
