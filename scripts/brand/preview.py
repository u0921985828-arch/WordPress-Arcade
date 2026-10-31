"""
preview.py — Utilidades de exportación y previsualización profesional para sprites Pixel Art.
Genera:
- Escalados Nearest-Neighbor limpios (x8).
- Láminas de inspección triple (Fondo Oscuro + Rejilla, Fondo Claro Neutro, Silueta Pura + Escala 1x real).
- Vista previa de Tilesets en mosaico 3x3 sin costuras.
"""

from typing import Tuple
from PIL import Image, ImageDraw


def exportar_sprite(
    img: Image.Image,
    ruta_1x: str,
    ruta_x8: str = "",
    escala: int = 8,
) -> Tuple[str, str]:
    """
    Guarda el sprite original a 1x y su versión ampliada con Image.Resampling.NEAREST.
    """
    img.save(ruta_1x, "PNG")
    if not ruta_x8:
        ruta_x8 = ruta_1x.replace(".png", f"_x{escala}.png")
    w, h = img.size
    ampliada = img.resize((w * escala, h * escala), Image.Resampling.NEAREST)
    ampliada.save(ruta_x8, "PNG")
    return ruta_1x, ruta_x8


def generar_hoja_inspeccion(
    img: Image.Image,
    ruta_salida: str,
    escala: int = 8,
    mostrar_rejilla: bool = True,
) -> str:
    """
    Crea una lámina de presentación técnica con tres paneles:
    1. Izquierda: Fondo oscuro de estudio con rejilla de píxeles sutil.
    2. Centro: Fondo claro neutro para verificar el Selout y contraste de silueta.
    3. Derecha: Prueba de legibilidad de silueta sólida (negro sobre gris) + miniatura 1x real.
    4. Franja inferior: Muestras ordenadas de la paleta empleada.
    """
    img = img.convert("RGBA")
    w, h = img.size
    sw, sh = w * escala, h * escala
    pad = 14
    alto_paleta = 26

    ancho_total = sw * 3 + pad * 4
    alto_total = sh + pad * 3 + alto_paleta

    hoja = Image.new("RGBA", (ancho_total, alto_total), (22, 22, 30, 255))
    draw = ImageDraw.Draw(hoja)

    x1, y_top = pad, pad
    x2 = pad * 2 + sw
    x3 = pad * 3 + sw * 2

    draw.rectangle([x1, y_top, x1 + sw - 1, y_top + sh - 1], fill=(34, 34, 46, 255))
    draw.rectangle([x2, y_top, x2 + sw - 1, y_top + sh - 1], fill=(222, 218, 210, 255))
    draw.rectangle([x3, y_top, x3 + sw - 1, y_top + sh - 1], fill=(118, 122, 132, 255))

    ampliada = img.resize((sw, sh), Image.Resampling.NEAREST)
    hoja.alpha_composite(ampliada, (x1, y_top))
    hoja.alpha_composite(ampliada, (x2, y_top))

    silueta = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px_orig = img.load()
    px_sil = silueta.load()
    for py in range(h):
        for px_i in range(w):
            if px_orig[px_i, py][3] >= 128:
                px_sil[px_i, py] = (20, 22, 28, 255)
    silueta_amp = silueta.resize((sw, sh), Image.Resampling.NEAREST)
    hoja.alpha_composite(silueta_amp, (x3, y_top))

    draw.rectangle([x3 + sw - w - 6, y_top + 4, x3 + sw - 3, y_top + h + 7], fill=(34, 34, 46, 255))
    hoja.alpha_composite(img, (x3 + sw - w - 4, y_top + 6))

    if mostrar_rejilla and escala >= 6:
        for gx in range(0, sw, escala):
            draw.line([(x1 + gx, y_top), (x1 + gx, y_top + sh - 1)], fill=(255, 255, 255, 13))
        for gy in range(0, sh, escala):
            draw.line([(x1, y_top + gy), (x1 + sw - 1, y_top + gy)], fill=(255, 255, 255, 13))

    colores = sorted(
        {img.getpixel((x, y)) for y in range(h) for x in range(w) if img.getpixel((x, y))[3] >= 128},
        key=lambda c: 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2],
    )
    if colores:
        y_pal = y_top + sh + pad
        ancho_muestra = max(8, min(28, (ancho_total - pad * 2) // len(colores)))
        for idx, c in enumerate(colores):
            mx = pad + idx * ancho_muestra
            draw.rectangle([mx, y_pal, mx + ancho_muestra - 2, y_pal + alto_paleta - 4], fill=c)

    hoja.save(ruta_salida, "PNG")
    return ruta_salida


def generar_mosaico_tile(img: Image.Image, ruta_salida: str, repeticiones: int = 3, escala: int = 4) -> str:
    """
    Repite un tile en una cuadrícula NxN (por defecto 3x3) y la amplía con Nearest Neighbor
    para verificar que no existan costuras visibles en los bordes.
    """
    w, h = img.size
    mosaico = Image.new("RGBA", (w * repeticiones, h * repeticiones), (0, 0, 0, 0))
    for ry in range(repeticiones):
        for rx in range(repeticiones):
            mosaico.paste(img, (rx * w, ry * h))
    ampliado = mosaico.resize(
        (w * repeticiones * escala, h * repeticiones * escala), Image.Resampling.NEAREST
    )
    ampliado.save(ruta_salida, "PNG")
    return ruta_salida
