/* Adelgaza una copia del plugin para hostings con poco espacio.
   Minifica el JS de los juegos SIN tocar los nombres de nivel superior (las pruebas
   los inspeccionan) y sin renombrar propiedades. No se toca el repositorio: trabaja
   sobre la copia que hace package.sh. */
const fs = require('fs'), path = require('path');
const terser = require(process.env.TERSER || 'terser');
const root = process.argv[2];
if (!root) { console.error('uso: slim.js <carpeta>'); process.exit(1); }
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) files.push(p);
  }
})(root);
let a = 0, b = 0, bad = 0;
(async () => {
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    a += Buffer.byteLength(src);
    try {
      const r = await terser.minify(src, {
        compress: { passes: 2 },
        mangle: { toplevel: false },   // globales intactas: las pruebas las leen
        format: { comments: false },
        toplevel: false,
        sourceMap: false,
      });
      if (!r.code || r.code.length >= src.length) { b += Buffer.byteLength(src); continue; }
      fs.writeFileSync(f, r.code);
      b += Buffer.byteLength(r.code);
    } catch (e) { bad++; b += Buffer.byteLength(src); console.error('AVISO', f, e.message); }
  }
  console.log(`js: ${files.length} ficheros, ${(a/1048576).toFixed(2)} -> ${(b/1048576).toFixed(2)} MB, fallos ${bad}`);
})();
