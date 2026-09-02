// Studio 936 Composer - Instruments Module
// Source: extracted from v25.9 core modular.

// Cambio 453: guitarra/ukelele - segundo ajuste de timbre (mas cuerpo,
// menos brillo/pick agresivo que el de Cambio-XXX ya subido). Val: probar
// A/B contra el anterior antes de confirmar cual se queda.
window.Studio936Instruments = {
    piano:{label:'Piano', chord:{type:'triangle', type2:'triangle', filter:2600, attack:.014, decayMult:1, detune:1.005}, bass:{type:'sine', type2:'sine', filter:1200, attack:.01, decayMult:1.05, detune:1.002}, solo:{type:'square', type2:'triangle', filter:3000, attack:.012, decayMult:1, detune:1.004}, strum:.012},
    epiano:{label:'Piano eléctrico', chord:{type:'sine', type2:'triangle', filter:2100, attack:.018, decayMult:1.35, detune:1.004}, bass:{type:'sine', type2:'triangle', filter:1050, attack:.012, decayMult:1.15, detune:1.002}, solo:{type:'triangle', type2:'sine', filter:2600, attack:.02, decayMult:1.25, detune:1.004}, strum:.015},
    guitar:{label:'Guitarra', mode:'pluck', body:180, brightness:1600, pick:.82, chord:{type:'triangle', type2:'sine', filter:1500, attack:.008, decayMult:.72, detune:1.0018}, bass:{type:'triangle', type2:'sine', filter:820, attack:.008, decayMult:.86, detune:1.0015}, solo:{type:'triangle', type2:'sine', filter:1900, attack:.006, decayMult:.8, detune:1.0022}, strum:.024},
    ukulele:{label:'Ukelele', mode:'pluck', body:520, brightness:2400, pick:.92, chord:{type:'triangle', type2:'sine', filter:2400, attack:.006, decayMult:.52, detune:1.0024, transpose:12}, bass:{type:'triangle', type2:'sine', filter:1500, attack:.006, decayMult:.58, detune:1.0018, transpose:12}, solo:{type:'triangle', type2:'sine', filter:2800, attack:.005, decayMult:.6, detune:1.0028, transpose:12}, strum:.018},
    bass:{label:'Bajo eléctrico', mode:'pluck', body:92, brightness:1250, pick:.72, chord:{type:'triangle', type2:'sine', filter:1150, attack:.004, decayMult:.78, detune:1.002}, bass:{type:'sine', type2:'triangle', filter:780, attack:.004, decayMult:.92, detune:1.001}, solo:{type:'triangle', type2:'sine', filter:1600, attack:.004, decayMult:.82, detune:1.002}, strum:.014},
    lead:{label:'Guitarra Lead', mode:'lead', body:150, brightness:3600, pick:1.35, chord:{type:'sawtooth', type2:'triangle', filter:3200, attack:.003, decayMult:.50, detune:1.006}, bass:{type:'triangle', type2:'sine', filter:1200, attack:.004, decayMult:.70, detune:1.003}, solo:{type:'sawtooth', type2:'triangle', filter:3900, attack:.003, decayMult:.56, detune:1.006}, strum:.018},
    drums:{label:'Batería', mode:'drums', chord:{type:'square', type2:'triangle', filter:1900, attack:.002, decayMult:.25, detune:1}, bass:{type:'sine', type2:'sine', filter:900, attack:.002, decayMult:.32, detune:1}, solo:{type:'triangle', type2:'square', filter:2600, attack:.002, decayMult:.20, detune:1}, strum:.006},
    organ:{label:'Órgano', chord:{type:'square', type2:'triangle', filter:1700, attack:.01, decayMult:2.2, detune:1.002}, bass:{type:'sine', type2:'triangle', filter:950, attack:.01, decayMult:1.7, detune:1.001}, solo:{type:'square', type2:'triangle', filter:2100, attack:.01, decayMult:1.8, detune:1.002}, strum:.006},
    sax:{label:'Saxo guía', mode:'wind', chord:{type:'triangle', type2:'sine', filter:1500, attack:.075, decayMult:1.18, detune:1.002}, bass:{type:'sine', type2:'triangle', filter:900, attack:.045, decayMult:1.1, detune:1.001}, solo:{type:'sawtooth', type2:'triangle', filter:2200, attack:.07, decayMult:1.4, detune:1.003}, strum:.012},
    synth:{label:'Synth', chord:{type:'sawtooth', type2:'square', filter:3000, attack:.018, decayMult:1.1, detune:1.007}, bass:{type:'square', type2:'sine', filter:1200, attack:.01, decayMult:1.05, detune:1.003}, solo:{type:'sawtooth', type2:'square', filter:3500, attack:.012, decayMult:1.05, detune:1.006}, strum:.008},
    // Cambio 450: violín y trompeta — pedidos por Val, con sample real
    // confirmado (WebAudioFont, ver webaudiofont-engine.js). El perfil
    // de acá abajo es solo el RESPALDO sintetizado (mientras carga el
    // sample real, o si por algún motivo falla) — mode:'wind' porque las
    // dos son de sonido sostenido (arco/soplido), no pulsado como la
    // guitarra.
    violin:{label:'Violín', mode:'wind', chord:{type:'sawtooth', type2:'triangle', filter:2600, attack:.05, decayMult:1.3, detune:1.004}, bass:{type:'sawtooth', type2:'sine', filter:1400, attack:.04, decayMult:1.2, detune:1.002}, solo:{type:'sawtooth', type2:'triangle', filter:3200, attack:.045, decayMult:1.4, detune:1.005}, strum:.015},
    trumpet:{label:'Trompeta', mode:'wind', chord:{type:'sawtooth', type2:'square', filter:2800, attack:.03, decayMult:1.15, detune:1.003}, bass:{type:'sawtooth', type2:'square', filter:1600, attack:.025, decayMult:1.1, detune:1.002}, solo:{type:'sawtooth', type2:'square', filter:3400, attack:.025, decayMult:1.3, detune:1.004}, strum:.012},
    // Cambio 451: chelo — pedido por Val, con sample real confirmado.
    // mode:'wind' (arco, sonido sostenido) igual que violín.
    cello:{label:'Chelo', mode:'wind', chord:{type:'sawtooth', type2:'sine', filter:1800, attack:.06, decayMult:1.5, detune:1.003}, bass:{type:'sawtooth', type2:'sine', filter:1000, attack:.05, decayMult:1.4, detune:1.002}, solo:{type:'sawtooth', type2:'triangle', filter:2200, attack:.055, decayMult:1.6, detune:1.004}, strum:.015}
};
