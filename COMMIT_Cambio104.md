# Cambio 104 — El Chart ahora SÍ toca batería (motor real de Main)

## El bug real
Revisé el reproductor de práctica del Chart línea por línea: toca bajo,
acordes, arpegio y un click de metrónomo — **pero jamás dispara batería**.
Ni una sola llamada a percusión en todo el archivo. Mientras tanto, el
groove real de Main (`scheduleStep` en `app.js`) llama a
`scheduleSongDrums(...)` en cada paso, con el kit y patrón real de
batería por sección/estilo.

Esto explica exactamente lo que describiste: "sin batería buena, sin
groove" — no es un tema de calidad de sonido, es que **no hay batería
sonando en absoluto** desde el Chart.

## El arreglo
**Archivos:** `js/app.js` + `js/suite-pro-chart-v260-cambio100.js`
(mismo nombre de Chart, se reemplaza)

1. **`app.js`** — nuevo método en el Bridge:
   ```js
   Studio936AppBridge.scheduleDrumStep(sectionKey, step, when)
   ```
   Es un envoltorio directo sobre `scheduleSongDrums()`, la función REAL
   de batería de Main — mismo kit, mismo patrón, mismas velocidades.
   Nada nuevo inventado.

2. **`chart.js`** — nueva función `playEngineDrumStep()` (mismo patrón
   defensivo que `playEngineClick`/`playEngineNote`), llamada una vez por
   cada dieciseisavo dentro del groove de práctica — así la batería suena
   en el mismo pulso que el bajo/acordes/arpegio, ya sincronizada.

Versión del bridge: `suite-pro-bridge-v0.7.3.15-cambio104-drums`.
Badge del Chart: `CHART CAMBIO 104`.

## Sobre "a veces vi que tocaban dos otra vez"
No encontré una causa nueva para esto con la evidencia que tengo — puede
haber sido un momento de prueba mientras iterábamos, o puede ser un caso
real distinto al que ya cerramos (Cambio 101: Chart detiene a Main). Si
lo vuelves a ver, dime el orden EXACTO de botones que presionaste (cuál
primero, cuál segundo) — con eso lo reproduzco y lo cierro con la misma
evidencia que venimos usando.

## Qué NO se tocó
`structure.js`, `compose.js`, `suite-pro.js`, `midi.js`.

## Prueba manual sugerida
1. Estilo bien marcado en Main (ej. "Reggae" o "Funk").
2. Estructura → "▶ Sesión".
3. Ahora debe sonar **con batería real** (kick/snare/hihat del patrón de
   ese estilo), no solo bajo/acordes.
4. Compara de oído con "Start Groove" en Main — deberían sentirse
   equivalentes en groove/pegada.
