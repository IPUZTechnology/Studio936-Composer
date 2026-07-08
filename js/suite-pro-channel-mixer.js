// Studio 936 Composer — Mixer de Canales (Cambio 129)
//
// Panel chico que deja silenciar o bajar el volumen de cada parte del
// groove (batería, bajo, acordes/guitarra, solo) de forma independiente
// mientras suena. Habla con app.js SOLO a través del Bridge
// (getChannelMix / setChannelMute / setChannelVolume) — no toca nada
// directamente.
//
// Nota honesta: por ahora es un ajuste de SESIÓN (no se guarda todavía
// junto con la canción) — se resetea al recargar la página.

(function(){
    'use strict';

    const PANEL_ID = 's936ChannelMixerPanel';
    const CHANNELS = [
        { key: 'drums', label: '🥁 Batería' },
        { key: 'bass', label: '🎸 Bajo' },
        { key: 'chord', label: '🎹 Acordes / Guitarra' },
        { key: 'solo', label: '🎺 Solo' }
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
  background: rgba(0,0,0,.55);
  display: none; align-items: center; justify-content: center;
}
#${PANEL_ID}Overlay.is-open { display: flex; }
#${PANEL_ID} {
  width: min(360px, 92vw);
  background: linear-gradient(180deg,#14181a,#0a0d0e);
  border: 1px solid rgba(91,232,201,.25);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
  padding: 16px 18px;
  color: #e8f4f2;
  font-family: inherit;
}
#${PANEL_ID} h2 {
  margin: 0 0 4px; font-size: 1rem; color: #5be8c9; font-weight: 800;
}
#${PANEL_ID} .s936mix-note {
  font-size: .68rem; color: #9fb0ae; margin-bottom: 14px;
}
#${PANEL_ID} .s936mix-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
}
#${PANEL_ID} .s936mix-label { flex: 1; font-size: .82rem; font-weight: 600; }
#${PANEL_ID} .s936mix-mutebtn {
  width: 34px; height: 30px; border-radius: 7px; cursor: pointer;
  background: #1c2224; border: 1px solid #333; color: #9fb0ae; font-size: .85rem;
}
#${PANEL_ID} .s936mix-mutebtn.muted { background: rgba(226,75,74,.15); border-color: #e24b4a; color: #e24b4a; }
#${PANEL_ID} .s936mix-slider { flex: 1.4; }
#${PANEL_ID} .s936mix-closebtn {
  display: block; margin: 4px auto 0; background: transparent; border: none;
  color: #9fb0ae; font-size: .78rem; cursor: pointer; text-decoration: underline;
}
`;
        document.head.appendChild(style);
    }

    function render(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const body = panel.querySelector('.s936mix-body');
        body.innerHTML = '';
        const mix = bridge()?.getChannelMix?.() || {};
        CHANNELS.forEach(ch => {
            const state = mix[ch.key] || { mute:false, vol:1 };
            const row = el('div', 's936mix-row');
            const label = el('div', 's936mix-label', ch.label);
            const muteBtn = el('button', 's936mix-mutebtn' + (state.mute ? ' muted' : ''), state.mute ? '🔇' : '🔊');
            muteBtn.onclick = () => {
                bridge()?.setChannelMute?.(ch.key, !state.mute);
                render();
            };
            const slider = document.createElement('input');
            slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.value = String(Math.round((state.vol ?? 1) * 100));
            slider.className = 's936mix-slider';
            slider.oninput = () => bridge()?.setChannelVolume?.(ch.key, Number(slider.value) / 100);
            row.append(label, muteBtn, slider);
            body.appendChild(row);
        });
    }

    function buildPanel(){
        injectStyle();
        const overlay = el('div', '');
        overlay.id = PANEL_ID + 'Overlay';
        const panel = el('div', '');
        panel.id = PANEL_ID;

        const title = el('h2', '', '🎚 Canales / Instrumentos');
        const note = el('div', 's936mix-note', 'Silencia o baja el volumen de cada parte del groove mientras suena. Ajuste de esta sesión (no se guarda todavía con la canción).');
        const body = el('div', 's936mix-body');
        const closeBtn = el('button', 's936mix-closebtn', 'Cerrar');
        closeBtn.onclick = close;

        panel.append(title, note, body, closeBtn);
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

    window.Studio936ChannelMixer = { open, close, toggle };
})();
