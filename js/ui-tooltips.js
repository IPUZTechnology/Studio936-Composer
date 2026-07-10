// Studio 936 — Tooltip global para [data-tip] (Cambio 162)
//
// Reemplaza el tooltip anterior (CSS puro, vía ::after) que a veces
// quedaba tapado por el ícono vecino — cada botón creaba su propio grupo
// de apilamiento y compararlos entre sí resultaba frágil.
//
// Este tooltip se dibuja UNA sola vez, directo sobre <body>, con
// position:fixed y el z-index más alto posible (2147483647 — el máximo
// entero de 32 bits, el tope real que entiende cualquier navegador).
// Al vivir fuera de cualquier botón, no compite en apilamiento con
// absolutamente nada de la página — siempre queda por encima de todo.
(function(){
  'use strict';

  let tipEl = null;

  function ensureTipEl(){
    if(tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.id = 's936-global-tooltip';
    Object.assign(tipEl.style, {
      position: 'fixed',
      zIndex: '2147483647',
      pointerEvents: 'none',
      background: 'none',
      border: 'none',
      boxShadow: 'none',
      padding: '0',
      margin: '0',
      color: '#5be8c9',
      fontFamily: 'inherit',
      fontSize: '.72rem',
      fontWeight: '800',
      letterSpacing: '.4px',
      textShadow: '0 1px 3px rgba(0,0,0,.95), 0 0 10px rgba(0,0,0,.9), 0 0 14px rgba(0,255,204,.55)',
      whiteSpace: 'nowrap',
      opacity: '0',
      transition: 'opacity .12s ease',
      left: '0px',
      top: '0px'
    });
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function showTip(target){
    const text = target.getAttribute('data-tip');
    if(!text) return;
    const el = ensureTipEl();
    el.textContent = text;
    const rect = target.getBoundingClientRect();
    // Centrado sobre el propio elemento, igual que antes — solo que ahora
    // la posición se calcula en coordenadas de viewport (position:fixed),
    // no relativas al botón, así que ningún ancestro puede recortarlo.
    let left = rect.left + rect.width / 2;
    const top = rect.top + rect.height / 2;
    // Evita que el tooltip se salga por los bordes izquierdo/derecho de
    // la pantalla en botones muy cerca del borde (ej. el primer ícono).
    const margin = 8;
    const halfWidth = Math.min(el.scrollWidth || 120, window.innerWidth - margin * 2) / 2;
    left = Math.max(margin + halfWidth, Math.min(window.innerWidth - margin - halfWidth, left));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.transform = 'translate(-50%,-50%)';
    el.style.opacity = '1';
  }

  function hideTip(){
    if(tipEl) tipEl.style.opacity = '0';
  }

  document.addEventListener('mouseover', (event) => {
    const target = event.target && event.target.closest && event.target.closest('[data-tip]');
    if(target) showTip(target);
  });
  document.addEventListener('mouseout', (event) => {
    const target = event.target && event.target.closest && event.target.closest('[data-tip]');
    if(target) hideTip();
  });
  // Cambio 162: recalcula posición si el botón se mueve mientras el mouse
  // sigue encima (ej. scroll de la página).
  document.addEventListener('scroll', () => { hideTip(); }, true);
})();
