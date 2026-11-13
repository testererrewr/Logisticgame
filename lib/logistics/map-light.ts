export const GAME_DAY_MS = 86_400_000;

interface MapClock {
  day: number;
  clockDay?: number;
  simTime?: number;
  status: string;
  timeScale: number;
  settings?: { seasonEnd?: number | null };
}

export function mapClock(world: MapClock, elapsedMs: number) {
  const elapsedDays = world.status === 'running'
    ? Math.max(0, elapsedMs) * (world.timeScale ?? 1) / GAME_DAY_MS
    : 0;
  const sample = world.status === 'running' ? world.clockDay ?? world.day : world.day;
  const day = Math.min(sample + elapsedDays, world.settings?.seasonEnd ?? Infinity);
  // Existing servers anchor simTime to the creation hour. The game's schedules
  // use midnight at the start of each integer day, so keep the date only.
  const epoch = world.simTime === undefined
    ? Date.UTC(2025, 0, 1)
    : world.simTime - (world.day - 1) * GAME_DAY_MS;
  const midnight = Math.floor((epoch + 0.5) / GAME_DAY_MS) * GAME_DAY_MS;
  return { day, time: midnight + (day - 1) * GAME_DAY_MS };
}

const radians = Math.PI / 180;
const latitudeLimit = 85.05112878;
const wrapLongitude = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180;

export function nightPolygon(time: number): [number, number][] {
  const date = new Date(time);
  const dayOfYear = (time - Date.UTC(date.getUTCFullYear(), 0, 1)) / GAME_DAY_MS;
  const declination = -23.44 * Math.cos(2 * Math.PI / 365.2422 * (dayOfYear + 10));
  const sunLongitude = 180 - ((time % GAME_DAY_MS + GAME_DAY_MS) % GAME_DAY_MS) / 240_000;
  const pole = declination >= 0 ? -latitudeLimit : latitudeLimit;
  const tangent = Math.tan(declination * radians) || Number.EPSILON;
  const longitudes = Array.from({ length: 181 }, (_, i) => -180 + 2 * i);
  // Add samples near the equator crossings, where the boundary steepens at equinox.
  for (const crossing of [sunLongitude - 90, sunLongitude + 90]) {
    for (const offset of [-0.5, -0.05, 0, 0.05, 0.5]) {
      longitudes.push(wrapLongitude(crossing + offset));
    }
  }
  const boundary = longitudes.sort((a, b) => a - b).map((lon): [number, number] => {
    const lat = Math.atan(-Math.cos((lon - sunLongitude) * radians) / tangent) / radians;
    return [Math.max(-latitudeLimit, Math.min(latitudeLimit, lat)), lon];
  });
  return [...boundary, [pole, 180], [pole, -180]];
}
