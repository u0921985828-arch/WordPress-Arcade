/* Repartos escritos a mano de klondike-solitaire y freecell (los usa src/eng/cards.js).
 * Cada reparto se verificó GANABLE con un resolutor en Node (búsqueda con tabla de
 * transposiciones; freecell con supermovimientos y autosubida segura, klondike robo 1
 * con límite de reciclados). `min` es el mínimo conocido de movimientos que encontró el
 * resolutor y `par` el objetivo de la 3ª estrella (min + margen).
 *   f  bases ya subidas por palo (♠♥♦♣), A..f[s]
 *   p  tamaño de cada pila (se reparte pila a pila desde `d`; el resto va al mazo)
 *   d  orden exacto del reparto, una letra por carta: A..Z a..z = palo*13 + (valor-1)
 *   nc celdas utilizables en freecell (las demás salen con candado)
 *   rec vueltas al mazo permitidas en klondike
 *   tm  segundos objetivo (2ª estrella)
 * Generado por scripts del scratchpad; no se toca a mano salvo los nombres y los textos. */
const CARDLV = {
 K: [
  {n:'Las últimas figuras',e:'Todo sube directo: J, Q y K a sus bases.',f:[10,10,10,10],p:[1,1,2,2,2,2,2],rec:0,par:19,tm:49,min:12,d:'zLKmYXxZlkMy'},
  {n:'Una encima de otra',e:'Coloca en columna alternando color para despejar.',f:[9,9,9,9],p:[1,2,2,2,3,3,3],rec:0,par:26,tm:59,min:19,d:'ywZJzjXWlxKLkYmM'},
  {n:'Destapa la de abajo',e:'Mueve la de arriba para dar la vuelta a la tapada.',f:[8,8,8,8],p:[1,2,3,3,3,4,4],rec:0,par:27,tm:61,min:20,d:'VwZlYLjyxMkzmJWvKIiX'},
  {n:'El hueco es del rey',e:'En una columna vacía solo entra un rey.',f:[7,7,7,7],p:[1,2,3,4,4,5,5],rec:0,par:35,tm:73,min:27,d:'JjKYxHmyLiwIUVZzXvWklMhu'},
  {n:'Asoma el mazo',e:'Aparecen las primeras cartas del mazo.',f:[7,7,7,7],p:[1,2,3,4,4,4,4],rec:1,par:38,tm:77,min:30,d:'vMYXuHUkmKxWLJZhzyljVwiI'},
  {n:'Segunda vuelta',e:'El mazo se recicla: dos vueltas.',f:[6,6,6,6],p:[1,2,3,4,5,5,4],rec:2,par:46,tm:89,min:38,d:'GkXgYxiwlyJmzhTvMjUIVutZLWHK'},
  {n:'No subas tan pronto',e:'Guarda una carta abajo para colocar la siguiente.',f:[5,5,5,5],p:[1,2,3,4,5,6,6],rec:2,par:59,tm:109,min:50,d:'TjyXSLKlZVwIfitvMsUkzmGJFgHYWuhx'},
  {n:'Escaleras enteras',e:'Los grupos ordenados se mueven de una vez.',f:[4,4,4,4],p:[1,2,3,4,5,6,7],rec:3,par:63,tm:115,min:54,d:'sVUgyelYEGWMKkhuzjLrStIXTxRiHFZmvJwf'},
  {n:'Tres tapadas seguidas',e:'Ordena en qué columna destapas primero.',f:[3,3,3,3],p:[1,2,3,4,5,6,7],rec:3,par:90,tm:155,min:79,d:'xgqjlQmtUHEeSksvFJDIrRLzMuGZXiVhydTwYWKf'},
  {n:'El mazo manda',e:'Dieciséis cartas esperan en el mazo.',f:[2,2,2,2],p:[1,2,3,4,5,6,7],rec:3,par:109,tm:184,min:97,d:'eHfmVEKzdtDPXShYWikRQxjrqgsLTuJIvFcUylwCGZMp'},
  {n:'Falta un as',e:'Casi la baraja entera, con los ases por salir.',f:[1,1,1,1],p:[1,2,3,4,5,6,7],rec:3,par:116,tm:194,min:104,d:'rERZgCXSUeDzQlIFJVLdYPKsxbtmiOkfcvHpBhjoWMwTGqyu'},
  {n:'Reparto completo',e:'La baraja de 52, cinco vueltas al mazo.',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:5,par:180,tm:290,min:164,d:'xTpGwlysnrBVKNceuMjZIghzaJFEDdLPbAkfYXitUCRQoHOqvWmS'},
  {n:'Dos columnas cerradas',e:'Dos montones que no se abren hasta el final.',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:5,par:137,tm:226,min:124,d:'QrLaimvtnBhPXSElKGUVqIMgusweTFOfjZkzJxWYNocAyRdbCHpD'},
  {n:'Cuestión de orden',e:'El mismo reparto se pierde si vas en mal orden.',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:5,par:143,tm:235,min:129,d:'BseVdbEzTvMmyxIZSntOlhcgoXijNDfLuwKWGqpCFAQPkrJYaURH'},
  {n:'Tres vueltas',e:'El mazo ya solo da tres vueltas.',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:142,tm:233,min:128,d:'CSyKRLFbAdoVPazhNJEixDTQMZucwpXfrWHGtgBeqvnsjkUOYlIm'},
  {n:'El rey encerrado',e:'Hay que abrir hueco para sacar al rey.',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:126,tm:209,min:113,d:'YHqZytFLuUGihEDPlaCdIgxcjnvTSMsweONVfkWKXBoAQpJmRzbr'},
  {n:'Dos vueltas',e:'Dos vueltas al mazo: cada robo cuenta.',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:2,par:144,tm:236,min:130,d:'NPXxqUOzLcGHCFjIewDWETMKtdokApaVvrhBlibSJsRYQuZfyngm'},
  {n:'Con el reloj encima',e:'Poco margen de tiempo para el objetivo.',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:2,par:129,tm:214,min:116,d:'JAoyEfKXSnNCYeBxhiksPaRjGudpVwmQFrlgcUHTDIZzbvqWMOtL'},
  {n:'Una sola vuelta',e:'Una vuelta al mazo. Piensa antes de robar.',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:1,par:136,tm:224,min:123,d:'fQARrsJxoYGVHBwdTZUyELDceblqNMthzpvKOSFIaPgCmuXkWinj'},
  {n:'El reparto del final',e:'Baraja entera y una sola vuelta. El de verdad.',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:1,par:126,tm:209,min:113,d:'xauSCkOqHBYfgNtLGRnjeWXIZKVUdomFbzchwQlpMyJiDEvTrAPs'}
 ],
 F: [
  {n:'Montones cortos',e:'Todo se ve: sube lo que toca a las bases.',f:[10,10,10,10],p:[2,2,2,2,1,1,1,1],nc:4,par:17,tm:57,min:13,d:'XlzmKZkLyMxY'},
  {n:'La primera celda',e:'Aparca una carta en una celda para desatascar.',f:[9,9,9,9],p:[2,2,2,2,2,2,2,2],nc:4,par:22,tm:68,min:18,d:'YzwjLlKZWMJxkmXy'},
  {n:'Escalera de dos',e:'Con celdas libres se mueven dos cartas juntas.',f:[8,8,8,8],p:[3,3,3,3,2,2,2,2],nc:4,par:28,tm:82,min:24,d:'vIiwLzWKZjYmkXlJVMyx'},
  {n:'El hueco vale oro',e:'Una columna vacía dobla lo que puedes mover.',f:[7,7,7,7],p:[3,3,3,3,3,3,3,3],nc:4,par:31,tm:88,min:27,d:'zLuvxWYkMUHjIlZyJXKihmVw'},
  {n:'No llenes las celdas',e:'Con las cuatro llenas no se mueve nada.',f:[6,6,6,6],p:[4,4,4,4,3,3,3,3],nc:4,par:42,tm:112,min:38,d:'GLlMVXhKWzJutUYgmvxHikTIwZyj'},
  {n:'Escalera de tres',e:'Tres cartas seguidas de una sola vez.',f:[5,5,5,5],p:[4,4,4,4,4,4,4,4],nc:4,par:48,tm:126,min:44,d:'XMJjkiSwUlKItmTWfGxhHVyYvZgLuszF'},
  {n:'Orden de salida',e:'Elige qué as desentierras primero.',f:[4,4,4,4],p:[5,5,5,5,4,4,4,4],nc:4,par:53,tm:137,min:49,d:'XgGTfexKJUMyvHuWRmjLkZzFtVswYrShEliI'},
  {n:'Solo tres celdas',e:'Una celda se bloquea: quedan tres.',f:[4,4,4,4],p:[5,5,5,5,4,4,4,4],nc:3,par:58,tm:148,min:54,d:'RXiwWxkremFLzIGsvKtgjfTMEYVyhJHZSuUl'},
  {n:'Cuarenta cartas',e:'Ocho columnas de cinco, todo a la vista.',f:[3,3,3,3],p:[5,5,5,5,5,5,5,5],nc:4,par:65,tm:163,min:61,d:'jexJhdmTyiskVGHlQYqfgFWKtDrEvMRZIXzUwuLS'},
  {n:'Columnas largas',e:'Cuarenta y cuatro cartas y poca holgura.',f:[2,2,2,2],p:[6,6,6,6,5,5,5,5],nc:4,par:69,tm:172,min:65,d:'MVpvJySHqCgfQIdmFuYPExDZrjszLeitXKGUkcRWhlwT'},
  {n:'Falta un as',e:'Casi la baraja entera.',f:[1,1,1,1],p:[6,6,6,6,6,6,6,6],nc:4,par:81,tm:198,min:77,d:'yVYMRhOPKQvTpZmkqlBCHorsFeUtWdbfczGEDgwJixjLuXIS'},
  {n:'Reparto completo',e:'Las 52 cartas y cuatro celdas.',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:86,tm:209,min:82,d:'EvZjFqirWamcQHYBMUTpSxKAtnsboIzDOghklPRXNGdeJyCuLfVw'},
  {n:'Dos ases enterrados',e:'Los ases están al fondo de sus columnas.',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:81,tm:198,min:77,d:'NIXwOyopcmriBnLgtuMsSZfhQzqRlabTPvYJVFKCHEkAjdGDxWeU'},
  {n:'La columna larga',e:'Una columna que hay que vaciar entera.',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:93,tm:225,min:89,d:'avLwbEnJUcCRtfDeYPqumIVAHsSpKhZdlWoFiyjXGQTzNxkOgrBM'},
  {n:'Paciencia',e:'Sin atajos: planifica cinco movimientos.',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:84,tm:205,min:80,d:'wIgFVjYOzoQEJkrGPAXniNSuLxavMKHTCRfepBmbcZUyWdqhDtsl'},
  {n:'El nudo',e:'Varias cartas se bloquean entre sí.',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:90,tm:218,min:86,d:'TUlvJwpmsSVEqiuaYeNhCoMdLPKZIFrcDfbyzRkWOtAjxQgnGBHX'},
  {n:'Tres celdas',e:'Baraja entera con una celda menos.',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:3,par:89,tm:216,min:85,d:'hOsCWTcrXKkFzoPbdJyVpnaeASZIGUHjNxLRlmMqiBEDvYwQutgf'},
  {n:'Tres celdas y prisa',e:'Tres celdas y el reloj más corto.',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:3,par:88,tm:214,min:84,d:'NJBuqPgfCIbRhUwoGkaDVTLscvMOZmixnWFKyXjSrYtEApQHzdel'},
  {n:'Dos celdas',e:'Dos celdas: el hueco de columna es tu salvación.',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:2,par:95,tm:229,min:91,d:'pzPCeSqawBYrAyDuUVdfNJxsKLOnMQZjlbivoITcGWgtRHmhFkEX'},
  {n:'El candado',e:'Dos celdas y el reparto difícil de verdad.',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:2,par:91,tm:220,min:87,d:'wBFmSugEADZaotbOLdPcpfvsXjVTqUzCnkYQrNeJxyWGHKMlRiIh'}
 ],
 DK: [
  {n:'Reto 1',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:149,tm:244,min:135,d:'OakURzMrnjbFdfGYcpTQiDIELgCKtNwPuHVJseZmxlBWSovhyXqA'},
  {n:'Reto 2',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:147,tm:241,min:133,d:'plDbVeNRBPqxfiyLwEFIWdAuvozsOktUGYXagZhSjmHQcnKTrCMJ'},
  {n:'Reto 3',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:176,tm:284,min:160,d:'uHgZjKAqUpvdNfFxBrsSTQDRkownezMPElIWCayObVYcGimJXtLh'},
  {n:'Reto 4',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:166,tm:269,min:151,d:'wVAXCyastdvjnDKqIrWZLkGlYUebfPBExmoMHNhiQcRuFTpgJOzS'},
  {n:'Reto 5',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:141,tm:232,min:127,d:'citRxKMpGrezDjaoTqfUvQwZsHFOYmuCkNIgWXEABLdJbnPShlVy'},
  {n:'Reto 6',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:141,tm:232,min:127,d:'lOLdbhuGJIfVCSrqiomnwgXFRjsBMkpNtWeaDvzyPQKYZUHcxEAT'},
  {n:'Reto 7',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:146,tm:239,min:132,d:'UjegAyvrZzuVsaRwtWBQHdklMixLhnFfCJbINcTpGSEDKmPYoOXq'},
  {n:'Reto 8',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:143,tm:235,min:129,d:'fKoyAtYSEJQjqMWHxPeIZBDsRNgzdkpLFaTUXCblrwmvhiOGnVuc'},
  {n:'Reto 9',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:122,tm:203,min:109,d:'LItQqcHbdKkSvgBxRVXPAuYlowZnDGrFTEheWafympjCJzUONMis'},
  {n:'Reto 10',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:144,tm:236,min:130,d:'SUHOkMPpRKwBnNETAQmirbXJGLvqhWcfgsVjZoYyudxtzDIlCFae'},
  {n:'Reto 11',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:137,tm:226,min:124,d:'jFJdqzNbpOKQvcfXhZrIAEPCUWBTnDGaskiyeYguwStLRomHlMVx'},
  {n:'Reto 12',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:140,tm:230,min:126,d:'adIUKXHnhWCurGQbSvJcspELxOteRoMjqYglfNFVATymZizDkwBP'},
  {n:'Reto 13',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:148,tm:242,min:134,d:'AfajSWpMFKchZGezrdJUkiYDuREtmIyTolCbNXPHnQVwOsBqxvLg'},
  {n:'Reto 14',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:135,tm:223,min:122,d:'UhDNXQpcPuiYmvHCTySwAqBVlZkgtEKznoexWsFMILrOjJbaRGfd'},
  {n:'Reto 15',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:143,tm:235,min:129,d:'oDuvhPMKnqxdUrCLXyJAljIStYTOsNpQeafwWkHgBziGmbFcEZRV'},
  {n:'Reto 16',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:136,tm:224,min:123,d:'EFTfbtKyscrZVAWqJINwnUOmxizlMHdgXRLhapevQkCSjYuoDPGB'},
  {n:'Reto 17',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:162,tm:263,min:147,d:'KALjzERZohGBDeMWQvwgUnuSPTdOtNCfHlqkIFxJXYrcpaisbmyV'},
  {n:'Reto 18',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:150,tm:245,min:136,d:'yunJwxUFdLKXoAQIkGZYRMpjtbWiqBagOvlfPCrhSNVzmsDHTEce'},
  {n:'Reto 19',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:143,tm:235,min:129,d:'cmQwjOlyCXoxIZEqFSJAnLbYevUaWTVHPfKRrDGhNkMtzugBspdi'},
  {n:'Reto 20',f:[0,0,0,0],p:[1,2,3,4,5,6,7],rec:3,par:166,tm:269,min:151,d:'bhgOtCSYynVvLzuAdjURHixPWEJGIsBcpXaZKmFTowlkfrNqMDeQ'}
 ],
 DF: [
  {n:'Reto 1',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:97,tm:233,min:93,d:'kaARgLyphKEsPuYiScQxGmdJfjHqrbFIZDCevNtVwoOlTBUXMWzn'},
  {n:'Reto 2',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:110,tm:262,min:106,d:'OkWtcTyYIqfNixPsVwaEzRAobvrZBFhMLUgdGlJpCQHSjKDeuXnm'},
  {n:'Reto 3',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:102,tm:244,min:98,d:'FTSXWDcBxIuZHMgpAmjyiJVzOqKQYLNPwCaelEdRrthofvnGbksU'},
  {n:'Reto 4',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:87,tm:211,min:83,d:'xFtkeyTlAvUqMNJjGHzcgPYnZROhfspImiDdBbruwVSEaKWQCoLX'},
  {n:'Reto 5',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:84,tm:205,min:80,d:'opVTiIyvOKEUbBAgRrDnhHMzwxjCdYQJmaWcuLtGkXZNSPFlesqf'},
  {n:'Reto 6',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:91,tm:220,min:87,d:'fYpKvDLEqRMzhOnsctNimAIUgoPuweZWTCbdVSkGrlyJHxBXFjaQ'},
  {n:'Reto 7',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:91,tm:220,min:87,d:'WNMAHJVOeaZUClQpijSFqwgYBdRKGIxrfoucktPmsTyvDbnzhELX'},
  {n:'Reto 8',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:89,tm:216,min:85,d:'AZEcmoayFCzXnMujtBLiIpQTGeJVRdHqsWbYKDlNkwShrvUPOfxg'},
  {n:'Reto 9',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:106,tm:253,min:102,d:'qGhBmCwHzSsJNUKgQIRMOuoteZLbXvxriYEafWTFnpyjcADVdPlk'},
  {n:'Reto 10',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:82,tm:200,min:78,d:'lYoCDXwUJBVpzqfnIbKQOmMSNdLEthrFGecayRsTgukjiAWvxZHP'},
  {n:'Reto 11',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:95,tm:229,min:91,d:'POxZDJWeNTpdqcRjuIgzEkQsMYlaLBfmHrvwyAVCUnFtGoSbXhKi'},
  {n:'Reto 12',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:90,tm:218,min:86,d:'GAthHWjoyasmzFvgESVedTlRCxfwJkMLprYNqIibZPDKucBUOQnX'},
  {n:'Reto 13',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:87,tm:211,min:83,d:'yvTfglbXdCzAiuYqPJOMHmIrsEKDUoaLBxSjNtQVcpWRGhnekwFZ'},
  {n:'Reto 14',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:83,tm:203,min:79,d:'cuIEoKAhzfBprMCnkdmPwRgDVsqvbSOyHTlitLQNUXWaFeYGjxJZ'},
  {n:'Reto 15',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:87,tm:211,min:83,d:'gmciWNPrtvIUAsMhKfGnSJQdoRbeyaYzETqjlxOwVuFZHCDLXpBk'},
  {n:'Reto 16',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:83,tm:203,min:79,d:'XzmFsvjohDfHQWJrVALNYPZqdGOBwERbeCIixSMycnkTKtpgaUlu'},
  {n:'Reto 17',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:80,tm:196,min:76,d:'BMfadZbrIgFoivwqOLSGeyXJlRuxCztWYANhVTmcQPpHEnjkKsUD'},
  {n:'Reto 18',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:96,tm:231,min:92,d:'twUGuYmAxavcTfnkHjbLzDMpyEPKNrhoWQgiJlqZIsVBCOSFdXeR'},
  {n:'Reto 19',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:87,tm:211,min:83,d:'kiojdOpMACzSrIQhfNTRewmBWEngZVXvyuJLbaKGYUFqcxDPsltH'},
  {n:'Reto 20',f:[0,0,0,0],p:[7,7,7,7,6,6,6,6],nc:4,par:101,tm:242,min:97,d:'OmMAJyXuzfSwFHhrqPYjKpobBVaxedcClsDgGWUiQNkvREnITtZL'}
 ]
};
if (typeof module !== 'undefined') module.exports = CARDLV;
