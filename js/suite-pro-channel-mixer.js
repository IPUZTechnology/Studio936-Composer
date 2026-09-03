// Studio 936 Composer — Mixer de Canales, consola DJ (Cambio 461)
//
// QUÉ CAMBIÓ respecto al Cambio 129 original: rediseño visual completo,
// estética de consola de mezcla física (faders verticales, VU meter
// animado, botones tipo hardware) en vez de la lista simple de sliders
// horizontales que había. El CONTRATO con app.js queda exactamente
// igual — sigue hablando SOLO a través del Bridge (getChannelMix /
// setChannelMute / setChannelVolume / setChannelPan), cero cambios en
// app.js para este Cambio. Los mismos 6 canales de siempre (los únicos
// que de verdad afectan audio real hoy — agregar más filas sin que
// app.js las escuche sería un control decorativo, y la regla del
// proyecto es que ningún control visible debe mentir sobre lo que
// hace).
//
// VU METER: no es análisis de audio en tiempo real (eso requeriría un
// AnalyserNode por canal, tarea más grande) — es una animación honesta
// basada en el volumen configurado de cada canal, para dar la sensación
// de consola viva sin prometer algo que no hace. Si más adelante se
// arma el análisis real, esta misma barra se puede alimentar con datos
// reales sin tocar el resto del layout.

(function(){
    'use strict';

    const PANEL_ID = 's936ChannelMixerPanel';
    const CHANNELS = [
        { key: 'drums',   label: 'Batería',              icon: '🥁', color: '#ff6b6b' },
        { key: 'bass',    label: 'Bajo',                 icon: '🎸', color: '#ffb020' },
        { key: 'chord',   label: 'Acordes / Guitarra',   icon: '🎹', color: '#00ffcc' },
        { key: 'solo',    label: 'Guitarra Lead (Solo)', icon: '🎸', color: '#00b3ff' },
        { key: 'piano',   label: 'Piano (práctica)',     icon: '🎹', color: '#c792ff' },
        { key: 'ukulele', label: 'Ukelele (práctica)',   icon: '🪕', color: '#ffe066' }
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
  width: min(760px, 96vw);
  max-height: 92vh;
  overflow-y: auto;
  background:
    radial-gradient(circle at 15% 0%, rgba(0,255,204,.10), transparent 30%),
    radial-gradient(circle at 85% 100%, rgba(0,179,255,.08), transparent 34%),
    linear-gradient(180deg, #12161f 0%, #0a0d13 100%);
  border: 1px solid rgba(0,255,204,.28);
  border-radius: 18px;
  box-shadow: 0 30px 90px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.04);
  padding: 18px 20px 14px;
  color: #e8f4f2;
  font-family: inherit;
}

#${PANEL_ID} .s936mix-head {
  display: flex; align-items: baseline; justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,.08);
  padding-bottom: 10px; margin-bottom: 14px;
}
#${PANEL_ID} h2 {
  margin: 0; font-size: .92rem; color: #00ffcc; font-weight: 950;
  letter-spacing: 1.5px; text-transform: uppercase;
  text-shadow: 0 0 12px rgba(0,255,204,.35);
}
#${PANEL_ID} .s936mix-note {
  font-size: .64rem; color: #7d8d8a; max-width: 260px; text-align: right; line-height: 1.35;
}

#${PANEL_ID} .s936mix-console {
  display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px;
}

#${PANEL_ID} .s936mix-strip {
  flex: 1 0 96px; min-width: 96px;
  display: flex; flex-direction: column; align-items: center;
  background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.01));
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 12px;
  padding: 10px 8px 12px;
  position: relative;
}
#${PANEL_ID} .s936mix-strip.is-muted { opacity: .55; }

#${PANEL_ID} .s936mix-strip-label {
  font-size: .62rem; font-weight: 800; text-align: center;
  line-height: 1.2; min-height: 28px; display: flex; align-items: center; justify-content: center;
  color: #cfe0dd; margin-bottom: 8px;
}
#${PANEL_ID} .s936mix-strip-icon { font-size: 1.05rem; display: block; margin-bottom: 2px; }

#${PANEL_ID} .s936mix-fader-row {
  display: flex; align-items: flex-end; gap: 6px; height: 168px; margin-bottom: 10px;
}

#${PANEL_ID} .s936mix-vu {
  width: 10px; height: 168px; border-radius: 5px;
  background: #05070a;
  border: 1px solid rgba(255,255,255,.08);
  display: flex; flex-direction: column-reverse; overflow: hidden;
  padding: 2px;
  gap: 2px;
}
#${PANEL_ID} .s936mix-vu-seg {
  width: 100%; height: 6px; border-radius: 2px; background: rgba(255,255,255,.06);
  transition: background-color .12s ease, box-shadow .12s ease;
}
#${PANEL_ID} .s936mix-vu-seg.is-lit { box-shadow: 0 0 6px currentColor; }

