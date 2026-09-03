// Studio 936 Composer - Rhythm Engine Module
// Source: extracted from v25.9 core modular.

window.Studio936Rhythms = {
    funk:{
        label:'Funk', swing:.08, bass:[0,6,8,14], chord:[0,3,7,10,12,15], ghost:[2,5,11], arp:false,
        help:'Funk: semicorcheas, contratiempos, ghost chords y bajo sincopado. Ideal para sentir acompañamiento rítmico.'
    },
    rock:{
        // Cambio 467: reconstruido. Antes el acorde pegaba EXACTO en el
        // mismo lugar que el bajo (negras rectas los dos) — sonaba
        // genérico, sin carácter de guitarra rítmica real. Ahora: bajo
        // en negras (correcto, así es el rock real), pero el acorde es
        // un strum de corcheas rectas (guitarra rítmica/power chords),
        // con "chugs" apagados en las semicorcheas de en medio — el
        // vaivén característico del rock, no un bloque plano.
        label:'Rock', swing:0, bass:[0,4,8,12], chord:[0,2,4,6,8,10,12,14], ghost:[1,3,5,7,9,11,13,15], arp:false,
        help:'Rock: bajo sólido en negras, guitarra rítmica en corcheas rectas con chugs apagados entre medio — el vaivén de power chords real, no un bloque plano.'
    },
    ballad:{
        label:'Balada', swing:0, bass:[0,8], chord:[0,8], ghost:[], arp:true,
        help:'Balada: acompañamiento abierto con arpegio. Menos golpes, más aire y sostén armónico.'
    },
    bossa:{
        // Cambio 469: reconstruido. El acorde pegaba cada 4 pasos exactos
        // (3,7,11,15) — eso es un contratiempo PAREJO, no síncopa real.
        // El bossa nova de verdad tiene agrupaciones desparejas (el
        // patrón clásico de comping, el que se enseña en los métodos,
        // tipo 3-3-4-2 pasos entre golpe y golpe). Val tenía razón: se
        // sentía mecánico, no bossa.
        label:'Bossa Nova', swing:0, bass:[0,6,8,14], chord:[0,3,6,10,12], ghost:[8,15], arp:false,
        help:'Bossa Nova: bajo alternado en tónica/quinta, acordes con la síncopa irregular real del comping brasileño (agrupaciones desparejas, no un contratiempo parejo) — el patrón clásico tipo Jobim/Gilberto, no una aproximación genérica.'
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
        // Cambio 467: reconstruido. Antes el bajo pegaba en negras rectas
        // — casi idéntico a Rock, sin la síncopa que define a la cumbia.
        // Ahora usa la figura de bajo característica del género (acento
        // adelantado antes del 3er tiempo, no cuadrada), acordes de
        // acordeón/guitarra en contratiempo, y un swing sutil para el
        // vaivén bailable real.
        label:'Cumbia', swing:.05, bass:[0,6,8,12], chord:[3,7,11,14], ghost:[2,10], arp:false,
        help:'Cumbia: figura de bajo sincopada (adelantada antes del 3er tiempo, no en negras rectas), acordes de acordeón en contratiempo. Pulso bailable real, no genérico.'
    },
    reggae:{
        label:'Reggae', swing:.03, bass:[0,8], chord:[4,12], ghost:[6,14], arp:false,
        help:'Reggae: acordes en off-beat, bajo con mucho espacio y sensación relajada.'
    },
    // Cambio 463: 3 ritmos electrónicos nuevos, pedidos por Val como
    // bases reales para componer encima — no reusan ningún patrón
    // existente, están armados desde cero pensando en cada género.
    trance:{
        label:'Trance', swing:0, bass:[0,4,8,12], chord:[2,6,10,14], ghost:[], arp:false, pad:true,
        help:'Trance: bajo en negras (four-on-the-floor), acordes cortos en los contratiempos. Base directa y sostenida para construir encima.'
    },
    eurotrance:{
        label:'Eurotrance', swing:0, bass:[0,4,8,12], chord:[0,2,4,6,8,10,12,14], ghost:[], arp:true, pad:true,
        help:'Eurotrance: bajo en negras y acorde arpegiado corriendo en corcheas — el "arpegio trance" característico, más denso y energético que Trance.'
    },
    electro:{
        label:'Electro (UK)', swing:.05, bass:[0,4,8,10,12], chord:[4,12], ghost:[7,15], arp:false, pad:true,
        help:'Electro británico: bajo con el "rebote" extra típico del género (golpe de más entre el 8 y el 12), acordes escasos y ghost sincopados para el aire garage.'
    },
    // Cambio 468: 4 géneros electrónicos nuevos más.
    house:{
        label:'House', swing:.05, bass:[0,4,7,8,12,15], chord:[3,7,11,15], ghost:[], arp:false, pad:true,
        help:'House: bombo/bajo four-on-the-floor con un pequeño rebote sincopado, acordes tipo "stab" en el contratiempo (el clásico acorde jazzy de house), con un poco de swing para el groove bailable.'
    },
    techno:{
        label:'Techno', swing:0, bass:[0,2,4,6,8,10,12,14], chord:[0,8], ghost:[], arp:false,
        help:'Techno: bajo pulsando en corcheas rectas, hipnótico, acordes mínimos y escasos — el género se apoya en el ritmo y el bajo, no en la armonía. Sin pad de fondo a propósito, busca sonar más duro/directo.'
    },
    dnb:{
        label:'Drum & Bass', swing:0, bass:[0,3,10,13], chord:[8], ghost:[], arp:false, pad:true,
        help:'Drum & Bass: bajo sub grave y sincopado (no pegado al bombo), acorde único casi de adorno — acá el protagonista real es el breakbeat de la batería, no la armonía.'
    },
    dubstep:{
        label:'Dubstep', swing:0, bass:[0,6,10], chord:[0], ghost:[], arp:false, pad:true,
        help:'Dubstep: sensación "half-time" (todo se siente a la mitad de velocidad), bajo con reataques a mitad de compás simulando el "wobble", acorde único de fondo. Limitación real: el wobble de verdad es una nota sostenida con modulación de filtro en el tiempo, no algo que este motor pueda simular con golpes — esto es una aproximación rítmica, no el timbre real.'
    }
};
