import type {TrailerSpec} from './vehicle-catalog';

const TYPES:Record<string,string>={
 'krone-profi':'Planenauflieger','krone-profi-hd':'Schwerlast-Planenauflieger','krone-mega':'Mega-Planenauflieger',
 'krone-cool':'Kühlauflieger','krone-dry':'Kofferauflieger','krone-coil':'Coilmulden-Auflieger','krone-paper':'Papierrollen-Auflieger',
 'krone-box':'Containerchassis','krone-tank-container':'Tankcontainer-Chassis',
 'schmitz-universal':'Planenauflieger','schmitz-mega':'Mega-Planenauflieger','schmitz-cool':'Kühlauflieger',
 'schmitz-kipper':'Kippauflieger','schmitz-container':'Containerchassis','schwarzmueller-timber':'Holztransport-Auflieger',
 'feldbinder-silo':'Siloauflieger','fliegl-ass':'Schubboden-Auflieger','faymonville-multimax':'Tieflader',
 'body-box':'Kofferaufbau','body-cool':'Kühlaufbau','body-timber':'Rungenaufbau',
 'kogel-cargo':'Coilmulden-Auflieger','kogel-mega':'Mega-Planenauflieger','wielton-curtain':'Planenauflieger',
 'kogel-cool':'Kühlauflieger','kogel-cool-pharma':'Pharma-Kühlauflieger','kogel-port':'Containerchassis',
 'wielton-container':'Containerchassis','feldbinder-tsa':'Tankauflieger','kaessbohrer-ssl':'Lebensmitteltank',
 'feldbinder-adr':'Gefahrgut-Tankauflieger','kaessbohrer-stb':'Chemietank-Auflieger',
 'kaessbohrer-ssk':'Siloauflieger','langendorf-kipper':'Kippauflieger','wielton-kipper':'Kippauflieger',
 'goldhofer-stz':'Tieflader','nooteboom-mco':'Tieflader','menke-livestock':'Viehtransporter',
 'pezzaioli-livestock':'Viehtransporter','body-flatbed':'Pritschenaufbau','meiller-tipper':'Kipperaufbau',
 'body-tank':'Tankaufbau','body-livestock':'Viehaufbau',
};

export function trailerTypeLabel(spec:TrailerSpec|undefined){return spec?TYPES[spec.id]||(spec.mount==='body'?'Fester Aufbau':'Sattelauflieger'):'Unbekannter Auflieger';}
export function trailerDisplayLabel(spec:TrailerSpec|undefined){return spec?`${trailerTypeLabel(spec)} · ${spec.name}`:'Unbekannter Auflieger';}
