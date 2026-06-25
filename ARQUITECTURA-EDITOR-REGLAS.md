# Studio 936 Composer — Reglas de Arquitectura del Editor
## Bug raíz documentado · v0.7.5.5 / v1.1.4

---

## El bug que se repitió 20+ veces

### Síntoma
Al abrir el Editor en Piano o Batería, el panel izquierdo mostraba guitarra.

### Causa raíz — `suite-pro-string-instruments.js`

```javascript
// ❌ CÓDIGO ORIGINAL — fallback incorrecto
function canonicalInstrumentId(id) {
  // ...aliases...
  return PROFILES[value] ? value : "guitar"; // piano → "guitar"
}

function isStringInstrument(id) {
  return !!PROFILES[canonicalInstrumentId(id)]; // isStringInstrument("piano") → true ❌
}
```

`piano` y `drums` no existen en `PROFILES` (que solo tiene `guitar`, `lead`, `ukulele`, `bass`).
El fallback `"guitar"` hacía que cualquier instrumento desconocido fuera tratado como guitarra.

### Fix aplicado — v1.1.4

```javascript
// ✅ CÓDIGO CORRECTO
function canonicalInstrumentId(id) {
  // ...aliases...
  return PROFILES[value] ? value : null; // piano → null, drums → null
}
// isStringInstrument("piano") → false ✅
// isStringInstrument("drums") → false ✅
// isStringInstrument("guitar") → true ✅
```

### Causa secundaria — `suite-pro-editor.js`

```javascript
// ❌ state residual ganaba sobre data.instrument
const requestedInstrument = canonicalInstrumentId(
  state.panelInstrument || state.instrument || data.instrument
);
// Si state tenía "guitar" de sesión anterior → siempre renderizaba guitarra

// ✅ data.instrument es la fuente de verdad
const requestedInstrument = canonicalInstrumentId(
  (state._userPicked ? state.panelInstrument : null) || data.instrument
);
// state solo gana si el usuario clickeó un botón en esta sesión (_userPicked)
```

---

## REGLAS — No romper estas invariantes

### 1. `suite-pro-string-instruments.js`
- `PROFILES` contiene SOLO instrumentos de cuerda: `guitar`, `lead`, `ukulele`, `bass`
- `canonicalInstrumentId()` debe retornar `null` para cualquier id no reconocido
- **NUNCA** cambiar el fallback de `null` a `"guitar"` u otro instrumento
- `isStringInstrument("piano")` → siempre `false`
- `isStringInstrument("drums")` → siempre `false`

### 2. `suite-pro-editor.js` — fuente de verdad del instrumento
- `data.instrument` (viene de `app.js → getEditorState()`) es la fuente de verdad
- `state.panelInstrument` solo tiene prioridad cuando `state._userPicked === true`
- `state._userPicked` se activa SOLO en el click handler de los botones del Editor
- `state._userPicked` arranca en `false` en cada nueva instancia

### 3. `app.js` — NO tocar
- `getEditorState()` resuelve `instrument` correctamente desde `project.instrument`
- `setEditorInstrument()` actualiza `editorInstrument` y llama `mountEditorInstrumentSurface()`
- `mountEditorInstrumentSurface()` maneja correctamente piano y drums por separado

### 4. Separación Surface Router vs Panel Router
- **Surface Router** (derecha): controlado por `instrument-surface-manager.js` + `app.js`
- **Panel Router** (izquierda): controlado por `suite-pro-editor.js → paint()`
- Son independientes. Nunca mezclar su lógica.

---

## Checklist antes de modificar el Editor

- [ ] ¿`isStringInstrument("piano")` sigue siendo `false`?
- [ ] ¿`isStringInstrument("drums")` sigue siendo `false`?
- [ ] ¿El fallback de `canonicalInstrumentId` sigue siendo `null`?
- [ ] ¿`data.instrument` sigue siendo la fuente de verdad en `paint()`?
- [ ] ¿`state._userPicked` se resetea al inicializar?

