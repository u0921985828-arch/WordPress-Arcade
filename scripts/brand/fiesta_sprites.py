"""Genera los 16 personajes del modo fiesta (pixel art, por código).
Uso: python3 scripts/brand/fiesta_sprites.py
"""
import os, zlib, struct

import zlib, struct
def _png(w,h,rgba):
    def chunk(t,d): 
        return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    raw=bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw+=bytes(rgba[y*w+x])
    sig=b'\x89PNG\r\n\x1a\n'
    ihdr=struct.pack('>IIBBBBB',w,h,8,6,0,0,0)
    return sig+chunk(b'IHDR',ihdr)+chunk(b'IDAT',zlib.compress(bytes(raw),9))+chunk(b'IEND',b'')
def hx(h):
    h=h.lstrip('#'); return (int(h[0:2],16),int(h[2:4],16),int(h[4:6],16),255)
def render(grid, pal, scale=1, out='out.png'):
    rows=[r for r in grid]; H=len(rows); W=max(len(r) for r in rows)
    T=(0,0,0,0)
    base=[]
    for y in range(H):
        for x in range(W):
            c=rows[y][x] if x<len(rows[y]) else '.'
            base.append(T if c in '. ' else hx(pal[c]))
    if scale==1:
        data=base; w,h=W,H
    else:
        w,h=W*scale,H*scale; data=[None]*(w*h)
        for y in range(H):
            for x in range(W):
                px=base[y*W+x]
                for dy in range(scale):
                    for dx in range(scale):
                        data[(y*scale+dy)*w+(x*scale+dx)]=px
    open(out,'wb').write(_png(w,h,data))
    return W,H

