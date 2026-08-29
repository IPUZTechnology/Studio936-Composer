# Prompt para Codex — Bloque 0: limpieza de archivos muertos

Copiá y pegá esto tal cual en Codex, con el repo `IPUZTechnology/Studio936-Composer` conectado.

---

```
Repo: IPUZTechnology/Studio936-Composer
Rama base: refactor/js-modules
Rama nueva a crear: cleanup/bloque0-archivos-muertos

TAREA: Borrar ÚNICAMENTE los archivos listados abajo. No modificar, no
renombrar, no tocar ningún otro archivo del repo — ni index.html, ni
ningún .js que no esté en esta lista exacta.

Antes de borrar cada archivo, confirmá que:
1. No aparece como <script src="..."> en index.html.
2. No aparece como string dentro de ningún archivo .js que SÍ esté
   cargado en index.html (búsqueda de texto simple alcanza).

Si encontrás una referencia real a alguno de estos archivos que yo no
haya detectado, DETENÉ el borrado de ese archivo puntual, dejalo afuera
de la rama, y avisame cuál fue y dónde lo encontraste — no lo borres
igual.

Al terminar: crear un Pull Request hacia refactor/js-modules (NO hacer
merge automático) con el título "Cleanup: archivar 182 archivos JS
muertos + 2 duplicados de raíz (Bloque 0)" y una lista en la descripción
de cuántos archivos se borraron de cada categoría (chart-v*, compose-v*,
structure-v*, otros, raíz).

=== ARCHIVOS A BORRAR ===

# Duplicados en la raíz (NO están en js/, cuidado con no confundir con
# los que sí usamos):
suite-pro-chart-v260-cambio100.js   (el de la RAÍZ, no el de js/)
suite-pro-track-recorder.js         (el de la RAÍZ, no el de js/)

# Dentro de js/ — versiones viejas de Chart:
[PEGAR ACÁ la lista completa de "suite-pro-chart-v*.js" del archivo
LISTA_ARCHIVOS_A_BORRAR_Bloque0.md]

# Dentro de js/ — versiones viejas de Compose:
[PEGAR ACÁ la lista completa de "suite-pro-compose-v*.js"]

# Dentro de js/ — versiones viejas de Structure:
[PEGAR ACÁ la lista completa de "suite-pro-structure-v*.js"]

# Dentro de js/ — otros sueltos:
[PEGAR ACÁ la lista de "otros sueltos"]

=== ATENCIÓN ESPECIAL ===

suite-pro-chart-v248-cambio48.js: este archivo tiene una referencia
indirecta desde js/suite-pro-structure-v489-cambio94.js (un "cargador
de emergencia" que en teoría podría pedirlo). Ya confirmé que es
seguro borrarlo porque js/suite-pro-chart-v260-cambio100.js (el que sí
usamos) resuelve esa dependencia ANTES de que el cargador de emergencia
se dispare. Podés borrarlo igual, pero mencionalo en la descripción del
PR para que quede documentado.

NO TOQUES estos archivos bajo ninguna circunstancia (son los que sí se
usan hoy):
- index.html
- js/suite-pro-chart-v260-cambio100.js
- js/suite-pro-track-recorder.js
- js/suite-pro-structure-v489-cambio94.js
- js/suite-pro-compose-v66-cambio50.js
- js/suite-pro.js
- js/app.js
- cualquier archivo no listado explícitamente arriba
```

---

## Después de que Codex termine

1. **No mergees el PR todavía a ciegas.** Abrí el PR, mirá el diff — debe mostrar SOLO archivos borrados (líneas rojas), cero líneas verdes/modificadas en `index.html` o en los archivos vivos.
2. Si el diff se ve limpio, mergeá.
3. Probá el sitio en vivo (recargá con caché vacía) y confirmá que todo se ve y funciona exactamente igual que antes.
4. Avisame cuando esté mergeado — actualizo la bitácora marcando el Bloque 0 como completado.

## Nota aparte (no es parte de esta tarea, para más adelante)

Vi que el repo tiene muchas ramas viejas `codex/...` sin mergear, de trabajo anterior — eso también suma al "desmadre" general, aunque no afecta el sitio en vivo (las ramas no se despliegan). Cuando quieras, lo agrego como un ítem más chico a la bitácora para revisarlas y cerrar/borrar las que ya no sirvan.
