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
        { key: 'solo', label: '🎸 Guitarra Lead (Solo)' },
        { key: 'piano', label: '🎹 Piano (práctica)' },
        { key: 'ukulele', label: '🪕 Ukelele (práctica)' }
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
  width: min(560px, 94vw);
  background:
    radial-gradient(circle at 20% 0%, rgba(0,255,204,.14), transparent 26%),
    linear-gradient(180deg, rgba(13,18,28,.98), rgba(5,7,12,.97));
  border: 1px solid rgba(0,255,204,.34);
  border-radius: 22px;
  box-shadow: 0 30px 90px rgba(0,0,0,.72);
  backdrop-filter: blur(12px);
  padding: 18px 20px;
  color: #e8f4f2;
  font-family: inherit;
}
#${PANEL_ID} h2 {
  margin: 0 0 4px; font-size: .95rem; color: #00ffcc; font-weight: 950;
  letter-spacing: .5px; text-transform: uppercase;
}
#${PANEL_ID} .s936mix-note {
  font-size: .68rem; color: #9fb0ae; margin-bottom: 16px;
}
#${PANEL_ID} .s936mix-channel {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px;
  margin-bottom: 8px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 12px;
}
#${PANEL_ID} .s936mix-label { width: 168px; flex-shrink: 0; font-size: .8rem; font-weight: 700; }
#${PANEL_ID} .s936mix-mutebtn {
  width: 32px; height: 30px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14); color: #9fb0ae; font-size: .82rem;
}
#${PANEL_ID} .s936mix-mutebtn.muted { background: rgba(226,75,74,.15); border-color: #e24b4a; color: #e24b4a; }
#${PANEL_ID} .s936mix-slider { flex: 1.2; accent-color: #00ffcc; }
#${PANEL_ID} .s936mix-pan { width: 64px; flex-shrink: 0; accent-color: #ffe066; }
#${PANEL_ID} .s936mix-pan-label { font-size: .6rem; color: #9fb0ae; width: 12px; text-align: center; flex-shrink: 0; }
#${PANEL_ID} .s936mix-closebtn {
  display: block; margin: 6px auto 0; background: transparent; border: none;
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
            const state = mix[ch.key] || { mute:false, vol:1, pan:0 };
            const row = el('div', 's936mix-channel');

            const label = el('div', 's936mix-label', ch.label);
            const muteBtn = el('button', 's936mix-mutebtn' + (state.mute ? ' muted' : ''), state.mute ? '🔇' : '🔊');
            muteBtn.onclick = () => { bridge()?.setChannelMute?.(ch.key, !state.mute); render(); };

            const volSlider = document.createElement('input');
            volSlider.type = 'range'; volSlider.min = '0'; volSlider.max = '100'; volSlider.value = String(Math.round((state.vol ?? 1) * 100));
            volSlider.className = 's936mix-slider';
            volSlider.title = 'Volumen';
            volSlider.oninput = () => bridge()?.setChannelVolume?.(ch.key, Number(volSlider.value) / 100);

            const lLabel = el('span', 's936mix-pan-label', 'L');
            const panSlider = document.createElement('input');
            panSlider.type = 'range'; panSlider.min = '-100'; panSlider.max = '100'; panSlider.value = String(Math.round((state.pan ?? 0) * 100));
            panSlider.className = 's936mix-pan';
            panSlider.title = 'Panorama (izquierda/derecha)';
            panSlider.oninput = () => bridge()?.setChannelPan?.(ch.key, Number(panSlider.value) / 100);
            const rLabel = el('span', 's936mix-pan-label', 'R');

            row.append(label, muteBtn, volSlider, lLabel, panSlider, rLabel);
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
        const note = el('div', 's936mix-note', 'Silencia o baja el volumen de cada parte del groove mientras suena. Ajuste de esta sesión (no se guarda todavía con la canción). Piano/Ukelele son voces extra de práctica (apagadas por defecto) — comparten panorama con Acordes por ahora.');
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
