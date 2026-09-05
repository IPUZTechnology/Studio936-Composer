// Studio 936 Composer — Supraconsola (Cambio 478)
//
// QUÉ ES: panel único que junta, en una sola pantalla, todo lo que hoy
// vive separado en dos botones (Mixer de canales + Pads de ritmo), más
// la rueda táctil y atajos rápidos — todo REAL y funcional, reusando
// exactamente el mismo Bridge que ya usaban esos dos paneles, sin
// duplicar lógica de audio.
//
// La parte de arriba (Deck A / Deck B / crossfader / efectos) es la
// visión completa que se acordó con Val — se dibuja entera, prolija,
// pero marcada como "Parte 2": no tiene ninguna función real todavía
// (es la consola de mezclar canciones completas / MP3s, un proyecto
// aparte, ver VISION_Supraconsola_Estudio.md). Ningún control de esa
// zona hace nada al tocarlo — están ahí para mostrar el plan completo,
// no para mentir sobre lo que hacen (por eso llevan el aviso explícito).
//
// Este archivo REEMPLAZA a los botones de Mixer y Pads por uno solo
// ("Consola"). suite-pro-channel-mixer.js y suite-pro-groove-pads.js
// siguen existiendo sin tocarse — este panel nuevo llama a las mismas
// funciones de Bridge que ellos, no los reemplaza por dentro.

