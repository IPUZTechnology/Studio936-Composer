# Studio 936 Composer

**Studio 936 Composer** es una aplicación web musical para componer, estructurar, editar, escuchar y exportar canciones desde el navegador.

La visión del proyecto es convertirse en una herramienta modular para el Estudio 936: un asistente de composición capaz de manejar estructura de canción, progresiones de acordes, letras, melodías, playback, exportaciones y una Suite Pro de herramientas avanzadas.

> Mantra del proyecto: **Que todo suene luz.**


---

# ACTUALIZACIÓN MAESTRA Y HANDOFF ACTUAL

**Fecha de corte:** 5 de junio de 2026  
**Objetivo de esta sección:** dejar un estado técnico vigente, verificable y utilizable para continuar en otro chat sin reconstruir toda la historia.

> **Regla de lectura:** esta actualización maestra tiene prioridad cuando exista una diferencia con el estado histórico conservado más abajo. El contenido original del README se mantiene íntegro para no perder contexto, diagnósticos, filosofía ni decisiones anteriores.

---

## Resumen ejecutivo vigente

Studio 936 Composer ya no tiene a Suite Pro como una carcasa visual pendiente. Suite Pro se convirtió en un frente modular real, con módulos separados, probados y evolucionados uno por uno.

La arquitectura actual sigue esta idea:

```txt
Aplicación principal
├─ motor central / proyecto / audio / transport
├─ módulos musicales históricos ya separados
└─ Suite Pro
   ├─ núcleo coordinador
   ├─ Mapa Maestro
   ├─ Compose
   │  ├─ coordinador de composición
   │  └─ Estructura / ADN modular
   ├─ Practice Pro
   ├─ Studio
   │  ├─ Drums Pro
   │  ├─ Mixer Pro
   │  ├─ REC Idea Pro
   │  └─ MIDI IN Pro
   ├─ Arrange
   └─ Export
```

La decisión principal es clara:

> **Ninguna zona nueva de Suite Pro debe volver a convertirse en un archivo monstruo.**

Cada función importante se trabaja como módulo independiente. El núcleo `suite-pro.js` debe coordinar, no absorber toda la lógica interna.

---

## Estado funcional vigente de Suite Pro

### Mapa Maestro

Estado: **funcional y aprobado como base visual principal**.

Logros:

- Resumen de título, autor, instrumento, tonalidad, BPM, partes, letras y solos.
- Mapa completo de la forma de la canción.
- Letra por sección.
- Acordes por sección.
- Vista instrumental:
  - Piano.
  - Guitarra.
  - Ukelele.
- Selección de posición por acorde para guitarra/ukelele.
- Exportación del Mapa Maestro a PDF.
- El PDF incluye estructura, letra, acordes y diagramas visuales instrumentales.
- Botones útiles hacia Arrange, Lead Sheet y Export.
- Se eliminó una sección visual repetida para compactar la vista.

Regla:

- No rehacer el Mapa Maestro mientras se trabaja Compose.
- Solo tocarlo con una solicitud explícita y aislada.

---

### Practice Pro

Archivo desplegado:

```txt
js/suite-pro-practice.js
```

Versión de referencia:

```txt
practice-v1.10.2
```

Estado: **modular, funcional y congelado por ahora**.

Logros:

- Karaoke en la parte superior.
- Tres líneas visibles de letra.
- Línea actual destacada.
- Acorde actual y siguiente acorde.
- Timeline de práctica.
- Loop de sección.
- Seguimiento visual de canción completa.
- Tempo de práctica.
- Selector separado entre:
  - sonido que se escucha;
  - instrumento cuya digitación se visualiza.
- Vistas:
  - Piano.
  - Guitarra.
  - Ukelele.
- Metrónomo dentro de Practice.
- Cabecera compactada para evitar colapso en pantallas pequeñas.
- Piano ajustado a:
  - bajo/octavas en mano izquierda;
  - triada o voicing de cuatro notas en mano derecha.
- Se mantuvo la base de guitarra/ukelele sin seguir alterándola.

Limitaciones conocidas:

- Los mapas de guitarra y ukelele todavía requieren un sistema futuro de voicings reales y digitaciones registradas.
- El seguimiento visual no reemplaza una sincronización de transporte de precisión.
- Para control real del motor hacen falta contratos claros del bridge.

