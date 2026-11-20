// Air support and roadblocks — the police answer to four stars.
//
// At four wanted stars the city sends a helicopter. It circles the
// player from above, its searchlight cone sweeping the streets, and
// it never gets tired: the only way to lose it is to lose the heat.
// At three stars and above the ground units start setting roadblocks:
// two police cars parked across the road ahead of the player, with a
// spike strip between them. Hit the strip at speed and the car loses
// most of its speed at once; crawl through the gap and you are past.
//
// The helicopter and the blocks live on the police state (police.heli
// and police.blocks), but this module owns their behaviour so
// police.js stays about the ground chase. The renderer draws the heli
// above everything, with its spotlight, and the blocks as police cars
// with a striped spike line between them.

import { makeCar } from './vehicles.js';
import { nearestRoadPoint } from './world.js';

export function createAirSupport() {
  return {
    heli: null,
    blocks: [],
    // Seconds until the next roadblock may be set.
    blockTimer: 12,
    // Seconds the heli has been circling, for its orbit phase.
    orbitTime: 0,
  };
}

function spawnHeli(state, rng) {
  const p = state.player;
  state.police.heli = {
    x: p.x + 320,
    y: p.y - 260,
    angle: 0,
    rotor: 0,
    // The spotlight target lags behind the player a little.
    spotX: p.x,
    spotY: p.y,
  };
}

// Two police cars across the road ahead, plus the spike strip.
function spawnRoadblock(state, rng) {
  const p = state.player;
  const ahead = {
    x: p.x + Math.cos(p.angle || 0) * 420,
    y: p.y + Math.sin(p.angle || 0) * 420,
  };
  const spot = nearestRoadPoint(state.world, ahead.x, ahead.y);
  const across = Math.abs(spot.x - ahead.x) < Math.abs(spot.y - ahead.y) ? 'x' : 'y';
  const cars = [];
  for (const offset of [-34, 34]) {
    const car = makeCar(950 + state.police.blocks.length * 2 + cars.length, 0, 0, 0, { rng, police: true });
    car.color = '#1d4fd9';
    car.driver = 'police';
    car.parked = true;
    car.speed = 0;
    if (across === 'x') {
      car.x = spot.x;
      car.y = spot.y + offset;
      car.angle = Math.PI / 2;
    } else {
      car.x = spot.x + offset;
      car.y = spot.y;
      car.angle = 0;
    }
    cars.push(car);
    state.cars.push(car);
  }
  state.police.blocks.push({
    x: spot.x,
    y: spot.y,
    angle: across === 'x' ? Math.PI / 2 : 0,
    life: 26,
    cars,
    hit: false,
  });
  state.events.push({ type: 'roadblock' });
}

export function updateAirSupport(state, dt, rng, audio) {
  const p = state.player;
  const air = state.police;
  if (!air.heli && !air.blocks) return;

  // The helicopter arrives at four stars and leaves below two.
  if (p.wanted >= 4 && !air.heli) {
    spawnHeli(state, rng);
    state.events.push({ type: 'heli' });
  }
  if (air.heli) {
    air.orbitTime += dt;
    const heli = air.heli;
    heli.rotor += dt * 22;
    // Circle the player at a fixed radius, spotlight tracking them.
    const radius = 200;
    const orbit = air.orbitTime * 0.55;
    const tx = p.x + Math.cos(orbit) * radius;
    const ty = p.y + Math.sin(orbit) * radius;
    heli.x += (tx - heli.x) * Math.min(1, dt * 1.4);
    heli.y += (ty - heli.y) * Math.min(1, dt * 1.4);
    heli.angle = Math.atan2(p.y - heli.y, p.x - heli.x);
    heli.spotX += (p.x - heli.spotX) * Math.min(1, dt * 3);
    heli.spotY += (p.y - heli.spotY) * Math.min(1, dt * 3);
    if (p.wanted < 2) {
      // Fly away: drift off and despawn once far from the player.
      heli.x += 260 * dt;
      heli.y -= 180 * dt;
      if (Math.hypot(heli.x - p.x, heli.y - p.y) > 900) air.heli = null;
    }
    if (audio && audio.rotor) audio.rotor();
  }

  // Roadblocks from three stars up, at most one every eighteen seconds.
  air.blockTimer -= dt;
  if (p.wanted >= 3 && air.blockTimer <= 0 && air.blocks.length < 2) {
    spawnRoadblock(state, rng);
    air.blockTimer = 18;
  }

  // Spikes: crossing the strip at speed shreds the car's momentum.
  for (const block of air.blocks) {
    block.life -= dt;
    if (!block.hit && p.car && Math.hypot(p.x - block.x, p.y - block.y) < 46) {
      block.hit = true;
      p.car.speed *= 0.35;
      state.events.push({ type: 'spikes' });
      if (audio) audio.crash();
      for (let i = 0; i < 10; i += 1) {
        state.particles.push({
          x: p.x + (rng() - 0.5) * 30,
          y: p.y + (rng() - 0.5) * 30,
          vx: (rng() - 0.5) * 120,
          vy: (rng() - 0.5) * 120,
          life: 0.5,
          color: '#ffd23d',
          size: 4,
          kind: 'spark',
        });
      }
    }
  }
  // Expired blocks drive away: their cars leave the street.
  const alive = [];
  for (const block of air.blocks) {
    if (block.life > 0) {
      alive.push(block);
    } else {
      for (const car of block.cars) {
        state.cars = state.cars.filter((c) => c !== car);
      }
    }
  }
  air.blocks = alive;
}
