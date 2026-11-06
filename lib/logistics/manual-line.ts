import type {Line} from './engine';
/** Old per-stop Go flags are interpreted as a manual line until explicitly changed. */
export const isManualLine=(line:Pick<Line,'stops'|'manualDeparture'>)=>line.manualDeparture??line.stops.some(st=>!!st.manualDeparture);
