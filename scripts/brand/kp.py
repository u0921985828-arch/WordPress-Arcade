# Marca kuboplay: logo, icono y activos del portal (pixel perfect)
import os
from PIL import Image
import wm
def hx(s): s=s.lstrip('#'); return tuple(int(s[i:i+2],16) for i in (0,2,4))
LHALF=["...........##",".........##TT",".......##hhTT",".....##hhTTTT","...##hhTTTTTT",".##TTTTTTTTTT","##TTTTTTTTTTT","#L##TTTTTTTTT","#LLL##TTTTTTT","#LLLLL##TTTTT","#LLLLLLL##TTT","#LLLLLLLLL##T","#LLLLLLLLLLL#"]+["#LLLLLLLLLLL#"]*10+[".##LLLLLLLLL#","...##LLLLLLL#",".....##LLLLL#",".......##LLL#",".........##L#","...........##"]
CUBE=[list(r+r[:-1][::-1].replace('L','R').replace('h','T')) for r in LHALF]
for i,row in enumerate(["W....","WW...","WWW..","WWWW.","WWWWW","WWWW.","WWW..","WW...","W...."]):
    for j,ch in enumerate(row):
        if ch=='W': CUBE[14+i][16+j]='X'
CUBE=[''.join(r) for r in CUBE]
BASE={'#':hx('1a1530'),'T':hx('a097ff'),'h':hx('d6d2ff'),'L':hx('6e62f5'),'R':hx('463ac4'),'X':(255,255,255),'B':hx('14122a')}
DARK=dict(BASE,W=(255,255,255),S=hx('6e62f5'),P=hx('a097ff'),Q=hx('463ac4'))
LIGHT=dict(BASE,W=hx('1a1530'),S=hx('a097ff'),P=hx('6e62f5'),Q=hx('c9c3ff'))
def logo_grid():
    W,H=wm.size(); H=max(H,len(CUBE)); g=[['.']*W for _ in range(H)]
    for y,r in enumerate(CUBE):
        for x,ch in enumerate(r): g[y][x]=ch
    cells,_=wm.word_cells(); ox=wm.CUBE_W+wm.CGAP; oy=wm.WORD_TOP
    fill={(x,y) for x,y,_ in cells}
    for x,y,p in cells:
        if (x+1,y+1) not in fill: g[oy+y+1][ox+x+1]='Q' if p else 'S'
    for x,y,p in cells: g[oy+y][ox+x]='P' if p else 'W'
    return [''.join(r) for r in g]
def icon_grid():
    N=31; ic=[['B']*N for _ in range(N)]
    for i,c in enumerate([3,1,1]):
        for x in range(c):
            for (yy,xx) in ((i,x),(i,N-1-x),(N-1-i,x),(N-1-i,N-1-x)): ic[yy][xx]='.'
    for y,r in enumerate(CUBE):
        for x,ch in enumerate(r):
            if ch!='.': ic[1+y][3+x]=ch
    return [''.join(r) for r in ic]
def img(grid,pal,m=0,bg=None):
    im=Image.new('RGBA',(len(grid[0])+2*m,len(grid)+2*m),(bg+(255,)) if bg else (0,0,0,0))
    for y,r in enumerate(grid):
        for x,ch in enumerate(r):
            if ch!='.': im.putpixel((x+m,y+m),pal[ch]+(255,))
    return im
def svg(grid,pal,path,m=0,scale=8,title=None):
    w=len(grid[0])+2*m; h=len(grid)+2*m; out=[]
    for y,r in enumerate(grid):
        x=0
        while x<len(r):
            ch=r[x]
            if ch=='.': x+=1; continue
            e=x
            while e<len(r) and r[e]==ch: e+=1
            out.append(f'<rect x="{x+m}" y="{y+m}" width="{e-x}" height="1" fill="#%02x%02x%02x"/>'%pal[ch]); x=e
    t=f'<title>{title}</title>' if title else ''
    open(path,'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w*scale}" height="{h*scale}" shape-rendering="crispEdges">{t}'+''.join(out)+'</svg>\n')
if __name__=='__main__':
    OUT='/home/user/WordPress-Arcade/docs/brand/'; AS='/home/user/WordPress-Arcade/wp-content/mu-plugins/arcade-core/assets/img/'
    for f in os.listdir(OUT): os.remove(OUT+f)
    L=logo_grid(); I=icon_grid()
    for n,p in (('oscuro',DARK),('claro',LIGHT)):
        svg(L,p,OUT+f'kuboplay-logo-{n}.svg',m=2)
        im=img(L,p,m=2); im.resize((im.width*8,im.height*8),Image.NEAREST).save(OUT+f'kuboplay-logo-{n}.png')
    svg(L,DARK,AS+'kuboplay-logo.svg',scale=1,title='kuboplay')
    svg(I,DARK,OUT+'kuboplay-icono.svg',scale=16); svg(I,DARK,AS+'icon.svg',scale=1)
    ic=img(I,DARK)
    for s,n in ((512,'icon-512.png'),(192,'icon-192.png')):
        k=s//31; big=Image.new('RGBA',(s,s),(0,0,0,0)); big.paste(ic.resize((31*k,31*k),Image.NEAREST),((s-31*k)//2,)*2); big.save(AS+n)
        if s==512: big.save(OUT+'kuboplay-icono-512.png')
    mk=Image.new('RGBA',(512,512),BASE['B']+(255,)); cb=img(CUBE,DARK); cb=cb.resize((25*11,29*11),Image.NEAREST); mk.paste(cb,((512-cb.width)//2,(512-cb.height)//2),cb); mk.save(AS+'icon-maskable.png')
    fv=Image.new('RGBA',(32,32),(0,0,0,0)); cb=img(CUBE,DARK); fv.paste(cb,(3,1),cb); fv.save(OUT+'kuboplay-favicon-32.png')
    print('\n'.join(L))
