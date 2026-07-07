# Handoff — Studio 936 Composer / Suite Pro Compose

**Fecha:** 2026-07-05
**Corte:** Cambio 95
**Objetivo:** Continuar el proyecto en otro chat sin perder contexto.

---

## Estado resumido

Studio 936 Composer sigue con la arquitectura ya conocida:

```
Panel superior = canción completa
Dock izquierdo (Suite Pro) = consola por sección
Chart derecho = hoja electrónica musical, con karaoke
Zoom sección = estación de trabajo de una sección
Ly Letra = editor flotante tipo Chart
```

Desde el Cambio 50 (última foto documentada en el README maestro) hasta
hoy (Cambio 95) se resolvieron **~45 cambios**, la mayoría bugs reales
encontrados con evidencia concreta (no supuestos), más una decisión de
arquitectura importante para el futuro cercano.

---

## Archivos vigentes que deben quedar referenciados en `index.html`

```
index.html
js/suite-pro.js                          (Cambios 85-89, 95 — el dock)
js/suite-pro-structure-v489-cambio94.js   (Ly Letra + Zoom sección)
js/suite-pro-chart-v259-cambio94.js       (Chart + karaoke)
js/suite-pro-compose-v66-cambio50.js      (sin cambios desde Cambio 50)
js/suite-pro-midi.js                      (módulo real de MIDI, sin tocar)
```

**Importante:** `suite-pro.js` NO tiene número de versión en el nombre del
archivo — es el único así. No confundir con `suite-pro-compose-v66-...js`.

---

## Qué se logró en este ciclo (Cambios 51-95)

### Ly Letra — completado
- Editor flotante: pentagrama de altura de nota (1-4 notas por tiempo,
  soporta tresillo/cuatrillo), selector de duración con íconos SVG,
  guardado funcional con reflejo inmediato en el Chart.
- Tamaño y posición: se autoajusta a su contenido real (sin hueco vacío),
  ancho igual al del Chart, anclado al fondo de la ventana (deja ver los
  primeros compases arriba).
- Toolbar: 💾 Guardar y ⇢ Mover al tablero arriba (funcionando, con
  confirmación visual); se quitó la barra redundante de abajo.

### Chart / Karaoke — completado
- Letra visible bajo cada compás, alineada por tiempo real (grid de 4
  columnas, igual que la fila de acordes), sin verse como cuadrícula.
- Tamaño de letra más grande (1.6rem), con wrap seguro dentro de su propia
  columna si una palabra no cabe (no invade el tiempo vecino).
- El Zoom a una sección ya NO se recuerda entre visitas (Cambio 94) — cada
  recarga muestra la lista completa de secciones primero.

### Dock (Suite Pro) — completado
- Sin hueco vacío, sin doble barra de scroll (ni en modo normal ni MAX).
- Modo MAX ahora sí expande el ancho de verdad (antes reglas viejas de
  `structure.js` lo seguían achicando).
- Barra de scroll con estilo propio (teal/dorado con brillo), en vez de
  la gris genérica del navegador.
- Borde derecho (el que separa el dock del Chart) con brillo tipo
  consola, visible solo en modo normal (Cambio 95).

### Dashboard de herramientas (Zoom sección)
- **MIDI / Teclado**: ya NO es decorativo — abre de verdad el módulo real
  de MIDI IN (`js/suite-pro-midi.js`, bajo Studio), donde se puede
  conectar y usar un teclado MIDI real.
- Batería / Bajo-Groove / Pads / Arpegio-Ritmo / REC Voz / REC Instrumento:
  siguen siendo decorativos (disparan un evento sin escuchas) — pendiente
  de decidir cuál se habilita primero (REC Voz es el candidato más viable,
  usando `MediaRecorder` nativo del navegador, mismo patrón que MIDI).

---

## Decisión de arquitectura importante (pendiente de ejecutar)

El usuario trajo una auditoría externa (arquitecto/bot) proponiendo migrar
hacia una arquitectura limpia: `MainShell V1 → LegacyBridge → legacy actual`,
con un futuro `Studio936SuiteCore`. Se acordó un **reordenamiento**:

1. **Fase 0 (en progreso) — Limpieza de CSS duplicado real.** Los archivos
   `structure.js`/`chart.js`/`suite-pro.js` acumulan ~90 Cambios apilados,
   con selectores CSS repetidos hasta 19 veces (mismo selector, distintas
   épocas, muchos con `!important` peleando entre sí). Esto fue la causa
   raíz de varios bugs reales resueltos hoy (display:none viejo, doble
   scrollbar, anchos que no excluían modo MAX).
   - Se hizo un piloto exitoso: 15 selectores de `structure.js`
     consolidados matemáticamente (verificado por script, no a ojo).
   - **⚠️ Ese intento (Cambio 93) se subió y ROMPIÓ el menú lateral**
     (textos truncados a 2-3 letras) — se revirtió de inmediato al
     Cambio 91 (confirmado funcional). La causa exacta del bug de
     Cambio 93 **no se investigó a fondo todavía** — quedó pendiente.
   - Antes de reintentar la limpieza, hay que entender qué rompió
     exactamente el intento anterior (sospecha: el proceso de eliminar
     texto en medio del archivo corrompió una regla vecina no incluida
     en los 15 objetivos, probablemente relacionada al ancho de las
     pestañas del menú).
2. **Fase 1 — Contrato limpio (LegacyBridge).** Sin construir pantalla
   nueva todavía; solo definir `Studio936Bridge.play()`, `.stop()`, etc.