Regla:

> No tocar `js/suite-pro-practice.js` salvo solicitud explícita. No mezclar cambios de Practice con Compose, Studio o Estructura.

---

### Drums Pro

Archivo:

```txt
js/suite-pro-drums.js
```

Versión de referencia:

```txt
drums-v1.2.2
```

Estado: **modular y aprobado por ahora**.

Logros:

- Selector de estilo.
- Selector de patrón.
- Patrones como:
  - Basic.
  - Groove.
  - Build.
  - Chorus.
  - Break.
- Matriz visual de 16 pasos:
  - Kick.
  - Snare.
  - Hi-Hat.
- Start / Stop.
- Groove + Drums.
- Stop todo.
- Volumen.
- Swing.
- Humanize.
- Sincronización de estilo con la canción principal.
- Primer modo Follow Structure.
- Limpieza de textos e información repetida.
- Eliminación del panel inferior “Uso musical” redundante.

Aclaración musical:

- Los 16 pasos representan semicorcheas de un compás 4/4.
- A 90 BPM el cursor recorre un compás aproximadamente cada 2.67 segundos, por lo que el avance visual puede parecer rápido.

Limitación conocida:

- Follow Structure no se ha considerado completamente validado en reproducción real. El usuario decidió dejarlo estable por ahora y continuar con otros módulos.

Regla:

> No tocar Drums al trabajar Mixer, Recorder, MIDI o Compose.

---

### Mixer Pro

Archivo:

```txt
js/suite-pro-mixer.js
```

Versión de referencia:

```txt
mixer-v1
```

Estado: **modular, aprobado y congelado por ahora**.

Logros:

- Corrigió el bug que duplicaba “Groove volumen” al mover el control.
- Canales visuales y operativos para:
  - Groove / instrumento.
  - Drums Pro.
  - Click / metrónomo.
  - Solo / melodía.
- Controles conectados a funciones existentes cuando están disponibles.
- Acceso a Drums sin modificar internamente el módulo de batería.
- Se mantuvo independiente de `app.js`.

Regla:

> No reabrir Mixer durante la migración de Compose salvo que exista un bug aislado y reproducible.

---

### REC Idea Pro

Archivo:

```txt
js/suite-pro-recorder.js
```

Versión de referencia:

```txt
recorder-v1.1-library
```

Estado: **modular y funcional**.

Logros:

- Editor de ideas con formato:
  - negrita;
  - cursiva;
  - listas;
  - encabezados;
  - limpieza de formato.
- Datos de la idea:
  - título;
  - tipo;
  - sección;
  - tags.
- Grabación de micrófono, guitarra o interfaz de audio mediante navegador.
- Start REC / Stop REC.
- Reproducción de toma.
- Guardado local.
- Banco de ideas.
- Descargar TXT.
- Descargar audio.
- Descargar pack de idea.
- Copiar texto.
- Borrar idea.
- Enviar idea a Library.
- Asociación lógica con:
  - canción;
  - sección;
  - tipo;
  - fecha;
  - tags;
  - referencia de audio.

Persistencia:

- El audio se guarda en IndexedDB.
- La Library guarda metadata y referencia.
- El audio no está embebido todavía dentro del JSON principal de la canción.

Limitación conocida:

- La portabilidad total de canción + audios asociados requerirá más adelante un pack/ZIP de proyecto o un sistema de archivos del proyecto.

---

### MIDI IN Pro / Audio Devices

Archivo:

```txt
js/suite-pro-midi.js
```

Versión de referencia:

```txt
midi-v1
```

Estado: **modular, funcional como centro de diagnóstico, pendiente de pruebas con hardware real del usuario**.

Logros:

- Detección Web MIDI.
- Selector de entrada MIDI.
- Selector de salida MIDI.
- Monitor de notas en vivo.
- Mini teclado visual.
- Comparación con acorde actual.
- Captura de ideas MIDI.
- Descarga TXT/JSON de captura.
- Exportación MIDI usando la función existente.
- Detección de dispositivos de audio.
- Listado de entradas y salidas.
- Diagnóstico de:
  - Flow 8;
  - Maono;
  - micrófonos;
  - otras interfaces.
