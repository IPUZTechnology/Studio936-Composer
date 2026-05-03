(function(global){
    function vlq(n){ let bytes=[n & 0x7F]; n >>= 7; while(n>0){ bytes.unshift((n & 0x7F) | 0x80); n >>= 7; } return bytes; }
    function textBytes(s){ return Array.from(new TextEncoder().encode(String(s||''))); }
    function u16(n){ return [(n>>8)&255,n&255]; }
    function u32(n){ return [(n>>24)&255,(n>>16)&255,(n>>8)&255,n&255]; }
    function makeTrack(events){ events.sort((a,b)=> (a.tick-b.tick) || ((a.order||0)-(b.order||0)) ); let out=[], last=0; for(const e of events){ const tick = Math.max(0,Math.round(e.tick)); out.push(...vlq(tick-last)); last=tick; out.push(...e.data); } out.push(0,0xFF,0x2F,0); return [0x4D,0x54,0x72,0x6B, ...u32(out.length), ...out]; }
    function metaText(type,text,tick=0){ const b=textBytes(text); return {tick,order:0,data:[0xFF,type,...vlq(b.length),...b]}; }
    function metaTempo(bpm,tick=0){ const us=Math.round(60000000/(Number(bpm)||95)); return {tick,order:0,data:[0xFF,0x51,3,(us>>16)&255,(us>>8)&255,us&255]}; }
    function metaTimeSig(tick=0){ return {tick,order:0,data:[0xFF,0x58,4,4,2,24,8]}; }
    function midiNoteEvents(track,tick,midi,dur,vel,helpers,ch=0){ midi = helpers.clamp(Math.round(midi),0,127); dur = Math.max(12,Math.round(dur)); vel=helpers.clamp(Math.round(vel),1,127); track.push({tick,order:2,data:[0x90+ch,midi,vel]}); track.push({tick:tick+dur,order:1,data:[0x80+ch,midi,0]}); }
    function swingTicksForStep(step,style,helpers){ const st = helpers.styles[style] || helpers.styles.funk; return st.swing && [2,6,10,14].includes(step%16) ? Math.round((480/4)*st.swing) : 0; }
    function addMidiChord(track,tick,notes,dur,vel,helpers,ch=0){ notes.forEach((m,i)=>midiNoteEvents(track,tick+i*7,m,dur,vel,helpers,ch)); }
    function soloEventStartAt(events,step){ if(!events.length) return null; const total=events.reduce((a,e)=>a+e.dur,0); if(!total) return null; let pos = step % total; for(const e of events){ if(pos===0) return e; pos-=e.dur; if(pos<0) return null; } return null; }

    function buildMidiBytes(project,helpers){
        helpers.syncProjectFromControls(false); helpers.syncLyricsFromModal(false);
        const PPQ=480, STEP=PPQ/4;
        const meta=[metaTempo(project.bpm,0), metaTimeSig(0), metaText(0x03, project.title || 'Song',0), metaText(0x01, `Author: ${project.author || ''} | Style: ${project.style} | A4=${helpers.masterA()} Hz`,0)];
        const chords=[metaText(0x03,'Chords / Harmony',0)]; const bass=[metaText(0x03,'Bass',0)]; const melody=[metaText(0x03,'Melody / Solo',0)];
        let tick=0; const parts = helpers.arrangementParts();
        parts.forEach(part=>{ const section=part.section; meta.push(metaText(0x06, part.label || helpers.sectionNames[section] || section, tick)); const seq = project.sections[section] || []; const sectionSolo = helpers.parseSolo(helpers.getSectionSolo(section).phrase || ''); let sectionStep=0;
            seq.forEach(item=>{ const st = helpers.styles[project.style] || helpers.styles.funk; const b = helpers.noteToMidi(item.bass) ?? 36; const chNotes = helpers.parseNotes(item.notes); const notes = chNotes.length ? chNotes : [60,64,67]; const steps = Math.max(1,Number(item.bars)||1)*16; meta.push(metaText(0x01, `${section}: ${item.name}`, tick + sectionStep*STEP));
                for(let ss=0;ss<steps;ss++){ const stepBar=ss%16; const t = tick + (sectionStep+ss)*STEP + swingTicksForStep(stepBar,project.style,helpers); if(st.bass.includes(stepBar)) midiNoteEvents(bass,t,helpers.bassPatternNote(b,notes,stepBar,project.style),Math.round(STEP*1.65),82,helpers,1); if(st.arp){ const arpSteps = project.style==='ballad' ? [0,2,4,6,8,10,12,14] : [0,3,6,8,11,14]; if(arpSteps.includes(stepBar)) midiNoteEvents(chords,t,notes[(Math.floor(stepBar/2)+Math.floor(ss/16)+1)%notes.length],Math.round(STEP*1.4),66,helpers,0); } if(st.chord.includes(stepBar)) addMidiChord(chords,t,notes,Math.round(STEP*1.9),72,helpers,0); if(st.ghost.includes(stepBar)) addMidiChord(chords,t,helpers.thinChord(notes),Math.round(STEP*.9),38,helpers,0); const ev = soloEventStartAt(sectionSolo, sectionStep+ss); if(ev && ev.midi !== null) midiNoteEvents(melody,t+Math.round(STEP*.1),helpers.clamp(ev.midi,0,127),Math.round(STEP*ev.dur*.9),86,helpers,2); }
                sectionStep += steps;
            }); tick += sectionStep*STEP;
        });
        const header=[0x4D,0x54,0x68,0x64,0,0,0,6,0,1,0,4,...u16(PPQ)];
        return new Uint8Array([...header, ...makeTrack(meta), ...makeTrack(chords), ...makeTrack(bass), ...makeTrack(melody)]);
    }

    function exportMidi(project,helpers){ const bytes = buildMidiBytes(project, helpers); const blob = new Blob([bytes],{type:'audio/midi'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=helpers.slug(project.title)+'-arrangement.mid'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); helpers.flashStatus('MIDI exportado: acordes, bajo, groove y melodías/solos por sección.'); }

    global.Studio936MidiExport = { exportMidi, buildMidiBytes };
})(window);
