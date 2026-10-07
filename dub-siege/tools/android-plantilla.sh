#!/usr/bin/env bash
# Instala la plantilla Gradle de Godot en android/build y le pone el arreglo de «atrás».
# Con targetSdk 36 (Android 16) el sistema se queda con el botón atrás (atrás predictivo)
# y cierra la app en vez de mandárselo al juego, que lo usa para pausar. Se desactiva con
# android:enableOnBackInvokedCallback="false" en <application> del manifiesto principal:
# Godot escribe su parte en src/release/AndroidManifest.xml y Gradle funde los dos.
# Uso (desde dub-siege/): tools/android-plantilla.sh <versión de Godot, p. ej. 4.7.2>
set -euo pipefail
v="$1"
zip=~/.local/share/godot/export_templates/${v}.stable/android_source.zip
rm -rf android/build
mkdir -p android/build
unzip -q "$zip" -d android/build
touch android/build/.gdignore
echo "${v}.stable" > android/.build_version
m=android/build/src/main/AndroidManifest.xml
sed -i 's|android:hasFragileUserData="false"|android:hasFragileUserData="false"\n        android:enableOnBackInvokedCallback="false"|' "$m"
grep -q 'android:enableOnBackInvokedCallback="false"' "$m"
