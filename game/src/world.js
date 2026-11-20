// The city of Solmar Bay, rebuilt for round two.
//
// One seeded build of the whole map: a grid of roads, blocks filled
// with buildings, a park, a beach running into the sea along the east
// edge — and two new districts. The south-west block is now the
// airfield: a runway, a terminal and parked planes. The strip between
// the last road and the beach is the harbour port: docks, stacked
// shipping containers and cranes. The garage forecourt is reserved
// here too, so no building ever spawns on top of the workshop.
//
// The layout is fixed for the run once it is built — nothing here
// moves. The helpers at the bottom answer the questions the other
// systems keep asking: "is this point on a road?", "push this body
// out of the buildings", "stay inside the map", "where is the
// nearest road?", "which district is this?".
import { BLOCK, COLORS, ROAD, WORLD_H, WORLD_W } from './config.js';
import { intRange, pick, range } from './random.js';

// Distance between neighbouring road centrelines: one block plus one road.
const PITCH = BLOCK + ROAD;

// The park block: third column of blocks, second row.
const PARK_IX = 2;
const PARK_IY = 1;
// The airfield block: first column, fourth row.
const AIR_IX = 0;
const AIR_IY = 3;

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// The garage forecourt, in world coordinates: the block two roads
// over and one road down from the spawn corner.
export function garageSpot(world) {
  return {
    x: world.roadsX[3] + ROAD / 2 + 24,
    y: world.roadsY[0] + ROAD / 2 + 24,
    w: 150,
    h: 110,
  };
}

export function createWorld(rng) {
  const roadsX = [];
  for (let x = ROAD / 2 + 60; x < WORLD_W - 220; x += PITCH) roadsX.push(x);
  const roadsY = [];
  for (let y = ROAD / 2 + 60; y < WORLD_H - 60; y += PITCH) roadsY.push(y);

  const buildings = [];
  const trees = [];
  const lamps = [];
  const garage = garageSpot({ roadsX, roadsY });

  // The park fills its block with a margin; the renderer draws it green.
  const park = {
    x: roadsX[PARK_IX] + ROAD / 2 + 8,
    y: roadsY[PARK_IY] + ROAD / 2 + 8,
    w: BLOCK - 16,
    h: BLOCK - 16,
  };

  // The airfield: a runway strip across the block, a terminal on the
  // north side, a hangar, and two small parked planes on the apron.
  const airBlock = {
    x: roadsX[AIR_IX] + ROAD / 2,
    y: roadsY[AIR_IY] + ROAD / 2,
    w: BLOCK,
    h: BLOCK,
  };
  const airport = {
    ...airBlock,
    runway: { x: airBlock.x + 12, y: airBlock.y + 150, w: BLOCK - 24, h: 34 },
    terminal: { x: airBlock.x + 30, y: airBlock.y + 18, w: 130, h: 60, color: '#8a9aa8' },
    hangar: { x: airBlock.x + 180, y: airBlock.y + 20, w: 90, h: 70, color: '#5a6a7a' },
    planes: [
      { x: airBlock.x + 80, y: airBlock.y + 230, angle: 0 },
      { x: airBlock.x + 200, y: airBlock.y + 250, angle: 0.5 },
    ],
  };

  // The port: a strip between the last road and the beach, stacked
  // with containers, two cranes and a dock edge along the water.
  const port = {
    x: WORLD_W - 460,
    y: 1300,
    w: 230,
    h: 500,
    containers: [],
    cranes: [
      { x: WORLD_W - 300, y: 1380 },
      { x: WORLD_W - 300, y: 1620 },
    ],
  };
  for (let i = 0; i < 14; i += 1) {
    port.containers.push({
      x: WORLD_W - 440 + (i % 3) * 72,
      y: 1340 + Math.floor(i / 3) * 96,
      w: 62,
      h: 44,
      color: pick(rng, COLORS.container),
      stacked: i % 4 === 0,
    });
  }

  // Walk the blocks between neighbouring roads. The park block gets
  // trees only, the airfield block gets nothing (its own props live
  // above), and every other block gets a few buildings and a few trees
  // — unless a building would land on the garage forecourt.
  for (let ix = 0; ix + 1 < roadsX.length; ix += 1) {
    for (let iy = 0; iy + 1 < roadsY.length; iy += 1) {
      const bx = roadsX[ix] + ROAD / 2;
      const by = roadsY[iy] + ROAD / 2;
      if (ix === PARK_IX && iy === PARK_IY) {
        for (let t = 0; t < 14; t += 1) {
          trees.push({ x: bx + range(rng, 20, BLOCK - 20), y: by + range(rng, 20, BLOCK - 20), r: range(rng, 9, 15) });
        }
        continue;
      }
      if (ix === AIR_IX && iy === AIR_IY) continue;
      const n = intRange(rng, 2, 4);
      for (let b = 0; b < n; b += 1) {
        const w = range(rng, 70, 130);
        const h = range(rng, 70, 120);
        const candidate = {
          x: bx + range(rng, 8, BLOCK - w - 8),
          y: by + range(rng, 8, BLOCK - h - 8),
          w,
          h,
          color: pick(rng, COLORS.building),
          floors: intRange(rng, 2, 9),
        };
        if (rectsOverlap(candidate, garage)) continue;
        buildings.push(candidate);
      }
      for (let t = 0; t < 3; t += 1) {
        trees.push({ x: bx + range(rng, 15, BLOCK - 15), y: by + range(rng, 15, BLOCK - 15), r: range(rng, 7, 12) });
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

  return { roadsX, roadsY, buildings, trees, lamps, park, beach, water, airport, port, garage };
}

// Is (x, y) on a road — on any vertical centreline or any horizontal one?
export function isOnRoad(world, x, y) {
  for (const rx of world.roadsX) {
    if (Math.abs(x - rx) < ROAD / 2) return true;
  }
  for (const ry of world.roadsY) {
    if (Math.abs(y - ry) < ROAD / 2) return true;
  }
  return false;
}

// Shove a round body out of any building it overlaps. Airport
// terminal, hangar and port containers are solid too. Returns true if
// it touched anything solid.
export function collideBuildings(world, body, radius) {
  let hit = false;
  const solids = [...world.buildings, world.airport.terminal, world.airport.hangar, ...world.port.containers];
  for (const b of solids) {
    const closestX = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - closestX;
    const dy = body.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= radius * radius) continue;
    hit = true;
    if (distSq === 0) {
      body.x += radius;
      continue;
    }
    const d = Math.sqrt(distSq);
    const push = radius - d;
    body.x += (dx / d) * push;
    body.y += (dy / d) * push;
  }
  return hit;
}

// Clamp a body to the map, keeping `margin` of space from each edge.
export function clampWorld(body, margin) {
  if (body.x < margin) body.x = margin;
  if (body.x > WORLD_W - margin) body.x = WORLD_W - margin;
  if (body.y < margin) body.y = margin;
  if (body.y > WORLD_H - margin) body.y = WORLD_H - margin;
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

// Which named district is (x, y) in? The HUD and missions use this
// for flavour; the simulation never depends on it.
export function districtAt(world, x, y) {
  if (pointInRect(x, y, world.airport)) return 'airport';
  if (pointInRect(x, y, world.port)) return 'port';
  if (pointInRect(x, y, world.park)) return 'park';
  if (pointInRect(x, y, world.beach)) return 'beach';
  if (pointInRect(x, y, world.water)) return 'sea';
  return 'city';
}
