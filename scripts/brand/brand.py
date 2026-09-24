import random
from PIL import Image
OUT='/home/user/WordPress-Arcade/docs/brand/'
def hx(s): s=s.lstrip('#'); return tuple(int(s[i:i+2],16) for i in (0,2,4))
OL=hx('1a1530')
class C:
    def __init__(s,w,h,bg=(0,0,0)): s.w,s.h=w,h; s.im=Image.new('RGB',(w,h),bg); s.px=s.im.load()
    def p(s,x,y,c):
        if 0<=x<s.w and 0<=y<s.h: s.px[x,y]=c
    def rect(s,x,y,w,h,c):
        for yy in range(y,y+h):
            for xx in range(x,x+w): s.p(xx,yy,c)
    def save(s,name,k): s.im.resize((s.w*k,s.h*k),Image.NEAREST).save(OUT+name)
# ---------- cubo isométrico genérico (misma construcción que el logo) ----------
def cube_rows(hw,V=None,hl=True):
    V=V or hw-1; n=2*hw+1; rows=[]
    def half_to_full(h):
        right=h[:-1][::-1]; right=right.replace('L','R').replace('h','T'); return h+right
    q=hw//2
    for r in range(q):
        h=['.']*(hw+1); a=hw-1-2*r; h[a]='#'; h[a+1]='#'
        for x in range(a+2,hw+1): h[x]='T'
        if hl and 2<=r<=q-2:
            for x in (a+2,a+3): h[x]='h'
        rows.append(''.join(h))
    h=['T']*(hw+1); h[0]='#'; h[1]='#'; rows.append(''.join(h))
    for j in range(1,q):
        h=['T']*(hw+1); h[0]='#'
        for x in range(1,2*j): h[x]='L'
        h[2*j]='#'; h[2*j+1]='#'; rows.append(''.join(h))
    mid='#'+'L'*(hw-1)+'#'
    for _ in range(V): rows.append(mid)
    for j in range(1,q):
        h=['.']*(hw+1)
        h[2*j-1]='#'; h[2*j]='#'
        for x in range(2*j+1,hw): h[x]='L'
        h[hw]='#'; rows.append(''.join(h))
    h=['.']*(hw+1); h[hw-1]='#'; h[hw]='#'; rows.append(''.join(h))
    return [half_to_full(r) for r in rows]
PALS={
 'indigo':dict(T=hx('a097ff'),h=hx('d6d2ff'),L=hx('6e62f5'),R=hx('463ac4')),
 'pink':dict(T=hx('ffa9d4'),h=hx('ffe0f0'),L=hx('ff6fb5'),R=hx('c9468a')),
 'blue':dict(T=hx('a3bfff'),h=hx('e0eaff'),L=hx('5b8cff'),R=hx('3a60c9')),
 'green':dict(T=hx('d9f08f'),h=hx('f3fbd5'),L=hx('a8cf3f'),R=hx('769a24')),
 'yellow':dict(T=hx('ffe6a0'),h=hx('fff6da'),L=hx('ffc94d'),R=hx('d99a2b')),
 'night':dict(T=hx('2f2870'),h=hx('3a3284'),L=hx('221d55'),R=hx('17133d')),
 'night2':dict(T=hx('3b3389'),h=hx('4a41a0'),L=hx('2b2468'),R=hx('1d1849')),
}
def draw_rows(c,rows,x,y,pal,ol=OL):
    for j,r in enumerate(rows):
        for i,ch in enumerate(r):
            if ch=='.': continue
            c.p(x+i,y+j, ol if ch=='#' else pal[ch] if ch in pal else pal.get(ch,(255,255,255)))
def mini(c,x,y,pal,hw=8): draw_rows(c,cube_rows(hw),x,y,PALS[pal])
# ---------- logo (idéntico al de gen.py) ----------
LHALF=["...........##",".........##TT",".......##hhTT",".....##hhTTTT","...##hhTTTTTT",".##TTTTTTTTTT","##TTTTTTTTTTT","#L##TTTTTTTTT","#LLL##TTTTTTT","#LLLLL##TTTTT","#LLLLLLL##TTT","#LLLLLLLLL##T","#LLLLLLLLLLL#"]+["#LLLLLLLLLLL#"]*10+[".##LLLLLLLLL#","...##LLLLLLL#",".....##LLLLL#",".......##LLL#",".........##L#","...........##"]
LOGO=[list(r+r[:-1][::-1].replace('L','R').replace('h','T')) for r in LHALF]
for i,row in enumerate(["W....","WW...","WWW..","WWWW.","WWWWW","WWWW.","WWW..","WW...","W...."]):
    for j,ch in enumerate(row):
        if ch=='W': LOGO[14+i][16+j]='W'
