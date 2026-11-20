// The player — walking the streets and driving the cars.
//
// On foot, WASD (or the arrow keys) walks in screen-relative directions
// and the facing follows the walk; hold Shift to sprint, which drains
// stamina and refills when you stop. Behind the wheel, W is the throttle,
// S brakes and then reverses, and A/D steer — the faster the car, the
// harder it turns. How the car answers depends on its kind (a sports
// car is sharper than a van), on the garage upgrades bolted onto it,
// and on the weather: rain cuts grip, so the car slides and brakes
// later, and hard cornering leaves skid marks on the road.
//
// E gets in and out of the nearest car; taking a car that still has
// its driver is a crime, and the wanted system hears about it. Armor
// from the garage soaks up some of the damage from crashes and cops.
import {
  CAR_ACCEL,
  CAR_BRAKE,
  CAR_MAX_SPEED,
  CAR_REVERSE_MAX,
  PLAYER_SPEED,
  PLAYER_SPRINT_MUL,
  PLAYER_STAMINA_MAX,
} from './config.js';
import { clampWorld, collideBuildings } from './world.js';
import { HANDLING, nearestCar, topSpeedFor } from './vehicles.js';
import { upgradeStats } from './garage.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    angle: -Math.PI / 2,
    speed: 0,
    health: 100,
    cash: 0,
    ammo: 24,
    onFoot: true,
    car: null,
    moving: false,
    sprinting: false,
    stamina: PLAYER_STAMINA_MAX,
    wanted: 0,
    wantedTimer: 0,
    speedTicketCooldown: 0,
    // Garage upgrades, kept on the player so a stolen car never loses them.
    upgrades: { engine: 0, armor: 0, paint: null },
  };
}

// Add `stars` to the wanted level, capped at five, and restart the
// decay clock. A 'wanted' event is queued only when the level rises.
export function addWanted(player, stars, events) {
  const before = player.wanted;
  player.wanted = Math.min(5, player.wanted + stars);
  player.wantedTimer = 0;
  if (events && player.wanted > before) {
    events.push({ type: 'wanted', stars: player.wanted });
  }
  return player.wanted;
}

// Hurt the player, with garage armor soaking up part of the damage.
export function damagePlayer(player, amount, events) {
  const stats = upgradeStats(player.upgrades);
  player.health -= amount * stats.damageTaken;
  if (events && player.health <= 0) events.push({ type: 'wasted' });
  return player.health;
}

function leaveSkid(car, x, y) {
  car.skidTrail.push({ x, y, life: 0.7 });
  if (car.skidTrail.length > 40) car.skidTrail.shift();
}

export function updatePlayer(player, input, world, cars, dt, events, audio, env) {
  const axes = input.axes();
  const grip = (env && env.grip) || 1;
  const stats = upgradeStats(player.upgrades);
  player.moving = false;
  player.sprinting = false;

  if (player.onFoot) {
    const sprinting = (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) && player.stamina > 1;
    const pace = PLAYER_SPEED * (sprinting ? PLAYER_SPRINT_MUL : 1);
    const dx = axes.strafe;
    const dy = -axes.forward;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      player.x += (dx / len) * pace * dt;
      player.y += (dy / len) * pace * dt;
      player.angle = Math.atan2(dy, dx);
      player.moving = true;
      player.sprinting = sprinting;
      if (sprinting) player.stamina = Math.max(0, player.stamina - 26 * dt);
    }
    if (!sprinting && player.stamina < PLAYER_STAMINA_MAX) {
      player.stamina = Math.min(PLAYER_STAMINA_MAX, player.stamina + 16 * dt);
    }
    collideBuildings(world, player, 14);
    clampWorld(player, 16);
    return;
  }

  // Driving the car the player is sitting in.
  const car = player.car;
  if (!car) {
    player.onFoot = true;
    return;
  }
  const kind = HANDLING[car.kind || 'sedan'];
  const topSpeed = topSpeedFor(car) * stats.topMul;
  const accel = CAR_ACCEL * kind.accelMul * stats.accelMul;
  const forward = axes.forward;
  if (forward > 0) {
    car.speed += accel * dt;
  } else if (forward < 0) {
    const braking = car.speed > 5 ? CAR_BRAKE * stats.brakeMul : accel * 0.6;
    car.speed -= braking * dt * grip;
  } else {
    // Coasting: drag pulls the car toward a stop; wet roads coast longer.
    car.speed -= Math.sign(car.speed) * 160 * grip * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  car.speed = Math.max(-CAR_REVERSE_MAX, Math.min(topSpeed, car.speed));

  // Steering flips when reversing, needs some speed to bite, and loses
  // grip in the wet — the car turns wider and slides instead.
  const steer = axes.strafe * (car.speed >= 0 ? 1 : -1);
  const turnRate = 2.1 * grip;
  car.angle += steer * turnRate * dt * Math.min(1, Math.abs(car.speed) / 140);
  const slide = (1 - grip) * Math.abs(steer) * Math.abs(car.speed);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (slide > 0) {
    car.x += Math.cos(car.angle + Math.PI / 2) * slide * 0.25 * dt;
    car.y += Math.sin(car.angle + Math.PI / 2) * slide * 0.25 * dt;
  }
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.moving = Math.abs(car.speed) > 20;

  // Hard cornering at speed leaves skid marks on the asphalt.
  if (Math.abs(steer) > 0 && Math.abs(car.speed) > 260) {
    leaveSkid(car, car.x - Math.cos(car.angle) * 18, car.y - Math.sin(car.angle) * 18);
  }

  // Hitting a building at speed is a crash: noise, an event, and a
  // big loss of speed.
  if (collideBuildings(world, car, 22)) {
    if (Math.abs(car.speed) > 260) {
      audio.crash();
      events.push({ type: 'crash' });
      damagePlayer(player, 6, events);
    }
    car.speed *= 0.45;
  }
  clampWorld(car, 24);
  player.x = car.x;
  player.y = car.y;
  if (Math.abs(car.speed) > 40) audio.engine(Math.abs(car.speed) / CAR_MAX_SPEED);
}

// E: climb into the nearest car, or climb out of the one being driven.
// Getting out parks the car and leaves the player standing beside it.
// The garage paint follows the player onto any car they steal.
export function tryEnterCar(player, cars, events) {
  if (!player.onFoot) {
    const car = player.car;
    if (car) {
      car.driver = 'none';
      car.parked = true;
      car.speed = 0;
      player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
      player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
      player.car = null;
      player.onFoot = true;
    }
    return;
  }
  const car = nearestCar(cars, player.x, player.y, 64);
  if (!car) return;
  if (car.traffic && car.driver === 'traffic') {
    addWanted(player, 1, events);
    events.push({ type: 'steal', car });
  }
  car.driver = 'player';
  car.parked = false;
  car.traffic = false;
  if (player.upgrades.paint) car.color = player.upgrades.paint;
  player.car = car;
  player.onFoot = false;
  player.x = car.x;
  player.y = car.y;
}
