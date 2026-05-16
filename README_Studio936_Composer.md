# Studio 936 Composer

**Studio 936 Composer** es una aplicación web musical para componer, estructurar, editar, escuchar y exportar canciones desde el navegador.

La visión del proyecto es convertirse en una herramienta modular para el Estudio 936: un asistente de composición capaz de manejar estructura de canción, progresiones de acordes, letras, melodías, playback, exportaciones y una Suite Pro de herramientas avanzadas.

> Mantra del proyecto: **Que todo suene luz.**

---

## Estado actual del proyecto

**Rama principal de trabajo:** `refactor/js-modules`

El proyecto nació como una aplicación grande en HTML/CSS/JavaScript y actualmente está en una fase de **granularidad modular**. El objetivo no es extraer archivos por extraer, sino separar responsabilidades para poder corregir y mejorar cada parte sin romper el resto.

Estado general conocido:

- La app carga.
- La rama activa de trabajo es `refactor/js-modules`.
- Ya existen varios módulos JavaScript separados.
- El arreglo/estructura fue diagnosticado y estabilizado parcialmente.
- La exportación JSON funciona.
- La exportación TXT/letras funciona.
- La ayuda funciona.
- MIDI volvió a funcionar después de limpiar problemas de caché/código viejo.
- Suite Pro aparece como opción, pero sus herramientas internas aún no están funcionales.
- El proyecto está en fase de estabilización, no de refactor masivo.

---

## Objetivo funcional

Studio 936 Composer debe permitir crear y trabajar canciones con:

- Título.
- Autor.
- Estilo / groove.
- BPM.
- Instrumento.
- Afinación.
- Secciones musicales.
- Progresiones de acordes.
- Bajo.
- Notas del acorde.
- Compases por acorde.
- Estructura completa de canción.
- Letras por sección.
- Solo / melodía por sección.
- Playback musical.
- Exportaciones.
- Herramientas avanzadas Suite Pro.
- Persistencia local / importación / backup.

---

## Modelo musical

La aplicación diferencia entre dos niveles:

### 1. Sección musical base

Ejemplos:

- Intro.
- Verso.
- Pre-coro.
- Coro.
- Solo.
- Puente.
- Outro.

### 2. Parte dentro del arreglo

Una canción puede repetir una misma sección base en varias partes del arreglo.

Ejemplo:

| Orden | Parte del arreglo | Sección base |
|---:|---|---|
| 1 | Introducción | intro |
| 2 | Verso 1 | verse |
| 3 | Pre-coro | prechorus |
| 4 | Coro 1 | chorus |
| 5 | Verso 2 | verse |
| 6 | Solo | solo |
| 7 | Coro final | chorus |

Este detalle es clave: **la sección base y la parte del arreglo no son lo mismo**.

---

## Principio de granularidad

La granularidad del proyecto significa:

> Separar responsabilidades para poder arreglar una parte sin romper las demás.

Antes, muchas responsabilidades estaban concentradas en `js/app.js`:

- Lógica de canción.
- Lógica de arreglo.
- Editor de acordes.
- Editor de solo/melodía.
- Transporte/playback.
- Exportación MIDI.
- UI legacy.
- Suite Pro.
- Helpers y parches históricos.

La estrategia actual es:

1. Extraer o modularizar solo lo que sea seguro.
2. Detener extracción cuando haya riesgo de romper comportamiento estable.
3. Pasar a modo estabilización.
4. Corregir comportamiento visible por fases pequeñas.
5. Documentar cada decisión importante.

---

## Mapa modular actual