LOGO=[''.join(r) for r in LOGO]
WF={'k':["111......"]*6+["111...111","111..111.","111.111..","111111...","11111....","111111...","111.111..","111..111.","111...111","111...111"],
'u':["........."]*6+["111...111"]*8+["111111111",".1111111."],
'b':["111......"]*6+["11111111.","111111111"]+["111...111"]*6+["111111111","11111111."],
'o':["........."]*6+[".1111111.","111111111"]+["111...111"]*6+["111111111",".1111111."]}
import kp
LG=kp.logo_grid()
def logo(c,x,y,word=None,shadow=None,light=False):
    pal=kp.LIGHT if light else kp.DARK
    draw_rows(c,LG,x,y,pal)
    return len(LG[0]),len(LG)
LW=len(LG[0])
# ---------- fuente 5x7 ----------
G=dict(
A=".###.|#...#|#...#|#####|#...#|#...#|#...#",B="####.|#...#|#...#|####.|#...#|#...#|####.",C=".###.|#...#|#....|#....|#....|#...#|.###.",
D="####.|#...#|#...#|#...#|#...#|#...#|####.",E="#####|#....|#....|####.|#....|#....|#####",F="#####|#....|#....|####.|#....|#....|#....",
G=".###.|#...#|#....|#.###|#...#|#...#|.####",H="#...#|#...#|#...#|#####|#...#|#...#|#...#",I="###|.#.|.#.|.#.|.#.|.#.|###",
J="..###|...#.|...#.|...#.|#..#.|#..#.|.##..",K="#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",L="#....|#....|#....|#....|#....|#....|#####",
M="#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",N="#...#|##..#|#.#.#|#..##|#...#|#...#|#...#",O=".###.|#...#|#...#|#...#|#...#|#...#|.###.",
P="####.|#...#|#...#|####.|#....|#....|#....",Q=".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",R="####.|#...#|#...#|####.|#.#..|#..#.|#...#",
S=".####|#....|#....|.###.|....#|....#|####.",T="#####|..#..|..#..|..#..|..#..|..#..|..#..",U="#...#|#...#|#...#|#...#|#...#|#...#|.###.",
V="#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",W="#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#",X="#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
Y="#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",Z="#####|....#|...#.|..#..|.#...|#....|#####",
**{'0':".###.|#...#|#...#|#...#|#...#|#...#|.###.",'1':".#.|##.|.#.|.#.|.#.|.#.|###",'2':".###.|#...#|....#|...#.|..#..|.#...|#####",
'3':"####.|....#|....#|.###.|....#|....#|####.",'4':"...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",'5':"#####|#....|####.|....#|....#|#...#|.###.",
'6':".###.|#....|#....|####.|#...#|#...#|.###.",'7':"#####|....#|...#.|..#..|.#...|.#...|.#...",'8':".###.|#...#|#...#|.###.|#...#|#...#|.###.",
'9':".###.|#...#|#...#|.####|....#|....#|.###.",'#':".#.#.|#####|.#.#.|.#.#.|.#.#.|#####|.#.#.",'·':".|.|.|#|.|.|.",'.':".|.|.|.|.|.|#",
' ':"..|..|..|..|..|..|..",'-':"...|...|...|###|...|...|...",'!':"#|#|#|#|#|.|#",':':".|#|.|.|.|#|.",'/':"....#|...#.|...#.|..#..|.#...|.#...|#...."})
ACC={'Ó':('O',"...#.|..#.."),'Í':('I',"..#|.#."),'Á':('A',"...#.|..#.."),'É':('E',"...#.|..#..")}
def glyph(ch):
    if ch in ACC:
        b,a=ACC[ch]; return a.split('|')+G[b].split('|')
    return ['.'*len(G[ch].split('|')[0])]*2+G[ch].split('|')
