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
        { key: 'reggae', label: 'Reggae',      color: '#7dffb3' }
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
`;
        document.head.appendChild(style);
    }

    function currentStyle(){
        try { return bridge()?.getStyle?.() || ''; } catch(_) { return ''; }
    }

    function triggerPad(padEl, key){
        const ok = bridge()?.setStyle?.(key);
        if(!ok) return;
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
        const note = el('div', 's936pads-note', 'Tocá un pad para cambiar el groove en vivo — es el mismo motor rítmico de siempre, solo que a un toque.');
        const grid = el('div', 's936pads-grid');
        const closeBtn = el('button', 's936pads-closebtn', 'Cerrar');
        closeBtn.onclick = close;

        panel.append(title, note, grid, closeBtn);
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
