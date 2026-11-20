// The wanted system and the police who answer it.
//
// Stars run 0–5. More stars mean more police cars and more foot cops,
// and the cars chase harder. A police car rams the player's car; a foot
// cop runs the player down on foot, and at three stars or more, catching
// a weakened player on foot — or a player sitting still in a car — is an
// arrest. Keep clean and out of sight and the heat fades, one star at a
// time, until the police give up and drive away.
//
// Two escalations sit on top of the ground chase and live in heli.js:
// at three stars the ground units set roadblocks with spike strips,
// and at four stars a helicopter circles overhead with a searchlight.
// This module calls that air support every step and owns the shared
// police state, so the heli and the blocks are cleaned up with the
// rest of the force when the heat dies.
import { BLOCK_WANTED, HELI_WANTED, WANTED_DECAY_SECONDS } from './config.js';
import { makeCar } from './vehicles.js';
import { nearestRoadPoint } from './world.js';
import { updateAirSupport } from './heli.js';
import { damagePlayer } from './player.js';

export function createPolice() {
  return {
    cars: [],
    cops: [],
    sirenTimer: 0,
    // Air support state, owned by heli.js: the helicopter, the active
    // roadblocks, and the timers that space them out.
    heli: null,
    blocks: [],
    blockTimer: 12,
    orbitTime: 0,
  };
}

// How many police cars and foot cops a wanted level calls for.
function wantedForce(stars) {
  if (stars === 0) return { cars: 0, cops: 0 };
  if (stars <= 2) return { cars: 1, cops: 1 };
  if (stars <= 3) return { cars: 2, cops: 2 };
  if (stars <= 4) return { cars: 3, cops: 2 };
  return { cars: 3, cops: 3 };
}

function spawnPoliceCar(state, rng) {
  const p = state.player;
  const sideX = rng() < 0.5 ? -520 : 520;
  const sideY = rng() < 0.5 ? -380 : 380;
  const spot = nearestRoadPoint(state.world, p.x + sideX, p.y + sideY);
  const car = makeCar(
    900 + state.police.cars.length + Math.floor(rng() * 50),
    spot.x,
    spot.y,
    0,
    { rng, police: true, kind: 'sedan' },
  );
  car.color = '#1d4fd9';
  car.speed = 0;
  car.driver = 'police';
  state.police.cars.push(car);
  state.cars.push(car);
}

function spawnCop(state, rng) {
  const p = state.player;
  state.police.cops.push({
    x: p.x + (rng() < 0.5 ? -260 : 260),
    y: p.y + (rng() < 0.5 ? -200 : 200),
    angle: 0,
    speed: 165,
    health: 100,
    state: 'chase',
  });
}

// Drop every roadblock car from the street when the heat dies.
function clearBlocks(state) {
  for (const block of state.police.blocks) {
    for (const car of block.cars) {
      state.cars = state.cars.filter((c) => c !== car);
    }
  }
  state.police.blocks = [];
  state.police.heli = null;
}

export function updatePolice(state, dt, rng, audio) {
  const p = state.player;
  const wanted = p.wanted;

  // Laying low lets the heat decay, one star at a time.
  if (wanted > 0) {
    p.wantedTimer += dt;
    if (p.wantedTimer > WANTED_DECAY_SECONDS) {
      p.wanted -= 1;
      p.wantedTimer = 0;
      state.events.push({ type: 'wanted', stars: p.wanted });
    }
  }

  // Bring the force up to strength for the current wanted level.
  const force = wantedForce(wanted);
  while (state.police.cars.length < force.cars) spawnPoliceCar(state, rng);
  while (state.police.cops.length < force.cops) spawnCop(state, rng);

  // Heat off entirely: the police leave, their cars despawn, and any
  // roadblock or helicopter stands down with them.
  if (wanted === 0) {
    state.police.cars.length = 0;
    state.police.cops.length = 0;
    state.cars = state.cars.filter((c) => !c.police);
    clearBlocks(state);
  }

  // The helicopter and the roadblocks answer to the higher stars.
  if (wanted >= BLOCK_WANTED || state.police.heli || state.police.blocks.length > 0) {
    updateAirSupport(state, dt, rng, audio);
  }

  // A siren wail every couple of seconds while wanted.
  state.police.sirenTimer -= dt;
  if (wanted > 0 && state.police.sirenTimer <= 0) {
    audio.siren();
    state.police.sirenTimer = 2.4;
  }

  // Police cars steer toward the player and ram. At four stars and up
  // they drive faster and hit harder, and the heli keeps them honest
  // about where the player is.
  for (const car of state.police.cars) {
    const dx = p.x - car.x;
    const dy = p.y - car.y;
    const dist = Math.hypot(dx, dy) || 1;
    const target = Math.atan2(dy, dx);
    let diff = target - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = wanted >= HELI_WANTED ? 2.9 : 2.4;
    car.angle += Math.max(-turn * dt, Math.min(turn * dt, diff));
    car.speed = Math.min(430 + wanted * 22, Math.max(300, dist * 0.9));
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (dist < 52) {
      if (p.onFoot) {
        damagePlayer(p, 26 * dt, state.events);
      } else if (p.car) {
        p.car.speed *= 0.92;
        damagePlayer(p, 4 * dt, state.events);
      }
      if (rng() < dt * 2) {
        state.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.3, color: '#ffd23d', size: 5, kind: 'spark' });
      }
    }
  }

  // Foot cops run the player down. Close in on foot, they beat the
  // player down; at three stars with low health that is an arrest, and
  // a player sitting still in a car is arrested on the spot.
  for (const cop of state.police.cops) {
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const dist = Math.hypot(dx, dy) || 1;
    cop.angle = Math.atan2(dy, dx);
    cop.x += (dx / dist) * cop.speed * dt;
    cop.y += (dy / dist) * cop.speed * dt;
    if (dist < 26) {
      if (p.onFoot) {
        damagePlayer(p, 30 * dt, state.events);
        if (wanted >= 3 && p.health <= 40) state.events.push({ type: 'arrested' });
      } else if (p.car && Math.abs(p.car.speed) < 30) {
        state.events.push({ type: 'arrested' });
      }
    }
  }

  // Dead cops leave; police cars that are no longer tracked leave too.
  // Roadblock cars are tracked on their block, not in police.cars.
  state.police.cops = state.police.cops.filter((c) => c.health > 0);
  const blockCars = state.police.blocks.flatMap((b) => b.cars);
  state.cars = state.cars.filter((c) => !c.police || state.police.cars.includes(c) || blockCars.includes(c));
}
