// Solmar Bay, the city itself. A seeded road grid with building blocks, a
// park, a beach and open water along the east edge, plus the lamps and
// trees that dress the streets. Generated once from the seed; the layout
// never changes during a run.
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

  // The park occupies the block between the third and fourth vertical road
  // on the second row; every other block gets buildings and trees.
  const park = {
    x: roadsX[2] + ROAD / 2 + 8,
    y: roadsY[1] + ROAD / 2 + 8,
    w: BLOCK - 16,
    h: BLOCK - 16,
  };

  for (let ix = 0; ix < roadsX.length - 1; ix += 1) {
    for (let iy = 0; iy < roadsY.length - 1; iy += 1) {
      const bx = roadsX[ix] + ROAD / 2;
      const by = roadsY[iy] + ROAD / 2;
      if (ix === 2 && iy === 1) {
        for (let t = 0; t < 14; t += 1) {
          trees.push({
            x: bx + range(rng, 20, BLOCK - 20),
            y: by + range(rng, 20, BLOCK - 20),
            r: range(rng, 9, 15),
          });
        }
        continue;
      }
      const count = intRange(rng, 2, 4);
      for (let b = 0; b < count; b += 1) {
        const w = range(rng, 70, 130);
        const h = range(rng, 70, 120);
        buildings.push({
          x: bx + range(rng, 8, BLOCK - w - 8),
          y: by + range(rng, 8, BLOCK - h - 8),
          w, h,
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

  for (const x of roadsX) {
    for (const y of roadsY) lamps.push({ x: x + ROAD / 2 - 6, y: y + ROAD / 2 - 6 });
  }

  // Beach, then open water, along the whole east edge.
  const beach = { x: WORLD_W - 220, y: 0, w: 110, h: WORLD_H };
  const water = { x: WORLD_W - 110, y: 0, w: 110, h: WORLD_H };

  return { roadsX, roadsY, buildings, trees, lamps, park, beach, water };
}

// True when a point sits on any road (vertical or horizontal).
export function isOnRoad(world, x, y) {
  const onVertical = world.roadsX.some((rx) => Math.abs(x - rx) < ROAD / 2);
  const onHorizontal = world.roadsY.some((ry) => Math.abs(y - ry) < ROAD / 2);
  return onVertical || onHorizontal;
}

// Push a circular body out of every building it overlaps. Returns true
// when at least one building was hit.
export function collideBuildings(world, body, radius) {
  let hit = false;
  for (const b of world.buildings) {
    const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      const d = Math.sqrt(d2) || 1;
      const push = radius - d;
      body.x += (dx / d) * push;
      body.y += (dy / d) * push;
      if (d2 === 0) body.x += radius;
    }
  }
  return hit;
}

// Keep a body inside the world, at least `margin` from the edge.
export function clampWorld(body, margin) {
  body.x = Math.max(margin, Math.min(WORLD_W - margin, body.x));
  body.y = Math.max(margin, Math.min(WORLD_H - margin, body.y));
}

// The closest point on any road centreline to (x, y), with its distance.
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
