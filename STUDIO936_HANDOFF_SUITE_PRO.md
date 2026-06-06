# Studio 936 — Handoff de Suite Pro

## Estado actual
Suite Pro está modularizado y la aplicación principal continúa usando `js/app.js` como motor central/bridge.

### Módulos aprobados o estables por ahora
- `js/suite-pro.js` — núcleo/coordinador de Suite Pro.
- `js/suite-pro-practice.js` — Practice Pro.
- `js/suite-pro-drums.js` — Drums Pro.
- `js/suite-pro-mixer.js` — Mixer Pro.
- `js/suite-pro-recorder.js` — REC Idea Pro.
- `js/suite-pro-midi.js` — MIDI IN Pro.
- `js/suite-pro-compose.js` — coordinador de Compose.
- `js/suite-pro-structure-v403.js` — Estructura/ADN actual.

## Reglas estrictas
- No tocar `js/suite-pro-practice.js`.
- No tocar `js/suite-pro-drums.js`.
- No tocar `js/suite-pro-mixer.js`.
- No tocar `js/suite-pro-recorder.js`.
- No tocar `js/suite-pro-midi.js`.
- No tocar `js/app.js` salvo que se acuerde expresamente un bridge.
- No tocar `css/styles.css`.
- Un cambio por vez.
- Cada módulo debe permanecer separado.

## Cambio más reciente: Estructura v4.0.3
Objetivo: cambio visual únicamente.

Se hizo:
- Cabecera superior más delgada.
- Se quitaron el título repetido “ADN de la canción”, su explicación, métricas grandes y chips repetidos de la forma.
- Se conservaron título, ritmo/estilo, tempo, crear parte, aplicar, releer, guardar y cargar.
- El arreglo sube en pantalla.
- Cada fila usa disposición horizontal:
  - número,
  - nombre/tipo/compases,
  - acordes amplios,
  - acciones.
- El botón `Editar parte` conserva la lógica actual; no se rediseñó el editor.

Archivos que se deben subir:
- `index.html` desde `index.structure-v403.html`
- `js/suite-pro-structure-v403.js`

El `index.html` carga:
```html
<script src="js/suite-pro-structure-v403.js?v=403"></script>
```

## Próximo tema importante
Definir el Editor modular de Compose.

El editor anterior es valioso porque permite:
- seleccionar sección y acorde,
- definir nombre, bajo, notas y compases,
- crear/duplicar/borrar acordes,
- escuchar acordes,
- ver piano,
- ver guitarra/ukelele,
- mostrar mapa real de notas.

No reconstruirlo como formulario pequeño. La ruta propuesta es:
- crear `js/suite-pro-editor.js`,
- copiar/migrar la lógica del editor antiguo,
- abrirlo desde `Editar parte` con la sección correcta,
- probarlo,
- eliminar el editor antiguo solo después de validarlo.

## Caché
Se usan nombres físicos versionados (`v402`, `v403`) porque algunos navegadores/service workers mostraban archivos viejos.
