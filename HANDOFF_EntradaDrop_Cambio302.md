# HANDOFF — Motor "Entrada + Drop" (Jazz y Bossa) — Cambio 302
**Estado al: Cambio 302** · Fecha: 23 de agosto de 2026
**Para:** el asistente que continúe esta conversación en un chat nuevo.
**Continúa de:** HANDOFF_Cejillas_Movibles_Cambio301.md (léelo primero — sigue
vigente todo lo de cejillas movibles, familias completa/shell/la/natural).

---

## 0. Qué cambió desde el Cambio 301

Val subió un ZIP (`Studio.zip`, con grabaciones de audio irrelevantes
mezcladas — ignorar los .wav/.amr/.mp3) y 7 fotos HEIC del documento
**"Teoría de Inversiones" de Rafael Ipuz**, páginas 2-6. Esto reveló que
las carpetas del ZIP ("e1 3voz", "e12voz", "e3 2 voz", "e3 3voz",
"e3 2i4voz") no eran datos sueltos — son la aplicación directa de una
teoría completa y generalizable. Ya no hace falta capturar acordes a
mano para este sistema: se derivan todos por fórmula.

---

## 1. La teoría (verificada, no es interpretación mía)

**Posición cerrada**: cualquier cuatríada se apila en terceras, orden
de grados 1-3-5-7 (o su lectura inversa 7-5-3-1).

**Entrada** = qué grado queda como la voz MÁS AGUDA (la melodía, la que
"predomina"). NO es la nota del bajo — es la de arriba. Hay 4 entradas,
en un ciclo fijo que se rota:

| Entrada | Voz 1 (arriba) | Voz 2 | Voz 3 | Voz 4 (abajo) |
|---|---|---|---|---|
| Por I   | 1 | 7 | 5 | 3 |
| Por III | 3 | 1 | 7 | 5 |
| Por V   | 5 | 3 | 1 | 7 |
| Por VII | 7 | 5 | 3 | 1 |

(El ciclo base es `[1,7,5,3]` repitiéndose; cada entrada es una rotación.)

**Drop** = tomar esa misma entrada (misma voz arriba, fija) y bajar una
o dos voces intermedias una octava, para que la forma quepa en la
guitarra. Equivale exactamente a "Drop 2 / Drop 3 / Drop 2&4" del
inglés de jazz:
- **Drop 2** = baja la voz 2 (contando desde arriba) una octava.
- **Drop 3** = baja la voz 3.
- **Drop 2 y 4** = baja la voz 2 y la voz 4.

**Tabla de grados por calidad** (página 2 del libro; semitonos desde
la raíz — "" = Mayor, mismas claves `qualRaw` que ya usa el resto del
código):

| Calidad | grado "1" | grado "3" | grado "5" | grado "7" |
|---|---|---|---|---|
| `""` (Mayor)  | 0 | 4 | 7  | 12 (usa la octava, no hay 7ª real) |
| `"m"` (menor) | 0 | 3 | 7  | 12 (ídem) |
| `"maj7"`      | 0 | 4 | 7  | 11 |
| `"7"`         | 0 | 4 | 7  | 10 |
| `"m7"`        | 0 | 3 | 7  | 10 |
| `"m7b5"`      | 0 | 3 | 6  | 10 |
| `"dim7"`      | 0 | 3 | 6  | 9  |

**"Orden"** = qué 4 cuerdas físicas de la guitarra se usan (independiente
de entrada/drop). El libro define 3: Primer orden (E-A-D-G), Segundo
orden (A-D-G-B), Tercer orden (A-D-G-e, saltando B). **El código de este
Cambio solo implementa Primer orden** — segundo y tercer orden quedan
pendientes (ver sección 5).

Nomenclatura de las carpetas del ZIP, ya resuelta:
`e1` = Entrada por I · `e3` = Entrada por III · `2voz`/`II voz abajo` =
Drop 2 · `3voz`/`III voz abajo` = Drop 3 · `2i4voz`/`II-IV voz abajo` =
Drop 2 y 4.

---

## 2. Dataset verificado (44 acordes, cruzados a mano contra fotos + ZIP)

Cada uno se verificó cruzando: nota impresa en la imagen ↔ nota
calculada por fórmula (raíz + semitonos de tuning) ↔ (cuando había foto)
número de grado impreso dentro del punto. **Nunca se leyó la posición
del punto a ojo** — método prohibido explícitamente por Val desde el
Handoff 301.

