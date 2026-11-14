import assert from 'node:assert/strict';
import {GAME_DAY_MS, mapClock, nightPolygon, nightWorldCopies} from '../lib/logistics/map-light.ts';

const midnight = Date.UTC(2026, 5, 21);
const hour = GAME_DAY_MS / 24;
const world = {day: 1.25, simTime: midnight + 16 * hour, status: 'running', timeScale: 24};
assert.deepEqual(mapClock(world, 0), {day: 1.25, time: midnight + 6 * hour});
assert.deepEqual(mapClock(world, hour / 24), {day: 1 + 7 / 24, time: midnight + 7 * hour});
assert.deepEqual(mapClock({...world, clockDay: 1.5}, 0), {day: 1.5, time: midnight + 12 * hour});
for (const status of ['paused', 'finished', 'draft', 'stopped']) {
  assert.deepEqual(mapClock({...world, status}, hour), mapClock(world, 0));
}
assert.deepEqual(mapClock({...world, settings: {seasonEnd: 2}}, GAME_DAY_MS), {day: 2, time: midnight + GAME_DAY_MS});
assert.equal(mapClock({...world, simTime: undefined}, 0).time, Date.UTC(2025, 0, 1, 6));

function shaded(ring, lat, lon) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [aLat, aLon] = ring[i], [bLat, bLon] = ring[j];
    if ((aLon > lon) !== (bLon > lon) && lat < (bLat - aLat) * (lon - aLon) / (bLon - aLon) + aLat) {
      inside = !inside;
    }
  }
  return inside;
}

for (const day of [Date.UTC(2026, 2, 20), midnight, Date.UTC(2026, 11, 21)]) {
  const utcMidnight = nightPolygon(day);
  const utcNoon = nightPolygon(day + 12 * hour);
  assert.equal(shaded(utcMidnight, 0, 0), true);
  assert.equal(shaded(utcMidnight, 0, 179), false);
  assert.equal(shaded(utcMidnight, 0, -179), false);
  assert.equal(shaded(utcNoon, 0, 0), false);
  assert.equal(shaded(utcNoon, 0, 179), true);
  assert.equal(shaded(utcNoon, 0, -179), true);
}
assert.equal(shaded(nightPolygon(midnight), 80, 0), false);
assert.equal(shaded(nightPolygon(midnight + 12 * hour), -80, 0), true);
for (const [lat, lon] of [[48.2,16.4],[52.5,13.4],[51.5,-0.1]]) {
  const winter = Date.UTC(2026, 11, 21);
  assert.equal(shaded(nightPolygon(winter), lat, lon), true);
  assert.equal(shaded(nightPolygon(winter + 12 * hour), lat, lon), false);
}
const equinox = Date.UTC(2026, 2, 20);
assert.equal(shaded(nightPolygon(equinox + 6 * hour), 35.7, 139.7), false);
assert.equal(shaded(nightPolygon(equinox + 18 * hour), 35.7, 139.7), true);
assert.deepEqual(nightWorldCopies(-850, 850), [-720, -360, 0, 360, 720]);
assert.deepEqual(nightWorldCopies(170, 190), [0, 360]);
console.log('PASS map clock: speed, paused states, season end, equinox, solstices and date line.');
