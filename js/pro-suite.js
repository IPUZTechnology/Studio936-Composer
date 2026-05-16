// Studio 936 Composer - Suite Pro clean module
// Scope: Suite Pro UI only (no MIDI/transport/playback/audio/editor/arrangement changes)

(function(){
  'use strict';

  const TOOLS = [
    { id: 'v18_library', key: 'library', label: 'Library' },
    { id: 'v18_templates', key: 'templates', label: 'Templates' },
    { id: 'v18_transpose', key: 'transpose', label: 'Transpose' },
    { id: 'v18_scales', key: 'scales', label: 'Scales' },
    { id: 'v18_chordAI', key: 'chordAI', label: 'Chord AI' },
    { id: 'v18_drums', key: 'drums', label: 'Drums' },
    { id: 'v18_mixer', key: 'mixer', label: 'Mixer' },
    { id: 'v18_record', key: 'record', label: 'REC Idea' },
    { id: 'v18_midiIn', key: 'midiIn', label: 'MIDI IN' },
    { id: 'v18_pdf', key: 'pdf', label: 'PDF' },
    { id: 'v18_lead', key: 'lead', label: 'Lead Sheet' },
    { id: 'v18_practice', key: 'practice', label: 'Practice' },
    { id: 'v18_share', key: 'share', label: 'Share' },
    { id: 'v18_inspire', key: 'inspire', label: 'Inspire' },
    { id: 'v18_theory', key: 'theory', label: 'Theory' }
  ];

  function clearNode(node){
    while(node.firstChild) node.removeChild(node.firstChild);
  }

  function detectKey(){
    const source = [
      document.getElementById('chordName')?.value,
      document.getElementById('soloKey')?.value,
      typeof window.getProject === 'function' ? window.getProject()?.soloKey : ''
    ].find(Boolean) || 'C';

    const match = String(source).trim().match(/^([A-Ga-g])([#b]?)/);
    return match ? (match[1].toUpperCase() + (match[2] || '')) : 'C';
  }

  function appendParagraph(parent, text, className){
    const p = document.createElement('p');
    if(className) p.className = className;
    p.textContent = text;
    parent.appendChild(p);
  }

  function renderTheory(content){
    const key = detectKey();
    const scaleNotes = window.Studio936MusicTheory?.scaleNotes;
    const major = typeof scaleNotes === 'function' ? scaleNotes(key, 'major') : null;
    const notes = Array.isArray(major) && major.length >= 7 ? major.slice(0, 7) : ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    const qualities = ['', 'm', 'm', '', '', 'm', 'dim'];
    const chords = notes.map((n, i) => n + qualities[i]);

    clearNode(content);
    const title = document.createElement('h3');
    title.className = 'v18-suite-content-title';
    title.textContent = 'Theory / Teoría';
    content.appendChild(title);

    appendParagraph(content, 'Key / Tonalidad: ' + key);
    appendParagraph(content, 'Major scale / Escala mayor: ' + notes.join(' '));
    appendParagraph(content, 'Diatonic chords / Acordes diatónicos: ' + chords.join(', '));
    appendParagraph(content, 'Tip: I–IV–V creates strong tension/release. Try ' + chords[0] + ' - ' + chords[3] + ' - ' + chords[4] + ' - ' + chords[0] + '.');

    if(!(Array.isArray(major) && major.length >= 7)){
      appendParagraph(content, 'Using fallback theory data because music theory helpers are unavailable.', 'v18-muted');
    }
  }

  function renderScales(content){
    const key = detectKey();
    const scaleNotes = window.Studio936MusicTheory?.scaleNotes;
    const getScale = (mode, fallback) => {
      if(typeof scaleNotes !== 'function') return fallback;
      const notes = scaleNotes(key, mode);
      return Array.isArray(notes) && notes.length ? notes : fallback;
    };

    const major = getScale('major', ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    const minor = getScale('minor', null);
    const pent = getScale('minorPent', null);

    clearNode(content);
    const title = document.createElement('h3');
    title.className = 'v18-suite-content-title';
    title.textContent = 'Scales / Escalas';
    content.appendChild(title);

    appendParagraph(content, 'Key / Tonalidad: ' + key);
    appendParagraph(content, 'Major / Mayor: ' + major.join(' '));
    if(minor) appendParagraph(content, 'Natural Minor / Menor natural: ' + minor.join(' '));
    if(pent) appendParagraph(content, 'Minor Pentatonic / Pentatónica menor: ' + pent.join(' '));
    appendParagraph(content, 'Practice: play ascending in quarter notes, descending in eighth notes.', 'v18-muted');

    if(typeof scaleNotes !== 'function'){
      appendParagraph(content, 'Using fallback scale data because music theory helpers are unavailable.', 'v18-muted');
    }
  }

  function renderComingSoon(content, toolLabel){
    clearNode(content);
    const title = document.createElement('h3');
    title.className = 'v18-suite-content-title';
    title.textContent = toolLabel;
    content.appendChild(title);

    appendParagraph(content, toolLabel + ' module connected.');
    appendParagraph(content, 'Coming soon: richer workflow and content for this tool.', 'v18-muted');
  }

  function ensurePanel(){
    let panel = document.getElementById('v18Suite');
    if(!panel){
      panel = document.createElement('section');
      panel.id = 'v18Suite';
      document.body.appendChild(panel);
    }

    panel.classList.add('v18-suite');

    panel.querySelectorAll('#v18SuiteClose, #v25uxSuiteClose, .legacy-suite-close').forEach((node) => node.remove());

    let header = panel.querySelector('.v18-suite-header');
    if(!header){
      header = document.createElement('div');
      header.className = 'v18-suite-header';
      panel.appendChild(header);
    }

    let title = header.querySelector('.v18-suite-title');
    if(!title){
      title = document.createElement('div');
      title.className = 'v18-suite-title';
      header.appendChild(title);
    }
    title.textContent = 'Suite Pro';

    let closeButton = header.querySelector('#b25SuiteClose');
    if(!closeButton){
      closeButton = document.createElement('button');
      closeButton.id = 'b25SuiteClose';
      closeButton.type = 'button';
      closeButton.className = 'b25SuiteClose v25ux-suite-close';
      header.appendChild(closeButton);
    }
    closeButton.textContent = 'CERRAR';
    closeButton.onclick = close;

    let grid = panel.querySelector('.v18-suite-buttons');
    if(!grid){
      grid = document.createElement('div');
      grid.className = 'v18-suite-buttons';
      panel.appendChild(grid);
    }

    TOOLS.forEach((tool) => {
      let button = document.getElementById(tool.id);
      if(button && button.parentElement !== grid){
        button.remove();
        button = null;
      }
      if(!button){
        button = document.createElement('button');
        button.id = tool.id;
        button.type = 'button';
        button.className = 'v18-pill';
        button.dataset.v18Tool = tool.key;
        button.textContent = tool.label;
        grid.appendChild(button);
      }
      button.onclick = () => {
        const content = ensureContent(panel);
        if(tool.key === 'theory') return renderTheory(content);
        if(tool.key === 'scales') return renderScales(content);
        renderComingSoon(content, tool.label);
      };
    });

    ensureContent(panel);
    return panel;
  }

  function ensureContent(panel){
    const targetPanel = panel || document.getElementById('v18Suite') || ensurePanel();
    let content = targetPanel.querySelector('#v18SuiteContent');
    if(!content){
      content = document.createElement('div');
      content.id = 'v18SuiteContent';
      content.className = 'v18-suite-content';
      targetPanel.appendChild(content);
    }
    return content;
  }

  function open(){
    const panel = ensurePanel();
    panel.classList.add('v19-open');
    return panel;
  }

  function close(){
    const panel = document.getElementById('v18Suite');
    if(panel) panel.classList.remove('v19-open');
  }

  function toggle(){
    const panel = ensurePanel();
    panel.classList.toggle('v19-open');
    return panel;
  }

  window.Studio936SuitePro = {
    open,
    close,
    toggle,
    ensurePanel
  };
})();
