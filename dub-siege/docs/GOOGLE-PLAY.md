# Dub Siege en Google Play

Guía para publicar Dub Siege. Lo técnico ya está hecho y se comprueba solo en cada compilación. Lo que queda son formularios de la Play Console, y aquí van las respuestas.

## 1. Lo que ya cumple (comprobado en cada compilación)

| Requisito de Google Play | Estado |
|---|---|
| Formato **AAB** (Android App Bundle) | `DubSiege.aab` en la descarga fija (abajo) |
| **Android 16 (API 36)** como versión objetivo (obligatorio desde el 31/08/2026) | targetSdk 36, minSdk 24 (Android 7) |
| **64 bits** | arm64-v8a, y también armeabi-v7a para móviles antiguos |
| Páginas de memoria de **16 KB** (Android 15+) | librerías alineadas a 16 KB |
| Permisos mínimos | solo **vibración**: sin internet, sin ubicación, sin contactos ni almacenamiento |
| Sin publicidad, sin compras, sin analítica, sin cuentas | sí |
| Firma | firmado; usar «Firma de aplicaciones de Google Play» (paso 4) |
| Peso | ~72 MB de descarga en un móvil normal (el límite es 200 MB) |
| Licencias de terceros | en los créditos (Godot, FreeType, fuente Press Start 2P) y texto completo dentro de la app |
| Contenido | personajes inventados, sin canciones reales ni letras, música y arte propios |

Descargas:
- AAB para Play: https://github.com/u0921985828-arch/WordPress-Arcade/releases/download/dub-siege-apk/DubSiege.aab
- APK para probar en tu móvil: https://github.com/u0921985828-arch/WordPress-Arcade/releases/download/dub-siege-apk/DubSiege.apk

## 2. Antes de empezar (5 minutos)

1. **Sube el plugin `arcade-core` 1.51.1** a la web, como siempre: Plugins → Añadir nuevo → Subir plugin → «Reemplazar actual con el subido». Trae la página de privacidad de la app.
2. En **Ajustes → Arcade**, rellena **nombre o razón social** y **correo de contacto**. Salen en la página de privacidad.
3. Comprueba que se abre: `https://myblog-wr1k1xoqsf.live-website.com/privacidad-app/`. Cuando funcione el dominio, será `https://kuboplay.online/privacidad-app/`, y en Play conviene poner esa.

## 3. Cuenta de desarrollador

- Ve a play.google.com/console. Cuesta **25 $** (pago único) y pide verificar la identidad con DNI.
- **Cuenta personal nueva**: antes de publicar para todo el mundo, Google exige una **prueba cerrada con al menos 12 personas durante 14 días seguidos**. Busca 12 amigos con Android y cuenta de Google: cada uno tiene que aceptar la invitación y no salirse en esos 14 días.
- Una cuenta de **organización** (empresa) no tiene esta obligación, pero pide un número D-U-N-S.

## 4. Crear la app

**Crear aplicación**:
- Nombre: `Dub Siege`
- Idioma predeterminado: Español (España)
- Tipo: **Juego** · Precio: **Gratis**
- Acepta las declaraciones.

**Firma**: al subir el primer AAB, deja que **Google genere y guarde la clave de firma** (Firma de aplicaciones de Google Play). La clave del repositorio queda solo como «clave de subida».

## 5. Contenido de la aplicación (menú Política → Contenido de la aplicación)

| Formulario | Respuesta |
|---|---|
| Política de privacidad | la URL del paso 2 |
| Acceso a la aplicación | Toda la funcionalidad está disponible sin restricciones |
| Anuncios | **No**, la app no contiene anuncios |
| Clasificación de contenido | ver abajo |
| Público objetivo | **13 a 15, 16 a 17 y 18 o más**. No marques menores de 13 (si los marcas, entra en el programa Familias, con normas aparte). «¿Atrae a niños?»: No |
| Seguridad de los datos | ¿Recoge o comparte datos? **No**. Así de simple: todo se queda en el móvil |
| Aplicación gubernamental | No |
| Funciones financieras | Ninguna |
| Salud | Ninguna |
| Aplicación de noticias | No |

