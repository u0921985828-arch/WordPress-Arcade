"""Personajes del modo fiesta (Kuboplay) - 16 sprites de pixel art a mano.
Dibujados con la skill sprites-a-mano (Lienzo + Pillow), sin generadores ni resize.
Ficha: celda 16x16, ancla pies-centro, vista alzado de frente, luz arriba-izquierda,
paleta cerrada del proyecto (contorno #1a1530). Salen a 1x (16x16, PNG transparente)
a wp-content/mu-plugins/arcade-core/assets/img/fiesta/<nombre>.png; el portal los
escala con image-rendering:pixelated.
Requiere Pillow: ejecutar con  python3.13 scripts/brand/fiesta_sprites.py
Regenera el mismo PNG siempre (idempotente).
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lienzo import Lienzo
PAL = {'.': None, ' ': None, 'K': '#1a1530', 'W': '#ffffff', 'w': '#c7cbe6', 'c': '#ff9ec7', 'I': '#6e62f5', 'i': '#5a50c8', 'H': '#a097ff', 'h': '#837bd1', 'G': '#ffc94d', 'g': '#d1a43f', 'o': '#8a6a1f', 'R': '#e23b3b', 'r': '#b02e2e', 'S': '#efe3c8', 's': '#d8cdb0', 'N': '#a8cf3f', 'n': '#89a933', 'B': '#5b8cff', 'b': '#4a72d1', 'P': '#ff6fb5', 'p': '#d15b94', 'O': '#ff8a3d', 'q': '#d16a24', 'L': '#9aa6c8', 'l': '#7a86a8', 'M': '#6b7596', 'V': '#2a2140', 'v': '#1f1833', 'Z': '#463ac4', 'U': '#6a4fd0'}

S = {'kubo': ['................', '....KKKKKKKK....', '...KIIIIIIIIK...', '..KIHHHHHHHHIK..', '..KIIIIIIIIIIK..', '..KIWWIIIIWWIK..', '..KIWKIIIIWKIK..', '..KIIIIIIIIIIK..', '..KIcIIIIIIcIK..', '..KIIKIIIIKIIK..', '..KIIKKKKKKIIK..', '..KIiiiiiiiiIK..', '..KKKKKKKKKKKK..', '...K..K..K..K...', '...KK.KK.KK.KK..', '................'], 'pila': ['.....KKKK.......', '.....KNNK.......', '...KKKNNKKK.....', '..KNNNNNNNNK....', '..KNHHHHHHNK....', '..KNWWNNWWNK....', '..KNWKNNWKNK....', '..KNNNNNNNNK....', '..KNcNNNNcNK....', '..KNNKKKKNNK....', '..KNNNNNNNNK....', '..KNnnnnnnNK....', '..KNNNNNNNNK....', '..KKKKKKKKKK....', '...K..KK..K.....', '................'], 'nam': ['................', '....KKKKKKK.....', '...KPPPPPPPK....', '..KPHHHHHHPK....', '..KPWWPPWWPPK...', '..KPWKPPWKPPK...', '..KPPPPPPPPPK...', '..KKKKKKKKKKK...', '.KPKWWWWWWWKPK..', '.KPKWWWWWWWKPK..', '..KKRRRRRRRKK...', '...KpppppppK....', '...KPPPPPPPK....', '....KKKKKKK.....', '................', '................'], 'grulla': ['................', '........KKKK....', '.......KHWWK....', '......KHWKHK.OK.', '......KHHHKKOK..', '......KHHHK.....', '.....KHHHK......', '....KHHHK.......', '...KHHHKKK......', '..KHHHHHHHK.....', '..KHHWKHHHK.....', '..KHHHHHHHK.....', '..KHhhhhhhK.....', '...KhhhhhK......', '....KKKKK.......', '................'], 'vacio': ['................', '....KKKKKKKK....', '...KVVVVVVVVK...', '..KVVVVVVVVVVK..', '.KHVVVVVVVVVVHK.', '..KVHHVVVVHHVK..', '..KVHKVVVVHKVK..', '..KVVVVVVVVVVK..', '.HKVVVVVVVVVVKH.', '..KVVKKKKKKVVK..', '..KVVVVVVVVVVK..', '..KVvvvvvvvvVK..', '...KVVVVVVVVK...', '..H.KVVVVVVK.H..', '....KK....KK....', '................'], 'chispa': ['........KKK.....', '.......KGGK.....', '......KGGGK.....', '.....KGGGGK.....', '....KGGGGGK.....', '...KGGWWGGKKK...', '..KGGGWKGGGGK...', '.KGGGGGGGGGK....', 'KGGGWKGGGGK.....', 'KgKKKGGGGK......', '....KGGGK.......', '...KGGGK........', '...KGGK.........', '..KGGK..........', '..KGK...........', '..KK............'], 'dado': ['................', '...KKKKKKKKKK...', '..KWWWWWWWWWWK..', '.KWWKWWWWWWKWWK.', '.KWWKWWWWWWKWWK.', '.KWWWWWWWWWWWWK.', '.KWWWWWKKWWWWWK.', '.KWWWWWKKWWWWWK.', '.KWWWWWWWWWWWWK.', '.KWWKWWWWWWKWWK.', '.KWWKWWWWWWKWWK.', '..KWwwwwwwwwWK..', '...KKKKKKKKKK...', '...K......K.....', '..KK......KK....', '................'], 'prisma': ['.......KK.......', '......KHHK......', '.....KHWHHK.....', '....KHWHHHHK....', '...KHWHHHHHHK...', '..KHWHHHHHHHHK..', '.KHHHHHHHHHHHHK.', 'KHWWKHHHHKHhhHK.', '.KHhHHHHHHHHhK..', '..KHhHHHHHHhK...', '...KHhHHHHhK....', '....KHhHHhK.....', '.....KHhhK......', '......KHhK......', '.......KK.......', '................'], 'seta': ['................', '....KKKKKKKK....', '..KKRRRRRRRRKK..', '.KRRRWRRRRWRRRK.', 'KRRRRRRWRRRRRRK.', 'KRRWRRRRRRRWRRK.', 'KRRRRRRRRRRRRRK.', '.KRrRRRRRRRRrRK.', '..KKKKKKKKKKKK..', '...KSSKWWKSSK...', '...KSWKKKKWSK...', '...KSScccSSK....', '...KSSSSSSSSK...', '...KSsssssssK...', '...KKKKKKKKKK...', '................'], 'cohete': ['.......KK.......', '......KWWK......', '.....KWOOWK....', '....KOOOOOOK....', '....KOWWWWOK....', '....KOWBBWOK....', '....KOWBBWOK....', '....KOWWWWOK....', '....KOOOOOOK....', '...KOqOOOOqOK...', '..KROKOOOOKORK.', '..KRRKOqqOKRRK.', '...KK.KOqOK.KK..', '.....KOqqOK.....', '......KqqK......', '.......KK.......'], 'corona': ['................', '..K....K....K...', '..KK..KKK..KK...', '..KGK.KGGK.KGK..', '..KGKKKGGKKKGK..', '..KGGGGPPGGGGK..', '..KGGGPppPGGGK..', '..KGGGGPPGGGGK..', '..KGGGGGGGGGGK..', '..KGWKGGGGWKGK..', '..KGGGGGGGGGGK..', '..KGggggggggGK..', '..KGGGGGGGGGGK..', '..KKKKKKKKKKKK..', '................', '................'], 'robi': ['.......KK.......', '.......KK.......', '....KKKKKKKK....', '...KLLLLLLLLK...', '..KLLLLLLLLLLK..', '.KLKWWLLWWLKLK..', '.KLKWKLLWKLKLK..', '.KLLLLLLLLLLLK..', '.KLLLKKKKKKLLLK', '.KLLLLLLLLLLLLK.', '..KMLLLLLLLLMK..', '..KMLLLLLLLLMK..', '..KMLLLLLLLLMK..', '...KKK....KKK...', '...KlK....KlK...', '...KK......KK...'], 'fantasmin': ['................', '....KKKKKK......', '...KWWWWWWK.....', '..KWWWWWWWWK....', '.KWWWWWWWWWWK...', '.KWWKKWWKKWWK...', '.KWKWWWWKWWWK...', '.KWWWWWWWWWWK...', '.KWWWRRRRWWWK...', '.KWWWWWWWWWWK...', '.KWWWWWWWWWWK...', '.KWwWwWwWwWwK...', '.KWKwKwKwKwKK...', '.KK.KK.KK.KK....', '................', '................'], 'pio': ['................', '.......KK.......', '......KBBK......', '.....KBBBBK.....', '....KBBBBBBK....', '...KBWWBBWWBK...', '...KBWKBBWKBK...', '..KBBBBOOBBBBK..', '..KBBBBOOBBBBK..', '..KBBBBBBBBBBK..', '...KBbBBBBbBK...', '....KBBBBBBK....', '.....KBBBBK.....', '....KO..OK......', '...KOK..KOK.....', '................'], 'moneda': ['................', '....KKKKKKKK....', '...KGGGGGGGGK...', '..KGGGWGGGGGK..', '.KGGGGGGWGGGGGK.', '.KGGWGGGGGWGGGK.', '.KGGGGWWWWGGGGK.', '.KGGGWGggGWGGGK.', '.KGGGWGggGWGGGK.', '.KGGGGWWWWGGGGK.', '.KGGGGGGGGGGGGK.', '..KGggggggggGK..', '...KKKKKKKKKK...', '...K..K..K..K...', '..KK..KK.KK.KK..', '................'], 'mando': ['................', '................', '...KKKKKKKKKK...', '..KUUUUUUUUUUK..', '.KUUUKUUUUUUUUK.', '.KUKKKUUUUWWUUK.', '.KUUUKUUUUWWUUK.', '.KUUUUUUUUUPPUK.', 'KUUKUUUUUUUPPUKK', 'KUUKUUUUUUUUUKK.', '.KKUUUUUUUUUKK..', '..KKK....KKK....', '................', '................', '................', '................']}

ORDER = ['kubo', 'pila', 'nam', 'grulla', 'vacio', 'chispa', 'dado', 'prisma', 'seta', 'cohete', 'corona', 'robi', 'fantasmin', 'pio', 'moneda', 'mando']

OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'wp-content', 'mu-plugins', 'arcade-core', 'assets', 'img', 'fiesta'))
os.makedirs(OUT, exist_ok=True)

def dibuja(grid):
    L = Lienzo(16, 16)
    for y, fila in enumerate(grid):
        for x, ch in enumerate(fila):
            L.p(x, y, PAL.get(ch))
    return L

for n in ORDER:
    dibuja(S[n]).guarda(os.path.join(OUT, n + '.png'))

GAP = 2; CELL = 16; step = CELL + GAP
hoja = Lienzo(4 * step - GAP, 4 * step - GAP)
for i, n in enumerate(ORDER):
    hoja.pega(dibuja(S[n]), (i % 4) * step, (i // 4) * step)
hoja.guarda(os.path.join(HERE, 'fiesta_sheet.png'))
print('escritos', len(ORDER), 'sprites 16x16 en', OUT)
