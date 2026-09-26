# Universo Kuboplay + estructura de juego

Decidido con el usuario tras ver la muestra gráfica: los personajes se rediseñan desde cero y los
juegos dejan de ser demos sueltas para formar **un mundo común** con progresión, objetivos y un modo
fiesta más fuerte. Objetivo de negocio: que el portal apetezca para jugar en familia o con amigos.

## 1. El mundo
**Kubo** es un mundo hecho de cubos. Lo sostiene el **Prisma**, roto en fragmentos que cayeron sobre
ocho regiones. Cada región es un tema de `art.js` y agrupa juegos:

| Región | Tema `art.js` | Carácter |
|---|---|---|
| Pradera Cantarina | meadow | inicio, tutoriales, juegos amables |
| Cumbre Helada | snow | velocidad, deslizamiento |
| Bosque de Noche | night | sigilo, fantasmas, misterio |
| Castillo Torcido | castle | mazmorras, caballeros, cartas |
| Fundición | factory | robots, máquinas, puzzles mecánicos |
| Ocaso Rojo | dusk | duelos, arena, party |
| Jungla Zumbona | jungle | plataformas, bichos |
| Cielo Partido | sky | vuelo, naves, final |

## 2. Elenco recurrente (se dibujan en `art.js`, se reutilizan en todos los motores)
- **Kubo** — el héroe. Chaval con bufanda índigo que se alarga con la velocidad. Curioso, manos
  grandes, botas gruesas. Protagonista de plataformas, carreras y acción.
- **Pila** — ingeniera de la Fundición, mochila con antena. Aporta los juegos de puzzle y máquinas.
- **Ñam** — slime verde glotón, mascota y a la vez estorbo. Enemigo básico y personaje jugable en fiesta.
- **Doña Grulla** — la que reparte las misiones desde la Pradera. Aparece en pantallas de inicio.
- **El Vacío** — antagonista: sombra cúbica que se come el color. Los jefes son trozos suyos.

Cada juego dice en una línea qué pinta ahí (`CFG.lore`), quién sale (`CFG.cast`) y en qué región
está (`CFG.region`). Nada de texto largo: una frase que se lee en 2 segundos.

## 3. Estructura de juego (las cuatro que pidió el usuario)
1. **Niveles y progresión**: cada juego con arranque suave, subida clara, y **jefe o prueba final**
   donde tenga sentido. Los que ya son infinitos ganan hitos («has llegado a la Cumbre»).
2. **Objetivos y recompensas**: 3 misiones por juego (p. ej. «acaba sin perder vidas»), medallas
   bronce/plata/oro guardadas en localStorage, y **fragmentos del Prisma** como moneda común del
   portal: cada medalla da fragmentos y el portal enseña el mapa del mundo iluminándose.
3. **Escenarios con diseño**: los niveles iniciales de cada motor pasan a estar construidos a mano
   (ruta principal, un secreto, trampa que enseña la mecánica) antes de ceder al generador.
4. **Modo fiesta más fuerte**: torneo de 3 o 5 rondas con juegos encadenados, marcador común,
   equipos, y pantalla final de podio del torneo.

## 4. Orden de trabajo
- **Fase P (en curso)**: rediseño de personajes en `art.js`/`platformer.js` y `topdown.js`.
- **Fase U1**: elenco completo en `art.js` (Kubo, Pila, Ñam, Grulla, Vacío) + `CFG.lore/cast/region`
  en `build_games.py` + pantalla de inicio de `kit.js` con la ficha del mundo.
- **Fase U2**: misiones, medallas y fragmentos en `kit.js` + portal (mapa del mundo, contador).
- **Fase U3**: niveles diseñados a mano en los motores principales.
- **Fase U4**: torneo del modo tele.
- **Fase U5**: el resto de los 76 motores al nuevo nivel gráfico.
