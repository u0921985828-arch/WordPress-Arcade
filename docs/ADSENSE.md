# Publicidad (AdSense) — guía paso a paso

El plugin ya trae todo lo técnico: `/ads.txt`, código de AdSense, huecos de anuncio separados del juego, anuncios entre partidas (H5 Games Ads), páginas legales y botón «Preferencias de privacidad». Lo que queda es de tu cuenta.

## 1. Antes de pedir la revisión (obligatorio)
1. **Dominio propio.** AdSense no aprueba subdominios temporales (`*.live-website.com`). Compra el dominio en IONOS y asígnalo a la web (Dominios → Usar dominio → WordPress). Después, en WordPress → Ajustes → Generales, pon la URL nueva.
2. **Título del sitio**: Ajustes → Generales → «Título del sitio» (no dejes «My Blog»).
3. **Datos del titular** (LSSI): Ajustes → Arcade → rellena nombre, NIF, domicilio y correo.
4. **Páginas legales**: en Ajustes → Arcade marca «Crear/actualizar los borradores» y guarda. Ve a Páginas, revisa y **publica** las 5 (Aviso legal, Privacidad, Cookies, Contacto, Sobre nosotros).
5. **Privacidad**: Ajustes → Privacidad → elige la página «Política de privacidad».
6. Ajustes → Lectura: desmarca «Disuadir a los motores de búsqueda».
7. En Ajustes → Arcade la lista «Estado» debe salir toda en ✅.

## 2. Alta en AdSense
1. Entra en https://adsense.google.com con tu cuenta de Google → «Empezar» → pon tu dominio.
2. Copia el **ID de editor** (`pub-XXXXXXXXXXXXXXXX`, en Cuenta → Información de la cuenta) y pégalo en Ajustes → Arcade → «ID de editor». Guarda.
   - Con eso ya se sirven el código de AdSense y `https://tudominio/ads.txt`. No hace falta pegar nada en el tema.
3. En AdSense → Sitios → tu dominio → «Solicitar revisión». Tarda de unos días a 2-4 semanas.

## 3. Mensaje de consentimiento (RGPD) — obligatorio en la UE
1. AdSense → Privacidad y mensajes → **RGPD / Consentimiento europeo** → Crear mensaje.
2. Elige tu sitio, idioma español, activa «Gestionar opciones» y publica.
3. El botón «Preferencias de privacidad» del pie de la web aparece solo cuando el mensaje está activo, y permite al usuario cambiar su elección (lo exige Google).

## 4. Bloques de anuncio (cuando te aprueben)
1. AdSense → Anuncios → **Por bloque de anuncios** → Display:
   - «Arcade adaptable» (formato adaptable) → copia el número `data-ad-slot` → Ajustes → Arcade → «Bloque adaptable».
   - Opcional: «Arcade lateral» (vertical) → «Bloque vertical» (se ve solo en ordenador, junto al juego).
2. Dónde salen: bajo el juego (antes de la descripción), lateral en ordenador, entre secciones de la portada y cada 15 juegos en los listados. **Nunca** junto a los controles ni encima del juego (política de Google para juegos).
3. **Anuncios automáticos**: si los activas en AdSense → Anuncios → Por sitio, deja SOLO «Anuncios de anclaje» y «Viñeta» (intersticial entre páginas). Desactiva «Anuncios in-page» para no tapar los juegos.

## 5. Anuncios dentro de los juegos (H5 Games Ads) — lo que más paga
1. Solicita el acceso: https://support.google.com/adsense/answer/9959170 («Anuncios para juegos HTML5»). Hay que tener la cuenta aprobada.
2. Cuando te lo concedan: Ajustes → Arcade → marca «Activar H5 Games Ads» y elige la frecuencia (2 minutos recomendado).
3. Funciona solo: anuncio al abrir un juego (`start`) y al pulsar «Jugar otra vez» (`next`), con el juego en pausa y sin sonido mientras se ve el anuncio.

## 6. Probar sin romper nada
- **Ver dónde irán los huecos** (sin AdSense): identifícate como admin y abre cualquier página con `?adpreview=1` al final (ej. `https://tudominio/?adpreview=1`).
- **Modo de prueba**: Ajustes → Arcade → «Anuncios de prueba». Muestra anuncios de prueba y fuerza los de juego. **Desactívalo** al publicar, o no cobrarás.
- Nunca pulses tus propios anuncios (Google suspende la cuenta).

## 7. Consejos para cobrar más
- El tráfico manda: comparte juegos en redes, TikTok/Shorts de partidas, y deja que Google indexe (Search Console → añade el dominio y envía `https://tudominio/wp-sitemap.xml`).
- Añade juegos importados (Games → Importar catálogo) para tener más páginas.
- Velocidad: activa la caché de IONOS o un plugin de caché de página.
