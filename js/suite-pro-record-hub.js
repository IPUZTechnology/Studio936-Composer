// Studio 936 Composer — Centro de Grabación (Cambio 487)
//
// QUÉ ES: la lógica real de REC (instrumento+voz vía
// suite-pro-track-recorder.js, y cámara nueva vía getUserMedia) vivía
// duplicada dentro de suite-pro-supraconsole.js. Se centraliza acá para
// que TANTO el botón principal (junto a Play, arriba) COMO el botón de
// la Consola llamen a la misma lógica, sin repetirla. Además, ahora
// pregunta qué grabar en vez de grabar siempre las tres cosas juntas.

(function(){
    'use strict';

    const PANEL_ID = 's936RecordHub';
    let camStream=null, camRecorder=null, camChunks=[];
    let recordingMode=null; // null | 'instrument' | 'instrument+video'
    const listeners=[];

    function notify(){ listeners.forEach(fn=>{ try{ fn(isRecording()); }catch(_){} }); }
    function onChange(fn){ listeners.push(fn); }

    function isRecording(){
        const rec=window.Studio936TrackRecorder;
        return !!(rec?.isRecordingActive?.() || (camRecorder && camRecorder.state==='recording'));
    }

    function injectStyle(){
        if(document.getElementById(PANEL_ID+'Style')) return;
        const style=document.createElement('style');
        style.id=PANEL_ID+'Style';
        style.textContent=`
#${PANEL_ID}Menu{position:fixed;z-index:10002;background:linear-gradient(180deg,#12161f,#0a0d13);border:1px solid rgba(255,90,90,.4);border-radius:12px;padding:10px;box-shadow:0 16px 40px rgba(0,0,0,.6);display:none;min-width:200px;font-family:inherit;}
#${PANEL_ID}Menu.is-open{display:block;}
#${PANEL_ID}Menu .rh-title{font-size:.6rem;color:#ff9d9d;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
#${PANEL_ID}Menu button{display:block;width:100%;text-align:left;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;color:#e8f4f2;font-size:.66rem;font-weight:700;cursor:pointer;margin-bottom:6px;}
#${PANEL_ID}Menu button:last-child{margin-bottom:0;}
#${PANEL_ID}Menu button:hover{background:rgba(255,90,90,.12);border-color:rgba(255,90,90,.4);}
.sc-cam-preview{position:fixed;bottom:14px;right:14px;width:150px;border-radius:10px;overflow:hidden;border:2px solid #ff5a5a;box-shadow:0 8px 24px rgba(0,0,0,.6);z-index:10001;display:none;}
.sc-cam-preview.is-active{display:block;}
.sc-cam-preview video{width:100%;display:block;background:#000;}
.sc-cam-download{display:block;text-align:center;font-size:.6rem;color:#8affff;background:rgba(0,255,204,.1);padding:5px;text-decoration:none;}
#mainRecBtn.is-recording{background:rgba(255,90,90,.25) !important;box-shadow:0 0 10px rgba(255,90,90,.5);animation:scRecPulseMain 1.1s ease-in-out infinite;}
@keyframes scRecPulseMain{0%,100%{opacity:1;}50%{opacity:.55;}}
`;
        document.head.appendChild(style);
    }

    function ensureCamPreview(){
        let preview=document.getElementById(PANEL_ID+'CamPreview');
        if(preview) return preview;
        preview=document.createElement('div'); preview.className='sc-cam-preview'; preview.id=PANEL_ID+'CamPreview';
        const video=document.createElement('video');
        const dl=document.createElement('a'); dl.className='sc-cam-download'; dl.style.display='none';
        preview.append(video, dl);
        document.body.appendChild(preview);
        return preview;
    }

    async function startCamera(){
        try{
            camStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
            const preview=ensureCamPreview();
            const video=preview.querySelector('video');
            video.srcObject=camStream; video.muted=true; video.controls=false; video.play().catch(()=>{});
            preview.classList.add('is-active');
            preview.querySelector('.sc-cam-download').style.display='none';
            camChunks=[];
            camRecorder=new MediaRecorder(camStream);
            camRecorder.ondataavailable=ev=>{ if(ev.data && ev.data.size>0) camChunks.push(ev.data); };
            camRecorder.onstop=()=>{
                camStream?.getTracks()?.forEach(t=>t.stop());
                const blob=new Blob(camChunks, { type:camRecorder.mimeType||'video/webm' });
                const url=URL.createObjectURL(blob);
                const dl=preview.querySelector('.sc-cam-download');
                dl.href=url; dl.download='studio936-video-'+Date.now()+'.webm';
                dl.style.display='block'; dl.textContent='Descargar video';
                video.srcObject=null; video.src=url; video.muted=false; video.controls=true;
            };
            camRecorder.start();
        }catch(err){
            console.warn('Studio936 RecordHub: no se pudo activar la cámara', err);
        }
    }

    async function start(mode){
        recordingMode=mode;
        const rec=window.Studio936TrackRecorder;
        try{ await rec?.startRecording?.(); }catch(_){}
        if(mode==='instrument+video') await startCamera();
        notify();
    }

    async function stop(){
        const rec=window.Studio936TrackRecorder;
        try{ await rec?.stopRecording?.(); }catch(_){}
        if(camRecorder && camRecorder.state==='recording') camRecorder.stop();
        recordingMode=null;
        notify();
    }

    function closeMenu(){
        const menu=document.getElementById(PANEL_ID+'Menu');
        if(menu) menu.classList.remove('is-open');
        document.removeEventListener('click', onOutsideClick, true);
    }
    function onOutsideClick(e){
        const menu=document.getElementById(PANEL_ID+'Menu');
        if(menu && !menu.contains(e.target)) closeMenu();
    }

    // Cambio 487: al tocar REC, si no está grabando, pregunta qué modo
    // — antes siempre grababa las tres cosas juntas sin preguntar.
    function toggleFromButton(anchorEl){
        if(isRecording()){ stop(); return; }
        injectStyle();
        let menu=document.getElementById(PANEL_ID+'Menu');
        if(!menu){
            menu=document.createElement('div'); menu.id=PANEL_ID+'Menu';
            const title=document.createElement('div'); title.className='rh-title'; title.textContent='¿Qué querés grabar?';
            const optInstrument=document.createElement('button'); optInstrument.textContent='🎤 Solo instrumento / voz';
            optInstrument.onclick=()=>{ closeMenu(); start('instrument'); };
            const optVideo=document.createElement('button'); optVideo.textContent='🎥 Instrumento/voz + video';
            optVideo.onclick=()=>{ closeMenu(); start('instrument+video'); };
            menu.append(title, optInstrument, optVideo);
            document.body.appendChild(menu);
        }
        const rect=anchorEl.getBoundingClientRect();
        menu.style.left=Math.max(4, rect.left)+'px';
        menu.style.top=(rect.bottom+6)+'px';
        menu.classList.add('is-open');
        setTimeout(()=>document.addEventListener('click', onOutsideClick, true), 0);
    }

    window.Studio936RecordHub = { toggleFromButton, isRecording, onChange, start, stop };

    // Cambio 487: sincronizar el botón principal (junto a Play) con el
    // estado real de grabación — mismo criterio que el de la Consola.
    function wireMainButton(){
        const btn=document.getElementById('mainRecBtn');
        if(!btn) return;
        injectStyle();
        btn.classList.add('rh-main-recbtn');
        onChange(recording=>{
            btn.classList.toggle('is-recording', recording);
            const span=btn.querySelector('span');
            if(span) span.textContent = recording ? '⏹' : '⏺';
        });
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', wireMainButton);
    else wireMainButton();
})();