/* Fader vertical: un <input type=range> rotado 270deg dentro de un carril */
#${PANEL_ID} .s936mix-fader-track {
  position: relative; width: 34px; height: 168px;
  background: linear-gradient(180deg, #05070a, #0d1117);
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
#${PANEL_ID} .s936mix-fader-track::before {
  content: ''; position: absolute; left: 50%; top: 8px; bottom: 8px; width: 2px;
  background: rgba(255,255,255,.10); transform: translateX(-50%);
}
#${PANEL_ID} .s936mix-fader {
  -webkit-appearance: none; appearance: none;
  width: 152px; height: 26px;
  background: transparent;
  transform: rotate(-90deg);
  cursor: ns-resize;
  margin: 0;
}
#${PANEL_ID} .s936mix-fader::-webkit-slider-runnable-track { height: 4px; background: transparent; }
#${PANEL_ID} .s936mix-fader::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 40px; height: 20px; border-radius: 4px; margin-top: -8px;
  background: linear-gradient(180deg, #e8f4f2, #9fb0ae);
  border: 1px solid #05070a;
  box-shadow: 0 2px 6px rgba(0,0,0,.5);
  cursor: ns-resize;
}
#${PANEL_ID} .s936mix-fader::-moz-range-track { height: 4px; background: transparent; }
#${PANEL_ID} .s936mix-fader::-moz-range-thumb {
  width: 40px; height: 20px; border-radius: 4px; border: 1px solid #05070a;
  background: linear-gradient(180deg, #e8f4f2, #9fb0ae);
  box-shadow: 0 2px 6px rgba(0,0,0,.5);
  cursor: ns-resize;
}

#${PANEL_ID} .s936mix-vol-readout {
  font-size: .6rem; color: #7d8d8a; margin-bottom: 8px; font-variant-numeric: tabular-nums;
}

#${PANEL_ID} .s936mix-btnrow { display: flex; gap: 5px; margin-bottom: 8px; }
#${PANEL_ID} .s936mix-mutebtn {
  width: 30px; height: 26px; border-radius: 6px; cursor: pointer;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14);
  color: #9fb0ae; font-size: .62rem; font-weight: 900; letter-spacing: .5px;
}
#${PANEL_ID} .s936mix-mutebtn.is-active {
  background: rgba(226,75,74,.20); border-color: #e24b4a; color: #ff8a89;
  box-shadow: 0 0 10px rgba(226,75,74,.35);
}

#${PANEL_ID} .s936mix-pan-row { display: flex; align-items: center; gap: 4px; width: 100%; }
#${PANEL_ID} .s936mix-pan-label { font-size: .56rem; color: #5e6c6a; flex-shrink: 0; }
#${PANEL_ID} .s936mix-pan {
  flex: 1; accent-color: #ffe066; height: 14px;
}

