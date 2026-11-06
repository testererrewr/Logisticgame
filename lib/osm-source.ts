export function osmGeometry(raw:any){
 if(!Array.isArray(raw?.elements))throw Error('Ungültige OSM-Kartendaten.');
 const nodes=new Map<number,any>(),ways=new Map<number,any>();
 for(const e of raw.elements){if(e.type==='node')nodes.set(e.id,e);if(e.type==='way')ways.set(e.id,e);}
 const geometry=(w:any)=>w.geometry||w.nodes?.map((id:number)=>{const n=nodes.get(id);return n?{lat:n.lat,lon:n.lon}:null;});
 const roads=/^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$/;
 const elements=[];
 for(const e of raw.elements){const t=e.tags||{};
  if(e.type==='node'){if(t.shop||t.amenity)elements.push(e);continue;}
  if(e.type==='way'&&(roads.test(t.highway)||t.building||t.natural==='water'||t.waterway==='riverbank'))elements.push({...e,geometry:geometry(e)});
  if(e.type==='relation'&&t.natural==='water')elements.push({...e,members:e.members?.map((m:any)=>({...m,geometry:m.geometry||geometry(ways.get(m.ref)||{})}))});
 }
 return {elements,osm3s:raw.osm3s};
}
