#!/usr/bin/env node
// Traductor JS -> GDScript para Dub Siege.
//
// Lee el <script> principal de dub-siege.html (la funcion autoejecutada) y
// escribe godot/gen/game_gen.gd: una clase con un miembro por variable de
// nivel superior y un metodo por funcion. Lo que es DOM, audio o entrada no se
// traduce (lista SKIP): esta escrito a mano en godot/src/*.gd con los mismos
// nombres, y tools/godot_join.py une las dos partes en godot/game.gd.
//
// Uso: NODE_PATH=<carpeta con acorn> node tools/js2gd.js [dub-siege.html] [salida]
// Avisos (lo que no se puede traducir a ciegas) en stderr con su linea.
'use strict';
const acorn = require('acorn');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = process.argv[2] || path.join(ROOT, 'dub-siege.html');
const OUT = process.argv[3] || path.join(ROOT, 'godot', 'game.gd');
const SRC = path.join(ROOT, 'godot', 'src');
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'js2gd.json'), 'utf8'));

const html = fs.readFileSync(HTML, 'utf8');
const m0 = html.indexOf("<script>\n(function(){\n'use strict';");
if (m0 < 0) throw new Error('no encuentro el script principal');
const s0 = m0 + '<script>\n'.length;
const s1 = html.indexOf('</script>', s0);
const code = html.slice(s0, s1);
const lineBase = html.slice(0, s0).split('\n').length; // linea del html donde empieza code
const ast = acorn.parse(code, { ecmaVersion: 2020, locations: true });
const iife = ast.body.find(s => s.type === 'ExpressionStatement');
const BODY = iife.expression.callee.body.body;

const SKIP = new Set(CFG.skip);
const inSkip = n => (CFG.skipRanges || []).some(([a, b]) => n.loc.start.line >= a && n.loc.start.line <= b);          // nombres de nivel superior escritos a mano
const DATA = new Set(CFG.data);          // variables que se cargan de data.json
const RAW = CFG.raw || {};               // funcion -> cuerpo GDScript escrito a mano (texto)
const warns = [];
function warn(node, msg) { warns.push(`L${node.loc.start.line + lineBase - 1}: ${msg}`); }
function src(node) { return code.slice(node.start, node.end); }

// ------------------------------------------------------------ nombres
const RESERVED = new Set(`if elif else for while match when break continue pass return class class_name extends is in as
self super signal func static const enum var breakpoint preload await yield assert void PI TAU INF NAN true false null and
or not tool abs absf absi acos acosh asin asinh atan atan2 atanh ceil ceilf ceili clamp clampf clampi cos cosh deg_to_rad
ease exp floor floorf floori fmod fposmod hash inverse_lerp lerp lerpf log max maxf maxi min minf mini move_toward posmod
pow print printerr push_error push_warning rad_to_deg randf randi randomize remap round roundf roundi seed sign signf signi
sin sinh smoothstep snapped sqrt str tan tanh typeof weakref wrap wrapf wrapi char convert len load range get set call
free notification connect to_string duplicate step int float bool String Color Vector2 Array Dictionary Object Image
Rect2 Callable has erase keys values size`.split(/\s+/));
function gdName(n) {
  if (n === '$') return 'S_';
  return RESERVED.has(n) ? 'j_' + n : n;
}

const TOP = new Map();   // nombre -> 'f' | 'v'
for (const s of BODY) {
  if (s.type === 'FunctionDeclaration') TOP.set(s.id.name, 'f');
  else if (s.type === 'VariableDeclaration') for (const d of s.declarations) TOP.set(d.id.name, d.init && /Function/.test(d.init.type) ? 'f' : 'v');
}
for (const n of CFG.handFuncs || []) TOP.set(n, 'f');
for (const n of CFG.handVars || []) TOP.set(n, 'v');

// ------------------------------------------------------------ ambitos
// Fn: funcion GDScript real (metodo o lambda). Scope: ambito JS (funcion o
// callback en linea) con su mapa nombre JS -> nombre GD.
let uid = 0;
class GFn {
  constructor(parent) { this.parent = parent; this.taken = new Set(parent ? parent.taken : []); this.hoist = []; }
  fresh(base) {
    let n = gdName(base), i = 1;
    while (this.taken.has(n) || TOP.has(n)) n = gdName(base) + '_' + (++i);
    this.taken.add(n);
    return n;
  }
}
class Scope {
  constructor(parent, gfn, kind) { this.parent = parent; this.gfn = gfn; this.kind = kind; this.names = new Map(); this.nested = new Map(); }
  lookup(n) {
    for (let s = this; s; s = s.parent) if (s.names.has(n)) return { s, gd: s.names.get(n) };
    return null;
  }
}

// variables declaradas (var + funciones anidadas) en un cuerpo, sin entrar en funciones
function collectVars(node, out, fns) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => collectVars(n, out, fns)); return; }
  if (node.type === 'VariableDeclaration') {
    for (const d of node.declarations) { out.add(d.id.name); collectVars(d.init, out, fns); }
    return;
  }
  if (node.type === 'FunctionDeclaration') { out.add(node.id.name); fns && fns.push(node); return; }
  if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') return;
  if (isInlineForEach(node)) { collectVars(node.callee.object, out, fns); return; }
  for (const k in node) if (k !== 'loc' && node[k] && typeof node[k] === 'object') collectVars(node[k], out, fns);
}

// ------------------------------------------------------------ utilidades AST
function isFn(n) { return n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression'); }
function isInlineForEach(n) {
  return n && n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed &&
    n.callee.property.name === 'forEach' && isFn(n.arguments[0]) && n.__stmt;
}
function walk(n, f, inFn) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) { n.forEach(x => walk(x, f, inFn)); return; }
  if (n.type) f(n, inFn);
  const nf = inFn || isFn(n) || n.type === 'FunctionDeclaration';
  for (const k in n) if (k !== 'loc' && n[k] && typeof n[k] === 'object') walk(n[k], f, nf);
}
// identificadores asignados dentro de n (sin contar declaraciones propias)
function assignedIds(n) {
  const out = new Set();
  walk(n, x => {
    if (x.type === 'AssignmentExpression' && x.left.type === 'Identifier') out.add(x.left.name);
    if (x.type === 'UpdateExpression' && x.argument.type === 'Identifier') out.add(x.argument.name);
  });
  return out;
}
function declaredIn(fnNode) {
  const s = new Set(fnNode.params.map(p => p.name));
  const b = fnNode.body.type === 'BlockStatement' ? fnNode.body.body : [];
  collectVars(b, s);
  walk(b, x => { if (isFn(x)) x.params.forEach(p => s.add(p.name)); });
  walk(b, x => { if (x.type === 'VariableDeclaration') x.declarations.forEach(d => s.add(d.id.name)); });
  return s;
}
function hasLoopReturn(body) {
  // return dentro de un bucle propio del callback (no se puede pasar a continue)
  let bad = false;
  (function rec(n, inLoop) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(x => rec(x, inLoop)); return; }
    if (isFn(n) || n.type === 'FunctionDeclaration') return;
    if (n.type === 'ReturnStatement' && inLoop) bad = true;
    const loop = /^(For|ForIn|ForOf|While|DoWhile)Statement$/.test(n.type) || n.type === 'SwitchStatement' || isInlineForEachLike(n);
    for (const k in n) if (k !== 'loc' && n[k] && typeof n[k] === 'object') rec(n[k], inLoop || loop);
  })(body, false);
  return bad;
}
function isInlineForEachLike(n) {
  return n && n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed && n.callee.property.name === 'forEach';
}