(function(){
    'use strict';

    const PANEL_ID = 's936Supraconsole';
    const CHANNELS = [
        { key: 'drums',   label: 'Batería',              color: '#ff6b6b' },
        { key: 'bass',    label: 'Bajo',                 color: '#ffb020' },
        { key: 'chord',   label: 'Acordes',              color: '#00ffcc' },
        { key: 'solo',    label: 'Solo',                 color: '#00b3ff' },
        { key: 'piano',   label: 'Piano',                color: '#c792ff' },
        { key: 'ukulele', label: 'Ukelele',              color: '#ffe066' }
    ];
    const PADS = [
        { key: 'funk', label: 'Funk', color: '#00ffcc' }, { key: 'rock', label: 'Rock', color: '#ff6b6b' },
        { key: 'ballad', label: 'Balada', color: '#c792ff' }, { key: 'bossa', label: 'Bossa Nova', color: '#00b3ff' },
        { key: 'jazz', label: 'Jazz', color: '#ffb020' }, { key: 'blues', label: 'Blues', color: '#4d96ff' },
        { key: 'pop', label: 'Pop', color: '#ff8fd8' }, { key: 'bolero', label: 'Bolero', color: '#a0e0a0' },
        { key: 'salsa', label: 'Salsa', color: '#ffe066' }, { key: 'cumbia', label: 'Cumbia', color: '#ff9f4d' },
        { key: 'reggae', label: 'Reggae', color: '#7dffb3' },
        { key: 'trance', label: 'Trance', color: '#b967ff' }, { key: 'eurotrance', label: 'Eurotrance', color: '#ff2d95' },
        { key: 'electro', label: 'Electro (UK)', color: '#00e5ff' }, { key: 'house', label: 'House', color: '#ffb347' },
        { key: 'techno', label: 'Techno', color: '#d3d3d3' }, { key: 'dnb', label: 'Drum & Bass', color: '#5ee6a0' },
        { key: 'dubstep', label: 'Dubstep', color: '#7c5cff' }, { key: 'deephouse', label: 'Deep House', color: '#c58aff' },
        { key: 'afrobeats', label: 'Afrobeats', color: '#ff8c42' }, { key: 'dembow', label: 'Dembow', color: '#ff4d6d' }
    ];
    const INSTRUMENT_LABELS = {
        piano:'Piano', epiano:'Piano eléctrico', guitar:'Guitarra', guitarSteel:'Guitarra (cuerdas)',
        guitarElectric:'Guitarra Eléctrica', ukulele:'Ukelele', banjo:'Banjo', bass:'Bajo eléctrico',
        lead:'Guitarra Lead', drums:'Batería', organ:'Órgano', sax:'Saxo', synth:'Synth',
        violin:'Violín', trumpet:'Trompeta', cello:'Chelo', pad:'Pad'
    };
    const ELECTRONIC_STYLES = new Set(['trance','eurotrance','electro','house','techno','dnb','dubstep','deephouse','afrobeats','dembow']);
    const SUGGESTED_BPM = { trance:138, eurotrance:140, electro:128, house:124, techno:130, dnb:160, dubstep:140, deephouse:120, afrobeats:105, dembow:92 };
    const STEPS = 16;

    function bridge(){ return window.Studio936AppBridge || null; }
    function el(tag, className, text){ const n=document.createElement(tag); if(className) n.className=className; if(text!==undefined) n.textContent=text; return n; }

    function injectStyle(){
        if(document.getElementById(PANEL_ID+'Style')) return;
        const style = document.createElement('style');
        style.id = PANEL_ID+'Style';
        style.textContent = `
#${PANEL_ID}Overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.7);display:none;padding:0;}
#${PANEL_ID}Overlay.is-open{display:block;}
#${PANEL_ID}{position:absolute;width:min(760px,97vw);max-height:94vh;min-width:340px;min-height:320px;overflow-y:auto;resize:both;background:linear-gradient(180deg,#12161f 0%,#0a0d13 100%);border:1px solid rgba(0,255,204,.28);border-radius:18px;box-shadow:0 30px 90px rgba(0,0,0,.75);padding:16px 18px 14px;color:#e8f4f2;font-family:inherit;}
#${PANEL_ID} .sc-head{cursor:move;touch-action:none;}
#${PANEL_ID} h2{margin:0;font-size:.88rem;color:#00ffcc;font-weight:950;letter-spacing:1.4px;text-transform:uppercase;}
#${PANEL_ID} .sc-head{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:8px;margin-bottom:12px;}
#${PANEL_ID} .sc-closebtn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:8px 16px;color:#cfe0dd;font-size:.7rem;font-weight:700;cursor:pointer;min-width:34px;}
#${PANEL_ID} .sc-section-label{font-size:.56rem;color:#7d8d8a;font-weight:800;letter-spacing:.5px;margin:0 0 6px;text-transform:uppercase;}
#${PANEL_ID} .sc-instrument-row{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
#${PANEL_ID} .sc-instrument-select{flex:1;background:#05070a;border:1px solid rgba(255,255,255,.14);border-radius:8px;color:#cfe0dd;font-size:.66rem;padding:6px 8px;}
#${PANEL_ID} .sc-rec-note{font-size:.52rem;color:#5e6c6a;margin-bottom:6px;}
#${PANEL_ID} .sc-part2-badge{font-size:.54rem;color:#ffe066;background:rgba(255,216,77,.10);border:1px solid rgba(255,216,77,.35);padding:2px 8px;border-radius:999px;font-weight:700;}

/* Decks / crossfader / efectos - Parte 2, decorativo */
#${PANEL_ID} .sc-decks-row{display:flex;gap:10px;margin-bottom:10px;}
#${PANEL_ID} .sc-deck{flex:1;background:rgba(255,255,255,.025);border:1px dashed rgba(255,255,255,.15);border-radius:12px;padding:9px;text-align:center;}
#${PANEL_ID} .sc-deck-wheel{width:64px;height:64px;margin:0 auto 5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#242e37,#0a0d13 70%);border:2px solid rgba(255,255,255,.18);position:relative;}
#${PANEL_ID} .sc-deck-wave{height:16px;background:#05070a;border-radius:4px;margin:5px 0;display:flex;align-items:center;justify-content:center;gap:1px;padding:0 3px;opacity:.35;}
#${PANEL_ID} .sc-deck-wave span{width:2px;background:#9fb0ae;border-radius:1px;}
#${PANEL_ID} .sc-deck-btns{display:flex;gap:4px;justify-content:center;}
#${PANEL_ID} .sc-deck-btns div{width:24px;height:18px;border:1px solid rgba(255,255,255,.15);border-radius:4px;font-size:.44rem;display:flex;align-items:center;justify-content:center;color:#7d8d8a;}
#${PANEL_ID} .sc-xfader{height:9px;background:#05070a;border:1px solid rgba(255,255,255,.1);border-radius:5px;position:relative;margin:4px 0 3px;}
#${PANEL_ID} .sc-xfader-knob{position:absolute;left:50%;top:-4px;width:14px;height:16px;background:linear-gradient(180deg,#7d8d8a,#5a6663);border-radius:3px;transform:translateX(-50%);}
#${PANEL_ID} .sc-fx-row{display:flex;gap:7px;margin-bottom:4px;}
#${PANEL_ID} .sc-fx{flex:1;background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.13);border-radius:10px;padding:7px;text-align:center;}
#${PANEL_ID} .sc-fx-knob{width:26px;height:26px;margin:0 auto 4px;border-radius:50%;border:3px solid rgba(255,255,255,.13);border-top-color:rgba(197,138,255,.4);}
#${PANEL_ID} .sc-fx span{font-size:.48rem;color:#7d8d8a;}

/* Canales - real */
#${PANEL_ID} .sc-strips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;}
#${PANEL_ID} .sc-channels-row{display:flex;gap:14px;margin-bottom:12px;align-items:flex-start;}
#${PANEL_ID} .sc-icon-grid{flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px;align-content:start;min-width:140px;}
#${PANEL_ID} .sc-icon-btn{aspect-ratio:1/1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);border-radius:12px;color:#cfe0dd;font-size:.5rem;font-weight:800;cursor:pointer;text-align:center;padding:4px;}
#${PANEL_ID} .sc-icon-btn .sc-icon-glyph{font-size:1.3rem;line-height:1;}
#${PANEL_ID} .sc-icon-btn.is-live{background:rgba(0,255,204,.14);border-color:#00ffcc;color:#8affff;box-shadow:0 0 8px rgba(0,255,204,.35);}
#${PANEL_ID} .sc-icon-btn.sc-playbtn{background:rgba(0,255,204,.16);border-color:#00ffcc;color:#8affff;grid-column:span 2;}
#${PANEL_ID} .sc-icon-btn.sc-playbtn.is-playing{background:rgba(255,90,90,.16);border-color:#ff5a5a;color:#ffb0b0;}
#${PANEL_ID} .sc-icon-btn.sc-recbtn{background:rgba(255,90,90,.1);border-color:rgba(255,90,90,.4);color:#ffb0b0;}
#${PANEL_ID} .sc-icon-btn.sc-recbtn.is-recording{background:rgba(255,90,90,.22);border-color:#ff5a5a;color:#ffdada;box-shadow:0 0 10px rgba(255,90,90,.4);animation:scRecPulse 1.1s ease-in-out infinite;}
@keyframes scRecPulse{0%,100%{opacity:1;}50%{opacity:.6;}}
#${PANEL_ID} .sc-strip{flex:0 0 46px;display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:6px 4px;}
#${PANEL_ID} .sc-strip.is-muted{opacity:.5;}
#${PANEL_ID} .sc-strip-label{font-size:.52rem;font-weight:800;text-align:center;min-height:18px;color:#cfe0dd;margin-bottom:5px;}
#${PANEL_ID} .sc-fader-row{display:flex;align-items:flex-end;gap:5px;height:88px;margin-bottom:6px;}
#${PANEL_ID} .sc-vu{width:8px;height:88px;border-radius:4px;background:#05070a;border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column-reverse;overflow:hidden;padding:2px;gap:1px;}
#${PANEL_ID} .sc-vu-seg{width:100%;height:5px;border-radius:1px;background:rgba(255,255,255,.06);}
#${PANEL_ID} .sc-fader-track{position:relative;width:26px;height:88px;background:linear-gradient(180deg,#05070a,#0d1117);border:1px solid rgba(255,255,255,.09);border-radius:5px;display:flex;align-items:center;justify-content:center;}
#${PANEL_ID} .sc-fader{-webkit-appearance:none;appearance:none;width:80px;height:20px;background:transparent;transform:rotate(-90deg);margin:0;}
#${PANEL_ID} .sc-fader::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:16px;border-radius:3px;background:linear-gradient(180deg,#e8f4f2,#9fb0ae);border:1px solid #05070a;}
#${PANEL_ID} .sc-fader::-moz-range-thumb{width:30px;height:16px;border-radius:3px;background:linear-gradient(180deg,#e8f4f2,#9fb0ae);border:1px solid #05070a;}
#${PANEL_ID} .sc-mutebtn{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:6px 0;color:#9fb0ae;font-size:.5rem;font-weight:800;cursor:pointer;}
#${PANEL_ID} .sc-mutebtn.is-active{background:rgba(226,75,74,.2);border-color:#e24b4a;color:#ff8a89;}
#${PANEL_ID} .sc-pan-row{display:flex;align-items:center;gap:3px;width:100%;margin-top:6px;}
#${PANEL_ID} .sc-pan-label{font-size:.46rem;color:#7d8d8a;flex-shrink:0;font-weight:700;}
#${PANEL_ID} .sc-pan{flex:1;width:100%;accent-color:#ffe066;height:22px;}

/* Pads - real */
#${PANEL_ID} .sc-pads{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:5px;margin-bottom:12px;}
#${PANEL_ID} .sc-pad{aspect-ratio:1/.62;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#cfe0dd;font-size:.56rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;text-align:center;padding:3px;touch-action:manipulation;user-select:none;}
#${PANEL_ID} .sc-pad.is-active{color:#0a0d13;box-shadow:0 0 0 2px currentColor,0 0 14px 1px var(--pad-glow,rgba(0,255,204,.5));}
#${PANEL_ID} .sc-pad.is-flash{animation:scPadFlash .28s ease;}
@keyframes scPadFlash{0%{filter:brightness(2.1);}100%{filter:brightness(1);}}

/* Rueda + atajos - real */
#${PANEL_ID} .sc-bottom-row{display:flex;gap:10px;align-items:center;margin-bottom:6px;flex-wrap:wrap;}
#${PANEL_ID} .sc-wheel-outer{width:64px;height:64px;border-radius:50%;position:relative;background:radial-gradient(circle at 35% 30%,#23303a,#0a0d13 70%);border:1px solid rgba(255,255,255,.14);touch-action:none;cursor:grab;flex-shrink:0;}
#${PANEL_ID} .sc-wheel-outer:active{cursor:grabbing;}
#${PANEL_ID} .sc-wheel-tick{position:absolute;width:3px;height:8px;left:50%;top:4px;background:rgba(255,255,255,.16);border-radius:2px;transform-origin:1.5px 28px;}
#${PANEL_ID} .sc-wheel-tick.is-lit{background:#00ffcc;box-shadow:0 0 6px #00ffcc;}
#${PANEL_ID} .sc-wheel-knob{position:absolute;inset:9px;border-radius:50%;background:linear-gradient(160deg,#2a3742,#0d1117 65%);border:1px solid rgba(255,255,255,.1);}
#${PANEL_ID} .sc-wheel-note{font-size:.52rem;color:#7d8d8a;flex:1;}
#${PANEL_ID} .sc-shortcut{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:9px 14px;color:#cfe0dd;font-size:.66rem;font-weight:800;cursor:pointer;white-space:nowrap;}
#${PANEL_ID} .sc-playbtn{background:rgba(0,255,204,.16);border:2px solid #00ffcc;border-radius:10px;padding:9px 18px;color:#8affff;font-size:.7rem;font-weight:900;cursor:pointer;white-space:nowrap;}
#${PANEL_ID} .sc-playbtn.is-playing{background:rgba(255,90,90,.16);border-color:#ff5a5a;color:#ffb0b0;}
#${PANEL_ID} .sc-shortcut.is-live{background:rgba(0,255,204,.14);border-color:#00ffcc;color:#8affff;box-shadow:0 0 8px rgba(0,255,204,.35);}
`;
        document.head.appendChild(style);
    }

    // ---- Rueda (misma lógica que suite-pro-groove-pads.js) ----
    let wheelAngle=0, wheelLastStep=-1, wheelDragging=false, wheelStartAngle=0, wheelStartPointerAngle=0;
    function stepFromAngle(a){ const n=((a%360)+360)%360; return Math.floor(n/(360/STEPS))%STEPS; }
    function fireStep(step){
        try{ const ctx=window.__studio936AudioCtx; bridge()?.scheduleDrumStep?.(null, step, ctx?ctx.currentTime:0); }catch(_){}
        const panel=document.getElementById(PANEL_ID); if(!panel) return;
        panel.querySelectorAll('.sc-wheel-tick').forEach((t,i)=>t.classList.toggle('is-lit', i===step));
        setTimeout(()=>{ const t=panel.querySelector(`.sc-wheel-tick[data-step="${step}"]`); if(t) t.classList.remove('is-lit'); },150);
    }
    function pointerAngle(evt, elRef){ const r=elRef.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2; return Math.atan2(evt.clientY-cy, evt.clientX-cx)*180/Math.PI; }
    function bindWheel(wheelEl, knobEl){
        wheelEl.addEventListener('pointerdown', evt=>{ wheelDragging=true; wheelEl.setPointerCapture(evt.pointerId); wheelStartPointerAngle=pointerAngle(evt,wheelEl); wheelStartAngle=wheelAngle; });
        wheelEl.addEventListener('pointermove', evt=>{
            if(!wheelDragging) return;
            const now=pointerAngle(evt,wheelEl); wheelAngle=wheelStartAngle+(now-wheelStartPointerAngle);
            knobEl.style.transform=`rotate(${wheelAngle}deg)`;
            const step=stepFromAngle(wheelAngle);
            if(step!==wheelLastStep){ wheelLastStep=step; fireStep(step); }
        });
        const end=()=>{ wheelDragging=false; };
        wheelEl.addEventListener('pointerup', end); wheelEl.addEventListener('pointercancel', end);
    }

    // ---- VU meters (canales) ----
    let vuInterval=null;
    const VU_SEGMENTS=12;
    function updateVu(){
        const panel=document.getElementById(PANEL_ID); if(!panel) return;
        const mix=bridge()?.getChannelMix?.()||{};
        const chordLabelEl=panel.querySelector('.sc-strip[data-key="chord"] .sc-strip-label');
        if(chordLabelEl) chordLabelEl.textContent=chordChannelLabel();
        CHANNELS.forEach(ch=>{
            const vuEl=panel.querySelector(`.sc-vu[data-ch="${ch.key}"]`); if(!vuEl) return;
            const st=mix[ch.key]||{mute:false,vol:1};
            const base=st.mute?0:(st.vol??1);
            const level=Math.max(0,Math.min(1, base + (st.mute?0:(Math.random()*.2-.1))));
            const lit=Math.round(level*VU_SEGMENTS);
            [...vuEl.children].forEach((seg,i)=>{
                const on=i<lit;
                if(on){ const pct=i/VU_SEGMENTS; seg.style.background = pct>.8?'#ff5a5a':pct>.6?'#ffcc4d':ch.color; }
                else seg.style.background='rgba(255,255,255,.06)';
            });
        });
    }

    // Cambio 481: el canal "chord" recibe el audio de CUALQUIER
    // instrumento activo (guitarra, órgano, sax, etc. — todos comparten
    // ese canal, ver conversación con Val). Antes decía siempre
    // "Acordes"; ahora muestra el nombre real del instrumento activo,
    // más honesto sobre qué está controlando de verdad ese fader. Se
    // queda como "Acordes" solo si el instrumento activo es Batería o
    // Bajo (esos ya tienen su propio canal dedicado, no pasan por acá).
    function chordChannelLabel(){
        const inst = bridge()?.getInstrument?.() || '';
        if(inst === 'drums' || inst === 'bass' || !INSTRUMENT_LABELS[inst]) return 'Acordes';
        return INSTRUMENT_LABELS[inst];
    }

    function renderChannels(container){
        container.innerHTML='';
        const mix=bridge()?.getChannelMix?.()||{};
        CHANNELS.forEach(ch=>{
            const st=mix[ch.key]||{mute:false,vol:1,pan:0};
            const strip=el('div','sc-strip'+(st.mute?' is-muted':''));
            strip.dataset.key=ch.key;
            const label = ch.key==='chord' ? chordChannelLabel() : ch.label;
            strip.appendChild(el('div','sc-strip-label',label));
            const row=el('div','sc-fader-row');
            const vu=el('div','sc-vu'); vu.dataset.ch=ch.key;
            for(let i=0;i<VU_SEGMENTS;i++) vu.appendChild(el('div','sc-vu-seg'));
            const track=el('div','sc-fader-track');
            const fader=document.createElement('input');
            fader.type='range'; fader.min='0'; fader.max='100'; fader.value=String(Math.round((st.vol??1)*100));
            fader.className='sc-fader';
            fader.oninput=()=>bridge()?.setChannelVolume?.(ch.key, Number(fader.value)/100);
            track.appendChild(fader);
            row.append(vu,track);
            const muteBtn=el('button','sc-mutebtn'+(st.mute?' is-active':''),'MUTE');
            muteBtn.onclick=()=>{ bridge()?.setChannelMute?.(ch.key, !st.mute); renderChannels(container); };
            const panRow=el('div','sc-pan-row');
            const lLabel=el('span','sc-pan-label','L');
            const panSlider=document.createElement('input');
            panSlider.type='range'; panSlider.min='-100'; panSlider.max='100'; panSlider.value=String(Math.round((st.pan??0)*100));
            panSlider.className='sc-pan'; panSlider.title='Panorama';
            panSlider.oninput=()=>bridge()?.setChannelPan?.(ch.key, Number(panSlider.value)/100);
            const rLabel=el('span','sc-pan-label','R');
            panRow.append(lLabel, panSlider, rLabel);
            strip.append(row, muteBtn, panRow);
            container.appendChild(strip);
        });
    }

    function currentStyle(){ try{ return bridge()?.getStyle?.()||''; }catch(_){ return ''; } }
    function refreshPads(container){
        const active=currentStyle();
        container.querySelectorAll('.sc-pad').forEach(p=>p.classList.toggle('is-active', p.dataset.key===active));
    }
    function triggerPad(padEl, key, container){
        const ok=bridge()?.setStyle?.(key); if(!ok) return;
        if(ELECTRONIC_STYLES.has(key)) bridge()?.setInstrument?.('synth');
        if(SUGGESTED_BPM[key] && typeof window.setBPM==='function') window.setBPM(SUGGESTED_BPM[key]);
        padEl.classList.add('is-flash'); setTimeout(()=>padEl.classList.remove('is-flash'),280);
        refreshPads(container);
    }

    function renderPads(container){
        container.innerHTML='';
        PADS.forEach(pad=>{
            const btn=el('button','sc-pad',pad.label);
            btn.dataset.key=pad.key; btn.style.setProperty('--pad-glow',pad.color); btn.style.borderColor=pad.color+'55';
            btn.onclick=()=>triggerPad(btn,pad.key,container);
            container.appendChild(btn);
        });
        refreshPads(container);
    }

    // ---- Atajos: cuadraditos con ícono (Cambio 485) ----
    function metroIsOn(){ const b=document.getElementById('metroBtn'); return !!b && (b.classList.contains('active') || /ON/i.test(b.textContent||'')); }
    function iconBtn(glyph, label, extraClass){
        const btn=el('button','sc-icon-btn'+(extraClass?(' '+extraClass):''));
        btn.appendChild(el('div','sc-icon-glyph',glyph));
        btn.appendChild(el('div','',label));
        return btn;
    }
    function bindShortcuts(grid){
        // Cambio 484/485: Play/Stop real, ahora como ícono cuadrado —
        // toca el mismo playBtn de siempre (unifiedPlayToggle en
        // app.js), no inventa una reproducción aparte.
        const playing0 = !!bridge()?.isMainPlaying?.();
        const playBtn=iconBtn(playing0?'⏹':'▶', playing0?'Detener':'Reproducir', 'sc-playbtn'+(playing0?' is-playing':''));
        playBtn.onclick=()=>{
            document.getElementById('playBtn')?.click();
            setTimeout(()=>{
                const playing = !!bridge()?.isMainPlaying?.();
                playBtn.querySelector('.sc-icon-glyph').textContent = playing?'⏹':'▶';
                playBtn.lastChild.textContent = playing?'Detener':'Reproducir';
                playBtn.classList.toggle('is-playing', playing);
            }, 80);
        };
        grid.appendChild(playBtn);

        const metroBtn=iconBtn('🎵','Metrónomo', metroIsOn()?'is-live':'');
        metroBtn.onclick=()=>{ document.getElementById('metroBtn')?.click(); setTimeout(()=>{ metroBtn.classList.toggle('is-live', metroIsOn()); },80); };
        grid.appendChild(metroBtn);

        const drumStartBtn=iconBtn('🥁','Iniciar batería');
        drumStartBtn.onclick=()=>{ const mod=window.Studio936SuiteProModules?.drums || window.Studio936SuiteProDrums; if(mod?.start) mod.start(); };
        grid.appendChild(drumStartBtn);

        const drumStopBtn=iconBtn('⏸','Detener batería');
        drumStopBtn.onclick=()=>{ const mod=window.Studio936SuiteProModules?.drums || window.Studio936SuiteProDrums; if(mod?.stop) mod.stop(); };
        grid.appendChild(drumStopBtn);

        // Cambio 482: atajo a MIDI IN Pro (suite-pro-midi.js) — módulo
        // real, ya conecta teclados/pianos MIDI reales vía Web MIDI API
        // y suena con el instrumento activo (Cambio 146, confirmado
        // funcionando). Este botón solo navega hacia ese panel real, no
        // duplica nada de la lógica de MIDI.
        const midiBtn=iconBtn('🎹','Conectar MIDI');
        midiBtn.onclick=()=>{ window.Studio936SuitePro?.openStudioTool?.('midi'); };
        grid.appendChild(midiBtn);

        // Cambio 487: REC ahora usa el Centro de Grabación compartido
        // (suite-pro-record-hub.js) — antes esta lógica estaba
        // duplicada acá adentro, y siempre grababa instrumento+voz+video
        // juntos sin preguntar. Ahora pregunta qué modo, y el mismo
        // centro lo comparte con el botón REC principal (junto a Play).
        const recBtn=iconBtn('⏺','REC','sc-recbtn');
        recBtn.onclick=()=>window.Studio936RecordHub?.toggleFromButton?.(recBtn);
        window.Studio936RecordHub?.onChange?.(recording=>{
            recBtn.classList.toggle('is-recording', recording);
            recBtn.querySelector('.sc-icon-glyph').textContent = recording ? '⏹' : '⏺';
        });
        grid.appendChild(recBtn);
    }

    function buildDecksPart2(container){
        const row=el('div','sc-decks-row');
        ['A','B'].forEach(id=>{
            const deck=el('div','sc-deck');
            const wheel=el('div','sc-deck-wheel');
            deck.appendChild(wheel);
            deck.appendChild(el('div','',('Deck '+id)));
            const wave=el('div','sc-deck-wave');
            for(let i=0;i<18;i++){ const bar=el('span'); bar.style.height=(4+Math.abs(Math.sin(i+ (id==='B'?1:0)))*9)+'px'; wave.appendChild(bar); }
            deck.appendChild(wave);
            const btns=el('div','sc-deck-btns');
            btns.appendChild(el('div','','▶')); btns.appendChild(el('div','','CUE'));
            deck.appendChild(btns);
            row.appendChild(deck);
        });
        container.appendChild(row);
        const xfader=el('div','sc-xfader'); xfader.appendChild(el('div','sc-xfader-knob'));
        container.appendChild(xfader);
        const xlabel=el('div',''); xlabel.style.cssText='display:flex;justify-content:space-between;font-size:.46rem;color:#5e6c6a;margin-bottom:10px;';
        xlabel.append(el('span','','A'), el('span','','CROSSFADER'), el('span','','B'));
        container.appendChild(xlabel);
    }
    function buildFxPart2(container){
        const row=el('div','sc-fx-row');
        ['Reverb','Delay','Filtro','Distorsión'].forEach(fx=>{
            const card=el('div','sc-fx');
            card.appendChild(el('div','sc-fx-knob'));
            card.appendChild(el('span','',fx));
            row.appendChild(card);
        });
        container.appendChild(row);
    }

    function buildPanel(){
        injectStyle();
        const overlay=el('div',''); overlay.id=PANEL_ID+'Overlay';
        const panel=el('div',''); panel.id=PANEL_ID;

        const head=el('div','sc-head');
        head.appendChild(el('h2','','🎛 Supraconsola'));
        const headBtns=el('div',''); headBtns.style.cssText='display:flex;gap:6px;';
        const minBtn=el('button','sc-closebtn','—');
        minBtn.title='Minimizar';
        minBtn.onclick=()=>{
            const body=panel.querySelectorAll(':scope > *:not(.sc-head)');
            const minimized=panel.classList.toggle('is-minimized');
            body.forEach(node=>{ node.style.display = minimized ? 'none' : ''; });
            panel.style.resize = minimized ? 'none' : 'both';
            panel.style.maxHeight = minimized ? 'none' : '94vh';
        };
        const closeBtn=el('button','sc-closebtn','Cerrar');
        closeBtn.onclick=close;
        headBtns.append(minBtn, closeBtn);
        head.appendChild(headBtns);

        // Cambio 479: arrastrar el panel tomándolo del header — consola
        // flotante de verdad, no fija al centro. El tamaño se ajusta con
        // el "resize:both" nativo del navegador (esquina inferior
        // derecha), y "Minimizar" colapsa todo menos el header.
        let dragging=false, dragStartX=0, dragStartY=0, panelStartLeft=0, panelStartTop=0;
        head.addEventListener('pointerdown', evt=>{
            if(evt.target.closest('button')) return;
            dragging=true; head.setPointerCapture(evt.pointerId);
            dragStartX=evt.clientX; dragStartY=evt.clientY;
            const rect=panel.getBoundingClientRect();
            panelStartLeft=rect.left; panelStartTop=rect.top;
        });
        head.addEventListener('pointermove', evt=>{
            if(!dragging) return;
            const nx=panelStartLeft+(evt.clientX-dragStartX), ny=panelStartTop+(evt.clientY-dragStartY);
            panel.style.left=Math.max(0,nx)+'px'; panel.style.top=Math.max(0,ny)+'px';
        });
        head.addEventListener('pointerup', ()=>{ dragging=false; });

        const decksLabelRow=el('div',''); decksLabelRow.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
        decksLabelRow.appendChild(el('div','sc-section-label','Deck A / Deck B / Efectos'));
        decksLabelRow.appendChild(el('div','sc-part2-badge','Parte 2 — próximamente'));
        const decksZone=el('div','');
        buildDecksPart2(decksZone);
        const fxZone=el('div','');
        buildFxPart2(fxZone);

        const chLabel=el('div','sc-section-label','Canales');
        const instRow=el('div','sc-instrument-row');
        const instSelect=document.createElement('select');
        instSelect.className='sc-instrument-select';
        Object.entries(INSTRUMENT_LABELS).forEach(([val,label])=>{
            const opt=document.createElement('option'); opt.value=val; opt.textContent=label; instSelect.appendChild(opt);
        });
        instSelect.value = bridge()?.getInstrument?.() || 'piano';
        instSelect.onchange=()=>{ bridge()?.setInstrument?.(instSelect.value); renderChannels(strips); };
        instRow.append(el('span','sc-rec-note','Instrumento activo:'), instSelect);
        const strips=el('div','sc-strips');
        const iconGrid=el('div','sc-icon-grid');
        bindShortcuts(iconGrid);
        const channelsRow=el('div','sc-channels-row');
        channelsRow.append(strips, iconGrid);

        const recLabel=el('div','sc-section-label','Pistas grabadas (sección en reproducción)');
        const recNote=el('div','sc-rec-note','');
        const recStrips=el('div','sc-strips');

        const padsLabel=el('div','sc-section-label','Pads de ritmo');
        const pads=el('div','sc-pads');

        const bottomRow=el('div','sc-bottom-row');
        const wheelOuter=el('div','sc-wheel-outer');
        for(let i=0;i<STEPS;i++){ const t=el('div','sc-wheel-tick'); t.dataset.step=String(i); t.style.transform=`rotate(${i*(360/STEPS)}deg)`; wheelOuter.appendChild(t); }
        const wheelKnob=el('div','sc-wheel-knob'); wheelOuter.appendChild(wheelKnob);
        bindWheel(wheelOuter, wheelKnob);
        bottomRow.append(wheelOuter, el('div','sc-wheel-note','Rueda táctil — arrastrá para tocar el patrón de batería paso a paso.'));

        panel.append(head, decksLabelRow, decksZone, fxZone, chLabel, instRow, channelsRow, recLabel, recNote, recStrips, padsLabel, pads, bottomRow);
        overlay.appendChild(panel);
        overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
        document.body.appendChild(overlay);

        renderChannels(strips);
        renderPads(pads);
        renderRecordedChannels(recStrips, recNote);
        return overlay;
    }

    // Cambio 483: canales de las pistas YA GRABADAS en la sección que
    // está sonando ahora mismo (Vista Continua) — usa la API nueva de
    // suite-pro-track-recorder.js (getCurrentPlaybackSection,
    // listRecordedInstruments, getLaneStateExternal, setLaneVolume,
    // setLaneMute, setLanePan). Si no hay ninguna sección reproduciéndose
    // ahora, no hay nada real que controlar — se muestra un aviso en vez
    // de canales vacíos/decorativos.
    function renderRecordedChannels(container, noteEl){
        container.innerHTML='';
        const rec = window.Studio936TrackRecorder;
        const sectionKey = rec?.getCurrentPlaybackSection?.();
        if(!rec || !sectionKey){
            noteEl.textContent = 'No hay ninguna sección con pistas grabadas reproduciéndose ahora mismo.';
            return;
        }
        const instruments = rec.listRecordedInstruments(sectionKey) || [];
        if(!instruments.length){
            noteEl.textContent = 'Esta sección no tiene tomas grabadas todavía.';
            return;
        }
        noteEl.textContent = '';
        instruments.forEach(instrumentId=>{
            const st = rec.getLaneStateExternal(sectionKey, instrumentId);
            const label = INSTRUMENT_LABELS[instrumentId] || instrumentId;
            const strip=el('div','sc-strip'+(st.muted?' is-muted':''));
            strip.appendChild(el('div','sc-strip-label',label));
            const row=el('div','sc-fader-row');
            const track=el('div','sc-fader-track');
            const fader=document.createElement('input');
            fader.type='range'; fader.min='0'; fader.max='100'; fader.value=String(Math.round(st.volume*100));
            fader.className='sc-fader';
            fader.oninput=()=>rec.setLaneVolume(sectionKey, instrumentId, Number(fader.value)/100);
            track.appendChild(fader);
            row.appendChild(track);
            const muteBtn=el('button','sc-mutebtn'+(st.muted?' is-active':''),'MUTE');
            muteBtn.onclick=()=>{ rec.setLaneMute(sectionKey, instrumentId, !st.muted); renderRecordedChannels(container, noteEl); };
            const panRow=el('div','sc-pan-row');
            const panSlider=document.createElement('input');
            panSlider.type='range'; panSlider.min='-100'; panSlider.max='100'; panSlider.value=String(Math.round(st.pan*100));
            panSlider.className='sc-pan';
            panSlider.oninput=()=>rec.setLanePan(sectionKey, instrumentId, Number(panSlider.value)/100);
            panRow.append(el('span','sc-pan-label','L'), panSlider, el('span','sc-pan-label','R'));
            strip.append(row, muteBtn, panRow);
            container.appendChild(strip);
        });
    }

    function open(){
        let overlay=document.getElementById(PANEL_ID+'Overlay');
        if(!overlay) overlay=buildPanel();
        overlay.classList.add('is-open');
        const panel=document.getElementById(PANEL_ID);
        if(panel && !panel.dataset.positioned){
            const w=panel.offsetWidth||760, h=panel.offsetHeight||500;
            panel.style.left=Math.max(0,(window.innerWidth-w)/2)+'px';
            panel.style.top=Math.max(0,(window.innerHeight-h)/2)+'px';
            panel.dataset.positioned='1';
        }
        const allStrips = overlay.querySelectorAll('.sc-strips');
        renderChannels(allStrips[0]);
        renderPads(overlay.querySelector('.sc-pads'));
        const recNoteEl = overlay.querySelector('.sc-rec-note');
        renderRecordedChannels(allStrips[1], recNoteEl);
        if(vuInterval) clearInterval(vuInterval);
        vuInterval=setInterval(()=>{
            updateVu();
            renderRecordedChannels(overlay.querySelector('.sc-strips:last-of-type'), overlay.querySelector('.sc-rec-note'));
            const playBtn=overlay.querySelector('.sc-playbtn');
            if(playBtn){
                const playing=!!bridge()?.isMainPlaying?.();
                const glyphEl=playBtn.querySelector('.sc-icon-glyph');
                if(glyphEl){ glyphEl.textContent = playing ? '⏹' : '▶'; playBtn.lastChild.textContent = playing ? 'Detener' : 'Reproducir'; }
                playBtn.classList.toggle('is-playing', playing);
            }
        }, 1500);
    }
    function close(){
        const overlay=document.getElementById(PANEL_ID+'Overlay');
        if(overlay) overlay.classList.remove('is-open');
        if(vuInterval){ clearInterval(vuInterval); vuInterval=null; }
    }
    function toggle(){
        const overlay=document.getElementById(PANEL_ID+'Overlay');
        if(overlay && overlay.classList.contains('is-open')) close(); else open();
    }

    window.Studio936Supraconsole = { open, close, toggle };
})();
