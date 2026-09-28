# -*- coding: utf-8 -*-
"""Genera games/_data/palabras-caen-es.json: diccionario del juego «Letras que Caen».

Reúne las palabras que ya usan los otros juegos de letras (palabras5-es.txt, anagramas,
categorías y rosco) y añade a mano el vocabulario corto que allí falta (3 y 4 letras), que
es justo el que sostiene un juego de formar palabras. Todo son palabras comunes del español;
no se copia ningún diccionario ajeno. Se guardan sin tildes y en mayúsculas (la Ñ es letra).
"""
import json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / 'wp-content/mu-plugins/arcade-core/games/_data'


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn' or ch == '̃')
    return unicodedata.normalize('NFC', s).upper()


CORTAS = """
ala ave aro ajo año asa ama ara ola ojo oro oso oca uva uso una uno uña
bar bus boa bol bis cal can col con coz dar dio don dos duo dia del eco eje ese eso esa era
fan fea feo fin fue gas gol gel gen haz hoy hoz ida ido ira las los luz ley lio mal mar mas
mes mil mio mus nos pan paz pez pie pin por que red rey rio ron res rol sal sed ser sol son
sur sin tal tan tos tez tia tio uno vez vid vio voz ver van vil zar rea rae sea ves tus sus
abre acto agua aire ajos alas alba algo alto amor ante anda arco arte asno atun aula aves azul
baba bajo bala bano base bebe bota boca bola bolo brea buey buho buzo cafe caja cala cama cana
capa cara casa caso cava cena cero cien cine cita coco cola come como copa cosa coro cruz cuba
cubo cuna cura cuyo dado dama dato dedo dice diez dios doce dona duda duna duro ecos edad eran
eres esta este euro ella ello faja fama faro fase fila fino flan foca foco foro fosa frio fuma
gafa gala gana gato gira giro gota goma gris guia hace hada hilo hijo hoja hola hora hoyo humo
huso idea iglu isla iris jefe joya juez jugo kilo lado lago lana lata lava leon leve lila lima
lino lira lisa liso lobo loco loma lomo losa loza luna lupa luto maiz malo mama mano mapa masa
mata mate mazo mesa meta miel mina mito moda mono mora moro moto muro musa nabo nada nave nido
nino nota nube nuca nudo obra ocho ocio odio ojos olas olor onda onza orca otro paja palo pana
papa paro pasa paso pata pato pavo peca peor pera peso pico pila pino pipa pisa piso pito plan
poco poda polo pomo pozo puma puno pura puro rama rana rata rato raya rayo real reja remo reno
rica rico rifa rima risa roca rojo rosa rota ruta saco sala sano sapo seda sede seta sino soga
sola solo sopa sube suma taco tapa taza tela tema tiza toga tomo topo tubo tuna tren tres unas
unos uvas vaca vale vals vaso vela vena vida vino viva vivo voto yate yema yoga zeta zona zumo
lupa lima lote lobo mono nota orza pala pena pera pila pipa pena rezo sano sena tila toro trio
bota brio cabo caco cano cine codo cono coso cuco culo? dote ente fofo gozo hito hueco? jota lazo
mago mudo mula nube pega pica poro raza roce rubi saeta? sien tapa teja tina tino tono toro tuba
vado vago vaho vela vena vera vete vial vida vila? vote yeso yuca zapa zeta zoco
"""
BORRA = {'culo', 'hueco', 'saeta', 'vila', 'coso'}   # se colaron con interrogante o son raras


def harvest():
    ws = set()
    t = (D / 'palabras5-es.txt').read_text(encoding='utf8')
    for ln in t.split('\n'):
        s = ln.strip()
        if s and s[0] != '#':
            ws.add(norm(s))
    a = json.loads((D / 'anagramas-es.json').read_text(encoding='utf8'))
    for r in a['racks']:
        ws.update(norm(w) for w in r['w'])
    cat = json.loads((D / 'categorias-es.json').read_text(encoding='utf8'))
    for v in cat.values():
        ws.update(norm(w) for w in v if ' ' not in w)
    ro = json.loads((D / 'rosco-es.json').read_text(encoding='utf8'))
    for items in ro['r'].values():
        for it in items:
            ws.update(norm(w) for w in it['a'] if ' ' not in w)
    for w in CORTAS.split():
        w = w.rstrip('?')
        if w not in BORRA:
            ws.add(norm(w))
    return {w for w in ws if re.fullmatch('[A-ZÑ]{3,8}', w)}


def main():
    ws = sorted(harvest())
    by = {}
    for w in ws:
        by.setdefault(len(w), []).append(w)
    out = {'n': len(ws), 'w': {str(n): by[n] for n in sorted(by)}}
    p = D / 'palabras-caen-es.json'
    p.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    print(f'{p.name}: {len(ws)} palabras ' + ' '.join(f'{n}:{len(by[n])}' for n in sorted(by)))


if __name__ == '__main__':
    sys.exit(main())