import os
PAL={
 '.':None,' ':None,
 'K':'#1a1530','W':'#ffffff','w':'#c7cbe6','c':'#ff9ec7',
 'I':'#6e62f5','i':'#5a50c8','H':'#a097ff','h':'#837bd1',
 'G':'#ffc94d','g':'#d1a43f','o':'#8a6a1f',
 'R':'#e23b3b','r':'#b02e2e','S':'#efe3c8','s':'#d8cdb0',
 'N':'#a8cf3f','n':'#89a933','B':'#5b8cff','b':'#4a72d1',
 'P':'#ff6fb5','p':'#d15b94','O':'#ff8a3d','q':'#d16a24',
 'L':'#9aa6c8','l':'#7a86a8','M':'#6b7596',
 'V':'#2a2140','v':'#1f1833','Z':'#463ac4','U':'#6a4fd0',
}
S={}
S['kubo']=[
"................","....KKKKKKKK....","...KIIIIIIIIK...","..KIHHHHHHHHIK..",
"..KIIIIIIIIIIK..","..KIWWIIIIWWIK..","..KIWKIIIIWKIK..","..KIIIIIIIIIIK..",
"..KIcIIIIIIcIK..","..KIIKIIIIKIIK..","..KIIKKKKKKIIK..","..KIiiiiiiiiIK..",
"..KKKKKKKKKKKK..","...K..K..K..K...","...KK.KK.KK.KK..","................"]
S['pila']=[
".....KKKK.......",".....KNNK.......","...KKKNNKKK.....","..KNNNNNNNNK....",
"..KNHHHHHHNK....","..KNWWNNWWNK....","..KNWKNNWKNK....","..KNNNNNNNNK....",
"..KNcNNNNcNK....","..KNNKKKKNNK....","..KNNNNNNNNK....","..KNnnnnnnNK....",
"..KNNNNNNNNK....","..KKKKKKKKKK....","...K..KK..K.....","................"]
S['nam']=[
"................","....KKKKKKK.....","...KPPPPPPPK....","..KPHHHHHHPK....",
"..KPWWPPWWPPK...","..KPWKPPWKPPK...","..KPPPPPPPPPK...","..KKKKKKKKKKK...",
".KPKWWWWWWWKPK..",".KPKWWWWWWWKPK..","..KKRRRRRRRKK...","...KpppppppK....",
"...KPPPPPPPK....","....KKKKKKK.....","................","................"]
S['grulla']=[
"................","........KKKK....",".......KHWWK....","......KHWKHK.OK.",
"......KHHHKKOK..","......KHHHK.....",".....KHHHK......","....KHHHK.......",
"...KHHHKKK......","..KHHHHHHHK.....","..KHHWKHHHK.....","..KHHHHHHHK.....",
"..KHhhhhhhK.....","...KhhhhhK......","....KKKKK.......","................"]
S['vacio']=[
"................","....KKKKKKKK....","...KVVVVVVVVK...","..KVVVVVVVVVVK..",
".KHVVVVVVVVVVHK.","..KVHHVVVVHHVK..","..KVHKVVVVHKVK..","..KVVVVVVVVVVK..",
".HKVVVVVVVVVVKH.","..KVVKKKKKKVVK..","..KVVVVVVVVVVK..","..KVvvvvvvvvVK..",
"...KVVVVVVVVK...","..H.KVVVVVVK.H..","....KK....KK....","................"]
S['chispa']=[
"........KKK.....",".......KGGK.....","......KGGGK.....",".....KGGGGK.....",
"....KGGGGGK.....","...KGGWWGGKKK...","..KGGGWKGGGGK...",".KGGGGGGGGGK....",
"KGGGWKGGGGK.....","KgKKKGGGGK......","....KGGGK.......","...KGGGK........",
"...KGGK.........","..KGGK..........","..KGK...........","..KK............"]
S['dado']=[
"................","...KKKKKKKKKK...","..KWWWWWWWWWWK..",".KWWKWWWWWWKWWK.",
".KWWKWWWWWWKWWK.",".KWWWWWWWWWWWWK.",".KWWWWWKKWWWWWK.",".KWWWWWKKWWWWWK.",
".KWWWWWWWWWWWWK.",".KWWKWWWWWWKWWK.",".KWWKWWWWWWKWWK.","..KWwwwwwwwwWK..",
"...KKKKKKKKKK...","...K......K.....","..KK......KK....","................"]
S['prisma']=[
".......KK.......","......KHHK......",".....KHWHHK.....","....KHWHHHHK....",
"...KHWHHHHHHK...","..KHWHHHHHHHHK..",".KHHHHHHHHHHHHK.","KHWWKHHHHKHhhHK.",
".KHhHHHHHHHHhK..","..KHhHHHHHHhK...","...KHhHHHHhK....","....KHhHHhK.....",
".....KHhhK......","......KHhK......",".......KK.......","................"]
S['seta']=[
"................","....KKKKKKKK....","..KKRRRRRRRRKK..",".KRRRWRRRRWRRRK.",
"KRRRRRRWRRRRRRK.","KRRWRRRRRRRWRRK.","KRRRRRRRRRRRRRK.",".KRrRRRRRRRRrRK.",
"..KKKKKKKKKKKK..","...KSSKWWKSSK...","...KSWKKKKWSK...","...KSScccSSK....",
"...KSSSSSSSSK...","...KSsssssssK...","...KKKKKKKKKK...","................"]
S['cohete']=[
".......KK.......","......KWWK......",".....KWOOWK....","....KOOOOOOK....",
"....KOWWWWOK....","....KOWBBWOK....","....KOWBBWOK....","....KOWWWWOK....",
"....KOOOOOOK....","...KOqOOOOqOK...","..KROKOOOOKORK.","..KRRKOqqOKRRK.",
"...KK.KOqOK.KK..",".....KOqqOK.....","......KqqK......",".......KK......."]
S['corona']=[
"................","..K....K....K...","..KK..KKK..KK...","..KGK.KGGK.KGK..",
"..KGKKKGGKKKGK..","..KGGGGPPGGGGK..","..KGGGPppPGGGK..","..KGGGGPPGGGGK..",
"..KGGGGGGGGGGK..","..KGWKGGGGWKGK..","..KGGGGGGGGGGK..","..KGggggggggGK..",
"..KGGGGGGGGGGK..","..KKKKKKKKKKKK..","................","................"]
S['robi']=[
".......KK.......",".......KK.......","....KKKKKKKK....","...KLLLLLLLLK...",
"..KLLLLLLLLLLK..",".KLKWWLLWWLKLK..",".KLKWKLLWKLKLK..",".KLLLLLLLLLLLK..",
".KLLLKKKKKKLLLK",".KLLLLLLLLLLLLK.","..KMLLLLLLLLMK..","..KMLLLLLLLLMK..",
"..KMLLLLLLLLMK..","...KKK....KKK...","...KlK....KlK...","...KK......KK..."]
S['fantasmin']=[
"................","....KKKKKK......","...KWWWWWWK.....","..KWWWWWWWWK....",
".KWWWWWWWWWWK...",".KWWKKWWKKWWK...",".KWKWWWWKWWWK...",".KWWWWWWWWWWK...",
".KWWWRRRRWWWK...",".KWWWWWWWWWWK...",".KWWWWWWWWWWK...",".KWwWwWwWwWwK...",
".KWKwKwKwKwKK...",".KK.KK.KK.KK....","................","................"]
S['pio']=[
"................",".......KK.......","......KBBK......",".....KBBBBK.....",
"....KBBBBBBK....","...KBWWBBWWBK...","...KBWKBBWKBK...","..KBBBBOOBBBBK..",
"..KBBBBOOBBBBK..","..KBBBBBBBBBBK..","...KBbBBBBbBK...","....KBBBBBBK....",
".....KBBBBK.....","....KO..OK......","...KOK..KOK.....","................"]
S['moneda']=[
"................","....KKKKKKKK....","...KGGGGGGGGK...","..KGGGWGGGGGK..",
".KGGGGGGWGGGGGK.",".KGGWGGGGGWGGGK.",".KGGGGWWWWGGGGK.",".KGGGWGggGWGGGK.",
".KGGGWGggGWGGGK.",".KGGGGWWWWGGGGK.",".KGGGGGGGGGGGGK.","..KGggggggggGK..",
"...KKKKKKKKKK...","...K..K..K..K...","..KK..KK.KK.KK..","................"]
S['mando']=[
"................","................","...KKKKKKKKKK...","..KUUUUUUUUUUK..",
".KUUUKUUUUUUUUK.",".KUKKKUUUUWWUUK.",".KUUUKUUUUWWUUK.",".KUUUUUUUUUPPUK.",
"KUUKUUUUUUUPPUKK","KUUKUUUUUUUUUKK.",".KKUUUUUUUUUKK..","..KKK....KKK....",
"................","................","................","................"]
# ---- salida: PNG 64x64 al plugin + hoja de contacto ----
HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(HERE,'..','..','wp-content','mu-plugins','arcade-core','assets','img','fiesta')
OUT=os.path.normpath(OUT)
os.makedirs(OUT,exist_ok=True)
order=['kubo','pila','nam','grulla','vacio','chispa','dado','prisma','seta','cohete','corona','robi','fantasmin','pio','moneda','mando']
for n in order:
    render(S[n],PAL,scale=4,out=os.path.join(OUT,n+'.png'))
cols=4; rows=4; cell=16; gap=2; comp=[]
for ry in range(rows):
    for y in range(cell):
        line=''
        for cx in range(cols):
            g=S[order[ry*cols+cx]]
            line+=(g[y] if y<len(g) else '.'*cell)+'.'*gap
        comp.append(line)
    comp+=['.'*(cols*(cell+gap))]*gap
render(comp,PAL,scale=8,out=os.path.join(HERE,'fiesta_sheet_preview.png'))
print('escritos',len(order),'sprites en',OUT)
