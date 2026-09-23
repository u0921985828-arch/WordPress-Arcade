/* Mahjong Solitaire: empareja fichas libres iguales (disposición generada para ser resoluble) */
const k = Kit({ w: 640, h: 480, title: CFG.title, bg: '#123524' }), c = k.ctx;
const TW = 40, TH = 52, SYM = ['🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍', '🀎', '🀏', '🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀐', '🀑', '🀒', '🀓', '🀔', '🀀', '🀁', '🀂', '🀃', '🀄', '🀅', '🀆'];
const GLY = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '①', '②', '③', '④', '⑤', '⑥', 'I', 'II', 'III', 'IV', 'V', 'E', 'S', 'O', 'N', '中', '發', '白'];
const HUE = (i) => `hsl(${(i * 47) % 360} 70% 38%)`;
let tiles, sel, score, level, done, hints, t;
function layout() { const L = []; for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) if (!(y === 0 || y === 5) || (x > 1 && x < 10)) L.push([x, y, 0]); for (let y = 1; y < 5; y++) for (let x = 3; x < 9; x++) L.push([x, y, 1]); for (let y = 2; y < 4; y++) for (let x = 4; x < 8; x++) L.push([x, y, 2]); L.push([5.5, 2.5, 3]); return L; }
const blocks = (a, b) => b.z === a.z + 1 && Math.abs(b.x - a.x) < 1 && Math.abs(b.y - a.y) < 1;
function free(tl, set) { if (set.some((o) => o !== tl && blocks(tl, o))) return false; const side = (dx) => set.some((o) => o !== tl && o.z === tl.z && Math.abs(o.y - tl.y) < 1 && Math.abs(o.x - (tl.x + dx)) < 0.5); return !side(-1) || !side(1); }
function build() {
  tiles = null; const L = layout(); let pos = L.map(([x, y, z]) => ({ x, y, z })); if (pos.length % 2) pos.pop();
  for (let tries = 0; tries < 50; tries++) { const rem = pos.map((p) => ({ ...p })), placed = []; let ok = true; const types = k.shuffle([...Array(pos.length / 2).keys()].map((i) => i % SYM.length));
    for (const ty of types) { const fr = rem.filter((p) => free(p, rem)); if (fr.length < 2) { ok = false; break; } k.shuffle(fr); const a = fr[0], b = fr[1]; a.t = ty; b.t = ty; placed.push(a, b); rem.splice(rem.indexOf(a), 1); rem.splice(rem.indexOf(b), 1); }
    if (ok) { tiles = placed; break; } }
  if (!tiles || !tiles.length) return build();
  sel = null; done = false; hints = 3; t = 0;
}
function moves() { const fr = tiles.filter((q) => free(q, tiles)); for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length; j++) if (fr[i].t === fr[j].t) return [fr[i], fr[j]]; return null; }
function reset() { if (!level || k.st === 'over' && !done) { level = 1; score = 0; } build(); }
reset(); k.show(CFG.title, 'Toca dos fichas iguales que estén libres (sin nada encima y con un lado libre). B o el botón = pista.');
let hint = null, shuf = false;
k.run((dt) => {
  if (!k.gate(reset) || done) return; t += dt;
  const ox = 320 - 6 * TW, oy = 70;
  if (k.ptr.hit) {
    if (k.ptr.y > 440 && k.ptr.x > 250 && k.ptr.x < 390) { if (hints > 0) { hint = moves(); hints--; } return; }
    const order = [...tiles].sort((a, b) => b.z - a.z || b.y - a.y || b.x - a.x);
    const tl = order.find((q) => { const x = ox + q.x * TW - q.z * 5, y = oy + q.y * TH - q.z * 6; return k.ptr.x > x && k.ptr.x < x + TW && k.ptr.y > y && k.ptr.y < y + TH; });
    if (tl && free(tl, tiles)) { if (sel && sel !== tl && sel.t === tl.t) { tiles = tiles.filter((q) => q !== sel && q !== tl); score += 20; { const ox2 = 320 - 6 * TW, oy2 = 70; for (const q of [sel, tl]) k.burst(ox2 + q.x * TW - q.z * 5 + TW / 2, oy2 + q.y * TH - q.z * 6 + TH / 2, HUE(q.t), 8, 100); } sel = null; hint = null; navigator.vibrate && navigator.vibrate(15);
        if (!tiles.length) { done = true; score += Math.max(100, 1000 - Math.floor(t) * 2); setTimeout(() => { k.st = 'over'; k.show('¡Tablero limpio!', `${score} puntos<br>Toca para otra partida`); level++; }, 300); }
        else if (!moves()) { k.lose(CFG.id, score, 'Sin parejas libres'); } }
      else sel = sel === tl ? null : tl; } else sel = null;
  }
  if (k.hit.has('b') && hints > 0) { hint = moves(); hints--; }
}, () => {
  k.clear(); const ox = 320 - 6 * TW, oy = 70; k.text(CFG.title, 12, 12, 20, '#f2d15c'); k.text(`${score} · Fichas ${tiles.length}`, 628, 14, 15, '#fff', 'right');
  for (const q of [...tiles].sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y)) { const x = ox + q.x * TW - q.z * 5, y = oy + q.y * TH - q.z * 6, fr = free(q, tiles);
    k.rrect(x + 4, y + 4, TW, TH, 5, '#8a7a5a'); k.rrect(x, y, TW, TH, 5, q === sel ? '#ffe98a' : hint && hint.includes(q) ? '#b8f7c8' : '#f6efdc');
    k.text(GLY[q.t], x + TW / 2, y + 14, q.t >= 24 ? 22 : 18, HUE(q.t), 'center'); k.text(q.t < 9 ? '萬' : q.t < 15 ? '●' : q.t < 20 ? '竹' : '', x + TW / 2, y + 36, 11, HUE(q.t), 'center');
    if (!fr) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x, y, TW, TH); } }
  k.rrect(250, 444, 140, 30, 15, 'rgba(0,0,0,.35)'); k.text(`💡 Pista (${hints})`, 320, 451, 14, '#fff', 'center');
});
