// The player, on foot and behind the wheel. On foot: WASD moves, the
// facing follows movement (or the mouse when shooting). In a car: W/S are
// throttle and brake/reverse, A/D steer, and speed sets how sharp the turn
// is. E steps in and out of the nearest car; stealing a car the driver is
// in (traffic) is a crime.
import { CAR_ACCEL, CAR_BRAKE, CAR_MAX_SPEED, CAR_REVERSE_MAX, PLAYER_SPEED } from './config.js';
import { clampWorld, collideBuildings } from './world.js';
import { nearestCar } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0, health: 100, cash: 0, ammo: 24,
    onFoot: true, car: null, moving: false, wanted: 0, wantedTimer: 0,
  };
}

export function addWanted(player, stars, events) {
  const before = player.wanted;
  player.wanted = Math.min(5, player.wanted + stars);
  player.wantedTimer = 0;
  if (player.wanted > before && events) events.push({ type: 'wanted', stars: player.wanted });
  return player.wanted;
}

export function updatePlayer(player, input, world, cars, dt, events, audio) {
  const axes = input.axes();
  player.moving = false;
  if (player.onFoot) {
    const dx = axes.strafe; const dy = -axes.forward;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      player.x += (dx / len) * PLAYER_SPEED * dt;
      player.y += (dy / len) * PLAYER_SPEED * dt;
      player.angle = Math.atan2(dy, dx);
      player.moving = true;
    }
    collideBuildings(world, player, 14);
    clampWorld(player, 16);
    // Bumping a pedestrian on foot hurts them — a crime if it is hard.
    return;
  }
  // Driving.
  const car = player.car;
  if (!car) { player.onFoot = true; return; }
  const forward = axes.forward;
  if (forward > 0) car.speed += CAR_ACCEL * dt;
  else if (forward < 0) car.speed -= (car.speed > 5 ? CAR_BRAKE : CAR_ACCEL * 0.6) * dt;
  else car.speed -= Math.sign(car.speed) * 160 * dt;
  if (Math.abs(car.speed) < 4 && forward === 0) car.speed = 0;
  car.speed = Math.max(-CAR_REVERSE_MAX, Math.min(CAR_MAX_SPEED, car.speed));
  const steer = axes.strafe * (car.speed >= 0 ? 1 : -1);
  car.angle += steer * 2.1 * dt * Math.min(1, Math.abs(car.speed) / 140);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = nx; car.y = ny;
  player.x = car.x; player.y = car.y; player.angle = car.angle;
  player.moving = Math.abs(car.speed) > 20;
  if (collideBuildings(world, car, 22)) {
    if (Math.abs(car.speed) > 260) { audio.crash(); events.push({ type: 'crash' }); }
    car.speed *= 0.45;
  }
  clampWorld(car, 24);
  player.x = car.x; player.y = car.y;
  if (Math.abs(car.speed) > 40) audio.engine(Math.abs(car.speed) / CAR_MAX_SPEED);
}

export function tryEnterCar(player, cars, events) {
  if (!player.onFoot) {
    // Step out beside the car.
    const car = player.car;
    if (car) {
      car.driver = 'none'; car.parked = true; car.speed = 0;
      player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
      player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
      player.car = null; player.onFoot = true;
    }
    return;
  }
  const car = nearestCar(cars, player.x, player.y, 64);
  if (!car) return;
  if (car.traffic && car.driver === 'traffic') {
    addWanted(player, 1, events);
    events.push({ type: 'steal', car });
  }
  car.driver = 'player'; car.parked = false; car.traffic = false;
  player.car = car; player.onFoot = false;
  player.x = car.x; player.y = car.y;
}
