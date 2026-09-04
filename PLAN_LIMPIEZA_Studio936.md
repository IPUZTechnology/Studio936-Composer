# PLAN DE LIMPIEZA — Studio 936 Composer
## Preparado al cierre de la sesión del 2-3 septiembre 2026, para ejecutar en la próxima sesión dedicada

**Regla de esta sesión: CERO features nuevas hasta que este plan quede en cero.** No se agrega ningún instrumento, ritmo, ni pantalla nueva mientras esto esté abierto.

---

## 0. Por qué esto ahora

En la sesión del 2-3 de septiembre (Cambios 453-474) se agregaron muchos instrumentos, ritmos y paneles nuevos — y en el camino se confirmaron, otra vez, los mismos síntomas que ya diagnosticó la bitácora original: código duplicado, listas repetidas nunca centralizadas, y archivos que nadie termina de borrar. Val lo notó explícitamente: *"me parece que estamos dejando mucha basura por el camino, y nunca terminamos de limpiar."*

Este documento junta TODO lo pendiente de limpieza real (de esta sesión y de sesiones anteriores) en un solo lugar, con orden de ejecución por riesgo — de lo más seguro a lo más delicado, siguiendo la misma lógica que ya usó el Bloque 0 original.

---

## 1. Matriz de prioridad y riesgo

| # | Ítem | Riesgo | Por qué |
|---|---|---|---|
| 1 | Borrar 2 archivos trampa de la raíz | 🟢 Muy bajo | Copias viejas que nadie carga, confirmado hace varias sesiones |
| 2 | Borrado definitivo de los 182 archivos ya archivados (Bloque 0) | 🟢 Muy bajo | Ya están fuera de `js/`, en `_archivo_historico/`, sin uso confirmado hace semanas |
| 3 | Revisar `legacy/` y `docs/` | 🟡 Bajo-medio | Hay que confirmar con Val si hace falta conservar algo antes de tocar |
| 4 | Centralizar las 11 listas repetidas de "¿es instrumento de cuerdas?" en `app.js` | 🟡 Medio | Toca el archivo protegido `app.js`, en varios lugares — hacerlo de a uno, con pruebas después de cada uno |
| 5 | Actualizar `README_Studio936_Composer.md` | 🟢 Bajo | Solo documentación, no afecta funcionamiento |
| 6 | Aclarar/documentar la relación entre el Mixer viejo (Studio) y el Mixer nuevo (Consola DJ) | 🟡 Medio | Requiere decidir si conviven o se unifican — decisión de producto, no solo código |
| 7 | Migrar `fretboard.js` al sistema nuevo (`suite-pro-string-surface.js`) | 🔴 Alto | Sistema legacy VIVO, con dependencias todavía sin mapear del todo — el más delicado de todos |

---

## 2. Ítem por ítem

### 2.1 — Borrar los 2 archivos trampa de la raíz 🟢

**Qué son:** `suite-pro-chart-v260-cambio100.js` y `suite-pro-track-recorder.js`, sueltos en la raíz del repo (junto a `index.html`), con contenido **distinto** a los archivos reales que usa la app (los de adentro de `js/`).

**Riesgo real de confundirlos:** alto — mismo nombre que los reales, fácil editar el equivocado sin darse cuenta.

**Acción:** borrar directo desde GitHub (no archivar — un intento de archivarlos a mitad de la sesión anterior salió mal y generó un archivo corrupto). Confirmar después que el sitio sigue funcionando exactamente igual (no debería cambiar nada, ya que nada los carga).

---

### 2.2 — Borrado definitivo de los 182 archivos archivados 🟢

**Qué son:** versiones viejas (v201 a v260 del Chart, v20-v65 del Compose, v403-v488 del Structure, etc.) ya movidas a `js/_archivo_historico/` en el Bloque 0 original.

**Estado:** confirmado hace semanas que `index.html` no carga ninguno de estos 182 — cero riesgo de que borrarlos cambie el comportamiento de la app.

**Acción:** borrar la carpeta completa `js/_archivo_historico/` (excepto que Val pida conservar alguno puntual como referencia histórica — confirmar antes).

