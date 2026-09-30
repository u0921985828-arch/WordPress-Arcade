#!/usr/bin/env python3
"""Recomprime las miniaturas de una copia del plugin (mismo tamaño, menos peso)."""
import sys, pathlib
from PIL import Image
root = pathlib.Path(sys.argv[1]); q = int(sys.argv[2]) if len(sys.argv) > 2 else 58
a = b = n = 0
for p in sorted(root.rglob('thumb.webp')):
    o = p.stat().st_size; a += o
    im = Image.open(p).convert('RGB')
    im.save(p, 'WEBP', quality=q, method=6)
    if p.stat().st_size >= o:      # si no mejora, se deja como estaba
        b += o
    else:
        b += p.stat().st_size; n += 1
print(f'thumbs: {n} recomprimidas, {a/1048576:.2f} -> {b/1048576:.2f} MB')
