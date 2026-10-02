# Liga de Barrios de Barakaldo — plugin de WordPress

Que se tocó del juego al meterlo en el plugin (una sola cosa):

- `game/index.html` es el `liga-barrios-barakaldo.html` del repositorio original tal cual,
  con las dos líneas de Google Fonts cambiadas por `<link rel="stylesheet" href="fonts/fonts.css">`.
  Las fuentes **Pixelify Sans** y **Nunito** (las dos con licencia SIL OFL 1.1, se pueden
  redistribuir) van en `game/fonts/`, así que el juego no hace ninguna petición a Google: ni
  `fonts.googleapis.com` ni `fonts.gstatic.com`. Eso es lo que hace falta para no tener que pedir
  consentimiento por la fuente (RGPD).
- Aparte, `liga-barrios.php` inyecta `game/kuboplay-fix.css` antes de `</head>` (maquetación de la
  pantalla de título y ergonomía: diana mínima de 44×44 px y suelo de tamaño de letra). Eso no toca
  el HTML de upstream.

Para actualizar el juego cuando cambie el repositorio original:

```bash
cp liga-barrios-barakaldo.html game/index.html
python3 - <<'PY'
p='game/index.html'; h=open(p,encoding='utf-8').read()
old=('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
     '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900'
     '&family=Pixelify+Sans:wght@400;700&display=swap" rel="stylesheet">')
assert old in h
h=h.replace(old,'<link rel="stylesheet" href="fonts/fonts.css">',1)
assert 'fonts.googleapis' not in h and 'fonts.gstatic' not in h
open(p,'w',encoding='utf-8').write(h)
PY
```

Si upstream añade una fuente nueva, hay que bajar sus `.woff2` a `game/fonts/` y añadir sus
`@font-face` a `game/fonts/fonts.css` con rutas locales.

Y sube la `Version` de la cabecera y `const VERSION` de `liga-barrios.php`.