---

### 2.3 — Revisar `legacy/` y `docs/` 🟡

**Qué son:** copias completas de versiones viejas enteras de la aplicación.

**Acción:** antes de tocar, listar qué contienen exactamente y preguntarle a Val si hace falta conservar algo (capturas, referencias visuales, etc.) antes de archivar/borrar.

---

### 2.4 — Centralizar las 11 listas repetidas en `app.js` 🟡

**Qué es el problema:** al agregar `guitarSteel`/`guitarElectric` como instrumentos nuevos (Cambio 456), se descubrió que hay **11 lugares distintos en `app.js`** que repiten la misma lista literal (`['guitar','ukulele','bass','lead']` o variantes) para decidir cosas como "¿muestro el diapasón o el piano?", "¿qué digitación uso?". Cada Cambio distinto agregó la suya, nunca se centralizó.

**Ya corregidos (Cambio 459-460), 6 de los 11:**
- `stringInstrumentId()` (línea ~423)
- `withEditorPreviewInstrument(...)` (línea ~371)
- Dos chequeos de `wantsMainSurface`/`normalizeViewFromInstrument` (líneas ~2658, ~2710)
- `ensureAutoFret` (línea ~3809)
- `forceInstrumentView` (línea ~4261)

**Sin tocar todavía, 5 restantes** — quedaron documentados en comentarios del código como deuda técnica pendiente. Hay que ubicarlos de nuevo (buscar patrón `['guitar','ukulele','bass'` en `app.js`) y decidir, para cada uno:
- ¿Afecta a algo que el usuario ve/usa hoy?
- ¿Se puede reemplazar por una llamada a `stringInstrumentId()` (ya centralizada) en vez de repetir la lista?

**Recomendación:** crear una única función `isStringFamilyInstrument(id)` reusada en los 11 lugares, en vez de 11 arrays sueltos — así el próximo instrumento de cuerdas que se agregue (si lo hay) no repite este mismo bug.

**Cómo probar después de cada uno:** repetir la prueba manual que ya usamos hoy — elegir cada instrumento de cuerdas (Guitarra, Guitarra cuerdas, Guitarra Eléctrica, Ukelele, Bajo) y confirmar que se ve el mástil real (no el piano, no el diagrama plano viejo).

---

### 2.5 — Actualizar el README maestro 🟢

**Estado actual:** `README_Studio936_Composer.md` sigue fechado el 5 de junio de 2026 — no menciona nada de los Cambios 371 en adelante (más de 100 Cambios sin documentar ahí).

**Acción:** fusionar con esta bitácora y sus addendums — no reescribir desde cero, consolidar lo que ya está escrito en los distintos documentos de sesión.

---

### 2.6 — Aclarar el Mixer viejo (Estudio) vs. el Mixer nuevo (Consola DJ) 🟡

**Hallazgo de hoy:** existen DOS módulos de Mixer completamente separados:
- `suite-pro-mixer.js` — vive adentro del panel lateral "Suite Pro" (área "Estudio"), controla solo mute/volumen del groove general (`grooveMuted`/`grooveBeforeMute`). Alcance chico, declarado explícitamente en su propio comentario: *"Scope: Studio > Mixer only."*
- `suite-pro-channel-mixer.js` — el botón principal 🎚 del header, rediseñado hoy (Cambio 461) como consola DJ con faders por canal (Batería/Bajo/Acordes/Solo/Piano/Ukelele), conectado a `channelMix` real en `app.js`.

**Esto no es necesariamente un bug** (como sí lo fue `fretboard.js`) — pueden tener propósitos legítimamente distintos. Pero es confuso para cualquiera que lea el código (¿o el propio Val!) sin saber que son dos cosas distintas.

**Decisión pendiente, no solo técnica:** ¿tiene sentido que sigan siendo dos mixers separados con roles distintos, o deberían unificarse en uno solo? Esto es una decisión de producto — investigar primero qué hace exactamente el mixer viejo del Estudio en la práctica (¿se usa hoy? ¿para qué?) antes de proponer una solución.

