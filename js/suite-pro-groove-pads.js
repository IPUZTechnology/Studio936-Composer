// Studio 936 Composer — Pads de Ritmo (Cambio 462)
//
// QUÉ ES: grilla de pads táctiles, uno por cada ritmo REAL que ya existe
// en rhythm-engine.js (Funk, Rock, Balada, Bossa Nova, Jazz, Blues, Pop,
// Bolero, Salsa, Cumbia, Reggae) — hoy solo accesibles desde un <select>
// escondido en el header. Tocar un pad cambia el groove EN VIVO mientras
// suena, con la misma lógica exacta que ya usa ese selector (vía
// Bridge.setStyle, agregado en este mismo Cambio) — no se inventó ningún
// patrón rítmico nuevo, no se duplica lógica.
//
// PENSADO PARA TÁCTIL / IPAD: pads grandes, sin hover necesario,
// feedback visual inmediato al tocar (destello + queda "armado" hasta
// que se toca otro).
//
// Por qué esto SÍ es un control real y no decorativo: cada pad dispara
// el mismo evento 'change' que el <select> de estilo — el groove que
// suena después de tocar un pad es audio real, no una animación.

(function(){
    'use strict';

    const PANEL_ID = 's936GroovePads';
    const PADS = [
        { key: 'funk',   label: 'Funk',        color: '#00ffcc' },
        { key: 'rock',   label: 'Rock',        color: '#ff6b6b' },
        { key: 'ballad', label: 'Balada',      color: '#c792ff' },
        { key: 'bossa',  label: 'Bossa Nova',  color: '#00b3ff' },
        { key: 'jazz',   label: 'Jazz',        color: '#ffb020' },
        { key: 'blues',  label: 'Blues',       color: '#4d96ff' },
        { key: 'pop',    label: 'Pop',         color: '#ff8fd8' },
        { key: 'bolero', label: 'Bolero',      color: '#a0e0a0' },
        { key: 'salsa',  label: 'Salsa',       color: '#ffe066' },
        { key: 'cumbia', label: 'Cumbia',      color: '#ff9f4d' },
        { key: 'reggae', label: 'Reggae',      color: '#7dffb3' },
        // Cambio 463: 3 ritmos electrónicos nuevos
        { key: 'trance',     label: 'Trance',       color: '#b967ff' },
        { key: 'eurotrance', label: 'Eurotrance',   color: '#ff2d95' },
        { key: 'electro',    label: 'Electro (UK)', color: '#00e5ff' },
        // Cambio 468: 4 pads electrónicos nuevos más
        { key: 'house',   label: 'House',        color: '#ffb347' },
        { key: 'techno',  label: 'Techno',       color: '#d3d3d3' },
        { key: 'dnb',     label: 'Drum & Bass',  color: '#5ee6a0' },
        { key: 'dubstep', label: 'Dubstep',      color: '#7c5cff' }
    ];

    function bridge(){ return window.Studio936AppBridge || null; }

    function el(tag, className, text){
        const node = document.createElement(tag);
        if(className) node.className = className;
        if(text !== undefined) node.textContent = text;
        return node;
    }

    function injectStyle(){
        if(document.getElementById(PANEL_ID + 'Style')) return;
        const style = document.createElement('style');
        style.id = PANEL_ID + 'Style';
        style.textContent = `
#${PANEL_ID}Overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,.65);
  display: none; align-items: center; justify-content: center;
  padding: 16px;
}
#${PANEL_ID}Overlay.is-open { display: flex; }

#${PANEL_ID} {
  width: min(560px, 96vw);
  background: linear-gradient(180deg, #12161f 0%, #0a0d13 100%);
  border: 1px solid rgba(0,255,204,.28);
  border-radius: 18px;
  box-shadow: 0 30px 90px rgba(0,0,0,.75);
  padding: 18px 20px 16px;
  color: #e8f4f2;
  font-family: inherit;
}
#${PANEL_ID} h2 {
  margin: 0 0 4px; font-size: .92rem; color: #00ffcc; font-weight: 950;
  letter-spacing: 1.5px; text-transform: uppercase;
  text-shadow: 0 0 12px rgba(0,255,204,.35);
}
#${PANEL_ID} .s936pads-note {
  font-size: .68rem; color: #7d8d8a; margin-bottom: 16px;
}

#${PANEL_ID} .s936pads-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
}

#${PANEL_ID} .s936pad {
  aspect-ratio: 1 / 0.72;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.015));
  color: #cfe0dd;
  font-size: .78rem; font-weight: 800; letter-spacing: .3px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  text-align: center; padding: 6px;
  transition: transform .05s ease, box-shadow .12s ease, background .12s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
}
#${PANEL_ID} .s936pad:active {
  transform: scale(.94);
}
#${PANEL_ID} .s936pad.is-active {
  color: #0a0d13;
  font-weight: 950;
  box-shadow: 0 0 0 2px currentColor, 0 0 22px 2px var(--pad-glow, rgba(0,255,204,.5));
}
#${PANEL_ID} .s936pad.is-flash {
  animation: s936padFlash .28s ease;
}
@keyframes s936padFlash {
  0% { filter: brightness(2.2); }
  100% { filter: brightness(1); }
}

#${PANEL_ID} .s936pads-closebtn {
  display: block; margin: 16px auto 0; background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 7px 22px;
  color: #cfe0dd; font-size: .72rem; font-weight: 700; cursor: pointer; letter-spacing: .5px;
}

/* Cambio 464: rueda táctil (jog wheel) */
#${PANEL_ID} .s936wheel-section {
  margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.08);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
#${PANEL_ID} .s936wheel-title {
  font-size: .68rem; color: #7d8d8a; text-align: center; line-height: 1.4; max-width: 320px;
}
#${PANEL_ID} .s936wheel-style {
  font-size: .78rem; font-weight: 900; color: #00ffcc; letter-spacing: .5px;
}
#${PANEL_ID} .s936wheel-outer {
  width: 190px; height: 190px; border-radius: 50%; position: relative;
  background: radial-gradient(circle at 35% 30%, #23303a, #0a0d13 70%);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 14px 40px rgba(0,0,0,.6), inset 0 0 0 6px rgba(255,255,255,.03);
  touch-action: none;
  cursor: grab;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
#${PANEL_ID} .s936wheel-outer:active { cursor: grabbing; }
#${PANEL_ID} .s936wheel-tick {
  position: absolute; width: 4px; height: 12px; left: 50%; top: 6px;
  background: rgba(255,255,255,.16); border-radius: 2px;
  transform-origin: 2px 89px;
  transition: background-color .08s ease;
}
#${PANEL_ID} .s936wheel-tick.is-lit { background: #00ffcc; box-shadow: 0 0 8px #00ffcc; }
#${PANEL_ID} .s936wheel-knob {
  position: absolute; inset: 26px; border-radius: 50%;
  background: linear-gradient(160deg, #2a3742, #0d1117 65%);
  border: 1px solid rgba(255,255,255,.1);
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 0 22px rgba(0,0,0,.6);
}
#${PANEL_ID} .s936wheel-knob::after {
  content: ''; position: absolute; top: 10px; left: 50%; width: 3px; height: 16px;
  background: #00ffcc; box-shadow: 0 0 8px #00ffcc; border-radius: 2px;
  transform: translateX(-50%);
}
#${PANEL_ID} .s936wheel-center-label {
  font-size: .6rem; color: #5e6c6a; text-align: center; letter-spacing: .5px;
}
`;
        document.head.appendChild(style);
    }

    function currentStyle(){
        try { return bridge()?.getStyle?.() || ''; } catch(_) { return ''; }
    }

    // Cambio 464: rueda táctil — cada uno de los 16 "steps" de un compás
    // se dispara con AUDIO REAL (scheduleDrumStep, el mismo motor que usa
    // la canción al reproducirse), siguiendo el gesto del dedo/mouse. No
    // es una animación: cada golpe que se escucha es un hit real de
    // batería del estilo activo en ese momento.
    const STEPS = 16;
    let wheelAngle = 0;
    let wheelLastStep = -1;
    let wheelDragging = false;
    let wheelStartAngle = 0;
    let wheelStartPointerAngle = 0;

    function stepFromAngle(angle){
        const norm = ((angle % 360) + 360) % 360;
        return Math.floor(norm / (360 / STEPS)) % STEPS;
    }

    function fireStep(step){
        try {
            const ctx = window.__studio936AudioCtx;
            bridge()?.scheduleDrumStep?.(null, step, ctx ? ctx.currentTime : 0);
        } catch(_) {}
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        panel.querySelectorAll('.s936wheel-tick').forEach((tick, i) => {
            tick.classList.toggle('is-lit', i === step);
        });
        setTimeout(() => {
            const t = panel.querySelector(`.s936wheel-tick[data-step="${step}"]`);
            if(t) t.classList.remove('is-lit');
        }, 150);
    }

    function pointerAngleFromEvent(evt, centerEl){
        const rect = centerEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = evt.clientX - cx;
        const dy = evt.clientY - cy;
        return Math.atan2(dy, dx) * 180 / Math.PI;
    }

    function bindWheel(wheelEl, knobEl){
        wheelEl.addEventListener('pointerdown', (evt) => {
            wheelDragging = true;
            wheelEl.setPointerCapture(evt.pointerId);
            wheelStartPointerAngle = pointerAngleFromEvent(evt, wheelEl);
            wheelStartAngle = wheelAngle;
        });
        wheelEl.addEventListener('pointermove', (evt) => {
            if(!wheelDragging) return;
            const nowAngle = pointerAngleFromEvent(evt, wheelEl);
            let delta = nowAngle - wheelStartPointerAngle;
            wheelAngle = wheelStartAngle + delta;
            knobEl.style.transform = `rotate(${wheelAngle}deg)`;
            const step = stepFromAngle(wheelAngle);
            if(step !== wheelLastStep){
                wheelLastStep = step;
                fireStep(step);
            }
        });
        const endDrag = () => { wheelDragging = false; };
        wheelEl.addEventListener('pointerup', endDrag);
        wheelEl.addEventListener('pointercancel', endDrag);
    }

    // Cambio 465: pads electrónicos vs pads acústicos — Val notó que
    // Eurotrance sonaba "a piano con otro tempo". Causa real: estilo
    // (ritmo) e instrumento (timbre) son dos selectores INDEPENDIENTES,
    // y toda canción nueva arranca con instrument:'piano' por defecto.
    // El pad solo cambiaba el estilo, nunca el instrumento — sonaba
    // correcto rítmicamente, pero con el timbre que hubiera quedado
    // seleccionado antes (casi siempre Piano, el default). Para los 3
    // ritmos electrónicos, el pad ahora también cambia el instrumento a
    // Synth de una — así "suena electrónico" apenas lo tocás, sin un
    // paso manual aparte. Los 11 ritmos de siempre NO fuerzan
    // instrumento — ahí sí tiene sentido dejar que la persona elija con
    // qué instrumento quiere tocar/practicar encima.
    const ELECTRONIC_STYLES = new Set(['trance', 'eurotrance', 'electro', 'house', 'techno', 'dnb', 'dubstep']);

    function triggerPad(padEl, key){
        const ok = bridge()?.setStyle?.(key);
        if(!ok) return;
        if(ELECTRONIC_STYLES.has(key)) bridge()?.setInstrument?.('synth');
        padEl.classList.add('is-flash');
        setTimeout(() => padEl.classList.remove('is-flash'), 280);
        refreshActiveState();
    }

    function refreshActiveState(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const active = currentStyle();
        panel.querySelectorAll('.s936pad').forEach(padEl => {
            padEl.classList.toggle('is-active', padEl.dataset.key === active);
        });
        const label = document.getElementById(PANEL_ID + 'WheelStyle');
        if(label){
            const found = PADS.find(p => p.key === active);
            label.textContent = found ? ('Sonando: ' + found.label) : 'Elegí un pad arriba primero';
        }
    }

    function render(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const grid = panel.querySelector('.s936pads-grid');
        grid.innerHTML = '';
        PADS.forEach(pad => {
            const btn = el('button', 's936pad', pad.label);
            btn.dataset.key = pad.key;
            btn.style.setProperty('--pad-glow', pad.color);
            btn.style.borderColor = pad.color + '55';
            btn.onclick = () => triggerPad(btn, pad.key);
            grid.appendChild(btn);
        });
        refreshActiveState();
    }

    function buildPanel(){
        injectStyle();
        const overlay = el('div', '');
        overlay.id = PANEL_ID + 'Overlay';
        const panel = el('div', '');
        panel.id = PANEL_ID;

        const title = el('h2', '', '🥁 Pads de Ritmo');
        const note = el('div', 's936pads-note', 'Tocá un pad para cambiar el groove en vivo. Los 3 electrónicos (Trance/Eurotrance/Electro) también cambian el instrumento a Synth automáticamente, para que suenen electrónicos de una.');
        const grid = el('div', 's936pads-grid');

        const wheelSection = el('div', 's936wheel-section');
        const wheelTitle = el('div', 's936wheel-title', 'Rueda táctil — arrastrá con el dedo o el mouse para tocar el patrón de batería del groove activo, paso a paso, con sonido real.');
        const wheelStyleLabel = el('div', 's936wheel-style');
        wheelStyleLabel.id = PANEL_ID + 'WheelStyle';
        const wheelOuter = el('div', 's936wheel-outer');
        for(let i = 0; i < STEPS; i++){
            const tick = el('div', 's936wheel-tick');
            tick.dataset.step = String(i);
            tick.style.transform = `rotate(${i * (360 / STEPS)}deg)`;
            wheelOuter.appendChild(tick);
        }
        const wheelKnob = el('div', 's936wheel-knob');
        wheelOuter.appendChild(wheelKnob);
        bindWheel(wheelOuter, wheelKnob);
        const wheelCenterNote = el('div', 's936wheel-center-label', '1 compás · 16 pasos');
        wheelSection.append(wheelTitle, wheelStyleLabel, wheelOuter, wheelCenterNote);

        const closeBtn = el('button', 's936pads-closebtn', 'Cerrar');
        closeBtn.onclick = close;

        panel.append(title, note, grid, wheelSection, closeBtn);
        overlay.appendChild(panel);
        overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
        document.body.appendChild(overlay);
        return overlay;
    }

    function open(){
        let overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(!overlay) overlay = buildPanel();
        overlay.classList.add('is-open');
        render();
    }
    function close(){
        const overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(overlay) overlay.classList.remove('is-open');
    }
    function toggle(){
        const overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(overlay && overlay.classList.contains('is-open')) close(); else open();
    }

    window.Studio936GroovePads = { open, close, toggle };
})();
