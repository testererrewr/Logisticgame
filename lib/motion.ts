export const accelerationByMode={bus:.8,train:.65,plane:1.4,ship:.035};
export const brakingByMode={bus:1,train:.8,plane:1.2,ship:.045};
export function motionProfile(distance:number,speed:number,acceleration:number,braking:number){
 const v=Math.max(.1,speed/3.6),a=Math.max(.01,acceleration),b=Math.max(.01,braking),peak=Math.min(v,Math.sqrt(2*Math.max(0,distance)/(1/a+1/b))),up=peak/a,down=peak/b,cruise=Math.max(0,(distance-peak*peak/(2*a)-peak*peak/(2*b))/Math.max(.01,peak));
 return {distance,peak,acceleration:a,braking:b,up,down,cruise,seconds:Math.max(.001,up+cruise+down)};
}
export type MotionProfile=ReturnType<typeof motionProfile>;
export function motionDistance(p:MotionProfile,seconds:number){const t=Math.max(0,Math.min(p.seconds,seconds));if(t<p.up)return .5*p.acceleration*t*t;if(t<p.up+p.cruise)return .5*p.peak*p.up+p.peak*(t-p.up);const remaining=p.seconds-t;return p.distance-.5*p.braking*remaining*remaining;}
export function motionSpeed(p:MotionProfile,seconds:number){const t=Math.max(0,Math.min(p.seconds,seconds));return Math.max(0,Math.min(p.peak,p.acceleration*t,p.braking*(p.seconds-t)))*3.6;}
export function motionTime(p:MotionProfile,distance:number){const d=Math.max(0,Math.min(p.distance,distance)),up=.5*p.peak*p.up,down=.5*p.peak*p.down;if(d<up)return Math.sqrt(2*d/p.acceleration);if(d>p.distance-down)return p.seconds-Math.sqrt(2*(p.distance-d)/p.braking);return p.up+(d-up)/Math.max(.01,p.peak);}
