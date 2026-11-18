// Pedestrians — the locals on the sidewalks.
//
// They stroll along a road, pause at corners, and wander a little.
// Gunfire, a speeding car or a police chase nearby sends them running
// away from the trouble. A pedestrian hit by a car is a crime, and the
// wanted system is told about it by the step that caused the hit.
import { ROAD } from './config.js';
import { pick, range } from './random.js';

const SHIRTS = ['#e8a33d', '#3da3d9', '#d93d7a', '#7ad93d', '#e8e8e8', '#8a5a2e', '#5a2ed9'];

// 34 locals, each standing just off a road, walking at their own pace.
export function createPedestrians(rng, world) {
  const peds = [];
  for (let i = 0; i < 34; i += 1) {
    const along = rng() < 0.5;
    const road = along ? pick(rng, world.roadsY) : pick(rng, world.roadsX);
    const side = (rng() < 0.5 ? -1 : 1) * (ROAD / 2 + 14);
    peds.push({
      x: along ? range(rng, 80, 2300) : road + side,
      y: along ? road + side : range(rng, 80, 1700),
      angle: rng() * Math.PI * 2,
      speed: range(rng, 28, 55),
      color: pick(rng, SHIRTS),
      state: 'walk',
      fleeX: 0,
      fleeY: 0,
      pause: range(rng, 0, 3),
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

export function updatePedestrians(peds, dt, world) {
  for (const p of peds) {
    if (p.state === 'flee') {
      // Run straight away from the scare, then calm down and walk again.
      p.x += p.fleeX * 150 * dt;
      p.y += p.fleeY * 150 * dt;
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
    // Turn around at the edge of the walked area and take a breather.
    if (p.x < 60 || p.x > 2320 || p.y < 60 || p.y > 1840) {
      p.angle += Math.PI;
      p.pause = 1;
    }
    // A small random wander so the crowd never walks in lockstep.
    if (Math.random() < dt * 0.02) p.angle += (Math.random() - 0.5) * 1.6;
  }
}
