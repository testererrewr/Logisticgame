'use client';
import {maintenanceFactor} from '../lib/maintenance';
import type {Vehicle} from '../lib/fleet';
import type {World,Action} from '../lib/game';
import {vehicleModel} from '../lib/vehicle-models';
import {vehicleHealthView} from '../lib/vehicle-health';
import {useMoney} from './money-display';
export default function VehicleHealthInfo({vehicle:v,world}:{vehicle:Vehicle;world:World;onAction?:(a:Action)=>Promise<any>;busy?:boolean}){const time=world.state.simTime||Date.now(),q=vehicleHealthView(v,time),money=useMoney(),model=vehicleModel(v,world.state.vehicleCatalog?.models),days=Math.floor(q.years*365);return <div className="vehicle-health"><div><span>{q.estimated?'Vorgeschichte unbekannt · seit Erfassung':'Betriebsalter'}: {days<365?days+' Welttage':q.years.toLocaleString('de-DE',{maximumFractionDigits:1})+' Weltjahre'}</span><span>{q.km.toLocaleString('de-DE',{maximumFractionDigits:0})} KM</span></div><small>Wartung: {money(model.maintenance*maintenanceFactor(world.state))} / Welttag + {money(model.costPerKm*maintenanceFactor(world.state))} / km · Energie separat</small></div>;}