// ------------------------------------------------------------ traductor
const STRINGY_CALLS = new Set(['str', '_join', '_toFixed', 'pad', '_slice', '_substr', '_substring', '_padStart', '_repeat', '_charAt', 'String.chr']);
const CTX_METHODS = new Set(['fillRect', 'clearRect', 'drawImage', 'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'closePath',
  'rect', 'arc', 'fill', 'stroke', 'clip', 'measureText', 'fillText', 'setTransform', 'translate', 'scale', 'createLinearGradient',
  'getImageData', 'putImageData', 'createImageData', 'getContext', 'addColorStop', 'strokeRect']);
const MATH = {
  floor: a => `floori(${a})`, ceil: a => `ceili(${a})`, round: a => `_round(${a})`, abs: a => `absf(${a})`,
  sqrt: a => `sqrt(${a})`, sin: a => `sin(${a})`, cos: a => `cos(${a})`, atan2: (a, b) => `atan2(${a}, ${b})`, atan: a => `atan(${a})`,
  pow: (a, b) => `pow(${a}, ${b})`, exp: a => `exp(${a})`, log: a => `log(${a})`, sign: a => `signf(${a})`, trunc: a => `int(${a})`,
  random: () => `randf()`, hypot: (a, b) => `Vector2(${a}, ${b}).length()`, tan: a => `tan(${a})`, asin: a => `asin(${a})`, acos: a => `acos(${a})`,
  log2: a => `(log(${a}) / log(2.0))`,
};

class T {
  constructor() { this.lines = []; this.ind = 0; this.pre = null; this.loops = []; }
  emit(s) { this.lines.push('\t'.repeat(this.ind) + s); }

  // ---------------- funciones
  method(name, fnNode, ownerScope) {
    const _keepFins = this.fins; this.fins = [];
    try {
    const gfn = new GFn(null);
    const sc = new Scope(null, gfn, 'fn');
    const params = fnNode.params.map(p => { const g = gfn.fresh(p.name); sc.names.set(p.name, g); return g; });
    const L = new T(); L.ind = 1;
    L.body(fnNode, sc);
    const head = `func ${gdName(name)}(${params.map(p => p + ' = null').join(', ')}):`;
    return [`# L${fnNode.loc.start.line + lineBase - 1}`, head, ...L.wrapHoist(sc), ...(L.lines.length ? L.lines : ['\tpass'])];
      } finally { this.fins = _keepFins; }
  }
  wrapHoist(sc) { return sc.gfn.hoist.map(h => '\t'.repeat(this.ind) + h); }

  // declara las variables del cuerpo de una funcion JS en su ambito
  declare(sc, stmts, resetList) {
    const vars = new Set(), fns = [];
    collectVars(stmts, vars, fns);
    for (const v of vars) {
      if (sc.names.has(v)) continue;
      const g = sc.gfn.fresh(v);
      sc.names.set(v, g);
      sc.gfn.hoist.push(`var ${g} = null`);
      if (resetList) resetList.push(g);
    }
    for (const f of fns) sc.nested.set(f.id.name, f);
    return fns;
  }