def tw(s,sc=1): return sum((len(glyph(ch)[0])+1)*sc for ch in s)-sc
def text(c,s,x,y,col,sh=None,sc=1):
    # y = línea superior de las mayúsculas (los acentos van 2 filas por encima)
    for pas in ((1,0) if sh else (0,)):
        xx=x
        for ch in s:
            g=glyph(ch)
            for j,r in enumerate(g):
                for i,v in enumerate(r):
                    if v=='#':
                        for a in range(sc):
                            for b in range(sc): c.p(xx+i*sc+a+pas*sc//max(sc,1)+ (pas if sc==1 else 0)*0, y+(j-2)*sc+b+pas, sh if pas else col)
            xx+=(len(g[0])+1)*sc
def ctext(c,s,cx,y,col,sh=None,sc=1): text(c,s,cx-tw(s,sc)//2,y,col,sh,sc)
# ---------- cielo con tramado Bayer ----------
B4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
def sky(c,stops):
    for y in range(c.h):
        t=y/(c.h-1)*(len(stops)-1); i=min(int(t),len(stops)-2); f=t-i
        for x in range(c.w):
            c.px[x,y]=stops[i+1] if f*16>B4[y%4][x%4]+0.5 else stops[i]
NOGO=[]
def free(x,y,m=2): return not any(a-m<=x<=b+m and c0-m<=y<=d+m for a,c0,b,d in NOGO)
def stars(c,n,ymax,seed=3):
    R=random.Random(seed); k=0
    while k<n:
        x,y=R.randrange(c.w),R.randrange(ymax)
        if not free(x,y): continue
        c.p(x,y,R.choice([hx('ffffff'),hx('c9c3ff'),hx('8f86ff')])); k+=1
def sparkle(c,x,y,col=(255,255,255),big=False):
    c.p(x,y,col)
    for d in ((1,0),(-1,0),(0,1),(0,-1)): c.p(x+d[0],y+d[1],col)
    if big:
        for d in ((2,0),(-2,0),(0,2),(0,-2)): c.p(x+d[0],y+d[1],hx('8f86ff'))
def city(c,base_y,seed=1,hw=6,pal=('night','night2'),nrows=4):
    R=random.Random(seed); rows=cube_rows(hw); cw=len(rows[0])
    # rejilla isométrica: filas de atrás hacia delante
    for row in range(nrows):
        y0=base_y+row*(hw//2)
        for col in range(-1,c.w//(cw-1)+2):
            x=col*(cw-1)+(row%2)*hw
            hgt=(R.choice([0,0,0,1,1,2]) if row==0 else R.choice([0,0,1]) if row==1 else 0)
            for k in range(hgt+1):
                draw_rows(c,rows,x,y0-k*hw,PALS[pal[(row+k)%2]])
def pill(c,x,y,w,h,fill,ol=OL):
    for yy in range(h):
        inset=1 if yy in (0,h-1) else 0
        for xx in range(inset,w-inset):
            edge = yy in (0,h-1) or xx in (inset,w-1-inset)
            c.p(x+xx,y+yy, ol if edge else fill)
# =============== 1) BANNER / OG 1200x630 (240x126 ×5) ===============
c=C(240,126); sky(c,[hx('0c0b1a'),hx('151233'),hx('231c52'),hx('352a78')])
NOGO[:]=[(58,12,182,50),(28,50,212,78)]
stars(c,60,92)
for (x,y,b) in [(18,12,1),(222,16,1),(190,6,0),(64,40,0),(176,44,0)]: sparkle(c,x,y,big=b)
city(c,104,seed=5,nrows=5)
logo(c,(240-LW)//2,16)
mini(c,18,24,'pink'); mini(c,204,28,'blue'); mini(c,6,66,'yellow'); mini(c,217,70,'green')
ctext(c,'JUEGOS GRATIS · SIN DESCARGAS',120,56,hx('ffffff'),hx('3a2f86'))
ctext(c,'150 JUEGOS · MODO TELE',120,69,hx('b9b2ff'),hx('241d57'))
c.save('kuboplay-banner-1200x630.png',5); banner=c
# =============== 2) STORY / MÓVIL 1080x1920 (216x384 ×5) ===============
c=C(216,384); sky(c,[hx('0c0b1a'),hx('141130'),hx('1e1848'),hx('2d2468'),hx('3d3190')])
NOGO[:]=[(44,34,172,74),(40,88,176,128),(56,160,160,222),(40,254,176,294),(60,296,156,318)]
stars(c,120,300,seed=9)
for (x,y,b) in [(30,40,1),(180,70,1),(160,24,0),(20,150,0),(196,190,0),(40,250,1)]: sparkle(c,x,y,big=b)
logo(c,(216-LW)//2,40)
ctext(c,'150 JUEGOS',108,96,hx('ffffff'),hx('463ac4'),sc=2)
ctext(c,'GRATIS Y SIN DESCARGAS',108,120,hx('c9c3ff'),hx('241d57'))
# isla flotante de cubos
rows=cube_rows(12); 
isl=[(0,0,0,'indigo'),(-1,1,0,'night2'),(1,1,0,'night2'),(0,2,0,'night'),(-1,1,1,'pink'),(1,1,1,'blue'),(0,2,1,'yellow'),(0,1,2,'green')]
ox,oy=108-12,176
for (i,j,k,p) in sorted(isl,key=lambda t:(t[1],t[2])):
    draw_rows(c,rows,ox+i*12,oy+j*6-k*12,PALS[p])
mini(c,40,190,'pink'); mini(c,166,176,'blue'); mini(c,150,236,'green')
ctext(c,'JUEGA EN LA TELE',108,262,hx('ffffff'),hx('463ac4'))
ctext(c,'CON TU MÓVIL DE MANDO',108,274,hx('c9c3ff'),hx('241d57'))
city(c,326,seed=2,nrows=9)
pill(c,108-51,300,102,15,hx('6e62f5')); ctext(c,'KUBOPLAY.ONLINE',108,304,hx('ffffff'),hx('2b2468'))
c.save('kuboplay-story-1080x1920.png',5)
# =============== 3) HOJA DE MARCA 1600x1000 (400x250 ×4) ===============
BG=hx('0f0e1c'); CARD=hx('17152e'); BRD=hx('2a2650'); MUT=hx('8a84b8')
c=C(400,250,BG)
def card(x,y,w,h,fill=CARD):
    for yy in range(h):
        for xx in range(w):
            corner=(yy in (0,h-1)) and (xx in (0,w-1))
            if corner: continue
            edge= yy in (0,h-1) or xx in (0,w-1)
            c.p(x+xx,y+yy, BRD if edge else fill)
text(c,'KUBOPLAY · GUÍA DE MARCA'.replace('Í','Í'),12,10,hx('ffffff'))
text(c,'V1 · PIXEL ART 1:1',400-12-tw('V1 · PIXEL ART 1:1'),10,MUT)
card(12,24,200,86); text(c,'LOGOTIPO · FONDO OSCURO',20,31,MUT); logo(c,12+(200-LW)//2,52)
card(220,24,168,86,hx('ffffff')); text(c,'FONDO CLARO',228,31,hx('8a84b8')); logo(c,220+(168-LW)//2,52,light=True)
card(12,118,96,120); text(c,'ICONO',20,125,MUT)
# icono 31x31 dentro de la tarjeta
ix,iy=12+(96-31)//2,150
for yy in range(31):
    for xx in range(31):
        cut={0:3,1:1,2:1,28:1,29:1,30:3}.get(yy,0)
        if xx<cut or xx>30-cut: continue
        c.p(ix+xx,iy+yy,hx('14122a'))
pal=dict(PALS['indigo']); pal['W']=(255,255,255); draw_rows(c,kp.CUBE,ix+3,iy+1,kp.DARK)
text(c,'31 × 31'.replace('×','X'),12+(96-tw('31 X 31'))//2,190+ (0),MUT) if False else None
ctext(c,'31X31 · 1PX',60,196,MUT)
ctext(c,'CONTORNO 1A1530',60,210,MUT)
ctext(c,'ARISTAS 2:1',60,222,MUT)
card(116,118,272,58); text(c,'PALETA',124,125,MUT)
sw=[('6E62F5','ACENTO'),('A097FF','LUZ'),('463AC4','SOMBRA'),('1A1530','CONTORNO'),('FF6FB5','FIESTA'),('5B8CFF','CARRERAS'),('A8CF3F','TRIVIA'),('FFC94D','PREMIO')]
for i,(n,lab) in enumerate(sw):
    x=124+(i%4)*66; y=136+(i//4)*20; col=hx(n)
    c.rect(x,y,14,14,col)
    for xx in range(-1,15): c.p(x+xx,y-1,BRD); c.p(x+xx,y+14,BRD)
    for yy in range(y-1,y+15): c.p(x-1,yy,BRD); c.p(x+14,yy,BRD)
    text(c,'#'+n,x+18,y,hx('ffffff')); text(c,lab,x+18,y+8,MUT) if False else None
card(116,184,272,54); text(c,'TIPOGRAFÍA 5X7',124,191,MUT)
text(c,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',124,203,hx('ffffff'))
text(c,'0123456789 ÁÉÍÓ · ! #',124,214,hx('c9c3ff'))
text(c,'JUEGA GRATIS · SIN DESCARGAS',124,225,hx('a097ff'))
c.save('kuboplay-guia-marca-1600x1000.png',4)
