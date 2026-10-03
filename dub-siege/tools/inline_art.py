#!/usr/bin/env python3
"""Mete las tiras de art/ dentro de dub-siege.html, entre las marcas <ART>.

Las imagenes viajan como data: URI para que el juego siga siendo un solo
fichero. Cada entrada declara el tamano LOGICO del fotograma (fw, fh); la tira
tiene SC veces ese tamano, o sea 1:1 con el lienzo.
"""
import base64, io, json, os, re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(HERE, 'art')
HTML = os.path.join(HERE, 'dub-siege.html')
A, B = '/* <ART> */', '/* </ART> */'


def main():
    man = json.load(open(os.path.join(ART, 'manifest.json')))
    out, total = [], 0
    for k in sorted(man):
        d = man[k]
        f = os.path.join(ART, k + '.png')
        if not os.path.exists(f):
            print('falta', f); continue
        raw = open(f, 'rb').read(); total += len(raw)
        out.append("  %s:{fw:%d,fh:%d,n:%d,src:'data:image/png;base64,%s'}"
                   % (k, d['fw'], d['fh'], d.get('n', 1),
                      base64.b64encode(raw).decode()))
    blk = A + '\nvar ART={\n' + ',\n'.join(out) + '\n};\n' + B
    s = io.open(HTML, encoding='utf-8').read()
    i, j = s.index(A), s.index(B) + len(B)
    io.open(HTML, 'w', encoding='utf-8').write(s[:i] + blk + s[j:])
    print('%d hojas, %d KB de PNG' % (len(out), total // 1024))


if __name__ == '__main__':
    main()