  // Las lambdas de GDScript copian los locales que capturan al crearse: un
  // local que una funcion anidada lee o escribe y que cambia despues (o que la
  // lambda cambia) no se veria. Esos locales viven en un diccionario de la
  // llamada (_c.x), que si se comparte por referencia entre la funcion y sus lambdas.
  boxCaptured(fnNode, stmts, sc) {
    const own = new Set(fnNode.params.map(p => p.name));
    collectVars(stmts, own);
    const capt = new Set();
    const self = this;
    (function rec(n, parent) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(x => rec(x, parent)); return; }
      const isF = isFn(n) || n.type === 'FunctionDeclaration';
      if (isF) {
        const inline = parent && isInlineForEach(parent) && parent.arguments[0] === n && !hasLoopReturn(n.body);
        if (!inline) { for (const id of freeIds(n)) if (own.has(id)) capt.add(id); return; }
      }
      for (const k in n) if (k !== 'loc' && n[k] && typeof n[k] === 'object') rec(n[k], n);
    })(stmts, null);
    if (!capt.size) return;
    const box = sc.gfn.fresh('_c');
    const init = [];
    for (const v of capt) {
      const prm = sc.names.has(v) ? sc.names.get(v) : null;
      init.push(`"${gdName(v)}": ${prm || 'null'}`);
      sc.names.set(v, `${box}.${gdName(v)}`);
    }
    sc.gfn.hoist.push(`var ${box} = {${init.join(', ')}}`);
  }
  body(fnNode, sc) {
    const stmts = fnNode.body.type === 'BlockStatement' ? fnNode.body.body : [{ type: 'ReturnStatement', argument: fnNode.body, loc: fnNode.body.loc }];
    this.boxCaptured(fnNode, stmts, sc);
    const fns = this.declare(sc, stmts);
    // funciones anidadas: lambdas al principio (ver aviso si leen locales que cambian despues)
    for (const f of fns) {
      const g = sc.names.get(f.id.name);
      this.lambdaInto(g, f, sc, true);
      const caps = [...assignedIds(fnNode.body)].filter(n => n !== f.id.name && sc.names.has(n) && usesId(f, n));
      if (caps.length) warn(f, `funcion anidada ${f.id.name} lee locales que cambian: ${caps.join(',')}`);
    }
    this.stmts(stmts, sc);
  }
  lambdaInto(target, fnNode, sc, assign) {
    const _keepFins = this.fins; this.fins = [];
    try {
    const gfn = new GFn(sc.gfn);
    const ls = new Scope(sc, gfn, 'fn');
    const params = fnNode.params.map(p => { const g = gfn.fresh(p.name); ls.names.set(p.name, g); return g; });
    const L = new T(); L.ind = 1; L.loops = [];
    L.body(fnNode, ls);
    const outer = [...assignedIds(fnNode.body)].filter(n => !ls.names.has(n) && sc.lookup(n));
    if (outer.length) warn(fnNode, `lambda modifica locales externos: ${outer.join(',')}`);
    const head = `${assign ? '' : 'var '}${target} = func(${params.map(p => p + ' = null').join(', ')}):`;
    const body = [...gfn.hoist.map(h => '\t' + h), ...(L.lines.length ? L.lines : ['\tpass'])];
    if (this.pre) this.pre.push(head, ...body.map(l => '\u0001' + l));
    else { this.emit(head); body.forEach(l => this.emit(l)); }
      } finally { this.fins = _keepFins; }
  }

  // ---------------- sentencias
  stmts(list, sc) { for (const s of list) this.stmt(s, sc); }
  block(s, sc) {
    const n0 = this.lines.length;
    this.ind++;
    if (s.type === 'BlockStatement') this.stmts(s.body, sc); else this.stmt(s, sc);
    if (this.lines.length === n0) this.emit('pass');
    this.ind--;
  }
  withPre(fn) {
    const saved = this.pre; this.pre = [];
    const r = fn();
    const pre = this.pre; this.pre = saved;
    return [r, pre];
  }
  flushPre(pre) {
    for (const l of pre) this.emit(l[0] === '\u0001' ? l.slice(1) : l);
  }
  stmt(s, sc) {
    switch (s.type) {
      case 'EmptyStatement': return;
      case 'FunctionDeclaration': return; // ya declarada como lambda
      case 'BlockStatement': return this.stmts(s.body, sc);
      case 'VariableDeclaration':
        for (const d of s.declarations) {
          if (!d.init) continue;
          if (isFn(d.init)) { this.lambdaInto(sc.lookup(d.id.name).gd, d.init, sc, true); continue; }
          const [v, pre] = this.withPre(() => this.expr(d.init, sc));
          this.flushPre(pre);
          this.emit(`${sc.lookup(d.id.name).gd} = ${v}`);
        }
        return;
      case 'ExpressionStatement': return this.exprStmt(s.expression, sc, s);
      case 'ReturnStatement': {
        const lp = this.loops[this.loops.length - 1];
        if (lp && lp.kind === 'each') {
          if (s.argument) { const [v, pre] = this.withPre(() => this.expr(s.argument, sc)); this.flushPre(pre); if (!/^[\w.]+$/.test(v)) this.emit(v); }
          this.emitContinue(lp); return;
        }
        const fins = (this.fins || []).slice().reverse();
        const runFins = () => { const keep = this.fins; this.fins = []; for (const f of fins) this.stmts(f, sc); this.fins = keep; };
        if (!s.argument) { runFins(); return this.emit('return'); }
        const [v, pre] = this.withPre(() => this.expr(s.argument, sc));
        this.flushPre(pre);
        if (fins.length) { const t = sc.gfn.fresh('_ret'); this.emit(`var ${t} = ${v}`); runFins(); return this.emit(`return ${t}`); }
        return this.emit(`return ${v}`);
      }
      case 'IfStatement': return this.ifStmt(s, sc, false);
      case 'ForStatement': return this.forStmt(s, sc);
      case 'WhileStatement': return this.whileStmt(s.test, s.body, sc, null, s);
      case 'DoWhileStatement': {
        this.emit('while true:');
        const lp = { kind: 'do', upd: null, test: s.test, sc }; this.loops.push(lp);
        this.ind++;
        this.block(s.body, sc);
        const [c, pre] = this.withPre(() => this.expr(s.test, sc, true));
        this.flushPre(pre);
        this.emit(`if not (${c}): break`);
        this.ind--; this.loops.pop();
        return;
      }
      case 'ForInStatement': {
        const [o, pre] = this.withPre(() => this.expr(s.right, sc)); this.flushPre(pre);
        const id = s.left.type === 'VariableDeclaration' ? s.left.declarations[0].id.name : s.left.name;
        warn(s, 'for-in: en GDScript recorre claves de diccionario (no indices de array)');
        const tmp = sc.gfn.fresh('_k');
        this.emit(`for ${tmp} in _keys(${o}):`);
        this.loops.push({ kind: 'for' });
        this.ind++; this.emit(`${sc.lookup(id).gd} = ${tmp}`); this.ind--;
        this.block(s.body, sc); this.loops.pop();
        return;
      }
      case 'BreakStatement':
        if (s.label) warn(s, 'break con etiqueta');
        return this.emit('break');
      case 'ContinueStatement': {
        if (s.label) warn(s, 'continue con etiqueta');
        return this.emitContinue(this.loops[this.loops.length - 1]);
      }
      case 'SwitchStatement': return this.switchStmt(s, sc);
      case 'TryStatement': {
        // sin excepciones en GDScript: el catch se pierde; el finally se pinta al
        // final del bloque y antes de cada return de dentro.
        const fin = s.finalizer ? s.finalizer.body : null;
        if (fin) (this.fins = this.fins || []).push(fin);
        this.stmts(s.block.body, sc);
        if (fin) { this.fins.pop(); this.stmts(fin, sc); }
        return;
      }
      case 'ThrowStatement': { const [v, pre] = this.withPre(() => this.expr(s.argument, sc)); this.flushPre(pre); return this.emit(`push_error(str(${v}))`); }
      case 'LabeledStatement': warn(s, 'etiqueta ' + s.label.name); return this.stmt(s.body, sc);
      default: warn(s, 'sentencia no soportada ' + s.type); this.emit('pass # ' + s.type);
    }
  }
  emitContinue(lp) {
    if (!lp) return this.emit('continue');
    if (lp.kind === 'switch') { warn({ loc: { start: { line: 0 } } }, 'continue dentro de switch'); return this.emit('continue'); }
    if (lp.upd) for (const u of lp.upd) this.emit(u);
    if (lp.kind === 'do') {
      const [c, pre] = this.withPre(() => this.expr(lp.test, lp.sc, true)); this.flushPre(pre);
      this.emit(`if not (${c}): break`);
    }
    this.emit('continue');
  }
  ifStmt(s, sc, isElif) {
    const [c, pre] = this.withPre(() => this.expr(s.test, sc, true));
    if (isElif && pre.length) { this.emit('else:'); this.ind++; this.flushPre(pre); this.emit(`if ${c}:`); this.tail(s, sc); this.ind--; return; }
    this.flushPre(pre);
    this.emit(`${isElif ? 'elif' : 'if'} ${c}:`);
    this.tail(s, sc);
  }
  tail(s, sc) {
    this.block(s.consequent, sc);
    if (!s.alternate) return;
    if (s.alternate.type === 'IfStatement') return this.ifStmt(s.alternate, sc, true);
    this.emit('else:');
    this.block(s.alternate, sc);
  }
  forStmt(s, sc) {
    if (s.init) {
      if (s.init.type === 'VariableDeclaration') this.stmt(s.init, sc);
      else this.exprStmt(s.init, sc, s);
    }
    const upd = [];
    if (s.update) {
      const L = new T(); L.ind = 0; L.pre = null;
      L.exprStmt(s.update, sc, s);
      upd.push(...L.lines);
    }
    this.whileStmt(s.test, s.body, sc, upd, s);
  }
  whileStmt(test, body, sc, upd, s) {
    const lp = { kind: 'for', upd };
    let c = 'true', pre = [];
    if (test) [c, pre] = this.withPre(() => this.expr(test, sc, true));
    if (pre.length) {
      this.emit('while true:');
      this.ind++; this.flushPre(pre); this.emit(`if not (${c}): break`); this.ind--;
    } else this.emit(`while ${c}:`);
    this.loops.push(lp);
    const n0 = this.lines.length;
    this.ind++;
    if (body.type === 'BlockStatement') this.stmts(body.body, sc); else this.stmt(body, sc);
    const last = body.type === 'BlockStatement' ? body.body[body.body.length - 1] : body;
    const endsJump = last && /^(Return|Break|Continue|Throw)Statement$/.test(last.type);
    if (upd && !endsJump) for (const u of upd) this.emit(u);
    if (this.lines.length === n0) this.emit('pass');
    this.ind--;
    this.loops.pop();
  }
  switchStmt(s, sc) {
    const [d, pre] = this.withPre(() => this.expr(s.discriminant, sc)); this.flushPre(pre);
    const tmp = sc.gfn.fresh('_sw'); sc.gfn.hoist.push(`var ${tmp} = null`);
    this.emit(`${tmp} = ${d}`);
    // casos agrupados (case a: case b: cuerpo); cada cuerpo debe terminar en break/return
    let groups = [], cur = { tests: [], body: [] };
    for (const c of s.cases) {
      cur.tests.push(c.test);
      if (c.consequent.length) { groups.push(cur); cur = { tests: [], body: [] }; groups[groups.length - 1].body = c.consequent; }
    }
    if (cur.tests.length) groups.push(cur);
    let inner = false;
    for (const g of groups) walkNoLoop(g.body.slice(0, -1).concat(g.body.length && g.body[g.body.length - 1].type !== 'BreakStatement' ? [g.body[g.body.length - 1]] : []), n => { if (n.type === 'BreakStatement' && !n.label) inner = true; });
    if (inner) {
      // break en mitad de un caso: el switch va dentro de un bucle de una vuelta
      walkNoLoop(s.cases.map(c => c.consequent), n => { if (n.type === 'ContinueStatement') warn(n, 'continue dentro de switch con break interior'); });
      this.emit('while true:'); this.ind++;
      this.loops.push({ kind: 'sw' });
    }
    let first = true;
    for (const g of groups) {
      const body = g.body.slice();
      const last = body[body.length - 1];
      if (last && last.type === 'BreakStatement') body.pop();
      else if (last && !/^(Return|Throw|Continue)Statement$/.test(last.type)) warn(s, 'switch con caida entre casos');
      const def = g.tests.includes(null);
      if (def) { this.emit(first ? 'if true:' : 'else:'); }
      else {
        const cs = g.tests.map(t => `${tmp} == ${this.expr(t, sc)}`).join(' or ');
        this.emit(`${first ? 'if' : 'elif'} ${cs}:`);
      }
      first = false;
      this.block({ type: 'BlockStatement', body }, sc);
    }
    if (inner) { this.emit('break'); this.ind--; this.loops.pop(); }
  }

  // sentencia-expresion: asignaciones encadenadas, ++, comas, forEach en linea
  exprStmt(e, sc, s) {
    if (e.type === 'SequenceExpression') { for (const x of e.expressions) this.exprStmt(x, sc, s); return; }
    if (e.type === 'Literal') return; // 'use strict'
    if (e.type === 'CallExpression' && e.callee.type === 'MemberExpression' && !e.callee.computed && e.callee.property.name === 'forEach' && isFn(e.arguments[0])) {
      return this.forEachStmt(e, sc);
    }
    if (e.type === 'AssignmentExpression' && e.right.type === 'AssignmentExpression' && e.operator === '=') {
      // a = b = v  ->  b = v ; a = b
      this.exprStmt(e.right, sc, s);
      const [v, pre] = this.withPre(() => this.expr(e.right.left, sc)); this.flushPre(pre);
      if (e.left.type === 'MemberExpression' && e.left.computed) {
        const [o2, pre3] = this.withPre(() => this.lval(e.left.object, sc)); this.flushPre(pre3);
        return this.emit(`_aset(${o2}, ${this.expr(e.left.property, sc)}, ${v})`);
      }
      const [l, pre2] = this.withPre(() => this.lval(e.left, sc)); this.flushPre(pre2);
      return this.emit(`${l} = ${v}`);
    }
    if (e.type === 'LogicalExpression' && (e.operator === '&&' || e.operator === '||')) {
      // a && b();  ->  if a: b()
      const [c, pre] = this.withPre(() => this.expr(e.left, sc, true)); this.flushPre(pre);
      this.emit(`if ${e.operator === '&&' ? '' : 'not '}(${c}):`);
      this.ind++; this.exprStmt(e.right, sc, s); this.ind--;
      return;
    }
    if (e.type === 'ConditionalExpression') {
      this.ifStmt({ test: e.test, consequent: { type: 'ExpressionStatement', expression: e.consequent }, alternate: { type: 'ExpressionStatement', expression: e.alternate } }, sc, false);
      return;
    }
    if (e.type === 'UpdateExpression') {
      const [l, pre] = this.withPre(() => this.lval(e.argument, sc)); this.flushPre(pre);
      return this.emit(`${l} ${e.operator === '++' ? '+=' : '-='} 1`);
    }
    if (e.type === 'UnaryExpression' && e.operator === 'delete') {
      const o = this.expr(e.argument.object, sc);
      const k = e.argument.computed ? this.expr(e.argument.property, sc) : JSON.stringify(e.argument.property.name);
      return this.emit(`${o}.erase(${k})`);
    }
    const [v, pre] = this.withPre(() => e.type === 'AssignmentExpression' ? this.assign(e, sc, true) : this.expr(e, sc, false, true));
    this.flushPre(pre);
    if (v) this.emit(v);
  }
  forEachStmt(e, sc) {
    const fn = e.arguments[0];
    const [arr, pre] = this.withPre(() => this.expr(e.callee.object, sc)); this.flushPre(pre);
    if (hasLoopReturn(fn.body)) {
      // return dentro de un bucle del callback: lambda (sin mutar locales externos)
      const g = sc.gfn.fresh('_cb'); sc.gfn.hoist.push(`var ${g} = null`);
      this.lambdaInto(g, fn, sc, true);
      this.emit(`_each(${arr}, ${g})`);
      return;
    }
    const a = /^[\w]+$/.test(arr) ? arr : (() => { const t = sc.gfn.fresh('_a'); sc.gfn.hoist.push(`var ${t} = null`); this.emit(`${t} = ${arr}`); return t; })();
    const i = sc.gfn.fresh('_i');
    const inner = new Scope(sc, sc.gfn, 'inline');
    const p0 = fn.params[0], p1 = fn.params[1];
    if (p0) { const g = sc.gfn.fresh(p0.name); inner.names.set(p0.name, g); sc.gfn.hoist.push(`var ${g} = null`); }
    if (p1) { const g = sc.gfn.fresh(p1.name); inner.names.set(p1.name, g); sc.gfn.hoist.push(`var ${g} = null`); }
    const resets = [];
    const stmts = fn.body.type === 'BlockStatement' ? fn.body.body : [{ type: 'ExpressionStatement', expression: fn.body }];
    const fns = this.declare(inner, stmts, resets);
    if (fns.length) warn(e, 'funcion anidada dentro de forEach');
    this.emit(`for ${i} in range(_len(${a})):`);
    this.ind++;
    this.emit(`if ${i} >= _len(${a}): break`);
    if (p0) this.emit(`${inner.names.get(p0.name)} = ${a}[${i}]`);
    if (p1) this.emit(`${inner.names.get(p1.name)} = ${i}`);
    for (const r of resets) this.emit(`${r} = null`);
    this.loops.push({ kind: 'each' });
    const n0 = this.lines.length;
    this.stmts(stmts, inner);
    if (this.lines.length === n0) this.emit('pass');
    this.loops.pop();
    this.ind--;
  }

  // ---------------- expresiones
  lval(e, sc) {
    if (e.type === 'Identifier') return this.ident(e, sc, true);
    if (e.type === 'MemberExpression') {
      if (!e.computed && e.property.name === 'length') warn(e, 'asignacion a .length');
      if (e.object.type === 'Identifier' && e.object.name === 'window' && !e.computed) return `win.${e.property.name}`;
      if (fnProp(e, sc)) return fnProp(e, sc);
      const o = this.lval(e.object, sc);
      if (e.computed) return `${o}[${this.expr(e.property, sc)}]`;
      return `${o}.${e.property.name}`;
    }
    return this.expr(e, sc);
  }
  assign(e, sc, isStmt) {
    const l = this.lval(e.left, sc);
    if (e.right.type === 'AssignmentExpression') {
      const inner = this.assign(e.right, sc, false);
      this.pre.push(`${l} = ${inner}`);
      return isStmt ? '' : l;
    }
    let out;
    if (isFn(e.right)) {
      const g = sc.gfn.fresh('_fn'); sc.gfn.hoist.push(`var ${g} = null`);
      this.lambdaInto(g, e.right, sc, true);
      out = `${l} = ${g}`;
    } else {
      const r = this.expr(e.right, sc);
      const op = e.operator;
      if (op === '=' && e.left.type === 'MemberExpression' && e.left.computed) {
        out = `_aset(${this.lval(e.left.object, sc)}, ${this.expr(e.left.property, sc)}, ${r})`;
        if (!isStmt) { this.pre.push(out); return l; }
        return out;
      }
      if (op === '=' || op === '+=' || op === '-=' || op === '*=') {
        if (op === '+=' && this.stringy(e.right)) out = `${l} = str(${l}) + ${r}`;
        else out = `${l} ${op} ${r}`;
      }
      else if (op === '/=') out = `${l} /= ${this.floaty(e.right, r)}`;
      else if (op === '%=') out = `${l} = fmod(${l}, ${r})`;
      else if (op === '|=' || op === '&=' || op === '^=' || op === '<<=' || op === '>>=') out = `${l} = int(${l}) ${op.slice(0, -1)} int(${r})`;
      else if (op === '||=') out = `${l} = ${l} if ${l} else ${r}`;
      else { warn(e, 'operador ' + op); out = `${l} ${op} ${r}`; }
    }
    if (isStmt) return out;
    this.pre.push(out);
    return l;
  }
  floaty(node, s) {
    if (node.type === 'Literal' && typeof node.value === 'number') return Number.isInteger(node.value) ? node.value + '.0' : s;
    return `float(${s})`;
  }
  stringy(n) {
    if (!n) return false;
    if (n.type === 'Literal' && typeof n.value === 'string') return true;
    if (n.type === 'TemplateLiteral') return true;
    if (n.type === 'BinaryExpression' && n.operator === '+') return this.stringy(n.left) || this.stringy(n.right);
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed &&
      ['toFixed', 'join', 'toUpperCase', 'toLowerCase', 'charAt', 'padStart', 'repeat', 'substr', 'substring', 'toString', 'trim'].includes(n.callee.property.name)) return true;
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && ['pad', 'String'].includes(n.callee.name)) return true;
    if (n.type === 'ConditionalExpression') return this.stringy(n.consequent) && this.stringy(n.alternate);
    return false;
  }
  ident(e, sc, isL) {
    const n = e.name;
    const hit = sc.lookup(n);
    if (hit) return hit.gd;
    if (n === 'undefined') return 'null';
    if (n === 'NaN') return 'NAN';
    if (n === 'Infinity') return 'INF';
    if (TOP.has(n)) return gdName(n);
    if (n === 'window') return 'win';
    warn(e, 'identificador global desconocido ' + n);
    return gdName(n);
  }
  // b: contexto booleano; st: sentencia
  expr(e, sc, b, st, forL) {
    switch (e.type) {
      case 'Literal':
        if (e.regex) { warn(e, 'regex ' + e.raw); return JSON.stringify(e.raw); }
        if (e.value === null) return 'null';
        if (typeof e.value === 'string') return JSON.stringify(e.value);
        if (typeof e.value === 'boolean') return String(e.value);
        if (typeof e.value === 'number') {
          if (Number.isInteger(e.value)) return Math.abs(e.value) > 2147483647 ? e.value.toExponential().replace('+', '') : String(e.value);
          let s = String(e.value); if (s.startsWith('.')) s = '0' + s; return s;
        }
        return src(e);
      case 'Identifier': return this.ident(e, sc);
      case 'ThisExpression': warn(e, 'this'); return 'self';
      case 'TemplateLiteral': {
        const parts = [];
        e.quasis.forEach((q, i) => { if (q.value.cooked) parts.push(JSON.stringify(q.value.cooked)); if (e.expressions[i]) parts.push(`str(${this.expr(e.expressions[i], sc)})`); });
        return '(' + (parts.join(' + ') || '""') + ')';
      }
      case 'ArrayExpression': return '[' + e.elements.map(x => x ? this.expr(x, sc) : 'null').join(', ') + ']';
      case 'ObjectExpression': {
        const ps = e.properties.map(p => {
          const k = p.key.type === 'Identifier' ? p.key.name : p.key.value;
          const kk = typeof k === 'number' ? String(k) : JSON.stringify(String(k));
          let v;
          if (isFn(p.value)) { const g = sc.gfn.fresh('_fn'); sc.gfn.hoist.push(`var ${g} = null`); this.lambdaInto(g, p.value, sc, true); v = g; }
          else v = this.expr(p.value, sc);
          return `${kk}: ${v}`;
        });
        return '{' + ps.join(', ') + '}';
      }
      case 'FunctionExpression': case 'ArrowFunctionExpression': {
        const g = sc.gfn.fresh('_fn'); sc.gfn.hoist.push(`var ${g} = null`);
        this.lambdaInto(g, e, sc, true);
        return g;
      }
      case 'UnaryExpression': {
        const a = () => this.expr(e.argument, sc, e.operator === '!');
        switch (e.operator) {
          case '!': return `(not ${this.paren(a())})`;
          case '-': return `-${this.paren(a())}`;
          case '+': return `_num(${a()})`;
          case '~': return `(~int(${a()}))`;
          case 'typeof': return `_typeof(${a()})`;
          case 'void': return 'null';
          default: warn(e, 'unario ' + e.operator); return a();
        }
      }
      case 'UpdateExpression': {
        const l = this.lval(e.argument, sc);
        const op = e.operator === '++' ? '+=' : '-=';
        if (e.prefix) { this.pre.push(`${l} ${op} 1`); return l; }
        const t = sc.gfn.fresh('_u'); sc.gfn.hoist.push(`var ${t} = null`);
        this.pre.push(`${t} = ${l}`, `${l} ${op} 1`);
        return t;
      }
      case 'AssignmentExpression': return this.assign(e, sc, false);
      case 'SequenceExpression': {
        e.expressions.slice(0, -1).forEach(x => { const v = x.type === 'AssignmentExpression' ? this.assign(x, sc, true) : this.expr(x, sc); if (v) this.pre.push(v); });
        return this.expr(e.expressions[e.expressions.length - 1], sc, b);
      }
      case 'ConditionalExpression': {
        const c = this.expr(e.test, sc, true);
        const [x, p1] = this.withPre(() => this.expr(e.consequent, sc, b));
        const [y, p2] = this.withPre(() => this.expr(e.alternate, sc, b));
        if (!p1.length && !p2.length) return `(${x} if ${c} else ${y})`;
        const t = sc.gfn.fresh('_q'); sc.gfn.hoist.push(`var ${t} = null`);
        this.pre.push(`if ${c}:`, ...indentPre(p1), '\u0001\t' + `${t} = ${x}`, 'else:', ...indentPre(p2), '\u0001\t' + `${t} = ${y}`);
        return t;
      }
      case 'LogicalExpression': {
        const L = this.expr(e.left, sc, b);
        const [R, pr] = this.withPre(() => this.expr(e.right, sc, b));
        if (e.operator === '??') { if (pr.length) warn(e, '?? con efecto'); this.pre.push(...pr); return `_nn(${L}, ${R})`; }
        if (pr.length) {
          // el lado derecho tiene efectos: solo se evalua si toca (como en JS)
          const t = sc.gfn.fresh('_l'); sc.gfn.hoist.push(`var ${t} = null`);
          this.pre.push(`${t} = ${L}`, `if ${e.operator === '&&' ? '' : 'not '}${t}:`, ...indentPre(pr), '\u0001\t' + `${t} = ${R}`);
          return t;
        }
        if (b) return `(${L} ${e.operator === '&&' ? 'and' : 'or'} ${R})`;
        const simple = /^[\w.]+$/.test(L) || /^_ix\([\w., "]+\)$/.test(L) || /^[\w.]+\.get\("\w+"\)$/.test(L);
        if (e.operator === '||') return simple ? `(${L} if ${L} else ${R})` : `_or(${L}, ${R})`;
        return simple ? `(${R} if ${L} else ${L})` : `_and(${L}, ${R})`;
      }
      case 'BinaryExpression': return this.binary(e, sc);
      case 'MemberExpression': return this.member(e, sc, b, forL);
      case 'CallExpression': return this.call(e, sc, st);
      case 'NewExpression': {
        const n = e.callee.name;
        const args = e.arguments.map(a => this.expr(a, sc));
        if (n === 'Array') return `_newArray(${args.join(', ')})`;
        if (n === 'Date') return args.length ? `_date(${args[0]})` : `_date(_now())`;
        if (/^(Uint8|Int8|Uint16|Int16|Uint32|Int32|Float32|Float64|Uint8Clamped)Array$/.test(n)) return `_zeros(${args[0]})`;
        warn(e, 'new ' + n);
        return `_new_${n}(${args.join(', ')})`;
      }
      default: warn(e, 'expresion no soportada ' + e.type); return `null # ${e.type}`;
    }
  }
  paren(s) { return /^[\w.]+$/.test(s) || /^\(.*\)$/.test(s) && balanced(s.slice(1, -1)) ? s : `(${s})`; }
  binary(e, sc) {
    const op = e.operator;
    const l = this.expr(e.left, sc), r = this.expr(e.right, sc);
    const P = x => this.paren(x);
    switch (op) {
      case '+':
        if (this.stringy(e.left) || this.stringy(e.right)) {
          const s = (n, x) => this.stringy(n) ? x : `str(${x})`;
          return `${s(e.left, l)} + ${s(e.right, r)}`;
        }
        return `(${l} + ${r})`;
      case '-': case '*': return `(${l} ${op} ${r})`;
      case '/': {
        if (e.left.type === 'Literal' && Number.isInteger(e.left.value)) return `(${l}.0 / ${P(r)})`;
        if (e.right.type === 'Literal' && typeof e.right.value === 'number') return `(${P(l)} / ${this.floaty(e.right, r)})`;
        return `(${P(l)} / float(${r}))`;
      }
      case '%': return `fmod(${l}, ${r})`;
      case '===': case '==': return `(${l} == ${r})`;
      case '!==': case '!=': return `(${l} != ${r})`;
      case '<': case '>': case '<=': case '>=': {
        // undefined < n es falso en JS: una propiedad que falta se lee como NAN (compara falso)
        const nn = x => x.replace(/\.get\(("[^"]+")\)$/, '.get($1, NAN)');
        return `(${nn(l)} ${op} ${nn(r)})`;
      }
      case '|':
        if (e.right.type === 'Literal' && e.right.value === 0) return `int(${l})`;
        return `(int(${l}) | int(${r}))`;
      case '&': case '^': case '<<': case '>>': return `(int(${l}) ${op} int(${r}))`;
      case '>>>': return `(int(${l}) >> int(${r}))`;
      case 'in': return `_has(${r}, ${l})`;
      case 'instanceof': warn(e, 'instanceof'); return `(${l} is ${r})`;
      default: warn(e, 'binario ' + op); return `(${l} ${op} ${r})`;
    }
  }
  member(e, sc, b, forL) {
    const objN = e.object;
    if (objN.type === 'Identifier' && objN.name === 'Math' && !e.computed) {
      const k = e.property.name;
      if (k === 'PI') return 'PI';
      if (k === 'SQRT2') return 'sqrt(2.0)';
      warn(e, 'Math.' + k); return 'null';
    }
    if (objN.type === 'Identifier' && objN.name === 'window' && !e.computed) return `win.get("${e.property.name}")`;
    if (fnProp(e, sc)) return fnProp(e, sc);
    const o = this.expr(objN, sc, false, false, true);
    if (e.computed) {
      const k = this.expr(e.property, sc);
      return `_ix(${o}, ${k})`;
    }
    const k = e.property.name;
    if (k === 'length') return `_len(${o})`;
    if (o === 'g' || CFG.objects.includes(o)) return `${o}.${k}`;
    if (forL) return `${o}.${k}`;  // dentro de una cadena a.b.c: leer el ultimo con get
    return `${o}.get("${k}")`;
  }
  args(e, sc) { return e.arguments.map(a => isFn(a) ? this.expr(a, sc) : this.expr(a, sc)); }
  call(e, sc, st) {
    const c = e.callee;
    if (c.type === 'Identifier') {
      const n = c.name;
      const a = this.args(e, sc);
      const hit = sc.lookup(n);
      if (hit) return `${hit.gd}.call(${a.join(', ')})`;
      const G = { parseInt: x => `_parseInt(${x[0]}, ${x[1] || 10})`, parseFloat: x => `float(${x[0]})`, isNaN: x => `is_nan(float(${x[0]}))`, String: x => `str(${x[0]})`,
        Number: x => `_num(${x[0]})`, isFinite: x => `is_finite(float(${x[0]}))`, Boolean: x => `bool(${x[0]})`, setTimeout: x => `_timeout(${x.join(', ')})`,
        clearTimeout: x => `_untimeout(${x[0]})`, requestAnimationFrame: x => `_raf(${x[0]})`, cancelAnimationFrame: x => `_unraf(${x[0]})` };
      if (G[n]) return G[n](a);
      if (TOP.get(n) === 'v') return `${gdName(n)}.call(${a.join(', ')})`;
      if (TOP.has(n)) return `${gdName(n)}(${a.join(', ')})`;
      warn(e, 'llamada a global desconocida ' + n);
      return `${gdName(n)}(${a.join(', ')})`;
    }
    if (c.type !== 'MemberExpression') { warn(e, 'llamada rara'); return `_callv(${this.expr(c, sc)}, [${this.args(e, sc).join(', ')}])`; }
    if (c.computed) { warn(e, 'llamada a miembro calculado'); return `_callv(${this.expr(c, sc)}, [${this.args(e, sc).join(', ')}])`; }
    const k = c.property.name, on = c.object;
    if (on.type === 'Identifier' && on.name === 'Math') {
      const a = this.args(e, sc);
      if (k === 'min' || k === 'max') return a.length === 2 ? `${k}(${a[0]}, ${a[1]})` : `${k}(${a.join(', ')})`;
      if (MATH[k]) return MATH[k](...a);
      warn(e, 'Math.' + k); return `${k}(${a.join(', ')})`;
    }
    if (on.type === 'Identifier' && on.name === 'JSON') {
      const a = this.args(e, sc);
      return k === 'parse' ? `JSON.parse_string(${a[0]})` : `JSON.stringify(${a[0]})`;
    }
    if (on.type === 'Identifier' && on.name === 'Object') { const a = this.args(e, sc); if (k === 'keys') return `_keys(${a[0]})`; if (k === 'assign') return `_assign(${a.join(', ')})`; warn(e, 'Object.' + k); }
    if (on.type === 'Identifier' && on.name === 'String' && k === 'fromCharCode') return `String.chr(${this.args(e, sc)[0]})`;
    if (on.type === 'Identifier' && on.name === 'Date' && k === 'now') return '_now()';
    if (on.type === 'Identifier' && on.name === 'performance' && k === 'now') return '_perf()';
    if (on.type === 'Identifier' && on.name === 'Array' && k === 'isArray') return `(${this.args(e, sc)[0]} is Array)`;
    const o = this.expr(on, sc, false, false, true);
    // forEach que no es sentencia o con callback no literal
    if (k === 'forEach') {
      const a = this.args(e, sc);
      return `_each(${o}, ${a[0]})`;
    }
    const a = this.args(e, sc);
    const A = a.join(', ');
    switch (k) {
      case 'push': if (st && a.length === 1) return `${o}.append(${a[0]})`; return `_push(${o}, [${A}])`;
      case 'pop': return `${o}.pop_back()`;
      case 'shift': return `${o}.pop_front()`;
      case 'unshift': return `${o}.push_front(${a[0]})`;
      case 'splice': return `_splice(${o}, ${a[0]}, ${a.length > 1 ? a[1] : 'null'}, [${a.slice(2).join(', ')}])`;
      case 'slice': return `_slice(${o}, ${a[0] ?? 'null'}, ${a[1] ?? 'null'})`;
      case 'indexOf': return `_indexOf(${o}, ${a[0]})`;
      case 'lastIndexOf': return `_lastIndexOf(${o}, ${a[0]})`;
      case 'includes': return `_includes(${o}, ${a[0]})`;
      case 'join': return `_join(${o}, ${a[0] ?? '","'})`;
      case 'concat': return `_concat(${o}, [${A}])`;
      case 'reverse': return `_reverse(${o})`;
      case 'sort': return `_sort(${o}, ${a[0] ?? 'null'})`;
      case 'map': case 'filter': case 'some': case 'every': case 'find': case 'findIndex': case 'reduce':
        return `_${k}(${o}, ${A})`;
      case 'fill': if (!a.length) return `${o}.fill()`; return `_fill(${o}, ${A})`;
      case 'split': return `_split(${o}, ${a[0]})`;
      case 'charAt': return `_charAt(${o}, ${a[0]})`;
      case 'charCodeAt': return `_cc(${o}, ${a[0] ?? 0})`;
      case 'toUpperCase': return `str(${o}).to_upper()`;
      case 'toLowerCase': return `str(${o}).to_lower()`;
      case 'trim': return `str(${o}).strip_edges()`;
      case 'substr': return `_substr(${o}, ${A})`;
      case 'substring': return `_substring(${o}, ${A})`;
      case 'padStart': return `_padStart(${o}, ${A})`;
      case 'repeat': return `_repeat(${o}, ${a[0]})`;
      case 'startsWith': return `str(${o}).begins_with(${a[0]})`;
      case 'endsWith': return `str(${o}).ends_with(${a[0]})`;
      case 'toFixed': return `_toFixed(${o}, ${a[0] ?? 0})`;
      case 'toString': return `str(${o})`;
      case 'hasOwnProperty': return `_has(${o}, ${a[0]})`;
      case 'replace': warn(e, 'replace'); return `_replace(${o}, ${A})`;
      case 'call': return `${o}.call(${a.slice(1).join(', ')})`;
      case 'apply': return `${o}.callv(${a[1]})`;
    }
    if (CTX_METHODS.has(k) || o === 'g' || CFG.objects.includes(o)) return `${o}.${k}(${A})`;
    warn(e, `metodo desconocido .${k}()`);
    return `_callm(${o}, "${k}", [${A}])`;
  }
}
function indentPre(pre) { return pre.map(l => '\u0001\t' + (l[0] === '\u0001' ? l.slice(1) : l)); }
function balanced(s) { let d = 0; for (const ch of s) { if (ch === '(') d++; else if (ch === ')' && --d < 0) return false; } return d === 0; }
// propiedad colgada de una funcion (slotMig.done): miembro aparte
const FNPROPS = new Set();
function fnProp(e, sc) {
  if (e.computed || e.object.type !== 'Identifier' || sc.lookup(e.object.name) || TOP.get(e.object.name) !== 'f') return null;
  const n = `${gdName(e.object.name)}__${e.property.name}`;
  FNPROPS.add(n);
  return n;
}
function walkNoLoop(n, f) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) { n.forEach(x => walkNoLoop(x, f)); return; }
  if (isFn(n) || n.type === 'FunctionDeclaration' || /^(For|ForIn|ForOf|While|DoWhile|Switch)Statement$/.test(n.type) || isInlineForEachLike(n)) return;
  if (n.type) f(n);
  for (const k in n) if (k !== 'loc' && n[k] && typeof n[k] === 'object') walkNoLoop(n[k], f);
}
// identificadores que una funcion usa sin declararlos (sin claves de objeto ni .prop)
function freeIds(fnNode) {
  const decl = declaredIn(fnNode), out = new Set();
  (function rec(n, parent, key) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(x => rec(x, parent, key)); return; }
    if (n.type === 'Identifier') {
      if (parent && parent.type === 'MemberExpression' && key === 'property' && !parent.computed) return;
      if (parent && parent.type === 'Property' && key === 'key' && !parent.computed) return;
      if (!decl.has(n.name)) out.add(n.name);
      return;
    }
    for (const k in n) if (k !== 'loc' && n[k] && typeof n[k] === 'object') rec(n[k], n, k);
  })(fnNode.body, null, null);
  if (fnNode.type === 'FunctionDeclaration' && fnNode.id) out.delete(fnNode.id.name);
  return out;
}
function usesId(fnNode, n) { let u = false; walk(fnNode.body, x => { if (x.type === 'Identifier' && x.name === n) u = true; }); return u; }

