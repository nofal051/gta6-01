// Screenshot staging behind ?shot=title|play|chase|mission. Each scene
// plays the real rules forward from a fresh state with a simple autopilot
// (get in a car, steer toward the next intersection or the mission
// marker), so the frame is what a short game really looks like and the
// same seed always gives the same frame.
import { STEP } from './config.js';
import { nearestRoadPoint } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { tryEnterCar } from './player.js';
import { startMission } from './missions.js';
import { stepGame } from './update.js';

const SILENT = { shot() {}, crash() {}, siren() {}, cash() {}, pickup() {}, fail() {}, engine() {} };

function fakeInput(steer) {
  return {
    mouse: { x: 640, y: 360, down: false },
    axes() { return { forward: 1, strafe: steer }; },
    isDown() { return false; },
    takeActions() { return 0; },
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
  return diff > 0.12 ? 1 : diff < -0.12 ? -1 : 0;
}

// Follow the roads to a target instead of cutting across blocks: first get
// onto the nearest road, then drive along it in an L-shape toward it.
function roadWaypoint(state, target) {
  const p = state.player;
  const w = state.world;
  const np = nearestRoadPoint(w, p.x, p.y);
  if (np.d > 40) return np;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    const ry = w.roadsY.reduce((a, b) => (Math.abs(b - p.y) < Math.abs(a - p.y) ? b : a));
    return { x: target.x, y: ry };
  }
  const rx = w.roadsX.reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a));
  return { x: rx, y: target.y };
}

function driveFor(state, seconds, targetFn) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const target = targetFn(state, i);
    const wp = roadWaypoint(state, target);
    const steer = steerToward(state, wp.x, wp.y);
    stepGame(state, fakeInput(steer), SILENT, STEP);
    // Unstick: if the car is barely moving, point it straight at the target.
    const car = state.player.car;
    if (car && Math.abs(car.speed) < 40 && i % 30 === 0) {
      car.angle = Math.atan2(wp.y - car.y, wp.x - car.x);
      car.speed = 120;
    }
    if (state.overReason) break;
  }
}

export function stageShot(name, state) {
  const rng = state.rng;
  if (name === 'title') {
    for (let i = 0; i < 5 / STEP; i += 1) stepGame(state, fakeInput(0), SILENT, STEP);
    return { screen: SCREEN_TITLE, best: 1250 };
  }

  // Get in the nearest car first: walk the player to it, then press E.
  let nearest = null;
  let nearestD = Infinity;
  for (const car of state.cars) {
    const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    if (d < nearestD) { nearestD = d; nearest = car; }
  }
  if (nearest) { state.player.x = nearest.x; state.player.y = nearest.y; }
  tryEnterCar(state.player, state.cars, state.events);

  if (name === 'chase') {
    state.player.wanted = 3;
    state.player.wantedTimer = 0;
    const w = state.world;
    driveFor(state, 9, () => ({ x: w.roadsX[4], y: w.roadsY[1] }));
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  if (name === 'mission') {
    startMission(state, rng);
    const target = state.missions.target || { x: 1200, y: 800 };
    driveFor(state, 12, () => target);
    return { screen: SCREEN_PLAY, best: 1250 };
  }

  // play: cruise the city toward a few intersections.
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
