# Proyecto: Algoritmo de Cejillas Movibles para Guitarra

Documento de alcance para el "punto 3" — construir digitaciones de guitarra
reales, en cualquier traste, a partir de teoría musical, en vez de depender
de un catálogo fijo de acordes memorizados. Todo lo de aquí viene de una
sesión de trabajo con Val (guitarrista, conoce armonía) explicando cómo
piensa el diapasón en la práctica.

---

## El problema real, confirmado con evidencia

Hoy (Cambios 271-278) se encontraron y corrigieron varios bugs puntuales en
el sistema de acordes de guitarra existente (`GUITAR_SHAPES` +
`defaultShapes`, dentro de `calcFretVoicing()` en
`suite-pro-chart-v260-cambio100.js`). Pero al corregirlos, quedó expuesto el
problema de fondo:

**El sistema hoy es un catálogo fijo de ~40-50 acordes memorizados a mano**
(ej. `'G': [3,2,0,0,0,3]`, `"Em": [0,2,2,0,0,0]`), sin ninguna relación
matemática entre ellos. Consecuencias reales:

- Cobertura muy inconsistente: "C" tiene 12 variantes de calidad (C9,
  Cadd9, C13...), pero "F" solo tiene 3, y "D" solo 2.
- Pedir un acorde que no está en el catálogo (ej. "F9", "B mayor" con
  cejilla) no genera nada, o generaba algo incorrecto en silencio (ya
  corregido en Cambio 277 — ahora al menos no miente, pero sigue sin poder
  generar la forma real).
- El control "Traste inicial" (la flechita ◀▶ en el editor) **solo mueve
  la ventana de qué trastes se ven** — no recalcula ninguna forma nueva.
  Mover un La menor al traste 3 no lo convierte en Do menor con cejilla;
  simplemente no pasa nada.
- Un acorde con cejilla real (ej. "B mayor", que requiere los 6 dedos en
  posición de cejilla) no existe bien armado en el catálogo — sale casi
  vacío (un solo punto).

Este documento recoge la solución real: un algoritmo de **plantillas
movibles**, tal como lo explicó Val (y confirmado además con fuentes reales
de teoría de guitarra/jazz — ver sección final).

---

## La teoría — explicada por Val, guitarrista

### Principio central: la forma no cambia, solo se desliza

En una guitarra afinada estándar, **un traste = un semitono**. Desde
cualquier nota al aire, subir un traste sube medio tono; subir dos, un tono
completo.

> "Si yo armé una cejilla ahí, el más mayor, cuando yo la corro un traste,
> sería Fa sostenido. Si la corro dos, sería Sol mayor... Es solo correr
> el traste y solo que a medida que voy corriendo el traste la nota me la
> va dando la escala."

Es decir: **una plantilla de dedos fija, por calidad de acorde**, más una
**fórmula de desplazamiento en semitonos** desde la nota base de esa
plantilla hasta la nota que se quiere. Aplica igual para mayor, menor,
séptima, Maj7, disminuido, y semidisminuido — la plantilla de dedos de cada
calidad no cambia, solo el traste donde arranca.

### Las tres familias de plantillas (por cuántas cuerdas usa y dónde ancla)

1. **6 cuerdas, cejilla completa, ancla en Mi** — la más usada. Ejemplo
   confirmado por Val: la forma de Sol mayor con cejilla en el traste 3,
   corrida al traste 5, da La mayor — mismos dedos, mismo mapa, solo se
   corrió.
2. **5 cuerdas (se omite la Mi grave), ancla en La** — misma lógica,
   distinta cuerda de referencia.
   > "Si omito la sexta cuerda y solo toco de la quinta para abajo, tiene
   > la misma lógica. La quinta es un La... el mapa sigue siendo el mismo."
3. **4 cuerdas centrales, ancla en Mi también (registro más agudo)** —
   usada mucho en bossa nova y jazz, con Maj7 principalmente.
   > "Las cuatro cuerdas del centro... utilizan mucho los Maj7... se
   > pueden hacer armonías en cualquier traste de la guitarra... la misma
   > lógica."

### Confirmación externa (búsqueda hecha hoy, no inventada)

Esto que describe Val como "tercer nivel" tiene nombre real en teoría de
jazz: **"shell voicings"** — digitaciones reducidas a lo esencial (raíz,
3ª, 7ª, a veces sin la 5ª), tocadas en 3-4 cuerdas, ancladas comúnmente a
la cuerda La o Re, **movibles** (una sola forma sirve para cualquier
tonalidad, corriéndola por el diapasón). Fuente: múltiples artículos de
guitarra de jazz/bossa nova (jazzguitarlessons.net, guitarwiz.app,
jazznightschool.org), consultados el 22 de agosto de 2026.

