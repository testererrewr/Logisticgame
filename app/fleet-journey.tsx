'use client';
import {ArrowRight,Clock3,Route} from 'lucide-react';
import type {FleetRow} from '../lib/fleet-view';
import {durationLabel} from '../lib/vehicle-telemetry';

export default function FleetJourney({row:r}:{row:FleetRow}){
 const pose=r.pose;
 return <div className="fleet-journey" aria-label={'Fahrt von '+r.v.name}>
  <span className={'fleet-status status-'+r.key}>{r.label}</span>
  {pose&&<><span className="fleet-direction"><Route size={12}/>{pose.direction}</span>
   <div className="fleet-next-stop"><small>{pose.ended?'Endhalt':'Nächster Halt'}</small><b>{r.nextStop||r.previousStop}</b></div>
   {!pose.ended&&<>
    <small className="fleet-origin"><ArrowRight size={11}/> ab {r.previousStop}</small>
    {!r.clock.stale&&(pose.awaiting?<small className="fleet-timing">Fahrgastwechsel wird bestätigt …</small>:<small className="fleet-timing"><Clock3 size={12}/>{pose.departureRemaining!==undefined?'Abfahrt in '+durationLabel(pose.departureRemaining):'Ankunft in '+durationLabel(pose.remaining)}<span>Weltzeit</span></small>)}
    <div className="fleet-leg-progress" role="progressbar" aria-label={'Streckenfortschritt von '+r.v.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pose.progress*100)}><i style={{width:Math.round(pose.progress*100)+'%'}}/></div>
   </>}
  </>}
  {r.issue&&<small className="fleet-issue">{r.issue}</small>}
  {!pose&&r.line&&r.key==='starting'&&<small>Wartet auf einen passenden Serverstand.</small>}
  {!r.line&&<small>Im Depot einer erreichbaren Linie zuweisen.</small>}
 </div>;
}
