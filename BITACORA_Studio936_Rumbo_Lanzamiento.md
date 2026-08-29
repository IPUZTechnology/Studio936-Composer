# BITÁCORA — Studio 936 Composer
## Rumbo a lanzamiento (meta: 3 meses)

**Última actualización:** 28 agosto 2026 — última Cambio documentado: **444** (más auditoría de repo agregada en esta actualización)

**Fuentes usadas para armar esta bitácora:**
- `HANDOFF_Sesion_VistaContinua_Cambio371_430.md` (subido al proyecto)
- Todo lo trabajado en la sesión actual (Cambios 431→444)

**Fuentes que FALTAN integrar** (mencionadas en las instrucciones del proyecto, no cargadas todavía):
- `README_Studio936_Composer_MASTER_Cambio50.md`
- `HANDOFF_Studio936_Composer_Cambio50.md`
- `REPO_CLEANUP_PLAN_Cambio50.md`
- `CHANGELOG_RESUMEN_CAMBIOS_01_50.md`

> Apenas subas esos documentos, reviso si cambian algo de esta bitácora (prioridades, alcance, o algo que ya esté resuelto y yo no sepa) y la actualizo.

---

## 0. Ruta del proyecto (actualizar esto cada vez que se cierra un bloque)

**Avance general estimado: ~20%** (promedio ponderado — Compose pesa menos en el total ahora que El Estudio se sumó a la meta de lanzamiento).

| Etapa | Avance | Nota |
|---|---|---|
| Compose (interfaz + práctica real) | 85% | Interfaz de Chart/Lyric/instrumentos madura (Cambios 371-444). Práctica/karaoke ya es audio real. Falta: Volumen/Mute/Solo del grabador rápido por sección. |
| Limpieza de repo (Bloque 0) | 0% | En pausa — no bloquea nada, se retoma cuando haya tiempo |
| Motor de audio compartido | 0% | Base técnica para todo lo que sigue |
| El Estudio (pantalla nueva, DAW) | 0% | Recibe la canción de Compose, también canciones propias subidas |
| Tijera + MIDI real (dentro del Estudio) | 0% | Se mudó acá desde el grabador rápido de Compose |
| IA: desacople de stems + generador de instrumentos/voces | 0% | Vía Replicate (pago por uso), decidido en esta sesión |
| Pulido y lanzamiento | — | Meta final |



Lanzar Studio 936 Composer en **3 meses**, con un nivel de pulido y de funciones reales (no cosméticas) que lo distinga como herramienta única en el mercado: compositor + Real Book + grabador + editor de audio + motor de voicings de jazz, todo en el navegador.

**Criterio de "listo para lanzar"**: ningún control visible en la interfaz debe ser decorativo. Si un botón existe, tiene que hacer lo que dice.

---

## 2. Diagnóstico honesto del estado actual

La interfaz mejoró mucho esta sesión (431→444): las tres barras (Chart, Lyric, instrumentos) quedaron visualmente unificadas, el panel colapsa, el ancho de grabación es real, la regla de compases es real. Pero hay una diferencia importante entre **"se ve terminado"** y **"funciona de verdad"**. Lista de lo que hoy es solo visual, encontrado durante esta sesión revisando el código real:

| Control | ¿Toca audio real? | Dónde vive |
|---|---|---|
| Volumen de instrumentos | ❌ No | `suite-pro-track-recorder.js` |
| Mute de instrumentos | ❌ No | `suite-pro-track-recorder.js` |
| Solo de instrumentos | ❌ No | `suite-pro-track-recorder.js` |
| Balance L/R de instrumentos | ❌ No | `suite-pro-track-recorder.js` |
| Volumen/Mute/Solo de Chart | ✅ Sí | `suite-pro-chart-v260-cambio100.js` |
| Volumen/Mute/Solo de Lyric | ❌ No (canal sin audio propio) | `suite-pro-chart-v260-cambio100.js` |
| Canal MIDI (Ch 1-16) | ❌ No conectado a nada real | `suite-pro-track-recorder.js` |
| "Convertir letra a sonido" | ❌ Placeholder | `suite-pro-chart-v260-cambio100.js` |
| "Crear sonido en pentagrama" | ❌ Placeholder | `suite-pro-chart-v260-cambio100.js` |
| "Detectar instrumento" | ❌ Placeholder, sin diseñar | `suite-pro-chart-v260-cambio100.js` |
| Seek de audio (arrastrar barra de progreso) | ❌ Solo mueve la vista | `suite-pro-chart-v260-cambio100.js` |