---

### 2.7 — Migrar `fretboard.js` 🔴 (el más delicado, dejar para el final)

**Qué es:** sistema de diapasón viejo ("v0.7.1.4" según su propio comentario interno), que `index.html` **todavía carga y usa activamente**, en paralelo al sistema nuevo (`suite-pro-string-surface.js`, el mástil "SuperGuitarra 936").

**Por qué es delicado:** a diferencia de los 182 archivos del punto 2.2 (esos sí confirmados muertos), este está VIVO — algo en la app todavía depende de él. Fue la causa real del bug de las guitarras nuevas de hoy (cuando el sistema nuevo no encuentra una digitación válida, no oculta nada, y el diagrama plano de `fretboard.js` se queda visible por debajo).

**Antes de tocar una sola línea:**
1. Mapear con `grep` cada lugar de `app.js` (y otros archivos) que llama a `buildFretboard()`, `Fretboard.buildFretboard()`, o cualquier función expuesta por `fretboard.js`.
2. Para cada llamador, confirmar si el sistema nuevo (`suite-pro-string-surface.js`) ya cubre esa misma función, o si hay algo que SOLO hace el viejo.
3. Recién ahí, decidir: ¿se puede apagar `fretboard.js` por completo? ¿o hay que migrar callers uno por uno, dejando ambos convivir temporalmente hasta terminar?

**Lección ya aprendida (Cambio 93 de una sesión mucho más vieja):** consolidar CSS de golpe rompió el menú lateral y hubo que revertir. Con `fretboard.js` el riesgo es mayor todavía porque es JS funcional, no solo estilos — ir de a un caller por vez, con prueba manual después de cada uno.

---

## 3. Orden de ejecución recomendado

1. 2.1 (archivos trampa) — 5 minutos, cero riesgo.
2. 2.2 (borrado definitivo de los 182) — con confirmación de Val antes.
3. 2.5 (README) — en paralelo, no bloquea nada.
4. 2.4 (5 listas restantes en `app.js`) — de a una, con prueba manual entre cada una.
5. 2.3 (`legacy/`/`docs/`) — cuando Val confirme qué conservar.
6. 2.6 (decisión de los 2 mixers) — conversación con Val primero, después código si hace falta.
7. 2.7 (`fretboard.js`) — al final, con el mapeo completo hecho primero, en su propia sesión si hace falta más de una.

---

## 4. Qué NO entra en este plan

- Batería como instrumento de práctica con sample real (Cambios 472-474, revertido) — es una tarea de **audio**, no de limpieza. Queda en la lista de pendientes general, no acá.
- Consola de platos / scratch — proyecto nuevo grande, no limpieza.
- Bloque 1/2 del plan de lanzamiento original (motor de audio multipista, editor tijera) — features nuevas, no limpieza.

Estas tres siguen en la lista de pendientes general de la bitácora, pero **después** de que este plan de limpieza esté en cero, según lo que acordamos hoy.

---

## 5. NUEVO — Punto 8: código muerto real dentro de `app.js` (confirmado, no solo comentarios)

**Encontrado revisando el pedido de Val de "¿se puede limpiar `app.js` de lo comentado?"** — la respuesta correcta no era comentarios sueltos, sino un bloque grande de **código completo, funcional pero inalcanzable**, sobreviviente de una versión mucho más vieja.

### 5.1 — El bloque "v18 Pro Suite" (líneas ~3399-3591) 🟢 Confirmado muerto, riesgo bajo

El propio código ya lo dice en su comentario de apertura (línea 3399): *"v18 Pro Suite extension (disabled: legacy duplicate of newer v19-v25 UX layers)"*. Es un panel modal completo — Biblioteca, Mixer, Modo Práctica, Teoría, Escalas, Acordes IA, Batería sintética, Grabación de ideas, Compartir, Plantillas — que fue reemplazado por los archivos módulo reales (`suite-pro-mixer.js`, `suite-pro-practice.js`, `suite-pro-library.js`, etc.) que se usan hoy.

