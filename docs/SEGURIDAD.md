# Seguridad y velocidad de Kuboplay — guía para Eddie

Guía práctica, sin tecnicismos. Todo se puede hacer desde el móvil.
Lo importante en dos líneas:

- **Cloudflare** (gratis) es lo que de verdad para los ataques grandes. Es el paso 1 y solo se hace una vez.
- **Kuboplay Shield** (el plugin) es el filtro fino de dentro de casa: robots, gente probando contraseñas y velocidad. Ajustes → menú **Kuboplay Shield** en el escritorio de WordPress.

---

## 1. Poner Cloudflare gratis delante de kuboplay.online

Cloudflare se pone «delante» de tu web: las visitas llegan antes a ellos que a tu servidor de IONOS. Filtran lo malo y guardan copia de lo bueno, así la web va más rápida. El plan gratuito sobra.

**Tarda unos 15 minutos + unas horas de espera.** Mejor hazlo un rato tranquilo, no un sábado por la noche.

1. Entra en **cloudflare.com** y pulsa **Sign Up**. Pon tu correo y una contraseña larga. Confirma el correo que te llega.
2. Ya dentro, pulsa **Add a site** (Añadir un sitio) y escribe `kuboplay.online`. Sin `www` ni `https://`.
3. Te pregunta el plan: elige **Free** (0 €/mes) y continúa.
4. Cloudflare escanea tu dominio solo (30–60 segundos) y te enseña la lista de registros DNS. **No toques nada**, solo comprueba que aparece algo que apunte a IONOS y dale a **Continue**.
5. Ahora te enseña **dos servidores de nombres** (nameservers), con esta pinta:
   `ana.ns.cloudflare.com` y `bob.ns.cloudflare.com` (los tuyos serán otros nombres).
   **Cópialos tal cual.** Si estás en el móvil, haz captura además de copiar.
6. Abre **PiensaSolutions** (donde compraste el dominio), entra en tu cuenta → **Dominios** → `kuboplay.online` → **Servidores DNS / Nameservers** (puede llamarse «Cambiar DNS»).
7. Borra los servidores que haya y pon **solo los dos de Cloudflare**. Guarda.
8. Vuelve a Cloudflare y pulsa **Done, check nameservers**. Ahora toca **esperar**: normalmente 1–4 horas, como mucho 24. Te llega un correo con «is now active».

   > Mientras tanto la web **sigue funcionando**. No la toques ni cambies nada más.

9. Cuando esté activo, haz estos cuatro ajustes en el panel de Cloudflare (menú de la izquierda):
   - **SSL/TLS → Overview**: pon el modo en **Full** (o *Full (strict)* si te deja sin dar error). **Nunca «Flexible»**: rompe el candado y hace bucles.
   - **SSL/TLS → Edge Certificates**: activa **Always Use HTTPS**.
   - **Security → Bots**: activa **Bot Fight Mode**. Esto solo ya te quita la mayoría de robots basura.
   - **Caching → Configuration**: deja **Caching Level: Standard** y **Browser Cache TTL** en 4 horas o más.
10. **Under Attack Mode**: está en **Security → Settings** (o en el resumen del dominio). **Déjalo apagado.** Solo se enciende si la web está caída o lentísima por un ataque: pone una pantalla de «comprobando tu navegador» de 5 segundos a todo el mundo. **Apágalo en cuanto pase**, porque molesta a los jugadores de verdad.

**Truco:** si algún día cambias algo en la web y no lo ves, en Cloudflare entra en **Caching → Configuration → Purge Everything**. Es seguro.

---

## 2. Qué hace y qué NO hace el plugin Kuboplay Shield

**Sí hace:**

- Corta a quien pide muchísimas páginas por minuto (robots que rascan el catálogo).
- Blinda la pantalla de acceso: limita los intentos de contraseña fallidos.
- Añade cabeceras de seguridad y tapa datos que WordPress cuenta de más.
- Guarda copia de las páginas (caché) para que la web vaya rápida y el servidor sufra menos.
- Te enseña en **Estado** cuántas visitas ha bloqueado hoy y en 7 días.

**No hace (y ningún plugin puede):**

- **Parar un DDoS de verdad.** Si te mandan cien mil peticiones por segundo, el servidor de IONOS se ahoga antes de que WordPress arranque. Eso solo lo para Cloudflare (paso 1).
- Salvarte de una contraseña floja. Si la adivinan, entran por la puerta.
- Sustituir a las copias de seguridad.

