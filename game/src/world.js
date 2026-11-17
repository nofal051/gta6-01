// Solmar Bay itself: a seeded road grid, building blocks, a park, a beach
// and a waterfront on the east edge, plus the props that dress it. The
// layout is generated once from the seed and never changes during a run.
import { BLOCK, COLORS, ROAD, WORLD_H, WORLD_W } from './config.js';
import { intRange, pick, range } from './random.js';

const PITCH = BLOCK + ROAD;

export function createWorld(rng) {
  const roadsX = [];
  for (let x = ROAD / 2 + 60; x < WORLD_W - 220; x += PITCH) roadsX.push(x);
  const roadsY = [];
  for (let y = ROAD / 2 + 60; y < WORLD_H - 60; y += PITCH) roadsY.push(y);

  const buildings = [];
  const trees = [];
  const lamps = [];
  // Park block: the block between road 2 and 3, row 1.
  const park = { x: roadsX[2] + ROAD / 2 + 8, y: roadsY[1] + ROAD / 2 + 8, w: BLOCK - 16, h: BLOCK - 16 };
  for (let ix = 0; ix < roadsX.length - 1; ix += 1) {
    for (let iy = 0; iy < roadsY.length - 1; iy += 1) {
      const bx = roadsX[ix] + ROAD / 2;
      const by = roadsY[iy] + ROAD / 2;
      const isPark = ix === 2 && iy === 1;
      if (isPark) {
        for (let t = 0; t < 14; t += 1) trees.push({ x: bx + range(rng, 20, BLOCK - 20), y: by + range(rng, 20, BLOCK - 20), r: range(rng, 9, 15) });
        continue;
      }
      const n = intRange(rng, 2, 4);
      for (let b = 0; b < n; b += 1) {
        const w = range(rng, 70, 130); const h = range(rng, 70, 120);
        const x = bx + range(rng, 8, BLOCK - w - 8);
        const y = by + range(rng, 8, BLOCK - h - 8);
        buildings.push({ x, y, w, h, color: pick(rng, COLORS.building), floors: intRange(rng, 2, 9) });
      }
      for (let t = 0; t < 3; t += 1) trees.push({ x: bx + range(rng, 15, BLOCK - 15), y: by + range(rng, 15, BLOCK - 15), r: range(rng, 7, 12) });
    }
  }
  for (const x of roadsX) for (const y of roadsY) lamps.push({ x: x + ROAD / 2 - 6, y: y + ROAD / 2 - 6 });
  // Beach + water on the east edge.
  const beach = { x: WORLD_W - 220, y: 0, w: 110, h: WORLD_H };
  const water = { x: WORLD_W - 110, y: 0, w: 110, h: WORLD_H };

  return { roadsX, roadsY, buildings, trees, lamps, park, beach, water };
}

export function isOnRoad(world, x, y) {
  const onX = world.roadsX.some((rx) => Math.abs(x - rx) < ROAD / 2);
  const onY = world.roadsY.some((ry) => Math.abs(y - ry) < ROAD / 2);
  return onX || onY;
}

// Push a circle out of every building it overlaps; returns true on a hit.
export function collideBuildings(world, body, radius) {
  let hit = false;
  for (const b of world.buildings) {
    const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - cx; const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      const d = Math.sqrt(d2) || 1;
      const push = radius - d;
      body.x += (dx / d) * push; body.y += (dy / d) * push;
      if (d2 === 0) body.x += radius;
    }
  }
  return hit;
}

export function clampWorld(body, margin) {
  body.x = Math.max(margin, Math.min(WORLD_W - margin, body.x));
  body.y = Math.max(margin, Math.min(WORLD_H - margin, body.y));
}

export function nearestRoadPoint(world, x, y) {
  let best = { x, y, d: Infinity };
  for (const rx of world.roadsX) {
    const d = Math.abs(x - rx);
    if (d < best.d) best = { x: rx, y, d };
  }
  for (const ry of world.roadsY) {
    const d = Math.abs(y - ry);
    if (d < best.d) best = { x, y: ry, d };
  }
  return best;
}
