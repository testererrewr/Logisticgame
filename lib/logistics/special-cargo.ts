export interface SpecialCargo {id:string;name:string;icon:string;text:string}
export const SPECIAL_CARGO:SpecialCargo[]=[
 {id:'art',name:'Gemälde (Museumsleihgabe)',icon:'🖼️',text:'Klimatisiert, versichert, mit Kunstspedition-Siegel.'},
 {id:'horses',name:'Rennpferde',icon:'🐎',text:'Zwei Champions auf dem Weg zum großen Rennen.'},
 {id:'prototype',name:'Fahrzeug-Prototyp',icon:'🚗',text:'Streng geheim – Planen bleiben zu.'},
 {id:'antique',name:'Antiquitäten',icon:'🏺',text:'Zerbrechlich und unbezahlbar.'},
 {id:'satellite',name:'Satellitenmodul',icon:'🛰️',text:'Für den Start in drei Wochen.'},
 {id:'violin',name:'Stradivari-Geige',icon:'🎻',text:'Für ein Galakonzert – mit eigenem Sicherheitsdienst.'},
 {id:'dino',name:'Dinosaurier-Skelett',icon:'🦖',text:'Ein T-Rex zieht ins Naturkundemuseum um.'},
 {id:'gold',name:'Goldbarren',icon:'🪙',text:'Werttransport mit Begleitschutz.'},
 {id:'orchestra',name:'Orchester-Instrumente',icon:'🎼',text:'Die Welttournee geht weiter.'},
 {id:'meteorite',name:'Meteorit',icon:'☄️',text:'Ein Fund aus der Wüste für die Forschung.'},
];
export const SPECIAL_SHARE=.005,SPECIAL_FEE=3;
export const specialCargo=(id?:string|null)=>id?SPECIAL_CARGO.find(c=>c.id===id):undefined;
