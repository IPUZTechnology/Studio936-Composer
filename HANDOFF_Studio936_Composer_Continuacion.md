# HANDOFF · Studio 936 Composer
## Continuación del proyecto · Estudio 936

**Avatar:** Resonante 936 · El Alquimista Resonante  
**Mantra:** Que todo suene luz.  
**Estado:** trabajo activo de modularización, Editor Instrumental y reorganización de Suite Pro.

---

## 1. Contexto general

Estamos trabajando sobre **Studio 936 Composer**, una aplicación web musical para componer, estructurar, editar instrumentos, practicar, arreglar, documentar y producir canciones.

La prioridad actual no es rehacer desde cero, sino:

1. Estabilizar lo ya construido.
2. Separar responsabilidades.
3. Hacer visibles los cambios acordados.
4. Reducir progresivamente `app.js`.
5. Preparar el sistema para una futura migración parcial a React.
6. Crear una experiencia de composición y producción tipo estudio real.

---

## 2. Estado actual de versiones

El usuario subió un ZIP completo del repositorio actual:

```txt
Studio936-Composer-refactor-js-modules.zip
```

Se auditó el proyecto. Hallazgos principales:

```txt
app.js ≈ 3.501 líneas
app.js ≈ 248 KB
≈ 384 funciones
≈ 94 listeners
≈ 7 MutationObservers
```

El problema central no era falta de módulos, sino exceso de autoridad compartida sobre:

```txt
#pianoContainer
#fretboardContainer
#s936EditorGuitarSurface
#instrumentSelect
```

### Paso 3 aprobado

Se creó el **Instrument Surface Manager**:

```txt
js/core/instrument-surface-manager.js
```

Después de hotfixes, el usuario confirmó que los cuatro botones iniciales funcionaban:

```txt
Piano | Guitarra | Ukelele | Bajo
```

### Editor Instrumental ampliado

Se creó:

```txt
v0.7.1 — Editor Instrumental Pro
```

con barra:

```txt
PIANO | GUITARRA | UKELELE | BAJO | G. LEAD | BATERÍA
```

Módulos nuevos:

```txt
js/suite-pro-sequencer-core.js
js/suite-pro-lead-line.js
js/suite-pro-drum-composer.js
```

Luego:

```txt
v0.7.1.1 — Hotfix Batería Pro
v0.7.1.2 — Drum Performance Surface
js/suite-pro-drum-surface.js
```

### Estado actual según última prueba

- La **Batería** se ve mucho mejor y tiene kit visual.
- **Guitarra Lead** se ve bien, pero **no tiene sonido todavía**.
- Al elegir **Bajo, G. Lead o Batería**, a veces se esconden los botones de otros instrumentos.
- Los menús desplegables en dock se abren hacia la derecha y no encima del campo.
- La batería debe permitir **grabar patrones desde el kit visual**.
- Se quiere avanzar con mejoras visibles, pero sin perder estabilidad.

---

## 3. Regla de trabajo acordada

El usuario pidió respuestas cortas y avanzar sección por sección.

Método:

1. El usuario da observaciones.
2. El asistente las anota corto.
3. No programar inmediatamente.
4. Agrupar por sección.
5. Crear plan claro.
6. Entregar versiones pequeñas con archivos exactos.

Orden recomendado:

```txt
1. Main / Panel principal
2. Compose
3. Editor Instrumental
4. Estructura
5. Arrange
6. Studio
7. Library / Export
8. Banco de acordes y escalas
```

---

## 4. Prioridades inmediatas

Próxima versión sugerida:

```txt
v0.7.1.3 — Editor Navigation & Live Instruments
```

Debe incluir:

1. Barra persistente de seis instrumentos.
2. Regreso desde Bajo, G. Lead y Batería sin recargar.
3. Sonido real para Guitarra Lead.
4. Desplegables contenidos dentro del dock.
5. Grabación por pasos desde kit de batería.
6. Primera grabación en vivo con cuantización.
7. Mantener intacto el diseño visual de Batería.

---

## 5. Main / Panel principal

El usuario quiere darle mucha importancia al **Main**.

Debe evolucionar hacia la verdadera superficie de práctica, ejecución y visualización:

- Instrumento grande.
- Groove.
- Transporte.
- Acorde actual.
- Sección actual.
- Compás.
- Karaoke.
- Notas animadas.
- Visualización real de cada instrumento.
- Menos botones legacy.
- Panel superior más limpio.

