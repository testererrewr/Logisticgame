import type {Company,Line} from './game';
export const siteCountry=(site:{country?:string}|undefined)=>site?.country||'Nicht zugeordnet';
export function lineCountries(c:Company,l:Line){const sites=[...c.stops||[],...c.facilities||[]];return [...new Set((l.stopIds||l.facilityIds||[l.fromFacility,l.toFacility]).map(id=>siteCountry(sites.find(s=>s.id===id))))];}