La lista completa de 44 casos vive ahora en el código mismo, como
`AUTOTEST_ENTRADA_DROP` dentro de `suite-pro-chart-v260-cambio100.js`
(Cambio 302). Correr `Studio936EntradaDrop.autotest()` en la consola
del navegador reproduce la verificación — **44/44 OK** confirmado antes
de entregar el archivo.

**2 inconsistencias encontradas en los datos de Val, no resueltas
todavía** (preguntar antes de asumir nada):
1. `Invesiones e12voz/Am7b5.jpg` tiene las notas de **Am6** (A,C,E,F#),
   no de m7b5 (A,C,Eb,G).
2. `Invesiones e12voz/E7b5.jpg` tiene las notas de **Em7b5** (E,G,Bb,D),
   no de dominante 7b5 (E,G#,Bb,D).

---

## 3. Qué se construyó en el Cambio 302

**Archivo tocado:** `js/suite-pro-chart-v260-cambio100.js` (más
`index.html` solo para el cache-buster). **Es ADITIVO** — no se tocó
`FAMILIAS_CEJILLA`, `NATURAL_SHAPES`, `generarDigitacion`,
`calcFretVoicingConFamilia`, ni ninguna función existente. `app.js` no
se tocó (sigue protegido).

Funciones nuevas (todas dentro de la misma IIFE que ya tenía
`FAMILIAS_CEJILLA`, así que comparten `PC`, `NOTE_NAMES`,
`FRETBOARD_CONFIG`, `midiToNote` por closure — no se duplicó nada de
eso):

- `generarEntradaDrop(qualRaw, entrada, drop)` → offsets relativos
  puros (sin raíz todavía).
- `notasEntradaDrop(root, qualRaw, entrada, drop)` → nombres de nota
  reales, arriba→abajo.
- `notasDesdeFrets(frets, inst)` → **única fuente de verdad**: notas
  reales desde cualquier patrón de trastes. Replica la misma
  matemática que ya usa `detectChordFromFrets` (línea ~1069) pero
  como función aparte y reutilizable — no se modificó
  `detectChordFromFrets` en sí (queda pendiente unificarlas del todo
  en un Cambio futuro, ver sección 5).
- `asignarPrimerOrdenEntradaDrop(root, qualRaw, entrada, drop)` →
  calcula los trastes reales en Primer orden (cuerdas E2-A2-D3-G3) Y
  hace la **verificación cruzada obligatoria** antes de devolver nada:
  si `notasDesdeFrets()` del resultado no coincide exactamente con las
  notas que la teoría esperaba, devuelve `null` y deja un
  `console.error` — nunca se entrega un voicing sin verificar.
- `autotestEntradaDrop()` → corre los 44 casos, expuesta en
  `window.Studio936EntradaDrop.autotest()` para que Val la corra desde
  la consola del navegador como prueba manual.
- `abrirLibreriaJazzBossa(rootInicial, qualRawInicial)` → el panel
  nuevo. Overlay con selector de raíz/calidad, píldoras de
  Entrada (I/III/V/VII) y Drop (Cerrada/2/3/2y4), dibuja el resultado
  con `miniFret()` (la MISMA función que ya usa el resto de la app —
  no se inventó un dibujo nuevo), muestra las notas reales debajo, y
  tiene un botón para correr el autotest ahí mismo. Expuesta también
  como `window.abrirLibreriaJazzBossa`.
- Un quinto botón **"Librería Jazz-Bossa"** se agregó a la fila de
  selector de familia existente (`renderFretControls`), junto a
  Completa/Jazz-Bossa/Base La/Natural — abre el panel nuevo. Es la
  única línea que toca UI ya existente, y es puramente aditiva (no
  cambia el comportamiento de los otros 4 botones).

**Comportamiento esperado:** al abrir el editor de un acorde en
guitarra, aparece un quinto botón "Librería Jazz-Bossa". Al hacer clic,
se abre un panel flotante donde se puede elegir cualquier raíz (12),
calidad (7), entrada (4) y drop (4) — 336 combinaciones posibles, todas
generadas por fórmula, todas verificadas en el momento antes de
mostrarse.

**Qué NO hace todavía (a propósito, para no mezclar cambios):**
- No hay botón "usar este voicing" que lo mande al editor principal —
  eso requiere tocar el estado interno del editor (`inlineFrets`,
  `cejillaFamilia`) y se dejó para un Cambio aparte una vez Val
  confirme que el panel se ve y calcula bien.
- Solo Primer orden (E-A-D-G). Segundo/Tercer orden pendientes.
- No incluye Entrada por V ni por VII en el autotest (sí están
  disponibles en el selector — la fórmula es la misma rotación — pero
  no hay fotos de Val todavía para verificarlas una por una).

**Prueba manual que Val debe hacer:**
1. Subir los 2 archivos (`suite-pro-chart-v260-cambio100.js`,
   `index.html`) reemplazando los actuales.
2. Refrescar fuerte (Ctrl+Shift+R).
3. Abrir el editor de cualquier acorde de guitarra → debe verse el
   botón "Librería Jazz-Bossa" junto a los otros 4.
4. Abrirlo, probar varias combinaciones de raíz/calidad/entrada/drop,
   confirmar que el diapasón se dibuja y las notas de abajo coinciden
   con lo que él toca en su guitarra real.
5. Apretar "Correr autotest" dentro del panel → debe decir **44 OK / 0
   FALLA**. Si dice otra cosa, algo se rompió al subir el archivo —
   avisar antes de seguir.

---

## 4. Decisiones de diseño ya validadas por Val en esta sesión (no repreguntar)

- El editor debe **dibujar siempre** el diapasón real, nunca solo
  números — tanto si el acorde viene generado (librería) como si Val
  lo digitó a mano tocando el mapa. Las dos rutas deben usar la misma
  función de "notas desde traste" para no desincronizarse nunca (ver
  bug pendiente #1 en sección 6 del Handoff 301 — sigue sin
  resolverse, es distinto de este Cambio).
- Este sistema es para el módulo **"Jazz y Bossa"** — un nivel más
  técnico, pensado para gente con conocimiento de armonía. El nivel
  estándar para el usuario común sigue siendo Natural + Cejilla
  completa (los otros 4 botones no cambian).
- La Librería es un **módulo aparte**, no reemplaza el editor
  principal — se abre, se explora, se cierra.

---

## 5. Pendientes para el siguiente Cambio (303 en adelante)

1. **Conectar la Librería al editor principal** — botón "usar este
   voicing" que cargue el resultado en `inlineFrets` del popup activo.
2. **Segundo y Tercer orden** (cuerdas A-D-G-B, y A-D-G-e saltando B) —
   mismo motor, distinto mapeo de cuerdas en
   `asignarPrimerOrdenEntradaDrop` (habría que generalizarla a
   `asignarOrdenEntradaDrop(root, qualRaw, entrada, drop, orden)`).
3. **Unificar `notasDesdeFrets` con `detectChordFromFrets`** — hoy
   están duplicadas a propósito (para no tocar una función existente
   en este Cambio); en algún momento conviene que
   `detectChordFromFrets` llame a `notasDesdeFrets` internamente.
4. **Confirmar con Val** las 2 inconsistencias de la sección 2 (Am7b5→
   Am6, E7b5→Em7b5) antes de usar esos datos para nada más.
5. **Entrada por V y por VII** — agregar al autotest en cuanto Val
   mande fotos de esas posiciones (la fórmula ya las soporta, solo
   falta el dato verificado).
6. Seguir arreglando el bug de sincronización del panel de notas
   (Handoff 301, sección 6, punto 1) — sigue pendiente, es
   independiente de este Cambio.

---

## 6. Cómo retomar esta conversación en un chat nuevo

1. Clonar el repo (`git clone --depth 1 --branch refactor/js-modules
   https://github.com/IPUZTechnology/Studio936-Composer.git`) y
   confirmar el Cambio más alto real con
   `grep -ohE "Cambio [0-9]+" js/*.js index.html | grep -oE "[0-9]+" | sort -n | uniq | tail -5`
   antes de tocar nada.
2. Leer este documento Y el HANDOFF_Cejillas_Movibles_Cambio301.md —
   ambos siguen vigentes, este es continuación, no reemplazo.
3. Si Val menciona "la librería", se refiere a
   `abrirLibreriaJazzBossa()` de este Cambio.
4. Seguir la disciplina de siempre: un Cambio a la vez, archivo
   completo, `node --check` antes de entregar, cache-buster
   actualizado, las 5 partes (problema/archivos que toca/archivos que
   NO toca/comportamiento esperado/prueba manual).
