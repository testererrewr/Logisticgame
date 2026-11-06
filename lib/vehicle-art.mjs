// Shared stable filename for the catalog's original, schematic model artwork.
export function modelIllustrationFile(id){let hash=2166136261;for(const char of id)hash=Math.imul(hash^char.charCodeAt(0),16777619);return '/vehicles/model31-'+(hash>>>0).toString(16).padStart(8,'0')+'.svg';}