Piano principal funciona bien y se debe conservar.

Problemas actuales:

- Guitarra principal muestra notas distribuidas como piano, no digitación real.
- Ukelele tiene el mismo problema y sonido poco natural.
- Bajo eléctrico a veces deja piano pegado o no muestra un bajo real.
- Saxofón está pendiente de definir.
- Durante groove/playback, solo piano anima correctamente.

---

## 6. Compose

Orden deseado:

```txt
Estructura
Editor Instrumental
REC & Idea
Plantillas
Escalas
Transponer
Teoría
Acordes guía
```

Notas:

- Quitar redundancia de títulos como “Compose / Composición Pro”.
- Compactar headers.
- Explicaciones largas a tooltip o ayuda.
- Ganar espacio vertical.
- Plantillas más limpias.
- Agregar estilos: Bossa nova, Bolero, Salsa y otros.
- Plantillas por acordeón/categorías.

---

## 7. Estructura

La estructura actual gusta mucho y no se quiere rediseñar de fondo.

Mejoras:

- Compactar zona superior.
- Evitar que el header robe espacio al arreglo central.
- Aclarar funciones:
  - **Aplicar estructura** = aplicar la estructura visible a la canción actual.
  - **Guardar estructura** = guardar como plantilla reutilizable.
  - **Cargar estructura** = cargar plantilla.
  - **Releer canción** = leer proyecto actual y reconstruir borrador.

No rehacer la estructura otra vez.

---

## 8. Editor Instrumental

Debe ser el corazón de Compose:

```txt
Piano
Guitarra rítmica
Ukelele
Bajo
Guitarra Lead / Solo
Batería
```

### Piano

Aprobado por ahora.

Tiene bajos de mano izquierda:

```txt
Mano izquierda · Bajos
Notas: C2 C3
Modo: simultáneo / alternado / patrón
```

Mano derecha conserva acorde completo:

```txt
E3 G3 B3 D4
```

### Guitarra

Aprobada visualmente como constructor de digitaciones.

Luego debe animarse durante groove y mostrar digitación real en Main.

### Ukelele

Debe seguir el modelo de guitarra, con cuatro cuerdas.

### Bajo

Bass Line Pro aprobado conceptualmente:

- Fundamental.
- Escala.
- Patrones.
- Timeline.
- Escritura desde cuello.
- Guardado por sección.

### Guitarra Lead / Solo

Debe ser línea melódica por sección:

- Escala.
- Fundamental.
- Motivos.
- Follow chords.
- Notas.
- Silencios.
- Duraciones.
- Escritura desde cuello.
- Sonido de guitarra lead.
- Timeline.
- Guardado por sección.

Pendiente actual: **no suena**.

### Batería

Debe estar en Editor para componer patrones.

Debe incluir:

- Bombo.
- Caja.
- Hi-hat cerrado.
- Hi-hat abierto.
- Tom alto.
- Tom medio.
- Tom piso.
- Crash.
- Ride.
- Percusión.
- Activación por pieza.
- Mute.
- Solo.
- Volumen.
- Secuenciador de 16 pasos.
- Kit visual interactivo.
- Grabación por pasos.
- Grabación en vivo.
- Cuantización.

La batería visual quedó genial, pero falta grabar patrones directamente desde ella.

---

## 9. Arrange

Arrange debe ser el lugar de documentación musical:

```txt
Mapa Maestro
Letra / TAB
Lead Sheet
Partitura
PDF
Impresión
Documentos para músicos
```

Mapa Maestro probablemente debe vivir en Arrange.

La edición real de estructura queda en Compose.

Letra/TAB legacy se ve mejor que la nueva; revisar antes de reemplazar.

---

## 10. Studio

Studio debe rediseñarse como consola de canales tipo GarageBand.

Canales:

```txt
Piano
Guitarra
Ukelele
Bajo
Guitarra Lead
Batería
Micrófono / Audio
MIDI
```

Controles por canal:

- ON/OFF.
- Mute.
- Solo.
- Volumen.
- Pan L/R.
- Ganancia.
- EQ.
- Compresión.
- Reverb.
- Delay.
- Saturación/distorsión.
- Medidor.

Studio no compone patrones; Studio mezcla y produce.

`REC & Idea` debe pasar a Compose.