3. **Fase 2 — MainShell V1** (pantalla nueva opcional), recién sobre una
   base ya limpia y con contrato estable.
4. **Fase 3+ — Migración progresiva hacia un Core real.**

---

## Reglas de seguridad (sin cambios)

```
No tocar app.js sin permiso explícito (si se autoriza, avisar qué se toca).
No tocar Practice/Drums/Mixer/Recorder salvo tarea explícita.
No prometer audio/MIDI/grabación real sin bridge o API real.
No borrar legacy sin reemplazo validado.
Un cambio por versión — no mezclar muchos cambios en un solo paso.
Archivo completo, validado con node --check antes de entregar.
Nombres de archivo EXACTOS al entregar (sin prefijos como "1_", "2_" — un
  error de nombrado causó horas de confusión de despliegue en este ciclo).
```

---

## Lecciones aprendidas de este ciclo (importantes para no repetir)

1. **CSS duplicado/apilado es la causa raíz #1 de bugs silenciosos.** Cada
   vez que algo "no funciona sin razón aparente", buscar primero si hay
   una regla vieja con `!important` peleando con una nueva, antes de
   asumir que el código nuevo está mal.
2. **Los 3 módulos principales (`structure.js`, `chart.js`, `suite-pro.js`)
   no tenían badge de versión visible al principio de este ciclo.** Ahora
   los 3 lo tienen ("CAMBIO XX" en Ly Letra, "CHART CAMBIO XX" en el
   header del Chart, "DOCK CAMBIO XX" junto a "Suite Pro"). Mantener esto
   en cada cambio futuro — resolvió una confusión de horas sobre si un
   despliegue realmente había tomado efecto.
3. **Nunca entregar archivos con nombres decorados/prefijados** (ej.
   "1_suite-pro.js") — el usuario descarga en ZIP y sube tal cual; un
   prefijo causa que GitHub cree un archivo nuevo en vez de reemplazar el
   existente.
4. **Antes de asumir "no se desplegó", verificar en este orden:** (a)
   contenido fuente en GitHub vía Ctrl+F, (b) estado del despliegue en
   Actions, (c) referencia correcta en `index.html`, (d) respuesta REAL en
   la pestaña Network → Response (no solo el código fuente en GitHub) —
   history en el mismo archivo (github.com → archivo → History) para
   confirmar que el commit realmente se guardó.
5. **`localStorage` puede hacer que un bug "no se pueda reproducir"** si
   el estado persistido de una sesión anterior enmascara el fix — cuidado
   con esto al diagnosticar.

---

## Pendientes inmediatos (en orden sugerido)

1. **Confirmar Cambio 95** (borde con brillo del dock) funciona como se
   espera visualmente.
2. **Investigar con calma la causa real del bug del Cambio 93** (limpieza
   CSS que rompió el menú) en un entorno de prueba, antes de reintentar.
3. **REC Voz** — habilitar de verdad usando `MediaRecorder` nativo, mismo
   patrón que MIDI/Teclado (Cambio 86).
4. **Retomar Fase 0** (limpieza CSS) con más cuidado, selector por
   selector o en lotes más chicos, verificando SIEMPRE el archivo
   COMPLETO antes/después, no solo los selectores tocados.
5. **Dashboard de herramientas más visual** (estilo GarageBand — íconos
   grandes en vez de texto dominante para Batería/Pads/etc.).
6. **Sílabas del tresillo/cuatrillo en el Chart** (mostrar cada sílaba por
   separado en el karaoke, no el texto unido).
7. **Menú principal** — el usuario mencionó que "no están todas las
   opciones que quiere", sin detalle aún — pendiente de precisar.
8. **Librería de canciones** — feature nuevo grande, sin planear todavía.
9. Recién después de 2-4: continuar con **Fase 1 (LegacyBridge)** de la
   reestructuración arquitectónica.

---

## Prompt de arranque sugerido para el siguiente chat

```
Proyecto: Studio 936 Composer / Suite Pro Compose.
Estado actual: Cambio 95.
Lee este handoff completo antes de proponer cualquier cambio.

Archivos actuales:
- index.html
- js/suite-pro.js (sin número de versión en el nombre — el dock)
- js/suite-pro-structure-v489-cambio94.js (Ly Letra + Zoom sección)
- js/suite-pro-chart-v259-cambio94.js (Chart + karaoke)
- js/suite-pro-compose-v66-cambio50.js (sin cambios)
- js/suite-pro-midi.js (módulo real de MIDI, no tocar sin tarea explícita)

No tocar app.js sin aprobación explícita.
Un cambio por versión, archivo completo, validado con node --check.
Nombres de archivo EXACTOS al entregar (sin prefijos).
Cada uno de los 3 módulos principales debe mantener su badge de versión visible.

Pendiente más urgente: investigar por qué el Cambio 93 (consolidación CSS)
rompió el menú lateral, antes de reintentar la limpieza de código.

Siguiente prioridad funcional: REC Voz (patrón ya definido con MIDI/Teclado).
```

---

## Fuente documental

Este handoff reemplaza al `HANDOFF_Studio936_Composer_Cambio50.md` como
documento vigente. El README maestro (`README_..._Cambio50.md`) sigue
siendo válido como referencia de arquitectura general, pero su sección de
"Estado actual" y "Prioridades siguientes" quedó desactualizada — ver
sección correspondiente más abajo con el texto sugerido de reemplazo.
