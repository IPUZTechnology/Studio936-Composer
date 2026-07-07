# Qué actualizar en los archivos del Project de Claude

Tienes 4 documentos subidos al Project:
1. `README_Studio936_Composer_MASTER_Cambio50.md`
2. `HANDOFF_Studio936_Composer_Cambio50.md`
3. `REPO_CLEANUP_PLAN_Cambio50.md`
4. `CHANGELOG_RESUMEN_CAMBIOS_01_50.md`

Aquí está qué hacer con cada uno:

---

## 1. `HANDOFF_Studio936_Composer_Cambio50.md` → REEMPLAZAR

Sube el nuevo archivo que te acabo de entregar:
**`HANDOFF_Studio936_Composer_Cambio95.md`**

Bórralo el viejo del Project y sube este en su lugar (o simplemente súbelo
además, con un nombre distinto — Claude leerá el más reciente si hay
contradicción, pero es más limpio borrar el viejo).

Este es el documento MÁS IMPORTANTE de los 4 — tiene todo el estado real,
las lecciones aprendidas, y los pendientes en orden.

---

## 2. `README_Studio936_Composer_MASTER_Cambio50.md` → ACTUALIZAR 2 SECCIONES

No hace falta reemplazar todo el archivo — solo edita estas 2 secciones
(el resto de la arquitectura general sigue siendo válido):

### Reemplaza la sección "4. Estado actual después de Cambio 50" por:

```
Estado actual: Cambio 95 (ver HANDOFF_Studio936_Composer_Cambio95.md
para el detalle completo). Resumen:

- Ly Letra: completado. Editor flotante con pentagrama de altura de nota,
  guardado funcional, tamaño/posición autoajustados.
- Chart/Karaoke: completado. Letra alineada por tiempo real, tamaño
  legible, Zoom ya no se recuerda entre visitas.
- Dock (Suite Pro): sin hueco vacío, sin doble scroll, modo MAX funcional,
  scrollbar con estilo propio.
- MIDI/Teclado: conectado al módulo real (Studio > MIDI IN).
- Batería/Bajo/Pads/Arpegio/REC Voz/REC Instrumento: siguen decorativos,
  pendientes de habilitar (REC Voz es el siguiente candidato viable).

Decisión de arquitectura pendiente de ejecutar: reestructuración hacia
MainShell V1 + LegacyBridge + futuro SuiteCore, PERO reordenada — primero
limpieza de CSS duplicado real (Fase 0) en structure.js/chart.js/
suite-pro.js, antes de construir cualquier pantalla nueva. Un primer
intento de esta limpieza (Cambio 93) rompió el menú lateral y fue
revertido — la causa exacta no se investigó a fondo todavía.
```

### Reemplaza la sección "6. Pendientes inmediatos recomendados" por:

```
Prioridad 1 — Investigar el bug del Cambio 93 (limpieza CSS que rompió
el menú) antes de reintentar la consolidación de código.

Prioridad 2 — REC Voz: habilitar con MediaRecorder nativo, mismo patrón
que MIDI/Teclado (Cambio 86).

Prioridad 3 — Retomar Fase 0 (limpieza CSS) con más cuidado, en lotes
más chicos, verificando el archivo COMPLETO antes/después.

Prioridad 4 — Dashboard de herramientas más visual (estilo GarageBand).

Prioridad 5 — Sílabas de tresillo/cuatrillo mostradas por separado en
el Chart (hoy se ve el texto unido).

Prioridad 6 — Precisar qué falta en el menú principal (pendiente que
el usuario detalle).

Prioridad 7 — Librería de canciones (feature nuevo, sin planear).

Prioridad 8 — Fase 1 de la reestructuración (LegacyBridge), recién
después de estabilizar lo anterior.
```

---

## 3. `REPO_CLEANUP_PLAN_Cambio50.md` → AGREGAR UNA NOTA (no reemplazar)

Al principio del archivo, agrega:

```
NOTA (2026-07-05): además de la limpieza de archivos duplicados descrita
abajo, se identificó un segundo tipo de limpieza pendiente: CSS duplicado
DENTRO de cada archivo activo (structure.js tiene selectores repetidos
hasta 19 veces). Ver HANDOFF_Studio936_Composer_Cambio95.md, sección
"Decisión de arquitectura importante", para el estado de este esfuerzo
(intento en Cambio 93, revertido por bug, pendiente de reintentar).
```

El resto del plan de limpieza de archivos (zips viejos, index-cambio*.html,
etc.) sigue vigente tal como está.

---

## 4. `CHANGELOG_RESUMEN_CAMBIOS_01_50.md` → AGREGAR UNA SECCIÓN AL FINAL

Agrega al final del archivo:

```
## Cambio 51–95 (resumen — ver HANDOFF_Studio936_Composer_Cambio95.md
para el detalle completo)

Ly Letra completado: pentagrama, duraciones, guardado, tamaño/posición
autoajustados. Karaoke completado: alineación por tiempo, tamaño legible,
Zoom no persiste entre visitas. Dock sin hueco vacío ni doble scroll,
modo MAX funcional. MIDI/Teclado conectado al módulo real. Intento de
limpieza de CSS duplicado (Cambio 93) revertido por bug — pendiente de
reintentar con más cuidado. Decisión de reestructurar hacia MainShell V1
+ LegacyBridge, con limpieza de código real como paso previo.
```

---

## Resumen — orden de acciones

1. Sube `HANDOFF_Studio936_Composer_Cambio95.md`, borra el de Cambio 50.
2. Edita 2 secciones del README maestro (copia/pega el texto de arriba).
3. Agrega 1 nota al plan de limpieza.
4. Agrega 1 sección al changelog.

Con eso, cualquier chat nuevo que abras con este Project va a tener el
contexto real y actualizado, sin tener que repetirte.