La causa raíz de casi toda esta lista es la misma: **no existe un motor de reproducción simultánea de las pistas grabadas** (Web Audio API con nodos de ganancia por canal). Hoy solo existe reproducción individual ("▶ Escuchar" de a una toma por vez). Por eso el plan empieza ahí — es la pieza que desbloquea a todas las demás.

### 2.1 Repo — el "desmadre" real, con números

Val confirmó algo importante: **el repo público está sirviendo `main`**, la versión vieja "v25 Song Structure Builder" — el trabajo real vive en `refactor/js-modules`. Cloné esa rama y comparé contra lo que `index.html` realmente carga:

| Medición | Resultado |
|---|---|
| Archivos `.js` en `js/` | 227 |
| Archivos `.js` REALMENTE cargados por `index.html` | 46 |
| Archivos `.js` muertos (nunca se ejecutan) | **182** |
| Peso del código muerto | **24.3 MB de 27.1 MB totales del js/ (92%)** |
| Copias duplicadas en la RAÍZ del repo (`suite-pro-chart-v260-cambio100.js`, `suite-pro-track-recorder.js`) | 2 archivos, **distintos** a los reales de `js/` — nunca se cargan, pero sí pueden confundir si alguien edita el equivocado |
| Carpetas con una copia completa duplicada de la app (`legacy/`, `docs/`) | 2 |
| READMEs/HANDOFFs/PLANes sueltos en la raíz | 7 archivos + 1 con emoji en el nombre |
| Fecha del README maestro (`README_Studio936_Composer.md`) | **5 de junio de 2026** — desactualizado, no incluye nada de los Cambios 371-444 |

**Causa raíz (según Val):** cada Cambio de la refactorización se guardó como archivo NUEVO versionado (`v201`, `v202`... `v260`) en vez de sobrescribir el anterior — probablemente como respaldo mientras se refactorizaba. Nunca se volvió a borrar lo superado.

**Riesgo real de limpiar:** ya pasó una vez (Cambio 93, ver `COMMIT_Cambio93_LIMPIEZA.md` en el repo) que consolidar CSS rompió el menú lateral y hubo que revertir. La lección no es "no limpiar" — es limpiar por etapas, empezando por lo que es **imposible que rompa nada** porque ni siquiera se ejecuta hoy (los 182 archivos muertos), y dejar para el final lo que sí es delicado (CSS duplicado dentro de archivos VIVOS).


---

## 3. Matriz de prioridad

| Prioridad | Criterio |
|---|---|
| 🔴 Alta | Bloquea otras piezas, o es un control visible que hoy miente sobre lo que hace |
| 🟡 Media | Mejora real de producto, no bloquea nada más |
| 🟢 Baja | Pulido, limpieza, o funciones nuevas sin pedido explícito todavía |

---

## 4. Plan semana a semana (12 semanas ≈ 3 meses)

### Bloque 0 — Limpieza de repo, fase segura (semana 1, EN PARALELO, no bloquea nada) 🔴 Alta

**Qué:** Sacar del medio los 182 archivos JS muertos (92% del peso de `js/`), las 2 copias duplicadas en la raíz, y ordenar los documentos sueltos — TODO esto sin tocar ni un archivo que esté realmente en uso.

**Cómo:**
1. Archivar (mover, NO borrar todavía — regla del proyecto de no eliminar sin confirmar) los 182 `.js` no referenciados por `index.html` a una carpeta separada, p. ej. `js/_archivo_historico/`.
2. Mover los 2 duplicados de la raíz (`suite-pro-chart-v260-cambio100.js`, `suite-pro-track-recorder.js` sueltos, distintos a los de `js/`) a esa misma carpeta de archivo — hoy son una trampa real si alguien edita el equivocado por error.
3. Confirmar con el patrón de siempre (`fetch` + `cache:'no-store'` + prueba manual completa) que el sitio funciona EXACTO igual después — tiene que dar igual, porque nada de esto se ejecutaba.
4. Dejar 2 semanas de margen viéndolo funcionar bien antes de borrar definitivamente (no archivar para siempre).
5. `legacy/` y `docs/studio936_composer_ Modular.html` (copias completas de la app vieja) — confirmar con Val si hace falta conservar alguna antes de mover.
6. Actualizar `README_Studio936_Composer.md` (desactualizado desde el 5 de junio) con lo que pasó en Cambios 371-444 — fusionarlo con el handoff que ya tenemos.

