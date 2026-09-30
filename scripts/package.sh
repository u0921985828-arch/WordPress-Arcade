#!/usr/bin/env bash
# Regenera los juegos y crea dist/arcade-core-plugin-<versión>.zip (plugin normal instalable).
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/build_games.py
V=$(grep -oP "const VERSION\s*=\s*'\K[0-9.]+" wp-content/mu-plugins/arcade-core.php)
rm -rf /tmp/arcade-pkg && mkdir -p /tmp/arcade-pkg/arcade-core dist
cp wp-content/mu-plugins/arcade-core.php /tmp/arcade-pkg/arcade-core/
cp -r wp-content/mu-plugins/arcade-core/* /tmp/arcade-pkg/arcade-core/
# SLIM=1: paquete adelgazado para hostings con poco espacio (minifica el JS de los
# juegos y recomprime las miniaturas; no se toca el repositorio, solo esta copia).
if [ "${SLIM:-0}" = "1" ]; then
  TERSER=${TERSER:-terser} node scripts/slim.js /tmp/arcade-pkg/arcade-core/games
  python3 scripts/slim_thumbs.py /tmp/arcade-pkg/arcade-core/games "${THUMBQ:-58}"
  du -sh /tmp/arcade-pkg/arcade-core
fi
(cd /tmp/arcade-pkg && rm -f "$OLDPWD/dist/arcade-core-plugin-$V.zip" && zip -qr "$OLDPWD/dist/arcade-core-plugin-$V.zip" arcade-core)
echo "dist/arcade-core-plugin-$V.zip"
