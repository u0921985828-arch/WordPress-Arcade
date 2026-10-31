"""
qa_pixel.py — Validador de calidad (QA) y Auto-Limpiador estático para Pixel Art.
Audita un sprite 1x buscando defectos de generación por código y ofrece corrección
automática de píxeles huérfanos y 'doubles' de contorno exterior:
1. Píxeles huérfanos (ruido de 1px sin vecinos del mismo color ni patrón de dithering).
2. Doubles en el contorno exterior (esquinas en L innecesarias que engrosan las líneas).
3. Rango dinámico de luminancia (contraste entre luces y sombras) y colisiones de color.
4. Encuadre, centrado y márgenes de seguridad.
"""

from collections import Counter
import math
from typing import Any, Dict, List, Tuple
from PIL import Image

RGBA = Tuple[int, int, int, int]
Point = Tuple[int, int]


def _luminancia(c: RGBA) -> float:
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def _distancia_rgb(c1: RGBA, c2: RGBA) -> float:
    return math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2)


def auditar_sprite(img: Image.Image, max_colores_recomendado: int = 24) -> Dict[str, Any]:
    """
    Analiza una imagen RGBA a resolución 1x y devuelve un informe detallado de calidad
    junto con las coordenadas exactas de posibles defectos.
    """
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    colores: Counter = Counter()
    opacos: List[Point] = []
    huerfanos: List[Point] = []
    doubles_contorno: List[Point] = []

    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if c[3] > 0:
                colores[c] += 1
            if c[3] >= 128:
                opacos.append((x, y))

    if not opacos:
        return {
            "aprobado": False,
            "puntuacion": 0,
            "errores": ["El lienzo está completamente vacío o transparente."],
        }

    xs = [p[0] for p in opacos]
    ys = [p[1] for p in opacos]
    bbox = (min(xs), min(ys), max(xs), max(ys))

    # 1. Detección de píxeles huérfanos (ignorando dithering ordenado y brillos especulares)
    for x, y in opacos:
        c = px[x, y]
        lum = _luminancia(c)
        mismo_cardinal = 0
        mismo_diag = 0
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and px[nx, ny] == c:
                mismo_cardinal += 1
        for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and px[nx, ny] == c:
                mismo_diag += 1

        if mismo_cardinal == 0 and mismo_diag < 2 and lum < 210:
            huerfanos.append((x, y))

    # 2. Detección de 'doubles' en píxeles de borde exterior
    def es_borde_exterior(bx: int, by: int) -> bool:
        if px[bx, by][3] < 128:
            return False
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = bx + dx, by + dy
            if not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] == 0:
                return True
        return False

    borde_set = {(x, y) for (x, y) in opacos if es_borde_exterior(x, y)}
    for x, y in borde_set:
        c = px[x, y]
        vecinos_c = [
            (x + dx, y + dy)
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]
            if (x + dx, y + dy) in borde_set and px[x + dx, y + dy] == c
        ]
        if len(vecinos_c) == 2:
            (x1, y1), (x2, y2) = vecinos_c
            if x1 != x2 and y1 != y2 and abs(x1 - x2) == 1 and abs(y1 - y2) == 1:
                doubles_contorno.append((x, y))

    # 3. Análisis de contraste perceptual y colores redundantes
    colores_solidos = [c for c in colores.keys() if c[3] >= 128]
    lums = [_luminancia(c) for c in colores_solidos]
    rango_lum = (max(lums) - min(lums)) if lums else 0.0

    pares_redundantes = 0
    for i in range(len(colores_solidos)):
        for j in range(i + 1, len(colores_solidos)):
            if _distancia_rgb(colores_solidos[i], colores_solidos[j]) < 9.0:
                pares_redundantes += 1

    # Cálculo de puntuación QA (0 a 100)
    puntuacion = 100
    avisos: List[str] = []

    if len(huerfanos) > 4:
        puntuacion -= min(25, (len(huerfanos) - 4) * 3)
        avisos.append(f"Se detectaron {len(huerfanos)} píxeles huérfanos aislados (ruido).")

    if len(doubles_contorno) > 6:
        puntuacion -= min(20, (len(doubles_contorno) - 6) * 2)
        avisos.append(f"Se detectaron {len(doubles_contorno)} posibles 'doubles' en el contorno.")

    if len(colores) > max_colores_recomendado:
        puntuacion -= 10
        avisos.append(
            f"Paleta demasiado amplia ({len(colores)} colores). Recomendado <= {max_colores_recomendado}."
        )

    if pares_redundantes > 0:
        puntuacion -= min(10, pares_redundantes * 2)
        avisos.append(f"Hay {pares_redundantes} pares de colores casi idénticos (distancia RGB < 9).")

    if rango_lum < 95.0 and len(colores_solidos) > 2:
        puntuacion -= 12
        avisos.append(f"Bajo contraste general (rango de luminancia {rango_lum:.1f}/255).")

    if bbox[0] == 0 or bbox[2] == w - 1 or bbox[1] == 0 or bbox[3] == h - 1:
        avisos.append("El sprite toca el borde exacto del lienzo (sin margen de 1px).")

    return {
        "aprobado": puntuacion >= 82,
        "puntuacion": max(0, puntuacion),
        "dimensiones": (w, h),
        "bbox": bbox,
        "total_colores": len(colores),
        "rango_luminancia": round(rango_lum, 1),
        "pixeles_huerfanos": len(huerfanos),
        "coords_huerfanos": huerfanos[:10],
        "posibles_doubles": len(doubles_contorno),
        "coords_doubles": doubles_contorno[:10],
        "avisos": avisos,
    }


def auto_limpiar_sprite(img: Image.Image) -> Tuple[Image.Image, int]:
    """
    Elimina automáticamente píxeles huérfanos internos absorbiéndolos al color
    mayoritario de sus 4 vecinos cardinales (sin tocar brillos ni contornos).
    Retorna (imagen_limpia, total_pixeles_corregidos).
    """
    copia = img.convert("RGBA").copy()
    w, h = copia.size
    px = copia.load()
    corregidos = 0

    for y in range(1, h - 1):
        for x in range(1, w - 1):
            c = px[x, y]
            if c[3] < 128 or _luminancia(c) >= 205:
                continue
            vecinos_card = [px[x + dx, y + dy] for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]]
            if any(vc[3] < 128 for vc in vecinos_card):
                continue
            if any(vc == c for vc in vecinos_card):
                continue
            vecinos_diag = [px[x + dx, y + dy] for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]]
            if sum(1 for vd in vecinos_diag if vd == c) >= 2:
                continue
            mas_comun = Counter(vecinos_card).most_common(1)[0][0]
            px[x, y] = mas_comun
            corregidos += 1

    return copia, corregidos


def imprimir_informe_qa(informe: Dict[str, Any]) -> None:
    """Imprime en consola un resumen legible de la auditoría QA."""
    estado = "APROBADO" if informe["aprobado"] else "REVISAR"
    print(f"=== AUDITORIA QA PIXEL ART [{estado} - {informe['puntuacion']}/100] ===")
    print(f"  Lienzo: {informe['dimensiones'][0]}x{informe['dimensiones'][1]} px | BBox: {informe['bbox']}")
    print(f"  Colores unicos: {informe['total_colores']} | Rango Luminancia: {informe.get('rango_luminancia', 0)}")
    print(f"  Pixeles huerfanos: {informe['pixeles_huerfanos']} | Doubles en borde: {informe['posibles_doubles']}")
    for aviso in informe.get("avisos", []):
        print(f"  [!] {aviso}")
