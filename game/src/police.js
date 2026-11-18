// The wanted system and the police who answer it.
//
// Stars run 0–5. More stars mean more police cars and more foot cops,
// and the cars chase harder. A police car rams the player's car; a foot
// cop runs the player down on foot, and at three stars or more, catching
// a weakened player on foot — or a player sitting still in a car — is an
// arrest. Keep clean and out of sight and the heat fades, one star at a
// time, until the police give up and drive away.
import { WANTED_DECAY_SECONDS } from './config.js';
import { makeCar } from './vehicles.js';
import { nearestRoadPoint } from './world.js';

export function createPolice() {
  return { cars: [], cops: [], sirenTimer: 0 };
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
  const spot = nearestRoadPoint(
    state.world,
    p.x + (rng() < 0.5 ? -520 : 520),
    p.y + (rng() < 0.5 ? -380 : 380),
  );
  const car = makeCar(
    900 + state.police.cars.length + Math.floor(rng() * 50),
    spot.x,
    spot.y,
    0,
    { rng, police: true },
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

  // Heat off entirely: the police leave and their cars despawn.
  if (wanted === 0) {
    state.police.cars.length = 0;
    state.police.cops.length = 0;
    state.cars = state.cars.filter((c) => !c.police);
  }

  // A siren wail every couple of seconds while wanted.
  state.police.sirenTimer -= dt;
  if (wanted > 0 && state.police.sirenTimer <= 0) {
    audio.siren();
    state.police.sirenTimer = 2.4;
  }

  // Police cars steer toward the player and ram.
  for (const car of state.police.cars) {
    const dx = p.x - car.x;
    const dy = p.y - car.y;
    const dist = Math.hypot(dx, dy) || 1;
    const target = Math.atan2(dy, dx);
    let diff = target - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    car.speed = Math.min(430 + wanted * 22, Math.max(300, dist * 0.9));
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (dist < 52) {
      if (p.onFoot) {
        p.health -= 26 * dt;
      } else if (p.car) {
        p.car.speed *= 0.92;
        p.health -= 4 * dt;
      }
      if (Math.random() < dt * 2) {
        state.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.3, color: '#ffd23d', size: 5 });
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
        p.health -= 30 * dt;
        if (wanted >= 3 && p.health <= 40) state.events.push({ type: 'arrested' });
      } else if (p.car && Math.abs(p.car.speed) < 30) {
        state.events.push({ type: 'arrested' });
      }
    }
  }

  // Dead cops leave; police cars that are no longer tracked leave too.
  state.police.cops = state.police.cops.filter((c) => c.health > 0);
  state.cars = state.cars.filter((c) => !c.police || state.police.cars.includes(c));
}
