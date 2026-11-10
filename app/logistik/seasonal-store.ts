'use client';
import {useEffect,useState} from 'react';
let active:string[]=[];const subs=new Set<(v:string[])=>void>();
export function setActiveSeasonal(ids:string[]){const next=[...new Set(ids)].sort();if(next.join()===active.join())return;active=next;for(const f of subs)f(active);}
export function useActiveSeasonal(){const [v,setV]=useState(active);useEffect(()=>{subs.add(setV);setV(active);return()=>{subs.delete(setV);};},[]);return v;}
let projects:any[]=[];const psubs=new Set<(v:any[])=>void>();
export function setProjects(v:any[]){projects=v;for(const f of psubs)f(projects);}
export function useProjects(){const [v,setV]=useState(projects);useEffect(()=>{psubs.add(setV);setV(projects);return()=>{psubs.delete(setV);};},[]);return v;}
export function ProjectsSync({worldId}:{worldId:string}){useEffect(()=>{let alive=true;const load=async()=>{try{const r=await fetch('/api/logistik/projects?world='+encodeURIComponent(worldId),{cache:'no-store'}),d=await r.json() as any;if(alive&&r.ok){setActiveSeasonal(d.seasonal||[]);setProjects(d.projects||[]);}}catch{}};void load();const t=setInterval(()=>void load(),120000);const on=()=>void load();window.addEventListener('log-projects-refresh',on);return()=>{alive=false;clearInterval(t);window.removeEventListener('log-projects-refresh',on);};},[worldId]);return null;}