| Módulo / zona | Rol | Estado |
|---|---|---|
| `index.html` | Entrada principal de la app | Activo |
| `css/` | Estilos visuales | Activo |
| `js/app.js` | Orquestador legacy / núcleo histórico | Riesgo alto |
| `js/song-model.js` | Modelo de canción/proyecto | Modularizado |
| `js/storage.js` | Persistencia local/importación/exportación | Modularizado |
| `js/arrangement.js` | Estructura/arreglo de canción | En estabilización |
| `js/editor.js` | Editor musical principal | En revisión |
| `js/audio-engine.js` | Motor de audio/playback | Riesgo alto |
| `js/transport.js` | Transporte, play/stop/metrónomo | Riesgo alto |
| `js/rhythm-engine.js` | Ritmos/grooves | Modularizado |
| `js/midi-export.js` | Exportación MIDI | Funcional, no tocar sin necesidad |
| `js/lead-sheet.js` | Lead sheet / hoja guía | Por revalidar |
| `js/music-theory.js` | Teoría musical, escalas, acordes | Modularizado/parcial |
| `js/fretboard.js` | Diapasón / visualización instrumental | Modularizado/parcial |
| `js/mixer.js` | Mezcla / controles de audio | Por revalidar |
| `js/flow8.js` | Integración con Behringer Flow 8 | Modularizado/parcial |
| `js/ui-bindings.js` | Conexión UI-eventos | Activo |
| `js/pro-suite.js` o `js/suite-pro.js` | Suite Pro / herramientas avanzadas | Frente activo |
| `legacy/` | Código y recursos heredados | Consultar, no mezclar a ciegas |
| `docs/` | Bitácora técnica y auditorías | Mantener actualizado |

---

## Estado de arreglo / estructura

Se agregó diagnóstico con:

`Studio936DebugArrangement()`

Resultado funcional reportado:

```txt
arrangement.parts: Array(12)
selectedIndex: 1
selectedSection: "intro"
sectionSelect: "intro"
activeSongSection: "intro"
activeSongPartLabel: "Introducción"
isValid: true
reason: "ok"
```

Conclusión:

- El arreglo no está vacío.
- El arreglo no está corrupto.
- La app reconoce una parte activa al cargar.
- El problema no era ausencia de arreglo, sino sincronización entre capas legacy.

Se centralizó la selección mediante:

`selectArrangementPart(index)`

La intención es mantener alineados:

- `selectedArrangementIndex`
- `sectionSelect`
- `activeSongSection`
- `activeSongPartLabel`
- `arrangement.selectedIndex`
- `arrangement.selectedSection`

---

## Estado de exportaciones

### Funcionalidades reportadas como funcionando

- Descargar JSON.
- Descargar TXT.
- Letras / TXT.
- Ayuda.
- Exportar MIDI.

### Nota sobre MIDI

MIDI presentó errores heredados como:

```txt
ReferenceError: slack/slugg is not defined
```

Después se detectó que parte del problema era caché vieja del navegador. En incógnito u otro navegador, MIDI volvió a descargar correctamente.

Regla actual:

> No tocar MIDI si está funcionando, salvo que exista una prueba clara y aislada.

---

## Suite Pro

Suite Pro es el frente activo actual.

### Qué es Suite Pro

Suite Pro debe funcionar como un **hub de herramientas avanzadas**, no como una sola función.

Herramientas esperadas:

1. Biblioteca.
2. Plantillas.
3. Transponer.
4. Escalas.
5. Acordes IA.
6. Batería.
7. Mixer.
8. REC Idea.
9. MIDI IN.
10. PDF.
11. Lead Sheet.
12. Práctica.
13. Compartir.
14. Inspirar.
15. Teoría.

### Estado conocido

- Suite Pro aparece como opción en la barra.
- El panel se ha intentado montar dinámicamente.
- Se identificó `#v18Suite` como panel legacy.
- Se identificó `.v19-open` como clase de apertura.
- Se identificó `body.v25ux-clean` como modo visual actual.
- Se ha trabajado en que el panel aparezca y muestre contenido.
- Las herramientas internas todavía no deben asumirse funcionales.
- Actualmente Suite Pro debe considerarse **carcasa visual parcialmente recuperada**, pendiente de auditoría funcional botón por botón.

### Regla clave

No mezclar dos fases:

1. **Publicar visualmente Suite Pro.**
2. **Hacer funcionales sus herramientas internas.**

Primero se estabiliza visibilidad. Luego se prueba cada botón.

---

## Auditoría pendiente de Suite Pro

Cuando el panel sea visible, se debe ejecutar una auditoría funcional botón por botón.

