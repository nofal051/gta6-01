// Motorcycles — a second way to move, with its own handling.
//
// A bike is a car as far as the engine is concerned: it has a
// position, an angle, a speed and a driver, so the player module can
// drive it, traffic can ride it, and the police can chase it without
// any of them learning what a bike is. What makes it a bike is the
// handling row in vehicles.js — quicker off the line than a sedan,
// a higher top speed, a narrower body — and the way it is drawn:
// two wheels and a rider leaning into the turn instead of a box with
// a cabin.
//
// Bikes park in different places than cars do: two lean against the
// boardwalk rail, one by the park gates, two more on ordinary street
// corners. Two more are out on the roads with riders, cruising the
// same lanes as the traffic cars. Steal one with E, exactly like a
// car — taking a ridden bike is the same crime as taking a car.
import { makeCar } from './vehicles.js';
import { ROAD } from './config.js';
import { pick, range } from './random.js';
import { earnCash } from './economy.js';

export const BIKE_MODELS = ['Stinger', 'Hornet', 'Vagabond', 'Comet R', 'Dune Rider'];

// One bike. `makeCar` does the building; the bike flag and the
// narrower body are what set it apart from the cars around it.
export function makeBike(id, x, y, angle, opts) {
  const bike = makeCar(id, x, y, angle, { ...opts, kind: 'bike' });
  bike.isBike = true;
  bike.name = pick(opts.rng, BIKE_MODELS);
  return bike;
}

// Six parked bikes and two ridden ones, seeded around the city.
export function createBikes(rng, world) {
  const bikes = [];
  let id = 1000;
  const spots = [
    { x: world.beach.x - 30, y: world.roadsY[1] + 40 },
    { x: world.beach.x - 30, y: world.roadsY[2] - 40 },
    { x: world.park.x - 20, y: world.park.y + world.park.h / 2 },
    { x: pick(rng, world.roadsX) + ROAD / 2 - 14, y: pick(rng, world.roadsY) + range(rng, -180, 180) },
    { x: pick(rng, world.roadsX) + range(rng, -180, 180), y: pick(rng, world.roadsY) + ROAD / 2 - 14 },
  ];
  for (const spot of spots) {
    bikes.push(makeBike(id++, spot.x, spot.y, rng() < 0.5 ? 0 : Math.PI / 2, { rng, parked: true }));
  }
  // Two riders out in traffic, cruising a road each.
  for (let i = 0; i < 2; i += 1) {
    const along = rng() < 0.5;
    const lane = (rng() < 0.5 ? -1 : 1) * (ROAD / 4 - 4);
    const bike = makeBike(
      id++,
      along ? range(rng, 60, 2300) : pick(rng, world.roadsX) + lane,
      along ? pick(rng, world.roadsY) + lane : range(rng, 60, 1800),
      along ? (lane > 0 ? 0 : Math.PI) : (lane > 0 ? Math.PI / 2 : -Math.PI / 2),
      { rng, traffic: true, axis: along ? 'x' : 'y', dir: lane > 0 ? 1 : -1, lane },
    );
    bike.speed = range(rng, 130, 175);
    bikes.push(bike);
  }
  return bikes;
}

// The getaway job (arc three, mission three) needs a bike in reach.
// If the player has no bike within 400 world units, park a fresh one
// on the nearest road edge so the job is always finishable.
export function ensureBikeNearby(state) {
  const p = state.player;
  for (const car of state.cars) {
    if (!car.isBike || car.wrecked) continue;
    if (Math.hypot(car.x - p.x, car.y - p.y) < 400) return car;
  }
  const rx = state.world.roadsX.reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a));
  const bike = makeBike(state.cars.length + 1000, rx + 20, p.y + 60, 0, {
    rng: state.rng,
    parked: true,
  });
  state.cars.push(bike);
  return bike;
}

// A bike's top speed, before garage upgrades, for the phone stats
// tab and the HUD speedometer's flavour line.
export function bikeTopSpeedMph() {
  return Math.round(520 * 1.18 * 0.22);
}

// Wheelies: hold Shift on a bike over 300 speed and the front wheel
// comes up. Every half second of wheelie pays $2 — the boardwalk
// crowd loves a show, and Dario's bookie pays for applause. Let go
// of Shift, or drop below speed, and the wheelie ends.
export function updateBikes(state, input, dt) {
  const p = state.player;
  const car = p.car;
  if (!car || !car.isBike || p.onFoot) return;
  const shifting = input && input.isDown && (input.isDown('ShiftLeft') || input.isDown('ShiftRight'));
  const fast = Math.abs(car.speed) > 300;
  if (shifting && fast) {
    car.wheelie = true;
    car.trickTimer = (car.trickTimer || 0) + dt;
    if (car.trickTimer >= 0.5) {
      car.trickTimer = 0;
      earnCash(state, 2);
    }
  } else {
    car.wheelie = false;
    car.trickTimer = 0;
  }
}

// Is the player popping a wheelie right now? The HUD shows it.
export function isWheelie(state) {
  return !!(state.player.car && state.player.car.isBike && state.player.car.wheelie);
}