- Test de entrada de audio con medidor.

Aclaración:

- Web MIDI detecta controladores o teclados MIDI.
- Flow 8 se detecta como interfaz de audio, no necesariamente como dispositivo MIDI.
- La grabación de guitarra o voz debe realizarse desde REC Idea seleccionando la entrada de audio disponible.

Limitaciones conocidas:

- No controla faders, EQ, compresor o ruteo interno de Flow 8.
- No se ha probado todavía con el Yamaha del usuario.
- Futuro ajuste recomendado: selector explícito de entrada de audio dentro de REC Idea.

---

## Compose: estado actual y arquitectura decidida

Archivo coordinador:

```txt
js/suite-pro-compose.js
```

Versión de referencia:

```txt
compose-v1.2-coordinator
```

Núcleo Suite Pro:

```txt
js/suite-pro.js
```

Versión de referencia del núcleo:

```txt
3.14
```

Compose dejó de plantearse como una sola pantalla con funciones mezcladas. Debe convertirse en la columna vertebral creativa de la aplicación.

Menú actual en español:

```txt
Plantillas
Inspiración
Transponer
Estructura
Editor
Acordes IA
Teoría
Escalas
```

Decisión de idioma:

- La interfaz de trabajo actual debe mantenerse en español.
- La internacionalización automática o por navegador se resolverá después mediante el módulo de i18n.
- No mezclar nombres en inglés y español dentro de un mismo nivel del menú.

Arquitectura objetivo:

```txt
js/suite-pro-compose.js       → coordinador
js/suite-pro-templates.js     → Plantillas
js/suite-pro-inspire.js       → Inspiración
js/suite-pro-transpose.js     → Transponer
js/suite-pro-structure-*.js   → Estructura / ADN
js/suite-pro-editor.js        → Editor musical integrado
js/suite-pro-chordai.js       → Acordes IA
js/suite-pro-theory.js        → Teoría
js/suite-pro-scales.js        → Escalas
```

No todos esos archivos existen todavía. La separación comenzó por Estructura porque es el tablero donde nace la canción.

---

## Plantillas de Compose

Estado: **primera versión funcional creada; pendiente de revisión profunda por tab**.

Logros:

- Plantillas musicales como:
  - Studio Pop.
  - Worship Rise.
  - Funk Light.
  - Rock Anthem.
  - Latin Coro.
  - Jazz Color.
- Datos por plantilla:
  - BPM;
  - estilo;
  - forma;
  - progresiones;
  - intención.
- Preview.
- Copiar.
- Descargar TXT.
- Aplicar a canción.
- Backup local antes de reemplazar.
- Conservación de datos principales cuando corresponde.

Regla futura:

- Plantillas debe permanecer como módulo independiente.
- Aplicar una plantilla siempre debe:
  1. mostrar preview;
  2. confirmar reemplazo;
  3. guardar respaldo;
  4. escribir en el proyecto central.

---

## Estructura / ADN de la canción

Archivo físico actual:

```txt
js/suite-pro-structure-v403.js
```

Versión:

```txt
structure-v4.0.3
```

Carga actual en `index.html`:

```html
<script src="js/suite-pro-structure-v403.js?v=403"></script>
```

Razón del nombre físico versionado:

- Algunos navegadores y posiblemente un service worker mostraban versiones anteriores.
- Cambiar únicamente `?v=` no siempre fue suficiente.
- Se adoptó temporalmente un nombre físico nuevo para romper caché de forma inequívoca.

Estado: **módulo propio, conectado al mismo proyecto central que la estructura histórica**.

Esto significa:

```txt
Estructura histórica ─┐
                      ├─ Proyecto central
Estructura Suite Pro ─┘
```

Por eso un cambio aplicado desde la estructura nueva también aparece en la antigua.

### Logros funcionales de Estructura

- Lee la forma actual de la canción.
- Trabaja con un borrador.
- Aplica la estructura al proyecto central.
- Relee la canción.
- Guarda estructura como JSON independiente.
- Carga una estructura guardada.
- Define:
  - título;
  - ritmo/estilo;
  - tempo.