MIDI debe ser panel compacto dentro de Studio:

```txt
MIDI / Dispositivos
```

Funciones tipo `432 / 440 / 444 Hz`, ruteo y monitoreo pertenecen a Studio.

---

## 11. Library y Export

Centro único de exportación:

- JSON.
- TXT.
- MIDI.
- Paquete de proyecto.
- Copiar canción.
- Futuro audio/stems.

PDF e impresión salen desde Arrange usando servicio central.

Library debe ser biblioteca real de:

- Canciones.
- Versiones.
- Ideas.
- Grabaciones.
- Metadata.
- Tags.
- Fechas.
- Restaurar.
- Duplicar.
- Exportar.

---

## 12. Chord & Scale Library

Confirmado como muy importante.

Actualmente existe parte:

- acordes en canción;
- voicings;
- algunas memorias por instrumento;
- escalas usadas por Bajo y Lead.

Falta módulo formal:

```txt
Chord & Scale Library
```

Debe incluir:

- Acordes base.
- Inversiones.
- Extensiones.
- Tensiones.
- Escalas.
- Modos.
- Relación acorde/escala.
- Voicings de piano.
- Digitaciones de guitarra.
- Digitaciones de ukelele.
- Líneas/patrones de bajo.
- Motivos de lead.
- Compatibilidad tonal.
- Sugerencias armónicas.

Clave para transposición, generación de patrones, solos, bajo, guitarra, ukelele, teoría y plantillas.

---

## 13. Biblioteca de instrumentos y patrones

Plan futuro:

- No meter samples en `app.js`.
- Crear biblioteca independiente.

Módulos futuros:

```txt
instrument-library.js
sample-loader.js
sampler-engine.js
pattern-library.js
audio-cache.js
```

Fuentes posibles con revisión de licencia:

- WebAudioFont.
- Philharmonia samples.
- University of Iowa Musical Instrument Samples.
- FreePats.
- Freesound solo CC0 o licencias claras.

Patrones como datos musicales:

- Rock.
- Pop.
- Funk.
- Bossa.
- Bolero.
- Salsa.
- Reggae.
- Cumbia.
- Worship.
- Jazz.

---

## 14. React

React no debe entrar todavía.

Arquitectura futura:

```txt
React = capa visual
Project Store = estado
Playback Event Bus = reloj/eventos
Surface Manager = superficies
Audio Engine = sonido
```

Regla:

> React no debe ser dueño de la canción, ni del reloj musical, ni del motor de audio.

Antes de React separar:

```txt
Project Store
Surface Manager
Playback Event Bus
Main Workspace
Servicios
```

---

## 15. app.js

Objetivo final:

```txt
app.js
├─ crear servicios
├─ cargar proyecto
├─ inicializar Main
├─ inicializar Suite Pro
├─ registrar adaptadores temporales
└─ manejar errores globales
```

No debe contener:

- render de instrumentos;
- Bass Line;
- Editor;
- patrones;
- UI de Suite Pro;
- lógica de acordes;
- exportaciones.

---

## 16. Regla de entregas

Cada paquete debe incluir:

- ZIP.
- Carpeta `UPLOAD_TO_GITHUB`.
- Lista exacta de archivos.
- Rollback si es necesario.
- Validación de sintaxis.
- Guía de prueba corta.
- Cambios pequeños.

Evitar paquetes gigantes.

---

## 17. Próximo paso sugerido

Comenzar nuevo chat con:

```txt
Continuar desde HANDOFF Studio 936 Composer.
Necesitamos v0.7.1.3 — Editor Navigation & Live Instruments.
```

Objetivo inmediato:

1. Barra persistente de seis instrumentos.
2. Bajo, Lead y Batería no pueden esconder botones.
3. Guitarra Lead debe sonar.
4. Menús desplegables contenidos dentro del dock.
5. Batería grabable desde kit visual:
   - grabación por pasos;
   - primera grabación en vivo con cuantización.
6. No tocar Piano, Guitarra rítmica, Ukelele ni Bass Line Pro si no es necesario.

---

## 18. Estilo de trabajo pedido

- Respuestas cortas.
- Ir sección por sección.
- Confirmar antes de programar.
- No alejar la meta.
- Cambios visibles.
- Mantener lo aprobado.
- No rehacer estructura.
- Proteger el trabajo existente.

---

Que todo suene luz.  
Resonancia asegurada.
