'use client';
import {Radio,Clock3} from 'lucide-react';
import {liveClock} from '../lib/vehicle-telemetry';
import type {World} from '../lib/game';

export default function FleetLiveHeader({world,now}:{world:World;now:number}){
 const clock=liveClock(world,now),running=world.status==='running';
 return <div className={'fleet-live-header '+(clock.stale?'is-stale':'')} aria-label="Flottenabgleich">
  <div><Radio size={18}/><span><b>{!running?'Welt nicht in Betrieb':clock.stale?'Serververbindung verzögert':'Live-Betrieb'}</b><small>{clock.stale?'Letzter bestätigter Stand. Zeiten und Positionen werden beim nächsten Abgleich aktualisiert.':'Positionen werden laufend berechnet. Belegung und Fahrgeld stammen vom Server.'}</small></span></div>
  <div className="fleet-live-clock"><Clock3 size={14}/><span><b>{new Date(clock.time).toLocaleTimeString('de-DE')}</b><small>{world.config?.timeScale||1}× Weltzeit · Abgleich vor {Math.floor(clock.age/1000)} Sek.</small></span></div>
 </div>;
}
