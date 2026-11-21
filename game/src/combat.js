// Combat — a pistol, a punch, and cars that can burn.
//
// The pistol aims with the mouse and fires on click, on foot only.
// Each shot leaves a muzzle flash, a tracer line the renderer draws
// for a blink, and a bang that scatters pedestrians and raises the
// wanted level. Bullets travel straight, spark when they hit a
// building, scare pedestrians, wound foot cops — and damage cars.
// A car shot enough times catches fire and explodes: a burst of flame
// and smoke particles, a wreck left on the road, and every pedestrian
// nearby running for cover.
//
// The punch (F) is quieter and only reaches as far as an arm, but it
// still counts as a crime if it lands.
import { BULLET_DAMAGE, BULLET_SPEED, PUNCH_DAMAGE } from './config.js';
import { addWanted } from './player.js';
import { scareOne, scarePedestrians } from './pedestrians.js';

export function createBullets() {
  return [];
}

export function firePistol(state, audio) {
  const p = state.player;
  if (p.ammo <= 0 || !p.onFoot) return false;
  p.ammo -= 1;
  const aim = state.aimAngle;
  state.bullets.push({
    x: p.x + Math.cos(aim) * 20,
    y: p.y + Math.sin(aim) * 20,
    vx: Math.cos(aim) * BULLET_SPEED,
    vy: Math.sin(aim) * BULLET_SPEED,
    life: 0.9,
  });
  // The muzzle flash lives on the state so the renderer can draw it.
  state.muzzle = { x: p.x + Math.cos(aim) * 24, y: p.y + Math.sin(aim) * 24, angle: aim, life: 0.09 };
  audio.shot();
  scarePedestrians(state.peds, p.x, p.y, 320);
  addWanted(p, 1, state.events);
  return true;
}

export function meleeAttack(state, audio) {
  const p = state.player;
  if (!p.onFoot) return;
  audio.punch();
  const reach = 46;
  for (const ped of state.peds) {
    if (Math.hypot(ped.x - p.x, ped.y - p.y) >= reach) continue;
    scareOne(ped, p.x, p.y);
    state.particles.push({ x: ped.x, y: ped.y, vx: 0, vy: -30, life: 0.4, color: '#ffd23d', size: 5, kind: 'spark' });
    addWanted(p, 1, state.events);
  }
  for (const cop of state.police.cops) {
    if (Math.hypot(cop.x - p.x, cop.y - p.y) >= reach) continue;
    cop.health -= PUNCH_DAMAGE;
    addWanted(p, 1, state.events);
  }
}

// A car that has taken enough damage: flame, smoke, a bang, a wreck.
export function explodeCar(state, car, audio) {
  if (car.wrecked) return;
  car.wrecked = true;
  car.traffic = false;
  car.speed = 0;
  const rng = state.rng;
  for (let i = 0; i < 26; i += 1) {
    const angle = rng() * Math.PI * 2;
    const speed = 60 + rng() * 220;
    state.particles.push({
      x: car.x,
      y: car.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + rng() * 0.7,
      color: i % 3 === 0 ? '#ff5a2e' : i % 3 === 1 ? '#ffd23d' : '#555',
      size: 5 + rng() * 8,
      kind: i % 3 === 2 ? 'smoke' : 'flame',
    });
  }
  state.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.35, color: '#fff', size: 26, kind: 'ring' });
  if (audio && audio.explosion) audio.explosion();
  state.events.push({ type: 'explosion', car });
  scarePedestrians(state.peds, car.x, car.y, 420);
}

// Damage one car; an explosion follows when its health runs out. The
// player's own car cannot be shot out from under them this way.
export function damageCar(state, car, amount, audio) {
  if (!car || car.wrecked || car.driver === 'player') return;
  car.hp -= amount;
  state.particles.push({ x: car.x, y: car.y, vx: 0, vy: -20, life: 0.3, color: '#ffd23d', size: 4, kind: 'spark' });
  if (car.hp <= 0) explodeCar(state, car, audio);
}

export function updateBullets(state, world, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    // A bullet that hits a pedestrian scares them off and is spent.
    for (const ped of state.peds) {
      if (Math.hypot(ped.x - b.x, ped.y - b.y) >= 14) continue;
      scareOne(ped, b.x, b.y);
      b.life = 0;
      state.particles.push({ x: ped.x, y: ped.y, vx: 0, vy: -40, life: 0.5, color: '#ff5a4d', size: 6, kind: 'spark' });
      addWanted(state.player, 1, state.events);
      break;
    }
    if (b.life <= 0) continue;
    // A bullet that hits a foot cop wounds them and is spent. The
    // damage rides on the bullet, so a rifle round hurts more than a
    // pistol round; old bullets without one default to pistol damage.
    for (const cop of state.police.cops) {
      if (Math.hypot(cop.x - b.x, cop.y - b.y) >= 14) continue;
      cop.health -= b.damage || BULLET_DAMAGE;
      b.life = 0;
      state.particles.push({ x: cop.x, y: cop.y, vx: 0, vy: -30, life: 0.4, color: '#ff5a4d', size: 5, kind: 'spark' });
      addWanted(state.player, 1, state.events);
      break;
    }
    if (b.life <= 0) continue;
    // A bullet that hits a car damages it and is spent.
    for (const car of state.cars) {
      if (car.wrecked) continue;
      const dx = Math.abs(b.x - car.x);
      const dy = Math.abs(b.y - car.y);
      if (dx >= 24 || dy >= 14) continue;
      damageCar(state, car, b.damage || BULLET_DAMAGE, null);
      b.life = 0;
      break;
    }
    if (b.life <= 0) continue;
    // A bullet that hits a building sparks and is spent.
    for (const bd of world.buildings) {
      if (b.x <= bd.x || b.x >= bd.x + bd.w || b.y <= bd.y || b.y >= bd.y + bd.h) continue;
      b.life = 0;
      state.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, color: '#ffd23d', size: 4, kind: 'spark' });
      break;
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}
