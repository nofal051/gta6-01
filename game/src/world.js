// The city of Solmar Bay.
//
// One seeded build of the whole map: a grid of roads, blocks filled
// with buildings, one block kept as a park, street lamps on every
// corner, and a beach that runs into the sea along the east edge. The
// layout is fixed for the run once it is built — nothing here moves.
// The helpers at the bottom answer the questions the other systems
// keep asking: "is this point on a road?", "push this body out of the
// buildings", "stay inside the map", "where is the nearest road?".
import { BLOCK, COLORS, ROAD, WORLD_H, WORLD_W } from './config.js';
import { intRange, pick, range } from './random.js';

// Distance between neighbouring road centrelines: one block plus one road.
const PITCH = BLOCK + ROAD;

// The park block: third column of blocks, second row.
const PARK_IX = 2;
const PARK_IY = 1;

export function createWorld(rng) {
  // Road centrelines, spaced PITCH apart, starting just inside the edge.
  const roadsX = [];
  for (let x = ROAD / 2 + 60; x < WORLD_W - 220; x += PITCH) roadsX.push(x);
  const roadsY = [];
  for (let y = ROAD / 2 + 60; y < WORLD_H - 60; y += PITCH) roadsY.push(y);

  const buildings = [];
  const trees = [];
  const lamps = [];

  // The park fills its block with a margin; the renderer draws it green.
  const park = {
    x: roadsX[PARK_IX] + ROAD / 2 + 8,
    y: roadsY[PARK_IY] + ROAD / 2 + 8,
    w: BLOCK - 16,
    h: BLOCK - 16,
  };

  // Walk the blocks between neighbouring roads. The park block gets
  // trees only; every other block gets a few buildings and a few trees.
  for (let ix = 0; ix + 1 < roadsX.length; ix += 1) {
    for (let iy = 0; iy + 1 < roadsY.length; iy += 1) {
      const bx = roadsX[ix] + ROAD / 2;
      const by = roadsY[iy] + ROAD / 2;
      if (ix === PARK_IX && iy === PARK_IY) {
        for (let t = 0; t < 14; t += 1) {
          trees.push({
            x: bx + range(rng, 20, BLOCK - 20),
            y: by + range(rng, 20, BLOCK - 20),
            r: range(rng, 9, 15),
          });
        }
        continue;
      }
      const n = intRange(rng, 2, 4);
      for (let b = 0; b < n; b += 1) {
        const w = range(rng, 70, 130);
        const h = range(rng, 70, 120);
        buildings.push({
          x: bx + range(rng, 8, BLOCK - w - 8),
          y: by + range(rng, 8, BLOCK - h - 8),
          w,
          h,
          color: pick(rng, COLORS.building),
          floors: intRange(rng, 2, 9),
        });
      }
      for (let t = 0; t < 3; t += 1) {
        trees.push({
          x: bx + range(rng, 15, BLOCK - 15),
          y: by + range(rng, 15, BLOCK - 15),
          r: range(rng, 7, 12),
        });
      }
    }
  }

  // One lamp at every road crossing, offset to the corner.
  for (const x of roadsX) {
    for (const y of roadsY) {
      lamps.push({ x: x + ROAD / 2 - 6, y: y + ROAD / 2 - 6 });
    }
  }

  // Sand, then open water, along the full east edge of the map.
  const beach = { x: WORLD_W - 220, y: 0, w: 110, h: WORLD_H };
  const water = { x: WORLD_W - 110, y: 0, w: 110, h: WORLD_H };

  return { roadsX, roadsY, buildings, trees, lamps, park, beach, water };
}

// Is (x, y) on a road — on any vertical centreline or any horizontal one?
export function isOnRoad(world, x, y) {
  const vertical = world.roadsX.some((rx) => Math.abs(x - rx) < ROAD / 2);
  const horizontal = world.roadsY.some((ry) => Math.abs(y - ry) < ROAD / 2);
  return vertical || horizontal;
}

// Shove a round body out of any building it overlaps, one building at a
// time. Returns true if it touched at least one building.
export function collideBuildings(world, body, radius) {
  let hit = false;
  for (const b of world.buildings) {
    const closestX = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - closestX;
    const dy = body.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= radius * radius) continue;
    hit = true;
    const d = Math.sqrt(distSq) || 1;
    const push = radius - d;
    body.x += (dx / d) * push;
    body.y += (dy / d) * push;
    if (distSq === 0) body.x += radius;
  }
  return hit;
}

// Clamp a body to the map, keeping `margin` of space from each edge.
export function clampWorld(body, margin) {
  body.x = Math.max(margin, Math.min(WORLD_W - margin, body.x));
  body.y = Math.max(margin, Math.min(WORLD_H - margin, body.y));
}

// The point on a road centreline nearest to (x, y), plus its distance.
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
