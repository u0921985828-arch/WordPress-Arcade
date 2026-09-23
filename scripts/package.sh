#!/usr/bin/env bash
# Regenera los juegos y crea dist/arcade-core-plugin-<versión>.zip (plugin normal instalable).
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/build_games.py
V=$(grep -oP "const VERSION\s*=\s*'\K[0-9.]+" wp-content/mu-plugins/arcade-core.php)
rm -rf /tmp/arcade-pkg && mkdir -p /tmp/arcade-pkg/arcade-core dist
cp wp-content/mu-plugins/arcade-core.php /tmp/arcade-pkg/arcade-core/
cp -r wp-content/mu-plugins/arcade-core/* /tmp/arcade-pkg/arcade-core/
(cd /tmp/arcade-pkg && rm -f "$OLDPWD/dist/arcade-core-plugin-$V.zip" && zip -qr "$OLDPWD/dist/arcade-core-plugin-$V.zip" arcade-core)
echo "dist/arcade-core-plugin-$V.zip"
