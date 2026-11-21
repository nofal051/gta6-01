// Cars — parked ones to steal, traffic that keeps the streets busy,
// and the handling that makes them feel different.
//
// Every car has a kind now, and kinds drive differently: a sports car
// is quick off the line and tops out high, a van is slow and heavy, a
// truck slower still, a taxi is an ordinary sedan with a sign on top.
// The HANDLING table is the only place those numbers live; the player
// module reads it when the player is behind the wheel, and traffic
// uses each car's own cruise speed.
//
// Parked cars sit along road edges waiting for E. Traffic cars cruise
// their road in a lane, turn onto a crossing road now and then at an
// intersection, and wrap around to the far side of the map when they
// reach the edge, so the streets never empty out.
import { CAR_MAX_SPEED, ROAD, WORLD_H, WORLD_W } from './config.js';
import { pick, range } from './random.js';

const PAINT = ['#d94f3d', '#3d7fd9', '#e8c93a', '#e8e8e8', '#2e2e34', '#7ac94f', '#c97ad9', '#f08a2e'];
const MODELS = ['Comet', 'Falcon', 'Dune', 'Marlin', 'Puma', 'Atlas', 'Vortex', 'Sable'];

// Handling per kind: acceleration and top-speed multipliers against
// the base car, cruise speed in traffic, and body size for drawing.
export const HANDLING = {
  sedan: { accelMul: 1, topMul: 1, cruise: 150, w: 44, h: 22 },
  sports: { accelMul: 1.45, topMul: 1.28, cruise: 200, w: 44, h: 20 },
  hatch: { accelMul: 0.95, topMul: 0.92, cruise: 140, w: 40, h: 20 },
  van: { accelMul: 0.7, topMul: 0.78, cruise: 120, w: 52, h: 24 },
  truck: { accelMul: 0.6, topMul: 0.7, cruise: 105, w: 58, h: 26 },
  taxi: { accelMul: 1, topMul: 1, cruise: 155, w: 44, h: 22 },
  // Bikes (see bikes.js): quicker off the line than a sedan, a higher
  // top speed, a narrower body. They are built by bikes.js, never by
  // the random car picker, so KINDS below leaves them out.
  bike: { accelMul: 1.35, topMul: 1.18, cruise: 175, w: 30, h: 12 },
};

export const KINDS = Object.keys(HANDLING).filter((k) => k !== 'bike');

// One car. `opts` says whether it is traffic, parked or police, which
// axis it drives along, which way, which lane offset it holds, and
// which kind it is. Health is for combat: at zero the car is a wreck.
export function makeCar(id, x, y, angle, opts) {
  const kind = opts.kind || pick(opts.rng, KINDS);
  const handling = HANDLING[kind];
  return {
    id,
    x,
    y,
    angle,
    speed: 0,
    color: pick(opts.rng, PAINT),
    name: pick(opts.rng, MODELS),
    kind,
    hp: opts.police ? 150 : 100,
    wrecked: false,
    traffic: !!opts.traffic,
    parked: !!opts.parked,
    police: !!opts.police,
    axis: opts.axis || 'x',
    dir: opts.dir || 1,
    lane: opts.lane || 0,
    driver: opts.traffic ? 'traffic' : 'none',
    // Skid marks the car leaves when it slides: {x, y, life}.
    skidTrail: [],
  };
}