**Verificación de que es seguro borrar:**
- Ninguna de las ~20 funciones del bloque se llama desde otro lado de `app.js`.
- Ninguna se llama desde `index.html`.
- Como `app.js` está encerrado en un bloque privado (IIFE), si no aparece en ningún otro lado del mismo archivo, es matemáticamente imposible que la llame algo de afuera.
- Su propia función `init()` (la que dispararía todo el bloque al cargar la página) **nunca se ejecuta** — ver punto 5.2.

**Funciones que caen en este borrado:** `showMixer`, `showPractice`, `showLibrary`, `showTheory`, `showScales`, `showChordAI`, `showTranspose`, `showShare`, `showLeadSheet`, `showTemplates`, `showOnboarding`, `toggleDrums`, `toggleRec`, `applyDetectedChord`, `buildSuiteProContent`, `bindSuiteProHandlers`, `populateSuiteProPanel`, `addV18Ui`, `openModal`, `closeModal`, `addHelp`, `checkHashImport`, `setupKeyboardCapture`, `inspire`, `ensureDrums`, `drumOsc`, `drumNoise`, `hitDrum`, `scheduleDrums`, `loadAddon`, `saveAddon`, `quantDur`, `startRec`, `stopRec`, `recNoteOn`, `recNoteOff`, `detectChordFromPcs`, `updateDetectedChord`, `library`, `saveLibrary`, `renderLibraryModal`, `makeTemplate`, `buildLeadHtml`, `suggestChords`, `chordVoicing` (esta última confirmar que no colisiona de nombre con alguna versión nueva usada de verdad — ver nota abajo), y el `init()` de la línea 3590.

**⚠️ Antes de borrar, un chequeo extra:** algunos nombres de este bloque viejo (como `chordVoicing`) podrían coincidir con nombres usados en otra parte del código con otro propósito — confirmar caso por caso con `grep` antes del borrado masivo, no asumir que toda la lista de arriba es 100% segura sin re-verificar.

### 5.2 — Hallazgo aparte y más delicado: 6 de las 7 funciones `init()` del archivo nunca se ejecutan 🟡

`app.js` tiene **7 declaraciones distintas de `function init(){...}`** en el mismo scope. En JavaScript, cuando hay varias funciones con el mismo nombre en el mismo bloque, la última definida en el archivo "gana" — todas las llamadas a `init()`, sin importar en qué línea estén, terminan ejecutando esa última versión. **Confirmado con una prueba real en Node.js**, no es una suposición.

Esto significa que **6 de las 7 `init()` del archivo nunca corren**, aunque cada una tenga, justo después, su propia línea que aparenta dispararla (`if(document.readyState==='loading')...`). Solo la última (línea ~5158) se ejecuta de verdad.

**Por qué esto es más delicado que el punto 5.1:** no es obviamente "legacy" como el bloque v18 (no dice "disabled" en ningún comentario) — puede que alguna de esas 6 `init()` muertas contenga lógica de inicialización que alguien todavía CREE que está funcionando, y su ausencia silenciosa podría estar causando algún bug menor no diagnosticado. **No tocar sin antes:**
1. Listar las 7 ubicaciones exactas de `function init(){...}`.
2. Para cada una de las 6 "perdedoras", leer qué hace y confirmar con Val si esa funcionalidad se supone que debería estar activa hoy (podría explicar algún comportamiento raro no reportado todavía).
3. Recién ahí decidir: ¿se borran las 6 muertas, o se rescata alguna lógica real que se perdió sin que nadie lo notara?

**Este punto se investiga ANTES del borrado del punto 5.1**, porque una de las `init()` muertas es justamente la del bloque v18 (línea 3590) — conviene entender el panorama completo de las 7 antes de tocar cualquiera de las dos cosas.

---

## 6. CORRECCIÓN a la sesión anterior — el punto 5.2 (las 7/8 `init()`) era una falsa alarma

