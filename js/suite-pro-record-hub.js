// Studio 936 Composer — Centro de Grabación (Cambio 498)
//
// QUÉ ES: la lógica real de REC (instrumento+voz vía
// suite-pro-track-recorder.js) y la cámara (video, vía getUserMedia)
// viven acá centralizadas. Antes (Cambio 487) el botón REC preguntaba
// "¿instrumento o instrumento+video?" cada vez — Val pidió simplificar:
// el REC general graba audio directo, sin preguntar nada, y la cámara
// pasa a ser su PROPIO control independiente, que vive en la
// Supraconsola (donde ya estás practicando), no escondido en un menú.

(function(){
    'use strict';

    const PANEL_ID = 's936RecordHub';
    let camStream=null, camRecorder=null, camChunks=[];
    const audioListeners=[];
    const videoListeners=[];

    function notifyAudio(){ audioListeners.forEach(fn=>{ try{ fn(isRecording()); }catch(_){} }); }
    function notifyVideo(){ videoListeners.forEach(fn=>{ try{ fn(isVideoRecording()); }catch(_){} }); }
    function onChange(fn){ audioListeners.push(fn); }
    function onVideoChange(fn){ videoListeners.push(fn); }

    function isRecording(){
        const rec=window.Studio936TrackRecorder;
        return !!rec?.isRecordingActive?.();
    }
    function isVideoRecording(){
        return !!(camRecorder && camRecorder.state==='recording');
    }

    function injectStyle(){
        if(document.getElementById(PANEL_ID+'Style')) return;
        const style=document.createElement('style');
        style.id=PANEL_ID+'Style';
        style.textContent=`
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
        injectStyle();
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
                notifyVideo();
            };
            camRecorder.start();
            notifyVideo();
        }catch(err){
            console.warn('Studio936 RecordHub: no se pudo activar la cámara', err);
        }
    }

    function stopCamera(){
        if(camRecorder && camRecorder.state==='recording') camRecorder.stop();
    }

    // Cambio 498: video independiente — su propio botón en la
    // Supraconsola, no depende para nada de si el REC de audio está
    // activo o no. Se puede grabar solo video, solo audio, o las dos
    // cosas juntas si el usuario toca ambos botones.
    function toggleVideo(){
        if(isVideoRecording()) stopCamera(); else startCamera();
    }

    // Cambio 498: REC general — graba directo, sin preguntar nada. El
    // menú de elección del Cambio 487 se sacó (Val: "el REC general
    // debería ser para arrancar el ensayo, la cámara aparte").
    async function toggleFromButton(){
        // Cambio 506: rastro paso a paso — alert() en vez de toast()
        // porque toast() es privada de otro archivo, no accesible
        // desde acá. alert() es imposible de no ver, garantiza que
        // esto se confirme sin ambigüedad.
        alert('PASO 0: se tocó el botón REC');
        const rec=window.Studio936TrackRecorder;
        if(!rec){
            console.error('[RecordHub] window.Studio936TrackRecorder no existe — el archivo suite-pro-track-recorder.js no cargó bien.');
            alert('PROBLEMA: window.Studio936TrackRecorder NO EXISTE');
            return;
        }
        const wasRecording = isRecording();
        alert('PASO 0.5: isRecording() dice = ' + wasRecording + ' (va a ' + (wasRecording ? 'PARAR' : 'ARRANCAR') + ')');
        if(wasRecording){
            try{ await rec.stopAndSaveTake?.(); }catch(e){ console.error('[RecordHub] error al parar/guardar', e); alert('ERROR al parar/guardar: ' + e); }
        } else {
            try{ await rec.startRecording?.(); }catch(e){ console.error('[RecordHub] error al arrancar la grabación', e); alert('ERROR al arrancar: ' + e); }
        }
        notifyAudio();
    }

    window.Studio936RecordHub = { toggleFromButton, isRecording, onChange, toggleVideo, isVideoRecording, onVideoChange };

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