Ejemplos reales encontrados, para contrastar con lo que Val capture:
- Cmaj7 (voicing de jazz, 4 cuerdas): `X-3-5-4-5-X`
- Em7 (posición abierta): `0-2-2-0-3-X`
- Dm7: `X-X-0-2-1-1`

---

## Método de captura de las plantillas — IMPORTANTE

**No capturar las plantillas por dictado de voz.** Ya hubo un intento
donde el dictado dio un dato musicalmente inconsistente (dos semitonos
desde La dando "Do" en vez de "Si") — un solo número mal transcrito
arruinaría todos los acordes calculados a partir de esa plantilla.

**Método acordado:** Val arma cada plantilla directamente en su propio
editor (el que ya quedó arreglado hoy, Cambios 276-278, que ahora sí guarda
y recupera bien lo que se dibuja). Desde ahí, se lee el dato exacto
guardado (vía `getBeatVoicing()`), sin intermediarios de transcripción.

### Plantillas pendientes de capturar (por Val, vía su editor)

Por cada una de las 3 familias (6 cuerdas/Mi, 5 cuerdas/La, 4 cuerdas
shell), estas calidades, en orden de prioridad:

1. Mayor
2. Menor
3. Séptima (Dom7)
4. Maj7
5. Disminuido
6. Semidisminuido (m7b5)

(Después: 9, 11, add9, 6, m6, sus2, sus4, aug — una vez esté el núcleo
funcionando.)

---

## Diseño del algoritmo (para cuando se construya)

```
function generarDigitacion(notaRaiz, calidad, familia) {
  1. Buscar la plantilla fija de esa calidad, en esa familia
     (ej. plantilla["6cuerdas"]["mayor"] = [frets relativos + nota ancla])
  2. Calcular semitonos entre la nota ancla de la plantilla (Mi o La)
     y notaRaiz pedida, usando la escala cromática
     (Mi→Fa→Fa#→Sol→Sol#→La→Sib→Si→Do→Do#→Re→Re#→Mi)
  3. Sumar ese desplazamiento a cada traste de la plantilla
  4. Devolver el resultado — mismo patrón de dedos, trasladado
}
```

Este reemplazaría (o complementaría, como respaldo cuando no hay una
digitación guardada a mano) la función `calcFretVoicing()` actual.

**Ojo:** el control "Traste inicial" del editor, hoy solo ventana de
visualización, tendría sentido real una vez exista este algoritmo — ahí sí
podría disparar un recálculo real de la forma en la nueva posición.

---

## Bugs relacionados encontrados hoy, aún sin resolver

Estos quedaron abiertos al final de la sesión, relacionados con esta misma
área de código, pendientes de diagnosticar en la próxima sesión:

1. **Toggle Mayor↔Menor no simétrico dentro del mismo compás ya abierto:**
   cambiar de Mayor a Menor no actualiza el mapa (se queda con la forma de
   mayor); cambiar de Menor a Mayor sí funciona. Se investigó
   `buildChordName()`, el `onclick` de los botones de Calidad, y
   `initInlineStateFromChord()` sin encontrar la causa — quedó pendiente
   confirmar si el **nombre** de arriba (ej. "E" → "Em") sí cambia aunque
   el mapa no se mueva (eso aislaría si es un bug de dibujo vs. de
   selección).
2. **"B mayor" (Si mayor) sale casi vacío** en el catálogo — consistente
   con el problema de fondo (catálogo incompleto para cejillas), se
   resolvería solo una vez exista el algoritmo de plantillas movibles.

---

## Qué NO se ha hecho todavía

- No se ha capturado ninguna plantilla real todavía (quedó en explicación
  conceptual + confirmación externa, no en datos concretos).
- No se ha escrito ni una línea del algoritmo `generarDigitacion()`.
- No se ha decidido si esto reemplaza `calcFretVoicing()` por completo o
  convive con el catálogo fijo actual como respaldo adicional.

## Cómo continuar en la próxima sesión

1. Pedirle a Val que arme, una por una, las 6 calidades de la familia
   "6 cuerdas/Mi" en su editor, guardando cada una en un compás de prueba.
2. Leer esos datos exactos desde el código/localStorage (no por voz).
3. Construir `generarDigitacion()` con esa primera familia funcionando.
4. Repetir para las otras dos familias.
5. Conectar el control "Traste inicial" para que dispare el recálculo real
   una vez el algoritmo exista.
6. Investigar el bug del toggle Mayor↔Menor (separado, más chico, se puede
   hacer antes o en paralelo).