**Investigado y descartado.** La sesión anterior (donde se armó este plan) yo había concluido, con una prueba en Node, que solo la última `function init(){...}` del archivo se ejecutaba y las otras quedaban "fantasma". Esa conclusión estaba mal — se basaba en una prueba que simulaba TODAS las declaraciones en un solo scope compartido, pero **`app.js` en realidad está armado como una seguidilla de muchos bloques IIFE separados** (`(() => { ... })();`), cada uno su propio scope aislado.

Verificado hoy: las 8 `init()` del archivo están cada una en su propio IIFE independiente — **las 8 se ejecutan correctamente**, ninguna es fantasma. Confirmado con una prueba real en Node simulando exactamente esa estructura (varios IIFEs separados, cada uno con su propio `init()`).

**Lección para las próximas sesiones de limpieza:** antes de asumir que dos declaraciones con el mismo nombre compiten entre sí, hay que confirmar primero si están en el MISMO scope o en scopes distintos (IIFEs separados) — no alcanza con que el nombre se repita en el archivo. Este mismo tipo de error casi se repite hoy con `chord()` durante el borrado del bloque v18 (se pensó por un momento que estaba huérfana; en realidad ya estaba bien importada desde `SongModel` al inicio del archivo).

**Punto 5.2 queda cerrado, sin acción pendiente.**

---

## 7. Punto 2.3 (`legacy/`, `docs/`) — cerrado sin acción, por decisión de Val

Val confirmó que no vale la pena revisar estas carpetas — son de las primeras versiones del proyecto, muy anteriores a todo el trabajo posterior. Se pueden borrar directo cuando haya oportunidad, sin necesidad de revisar contenido antes.

---

## 8. NUEVO — Punto 9: extraer los 17 bloques "extensión" de `app.js` a archivos propios

**Contexto (sesión del 3-4 septiembre 2026):** después de la limpieza del bloque v18, `app.js` quedó en 5.074 líneas. Revisando su estructura real, se confirmó que el archivo está armado como **18 bloques IIFE independientes** concatenados uno detrás del otro — no es una sola masa de código:

- **Bloque 1 (núcleo):** líneas 4-3469, **3.465 líneas**. Contiene el estado de la canción, el motor de scheduling de audio, el chart, y la mayoría de la lógica central. Interdependiente, de alto riesgo tocar — no es candidato a extracción por ahora.
- **Bloques 2 a 18:** 17 bloques más, cada uno una "extensión" histórica ya autocontenida (varios llevan comentarios propios como "v16 extension", "v17 extension", "v19 extension: compact tools drawer...", "v20 producer patch..."), sumando **~1.610 líneas** en total. Rango de tamaño: desde 8 líneas (el más chico) hasta 303 líneas (el más grande).

**Por qué esto es una oportunidad real:** estos 17 bloques ya están escritos como IIFEs separadas (`(() => { ... })();` o `(function(){ ... })();`), sin compartir variables entre sí directamente — es la misma arquitectura que ya usan los archivos módulo reales (`suite-pro-mixer.js`, `suite-pro-groove-pads.js`, etc.). Extraerlos a su propio archivo `.js` es, en la mayoría de los casos, más simple que crear un módulo nuevo desde cero — es cortar el bloque, pegarlo en un archivo nuevo, agregar el `<script>` correspondiente en `index.html` en el orden correcto, y confirmar que sigue funcionando igual.

**Por qué NO es un simple cortar y pegar mecánico (lección del Cambio 475 de hoy):** cada bloque puede leer elementos del DOM que asume que ya existen, o depender de alguna función/variable del bloque núcleo de una forma que no se ve a simple vista — igual que `chord()` pareció huérfana y no lo era. Cada extracción necesita la misma investigación cuidadosa de hoy: confirmar qué usa cada bloque de afuera de sí mismo, y qué usa el resto de la app de adentro de ese bloque, antes de moverlo.

**Orden recomendado — empezar por los más chicos, para probar el método sin arriesgar mucho:**

