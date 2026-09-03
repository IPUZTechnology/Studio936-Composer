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

---

## Cierre de sesión de audio — diagnóstico de timbres y dirección de calidad sonora

**Fecha:** 30 agosto 2026  
**Contexto:** revisión del motor de audio y perfiles de instrumentos del proyecto antes de seguir con ajustes puntuales.

### Estado previo al inicio de la sesión
- El proyecto ya tiene un motor de audio funcional basado en WebAudio y perfiles por instrumento.
- La arquitectura de audio no estaba rota ni desactivada.
- El problema principal ya no era "no suena", sino definir qué timbres están realmente bien y cuáles quedan como pendientes para perfeccionamiento.

### Resumen de la sesión
Se revisó el estado real del sonido en los archivos principales:
- `js/audio-engine.js`
- `js/instruments.js`
- `js/webaudiofont-engine.js`

Se concluyó que:
- El motor base es sólido y funcional.
- Hay una base correcta de perfiles por instrumento, con filtros, ataque, decay y variaciones de timbre.
- Hay una capa de samples reales con WebAudioFont para varios instrumentos, aunque no todos están en el mismo nivel de madurez.
- La diferencia más relevante no es quitar instrumentos, sino diferenciar cuáles timbres ya están bien y cuáles requieren ajuste de timbre, mezcla o sample real.

### Qué está bien
Los timbres que presentan mejor identidad y cuerpo son, en orden de confort sonoro observado:
- Piano
- Bajo
- Violín
- Chelo
- Epiano

También se evaluó que la guitarra es usable pero menos convincente que el piano o las cuerdas, y que su nivel de naturalidad dependerá de brillo y mezcla.

### Qué queda como opcional o pendiente
Los instrumentos que requieren más cuidado o son más claramente artificiales en su sonido actual son:
- Ukelele
- Sax
- Synth
- Organ
- Trompeta, si se quiere un carácter más natural o menos brillante
- Guitarra, si se desea un timbre más orgánico y menos "plástico"

### Razón del cambio
La decisión no fue quitar instrumentos del sistema, porque el selector y la lógica del proyecto siguen siendo funcionales para:
- DAW
- práctica por instrumento
- edición y vista de estudio
- composición y flujo del editor

La decisión fue documental: mantener todo visible y dejar escrito qué timbres ya están bien y cuáles quedan pendientes de mejora de sonido, sin romper la interfaz ni la lógica del producto.

### Decisión de diseño adoptada
- No se quitan instrumentos del selector ni de la UI.
- Se documenta su estado real de calidad sonora.
- Los timbres mejor evaluados permanecen como base y preferencia.
- Los timbres más artificiales quedan como opcionales o pendientes de ajuste.
- Los refinamientos de timbre se harán en una fase posterior, cuando el producto esté estabilizado y la prioridad sea calidad sonora más que funcionalidad.

### Prioridades claras para seguir
**Alta prioridad**
- Mejorar timbres pendientes para que suenen más naturales
- Afinar brillo y cuerpo en guitarras, ukelele y sax
- Revisión de synth/organ como color, no como base

**Media prioridad**
- Ajustes de mezcla y EQ por timbre
- Matizar tono y ataque para instrumentos con brillo excesivo
- Revisar trompeta y guitarra para quitar artificialidad

**Baja prioridad**
- Mejoras cosméticas o de UX sobre instrumentos no críticos
- Ajustes de detalle no esenciales para lanzamiento

### Siguiente sesión
La siguiente sesión debe arrancar revisando este cierre de audio y continuando con:
- clasificación documental del estado real de cada instrumento
- registro de prioridades de timbre
- seguimiento de ajustes para los pendientes
- cerrar una ruta clara de mejora sin tocar la interfaz del selector

**Conclusión:** este análisis cierra correctamente como diagnóstico técnico y deja la base de decisión para la siguiente fase de refinamiento del sonido, sin romper la funcionalidad del proyecto.
----
Sesión — Cambios 453 a 474 (instrumentos nuevos, mixer, pads de ritmo, 11 géneros electrónicos)
Fecha: 2-3 septiembre 2026 Contexto: Val trajo un ZIP local con una auditoría de sonido hecha con otra IA (diagnóstico de rutas de audio duplicadas). Se rescató lo bueno, se descartó lo que tenía regresiones sin probar, y a partir de ahí la sesión se extendió mucho más: instrumentos nuevos, rediseño del Mixer, sistema de pads de ritmo con 11 géneros electrónicos reales, y un intento de batería real que hubo que revertir.

