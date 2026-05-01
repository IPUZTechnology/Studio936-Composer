// Studio 936 Composer - Rhythm Engine Module
// Source: extracted from v25.9 core modular.

window.Studio936Rhythms = {
    funk:{
        label:'Funk', swing:.08, bass:[0,6,8,14], chord:[0,3,7,10,12,15], ghost:[2,5,11], arp:false,
        help:'Funk: semicorcheas, contratiempos, ghost chords y bajo sincopado. Ideal para sentir acompañamiento rítmico.'
    },
    rock:{
        label:'Rock', swing:0, bass:[0,4,8,12], chord:[0,4,8,12], ghost:[2,6,10,14], arp:false,
        help:'Rock: pulso fuerte en negras/corcheas, bajo sólido y acordes más directos.'
    },
    ballad:{
        label:'Balada', swing:0, bass:[0,8], chord:[0,8], ghost:[], arp:true,
        help:'Balada: acompañamiento abierto con arpegio. Menos golpes, más aire y sostén armónico.'
    },
    bossa:{
        label:'Bossa Nova', swing:0, bass:[0,6,8,14], chord:[3,7,11,15], ghost:[5,13], arp:false,
        help:'Bossa Nova: bajo alternado y acordes en síncopas suaves, tipo guitarra/piano brasileño.'
    },
    jazz:{
        label:'Jazz', swing:.22, bass:[0,4,8,12], chord:[0,5,8,13], ghost:[10,15], arp:false,
        help:'Jazz: comping con swing, walking bass simplificado y acordes desplazados.'
    },
    blues:{
        label:'Blues', swing:.28, bass:[0,3,6,9,12,15], chord:[0,6,8,14], ghost:[4,10], arp:false,
        help:'Blues: sensación shuffle, bajo repetido y golpes de acorde con respuesta.'
    },
    pop:{
        label:'Pop', swing:0, bass:[0,8], chord:[0,4,8,12], ghost:[6,14], arp:true,
        help:'Pop: patrón estable, claro para componer melodías y probar progresiones rápido.'
    },
    bolero:{
        label:'Bolero', swing:0, bass:[0,8], chord:[3,6,11,14], ghost:[5,13], arp:false,
        help:'Bolero: bajo lento con acordes suaves en contratiempo. Útil para balada latina, canción romántica y acompañamiento cantable.'
    },
    salsa:{
        label:'Salsa', swing:.04, bass:[0,7,10,14], chord:[4,7,12,15], ghost:[2,10], arp:false,
        help:'Salsa: tumbao simplificado para piano, con bajo anticipado y acordes sincopados. No reemplaza una clave completa, pero da el sabor para componer.'
    },
    cumbia:{
        label:'Cumbia', swing:0, bass:[0,4,8,12], chord:[2,6,10,14], ghost:[15], arp:false,
        help:'Cumbia: pulso bailable, bajo estable y acordes en respuesta. Muy útil para progresiones latinas sencillas.'
    },
    reggae:{
        label:'Reggae', swing:.03, bass:[0,8], chord:[4,12], ghost:[6,14], arp:false,
        help:'Reggae: acordes en off-beat, bajo con mucho espacio y sensación relajada.'
    }
};
