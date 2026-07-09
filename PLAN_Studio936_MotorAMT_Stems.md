# Plan de Trabajo — Studio 936: Motor de Importación, Separación de Audio (Stems) y AMT

**Estado:** 🅿️ PARÉNTESIS — anotado y en pausa. Foco actual sigue en la interfaz de
Studio 936 Composer (Cambios 96→151 en curso). Este documento existe para no
perder la idea, no para arrancar construcción todavía.

**Relación con Studio 936 Composer:** proyecto **hermano, no cambio numerado**.
Composer es hoy 100% frontend (GitHub Pages, sin backend). Esto es un producto
de backend nuevo (API + servicio de ML + storage + BD). No se mezcla con la
numeración de Cambios del Composer ni con su handoff.

---

## 1. Visión (en palabras del usuario)

Dentro del módulo "Estudio" de Studio 936, poder:

1. Importar una canción de referencia desde YouTube.
2. Convertirla a audio (MP3/WAV).
3. Separar canales/instrumentos (voz, batería, bajo, otros) — "hacer lo mismo
   que hace básicamente Moises".
4. Ofrecer una calidad de separación propia, de la mejor calidad posible.
5. La visión final es **una mezcla de enfoques**: algo entre Moises, Spotify
   (como referencia de escucha) y otro servicio más ("Sul" — nombre a
   confirmar/aclarar, quedó ambiguo en la transcripción de voz).

**Principio rector explícito del usuario:** aprovechar al máximo lo ya
construido. Antes de rehacer nada, analizar qué piezas existentes (del
Composer, del motor de audio, de Bridge, etc.) se pueden **reutilizar como
motores diferentes**, en vez de reconstruir desde cero. Mismo espíritu que la
decisión de arquitectura ya vigente en el Composer ("no reconstruir la
interfaz, seguir con arreglos puntuales").

---

## 2. Arquitectura propuesta (del documento de investigación del usuario)

Componentes:

- **Frontend Studio 936** — habla solo con la API propia, nunca directo con
  Spotify ni con el servicio Python.
- **API Studio 936 (Node/TS)** — orquestación: auth, OAuth Spotify, endpoints
  REST, dispara jobs al servicio Python. No hace DSP ni ML pesado.
- **Servicio AMT & Audio (Python)** — el motor pesado: normaliza audio,
  separa stems (Demucs/Spleeter), AMT (Omnizart/MT3/Onsets & Frames), detección
  de melodía/acordes/estructura, genera MIDI + MusicXML + JSON. Pensado como
  contenedor Docker independiente, escalable por cola de jobs.
- **Integración Spotify** — solo metadatos y reproducción vía Embed/Web
  Playback SDK. **Nunca toca el audio crudo de Spotify** (decisión ya acertada
  del documento — evita un problema legal grande).
- **Storage** — bucket tipo S3 (originales, stems, MIDI, MusicXML) + Postgres
  (`users`, `audio_files`, `analysis_jobs`, `analysis_results`).

Endpoints clave ya esbozados en el documento original:
`POST /audio/upload`, `POST /audio/:audioId/analyze`,
`GET /audio/:audioId/status`, `GET /audio/:audioId/result`,
`GET /auth/spotify/login`, `GET /auth/spotify/callback`,
`GET /spotify/playlists`, `GET /spotify/tracks`.

Flujo típico: login → (opcional) conectar Spotify → elegir referencia →
subir audio propio → disparar análisis → polling de estado → mostrar
partitura/TAB (VexFlow) + player propio + mini-player Spotify de referencia,
lado a lado.

---

## 3. Qué reutilizar del Composer (a evaluar, no decidido aún)

Ideas iniciales para no rehacer motores que ya existen — **por confirmar caso
por caso cuando se retome este frente**:

- El motor de renderizado de partitura/Chart (`suite-pro-chart-v260-cambio100.js`)
  podría servir como base visual para mostrar el resultado del AMT (notas,
  acordes, estructura), en vez de construir un renderer nuevo desde cero.
- El sistema de `Studio936AppBridge` (transporte, instrumento, tono, BPM) ya
  resuelve "reproducir con el motor propio en vez del audio crudo" — mismo
  problema conceptual que "tocar el MIDI generado con el sonido de Studio 936".
- El motor de Transponer (Cambio 142/150) ya sabe transformar acordes/bajo/
  notas por semitonos — reutilizable si el AMT entrega la canción en una
  tonalidad y el usuario quiere cambiarla.
- El Mixer de Canales (`suite-pro-channel-mixer.js`) ya tiene el concepto de
  silenciar/ajustar volumen por canal — mismo concepto que "separar y
  controlar stems", aunque hoy trabaja sobre canales sintéticos, no sobre
  stems de audio real separado.

---

## 4. Riesgos y huecos a resolver ANTES de construir (no cosméticos)

1. **Legal — descarga desde YouTube.** Bajar audio de YouTube para procesarlo
   choca con los Términos de Servicio de YouTube. No es algo que se pueda
   resolver con código; es una decisión de producto/negocio que RIPUZ debe
   tomar con criterio legal propio antes de construir sobre esa base.
2. **Licencias de los modelos de ML.** Demucs, Spleeter, Omnizart, MT3, etc.
   tienen licencias distintas (algunas no-comerciales o copyleft fuerte) —
   auditar licencia por licencia antes de meter cualquiera en un producto
   comercial.
3. **Infraestructura nueva de cero.** Composer hoy no tiene backend, auth, BD
   ni storage. Esto no es "un módulo más" — es levantar un backend completo
   (API Node/TS + Postgres + storage S3-like + workers Python con GPU).
4. **Costo de cómputo.** Separación de stems + AMT es pesado (típicamente
   necesita GPU). Falta definir quién paga el cómputo por usuario, límites y
   cuotas — el documento original no lo cubre.
5. **Nombre "Sul"** mencionado por el usuario como parte de la mezcla de
   referencias (junto a Moises y Spotify) — quedó ambiguo en la transcripción
   de voz, aclarar a qué servicio se refiere exactamente.

---

## 5. Preguntas abiertas (para cuando se retome)

- ¿La fuente de audio será *solo* YouTube, o también carga directa de
  archivos propios del usuario (evitando el problema legal de raíz)?
- ¿Este backend vive en la infraestructura de RIPUZ/IPUZTechnology o es un
  servicio aparte contratado a terceros (Replicate, Modal, etc. para el GPU)?
- ¿Se integra como parte de Studio 936 Composer (mismo dominio/app) o como
  producto hermano separado ("Tabify by Studio 936", como sugiere el propio
  documento)?
- Definir con calma el contrato JSON estable (`AnalysisResult`, `TrackNote`,
  etc.) para poder cambiar de modelo de ML sin tocar frontend ni API.

---

## 6. Próximos pasos sugeridos (cuando se retome este frente, no ahora)

1. Resolver primero el punto legal de YouTube — condiciona todo lo demás.
2. Auditar licencias de los modelos candidatos.
3. Bajar la arquitectura a interfaces TypeScript concretas
   (`AnalysisResult`, `TrackNote`, etc.) — el documento original ya lo ofrece
   como siguiente paso.
4. Decidir qué piezas del Composer se reutilizan como motor (sección 3) antes
   de escribir código nuevo.
5. Prototipo mínimo: un solo endpoint (`upload` → `analyze` → `result`) con un
   solo modelo, sin Spotify todavía, para validar el pipeline de punta a
   punta antes de sumar complejidad.

---

*Documento generado como paréntesis de planeación. No implica trabajo de
código iniciado. Retomar cuando el usuario lo indique explícitamente.*