Qué se rescató del ZIP local (y qué NO)
✅ Rescatado: BACKING_CHANNELS ampliado en el track-recorder (silenciar fondo al grabar también apaga órgano/sax/violín/trompeta/chelo/banjo).
❌ NO rescatado: el motor de audio reescrito (audio-engine.js nuevo) — rompía la app entera al cargar (app.js llama a AudioEngine.setup(), que esa reescritura ya no tenía). Era para "El Estudio" (motor multipista, todavía en 0%), no para el motor de práctica en vivo. Queda como base real para cuando arranque ese bloque, con su propio nombre de archivo.
❌ NO rescatado: el Mixer DJ nuevo (sound-mix-module.js + channel-mixer.js reescrito) — limitaba el sample real solo a guitarra/ukelele (regresión) y dejaba instrumentos nuevos silenciados por defecto sin forma obvia de reactivarlos.
Instrumentos nuevos (Cambios 454, 456)
Banjo — sample real confirmado (1050_GeneralUserGS_sf2_file, GM 105).
Ukelele — como WebAudioFont no tiene ukelele bajo ningún nombre en su catálogo (confirmado revisando categoría por categoría), se reemplazó el parche viejo (guitarra transpuesta +12, sonaba "a marimba") por el mismo sample de Banjo sin transponer. No es un ukelele real, pero suena mucho más limpio. Pendiente real: conseguir/convertir un soundfont de ukelele genuino (existe uno gratuito de HedSound).
Guitarra (cuerdas de metal) — sample real confirmado (0253_Acoustic_Guitar_sf2_file, GM 25).
Guitarra Eléctrica — deducido con la fórmula ya probada (GM 26, jazz/clean), sin confirmar con HTTP real todavía, cae al sintetizador si falla.
Bug encontrado y corregido (Cambios 457-460): agregar estos instrumentos nuevos expuso que hay 11 listas separadas en app.js que chequean literalmente 'guitar'/'ukulele'/'bass'/'lead' para decidir qué mostrar (piano vs. diapasón, qué digitación usar) — nunca centralizadas. Se corrigieron los 6 lugares que afectaban directamente el bug reportado (guitarras nuevas mostraban el piano, o una vista vieja de respaldo sin la digitación real). Las otras 5 quedaron documentadas en el código como deuda técnica, sin tocar.
Limitador maestro (Cambio 455-456)
Causa: connectOut() mandaba cada nota directo a audioCtx.destination, sin control compartido — un acorde de guitarra (varias cuerdas casi juntas) superaba el límite de 0 a 1 y el navegador recortaba la onda (clipping, sonaba distorsionado).
Solución: DynamicsCompressorNode compartido (window.__studio936MasterBus), por el que pasa todo el audio.
Ajuste fino: el umbral inicial aplastaba el piano/Rhodes (comprimía cualquier nota, no solo los acordes que se pasaban). Se subió el umbral para que solo entre cuando hace falta.
Mixer de Canales rediseñado (Cambio 461)
Estética de consola física: faders verticales, VU meter animado (basado en el volumen configurado, no análisis de audio real — está documentado en el código como limitación honesta), botones tipo hardware. Mismo "Bridge" de siempre con app.js, cero riesgo para el motor de audio.
Pads de Ritmo + 11 géneros electrónicos nuevos (Cambios 462-471)
Sistema de pads táctiles: tocás un pad, cambia el groove en vivo (usa Bridge.setStyle, agregado en el Cambio 462 — antes no existía la contraparte de getStyle()).
11 géneros nuevos, cada uno con patrón de batería real Y capa armónica propia (no son variaciones disfrazadas): Trance, Eurotrance, Electro (UK), House, Techno, Drum & Bass, Dubstep, Deep House, Afrobeats, Dembow — más un ajuste real a 3 de los 11 géneros viejos que estaban genéricos: Rock (antes acorde y bajo pegaban exacto, ahora strum real de guitarra rítmica), Cumbia (antes negras rectas casi idénticas a Rock, ahora la síncopa real del género), Bossa Nova (el acorde estaba espaciado uniforme cada 4 pasos — no es síncopa real, es contratiempo parejo; corregido con el patrón irregular real tipo Jobim/Gilberto).
Cada pad electrónico también cambia el instrumento a Synth automáticamente y ajusta el tempo al rango real del género (Cambio 465, 470) — antes el estilo y el instrumento eran independientes y todo sonaba "a piano con otro tempo" sin importar el ritmo elegido.
Limitación real y honesta, documentada en el código: el control de BPM tiene un techo de 160 — Drum & Bass real anda en 170-180, no se puede llegar al tempo real todavía.
Pad sostenido de fondo (Cambio 466): colchón de synth atmosférico real (sample "Pad 2 warm" confirmado) para los 3 primeros géneros electrónicos, tocando el mismo acorde largo y sostenido por debajo del bajo/arpegio — capa que le faltaba comparado con un acompañamiento tipo teclado Yamaha.
Rueda táctil / jog wheel (Cambio 464): dentro del panel de Pads, gira con el dedo o el mouse y dispara el patrón de batería real paso a paso, siguiendo el gesto — pensado para iPad.
🔴 Batería como instrumento — intentado y REVERTIDO (Cambios 472-474)
La batería como instrumento de práctica (a diferencia del groove automático, que siempre sonó bien con el sintetizador) nunca tuvo sample real — quedó deshabilitada a propósito desde una sesión anterior (Cambio 449) porque no se había encontrado el archivo correcto.
Se encontró evidencia sólida real (el mismo ejemplo oficial del repositorio de WebAudioFont) para kick/caja/hi-hat cerrado/hi-hat abierto, y se conectó también el módulo de toque manual (suite-pro-drum-composer.js), que tenía su PROPIO AudioContext aislado, nunca conectado al motor de samples.
Se rompió dos veces en el intento: primero un error de cálculo del nombre de variable real del archivo; después, un problema más de fondo — el motor de carga de samples usa una sola fila compartida y serializada (WebAudioFont no soporta pedidos en paralelo), y los 4 pedidos nuevos de batería competían por esa fila con los instrumentos que Val estaba tocando activamente (guitarra, etc.), dejándolos sonando con el sintetizador viejo mientras esperaban en la cola.
Decisión: revertir todo por completo (Cambios 472 y 473 deshechos) en vez de seguir parchando en caliente al final de una sesión ya muy larga. Queda pendiente como su propio Cambio futuro, dedicado, con un diseño de cola de carga que no compita con los instrumentos activos.
🔴 Hallazgo no documentado hasta hoy: fretboard.js es legacy VIVO, no muerto
A diferencia de los 182 archivos ya archivados en js/_archivo_historico/ (esos sí confirmados sin riesgo), js/fretboard.js es un sistema de diapasón viejo que index.html sigue cargando y usando activamente, en paralelo al sistema nuevo (js/suite-pro-string-surface.js, el mástil "SuperGuitarra 936"). Fue la causa real de que el bug de las guitarras nuevas apareciera — cuando el sistema nuevo no encuentra una digitación válida, no oculta nada, y el diagrama plano de fretboard.js se queda visible por debajo. No se tocó en esta sesión — migrarlo necesita su propio Cambio dedicado, mapeando primero qué partes de la app todavía dependen de él.

