// Pedestrians — the locals on the sidewalks.
//
// They stroll along a road, pause at corners, and wander a little.
// Gunfire, a speeding car or a police chase nearby sends them running
// away from the trouble. A pedestrian hit by a car is a crime, and the
// wanted system is told about it by the step that caused the hit.
//
// Locals come in kinds now: walkers amble, joggers move faster and
// further, harbour workers in hi-vis stick near the port, and
// tourists cluster near the beach. Kind changes speed and shirt, not
// the rules: everyone flees the same way.
import { ROAD } from './config.js';
import { pick, range } from './random.js';

const SHIRTS = {
  walker: ['#e8a33d', '#3da3d9', '#d93d7a', '#7ad93d', '#e8e8e8'],
  jogger: ['#ff5a4d', '#2fd9c9', '#f2f2f2'],
  worker: ['#ff8c1a', '#ffd23d'],
  tourist: ['#ff9ecf', '#7ad9ff', '#fff06a'],
  // Boardwalk strollers: slow, bright, and always near the sea.
  stroller: ['#ff6b9d', '#4dd0e1', '#ffd54f', '#aed581', '#f8bbd0'],
};

const SPEEDS = {
  walker: [28, 55],
  jogger: [70, 105],
  worker: [24, 42],
  tourist: [20, 38],
  stroller: [16, 30],
};

// 34 locals, each standing just off a road, walking at their own pace.
// Workers spawn near the port strip, tourists near the beach.
export function createPedestrians(rng, world) {
  const peds = [];
  for (let i = 0; i < 34; i += 1) {
    const roll = rng();
    const kind = roll < 0.6 ? 'walker' : roll < 0.75 ? 'jogger' : roll < 0.88 ? 'worker' : 'tourist';
    const along = rng() < 0.5;
    const road = along ? pick(rng, world.roadsY) : pick(rng, world.roadsX);
    const side = (rng() < 0.5 ? -1 : 1) * (ROAD / 2 + 14);
    let x = along ? range(rng, 80, 2300) : road + side;
    let y = along ? road + side : range(rng, 80, 1700);
    if (kind === 'worker') {
      x = range(rng, 2100, 2360);
      y = range(rng, 1320, 1760);
    } else if (kind === 'tourist') {
      x = range(rng, 2300, 2470);
      y = range(rng, 200, 1700);
    }
    const [lo, hi] = SPEEDS[kind];
    peds.push({
      x,
      y,
      angle: rng() * Math.PI * 2,
      speed: range(rng, lo, hi),
      color: pick(rng, SHIRTS[kind]),
      kind,
      state: 'walk',
      fleeX: 0,
      fleeY: 0,
      pause: range(rng, 0, 3),
      hitCooldown: 0,
    });
  }
  // Eight boardwalk strollers, ambling up and down the boards by the
  // sea. They walk the boardwalk's length, not the roads.
  const bw = world.boardwalk;
  for (let i = 0; i < 8; i += 1) {
    peds.push({
      x: bw.x + bw.w / 2 + range(rng, -6, 6),
      y: range(rng, bw.y + 20, bw.y + bw.h - 20),
      angle: rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2,
      speed: range(rng, 16, 30),
      color: pick(rng, SHIRTS.stroller),
      kind: 'stroller',
      state: 'walk',
      fleeX: 0,
      fleeY: 0,
      pause: range(rng, 0, 2),
      hitCooldown: 0,
    });
  }
  return peds;
}

// Send every pedestrian within `radius` of (x, y) running away from it.
export function scarePedestrians(peds, x, y, radius) {
  for (const p of peds) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d >= radius) continue;
    p.state = 'flee';
    p.pause = 2.5;
    const safe = d || 1;
    p.fleeX = (p.x - x) / safe;
    p.fleeY = (p.y - y) / safe;
  }
}

// One pedestrian runs from a single scare point (a punch, a bullet).
export function scareOne(ped, fromX, fromY) {
  ped.state = 'flee';
  const d = Math.hypot(ped.x - fromX, ped.y - fromY) || 1;
  ped.fleeX = (ped.x - fromX) / d;
  ped.fleeY = (ped.y - fromY) / d;
  ped.pause = 2.5;
}

export function updatePedestrians(peds, dt, world, rng) {
  const wander = rng || Math.random;
  for (const p of peds) {
    if (p.state === 'flee') {
      // Run straight away from the scare, then calm down and walk again.
      const runSpeed = p.kind === 'jogger' ? 210 : 150;
      p.x += p.fleeX * runSpeed * dt;
      p.y += p.fleeY * runSpeed * dt;
      p.angle = Math.atan2(p.fleeY, p.fleeX);
      p.pause -= dt;
      if (p.pause <= 0) {
        p.state = 'walk';
        p.pause = 0;
      }
      continue;
    }
    if (p.pause > 0) {
      p.pause -= dt;
      continue;
    }
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    // Boardwalk strollers stay on the boards: keep their x pinned
    // to the strip and turn them at its ends.
    if (p.kind === 'stroller' && world.boardwalk) {
      const bw = world.boardwalk;
      p.x = Math.max(bw.x + 6, Math.min(bw.x + bw.w - 6, p.x));
      if (p.y < bw.y + 10 || p.y > bw.y + bw.h - 10) {
        p.angle += Math.PI;
        p.pause = 1;
      }
    }
    // Turn around at the edge of the walked area and take a breather.
    if (p.x < 60 || p.x > 2480 || p.y < 60 || p.y > 1840) {
      p.angle += Math.PI;
      p.pause = 1;
    }
    // A small random wander so the crowd never walks in lockstep.
    if (wander() < dt * 0.02) p.angle += (wander() - 0.5) * 1.6;
  }
}
