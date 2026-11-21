// Screenshot staging behind ?shot=title|play|chase|mission.
//
// Each scene plays the real rules forward from a fresh state with a
// simple autopilot: get in the nearest car, then steer toward the next
// intersection or the mission marker, following the roads instead of
// cutting across blocks. The frame is what a short real game looks
// like, and the same seed always stages the same frame.
//
// Round two stages the new systems too: the title sits at dusk, the
// chase is a four-star night storm with the helicopter overhead, and
// the mission shot runs Dario Salas' boardwalk job in daylight.
import { STEP } from './config.js';
import { nearestRoadPoint } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { tryEnterCar } from './player.js';
import { startMission } from './missions.js';
import { stepGame } from './update.js';
import { setWeather } from './weather.js';

// The staging never makes a sound.
const SILENT = {
  shot() {}, crash() {}, siren() {}, cash() {}, pickup() {}, fail() {},
  engine() {}, thunder() {}, explosion() {}, rotor() {}, staticBurst() {},
  playNote() {}, horn() {},
};

function fakeInput(steer) {
  return {
    mouse: { x: 640, y: 360, down: false },
    axes() {
      return { forward: 1, strafe: steer };
    },
    isDown() {
      return false;
    },
    takeActions() {
      return 0;
    },
  };
}

// Steer the player's car toward a point: -1 left, 0 straight, 1 right.
function steerToward(state, tx, ty) {
  const car = state.player.car;
  if (!car) return 0;
  const target = Math.atan2(ty - car.y, tx - car.x);
  let diff = target - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > 0.12) return 1;
  if (diff < -0.12) return -1;
  return 0;
}

// The nearest road centreline to `value` in a list of them.
function nearestBy(list, value) {
  return list.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a));
}

// Pick a waypoint on the roads toward `target`: first get onto the
// nearest road, then drive along it in an L-shape toward the target.
function roadWaypoint(state, target) {
  const p = state.player;
  const w = state.world;
  const np = nearestRoadPoint(w, p.x, p.y);
  if (np.d > 40) return np;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return { x: target.x, y: nearestBy(w.roadsY, p.y) };
  }
  return { x: nearestBy(w.roadsX, p.x), y: target.y };
}

// Drive for `seconds`, steering toward whatever `targetFn` returns.
function driveFor(state, seconds, targetFn) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const target = targetFn(state, i);
    const wp = roadWaypoint(state, target);
    const steer = steerToward(state, wp.x, wp.y);
    stepGame(state, fakeInput(steer), SILENT, STEP);
    // Unstuck: if the car is barely moving, point it at the waypoint
    // and give it some speed again.
    const car = state.player.car;
    if (car && Math.abs(car.speed) < 40 && i % 30 === 0) {
      car.angle = Math.atan2(wp.y - car.y, wp.x - car.x);
      car.speed = 120;
    }
    if (state.overReason) break;
  }
}

// Walk the player to the nearest car and press E, the way a player would.
function getInNearestCar(state) {
  let nearest = null;
  let nearestD = Infinity;
  for (const car of state.cars) {
    const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    if (d < nearestD) {
      nearestD = d;
      nearest = car;
    }
  }
  if (nearest) {
    state.player.x = nearest.x;
    state.player.y = nearest.y;
  }
  tryEnterCar(state.player, state.cars, state.events);
}

export function stageShot(name, state) {
  const rng = state.rng;

  // The title screen at dusk: let the city live for five seconds
  // behind it, lamps coming on as the light fades.
  if (name === 'title') {
    state.clock = 19 * 60 + 20;
    setWeather(state.weather, 'clear');
    for (let i = 0; i < 5 / STEP; i += 1) stepGame(state, fakeInput(0), SILENT, STEP);
    return { screen: SCREEN_TITLE, best: 1250 };
  }

  getInNearestCar(state);

  if (name === 'chase') {
    // Four stars under a night storm: the helicopter is overhead,
    // the headlights are on, the rain is falling, roadblocks go up.
    state.clock = 22 * 60;
    setWeather(state.weather, 'storm');
    state.player.wanted = 4;
    state.player.wantedTimer = 0;
    const w = state.world;
    driveFor(state, 9, () => ({ x: w.roadsX[4], y: w.roadsY[1] }));
    return { screen: SCREEN_PLAY, best: 1250 };
  }

  if (name === 'mission') {
    // Dario Salas' boardwalk run, job twelve: twelve seconds of
    // driving toward the dealership with the mission marker and timer
    // on the HUD — the new arc-three job, past the boardwalk stalls.
    state.clock = 10 * 60;
    setWeather(state.weather, 'clear');
    state.missions.index = 11;
    state.missions.done = 11;
    startMission(state, rng);
    const target = state.missions.target || { x: 1200, y: 800 };
    driveFor(state, 12, () => target);
    return { screen: SCREEN_PLAY, best: 1250 };
  }

  // play: cruise the city between a few intersections in daylight,
  // 22 seconds, traffic and pedestrians all around.
  state.clock = 10 * 60;
  setWeather(state.weather, 'clear');
  const w = state.world;
  const stops = [
    { x: w.roadsX[4], y: w.roadsY[2] },
    { x: w.roadsX[2], y: w.roadsY[3] },
    { x: w.roadsX[5], y: w.roadsY[1] },
  ];
  let stop = 0;
  driveFor(state, 22, (s) => {
    const t = stops[stop % stops.length];
    if (Math.hypot(s.player.x - t.x, s.player.y - t.y) < 120) stop += 1;
    return stops[stop % stops.length];
  });
  return { screen: SCREEN_PLAY, best: 1250 };
}
