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
