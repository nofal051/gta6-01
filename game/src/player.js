// The player — walking the streets and driving the cars.
//
// On foot, WASD (or the arrow keys) walks in screen-relative directions
// and the facing follows the walk. Behind the wheel, W is the throttle,
// S brakes and then reverses, and A/D steer — the faster the car, the
// harder it turns. E gets in and out of the nearest car; taking a car
// that still has its driver is a crime, and the wanted system hears
// about it.
import { CAR_ACCEL, CAR_BRAKE, CAR_MAX_SPEED, CAR_REVERSE_MAX, PLAYER_SPEED } from './config.js';
import { clampWorld, collideBuildings } from './world.js';
import { nearestCar } from './vehicles.js';

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
    wanted: 0,
    wantedTimer: 0,
    speedTicketCooldown: 0,
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

export function updatePlayer(player, input, world, cars, dt, events, audio) {
  const axes = input.axes();
  player.moving = false;

  if (player.onFoot) {
    // Screen-relative walking: forward is up, strafe is sideways.
    const dx = axes.strafe;
    const dy = -axes.forward;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      player.x += (dx / len) * PLAYER_SPEED * dt;
      player.y += (dy / len) * PLAYER_SPEED * dt;
      player.angle = Math.atan2(dy, dx);
      player.moving = true;
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
  const forward = axes.forward;
  if (forward > 0) {
    car.speed += CAR_ACCEL * dt;
  } else if (forward < 0) {
    const braking = car.speed > 5 ? CAR_BRAKE : CAR_ACCEL * 0.6;
    car.speed -= braking * dt;
  } else {
    // Coasting: drag pulls the car toward a stop.
    car.speed -= Math.sign(car.speed) * 160 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  car.speed = Math.max(-CAR_REVERSE_MAX, Math.min(CAR_MAX_SPEED, car.speed));

  // Steering flips when reversing, and needs some speed to bite.
  const steer = axes.strafe * (car.speed >= 0 ? 1 : -1);
  car.angle += steer * 2.1 * dt * Math.min(1, Math.abs(car.speed) / 140);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.moving = Math.abs(car.speed) > 20;

  // Hitting a building at speed is a crash: noise, an event, and a
  // big loss of speed.
  if (collideBuildings(world, car, 22)) {
    if (Math.abs(car.speed) > 260) {
      audio.crash();
      events.push({ type: 'crash' });
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
  player.car = car;
  player.onFoot = false;
  player.x = car.x;
  player.y = car.y;
}
