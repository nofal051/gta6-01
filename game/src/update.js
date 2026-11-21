// One fixed step of the whole game.
//
// stepGame advances the clock, the day/night cycle and the weather,
// the player, traffic, pedestrians, the police (with their helicopter
// and roadblocks), missions, side work, the new activities, bullets
// and particles, then drains the event queue into game-over
// conditions. Both the live loop in main.js and the screenshot staging
// in shots.js step through here, so a staged screenshot is a real game
// state, never a mock-up.
//
// The garage menu freezes driving input while it is open — the car is
// parked in the shop — but the rest of the city keeps moving.
import { STEP, WANTED_DECAY_SECONDS } from './config.js';
import { updatePlayer, addWanted } from './player.js';
import { updateTraffic } from './vehicles.js';
import { updatePedestrians, scarePedestrians } from './pedestrians.js';
import { updatePolice } from './police.js';
import { updateMissions, updateSideWork } from './missions.js';
import { updateBullets } from './combat.js';
import { updateDayNight } from './daynight.js';
import { gripFactor, updateWeather } from './weather.js';
import { updateRadio } from './radio.js';
import { updateActivities } from './activities.js';
import { carInGarage } from './garage.js';
import { updateEconomy, nearDealer } from './economy.js';
import { updateWeapons, nearWeaponShop } from './weapons.js';
import { updateBikes } from './bikes.js';
import { updateFishing } from './fishing.js';
import { updatePhone } from './phone.js';

export function stepGame(state, input, audio, dt) {
  state.time += dt;
  // The in-game clock runs twice as fast as real time.
  state.clock += dt * 2;
  const p = state.player;

  updateDayNight(state.daynight, state.clock, dt);
  updateWeather(state.weather, state.rng, dt);
  if (state.weather.thunder) audio.thunder();

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

  // The garage menu parks the car: no driving input gets through.
  // Esc closes the shop (main.js sets dismissed); the menu only opens
  // again once the car has been driven out and back in.
  const parkedInShop = p.car && carInGarage(state.garage, p.car) && Math.abs(p.car.speed) < 12;
  if (!parkedInShop) {
    state.garage.menuOpen = false;
    state.garage.dismissed = false;
  } else if (!state.garage.dismissed) {
    state.garage.menuOpen = true;
  }
  // The dealership and the ammunition store are the same idea on
  // foot: stand by the door and the menu is open until Esc closes it.
  // Walk away and the menu closes on its own. The phone freezes the
  // player's hands the same way, but the city keeps moving — a call
  // in the middle of a chase is a bad idea.
  if (state.economy.dealer.menuOpen && !nearDealer(state.economy, state.player)) {
    state.economy.dealer.menuOpen = false;
  }
  if (state.weapons.shop.menuOpen && !nearWeaponShop(state.weapons, state.player)) {
    state.weapons.shop.menuOpen = false;
  }
  const handsBusy = state.phone.open || state.economy.dealer.menuOpen || state.weapons.shop.menuOpen;
  const driveInput = state.garage.menuOpen || handsBusy
    ? { axes: () => ({ forward: 0, strafe: 0 }), isDown: () => false, mouse: input ? input.mouse : null }
    : input;

  const grip = gripFactor(state.weather);
  updatePlayer(p, driveInput, state.world, state.cars, dt, state.events, audio, { grip });
  updateTraffic(state.cars, state.world, dt, state.rng);
  updatePedestrians(state.peds, dt, state.world, state.rng);
  updatePolice(state, dt, state.rng, audio);
  updateMissions(state, dt, state.rng, audio);
  updateSideWork(state, dt, state.rng, audio);
  updateActivities(state, dt, state.rng, audio);
  updateEconomy(state, dt, audio);
  updateWeapons(state, dt, audio);
  updateBikes(state, input, dt);
  updateFishing(state, dt, audio);
  updatePhone(state, dt, input);
  updateBullets(state, state.world, dt);
  updateRadio(state.radio, audio, dt, !p.onFoot && !!p.car, state.muted);

  // The muzzle flash lives for a blink and then it is gone.
  if (state.muzzle && state.muzzle.life > 0) state.muzzle.life -= dt;
  if (state.saveNoticeTimer > 0) state.saveNoticeTimer -= dt;
  if (state.garage.messageTimer > 0) state.garage.messageTimer -= dt;
  if (state.economy.dealer.messageTimer > 0) state.economy.dealer.messageTimer -= dt;
  if (state.weapons.shop.messageTimer > 0) state.weapons.shop.messageTimer -= dt;

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

  // Particles drift and fade; smoke rises, flame flickers upward.
  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.kind === 'smoke') pt.y -= 24 * dt;
    if (pt.kind === 'flame') pt.y -= 12 * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);

  // Skid marks fade where the cars left them.
  for (const car of state.cars) {
    if (!car.skidTrail) continue;
    for (const skid of car.skidTrail) skid.life -= dt * 0.5;
    car.skidTrail = car.skidTrail.filter((s) => s.life > 0);
  }

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
