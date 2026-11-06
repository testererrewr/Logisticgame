import type {Line} from './engine';
export const isManualLine=(line:Pick<Line,'stops'|'manualDeparture'>)=>line.manualDeparture??line.stops.some(st=>!!st.manualDeparture);