| Botón | Estado | Error consola | Archivo/lógica relacionada | Acción recomendada |
|---|---|---|---|---|
| Biblioteca | Pendiente | Pendiente | Pendiente | Auditar |
| Plantillas | Pendiente | Pendiente | Pendiente | Auditar |
| Transponer | Pendiente | Pendiente | Pendiente | Auditar |
| Escalas | Pendiente | Pendiente | Pendiente | Auditar |
| Acordes IA | Pendiente | Pendiente | Pendiente | Auditar |
| Batería | Pendiente | Pendiente | Pendiente | Auditar |
| Mixer | Pendiente | Pendiente | Pendiente | Auditar |
| REC Idea | Pendiente | Pendiente | Pendiente | Auditar |
| MIDI IN | Pendiente | Pendiente | Pendiente | Auditar |
| PDF | Pendiente | Pendiente | Pendiente | Auditar |
| Lead Sheet | Pendiente | Pendiente | Pendiente | Auditar |
| Práctica | Pendiente | Pendiente | Pendiente | Auditar |
| Compartir | Pendiente | Pendiente | Pendiente | Auditar |
| Inspirar | Pendiente | Pendiente | Pendiente | Auditar |
| Teoría | Pendiente | Pendiente | Pendiente | Auditar |

Clasificación recomendada:

- Funciona.
- Abre modal pero falla contenido.
- No hace nada.
- Lanza error en consola.
- Depende de API/browser.
- Requiere implementación futura.
- Depende de lógica legacy inexistente.

---

## PRs y ramas: reglas de trabajo

### Regla principal

> Un problema visible por PR.

No mezclar en un mismo PR:

- Suite Pro.
- MIDI.
- Transport.
- Arrangement.
- Editor.
- CSS global.
- Refactor estructural.

### PRs que no deben mezclarse ahora

Los PRs viejos de transport deben quedar congelados hasta que Suite Pro y estructura estén estables:

- PR #14.
- PR #15.
- PR #16.

También se debe tener cuidado con PRs viejos de sincronización de editor si no están alineados con la rama actual.

### Flujo recomendado

1. Trabajar siempre desde `refactor/js-modules`.
2. Crear rama corta con nombre descriptivo.
3. Cambiar lo mínimo necesario.
4. Probar en incógnito o navegador limpio.
5. Documentar resultado.
6. Abrir PR pequeño.
7. Mergear solo si no rompe funciones ya validadas.
8. Actualizar `docs/` si el cambio afecta arquitectura o estado funcional.

---

## Checklist de pruebas rápidas

Después de cada merge importante:

### Carga

- La app abre sin pantalla rota.
- No hay error fatal en consola.
- Los controles principales se ven.

### Arreglo

- `Studio936DebugArrangement()` devuelve `isValid: true`.
- Hay partes en `arrangement.parts`.
- La parte activa se sincroniza con la sección activa.

### Exportaciones

- JSON descarga.
- TXT descarga.
- Letras/TXT descarga.
- MIDI descarga.

### Suite Pro

- Botón Suite Pro visible.
- Panel abre.
- Panel cierra.
- Título visible.
- Botón cerrar visible.
- Botones internos visibles.
- No hay duplicación al abrir/cerrar varias veces.
- `Studio936DebugSuite()` muestra estado coherente, si existe.

### Editor

- Cambiar sección no rompe el arreglo.
- Aplicar acorde funciona.
- Agregar acorde funciona.
- Duplicar acorde funciona.
- Borrar acorde funciona.

### Audio / Transport

No tocar hasta estabilizar Suite Pro y editor, salvo prueba manual:

- Start Groove.
- Escuchar canción.
- Stop.
- Metrónomo.
- Solo ON/OFF.
- Cambio de sección durante reproducción.

---

## Zonas de riesgo

### Bajo riesgo

- JSON.
- TXT.
- Ayuda.
- Diagnóstico de arreglo.
- Botón visible de Suite Pro.

### Riesgo medio

- Suite Pro visual.
- Botones internos Suite Pro.
- Editor de acordes combinado con estructura.

### Riesgo alto