Consola de DJ con platos — alcance aclarado, no construido
Val pidió una consola tipo DJ con platos/discos para "scratchear" la canción completa. Se aclaró el alcance real: eso es un proyecto grande aparte (necesita renderizar la canción a un buffer fijo y que el mouse/dedo controle la posición de reproducción en tiempo real). Queda pendiente, sin empezar, como su propio bloque de trabajo futuro. Los pads de ritmo y la rueda táctil de hoy SÍ se construyeron y son una pieza más chica y ya resuelta de esa misma visión (dar sensación física de consola).

Todos los pendientes reales al cierre de esta sesión
Audio:

Batería como instrumento de práctica sin sample real (revertido hoy, ver arriba).
Consola de platos/discos para mezclar la canción completa (scratch real).
Ukelele sigue sin sample real propio (usa Banjo prestado).
Platillos, toms y percusión del groove automático siguen con sintetizador.
Limpieza/documentación:

fretboard.js sigue vivo, compitiendo con el sistema nuevo de mástil.
Los 2 duplicados trampa de la raíz del repo (suite-pro-chart-v260-cambio100.js, suite-pro-track-recorder.js sueltos) — pendiente borrar directo, sin archivar (un intento de archivarlos a mitad de esta sesión salió mal).
README maestro sigue fechado en junio, desactualizado.
5 de las 11 listas repetidas de "qué instrumento es de cuerdas" en app.js sin tocar (documentadas como deuda técnica en el código).
DJ / composición:

Plantilla de estructura DJ (16/32 compases con un clic) — hoy es manual.
Más géneros electrónicos si se quiere seguir ampliando.
Refinar Jazz/Pop con el mismo criterio aplicado a Rock/Cumbia/Bossa hoy.
Plan de lanzamiento (bitácora original, sin tocar toda esta sesión):

Bloque 1: motor de audio real multipista (base para que Volumen/Mute/Solo de instrumentos dejen de ser decorativos).
Bloque 2: editor tijera.

