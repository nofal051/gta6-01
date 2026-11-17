// The wanted system and the police. Stars 0–5: the higher the level, the
// more police cars and foot cops spawn and the harder they chase. Police
// cars ram the player's car; foot cops chase on foot and arrest (game over
// at 3+ stars if they catch you standing still) or punch you down. Lay low
// — no crime, out of sight — and the heat decays.
import { WANTED_DECAY_SECONDS } from './config.js';
import { makeCar } from './vehicles.js';
import { nearestRoadPoint } from './world.js';

export function createPolice() { return { cars: [], cops: [], sirenTimer: 0 }; }

function spawnPoliceCar(state, rng) {
  const p = state.player;
  const spot = nearestRoadPoint(state.world, p.x + (rng() < 0.5 ? -520 : 520), p.y + (rng() < 0.5 ? -380 : 380));
  const car = makeCar(900 + state.police.cars.length + Math.floor(rng() * 50), spot.x, spot.y, 0, { rng, police: true });
  car.color = '#1d4fd9'; car.speed = 0; car.driver = 'police';
  state.police.cars.push(car);
  state.cars.push(car);
}

function spawnCop(state, rng) {
  const p = state.player;
  state.police.cops.push({
    x: p.x + (rng() < 0.5 ? -260 : 260), y: p.y + (rng() < 0.5 ? -200 : 200),
    angle: 0, speed: 165, health: 100, state: 'chase',
  });
}

export function updatePolice(state, dt, rng, audio) {
  const p = state.player;
  const wanted = p.wanted;
  // Decay when laying low.
  if (wanted > 0) {
    p.wantedTimer += dt;
    if (p.wantedTimer > WANTED_DECAY_SECONDS) {
      p.wanted -= 1; p.wantedTimer = 0;
      state.events.push({ type: 'wanted', stars: p.wanted });
    }
  }
  const wantCars = wanted === 0 ? 0 : wanted <= 2 ? 1 : wanted <= 3 ? 2 : 3;
  const wantCops = wanted === 0 ? 0 : wanted <= 2 ? 1 : wanted <= 4 ? 2 : 3;
  while (state.police.cars.length < wantCars) spawnPoliceCar(state, rng);
  while (state.police.cops.length < wantCops) spawnCop(state, rng);
  if (wanted === 0) {
    // Heat off: police drive away and despawn.
    state.police.cars.length = 0;
    state.police.cops.length = 0;
    state.cars = state.cars.filter((c) => !c.police);
  }
  state.police.sirenTimer -= dt;
  if (wanted > 0 && state.police.sirenTimer <= 0) { audio.siren(); state.police.sirenTimer = 2.4; }

  // Police cars chase and ram.
  for (const car of state.police.cars) {
    const dx = p.x - car.x; const dy = p.y - car.y;
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
      if (p.onFoot) { p.health -= 26 * dt; }
      else if (p.car) { p.car.speed *= 0.92; p.health -= 4 * dt; }
      if (Math.random() < dt * 2) state.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.3, color: '#ffd23d', size: 5 });
    }
  }
  // Foot cops chase; catching a wanted player on foot hurts / arrests.
  for (const cop of state.police.cops) {
    const dx = p.x - cop.x; const dy = p.y - cop.y;
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
  state.police.cops = state.police.cops.filter((c) => c.health > 0);
  // Remove dead cops' cars cleanly when cops die handled above; police cars persist while wanted.
  state.cars = state.cars.filter((c) => !c.police || state.police.cars.includes(c));
}
