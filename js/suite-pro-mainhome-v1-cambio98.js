// Studio 936 Composer — Main Home v1 (Cambio 98)
//
// QUÉ ES: el primer esqueleto de la pantalla "Main Home" propuesta en la
// reingeniería (Fase 2, sobre la Fase 0/1 ya iniciada con el Bridge del
// Cambio 96-97). Es una interfaz nueva e independiente que NO reimplementa
// nada de app.js — solo llama a los métodos de window.Studio936AppBridge.
//
// QUÉ NO ES TODAVÍA: no reemplaza a #v25UxBar (el menú viejo sigue intacto
// y visible, tal como se acordó — "no importa dejarlo" por ahora). Este
// archivo convive con él. El día que Main Home cubra el 100% de lo que
// hace #v25UxBar, se apaga esa barra vieja (sin borrar app.js).
//
// REGLAS RESPETADAS:
// - No toca app.js, structure.js, chart.js, compose.js, suite-pro.js, midi.js.
// - Un solo archivo nuevo, completo, con su propio namespace (#s936MainHome).
// - Si el Bridge no está cargado (orden de scripts, o falla de app.js),
//   este módulo se degrada a un aviso, no rompe nada más de la página.
// - Badge de versión visible, mismo patrón que los otros módulos.

(function(){
    'use strict';

    const VERSION = 'MAIN HOME CAMBIO 98';
    const ROOT_ID = 's936MainHome';

    function bridge(){
        return window.Studio936AppBridge || null;
    }

    function el(tag, className, text){
        const node = document.createElement(tag);
        if(className) node.className = className;
        if(text !== undefined) node.textContent = text;
        return node;
    }

    function injectStyle(){
        if(document.getElementById(ROOT_ID + 'Style')) return;
        const style = document.createElement('style');
        style.id = ROOT_ID + 'Style';
        style.textContent = `
#${ROOT_ID}Toggle {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 10000;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,224,102,.4);
  background: rgba(10,14,20,.92);
  color: #ffe066;
  font-size: .78rem;
  font-weight: 900;
  letter-spacing: .3px;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0,0,0,.35);
}
#${ROOT_ID}Toggle:hover { background: rgba(20,26,34,.95); }
#${ROOT_ID}Panel {
  position: fixed;
  right: 12px;
  bottom: 60px;
  z-index: 10000;
  width: 280px;
  max-height: 70vh;
  overflow-y: auto;
  background: rgba(10,14,20,.97);
  border: 1px solid rgba(0,255,204,.3);
  border-radius: 14px;
  padding: 14px;
  color: #e8f4f2;
  font-family: inherit;
  font-size: .82rem;
  box-shadow: 0 8px 28px rgba(0,0,0,.45);
}
#${ROOT_ID}Panel.is-hidden { display: none; }
#${ROOT_ID}Panel h3 { margin: 0 0 2px; font-size: .95rem; color: #7dffe0; }
#${ROOT_ID}Panel .s936mh-badge {
  display: inline-block;
  margin-bottom: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(0,255,204,.35);
  background: rgba(0,255,204,.08);
  color: #7dffe0;
  font-size: .56rem;
  font-weight: 900;
  letter-spacing: .3px;
  text-transform: uppercase;
}
#${ROOT_ID}Panel .s936mh-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
#${ROOT_ID}Panel label {
  display: block;
  font-size: .68rem;
  color: #9fb0ae;
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: .3px;
}
#${ROOT_ID}Panel button {
  flex: 1 1 auto;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255,224,102,.3);
  background: rgba(255,224,102,.08);
  color: #ffe066;
  font-size: .72rem;
  font-weight: 700;
  cursor: pointer;
}
#${ROOT_ID}Panel button:hover { background: rgba(255,224,102,.16); }
#${ROOT_ID}Panel select,
#${ROOT_ID}Panel input {
  width: 100%;
  padding: 5px 7px;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.06);
  color: #e8f4f2;
  font-size: .78rem;
  box-sizing: border-box;
}
#${ROOT_ID}Panel .s936mh-status {
  margin-top: 10px;
  font-size: .68rem;
  color: #9fb0ae;
  min-height: 14px;
}
#${ROOT_ID}Panel .s936mh-warn {
  color: #ff9f6b;
  font-size: .74rem;
}
`;
        document.head.appendChild(style);
    }

    function buildPanel(){
        const panel = el('div', '');
        panel.id = ROOT_ID + 'Panel';
        panel.classList.add('is-hidden');

        const title = el('h3', '', 'Main Home');
        panel.appendChild(title);

        const badge = el('div', 's936mh-badge', VERSION);
        panel.appendChild(badge);

        if(!bridge()){
            const warn = el('div', 's936mh-warn',
                'Studio936AppBridge no está disponible todavía. Verifica el orden de scripts en index.html (app.js debe cargar antes que este archivo).');
            panel.appendChild(warn);
            return panel;
        }

        const status = el('div', 's936mh-status', '');
        function setStatus(msg){ status.textContent = msg; }
        function call(label, fn){
            try {
                const result = fn();
                setStatus(`${label}: ${result === false ? 'sin efecto' : 'ok'}`);
            } catch(error){
                setStatus(`${label}: error — ${error.message || error}`);
            }
        }

        // Transporte
        const transportRow = el('div', 's936mh-row');
        const startBtn = el('button', '', 'Start Groove');
        startBtn.onclick = () => call('Start Groove', () => bridge().startGroove());
        const stopBtn = el('button', '', 'Stop');
        stopBtn.onclick = () => call('Stop', () => bridge().stopPlayback());
        const playSongBtn = el('button', '', 'Escuchar canción');
        playSongBtn.onclick = () => call('Escuchar canción', () => bridge().playFullSong());
        transportRow.append(startBtn, stopBtn, playSongBtn);
        panel.appendChild(transportRow);

        // Instrumento
        const instWrap = el('div', 's936mh-row');
        instWrap.style.flexDirection = 'column';
        const instLabel = el('label', '', 'Instrumento');
        const instSelect = document.createElement('select');
        [['piano','Piano'],['guitar','Guitarra'],['bass','Bajo'],['lead','Guitarra Lead'],['drums','Batería'],['ukulele','Ukelele']]
            .forEach(([value,label]) => {
                const opt = document.createElement('option');
                opt.value = value; opt.textContent = label;
                instSelect.appendChild(opt);
            });
        instSelect.onchange = () => call('Instrumento', () => bridge().setInstrument(instSelect.value));
        instWrap.append(instLabel, instSelect);
        panel.appendChild(instWrap);

        // Tono
        const keyWrap = el('div', 's936mh-row');
        keyWrap.style.flexDirection = 'column';
        const keyLabel = el('label', '', 'Tono');
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.placeholder = 'C, G, Am...';
        keyInput.onchange = () => call('Tono', () => bridge().setKey(keyInput.value));
        keyWrap.append(keyLabel, keyInput);
        panel.appendChild(keyWrap);

        // BPM
        const bpmWrap = el('div', 's936mh-row');
        bpmWrap.style.flexDirection = 'column';
        const bpmLabel = el('label', '', 'BPM');
        const bpmInput = document.createElement('input');
        bpmInput.type = 'number';
        bpmInput.min = '60'; bpmInput.max = '160'; bpmInput.placeholder = '95';
        bpmInput.onchange = () => call('BPM', () => bridge().setBPM(bpmInput.value));
        bpmWrap.append(bpmLabel, bpmInput);
        panel.appendChild(bpmWrap);

        // Navegación rápida
        const navRow = el('div', 's936mh-row');
        const navButtons = [
            ['Editor', () => bridge().openEditor()],
            ['Estructura', () => bridge().openStructure()],
            ['Exportar', () => bridge().openExport()],
            ['Letra', () => bridge().openLyrics()],
            ['Ayuda', () => bridge().openHelp()]
        ];
        navButtons.forEach(([label, fn]) => {
            const btn = el('button', '', label);
            btn.onclick = () => call(label, fn);
            navRow.appendChild(btn);
        });
        panel.appendChild(navRow);

        panel.appendChild(status);
        return panel;
    }

    function mount(){
        if(document.getElementById(ROOT_ID + 'Toggle')) return;
        injectStyle();

        const toggle = el('button', '', '🏠 Main Home');
        toggle.id = ROOT_ID + 'Toggle';
        toggle.type = 'button';

        const panel = buildPanel();

        toggle.onclick = () => panel.classList.toggle('is-hidden');

        (document.body || document.documentElement).append(toggle, panel);
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }

    window.Studio936MainHome = { version: VERSION, mount };
})();