**Tiempo estimado:** 2-3 días de trabajo real, dentro de la semana 1 (no ocupa la semana completa — corre en paralelo al Bloque 1).
**Depende de:** nada. **No bloquea** el Bloque 1 (motor de audio) — son independientes.
**Riesgo:** muy bajo — son archivos que hoy no se ejecutan, así que moverlos no puede cambiar el comportamiento de la app.

**Nota sobre cómo ejecutarlo:** Val hace todos los cambios de Git manualmente por la interfaz web de GitHub — mover/archivar 182 archivos uno por uno ahí es poco práctico. Hay que decidir juntos el método antes de arrancar (ver pregunta al final de este mensaje).

---

### Bloque 1 — Motor de audio real (semanas 1-3) 🔴 Alta

**Qué:** Construir el motor de reproducción simultánea de pistas grabadas (Web Audio API: `AudioContext`, un `GainNode` + `StereoPannerNode` por canal, sincronización de arranque entre tomas).

**Cómo:**
- Semana 1: decodificar los blobs guardados (`decodeAudioData`) y armar el grafo de audio (source → panner → gain → destination) por cada take activo de la sección visible.
- Semana 2: conectar Volumen/Mute/Solo/Balance de instrumentos a los nodos reales (hoy solo cambian opacidad/CSS). Implementar la lógica de Solo real que pediste ("que toque solo el instrumento y bloquee los otros").
- Semana 3: sincronización de arranque entre pistas (todas las tomas de una sección deben empezar exactamente juntas) + pruebas con canciones reales de varias pistas.

**Tiempo estimado:** 3 semanas.
**Depende de:** nada — es la base.
**Desbloquea:** Solo real, tijera (bloque 2), MIDI real (bloque 3).

---

### Bloque 2 — Editor de audio "tijera" (semanas 4-6) 🔴 Alta

**Qué:** El pendiente más grande y más viejo del proyecto (mencionado ya en el handoff de Cambios 371-430). Recorte, movimiento y pegado de tomas grabadas dentro del mismo canal, con forma de onda real.

**Cómo:**
- Semana 4: dibujar la forma de onda real en canvas (ya tenemos `decodeAudioData` del bloque 1) reemplazando la franja de color decorativa.
- Semana 5: gesto de corte (tijera/split) — decidir el modelo de datos (offsets sobre el mismo blob vs. blobs separados) y guardar el punto de corte.
- Semana 6: mover/arrastrar clips dentro del canal, alineado a la regla de compases real (ya existe desde el Cambio 434), + menú Cut/Copy/Delete/Rename/Loop/Split/Settings al estilo GarageBand que ya mostraste como referencia.

**Tiempo estimado:** 3 semanas.
**Depende de:** Bloque 1 (necesita el motor de audio real para reproducir los clips editados).

---

### Bloque 3 — Conexión MIDI real (semanas 7-8) 🟡 Media

**Qué:** Conectar el motor MIDI que YA EXISTE y funciona (`suite-pro-midi.js`, captura real de teclado MIDI vía Web MIDI API) con el canal "MIDI" del grabador de pistas, que hoy graba con el micrófono como cualquier otro canal.

**Cómo:**
- Semana 7: decidir qué guarda un "take" de MIDI (eventos de notas para resintetizar vs. audio ya renderizado al grabar) — esto cambia cómo se ve y se reproduce después. Documentar la decisión antes de programar (regla del proyecto: investigar antes de codear).
- Semana 8: conectar la captura (`captureEvents`, ya existe) al sistema de tomas de `track-recorder.js`.

**Tiempo estimado:** 2 semanas.
**Depende de:** Bloque 1.

---

### Bloque 4 — Lyric → sonido (semanas 9-10) 🟡 Media

