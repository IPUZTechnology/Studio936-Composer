// Studio 936 Composer - Piano Module
// Builds the visual/touch piano keyboard and wires note events back to app.js.

window.Studio936Piano = (() => {
'use strict';

function buildPiano(pianoEl, keyMap, onNote){
    if(!pianoEl) throw new Error('Studio936Piano: piano element not found.');
    if(!keyMap) throw new Error('Studio936Piano: keyMap is required.');
    if(typeof onNote !== 'function') throw new Error('Studio936Piano: onNote callback is required.');

    pianoEl.innerHTML = '';
    Object.keys(keyMap).forEach(k => delete keyMap[k]);

    const noteCfg = [
        {n:'C',b:false},{n:'C#',b:true},{n:'D',b:false},{n:'D#',b:true},
        {n:'E',b:false},{n:'F',b:false},{n:'F#',b:true},{n:'G',b:false},
        {n:'G#',b:true},{n:'A',b:false},{n:'A#',b:true},{n:'B',b:false}
    ];

    for(let i=24;i<=84;i++){
        const cfg = noteCfg[i%12];
        const k = document.createElement('div');
        k.className = 'key ' + (cfg.b ? 'black' : 'white');
        k.dataset.midi = i;

        if(!cfg.b && cfg.n === 'C'){
            k.textContent = 'C' + (Math.floor(i/12)-1);
        }

        pianoEl.appendChild(k);
        keyMap[i] = k;

        const down = e => {
            e.preventDefault();
            if(e.pointerId !== undefined && k.setPointerCapture){
                try{k.setPointerCapture(e.pointerId);}catch(err){}
            }
            onNote(i);
        };

        k.addEventListener('pointerdown', down);
        k.addEventListener('mousedown', e => {
            if(!window.PointerEvent){
                e.preventDefault();
                onNote(i);
            }
        });
        k.addEventListener('touchstart', e => {
            if(!window.PointerEvent){
                e.preventDefault();
                onNote(i);
            }
        }, {passive:false});
    }

    return keyMap;
}

return {
    buildPiano
};

})();