Verificar en consola después de cualquier cambio:
```javascript
const SI = window.Studio936StringInstruments;
console.assert(SI.isStringInstrument("piano") === false, "FALLO: piano es string instrument");
console.assert(SI.isStringInstrument("drums") === false, "FALLO: drums es string instrument");
console.assert(SI.isStringInstrument("guitar") === true, "FALLO: guitar no es string instrument");
console.assert(SI.canonicalInstrumentId("piano") === null, "FALLO: piano no retorna null");
```

---

## Pendiente (próximas versiones)

1. **Guitarra/Ukelele en Editor**: los acordes de la sección deben mostrarse al abrir,
   sin necesitar click en el instrumento. Actualmente solo aparecen al interactuar con el mástil.

2. **Sincronización Editor ↔ Main**: al seleccionar un instrumento en el Editor,
   el Main debería cambiar también para poder escuchar la sección en edición.

---

*Última actualización: v0.7.5.5 · Resonancia asegurada.*

---

## Bug 2 documentado · Charts Guitar/Ukelele no aparecen al abrir · v0.7.5.9

### Síntoma
Al abrir el Editor en Guitarra o Ukelele, los charts de acordes de la sección
aparecían un instante y desaparecían. Solo quedaban al tocar el mástil.

### Causa raíz — secuencia de eventos en `app.js`

```
mountEditorInstrumentSurface(value)
  → showEditorInstrument(value)      ← borra DOM con clearEditorStrings()
  → enforce()                        ← rerenderiza SIN seq → charts vacíos
  → setTimeout(showEditorChordVisual) ← llega tarde, enforce() ya borró todo
```

El `setTimeout(0)` llegaba DESPUÉS de que `enforce()` ya había rerenderizado
la superficie sin `seq`. `lastStringRender` quedaba con `options` sin `seq`
→ cada `enforce()` posterior reproducía el render vacío.

### Fix aplicado — v0.7.5.9

```javascript
// ❌ ANTES — setTimeout llegaba tarde
InstrumentSurfaceManager.showEditorInstrument(value);
setTimeout(() => { showEditorChordVisual({...}); }, 0);

// ✅ AHORA — renderEditorStrings directo y síncrono
InstrumentSurfaceManager.renderEditorStrings({
    instrument: value,
    data: { seq, seqVoicings, exactFrets, exactMidis, ... },
    profiles, sectionNames, onCellPlay, renderer
});
```

`renderEditorStrings` guarda `lastStringRender` con `seq` ANTES de que
`enforce()` corra → charts persisten en todos los rerenders posteriores.

### Regla
**NUNCA usar `setTimeout` para pasar datos al StringSurface después de montar.**
El ISM llama `enforce()` sincrónicamente y borra cualquier DOM pendiente.
Siempre usar `renderEditorStrings` directamente con todos los datos necesarios.

---

## Bug 3 documentado · onCellPlay no pasaba al renderer · v0.7.4.8

### Síntoma
Tocar el mástil en el Editor no producía sonido.

### Causa raíz — `instrument-surface-manager.js`

```javascript
// ❌ ANTES — onCellPlay no estaba en la firma ni en options
function renderEditorStrings({ instrument, data, profiles, sectionNames, renderer }) {
    const options = { container, owner, data, profiles, sectionNames }; // onCellPlay ausente
    renderer.render(options); // callback de audio descartado silenciosamente
}

// ✅ AHORA
function renderEditorStrings({ ..., onCellPlay, onChordSelect, renderer }) {
    const options = { ..., onCellPlay, onChordSelect };
    renderer.render(options);
}
```

### Regla
**Cualquier callback que necesite el StringSurface debe pasar explícitamente
por la firma de `renderEditorStrings` en el ISM.**
El ISM es el único punto de entrada al renderer — los callbacks no llegan
de ninguna otra forma.
