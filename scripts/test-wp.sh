#!/usr/bin/env bash
# WordPress local de pruebas con SQLite (sin MySQL) en http://127.0.0.1:8900 (admin/admin).
# Requisitos: php-cli php-sqlite3 php-xml php-mbstring, curl, unzip, wp-cli.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; WP=/tmp/wp
if [ ! -f "$WP/wp-config.php" ]; then
  mkdir -p $WP && cd $WP
  # GitHub en vez de wordpress.org (en algunos entornos wordpress.org está bloqueado)
  [ -f index.php ] || git clone -q --depth 1 https://github.com/WordPress/WordPress .
  [ -d wp-content/plugins/sqlite-database-integration ] || git clone -q --depth 1 --branch v2.2.9 https://github.com/WordPress/sqlite-database-integration wp-content/plugins/sqlite-database-integration
  cp wp-content/plugins/sqlite-database-integration/db.copy wp-content/db.php
  sed -i "s#{SQLITE_IMPLEMENTATION_FOLDER_PATH}#$WP/wp-content/plugins/sqlite-database-integration#; s#{SQLITE_PLUGIN}#sqlite-database-integration/load.php#" wp-content/db.php
  cp wp-config-sample.php wp-config.php
  wp core install --url=http://127.0.0.1:8900 --title="My Blog" --admin_user=admin --admin_password=admin --admin_email=admin@example.com --skip-email --allow-root
  [ -d wp-content/plugins/wordpress-importer ] || git clone -q --depth 1 https://github.com/WordPress/wordpress-importer wp-content/plugins/wordpress-importer
  wp plugin activate wordpress-importer --allow-root
  echo '<?php $f = __DIR__ . parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH); if (is_file($f)) return false; require __DIR__ . "/index.php";' > router.php
fi
# Sincroniza el plugin del repo al WP de pruebas
rm -rf $WP/wp-content/plugins/arcade-core && mkdir -p $WP/wp-content/plugins/arcade-core
cp "$ROOT/wp-content/mu-plugins/arcade-core.php" $WP/wp-content/plugins/arcade-core/
cp -r "$ROOT/wp-content/mu-plugins/arcade-core/"* $WP/wp-content/plugins/arcade-core/
cd $WP && wp plugin activate arcade-core --allow-root >/dev/null
if [ "$(wp post list --post_type=game --format=count --allow-root)" = "0" ]; then
  sed 's#https://myblog-wr1k1xoqsf.live-website.com#http://127.0.0.1:8900#g' "$ROOT/arcade_pilot_100.xml" > /tmp/imp.xml
  wp import /tmp/imp.xml --authors=skip --allow-root >/dev/null
  wp rewrite structure '/%postname%/' --allow-root >/dev/null
fi
pgrep -f "php -S 127.0.0.1:8900" >/dev/null || (setsid nohup php -S 127.0.0.1:8900 router.php > /tmp/wp-server.log 2>&1 < /dev/null &)
echo "WordPress de pruebas: http://127.0.0.1:8900  (admin / admin)"