- Transport/playback.
- Extracción adicional de módulos.
- Funciones legacy duplicadas.
- PRs antiguos de transport.
- Cambios globales en `app.js`.

---

## Qué NO hacer ahora

- No seguir extrayendo módulos a ciegas.
- No tocar transport si no es estrictamente necesario.
- No tocar MIDI si está funcionando.
- No mezclar PRs viejos de transport.
- No volver a ramas viejas sin diagnóstico.
- No reescribir Suite Pro completo en un solo PR.
- No convertir todo a React todavía.
- No meter Vite/React antes de estabilizar funciones base.
- No hacer cambios visuales grandes mientras Suite Pro esté incompleto.

---

## Ruta tecnológica recomendada

### Fase 1 — Estabilización actual

- Mantener HTML/CSS/JavaScript modular.
- Asegurar que cada función crítica tenga estado conocido.
- Documentar dependencias y puntos de riesgo.
- Recuperar Suite Pro visualmente.
- Auditar herramientas internas.

### Fase 2 — Modularidad limpia

- Reducir responsabilidades de `js/app.js`.
- Crear contratos por módulo.
- Separar UI, lógica, estado y persistencia.
- Crear pruebas manuales repetibles.

### Fase 3 — Build moderno

Cuando la app esté estable:

- Evaluar Vite como base moderna de desarrollo.
- Mantener compatibilidad con módulos existentes.
- No reescribir toda la app de golpe.

### Fase 4 — React / UI profesional

React puede ser útil para:

- Componentes visuales reutilizables.
- Suite Pro como panel profesional.
- Modales y herramientas internas.
- Dashboard de compositor.
- Mejor experiencia móvil.

Pero React debe entrar después de estabilizar la lógica, no antes.

---

## Comandos de diagnóstico conocidos

### Arrangement

```js
Studio936DebugArrangement()
```

Debe confirmar:

- Arreglo existente.
- Índice válido.
- Sección activa coherente.
- Estado `isValid: true`.

### Suite Pro

```js
Studio936DebugSuite()
```

Debe confirmar, si existe:

- `suiteExists: true`
- Clase de apertura activa.
- Botón cerrar presente.
- Botones internos presentes.
- Conteo esperado de botones.
- Display/visibility/opacity coherentes.

---

## Prompt recomendado para Codex / GPT de programación

Usar prompts pequeños y restrictivos.

Ejemplo para diagnóstico visual de Suite Pro:

```txt
Repo: IPUZTechnology/Studio936-Composer
Branch: refactor/js-modules

Task:
Diagnose Suite Pro visible DOM.

Context:
Suite Pro button opens the #v18Suite panel. The panel should show title, close button and 15 internal tool buttons. Current manual test result: [pegar resultado real].

Goal:
Determine whether Suite Pro content exists in DOM but is hidden, or whether content is not being created.

Rules:
- Do not change behavior.
- Do not touch MIDI, transport, arrangement, playback, editor.
- Report only unless a one-line CSS fix is obvious.

Inspect:
- #v18Suite
- .v18-suite-inner
- .v18-suite-buttons
- .v18-pill
- #v18SuiteClose
- computed display/visibility/opacity/transform/z-index
- body.v25ux-clean CSS rules

Create:
docs/suite-pro-visibility-debug.md

Include:
- DOM state
- CSS state
- exact reason why content is not visible
- smallest safe fix
```

---

## Próximo paso recomendado

1. Confirmar el PR activo más reciente de Suite Pro.
2. Probarlo en incógnito.
3. Confirmar si:
   - el panel abre,
   - el botón cerrar aparece,
   - el título aparece,
   - los 15 botones aparecen,
   - no se duplican.
4. Si la visibilidad está estable, iniciar auditoría funcional botón por botón.
5. No tocar transport ni MIDI hasta terminar esta fase.

---

## Filosofía de desarrollo

Studio 936 Composer no debe crecer como una masa de parches.

Debe crecer como una consola musical viva:

- Núcleo estable.
- Módulos claros.
- Funciones comprobables.
- UI expresiva.
- Tecnología al servicio de la emoción musical.

**Resonancia asegurada.**