Piénsalo así: **Cloudflare es la puerta de la calle; el plugin es la alarma de dentro.** Hacen falta las dos.

---

## 3. Si la web va lenta o algo deja de verse

Prueba en este orden y **comprueba la web después de cada paso**:

1. Escritorio → **Kuboplay Shield** → botón **Vaciar caché**. Recarga la web. (Muchas veces es solo esto: cambiaste algo y estabas viendo la copia vieja.)
2. Si sigue raro, en la pestaña **Rendimiento** apaga **Mejoras de velocidad activadas** y mira la web. Si se arregla, era la caché: vuelve a encenderla y ve apagando los interruptores de esa pestaña **de uno en uno** hasta dar con el culpable.
3. Si lo raro es que algo **no funciona** (no se guarda una partida, no carga un juego, falla el modo tele), prueba en la pestaña **Seguridad**: apaga los interruptores de uno en uno. Suele ser un filtro que está confundiendo a un jugador con un robot.
4. Si se te complica: **Restablecer valores por defecto** (mismo panel) lo deja todo como venía de fábrica. No borra ni juegos ni entradas, solo los ajustes del plugin.
5. Si nada de esto lo arregla, el problema no es el plugin: vacía la caché de **Cloudflare** (Purge Everything) y prueba desde otro móvil o con los datos en vez del wifi.

---

## 4. Si te quedas fuera del acceso (login)

Pasa sobre todo si cambias la **dirección de acceso** y no la apuntas. Por eso el panel te la enseña y te obliga a marcar una casilla antes de guardar: **hazle caso y apúntala**.

Si ya no puedes entrar, se arregla en 2 minutos **desde el panel de IONOS**, sin FTP:

1. Entra en **ionos.es** con tu cuenta.
2. Ve a **Hosting / Webspace** → **Administrador de archivos** (File Manager).
3. Abre la carpeta de la web y entra en `wp-content` → `plugins`.
4. Busca la carpeta **`kuboplay-shield`** y **renómbrala** a `kuboplay-shield-off`. (Si no te deja renombrar, bájatela y bórrala; la tienes en el zip del proyecto.)
5. WordPress apaga el plugin solo. Entra por la dirección de siempre: `kuboplay.online/wp-admin`.
6. Ya dentro, vuelve a poner el nombre bien (`kuboplay-shield`), activa el plugin desde **Plugins** y ajusta lo que te dejó fuera.

> Si el problema es que te ha bloqueado por intentos fallidos, con esperar **15 minutos** y volver a probar suele bastar. Prueba también con los datos del móvil en vez del wifi: te dará otra dirección de internet.

---

## 5. Copias de seguridad y contraseñas

**Copias de seguridad (lo más importante de toda esta guía):**

- IONOS incluye copias automáticas: búscalo en tu panel como **Copias de seguridad / Backup**. Comprueba **hoy** que están encendidas y cada cuánto se hacen.
- Antes de cada cambio gordo (subir una versión nueva del plugin de juegos, tocar el tema), haz una copia manual.
- Una copia que nunca has probado a restaurar no es una copia. Prueba a restaurar una vez para saber dónde está el botón.
- Guarda también el zip del plugin `arcade-core` de cada versión en tu móvil o en el correo.

**Contraseñas:**

- La del administrador de WordPress: **larga** (4 palabras sueltas valen más que `Kubo2024!`), y que no la uses en ningún otro sitio.
- No uses el usuario `admin` de nombre visible. Si tu usuario se llama así, crea otro administrador con otro nombre y borra el viejo.
- Contraseñas distintas para: WordPress, IONOS, PiensaSolutions, Cloudflare y el correo. Si te entran en el correo, pueden recuperar todas las demás.
- Activa la **verificación en dos pasos** al menos en el correo, en IONOS y en Cloudflare.
- No instales plugins ni temas «gratis» bajados de páginas raras. Es la forma número uno de que hackeen un WordPress.

---

## Resumen de una pantalla

| Problema | Dónde se arregla |
| --- | --- |
| Ataque grande, web caída | Cloudflare → Under Attack Mode (y apagarlo después) |
| Robots pesados, fuerza bruta | Plugin → pestaña Seguridad |
| Web lenta o contenido viejo | Plugin → Vaciar caché; luego Cloudflare → Purge Everything |
| Algo dejó de funcionar | Plugin → apagar interruptores de uno en uno |
| No puedo entrar | IONOS → Administrador de archivos → renombrar `kuboplay-shield` |
| Se ha roto algo de verdad | Restaurar copia de seguridad de IONOS |
