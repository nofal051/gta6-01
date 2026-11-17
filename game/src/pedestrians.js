// Pedestrians: locals strolling the sidewalks. They walk along a road,
// pause at corners, and run away from gunfire, speeding cars and police
// chases — and a hit pedestrian is a crime the wanted system notices.
import { ROAD } from './config.js';
import { pick, range } from './random.js';

const PED_COLORS = ['#e8a33d', '#3da3d9', '#d93d7a', '#7ad93d', '#e8e8e8', '#8a5a2e', '#5a2ed9'];

export function createPedestrians(rng, world) {
  const peds = [];
  for (let i = 0; i < 34; i += 1) {
    const horizontal = rng() < 0.5;
    const road = horizontal ? pick(rng, world.roadsY) : pick(rng, world.roadsX);
    const side = (rng() < 0.5 ? -1 : 1) * (ROAD / 2 + 14);
    peds.push({
      x: horizontal ? range(rng, 80, 2300) : road + side,
      y: horizontal ? road + side : range(rng, 80, 1700),
      angle: rng() * Math.PI * 2, speed: range(rng, 28, 55),
      color: pick(rng, PED_COLORS), state: 'walk', fleeX: 0, fleeY: 0, pause: range(rng, 0, 3),
    });
  }
  return peds;
}

export function scarePedestrians(peds, x, y, radius) {
  for (const p of peds) {
    if (Math.hypot(p.x - x, p.y - y) < radius) {
      p.state = 'flee';
      p.pause = 2.5;
      const d = Math.hypot(p.x - x, p.y - y) || 1;
      p.fleeX = (p.x - x) / d; p.fleeY = (p.y - y) / d;
    }
  }
}

export function updatePedestrians(peds, dt, world) {
  for (const p of peds) {
    if (p.state === 'flee') {
      p.x += p.fleeX * 150 * dt; p.y += p.fleeY * 150 * dt;
      p.angle = Math.atan2(p.fleeY, p.fleeX);
      p.pause -= dt;
      if (p.pause <= 0) { p.state = 'walk'; p.pause = 0; }
      continue;
    }
    if (p.pause > 0) { p.pause -= dt; continue; }
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    if (p.x < 60 || p.x > 2320 || p.y < 60 || p.y > 1840) { p.angle += Math.PI; p.pause = 1; }
    if (Math.random() < dt * 0.02) p.angle += (Math.random() - 0.5) * 1.6;
  }
}