**Clasificación de contenido (cuestionario IARC)**, categoría **Juego**:
- Violencia: **Sí**. Violencia de fantasía o de dibujos animados, contra personajes inventados, **sin sangre** ni desmembramientos. Se dispara con pistola a robots, máquinas y personajes inventados; al caer desaparecen en un destello.
- Miedo o terror: No
- Contenido sexual o desnudos: No
- Lenguaje malsonante: No
- Drogas, alcohol, tabaco: No
- Apuestas o juegos de azar simulados: No
- Interacción entre usuarios, chat o contenido generado por usuarios: No
- Comparte la ubicación: No
- Compras digitales: No
- Referencias históricas: el archivo cuenta la historia real de la discriminación que sufrieron los inmigrantes del Caribe en Londres (carteles de «ni negros, ni irlandeses»). Es contexto histórico y educativo, no discurso de odio. Si el cuestionario pregunta por **discriminación**, responde que aparece **como contexto histórico, sin promoverla**.

El resultado esperado es PEGI 7 o PEGI 12.

## 6. Ficha de Play Store (Crecimiento → Presencia en Play Store → Ficha principal)

**Descripción breve** (máx. 80):
> Defiende tu sound system en un arcade de disparos pixel art por el Londres de 1955-1981.

**Descripción completa** (máx. 4000):
> Tu sound system lo es todo. Esta noche te han robado las cintas de papá y doce jefes quieren silenciar la ciudad. Coge tu pistola, carga el Bass Drop y recupera la música.
>
> DUB SIEGE es un arcade de disparos y plataformas en pixel art, con 12 fases que recorren la historia del reggae en el sur de Londres: de sus raíces en 1955 al ska, el rocksteady, el roots, el dub, el lovers rock y el rub-a-dub de 1981.
>
> • 12 fases con su propio jefe final, cada uno con sus fases de ataque
> • Bass Drop: llena la barra y haz temblar la pantalla
> • Dash que atraviesa balas, mochila con objetos y tienda de mejoras
> • Música sintetizada en el propio juego, que cambia contigo
> • Historia contada en escenas ilustradas y cintas que coleccionar
> • Controles táctiles a medida, y también mando y teclado
> • Seis ranuras de guardado, tres dificultades y modo asistido
> • Sin anuncios, sin compras dentro de la app y sin conexión a internet
>
> Todos los personajes son inventados.

**Gráficos** (en esta misma carpeta, `docs/play/`):
- Icono de la aplicación, 512×512: `icono-512.png`
- Gráfico destacado, 1024×500: `grafico-destacado-1024x500.png`
- Capturas de teléfono, 1920×1080: `captura-1-portada.png` a `captura-6-historia.png` (sube al menos 4)

**Categoría**: Juegos → **Acción**. Etiquetas: Arcade, Disparos, Pixel art, Plataformas.
**Datos de contacto**: tu correo.

## 7. Subir y probar

1. **Pruebas → Pruebas internas** → Crear versión → sube `DubSiege.aab`. Añádete como probador y prueba que se instala desde Play.
2. **Pruebas → Prueba cerrada** → la misma versión → añade a los 12 probadores (lista de correos) → enviar a revisión. Empiezan a contar los 14 días.
3. Pasados los 14 días: **Panel → Solicitar acceso a producción** (contesta las preguntas sobre la prueba) → cuando lo aprueben, **Producción** → Crear versión.

**Cada versión nueva** sale sola en GitHub (`DubSiege.aab`) con el número de versión subido. Solo hay que subirla en la consola.

## 8. Avisos

- **Tu móvil**: el APK que instalas desde GitHub y el de Play van firmados con claves distintas. Para pasar a la versión de Play hay que **desinstalar la de GitHub**, y se pierde la partida guardada.
- **Clave de subida**: está en el repositorio, que es público. No es grave, porque sin tu cuenta de Play nadie puede subir nada y la clave buena la guarda Google. Aun así, cuando la app esté publicada, conviene cambiarla: Play Console → Integridad de la aplicación → «Solicitar restablecimiento de la clave de subida».
- **Si Play rechaza algo**: copia el mensaje del rechazo y pásamelo.