| Orden | Bloque | Líneas | Nota |
|---|---|---|---|
| 1 | Bloque 18 | 8 | El más chico — buen primer intento para validar el método |
| 2 | Bloque 9 | 18 | |
| 3 | Bloque 3 | 15 | |
| 4 | Bloque 2 | 16 | "v16 extension" |
| 5 | Bloque 14 | 14 | |
| 6 | Bloque 11 | 27 | |
| 7 | Bloque 12 | 28 | |
| 8 | Bloque 10 | 49 | |
| 9 | Bloque 15 | 45 | |
| 10 | Bloque 8 | 105 | |
| 11 | Bloque 4 | 101 | "v19 extension: compact tools drawer..." |
| 12 | Bloque 6 | 144 | |
| 13 | Bloque 13 | 155 | |
| 14 | Bloque 17 | 125 | |
| 15 | Bloque 5 | 209 | "v20 producer patch..." |
| 16 | Bloque 7 | 244 | |
| 17 | Bloque 16 | 303 | El más grande — dejar para el final, con el método ya probado en los anteriores |

**Meta realista:** si se completan todos, `app.js` bajaría de ~5.074 líneas a ~3.465 (el núcleo solo) — casi la mitad. No es necesario hacerlos todos en una sesión; cada uno es una unidad de trabajo independiente, se puede parar entre cualquiera de ellos sin dejar nada a medias.

**Regla de oro para cada extracción (no negociable):** después de mover un bloque, validar sintaxis de los dos archivos (`node --check`), confirmar que ninguna función/variable del bloque movido se sigue necesitando en el `app.js` que queda (mismo tipo de chequeo exhaustivo que se hizo hoy con `chord()`), y probar el sitio completo antes de pasar al siguiente bloque.

---

## 9. Actualización al Punto 9 — primer intento real, lecciones aprendidas

**Intentado hoy mismo, parcialmente.**

- **Bloque 18 (8 líneas): confirmado MUERTO, ya borrado (Cambio 477).** No era un caso de extracción — `bindFinalMidiExport` (de la que dependía) es privada al bloque núcleo, nunca visible desde ahí. Se protegía solo con un `if(typeof...!=='function') return;` que siempre cortaba. Confirmado con prueba real en Node.
- **Bloque 9 (18 líneas): investigado, NO es un caso simple.** Maneja selección de arreglos y nombres de botones reales de la interfaz (`v25UxBar`, `arrangeAddBtn`, etc.), depende de `project`, `sectionNames`, `arrangementParts`, `selectedArrangementIndex`, `selectArrangementPart` del bloque núcleo. Se ve genuinamente vivo — no se tocó.

**Lección importante para toda la extracción futura:** el conteo de líneas de la tabla original **no es buena medida de dificultad** en este archivo — cada función está escrita en una sola línea larga (sin saltos internos), así que 18 líneas acá pueden tener tanta lógica real como 150 en otro archivo. La tabla de "orden recomendado por tamaño" del punto 9 original sirve como punto de partida, pero cada bloque necesita la misma investigación cuidadosa sin importar cuántas líneas tenga — no hay atajo por tamaño.

**Números reales tras el borrado del Bloque 18** (los bloques se renumeran, ya no son 18 sino 17):

| Bloque | Líneas | Estado |
|---|---|---|
| 1 (núcleo) | 3.465 | No es candidato a extracción |
| 2 | 16 | Sin investigar |
| 3 | 15 | Sin investigar |
| 4 | 101 | Sin investigar ("v19 extension") |
| 5 | 209 | Sin investigar ("v20 producer patch") |
| 6 | 144 | Sin investigar |
| 7 | 244 | Sin investigar |
| 8 | 105 | Sin investigar |
| 9 | 18 | **Investigado — vivo, depende del núcleo, no es simple** |
| 10 | 49 | Sin investigar |
| 11 | 27 | Sin investigar |
| 12 | 28 | Sin investigar |
| 13 | 155 | Sin investigar |
| 14 | 14 | Sin investigar |
| 15 | 45 | Sin investigar |
| 16 | 303 | Sin investigar |
| 17 | 126 | Sin investigar |

**Recomendación:** dedicar una sesión aparte, con tiempo, para seguir bloque por bloque — no apurarlo al final de una sesión ya larga. `app.js` quedó en 5.067 líneas al cierre de hoy.
