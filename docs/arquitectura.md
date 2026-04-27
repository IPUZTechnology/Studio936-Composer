# Arquitectura Studio 936 Composer

## Estado actual

Base congelada: Studio 936 Composer v25.9.

El proyecto inició como un HTML monolítico funcional con:
- HTML
- CSS
- JavaScript
- motor de audio
- editor de progresiones
- ritmos
- letra/TAB
- exportación TXT/JSON/MIDI
- estructura inicial de canción
- soporte de iPad/touch
- diapasón/guitarra/ukelele
- ayuda bilingüe

## Objetivo de esta fase

Separar el prototipo en una estructura modular sin cambiar funcionalidad.

## Estructura actual

```text
studio936-composer/
├── index.html
├── README.md
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── docs/
│   └── arquitectura.md
└── legacy/
    └── studio936_composer_v25_9_congelada.html
