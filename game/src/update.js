// One fixed step of the whole game.
//
// stepGame advances the clock, the player, traffic, pedestrians, the
// police, missions, side work, bullets and particles, then drains the
// event queue into game-over conditions. Both the live loop in main.js
// and the screenshot staging in shots.js step through here, so a staged
// screenshot is a real game state, never a mock-up.
import { STEP, WANTED_DECAY_SECONDS } from './config.js';
import { updatePlayer, addWanted } from './player.js';
import { updateTraffic } from './vehicles.js';
import { updatePedestrians, scarePedestrians } from './pedestrians.js';
import { updatePolice } from './police.js';
import { updateMissions, updateSideWork } from './missions.js';
import { updateBullets } from './combat.js';

export function stepGame(state, input, audio, dt) {
  state.time += dt;
  // The in-game clock runs twice as fast as real time.
  state.clock += dt * 2;
  const p = state.player;

  // Aim follows the mouse: screen position to world position through
  // the camera. On foot, the player faces where they aim.
  if (input && input.mouse) {
    const camX = Math.max(640, Math.min(2600 - 640, p.x));
    const camY = Math.max(360, Math.min(1900 - 360, p.y));
    const worldX = input.mouse.x + camX - 640;
    const worldY = input.mouse.y + camY - 360;
    state.aimAngle = Math.atan2(worldY - p.y, worldX - p.x);
    if (p.onFoot) p.angle = state.aimAngle;
  }

  updatePlayer(p, input, state.world, state.cars, dt, state.events, audio);
  updateTraffic(state.cars, state.world, dt, state.rng);
  updatePedestrians(state.peds, dt, state.world);
  updatePolice(state, dt, state.rng, audio);
  updateMissions(state, dt, state.rng, audio);
  updateSideWork(state, dt, state.rng, audio);
  updateBullets(state, state.world, dt);

  // Running a pedestrian over at speed is a crime — once per person
  // per hit, guarded by a short cooldown on each pedestrian.
  if (!p.onFoot && p.car && Math.abs(p.car.speed) > 90) {
    for (const ped of state.peds) {
      if (ped.hitCooldown > 0) continue;
      if (Math.hypot(ped.x - p.x, ped.y - p.y) >= 30) continue;
      ped.hitCooldown = 3;
      ped.state = 'flee';
      const d = Math.hypot(ped.x - p.x, ped.y - p.y) || 1;
      ped.fleeX = (ped.x - p.x) / d;
      ped.fleeY = (ped.y - p.y) / d;
      ped.pause = 2.5;
      addWanted(p, 1, state.events);
      audio.crash();
      scarePedestrians(state.peds, p.x, p.y, 260);
    }
  }
  for (const ped of state.peds) {
    if (ped.hitCooldown > 0) ped.hitCooldown -= dt;
  }

  // Speeding past a police car is a crime too, at most one star per
  // eight seconds of speeding.
  if (!p.onFoot && p.car && Math.abs(p.car.speed) > 430) {
    for (const car of state.police.cars) {
      if (Math.hypot(car.x - p.x, car.y - p.y) >= 260) continue;
      if (p.speedTicketCooldown > 0) continue;
      p.speedTicketCooldown = 8;
      addWanted(p, 1, state.events);
    }
  }
  if (p.speedTicketCooldown > 0) p.speedTicketCooldown -= dt;

  // Slow health recovery while the heat is off.
  if (p.wanted === 0 && p.health < 100) {
    p.health = Math.min(100, p.health + 2 * dt);
  }

  // Particles drift and fade.
  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);

  // Drain the event queue: an arrest ends the run here.
  for (const ev of state.events) {
    if (ev.type === 'arrested') state.overReason = 'arrested';
  }
  state.events.length = 0;
  if (p.health <= 0) state.overReason = state.overReason || 'wasted';
  return state.overReason;
}

// Re-exported so other modules can share the step size and the decay
// time without importing config themselves.
export { STEP, WANTED_DECAY_SECONDS };
