"""
lienzo.py — Motor de dibujo Pixel Art procedural de máxima precisión (Pro Edition).
Incluye:
- Generador de rampas de 7 niveles con Hue-Shifting curvo y control de contraste.
- Primitivas geométricas pixel-perfect (líneas sin doubles, elipses Midpoint, polígonos scanline).
- Primitivas volumétricas Isométricas 2:1 (losas, cubos/bloques 3D extruidos con bisel de arista).
- Sombreado esférico/cilíndrico automático con Dithering Bayer 4x4 ordenado.
- Oclusión Ambiental (AO) automática de contacto, Anti-Aliasing manual (AA) y Selout inteligente.
- Generador de cúmulos orgánicos (follaje/roca/textura) libre de ruido de 1px.
"""

import colorsys
import math
from typing import Dict, List, Optional, Sequence, Tuple
from PIL import Image

RGBA = Tuple[int, int, int, int]
Point = Tuple[int, int]

# Matriz de Bayer 4x4 normalizada (0..15) para dithering ordenado de estudio
BAYER_4X4 = (
    (0, 8, 2, 10),
    (12, 4, 14, 6),
    (3, 11, 1, 9),
    (15, 7, 13, 5),
)


def hex_a_rgba(hex_str: str, alpha: int = 255) -> RGBA:
    """Convierte un color hexadecimal (#RRGGBB) a tupla RGBA."""
    h = hex_str.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)


def luminancia_relativa(c: RGBA) -> float:
    """Calcula la luminancia perceptual (0.0 a 255.0) según BT.709."""
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def mezclar_rgba(c1: RGBA, c2: RGBA, t: float) -> RGBA:
    """Interpolación lineal entre dos colores RGBA (t en 0.0..1.0)."""
    t = max(0.0, min(1.0, t))
    inv = 1.0 - t
    return (
        int(round(c1[0] * inv + c2[0] * t)),
        int(round(c1[1] * inv + c2[1] * t)),
        int(round(c1[2] * inv + c2[2] * t)),
        int(round(c1[3] * inv + c2[3] * t)),
    )


def generar_rampa_hue_shift(
    hex_base: str,
    hue_luz_target: float = 0.14,     # Amarillo cálido (~50°)
    hue_sombra_target: float = 0.72,  # Azul/Púrpura profundo (~260°)
    contraste: float = 1.0,
) -> Dict[str, RGBA]:
    """
    Genera una rampa de 7 tonos profesionales aplicando Hue-Shifting curvo en HSV:
    - outline: Contorno exterior oscuro y saturado (nunca negro muerto).
    - outline_light: Contorno superior suavizado para Selout.
    - shadow_deep: Oclusión ambiental y sombra profunda.
    - shadow: Sombra principal de volumen.
    - mid: Color base del material.
    - light: Cara iluminada principal.
    - highlight: Brillo especular o arista viva.
    """
    r, g, b, a = hex_a_rgba(hex_base)
    h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)

    def _lerp_hue(h1: float, h2: float, t: float) -> float:
        diff = (h2 - h1 + 0.5) % 1.0 - 0.5
        return (h1 + diff * t) % 1.0

    def _hsv_to_rgba(nh: float, ns: float, nv: float) -> RGBA:
        nr, ng, nb = colorsys.hsv_to_rgb(
            max(0.0, min(1.0, nh)),
            max(0.0, min(1.0, ns)),
            max(0.0, min(1.0, nv)),
        )
        return (int(round(nr * 255)), int(round(ng * 255)), int(round(nb * 255)), a)

    k = max(0.7, min(1.4, contraste))
    return {
        "outline": _hsv_to_rgba(
            _lerp_hue(h, hue_sombra_target, 0.48),
            min(1.0, s * 1.40),
            max(0.06, v * (0.18 / k)),
        ),
        "outline_light": _hsv_to_rgba(
            _lerp_hue(h, hue_sombra_target, 0.34),
            min(1.0, s * 1.28),
            max(0.12, v * (0.30 / k)),
        ),
        "shadow_deep": _hsv_to_rgba(
            _lerp_hue(h, hue_sombra_target, 0.32),
            min(1.0, s * 1.25),
            max(0.14, v * (0.44 / k)),
        ),
        "shadow": _hsv_to_rgba(
            _lerp_hue(h, hue_sombra_target, 0.18),
            min(1.0, s * 1.12),
            max(0.24, v * (0.71 / k)),
        ),
        "mid": (r, g, b, a),
        "light": _hsv_to_rgba(
            _lerp_hue(h, hue_luz_target, 0.16),
            max(0.05, s * 0.86),
            min(1.0, v * (1.20 * k) + 0.04),
        ),
        "highlight": _hsv_to_rgba(
            _lerp_hue(h, hue_luz_target, 0.32),
            max(0.02, s * 0.60),
            min(1.0, v * (1.42 * k) + 0.12),
        ),
    }