**Qué:** Conectar "Convertir letra a sonido" y "Crear sonido en pentagrama" con el pentagrama de pitch/melodía que YA EXISTE en el editor de letra de `structure.js` (`current.pitches`, Cambios 53/59/64) pero que ninguna vista del Chart lee todavía — el dato está huérfano.

**Cómo:**
- Semana 9: leer `current.pitches` desde el Chart y confirmar con vos el formato de datos disponible.
- Semana 10: conectar la reproducción real (usando el motor del Bloque 1).

**Tiempo estimado:** 2 semanas.
**Depende de:** Bloque 1.

---

### Bloque 5 — Cierre de pendientes chicos (semana 11) 🟡 Media / 🟢 Baja

**Qué:**
- Seek real de audio al arrastrar la barra de progreso (🟡 media — hoy solo mueve la vista).
- "Detectar instrumento" — diseñar qué hace realmente (🟢 baja, función nueva sin especificar todavía).
- Vista Bloques — replicar ahí la barra mini de sesión que ya existe en Vista Continua (🟢 baja, mencionado en el handoff como pendiente si algún día se pide).

**Tiempo estimado:** 1 semana.
**Depende de:** Bloque 1 para el seek.

---

### Bloque 6 — Limpieza y pulido final pre-lanzamiento (semana 12) 🟡 Media

**Qué:**
- Fase 0 CSS cleanup — consolidar selectores duplicados de Cambios históricos en los archivos activos (ojo: un intento anterior en el Cambio 93 rompió el menú lateral y se revirtió — hacerlo con cuidado, de a poco, con pruebas después de cada paso).
- Limpieza de repo — archivar o borrar Cambios 1-49 una vez verificado que no se usan (según las reglas del proyecto).
- Revisión visual fina general — pasada completa comparando todo contra las referencias de GarageBand, con vos mirando en vivo.
- Pruebas de extremo a extremo de todo lo construido en los bloques 1-5.

**Tiempo estimado:** 1 semana.
**Depende de:** todo lo anterior.

---

## 5. Resumen de tiempos

| Bloque | Semanas | Prioridad |
|---|---|---|
| 0. Limpieza de repo (fase segura) | 1 (en paralelo) | 🔴 Alta |
| 1. Motor de audio real | 1-3 | 🔴 Alta |
| 2. Editor tijera | 4-6 | 🔴 Alta |
| 3. MIDI real | 7-8 | 🟡 Media |
| 4. Lyric → sonido | 9-10 | 🟡 Media |
| 5. Pendientes chicos | 11 | 🟡/🟢 |
| 6. Limpieza CSS delicada + borrado definitivo del archivo del Bloque 0 | 12 | 🟡 Media |

**Total: 12 semanas (~3 meses), calendario ajustado, sin semanas de colchón.** Si alguna semana se extiende (es común en el Bloque 2, el más grande e incierto), lo más fácil de mover sin afectar la fecha de lanzamiento es el Bloque 5 (pendientes chicos) — se puede correr a después del lanzamiento sin bloquear nada.

---

## 6. Cómo se usa esta bitácora de acá en adelante

- Cada semana, antes de empezar, revisamos juntos qué Cambios corresponden a esa semana.
- Cada Cambio sigue el formato ya establecido (qué resuelve, qué archivos toca, qué NO toca, prueba manual).
- Al cerrar cada bloque, actualizo esta bitácora con una sección "✅ Completado" debajo del bloque correspondiente, con los números de Cambio reales que lo resolvieron — así queda como registro histórico, no solo como plan.
- Si aparece trabajo no planeado (como pasó esta sesión con el rediseño de las barras), lo anotamos aparte en una sección "Fuera de plan" al final, para no perder de vista si el cronograma de 3 meses se está corriendo.

---

## Fuera de plan (agregado durante la sesión de hoy, no estaba en ningún plan previo)

- Rediseño completo de las 3 barras de control (Chart/Lyric/instrumentos) — Cambios 431 a 444.
- Riel de colapso estilo Apple/GarageBand — Cambio 436.
- Regla de compases con tiempo real — Cambio 434.
- Ancho real de grabación según duración+BPM — Cambio 434.

Esto no estaba en el handoff previo como prioridad, pero el resultado visual fue importante para que la app "se sienta profesional" — vale la pena tenerlo anotado para que la fecha de 3 meses considere que ya se usó tiempo de sesión en esto.
