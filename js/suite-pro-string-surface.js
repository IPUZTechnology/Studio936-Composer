// Studio 936 Composer - Shared String Instrument Surface v1.1 · Surface Manager
// Renders Guitar, Ukulele and Bass on the main instrument area.
window.Studio936StringSurface = (() => {
  "use strict";

  function clamp(value,min,max){
    const n = Number(value);
    return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
  }

  function noteName(midi){
    const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    const n = Math.round(Number(midi));
    return `${names[((n%12)+12)%12]}${Math.floor(n/12)-1}`;
  }

  function editorCall(method,...args){
    const api = window.Studio936SuiteProEditor;
    if(!api || typeof api[method] !== "function") return false;
    try{
      api[method](...args);
      return true;
    }catch(error){
      console.warn("Studio936StringSurface:",method,error);
      return false;
    }
  }

  function clear(){
    document.querySelectorAll("#s936EditorGuitarSurface").forEach(node => node.remove());
    document.querySelectorAll(".s936-finger-pop").forEach(node => node.remove());
  }

  function showFingerPicker(surface,anchor,stringIndex){
    document.querySelectorAll(".s936-finger-pop").forEach(node => node.remove());
    if(!surface || !anchor) return;
    const picker = document.createElement("div");
    picker.className = "s936-finger-pop";
    picker.setAttribute("role","dialog");
    picker.setAttribute("aria-label","Seleccionar dedo");
    [["1","1"],["2","2"],["3","3"],["4","4"],["T","T"],["","×"]].forEach(([value,label]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      if(!value) btn.classList.add("clear");
      btn.addEventListener("click",event => {
        event.stopPropagation();
        editorCall("externalSetFinger",stringIndex,value);
        picker.remove();
      });
      picker.appendChild(btn);
    });
    surface.appendChild(picker);
    const rect = anchor.getBoundingClientRect();
    const maxLeft = Math.max(8,window.innerWidth-225);
    picker.style.left = `${Math.max(8,Math.min(maxLeft,rect.left-20))}px`;
    picker.style.top = `${Math.max(8,Math.min(window.innerHeight-52,rect.bottom+6))}px`;
  }

  function voicingForItem(item,index,data,profile){
    if(index === data.chordIndex && Array.isArray(data.exactFrets)){
      return {
        frets:data.exactFrets,
        fingers:Array.isArray(data.exactStrings) ? data.exactStrings.map(string => string?.finger || "") : [],
        capo:data.capo || 0,
        shape:data.exactFrets.map(value => value === null ? "X" : String(value)).join("-")
      };
    }
    const saved = item?.voicings?.[profile.id];
    if(!saved || !Array.isArray(saved.frets) || saved.frets.length !== profile.strings.length) return null;
    return {
      frets:saved.frets.map(value => value === null || String(value).toUpperCase() === "X" ? null : clamp(Number(value)||0,0,profile.maxFret)),
      fingers:Array.isArray(saved.fingers) ? saved.fingers : [],
      capo:profile.allowCapo ? clamp(Number(saved.capo)||0,0,profile.capoMax) : 0,
      shape:saved.shape || saved.frets.map(value => value === null ? "X" : String(value)).join("-")
    };
  }

  function renderMiniChart(card,voicing,profile){
    if(!voicing){
      const empty = document.createElement("div");
      empty.className = "s936-chart-empty";
      empty.textContent = "Sin digitación exacta guardada";
      card.appendChild(empty);
      return;
    }
    const chart = document.createElement("div");
    chart.className = "s936-mini-chart";
    chart.style.setProperty("--string-count",String(profile.strings.length));
    const positive = voicing.frets.filter(value => Number(value)>0).map(Number);
    const base = positive.length && Math.min(...positive)>4 ? Math.min(...positive) : 1;
    voicing.frets.forEach((fret,index) => {
      const x = ((index + .5) / profile.strings.length) * 100;
      if(fret === null){
        const mark = document.createElement("span");
        mark.className = "s936-mini-muted";
        mark.textContent = "×";
        mark.style.left = `${x}%`;
        chart.appendChild(mark);
        return;
      }
      if(Number(fret)===0){
        const mark = document.createElement("span");
        mark.className = "s936-mini-open";
        mark.textContent = "○";
        mark.style.left = `${x}%`;
        chart.appendChild(mark);
        return;
      }
      const rel = Number(fret)-base;
      if(rel<0 || rel>4) return;
      const dot = document.createElement("span");
      dot.className = "s936-mini-dot";
      dot.textContent = String(voicing.fingers[index] || "");
      dot.style.left = `${x}%`;
      dot.style.top = `${8 + rel*16}px`;
      chart.appendChild(dot);
    });
    card.appendChild(chart);
  }

  function render({container,data,profiles,sectionNames={}}){
    const instrument = data?.instrument;
    const profile = profiles?.[instrument];
    if(!container || !profile || !Array.isArray(data?.exactFrets) || data.exactFrets.length !== profile.strings.length){
      clear();
      return {ok:false};
    }

    let surface = document.getElementById("s936EditorGuitarSurface");
    if(!surface){
      surface = document.createElement("section");
      surface.id = "s936EditorGuitarSurface";
      container.appendChild(surface);
    }
    surface.dataset.instrument = instrument;
    surface.innerHTML = "";

    const head = document.createElement("div");
    head.className = "s936-neck-head";
    const identity = document.createElement("div");
    const title = document.createElement("div");
    title.className = "s936-neck-title";
    const bassLineMode = data.surfaceMode === "bass-line";
    title.textContent = bassLineMode ? "Cuello de Bajo · línea por sección" : `Cuello interactivo · ${profile.label}`;
    const meta = document.createElement("div");
    meta.className = "s936-neck-meta";
    const shape = data.exactFrets.map(value => value === null ? "X" : String(value)).join(" ");
    meta.textContent = bassLineMode
      ? `${data.sectionName || data.sectionKey || "Sección"} · ${data.name || "Selecciona un paso"}`
      : `${data.name || "Acorde"} · Forma ${profile.shapeOrder}: ${shape}${data.capo ? ` · Capo ${data.capo}` : ""}`;
    identity.append(title,meta);
    const help = document.createElement("div");
    help.className = "s936-neck-help";
    help.textContent = bassLineMode
      ? "Selecciona un paso en Bass Line Pro y toca una cuerda/traste para escribir la nota."
      : "La 1.ª cuerda está arriba. Haz clic en un traste y elige el dedo; mapa pequeño, panel manual y sonido se actualizarán juntos.";
    head.append(identity,help);
    surface.appendChild(head);

    const scroll = document.createElement("div");
    scroll.className = "s936-neck-scroll";
    const ruler = document.createElement("div");
    ruler.className = "s936-neck-ruler";
    ruler.style.gridTemplateColumns = `72px 34px 38px repeat(${profile.maxFret},minmax(44px,1fr))`;
    ruler.style.minWidth = `${72+34+38+profile.maxFret*44}px`;
    ["Cuerda","X","0"].forEach(label => {
      const span = document.createElement("span");
      span.textContent = label;
      ruler.appendChild(span);
    });
    const markerFrets = new Set([3,5,7,9,12,15,17,19,21,24].filter(value => value<=profile.maxFret));
    for(let fret=1;fret<=profile.maxFret;fret++){
      const span = document.createElement("span");
      span.textContent = String(fret);
      if(markerFrets.has(fret)) span.classList.add("mark");
      if(fret===12 || fret===24) span.classList.add("double");
      ruler.appendChild(span);
    }
    scroll.appendChild(ruler);

    const exactStrings = Array.isArray(data.exactStrings) ? data.exactStrings : [];
    const bassMidi = data.exactMidis?.length ? Math.min(...data.exactMidis) : null;
    const barre = data.barre || {};
    const barreEnabled = profile.allowBarre && !!barre.enabled;
    const barrePhysicalFret = clamp(Number(barre.fret)||1,1,profile.maxFret)+(data.capo||0);
    const barreHigh = Math.max(clamp(Number(barre.fromString)||profile.strings.length,1,profile.strings.length),clamp(Number(barre.toString)||1,1,profile.strings.length));
    const barreLow = Math.min(clamp(Number(barre.fromString)||profile.strings.length,1,profile.strings.length),clamp(Number(barre.toString)||1,1,profile.strings.length));
    const displayOrder = profile.strings.map((_,index)=>index).reverse();

    displayOrder.forEach(index => {
      const string = profile.strings[index];
      const relativeFret = data.exactFrets[index];
      const row = document.createElement("div");
      row.className = "s936-neck-row";
      row.dataset.stringNumber = String(string.number);
      row.style.gridTemplateColumns = `72px 34px 38px repeat(${profile.maxFret},minmax(44px,1fr))`;
      row.style.minWidth = `${72+34+38+profile.maxFret*44}px`;
      row.style.setProperty("--string-width",`${Math.max(.8,.8+(profile.strings.length-1-index)*.55)}px`);

      const label = document.createElement("div");
      label.className = "s936-neck-string-label";
      label.textContent = `${string.number} · ${string.label}`;
      const open = document.createElement("small");
      open.textContent = string.open;
      label.appendChild(open);
      row.appendChild(label);

      const muteBtn = document.createElement("button");
      muteBtn.type = "button";
      muteBtn.className = "s936-neck-cell mute" + (relativeFret===null ? " active" : "");
      muteBtn.textContent = "X";
      muteBtn.addEventListener("click",()=>editorCall("externalSetFret",index,null));
      row.appendChild(muteBtn);

      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "s936-neck-cell open" + (relativeFret===0 ? " active" : "");
      openBtn.textContent = "0";
      openBtn.addEventListener("click",()=>editorCall("externalSetFret",index,0));
      row.appendChild(openBtn);

      const physicalSelected = relativeFret===null ? null : clamp(Number(relativeFret)||0,0,profile.maxFret)+(data.capo||0);
      for(let physicalFret=1;physicalFret<=profile.maxFret;physicalFret++){
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "s936-neck-cell";
        cell.style.setProperty("--string-width",row.style.getPropertyValue("--string-width"));
        const blocked = physicalFret < (data.capo||0);
        if(blocked) cell.classList.add("capoblocked");
        if(data.capo && physicalFret===data.capo) cell.classList.add("capo");
        if(barreEnabled && physicalFret===barrePhysicalFret && string.number<=barreHigh && string.number>=barreLow) cell.classList.add("barre");
        const cellNote = noteName(string.midi+physicalFret);
        cell.textContent = cellNote.replace(/-?\d+$/,"");
        cell.title = `${string.number} · ${string.label} · traste ${physicalFret} · ${cellNote}`;
        if(physicalSelected===physicalFret){
          cell.classList.add("on");
          cell.textContent = "";
          const dot = document.createElement("span");
          dot.className = "s936-neck-dot";
          const stringData = exactStrings[index] || {};
          if(Number.isFinite(stringData.midi) && stringData.midi===bassMidi) dot.classList.add("bass");
          const note = document.createElement("span");
          note.textContent = stringData.note || cellNote;
          const finger = document.createElement("span");
          finger.className = "finger";
          finger.textContent = stringData.finger ? `D${stringData.finger}` : "dedo";
          dot.append(note,finger);
          cell.appendChild(dot);
        }
        cell.addEventListener("click",()=>{
          if(blocked) return;
          const relative = Math.max(0,physicalFret-(data.capo||0));
          editorCall("externalSetFret",index,relative);
          if(!bassLineMode){
            setTimeout(()=>{
              const updated = document.querySelector(`#s936EditorGuitarSurface [data-string-index="${index}"][data-physical-fret="${physicalFret}"]`);
              showFingerPicker(surface,updated,index);
            },90);
          }
        });
        cell.dataset.stringIndex = String(index);
        cell.dataset.physicalFret = String(physicalFret);
        row.appendChild(cell);
      }
      scroll.appendChild(row);
    });
    surface.appendChild(scroll);

    const selectedPhysical = data.exactFrets.filter(value=>Number(value)>0).map(value=>Number(value)+(data.capo||0));
    if(selectedPhysical.length){
      const first = Math.min(...selectedPhysical);
      setTimeout(()=>{ scroll.scrollLeft = Math.max(0,(first-2)*44); },0);
    }

    const chartZone = document.createElement("section");
    chartZone.className = "s936-chart-zone";
    const chartHead = document.createElement("div");
    chartHead.className = "s936-chart-head";
    const chartTitle = document.createElement("b");
    const sectionLabel = sectionNames[data.sectionKey] || data.sectionKey || "Sección";
    chartTitle.textContent = bassLineMode ? `Contexto armónico de ${sectionLabel}` : `Acordes de ${sectionLabel}`;
    const chartHint = document.createElement("span");
    chartHint.textContent = bassLineMode ? "El patrón puede seguir estos acordes" : "Selecciona un chart para editarlo";
    chartHead.append(chartTitle,chartHint);
    chartZone.appendChild(chartHead);

    const chartRow = document.createElement("div");
    chartRow.className = "s936-chart-row";
    (data.seq || []).forEach((item,index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "s936-chart-card" + (index===data.chordIndex ? " active" : "");
      const name = document.createElement("span");
      name.className = "s936-chart-name";
      name.textContent = `${index+1}. ${item?.name || "Acorde"}`;
      const voicing = voicingForItem(item,index,data,profile);
      const metaLine = document.createElement("span");
      metaLine.className = "s936-chart-meta";
      metaLine.textContent = `${item?.bars || 1} comp. · ${profile.shapeOrder} ${voicing?.shape ? String(voicing.shape).replace(/-/g," ") : "sin forma"}`;
      card.append(name,metaLine);
      renderMiniChart(card,voicing,profile);
      card.addEventListener("click",()=>editorCall("externalSelectChord",index));
      chartRow.appendChild(card);
    });
    chartZone.appendChild(chartRow);
    surface.appendChild(chartZone);

    return {ok:true};
  }

  return {
    version:"string-surface-v1.1",
    render,
    clear
  };
})();
