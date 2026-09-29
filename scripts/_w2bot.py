# Bot dirigido de la tanda: campañas de patata-explosiva, petardo-plaza y gladiadores-de-juguete.
import os, sys, json, threading, http.server, functools
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = Path(__file__).resolve().parent.parent
ROOT = BASE / 'wp-content/mu-plugins/arcade-core/games'
PORT = int(os.environ.get('ARCADE_PORT', 8903))
HARNESS = ROOT / '_w2harness.html'
HARNESS.write_text("""<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#111}iframe{border:0;width:100vw;height:100vh}</style>
<iframe id=f></iframe><script>
const q=new URLSearchParams(location.search), n=+q.get('n')||2, f=document.getElementById('f');
f.src=q.get('g')+'/index.html';
f.onload=()=>{const pl=[];for(let p=0;p<n;p++)pl.push({p,color:'#fff',name:'J'+(p+1)});
 f.contentWindow.postMessage({type:'arcade:party',players:pl},'*');
 window.PKEY=(p,key,down)=>f.contentWindow.postMessage({type:'arcade:pkey',p,key,down},'*');
 window.READY=1;};
</script>""", encoding='utf-8')

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = f'http://127.0.0.1:{PORT}'

BOT = {
'patata-explosiva': """
  window.__res=null;
  k.human=()=>false; syncPlayers();
  const opa=patAI; patAI=(pl,ai,sk)=>opa(pl,ai,pl.i===0?0.85:sk);  /* J1 lo lleva un jugador competente */                              /* el bot deja que la IA del motor lleve a J1 */
  const ol=k.lose, od=k.levelDone;
  k.lose=(...a)=>{window.__res={win:false,t:PS?PS.carry:0};return ol.apply(k,a);};
  k.levelDone=(s,e,o)=>{window.__res={win:true,stars:o&&o.stars,extra:e};return od.apply(k,[s,e,o]);};
""",
'petardo-plaza': """
  window.__res=null;
  const ol=k.lose, od=k.levelDone, oth=aiThink;
  k.lose=(...a)=>{window.__res={win:false,obj:LVB.obj,fail:CS.fail};return ol.apply(k,a);};
  k.levelDone=(s,e,o)=>{window.__res={win:true,stars:o&&o.stars,extra:e};return od.apply(k,[s,e,o]);};
  pl[0].cpu=true;                                  /* J1 lo lleva la IA del motor, con el objetivo del reto */
  aiThink=function(q){
    if(q!==pl[0])return oth(q);
    const D=dangerMap(),cl=cellOf(q),cx=cl[0],cy=cl[1];
    if(D[cy][cx]!==Infinity){const p=bfs(q,D,(x,y)=>D[y][x]===Infinity);q.ai=p&&p.length>1?p:null;q.think=0.05;return;}
    const safe=(x,y)=>D[y][x]===Infinity;
    const want=(x,y)=>{ if(LVB.obj==='exit'){ if(!CS.open){ if(CS.needKey&&!CS.key) return items[y][x]==='K';
                          const pp=CS.plates.find(p=>!p.on); return !!pp&&pp.x===x&&pp.y===y; }
                        return CS.door[0]===x&&CS.door[1]===y; }
                      return false; };
    let path=bfs(q,D,(x,y,n)=>n>0&&safe(x,y)&&want(x,y));
    if(path){q.ai=path;q.think=0.05;return;}
    const tgt=(x,y)=>blast({x,y,range:q.range}).some(([a,b])=>grid[b][a]===7||grid[b][a]===2||grid[b][a]===4)||hitsFoe(q,x,y);
    const mine=bombs.filter(b=>b.own===q).length;
    if(mine<q.max&&!bombAt(cx,cy)&&tgt(cx,cy)){
      const eb={x:cx,y:cy,t:RU.fuse,range:q.range},D2=dangerMap(eb),esc=bfs(q,D2,(x,y)=>D2[y][x]===Infinity);
      if(esc&&esc.length>1){placeBomb(q);q.ai=esc;q.think=0.05;return;}}
    path=bfs(q,D,(x,y,n)=>n>0&&safe(x,y)&&items[y][x]&&n<9)
      ||bfs(q,D,(x,y,n)=>n>0&&safe(x,y)&&!bombAt(x,y)&&tgt(x,y))
      ||bfs(q,D,(x,y,n)=>n===1&&safe(x,y));
    q.ai=path&&path.length>1?path.slice(0,4):null;q.think=0.06;
  };
""",
'gladiadores-de-juguete': """
  window.__res=null;
  k.human=()=>false; if(F&&F[0])F[0].sk=0.80;
  const ors=reset; reset=()=>{ors();F[0].sk=0.80;};                              /* el bot deja que la IA del motor lleve a J1 */
  const ol=k.lose, od=k.levelDone;
  k.lose=(...a)=>{window.__res={win:false};return ol.apply(k,a);};
  k.levelDone=(s,e,o)=>{window.__res={win:true,stars:o&&o.stars,extra:e};return od.apply(k,[s,e,o]);};
""",
}
LVN = 20
LV0 = int(os.environ.get('LV0', 1)); LV1 = int(os.environ.get('LV1', LVN))
DIFS = [int(x) for x in os.environ.get('DIFS', '0,1,2').split(',')]
games = sys.argv[1:] or list(BOT)
out = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    for g in games:
        out[g] = {}
        for dif in DIFS:
            res = []
            for lv in range(LV0, LV1 + 1):
                pg = b.new_page(viewport={'width': 800, 'height': 600})
                errs = []
                pg.on('pageerror', lambda e: (errs.append(str(e)[:160]), print('PE', str(e)[:200])))
                pg.add_init_script(f"""try{{localStorage.setItem('dif:{g}','{dif}');localStorage.setItem('lv:{g}','{LVN}');}}catch(e){{}}""")
                pg.goto(f'{U}/{g}/index.html')
                pg.wait_for_function('!!(window.__k && window.__k.goLevel)', timeout=15000)
                pg.evaluate("(s)=>{const k=window.__k; eval(s);}", BOT[g])
                pg.evaluate(f"()=>{{window.__k.goLevel({lv});}}")
                try:
                    pg.wait_for_function('!!window.__res', timeout=480000)
                    r = pg.evaluate('window.__res')
                except Exception:
                    r = {'win': None, 'timeout': True}
                r['lv'] = lv
                if errs: r['err'] = errs[:2]
                res.append(r)
                pg.close()
            out[g][dif] = res
            ok = sum(1 for r in res if r.get('win'))
            print(f'{g} dif{dif}: {ok}/{len(res)} superados', flush=True)
            for r in res:
                if not r.get('win'): print('   falla', r, flush=True)
    b.close()
(BASE / 'w2bot.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
