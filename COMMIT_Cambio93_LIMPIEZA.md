# Cambio 93 (LIMPIEZA) — Fase 0 de la reestructuración: primer lote consolidado

## 1. Qué problema resuelve
`structure.js` tenía 117 selectores CSS repetidos (el mismo selector
definido en distintos Cambios históricos, algunos hasta 19 veces). Esto es
la causa raíz de varios bugs que resolvimos hoy (display:none viejo,
doble barra de scroll, anchos que no excluían modo MAX) — reglas nuevas y
viejas peleando entre sí silenciosamente.

Este Cambio consolida los **15 selectores más repetidos** (los de mayor
impacto), dejando UNA sola definición limpia por selector/contexto en vez
de docenas dispersas.

## 2. Qué archivos toca
- `js/suite-pro-structure-v488-cambio93.js` (reemplaza a v487-cambio91)
- `index.html` (1 línea `<script>`)

## 3. Qué archivos NO toca
Chart, Compose, suite-pro.js, app.js, audio-engine, transport,
practice/drums/mixer/recorder/midi.

## 4. Qué comportamiento esperado tiene
**Ninguno debería cambiar visualmente.** Este es un cambio 100% de limpieza
interna, verificado matemáticamente: escribí un script que calcula, para
cada uno de los 15 selectores, cuál era la regla que REALMENTE ganaba hoy
(considerando !important y los distintos @media), y comparé ese resultado
contra el archivo nuevo — los 15 dieron **exactamente igual**, regla base y
cada variante de pantalla.

Resultado: de 6382 a 5762 líneas (620 líneas de redundancia eliminadas),
mismo comportamiento visual.

## 5. Qué prueba manual debe hacerse
Como este cambio no debería alterar nada visualmente, la prueba es
confirmar que TODO sigue viéndose y funcionando exactamente igual que con
el Cambio 91:
1. Confirmar badge "CAMBIO 93".
2. Abrir Ly Letra → confirmar tamaño, posición, guardado (todo lo del 79-91).
3. Ir a "Arreglo de la Canción" → confirmar que las filas de sección
   (Intro, Verso 1, etc.) se ven igual, con sus botones (play, loop, zoom,
   REC, etc.).
4. Confirmar que la doble barra sigue resuelta (Cambio 91) en laptop.
5. Si algo se ve distinto, avisar de inmediato — sería señal de que mi
   script de resolución de cascada tuvo un error en ese caso puntual.

## Siguiente paso sugerido
Si este Cambio pasa la prueba sin problemas, seguimos con una segunda
tanda de los siguientes selectores más repetidos (quedan ~100 más, de
menor impacto individual), y después replicamos el mismo proceso en
`chart.js` y `suite-pro.js`.

## Comandos para subir a GitHub

1. Repo → carpeta `js/` → sube `suite-pro-structure-v488-cambio93.js` como
   archivo nuevo (o reemplaza si prefieres mantener el nombre corto).
2. Edita `index.html` → reemplaza por el contenido de `index.html` de esta
   entrega → Commit.
3. Espera el despliegue (Actions en verde).

Probar en: `https://ipuztechnology.github.io/Studio936-Composer/`
