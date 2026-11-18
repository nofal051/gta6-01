// Cars: parked cars the player can steal, and traffic cars that cruise
// the road grid in lanes. Traffic keeps to its road, turns at
// intersections sometimes, and wraps around the far edge so the streets
// never empty out.
import { CAR_MAX_SPEED, ROAD, WORLD_H, WORLD_W } from './config.js';
import { intRange, pick, range } from './random.js';

const CAR_COLORS = ['#d94f3d', '#3d7fd9', '#e8c93a', '#e8e8e8', '#2e2e34', '#7ac94f', '#c97ad9', '#f08a2e'];
const CAR_NAMES = ['Comet', 'Falcon', 'Dune', 'Marlin', 'Puma', 'Atlas', 'Vortex', 'Sable'];

export function makeCar(id, x, y, angle, opts) {
  return {
    id, x, y, angle,
    speed: 0,
    color: pick(opts.rng, CAR_COLORS),
    name: pick(opts.rng, CAR_NAMES),
    traffic: !!opts.traffic,
    parked: !!opts.parked,
    police: !!opts.police,
    axis: opts.axis || 'x',
    dir: opts.dir || 1,
    lane: opts.lane || 0,
    driver: opts.traffic ? 'traffic' : 'none',
  };
}

export function createCars(rng, world) {
  const cars = [];
  let id = 1;

  // Parked cars tucked along road edges, ready to be stolen.
  for (let i = 0; i < 10; i += 1) {
    const rx = pick(rng, world.roadsX);
    const ry = pick(rng, world.roadsY);
    const horizontal = rng() < 0.5;
    const edge = rng() < 0.5 ? -ROAD / 2 + 14 : ROAD / 2 - 14;
    cars.push(makeCar(
      id++,
      horizontal ? rx + range(rng, -180, 180) : rx + edge,
      horizontal ? ry + edge : ry + range(rng, -180, 180),
      horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      { rng, parked: true },
    ));
  }

  // Traffic: one car per road, driving in a lane.
  for (let i = 0; i < 16; i += 1) {
    const horizontal = rng() < 0.5;
    const lane = (rng() < 0.5 ? -1 : 1) * (ROAD / 4 - 4);
    const car = makeCar(
      id++,
      horizontal ? range(rng, 60, WORLD_W - 240) : pick(rng, world.roadsX) + lane,
      horizontal ? pick(rng, world.roadsY) + lane : range(rng, 60, WORLD_H - 60),
      horizontal ? (lane > 0 ? 0 : Math.PI) : (lane > 0 ? Math.PI / 2 : -Math.PI / 2),
      { rng, traffic: true, axis: horizontal ? 'x' : 'y', dir: lane > 0 ? 1 : -1, lane },
    );
    car.speed = range(rng, 110, 190);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, world, dt, rng) {
  for (const car of cars) {
    if (!car.traffic || car.driver === 'player') continue;
    const step = car.speed * car.dir * dt;
    if (car.axis === 'x') {
      car.x += step;
      if (car.x > WORLD_W - 120) { car.x = 60; car.y = pick(rng, world.roadsY) + car.lane; }
      if (car.x < 40) { car.x = WORLD_W - 140; car.y = pick(rng, world.roadsY) + car.lane; }
      // Sometimes turn at an intersection onto the crossing road.
      if (rng() < dt * 0.08 && world.roadsY.some((ry) => Math.abs(car.y - ry) < 4)) {
        const rx = world.roadsX.reduce((a, b) => (Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a));
        if (Math.abs(car.x - rx) < 30) {
          car.axis = 'y';
          car.dir = rng() < 0.5 ? 1 : -1;
          car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          car.x = rx + car.lane;
        }
      }
    } else {
      car.y += step;
      if (car.y > WORLD_H - 40) { car.y = 60; car.x = pick(rng, world.roadsX) + car.lane; }
      if (car.y < 40) { car.y = WORLD_H - 60; car.x = pick(rng, world.roadsX) + car.lane; }
      if (rng() < dt * 0.08 && world.roadsX.some((rx) => Math.abs(car.x - rx) < 4)) {
        const ry = world.roadsY.reduce((a, b) => (Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a));
        if (Math.abs(car.y - ry) < 30) {
          car.axis = 'x';
          car.dir = rng() < 0.5 ? 1 : -1;
          car.angle = car.dir > 0 ? 0 : Math.PI;
          car.y = ry + car.lane;
        }
      }
    }
    car.angle = car.axis === 'x'
      ? (car.dir > 0 ? 0 : Math.PI)
      : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  }
}

// The closest non-police car within maxDist of (x, y), or null.
export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (car.police) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
