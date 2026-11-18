// Combat — a pistol and a punch.
//
// The pistol aims with the mouse and fires on click, on foot only.
// Bullets travel straight, spark when they hit a building, scatter
// pedestrians and hurt foot cops, and firing where people can see it
// raises the wanted level. The punch (F) is quieter and only reaches
// as far as an arm, but it still counts as a crime if it lands.
import { BULLET_SPEED } from './config.js';
import { addWanted } from './player.js';
import { scarePedestrians } from './pedestrians.js';

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
  audio.shot();
  scarePedestrians(state.peds, p.x, p.y, 320);
  addWanted(p, 1, state.events);
  return true;
}

// Send a nearby pedestrian running, or hurt a foot cop in reach.
function scareOne(ped, fromX, fromY) {
  ped.state = 'flee';
  const d = Math.hypot(ped.x - fromX, ped.y - fromY) || 1;
  ped.fleeX = (ped.x - fromX) / d;
  ped.fleeY = (ped.y - fromY) / d;
  ped.pause = 2.5;
}

export function meleeAttack(state, audio) {
  const p = state.player;
  if (!p.onFoot) return;
  audio.punch();
  const reach = 46;
  for (const ped of state.peds) {
    if (Math.hypot(ped.x - p.x, ped.y - p.y) >= reach) continue;
    scareOne(ped, p.x, p.y);
    state.particles.push({ x: ped.x, y: ped.y, vx: 0, vy: -30, life: 0.4, color: '#ffd23d', size: 5 });
    addWanted(p, 1, state.events);
  }
  for (const cop of state.police.cops) {
    if (Math.hypot(cop.x - p.x, cop.y - p.y) >= reach) continue;
    cop.health -= 34;
    addWanted(p, 1, state.events);
  }
}

export function updateBullets(state, world, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // A bullet that hits a pedestrian scares them off and is spent.
    for (const ped of state.peds) {
      if (Math.hypot(ped.x - b.x, ped.y - b.y) >= 14) continue;
      scareOne(ped, b.x, b.y);
      b.life = 0;
      state.particles.push({ x: ped.x, y: ped.y, vx: 0, vy: -40, life: 0.5, color: '#ff5a4d', size: 6 });
      addWanted(state.player, 1, state.events);
    }
    // A bullet that hits a foot cop wounds them and is spent.
    for (const cop of state.police.cops) {
      if (Math.hypot(cop.x - b.x, cop.y - b.y) >= 14) continue;
      cop.health -= 34;
      b.life = 0;
      addWanted(state.player, 1, state.events);
    }
    // A bullet that hits a building sparks and is spent.
    for (const bd of world.buildings) {
      if (b.x <= bd.x || b.x >= bd.x + bd.w || b.y <= bd.y || b.y >= bd.y + bd.h) continue;
      b.life = 0;
      state.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, color: '#ffd23d', size: 4 });
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}
