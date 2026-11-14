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

export function solarPosition(time: number) {
  const date = new Date(time);
  const year = date.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const yearLength = Date.UTC(year + 1, 0, 1) - yearStart;
  // NOAA fractional-year approximation. Positive longitude points east.
  const gamma = 2 * Math.PI * (time - yearStart - GAME_DAY_MS / 2) / yearLength;
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const utcMinutes = ((time % GAME_DAY_MS + GAME_DAY_MS) % GAME_DAY_MS) / 60_000;
  const sunLongitude = (720 - utcMinutes - equationOfTime) / 4;
  return { declination, sunLongitude };
}

export function isNightAt(time: number, lat: number, lon: number) {
  const { declination, sunLongitude } = solarPosition(time);
  const latitude = lat * radians;
  const hourAngle = wrapLongitude(lon - sunLongitude) * radians;
  return Math.sin(latitude) * Math.sin(declination)
    + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle) < 0;
}

export function mapLightMinute(time: number) {
  return Math.floor(time / 60_000 + 1e-8) * 60_000;
}

export function nightPolygon(time: number): [number, number][] {
  const { declination, sunLongitude } = solarPosition(time);
  const pole = declination >= 0 ? -latitudeLimit : latitudeLimit;
  const tangent = Math.tan(declination) || Number.EPSILON;
  const longitudes = Array.from({ length: 181 }, (_, i) => -180 + 2 * i);
  // Add samples near the equator crossings, where the boundary steepens at equinox.
  // Sample by latitude as well as longitude. Near the equinox, the whole
  // north/south transition can fit between two longitude samples.
  for (const latitude of Array.from({length:171}, (_, index) => index - 85).concat(-latitudeLimit, latitudeLimit)) {
    const cosine = -Math.tan(latitude * radians) * tangent;
    if (Math.abs(cosine) <= 1) {
      const angle = Math.acos(cosine) / radians;
      longitudes.push(wrapLongitude(sunLongitude - angle), wrapLongitude(sunLongitude + angle));
    }
  }
  const boundary = longitudes.sort((a, b) => a - b).map((lon): [number, number] => {
    const lat = Math.atan(-Math.cos((lon - sunLongitude) * radians) / tangent) / radians;
    return [Math.max(-latitudeLimit, Math.min(latitudeLimit, lat)), lon];
  });
  return [...boundary, [pole, 180], [pole, -180]];
}

export function nightWorldCopies(west: number, east: number): number[] {
  const first = Math.floor((west + 180) / 360);
  const last = Math.floor((east + 180) / 360);
  return Array.from({length: last - first + 1}, (_, index) => (first + index) * 360);
}