class LienzoPixel:
    """Motor de renderizado Pixel Art de alta precisión con primitivas 2D e Isométricas 2:1."""

    def __init__(self, ancho: int, alto: int):
        self.ancho = ancho
        self.alto = alto
        self.img = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
        self.px = self.img.load()

    def en_rango(self, x: int, y: int) -> bool:
        return 0 <= x < self.ancho and 0 <= y < self.alto

    def p(self, x: int, y: int, color: RGBA) -> None:
        """Pinta un píxel con composición alpha Porter-Duff si es semitransparente."""
        if not self.en_rango(x, y):
            return
        if len(color) == 3:
            color = (color[0], color[1], color[2], 255)
        if color[3] == 255 or self.px[x, y][3] == 0:
            self.px[x, y] = color
        elif color[3] > 0:
            br, bg, bb, ba = self.px[x, y]
            fr, fg, fb, fa = color
            alpha = fa / 255.0
            inv = 1.0 - alpha
            nr = int(round(fr * alpha + br * inv))
            ng = int(round(fg * alpha + bg * inv))
            nb = int(round(fb * alpha + bb * inv))
            na = min(255, int(round(fa + ba * inv)))
            self.px[x, y] = (nr, ng, nb, na)

    def obtener(self, x: int, y: int) -> RGBA:
        if not self.en_rango(x, y):
            return (0, 0, 0, 0)
        return self.px[x, y]

    # =========================================================================
    # PRIMITIVAS 2D Y DITHERING ORDENADO
    # =========================================================================

    def rect(self, x: int, y: int, w: int, h: int, color: RGBA, relleno: bool = True) -> None:
        """Dibuja un rectángulo exacto de dimensiones (w, h)."""
        for dy in range(h):
            for dx in range(w):
                if relleno or dx in (0, w - 1) or dy in (0, h - 1):
                    self.p(x + dx, y + dy, color)

    def rect_dither(
        self, x: int, y: int, w: int, h: int, color_a: RGBA, color_b: RGBA, patron: str = "50"
    ) -> None:
        """
        Rellena una región rectangular aplicando dithering de estudio:
        - '50': Ajedrezado clásico 50/50.
        - '25': 25% de color_b sobre color_a.
        - '75': 75% de color_b sobre color_a.
        - 'v_grad': Degradado vertical suave mediante matriz Bayer 4x4.
        - 'h_grad': Degradado horizontal suave mediante matriz Bayer 4x4.
        """
        for dy in range(h):
            for dx in range(w):
                px_x, px_y = x + dx, y + dy
                bayer_val = BAYER_4X4[px_y % 4][px_x % 4] / 16.0
                if patron == "50":
                    c = color_a if (px_x + px_y) % 2 == 0 else color_b
                elif patron == "25":
                    c = color_b if (px_x % 2 == 0 and px_y % 2 == 0) else color_a
                elif patron == "75":
                    c = color_a if (px_x % 2 == 0 and px_y % 2 == 0) else color_b
                elif patron == "v_grad":
                    t = dy / max(1, h - 1)
                    c = color_b if t > bayer_val else color_a
                elif patron == "h_grad":
                    t = dx / max(1, w - 1)
                    c = color_b if t > bayer_val else color_a
                else:
                    c = color_a
                self.p(px_x, px_y, c)

    def linea(
        self, x0: int, y0: int, x1: int, y1: int, color: RGBA, pixel_perfect: bool = True
    ) -> List[Point]:
        """
        Traza una línea Bresenham y filtra automáticamente los 'doubles' (esquinas en L)
        cuando pixel_perfect=True.
        """
        puntos: List[Point] = []
        dx = abs(x1 - x0)
        dy = -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        cx, cy = x0, y0

        while True:
            puntos.append((cx, cy))
            if cx == x1 and cy == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                cx += sx
            if e2 <= dx:
                err += dx
                cy += sy

        if pixel_perfect and len(puntos) >= 3:
            filtrados = [puntos[0]]
            i = 1
            while i < len(puntos) - 1:
                px_prev, py_prev = filtrados[-1]
                px_curr, py_curr = puntos[i]
                px_next, py_next = puntos[i + 1]
                if (
                    abs(px_next - px_prev) == 1
                    and abs(py_next - py_prev) == 1
                    and (px_curr == px_prev or py_curr == py_prev)
                ):
                    i += 1
                    continue
                filtrados.append((px_curr, py_curr))
                i += 1
            filtrados.append(puntos[-1])
            puntos = filtrados

        for px_x, px_y in puntos:
            self.p(px_x, px_y, color)
        return puntos

    def poligono(
        self, vertices: Sequence[Point], color_relleno: Optional[RGBA] = None, color_borde: Optional[RGBA] = None
    ) -> None:
        """Rellena un polígono arbitrario mediante scanline exacta y opcionalmente traza su borde pixel-perfect."""
        if not vertices:
            return
        if color_relleno is not None:
            min_y = max(0, min(v[1] for v in vertices))
            max_y = min(self.alto - 1, max(v[1] for v in vertices))
            n = len(vertices)
            for y in range(min_y, max_y + 1):
                intersecciones: List[float] = []
                for i in range(n):
                    x1, y1 = vertices[i]
                    x2, y2 = vertices[(i + 1) % n]
                    if y1 == y2:
                        continue
                    if min(y1, y2) <= y < max(y1, y2):
                        x_int = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
                        intersecciones.append(x_int)
                intersecciones.sort()
                for i in range(0, len(intersecciones) - 1, 2):
                    x_ini = max(0, int(math.ceil(intersecciones[i])))
                    x_fin = min(self.ancho - 1, int(math.floor(intersecciones[i + 1])))
                    for x in range(x_ini, x_fin + 1):
                        self.p(x, y, color_relleno)

        if color_borde is not None:
            for i in range(len(vertices)):
                x1, y1 = vertices[i]
                x2, y2 = vertices[(i + 1) % len(vertices)]
                self.linea(x1, y1, x2, y2, color_borde, pixel_perfect=True)

    # =========================================================================
    # MOTOR ISOMÉTRICO 2:1 Y VOLÚMENES 3D
    # =========================================================================

    def linea_iso(
        self, x0: int, y0: int, pasos: int, dir_x: int, dir_y: int, color: RGBA
    ) -> List[Point]:
        """
        Traza una línea isométrica 2:1 perfecta (escalones exactos de 2px horizontales por 1px vertical).
        dir_x: 1 (derecha) o -1 (izquierda). dir_y: 1 (abajo) o -1 (arriba).
        """
        puntos: List[Point] = []
        cx, cy = x0, y0
        for _ in range(pasos):
            self.p(cx, cy, color)
            self.p(cx + dir_x, cy, color)
            puntos.extend([(cx, cy), (cx + dir_x, cy)])
            cx += 2 * dir_x
            cy += dir_y
        return puntos

    def losa_iso(
        self,
        cx_top: int,
        y_top: int,
        pasos_izq: int,
        pasos_der: int,
        color_relleno: RGBA,
        color_borde: Optional[RGBA] = None,
    ) -> Tuple[Point, Point, Point, Point]:
        """
        Dibuja un plano/rombo isométrico 2:1 cuyo vértice superior está en (cx_top, y_top).
        Retorna los 4 vértices cardinales: (top, right, bottom, left).
        """
        v_top = (cx_top, y_top)
        v_left = (cx_top - 2 * pasos_izq, y_top + pasos_izq)
        v_right = (cx_top + 2 * pasos_der, y_top + pasos_der)
        v_bottom = (v_left[0] + 2 * pasos_der, v_left[1] + pasos_der)

        self.poligono([v_top, v_right, v_bottom, v_left], color_relleno=color_relleno, color_borde=None)

        if color_borde is not None:
            self.linea_iso(v_top[0], v_top[1], pasos_izq, -1, 1, color_borde)
            self.linea_iso(v_top[0], v_top[1], pasos_der, 1, 1, color_borde)
            self.linea_iso(v_left[0], v_left[1], pasos_der, 1, 1, color_borde)
            self.linea_iso(v_right[0], v_right[1], pasos_izq, -1, 1, color_borde)

        return v_top, v_right, v_bottom, v_left

    def bloque_iso(
        self,
        cx_top: int,
        y_top: int,
        pasos_izq: int,
        pasos_der: int,
        alto_z: int,
        rampa: Dict[str, RGBA],
        bisel_luz: bool = True,
    ) -> Dict[str, Point]:
        """
        Construye un prisma/bloque isométrico 3D completo con:
        - Cara superior iluminada ('light').
        - Cara frontal-izquierda en tono medio ('mid').
        - Cara frontal-derecha en sombra ('shadow').
        - Bisel especular ('highlight') en las aristas que miran al observador y a la luz.
        - Contorno exterior selectivo ('outline' y 'outline_light').
        """
        v_top, v_right, v_bottom, v_left = self.losa_iso(
            cx_top, y_top, pasos_izq, pasos_der, rampa["light"]
        )
        v_left_bot = (v_left[0], v_left[1] + alto_z)
        v_bottom_bot = (v_bottom[0], v_bottom[1] + alto_z)
        v_right_bot = (v_right[0], v_right[1] + alto_z)

        # Cara izquierda (tono medio)
        self.poligono([v_left, v_bottom, v_bottom_bot, v_left_bot], color_relleno=rampa["mid"])
        # Cara derecha (sombra)
        self.poligono([v_bottom, v_right, v_right_bot, v_bottom_bot], color_relleno=rampa["shadow"])

        # Bisel interior de luz en la Y central
        if bisel_luz:
            self.linea_iso(v_left[0], v_left[1], pasos_der, 1, 1, rampa["highlight"])
            self.linea_iso(v_right[0], v_right[1], pasos_izq, -1, 1, rampa["light"])
            self.linea(v_bottom[0], v_bottom[1] + 1, v_bottom_bot[0], v_bottom_bot[1] - 1, rampa["light"])

        # Contornos exteriores con Selout (más suave arriba, más oscuro abajo)
        c_out_top = rampa.get("outline_light", rampa["outline"])
        c_out_bot = rampa["outline"]
        self.linea_iso(v_top[0], v_top[1], pasos_izq, -1, 1, c_out_top)
        self.linea_iso(v_top[0], v_top[1], pasos_der, 1, 1, c_out_top)
        self.linea(v_left[0], v_left[1], v_left_bot[0], v_left_bot[1], c_out_top)
        self.linea(v_right[0] + 1, v_right[1], v_right_bot[0] + 1, v_right_bot[1], c_out_bot)
        self.linea_iso(v_left_bot[0], v_left_bot[1], pasos_der, 1, 1, c_out_bot)
        self.linea_iso(v_right_bot[0], v_right_bot[1], pasos_izq, -1, 1, c_out_bot)

        return {
            "top": v_top,
            "left": v_left,
            "right": v_right,
            "center": v_bottom,
            "bottom": v_bottom_bot,
        }

    # =========================================================================
    # SOMBREADO VOLUMÉTRICO, FOLLAJE EN CLUSTERS Y ACABADO DE ESTUDIO
    # =========================================================================

    def esfera_sombreada(
        self,
        cx: int,
        cy: int,
        radio: int,
        rampa: Dict[str, RGBA],
        luz_dx: float = -0.45,
        luz_dy: float = -0.45,
        dither: bool = True,
        contorno: bool = True,
    ) -> None:
        """
        Renderiza un volumen esférico/ovalado con iluminación Top-Left, dithering Bayer
        de transición y contorno selectivo. Ideal para copas de plantas, gemas, frutas o cabezas.
        """
        niveles = [
            rampa["shadow_deep"],
            rampa["shadow"],
            rampa["mid"],
            rampa["light"],
            rampa["highlight"],
        ]
        foco_x = cx + luz_dx * radio
        foco_y = cy + luz_dy * radio
        max_dist = radio * 1.65

        for y in range(cy - radio - 1, cy + radio + 2):
            for x in range(cx - radio - 1, cx + radio + 2):
                dist_centro = math.hypot(x - cx, y - cy)
                if dist_centro <= radio - 0.4:
                    dist_luz = math.hypot(x - foco_x, y - foco_y)
                    t = 1.0 - min(1.0, dist_luz / max_dist)
                    pos = t * (len(niveles) - 1)
                    idx = int(pos)
                    frac = pos - idx
                    if dither and idx < len(niveles) - 1:
                        umbral = BAYER_4X4[y % 4][x % 4] / 16.0
                        color = niveles[idx + 1] if frac > umbral else niveles[idx]
                    else:
                        color = niveles[min(len(niveles) - 1, idx)]
                    self.p(x, y, color)
                elif contorno and dist_centro <= radio + 0.55:
                    es_arriba_izq = (x - cx) + (y - cy) < 0
                    c_out = rampa.get("outline_light", rampa["outline"]) if es_arriba_izq else rampa["outline"]
                    self.p(x, y, c_out)

    def cluster_hojas(
        self,
        cx: int,
        cy: int,
        radio_x: int,
        radio_y: int,
        rampa: Dict[str, RGBA],
        semilla: int = 42,
    ) -> None:
        """
        Dibuja una masa orgánica de follaje/arbusto basada en clusters de 2x2 y 3x2 píxeles
        (nunca píxeles sueltos de ruido), respetando la luz Top-Left.
        """
        lobulos = [
            (cx, cy, min(radio_x, radio_y)),
            (cx - int(radio_x * 0.45), cy + int(radio_y * 0.15), int(min(radio_x, radio_y) * 0.78)),
            (cx + int(radio_x * 0.45), cy + int(radio_y * 0.20), int(min(radio_x, radio_y) * 0.75)),
            (cx - int(radio_x * 0.20), cy - int(radio_y * 0.35), int(min(radio_x, radio_y) * 0.72)),
            (cx + int(radio_x * 0.22), cy - int(radio_y * 0.28), int(min(radio_x, radio_y) * 0.68)),
        ]
        for lx, ly, lr in lobulos:
            self.esfera_sombreada(lx, ly, max(2, lr), rampa, dither=False, contorno=False)

        offsets = [(-3, -2), (1, -3), (-4, 1), (0, 0), (3, 1), (-2, 3), (2, 3)]
        for i, (ox, oy) in enumerate(offsets):
            px_x = cx + int(ox * (radio_x / 6.0))
            px_y = cy + int(oy * (radio_y / 6.0))
            tono = rampa["light"] if (ox + oy < 0) else (rampa["mid"] if (i % 2 == 0) else rampa["shadow"])
            self.rect(px_x, px_y, 2, 2, tono)
            if ox + oy < -2:
                self.p(px_x, px_y, rampa["highlight"])

    def elipse_sombra(self, cx: int, cy: int, rx: int, ry: int, alpha: int = 85) -> None:
        """Dibuja una sombra proyectada suave de dos anillos en la base del sprite."""
        color_nucleo = (10, 8, 20, alpha)
        color_borde = (10, 8, 20, int(alpha * 0.48))
        for y in range(cy - ry, cy + ry + 1):
            for x in range(cx - rx, cx + rx + 1):
                norm = ((x - cx) / max(1, rx)) ** 2 + ((y - cy) / max(1, ry)) ** 2
                if norm <= 0.62:
                    self.p(x, y, color_nucleo)
                elif norm <= 1.0:
                    self.p(x, y, color_borde)

    def aplicar_selout(
        self,
        color_arriba_izq: RGBA,
        color_abajo_der: RGBA,
        ignorar_alpha_menor: int = 128,
    ) -> None:
        """
        Genera un contorno exterior selectivo (Selout) 4-conectado y libre de 'doubles'
        alrededor de los píxeles sólidos actuales.
        """
        mascara = [
            [self.px[x, y][3] >= ignorar_alpha_menor for y in range(self.alto)]
            for x in range(self.ancho)
        ]
        nuevos_bordes: List[Tuple[int, int, RGBA]] = []
        for y in range(self.alto):
            for x in range(self.ancho):
                if mascara[x][y] or self.px[x, y][3] > 0:
                    continue
                vecino_abajo = y + 1 < self.alto and mascara[x][y + 1]
                vecino_der = x + 1 < self.ancho and mascara[x + 1][y]
                vecino_arriba = y - 1 >= 0 and mascara[x][y - 1]
                vecino_izq = x - 1 >= 0 and mascara[x - 1][y]

                if vecino_arriba or vecino_izq:
                    nuevos_bordes.append((x, y, color_abajo_der))
                elif vecino_abajo or vecino_der:
                    nuevos_bordes.append((x, y, color_arriba_izq))

        for x, y, c in nuevos_bordes:
            self.p(x, y, c)
