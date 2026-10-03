# Estudio: dónde poner los controles táctiles

## Pregunta
¿Dónde caen mejor los botones bajo el pulgar derecho sin tapar el juego?

## Modelo
- **Base del pulgar**: con el móvil cogido a dos manos, el pulgar gira sobre su
  base, que queda unos 5 mm fuera de la esquina inferior de la pantalla.
- **Zona cómoda**: un arco a 32–48 mm de esa base. Más cerca hay que doblar el
  dedo (la esquina es incómoda). Más lejos hay que estirarlo. Coincide con los
  juegos de móvil de referencia, que ponen el botón principal hacia el 82–88 %
  del ancho y el 60–75 % del alto.
- **Escala**: 1 mm ≈ 6,3 px CSS. Tamaño mínimo 9–10 mm (Parhi 2006; 44 pt de Apple).
- **Uso de cada botón** (disparo automático activado en el móvil): SALTO/DASH
  70 %, FUEGO 22 %, BASS 8 %.
- **Toque a ciegas**: se mira el juego, no el botón. El dedo cae alrededor del
  punto buscado con una desviación de 3,5 mm (normal) o 5 mm (con prisa).
  Simulación Monte Carlo de 20 000 toques.
- **Regla del proyecto**: el mando no tapa el lienzo.

## Disposiciones comparadas
- **A (antes)**: rejilla de 2×2 metida en la esquina, botones de 68 px.
- **B (ahora)**:
  - SALTO es más grande (×1,2) y va en el centro del arco cómodo.
  - FUEGO y BASS van en el mismo arco, junto a SALTO.
  - Toda la columna derecha responde: gana el botón más cercano, y SALTO tiene
    14 px de ventaja.
  - Si el dedo cae en un hueco, cuenta el botón más cercano. Esto vale en todos
    los tamaños: `placePad()` vuelve a calcular las posiciones al girar o
    cambiar el tamaño de la ventana.

## Resultados

### 844×390 (móvil tumbado)

| | A (antes) | B (ahora) |
|---|---|---|
| Comodidad, ponderada por uso | 20 % | **100 %** |
| SALTO: distancia a la base del pulgar | 17,9 mm | 33,4 mm |
| SALTO: tamaño | 10,8 mm | 13,0 mm |
| Acierto con desviación de 3,5 mm | 69,3 % | **93,3 %** |
| Toque en el vacío con desviación de 3,5 mm | 28,9 % | 3,4 % |
| Botón equivocado con desviación de 3,5 mm | 1,8 % | 3,3 % |
| Acierto con desviación de 5 mm | 44,1 % | **79,4 %** |
| Solape con el lienzo | 0 | 0 |

Con **botones grandes**:
- Comodidad: 30 % → 96 %.
- Acierto con desviación de 3,5 mm: 83,2 % → 97,5 %.

### 390×844 (móvil en vertical)
- Comodidad: 22 % → 100 %.
- Acierto con desviación de 3,5 mm: 69,3 % → 94,5 %.
- Acierto con desviación de 5 mm: 44,1 % → 82,1 %.

### Otros tamaños
740×360, 667×375 y 360×640 dan cifras equivalentes.

## Coste
El botón equivocado pasa del 1,8 % al 3,3 %. Al quitar los huecos, un toque que
antes no hacía nada ahora pulsa el botón más cercano. Merece la pena porque
los toques en el vacío bajan del 29 % al 3 %.

## Pendiente
- Probarlo con manos de verdad. El modelo usa medias de adultos, y una mano
  pequeña o el móvil cogido con una sola mano lo cambian.
- Si hace falta ajustarlo, se toca con dos constantes del código: `PIV` (dónde
  está la base del pulgar) y la ventaja de SALTO en `padPick`.