#${PANEL_ID} .s936mix-footnote {
  font-size: .62rem; color: #5e6c6a; text-align: center; margin-top: 4px; line-height: 1.5;
}
#${PANEL_ID} .s936mix-closebtn {
  display: block; margin: 12px auto 0; background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 7px 22px;
  color: #cfe0dd; font-size: .72rem; font-weight: 700; cursor: pointer; letter-spacing: .5px;
}
`;
        document.head.appendChild(style);
    }

    // Cambio 461: intervalo que anima los VU meters en base al volumen
    // configurado (no es señal real, ver nota arriba). Se limpia al
    // cerrar el panel para no seguir corriendo de fondo.
    let vuInterval = null;
    const VU_SEGMENTS = 14;

    function updateVuMeters(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const mix = bridge()?.getChannelMix?.() || {};
        CHANNELS.forEach(ch => {
            const vuEl = panel.querySelector(`.s936mix-vu[data-ch="${ch.key}"]`);
            if(!vuEl) return;
            const state = mix[ch.key] || { mute:false, vol:1 };
            const baseLevel = state.mute ? 0 : (state.vol ?? 1);
            const jitter = state.mute ? 0 : (Math.random() * .22 - .11);
            const level = Math.max(0, Math.min(1, baseLevel + jitter));
            const litCount = Math.round(level * VU_SEGMENTS);
            [...vuEl.children].forEach((seg, i) => {
                const lit = i < litCount;
                seg.classList.toggle('is-lit', lit);
                if(lit){
                    const pct = i / VU_SEGMENTS;
                    seg.style.color = pct > .82 ? '#ff5a5a' : pct > .6 ? '#ffcc4d' : ch.color;
                    seg.style.background = seg.style.color;
                } else {
                    seg.style.background = 'rgba(255,255,255,.06)';
                }
            });
        });
    }

    function render(){
        const panel = document.getElementById(PANEL_ID);
        if(!panel) return;
        const console_ = panel.querySelector('.s936mix-console');
        console_.innerHTML = '';
        const mix = bridge()?.getChannelMix?.() || {};

        CHANNELS.forEach(ch => {
            const state = mix[ch.key] || { mute:false, vol:1, pan:0 };
            const strip = el('div', 's936mix-strip' + (state.mute ? ' is-muted' : ''));

            const label = el('div', 's936mix-strip-label');
            const iconSpan = el('span', 's936mix-strip-icon', ch.icon);
            label.appendChild(iconSpan);
            label.appendChild(document.createTextNode(ch.label));

            const faderRow = el('div', 's936mix-fader-row');

            const vu = el('div', 's936mix-vu');
            vu.dataset.ch = ch.key;
            for(let i = 0; i < VU_SEGMENTS; i++) vu.appendChild(el('div', 's936mix-vu-seg'));

            const faderTrack = el('div', 's936mix-fader-track');
            const fader = document.createElement('input');
            fader.type = 'range'; fader.min = '0'; fader.max = '100';
            fader.value = String(Math.round((state.vol ?? 1) * 100));
            fader.className = 's936mix-fader';
            fader.title = 'Volumen';
            fader.oninput = () => {
                bridge()?.setChannelVolume?.(ch.key, Number(fader.value) / 100);
                readout.textContent = fader.value + '%';
            };
            faderTrack.appendChild(fader);

            faderRow.append(vu, faderTrack);

            const readout = el('div', 's936mix-vol-readout', String(Math.round((state.vol ?? 1) * 100)) + '%');

            const btnRow = el('div', 's936mix-btnrow');
            const muteBtn = el('button', 's936mix-mutebtn' + (state.mute ? ' is-active' : ''), 'MUTE');
            muteBtn.onclick = () => {
                bridge()?.setChannelMute?.(ch.key, !state.mute);
                render();
            };
            btnRow.appendChild(muteBtn);

            const panRow = el('div', 's936mix-pan-row');
            const lLabel = el('span', 's936mix-pan-label', 'L');
            const panSlider = document.createElement('input');
            panSlider.type = 'range'; panSlider.min = '-100'; panSlider.max = '100';
            panSlider.value = String(Math.round((state.pan ?? 0) * 100));
            panSlider.className = 's936mix-pan';
            panSlider.title = 'Panorama (izquierda/derecha)';
            panSlider.oninput = () => bridge()?.setChannelPan?.(ch.key, Number(panSlider.value) / 100);
            const rLabel = el('span', 's936mix-pan-label', 'R');
            panRow.append(lLabel, panSlider, rLabel);

            strip.append(label, faderRow, readout, btnRow, panRow);
            console_.appendChild(strip);
        });

        updateVuMeters();
    }

    function buildPanel(){
        injectStyle();
        const overlay = el('div', '');
        overlay.id = PANEL_ID + 'Overlay';
        const panel = el('div', '');
        panel.id = PANEL_ID;

        const head = el('div', 's936mix-head');
        const title = el('h2', '', '🎚 Consola de Canales');
        const note = el('div', 's936mix-note', 'Volumen y mute de cada parte del groove, en vivo. Piano/Ukelele son voces extra de práctica (apagadas por defecto).');
        head.append(title, note);

        const console_ = el('div', 's936mix-console');
        const footnote = el('div', 's936mix-footnote', 'Ajuste de esta sesión — no se guarda todavía junto con la canción.');
        const closeBtn = el('button', 's936mix-closebtn', 'Cerrar consola');
        closeBtn.onclick = close;

        panel.append(head, console_, footnote, closeBtn);
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
        if(vuInterval) clearInterval(vuInterval);
        vuInterval = setInterval(updateVuMeters, 220);
    }
    function close(){
        const overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(overlay) overlay.classList.remove('is-open');
        if(vuInterval){ clearInterval(vuInterval); vuInterval = null; }
    }
    function toggle(){
        const overlay = document.getElementById(PANEL_ID + 'Overlay');
        if(overlay && overlay.classList.contains('is-open')) close(); else open();
    }

    window.Studio936ChannelMixer = { open, close, toggle };
})();