- Crea nuevas partes con:
  - tipo;
  - nombre visible;
  - número de compases.
- Muestra el arreglo completo.
- Permite:
  - subir;
  - bajar;
  - duplicar;
  - renombrar;
  - editar parte;
  - quitar.
- Muestra acordes como chips.
- Duplicar crea una copia independiente que después puede renombrarse y editarse.
- La estructura puede reutilizar el mismo proyecto central sin eliminar todavía el módulo histórico.

### Último cambio visual: v4.0.3

Objetivo: ganar espacio vertical y mostrar el arreglo de inmediato.

Se hizo:

- Cabecera superior más delgada.
- Eliminación del gran bloque vacío lateral.
- Eliminación del título repetido “ADN de la canción” y su explicación.
- Eliminación de métricas grandes.
- Eliminación de la fila repetida de chips de forma.
- Conservación de:
  - título;
  - estilo;
  - tempo;
  - crear parte;
  - aplicar;
  - releer;
  - guardar;
  - cargar.
- Arreglo ubicado más arriba.
- Filas de arreglo horizontales.
- Acordes ampliados en el centro de cada fila.
- Acciones conservadas a la derecha.
- No se cambió la lógica del botón `Editar parte`.

### Limitación actual de Estructura

El editor interno básico de `Editar parte` no reemplaza todavía el editor musical profesional histórico.

Ese editor profesional permite:

- seleccionar sección;
- seleccionar acorde;
- definir nombre;
- definir bajo;
- definir notas;
- definir compases;
- escuchar acorde;
- aplicar;
- agregar;
- duplicar;
- borrar;
- ver piano;
- ver guitarra/ukelele;
- ver mapa instrumental real.

Por tanto:

> No reducir el editor profesional a un formulario pequeño dentro de Estructura.

---

## Próximo gran módulo: Editor Pro de Compose

Archivo futuro recomendado:

```txt
js/suite-pro-editor.js
```

Objetivo:

- Migrar/copi ar la lógica valiosa del editor histórico.
- Abrir el editor desde una parte concreta del arreglo.
- Mantener contexto de sección.
- Mostrar acordes de esa sección.
- Permitir construcción nota por nota.
- Mantener piano y vista instrumental.
- Escuchar cambios.
- Aplicar al proyecto central.
- Probar la nueva versión antes de eliminar la antigua.

Flujo esperado:

```txt
Compose → Estructura → Editar parte
→ abre Editor Pro
→ carga la sección elegida
→ edita acordes, bajo, notas y compases
→ aplica al proyecto central
```

Regla:

> El editor histórico no se elimina hasta que `suite-pro-editor.js` cubra y valide todas sus funciones.

---

## Arrange y migración de módulos históricos

Arrange todavía contiene accesos o funciones relacionadas con:

- Lead Sheet.
- Estructura.
- Letra/TAB.
- Editor.

Plan:

1. No eliminar todavía los módulos históricos.
2. Copiar o reconstruir lógica dentro de Suite Pro.
3. Probar que el módulo nuevo trabaja sobre el mismo proyecto central.
4. Comparar funciones.
5. Eliminar el acceso viejo solo cuando el nuevo cubra todo.

La estructura histórica es el primer caso de esta estrategia.

---

## Export

Estado actual:

- TXT.
- JSON.
- MIDI.
- PDF / Mapa Maestro.
- Funciones históricas de Exportar Flow todavía existen fuera de la consolidación final.

Plan:

- Mantener exportaciones funcionales.
- No moverlas hasta terminar Compose/Estructura/Editor.
- Más adelante consolidar Export y revisar si Exportar Flow debe desaparecer como módulo externo.

---

## Library

Estado actual:

- Snapshots de canción.
- Ideas REC enviadas a Library.
- Metadata de ideas asociadas a canción y sección.
- Referencias a audio local.

Pendiente:

- Verificar carga de composición completa.
- Verificar restauración de ideas asociadas.
- Diseñar exportación de proyecto con audio.
- Evitar confundir Library de canciones con banco de ideas.

---

## Archivos actuales de Suite Pro y orden de carga

El orden de scripts de Suite Pro debe mantenerse así:

```html
<script src="js/suite-pro-practice.js"></script>
<script src="js/suite-pro-drums.js"></script>
<script src="js/suite-pro-mixer.js"></script>
<script src="js/suite-pro-recorder.js"></script>
<script src="js/suite-pro-midi.js"></script>
<script src="js/suite-pro-structure-v403.js?v=403"></script>
<script src="js/suite-pro-compose.js"></script>
<script src="js/suite-pro.js"></script>
<script src="js/app.js"></script>
```

Razón:

- Los módulos externos se registran primero.
- Compose puede encontrar Estructura.
- Suite Pro puede encontrar todos los módulos.
- `app.js` queda al final como núcleo/bridge de la aplicación principal.

Exports globales de referencia:

```txt
window.Studio936SuitePro
window.Studio936SuiteProCompose
window.Studio936SuiteProStructure
window.Studio936SuiteProPractice
window.Studio936SuiteProDrums
window.Studio936SuiteProMixer
window.Studio936SuiteProRecorder
window.Studio936SuiteProMidi
window.Studio936SuiteProModules
```

---

## Legacy eliminado y legacy permitido

### Eliminado

```txt
js/pro-suite.js
```

Razón:

- Era el módulo hard-reset antiguo.
- Trabajaba sobre `#v18Suite`.
- Ya no era cargado por `index.html`.
- Competía conceptualmente con la Suite Pro moderna.

### Suite Pro moderna

```txt
js/suite-pro.js
```

Trabaja sobre:

```txt
#s936SuitePro
```

No debe volver a utilizar:

```txt
#v18Suite
```

### Qué puede quedar en `app.js`

Solo integración mínima:

- abrir Suite Pro;
- exponer bridge;
- leer/escribir proyecto central;
- llamar funciones reales de transporte/audio cuando exista contrato.

No debe volver a contener:

- UI interna de Suite Pro;
- panel viejo;
- botones internos;
- renderizadores completos;
- CSS de Suite Pro;
- lógica específica de Drums, Practice, Mixer, Recorder, MIDI, Compose o Estructura.

---

## Contrato de bridge recomendado

Para evitar clics indirectos y lógica frágil, el bridge debe evolucionar hacia funciones explícitas.

Ejemplos futuros:

```js
getSongSnapshot()
getProjectJson()
applyProject(project)
getCurrentSection()
selectSection(sectionKey)
getBpm()
setBpm(value)
getStyle()
setStyle(style)
isPlaying()
getTransportPosition()
playChord(notes, instrument)
setInstrument(instrument)
startGroove()
stopGroove()
startSong()
stopSong()
setMetronome(enabled)
getAudioDevices()
```

Regla:

> Ningún módulo debe fingir control real si el bridge no expone una función real.

---

## Reglas estrictas para continuar en otro chat

1. No tocar varios módulos al mismo tiempo.
2. Un cambio visual o funcional por versión.
3. Antes de generar código:
   - describir exactamente qué cambia;
   - indicar qué archivos se tocarán;
   - indicar qué archivos no se tocarán.
4. No tocar `js/app.js` sin aprobación explícita.
5. No tocar `css/styles.css` para resolver un problema de un módulo si el propio módulo puede inyectar estilos locales.
6. No tocar:
   - Practice al trabajar Compose;
   - Drums al trabajar Mixer;
   - Mixer al trabajar Recorder;
   - Studio al trabajar Estructura.
7. Mantener backups de versiones aprobadas.
8. Probar en navegador limpio.
9. Revisar primero la primera línea roja de consola.
10. No atribuir automáticamente un fallo a caché sin revisar el error real.
11. Cuando exista caché persistente:
    - cambiar query string;
    - si no basta, usar nombre físico nuevo.
12. No eliminar módulos históricos hasta validar el reemplazo.
13. No prometer control de audio/MIDI sin bridge o API real.
14. No generar archivos parciales cuando el usuario necesita archivos completos para subir.
15. Verificar JavaScript con:

```bash
node --check archivo.js
```

El comando anterior es una prueba interna de sintaxis. El usuario no necesita ejecutarlo.

---

## Estrategia de caché vigente

Problema observado:

- Chrome, Edge, incógnito y otros navegadores mostraban versiones distintas.
- `Ctrl + F5` no siempre resolvía.
- Se llegó a cargar una versión vieja de Estructura que llamaba `structureDiagnosis()` aunque la corrección ya existía.

Estrategia:

1. Subir el archivo correcto.
2. Cambiar query string:

```txt
?v=403
```

3. Si persiste:
   - usar nombre físico nuevo;
   - actualizar `index.html`.

Ejemplo actual:

```txt
js/suite-pro-structure-v403.js
```

No renombrarlo sin cambiar también `index.html`.

---

## Checklist de Suite Pro actualizado

### Apertura general

- Suite Pro abre.
- Suite Pro cierra.
- Dock funciona.
- Maximizar funciona.
- No se duplica.
- Módulos cargan sin error fatal.

### Mapa Maestro

- Muestra estructura.
- Muestra letra.
- Muestra acordes.
- Cambia piano/guitarra/ukelele.
- Exporta PDF.

### Practice

- Karaoke visible.
- Tres líneas.
- Acorde actual/siguiente.
- Timeline visible.
- Loop funciona visualmente.
- Sonido y vista instrumental están separados.
- No colapsa topbar en pantalla pequeña.

### Studio

- Drums abre.
- Mixer abre sin duplicar controles.
- Recorder guarda texto/audio.
- Recorder envía a Library.
- MIDI detecta APIs disponibles.
- Audio Devices lista entradas/salidas.

### Compose

- Menú en español.
- Plantillas abre.
- Inspiración abre.
- Transponer abre.
- Estructura abre.
- Estructura no deja Compose en blanco.
- Editor todavía no se considera migrado.
- Acordes IA abre.
- Teoría abre.
- Escalas abre.

### Estructura

- Título, estilo y BPM visibles.
- Crear parte.
- Aplicar.
- Releer.
- Guardar JSON de estructura.
- Cargar JSON de estructura.
- Ordenar partes.
- Duplicar.
- Renombrar.
- Quitar.
- Acordes legibles en horizontal.
- El arreglo aparece en la primera vista sin gran espacio vacío.

---

## Próximo orden de trabajo recomendado

### Paso inmediato

Validar visualmente:

```txt
Estructura v4.0.3
```

Confirmar:

- cabecera compacta;
- arreglo visible arriba;
- acordes horizontales;
- acciones intactas;
- no hay errores de consola.

### Después

Crear:

```txt
js/suite-pro-editor.js
```

### Luego separar Compose

Orden sugerido:

1. Editor.
2. Plantillas.
3. Inspiración.
4. Transponer.
5. Acordes IA.
6. Escalas.
7. Teoría.

### Después

Migrar Arrange:

- Lead Sheet.
- Letra/TAB.
- accesos históricos.
- eliminación progresiva de módulos externos redundantes.

### Finalmente

Consolidar Export y Library.

---

## Prompt de arranque para el próximo chat

```txt
Proyecto: Studio 936 Composer
Rama: refactor/js-modules

Lee primero README_Studio936_Composer actualizado.

Estado:
- Suite Pro moderna usa #s936SuitePro.
- pro-suite.js fue eliminado.
- app.js no debe tocarse sin aprobación.
- Practice, Drums, Mixer, Recorder y MIDI están modularizados y congelados.
- Compose usa suite-pro-compose.js como coordinador.
- Estructura actual está en js/suite-pro-structure-v403.js y el index la carga con ?v=403.
- La última versión compactó la cabecera y puso los acordes horizontalmente.
- El siguiente módulo es js/suite-pro-editor.js.

Reglas:
- Un cambio por vez.
- Antes de código, explicar qué archivo cambia.
- No tocar módulos aprobados.
- No eliminar el editor histórico hasta completar el reemplazo.
- No tocar transport/audio/MIDI sin necesidad.
- Entregar archivos completos.
```

---

# CONTENIDO HISTÓRICO ORIGINAL CONSERVADO

A partir de aquí se preserva íntegramente el README anterior. Contiene decisiones, diagnósticos, comandos, filosofía, riesgos y contexto histórico que siguen siendo valiosos. Cuando exista una contradicción de estado, prevalece la **Actualización Maestra y Handoff Actual** de la parte superior.


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
