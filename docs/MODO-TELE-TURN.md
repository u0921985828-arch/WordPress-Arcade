# Modo tele: quitar el retraso (TURN)

Cuando juegas en la tele, cada tecla del móvil tiene que llegar a la tele. Hay dos caminos:

1. **Directo** (móvil ↔ tele, sin intermediarios): 10–50 ms. Es lo normal si los dos están en la misma wifi.
2. **Por el servidor** (móvil → WordPress → tele): 150–400 ms. Se nota, y no hay código que lo arregle del todo.

En el lobby de `/tele/`, debajo de cada jugador, pone cuál de los dos está usando: «Listo · 32 ms» (directo) o «Listo · por el servidor 210 ms».

## Cuándo se cae al servidor

- La tele y los móviles están en **redes distintas** (tele en el router, móviles con sus datos). Es el caso que más se nota.
- Wifi de operador con **aislamiento de clientes** (los aparatos de la casa no se ven entre ellos).
- Alguna red bloquea UDP.

## Arreglo 1 (gratis, 10 segundos)

Pon **todos los móviles en la misma wifi que la tele**. Con eso la conexión pasa a directa y el retraso baja solo.

## Arreglo 2 (gratis, una vez): servidor TURN de Cloudflare

Sirve para cuando lo de arriba no es posible. Cloudflare da 1000 GB al mes gratis, de sobra.

1. Entra en **dash.cloudflare.com** (crea cuenta si no la tienes).
2. Menú lateral → **Realtime** → **TURN Server** → **Create**.
3. Ponle un nombre (por ejemplo `kuboplay`) y dale a crear.
4. Copia los dos datos que salen: **Turn Token ID** y **API Token**. El API Token solo se enseña una vez.
5. En tu WordPress: **Ajustes → Arcade** → apartado «Modo tele: servidor TURN».
6. Pega el Turn Token ID en su casilla y el API Token en la suya. Guarda.
7. La línea **Estado** de ese mismo apartado te dice si funciona.

Con TURN, los móviles que no pueden hablar directamente con la tele van por Cloudflare (rápido y cerca) en vez de por WordPress. Las credenciales que llegan al móvil son temporales (24 h) y se piden solas; tu API Token nunca sale del servidor.

## Lo que ya hace el plugin por su cuenta

- Si no hay conexión directa **ni** TURN, los mensajes van por WordPress con **espera larga**: la petición se queda aguardando en el servidor y vuelve en cuanto hay algo, en vez de preguntar cada 80 ms. Mide 48 ms de mediana en vez de 153 ms (1.43.1).
- En la tele el juego se pinta a 1280×720 como mucho, no a 1080p: 2,25 veces menos píxeles por fotograma (1.43.0).

Si el hosting va justo de procesos PHP, la espera larga se puede apagar con `add_filter( 'arcade_party_wait', '__return_zero' );`.
