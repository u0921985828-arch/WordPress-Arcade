# Liga de Barrios de Barakaldo — plugin de WordPress

Que se tocó del juego al meterlo en el plugin (una sola cosa):

- `game/index.html` es el `liga-barrios-barakaldo.html` del repositorio original tal cual,
  con las dos líneas de Google Fonts cambiadas por `<link rel="stylesheet" href="fonts/pixelify.css">`.
  La fuente **Pixelify Sans** (licencia SIL OFL 1.1, se puede redistribuir) va en `game/fonts/`,
  así que el juego no hace ninguna petición a Google: ni `fonts.googleapis.com` ni `fonts.gstatic.com`.
  Eso es lo que hace falta para no tener que pedir consentimiento por la fuente (RGPD).

Para actualizar el juego cuando cambie el repositorio original:

```bash
cp liga-barrios-barakaldo.html game/index.html
python3 - <<'PY'
p='game/index.html'; h=open(p,encoding='utf-8').read()
old='<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;700&display=swap" rel="stylesheet">'
h=h.replace(old,'<link rel="stylesheet" href="fonts/pixelify.css">',1)
open(p,'w',encoding='utf-8').write(h)
PY
```

Y sube la `Version` de la cabecera y `const VERSION` de `liga-barrios.php`.
