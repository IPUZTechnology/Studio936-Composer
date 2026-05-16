(function () {
  'use strict';

  var TOOL_DEFINITIONS = [
    { id: 'library', label: 'Library' },
    { id: 'templates', label: 'Templates' },
    { id: 'transpose', label: 'Transpose' },
    { id: 'scales', label: 'Scales' },
    { id: 'chord-ai', label: 'Chord AI' },
    { id: 'drums', label: 'Drums' },
    { id: 'mixer', label: 'Mixer' },
    { id: 'rec-idea', label: 'REC Idea' },
    { id: 'midi-in', label: 'MIDI IN' },
    { id: 'pdf', label: 'PDF' },
    { id: 'lead-sheet', label: 'Lead Sheet' },
    { id: 'practice', label: 'Practice' },
    { id: 'share', label: 'Share' },
    { id: 'inspire', label: 'Inspire' },
    { id: 'theory', label: 'Theory' }
  ];

  function getById(id) {
    return document.getElementById(id);
  }

  function normalizeKey(raw) {
    var value = String(raw || '').trim();
    var match = value.match(/^([A-Ga-g])([#b]?)/);
    if (!match) {
      return null;
    }
    return match[1].toUpperCase() + (match[2] || '');
  }

  function detectCurrentKey() {
    var projectKey = null;
    if (typeof window.getProject === 'function') {
      var project = window.getProject();
      projectKey = project && project.soloKey ? project.soloKey : null;
    }

    return normalizeKey(
      (getById('soloKey') && getById('soloKey').value) ||
      (getById('chordName') && getById('chordName').value) ||
      projectKey ||
      'C'
    ) || 'C';
  }

  function fallbackMajorData(key) {
    var resolvedKey = key || 'C';
    if (resolvedKey !== 'C') {
      return {
        key: resolvedKey,
        major: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        chords: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
        minorNatural: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        minorPentatonic: ['A', 'C', 'D', 'E', 'G'],
        fallbackNote: 'Helper unavailable. Showing safe fallback note layout.'
      };
    }

    return {
      key: 'C',
      major: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      chords: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
      minorNatural: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      minorPentatonic: ['A', 'C', 'D', 'E', 'G'],
      fallbackNote: 'Using safe fallback in C major / A minor.'
    };
  }

  function buildScaleData(key) {
    var data = fallbackMajorData(key);
    var theory = window.Studio936MusicTheory;
    if (!theory || typeof theory.scaleNotes !== 'function') {
      return data;
    }

    var major = theory.scaleNotes(key, 'major');
    if (Array.isArray(major) && major.length >= 7) {
      data.major = major.slice(0, 7);
      data.chords = [
        data.major[0],
        data.major[1] + 'm',
        data.major[2] + 'm',
        data.major[3],
        data.major[4],
        data.major[5] + 'm',
        data.major[6] + 'dim'
      ];
      data.fallbackNote = '';
    }

    var naturalMinor = theory.scaleNotes(key, 'natural_minor') || theory.scaleNotes(key, 'minor');
    if (Array.isArray(naturalMinor) && naturalMinor.length >= 7) {
      data.minorNatural = naturalMinor.slice(0, 7);
    }

    var pentatonic = theory.scaleNotes(key, 'minor_pentatonic');
    if (Array.isArray(pentatonic) && pentatonic.length >= 5) {
      data.minorPentatonic = pentatonic.slice(0, 5);
    }

    return data;
  }

  function ensureContent(panel) {
    if (!panel) {
      return null;
    }

    var content = panel.querySelector('#v18SuiteContent');
    if (content) {
      return content;
    }

    content = document.createElement('section');
    content.id = 'v18SuiteContent';
    content.className = 'v18-suite-content';
    panel.appendChild(content);
    return content;
  }

  function renderTitle(content, title) {
    content.textContent = '';
    var heading = document.createElement('h3');
    heading.className = 'v18-suite-content-title';
    heading.textContent = title;
    content.appendChild(heading);
  }

  function renderToolConnected(content, label) {
    renderTitle(content, label);

    var message = document.createElement('p');
    message.textContent = 'Module connected. Full panel coming soon.';
    content.appendChild(message);
  }

  function renderTheory(content) {
    var key = detectCurrentKey();
    var data = buildScaleData(key);

    renderTitle(content, 'Theory / Teoría');

    var keyLine = document.createElement('p');
    keyLine.textContent = 'Current key / Tonalidad actual: ' + (data.key || 'C');
    content.appendChild(keyLine);

    var majorLine = document.createElement('p');
    majorLine.textContent = 'Major scale / Escala mayor: ' + data.major.join(' ');
    content.appendChild(majorLine);

    var chordsLine = document.createElement('p');
    chordsLine.textContent = 'Diatonic chords / Acordes diatónicos: ' + data.chords.join(', ');
    content.appendChild(chordsLine);

    if (data.fallbackNote) {
      var fallback = document.createElement('p');
      fallback.className = 'v18-suite-muted';
      fallback.textContent = data.fallbackNote;
      content.appendChild(fallback);
    }
  }

  function renderScales(content) {
    var key = detectCurrentKey();
    var data = buildScaleData(key);

    renderTitle(content, 'Scales / Escalas');

    var keyLine = document.createElement('p');
    keyLine.textContent = 'Current key / Tonalidad actual: ' + (data.key || 'C');
    content.appendChild(keyLine);

    var majorLine = document.createElement('p');
    majorLine.textContent = 'Major scale / Escala mayor: ' + data.major.join(' ');
    content.appendChild(majorLine);

    var minorLine = document.createElement('p');
    minorLine.textContent = 'Natural minor / Menor natural: ' + data.minorNatural.join(' ');
    content.appendChild(minorLine);

    var pentLine = document.createElement('p');
    pentLine.textContent = 'Minor pentatonic / Pentatónica menor: ' + data.minorPentatonic.join(' ');
    content.appendChild(pentLine);

    if (data.fallbackNote) {
      var fallback = document.createElement('p');
      fallback.className = 'v18-suite-muted';
      fallback.textContent = data.fallbackNote;
      content.appendChild(fallback);
    }
  }

  function handleTool(toolId, label) {
    var panel = ensurePanel();
    var content = ensureContent(panel);
    if (!content) {
      return;
    }

    if (toolId === 'theory') {
      renderTheory(content);
      return;
    }

    if (toolId === 'scales') {
      renderScales(content);
      return;
    }

    renderToolConnected(content, label);
  }

  function buildToolButton(definition) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'v18-suite-tool';
    button.dataset.tool = definition.id;
    button.textContent = definition.label;
    button.addEventListener('click', function () {
      handleTool(definition.id, definition.label);
    });
    return button;
  }

  function ensurePanel() {
    var existing = getById('v18Suite');
    if (existing) {
      ensureContent(existing);
      return existing;
    }

    var panel = document.createElement('aside');
    panel.id = 'v18Suite';
    panel.className = 'v18-suite-panel';

    var header = document.createElement('div');
    header.className = 'v18-suite-header';

    var title = document.createElement('h2');
    title.className = 'v18-suite-title';
    title.textContent = 'Suite Pro';
    header.appendChild(title);

    var closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'v18-suite-close';
    closeButton.textContent = 'CERRAR';
    closeButton.addEventListener('click', function () {
      close();
    });
    header.appendChild(closeButton);

    panel.appendChild(header);

    var grid = document.createElement('div');
    grid.className = 'v18-suite-grid';
    for (var i = 0; i < TOOL_DEFINITIONS.length; i += 1) {
      grid.appendChild(buildToolButton(TOOL_DEFINITIONS[i]));
    }
    panel.appendChild(grid);

    ensureContent(panel);

    document.body.appendChild(panel);
    return panel;
  }

  function open() {
    var panel = ensurePanel();
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
  }

  function close() {
    var panel = getById('v18Suite');
    if (!panel) {
      return;
    }
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
  }

  function toggle() {
    var panel = ensurePanel();
    if (panel.classList.contains('is-open')) {
      close();
      return;
    }
    open();
  }

  window.Studio936SuitePro = {
    open: open,
    close: close,
    toggle: toggle,
    ensurePanel: ensurePanel
  };
})();