export function createCars(rng, world) {
  const cars = [];
  let id = 1;

  // Twelve parked cars, tucked along a road edge at a random spot.
  // One of them is always a sports car near the spawn, for the player
  // who wants a fast start.
  for (let i = 0; i < 12; i += 1) {
    const rx = pick(rng, world.roadsX);
    const ry = pick(rng, world.roadsY);
    const along = rng() < 0.5;
    const edge = rng() < 0.5 ? -ROAD / 2 + 14 : ROAD / 2 - 14;
    const angle = along
      ? (rng() < 0.5 ? 0 : Math.PI)
      : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const kind = i === 0 ? 'sports' : pick(rng, KINDS);
    cars.push(makeCar(
      id++,
      along ? rx + range(rng, -180, 180) : rx + edge,
      along ? ry + edge : ry + range(rng, -180, 180),
      angle,
      { rng, parked: true, kind },
    ));
  }

  // Sixteen traffic cars, one lane offset to the side of its road.
  // One in six is a taxi; vans and trucks mix in with the sedans.
  for (let i = 0; i < 16; i += 1) {
    const along = rng() < 0.5;
    const lane = (rng() < 0.5 ? -1 : 1) * (ROAD / 4 - 4);
    const kind = rng() < 0.16 ? 'taxi' : pick(rng, ['sedan', 'sedan', 'hatch', 'van', 'truck', 'sports']);
    const car = makeCar(
      id++,
      along ? range(rng, 60, WORLD_W - 240) : pick(rng, world.roadsX) + lane,
      along ? pick(rng, world.roadsY) + lane : range(rng, 60, WORLD_H - 60),
      along ? (lane > 0 ? 0 : Math.PI) : (lane > 0 ? Math.PI / 2 : -Math.PI / 2),
      { rng, traffic: true, axis: along ? 'x' : 'y', dir: lane > 0 ? 1 : -1, lane, kind },
    );
    car.speed = range(rng, HANDLING[kind].cruise * 0.75, HANDLING[kind].cruise);
    cars.push(car);
  }
  return cars;
}

// Advance every traffic car one step. Cars the player drives, police
// cars and wrecks are left alone — their own systems move those.
export function updateTraffic(cars, world, dt, rng) {
  for (const car of cars) {
    if (!car.traffic || car.driver === 'player' || car.wrecked) continue;
    if (car.axis === 'x') {
      car.x += car.speed * car.dir * dt;
      if (car.x > WORLD_W - 120) {
        car.x = 60;
        car.y = pick(rng, world.roadsY) + car.lane;
      } else if (car.x < 40) {
        car.x = WORLD_W - 140;
        car.y = pick(rng, world.roadsY) + car.lane;
      }
      // At an intersection, sometimes turn onto the crossing road.
      if (rng() < dt * 0.08) {
        const ry = nearestLine(world.roadsY, car.y);
        if (Math.abs(car.y - ry) < 4) {
          const rx = nearestLine(world.roadsX, car.x);
          if (Math.abs(car.x - rx) < 30) {
            car.axis = 'y';
            car.dir = rng() < 0.5 ? 1 : -1;
            car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            car.x = rx + car.lane;
          }
        }
      }
    } else {
      car.y += car.speed * car.dir * dt;
      if (car.y > WORLD_H - 40) {
        car.y = 60;
        car.x = pick(rng, world.roadsX) + car.lane;
      } else if (car.y < 40) {
        car.y = WORLD_H - 60;
        car.x = pick(rng, world.roadsX) + car.lane;
      }
      if (rng() < dt * 0.08) {
        const rx = nearestLine(world.roadsX, car.x);
        if (Math.abs(car.x - rx) < 4) {
          const ry = nearestLine(world.roadsY, car.y);
          if (Math.abs(car.y - ry) < 30) {
            car.axis = 'x';
            car.dir = rng() < 0.5 ? 1 : -1;
            car.angle = car.dir > 0 ? 0 : Math.PI;
            car.y = ry + car.lane;
          }
        }
      }
    }
    // The drawn angle always matches the axis and direction of travel.
    car.angle = car.axis === 'x'
      ? (car.dir > 0 ? 0 : Math.PI)
      : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  }
}

function nearestLine(list, value) {
  return list.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a));
}

// The nearest car that is not a police car and not a wreck, within
// `maxDist` — or null.
export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (car.police || car.wrecked) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

// Top speed for a car of this kind, before garage upgrades.
export function topSpeedFor(car) {
  return CAR_MAX_SPEED * HANDLING[car.kind || 'sedan'].topMul;
}
