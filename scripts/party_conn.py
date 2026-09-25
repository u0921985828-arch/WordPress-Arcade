# Prueba de conexión del modo tele (WordPress local en :8900): python3 scripts/party_conn.py [directo pad-sin-webrtc tele-sin-webrtc red-bloqueada 4-mandos-bloqueados]
import time, sys
from playwright.sync_api import sync_playwright
B='http://127.0.0.1:8900'
NORTC="delete window.RTCPeerConnection; delete window.webkitRTCPeerConnection;"
# sin candidatos: la conexión directa nunca se establece (como una wifi con aislamiento)
NOICE="""(function(){var P=RTCPeerConnection.prototype, o=P.setRemoteDescription;
P.setRemoteDescription=function(d){ if(d&&d.sdp){ d={type:d.type,sdp:d.sdp.split('\\r\\n').filter(function(l){return l.indexOf('a=candidate')!==0}).join('\\r\\n')}; } return o.call(this,d); };})();"""
def run(name, tv_init='', pad_init='', n=2, limit=60):
    with sync_playwright() as p:
        b=p.chromium.launch(); errs=[]
        tc=b.new_context(viewport={'width':1280,'height':720})
        if tv_init: tc.add_init_script(tv_init)
        tv=tc.new_page(); tv.on('pageerror',lambda e: errs.append('tv:'+str(e)))
        tv.goto(B+'/tele/'); tv.wait_for_function('window.__party && __party.code && __party.code.length==4',timeout=20000)
        code=tv.evaluate('__party.code'); pads=[]
        for i in range(n):
            c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            if pad_init: c.add_init_script(pad_init)
            pg=c.new_page(); pg.on('pageerror',lambda e: errs.append('pad:'+str(e)))
            pg.goto(B+'/mando/?c='+code); pads.append((pg,time.time()))
        res=[]
        for i,(pg,t0) in enumerate(pads):
            try:
                pg.wait_for_function('window.__pad && __pad.open',timeout=limit*1000)
                res.append('J%d %.1fs %s'%(pg.evaluate('__pad.p')+1,time.time()-t0,'servidor' if pg.evaluate('!!__pad.relay') else 'directo'))
            except Exception as e:
                res.append('J? NO CONECTA: '+pg.inner_text('body')[:200].replace('\n',' '))
        # pulsaciones: 10 teclas de cada mando llegan a la tele
        n0=tv.evaluate('__party.lat.length')
        for pg,_ in pads:
            pg.evaluate("for(var i=0;i<5;i++){__pad.dc.send(JSON.stringify({t:'k',k:'right',d:1,s:1000+2*i,ts:Date.now()}));__pad.dc.send(JSON.stringify({t:'k',k:'right',d:0,s:1001+2*i,ts:Date.now()}));}")
        tv.wait_for_timeout(3000)
        got=tv.evaluate('__party.lat.length')-n0
        lat=tv.evaluate('__party.lat.slice(-10).reduce(function(a,b){return a+b},0)/Math.max(1,Math.min(10,__party.lat.length))')
        peers=tv.evaluate('Object.keys(__party.peers).map(function(k){var q=__party.peers[k];return "J"+(+k+1)+":"+(q.open&&!q.lost?"ok":"x")+(q.relay?"(srv)":"")}).join(" ")')
        # 12 s quietos: siguen conectados (latidos)
        tv.wait_for_timeout(12000)
        peers2=tv.evaluate('Object.keys(__party.peers).map(function(k){var q=__party.peers[k];return "J"+(+k+1)+":"+(q.open&&!q.lost?"ok":"x")}).join(" ")')
        print(f'[{name}]', '; '.join(res), '| teclas', got, '/', 10*n, 'lat %.0f ms'%lat, '| tele', peers, '| tras 12 s', peers2, '| errores', errs)
        b.close()
which=sys.argv[1:] or ['directo','pad-sin-webrtc','tele-sin-webrtc','red-bloqueada','4-mandos-bloqueados']
for w in which:
    if w=='directo': run(w)
    if w=='pad-sin-webrtc': run(w, pad_init=NORTC)
    if w=='tele-sin-webrtc': run(w, tv_init=NORTC)
    if w=='red-bloqueada': run(w, tv_init=NOICE, pad_init=NOICE, limit=70)
    if w=='4-mandos-bloqueados': run(w, tv_init=NOICE, pad_init=NOICE, n=4, limit=70)
