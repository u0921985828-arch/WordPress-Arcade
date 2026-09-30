#!/usr/bin/env bash
# Regenera los juegos y crea dist/arcade-core-plugin-<versión>.zip (plugin normal instalable).
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/build_games.py
V=$(grep -oP "const VERSION\s*=\s*'\K[0-9.]+" wp-content/mu-plugins/arcade-core.php)
# FOLDER: nombre de la carpeta del plugin (por defecto arcade-core). Cambiarlo sirve
# para instalar en limpio cuando el hosting dejó una carpeta rota que no se puede borrar:
# todas las rutas del plugin salen de __DIR__/plugins_url(), así que el nombre da igual.
F=${FOLDER:-arcade-core}
rm -rf /tmp/arcade-pkg && mkdir -p "/tmp/arcade-pkg/$F" dist
cp wp-content/mu-plugins/arcade-core.php "/tmp/arcade-pkg/$F/"
cp -r wp-content/mu-plugins/arcade-core/* "/tmp/arcade-pkg/$F/"
# SLIM=1: paquete adelgazado para hostings con poco espacio (minifica el JS de los
# juegos y recomprime las miniaturas; no se toca el repositorio, solo esta copia).
if [ "${SLIM:-0}" = "1" ]; then
  TERSER=${TERSER:-terser} node scripts/slim.js "/tmp/arcade-pkg/$F/games"
  python3 scripts/slim_thumbs.py "/tmp/arcade-pkg/$F/games" "${THUMBQ:-58}"
  du -sh "/tmp/arcade-pkg/$F"
fi
Z=${ZIPNAME:-arcade-core-plugin-$V}
(cd /tmp/arcade-pkg && rm -f "$OLDPWD/dist/$Z.zip" && zip -qr "$OLDPWD/dist/$Z.zip" "$F")
echo "dist/$Z.zip"