// marca las llamadas que son sentencia (push en linea, forEach en linea)
walk(BODY, n => { if (n.type === 'ExpressionStatement') n.expression.__stmt = true; });

// ------------------------------------------------------------ salida
const out = [];
out.push('class_name Game');
out.push('extends JsBase');
out.push('# GENERADO por tools/js2gd.js: godot/src/*.gd (a mano) + traduccion de dub-siege.html.');
out.push('# No editar aqui: los cambios van en el JS, en godot/src/*.gd o en tools/js2gd.json.');
out.push('');
for (const f of fs.existsSync(SRC) ? fs.readdirSync(SRC).filter(f => f.endsWith('.gd')).sort() : []) {
  out.push(`# ======================================== src/${f}`, fs.readFileSync(path.join(SRC, f), 'utf8').trimEnd(), '');
}
out.push('# ======================================== traduccion de dub-siege.html', '');
const members = [], boot = [], methods = [];
const bootT = new T(); bootT.ind = 1;
const bootGfn = new GFn(null); const bootSc = new Scope(null, bootGfn, 'fn');
for (const s of BODY) {
  if (inSkip(s)) continue;
  if (s.type === 'FunctionDeclaration') {
    if (SKIP.has(s.id.name)) continue;
    if (RAW[s.id.name]) { methods.push(`# L${s.loc.start.line + lineBase - 1} (a mano)`, ...RAW[s.id.name], ''); continue; }
    methods.push(...new T().method(s.id.name, s, null), '');
  } else if (s.type === 'VariableDeclaration') {
    for (const d of s.declarations) {
      const n = d.id.name;
      if (SKIP.has(n)) continue;
      members.push(`var ${gdName(n)}`);
      if (DATA.has(n)) { bootT.emit(`${gdName(n)} = _data("${n}")`); continue; }
      if (!d.init) continue;
      if (isFn(d.init)) { methods.push(...new T().method(n, d.init, null), ''); members.pop(); continue; }
      const [v, pre] = bootT.withPre(() => bootT.expr(d.init, bootSc));
      bootT.flushPre(pre);
      bootT.emit(`${gdName(n)} = ${v}`);
    }
  } else {
    const key = `L${s.loc.start.line + lineBase - 1}`;
    if (!(CFG.stmts || []).includes(s.loc.start.line)) continue;
    bootT.emit(`# ${key}`);
    bootT.stmt(s, bootSc);
  }
}
out.push(...members, ...[...FNPROPS].map(n => `var ${n} = null`), '');
out.push('func _boot_gen():', ...bootGfn.hoist.map(h => '\t' + h), ...(bootT.lines.length ? bootT.lines : ['\tpass']), '');
out.push(...methods);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n') + '\n');
fs.writeFileSync(path.join(ROOT, 'tools', 'js2gd.warn.txt'), warns.join('\n') + '\n');
console.error(`${methods.filter(l => l.startsWith('func ')).length} funciones, ${members.length} miembros, ${warns.length} avisos`);
